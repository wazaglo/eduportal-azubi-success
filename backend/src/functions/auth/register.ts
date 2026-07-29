import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { AuthService } from '../../services/auth-service';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { STATUS_CODES } from '../../utils/constants';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  fullName: z.string().min(1, 'Full name is required').max(100),
  role: z.enum(['student', 'admin', 'support']).optional().default('student'),
  department: z.string().max(100).optional(),
  enrollmentYear: z.number().int().min(1900).max(2100).optional(),
  courseOfStudy: z.string().max(200).optional(),
});

const userRepo = new DynamoUserRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const authService = new AuthService(userRepo, analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(registerSchema, body);

  const result = await authService.register(input);

  return successResponse(
    {
      user: {
        userId: result.user.userId,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      tokens: result.tokens,
    },
    STATUS_CODES.CREATED,
  );
}

export const main = wrapHandler(handler);
