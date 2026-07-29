import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { AuthService } from '../../services/auth-service';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const userRepo = new DynamoUserRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const authService = new AuthService(userRepo, analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(refreshSchema, body);

  const tokens = await authService.refreshToken(input.refreshToken);

  return successResponse({ tokens });
}

export const main = wrapHandler(handler);
