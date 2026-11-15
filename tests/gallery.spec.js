const { test, expect } = require('@playwright/test');
const { swipe } = require('./helpers');

test.describe('Gallery lightbox', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // .gallery-item is static HTML, but its click handlers are only wired up
    // by initGalleryCarousel() after main.js finishes fetching all data JSON.
    // The lightbox element is created in that same call, so wait for it.
    await page.locator('#gallery-lightbox').waitFor({ state: 'attached' });
  });

  test('8 gallery items are present', async ({ page }) => {
    await expect(page.locator('.gallery-item')).toHaveCount(8);
  });

  test('clicking a gallery item opens the lightbox', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    await expect(page.locator('#gallery-lightbox')).toHaveClass(/open/);
  });

  test('lightbox shows the image', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    await expect(page.locator('.lightbox__img')).toBeVisible();
  });

  test('lightbox image src matches the clicked item', async ({ page }) => {
    const expectedSrc = await page.locator('.gallery-item img').first().getAttribute('src');
    await page.locator('.gallery-item').first().click();
    const lightboxSrc = await page.locator('.lightbox__img').getAttribute('src');
    expect(lightboxSrc).toContain(expectedSrc?.split('/').pop() ?? '');
  });

  test('× button closes the lightbox', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    await page.locator('.lightbox__close').click();
    await expect(page.locator('#gallery-lightbox')).not.toHaveClass(/open/);
  });

  test('Escape key closes the lightbox', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#gallery-lightbox')).not.toHaveClass(/open/);
  });

  test('next tap zone advances to a different image', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    const firstSrc = await page.locator('.lightbox__img').getAttribute('src');
    await page.locator('.lightbox__tap-next').click();
    const nextSrc = await page.locator('.lightbox__img').getAttribute('src');
    expect(nextSrc).not.toBe(firstSrc);
  });

  test('previous tap zone goes to a different image', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    const firstSrc = await page.locator('.lightbox__img').getAttribute('src');
    await page.locator('.lightbox__tap-prev').click();
    const prevSrc = await page.locator('.lightbox__img').getAttribute('src');
    expect(prevSrc).not.toBe(firstSrc);
  });

  test('swipe left advances to a different image', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    const firstSrc = await page.locator('.lightbox__img').getAttribute('src');
    await swipe(page, '.lightbox__content', { dx: -100 });
    const nextSrc = await page.locator('.lightbox__img').getAttribute('src');
    expect(nextSrc).not.toBe(firstSrc);
  });

  test('swipe right goes to a different image', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    const firstSrc = await page.locator('.lightbox__img').getAttribute('src');
    await swipe(page, '.lightbox__content', { dx: 100 });
    const prevSrc = await page.locator('.lightbox__img').getAttribute('src');
    expect(prevSrc).not.toBe(firstSrc);
  });

  test('swipe down dismisses the lightbox', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    await expect(page.locator('#gallery-lightbox')).toHaveClass(/open/);
    await swipe(page, '.lightbox__content', { dy: 150 });
    await expect(page.locator('#gallery-lightbox')).not.toHaveClass(/open/);
  });

  test('a short tap (below the swipe threshold) does not advance or dismiss', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    const firstSrc = await page.locator('.lightbox__img').getAttribute('src');
    await swipe(page, '.lightbox__content', { dx: 5, dy: 5 });
    await expect(page.locator('#gallery-lightbox')).toHaveClass(/open/);
    const sameSrc = await page.locator('.lightbox__img').getAttribute('src');
    expect(sameSrc).toBe(firstSrc);
  });

  test('back button closes the lightbox instead of leaving the page', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    await expect(page.locator('#gallery-lightbox')).toHaveClass(/open/);
    await page.goBack();
    await expect(page.locator('#gallery-lightbox')).not.toHaveClass(/open/);
    // still on the same page, not navigated away
    await expect(page.locator('.gallery-item')).toHaveCount(8);
  });

  test('closing via × does not leave an orphaned history entry for the next back press', async ({ page }) => {
    await page.locator('.gallery-item').first().click();
    await page.locator('.lightbox__close').click();
    await expect(page.locator('#gallery-lightbox')).not.toHaveClass(/open/);
    // close() pops its history entry via an async history.back(); wait for
    // that to land so our goBack() doesn't race it.
    await expect.poll(() => page.evaluate(() => history.state?.ppModal ?? 0), { timeout: 15000 }).toBe(0);
    // The open→close cycle should have already consumed its own history
    // entry, so a single back press here now leaves the page.
    await page.goBack();
    await expect(page.locator('.gallery-item')).toHaveCount(0);
  });
});
