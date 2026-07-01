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

test.describe('Press section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.press-item');
  });

  test('press items are rendered', async ({ page }) => {
    expect(await page.locator('.press-item').count()).toBeGreaterThan(0);
  });

  test('press items link to external sources', async ({ page }) => {
    const href = await page.locator('.press-item').first().getAttribute('href');
    expect(href).toBeTruthy();
  });
});

test.describe('Interviews accordion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.accordion-item');
  });

  test('interview items are rendered', async ({ page }) => {
    expect(await page.locator('.accordion-item').count()).toBeGreaterThan(0);
  });

  test('all interview items start collapsed', async ({ page }) => {
    const expanded = page.locator('.accordion-btn[aria-expanded="true"]');
    expect(await expanded.count()).toBe(0);
  });

  test('clicking an interview expands it', async ({ page }) => {
    await page.locator('.accordion-btn').first().click();
    await expect(page.locator('.accordion-btn').first()).toHaveAttribute('aria-expanded', 'true');
  });

  test('opening a second interview collapses the first', async ({ page }) => {
    const btns = page.locator('.accordion-btn');
    if (await btns.count() < 2) test.skip();
    await btns.first().click();
    await btns.nth(1).click();
    await expect(btns.first()).toHaveAttribute('aria-expanded', 'false');
    await expect(btns.nth(1)).toHaveAttribute('aria-expanded', 'true');
  });
});
