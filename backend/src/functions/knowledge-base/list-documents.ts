import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { extractAndVerifyUser } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { DynamoKnowledgeRepository } from '../../infrastructure/repositories/dynamo-knowledge-repository';
const roleResolver = defaultRoleResolver();

const listSchema = z.object({
  year: z.string().optional(),
  subject: z.string().optional(),
  strand: z.string().optional(),
  substrand: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(1000),
});

const repo = new DynamoKnowledgeRepository();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  await extractAndVerifyUser(event, roleResolver);
  const query = validateSchema(listSchema, event.queryStringParameters ?? {});

  const documents = await repo.list({
    year: query.year,
    subject: query.subject,
    strand: query.strand,
    substrand: query.substrand,
    limit: query.limit,
  });

  return successResponse(documents, 200, {
    total: documents.length,
  });
}

export const main = wrapHandler(handler);
