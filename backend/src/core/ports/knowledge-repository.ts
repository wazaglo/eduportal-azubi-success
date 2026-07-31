import { CreateKnowledgeDocumentInput, KnowledgeDocument } from '../entities/knowledge-document';

export interface KnowledgeRepository {
  create(input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocument>;
  findById(documentId: string): Promise<KnowledgeDocument | null>;
  findByKey(s3Key: string): Promise<KnowledgeDocument | null>;
  list(filters: KnowledgeListFilters): Promise<KnowledgeDocument[]>;
  delete(documentId: string): Promise<void>;
  incrementDownloads(documentId: string): Promise<void>;
}

export interface KnowledgeListFilters {
  year?: string;
  subject?: string;
  strand?: string;
  substrand?: string;
  limit?: number;
  nextToken?: string;
}
