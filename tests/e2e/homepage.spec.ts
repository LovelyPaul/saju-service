import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('displays main heading and sections', async ({ page }) => {
    await page.goto('/');

    // 메인 제목 "운명 계산기" 확인
    await expect(page.getByRole('heading', { name: '운명 계산기' })).toBeVisible();

    // 주요 섹션들이 있는지 확인
    await expect(page.getByRole('heading', { name: '요금제' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '자주 묻는 질문' })).toBeVisible();
  });

  test('displays pricing section', async ({ page }) => {
    await page.goto('/');

    // 요금제 섹션이 표시되는지 확인
    await expect(page.getByRole('heading', { name: '요금제' })).toBeVisible();

    // 무료 체험 관련 텍스트가 있는지 확인
    await expect(page.getByText(/무료 체험/i)).toBeVisible();
  });
});
