import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { extractAndVerifyUser } from '../../utils/auth-middleware';

const userRepo = new DynamoUserRepository();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = extractAndVerifyUser(event);
  const profile = await userRepo.findById(user.userId);

  return successResponse({ profile });
}

export const main = wrapHandler(handler);
