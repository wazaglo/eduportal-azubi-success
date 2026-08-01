import { describe, expect, it, vi } from 'vitest';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { QuestionService } from '../../services/question-service';

import { createHandler, FaqHandlerDeps } from './faq';

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/FAQ',
    headers: { Authorization: 'Bearer test-token' },
    requestContext: {
      authorizer: { claims: { sub: 'user-1', email: 'student@test.com' } },
    },
    queryStringParameters: null,
    ...overrides,
  } as unknown as APIGatewayProxyEvent;
}

const context = { awsRequestId: 'test-1', functionName: 'test' } as unknown as Context;

function makeDeps(overrides?: Partial<FaqHandlerDeps>): FaqHandlerDeps {
  const questionService = {
    getFaq: vi.fn(async () => []),
  } as unknown as QuestionService;
  return { questionService, roleResolver: vi.fn(async () => 'student'), ...overrides };
}

describe('GET /FAQ handler', () => {
  it('returns 200 with FAQ entries', async () => {
    const deps = makeDeps({
      questionService: {
        getFaq: vi.fn(async () => [
          { question: 'What is a cell?', count: 3, response: 'A basic unit of life.', subject: 'Integrated Science' },
        ]),
      } as unknown as QuestionService,
    });
    const handler = createHandler(deps);

    const result = await handler(makeEvent({ queryStringParameters: { limit: '5' } }), context);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ question: 'What is a cell?', count: 3 });
    expect(body.metadata).toMatchObject({ limit: 5, total: 1 });
    expect(deps.questionService.getFaq).toHaveBeenCalledWith(5);
  });

  it('applies the default limit when no query params are sent', async () => {
    const deps = makeDeps();
    const handler = createHandler(deps);
    await handler(makeEvent(), context);
    expect(deps.questionService.getFaq).toHaveBeenCalledWith(20);
  });

  it('returns 401 when the authorizer provides no claims', async () => {
    const handler = createHandler(makeDeps());
    const result = await handler(
      makeEvent({ requestContext: { authorizer: {} } as unknown as APIGatewayProxyEvent['requestContext'] }),
      context,
    );
    expect(result.statusCode).toBe(401);
  });
});
