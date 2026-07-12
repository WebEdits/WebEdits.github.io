const { test, expect } = require('@playwright/test');

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

  test('Escape key closes the press lightbox', async ({ page }) => {
    await page.locator('.book-detail__press-thumb').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#press-lightbox')).not.toHaveClass(/open/);
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
