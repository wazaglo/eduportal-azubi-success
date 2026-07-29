import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { FeedbackRepository } from '../../core/ports/feedback-repository';
import { Feedback, CreateFeedbackInput } from '../../core/entities/feedback';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';

export class DynamoFeedbackRepository implements FeedbackRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.FEEDBACK;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateFeedbackInput): Promise<Feedback> {
    const feedback: Feedback = {
      feedbackId: input.feedbackId ?? '',
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

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: feedback,
    }));

    return feedback;
  }

  async findById(feedbackId: string): Promise<Feedback | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { feedbackId },
    }));

    return (result.Item as Feedback) ?? null;
  }

  async findByUser(userId: string, limit: number, nextToken?: string): Promise<{ feedback: Feedback[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      IndexName: 'UserFeedbackIndex',
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
      feedback: (result.Items as Feedback[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async findByMessage(messageId: string): Promise<Feedback | null> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'MessageFeedbackIndex',
      KeyConditionExpression: 'messageId = :messageId',
      ExpressionAttributeValues: { ':messageId': messageId },
      Limit: 1,
    }));

    return (result.Items?.[0] as Feedback) ?? null;
  }

  async update(feedbackId: string, input: Partial<CreateFeedbackInput> & { isResolved?: boolean }): Promise<Feedback> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    if (input.rating !== undefined) {
      updateExpression.push('#rating = :rating');
      expressionAttributeNames['#rating'] = 'rating';
      expressionAttributeValues[':rating'] = input.rating;
    }
    if (input.category !== undefined) {
      updateExpression.push('#category = :category');
      expressionAttributeNames['#category'] = 'category';
      expressionAttributeValues[':category'] = input.category;
    }
    if (input.comment !== undefined) {
      updateExpression.push('#comment = :comment');
      expressionAttributeNames['#comment'] = 'comment';
      expressionAttributeValues[':comment'] = input.comment;
    }
    if (input.isResolved !== undefined) {
      updateExpression.push('#isResolved = :isResolved');
      expressionAttributeNames['#isResolved'] = 'isResolved';
      expressionAttributeValues[':isResolved'] = input.isResolved;
    }

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const result = await this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { feedbackId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as Feedback;
  }

  async delete(feedbackId: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { feedbackId },
    }));
  }

  async getAverageRating(userId?: string): Promise<number> {
    const params: any = {
      TableName: this.tableName,
      ...(userId
        ? {
            IndexName: 'UserFeedbackIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': userId },
          }
        : {}),
    };

    const result = await this.db.send(
      userId ? new QueryCommand(params) : new ScanCommand({ TableName: this.tableName })
    );

    const items = (result.Items as Feedback[]) ?? [];
    if (items.length === 0) return 0;

    const sum = items.reduce((acc, f) => acc + f.rating, 0);
    return sum / items.length;
  }

  async getRatingDistribution(): Promise<Record<number, number>> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      ProjectionExpression: 'rating',
    }));

    const items = (result.Items as Pick<Feedback, 'rating'>[]) ?? [];
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const item of items) {
      distribution[item.rating] = (distribution[item.rating] ?? 0) + 1;
    }

    return distribution;
  }
}
