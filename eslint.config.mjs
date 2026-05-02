import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const browserGlobals = globals.browser ?? {};
const nodeGlobals = globals.node ?? {};

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.git/**',
      'app/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'unused-imports': unusedImports,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // Project-specific tweaks: many decorative spans are intentionally
      // styled-only and have no semantic role; we keep recommended set but
      // turn off two rules that produce a high false-positive rate against
      // the existing UI without adding accessibility value.
      // autoFocus on modal-input combinations is intentional UX in this app;
      // reviewers should still call it out manually for non-modal cases.
      'jsx-a11y/no-autofocus': 'off',
      // Phase 2 §2.f — keep the soft 600-line ceiling visible while we
      // refactor the four 800–1300 line legacy components down toward
      // 350. Phase 3 ratchets this to error/400 once Viewer / Dashboard /
      // MasterLock / SettingsPanel are split.
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
      // Phase 2 §F1.5 — re-open Phase 1's jsx-a11y mutes. We keep them
      // at `warn` so existing legacy violations show up in CI logs and
      // become visible during component splits, but they do not block
      // `--max-warnings=0` because the four giant components still have
      // file-scoped `max-lines` overrides anyway. The matching task in
      // ROADMAP §跨阶段 lifts these to `error` per file as soon as the
      // file's interactive surface is rewritten.
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unknown-property': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      // Local unused vars/args are intentionally tolerated here; they live in
      // legacy components scheduled for stage D refactor. We still keep the
      // import-side rule strict so dead imports never accumulate again.
      'unused-imports/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-undef': 'off',
    },
  },
  {
    // Phase 2 §2.g–§2.j refactor target. These four files predate the
    // 600-line cap and are scheduled to be split into ≤350-line chunks;
    // until the split lands we silence `max-lines` here (rather than
    // disabling it on every PR). Delete this whole override block as
    // part of the Phase 2 exit checklist — do not extend it to new
    // files.
    files: [
      // Viewer.tsx was split in Phase 2 §2.g (now 312 lines, well under
      // the 350 LOC target — see ROADMAP exit checklist) so it is no
      // longer in this override list. Remaining four legacy components
      // are tracked as Phase 2 §2.h–§2.j follow-ups.
      'components/Dashboard.tsx',
      'components/MasterLock.tsx',
      'components/SettingsPanel.tsx',
      // Not in ROADMAP §0.1 originally but also above the cap; tracked
      // as a Phase 2 follow-up so it gets the same treatment.
      'components/ArchiveVault.tsx',
      // StatisticsWidget has decorative div-based interactive cells; will
      // be revisited together with the rest of the dashboard surface.
      'components/StatisticsWidget.tsx',
    ],
    rules: {
      'max-lines': 'off',
      // Same lifecycle as `max-lines` above: the four jsx-a11y rules we
      // re-opened in Phase 2 emit ~20 warnings inside these legacy
      // components. We silence them here so `--max-warnings=0` stays
      // useful for new code, and clear them per-file as the components
      // are split into ≤350-line chunks.
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        ...nodeGlobals,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
  },
  prettier,
];
