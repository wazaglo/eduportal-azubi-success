import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ConversationService } from '../../services/conversation-service';
import { DynamoConversationRepository } from '../../infrastructure/repositories/dynamo-conversation-repository';
import { DynamoMessageRepository } from '../../infrastructure/repositories/dynamo-message-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema, paginationSchema } from '../../utils/validator';
import { extractAndVerifyUser } from '../../utils/auth-middleware';

const conversationRepo = new DynamoConversationRepository();
const messageRepo = new DynamoMessageRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const conversationService = new ConversationService(conversationRepo, messageRepo, analyticsRepo);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = extractAndVerifyUser(event);
  const queryParams = validateSchema(paginationSchema, event.queryStringParameters ?? {});

  const result = await conversationService.getUserConversations(
    user.userId,
    queryParams.limit as number,
    queryParams.nextToken,
  );

  return successResponse(result.conversations, 200, {
    limit: queryParams.limit,
    total: result.conversations.length,
    ...(result.nextToken ? { nextToken: result.nextToken } : {}),
  });
}

export const main = wrapHandler(handler);
