import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const devPort = Number(env.VITE_DEV_PORT || env.PORT || 3000);
  const hmrPort = Number(env.VITE_HMR_PORT || 24678);
  return {
    server: {
      port: Number.isFinite(devPort) ? devPort : 3000,
      host: env.VITE_DEV_HOST || '127.0.0.1',
      hmr: {
        port: Number.isFinite(hmrPort) ? hmrPort : 24678,
      },
    },
    build: {
      // Phase 4 §W1.5 — emit hidden sourcemaps so the CI Sentry upload
      // step has them, but no `//# sourceMappingURL=...` comment is
      // appended to the JS bundles. The map files themselves are
      // deleted from `dist/` after upload (see
      // `.github/workflows/ci.yml`) so the deployed static assets
      // don't expose them publicly.
      sourcemap: 'hidden',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('react-pdf') || id.includes('pdfjs-dist')) {
              return 'pdf';
            }

            if (id.includes('motion')) {
              return 'motion';
            }

            if (id.includes('lucide-react')) {
              return 'icons';
            }

            if (id.includes('zustand') || id.includes('@tanstack/react-virtual')) {
              return 'data';
            }

            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react';
            }
          },
        },
      },
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': 'undefined',
      'process.env.GEMINI_API_KEY': 'undefined',
      'process.env.SENTRY_DSN': JSON.stringify(env.SENTRY_DSN || ''),
      // Phase 4 §W1.5 — surface the Sentry release tag (typically the
      // commit SHA injected by CI) so the runtime SDK can match
      // exceptions to the sourcemaps the CI step uploaded.
      // Reads from process.env (NOT vite's loadEnv) because CI sets
      // these as workflow `env:` vars, not via .env files.
      'process.env.SENTRY_RELEASE': JSON.stringify(
        process.env.SENTRY_RELEASE || process.env.GITHUB_SHA || process.env.COMMIT_SHA || '',
      ),
      'process.env.SENTRY_ENV': JSON.stringify(
        process.env.SENTRY_ENV || (mode === 'production' ? 'production' : 'development'),
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
