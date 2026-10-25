/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves from /<repo>/; the deploy workflow sets BASE_PATH.
// A relative base also works because routing uses the URL hash.
const base = process.env.BASE_PATH ?? './';

const buildTime = new Date().toISOString();
const commit = (process.env.GITHUB_SHA ?? 'local').slice(0, 7);

export default defineConfig({
  base,
  define: {
    __APP_BUILD__: JSON.stringify(buildTime),
    __APP_COMMIT__: JSON.stringify(commit),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Home Gym Tracker — Lady',
        short_name: 'Lady Gym',
        description: 'Offline workout logger for a light, 3-day full-body program',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0E0F12',
        theme_color: '#0E0F12',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        globIgnores: ['sw-update.js'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Activate new versions right away. The plugin only sets these itself when it injects
        // its own registration (injectRegister: 'auto'); we register manually to show a toast.
        skipWaiting: true,
        clientsClaim: true,
        // Reloads windows still running an old build after an update (see the file).
        importScripts: ['sw-update.js'],
      },
    }),
  ],
  server: { host: false },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/*.test.ts'],
      reporter: ['text', 'html'],
    },
  },
});
