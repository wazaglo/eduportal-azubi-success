import { describe, expect, it, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { QuestionService } from '../../services/question-service';

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }));
vi.mock('jsonwebtoken', () => ({ default: { verify: verifyMock } }));

import { createHandler, ListHandlerDeps } from './list';

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/question',
    headers: { Authorization: 'Bearer test-token' },
    queryStringParameters: null,
    ...overrides,
  } as unknown as APIGatewayProxyEvent;
}

const context = { awsRequestId: 'test-1', functionName: 'test' } as unknown as Context;

function makeDeps(overrides?: Partial<ListHandlerDeps>): ListHandlerDeps {
  const questionService = {
    listByUser: vi.fn(async () => ({ questions: [], nextToken: undefined })),
  } as unknown as QuestionService;
  return { questionService, ...overrides };
}

describe('GET /question handler', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    verifyMock.mockReturnValue({ userId: 'user-1', email: 'student@test.com', role: 'student' });
  });

  it('returns 200 with a paginated list', async () => {
    const deps = makeDeps({
      questionService: {
        listByUser: vi.fn(async () => ({
          questions: [
            {
              questionId: 'q-1',
              userId: 'user-1',
              question: 'What is a cell?',
              normalizedQuestion: 'what is a cell?',
              response: 'A basic unit of life.',
              subject: 'Integrated Science',
              source: 'knowledge_base',
              status: 'answered',
              createdAt: '2026-08-01T00:00:00.000Z',
              updatedAt: '2026-08-01T00:00:00.000Z',
            },
          ],
          nextToken: 'abc',
        })),
      } as unknown as QuestionService,
    });
    const handler = createHandler(deps);

    const result = await handler(makeEvent({ queryStringParameters: { limit: '10' } }), context);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.metadata).toMatchObject({ limit: 10, total: 1, nextToken: 'abc' });
    expect(deps.questionService.listByUser).toHaveBeenCalledWith('user-1', 10, undefined);
  });

  it('applies the default limit when no query params are sent', async () => {
    const deps = makeDeps();
    const handler = createHandler(deps);
    await handler(makeEvent(), context);
    expect(deps.questionService.listByUser).toHaveBeenCalledWith('user-1', 20, undefined);
  });

  it('returns 400 for an invalid limit', async () => {
    const handler = createHandler(makeDeps());
    const result = await handler(makeEvent({ queryStringParameters: { limit: '0' } }), context);
    expect(result.statusCode).toBe(400);
  });

  it('returns 401 when no Authorization header is present', async () => {
    const handler = createHandler(makeDeps());
    const result = await handler(makeEvent({ headers: {} }), context);
    expect(result.statusCode).toBe(401);
  });
});
