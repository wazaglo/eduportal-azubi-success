import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { AnalyticsRepository } from '../../core/ports/analytics-repository';
import { AnalyticsEvent, CreateAnalyticsEventInput, AnalyticsEventType } from '../../core/entities/analytics-event';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';

export class DynamoAnalyticsRepository implements AnalyticsRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.ANALYTICS;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateAnalyticsEventInput): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = {
      eventId: '',
      eventType: input.eventType,
      userId: input.userId,
      sessionId: input.sessionId,
      correlationId: input.correlationId,
      properties: input.properties,
      timestamp: new Date().toISOString(),
    };

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: event,
    }));

    return event;
  }

  async findByEventType(eventType: AnalyticsEventType, startDate: string, endDate: string): Promise<AnalyticsEvent[]> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'EventTypeIndex',
      KeyConditionExpression: 'eventType = :eventType AND #timestamp BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: {
        ':eventType': eventType,
        ':start': startDate,
        ':end': endDate,
      },
    }));

    return (result.Items as AnalyticsEvent[]) ?? [];
  }

  async findByUser(userId: string, limit: number, nextToken?: string): Promise<{ events: AnalyticsEvent[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      IndexName: 'UserEventsIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Limit: limit,
      ScanIndexForward: false,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const result = await this.db.send(new QueryCommand(params));
    const newNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      events: (result.Items as AnalyticsEvent[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async getEventCountByType(startDate: string, endDate: string): Promise<Record<string, number>> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#timestamp BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: {
        ':start': startDate,
        ':end': endDate,
      },
    }));

    const events = (result.Items as AnalyticsEvent[]) ?? [];
    const counts: Record<string, number> = {};

    for (const event of events) {
      counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
    }

    return counts;
  }

  async getDailyActiveUsers(startDate: string, endDate: string): Promise<number> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#timestamp BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: {
        ':start': startDate,
        ':end': endDate,
      },
      ProjectionExpression: 'userId',
    }));

    const userIds = new Set((result.Items as AnalyticsEvent[] ?? []).map((e) => e.userId).filter(Boolean));
    return userIds.size;
  }

  async getAverageResponseTime(startDate: string, endDate: string): Promise<number> {
    const events = await this.findByEventType('ai_response', startDate, endDate);
    if (events.length === 0) return 0;

    const latencies = events
      .map((e) => e.properties?.latencyMs as number | undefined)
      .filter((l): l is number => l !== undefined);

    if (latencies.length === 0) return 0;

    return latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  }
}
