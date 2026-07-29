import { AnalyticsEvent, CreateAnalyticsEventInput, AnalyticsEventType } from '../entities/analytics-event';

export interface AnalyticsRepository {
  create(input: CreateAnalyticsEventInput): Promise<AnalyticsEvent>;
  findByEventType(eventType: AnalyticsEventType, startDate: string, endDate: string): Promise<AnalyticsEvent[]>;
  findByUser(userId: string, limit: number, nextToken?: string): Promise<{ events: AnalyticsEvent[]; nextToken?: string }>;
  getEventCountByType(startDate: string, endDate: string): Promise<Record<string, number>>;
  getDailyActiveUsers(startDate: string, endDate: string): Promise<number>;
  getAverageResponseTime(startDate: string, endDate: string): Promise<number>;
}
