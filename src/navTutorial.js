// First-visit navigation tutorial: orbit / pan / zoom carousel with gesture detection.
// Spec: design_handoff_navigation_tutorial/README.md

const SVG_NS = 'http://www.w3.org/2000/svg';
const STORAGE_KEY = 'navTutorialSeen';
const TAU = Math.PI * 2;
const W = '#fff';
const INK = '#141418';
const OK = 'oklch(0.78 0.15 155)';
const LOOP_MS = 2000;
const CHECK_MS = 260;
const ADVANCE_MS = 1300;

const M0 = { x: -6, y: 4 };
const R = 10;
const OC = { x: -6, y: 14 };

const SLIDES = [
  { g: 'orbit', btn: 'l', name: 'Orbit', title: 'Left-click + drag', sub: 'Orbit the camera around the scene.', done: 'Orbit — got it', thr: 260 },
  { g: 'pan', btn: 'r', name: 'Pan', title: 'Right-click + drag', sub: 'Slide the view sideways without rotating.', done: 'Pan — got it', thr: 240 },
  { g: 'zoom', btn: 'w', name: 'Zoom', title: 'Scroll the wheel', sub: 'Move the camera closer or further away.', done: 'Zoom — got it', thr: 500 },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  children.forEach((c) => c && node.appendChild(c));
  return node;
}

const LINE = { fill: 'none', stroke: W, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

function head(x, y, ang, s = 7) {
  const a1 = ang + Math.PI * 0.78, a2 = ang - Math.PI * 0.78;
  return `M${x + s * Math.cos(a1)} ${y + s * Math.sin(a1)} L${x} ${y} L${x + s * Math.cos(a2)} ${y + s * Math.sin(a2)}`;
}

function offset(g, mp) {
  const e = ease(mp);
  if (g === 'orbit') {
    const th = -Math.PI / 2 + e * TAU;
    return { x: R * Math.cos(th), y: R * Math.sin(th) + R };
  }
  if (g === 'pan') return { x: 26 * Math.sin(TAU * e), y: 0 };
  return { x: 0, y: 0 };
}

function mouseGlyph(x, y, btn, pk, zoomOn, p, zdir) {
  const lit = (k) => ({ fill: W, 'fill-opacity': btn === k ? pk : 0 });
  const ticks = zoomOn
    ? [0, 0.5].map((k) => {
        const f = (((p * 7 * zdir + k) % 1) + 1) % 1;
        const ty = -24 + f * 9;
        return el('line', { x1: -2, x2: 2, y1: ty, y2: ty, stroke: INK, 'stroke-width': 1.6, 'stroke-linecap': 'round' });
      })
    : [];
  return el('g', { transform: `translate(${x} ${y}) scale(0.85)` }, [
    el('rect', { x: -22, y: -33, width: 44, height: 66, rx: 22, fill: 'rgba(255,255,255,0.12)', stroke: W, 'stroke-width': 2.6 }),
    el('path', { d: 'M-22 -6 L-22 -11 A22 22 0 0 1 0 -33 L0 -6 Z', ...lit('l') }),
    el('path', { d: 'M0 -6 L0 -33 A22 22 0 0 1 22 -11 L22 -6 Z', ...lit('r') }),
    el('path', { d: 'M0 -33 L0 -6 M-22 -6 L22 -6', fill: 'none', stroke: W, 'stroke-width': 2.4 }),
    el('rect', { x: -4.5, y: -26, width: 9, height: 14, rx: 4.5, fill: zoomOn ? W : '#1b1c21', stroke: W, 'stroke-width': 2.2 }),
    ...ticks,
  ]);
}

// "guides" arrow variant
function guides(g, mp, fade, pos) {
  const out = [];
  if (g === 'orbit') {
    const e = ease(mp), th0 = -Math.PI / 2, th = th0 + e * TAU, st = Math.max(th0, th - 5.0);
    if (e > 0.01) {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const a = st + ((th - st) * i) / 40;
        pts.push(`${OC.x + 52 * Math.cos(a)},${OC.y + 52 * Math.sin(a)}`);
      }
      const hx = OC.x + 52 * Math.cos(th), hy = OC.y + 52 * Math.sin(th);
      out.push(
        el('polyline', { points: pts.join(' '), ...LINE, opacity: fade }),
        el('path', { d: head(hx, hy, th + Math.PI / 2, 8), ...LINE, opacity: fade }),
      );
    }
  } else if (g === 'pan') {
    const d = ease(seg(mp, 0, 0.3)) * 44, y = M0.y + 40;
    if (d > 1) {
      out.push(
        el('path', { d: `M${M0.x - d} ${y} L${M0.x + d} ${y}`, ...LINE, opacity: fade }),
        el('path', { d: head(M0.x - d, y, Math.PI, 8), ...LINE, opacity: fade }),
        el('path', { d: head(M0.x + d, y, 0, 8), ...LINE, opacity: fade }),
        el('circle', { cx: pos.x, cy: y, r: 4, fill: W, opacity: fade }),
      );
    }
  } else {
    const up = mp < 0.5, d = ease(seg(mp % 0.5, 0, 0.3)) * 22;
    const o = (mp > 0 && mp < 1 ? 1 : 0) * fade * (1 - seg(mp % 0.5, 0.38, 0.5) * 0.85);
    if (d > 1) {
      const y0 = up ? M0.y - 34 : M0.y + 34, y1 = up ? y0 - d : y0 + d;
      const label = el('text', {
        x: M0.x - 26, y: up ? y0 - 8 : y0 + 18, fill: W, opacity: o,
        'font-size': 18, 'font-weight': 600, 'font-family': 'IBM Plex Sans, sans-serif',
      });
      label.textContent = up ? '+' : '−';
      out.push(
        el('path', { d: `M${M0.x} ${y0} L${M0.x} ${y1}`, ...LINE, opacity: o }),
        el('path', { d: head(M0.x, y1, up ? -Math.PI / 2 : Math.PI / 2, 8), ...LINE, opacity: o }),
        label,
      );
    }
  }
  return out;
}

const CHEVRON_LEFT = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M8.5 2.5 L4 7 L8.5 11.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEVRON_RIGHT = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M5.5 2.5 L10 7 L5.5 11.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function initNavTutorial(sceneEl) {
  const card = document.createElement('div');
  card.id = 'navTutorial';
  card.innerHTML = `
    <div class="nt-stage"><svg viewBox="-100 -75 200 150" width="100%" height="100%"></svg></div>
    <div class="nt-body">
      <div class="nt-row">
        <div class="nt-eyebrow"></div>
        <div class="nt-status"></div>
      </div>
      <div class="nt-title"></div>
      <div class="nt-sub"></div>
      <div class="nt-controls">
        <div class="nt-nav">
          <button class="nt-arrow nt-prev" aria-label="Previous">${CHEVRON_LEFT}</button>
          <div class="nt-dots">${SLIDES.map((s, i) => `<button class="nt-dot" data-i="${i}" aria-label="${s.name}"></button>`).join('')}</div>
          <button class="nt-arrow nt-next" aria-label="Next">${CHEVRON_RIGHT}</button>
        </div>
        <button class="nt-close"></button>
      </div>
    </div>`;

  const help = document.createElement('div');
  help.id = 'navTutorialHelp';
  help.innerHTML = `
    <div class="nt-help-label">Navigation controls</div>
    <button class="nt-help-btn" aria-label="Navigation controls">?</button>`;

  document.body.append(card, help);

  // Keep UI clicks from reaching the scene's raycast click handler on window
  [card, help].forEach((n) => n.addEventListener('click', (e) => e.stopPropagation()));

  const svg = card.querySelector('svg');
  const $ = (sel) => card.querySelector(sel);
  const dots = [...card.querySelectorAll('.nt-dot')];

  let open = false;
  let slide = 0;
  let done = [false, false, false];
  let doneAt = 0;
  let acc = 0;
  let t0 = performance.now();
  let raf = null;
  let advTimer = null;
  let drag = null;

  function renderText() {
    const cur = SLIDES[slide], isDone = done[slide];
    $('.nt-eyebrow').textContent = `${cur.name.toUpperCase()} · ${slide + 1}/3`;
    const status = $('.nt-status');
    status.textContent = isDone ? 'DONE' : 'TRY IT IN THE SCENE';
    status.style.color = isDone ? OK : 'rgba(255,255,255,0.45)';
    $('.nt-title').textContent = isDone ? cur.done : cur.title;
    $('.nt-sub').textContent = cur.sub;
    const prev = $('.nt-prev');
    prev.disabled = slide === 0;
    prev.style.opacity = slide === 0 ? 0.35 : 1;
    $('.nt-close').textContent = slide === 2 ? 'Done' : 'Skip';
    dots.forEach((d, i) => {
      d.style.width = i === slide ? '20px' : '6px';
      d.style.background = i === slide ? '#fff' : done[i] ? OK : 'rgba(255,255,255,0.3)';
    });
  }

  function renderStage(now) {
    const cur = SLIDES[slide], isDone = done[slide];
    const p = (now % LOOP_MS) / LOOP_MS, raw = (p - 0.12) / 0.68, mp = clamp(raw, 0, 1);
    const fade = 1 - seg(p, 0.86, 0.99), pk = seg(p, 0.02, 0.1) * (1 - seg(p, 0.82, 0.9));
    const o = offset(cur.g, mp), pos = { x: M0.x + o.x, y: M0.y + o.y };
    const zoomOn = cur.g === 'zoom' && raw > 0 && raw < 1, zdir = mp < 0.5 ? -1 : 1;
    const ck = isDone ? ease(clamp((now - doneAt) / CHECK_MS, 0, 1)) : 0;

    svg.replaceChildren(
      el('g', { opacity: 1 - ck * 0.75 }, [
        ...guides(cur.g, mp, fade, pos),
        mouseGlyph(pos.x, pos.y, cur.btn, cur.btn === 'w' ? 0 : pk, zoomOn, p, zdir),
      ]),
    );
    if (isDone) {
      svg.appendChild(el('g', { transform: `scale(${0.6 + 0.4 * ck})`, opacity: ck }, [
        el('circle', { cx: 0, cy: 0, r: 30, fill: OK }),
        el('path', { d: 'M-12 1 L-4 9 L13 -9', fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      ]));
    }
  }

  function tick() {
    renderStage(performance.now() - t0);
    raf = requestAnimationFrame(tick);
  }

  function goTo(i) {
    clearTimeout(advTimer);
    slide = clamp(i, 0, 2);
    acc = 0;
    t0 = performance.now();
    renderText();
  }

  function show() {
    done = [false, false, false];
    goTo(0);
    open = true;
    card.classList.add('nt-open');
    help.classList.remove('nt-open');
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function hide() {
    clearTimeout(advTimer);
    open = false;
    drag = null;
    card.classList.remove('nt-open');
    help.classList.add('nt-open');
    cancelAnimationFrame(raf);
    raf = null;
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  function feed(g, amt) {
    const cur = SLIDES[slide];
    if (!open || cur.g !== g || done[slide]) return;
    acc += amt;
    if (acc < cur.thr) return;
    acc = 0;
    done[slide] = true;
    doneAt = performance.now() - t0;
    renderText();
    const i = slide;
    advTimer = setTimeout(() => (i < 2 ? goTo(i + 1) : hide()), ADVANCE_MS);
  }

  $('.nt-prev').addEventListener('click', () => goTo(slide - 1));
  $('.nt-next').addEventListener('click', () => (slide < 2 ? goTo(slide + 1) : hide()));
  $('.nt-close').addEventListener('click', hide);
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  help.querySelector('.nt-help-btn').addEventListener('click', show);

  // Gesture detection on the real scene canvas (alongside OrbitControls)
  sceneEl.addEventListener('pointerdown', (e) => {
    if (open) drag = { b: e.button, x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dist = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (drag.b === 0) feed('orbit', dist);
    else if (drag.b === 2) feed('pan', dist);
  });
  window.addEventListener('pointerup', () => { drag = null; });
  sceneEl.addEventListener('wheel', (e) => feed('zoom', Math.abs(e.deltaY)), { passive: true });
  sceneEl.addEventListener('contextmenu', (e) => e.preventDefault());

  let seen = false;
  try { seen = localStorage.getItem(STORAGE_KEY) === '1'; } catch {}
  if (seen) help.classList.add('nt-open');
  else show();
}
