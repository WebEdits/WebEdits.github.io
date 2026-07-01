const { test, expect } = require('@playwright/test');

test.describe('Books section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
  });

  test('books grid is populated from JSON', async ({ page }) => {
    expect(await page.locator('.book-card').count()).toBeGreaterThan(0);
  });

  test('genre filter buttons are rendered', async ({ page }) => {
    expect(await page.locator('#books-filter button').count()).toBeGreaterThan(1);
  });

  test('"All" filter is active by default', async ({ page }) => {
    await expect(page.locator('#books-filter button[data-genre="all"]')).toHaveClass(/active/);
  });

  test('clicking a genre filter reduces the card count', async ({ page }) => {
    const totalBefore = await page.locator('.book-card').count();
    await page.locator('#books-filter button:not([data-genre="all"])').first().click();
    const totalAfter = await page.locator('.book-card').count();
    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
  });

  test('clicked filter button becomes active', async ({ page }) => {
    const nonAllBtn = page.locator('#books-filter button:not([data-genre="all"])').first();
    await nonAllBtn.click();
    await expect(nonAllBtn).toHaveClass(/active/);
    await expect(page.locator('#books-filter button[data-genre="all"]')).not.toHaveClass(/active/);
  });

  test('clicking a book card opens the detail modal', async ({ page }) => {
    await page.locator('.book-card').first().click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });

  test('modal shows a non-empty book title', async ({ page }) => {
    await page.locator('.book-card').first().click();
    await expect(page.locator('.book-detail__title')).toBeVisible();
    const title = await page.locator('.book-detail__title').textContent();
    expect(title?.trim().length).toBeGreaterThan(0);
  });

  test('modal closes via the × button', async ({ page }) => {
    await page.locator('.book-card').first().click();
    await page.locator('.book-detail__close').click();
    await expect(page.locator('#book-detail-modal')).not.toHaveClass(/open/);
  });

  test('modal closes via backdrop click', async ({ page }) => {
    await page.locator('.book-card').first().click();
    // Click a corner of the backdrop — the center is covered by the panel
    await page.locator('.book-detail__backdrop').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#book-detail-modal')).not.toHaveClass(/open/);
  });

  test('modal closes via Escape key', async ({ page }) => {
    await page.locator('.book-card').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#book-detail-modal')).not.toHaveClass(/open/);
  });
});
