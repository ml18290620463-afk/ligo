# Quantitative snapshot — 2026-05-03 12:24 CST

## Source size

```text
components/    62 files     12258 LOC
hooks/         32 files     3896 LOC
services/      17 files     1823 LOC
lib/           7 files
i18n/locales/  7 locales
test files     8187 LOC (combined)
```

## Tests

```text
vitest cases:        537
playwright specs:    5 files
playwright tests:    7 cases

Coverage (npm run test:coverage):
  Statements 81.83%   (2261/2763)
  Branches   62.21%   (1650/2652)
  Functions  78.93%   ( 536/679 )
  Lines      83.67%   (2112/2524)

Vitest threshold floor: lines >= 78  branches >= 54
ROADMAP §3 target:      branches >= 60   <- already exceeded
```

## Big-component reduction (Phase 2 §2.g–§2.l)

```text
Component                          Before    After    Δ
--------------------------------   ------    -----    -----
components/Viewer.tsx                1247          324   -75%
components/Dashboard.tsx              983          350   -64%
components/MasterLock.tsx             866          190   -78%
components/SettingsPanel.tsx          988          282   -71%
components/ArchiveVault.tsx           805          143   -82%
components/StatisticsWidget.tsx       354          124   -65%
TOTAL                                5243    1413   -73%

All six big components now <= 350 LOC (the ROADMAP §0.1 ceiling).
```

## Build (dist/assets)

```text
  1.4K   dist/assets/PdfAttachmentViewer-BIQXcYA6.js
  2.0K   dist/assets/argon2idPoc-CVoEck-e.js
  14K   dist/assets/Editor-Ca58FPeB.js
  18K   dist/assets/data-DutdD_Y4.js
  25K   dist/assets/ArchiveVault-C0cRRG34.js
  27K   dist/assets/index-BGbQGMFM.js
  33K   dist/assets/icons-BHVpT20d.js
  125K   dist/assets/motion-xEFdZKhQ.js
  184K   dist/assets/Viewer-BkGHmpEO.js
  200K   dist/assets/react-D-mdeNL1.js
  212K   dist/assets/index.esm-BNDTNUIh.js
  320K   dist/assets/index-CWk482fQ.js
  452K   dist/assets/pdf-B2fcItfv.js

Total dist:    3.9M
node_modules:  493M
```

## Quality gates

```text
scripts/check-beta.sh:                28 / 28 PASS
  Phase 1.1 Security                   5 / 5
  Phase 1.2 Accessibility              5 / 5
  Phase 1.3 Legal                      6 / 6
  Phase 1.4 Reliability                3 / 3
  Phase 1.5 Brand                      2 / 2
  Phase 1.6 Process                    3 / 3
Phase 3 §3.d i18n drift               PASS (soft mode — translator backlog: 232 keys)
Quality gates (lint/typecheck/test/build):  4 / 4 PASS
ESLint --max-warnings=0:              0 errors / 0 warnings
TypeScript --noEmit:                  0 errors
```

## Git

```text
Local main is 33 commits ahead of origin/main.
Tag: v1.0.5-beta.1 (annotated, points to commit 4398fca, Phase 1 close).
Push status: blocked pending GitHub PAT 'workflow' scope update.
```
