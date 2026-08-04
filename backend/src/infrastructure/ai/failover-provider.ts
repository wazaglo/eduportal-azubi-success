import { AIProvider, AIResponse, GenerateResponseInput, GenerateSummaryInput, ClassifyQueryInput, ClassifyQueryOutput } from '../../core/ports/ai-provider';
import type { AnalyticsService } from '../../services/analytics-service';
import { logger } from '../../utils/logger';

export interface FailoverLink {
  name: string;
  provider: AIProvider;
}

const RETRYABLE_ERRORS = new Set<string>([
  'AccessDeniedException',
  'ThrottlingException',
  'ValidationException',
  'ModelNotReadyException',
  'ModelTimeoutException',
  'ResourceNotFoundException',
  'ServiceUnavailableException',
  'InternalServerException',
]);

function isRetryable(error: any): boolean {
  const name = error?.name;
  if (!name) return true;
  if (RETRYABLE_ERRORS.has(name)) return true;
  if (/timeout|timed ?out|EAI_AGAIN|ECONN/i.test(error?.message ?? '')) return true;
  return false;
}

export class FailoverProvider implements AIProvider {
  private readonly links: FailoverLink[];
  private readonly analyticsService?: AnalyticsService;
  private readonly userId?: string;

  constructor(links: FailoverLink[], analyticsService?: AnalyticsService, userId?: string) {
    if (links.length === 0) {
      throw new Error('FailoverProvider requires at least one provider link');
    }
    this.links = links;
    this.analyticsService = analyticsService;
    this.userId = userId;
  }

  private async trackSwitch(from: string, to: string, reason: string): Promise<void> {
    if (!this.analyticsService) return;
    try {
      await this.analyticsService.trackEvent({
        eventType: 'model_switched',
        userId: this.userId,
        properties: { from, to, reason },
      });
    } catch (error: any) {
      logger.warn('Failed to track model_switched event', { error: error?.message });
    }
  }

  private async trackModelUsed(model: string): Promise<void> {
    if (!this.analyticsService) return;
    try {
      await this.analyticsService.trackEvent({
        eventType: 'ai_response',
        userId: this.userId,
        properties: { model },
      });
    } catch (error: any) {
      logger.warn('Failed to track ai_response event', { error: error?.message });
    }
  }

  async generateResponse(input: GenerateResponseInput): Promise<AIResponse> {
    let lastError: any = null;

    for (const [i, link] of this.links.entries()) {
      const nextLink = i < this.links.length - 1 ? this.links[i + 1] : undefined;
      const nextName = nextLink?.name;
      try {
        logger.debug('Trying AI provider link', { name: link.name, index: i });
        const result = await link.provider.generateResponse(input);
        if (!result.content || !result.content.trim()) {
          lastError = new Error(`Provider "${link.name}" returned an empty answer`);
          if (nextName) {
            await this.trackSwitch(link.name, nextName, 'empty_answer');
          }
          continue;
        }
        await this.trackModelUsed(result.modelUsed || link.name);
        return result;
      } catch (error: any) {
        lastError = error;
        logger.error('AI provider link failed', {
          name: link.name,
          error: error?.message,
          retryable: isRetryable(error),
        });
        if (nextName) {
          await this.trackSwitch(link.name, nextName, error?.name ?? error?.message ?? 'error');
        }
      }
    }

    throw lastError ?? new Error('All AI providers failed');
  }

  async generateSummary(input: GenerateSummaryInput): Promise<AIResponse> {
    let lastError: any = null;
    for (const link of this.links) {
      try {
        const result = await link.provider.generateSummary(input);
        if (result.content) return result;
        lastError = new Error(`Provider "${link.name}" returned an empty summary`);
      } catch (error: any) {
        lastError = error;
        logger.error('AI provider summary link failed', { name: link.name, error: error?.message });
      }
    }
    throw lastError ?? new Error('All AI providers failed to summarize');
  }

  async classifyQuery(input: ClassifyQueryInput): Promise<ClassifyQueryOutput> {
    let lastError: any = null;
    for (const link of this.links) {
      try {
        return await link.provider.classifyQuery(input);
      } catch (error: any) {
        lastError = error;
        logger.error('AI provider classify link failed', { name: link.name, error: error?.message });
      }
    }
    throw lastError ?? new Error('All AI providers failed to classify');
  }
}