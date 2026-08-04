import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { AIProvider, AIResponse, GenerateResponseInput, GenerateSummaryInput, ClassifyQueryInput, ClassifyQueryOutput } from '../../core/ports/ai-provider';
import { logger } from '../../utils/logger';

export class BedrockProvider implements AIProvider {
  private readonly client: BedrockRuntimeClient;
  readonly modelId: string;

  constructor(modelId?: string) {
    this.modelId = modelId ?? process.env.BEDROCK_MODEL_ID ?? 'eu.amazon.nova-micro-v1:0';
    this.client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'eu-west-1' });
  }

  async generateResponse(input: GenerateResponseInput): Promise<AIResponse> {
    const startTime = Date.now();
    const systemPrompt = input.systemPrompt ?? '';
    const userContent = input.prompt;

    try {
      const command = new ConverseCommand({
        modelId: this.modelId,
        system: systemPrompt ? [{ text: systemPrompt }] : undefined,
        messages: [
          {
            role: 'user',
            content: [{ text: userContent }],
          },
        ],
        inferenceConfig: {
          maxTokens: input.maxTokens ?? 2048,
          temperature: input.temperature ?? 0.7,
        },
      });

      const result = await this.client.send(command);

      const text = result.output?.message?.content?.[0]?.text ?? '';
      const latencyMs = result.metrics?.latencyMs ?? Date.now() - startTime;
      const stopReason = result.stopReason ?? 'unknown';
      const tokensUsed = (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0);

      return {
        content: text,
        modelUsed: this.modelId,
        tokensUsed,
        latencyMs,
        confidence: stopReason === 'end_turn' ? 1 : 0.8,
        finishReason: stopReason,
      };
    } catch (error: any) {
      logger.error('Bedrock generateResponse failed', {
        error: error?.message,
        modelId: this.modelId,
        name: error?.name,
      });
      throw error;
    }
  }

  async generateSummary(input: GenerateSummaryInput): Promise<AIResponse> {
    return this.generateResponse({
      prompt: `Please provide a concise summary of the following conversation in ${input.maxLength ?? 200} words or less:\n\n${input.text}`,
      systemPrompt: 'You are a summarization assistant. Create clear, concise summaries that capture key points.',
      maxTokens: input.maxLength ? Math.min(input.maxLength * 2, 500) : 400,
      temperature: 0.3,
    });
  }

  async classifyQuery(input: ClassifyQueryInput): Promise<ClassifyQueryOutput> {
    const prompt = `Classify the following student query into exactly one of these categories: ${input.categories.join(', ')}.\n\nQuery: "${input.query}"\n\nRespond with only the category name, nothing else.`;

    try {
      const result = await this.generateResponse({
        prompt,
        systemPrompt: 'You are a strict query classifier. Respond with only the category name.',
        maxTokens: 50,
        temperature: 0.1,
      });

      const category = (result.content ?? '').trim().toLowerCase();
      const validCategory = input.categories.find((c) => category.includes(c));

      return {
        category: validCategory ?? input.categories[0] ?? 'general',
        confidence: validCategory ? 0.9 : 0.5,
      };
    } catch (error: any) {
      logger.error('Bedrock classification failed', { error: error.message, query: input.query });
      return { category: 'general', confidence: 0.5 };
    }
  }
}
