const { test, expect } = require('@playwright/test');

test.describe('Contact form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#contact-form');
  });

  test('name, email and message are required', async ({ page }) => {
    await expect(page.locator('#name')).toHaveAttribute('required', '');
    await expect(page.locator('#email')).toHaveAttribute('required', '');
    await expect(page.locator('#message')).toHaveAttribute('required', '');
  });

  test('submitting an empty form is blocked by native validation', async ({ page }) => {
    await page.locator('#contact-form button[type="submit"]').click();
    const nameIsValid = await page.locator('#name').evaluate(el => el.checkValidity());
    expect(nameIsValid).toBe(false);
    // Form markup must remain (no submission occurred / no thank-you swap).
    await expect(page.locator('#contact-form input#name')).toBeVisible();
  });

  test('a successful submission shows the thank-you message', async ({ page }) => {
    await page.route('**/formspree.io/f/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));

    await page.fill('#name', 'Test Reader');
    await page.fill('#email', 'reader@example.com');
    await page.fill('#message', 'Loved the new book.');
    await page.locator('#contact-form button[type="submit"]').click();

    await expect(page.locator('#contact-form')).toContainText(/धन्यवाद|Thank you/);
  });

  test('a failed submission re-enables the button and alerts the user', async ({ page }) => {
    await page.route('**/formspree.io/f/**', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' }));

    let dialogMessage = '';
    page.once('dialog', async dialog => { dialogMessage = dialog.message(); await dialog.accept(); });

    await page.fill('#name', 'Test Reader');
    await page.fill('#email', 'reader@example.com');
    await page.fill('#message', 'Loved the new book.');
    const submitBtn = page.locator('#contact-form button[type="submit"]');
    await submitBtn.click();

    await expect.poll(() => dialogMessage).not.toBe('');
    await expect(submitBtn).toBeEnabled();
  });
});
