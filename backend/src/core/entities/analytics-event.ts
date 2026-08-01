export type AnalyticsEventType =
  | 'user_registered'
  | 'user_login'
  | 'message_sent'
  | 'ai_response'
  | 'feedback_submitted'
  | 'cache_hit'
  | 'cache_miss'
  | 'conversation_created'
  | 'conversation_resolved'
  | 'question_asked'
  | 'error_occurred'
  | 'search_performed'
  | 'guardrail_triggered'
  | 'model_switched';

export interface AnalyticsEvent {
  eventId: string;
  eventType: AnalyticsEventType;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

export interface CreateAnalyticsEventInput {
  eventId?: string;
  eventType: AnalyticsEventType;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  properties?: Record<string, unknown>;
}
