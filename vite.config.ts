import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // OfflineHub owns the single registration path (`/sw.js`) via
      // `registerServiceWorker()`, so the plugin must not inject its own.
      injectRegister: null,
      registerType: 'autoUpdate',
      // A hand-written manifest is served from `public/`; do not duplicate it.
      manifest: false,
      workbox: {
        // Precache the same-origin application shell and bundled fixtures only.
        globPatterns: ['**/*.{js,css,html,svg,webmanifest,ico,png,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // No runtimeCaching on purpose: no third-party tiles/APIs are cached.
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
} as any);
