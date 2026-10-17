// Top menu bar (liquid-glass capsule + dropdowns) and the bottom scene dock.
// Spec: design_handoff_portfolio_nav/README.md

export const RESUME_URL = '/resume/AnuragGotety_resume.pdf';

// `focus` = title of the scene object to fly to (matches src/data/projects/*.json).
const MENUS = [
  {
    k: 'software', label: 'Software Development', short: 'Software',
    items: [
      { title: 'ARDI', subtitle: 'React Native · AR adventure games', tag: 'MOBILE', focus: 'ARDI' },
      { title: 'This universe', subtitle: 'The site you are in · Three.js', tag: 'WEB', focus: 'Anurag Gotety' },
    ],
  },
  {
    k: 'games', label: 'Games',
    items: [
      { title: 'Portal Defender', subtitle: 'Unity · orbital space shooter', tag: 'WEB', focus: 'Portal Defender' },
      { title: 'Yaoshi', subtitle: 'Game jam · 2D cinematic platformer', tag: 'WEB', focus: 'Yaoshi' },
      { title: 'Erin and the Otherworld', subtitle: 'Unity · deckbuilder UI systems', tag: 'PC', focus: 'Erin and the Otherworld' },
    ],
  },
  {
    k: 'films', label: 'Films',
    items: [
      { title: 'YouTube', subtitle: 'Films and videos', tag: 'VIDEO', href: 'https://www.youtube.com/@anuraggotety7680/videos' },
      { title: 'Instagram', subtitle: '@goat80_productions', tag: 'PHOTO', href: 'https://www.instagram.com/goat80_productions/' },
    ],
  },
];

const SOCIALS = [
  { title: 'LinkedIn', subtitle: 'in/anurag-gotety', icon: 'fab fa-linkedin', href: 'https://linkedin.com/in/anurag-gotety' },
  { title: 'Email', subtitle: 'anurag10gotety@gmail.com', icon: 'fas fa-envelope', href: 'mailto:anurag10gotety@gmail.com' },
  { title: 'YouTube', subtitle: '@anuraggotety7680', icon: 'fab fa-youtube', href: 'https://www.youtube.com/@anuraggotety7680/videos' },
  { title: 'Instagram', subtitle: '@goat80_productions', icon: 'fab fa-instagram', href: 'https://www.instagram.com/goat80_productions/' },
];

const ROW_SEL = '.tn-row, .tn-fly';

function rowHTML(it) {
  const inner = `${it.icon ? `<i class="tn-icon ${it.icon}" aria-hidden="true"></i>` : ''}
    <span class="tn-text"><span class="tn-title">${it.title}</span><span class="tn-sub">${it.subtitle}</span></span>
    ${it.tag ? `<span class="tn-tag">${it.tag}</span>` : ''}`;
  if (!it.href) return `<li><button type="button" class="tn-row" data-focus="${it.focus}">${inner}</button></li>`;
  const ext = it.href.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"';
  return `<li><a class="tn-row" href="${it.href}"${ext}>${inner}</a></li>`;
}

const listHTML = (items) => `<ul class="tn-list">${items.map(rowHTML).join('')}</ul>`;

function menuHTML(id, body, extraClass = '') {
  return `<div class="tn-menu ${extraClass}" id="tn-menu-${id}">
    <div class="tn-glass"></div>
    <div class="tn-scroll">${body}</div>
  </div>`;
}

function triggerHTML(id, label, menu, { ariaLabel, caret = true } = {}) {
  return `<div class="tn-item" data-menu="${id}">
    <button type="button" class="tn-btn" aria-expanded="false" aria-haspopup="true" aria-controls="tn-menu-${id}"${ariaLabel ? ` aria-label="${ariaLabel}"` : ''}>
      ${label}${caret ? '<span class="tn-caret tn-chev" aria-hidden="true">▾</span>' : ''}
    </button>
    ${menu}
  </div>`;
}

export function initTopNav({ onFocus, onResetCamera, onHelp }) {
  const nav = document.createElement('nav');
  nav.id = 'topNav';
  nav.setAttribute('aria-label', 'Main');

  const categories = MENUS.map((m) => {
    // Bar shows the short label; the full name heads the dropdown
    const body = `<div class="tn-group-label">${m.label}</div>${listHTML(m.items)}`;
    return triggerHTML(m.k, m.short || m.label, menuHTML(m.k, body)).replace('class="tn-item"', 'class="tn-item tn-cat"');
  }).join('');

  // Small screens: the three categories collapse into one grouped "Work" menu.
  const workBody = MENUS.map((m) => `<div class="tn-group">
      <div class="tn-group-label">${m.label}</div>
      ${listHTML(m.items)}
    </div>`).join('');

  const connectBody = `${listHTML(SOCIALS)}
    <div class="tn-foot tn-foot-split">
      <span>Connect with me</span>
      <button type="button" class="tn-fly" data-action="download">Download resume ↓</button>
    </div>`;

  nav.innerHTML = `
    <div class="tn-glass"></div>
    <button type="button" class="tn-btn" data-action="about">About Me</button>
    <button type="button" class="tn-btn" data-action="resume">Resume<span class="tn-caret" aria-hidden="true">↗</span></button>
    ${categories}
    ${triggerHTML('work', 'Work', menuHTML('work', workBody)).replace('class="tn-item"', 'class="tn-item tn-work"')}
    ${triggerHTML('connect', '☰', menuHTML('connect', connectBody, 'tn-menu-right'), { ariaLabel: 'Connect', caret: false })}`;

  const dock = document.createElement('div');
  dock.id = 'sceneDock';
  dock.innerHTML = `
    <div class="tn-glass"></div>
    <button type="button" class="dock-reset"><span aria-hidden="true">⟲</span> Reset camera</button>
    <button type="button" class="dock-help">Navigation controls</button>`;

  document.body.append(dock, nav);

  const items = [...nav.querySelectorAll('.tn-item')];
  let openItem = null;

  function closeMenus({ restoreFocus = false } = {}) {
    if (!openItem) return;
    const trigger = openItem.querySelector('.tn-btn');
    openItem.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    openItem = null;
    if (restoreFocus) trigger.focus();
  }

  function openMenu(item) {
    closeMenus();
    item.classList.add('open');
    item.querySelector('.tn-btn').setAttribute('aria-expanded', 'true');
    openItem = item;
  }

  const rowsOf = (item) => [...item.querySelectorAll(ROW_SEL)];

  items.forEach((item) => {
    item.querySelector('.tn-btn').addEventListener('click', () => {
      if (openItem === item) closeMenus();
      else openMenu(item);
    });
  });

  nav.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const focus = e.target.closest('[data-focus]')?.dataset.focus;
    const link = e.target.closest('a.tn-row');

    if (action === 'about') {
      closeMenus();
      onFocus('Anurag Gotety');
    } else if (action === 'resume') {
      closeMenus();
      window.open(RESUME_URL, '_blank', 'noopener');
    } else if (action === 'download') {
      closeMenus();
      downloadResume();
    } else if (focus) {
      closeMenus();
      onFocus(focus);
    } else if (link) {
      closeMenus();
    }
  });

  // Arrow keys move within an open dropdown; Esc closes it and returns focus to its trigger.
  window.addEventListener('keydown', (e) => {
    if (!openItem) return;
    if (e.key === 'Escape') {
      e.stopImmediatePropagation();
      closeMenus({ restoreFocus: true });
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = rowsOf(openItem);
    if (!rows.length) return;
    e.preventDefault();
    const i = rows.indexOf(document.activeElement);
    const step = e.key === 'ArrowDown' ? 1 : -1;
    const next = i === -1 ? (step === 1 ? 0 : rows.length - 1) : (i + step + rows.length) % rows.length;
    rows[next].focus();
  }, true);

  nav.addEventListener('focusout', (e) => {
    // relatedTarget is null on mouse clicks in Safari; pointerdown below covers those.
    if (openItem && e.relatedTarget && !openItem.contains(e.relatedTarget)) closeMenus();
  });

  document.addEventListener('pointerdown', (e) => {
    if (openItem && !nav.contains(e.target)) closeMenus();
  });

  dock.querySelector('.dock-reset').addEventListener('click', onResetCamera);
  dock.querySelector('.dock-help').addEventListener('click', onHelp);

  return { closeMenus };
}

export function downloadResume() {
  const a = document.createElement('a');
  a.href = RESUME_URL;
  a.download = 'AnuragGotety_resume.pdf';
  a.click();
}
