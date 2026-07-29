export interface CachedResponse {
  cacheId: string;
  query: string;
  queryEmbedding?: number[];
  response: string;
  queryType: 'academic' | 'administrative' | 'general';
  modelUsed: string;
  tokensUsed: number;
  hitCount: number;
  similarityHash: string;
  source?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
  lastAccessedAt: string;
}

export interface CreateCachedResponseInput {
  query: string;
  queryEmbedding?: number[];
  response: string;
  queryType: CachedResponse['queryType'];
  modelUsed: string;
  tokensUsed: number;
  similarityHash: string;
  source?: string;
  metadata?: Record<string, unknown>;
  ttlMs?: number;
}
