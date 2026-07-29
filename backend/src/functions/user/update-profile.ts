import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { extractAndVerifyUser } from '../../utils/auth-middleware';

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  department: z.string().max(100).optional(),
  enrollmentYear: z.number().int().min(1900).max(2100).optional(),
  courseOfStudy: z.string().max(200).optional(),
  preferences: z.object({
    language: z.string().optional(),
    notifications: z.boolean().optional(),
    theme: z.enum(['light', 'dark']).optional(),
  }).optional(),
});

const userRepo = new DynamoUserRepository();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = extractAndVerifyUser(event);
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(updateProfileSchema, body);

  const updated = await userRepo.update(user.userId, input);

  return successResponse({ user: updated });
}

export const main = wrapHandler(handler);
