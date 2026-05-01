import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import path from "path";
import { existsSync, readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

function loadEnvFileSafe(filePath: string) {
  if (!existsSync(filePath)) return;
  try {
    const content = readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
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

loadEnvFileSafe(".env.local");
loadEnvFileSafe(".env");

type Provider = "openrouter" | "gemini";

const sanitizeEnv = (value: string | undefined) =>
  value?.trim().replace(/^['"]|['"]$/g, "") || "";

const env = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "0.0.0.0",
  forcedProvider: sanitizeEnv(process.env.AI_PROVIDER).toLowerCase() as Provider | "",
  openrouterKey: sanitizeEnv(process.env.OPENROUTER_API_KEY),
  openrouterModel:
    sanitizeEnv(process.env.OPENROUTER_MODEL) ||
    "google/gemma-3-12b-it:free",
  openrouterReferer:
    sanitizeEnv(process.env.OPENROUTER_REFERER) || "http://localhost:3000",
  openrouterTitle:
    sanitizeEnv(process.env.OPENROUTER_TITLE) || "VECTOR Life Design Guide",
  openrouterTimeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS || 60_000),
  openrouterJsonMode: sanitizeEnv(process.env.OPENROUTER_JSON_MODE).toLowerCase() === "true",
  geminiKey: sanitizeEnv(process.env.GEMINI_API_KEY),
  geminiModel: sanitizeEnv(process.env.GEMINI_MODEL) || "gemini-2.5-flash",
};

function chooseProvider(): Provider | null {
  if (env.forcedProvider === "openrouter" && env.openrouterKey) return "openrouter";
  if (env.forcedProvider === "gemini" && env.geminiKey) return "gemini";
  if (env.openrouterKey) return "openrouter";
  if (env.geminiKey) return "gemini";
  return null;
}

async function callOpenRouter(prompt: string, signal?: AbortSignal): Promise<string> {
  const body: Record<string, unknown> = {
    model: env.openrouterModel,
    messages: [{ role: "user", content: prompt }],
  };
  if (env.openrouterJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${env.openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.openrouterReferer,
      "X-Title": env.openrouterTitle,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error("Empty OpenRouter response");
  }
  return content;
}

async function callGemini(prompt: string): Promise<string> {
  const client = new GoogleGenAI({ apiKey: env.geminiKey });
  const response = await client.models.generateContent({
    model: env.geminiModel,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  return response.text || "";
}

interface FreeModelSummary {
  id: string;
  name: string;
  context_length: number | null;
  description: string;
}

async function fetchOpenRouterFreeModels(): Promise<FreeModelSummary[]> {
  const headers: Record<string, string> = {};
  if (env.openrouterKey) {
    headers.Authorization = `Bearer ${env.openrouterKey}`;
  }

  const response = await fetch("https://openrouter.ai/api/v1/models", { headers });
  if (!response.ok) {
    throw new Error(`Upstream ${response.status}`);
  }
  const data = await response.json();
  const items = Array.isArray(data?.data) ? data.data : [];

  return items
    .filter((model: any) => {
      const id = String(model?.id || "");
      const promptPrice = Number(model?.pricing?.prompt ?? 1);
      const completionPrice = Number(model?.pricing?.completion ?? 1);
      return id.endsWith(":free") || (promptPrice === 0 && completionPrice === 0);
    })
    .map((model: any): FreeModelSummary => ({
      id: String(model?.id || ""),
      name: String(model?.name || model?.id || ""),
      context_length: typeof model?.context_length === "number" ? model.context_length : null,
      description: String(model?.description || "").slice(0, 220),
    }))
    .sort((a: FreeModelSummary, b: FreeModelSummary) => a.id.localeCompare(b.id));
}

async function startServer() {
  const app = express();
  const port = Number.isFinite(env.port) ? env.port : 3000;

  const morningStarLimiter = rateLimit({
    windowMs: Number(process.env.MORNING_STAR_RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.MORNING_STAR_RATE_LIMIT_MAX || 5),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many Morning Star requests. Please try again later." },
  });

  const modelsListLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: "128kb" }));

  app.get("/api/health", (_req, res) => {
    const provider = chooseProvider();
    const model =
      provider === "openrouter"
        ? env.openrouterModel
        : provider === "gemini"
          ? env.geminiModel
          : null;
    res.json({ status: "ok", provider, model });
  });

  app.get("/api/models", modelsListLimiter, async (_req, res) => {
    if (!env.openrouterKey) {
      return res.status(503).json({
        error: "OPENROUTER_API_KEY not configured",
      });
    }

    try {
      const models = await fetchOpenRouterFreeModels();
      res.json({
        provider: "openrouter",
        defaultModel: env.openrouterModel,
        count: models.length,
        models,
      });
    } catch (error) {
      console.error("OpenRouter models list error:", error);
      res.status(502).json({ error: "Failed to fetch OpenRouter models" });
    }
  });

  app.post("/api/morning-star", morningStarLimiter, async (req, res) => {
    const provider = chooseProvider();
    if (!provider) {
      return res.status(503).json({ error: "AI backend is not configured" });
    }

    const { prompt } = req.body;
    if (typeof prompt !== "string" || prompt.trim().length === 0 || prompt.length > 60_000) {
      return res.status(400).json({ error: "Invalid prompt payload" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.openrouterTimeoutMs);

    try {
      const text =
        provider === "openrouter"
          ? await callOpenRouter(prompt, controller.signal)
          : await callGemini(prompt);
      res.json({ response: text, provider });
    } catch (error) {
      console.error(`AI Error (${provider}):`, error);
      res.status(502).json({ error: "Failed to fetch from secure backend" });
    } finally {
      clearTimeout(timeout);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, env.host, () => {
    const provider = chooseProvider();
    console.log(`Server running on http://localhost:${port}`);
    if (provider) {
      const model = provider === "openrouter" ? env.openrouterModel : env.geminiModel;
      console.log(`AI provider: ${provider} (model: ${model})`);
    } else {
      console.log("AI provider: not configured (set OPENROUTER_API_KEY or GEMINI_API_KEY)");
    }
  });
}

startServer();
