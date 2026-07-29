import { AIProvider } from '../../core/ports/ai-provider';
import { BedrockProvider } from './bedrock-provider';
import { logger } from '../../utils/logger';

type ProviderType = 'bedrock' | 'openai' | 'deepseek' | 'gemini';

export class ProviderFactory {
  private static instance: AIProvider | null = null;

  static createProvider(type?: ProviderType): AIProvider {
    const providerType = type ?? (process.env.AI_PROVIDER as ProviderType) ?? 'bedrock';

    logger.info('Creating AI provider', { providerType });

    switch (providerType) {
      case 'bedrock':
        return new BedrockProvider();
      case 'openai':
        throw new Error('OpenAI provider not yet implemented - add your implementation here');
      case 'deepseek':
        throw new Error('DeepSeek provider not yet implemented - add your implementation here');
      case 'gemini':
        throw new Error('Gemini provider not yet implemented - add your implementation here');
      default:
        logger.warn(`Unknown provider type "${providerType}", falling back to Bedrock`);
        return new BedrockProvider();
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
