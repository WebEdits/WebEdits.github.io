const { test, expect } = require('@playwright/test');

test.describe('News banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#news-banner');
  });

  test('banner wrap is visible once populated', async ({ page }) => {
    await expect(page.locator('#news-banner-wrap')).toBeVisible();
  });

  test('one dot is rendered per news item', async ({ page }) => {
    const dataCount = await page.evaluate(() =>
      fetch('data/news.json').then(r => r.json()).then(d => d.length));
    await expect(page.locator('.news-banner__dot')).toHaveCount(dataCount);
  });

  test('first dot is active by default', async ({ page }) => {
    await expect(page.locator('.news-banner__dot').first()).toHaveClass(/active/);
  });

  test('clicking a dot switches the active item and its text', async ({ page }) => {
    const firstText = await page.locator('#news-banner p').textContent();
    await page.locator('.news-banner__dot').nth(2).click();
    await expect(page.locator('.news-banner__dot').nth(2)).toHaveClass(/active/);
    await expect(page.locator('.news-banner__dot').first()).not.toHaveClass(/active/);
    const newText = await page.locator('#news-banner p').textContent();
    expect(newText).not.toBe(firstText);
  });

  test('an item with a link renders a "Buy Now" / "अभी खरीदें" call to action', async ({ page }) => {
    // The 3rd item (abhinav-cinema-3rd-edition, oldest by date) carries a link.
    await page.locator('.news-banner__dot').nth(2).click();
    await expect(page.locator('#news-banner a')).toBeVisible();
  });
});
