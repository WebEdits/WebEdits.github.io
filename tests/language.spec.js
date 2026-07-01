const { test, expect } = require('@playwright/test');

test.describe('Language toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('default language is Hindi', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  });

  test('clicking EN switches html lang to en', async ({ page }) => {
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('clicking EN updates nav link text to English', async ({ page }) => {
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    await expect(page.locator('.nav__links a[href="#books"]')).toHaveText('Books');
  });

  test('clicking HI after EN restores Hindi', async ({ page }) => {
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    await page.locator('.nav .lang-toggle button[data-lang="hi"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  });

  test('language choice is saved to localStorage', async ({ page }) => {
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    const stored = await page.evaluate(() => localStorage.getItem('pp-lang'));
    expect(stored).toBe('en');
  });

  test('saved language is restored on reload', async ({ page }) => {
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
