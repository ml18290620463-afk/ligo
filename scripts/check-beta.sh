#!/usr/bin/env bash
# scripts/check-beta.sh
#
# One-shot validator for ROADMAP Phase 1 (Public Beta Readiness). Prints
# every invariant as PASS / FAIL and exits non-zero on the first failure
# so CI / pre-release humans can rely on the exit code.
#
# This script intentionally has zero dependencies beyond `node`, `npm`,
# `grep`, and a POSIX shell. Skip a check by exporting SKIP_<NAME>=1.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0
PASS_COUNT=0
FAIL_COUNT=0

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

check() {
  local name="$1"
  local cmd="$2"
  if [ "${SKIP_RUN:-0}" = "1" ]; then
    yellow "SKIP  $name (SKIP_RUN=1)"
    return 0
  fi
  if eval "$cmd" >/dev/null 2>&1; then
    green "PASS  $name"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    red   "FAIL  $name"
    red   "      command: $cmd"
    FAIL=1
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

check_negative() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    red   "FAIL  $name"
    red   "      forbidden pattern matched"
    FAIL=1
    FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    green "PASS  $name"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
}

bold "==> Phase 1 invariants"

# 1.1 Security
check          "PBKDF2 default >= 600,000"                   "grep -Eq 'PBKDF2_DEFAULT_ITERATIONS\\s*=\\s*[6-9][0-9_]{5,}' services/securityService.ts"
check_negative "passwordHash/salt no longer mirrored"        "grep -nE 'mirrorDiaryValue\\(keys\\.(passwordHash|passwordSalt)' hooks/useDiaryData.ts"
check_negative "PDF worker not on unpkg CDN"                 "grep -nE \"workerSrc\\s*=\\s*[\\\`'\\\"]https?://unpkg\" components/PdfAttachmentViewer.tsx"
check_negative ".env.local must not be present"              "test -e .env.local"
check          "server prompt envelope present"              "grep -RnE 'PROMPT_ENVELOPE|wrapPromptForLLM|<user_prompt>|containsInjection' server.ts server/"

# 1.2 Accessibility
check_negative "viewport must not block user-scalable"       "grep -nE 'maximum-scale|user-scalable' index.html"
check          "eslint-plugin-jsx-a11y configured"           "grep -nq 'jsx-a11y' eslint.config.mjs"
check          ":focus-visible style declared"               "grep -nq ':focus-visible' index.css"
check          "useReducedMotion adopted"                    "grep -RnE 'useReducedMotion|useMotionPreference' components/ hooks/ App.tsx"
check          "axe-playwright spec present"                 "test -f e2e/a11y.spec.ts"

# 1.3 Legal
check "LICENSE exists"      "test -f LICENSE"
check "PRIVACY.md exists"   "test -f PRIVACY.md"
check "TERMS.md exists"     "test -f TERMS.md"
check "SECURITY.md exists"  "test -f SECURITY.md"
check "package.json carries license field" "grep -nq '\"license\"' package.json"
check "Morning Star disclaimer present"    "grep -nq 'aiDisclaimer\\|disclaimer' components/MorningStarPanel.tsx"

# 1.4 Reliability / observability
check "server-side Sentry init present"           "grep -RnE '@sentry/node|Sentry.init|initServerObservability' server.ts server/"
check "SIGTERM graceful shutdown installed"       "grep -nq 'SIGTERM' server.ts"
check "static assets served immutable"            "grep -nq 'immutable' server.ts"

# 1.5 Brand assets
check "OG image referenced"                       "grep -nEq 'og:image|twitter:image' index.html"
check "manifest references 192/512 maskable icon" "grep -nEq '\"sizes\":\\s*\"(192|512)x(192|512)\"' manifest.json"

# 1.6 Process
check "CHANGELOG.md present"     "test -f CHANGELOG.md"
check "ROADMAP.md present"       "test -f ROADMAP.md"

bold "==> Quality gates (lint + typecheck + tests + build)"
if [ "${SKIP_GATES:-0}" = "1" ]; then
  yellow "SKIP  quality gates (SKIP_GATES=1)"
else
  check "npm run lint"      "npm run lint --silent"
  check "npm run typecheck" "npm run typecheck --silent"
  check "npm test"          "npm test --silent"
  check "npm run build"     "npm run build --silent"
fi

bold "==> Summary"
echo  "PASS=$PASS_COUNT  FAIL=$FAIL_COUNT"

if [ "$FAIL" -ne 0 ]; then
  red "Phase 1 not green. See FAIL lines above."
  exit 1
fi

green "Phase 1 invariants OK. Safe to tag a public-beta release."
