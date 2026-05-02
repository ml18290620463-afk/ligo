# Privacy Policy / 隐私政策

> **Plain summary**: VECTOR is local-first. Your journal entries, master
> password, recovery key, attachments, and reflections are stored only in
> your browser (IndexedDB). The only data that leaves your device is the
> single AI prompt you send to "Morning Star" — and only if you have
> configured an AI provider. We keep no user accounts, no analytics, no
> behavioural tracking.

Last updated: 2026-05-02. This document is part of the open-source
distribution of VECTOR (`LICENSE`: MIT) and may be modified by anyone who
self-hosts the application — read this version against the version of the
codebase you actually run.

---

## English

### 1. Who is the controller

For the canonical hosted instance (if any), the publisher of that instance is
the data controller. For self-hosted instances the operator who deployed the
server is the data controller. There is no centralised SaaS operator unless
the deployment manifest explicitly states one.

### 2. What data is processed and where

| Category                                                                 | Where it lives                                                                                                                                                                                                                            | Leaves your device?                           |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Journal entries (`title`, `content`, `tags`, `attachment`, `reflection`) | Your browser's IndexedDB (`vector_master_vault_*`)                                                                                                                                                                                        | **No**, never sent to a server                |
| Master password                                                          | Browser memory while unlocked; never persisted in plaintext anywhere                                                                                                                                                                      | **No**                                        |
| PBKDF2 hash + salt                                                       | Your browser's IndexedDB                                                                                                                                                                                                                  | **No**                                        |
| Recovery key                                                             | Hashed (SHA-256) and stored in IndexedDB                                                                                                                                                                                                  | **No**                                        |
| Attachments (image / video / audio / PDF)                                | IndexedDB as base64 (with a > 5 MB user warning)                                                                                                                                                                                          | **No**                                        |
| AI prompt for Morning Star                                               | Your text content **plus** the persona template is forwarded to the upstream AI provider you configured (OpenRouter or Google Gemini) over HTTPS through the VECTOR backend proxy                                                         | **Yes**, when you click "ENGRAVE" / "REFLECT" |
| Server logs                                                              | Structured JSON written to stdout / your log driver. Includes request id, provider, duration, error class. **API keys and Bearer tokens are scrubbed** by `scrubLogText`. The prompt content itself is not logged (only its byte length). | Stays on the server you deployed              |
| Sentry events (optional)                                                 | Only if `SENTRY_DSN` is set at build time. PII is disabled (`sendDefaultPii: false`); messages and exceptions are scrubbed by `lib/error.ts` before being sent.                                                                           | Yes, to your configured Sentry project        |

We do not embed any third-party analytics scripts, advertising pixels, or
session-replay tooling.

### 3. AI provider transmission

When you trigger Morning Star analysis, the proxy forwards your prompt
verbatim to the chosen provider (default OpenRouter, fallback Google
Gemini). Those providers have their own retention policies — please read
[OpenRouter privacy](https://openrouter.ai/privacy) and
[Google Generative Language API privacy](https://ai.google.dev/terms)
before submitting personal information you would not want a third-party
LLM operator to process.

We refuse a request before forwarding it whenever the prompt matches our
prompt-injection guard (`server/promptEnvelope.ts`). The guard raises
`HTTP 400 INJECTION` and the prompt never reaches the upstream provider.

### 4. Retention

- **Journal data**: retained until you delete it. Wiping browser storage
  (Settings → "Wipe Data" or browser site-data clearing) is irreversible.
- **Server logs**: depends on the deployment. The reference Docker image
  uses Docker's default `json-file` log driver; operators are encouraged
  to rotate or pipe to a centralised log system with a finite retention
  window.
- **AI provider logs**: out of our control; consult the provider.

### 5. Your rights

Because there is no centralised account, exercising classical GDPR / CCPA
rights (access, rectification, erasure, portability) is performed
client-side:

- **Access / portability**: Settings → "Export Star Map" produces a JSON
  backup of every entry.
- **Erasure**: Settings → "Wipe Data" removes everything in the local
  vault. To purge any historical AI-provider records, contact the
  upstream provider directly using the email tied to your API key.
- **Rectification**: edit or delete entries inside the app.

For self-hosted instances, please contact the operator you trust with
your API key for any queries about server-side logs.

### 6. Children

VECTOR is not directed at children under 16. Operators in the EU should
verify the age of their users before allowing AI calls; do not deploy
without that check.

### 7. Security

See [`SECURITY.md`](./SECURITY.md) for vulnerability disclosure.

### 8. Changes

Material changes to this policy will be reflected in `CHANGELOG.md` under
the corresponding release version.

---

## 中文（参考翻译，文本歧义以英文为准）

### 1. 数据控制者

如有官方托管实例，由该实例的发布方担任数据控制者；自托管实例由部署服务的
运营方担任数据控制者。除非部署清单另有说明，VECTOR 项目本身不运营任何
集中式 SaaS。

### 2. 数据范围与位置

| 类别                                         | 存储位置                                                                             | 是否离开设备                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| 日记条目（标题 / 正文 / 标签 / 附件 / 反思） | 浏览器 IndexedDB                                                                     | **否**                            |
| 主密码                                       | 解锁期间存在浏览器内存；不以明文持久化                                               | **否**                            |
| PBKDF2 hash + salt                           | 浏览器 IndexedDB                                                                     | **否**                            |
| 恢复密钥                                     | SHA-256 哈希后存入 IndexedDB                                                         | **否**                            |
| 附件（图 / 视频 / 音频 / PDF）               | IndexedDB（base64，超 5 MB 会软提醒）                                                | **否**                            |
| Morning Star prompt                          | 通过 VECTOR 后端代理转发给你配置的上游 AI（OpenRouter / Gemini）                     | **是**，仅在你点击"刻录 / 反思"时 |
| 服务端日志                                   | 结构化 JSON。**自动脱敏 API key / Bearer token**；仅记录 prompt 字节长度，不记录原文 | 保留在你部署的服务器              |
| Sentry 事件（可选）                          | 仅当 `SENTRY_DSN` 在构建期被设置时启用，PII 已关闭                                   | 上送到你配置的 Sentry 项目        |

### 3. AI 上游传输

触发 Morning Star 时，prompt 会原样转发到所选上游模型。请阅读
[OpenRouter 隐私](https://openrouter.ai/privacy) 与
[Google Generative Language API 条款](https://ai.google.dev/terms)
后再提交敏感个人信息。

如果 prompt 命中我们的注入防护（`server/promptEnvelope.ts`），请求会以
`HTTP 400 INJECTION` 拒绝，**不会**抵达上游。

### 4. 留存

- **日记数据**：保留到你主动删除为止。"Wipe Data"或清除站点数据**不可恢复**。
- **服务端日志**：取决于部署方式。建议轮转或上传到带保留窗口的集中式日志系统。
- **AI 上游日志**：超出我们控制，请联系上游服务商。

### 5. 用户权利

由于没有集中账号，GDPR / CCPA 等权利由客户端代为完成：

- **访问 / 导出**：设置 → "导出星图"生成 JSON 备份。
- **删除**：设置 → "Wipe Data"清空本地保险库；要删除上游 AI 留存请直接
  联系对应服务商。
- **更正**：在应用内编辑或删除条目。

### 6. 儿童

VECTOR 不面向 16 岁以下儿童。欧盟运营方在允许 AI 调用前应核实用户年龄。

### 7. 安全

漏洞披露请见 [`SECURITY.md`](./SECURITY.md)。

### 8. 变更

重大变更会记入 `CHANGELOG.md`。
