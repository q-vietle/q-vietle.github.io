/* Widgets for "Deep feedforward networks" (after Goodfellow, Bengio & Courville, Deep Learning, ch. 6):
   XOR (6.1), output units (6.2.2), hidden units (6.3), approximation and depth (6.4),
   forward/backward pass (6.5.4), back-propagation as table filling (6.5.3), and a training playground. */
(function () {
  'use strict';

  var V = window.Viz, C = V.C, fmt = V.fmt, pf = V.pfmt, tx = V.tex;
  function $(id) { return document.getElementById(id); }
  var SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  function sub(n) { return String(n).split('').map(function (d) { return SUB[+d]; }).join(''); }

  /* ================================================================
     6.1  Learning XOR: f(x; W, c, w, b) = wᵀ max{0, Wᵀx + c} + b   (eq. 6.3)
     ================================================================ */
  (function xor() {
    var cvX = $('xor-x'); if (!cvX) return;
    var cvH = $('xor-h'), read = $('xor-read'), explain = $('xor-explain'), inputs = $('xor-params');
    var trainRow = $('xor-trainrow'), btnTrain = $('xor-train'), status = $('xor-status');
    var modeBtns = document.querySelectorAll('#fig-xor [data-mode]');
    var X = [[0, 0], [0, 1], [1, 0], [1, 1]], Y = [0, 1, 1, 0], NAMES = ['(0, 0)', '(0, 1)', '(1, 0)', '(1, 1)'];
    var P, mode = 'book', timer = null, seed = 8, steps = 0, MAX_STEPS = 4000;
    var BOOK = { W: [[1, 1], [1, 1]], c: [0, -1], w: [1, -2], b: 0 };

    var T = V.tex;
    var EXPLAIN = {
      linear: '<b>① A straight line, no hidden layer.</b> The model is ' + T('f(x) = w_1x_1 + w_2x_2 + b') + ', which draws one straight boundary through the input space. ' +
        'The best such model for XOR (the one with the lowest squared error) is ' + T('w_1 = w_2 = 0,\\; b = 0.5') + ': it answers 0.5, "not sure", for every input. ' +
        'No straight line can put both orange points on one side and both blue points on the other.',
      book: '<b>② Hand-picked weights: one hidden layer with 2 ReLU units.</b> These are the weights given in the <em>Deep Learning</em> book to show that a solution exists. Nothing is learned here. ' +
        'Follow each input through the table: the hidden layer sends ' + T('x = (0, 1)') + ' and ' + T('x = (1, 0)') + ' to the <em>same</em> point ' + T('h = (1, 0)') + ' (right plot). In this new space a straight line (dashed) separates the 1s from the 0s, so the output layer gets every answer right.',
      train: '<b>③ Learn the weights by gradient descent.</b> The same network as ②, but the nine weights start at <em>random</em> values. ' +
        'At each step the network computes its error on the four points and nudges every weight in the direction that reduces the error (this is training). ' +
        'Watch the points move in the right plot until a straight line can split them. Different random starts give different solutions, and some runs get stuck: in our tests only about half of the random starts solved XOR.'
    };

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function pre(x) { return [0, 1].map(function (i) { return x[0] * P.W[0][i] + x[1] * P.W[1][i] + P.c[i]; }); }
    function hidden(x) { return pre(x).map(function (v) { return Math.max(0, v); }); }
    function out(x) {
      if (mode === 'linear') return .5; // least-squares linear model: w = 0, b = 1/2
      var h = hidden(x); return P.w[0] * h[0] + P.w[1] * h[1] + P.b;
    }
    function loss() { var s = 0; X.forEach(function (x, n) { var e = Y[n] - out(x); s += e * e; }); return s / 4; }
    function f2(v) { return fmt(v, 2).replace(/\.00$/, '').replace(/^-0$/, '0'); }
    function vec(v) { return '(' + v.map(f2).join(',\\ ') + ')'; }
    function tvec(v) { return T(vec(v)); }
    function col(v) { return '\\begin{bmatrix}' + v.map(f2).join('\\\\') + '\\end{bmatrix}'; }

    function plot(cv, R, fnBg, pts, labelX, labelY) {
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h;
      function PX(v) { return (v - R[0]) / (R[1] - R[0]) * W; }
      function PY(v) { return H - (v - R[2]) / (R[3] - R[2]) * H; }
      V.heatmap(ctx, 0, 0, W, H, 60, function (u, v) {
        return V.clamp(2 * fnBg(R[0] + u * (R[1] - R[0]), R[3] - v * (R[3] - R[2])) - 1, -1, 1) * .75;
      });
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (var g = Math.ceil(R[0]); g <= R[1]; g++) { ctx.beginPath(); ctx.moveTo(PX(g), 0); ctx.lineTo(PX(g), H); ctx.stroke(); }
      for (g = Math.ceil(R[2]); g <= R[3]; g++) { ctx.beginPath(); ctx.moveTo(0, PY(g)); ctx.lineTo(W, PY(g)); ctx.stroke(); }
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
      for (g = Math.ceil(R[0]); g <= R[1]; g++) ctx.fillText(String(g), PX(g) + 3, H - 4);
      for (g = Math.ceil(R[2]); g <= R[3]; g++) ctx.fillText(String(g), 3, PY(g) - 3);
      ctx.fillText(labelX, W - 20, H - 16); ctx.fillText(labelY, 22, 14);
      var seen = {};
      pts.forEach(function (p) {
        var key = p.p[0].toFixed(2) + ',' + p.p[1].toFixed(2), k = seen[key] = (seen[key] || 0) + 1;
        var x = PX(p.p[0]), y = PY(p.p[1]);
        ctx.beginPath(); ctx.arc(x, y, 9, 0, 7);
        ctx.fillStyle = p.y ? C.pos : C.neg; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(p.y), x, y + 4);
        ctx.fillStyle = C.ink; ctx.font = '10px ui-monospace, Consolas, monospace';
        ctx.fillText(p.name, x, y + (k > 1 ? 24 : -14)); ctx.textAlign = 'left';
      });
      return { ctx: ctx, W: W, H: H, PX: PX, PY: PY };
    }

    // dashed line where w₁h₁ + w₂h₂ + b = 0.5 (the output layer's decision boundary)
    function boundary(G, R) {
      var a = P.w[0], b = P.w[1], c = .5 - P.b, p1, p2;
      if (Math.abs(a) < 1e-6 && Math.abs(b) < 1e-6) return;
      if (Math.abs(b) >= Math.abs(a)) { p1 = [R[0], (c - a * R[0]) / b]; p2 = [R[1], (c - a * R[1]) / b]; }
      else { p1 = [(c - b * R[2]) / a, R[2]]; p2 = [(c - b * R[3]) / a, R[3]]; }
      var ctx = G.ctx; ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(G.PX(p1[0]), G.PY(p1[1])); ctx.lineTo(G.PX(p2[0]), G.PY(p2[1])); ctx.stroke(); ctx.restore();
    }

    function draw() {
      plot(cvX, [-.5, 1.5, -.5, 1.5], function (a, b) { return out([a, b]); },
           X.map(function (x, n) { return { p: x, y: Y[n], name: 'x = ' + NAMES[n] }; }), 'x₁', 'x₂');
      var Hs = X.map(hidden), hmax = 2.5;
      if (mode !== 'linear') Hs.forEach(function (h) { hmax = Math.max(hmax, h[0] + .5, h[1] + .5); });
      var R = [-.5, hmax, -.5, Math.max(1.5, hmax - 1)];
      var G = plot(cvH, R, function (a, b) { return mode === 'linear' ? .5 : P.w[0] * Math.max(0, a) + P.w[1] * Math.max(0, b) + P.b; },
           mode === 'linear' ? [] : Hs.map(function (h, n) { return { p: h, y: Y[n], name: NAMES[n] }; }), 'h₁', 'h₂');
      if (mode === 'linear') {
        G.ctx.fillStyle = C.ink; G.ctx.font = '13px system-ui, sans-serif'; G.ctx.textAlign = 'center';
        G.ctx.fillText('No hidden layer in this model', G.W / 2, G.H / 2); G.ctx.textAlign = 'left';
      } else boundary(G, R);
      renderRead();
      syncInputs();
    }

    function okCell(v, y) {
      var ok = Math.abs(v - y) < .25;
      return '<td>' + T(f2(v)) + '</td><td>' + T(String(y)) + '</td><td>' + (ok ? '<span style="color:var(--viz-fwd)">✓ right</span>' : '<span class="g">✗ wrong</span>') + '</td>';
    }

    function renderRead() {
      var rows, head;
      if (mode === 'linear') {
        head = '<tr><th>input ' + T('x') + '</th><th>output ' + T('f(x)') + '</th><th>target ' + T('y') + '</th><th></th></tr>';
        rows = X.map(function (x, n) { return '<tr><td>' + tvec(x) + '</td>' + okCell(out(x), Y[n]) + '</tr>'; }).join('');
      } else {
        head = '<tr><th>input ' + T('x') + '</th><th>1. weighted sum ' + T('W^\\top x + c') + '</th><th>2. ReLU ' + T('h = \\max(0,\\, \\cdot)') + '</th><th>3. output ' + T('f = w^\\top h + b') + '</th><th>target ' + T('y') + '</th><th></th></tr>';
        rows = X.map(function (x, n) { return '<tr><td>' + tvec(x) + '</td><td>' + tvec(pre(x)) + '</td><td>' + tvec(hidden(x)) + '</td>' + okCell(out(x), Y[n]) + '</tr>'; }).join('');
      }
      var weights = mode === 'linear' ? T('w = ' + col([0, 0]) + ',\\quad b = 0.5', true)
        : T('W = \\begin{bmatrix}' + f2(P.W[0][0]) + ' & ' + f2(P.W[0][1]) + '\\\\' + f2(P.W[1][0]) + ' & ' + f2(P.W[1][1]) + '\\end{bmatrix},\\quad c = ' + col(P.c) +
            ',\\quad w = ' + col(P.w) + ',\\quad b = ' + f2(P.b), true);
      read.innerHTML = weights +
        '<div class="table-wrap"><table class="data"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' +
        '<p style="margin-top:8px">Mean squared error: ' + T('J = \\tfrac{1}{4}\\sum_{i=1}^{4} \\big(y_i - f(x_i)\\big)^2 = ' + fmt(loss(), 4)) + '</p>';
    }

    function syncInputs() {
      var vals = [P.W[0][0], P.W[0][1], P.W[1][0], P.W[1][1], P.c[0], P.c[1], P.w[0], P.w[1], P.b];
      inputs.querySelectorAll('input').forEach(function (el, i) { if (document.activeElement !== el) el.value = (Math.round(vals[i] * 100) / 100); el.disabled = mode === 'linear'; });
    }
    inputs.addEventListener('input', function (e) {
      var i = +e.target.dataset.i, v = parseFloat(e.target.value); if (isNaN(v)) return;
      stop(false);
      if (i < 4) P.W[i >> 1][i & 1] = v; else if (i < 6) P.c[i - 4] = v; else if (i < 8) P.w[i - 6] = v; else P.b = v;
      draw();
    });

    // plain gradient descent on the mean squared error
    function gdStep(lr) {
      var gW = [[0, 0], [0, 0]], gc = [0, 0], gw = [0, 0], gb = 0;
      X.forEach(function (x, n) {
        var a = pre(x), h = a.map(function (v) { return Math.max(0, v); });
        var f = P.w[0] * h[0] + P.w[1] * h[1] + P.b, d = (f - Y[n]) / 2; // ∂J/∂f for J = ¼Σ(y − f)²
        gb += d;
        for (var i = 0; i < 2; i++) {
          gw[i] += d * h[i];
          var da = a[i] > 0 ? d * P.w[i] : 0;
          gc[i] += da; gW[0][i] += da * x[0]; gW[1][i] += da * x[1];
        }
      });
      for (var i = 0; i < 2; i++) { P.w[i] -= lr * gw[i]; P.c[i] -= lr * gc[i]; P.W[0][i] -= lr * gW[0][i]; P.W[1][i] -= lr * gW[1][i]; }
      P.b -= lr * gb;
    }

    function finalStatus() {
      var L = loss();
      if (L < 1e-3) return '<b style="color:var(--viz-fwd)">Solved</b> after ' + steps.toLocaleString('en-US') + ' steps: all four outputs match their targets.';
      var dead = [0, 1].filter(function (i) { return X.every(function (x) { return pre(x)[i] <= 0; }); }).length;
      return '<b class="g">Stuck</b> after ' + steps.toLocaleString('en-US') + ' steps with error ' + T('J = ' + fmt(L, 3)) + '. ' +
        (dead ? dead + ' of the 2 hidden units is "dead": its ReLU outputs 0 for every input, so it gets no gradient and stops learning. '
              : 'Gradient descent settled in a poor solution (a local minimum). ') +
        'This happens with bad random starts. Press the button to try another one.';
    }

    function stop(showStatus) {
      if (timer) { clearInterval(timer); timer = null; if (showStatus !== false) status.innerHTML = finalStatus(); }
      btnTrain.textContent = 'Train again from a new random start';
    }
    function train() {
      stop(false); seed++; steps = 0;
      var r = V.rng(seed * 31 + 5);
      P = { W: [[V.randn(r), V.randn(r)], [V.randn(r), V.randn(r)]], c: [.1, .1], w: [V.randn(r) * .5, V.randn(r) * .5], b: 0 };
      btnTrain.textContent = 'Stop';
      timer = setInterval(function () {
        for (var k = 0; k < 20; k++) { gdStep(.1); steps++; }
        status.innerHTML = 'Training… step ' + steps.toLocaleString('en-US') + ' of ' + MAX_STEPS.toLocaleString('en-US') + ', error ' + T('J = ' + fmt(loss(), 4));
        draw();
        if (steps >= MAX_STEPS || loss() < 1e-6) stop();
      }, 30);
      draw();
    }
    btnTrain.addEventListener('click', function () { if (timer) stop(); else train(); });

    function setMode(m) {
      stop(false); mode = m;
      modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
      explain.innerHTML = EXPLAIN[m];
      trainRow.hidden = m !== 'train';
      if (m === 'train') train();
      else { if (m === 'book') P = clone(BOOK); status.textContent = ''; draw(); }
    }
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });

    var labels = ['W_{11}', 'W_{12}', 'W_{21}', 'W_{22}', 'c_1', 'c_2', 'w_1', 'w_2', 'b'].map(function (l) { return T(l); });
    inputs.innerHTML = labels.map(function (l, i) {
      return '<label class="ctl" style="min-width:0">' + l + '<input class="vnum" type="number" step="0.1" data-i="' + i + '"></label>';
    }).join('');
    P = clone(BOOK);
    explain.innerHTML = EXPLAIN.book;
    V.watch(cvX, draw);
  })();

  /* ================================================================
     6.2.2  Output units and cost functions
     ================================================================ */
  (function outputs() {
    var cvL = $('ou-loss'); if (!cvL) return;
    var cvG = $('ou-grad'), zIn = $('ou-z'), yBtns = document.querySelectorAll('#fig-out [data-y]'), read = $('ou-read');
    var y = 1;
    function sig(z) { return 1 / (1 + Math.exp(-z)); }
    function softplus(z) { return z > 30 ? z : Math.log(1 + Math.exp(z)); }
    var CURVES = [
      { name: 'negative log-likelihood ζ((1 − 2y)z)', col: 'accent', J: function (z) { return softplus((1 - 2 * y) * z); }, g: function (z) { return sig(z) - y; } },
      { name: 'mean squared error (σ(z) − y)²', col: 'grad', J: function (z) { var d = sig(z) - y; return d * d; }, g: function (z) { var s = sig(z); return 2 * (s - y) * s * (1 - s); } }
    ];

    function panel(cv, key, ymin, ymax, title) {
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, Z = 8, z0 = parseFloat(zIn.value);
      function X(z) { return (z + Z) / (2 * Z) * W; }
      function Y(v) { return H - 16 - (v - ymin) / (ymax - ymin) * (H - 30); }
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();
      CURVES.forEach(function (c) {
        ctx.strokeStyle = C[c.col]; ctx.lineWidth = 2.5; ctx.beginPath();
        for (var i = 0; i <= 200; i++) { var z = -Z + i / 200 * 2 * Z, v = V.clamp(c[key](z), ymin, ymax); if (i) ctx.lineTo(X(z), Y(v)); else ctx.moveTo(X(z), Y(v)); }
        ctx.stroke();
        ctx.fillStyle = C[c.col]; ctx.beginPath(); ctx.arc(X(z0), Y(V.clamp(c[key](z0), ymin, ymax)), 5, 0, 7); ctx.fill();
      });
      ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted; ctx.beginPath(); ctx.moveTo(X(z0), 0); ctx.lineTo(X(z0), H); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(title, 6, 13); ctx.fillText('z →', W - 26, Y(0) - 5);
      ctx.fillText('−8', 2, H - 3); ctx.fillText('8', W - 10, H - 3);
    }

    function draw() {
      var z = parseFloat(zIn.value);
      $('ou-zo').textContent = fmt(z, 1);
      panel(cvL, 'J', 0, 8.5, 'cost J as a function of the logit z (target y = ' + y + ')');
      panel(cvG, 'g', -1.05, 1.05, 'gradient ∂J/∂z');
      var wrong = (y === 1 && z < 0) || (y === 0 && z > 0);
      read.innerHTML = tx('\\hat y = \\sigma(z) = ' + fmt(sig(z), 3) + ',\\quad y = ' + y) + (wrong ? ' → the model is <b class="g">wrong</b>' : ' → the model is right') + '<br>' +
        'NLL: ' + tx('J = ' + fmt(CURVES[0].J(z), 3) + ',\\quad \\partial J / \\partial z = \\sigma(z) - y = \\mathbf{' + fmt(CURVES[0].g(z), 3) + '}') + '<br>' +
        'MSE: ' + tx('J = ' + fmt(CURVES[1].J(z), 3) + ',\\quad \\partial J / \\partial z = 2(\\sigma - y)\\,\\sigma(1 - \\sigma) = \\mathbf{' + fmt(CURVES[1].g(z), 4) + '}') +
        (wrong && Math.abs(z) > 4 ? '<p style="margin-top:6px">Confidently wrong: the log in the NLL undoes the exp in the sigmoid, so its gradient stays near ±1, while the MSE gradient has almost vanished and learning would stall.</p>' : '');
    }
    zIn.addEventListener('input', draw);
    yBtns.forEach(function (b) { b.addEventListener('click', function () { y = +b.dataset.y; yBtns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); draw(); }); });
    V.watch(cvL, draw);
  })();

  (function softmax() {
    var box = $('sm-sliders'); if (!box) return;
    var bars = $('sm-bars'), read = $('sm-read'), btnShift = $('sm-shift'), K = 4, z = [2, 1, .2, -1], target = 0;
    function render() {
      var m = Math.max.apply(null, z), e = z.map(function (v) { return Math.exp(v - m); }), s = e.reduce(function (a, b) { return a + b; }, 0), p = e.map(function (v) { return v / s; });
      var lse = m + Math.log(s), nll = -z[target] + lse;
      bars.innerHTML = p.map(function (q, i) {
        return '<div class="bar' + (i === target ? ' tgt' : '') + '" data-i="' + i + '"><span>class ' + (i + 1) + (i === target ? ' ✓' : '') + '</span><i style="width:' + (q * 100) + '%"></i><em>' + q.toFixed(3) + '</em></div>';
      }).join('');
      var k = target + 1;
      read.innerHTML = tx('\\operatorname{softmax}(z)_i = \\dfrac{e^{z_i}}{\\sum_j e^{z_j}}', true) +
        tx('J = -\\log \\operatorname{softmax}(z)_{' + k + '} = -z_{' + k + '} + \\log \\textstyle\\sum_j e^{z_j} = ' + pf(-z[target], 2) + ' + ' + fmt(lse, 2) + ' = \\mathbf{' + fmt(nll, 3) + '}', true) +
        tx('\\log \\textstyle\\sum_j e^{z_j} \\approx \\max_j z_j = ' + fmt(m, 2), true) +
        tx('\\partial J / \\partial z = \\operatorname{softmax}(z) - \\operatorname{onehot}(y) = \\begin{bmatrix}' + p.map(function (q, i) { return fmt(q - (i === target ? 1 : 0), 2); }).join(' & ') + '\\end{bmatrix}', true);
      box.querySelectorAll('input').forEach(function (el, i) { el.value = z[i]; $('sm-o' + i).textContent = fmt(z[i], 1); });
    }
    box.innerHTML = z.map(function (v, i) {
      return '<label class="ctl grow"><span>logit ' + tx('z_' + (i + 1)) + '</span> <output id="sm-o' + i + '"></output><input type="range" min="-6" max="8" step="0.1" data-i="' + i + '"></label>';
    }).join('');
    box.addEventListener('input', function (e) { z[+e.target.dataset.i] = parseFloat(e.target.value); render(); });
    bars.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) { target = +b.dataset.i; render(); } });
    btnShift.addEventListener('click', function () {
      var c = z.every(function (v) { return v + 1 <= 8; }) ? 1 : -3;
      z = z.map(function (v) { return v + c; }); render();
    });
    render();
    void K;
  })();

  /* ================================================================
     6.3  Hidden units
     ================================================================ */
  (function hidden() {
    var cvF = $('hu-f'); if (!cvF) return;
    var cvD = $('hu-d'), sel = $('hu-act'), aIn = $('hu-alpha'), kIn = $('hu-k'), btnRe = $('hu-resample'), note = $('hu-note');
    var seed = 3, pieces = [];
    function makePieces() { var r = V.rng(seed); pieces = []; for (var i = 0; i < 8; i++) pieces.push([V.randn(r) * 1.2, V.randn(r) * .8]); }
    function sig(z) { return 1 / (1 + Math.exp(-z)); }
    var ACTS = {
      relu: { f: function (z) { return Math.max(0, z); }, n: 'Rectified linear unit ' + tx('g(z) = \\max\\{0, z\\}') + ': the default recommendation. Its derivative is 1 wherever the unit is active and 0 elsewhere, so gradients stay large and consistent.' },
      gen: { f: function (z) { var a = +aIn.value; return Math.max(0, z) + a * Math.min(0, z); },
             n: 'Generalised ReLU ' + tx('h = \\max(0, z) + \\alpha \\min(0, z)') + '. ' + tx('\\alpha = -1') + ' gives absolute-value rectification, a small ' + tx('\\alpha') + ' such as 0.01 gives the leaky ReLU, and learning ' + tx('\\alpha') + ' gives the PReLU. With ' + tx('\\alpha \\neq 0') + ' the unit still has a gradient when ' + tx('z < 0') + '.' },
      maxout: { f: function (z) { var k = +kIn.value, m = -Infinity; for (var i = 0; i < k; i++) m = Math.max(m, pieces[i][0] * z + pieces[i][1]); return m; },
                n: 'Maxout: ' + tx('g(z) = \\max_{i \\le k} (a_i z + b_i)') + ', the maximum of ' + tx('k') + ' learned linear pieces. It learns a convex piecewise-linear activation; press resample to draw new pieces.' },
      sigmoid: { f: sig, n: 'Logistic sigmoid ' + tx('\\sigma(z) = \\dfrac{1}{1 + e^{-z}}') + '. It saturates for large ' + tx('|z|') + ', where its derivative is nearly 0, which is why it is discouraged as a hidden unit.' },
      tanh: { f: Math.tanh, n: 'Hyperbolic tangent, ' + tx('\\tanh(z) = 2\\sigma(2z) - 1') + '. Also saturating, but it behaves like the identity near 0 (' + tx('\\tanh(0) = 0') + ' while ' + tx('\\sigma(0) = \\tfrac12') + '), so it usually trains better than the sigmoid.' },
      softplus: { f: function (z) { return z > 30 ? z : Math.log(1 + Math.exp(z)); }, n: 'Softplus ' + tx('\\zeta(z) = \\log(1 + e^{z})') + ', a smooth rectifier. Empirically it does worse than the ReLU, a reminder that intuitions about hidden units can be wrong.' },
      hardtanh: { f: function (z) { return Math.max(-1, Math.min(1, z)); }, n: 'Hard tanh ' + tx('g(z) = \\max(-1, \\min(1, z))') + ': tanh-shaped but piecewise linear and bounded.' },
      cos: { f: Math.cos, n: tx('h = \\cos(Wx + b)') + '. The book reports under 1% MNIST error with this unusual unit: many differentiable functions work, so new units are only published when they clearly help.' }
    };
    function plot(cv, fn, ylo, yhi, title) {
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, Z = 4;
      function X(z) { return (z + Z) / (2 * Z) * W; }
      function Y(v) { return H - 6 - (v - ylo) / (yhi - ylo) * (H - 22); }
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2.5; ctx.beginPath();
      for (var i = 0; i <= 300; i++) { var z = -Z + i / 300 * 2 * Z, v = V.clamp(fn(z), ylo - 1, yhi + 1); if (i) ctx.lineTo(X(z), Y(v)); else ctx.moveTo(X(z), Y(v)); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(title, 6, 13);
    }
    function draw() {
      var A = ACTS[sel.value], f = A.f, h = 1e-4;
      $('hu-alphao').textContent = fmt(+aIn.value, 2); $('hu-ko').textContent = kIn.value;
      $('hu-gen').hidden = sel.value !== 'gen'; $('hu-max').hidden = sel.value !== 'maxout';
      var lo = Infinity, hi = -Infinity; for (var i = 0; i <= 100; i++) { var v = f(-4 + i * .08); lo = Math.min(lo, v); hi = Math.max(hi, v); }
      lo = Math.min(lo, -.5); hi = Math.max(hi, 1.2);
      plot(cvF, f, lo, hi, 'g(z)');
      plot(cvD, function (z) { return (f(z + h) - f(z - h)) / (2 * h); }, -1.3, 1.3, "g′(z)");
      note.innerHTML = A.n;
    }
    [sel, aIn, kIn].forEach(function (el) { el.addEventListener('input', draw); });
    btnRe.addEventListener('click', function () { seed++; makePieces(); draw(); });
    makePieces();
    V.watch(cvF, draw);
  })();

  /* ================================================================
     6.4  Universal approximation, and why depth helps
     ================================================================ */
  (function approx() {
    var cv = $('ua-canvas'); if (!cv) return;
    var nIn = $('ua-n'), tSel = $('ua-target'), read = $('ua-read');
    var TARGETS = {
      wave: function (x) { return Math.sin(2 * Math.PI * x) + .5 * Math.sin(6 * Math.PI * x); },
      bump: function (x) { return Math.exp(-40 * (x - .5) * (x - .5)); },
      step: function (x) { return x < .35 ? -.5 : x < .7 ? 1 : .2; }
    };
    // one hidden layer of n ReLUs with kinks spread over [0, 1]; output weights by least squares
    function fit(n, f) {
      var M = 200, xs = [], ys = [], i, j, k;
      for (i = 0; i < M; i++) { xs.push(i / (M - 1)); ys.push(f(xs[i])); }
      var feats = function (x) { var h = [1, x]; for (j = 0; j < n; j++) h.push(Math.max(0, x - j / n)); return h; };
      var d = n + 2, A = [], b = new Array(d).fill(0);
      for (i = 0; i < d; i++) A.push(new Array(d).fill(0));
      xs.forEach(function (x, m) { var h = feats(x); for (i = 0; i < d; i++) { b[i] += h[i] * ys[m]; for (j = 0; j < d; j++) A[i][j] += h[i] * h[j]; } });
      for (i = 0; i < d; i++) A[i][i] += 1e-6;
      for (i = 0; i < d; i++) { // Gaussian elimination with partial pivoting
        var p = i; for (k = i + 1; k < d; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
        var t = A[i]; A[i] = A[p]; A[p] = t; t = b[i]; b[i] = b[p]; b[p] = t;
        for (k = i + 1; k < d; k++) { var r = A[k][i] / A[i][i]; for (j = i; j < d; j++) A[k][j] -= r * A[i][j]; b[k] -= r * b[i]; }
      }
      var w = new Array(d).fill(0);
      for (i = d - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < d; j++) s -= A[i][j] * w[j]; w[i] = s / A[i][i]; }
      var model = function (x) { var h = feats(x), s = 0; for (var q = 0; q < d; q++) s += w[q] * h[q]; return s; };
      var err = 0; xs.forEach(function (x, m) { var e = model(x) - ys[m]; err += e * e; });
      return { model: model, rmse: Math.sqrt(err / M) };
    }
    function draw() {
      var n = +nIn.value, f = TARGETS[tSel.value], F = fit(n, f), S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h;
      $('ua-no').textContent = n;
      function X(x) { return 10 + x * (W - 20); }
      function Y(v) { return H / 2 - v * (H * .28); }
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
      for (var j = 0; j < n; j++) { ctx.strokeStyle = V.rgba(C.inkRGB, .08); ctx.beginPath(); ctx.moveTo(X(j / n), 0); ctx.lineTo(X(j / n), H); ctx.stroke(); }
      [[f, C.muted, 5], [F.model, C.accent, 2.5]].forEach(function (s) {
        ctx.strokeStyle = s[1]; ctx.lineWidth = s[2]; ctx.beginPath();
        for (var i = 0; i <= 400; i++) { var x = i / 400; if (i) ctx.lineTo(X(x), Y(s[0](x))); else ctx.moveTo(X(x), Y(s[0](x))); }
        ctx.stroke();
      });
      read.innerHTML = n + ' hidden ReLU units → root-mean-square error <b>' + fmt(F.rmse, 4) + '</b>. Each unit adds one "kink", so the network is a piecewise-linear curve with at most ' + (n + 1) + ' pieces.';
    }
    [nIn, tSel].forEach(function (el) { el.addEventListener('input', draw); });
    V.watch(cv, draw);
  })();

  (function folding() {
    var cv = $('fold-canvas'); if (!cv) return;
    var LIn = $('fold-L'), read = $('fold-read');
    // one "fold" T(x) = 2·relu(x) − 4·relu(x − ½) on [0, 1]: two ReLU units per layer
    function T(x) { return 2 * Math.max(0, x) - 4 * Math.max(0, x - .5); }
    function draw() {
      var L = +LIn.value, S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h;
      $('fold-Lo').textContent = L;
      function X(x) { return 10 + x * (W - 20); }
      function Y(v) { return H - 14 - v * (H - 34); }
      var N = Math.max(800, Math.pow(2, L) * 8);
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(0, Y(1)); ctx.lineTo(W, Y(1)); ctx.stroke();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i <= N; i++) { var x = i / N, v = x; for (var l = 0; l < L; l++) v = T(v); if (i) ctx.lineTo(X(x), Y(v)); else ctx.moveTo(X(x), Y(v)); }
      ctx.stroke();
      var pieces = Math.pow(2, L);
      read.innerHTML = 'Depth <b>' + L + '</b>, <b>' + (2 * L) + '</b> ReLU units in total → <b>' + pieces + '</b> linear pieces.<br>' +
        'A single hidden layer adds at most one kink per unit, so it would need at least <b>' + (pieces - 1) + '</b> units to produce the same curve.';
    }
    LIn.addEventListener('input', draw);
    V.watch(cv, draw);
  })();

  /* ================================================================
     6.5.3  Back-propagation as table filling (dynamic programming)
     ================================================================ */
  (function dp() {
    var cv = $('dp-canvas'); if (!cv) return;
    var LIn = $('dp-L'), btnStep = $('dp-step'), btnReset = $('dp-reset'), read = $('dp-read');
    var L, nodes, edges, filled, seed = 7;

    function build() {
      L = +LIn.value; var r = V.rng(seed + L);
      nodes = [{ id: 'w', layer: 0, k: 0 }];
      for (var l = 1; l <= L; l++) for (var k = 0; k < 2; k++) nodes.push({ id: 'u' + l + k, layer: l, k: k });
      nodes.push({ id: 'z', layer: L + 1, k: 0 });
      edges = [];
      function byLayer(l) { return nodes.filter(function (n) { return n.layer === l; }); }
      for (l = 1; l <= L + 1; l++) byLayer(l - 1).forEach(function (a) { byLayer(l).forEach(function (b) { edges.push({ a: a, b: b, w: (r() < .5 ? -1 : 1) * (.6 + r() * .6) }); }); });
      // forward: u = tanh(Σ w · parent), the input w = 0.8
      nodes.forEach(function (n) {
        if (n.layer === 0) { n.v = .8; return; }
        var s = 0; edges.forEach(function (e) { if (e.b === n) s += e.w * e.a.v; });
        n.v = n.layer === L + 1 ? s : Math.tanh(s);
      });
      edges.forEach(function (e) { e.d = e.w * (e.b.layer === L + 1 ? 1 : 1 - e.b.v * e.b.v); }); // ∂u_b/∂u_a
      filled = L + 1; nodes.forEach(function (n) { n.g = n.layer === L + 1 ? 1 : null; });
      draw();
    }
    function step() {
      if (filled <= 0) return;
      filled--;
      nodes.filter(function (n) { return n.layer === filled; }).forEach(function (n) {
        var g = 0; edges.forEach(function (e) { if (e.a === n) g += e.b.g * e.d; }); n.g = g; // eq. 6.53
      });
      draw();
    }
    function draw() {
      var S = V.setup(cv), ctx = S.ctx, W = S.w, H = S.h, gx = (W - 60) / (L + 1), r = Math.max(9, Math.min(18, gx / 3.2));
      nodes.forEach(function (n) {
        n.x = 30 + n.layer * gx;
        n.y = (n.layer === 0 || n.layer === L + 1) ? H / 2 : H / 2 + (n.k ? 1 : -1) * H * .23;
      });
      edges.forEach(function (e) {
        var done = e.b.g !== null && e.a.g !== null, active = e.a.layer === filled && e.b.g !== null;
        ctx.strokeStyle = active ? C.grad : done ? V.rgba(C.gradRGB, .5) : V.rgba(C.inkRGB, .25);
        ctx.lineWidth = active ? 2.5 : 1.3;
        ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      });
      nodes.forEach(function (n) {
        ctx.fillStyle = n.g !== null ? V.rgba(V.mix(C.midRGB, C.gradRGB, .35)) : C.bg;
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.font = (r > 13 ? 11 : 9) + 'px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
        ctx.fillText(n.id === 'w' || n.id === 'z' ? n.id : fmt(n.v, 1), n.x, n.y + 4);
        if (n.g !== null && gx > 44) { ctx.fillStyle = C.grad; ctx.fillText(fmt(n.g, 2), n.x, n.y + r + 13); }
        ctx.textAlign = 'left';
      });
      var paths = Math.pow(2, L), E = edges.length;
      read.innerHTML = 'Paths from ' + tx('w') + ' to ' + tx('z') + ': <b>' + paths.toLocaleString('en-US') + '</b>. Expanding the chain rule over all paths needs ' + paths.toLocaleString('en-US') + ' products of ' + (L + 1) + ' factors each.<br>' +
        'Back-propagation visits each of the <b>' + E + '</b> edges once: one partial derivative, one multiply and one add per edge.<br>' +
        (filled > 0 ? 'Press <b>Fill next column</b> to compute the gradients of column ' + (filled - 1) + ' from the stored values of column ' + filled + '.' :
         tx('\\partial z / \\partial w = ' + fmt(nodes[0].g, 4)) + ', computed with ' + E + ' edge operations.');
      btnStep.disabled = filled <= 0;
    }
    btnStep.addEventListener('click', step);
    btnReset.addEventListener('click', build);
    LIn.addEventListener('input', function () { $('dp-Lo').textContent = LIn.value; build(); });
    $('dp-Lo').textContent = LIn.value;
    V.watch(cv, function () { if (!nodes) build(); else draw(); });
  })();

  /* ================================================================
     6.5.4  Forward and backward pass through a small MLP (Algorithms 6.3 and 6.4)
        2 inputs -> 3 tanh hidden units -> 1 sigmoid output, binary cross-entropy
     ================================================================ */
  (function backprop() {
    var cv = $('bp-canvas'); if (!cv) return;
    var panel = $('bp-explain'), histEl = $('bp-history'), chips = document.querySelectorAll('#bp .phase-chips span');
    var x1In = $('bp-x1'), x2In = $('bp-x2'), lrIn = $('bp-lr'), yBtns = document.querySelectorAll('#bp [data-y]');
    var btnNext = $('bp-next'), btnPrev = $('bp-prev'), btnPlay = $('bp-play'), btnReset = $('bp-reset');

    var INIT = { W1: [[0.8, -0.5], [-0.6, 0.9], [0.4, 0.7]], b1: [0.1, -0.2, 0.05], W2: [1.1, -0.9, 0.6], b2: 0.1 };
    var net, before = null, phase = 0, iter = 1, y = 1, history = [], anim = null, playTimer = null;

    function clone(n) { return JSON.parse(JSON.stringify(n)); }
    function lr() { return parseFloat(lrIn.value); }
    function xs() { return [parseFloat(x1In.value), parseFloat(x2In.value)]; }

    function compute(n) {
      var x = xs(), zh = [], ah = [], j;
      for (j = 0; j < 3; j++) { zh[j] = n.W1[j][0] * x[0] + n.W1[j][1] * x[1] + n.b1[j]; ah[j] = Math.tanh(zh[j]); }
      var zo = n.b2; for (j = 0; j < 3; j++) zo += n.W2[j] * ah[j];
      var p = 1 / (1 + Math.exp(-zo));
      var L = -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
      var dzo = p - y;
      var gW2 = ah.map(function (a) { return dzo * a; });
      var dzh = ah.map(function (a, k) { return dzo * n.W2[k] * (1 - a * a); });
      var gW1 = dzh.map(function (d) { return [d * x[0], d * x[1]]; });
      return { x: x, zh: zh, ah: ah, zo: zo, p: p, L: L, dzo: dzo, gW2: gW2, gb2: dzo, dzh: dzh, gW1: gW1, gb1: dzh.slice() };
    }
    function applyUpdate(n, F) {
      var m = clone(n), eta = lr();
      for (var j = 0; j < 3; j++) {
        m.W1[j][0] -= eta * F.gW1[j][0]; m.W1[j][1] -= eta * F.gW1[j][1]; m.b1[j] -= eta * F.gb1[j];
        m.W2[j] -= eta * F.gW2[j];
      }
      m.b2 -= eta * F.gb2;
      return m;
    }

    function reset() { net = clone(INIT); before = null; phase = 0; iter = 1; history = []; anim = null; render(); }

    // Which numbers are "known" at this point of the walk-through
    function progress() { return anim ? Math.min(1, (performance.now() - anim.t0) / anim.dur) : 1; }
    function shown(k) { return phase > k || (phase === k && progress() > .8); }

    function next() {
      if (phase < 6) {
        phase++;
        if (phase === 6) { before = clone(net); var F = compute(before); history.push(F.L); net = applyUpdate(before, F); }
      } else { phase = 1; iter++; before = null; }
      startAnim(); render();
    }
    function prev() {
      if (phase === 0) return;
      if (phase === 6) { net = before; before = null; history.pop(); }
      phase--;
      if (phase === 0 && iter > 1) { /* stay on the current weights */ }
      anim = null; render();
    }
    function startAnim() {
      if (V.reduceMotion) { anim = null; return; }
      anim = { t0: performance.now(), dur: 850 };
      (function tick() { if (!anim) return; draw(); if (progress() < 1) requestAnimationFrame(tick); else { anim = null; draw(); } })();
    }

    function layout(W, H) {
      return {
        inp: [[W * .1, H * .34], [W * .1, H * .66]],
        hid: [[W * .42, H * .17], [W * .42, H * .5], [W * .42, H * .83]],
        out: [W * .7, H * .5],
        loss: [W * .9, H * .5],
        r: W < 560 ? 17 : 22
      };
    }

    function pulse(ctx, a, b, t, color) {
      var x = a[0] + (b[0] - a[0]) * t, y2 = a[1] + (b[1] - a[1]) * t;
      ctx.fillStyle = V.rgba(V.parse(color), .25); ctx.beginPath(); ctx.arc(x, y2, 9, 0, 7); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y2, 4.5, 0, 7); ctx.fill();
    }

    function draw() {
      var s = V.setup(cv), ctx = s.ctx, W = s.w, H = s.h, P = layout(W, H), r = P.r;
      var small = W < 560;
      // numbers for this view: after an update, show the gradients that produced it
      var F = compute(phase === 6 ? before : net);
      var t = progress(), e = 1 - Math.pow(1 - t, 3);
      var showG2 = phase >= 4, showG1 = phase >= 5;
      var gmax = 1e-9;
      if (phase >= 4) { F.gW2.forEach(function (g) { gmax = Math.max(gmax, Math.abs(g)); }); }
      if (phase >= 5) { F.gW1.forEach(function (g) { gmax = Math.max(gmax, Math.abs(g[0]), Math.abs(g[1])); }); }

      function edge(a, b, w, g, gradOn) {
        var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
        var A = [a[0] + ux * r, a[1] + uy * r], B = [b[0] - ux * r, b[1] - uy * r];
        if (gradOn && phase < 6) {
          ctx.strokeStyle = V.rgba(C.gradRGB, .28); ctx.lineWidth = 3 + 9 * Math.abs(g) / gmax;
          ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        }
        ctx.strokeStyle = V.rgba(w >= 0 ? C.posRGB : C.negRGB, .85);
        ctx.lineWidth = 1 + 3 * Math.min(1, Math.abs(w) / 1.5);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        if (phase === 6 && anim) {
          ctx.strokeStyle = V.rgba(C.accentRGB, .8 * (1 - t)); ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        }
        return [A, B];
      }
      function label(A, B, at, w, g, gradOn) {
        var x = A[0] + (B[0] - A[0]) * at, yy = A[1] + (B[1] - A[1]) * at;
        if (gradOn && phase < 6) V.tag(ctx, '∂ ' + fmt(g), x, yy, C.grad);
        else V.tag(ctx, fmt(w), x, yy, phase === 6 ? C.accent : C.muted);
      }

      // column headers
      ctx.fillStyle = C.muted; ctx.font = (small ? 10 : 12) + 'px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Input x', P.inp[0][0], 14); ctx.fillText('Hidden h⁽¹⁾ (tanh)', P.hid[0][0], 14);
      ctx.fillText('Output (σ)', P.out[0], 14); ctx.fillText('Cost', P.loss[0], 14);
      ctx.textAlign = 'left';

      // edges input -> hidden, hidden -> output, output -> loss
      var segs1 = [], segs2 = [], j, i;
      for (j = 0; j < 3; j++) for (i = 0; i < 2; i++) segs1.push({ s: edge(P.inp[i], P.hid[j], net.W1[j][i], F.gW1[j][i], showG1), j: j, i: i });
      for (j = 0; j < 3; j++) segs2.push({ s: edge(P.hid[j], P.out, net.W2[j], F.gW2[j], showG2), j: j });
      ctx.strokeStyle = V.rgba(C.inkRGB, .5); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(P.out[0] + r, P.out[1]); ctx.lineTo(P.loss[0] - 36, P.loss[1]); ctx.stroke();

      segs1.forEach(function (o) { label(o.s[0], o.s[1], .3, net.W1[o.j][o.i], F.gW1[o.j][o.i], showG1); });
      segs2.forEach(function (o) { label(o.s[0], o.s[1], .42, net.W2[o.j], F.gW2[o.j], showG2); });

      // travelling pulses for the current step
      if (anim) {
        if (phase === 1) segs1.forEach(function (o) { pulse(ctx, o.s[0], o.s[1], e, C.fwd); });
        if (phase === 2) segs2.forEach(function (o) { pulse(ctx, o.s[0], o.s[1], e, C.fwd); });
        if (phase === 3) pulse(ctx, [P.out[0] + r, P.out[1]], [P.loss[0] - 36, P.loss[1]], e, C.fwd);
        if (phase === 4) pulse(ctx, [P.loss[0] - 36, P.loss[1]], [P.out[0] + r, P.out[1]], e, C.grad);
        if (phase === 5) segs2.forEach(function (o) { pulse(ctx, o.s[1], o.s[0], e, C.grad); });
      }

      function node(p, value, colourVal, name, known) {
        ctx.fillStyle = known ? V.rgba(V.diverge(colourVal)) : C.mid;
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + (small ? 10 : 12) + 'px ui-monospace, Consolas, monospace';
        ctx.fillText(known ? fmt(value) : '?', p[0], p[1] + .5);
        ctx.font = (small ? 11 : 13) + 'px system-ui, sans-serif'; ctx.fillStyle = C.muted;
        ctx.fillText(name, p[0], p[1] - r - 9);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }
      function below(p, text, color, k) {
        ctx.font = (small ? 10 : 11) + 'px ui-monospace, Consolas, monospace'; ctx.fillStyle = color; ctx.textAlign = 'center';
        ctx.fillText(text, p[0], p[1] + r + 13 + k * 13); ctx.textAlign = 'left';
      }

      for (i = 0; i < 2; i++) node(P.inp[i], F.x[i], F.x[i] / 1.5, 'x' + sub(i + 1), true);
      for (j = 0; j < 3; j++) {
        node(P.hid[j], F.ah[j], F.ah[j], 'h' + sub(j + 1), shown(1));
        below(P.hid[j], 'b ' + fmt(net.b1[j]), phase === 6 ? C.accent : C.muted, 0);
        if (shown(5) && phase < 6) below(P.hid[j], 'δ ' + fmt(F.dzh[j]), C.grad, 1);
      }
      node(P.out, F.p, 2 * F.p - 1, 'ŷ', shown(2));
      below(P.out, 'b ' + fmt(net.b2), phase === 6 ? C.accent : C.muted, 0);
      if (shown(4) && phase < 6) below(P.out, 'δ ' + fmt(F.dzo), C.grad, 1);

      // loss box
      var bw = 72, bh = 46;
      ctx.fillStyle = shown(3) ? V.rgba(V.mix(C.midRGB, C.gradRGB, Math.min(1, F.L / 2) * .6)) : C.mid;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      V.roundRect(ctx, P.loss[0] - bw / 2, P.loss[1] - bh / 2, bw, bh, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px ui-monospace, Consolas, monospace';
      ctx.fillText(shown(3) ? 'J ' + fmt(F.L) : 'J ?', P.loss[0], P.loss[1]);
      ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = C.muted;
      ctx.fillText('target y = ' + y, P.loss[0], P.loss[1] + bh / 2 + 14);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    function explain() {
      var F = compute(phase === 6 ? before : net), h = '', j, eta = lr();
      function hl(v, cls) { return '<b class="' + cls + '">' + tx(v) + '</b>'; }
      function eq(s) { return '<div class="eqline">' + s + '</div>'; }
      function p(v, d) { return pf(v, d); }
      switch (phase) {
        case 0:
          h = '<h4>Ready</h4><p>Choose an input ' + tx('(x_1, x_2)') + ' and its label ' + tx('y') + ', then press <b>Next step</b>. ' +
              'Edge colour = sign of the weight (orange +, blue −), thickness = its size.</p>';
          break;
        case 1:
          h = '<h4>1 · Forward: ' + tx('a^{(1)} = b^{(1)} + W^{(1)}x,\\;\\; h^{(1)} = f(a^{(1)})') + '</h4><p>Each hidden unit takes a weighted sum of the inputs plus its bias, then applies the activation ' + tx('f = \\tanh') + ':</p>';
          for (j = 0; j < 3; j++) {
            h += eq(tx('a_' + (j + 1) + ' = ' + p(net.W1[j][0]) + '\\cdot' + p(F.x[0]) + ' + ' + p(net.W1[j][1]) + '\\cdot' + p(F.x[1]) + ' + ' + p(net.b1[j]) +
                 ' = ' + fmt(F.zh[j]) + ',\\quad h_' + (j + 1) + ' = \\tanh(' + fmt(F.zh[j]) + ') =') + ' ' + hl(fmt(F.ah[j]), 'f'));
          }
          break;
        case 2:
          h = '<h4>2 · Forward: ' + tx('\\hat y = \\sigma(z),\\;\\; z = b^{(2)} + W^{(2)}h^{(1)}') + '</h4><p>A sigmoid output unit turns the logit ' + tx('z') + ' into ' + tx('P(y = 1 \\mid x)') + ':</p>' +
              eq(tx('z = ' + [0, 1, 2].map(function (k) { return p(net.W2[k]) + '\\cdot' + p(F.ah[k]); }).join(' + ') + ' + ' + p(net.b2) + ' = ' + fmt(F.zo))) +
              eq(tx('\\hat y = \\sigma(' + fmt(F.zo) + ') =') + ' ' + hl(fmt(F.p, 3), 'f')) +
              '<p style="margin-top:6px">The network currently says ' + tx('P(y = 1 \\mid x) \\approx ' + Math.round(F.p * 100) + '\\%') + '.</p>';
          break;
        case 3:
          h = '<h4>3 · Cost ' + tx('J = -\\log P(y \\mid x)') + '</h4><p>Maximum likelihood gives the cross-entropy cost:</p>' +
              eq(tx('J = -\\big[y \\log \\hat y + (1 - y)\\log(1 - \\hat y)\\big] = -\\log(' + (y ? fmt(F.p, 3) : fmt(1 - F.p, 3)) + ') =') + ' ' + hl(fmt(F.L, 3), ''));
          break;
        case 4:
          h = '<h4>4 · Backward through the output unit</h4><p>Start at the cost. For a sigmoid output with the cross-entropy cost, the log undoes the exp and the gradient on the logit is simply:</p>' +
              eq(tx('\\delta_{\\text{out}} = \\partial J / \\partial z = \\hat y - y = ' + fmt(F.p, 3) + ' - ' + y + ' =') + ' ' + hl(fmt(F.dzo, 3), 'g')) +
              '<p style="margin-top:6px">' + tx('\\nabla_{W^{(2)}} J = \\delta_{\\text{out}}\\, h^{(1)\\top}') + ' and ' + tx('\\nabla_{b^{(2)}} J = \\delta_{\\text{out}}') + ': each weight gets ' + tx('\\delta_{\\text{out}}') + ' × the activation at its input end:</p>';
          for (j = 0; j < 3; j++) h += eq(tx('\\partial J / \\partial W^{(2)}_' + (j + 1) + ' = \\delta_{\\text{out}}\\, h_' + (j + 1) + ' = ' + p(F.dzo, 3) + '\\cdot' + p(F.ah[j]) + ' =') + ' ' + hl(fmt(F.gW2[j], 3), 'g'));
          h += eq(tx('\\partial J / \\partial b^{(2)} = \\delta_{\\text{out}} =') + ' ' + hl(fmt(F.gb2, 3), 'g'));
          break;
        case 5:
          h = '<h4>5 · Backward through the hidden layer</h4><p>The error signal travels back through each weight ' + tx('W^{(2)}_j') + ' and through the slope of tanh, ' + tx('1 - h_j^2') + ':</p>';
          for (j = 0; j < 3; j++) {
            h += eq(tx('\\delta_' + (j + 1) + ' = \\delta_{\\text{out}}\\, W^{(2)}_' + (j + 1) + ' (1 - h_' + (j + 1) + '^2) = ' + p(F.dzo, 3) + '\\cdot' + p(net.W2[j]) + '\\cdot(1 - ' + p(F.ah[j]) + '^2) =') + ' ' + hl(fmt(F.dzh[j], 3), 'g'));
          }
          h += '<p style="margin-top:6px">…and every input weight gets ' + tx('\\delta_j') + ' × the input on its edge, ' + tx('\\partial J / \\partial W^{(1)}_{jk} = \\delta_j\\, x_k') + ':</p>';
          for (j = 0; j < 3; j++) {
            var i1 = (j + 1) + '1', i2 = (j + 1) + '2';
            h += eq(tx('\\partial J / \\partial W^{(1)}_{' + i1 + '} = ' + fmt(F.gW1[j][0], 3) + ',\\quad \\partial J / \\partial W^{(1)}_{' + i2 + '} = ' + fmt(F.gW1[j][1], 3) +
                 ',\\quad \\partial J / \\partial b^{(1)}_' + (j + 1) + ' = ' + fmt(F.gb1[j], 3)));
          }
          break;
        case 6:
          var after = compute(net);
          h = '<h4>6 · Update</h4><p>Back-propagation only computed the gradient. A separate optimiser, here plain gradient descent, uses it: ' + tx('\\theta \\leftarrow \\theta - \\eta\\, \\nabla_\\theta J') + ', with ' + tx('\\eta = ' + fmt(eta)) + '.</p>' +
              '<div class="table-wrap"><table class="data"><tr><th>parameter</th><th>before</th><th>gradient</th><th>after</th></tr>';
          var rows = [];
          for (j = 0; j < 3; j++) {
            rows.push(['W^{(1)}_{' + (j + 1) + '1}', before.W1[j][0], F.gW1[j][0], net.W1[j][0]]);
            rows.push(['W^{(1)}_{' + (j + 1) + '2}', before.W1[j][1], F.gW1[j][1], net.W1[j][1]]);
            rows.push(['b^{(1)}_' + (j + 1), before.b1[j], F.gb1[j], net.b1[j]]);
          }
          for (j = 0; j < 3; j++) rows.push(['W^{(2)}_' + (j + 1), before.W2[j], F.gW2[j], net.W2[j]]);
          rows.push(['b^{(2)}', before.b2, F.gb2, net.b2]);
          rows.forEach(function (rw) {
            h += '<tr><td>' + tx(rw[0]) + '</td><td>' + tx(fmt(rw[1], 3)) + '</td><td class="g">' + tx(fmt(rw[2], 3)) + '</td><td><b>' + tx(fmt(rw[3], 3)) + '</b></td></tr>';
          });
          h += '</table></div><p style="margin-top:8px">Cost on this example: ' + tx('J: ' + fmt(F.L, 3) + ' \\to ' + fmt(after.L, 3)) + '. Press Next step to run the next forward pass with the new weights.</p>';
          break;
      }
      panel.innerHTML = h;
      histEl.innerHTML = history.length ? 'Cost per iteration: ' + tx(history.map(function (v) { return fmt(v, 3); }).slice(-8).join(' \\to ')) : '';
    }

    function render() {
      chips.forEach(function (c, k) { c.classList.toggle('on', k + 1 === phase); c.classList.toggle('done', k + 1 < phase); });
      btnPrev.disabled = phase === 0;
      btnNext.textContent = phase === 6 ? 'Next iteration ▶' : 'Next step ▶';
      $('bp-iter').textContent = 'Iteration ' + iter;
      $('bp-x1o').textContent = fmt(parseFloat(x1In.value), 1);
      $('bp-x2o').textContent = fmt(parseFloat(x2In.value), 1);
      $('bp-lro').textContent = fmt(lr(), 2);
      yBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.y === y)); });
      explain(); draw();
    }

    function inputChanged() { if (phase === 6) { phase = 0; before = null; } else phase = 0; anim = null; render(); }
    x1In.addEventListener('input', inputChanged);
    x2In.addEventListener('input', inputChanged);
    yBtns.forEach(function (b) { b.addEventListener('click', function () { y = +b.dataset.y; inputChanged(); }); });
    lrIn.addEventListener('input', function () {
      if (phase === 6) { net = applyUpdate(before, compute(before)); }
      render();
    });
    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);
    btnReset.addEventListener('click', function () { stopPlay(); reset(); });
    function stopPlay() { clearInterval(playTimer); playTimer = null; btnPlay.textContent = 'Auto-play'; }
    btnPlay.addEventListener('click', function () {
      if (playTimer) { stopPlay(); return; }
      btnPlay.textContent = 'Pause'; next();
      playTimer = setInterval(next, 1500);
    });

    net = clone(INIT);
    V.watch(cv, render);
  })();

  /* ================================================================
     Gradient descent, momentum and Adam on a 2-parameter loss surface
     ================================================================ */
  (function descent() {
    var cv = $('gd-canvas'); if (!cv) return;
    var fnSel = $('gd-fn'), lrIn = $('gd-lr'), lrOut = $('gd-lro'), btnRun = $('gd-run'), btnReset = $('gd-reset'), legend = $('gd-legend');
    var FNS = {
      bowl: {
        f: function (x, y) { return .5 * (x * x + 8 * y * y); },
        g: function (x, y) { return [x, 8 * y]; },
        view: [-3, 3, -2.25, 2.25], start: [-2.6, 1.7], mins: [[0, 0, 1]], lr: 57
      },
      valley: { // Rosenbrock-style curved valley
        f: function (x, y) { return (1 - x) * (1 - x) + 5 * (y - x * x) * (y - x * x); },
        g: function (x, y) { return [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)]; },
        view: [-2, 2, -1, 2], start: [-1.5, 1.8], mins: [[1, 1, 1]], lr: 45
      },
      wells: { // two basins: a shallow local minimum on the right, the global one on the left
        f: function (x, y) { return (x * x - 1) * (x * x - 1) + .8 * y * y + .25 * x; },
        g: function (x, y) { return [4 * x * (x * x - 1) + .25, 1.6 * y]; },
        view: [-2, 2, -1.5, 1.5], start: [1.75, 1.2], mins: [[-1.03, 0, 1], [0.967, 0, 0]], lr: 60
      }
    };
    var OPTS = [
      { key: 'gd', name: 'Gradient descent', col: 'pos', on: true },
      { key: 'mom', name: 'Momentum (' + tx('\\beta = 0.9') + ')', col: 'grad', on: true },
      { key: 'adam', name: 'Adam', col: 'fwd', on: true }
    ];
    var MAX_STEPS = 300, start, paths = {}, running = false, bg = document.createElement('canvas'), bgKey = '';

    function F() { return FNS[fnSel.value]; }
    function lr() { return Math.pow(10, -3 + 3 * lrIn.value / 100); }

    function resetPaths() {
      OPTS.forEach(function (o) {
        paths[o.key] = { x: start[0], y: start[1], vx: 0, vy: 0, mx: 0, my: 0, sx: 0, sy: 0, t: 0, pts: [[start[0], start[1]]], dead: false };
      });
    }

    function stepOpt(o, P) {
      if (P.dead || P.t >= MAX_STEPS) return;
      var g = F().g(P.x, P.y), eta = lr();
      P.t++;
      if (o.key === 'gd') { P.x -= eta * g[0]; P.y -= eta * g[1]; }
      else if (o.key === 'mom') { P.vx = .9 * P.vx + g[0]; P.vy = .9 * P.vy + g[1]; P.x -= eta * P.vx; P.y -= eta * P.vy; }
      else {
        var b1 = .9, b2 = .999;
        P.mx = b1 * P.mx + (1 - b1) * g[0]; P.my = b1 * P.my + (1 - b1) * g[1];
        P.sx = b2 * P.sx + (1 - b2) * g[0] * g[0]; P.sy = b2 * P.sy + (1 - b2) * g[1] * g[1];
        var c1 = 1 - Math.pow(b1, P.t), c2 = 1 - Math.pow(b2, P.t);
        P.x -= eta * (P.mx / c1) / (Math.sqrt(P.sx / c2) + 1e-8);
        P.y -= eta * (P.my / c1) / (Math.sqrt(P.sy / c2) + 1e-8);
      }
      if (!isFinite(P.x) || !isFinite(P.y) || Math.abs(P.x) > 50 || Math.abs(P.y) > 50) P.dead = true;
      else P.pts.push([P.x, P.y]);
    }

    function renderBg(W, H) {
      var key = fnSel.value + W + 'x' + H + C.mid + C.fwd;
      if (key === bgKey) return;
      bgKey = key;
      var dpr = Math.min(window.devicePixelRatio || 1, 2), res = 3;
      var gw = Math.ceil(W / res), gh = Math.ceil(H / res), v = F().view, f = F().f, vals = new Float32Array(gw * gh), lo = Infinity, hi = -Infinity, i, j;
      for (j = 0; j < gh; j++) for (i = 0; i < gw; i++) {
        var val = f(v[0] + (i + .5) / gw * (v[1] - v[0]), v[3] - (j + .5) / gh * (v[3] - v[2]));
        vals[j * gw + i] = val; if (val < lo) lo = val; if (val > hi) hi = val;
      }
      bg.width = gw; bg.height = gh;
      var bctx = bg.getContext('2d'), img = bctx.createImageData(gw, gh), d = img.data, span = Math.log(1 + hi - lo);
      for (i = 0; i < gw * gh; i++) {
        var tt = Math.log(1 + vals[i] - lo) / span, band = Math.floor(tt * 16) / 16;
        var c = V.mix(C.fwdRGB, C.midRGB, .15 + .85 * Math.pow(band, .7));
        d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
      }
      bctx.putImageData(img, 0, 0);
      void dpr;
    }

    function draw() {
      var s = V.setup(cv), ctx = s.ctx, W = s.w, H = s.h, v = F().view;
      function X(x) { return (x - v[0]) / (v[1] - v[0]) * W; }
      function Y(y) { return (v[3] - y) / (v[3] - v[2]) * H; }
      renderBg(W, H);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(bg, 0, 0, W, H); ctx.imageSmoothingEnabled = true;

      F().mins.forEach(function (m) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        if (m[2]) { ctx.beginPath(); ctx.moveTo(X(m[0]) - 6, Y(m[1]) - 6); ctx.lineTo(X(m[0]) + 6, Y(m[1]) + 6); ctx.moveTo(X(m[0]) + 6, Y(m[1]) - 6); ctx.lineTo(X(m[0]) - 6, Y(m[1]) + 6); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(X(m[0]), Y(m[1]), 6, 0, 7); ctx.stroke(); }
      });

      OPTS.forEach(function (o) {
        if (!o.on) return;
        var P = paths[o.key], col = C[o.col];
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
        ctx.beginPath();
        P.pts.forEach(function (p, k) { var px = V.clamp(X(p[0]), -50, W + 50), py = V.clamp(Y(p[1]), -50, H + 50); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
        ctx.stroke();
        var last = P.pts[P.pts.length - 1];
        ctx.fillStyle = col; ctx.strokeStyle = C.bg; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(last[0]), Y(last[1]), 6, 0, 7); ctx.fill(); ctx.stroke();
      });
      ctx.fillStyle = C.ink; ctx.strokeStyle = C.bg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(start[0]), Y(start[1]), 4, 0, 7); ctx.fill(); ctx.stroke();
      V.tag(ctx, 'start', X(start[0]), Y(start[1]) - 14, C.ink, '11px system-ui, sans-serif');
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('θ₁ →', W - 34, H - 8); ctx.fillText('θ₂ ↑', 6, 14);

      legend.innerHTML = OPTS.map(function (o) {
        var P = paths[o.key], last = P.pts[P.pts.length - 1];
        var st = P.dead ? '<b style="color:var(--viz-grad)">diverged</b>' : 'loss ' + fmt(F().f(last[0], last[1]), 3) + ' · step ' + P.t;
        return '<label class="chk"><input type="checkbox" data-opt="' + o.key + '"' + (o.on ? ' checked' : '') + '>' +
               '<i style="background:' + C[o.col] + '"></i>' + o.name + ' <span>(' + st + ')</span></label>';
      }).join('');
    }

    function loop() {
      if (!running) return;
      var busy = false;
      for (var k = 0; k < 2; k++) OPTS.forEach(function (o) { var P = paths[o.key]; stepOpt(o, P); if (!P.dead && P.t < MAX_STEPS) busy = true; });
      draw();
      if (busy) requestAnimationFrame(loop); else stop();
    }
    function run() { running = true; btnRun.textContent = 'Pause'; loop(); }
    function stop() { running = false; btnRun.textContent = 'Run'; }

    btnRun.addEventListener('click', function () {
      if (running) { stop(); return; }
      var done = OPTS.every(function (o) { var P = paths[o.key]; return P.dead || P.t >= MAX_STEPS; });
      if (done) resetPaths();
      run();
    });
    btnReset.addEventListener('click', function () { stop(); start = F().start.slice(); resetPaths(); draw(); });
    fnSel.addEventListener('change', function () {
      stop(); start = F().start.slice(); lrIn.value = F().lr; lrOut.textContent = fmt(lr(), 3); resetPaths(); draw();
    });
    lrIn.addEventListener('input', function () { lrOut.textContent = fmt(lr(), 3); stop(); resetPaths(); draw(); });
    legend.addEventListener('change', function (e) {
      var k = e.target.dataset.opt; if (!k) return;
      OPTS.forEach(function (o) { if (o.key === k) o.on = e.target.checked; });
      draw();
    });
    cv.addEventListener('pointerdown', function (e) {
      var p = V.pointer(e, cv), v = F().view;
      start = [v[0] + p.x / cv.clientWidth * (v[1] - v[0]), v[3] - p.y / cv.clientHeight * (v[3] - v[2])];
      stop(); resetPaths(); run();
    });

    start = F().start.slice(); lrIn.value = F().lr; lrOut.textContent = fmt(lr(), 3);
    resetPaths();
    V.watch(cv, function () { bgKey = ''; draw(); });
  })();

  /* ================================================================
     Putting it together: minibatch SGD with weight decay on a small MLP
     ================================================================ */
  function MLP(sizes, act, r) {
    this.sizes = sizes; this.act = act; this.W = [null]; this.b = [null];
    for (var l = 1; l < sizes.length; l++) {
      var nIn = sizes[l - 1], nOut = sizes[l], hiddenRelu = act === 'relu' && l < sizes.length - 1;
      var scale = Math.sqrt((hiddenRelu ? 2 : 1) / nIn), W = new Float64Array(nIn * nOut);
      for (var k = 0; k < W.length; k++) W[k] = V.randn(r) * scale;
      var b = new Float64Array(nOut); if (hiddenRelu) b.fill(.1);
      this.W.push(W); this.b.push(b);
    }
  }
  MLP.prototype.forward = function (x) {
    var A = [x], L = this.sizes.length - 1;
    for (var l = 1; l <= L; l++) {
      var nIn = this.sizes[l - 1], nOut = this.sizes[l], W = this.W[l], b = this.b[l], prev = A[l - 1], a = new Float64Array(nOut);
      var f = l === L ? V.ACT.sigmoid.f : V.ACT[this.act].f;
      for (var j = 0; j < nOut; j++) { var z = b[j]; for (var i = 0; i < nIn; i++) z += W[j * nIn + i] * prev[i]; a[j] = f(z); }
      A.push(a);
    }
    return A;
  };
  // One minibatch of gradient descent on binary cross-entropy (+ optional L2).
  MLP.prototype.step = function (batch, lr, l2) {
    var L = this.sizes.length - 1, sz = this.sizes, gW = [], gb = [], l, j, i, dAct = V.ACT[this.act].d;
    for (l = 1; l <= L; l++) { gW[l] = new Float64Array(this.W[l].length); gb[l] = new Float64Array(sz[l]); }
    for (var s = 0; s < batch.length; s++) {
      var A = this.forward([batch[s].x, batch[s].y]);
      var delta = [A[L][0] - batch[s].c];                       // ∂L/∂z at the output
      for (l = L; l >= 1; l--) {
        var nIn = sz[l - 1], prev = A[l - 1], W = this.W[l];
        for (j = 0; j < sz[l]; j++) {
          gb[l][j] += delta[j];
          for (i = 0; i < nIn; i++) gW[l][j * nIn + i] += delta[j] * prev[i];
        }
        if (l > 1) {                                            // push the error back one layer
          var nd = new Float64Array(nIn);
          for (i = 0; i < nIn; i++) {
            var sum = 0; for (j = 0; j < sz[l]; j++) sum += W[j * nIn + i] * delta[j];
            nd[i] = sum * dAct(prev[i]);
          }
          delta = nd;
        }
      }
    }
    var n = batch.length;
    for (l = 1; l <= L; l++) {
      for (i = 0; i < this.W[l].length; i++) this.W[l][i] -= lr * (gW[l][i] / n + l2 * this.W[l][i]);
      for (j = 0; j < sz[l]; j++) this.b[l][j] -= lr * gb[l][j] / n;
    }
  };
  MLP.prototype.evaluate = function (pts) {
    var loss = 0, hit = 0, L = this.sizes.length - 1;
    for (var k = 0; k < pts.length; k++) {
      var p = V.clamp(this.forward([pts[k].x, pts[k].y])[L][0], 1e-7, 1 - 1e-7), c = pts[k].c;
      loss -= c ? Math.log(p) : Math.log(1 - p);
      if ((p > .5 ? 1 : 0) === c) hit++;
    }
    return { loss: loss / pts.length, acc: hit / pts.length };
  };

  (function playground() {
    var netC = $('pg-net'); if (!netC) return;
    var outC = $('pg-out'), lossC = $('pg-loss'), statEl = $('pg-stats'), epochEl = $('pg-epoch'), layersEl = $('pg-layers'), showEl = $('pg-showing');
    var sel = { data: $('pg-data'), act: $('pg-act'), lr: $('pg-lr'), l2: $('pg-l2'), noise: $('pg-noise') };
    var btnPlay = $('pg-play'), btnStep = $('pg-step'), btnReset = $('pg-reset'), testChk = $('pg-test');
    var D = 1.3, G = 40, BATCH = 10;
    var hidden = [4, 4], seed = 1, train = [], test = [], net, epoch = 0, hist = [], playing = false, hover = null, tiles = [], grid = null;
    var vis = V.visibility($('pg'));

    function makeData() {
      var r = V.rng(97 + seed * 13), n = 240, noise = parseFloat(sel.noise.value), pts = [], kind = sel.data.value, i;
      for (i = 0; i < n; i++) {
        var c = i % 2, x, y, t;
        if (kind === 'circle') { var rad = c ? r() * .45 : .65 + r() * .3; t = r() * 2 * Math.PI; x = rad * Math.cos(t); y = rad * Math.sin(t); }
        else if (kind === 'xor') { x = r() * 2 - 1; y = r() * 2 - 1; x += x > 0 ? .06 : -.06; y += y > 0 ? .06 : -.06; c = x * y > 0 ? 1 : 0; }
        else if (kind === 'gauss') { var m = c ? .45 : -.45; x = m + V.randn(r) * .22; y = m + V.randn(r) * .22; }
        else { var k = Math.floor(i / 2) / (n / 2), rr = .06 + k * .9; t = k * 1.75 * 2 * Math.PI + c * Math.PI; x = rr * Math.sin(t); y = rr * Math.cos(t); }
        pts.push({ x: x + V.randn(r) * noise, y: y + V.randn(r) * noise, c: c });
      }
      for (i = pts.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp; }
      train = pts.slice(0, 168); test = pts.slice(168);
    }

    function buildNet() {
      net = new MLP([2].concat(hidden, [1]), sel.act.value, V.rng(seed * 7919 + 17));
      epoch = 0; hist = []; hover = null; record();
    }
    function record() { hist.push({ tr: net.evaluate(train), te: net.evaluate(test) }); }

    function runEpoch() {
      var order = train.slice(), lr = parseFloat(sel.lr.value), l2 = parseFloat(sel.l2.value);
      for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
      for (var k = 0; k < order.length; k += BATCH) net.step(order.slice(k, k + BATCH), lr, l2);
      epoch++; record();
    }

    function computeGrid() {
      var L = net.sizes.length - 1, l, j;
      grid = [];
      for (l = 0; l <= L; l++) { grid[l] = []; for (j = 0; j < net.sizes[l]; j++) grid[l][j] = new Float32Array(G * G); }
      for (var gy = 0; gy < G; gy++) for (var gx = 0; gx < G; gx++) {
        var A = net.forward([-D + (gx + .5) / G * 2 * D, D - (gy + .5) / G * 2 * D]), k = gy * G + gx;
        for (l = 0; l <= L; l++) for (j = 0; j < A[l].length; j++) grid[l][j][k] = A[l][j];
      }
    }
    // colour mapping for one unit's activation map
    function mapper(l, arr) {
      var L = net.sizes.length - 1;
      if (l === 0) return function (v) { return v / D; };
      if (l === L || net.act === 'sigmoid') return function (v) { return 2 * v - 1; };
      if (net.act === 'relu') { var mx = 1e-6; for (var i = 0; i < arr.length; i++) if (arr[i] > mx) mx = arr[i]; return function (v) { return v / mx; }; }
      return function (v) { return v; };
    }
    function unitName(l, j) {
      var L = net.sizes.length - 1;
      if (l === 0) return 'input ' + tx('x_' + (j + 1));
      if (l === L) return 'output ' + tx('\\hat y');
      return 'hidden layer ' + l + ', unit ' + (j + 1);
    }

    function drawNet() {
      var s = V.setup(netC), ctx = s.ctx, W = s.w, H = s.h, sizes = net.sizes, ncol = sizes.length, L = ncol - 1;
      var maxN = Math.max.apply(null, sizes), top = 24;
      var T = Math.max(16, Math.min(40, (H - top - 8) / (maxN * 1.28))), gap = T * 1.28, padX = 26;
      function colX(c) { return padX + T / 2 + c * (W - 2 * padX - T) / (ncol - 1); }
      var pos = sizes.map(function (n, l) {
        var y0 = top + (H - top - n * gap) / 2 + gap / 2;
        return Array.apply(null, Array(n)).map(function (_, j) { return [colX(l), y0 + j * gap]; });
      });
      for (var l = 1; l <= L; l++) {
        var nIn = sizes[l - 1];
        for (var j = 0; j < sizes[l]; j++) for (var i = 0; i < nIn; i++) {
          var w = net.W[l][j * nIn + i], a = pos[l - 1][i], b = pos[l][j], lit = hover && ((hover.l === l && hover.j === j) || (hover.l === l - 1 && hover.j === i));
          ctx.strokeStyle = V.rgba(w >= 0 ? C.posRGB : C.negRGB, lit ? 1 : .25 + .6 * Math.min(1, Math.abs(w)));
          ctx.lineWidth = .6 + Math.min(4, Math.abs(w) * 1.6);
          ctx.beginPath(); ctx.moveTo(a[0] + T / 2, a[1]);
          ctx.bezierCurveTo(a[0] + T / 2 + 20, a[1], b[0] - T / 2 - 20, b[1], b[0] - T / 2, b[1]); ctx.stroke();
        }
      }
      tiles = [];
      pos.forEach(function (col, l2) {
        col.forEach(function (p, j2) {
          var arr = grid[l2][j2], m = mapper(l2, arr), x = p[0] - T / 2, y = p[1] - T / 2;
          V.heatmap(ctx, x, y, T, T, G, function (u, v, i, jj) { return m(arr[jj * G + i]); });
          var on = hover && hover.l === l2 && hover.j === j2;
          ctx.strokeStyle = on ? C.accent : V.rgba(C.inkRGB, .5); ctx.lineWidth = on ? 2.5 : 1;
          ctx.strokeRect(x, y, T, T);
          tiles.push({ l: l2, j: j2, x: x, y: y, T: T });
        });
      });
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
      for (var c = 0; c < ncol; c++) ctx.fillText(c === 0 ? 'input' : c === L ? 'output' : 'hidden ' + c, colX(c), 13);
      ctx.textAlign = 'right'; ctx.fillText('x₁', colX(0) - T / 2 - 4, pos[0][0][1] + 4); ctx.fillText('x₂', colX(0) - T / 2 - 4, pos[0][1][1] + 4);
      ctx.textAlign = 'left';
    }

    function drawOut() {
      var s = V.setup(outC), ctx = s.ctx, W = s.w, H = s.h, L = net.sizes.length - 1;
      var l = hover ? hover.l : L, j = hover ? hover.j : 0, arr = grid[l][j], m = mapper(l, arr);
      // background kept a little lighter than the points so they stay visible on their own class colour
      V.heatmap(ctx, 0, 0, W, H, G, function (u, v, i, jj) { return .7 * m(arr[jj * G + i]); });
      function X(x) { return (x + D) / (2 * D) * W; }
      function Y(y) { return (D - y) / (2 * D) * H; }
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
      function dot(p, isTest) { // train: circle, test: diamond
        var x = X(p.x), y = Y(p.y);
        ctx.beginPath();
        if (isTest) { ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath(); }
        else ctx.arc(x, y, 4, 0, 7);
        ctx.fillStyle = p.c ? C.pos : C.neg; ctx.fill();
        ctx.strokeStyle = V.rgba(C.inkRGB, .75); ctx.lineWidth = 1; ctx.stroke();
      }
      train.forEach(function (p) { dot(p, false); });
      if (testChk.checked) test.forEach(function (p) { dot(p, true); });
      showEl.innerHTML = 'Showing: ' + unitName(l, j) + (hover ? ' (move away to see the output)' : '');
    }

    function drawLoss() {
      var s = V.setup(lossC), ctx = s.ctx, W = s.w, H = s.h, n = hist.length, pad = 6;
      var ymax = 0.1; hist.forEach(function (h) { ymax = Math.max(ymax, Math.min(1.5, h.tr.loss), Math.min(1.5, h.te.loss)); });
      function X(i) { return pad + (n > 1 ? i / (n - 1) : 0) * (W - 2 * pad); }
      function Y(v) { return H - pad - Math.min(v, ymax) / ymax * (H - 2 * pad - 10); }
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, Y(0)); ctx.lineTo(W - pad, Y(0)); ctx.stroke();
      [['te', C.muted, [5, 4]], ['tr', C.accent, []]].forEach(function (sr) {
        ctx.strokeStyle = sr[1]; ctx.lineWidth = 2; ctx.setLineDash(sr[2]); ctx.beginPath();
        hist.forEach(function (h, i) { var y = Y(h[sr[0]].loss); if (i) ctx.lineTo(X(i), y); else ctx.moveTo(X(i), y); });
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText('loss (max ' + fmt(ymax, 2) + ')', pad + 2, 12);
    }

    function render() {
      computeGrid(); drawNet(); drawOut(); drawLoss();
      var h = hist[hist.length - 1];
      epochEl.textContent = String(epoch).padStart(4, '0');
      statEl.innerHTML = '<span><b>Train</b> loss ' + fmt(h.tr.loss, 3) + ' · acc ' + Math.round(h.tr.acc * 100) + '%</span>' +
                         '<span><b>Test</b> loss ' + fmt(h.te.loss, 3) + ' · acc ' + Math.round(h.te.acc * 100) + '%</span>';
    }

    function renderLayers() {
      var h = '<span class="ctl-label">Hidden layers</span> <button class="vbtn sm" data-act="rm-layer"' + (hidden.length ? '' : ' disabled') + '>−</button> <b>' + hidden.length + '</b> ' +
              '<button class="vbtn sm" data-act="add-layer"' + (hidden.length < 4 ? '' : ' disabled') + '>+</button>';
      hidden.forEach(function (n, i) {
        h += '<span class="layer-ctl">L' + (i + 1) + ': <button class="vbtn sm" data-act="rm" data-i="' + i + '"' + (n > 1 ? '' : ' disabled') + '>−</button> ' + n +
             ' <button class="vbtn sm" data-act="add" data-i="' + i + '"' + (n < 8 ? '' : ' disabled') + '>+</button></span>';
      });
      layersEl.innerHTML = h;
    }
    layersEl.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var a = b.dataset.act, i = +b.dataset.i;
      if (a === 'add-layer') hidden.push(hidden.length ? hidden[hidden.length - 1] : 4);
      if (a === 'rm-layer') hidden.pop();
      if (a === 'add') hidden[i]++;
      if (a === 'rm') hidden[i]--;
      renderLayers(); buildNet(); render();
    });

    function frame() {
      if (!playing) return;
      if (vis.on) { runEpoch(); render(); }
      requestAnimationFrame(frame);
    }
    function setPlaying(on) { playing = on; btnPlay.textContent = on ? '❚❚ Pause' : '▶ Train'; if (on) frame(); }
    btnPlay.addEventListener('click', function () { setPlaying(!playing); });
    btnStep.addEventListener('click', function () { setPlaying(false); runEpoch(); render(); });
    btnReset.addEventListener('click', function () { seed++; buildNet(); render(); });
    sel.data.addEventListener('change', function () { makeData(); buildNet(); render(); });
    sel.noise.addEventListener('input', function () { $('pg-noiseo').textContent = fmt(parseFloat(sel.noise.value), 2); makeData(); buildNet(); render(); });
    sel.act.addEventListener('change', function () { buildNet(); render(); });
    testChk.addEventListener('change', render);

    netC.addEventListener('pointermove', function (e) {
      var p = V.pointer(e, netC), hit = null;
      tiles.forEach(function (t) { if (p.x >= t.x && p.x <= t.x + t.T && p.y >= t.y && p.y <= t.y + t.T) hit = t; });
      var changed = (hit ? hit.l + ':' + hit.j : '') !== (hover ? hover.l + ':' + hover.j : '');
      hover = hit ? { l: hit.l, j: hit.j } : null;
      if (changed) { drawNet(); drawOut(); }
    });
    netC.addEventListener('pointerleave', function () { if (hover) { hover = null; drawNet(); drawOut(); } });

    makeData(); renderLayers(); buildNet();
    V.watch(netC, render);
    V.watch(outC, function () { if (grid) { drawOut(); drawLoss(); } });
  })();
})();
