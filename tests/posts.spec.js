const { test, expect } = require('@playwright/test');

test.describe('Posts page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts.html');
  });

  test('page title includes the author name', async ({ page }) => {
    await expect(page).toHaveTitle(/प्रचण्ड प्रवीर/);
  });

  test('page header is visible', async ({ page }) => {
    await expect(page.locator('.posts-page__header')).toBeVisible();
  });

  test('at least one post card is rendered', async ({ page }) => {
    await page.waitForSelector('.post-full');
    expect(await page.locator('.post-full').count()).toBeGreaterThan(0);
  });

  test('post articles have an id for hash-linking', async ({ page }) => {
    await page.waitForSelector('.post-full');
    const id = await page.locator('.post-full').first().getAttribute('id');
    expect(id).toBeTruthy();
  });

  test('nav brand links back to index.html', async ({ page }) => {
    const href = await page.locator('.nav__brand').getAttribute('href');
    expect(href).toContain('index.html');
  });

  test('language toggle works on posts page', async ({ page }) => {
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
