# VECTOR: 矢量人生启航日志

本项目是一个本地优先的矢量人生记录系统，聚焦事件记录、反思沉淀、原则归档，以及通过“启明星”视角生成结构化回信。

当前版本保留了新的布局拆分与测试结构，同时完成基础安全对齐：

- `GEMINI_API_KEY` 仅由服务端读取
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
npm run dev
```

默认地址：

```text
http://localhost:3000
```

## 环境变量

```bash
GEMINI_API_KEY=
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
