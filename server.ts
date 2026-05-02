import express from 'express';
import type { Server } from 'node:http';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { createAiProxyAuth } from './server/aiProxyAuth';
import { containsInjection } from './server/promptEnvelope';
import { formatLogError } from './server/scrubLog';
import { captureServerError, initServerObservability } from './server/observability';

// Initialise the optional Sentry SDK as early as possible so that any
// startup-time crash is captured. This is a no-op when SENTRY_DSN is unset,
// so local dev and self-hosted deployments without an account stay silent.
initServerObservability();

function loadEnvFileSafe(filePath: string) {
  if (!existsSync(filePath)) return;
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    console.warn(`Failed to load env file ${filePath}:`, error);
  }
}

loadEnvFileSafe('.env.local');
loadEnvFileSafe('.env');

type Provider = 'openrouter' | 'gemini';

const sanitizeEnv = (value: string | undefined) => value?.trim().replace(/^['"]|['"]$/g, '') || '';

const parseList = (value: string | undefined): string[] =>
  sanitizeEnv(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

const env = {
  port: Number(process.env.PORT || 3000),
  // Default to loopback. Operators must opt-in to bind on all interfaces.
  host: process.env.HOST || '127.0.0.1',
  forcedProvider: sanitizeEnv(process.env.AI_PROVIDER).toLowerCase() as Provider | '',
  openrouterKey: sanitizeEnv(process.env.OPENROUTER_API_KEY),
  openrouterModel: sanitizeEnv(process.env.OPENROUTER_MODEL) || 'google/gemma-3-12b-it:free',
  openrouterReferer: sanitizeEnv(process.env.OPENROUTER_REFERER) || 'http://localhost:3000',
  openrouterTitle: sanitizeEnv(process.env.OPENROUTER_TITLE) || 'VECTOR Life Design Guide',
  openrouterTimeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS || 60_000),
  openrouterJsonMode: sanitizeEnv(process.env.OPENROUTER_JSON_MODE).toLowerCase() === 'true',
  geminiKey: sanitizeEnv(process.env.GEMINI_API_KEY),
  geminiModel: sanitizeEnv(process.env.GEMINI_MODEL) || 'gemini-2.5-flash',
  morningStarAccessToken: sanitizeEnv(process.env.MORNING_STAR_ACCESS_TOKEN),
  morningStarAllowedOrigins: parseList(process.env.MORNING_STAR_ALLOWED_ORIGINS),
};

const buildDefaultAllowedOrigins = (): string[] => {
  const origins = new Set<string>();
  const port = Number.isFinite(env.port) ? env.port : 3000;
  for (const host of ['localhost', '127.0.0.1']) {
    origins.add(`http://${host}:${port}`);
    origins.add(`https://${host}:${port}`);
  }
  return Array.from(origins);
};

const allowedOriginSet = new Set(
  env.morningStarAllowedOrigins.length > 0
    ? env.morningStarAllowedOrigins
    : buildDefaultAllowedOrigins(),
);

function chooseProvider(): Provider | null {
  if (env.forcedProvider === 'openrouter' && env.openrouterKey) return 'openrouter';
  if (env.forcedProvider === 'gemini' && env.geminiKey) return 'gemini';
  if (env.openrouterKey) return 'openrouter';
  if (env.geminiKey) return 'gemini';
  return null;
}

async function callOpenRouter(prompt: string, signal?: AbortSignal): Promise<string> {
  const body: Record<string, unknown> = {
    model: env.openrouterModel,
    messages: [{ role: 'user', content: prompt }],
  };
  if (env.openrouterJsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${env.openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.openrouterReferer,
      'X-Title': env.openrouterTitle,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content) {
    throw new Error('Empty OpenRouter response');
  }
  return content;
}

async function callGemini(prompt: string, signal?: AbortSignal): Promise<string> {
  const client = new GoogleGenAI({ apiKey: env.geminiKey });
  const generation = client.models.generateContent({
    model: env.geminiModel,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  if (!signal) {
    const response = await generation;
    return response.text || '';
  }

  if (signal.aborted) {
    throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
  }

  const response = await new Promise<Awaited<typeof generation>>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    generation
      .then((value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      })
      .catch((error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      });
  });

  return response.text || '';
}

interface FreeModelSummary {
  id: string;
  name: string;
  context_length: number | null;
  description: string;
}

interface OpenRouterModelEntry {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
  description?: unknown;
  pricing?: { prompt?: unknown; completion?: unknown };
}

async function fetchOpenRouterFreeModels(): Promise<FreeModelSummary[]> {
  const headers: Record<string, string> = {};
  if (env.openrouterKey) {
    headers.Authorization = `Bearer ${env.openrouterKey}`;
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', { headers });
  if (!response.ok) {
    throw new Error(`Upstream ${response.status}`);
  }
  const data = await response.json();
  const items: OpenRouterModelEntry[] = Array.isArray(data?.data) ? data.data : [];

  return items
    .filter((model) => {
      const id = String(model?.id || '');
      const promptPrice = Number(model?.pricing?.prompt ?? 1);
      const completionPrice = Number(model?.pricing?.completion ?? 1);
      return id.endsWith(':free') || (promptPrice === 0 && completionPrice === 0);
    })
    .map(
      (model): FreeModelSummary => ({
        id: String(model?.id || ''),
        name: String(model?.name || model?.id || ''),
        context_length: typeof model?.context_length === 'number' ? model.context_length : null,
        description: String(model?.description || '').slice(0, 220),
      }),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

const requireAiProxyAuth = createAiProxyAuth({
  allowedOrigins: allowedOriginSet,
  accessToken: env.morningStarAccessToken,
});

async function startServer() {
  const app = express();
  const port = Number.isFinite(env.port) ? env.port : 3000;

  const morningStarLimiter = rateLimit({
    windowMs: Number(process.env.MORNING_STAR_RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.MORNING_STAR_RATE_LIMIT_MAX || 5),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many Morning Star requests. Please try again later.' },
  });

  const modelsListLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.disable('x-powered-by');

  // CSP is intentionally relaxed in development so Vite middleware HMR works.
  // In production we emit a strict policy that still allows the upstream AI
  // hosts the proxy can call, plus the inline styles emitted by Tailwind 4.
  const productionCspDirectives = {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'self'"],
    formAction: ["'self'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    mediaSrc: ["'self'", 'data:', 'blob:'],
    fontSrc: ["'self'", 'data:'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'", 'https://openrouter.ai', 'https://generativelanguage.googleapis.com'],
    workerSrc: ["'self'", 'blob:'],
    upgradeInsecureRequests: [],
  };

  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? { useDefaults: false, directives: productionCspDirectives }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: '128kb' }));

  app.get('/api/health', (_req, res) => {
    const provider = chooseProvider();
    const model =
      provider === 'openrouter'
        ? env.openrouterModel
        : provider === 'gemini'
          ? env.geminiModel
          : null;
    res.json({ status: 'ok', provider, model });
  });

  app.get('/api/models', modelsListLimiter, requireAiProxyAuth, async (_req, res) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    if (!env.openrouterKey) {
      res.status(503).json({
        error: 'OPENROUTER_API_KEY not configured',
        requestId,
      });
      return;
    }

    try {
      const models = await fetchOpenRouterFreeModels();
      res.json({
        provider: 'openrouter',
        defaultModel: env.openrouterModel,
        count: models.length,
        models,
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'openrouter_models_failed',
          requestId,
          error: formatLogError(error),
        }),
      );
      res.status(502).json({ error: 'Failed to fetch OpenRouter models', requestId });
    }
  });

  app.post('/api/morning-star', morningStarLimiter, requireAiProxyAuth, async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);

    const provider = chooseProvider();
    if (!provider) {
      res.status(503).json({ error: 'AI backend is not configured', requestId });
      return;
    }

    const { prompt } = req.body;
    if (typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > 60_000) {
      res.status(400).json({ error: 'Invalid prompt payload', requestId });
      return;
    }

    // Cheap-but-effective prompt-injection guard. We refuse obvious
    // override patterns up front so a hostile journal entry cannot
    // hijack the persona contract held in the upstream prompt template.
    if (containsInjection(prompt)) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'morning_star_rejected_injection',
          requestId,
          provider,
          promptLength: prompt.length,
        }),
      );
      res
        .status(400)
        .json({ error: 'Prompt rejected by safety guard', requestId, code: 'INJECTION' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.openrouterTimeoutMs);
    const startedAt = Date.now();

    try {
      const text =
        provider === 'openrouter'
          ? await callOpenRouter(prompt, controller.signal)
          : await callGemini(prompt, controller.signal);
      console.info(
        JSON.stringify({
          level: 'info',
          event: 'morning_star_success',
          requestId,
          provider,
          promptLength: prompt.length,
          durationMs: Date.now() - startedAt,
        }),
      );
      res.json({ response: text, provider, requestId });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'morning_star_failed',
          requestId,
          provider,
          durationMs: Date.now() - startedAt,
          error: formatLogError(error),
        }),
      );
      captureServerError(error, { requestId, provider });
      res.status(502).json({ error: 'Failed to fetch from secure backend', requestId });
    } finally {
      clearTimeout(timeout);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Long-cache hashed assets (filenames already include a content hash so
    // the browser can keep them indefinitely); never cache index.html so a
    // client always picks up the latest manifest after a deploy.
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        immutable: true,
        maxAge: '1y',
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      }),
    );
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    app.get('*all', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer: Server = app.listen(port, env.host, () => {
    const provider = chooseProvider();
    console.log(`Server running on http://${env.host}:${port}`);
    if (env.host === '0.0.0.0') {
      console.warn(
        'Server is bound to 0.0.0.0; ensure MORNING_STAR_ALLOWED_ORIGINS / MORNING_STAR_ACCESS_TOKEN are configured for shared networks.',
      );
    }
    if (provider) {
      const model = provider === 'openrouter' ? env.openrouterModel : env.geminiModel;
      console.log(`AI provider: ${provider} (model: ${model})`);
    } else {
      console.log('AI provider: not configured (set OPENROUTER_API_KEY or GEMINI_API_KEY)');
    }
  });

  // Graceful shutdown: stop accepting new connections, let in-flight
  // requests finish (longest is /api/morning-star ≈ 60s), then close. This
  // is required for K8s / PM2 / docker stop to roll without dropping
  // requests with 502.
  const gracefulShutdown = (signal: string) => {
    console.info(JSON.stringify({ level: 'info', event: 'shutdown_begin', signal }));
    const forceTimer = setTimeout(() => {
      console.warn(JSON.stringify({ level: 'warn', event: 'shutdown_force', signal }));
      process.exit(1);
    }, env.openrouterTimeoutMs + 5000);
    forceTimer.unref();
    httpServer.close((err) => {
      clearTimeout(forceTimer);
      if (err) {
        console.error(
          JSON.stringify({ level: 'error', event: 'shutdown_error', error: formatLogError(err) }),
        );
        process.exit(1);
      }
      console.info(JSON.stringify({ level: 'info', event: 'shutdown_complete', signal }));
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
