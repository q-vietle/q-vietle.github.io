/* Hero aquarium, mecha edition: robot clownfish, a robot blue tang, a mech sea turtle
   and a mech crab in a steel-and-neon tank.
   - Swimmers keep clear of the name/title block and swim away from the cursor.
   - Click / tap the tank to drop a fuel cell; nearby units chase and consume it.
   - Click a unit to hear a statistics / ML / AI one-liner. */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var hero = canvas.parentElement;
  var hint = document.getElementById('tank-hint');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  // What each kind of unit says: when eating, when startled, and when poked.
  var LINES = {
    clown: {
      eat:   ['Yum! More samples!', 'Nice, a fresh dataset!', 'n = 30 and counting!', 'Tasty features!'],
      scare: ['Outlier detected!', 'Whoa, high variance!', 'Is that significant?!', 'Type I error!'],
      poke:  ['Correlation ≠ causation', 'p-value ≠ P(H0 | data)', 'Bayes: update your priors!',
              'All models are wrong, some are useful', 'Always plot your data first', 'Large n won’t fix bias']
    },
    dory: {
      eat:   ['Just keep training!', 'Ooh, fresh data!', 'Mmm, gradient!'],
      scare: ['Who are you? Priors reset!', 'Catastrophic forgetting!', 'Vanishing gradient!'],
      poke:  ['Just keep descending the gradient!', 'Overfit? I forgot the training set!',
              'Attention is all you need', 'I speak fluent transformer!']
    },
    turtle: {
      eat:   ['Nom, one more epoch', 'Slow and steady converges', 'Nice batch!'],
      scare: ['Early stopping!', 'Learning rate too high!', 'Exploding gradients!'],
      poke:  ['Central Limit Theorem: wait for n', 'Regularize, don’t memorize',
              'Cross-validate before you trust', 'Patience: lr = 1e-4']
    },
    crab: {
      eat:   ['Bootstrap sample!', 'Sampling with replacement!', 'Mmm, residuals'],
      scare: ['Random walk away!', 'Escaping the local minimum!', 'Overfit escape!'],
      poke:  ['Pinch me: I’m a robust estimator', 'Sideways is a valid regression',
              'Monte Carlo says hi', 'Grabbing outliers']
    }
  };

  var CY = '120, 235, 255';                       // neon cyan (rgb) used for HUD lines and glows
  var INK = '#0a141d';                            // outline colour for all robots
  var STEEL = { dark: '#1f3242', mid: '#4d6a80', light: '#9fb8c9' };
  var ACCENTS = ['#39e6ff', '#ff4fd8', '#ffb02e', '#7dff6a'];

  var FLOOR = 34;          // height of the steel deck
  var SCARE_RADIUS = 110;  // cursor distance that startles units
  var SEEK_RADIUS = 300;   // distance swimmers notice fuel cells
  var AVOID_PAD = 26;      // clearance kept around the title block
  var MAX_FOOD = 30;
  var MAX_SPEECH = 3;      // speech bubbles on screen at once

  var w = 0, h = 0, t = 0;
  var animals = [], bubbles = [], food = [], ripples = [], cables = [], corals = [], avoid = [];
  var mouse = { x: -9999, y: -9999 };
  var raf = null, visible = true;
  var sky; // light-beam gradient, rebuilt on resize

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function waterBottom() { return h - FLOOR; }
  function deckY() { return h - FLOOR + 8; }
  function crabY(size) { return h - FLOOR + 4 - size * .3; }

  /* ---------- Keep-clear zones (name, title and buttons; avatar) ---------- */
  function measure() {
    avoid = [];
    var hr = hero.getBoundingClientRect();
    var els = hero.querySelectorAll('.hero-inner > div');
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      avoid.push({ l: r.left - hr.left, t: r.top - hr.top, r: r.right - hr.left, b: r.bottom - hr.top });
    }
  }

  function insideAvoid(x, y, pad) {
    for (var i = 0; i < avoid.length; i++) {
      var R = avoid[i];
      if (x > R.l - pad && x < R.r + pad && y > R.t - pad && y < R.b + pad) return true;
    }
    return false;
  }

  /* ---------- Setup ---------- */
  function makeSwimmer(kind, sizeOverride) {
    var size = sizeOverride || (kind === 'dory' ? 24 : kind === 'turtle' ? 27 : 17);
    var a = rand(0, Math.PI * 2);
    var sp = kind === 'turtle' ? rand(.4, .55) : rand(.5, 1.1);
    var x = 0, y = 0;
    for (var tries = 0; tries < 40; tries++) {
      x = rand(0, w); y = rand(60, Math.max(80, waterBottom() - 40));
      if (!insideAvoid(x, y, AVOID_PAD + size)) break;
    }
    return {
      kind: kind, size: size, say: null, sayCd: 120, boost: 0,
      x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .3,
      cruise: sp, phase: rand(0, 6.28), wander: rand(0, 6.28)
    };
  }

  function makeCrab() {
    var size = rand(15, 18);
    return {
      kind: 'crab', size: size, say: null, sayCd: 120, boost: 0,
      x: rand(40, Math.max(60, w - 40)), y: crabY(size), vx: 0, vy: 0,
      dir: 0, timer: rand(30, 120), phase: rand(0, 6.28), seed: rand(0, 6.28)
    };
  }

  function growBranch(segs, x, y, ang, len, depth) {
    var x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    segs.push({ x1: x, y1: y, x2: x2, y2: y2, w: depth * 1.6 + 1, tip: depth === 1 });
    if (depth <= 1) return;
    growBranch(segs, x2, y2, ang - rand(.35, .6), len * rand(.7, .8), depth - 1);
    growBranch(segs, x2, y2, ang + rand(.35, .6), len * rand(.7, .8), depth - 1);
    if (depth >= 3 && Math.random() < .5) growBranch(segs, x2, y2, ang + rand(-.15, .15), len * .6, depth - 2);
  }

  // Shapes are generated once here so drawing stays cheap
  function makeCoral(x) {
    var types = ['branch', 'branch', 'dome', 'tube', 'fan'];
    var c = {
      type: types[Math.floor(Math.random() * types.length)], x: x, phase: rand(0, 6.28),
      col: ACCENTS[Math.floor(Math.random() * ACCENTS.length)], k: rand(.85, 1.15)
    };
    if (c.type === 'branch') {
      c.segs = [];
      growBranch(c.segs, 0, 0, -Math.PI / 2 + rand(-.15, .15), rand(15, 20) * c.k, 4);
    } else if (c.type === 'dome') {
      c.r = rand(22, 32) * c.k;
    } else if (c.type === 'tube') {
      c.tubes = [];
      var n = 4 + Math.floor(Math.random() * 3);
      for (var i = 0; i < n; i++) {
        c.tubes.push({ dx: (i - (n - 1) / 2) * 10 * c.k + rand(-2, 2), hgt: rand(22, 52) * c.k, wd: rand(6, 9) });
      }
    } else {
      c.hgt = rand(44, 58) * c.k;
    }
    return c;
  }

  function resize() {
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();

    sky = ctx.createLinearGradient(0, 0, 0, h * .85);
    sky.addColorStop(0, 'rgba(' + CY + ', .14)');
    sky.addColorStop(1, 'rgba(' + CY + ', 0)');

    animals = [
      makeSwimmer('dory'), makeSwimmer('turtle'),
      makeSwimmer('clown', 23), makeSwimmer('clown', 12), // one big, one small
      makeCrab()
    ];

    corals = [];
    var nc = Math.max(4, Math.round(w / 170)), slot = w / nc;
    for (var q = 0; q < nc; q++) corals.push(makeCoral((q + .5) * slot + rand(-.3, .3) * slot));

    cables = [];
    var clumps = Math.max(4, Math.round(w / 110));
    for (var k = 0; k < clumps; k++) {
      cables.push({ x: rand(0, w), height: rand(50, 120), phase: rand(0, 6.28), blades: 2 + Math.floor(Math.random() * 2) });
    }
    bubbles = []; food = []; ripples = [];
  }

  /* ---------- Simulation ---------- */
  // `force` (used when poked) overrides the cooldown and the on-screen limit.
  function speak(a, mood, force) {
    if (!force) {
      if (a.sayCd > 0 || a.say) return;
      var active = 0;
      for (var i = 0; i < animals.length; i++) if (animals[i].say) active++;
      if (active >= MAX_SPEECH) return;
    }
    var pool = LINES[a.kind][mood];
    a.say = { text: pool[Math.floor(Math.random() * pool.length)], life: 170 };
    a.sayCd = 360;
  }

  function addBubble(x, y, r) {
    bubbles.push({ x: x, y: y, r: r, vy: rand(.4, 1.1), phase: rand(0, 6.28) });
  }

  function tickTalk(a) {
    if (a.sayCd > 0) a.sayCd--;
    if (a.say && --a.say.life <= 0) a.say = null;
  }

  // Soft push away from the title block, plus a hard bounce as a backstop.
  function keepClear(f, acc) {
    var SOFT = 60;
    for (var i = 0; i < avoid.length; i++) {
      var R = avoid[i];
      var l = R.l - AVOID_PAD, r = R.r + AVOID_PAD, tp = R.t - AVOID_PAD, bt = R.b + AVOID_PAD;
      var nx = clamp(f.x, l, r), ny = clamp(f.y, tp, bt);
      var dx = f.x - nx, dy = f.y - ny, d = Math.sqrt(dx * dx + dy * dy);

      if (d > 0 && d < SOFT) {                       // approaching: steer away
        var k = .09 * (1 - d / SOFT);
        acc.x += dx / d * k; acc.y += dy / d * k;
      } else if (d === 0) {                          // inside: bounce out through the nearest side
        var dl = f.x - l, dr = r - f.x, dt = f.y - tp, db = bt - f.y, m = Math.min(dl, dr, dt, db);
        if (m === dl) { f.vx = -Math.max(Math.abs(f.vx), .6); f.x -= 1.2; }
        else if (m === dr) { f.vx = Math.max(Math.abs(f.vx), .6); f.x += 1.2; }
        else if (m === dt) { f.vy = -Math.max(Math.abs(f.vy), .5); f.y -= 1.2; }
        else { f.vy = Math.max(Math.abs(f.vy), .5); f.y += 1.2; }
      }
    }
  }

  function updateSwimmer(f) {
    var acc = { x: 0, y: 0 }, seeking = false;
    tickTalk(f);

    // lazy wandering
    f.wander += rand(-.15, .15);
    acc.x += Math.cos(f.wander) * .02;
    acc.y += Math.sin(f.wander) * .008;

    // stay inside the tank
    if (f.y < 34) acc.y += .04;
    if (f.y > waterBottom() - 30) acc.y -= .05;
    if (f.x < 24) acc.x += .05;
    if (f.x > w - 24) acc.x -= .05;

    // chase the closest fuel cell
    var best = null, bestD = SEEK_RADIUS;
    for (var i = 0; i < food.length; i++) {
      var dx = food[i].x - f.x, dy = food[i].y - f.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = food[i]; }
    }
    if (best) {
      seeking = true;
      acc.x += (best.x - f.x) / bestD * .08; acc.y += (best.y - f.y) / bestD * .08;
      if (bestD < f.size * (f.kind === 'turtle' ? 1.3 : .9)) {
        best.eaten = true;
        speak(f, 'eat');
        for (var b = 0; b < 3; b++) addBubble(f.x + f.vx * 6, f.y - f.size * .2, rand(1.5, 3));
      }
    }

    // startled by the cursor
    var mx = f.x - mouse.x, my = f.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
    if (md < SCARE_RADIUS && md > 1) {
      var k = 1 - md / SCARE_RADIUS;
      acc.x += mx / md * .35 * k; acc.y += my / md * .35 * k;
      if (f.boost === 0) speak(f, 'scare');
      f.boost = 30;
    }

    keepClear(f, acc);

    f.vx += acc.x; f.vy += acc.y;
    f.vx *= .995; f.vy *= .995;

    var max = f.cruise * (f.boost > 0 ? 2.3 : seeking ? 1.6 : 1);
    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    if (sp > max) { f.vx *= max / sp; f.vy *= max / sp; sp = max; }
    if (sp < .3 && f.kind !== 'turtle') f.vx += (f.vx >= 0 ? .02 : -.02);
    if (f.kind === 'turtle' && sp < .2) f.vx += (f.vx >= 0 ? .01 : -.01);
    if (f.boost > 0) f.boost--;

    f.x += f.vx; f.y += f.vy;
    f.phase += .1 + sp * (f.kind === 'turtle' ? .25 : .12);
  }

  // Crabs walk sideways along the deck, go for fuel cells that reach the floor,
  // and scuttle away from the cursor.
  function updateCrab(f) {
    tickTalk(f);
    var dir = f.dir, speed = .35;

    var target = null, bestD = 320;
    for (var i = 0; i < food.length; i++) {
      if (food[i].y < h - FLOOR - 70) continue; // only cells that are close to the floor
      var d = Math.abs(food[i].x - f.x);
      if (d < bestD) { bestD = d; target = food[i]; }
    }

    var mx = f.x - mouse.x, my = f.y - mouse.y;
    if (mx * mx + my * my < Math.pow(SCARE_RADIUS * .9, 2)) {
      dir = mx >= 0 ? 1 : -1; speed = 1.6;
      if (f.boost === 0) speak(f, 'scare');
      f.boost = 30;
    } else if (target) {
      dir = target.x >= f.x ? 1 : -1; speed = 1;
      if (bestD < f.size * .9 && target.y > h - FLOOR - 6) {
        target.eaten = true;
        speak(f, 'eat');
        addBubble(f.x, f.y - f.size, 2);
      }
      if (bestD < 3) dir = 0;
    } else {
      if (--f.timer <= 0) { f.dir = [-1, 0, 1][Math.floor(Math.random() * 3)]; f.timer = rand(60, 240); }
      dir = f.dir;
    }
    if (f.boost > 0) f.boost--;

    if (f.x < 24) { dir = 1; f.dir = 1; }
    if (f.x > w - 24) { dir = -1; f.dir = -1; }

    f.vx = dir * speed;
    f.x += f.vx;
    f.y = crabY(f.size);
    f.phase += Math.abs(f.vx) * .3;
  }

  function step() {
    t++;
    for (var i = 0; i < animals.length; i++) {
      if (animals[i].kind === 'crab') updateCrab(animals[i]); else updateSwimmer(animals[i]);
    }

    // fuel cells sink, rest on the deck, then power down
    for (var j = food.length - 1; j >= 0; j--) {
      var p = food[j];
      p.age++;
      if (p.y < h - FLOOR + 6) { p.y += .4; p.x += Math.sin(t * .05 + p.seed) * .2; }
      if (p.eaten || p.age > 900) food.splice(j, 1);
    }

    // bubbles
    if (Math.random() < .04) addBubble(rand(0, w), h - FLOOR, rand(1.5, 4));
    for (var b = bubbles.length - 1; b >= 0; b--) {
      var bb = bubbles[b];
      bb.y -= bb.vy; bb.x += Math.sin(t * .04 + bb.phase) * .3;
      if (bb.y < -8) bubbles.splice(b, 1);
    }
    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].r += 1.6; ripples[r].life -= .03;
      if (ripples[r].life <= 0) ripples.splice(r, 1);
    }
  }

  /* ---------- Drawing helpers ---------- */
  function poly(pts, s, k) { // pts are [x, y] in units of s; k optionally stretches y
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var x = pts[i][0] * s, y = pts[i][1] * s * (k || 1);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function gear(cx, cy, r, teeth, rot) {
    ctx.beginPath();
    var n = teeth * 4;
    for (var i = 0; i < n; i++) {
      var a = rot + i * Math.PI * 2 / n, rr = (i % 4 < 2) ? r * 1.28 : r;
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function glowDot(x, y, r, rgb, alpha) { // soft halo + solid core
    ctx.fillStyle = 'rgba(' + rgb + ',' + alpha * .25 + ')';
    ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(' + rgb + ',' + alpha + ')';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
  }

  /* ---------- Drawing: tank ---------- */
  function drawGrid() {
    ctx.strokeStyle = 'rgba(' + CY + ', .05)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x < w; x += 48) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); }
    for (var y = 0; y < h; y += 48) { ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); }
    ctx.stroke();

    // sweeping scan line
    var sy = (t * .8) % (h + 120) - 60;
    var g = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
    g.addColorStop(0, 'rgba(' + CY + ', 0)');
    g.addColorStop(.5, 'rgba(' + CY + ', .09)');
    g.addColorStop(1, 'rgba(' + CY + ', 0)');
    ctx.fillStyle = g; ctx.fillRect(0, sy - 30, w, 60);
  }

  function drawBeams() {
    ctx.fillStyle = sky;
    for (var i = 0; i < 5; i++) {
      var x = (i + .3) * w / 4.2 + Math.sin(t * .006 + i * 1.7) * 40;
      var rw = 50 + i * 14;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + rw, 0);
      ctx.lineTo(x + rw - 140, h * .85); ctx.lineTo(x - 140, h * .85);
      ctx.closePath(); ctx.fill();
    }
  }

  function drawBrackets() {
    var m = 10, L = 20;
    ctx.strokeStyle = 'rgba(' + CY + ', .5)'; ctx.lineWidth = 2; ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m);
    ctx.moveTo(w - m - L, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + L);
    ctx.moveTo(m, h - m - L); ctx.lineTo(m, h - m); ctx.lineTo(m + L, h - m);
    ctx.moveTo(w - m - L, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - L);
    ctx.stroke();
  }

  // Waving cables with glowing nodes (the seaweed)
  function drawCables() {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < cables.length; i++) {
      var cb = cables[i];
      for (var b = 0; b < cb.blades; b++) {
        var ox = (b - (cb.blades - 1) / 2) * 9, segs = 8, pts = [];
        for (var s = 0; s <= segs; s++) {
          var f = s / segs;
          var sway = Math.sin(t * .025 + cb.phase + b * .8 + f * 2.2) * 14 * f;
          pts.push([cb.x + ox + sway, deckY() + 2 - f * cb.height * (1 - b * .15)]);
        }
        ctx.strokeStyle = 'rgba(88, 128, 156, .75)';
        ctx.lineWidth = 3.6 - b * .5;
        ctx.beginPath();
        for (var p = 0; p < pts.length; p++) { if (p === 0) ctx.moveTo(pts[p][0], pts[p][1]); else ctx.lineTo(pts[p][0], pts[p][1]); }
        ctx.stroke();
        for (var n = 2; n <= segs; n += 3) {
          var pulse = .55 + .45 * Math.sin(t * .07 + cb.phase + n);
          glowDot(pts[n][0], pts[n][1], 1.7, CY, pulse);
        }
      }
    }
  }

  function drawCorals() {
    for (var i = 0; i < corals.length; i++) {
      var c = corals[i], rgb = hexToRgb(c.col);
      var pulse = .6 + .4 * Math.sin(t * .08 + c.phase);
      ctx.save();
      ctx.translate(c.x, deckY() + 1);
      ctx.scale(1.25, 1.25);
      if (c.type === 'dome') ctx.translate(0, -5);
      ctx.lineJoin = 'miter';

      if (c.type === 'branch') { // circuit tree
        ctx.transform(1, 0, Math.sin(t * .015 + c.phase) * .03, 1, 0, 0);
        ctx.lineCap = 'square';
        ctx.strokeStyle = STEEL.mid;
        for (var s = 0; s < c.segs.length; s++) {
          var g = c.segs[s];
          ctx.lineWidth = g.w;
          ctx.beginPath(); ctx.moveTo(g.x1, g.y1); ctx.lineTo(g.x2, g.y2); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(' + rgb + ', .9)'; ctx.lineWidth = 1; // glowing trace
        for (var s2 = 0; s2 < c.segs.length; s2++) {
          var g2 = c.segs[s2];
          ctx.beginPath(); ctx.moveTo(g2.x1, g2.y1); ctx.lineTo(g2.x2, g2.y2); ctx.stroke();
        }
        for (var e = 0; e < c.segs.length; e++) {
          if (!c.segs[e].tip) continue;
          var tx = c.segs[e].x2, ty = c.segs[e].y2;
          ctx.fillStyle = 'rgba(' + rgb + ', ' + (.15 * pulse) + ')';
          ctx.beginPath(); ctx.arc(tx, ty, 6, 0, 6.283); ctx.fill();
          ctx.fillStyle = c.col;
          ctx.beginPath(); ctx.moveTo(tx, ty - 3.2); ctx.lineTo(tx + 3.2, ty); ctx.lineTo(tx, ty + 3.2); ctx.lineTo(tx - 3.2, ty);
          ctx.closePath(); ctx.fill();
        }

      } else if (c.type === 'dome') { // radar turret
        var r = c.r, ry = r * .75;
        var dg = ctx.createLinearGradient(0, -ry, 0, 0);
        dg.addColorStop(0, STEEL.light); dg.addColorStop(1, STEEL.dark);
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.clip();
        ctx.strokeStyle = 'rgba(5, 15, 25, .45)'; ctx.lineWidth = 1.4;
        for (var m = 1; m <= 3; m++) {
          ctx.beginPath(); ctx.ellipse(0, 0, r * m / 3.3, ry * m / 3.3, 0, Math.PI, 2 * Math.PI); ctx.stroke();
        }
        ctx.beginPath();
        for (var a = 1; a < 6; a++) { ctx.moveTo(0, 0); ctx.lineTo(Math.cos(Math.PI * a / 6 + Math.PI) * r, -Math.sin(Math.PI * a / 6) * ry); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(' + rgb + ', ' + (.5 + .5 * pulse) + ')'; ctx.lineWidth = 2.2; // visor
        ctx.beginPath(); ctx.ellipse(0, 0, r * .62, ry * .62, 0, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = STEEL.dark; ctx.fillRect(-r * 1.05, -2, r * 2.1, 4);
        ctx.strokeStyle = STEEL.light; ctx.lineWidth = 1.4; // antenna + blinking LED
        ctx.beginPath(); ctx.moveTo(0, -ry); ctx.lineTo(0, -ry - 10); ctx.stroke();
        glowDot(0, -ry - 10, 2, rgb, pulse);

      } else if (c.type === 'tube') { // pistons
        for (var u = 0; u < c.tubes.length; u++) {
          var tb = c.tubes[u], hw = tb.wd / 2;
          var tg = ctx.createLinearGradient(tb.dx - hw, 0, tb.dx + hw, 0);
          tg.addColorStop(0, STEEL.dark); tg.addColorStop(.45, STEEL.light); tg.addColorStop(1, STEEL.dark);
          ctx.fillStyle = tg;
          ctx.fillRect(tb.dx - hw, -tb.hgt, tb.wd, tb.hgt);
          ctx.fillStyle = 'rgba(5, 15, 25, .5)';
          ctx.fillRect(tb.dx - hw, -tb.hgt * .33, tb.wd, 1.4);
          ctx.fillRect(tb.dx - hw, -tb.hgt * .66, tb.wd, 1.4);
          ctx.fillStyle = STEEL.dark; ctx.fillRect(tb.dx - hw - 1.5, -3, tb.wd + 3, 3);
          ctx.fillStyle = STEEL.mid; ctx.fillRect(tb.dx - hw - 1, -tb.hgt - 2, tb.wd + 2, 3);
          ctx.fillStyle = 'rgba(' + rgb + ', ' + (.4 + .6 * pulse) + ')';
          ctx.fillRect(tb.dx - hw + 1, -tb.hgt - 3.5, tb.wd - 2, 2);
        }

      } else { // radar array
        ctx.transform(1, 0, Math.sin(t * .02 + c.phase) * .06, 1, 0, 0);
        var by = -c.hgt * .22, L = c.hgt * .78, rays = 9;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = STEEL.mid; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, by); ctx.stroke();
        ctx.strokeStyle = STEEL.light; ctx.lineWidth = 1.7;
        for (var i2 = 0; i2 < rays; i2++) {
          var ang = -Math.PI / 2 + (i2 - (rays - 1) / 2) * .2;
          ctx.beginPath(); ctx.moveTo(0, by);
          ctx.lineTo(Math.cos(ang) * L, by + Math.sin(ang) * L); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(' + rgb + ', .85)'; ctx.lineWidth = 1.2;
        for (var f = 1; f <= 3; f++) {
          ctx.beginPath();
          for (var i3 = 0; i3 < rays; i3++) {
            var an = -Math.PI / 2 + (i3 - (rays - 1) / 2) * .2, d = L * f / 3.2;
            var px = Math.cos(an) * d, py = by + Math.sin(an) * d;
            if (i3 === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.fillStyle = STEEL.dark; ctx.beginPath(); ctx.arc(0, by, 4, 0, 6.283); ctx.fill();
        glowDot(0, by, 1.8, rgb, pulse);
      }
      ctx.restore();
    }
  }

  // Steel deck with seams, rivets, a data conduit and hazard stripes
  function drawDeck() {
    var y0 = deckY();
    var glow = ctx.createLinearGradient(0, y0 - 10, 0, y0);
    glow.addColorStop(0, 'rgba(' + CY + ', 0)'); glow.addColorStop(1, 'rgba(' + CY + ', .2)');
    ctx.fillStyle = glow; ctx.fillRect(0, y0 - 10, w, 10);

    var g = ctx.createLinearGradient(0, y0, 0, h);
    g.addColorStop(0, '#34495b'); g.addColorStop(1, '#0c1620');
    ctx.fillStyle = g; ctx.fillRect(0, y0, w, h - y0);
    ctx.fillStyle = 'rgba(' + CY + ', .85)'; ctx.fillRect(0, y0, w, 2);

    ctx.strokeStyle = 'rgba(0, 0, 0, .35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (var x = 48; x < w; x += 96) { ctx.moveTo(x, y0 + 2); ctx.lineTo(x, h); }
    ctx.stroke();

    ctx.fillStyle = 'rgba(159, 184, 201, .75)';
    for (var rx = 12; rx < w; rx += 48) {
      ctx.beginPath(); ctx.arc(rx, y0 + 7, 1.6, 0, 6.283); ctx.fill();
    }

    // conduit with travelling data pulses
    var cy = y0 + 14;
    ctx.fillStyle = 'rgba(0, 0, 0, .45)'; ctx.fillRect(0, cy - 2, w, 4);
    for (var d = 0; d < w / 160 + 1; d++) {
      var px = ((t * 1.4 + d * 160) % (w + 40)) - 20;
      ctx.fillStyle = 'rgba(' + CY + ', .9)'; ctx.fillRect(px, cy - 1, 14, 2);
    }

    // hazard stripes along the bottom edge
    ctx.save();
    ctx.beginPath(); ctx.rect(0, h - 5, w, 5); ctx.clip();
    ctx.fillStyle = '#ffb02e'; ctx.fillRect(0, h - 5, w, 5);
    ctx.fillStyle = '#10161d';
    for (var hx = -10; hx < w + 10; hx += 16) {
      ctx.beginPath(); ctx.moveTo(hx, h); ctx.lineTo(hx + 8, h); ctx.lineTo(hx + 13, h - 5); ctx.lineTo(hx + 5, h - 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- Drawing: units (swimmers face right; flipped by direction) ---------- */

  // Robot clownfish (kind 'clown') and robot blue tang (kind 'dory')
  function drawFish(f) {
    var s = f.size, dory = f.kind === 'dory';
    var dir = f.vx < 0 ? -1 : 1;
    var angle = Math.atan2(f.vy, Math.abs(f.vx));
    var wag = Math.sin(f.phase);
    var k = dory ? 1.1 : .85;
    var base = dory ? '#3b82f6' : '#ff7a1a';
    var baseDark = dory ? '#1d4ed8' : '#d9590a';
    var tailCol = dory ? '#ffd23f' : '#ff7a1a';
    var eye = dory ? '255, 224, 102' : CY;
    var hull = [[1, 0], [.72, -.42], [.22, -.75], [-.35, -.6], [-.85, -.18], [-.85, .18], [-.35, .6], [.22, .75], [.72, .42]];

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(dir, 1);
    ctx.rotate(angle);
    ctx.lineJoin = 'round';
    ctx.lineWidth = .06 * s;
    ctx.strokeStyle = INK;

    // antenna with a blinking beacon
    var blink = .5 + .5 * Math.sin(t * .12 + f.phase);
    ctx.beginPath(); ctx.moveTo(.3 * s, -.68 * k * s); ctx.lineTo(.52 * s, -1.08 * k * s); ctx.stroke();
    glowDot(.52 * s, -1.08 * k * s, .07 * s, '255, 90, 90', .5 + .5 * blink);

    // segmented tail
    ctx.fillStyle = tailCol;
    poly([[-.8, -.14], [-1.5, -.72 + wag * .4], [-1.22, wag * .3], [-1.5, .72 + wag * .4], [-.8, .14]], s);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(10, 20, 29, .45)';
    ctx.beginPath(); ctx.moveTo(-.85 * s, 0); ctx.lineTo(-1.38 * s, (wag * .3 + .02) * s); ctx.stroke();
    ctx.strokeStyle = INK;

    // dorsal fin
    ctx.fillStyle = baseDark;
    poly([[.35, -.66], [.05, -1.15], [-.55, -.6]], s, k);
    ctx.fill(); ctx.stroke();

    // hull plating
    ctx.fillStyle = base;
    poly(hull, s, k); ctx.fill();
    ctx.save();
    poly(hull, s, k); ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, .15)'; // lit top facet
    poly([[1, 0], [.72, -.42], [.22, -.75], [-.35, -.6], [-.85, -.18], [-.85, 0]], s, k); ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, .2)';        // shaded belly facet
    ctx.fillRect(-s, .04 * s, 2.2 * s, s);
    if (dory) {
      ctx.fillStyle = '#ffd23f';                 // yellow rear plating
      poly([[-1, -.05], [-.2, .1], [.35, 1.2], [-1, 1.2]], s); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = .24 * s; ctx.lineJoin = 'miter'; // black chevron band
      ctx.beginPath();
      ctx.moveTo(.55 * s, -.32 * s); ctx.lineTo(.05 * s, -.62 * s); ctx.lineTo(-.45 * s, -.4 * s); ctx.lineTo(-.85 * s, .12 * s);
      ctx.stroke();
      ctx.lineJoin = 'round';
    } else {
      var stripes = [[.45, .2], [-.08, .26], [-.68, .14]]; // slanted white armour bands
      for (var i = 0; i < stripes.length; i++) {
        var x = stripes[i][0] * s, sw = stripes[i][1] * s, e = .05 * s, sl = .12 * s;
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.moveTo(x - sw / 2 - e - sl, -s); ctx.lineTo(x + sw / 2 + e - sl, -s);
        ctx.lineTo(x + sw / 2 + e + sl, s); ctx.lineTo(x - sw / 2 - e + sl, s); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4f8fb';
        ctx.beginPath(); ctx.moveTo(x - sw / 2 - sl, -s); ctx.lineTo(x + sw / 2 - sl, -s);
        ctx.lineTo(x + sw / 2 + sl, s); ctx.lineTo(x - sw / 2 + sl, s); ctx.closePath(); ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(' + CY + ', .7)'; ctx.lineWidth = .035 * s; // glowing seam
    ctx.beginPath(); ctx.moveTo(.85 * s, .16 * s); ctx.lineTo(-.75 * s, .18 * s); ctx.stroke();
    ctx.fillStyle = 'rgba(10, 20, 29, .55)';                              // rivets
    var rv = [[.05, -.5], [.3, -.42], [-.25, -.42]];
    for (var r = 0; r < rv.length; r++) {
      ctx.beginPath(); ctx.arc(rv[r][0] * s, rv[r][1] * k * s, .04 * s, 0, 6.283); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = .06 * s;
    poly(hull, s, k); ctx.stroke();

    // pectoral fin
    ctx.save();
    ctx.translate(-.05 * s, .24 * s); ctx.rotate(.5 + wag * .3);
    ctx.fillStyle = STEEL.light;
    poly([[-.3, -.07], [.3, -.02], [.3, .06], [-.3, .1]], s); ctx.fill(); ctx.stroke();
    ctx.restore();

    // LED eye
    var ex = .55 * s, ey = -.14 * s;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex, ey, .2 * s, 0, 6.283); ctx.fill();
    glowDot(ex, ey, .12 * s, eye, 1);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + .04 * s, ey - .04 * s, .035 * s, 0, 6.283); ctx.fill();

    ctx.restore();
  }

  function drawTurtle(f) {
    var s = f.size;
    var dir = f.vx < 0 ? -1 : 1;
    var angle = Math.atan2(f.vy, Math.abs(f.vx)) * .6;
    var flap = Math.sin(f.phase * .5);
    var steel = '#6d8b9a';
    var shell = [[-.95, .28], [-.85, -.12], [-.5, -.55], [.05, -.72], [.55, -.5], [.85, -.1], [.9, .28]];

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(dir, 1);
    ctx.rotate(angle);
    ctx.lineJoin = 'round';
    ctx.lineWidth = .05 * s;
    ctx.strokeStyle = INK;

    // rear flipper and tail
    ctx.fillStyle = steel;
    ctx.save(); ctx.translate(-.7 * s, .3 * s); ctx.rotate(2.5 - flap * .3); // pivots at its root
    poly([[0, -.09], [.5, -.05], [.5, .05], [0, .1]], s); ctx.fill(); ctx.stroke();
    ctx.restore();
    poly([[-.9, .05], [-1.28, .17], [-.9, .24]], s); ctx.fill(); ctx.stroke();

    // boxy head with a visor
    ctx.fillStyle = STEEL.light;
    poly([[.7, -.2], [1.12, -.2], [1.34, -.02], [1.2, .24], [.7, .26]], s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillRect(.92 * s, -.13 * s, .3 * s, .14 * s);
    ctx.fillStyle = 'rgba(' + CY + ', .95)'; ctx.fillRect(.95 * s, -.1 * s, .24 * s, .08 * s);

    // armoured shell
    var g = ctx.createLinearGradient(0, -.72 * s, 0, .3 * s);
    g.addColorStop(0, '#86ad4f'); g.addColorStop(1, '#3f5f24');
    ctx.fillStyle = g;
    poly(shell, s); ctx.fill();
    ctx.save();
    poly(shell, s); ctx.clip();
    ctx.strokeStyle = 'rgba(10, 20, 29, .55)'; ctx.lineWidth = .04 * s;
    ctx.beginPath();
    ctx.moveTo(-.5 * s, .3 * s); ctx.lineTo(-.32 * s, -.7 * s);
    ctx.moveTo(.45 * s, .3 * s); ctx.lineTo(.3 * s, -.6 * s);
    ctx.moveTo(-1 * s, -.02 * s); ctx.lineTo(1 * s, -.02 * s);
    ctx.stroke();
    ctx.fillStyle = 'rgba(10, 20, 29, .6)';
    var rv = [[-.5, -.02], [.45, -.02], [-.7, .16], [.7, .16]];
    for (var r = 0; r < rv.length; r++) {
      ctx.beginPath(); ctx.arc(rv[r][0] * s, rv[r][1] * s, .045 * s, 0, 6.283); ctx.fill();
    }
    // rotating gear
    ctx.fillStyle = STEEL.light; ctx.strokeStyle = INK; ctx.lineWidth = .035 * s;
    gear(0, -.34 * s, .16 * s, 8, t * .03); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, -.34 * s, .06 * s, 0, 6.283); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = .06 * s;
    poly(shell, s); ctx.stroke();

    // front flipper (in front of the shell), paddling
    ctx.fillStyle = steel; ctx.lineWidth = .05 * s;
    ctx.save(); ctx.translate(.4 * s, .26 * s); ctx.rotate(2.15 + flap * .5); // sweeps back and down
    poly([[0, -.13], [.78, -.06], [.78, .07], [0, .14]], s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = STEEL.light; ctx.fillRect(.08 * s, -.03 * s, .55 * s, .03 * s);
    ctx.restore();

    ctx.restore();
  }

  function drawCrab(f) {
    var s = f.size;
    var claw = Math.sin(t * .07 + f.seed) * .25;
    var open = .28 + .18 * Math.sin(t * .09 + f.seed);
    var pulse = .5 + .5 * Math.sin(t * .1 + f.seed);
    var armor = '#e8503a', armorDark = '#7a1c0e';

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // jointed legs (3 per side)
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 3; i++) {
        var swing = Math.sin(f.phase + i * 1.3 + (side > 0 ? 0 : Math.PI)) * .12 * s;
        var kx = side * (.95 + i * .08) * s, ky = (-.08 + i * .12) * s + swing * .3;
        ctx.strokeStyle = armorDark; ctx.lineWidth = .13 * s;
        ctx.beginPath();
        ctx.moveTo(side * .45 * s, (.15 + i * .1) * s);
        ctx.lineTo(kx, ky);
        ctx.lineTo(side * (1.2 + i * .1) * s, .58 * s + swing);
        ctx.stroke();
        ctx.fillStyle = STEEL.light;
        ctx.beginPath(); ctx.arc(kx, ky, .07 * s, 0, 6.283); ctx.fill();
      }
    }

    // arms with hydraulic pincers
    for (var sd = -1; sd <= 1; sd += 2) {
      var wave = claw * sd;
      var wx = sd * 1.0 * s, wy = (-.65 + wave * .6) * s;
      ctx.strokeStyle = armorDark; ctx.lineWidth = .15 * s;
      ctx.beginPath();
      ctx.moveTo(sd * .5 * s, -.1 * s);
      ctx.lineTo(sd * .88 * s, (-.42 + wave * .3) * s);
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.fillStyle = STEEL.light;
      ctx.beginPath(); ctx.arc(sd * .88 * s, (-.42 + wave * .3) * s, .09 * s, 0, 6.283); ctx.fill();
      ctx.fillStyle = armor; ctx.strokeStyle = INK; ctx.lineWidth = .04 * s;
      for (var j = -1; j <= 1; j += 2) {
        ctx.save();
        ctx.translate(wx, wy); ctx.rotate(sd * -.25 + j * open);
        poly([[-.13, .06], [0, -.5], [.13, .06]], s); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    // sensor eyes on stalks
    for (var e = -1; e <= 1; e += 2) {
      ctx.strokeStyle = armorDark; ctx.lineWidth = .07 * s;
      ctx.beginPath(); ctx.moveTo(e * .25 * s, -.3 * s); ctx.lineTo(e * .28 * s, -.62 * s); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(e * .28 * s, -.7 * s, .13 * s, 0, 6.283); ctx.fill();
      glowDot(e * .28 * s, -.7 * s, .07 * s, CY, 1);
    }

    // hexagonal hull with a pulsing core
    var g = ctx.createLinearGradient(0, -.5 * s, 0, .5 * s);
    g.addColorStop(0, '#ff7a5c'); g.addColorStop(1, '#c9301c');
    ctx.fillStyle = g; ctx.strokeStyle = INK; ctx.lineWidth = .06 * s;
    poly([[-.72, 0], [-.42, -.5], [.42, -.5], [.72, 0], [.42, .5], [-.42, .5]], s);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(10, 20, 29, .4)'; ctx.lineWidth = .04 * s;
    ctx.beginPath(); ctx.moveTo(-.55 * s, -.22 * s); ctx.lineTo(.55 * s, -.22 * s);
    ctx.moveTo(-.55 * s, .22 * s); ctx.lineTo(.55 * s, .22 * s); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, .17 * s, 0, 6.283); ctx.fill();
    glowDot(0, 0, .1 * s, CY, .5 + .5 * pulse);

    ctx.restore();
  }

  function drawAnimal(a) {
    if (a.kind === 'crab') drawCrab(a);
    else if (a.kind === 'turtle') drawTurtle(a);
    else drawFish(a);
  }

  // HUD-style speech panel with chamfered corners
  function drawSpeech(a) {
    var text = a.say.text, bh = 24, c = 6;
    ctx.font = '600 12px ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace';
    var bw = ctx.measureText(text).width + 20;
    var bx = clamp(a.x - bw / 2, 6, Math.max(6, w - bw - 6));
    var by = Math.max(6, a.y - a.size * 1.7 - bh - 6);
    var tx = clamp(a.x, bx + 12, bx + bw - 12);

    ctx.globalAlpha = Math.min(1, a.say.life / 30);
    ctx.beginPath();
    ctx.moveTo(bx + c, by); ctx.lineTo(bx + bw - c, by); ctx.lineTo(bx + bw, by + c);
    ctx.lineTo(bx + bw, by + bh - c); ctx.lineTo(bx + bw - c, by + bh);
    ctx.lineTo(tx + 5, by + bh); ctx.lineTo(tx, by + bh + 7); ctx.lineTo(tx - 5, by + bh);
    ctx.lineTo(bx + c, by + bh); ctx.lineTo(bx, by + bh - c); ctx.lineTo(bx, by + c);
    ctx.closePath();
    ctx.fillStyle = 'rgba(5, 22, 36, .94)'; ctx.fill();
    ctx.strokeStyle = 'rgba(' + CY + ', .9)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#bff4ff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + 10, by + bh / 2 + .5);
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    drawGrid();
    drawBeams();
    drawCables();
    drawCorals();
    drawDeck();

    for (var i = 0; i < food.length; i++) glowDot(food[i].x, food[i].y, 2.6, '255, 176, 46', 1);

    for (var j = 0; j < animals.length; j++) drawAnimal(animals[j]);

    for (var b = 0; b < bubbles.length; b++) {
      var bb = bubbles[b];
      ctx.strokeStyle = 'rgba(' + CY + ', .6)'; ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(' + CY + ', .08)';
      ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, .7)';
      ctx.beginPath(); ctx.arc(bb.x - bb.r * .35, bb.y - bb.r * .35, bb.r * .22, 0, 6.283); ctx.fill();
    }

    for (var r = 0; r < ripples.length; r++) {
      ctx.strokeStyle = 'rgba(' + CY + ',' + ripples[r].life * .6 + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ripples[r].x, ripples[r].y, ripples[r].r, 0, 6.283); ctx.stroke();
    }

    drawBrackets();
    for (var q = 0; q < animals.length; q++) { if (animals[q].say) drawSpeech(animals[q]); }
  }

  /* ---------- Loop ---------- */
  function loop() {
    step(); draw();
    raf = (visible && !reduceMotion) ? requestAnimationFrame(loop) : null;
  }
  function start() { if (!raf && !reduceMotion) loop(); }

  /* ---------- Input ---------- */
  function localPoint(e) {
    var r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  hero.addEventListener('pointermove', function (e) {
    var p = localPoint(e); mouse.x = p.x; mouse.y = p.y;
  });
  hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
  hero.addEventListener('pointerdown', function (e) {
    if (reduceMotion || e.target.closest('a, button')) return;
    var p = localPoint(e);

    // Clicking a unit directly makes it talk instead of dropping a fuel cell
    for (var n = 0; n < animals.length; n++) {
      var c = animals[n];
      var dx = c.x - p.x, dy = c.y - p.y;
      if (dx * dx + dy * dy < Math.pow(c.size * 1.8, 2)) {
        speak(c, 'poke', true);
        if (hint) hint.classList.add('gone');
        return;
      }
    }

    for (var i = 0; i < 4 && food.length < MAX_FOOD; i++) {
      food.push({ x: p.x + rand(-14, 14), y: p.y + rand(-8, 8), age: 0, seed: rand(0, 6.28) });
    }
    ripples.push({ x: p.x, y: p.y, r: 4, life: 1 });
    if (hint) hint.classList.add('gone');
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); if (reduceMotion) draw(); }, 150);
  });
  // The title block can move once web fonts / layout settle
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  // Pause when the tank is off-screen or the tab is hidden
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) start();
  });

  resize();
  if (reduceMotion) { if (hint) hint.hidden = true; draw(); } else { start(); }
})();
