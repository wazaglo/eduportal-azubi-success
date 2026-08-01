import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { NotFoundError } from '../../utils/errors';
import { KNOWLEDGE_BUCKET, KNOWLEDGE_LEVELS, SHS_SUBJECTS } from '../../utils/knowledge-constants';
import { DynamoKnowledgeRepository } from '../../infrastructure/repositories/dynamo-knowledge-repository';
const roleResolver = defaultRoleResolver();

const completeSchema = z.object({
  s3Key: z.string().min(1),
  fileName: z.string().min(1).max(255),
  year: z.enum(KNOWLEDGE_LEVELS),
  subject: z.enum(SHS_SUBJECTS),
  strand: z.string().min(1).max(120),
  substrand: z.string().min(1).max(120),
  size: z.number().int().nonnegative(),
  contentType: z.string(),
});

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' });
const repo = new DynamoKnowledgeRepository();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = await requireAdmin(event, roleResolver);
  const input = validateSchema(completeSchema, JSON.parse(event.body ?? '{}'));

  const head = await s3.send(new HeadObjectCommand({
    Bucket: KNOWLEDGE_BUCKET,
    Key: input.s3Key,
  }));

  if (!head.ContentLength) {
    throw new NotFoundError('S3 object', input.s3Key);
  }

  const document = await repo.create({
    s3Key: input.s3Key,
    fileName: input.fileName,
    year: input.year,
    subject: input.subject,
    strand: input.strand,
    substrand: input.substrand,
    size: input.size,
    contentType: input.contentType,
    status: 'indexed',
    uploadedBy: user.userId,
  });

  return successResponse(document, 201);
}

export const main = wrapHandler(handler);
