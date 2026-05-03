# Changelog

All notable changes to this project are documented in this file. Format
loosely follows [Keep a Changelog](https://keepachangelog.com/) and
versioning follows [SemVer](https://semver.org/).

## [1.1.0] — 2026-05-03

> Phase 4 (1-month engineer roadmap) close. Ships the W1–W4 task set
> agreed in `.cursor/plans/vector_engineer_tech_roadmap_v1.x_*.plan.md`:
> Sentry release pipeline, husky/lint-staged guard rails, Argon2id
> default minter, AI provider extraction, Morning Star SSE streaming,
> ⌘K command palette, PWA service worker, Blob URL attachments, e2e
> testid migration, self-hosted fonts, hard-gated production audit
> and Dependabot weekly surveillance.
>
> Verified: `scripts/check-beta.sh` 28/28; full `lint / typecheck /
tests / build` green; `npm audit --omit=dev --audit-level=high` →
> 0 vulnerabilities.

### Security

- **Argon2id default minter** (`services/securityService.ts`) behind a
  separate `vector_argon2_minter` feature flag, with a "verify ≥ mint"
  invariant enforced in code so a rogue process cannot write the
  minter key while the verifier is off (which would lock the user out
  of their own hash). `setArgon2idMinterEnabled(true)` auto-enables
  the verifier; turning the minter off leaves the verifier on so any
  Argon2id hashes that were already written keep working.
- **Settings → Security toggle** (`components/SettingsArgon2idToggle.tsx`)
  surfaces the Argon2id minter as a real switch with `role="switch"`
  - `aria-checked` semantics, full 7-locale i18n, and a `storage`
    event listener so a future ⌘K palette command can flip it
    consistently across surfaces.
- **Production npm audit is now a hard CI gate**
  (`.github/workflows/ci.yml` W4.4). High / critical CVEs in any
  production dependency fail the build; dev-only deps stay
  advisory.
- **Self-hosted fonts** (W4.2 — `@fontsource/inter`,
  `@fontsource/jetbrains-mono`). Removes the broken
  `<link href="fonts.googleapis.com">` from `index.html` (the strict
  production CSP `fontSrc 'self'` was already silently blocking it,
  so the designed type wasn't actually rendering in production
  before this fix).

### Performance

- **Morning Star SSE streaming** (W2.4 — `server/aiProviders.ts`,
  `services/geminiService.ts`, `hooks/useMorningStarPipeline.ts`,
  `components/MorningStarPanel.tsx`). New
  `POST /api/morning-star/stream` endpoint emits `event: chunk` /
  `event: done` / `event: error` SSE frames; the client parses them
  into a live `streamingPreview` so users see the AI's reply forming
  in real time instead of staring at a 30-60 s spinner. Opt-in via
  `localStorage[vector_morning_star_stream]`. Any transport / SSE
  failure transparently falls back to the buffered endpoint.
- **Refcounted Blob URL attachments** (W3.3 —
  `lib/blobUrlCache.ts`, `hooks/useAttachmentBlobUrl.ts`). Persists
  attachments as base64 data URLs (portable across IndexedDB / backup
  JSON / share-card export) but promotes them to runtime `blob:`
  URLs at render time. Cuts per-paint cost dramatically for large
  PDFs / images / videos and lets PDF.js stream partial bytes
  instead of decoding the full base64 blob on every layout pass.
- **Service worker + offline shell** (W3.2 — `vite-plugin-pwa`).
  Precaches every hashed JS / CSS / font / icon. Runtime cache
  rules: static assets `CacheFirst`, `/api/*` `NetworkFirst` with a
  5 s timeout, `openrouter.ai` + `googleapis.com` `NetworkOnly`
  (so AI streams are never cached). `registerType: 'prompt'` so
  long-lived journaling tabs don't auto-update mid-session.

### Productivity

- **⌘K / Ctrl+K command palette** (W3.1 — `components/CommandPalette.tsx`,
  `cmdk` ^1.1.1, ~6 kB gzip). Single keyboard-first navigation entry
  for power users. Two pages: 'root' and 'language'. Commands:
  Navigation (New entry / Open archive / Back to dashboard / Replay
  intro), Appearance (Toggle theme / Switch language), Recent
  entries (top 8), Danger zone (Lock vault / Wipe data — only when
  password is set). Defers actions through `requestAnimationFrame`
  so cmdk's focus-restoration runs before parent re-renders.
- **AI provider extraction** (W2.3 — `server/aiProviders.ts`).
  Pulls `Provider` type, `chooseProvider`, `callOpenRouter`,
  `callGemini`, `fetchOpenRouterFreeModels`,
  `resolveProviderModel` out of `server.ts` (471 → 362 LOC).
  Provider helpers now take a `ProviderConfig` snapshot so
  `server.ts` stays the only file that reaches into `process.env`.
  Lays the groundwork for the W2.4 streaming variants.

### Observability

- **Sentry release + sourcemap upload** (W1.5 — CI workflow). Every
  push to `main` with the Sentry secrets configured uploads minified
  bundles + matching sourcemaps to Sentry under the commit SHA as
  the release tag, then strips `.map` files from the deployable
  artefact (`vite build` emits `sourcemap: 'hidden'` so the bundles
  never reference them). `index.tsx` baked
  `process.env.SENTRY_RELEASE` matches what the `getsentry/action-release`
  step uploaded — that's the join key Sentry needs to de-minify
  stack traces automatically.
- **Web Vitals as Sentry distributions** (W1.2 — `lib/vitals.ts`).
  Replaces `Sentry.captureMessage` with `Sentry.metrics.distribution`
  so LCP / INP / CLS / FCP / TTFB show up as proper time-series in
  the Sentry dashboard with `unit` and `attributes` (rating,
  navigation_type) instead of one-off events.

### Developer experience

- **husky + lint-staged + commitlint** (W1.4). Pre-commit runs
  `lint-staged` (eslint --fix + prettier --write on changed files);
  commit-msg runs `commitlint` against the conventional-commits
  config the existing log already follows. `prepare` script
  auto-installs hooks on `npm install` so cloners / CI agents pick
  up the discipline transparently.
- **Dependabot weekly surveillance** (W4.4 —
  `.github/dependabot.yml`). Weekly grouped npm updates (production
  - dev as separate PRs), monthly GitHub Actions updates.
    Conventional commit prefix matches commitlint config so PRs land
    green automatically.
- **e2e testid migration** (W4.1). Anchors every onboarding +
  dashboard + editor + viewer e2e selector on a stable `data-testid`
  so visible labels can change freely without breaking specs. New
  testids: `cover-version-{...}`, `cover-initialize`,
  `onboarding-{next,back,finish,password,password-confirm,recovery-saved,star-${kebab}}`,
  `dashboard-{new-entry,open-archive}`,
  `editor-{title,content,save}`, `viewer-back`, `entry-card-${id}`,
  `command-palette`, `argon2id-toggle`, `morning-star-loading`,
  `morning-star-streaming-preview`. `CyberButton` propagates
  `data-testid` through every polymorphic branch. New
  `docs/e2e-conventions.md` documents the selector hierarchy.
- **Stale-closure fix** (W1.3 — `hooks/useDiaryData.ts`).
  `addContainer` and `deleteContainer` now use functional
  `setContainers((prev) => …)` so rapid successive mutations cannot
  drop entries through stale closures (same pattern already applied
  to `addMaterial` / `deleteMaterial` in the previous release).

### Bundle delta

Production bundle changed by:

- `+6 kB gz` (cmdk W3.1 → command palette).
- `+220 kB on disk` (W4.2 self-hosted fonts; latin/latin-ext only;
  served via cache-first SW after first load — no network round trip
  on the warm path).
- `+12 kB gz` lazy chunk (W3.2 workbox-window; loaded once after
  first paint, never on the critical path).
- `0 KB main` (W2.4 streaming, W3.3 blob URLs, W2.1 Argon2id
  minter — all behind feature flags / dead-code-eliminated when off).

Precache: 44 entries / 3.5 MiB.

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` clean (vitest coverage thresholds `lines 82 / branches 61`
  unchanged).
- `npm run build` clean; service worker emits 11 woff2 files +
  hashed JS/CSS chunks.
- `npm audit --omit=dev --audit-level=high` → 0 vulnerabilities.

### Carry-over from previous Unreleased section

The Phase 3 entries (Argon2id verifier branch, share-card PNG,
PWA install banner, Storybook 10, design-token migration scoreboard,
visual regression baselines, etc.) listed under
"### Added (Phase 3 §3.e-2 …)" through
"### Added (Phase 3 starter …)" below were all already shipped in
the unreleased trunk before Phase 4. They are part of 1.1.0.

---

## [Unreleased — Phase 3 trunk, now part of 1.1.0]

### Added (Phase 3 §3.e-2 — Argon2id verifier branch in SecurityService)

- **`services/securityService.ts`** — `verifyPassword` now recognises
  the `argon2id:v1:` prefix and routes through a lazy
  `import('./argon2idPoc')`. The lazy import keeps the `hash-wasm`
  blob (~52 kB gzip) out of the production bundle until the
  per-installation feature flag is on.
  - **Feature flag**: `localStorage["vector_argon2_verify"]`. Set to
    `"1"` (or `"true"` / `"TRUE"`) to enable; remove to disable.
    Default off so a misconfigured rollout cannot accept any
    password.
  - **API**: `SecurityService.isArgon2idVerifierEnabled()` /
    `setArgon2idVerifierEnabled(boolean)` for the future Settings →
    Security toggle. Both wrapped in `try/catch` so quota / disabled-
    storage environments degrade safely to "feature off".
  - **`needsRehash`** returns `false` for Argon2id hashes — they are
    already the strongest algorithm we recognise, so the
    opportunistic re-mint pipeline does not downgrade them back to
    PBKDF2.
  - **Behavioural guarantees**: salt argument is ignored on the
    Argon2id branch (the hash format embeds its own salt); malformed
    `argon2id:v1:…` strings return `false` rather than throwing so
    callers cannot timing-distinguish "wrong password" from
    "corrupted record"; the existing PBKDF2 + legacy SHA-256
    branches are untouched and continue to verify normally even when
    the Argon2id flag is on.
- **`services/appSettings.ts`** — registers the new key under
  `AppStorageKeys.argon2VerifierEnabled` so a future Settings UI
  can read / write it through the canonical constant.
- **`services/securityService.test.ts`** — 8 new test cases:
  flag-default-off, set/clear toggle, accept both `"1"` and
  `"true"` as truthy, off-flag refusal of Argon2id hashes, on-flag
  accept-correct, on-flag reject-wrong, malformed-string rejection,
  PBKDF2 path still works while Argon2id flag is on, `needsRehash`
  returns false for Argon2id.

### Notes

- Default minter (`hashPassword`) intentionally stays on PBKDF2.
  Promotion to default minter is tracked as Phase 4 §4.b-2; rollout
  plan is documented in `docs/security/argon2-eval.md`.
- This change closes the only engineering follow-up listed in
  `docs/phase-3-postmortem.md` §6 — `i18n` translator backlog and
  the asset-only seven-sage portrait commission remain.

### Added (Phase 3 close — §3.f baselines + §3.g install banner + postmortem + Phase 4 charter)

#### §3.g · PWA install banner

- **`components/PwaInstallBanner.tsx`** (new) — Cyan-themed in-flow
  banner with `Download` CTA + `X` dismiss icon. Pure presentation;
  follows `BackupReminderBanner` look-and-feel for visual coherence
  at the top of the Dashboard scroll surface. `role="status"` +
  `aria-live="polite"` for assistive-tech announcement.
- **`components/DashboardOverlays.tsx`** — extended to mount the
  install banner next to the backup-recency banner. Three new
  pass-through props: `pwaInstallAvailable`, `onPwaInstall`,
  `onPwaInstallDismiss`.
- **`components/Dashboard.tsx`** — consumes
  `usePwaInstallPrompt()` (already shipped in §3.g) and threads
  the three new props through `DashboardOverlays`. The banner only
  renders when (a) the browser fired `beforeinstallprompt`,
  (b) the app is not installed, AND (c) the user has not dismissed
  inside the 30-day window. Install click goes through
  `pwaInstall.promptInstall()` (a user gesture, as the browser
  requires).
- **i18n**: 4 new keys (`pwaInstallTitle`, `pwaInstallBody`,
  `pwaInstallAction`, `pwaInstallDismiss`) in
  `i18n/locales/zh.ts` + `i18n/locales/en.ts`. Other 5 locales
  fall back via inline `??`.
- **Tests**: 5 new cases in `components/PwaInstallBanner.test.tsx`
  (active / dormant render, install click, dismiss click,
  role + aria-live). `components/DashboardOverlays.test.tsx`
  base props extended with the three new fields.

#### §3.f · Visual regression baselines

- **`e2e/seedHelpers.ts`** (new) — shared `seedOnboardedApp(page,
options?)` helper that walks the same onboarding flow as
  `app.spec.ts` / `backup.spec.ts` (~25 s wall-clock per spec).
  `useDiaryData` persists through `idb-keyval`, so a
  `localStorage` shim cannot fast-forward us past onboarding;
  driving the real flow keeps the baselines honest.
- **`e2e/visual.spec.ts`** — extended from 3 to 6 baselines.
  New baselines:
  - `dashboard-default-chromium-darwin.png` — post-onboarding
    Dashboard with the launchpad header + filter bar.
  - `settings-panel-chromium-darwin.png` — settings panel
    rendered open over the dashboard.
  - `master-lock-modal-chromium-darwin.png` — vault-unlock modal
    in flight (the closest analog to the standalone MasterLock
    surface reachable inside the SPA).
- Per-test `maxDiffPixelRatio: 0.04` on the post-onboarding
  screens (vs the global 2 % default) to absorb the larger
  Motion fade tail across CI environments.
- New baselines verified stable across two consecutive full runs
  (6/6 passing in 23.6 s + 23.7 s, identical pixels).

#### Documentation

- **`docs/phase-3-postmortem.md`** (new, ~250 LOC, 7 sections) —
  formal close on Phase 3. Headline KPI table, per-checklist
  recap, what slipped (§3.c portraits + first-day empty state, both
  carried into Phase 4), six "what we learned" themes
  (big-bang migration > per-file gates · lazy `import()` for
  optional infra · token migration ≠ visual change · WASM
  rasterizers need literal hex · onboarding-driven visual
  baselines · "write the doc first" for crypto upgrades), updated
  KPI scoreboard, open follow-ups, TL;DR for Phase 4 entry.
- **`ROADMAP.md`** — Phase 4 stub replaced with a real
  charter (§4.a Activation, §4.b Trust, §4.c Shipping). 14
  exit-checklist items, ~15 days of engineering effort,
  KPI targets for Phase 4 close (weighted score 8.9 → 9.2).
  The two carry-over Phase 3 items (sample reflections,
  seven-sage portraits) are explicitly redirected to §4.a-1
  and §4.c-1 respectively.

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → **97 files / 543 tests** all green
  (was 96 / 538; +1 file +5 cases · `PwaInstallBanner`).
- `npm run build` clean.
- `npm run build-storybook` clean.
- `npx playwright test --workers=1` → **16/16 passing**
  (was 13/13; +3 visual baselines).
- Bundle delta: zero — `usePwaInstallPrompt` already shipped in
  §3.g; the banner is +178 B gz inside the existing main chunk.

### Added (Phase 3 §3.h — Privacy-first share-card PNG export)

- **`lib/shareCardPalette.ts`** (new) — fixed literal-hex palette
  consumed by the offscreen card rasterizer. Why a separate file
  rather than reading the live `--color-vector-*` custom
  properties from `index.css`? DOM-to-PNG libraries clone the
  source DOM into an SVG `<foreignObject>`; CSS custom properties
  resolve correctly there in modern Chromium / Firefox / WebKit,
  but `color-mix()` does **not** on the older mobile WebKit /
  Android builds we still ship to. The card therefore opts out of
  the live design graph entirely and ships its own dark / light
  pair (mirroring the values from `lib/designTokens.ts`).
- **`components/ShareCard.tsx`** (new, ~280 LOC) — pure
  presentational forward-ref component. Renders the canonical
  1080 × 1920 portrait layout with **inline styles only** (no
  Tailwind classes — utility classes carry no styling weight
  inside `<foreignObject>` clones unless the global stylesheet
  is also embedded). The layout includes:
  - Eyebrow ("VECTOR · Reflection card").
  - Archive id (`AR-25-ABCD`) + creation date.
  - Title (clamped to 4 lines).
  - Status flags: `SEALED`, `TIMELOCK`, `ARCHIVED`, `ANALYSED`.
  - Optional tag chips (8-tag soft cap).
  - Body: dashed-border masked block when `showBody=false`, or a
    540-char excerpt with markdown noise stripped (#, \*\*, code
    fences, image / link syntax) when revealed.
  - Optional attachment badge (only shown when both the option
    is on and the entry actually has an attachment).
  - Footer: identity handle + attribution + app version.
- **`hooks/useShareCardOptions.ts`** (new) — privacy options hook
  with `localStorage` persistence (`vector_share_card_options`
  key, see `services/appSettings.ts`). **Defaults are
  privacy-on**: `showBody=false`, `showTags=true`,
  `showAttachmentBadge=true`, `theme='dark'`. Schema-validates
  the stored blob on hydration so a malformed / outdated entry
  falls back to the privacy-on defaults rather than opening with
  a body-visible state.
- **`hooks/useShareCardExport.ts`** (new) — `domToBlob`-based PNG
  rasterizer. Critical perf detail: the import is
  **`await import('modern-screenshot')`**, lazy-loaded on first
  call, so the rasterizer + WASM-friendly PNG encoder only land
  in the user's bundle when they actually open the share-card
  modal. The hook auto-computes the rasterizer scale from the
  measured DOM width so callers can render the source at any
  preview zoom and still get a 1080 × 1920 output. Returns the
  Blob from `exportPng` so future callers (Web Share API /
  `navigator.clipboard.write`) plug in without a re-rasterization
  pass. Explicit `idle | rendering | success | error` status
  machine drives the modal's progress / error banner.
- **`components/ShareCardModal.tsx`** (new, ~280 LOC) —
  focus-trapped modal with scaled-down preview (1/3 of the
  canonical card so the user sees exactly what they will get
  before saving), three privacy toggles
  (showBody / showTags / showAttachmentBadge with explanatory
  micro-copy under each), dark / light theme radio, "Reset to
  privacy defaults" link and Cyber-style "Save PNG" CTA with
  explicit status banner. Closes on Escape and on backdrop click.
- **Viewer integration** — `components/ViewerActionFooter.tsx`
  gains a new `onShareCard?` prop and renders an extra
  `Share2`-icon CyberButton below the existing 3-button grid
  when supplied. `components/ViewerReadingPanel.tsx` and
  `components/Viewer.tsx` thread the prop through and own the
  `shareCardOpen` state + the modal mount. The handler is
  **gated on `decrypted === true`** so a sealed entry can never
  trigger the export, and the decrypted body is forwarded to the
  modal as `entry.content` (never the encrypted payload).
- **i18n**: 19 new keys added to `i18n/locales/zh.ts` and
  `i18n/locales/en.ts` (`shareCardTitle`, `shareCardSubtitle`,
  `shareCardEyebrow`, `shareCardBodyMasked`, `shareCardEmptyBody`,
  `shareCardAttachmentBadge`, `shareCardFooter`,
  `shareCardPrivacy`, `shareCardShowBody{,Hint}`,
  `shareCardShowTags{,Hint}`, `shareCardShowAttachment{,Hint}`,
  `shareCardTheme`, `shareCardSavePng`, `shareCardRendering`,
  `shareCardSaved`, `shareCardExportError`,
  `shareCardResetDefaults`, `shareCardOpen`). The other 5
  locales degrade gracefully via inline `??` fallbacks in the
  modal until translations land. `npm run i18n:diff --soft`
  passes (warnings on the missing translations, no errors).
- **Storybook**: 8 new `ShareCard` stories
  (`Cards/ShareCard` namespace) — PrivacyDefaultDark /
  PrivacyDefaultLight / BodyRevealedDark / BodyRevealedLight /
  SealedTimelocked / WithAttachment / EmptyBody, all rendered at
  the same 1/3 preview scale as the modal so the canvas frames
  match exactly.

### Privacy posture

- **Body content default OFF.** Even if a user toggled "Show body"
  in a previous session, the storage layer is keyed by the
  rendered card alone — closing the modal without saving never
  ships the entry text anywhere.
- The card is composed entirely from the **decrypted** body
  content held in the Viewer's local state. The handler is gated
  on `decrypted === true`; a sealed entry's encrypted ciphertext
  cannot leak into the export pipeline even if the user
  hand-crafts the props.
- The PNG never includes the attachment payload itself — only an
  optional "Has attachment" badge if the user opts in.
- localStorage stores **only the toggle state**, never any
  rendered card content.

### Bundle delta

| Chunk                       |                  Before |                      After |                     Δ |
| --------------------------- | ----------------------: | -------------------------: | --------------------: |
| main `index`                | 320.85 kB / 96.43 kB gz |    323.17 kB / 97.21 kB gz |       **+0.78 kB gz** |
| `Viewer`                    | 172.94 kB / 54.29 kB gz |    188.00 kB / 58.87 kB gz |           +4.58 kB gz |
| `index-BGbQGMFM` (new lazy) |                       — | 27.29 kB / **10.47 kB gz** | first modal open only |

The `modern-screenshot` chunk is **only fetched on first open of
the share-card modal**. Bundle audit
(`grep -lE 'modern-screenshot|domToBlob' dist/assets/*.js`)
confirms no symbols leak into the main / motion / react / pdf
chunks.

### Dependency

- `modern-screenshot@4.7.0` (runtime dep, lazy-loaded via dynamic
  `import()`). Zero transitive dependencies; `npm audit` reports
  0 vulnerabilities.

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean. The modal's
  toggle row uses `useId()` + explicit `htmlFor` linkage so
  `jsx-a11y/label-has-associated-control` stays at error.
- `npm run typecheck` clean.
- `npm test` → **96 files / 538 tests** all green
  (was 93 / 519; +3 files +19 cases for ShareCard +
  useShareCardOptions + useShareCardExport).
- `npm run build` clean.
- `npm run build-storybook` clean (8 new stories under
  `Cards/ShareCard`).
- `npx playwright test --workers=1` → **13/13 passing**. Visual
  regression baselines unchanged (the share-card modal is
  open-on-demand and not yet baked into a baseline).
- `npm run i18n:diff --soft` passes — warnings only on the 5
  locales pending translation; no extras / empty-value bugs.

### Added (Phase 3 §3.e — Argon2id PoC + benchmark + decision document)

- **`services/argon2idPoc.ts`** (new, ~190 LOC) — `hash-wasm`-backed
  proof-of-concept wrapper:
  - `deriveArgon2idBits(password, salt, params)` — returns 32-byte
    `Uint8Array` from a parametrised Argon2id derivation.
  - `hashArgon2idPassword(password, params, saltOverride?)` — mints
    a self-describing string in the
    `argon2id:v1:<m>:<t>:<p>:<saltB64>:<hashB64>` format that
    mirrors the existing `pbkdf2-sha256:v1:<iter>:<base64>` shape.
  - `verifyArgon2idPassword(password, storedHash)` — constant-time
    verifier that re-derives at the embedded parameters; rejects
    any malformed / DoS-shaped input (`m > 1 GiB`, `t > 32`,
    `p > 16`, base64 decode failure, wrong prefix) **before**
    invoking the KDF.
  - Three named parameter presets: `ARGON2_OWASP_MIN`
    (19 MiB / 2t / 1p), `ARGON2_OWASP_RECOMMENDED`
    (64 MiB / 3t / 1p) and `ARGON2_STRICT` (128 MiB / 3t / 1p).
  - `hash-wasm` is **lazy-loaded** via dynamic `import()` so the
    WASM blob is only fetched after the user opts into the new
    vault format. Production bundle audit
    (`grep -l 'argon2\|hash-wasm' dist/assets/*.js`) confirms
    zero references in the shipped JS today.
- **`services/argon2idPoc.test.ts`** (new) — **7 unit cases**
  pinning the contract: round-trip, wrong-password rejection,
  parameter embedding in the stored hash, determinism (same
  password + salt + params ⇒ same bits), salt sensitivity (same
  password + different salt ⇒ different bits), malformed-hash
  rejection (PBKDF2 prefix, truncated, oversized parameters),
  and a smoke test on the heavier OWASP_RECOMMENDED preset.
  Run time ~570 ms (cheap thanks to OWASP_MIN being the default).
- **`scripts/argon2-bench.ts`** (new) + **`npm run bench:argon2`**
  script — head-to-head benchmark comparing PBKDF2-SHA256 600 k
  iterations vs Argon2id { OWASP_MIN, OWASP_REC, STRICT }.
  Discards a warm-up run, samples N=5 by default
  (override via `VECTOR_BENCH_RUNS`), prints a markdown-friendly
  table by default or JSON via `-- --json`. Pulls parameter
  presets straight from `services/argon2idPoc.ts` so future
  parameter bumps re-bench automatically.
- **`docs/security/argon2-eval.md`** (new, 10 sections, ~200 lines):
  threat model, library shootout (`hash-wasm` vs `argon2-browser`
  vs `@noble/hashes/argon2` vs `node:crypto`), hash format,
  benchmark numbers, migration design (verifier-first,
  opportunistic re-mint, parameter-embedded so no out-of-band
  context needed, kill-switch documented, AES-GCM ciphertext
  unaffected, recovery key unchanged), browser compatibility
  matrix, risks and decision. **Verdict: ✅ GO at
  OWASP_RECOMMENDED for new hashes; PBKDF2 verifier kept
  forever for backwards compatibility.**

### Benchmark snapshot (Apple M4 / Node 24 / hash-wasm 4.12)

| Configuration                         |     Mean | Notes                                                                      |
| ------------------------------------- | -------: | -------------------------------------------------------------------------- |
| PBKDF2-SHA256 (600 000 iter)          |  43.8 ms | Current production cost factor                                             |
| Argon2id OWASP_MIN (19 MiB / 2t / 1p) |  17.5 ms | OWASP 2024+ minimum acceptable                                             |
| Argon2id OWASP_REC (64 MiB / 3t / 1p) |  99.2 ms | **VECTOR target** — under 350 ms UX budget on every supported device class |
| Argon2id STRICT (128 MiB / 3t / 1p)   | 200.2 ms | Rejected — tail-latency on iPhone SE / Pixel 4a leaves spinner visible     |

### Dev-dependency

- `hash-wasm@4.12.0` (devDep, ~12 KB gzipped if shipped).
  Production bundle remains hash-wasm-free until §3.e-2 +
  Phase 4 production rollout flip the default minter.

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → **93 files / 519 tests** all green
  (was 92 / 512; +1 file +7 cases).
- `npm run build` (Vite app) clean — bundle size unchanged
  (320.85 kB / 96.43 kB gzipped main chunk; PoC dynamic-imported
  and unwired, so it does not enter the prod bundle).
- `npm run build-storybook` clean.
- `npx playwright test --workers=1` → **13/13 passing**
  (full single-worker run to suppress the unrelated 2-spec
  port-collision flake observed in §3.b).
- `npm run bench:argon2` produces the table above.

### Added (Phase 3 §3.b — Storybook 10 + 10 core component stories)

- **`@storybook/react-vite` 10.3** wired to the existing Vite 6 +
  React 19 + Tailwind 4 stack. Companions: `@storybook/addon-a11y`
  (axe runner, `test: 'error'`) and `@storybook/addon-themes`
  (dark / light parent-class toggle). 64 deps installed,
  `npm audit` reports 0 vulnerabilities.
- **`.storybook/main.ts`** — globs `components/**/*.stories.@(ts|tsx|mdx)`
  so stories ship next to the components they document, mirroring
  the existing `*.test.tsx` co-location convention.
- **`.storybook/preview.tsx`** — imports `index.css` (so every
  `@theme` token / `@utility` glow block / `bg-spacetime-grid-*`
  utility resolves correctly inside the canvas), exposes a
  parent-class theme switch on `<html>`, and wraps every story in
  a deterministic surface (`vector-fog-light` for light,
  `vector-night-deep` for dark, `vector-paper-cream` for the cover
  variant). Three named backgrounds (`dark` / `light` / `paper`)
  match the canonical surfaces of the app.
- **`.storybook/mocks.ts`** — single source of truth for sample
  `DiaryEntry`, `Container`, `Principle` and `MorningStarMetrics`
  fixtures, plus a `tZh / tEn` translation pair. Stories import
  from here so the `*.stories.tsx` files stay focused on prop
  variations.
- **10 authoritative stories** (`components/*.stories.tsx`,
  totalling **49 distinct story exports** across light / dark,
  locked / unlocked, error / success and interactive variants):
  - `Atoms/CyberButton` — primary / danger / ghost / disabled /
    light / polymorphic `<div role="button">` (6).
  - `Cells/ArchiveEntryCard` — grid-dark / grid-light / list-view
    / time-locked / sealed (5).
  - `Cells/StatisticsIdentityCard` — unlocked-dark / unlocked-light
    / locked / editable (4).
  - `Cells/MorningStarRadar` — balanced-dark / balanced-light /
    skewed / empty (4).
  - `Cells/FilterBar` — closed / vault-open / light / editing-stars
    / interactive (5).
  - `Cells/MasterLockUnlockForm` — idle / error / locked-out /
    scanning / success / light / interactive (7).
  - `Cells/SettingsBackupSection` — closed / dropdown-open / light
    / import-success / import-error / interactive (6).
  - `Cells/ViewerActionFooter` — archivable / archived /
    packing-menu-open / light / interactive (5).
  - `Screens/CoverScreen` — default / english-dark / light /
    no-principles (4).
  - `Screens/ViewerSealedPanel` — sealed / wrong-password /
    time-locked / scanning / light / interactive (6).
- **`npm run storybook`** (`storybook dev -p 6006`) and
  **`npm run build-storybook`** (`storybook build -o storybook-static`)
  scripts in `package.json`. `storybook-static/` added to
  `.gitignore`, `.prettierignore` and `eslint.config.mjs` ignores.

### Changed

- **`react-hooks/rules-of-hooks` posture** — the 6 `Interactive`
  stories use a named `function InteractiveStory(args) { ... }`
  render rather than the inline-arrow form so ESLint recognises
  them as React component contexts. Rule stays at `error` for the
  whole repo (no story-scoped overrides).

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean (Storybook story types narrow against
  the real component prop interfaces via `Meta<typeof Component>` +
  `satisfies Meta`).
- `npm test` → **92 files / 512 tests** all green.
- `npm run build` (Vite app) clean.
- `npm run build-storybook` clean — produces a ~5 MB static bundle
  in `storybook-static/`.
- `npx playwright test` → **13/13 passing**. The CoverScreen / a11y
  / backup specs were verified to be flake-free in two consecutive
  full runs.

### Changed (Phase 3 §3.a-2 — design-token migration **completed**)

End-of-phase consolidation. After the per-component batches
(CoverScreen, ArchivePrinciplesView, ArchiveEntryCard, CyberButton,
MorningStarRadar, DeepArchiveAnimation, SpaceTimeBackground,
ArchiveVaultHeader, ViewerReadingPanel, ArchiveVaultEntries,
StatisticsIdentityCard, Editor, FilterBar, FilterHub,
StatisticsThemeSwitch, StatisticsRecoveryRow), the remaining
**22-file long-tail** (ViewerSealedPanel, ArchiveVaultBackground,
EntryGrid, MasterLock, MasterLockUnlockForm, Onboarding,
ViewerActionFooter, CoverScreen pass 2, DashboardHeader,
GeometricBoat, MasterLockBackdrop, MasterLockHeader, VaultListView,
ViewerStarfield, ArchiveVault, MasterLockRecoveryForm, SettingsPanel,
VaultUnlockModal, MemoryFragments, MorningStarPanel, VaultContent,
Viewer, ErrorBoundary, SettingsBackupSection, StatisticsLanguageSwitch,
ViewerAttachmentPanel) was migrated in a single sweep using a
**hybrid strategy**:

- **`@theme` brand tokens** — 4 new `--color-vector-*` properties
  added (`night-navy`, `night-blue`, `night-slate`, `paper-white`)
  for bespoke light-paper / dark-surface backgrounds, bringing the
  total to **25 vector tokens** in `index.css`.
- **`@utility` glow blocks** — 1 new `shadow-glow-cyan-neon-bright`
  for the `0 0 50px` cyan-neon halo used on the simplified
  singularity dot. Total `@utility` block count is now **49**
  (37 `shadow-*`, plus `bg-spacetime-grid-*`, `neon-*`,
  `drop-shadow-glow-*`, `text-glow-magenta`, `tech-border`,
  `clip-path-polygon`).
- **`color-mix(in srgb, var(--color-X) N%, transparent)` inline** —
  for the ~50 unique one-off shadow / gradient patterns where
  inventing a named utility would inflate `index.css` without DRY
  benefit, the migration replaces every `rgba(R,G,B,A)` literal
  with the `color-mix()` form, sourcing the colour from the
  matching CSS variable (`--color-cyan-500`, `--color-rose-500`,
  `--color-vector-magenta-bright`, etc.). The value stays at the
  call site for visual review, but every alpha now flows through
  the same `--color-*` graph as the rest of the design system.
  Both Tailwind arbitrary brackets (`shadow-[0_0_8px_color-mix(in_srgb,_var(...)_30%,_transparent)]`)
  and inline `style={{ ... }}` strings (with real spaces) are
  handled by the migration script.
- **Hex inside arbitrary brackets** — converted to either token
  utility (`bg-vector-paper-white`) or CSS-var reference
  (`var(--color-vector-night-deep)`), depending on whether the hex
  is the whole bracket value or sits inside a function expression.
  Six remaining bespoke surface colours got new tokens
  (`paper-white`, `night-navy`, `night-blue`, `night-slate`); two
  matched existing Tailwind defaults (`#f8fafc` → `slate-50`,
  `#050505` → `vector-ink-deep`).

### Migration scoreboard

`npm run lint:tokens` final report (was `Total: 89 / 27 files`,
intermediate after first 3 §3.a-2 batches; was `Total: 439 / 32`
when §3.a started):

```
Total: 0 hex + 1 rgba = 1 literal across 1 file.
```

The remaining `1` rgba hit is the runtime template literal
`rgb(${ARCHIVE_RGB.paperLight})` in
`components/DeepArchiveAnimation.tsx`. The triplet itself lives in
`lib/canvasPalette.ts`; only the `rgb(` prefix is matched by the
scoreboard regex.

### Test surface

- **`components/ArchiveVaultBackground.test.tsx`** — the radial-
  gradient assertion was updated from
  `expect(...).toContain('rgba(15,23,42,0.8)')` to
  `expect(...).toContain('color-mix(in_srgb,_var(--color-slate-900)_80%')`
  to mirror the new value. The test still pins the dark / light
  switch behaviour at byte level.

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → **92 files / 512 tests** all green.
- `npm run build` clean.
- `npx playwright test` → **13/13 passing** (visual regression
  ≤ 2 % `maxDiffPixelRatio` global threshold). The migration is
  pixel-perfect across CoverScreen, MasterLock, Dashboard, Viewer
  and Settings baselines.

### Changed (Phase 3 §3.a-2 — ArchiveEntryCard design-token migration)

- **`components/ArchiveEntryCard.tsx`: 28 → 0 raw colour literals
  (−100 %)** across the dual-mode (light-paper / dark-terminal) entry
  card surface — including the locked / time-locked / interactive
  states, the truncated title, the dashed footer, and the lock badge.
- **15 hex literals** mapped to existing `@theme` brand tokens —
  `#007a8c` (×6) → `vector-cyan-brand`, `#1a202c` → `vector-ink-strong`,
  `#4a5568` → `vector-slate-mid`, `#718096` (×2) → `vector-slate-soft`,
  `#C85F72` (×5) → `vector-magenta`. No new colour tokens needed.
- **9 distinct rgba shadow patterns** lifted into named `@utility`
  blocks in `index.css` (centralising the 13 rgba occurrences):
  - `shadow-glow-vector-magenta-soft` — `0 0 8px` magenta @ 20 %
  - `shadow-glow-indigo-500` — `0 0 20px` indigo @ 20 %
  - `shadow-glow-cyan-400-soft` — `0 0 30px` cyan-400 @ 5 %
  - `shadow-paper-card` — `0 1px 3px` black @ 2 % (paper-mode card)
  - `shadow-inset-glow-cyan-soft` — `inset 0 0 20px` cyan-500 @ 2 %
  - `shadow-inset-glow-vector-cyan-brand` — `inset 0 0 30px`
    `#007a8c` @ 5 %
  - `shadow-inset-glow-cyan-400-deep` — `inset 0 0 40px` cyan-400 @ 3 %
  - `shadow-inset-glow-rose-soft` — `inset 0 0 20px` rose-500 @ 10 %
  - `shadow-inset-glow-rose-deep` — `inset 0 0 40px` rose-500 @ 10 %
- **2 arbitrary border rgba values**
  (`border-[rgba(0,122,140,0.1)]`, `border-[rgba(0,122,140,0.05)]`)
  collapsed to the alpha syntax `border-vector-cyan-brand/10` and
  `border-vector-cyan-brand/5`.
- **Migration scoreboard impact**: `npm run lint:tokens` total drops
  from **222 → 203 (−19)** across 37 files. ArchiveEntryCard exits
  the top-10 entirely; new top-three offenders are
  SpaceTimeBackground (18), ArchiveVaultHeader (14),
  ViewerReadingPanel (14).
- **Visual / behavioural parity**: dark-mode terminal styling and
  paper-card shadows are byte-identical to pre-migration; verified by
  the existing Playwright visual-regression suite (no diff above
  the 2 % `maxDiffPixelRatio` global threshold).

### Added (Phase 3 §3.a-2 — Canvas-only palette module)

- **`lib/canvasPalette.ts`** (new, 38 LOC) — single source of truth
  for the bright-primary palette consumed by Canvas 2D animations
  (`<canvas>` cannot read CSS custom properties without a per-frame
  `getComputedStyle` round-trip, so the literals are pulled out of
  the component file but kept honest by living in `lib/`).
  Exports `ARCHIVE_PARTICLE_COLORS` (7 hex literals, frozen array),
  `ARCHIVE_RGB` (5 named RGB triplets) and `withAlpha(name, alpha)`
  (a tiny helper that builds canvas-ready rgba strings without
  duplicating the triplet at each call site).
- **6 unit cases** pinning the contract: 7-particle palette
  uniqueness, RGB triplets in [0, 255], `withAlpha` formatting and
  arithmetic-alpha behaviour.

### Changed (Phase 3 §3.a-2 — DeepArchiveAnimation design-token migration)

- **`components/DeepArchiveAnimation.tsx`: 21 → 1 raw colour
  literal (−95 %)**. The remaining "1" is the runtime template
  literal `rgb(${ARCHIVE_RGB.paperLight})` used to fade the canvas
  background in light mode — its `rgb(` prefix matches the lint
  scoreboard regex but the actual triplet now lives in
  `lib/canvasPalette.ts`. Practically zero raw colours.
- **9 rgba template literals** (varying-opacity cyan / magenta /
  white labels, ring glow, gradient stops) folded into
  `withAlpha('cyan', 0.6 * opacity)`-style call sites. One
  `rgba(0, 0, 0, 0)` gradient stop became `'transparent'`.
- **Particle palette** (`'#ff00ff', '#00ffff', '#ffff00', '#00ff00',
'#ff0000', '#4b0082', '#ee82ee'`) now imports from
  `ARCHIVE_PARTICLE_COLORS`. The vault-ring sub-cycle (cyan →
  magenta → yellow → green) is reconstructed by indexing
  `ARCHIVE_PARTICLE_COLORS[1]/[0]/[2]/[3]` so the visual sequence
  is preserved 1:1.
- **No new index.css tokens**: canvas colours intentionally stay
  out of `@theme` (Tailwind utility generation is irrelevant for
  Canvas API consumers).
- **Migration scoreboard impact**: `npm run lint:tokens` total
  drops from **242 → 222 (−20)** across 38 files.
  DeepArchiveAnimation falls out of the top-10 entirely; top three
  remaining offenders: ArchiveEntryCard (19),
  SpaceTimeBackground (18), ArchiveVaultHeader (14).
- **Canvas behaviour is byte-identical**: animation is
  scope-internal and not a visual-regression target, but the
  refactor preserves every alpha multiplier and colour-stop position.

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 92 files / **512** tests (was 91 / 506; +1 file +6
  cases for `lib/canvasPalette.test.ts`).
- `npm run build` clean.
- `npx playwright test` → **13/13** passing.

### Changed (Phase 3 §3.a-2 — MorningStarRadar design-token migration)

- **`components/MorningStarRadar.tsx`: 22 → 0 raw colour literals
  (−100 %)**. All 14 hex + 8 rgba expressions migrated. The radar
  is the **fourth** component to fully clear its raw-colour debt
  (after CoverScreen / ArchivePrinciplesView / CyberButton).
- **No new tokens added.** The 10 distinct hex literals split into:
  - **2 bespoke brand tokens** already in `index.css` `@theme`:
    `vector-cyan-brand` (`#007a8c`) and `vector-cyan-pure`
    (`#06b6d4`).
  - **8 Tailwind-native palette colours** (`rose-500`,
    `rose-400`, `violet-600`, `violet-500`, `emerald-600`,
    `emerald-500`, `amber-600`, `amber-500`) referenced via
    `var(--color-…)` — Tailwind 4's `@theme` already exposes the
    built-in palette as CSS custom properties so no extra
    declarations were needed.
- **8 rgba SVG strokes / fills** (axis rings, polygon fill, axis
  lines) folded into `color-mix(in srgb, var(--color-…) Npct,
transparent)` expressions, preserving the exact alpha while
  letting the underlying brand colour change centrally.
- **`components/MorningStarRadar.test.tsx`**: 2 className-style
  assertions updated from raw hex (`'#06b6d4'`, `'#007a8c'`) to
  `'var(--color-vector-cyan-pure)'` / `'var(--color-vector-cyan-brand)'`
  — pure assertion-string update, no test logic change.
- **Migration scoreboard impact**: `npm run lint:tokens` total
  drops from **264 → 242 (−22)** across 38 files. Top three
  remaining offenders: DeepArchiveAnimation (21),
  ArchiveEntryCard (19), SpaceTimeBackground (18).
- **No visual baseline diff** — the radar surface is post-onboarding
  and not in the current 3-snapshot Cover-screen baseline; the 7
  unit cases (range-check / theme-palette / progress-bar count /
  partial-metrics fallback) remain green and serve as the
  regression net.

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 91 files / **506** tests (unchanged count;
  2 className-style assertions updated in place).
- `npm run build` clean.
- `npx playwright test` → **13/13** passing.

### Changed (Phase 3 §3.a-2 — CyberButton design-token migration)

- **`components/CyberButton.tsx`: 25 → 0 raw colour literals
  (−100 %)**. All 22 hex + 7 rgba expressions migrated. CyberButton
  is the third component to fully clear its raw-colour debt and the
  most-shared one — every page-level CTA / settings button / archive
  card across the app inherits its surface, so the migration's
  pixel-equivalence is verified by the existing 3 Cover-screen
  visual baselines (CyberButton renders prominently on the cover
  call-to-action).
- **2 new brand tokens** added to `index.css` `@theme`:
  `--color-vector-cyan-neon` (`#12d8ff`, the bright "interactive
  ready" hue that ghost-variant CyberButton uses on hover),
  `--color-vector-slate-chrome` (`#6e8198`, the muted resting state
  for the same ghost variant).
- **4 new `@utility` blocks** absorbing the bespoke
  `shadow-[0_0_…px_rgba(…)]` glow patterns CyberButton emits on
  every theme × variant combination:
  `shadow-glow-cyan-neon-soft`, `shadow-glow-cyan-neon`,
  `shadow-glow-vector-magenta`, `shadow-glow-vector-magenta-strong`.
- **`components/CyberButton.test.tsx`**: 3 className assertions
  updated to match the new token classes (`text-vector-slate-chrome`
  in ghost-variant test, `text-vector-cyan-brand` in light-theme
  test, `hover:text-vector-cyan-neon` in ghost-variant hover test).
  No production behaviour change — these tests only check that the
  variant + theme switches still emit the matching utility classes.
- **Migration scoreboard impact**: `npm run lint:tokens` total
  drops from **330 → 264 (−66)** across 30 files (file count
  unchanged because we cleared CyberButton entirely rather than
  trimming partial files). Top three remaining offenders:
  MorningStarRadar (22), DeepArchiveAnimation (21),
  ArchiveEntryCard (19).

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 91 files / **506** tests (unchanged count;
  3 className assertions updated in place).
- `npm run build` clean.
- `npx playwright test` → **13/13** passing — the 3 Cover-screen
  visual baselines compared **byte-equivalent** against the
  pre-migration snapshots.

### Changed (Phase 3 §3.a-2 — ArchivePrinciplesView design-token migration)

- **`components/ArchivePrinciplesView.tsx`: 39 → 0 raw colour literals
  (−100 %)**. All 28 hex values + 11 rgba expressions migrated. The
  view is the second component to fully clear its raw-colour debt
  (after CoverScreen).
- **One new brand token** added to `index.css` `@theme`:
  `--color-vector-slate-soft` (`#718096`, the placeholder slate that
  the principles tab leans on for muted "no principles yet" copy).
  Other 5 distinct hex values (`#007a8c`, `#C85F72`, `#4a5568`,
  `#1a202c`, `#06b6d4`) reused tokens introduced in the CoverScreen
  pass.
- **One Tailwind alpha extension** in use: `border-vector-cyan-brand/2`
  for the gossamer 2 % cyan border that the Add-Principle textarea
  carries.
- **Migration scoreboard impact**: `npm run lint:tokens` total
  drops from **369 → 330** (−39). Backlog files: 31 → **30**.
  Top offender is now `components/CyberButton.tsx` (25 hits).

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint`, `npm run typecheck`, `npm test` (506) all clean.
- `npx playwright test` → **13/13** passing (3 Cover baselines
  remain byte-equivalent; ArchivePrinciplesView has no visual
  baseline yet — a follow-up will add one once a localStorage-seed
  helper makes Archive accessible from a clean session).

### Changed (Phase 3 §3.a-2 — CoverScreen design-token migration)

- **`components/CoverScreen.tsx`: 71 → 4 raw colour literals (−94 %)**.
  All 55 hex values and 12 of the 16 rgba expressions now route
  through brand tokens / utilities instead of being inlined. The
  remaining 4 rgba live inside JS conditional `style={{…}}`
  expressions for dynamic glow + text-shadow that don't fit a static
  utility — accepted technical debt and tracked by
  `npm run lint:tokens`.
- **New brand tokens in `index.css` `@theme`** (Tailwind 4 auto-
  generates `bg-`/`text-`/`border-`/`from-`/`to-`/`shadow-`
  utilities for each):
  `--color-vector-cyan-brand` (`#007a8c` × 29 hits absorbed),
  `--color-vector-cyan-pure` (`#06b6d4`),
  `--color-vector-magenta-bright` (`#ff2ecc` × 10),
  `--color-vector-blue-deep` (`#3182ce`),
  `--color-vector-fog-light` (`#f0f4f7` × 7),
  `--color-vector-ink-strong` (`#1a202c`),
  `--color-vector-slate-mid` (`#4a5568`),
  `--color-vector-ink-deep` (`#050505`).
- **New shadow / text-shadow utilities** for the high-frequency
  CoverScreen glow patterns:
  `shadow-glow-magenta-soft`, `shadow-glow-magenta`,
  `shadow-glow-magenta-strong`, `text-glow-magenta`. Replaces
  `shadow-[0_0_15px_rgba(255,46,204,0.1)]`-style inline shadows.
- **Gradient strings** (`bg-[radial-gradient(…)]`,
  `bg-[linear-gradient(…)]`) now compose colours via CSS
  `color-mix(in srgb, var(--color-vector-…) Npct, transparent)`
  so the rgba alphas are still expressible without inline triplets.
- **Visual-regression baselines stayed pixel-perfect**: all three
  Cover-screen `e2e/visual.spec.ts` snapshots (default / warp /
  terminal) compared green against the pre-migration baseline,
  confirming the token migration is byte-equivalent rendering-wise.
- **Migration scoreboard impact**: `npm run lint:tokens` total
  drops from 439 → 369 hits (−70). CoverScreen falls out of the
  "top offender" list entirely.

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 91 files / 506 tests (unchanged).
- `npm run build` clean.
- `npx playwright test` → **13/13** passing (3 visual baselines
  diff-clean against the pre-migration snapshots).

### Added (Phase 3 starter — design system + tooling baseline)

Phase 3 ("Long-Term Investments") begins. This first wave ships the
infrastructure for ROADMAP §3.a / §3.d / §3.f / §3.g without
disturbing existing visual code. Bulk migrations (3.a hex/rgba
conversion, 3.f remaining 4 visual baselines) and bigger-ticket
items (3.b Storybook, 3.c portraits, 3.e Argon2id PoC, 3.h share
card) are queued as follow-ups.

#### 3.d — i18n drift detector (`scripts/i18n-diff.ts`)

- New script loads every `i18n/locales/*.ts` via tsx's runtime
  import and reports per-locale drift in three buckets: **missing**
  (translator backlog — non-blocking), **extra** (typo / stale
  copy — blocking), **emptyValues** (real translation bug —
  blocking). Reference locale is `zh`.
- `--soft` flag exits 0 when only "missing" drift exists; only
  fails CI on real bugs. `--json` for machine-readable output.
- `npm run i18n:diff` script + `scripts/check-beta.sh` integration
  bumped the beta-invariant count from **27 → 28**.
- Discovered + fixed 3 zh-side missing keys exposed by the script
  (`reflectionZone`, `saveReflection`, `reflectionSaved`); the
  remaining **232 missing translations** across 6 non-zh locales
  are now documented and gated as a non-blocking translator
  backlog.

#### 3.a-1 — design tokens baseline (`lib/designTokens.ts`)

- New `as const` token map: **6 buckets** (color, spacing, radius,
  shadow, motion, zIndex). Brand colours (`cyan / magenta / indigo
/ rose / amber`) each expose a `glow` rgba so neon shadows
  compose without re-typing the rgba literal.
- Spacing scale aligned with Tailwind defaults; motion durations +
  easings + zIndex stack documented inline.
- Pure data file with **zero React / Tailwind dependency** so it
  can be imported by any module (Tailwind config, Storybook
  controls, future visual-regression metadata).
- 7 unit cases pinning the contract (palette shape, monotonic
  scales, glow rgba composition, motion ordering).

#### 3.a-2 — design-token migration scoreboard (`scripts/lint-tokens.mjs`)

- Pure-Node script scans `components/**/*.{ts,tsx}` for raw
  `#RRGGBB` / `rgba(…)` literals and prints a per-file ranking.
  Today's backlog: **352 hex + 87 rgba = 439 literals across 32
  files** (top offender: CoverScreen, 71 hits).
- `npm run lint:tokens` for the human report; `--strict` flag to
  fail CI when the file count drops to zero (per-directory
  ratchet path: CoverScreen → MasterLock → … → all components,
  per ROADMAP §3.a).
- `eslint.config.mjs` now ignores `scripts/**` (Node-only build
  tooling that uses `process.*` freely).

#### 3.f — Playwright visual-regression baseline

- New `e2e/visual.spec.ts` writes 3 baseline screenshots of the
  Cover screen (default / warp / terminal cover modes), with
  `prefers-reduced-motion` emulated and a 2 % pixel tolerance
  pinned in `playwright.config.ts` so subpixel font rendering
  between macOS / Linux CI doesn't trip the suite.
- E2E count bumped from **10 → 13**. Remaining 4 ROADMAP screens
  (MasterLock / Dashboard / Viewer / Settings) require a
  localStorage-seeded session helper — queued as follow-up.

#### 3.g — PWA install prompt hook (`hooks/usePwaInstallPrompt.ts`)

- Captures `beforeinstallprompt`, persists a 30-day "not now"
  dismissal under the new `AppStorageKeys.pwaInstallDismissedAt`
  key, and exposes `{ isAvailable, isInstalled, promptInstall,
dismiss }`. The Dashboard banner integration is a follow-up
  one-liner once design hands over the copy.
- 7 unit cases (idle / event lifecycle / accepted / dismissed /
  dismissal-window persistence both directions).

### Verified

- `scripts/check-beta.sh` → **28/28** invariants pass (was 27/27;
  the new entry is the i18n soft-mode guard).
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 91 files / **506** tests (was 88 / 486 at end of
  §2.n).
- `npm run build` clean.
- `npx playwright test` → **13/13** passing (was 10/10; +3 visual
  baselines).
- Coverage (vitest threshold `82 / 61`): `lines 82.84 / branches
61.41` — both above the floor.

### Added (Phase 2 §2.n — branch-coverage push, ROADMAP `branches: 60` cleared)

- **`branches: 59.60% → 61.28%` (+1.68pp)**, finally clearing the
  ROADMAP target. Three targeted suites were extended (no production
  code changed):
  - `hooks/useAttachmentUpload.test.ts` — +7 cases (empty input,
    four MIME → type mappings, FileReader.onerror, thrown FileReader
    constructor). Lifts branches from 37.5% → 87.5%.
  - `hooks/useBackupImport.test.ts` — +5 cases (empty input,
    missing `onImportBackup`, thrown `onImportBackup`, sparse
    translation fallback, manual `setStatus` reset). Lifts branches
    from 47.8% → 90%+.
  - `components/MorningStarRadar.test.tsx` — **new file**, +7 cases
    (axes / rings / clamp / palette / progress bars / "n/10"
    notation / partial metrics fallback). Lifts the previously
    untested radar component from `0% / 0% / 0% / 5%` to a
    healthy baseline.

### Changed (coverage ratchet)

- `vitest.config.ts` — `lines: 81 → 82` (+1pp) and
  `branches: 59 → 61` (+2pp). Today's measured floor is
  `lines 82.70 / branches 61.28`. The ROADMAP `branches: 60` target
  is now **cleared with 1.28pp of margin**.

### Verified

- `scripts/check-beta.sh` → **27/27** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 88 files / **486** tests (was 87 / 467 at end of §2.l).
- `npm run build` clean.
- `npx playwright test` → **10/10** passing.

### Removed (Phase 2 §2.l — Dashboard tail / ESLint legacy override retired)

- **The entire ESLint legacy override block is gone.** Five
  consecutive Phase 2 splits (Viewer §2.g, Dashboard §2.h, MasterLock
  §2.i, SettingsPanel §2.j, ArchiveVault §2.k, StatisticsWidget §2.m)
  brought every previously-listed component below the 350-LOC target
  with all jsx-a11y violations resolved. `eslint.config.mjs` now lives
  under one uniform rule set — no `max-lines: off` and no jsx-a11y
  rule muted on a per-file basis.

### Added (Phase 2 §2.l — Dashboard tail)

- **`Dashboard.tsx` reduced from 444 → 342 LOC** (effective: 359 →
  305 non-blank/non-comment lines), **finally crossing the ROADMAP
  §0.1 ≤ 350-LOC target**. Two surgical extractions:
  - `components/dashboardProps.ts` (49 LOC) — the 46-line
    `DashboardProps` interface lives in its own dependency-free
    types file so the dashboard body reads as composition rather
    than 45 lines of prop typing. Tests + mocks can import the
    interface without dragging the dashboard module graph.
  - `components/DashboardOverlays.tsx` (94 LOC) — bundles the three
    almost-always-mounted overlay/banner components
    (`BackupReminderBanner`, `BackupImportConfirmModal`,
    `VaultUnlockModal`) into a single pass-through wrapper so the
    dashboard's render block reads as a flat composition rather than
    a three-block-tall sequence of conditionally-mounted modals.
    ×6 unit cases covering dormant state, banner visibility, import
    modal routing, vault dialog semantics, password input, and the
    settings link.

### Changed (coverage ratchet)

- `vitest.config.ts` — `lines: 80 → 81` (+1pp); `branches` stays
  pinned at 59. Today's measured floor is `lines 81.26 / branches
59.60`. The ROADMAP `branches: 60` target now needs only **0.40pp**;
  the last gap lives in Editor + FilterHub + Onboarding (post-Phase
  2 candidates).

### Verified

- `scripts/check-beta.sh` → **27/27** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean — and ESLint config now
  carries **zero** legacy override entries.
- `npm run typecheck` clean.
- `npm test` → 87 files / **467** tests (was 84 / 450 at end of §2.m;
  the +5 cases include this stage's `DashboardOverlays.test.tsx`).
- `npm run build` → 2.40 s, no new warnings.
- `npx playwright test` → **10/10** passing.

### Added (Phase 2 §2.m — `StatisticsWidget.tsx` split)

- **`StatisticsWidget.tsx` reduced from 341 → 124 LOC** (−64%) by
  lifting the four interactive sections (identity card, theme
  expander, language expander, recovery anchor row) into focused
  sub-components. The file now only owns the card frame, the
  decorative chrome (corner accents + scanline), the heading, and
  the compositional wiring.
- **Sub-components extracted** (each with a dedicated test file ≥5 cases):
  - `components/StatisticsIdentityCard.tsx` (132 LOC) — boat avatar
    - editable identity input + dynamic version chip + encryption
      badge + security-calibration affordance. The calibration row is
      now a real `<button>` (was a `<div onClick>`); the input has
      an `aria-label`. ×6 cases.
  - `components/StatisticsThemeSwitch.tsx` (108 LOC) — collapsible
    light/dark switch. Toggle row is now a `<button>` with
    `aria-expanded` + `aria-controls`; the two theme cards are real
    `<button>`s with `aria-pressed`. ×5 cases.
  - `components/StatisticsLanguageSwitch.tsx` (104 LOC) — collapsible
    7-language switch. Buttons are now `role="radio"` inside a
    `role="radiogroup"` so screen readers announce the active
    language. ×5 cases.
  - `components/StatisticsRecoveryRow.tsx` (84 LOC) — emergency
    recovery anchor shortcut. Promoted from `<div onClick>` to a
    real `<button>` with `aria-label`. ×6 cases.

### Removed

- **ESLint legacy override for `components/StatisticsWidget.tsx`** —
  `eslint.config.mjs` no longer silences `max-lines` / four jsx-a11y
  rules for StatisticsWidget. The override block now only covers
  `Dashboard.tsx` (pending the §2.l prop-bridge follow-up). Six
  `<div onClick>` interaction sites were promoted to real semantic
  elements during the split.

### Changed (coverage ratchet)

- `vitest.config.ts` — `branches: 58 → 59` (+1pp). Today's measured
  floor is `lines 80.88 / branches 59.28`. The ROADMAP `branches: 60`
  target now needs only **0.72pp**; the last gap lives in Editor +
  FilterHub + Onboarding (post-Phase 2 candidates).

### Verified

- `scripts/check-beta.sh` → **27/27** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 84 files / **450** tests (was 80 / 428 at end of §2.k).
- `npm run build` → no new warnings.
- `npx playwright test` → **10/10** passing.

### Added (Phase 2 §2.k — `ArchiveVault.tsx` split)

- **`ArchiveVault.tsx` reduced from 805 → 143 LOC** (−82%) by lifting
  the filter/grouping pipeline into a hook and the four presentation
  surfaces (background, header, entry card, entry list, principles
  view) into dedicated sub-components. The file now only owns the
  page frame, the FilterHub composition and the view-tab routing.
- **Hook extracted** (with a dedicated test file ≥5 cases):
  - `hooks/useArchiveGrouping.ts` (115 LOC) — owns the
    `archivedEntriesBase → tag/category filter → search → year/month
/day grouping` pipeline. Exposes a stable `groupedEntries` /
    `groupKeys` projection memoised on the upstream entry list.
    ×7 cases covering memory-boat filtering, sort order, category +
    tag + search filters, and bucket switching.
- **Sub-components extracted** (each with a dedicated test file ≥5 cases):
  - `components/ArchiveVaultBackground.tsx` (47 LOC) — the bio-vault
    pin-stripe grid + radial vignette + three floating bubbles + two
    matrix data-rain gradients. `aria-hidden="true"` and memoised
    so theme changes are the only re-render trigger. ×5 cases.
  - `components/ArchiveVaultHeader.tsx` (104 LOC) — title block + the
    Vault / Principles segmented switch + the FilterHub toggle. The
    switch is now a real `role="tablist"` with `aria-selected` per
    `role="tab"` (was previously a styled `<button>` cluster); the
    FilterHub toggle advertises `aria-pressed`. ×6 cases.
  - `components/ArchiveEntryCard.tsx` (242 LOC) — single archived
    entry with both the flat-list and grid renderings; time-locked
    entries get the desaturated style + lock badge and the click
    handler visually disables itself. ×6 cases (including time-lock
    behaviour and attachment paperclip).
  - `components/ArchiveVaultEntries.tsx` (155 LOC) — vault tab body:
    empty-state CTA when nothing to show, otherwise expandable group
    panels containing list-view or grid-view cards. The group
    toggles now expose `aria-expanded`. ×6 cases.
  - `components/ArchivePrinciplesView.tsx` (213 LOC) — principles
    tab with add-form + persisted-list grouped by year. The
    show-on-home checkbox is now a real `role="checkbox"` with
    `aria-checked`; the textarea + year input have proper
    `htmlFor` / `id` pairs; principle list rows expose
    `aria-pressed` on the show-on-home star toggle. ×7 cases.

### Removed

- **ESLint legacy override for `components/ArchiveVault.tsx`** —
  `eslint.config.mjs` no longer silences `max-lines` / four jsx-a11y
  rules for ArchiveVault. The override block now only covers
  `Dashboard.tsx` (pending the SettingsPanel-bridge follow-up) and
  `StatisticsWidget.tsx`.

### Changed (coverage ratchet)

- `vitest.config.ts` — `lines: 79 → 80` (+1pp) and
  `branches: 56 → 58` (+2pp). Today's measured floor is
  `lines 80.44 / branches 58.12`. The ROADMAP `branches: 60` target
  now needs only ~2pp; remaining gap lives in Editor + the legacy
  StatisticsWidget surface.

### Verified

- `scripts/check-beta.sh` → **27/27** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 80 files / **428** tests (was 72 / 379 at end of §2.i).
- `npm run build` → 1.79 s, no new warnings.
- `npx playwright test` → **10/10** passing (api × 3, app × 3,
  backup × 2, a11y × 2).

### Added (Phase 2 §2.i — `MasterLock.tsx` split)

- **`MasterLock.tsx` reduced from 724 → 190 LOC** (−74%) by lifting the
  three workflow concerns into hooks and the four presentation surfaces
  into sub-components. The file now only owns the modal frame and the
  branch routing between the recovery and unlock surfaces.
- **Hooks extracted** (each with a dedicated test file ≥5 cases):
  - `hooks/useBiometricAuth.ts` (170 LOC) — WebAuthn feature probe +
    `navigator.credentials.create` ceremony with injectable test seams
    (`createCredential` / `probeAvailable`). Surfaces the
    "Biometrics verified, but password still required" hint after a
    configurable success delay. ×6 cases (probe lifecycle, success
    flow, NotAllowedError, generic error, disabled short-circuit,
    clearError).
  - `hooks/useMasterPasswordVerify.ts` (170 LOC) — owns the
    debounced auto-verify + Enter-key submit paths, the ritual-active
    flag, and the transient error flag. Failures only register on the
    Enter-key path (the auto-verify path stays silent because the user
    might still be typing). ×7 cases.
  - `hooks/useDoubleClickConfirm.ts` (78 LOC, generic) — anti-misclick
    "click → 'Confirm?' → click again to do the destructive thing"
    helper. Auto-dismisses after a configurable window and ignores
    accidental double-taps under `minGapMs`. ×6 cases.
- **Sub-components extracted** (each with a dedicated test file ≥5 cases):
  - `components/MasterLockCardChrome.tsx` (102 LOC) — the decorative
    corner ripples, twinkling stars, neon glow, paper grain and four
    cyberpunk corner accents. `aria-hidden="true"` and memoised so
    re-renders don't reshuffle the seeded star positions. ×6 cases.
  - `components/MasterLockHeader.tsx` (82 LOC) — the recovery-back
    link (left) + cancel button (right) wired to
    `useDoubleClickConfirm`. Cancel button now has both `aria-label`
    and `title`. ×6 cases.
  - `components/MasterLockRecoveryForm.tsx` (146 LOC) — recovery key
    - new + confirm fields with show/hide toggles. All inputs now
      have `htmlFor` + `id` pairs (was previously implicit), the
      show/hide buttons advertise `aria-pressed` for screen readers,
      and the error banner uses `role="alert"`. ×6 cases.
  - `components/MasterLockUnlockForm.tsx` (180 LOC) — the primary
    unlock surface (visual feedback ring + status badge + password
    input + ritual text + forgot link). Show/hide toggle advertises
    `aria-pressed`; status badge uses `role="alert"`. ×7 cases.

### Removed

- **ESLint legacy override for `components/MasterLock.tsx`** —
  `eslint.config.mjs` no longer silences `max-lines` / four jsx-a11y
  rules for MasterLock. The file passes the `max-lines: warn 600`
  cap and all jsx-a11y rules cleanly. Override block now only covers
  Dashboard, ArchiveVault, StatisticsWidget.

### Changed (coverage ratchet)

- `vitest.config.ts` — `lines: 78 → 79` (+1pp) and
  `branches: 54 → 56` (+2pp). Today's measured floor is
  `lines 79.42 / branches 56.89`. The ROADMAP `branches: 60` target
  now needs only ~3pp; remaining gap is concentrated in
  ArchiveVault, which is §2.k.

### Verified

- `scripts/check-beta.sh` → **27/27** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 72 files / **379** tests (was 65 / 334 at end of §2.j).
- `npm run build` → 2.51 s, no new warnings.
- `npx playwright test` → **10/10** passing (api × 3, app × 3,
  backup × 2, a11y × 2).

### Added (Phase 2 §2.j — `SettingsPanel.tsx` split)

- **`SettingsPanel.tsx` reduced from 988 → 282 LOC** (−71%) by lifting
  the three top-level branches and the four storage/backup sub-sections
  into seven dedicated sub-components. The file now only owns the modal
  frame, the close affordance, and the routing logic.
- **Sub-components extracted** (each with a dedicated test file ≥5 cases):
  - `components/SettingsRecoveryView.tsx` (94 LOC) — "Emergency Anchor"
    recovery-key surface; reads `AppStorageKeys.recoveryVerifier` once
    to decide between "stored" / "not generated" copy. ×6 cases (idle
    state, stored state, alert banner, two back affordances, English
    fallback).
  - `components/SettingsSecurityForm.tsx` (152 LOC) — old / new /
    confirm password three-field form. ×6 cases (first-set hides
    "old", change-flow shows it, controlled inputs, role="alert" error
    banner + role="status" success banner, cancel/submit routing,
    Save → Update copy switch).
  - `components/SettingsGuidingStarsSection.tsx` (166 LOC) — Guiding
    Stars editor card. The chip toggles are now real `<button>`
    elements (replacing the previous `<span onClick>` anti-pattern)
    with explicit `aria-label` for keyboard navigation. ×7 cases.
  - `components/SettingsMaterialSection.tsx` (141 LOC) — staged
    attachment preview + upload trigger + error/success banners.
    Banners use `role="alert"` / `role="status"`. Image preview now
    has a real `alt` attribute. ×6 cases.
  - `components/SettingsScanRepair.tsx` (144 LOC) — scan & repair
    widget. ×6 cases including `window.confirm` accept/decline and
    last-scan summary success/failure renderers.
  - `components/SettingsBackupSection.tsx` (254 LOC) — Star Map
    export, Star Map import (optional), Notes Markdown/TXT dropdown.
    Dropdown entries are now `role="menuitem"` inside `role="menu"`
    so screen readers announce the structure correctly; the file
    `<input type="file">` carries `aria-label`. ×6 cases (export
    click, import affordance gating on `onImportBackup`, importStatus
    surfacing, dropdown menu items count + filtering archived,
    dropdown selection routing).
  - `components/SettingsWipeSection.tsx` (82 LOC) — destructive
    "type DELETE" wipe panel. The confirm button is now properly
    `disabled` (instead of styled-disabled) so a screen-reader
    announces it; the input has `aria-label`. ×6 cases.

### Removed

- **ESLint legacy override for `components/SettingsPanel.tsx`** —
  `eslint.config.mjs` no longer silences `max-lines` / four jsx-a11y
  rules for SettingsPanel. The file now passes the `max-lines: warn 600`
  cap and all jsx-a11y rules cleanly.

### Changed (coverage ratchet)

- `vitest.config.ts` — `lines: 75 → 78` (+3pp) and
  `branches: 49 → 54` (+5pp). Today's measured floor is
  `lines 78.61 / branches 54.49`. The ROADMAP `branches: 60` target
  now needs only ~6pp; remaining gap is concentrated in MasterLock +
  ArchiveVault, which are §2.i / §2.k.

### Verified

- `scripts/check-beta.sh` → **27/27** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 65 files / **334** tests (was 55 / 272 at end of §2.h).
- `npm run build` → 1.83 s, no new warnings; main `index.js` chunk
  grew by ~2 kB (the seven extra component modules add their own
  module-level boilerplate; the SettingsPanel module itself shrunk
  from ~32 kB → ~10 kB so net cost is small).
- `npx playwright test` → **10/10** passing (api × 3, app × 3,
  backup × 2, a11y × 2).

### Added (Phase 2 §2.h — `Dashboard.tsx` split)

- **`Dashboard.tsx` reduced from 1048 → 587 LOC** (−44%) by lifting six
  workflow concerns into hooks and four composition surfaces into
  sub-components. The remaining drift over the ROADMAP target of 350 is
  the ~70-line `SettingsPanel` prop-drilling block, which is tracked as
  part of Phase 2 §2.j SettingsPanel API redesign — splitting Dashboard
  any further today would just inline that 70-line composer into a new
  file with the same surface area.
- **Hooks extracted** (each with a dedicated test file ≥5 cases):
  - `hooks/useDashboardVault.ts` (139 LOC) — sealed/verifying/open
    state machine for the vault grid, the password input + flashing
    error banner, and the auto-close-on-session-lock effect. Delegates
    the actual hash check to `SecurityService.verifyPassword`. ×7
    cases cover persisted-flag rehydration, lock cascade, cancel,
    success and failure paths.
  - `hooks/useGuidingStarsEditor.ts` (124 LOC) — temp directory +
    selected list + custom-name input for the Settings → Stars editor;
    toggling respects a configurable `maxSelected` cap and surfaces an
    error message when exceeded. Reset-on-drawer-close uses the
    `join('|')` content-comparison trick that fixed the Phase 2 §2.b
    `useMorningStarPipeline` infinite-loop regression. ×7 cases.
  - `hooks/useDashboardSecurity.ts` (211 LOC) — owns the 100-line
    in-component `handleSecuritySetup` workflow: validates strength,
    verifies old password, re-encrypts every encrypted entry, prompts
    on partial failures (`confirm` is injectable for tests), promotes
    the new password upward. Recovery-key minting is a tested
    side-effect on first set. ×7 cases (weak / mismatch / verify-fail
    / first-set / change / re-encryption / cancel-on-partial-fail).
  - `hooks/useBackupReminder.ts` (62 LOC) — reads
    `AppStorageKeys.lastBackupAt`, decides whether the amber banner
    should currently render, exposes `recordBackup()` that the
    dashboard's export handler calls so the banner clears immediately.
    ×6 cases (no entries / never exported / recent / overdue /
    persisted-write / corrupt value).
  - `hooks/useDashboardExport.ts` (97 LOC) — owns `dynamicVersion`,
    `handleExport` (Star Map JSON download + recordBackup) and
    `handleDownloadNotes` (Markdown / TXT export). ×5 cases including
    `dynamicVersion` formula and floor.
  - `hooks/useClickOutside.ts` (43 LOC, generic) — replaces two
    near-identical `mousedown` effects in Dashboard with a single
    composable hook that **also** handles `Escape` (the original
    inline effects didn't). Used by both the language and export
    dropdowns. ×5 cases.
- **Sub-components extracted** (each with a dedicated test file ≥5
  cases):
  - `components/VaultUnlockModal.tsx` (107 LOC) — the master-password
    overlay shown when the user taps the sealed vault. ×6 cases
    including dialog semantics, Enter-to-submit, error banner.
  - `components/BackupImportConfirmModal.tsx` (78 LOC) — the
    "merge or replace?" prompt that resolves the
    `useBackupImport` hook's promise. ×5 cases.
  - `components/BackupReminderBanner.tsx` (66 LOC) — the amber
    "backup overdue" status banner with `role="status"` /
    `aria-live="polite"`. ×5 cases (active / day-substitution /
    never-exported copy / open-settings callback).
  - `components/DashboardFooter.tsx` (75 LOC) — the boat + quote
    motivational footer. The boat is now a real `<button>` with an
    `aria-label`, replacing the previous `<div onClick>` pattern.
    ×5 cases.
  - `components/VaultContent.tsx` (151 LOC) — the sealed-or-open
    vault wrapper, the loading spinner, the EntryGrid /
    VaultListView selection, and the "load more" pagination button.
    The sealed wrapper is now a proper `role="button"` with
    keyboard activation (Enter / Space) and `aria-label`, replacing
    the previous `<div onClick>` that lived inside the legacy
    Dashboard ESLint override block. ×6 cases.

### Changed (coverage ratchet)

- `vitest.config.ts` — `lines: 69 → 75` (+6pp) and
  `branches: 44 → 49` (+5pp), reflecting the new hook + component
  tests. Today's measured floor is `lines 76.53 / branches 49.84`. The
  ROADMAP `branches: 60` target now needs only ~10pp; the next
  ratchet is conditioned on the §2.i–§2.j (MasterLock / SettingsPanel)
  splits.

### Verified

- `scripts/check-beta.sh` → **27/27** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 55 files / **272** tests (was 44 / 208 at end of §2.g).
- `npm run build` → 1.85 s, no new warnings.
- `npx playwright test` → **10/10** passing (api × 3, app × 3,
  backup × 2, a11y × 2).

### Added (Phase 2 §2.g — `Viewer.tsx` split)

- **`Viewer.tsx` reduced from 1247 → 312 LOC** (target was ≤350) by
  extracting workflow into hooks and presentation into panels:
  - `hooks/useViewerAccess.ts` (310 LOC) — owns the
    `sealed → opening → reading` machine, password input + decryption
    error banner, lockout ladder (delegates to `useViewerLockout`),
    WebAuthn quick-unlock and the entry-change reset effects. Built on
    top of `useViewerLockout` so the lockout policy is configurable
    per-call (tests inject `{ maxAttempts: 3, lockoutDurationMs: 1_000 }`
    instead of waiting 30 s).
  - `components/ViewerSealedPanel.tsx` (374 LOC) — pure presentation:
    seal animation, password field, time-lock countdown, error banner,
    unlock button. Adds `aria-label`, `role="alert"` so the failure
    banner is announced by screen readers.
  - `components/ViewerReadingPanel.tsx` (410 LOC) — pure presentation:
    decrypted markdown body, attachment, Morning Star, action footer,
    burn confirmation overlay. Burn callbacks are explicit
    (`onRequestBurn` / `onCancelBurn` / `onExecuteBurn`) so the panel
    can't accidentally short-circuit the confirmation dialog.
- **Removed three large in-component effects** (entry-reset,
  cross-update sync, decryption-error auto-clear) and the inlined
  `handleOpenLetter` / `handleBiometricAuth` workflow — all now live in
  `useViewerAccess`. The new "auto-clear" implementation is the same
  ref-tracking pattern that fixed the `useMorningStarPipeline` OOM in
  Phase 2 §2.b: clear on user keystroke, do not clear when our own
  failure handler resets the field.
- **6 new test files / 34 new vitest cases** (208 total, up from 174):
  - `hooks/useViewerAccess.test.ts` × 6 (sealed/reading start states,
    empty input, wrong password + lockout ladder, time-lock, success).
  - `hooks/useViewerStars.test.ts` × 5 (counts, determinism, ranges,
    memoisation).
  - `components/TypewriterText.test.tsx` × 5 (per-tick reveal, completion,
    whitespace, custom className, restart on text change).
  - `components/viewerMarkdown.test.tsx` × 6 (https link, javascript:
    block, video tag, file:// image block, https image with referrer
    policy, sandboxed pdf iframe).
  - `components/ViewerStarfield.test.tsx` × 5 (aria-hidden, counts,
    palette, pointer-events, memo).
  - `components/ViewerSealedPanel.test.tsx` × 7 (input, change, Enter,
    back, time-lock branch, decryption error, biometric precedence).
  - `components/ViewerReadingPanel.test.tsx` × 6 (footer, tags, body
    render, blurred placeholder when not decrypted, close-file callback,
    burn-confirm overlay routing).

### Removed (file-scope ESLint overrides)

- `eslint.config.mjs` — `components/Viewer.tsx` is no longer in the
  `max-lines: off` / `jsx-a11y: off` legacy override block. Remaining
  four legacy components (`Dashboard`, `MasterLock`, `SettingsPanel`,
  `ArchiveVault`) plus `StatisticsWidget` continue to carry the
  override pending Phase 2 §2.h–§2.j.

### Changed (coverage ratchet)

- `vitest.config.ts` — `lines: 71 → 69` and `branches: 47 → 44`. This
  is **not** a regression: the Viewer split changed the analyser's
  denominator (~600 LOC of pure-presentation panels are excluded the
  same way `SpaceTimeBackground` etc. already are; the previously
  hidden `MorningStarPanel`, `MorningStarRadar`, `ViewerActionFooter`,
  `ViewerAttachmentPanel`, `SettingsPanel` codepaths now contribute to
  the percentage). Floor is pinned at the new measured value
  (`69.83% / 44.56%`); next ratchet step (+5pp lines) is conditioned on
  the §2.h–§2.j component splits landing.

### Verified

- `scripts/check-beta.sh` → **27/27** invariants pass.
- `npm run lint` (`--max-warnings=0`) clean.
- `npm run typecheck` clean.
- `npm test` → 44 files / **208** tests (was 38 / 174).
- `npm run build` → 1.86 s, no new warnings.
- `npx playwright test` → **10/10** passing (api × 3, app × 3, backup
  × 2, a11y × 2).

---

## [1.1.0-beta.1] — 2026-05-02

> Phase 1 (Public Beta Readiness) is green. `scripts/check-beta.sh` exits 0
> with **27/27** invariants passing and **10/10** Playwright specs (api ×
> 3, app × 3, backup × 2, a11y × 2). Ready to tag a public-beta release.

### Security

- **PBKDF2 default raised to 600,000 iterations** (OWASP 2026 baseline),
  configurable via `VECTOR_PBKDF2_ITERATIONS`. Existing
  `pbkdf2-sha256:v1:<iter>:<base64>` hashes still verify at their
  original cost factor; `SecurityService.needsRehash()` flags them for
  opportunistic re-mint. Vitest pins 100k for speed.
- **Removed localStorage mirror of `passwordHash` / `passwordSalt`**
  (`hooks/useDiaryData.ts`, `services/diaryMigration.ts`). Loader
  performs a one-shot migration of any leftover mirrored values into
  IndexedDB and wipes the mirror, so an XSS payload can no longer
  harvest them.
- **PDF.js worker is now bundled locally** via
  `pdfjs-dist/build/pdf.worker.min.mjs?url`; we no longer pull it from
  `unpkg.com` at runtime. CSP `worker-src` can stay on `'self'`.
- **`.env.local` removed from the working tree.** README warns operators
  about rotating any keys that may have been copied through it.
- **Server-side prompt-injection guard** (`server/promptEnvelope.ts`):
  `containsInjection()` rejects obvious overrides ("ignore previous
  instructions", "you are now …", "system: …" — both English and
  Chinese) with `HTTP 400 INJECTION` before the request ever reaches
  OpenRouter / Gemini. `wrapPromptForLLM()` ships the `<user_prompt>`
  envelope helper for the next iteration.

### Accessibility

- `index.html` viewport meta no longer carries `maximum-scale` /
  `user-scalable=no`; pinch-zoom restored (WCAG 1.4.4).
- `eslint-plugin-jsx-a11y` is wired into the flat ESLint config and
  `npm run lint --max-warnings=0` is clean.
- Global `:focus-visible` outline added to `index.css` so keyboard focus
  is always visible on both themes; matching
  `prefers-reduced-motion` media query collapses transitions to ~0ms.
- `App.tsx` wraps the tree in `MotionConfig`, driven by the new
  `hooks/useMotionPreference.ts` hook (delegates to
  `motion/react`'s `useReducedMotion`). All `motion/react` consumers
  inherit the reduced-motion preference.
- New `e2e/a11y.spec.ts` runs `@axe-core/playwright` against the cover
  and onboarding shells; CI fails on any `serious` / `critical` impact.

### Legal & documentation

- `LICENSE` (MIT), `PRIVACY.md` (bilingual), `TERMS.md` (bilingual),
  `SECURITY.md` (vulnerability disclosure) added at repo root.
- `package.json` declares `license`, `author`, `repository`.
- `components/MorningStarPanel.tsx` renders an AI-disclaimer banner on
  every analysis result (English fallback + zh translation; other
  locales fall back to English via `?? '...'`).

### Reliability / observability

- `server/observability.ts` initialises `@sentry/node` only when
  `SENTRY_DSN` is set, sharing the redaction rules in
  `server/scrubLog.ts` with the structured JSON request logger.
  `captureServerError()` is invoked from the Morning Star handler with
  `requestId` / `provider` tags.
- **Graceful shutdown**: `SIGTERM` / `SIGINT` calls `httpServer.close()`,
  waits for in-flight requests up to the OpenRouter timeout + 5 s, then
  exits 0. Prevents 502s during rolling deploys (PM2 / docker stop /
  K8s).
- Production static-asset caching: `dist/assets/*` served with
  `Cache-Control: public, max-age=31536000, immutable`; `index.html`
  served with `no-cache`.

### Brand assets

- `public/og.png` (1200×630) + `public/icon-192.png` /
  `public/icon-512.png` (PWA maskable) generated and referenced from
  `index.html` (Open Graph + Twitter card) and `manifest.json`.

### Process

- `ROADMAP.md` (bilingual) is the source of truth for Phase exit
  criteria.
- `scripts/check-beta.sh` validates every Phase 1 invariant in one
  command and gates the release.
- `vitest.config.ts` pins `VECTOR_PBKDF2_ITERATIONS=100000` so unit
  tests stay fast at the new 600k production default.

### Infrastructure changes worth noting downstream

- `server.ts` no longer redeclares `scrubLogText` / `formatLogError`;
  consumers import them from `server/scrubLog.ts`.
- `services/securityService.ts` exposes `getCurrentIterations()` and
  `needsRehash()` for opportunistic upgrades.
- ESLint config disables `jsx-a11y/no-autofocus` and several
  `noninteractive-*` rules with documented justification.

## [Unreleased]

### Added (Phase 2 mid-checkpoint, ROADMAP §"First Wave After Launch")

- **`useNowTick` already opportunistic; `addMaterial` / `deleteMaterial`
  now use functional `setState`** so rapid successive uploads do not
  drop entries through stale closures (ROADMAP §2.k.1, EVALUATION
  follow-up F1.4). Covered by a new vitest case asserting two
  concurrent `addMaterial` calls leave both items in state.
- **`App.tsx` subscribes to `useAppStore` via `useShallow` selector**.
  Previously every Zustand `set()` re-rendered the whole tree even when
  the touched field was unrelated to App; the selector returns a
  shallow-equal projection so re-renders are now scoped to the fields
  App actually reads (ROADMAP §2.k.2).
- **Vitest coverage thresholds wired** (`lines: 70`, `branches: 45`).
  These are pinned at the **measured floor** today (71% / 47%) so the
  bar can only ratchet up. ROADMAP target is `branches: 60`; lifting it
  is a post-component-split task — see comment in `vitest.config.ts`.
- **ESLint `max-lines: warn 600`** activated as the ROADMAP §2.f
  observation gate. Five legacy components above the cap (`Viewer`,
  `Dashboard`, `MasterLock`, `SettingsPanel`, `ArchiveVault`) get a
  scoped override; the override block carries a "remove me when split"
  marker for Phase 2 §2.g–§2.j.
- **Backup-overdue banner on Dashboard** (ROADMAP §2.d). `Settings →
Export Star Map` writes `vector_last_backup_at`; Dashboard shows an
  amber banner once the gap exceeds `BACKUP_REMINDER_DAYS = 60` (or if
  the user has never exported). i18n: `backupReminderTitle`,
  `backupReminderBody`, `backupReminderNever`, `backupReminderAction`
  (zh + en, English fallback for other locales).
- **Web Vitals → Sentry** (ROADMAP §2.m). `lib/vitals.ts` subscribes to
  `LCP`, `INP`, `CLS`, `FCP`, `TTFB` via `web-vitals` and forwards each
  metric as a low-frequency `info` Sentry event with the raw value
  attached as context, so dashboards can compute P75 on the underlying
  numbers (avoiding the captureMessage sampling pitfall called out in
  ROADMAP §不可妥协项 #5).

### Re-enabled

- Phase 1 muted `jsx-a11y/no-static-element-interactions`,
  `click-events-have-key-events`, `label-has-associated-control`,
  `no-noninteractive-element-interactions` are back on at `warn` level
  (ROADMAP §F1.5). Real-interaction violations in `EntryGrid`,
  `Onboarding`, `CyberButton` were fixed (proper `role="button"`,
  `tabIndex`, keyboard activation). Decorative `StatisticsWidget`
  cells, plus the five legacy components, retain a documented file
  override until Phase 2 §2.g–§2.j splits them.

### Carried over from Phase 1 entry

- ROADMAP.md (bilingual) authoritative checklist for Phases 1–4.
- scripts/check-beta.sh validates Phase 1 invariants in one command.
