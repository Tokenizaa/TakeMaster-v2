import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// Default to the deployed Cloudflare Worker so tests do not require a local server or a new URL.
const baseURL = (process.env.E2E_BASE_URL?.trim() || 'https://takemaster-v2.olfnetto.workers.dev').replace(/\/$/, '');

let target: URL;
try {
  target = new URL(baseURL);
} catch {
  throw new Error('E2E_BASE_URL must be a valid absolute HTTP(S) URL.');
}
if (!['http:', 'https:'].includes(target.protocol)) {
  throw new Error('E2E_BASE_URL must use HTTP or HTTPS.');
}
if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname.toLowerCase())) {
  throw new Error('Localhost is not an approved E2E target. Tests target the deployed site by default.');
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e-*.test.ts',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
  ],
  outputDir: 'test-results/e2e',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    browserName: 'chromium',
    headless: process.env.E2E_HEADLESS !== 'false',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
    },
  },
});
