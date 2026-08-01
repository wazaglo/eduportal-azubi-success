import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { AnalyticsService } from '../../services/analytics-service';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { requireAdmin } from '../../utils/auth-middleware';
import { defaultRoleResolver } from '../../utils/role-resolver';
const roleResolver = defaultRoleResolver();

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional().default(() => new Date(Date.now() - 7 * 86400000).toISOString()),
  endDate: z.string().datetime({ offset: true }).optional().default(() => new Date().toISOString()),
});

const analyticsRepo = new DynamoAnalyticsRepository();
const analyticsService = new AnalyticsService(analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  await requireAdmin(event, roleResolver);
  const queryParams = validateSchema(analyticsQuerySchema, event.queryStringParameters ?? {});

  const report = await analyticsService.generateReport(queryParams.startDate!, queryParams.endDate!);

  return successResponse({ report });
}

export const main = wrapHandler(handler);
