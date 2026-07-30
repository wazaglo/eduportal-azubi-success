import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { z } from 'zod';
import { ChatService } from '../../services/chat-service';
import { CacheService } from '../../services/cache-service';
import { KnowledgeService } from '../../services/knowledge-service';
import { ConversationService } from '../../services/conversation-service';
import { DynamoConversationRepository } from '../../infrastructure/repositories/dynamo-conversation-repository';
import { DynamoMessageRepository } from '../../infrastructure/repositories/dynamo-message-repository';
import { DynamoAnalyticsRepository } from '../../infrastructure/repositories/dynamo-analytics-repository';
import { DynamoCacheRepository } from '../../infrastructure/repositories/dynamo-cache-repository';
import { ProviderFactory } from '../../infrastructure/ai/provider-factory';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';
import { extractAndVerifyUser } from '../../utils/auth-middleware';

const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  content: z.string().min(1, 'Message content is required').max(10000),
  queryType: z.enum(['academic', 'administrative', 'general']).optional(),
  requireAsync: z.boolean().optional().default(false),
});

const conversationRepo = new DynamoConversationRepository();
const messageRepo = new DynamoMessageRepository();
const analyticsRepo = new DynamoAnalyticsRepository();
const cacheRepo = new DynamoCacheRepository();
const cacheService = new CacheService(cacheRepo);
const knowledgeService = new KnowledgeService(cacheService);
const conversationService = new ConversationService(conversationRepo, messageRepo, analyticsRepo);
const aiProvider = ProviderFactory.getProvider();

const chatService = new ChatService(
  aiProvider,
  conversationRepo,
  messageRepo,
  analyticsRepo,
  knowledgeService,
  conversationService,
  process.env.ASYNC_QUEUE_URL,
);

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const user = extractAndVerifyUser(event);
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(sendMessageSchema, { ...body, requireAsync: body.requireAsync ?? false });

  const result = await chatService.sendMessage({
    userId: user.userId,
    level: user.level,
    conversationId: input.conversationId,
    content: input.content,
    queryType: input.queryType,
    requireAsync: input.requireAsync,
  });

  return successResponse(result, result.aiMessage ? undefined : 202);
}

export const main = wrapHandler(handler);
