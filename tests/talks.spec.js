const { test, expect } = require('@playwright/test');

// Mirrors fmtDate() in assets/js/main.js — kept in sync deliberately rather than
// imported, since the app has no module system to import from in a Playwright test.
const HI_MONTHS = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितम्बर','अक्टूबर','नवम्बर','दिसम्बर'];
const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(str, months) {
  if (!str) return '';
  const [y, m] = str.split('-');
  if (!m) return y;
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

// Mirrors t() in assets/js/main.js: obj[lang] || obj.hi || obj.en || ''
function t(obj, lang) {
  return (obj && obj[lang]) || obj?.hi || obj?.en || '';
}

function expectedTitles(talksData, lang) {
  return talksData.flatMap(g => (g.videos || []).map(v =>
    g.seriesTitle ? `${t(g.seriesTitle, lang)} — ${t(v.title, lang)}` : t(v.title, lang)
  ));
}

function expectedDates(talksData, months) {
  return talksData.flatMap(g => (g.videos || []).map(v => fmtDate(v.date, months)));
}

test.describe('Talks — video cards', () => {
  let talksData;

  test.beforeEach(async ({ page }) => {
    const res = await page.request.get('/data/talks.json');
    talksData = await res.json();
    await page.goto('/');
    await page.waitForSelector('#talks-grid .talk-card');
  });

  test('renders exactly one card per video across all talk groups', async ({ page }) => {
    const expected = talksData.reduce((n, g) => n + (g.videos?.length || 0), 0);
    await expect(page.locator('.talk-card')).toHaveCount(expected);
  });

  test('cards embed the correct youtube video, in source order', async ({ page }) => {
    const expectedIds = talksData.flatMap(g => (g.videos || []).map(v => v.youtube_id));
    const srcs = await page.locator('.talk-card iframe').evaluateAll(
      els => els.map(el => el.getAttribute('src'))
    );
    const actualIds = srcs.map(src => src.match(/embed\/([^?]+)/)?.[1]);
    expect(actualIds).toEqual(expectedIds);
  });

  test("each card shows its own video's date, not its group's or a sibling video's date", async ({ page }) => {
    await expect(page.locator('.talk-card__meta')).toHaveText(expectedDates(talksData, HI_MONTHS));
  });

  test("each card shows its own video's title, prefixed with the series title when grouped", async ({ page }) => {
    await expect(page.locator('.talk-card__title')).toHaveText(expectedTitles(talksData, 'hi'));
  });

  test('talks with no videos are listed in the text section, not rendered as cards', async ({ page }) => {
    const textOnly = talksData.filter(g => !g.videos || g.videos.length === 0);
    test.skip(textOnly.length === 0, 'no text-only talks in current data');
    await expect(page.locator('.talks-text-item')).toHaveCount(textOnly.length);
    await expect(page.locator('.talks-text-date')).toHaveText(textOnly.map(g => fmtDate(g.date, HI_MONTHS)));
    await expect(page.locator('.talks-text-title')).toHaveText(textOnly.map(g => t(g.title, 'hi')));
    const cardTitles = await page.locator('.talk-card__title').allTextContents();
    for (const g of textOnly) {
      expect(cardTitles.some(title => title.includes(g.title.hi))).toBe(false);
    }
  });

  test('switching to English re-renders card titles and dates in English', async ({ page }) => {
    await page.locator('.nav .lang-toggle button[data-lang="en"]').click();
    await expect(page.locator('.talk-card__title')).toHaveText(expectedTitles(talksData, 'en'));
    await expect(page.locator('.talk-card__meta')).toHaveText(expectedDates(talksData, EN_MONTHS));
  });
});
