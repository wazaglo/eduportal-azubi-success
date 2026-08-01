import { describe, expect, it, vi } from 'vitest';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { QuestionService } from '../../services/question-service';
import { NotFoundError, AuthorizationError } from '../../utils/errors';

import { createHandler, DeleteHandlerDeps } from './delete';

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'DELETE',
    path: '/question/q-1',
    headers: { Authorization: 'Bearer test-token' },
    requestContext: {
      authorizer: { claims: { sub: 'user-1', email: 'student@test.com' } },
    },
    pathParameters: { id: 'q-1' },
    ...overrides,
  } as unknown as APIGatewayProxyEvent;
}

const context = { awsRequestId: 'test-1', functionName: 'test' } as unknown as Context;

function makeDeps(overrides?: Partial<DeleteHandlerDeps>): DeleteHandlerDeps {
  const questionService = {
    deleteQuestion: vi.fn(async () => {}),
  } as unknown as QuestionService;
  return { questionService, roleResolver: vi.fn(async () => 'student'), ...overrides };
}

describe('DELETE /question/{id} handler', () => {
  it('returns 200 when the question is deleted', async () => {
    const deps = makeDeps();
    const handler = createHandler(deps);

    const result = await handler(makeEvent(), context);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(deps.questionService.deleteQuestion).toHaveBeenCalledWith('q-1', 'user-1', 'student');
  });

  it('returns 400 when the id is missing', async () => {
    const deps = makeDeps();
    const handler = createHandler(deps);
    const result = await handler(makeEvent({ pathParameters: null }), context);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('MISSING_ID');
  });

  it('returns 404 when the question does not exist', async () => {
    const deps = makeDeps({
      questionService: {
        deleteQuestion: vi.fn(async () => {
          throw new NotFoundError('Question', 'q-missing');
        }),
      } as unknown as QuestionService,
    });
    const handler = createHandler(deps);
    const result = await handler(makeEvent(), context);

    expect(result.statusCode).toBe(404);
  });

  it('returns 403 when the user is not the owner', async () => {
    const deps = makeDeps({
      questionService: {
        deleteQuestion: vi.fn(async () => {
          throw new AuthorizationError('You can only delete your own questions');
        }),
      } as unknown as QuestionService,
    });
    const handler = createHandler(deps);
    const result = await handler(makeEvent(), context);

    expect(result.statusCode).toBe(403);
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
