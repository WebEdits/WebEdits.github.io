# Editing Guide

A plain-language guide for updating the website.
**No programming knowledge required for most tasks.**

---

## The golden rule

All content lives in the `data/` folder. Edit a JSON file there,
commit, push — the website updates automatically. You never need to
touch `index.html`, `style.css`, or `main.js` for content changes.

---

## How to add a new book

Open `data/books.json`. It contains a JSON array (`[...]`).
**Add a new object at the top of the array** (after the opening `[`).

### Minimum template

```json
{
  "id": "unique-book-id",
  "year": 2025,
  "genre": { "key": "hindi-fiction", "hi": "हिन्दी काव्य", "en": "Hindi Fiction" },
  "title": { "hi": "हिन्दी शीर्षक", "en": "English Title" },
  "subtitle": { "hi": "", "en": "" },
  "publisher": "Publisher Name",
  "cover": "assets/images/covers/unique-book-id.jpg",
  "description": {
    "hi": "हिन्दी विवरण...",
    "en": "English description..."
  },
  "links": {
    "amazon_in": "https://www.amazon.in/dp/ASIN_HERE"
  }
}
```

### Field reference

| Field | Required | Notes |
|-------|----------|-------|
| `id` | Yes | Lowercase, hyphens only. Must be unique. Used for the cover image filename. |
| `year` | Yes | Publication year as a number (no quotes) |
| `date` | No | `"YYYY-MM"` (or `"YYYY-MM-DD"`). Books are sorted by this when present, falling back to `year` alone otherwise. Add it when a book shares its `year` with other books but was actually published earlier or later within that year — without it, same-year books can sort in a surprising order (e.g. a reprint's edition number outranking a genuinely newer book). |
| `latest_edition` | No | e.g. `"3rd edition, 2026"` — shown instead of year |
| `new_edition` | No | Set to `true` to show an orange "New Edition" badge |
| `genre.key` | Yes | Language-independent genre id. **This is what drives the filter buttons** — see table below. If you omit it, the book still displays under "All" but disappears when any specific genre filter is clicked. |
| `genre.hi` / `genre.en` | Yes | Display text for the genre, shown on the book card. Must be paired with the matching `genre.key` below. |
| `title.hi` / `title.en` | Yes | Book title in both languages |
| `subtitle.hi` / `subtitle.en` | No | Leave `""` if none |
| `publisher` | Yes | Publisher name |
| `isbn` | No | ISBN-13 if available |
| `cover` | No | Path to cover image. If the file doesn't exist, a placeholder is shown. |
| `description.hi` / `.en` | Yes | 2–4 sentence description in each language |
| `links.amazon_in` | No | Amazon India product URL |
| `links.flipkart` | No | Flipkart URL |
| `links.amazon_com` | No | Amazon US URL |

### Genre values (copy exactly — all four fields must match a row)

| `genre.key` | `genre.hi` | `genre.en` |
|-------------|------------|------------|
| `hindi-fiction` | हिन्दी काव्य | Hindi Fiction |
| `hindi-nonfiction` | हिन्दी कथेतर गद्य | Hindi Non-Fiction |
| `english-fiction` | English Fiction | English Fiction |
| `english-nonfiction` | English Non-Fiction | English Non-Fiction |

The filter buttons on the site are generated automatically from whatever
`genre.key` values appear in `books.json` — you don't need to edit any
other file to add a book to an existing genre. Using a `key` not in this
table just creates a new filter button labelled with the raw key text.

### Don't forget the comma

JSON requires a comma between objects. After your new object, add a comma before the next one:

```json
[
  { ...new book... },   ← comma here
  { ...existing book... },
  ...
]
```

### Upload the cover image

Place the cover image at `assets/images/covers/unique-book-id.jpg`
(where `unique-book-id` matches the `id` field exactly).
Recommended: JPEG, ~600×800px, under 200KB.
If no image is uploaded, the site shows a text placeholder — that's fine.

---

## How to add a testimonial or scholarly endorsement

### Add a scholarly endorsement / review

Open `data/reviews.json` (a flat array) and add a new object:

```json
{
  "id": "unique-id",
  "type": "review",
  "canonical_id": "abhinav-cinema",
  "date": "2026-03",
  "photo": "assets/images/reviewers/reviewer-name.jpg",
  "bio": { "hi": "परिचय...", "en": "Short bio..." },
  "quote": { "hi": "हिन्दी उद्धरण...", "en": "English translation of the quote..." },
  "attribution": { "hi": "डॉ॰ नाम", "en": "Dr. Name" },
  "role": { "hi": "पद / संस्था", "en": "Role / Institution" },
  "source": { "hi": "स्रोत", "en": "Where the quote is from" },
  "url": "",
  "archive_url": ""
}
```

`canonical_id` must match a book's `canonical_id` (or `id`, if it has no
editions) in `books.json` — reviews are grouped by book on the page.
`photo`, `bio`, `url`, and `archive_url` are all optional; leave them `""`
if not applicable.

### Add a press mention

Open `data/press.json` (a flat array) and add:

```json
{
  "id": "unique-id",
  "source": "Publication Name",
  "date": "2026-05-06",
  "canonical_id": "alpahari-grihatyagi",
  "quote": { "hi": "हिन्दी उद्धरण...", "en": "English..." },
  "attribution": { "hi": "लेखक नाम", "en": "Author Name" },
  "url": "https://link-to-article.com",
  "archive_url": ""
}
```

### Add an interview link

Open `data/interviews.json` (a flat array) and add:

```json
{
  "id": "unique-id",
  "source": "Publication Name",
  "date": "2026-05-06",
  "title": { "hi": "साक्षात्कार का शीर्षक", "en": "Interview title" },
  "url": "https://link-to-article.com",
  "archive_url": ""
}
```

### Add a talk / video

Open `data/talks.json`. Each entry can either list YouTube `videos` (rendered
as embedded cards) or be a text-only item with no `videos` array (listed in
the text section). See existing entries for the exact shape.

---

## How to post a news announcement

Open `data/news.json`. Add a new object **at the top** of the array:

```json
{
  "id": "unique-id",
  "date": "2026-05",
  "type": "new_edition",
  "title": {
    "hi": "घोषणा का शीर्षक",
    "en": "Announcement title"
  },
  "body": {
    "hi": "विवरण...",
    "en": "Description..."
  },
  "book_id": "abhinav-cinema",
  "link": "https://amazon.in/..."
}
```

The latest (first) item in the array is shown as the orange announcement banner
at the top of the page. To remove the banner, delete the item or empty the array: `[]`.

---

## How to set up the contact form

1. Go to [formspree.io](https://formspree.io) and create a free account
2. Click "New Form" and enter Prachand's email address
3. Formspree gives you a form ID like `xpwzgkqv`
4. Open `index.html`, find this line:
   ```
   action="https://formspree.io/f/YOUR_FORMSPREE_ID"
   ```
5. Replace `YOUR_FORMSPREE_ID` with your actual ID
6. Save, commit, push

Messages will arrive in Prachand's email (and in the Formspree dashboard).
His email address is never exposed in the HTML.

---

## How to update the bio

Open `index.html`. Find the `<p class="hero__bio">` element.
It has two attributes: `data-hi` (Hindi) and `data-en` (English).
Edit those attribute values. The visible text content below the tag
should match `data-hi` (it's the default on page load).

```html
<p class="hero__bio"
   data-hi="नई हिन्दी जीवनी..."
   data-en="New English bio...">
  नई हिन्दी जीवनी...
</p>
```

---

## How to add a gallery photo

1. Place the image in `assets/images/` (any size, JPEG preferred)
2. Open `index.html`, find the `<div class="gallery-grid">` section
3. Add a new item:

```html
<div class="gallery-item" role="listitem">
  <img src="assets/images/your-photo.jpg" alt="Caption" loading="lazy">
  <p class="gallery-item__caption">Caption text</p>
</div>
```

The gallery always shows in a 4-column grid on desktop, 2-column on mobile.
For best results, use square or landscape images.

---

## JSON syntax tips

JSON is picky about formatting. Common mistakes:

- **Missing comma** between objects in an array → the page won't load books
- **Trailing comma** after the last item → same problem
- **Unmatched quotes** or **curly braces** → same problem

If the site stops showing books after an edit, open the browser's developer console
(F12 → Console) and look for a JSON parse error. The error message will point to
the line number.

**Tip:** Paste your edited JSON into [jsonlint.com](https://jsonlint.com) before
committing to catch any syntax errors.

---

## How to test your changes before committing

This repo has an automated test suite (Playwright) that loads the real
site in a browser and checks that books, filters, reviews, the
language toggle, etc. all still render correctly. Run it after any edit
to `data/` or `index.html`/`main.js` — it catches things a JSON linter
can't, like a genre filter silently losing a book (see the `genre.key`
note above).

**First-time setup** (once per machine):

```bash
npm install
npx playwright install --with-deps chromium
```

**Run the full suite:**

```bash
npm test
```

This starts a local static server on `http://localhost:4000` automatically
(via `npx serve`, configured in `playwright.config.js`), runs every spec in
`tests/`, and shuts the server down again. All green output means nothing
broke.

**Other useful modes:**

```bash
npm run test:headed   # same tests, but shows an actual browser window
npm run test:ui       # interactive Playwright UI — step through tests, inspect the page
npx playwright test tests/books.spec.js   # run just one spec file
npx playwright show-report                # view the HTML report of the last run
```

### Previewing the site visually (not just tests)

If you want to *see* the page yourself rather than only trusting test
output — for example over a VS Code remote tunnel, where you can't reach
a "forwarded port" the normal way — run:

```bash
npx serve -l 4000
```

and then use VS Code's **Ports** panel (bottom panel, next to Terminal) —
click **Forward a Port** and enter `4000` if it isn't listed automatically.
VS Code will give you a `https://...` forwarded URL you can open in your
local browser. (When Playwright's own `npm test` starts the server for
you, it shuts it down again after the run, so it's not there long enough
to forward — start it yourself with the command above if you want to
click around manually.)

---

## Git workflow (quick reference)

```bash
# Make your edits to data/books.json (or other files)

npm test                     # run the test suite first — see above

git add data/books.json
git commit -m "Add book: Title of New Book"
git push origin master

# Site updates within ~60 seconds at prachandpraveer.com
```

GitHub's web editor (pencil icon on any file) also works if you don't have
git set up locally — it commits directly to master.
