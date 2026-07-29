import { v4 as uuidv4 } from 'uuid';
import { ConversationRepository } from '../core/ports/conversation-repository';
import { MessageRepository } from '../core/ports/message-repository';
import { AnalyticsRepository } from '../core/ports/analytics-repository';
import { Conversation, CreateConversationInput, UpdateConversationInput } from '../core/entities/conversation';
import { Message } from '../core/entities/message';
import { NotFoundError, AuthorizationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ConversationService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly analyticsRepo: AnalyticsRepository,
  ) {}

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const conversation: Conversation = {
      conversationId: uuidv4(),
      userId: input.userId,
      title: input.title,
      status: 'active',
      queryType: input.queryType,
      messageCount: 0,
      tags: input.tags,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    };

    const created = await this.conversationRepo.create(conversation);

    await this.analyticsRepo.create({
      eventType: 'conversation_created',
      userId: input.userId,
      properties: { conversationId: created.conversationId, queryType: input.queryType },
    });

    logger.info('Conversation created', {
      conversationId: created.conversationId,
      userId: input.userId,
    });

    return created;
  }

  async getConversation(conversationId: string, userId?: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation', conversationId);
    }

    if (userId && conversation.userId !== userId) {
      throw new AuthorizationError('Access denied to this conversation');
    }

    return conversation;
  }

  async getUserConversations(
    userId: string,
    limit: number,
    nextToken?: string,
  ): Promise<{ conversations: Conversation[]; nextToken?: string }> {
    return this.conversationRepo.findByUser(userId, limit, nextToken);
  }

  async updateConversation(conversationId: string, input: UpdateConversationInput, userId?: string): Promise<Conversation> {
    const conversation = await this.getConversation(conversationId, userId);
    return this.conversationRepo.update(conversationId, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteConversation(conversationId: string, userId?: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);
    await this.messageRepo.deleteByConversation(conversationId);
    await this.conversationRepo.delete(conversationId);

    await this.analyticsRepo.create({
      eventType: 'conversation_resolved',
      userId: conversation.userId,
      properties: { conversationId },
    });

    logger.info('Conversation deleted', { conversationId, userId });
  }

  async getConversationMessages(
    conversationId: string,
    limit: number,
    nextToken?: string,
    userId?: string,
  ): Promise<{ messages: Message[]; nextToken?: string }> {
    await this.getConversation(conversationId, userId);
    return this.messageRepo.findByConversation(conversationId, limit, nextToken);
  }

  async resolveConversation(conversationId: string, userId?: string): Promise<Conversation> {
    const conversation = await this.getConversation(conversationId, userId);

    const updated = await this.conversationRepo.update(conversationId, {
      status: 'resolved',
      updatedAt: new Date().toISOString(),
    });

    await this.analyticsRepo.create({
      eventType: 'conversation_resolved',
      userId: conversation.userId,
      properties: { conversationId },
    });

    return updated;
  }
}
