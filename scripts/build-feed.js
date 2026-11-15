#!/usr/bin/env node
// Builds the site's RSS feeds from data/*.json:
//   feed.xml     — Hindi
//   feed-en.xml  — English
//
// RSS readers poll these files; nothing is pushed. Run after changing data:
//   npm run build:feed
// The GitHub Action in .github/workflows/feed.yml also runs this on every push
// that touches data/ and once a day, so future-dated items appear on time.
//
// Usage: node scripts/build-feed.js [--out DIR] [--now ISO_DATE]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://prachandpraveer.com';
const MAX_ITEMS = 50;

const args = process.argv.slice(2);
const argVal = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const OUT_DIR = path.resolve(argVal('--out') || ROOT);
const NOW = argVal('--now') ? new Date(argVal('--now')) : new Date();

const load = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));

const LANGS = {
  hi: {
    file: 'feed.xml', other: 'feed-en.xml', langTag: 'hi-IN',
    title: 'प्रचण्ड प्रवीर',
    description: 'प्रचण्ड प्रवीर की नई पुस्तकें, लेख, व्याख्यान और समाचार',
    labels: { book: 'पुस्तक', edition: 'नया संस्करण', talk: 'व्याख्यान', essay: 'आलेख', media: 'मीडिया', interview: 'साक्षात्कार' },
  },
  en: {
    file: 'feed-en.xml', other: 'feed.xml', langTag: 'en',
    title: 'Prachand Praveer',
    description: 'New books, posts, talks and news from Prachand Praveer',
    labels: { book: 'Book', edition: 'New edition', talk: 'Talk', essay: 'Essay', media: 'Media', interview: 'Interview' },
  },
};

// "2026", "2026-07" or "2026-07-10" → Date (UTC midnight; missing parts = 1st)
function parseDate(s) {
  if (!s) return null;
  const [y, m = '01', d = '01'] = String(s).split('-');
  const dt = new Date(Date.UTC(+y, +m - 1, +d));
  return isNaN(dt) ? null : dt;
}

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pick = (obj, lang) => (obj && typeof obj === 'object') ? (obj[lang] || obj.hi || obj.en || '') : (obj || '');
const abs = p => /^https?:/.test(p) ? p : `${SITE}/${String(p).replace(/^\//, '')}`;

function collectItems(lang) {
  const L = LANGS[lang].labels;
  const items = [];
  const add = (kind, id, date, item) => {
    const d = parseDate(date);
    if (d) items.push({ guid: `${SITE}/#${kind}-${id}`, date: d, ...item });
  };

  const books = load('books.json');
  const bookById = Object.fromEntries(books.map(b => [b.id, b]));

  const news = load('news.json');
  const announcedBooks = new Set(news.map(n => n.book_id).filter(Boolean));
  for (const n of news) {
    const book = n.book_id && bookById[n.book_id];
    add('news', n.id, n.date, {
      title: pick(n.title, lang),
      description: pick(n.body, lang),
      link: n.link || `${SITE}/#news`,
      image: book?.cover && abs(book.cover),
    });
  }

  for (const p of load('posts.json')) {
    if (p.id === 'example-post') continue; // template placeholder, not a real post
    const html = (p.body || []).map(b => {
      if (b.type === 'heading') return `<h3>${esc(pick(b.text, lang))}</h3>`;
      if (b.type === 'image' && b.src) return `<p><img src="${esc(abs(b.src))}" alt="${esc(pick(b.caption, lang))}"></p>`;
      return b.text ? `<p>${esc(pick(b.text, lang))}</p>` : '';
    }).join('');
    add('post', p.id, p.date, {
      title: pick(p.title, lang),
      description: html, descriptionIsHtml: true,
      link: `${SITE}/posts.html#${encodeURIComponent(p.id)}`,
      image: p.image && abs(p.image),
      categories: p.tags,
    });
  }

  for (const b of books) {
    if (b.coming_soon) continue;                // not out yet
    if (announcedBooks.has(b.id)) continue;     // news.json already has an item for it
    const later = (b.edition || 1) > 1;
    const title = pick(b.title, lang) + (later ? ` — ${pick(b.edition_label, lang) || L.edition}` : '');
    add('book', b.id, b.date || b.year, {
      title: `${later ? L.edition : L.book}: ${title}`,
      description: pick(b.description, lang),
      link: b.links?.amazon_in || `${SITE}/#books`,
      image: b.cover && abs(b.cover),
      categories: [pick(b.genre, lang)].filter(Boolean),
    });
  }

  for (const t of load('talks.json')) {
    const series = pick(t.seriesTitle, lang);
    const videos = t.videos || [];
    for (const v of videos) {
      const part = pick(v.title, lang);
      add('talk', `${t.id}-${v.youtube_id}`, v.date || t.date, {
        title: `${L.talk}: ${[series, part].filter(Boolean).join(' — ')}`,
        description: pick(t.description, lang),
        link: `https://www.youtube.com/watch?v=${encodeURIComponent(v.youtube_id)}`,
        image: `https://i.ytimg.com/vi/${encodeURIComponent(v.youtube_id)}/hqdefault.jpg`,
      });
    }
    if (!videos.length) { // in-person talk with no recording
      add('talk', t.id, t.date, {
        title: `${L.talk}: ${pick(t.title, lang) || series}`,
        description: pick(t.description, lang),
        link: `${SITE}/#talks`,
      });
    }
  }

  for (const e of load('essays.json')) {
    add('essay', e.id, e.date, {
      title: `${L.essay}: ${pick(e.title, lang)}`,
      description: e.source || '',
      link: e.url || e.archive_url || `${SITE}/#media`,
    });
  }

  for (const a of load('news-articles.json')) {
    add('media', a.id, a.date, {
      title: `${L.media}: ${a.source}`,
      description: pick(a.quote, lang),
      link: a.url || a.archive_url || `${SITE}/#media`,
    });
  }

  for (const i of load('interviews.json')) {
    add('interview', i.id, i.date, {
      title: `${L.interview}: ${pick(i.title, lang) || i.source}`,
      description: i.source || '',
      link: i.url || i.archive_url || `${SITE}/#media`,
    });
  }

  return items
    .filter(it => it.date <= NOW) // future-dated items appear on a later (daily) build
    .sort((a, b) => b.date - a.date || a.guid.localeCompare(b.guid))
    .slice(0, MAX_ITEMS);
}

function renderFeed(lang) {
  const cfg = LANGS[lang];
  const items = collectItems(lang);
  const lastBuild = items[0]?.date || NOW; // stable output when data hasn't changed
  const itemXml = items.map(it => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="false">${esc(it.guid)}</guid>
      <pubDate>${it.date.toUTCString()}</pubDate>
${(it.categories || []).map(c => `      <category>${esc(c)}</category>\n`).join('')}      <description>${esc(it.description)}</description>
${it.image ? `      <enclosure url="${esc(it.image)}" type="${/\.png$/i.test(it.image) ? 'image/png' : 'image/jpeg'}" length="0"/>\n` : ''}    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(cfg.title)}</title>
    <link>${SITE}/</link>
    <description>${esc(cfg.description)}</description>
    <language>${cfg.langTag}</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/${cfg.file}" rel="self" type="application/rss+xml"/>
    <atom:link href="${SITE}/${cfg.other}" rel="alternate" type="application/rss+xml"/>
${itemXml}
  </channel>
</rss>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const lang of Object.keys(LANGS)) {
  const out = path.join(OUT_DIR, LANGS[lang].file);
  fs.writeFileSync(out, renderFeed(lang));
  console.log(`wrote ${path.relative(process.cwd(), out) || out}`);
}
