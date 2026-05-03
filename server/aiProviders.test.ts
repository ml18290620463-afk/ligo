import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chooseProvider,
  resolveProviderModel,
  callOpenRouter,
  fetchOpenRouterFreeModels,
  type ProviderConfig,
} from './aiProviders';

const baseCfg = (overrides: Partial<ProviderConfig> = {}): ProviderConfig => ({
  forcedProvider: '',
  openrouterKey: '',
  openrouterModel: 'google/gemma-3-12b-it:free',
  openrouterReferer: 'http://localhost:3000',
  openrouterTitle: 'VECTOR test',
  openrouterJsonMode: false,
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  ...overrides,
});

describe('chooseProvider', () => {
  it('returns null when neither key is set', () => {
    expect(chooseProvider(baseCfg())).toBeNull();
  });

  it('prefers OpenRouter when both keys are present and no override', () => {
    expect(chooseProvider(baseCfg({ openrouterKey: 'sk-or-1', geminiKey: 'gem-1' }))).toBe(
      'openrouter',
    );
  });

  it('honours forcedProvider when its key is present', () => {
    expect(
      chooseProvider(
        baseCfg({ forcedProvider: 'gemini', openrouterKey: 'sk-or-1', geminiKey: 'gem-1' }),
      ),
    ).toBe('gemini');
  });

  it('falls back when forcedProvider lacks a key', () => {
    expect(chooseProvider(baseCfg({ forcedProvider: 'gemini', openrouterKey: 'sk-or-1' }))).toBe(
      'openrouter',
    );
  });

  it('returns gemini when only Gemini key is set', () => {
    expect(chooseProvider(baseCfg({ geminiKey: 'gem-1' }))).toBe('gemini');
  });
});

describe('resolveProviderModel', () => {
  it('returns the OpenRouter model id for openrouter provider', () => {
    expect(resolveProviderModel(baseCfg({ openrouterModel: 'foo:free' }), 'openrouter')).toBe(
      'foo:free',
    );
  });

  it('returns the Gemini model id for gemini provider', () => {
    expect(resolveProviderModel(baseCfg({ geminiModel: 'gemini-2.5-pro' }), 'gemini')).toBe(
      'gemini-2.5-pro',
    );
  });
});

describe('callOpenRouter', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when upstream returns non-2xx', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('rate limit hit', { status: 429 }),
    );
    await expect(callOpenRouter('hi', baseCfg({ openrouterKey: 'sk-or-1' }))).rejects.toThrow(
      /OpenRouter 429/,
    );
  });

  it('throws when content is missing', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(callOpenRouter('hi', baseCfg({ openrouterKey: 'sk-or-1' }))).rejects.toThrow(
      /Empty OpenRouter/,
    );
  });

  it('returns the assistant content on success', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: 'hello world' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(callOpenRouter('hi', baseCfg({ openrouterKey: 'sk-or-1' }))).resolves.toBe(
      'hello world',
    );
  });

  it('sets HTTP-Referer + X-Title + Authorization headers', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await callOpenRouter(
      'hi',
      baseCfg({
        openrouterKey: 'sk-or-1',
        openrouterReferer: 'https://example.test',
        openrouterTitle: 'Test',
      }),
    );
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const headers = (init as { headers: Record<string, string> }).headers;
    expect(headers['Authorization']).toBe('Bearer sk-or-1');
    expect(headers['HTTP-Referer']).toBe('https://example.test');
    expect(headers['X-Title']).toBe('Test');
  });

  it('attaches response_format when openrouterJsonMode is true', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await callOpenRouter('hi', baseCfg({ openrouterKey: 'sk-or-1', openrouterJsonMode: true }));
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const body = JSON.parse((init as { body: string }).body);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
});

describe('fetchOpenRouterFreeModels', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when upstream returns non-2xx', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('upstream down', { status: 503 }),
    );
    await expect(fetchOpenRouterFreeModels(baseCfg())).rejects.toThrow(/Upstream 503/);
  });

  it('returns only :free or zero-priced entries, sorted by id', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'paid-model',
              name: 'Paid',
              context_length: 4096,
              pricing: { prompt: '0.001', completion: '0.001' },
            },
            {
              id: 'b/free-model:free',
              name: 'Free B',
              context_length: 8192,
              pricing: { prompt: '0', completion: '0' },
            },
            {
              id: 'a/free-zero-priced',
              name: 'Free A (zero-priced no suffix)',
              context_length: null,
              pricing: { prompt: 0, completion: 0 },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const result = await fetchOpenRouterFreeModels(baseCfg());
    expect(result.map((m) => m.id)).toEqual(['a/free-zero-priced', 'b/free-model:free']);
    expect(result[0]!.context_length).toBeNull();
    expect(result[1]!.context_length).toBe(8192);
  });

  it('includes Authorization header when key is present', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await fetchOpenRouterFreeModels(baseCfg({ openrouterKey: 'sk-or-1' }));
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const headers = (init as { headers: Record<string, string> }).headers;
    expect(headers['Authorization']).toBe('Bearer sk-or-1');
  });

  it('omits Authorization when key is empty', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await fetchOpenRouterFreeModels(baseCfg());
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const headers = (init as { headers: Record<string, string> }).headers;
    expect(headers['Authorization']).toBeUndefined();
  });
});
