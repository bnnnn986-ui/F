import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Playwright's bundled Chromium revision may not match @playwright/test's
// expected version in this sandbox; fall back to the browser installed at
// PLAYWRIGHT_BROWSERS_PATH when present.
const localChrome = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = existsSync(localChrome) ? localChrome : undefined;

const PREVIEW_PORT = 4173;
const SIGNAL_PORT = 9000;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PREVIEW_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173',
      port: PREVIEW_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx peer --port ${SIGNAL_PORT} --host 127.0.0.1 --path / --allow_discovery`,
      port: SIGNAL_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
