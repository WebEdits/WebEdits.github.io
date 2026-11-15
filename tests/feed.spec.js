const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Builds the feeds into a temp dir with a fixed "now", then checks invariants
// that hold for any data (so adding content never breaks these tests).
const NOW = '2026-11-15';

function buildFeeds(outDir) {
  execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'build-feed.js'), '--out', outDir, '--now', NOW]);
  return {
    hi: fs.readFileSync(path.join(outDir, 'feed.xml'), 'utf8'),
    en: fs.readFileSync(path.join(outDir, 'feed-en.xml'), 'utf8'),
  };
}

// Parse with the browser's XML parser; returns null if not well-formed.
async function parseFeed(page, xml) {
  return page.evaluate(src => {
    const doc = new DOMParser().parseFromString(src, 'application/xml');
    if (doc.querySelector('parsererror')) return null;
    const ch = doc.querySelector('rss > channel');
    return {
      language: ch.querySelector(':scope > language')?.textContent,
      items: [...ch.querySelectorAll('item')].map(i => ({
        title: i.querySelector('title')?.textContent,
        link: i.querySelector('link')?.textContent,
        guid: i.querySelector('guid')?.textContent,
        pubDate: i.querySelector('pubDate')?.textContent,
      })),
    };
  }, xml);
}

test.describe('RSS feeds', () => {
  let feeds;
  test.beforeAll(({}, testInfo) => { feeds = buildFeeds(testInfo.outputPath('feeds')); });

  for (const [lang, langTag] of [['hi', 'hi-IN'], ['en', 'en']]) {
    test(`${lang} feed is well-formed RSS with valid items`, async ({ page }) => {
      const feed = await parseFeed(page, feeds[lang]);
      expect(feed, 'feed XML should parse').not.toBeNull();
      expect(feed.language).toBe(langTag);
      expect(feed.items.length).toBeGreaterThan(0);
      expect(feed.items.length).toBeLessThanOrEqual(50);

      const guids = feed.items.map(i => i.guid);
      expect(new Set(guids).size, 'guids must be unique').toBe(guids.length);

      const dates = feed.items.map(i => Date.parse(i.pubDate));
      for (const [i, d] of dates.entries()) {
        expect(d, `item ${i} pubDate`).not.toBeNaN();
        expect(d, `item ${i} must not be future-dated`).toBeLessThanOrEqual(Date.parse(NOW));
        if (i) expect(d, 'items newest first').toBeLessThanOrEqual(dates[i - 1]);
      }
      for (const it of feed.items) {
        expect(it.title.trim()).not.toBe('');
        expect(it.title).not.toMatch(/:\s+—/); // no empty series/part in talk titles
        expect(it.link).toMatch(/^https:\/\//);
      }
    });
  }

  test('excludes the template post and unreleased books', async ({ page }) => {
    const books = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'books.json'), 'utf8'));
    const feed = await parseFeed(page, feeds.en);
    const guids = feed.items.map(i => i.guid);
    expect(guids.some(g => g.endsWith('#post-example-post'))).toBe(false);
    for (const b of books.filter(b => b.coming_soon)) {
      expect(guids).not.toContain(`https://prachandpraveer.com/#book-${b.id}`);
    }
  });
});

test.describe('RSS discovery on the site', () => {
  test('pages advertise both feeds and they are served', async ({ page, request }) => {
    for (const url of ['/', '/posts.html']) {
      await page.goto(url);
      const hrefs = await page.locator('link[rel="alternate"][type="application/rss+xml"]').evaluateAll(ls => ls.map(l => l.getAttribute('href')));
      expect(hrefs.sort()).toEqual(['feed-en.xml', 'feed.xml']);
    }
    for (const f of ['/feed.xml', '/feed-en.xml']) {
      const res = await request.get(f);
      expect(res.ok(), `${f} should be committed and served`).toBe(true);
    }
  });

  test('footer RSS link follows the language toggle', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.review-group');
    const rss = page.locator('footer a[data-rss]');
    await expect(rss).toHaveAttribute('href', 'feed.xml');
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    await expect(rss).toHaveAttribute('href', 'feed-en.xml');
  });
});
