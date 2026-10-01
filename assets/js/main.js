(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Theme toggle ---------- */
  var darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  function currentTheme() {
    return root.getAttribute('data-theme') || (darkMq.matches ? 'dark' : 'light');
  }
  $('#theme-toggle').addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('#menu-toggle');
  var navLinks = $('#nav-links');
  function setMenu(open) {
    navLinks.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!navLinks.classList.contains('open')); });
  navLinks.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Scroll progress + back-to-top ---------- */
  var progress = $('#progress');
  var toTop = $('#to-top');
  var ticking = false;
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    toTop.classList.toggle('show', y > 600);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Active nav link ---------- */
  if ('IntersectionObserver' in window) {
    var linkById = {};
    $$('a[href^="#"]', navLinks).forEach(function (a) { linkById[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('a.active', navLinks).forEach(function (a) { a.classList.remove('active'); });
        var link = linkById[entry.target.id];
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(linkById).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });

    /* ---------- Reveal on scroll ---------- */
    // Stagger cards inside a grid
    $$('.grid .card').forEach(function (card, i) { card.style.setProperty('--d', (i % 6) * 0.08 + 's'); });
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.classList.add('visible');
          reveal.unobserve(el);
          // Drop the stagger delay once revealed so hover effects respond instantly
          setTimeout(function () { el.style.removeProperty('--d'); }, 1200);
        }
      });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(function (el) { reveal.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- Card spotlight (follows the cursor) ---------- */
  $$('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Project filters (built from the tech chips) ---------- */
  (function () {
    var cards = $$('#project-grid .card:not(.more-projects)');
    var techsOf = function (card) {
      return $$('.chips li', card).map(function (li) { return li.textContent.trim(); });
    };
    var all = [];
    cards.forEach(function (c) {
      techsOf(c).forEach(function (t) { if (t && all.indexOf(t) === -1) all.push(t); });
    });
    if (cards.length < 2 || all.length < 2) return; // filters only make sense with 2+ projects

    var box = $('#filters');
    var empty = $('#filter-empty');
    function apply(tag) {
      var shown = 0;
      cards.forEach(function (c) {
        var match = tag === 'All' || techsOf(c).indexOf(tag) !== -1;
        c.hidden = !match;
        if (match) { shown++; c.classList.add('visible'); }
      });
      empty.hidden = shown > 0;
      $$('button', box).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.textContent === tag));
      });
    }
    ['All'].concat(all.sort()).forEach(function (tag) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter-btn';
      b.textContent = tag;
      b.addEventListener('click', function () { apply(tag); });
      box.appendChild(b);
    });
    box.hidden = false;
    apply('All');
  })();

  /* ---------- Copy email ---------- */
  (function () {
    var btn = $('#copy-email');
    if (!btn) return; // pages without a contact block (e.g. notes)
    var link = $('#email-link');
    var status = $('#copy-status');
    var timer;
    function done(ok) {
      btn.textContent = ok ? 'Copied!' : 'Press Ctrl+C';
      btn.classList.toggle('done', ok);
      status.textContent = ok ? 'Email address copied to clipboard' : '';
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('done'); status.textContent = ''; }, 2000);
    }
    btn.addEventListener('click', function () {
      var text = link.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        var range = document.createRange();
        range.selectNodeContents(link);
        var sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
        done(false);
      }
    });
  })();
})();
