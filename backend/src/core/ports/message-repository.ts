import { Message, CreateMessageInput } from '../entities/message';

export interface MessageRepository {
  create(input: CreateMessageInput): Promise<Message>;
  findById(messageId: string): Promise<Message | null>;
  findByConversation(conversationId: string, limit: number, nextToken?: string): Promise<{ messages: Message[]; nextToken?: string }>;
  deleteByConversation(conversationId: string): Promise<void>;
  countByConversation(conversationId: string): Promise<number>;
  countToday(): Promise<number>;
  countByStatus(status: string): Promise<number>;
}
