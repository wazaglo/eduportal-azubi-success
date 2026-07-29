export type MessageSender = 'user' | 'ai' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'processing' | 'failed';

export interface Message {
  messageId: string;
  conversationId: string;
  userId: string;
  sender: MessageSender;
  content: string;
  status: MessageStatus;
  queryType?: 'academic' | 'administrative' | 'general';
  metadata?: {
    modelUsed?: string;
    latencyMs?: number;
    tokensUsed?: number;
    cached?: boolean;
    confidence?: number;
    guardrailTriggered?: boolean;
  };
  createdAt: string;
}

export interface CreateMessageInput {
  messageId?: string;
  conversationId: string;
  userId: string;
  sender: MessageSender;
  content: string;
  status?: MessageStatus;
  queryType?: Message['queryType'];
  metadata?: Message['metadata'];
}
