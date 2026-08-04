import { v4 as uuidv4 } from 'uuid';
import { AnalyticsRepository } from '../core/ports/analytics-repository';
import { AnalyticsEvent, CreateAnalyticsEventInput, AnalyticsEventType } from '../core/entities/analytics-event';
import { logger } from '../utils/logger';

interface AnalyticsReport {
  period: { start: string; end: string };
  totalEvents: number;
  eventBreakdown: Record<string, number>;
  dailyActiveUsers: number;
  averageResponseTime: number;
  totalConversations: number;
  totalMessages: number;
  cacheHitRate?: number;
  modelUsage?: Record<string, number>;
  feedbackStats?: {
    averageRating: number;
    totalFeedback: number;
    ratingDistribution: Record<number, number>;
  };
}

export class AnalyticsService {
  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
  ) {}

  async trackEvent(input: CreateAnalyticsEventInput): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = {
      eventId: uuidv4(),
      eventType: input.eventType,
      userId: input.userId,
      sessionId: input.sessionId,
      correlationId: input.correlationId,
      properties: input.properties,
      timestamp: new Date().toISOString(),
    };

    const created = await this.analyticsRepo.create(event);
    logger.debug('Analytics event tracked', { eventType: input.eventType, userId: input.userId });
    return created;
  }

  async getEventCountByType(startDate: string, endDate: string): Promise<Record<string, number>> {
    return this.analyticsRepo.getEventCountByType(startDate, endDate);
  }

  async getDailyActiveUsers(startDate: string, endDate: string): Promise<number> {
    return this.analyticsRepo.getDailyActiveUsers(startDate, endDate);
  }

  async getAverageResponseTime(startDate: string, endDate: string): Promise<number> {
    return this.analyticsRepo.getAverageResponseTime(startDate, endDate);
  }

  async getModelUsage(startDate: string, endDate: string): Promise<Record<string, number>> {
    const events = await this.analyticsRepo.findByEventType('ai_response', startDate, endDate);
    const usage: Record<string, number> = {};
    for (const event of events) {
      const model = (event.properties?.model as string) ?? 'unknown';
      usage[model] = (usage[model] ?? 0) + 1;
    }
    return usage;
  }

  async generateReport(startDate: string, endDate: string): Promise<AnalyticsReport> {
    const [eventBreakdown, dailyActiveUsers, avgResponseTime, modelUsage] = await Promise.all([
      this.getEventCountByType(startDate, endDate),
      this.getDailyActiveUsers(startDate, endDate),
      this.getAverageResponseTime(startDate, endDate),
      this.getModelUsage(startDate, endDate),
    ]);

    const totalEvents = Object.values(eventBreakdown).reduce((sum, count) => sum + count, 0);

    return {
      period: { start: startDate, end: endDate },
      totalEvents,
      eventBreakdown,
      dailyActiveUsers,
      averageResponseTime: avgResponseTime,
      totalConversations: eventBreakdown['conversation_created'] ?? 0,
      totalMessages: (eventBreakdown['message_sent'] ?? 0) + (eventBreakdown['ai_response'] ?? 0),
      cacheHitRate: this.calculateCacheHitRate(eventBreakdown),
      modelUsage,
    };
  }

  private calculateCacheHitRate(eventBreakdown: Record<string, number>): number {
    const hits = eventBreakdown['cache_hit'] ?? 0;
    const misses = eventBreakdown['cache_miss'] ?? 0;
    const total = hits + misses;
    return total === 0 ? 0 : hits / total;
  }
}
