import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { DynamoUserRepository } from '../../infrastructure/repositories/dynamo-user-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { requireAdmin } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';
const roleResolver = defaultRoleResolver();

const updateUserSchema = z.object({
  role: z.enum(['student', 'admin', 'support']).optional(),
  isActive: z.boolean().optional(),
  department: z.string().max(100).optional(),
  fullName: z.string().min(1).max(100).optional(),
});

const userRepo = new DynamoUserRepository();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  await requireAdmin(event, roleResolver);
  const userId = event.pathParameters?.id;

  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: { code: 'MISSING_ID', message: 'User ID is required' } }),
    };
  }

  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(updateUserSchema, body);

  const updated = await userRepo.update(userId, input);

  return successResponse({ user: updated });
}

export const main = wrapHandler(handler);
