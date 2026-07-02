# CLAUDE.md — Context for AI-Assisted Editing

This file gives Claude (or any AI assistant) the full context needed to
help maintain this website correctly without asking basic questions.

---

## Project identity

**Site:** prachandpraveer.com — personal website of Hindi author Prachand Praveer
**Hosting:** GitHub Pages, repo `WebEdits/WebEdits.github.io`, branch `master`
**Custom domain:** `prachandpraveer.com` → CNAME → `WebEdits.github.io`
**Primary language:** Hindi (हिन्दी). English is secondary via a toggle.

## Architecture

**Static site. No build step. No npm. No framework.**

- `index.html` — the main page (Hindi primary, English via JS toggle)
- `posts.html` — blog post pages, reads `data/posts.json`
- `assets/css/style.css` — all styles, uses CSS custom properties
- `assets/js/main.js` — all JS logic; fetches JSON, renders content, handles lang switch
- `data/books.json` — all book data, both languages
- `data/reviews.json` — scholarly endorsements, flat array grouped by `canonical_id` at render time
- `data/press.json` — press/media quotes, flat array
- `data/interviews.json` — interview links, rendered as an accordion
- `data/talks.json` — YouTube talks / video appearances
- `data/posts.json` — blog posts (index entry + full body, no separate per-post files)
- `data/news.json` — announcements shown as a banner at top of page
- `assets/images/covers/` — book cover images, one per book, named `{book.id}.jpg`
- `assets/images/reviewers/` — reviewer photos referenced by `reviews.json`

## Language system

- `<html lang="hi">` is the default (set in `index.html`)
- JS reads `document.documentElement.lang` to determine which text to show
- Content elements use `data-hi="..."` and `data-en="..."` attributes for static text
- Dynamic content (books, reviews) is rendered from JSON using `t(obj)` helper
  which returns `obj[lang]` — so every JSON string field is `{ "hi": "...", "en": "..." }`
- Language preference is stored in `localStorage` key `pp-lang`
- Toggling language re-renders all dynamic sections; no page reload

## Key JS functions (in main.js)

| Function | Purpose |
|----------|---------|
| `setLang(lang)` | Switches language, updates DOM, re-renders all dynamic content |
| `renderBooks()` | Reads `allBooks`, renders into `#books-grid` |
| `renderFilterButtons()` | Builds genre filter buttons from book data |
| `renderReviews()` | Renders `allReviews`, grouped by `canonical_id`, into `#reviews-accordion` |
| `renderPress()` | Renders `allPress` into `#press-list` |
| `renderInterviews()` | Renders `allInterviews` into `#interviews-accordion` |
| `renderTalks()` | Renders `allTalks` (video cards + text list) into `#talks-grid` |
| `renderPostsSnippet()` | Renders latest 3 of `allPosts` into `#posts-snippet` |
| `renderNews()` | Renders first item in `allNews` into `#news-banner` |
| `renderStaticText()` | Swaps `data-hi`/`data-en` attributes across the DOM |
| `t(obj)` | Returns `obj[lang]` — the current-language string from a bilingual object |

## Data contracts

### books.json — array of book objects

Required fields: `id`, `year`, `genre`, `title`, `description`
Optional: `subtitle`, `publisher`, `isbn`, `cover`, `new_edition`, `latest_edition`, `links`,
`canonical_id`, `edition`, `edition_label`

`genre` is `{ "key": "...", "hi": "...", "en": "..." }`. **`genre.key` is what the filter
buttons actually match on** (`renderFilterButtons`/`renderBooks` in `main.js`) — `genre.hi`/
`genre.en` are display-only. A book missing `genre.key` still shows under "All" but
silently disappears from every specific genre filter. Valid key/hi/en triples currently
in use (filter buttons are generated from whatever keys exist in the data, so this list
is descriptive, not enforced by code):
- `{ "key": "hindi-fiction", "hi": "हिन्दी काव्य", "en": "Hindi Fiction" }`
- `{ "key": "hindi-nonfiction", "hi": "हिन्दी कथेतर गद्य", "en": "Hindi Non-Fiction" }`
- `{ "key": "english-fiction", "hi": "English Fiction", "en": "English Fiction" }`
- `{ "key": "english-nonfiction", "hi": "English Non-Fiction", "en": "English Non-Fiction" }`

`links` keys: `amazon_in`, `flipkart`, `amazon_com`, `dkprintworld` (all optional)

Multi-edition books share a `canonical_id` (defaults to `id` if absent) across their
edition entries; `edition` (number) and `edition_label` (bilingual string) distinguish
the editions in the book-detail modal's "Other Editions" list. `reviews.json` and
`press.json` link to books via this same `canonical_id`.

### reviews.json — flat array of scholarly endorsements/reviews

Fields: `id`, `type` (`"review"` or `"testimonial"`), `canonical_id`, `date` (YYYY-MM),
`photo` (optional), `bio`, `quote`, `attribution`, `role`, `source`, `url`, `archive_url`

Grouped by `canonical_id` at render time into an accordion (`renderReviews`), ordered by
the linked book's year. `canonical_id` must match a book's `canonical_id`/`id`.

### press.json — flat array of press/media quotes

Fields: `id`, `source`, `date`, `canonical_id`, `quote`, `attribution`, `url`, `archive_url`

### interviews.json — flat array, rendered as an accordion

Fields: `id`, `source`, `date`, `title`, `url`, `archive_url`

### talks.json — array of talk/appearance objects

Entries with a non-empty `videos[]` (each `{ youtube_id, date, title }`) render as
embedded video cards, one per video, under a shared `seriesTitle`/`description`. Entries
with no `videos` render as a plain text list item using `date`/`title` directly.

### posts.json — array of blog posts

Fields: `id`, `date` (YYYY-MM-DD), `tags[]`, `title`, `image` (optional), `body[]`
(array of typed blocks, e.g. `{ "type": "paragraph", "text": {...} }`), `excerpt` (optional
— auto-derived from the first paragraph block if omitted). Read by both the homepage
snippet (`renderPostsSnippet`, latest 3) and `posts.html` (full posts, no separate
per-post files despite the older per-post-file comment pattern elsewhere).

### news.json — array of announcement objects

Fields: `id`, `date` (YYYY-MM), `type`, `title`, `body`, `book_id` (optional), `link` (optional)
Only the first item (index 0) is displayed in the banner. Empty array `[]` hides the banner.

## CSS custom properties (design tokens)

All in `:root` at top of `style.css`:

```css
--ink:          #1a1208;   /* primary text / dark backgrounds */
--paper:        #faf7f2;   /* main background */
--paper-2:      #f0ebe0;   /* secondary sections */
--paper-3:      #e5ddd0;   /* tertiary sections */
--saffron:      #c8660a;   /* primary accent / CTAs */
--saffron-d:    #a8520a;   /* darker saffron for hover */
--saffron-pale: #f5e6d3;   /* pale saffron for hover backgrounds */
--muted:        #6b5e4a;   /* secondary text */
--serif:        'EB Garamond', Georgia, serif;
--sans:         'DM Sans', system-ui, sans-serif;
```

## Contact form

The form in `index.html` posts to Formspree. Look for:
```
action="https://formspree.io/f/YOUR_FORMSPREE_ID"
```
Replace `YOUR_FORMSPREE_ID` with the actual ID from formspree.io.
Formspree relays submissions to Prachand's private email — his address is never in the HTML.

## Maintainers

- **Pankaj Parag** — primary technical maintainer
- **Parimal Parag** — editor
- **Prachand Praveer** — content owner and author

## What NOT to do

- Do not add jQuery, Bootstrap, or any npm package (npm is used only for `devDependencies` —
  Playwright and `serve` — never for anything shipped to the browser)
- Do not add new top-level HTML pages without good reason — `index.html` is still the
  main single-page site; `posts.html` is the one deliberate exception, for full blog posts
- Do not hardcode book data in `index.html` — all books must go in `data/books.json`
- After changing `data/*.json`, `index.html`, `posts.html`, or `assets/js/main.js`, run
  `npm test` (Playwright) before considering the change done — see "Testing" below
- Do not expose Prachand's email address anywhere in the HTML or JS
- Do not edit the `CNAME` file (it controls the custom domain)
- Do not push directly to a branch other than `master` (GitHub Pages serves master)

## Testing

Playwright is the whole test suite (no unit-test framework) — specs live in `tests/`,
one file per site section. `playwright.config.js` boots `npx serve -l 4000` automatically
as a `webServer` and points `baseURL` at it, so tests always run against the real static
files, not a mock.

```bash
npm install && npx playwright install --with-deps chromium   # first time only
npm test                                                     # run everything
npx playwright test tests/books.spec.js                      # run one spec
npm run test:ui                                               # interactive debugging
```

Full instructions (including how to preview the site manually over a remote/VS-Code-tunnel
session) are in `docs/EDITING_GUIDE.md`.

## Common tasks

**Add a new book:** Edit `data/books.json`, add object at top of array (include `genre.key`!),
upload cover to `assets/images/covers/{id}.jpg`, then `npm test`

**Mark a book as having a new edition:** Set `"new_edition": true` and `"latest_edition": "Nth edition, YYYY"` in its JSON object

**Add a review/endorsement:** Edit `data/reviews.json`, add to the flat array

**Add a press mention:** Edit `data/press.json`, add to the flat array

**Post an announcement:** Edit `data/news.json`, add object at top of array

**Update bio:** Edit `data-hi` and `data-en` attributes on `.hero__bio` in `index.html`

**Activate contact form:** Replace `YOUR_FORMSPREE_ID` in `index.html` form action

**Deploy:** `npm test && git add . && git commit -m "message" && git push origin master`
