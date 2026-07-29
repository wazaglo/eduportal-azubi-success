import { v4 as uuidv4 } from 'uuid';
import { FeedbackRepository } from '../core/ports/feedback-repository';
import { AnalyticsRepository } from '../core/ports/analytics-repository';
import { Feedback, CreateFeedbackInput } from '../core/entities/feedback';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export class FeedbackService {
  constructor(
    private readonly feedbackRepo: FeedbackRepository,
    private readonly analyticsRepo: AnalyticsRepository,
  ) {}

  async submitFeedback(input: CreateFeedbackInput): Promise<Feedback> {
    const feedback: Feedback = {
      feedbackId: uuidv4(),
      userId: input.userId,
      messageId: input.messageId,
      conversationId: input.conversationId,
      rating: input.rating,
      category: input.category,
      comment: input.comment,
      isResolved: false,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await this.feedbackRepo.create(feedback);

    await this.analyticsRepo.create({
      eventType: 'feedback_submitted',
      userId: input.userId,
      properties: {
        feedbackId: created.feedbackId,
        rating: input.rating,
        category: input.category,
      },
    });

    logger.info('Feedback submitted', {
      feedbackId: created.feedbackId,
      userId: input.userId,
      rating: input.rating,
    });

    return created;
  }

  async getFeedback(feedbackId: string): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findById(feedbackId);
    if (!feedback) {
      throw new NotFoundError('Feedback', feedbackId);
    }
    return feedback;
  }

  async getUserFeedback(userId: string, limit: number, nextToken?: string): Promise<{ feedback: Feedback[]; nextToken?: string }> {
    return this.feedbackRepo.findByUser(userId, limit, nextToken);
  }

  async getFeedbackForMessage(messageId: string): Promise<Feedback | null> {
    return this.feedbackRepo.findByMessage(messageId);
  }

  async resolveFeedback(feedbackId: string): Promise<Feedback> {
    const existing = await this.getFeedback(feedbackId);
    return this.feedbackRepo.update(feedbackId, { isResolved: true });
  }

  async getAverageRating(userId?: string): Promise<number> {
    return this.feedbackRepo.getAverageRating(userId);
  }

  async getRatingDistribution(): Promise<Record<number, number>> {
    return this.feedbackRepo.getRatingDistribution();
  }
}
