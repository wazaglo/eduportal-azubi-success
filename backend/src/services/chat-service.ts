import { v4 as uuidv4 } from 'uuid';
import { AIProvider, AIResponse } from '../core/ports/ai-provider';
import { ConversationRepository } from '../core/ports/conversation-repository';
import { MessageRepository } from '../core/ports/message-repository';
import { AnalyticsRepository } from '../core/ports/analytics-repository';
import { CacheService } from './cache-service';
import { KnowledgeService } from './knowledge-service';
import { ConversationService } from './conversation-service';
import { Message, CreateMessageInput } from '../core/entities/message';
import { Conversation } from '../core/entities/conversation';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { QUERY_TYPES, AI_MODELS } from '../utils/constants';
import { academicQueryPrompt } from '../prompts/academic-query';
import { administrativeQueryPrompt } from '../prompts/administrative-query';
import { conversationSummaryPrompt } from '../prompts/conversation-summary';

interface SendMessageInput {
  userId: string;
  conversationId?: string;
  content: string;
  queryType?: 'academic' | 'administrative' | 'general';
  requireAsync?: boolean;
}

interface SendMessageResult {
  userMessage: Message;
  aiMessage?: Message;
  conversation: Conversation;
  cached: boolean;
  processingTimeMs: number;
}

export class ChatService {
  constructor(
    private readonly aiProvider: AIProvider,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly analyticsRepo: AnalyticsRepository,
    private readonly cacheService: CacheService,
    private readonly knowledgeService: KnowledgeService,
    private readonly conversationService: ConversationService,
    private readonly asyncQueueUrl?: string,
  ) {}

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const startTime = Date.now();
    let conversation: Conversation;

    if (input.conversationId) {
      conversation = await this.conversationService.getConversation(input.conversationId, input.userId);
    } else {
      const classified = input.queryType ?? await this.classifyQuery(input.content);
      conversation = await this.conversationService.createConversation({
        userId: input.userId,
        title: input.content.substring(0, 100),
        queryType: classified,
      });
    }

    const userMessage = await this.messageRepo.create({
      conversationId: conversation.conversationId,
      userId: input.userId,
      sender: 'user',
      content: input.content,
      status: 'sent',
      queryType: conversation.queryType,
    });

    await this.analyticsRepo.create({
      eventType: 'message_sent',
      userId: input.userId,
      properties: {
        messageId: userMessage.messageId,
        conversationId: conversation.conversationId,
        queryType: conversation.queryType,
      },
    });

    if (input.requireAsync) {
      await this.enqueueAsyncProcessing(conversation.conversationId, userMessage.messageId, input.userId);
      await this.conversationRepo.update(conversation.conversationId, {
        messageCount: (conversation.messageCount ?? 0) + 1,
        lastMessageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        userMessage,
        conversation,
        cached: false,
        processingTimeMs: Date.now() - startTime,
      };
    }

    const knowledgeContext = await this.knowledgeService.prepareContext(
      input.content,
      conversation.queryType,
    );

    const cachedResponse = await this.cacheService.findCachedResponse(
      input.content,
      conversation.queryType ?? 'general',
    );

    let aiResponse: AIResponse;
    let cached = false;

    if (cachedResponse) {
      aiResponse = {
        content: cachedResponse.response,
        modelUsed: cachedResponse.modelUsed,
        tokensUsed: cachedResponse.tokensUsed,
        latencyMs: 0,
        guardrailTriggered: false,
        confidence: 1,
        finishReason: 'cached',
      };
      cached = true;

      await this.analyticsRepo.create({
        eventType: 'cache_hit',
        userId: input.userId,
        properties: { cacheId: cachedResponse.cacheId, queryType: conversation.queryType },
      });
    } else {
      const systemPrompt = this.getSystemPrompt(conversation.queryType, knowledgeContext);

      aiResponse = await this.aiProvider.generateResponse({
        prompt: input.content,
        systemPrompt,
        conversationHistory: await this.getConversationHistory(conversation.conversationId),
        requireReasoning: conversation.queryType === 'academic',
        guardrails: {
          contentPolicy: true,
          topicPolicy: true,
          wordPolicy: true,
        },
      });

      await this.cacheService.storeCachedResponse({
        query: input.content,
        response: aiResponse.content,
        queryType: conversation.queryType ?? 'general',
        modelUsed: aiResponse.modelUsed,
        tokensUsed: aiResponse.tokensUsed,
        similarityHash: '',
      });

      await this.analyticsRepo.create({
        eventType: 'cache_miss',
        userId: input.userId,
        properties: { queryType: conversation.queryType },
      });

      if (aiResponse.guardrailTriggered) {
        await this.analyticsRepo.create({
          eventType: 'guardrail_triggered',
          userId: input.userId,
          properties: { modelUsed: aiResponse.modelUsed },
        });
      }
    }

    const aiMessage = await this.messageRepo.create({
      conversationId: conversation.conversationId,
      userId: input.userId,
      sender: 'ai',
      content: aiResponse.content,
      status: 'delivered',
      queryType: conversation.queryType,
      metadata: {
        modelUsed: aiResponse.modelUsed,
        latencyMs: aiResponse.latencyMs,
        tokensUsed: aiResponse.tokensUsed,
        cached,
        confidence: aiResponse.confidence,
        guardrailTriggered: aiResponse.guardrailTriggered,
      },
    });

    await this.analyticsRepo.create({
      eventType: 'ai_response',
      userId: input.userId,
      properties: {
        messageId: aiMessage.messageId,
        modelUsed: aiResponse.modelUsed,
        latencyMs: aiResponse.latencyMs,
        cached,
        tokensUsed: aiResponse.tokensUsed,
      },
    });

    const newMessageCount = (conversation.messageCount ?? 0) + 1;
    await this.conversationRepo.update(conversation.conversationId, {
      messageCount: newMessageCount,
      lastMessageAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (conversation.queryType !== input.queryType && input.queryType) {
      await this.conversationRepo.update(conversation.conversationId, {
        queryType: input.queryType,
      });
    }

    if (newMessageCount % 5 === 0) {
      this.generateAndStoreSummary(conversation.conversationId).catch((err) =>
        logger.error('Failed to generate summary', { error: (err as Error).message, conversationId: conversation.conversationId })
      );
    }

    logger.info('Message processed', {
      conversationId: conversation.conversationId,
      cached,
      modelUsed: aiResponse.modelUsed,
      tokensUsed: aiResponse.tokensUsed,
      latencyMs: aiResponse.latencyMs,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      userMessage,
      aiMessage,
      conversation: {
        ...conversation,
        messageCount: newMessageCount,
        lastMessageAt: new Date().toISOString(),
      },
      cached,
      processingTimeMs: Date.now() - startTime,
    };
  }

  private getSystemPrompt(queryType?: string, knowledgeContext?: string): string {
    let basePrompt: string;

    switch (queryType) {
      case QUERY_TYPES.ACADEMIC:
        basePrompt = academicQueryPrompt;
        break;
      case QUERY_TYPES.ADMINISTRATIVE:
        basePrompt = administrativeQueryPrompt;
        break;
      default:
        basePrompt = `You are a helpful student support assistant. Provide accurate, concise answers. If you don't know something, say so. Be friendly and professional.`;
    }

    if (knowledgeContext) {
      basePrompt += `\n\nRelevant institutional knowledge:\n${knowledgeContext}\n\nUse this information to provide accurate answers about the institution. If the knowledge conflicts with your training, defer to the institutional knowledge.`;
    }

    return basePrompt;
  }

  private async classifyQuery(query: string): Promise<'academic' | 'administrative' | 'general'> {
    try {
      const result = await this.aiProvider.classifyQuery({
        query,
        categories: ['academic', 'administrative', 'general'],
      });
      return result.category as 'academic' | 'administrative' | 'general';
    } catch {
      return 'general';
    }
  }

  private async getConversationHistory(conversationId: string): Promise<{ role: 'user' | 'assistant' | 'system'; content: string }[]> {
    const result = await this.messageRepo.findByConversation(conversationId, 10);
    return result.messages
      .filter((m) => m.sender === 'user' || m.sender === 'ai')
      .map((m) => ({
        role: m.sender === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }))
      .slice(-10);
  }

  private async generateAndStoreSummary(conversationId: string): Promise<void> {
    const result = await this.messageRepo.findByConversation(conversationId, 50);
    const text = result.messages.map((m) => `${m.sender}: ${m.content}`).join('\n');

    const summaryResponse = await this.aiProvider.generateSummary({
      text,
      maxLength: 200,
    });

    await this.conversationRepo.update(conversationId, {
      summary: summaryResponse.content,
    });
  }

  private async enqueueAsyncProcessing(conversationId: string, messageId: string, userId: string): Promise<void> {
    if (!this.asyncQueueUrl) {
      logger.warn('No async queue URL configured, processing synchronously');
      return;
    }

    try {
      const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
      const client = new SQSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

      await client.send(new SendMessageCommand({
        QueueUrl: this.asyncQueueUrl,
        MessageBody: JSON.stringify({
          conversationId,
          messageId,
          userId,
          timestamp: new Date().toISOString(),
        }),
        MessageGroupId: conversationId,
        MessageDeduplicationId: `${conversationId}-${messageId}`,
      }));

      logger.info('Async processing enqueued', { conversationId, messageId });
    } catch (error: any) {
      logger.error('Failed to enqueue async processing', { error: error.message, conversationId });
    }
  }

  async processAsyncResponse(conversationId: string, messageId: string, userId: string): Promise<void> {
    const conversation = await this.conversationService.getConversation(conversationId, userId);

    const userMessage = await this.messageRepo.findById(messageId);
    if (!userMessage) {
      throw new NotFoundError('Message', messageId);
    }

    const knowledgeContext = await this.knowledgeService.prepareContext(
      userMessage.content,
      conversation.queryType,
    );

    const systemPrompt = this.getSystemPrompt(conversation.queryType, knowledgeContext);

    const aiResponse = await this.aiProvider.generateResponse({
      prompt: userMessage.content,
      systemPrompt,
      conversationHistory: await this.getConversationHistory(conversationId),
      requireReasoning: conversation.queryType === 'academic',
    });

    await this.messageRepo.create({
      conversationId,
      userId,
      sender: 'ai',
      content: aiResponse.content,
      status: 'delivered',
      queryType: conversation.queryType,
      metadata: {
        modelUsed: aiResponse.modelUsed,
        latencyMs: aiResponse.latencyMs,
        tokensUsed: aiResponse.tokensUsed,
        cached: false,
        confidence: aiResponse.confidence,
        guardrailTriggered: aiResponse.guardrailTriggered,
      },
    });

    await this.conversationRepo.update(conversationId, {
      messageCount: (conversation.messageCount ?? 0) + 1,
      lastMessageAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
