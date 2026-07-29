export type ConversationStatus = 'active' | 'archived' | 'resolved';

export interface Conversation {
  conversationId: string;
  userId: string;
  title: string;
  status: ConversationStatus;
  queryType?: 'academic' | 'administrative' | 'general';
  summary?: string;
  messageCount: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface CreateConversationInput {
  conversationId?: string;
  userId: string;
  title: string;
  queryType?: Conversation['queryType'];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateConversationInput {
  title?: string;
  status?: ConversationStatus;
  summary?: string;
  messageCount?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  lastMessageAt?: string;
  updatedAt?: string;
  queryType?: Conversation['queryType'];
}
