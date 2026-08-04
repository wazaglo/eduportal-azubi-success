import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QuestionService } from './question-service';
import { QuestionRepository } from '../core/ports/question-repository';
import type { KnowledgeService } from './knowledge-service';
import type { AnalyticsService } from './analytics-service';
import { Question } from '../core/entities/question';
import { NotFoundError, AuthorizationError, DailyQueryLimitError } from '../utils/errors';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    questionId: 'q-1',
    userId: 'user-1',
    question: 'What is a quadratic equation?',
    normalizedQuestion: 'what is a quadratic equation?',
    response: 'An equation of the form ax^2 + bx + c = 0.',
    subject: 'Core Mathematics',
    source: 'knowledge_base',
    status: 'answered',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildService(overrides?: {
  repo?: Partial<QuestionRepository>;
  knowledge?: Partial<KnowledgeService>;
  analytics?: Partial<AnalyticsService>;
}) {
  const repo = {
    create: vi.fn(async (input: Question) => makeQuestion(input as Question)),
    findById: vi.fn(async () => null),
    findByUser: vi.fn(async () => ({ questions: [], nextToken: undefined })),
    findAll: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    delete: vi.fn(async () => {}),
    countAiGeneratedToday: vi.fn(async () => 0),
    ...(overrides?.repo ?? {}),
  } as unknown as QuestionRepository;

  const knowledge = {
    getAnswer: vi.fn(async () => ({
      answer: 'An equation of the form ax^2 + bx + c = 0.',
      source: 'knowledge_base',
      cached: false,
    })),
    detectSubject: vi.fn(() => 'Core Mathematics'),
    ...(overrides?.knowledge ?? {}),
  } as unknown as KnowledgeService;

  const analytics = {
    trackEvent: vi.fn(async () => ({})),
    ...(overrides?.analytics ?? {}),
  } as unknown as AnalyticsService;

  const service = new QuestionService(repo, knowledge, analytics);
  return { service, repo, knowledge, analytics };
}

describe('QuestionService.ask', () => {
  it('creates an answered question from a knowledge-base hit', async () => {
    const { service, repo, analytics } = buildService();

    const question = await service.ask({
      userId: 'user-1',
      question: '  What is a quadratic equation?  ',
    });

    expect(question.source).toBe('knowledge_base');
    expect(question.status).toBe('answered');
    expect(question.question).toBe('What is a quadratic equation?');
    expect(question.subject).toBe('Core Mathematics');
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'question_asked', userId: 'user-1' }),
    );
  });

  it('marks the question pending when the model stub is returned', async () => {
    const { service } = buildService({
      knowledge: {
        getAnswer: vi.fn(async () => ({
          answer: '[Model integration pending] ...',
          source: 'model',
          cached: false,
          pending: true,
        })),
      },
    });

    const question = await service.ask({ userId: 'user-1', question: 'something obscure' });
    expect(question.source).toBe('pending');
    expect(question.status).toBe('pending');
  });

  it('marks an AI answer as answered with the ai source', async () => {
    const { service } = buildService({
      knowledge: {
        getAnswer: vi.fn(async () => ({
          answer: 'The equation of the line is y = (2/3)x - 5/3.',
          source: 'model',
          cached: false,
        })),
      },
    });

    const question = await service.ask({ userId: 'user-1', question: 'equation of a line through two points' });
    expect(question.source).toBe('ai');
    expect(question.status).toBe('answered');
  });

  it('allows AI answers up to the daily limit', async () => {
    const { service, repo } = buildService({
      knowledge: {
        getAnswer: vi.fn(async () => ({
          answer: '...',
          source: 'model',
          cached: false,
        })),
      },
      repo: { countAiGeneratedToday: vi.fn(async () => 9) },
    });

    const question = await service.ask({ userId: 'user-1', question: 'still under the cap' });
    expect(question.source).toBe('ai');
    expect(repo.countAiGeneratedToday).toHaveBeenCalledWith('user-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('rejects the 11th AI answer with a DailyQueryLimitError', async () => {
    const { service } = buildService({
      knowledge: {
        getAnswer: vi.fn(async () => ({
          answer: '...',
          source: 'model',
          cached: false,
        })),
      },
      repo: { countAiGeneratedToday: vi.fn(async () => 10) },
    });

    await expect(service.ask({ userId: 'user-1', question: 'one too many' })).rejects.toBeInstanceOf(DailyQueryLimitError);
  });

  it('does not count knowledge-base answers toward the daily AI limit', async () => {
    const { service, repo } = buildService({
      repo: { countAiGeneratedToday: vi.fn(async () => 0) },
    });

    const question = await service.ask({ userId: 'user-1', question: 'what is a quadratic equation?' });
    expect(question.source).toBe('knowledge_base');
    expect(repo.countAiGeneratedToday).not.toHaveBeenCalled();
  });

  it('prefers an explicit subject from the caller', async () => {
    const { service, knowledge } = buildService({
      knowledge: {
        detectSubject: vi.fn(() => 'Integrated Science'),
      },
    });

    const question = await service.ask({
      userId: 'user-1',
      question: 'What is a quadratic equation?',
      subject: 'Social Studies',
    });

    expect(question.subject).toBe('Social Studies');
    expect(knowledge.detectSubject).not.toHaveBeenCalled();
  });
});

describe('QuestionService.listByUser', () => {
  it('delegates to the repository', async () => {
    const { service, repo } = buildService({
      repo: {
        findByUser: vi.fn(async () => ({ questions: [makeQuestion()], nextToken: 'abc' })),
      },
    });

    const result = await service.listByUser('user-1', 10, 'tok');
    expect(repo.findByUser).toHaveBeenCalledWith('user-1', 10, 'tok');
    expect(result.questions).toHaveLength(1);
    expect(result.nextToken).toBe('abc');
  });
});

describe('QuestionService.deleteQuestion', () => {
  it('allows the owner to delete', async () => {
    const { service, repo } = buildService({
      repo: { findById: vi.fn(async () => makeQuestion({ userId: 'user-1' })) },
    });

    await service.deleteQuestion('q-1', 'user-1', 'student');
    expect(repo.delete).toHaveBeenCalledWith('q-1');
  });

  it('throws NotFoundError for a missing question', async () => {
    const { service } = buildService({ repo: { findById: vi.fn(async () => null) } });
    await expect(service.deleteQuestion('q-missing', 'user-1', 'student')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects another user without an admin or support role', async () => {
    const { service, repo } = buildService({
      repo: { findById: vi.fn(async () => makeQuestion({ userId: 'other-user' })) },
    });

    await expect(service.deleteQuestion('q-1', 'user-1', 'student')).rejects.toBeInstanceOf(AuthorizationError);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('allows an admin to delete another users question', async () => {
    const { service, repo } = buildService({
      repo: { findById: vi.fn(async () => makeQuestion({ userId: 'other-user' })) },
    });

    await service.deleteQuestion('q-1', 'admin-1', 'admin');
    expect(repo.delete).toHaveBeenCalledWith('q-1');
  });
});

describe('QuestionService.getFaq', () => {
  it('groups duplicate questions, sorts by count and limits the result', async () => {
    const { service, repo } = buildService({
      repo: {
        findAll: vi.fn(async () => [
          makeQuestion({ questionId: 'q1', question: 'What is a cell?', normalizedQuestion: 'what is a cell?' }),
          makeQuestion({ questionId: 'q2', question: 'What is a cell?', normalizedQuestion: 'what is a cell?' }),
          makeQuestion({ questionId: 'q3', question: 'What is a cell?', normalizedQuestion: 'what is a cell?' }),
          makeQuestion({ questionId: 'q4', question: 'What is an atom?', normalizedQuestion: 'what is an atom?' }),
          makeQuestion({ questionId: 'q5', question: 'What is a bond?', normalizedQuestion: 'what is a bond?' }),
        ]),
      },
    });

    const faq = await service.getFaq(2);
    expect(faq).toHaveLength(2);
    expect(faq[0]).toMatchObject({ question: 'What is a cell?', count: 3 });
    expect(faq[1]).toMatchObject({ count: 1 });
  });

  it('returns an empty list when there are no questions', async () => {
    const { service } = buildService({ repo: { findAll: vi.fn(async () => []) } });
    expect(await service.getFaq(10)).toEqual([]);
  });
});
