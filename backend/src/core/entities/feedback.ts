export type FeedbackRating = 1 | 2 | 3 | 4 | 5;
export type FeedbackCategory = 'accuracy' | 'relevance' | 'helpfulness' | 'clarity' | 'other';

export interface Feedback {
  feedbackId: string;
  userId: string;
  messageId: string;
  conversationId?: string;
  rating: FeedbackRating;
  category?: FeedbackCategory;
  comment?: string;
  isResolved: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  feedbackId?: string;
  userId: string;
  messageId: string;
  conversationId?: string;
  rating: FeedbackRating;
  category?: FeedbackCategory;
  comment?: string;
  metadata?: Record<string, unknown>;
}
