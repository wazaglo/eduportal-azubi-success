import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { AuthService } from '../../services/auth-service';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(1, 'Verification code is required'),
});

const userRepo = new DynamoUserRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const authService = new AuthService(userRepo, analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(verifySchema, body);

  await authService.verifyEmail(input.email, input.code);

  return successResponse({ message: 'Email verified successfully' });
}

export const main = wrapHandler(handler);
