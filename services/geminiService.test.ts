import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMorningStarAnalysis } from './geminiService';

describe('geminiService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns backend response text when available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: '{"content":"ok","metrics":{"resilience":1}}' }),
      }),
    );

    await expect(
      getMorningStarAnalysis('entry', 'reflection', ['Marcus Aurelius']),
    ).resolves.toContain('"content":"ok"');
  });

  it('falls back to a public message when backend fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'internal details' }),
      }),
    );

    const result = await getMorningStarAnalysis('entry', 'reflection', ['Marcus Aurelius']);
    expect(result).toContain('星光暂时失联，请稍后重试。');
    expect(result).not.toContain('internal details');
  });
});
