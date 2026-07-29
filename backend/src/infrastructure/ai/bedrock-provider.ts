import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { AIProvider, AIResponse, GenerateResponseInput, GenerateSummaryInput, ClassifyQueryInput, ClassifyQueryOutput } from '../../core/ports/ai-provider';
import { AI_MODELS } from '../../utils/constants';
import { logger } from '../../utils/logger';

export class BedrockProvider implements AIProvider {
  private readonly client: BedrockRuntimeClient;
  private readonly guardrailId: string;
  private readonly guardrailVersion: string;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
    });
    this.guardrailId = process.env.BEDROCK_GUARDRAIL_ID ?? '';
    this.guardrailVersion = process.env.BEDROCK_GUARDRAIL_VERSION ?? 'DRAFT';
  }

  async generateResponse(input: GenerateResponseInput): Promise<AIResponse> {
    const startTime = Date.now();
    const modelId = input.requireReasoning ? AI_MODELS.CLAUDE_SONNET : AI_MODELS.NOVA_LITE;

    const messages = this.buildMessages(input);

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: input.maxTokens ?? 2048,
      temperature: input.temperature ?? 0.7,
      ...(input.systemPrompt ? { system: input.systemPrompt } : {}),
      messages,
      ...(this.guardrailId ? {
        guardrailConfig: {
          guardrailIdentifier: this.guardrailId,
          guardrailVersion: this.guardrailVersion,
          trace: 'enabled',
        },
      } : {}),
    };

    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const latencyMs = Date.now() - startTime;

      return {
        content: responseBody.content?.[0]?.text ?? '',
        modelUsed: modelId,
        tokensUsed: (responseBody.usage?.input_tokens ?? 0) + (responseBody.usage?.output_tokens ?? 0),
        latencyMs,
        guardrailTriggered: !!responseBody.stop_reason?.includes('guardrail'),
        confidence: responseBody.stop_reason === 'end_turn' ? 1 : 0.8,
        finishReason: responseBody.stop_reason ?? 'unknown',
      };
    } catch (error: any) {
      logger.error('Bedrock invoke failed', {
        error: error.message,
        modelId,
        requireReasoning: input.requireReasoning,
      });

      if (input.requireReasoning && error.name === 'ValidationException') {
        return this.fallbackToHaiku(input, startTime);
      }

      throw error;
    }
  }

  async generateSummary(input: GenerateSummaryInput): Promise<AIResponse> {
    const startTime = Date.now();

    const prompt = `Please provide a concise summary of the following conversation in ${input.maxLength ?? 200} words or less:\n\n${input.text}`;

    return this.generateResponse({
      prompt,
      systemPrompt: 'You are a summarization assistant. Create clear, concise summaries that capture key points.',
      maxTokens: input.maxLength ? Math.min(input.maxLength * 2, 500) : 400,
      temperature: 0.3,
    });
  }

  async classifyQuery(input: ClassifyQueryInput): Promise<ClassifyQueryOutput> {
    const startTime = Date.now();

    const prompt = `Classify the following student query into exactly one of these categories: ${input.categories.join(', ')}.\n\nQuery: "${input.query}"\n\nRespond with only the category name, nothing else.`;

    try {
      const command = new InvokeModelCommand({
        modelId: AI_MODELS.CLAUDE_HAIKU,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 50,
          temperature: 0.1,
          messages: [
            { role: 'user', content: prompt },
          ],
        }),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const category = (responseBody.content?.[0]?.text ?? '').trim().toLowerCase();

      const validCategory = input.categories.find((c) => category.includes(c));

      return {
        category: validCategory ?? input.categories[0] ?? 'general',
        confidence: validCategory ? 0.9 : 0.5,
      };
    } catch (error: any) {
      logger.error('Classification failed', { error: error.message, query: input.query });
      return { category: 'general', confidence: 0.5 };
    }
  }

  private async fallbackToHaiku(input: GenerateResponseInput, startTime: number): Promise<AIResponse> {
    logger.info('Falling back to Claude Haiku', { originalModel: AI_MODELS.CLAUDE_SONNET });

    const messages = this.buildMessages(input);
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: input.maxTokens ?? 2048,
      temperature: input.temperature ?? 0.7,
      ...(input.systemPrompt ? { system: input.systemPrompt } : {}),
      messages,
    };

    const command = new InvokeModelCommand({
      modelId: AI_MODELS.CLAUDE_HAIKU,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const latencyMs = Date.now() - startTime;

    return {
      content: responseBody.content?.[0]?.text ?? '',
      modelUsed: AI_MODELS.CLAUDE_HAIKU,
      tokensUsed: (responseBody.usage?.input_tokens ?? 0) + (responseBody.usage?.output_tokens ?? 0),
      latencyMs,
      guardrailTriggered: false,
      confidence: 0.8,
      finishReason: responseBody.stop_reason ?? 'unknown',
    };
  }

  private buildMessages(input: GenerateResponseInput): { role: string; content: string }[] {
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      return input.conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    return [{ role: 'user', content: input.prompt }];
  }
}
