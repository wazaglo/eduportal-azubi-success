import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAdmin } from '../../utils/auth-middleware';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { KNOWLEDGE_BUCKET, KNOWLEDGE_LEVELS, SHS_SUBJECTS } from '../../utils/knowledge-constants';

const presignSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255),
  contentType: z.string().min(1, 'Content type is required'),
  year: z.enum(KNOWLEDGE_LEVELS),
  subject: z.enum(SHS_SUBJECTS),
  strand: z.string().min(1).max(120),
  substrand: z.string().min(1).max(120),
});

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' });

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = requireAdmin(event);
  const input = validateSchema(presignSchema, JSON.parse(event.body ?? '{}'));

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = [
    `knowledge`,
    input.year,
    input.subject.replace(/\s+/g, '_'),
    input.strand.replace(/\s+/g, '_'),
    input.substrand.replace(/\s+/g, '_'),
    safeName,
  ].join('/');

  const command = new PutObjectCommand({
    Bucket: KNOWLEDGE_BUCKET,
    Key: key,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return successResponse({
    uploadUrl,
    s3Key: key,
    expiresIn: 300,
    uploadedBy: user.userId,
  });
}

export const main = wrapHandler(handler);
