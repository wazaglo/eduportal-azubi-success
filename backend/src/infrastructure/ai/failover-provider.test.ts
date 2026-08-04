import { describe, it, expect, vi } from 'vitest';
import { FailoverProvider } from './failover-provider';
import type { AIProvider, AIResponse } from '../../../core/ports/ai-provider';
import type { AnalyticsService } from '../../../services/analytics-service';

function makeProvider(name: string, behavior: 'ok' | 'fail' | 'empty'): AIProvider {
  return {
    name,
    async generateResponse(): Promise<AIResponse> {
      if (behavior === 'fail') {
        throw Object.assign(new Error(`${name} exploded`), { name: 'ThrottlingException' });
      }
      if (behavior === 'empty') {
        return { content: '', modelUsed: name, tokensUsed: 0, latencyMs: 1, confidence: 0, finishReason: 'empty' };
      }
      return { content: `answer from ${name}`, modelUsed: name, tokensUsed: 1, latencyMs: 1, confidence: 1, finishReason: 'end_turn' };
    },
    async generateSummary() {
      throw new Error('not implemented');
    },
    async classifyQuery() {
      throw new Error('not implemented');
    },
  } as AIProvider;
}

function makeAnalytics() {
  const trackEvent = vi.fn(async () => ({}));
  return { trackEvent } as unknown as AnalyticsService;
}

describe('FailoverProvider', () => {
  it('returns the first link that succeeds', async () => {
    const provider = new FailoverProvider([
      { name: 'a', provider: makeProvider('a', 'ok') },
      { name: 'b', provider: makeProvider('b', 'ok') },
    ]);
    const result = await provider.generateResponse({ prompt: 'hi' });
    expect(result.content).toBe('answer from a');
    expect(result.modelUsed).toBe('a');
  });

  it('fails over to the next link when one throws', async () => {
    const analytics = makeAnalytics();
    const provider = new FailoverProvider(
      [
        { name: 'micro', provider: makeProvider('micro', 'fail') },
        { name: 'lite', provider: makeProvider('lite', 'ok') },
      ],
      analytics,
    );
    const result = await provider.generateResponse({ prompt: 'hi' });
    expect(result.content).toBe('answer from lite');
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'model_switched', properties: expect.objectContaining({ from: 'micro', to: 'lite' }) }),
    );
  });

  it('skips empty answers and fails over', async () => {
    const provider = new FailoverProvider([
      { name: 'a', provider: makeProvider('a', 'empty') },
      { name: 'b', provider: makeProvider('b', 'ok') },
    ]);
    const result = await provider.generateResponse({ prompt: 'hi' });
    expect(result.content).toBe('answer from b');
  });

  it('throws the last error when all links fail', async () => {
    const provider = new FailoverProvider([
      { name: 'a', provider: makeProvider('a', 'fail') },
      { name: 'b', provider: makeProvider('b', 'fail') },
    ]);
    await expect(provider.generateResponse({ prompt: 'hi' })).rejects.toMatchObject({
      name: 'ThrottlingException',
    });
  });

  it('tracks ai_response with the model used', async () => {
    const analytics = makeAnalytics();
    const provider = new FailoverProvider([{ name: 'm', provider: makeProvider('m', 'ok') }], analytics, 'user-1');
    await provider.generateResponse({ prompt: 'hi' });
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'ai_response', userId: 'user-1', properties: { model: 'm' } }),
    );
  });

  it('rejects empty links list', () => {
    expect(() => new FailoverProvider([])).toThrow('at least one provider');
  });
});