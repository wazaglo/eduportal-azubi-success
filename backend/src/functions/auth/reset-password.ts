import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { AuthService } from '../../services/auth-service';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';

const requestResetSchema = z.object({
  email: z.string().email(),
});

const confirmResetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const userRepo = new DynamoUserRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const authService = new AuthService(userRepo, analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body ?? '{}');

  if (body.code) {
    const input = validateSchema(confirmResetSchema, body);
    await authService.confirmResetPassword(input.email, input.code, input.newPassword);
    return successResponse({ message: 'Password reset successfully' });
  }

  const input = validateSchema(requestResetSchema, body);
  await authService.resetPasswordRequest(input.email);
  return successResponse({ message: 'Password reset code sent to email' });
}

export const main = wrapHandler(handler);
