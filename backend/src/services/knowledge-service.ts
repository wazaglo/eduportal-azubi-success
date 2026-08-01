import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { CacheService } from './cache-service';
import { logger } from '../utils/logger';
import { SHS_SUBJECTS } from '../utils/knowledge-constants';

interface AnswerResult {
  answer: string;
  source: 'cache' | 'knowledge_base' | 'model';
  documentTitle?: string;
  note?: string;
  cached: boolean;
}

// Retrieval tuning constants.
const TITLE_TERM_BONUS = 8;
const PROXIMITY_BONUS = 10;
const PROXIMITY_BONUS_MAX = 40;
const MIN_CONFIDENT_SCORE = 15;
const MIN_WEAK_SCORE = 3;
const WEAK_MATCH_NOTE =
  '[Note: the knowledge base has no detailed material on this exact topic. ' +
  'The closest curriculum content is shown above; ask your teacher or check your textbook for a fuller answer.]';

export class KnowledgeService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' });
    this.bucket = process.env.KNOWLEDGE_BUCKET ?? '';
    this.cacheService = cacheService;
  }

  async getAnswer(question: string, level: string, queryType: string): Promise<AnswerResult> {
    // Step 1: Check DynamoDB cache for a previously cached answer
    const cached = await this.cacheService.findCachedResponse(question, queryType);
    if (cached) {
      logger.info('Cache hit for question', { question: question.substring(0, 50), queryType });
      return {
        answer: cached.response,
        source: 'cache',
        cached: true,
      };
    }

    // Step 2: Search S3 Knowledge Base
    if (this.bucket) {
      const kbResult = await this.searchS3KnowledgeBase(question, level);
      if (kbResult) {
        const answer = kbResult.note ? `${kbResult.answer}\n\n${kbResult.note}` : kbResult.answer;
        await this.cacheService.storeCachedResponse({
          query: question,
          response: answer,
          queryType: queryType as 'academic' | 'administrative' | 'general',
          modelUsed: 'knowledge-base',
          tokensUsed: 0,
          similarityHash: '',
          source: 'knowledge_base',
          metadata: { documentTitle: kbResult.documentTitle, note: kbResult.note },
        });
        logger.info('Knowledge base hit for question', { question: question.substring(0, 50), level });
        return {
          answer,
          source: 'knowledge_base',
          documentTitle: kbResult.documentTitle,
          note: kbResult.note,
          cached: false,
        };
      }
    } else {
      logger.warn('KNOWLEDGE_BUCKET not configured, skipping S3 search');
    }

    // Step 3: Fallback to AI model (stub — another team will implement)
    logger.info('Cache miss and KB miss, returning model stub', { question: question.substring(0, 50) });
    const stubAnswer = '[Model integration pending] This question could not be answered from the knowledge base. AI model support will be added by another team.';
    await this.cacheService.storeCachedResponse({
      query: question,
      response: stubAnswer,
      queryType: queryType as 'academic' | 'administrative' | 'general',
      modelUsed: 'pending',
      tokensUsed: 0,
      similarityHash: '',
      source: 'model',
    });
    return {
      answer: stubAnswer,
      source: 'model',
      cached: false,
    };
  }

  private async searchS3KnowledgeBase(question: string, level: string): Promise<{ answer: string; documentTitle: string; note?: string } | null> {
    try {
      const levelPrefix = level ? `${level}/` : '';
      let prefix = `knowledge/${levelPrefix}`;

      const detectedSubject = this.detectSubject(question);
      if (detectedSubject) {
        prefix = `knowledge/${levelPrefix}${detectedSubject.replace(/\s+/g, '_')}/`;
        logger.info('Narrowed KB search to subject', { subject: detectedSubject, prefix });
      }

      logger.info('Searching S3 knowledge base', { bucket: this.bucket, prefix });

      const listCmd = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const listResult = await this.s3.send(listCmd);
      const documents = listResult.Contents ?? [];

      if (documents.length === 0) {
        logger.info('No documents found in S3 KB', { prefix });
        return null;
      }

      const questionTerms = this.tokenize(question);

      if (questionTerms.length === 0) {
        logger.info('No usable question terms, skipping KB search', { question: question.substring(0, 50) });
        return null;
      }

      // Multi-term questions must match on at least two distinct terms so a
      // document that merely repeats a single word does not win by frequency.
      const distinctTermsRequired = questionTerms.length >= 2 ? 2 : 1;

      let bestMatch: { answer: string; title: string; score: number } | null = null;

      for (const doc of documents) {
        if (!doc.Key) continue;

        // Only searchable text documents are read; binary PDFs are skipped.
        if (!doc.Key.toLowerCase().endsWith('.txt')) continue;

        const title = doc.Key.replace(prefix, '');
        const content = await this.readS3Document(doc.Key);
        if (!content) continue;

        const { score, distinctMatched } = this.calculateRelevance(questionTerms, title, content);
        if (distinctMatched < distinctTermsRequired) continue;
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          const excerpt = this.extractRelevantExcerpt(content, questionTerms, 1000);
          bestMatch = { answer: excerpt, title, score };
        }
      }

      if (bestMatch && bestMatch.score >= MIN_CONFIDENT_SCORE) {
        logger.info('Best KB document match (confident)', { title: bestMatch.title, score: bestMatch.score });
        return { answer: bestMatch.answer, documentTitle: bestMatch.title };
      }

      if (bestMatch && bestMatch.score >= MIN_WEAK_SCORE) {
        logger.info('Best KB document match (weak)', { title: bestMatch.title, score: bestMatch.score });
        return {
          answer: bestMatch.answer,
          documentTitle: bestMatch.title,
          note: WEAK_MATCH_NOTE,
        };
      }

      return null;
    } catch (error: any) {
      logger.error('S3 knowledge base search failed', { error: error.message, bucket: this.bucket });
      return null;
    }
  }

  private detectSubject(question: string): string | null {
    const q = question.toLowerCase();

    // Exact subject-name match (handles multi-word names like "Core Mathematics").
    for (const subject of SHS_SUBJECTS) {
      if (q.includes(subject.toLowerCase())) {
        return subject;
      }
    }

    // Common aliases for subjects students are likely to type.
    const aliases: Record<string, string> = {
      maths: 'Core Mathematics',
      math: 'Core Mathematics',
      mathematics: 'Core Mathematics',
      'core maths': 'Core Mathematics',
      'core math': 'Core Mathematics',
      'integrated science': 'Integrated Science',
      'general science': 'Integrated Science',
      science: 'Integrated Science',
      'social studies': 'Social Studies',
      english: 'English Language',
      'english language': 'English Language',
    };

    const tokens = q.split(/\s+/);
    for (const token of tokens) {
      const alias = aliases[token.replace(/[^a-z]/g, '')];
      if (alias) {
        return alias;
      }
    }

    // Subject-topic keyword hints, only used when no subject name/alias matched.
    // Matched as whole words to avoid false positives.
    const subjectKeywords: Record<string, string[]> = {
      'English Language': ['noun', 'verb', 'grammar', 'essay', 'comprehension', 'vocabulary', 'sentence', 'tense', 'spelling', 'adjective', 'pronoun', 'adverb', 'conjunction', 'preposition', 'reading', 'writing'],
      'Core Mathematics': ['equation', 'algebra', 'geometry', 'trigonom', 'calculus', 'fraction', 'graph', 'probability', 'statistic', 'mean', 'median', 'mode', 'percentage', 'ratio', 'number', 'area', 'volume', 'quadratic', 'logarithm', 'indices'],
      'Integrated Science': ['cell', 'organism', 'photosynthesis', 'respiration', 'enzyme', 'tissue', 'ecosystem', 'atom', 'molecule', 'compound', 'chemical', 'periodic', 'acid', 'base', 'reaction', 'element', 'force', 'energy', 'motion', 'velocity', 'acceleration', 'electricity', 'magnetism', 'wave', 'gravity', 'current', 'voltage', 'light', 'soil', 'microscope', 'disease', 'nutrition'],
      'Social Studies': ['society', 'community', 'citizenship', 'culture', 'values', 'family', 'population', 'environment', 'development', 'governance', 'tolerance', 'human right', 'democracy', 'economy', 'resources'],
    };

    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      if (keywords.some(k => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q))) {
        return subject;
      }
    }

    return null;
  }

  private readonly STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'what', 'how', 'why', 'is', 'are', 'was', 'were', 'to', 'of',
    'a', 'an', 'in', 'on', 'at', 'this', 'that', 'these', 'those', 'your', 'you', 'me', 'my',
    'about', 'using', 'use', 'used', 'which', 'who', 'whom', 'where', 'when', 'do', 'does', 'did',
    'explain', 'describe', 'define', 'give', 'tell', 'what', 'show', 'list', 'state', 'name', 'also',
  ]);

  private tokenize(question: string): string[] {
    return question.toLowerCase().split(/[^a-z0-9]+/)
      .filter(t => t.length > 2 && !this.STOPWORDS.has(t));
  }

  private async readS3Document(key: string): Promise<string | null> {
    try {
      const getCmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      const response = await this.s3.send(getCmd);
      const body = await response.Body?.transformToString();
      return body ?? null;
    } catch (error: any) {
      logger.error('Failed to read S3 document', { error: error.message, key });
      return null;
    }
  }

  private countWordMatches(term: string, text: string): number {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const matches = text.match(re);
    return matches ? matches.length : 0;
  }

  private calculateRelevance(questionTerms: string[], title: string, content: string): { score: number; distinctMatched: number } {
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();

    let contentScore = 0;
    let distinctMatched = 0;
    for (const term of questionTerms) {
      const count = this.countWordMatches(term, lowerContent);
      if (count > 0) distinctMatched++;
      contentScore += Math.min(count, 15);
    }

    let titleScore = 0;
    for (const term of questionTerms) {
      if (this.countWordMatches(term, lowerTitle) > 0) {
        titleScore += TITLE_TERM_BONUS;
      }
    }

    const proximityBonus = this.calculateProximity(questionTerms, lowerContent);

    // Density-aware: normalise raw term frequency by document size so long
    // documents that merely repeat a word do not dominate focused sections.
    const lengthNormalized = contentScore / Math.sqrt(Math.max(lowerContent.length, 1));

    const score = Math.round(lengthNormalized * 100) + titleScore + proximityBonus;
    return { score, distinctMatched };
  }

  private calculateProximity(questionTerms: string[], content: string): number {
    let bonus = 0;
    for (let i = 0; i < questionTerms.length - 1; i++) {
      const a = this.escapeRegExp(questionTerms[i]!);
      const b = this.escapeRegExp(questionTerms[i + 1]!);
      // Terms appearing within ~3 words of each other suggest a related passage.
      const re = new RegExp(`\\b${a}\\s+(?:\\w+\\s+){0,3}${b}\\b`);
      if (re.test(content)) bonus += PROXIMITY_BONUS;
    }
    return Math.min(bonus, PROXIMITY_BONUS_MAX);
  }

  private extractRelevantExcerpt(content: string, questionTerms: string[], maxChars: number): string {
    const lower = content.toLowerCase();

    // Collect every term occurrence and find the densest window of matches.
    const positions: number[] = [];
    for (const term of questionTerms) {
      const re = new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'g');
      let m;
      while ((m = re.exec(lower)) !== null) {
        positions.push(m.index);
        if (positions.length >= 200) break;
      }
    }

    if (positions.length === 0) {
      const head = content.substring(0, maxChars).trim();
      return content.length > maxChars ? head + '...' : head;
    }

    positions.sort((a, b) => a - b);
    let bestStart = positions[0]!;
    let bestCount = 0;
    let left = 0;
    for (let right = 0; right < positions.length; right++) {
      while (positions[right]! - positions[left]! > maxChars) left++;
      const count = right - left + 1;
      if (count > bestCount) {
        bestCount = count;
        bestStart = positions[left]!;
      }
    }

    const start = Math.max(0, bestStart - 120);
    const end = Math.min(content.length, start + maxChars);
    let excerpt = content.substring(start, end).trim();

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }

  private escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
