import { test, expect } from '@playwright/test';

test('the isolated E2E API is healthy', async ({ request }) => {
  const response = await request.get(`${process.env.E2E_API_URL ?? 'http://localhost:4000'}/api/v1/health`);
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ status: 'ok', service: 'api' });
});
