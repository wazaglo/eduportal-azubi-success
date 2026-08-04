import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BedrockProvider } from './bedrock-provider';
import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  const send = vi.fn();
  return {
    BedrockRuntimeClient: class {
      send = send;
    },
    ConverseCommand: class {
      constructor(public input: unknown) {}
    },
  };
});

import { BedrockRuntimeClient, ConverseCommand as MockedConverseCommand } from '@aws-sdk/client-bedrock-runtime';

function makeConverseOutput(overrides: Record<string, unknown> = {}) {
  return {
    $metadata: {},
    output: {
      message: { role: 'assistant', content: [{ text: 'The answer is 42.' }] },
    },
    stopReason: 'end_turn',
    usage: { inputTokens: 10, outputTokens: 5 },
    metrics: { latencyMs: 123 },
    ...overrides,
  };
}

describe('BedrockProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AWS_REGION = 'eu-west-1';
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
  });

  it('sends a ConverseCommand and maps the response to AIResponse', async () => {
    const client = new BedrockRuntimeClient({});
    (client.send as ReturnType<typeof vi.fn>).mockResolvedValue(makeConverseOutput());

    const provider = new BedrockProvider('amazon.nova-micro-v1:0');
    // @ts-expect-error override mocked client for test
    provider.client = client;

    const result = await provider.generateResponse({ prompt: 'What is life?' });

    expect(client.send).toHaveBeenCalledTimes(1);
    const cmd = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(cmd).toBeInstanceOf(MockedConverseCommand);
    expect(cmd.input).toMatchObject({
      modelId: 'amazon.nova-micro-v1:0',
      inferenceConfig: { maxTokens: 2048, temperature: 0.7 },
    });
    expect(cmd.input.messages[0].content[0].text).toBe('What is life?');
    expect(result).toEqual({
      content: 'The answer is 42.',
      modelUsed: 'amazon.nova-micro-v1:0',
      tokensUsed: 15,
      latencyMs: 123,
      confidence: 1,
      finishReason: 'end_turn',
    });
  });

  it('sets confidence 0.8 for non-end_turn stop reasons', async () => {
    const client = new BedrockRuntimeClient({});
    (client.send as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeConverseOutput({ stopReason: 'max_tokens' }),
    );

    const provider = new BedrockProvider('amazon.nova-micro-v1:0');
    // @ts-expect-error override mocked client for test
    provider.client = client;

    const result = await provider.generateResponse({ prompt: 'hi' });
    expect(result.confidence).toBe(0.8);
    expect(result.finishReason).toBe('max_tokens');
  });

  it('propagates Bedrock errors', async () => {
    const client = new BedrockRuntimeClient({});
    (client.send as ReturnType<typeof vi.fn>).mockRejectedValue(
      Object.assign(new Error('Access denied'), { name: 'AccessDeniedException' }),
    );

    const provider = new BedrockProvider('amazon.nova-micro-v1:0');
    // @ts-expect-error override mocked client for test
    provider.client = client;

    await expect(provider.generateResponse({ prompt: 'hi' })).rejects.toMatchObject({
      name: 'AccessDeniedException',
    });
  });

  it('uses BEDROCK_MODEL_ID env var when no modelId is passed', () => {
    process.env.BEDROCK_MODEL_ID = 'amazon.nova-lite-v1:0';
    const provider = new BedrockProvider();
    expect(provider.modelId).toBe('amazon.nova-lite-v1:0');
    delete process.env.BEDROCK_MODEL_ID;
  });
});
