import { Conversation, CreateConversationInput, UpdateConversationInput } from '../entities/conversation';

export interface ConversationRepository {
  create(input: CreateConversationInput): Promise<Conversation>;
  findById(conversationId: string): Promise<Conversation | null>;
  findByUser(userId: string, limit: number, nextToken?: string): Promise<{ conversations: Conversation[]; nextToken?: string }>;
  update(conversationId: string, input: UpdateConversationInput): Promise<Conversation>;
  delete(conversationId: string): Promise<void>;
  findByStatus(status: string, limit: number, nextToken?: string): Promise<{ conversations: Conversation[]; nextToken?: string }>;
  countByUser(userId: string): Promise<number>;
  countByStatus(): Promise<Record<string, number>>;
}
