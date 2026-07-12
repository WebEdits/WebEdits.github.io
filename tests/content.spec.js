const { test, expect } = require('@playwright/test');

test.describe('Reviews accordion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.review-group');
  });

  test('at least one review group is rendered', async ({ page }) => {
    expect(await page.locator('.review-group').count()).toBeGreaterThan(0);
  });

  test('first review group is expanded by default', async ({ page }) => {
    await expect(page.locator('.review-group__btn').first()).toHaveAttribute('aria-expanded', 'true');
  });

  test('clicking the first group header collapses it', async ({ page }) => {
    await page.locator('.review-group__btn').first().click();
    await expect(page.locator('.review-group__btn').first()).toHaveAttribute('aria-expanded', 'false');
  });

  test('clicking a collapsed group expands it', async ({ page }) => {
    // Collapse first, then re-open
    await page.locator('.review-group__btn').first().click();
    await page.locator('.review-group__btn').first().click();
    await expect(page.locator('.review-group__btn').first()).toHaveAttribute('aria-expanded', 'true');
  });

  test('review cards are visible inside the open group', async ({ page }) => {
    expect(await page.locator('.review-group__body:not([hidden]) .review-card').count()).toBeGreaterThan(0);
  });
});

test.describe('News & Articles section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#news-articles-grid .media-card');
  });

  test('news & articles cards are rendered', async ({ page }) => {
    expect(await page.locator('#news-articles-grid .media-card').count()).toBeGreaterThan(0);
  });

  test('news & articles cards link to external sources', async ({ page }) => {
    const href = await page.locator('#news-articles-grid .media-card__cover-link').first().getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('a scanned clipping with no live URL is marked with the archive badge, not styled as a live link', async ({ page }) => {
    // The Jeevan Express card only has an archive_url (a local scanned image), no live url.
    const card = page.locator('#news-articles-grid .media-card', { hasText: 'Jeevan Express' });
    await expect(card.locator('.media-card__archive-badge')).toBeVisible();
  });
});

test.describe('Interviews section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#interviews-grid .media-card');
  });

  test('interview cards are rendered', async ({ page }) => {
    expect(await page.locator('#interviews-grid .media-card').count()).toBeGreaterThan(0);
  });

  test('interview cards link to external sources', async ({ page }) => {
    const href = await page.locator('#interviews-grid .media-card__cover-link').first().getAttribute('href');
    expect(href).toBeTruthy();
  });
});

test.describe('Published Essays section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#essays-grid .media-card');
  });

  test('essay cards are rendered', async ({ page }) => {
    expect(await page.locator('#essays-grid .media-card').count()).toBeGreaterThan(0);
  });

  test('essay cards link to external sources', async ({ page }) => {
    const href = await page.locator('#essays-grid .media-card__cover-link').first().getAttribute('href');
    expect(href).toBeTruthy();
  });
});
