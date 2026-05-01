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
        host: env.VITE_DEV_HOST || '0.0.0.0',
        hmr: {
          port: Number.isFinite(hmrPort) ? hmrPort : 24678,
        },
      },
      build: {
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

              if (
                id.includes('@supabase/') ||
                id.includes('zustand') ||
                id.includes('@tanstack/react-virtual')
              ) {
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
        'process.env.SENTRY_DSN': JSON.stringify(env.SENTRY_DSN || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
