const { test, expect } = require('@playwright/test');

// Tests for values the page derives from data/*.json rather than hardcodes.
// Each test serves a small fixture built from the real JSON (so every field
// the renderers need is present) with only the fields under test overridden.

async function routeJSON(page, file, transform) {
  await page.route(`**/data/${file}`, async route => {
    const res = await route.fetch();
    const json = transform(await res.json());
    await route.fulfill({ response: res, json });
  });
}

const firstEditions = books => books.filter(b => !b.coming_soon && (b.edition || 1) === 1);

test.describe('Bio book count', () => {
  test.beforeEach(async ({ page }) => {
    // 3 published first editions + 1 later edition + 1 announced title → 3
    await routeJSON(page, 'books.json', books => {
      const [a, b, c] = firstEditions(books);
      return [
        a, b, c,
        { ...a, id: 'fixture-2nd-ed', edition: 2, year: 2030 },
        { ...b, id: 'fixture-soon', canonical_id: 'fixture-soon', coming_soon: true, year: 2031 },
      ];
    });
    await page.goto('/');
    await page.waitForSelector('.review-group'); // data loaded and rendered
  });

  test('counts only published first editions (Hindi)', async ({ page }) => {
    const bio = page.locator('.hero__bio');
    await expect(bio).toContainText('अब तक तीन पुस्तक');
    await expect(bio).not.toContainText('{');
  });

  test('counts only published first editions (English)', async ({ page }) => {
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    await expect(page.locator('.hero__bio')).toContainText('Three book titles published to date.');
  });
});

test('bio count matches real data and leaves no placeholder', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.review-group');
  await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
  const bio = page.locator('.hero__bio');
  await expect(bio).not.toContainText('{');
  await expect(bio).toContainText(/[A-Z][a-z-]+ book titles published to date\./);
});

test('a coming_soon volume does not move its series to the top of reviews', async ({ page }) => {
  await routeJSON(page, 'books.json', books => {
    const [a, b] = firstEditions(books);
    return [
      { ...a, id: 'older', canonical_id: 'older', year: 2019 },
      { ...b, id: 'newer', canonical_id: 'newer', year: 2020 },
      // Announced volume of the *older* series, far in the future.
      { ...a, id: 'older-next', canonical_id: 'older', year: 2099, coming_soon: true },
    ];
  });
  await routeJSON(page, 'reviews.json', reviews => [
    { ...reviews[0], id: 'r-older', canonical_id: 'older' },
    { ...reviews[0], id: 'r-newer', canonical_id: 'newer' },
  ]);
  await page.goto('/');
  await page.waitForSelector('.review-group');
  await expect(page.locator('.review-group__btn').first()).toHaveAttribute('data-canon', 'newer');
});
