import { CachedResponse, CreateCachedResponseInput } from '../entities/cached-response';

export interface CacheRepository {
  create(input: CreateCachedResponseInput): Promise<CachedResponse>;
  findByQueryHash(similarityHash: string): Promise<CachedResponse | null>;
  findSimilar(queryType: string, limit?: number): Promise<CachedResponse[]>;
  incrementHitCount(cacheId: string): Promise<void>;
  deleteExpired(): Promise<number>;
  findById(cacheId: string): Promise<CachedResponse | null>;
  count(): Promise<number>;
}
