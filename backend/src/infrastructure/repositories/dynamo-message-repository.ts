import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { MessageRepository } from '../../core/ports/message-repository';
import { Message, CreateMessageInput } from '../../core/entities/message';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';

export class DynamoMessageRepository implements MessageRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.MESSAGES;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateMessageInput): Promise<Message> {
    const message: Message = {
      messageId: input.messageId ?? uuidv4(),
      conversationId: input.conversationId,
      userId: input.userId,
      sender: input.sender,
      content: input.content,
      status: input.status ?? 'sent',
      queryType: input.queryType,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    };

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: message,
    }));

    return message;
  }

  async findById(messageId: string): Promise<Message | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { messageId },
    }));

    return (result.Item as Message) ?? null;
  }

  async findByConversation(conversationId: string, limit: number, nextToken?: string): Promise<{ messages: Message[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      IndexName: 'ConversationMessagesIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: { ':conversationId': conversationId },
      Limit: limit,
      ScanIndexForward: true,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const result = await this.db.send(new QueryCommand(params));
    const newNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      messages: (result.Items as Message[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async deleteByConversation(conversationId: string): Promise<void> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'ConversationMessagesIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: { ':conversationId': conversationId },
      ProjectionExpression: 'messageId',
    }));

    const deletePromises = (result.Items ?? []).map((item) =>
      this.db.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { messageId: item.messageId },
      }))
    );

    await Promise.all(deletePromises);
  }

  async countByConversation(conversationId: string): Promise<number> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'ConversationMessagesIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: { ':conversationId': conversationId },
      Select: 'COUNT',
    }));

    return result.Count ?? 0;
  }

  async countToday(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'CreatedAtIndex',
      KeyConditionExpression: '#createdAt >= :today',
      ExpressionAttributeNames: { '#createdAt': 'createdAt' },
      ExpressionAttributeValues: { ':today': today },
      Select: 'COUNT',
    }));

    return result.Count ?? 0;
  }

  async countByStatus(status: string): Promise<number> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
      Select: 'COUNT',
    }));

    return result.Count ?? 0;
  }
}
