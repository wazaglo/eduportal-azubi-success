import { AIProvider } from '../../core/ports/ai-provider';
import { OpenAIProvider } from './openai-provider';
import { BedrockProvider } from './bedrock-provider';
import { GeminiProvider } from './gemini-provider';
import { FailoverProvider } from './failover-provider';
import type { AnalyticsService } from '../../services/analytics-service';
import { logger } from '../../utils/logger';

type ProviderType = 'openai' | 'deepseek' | 'gemini' | 'bedrock';

// Ordered AI chain. Each entry is a Bedrock inference-profile/model ID unless it
// is the sentinel "gemini", which resolves to the Gemini Flash provider.
// Configure via AI_MODEL_CHAIN; BEDROCK_MODEL_IDS is respected for backward
// compatibility (Bedrock-only chain with Gemini appended).
const DEFAULT_AI_MODEL_CHAIN = [
  'eu.amazon.nova-micro-v1:0',
  'eu.amazon.nova-lite-v1:0',
  'gemini',
  'eu.amazon.nova-pro-v1:0',
];

function parseAiModelChain(envValue?: string): string[] {
  if (envValue) {
    const entries = envValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (entries.length > 0) return entries;
  }
  const legacy = process.env.BEDROCK_MODEL_IDS
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (legacy && legacy.length > 0) return [...legacy, 'gemini'];
  return DEFAULT_AI_MODEL_CHAIN;
}

function buildChainLinks(): { name: string; provider: AIProvider }[] {
  const entries = parseAiModelChain(process.env.AI_MODEL_CHAIN);
  return entries.map((entry) =>
    entry.toLowerCase() === 'gemini'
      ? { name: 'gemini', provider: new GeminiProvider() }
      : { name: entry, provider: new BedrockProvider(entry) },
  );
}

export class ProviderFactory {
  private static instance: AIProvider | null = null;

  static createProvider(type?: ProviderType, analyticsService?: AnalyticsService, userId?: string): AIProvider {
    const providerType = type ?? (process.env.AI_PROVIDER as ProviderType) ?? 'openai';

    logger.info('Creating AI provider', { providerType });

    switch (providerType) {
      case 'bedrock': {
        return new FailoverProvider(buildChainLinks(), analyticsService, userId);
      }
      case 'openai':
        return new OpenAIProvider();
      case 'gemini':
        return new GeminiProvider();
      case 'deepseek':
        throw new Error('DeepSeek provider not yet implemented - add your implementation here');
      default:
        logger.warn(`Unknown provider type "${providerType}", falling back to OpenAI`);
        return new OpenAIProvider();
    }
  }

  static getProvider(analyticsService?: AnalyticsService, userId?: string): AIProvider {
    if (!this.instance || analyticsService) {
      this.instance = this.createProvider(undefined, analyticsService, userId);
    }
    return this.instance;
  }

  static resetProvider(): void {
    this.instance = null;
  }
}