import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { CacheService } from './cache-service';
import { logger } from '../utils/logger';
import { SHS_SUBJECTS } from '../utils/knowledge-constants';

interface AnswerResult {
  answer: string;
  source: 'cache' | 'knowledge_base' | 'model';
  documentTitle?: string;
  cached: boolean;
}

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
        await this.cacheService.storeCachedResponse({
          query: question,
          response: kbResult.answer,
          queryType: queryType as 'academic' | 'administrative' | 'general',
          modelUsed: 'knowledge-base',
          tokensUsed: 0,
          similarityHash: '',
          source: 'knowledge_base',
          metadata: { documentTitle: kbResult.documentTitle },
        });
        logger.info('Knowledge base hit for question', { question: question.substring(0, 50), level });
        return {
          answer: kbResult.answer,
          source: 'knowledge_base',
          documentTitle: kbResult.documentTitle,
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

  private async searchS3KnowledgeBase(question: string, level: string): Promise<{ answer: string; documentTitle: string } | null> {
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

      let bestMatch: { answer: string; title: string; score: number } | null = null;

      for (const doc of documents) {
        if (!doc.Key) continue;

        // Only searchable text documents are read; binary PDFs are skipped.
        if (!doc.Key.toLowerCase().endsWith('.txt')) continue;

        const title = doc.Key.replace(prefix, '');
        const content = await this.readS3Document(doc.Key);
        if (!content) continue;

        const score = this.calculateRelevance(questionTerms, title, content);
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          const excerpt = this.extractRelevantExcerpt(content, questionTerms, 1000);
          bestMatch = { answer: excerpt, title, score };
        }
      }

      if (bestMatch && bestMatch.score >= 6) {
        logger.info('Best KB document match', { title: bestMatch.title, score: bestMatch.score });
        return { answer: bestMatch.answer, documentTitle: bestMatch.title };
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
      'ict': 'ICT',
      'integrated science': 'Integrated Science',
      'general science': 'Integrated Science',
      'social studies': 'Social Studies',
      'english': 'English Language',
      'chemistry': 'Chemistry',
      'biology': 'Biology',
      'physics': 'Physics',
      'computing': 'Computing',
      'economics': 'Economics',
      'geography': 'Geography',
      'history': 'History',
      'government': 'Government',
      'french': 'French',
      'spanish': 'Spanish',
      'arabic': 'Arabic',
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
      'Biology': ['cell', 'organism', 'photosynthesis', 'respiration', 'anatomy', 'dna', 'gene', 'genetics', 'ecosystem', 'enzyme', 'tissue'],
      'Chemistry': ['atom', 'molecule', 'compound', 'chemical', 'periodic', 'acid', 'base', 'reaction', 'element', 'mole'],
      'Physics': ['force', 'energy', 'motion', 'velocity', 'acceleration', 'electricity', 'magnetism', 'wave', 'gravit', 'quantum', 'friction'],
      'Core Mathematics': ['equation', 'algebra', 'geometry', 'trigonom', 'calculus', 'fraction', 'graph', 'probability', 'statistic'],
      'Computing': ['algorithm', 'program', 'software', 'hardware', 'database', 'binary', 'network', 'logic gate', 'html', 'python', 'computer'],
      'History': ['world war', 'colonial', 'empire', 'dynasty', 'revolution', 'independence', 'pre-colonial', 'civilisation', 'civilization', 'king'],
      'Geography': ['climate', 'population', 'migration', 'settlement', 'landform', 'weather', 'vegetation', 'earthquake', 'river'],
      'Government': ['constitution', 'parliament', 'executive', 'judiciary', 'democracy', 'governance', 'citizen'],
      'Economics': ['supply', 'demand', 'market', 'inflation', 'gdp', 'trade', 'price'],
      'Literature in English': ['poem', 'poetry', 'novel', 'drama', 'prose', 'character', 'setting', 'plot'],
      'Performing Arts': ['dance', 'theatre', 'theater', 'performance', 'stage'],
      'Religious and Moral Education': ['morality', 'ethics', 'worship', 'spiritual', 'virtue', 'moral'],
      'Social Studies': ['society', 'community', 'citizenship', 'culture', 'values'],
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

  private calculateRelevance(questionTerms: string[], title: string, content: string): number {
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();
    let contentScore = 0;
    let titleScore = 0;
    for (const term of questionTerms) {
      contentScore += Math.min(this.countWordMatches(term, lowerContent), 10);
      if (this.countWordMatches(term, lowerTitle) > 0) {
        titleScore += 5;
      }
    }
    return contentScore + titleScore;
  }

  private extractRelevantExcerpt(content: string, questionTerms: string[], maxChars: number): string {
    const lower = content.toLowerCase();
    let bestPos = -1;
    let bestFreq = 0;
    for (const term of questionTerms) {
      const freq = this.countWordMatches(term, lower);
      if (freq > bestFreq) {
        bestFreq = freq;
        bestPos = lower.indexOf(term);
      }
    }

    if (bestPos < 0) return content.substring(0, maxChars);

    const start = Math.max(0, bestPos - 200);
    const end = Math.min(content.length, bestPos + maxChars);
    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }
}
