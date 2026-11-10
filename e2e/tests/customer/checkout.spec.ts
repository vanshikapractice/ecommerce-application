import { test, expect } from '@playwright/test';

test.describe('customer checkout', () => {
  test.skip(!process.env.E2E_CUSTOMER_EMAIL || !process.env.E2E_CUSTOMER_PASSWORD, 'Configure E2E customer credentials.');

  test('browses products and exposes checkout controls after login', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(process.env.E2E_CUSTOMER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_CUSTOMER_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Products')).toBeVisible();
    const addToCart = page.getByRole('button', { name: 'Add to cart' }).first();
    await expect(addToCart).toBeVisible();
    await addToCart.click();
    await page.getByRole('button', { name: /Cart/i }).click();
    await expect(page.getByText(/Subtotal/i)).toBeVisible();
  });
});
