/* Contents drawer: opens from a floating button, lists the series and the headings of the current page (with scroll spy). */
(function () {
  'use strict';
  var drawer = document.getElementById('toc-drawer'), btn = document.getElementById('toc-btn');
  if (!drawer || !btn) return;
  var out = drawer.querySelector('.toc-page'), links = [];

  function setOpen(v) { drawer.classList.toggle('open', v); btn.setAttribute('aria-expanded', String(v)); }
  btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!drawer.classList.contains('open')); });
  document.addEventListener('click', function (e) { if (drawer.classList.contains('open') && !drawer.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  drawer.addEventListener('click', function (e) { if (e.target.closest('.toc-page a')) setOpen(false); });

  function visible(el) { return !!(el.offsetParent || el.getClientRects().length); }
  // text of a heading without the language variants that are currently hidden
  function label(h) {
    var c = h.cloneNode(true);
    for (var i = h.children.length - 1; i >= 0; i--) if (!visible(h.children[i])) c.removeChild(c.children[i]);
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function build() {
    if (!out) return;
    out.innerHTML = ''; links = [];
    document.querySelectorAll(drawer.getAttribute('data-outline') || 'article h2').forEach(function (h, i) {
      if (!visible(h)) return;
      if (!h.id) h.id = 'sec-' + i;
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + h.id; a.textContent = label(h);
      li.appendChild(a); out.appendChild(li); links.push({ el: h, li: li });
    });
    spy();
  }
  function spy() {
    var cur = null;
    links.forEach(function (l) { if (l.el.getBoundingClientRect().top < 140) cur = l; });
    links.forEach(function (l) { l.li.classList.toggle('active', l === cur); });
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; spy(); }); } }, { passive: true });
  document.addEventListener('langchange', function () { requestAnimationFrame(build); });
  build();
  var cur = drawer.querySelector('.toc-series li.current');
  btn.addEventListener('click', function () { if (cur && drawer.classList.contains('open')) cur.scrollIntoView({ block: 'center' }); });
})();
