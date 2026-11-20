import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // Relative URLs so the same build works at a site root or under a subpath
  // (GitHub Pages serves project sites from https://<user>.github.io/<repo>/).
  base: './',
  // Visual Studio keeps files under .vs locked, which breaks the file watcher; obj/bin are its build output.
  server: { watch: { ignored: ['**/.vs/**', '**/obj/**', '**/bin/**'] } },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    svelte(),
    VitePWA({
      // 'prompt': a new version downloads in the background and the app shows an "Update" banner.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: "Earl's Game Tracker",
        short_name: 'Game Tracker',
        description: 'Track which board games still need sleeving and which inserts still need printing. Works offline.',
        theme_color: '#3a2a20',
        background_color: '#f4eee3',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything (including the bundled fonts) so the app is fully usable offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
