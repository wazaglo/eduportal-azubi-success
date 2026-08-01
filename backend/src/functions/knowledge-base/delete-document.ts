import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { NotFoundError } from '../../utils/errors';
import { KNOWLEDGE_BUCKET } from '../../utils/knowledge-constants';
import { DynamoKnowledgeRepository } from '../../infrastructure/repositories/dynamo-knowledge-repository';
const roleResolver = defaultRoleResolver();

const deleteSchema = z.object({
  documentId: z.string().min(1),
  s3Key: z.string().min(1),
});

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' });
const repo = new DynamoKnowledgeRepository();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  await requireAdmin(event, roleResolver);
  const input = validateSchema(deleteSchema, JSON.parse(event.body ?? '{}'));

  const existing = await repo.findById(input.documentId);
  if (!existing) {
    throw new NotFoundError('Knowledge document', input.documentId);
  }

  await s3.send(new DeleteObjectCommand({
    Bucket: KNOWLEDGE_BUCKET,
    Key: input.s3Key,
  }));

  await repo.delete(input.documentId);

  return successResponse({ deleted: true, documentId: input.documentId });
}

export const main = wrapHandler(handler);
