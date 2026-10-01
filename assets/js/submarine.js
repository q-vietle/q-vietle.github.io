/* Submarine cursor.
   - Tilts up/down with the direction of travel and turns around when you reverse.
   - Propeller spins faster the faster you move and leaves a bubble trail.
   - Clicking (or holding the button) switches on the headlight.
   - Hovering a link/button sends out sonar pings.
   Only used with a fine pointer (mouse) and no "reduce motion" preference; otherwise the
   static SVG cursors from style.css stay in place. */
(function () {
  'use strict';

  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  var canvas = document.createElement('canvas');
  canvas.id = 'sub-cursor';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var S = 1.45;                    // sub scale (drawn in a 32x32 design box, nose at 27,18)
  var INK = '#0a141d';
  var INTERACTIVE = 'a[href], button, [role="button"], summary, label';

  var dpr = 1, W = 0, H = 0, t = 0, raf = null;
  var active = false, pressed = false, hovering = false;
  var px = 0, py = 0, lastX = 0, lastY = 0, vx = 0, vy = 0;
  var face = 1, tilt = 0, spin = 0, lamp = 0, hov = 0, flash = 0;
  var bubbles = [], rings = [];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, k) { return a + (b - a) * k; }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // design-box point -> page pixels, using the same transform the sub is drawn with
  function toWorld(x, y) {
    var cx = x - 27, cy = y - 18, c = Math.cos(tilt), s = Math.sin(tilt);
    return { x: px + (cx * c - cy * s) * face * S, y: py + (cx * s + cy * c) * S };
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r); ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  /* ---------- Drawing ---------- */
  function drawSub(bob) {
    var sp = clamp(Math.sqrt(vx * vx + vy * vy) / 12, 0, 1);

    ctx.save();
    ctx.translate(px, py + bob);
    ctx.scale(face * S, S);
    ctx.rotate(tilt);
    ctx.translate(-27, -18); // origin = nose, so the pointer hotspot stays on the tip
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // headlight beam
    if (lamp > .01) {
      var g = ctx.createLinearGradient(27, 18, 145, 18);
      g.addColorStop(0, 'rgba(255, 226, 96, ' + (.8 * lamp) + ')');
      g.addColorStop(1, 'rgba(255, 226, 96, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(27.5, 16.6); ctx.lineTo(145, -24); ctx.lineTo(145, 60); ctx.lineTo(27.5, 19.4);
      ctx.closePath(); ctx.fill();
      var g2 = ctx.createLinearGradient(27, 18, 95, 18);
      g2.addColorStop(0, 'rgba(255, 255, 230, ' + (.7 * lamp) + ')');
      g2.addColorStop(1, 'rgba(255, 255, 230, 0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.moveTo(27.5, 17.2); ctx.lineTo(95, -2); ctx.lineTo(95, 38); ctx.lineTo(27.5, 18.8);
      ctx.closePath(); ctx.fill();
    }

    // propeller: two blades seen edge-on, plus a blur disc when spinning fast
    if (sp > .15) {
      ctx.fillStyle = 'rgba(91, 115, 134, ' + (.28 * sp) + ')';
      ctx.beginPath(); ctx.ellipse(3, 18, 2.4, 5.8, 0, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = '#5b7386'; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(3, 18, 1.2, .8 + 4.8 * Math.abs(Math.sin(spin)), 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(3, 18, 1.2, .8 + 4.8 * Math.abs(Math.cos(spin)), 0, 0, 6.283); ctx.fill(); ctx.stroke();

    // tail fin
    ctx.fillStyle = '#ff9a1a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(6.5, 14); ctx.lineTo(4.2, 10.4); ctx.lineTo(10, 12.6); ctx.closePath(); ctx.fill(); ctx.stroke();

    // periscope
    ctx.beginPath(); ctx.moveTo(17, 10); ctx.lineTo(17, 5); ctx.lineTo(21.5, 5);
    ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.strokeStyle = '#9fb8c9'; ctx.lineWidth = 1.5; ctx.stroke();

    // sonar pings while hovering a link or button
    if (hov > .02) {
      for (var k = 0; k < 3; k++) {
        var ph = (t * .025 + k / 3) % 1, r = 2 + ph * 11, a = (1 - ph) * hov;
        ctx.beginPath(); ctx.arc(21.5, 5, r, -.85, .85);
        ctx.strokeStyle = 'rgba(10, 20, 29, ' + a * .9 + ')'; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.strokeStyle = 'rgba(25, 211, 255, ' + a + ')'; ctx.lineWidth = 1.3; ctx.stroke();
      }
    }

    // conning tower
    ctx.fillStyle = '#ffcf3a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(12, 12.6); ctx.lineTo(13.6, 8.6); ctx.lineTo(19.6, 8.6); ctx.lineTo(21.2, 12.6);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // hull
    rr(4, 12, 24, 12, 6); ctx.fillStyle = '#ffcf3a'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, .55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(9, 14.4); ctx.lineTo(22, 14.4); ctx.stroke();
    ctx.strokeStyle = '#d99a00';
    ctx.beginPath(); ctx.moveTo(8, 21.8); ctx.lineTo(24, 21.8); ctx.stroke();

    // portholes: cyan, brighter on hover, warm white when the lamp is on
    var pr = lerp(lerp(127, 25, hov), 255, lamp), pg = lerp(lerp(231, 211, hov), 246, lamp), pb = lerp(255, 176, lamp);
    var xs = [10, 16, 22];
    for (var i = 0; i < xs.length; i++) {
      if (lamp > .05) {
        ctx.fillStyle = 'rgba(255, 240, 160, ' + lamp * .3 + ')';
        ctx.beginPath(); ctx.arc(xs[i], 18, 4.2, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = 'rgb(' + (pr | 0) + ',' + (pg | 0) + ',' + (pb | 0) + ')';
      ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(xs[i], 18, 2.1, 0, 6.283); ctx.fill(); ctx.stroke();
    }

    // headlight lens on the nose
    if (lamp > .05) {
      ctx.fillStyle = 'rgba(255, 240, 150, ' + lamp * .45 + ')';
      ctx.beginPath(); ctx.arc(26.4, 18, 4, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = lamp > .3 ? '#fffbd0' : '#8a7a4a';
    ctx.strokeStyle = INK; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.arc(26.4, 18, 1.5, 0, 6.283); ctx.fill(); ctx.stroke();

    ctx.restore();
  }

  function drawBubbles() {
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      ctx.strokeStyle = 'rgba(30, 140, 190, ' + b.life * .7 + ')'; ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(160, 235, 255, ' + b.life * .3 + ')';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill(); ctx.stroke();
    }
  }

  function drawRings() {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      ctx.strokeStyle = 'rgba(25, 211, 255, ' + r.life * .8 + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 226, 96, ' + r.life * .6 + ')'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * .6, 0, 6.283); ctx.stroke();
    }
  }

  /* ---------- Loop ---------- */
  function frame() {
    t++;
    var dx = px - lastX, dy = py - lastY;
    lastX = px; lastY = py;
    vx = lerp(vx, dx, .25); vy = lerp(vy, dy, .25);
    var speed = Math.sqrt(vx * vx + vy * vy);
    var sp = clamp(speed / 12, 0, 1);

    // turn around when the direction of travel reverses; tilt the nose up/down
    var faceT = Math.abs(vx) > 1.2 ? (vx > 0 ? 1 : -1) : (face < 0 ? -1 : 1);
    face = lerp(face, faceT, .22);
    var tiltT = clamp(vy / (Math.abs(vx) + 6), -1, 1) * .5 * clamp(speed / 4, 0, 1);
    tilt = lerp(tilt, tiltT, .15);

    spin += .22 + sp * 1.5;
    if (flash > 0) flash--;
    lamp = lerp(lamp, (pressed || flash > 0) ? 1 : 0, .25);
    hov = lerp(hov, hovering ? 1 : 0, .15);

    // bubble trail from the propeller
    if (active) {
      var rate = speed > 1.2 ? Math.min(.7, speed * .05) : .015;
      if (Math.random() < rate) {
        var p = toWorld(2, 18);
        bubbles.push({ x: p.x, y: p.y, r: 1.2 + Math.random() * 2.2, vx: (Math.random() - .5) * .4, vy: -(.3 + Math.random() * .7), life: 1 });
      }
    }
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.x += b.vx + Math.sin(t * .08 + i) * .15; b.y += b.vy; b.life -= .014;
      if (b.life <= 0) bubbles.splice(i, 1);
    }
    for (var j = rings.length - 1; j >= 0; j--) {
      rings[j].r += 1.7; rings[j].life -= .035;
      if (rings[j].life <= 0) rings.splice(j, 1);
    }

    ctx.clearRect(0, 0, W, H);
    drawRings();
    drawBubbles();
    if (active) drawSub(Math.sin(t * .06) * 1.4 * (1 - sp));

    if (active || bubbles.length || rings.length) raf = requestAnimationFrame(frame);
    else raf = null;
  }
  function start() { if (!raf) raf = requestAnimationFrame(frame); }

  /* ---------- Input ---------- */
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    px = e.clientX; py = e.clientY;
    hovering = !!(e.target.closest && e.target.closest(INTERACTIVE));
    if (!active) {
      active = true; lastX = px; lastY = py; vx = vy = 0;
      root.classList.add('sub-cursor');
      start();
    }
  }, { passive: true });

  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    pressed = true; flash = 40;
    rings.push({ x: e.clientX, y: e.clientY, r: 3, life: 1 });
    start();
  });
  function release() { pressed = false; }
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);

  // hide when the pointer leaves the window or the window loses focus
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { active = false; pressed = false; } });
  window.addEventListener('blur', function () { active = false; pressed = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { active = false; pressed = false; } });

  window.addEventListener('resize', resize);
  resize();
})();
