import { AIProvider } from '../../core/ports/ai-provider';
import { OpenAIProvider } from './openai-provider';
import { logger } from '../../utils/logger';

type ProviderType = 'openai' | 'deepseek' | 'gemini';

export class ProviderFactory {
  private static instance: AIProvider | null = null;

  static createProvider(type?: ProviderType): AIProvider {
    const providerType = type ?? (process.env.AI_PROVIDER as ProviderType) ?? 'openai';

    logger.info('Creating AI provider', { providerType });

    switch (providerType) {
      case 'openai':
        return new OpenAIProvider();
      case 'deepseek':
        throw new Error('DeepSeek provider not yet implemented - add your implementation here');
      case 'gemini':
        throw new Error('Gemini provider not yet implemented - add your implementation here');
      default:
        logger.warn(`Unknown provider type "${providerType}", falling back to OpenAI`);
        return new OpenAIProvider();
    }
  }

  static getProvider(): AIProvider {
    if (!this.instance) {
      this.instance = this.createProvider();
    }
    return this.instance;
  }

  static resetProvider(): void {
    this.instance = null;
  }
}
