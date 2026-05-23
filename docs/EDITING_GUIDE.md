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
  "genre": { "hi": "उपन्यास", "en": "Novel" },
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
| `latest_edition` | No | e.g. `"3rd edition, 2026"` — shown instead of year |
| `new_edition` | No | Set to `true` to show an orange "New Edition" badge |
| `genre.hi` / `genre.en` | Yes | Used for the filter buttons. Options: `उपन्यास`/`Novel`, `कहानी संग्रह`/`Short Stories`, `सिनेमा सिद्धान्त`/`Cinema Theory` |
| `title.hi` / `title.en` | Yes | Book title in both languages |
| `subtitle.hi` / `subtitle.en` | No | Leave `""` if none |
| `publisher` | Yes | Publisher name |
| `isbn` | No | ISBN-13 if available |
| `cover` | No | Path to cover image. If the file doesn't exist, a placeholder is shown. |
| `description.hi` / `.en` | Yes | 2–4 sentence description in each language |
| `links.amazon_in` | No | Amazon India product URL |
| `links.flipkart` | No | Flipkart URL |
| `links.amazon_com` | No | Amazon US URL |

### Genre values (copy exactly)

```
Hindi: उपन्यास / कहानी संग्रह / सिनेमा सिद्धान्त / सिनेमा सिद्धान्त (अंग्रेज़ी)
English: Novel / Short Stories / Cinema Theory / Cinema Theory (English)
```

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

Open `data/testimonials.json`. It has two sections:

- `"author"` — scholarly endorsements (displayed in the main Reviews section)
- `"press"` — press and media quotes (displayed in the Press section)

### Add a scholarly endorsement

In the `"author"` array, add a new object:

```json
{
  "id": "unique-id",
  "book_id": "abhinav-cinema",
  "quote": {
    "hi": "हिन्दी उद्धरण...",
    "en": "English translation of the quote..."
  },
  "attribution": { "hi": "डॉ॰ नाम", "en": "Dr. Name" },
  "role": { "hi": "पद / संस्था", "en": "Role / Institution" }
}
```

`book_id` must match the `id` field of a book in `books.json`.
It's used to label which book the endorsement is for.

### Add a press mention

In the `"press"` array, add:

```json
{
  "id": "unique-id",
  "source": "Publication Name",
  "book_id": "alpahari-grihatyagi",
  "quote": {
    "hi": "हिन्दी उद्धरण...",
    "en": "English..."
  },
  "attribution": { "hi": "लेखक नाम", "en": "Author Name" },
  "url": "https://link-to-article.com"
}
```

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

## Git workflow (quick reference)

```bash
# Make your edits to data/books.json (or other files)

git add data/books.json
git commit -m "Add book: Title of New Book"
git push origin master

# Site updates within ~60 seconds at prachandpraveer.com
```

GitHub's web editor (pencil icon on any file) also works if you don't have
git set up locally — it commits directly to master.
