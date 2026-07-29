import { Feedback, CreateFeedbackInput } from '../entities/feedback';

export interface FeedbackRepository {
  create(input: CreateFeedbackInput): Promise<Feedback>;
  findById(feedbackId: string): Promise<Feedback | null>;
  findByUser(userId: string, limit: number, nextToken?: string): Promise<{ feedback: Feedback[]; nextToken?: string }>;
  findByMessage(messageId: string): Promise<Feedback | null>;
  update(feedbackId: string, input: Partial<CreateFeedbackInput> & { isResolved?: boolean }): Promise<Feedback>;
  delete(feedbackId: string): Promise<void>;
  getAverageRating(userId?: string): Promise<number>;
  getRatingDistribution(): Promise<Record<number, number>>;
}
