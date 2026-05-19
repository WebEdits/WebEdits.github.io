/* ============================================================
   PRACHAND PRAVEER — main.js
   Loads data from /data/*.json and renders the page.
   No jQuery. No frameworks. Pure vanilla JS.

   HOW IT WORKS:
   - Reads the <html lang="hi|en"> attribute set by index.html/en.html
   - Fetches books.json, testimonials.json, news.json
   - Renders cards into placeholder <div id="books-grid"> etc.
   - Language toggle button switches lang attr + re-renders
   ============================================================ */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────
  let lang = document.documentElement.lang || 'hi';
  let allBooks = [];
  let allTestimonials = {};
  let allNews = [];
  let activeFilter = 'all';
  let currentPage = 0;

  // ── Helpers ───────────────────────────────────────────────
  const t  = (obj) => (obj && obj[lang]) || obj?.hi || obj?.en || '';
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  async function fetchJSON(path) {
    const base = document.querySelector('meta[name="base-path"]')?.content || '';
    const r = await fetch(base + path);
    if (!r.ok) throw new Error(`Failed to load ${path}`);
    return r.json();
  }

  // ── Language toggle ───────────────────────────────────────
  function setLang(newLang) {
    lang = newLang;
    document.documentElement.lang = lang;
    localStorage.setItem('pp-lang', lang);

    // Update all toggle buttons on page
    qsa('.lang-toggle button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Close book detail modal if open
    const modal = qs('#book-detail-modal');
    if (modal?.classList.contains('open')) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    // Re-render everything
    if (allBooks.length) {
      renderFilterButtons();
      renderBooks();
    }
    if (allTestimonials.author) renderTestimonials();
    if (allTestimonials.press)  renderPress();
    if (allNews.length)         renderNews();
    renderStaticText();
  }

  function initLangToggle() {
    // Respect previous preference, but page default wins on first visit
    const saved = localStorage.getItem('pp-lang');
    if (saved && saved !== lang) setLang(saved);

    document.addEventListener('click', (e) => {
      if (e.target.matches('.lang-toggle button')) {
        setLang(e.target.dataset.lang);
      }
    });
  }

  // ── Hamburger nav ─────────────────────────────────────────
  function initNav() {
    const ham    = qs('#nav-ham');
    const drawer = qs('#nav-drawer');
    if (!ham || !drawer) return;

    ham.addEventListener('click', () => {
      drawer.classList.toggle('open');
    });
    // Close on link click
    qsa('a', drawer).forEach(a => {
      a.addEventListener('click', () => drawer.classList.remove('open'));
    });

    // Active nav highlight on scroll
    const sections = qsa('section[id]');
    const navLinks = qsa('.nav__links a, .nav__drawer a[href^="#"]');
    window.addEventListener('scroll', () => {
      let cur = '';
      sections.forEach(s => {
        if (window.scrollY >= s.offsetTop - 100) cur = s.id;
      });
      navLinks.forEach(a => {
        const href = a.getAttribute('href');
        a.classList.toggle('active', href === '#' + cur);
      });
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

  // ── Render: News banner ───────────────────────────────────
  function renderNews() {
    const el = qs('#news-banner');
    if (!el || !allNews.length) return;
    const item = allNews[0]; // show latest
    el.innerHTML = `
      <p>${t(item.title)} — ${t(item.body)}</p>
      ${item.link ? `<a href="${item.link}" target="_blank" rel="noopener">
        ${lang === 'hi' ? 'अभी खरीदें →' : 'Buy Now →'}
      </a>` : ''}
    `;
    el.parentElement.style.display = '';
  }

  // ── Render: Books grid ────────────────────────────────────
  function renderBooks() {
    const grid = qs('#books-grid');
    if (!grid) return;

    const sorted = [...allBooks].sort((a, b) => b.year - a.year);
    const filtered = activeFilter === 'all'
      ? sorted
      : sorted.filter(b => {
          const genre = b.genre?.en?.toLowerCase() || '';
          return genre.includes(activeFilter);
        });

    grid.innerHTML = filtered.map(book => {
      const hasCover = book.cover;
      const coverHTML = hasCover
        ? `<img src="${book.cover}" alt="${t(book.title)}" loading="lazy"
             onerror="this.parentElement.innerHTML=\`${placeholderHTML(book)}\`">`
        : placeholderHTML(book);

      const badge = book.new_edition
        ? `<span class="book-card__badge">${lang === 'hi' ? 'नया संस्करण' : 'New Edition'}</span>`
        : '';

      const links = Object.entries(book.links || {})
        .map(([key, url]) => {
          const label = {
            amazon_in: 'Amazon',
            flipkart: 'Flipkart',
            amazon_com: 'Amazon US'
          }[key] || key;
          return `<a href="${url}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">${label}</a>`;
        }).join('');

      return `
        <div class="book-card" data-id="${book.id}" data-genre="${book.genre?.en?.toLowerCase() || ''}" tabindex="0">
          <div class="book-card__cover">${coverHTML}</div>
          <div class="book-card__overlay">
            <p class="book-card__meta">${t(book.genre)} · ${book.latest_edition || book.year}</p>
            <h3 class="book-card__title">${t(book.title)}${badge}</h3>
            <p class="book-card__desc">${t(book.description)}</p>
            <div class="book-card__links">${links}</div>
          </div>
        </div>`;
    }).join('');

    // Remove old pagination if present
    const pager = qs('#books-pagination');
    if (pager) pager.innerHTML = '';

    // Click to open detail modal
    qsa('.book-card', grid).forEach(card => {
      card.addEventListener('click', () => {
        const book = allBooks.find(b => b.id === card.dataset.id);
        if (book) openBookDetail(book);
      });
    });

    // Inject carousel wrapper + arrow buttons (once)
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
          const step = 236;
          if (dir === 'prev') {
            if (grid.scrollLeft < step / 2) {
              grid.scrollLeft = grid.scrollWidth;
            } else {
              grid.scrollBy({ left: -step, behavior: 'smooth' });
            }
          } else {
            if (grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - step / 2) {
              grid.scrollLeft = 0;
            } else {
              grid.scrollBy({ left: step, behavior: 'smooth' });
            }
          }
        });
        wrap.appendChild(btn);
      });
    }
  }

  function placeholderHTML(book) {
    return `<div class="book-card__cover-placeholder">
      <p class="placeholder-title">${t(book.title)}</p>
      <p class="placeholder-year">${book.year}</p>
    </div>`;
  }

  // ── Render: Genre filter buttons ──────────────────────────
  function renderFilterButtons() {
    const container = qs('#books-filter');
    if (!container) return;

    const genres = ['all', ...new Set(allBooks.map(b => b.genre?.en?.toLowerCase()))];
    const labels = {
      all: { hi: 'सभी', en: 'All' },
      novel: { hi: 'उपन्यास', en: 'Novels' },
      'short stories': { hi: 'कहानियाँ', en: 'Stories' },
      'cinema theory': { hi: 'सिनेमा', en: 'Cinema' },
      'cinema theory (english)': { hi: 'सिनेमा (EN)', en: 'Cinema (EN)' }
    };

    container.innerHTML = genres.map(g => {
      const label = labels[g] ? t(labels[g]) : g;
      return `<button data-genre="${g}" class="${g === activeFilter ? 'active' : ''}">${label}</button>`;
    }).join('');

    if (!container._filterInit) {
      container._filterInit = true;
      container.addEventListener('click', (e) => {
        if (!e.target.matches('button')) return;
        activeFilter = e.target.dataset.genre;
        currentPage = 0;
        qsa('button', container).forEach(btn => btn.classList.toggle('active', btn.dataset.genre === activeFilter));
        renderBooks();
      });
    }
  }

  // ── Render: Testimonials ──────────────────────────────────
  function renderTestimonials() {
    const grid = qs('#testimonials-grid');
    if (!grid) return;

    const items = allTestimonials.author || [];
    // Find book title for each testimonial
    grid.innerHTML = items.map(item => {
      const book = allBooks.find(b => b.id === item.book_id);
      const bookLabel = book ? t(book.title) : '';

      return `
        <div class="testimonial-card fade-up">
          ${bookLabel ? `<p class="testimonial-card__book">${bookLabel}</p>` : ''}
          <blockquote class="testimonial-card__quote">${t(item.quote)}</blockquote>
          <div class="testimonial-card__attr">
            <p class="testimonial-card__name">${t(item.attribution)}</p>
            <p class="testimonial-card__role">${t(item.role)}</p>
          </div>
        </div>`;
    }).join('');
    initScrollAnim();
  }

  // ── Render: Press ─────────────────────────────────────────
  function renderPress() {
    const list = qs('#press-list');
    if (!list) return;

    const items = allTestimonials.press || [];
    list.innerHTML = items.map(item => `
      <a class="press-item" href="${item.url || '#'}" target="_blank" rel="noopener">
        <span class="press-item__source">${item.source}</span>
        <div>
          <p class="press-item__quote">${t(item.quote)}</p>
          <p class="press-item__attr">— ${t(item.attribution)}</p>
        </div>
      </a>`).join('');
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

    function closeModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
    modal.querySelector('.book-detail__backdrop').addEventListener('click', closeModal);
    modal.querySelector('.book-detail__close').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });
  }

  function openBookDetail(book) {
    const modal = qs('#book-detail-modal');
    if (!modal) return;

    const badge = book.new_edition
      ? `<span class="book-detail__badge">${lang === 'hi' ? 'नया संस्करण' : 'New Edition'}</span>`
      : '';

    const subtitle = t(book.subtitle)
      ? `<p class="book-detail__subtitle">${t(book.subtitle)}</p>`
      : '';

    const links = Object.entries(book.links || {})
      .map(([key, url]) => {
        const label = { amazon_in: 'Amazon IN', flipkart: 'Flipkart', amazon_com: 'Amazon US' }[key] || key;
        return `<a href="${url}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">${label}</a>`;
      }).join('');

    const testimonials = (allTestimonials.author || []).filter(item => item.book_id === book.id);
    const testimonialHTML = testimonials.length
      ? `<div class="book-detail__testimonials">
          <p class="book-detail__testimonials-label">${lang === 'hi' ? 'समीक्षा' : 'Reviews &amp; Endorsements'}</p>
          ${testimonials.map(item => `
            <div class="book-detail__testimonial">
              <p class="book-detail__testimonial-quote">${t(item.quote)}</p>
              <p class="book-detail__testimonial-attr">— ${t(item.attribution)}<span>, ${t(item.role)}</span></p>
            </div>`).join('')}
        </div>`
      : '';

    modal.querySelector('.book-detail__cover-wrap').innerHTML =
      book.cover ? `<img src="${book.cover}" alt="${t(book.title)}">` : '';

    modal.querySelector('.book-detail__content').innerHTML = `
      <p class="book-detail__meta">${t(book.genre)} · ${book.publisher || ''} · ${book.latest_edition || book.year}</p>
      <h2 class="book-detail__title">${t(book.title)}${badge}</h2>
      ${subtitle}
      <p class="book-detail__desc">${t(book.description)}</p>
      <div class="book-detail__links">${links}</div>
      ${testimonialHTML}`;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ── Render: Static translated text ───────────────────────
  // Elements with data-hi / data-en attributes get swapped
  function renderStaticText() {
    qsa('[data-hi]').forEach(el => {
      el.textContent = lang === 'hi' ? el.dataset.hi : (el.dataset.en || el.dataset.hi);
    });
    qsa('[data-hi-html]').forEach(el => {
      el.innerHTML = lang === 'hi' ? el.dataset.hiHtml : (el.dataset.enHtml || el.dataset.hiHtml);
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
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          form.innerHTML = `<p style="font-family:var(--serif);font-size:1.2rem;color:var(--ink);">
            ${lang === 'hi'
              ? 'आपका सन्देश मिल गया। धन्यवाद!'
              : 'Your message has been received. Thank you!'}</p>`;
        } else {
          throw new Error('Form submission failed');
        }
      } catch {
        btn.disabled = false;
        btn.textContent = lang === 'hi' ? 'भेजें' : 'Send Message';
        alert(lang === 'hi'
          ? 'कुछ गड़बड़ हो गई। कृपया पुनः प्रयास करें।'
          : 'Something went wrong. Please try again.');
      }
    });
  }

  // ── Gallery carousel ──────────────────────────────────
  function initGalleryCarousel() {
    const items = qsa('.gallery-item');
    if (!items.length) return;

    const images = items.map(item => ({
      src: item.querySelector('img')?.src || '',
      caption: item.querySelector('.gallery-item__caption')?.textContent || ''
    }));

    const lb = document.createElement('div');
    lb.id = 'gallery-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = `
      <div class="lightbox__backdrop"></div>
      <button class="lightbox__close" aria-label="Close">&#x2715;</button>
      <button class="lightbox__prev" aria-label="Previous">&#x2039;</button>
      <button class="lightbox__next" aria-label="Next">&#x203A;</button>
      <div class="lightbox__content">
        <img class="lightbox__img" src="" alt="">
        <p class="lightbox__caption"></p>
      </div>`;
    document.body.appendChild(lb);

    let cur = 0;

    function showAt(idx) {
      cur = ((idx % images.length) + images.length) % images.length;
      const img = lb.querySelector('.lightbox__img');
      img.src = images[cur].src;
      img.alt = images[cur].caption;
      lb.querySelector('.lightbox__caption').textContent = images[cur].caption;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeLb() {
      lb.classList.remove('open');
      document.body.style.overflow = '';
    }

    items.forEach((item, i) => {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.addEventListener('click', () => showAt(i));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showAt(i); }
      });
    });

    lb.querySelector('.lightbox__backdrop').addEventListener('click', closeLb);
    lb.querySelector('.lightbox__close').addEventListener('click', closeLb);
    lb.querySelector('.lightbox__prev').addEventListener('click', () => showAt(cur - 1));
    lb.querySelector('.lightbox__next').addEventListener('click', () => showAt(cur + 1));

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') showAt(cur - 1);
      if (e.key === 'ArrowRight') showAt(cur + 1);
    });
  }

  // ── Boot ──────────────────────────────────────────────────
  async function init() {
    initLangToggle();
    initNav();

    try {
      [allBooks, allTestimonials, allNews] = await Promise.all([
        fetchJSON('data/books.json'),
        fetchJSON('data/testimonials.json'),
        fetchJSON('data/news.json')
      ]);
    } catch (err) {
      console.error('Data load error:', err);
      return;
    }

    renderNews();
    renderFilterButtons();
    renderBooks();
    renderTestimonials();
    renderPress();
    renderStaticText();
    initScrollAnim();
    initContactForm();
    initBookDetailModal();
    initGalleryCarousel();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
