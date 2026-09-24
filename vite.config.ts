import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// GitHub Pages serves this repo at https://<user>.github.io/F/, so the
// production build needs a relative base so assets resolve under any
// sub-path. Locally (dev/preview) root-relative paths are fine.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [preact()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}));
