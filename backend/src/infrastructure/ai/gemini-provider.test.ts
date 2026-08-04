import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider } from './gemini-provider';

const generateContentMock = vi.fn();
const getGenerativeModelMock = vi.fn(() => ({ generateContent: generateContentMock }));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = getGenerativeModelMock;
  },
  HarmCategory: { HARM_CATEGORY_HARASSMENT: 1, HARM_CATEGORY_HATE_SPEECH: 1, HARM_CATEGORY_SEXUALLY_EXPLICIT: 1, HARM_CATEGORY_DANGEROUS_CONTENT: 1 },
  HarmBlockThreshold: { BLOCK_NONE: 0 },
}));

function makeGeminiResult(overrides: Record<string, unknown> = {}) {
  return {
    response: {
      text: () => 'Gemini answer.',
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 8 },
      promptFeedback: null,
      candidates: [{ finishReason: 1 }],
    },
    ...overrides,
  };
}

describe('GeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it('throws when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiProvider();
    await expect(provider.generateResponse({ prompt: 'hi' })).rejects.toThrow('GEMINI_API_KEY');
  });

  it('calls Gemini and maps the response', async () => {
    generateContentMock.mockResolvedValue(makeGeminiResult());
    const provider = new GeminiProvider('gemini-2.0-flash');

    const result = await provider.generateResponse({
      prompt: 'Explain gravity',
      systemPrompt: 'Be a tutor',
      temperature: 0.3,
      maxTokens: 100,
    });

    expect(getGenerativeModelMock).toHaveBeenCalledTimes(1);
    const [call] = generateContentMock.mock.calls[0];
    expect(call.generationConfig).toMatchObject({ maxOutputTokens: 100, temperature: 0.3 });
    expect(call.contents[0].parts[0].text).toContain('Explain gravity');
    expect(result).toEqual({
      content: 'Gemini answer.',
      modelUsed: 'gemini-2.0-flash',
      tokensUsed: 18,
      latencyMs: expect.any(Number),
      confidence: 0.9,
      finishReason: '1',
    });
  });

  it('uses GEMINI_MODEL env var default', () => {
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    const provider = new GeminiProvider();
    expect(provider.modelId).toBe('gemini-2.5-flash');
  });

  it('maps block reasons to blocked finishReason with confidence 0', () => {
    generateContentMock.mockResolvedValue(
      makeGeminiResult({
        response: {
          text: () => '',
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 0 },
          promptFeedback: { blockReason: 'SAFETY' },
          candidates: undefined,
        },
      }),
    );
    const provider = new GeminiProvider('gemini-2.0-flash');
    return provider.generateResponse({ prompt: 'hi' }).then((result) => {
      expect(result.finishReason).toBe('blocked:SAFETY');
      expect(result.confidence).toBe(0);
    });
  });
});