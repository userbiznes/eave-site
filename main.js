/*
  Eave: landing page.

  The opening is a window at dusk in torn paper, drawn here in code: every torn edge is baked into
  SVG path geometry with seeded noise, so it looks the same on every visit and never runs a filter.
  GSAP + ScrollTrigger scrub the curtains open, then shrink the window into the video frame.
  With prefers-reduced-motion the curtains start open and nothing is pinned.
*/
(() => {
  'use strict';

  const root = document.documentElement;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOTION = root.classList.contains('motion') && !!(window.gsap && window.ScrollTrigger);
  if (!MOTION) root.classList.remove('motion');

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const isPlaceholder = (v) => !v || v.includes('[');

  const C = {
    cream: '#EFE6D6', rim: '#FBF6EC', navy: '#2F3652', navyDeep: '#252B44', navyLight: '#39405F',
    clay: '#B9765A', clayDeep: '#9C5E45', blush: '#D9A5A0', blushDeep: '#C08A86',
    marigold: '#DDB35E', eave: '#262B41', eye: '#F4E9D5', leaf: '#3F4869', leafLight: '#56608A',
    warmShadow: '#6B3F2A', nightShadow: '#151A2B',
  };

  // ---------- seeded randomness ----------

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function noise(seed) {
    const r = rng(seed);
    const v = new Float32Array(256);
    for (let i = 0; i < 256; i++) v[i] = r() * 2 - 1;
    const at = (x) => {
      const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
      const a = v[i & 255], b = v[(i + 1) & 255];
      return a + (b - a) * s;
    };
    return (x) => at(x) * 0.56 + at(x * 2.3 + 19.7) * 0.28 + at(x * 5.7 + 51.3) * 0.16;
  }

  // ---------- torn paper ----------

  const toPath = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';

  /**
   * Tears a closed outline. Each point is [x, y, torn]; `torn: 0` keeps the edge from that point to
   * the next as a clean cut. Returns the piece and its fringe: the pale fibres that show past a torn
   * edge, drawn underneath.
   */
  function tear(poly, { amp = 4, wave = 30, step = 5, seed = 1, rim = 0, corners = true } = {}) {
    const n1 = noise(seed), n2 = noise(seed + 101), jit = rng(seed + 7);
    let area = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    const sign = area > 0 ? 1 : -1;
    const piece = [], fringe = [];
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const nx = (dy / len) * sign, ny = (-dx / len) * sign;
      const torn = a[2] !== 0;
      const k = torn ? Math.max(1, Math.ceil(len / step)) : 1;
      for (let j = 0; j < k; j++) {
        const t = j / k, x = a[0] + dx * t, y = a[1] + dy * t, d = s + len * t;
        let off = 0, roff = 0;
        if (torn) {
          const taper = corners ? clamp(Math.min(t * len, (1 - t) * len) / (step * 3), 0, 1) : 1;
          off = (n1(d / wave) * amp + (jit() - 0.5) * amp * 0.45) * taper;
          roff = off + rim * Math.max(0, 0.3 + n2(d / (wave * 0.55))) * 1.5 * taper;
        }
        piece.push([x + nx * off, y + ny * off]);
        fringe.push([x + nx * roff, y + ny * roff]);
      }
      s += len;
    }
    return { d: toPath(piece), rim: rim ? toPath(fringe) : '' };
  }

  /** A torn piece as SVG: an optional offset shadow, the fringe, then the paper itself. */
  function piece(poly, fill, o = {}) {
    const t = tear(poly, o);
    let out = '';
    if (o.shadow) {
      out += `<path d="${t.rim || t.d}" fill="${o.shadowColor || C.nightShadow}" opacity="${o.shadowOpacity ?? 0.3}" transform="translate(${o.shadow[0]} ${o.shadow[1]})"/>`;
    }
    if (o.rim) out += `<path d="${t.rim}" fill="${o.rimColor || C.rim}"/>`;
    out += `<path d="${t.d}" fill="${fill}"${o.opacity != null ? ` opacity="${o.opacity}"` : ''}/>`;
    return out;
  }

  // ---------- shapes ----------

  const rect = (x, y, w, h, e = [1, 1, 1, 1]) => [[x, y, e[0]], [x + w, y, e[1]], [x + w, y + h, e[2]], [x, y + h, e[3]]];

  function circle(cx, cy, r, n = 40) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return p;
  }

  function roundRect(x, y, w, h, r, seg = 10) {
    r = Math.min(r, w / 2, h / 2);
    const p = [];
    const arc = (cx, cy, a0) => {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2);
        p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    arc(x + w - r, y + r, -Math.PI / 2);
    arc(x + w - r, y + h - r, 0);
    arc(x + r, y + h - r, Math.PI / 2);
    arc(x + r, y + r, Math.PI);
    return p;
  }

  function blossom(cx, cy, r, petals = 5, turn = 0, n = 60) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.62 + 0.38 * Math.abs(Math.cos(((a + turn) * petals) / 2)));
      p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return p;
  }

  function leaf(bx, by, len, wid, ang, n = 16) {
    const p = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      p.push([len * t, -wid * Math.pow(Math.sin(Math.PI * t), 0.8)]);
    }
    for (let i = n - 1; i > 0; i--) {
      const t = i / n;
      p.push([len * t, wid * 0.5 * Math.pow(Math.sin(Math.PI * t), 0.8)]);
    }
    const c = Math.cos(ang), s = Math.sin(ang);
    return p.map(([x, y]) => [bx + x * c - y * s, by + x * s + y * c]);
  }

  // ---------- Eave ----------

  const EYE = { dx: 108, y: 250, hw: 52, h: 48 };

  /** A soft, sitting shape: rounder on top, flatter where he sits, a touch narrower up high. */
  function eaveBody() {
    const p = [], n = 150;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      const e = s > 0 ? 4.4 : 2.7;
      const pinch = s < 0 ? 1 - 0.07 * s * s : 1;
      p.push([
        300 + 300 * pinch * Math.sign(c) * Math.pow(Math.abs(c), 2 / e),
        235 + 235 * Math.sign(s) * Math.pow(Math.abs(s), 2 / e),
      ]);
    }
    return p;
  }

  /** One "^". Blinking squashes it into a line. */
  function eyePath(side, open) {
    const cx = 300 + side * EYE.dx, cy = EYE.y;
    if (open < 0.16) return `M${cx - EYE.hw} ${cy + 6}L${cx + EYE.hw} ${cy + 6}`;
    const h = EYE.h * open;
    return `M${cx - EYE.hw} ${(cy + h / 2).toFixed(1)}L${cx} ${(cy - h / 2).toFixed(1)}L${cx + EYE.hw} ${(cy + h / 2).toFixed(1)}`;
  }

  function eaveSVG({ torn = true, seed = 11, stroke = 30, shadow = C.warmShadow } = {}) {
    const body = eaveBody();
    const art = torn
      ? piece(body, C.eave, { amp: 3, wave: 22, step: 6, seed, rim: 3.6, rimColor: '#F6E9D1', shadow: [6, 10], shadowOpacity: 0.22, shadowColor: shadow, corners: false })
      : `<path d="${toPath(body)}" fill="${C.eave}"/>`;
    return `<svg class="eave" viewBox="-24 -30 648 520" aria-hidden="true" focusable="false">${art}` +
      `<g class="eyes" fill="none" stroke="${C.eye}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">` +
      `<path class="eye-l" d="${eyePath(-1, 1)}"/><path class="eye-r" d="${eyePath(1, 1)}"/></g></svg>`;
  }

  // ---------- the lit room (fixed viewBoxes, so the window and the video poster match exactly) ----------

  const warm = { shadow: [4, 6], shadowOpacity: 0.2, shadowColor: C.warmShadow };

  function sheetArt() {
    return piece(rect(20, 20, 960, 560), '#FBEBC9', { amp: 5, wave: 50, step: 8, seed: 161, opacity: 0.32 });
  }

  function lampArt() {
    return `<line x1="100" y1="0" x2="100" y2="190" stroke="${C.eave}" stroke-width="3"/>` +
      `<rect x="90" y="180" width="20" height="16" rx="4" fill="${C.eave}"/>` +
      `<ellipse cx="100" cy="292" rx="34" ry="15" fill="#FFF4DB"/>` +
      piece([[60, 192], [140, 192], [180, 290], [20, 290]], C.clay, { amp: 2.2, wave: 16, step: 4, seed: 101, rim: 2.2, rimColor: '#F7DEC0', ...warm }) +
      piece([[25, 272], [175, 272], [180, 290], [20, 290]], C.clayDeep, { amp: 1.6, wave: 12, step: 4, seed: 102 });
  }

  function pictureArt() {
    const stars = [[46, 46], [64, 84], [122, 98], [40, 112]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${C.cream}"/>`).join('');
    return piece(rect(6, 6, 148, 188), '#EBD8B7', { amp: 2, wave: 16, step: 4, seed: 111, rim: 2, rimColor: '#FFF7E8', ...warm }) +
      piece(rect(22, 22, 116, 156, [0, 0, 0, 0]), C.navy, { seed: 112 }) +
      stars +
      piece(circle(100, 66, 17, 36), C.marigold, { amp: 1.3, wave: 10, step: 3, seed: 113, corners: false }) +
      piece([[22, 138, 1], [60, 122, 1], [96, 134, 1], [138, 116, 0], [138, 178, 0], [22, 178, 0]], C.blushDeep, { amp: 1.5, wave: 12, step: 3, seed: 114 }) +
      piece([[22, 156, 1], [84, 144, 1], [138, 158, 0], [138, 178, 0], [22, 178, 0]], C.clay, { amp: 1.3, wave: 10, step: 3, seed: 115 });
  }

  function booksArt() {
    const book = (x, y, w, h, fill, seed) =>
      piece(rect(x, y, w, h), fill, { amp: 1.4, wave: 12, step: 4, seed, rim: 1.6, rimColor: '#FFF3DF', ...warm }) +
      `<rect x="${x + w - 12}" y="${y + 5}" width="5" height="${h - 10}" fill="${C.cream}" opacity=".75"/>`;
    return book(6, 60, 186, 28, C.navy, 121) + book(20, 34, 156, 26, C.marigold, 122) + book(12, 10, 136, 24, C.blushDeep, 123);
  }

  function plantArt() {
    const leaves = [[-160, 96, 24], [-134, 126, 28], [-112, 138, 30], [-90, 150, 30], [-68, 134, 28], [-46, 120, 26], [-20, 92, 22]];
    let s = '';
    leaves.forEach(([deg, len, wid], i) => {
      s += piece(leaf(110, 226, len, wid, (deg * Math.PI) / 180), i % 2 ? C.leafLight : C.leaf, { amp: 1.6, wave: 12, step: 4, seed: 130 + i, corners: false });
    });
    s += piece([[64, 216], [156, 216], [146, 316], [74, 316]], C.blush, { amp: 1.8, wave: 14, step: 4, seed: 141, rim: 2, rimColor: '#FFF1E6', ...warm });
    s += piece(rect(56, 206, 108, 26), C.blushDeep, { amp: 1.6, wave: 12, step: 4, seed: 142, rim: 1.6, rimColor: '#FFF1E6' });
    return s;
  }

  function sillArt() {
    return piece(rect(-20, 8, 1040, 40, [1, 0, 0, 0]), '#F0DFC0', { amp: 3, wave: 40, step: 6, seed: 151, rim: 2.4, rimColor: '#FFF8EA' }) +
      piece(rect(-20, 42, 1040, 90, [1, 0, 0, 0]), '#D8B78C', { amp: 2, wave: 30, step: 6, seed: 152 }) +
      `<rect x="-20" y="42" width="1040" height="7" fill="#B98F63" opacity=".45"/>`;
  }

  function roomHTML() {
    return `<svg class="sheet" viewBox="0 0 1000 600" preserveAspectRatio="none">${sheetArt()}</svg>` +
      `<svg class="lamp" viewBox="0 0 200 400">${lampArt()}</svg>` +
      `<svg class="picture" viewBox="0 0 160 200">${pictureArt()}</svg>` +
      `<svg class="sill" viewBox="0 0 1000 110" preserveAspectRatio="none">${sillArt()}</svg>` +
      `<svg class="books" viewBox="0 0 200 90">${booksArt()}</svg>` +
      `<svg class="plant" viewBox="0 0 220 320">${plantArt()}</svg>` +
      `<div class="eave-shadow"></div>` +
      `<div class="eave-seat"><div class="eave-peek"><div class="eave-breathe">${eaveSVG()}</div></div></div>`;
  }

  // ---------- textures: film grain, paper fibres, and the ink speckle for the stamp ----------

  function textures() {
    const tile = (w, h, draw) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      draw(c.getContext('2d'), w, h);
      return `url(${c.toDataURL('image/png')})`;
    };
    // Draws `fn` at x, y and wrapped copies, so the tile repeats without seams.
    const wrap = (w, h, x, y, pad, fn) => {
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        if (x + ox < -pad || x + ox > w + pad || y + oy < -pad || y + oy > h + pad) continue;
        fn(x + ox, y + oy);
      }
    };
    const grain = tile(160, 160, (g, w, h) => {
      const d = g.createImageData(w, h);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = 128 + (Math.random() + Math.random() - 1) * 72;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
        d.data[i + 3] = 255;
      }
      g.putImageData(d, 0, 0);
    });
    const fibers = tile(320, 320, (g, w, h) => {
      const r = rng(9);
      for (let i = 0; i < 14; i++) {
        const x = r() * w, y = r() * h, rad = 30 + r() * 70;
        wrap(w, h, x, y, rad, (px, py) => {
          const gr = g.createRadialGradient(px, py, 0, px, py, rad);
          gr.addColorStop(0, 'rgba(110, 80, 50, 0.05)');
          gr.addColorStop(1, 'rgba(110, 80, 50, 0)');
          g.fillStyle = gr;
          g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
        });
      }
      g.lineCap = 'round';
      for (let i = 0; i < 260; i++) {
        const x = r() * w, y = r() * h, a = r() * Math.PI * 2, l = 3 + r() * 12;
        g.strokeStyle = `rgba(80, 55, 35, ${(0.05 + r() * 0.08).toFixed(3)})`;
        g.lineWidth = 0.5 + r() * 0.8;
        wrap(w, h, x, y, 16, (px, py) => {
          g.beginPath();
          g.moveTo(px, py);
          g.quadraticCurveTo(px + Math.cos(a + 0.6) * l * 0.5, py + Math.sin(a + 0.6) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l);
          g.stroke();
        });
      }
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(60, 40, 25, ${(r() * 0.07).toFixed(3)})`;
        g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
      }
    });
    const speckle = tile(140, 140, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      const r = rng(4);
      for (let i = 0; i < 560; i++) {
        g.globalAlpha = 0.25 + r() * 0.75;
        const x = r() * w, y = r() * h, rad = 0.3 + r() * 1.4;
        wrap(w, h, x, y, 2, (px, py) => {
          g.beginPath();
          g.arc(px, py, rad, 0, Math.PI * 2);
          g.fill();
        });
      }
    });
    root.style.setProperty('--grain', grain);
    root.style.setProperty('--fibers', fibers);
    root.style.setProperty('--speckle', speckle);
  }

  // ---------- Eave's brain: blinking, glancing, following the pointer ----------

  const brain = (() => {
    const items = [];
    let px = null, py = null, lastMove = -1e9;
    let blinkAt = -1, extra = -1, nextBlink = performance.now() + 3400;
    let idle = { x: 0, y: 0, until: 0 };
    let last = performance.now();
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => entries.forEach((e) => {
        const it = items.find((i) => i.svg === e.target);
        if (it) it.visible = e.isIntersecting;
      }), { rootMargin: '120px' })
      : null;

    const track = (e) => { px = e.clientX; py = e.clientY; lastMove = performance.now(); };
    addEventListener('pointermove', track, { passive: true });
    addEventListener('pointerdown', track, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { px = null; });

    function add(svg, { sleepy = false, lean = true } = {}) {
      const it = {
        svg, eyes: $('.eyes', svg), l: $('.eye-l', svg), r: $('.eye-r', svg),
        x: 0, y: 0, open: 1, wake: sleepy ? 0 : 1, awake: !sleepy, visible: true, lean, drawn: -1,
      };
      items.push(it);
      if (io) io.observe(svg);
      return it;
    }

    function blink() {
      const now = performance.now();
      blinkAt = now;
      nextBlink = Math.max(nextBlink, now + 1800);
    }

    function tick(now) {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (now >= nextBlink) {
        blinkAt = now;
        nextBlink = now + 2600 + Math.random() * 4200;
        if (Math.random() < 0.2) extra = now + 280;
      }
      if (extra > 0 && now >= extra) { blinkAt = now; extra = -1; }
      const bt = (now - blinkAt) / 170;
      const blinkOpen = blinkAt >= 0 && bt < 1 ? 1 - Math.sin(Math.PI * bt) * 0.94 : 1;

      const live = px !== null && now - lastMove < 6000;
      if (!live && now > idle.until) {
        idle = Math.random() < 0.35
          ? { x: 0, y: 0 }
          : { x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.4) * 0.7 };
        idle.until = now + 1600 + Math.random() * 2600;
      }
      const k = 1 - Math.exp(-dt * 9);

      for (const it of items) {
        if (!it.visible) continue;
        let tx = idle.x, ty = idle.y;
        if (live) {
          const b = it.svg.getBoundingClientRect();
          if (!b.width) continue;
          const cx = b.left + b.width / 2, cy = b.top + b.height * 0.5;
          tx = clamp((px - cx) / Math.max(260, b.width * 2.4), -1, 1);
          ty = clamp((py - cy) / Math.max(220, b.height * 2.4), -0.8, 1);
        }
        if (!it.awake) { tx *= 0.2; ty = 0.3; }
        it.x += (tx - it.x) * k;
        it.y += (ty - it.y) * k;
        it.wake += ((it.awake ? 1 : 0) - it.wake) * k * 0.5;
        const open = 0.06 + (blinkOpen - 0.06) * it.wake;
        it.eyes.setAttribute('transform', `translate(${(it.x * 36).toFixed(1)} ${(it.y * 22).toFixed(1)})`);
        if (Math.abs(open - it.drawn) > 0.01) {
          it.l.setAttribute('d', eyePath(-1, open));
          it.r.setAttribute('d', eyePath(1, open));
          it.drawn = open;
        }
        if (it.lean) it.svg.style.transform = `rotate(${(it.x * 2.2).toFixed(2)}deg)`;
      }
    }

    function wake(svg, on) {
      const it = items.find((i) => i.svg === svg);
      if (it) it.awake = on;
    }

    return { add, tick, blink, wake };
  })();

  // ---------- build the page's drawn parts ----------

  textures();
  const roomMarkup = roomHTML();
  $$('[data-room]').forEach((el) => { el.innerHTML = roomMarkup; });
  $('.brand-eave').innerHTML = eaveSVG({ torn: false, stroke: 50 });
  $('.foot-eave').insertAdjacentHTML('afterbegin', eaveSVG({ seed: 5, shadow: '#000' }));
  $('.foot-edge').innerHTML = piece([[0, 12, 1], [1600, 12, 0], [1600, 40, 0], [0, 40, 0]], C.navy, { amp: 4, wave: 40, step: 6, seed: 404, rim: 3, rimColor: '#F8F1E5' });

  // Torn scraps of colored paper tucked behind each screenshot.
  const scrapTones = { marigold: C.marigold, blush: C.blush, navy: C.navy, clay: C.clay };
  $$('.shot[data-scraps]').forEach((fig, i) => {
    fig.dataset.scraps.split(' ').forEach((tone, j) => {
      const seed = 300 + i * 17 + j * 5, r = rng(seed);
      const poly = [[10, 12 + r() * 10], [288, 8 + r() * 12], [290 - r() * 10, 208], [14 + r() * 8, 204]];
      fig.insertAdjacentHTML('afterbegin', `<svg class="scrap scrap-${j}" viewBox="0 0 300 220" aria-hidden="true">${piece(poly, scrapTones[tone] || C.clay, { amp: 3.2, wave: 26, step: 4, seed, rim: 2.6, rimColor: '#FBF6EC' })}</svg>`);
    });
  });

  $$('svg.eave').forEach((svg) => {
    brain.add(svg, { sleepy: !!svg.closest('.foot'), lean: !svg.closest('.brand') });
  });
  // Footer Eave dozes until someone comes near.
  const foot = $('.foot');
  const sleeper = $('.foot-eave svg');
  if (sleeper) {
    let timer = 0;
    const setAwake = (on) => {
      clearTimeout(timer);
      const apply = () => {
        foot.classList.toggle('is-awake', on);
        brain.wake(sleeper, on);
      };
      if (on) apply(); else timer = setTimeout(apply, 1600);
    };
    foot.addEventListener('pointerenter', () => setAwake(true));
    foot.addEventListener('pointerleave', () => setAwake(false));
    foot.addEventListener('focusin', () => setAwake(true));
    foot.addEventListener('focusout', () => setAwake(false));
  }

  // ---------- placeholders: [VIDEO_URL], [SCREENSHOTS], [DOWNLOAD_URL] ----------

  const vframe = $('#vframe');
  const video = $('.video');
  if (video) {
    if (isPlaceholder(video.getAttribute('src'))) {
      video.removeAttribute('src');
      video.load();
      vframe.classList.add('is-missing');
    } else {
      const ready = () => vframe.classList.add('has-video');
      if (video.readyState >= 2) ready();
      else video.addEventListener('loadeddata', ready, { once: true });
      video.addEventListener('error', () => vframe.classList.add('is-missing'));
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => {
          if (e.isIntersecting) video.play().catch(() => {});
          else video.pause();
        }).observe(vframe);
      }
    }
  }

  $$('.shot img').forEach((img) => {
    const fig = img.closest('.shot');
    const miss = () => { img.remove(); fig.classList.add('is-missing'); };
    if (isPlaceholder(img.getAttribute('src'))) return miss();
    if (img.complete) {
      if (img.naturalWidth) fig.classList.add('is-loaded'); else miss();
    } else {
      img.addEventListener('load', () => fig.classList.add('is-loaded'), { once: true });
      img.addEventListener('error', miss, { once: true });
    }
  });

  $$('a[href="[DOWNLOAD_URL]"]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });

  // ---------- the opening ----------

  const intro = $('.intro'), opening = $('.opening'), win = $('.win');
  const outside = $('.outside'), outsideArt = $('.outside-art'), frontArt = $('.front-art');
  const gWall = $('.o-wall'), gRoof = $('.o-roof'), gSill = $('.o-sill');
  const winTorn = $('.win-torn'), winBezel = $('.win-bezel');
  const curL = $('.curtain-l'), curR = $('.curtain-r'), rod = $('.rod'), glass = $('.glass');
  const titleBlock = $('.title-block'), titleEl = $('.title'), tagEl = $('.tagline');
  const halo = $('.halo'), flies = $('.flies'), hint = $('.hint'), grainEl = $('.grain'), fibersEl = $('.fibers');
  const peekEl = $('[data-peek] .eave-peek');
  const heroTitle = $('.hero-title'), heroCta = $('.hero-cta'), nav = $('#nav');

  // crack/peek/hint run once on load; open/title/sub/haloOut follow the scroll.
  const S = { crack: 0, peek: 0, hint: 0, open: 0, title: 0, sub: 0, haloOut: 0 };
  let dirty = true;
  const mark = () => { dirty = true; };
  const OVERLAP = 14;
  let L = null, lastSize = '';

  function layout() {
    const W = opening.clientWidth, H = opening.clientHeight;
    const size = W + 'x' + H;
    if (!W || !H || size === lastSize) return;
    lastSize = size;
    const roofH = clamp(H * 0.075, 34, 80);
    const sillH = clamp(H * 0.03, 14, 28);
    const side = clamp(W * 0.05, 14, 88);
    const top = roofH + clamp(H * 0.035, 12, 36);
    const bottom = Math.max(H * 0.16, sillH * 3.1 + 66);
    const fw = clamp(Math.min(W, H) * 0.022, 10, 24);
    const pr = clamp(Math.min(W, H) * 0.02, 10, 22);
    L = { W, H, roofH, sillH, fw, pr, wr: pr + fw, x: side, y: top, w: W - side * 2, h: H - top - bottom };
    L.pw = L.w - fw * 2;
    L.ph = L.h - fw * 2;
    setWin();
    buildWinTorn();
    buildOutside();
    buildCurtains();
    mark();
  }

  function setWin() {
    Object.assign(win.style, { left: L.x + 'px', top: L.y + 'px', width: L.w + 'px', height: L.h + 'px' });
    win.style.setProperty('--fw', L.fw + 'px');
    win.style.setProperty('--wr', L.wr + 'px');
    win.style.setProperty('--pr', L.pr + 'px');
  }

  function buildOutside() {
    const { W, H, roofH, sillH, x, y, w, h, fw } = L;
    outsideArt.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const night = { shadow: [4, 9], shadowOpacity: 0.38, shadowColor: C.nightShadow };

    // The wall: dusk-navy paper with a few patches of lighter and deeper blue.
    gWall.innerHTML =
      `<rect x="-10" y="-10" width="${W + 20}" height="${H + 20}" fill="${C.navy}"/>` +
      piece(rect(-40, H * 0.46, W * 0.36, H * 0.7), C.navyLight, { amp: 6, wave: 70, step: 7, seed: 21, opacity: 0.55 }) +
      piece(rect(W * 0.68, -40, W * 0.42, H * 0.52), C.navyLight, { amp: 6, wave: 70, step: 7, seed: 22, opacity: 0.4 }) +
      piece(rect(-40, y + h + sillH * 2.9, W + 80, H, [1, 0, 0, 0]), C.navyDeep, { amp: 5, wave: 60, step: 7, seed: 23 });

    // The eave of the roof: its shadow on the wall, a row of scalloped shingles, the fascia, and
    // the last of the dusk light along the top.
    const sr = roofH * 0.34, sy = roofH * 0.62;
    let roof = piece(rect(-40, -40, W + 80, roofH * 1.45 + 40, [0, 0, 1, 0]), '#1C2136', { amp: 6, wave: 50, step: 7, seed: 31, opacity: 0.5 });
    for (let cx = sr * 0.4, i = 0; cx < W + sr; cx += sr * 2.1, i++) {
      roof += piece(circle(cx, sy, sr, 36), C.clayDeep, { amp: 1.5, wave: 12, step: 4, seed: 40 + i, rim: 1.6, rimColor: '#EBC6A6', corners: false });
    }
    roof += piece(rect(-40, -40, W + 80, sy + 40, [0, 0, 1, 0]), C.clay, { amp: 3.5, wave: 34, step: 5, seed: 32, rim: 2.4, rimColor: '#EFCFB0' });
    roof += piece(rect(-40, -40, W + 80, roofH * 0.2 + 40, [0, 0, 1, 0]), C.blush, { amp: 3, wave: 40, step: 6, seed: 33, opacity: 0.55 });
    gRoof.innerHTML = roof;

    // The sill, tucked just under the frame's torn edge, and a flower box hanging below it.
    const over = clamp(w * 0.022, 12, 34);
    const sx0 = x - over, sy0 = y + h + L.oh * 0.3, sw = w + over * 2;
    let sill = piece(rect(sx0, sy0, sw, sillH), C.cream, { amp: 2.4, wave: 26, step: 5, seed: 51, rim: 2, ...night });
    sill += piece(rect(sx0 + 3, sy0 + sillH * 0.6, sw - 6, sillH * 0.4 - 1, [1, 0, 0, 0]), '#D6C8AE', { amp: 1.2, wave: 30, step: 6, seed: 52 });
    gSill.innerHTML = sill;

    // The flower box sits in front of the window (its own layer), so the flowers can rise over
    // the bottom of the frame.
    const bw = Math.min(w * 0.44, 540), bh = sillH * 1.7, bx = x + w / 2 - bw / 2, by = sy0 + sillH - 1;
    const r = rng(60);
    const count = Math.max(5, Math.round(bw / (sillH * 2.3)));
    let box = '';
    for (let i = 0; i <= count; i++) {
      const lx = bx + (bw * i) / count + (r() - 0.5) * sillH * 0.6;
      const ang = ((-90 + (r() - 0.5) * 80) * Math.PI) / 180;
      box += piece(leaf(lx, by + 3, sillH * (1 + r() * 0.5), sillH * 0.34, ang), i % 2 ? C.leafLight : C.leaf, { amp: 1, wave: 10, step: 3, seed: 70 + i, corners: false });
    }
    const tones = [C.marigold, C.blush, C.cream, C.marigold, C.blush];
    for (let i = 0; i < count; i++) {
      const R = sillH * (0.6 + r() * 0.18);
      const fx = bx + (bw * (i + 0.5)) / count + (r() - 0.5) * sillH * 0.5;
      const fy = by - R * (0.3 + r() * 0.4);
      const tone = tones[i % tones.length];
      box += piece(blossom(fx, fy, R, 5, r() * 3), tone, { amp: 1.1, wave: 8, step: 3, seed: 80 + i, rim: 1.2, rimColor: '#FFF6E8', corners: false });
      box += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${(R * 0.26).toFixed(1)}" fill="${tone === C.cream ? C.marigold : C.clayDeep}"/>`;
    }
    box += piece(rect(bx, by, bw, bh), C.clay, { amp: 2.2, wave: 22, step: 5, seed: 61, rim: 1.8, rimColor: '#EECDB0', ...night });
    box += piece(rect(bx - 5, by - 2, bw + 10, bh * 0.3), C.clayDeep, { amp: 1.8, wave: 18, step: 5, seed: 62, rim: 1.5, rimColor: '#EECDB0' });
    frontArt.setAttribute('viewBox', `0 0 ${W} ${H}`);
    frontArt.innerHTML = box;

    // Warm light spilling from the window onto the wall.
    Object.assign(halo.style, { left: `${x - w * 0.18}px`, top: `${y - h * 0.22}px`, width: `${w * 1.36}px`, height: `${h * 1.44}px` });

    // A few fireflies at the edges of the wall.
    const fr = rng(77);
    let dots = '';
    for (let i = 0; i < 7; i++) {
      const zone = i % 3;
      let fx, fy;
      if (zone === 0) { fx = fr() * x * 0.9; fy = y + h * (0.3 + fr() * 0.7); }
      else if (zone === 1) { fx = x + w + fr() * (W - x - w); fy = y + h * (0.25 + fr() * 0.75); }
      else { fx = W * (0.08 + fr() * 0.84); fy = by + bh + (H - by - bh) * (0.35 + fr() * 0.55); }
      dots += `<i class="fly" style="left:${fx.toFixed(0)}px;top:${fy.toFixed(0)}px;--s:${(2.5 + fr() * 2.5).toFixed(1)}px;--d:${(7 + fr() * 6).toFixed(1)}s;--delay:${(-fr() * 10).toFixed(1)}s;--dx:${((fr() - 0.5) * 50).toFixed(0)}px;--dy:${(-12 - fr() * 30).toFixed(0)}px"></i>`;
    }
    flies.innerHTML = dots;
  }

  function buildWinTorn() {
    const oh = (L.oh = Math.round(clamp(L.fw * 0.9, 10, 20)));
    const tw = L.w + oh * 2, th = L.h + oh * 2, ins = oh * 0.4;
    win.style.setProperty('--oh', oh + 'px');
    winTorn.setAttribute('viewBox', `0 0 ${tw} ${th}`);
    winTorn.innerHTML = piece(roundRect(ins, ins, tw - ins * 2, th - ins * 2, L.wr + oh * 0.6), C.cream, {
      amp: 3.2, wave: 30, step: 5, seed: 71, rim: 2.6, rimColor: '#FFFBF3',
      shadow: [5, 10], shadowOpacity: 0.42, shadowColor: C.nightShadow, corners: false,
    });
  }

  function buildCurtains() {
    const cw = L.pw / 2 + OVERLAP, ch = L.ph * 0.878;
    [[curL, 'l', 81], [curR, 'r', 91]].forEach(([el, side, seed]) => {
      const svg = el.firstElementChild;
      svg.setAttribute('viewBox', `0 0 ${cw.toFixed(1)} ${ch.toFixed(1)}`);
      svg.innerHTML = curtainArt(cw, ch, seed, side);
    });
  }

  /** One paper curtain: lit from the room, with folds as pasted strips. Drawn as the left one. */
  function curtainArt(w, h, seed, side) {
    const r = rng(seed), id = 'cg-' + side;
    let s = piece([[0, 0, 0], [w, 0, 1], [w, h, 1], [0, h, 0]], `url(#${id})`, {
      amp: 4, wave: 34, step: 5, seed, rim: 3, rimColor: '#FAE6DC', shadow: [7, 3], shadowOpacity: 0.22, shadowColor: C.warmShadow,
    });
    const n = Math.max(4, Math.round(w / 85));
    for (let i = 0; i < n; i++) {
      const fwid = (w / n) * (0.18 + r() * 0.2);
      const fx = Math.min((w * (i + 0.15 + r() * 0.5)) / n, w - fwid - 12);
      const dark = i % 2 === 0;
      s += piece(rect(fx, -6, fwid, h - 6 - r() * h * 0.05, [0, 1, 1, 1]), dark ? '#BF8783' : '#F1CFC6', { amp: 2, wave: 40, step: 6, seed: seed + 3 + i * 7, opacity: dark ? 0.42 : 0.45 });
    }
    s += piece(rect(-6, h * 0.9, w - 12, h * 0.035), '#BD8580', { amp: 1.8, wave: 30, step: 6, seed: seed + 60, opacity: 0.4 });
    s += piece(rect(-6, -6, w - 6, h * 0.035 + 6, [0, 0, 1, 0]), '#B27A76', { amp: 1.6, wave: 30, step: 6, seed: seed + 61, opacity: 0.45 });
    const grad = `<defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#C08885"/><stop offset=".62" stop-color="${C.blush}"/><stop offset="1" stop-color="#EEC6BD"/></linearGradient></defs>`;
    return grad + (side === 'r' ? `<g transform="translate(${w.toFixed(1)} 0) scale(-1 1)">${s}</g>` : s);
  }

  function render() {
    dirty = false;
    if (!L) return;
    const o = S.open;
    const half = L.pw / 2, cw = half + OVERLAP;
    const eaveW = Math.min(L.ph * 0.35, L.pw * 0.54);
    const crack = Math.min(eaveW * 0.28, half * 0.3);
    const openTo = half * 0.76;
    const inner = half + OVERLAP * (1 - S.crack) - (crack * S.crack * (1 - o) + openTo * o);
    const sx = clamp(inner / cw, 0.05, 1).toFixed(4);
    curL.style.transform = `scaleX(${sx})`;
    curR.style.transform = `scaleX(${sx})`;
    if (peekEl) peekEl.style.transform = `translateX(${((1 - S.peek) * 30).toFixed(2)}%) rotate(${(-8 * S.peek * (1 - o)).toFixed(2)}deg)`;
    titleEl.style.opacity = S.title.toFixed(3);
    titleEl.style.transform = `translateY(${((1 - S.title) * 0.25).toFixed(3)}em)`;
    tagEl.style.opacity = S.sub.toFixed(3);
    tagEl.style.transform = `translateY(${((1 - S.sub) * 0.8).toFixed(3)}em)`;
    halo.style.opacity = ((0.4 + 0.6 * o) * (1 - S.haloOut)).toFixed(3);
    hint.style.opacity = (S.hint * (1 - clamp(o * 7, 0, 1))).toFixed(3);
  }

  // Where the video frame sits inside the pinned intro: the window's last frame.
  function slotRect() {
    const a = intro.getBoundingClientRect(), b = vframe.getBoundingClientRect();
    return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
  }
  function frameVars() {
    const cs = getComputedStyle(vframe);
    return { r: parseFloat(cs.borderTopLeftRadius) || 24, b: parseFloat(cs.paddingTop) || 8 };
  }

  layout();

  const T0 = 1.45; // scroll, in screens, before the window starts to shrink
  const TD = 0.85; // how long the shrink takes
  const TOTAL = T0 + TD + 0.3;
  let navAt = 0;
  const updateNav = () => nav.classList.toggle('is-on', scrollY > navAt);

  if (MOTION) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.addEventListener('refreshInit', layout);

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: mark,
      scrollTrigger: {
        trigger: intro,
        start: 'top top',
        end: () => '+=' + Math.round(innerHeight * TOTAL),
        pin: true,
        scrub: 1.1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to(S, { open: 1, duration: 1, ease: 'sine.inOut' }, 0)
      .to(S, { title: 1, duration: 0.5, ease: 'power1.out' }, 0.5)
      .to(S, { sub: 1, duration: 0.45, ease: 'power1.out' }, 0.75)
      // the handoff: the window shrinks into the video frame on the page
      .to(titleBlock, { autoAlpha: 0, y: () => -L.ph * 0.04, duration: 0.3, ease: 'power1.in' }, T0)
      .to([curL, curR, rod, glass], { autoAlpha: 0, duration: 0.3 }, T0)
      .to(S, { haloOut: 1, duration: 0.3 }, T0)
      .to([gRoof, gSill, frontArt], { opacity: 0, duration: 0.3 }, T0)
      .to(outside, { opacity: 0, duration: 0.4 }, T0 + 0.12)
      .to([grainEl, fibersEl], { opacity: 0, duration: 0.5 }, T0)
      .fromTo(win, {
        left: () => L.x, top: () => L.y, width: () => L.w, height: () => L.h,
        '--fw': () => L.fw + 'px', '--wr': () => L.wr + 'px', '--pr': () => L.pr + 'px',
      }, {
        left: () => slotRect().x, top: () => slotRect().y, width: () => slotRect().w, height: () => slotRect().h,
        '--fw': () => frameVars().b + 'px', '--wr': () => frameVars().r + 'px', '--pr': () => (frameVars().r - frameVars().b) + 'px',
        duration: TD, ease: 'power2.inOut',
      }, T0)
      .fromTo(outside, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }, {
        clipPath: () => {
          const s = slotRect(), W = intro.clientWidth, H = intro.clientHeight;
          return `inset(${s.y}px ${W - s.x - s.w}px ${H - s.y - s.h}px ${s.x}px round ${frameVars().r}px)`;
        },
        // The wall closes in faster than the window shrinks, so the dusk slips behind the frame
        // well before the frame arrives.
        duration: TD * 0.62, ease: 'power1.inOut',
      }, T0)
      .to(winBezel, { opacity: 1, duration: 0.25 }, T0 + 0.15)
      .to(winTorn, { opacity: 0, duration: 0.25 }, T0 + 0.35)
      .fromTo([heroTitle, heroCta], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.07, ease: 'power1.out' }, T0 + 0.5)
      .to(win, { autoAlpha: 0, duration: 0.2 }, T0 + TD)
      .set({}, {}, TOTAL);

    // On load, the curtains part just a crack and Eave peeks through, blinking.
    gsap.timeline({ delay: 0.3 })
      .to(S, { crack: 1, duration: 1.7, ease: 'power2.inOut', onUpdate: mark }, 0.4)
      .to(S, { peek: 1, duration: 1.1, ease: 'power3.out', onUpdate: mark }, 1.3)
      .call(() => brain.blink(), null, 2.35)
      .call(() => brain.blink(), null, 2.7)
      .to(S, { hint: 1, duration: 1.2, onUpdate: mark }, 3.1);

    const setNavAt = () => { navAt = (T0 + TD * 0.7) * innerHeight; updateNav(); };
    ScrollTrigger.addEventListener('refresh', setNavAt);
    setNavAt();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    gsap.ticker.add(() => {
      if (dirty) render();
      brain.tick(performance.now());
    });
  } else {
    Object.assign(S, { crack: 1, peek: 1, open: 1, title: 1, sub: 1 });
    let t = 0;
    addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => { layout(); navAt = opening.offsetHeight * 0.75; updateNav(); }, 150);
    });
    navAt = opening.offsetHeight * 0.75;
    const loop = (now) => {
      if (dirty) render();
      brain.tick(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  addEventListener('scroll', updateNav, { passive: true });
  updateNav();
  render();
  requestAnimationFrame(() => root.classList.add('ready'));

  // ---------- in-page links ----------

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const behavior = REDUCED ? 'auto' : 'smooth';
    if (id === 'top') {
      e.preventDefault();
      scrollTo({ top: 0, behavior });
      return;
    }
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior, block: 'start' });
    if (target.tabIndex >= 0 || target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
    try { history.replaceState(null, '', '#' + id); } catch (err) { /* sandboxed */ }
  });

  if (location.hash.length > 1) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) setTimeout(() => target.scrollIntoView(), 120);
  }

  // ---------- the "Copied" stamp ----------

  const stampLayer = $('.stamps');
  const today = new Date();
  const stampDate = `${String(today.getDate()).padStart(2, '0')} ${'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ')[today.getMonth()]} ${today.getFullYear()}`;
  let lastPt = { x: innerWidth / 2, y: innerHeight / 2 };
  const remember = (e) => { lastPt = { x: e.clientX, y: e.clientY }; };
  addEventListener('pointerdown', remember, { passive: true });
  addEventListener('pointerup', remember, { passive: true });

  document.addEventListener('copy', () => {
    let { x, y } = lastPt;
    const sel = getSelection();
    // Beside the selection if there's room, otherwise just above it.
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const b = sel.getRangeAt(0).getBoundingClientRect();
      if (b.width || b.height) {
        if (b.right + 170 < innerWidth) { x = b.right + 84; y = b.top + Math.min(b.height, 120) / 2; }
        else { x = b.left + Math.min(b.width, 240) / 2; y = b.top - 44; }
      }
    }
    stamp(clamp(x, 80, innerWidth - 80), clamp(y, 60, innerHeight - 50));
    brain.blink();
  });

  function stamp(x, y) {
    while (stampLayer.children.length > 4) stampLayer.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'stamp';
    el.innerHTML = `<span class="stamp-eyes" aria-hidden="true">^ ^</span><span class="stamp-word">Copied</span><span class="stamp-date" aria-hidden="true">${stampDate}</span>`;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    stampLayer.append(el);
    const base = `translate(-50%, -50%) rotate(${(-12 + Math.random() * 9).toFixed(1)}deg)`;
    const frames = REDUCED
      ? [{ opacity: 0, transform: base }, { opacity: 1, transform: base }]
      : [
        { opacity: 0, transform: `${base} scale(1.7)` },
        { opacity: 1, transform: `${base} scale(0.95)`, offset: 0.62 },
        { opacity: 1, transform: `${base} scale(1)` },
      ];
    el.animate(frames, { duration: REDUCED ? 150 : 340, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
    setTimeout(() => {
      const out = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = () => el.remove();
    }, 1300);
  }
})();
