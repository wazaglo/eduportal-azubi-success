import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { CacheRepository } from '../../core/ports/cache-repository';
import { CachedResponse, CreateCachedResponseInput } from '../../core/entities/cached-response';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';

export class DynamoCacheRepository implements CacheRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.CACHE;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateCachedResponseInput): Promise<CachedResponse> {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (input.ttlMs ?? 86400000)).toISOString();

    const entry: CachedResponse = {
      cacheId: uuidv4(),
      query: input.query,
      queryEmbedding: input.queryEmbedding,
      response: input.response,
      queryType: input.queryType,
      modelUsed: input.modelUsed,
      tokensUsed: input.tokensUsed,
      hitCount: 0,
      similarityHash: input.similarityHash,
      source: input.source,
      metadata: input.metadata,
      createdAt: now,
      expiresAt,
      lastAccessedAt: now,
    };

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: entry,
    }));

    return entry;
  }

  async findByQueryHash(similarityHash: string): Promise<CachedResponse | null> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'HashIndex',
      KeyConditionExpression: 'similarityHash = :hash',
      ExpressionAttributeValues: { ':hash': similarityHash },
      Limit: 1,
    }));

    return (result.Items?.[0] as CachedResponse) ?? null;
  }

  async findSimilar(queryType: string, limit?: number): Promise<CachedResponse[]> {
    const result = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'QueryTypeIndex',
      KeyConditionExpression: 'queryType = :queryType',
      ExpressionAttributeValues: { ':queryType': queryType },
      Limit: limit ?? 20,
    }));

    return (result.Items as CachedResponse[]) ?? [];
  }

  async incrementHitCount(cacheId: string): Promise<void> {
    await this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { cacheId },
      UpdateExpression: 'ADD hitCount :inc SET lastAccessedAt = :now',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':now': new Date().toISOString(),
      },
    }));
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'expiresAt < :now',
      ExpressionAttributeValues: { ':now': new Date().toISOString() },
      ProjectionExpression: 'cacheId',
    }));

    const expired = result.Items ?? [];
    if (expired.length === 0) return 0;

    const deletePromises = expired.map((item) =>
      this.db.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { cacheId: item.cacheId },
      }))
    );

    await Promise.all(deletePromises);
    return expired.length;
  }

  async findById(cacheId: string): Promise<CachedResponse | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { cacheId },
    }));

    return (result.Item as CachedResponse) ?? null;
  }

  async count(): Promise<number> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      Select: 'COUNT',
    }));

    return result.Count ?? 0;
  }
}
