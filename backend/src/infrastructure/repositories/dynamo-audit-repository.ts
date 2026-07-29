import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { AuditLog, CreateAuditLogInput } from '../../core/entities/audit-log';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';

export class DynamoAuditRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.AUDIT_LOG;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const log: AuditLog = {
      logId: uuidv4(),
      action: input.action,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actorRole: input.actorRole,
      targetId: input.targetId,
      targetType: input.targetType,
      changes: input.changes,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      correlationId: input.correlationId,
      status: input.status,
      failureReason: input.failureReason,
      timestamp: new Date().toISOString(),
    };

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: log,
    }));

    return log;
  }

  async findById(logId: string): Promise<AuditLog | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { logId },
    }));

    return (result.Item as AuditLog) ?? null;
  }

  async findByActor(actorId: string, limit: number, nextToken?: string): Promise<{ logs: AuditLog[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      IndexName: 'ActorIndex',
      KeyConditionExpression: 'actorId = :actorId',
      ExpressionAttributeValues: { ':actorId': actorId },
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
      logs: (result.Items as AuditLog[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async findByAction(action: string, limit: number): Promise<AuditLog[]> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'ActionIndex',
      KeyConditionExpression: 'action = :action',
      ExpressionAttributeValues: { ':action': action },
      Limit: limit,
      ScanIndexForward: false,
    }));

    return (result.Items as AuditLog[]) ?? [];
  }

  async findByDateRange(startDate: string, endDate: string, limit: number): Promise<AuditLog[]> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#timestamp BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: {
        ':start': startDate,
        ':end': endDate,
      },
      Limit: limit,
    }));

    return (result.Items as AuditLog[]) ?? [];
  }

  async countByAction(startDate: string, endDate: string): Promise<Record<string, number>> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#timestamp BETWEEN :start AND :end',
      ExpressionAttributeNames: { '#timestamp': 'timestamp' },
      ExpressionAttributeValues: {
        ':start': startDate,
        ':end': endDate,
      },
    }));

    const logs = (result.Items as AuditLog[]) ?? [];
    const counts: Record<string, number> = {};

    for (const log of logs) {
      counts[log.action] = (counts[log.action] ?? 0) + 1;
    }

    return counts;
  }
}
