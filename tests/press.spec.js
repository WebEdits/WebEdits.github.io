const { test, expect } = require('@playwright/test');
const { swipe } = require('./helpers');

test.describe('Book detail — press coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
    await page.locator('.book-card[data-id="swarna-jhanak"]').click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });

  test('press section renders thumbnails for a book with press data', async ({ page }) => {
    await expect(page.locator('.book-detail__press-thumb')).toHaveCount(5);
  });

  test('clicking a thumbnail opens the press lightbox', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await expect(page.locator('#press-lightbox')).toHaveClass(/open/);
  });

  test('lightbox image src matches the clicked thumbnail', async ({ page }) => {
    const expectedSrc = await page.locator('.book-detail__press-thumb img').first().getAttribute('src');
    await page.locator('.book-detail__press-thumb').first().click();
    const lightboxSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    expect(lightboxSrc).toContain(expectedSrc?.split('/').pop() ?? '');
  });

  test('lightbox caption shows the source', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    const caption = await page.locator('#press-lightbox .lightbox__caption').textContent();
    expect(caption?.trim().length).toBeGreaterThan(0);
  });

  test('× button closes the press lightbox', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await page.locator('#press-lightbox .lightbox__close').click();
    await expect(page.locator('#press-lightbox')).not.toHaveClass(/open/);
  });

  test('Escape key closes only the press lightbox, not the book detail modal underneath', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#press-lightbox')).not.toHaveClass(/open/);
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });

  test('closing the lightbox while the book modal stays open keeps page scroll locked', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await page.locator('#press-lightbox .lightbox__close').click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');
  });

  test('ArrowRight while the lightbox is open advances the image, not the book underneath', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    const bookTitleBefore = await page.locator('.book-detail__title').textContent();
    const firstSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    await page.keyboard.press('ArrowRight');
    const nextSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    expect(nextSrc).not.toBe(firstSrc);
    await expect(page.locator('#press-lightbox')).toHaveClass(/open/);
    const bookTitleAfter = await page.locator('.book-detail__title').textContent();
    expect(bookTitleAfter).toBe(bookTitleBefore);
  });

  test('next tap zone advances to a different image', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    const firstSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    await page.locator('#press-lightbox .lightbox__tap-next').click();
    const nextSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    expect(nextSrc).not.toBe(firstSrc);
  });

  test('previous tap zone goes to a different image', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    const firstSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    await page.locator('#press-lightbox .lightbox__tap-prev').click();
    const prevSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    expect(prevSrc).not.toBe(firstSrc);
  });

  test('captions for clippings on different days stay distinguishable', async ({ page }) => {
    // clipping 1 is dated 2026-07-10, clipping 5 is dated 2026-07-11 — same month.
    await page.locator('.book-detail__press-thumb').nth(0).click();
    const firstCaption = await page.locator('#press-lightbox .lightbox__caption').textContent();
    await page.keyboard.press('Escape'); // close lightbox only; thumbnails are behind it while open
    await page.locator('.book-detail__press-thumb').nth(4).click();
    const lastCaption = await page.locator('#press-lightbox .lightbox__caption').textContent();
    expect(lastCaption).not.toBe(firstCaption);
  });

  test('swipe left advances to a different image', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    const firstSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    await swipe(page, '#press-lightbox .lightbox__content', { dx: -100 });
    const nextSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    expect(nextSrc).not.toBe(firstSrc);
  });

  test('swipe right goes to a different image', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    const firstSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    await swipe(page, '#press-lightbox .lightbox__content', { dx: 100 });
    const prevSrc = await page.locator('#press-lightbox .lightbox__img').getAttribute('src');
    expect(prevSrc).not.toBe(firstSrc);
  });

  test('swipe down dismisses only the press lightbox, not the book detail modal underneath', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await expect(page.locator('#press-lightbox')).toHaveClass(/open/);
    await swipe(page, '#press-lightbox .lightbox__content', { dy: 150 });
    await expect(page.locator('#press-lightbox')).not.toHaveClass(/open/);
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });

  test('back button closes only the press lightbox, not the book detail modal underneath', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await expect(page.locator('#press-lightbox')).toHaveClass(/open/);
    await page.goBack();
    await expect(page.locator('#press-lightbox')).not.toHaveClass(/open/);
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });

  test('a second back press then closes the book detail modal', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await page.goBack(); // closes the press lightbox
    await page.goBack(); // closes the book detail modal
    await expect(page.locator('#book-detail-modal')).not.toHaveClass(/open/);
  });

  test('forward button after closing the press lightbox does not also close the book modal', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await page.goBack(); // closes the press lightbox; book modal stays open
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
    await page.goForward();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
  });
});

test.describe('Book detail — no press data', () => {
  test('books without press data show no press section', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card');
    await page.locator('.book-card[data-id="teevra-madhyam"]').click();
    await expect(page.locator('#book-detail-modal')).toHaveClass(/open/);
    await expect(page.locator('.book-detail__press-thumb')).toHaveCount(0);
  });
});
