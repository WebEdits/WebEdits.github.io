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

- `index.html` — the single HTML page (Hindi primary, English via JS toggle)
- `assets/css/style.css` — all styles, uses CSS custom properties
- `assets/js/main.js` — all JS logic; fetches JSON, renders content, handles lang switch
- `data/books.json` — all book data, both languages
- `data/testimonials.json` — scholarly endorsements (`author` array) + press (`press` array)
- `data/news.json` — announcements shown as a banner at top of page
- `assets/images/covers/` — book cover images, one per book, named `{book.id}.jpg`

## Language system

- `<html lang="hi">` is the default (set in `index.html`)
- JS reads `document.documentElement.lang` to determine which text to show
- Content elements use `data-hi="..."` and `data-en="..."` attributes for static text
- Dynamic content (books, testimonials) is rendered from JSON using `t(obj)` helper
  which returns `obj[lang]` — so every JSON string field is `{ "hi": "...", "en": "..." }`
- Language preference is stored in `localStorage` key `pp-lang`
- Toggling language re-renders all dynamic sections; no page reload

## Key JS functions (in main.js)

| Function | Purpose |
|----------|---------|
| `setLang(lang)` | Switches language, updates DOM, re-renders all dynamic content |
| `renderBooks()` | Reads `allBooks`, renders into `#books-grid` |
| `renderFilterButtons()` | Builds genre filter buttons from book data |
| `renderTestimonials()` | Renders `allTestimonials.author` into `#testimonials-grid` |
| `renderPress()` | Renders `allTestimonials.press` into `#press-list` |
| `renderNews()` | Renders first item in `allNews` into `#news-banner` |
| `renderStaticText()` | Swaps `data-hi`/`data-en` attributes across the DOM |
| `t(obj)` | Returns `obj[lang]` — the current-language string from a bilingual object |

## Data contracts

### books.json — array of book objects

Required fields: `id`, `year`, `genre`, `title`, `description`
Optional: `subtitle`, `publisher`, `isbn`, `cover`, `new_edition`, `latest_edition`, `links`

`genre` values (must match exactly for filter to work):
- `{ "hi": "उपन्यास", "en": "Novel" }`
- `{ "hi": "कहानी संग्रह", "en": "Short Stories" }`
- `{ "hi": "सिनेमा सिद्धान्त", "en": "Cinema Theory" }`
- `{ "hi": "सिनेमा सिद्धान्त (अंग्रेज़ी)", "en": "Cinema Theory (English)" }`

`links` keys: `amazon_in`, `flipkart`, `amazon_com` (all optional)

### testimonials.json — object with two arrays

`author[]`: scholarly endorsements. Fields: `id`, `book_id`, `quote`, `attribution`, `role`
`press[]`: media mentions. Fields: `id`, `source`, `book_id`, `quote`, `attribution`, `url`

`book_id` must match a book `id` in `books.json`. Used to label the testimonial.

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

- Do not add jQuery, Bootstrap, or any npm package
- Do not split into multiple HTML pages (the single-page architecture is intentional)
- Do not hardcode book data in `index.html` — all books must go in `data/books.json`
- Do not expose Prachand's email address anywhere in the HTML or JS
- Do not edit the `CNAME` file (it controls the custom domain)
- Do not push directly to a branch other than `master` (GitHub Pages serves master)

## Common tasks

**Add a new book:** Edit `data/books.json`, add object at top of array, upload cover to `assets/images/covers/{id}.jpg`

**Mark a book as having a new edition:** Set `"new_edition": true` and `"latest_edition": "Nth edition, YYYY"` in its JSON object

**Add a testimonial:** Edit `data/testimonials.json`, add to `author` array

**Post an announcement:** Edit `data/news.json`, add object at top of array

**Update bio:** Edit `data-hi` and `data-en` attributes on `.hero__bio` in `index.html`

**Activate contact form:** Replace `YOUR_FORMSPREE_ID` in `index.html` form action

**Deploy:** `git add . && git commit -m "message" && git push origin master`
