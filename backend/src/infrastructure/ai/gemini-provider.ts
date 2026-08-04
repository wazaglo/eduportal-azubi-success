import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentResult } from '@google/generative-ai';
import { AIProvider, AIResponse, GenerateResponseInput, GenerateSummaryInput, ClassifyQueryInput, ClassifyQueryOutput } from '../../core/ports/ai-provider';
import { logger } from '../../utils/logger';

export class GeminiProvider implements AIProvider {
  readonly modelId: string;
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(modelId?: string) {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    this.modelName = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    this.modelId = modelId ?? this.modelName;
  }

  private getModel() {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    return genAI.getGenerativeModel({
      model: this.modelId,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });
  }

  private mapResult(result: GenerateContentResult, latencyMs: number): AIResponse {
    const response = result.response;
    const text = response.text() ?? '';
    const usage = response.usageMetadata;
    const finishReason = response.promptFeedback?.blockReason
      ? `blocked:${response.promptFeedback.blockReason}`
      : response.candidates?.[0]?.finishReason ?? 'unknown';

    return {
      content: text,
      modelUsed: this.modelId,
      tokensUsed: (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0),
      latencyMs,
      confidence: text ? 0.9 : 0,
      finishReason: String(finishReason),
    };
  }

  async generateResponse(input: GenerateResponseInput): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    const startTime = Date.now();
    try {
      const model = this.getModel();
      const parts: string[] = [];
      if (input.systemPrompt) {
        parts.push(`System instructions:\n${input.systemPrompt}`);
      }
      if (input.conversationHistory && input.conversationHistory.length > 0) {
        parts.push(input.conversationHistory.map((m) => `${m.role}: ${m.content}`).join('\n'));
      }
      parts.push(input.prompt);

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: parts.join('\n\n') }] }],
        generationConfig: {
          maxOutputTokens: input.maxTokens ?? 2048,
          temperature: input.temperature ?? 0.7,
        },
      });

      return this.mapResult(result, Date.now() - startTime);
    } catch (error: any) {
      logger.error('Gemini generateResponse failed', {
        error: error?.message,
        modelId: this.modelId,
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
      logger.error('Gemini classification failed', { error: error.message, query: input.query });
      return { category: 'general', confidence: 0.5 };
    }
  }
}