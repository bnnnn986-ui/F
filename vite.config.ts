import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this repo at https://<user>.github.io/F/, so the
// production build needs a relative base so assets resolve under any
// sub-path. Locally (dev/preview) root-relative paths are fine.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [
    preact(),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): a new SW installs in the background
      // but only takes over once the player explicitly taps the "มีเวอร์ชัน
      // ใหม่ — อัปเดต" toast (src/core/pwa) — never mid-game.
      registerType: 'prompt',
      injectRegister: null, // we register manually (src/core/pwa/register.ts) so we control the update-toast UX
      manifest: {
        name: 'Pixel Tavern',
        short_name: 'Tavern',
        description: 'โรงเตี๊ยมเกมปาร์ตี้พิกเซลสำหรับกลุ่ม — สร้างห้อง แชร์รหัส เล่นด้วยกันได้ทันที',
        lang: 'th',
        display: 'standalone',
        // Relative to the manifest's own URL (served at <base>/manifest.webmanifest),
        // so this resolves under /F/ on GitHub Pages and under / in dev/preview.
        start_url: '.',
        scope: '.',
        background_color: '#241521',
        theme_color: '#1f1320',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell, fonts and PixelLab art. PeerJS/WebRTC
        // traffic is never intercepted: it's cross-origin signaling
        // (peerjs.com or a local PeerServer), not same-origin build
        // output, so it's simply never matched by these local globs and
        // no runtimeCaching entries are added for it below.
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,ico,json}'],
        // Never let the SW answer for the PeerJS cloud/local signaling
        // server or any other cross-origin call — same-origin app
        // navigations only.
        navigateFallbackDenylist: [/^\/peerjs/],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}));
