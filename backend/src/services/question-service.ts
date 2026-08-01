import { v4 as uuidv4 } from 'uuid';
import { QuestionRepository } from '../core/ports/question-repository';
import type { KnowledgeService } from './knowledge-service';
import type { AnalyticsService } from './analytics-service';
import { Question, FaqEntry } from '../core/entities/question';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { ROLES } from '../utils/constants';
import { logger } from '../utils/logger';

interface AskInput {
  userId: string;
  question: string;
  subject?: string;
}

export class QuestionService {
  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly knowledgeService: KnowledgeService,
    private readonly analyticsService?: AnalyticsService,
  ) {}

  async ask(input: AskInput): Promise<Question> {
    const answer = await this.knowledgeService.getAnswer(input.question, '', 'academic');
    const subject = input.subject?.trim() || this.knowledgeService.detectSubject(input.question) || null;

    const isPending = answer.pending === true;
    const question: Question = {
      questionId: uuidv4(),
      userId: input.userId,
      question: input.question.trim(),
      normalizedQuestion: this.normalize(input.question),
      response: answer.answer,
      subject,
      source: isPending ? 'pending' : (answer.source === 'model' ? 'ai' : 'knowledge_base'),
      status: isPending ? 'pending' : 'answered',
      documentTitle: answer.documentTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.questionRepo.create(question);

    if (this.analyticsService) {
      await this.analyticsService.trackEvent({
        eventType: 'question_asked',
        userId: input.userId,
        properties: { questionId: question.questionId, subject },
      });
    }

    logger.info('Question answered', { questionId: question.questionId, userId: input.userId, subject });
    return question;
  }

  async listByUser(userId: string, limit: number, nextToken?: string): Promise<{ questions: Question[]; nextToken?: string }> {
    return this.questionRepo.findByUser(userId, limit, nextToken);
  }

  async deleteQuestion(questionId: string, userId: string, role: string): Promise<void> {
    const existing = await this.questionRepo.findById(questionId);
    if (!existing) {
      throw new NotFoundError('Question', questionId);
    }
    if (existing.userId !== userId && role !== ROLES.ADMIN && role !== ROLES.SUPPORT) {
      throw new AuthorizationError('You can only delete your own questions');
    }
    await this.questionRepo.delete(questionId);
  }

  async getFaq(limit: number): Promise<FaqEntry[]> {
    const all = await this.questionRepo.findAll(1000);
    const byText = new Map<string, { question: string; count: number; response: string | null; subject: string | null; createdAt: string }>();

    for (const q of all) {
      const key = q.normalizedQuestion || this.normalize(q.question);
      const entry = byText.get(key);
      if (entry) {
        entry.count++;
        if (q.createdAt > entry.createdAt) {
          entry.response = q.response;
          entry.subject = q.subject;
          entry.createdAt = q.createdAt;
        }
      } else {
        byText.set(key, {
          question: q.question,
          count: 1,
          response: q.response,
          subject: q.subject,
          createdAt: q.createdAt,
        });
      }
    }

    return [...byText.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ question, count, response, subject }) => ({ question, count, response, subject }));
  }

  private normalize(q: string): string {
    return q.toLowerCase().replace(/\s+/g, ' ').trim();
  }
}
