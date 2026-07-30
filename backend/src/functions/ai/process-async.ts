import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
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
import { logger } from '../../utils/logger';

const sqsMessageSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  userId: z.string(),
  timestamp: z.string(),
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
);

export async function main(event: SQSEvent, context: Context): Promise<void> {
  const correlationId = context.awsRequestId;

  logger.info('Processing async SQS messages', {
    correlationId,
    recordCount: event.Records.length,
  });

  const results = await Promise.allSettled(
    event.Records.map((record: SQSRecord) => processRecord(record, correlationId))
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.error('Some async messages failed to process', {
      correlationId,
      failureCount: failures.length,
      totalCount: event.Records.length,
    });

    for (const failure of failures) {
      if (failure.status === 'rejected') {
        logger.error('Async processing failure', {
          correlationId,
          error: failure.reason?.message ?? 'Unknown error',
        });
      }
    }
  }

  logger.info('Async processing complete', {
    correlationId,
    processed: event.Records.length - failures.length,
    failed: failures.length,
  });
}

async function processRecord(record: SQSRecord, correlationId: string): Promise<void> {
  try {
    const body = JSON.parse(record.body);
    const parsed = sqsMessageSchema.parse(body);

    logger.info('Processing async message', {
      correlationId,
      conversationId: parsed.conversationId,
      messageId: parsed.messageId,
      userId: parsed.userId,
    });

    await chatService.processAsyncResponse(
      parsed.conversationId,
      parsed.messageId,
      parsed.userId,
    );

    logger.info('Async message processed successfully', {
      correlationId,
      conversationId: parsed.conversationId,
      messageId: parsed.messageId,
    });
  } catch (error: any) {
    logger.error('Failed to process SQS record', {
      correlationId,
      messageId: record.messageId,
      error: error.message,
      body: record.body,
    });
    throw error;
  }
}
