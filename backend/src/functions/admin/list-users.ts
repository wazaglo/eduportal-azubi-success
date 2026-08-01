import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema, paginationSchema } from '../../utils/validator';
import { requireAdmin } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';
const roleResolver = defaultRoleResolver();

const userRepo = new DynamoUserRepository();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  await requireAdmin(event, roleResolver);
  const queryParams = validateSchema(paginationSchema, event.queryStringParameters ?? {});
  const roleFilter = event.queryStringParameters?.role;

  const result = roleFilter
    ? await userRepo.listByRole(roleFilter, queryParams.limit!, queryParams.nextToken)
    : await userRepo.list(queryParams.limit!, queryParams.nextToken);

  return successResponse(result.users, 200, {
    limit: queryParams.limit,
    total: result.users.length,
    ...(result.nextToken ? { nextToken: result.nextToken } : {}),
  });
}

export const main = wrapHandler(handler);
