/* Search over the notes (index in notes/search-index.json). Works in English and Vietnamese, ignoring accents. */
(function () {
  'use strict';
  var boxes = document.querySelectorAll('.nsearch');
  function lang() { return document.documentElement.getAttribute('data-lang') === 'vi' ? 'vi' : 'en'; }
  function fold(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var data = null, pending = null;
  function load(base) {
    if (data) return Promise.resolve(data);
    if (!pending) pending = fetch(base + 'search-index.json').then(function (r) { return r.json(); }).then(function (j) {
      j.forEach(function (e) { e.f = {}; ['en', 'vi'].forEach(function (l) { e.f[l] = { t: fold(e.t[l]), d: fold(e.d[l]), x: fold(e.x[l]) }; }); });
      data = j; return j;
    });
    return pending;
  }
  function count(h, tok) { var n = 0, i = -1; while ((i = h.indexOf(tok, i + 1)) >= 0 && n < 6) n++; return n; }

  function run(q) {
    var toks = fold(q).split(/\s+/).filter(Boolean), l = lang(), res = [];
    if (!toks.length) return { toks: toks, res: res };
    data.forEach(function (e) {
      var f = e.f[l], all = f.t + ' ' + f.d + ' ' + f.x, score = 0, ok = true;
      toks.forEach(function (k) {
        if (all.indexOf(k) < 0) { ok = false; return; }
        score += (f.t.indexOf(k) >= 0 ? 12 : 0) + (f.d.indexOf(k) >= 0 ? 4 : 0) + count(f.x, k);
      });
      if (ok) res.push({ e: e, score: score });
    });
    res.sort(function (a, b) { return b.score - a.score || a.e.n - b.e.n; });
    return { toks: toks, res: res };
  }
  function mark(text, toks) {
    var f = fold(text), spans = [];
    if (f.length !== text.length) return esc(text);
    toks.forEach(function (k) { var i = -1; while ((i = f.indexOf(k, i + 1)) >= 0) { spans.push([i, i + k.length]); i += k.length - 1; } });
    spans.sort(function (a, b) { return a[0] - b[0]; });
    var out = '', pos = 0;
    spans.forEach(function (s) { if (s[0] < pos) return; out += esc(text.slice(pos, s[0])) + '<mark>' + esc(text.slice(s[0], s[1])) + '</mark>'; pos = s[1]; });
    return out + esc(text.slice(pos));
  }
  function snippet(e, toks, l) {
    var x = e.x[l], f = e.f[l].x, at = -1;
    toks.forEach(function (k) { var i = f.indexOf(k); if (i >= 0 && (at < 0 || i < at)) at = i; });
    if (at < 0 || f.length !== x.length) return mark(e.d[l], toks);
    var a = Math.max(0, at - 50), b = Math.min(x.length, at + 110);
    return (a ? '… ' : '') + mark(x.slice(a, b), toks) + (b < x.length ? ' …' : '');
  }

  boxes.forEach(function (box) {
    var base = box.getAttribute('data-base') || '', input = box.querySelector('.ns-q'), list = box.querySelector('.ns-results'), cur = -1;
    function ph() { input.placeholder = input.getAttribute('data-ph-' + lang()) || 'Search notes…'; }
    ph(); document.addEventListener('langchange', function () { ph(); if (input.value) render(); });

    function render() {
      var q = input.value.trim();
      if (!q) { list.hidden = true; list.innerHTML = ''; return; }
      load(base).then(function () {
        var r = run(q), l = lang();
        if (q !== input.value.trim()) return;
        cur = -1; list.hidden = false;
        if (!r.res.length) { list.innerHTML = '<li class="none">' + (l === 'vi' ? 'Không tìm thấy kết quả.' : 'No results.') + '</li>'; return; }
        list.innerHTML = r.res.slice(0, 12).map(function (x) {
          var e = x.e;
          return '<li><a href="' + base + e.u + '?hl=' + encodeURIComponent(q) + '"><div class="t">' + mark(e.t[l], r.toks) + '<small>' + esc(e.s[l]) + ' · ' + (l === 'vi' ? 'Bài ' : 'Note ') + e.n + '</small></div><div class="sn">' + snippet(e, r.toks, l) + '</div></a></li>';
        }).join('');
      });
    }
    input.addEventListener('input', render);
    input.addEventListener('focus', function () { load(base); });
    input.addEventListener('keydown', function (ev) {
      var items = list.querySelectorAll('a');
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        if (!items.length) return; ev.preventDefault();
        cur = (cur + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach(function (a, i) { a.classList.toggle('sel', i === cur); });
        items[cur].scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'Enter') {
        var t = items[cur >= 0 ? cur : 0]; if (t) { ev.preventDefault(); location.href = t.href; }
      } else if (ev.key === 'Escape') { input.value = ''; render(); input.blur(); }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !ev.ctrlKey && !ev.metaKey) {
        var d = document.getElementById('toc-drawer');
        if (d && d.contains(box) && !d.classList.contains('open')) document.getElementById('toc-btn').click();
        ev.preventDefault(); input.focus();
      }
    });
  });

  // coming from a search result: highlight the first match in the note
  var m = /[?&]hl=([^&]+)/.exec(location.search);
  var art = document.querySelector('article');
  if (m && art) {
    window.addEventListener('load', function () {
      var toks = fold(decodeURIComponent(m[1].replace(/\+/g, ' '))).split(/\s+/).filter(Boolean), w = document.createTreeWalker(art, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) {
        var p = n.parentElement;
        if (!p || p.closest('script, style, .katex, pre') || !(p.offsetParent || p.getClientRects().length)) continue;
        var f = fold(n.nodeValue), hit = -1, len = 0;
        toks.forEach(function (k) { var i = f.indexOf(k); if (i >= 0 && (hit < 0 || i < hit)) { hit = i; len = k.length; } });
        if (hit >= 0 && f.length === n.nodeValue.length) {
          var r = document.createRange(); r.setStart(n, hit); r.setEnd(n, hit + len);
          var mk = document.createElement('mark'); mk.className = 'ns-hit'; r.surroundContents(mk);
          setTimeout(function () { mk.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 150);
          break;
        }
      }
    });
  }
})();
