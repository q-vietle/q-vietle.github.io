/* Widgets for "Convolutional networks" (after Goodfellow, Bengio & Courville, Deep Learning, ch. 9):
   convolution vs cross-correlation (9.1), connectivity and parameter sharing (9.2, 9.5), receptive fields,
   pooling (9.3), zero padding (9.5), multichannel convolution with biases (9.5), architectures (fig. 9.11),
   Gabor simple and complex cells (9.10), and a tiny CNN trained in the browser. */
(function () {
  'use strict';

  var V = window.Viz, C = V.C, fmt = V.fmt, tx = V.tex;
  function $(id) { return document.getElementById(id); }
  var SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

  var PICS = {
    seven: ['............', '.#########..', '.#########..', '........##..', '.......##...', '......##....',
            '.....##.....', '....##......', '....##......', '...##.......', '...##.......', '............'],
    square: ['............', '............', '..########..', '..#......#..', '..#......#..', '..#......#..',
             '..#......#..', '..#......#..', '..#......#..', '..########..', '............', '............'],
    cross: ['............', '.#........#.', '..#......#..', '...#....#...', '....#..#....', '.....##.....',
            '.....##.....', '....#..#....', '...#....#...', '..#......#..', '.#........#.', '............'],
    blob: ['............', '............', '....####....', '...######...', '..########..', '..########..',
           '..########..', '..########..', '...######...', '....####....', '............', '............']
  };
  var KERNELS = {
    vedge: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    hedge: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
    blur: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
    sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    outline: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
    identity: [0, 0, 0, 0, 1, 0, 0, 0, 0]
  };

  (function convExplorer() {
    var inC = $('cv-in'); if (!inC) return;
    var fmC = $('cv-fm'), poolC = $('cv-pool'), kGrid = $('cv-kernel'), calc = $('cv-calc'), sizeEl = $('cv-size');
    var picSel = $('cv-pic'), kSel = $('cv-kpreset'), strideSel = $('cv-stride'), padSel = $('cv-pad'), reluChk = $('cv-relu'), btnAnim = $('cv-anim'), flipChk = $('cv-flip');
    var N = 12, inp = new Float32Array(N * N), K = KERNELS.vedge.slice(), fm, M, pooled, P, pre;
    var focus = null, reveal = -1, timer = null, painting = null;

    // weight applied at offset (a, b): true convolution flips the kernel, cross-correlation does not
    function kw(a, b) { return flipChk && flipChk.checked ? K[(2 - a) * 3 + (2 - b)] : K[a * 3 + b]; }

    function load(name) { var rows = PICS[name]; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) inp[r * N + c] = rows[r][c] === '#' ? 1 : 0; }
    function s() { return +strideSel.value; }
    function p() { return +padSel.value; }

    function compute() {
      var st = s(), pd = p();
      M = Math.floor((N + 2 * pd - 3) / st) + 1;
      fm = new Float32Array(M * M); pre = new Float32Array(M * M);
      for (var i = 0; i < M; i++) for (var j = 0; j < M; j++) {
        var sum = 0;
        for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
          var r = i * st + a - pd, c = j * st + b - pd;
          if (r >= 0 && r < N && c >= 0 && c < N) sum += kw(a, b) * inp[r * N + c];
        }
        pre[i * M + j] = sum; fm[i * M + j] = reluChk.checked ? Math.max(0, sum) : sum;
      }
      P = Math.floor(M / 2); pooled = new Float32Array(P * P);
      for (i = 0; i < P; i++) for (j = 0; j < P; j++) {
        pooled[i * P + j] = Math.max(fm[(2 * i) * M + 2 * j], fm[(2 * i) * M + 2 * j + 1], fm[(2 * i + 1) * M + 2 * j], fm[(2 * i + 1) * M + 2 * j + 1]);
      }
      sizeEl.innerHTML = 'Output size ' + tx('\\left\\lfloor \\dfrac{n + 2p - k}{s} \\right\\rfloor + 1 = \\left\\lfloor \\dfrac{' + N + ' + 2\\cdot' + pd + ' - 3}{' + st + '} \\right\\rfloor + 1 = \\mathbf{' + M + '}') +
                         ' → feature map ' + tx(M + '\\times' + M) + ', after ' + tx('2\\times 2') + ' max-pool ' + tx(P + '\\times' + P);
    }

    // cell geometry shared by all three grids so they are drawn at the same scale
    function cellSize(canvas) { return canvas.clientWidth / (N + 2); }

    function drawInput() {
      var S = V.setup(inC), ctx = S.ctx, cs = cellSize(inC), pd = p(), st = s();
      var ink = C.inkRGB, paper = C.midRGB;
      for (var r = -1; r <= N; r++) for (var c = -1; c <= N; c++) {
        var x = (c + 1) * cs, y = (r + 1) * cs, inside = r >= 0 && r < N && c >= 0 && c < N;
        if (!inside) {
          if (!pd) continue;
          ctx.setLineDash([3, 3]); ctx.strokeStyle = C.border; ctx.lineWidth = 1;
          ctx.strokeRect(x + .5, y + .5, cs - 1, cs - 1); ctx.setLineDash([]);
          continue;
        }
        ctx.fillStyle = V.rgba(V.mix(paper, ink, inp[r * N + c] * .9));
        ctx.fillRect(x, y, cs, cs);
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, cs - 1, cs - 1);
      }
      var win = window_();
      if (win) {
        ctx.strokeStyle = C.accent; ctx.lineWidth = 3;
        ctx.strokeRect((win.c0 + 1) * cs + 1.5, (win.r0 + 1) * cs + 1.5, win.w * cs - 3, win.h * cs - 3);
      }
      void st;
    }
    // input window (in input cell coordinates) behind the focused output cell(s)
    function window_() {
      if (!focus) return null;
      var st = s(), pd = p();
      if (focus.kind === 'fm') return { r0: focus.i * st - pd, c0: focus.j * st - pd, w: 3, h: 3 };
      var i0 = 2 * focus.i, j0 = 2 * focus.j;
      return { r0: i0 * st - pd, c0: j0 * st - pd, w: st + 3, h: st + 3 };
    }

    function maxAbs(a) { var m = 1e-6; for (var i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m; }

    function drawMap(canvas, arr, n, hi, label) {
      var S = V.setup(canvas), ctx = S.ctx, cs = cellSize(canvas), off = (canvas.clientWidth - n * cs) / 2, m = maxAbs(fm);
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
        var k = i * n + j, x = off + j * cs, y = off + i * cs;
        var hidden = arr === fm && reveal >= 0 && k > reveal;
        ctx.fillStyle = hidden ? C.mid : V.rgba(V.diverge(arr[k] / m));
        ctx.fillRect(x, y, cs, cs);
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, cs - 1, cs - 1);
        if (cs >= 26 && !hidden) {
          ctx.fillStyle = C.ink; ctx.font = '9px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
          ctx.fillText(V.short(arr[k]), x + cs / 2, y + cs / 2 + 3); ctx.textAlign = 'left';
        }
      }
      if (hi) {
        ctx.strokeStyle = C.accent; ctx.lineWidth = 3;
        ctx.strokeRect(off + hi.c * cs + 1.5, off + hi.r * cs + 1.5, hi.w * cs - 3, hi.h * cs - 3);
      }
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(label + '  (max |v| = ' + V.short(m) + ')', 4, canvas.clientHeight - 6);
    }

    function drawKernel() {
      var m = maxAbs(K);
      kGrid.querySelectorAll('input').forEach(function (el, k) {
        var c = V.diverge(K[k] / m);
        el.style.background = V.rgba(c);
        el.style.color = Math.abs(K[k] / m) > .6 ? '#fff' : '';
        if (document.activeElement !== el) el.value = V.short(K[k]).replace('−', '-');
      });
    }

    function explain() {
      if (!focus) { calc.innerHTML = '<p>Hover a cell of the feature map (or press <b>Animate</b>) to see the multiply-and-sum behind it.</p>'; return; }
      if (focus.kind === 'pool') {
        var i0 = 2 * focus.i, j0 = 2 * focus.j, vals = [fm[i0 * M + j0], fm[i0 * M + j0 + 1], fm[(i0 + 1) * M + j0], fm[(i0 + 1) * M + j0 + 1]];
        calc.innerHTML = '<h4>Max-pool cell (' + focus.i + ', ' + focus.j + ')</h4>' + tx('\\max(' + vals.map(V.short).join(',\\ ') + ') = \\mathbf{' + V.short(pooled[focus.i * P + focus.j]) + '}') +
                         '<p style="margin-top:6px">Pooling keeps the strongest response in each 2×2 block, halving the resolution. Small shifts of a feature inside the block do not change the output.</p>';
        return;
      }
      var st = s(), pd = p(), h = '<h4>Feature-map cell (' + focus.i + ', ' + focus.j + ')</h4><div class="table-wrap"><table class="data" style="width:auto">';
      for (var a = 0; a < 3; a++) {
        h += '<tr>';
        for (var b = 0; b < 3; b++) {
          var r = focus.i * st + a - pd, c = focus.j * st + b - pd, x = (r >= 0 && r < N && c >= 0 && c < N) ? inp[r * N + c] : 0;
          var w = kw(a, b), prod = x * w;
          h += '<td class="num" style="' + (prod ? 'color:' + (prod > 0 ? 'var(--viz-pos)' : 'var(--viz-neg)') + ';font-weight:600' : '') + '">' +
               tx(V.short(x) + '\\times' + V.short(w)) + '</td>';
        }
        h += '</tr>';
      }
      var k = focus.i * M + focus.j;
      h += '</table></div>' + tx('\\textstyle\\sum = \\mathbf{' + V.short(pre[k]) + '}') + (reluChk.checked ? ' → ReLU → ' + tx('\\mathbf{' + V.short(fm[k]) + '}') : '');
      calc.innerHTML = h;
    }

    function drawAll() {
      compute();
      drawInput();
      var hiFm = null, hiPool = null;
      if (focus && focus.kind === 'fm') hiFm = { r: focus.i, c: focus.j, w: 1, h: 1 };
      if (focus && focus.kind === 'pool') { hiFm = { r: 2 * focus.i, c: 2 * focus.j, w: 2, h: 2 }; hiPool = { r: focus.i, c: focus.j, w: 1, h: 1 }; }
      drawMap(fmC, fm, M, hiFm, 'feature map ' + M + '×' + M);
      drawMap(poolC, pooled, P, hiPool, 'pooled ' + P + '×' + P);
      drawKernel(); explain();
    }

    // kernel inputs
    for (var k = 0; k < 9; k++) {
      var el = document.createElement('input');
      el.type = 'number'; el.step = '0.1'; el.className = 'vnum'; el.setAttribute('aria-label', 'kernel weight ' + (k + 1));
      el.dataset.k = k; kGrid.appendChild(el);
    }
    kGrid.addEventListener('input', function (e) {
      var v = parseFloat(e.target.value); if (isNaN(v)) return;
      K[+e.target.dataset.k] = v; kSel.value = 'custom'; drawAll();
    });
    kSel.addEventListener('change', function () { if (KERNELS[kSel.value]) { K = KERNELS[kSel.value].slice(); drawAll(); } });
    picSel.addEventListener('change', function () { if (PICS[picSel.value]) load(picSel.value); else inp.fill(0); drawAll(); });
    [strideSel, padSel, reluChk, flipChk].forEach(function (el) { el.addEventListener('change', function () { focus = null; drawAll(); }); });

    // painting on the input grid
    function cellAt(e) {
      var pt = V.pointer(e, inC), cs = cellSize(inC), r = Math.floor(pt.y / cs) - 1, c = Math.floor(pt.x / cs) - 1;
      return (r >= 0 && r < N && c >= 0 && c < N) ? r * N + c : -1;
    }
    inC.addEventListener('pointerdown', function (e) {
      var i = cellAt(e); if (i < 0) return;
      painting = inp[i] > .5 ? 0 : 1; inp[i] = painting; picSel.value = 'custom';
      inC.setPointerCapture(e.pointerId); drawAll();
    });
    inC.addEventListener('pointermove', function (e) { if (painting === null) return; var i = cellAt(e); if (i >= 0 && inp[i] !== painting) { inp[i] = painting; drawAll(); } });
    inC.addEventListener('pointerup', function () { painting = null; });

    function hoverMap(canvas, n, kind) {
      canvas.addEventListener('pointermove', function (e) {
        if (timer) return;
        var pt = V.pointer(e, canvas), cs = cellSize(canvas), off = (canvas.clientWidth - n() * cs) / 2;
        var i = Math.floor((pt.y - off) / cs), j = Math.floor((pt.x - off) / cs);
        var nf = (i >= 0 && j >= 0 && i < n() && j < n()) ? { kind: kind, i: i, j: j } : null;
        if (JSON.stringify(nf) !== JSON.stringify(focus)) { focus = nf; drawAll(); }
      });
      canvas.addEventListener('pointerleave', function () { if (!timer && focus) { focus = null; drawAll(); } });
    }
    hoverMap(fmC, function () { return M; }, 'fm');
    hoverMap(poolC, function () { return P; }, 'pool');

    // shift the input to show translation equivariance
    document.querySelectorAll('#fig-conv [data-shift]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = b.dataset.shift.split(',').map(Number), out = new Float32Array(N * N);
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          var r2 = r - d[1], c2 = c - d[0];
          out[r * N + c] = (r2 >= 0 && r2 < N && c2 >= 0 && c2 < N) ? inp[r2 * N + c2] : 0;
        }
        inp = out; picSel.value = 'custom'; drawAll();
      });
    });

    function stopAnim() { clearInterval(timer); timer = null; reveal = -1; btnAnim.textContent = '▶ Animate'; }
    btnAnim.addEventListener('click', function () {
      if (timer) { stopAnim(); focus = null; drawAll(); return; }
      reveal = 0; btnAnim.textContent = '■ Stop';
      timer = setInterval(function () {
        if (reveal >= M * M) { stopAnim(); focus = null; drawAll(); return; }
        focus = { kind: 'fm', i: Math.floor(reveal / M), j: reveal % M }; drawAll(); reveal++;
      }, V.reduceMotion ? 10 : 110);
    });

    load('seven');
    V.watch(inC, drawAll);
  })();

  /* ================================================================
     9.2 / 9.5  Sparse connectivity, parameter sharing, local and tiled connections
     ================================================================ */
  (function connectivity() {
    var cv = $('cn-canvas'); if (!cv) return;
    var modeBtns = document.querySelectorAll('#fig-conn [data-mode]'), kSel = $('cn-k'), read = $('cn-read');
    var N = 7, mode = 'conv', pick = { side: 'in', i: 3 }, geom = null;
    var PAL = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#f59f00', '#0ca678', '#e64980', '#5c7cfa', '#fab005', '#15aabf'];
    var LETTERS = 'abcdefghijklmnopqrstuvwxyz';

    function edges() {
      var k = +kSel.value, E = [], i, j;
      for (j = 0; j < N; j++) {                 // output s_j
        if (mode === 'dense') { for (i = 0; i < N; i++) E.push({ i: i, j: j, p: j * N + i }); continue; }
        var start = k === 3 ? j - 1 : j;
        for (var o = 0; o < k; o++) {
          i = start + o; if (i < 0 || i >= N) continue;
          var p = mode === 'conv' ? o : mode === 'local' ? j * k + o : (j % 2) * k + o; // tiled: t = 2 kernels
          E.push({ i: i, j: j, p: p });
        }
      }
      return E;
    }
    function nParams(E) { var s = {}; E.forEach(function (e) { s[e.p] = 1; }); return Object.keys(s).length; }

    function draw() {
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, E = edges(), gx = (W - 60) / (N - 1), yT = 40, yB = H - 40, r = 16;
      function X(i) { return 30 + i * gx; }
      var hot = function (e) { return pick.side === 'in' ? e.i === pick.i : e.j === pick.i; };
      E.forEach(function (e) {
        var on = hot(e);
        ctx.strokeStyle = mode === 'dense' ? V.rgba(C.inkRGB, on ? .8 : .12) : PAL[e.p % PAL.length];
        ctx.globalAlpha = on ? 1 : .28; ctx.lineWidth = on ? 3 : 1.5;
        ctx.beginPath(); ctx.moveTo(X(e.i), yB - r); ctx.lineTo(X(e.j), yT + r); ctx.stroke();
        ctx.globalAlpha = 1;
        if (on && mode !== 'dense') {
          var mx = X(e.i) + (X(e.j) - X(e.i)) * .35, my = (yB - r) + ((yT + r) - (yB - r)) * .35;
          V.tag(ctx, LETTERS[e.p % 26] + (e.p >= 26 ? "'" : ''), mx, my, PAL[e.p % PAL.length], 'bold 12px system-ui, sans-serif');
        }
      });
      var affected = {};
      E.forEach(function (e) { if (hot(e)) affected[pick.side === 'in' ? 'o' + e.j : 'i' + e.i] = 1; });
      for (var i = 0; i < N; i++) {
        [['i', yB, 'x'], ['o', yT, 's']].forEach(function (row) {
          var sel = (pick.side === 'in' && row[0] === 'i' && i === pick.i) || (pick.side === 'out' && row[0] === 'o' && i === pick.i);
          var lit = affected[row[0] + i];
          ctx.fillStyle = sel ? C.accent : lit ? V.rgba(V.mix(C.midRGB, C.accentRGB, .35)) : C.bg;
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(X(i), row[1], r, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = sel ? C.bg : C.ink; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(row[2] + SUB[i + 1], X(i), row[1] + 4); ctx.textAlign = 'left';
        });
      }
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('outputs s', 4, 14); ctx.fillText('inputs x', 4, H - 8);
      geom = { X: X, yT: yT, yB: yB, r: r };
      var n = nParams(E), cnt = Object.keys(affected).length;
      var what = pick.side === 'in' ? 'Input ' + tx('x_' + (pick.i + 1)) + ' affects ' + cnt + ' output' + (cnt === 1 ? '' : 's') + ' (sparse connectivity viewed from below).'
                                    : 'Output ' + tx('s_' + (pick.i + 1)) + ' depends on ' + cnt + ' input' + (cnt === 1 ? '' : 's') + ': its receptive field (viewed from above).';
      var desc = {
        conv: 'Convolution: every output uses the same ' + kSel.value + ' weights (same letter, same colour everywhere). That is parameter sharing, or tied weights.',
        dense: 'Matrix multiplication: every input connects to every output, each edge with its own weight.',
        local: 'Locally connected ("unshared convolution"): the same sparse connections as convolution, but every edge has its own weight.',
        tiled: 'Tiled convolution with ' + tx('t = 2') + ': neighbouring outputs alternate between two kernels, and outputs two steps apart share weights.'
      }[mode];
      read.innerHTML = what + '<br>' + desc + '<br>Connections: <b>' + E.length + '</b> · distinct parameters: <b>' + n + '</b> (for ' + tx('m = n = ' + N) + ' units).';
    }

    cv.addEventListener('pointerdown', function (e) {
      if (!geom) return;
      var p = V.pointer(e, cv), g = geom;
      for (var i = 0; i < N; i++) {
        if (Math.hypot(p.x - g.X(i), p.y - g.yB) < g.r + 4) { pick = { side: 'in', i: i }; draw(); return; }
        if (Math.hypot(p.x - g.X(i), p.y - g.yT) < g.r + 4) { pick = { side: 'out', i: i }; draw(); return; }
      }
    });
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.mode; modeBtns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); draw(); }); });
    kSel.addEventListener('change', draw);
    V.watch(cv, draw);
  })();

  /* ================================================================
     9.3  Pooling: invariance to small translations, and downsampling
     ================================================================ */
  (function pooling() {
    var cv = $('pl-canvas'); if (!cv) return;
    var zIn = $('pl-z'), sIn = $('pl-s'), fnSel = $('pl-fn'), read = $('pl-read');
    var DET = [.1, 1, .2, .1, 0, .3, 1, .8, .1, 0, .2, 1, .1, .1];
    function pool(det) {
      var z = +zIn.value, s = +sIn.value, out = [];
      for (var c = 0; c < det.length; c += s) {
        var lo = Math.max(0, c - Math.floor(z / 2)), hi = Math.min(det.length - 1, lo + z - 1), win = det.slice(lo, hi + 1), v;
        if (fnSel.value === 'max') v = Math.max.apply(null, win);
        else if (fnSel.value === 'avg') v = win.reduce(function (a, b) { return a + b; }, 0) / win.length;
        else v = Math.sqrt(win.reduce(function (a, b) { return a + b * b; }, 0));
        out.push({ v: v, lo: lo, hi: hi, c: c });
      }
      return out;
    }
    function draw() {
      $('pl-zo').textContent = zIn.value; $('pl-so').textContent = sIn.value;
      var shifted = [0].concat(DET.slice(0, -1)), A = pool(DET), B = pool(shifted);
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, n = DET.length, cw = (W - 150) / n, half = H / 2;
      function panel(det, P, other, y0, title) {
        var yDet = y0 + half - 34, yPool = y0 + 38, bw = Math.min(cw - 4, 40);
        ctx.fillStyle = C.ink; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillText(title, 4, y0 + 14);
        ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText('pooling stage', 4, yPool + 4); ctx.fillText('detector stage', 4, yDet + 4);
        var changedDet = 0, changedPool = 0;
        det.forEach(function (v, i) {
          var x = 140 + i * cw + cw / 2, ch = other && Math.abs(other.det[i] - v) > 1e-9;
          if (ch) changedDet++;
          ctx.fillStyle = V.rgba(V.mix(C.midRGB, C.posRGB, v)); ctx.strokeStyle = ch ? C.grad : C.border; ctx.lineWidth = ch ? 2.5 : 1;
          ctx.fillRect(x - bw / 2, yDet - 13, bw, 26); ctx.strokeRect(x - bw / 2, yDet - 13, bw, 26);
          ctx.fillStyle = C.ink; ctx.font = '11px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(V.short(v), x, yDet + 4); ctx.textAlign = 'left';
        });
        P.forEach(function (p, j) {
          var x = 140 + p.c * cw + cw / 2, ch = other && Math.abs(other.P[j].v - p.v) > 1e-9;
          if (ch) changedPool++;
          ctx.strokeStyle = V.rgba(C.inkRGB, .25); ctx.lineWidth = 1;
          for (var i = p.lo; i <= p.hi; i++) { ctx.beginPath(); ctx.moveTo(x, yPool + 13); ctx.lineTo(140 + i * cw + cw / 2, yDet - 13); ctx.stroke(); }
          ctx.fillStyle = V.rgba(V.mix(C.midRGB, C.fwdRGB, Math.min(1, p.v))); ctx.strokeStyle = ch ? C.grad : C.border; ctx.lineWidth = ch ? 2.5 : 1;
          ctx.fillRect(x - bw / 2, yPool - 13, bw, 26); ctx.strokeRect(x - bw / 2, yPool - 13, bw, 26);
          ctx.fillStyle = C.ink; ctx.font = '11px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(V.short(p.v), x, yPool + 4); ctx.textAlign = 'left';
        });
        return { d: changedDet, p: changedPool };
      }
      panel(DET, A, null, 0, 'Original');
      var c = panel(shifted, B, { det: DET, P: A }, half, 'Input shifted one position to the right');
      read.innerHTML = 'After the shift, <b class="g">' + c.d + ' of ' + n + '</b> detector values changed, but only <b>' + c.p + ' of ' + B.length + '</b> pooled values changed (red outlines).' +
        (+sIn.value > 1 ? ' With stride ' + sIn.value + ' the pooling stage has ' + B.length + ' units instead of ' + n + ': downsampling reduces the work for the next layer.' : '');
    }
    [zIn, sIn, fnSel].forEach(function (el) { el.addEventListener('input', draw); });
    V.watch(cv, draw);
  })();

  /* ================================================================
     9.5  Zero padding: valid, same and full convolution
     ================================================================ */
  (function padding() {
    var cv = $('pd-canvas'); if (!cv) return;
    var mIn = $('pd-m'), kIn = $('pd-k'), modeBtns = document.querySelectorAll('#fig-pad [data-pad]'), read = $('pd-read');
    var mode = 'valid', LAYERS = 5;
    function draw() {
      var m = +mIn.value, k = +kIn.value; $('pd-mo').textContent = m; $('pd-ko').textContent = k;
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, pad = mode === 'valid' ? 0 : mode === 'same' ? k - 1 : 2 * (k - 1);
      var widths = [m], w = m;
      for (var l = 1; l <= LAYERS; l++) { w = w + pad - k + 1; if (w < 1) break; widths.push(w); }
      var maxW = Math.max.apply(null, widths) + pad, cs = Math.min(22, (W - 20) / maxW), rowH = (H - 20) / (LAYERS + 1);
      widths.forEach(function (wd, l) {
        var y = H - 14 - l * rowH - cs, padL = l < widths.length - 1 ? Math.floor(pad / 2) : 0, padR = l < widths.length - 1 ? pad - padL : 0;
        var total = wd + padL + padR, x0 = (W - total * cs) / 2;
        for (var i = 0; i < total; i++) {
          var isPad = i < padL || i >= padL + wd, x = x0 + i * cs;
          if (isPad) { ctx.setLineDash([3, 3]); ctx.strokeStyle = C.muted; ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3); ctx.setLineDash([]); continue; }
          // how many of this unit's k inputs were real (not zero padding) — shows the weaker border units
          var frac = 1;
          if (l > 0 && pad > 0) {
            var prevPadL = Math.floor(pad / 2), prevW = widths[l - 1], real = 0;
            for (var o = 0; o < k; o++) { var src = (i - padL) + o - prevPadL; if (src >= 0 && src < prevW) real++; }
            frac = real / k;
          }
          ctx.fillStyle = V.rgba(V.mix(C.midRGB, l ? C.fwdRGB : C.negRGB, .25 + .75 * frac));
          ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        }
        ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(l ? 'layer ' + l + ': ' + wd : 'input: ' + wd, 4, y + cs * .7);
      });
      var stopped = widths.length - 1 < LAYERS;
      var note = {
        valid: 'Valid: no padding, so the width shrinks by ' + tx('k - 1 = ' + (k - 1)) + ' at every layer' + (stopped ? ', and after ' + (widths.length - 1) + ' layer(s) there is no room left for another kernel' : '') + '. Every output sees the same number of inputs.',
        same: 'Same: ' + tx('k - 1 = ' + (k - 1)) + ' zeros per layer keep the width at ' + tx('m = ' + m) + ', so the network can be as deep as we like. Border units see fewer real inputs (lighter colour), so border pixels are somewhat under-represented.',
        full: 'Full: enough zeros that every input is visited ' + tx('k') + ' times in each direction, so the width grows by ' + tx('k - 1') + ' per layer. Outputs near the border depend on fewer pixels, which makes a single kernel harder to fit everywhere.'
      }[mode];
      read.innerHTML = note + '<br>Output width per layer ' + tx('= m + p - k + 1') + ' with ' + tx('p') + ' total zeros added: ' + tx(widths.join(' \\to ')) + '.';
    }
    [mIn, kIn].forEach(function (el) { el.addEventListener('input', draw); });
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.pad; modeBtns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); draw(); }); });
    V.watch(cv, draw);
  })();

  /* ================================================================
     9.10  Gabor functions: simple and complex cells in V1 (eqs. 9.15–9.18)
     ================================================================ */
  (function gabor() {
    var cvW = $('gb-w'); if (!cvW) return;
    var cvS = $('gb-stim'), cvR = $('gb-resp'), read = $('gb-read');
    var ids = ['tau', 'f', 'phi', 'bx', 'by', 'theta'], el = {};
    ids.forEach(function (id) { el[id] = $('gb-' + id); });
    var N = 48;
    function v(id) { return parseFloat(el[id].value); }
    function weight(x, y, phi) {
      var t = v('tau'), xp = x * Math.cos(t) + y * Math.sin(t), yp = -x * Math.sin(t) + y * Math.cos(t);
      return Math.exp(-v('bx') * xp * xp - v('by') * yp * yp) * Math.cos(v('f') * xp + phi);
    }
    function stim(x, y, psi) { var th = v('theta'); return Math.cos(v('f') * (x * Math.cos(th) + y * Math.sin(th)) + psi); }
    function response(phi, psi) { // s(I) = Σ w(x, y) I(x, y)   (eq. 9.15)
      var s = 0;
      for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) { var x = -1 + 2 * (i + .5) / N, y = -1 + 2 * (j + .5) / N; s += weight(x, y, phi) * stim(x, y, psi); }
      return s / (N * N);
    }
    function draw() {
      ids.forEach(function (id) { $('gb-' + id + 'o').textContent = fmt(v(id), 2); });
      var phi = v('phi');
      var S1 = V.setup(cvW);
      V.heatmap(S1.ctx, 0, 0, S1.w, S1.h, 64, function (u, w) { return weight(-1 + 2 * u, 1 - 2 * w, phi); });
      var S2 = V.setup(cvS);
      V.heatmap(S2.ctx, 0, 0, S2.w, S2.h, 64, function (u, w) { return .9 * stim(-1 + 2 * u, 1 - 2 * w, 0); });
      // responses as the stimulus phase ψ sweeps a full cycle
      var S = V.setup(cvR), ctx = S.ctx, W = S.w, H = S.h, M = 60, simp = [], comp = [], mx = 1e-9;
      for (var k = 0; k <= M; k++) {
        var psi = k / M * 2 * Math.PI, s0 = response(phi, psi), s1 = response(phi + Math.PI / 2, psi);
        simp.push(s0); comp.push(Math.sqrt(s0 * s0 + s1 * s1)); mx = Math.max(mx, Math.abs(s0), comp[k]);
      }
      function X(k) { return 10 + k / M * (W - 20); }
      function Y(val) { return H / 2 - val / mx * (H / 2 - 18); }
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
      [[simp, C.accent], [comp, C.grad]].forEach(function (s) {
        ctx.strokeStyle = s[1]; ctx.lineWidth = 2.5; ctx.beginPath();
        s[0].forEach(function (val, k) { if (k) ctx.lineTo(X(k), Y(val)); else ctx.moveTo(X(k), Y(val)); });
        ctx.stroke();
      });
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('response as the grating phase ψ goes 0 → 2π', 8, 13);
      read.innerHTML = 'Simple cell (blue line): its response swings with the phase of the grating, from strong excitation to strong inhibition.<br>' +
        'Complex cell ' + tx('c(I) = \\sqrt{s_0(I)^2 + s_1(I)^2}') + ' with a quadrature pair (' + tx('\\phi') + ' and ' + tx('\\phi + \\pi/2') + ', pink): nearly constant in ' + tx('\\psi') + ', so invariant to small shifts of the grating.<br>' +
        'Rotate the grating (' + tx('\\theta') + ') away from the cell\'s orientation ' + tx('\\tau') + ', or change its frequency, and both responses collapse: the cell is selective for orientation and spatial frequency.';
    }
    ids.forEach(function (id) { el[id].addEventListener('input', draw); });
    V.watch(cvW, draw);
  })();

  (function rf() {
    var cv = $('rf-canvas'); if (!cv) return;
    var layersIn = $('rf-layers'), kSel = $('rf-k'), strideChk = $('rf-stride'), out = $('rf-out');
    var W0 = 32, pick = null;

    function config() {
      var n = +layersIn.value, k = +kSel.value, widths = [W0], strides = [];
      for (var l = 1; l <= n; l++) {
        var st = strideChk.checked && l === 1 ? 2 : 1, w = Math.floor((widths[l - 1] - k) / st) + 1;
        if (w < 1) { n = l - 1; break; }
        widths.push(w); strides.push(st);
      }
      return { n: n, k: k, widths: widths, strides: strides };
    }

    function draw() {
      var cf = config(), S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, n = cf.n;
      $('rf-layerso').textContent = n;
      var cs = Math.min(22, (W - 20) / W0), rowH = Math.min(56, (H - 20) / (n + 1)), x0 = (W - W0 * cs) / 2;
      var top = cf.widths[n];
      if (pick === null || pick >= top) pick = Math.floor(top / 2);
      // backtrack the range [lo, hi] from the top cell to the input
      var ranges = []; ranges[n] = [pick, pick];
      for (var l = n; l >= 1; l--) { var st = cf.strides[l - 1]; ranges[l - 1] = [ranges[l][0] * st, ranges[l][1] * st + cf.k - 1]; }
      // cell centres per row: each output cell sits over the centre of its window in the row below
      var centres = [];
      centres[0] = []; for (var i = 0; i < W0; i++) centres[0].push(x0 + (i + .5) * cs);
      for (l = 1; l <= n; l++) {
        centres[l] = [];
        for (i = 0; i < cf.widths[l]; i++) { var a = i * cf.strides[l - 1], b = a + cf.k - 1; centres[l].push((centres[l - 1][a] + centres[l - 1][b]) / 2); }
      }
      function rowY(l) { return H - 16 - l * rowH; }
      // cone
      for (l = n; l >= 1; l--) {
        var r1 = ranges[l], r0 = ranges[l - 1], y1 = rowY(l) + cs / 2, y0 = rowY(l - 1) - cs / 2;
        ctx.fillStyle = V.rgba(C.accentRGB, .12);
        ctx.beginPath();
        ctx.moveTo(centres[l][r1[0]] - cs / 2, y1); ctx.lineTo(centres[l][r1[1]] + cs / 2, y1);
        ctx.lineTo(centres[l - 1][r0[1]] + cs / 2, y0); ctx.lineTo(centres[l - 1][r0[0]] - cs / 2, y0);
        ctx.closePath(); ctx.fill();
      }
      for (l = 0; l <= n; l++) {
        var y = rowY(l);
        for (i = 0; i < cf.widths[l]; i++) {
          var on = i >= ranges[l][0] && i <= ranges[l][1], x = centres[l][i] - cs / 2 + 1;
          ctx.fillStyle = on ? (l === n ? C.pos : C.accent) : C.mid;
          ctx.fillRect(x, y - cs / 2, cs - 2, cs - 2);
          ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y - cs / 2 + .5, cs - 3, cs - 3);
        }
        ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(l === 0 ? 'input' : 'layer ' + l + (cf.strides[l - 1] === 2 ? ' (stride 2)' : ''), 4, y - cs / 2 - 3);
      }
      var size = ranges[0][1] - ranges[0][0] + 1;
      out.innerHTML = 'The highlighted unit in layer ' + n + ' sees <b>' + size + '</b> input positions (receptive field ' + size + ' in 1-D, ' + tx(size + '\\times' + size) + ' in 2-D).' +
        (n ? ' Formula: ' + tx('r_l = r_{l-1} + (k - 1)\\prod_{i<l} s_i') + ' (strides ' + tx('s_i') + ').' : '');
      cv._geom = { centres: centres[n], cs: cs, y: rowY(n) };
    }
    cv.addEventListener('pointermove', function (e) {
      var g = cv._geom; if (!g) return;
      var p = V.pointer(e, cv); if (Math.abs(p.y - g.y) > 30) return;
      var best = 0, bd = Infinity; g.centres.forEach(function (c, i) { var d = Math.abs(c - p.x); if (d < bd) { bd = d; best = i; } });
      if (best !== pick) { pick = best; draw(); }
    });
    [layersIn, kSel, strideChk].forEach(function (el) { el.addEventListener('input', function () { pick = null; draw(); }); });
    V.watch(cv, draw);
  })();

  (function multiChannel() {
    var cv = $('mc-canvas'); if (!cv) return;
    var biasIn = $('mc-bias'), presetSel = $('mc-preset'), out = $('mc-out'), fBtns = document.querySelectorAll('#fig-mc [data-f]');
    var N = 6, M = 4, CH = ['R', 'G', 'B'], CHCOL = ['#e03131', '#2f9e44', '#1c7ed6'];
    // a small colour image: red square top-left, green diagonal, blue blob bottom-right
    var X = [new Float32Array(36), new Float32Array(36), new Float32Array(36)];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var k = r * N + c;
      X[0][k] = (r < 3 && c < 3) ? 1 : 0;
      X[1][k] = (r === c || r === c + 1) ? 1 : 0;
      X[2][k] = ((r - 4) * (r - 4) + (c - 4) * (c - 4) <= 2) ? 1 : 0;
    }
    var PRESETS = {
      redv: { name: 'Red vertical edge', w: [[1, 0, -1, 2, 0, -2, 1, 0, -1], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0]], b: 0 },
      gmb: { name: 'Green minus blue', w: [[0, 0, 0, 0, 0, 0, 0, 0, 0], [.3, .3, .3, .3, .3, .3, .3, .3, .3], [-.3, -.3, -.3, -.3, -.3, -.3, -.3, -.3, -.3]], b: -.5 },
      bright: { name: 'Overall brightness', w: [[.11, .11, .11, .11, .11, .11, .11, .11, .11], [.11, .11, .11, .11, .11, .11, .11, .11, .11], [.11, .11, .11, .11, .11, .11, .11, .11, .11]], b: -.3 },
      diag: { name: 'Green diagonal line', w: [[0, 0, 0, 0, 0, 0, 0, 0, 0], [1, -.5, -.5, -.5, 1, -.5, -.5, -.5, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0]], b: -1 }
    };
    var filters = [JSON.parse(JSON.stringify(PRESETS.redv)), JSON.parse(JSON.stringify(PRESETS.gmb))];
    var sel = 0, focus = { i: 1, j: 1 }, geom = null;

    function conv(f) { // per-channel partial maps, their sum, and the output after bias + ReLU
      var parts = [0, 1, 2].map(function () { return new Float32Array(M * M); }), sum = new Float32Array(M * M), outp = new Float32Array(M * M);
      for (var i = 0; i < M; i++) for (var j = 0; j < M; j++) {
        for (var ch = 0; ch < 3; ch++) {
          var s = 0;
          for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) s += f.w[ch][a * 3 + b] * X[ch][(i + a) * N + j + b];
          parts[ch][i * M + j] = s; sum[i * M + j] += s;
        }
        outp[i * M + j] = Math.max(0, sum[i * M + j] + f.b);
      }
      return { parts: parts, sum: sum, out: outp };
    }

    function grid(ctx, x, y, n, cs, val, colourFn, hi, label) {
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
        ctx.fillStyle = colourFn(val(i, j)); ctx.fillRect(x + j * cs, y + i * cs, cs, cs);
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.strokeRect(x + j * cs + .5, y + i * cs + .5, cs - 1, cs - 1);
      }
      if (hi) { ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.strokeRect(x + hi[1] * cs + 1, y + hi[0] * cs + 1, hi[2] * cs - 2, hi[2] * cs - 2); }
      if (label) { ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, x + n * cs / 2, y - 6); ctx.textAlign = 'left'; }
    }
    function sign(ctx, t, x, y) { ctx.fillStyle = C.ink; ctx.font = 'bold 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t, x, y); ctx.textAlign = 'left'; }

    function draw() {
      var W = cv.clientWidth, cs = Math.max(9, Math.min(20, W / 38)), rowH = N * cs + 30;
      cv.style.height = (3 * rowH + 20) + 'px';
      var S = V.setup(cv), ctx = S.ctx, f = filters[sel], R = conv(f), others = conv(filters[1 - sel]);
      var mAll = 1e-6; R.parts.forEach(function (p) { for (var q = 0; q < p.length; q++) mAll = Math.max(mAll, Math.abs(p[q])); });
      for (var q = 0; q < M * M; q++) mAll = Math.max(mAll, Math.abs(R.sum[q]), Math.abs(R.sum[q] + f.b));
      var wMax = 1e-6; f.w.forEach(function (w) { w.forEach(function (v) { wMax = Math.max(wMax, Math.abs(v)); }); });
      var x0 = 8, xK = x0 + N * cs + 2.2 * cs, xP = xK + 3 * cs + 2.2 * cs, xS = xP + M * cs + 3.2 * cs, xO = xS + M * cs + 3.6 * cs, xV = xO + M * cs + 3.4 * cs;
      var yMid = 20 + rowH + (N * cs - M * cs) / 2 + 10;
      var inHi = [focus.i, focus.j, 3], outHi = [focus.i, focus.j, 1];
      for (var ch = 0; ch < 3; ch++) {
        var y = 20 + ch * rowH + 10, chRGB = V.parse(CHCOL[ch]);
        grid(ctx, x0, y, N, cs, function (i, j) { return X[ch][i * N + j]; }, function (v) { return V.rgba(V.mix(C.midRGB, chRGB, v * .85)); }, inHi, 'input channel ' + CH[ch]);
        sign(ctx, '∗', xK - 1.1 * cs, y + N * cs / 2 + 5);
        var ky = y + (N - 3) * cs / 2;
        grid(ctx, xK, ky, 3, cs, function (i, j) { return f.w[ch][i * 3 + j]; }, function (v) { return V.rgba(V.diverge(v / wMax)); }, null, 'weights W[' + CH[ch] + ']');
        if (cs >= 14) {
          ctx.fillStyle = C.ink; ctx.font = (cs >= 18 ? 10 : 8) + 'px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
          for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) ctx.fillText(V.short(f.w[ch][a * 3 + b]), xK + b * cs + cs / 2, ky + a * cs + cs / 2 + 3);
          ctx.textAlign = 'left';
        }
        sign(ctx, '=', xP - 1.1 * cs, y + N * cs / 2 + 5);
        var py = y + (N - M) * cs / 2;
        grid(ctx, xP, py, M, cs, function (i, j) { return R.parts[ch][i * M + j]; }, function (v) { return V.rgba(V.diverge(v / mAll)); }, outHi, 'partial ' + CH[ch]);
        // arrows into the sum
        V.arrow(ctx, xP + M * cs + 4, py + M * cs / 2, xS - 6, yMid + M * cs / 2 + (ch - 1) * cs, C.border, 1.3);
      }
      grid(ctx, xS, yMid, M, cs, function (i, j) { return R.sum[i * M + j]; }, function (v) { return V.rgba(V.diverge(v / mAll)); }, outHi, 'Σ over channels');
      sign(ctx, '+b', xO - 1.8 * cs, yMid + M * cs / 2 + 5);
      ctx.fillStyle = C.muted; ctx.font = '10px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
      ctx.fillText('b = ' + V.short(f.b), xO - 1.8 * cs, yMid + M * cs / 2 + 22); ctx.fillText('then ReLU', xO - 1.8 * cs, yMid + M * cs / 2 + 34); ctx.textAlign = 'left';
      grid(ctx, xO, yMid, M, cs, function (i, j) { return R.out[i * M + j]; }, function (v) { return V.rgba(V.diverge(v / mAll)); }, outHi, 'output map ' + (sel + 1));
      // the full output volume: both filters' maps stacked
      var vy = yMid - 10, vx = xV;
      [1, 0].forEach(function (idx) {
        var res = idx === sel ? R : others, off = idx * .8 * cs;
        var mm = 1e-6; for (var q2 = 0; q2 < M * M; q2++) mm = Math.max(mm, res.out[q2]);
        ctx.globalAlpha = idx === sel ? 1 : .55;
        grid(ctx, vx + off, vy - off + 10, M, cs * .8, function (i, j) { return res.out[i * M + j]; }, function (v) { return V.rgba(V.diverge(v / mm)); }, null, null);
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('output volume 4×4×2', vx - 4, vy + M * cs * .8 + 30);
      geom = { x0: x0, xO: xO, xS: xS, xP: xP, yMid: yMid, cs: cs, rowH: rowH };
      explain(R, f);
    }

    function explain(R, f) {
      var i = focus.i, j = focus.j, k = i * M + j;
      out.innerHTML = '<h4>Output cell (' + i + ', ' + j + ') of filter ' + (sel + 1) + ': ' + PRESETS[filters[sel].key || ''] + '</h4>' +
        CH.map(function (c, ch) { return '<div class="eqline">' + tx('\\textstyle\\sum W_{\\text{' + c + '}} \\odot \\text{patch}_{\\text{' + c + '}} = ' + V.short(R.parts[ch][k])) + '</div>'; }).join('') +
        '<div class="eqline">' + tx('\\text{sum} = ' + R.parts.map(function (p) { return V.short(p[k]); }).join(' + ') + ' = ' + V.short(R.sum[k])) + '</div>' +
        '<div class="eqline">' + tx('\\text{sum} + b = ' + V.short(R.sum[k]) + ' + (' + V.short(f.b) + ') = ' + V.short(R.sum[k] + f.b) + ' \\;\\xrightarrow{\\text{ReLU}}\\; \\mathbf{' + V.short(R.out[k]) + '}') + '</div>' +
        '<p style="margin-top:6px">This filter has ' + tx('3\\times3\\times3 = 27') + ' weights + 1 bias = <b>28 parameters</b>; the layer with 2 filters has 56. ' +
        'The same 28 numbers are reused at all 16 output positions.</p>';
      out.querySelector('h4').textContent = 'Output cell (' + i + ', ' + j + ') of filter ' + (sel + 1) + ' — ' + filters[sel].name;
    }

    function syncControls() {
      biasIn.value = filters[sel].b; $('mc-biaso').textContent = V.short(filters[sel].b);
      presetSel.value = filters[sel].key;
      fBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.f === sel)); });
    }
    filters[0].key = 'redv'; filters[1].key = 'gmb';
    fBtns.forEach(function (b) { b.addEventListener('click', function () { sel = +b.dataset.f; syncControls(); draw(); }); });
    biasIn.addEventListener('input', function () { filters[sel].b = parseFloat(biasIn.value); $('mc-biaso').textContent = V.short(filters[sel].b); draw(); });
    presetSel.addEventListener('change', function () {
      var p = JSON.parse(JSON.stringify(PRESETS[presetSel.value])); p.key = presetSel.value; filters[sel] = p; syncControls(); draw();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!geom) return;
      var p = V.pointer(e, cv), g = geom, hit = null;
      [g.xP, g.xS, g.xO].forEach(function (x) {
        var i = Math.floor((p.y - g.yMid) / g.cs), j = Math.floor((p.x - x) / g.cs);
        if (x === g.xP) { // partial maps sit in the three rows
          for (var ch = 0; ch < 3; ch++) {
            var py = 20 + ch * g.rowH + 10 + (N - M) * g.cs / 2, ii = Math.floor((p.y - py) / g.cs);
            if (j >= 0 && j < M && ii >= 0 && ii < M) hit = { i: ii, j: j };
          }
        } else if (i >= 0 && i < M && j >= 0 && j < M) hit = { i: i, j: j };
      });
      if (!hit) { // hovering the input: use the window whose top-left is under the pointer
        var ii2, jj2;
        for (var ch2 = 0; ch2 < 3; ch2++) {
          var y = 20 + ch2 * g.rowH + 10; ii2 = Math.floor((p.y - y) / g.cs); jj2 = Math.floor((p.x - g.x0) / g.cs);
          if (ii2 >= 0 && ii2 < N && jj2 >= 0 && jj2 < N) hit = { i: V.clamp(ii2 - 1, 0, M - 1), j: V.clamp(jj2 - 1, 0, M - 1) };
        }
      }
      if (hit && (hit.i !== focus.i || hit.j !== focus.j)) { focus = hit; draw(); }
    });
    syncControls();
    V.watch(cv, draw);
  })();

  // Figure 9.11. Kernel sizes are not given in the figure; 3×3 convolutions with "same" padding are assumed.
  var ARCHS = {
    fixed: { input: [256, 256, 3], layers: [
      { t: 'conv', f: 64, k: 3, s: 1, p: 1 }, { t: 'pool', k: 4 }, { t: 'conv', f: 64, k: 3, s: 1, p: 1 }, { t: 'pool', k: 4 },
      { t: 'flatten' }, { t: 'fc', u: 1000 }] },
    variable: { input: [256, 256, 3], layers: [
      { t: 'conv', f: 64, k: 3, s: 1, p: 1 }, { t: 'pool', k: 4 }, { t: 'conv', f: 64, k: 3, s: 1, p: 1 }, { t: 'apool', g: 3 },
      { t: 'flatten' }, { t: 'fc', u: 1000 }] },
    fullyconv: { input: [256, 256, 3], layers: [
      { t: 'conv', f: 64, k: 3, s: 1, p: 1 }, { t: 'pool', k: 4 }, { t: 'conv', f: 64, k: 3, s: 1, p: 1 }, { t: 'pool', k: 4 },
      { t: 'conv', f: 1000, k: 3, s: 1, p: 1 }, { t: 'gap' }] }
  };

  (function arch() {
    var cv = $('ar-canvas'); if (!cv) return;
    var tbody = $('ar-body'), total = $('ar-total'), preset = $('ar-preset');
    var net, rows = [], hl = -1;

    function load(name) { net = JSON.parse(JSON.stringify(ARCHS[name])); build(); }

    function trace() {
      var h = net.input[0], w = net.input[1], c = net.input[2], rf = 1, jump = 1, bad = false, flat = null, out = [];
      out.push({ shape: [h, w, c], params: 0, rf: 1, kind: 'input' });
      net.layers.forEach(function (L) {
        var o = { params: 0, kind: L.t };
        if (bad) { o.bad = true; out.push(o); return; }
        if (L.t === 'conv') {
          var ho = Math.floor((h + 2 * L.p - L.k) / L.s) + 1, wo = Math.floor((w + 2 * L.p - L.k) / L.s) + 1;
          o.params = L.k * L.k * c * L.f + L.f; if (rf !== null) rf += (L.k - 1) * jump; jump *= L.s;
          h = ho; w = wo; c = L.f;
        } else if (L.t === 'pool') {
          h = Math.floor(h / L.k); w = Math.floor(w / L.k); if (rf !== null) rf += (L.k - 1) * jump; jump *= L.k;
        } else if (L.t === 'apool') { // pooling regions scale with the input so the output grid is fixed
          if (h < L.g || w < L.g) { h = 0; } else { h = L.g; w = L.g; } rf = null;
        } else if (L.t === 'flatten') { flat = h * w * c; }
        else if (L.t === 'gap') { flat = c; rf = Infinity; }
        else if (L.t === 'fc') { var nin = flat == null ? h * w * c : flat; o.params = nin * L.u + L.u; flat = L.u; rf = Infinity; }
        if (h <= 0 || w <= 0) { bad = true; o.bad = true; }
        o.shape = flat == null ? [h, w, c] : [flat]; o.rf = L.t === 'flatten' ? rf : rf;
        out.push(o);
      });
      return out;
    }

    function inputFor(L, i, key, min, max) {
      return '<input class="vnum" type="number" min="' + min + '" max="' + max + '" value="' + L[key] + '" data-i="' + i + '" data-key="' + key + '" aria-label="' + key + '">';
    }
    function build() {
      var h = '<tr data-row="0"><td>0</td><td>Input</td><td>' + inputFor({ v: net.input[0] }, -1, 'v', 8, 1024).replace('data-key="v"', 'data-key="in"') + ' × same, 3 channels</td>';
      h += '<td class="num" data-shape="0"></td><td class="num" data-par="0"></td><td class="num" data-rf="0"></td></tr>';
      net.layers.forEach(function (L, i) {
        var set = '';
        if (L.t === 'conv') set = inputFor(L, i, 'f', 1, 1024) + ' filters, ' + inputFor(L, i, 'k', 1, 11) + ' k, s ' + inputFor(L, i, 's', 1, 4) + ' p ' + inputFor(L, i, 'p', 0, 5);
        else if (L.t === 'pool') set = inputFor(L, i, 'k', 1, 8) + '×' + L.k + ' max, stride ' + L.k;
        else if (L.t === 'apool') set = 'to a fixed ' + inputFor(L, i, 'g', 1, 8) + '×' + L.g + ' grid';
        else if (L.t === 'fc') set = inputFor(L, i, 'u', 1, 4096) + ' units';
        else if (L.t === 'flatten') set = 'reshape to a vector';
        else set = 'average each channel';
        var name = { conv: 'Conv + ReLU', pool: 'Max-pool', apool: 'Pool (variable regions)', flatten: 'Reshape to vector', fc: 'Matrix multiply', gap: 'Average pool' }[L.t];
        h += '<tr data-row="' + (i + 1) + '"><td>' + (i + 1) + '</td><td>' + name + '</td><td>' + set + '</td>' +
             '<td class="num" data-shape="' + (i + 1) + '"></td><td class="num" data-par="' + (i + 1) + '"></td><td class="num" data-rf="' + (i + 1) + '"></td></tr>';
      });
      tbody.innerHTML = h;
      update();
    }

    function update() {
      rows = trace();
      var sum = 0;
      rows.forEach(function (o, i) {
        var tr = tbody.querySelector('[data-row="' + i + '"]');
        tr.classList.toggle('err', !!o.bad); tr.classList.toggle('hl', i === hl);
        tbody.querySelector('[data-shape="' + i + '"]').innerHTML = o.bad ? 'invalid' : tx(o.shape.join(' \\times '));
        tbody.querySelector('[data-par="' + i + '"]').textContent = o.params ? o.params.toLocaleString('en-US') : '—';
        tbody.querySelector('[data-rf="' + i + '"]').innerHTML = o.bad ? '' : o.rf === Infinity ? 'whole image' : o.rf === null ? 'grows with input' : tx(o.rf + '\\times' + o.rf);
        sum += o.params || 0;
      });
      total.innerHTML = 'Total parameters: <b>' + sum.toLocaleString('en-US') + '</b>';
      draw();
    }

    // Each layer's output drawn as a 3-D volume: height ~ spatial size, thickness ~ channels.
    function draw() {
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, n = rows.length, gap = W / n, base = H - 34;
      var maxSp = rows[0].shape[0], maxH = base - 30;
      rows.forEach(function (o, i) {
        var cx = gap * (i + .5), col = o.kind === 'input' ? C.neg : o.kind === 'pool' ? C.muted : o.kind === 'conv' ? C.fwd : C.pos;
        if (o.bad) col = C.grad;
        ctx.globalAlpha = hl === -1 || hl === i ? 1 : .4;
        if (o.bad || !o.shape) {
          ctx.fillStyle = col; ctx.fillRect(cx - 4, base - 20, 8, 20);
        } else if (o.shape.length === 3) {
          var side = 14 + (maxH - 14) * Math.sqrt(o.shape[0] / maxSp) * .72, thick = Math.min(gap * .45, 3 + 4.2 * Math.log2(o.shape[2] + 1));
          var d = side * .5, x = cx - (thick + d * .7) / 2;
          V.box3d(ctx, x, base - side, thick, side, d, col, C.ink);
          if (hl === i) { ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.strokeRect(x - 2, base - side - 2, thick + 4, side + 4); }
        } else {
          var hgt = Math.min(maxH, 12 + 14 * Math.log2(o.shape[0] + 1));
          ctx.fillStyle = col; ctx.strokeStyle = hl === i ? C.accent : C.ink; ctx.lineWidth = hl === i ? 2.5 : 1;
          ctx.fillRect(cx - 4, base - hgt, 8, hgt); ctx.strokeRect(cx - 4, base - hgt, 8, hgt);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = hl === i ? C.ink : C.muted; ctx.font = (W < 600 ? 9 : 10) + 'px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
        var lbl = o.bad ? '✕' : o.shape.length === 3 ? o.shape[0] + '×' + o.shape[1] + '×' + o.shape[2] : String(o.shape[0]);
        ctx.fillText(lbl, cx, base + 15);
        ctx.fillText(o.kind === 'input' ? 'input' : o.kind === 'fc' ? 'FC' : o.kind, cx, base + 28);
        ctx.textAlign = 'left';
        if (i) V.arrow(ctx, cx - gap * .62, base - 6, cx - gap * .38, base - 6, C.border, 1.2);
      });
    }

    tbody.addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset.key) return;
      var v = parseInt(t.value, 10); if (isNaN(v) || v < +t.min) return;
      if (t.dataset.key === 'in') { net.input[0] = v; net.input[1] = v; update(); return; }
      net.layers[+t.dataset.i][t.dataset.key] = v;
      var Lx = net.layers[+t.dataset.i], td = t.closest('td');
      if (Lx.t === 'pool') td.lastChild.textContent = '×' + v + ' max, stride ' + v;
      if (Lx.t === 'apool') td.lastChild.textContent = '×' + v + ' grid';
      update();
    });
    tbody.addEventListener('pointerover', function (e) { var tr = e.target.closest('tr'); var i = tr ? +tr.dataset.row : -1; if (i !== hl) { hl = i; update(); } });
    tbody.addEventListener('pointerleave', function () { hl = -1; update(); });
    preset.addEventListener('change', function () { load(preset.value); });
    load('fixed');
    V.watch(cv, draw);
  })();

  (function tinyCNN() {
    var netC = $('tc-net'); if (!netC) return;
    var filtC = $('tc-filters'), fcC = $('tc-fc'), lossC = $('tc-loss'), padC = $('tc-pad'), probsEl = $('tc-probs'), statEl = $('tc-stats');
    var btnPlay = $('tc-play'), btnStep = $('tc-step'), btnReset = $('tc-reset'), btnSample = $('tc-sample'), btnClear = $('tc-clear'), lrSel = $('tc-lr');
    var NAMES = ['vertical', 'horizontal', 'diagonal', 'box'], NI = 12, NF = 4, NC = 10, NP = 5, NH = NP * NP * NF, NK = 4;
    var K, b1, W2, b2, train, test, sample, hist = [], steps = 0, playing = false, seed = 1, drawn = false, painting = null;
    var vis = V.visibility($('fig-tiny'));

    function make(cls, r) {
      var img = new Float32Array(NI * NI), v = .75 + r() * .25, i, len, x, y;
      function put(yy, xx) { if (yy >= 0 && yy < NI && xx >= 0 && xx < NI) img[yy * NI + xx] = v; }
      if (cls === 0 || cls === 1) {
        len = 5 + Math.floor(r() * 6); var a = Math.floor(r() * NI), s0 = Math.floor(r() * (NI - len + 1)), thick = r() < .3 ? 2 : 1;
        for (i = 0; i < len; i++) for (var t = 0; t < thick; t++) { if (cls === 0) put(s0 + i, a + t); else put(a + t, s0 + i); }
      } else if (cls === 2) {
        len = 5 + Math.floor(r() * 5); x = Math.floor(r() * (NI - len + 1)); y = Math.floor(r() * (NI - len + 1)); var up = r() < .5;
        for (i = 0; i < len; i++) put(y + i, up ? x + len - 1 - i : x + i);
      } else {
        var w = 4 + Math.floor(r() * 5), h = 4 + Math.floor(r() * 5); x = Math.floor(r() * (NI - w + 1)); y = Math.floor(r() * (NI - h + 1));
        for (i = 0; i < w; i++) { put(y, x + i); put(y + h - 1, x + i); }
        for (i = 0; i < h; i++) { put(y + i, x); put(y + i, x + w - 1); }
      }
      for (i = 0; i < img.length; i++) if (r() < .06) img[i] = Math.max(img[i], r() * .5);
      return { x: img, c: cls };
    }
    function dataset(n, s) { var r = V.rng(s), out = []; for (var i = 0; i < n; i++) out.push(make(i % NK, r)); return out; }

    function init() {
      var r = V.rng(seed * 101 + 7);
      K = new Float64Array(NF * 9); for (var i = 0; i < K.length; i++) K[i] = V.randn(r) * Math.sqrt(2 / 9);
      b1 = new Float64Array(NF);
      W2 = new Float64Array(NK * NH); for (i = 0; i < W2.length; i++) W2[i] = V.randn(r) * Math.sqrt(1 / NH);
      b2 = new Float64Array(NK);
      hist = []; steps = 0; record();
    }

    function forward(x) {
      var z1 = new Float64Array(NF * NC * NC), a1 = new Float64Array(NF * NC * NC), h = new Float64Array(NH), arg = new Int32Array(NH), f, i, j, a, b;
      for (f = 0; f < NF; f++) for (i = 0; i < NC; i++) for (j = 0; j < NC; j++) {
        var s = b1[f];
        for (a = 0; a < 3; a++) for (b = 0; b < 3; b++) s += K[f * 9 + a * 3 + b] * x[(i + a) * NI + j + b];
        var k = (f * NC + i) * NC + j; z1[k] = s; a1[k] = s > 0 ? s : 0;
      }
      for (f = 0; f < NF; f++) for (i = 0; i < NP; i++) for (j = 0; j < NP; j++) {
        var best = -1, bi = 0;
        for (a = 0; a < 2; a++) for (b = 0; b < 2; b++) { var kk = (f * NC + 2 * i + a) * NC + 2 * j + b; if (a1[kk] > best) { best = a1[kk]; bi = kk; } }
        var hk = (f * NP + i) * NP + j; h[hk] = best; arg[hk] = bi;
      }
      var o = new Float64Array(NK), m = -Infinity;
      for (var c = 0; c < NK; c++) { var t = b2[c]; for (i = 0; i < NH; i++) t += W2[c * NH + i] * h[i]; o[c] = t; if (t > m) m = t; }
      var sum = 0, p = new Float64Array(NK); for (c = 0; c < NK; c++) { p[c] = Math.exp(o[c] - m); sum += p[c]; } for (c = 0; c < NK; c++) p[c] /= sum;
      return { z1: z1, a1: a1, h: h, arg: arg, p: p };
    }

    function trainBatch(batch, lr) {
      var gK = new Float64Array(K.length), gb1 = new Float64Array(NF), gW2 = new Float64Array(W2.length), gb2 = new Float64Array(NK);
      batch.forEach(function (s) {
        var F = forward(s.x), c, i;
        var d = new Float64Array(NK); for (c = 0; c < NK; c++) d[c] = F.p[c] - (c === s.c ? 1 : 0);       // ∂L/∂logits
        var dh = new Float64Array(NH);
        for (c = 0; c < NK; c++) { gb2[c] += d[c]; for (i = 0; i < NH; i++) { gW2[c * NH + i] += d[c] * F.h[i]; dh[i] += W2[c * NH + i] * d[c]; } }
        var dz1 = new Float64Array(F.z1.length);
        for (i = 0; i < NH; i++) { var k = F.arg[i]; if (F.z1[k] > 0) dz1[k] += dh[i]; }          // max-pool routes, ReLU gates
        for (var f = 0; f < NF; f++) for (var y = 0; y < NC; y++) for (var x = 0; x < NC; x++) {
          var g = dz1[(f * NC + y) * NC + x]; if (!g) continue;
          gb1[f] += g;
          for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) gK[f * 9 + a * 3 + b] += g * s.x[(y + a) * NI + x + b];
        }
      });
      var n = batch.length, i;
      for (i = 0; i < K.length; i++) K[i] -= lr * gK[i] / n;
      for (i = 0; i < NF; i++) b1[i] -= lr * gb1[i] / n;
      for (i = 0; i < W2.length; i++) W2[i] -= lr * gW2[i] / n;
      for (i = 0; i < NK; i++) b2[i] -= lr * gb2[i] / n;
    }

    function evaluate(set) {
      var loss = 0, hit = 0;
      set.forEach(function (s) { var p = forward(s.x).p, best = 0; for (var c = 1; c < NK; c++) if (p[c] > p[best]) best = c; loss -= Math.log(Math.max(p[s.c], 1e-9)); if (best === s.c) hit++; });
      return { loss: loss / set.length, acc: hit / set.length };
    }
    function record() { hist.push({ tr: evaluate(train.slice(0, 200)), te: evaluate(test) }); }
    function run(nBatches) {
      var lr = parseFloat(lrSel.value);
      for (var b = 0; b < nBatches; b++) {
        var batch = []; for (var i = 0; i < 20; i++) batch.push(train[Math.floor(Math.random() * train.length)]);
        trainBatch(batch, lr); steps++;
      }
      record();
    }

    /* ---- drawing ---- */
    function img(ctx, x, y, size, n, val, colour) {
      var cs = size / n;
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) { ctx.fillStyle = colour(val(i, j)); ctx.fillRect(x + j * cs, y + i * cs, Math.ceil(cs), Math.ceil(cs)); }
      ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, size - 1, size - 1);
    }
    function inkColour(v) { return V.rgba(V.mix(C.midRGB, C.inkRGB, Math.min(1, v) * .9)); }
    function actColour(m) { return function (v) { return V.rgba(V.mix(C.midRGB, C.posRGB, Math.min(1, v / m))); }; }

    function drawNet() {
      var S = V.setup(netC), ctx = S.ctx, W = S.w, H = S.h, F = forward(sample.x);
      var big = Math.min(96, H - 60, W / 7), small = Math.min(52, (H - 50) / 4.5), cols = [W * .02, W * .2, W * .42, W * .62, W * .8];
      var top = 22, mA = 1e-6; for (var q = 0; q < F.a1.length; q++) mA = Math.max(mA, F.a1[q]);
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = C.muted;
      function title(t, x) { ctx.fillText(t, x, 12); }
      title('input 12×12×1', cols[0]); title('conv + ReLU: 10×10×4', cols[1]); title('max-pool: 5×5×4', cols[2]); title('flatten → 100', cols[3]); title('FC + softmax → 4', cols[4]);
      var yIn = top + (H - top - big) / 2;
      img(ctx, cols[0], yIn, big, NI, function (i, j) { return sample.x[i * NI + j]; }, inkColour);
      var gap = (H - top - 4 * small) / 5;
      for (var f = 0; f < NF; f++) {
        var y = top + gap + f * (small + gap);
        img(ctx, cols[1], y, small, NC, function (i, j) { return F.a1[(f * NC + i) * NC + j]; }, actColour(mA));
        img(ctx, cols[2], y + small * .25, small * .5, NP, function (i, j) { return F.h[(f * NP + i) * NP + j]; }, actColour(mA));
        V.arrow(ctx, cols[0] + big + 4, yIn + big / 2, cols[1] - 4, y + small / 2, V.rgba(C.inkRGB, .25), 1);
        V.arrow(ctx, cols[1] + small + 4, y + small / 2, cols[2] - 4, y + small / 2, V.rgba(C.inkRGB, .25), 1);
        V.arrow(ctx, cols[2] + small * .5 + 4, y + small / 2, cols[3] - 4, H / 2, V.rgba(C.inkRGB, .25), 1);
      }
      // flattened vector as a thin column
      var vh = H - top - 20, vx = cols[3] + 4, mh = 1e-6; for (q = 0; q < NH; q++) mh = Math.max(mh, F.h[q]);
      for (q = 0; q < NH; q++) { ctx.fillStyle = V.rgba(V.mix(C.midRGB, C.posRGB, F.h[q] / mh)); ctx.fillRect(vx, top + 10 + q * vh / NH, 10, Math.ceil(vh / NH)); }
      ctx.strokeStyle = C.border; ctx.strokeRect(vx + .5, top + 10.5, 9, vh - 1);
      // class probabilities
      var bw = W - cols[4] - 10, best = 0; for (var c = 1; c < NK; c++) if (F.p[c] > F.p[best]) best = c;
      for (c = 0; c < NK; c++) {
        var yy = top + 20 + c * (H - top - 30) / NK;
        V.arrow(ctx, vx + 14, top + 10 + vh / 2, cols[4] - 4, yy + 6, V.rgba(C.inkRGB, .2), 1);
        ctx.fillStyle = c === best ? C.ink : C.muted; ctx.font = (c === best ? 'bold ' : '') + '11px system-ui, sans-serif';
        ctx.fillText(NAMES[c], cols[4], yy);
        ctx.fillStyle = C.mid; ctx.fillRect(cols[4], yy + 4, bw, 8);
        ctx.fillStyle = c === best ? C.accent : C.muted; ctx.fillRect(cols[4], yy + 4, bw * F.p[c], 8);
        ctx.fillStyle = C.muted; ctx.font = '10px ui-monospace, Consolas, monospace'; ctx.fillText(Math.round(F.p[c] * 100) + '%', cols[4] + bw - 28, yy);
      }
      ctx.fillStyle = C.grad; ctx.font = '10px ui-monospace, Consolas, monospace';
      ctx.fillText('W₁ 4×3×3, b₁ 4', cols[0] + big + 6, H - 6);
      ctx.fillText('W₂ 4×100, b₂ 4', cols[3] + 18, H - 6);
      probsEl.innerHTML = (drawn ? 'Your drawing' : 'Sample (true class: <b>' + NAMES[sample.c] + '</b>)') + ' → predicted <b>' + NAMES[best] + '</b> (' + Math.round(F.p[best] * 100) + '%)';
    }

    function drawFilters() {
      var S = V.setup(filtC), ctx = S.ctx, W = S.w, H = S.h, cell = Math.min((W - 10) / NF, H - 30), m = 1e-6;
      for (var q = 0; q < K.length; q++) m = Math.max(m, Math.abs(K[q]));
      for (var f = 0; f < NF; f++) {
        var x = 4 + f * (W - 8) / NF, sz = Math.min(cell - 12, H - 34);
        for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) {
          ctx.fillStyle = V.rgba(V.diverge(K[f * 9 + a * 3 + b] / m)); ctx.fillRect(x + b * sz / 3, 4 + a * sz / 3, Math.ceil(sz / 3), Math.ceil(sz / 3));
        }
        ctx.strokeStyle = C.border; ctx.strokeRect(x + .5, 4.5, sz - 1, sz - 1);
        ctx.fillStyle = C.muted; ctx.font = '10px ui-monospace, Consolas, monospace';
        ctx.fillText('filter ' + (f + 1), x, sz + 16); ctx.fillText('b = ' + fmt(b1[f], 2), x, sz + 28);
      }
    }

    function drawFC() {
      var S = V.setup(fcC), ctx = S.ctx, W = S.w, H = S.h, m = 1e-6, labelW = 70;
      for (var q = 0; q < W2.length; q++) m = Math.max(m, Math.abs(W2[q]));
      var cell = Math.min((W - labelW - 60) / NF - 6, (H - 20) / NK - 8);
      ctx.font = '10px system-ui, sans-serif';
      for (var c = 0; c < NK; c++) {
        var y = 16 + c * (cell + 8);
        ctx.fillStyle = C.muted; ctx.fillText(NAMES[c], 2, y + cell / 2 + 3);
        for (var f = 0; f < NF; f++) {
          var x = labelW + f * (cell + 6);
          for (var i = 0; i < NP; i++) for (var j = 0; j < NP; j++) {
            ctx.fillStyle = V.rgba(V.diverge(W2[c * NH + (f * NP + i) * NP + j] / m));
            ctx.fillRect(x + j * cell / NP, y + i * cell / NP, Math.ceil(cell / NP), Math.ceil(cell / NP));
          }
          ctx.strokeStyle = C.border; ctx.strokeRect(x + .5, y + .5, cell - 1, cell - 1);
        }
        ctx.fillStyle = C.muted; ctx.font = '10px ui-monospace, Consolas, monospace';
        ctx.fillText('b ' + fmt(b2[c], 2), labelW + NF * (cell + 6) + 4, y + cell / 2 + 3); ctx.font = '10px system-ui, sans-serif';
      }
      ctx.fillStyle = C.muted;
      for (var f2 = 0; f2 < NF; f2++) ctx.fillText('from map ' + (f2 + 1), labelW + f2 * (cell + 6), 10);
    }

    function drawLoss() {
      var S = V.setup(lossC), ctx = S.ctx, W = S.w, H = S.h, n = hist.length, ymax = .1;
      hist.forEach(function (h) { ymax = Math.max(ymax, Math.min(2, h.tr.loss), Math.min(2, h.te.loss)); });
      function X(i) { return 4 + (n > 1 ? i / (n - 1) : 0) * (W - 8); }
      function Y(v) { return H - 4 - Math.min(v, ymax) / ymax * (H - 18); }
      [['te', C.muted, [5, 4]], ['tr', C.accent, []]].forEach(function (sr) {
        ctx.strokeStyle = sr[1]; ctx.lineWidth = 2; ctx.setLineDash(sr[2]); ctx.beginPath();
        hist.forEach(function (h, i) { if (i) ctx.lineTo(X(i), Y(h[sr[0]].loss)); else ctx.moveTo(X(i), Y(h[sr[0]].loss)); });
        ctx.stroke();
      });
      ctx.setLineDash([]); ctx.fillStyle = C.muted; ctx.font = '10px system-ui, sans-serif'; ctx.fillText('cross-entropy loss', 6, 11);
      var h = hist[n - 1];
      statEl.innerHTML = '<span>Steps <b>' + steps + '</b></span><span><b>Train</b> acc ' + Math.round(h.tr.acc * 100) + '%</span><span><b>Test</b> acc ' + Math.round(h.te.acc * 100) + '%</span>';
    }

    function drawPad() {
      var S = V.setup(padC), ctx = S.ctx, W = S.w;
      img(ctx, 0, 0, W, NI, function (i, j) { return sample.x[i * NI + j]; }, inkColour);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (var k = 1; k < NI; k++) { ctx.beginPath(); ctx.moveTo(k * W / NI, 0); ctx.lineTo(k * W / NI, W); ctx.moveTo(0, k * W / NI); ctx.lineTo(W, k * W / NI); ctx.stroke(); }
    }

    function render() { drawNet(); drawFilters(); drawFC(); drawLoss(); drawPad(); }

    function frame() {
      if (!playing) return;
      if (vis.on) { run(6); render(); }
      if (steps > 3000) setPlaying(false);
      requestAnimationFrame(frame);
    }
    function setPlaying(on) { playing = on; btnPlay.textContent = on ? '❚❚ Pause' : '▶ Train'; if (on) frame(); }
    btnPlay.addEventListener('click', function () { setPlaying(!playing); });
    btnStep.addEventListener('click', function () { setPlaying(false); run(1); render(); });
    btnReset.addEventListener('click', function () { setPlaying(false); seed++; init(); render(); });
    btnSample.addEventListener('click', function () { drawn = false; sample = test[Math.floor(Math.random() * test.length)]; render(); });
    btnClear.addEventListener('click', function () { drawn = true; sample = { x: new Float32Array(NI * NI), c: -1 }; render(); });

    function padCell(e) { var p = V.pointer(e, padC), cs = padC.clientWidth / NI, i = Math.floor(p.y / cs), j = Math.floor(p.x / cs); return (i >= 0 && j >= 0 && i < NI && j < NI) ? i * NI + j : -1; }
    padC.addEventListener('pointerdown', function (e) {
      var k = padCell(e); if (k < 0) return;
      if (!drawn) { sample = { x: Float32Array.from(sample.x), c: -1 }; drawn = true; }
      painting = sample.x[k] > .5 ? 0 : 1; sample.x[k] = painting; padC.setPointerCapture(e.pointerId); render();
    });
    padC.addEventListener('pointermove', function (e) { if (painting === null) return; var k = padCell(e); if (k >= 0 && sample.x[k] !== painting) { sample.x[k] = painting; render(); } });
    padC.addEventListener('pointerup', function () { painting = null; });

    train = dataset(800, 11); test = dataset(200, 99); sample = test[2];
    init();
    V.watch(netC, render);
  })();
})();
