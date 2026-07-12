const { test, expect } = require('@playwright/test');

test.describe('Reviews — flip cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.review-card--flip');
  });

  test('clicking a review card flips it', async ({ page }) => {
    const card = page.locator('.review-group__body:not([hidden]) .review-card--flip').first();
    await card.click();
    await expect(card).toHaveClass(/flipped/);
  });

  test('the back-close button un-flips the card', async ({ page }) => {
    const card = page.locator('.review-group__body:not([hidden]) .review-card--flip').first();
    await card.click();
    await expect(card).toHaveClass(/flipped/);
    await card.locator('.review-card__back-close').click();
    await expect(card).not.toHaveClass(/flipped/);
  });
});

test.describe('Reviews — show more / show less', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.review-group');
    // abhinav-cinema has 15 reviews — well past the show-more threshold.
    const btn = page.locator('.review-group__btn[data-canon="abhinav-cinema"]');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  test('hidden cards exist beyond the initial count', async ({ page }) => {
    const moreBtn = page.locator('.review-group__more-btn').first();
    const body = moreBtn.locator('xpath=ancestor::div[contains(@class,"review-group__body")]');
    expect(await body.locator('.review-card--hidden').count()).toBeGreaterThan(0);
  });

  test('"show more" reveals the remaining cards', async ({ page }) => {
    const moreBtn = page.locator('.review-group__more-btn').first();
    const body = moreBtn.locator('xpath=ancestor::div[contains(@class,"review-group__body")]');
    await moreBtn.click();
    expect(await body.locator('.review-card--hidden').count()).toBe(0);
    await expect(moreBtn).toHaveAttribute('aria-expanded', 'true');
  });

  test('"show less" re-hides the extra cards', async ({ page }) => {
    const moreBtn = page.locator('.review-group__more-btn').first();
    const body = moreBtn.locator('xpath=ancestor::div[contains(@class,"review-group__body")]');
    await moreBtn.click();
    await moreBtn.click();
    expect(await body.locator('.review-card--hidden').count()).toBeGreaterThan(0);
    await expect(moreBtn).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Reviews — back to book', () => {
  test('"View book" button opens the book detail modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.review-group__back-btn');
    await page.locator('.review-group__back-btn').first().click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });
});
