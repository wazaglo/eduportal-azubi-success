export interface KnowledgeDocument {
  documentId: string;
  s3Key: string;
  fileName: string;
  year: string;
  subject: string;
  strand: string;
  substrand: string;
  size: number;
  contentType: string;
  status: 'indexed' | 'indexing' | 'failed';
  uploadedBy: string;
  uploadedAt: string;
  downloads: number;
}

export interface CreateKnowledgeDocumentInput {
  s3Key: string;
  fileName: string;
  year: string;
  subject: string;
  strand: string;
  substrand: string;
  size: number;
  contentType: string;
  status: KnowledgeDocument['status'];
  uploadedBy: string;
}
