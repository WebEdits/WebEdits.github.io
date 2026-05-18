# प्रचण्ड प्रवीर — Official Website

**Live site:** [prachandpraveer.com](https://prachandpraveer.com)  
**GitHub Pages source:** `WebEdits.github.io` (master branch)

---

## What this is

The personal website of Hindi author and cinema theorist Prachand Praveer.
Static site hosted on GitHub Pages with a custom domain. No build step required —
edit files, commit, push, and changes are live within ~60 seconds.

## Technology

| Concern | Solution |
|---------|----------|
| Hosting | GitHub Pages |
| Framework | None — vanilla HTML, CSS, JS only |
| Fonts | EB Garamond + DM Sans via Google Fonts |
| Dependencies | Zero npm/pip packages. Zero jQuery. Zero Bootstrap. |
| Contact form | Formspree (free tier) — see EDITING_GUIDE.md |
| Language | Hindi (primary) + English toggle, single page |
| Dependabot alerts | None — no vendored libraries |

## File structure

```
/
├── index.html              ← Main page (Hindi primary, English toggle)
├── assets/
│   ├── css/style.css       ← All styles — edit colours/fonts here
│   ├── js/main.js          ← All JS — renders books, testimonials, news
│   └── images/
│       ├── covers/         ← Book cover images (one per book)
│       └── [existing gallery images]
├── data/
│   ├── books.json          ← All book data (both languages) ← EDIT HERE
│   ├── testimonials.json   ← Press quotes + scholarly endorsements ← EDIT HERE
│   └── news.json           ← New releases, announcements ← EDIT HERE
├── docs/
│   ├── README.md           ← This file
│   ├── EDITING_GUIDE.md    ← How to add books, testimonials, news
│   └── CLAUDE.md           ← Context for AI-assisted editing
└── CNAME                   ← Custom domain (do not edit)
```

## Quick reference

- **Add a new book** → edit `data/books.json` (see EDITING_GUIDE.md)
- **Add a testimonial** → edit `data/testimonials.json`
- **Announce a new edition** → edit `data/news.json`
- **Change site colours** → edit CSS custom properties at top of `assets/css/style.css`
- **Update bio text** → edit the `data-hi` / `data-en` attributes in `index.html`
- **Add a gallery photo** → place image in `assets/images/`, add `<div class="gallery-item">` in `index.html`

## Deployment

This site deploys automatically on every push to `master`:

```bash
git add data/books.json
git commit -m "Add new book: [title]"
git push origin master
```

GitHub Pages serves the updated site within ~60 seconds.

## Domain

`prachandpraveer.com` → CNAME record → `WebEdits.github.io`  
The `CNAME` file in this repo root tells GitHub Pages to serve on the custom domain.
Do not delete or edit the `CNAME` file.

## Maintainers

- Pankaj Parag (primary technical contact)
- Parimal (editor)
- Prachand Praveer (content owner)
