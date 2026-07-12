// Shared test helpers.
//
// Playwright's built-in touchscreen API only supports simple taps, so swipe
// gestures are dispatched as synthetic TouchEvents matching what
// attachSwipeNav() in assets/js/main.js reads (touches / changedTouches with
// clientX/clientY). This works in the default desktop-Chromium project even
// without touch emulation enabled — Chromium exposes the Touch/TouchEvent
// constructors regardless of hasTouch.
async function swipe(page, selector, { dx = 0, dy = 0 } = {}) {
  await page.evaluate(({ selector, dx, dy }) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`swipe(): no element matches "${selector}"`);
    const rect = el.getBoundingClientRect();
    const x1 = rect.x + rect.width / 2, y1 = rect.y + rect.height / 2;
    const x2 = x1 + dx, y2 = y1 + dy;
    const fire = (type, x, y, live) => {
      const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, {
        touches: live ? [t] : [],
        changedTouches: [t],
        targetTouches: live ? [t] : [],
        bubbles: true,
        cancelable: true,
      }));
    };
    fire('touchstart', x1, y1, true);
    fire('touchend', x2, y2, false);
  }, { selector, dx, dy });
}

module.exports = { swipe };
