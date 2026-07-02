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
├── posts.html              ← Full blog post pages (reads data/posts.json)
├── README.md               ← This file
├── assets/
│   ├── css/style.css       ← All styles — edit colours/fonts here
│   ├── js/main.js          ← All JS — renders books, reviews, news, posts
│   └── images/
│       ├── covers/         ← Book cover images (one per book)
│       ├── reviewers/      ← Reviewer photos (used by reviews.json)
│       └── [existing gallery images]
├── data/
│   ├── books.json          ← All book data (both languages) ← EDIT HERE
│   ├── reviews.json        ← Scholarly endorsements, grouped by book ← EDIT HERE
│   ├── press.json          ← Press/media quotes ← EDIT HERE
│   ├── interviews.json     ← Interview links accordion ← EDIT HERE
│   ├── talks.json          ← YouTube talks / video appearances ← EDIT HERE
│   ├── posts.json          ← Blog posts (index + full body) ← EDIT HERE
│   └── news.json           ← New releases, announcements ← EDIT HERE
├── tests/                  ← Playwright test suite — see "Development" below
├── docs/
│   ├── EDITING_GUIDE.md    ← How to add books, reviews, news, etc.
│   └── CLAUDE.md           ← Context for AI-assisted editing
└── CNAME                   ← Custom domain (do not edit)
```

## Quick reference

- **Add a new book** → edit `data/books.json` (see EDITING_GUIDE.md)
- **Add a review/endorsement** → edit `data/reviews.json`
- **Add a press mention** → edit `data/press.json`
- **Announce a new edition** → edit `data/news.json`
- **Change site colours** → edit CSS custom properties at top of `assets/css/style.css`
- **Update bio text** → edit the `data-hi` / `data-en` attributes in `index.html`
- **Add a gallery photo** → place image in `assets/images/`, add `<div class="gallery-item">` in `index.html`

## Development & testing

The site has a Playwright test suite (`tests/`) that loads real pages in a
browser and checks rendering, filters, language toggle, and modals. Run it
after any content or code change, before pushing:

```bash
npm install                                # first time only
npx playwright install --with-deps chromium # first time only
npm test
```

`npm test` spins up `npx serve` on `http://localhost:4000` automatically and
tears it down afterwards. To keep a server running so you can look at the
page yourself, run `npx serve -l 4000` directly — if you're working over a
VS Code remote tunnel with no local browser access to the machine, open the
**Ports** panel in VS Code (next to the Terminal tab), forward port `4000`,
and VS Code gives you an `https://` URL to open locally.

Full details, including all `npm run test:*` variants, are in
[docs/EDITING_GUIDE.md](docs/EDITING_GUIDE.md#how-to-test-your-changes-before-committing).

## Deployment

This site deploys automatically on every push to `master`:

```bash
npm test                                   # verify nothing broke
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
- Parimal Parag (editor)
- Prachand Praveer (content owner)
