import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { KnowledgeRepository, KnowledgeListFilters } from '../../core/ports/knowledge-repository';
import { CreateKnowledgeDocumentInput, KnowledgeDocument } from '../../core/entities/knowledge-document';
import { TABLE_NAMES } from '../../utils/constants';
import { getDynamoDbClient } from '../../utils/db';

export class DynamoKnowledgeRepository implements KnowledgeRepository {
  private readonly tableName: string;
  private readonly db: DynamoDBDocumentClient;

  constructor() {
    this.tableName = TABLE_NAMES.KNOWLEDGE;
    this.db = getDynamoDbClient();
  }

  async create(input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocument> {
    const document: KnowledgeDocument = {
      documentId: uuidv4(),
      s3Key: input.s3Key,
      fileName: input.fileName,
      year: input.year,
      subject: input.subject,
      strand: input.strand,
      substrand: input.substrand,
      size: input.size,
      contentType: input.contentType,
      status: input.status,
      uploadedBy: input.uploadedBy,
      uploadedAt: new Date().toISOString(),
      downloads: 0,
    };

    await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: document,
    }));

    return document;
  }

  async findById(documentId: string): Promise<KnowledgeDocument | null> {
    const result = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { documentId },
    }));

    return (result.Item as KnowledgeDocument) ?? null;
  }

  async findByKey(s3Key: string): Promise<KnowledgeDocument | null> {
    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 's3Key = :key',
      ExpressionAttributeValues: { ':key': s3Key },
      Limit: 1,
    }));

    return (result.Items?.[0] as KnowledgeDocument) ?? null;
  }

  async list(filters: KnowledgeListFilters = {}): Promise<KnowledgeDocument[]> {
    const limit = filters.limit ?? 1000;

    if (filters.subject) {
      const result = await this.db.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'SubjectIndex',
        KeyConditionExpression: 'subject = :subject',
        ExpressionAttributeValues: { ':subject': filters.subject },
        ScanIndexForward: false,
        Limit: limit,
      }));
      return (result.Items as KnowledgeDocument[]) ?? [];
    }

    if (filters.year) {
      const result = await this.db.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'YearIndex',
        KeyConditionExpression: 'year = :year',
        ExpressionAttributeValues: { ':year': filters.year },
        ScanIndexForward: false,
        Limit: limit,
      }));
      return (result.Items as KnowledgeDocument[]) ?? [];
    }

    const result = await this.db.send(new ScanCommand({
      TableName: this.tableName,
      Limit: limit,
    }));

    return (result.Items as KnowledgeDocument[]) ?? [];
  }

  async delete(documentId: string): Promise<void> {
    await this.db.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { documentId },
    }));
  }

  async incrementDownloads(documentId: string): Promise<void> {
    await this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { documentId },
      UpdateExpression: 'ADD downloads :inc',
      ExpressionAttributeValues: { ':inc': 1 },
    }));
  }
}
