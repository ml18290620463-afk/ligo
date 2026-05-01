import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  const morningStarLimiter = rateLimit({
    windowMs: Number(process.env.MORNING_STAR_RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.MORNING_STAR_RATE_LIMIT_MAX || 5),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many Morning Star requests. Please try again later.' },
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(express.json({ limit: "128kb" }));

  // API 路由 - 占位或后续服务器逻辑
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post('/api/morning-star', morningStarLimiter, async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY?.trim()?.replace(/['"]/g, '') || '';

      if (typeof prompt !== 'string' || prompt.trim().length === 0 || prompt.length > 60000) {
        return res.status(400).json({ error: 'Invalid prompt payload' });
      }

      if (!apiKey) {
        return res.status(503).json({ error: 'AI backend is not configured' });
      }

      const geminiClient = new GoogleGenAI({ apiKey });
      const response = await geminiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      res.json({ response: response.text || '' });
    } catch (error) {
      console.error('Gemini API Error:', error);
      res.status(502).json({ error: 'Failed to fetch from secure backend' });
    }
  });

  // Vite 开发/生产中间件配置
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number.isFinite(port) ? port : 3000, host, () => {
    console.log(`Server running on http://localhost:${Number.isFinite(port) ? port : 3000}`);
  });
}

startServer();
