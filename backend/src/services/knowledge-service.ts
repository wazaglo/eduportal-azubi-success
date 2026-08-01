import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { CacheService } from './cache-service';
import { ProviderFactory } from '../infrastructure/ai/provider-factory';
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
  pending?: boolean;
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
    let kb: { answer: string; documentTitle: string; note?: string } | null = null;
    if (this.bucket) {
      kb = await this.searchS3KnowledgeBase(question, level);
    } else {
      logger.warn('KNOWLEDGE_BUCKET not configured, skipping S3 search');
    }

    // A confident match is on-topic: answer directly from the curriculum.
    if (kb && !kb.note) {
      const answer = kb.answer;
      await this.cacheService.storeCachedResponse({
        query: question,
        response: answer,
        queryType: queryType as 'academic' | 'administrative' | 'general',
        modelUsed: 'knowledge-base',
        tokensUsed: 0,
        similarityHash: '',
        source: 'knowledge_base',
        metadata: { documentTitle: kb.documentTitle },
      });
      logger.info('Knowledge base hit for question', { question: question.substring(0, 50), level });
      return {
        answer,
        source: 'knowledge_base',
        documentTitle: kb.documentTitle,
        cached: false,
      };
    }

    // Step 3: Weak/no KB match -> refine with the AI provider when a key exists.
    // The closest curriculum excerpt is passed as context so the answer stays
    // grounded in the curriculum instead of returning a raw content dump.
    if (kb && kb.note && process.env.OPENAI_API_KEY) {
      const aiAnswer = await this.generateWithAI(question, kb.answer);
      if (aiAnswer) {
        logger.info('AI-refined weak KB match for question', { question: question.substring(0, 50) });
        await this.cacheService.storeCachedResponse({
          query: question,
          response: aiAnswer.answer,
          queryType: queryType as 'academic' | 'administrative' | 'general',
          modelUsed: aiAnswer.modelUsed,
          tokensUsed: aiAnswer.tokensUsed,
          similarityHash: '',
          source: 'model',
          metadata: { documentTitle: kb.documentTitle },
        });
        return {
          answer: aiAnswer.answer,
          source: 'model',
          documentTitle: kb.documentTitle,
          cached: false,
        };
      }
    }

    // Step 4: No AI available. Fall back to the weak KB excerpt, or the
    // integration-pending placeholder when nothing was found.
    if (kb && kb.note) {
      const answer = `${kb.answer}\n\n${kb.note}`;
      await this.cacheService.storeCachedResponse({
        query: question,
        response: answer,
        queryType: queryType as 'academic' | 'administrative' | 'general',
        modelUsed: 'knowledge-base',
        tokensUsed: 0,
        similarityHash: '',
        source: 'knowledge_base',
        metadata: { documentTitle: kb.documentTitle, note: kb.note },
      });
      logger.info('Weak knowledge base match for question', { question: question.substring(0, 50), level });
      return {
        answer,
        source: 'knowledge_base',
        documentTitle: kb.documentTitle,
        note: kb.note,
        cached: false,
      };
    }

    logger.info('Cache miss and KB miss, returning pending response', { question: question.substring(0, 50) });
    const stubAnswer = '[Model integration pending] This question could not be answered from the knowledge base. AI model support will be added next.';
    return {
      answer: stubAnswer,
      source: 'model',
      pending: true,
      cached: false,
    };
  }

  private async generateWithAI(question: string, curriculumContext?: string): Promise<{ answer: string; modelUsed: string; tokensUsed: number } | null> {
    try {
      const provider = ProviderFactory.getProvider();
      const prompt = curriculumContext
        ? `Answer the student's question using the curriculum material below as the basis. Keep the answer clear, concise, and directly answer the question. If the material does not cover the question, say so plainly.\n\nStudent question: ${question}\n\nRelevant curriculum material:\n${curriculumContext}`
        : question;

      const result = await provider.generateResponse({
        prompt,
        systemPrompt:
          'You are a friendly, knowledgeable tutor for a Senior High School student in Ghana. ' +
          'Answer directly and step by step where helpful. Use plain language and avoid repeating the question back.',
        maxTokens: 600,
        temperature: 0.4,
      });

      if (!result.content || !result.content.trim()) {
        logger.warn('AI provider returned an empty answer');
        return null;
      }

      return { answer: result.content.trim(), modelUsed: result.modelUsed, tokensUsed: result.tokensUsed };
    } catch (error: any) {
      logger.error('AI fallback failed, using knowledge-base fallback', { error: error.message });
      return null;
    }
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
          const excerpt = extractRelevantExcerpt(content, questionTerms, 700);
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
