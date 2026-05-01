# VECTOR: 矢量人生启航日志

本项目是一个本地优先的矢量人生记录系统，聚焦事件记录、反思沉淀、原则归档，以及通过"启明星"视角生成结构化回信。

当前版本保留了新的布局拆分与测试结构，同时完成基础安全对齐：

- 所有 AI Key 仅由服务端读取（`OPENROUTER_API_KEY` / `GEMINI_API_KEY`）
- Morning Star 通过 `/api/morning-star` 服务端代理调用
- 恢复凭证只保存校验指纹，不保存明文
- 主密码校验支持 PBKDF2 verifier，并兼容旧 hash/旧恢复码

## 环境要求

- Node.js 20+
- npm

## 本地运行

```bash
npm install
cp .env.example .env.local
# 在 .env.local 里至少填一个 AI Key（推荐 OpenRouter，免费）
npm run dev
```

默认地址：

```text
http://localhost:3000
```

## AI 后端

服务端 `/api/morning-star` 同时支持两个 Provider：

| Provider     | Env Key             | 说明                                          |
|--------------|---------------------|-----------------------------------------------|
| OpenRouter   | `OPENROUTER_API_KEY`| 免费模型可用，推荐用于本地测试                |
| Google Gemini| `GEMINI_API_KEY`    | 需要自行申请 GCP/AI Studio Key                |

选择规则：`AI_PROVIDER=openrouter|gemini` 显式指定；未指定时按"哪个 Key 先填了就用哪个"自动选择，OpenRouter 优先。

### 接入 OpenRouter（免费 API）

1. 在 https://openrouter.ai/keys 注册并生成 Key（免费额度即可）
2. 在 `.env.local` 中填入：

   ```bash
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
   # 默认使用 meta-llama/llama-3.3-70b-instruct:free，可改为任意带 :free 后缀的模型
   OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
   ```

3. 重启 `npm run dev`，访问 `http://localhost:3000/api/health` 应当返回：

   ```json
   { "status": "ok", "provider": "openrouter", "model": "..." }
   ```

4. 拉取当前所有 OpenRouter 免费模型列表（用于挑选 / 替换默认模型）：

   ```bash
   curl http://localhost:3000/api/models | jq '.models[].id'
   ```

   或筛选关键字：

   ```bash
   curl -s http://localhost:3000/api/models | jq '.models[] | select(.id | test("llama|qwen|gemini")) | {id, name, context_length}'
   ```

5. 直接打通启明星调用（替代前端 UI）：

   ```bash
   curl -s http://localhost:3000/api/morning-star \
     -H 'Content-Type: application/json' \
     -d '{"prompt":"用 JSON 回我一个 hello world"}'
   ```

> **限速提示**：OpenRouter 免费模型默认 20 req/min、200 req/day，且本服务对 `/api/morning-star` 也有自带 5 req/min 的速率限制（可由 `MORNING_STAR_RATE_LIMIT_*` 调整）。

## 环境变量

```bash
AI_PROVIDER=                 # openrouter | gemini | (留空自动)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
OPENROUTER_REFERER=http://localhost:3000
OPENROUTER_TITLE=VECTOR Life Design Guide
OPENROUTER_TIMEOUT_MS=60000
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
SENTRY_DSN=
PORT=3000
HOST=0.0.0.0
VITE_DEV_PORT=3000
VITE_DEV_HOST=0.0.0.0
```

## 常用命令

```bash
npm run lint
npm test
npm run build
npm audit --package-lock-only
```
