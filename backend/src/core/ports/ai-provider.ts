export interface AIResponse {
  content: string;
  modelUsed: string;
  tokensUsed: number;
  latencyMs: number;
  guardrailTriggered: boolean;
  confidence: number;
  finishReason: string;
}

export interface GenerateResponseInput {
  prompt: string;
  systemPrompt?: string;
  conversationHistory?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  requireReasoning?: boolean;
  guardrails?: {
    contentPolicy?: boolean;
    topicPolicy?: boolean;
    wordPolicy?: boolean;
  };
}

export interface GenerateSummaryInput {
  text: string;
  maxLength?: number;
}

export interface ClassifyQueryInput {
  query: string;
  categories: string[];
}

export interface ClassifyQueryOutput {
  category: string;
  confidence: number;
}

export interface AIProvider {
  generateResponse(input: GenerateResponseInput): Promise<AIResponse>;
  generateSummary(input: GenerateSummaryInput): Promise<AIResponse>;
  classifyQuery(input: ClassifyQueryInput): Promise<ClassifyQueryOutput>;
}
