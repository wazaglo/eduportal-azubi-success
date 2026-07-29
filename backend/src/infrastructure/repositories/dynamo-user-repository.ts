import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { UserRepository } from '../../core/ports/user-repository';
import { User, CreateUserInput, UpdateUserInput } from '../../core/entities/user';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';
import { logger } from '../../utils/logger';

export class DynamoUserRepository implements UserRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.USERS;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      userId: input.cognitoSub,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      organizationId: input.organizationId,
      department: input.department,
      enrollmentYear: input.enrollmentYear,
      courseOfStudy: input.courseOfStudy,
      isEmailVerified: false,
      isActive: false,
      cognitoSub: input.cognitoSub,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)',
    }));

    logger.info('User created in DynamoDB', { userId: user.userId, email: user.email });
    return user;
  }

  async findById(userId: string): Promise<User | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { userId },
    }));

    return (result.Item as User) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }));

    return (result.Items?.[0] as User) ?? null;
  }

  async findByCognitoSub(cognitoSub: string): Promise<User | null> {
    return this.findById(cognitoSub);
  }

  async update(userId: string, input: UpdateUserInput): Promise<User> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    if (input.fullName !== undefined) {
      updateExpression.push('#fullName = :fullName');
      expressionAttributeNames['#fullName'] = 'fullName';
      expressionAttributeValues[':fullName'] = input.fullName;
    }
    if (input.department !== undefined) {
      updateExpression.push('#department = :department');
      expressionAttributeNames['#department'] = 'department';
      expressionAttributeValues[':department'] = input.department;
    }
    if (input.enrollmentYear !== undefined) {
      updateExpression.push('#enrollmentYear = :enrollmentYear');
      expressionAttributeNames['#enrollmentYear'] = 'enrollmentYear';
      expressionAttributeValues[':enrollmentYear'] = input.enrollmentYear;
    }
    if (input.courseOfStudy !== undefined) {
      updateExpression.push('#courseOfStudy = :courseOfStudy');
      expressionAttributeNames['#courseOfStudy'] = 'courseOfStudy';
      expressionAttributeValues[':courseOfStudy'] = input.courseOfStudy;
    }
    if (input.preferences !== undefined) {
      updateExpression.push('#preferences = :preferences');
      expressionAttributeNames['#preferences'] = 'preferences';
      expressionAttributeValues[':preferences'] = input.preferences;
    }
    if (input.isActive !== undefined) {
      updateExpression.push('#isActive = :isActive');
      expressionAttributeNames['#isActive'] = 'isActive';
      expressionAttributeValues[':isActive'] = input.isActive;
    }

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const result = await this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as User;
  }

  async delete(userId: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { userId },
    }));
  }

  async list(limit: number, nextToken?: string): Promise<{ users: User[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      Limit: limit,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const result = await this.db.send(new ScanCommand(params));
    const newNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      users: (result.Items as User[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async listByRole(role: string, limit: number, nextToken?: string): Promise<{ users: User[]; nextToken?: string }> {
    const params: any = {
      TableName: this.tableName,
      IndexName: 'RoleIndex',
      KeyConditionExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': role },
      Limit: limit,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const result = await this.db.send(new QueryCommand(params));
    const newNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      users: (result.Items as User[]) ?? [],
      nextToken: newNextToken,
    };
  }

  async countByRole(role: string): Promise<number> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'RoleIndex',
      KeyConditionExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': role },
      Select: 'COUNT',
    }));

    return result.Count ?? 0;
  }

  async countActive(): Promise<number> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#isActive = :isActive',
      ExpressionAttributeNames: { '#isActive': 'isActive' },
      ExpressionAttributeValues: { ':isActive': true },
      Select: 'COUNT',
    }));

    return result.Count ?? 0;
  }
}
