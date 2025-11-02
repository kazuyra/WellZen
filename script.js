// ========= tiny helpers =========
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

document.addEventListener('DOMContentLoaded', () => {
  safe(setActiveNav);
  safe(setupMoreMenu);
  safe(setupSmoothScroll);
  safe(setupSignupForm);
  safe(setupCountUp);
  safe(setupReveal);
});

// Run a function and swallow errors so nothing breaks CSS/layout
function safe(fn) {
  try { fn && fn(); } catch (e) { /* console.warn(e); */ }
}

/* ========= 1) Active nav link (class only) ========= */
function setActiveNav() {
  const path = location.pathname.replace(/\/index\.html$/, '/');
  $$('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    const isHome = href === 'index.html' && (path.endsWith('/') || path.endsWith('/index.html'));
    const isBlog = href === 'blog/' && path.includes('/blog/');
    const isExact = href !== 'index.html' && href !== 'blog/' && path.endsWith('/' + href);
    a.classList.toggle('active', isHome || isBlog || isExact);
  });
}

/* ========= 2) “More ▾” menu (class toggle only) ========= */
function setupMoreMenu() {
  const wrapper = $('.nav-more');
  const btn = $('.more-toggle');
  const menu = $('.more-menu');
  if (!wrapper || !btn || !menu) return;

  function open()  { wrapper.classList.add('open');  btn.setAttribute('aria-expanded', 'true'); }
  function close() { wrapper.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  function toggle() { wrapper.classList.contains('open') ? close() : open(); }

  btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  document.addEventListener('click', e => { if (!wrapper.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ========= 3) Smooth scroll for same-page anchors ========= */
function setupSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', `#${id}`);
    });
  });
}

/* ========= 4) Newsletter form (non-destructive) ========= */
function setupSignupForm() {
  const form = $('.signup');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#email', form)?.value?.trim();
    const valid = !!email && /\S+@\S+\.\S+/.test(email);
    const msg = document.createElement('p');
    msg.className = 'muted small signup-msg';
    msg.textContent = valid ? 'Thanks! You’re on the list. (Demo only)' : 'Please enter a valid email.';
    $('.signup-msg')?.remove();
    form.parentElement.appendChild(msg);
    form.reset();
  });
}

/* ========= 5) Count-up numbers (no inline style changes) ========= */
/* Use: <div class="stat-number" data-target="2000">0</div> */
function setupCountUp() {
  const nums = $$('.stat-number[data-target]');
  if (!nums.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.target || '0');
      const duration = 1200;
      let start = null;
      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        el.textContent = Math.floor(target * p).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: 0.35 });

  nums.forEach(n => io.observe(n));
}

/* ========= 6) Reveal on scroll (class toggle only) ========= */
/* Add class="reveal" in HTML; CSS handles the animation */
function setupReveal() {
  const els = $$('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  els.forEach(el => io.observe(el));
}
