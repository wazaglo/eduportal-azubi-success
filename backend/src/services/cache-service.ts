import { CacheRepository } from '../core/ports/cache-repository';
import { CachedResponse, CreateCachedResponseInput } from '../core/entities/cached-response';
import { CACHE_TTL_MS, SIMILARITY_THRESHOLD } from '../utils/constants';
import { logger } from '../utils/logger';

function createSimilarityHash(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function keywordSimilarity(queryA: string, queryB: string): number {
  const tokensA = tokenize(queryA);
  const tokensB = tokenize(queryB);
  return jaccardSimilarity(tokensA, tokensB);
}

export class CacheService {
  constructor(private readonly cacheRepo: CacheRepository) {}

  async findCachedResponse(query: string, queryType: string, queryEmbedding?: number[]): Promise<CachedResponse | null> {
    const hash = createSimilarityHash(query);

    const exactMatch = await this.cacheRepo.findByQueryHash(hash);
    if (exactMatch) {
      const expiresAt = new Date(exactMatch.expiresAt).getTime();
      if (expiresAt > Date.now()) {
        const kwSim = keywordSimilarity(query, exactMatch.query);
        if (kwSim >= SIMILARITY_THRESHOLD) {
          await this.cacheRepo.incrementHitCount(exactMatch.cacheId);
          logger.debug('Cache hit - exact hash match', {
            cacheId: exactMatch.cacheId,
            similarity: kwSim,
            queryType,
          });
          return exactMatch;
        }
      }
    }

    if (queryEmbedding && queryEmbedding.length > 0) {
      const similarEntries = await this.cacheRepo.findSimilar(queryType, 10);

      for (const entry of similarEntries) {
        if (!entry.queryEmbedding || entry.queryEmbedding.length === 0) continue;

        const expiresAt = new Date(entry.expiresAt).getTime();
        if (expiresAt <= Date.now()) continue;

        const embSim = cosineSimilarity(queryEmbedding, entry.queryEmbedding);
        const kwSim = keywordSimilarity(query, entry.query);
        const combinedSim = (embSim * 0.7) + (kwSim * 0.3);

        if (combinedSim >= SIMILARITY_THRESHOLD) {
          await this.cacheRepo.incrementHitCount(entry.cacheId);
          logger.debug('Cache hit - embedding similarity', {
            cacheId: entry.cacheId,
            similarity: combinedSim,
            queryType,
          });
          return entry;
        }
      }
    }

    logger.debug('Cache miss', { query, queryType });
    return null;
  }

  async storeCachedResponse(input: Omit<CreateCachedResponseInput, 'ttlMs'>): Promise<CachedResponse> {
    const hash = createSimilarityHash(input.query);

    const cacheEntry = await this.cacheRepo.create({
      ...input,
      similarityHash: hash,
      ttlMs: CACHE_TTL_MS,
    });

    logger.debug('Cached response stored', {
      cacheId: cacheEntry.cacheId,
      queryType: input.queryType,
      hash,
    });

    return cacheEntry;
  }

  async invalidateExpiredEntries(): Promise<number> {
    return this.cacheRepo.deleteExpired();
  }

  async getCacheStats(): Promise<{ totalEntries: number }> {
    const totalEntries = await this.cacheRepo.count();
    return { totalEntries };
  }
}
