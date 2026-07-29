import { logger } from '../utils/logger';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  relevance: number;
}

interface SearchInput {
  query: string;
  category?: string;
  maxResults?: number;
}

interface SearchResult {
  documents: KnowledgeDocument[];
  totalFound: number;
}

export class KnowledgeService {
  private readonly knowledgeBaseId: string;

  constructor() {
    this.knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID ?? '';
  }

  async search(input: SearchInput): Promise<SearchResult> {
    const { query, category, maxResults = 5 } = input;

    if (!this.knowledgeBaseId) {
      logger.warn('No knowledge base ID configured, returning empty results');
      return { documents: [], totalFound: 0 };
    }

    try {
      const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

      const documents = await this.retrieveDocuments(queryTerms, category);

      const ranked = documents
        .map((doc) => ({
          ...doc,
          relevance: this.calculateRelevance(queryTerms, doc),
        }))
        .filter((doc) => doc.relevance > 0.1)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, maxResults);

      logger.info('Knowledge search completed', {
        query,
        category,
        resultsFound: ranked.length,
      });

      return { documents: ranked, totalFound: ranked.length };
    } catch (error: any) {
      logger.error('Knowledge search failed', { error: error.message, query });
      return { documents: [], totalFound: 0 };
    }
  }

  async getDocumentById(id: string): Promise<KnowledgeDocument | null> {
    return null;
  }

  async prepareContext(query: string, category?: string): Promise<string> {
    const searchResult = await this.search({ query, category, maxResults: 3 });

    if (searchResult.documents.length === 0) {
      return '';
    }

    const context = searchResult.documents
      .map((doc) => `[Source: ${doc.title}]\n${doc.content.substring(0, 1000)}`)
      .join('\n\n---\n\n');

    return context;
  }

  private async retrieveDocuments(queryTerms: string[], category?: string): Promise<KnowledgeDocument[]> {
    return [];
  }

  private calculateRelevance(queryTerms: string[], document: KnowledgeDocument): number {
    const docText = `${document.title} ${document.content} ${document.tags.join(' ')}`.toLowerCase();
    let matchCount = 0;
    for (const term of queryTerms) {
      if (docText.includes(term)) {
        matchCount++;
      }
    }
    if (matchCount === 0) return 0;
    const tagBonus = document.tags.some(t => queryTerms.some(q => t.includes(q))) ? 0.1 : 0;
    return (matchCount / queryTerms.length) + tagBonus;
  }
}
