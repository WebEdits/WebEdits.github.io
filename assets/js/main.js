/* ============================================================
   PRACHAND PRAVEER — main.js
   No jQuery. No frameworks. Pure vanilla JS.

   DATA FILES:
   - data/books.json         — 23 edition cards
   - data/reviews.json       — scholarly book reviews (grouped by canonical_id)
   - data/news-articles.json — media quotes (Media → News & Articles)
   - data/interviews.json    — interview links (Media → Interviews)
   - data/essays.json        — published essays by the author (Media → Published Essays)
   - data/talks.json         — YouTube talks
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
  let allNewsArticles = [];
  let allInterviews = [];
  let allEssays    = [];
  let allTalks     = [];
  let allNews      = [];
  let allPosts     = [];
  let activeFilter = 'all';
  let newsTimer    = null;

  // Modal nav state
  let currentModalList = [];
  let currentModalIdx  = 0;
  let closeBookDetailModal = null; // hide fn, set by initBookDetailModal; used by setLang

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

  // ── Swipe gestures ────────────────────────────────────────
  // Shared by the gallery lightbox, press lightbox, and book-detail modal.
  // A short touch (under THRESHOLD in both axes) is left alone so the
  // existing tap/click handlers on the same element still fire normally.
  function attachSwipeNav(el, { onPrev, onNext, onDismissDown } = {}) {
    if (!el) return;
    const THRESHOLD = 40;
    let startX = 0, startY = 0, tracking = false;
    el.addEventListener('touchstart', e => {
      // A second finger joining mid-gesture (pinch-to-zoom) cancels tracking
      // so the stale single-finger start point can't misfire on touchend.
      if (e.touches.length !== 1) { tracking = false; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    el.addEventListener('touchend', e => {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (absDx < THRESHOLD && absDy < THRESHOLD) return;
      if (absDx > absDy) {
        if (dx < 0 && onNext) { onNext(); e.preventDefault(); }
        else if (dx > 0 && onPrev) { onPrev(); e.preventDefault(); }
      } else if (dy > 0 && onDismissDown) {
        onDismissDown(); e.preventDefault();
      }
    });
  }

  // ── Modal history stack ───────────────────────────────────
  // Lets the mobile back button dismiss an open modal/lightbox instead of
  // leaving the site. Each open pushes one history entry; explicit close
  // (X / backdrop / Escape / swipe-down) pops it via history.back() so the
  // entry doesn't linger, and popstate (an actual back-button press) closes
  // whichever modal is on top of the stack.
  const modalHistoryStack = [];
  let suppressPopstate = false;
  function pushModalState(hide) {
    history.pushState({ ppModal: modalHistoryStack.length + 1 }, '');
    modalHistoryStack.push(hide);
  }
  function closeModalState(hide) {
    const idx = modalHistoryStack.lastIndexOf(hide);
    hide();
    if (idx === -1) return;
    modalHistoryStack.splice(idx, 1);
    suppressPopstate = true;
    history.back();
  }
  window.addEventListener('popstate', (e) => {
    if (suppressPopstate) { suppressPopstate = false; return; }
    // Only treat this as "closed one of our modals" if we actually moved
    // backward past a pushed depth — a Forward-button press back into a
    // ppModal state would otherwise pop and hide an unrelated open modal.
    const depth = e.state?.ppModal || 0;
    if (depth >= modalHistoryStack.length) return;
    const hide = modalHistoryStack.pop();
    if (hide) hide();
  });

  const MONTHS = {
    hi: ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितम्बर','अक्टूबर','नवम्बर','दिसम्बर'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  };

  function fmtDate(str) {
    if (!str) return '';
    const [y, m] = str.split('-');
    if (!m) return y;
    return `${MONTHS[lang][parseInt(m,10)-1]} ${y}`;
  }

  // Day-precision variant — used only where two same-month items must stay
  // distinguishable (e.g. adjacent press clippings). fmtDate() intentionally
  // stays month-precision everywhere else on the site.
  function fmtDateFull(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    if (!m) return y;
    if (!d) return fmtDate(str);
    return `${parseInt(d,10)} ${MONTHS[lang][parseInt(m,10)-1]} ${y}`;
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
    if (modal?.classList.contains('open') && closeBookDetailModal) {
      closeModalState(closeBookDetailModal);
    }
    if (allBooks.length)      { renderFilterButtons(); renderBooks(); }
    if (allReviews.length)    renderReviews();
    if (allNewsArticles.length) renderNewsArticles();
    if (allInterviews.length) renderInterviews();
    if (allEssays.length)     renderEssays();
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
    const closeDrawer = () => {
      drawer.classList.remove('open');
      ham.classList.remove('is-open');
      ham.setAttribute('aria-expanded', 'false');
    };
    ham.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      ham.classList.toggle('is-open', isOpen);
      ham.setAttribute('aria-expanded', String(isOpen));
    });
    qsa('a', drawer).forEach(a => a.addEventListener('click', closeDrawer));
    window.matchMedia('(max-width: 768px)').addEventListener('change', e => {
      if (!e.matches) closeDrawer();
    });
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
  function newsItemHTML(item) {
    return `
      <p>${t(item.title)} — ${t(item.body)}</p>
      ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener">
        ${lang === 'hi' ? 'अभी खरीदें →' : 'Buy Now →'}
      </a>` : ''}`;
  }

  function renderNews() {
    const el = qs('#news-banner');
    if (!el || !allNews.length) return;
    clearInterval(newsTimer);
    el.parentElement.style.display = '';
    const items = [...allNews].sort(byDateDesc);
    if (items.length === 1) { el.innerHTML = newsItemHTML(items[0]); return; }

    // Multiple items auto-rotate; suppress the live-region re-announcement
    // on every tick (role="alert" in the markup) so screen readers aren't
    // interrupted every 6s — only manual navigation should announce.
    el.setAttribute('aria-live', 'off');
    let idx = 0;
    const show = () => {
      el.innerHTML = `
        ${newsItemHTML(items[idx])}
        <div class="news-banner__dots">
          ${items.map((_, i) => `<button class="news-banner__dot${i === idx ? ' active' : ''}" data-i="${i}" aria-label="News ${i + 1}"></button>`).join('')}
        </div>`;
      qsa('.news-banner__dot', el).forEach(btn => btn.addEventListener('click', () => {
        idx = +btn.dataset.i; show(); restart();
      }));
    };
    const advance = () => { idx = (idx + 1) % items.length; show(); };
    const restart = () => { clearInterval(newsTimer); newsTimer = setInterval(advance, 6000); };
    show();
    restart();
  }

  // ── Filter buttons ────────────────────────────────────────
  function renderFilterButtons() {
    const container = qs('#books-filter');
    if (!container) return;
    const keys = ['all', ...new Set(allBooks.map(b => b.genre?.key).filter(Boolean))];
    const labels = {
      'all':                 { hi: 'सभी',               en: 'All' },
      'hindi-poetics':       { hi: 'हिन्दी काव्य',        en: 'Hindi Poetics' },
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

  // ── Books bookshelf grid ──────────────────────────────────
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
      const ribbon = book.coming_soon
        ? `<span class="book-card__ribbon">${lang === 'hi' ? 'शीघ्र प्रकाश्य' : 'Coming Soon'}</span>` : '';
      return `
        <div class="book-card" data-id="${book.id}" tabindex="0" role="button"
             aria-label="${t(book.title)}, ${t(book.edition_label)}">
          <div class="book-card__cover">${coverHTML}${badge}${ribbon}</div>
          <div class="book-card__caption">
            <h3 class="book-card__title">${t(book.title)}</h3>
            <p class="book-card__meta">${t(book.genre)} · ${t(book.edition_label)}</p>
          </div>
        </div>`;
    }).join('');

    qsa('.book-card', grid).forEach(card => {
      const open = () => {
        const book = allBooks.find(b => b.id === card.dataset.id);
        if (book) openBookDetail(book);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();open();} });
    });
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
    const hide = () => { modal.classList.remove('open'); document.body.style.overflow=''; };
    const close = () => closeModalState(hide);
    closeBookDetailModal = hide;
    const goPrev = () => {
      if (currentModalList.length<2) return;
      currentModalIdx=(currentModalIdx-1+currentModalList.length)%currentModalList.length;
      openBookDetail(currentModalList[currentModalIdx],false);
    };
    const goNext = () => {
      if (currentModalList.length<2) return;
      currentModalIdx=(currentModalIdx+1)%currentModalList.length;
      openBookDetail(currentModalList[currentModalIdx],false);
    };
    qs('.book-detail__backdrop',modal).addEventListener('click',close);
    qs('.book-detail__close',modal).addEventListener('click',close);
    qs('.book-detail__nav--prev',modal).addEventListener('click',goPrev);
    qs('.book-detail__nav--next',modal).addEventListener('click',goNext);
    // Swipe left/right flips between books, same as the prev/next buttons.
    // No swipe-down-to-dismiss here — the content pane scrolls vertically
    // and a dismiss gesture would fight with that scroll.
    attachSwipeNav(qs('.book-detail__panel',modal), { onPrev: goPrev, onNext: goNext });
    document.addEventListener('keydown',e=>{
      if (!modal.classList.contains('open')) return;
      // The press lightbox renders on top of this modal (higher z-index) and
      // has its own Escape/Arrow handling — defer to it so Escape doesn't
      // close both at once and Arrow keys don't navigate the book underneath
      // while its (now stale) press gallery is still showing.
      if (qs('#press-lightbox')?.classList.contains('open')) return;
      if (e.key==='Escape') close();
      if (e.key==='ArrowLeft')  goPrev();
      if (e.key==='ArrowRight') goNext();
    });
  }

  function openBookDetail(book, updateList=true) {
    const modal = qs('#book-detail-modal');
    if (!modal) return;
    const wasOpen = modal.classList.contains('open');
    if (updateList) {
      currentModalList = qsa('.book-card',qs('#books-grid'))
        .map(c=>allBooks.find(b=>b.id===c.dataset.id)).filter(Boolean);
      currentModalIdx = currentModalList.findIndex(b=>b.id===book.id);
    }
    const has = currentModalList.length>1;
    qs('.book-detail__nav--prev',modal).style.display = has?'':'none';
    qs('.book-detail__nav--next',modal).style.display = has?'':'none';

    const badge = book.new_edition
      ? `<span class="book-detail__badge">${lang==='hi'?'नया संस्करण':'New Edition'}</span>`
      : book.coming_soon
      ? `<span class="book-detail__badge book-detail__badge--soon">${lang==='hi'?'शीघ्र प्रकाश्य':'Coming Soon'}</span>` : '';
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

    const pressHTML = (book.press||[]).length
      ? `<div class="book-detail__press">
          <p class="book-detail__press-label">${lang==='hi'?'प्रेस में':'Press Coverage'}</p>
          <div class="book-detail__press-grid">
            ${book.press.map((p,i)=>`<button type="button" class="book-detail__press-thumb" data-idx="${i}">
                <img src="${p.image}" alt="${p.source||t(book.title)}" loading="lazy">
              </button>`).join('')}
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
      ${editionHTML}
      ${pressHTML}`;

    qsa('.book-detail__edition-btn',modal).forEach(btn=>
      btn.addEventListener('click',()=>{ const ed=allBooks.find(b=>b.id===btn.dataset.id); if(ed) openBookDetail(ed,false); }));

    qsa('.book-detail__press-thumb',modal).forEach(btn=>
      btn.addEventListener('click',()=>openPressLightbox(book.press,Number(btn.dataset.idx))));

    const rvBtn = qs('.book-detail__reviews-btn',modal);
    if (rvBtn) {
      rvBtn.addEventListener('click',()=>{
        const targetCanon = rvBtn.dataset.canon;
        closeModalState(closeBookDetailModal);

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
    if (!wasOpen) pushModalState(closeBookDetailModal);
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
            <span class="review-card__flip-hint" aria-hidden="true">&#8635;</span>
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

      const backBtn = latestBook
        ? `<button class="review-group__back-btn" data-canon="${canonId}">
            ${lang==='hi' ? '← पुस्तक देखें' : '← View book'}
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
            ${backBtn}
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

    // Back to book — reopen the detail modal for the book this review group is about
    qsa('.review-group__back-btn', container).forEach(btn => {
      btn.addEventListener('click', () => {
        const canonId = btn.dataset.canon;
        const bookEditions = allBooks.filter(b => (b.canonical_id||b.id) === canonId);
        const book = bookEditions.sort((a,b) => b.year-a.year)[0];
        if (book) openBookDetail(book);
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

  // ── Media: shared sort (newest first) + card builder ───────
  const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '');

  // `.media-card` is a <div>, not an <a> — a full-cover <a> handles the
  // primary click, and the archive link (when present) stacks above it via
  // z-index. Nesting the archive <a> inside a card-wide <a> would make the
  // browser's HTML parser split the anchors into stray sibling nodes.
  function mediaCardHTML(item, ariaLabel, bodyHTML) {
    const href = item.url || item.archive_url || '#';
    const isArchiveOnly = !item.url && item.archive_url;
    const hasArchive = item.url && item.archive_url;
    return `
      <div class="media-card">
        <a class="media-card__cover-link" href="${href}" target="_blank" rel="noopener" aria-label="${ariaLabel}"></a>
        <div class="media-card__head">
          <span class="media-card__source">
            ${item.source}
            ${isArchiveOnly ? '<span class="media-card__archive-badge">📦</span>' : ''}
          </span>
          ${item.date ? `<span class="media-card__date">${fmtDate(item.date)}</span>` : ''}
        </div>
        ${bodyHTML}
        ${hasArchive
          ? `<a href="${item.archive_url}" target="_blank" rel="noopener" class="media-card__archive-link">
              📦 ${lang==='hi'?'संग्रहीत':'Archived'}
            </a>` : ''}
      </div>`;
  }

  // ── News & Articles ────────────────────────────────────────
  function renderNewsArticles() {
    const grid = qs('#news-articles-grid');
    if (!grid) return;
    grid.innerHTML = [...allNewsArticles].sort(byDateDesc).map(item => mediaCardHTML(item, item.source, `
      <p class="media-card__text">${t(item.quote)}</p>
      <p class="media-card__meta">— ${t(item.attribution)}</p>
    `)).join('');
  }

  // ── Interviews ──────────────────────────────────────────────
  function renderInterviews() {
    const grid = qs('#interviews-grid');
    if (!grid) return;
    grid.innerHTML = [...allInterviews].sort(byDateDesc).map(item => mediaCardHTML(item, t(item.title), `
      <p class="media-card__text">${t(item.title)}</p>
      <p class="media-card__meta">${lang==='hi'?'पूरा साक्षात्कार पढ़ें →':'Read full interview →'}</p>
    `)).join('');
  }

  // ── Published Essays ─────────────────────────────────────────
  function renderEssays() {
    const grid = qs('#essays-grid');
    if (!grid) return;
    grid.innerHTML = [...allEssays].sort(byDateDesc).map(item => mediaCardHTML(item, t(item.title), `
      <p class="media-card__text">${t(item.title)}</p>
    `)).join('');
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
    qsa('[data-hi-placeholder]').forEach(el => {
      el.placeholder = lang==='hi' ? el.dataset.hiPlaceholder : (el.dataset.enPlaceholder||el.dataset.hiPlaceholder);
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
    const hide=()=>{ lb.classList.remove('open'); document.body.style.overflow=''; };
    const close=()=>closeModalState(hide);
    const show=(idx)=>{
      const wasOpen = lb.classList.contains('open');
      cur=((idx%images.length)+images.length)%images.length;
      qs('.lightbox__img',lb).src=images[cur].src;
      qs('.lightbox__img',lb).alt=images[cur].caption;
      qs('.lightbox__caption',lb).textContent=images[cur].caption;
      lb.classList.add('open'); document.body.style.overflow='hidden';
      if (!wasOpen) pushModalState(hide);
    };
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
    attachSwipeNav(qs('.lightbox__content',lb), {
      onPrev: () => show(cur-1),
      onNext: () => show(cur+1),
      onDismissDown: close
    });
    document.addEventListener('keydown',e=>{
      if (!lb.classList.contains('open')) return;
      if (e.key==='Escape') close();
      if (e.key==='ArrowLeft') show(cur-1);
      if (e.key==='ArrowRight') show(cur+1);
    });
  }

  // ── Book press-coverage lightbox (built lazily; image list swapped
  //    per book on each open, since press coverage differs per title) ──
  let pressLightboxEl = null;
  let pressImages = [];
  let pressCur = 0;
  let pressLightboxHide = null;
  function showPress(idx) {
    const lb = pressLightboxEl;
    const wasOpen = lb.classList.contains('open');
    pressCur = ((idx % pressImages.length) + pressImages.length) % pressImages.length;
    const item = pressImages[pressCur];
    const caption = [item.source, item.date ? fmtDateFull(item.date) : ''].filter(Boolean).join(' · ');
    qs('.lightbox__img',lb).src = item.image;
    qs('.lightbox__img',lb).alt = item.source || caption;
    qs('.lightbox__caption',lb).textContent = caption;
    lb.classList.add('open'); document.body.style.overflow = 'hidden';
    if (!wasOpen) pushModalState(pressLightboxHide);
  }
  function openPressLightbox(press, idx) {
    pressImages = press;
    if (!pressLightboxEl) {
      const lb = document.createElement('div');
      lb.id = 'press-lightbox';
      lb.setAttribute('role','dialog');
      lb.setAttribute('aria-modal','true');
      lb.innerHTML = `
        <div class="lightbox__backdrop"></div>
        <button class="lightbox__close" aria-label="Close">&#x2715;</button>
        <div class="lightbox__content">
          <div class="lightbox__tap-prev" aria-label="Previous" role="button" tabindex="0"></div>
          <div class="lightbox__tap-next" aria-label="Next"     role="button" tabindex="0"></div>
          <img class="lightbox__img" src="" alt="">
          <p class="lightbox__caption"></p>
        </div>`;
      document.body.appendChild(lb);
      pressLightboxEl = lb;
      // Only release the shared scroll lock if the book-detail modal
      // underneath isn't also still open and relying on it.
      pressLightboxHide = () => {
        lb.classList.remove('open');
        if (!qs('#book-detail-modal')?.classList.contains('open')) document.body.style.overflow = '';
      };
      const close = () => closeModalState(pressLightboxHide);
      qs('.lightbox__backdrop',lb).addEventListener('click',close);
      qs('.lightbox__close',lb).addEventListener('click',close);
      qs('.lightbox__tap-prev',lb).addEventListener('click', e => { e.stopPropagation(); showPress(pressCur-1); });
      qs('.lightbox__tap-next',lb).addEventListener('click', e => { e.stopPropagation(); showPress(pressCur+1); });
      attachSwipeNav(qs('.lightbox__content',lb), {
        onPrev: () => showPress(pressCur-1),
        onNext: () => showPress(pressCur+1),
        onDismissDown: close
      });
      document.addEventListener('keydown', e => {
        if (!lb.classList.contains('open')) return;
        if (e.key==='Escape') close();
        if (e.key==='ArrowLeft') showPress(pressCur-1);
        if (e.key==='ArrowRight') showPress(pressCur+1);
      });
    }
    showPress(idx);
  }

  // ── Boot ──────────────────────────────────────────────────
  async function init() {
    initLangToggle();
    initNav();
    try {
      [allBooks, allReviews, allNewsArticles, allInterviews, allEssays, allTalks, allNews, allPosts] = await Promise.all([
        fetchJSON('data/books.json'),
        fetchJSON('data/reviews.json'),
        fetchJSON('data/news-articles.json'),
        fetchJSON('data/interviews.json'),
        fetchJSON('data/essays.json'),
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
    renderNewsArticles();
    renderInterviews();
    renderEssays();
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
