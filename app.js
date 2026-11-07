'use strict';
/*
 * Smemorapp: schemi di citofoni e pianerottoli per il ministero di casa in casa.
 * Nessun dato personale: solo segni A / N / V, etichette (es. numero interno) e note brevi.
 * Tutto resta nel localStorage del dispositivo; backup tramite export/import JSON.
 */

const KEY = 'smemorapp.v1';

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const now = () => new Date().toISOString();
const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round1 = (v) => Math.round(v * 10) / 10;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const vibrate = () => { try { navigator.vibrate && navigator.vibrate(15); } catch (e) { /* ignore */ } };

const STATUS = { A: 'Assente', N: 'Non interessato', V: 'Visita ulteriore' };
const STATUS_SHORT = { A: 'Assente', N: 'Non int.', V: 'Visita' };
const TYPES = { door: 'Porta', stairs: 'Scale', elevator: 'Ascensore', window: 'Finestra', entrance: 'Ingresso', other: 'Altro' };

const I = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
  eraser: '<svg viewBox="0 0 24 24"><path d="M8 20h12M5.5 13.5l7-7a2 2 0 012.8 0l2.2 2.2a2 2 0 010 2.8L11 18H8l-2.5-2.5a1.4 1.4 0 010-2z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/></svg>',
  layout: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M9 7h6M9 11h6M9 15h6"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
  door: '<svg viewBox="0 0 24 24"><path d="M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M3 21h18"/><circle cx="14.5" cy="12" r=".8"/></svg>',
  stairs: '<svg viewBox="0 0 24 24"><path d="M3 20h5v-5h5v-5h5V5h3"/></svg>',
  elevator: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 10l3-3 3 3M9 14l3 3 3-3"/></svg>',
  window: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16"/></svg>',
  entrance: '<svg viewBox="0 0 24 24"><path d="M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M3 12h11M10 8l4 4-4 4"/></svg>',
  other: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
};

// Ready-made landing layouts. Coordinates are % of the canvas (3:4), doors listed left→right, top→bottom.
const TEMPLATES = [
  { id: 'p2', name: '2 porte', items: [['door', 18, 38], ['door', 82, 38], ['stairs', 50, 86]] },
  { id: 'p2a', name: '2 porte + ascensore', items: [['door', 18, 38], ['door', 82, 38], ['stairs', 30, 86], ['elevator', 70, 86]] },
  { id: 'p3', name: '3 porte', items: [['door', 50, 12], ['door', 18, 45], ['door', 82, 45], ['stairs', 50, 86]] },
  { id: 'p3a', name: '3 porte + ascensore', items: [['door', 50, 12], ['door', 18, 45], ['door', 82, 45], ['stairs', 30, 86], ['elevator', 70, 86]] },
  { id: 'p4a', name: '4 porte + ascensore', items: [['door', 18, 22], ['door', 82, 22], ['elevator', 50, 46], ['door', 18, 62], ['door', 82, 62], ['stairs', 50, 88]] },
  { id: 'c6', name: 'Corridoio 6 porte', items: [['window', 50, 6], ['door', 18, 20], ['door', 82, 20], ['door', 18, 44], ['door', 82, 44], ['door', 18, 68], ['door', 82, 68], ['stairs', 50, 90]] },
  { id: 'empty', name: 'Vuoto', items: [] },
];

const floorName = (n) => n === 0 ? 'Piano terra' : n < 0 ? (n === -1 ? 'Seminterrato' : `Interrato ${-n}`) : `Piano ${n}`;
const floorShort = (n) => n === 0 ? 'T' : n < 0 ? `S${-n}` : String(n);
const mark = (extra = {}) => ({ id: uid(), label: '', status: '', note: '', date: '', ...extra });
const tplItems = (t) => t.items.map(([type, x, y]) => mark({ type, x, y }));

// ---------- storage ----------
function normMark(c) {
  return { id: String(c.id || uid()), label: String(c.label || ''), status: STATUS[c.status] ? c.status : '', note: String(c.note || ''), date: c.date || '' };
}
function normalize(d) {
  if (!d || !Array.isArray(d.buildings)) throw new Error('Formato non valido');
  return {
    version: 1,
    buildings: d.buildings.map((b) => ({
      id: String(b.id || uid()),
      name: String(b.name || 'Senza nome'),
      note: String(b.note || ''),
      createdAt: b.createdAt || now(),
      updatedAt: b.updatedAt || now(),
      intercom: {
        cols: clamp(int(b.intercom && b.intercom.cols, 2), 1, 6),
        cells: ((b.intercom && b.intercom.cells) || []).map(normMark),
      },
      floors: (b.floors || []).map((f) => ({
        id: String(f.id || uid()),
        num: int(f.num, 0),
        label: String(f.label || floorName(int(f.num, 0))),
        items: (f.items || []).filter((i) => TYPES[i.type]).map((i) => ({
          ...normMark(i), type: i.type, x: clamp(Number(i.x) || 50, 0, 100), y: clamp(Number(i.y) || 50, 0, 100),
        })),
      })),
    })),
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { console.warn('Dati non leggibili', e); }
  return { version: 1, buildings: [] };
}
let db = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('Attenzione: impossibile salvare sul dispositivo'); }
}
try { navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {}); } catch (e) { /* ignore */ }

// Every change goes through commit(): snapshot for undo, save, re-render.
const undoStack = [];
function commit(fn, msg, { undoable = true, rerender = true } = {}) {
  const snap = JSON.stringify(db);
  fn();
  if (undoable) { undoStack.push(snap); if (undoStack.length > 40) undoStack.shift(); }
  save();
  if (rerender) render();
  if (msg) toast(msg, undoable);
}
function undo() {
  const s = undoStack.pop();
  if (!s) return;
  db = JSON.parse(s);
  save();
  closeSheet();
  render();
  toast('Modifica annullata');
}

const getB = (id) => db.buildings.find((b) => b.id === id);
const getF = (b, id) => b && b.floors.find((f) => f.id === id);
const touch = (b) => { b.updatedAt = now(); };
const doorsOf = (f) => f.items.filter((i) => i.type === 'door');
const sortedFloors = (b) => [...b.floors].sort((x, y) => y.num - x.num);
const countList = (arr) => arr.reduce((c, x) => { if (x.status) c[x.status]++; return c; }, { A: 0, N: 0, V: 0, total: arr.length });
const pills = (c) => ['A', 'N', 'V'].map((k) => `<span class="pill s-${k}" title="${STATUS[k]}">${k} ${c[k]}</span>`).join('');
const countsLine = (arr) => `<div class="counts">${pills(countList(arr))}<span class="muted small">su ${arr.length}</span></div>`;
function setStatus(obj, st) { obj.status = st || ''; obj.date = now(); }

// ---------- UI state ----------
const UI_KEY = 'smemorapp.ui';
const ui = { brush: 'edit', tabs: {}, search: '' };
try { Object.assign(ui.tabs, JSON.parse(localStorage.getItem(UI_KEY) || '{}').tabs); } catch (e) { /* ignore */ }
const saveUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify({ tabs: ui.tabs })); } catch (e) { /* ignore */ } };
let cur = { b: null, f: null };

// ---------- toast ----------
let toastTimer;
function toast(msg, withUndo) {
  const r = $('#toast-root');
  r.innerHTML = `<div class="toast"><span>${esc(msg)}</span>${withUndo && undoStack.length ? '<button class="toast-btn" id="toast-undo">Annulla</button>' : ''}</div>`;
  r.classList.add('show');
  const u = $('#toast-undo');
  if (u) u.onclick = undo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => r.classList.remove('show'), withUndo ? 4500 : 2200);
}

// ---------- bottom sheet ----------
function on(root, act, fn) {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (t && root.contains(t) && t.dataset.act === act) fn(t, e);
  });
}
function openSheet(html, init) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`;
  root.classList.add('open');
  const sh = $('.sheet', root);
  $('.backdrop', root).addEventListener('click', closeSheet);
  on(sh, 'cancel', closeSheet);
  sh.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
      const ok = $('[data-act="ok"]', sh);
      if (ok) { e.preventDefault(); ok.click(); }
    }
  });
  if (init) init(sh);
}
function closeSheet() {
  const r = $('#sheet-root');
  r.classList.remove('open');
  r.innerHTML = '';
}
function tplPicker(selected) {
  return `<div class="tpl-grid" id="tpl">${TEMPLATES.map((t) => `<button type="button" class="tpl ${t.id === selected ? 'on' : ''}" data-tpl="${t.id}">${miniCanvas(tplItems(t))}<span>${esc(t.name)}</span></button>`).join('')}</div>`;
}
function bindTplPicker(sh, onPick) {
  $('#tpl', sh).addEventListener('click', (e) => {
    const t = e.target.closest('[data-tpl]');
    if (!t) return;
    $$('.tpl', sh).forEach((x) => x.classList.toggle('on', x === t));
    onPick(t.dataset.tpl);
  });
}

// ---------- rendering ----------
function topbar({ title, back, actions = '' }) {
  $('#topbar').innerHTML =
    (back ? `<a class="icon-btn" href="${back}" aria-label="Indietro">${I.back}</a>` : '<img class="brand" src="icons/icon.svg" alt="">') +
    `<h1>${esc(title)}</h1>${actions}`;
}

function render() {
  const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  if (parts[0] === 'b' && parts[1]) {
    const b = getB(parts[1]);
    if (!b) { location.replace('#/'); return; }
    if (parts[2] === 'f' && parts[3]) {
      const f = getF(b, parts[3]);
      if (!f) { location.replace(`#/b/${b.id}`); return; }
      return viewFloor(b, f);
    }
    return viewBuilding(b);
  }
  if (parts[0] === 'settings') return viewSettings();
  return viewHome();
}

// ----- home -----
function viewHome() {
  cur = { b: null, f: null };
  document.title = 'Smemorapp';
  topbar({ title: 'Smemorapp', actions: `<a class="icon-btn" href="#/settings" aria-label="Backup e impostazioni">${I.settings}</a>` });
  $('#view').innerHTML = db.buildings.length
    ? `<input class="search" type="search" id="search" placeholder="Cerca palazzo o via…" value="${esc(ui.search)}" autocomplete="off">
       <div class="list" id="blist"></div>
       <button class="fab" data-act="new-building">${I.plus}<span>Nuovo palazzo</span></button>`
    : `<div class="empty-state">${I.bell}
         <p>Aggiungi un palazzo per creare lo schema del citofono e dei piani, poi segna velocemente chi trovi.</p>
         <button class="btn primary" data-act="new-building">${I.plus} Nuovo palazzo</button>
         ${legend()}
       </div>`;
  const s = $('#search');
  if (s) {
    s.addEventListener('input', () => { ui.search = s.value; renderHomeList(); });
    renderHomeList();
  }
}
function legend() {
  return `<div class="legend">${Object.entries(STATUS).map(([k, v]) => `<div class="s-${k}"><b>${k}</b>${v}</div>`).join('')}</div>`;
}
function renderHomeList() {
  const q = ui.search.trim().toLowerCase();
  const list = [...db.buildings]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .filter((b) => !q || `${b.name} ${b.note}`.toLowerCase().includes(q));
  $('#blist').innerHTML = list.map(cardB).join('') || '<p class="empty">Nessun palazzo trovato.</p>';
}
function cardB(b) {
  const ci = countList(b.intercom.cells);
  const cf = countList(b.floors.flatMap(doorsOf));
  return `<a class="card" href="#/b/${b.id}">
    <div class="card-main"><strong>${esc(b.name)}</strong>${b.note ? `<span class="muted small">${esc(b.note)}</span>` : ''}</div>
    <div class="card-meta">
      ${b.intercom.cells.length ? `<span class="meta-group" title="Citofono">${I.bell}${pills(ci)}</span>` : ''}
      ${b.floors.length ? `<span class="meta-group" title="Piani">${I.layers}${pills(cf)}</span>` : ''}
      <span class="muted small">${fmtDate(b.updatedAt)}</span>
    </div></a>`;
}

// ----- building -----
function viewBuilding(b) {
  cur = { b, f: null };
  document.title = `${b.name} · Smemorapp`;
  const tab = ui.tabs[b.id] || 'intercom';
  const hasA = b.intercom.cells.some((c) => c.status === 'A') || b.floors.some((f) => f.items.some((i) => i.status === 'A'));
  topbar({ title: b.name, back: '#/', actions: `<button class="icon-btn" data-act="edit-building" aria-label="Modifica palazzo">${I.edit}</button>` });
  $('#view').innerHTML = `
    ${b.note ? `<p class="subtitle">${esc(b.note)}</p>` : ''}
    <div class="tabs" role="tablist">
      <button class="tab ${tab === 'intercom' ? 'on' : ''}" role="tab" aria-selected="${tab === 'intercom'}" data-act="tab" data-tab="intercom">${I.bell} Citofono</button>
      <button class="tab ${tab === 'floors' ? 'on' : ''}" role="tab" aria-selected="${tab === 'floors'}" data-act="tab" data-tab="floors">${I.layers} Piani</button>
    </div>
    ${tab === 'intercom' ? intercomHTML(b) : floorsHTML(b)}
    ${hasA ? `<div class="footer-actions"><button class="btn ghost small" data-act="new-round">${I.refresh} Nuovo giro: togli gli A</button></div>` : ''}`;
}

function brushBar(where) {
  const list = [['edit', I.edit, where === 'floor' ? 'Sposta' : 'Modifica'], ['A'], ['N'], ['V'], ['clear', I.eraser, 'Pulisci']];
  const bar = list.map(([k, icon, label]) => {
    const isSt = k.length === 1;
    return `<button class="brush ${isSt ? 's-' + k : ''} ${ui.brush === k ? 'on' : ''}" data-act="brush" data-b="${k}" aria-pressed="${ui.brush === k}" title="${isSt ? STATUS[k] : label}">
      ${isSt ? `<b>${k}</b><span>${STATUS_SHORT[k]}</span>` : `${icon}<span>${label}</span>`}</button>`;
  }).join('');
  let hint;
  if (ui.brush === 'edit') hint = where === 'floor' ? 'Trascina per spostare. Tocca per modificare o aggiungere una nota.' : 'Tocca un pulsante per modificarlo o aggiungere una nota.';
  else if (ui.brush === 'clear') hint = 'Tocca per togliere il segno.';
  else hint = `Tocca per segnare <b>${STATUS[ui.brush]}</b>. Tieni premuto per la nota.`;
  return `<div class="brushbar" role="toolbar" aria-label="Strumento">${bar}</div><p class="hint">${hint}</p>`;
}

function intercomHTML(b) {
  const ic = b.intercom;
  if (!ic.cells.length) {
    return `<div class="empty-state">${I.bell}<p>Riproduci i pulsanti del citofono per segnare velocemente A, N e V anche senza salire.</p>
      <button class="btn primary" data-act="intercom-create">Crea schema citofono</button></div>`;
  }
  return `${brushBar('intercom')}
    <div class="intercom" style="--cols:${ic.cols}">
      ${ic.cells.map((c) => `<button class="cell ${c.status ? 'marked s-' + c.status : ''}" data-act="cell" data-long="cell-edit" data-id="${c.id}"
          aria-label="Pulsante ${esc(c.label)} ${c.status ? STATUS[c.status] : ''}">
        <span class="cell-label">${esc(c.label) || '&nbsp;'}</span><span class="cell-st">${c.status}</span>
        ${c.note ? '<i class="note-dot" title="Con nota"></i>' : ''}</button>`).join('')}
    </div>
    ${countsLine(ic.cells)}
    <div class="row-actions">
      <div class="stepper">Colonne <button class="btn small" data-act="cols" data-d="-1" aria-label="Meno colonne">−</button><b>${ic.cols}</b><button class="btn small" data-act="cols" data-d="1" aria-label="Più colonne">+</button></div>
      <button class="btn small" data-act="cell-add">${I.plus} Pulsante</button>
      <button class="btn small ghost" data-act="intercom-create">Rifai</button>
    </div>`;
}

function floorsHTML(b) {
  const fl = sortedFloors(b);
  if (!fl.length) {
    return `<div class="empty-state">${I.layers}<p>Crea i piani partendo da uno schema già pronto, poi sistema porte, scale, ascensore e finestre come li vedi.</p>
      <button class="btn primary" data-act="floors-add">Aggiungi piani</button></div>`;
  }
  return `<div class="floor-list">${fl.map((f) => `
      <a class="floor-row" href="#/b/${b.id}/f/${f.id}">
        <span class="floor-num">${esc(floorShort(f.num))}</span>
        <span class="floor-info"><strong>${esc(f.label)}</strong>
          <span class="floor-doors">${doorsOf(f).map((d) => `<i class="mini-door ${d.status ? 'marked s-' + d.status : ''}" title="${esc(d.label)}">${d.status}</i>`).join('') || '<span class="muted small">nessuna porta</span>'}</span>
        </span>
        <span class="chev">${I.chev}</span>
      </a>`).join('')}</div>
    ${countsLine(fl.flatMap(doorsOf))}
    <div class="row-actions"><button class="btn small" data-act="floors-add">${I.plus} Aggiungi piani</button></div>`;
}

// ----- floor editor -----
function itemHTML(i) {
  const pos = `left:${i.x}%;top:${i.y}%`;
  if (i.type === 'door') {
    return `<div class="item door ${i.status ? 'marked s-' + i.status : ''}" data-id="${i.id}" style="${pos}" role="button" aria-label="Porta ${esc(i.label)} ${i.status ? STATUS[i.status] : ''}">
      ${i.status ? `<b class="st">${i.status}</b>` : I.door}${i.label ? `<span class="lbl">${esc(i.label)}</span>` : ''}${i.note ? '<i class="note-dot"></i>' : ''}</div>`;
  }
  return `<div class="item lm lm-${i.type}" data-id="${i.id}" style="${pos}" role="button" aria-label="${esc(i.label || TYPES[i.type])}">${I[i.type] || I.other}<span class="lbl">${esc(i.label || TYPES[i.type])}</span></div>`;
}
const miniCanvas = (items) => `<div class="canvas mini" aria-hidden="true">${items.map(itemHTML).join('')}</div>`;

function viewFloor(b, f) {
  cur = { b, f };
  document.title = `${f.label} · ${b.name}`;
  const fl = sortedFloors(b);
  const idx = fl.indexOf(f);
  const up = fl[idx - 1];
  const down = fl[idx + 1];
  topbar({ title: f.label, back: `#/b/${b.id}`, actions: `<button class="icon-btn" data-act="floor-menu" aria-label="Opzioni piano">${I.more}</button>` });
  $('#view').innerHTML = `
    <p class="subtitle">${esc(b.name)}</p>
    <div class="floor-nav">
      ${up ? `<a class="btn small" href="#/b/${b.id}/f/${up.id}" aria-label="Piano sopra">${I.up}<span>${esc(up.label)}</span></a>` : '<span></span>'}
      ${down ? `<a class="btn small" href="#/b/${b.id}/f/${down.id}" aria-label="Piano sotto"><span>${esc(down.label)}</span>${I.down}</a>` : '<span></span>'}
    </div>
    ${brushBar('floor')}
    <div class="canvas" id="canvas">${f.items.map(itemHTML).join('')}</div>
    ${countsLine(doorsOf(f))}
    <p class="section-label">Aggiungi al pianerottolo</p>
    <div class="addbar">${Object.keys(TYPES).map((t) => `<button class="add-item" data-act="add-item" data-type="${t}">${I[t]}<span>${TYPES[t]}</span></button>`).join('')}</div>`;
  bindCanvas(b, f);
}

function bindCanvas(b, f) {
  const cv = $('#canvas');
  let drag = null;
  cv.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.item');
    if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const it = f.items.find((i) => i.id === el.dataset.id);
    if (!it) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    drag = { el, it, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, r: cv.getBoundingClientRect(), moved: false, long: false };
    drag.timer = setTimeout(() => {
      if (drag && !drag.moved) { drag.long = true; vibrate(); openItemSheet(b, f, it); }
    }, 480);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || drag.long) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) { drag.moved = true; clearTimeout(drag.timer); drag.el.classList.add('dragging'); }
    drag.nx = clamp(drag.ox + (dx / drag.r.width) * 100, 4, 96);
    drag.ny = clamp(drag.oy + (dy / drag.r.height) * 100, 3, 97);
    drag.el.style.left = drag.nx + '%';
    drag.el.style.top = drag.ny + '%';
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    clearTimeout(drag.timer);
    const d = drag;
    drag = null;
    if (e.type === 'pointercancel') { render(); return; }
    if (d.long) { swallowNextClick(); return; }
    if (d.moved) { commit(() => { d.it.x = round1(d.nx); d.it.y = round1(d.ny); touch(b); }); return; }
    if (d.it.type === 'door' && ui.brush !== 'edit') applyBrush(b, d.it, doorName(d.it));
    else { swallowNextClick(); openItemSheet(b, f, d.it); }
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
}
const doorName = (d) => d.label ? `Porta ${d.label}` : 'Porta';
const cellName = (c) => c.label ? `Pulsante ${c.label}` : 'Pulsante';

function applyBrush(b, obj, name) {
  const st = ui.brush === 'clear' ? '' : (obj.status === ui.brush ? '' : ui.brush);
  if (st === obj.status) return;
  vibrate();
  commit(() => { setStatus(obj, st); touch(b); }, `${name}: ${st ? STATUS[st] : 'nessun segno'}`);
}

function openItemSheet(b, f, it) {
  if (it.type === 'door') {
    sheetMark(b, it, { title: 'Porta', labelHint: 'Etichetta (es. interno 5, sinistra)', remove: () => { f.items = f.items.filter((x) => x !== it); } });
  } else {
    sheetLandmark(b, f, it);
  }
}

// ---------- sheets ----------
function sheetMark(b, obj, { title, labelHint, remove }) {
  let st = obj.status || '';
  openSheet(`
    <h2>${esc(title)}</h2>
    <label class="field"><span>${esc(labelHint)}</span><input id="m-label" value="${esc(obj.label)}" maxlength="24" autocomplete="off"></label>
    <div class="field"><span>Segno</span>
      <div class="seg" id="m-seg">${['', 'A', 'N', 'V'].map((k) => `<button type="button" class="seg-btn ${k ? 's-' + k : ''} ${st === k ? 'on' : ''}" data-st="${k}">${k ? `<b>${k}</b>${STATUS[k]}` : 'Nessun segno'}</button>`).join('')}</div>
    </div>
    <label class="field"><span>Nota</span><textarea id="m-note" rows="3" maxlength="500" placeholder="Es. argomento trattato, quando ritornare… Evita nomi e dati personali.">${esc(obj.note)}</textarea></label>
    ${obj.date ? `<p class="muted small">Ultimo aggiornamento: ${fmtDate(obj.date)}</p>` : ''}
    <div class="sheet-actions">
      <button class="btn danger-ghost" data-act="del">${I.trash} Elimina</button>
      <button class="btn" data-act="cancel">Annulla</button>
      <button class="btn primary" data-act="ok">Salva</button>
    </div>`, (sh) => {
    $('#m-seg', sh).addEventListener('click', (e) => {
      const t = e.target.closest('[data-st]');
      if (!t) return;
      st = t.dataset.st;
      $$('.seg-btn', sh).forEach((x) => x.classList.toggle('on', x === t));
    });
    on(sh, 'ok', () => {
      const label = $('#m-label', sh).value.trim();
      const note = $('#m-note', sh).value.trim();
      closeSheet();
      commit(() => {
        if (st !== obj.status) setStatus(obj, st);
        else if (note !== obj.note) obj.date = now();
        obj.label = label;
        obj.note = note;
        touch(b);
      }, 'Salvato');
    });
    on(sh, 'del', () => { closeSheet(); commit(() => { remove(); touch(b); }, 'Eliminato'); });
  });
}

function sheetLandmark(b, f, it) {
  openSheet(`
    <h2>${esc(TYPES[it.type])}</h2>
    <label class="field"><span>Nome sullo schema</span><input id="l-label" value="${esc(it.label)}" placeholder="${esc(TYPES[it.type])}" maxlength="24" autocomplete="off"></label>
    <div class="sheet-actions">
      <button class="btn danger-ghost" data-act="del">${I.trash} Elimina</button>
      <button class="btn" data-act="cancel">Annulla</button>
      <button class="btn primary" data-act="ok">Salva</button>
    </div>`, (sh) => {
    if (it.type === 'other' && !it.label) $('#l-label', sh).focus();
    on(sh, 'ok', () => { const label = $('#l-label', sh).value.trim(); closeSheet(); commit(() => { it.label = label; touch(b); }); });
    on(sh, 'del', () => { closeSheet(); commit(() => { f.items = f.items.filter((x) => x !== it); touch(b); }, 'Eliminato'); });
  });
}

function sheetBuilding(b) {
  const isNew = !b;
  openSheet(`
    <h2>${isNew ? 'Nuovo palazzo' : 'Modifica palazzo'}</h2>
    <label class="field"><span>Indirizzo o nome</span><input id="b-name" value="${esc(b && b.name)}" placeholder="Es. Via Roma 12" maxlength="80" autocomplete="off"></label>
    <label class="field"><span>Nota (facoltativa)</span><input id="b-note" value="${esc(b && b.note)}" placeholder="Es. Scala B, territorio 14" maxlength="120" autocomplete="off"></label>
    <div class="sheet-actions">
      ${isNew ? '' : `<button class="btn danger-ghost" data-act="del">${I.trash} Elimina</button>`}
      <button class="btn" data-act="cancel">Annulla</button>
      <button class="btn primary" data-act="ok">${isNew ? 'Crea' : 'Salva'}</button>
    </div>`, (sh) => {
    if (isNew) $('#b-name', sh).focus();
    on(sh, 'ok', () => {
      const name = $('#b-name', sh).value.trim();
      const note = $('#b-note', sh).value.trim();
      if (!name) { $('#b-name', sh).focus(); return; }
      closeSheet();
      if (isNew) {
        const nb = { id: uid(), name, note, createdAt: now(), updatedAt: now(), intercom: { cols: 2, cells: [] }, floors: [] };
        commit(() => db.buildings.push(nb), null, { undoable: false, rerender: false });
        location.hash = `#/b/${nb.id}`;
      } else {
        commit(() => { b.name = name; b.note = note; touch(b); }, 'Palazzo aggiornato');
      }
    });
    on(sh, 'del', () => {
      if (!confirm(`Eliminare "${b.name}" con citofono e piani?`)) return;
      closeSheet();
      commit(() => { db.buildings = db.buildings.filter((x) => x.id !== b.id); }, 'Palazzo eliminato', { rerender: false });
      location.hash = '#/';
    });
  });
}

// ---------- actions (delegated clicks in #view and #topbar) ----------
const actions = {
  'new-building': () => sheetBuilding(null),
  'edit-building': () => sheetBuilding(cur.b),
  tab: (el) => { ui.tabs[cur.b.id] = el.dataset.tab; saveUi(); render(); },
  brush: (el) => { ui.brush = el.dataset.b; render(); },

  'intercom-create': () => {
    const b = cur.b;
    const has = b.intercom.cells.length;
    openSheet(`
      <h2>Schema del citofono</h2>
      <div class="grid2">
        <label class="field"><span>Pulsanti</span><input id="ic-n" type="number" inputmode="numeric" min="1" max="200" value="${has || 8}"></label>
        <label class="field"><span>Colonne</span><input id="ic-c" type="number" inputmode="numeric" min="1" max="6" value="${b.intercom.cols || 2}"></label>
      </div>
      <label class="check"><input type="checkbox" id="ic-num" checked> Numera da <input id="ic-start" class="inline-num" type="number" inputmode="numeric" value="1"></label>
      <p class="muted small">Potrai cambiare l'etichetta di ogni pulsante toccandolo in modalità Modifica.</p>
      ${has ? '<p class="warn">Lo schema attuale e i suoi segni verranno sostituiti (puoi sempre annullare).</p>' : ''}
      <div class="sheet-actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn primary" data-act="ok">Crea</button></div>`, (sh) => {
      on(sh, 'ok', () => {
        const n = clamp(int($('#ic-n', sh).value, 8), 1, 200);
        const c = clamp(int($('#ic-c', sh).value, 2), 1, 6);
        const num = $('#ic-num', sh).checked;
        const start = int($('#ic-start', sh).value, 1);
        closeSheet();
        commit(() => {
          b.intercom = { cols: c, cells: Array.from({ length: n }, (_, i) => mark({ label: num ? String(start + i) : '' })) };
          touch(b);
        }, 'Schema del citofono creato');
      });
    });
  },
  cell: (el) => {
    const c = cur.b.intercom.cells.find((x) => x.id === el.dataset.id);
    if (!c) return;
    if (ui.brush === 'edit') actions['cell-edit'](el);
    else applyBrush(cur.b, c, cellName(c));
  },
  'cell-edit': (el) => {
    const b = cur.b;
    const c = b.intercom.cells.find((x) => x.id === el.dataset.id);
    if (c) sheetMark(b, c, { title: 'Pulsante del citofono', labelHint: 'Etichetta (es. numero interno)', remove: () => { b.intercom.cells = b.intercom.cells.filter((x) => x !== c); } });
  },
  cols: (el) => { const b = cur.b; commit(() => { b.intercom.cols = clamp(b.intercom.cols + int(el.dataset.d, 0), 1, 6); }, null, { undoable: false }); },
  'cell-add': () => {
    const b = cur.b;
    const last = b.intercom.cells[b.intercom.cells.length - 1];
    const n = last ? parseInt(last.label, 10) : 0;
    commit(() => { b.intercom.cells.push(mark({ label: Number.isFinite(n) ? String(n + 1) : '' })); touch(b); }, 'Pulsante aggiunto');
  },

  'floors-add': () => {
    const b = cur.b;
    const next = b.floors.length ? Math.max(...b.floors.map((f) => f.num)) + 1 : 0;
    let tpl = 'p2';
    openSheet(`
      <h2>Aggiungi piani</h2>
      <div class="grid2">
        <label class="field"><span>Dal piano</span><input id="f-from" type="number" inputmode="numeric" value="${next}"></label>
        <label class="field"><span>Al piano</span><input id="f-to" type="number" inputmode="numeric" value="${b.floors.length ? next : 4}"></label>
      </div>
      <p class="muted small">0 = piano terra, −1 = seminterrato.</p>
      <div class="field"><span>Schema del pianerottolo (poi lo puoi modificare)</span>${tplPicker(tpl)}</div>
      <label class="check"><input type="checkbox" id="f-num"> Numera le porte in sequenza da <input id="f-start" class="inline-num" type="number" inputmode="numeric" value="1"></label>
      <div class="sheet-actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn primary" data-act="ok">Aggiungi</button></div>`, (sh) => {
      bindTplPicker(sh, (id) => { tpl = id; });
      on(sh, 'ok', () => {
        let a = int($('#f-from', sh).value, 0);
        let z = int($('#f-to', sh).value, a);
        if (z < a) [a, z] = [z, a];
        if (z - a >= 60) { toast('Massimo 60 piani alla volta'); return; }
        const t = TEMPLATES.find((x) => x.id === tpl);
        const num = $('#f-num', sh).checked;
        let n = int($('#f-start', sh).value, 1);
        const created = [];
        closeSheet();
        commit(() => {
          for (let k = a; k <= z; k++) {
            const items = tplItems(t);
            if (num) items.filter((i) => i.type === 'door').forEach((d) => { d.label = String(n++); });
            const f = { id: uid(), num: k, label: floorName(k), items };
            b.floors.push(f);
            created.push(f);
          }
          touch(b);
        }, created.length === 1 ? 'Piano aggiunto' : `${z - a + 1} piani aggiunti`, { rerender: created.length !== 1 });
        if (created.length === 1) location.hash = `#/b/${b.id}/f/${created[0].id}`;
      });
    });
  },

  'add-item': (el) => {
    const { b, f } = cur;
    const type = el.dataset.type;
    // place in the middle, nudged so a new item does not hide an existing one
    let x = 50, y = 50, tries = 0;
    while (tries++ < 12 && f.items.some((i) => Math.abs(i.x - x) < 8 && Math.abs(i.y - y) < 6)) { x = 50 + ((tries % 3) - 1) * 18; y = 50 + Math.ceil(tries / 3) * 8 * (tries % 2 ? 1 : -1); }
    const it = mark({ type, x: clamp(x, 8, 92), y: clamp(y, 8, 92) });
    commit(() => { f.items.push(it); touch(b); }, `Aggiunto: ${TYPES[type]}. Trascina per posizionare`);
    if (type === 'other') sheetLandmark(b, f, it);
  },

  'floor-menu': () => {
    const { b, f } = cur;
    openSheet(`
      <h2>Opzioni del piano</h2>
      <div class="grid2">
        <label class="field"><span>Numero</span><input id="fm-num" type="number" inputmode="numeric" value="${f.num}"></label>
        <label class="field"><span>Nome</span><input id="fm-label" value="${esc(f.label)}" maxlength="30" autocomplete="off"></label>
      </div>
      <div class="sheet-actions" style="margin-top:4px"><button class="btn primary small" data-act="ok">Salva nome e numero</button></div>
      <div class="menu-list">
        <button class="btn" data-act="fm-template">${I.layout} Cambia schema del pianerottolo</button>
        <button class="btn" data-act="fm-dup">${I.copy} Copia questa disposizione su un nuovo piano</button>
        <button class="btn danger" data-act="fm-del">${I.trash} Elimina piano</button>
      </div>`, (sh) => {
      const numIn = $('#fm-num', sh);
      const labIn = $('#fm-label', sh);
      numIn.addEventListener('input', () => { if (labIn.value === floorName(f.num) || labIn.dataset.auto) { labIn.value = floorName(int(numIn.value, 0)); labIn.dataset.auto = '1'; } });
      on(sh, 'ok', () => {
        const n = int(numIn.value, f.num);
        const label = labIn.value.trim() || floorName(n);
        closeSheet();
        commit(() => { f.num = n; f.label = label; touch(b); }, 'Piano aggiornato');
      });
      on(sh, 'fm-template', () => sheetTemplate(b, f));
      on(sh, 'fm-dup', () => {
        const n = Math.max(...b.floors.map((x) => x.num)) + 1;
        const doors = doorsOf(f);
        const numeric = doors.length && doors.every((d) => /^\d+$/.test(d.label));
        const nf = {
          id: uid(), num: n, label: floorName(n),
          items: f.items.map((i) => mark({ type: i.type, x: i.x, y: i.y, label: i.type === 'door' && numeric ? String(int(i.label, 0) + doors.length) : (i.type === 'door' ? '' : i.label) })),
        };
        closeSheet();
        commit(() => { b.floors.push(nf); touch(b); }, `Creato ${nf.label}`, { rerender: false });
        location.hash = `#/b/${b.id}/f/${nf.id}`;
      });
      on(sh, 'fm-del', () => {
        if (!confirm(`Eliminare "${f.label}"?`)) return;
        closeSheet();
        commit(() => { b.floors = b.floors.filter((x) => x !== f); touch(b); }, 'Piano eliminato', { rerender: false });
        location.hash = `#/b/${b.id}`;
      });
    });
  },

  'new-round': () => {
    const b = cur.b;
    const all = [...b.intercom.cells, ...b.floors.flatMap((f) => f.items)].filter((x) => x.status === 'A');
    if (!all.length) return;
    if (!confirm(`Togliere ${all.length} segn${all.length === 1 ? 'o' : 'i'} "A" (assente) per un nuovo giro?\nN e V restano.`)) return;
    commit(() => { all.forEach((x) => setStatus(x, '')); touch(b); }, `${all.length} "A" tolti`);
  },

  export: () => exportData(),
  'wipe-all': () => {
    if (!db.buildings.length) return;
    if (!confirm('Eliminare TUTTI i palazzi e gli schemi da questo dispositivo?')) return;
    if (!confirm('Sei sicuro? Se non hai un backup non potrai recuperarli.')) return;
    commit(() => { db.buildings = []; }, 'Tutti i dati eliminati');
  },
};

function sheetTemplate(b, f) {
  let tpl = null;
  openSheet(`
    <h2>Cambia schema del pianerottolo</h2>
    <p class="muted small">Sostituisce porte e riferimenti di ${esc(f.label)}. I segni di questo piano verranno tolti.</p>
    ${tplPicker(null)}
    <div class="sheet-actions"><button class="btn" data-act="cancel">Annulla</button><button class="btn primary" data-act="ok">Applica</button></div>`, (sh) => {
    bindTplPicker(sh, (id) => { tpl = id; });
    on(sh, 'ok', () => {
      if (!tpl) { toast('Scegli uno schema'); return; }
      const t = TEMPLATES.find((x) => x.id === tpl);
      closeSheet();
      commit(() => { f.items = tplItems(t); touch(b); }, 'Schema applicato');
    });
  });
}

// ----- settings -----
function viewSettings() {
  cur = { b: null, f: null };
  document.title = 'Backup · Smemorapp';
  topbar({ title: 'Backup e informazioni', back: '#/' });
  const nB = db.buildings.length;
  $('#view').innerHTML = `
    <section class="panel">
      <h2>I tuoi dati</h2>
      <p>Hai ${nB} palazz${nB === 1 ? 'o' : 'i'} salvat${nB === 1 ? 'o' : 'i'}. I dati restano <b>solo su questo dispositivo</b>, non vengono inviati a nessuno.
      Se cancelli i dati del browser o cambi telefono li perdi: fai un backup ogni tanto.</p>
      <div class="btn-row">
        <button class="btn" data-act="export">${I.download} Esporta backup</button>
        <label class="btn">${I.upload} Importa backup<input type="file" id="imp" accept="application/json,.json" hidden></label>
      </div>
    </section>
    <section class="panel">
      <h2>Legenda</h2>
      ${legend()}
      <p style="margin-top:14px">Nelle note evita nomi e dati personali: bastano promemoria brevi come l'argomento trattato o quando ritornare.</p>
    </section>
    <section class="panel">
      <h2>Installa sul telefono</h2>
      <p><b>Android (Chrome):</b> menu ⋮ → <i>Installa app</i> oppure <i>Aggiungi a schermata Home</i>.<br>
      <b>iPhone (Safari):</b> pulsante Condividi → <i>Aggiungi alla schermata Home</i>.<br>
      Dopo l'installazione l'app funziona anche senza connessione.</p>
    </section>
    <section class="panel">
      <h2>Zona pericolosa</h2>
      <p>Elimina tutti i palazzi da questo dispositivo.</p>
      <button class="btn danger" data-act="wipe-all">${I.trash} Elimina tutti i dati</button>
    </section>`;
  $('#imp').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = normalize(JSON.parse(await file.text()));
      const n = data.buildings.length;
      if (!confirm(`Il backup contiene ${n} palazz${n === 1 ? 'o' : 'i'}. Sostituire i dati attuali?`)) return;
      commit(() => { db = data; }, 'Backup importato');
    } catch (err) {
      toast('File di backup non valido');
    }
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `smemorapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Backup scaricato');
}

// ---------- global input handling ----------
let suppressClick = false;
let suppressTimer;
function swallowNextClick() {
  suppressClick = true;
  clearTimeout(suppressTimer);
  suppressTimer = setTimeout(() => { suppressClick = false; }, 400);
}
// A long-press opens a sheet under the finger: eat the click that follows so it doesn't hit the backdrop.
document.addEventListener('click', (e) => {
  if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); }
}, true);

document.addEventListener('click', (e) => {
  if (e.target.closest('#sheet-root, #toast-root')) return;
  const t = e.target.closest('[data-act]');
  if (t && actions[t.dataset.act]) actions[t.dataset.act](t, e);
});

// long-press on elements with data-long (intercom buttons)
const lp = { timer: null, el: null, x: 0, y: 0 };
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-long]');
  if (!el || e.target.closest('#sheet-root')) return;
  lp.el = el; lp.x = e.clientX; lp.y = e.clientY;
  clearTimeout(lp.timer);
  lp.timer = setTimeout(() => {
    if (!lp.el) return;
    const target = lp.el;
    lp.el = null;
    vibrate();
    swallowNextClick();
    if (actions[target.dataset.long]) actions[target.dataset.long](target);
  }, 480);
});
document.addEventListener('pointermove', (e) => {
  if (lp.el && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 10) { clearTimeout(lp.timer); lp.el = null; }
});
['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, () => { clearTimeout(lp.timer); lp.el = null; }));
document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-long], .canvas')) e.preventDefault(); });

window.addEventListener('hashchange', () => { closeSheet(); render(); window.scrollTo(0, 0); });
window.addEventListener('storage', (e) => { if (e.key === KEY) { db = load(); render(); } });

render();

// Offline support. Skipped on localhost so edits during development show up immediately.
if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
