import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    test: {
      globals: true,
      environment: 'node',
      pool: 'forks',
      maxConcurrency: 1,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'playwright-report', 'test-results'],
      env: env,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        thresholds: {
          statements: 70,
          branches: 60,
          functions: 70,
          lines: 70,
        },
      },
    },
  };
});
