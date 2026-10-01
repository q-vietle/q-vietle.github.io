/* EN / VI switch for the notes.
   - Prose is written twice in the page: blocks with data-l="en" and data-l="vi" (CSS shows one of them).
   - Labels, captions and buttons inside the interactive figures are translated here, from the
     dictionary in i18n-vi.js (English text -> Vietnamese text), also when a figure redraws itself. */
(function () {
  'use strict';
  var root = document.documentElement, DICT = window.VI_DICT || {}, lang = 'en';
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|PRE|CODE|SVG|CANVAS)$/;

  var NUM = /\d+(?:[.,]\d+)*/g;
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  // exact match first; otherwise numbers are masked as "#" (dictionary keys and values may contain "#", filled back in order)
  function lookup(text) {
    var vi = DICT[text];
    if (vi !== undefined) return vi;
    var nums = text.match(NUM);
    if (!nums) return undefined;
    vi = DICT[text.replace(NUM, '#')];
    if (vi === undefined) return undefined;
    var i = 0;
    return vi.replace(/#/g, function () { return i < nums.length ? nums[i++] : '#'; });
  }
  function tNode(n) {
    if (n.__en === undefined) {
      if (lang !== 'vi') return;
      n.__en = n.nodeValue;
    }
    if (lang !== 'vi') { if (n.nodeValue !== n.__en) n.nodeValue = n.__en; return; }
    var vi = lookup(norm(n.__en));
    if (vi === undefined) return;
    var lead = n.__en.match(/^\s*/)[0], trail = n.__en.match(/\s*$/)[0];
    n.nodeValue = lead + vi + trail;
  }
  function walk(el) {
    if (el.nodeType === 3) { tNode(el); return; }
    if (el.nodeType !== 1 || SKIP.test(el.tagName.toUpperCase()) || (el.classList && (el.classList.contains('katex') || el.classList.contains('sqlcode')))) return;
    for (var c = el.firstChild; c; c = c.nextSibling) walk(c);
  }
  function translateAll() { document.querySelectorAll('.viz, .sqlc').forEach(walk); }

  function setLang(l, save) {
    lang = l === 'vi' ? 'vi' : 'en';
    root.setAttribute('data-lang', lang); root.lang = lang;
    if (save) { try { localStorage.setItem('lang', lang); } catch (e) {} }
    document.querySelectorAll('.lang-switch button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
    var t = document.querySelector('title');
    if (t) {
      if (t.__en === undefined) t.__en = t.textContent;
      t.textContent = lang === 'vi' && t.getAttribute('data-vi') ? t.getAttribute('data-vi') + ' | Quoc Viet Le' : t.__en;
    }
    translateAll();
    document.dispatchEvent(new Event('langchange'));
  }

  document.querySelectorAll('.lang-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang'), true); });
  });

  // figures that redraw their own text (readouts, labels, buttons)
  if (window.MutationObserver) {
    var mo = new MutationObserver(function (list) {
      if (lang !== 'vi') return;
      list.forEach(function (m) { m.addedNodes.forEach(function (n) { walk(n); }); });
    });
    document.querySelectorAll('.viz, .sqlc').forEach(function (f) { mo.observe(f, { childList: true, subtree: true }); });
  }

  var saved = 'en';
  try { saved = localStorage.getItem('lang') === 'vi' ? 'vi' : 'en'; } catch (e) {}
  setLang(saved, false);
})();
