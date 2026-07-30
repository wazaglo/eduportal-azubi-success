import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { CacheService } from './cache-service';
import { logger } from '../utils/logger';

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
      const prefix = level ? `knowledge/${level}/` : 'knowledge/';
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

      const questionTerms = question.toLowerCase().split(/\s+/).filter(t => t.length > 2);

      let bestMatch: { answer: string; title: string; score: number } | null = null;

      for (const doc of documents) {
        if (!doc.Key) continue;

        const title = doc.Key.replace(prefix, '');
        const content = await this.readS3Document(doc.Key);
        if (!content) continue;

        const score = this.calculateRelevance(questionTerms, title, content);
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          const excerpt = this.extractRelevantExcerpt(content, questionTerms, 1000);
          bestMatch = { answer: excerpt, title, score };
        }
      }

      if (bestMatch) {
        logger.info('Best KB document match', { title: bestMatch.title, score: bestMatch.score });
        return { answer: bestMatch.answer, documentTitle: bestMatch.title };
      }

      return null;
    } catch (error: any) {
      logger.error('S3 knowledge base search failed', { error: error.message, bucket: this.bucket });
      return null;
    }
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

  private calculateRelevance(questionTerms: string[], title: string, content: string): number {
    const searchText = `${title} ${content}`.toLowerCase();
    let matchCount = 0;
    for (const term of questionTerms) {
      if (searchText.includes(term)) {
        matchCount++;
      }
    }
    if (matchCount === 0) return 0;

    const titleBonus = title.toLowerCase().includes(questionTerms.join(' ')) ? 0.2 : 0;
    return (matchCount / questionTerms.length) + titleBonus;
  }

  private extractRelevantExcerpt(content: string, questionTerms: string[], maxChars: number): string {
    const lower = content.toLowerCase();
    let bestPos = 0;
    let bestCount = 0;

    for (const term of questionTerms) {
      const pos = lower.indexOf(term);
      if (pos !== -1) {
        const count = questionTerms.filter(t => lower.includes(t)).length;
        if (count > bestCount) {
          bestCount = count;
          bestPos = pos;
        }
      }
    }

    if (bestCount === 0) return content.substring(0, maxChars);

    const start = Math.max(0, bestPos - 200);
    const end = Math.min(content.length, bestPos + maxChars);
    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }
}
