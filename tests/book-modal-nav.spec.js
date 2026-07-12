const { test, expect } = require('@playwright/test');
const { swipe } = require('./helpers');

test.describe('Book detail modal — edition switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
    await page.locator('.book-card[data-id="abhinav-cinema-3"]').click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });

  test('other-editions buttons are rendered for a book with multiple editions', async ({ page }) => {
    expect(await page.locator('.book-detail__edition-btn').count()).toBeGreaterThan(0);
  });

  test('clicking an edition button swaps the displayed edition label', async ({ page }) => {
    const before = await page.locator('.book-detail__meta').textContent();
    await page.locator('.book-detail__edition-btn').first().click();
    const after = await page.locator('.book-detail__meta').textContent();
    expect(after).not.toBe(before);
  });

  test('modal stays open after switching editions', async ({ page }) => {
    await page.locator('.book-detail__edition-btn').first().click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });
});

test.describe('Book detail modal — reviews button', () => {
  test('"See Reviews" closes the modal and expands the matching review group', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
    await page.locator('.book-card[data-id="abhinav-cinema-3"]').click();
    await page.locator('.book-detail__reviews-btn').click();
    await expect(page.locator('#book-detail-modal')).not.toHaveClass(/open/);
    await expect(page.locator('.review-group__btn[data-canon="abhinav-cinema"]'))
      .toHaveAttribute('aria-expanded', 'true');
  });

  test('closing via "See Reviews" does not leave an orphaned history entry for the next back press', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
    await page.locator('.book-card[data-id="abhinav-cinema-3"]').click();
    await page.locator('.book-detail__reviews-btn').click();
    await expect(page.locator('#book-detail-modal')).not.toHaveClass(/open/);
    // If the reviews button left the modal's history entry unconsumed, this
    // single back press would just silently re-hide the already-closed
    // modal instead of leaving the page.
    await page.goBack();
    await expect(page.locator('.book-card')).toHaveCount(0);
  });
});

test.describe('Book detail modal — prev/next navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
  });

  test('next arrow moves to a different book', async ({ page }) => {
    await page.locator('.book-card').first().click();
    const firstTitle = await page.locator('.book-detail__title').textContent();
    await page.locator('.book-detail__nav--next').click();
    const nextTitle = await page.locator('.book-detail__title').textContent();
    expect(nextTitle).not.toBe(firstTitle);
  });

  test('prev arrow after next returns to the original book', async ({ page }) => {
    await page.locator('.book-card').first().click();
    const firstTitle = await page.locator('.book-detail__title').textContent();
    await page.locator('.book-detail__nav--next').click();
    await page.locator('.book-detail__nav--prev').click();
    const backTitle = await page.locator('.book-detail__title').textContent();
    expect(backTitle).toBe(firstTitle);
  });

  test('nav arrows are hidden when a genre filter narrows the grid to one book', async ({ page }) => {
    // Find a genre with exactly one book, if any exists; otherwise skip.
    const genreButtons = await page.locator('#books-filter button:not([data-genre="all"])').all();
    for (const btn of genreButtons) {
      await btn.click();
      const count = await page.locator('.book-card').count();
      if (count === 1) {
        await page.locator('.book-card').first().click();
        await expect(page.locator('.book-detail__nav--prev')).toBeHidden();
        await expect(page.locator('.book-detail__nav--next')).toBeHidden();
        return;
      }
    }
    test.skip(true, 'No single-book genre in current data set');
  });

  test('swipe left moves to a different book', async ({ page }) => {
    await page.locator('.book-card').first().click();
    const firstTitle = await page.locator('.book-detail__title').textContent();
    await swipe(page, '.book-detail__panel', { dx: -100 });
    const nextTitle = await page.locator('.book-detail__title').textContent();
    expect(nextTitle).not.toBe(firstTitle);
  });

  test('swipe right after swiping left returns to the original book', async ({ page }) => {
    await page.locator('.book-card').first().click();
    const firstTitle = await page.locator('.book-detail__title').textContent();
    await swipe(page, '.book-detail__panel', { dx: -100 });
    await swipe(page, '.book-detail__panel', { dx: 100 });
    const backTitle = await page.locator('.book-detail__title').textContent();
    expect(backTitle).toBe(firstTitle);
  });
});

test.describe('Book detail modal — back button / history', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
  });

  test('back button closes the modal instead of leaving the page', async ({ page }) => {
    await page.locator('.book-card').first().click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
    await page.goBack();
    await expect(page.locator('#book-detail-modal')).not.toHaveClass(/open/);
    await expect(page.locator('.book-card').first()).toBeVisible();
  });

  test('switching editions while open does not push extra history entries', async ({ page }) => {
    await page.locator('.book-card[data-id="abhinav-cinema-3"]').click();
    await page.locator('.book-detail__edition-btn').first().click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
    // A single back press should fully close the modal even though it was
    // re-rendered in place for the edition switch, not re-opened.
    await page.goBack();
    await expect(page.locator('#book-detail-modal')).not.toHaveClass(/open/);
  });
});

test.describe('Book detail modal — cover image', () => {
  test('cover image is anchored to the top, not center-cropped', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
    await page.locator('.book-card').first().click();
    const objectPosition = await page.locator('.book-detail__cover-wrap img')
      .evaluate(el => getComputedStyle(el).objectPosition);
    expect(objectPosition).toBe('50% 0%');
  });
});
