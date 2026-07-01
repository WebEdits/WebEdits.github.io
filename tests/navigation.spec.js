const { test, expect } = require('@playwright/test');

test.describe('Navigation — desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('brand link is visible', async ({ page }) => {
    await expect(page.locator('.nav__brand')).toBeVisible();
  });

  test('desktop nav has 7 links', async ({ page }) => {
    await expect(page.locator('.nav__links li')).toHaveCount(7);
  });
});

// Hamburger and mobile drawer are only visible at ≤768px
test.describe('Navigation — mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hamburger click opens mobile drawer', async ({ page }) => {
    await expect(page.locator('#nav-drawer')).not.toHaveClass(/open/);
    await page.locator('#nav-ham').click();
    await expect(page.locator('#nav-drawer')).toHaveClass(/open/);
  });

  test('second hamburger click closes mobile drawer', async ({ page }) => {
    await page.locator('#nav-ham').click();
    await page.locator('#nav-ham').click();
    await expect(page.locator('#nav-drawer')).not.toHaveClass(/open/);
  });

  test('clicking a drawer link closes the drawer', async ({ page }) => {
    await page.locator('#nav-ham').click();
    await expect(page.locator('#nav-drawer')).toHaveClass(/open/);
    await page.locator('#nav-drawer a').first().click();
    await expect(page.locator('#nav-drawer')).not.toHaveClass(/open/);
  });
});
