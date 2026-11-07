import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.runtime/playwright');
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { headless: true }, reporter: 'list',
  outputDir: 'test-results',
});
