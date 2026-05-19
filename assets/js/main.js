/* ============================================================
   PRACHAND PRAVEER — main.js
   Loads data from /data/*.json and renders the page.
   No jQuery. No frameworks. Pure vanilla JS.

   DATA FILES:
   - data/books.json        — 23 edition cards, genre.key for filtering
   - data/testimonials.json — author[], press[], interviews[]
   - data/talks.json        — talk groups with videos[] arrays
   - data/news.json         — announcement banner

   LANGUAGE:
   - <html lang="hi|en"> drives all rendering
   - t(obj) returns obj[lang] || obj.hi || obj.en
   - genre.key is language-independent — used for filter logic
   - genre.hi / genre.en used only for display labels
   ============================================================ */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────
  let lang            = document.documentElement.lang || 'hi';
  let allBooks        = [];
  let allTestimonials = {};
  let allTalks        = [];
  let allNews         = [];
  let activeFilter    = 'all';

  // ── Helpers ───────────────────────────────────────────────
  const t   = (obj) => (obj && obj[lang]) || obj?.hi || obj?.en || '';
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function youtubeEmbed(id) {
    return `https://www.youtube.com/embed/${id}?rel=0`;
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

    // Close book detail modal if open
    const modal = qs('#book-detail-modal');
    if (modal?.classList.contains('open')) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    if (allBooks.length)            { renderFilterButtons(); renderBooks(); }
    if (allTestimonials.author)     renderTestimonials();
    if (allTestimonials.press)      renderPress();
    if (allTestimonials.interviews) renderInterviews();
    if (allTalks.length)            renderTalks();
    if (allNews.length)             renderNews();
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
  // Uses genre.key (language-independent) for data-genre — fixes Hindi filter bug.
  function renderFilterButtons() {
    const container = qs('#books-filter');
    if (!container) return;

    const keys = ['all', ...new Set(allBooks.map(b => b.genre?.key).filter(Boolean))];
    const labels = {
      'all':                 { hi: 'सभी',               en: 'All' },
      'hindi-fiction':       { hi: 'हिन्दी गद्य',        en: 'Hindi Fiction' },
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
    ).sort((a, b) => b.year - a.year || (b.edition || 1) - (a.edition || 1));

    grid.innerHTML = filtered.map(book => {
      const coverHTML = book.cover
        ? `<img src="${book.cover}" alt="${t(book.title)}" loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=book-card__cover-placeholder><p class=placeholder-title>${t(book.title).replace(/'/g,"&#39;")}</p><p class=placeholder-year>${book.year}</p></div>'">`
        : `<div class="book-card__cover-placeholder">
             <p class="placeholder-title">${t(book.title)}</p>
             <p class="placeholder-year">${book.year}</p>
           </div>`;

      const badge = book.new_edition
        ? `<span class="book-card__badge">${lang === 'hi' ? 'नया संस्करण' : 'New'}</span>`
        : '';

      const buyLinks = Object.entries(book.links || {})
        .filter(([, url]) => url)
        .map(([key, url]) => {
          const label = { amazon_in: 'Amazon', flipkart: 'Flipkart', amazon_com: 'Amazon US', dkprintworld: 'DK Printworld' }[key] || key;
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
        </div>`;
    }).join('');

    qsa('.book-card', grid).forEach(card => {
      const open = () => {
        const book = allBooks.find(b => b.id === card.dataset.id);
        if (book) openBookDetail(book);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });

    // Build carousel wrapper + arrow buttons once
    if (!qs('#books-carousel-wrap')) {
      const wrap = document.createElement('div');
      wrap.id = 'books-carousel-wrap';
      wrap.className = 'books-carousel-wrap';
      grid.parentElement.insertBefore(wrap, grid);
      wrap.appendChild(grid);

      ['prev', 'next'].forEach(dir => {
        const btn = document.createElement('button');
        btn.className = `books-carousel__btn books-carousel__btn--${dir}`;
        btn.setAttribute('aria-label', dir === 'prev' ? 'Previous' : 'Next');
        btn.innerHTML = dir === 'prev' ? '&#x2039;' : '&#x203A;';
        btn.addEventListener('click', () => {
          const step = 316;
          if (dir === 'prev') {
            grid.scrollLeft < step / 2
              ? (grid.scrollLeft = grid.scrollWidth)
              : grid.scrollBy({ left: -step, behavior: 'smooth' });
          } else {
            grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - step / 2
              ? (grid.scrollLeft = 0)
              : grid.scrollBy({ left: step, behavior: 'smooth' });
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
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="book-detail__backdrop"></div>
      <div class="book-detail__panel">
        <button class="book-detail__close" aria-label="Close">&#x2715;</button>
        <div class="book-detail__cover-wrap"></div>
        <div class="book-detail__content"></div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };
    qs('.book-detail__backdrop', modal).addEventListener('click', close);
    qs('.book-detail__close', modal).addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  function openBookDetail(book) {
    const modal = qs('#book-detail-modal');
    if (!modal) return;

    const badge = book.new_edition
      ? `<span class="book-detail__badge">${lang === 'hi' ? 'नया संस्करण' : 'New Edition'}</span>` : '';
    const subtitle = t(book.subtitle)
      ? `<p class="book-detail__subtitle">${t(book.subtitle)}</p>` : '';

    const buyLinks = Object.entries(book.links || {})
      .filter(([, url]) => url)
      .map(([key, url]) => {
        const label = { amazon_in: 'Amazon India', flipkart: 'Flipkart', amazon_com: 'Amazon US', dkprintworld: 'DK Printworld' }[key] || key;
        return `<a href="${url}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">${label}</a>`;
      }).join('');

    // Testimonials: match on canonical_id
    const canonId = book.canonical_id || book.id;
    const testimonials = (allTestimonials.author || [])
      .filter(item => (item.canonical_id || item.book_id) === canonId);

    const testimonialHTML = testimonials.length
      ? `<div class="book-detail__testimonials">
          <p class="book-detail__testimonials-label">
            ${lang === 'hi' ? 'समीक्षा एवं प्रशंसापत्र' : 'Reviews &amp; Endorsements'}
          </p>
          ${testimonials.map(item => `
            <div class="book-detail__testimonial">
              <p class="book-detail__testimonial-quote">${t(item.quote)}</p>
              <p class="book-detail__testimonial-attr">
                — ${t(item.attribution)}<span>, ${t(item.role)}</span>
              </p>
            </div>`).join('')}
        </div>` : '';

    // Other editions of the same work
    const otherEditions = allBooks
      .filter(b => (b.canonical_id || b.id) === canonId && b.id !== book.id)
      .sort((a, b) => a.year - b.year);

    const editionHTML = otherEditions.length
      ? `<div class="book-detail__editions">
          <p class="book-detail__editions-label">
            ${lang === 'hi' ? 'अन्य संस्करण' : 'Other Editions'}
          </p>
          <div class="book-detail__editions-list">
            ${otherEditions.map(ed => `
              <button class="book-detail__edition-btn" data-id="${ed.id}">
                ${t(ed.edition_label)}
              </button>`).join('')}
          </div>
        </div>` : '';

    qs('.book-detail__cover-wrap', modal).innerHTML = book.cover
      ? `<img src="${book.cover}" alt="${t(book.title)}" loading="lazy">` : '';

    qs('.book-detail__content', modal).innerHTML = `
      <p class="book-detail__meta">${t(book.genre)} · ${t(book.edition_label)}</p>
      <h2 class="book-detail__title">${t(book.title)}${badge}</h2>
      ${subtitle}
      <p class="book-detail__publisher">${book.publisher || ''}</p>
      <p class="book-detail__desc">${t(book.description)}</p>
      ${buyLinks ? `<div class="book-detail__links">${buyLinks}</div>` : ''}
      ${editionHTML}
      ${testimonialHTML}`;

    qsa('.book-detail__edition-btn', modal).forEach(btn =>
      btn.addEventListener('click', () => {
        const ed = allBooks.find(b => b.id === btn.dataset.id);
        if (ed) openBookDetail(ed);
      }));

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ── Testimonials grid ─────────────────────────────────────
  function renderTestimonials() {
    const grid = qs('#testimonials-grid');
    if (!grid) return;
    grid.innerHTML = (allTestimonials.author || []).map(item => {
      const canonId = item.canonical_id || item.book_id;
      const book = allBooks.find(b => (b.canonical_id || b.id) === canonId && b.edition === Math.max(...allBooks.filter(x => (x.canonical_id||x.id)===canonId).map(x=>x.edition||1)));
      const bookLabel = book ? t(book.title) : '';

      // Photo or initial placeholder
      const initial = (t(item.attribution)[0] || '?');
      const photoHTML = item.photo
        ? `<img class="testimonial-card__photo" src="${item.photo}" alt="${t(item.attribution)}" loading="lazy"
             onerror="this.outerHTML='<div class=testimonial-card__photo-placeholder>${initial}</div>'">`
        : `<div class="testimonial-card__photo-placeholder">${initial}</div>`;

      return `
        <div class="testimonial-card fade-up">
          <div class="testimonial-card__header">
            ${photoHTML}
            <div class="testimonial-card__attr">
              <p class="testimonial-card__name">${t(item.attribution)}</p>
              <p class="testimonial-card__role">${t(item.role)}</p>
              ${bookLabel ? `<p class="testimonial-card__book">${bookLabel}</p>` : ''}
            </div>
          </div>
          <blockquote class="testimonial-card__quote">${t(item.quote)}</blockquote>
        </div>`;
    }).join('');
    initScrollAnim();
  }

  // ── Press list ────────────────────────────────────────────
  function renderPress() {
    const list = qs('#press-list');
    if (!list) return;
    list.innerHTML = (allTestimonials.press || []).map(item => `
      <a class="press-item" href="${item.url || '#'}" target="_blank" rel="noopener">
        <span class="press-item__source">${item.source}</span>
        <div>
          <p class="press-item__quote">${t(item.quote)}</p>
          <p class="press-item__attr">— ${t(item.attribution)}</p>
        </div>
      </a>`).join('');
  }

  // ── Interviews accordion ──────────────────────────────────
  function renderInterviews() {
    const container = qs('#interviews-accordion');
    if (!container) return;
    const interviews = allTestimonials.interviews || [];
    if (!interviews.length) return;

    container.innerHTML = interviews.map((item, i) => {
      const dateStr = item.date
        ? item.date.replace(/^(\d{4})-(\d{2}).*$/, (_, y, m) => {
            const months = { hi: ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितम्बर','अक्टूबर','नवम्बर','दिसम्बर'],
                             en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
            return `${months[lang][parseInt(m,10)-1]} ${y}`;
          })
        : '';
      return `
        <div class="accordion-item">
          <button class="accordion-btn" aria-expanded="false" aria-controls="intv-${i}">
            <span class="accordion-source">${item.source}</span>
            <span class="accordion-title">${t(item.title)}</span>
            <span class="accordion-date">${dateStr}</span>
            <span class="accordion-icon" aria-hidden="true"></span>
          </button>
          <div class="accordion-body" id="intv-${i}" hidden>
            <a href="${item.url}" target="_blank" rel="noopener" class="accordion-link">
              ${lang === 'hi' ? 'पूरा साक्षात्कार पढ़ें →' : 'Read full interview →'}
            </a>
          </div>
        </div>`;
    }).join('');

    if (!container._accordionInit) {
      container._accordionInit = true;
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.accordion-btn');
        if (!btn) return;
        const body   = qs(`#${btn.getAttribute('aria-controls')}`);
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        // Close all
        qsa('.accordion-btn', container).forEach(b => {
          b.setAttribute('aria-expanded', 'false');
          qs(`#${b.getAttribute('aria-controls')}`).hidden = true;
        });
        if (!isOpen) { btn.setAttribute('aria-expanded', 'true'); body.hidden = false; }
      });
    }
  }

  // ── Talks ─────────────────────────────────────────────────
  function renderTalks() {
    const grid = qs('#talks-grid');
    if (!grid) return;

    // Flatten: each video becomes its own card
    const videoCards = [];
    const textItems  = [];

    allTalks.forEach(talk => {
      if (!talk.videos || talk.videos.length === 0) {
        textItems.push(talk);
      } else {
        talk.videos.forEach(v => videoCards.push({ talk, video: v }));
      }
    });

    grid.innerHTML = videoCards.map(({ talk, video }) => {
      const isMulti = talk.videos.length > 1;
      return `
        <div class="talk-card fade-up">
          <iframe src="${youtubeEmbed(video.youtube_id)}"
                  title="${t(talk.title)}"
                  allowfullscreen loading="lazy"></iframe>
          <div class="talk-card__body">
            <h3 class="talk-card__title">
              ${t(talk.title)}
              ${isMulti ? `<span class="talk-card__part">${t(video.label)}</span>` : ''}
            </h3>
            <p class="talk-card__meta">${talk.date || ''}</p>
            <p class="talk-card__desc">${t(talk.description)}</p>
          </div>
        </div>`;
    }).join('');

    // Text-only entries (no video) rendered as a compact list
    const textList = qs('#talks-text-list');
    if (textList) {
      if (textItems.length) {
        textList.innerHTML = textItems.map(talk => `
          <li class="talks-text-item">
            <span class="talks-text-date">${talk.date || ''}</span>
            <span class="talks-text-title">${t(talk.title)}</span>
          </li>`).join('');
        textList.closest('.talks-text-section')?.removeAttribute('hidden');
      }
    }

    initScrollAnim();
  }

  // ── Static text swap ──────────────────────────────────────
  function renderStaticText() {
    qsa('[data-hi]').forEach(el => {
      el.textContent = lang === 'hi' ? el.dataset.hi : (el.dataset.en || el.dataset.hi);
    });
    qsa('[data-hi-html]').forEach(el => {
      el.innerHTML = lang === 'hi' ? el.dataset.hiHtml : (el.dataset.enHtml || el.dataset.hiHtml);
    });
    // Update accordion link text after language switch
    qsa('.accordion-link').forEach(a => {
      a.textContent = lang === 'hi' ? 'पूरा साक्षात्कार पढ़ें →' : 'Read full interview →';
    });
  }

  // ── Contact form ──────────────────────────────────────────
  function initContactForm() {
    const form = qs('#contact-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = lang === 'hi' ? 'भेजा जा रहा है…' : 'Sending…';
      try {
        const res = await fetch(form.action, {
          method: 'POST', body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          form.innerHTML = `<p style="font-family:var(--serif);font-size:1.2rem;color:var(--ink);">
            ${lang === 'hi' ? 'आपका सन्देश मिल गया। धन्यवाद!' : 'Your message has been received. Thank you!'}</p>`;
        } else throw new Error();
      } catch {
        btn.disabled = false;
        btn.textContent = lang === 'hi' ? 'भेजें' : 'Send Message';
        alert(lang === 'hi' ? 'कुछ गड़बड़ हो गई। कृपया पुनः प्रयास करें।' : 'Something went wrong. Please try again.');
      }
    });
  }

  // ── Gallery lightbox ──────────────────────────────────────
  function initGalleryCarousel() {
    const items = qsa('.gallery-item');
    if (!items.length) return;
    const images = items.map(item => ({
      src:     item.querySelector('img')?.src || '',
      caption: item.querySelector('.gallery-item__caption')?.textContent || ''
    }));

    const lb = document.createElement('div');
    lb.id = 'gallery-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = `
      <div class="lightbox__backdrop"></div>
      <button class="lightbox__close" aria-label="Close">&#x2715;</button>
      <button class="lightbox__prev"  aria-label="Previous">&#x2039;</button>
      <button class="lightbox__next"  aria-label="Next">&#x203A;</button>
      <div class="lightbox__content">
        <img class="lightbox__img" src="" alt="">
        <p class="lightbox__caption"></p>
      </div>`;
    document.body.appendChild(lb);

    let cur = 0;
    const show = (idx) => {
      cur = ((idx % images.length) + images.length) % images.length;
      qs('.lightbox__img', lb).src = images[cur].src;
      qs('.lightbox__img', lb).alt = images[cur].caption;
      qs('.lightbox__caption', lb).textContent = images[cur].caption;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };

    items.forEach((item, i) => {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.addEventListener('click', () => show(i));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); }
      });
    });
    qs('.lightbox__backdrop', lb).addEventListener('click', close);
    qs('.lightbox__close',    lb).addEventListener('click', close);
    qs('.lightbox__prev',     lb).addEventListener('click', () => show(cur - 1));
    qs('.lightbox__next',     lb).addEventListener('click', () => show(cur + 1));
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft')  show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  }

  // ── Boot ──────────────────────────────────────────────────
  async function init() {
    initLangToggle();
    initNav();

    try {
      [allBooks, allTestimonials, allTalks, allNews] = await Promise.all([
        fetchJSON('data/books.json'),
        fetchJSON('data/testimonials.json'),
        fetchJSON('data/talks.json'),
        fetchJSON('data/news.json')
      ]);
    } catch (err) {
      console.error('Data load error:', err);
      const grid = qs('#books-grid');
      if (grid) grid.innerHTML = `<p style="color:#c8a068;padding:2rem 0">
        ${lang === 'hi' ? 'डेटा लोड नहीं हो सका। पृष्ठ पुनः लोड करें।' : 'Could not load content. Please refresh the page.'}</p>`;
      return;
    }

    renderNews();
    renderFilterButtons();
    renderBooks();
    renderTestimonials();
    renderPress();
    renderInterviews();
    renderTalks();
    renderStaticText();
    initScrollAnim();
    initContactForm();
    initBookDetailModal();
    initGalleryCarousel();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
