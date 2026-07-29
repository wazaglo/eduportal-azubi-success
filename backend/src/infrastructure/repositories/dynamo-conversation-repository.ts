import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ConversationRepository } from '../../core/ports/conversation-repository';
import { Conversation, CreateConversationInput, UpdateConversationInput } from '../../core/entities/conversation';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';
import { logger } from '../../utils/logger';

export class DynamoConversationRepository implements ConversationRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.CONVERSATIONS;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateConversationInput): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      conversationId: input.conversationId || '',
      userId: input.userId,
      title: input.title,
      status: 'active',
      queryType: input.queryType,
      messageCount: 0,
      tags: input.tags,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
    };

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: conversation,
    }));

    return conversation;
  }

  async findById(conversationId: string): Promise<Conversation | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { conversationId },
    }));

    return (result.Item as Conversation) ?? null;
  }

  async findByUser(userId: string, limit: number, nextToken?: string): Promise<{ conversations: Conversation[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      IndexName: 'UserConversationsIndex',
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
      conversations: (result.Items as Conversation[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async update(conversationId: string, input: UpdateConversationInput): Promise<Conversation> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    if (input.title !== undefined) {
      updateExpression.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = input.title;
    }
    if (input.status !== undefined) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = input.status;
    }
    if (input.summary !== undefined) {
      updateExpression.push('#summary = :summary');
      expressionAttributeNames['#summary'] = 'summary';
      expressionAttributeValues[':summary'] = input.summary;
    }
    if (input.messageCount !== undefined) {
      updateExpression.push('#messageCount = :messageCount');
      expressionAttributeNames['#messageCount'] = 'messageCount';
      expressionAttributeValues[':messageCount'] = input.messageCount;
    }
    if (input.tags !== undefined) {
      updateExpression.push('#tags = :tags');
      expressionAttributeNames['#tags'] = 'tags';
      expressionAttributeValues[':tags'] = input.tags;
    }
    if (input.lastMessageAt !== undefined) {
      updateExpression.push('#lastMessageAt = :lastMessageAt');
      expressionAttributeNames['#lastMessageAt'] = 'lastMessageAt';
      expressionAttributeValues[':lastMessageAt'] = input.lastMessageAt;
    }
    if (input.updatedAt !== undefined) {
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = input.updatedAt;
    }
    if (input.metadata !== undefined) {
      updateExpression.push('#metadata = :metadata');
      expressionAttributeNames['#metadata'] = 'metadata';
      expressionAttributeValues[':metadata'] = input.metadata;
    }

    const result = await this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { conversationId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Conversation;
  }

  async delete(conversationId: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { conversationId },
    }));
  }

  async findByStatus(status: string, limit: number, nextToken?: string): Promise<{ conversations: Conversation[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
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
      conversations: (result.Items as Conversation[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async countByUser(userId: string): Promise<number> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'UserConversationsIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      Select: 'COUNT',
    }));

    return result.Count ?? 0;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const statuses = ['active', 'archived', 'resolved'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const result = await this.db.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
        Select: 'COUNT',
      }));
      counts[status] = result.Count ?? 0;
    }

    return counts;
  }
}
