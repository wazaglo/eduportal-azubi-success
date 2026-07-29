import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { FeedbackService } from '../../services/feedback-service';
import { DynamoFeedbackRepository } from '../../infrastructure/repositories/dynamo-feedback-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { extractAndVerifyUser } from '../../utils/auth-middleware';
import { STATUS_CODES } from '../../utils/constants';

const submitFeedbackSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  category: z.enum(['accuracy', 'relevance', 'helpfulness', 'clarity', 'other']).optional(),
  comment: z.string().max(2000).optional(),
});

const feedbackRepo = new DynamoFeedbackRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const feedbackService = new FeedbackService(feedbackRepo, analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = extractAndVerifyUser(event);
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(submitFeedbackSchema, body);

  const feedback = await feedbackService.submitFeedback({
    userId: user.userId,
    messageId: input.messageId,
    conversationId: input.conversationId,
    rating: input.rating as 1 | 2 | 3 | 4 | 5,
    category: input.category,
    comment: input.comment,
  });

  return successResponse({ feedback }, STATUS_CODES.CREATED);
}

export const main = wrapHandler(handler);
