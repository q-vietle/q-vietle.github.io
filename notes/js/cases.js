/* Widgets for "Case studies: AlexNet and ResNet"
   (Krizhevsky, Sutskever & Hinton, NIPS 2012; He, Zhang, Ren & Sun, arXiv:1512.03385):
   architecture diagrams, local response normalization, data augmentation, dropout, the papers' results,
   a toy reproduction of the degradation problem, and ResNet configurations with parameter counts. */
(function () {
  'use strict';

  var V = window.Viz, C = V.C, fmt = V.fmt, tx = V.tex;
  function texify(html) {
    return String(html)
      .replace(/(\d+(?:\.\d+)?) × 10⁹/g, function (m, a) { return tx(a + ' \\times 10^9'); })
      .replace(/\d+(?:×\d+)+/g, function (m) { return tx(m.split('×').join('\\times ')); })
      .replace(/ → /g, ' ' + tx('\\to') + ' ');
  }
  function $(id) { return document.getElementById(id); }

  /* A drawn test scene (used as the example image for data augmentation and as a diagram icon) */
  var SEM = { sky: '#4cc9f0', grass: '#90be6d', road: '#8d99ae', tree: '#2a9d8f', person: '#e63946', car: '#ffb703' };
  var INST = { tree1: '#2a9d8f', tree2: '#57cc99', person1: '#e63946', person2: '#f72585', car: '#ffb703' };

  function tree(cx, g, sc) {
    return {
      box: [cx - .13 * sc, g - .37 * sc, cx + .13 * sc, g],
      draw: function (ctx, S, flat) {
        ctx.fillStyle = flat || '#7f5539';
        ctx.fillRect((cx - .02 * sc) * S, (g - .2 * sc) * S, .04 * sc * S, .2 * sc * S);
        [[0, -.27, .1], [-.065, -.2, .07], [.065, -.2, .07], [0, -.17, .08]].forEach(function (c, i) {
          ctx.fillStyle = flat || ['#2d6a4f', '#40916c', '#40916c', '#52b788'][i];
          ctx.beginPath(); ctx.arc((cx + c[0] * sc) * S, (g + c[1] * sc) * S, c[2] * sc * S, 0, 7); ctx.fill();
        });
      }
    };
  }

  function person(cx, feet, sc, wave, shirt) {
    var h = .26 * sc;
    function P(dx, dy) { return [cx + dx * h, feet - dy * h]; }
    var k = {
      head: P(0, .92), neck: P(0, .8),
      ls: P(-.13, .77), rs: P(.13, .77),
      le: P(-.2, .6), re: wave ? P(.27, .86) : P(.2, .6),
      lw: P(-.22, .44), rw: wave ? P(.3, 1.02) : P(.22, .44),
      lh: P(-.08, .46), rh: P(.08, .46),
      lk: P(-.09, .24), rk: P(.1, .24),
      la: P(-.1, .02), ra: P(.12, .02)
    };
    var xs = [], ys = [];
    Object.keys(k).forEach(function (n) { xs.push(k[n][0]); ys.push(k[n][1]); });
    return {
      kp: k,
      box: [Math.min.apply(null, xs) - .02 * sc, k.head[1] - .09 * h - .02, Math.max.apply(null, xs) + .02 * sc, feet + .01],
      draw: function (ctx, S, flat) {
        function line(a, b, w, col) { ctx.strokeStyle = flat || col; ctx.lineWidth = w * S; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0] * S, a[1] * S); ctx.lineTo(b[0] * S, b[1] * S); ctx.stroke(); }
        var lw = .075 * h;
        line(k.lh, k.lk, lw, '#264653'); line(k.lk, k.la, lw, '#264653');
        line(k.rh, k.rk, lw, '#264653'); line(k.rk, k.ra, lw, '#264653');
        ctx.fillStyle = flat || shirt;
        ctx.beginPath(); ctx.moveTo(k.ls[0] * S, k.ls[1] * S); ctx.lineTo(k.rs[0] * S, k.rs[1] * S);
        ctx.lineTo(k.rh[0] * S, k.rh[1] * S); ctx.lineTo(k.lh[0] * S, k.lh[1] * S); ctx.closePath(); ctx.fill();
        line(k.ls, k.le, lw * .85, shirt); line(k.le, k.lw, lw * .8, '#e9c46a');
        line(k.rs, k.re, lw * .85, shirt); line(k.re, k.rw, lw * .8, '#e9c46a');
        ctx.fillStyle = flat || '#e9c46a';
        ctx.beginPath(); ctx.arc(k.head[0] * S, k.head[1] * S, .09 * h * S, 0, 7); ctx.fill();
      }
    };
  }

  function car(x0, x1, top, bottom) {
    var w = x1 - x0, hh = bottom - top;
    return {
      box: [x0, top, x1, bottom + .04],
      draw: function (ctx, S, flat) {
        ctx.fillStyle = flat || '#d62828';
        ctx.beginPath();
        ctx.moveTo((x0 + .2 * w) * S, (top + .45 * hh) * S); ctx.lineTo((x0 + .32 * w) * S, top * S);
        ctx.lineTo((x0 + .7 * w) * S, top * S); ctx.lineTo((x0 + .82 * w) * S, (top + .45 * hh) * S); ctx.closePath(); ctx.fill();
        V.roundRect(ctx, x0 * S, (top + .42 * hh) * S, w * S, .5 * hh * S, .02 * S); ctx.fill();
        if (!flat) {
          ctx.fillStyle = '#bde0fe';
          ctx.beginPath(); ctx.moveTo((x0 + .26 * w) * S, (top + .42 * hh) * S); ctx.lineTo((x0 + .35 * w) * S, (top + .07 * hh) * S);
          ctx.lineTo((x0 + .49 * w) * S, (top + .07 * hh) * S); ctx.lineTo((x0 + .49 * w) * S, (top + .42 * hh) * S); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo((x0 + .53 * w) * S, (top + .42 * hh) * S); ctx.lineTo((x0 + .53 * w) * S, (top + .07 * hh) * S);
          ctx.lineTo((x0 + .67 * w) * S, (top + .07 * hh) * S); ctx.lineTo((x0 + .76 * w) * S, (top + .42 * hh) * S); ctx.closePath(); ctx.fill();
        }
        [.22, .78].forEach(function (f) {
          ctx.fillStyle = flat || '#222';
          ctx.beginPath(); ctx.arc((x0 + f * w) * S, bottom * S, .045 * S, 0, 7); ctx.fill();
          if (!flat) { ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc((x0 + f * w) * S, bottom * S, .02 * S, 0, 7); ctx.fill(); }
        });
      }
    };
  }

  var SCENE = [
    { id: 'tree1', cls: 'tree', o: tree(.15, .62, 1) },
    { id: 'tree2', cls: 'tree', o: tree(.885, .62, .85) },
    { id: 'car', cls: 'car', o: car(.47, .83, .62, .8) },
    { id: 'person1', cls: 'person', o: person(.3, .72, 1, true, '#457b9d') },
    { id: 'person2', cls: 'person', o: person(.4, .72, .66, false, '#f4a261') }
  ];

  function drawBackground(ctx, S, flat) {
    if (flat) {
      ctx.fillStyle = SEM.sky; ctx.fillRect(0, 0, S, .58 * S);
      ctx.fillStyle = SEM.grass; ctx.fillRect(0, .58 * S, S, .42 * S);
      ctx.fillStyle = SEM.road; ctx.fillRect(0, .76 * S, S, .16 * S);
      return;
    }
    var g = ctx.createLinearGradient(0, 0, 0, .58 * S);
    g.addColorStop(0, '#74b3e3'); g.addColorStop(1, '#cfe8f7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, .58 * S);
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(.8 * S, .13 * S, .06 * S, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    [[.28, .12, .07], [.34, .1, .05], [.22, .13, .045], [.58, .2, .05], [.63, .19, .04]].forEach(function (c) {
      ctx.beginPath(); ctx.ellipse(c[0] * S, c[1] * S, c[2] * S, c[2] * .6 * S, 0, 0, 7); ctx.fill();
    });
    ctx.fillStyle = '#6a994e'; ctx.fillRect(0, .58 * S, S, .42 * S);
    ctx.fillStyle = '#5b8c42'; ctx.fillRect(0, .58 * S, S, .03 * S);
    ctx.fillStyle = '#6c757d'; ctx.fillRect(0, .76 * S, S, .16 * S);
    ctx.strokeStyle = '#f8f9fa'; ctx.lineWidth = .008 * S; ctx.setLineDash([.05 * S, .04 * S]);
    ctx.beginPath(); ctx.moveTo(0, .88 * S); ctx.lineTo(S, .88 * S); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawScene(ctx, S) {
    drawBackground(ctx, S, false);
    SCENE.forEach(function (it) { it.o.draw(ctx, S, null); });
  }

  function vol(id, c, s, ch, via, info, o) { return ext({ id: id, c: c, t: 'vol', s: s, ch: ch, via: via, i: info }, o); }
  function vec(id, c, n, via, info, o) { return ext({ id: id, c: c, t: 'vec', n: n, via: via, i: info }, o); }
  function tok(id, c, l, via, info, o) { return ext({ id: id, c: c, t: 'tok', l: l, via: via, i: info }, o); }
  function blk(id, c, l, rep, via, info, o) { return ext({ id: id, c: c, t: 'blk', l: l, rep: rep, via: via, i: info }, o); }
  function op(id, c, l, via, info, o) { return ext({ id: id, c: c, t: 'op', l: l, via: via, i: info }, o); }
  function sum(id, c, via, o) { return ext({ id: id, c: c, t: 'sum', l: '+', via: via, i: 'Element-wise addition: the shortcut adds the block\'s input back to its output.' }, o); }
  function ext(a, b) { if (b) for (var k in b) a[k] = b[k]; if (a.r == null) a.r = 0; return a; }

  // Block-diagram viewer: `p` is the id prefix of the figure's elements (p-canvas, p-model, p-info, p-detail ...).
  function makeGallery(p, GALLERY, BLOCKS) {
    var cv = $(p + '-canvas'); if (!cv) return;
    var dv = $(p + '-detail'), dTitle = $(p + '-dtitle'), dWrap = $(p + '-dwrap'), info = $(p + '-info'), dInfo = $(p + '-dinfo'), sel = $(p + '-model');
    var thumb = document.createElement('canvas'), measure = document.createElement('canvas').getContext('2d');
    thumb.width = thumb.height = 96; drawScene(thumb.getContext('2d'), 96);
    var state = { main: null, detail: null, hover: null, dhover: null, open: null };

    function col(k) {
      return { in: C.neg, pool: C.muted, fc: C.pos, out: C.pos, attn: C.grad, norm: C.muted, conv: C.fwd }[k] || C.fwd;
    }
    function textW(t, font) { measure.font = font; return Math.max.apply(null, String(t).split('\n').map(function (s) { return measure.measureText(s).width; })); }
    function lines(ctx, t, x, y, lh) { String(t).split('\n').forEach(function (s, i) { ctx.fillText(s, x, y + i * lh); }); }

    // natural size of every node
    function size(n, spec) {
      var vs = spec.vs || [16, 92];
      if (n.t === 'vol') { var side = vs[0] + vs[1] * Math.sqrt(n.s / (spec.smax || n.s)), th = Math.min(40, 3 + 3.2 * Math.log2(n.ch + 1)); n._side = side; n._th = th; return [th + side * .45 * .7, side + side * .45 * .45]; }
      if (n.t === 'vec') { n._h = Math.min(110, 14 + 9 * Math.log2(n.n + 1)); return [10, n._h]; }
      if (n.t === 'tok') return [40, 64];
      if (n.t === 'blk') return [Math.max(84, textW(n.l, 'bold 11px system-ui') + 26) + 8, 58];
      if (n.t === 'op') return [textW(n.l, '11px system-ui') + 18, 18 + 13 * String(n.l).split('\n').length];
      if (n.t === 'sum') return [24, 24];
      if (n.t === 'img') return [48, 48];
      if (n.t === 'txt') return [textW(n.l, 'italic 11px system-ui') + 16, 26];
      return [30, 30];
    }

    function layout(spec) {
      var byId = {}, cols = {}, rows = {}, edges = [], i;
      spec.nodes.forEach(function (n) { byId[n.id] = n; var s = size(n, spec); n._w = s[0]; n._h2 = s[1]; });
      if (spec.seq) for (i = 1; i < spec.nodes.length; i++) edges.push([spec.nodes[i - 1].id, spec.nodes[i].id, spec.nodes[i].via || '']);
      (spec.edges || []).forEach(function (e) { edges.push(e); });
      (spec.extra || []).forEach(function (e) { edges.push(e); });
      spec.nodes.forEach(function (n) {
        cols[n.c] = Math.max(cols[n.c] || 0, n._w);
        rows[n.r] = Math.max(rows[n.r] || 0, n._h2);
      });
      // gap before each column must fit the labels of edges entering it
      var gapIn = {};
      edges.forEach(function (e) {
        if (e[3] === 'skip' || e[3] === 'dash') return;
        var b = byId[e[1]], w = e[2] ? textW(e[2], '10px system-ui') + 14 : 0;
        gapIn[b.c] = Math.max(gapIn[b.c] || 26, w, 26);
      });
      var maxC = Math.max.apply(null, Object.keys(cols).map(Number)), x = 12, colX = {};
      for (var c = 0; c <= maxC; c++) { if (c > 0) x += gapIn[c] || 26; colX[c] = x; x += cols[c] || 0; }
      var maxRowH = Math.max.apply(null, Object.keys(rows).map(function (k) { return rows[k]; }));
      var rowKeys = Object.keys(rows).map(Number), maxR = Math.max.apply(null, rowKeys), hasSkip = edges.some(function (e) { return e[3] === 'skip'; });
      var top = hasSkip ? 46 : 30, rowGap = maxRowH + (maxR > 0 ? 44 : 0);
      if (maxR >= 3) rowGap = maxRowH * .62 + 30; // U-Net: overlapping staircase
      spec.nodes.forEach(function (n) {
        n._x = colX[n.c] + (cols[n.c] - n._w) / 2;
        n._cy = top + maxRowH / 2 + n.r * rowGap;
        n._y = n._cy - n._h2 / 2;
      });
      return { edges: edges, byId: byId, W: x + 16, H: top + maxRowH + maxR * rowGap + 40 };
    }

    function drawNode(ctx, n, hot) {
      var x = n._x, y = n._y, w = n._w, h = n._h2, colr = col(n.k || (n.t === 'vec' ? 'fc' : n.t === 'blk' ? 'conv' : ''));
      ctx.save();
      if (hot) { ctx.shadowColor = C.accent; ctx.shadowBlur = 10; }
      ctx.textAlign = 'center'; ctx.fillStyle = C.ink;
      if (n.t === 'vol') {
        var d = n._side * .45;
        V.box3d(ctx, x, y + d * .45, n._th, n._side, d, colr, C.ink);
      } else if (n.t === 'vec') {
        ctx.fillStyle = colr; ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
      } else if (n.t === 'tok') {
        for (var r = 0; r < 7; r++) {
          ctx.fillStyle = V.rgba(V.mix(C.midRGB, V.parse(colr), .35 + .5 * ((r * 37) % 7) / 7));
          ctx.fillRect(x, y + r * h / 7, w, h / 7 - 1.5);
        }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
      } else if (n.t === 'blk') {
        w -= 8; // room reserved for the shadow cards
        for (var s = 2; s >= 0; s--) {
          V.roundRect(ctx, x + s * 4, y - s * 4, w, h, 8);
          ctx.fillStyle = s ? V.rgba(V.mix(C.midRGB, V.parse(colr), .25)) : V.rgba(V.mix(C.midRGB, V.parse(colr), .55));
          ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.fillStyle = C.ink; ctx.font = 'bold 11px system-ui, sans-serif';
        var ls = String(n.l).split('\n'); lines(ctx, n.l, x + w / 2, y + h / 2 - (ls.length - 1) * 6.5 + 4, 13);
        if (n.rep) { ctx.font = 'bold 11px ui-monospace, Consolas, monospace'; ctx.fillStyle = C.accent; ctx.fillText(n.rep, x + w - 4, y - 12); }
        if (n.d) { ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = C.muted; ctx.fillText('open ⤢', x + w / 2, y + h - 5); }
      } else if (n.t === 'op') {
        V.roundRect(ctx, x, y, w, h, 7);
        ctx.fillStyle = n.k ? V.rgba(V.mix(C.midRGB, V.parse(colr), .4)) : C.bg; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = C.ink; ctx.font = '11px system-ui, sans-serif';
        var nl = String(n.l).split('\n').length; lines(ctx, n.l, x + w / 2, y + h / 2 - (nl - 1) * 6.5 + 4, 13);
      } else if (n.t === 'sum') {
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 7); ctx.fillStyle = C.bg; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = C.ink; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText('+', x + w / 2, y + h / 2 + 5);
      } else if (n.t === 'img') {
        ctx.drawImage(thumb, x, y, w, h); ctx.strokeStyle = C.ink; ctx.strokeRect(x, y, w, h);
      } else if (n.t === 'txt') {
        V.roundRect(ctx, x, y, w, h, 6); ctx.fillStyle = C.bg; ctx.fill(); ctx.setLineDash([4, 3]); ctx.strokeStyle = C.ink; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.ink; ctx.font = 'italic 11px system-ui, sans-serif'; ctx.fillText(n.l, x + w / 2, y + h / 2 + 4);
      }
      ctx.restore();
      // caption under shape-like nodes
      var cap = n.l && (n.t === 'vol' || n.t === 'vec' || n.t === 'tok' || n.t === 'img') ? n.l : null;
      if (!cap && n.t === 'vol') cap = n.s + '×' + n.s + '×' + n.ch;
      if (!cap && n.t === 'vec') cap = String(n.n);
      if (cap) {
        ctx.fillStyle = hot ? C.ink : C.muted; ctx.font = (hot ? 'bold ' : '') + '10px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
        lines(ctx, cap, x + w / 2, y + h + 13, 11);
      }
      ctx.textAlign = 'left';
    }

    function drawEdge(ctx, a, b, label, kind) {
      ctx.strokeStyle = V.rgba(C.inkRGB, .45); ctx.fillStyle = C.muted; ctx.lineWidth = 1.3;
      if (kind === 'skip') {
        var ax = a._x + a._w / 2, bx = b._x + b._w / 2, ty = Math.min(a._y, b._y) - 22;
        ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(ax, a._y); ctx.bezierCurveTo(ax, ty, bx, ty, bx, b._y - 2); ctx.stroke();
        V.arrow(ctx, bx, b._y - 10, bx, b._y - 1, C.accent, 1.6);
        if (label) { ctx.fillStyle = C.accent; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, (ax + bx) / 2, ty + 4); ctx.textAlign = 'left'; }
        return;
      }
      var x0, y0, x1, y1;
      if (a.c === b.c) { // vertical (e.g. text encoder feeding the U-Net)
        x0 = a._x + a._w / 2; x1 = b._x + b._w / 2;
        if (a._cy > b._cy) { y0 = a._y; y1 = b._y + b._h2; } else { y0 = a._y + a._h2; y1 = b._y; }
      } else { x0 = a._x + a._w; y0 = a._cy; x1 = b._x; y1 = b._cy; }
      if (kind === 'dash') { ctx.setLineDash([5, 4]); ctx.strokeStyle = C.muted; }
      V.arrow(ctx, x0 + 2, y0, x1 - 2, y1, kind === 'dash' ? C.muted : V.rgba(C.inkRGB, .45), 1.3);
      ctx.setLineDash([]);
      if (label) {
        ctx.fillStyle = C.muted; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
        var ls = label.split('\n'), mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 6 - (ls.length - 1) * 11;
        if (a.c === b.c) { mx += 6; ctx.textAlign = 'left'; my = (y0 + y1) / 2; }
        else if (Math.abs(y1 - y0) > 20) { my = (y0 + y1) / 2; ctx.textAlign = y1 > y0 ? 'left' : 'right'; mx += y1 > y0 ? 8 : -8; }
        if (kind === 'dash') my = y0 - 6;
        lines(ctx, label, mx, my, 11); ctx.textAlign = 'left';
      }
    }

    function render(canvas, wrap, spec, which) {
      // slightly-too-wide diagrams are scaled to fit; much wider ones scroll
      var L = layout(spec), avail = wrap.clientWidth, k = L.W > avail && avail / L.W > .7 ? avail / L.W : 1;
      canvas.style.width = Math.max(avail, L.W * k) + 'px'; canvas.style.height = L.H * k + 'px';
      var S = V.setup(canvas), ctx = S.ctx, off = Math.max(0, (S.w - L.W * k) / 2);
      ctx.save(); ctx.translate(off, 0); ctx.scale(k, k);
      L.edges.forEach(function (e) { drawEdge(ctx, L.byId[e[0]], L.byId[e[1]], e[2], e[3]); });
      spec.nodes.forEach(function (n) { drawNode(ctx, n, state[which] === n.id || (which === 'hover' && state.open === n.id)); });
      ctx.restore();
      state[which === 'hover' ? 'main' : 'detail'] = { spec: spec, off: off, k: k };
    }

    function hit(canvas, e, which) {
      var st = state[which]; if (!st) return null;
      var p = V.pointer(e, canvas), x = (p.x - st.off) / st.k, y = p.y / st.k, found = null;
      st.spec.nodes.forEach(function (n) { if (x >= n._x - 4 && x <= n._x + n._w + 4 && y >= n._y - 10 && y <= n._y + n._h2 + 4) found = n; });
      return found;
    }

    function spec() { return GALLERY[sel.value]; }
    function showInfo(n) { info.innerHTML = texify(n && n.i ? '<p>' + n.i + (n.d ? ' <b>Click to open it.</b>' : '') + '</p>' : '<p>' + spec().summary + '</p>'); }
    function drawMain() { render(cv, $(p + '-wrap'), spec(), 'hover'); }
    function drawDetail() {
      if (!state.open) { dWrap.hidden = true; return; }
      var n = spec().nodes.filter(function (x) { return x.id === state.open; })[0], D = BLOCKS[n.d];
      dWrap.hidden = false; dTitle.textContent = D.title || 'Inside';
      if (!state.dnode || state.dnode.id === undefined) dInfo.innerHTML = texify('<p>' + D.summary + '</p>');
      render(dv, dWrap.querySelector('.hscroll'), D, 'dhover');
    }
    function openFirst() {
      var d = spec().nodes.filter(function (n) { return n.d; })[0];
      state.open = d ? d.id : null; state.dnode = null;
    }

    cv.addEventListener('pointermove', function (e) {
      var n = hit(cv, e, 'main'), id = n ? n.id : null;
      if (id !== state.hover) { state.hover = id; showInfo(n); drawMain(); cv.style.cursor = n && n.d ? 'pointer' : ''; }
    });
    cv.addEventListener('pointerleave', function () { state.hover = null; showInfo(null); drawMain(); });
    cv.addEventListener('click', function (e) { var n = hit(cv, e, 'main'); if (n && n.d) { state.open = n.id; state.dnode = null; drawMain(); drawDetail(); } });
    dv.addEventListener('pointermove', function (e) {
      var n = hit(dv, e, 'detail'), id = n ? n.id : null;
      if (id !== state.dhover) {
        state.dhover = id; state.dnode = n;
        var D = BLOCKS[spec().nodes.filter(function (x) { return x.id === state.open; })[0].d];
        dInfo.innerHTML = texify('<p>' + (n && n.i ? n.i : D.summary) + '</p>');
        render(dv, dWrap.querySelector('.hscroll'), D, 'dhover');
      }
    });
    sel.addEventListener('change', function () { state.hover = null; openFirst(); showInfo(null); drawMain(); drawDetail(); });

    openFirst(); showInfo(null);
    V.watch(cv.parentElement, function () { drawMain(); drawDetail(); });
  }

  /* ================================================================
     Architecture specs
     ================================================================ */
  function gpuPair(prefix, c, s, ch, infoA, o) {
    return [vol(prefix + 'a', c, s, ch, '', infoA + ' (GPU 1)', ext({ r: 0, l: s + '×' + s + '×' + ch }, o)),
            vol(prefix + 'b', c, s, ch, '', infoA + ' (GPU 2)', ext({ r: 1, l: s + '×' + s + '×' + ch }, o))];
  }
  var ALEX = {
    title: 'AlexNet', smax: 224, vs: [14, 70],
    summary: '<b>AlexNet</b> (Krizhevsky, Sutskever &amp; Hinton, 2012): eight learned layers, five convolutional and three fully connected, split across two GTX 580 GPUs. ' +
             'Each GPU holds half of the kernels of every layer. The GPUs communicate only at conv3 and at the fully connected layers (crossing edges). About 60 million parameters and 650,000 neurons. Hover a block for details.',
    nodes: [].concat(
      [vol('in', 0, 224, 3, '', 'Input: 224×224×3 RGB patch, the mean image subtracted. (The paper states 224; the layer arithmetic works out for 227.)', { k: 'in', r: .5 })],
      gpuPair('c1', 1, 55, 48, 'Conv1: 48 of the 96 kernels of size 11×11×3, stride 4 (the distance between neighbouring receptive-field centres), then ReLU, response normalization and max pooling'),
      gpuPair('c2', 2, 27, 128, 'Conv2: 128 of the 256 kernels of size 5×5×48; each kernel sees only the 48 maps on its own GPU. Then ReLU, response normalization and max pooling'),
      gpuPair('c3', 3, 13, 192, 'Conv3: 192 of the 384 kernels of size 3×3×256, connected to all 256 conv2 maps on both GPUs'),
      gpuPair('c4', 4, 13, 192, 'Conv4: 192 of the 384 kernels of size 3×3×192, same-GPU inputs only, no pooling or normalization in between'),
      gpuPair('c5', 5, 13, 128, 'Conv5: 128 of the 256 kernels of size 3×3×192, then max pooling to 6×6'),
      [vec('f6a', 6, 2048, '', 'FC6: 2,048 of the 4,096 neurons, each connected to all 9,216 pooled conv5 outputs of both GPUs. Dropout 0.5 (GPU 1).', { r: 0 }),
       vec('f6b', 6, 2048, '', 'FC6 (GPU 2).', { r: 1 }),
       vec('f7a', 7, 2048, '', 'FC7: 4,096 neurons in total, dropout 0.5 (GPU 1).', { r: 0 }),
       vec('f7b', 7, 2048, '', 'FC7 (GPU 2).', { r: 1 }),
       vec('out', 8, 1000, '', 'FC8 feeding a 1000-way softmax over the ILSVRC classes.', { k: 'out', r: .5 })]),
    edges: [['in', 'c1a'], ['in', 'c1b'], ['c1a', 'c2a', 'norm, pool\nconv 5×5'], ['c1b', 'c2b'],
            ['c2a', 'c3a', 'norm, pool\nconv 3×3'], ['c2a', 'c3b'], ['c2b', 'c3a'], ['c2b', 'c3b'],
            ['c3a', 'c4a', 'conv 3×3'], ['c3b', 'c4b'], ['c4a', 'c5a', 'conv 3×3'], ['c4b', 'c5b'],
            ['c5a', 'f6a', 'pool\nFC'], ['c5a', 'f6b'], ['c5b', 'f6a'], ['c5b', 'f6b'],
            ['f6a', 'f7a', 'FC'], ['f6a', 'f7b'], ['f6b', 'f7a'], ['f6b', 'f7b'], ['f7a', 'out'], ['f7b', 'out']]
  };

  var RN_BLOCKS = {
    basic: {
      title: 'Residual building block (figure 2 / figure 5, left)', seq: true,
      summary: 'Two 3×3 convolutions learn a residual ' + tx('F(x) = W_2\\,\\sigma(W_1 x)') + '; the shortcut adds ' + tx('x') + ' back and ReLU follows the addition: ' + tx('y = \\sigma\\big(F(x, \\{W_i\\}) + x\\big)') + '. The identity shortcut adds no parameters and no computation. Used in ResNet-18 and ResNet-34.',
      nodes: [op('i', 0, 'x\n56×56×64'), op('c1', 1, '3×3 conv, 64', '', 'BN is applied right after each convolution and before the activation.', { k: 'conv' }), op('n1', 2, 'BN, ReLU', '', '', { k: 'norm' }),
              op('c2', 3, '3×3 conv, 64', '', '', { k: 'conv' }), op('n2', 4, 'BN', '', '', { k: 'norm' }), sum('a', 5), op('r', 6, 'ReLU'), op('o', 7, 'y\n56×56×64')],
      extra: [['i', 'a', 'identity shortcut x', 'skip']]
    },
    bottleneck: {
      title: 'Bottleneck building block (figure 5, right)', seq: true,
      summary: 'For the deeper nets (50, 101, 152 layers) each residual function has three layers: a 1×1 convolution that reduces 256 → 64 dimensions, a 3×3 convolution working on the smaller tensor, and a 1×1 convolution that restores 256. It has about the same time complexity as the two-layer block on 64-d maps. The parameter-free identity shortcut matters here: a projection shortcut would connect the two 256-d ends and double the block\'s time and size.',
      nodes: [op('i', 0, 'x\n56×56×256'), op('c1', 1, '1×1 conv, 64', '', 'Reduce the dimension.', { k: 'conv' }), op('n1', 2, 'BN, ReLU', '', '', { k: 'norm' }),
              op('c2', 3, '3×3 conv, 64', '', 'The 3×3 layer is the "bottleneck", with small input and output dimensions.', { k: 'conv' }), op('n2', 4, 'BN, ReLU', '', '', { k: 'norm' }),
              op('c3', 5, '1×1 conv, 256', '', 'Restore the dimension.', { k: 'conv' }), op('n3', 6, 'BN', '', '', { k: 'norm' }), sum('a', 7), op('r', 8, 'ReLU'), op('o', 9, 'y\n56×56×256')],
      extra: [['i', 'a', 'identity shortcut x', 'skip']]
    },
    plainpair: {
      title: 'Two layers of the plain network', seq: true,
      summary: 'The plain baseline stacks the same 3×3 convolutions with no shortcut. Its layers must fit the desired mapping ' + tx('H(x)') + ' directly rather than the residual ' + tx('H(x) - x') + '.',
      nodes: [op('i', 0, 'x'), op('c1', 1, '3×3 conv', '', '', { k: 'conv' }), op('n1', 2, 'BN, ReLU', '', '', { k: 'norm' }),
              op('c2', 3, '3×3 conv', '', '', { k: 'conv' }), op('n2', 4, 'BN, ReLU', '', '', { k: 'norm' }), op('o', 5, 'H(x)')]
    },
    vggblock: {
      title: 'A VGG stage', seq: true,
      summary: 'Two or four 3×3 convolutions with ReLU at the same resolution, then 2×2 max pooling.',
      nodes: [op('i', 0, 'input'), op('c1', 1, '3×3 conv\n+ ReLU', '', '', { k: 'conv' }), op('c2', 2, '3×3 conv\n+ ReLU', '', '', { k: 'conv' }),
              op('c3', 3, '(×2 more in\nstages 3–5)', '', '', { k: 'conv' }), op('p', 4, 'max pool 2×2', '', '', { k: 'pool' }), op('o', 5, 'output')]
    }
  };

  // Parameter count for ResNets (convolutions without biases, 2 BN parameters per channel, projection shortcuts where
  // dimensions increase, i.e. option B) and for the corresponding plain nets (no shortcuts).
  var RN_CFG = { 18: [[2, 2, 2, 2], 'basic', 1.8], 34: [[3, 4, 6, 3], 'basic', 3.6], 50: [[3, 4, 6, 3], 'bottleneck', 3.8], 101: [[3, 4, 23, 3], 'bottleneck', 7.6], 152: [[3, 8, 36, 3], 'bottleneck', 11.3] };
  function resnetParams(depth, plain) {
    var cfg = RN_CFG[depth], exp = cfg[1] === 'bottleneck' ? 4 : 1, widths = [64, 128, 256, 512], P = 0;
    function conv(k, a, b) { P += k * k * a * b + 2 * b; }
    conv(7, 3, 64);
    var cin = 64;
    cfg[0].forEach(function (nb, s) {
      var w = widths[s];
      for (var b = 0; b < nb; b++) {
        if (cfg[1] === 'basic') { conv(3, cin, w); conv(3, w, w); }
        else { conv(1, cin, w); conv(3, w, w); conv(1, w, w * exp); }
        if (!plain && cin !== w * exp) conv(1, cin, w * exp);
        cin = w * exp;
      }
    });
    P += cin * 1000 + 1000;
    return P;
  }
  function resnetSpec(depth, plain) {
    var cfg = RN_CFG[depth], type = cfg[1], exp = type === 'bottleneck' ? 4 : 1, sizes = [56, 28, 14, 7], widths = [64, 128, 256, 512];
    var names = ['conv2_x', 'conv3_x', 'conv4_x', 'conv5_x'], c = 3, P = resnetParams(depth, plain);
    var nodes = [vol('in', 0, 224, 3, '', '224×224 crop of the image or its horizontal flip, per-pixel mean subtracted.', { k: 'in' }),
                 vol('c1', 1, 112, 64, '7×7 conv, 64\nstride 2', 'conv1: 7×7, 64 filters, stride 2 → 112×112.'),
                 vol('p1', 2, 56, 64, '3×3 max pool\nstride 2', '', { k: 'pool' })];
    cfg[0].forEach(function (nb, s) {
      var lbl = (plain ? 'plain ' : '') + (type === 'basic' ? (plain ? 'layers' : 'basic\nblock') : 'bottleneck\nblock');
      nodes.push(blk('s' + s, c++, lbl, '×' + nb, '',
        '<b>' + names[s] + '</b>: ' + nb + ' blocks on ' + sizes[s] + '×' + sizes[s] + ' maps, ' + widths[s] * exp + ' output channels.' +
        (s ? ' Its first block uses stride 2 to halve the resolution' + (plain ? '' : '; the shortcut then needs to increase dimensions (zero padding in option A, a 1×1 projection in option B)') + '.' : ''),
        { d: plain ? 'plainpair' : type }));
      nodes.push(vol('v' + s, c++, sizes[s], widths[s] * exp, '', ''));
    });
    nodes.push(vec('gap', c++, widths[3] * exp, 'global\navg pool', ''));
    nodes.push(vec('fc', c, 1000, '1000-d FC\nsoftmax', '', { k: 'out' }));
    return {
      title: (plain ? 'plain-' : 'ResNet-') + depth, smax: 224, seq: true, vs: [12, 70], nodes: nodes,
      summary: '<b>' + (plain ? depth + '-layer plain network' : 'ResNet-' + depth) + '</b>: blocks per stage ' + cfg[0].join(', ') + ', ' +
               (type === 'basic' ? 'two-layer' : 'three-layer bottleneck') + ' blocks. <b>' + cfg[2] + ' × 10⁹ FLOPs</b> (multiply-adds, Table 1). ' +
               '<b>' + (P / 1e6).toFixed(1) + 'M parameters</b> by our count' + (plain ? '' : ' with projection shortcuts where dimensions increase (option B)') + '.' +
               (plain ? ' Same layers as the ResNet but without shortcut connections.' : ' Click a stage to open its block.')
    };
  }
  var VGG19 = (function () {
    var P = 0, cin = 3;
    [[64, 2], [128, 2], [256, 4], [512, 4], [512, 4]].forEach(function (st) { for (var i = 0; i < st[1]; i++) { P += 9 * cin * st[0] + st[0]; cin = st[0]; } });
    P += 25088 * 4096 + 4096 + 4096 * 4096 + 4096 + 4096 * 1000 + 1000;
    return {
      title: 'VGG-19', smax: 224, seq: true, vs: [12, 70],
      summary: '<b>VGG-19</b>, the reference in figure 3 of the ResNet paper: only 3×3 convolutions and 2×2 pooling, then three fully connected layers. <b>19.6 × 10⁹ FLOPs</b>, ' +
               '<b>' + (P / 1e6).toFixed(1) + 'M parameters</b> by our count. The 34-layer plain and residual nets need only 18% of its FLOPs.',
      nodes: [vol('in', 0, 224, 3, '', '', { k: 'in' }), vol('b1', 1, 224, 64, '3×3 conv ×2\n64', '', { d: 'vggblock' }), vol('b2', 2, 112, 128, 'pool, conv ×2\n128', '', { d: 'vggblock' }),
              vol('b3', 3, 56, 256, 'pool, conv ×4\n256', '', { d: 'vggblock' }), vol('b4', 4, 28, 512, 'pool, conv ×4\n512', '', { d: 'vggblock' }),
              vol('b5', 5, 14, 512, 'pool, conv ×4\n512', '', { d: 'vggblock' }), vol('p5', 6, 7, 512, 'pool', '', { k: 'pool' }),
              vec('f6', 7, 4096, 'FC 4096', ''), vec('f7', 8, 4096, 'FC 4096', ''), vec('f8', 9, 1000, 'FC 1000\nsoftmax', '', { k: 'out' })]
    };
  })();

  makeGallery('ax', { alexnet: ALEX }, RN_BLOCKS);
  makeGallery('rn', {
    vgg19: VGG19, plain34: resnetSpec(34, true), res18: resnetSpec(18), res34: resnetSpec(34), res50: resnetSpec(50), res101: resnetSpec(101), res152: resnetSpec(152)
  }, RN_BLOCKS);
  window.__resnetParams = resnetParams; // exposed for the notes' tests

  /* ================================================================
     AlexNet 3.3  Local response normalization
     ================================================================ */
  (function lrn() {
    var cv = $('lrn-canvas'); if (!cv) return;
    var ids = ['k', 'n', 'a', 'b', 'scale'], el = {}, read = $('lrn-read'), btn = $('lrn-resample'), N = 16, seed = 5, raw = [], pick = 7;
    ids.forEach(function (id) { el[id] = $('lrn-' + id); });
    function sample() { var r = V.rng(seed); raw = []; for (var i = 0; i < N; i++) raw.push(Math.max(0, V.randn(r) * .6 + (i === 7 ? 2.2 : .3))); }
    function params() { return { k: +el.k.value, n: +el.n.value, alpha: Math.pow(10, +el.a.value), beta: +el.b.value, s: +el.scale.value }; }
    function norm(a, P) {
      return a.map(function (v, i) {
        var lo = Math.max(0, i - Math.floor(P.n / 2)), hi = Math.min(N - 1, i + Math.floor(P.n / 2)), s = 0;
        for (var j = lo; j <= hi; j++) s += a[j] * a[j];
        return { b: v / Math.pow(P.k + P.alpha * s, P.beta), lo: lo, hi: hi, sum: s };
      });
    }
    function draw() {
      var P = params(), a = raw.map(function (v) { return v * P.s; }), B = norm(a, P);
      $('lrn-ko').textContent = fmt(P.k, 1); $('lrn-no').textContent = P.n; $('lrn-ao').textContent = P.alpha.toExponential(0).replace('-', '−');
      $('lrn-bo').textContent = fmt(P.beta, 2); $('lrn-scaleo').textContent = fmt(P.s, 0);
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, bw = (W - 40) / N, mx = 1e-9;
      a.forEach(function (v, i) { mx = Math.max(mx, v, B[i].b); });
      var sel = B[pick];
      ctx.fillStyle = V.rgba(C.accentRGB, .08); ctx.fillRect(20 + sel.lo * bw, 6, (sel.hi - sel.lo + 1) * bw, H - 30);
      a.forEach(function (v, i) {
        var x = 20 + i * bw, h1 = v / mx * (H - 44), h2 = B[i].b / mx * (H - 44);
        ctx.fillStyle = V.rgba(C.mutedRGB, .35); ctx.fillRect(x + 3, H - 24 - h1, bw / 2 - 3, h1);
        ctx.fillStyle = i === pick ? C.grad : C.accent; ctx.fillRect(x + bw / 2, H - 24 - h2, bw / 2 - 3, h2);
        ctx.fillStyle = C.muted; ctx.font = '10px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(String(i), x + bw / 2, H - 10); ctx.textAlign = 'left';
      });
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText('kernel map index i (click a bar to pick a map)', 20, 16);
      var ae = P.alpha.toExponential(0).split('e'), aTex = ae[0] + '\\times 10^{' + (+ae[1]) + '}';
      read.innerHTML = tx('b_{' + pick + '} = \\dfrac{a_{' + pick + '}}{\\big(k + \\alpha \\sum_{j=' + sel.lo + '}^{' + sel.hi + '} a_j^2\\big)^{\\beta}} = \\dfrac{' + fmt(a[pick], 2) + '}{(' + fmt(P.k, 1) + ' + ' + aTex + ' \\cdot ' + fmt(sel.sum, 1) + ')^{' + fmt(P.beta, 2) + '}} = \\mathbf{' + fmt(sel.b, 3) + '}', true) +
        'Grey: activity ' + tx('a') + ' after ReLU; coloured: response-normalized ' + tx('b') + '. A large activity in one map suppresses its neighbours across maps at the same position (lateral inhibition).';
      cv._bw = bw;
    }
    cv.addEventListener('pointerdown', function (e) { var p = V.pointer(e, cv), i = Math.floor((p.x - 20) / cv._bw); if (i >= 0 && i < N) { pick = i; draw(); } });
    ids.forEach(function (id) { el[id].addEventListener('input', draw); });
    btn.addEventListener('click', function () { seed++; sample(); draw(); });
    sample();
    V.watch(cv, draw);
  })();

  /* ================================================================
     AlexNet 4.1  Data augmentation: random crops, flips, PCA colour
     ================================================================ */
  (function augment() {
    var cvS = $('ag-src'); if (!cvS) return;
    var cvO = $('ag-out'), read = $('ag-read'), btnCrop = $('ag-crop'), flipChk = $('ag-flip'), btnTest = $('ag-test'), btnColor = $('ag-color'), exSel = $('ag-ex');
    var SRC = 256, CROP = 224, src = document.createElement('canvas'), pix, eig, crop = { x: 16, y: 16 }, alpha = [0, 0, 0], testMode = false, r = V.rng(11);
    src.width = src.height = SRC;
    drawScene(src.getContext('2d'), SRC);
    pix = src.getContext('2d').getImageData(0, 0, SRC, SRC);

    // PCA of the RGB values (in [0, 1]) over all pixels: 3×3 covariance, Jacobi eigen-decomposition
    (function pca() {
      var d = pix.data, n = SRC * SRC, m = [0, 0, 0], Cv = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], i, j, k;
      for (i = 0; i < n; i++) for (j = 0; j < 3; j++) m[j] += d[i * 4 + j] / 255 / n;
      for (i = 0; i < n; i++) for (j = 0; j < 3; j++) for (k = 0; k < 3; k++) Cv[j][k] += (d[i * 4 + j] / 255 - m[j]) * (d[i * 4 + k] / 255 - m[k]) / n;
      var A = Cv.map(function (row) { return row.slice(); }), Vm = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      for (var sweep = 0; sweep < 30; sweep++) for (var p = 0; p < 2; p++) for (var q = p + 1; q < 3; q++) {
        if (Math.abs(A[p][q]) < 1e-12) continue;
        var th = .5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]), c = Math.cos(th), s = Math.sin(th);
        for (k = 0; k < 3; k++) { var akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
        for (k = 0; k < 3; k++) { var apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
        for (k = 0; k < 3; k++) { var vkp = Vm[k][p], vkq = Vm[k][q]; Vm[k][p] = c * vkp - s * vkq; Vm[k][q] = s * vkp + c * vkq; }
      }
      eig = [0, 1, 2].map(function (t) { return { l: A[t][t], p: [Vm[0][t], Vm[1][t], Vm[2][t]] }; }).sort(function (a, b) { return b.l - a.l; });
    })();

    function shifted() { // Σ αᵢ λᵢ pᵢ added to every pixel, optionally exaggerated for visibility
      var ex = +exSel.value, add = [0, 0, 0];
      eig.forEach(function (e, t) { for (var c = 0; c < 3; c++) add[c] += alpha[t] * e.l * e.p[c] * ex; });
      return add;
    }
    function draw() {
      var S = V.setup(cvS), ctx = S.ctx, W = S.w, sc = W / SRC;
      ctx.drawImage(src, 0, 0, W, W);
      var boxes = testMode ? [[0, 0], [32, 0], [0, 32], [32, 32], [16, 16]] : [[crop.x, crop.y]];
      boxes.forEach(function (b, i) {
        ctx.strokeStyle = testMode ? ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#ffffff'][i] : '#ffffff'; ctx.lineWidth = 2.5;
        ctx.strokeRect(b[0] * sc + 1, b[1] * sc + 1, CROP * sc - 2, CROP * sc - 2);
      });
      // the network's input: the crop, maybe flipped, plus the colour shift
      var O = V.setup(cvO), octx = O.ctx, w = O.w, add = shifted(), tmp = document.createElement('canvas');
      tmp.width = tmp.height = CROP;
      var tctx = tmp.getContext('2d'), img = tctx.createImageData(CROP, CROP), d = img.data, s = pix.data;
      for (var y = 0; y < CROP; y++) for (var x = 0; x < CROP; x++) {
        var sx = crop.x + (flipChk.checked ? CROP - 1 - x : x), si = ((crop.y + y) * SRC + sx) * 4, di = (y * CROP + x) * 4;
        for (var c = 0; c < 3; c++) d[di + c] = V.clamp(s[si + c] + add[c] * 255, 0, 255);
        d[di + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      octx.drawImage(tmp, 0, 0, w, w);
      read.innerHTML = 'Crop offset (' + crop.x + ', ' + crop.y + ')' + (flipChk.checked ? ', horizontally flipped' : '') + '. There are ' + tx('32 \\times 32 \\text{ offsets} \\times 2 \\text{ flips} = 2{,}048') + ' versions of every training image (highly inter-dependent).<br>' +
        'PCA of this image\'s RGB values: ' + tx('\\lambda = (' + eig.map(function (e) { var q = e.l.toExponential(1).split('e'); return q[0] + '\\times 10^{' + (+q[1]) + '}'; }).join(',\\ ') + ')') +
        ', ' + tx('\\alpha = (' + alpha.map(function (a) { return fmt(a, 3); }).join(',\\ ') + ')') + ', shift added to every pixel ' + tx('\\textstyle\\sum_i \\alpha_i \\lambda_i p_i = (' + add.map(function (v) { return fmt(v, 4); }).join(',\\ ') + ')') +
        (+exSel.value > 1 ? ' <b class="g">(exaggerated ' + tx('\\times' + exSel.value) + ' for visibility)</b>' : '') + '.' +
        (testMode ? '<br>Test time: the five ' + tx('224 \\times 224') + ' patches (four corners and centre) and their flips, ten in all; the softmax outputs are averaged.' : '');
    }
    btnCrop.addEventListener('click', function () { testMode = false; crop = { x: Math.floor(r() * 32), y: Math.floor(r() * 32) }; flipChk.checked = r() < .5; draw(); });
    btnColor.addEventListener('click', function () { alpha = [0, 1, 2].map(function () { return V.randn(r) * .1; }); draw(); });
    btnTest.addEventListener('click', function () { testMode = !testMode; draw(); });
    [flipChk, exSel].forEach(function (x) { x.addEventListener('change', draw); });
    V.watch(cvS, draw);
  })();

  /* ================================================================
     AlexNet 4.2  Dropout
     ================================================================ */
  (function dropout() {
    var cv = $('do-canvas'); if (!cv) return;
    var btnSample = $('do-sample'), btnPlay = $('do-play'), testChk = $('do-test'), read = $('do-read');
    var LAYERS = [5, 8, 8, 3], mask = [], r = V.rng(3), count = 0, timer = null;
    function resample() { mask = LAYERS.map(function (n, l) { return Array.apply(null, Array(n)).map(function () { return l === 1 || l === 2 ? r() >= .5 : true; }); }); count++; }
    function draw() {
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, test = testChk.checked, gx = (W - 80) / (LAYERS.length - 1), rad = 12;
      var pos = LAYERS.map(function (n, l) { return Array.apply(null, Array(n)).map(function (_, i) { return [40 + l * gx, 20 + (i + .5) * (H - 40) / n]; }); });
      for (var l = 1; l < LAYERS.length; l++) pos[l].forEach(function (b, j) {
        pos[l - 1].forEach(function (a, i) {
          var live = test || (mask[l - 1][i] && mask[l][j]);
          ctx.strokeStyle = live ? V.rgba(C.inkRGB, .35) : V.rgba(C.inkRGB, .04); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        });
      });
      pos.forEach(function (col, l) {
        col.forEach(function (p, i) {
          var on = test || mask[l][i];
          ctx.fillStyle = on ? (l === 0 ? C.neg : l === LAYERS.length - 1 ? C.pos : C.fwd) : C.mid;
          ctx.strokeStyle = on ? C.ink : V.rgba(C.inkRGB, .3); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(p[0], p[1], rad, 0, 7); ctx.fill(); ctx.stroke();
          if (!on) { ctx.strokeStyle = C.grad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p[0] - 6, p[1] - 6); ctx.lineTo(p[0] + 6, p[1] + 6); ctx.moveTo(p[0] + 6, p[1] - 6); ctx.lineTo(p[0] - 6, p[1] + 6); ctx.stroke(); }
          if (test && (l === 1 || l === 2)) { ctx.fillStyle = C.ink; ctx.font = '9px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('×½', p[0], p[1] + 3); ctx.textAlign = 'left'; }
        });
      });
      var kept = mask[1].concat(mask[2]).filter(Boolean).length;
      read.innerHTML = test
        ? 'Test time: all neurons are used, but the outputs of the dropout layers are multiplied by 0.5. This approximates the geometric mean of the predictions of the exponentially many thinned networks.'
        : 'Training pass #' + count + ': each hidden neuron was dropped with probability 0.5; ' + kept + ' of 16 survive. Dropped neurons take no part in the forward pass or in back-propagation. ' +
          'With 16 droppable neurons there are ' + tx('2^{16} = 65{,}536') + ' possible sub-networks, all sharing the same weights.';
    }
    btnSample.addEventListener('click', function () { testChk.checked = false; resample(); draw(); });
    btnPlay.addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; btnPlay.textContent = 'Auto'; return; }
      testChk.checked = false; btnPlay.textContent = 'Stop';
      timer = setInterval(function () { resample(); draw(); }, 700);
    });
    testChk.addEventListener('change', draw);
    resample();
    V.watch(cv, draw);
  })();

  /* ================================================================
     Result tables from the two papers, as bar charts
     ================================================================ */
  var RESULTS = {
    alex2010: { title: 'ILSVRC-2010 test set (AlexNet Table 1), error %', unit: '%', groups: ['top-1', 'top-5'], rows: [
      ['Sparse coding (2010 winner)', 47.1, 28.2, 0], ['SIFT + Fisher Vectors', 45.7, 25.7, 0], ['CNN (AlexNet)', 37.5, 17.0, 1]] },
    alex2012: { title: 'ILSVRC-2012 (AlexNet Table 2), top-5 error %', unit: '%', groups: ['top-5 (val)', 'top-5 (test)'], rows: [
      ['SIFT + FVs (2nd-best entry)', null, 26.2, 0], ['1 CNN', 18.2, null, 1], ['5 CNNs', 16.4, 16.4, 1], ['1 CNN*, pre-trained on ImageNet 2011 Fall', 16.6, null, 1], ['7 CNNs*', 15.4, 15.3, 1]] },
    rn_plain: { title: 'ImageNet validation, top-1 error %, 10-crop (ResNet Table 2)', unit: '%', groups: ['18 layers', '34 layers'], rows: [
      ['plain', 27.94, 28.54, 0], ['ResNet', 27.88, 25.03, 1]] },
    rn_deep: { title: 'ImageNet validation, 10-crop (ResNet Table 3), error %', unit: '%', groups: ['top-1', 'top-5'], rows: [
      ['VGG-16', 28.07, 9.33, 0], ['GoogLeNet', null, 9.15, 0], ['PReLU-net', 24.27, 7.38, 0], ['plain-34', 28.54, 10.02, 0],
      ['ResNet-34 A (zero-padding shortcuts)', 25.03, 7.76, 1], ['ResNet-34 B (projections to increase dims)', 24.52, 7.46, 1], ['ResNet-34 C (all projections)', 24.19, 7.40, 1],
      ['ResNet-50', 22.85, 6.71, 1], ['ResNet-101', 21.75, 6.05, 1], ['ResNet-152', 21.43, 5.71, 1]] },
    rn_ens: { title: 'ImageNet test set, ensembles, top-5 error % (ResNet Table 5)', unit: '%', groups: ['top-5 (test)'], rows: [
      ['VGG (ILSVRC\'14)', 7.32, 0], ['GoogLeNet (ILSVRC\'14)', 6.66, 0], ['VGG (v5)', 6.8, 0], ['PReLU-net', 4.94, 0], ['BN-inception', 4.82, 0], ['ResNet (ILSVRC\'15)', 3.57, 1]] },
    rn_cifar: { title: 'CIFAR-10 test error % (ResNet Table 6)', unit: '%', groups: ['error'], rows: [
      ['Maxout', 9.38, 0], ['NIN', 8.81, 0], ['DSN', 8.22, 0], ['FitNet (19 layers, 2.5M)', 8.39, 0], ['Highway (19 layers, 2.3M)', 7.54, 0],
      ['ResNet-20 (0.27M)', 8.75, 1], ['ResNet-32 (0.46M)', 7.51, 1], ['ResNet-44 (0.66M)', 7.17, 1], ['ResNet-56 (0.85M)', 6.97, 1], ['ResNet-110 (1.7M)', 6.43, 1], ['ResNet-1202 (19.4M)', 7.93, 1]] }
  };
  function resultsChart(prefix) {
    var host = $(prefix + '-chart'); if (!host) return;
    var sel = $(prefix + '-sel');
    function render() {
      var D = RESULTS[sel.value], mx = 0;
      D.rows.forEach(function (r) { for (var g = 0; g < D.groups.length; g++) if (r[1 + g] != null) mx = Math.max(mx, r[1 + g]); });
      host.innerHTML = '<p class="viz-cap" style="margin-top:0">' + D.title + '</p>' + D.rows.map(function (r) {
        var ours = r[1 + D.groups.length];
        return '<div class="rbar' + (ours ? ' ours' : '') + '"><span>' + r[0] + '</span><div>' + D.groups.map(function (g, gi) {
          var v = r[1 + gi];
          return v == null ? '<div class="rb"><em>—</em></div>' : '<div class="rb"><i class="g' + gi + '" style="width:' + (v / mx * 100) + '%"></i><em>' + v + '</em></div>';
        }).join('') + '</div></div>';
      }).join('') + '<div class="legend">' + D.groups.map(function (g, gi) { return '<span><i class="g' + gi + '"></i>' + g + '</span>'; }).join('') + '</div>';
    }
    sel.addEventListener('change', render);
    render();
  }
  resultsChart('ar');
  resultsChart('rr');

  /* ================================================================
     ResNet 4.1  The degradation problem, reproduced on a toy regression
     ================================================================ */
  (function degradation() {
    var cvP = $('dg-plain'); if (!cvP) return;
    var cvR = $('dg-res'), cvS = $('dg-std'), btn = $('dg-run'), deepIn = $('dg-deep'), read = $('dg-read');
    var D_IN = 8, WIDTH = 16, NDATA = 512, STEPS = 1500, BATCH = 32, LR = .02, EVAL = 50, SHALLOW = 4;
    var X, Y, models = [], running = false, step = 0;

    (function data() {
      var r = V.rng(2024), A = [];
      for (var i = 0; i < D_IN; i++) { A.push([]); for (var j = 0; j < D_IN; j++) A[i].push(V.randn(r) / Math.sqrt(D_IN)); }
      X = []; Y = [];
      for (var n = 0; n < NDATA; n++) {
        var x = []; for (i = 0; i < D_IN; i++) x.push(V.randn(r));
        var y = []; for (j = 0; j < D_IN; j++) { var s = 0; for (i = 0; i < D_IN; i++) s += x[i] * A[i][j]; y.push(Math.sin(s) + .5 * x[j]); }
        X.push(x); Y.push(y);
      }
    })();

    function mat(r, rows, cols, sd) { var m = new Float64Array(rows * cols); for (var i = 0; i < m.length; i++) m[i] = V.randn(r) * sd; return m; }
    function makeModel(depth, residual, seed) {
      var r = V.rng(seed), m = { depth: depth, residual: residual, hist: [], W: [], b: [], vW: [], vb: [] };
      m.Win = mat(r, D_IN, WIDTH, Math.sqrt(2 / D_IN)); m.Wout = mat(r, WIDTH, D_IN, Math.sqrt(1 / WIDTH));
      for (var l = 0; l < depth; l++) {
        // second layer of each residual block starts small (×0.1): without batch normalization, blocks would otherwise blow up the signal
        var sd = Math.sqrt(2 / WIDTH) * (residual && l % 2 === 1 ? .1 : 1);
        m.W.push(mat(r, WIDTH, WIDTH, sd)); m.b.push(new Float64Array(WIDTH));
        m.vW.push(new Float64Array(WIDTH * WIDTH)); m.vb.push(new Float64Array(WIDTH));
      }
      m.vWin = new Float64Array(m.Win.length); m.vWout = new Float64Array(m.Wout.length); m.r = V.rng(seed + 99);
      return m;
    }
    function mm(h, W, rows, cols, b) { // row vector h (rows) times W (rows × cols)
      var o = new Float64Array(cols);
      for (var j = 0; j < cols; j++) { var s = b ? b[j] : 0; for (var i = 0; i < rows; i++) s += h[i] * W[i * cols + j]; o[j] = s; }
      return o;
    }
    function relu(a) { var o = new Float64Array(a.length); for (var i = 0; i < a.length; i++) o[i] = a[i] > 0 ? a[i] : 0; return o; }

    function forward(m, x, rec) {
      var a0 = mm(x, m.Win, D_IN, WIDTH), h = relu(a0), cache = [], l = 0;
      while (l < m.depth) {
        if (m.residual && l + 1 < m.depth) {
          var a1 = mm(h, m.W[l], WIDTH, WIDTH, m.b[l]), z1 = relu(a1), a2 = mm(z1, m.W[l + 1], WIDTH, WIDTH, m.b[l + 1]), s = new Float64Array(WIDTH);
          for (var i = 0; i < WIDTH; i++) s[i] = h[i] + a2[i];
          cache.push({ t: 'res', l: l, h: h, a1: a1, z1: z1, s: s });
          if (rec) { rec[l] = a1; rec[l + 1] = a2; }
          h = relu(s); l += 2;
        } else {
          var a = mm(h, m.W[l], WIDTH, WIDTH, m.b[l]);
          cache.push({ t: 'plain', l: l, h: h, a: a });
          if (rec) rec[l] = a;
          h = relu(a); l += 1;
        }
      }
      return { a0: a0, h: h, out: mm(h, m.Wout, WIDTH, D_IN), cache: cache };
    }

    function trainStep(m) {
      var gW = m.W.map(function (W) { return new Float64Array(W.length); }), gb = m.b.map(function (b) { return new Float64Array(b.length); });
      var gWin = new Float64Array(m.Win.length), gWout = new Float64Array(m.Wout.length), i, j;
      for (var n = 0; n < BATCH; n++) {
        var k = Math.floor(m.r() * NDATA), F = forward(m, X[k]), g = new Float64Array(D_IN);
        for (j = 0; j < D_IN; j++) g[j] = 2 * (F.out[j] - Y[k][j]) / (BATCH * D_IN);
        for (i = 0; i < WIDTH; i++) for (j = 0; j < D_IN; j++) gWout[i * D_IN + j] += F.h[i] * g[j];
        var gh = new Float64Array(WIDTH);
        for (i = 0; i < WIDTH; i++) { var s = 0; for (j = 0; j < D_IN; j++) s += m.Wout[i * D_IN + j] * g[j]; gh[i] = s; }
        for (var c = F.cache.length - 1; c >= 0; c--) {
          var q = F.cache[c], ng = new Float64Array(WIDTH);
          if (q.t === 'plain') {
            var ga = new Float64Array(WIDTH); for (i = 0; i < WIDTH; i++) ga[i] = q.a[i] > 0 ? gh[i] : 0;
            for (i = 0; i < WIDTH; i++) for (j = 0; j < WIDTH; j++) { gW[q.l][i * WIDTH + j] += q.h[i] * ga[j]; ng[i] += m.W[q.l][i * WIDTH + j] * ga[j]; }
            for (j = 0; j < WIDTH; j++) gb[q.l][j] += ga[j];
          } else {
            var gs = new Float64Array(WIDTH), gz = new Float64Array(WIDTH), ga1 = new Float64Array(WIDTH);
            for (i = 0; i < WIDTH; i++) gs[i] = q.s[i] > 0 ? gh[i] : 0;
            for (i = 0; i < WIDTH; i++) for (j = 0; j < WIDTH; j++) { gW[q.l + 1][i * WIDTH + j] += q.z1[i] * gs[j]; gz[i] += m.W[q.l + 1][i * WIDTH + j] * gs[j]; }
            for (j = 0; j < WIDTH; j++) gb[q.l + 1][j] += gs[j];
            for (i = 0; i < WIDTH; i++) ga1[i] = q.a1[i] > 0 ? gz[i] : 0;
            for (i = 0; i < WIDTH; i++) { ng[i] = gs[i]; for (j = 0; j < WIDTH; j++) { gW[q.l][i * WIDTH + j] += q.h[i] * ga1[j]; ng[i] += m.W[q.l][i * WIDTH + j] * ga1[j]; } }
            for (j = 0; j < WIDTH; j++) gb[q.l][j] += ga1[j];
          }
          gh = ng;
        }
        for (i = 0; i < D_IN; i++) for (j = 0; j < WIDTH; j++) gWin[i * WIDTH + j] += X[k][i] * (F.a0[j] > 0 ? gh[j] : 0);
      }
      function upd(P, G, Vv) { for (var t = 0; t < P.length; t++) { Vv[t] = .9 * Vv[t] - LR * G[t]; P[t] += Vv[t]; } }
      upd(m.Win, gWin, m.vWin); upd(m.Wout, gWout, m.vWout);
      for (var l = 0; l < m.depth; l++) { upd(m.W[l], gW[l], m.vW[l]); upd(m.b[l], gb[l], m.vb[l]); }
    }
    function evalLoss(m) {
      var s = 0;
      for (var n = 0; n < NDATA; n++) { var o = forward(m, X[n]).out; for (var j = 0; j < D_IN; j++) { var e = o[j] - Y[n][j]; s += e * e; } }
      var v = s / (NDATA * D_IN); return isFinite(v) ? v : 9;
    }
    function responseStd(m) { // standard deviation of each layer's output before the nonlinearity / addition (figure 7)
      var acc = []; for (var l = 0; l < m.depth; l++) acc.push({ s: 0, s2: 0, n: 0 });
      for (var n = 0; n < 128; n++) {
        var rec = {}; forward(m, X[n], rec);
        for (l = 0; l < m.depth; l++) for (var i = 0; i < WIDTH; i++) { var v = rec[l][i]; acc[l].s += v; acc[l].s2 += v * v; acc[l].n++; }
      }
      return acc.map(function (a) { var mu = a.s / a.n; return Math.sqrt(Math.max(0, a.s2 / a.n - mu * mu)); });
    }

    function reset() {
      var deep = +deepIn.value; $('dg-deepo').textContent = deep;
      models = [makeModel(SHALLOW, false, 1), makeModel(deep, false, 1), makeModel(SHALLOW, true, 1), makeModel(deep, true, 1)];
      models.forEach(function (m) { m.hist.push(evalLoss(m)); });
      step = 0; draw();
    }
    function plot(cv, ms, title) {
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, ymax = .7;
      function X(i) { return 36 + i / (STEPS / EVAL) * (W - 46); }
      function Yp(v) { return H - 22 - Math.min(v, ymax) / ymax * (H - 42); }
      ctx.strokeStyle = C.grid; ctx.fillStyle = C.muted; ctx.font = '10px ui-monospace, Consolas, monospace';
      [0, .2, .4, .6].forEach(function (v) { ctx.beginPath(); ctx.moveTo(36, Yp(v)); ctx.lineTo(W - 10, Yp(v)); ctx.stroke(); ctx.fillText(v.toFixed(1), 4, Yp(v) + 3); });
      ctx.fillText('0', 36, H - 8); ctx.fillText(STEPS + ' steps', W - 70, H - 8);
      ms.forEach(function (m, k) {
        ctx.strokeStyle = k ? C.grad : C.accent; ctx.lineWidth = k ? 3 : 1.6; ctx.beginPath();
        m.hist.forEach(function (v, i) { if (i) ctx.lineTo(X(i), Yp(v)); else ctx.moveTo(X(i), Yp(v)); });
        ctx.stroke();
      });
      ctx.fillStyle = C.ink; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillText(title, 40, 14);
    }
    function draw() {
      var deep = +deepIn.value;
      plot(cvP, [models[0], models[1]], 'plain');
      plot(cvR, [models[2], models[3]], 'residual');
      var S = V.setup(cvS), ctx = S.ctx, W = S.w, H = S.h;
      if (step >= STEPS) {
        var sp = responseStd(models[1]), sr = responseStd(models[3]), mx = 1e-9, n = sp.length;
        sp.concat(sr).forEach(function (v) { mx = Math.max(mx, v); });
        var bw = (W - 40) / n;
        for (var l = 0; l < n; l++) {
          var x = 30 + l * bw;
          ctx.fillStyle = C.grad; ctx.fillRect(x + 1, H - 18 - sp[l] / mx * (H - 36), bw / 2 - 1, sp[l] / mx * (H - 36));
          ctx.fillStyle = C.fwd; ctx.fillRect(x + bw / 2, H - 18 - sr[l] / mx * (H - 36), bw / 2 - 1, sr[l] / mx * (H - 36));
        }
        ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
        ctx.fillText('std of each layer\'s response after training (deep nets): pink plain, blue residual', 30, 12); ctx.fillText('layer 1', 30, H - 4); ctx.fillText('layer ' + n, W - 50, H - 4);
      } else {
        ctx.fillStyle = C.muted; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('Layer response statistics appear after training finishes.', 30, H / 2);
      }
      var L = models.map(function (m) { return m.hist[m.hist.length - 1]; });
      read.innerHTML = 'Step ' + step + ' of ' + STEPS + '. Training loss: plain-' + SHALLOW + ' <b>' + fmt(L[0], 3) + '</b>, plain-' + deep + ' <b class="g">' + fmt(L[1], 3) +
        '</b> · residual-' + SHALLOW + ' <b>' + fmt(L[2], 3) + '</b>, residual-' + deep + ' <b>' + fmt(L[3], 3) + '</b>' +
        (step >= STEPS ? (L[1] > L[0] ? '<br>The deeper plain net ends with <b>higher training error</b> than the shallow one, though it could copy the shallow net and set its extra layers to the identity: the degradation problem.' : '') +
          (L[3] < L[2] ? ' The deeper residual net ends <b>lower</b> than the shallow residual net.' : '') : '');
    }
    function loop() {
      if (!running) return;
      // a few steps per frame keeps the page responsive; the loss is evaluated every EVAL steps
      for (var k = 0; k < 10 && step < STEPS; k++) { models.forEach(trainStep); step++; }
      if (step % EVAL === 0) { models.forEach(function (m) { m.hist.push(evalLoss(m)); }); draw(); }
      if (step >= STEPS) { running = false; btn.textContent = '▶ Train again'; return; }
      requestAnimationFrame(loop);
    }
    btn.addEventListener('click', function () {
      if (running) { running = false; btn.textContent = '▶ Resume'; return; }
      if (step >= STEPS) reset();
      running = true; btn.textContent = '❚❚ Pause'; loop();
    });
    deepIn.addEventListener('input', function () { running = false; btn.textContent = '▶ Train'; reset(); });
    reset();
    V.watch(cvP, draw);
  })();

})();
