import { test, expect } from '@playwright/test';

const email = process.env.E2E_CUSTOMER_EMAIL;
const password = process.env.E2E_CUSTOMER_PASSWORD;

test.describe('customer authentication', () => {
  test.skip(!email || !password, 'Set E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD.');

  test('logs in and restores the session after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });
});
