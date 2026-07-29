import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { AuthService } from '../../services/auth-service';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userRepo = new DynamoUserRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const authService = new AuthService(userRepo, analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(loginSchema, body);

  const result = await authService.login(input);

  return successResponse({
    user: {
      userId: result.user.userId,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
    },
    tokens: result.tokens,
  });
}

export const main = wrapHandler(handler);
