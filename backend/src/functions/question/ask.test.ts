import { describe, expect, it, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { QuestionService } from '../../services/question-service';
import { Question } from '../../core/entities/question';

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }));
vi.mock('jsonwebtoken', () => ({ default: { verify: verifyMock } }));

import { createHandler, AskHandlerDeps } from './ask';

function makeQuestion(): Question {
  return {
    questionId: 'q-1',
    userId: 'user-1',
    question: 'What is a quadratic equation?',
    normalizedQuestion: 'what is a quadratic equation?',
    response: 'An equation of the form ax^2 + bx + c = 0.',
    subject: 'Core Mathematics',
    source: 'knowledge_base',
    status: 'answered',
    documentTitle: 'some-doc.txt',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/ask',
    headers: { Authorization: 'Bearer test-token' },
    body: JSON.stringify({ question: 'What is a quadratic equation?' }),
    ...overrides,
  } as unknown as APIGatewayProxyEvent;
}

const context = { awsRequestId: 'test-1', functionName: 'test' } as unknown as Context;

function makeDeps(overrides?: Partial<AskHandlerDeps>): AskHandlerDeps {
  const questionService = {
    ask: vi.fn(async () => makeQuestion()),
  } as unknown as QuestionService;
  return { questionService, ...overrides };
}

describe('POST /ask handler', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    verifyMock.mockReturnValue({ userId: 'user-1', email: 'student@test.com', role: 'student' });
  });

  it('returns 201 with the created question on a valid request', async () => {
    const deps = makeDeps();
    const handler = createHandler(deps);

    const result = await handler(makeEvent(), context);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      questionId: 'q-1',
      answer: 'An equation of the form ax^2 + bx + c = 0.',
      subject: 'Core Mathematics',
      source: 'knowledge_base',
      status: 'answered',
    });
    expect(deps.questionService.ask).toHaveBeenCalledWith({
      userId: 'user-1',
      question: 'What is a quadratic equation?',
      subject: undefined,
    });
  });

  it('returns 400 for an invalid body', async () => {
    const handler = createHandler(makeDeps());
    const result = await handler(makeEvent({ body: JSON.stringify({}) }), context);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when no Authorization header is present', async () => {
    const handler = createHandler(makeDeps());
    const result = await handler(makeEvent({ headers: {} }), context);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 when the token is invalid', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    const handler = createHandler(makeDeps());
    const result = await handler(makeEvent(), context);

    expect(result.statusCode).toBe(401);
  });
});
