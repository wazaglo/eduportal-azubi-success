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
  const conversationId = event.pathParameters?.id;

  if (!conversationId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: { code: 'MISSING_ID', message: 'Conversation ID is required' } }),
    };
  }

  const queryParams = validateSchema(paginationSchema, event.queryStringParameters ?? {});
  const [conversation, messages] = await Promise.all([
    conversationService.getConversation(conversationId, user.userId),
    conversationService.getConversationMessages(conversationId, queryParams.limit as number, queryParams.nextToken, user.userId),
  ]);

  return successResponse({
    conversation,
    messages: messages.messages,
    nextToken: messages.nextToken,
  });
}

export const main = wrapHandler(handler);
