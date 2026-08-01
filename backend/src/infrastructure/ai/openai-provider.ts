import OpenAI from 'openai';
import { AIProvider, AIResponse, GenerateResponseInput, GenerateSummaryInput, ClassifyQueryInput, ClassifyQueryOutput } from '../../core/ports/ai-provider';
import { AI_MODELS } from '../../utils/constants';
import { logger } from '../../utils/logger';

type ChatRole = 'system' | 'user' | 'assistant';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null = null;
  private readonly modelId: string;

  constructor() {
    this.modelId = process.env.OPENAI_MODEL ?? AI_MODELS.GPT_4O_MINI;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.client;
  }

  async generateResponse(input: GenerateResponseInput): Promise<AIResponse> {
    const startTime = Date.now();
    const modelId = input.requireReasoning ? AI_MODELS.GPT_4O : this.modelId;

    try {
      const completion = await this.getClient().chat.completions.create({
        model: modelId,
        messages: this.buildMessages(input),
        max_tokens: input.maxTokens ?? 2048,
        temperature: input.temperature ?? 0.7,
      });

      const latencyMs = Date.now() - startTime;
      const choice = completion.choices[0];

      return {
        content: choice?.message?.content ?? '',
        modelUsed: modelId,
        tokensUsed: (completion.usage?.prompt_tokens ?? 0) + (completion.usage?.completion_tokens ?? 0),
        latencyMs,
        confidence: choice?.finish_reason === 'stop' ? 1 : 0.8,
        finishReason: choice?.finish_reason ?? 'unknown',
      };
    } catch (error: any) {
      logger.error('OpenAI generateResponse failed', {
        error: error.message,
        modelId,
        requireReasoning: input.requireReasoning,
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
      const completion = await this.getClient().chat.completions.create({
        model: this.modelId,
        messages: [
          { role: 'system', content: 'You are a strict query classifier. Respond with only the category name.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 50,
        temperature: 0.1,
      });

      const category = (completion.choices[0]?.message?.content ?? '').trim().toLowerCase();
      const validCategory = input.categories.find((c) => category.includes(c));

      return {
        category: validCategory ?? input.categories[0] ?? 'general',
        confidence: validCategory ? 0.9 : 0.5,
      };
    } catch (error: any) {
      logger.error('OpenAI classification failed', { error: error.message, query: input.query });
      return { category: 'general', confidence: 0.5 };
    }
  }

  private buildMessages(input: GenerateResponseInput): { role: ChatRole; content: string }[] {
    const messages: { role: ChatRole; content: string }[] = [];

    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }

    if (input.conversationHistory && input.conversationHistory.length > 0) {
      messages.push(...input.conversationHistory.map((m) => ({
        role: m.role as ChatRole,
        content: m.content,
      })));
    } else {
      messages.push({ role: 'user', content: input.prompt });
    }

    return messages;
  }
}
