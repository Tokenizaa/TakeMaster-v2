import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL?.trim();

if (!baseURL) {
  throw new Error(
    'E2E_BASE_URL is required. Set it to the approved test target; this suite never falls back to localhost or starts a local server.'
  );
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e-visual.test.ts',
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
