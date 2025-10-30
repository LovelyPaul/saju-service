import { test, expect } from '@playwright/test';

test.describe('Analysis Creation', () => {
  test('validates form input', async ({ page }) => {
    await page.goto('/analysis/new');

    await page.getByLabel(/이름/i).fill('홍');
    await expect(page.getByText(/이름은 최소 2자/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /분석 시작/i })).toBeDisabled();
  });

  test('creates analysis successfully', async ({ page }) => {
    await page.goto('/analysis/new');

    await page.getByLabel(/이름/i).fill('홍길동');
    await page.getByLabel(/생년월일/i).fill('1990-01-01');
    await page.locator('input[value="male"]').check();

    await page.getByRole('button', { name: /분석 시작/i }).click();

    await expect(page.getByText(/AI가 분석 중/i)).toBeVisible();
    await expect(page).toHaveURL(/\/analysis\/mock-\d+/, { timeout: 5000 });
    await expect(page.getByText(/홍길동님의 사주 분석/i)).toBeVisible();
  });
});
