import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extractAndVerifyUser } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { NotFoundError } from '../../utils/errors';
import { KNOWLEDGE_BUCKET, SHS_SUBJECTS } from '../../utils/knowledge-constants';
const roleResolver = defaultRoleResolver();

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-1' });

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  await extractAndVerifyUser(event, roleResolver);

  const subject = event.queryStringParameters?.subject;
  if (!subject || !SHS_SUBJECTS.includes(subject as (typeof SHS_SUBJECTS)[number])) {
    throw new NotFoundError('Curriculum source', subject ?? '(missing subject)');
  }

  const subjectSlug = subject.replace(/\s+/g, '_');
  const fileName = `${subjectSlug}-Curriculum.pdf`;
  const key = `knowledge/sources/${subjectSlug}/${fileName}`;

  const command = new GetObjectCommand({
    Bucket: KNOWLEDGE_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${fileName}"`,
  });

  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

  return successResponse({
    downloadUrl,
    fileName,
    subject,
    s3Key: key,
    expiresIn: 900,
  });
}

export const main = wrapHandler(handler);
