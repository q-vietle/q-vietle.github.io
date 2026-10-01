/* Shared helpers for the interactive notes: theme-aware colours, crisp canvases, small maths utils.
   Exposes window.Viz. */
(function () {
  'use strict';

  var root = document.documentElement;
  var redraws = [];
  var C = {};

  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  function parse(c) {
    if (c.charAt(0) === '#') {
      if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      var n = parseInt(c.slice(1, 7), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    var m = c.match(/[\d.]+/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
  }

  var NAMES = {
    pos: '--viz-pos', neg: '--viz-neg', mid: '--viz-mid', bg: '--viz-bg', grid: '--viz-grid',
    fwd: '--viz-fwd', grad: '--viz-grad', ink: '--text', muted: '--muted', border: '--border', accent: '--accent'
  };
  function refresh() {
    for (var k in NAMES) { C[k] = cssVar(NAMES[k]) || '#888888'; C[k + 'RGB'] = parse(C[k]); }
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')'; }
  // -1 -> negative colour (blue), 0 -> neutral, +1 -> positive colour (orange)
  function diverge(v) {
    v = clamp(v, -1, 1);
    return mix(C.midRGB, v < 0 ? C.negRGB : C.posRGB, Math.abs(v));
  }

  // Size a canvas to its CSS box at device resolution; returns { ctx, w, h } in CSS pixels.
  function setup(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  // Paint fn(u, v, i, j) -> [-1, 1] over a res x res grid, smoothly scaled into (x, y, w, h).
  var off = document.createElement('canvas'), offCtx = off.getContext('2d');
  function heatmap(ctx, x, y, w, h, res, fn) {
    if (off.width !== res || off.height !== res) { off.width = res; off.height = res; }
    var img = offCtx.createImageData(res, res), d = img.data;
    for (var j = 0; j < res; j++) {
      for (var i = 0; i < res; i++) {
        var c = diverge(fn((i + .5) / res, (j + .5) / res, i, j)), k = (j * res + i) * 4;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
    }
    offCtx.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, x, y, w, h);
    ctx.restore();
  }

  function arrow(ctx, x0, y0, x1, y1, color, width) {
    var a = Math.atan2(y1 - y0, x1 - x0), hl = 8 + (width || 2);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * hl * .6, y1 - Math.sin(a) * hl * .6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - Math.cos(a - .4) * hl, y1 - Math.sin(a - .4) * hl);
    ctx.lineTo(x1 - Math.cos(a + .4) * hl, y1 - Math.sin(a + .4) * hl);
    ctx.closePath(); ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Oblique 3-D box: front face (x, y, w, h), depth d drawn up and to the right.
  function box3d(ctx, x, y, w, h, d, fill, stroke) {
    var dx = d * .7, dy = -d * .45, f = parse(fill);
    ctx.lineWidth = 1.1; ctx.strokeStyle = stroke;
    ctx.fillStyle = rgba(mix(f, [255, 255, 255], .3));
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.lineTo(x + w + dx, y + dy); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(mix(f, [0, 0, 0], .22));
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + dx, y + dy); ctx.lineTo(x + w + dx, y + h + dy); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  }

  // Text with a translucent backing plate, centred on (x, y).
  function tag(ctx, text, x, y, color, font) {
    ctx.font = font || '11px ui-monospace, Consolas, monospace';
    var w = ctx.measureText(text).width + 8, h = 16;
    ctx.fillStyle = rgba(parse(C.bg), .88);
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 4); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + .5);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // Redraw on size change (width only) and on theme change.
  function watch(el, fn) {
    redraws.push(fn);
    if ('ResizeObserver' in window) {
      var lastW = -1;
      var queued = false;
      new ResizeObserver(function () {
        if (el.clientWidth === lastW || queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; lastW = el.clientWidth; fn(); }); // outside the observer callback
      }).observe(el);
    } else {
      window.addEventListener('resize', fn);
      fn();
    }
  }
  function themeChanged() { refresh(); for (var i = 0; i < redraws.length; i++) redraws[i](); }
  new MutationObserver(themeChanged).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', themeChanged);

  // Tracks whether an element is on screen (to pause animations).
  function visibility(el) {
    var state = { on: true };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { state.on = e[0].isIntersecting; }).observe(el);
    }
    return state;
  }

  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randn(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // Fixed decimals, true minus sign, no "-0.00".
  function fmt(x, d) {
    if (d == null) d = 2;
    if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'NaN';
    var s = x.toFixed(d);
    if (+s === 0) s = (0).toFixed(d);
    return s.replace('-', '−');
  }
  // Same, wrapped in parentheses when negative (for substituted formulas).
  function pfmt(x, d) { var s = fmt(x, d); return s.charAt(0) === '−' ? '(' + s + ')' : s; }
  // Short number: 0.5, -1, 0.11
  function short(x) { var s = String(Math.round(x * 100) / 100); return s.replace('-', '−'); }
  function human(n) {
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1) + 'G';
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(0) + 'K';
    return n.toLocaleString('en-US');
  }

  function pointer(e, el) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  var ACT = {
    sigmoid: { f: function (z) { return 1 / (1 + Math.exp(-z)); }, d: function (a) { return a * (1 - a); } },
    tanh:    { f: Math.tanh, d: function (a) { return 1 - a * a; } },
    relu:    { f: function (z) { return z > 0 ? z : 0; }, d: function (a) { return a > 0 ? 1 : 0; } },
    linear:  { f: function (z) { return z; }, d: function () { return 1; } }
  };

  // KaTeX string for widgets (falls back to the raw TeX if KaTeX is unavailable)
  function tex(s, display) {
    s = String(s).replace(/\u2212/g, '-');
    if (!window.katex) return s;
    return window.katex.renderToString(s, { throwOnError: false, displayMode: !!display });
  }

  refresh();

  window.Viz = {
    C: C, refresh: refresh, parse: parse, clamp: clamp, mix: mix, rgba: rgba, diverge: diverge,
    setup: setup, heatmap: heatmap, arrow: arrow, roundRect: roundRect, tag: tag, box3d: box3d,
    watch: watch, visibility: visibility, rng: rng, randn: randn, tex: tex,
    fmt: fmt, pfmt: pfmt, short: short, human: human, pointer: pointer, ACT: ACT,
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
})();
