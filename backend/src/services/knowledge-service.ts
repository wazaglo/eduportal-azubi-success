import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { CacheService } from './cache-service';
import { logger } from '../utils/logger';
import {
  MIN_CONFIDENT_SCORE,
  MIN_WEAK_SCORE,
  WEAK_MATCH_NOTE,
  SINGLE_TERM_MIN_COUNT,
  calculateRelevance,
  detectSubject,
  extractRelevantExcerpt,
  tokenize,
} from './knowledge-retrieval';

export interface AnswerResult {
  answer: string;
  source: 'cache' | 'knowledge_base' | 'model';
  documentTitle?: string;
  note?: string;
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

      const detectedSubject = detectSubject(question);
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

      const questionTerms = tokenize(question);

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

        const { score, distinctMatched, maxTermCount } = calculateRelevance(questionTerms, title, content);
        const singleStrongMatch = distinctMatched === 1 && maxTermCount >= SINGLE_TERM_MIN_COUNT;
        if (distinctMatched < distinctTermsRequired && !singleStrongMatch) continue;
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          const excerpt = extractRelevantExcerpt(content, questionTerms, 1000);
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

  public detectSubject(question: string): string | null {
    return detectSubject(question);
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
}
