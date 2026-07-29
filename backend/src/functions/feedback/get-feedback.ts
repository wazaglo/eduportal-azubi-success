import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { FeedbackService } from '../../services/feedback-service';
import { DynamoFeedbackRepository } from '../../infrastructure/repositories/dynamo-feedback-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema, paginationSchema } from '../../utils/validator';
import { extractAndVerifyUser } from '../../utils/auth-middleware';

const feedbackRepo = new DynamoFeedbackRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const feedbackService = new FeedbackService(feedbackRepo, analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = extractAndVerifyUser(event);
  const queryParams = validateSchema(paginationSchema, event.queryStringParameters ?? {});

  const result = await feedbackService.getUserFeedback(user.userId, queryParams.limit as number, queryParams.nextToken);

  return successResponse(result.feedback, 200, {
    limit: queryParams.limit,
    total: result.feedback.length,
    ...(result.nextToken ? { nextToken: result.nextToken } : {}),
  });
}

export const main = wrapHandler(handler);
