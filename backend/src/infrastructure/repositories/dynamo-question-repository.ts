import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { QuestionRepository } from '../../core/ports/question-repository';
import { Question, CreateQuestionInput } from '../../core/entities/question';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';
import { logger } from '../../utils/logger';

export class DynamoQuestionRepository implements QuestionRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.QUESTIONS;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateQuestionInput): Promise<Question> {
    const now = new Date().toISOString();
    const question: Question = {
      questionId: input.questionId || '',
      userId: input.userId,
      question: input.question,
      normalizedQuestion: input.normalizedQuestion || input.question,
      response: input.response,
      subject: input.subject,
      source: input.source,
      status: input.status ?? 'answered',
      documentTitle: input.documentTitle,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: question,
    }));

    logger.info('Question stored', { questionId: question.questionId, userId: question.userId });
    return question;
  }

  async findById(questionId: string): Promise<Question | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { questionId },
    }));

    return (result.Item as Question) ?? null;
  }

  async findByUser(userId: string, limit: number, nextToken?: string): Promise<{ questions: Question[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      IndexName: 'UserQuestionsIndex',
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
      questions: (result.Items as Question[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async findAll(limit: number): Promise<Question[]> {
    const params: any = {
      TableName: this.tableName,
      Limit: limit,
    };

    const result = await this.db.send(new ScanCommand(params));
    return (result.Items as Question[]) ?? [];
  }

  async count(): Promise<number> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      Select: 'COUNT',
    }));
    return result.Count ?? 0;
  }

  async delete(questionId: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { questionId },
    }));
  }
}
