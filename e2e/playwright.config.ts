import { defineConfig, devices } from '@playwright/test';

const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;
if (!e2eDatabaseUrl || !/\/ecommerce_platform_e2e(?:\?|$)/.test(e2eDatabaseUrl)) {
  throw new Error(
    'E2E_DATABASE_URL must point to the dedicated ecommerce_platform_e2e database. Development and production databases are refused.',
  );
}

const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:4000';
const customerUrl = process.env.E2E_CUSTOMER_URL ?? 'http://localhost:5173';
const adminUrl = process.env.E2E_ADMIN_URL ?? 'http://localhost:5174';

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts',
  reporter: [['list'], ['html', { outputFolder: './report', open: 'never' }]],
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: customerUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      url: `${apiUrl}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: e2eDatabaseUrl,
        FRONTEND_URL: customerUrl,
        ADMIN_URL: adminUrl,
      },
    },
  ],
});
