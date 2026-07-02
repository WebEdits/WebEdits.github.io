/* ============================================================
   PRACHAND PRAVEER — main.js
   No jQuery. No frameworks. Pure vanilla JS.

   DATA FILES:
   - data/books.json       — 23 edition cards
   - data/reviews.json     — scholarly book reviews (grouped by canonical_id)
   - data/press.json       — media quotes
   - data/interviews.json  — interview links accordion
   - data/talks.json       — YouTube talks
   - data/news.json        — announcement banner
   - data/posts.json       — blog post index (excerpt only)
   - data/posts/{id}.json  — full post body (loaded on demand)

   LANGUAGE: <html lang="hi|en"> drives all rendering.
   t(obj) returns obj[lang] || obj.hi || obj.en
   genre.key is language-independent — used for filter logic.
   ============================================================ */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────
  let lang         = document.documentElement.lang || 'hi';
  let allBooks     = [];
  let allReviews   = [];
  let allPress     = [];
  let allInterviews = [];
  let allTalks     = [];
  let allNews      = [];
  let allPosts     = [];
  let activeFilter = 'all';

  // Modal nav state
  let currentModalList = [];
  let currentModalIdx  = 0;

  // ── Helpers ───────────────────────────────────────────────
  const t   = (obj) => (obj && obj[lang]) || obj?.hi || obj?.en || '';
  // Optional book.date ("YYYY-MM"/"YYYY-MM-DD") sorts more precisely than
  // year alone — a bare year always sorts before any dated book in the same
  // year, since "2026" is a string-prefix of e.g. "2026-07".
  const bookSortKey = (b) => b.date || String(b.year);
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function youtubeEmbed(id) {
    return `https://www.youtube.com/embed/${id}?rel=0`;
  }

  function fmtDate(str) {
    if (!str) return '';
    const [y, m] = str.split('-');
    if (!m) return y;
    const months = {
      hi: ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितम्बर','अक्टूबर','नवम्बर','दिसम्बर'],
      en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    };
    return `${months[lang][parseInt(m,10)-1]} ${y}`;
  }

  async function fetchJSON(path) {
    const base = qs('meta[name="base-path"]')?.content || '';
    const r = await fetch(base + path);
    if (!r.ok) throw new Error(`Failed to load ${path}`);
    return r.json();
  }

  // ── Language toggle ───────────────────────────────────────
  function setLang(newLang) {
    lang = newLang;
    document.documentElement.lang = lang;
    localStorage.setItem('pp-lang', lang);
    qsa('.lang-toggle button').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.lang === lang));
    const modal = qs('#book-detail-modal');
    if (modal?.classList.contains('open')) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (allBooks.length)      { renderFilterButtons(); renderBooks(); }
    if (allReviews.length)    renderReviews();
    if (allPress.length)      renderPress();
    if (allInterviews.length) renderInterviews();
    if (allTalks.length)      renderTalks();
    if (allNews.length)       renderNews();
    if (allPosts.length)      renderPostsSnippet();
    renderStaticText();
  }

  function initLangToggle() {
    const saved = localStorage.getItem('pp-lang');
    if (saved && saved !== lang) setLang(saved);
    document.addEventListener('click', (e) => {
      if (e.target.matches('.lang-toggle button')) setLang(e.target.dataset.lang);
    });
  }

  // ── Nav ───────────────────────────────────────────────────
  function initNav() {
    const ham    = qs('#nav-ham');
    const drawer = qs('#nav-drawer');
    if (!ham || !drawer) return;
    ham.addEventListener('click', () => drawer.classList.toggle('open'));
    qsa('a', drawer).forEach(a =>
      a.addEventListener('click', () => drawer.classList.remove('open')));
    const sections = qsa('section[id]');
    const navLinks = qsa('.nav__links a, .nav__drawer a[href^="#"]');
    window.addEventListener('scroll', () => {
      let cur = '';
      sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    }, { passive: true });
  }

  // ── Scroll animations ─────────────────────────────────────
  function initScrollAnim() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.style.transitionDelay = (i * 0.04) + 's';
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.08 });
    qsa('.fade-up').forEach(el => io.observe(el));
  }

  // ── News banner ───────────────────────────────────────────
  function renderNews() {
    const el = qs('#news-banner');
    if (!el || !allNews.length) return;
    const item = allNews[0];
    el.innerHTML = `
      <p>${t(item.title)} — ${t(item.body)}</p>
      ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener">
        ${lang === 'hi' ? 'अभी खरीदें →' : 'Buy Now →'}
      </a>` : ''}`;
    el.parentElement.style.display = '';
  }

  // ── Filter buttons ────────────────────────────────────────
  function renderFilterButtons() {
    const container = qs('#books-filter');
    if (!container) return;
    const keys = ['all', ...new Set(allBooks.map(b => b.genre?.key).filter(Boolean))];
    const labels = {
      'all':                 { hi: 'सभी',               en: 'All' },
      'hindi-fiction':       { hi: 'हिन्दी काव्य',        en: 'Hindi Fiction' },
      'english-fiction':     { hi: 'English Fiction',    en: 'English Fiction' },
      'hindi-nonfiction':    { hi: 'हिन्दी कथेतर गद्य', en: 'Hindi Non-Fiction' },
      'english-nonfiction':  { hi: 'English Non-Fiction', en: 'English Non-Fiction' }
    };
    container.innerHTML = keys.map(k =>
      `<button data-genre="${k}" class="${k === activeFilter ? 'active' : ''}">
        ${labels[k] ? t(labels[k]) : k}
      </button>`
    ).join('');
    if (!container._filterInit) {
      container._filterInit = true;
      container.addEventListener('click', (e) => {
        if (!e.target.matches('button')) return;
        activeFilter = e.target.dataset.genre;
        qsa('button', container).forEach(btn =>
          btn.classList.toggle('active', btn.dataset.genre === activeFilter));
        renderBooks();
      });
    }
  }

  // ── Books carousel ────────────────────────────────────────
  function renderBooks() {
    const grid = qs('#books-grid');
    if (!grid) return;
    const filtered = (activeFilter === 'all'
      ? [...allBooks]
      : allBooks.filter(b => b.genre?.key === activeFilter)
    ).sort((a, b) => bookSortKey(b).localeCompare(bookSortKey(a)) || (b.edition || 1) - (a.edition || 1));

    grid.innerHTML = filtered.map(book => {
      const coverHTML = book.cover
        ? `<img src="${book.cover}" alt="${t(book.title)}" loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=book-card__cover-placeholder><p class=placeholder-title>${t(book.title).replace(/'/g,"&#39;")}</p><p class=placeholder-year>${book.year}</p></div>'">`
        : `<div class="book-card__cover-placeholder">
             <p class="placeholder-title">${t(book.title)}</p>
             <p class="placeholder-year">${book.year}</p>
           </div>`;
      const badge = book.new_edition
        ? `<span class="book-card__badge">${lang === 'hi' ? 'नया संस्करण' : 'New'}</span>` : '';
      const buyLinks = Object.entries(book.links || {}).filter(([,u])=>u)
        .map(([key, url]) => {
          const label = {amazon_in:'Amazon',flipkart:'Flipkart',amazon_com:'Amazon US',dkprintworld:'DK Printworld'}[key]||key;
          return `<a href="${url}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">${label}</a>`;
        }).join('');
      return `
        <div class="book-card" data-id="${book.id}" tabindex="0" role="button"
             aria-label="${t(book.title)}, ${t(book.edition_label)}">
          <div class="book-card__cover">${coverHTML}</div>
          <div class="book-card__overlay">
            <p class="book-card__meta">${t(book.genre)} · ${t(book.edition_label)}</p>
            <h3 class="book-card__title">${t(book.title)}${badge}</h3>
            <p class="book-card__desc">${t(book.description)}</p>
            <div class="book-card__links">${buyLinks}</div>
          </div>
          <div class="book-card__tap-prev" aria-hidden="true"></div>
          <div class="book-card__tap-next" aria-hidden="true"></div>
        </div>`;
    }).join('');

    qsa('.book-card', grid).forEach(card => {
      const open = () => {
        const book = allBooks.find(b => b.id === card.dataset.id);
        if (book) openBookDetail(book);
      };
      // Tap zones: left 33% = scroll prev, right 33% = scroll next
      // Centre 34% (or overlay links) = open detail modal
      const prevZone = card.querySelector('.book-card__tap-prev');
      const nextZone = card.querySelector('.book-card__tap-next');
      if (prevZone) prevZone.addEventListener('click', e => {
        e.stopPropagation();
        grid.scrollBy({ left: -316, behavior: 'smooth' });
      });
      if (nextZone) nextZone.addEventListener('click', e => {
        e.stopPropagation();
        grid.scrollBy({ left: 316, behavior: 'smooth' });
      });
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();open();} });
    });

    if (!qs('#books-carousel-wrap')) {
      const wrap = document.createElement('div');
      wrap.id = 'books-carousel-wrap';
      wrap.className = 'books-carousel-wrap';
      grid.parentElement.insertBefore(wrap, grid);
      wrap.appendChild(grid);
      ['prev','next'].forEach(dir => {
        const btn = document.createElement('button');
        btn.className = `books-carousel__btn books-carousel__btn--${dir}`;
        btn.setAttribute('aria-label', dir==='prev'?'Previous':'Next');
        btn.innerHTML = dir==='prev'?'&#x2039;':'&#x203A;';
        btn.addEventListener('click', () => {
          const step = 316;
          if (dir==='prev') {
            grid.scrollLeft < step/2 ? (grid.scrollLeft=grid.scrollWidth) : grid.scrollBy({left:-step,behavior:'smooth'});
          } else {
            grid.scrollLeft+grid.clientWidth >= grid.scrollWidth-step/2 ? (grid.scrollLeft=0) : grid.scrollBy({left:step,behavior:'smooth'});
          }
        });
        wrap.appendChild(btn);
      });
    }
  }

  // ── Book detail modal ─────────────────────────────────────
  function initBookDetailModal() {
    if (qs('#book-detail-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'book-detail-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `
      <div class="book-detail__backdrop"></div>
      <div class="book-detail__panel">
        <button class="book-detail__close" aria-label="Close">&#x2715;</button>
        <button class="book-detail__nav book-detail__nav--prev" aria-label="Previous book">&#x2039;</button>
        <button class="book-detail__nav book-detail__nav--next" aria-label="Next book">&#x203A;</button>
        <div class="book-detail__cover-wrap"></div>
        <div class="book-detail__content"></div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => { modal.classList.remove('open'); document.body.style.overflow=''; };
    qs('.book-detail__backdrop',modal).addEventListener('click',close);
    qs('.book-detail__close',modal).addEventListener('click',close);
    qs('.book-detail__nav--prev',modal).addEventListener('click',()=>{
      if (currentModalList.length<2) return;
      currentModalIdx=(currentModalIdx-1+currentModalList.length)%currentModalList.length;
      openBookDetail(currentModalList[currentModalIdx],false);
    });
    qs('.book-detail__nav--next',modal).addEventListener('click',()=>{
      if (currentModalList.length<2) return;
      currentModalIdx=(currentModalIdx+1)%currentModalList.length;
      openBookDetail(currentModalList[currentModalIdx],false);
    });
    document.addEventListener('keydown',e=>{
      if (!modal.classList.contains('open')) return;
      if (e.key==='Escape') close();
      if (e.key==='ArrowLeft')  qs('.book-detail__nav--prev',modal).click();
      if (e.key==='ArrowRight') qs('.book-detail__nav--next',modal).click();
    });
  }

  function openBookDetail(book, updateList=true) {
    const modal = qs('#book-detail-modal');
    if (!modal) return;
    if (updateList) {
      currentModalList = qsa('.book-card',qs('#books-grid'))
        .map(c=>allBooks.find(b=>b.id===c.dataset.id)).filter(Boolean);
      currentModalIdx = currentModalList.findIndex(b=>b.id===book.id);
    }
    const has = currentModalList.length>1;
    qs('.book-detail__nav--prev',modal).style.display = has?'':'none';
    qs('.book-detail__nav--next',modal).style.display = has?'':'none';

    const badge = book.new_edition
      ? `<span class="book-detail__badge">${lang==='hi'?'नया संस्करण':'New Edition'}</span>` : '';
    const subtitle = t(book.subtitle)
      ? `<p class="book-detail__subtitle">${t(book.subtitle)}</p>` : '';
    const buyLinks = Object.entries(book.links||{}).filter(([,u])=>u)
      .map(([key,url])=>{
        const label={amazon_in:'Amazon India',flipkart:'Flipkart',amazon_com:'Amazon US',dkprintworld:'DK Printworld'}[key]||key;
        return `<a href="${url}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">${label}</a>`;
      }).join('');

    const canonId = book.canonical_id||book.id;
    const hasReviews = allReviews.some(r=>(r.canonical_id||r.book_id)===canonId);
    const reviewsBtn = hasReviews
      ? `<button class="btn btn-outline btn-sm book-detail__reviews-btn" data-canon="${canonId}">
          ${lang==='hi'?'समीक्षाएँ देखें ↓':'See Reviews ↓'}
        </button>` : '';

    const otherEditions = allBooks
      .filter(b=>(b.canonical_id||b.id)===canonId&&b.id!==book.id)
      .sort((a,b)=>a.year-b.year);
    const editionHTML = otherEditions.length
      ? `<div class="book-detail__editions">
          <p class="book-detail__editions-label">${lang==='hi'?'अन्य संस्करण':'Other Editions'}</p>
          <div class="book-detail__editions-list">
            ${otherEditions.map(ed=>`<button class="book-detail__edition-btn" data-id="${ed.id}">${t(ed.edition_label)}</button>`).join('')}
          </div>
        </div>` : '';

    qs('.book-detail__cover-wrap',modal).innerHTML = book.cover
      ? `<img src="${book.cover}" alt="${t(book.title)}" loading="lazy">` : '';
    qs('.book-detail__content',modal).innerHTML = `
      <p class="book-detail__meta">${t(book.genre)} · ${t(book.edition_label)}</p>
      <h2 class="book-detail__title">${t(book.title)}${badge}</h2>
      ${subtitle}
      <p class="book-detail__publisher">${book.publisher||''}</p>
      <p class="book-detail__desc">${t(book.description)}</p>
      ${buyLinks?`<div class="book-detail__links">${buyLinks}</div>`:''}
      ${reviewsBtn}
      ${editionHTML}`;

    qsa('.book-detail__edition-btn',modal).forEach(btn=>
      btn.addEventListener('click',()=>{ const ed=allBooks.find(b=>b.id===btn.dataset.id); if(ed) openBookDetail(ed,false); }));

    const rvBtn = qs('.book-detail__reviews-btn',modal);
    if (rvBtn) {
      rvBtn.addEventListener('click',()=>{
        const targetCanon = rvBtn.dataset.canon;
        modal.classList.remove('open');
        document.body.style.overflow='';

        // Open the matching accordion group first so its size is final
        // before we scroll to it.
        const accordion = qs('#reviews-accordion');
        if (accordion) {
          qsa('.review-group__btn', accordion).forEach(b => {
            b.setAttribute('aria-expanded','false');
            const body = qs(`#${b.getAttribute('aria-controls')}`);
            if (body) body.hidden = true;
          });
          const groupBtn = qs(`.review-group__btn[data-canon="${targetCanon}"]`, accordion);
          if (groupBtn) {
            groupBtn.setAttribute('aria-expanded','true');
            const body = qs(`#${groupBtn.getAttribute('aria-controls')}`);
            if (body) body.hidden = false;
          }
        }

        const target = qs(`#review-group-${targetCanon}`) || qs('#reviews');
        if (target) target.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }

    modal.classList.add('open');
    document.body.style.overflow='hidden';
  }

  // ── Reviews — book-grouped accordion with show-more ───────
  // Each review has type: "review" (has source URL, clickable card)
  //                    or "testimonial" (personal reaction, flip card with bio on back)
  // Shows first 4 per group; "Show more" reveals the rest.
  const REVIEWS_INITIAL = 3;

  function buildReviewCard(r, ri) {
    const initial = (t(r.attribution)[0] || '?');
    const hidden = ri >= REVIEWS_INITIAL ? ' review-card--hidden' : '';

    // Front: existing layout (photo circle, name, role, quote, source link)
    const photoFront = r.photo
      ? `<img class="review-card__photo" src="${r.photo}" alt="${t(r.attribution)}" loading="lazy"
             onerror="this.outerHTML='<div class=review-card__photo-placeholder>${initial}</div>'">`
      : `<div class="review-card__photo-placeholder">${initial}</div>`;

    const liveUrl = r.url;
    const archUrl = r.archive_url;
    const sourceLinks = (liveUrl || archUrl)
      ? `<div class="review-card__links">
          ${liveUrl ? `<a href="${liveUrl}" target="_blank" rel="noopener" class="review-card__link"
              onclick="event.stopPropagation()">
              ${t(r.source) || (lang==='hi' ? 'स्रोत' : 'Source')} ↗
            </a>` : ''}
          ${archUrl ? `<a href="${archUrl}" target="_blank" rel="noopener"
              class="review-card__link review-card__link--archive"
              onclick="event.stopPropagation()">
              📦 ${lang==='hi'?'संग्रहीत':'Archived'}
            </a>` : ''}
        </div>` : '';

    // Back: full-bleed photo + dark overlay, name, bio, source + date link
    const photoBack = r.photo
      ? `<img class="review-card__back-img" src="${r.photo}" alt="" aria-hidden="true">`
      : '';
    const bioText = t(r.bio) || '';
    const sourceLabel = t(r.source) || '';
    const dateLabel = r.date ? fmtDate(r.date) : '';
    const sourceLine = [sourceLabel, dateLabel].filter(Boolean).join(' · ');
    const backLink = (liveUrl || archUrl)
      ? `<a href="${liveUrl || archUrl}" target="_blank" rel="noopener"
            class="review-card__back-link" onclick="event.stopPropagation()">
          ${sourceLine || (lang==='hi' ? 'स्रोत देखें' : 'Read source')} ↗
        </a>`
      : (sourceLine ? `<span class="review-card__back-source">${sourceLine}</span>` : '');

    return `
      <div class="review-card review-card--flip${hidden}" tabindex="0"
           role="button" aria-label="${t(r.attribution)}">
        <div class="review-card__inner">
          <div class="review-card__front">
            <div class="review-card__header">
              ${photoFront}
              <div class="review-card__attr">
                <p class="review-card__name">${t(r.attribution)}</p>
                <p class="review-card__role">${t(r.role)}</p>
                ${r.date ? `<p class="review-card__date">${fmtDate(r.date)}</p>` : ''}
              </div>
            </div>
            <blockquote class="review-card__quote">${t(r.quote)}</blockquote>
            ${sourceLinks}
          </div>
          <div class="review-card__back">
            ${photoBack}
            <div class="review-card__back-overlay"></div>
            <button class="review-card__back-close" aria-label="${lang==='hi'?'वापस':'Back'}"
                    onclick="event.stopPropagation();this.closest('.review-card--flip').classList.remove('flipped')">&#x2190;</button>
            <div class="review-card__back-content">
              <p class="review-card__back-name">${t(r.attribution)}</p>
              ${bioText ? `<p class="review-card__back-bio">${bioText}</p>` : ''}
              ${backLink}
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderReviews() {
    const container = qs('#reviews-accordion');
    if (!container) return;

    // Group all reviews by canonical_id — no type split
    const groups = {};
    allReviews.forEach(r => {
      const cid = r.canonical_id || 'other';
      if (!groups[cid]) groups[cid] = [];
      groups[cid].push(r);
    });

    // Order by most recent book year
    const ordered = Object.entries(groups).sort(([a], [b]) => {
      const yr = cid => Math.max(0, ...allBooks.filter(bk=>(bk.canonical_id||bk.id)===cid).map(bk=>bk.year||0));
      return yr(b) - yr(a);
    });

    container.innerHTML = ordered.map(([canonId, reviews], gi) => {
      const bookEditions = allBooks.filter(b=>(b.canonical_id||b.id)===canonId);
      const latestBook = bookEditions.sort((a,b)=>b.year-a.year)[0];
      const bookTitle = latestBook ? t(latestBook.title) : canonId;
      const count = reviews.length;
      const countLabel = lang==='hi' ? `${count} प्रतिक्रियाएँ` : `${count} response${count!==1?'s':''}`;

      const cards = reviews.map((r,i) => buildReviewCard(r,i)).join('');

      const showMoreBtn = count > REVIEWS_INITIAL
        ? `<button class="review-group__more-btn" data-group="${gi}" aria-expanded="false">
            ${lang==='hi' ? `${count-REVIEWS_INITIAL} और देखें` : `Show ${count-REVIEWS_INITIAL} more`}
          </button>` : '';

      return `
        <div class="review-group" id="review-group-${canonId}">
          <button class="review-group__btn" data-canon="${canonId}"
                  aria-expanded="${gi===0?'true':'false'}"
                  aria-controls="rgroup-${gi}">
            <span class="review-group__title">${bookTitle}</span>
            <span class="review-group__count">${countLabel}</span>
            <span class="accordion-icon" aria-hidden="true"></span>
          </button>
          <div class="review-group__body" id="rgroup-${gi}" ${gi===0?'':'hidden'}>
            <div class="review-group__cards">${cards}</div>
            ${showMoreBtn}
          </div>
        </div>`;
    }).join('');

    // Accordion toggle
    qsa('.review-group__btn', container).forEach(btn => {
      btn.addEventListener('click', () => {
        const body = qs(`#${btn.getAttribute('aria-controls')}`);
        const isOpen = btn.getAttribute('aria-expanded')==='true';
        qsa('.review-group__btn', container).forEach(b => {
          b.setAttribute('aria-expanded','false');
          qs(`#${b.getAttribute('aria-controls')}`).hidden = true;
        });
        if (!isOpen) { btn.setAttribute('aria-expanded','true'); body.hidden = false; }
      });
    });

    // Show-more
    qsa('.review-group__more-btn', container).forEach(btn => {
      btn.addEventListener('click', () => {
        const gi = btn.dataset.group;
        const body = qs(`#rgroup-${gi}`);
        if (!body) return;
        const isExpanded = btn.getAttribute('aria-expanded')==='true';
        const cards = qsa('.review-card', body);
        if (!isExpanded) {
          cards.forEach(c => c.classList.remove('review-card--hidden'));
          btn.setAttribute('aria-expanded','true');
          btn.textContent = lang==='hi' ? 'कम करें ↑' : 'Show less ↑';
        } else {
          cards.forEach((c,i) => { if (i >= REVIEWS_INITIAL) c.classList.add('review-card--hidden'); });
          btn.setAttribute('aria-expanded','false');
          btn.textContent = lang==='hi'
            ? `${cards.length-REVIEWS_INITIAL} और देखें`
            : `Show ${cards.length-REVIEWS_INITIAL} more`;
        }
      });
    });

    // Flip cards — click card body to flip, ← button handled inline via onclick
    qsa('.review-card--flip', container).forEach(card => {
      card.addEventListener('click', () => card.classList.toggle('flipped'));
      card.addEventListener('keydown', e => {
        if (e.key==='Enter'||e.key===' ') { e.preventDefault(); card.classList.toggle('flipped'); }
      });
    });

    initScrollAnim();
  }

  // ── Press list ────────────────────────────────────────────
  function renderPress() {
    const list = qs('#press-list');
    if (!list) return;
    list.innerHTML = allPress.map(item => {
      const href = item.url || item.archive_url || '#';
      const isArchiveOnly = !item.url && item.archive_url;
      return `
        <a class="press-item" href="${href}" target="_blank" rel="noopener">
          <span class="press-item__source">
            ${item.source}
            ${isArchiveOnly ? '<span class="press-item__archive-badge">📦</span>' : ''}
          </span>
          <div>
            <p class="press-item__quote">${t(item.quote)}</p>
            <p class="press-item__attr">— ${t(item.attribution)}
              ${item.date ? `<span class="press-item__date">${fmtDate(item.date)}</span>` : ''}
            </p>
            ${item.url && item.archive_url
              ? `<a href="${item.archive_url}" target="_blank" rel="noopener"
                    class="press-item__archive-link" onclick="event.stopPropagation()">
                  📦 ${lang==='hi'?'संग्रहीत':'Archived'}
                </a>` : ''}
          </div>
        </a>`;
    }).join('');
  }

  // ── Interviews accordion ──────────────────────────────────
  function renderInterviews() {
    const container = qs('#interviews-accordion');
    if (!container) return;
    if (!allInterviews.length) return;
    container.innerHTML = allInterviews.map((item, i) => {
      const href = item.url || item.archive_url || '#';
      const hasArchive = item.archive_url && item.url;
      return `
        <div class="accordion-item">
          <button class="accordion-btn" aria-expanded="false" aria-controls="intv-${i}">
            <span class="accordion-source">${item.source}</span>
            <span class="accordion-title">${t(item.title)}</span>
            <span class="accordion-date">${fmtDate(item.date)}</span>
            <span class="accordion-icon" aria-hidden="true"></span>
          </button>
          <div class="accordion-body" id="intv-${i}" hidden>
            <a href="${href}" target="_blank" rel="noopener" class="accordion-link">
              ${lang==='hi'?'पूरा साक्षात्कार पढ़ें →':'Read full interview →'}
            </a>
            ${hasArchive
              ? `<a href="${item.archive_url}" target="_blank" rel="noopener"
                    class="accordion-link accordion-link--archive">
                  📦 ${lang==='hi'?'संग्रहीत संस्करण':'Archived version'}
                </a>` : ''}
          </div>
        </div>`;
    }).join('');

    if (!container._accordionInit) {
      container._accordionInit = true;
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.accordion-btn');
        if (!btn) return;
        const body = qs(`#${btn.getAttribute('aria-controls')}`);
        const isOpen = btn.getAttribute('aria-expanded')==='true';
        qsa('.accordion-btn', container).forEach(b => {
          b.setAttribute('aria-expanded','false');
          qs(`#${b.getAttribute('aria-controls')}`).hidden=true;
        });
        if (!isOpen) { btn.setAttribute('aria-expanded','true'); body.hidden=false; }
      });
    }
  }

  // ── Talks ─────────────────────────────────────────────────
  function renderTalks() {
    const grid = qs('#talks-grid');
    if (!grid) return;
    const videoCards = [];
    const textItems  = [];
    allTalks.forEach(talk => {
      if (!talk.videos||talk.videos.length===0) textItems.push(talk);
      else talk.videos.forEach(v=>videoCards.push({talk,video:v}));
    });
    grid.innerHTML = videoCards.map(({talk,video})=>{
      return `
        <div class="talk-card fade-up">
          <iframe src="${youtubeEmbed(video.youtube_id)}" title="${t(video.title)}" allowfullscreen loading="lazy"></iframe>
          <div class="talk-card__body">
            <h3 class="talk-card__title">
              ${talk.seriesTitle?`${t(talk.seriesTitle)} — `:''}${t(video.title)}
            </h3>
            <p class="talk-card__meta">${fmtDate(video.date)}</p>
            <p class="talk-card__desc">${t(talk.description)}</p>
          </div>
        </div>`;
    }).join('');

    const textList = qs('#talks-text-list');
    if (textList && textItems.length) {
      textList.innerHTML = textItems.map(talk=>`
        <li class="talks-text-item">
          <span class="talks-text-date">${fmtDate(talk.date)}</span>
          <span class="talks-text-title">${t(talk.title)}</span>
        </li>`).join('');
      textList.closest('.talks-text-section')?.removeAttribute('hidden');
    }
    initScrollAnim();
  }

  // ── Posts snippet (main page — 3 latest) ─────────────────
  // posts.json now contains the full body[] — no separate per-post files.
  // Excerpt is derived automatically from the first paragraph block.
  function getExcerpt(post) {
    if (post.excerpt && t(post.excerpt)) return t(post.excerpt);
    const firstPara = (post.body || []).find(b => b.type === 'paragraph');
    const text = firstPara ? t(firstPara.text) : '';
    return text.length > 160 ? text.slice(0, 157) + '…' : text;
  }

  function renderPostsSnippet() {
    const grid = qs('#posts-snippet');
    if (!grid || !allPosts.length) return;

    const recent = [...allPosts]
      .sort((a,b)=>b.date.localeCompare(a.date))
      .slice(0,3);

    grid.innerHTML = recent.map(post => {
      const dateStr = post.date
        ? new Date(post.date).toLocaleDateString(lang==='hi'?'hi-IN':'en-IN',{year:'numeric',month:'long',day:'numeric'})
        : '';
      return `
        <a class="post-card" href="posts.html#${post.id}">
          ${post.image ? `<div class="post-card__img-wrap">
            <img src="${post.image}" alt="${t(post.title)}" loading="lazy">
          </div>` : ''}
          <div class="post-card__body">
            <p class="post-card__date">${dateStr}</p>
            <h3 class="post-card__title">${t(post.title)}</h3>
            <p class="post-card__excerpt">${getExcerpt(post)}</p>
          </div>
        </a>`;
    }).join('');

    const all = qs('#posts-see-all');
    if (all) all.style.display = allPosts.length > 3 ? '' : 'none';
  }

  // ── Static text swap ──────────────────────────────────────
  function renderStaticText() {
    qsa('[data-hi]').forEach(el => {
      el.textContent = lang==='hi' ? el.dataset.hi : (el.dataset.en||el.dataset.hi);
    });
    qsa('[data-hi-html]').forEach(el => {
      el.innerHTML = lang==='hi' ? el.dataset.hiHtml : (el.dataset.enHtml||el.dataset.hiHtml);
    });
    qsa('.accordion-link:not(.accordion-link--archive)').forEach(a => {
      a.textContent = lang==='hi'?'पूरा साक्षात्कार पढ़ें →':'Read full interview →';
    });
  }

  // ── Contact form ──────────────────────────────────────────
  function initContactForm() {
    const form = qs('#contact-form');
    if (!form) return;
    form.addEventListener('submit', async(e)=>{
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled=true;
      btn.textContent=lang==='hi'?'भेजा जा रहा है…':'Sending…';
      try {
        const res = await fetch(form.action,{method:'POST',body:new FormData(form),headers:{'Accept':'application/json'}});
        if (res.ok) {
          form.innerHTML=`<p style="font-family:var(--serif);font-size:1.2rem;color:var(--ink);">
            ${lang==='hi'?'आपका सन्देश मिल गया। धन्यवाद!':'Your message has been received. Thank you!'}</p>`;
        } else throw new Error();
      } catch {
        btn.disabled=false;
        btn.textContent=lang==='hi'?'भेजें':'Send Message';
        alert(lang==='hi'?'कुछ गड़बड़ हो गई। कृपया पुनः प्रयास करें।':'Something went wrong. Please try again.');
      }
    });
  }

  // ── Gallery lightbox ──────────────────────────────────────
  function initGalleryCarousel() {
    const items = qsa('.gallery-item');
    if (!items.length) return;
    const images = items.map(item=>({
      src: item.querySelector('img')?.src||'',
      caption: item.querySelector('.gallery-item__caption')?.textContent||''
    }));
    const lb = document.createElement('div');
    lb.id='gallery-lightbox';
    lb.setAttribute('role','dialog');
    lb.setAttribute('aria-modal','true');
    lb.innerHTML=`
      <div class="lightbox__backdrop"></div>
      <button class="lightbox__close" aria-label="Close">&#x2715;</button>
      <div class="lightbox__content">
        <div class="lightbox__tap-prev" aria-label="Previous" role="button" tabindex="0"></div>
        <div class="lightbox__tap-next" aria-label="Next"     role="button" tabindex="0"></div>
        <img class="lightbox__img" src="" alt="">
        <p class="lightbox__caption"></p>
      </div>`;
    document.body.appendChild(lb);
    let cur=0;
    const show=(idx)=>{
      cur=((idx%images.length)+images.length)%images.length;
      qs('.lightbox__img',lb).src=images[cur].src;
      qs('.lightbox__img',lb).alt=images[cur].caption;
      qs('.lightbox__caption',lb).textContent=images[cur].caption;
      lb.classList.add('open'); document.body.style.overflow='hidden';
    };
    const close=()=>{ lb.classList.remove('open'); document.body.style.overflow=''; };
    items.forEach((item,i)=>{
      item.setAttribute('role','button'); item.setAttribute('tabindex','0');
      item.addEventListener('click',()=>show(i));
      item.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();show(i);} });
    });
    qs('.lightbox__backdrop',lb).addEventListener('click',close);
    qs('.lightbox__close',lb).addEventListener('click',close);
    qs('.lightbox__tap-prev',lb).addEventListener('click', e => { e.stopPropagation(); show(cur-1); });
    qs('.lightbox__tap-next',lb).addEventListener('click', e => { e.stopPropagation(); show(cur+1); });
    qs('.lightbox__tap-prev',lb).addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') show(cur-1); });
    qs('.lightbox__tap-next',lb).addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' ') show(cur+1); });
    document.addEventListener('keydown',e=>{
      if (!lb.classList.contains('open')) return;
      if (e.key==='Escape') close();
      if (e.key==='ArrowLeft') show(cur-1);
      if (e.key==='ArrowRight') show(cur+1);
    });
  }

  // ── Boot ──────────────────────────────────────────────────
  async function init() {
    initLangToggle();
    initNav();
    try {
      [allBooks, allReviews, allPress, allInterviews, allTalks, allNews, allPosts] = await Promise.all([
        fetchJSON('data/books.json'),
        fetchJSON('data/reviews.json'),
        fetchJSON('data/press.json'),
        fetchJSON('data/interviews.json'),
        fetchJSON('data/talks.json'),
        fetchJSON('data/news.json'),
        fetchJSON('data/posts.json'),
      ]);
    } catch (err) {
      console.error('Data load error:', err);
      const grid = qs('#books-grid');
      if (grid) grid.innerHTML = `<p style="color:#c8a068;padding:2rem 0">
        ${lang==='hi'?'डेटा लोड नहीं हो सका। पृष्ठ पुनः लोड करें।':'Could not load content. Please refresh the page.'}</p>`;
      return;
    }
    renderNews();
    renderFilterButtons();
    renderBooks();
    renderReviews();
    renderPress();
    renderInterviews();
    renderTalks();
    renderPostsSnippet();
    renderStaticText();
    initScrollAnim();
    initContactForm();
    initBookDetailModal();
    initGalleryCarousel();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
