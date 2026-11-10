'use strict';
// ХОЛОС: ЯДРО 8 — пиксельный браузерный платформер. Без движка, чистый Canvas 2D.

const VW = 320, VH = 180, SC = 3, T = 16, H = 11;
const LAST = 20;   // номер последнего уровня — босс МрДрНос в мета-пространстве
const SALT = 99;   // секретный уровень «Солевая шахта» (раньше был 11)
const cv = document.getElementById('c');
cv.width = VW * SC; cv.height = VH * SC;
const ctx = cv.getContext('2d');

// ---------- утилиты
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const inside = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function mk(rows) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const col = PAL[r[x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } } });
  return c;
}
const IMG = {};
for (const k in SPR) IMG[k] = mk(SPR[k]);
IMG.heart = mk(['.r.r.', 'rrrrr', 'rrrrr', '.rrr.', '..r..']);
IMG.heartOff = mk(['.d.d.', 'ddddd', 'ddddd', '.ddd.', '..d..']);

function spr(img, x, y, flip, s = 1) {
  x = Math.round(x); y = Math.round(y);
  if (flip) { ctx.save(); ctx.translate(x + img.width * s, y); ctx.scale(-s, s); ctx.drawImage(img, 0, 0); ctx.restore(); }
  else ctx.drawImage(img, x, y, img.width * s, img.height * s);
}
// Пиксельный шрифт. Каждый символ один раз растеризуется в родной сетке шрифта (клетка 8×8:
// один пиксель шрифта = один пиксель холста), без полупрозрачных краёв, а на экран выводится
// масштабированием «ближайшим соседом». Раньше шрифт масштабировался векторно (font-size × SC),
// из-за чего кегль 6 расплывался. Ширина символа = кегль (у Press Start 2P шаг равен 1 em).
const glyphs = new Map();
// символы, которых нет в шрифте, — свои пиксельные картинки 8×8
const BIT = {
  '←': ['........', '...#....', '..##....', '.#######', '.#######', '..##....', '...#....', '........'],
  '→': ['........', '....#...', '....##..', '#######.', '#######.', '....##..', '....#...', '........'],
  '↑': ['...##...', '..####..', '.######.', '...##...', '...##...', '...##...', '...##...', '........'],
  '↓': ['........', '...##...', '...##...', '...##...', '...##...', '.######.', '..####..', '...##...'],
  '▶': ['.##.....', '.####...', '.######.', '.#######', '.######.', '.####...', '.##.....', '........'],
  '∞': ['........', '........', '.##..##.', '#..##..#', '#..##..#', '.##..##.', '........', '........'],
};
function glyph(ch, col) {
  const key = ch + col; let c = glyphs.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = 8; c.height = 10;
  const g = c.getContext('2d');
  if (BIT[ch]) { g.fillStyle = col; BIT[ch].forEach((r, y) => { for (let x = 0; x < 8; x++) if (r[x] === '#') g.fillRect(x, y, 1, 1); }); glyphs.set(key, c); return c; }
  g.font = '8px "Press Start 2P", monospace'; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillStyle = '#000'; g.fillText(ch, 0, 0);
  const d = g.getImageData(0, 0, 8, 10), a = d.data;
  for (let i = 3; i < a.length; i += 4) a[i] = a[i] >= 110 ? 255 : 0; // убираем сглаживание
  g.putImageData(d, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 8, 10);
  glyphs.set(key, c); return c;
}
if (document.fonts) { // шрифт подгружается с Google Fonts: когда придёт, символы нужно растеризовать заново
  const redo = () => glyphs.clear();
  document.fonts.addEventListener('loadingdone', redo);
  document.fonts.load('8px "Press Start 2P"', 'Aa Яя').then(redo, () => { });
}
const textW = (s, size) => [...s].length * size;
function text(s, x, y, col = '#fff', size = 8, align = 'left', shadow) {
  s = String(s);
  if (shadow === undefined) shadow = col !== '#17161c' && col !== '#a02020' && col !== '#2d4c8f';
  const w = textW(s, size), k = size / 8;
  x = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x); y = Math.round(y);
  ctx.imageSmoothingEnabled = false;
  let i = 0;
  for (const ch of s) {
    if (ch !== ' ') {
      if (shadow) ctx.drawImage(glyph(ch, '#000'), x + i * size + 1, y + 1, 8 * k, 10 * k);
      ctx.drawImage(glyph(ch, col), x + i * size, y, 8 * k, 10 * k);
    }
    i++;
  }
}
function wrap(s, maxW, size = 8) {
  const out = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const tst = line ? line + ' ' + w : w;
      if (textW(tst, size) > maxW && line) { out.push(line); line = w; } else line = tst;
    }
    out.push(line);
  }
  return out;
}
function box(x, y, w, h, fill, border) {
  ctx.fillStyle = border; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
}

// ---------- настройки (хранятся в браузере)
const SET = { music: 7, sfx: 8, shake: 1 };
try {
  const o = JSON.parse(localStorage.getItem('holos_set') || '{}');
  for (const k of ['music', 'sfx']) if (Number.isFinite(o[k])) SET[k] = clamp(Math.round(o[k]), 0, 10);
  if (o.shake === 0 || o.shake === 1) SET.shake = o.shake;
} catch (e) { }
function saveSet() { try { localStorage.setItem('holos_set', JSON.stringify(SET)); } catch (e) { } }

// ---------- звук
let AC = null, musReady = false;   // musReady: браузер разрешает звук только после первого нажатия
function initAudio() { musReady = true; if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } if (AC && AC.state === 'suspended') AC.resume(); }
function sfx(f, d = 0.1, type = 'square', slide = 0, vol = 0.05) {
  if (!AC || !SET.sfx) return;
  vol *= SET.sfx / 8;
  try {
    const o = AC.createOscillator(), g = AC.createGain(), now = AC.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, now);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), now + d);
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + d);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(now + d);
  } catch (e) { }
}

// ---------- музыка: файлы лежат в папке music/. Сцена сама говорит, что должно играть (свойство music),
// а если не говорит — продолжает играть то, что играло. Смена трека — плавная.
const ZONE_MUSIC = ['Odessa', 'Gaza', 'Israel', 'MrDrNose Boss', 'BearBO Boss', 'Synagogue', 'Valve Server', 'Backrooms'];
const MUS = {};
let musWant = null, musDuck = 1;
function musEl(n) {
  if (!MUS[n]) { const a = new Audio('music/' + encodeURIComponent(n) + '.mp3'); a.loop = true; a.preload = 'auto'; a.volume = 0; MUS[n] = a; }
  return MUS[n];
}
function musicTick() {
  const m = scene && scene.music;
  if (typeof m === 'string') musWant = m;
  if (musReady && musWant) musEl(musWant);
  for (const n in MUS) {
    const a = MUS[n], target = n === musWant && musReady ? SET.music / 10 * 0.8 * musDuck : 0;
    a.volume = clamp(a.volume + clamp(target - a.volume, -0.03, 0.03), 0, 1);
    if (target > 0) { if (a.paused && !(a.retry > frame)) { const r = a.play(); if (r && r.catch) r.catch(() => { a.retry = frame + 60; }); } }
    else if (!a.paused && a.volume === 0) a.pause();
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) for (const n in MUS) MUS[n].pause(); });

// ---------- ввод
const keys = { left: 0, right: 0, jump: 0, down: 0 };
let jumpPressed = false, anyPressed = false, click = null;
const codes = new Set(); // коды клавиш, нажатые за этот тик (для меню и мини-игр)
const KM = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump', ArrowDown: 'down', KeyS: 'down' };
addEventListener('keydown', e => {
  const k = KM[e.code];
  codes.add(e.code);
  setPad(false);
  if (e.code === 'KeyF' && !e.repeat) toggleFs();
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp') e.preventDefault();
  if (k) { e.preventDefault(); if (k === 'jump' && !keys.jump) jumpPressed = true; keys[k] = 1; }
  if (!e.repeat && (e.code === 'Enter' || e.code === 'Space' || k === 'jump')) anyPressed = true;
  initAudio();
});
addEventListener('keyup', e => { const k = KM[e.code]; if (k) keys[k] = 0; });
addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect();
  click = { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH };
  anyPressed = true; initAudio();
});
const pad = document.getElementById('pad');
// Экранные кнопки нужны только там, где основной способ ввода — палец. На ПК (в том числе на ноутбуке с
// тачскрином) их нет: они появятся, только если реально коснуться экрана, и пропадут от клавиатуры или мыши.
const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const setPad = on => { if (pad.classList.contains('on') === on) return; pad.classList.toggle('on', on); if (!on) padRelease(); };
pad.classList.toggle('on', window.matchMedia ? coarse : 'ontouchstart' in window);
// Экранные кнопки: один обработчик на всё окно. Касание привязано к pointerId, палец можно
// вести с кнопки на кнопку, а зона нажатия у кнопки шире видимой (у прыжка — заметно шире).
const padBtns = [...pad.querySelectorAll('button')].map(b => ({ b, k: b.dataset.k, grow: b.dataset.k === 'jump' ? 40 : 18, held: false }));
const padPtr = new Map(); // pointerId -> нажатая кнопка (null, если палец ушёл с кнопок)
const padActive = () => pad.classList.contains('on') && pad.dataset.mode !== 'none';
function padHit(x, y) {
  let best = null, bs = 1e9;
  for (const o of padBtns) {
    const r = o.b.getBoundingClientRect(); if (!r.width) continue;
    const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom), d = Math.hypot(dx, dy);
    if (d > o.grow) continue;
    const score = d - (o.k === 'jump' ? 10 : 0); // в спорной зоне между кнопками выигрывает прыжок
    if (score < bs) { bs = score; best = o.k; }
  }
  return best;
}
function padSync() {
  const on = new Set(padPtr.values());
  for (const o of padBtns) {
    const h = on.has(o.k); if (h === o.held) continue;
    o.held = h; o.b.classList.toggle('act', h); keys[o.k] = h ? 1 : 0;
    if (h) { if (o.k === 'jump') { jumpPressed = true; anyPressed = true; } initAudio(); }
  }
}
function padRelease() { padPtr.clear(); padSync(); }
addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') setPad(true); else if (e.pointerType === 'mouse' && !coarse) setPad(false);
  if (!padActive() || (e.target.closest && e.target.closest('#fs'))) return;
  const k = padHit(e.clientX, e.clientY); if (!k) return;
  e.preventDefault(); e.stopPropagation(); padPtr.set(e.pointerId, k); padSync();
}, true);
addEventListener('pointermove', e => {
  if (!padPtr.has(e.pointerId)) return;
  e.preventDefault(); padPtr.set(e.pointerId, padHit(e.clientX, e.clientY)); padSync();
}, true);
for (const n of ['pointerup', 'pointercancel']) addEventListener(n, e => { if (padPtr.delete(e.pointerId)) padSync(); }, true);
addEventListener('blur', padRelease);
document.addEventListener('visibilitychange', padRelease);

// ---------- полный экран
const fsBtn = document.getElementById('fs'), fsRoot = document.documentElement;
const fsReq = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
if (!fsReq) fsBtn.hidden = true; // например, iPhone Safari не умеет
function toggleFs() {
  try {
    if (fsOn()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      try { screen.orientation.unlock(); } catch (e) { }
    } else {
      const lock = () => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } };
      const r = fsReq.call(fsRoot); if (r && r.then) r.then(lock).catch(() => { }); else lock();
    }
  } catch (e) { }
}
fsBtn.addEventListener('click', e => { e.preventDefault(); toggleFs(); fsBtn.blur(); initAudio(); });
for (const n of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(n, () => { fsBtn.classList.toggle('on', fsOn()); padRelease(); });

// ---------- сохранение
// Хардкор (HC): одно сердце, ни одной флешки, ни одного чекпоинта — упал в яму значит умер, смерть возвращает на 1 уровень,
// прогресс обычной игры не трогается. Запоминается только рекорд (самый дальний уровень) и факт прохождения.
let HC = false;
const hcBest = () => { try { return clamp(parseInt(localStorage.getItem('holos_hc')) || 0, 0, LAST); } catch (e) { return 0; } };
const hcDone = () => { try { return localStorage.getItem('holos_hc_win') === '1'; } catch (e) { return false; } };
function save(n) {
  try { if (HC) { if (n > hcBest()) localStorage.setItem('holos_hc', String(n)); } else localStorage.setItem('holos_lvl', String(n)); } catch (e) { }
}
function load() { try { return clamp(parseInt(localStorage.getItem('holos_lvl')) || 1, 1, LAST); } catch (e) { return 1; } }

// ---------- зоны и сюжет
const ZONES = [
  { name: 'ОДЕССА', sky: ['#5bb8f0', '#c8ebff'], far: '#8fb3cc', near: '#6a8aa3', win: '#ffe9a0', gTop: '#5fae4a', gBody: '#7a5a3c', gDark: '#5e4630' },
  { name: 'ГАЗА', sky: ['#f0a85a', '#f9e0a8'], far: '#dcae78', near: '#b98856', win: '#7a5230', gTop: '#ecd596', gBody: '#c9a865', gDark: '#a98a50' },
  { name: 'ИЗРАИЛЬ', sky: ['#7cc6ee', '#eef7fa'], far: '#ddd6c2', near: '#beb59c', win: '#6d8fa8', gTop: '#f3eedd', gBody: '#cfc6ac', gDark: '#aea58c' },
  { name: 'МЕТА-ПРОСТРАНСТВО', sky: ['#07000f', '#1d0038'], gTop: '#19ff9c', gBody: '#16122a', gDark: '#241d44' },
  { name: 'СОЛЕВАЯ ШАХТА', sky: ['#120f18', '#2a2238'], gTop: '#f7f1fa', gBody: '#b9aec4', gDark: '#8d829a' },
  { name: 'СИНАГОГА', sky: ['#1c1430', '#5a4358'], gTop: '#e6d3a0', gBody: '#8a6a4c', gDark: '#6b5038' },
  { name: 'СЕРВЕРА VALVE', sky: ['#080b11', '#182030'], gTop: '#f08a1c', gBody: '#2b3140', gDark: '#3d4558' },
  { name: 'ЗАКУЛИСЬЕ', sky: ['#1a1412', '#3b2c24'], gTop: '#d2a974', gBody: '#6b4a30', gDark: '#4a3220' },
];
// 1–3 Одесса, 4–6 Газа, 7–9 Израиль, 10 Синагога, 11–14 серверы Valve, 15–19 закулисье, 20 мета-пространство
const zoneOf = n => n === SALT ? 4 : n <= 3 ? 0 : n <= 6 ? 1 : n <= 9 ? 2 : n === 10 ? 5 : n <= 14 ? 6 : n <= 19 ? 7 : 3;
const MELVI = 'мевли';
const INTRO = {
  1: ['ПРЕДЫСТОРИЯ\n\nМрДрНос случайно запушил новую обнову для ВОТВ прямо в ядро Линукс. У всех, кто скачал ядро 8-й версии, Линукс сломался.',
    'ОДЕССА\n\nХолос решил сбежать из города и навалять Носатому.\n\nНа пути — бутылки Никиты Яроша и Дынекс. Дынексу не попадайся: порвёт туза.'],
  4: ['ГАЗА\n\nХолос доплыл, но перепутал карты и вместо Израиля попал в Газу.\n\nМолодец, Холос.'],
  7: ['ИЗРАИЛЬ\n\nПаспорт сработал. Холос в Израиле.\n\nХолос ищет МрДрНоса. ' + MELVI + ' сказал, что знает дорогу в мета-пространство.'],
  10: ['СИНАГОГА\n\nДорога в мета-пространство ведёт через синагогу.\n\nТут тихо, красиво и подозрительно много врагов.'],
  11: ['СЕРВЕРА VALVE\n\nПод синагогой — серверные Valve. Гудит так, будто там майнят.\n\nФейл2бан и Анонимус уже в курсе, что ты пришёл.'],
  15: ['ЗАКУЛИСЬЕ\n\nХолос проломил декорации и оказался за кулисами самой игры.\n\nЗдесь сидят те, кого в игру не пускали.'],
  20: ['МЕТА-ПРОСТРАНСТВО\n\nВот он. Носатый.\n\nХватай царь-флешки и ставь ему нормальный дистрибутив.'],
  [SALT]: ['СОЛЕВАЯ ШАХТА\n\nТут пахнет солью. И медведем.\n\nОчень большим медведем.'],
};
const MINI_INTRO = {
  4: ['МОРЕ\n\nХолос решил добраться до Израиля вплавь.\n\nПодводные мины и береговая охрана против.',
    'Плыви вправо.\n\n← → ↑ ↓ — грести.\n\nМины взрываются, а береговая охрана бросает глубинные бомбы, если ты рядом с катером.'],
  7: ['ГРАНИЦА ИЗРАИЛЯ\n\nБез паспорта не пускают. Придётся подделать.\n\nНа проверке сидит ' + MELVI + '.',
    'Сверь правила слева с паспортом справа и поправь всё, что не так: тыкай в строку или жми ← →, ↑ ↓.\n\nЕсли ' + MELVI + ' заметит подделку, Холосу сделают обрезание. Игра окончена.'],
};
const END_TEXT = ['Нос повержен.\n\nХолос узнаёт всю правду о СИСТЕМ-Д СЛЕЖКЕ и проекте РЕДХАТ.',
  'Не выдержав запретных знаний, Холос выходит на новый план бытия...'];

// ---------- состояние
let frame = 0, scene = null, L = null, P = null, shots = [], parts = [], safe = null, shake = 0;

// ---------- построение уровней
const SIZES = { y: [14, 16], y2: [14, 16], d: [16, 18], f: [8, 12], m: [14, 18], g: [16, 26],
  fat: [16, 18], ari: [16, 18], bar: [22, 20], alt: [14, 18], poc: [16, 20], tel: [10, 12], ban: [24, 12], ano: [40, 16], duo: [12, 18],
  mak: [16, 24], mk: [16, 24], pol: [12, 18], ros: [22, 15], laa: [16, 18], vlad: [16, 22] };
// имена над особыми врагами (показываются по-русски); телефонных мошенников больше нет — теперь это Шайтаны
// (запасной вариант игры слов: 'МОШОННИКИ')
const NAMES = { y2: 'ЯРОШ С КУБАМИ', fat: 'ДиаблоФАТ', ari: 'Арирали', bar: 'Баратрум', alt: 'Сэм Альтман', poc: 'Опасный Поцык', tel: 'ШАЙТАНЫ', ban: 'Фейл2бан', ano: 'Анонимус',
  mak: 'Махито', ros: 'Ростик', laa: 'лааадно', vlad: 'Влад' };
// какие новые враги встречаются на уровне (первый раз каждый гарантированно появляется)
const POOL = {
  2: ['poc'], 3: ['poc'],
  4: ['tel'], 5: ['tel', 'bar'], 6: ['tel', 'bar', 'poc'],
  7: ['ari'], 8: ['ari', 'fat'], 9: ['ari', 'fat', 'bar'],
  10: ['fat', 'ari', 'poc'],
  11: ['ban', 'tel', 'mak'], 12: ['ban', 'ano', 'ros'], 13: ['ban', 'ano', 'bar', 'laa'], 14: ['ban', 'ano', 'fat', 'tel', 'vlad'],
  15: ['alt', 'duo', 'laa'], 16: ['alt', 'duo', 'ari', 'vlad'], 17: ['alt', 'duo', 'ano', 'mak'], 18: ['alt', 'duo', 'ban', 'bar', 'ros', 'vlad'], 19: ['alt', 'duo', 'fat', 'tel', 'ari', 'mak', 'laa'],
};
function ent(t, x, y, extra) {
  const size = SIZES[t];
  return Object.assign({ t, x, y, w: size[0], h: size[1], name: NAMES[t] }, extra);
}
function buildLevel(n) {
  const R = rng(1000 + n * 77), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  // начиная с Газы часть Ярошей — «башеры» с жёлтыми кубами (выбор не трогает генератор случайных чисел, поэтому раскладка уровней прежняя)
  const yk = () => n >= 4 && hash(x, n + 5) < 0.4 ? 'y2' : 'y';
  const dn = Math.min(n, 12), pool = POOL[n] || [];   // сложность растёт до 12-го уровня, дальше держится
  const W = 80 + dn * 9;
  const g = [...Array(H)].map(() => Array(W).fill('.'));
  const ents = [], plats = [];
  let secret = null, gh = 3, x = 0, sinceFlash = 0, secretDone = false, spCount = 0;
  const col = (cx, h) => { for (let y = H - h; y < H; y++) g[y][cx] = '#'; };
  const flat = len => { for (let i = 0; i < len && x < W; i++) col(x++, gh); };
  const top = () => (H - gh) * T;
  // полосы вероятностей: яма, ступенька, Ярош, Дынекс, шипы, особый враг, ровное место
  const wt = [0.2, 0.15, 0.14 + dn * 0.012, dn >= 2 ? 0.07 + dn * 0.012 : 0, dn >= 3 ? 0.1 : 0, pool.length ? 0.17 : 0];
  const wsum = wt.reduce((a, b) => a + b, 0), tot = wsum + Math.max(0.1, 1 - wsum);
  const cum = []; wt.reduce((a, b, i) => (cum[i] = a + b), 0);
  const [pGap, pStep, pYar, pDyn, pSpk, pSp] = cum;
  const special = () => {
    const t = spCount < pool.length ? pool[spCount] : pool[ri(0, pool.length - 1)];
    spCount++;
    if (t === 'fat') { flat(2); ents.push(ent('fat', x * T, top() - 18, { cd: 80 })); flat(ri(4, 5)); }
    else if (t === 'ari') { flat(2); ents.push(ent('ari', x * T, top() - 18, { st: 0, cd: 50, vx: 0, vy: 0, face: -1 })); flat(ri(6, 7)); }
    else if (t === 'bar') { flat(2); const a = x; flat(ri(8, 10)); ents.push(ent('bar', (a + 4) * T, top() - 20, { x0: a * T, x1: x * T - 22, dir: -1, st: 0, cd: 40 })); flat(2); }
    else if (t === 'alt') { flat(2); const a = x; flat(ri(8, 10)); ents.push(ent('alt', (a + 4) * T, top() - 18, { x0: a * T + 2, x1: x * T - 16, cd: 100 })); flat(2); }
    else if (t === 'poc') { flat(2); ents.push(ent('poc', x * T, top() - 20, { cd: 60, st: 0, tm: 0, met: false, talk: 0 })); flat(ri(4, 5)); }
    else if (t === 'tel') {
      flat(3);
      for (let i = 0; i < 2; i++) { const ex = (x + i * 2) * T, ey = top() - 62 - i * 16; ents.push(ent('tel', ex, ey, { hx: ex, hy: ey, ph: i * 2 })); }
      flat(ri(6, 8));
    }
    else if (t === 'ban') {
      flat(2); const a = x; flat(ri(7, 9)); const w = (x - a) * T;
      ents.push(ent('ban', a * T, top() - 12, { w, gy: top(), hx: a * T + w / 2 - 12, hy: top() - 90, st: 0, bt: 0, vy: 0, cd: 30 })); flat(2);
    }
    else if (t === 'ano') { flat(2); const a = x; flat(ri(9, 11)); ents.push(ent('ano', (a + 3) * T, top() - 16, { x0: a * T, x1: x * T - 40, dir: -1, gy: top(), oy: 0, hv: 0, cd: 50 })); flat(2); }
    else if (t === 'mak') { flat(2); ents.push(ent('mak', x * T, top() - 24, { cd: 70, st: 0, tm: 0, anim: 0 })); flat(ri(6, 7)); }
    else if (t === 'laa') { flat(2); ents.push(ent('laa', x * T, top() - 18, { cd: 70, anim: 0 })); flat(ri(5, 6)); }
    else if (t === 'vlad') { flat(2); ents.push(ent('vlad', x * T, top() - 22, { cd: 80, n: 0, bt: 0, face: -1 })); flat(ri(5, 6)); }
    else if (t === 'ros') {
      flat(2); const a = x; flat(ri(10, 12));
      ents.push(ent('ros', (a + 4) * T, top() - 15, { x0: a * T, x1: x * T - 22, dir: -1, vx: 0, vy: 0, ground: true, air: false, cd: 40, jx: 0.6, mcd: 90, mk: null }));
      flat(2);
    }
    else if (t === 'duo') { flat(2); const a = x; flat(ri(8, 10)); ents.push(ent('duo', a * T, top() - 18, { w: (x - a) * T, ph: R() * 6, gy: top(), ax: a * T, bx: a * T })); flat(2); }
  };
  flat(9);
  if (n === 1) ents.push(ent('m', 5 * T, top() - 18, { say: 'Здарова, Холос. Стрелки — бежать, вверх или пробел — прыжок. Бутылки бьют, флешки лечат. Дынекса обходи: порвёт туза.' }));
  if (n === 10) ents.push(ent('m', 5 * T, top() - 18, { say: 'Добро пожаловать в синагогу. Говорят, под полом гудят серверы Valve. Просто иди дальше и не трогай свечи.' }));
  while (x < W - 14) {
    const r = R() * tot, x0 = x;
    // особый враг «по расписанию»: если отстаём с показом новых врагов, ставим принудительно
    const due = pool.length && spCount < pool.length && x > W * (0.2 + 0.55 * spCount / pool.length);
    if (n === 8 && !secretDone && x > W * 0.55) {
      flat(5);
      ents.push(ent('m', (x - 4) * T, top() - 18, { say: 'Псс. Чуешь? Солью тянет... вон из той ямы. Я бы туда не прыгал. Или прыгал.' }));
      const gs = x; x += 3; secret = { x0: gs * T, x1: x * T };
      flat(4); secretDone = true; continue;
    }
    if (due) special();
    else if (r < pGap) {
      if (n >= 4 && R() < 0.45) {
        const len = ri(6, 7);
        plats.push({ x: x * T + 2, y: top(), w: 32, h: 6, a: x * T + 2, b: (x + len) * T - 34, vx: 0.7 + dn * 0.03 });
        x += len;
      } else x += ri(2, 3);
      flat(3);
    } else if (r < pStep) {
      gh = clamp(gh + (R() < 0.5 ? -1 : 1) * ri(1, 2), 1, 5); flat(3);
    } else if (r < pYar) {
      flat(2);
      if (R() < 0.4) {
        g[H - gh - 3][x] = '='; g[H - gh - 3][x + 1] = '=';
        ents.push(ent(yk(), x * T + 9, (H - gh - 3) * T - 16, { cd: 60 }));
      } else ents.push(ent(yk(), x * T + 1, top() - 16, { cd: 60 }));
      flat(ri(4, 5));
    } else if (r < pDyn) {
      flat(2); const a = x; flat(ri(7, 9));
      ents.push(ent('d', (a + 4) * T, top() - 18, { x0: a * T, x1: x * T - 16, dir: -1 }));
      flat(2);
    } else if (r < pSpk) {
      flat(2);
      const k = ri(1, 2);
      for (let i = 0; i < k; i++) { col(x, gh); g[H - gh - 1][x] = '^'; x++; }
      flat(2);
    } else if (r < pSp) special();
    else flat(ri(3, 6));
    sinceFlash += x - x0;
    if (sinceFlash > 26 + Math.min(dn, 8) * 2 && g[H - gh][x - 2] === '#' && g[H - gh - 1][x - 2] === '.') {
      if (!HC) ents.push(ent('f', (x - 2) * T + 4, top() - 30));
      sinceFlash = 0;
    }
  }
  while (x < W) col(x++, gh);
  if (n === 9) ents.push(ent('m', (W - 8) * T, top() - 18, { say: 'Нос сидит в мета-пространстве. Дорога туда — через синагогу и серваки Valve. Прыгай в портал, закину.' }));
  if (n === 14) ents.push(ent('m', (W - 8) * T, top() - 18, { say: 'Серваки Valve позади. Дальше закулисье самой игры. На декорации не смотри, там всё нарисовано.' }));
  if (n === 19) ents.push(ent('m', (W - 8) * T, top() - 18, { say: 'Последний портал. За ним мета-пространство и Нос. Удачи, Холос. Одаа.' }));
  ents.push(ent('g', (W - 4) * T, top() - 26));
  return { n, W, g, ents, plats, secret, zone: zoneOf(n), t: 0, cam: 0, cdBase: 120 - dn * 6, spawnY: (H - 3) * T - 14, banner: [`УРОВЕНЬ ${n}: ${ZONES[zoneOf(n)].name}`, 130], pops: [] };
}
function buildArena(n) {
  const W = 20, g = [...Array(H)].map(() => Array(W).fill('.'));
  for (let x = 0; x < W; x++) { g[H - 1][x] = '#'; g[H - 2][x] = '#'; }
  const groundY = (H - 2) * T, py = 6 * T;
  const L = { n, W, g, ents: [], plats: [], secret: null, zone: zoneOf(n), t: 0, cam: 0, cdBase: 100, spawnY: groundY - 14, groundY, pops: [] };
  if (n === LAST) {
    for (const x of [2, 3, 4, 5, 14, 15, 16, 17]) g[6][x] = '=';
    L.spots = [[56, py - 16], [248, py - 16], [156, groundY - 18], [20, groundY - 18], [290, groundY - 18]];
    L.boss = { kind: 'nos', x: 142, y: 14, w: 36, h: 40, hp: 9, max: 9, t: 0, ph: 0, cdA: 120, cdB: 200, cdF: 60, flash: 0, dead: 0, warn: null };
    L.banner = ['БОСС: МРДРНОС', 150];
  } else {
    for (const x of [1, 2, 3, 4, 8, 9, 10, 11]) g[6][x] = '=';
    L.spots = [[40, py - 16], [152, py - 16], [100, groundY - 18], [12, groundY - 18]];
    L.boss = { kind: 'bear', x: 232, y: groundY - 96, w: 80, h: 96, t: 0, hits: 0, cdW: 160, cdC: 100, cdF: 80, inhale: 0, lift: 0, say: 0 };
    L.banner = ['СЕКРЕТНЫЙ БОСС: ВЕДМЕДИК БО', 170];
  }
  return L;
}
function startLevel(n) {
  if (n <= LAST) save(n);
  L = n === LAST || n === SALT ? buildArena(n) : buildLevel(n);
  const hp = HC ? 1 : 3;
  P = { x: 24, y: L.spawnY, w: 8, h: 13, vx: 0, vy: 0, hp, max: hp, face: 1, inv: 0, ground: false, coy: 0, buf: 0, on: null, stop: 0, bash: 0, grace: 0 };
  safe = { x: P.x, y: P.y }; shots = []; parts = []; shake = 0;
  scene = playScene;
}
// после смерти: обычная игра — тот же уровень заново, хардкор — весь забег с первого уровня
const respawn = n => startLevel(HC ? 1 : n);
function gotoLevel(n) {
  if (INTRO[n]) scene = cardScene(INTRO[n], () => startLevel(n), zoneOf(n)); else startLevel(n);
}
// переход на следующий уровень после портала: между 3 и 4, 6 и 7 — мини-игры
const MINI = { 4: swimScene, 7: passportScene };
function advance(n) {
  if (MINI[n]) scene = cardScene(MINI_INTRO[n], () => { scene = MINI[n](() => gotoLevel(n)); }, n === 4 ? 0 : 2);
  else gotoLevel(n);
}

// ---------- физика
function solid(tx, ty) {
  if (tx < 0 || tx >= L.W) return true;
  if (ty < 0 || ty >= H) return false;
  const c = L.g[ty][tx]; return c === '#' || c === '=';
}
const tileAt = (px, py) => solid(Math.floor(px / T), Math.floor(py / T));
function collides(o) {
  const x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w) / T), y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true;
  return false;
}
function moveX(o, dx) {
  o.x += dx;
  if (collides(o)) {
    if (dx > 0) o.x = Math.floor((o.x + o.w) / T) * T - o.w - 0.01; else o.x = Math.floor(o.x / T) * T + T;
    o.vx = 0;
  }
}
function moveY(o, dy) {
  o.y += dy;
  if (collides(o)) {
    if (dy > 0) { o.y = Math.floor((o.y + o.h) / T) * T - o.h - 0.01; o.ground = true; } else o.y = Math.floor(o.y / T) * T + T;
    o.vy = 0;
  }
}
const ov = (a, b, i = 0) => a.x < b.x + b.w - i && a.x + a.w > b.x + i && a.y < b.y + b.h - i && a.y + a.h > b.y + i;

function burst(x, y, col, n = 6) {
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5, life: 20 + Math.random() * 15, col });
}
function hurt(n, c) {
  if (P.inv > 0 || P.stop > 0 || scene !== playScene) return;   // пока Почик держит игрока на разговоре, больше никто не бьёт
  P.hp -= n; P.inv = 90; P.vy = -3.5; shake = 6; sfx(180, 0.2, 'sawtooth', -100, 0.07);
  if (P.hp <= 0) die(c);
}
// «баш» (как у Skull Basher): куб Яроша с шансом 17% оглушает игрока на 0,5 с — управление отключено, бить по нему продолжают
const BASH_CHANCE = 0.17, BASH_TIME = 30;
function bash() {
  P.bash = BASH_TIME; P.vx = 0; shake = Math.max(shake, 8);
  L.pops.push({ x: P.x - 6, y: P.y - 16, s: 'БАШ!', t: 40 });
  sfx(95, 0.3, 'sawtooth', -40, 0.09); sfx(1400, 0.12, 'square', -900, 0.05);
}
function die(c) {
  if (scene !== playScene) return;
  sfx(300, 0.5, 'sawtooth', -260, 0.08);
  scene = L.custom ? L.custom.die(c) : L.n === SALT ? crystalScene() : deathScene(L.n, c);
}
function onFlash(e) {
  sfx(900, 0.12, 'square', 600);
  if (L.boss) shots.push({ k: 'usb', x: e.x, y: e.y, sx: e.x, sy: e.y, t: 0, w: 8, h: 12, vx: 0, vy: 0 });
  else { P.hp = Math.min(P.max, P.hp + 1); burst(e.x + 4, e.y + 6, '#2ecc71', 10); L.pops.push({ x: e.x - 4, y: e.y - 8, s: '+1', t: 40 }); }
}
function hitBoss() {
  const b = L.boss;
  if (b.kind === 'bear') { b.hits++; b.say = 100; L.pops.push({ x: b.x + 20, y: b.y + 10, s: '0', t: 50 }); sfx(110, 0.25, 'sawtooth'); return; }
  if (b.dead) return;
  b.hp--; b.flash = 14; shake = 5; sfx(220, 0.25, 'sawtooth', -120, 0.08); burst(b.x + b.w / 2, b.y + b.h / 2, '#19ff9c', 12);
  if (b.hp <= 0) { b.dead = 1; return; }
  if (b.hp === 6 || b.hp === 3) { P.hp = Math.min(P.max, P.hp + 1); L.banner = [b.hp === 6 ? 'ФАЗА 2: KERNEL PANIC' : 'ФАЗА 3: SEGFAULT', 130]; }
}
function spawnFlash(b) {
  if (L.ents.some(e => e.t === 'f' && !e.dead) || shots.some(s => s.k === 'usb')) return;
  if (--b.cdF > 0) return;
  b.cdF = 140;
  const far = L.spots.filter(s => Math.abs(s[0] - P.x) > 50);
  const s = far[Math.floor(Math.random() * far.length)] || L.spots[0];
  L.ents.push(ent('f', s[0], s[1]));
}
function updNos(b) {
  b.t++;
  if (b.dead) {
    b.dead++; shots = [];
    if (b.dead % 5 === 0) { burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, b.dead % 10 ? '#f08a1c' : '#19ff9c', 6); sfx(100 + Math.random() * 200, 0.1, 'sawtooth'); }
    if (b.dead > 130) scene = cardScene(END_TEXT, () => { scene = endingScene(); }, 3);
    return;
  }
  const ph = b.hp > 6 ? 1 : b.hp > 3 ? 2 : 3;
  b.ph += 0.012 * [0, 1, 1.3, 1.6][ph];
  b.x = 160 - b.w / 2 + Math.sin(b.ph) * 118;
  b.y = 14 + Math.sin(b.t * 0.05) * 6 + (ph === 3 ? Math.pow(Math.max(0, Math.sin(b.t * 0.025)), 6) * 88 : 0);
  if (b.flash) b.flash--;
  if (--b.cdA <= 0) {
    b.cdA = [0, 95, 75, 58][ph];
    const cx = b.x + b.w / 2, cy = b.y + b.h, dx = P.x - cx, dy = P.y - cy, d = Math.hypot(dx, dy) || 1;
    shots.push({ k: 'glitch', x: cx, y: cy, vx: dx / d * 2.1, vy: dy / d * 2.1, w: 6, h: 6 });
    sfx(500, 0.08, 'square', -200, 0.03);
  }
  if (ph >= 2 && !b.warn && --b.cdB <= 0) { b.cdB = ph === 2 ? 210 : 160; b.warn = { side: Math.random() < 0.5 ? -1 : 1, t: 55 }; sfx(700, 0.3, 'square', 0, 0.03); }
  if (b.warn && --b.warn.t <= 0) {
    const s = b.warn.side;
    shots.push({ k: 'sweep', x: s < 0 ? -12 : VW + 2, y: L.groundY - 10, vx: -s * 3, vy: 0, w: 10, h: 10 });
    b.warn = null;
  }
  if (ov(P, b, 5)) hurt(1, 'nos');
  spawnFlash(b);
}
function updBear(b) {
  b.t++;
  if (!b.inhale && (b.t > 2400 || b.hits >= 5)) { b.inhale = 1; L.banner = ['ВЕДМЕДИК БО ДЕЛАЕТ ВДОХ', 240]; shots = []; sfx(60, 1.2, 'sawtooth', 200, 0.08); }
  if (b.inhale) {
    b.inhale++;
    moveX(P, Math.min(4.5, 0.6 + b.inhale * 0.025));
    if (frame % 3 === 0) parts.push({ x: Math.random() * 220, y: 30 + Math.random() * 110, vx: 4, vy: 0, life: 30, col: '#f7f1fa' });
    if (ov(P, b, 10)) die('bear');
    return;
  }
  const rate = Math.max(0.5, 1 - b.t / 3000);
  if (--b.cdW <= 0) { b.cdW = 150 * rate + 40; b.lift = 30; }
  if (b.lift && --b.lift === 0) { shots.push({ k: 'wave', x: b.x - 12, y: L.groundY - 9, vx: -2.6, vy: 0, w: 10, h: 9 }); sfx(80, 0.3, 'sawtooth', -40, 0.08); shake = 8; }
  if (--b.cdC <= 0) { b.cdC = 80 * rate + 20; shots.push({ k: 'crystal', x: clamp(P.x + Math.random() * 30 - 15, 4, 220), y: -12, vx: 0, vy: 2, g: 0.03, w: 7, h: 11 }); }
  if (b.say) b.say--;
  if (P.x + P.w > b.x + 12) P.x = b.x + 12 - P.w;
  if (ov(P, b, 10)) hurt(1, 'bear');
  spawnFlash(b);
}

// ---------- новые враги: поведение (dx, dy — вектор от врага к игроку)
// Где окажется игрок через n кадров, если продолжит двигаться так же: прогон его физики на копии
// (текущая скорость и нажатые клавиши, прыжок доигрывается до приземления, стены и обрывы учитываются).
function predictP(n) {
  const q = { x: P.x, y: P.y, w: P.w, h: P.h, vx: P.vx, vy: P.vy, ground: false }, ax = keys.right - keys.left;
  for (let i = 0; i < n; i++) {
    q.vx += (ax * 2 - q.vx) * 0.3; if (Math.abs(q.vx) < 0.05) q.vx = 0;
    if (!keys.jump && q.vy < -2.5) q.vy = -2.5;
    q.vy = Math.min(7, q.vy + 0.35); q.ground = false;
    moveX(q, q.vx); moveY(q, q.vy);
    if (q.y > H * T) break; // упал в яму — дальше считать нечего
  }
  return q;
}
// Скорости для броска под действием тяжести g из точки (sx, sy) — центра снаряда — по игроку с упреждением.
// Время полёта зависит от расстояния (≈ speed пикселей за кадр, в пределах tmin..tmax), а цель — это то место,
// где игрок будет именно через это время, поэтому цель и время подбираются итерациями.
function lobAim(sx, sy, g, speed, tmin, tmax) {
  const pc = () => [P.x + P.w / 2, P.y + P.h / 2];
  let n = clamp(Math.round(Math.abs(pc()[0] - sx) / speed), tmin, tmax), q;
  for (let i = 0; i < 4; i++) {
    q = predictP(n);
    n = clamp(Math.round(Math.hypot(q.x + q.w / 2 - sx, q.y + q.h / 2 - sy) / speed), tmin, tmax);
  }
  q = predictP(n);
  // положение за n кадров при шаге «сначала скорость, потом сдвиг»: y = y0 + n·vy0 + g·n(n+1)/2
  return { vx: (q.x + q.w / 2 - sx) / n, vy: (q.y + q.h / 2 - sy - g * n * (n + 1) / 2) / n, n };
}
const YELL = ['РОСТИК!!!', 'ТЫ ЧЁ ТВОРИШЬ?!', 'ОПЯТЬ ТЫ!', 'РОСТИК, БЛИН!', 'ИДИ СЮДА!!!', 'Я ЖЕ ГОВОРИЛ!', 'РОСТИИИК!!!'];
const PUTIN_LINES = ['ВЗЯТЬ ЕГО!', 'ЗАДЕРЖАТЬ!', 'ОМОН, ВПЕРЁД!', 'НЕ ЗНАЮ ТАКОГО'];
const NAVY_LINES = ['ДРУЗЬЯ!', 'БЕГИ, ХОЛОС!', 'ПРЯЧЬСЯ!'];
const SCAM_LINES = ['ВАШ СЧЁТ!', 'ВЫ ВЫИГРАЛИ!', 'ГОСУСЛУГИ?', 'СЛУЖБА БЕЗОП.', 'НЕ ВЕШАЙТЕ!'];
// ---------- смертность полицейских Путина: умирают от всего, что может ранить Холоса
function killCop(c, s = 'БАХ!') {
  if (c.dead) return;
  c.dead = true; burst(c.x + 6, c.y + 9, '#4aa3ff', 12); burst(c.x + 6, c.y + 9, '#ffd23e', 6);
  L.pops.push({ x: c.x - 4, y: c.y - 8, s, t: 35 }); sfx(160, 0.2, 'sawtooth', -80, 0.06);
}
// враги, которых нельзя касаться (кроме Путина с Навальным — это его же свита — и самих полицейских)
const COP_RUN = 4.4;
const COP_FOES = new Set(['y', 'y2', 'd', 'fat', 'ari', 'bar', 'alt', 'poc', 'mak', 'ros', 'mk', 'laa', 'vlad', 'tel', 'ano']);
// шипы под ногами, тело врага, молоток Фейл2бана, босс
function copDangerous(c) {
  const ty = Math.floor((c.y + c.h - 2) / T);
  if (ty >= 0 && ty < H && c.y + c.h > ty * T + 7) {
    for (let tx = Math.floor(c.x / T); tx <= Math.floor((c.x + c.w) / T); tx++) if (tx >= 0 && tx < L.W && L.g[ty][tx] === '^') return true;
  }
  for (const o of L.ents) {
    if (o.dead) continue;
    if (COP_FOES.has(o.t) && ov(c, o, 3)) return true;
    if (o.t === 'ban' && (o.st === 3 || o.st === 4) && ov(c, { x: o.hx, y: o.hy, w: 24, h: 12 }, 1)) return true;
  }
  const b = L.boss;
  return !!(b && !b.dead && ov(c, b, b.kind === 'nos' ? 5 : 10));
}
// снаряд задел полицейского: тот погибает. Возвращает true, если кто-то погиб
function copHit(s, i = 0) {
  let hit = false;
  for (const c of L.ents) if (c.t === 'pol' && !c.dead && ov(s, c, i)) { killCop(c); hit = true; }
  return hit;
}
const ENEMY = {
  // DiabloFAT: веер из трёх огненных шаров
  fat(e, dx, dy) {
    e.face = dx < 0 ? -1 : 1; if (e.anim) e.anim--;
    if (Math.abs(dx) < 175 && Math.abs(dy) < 110 && --e.cd <= 0) {
      const a0 = Math.atan2(dy, dx);
      for (const da of [-0.3, 0, 0.3]) shots.push({ k: 'fire', x: e.x + 5, y: e.y + 3, vx: Math.cos(a0 + da) * 1.7, vy: Math.sin(a0 + da) * 1.7, w: 7, h: 7 });
      e.cd = 140; e.anim = 14; sfx(160, 0.25, 'sawtooth', 200, 0.05);
    }
    if (ov(P, e, 3)) hurt(1, 'fat');
  },
  // Ariraly: присела — прыгнула на игрока
  ari(e, dx, dy) {
    e.face = dx < 0 ? -1 : 1;
    if (e.st === 0) {
      if (Math.abs(dx) < 160 && Math.abs(dy) < 80 && --e.cd <= 0) { e.st = 1; e.cd = 26; sfx(500, 0.1, 'triangle', 200, 0.03); }
    } else if (e.st === 1) {
      if (--e.cd <= 0) { e.st = 2; e.vy = -5.4; e.vx = clamp(dx / 30, -2.8, 2.8); sfx(700, 0.15, 'square', 400, 0.04); }
    } else {
      e.vy = Math.min(7, e.vy + 0.35); e.ground = false;
      moveX(e, e.vx); moveY(e, e.vy);
      if (e.ground) { e.st = 0; e.cd = 60 + Math.random() * 40; e.vx = 0; }
      if (e.y > H * T + 30) { e.dead = true; return; }
    }
    if (ov(P, e, 3)) hurt(1, 'ari');
  },
  // Baratrum: «!», разбег с ускорением до стены. Удар о стену пускает по земле ударную волну назад,
  // и, если игрок всё ещё рядом, он тут же разворачивается и бежит обратно (второй рывок). Перепрыгнуть
  // низко не выйдет: во время рывка он подскакивает под игрока, который над ним. Потом недолго отдыхает.
  bar(e, dx, dy) {
    if (e.by === undefined) { e.by = e.y; e.oy = 0; e.hv = 0; e.combo = 0; }
    const near = Math.abs(dx) < 200 && Math.abs(dy) < 56;
    const charge = () => { e.st = 2; e.cd = 150; e.sp = 1.8; };
    if (e.st === 0) {
      e.dir = dx < 0 ? -1 : 1;
      if (near && --e.cd <= 0) { e.st = 1; e.cd = 24; e.combo = 0; sfx(70, 0.5, 'sawtooth', 120, 0.07); }
    } else if (e.st === 1) {
      if (--e.cd <= 0) charge();
    } else if (e.st === 2) {
      e.sp = Math.min(5.2, e.sp + 0.22);
      e.x += e.dir * e.sp;
      if (frame % 3 === 0) burst(e.x + (e.dir < 0 ? 18 : 4), e.by + 20, '#cfeeff', 2);
      // игрок пытается перепрыгнуть — подскок навстречу
      if (e.oy <= 0 && P.vy !== 0 && Math.abs(dx) < 34 && P.y + P.h < e.by + 6) { e.hv = 3.6; e.oy = 0.01; sfx(260, 0.1, 'square', 200, 0.04); }
      if (e.x <= e.x0 || e.x >= e.x1) {
        e.x = clamp(e.x, e.x0, e.x1); shake = Math.max(shake, 7); sfx(60, 0.3, 'sawtooth', -20, 0.08);
        burst(e.x + (e.dir < 0 ? 0 : 22), e.by + 14, '#cfeeff', 10);
        // ударная волна катится по земле от стены обратно через всю дорожку
        shots.push({ k: 'quake', x: e.x + (e.dir < 0 ? 12 : 0), y: e.by + 12, vx: -e.dir * 2.8, vy: 0, w: 10, h: 8, x0: e.x0 - 4, x1: e.x1 + 26 });
        if (e.combo < 1 && near) { e.st = 4; e.cd = 20; e.combo++; e.dir = -e.dir; }
        else { e.st = 3; e.cd = 55; }
      }
      else if (--e.cd <= 0) { e.st = 3; e.cd = 55; }
    } else if (e.st === 4) {          // разворот у стены и сразу второй рывок
      if (--e.cd <= 0) { charge(); sfx(80, 0.3, 'sawtooth', 140, 0.07); }
    } else if (--e.cd <= 0) { e.st = 0; e.cd = 20; }
    if (e.oy > 0) { e.oy += e.hv; e.hv -= 0.3; if (e.oy <= 0) { e.oy = 0; e.hv = 0; } }
    e.y = e.by - e.oy;
    if (ov(P, e, 3)) { if (P.inv <= 0 && e.st === 2) { P.vx = e.dir * 5; } hurt(1, 'bar'); }
  },
  // Sam Altman: два токена по игроку и телепорт по платформе
  alt(e, dx, dy) {
    e.face = dx < 0 ? -1 : 1;
    if (Math.abs(dx) < 200 && Math.abs(dy) < 120) {
      e.cd--;
      if (e.cd === 90 || e.cd === 74) {
        const d = Math.hypot(dx, dy) || 1;
        shots.push({ k: 'tok', x: e.x + 4, y: e.y + 4, vx: dx / d * 2.2, vy: dy / d * 2.2, w: 6, h: 6 });
        sfx(900, 0.06, 'square', 300, 0.03);
      }
      if (e.cd <= 0) {
        burst(e.x + 7, e.y + 9, '#4aa3ff', 8);
        let nx; do { nx = e.x0 + Math.random() * (e.x1 - e.x0); } while (Math.abs(nx - e.x) < 40 && e.x1 - e.x0 > 90);
        e.x = nx; e.cd = 150; burst(e.x + 7, e.y + 9, '#ffffff', 8); sfx(1200, 0.12, 'triangle', -700, 0.04);
      }
    }
    if (ov(P, e, 3)) hurt(1, 'alt');
  },
  // Опасный Поцык: останавливает игрока и требует косарь. Платить нечем (всегда), поэтому в игрока летит
  // огромный пень, и его надо успеть обойти. Остановка — один раз; дальше он просто швыряется пнями.
  poc(e, dx, dy) {
    e.face = dx < 0 ? -1 : 1; if (e.anim) e.anim--;
    if (e.st === 0) {
      if (!e.met && Math.abs(dx) < 110 && Math.abs(dy) < 60) {
        e.met = true; e.st = 1; e.tm = 75; e.talk = 1; P.vx = 0; P.face = dx < 0 ? 1 : -1;
        sfx(180, 0.25, 'square', 0, 0.05); sfx(140, 0.3, 'square', 0, 0.05);
      } else if (e.met && Math.abs(dx) < 170 && Math.abs(dy) < 70 && --e.cd <= 0) { e.st = 2; e.tm = 38; e.talk = 0; sfx(220, 0.2, 'triangle', 200, 0.04); }
    } else if (e.st === 1) {            // «Стой! Гони косарь!»
      P.stop = 2;
      if (--e.tm <= 0) { e.st = 2; e.tm = 60; L.pops.push({ x: P.x - 30, y: P.y - 12, s: 'НЕТ КОСАРЯ', t: 55 }); sfx(120, 0.3, 'sawtooth', -40, 0.05); }
    } else {                            // не платишь? — замах и бросок
      if (e.talk) P.stop = 2;
      if (--e.tm <= 0) {
        const v = lobAim(e.x + 8, e.y - 6, 0.15, 2.2, 52, 80);
        shots.push({ k: 'stump', x: e.x + 8 - 9, y: e.y - 6 - 7, vx: v.vx, vy: v.vy, g: 0.15, w: 18, h: 14, rot: 0 });
        P.stop = 0; e.st = 0; e.cd = 170; e.talk = 0; e.anim = 14; sfx(90, 0.35, 'sawtooth', 120, 0.07);
      }
    }
    if (ov(P, e, 3)) hurt(1, 'poc');
  },
  // Махито: 5000 часов в Доте. Атака — Requiem of Souls от Shadow Fiend: замах, и во все стороны веером
  // разлетаются линии душ, дойдя до края — разворачиваются и летят обратно (бить будут и на возврате)
  mak(e, dx, dy) {
    e.face = dx < 0 ? -1 : 1; if (e.anim) e.anim--; if (e.bub && e.bub.t > 0) e.bub.t--;
    if (e.st === 0) {
      if (Math.abs(dx) < 190 && Math.abs(dy) < 110 && --e.cd <= 0) {
        e.st = 1; e.tm = 55; e.bub = { lines: e.seen ? ['РЕКВИЕМ!'] : ['5000 ЧАСОВ', 'В ДОТЕ 2'], t: 55 }; e.seen = true;
        sfx(110, 0.8, 'sawtooth', 160, 0.07);
      }
    } else if (--e.tm <= 0) {
      const cx = e.x + e.w / 2 - 3, cy = e.y + 8, a0 = Math.random() * 0.5;
      for (let i = 0; i < 12; i++) { const a = a0 + i * Math.PI / 6; shots.push({ k: 'req', x: cx, y: cy, vx: Math.cos(a) * 1.9, vy: Math.sin(a) * 1.9, w: 6, h: 6, t: 0 }); }
      e.st = 0; e.cd = 190; e.anim = 12; shake = Math.max(shake, 4); burst(cx + 3, cy + 3, '#ff3b2a', 10); sfx(70, 0.5, 'sawtooth', 300, 0.09);
    }
    if (ov(P, e, 3)) hurt(1, 'mak');
  },
  // Ростик: бродит и случайно прыгает; после приземления может призвать рядом Махито, который на него орёт
  ros(e, dx, dy) {
    if (e.mk && e.mk.dead) e.mk = null;
    if (e.mcd > 0) e.mcd--;
    const was = e.air;
    if (e.mk && Math.abs(e.mk.x - e.x) < 70 && e.ground) e.dir = e.mk.x < e.x ? 1 : -1;   // убегает от Махито
    else if (e.ground && Math.random() < 0.006) e.dir = -e.dir;
    e.vx = e.dir * (e.ground ? 0.4 : e.jx);
    if (e.x <= e.x0) { e.x = e.x0; e.dir = 1; } if (e.x >= e.x1) { e.x = e.x1; e.dir = -1; }
    if (e.ground && --e.cd <= 0) {   // случайный прыжок: высота, дальность и пауза каждый раз разные
      e.vy = -(3.2 + Math.random() * 2.6); e.jx = 0.5 + Math.random() * 1.1; e.cd = (e.mk ? 18 : 35) + Math.random() * 90;
      if (Math.random() < 0.3) e.dir = -e.dir; sfx(380 + Math.random() * 200, 0.12, 'square', 200, 0.04);
    }
    e.vy = Math.min(7, e.vy + 0.35); e.ground = false;
    moveX(e, e.vx); if (e.x < e.x0) e.x = e.x0; if (e.x > e.x1) e.x = e.x1;
    moveY(e, e.vy); e.air = !e.ground;
    if (was && e.ground && !e.mk && e.mcd <= 0 && Math.abs(dx) < 220 && Math.random() < 0.6) {   // приземлился — призвал Махито
      const side = Math.random() < 0.5 ? -1 : 1; let mx = e.x + side * (34 + Math.random() * 18);
      if (mx < e.x0 - 4 || mx > e.x1 + 22) mx = e.x - side * 40;
      e.mk = ent('mk', mx, e.y + e.h - 24, { vx: 0, vy: 0, ground: true, ros: e, life: 420, yl: 40, ph: 0 });
      L.ents.push(e.mk); e.mcd = 260;
      burst(mx + 8, e.y + 4, '#6fd0e0', 12); sfx(200, 0.4, 'triangle', 700, 0.06);
    }
    if (e.y > H * T + 30) { e.dead = true; return; }
    if (ov(P, e, 4)) hurt(1, 'ros');
  },
  // призванный Махито: идёт к Ростику и всё время на него орёт; игроку тоже лучше не попадаться
  mk(e, dx, dy) {
    const r = e.ros; if (e.bub && e.bub.t > 0) e.bub.t--;
    if (--e.life <= 0 || r.dead || e.y > H * T + 30) { e.dead = true; burst(e.x + 8, e.y + 12, '#6fd0e0', 14); return; }
    const gap = r.x + r.w / 2 - (e.x + e.w / 2), near = Math.abs(gap) < 30;
    e.face = gap < 0 ? -1 : 1; e.vx = near ? 0 : e.face * 0.95;
    e.vy = Math.min(7, e.vy + 0.35); e.ground = false;
    moveX(e, e.vx); moveY(e, e.vy);
    if (--e.yl <= 0) {
      e.yl = 52; e.line = ((e.line === undefined ? Math.floor(Math.random() * YELL.length) : e.line) + 1) % YELL.length;
      e.bub = { lines: [YELL[e.line]], t: 52 }; sfx(150 + Math.random() * 60, 0.18, 'sawtooth', -30, 0.04);
    }
    if (ov(P, e, 3)) hurt(1, 'mk');
  },
  // лааадно: аккуратно целится и пускает «UwU» — розовое слово летит прямо в игрока
  laa(e, dx, dy) {
    e.face = dx < 0 ? -1 : 1; if (e.anim) e.anim--; if (e.bub && e.bub.t > 0) e.bub.t--;
    if (Math.abs(dx) < 190 && Math.abs(dy) < 110 && --e.cd <= 0) {
      const sx = e.x + 8 - 9, sy = e.y + 6, d = Math.hypot(dx, dy) || 1;
      shots.push({ k: 'uwu', x: sx, y: sy, vx: dx / d * 1.7, vy: dy / d * 1.7, w: 18, h: 7, t: 0 });
      e.cd = 95; e.anim = 14; e.bub = { lines: ['лааадно...'], t: 30 };
      sfx(1100, 0.12, 'triangle', 500, 0.05); sfx(1500, 0.1, 'triangle', -300, 0.04);
    }
    if (ov(P, e, 3)) hurt(1, 'laa');
  },
  // Влад: швыряется флагами случайных стран, по два подряд
  vlad(e, dx, dy) {
    e.face = dx < 0 ? -1 : 1; if (e.bub && e.bub.t > 0) e.bub.t--;
    const near = Math.abs(dx) < 190 && Math.abs(dy) < 110;
    if (e.n === 0 && near && --e.cd <= 0) { e.n = 2; e.bt = 0; }
    if (e.n > 0 && --e.bt <= 0) {
      const f = Math.floor(Math.random() * FLAG_NAMES.length), d = Math.hypot(dx, dy) || 1, sp = 1.9;
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.25;
      shots.push({ k: 'flag', f, x: e.x + 2, y: e.y + 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 12, h: 8, t: 0 });
      e.bub = { lines: [FLAG_NAMES[f]], t: 40 }; e.bt = 18; e.n--; if (e.n === 0) e.cd = 100;
      sfx(500 + Math.random() * 500, 0.1, 'square', 150, 0.035);
    }
    if (ov(P, e, 3)) hurt(1, 'vlad');
  },
  // Шайтаны (бывшие телефонные мошенники): медленно преследуют, если подойти близко
  tel(e) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2, pdx = P.x + P.w / 2 - cx, pdy = P.y + P.h / 2 - cy, d = Math.hypot(pdx, pdy) || 1;
    if (d < 140) {
      if (!e.ag) { e.ag = 1; L.pops.push({ x: e.x - 10, y: e.y - 12, s: SCAM_LINES[Math.floor(Math.random() * SCAM_LINES.length)], t: 55 }); }
      e.x += pdx / d * 0.85; e.y += pdy / d * 0.85;
      if (L.t % 24 === 0) sfx(1100 + Math.random() * 200, 0.05, 'square', 0, 0.02);
    } else {
      e.ag = 0;
      const hx = e.hx - e.x, hy = e.hy - e.y, h = Math.hypot(hx, hy);
      if (h > 2) { e.x += hx / h * 0.5; e.y += hy / h * 0.5; }
    }
    e.y += Math.sin(L.t * 0.08 + e.ph) * 0.3;
    if (ov(P, e, 2)) hurt(1, 'tel');
  },
  // Фейл2бан: молоток следует за игроком, фиксируется и бьёт сверху
  ban(e) {
    const px = P.x + P.w / 2, hit = () => ov(P, { x: e.hx, y: e.hy, w: 24, h: 12 }, 1);
    if (e.st === 0) {
      e.hy += (e.gy - 90 - e.hy) * 0.1;
      if (Math.abs(px - (e.x + e.w / 2)) < e.w / 2 + 50 && Math.abs(P.y - e.gy) < 100 && --e.cd <= 0) { e.st = 1; e.bt = 70; }
    } else if (e.st === 1) {
      e.hx = clamp(e.hx + clamp(px - 12 - e.hx, -1.6, 1.6), e.x, e.x + e.w - 24);
      if (--e.bt <= 0) { e.st = 2; e.bt = 24; sfx(700, 0.3, 'square', 0, 0.04); }
    } else if (e.st === 2) {
      if (--e.bt <= 0) { e.st = 3; e.vy = 2; }
    } else if (e.st === 3) {
      e.vy = Math.min(10, e.vy + 1); e.hy += e.vy;
      if (e.hy + 12 >= e.gy) { e.hy = e.gy - 12; e.st = 4; e.bt = 26; shake = Math.max(shake, 7); sfx(60, 0.3, 'sawtooth', -20, 0.09); burst(e.hx + 12, e.gy, '#ff7a6a', 8); }
      if (hit()) hurt(1, 'ban');
    } else if (e.st === 4) {
      if (hit()) hurt(1, 'ban');
      if (--e.bt <= 0) e.st = 5;
    } else {
      e.hy -= 2.5;
      if (e.hy <= e.gy - 80) { e.st = 0; e.cd = 60; }
    }
  },
  // Anonymous: легион из трёх, прыгает в такт
  ano(e, dx, dy) {
    const ag = Math.abs(dx) < 110 && Math.abs(dy) < 50;
    if (ag && Math.abs(dx) > 8) e.dir = dx < 0 ? -1 : 1;
    e.x += e.dir * (ag ? 1.25 : 0.7);
    if (e.x < e.x0) { e.x = e.x0; e.dir = 1; }
    if (e.x > e.x1) { e.x = e.x1; e.dir = -1; }
    if (e.oy <= 0 && e.hv <= 0 && --e.cd <= 0) { e.hv = 3.6; e.oy = 0.01; e.cd = 70; sfx(220, 0.08, 'square', 80, 0.03); }
    if (e.oy > 0) { e.oy += e.hv; e.hv -= 0.3; if (e.oy <= 0) { e.oy = 0; e.hv = 0; } }
    e.y = e.gy - e.h - e.oy;
    if (ov(P, e, 3)) hurt(1, 'ano');
  },
  // Навальный и В. В. Путин. Путин прохаживается у правого края платформы и спускает на игрока полицию:
  // полицейские мчатся быстрее Холоса, но не умеют тормозить и разворачиваться — уворачивайся и убегай, пока он скользит. Навальный у левого края
  // отстреливает полицейских; его пули Холоса не задевают, но касаться самих двоих по-прежнему больно.
  duo(e) {
    if (e.cd === undefined) { e.cd = 50; e.ncd = 20; e.cops = []; e.flash = 0; }
    e.ph += 0.03;
    const span = Math.max(0, e.w - 12), room = Math.min(20, span / 3), y = e.gy - 18;
    e.ax = e.x + room * (0.5 + 0.5 * Math.sin(e.ph));
    e.bx = e.x + span - room * (0.5 + 0.5 * Math.sin(e.ph * 0.7));
    const pdx = P.x + P.w / 2 - (e.bx + 6), pdy = P.y + P.h / 2 - (y + 9);
    e.cops = e.cops.filter(c => !c.dead);
    if (Math.abs(pdx) < 220 && Math.abs(pdy) < 100 && e.cops.length < 2 && --e.cd <= 0) {
      const c = ent('pol', e.bx, y, { vx: 0, vy: 0, ground: true, face: pdx < 0 ? -1 : 1, life: 480, hold: 14 });
      e.cops.push(c); L.ents.push(c); e.cd = 150; e.ncd = Math.max(e.ncd, 48);   // Навальный замечает новенького не сразу: первый рывок — твоя забота
      L.pops.push({ x: e.bx - 20, y: y - 30, s: PUTIN_LINES[Math.floor(Math.random() * PUTIN_LINES.length)], t: 50 });
      burst(e.bx + 6, y + 9, '#4aa3ff', 8); sfx(660, 0.35, 'square', 330, 0.04);
    }
    // Навальный целится в ближайшего полицейского (с упреждением) и стреляет
    const nx = e.ax + 6, ny = y + 8;
    let tgt = null, best = 240;
    for (const c of e.cops) { const dd = Math.abs(c.x + 6 - nx); if (dd < best && Math.abs(c.y - y) < 90) { best = dd; tgt = c; } }
    e.nface = (tgt ? tgt.x : P.x) > e.ax ? 1 : -1;
    if (e.ncd > 0) e.ncd--;
    if (e.flash > 0) e.flash--;
    if (tgt && e.ncd <= 0) {
      const tx = tgt.x + 6 + tgt.vx * best / 4.5, ty = tgt.y + 8, a = Math.atan2(ty - ny, tx - nx) + (Math.random() - 0.5) * 0.3;   // стреляет не всегда метко
      shots.push({ k: 'nbul', x: nx + e.nface * 8, y: ny, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, w: 4, h: 3, t: 0 });
      e.ncd = 50; e.flash = 4; sfx(1300, 0.06, 'square', -900, 0.04);
      if (Math.random() < 0.3) L.pops.push({ x: e.ax - 16, y: y - 22, s: NAVY_LINES[Math.floor(Math.random() * NAVY_LINES.length)], t: 40 });
    }
    // кто именно задел — от этого зависит экран поражения
    if (ov(P, { x: e.ax, y, w: 12, h: 18 }, 3)) hurt(1, 'navy');
    else if (ov(P, { x: e.bx, y, w: 12, h: 18 }, 3)) hurt(1, 'putin');
  },
  // полицейский Путина: разгоняется быстрее Холоса, перепрыгивает стены, в ямы падает; задержав — замирает.
  // Он смертен для всего, что бьёт Холоса: шипы, снаряды, тела врагов и боссов (см. copDangerous / copHit)
  pol(e, dx) {   // COP_RUN — скорость рывка (Холос бежит со скоростью 2)
    if (--e.life <= 0 || e.y > H * T + 30) { e.dead = true; if (e.life <= 0) burst(e.x + 6, e.y + 9, '#4aa3ff', 10); return; }
    // Три фазы: рывок к игроку (быстро, но без руления) → тормозной путь юзом (очень длинный) → медленный разворот
    if (e.mode === undefined) { e.mode = 'run'; e.dir = e.face || 1; e.turn = 0; }
    if (e.hold > 0) { e.hold--; e.vx *= 0.8; e.mode = 'turn'; e.turn = 40; }
    else if (e.mode === 'run') {
      e.vx += (e.dir * COP_RUN - e.vx) * 0.12; e.face = e.dir;
      if (dx * e.dir < -6) e.mode = 'brake';   // проскочил мимо игрока
    } else if (e.mode === 'brake') {
      e.vx *= 0.978; e.face = e.dir;   // почти нет трения: скользит и скользит
      if (Math.abs(e.vx) < 0.25) { e.vx = 0; e.mode = 'turn'; e.turn = 80; }
    } else {   // turn
      e.vx *= 0.8; e.turn--;
      if (e.turn === 40) e.face = -e.dir;   // сначала замер, потом нехотя развернулся
      if (e.turn <= 0) { e.dir = Math.abs(dx) > 4 ? (dx < 0 ? -1 : 1) : -e.dir; e.face = e.dir; e.mode = 'run'; }
    }
    const vx0 = e.vx;
    e.vy = Math.min(7, e.vy + 0.35); e.ground = false;
    moveX(e, e.vx); const blocked = e.vx === 0 && Math.abs(vx0) > 0.5;
    moveY(e, e.vy);
    if (copDangerous(e)) { killCop(e); return; }
    if (blocked && e.mode === 'run' && e.ground) e.vy = -6.2;
    else if (blocked && e.mode === 'brake') { e.mode = 'turn'; e.turn = 80; }
    if (ov(P, e, 3)) {
      const hp = P.hp; hurt(1, 'putin');
      if (scene !== playScene) return;
      if (P.hp < hp) { e.hold = 50; L.pops.push({ x: e.x - 12, y: e.y - 10, s: 'СТОЯТЬ!', t: 40 }); }
    }
  },
};

// ---------- отрисовка мира (общая для игры и конструктора)
// тайлы уровня (g — сетка H×W) в столбцах tx0..tx1; используется в игре и в конструкторе
function drawTiles(g, Z, tx0, tx1) {
  for (let ty = 0; ty < H; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = g[ty][tx], x = tx * T, y = ty * T;
    if (c === '#') {
      ctx.fillStyle = Z.gBody; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = Z.gDark;
      ctx.fillRect(x + Math.floor(hash(tx, ty) * 12), y + 5 + Math.floor(hash(ty, tx) * 8), 3, 2);
      ctx.fillRect(x + Math.floor(hash(tx + 9, ty) * 12), y + 3 + Math.floor(hash(ty + 5, tx) * 10), 2, 2);
      if (ty === 0 || g[ty - 1][tx] !== '#') { ctx.fillStyle = Z.gTop; ctx.fillRect(x, y, T, 4); ctx.fillRect(x + Math.floor(hash(tx, 3) * 10), y + 4, 3, 2); }
    } else if (c === '=') {
      ctx.fillStyle = Z.gDark; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = Z.gBody; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.fillStyle = Z.gTop; ctx.fillRect(x, y, T, 3);
    } else if (c === '^') {
      for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k < 1 ? '#fff' : '#b8b8c4'; ctx.fillRect(x + i * 8 + 3 - k, y + 8 + k * 2, 2 + k * 2, 2);
      }
    }
  }
}
function drawPlat(pl, Z) {
  ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(pl.x), pl.y, pl.w, pl.h);
  ctx.fillStyle = Z.gTop; ctx.fillRect(Math.round(pl.x) + 1, pl.y + 1, pl.w - 2, 2);
  ctx.fillStyle = Z.gDark; ctx.fillRect(Math.round(pl.x) + 1, pl.y + 3, pl.w - 2, 2);
}
// одна сущность (враг, флешка, мевли, портал) в её текущей позе
function drawEnt(e) {
  if (e.t === 'y') spr(IMG.yarosh, e.x, e.y - (e.anim ? 2 : 0), e.face < 0);
  else if (e.t === 'y2') spr(IMG.yarosh2, e.x, e.y - (e.anim ? 2 : 0), e.face < 0);
  else if (e.t === 'd') {
    spr(IMG.dynex, e.x, e.y + (e.warn > 0 ? 0 : Math.floor(frame / (e.ag ? 4 : 8)) % 2), e.dir < 0);
    if (e.ag) text('!', e.x + 8, e.y - 11, '#ff3b3b', 8, 'center');
  } else if (e.t === 'fat') spr(IMG.fat, e.x, e.y - (e.anim ? 1 : 0), false);
  else if (e.t === 'ari') {
    spr(IMG.ari, e.x + (e.st === 1 ? (frame % 4 < 2 ? -1 : 1) : 0), e.y + (e.st === 1 ? 4 : 0), false);
    if (e.st === 1) text('!', e.x + 8, e.y - 11, '#ff3b3b', 8, 'center');
  } else if (e.t === 'bar') {
    const w = e.st === 1 || e.st === 4;
    spr(IMG.bar, e.x + (w ? (frame % 4 < 2 ? -1 : 1) : 0), e.y + (w ? 2 : 0), e.dir > 0);
    if (w) text(e.st === 4 ? '!!' : '!', e.x + 11, e.y - 11, '#ff3b3b', 8, 'center');
  } else if (e.t === 'alt') spr(IMG.alt, e.x, e.y, e.face < 0);
  else if (e.t === 'poc') {
    spr(IMG.poc, e.x, e.y - (e.anim ? 1 : 0), e.face < 0);
    if (e.st === 2) spr(IMG.stump, e.x + 8 - 9, e.y - 19 + (frame % 4 < 2 ? 0 : 1), false);   // замах пнём
  }
  else if (e.t === 'mak') {
    const w = e.st === 1;
    spr(IMG.mak, e.x + (w ? (frame % 4 < 2 ? -1 : 1) : 0), e.y - (e.anim ? 1 : 0), false);
    if (w) for (let i = 0; i < 8; i++) {   // души слетаются к нему
      const a = frame * 0.18 + i * Math.PI / 4, r = 8 + 36 * (e.tm / 55);
      ctx.fillStyle = i % 2 ? '#ff3b2a' : '#ffb03a'; ctx.fillRect(Math.round(e.x + 8 + Math.cos(a) * r), Math.round(e.y + 11 + Math.sin(a) * r), 3, 3);
    }
  }
  else if (e.t === 'ros') {
    spr(IMG.ros, e.x, e.y + (e.air ? -1 : 0), e.dir < 0);
  }
  else if (e.t === 'mk') spr(IMG.mak, e.x + (frame % 6 < 3 ? 0 : 1), e.y, e.face < 0);
  else if (e.t === 'laa') spr(IMG.laa, e.x, e.y - (e.anim ? 1 : 0), e.face < 0);
  else if (e.t === 'vlad') spr(IMG.vlad, e.x, e.y + (e.n > 0 && frame % 8 < 4 ? -1 : 0), e.face < 0);
  else if (e.t === 'tel') {
    spr(IMG.tel, e.x, e.y, false);
    if (e.ag && frame % 16 < 8) { ctx.fillStyle = '#ffd23e'; for (const o of [-1, 1]) { ctx.fillRect(e.x + 5 + o * 9, e.y + 2, 1, 3); ctx.fillRect(e.x + 5 + o * 12, e.y + 4, 1, 3); ctx.fillRect(e.x + 5 + o * 9, e.y + 7, 1, 3); } }
  } else if (e.t === 'ban') {
    if (e.st === 1 || e.st === 2) { ctx.fillStyle = e.st === 2 && frame % 6 < 3 ? '#ff3b3bcc' : '#ff3b3b44'; ctx.fillRect(Math.round(e.hx), Math.round(e.hy) + 12, 24, e.gy - e.hy - 12); }
    ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(e.hx) + 9, -20, 6, Math.round(e.hy) + 20);
    ctx.fillStyle = '#8a5a2c'; ctx.fillRect(Math.round(e.hx) + 10, -20, 4, Math.round(e.hy) + 20);
    ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(e.hx) - 1, Math.round(e.hy) - 1, 26, 14);
    ctx.fillStyle = '#e03030'; ctx.fillRect(Math.round(e.hx), Math.round(e.hy), 24, 12);
    ctx.fillStyle = '#ff8a7a'; ctx.fillRect(Math.round(e.hx), Math.round(e.hy), 24, 2);
    text('БАН', Math.round(e.hx) + 12, Math.round(e.hy) + 3, '#fff', 6, 'center');
  } else if (e.t === 'ano') {
    for (let i = 0; i < 3; i++) spr(IMG.ano, e.x + i * 14, e.y, false);
  } else if (e.t === 'duo') {
    spr(IMG.navy, e.ax, e.gy - 18, e.nface < 0); spr(IMG.putin, e.bx, e.gy - 18, false);
    const gx = e.nface < 0 ? e.ax - 4 : e.ax + 11;   // пистолет Навального
    ctx.fillStyle = '#17161c'; ctx.fillRect(gx, e.gy - 9, 5, 2); ctx.fillRect(gx + (e.nface < 0 ? 3 : 0), e.gy - 8, 2, 3);
    if (e.flash) { ctx.fillStyle = '#ffd23e'; ctx.fillRect(e.nface < 0 ? gx - 3 : gx + 5, e.gy - 10, 3, 4); }
  } else if (e.t === 'pol') {
    const run = Math.abs(e.vx || 0) > 0.5;
    spr(IMG.police, e.x, e.y - (run && Math.floor(frame / 3) % 2 ? 1 : 0), e.face < 0);
    ctx.fillStyle = frame % 10 < 5 ? '#ff3b3b' : '#4aa3ff'; ctx.fillRect(e.x + 5, e.y - 2, 2, 2);   // мигалка на фуражке
    ctx.fillStyle = '#17161c'; ctx.fillRect(e.face < 0 ? e.x - 2 : e.x + 12, e.y + 5 + (frame % 8 < 4 ? 0 : 1), 2, 8);   // дубинка
  } else if (e.t === 'f') spr(IMG.flash, e.x, e.y + Math.sin(frame * 0.1) * 2);
  else if (e.t === 'm') spr(IMG.melvi, e.x, e.y, P && P.x < e.x);
  else if (e.t === 'g') {
    for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#7a3cff', '#19ff9c', '#ff4fd8', '#ffffff'][(i + Math.floor(frame / 6)) % 4]; ctx.fillRect(e.x + i * 2, e.y + i * 3, 16 - i * 4, 26 - i * 6); }
  }
}

// ---------- игровая сцена
const playScene = {
  pausable: true,
  get music() { return ZONE_MUSIC[L.zone]; },
  update() {
    if (L.custom && L.custom.update()) return;   // свой уровень из конструктора: выход, таймер
    L.t++;
    for (const pl of L.plats) { pl.x += pl.vx; if (pl.x < pl.a) { pl.x = pl.a; pl.vx = Math.abs(pl.vx); } if (pl.x > pl.b) { pl.x = pl.b; pl.vx = -Math.abs(pl.vx); } }
    if (P.on) { moveX(P, P.on.vx); P.on = null; }
    // игрок
    const held = P.stop > 0; if (held) { P.stop--; P.grace = 60; } else if (P.grace > 0) P.grace--;   // Почик остановил игрока: управление отключено
    const bashed = P.bash > 0; if (bashed) P.bash--;   // башу не мешает получать урон — в отличие от разговора с Почиком
    const frozen = held || bashed;
    const ax = frozen ? 0 : keys.right - keys.left;
    P.vx += (ax * 2 - P.vx) * 0.3; if (Math.abs(P.vx) < 0.05) P.vx = 0;
    if (ax) P.face = ax;
    P.buf = jumpPressed && !frozen ? 7 : Math.max(0, P.buf - 1);
    P.coy = P.ground ? 7 : Math.max(0, P.coy - 1);
    if (P.buf && P.coy) { P.vy = -6.2; P.buf = 0; P.coy = 0; sfx(420, 0.12, 'square', 300, 0.04); }
    if ((!keys.jump || frozen) && P.vy < -2.5) P.vy = -2.5;
    P.vy = Math.min(7, P.vy + 0.35);
    P.ground = false;
    moveX(P, P.vx);
    const oldBottom = P.y + P.h, vy0 = P.vy;
    moveY(P, P.vy);
    if (vy0 >= 0) for (const pl of L.plats) {
      if (P.x + P.w > pl.x && P.x < pl.x + pl.w && oldBottom <= pl.y + 2 && P.y + P.h >= pl.y) { P.y = pl.y - P.h - 0.01; P.vy = 0; P.ground = true; P.on = pl; }
    }
    if (P.inv > 0) P.inv--;
    if (P.ground && !P.on && L.t % 8 === 0) safe = { x: P.x, y: P.y };
    // шипы
    for (let tx = Math.floor(P.x / T); tx <= Math.floor((P.x + P.w) / T); tx++) {
      const ty = Math.floor((P.y + P.h - 2) / T);
      if (ty >= 0 && ty < H && tx >= 0 && tx < L.W && L.g[ty][tx] === '^' && P.y + P.h > ty * T + 7) hurt(1, 'spike');
    }
    if (scene !== playScene) return;
    // падение
    if (P.y > H * T + 24) {
      if (L.secret && P.x + P.w > L.secret.x0 && P.x < L.secret.x1) { sfx(200, 0.6, 'triangle', 600); gotoLevel(SALT); return; }
      P.hp--; shake = 6;
      if (P.hp <= 0) { die('fall'); return; }
      sfx(180, 0.2, 'sawtooth', -100, 0.07);
      P.x = safe.x; P.y = safe.y; P.vx = P.vy = 0; P.inv = 90;
    }
    // сущности
    L.say = null;
    for (const e of L.ents) {
      if (e.dead) continue;
      const dx = (P.x + P.w / 2) - (e.x + e.w / 2), dy = (P.y + P.h / 2) - (e.y + e.h / 2);
      if (e.t === 'y' || e.t === 'y2') {
        e.face = dx < 0 ? -1 : 1;
        if (e.anim) e.anim--;
        if (Math.abs(dx) < 170 && Math.abs(dy) < 120 && --e.cd <= 0) {
          // целится не туда, где игрок сейчас, а туда, где он окажется, пока бутылка (или куб) летит
          const v = lobAim(e.x + 5 + 2.5, e.y + 4, 0.15, 2.6, 40, 62);
          if (e.t === 'y2') shots.push({ k: 'cube', x: e.x + 4, y: e.y - 2, vx: v.vx, vy: v.vy, g: 0.15, w: 7, h: 7, rot: 0 });
          else shots.push({ k: 'b', x: e.x + 5, y: e.y, vx: v.vx, vy: v.vy, g: 0.15, w: 5, h: 8, rot: 0 });
          e.cd = L.cdBase + Math.random() * 30; e.anim = 12; sfx(300, 0.08, 'triangle', 200, 0.04);
        }
        if (ov(P, e, 3)) hurt(1, 'yarosh');
      } else if (e.t === 'd') {
        // баланс: зона обнаружения поуже, перед рывком «!» и пауза (игрок успевает среагировать), рывок помедленнее
        const ag = Math.abs(dx) < 80 && Math.abs(dy) < 32;
        if (ag && !e.ag) { sfx(90, 0.25, 'sawtooth', 60, 0.06); e.warn = 20; }
        e.ag = ag; if (ag && Math.abs(dx) > 3) e.dir = dx < 0 ? -1 : 1;
        let sp = 0.7; if (ag) { if (e.warn > 0) { e.warn--; sp = 0; } else sp = 1.4; }
        if (P.stop > 0 || P.grace > 0) sp = 0;   // игрока держит Почик (и миг после): Дынекс не подкрадывается и не убивает
        e.x += e.dir * sp;
        if (e.x < e.x0) { e.x = e.x0; if (!ag) e.dir = 1; }
        if (e.x > e.x1) { e.x = e.x1; if (!ag) e.dir = -1; }
        if (P.inv <= 0 && !P.stop && P.grace <= 0 && ov(P, e, 4)) { P.hp = 0; die('dynex'); return; }
      } else if (ENEMY[e.t]) {
        ENEMY[e.t](e, dx, dy);
      } else if (e.t === 'f') {
        if (ov(P, e)) { e.dead = true; onFlash(e); }
      } else if (e.t === 'm') {
        if (Math.abs(dx) < 60 && Math.abs(dy) < 48) L.say = e.say;
      } else if (e.t === 'g') {
        if (ov(P, e, 2)) { sfx(500, 0.4, 'triangle', 900); if (L.custom) L.custom.win(); else advance(L.n + 1); return; }
      }
      if (scene !== playScene) return;
    }
    // босс
    if (L.boss) { (L.boss.kind === 'nos' ? updNos : updBear)(L.boss); if (scene !== playScene) return; }
    // снаряды
    shots = shots.filter(s => {
      if (s.k === 'usb') {
        const b = L.boss, k = ++s.t / 18;
        s.x = s.sx + (b.x + b.w / 2 - s.sx) * k; s.y = s.sy + (b.y + b.h / 2 - s.sy) * k;
        if (s.t >= 18) { hitBoss(); return false; }
        return true;
      }
      if (s.k === 'req') {   // линии душ: идут от Махито, на полпути разворачиваются; стены не держат
        if (++s.t === 38) { s.vx = -s.vx; s.vy = -s.vy; }
        s.x += s.vx; s.y += s.vy;
        if (ov(P, s)) hurt(1, 'req');
        copHit(s);   // души пронзают: полицейский гибнет, линия летит дальше
        return s.t < 76;
      }
      if (s.k === 'nbul') {   // пуля Навального: летит в полицейских, Холоса не задевает
        s.x += s.vx; s.y += s.vy;
        if (++s.t > 70 || tileAt(s.x + 2, s.y + 1)) { burst(s.x, s.y, '#ffd23e', 3); return false; }
        return !copHit(s);
      }
      if (s.k === 'quake') {   // ударная волна Баратрума: катится по земле только в пределах его дорожки
        s.x += s.vx;
        if (ov(P, s, 1)) hurt(1, 'bar');
        copHit(s, 1);
        if (frame % 3 === 0) parts.push({ x: s.x + 5, y: s.y + 6, vx: 0, vy: -0.8, life: 12, col: '#cfeeff' });
        return s.x > s.x0 && s.x + s.w < s.x1;
      }
      if (s.k === 'flag') { s.t++; s.y += Math.sin(s.t * 0.25) * 0.7; }   // флаг «трепещет»
      if (s.k === 'uwu' && ++s.t % 5 === 0) parts.push({ x: s.x + 8, y: s.y + 2, vx: 0, vy: -0.4, life: 18, col: '#ff7aa8' });
      s.vy += s.g || 0; s.x += s.vx; s.y += s.vy; s.rot = (s.rot || 0) + 0.25;
      const ground = s.k === 'wave' || s.k === 'sweep';
      if (!ground && tileAt(s.x + s.w / 2, s.y + s.h / 2)) {
        burst(s.x, s.y, { cube: '#ffd23e', b: '#c05f10', crystal: '#f7f1fa', fire: '#ff8a2a', tok: '#4aa3ff', stump: '#8a5a2c', uwu: '#ff7aa8', flag: '#ffffff' }[s.k] || '#ff4fd8', s.k === 'stump' ? 14 : 5);
        if (s.k === 'b') sfx(1200, 0.05, 'square', -600, 0.03);
        if (s.k === 'stump') { shake = Math.max(shake, 5); sfx(70, 0.3, 'sawtooth', -20, 0.09); }
        return false;
      }
      if (ov(P, s)) {
        const hp = P.hp; hurt(1, s.k);
        if (s.k === 'cube' && P.hp < hp && P.hp > 0 && Math.random() < BASH_CHANCE) bash();   // удар прошёл — с шансом ещё и оглушает
        if (!ground) return false;
      }
      if (copHit(s) && !ground) return false;   // любой вражеский снаряд убивает полицейского (волны по земле — насквозь)
      return s.x > -40 && s.x < L.W * T + 40 && s.y < H * T + 40 && s.y > -300;
    });
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--; }
    parts = parts.filter(p => p.life > 0);
    for (const p of L.pops) { p.y -= 0.4; p.t--; }
    L.pops = L.pops.filter(p => p.t > 0);
    if (L.banner && --L.banner[1] <= 0) L.banner = null;
    if (shake > 0) shake--;
    L.cam += (clamp(P.x - 140, 0, L.W * T - VW) - L.cam) * 0.15;
  },
  draw() {
    const Z = ZONES[L.zone], cam = Math.round(L.cam);
    drawBG(L.zone, L.cam);
    ctx.save();
    ctx.translate(-cam + (shake && SET.shake ? Math.round((Math.random() - 0.5) * shake) : 0), 4);
    const tx0 = Math.max(0, Math.floor(cam / T)), tx1 = Math.min(L.W - 1, tx0 + 21);
    drawTiles(L.g, Z, tx0, tx1);
    if (L.secret) for (let i = 0; i < 6; i++) {
      if ((frame + i * 13) % 50 < 25) { ctx.fillStyle = '#fff'; ctx.fillRect(L.secret.x0 + 4 + hash(i, 7) * 40, 150 + hash(i, 8) * 24, 1, 1); }
    }
    for (const pl of L.plats) drawPlat(pl, Z);
    for (const e of L.ents) if (!e.dead) drawEnt(e);
    // реплики Почика
    for (const e of L.ents) {
      if (e.t !== 'poc' || !e.talk || e.st === 0) continue;
      const lines = e.st === 1 ? ['СТОЙ!', 'ГОНИ КОСАРЬ!'] : ['НЕ ПЛАТИШЬ?', 'ДЕРЖИ ПЕНЬ!'];
      const w = Math.max(...lines.map(l => textW(l, 6))) + 8, bh = lines.length * 8 + 4, bx = Math.round(e.x + 8 - w / 2), by = Math.round(e.y - (e.st === 2 ? 24 : 8) - bh);
      box(bx, by, w, bh, '#fff', '#17161c');
      lines.forEach((l, i) => text(l, bx + w / 2, by + 3 + i * 8, '#17161c', 6, 'center', false));
    }
    // реплики новых врагов (пузырь над головой)
    for (const e of L.ents) {
      if (e.dead || !e.bub || e.bub.t <= 0) continue;
      const lines = e.bub.lines, w = Math.max(...lines.map(l => textW(l, 6))) + 8, bh = lines.length * 8 + 4;
      const bx = Math.round(e.x + e.w / 2 - w / 2), by = Math.round(e.y - 6 - bh);
      box(bx, by, w, bh, '#fff', '#17161c');
      lines.forEach((l, i) => text(l, bx + w / 2, by + 3 + i * 8, e.t === 'mk' ? '#a02020' : '#17161c', 6, 'center', false));
    }
    // имена особых врагов, когда игрок рядом
    for (const e of L.ents) {
      if (e.dead || !(e.name || e.t === 'duo') || (e.t === 'poc' && e.talk && e.st) || (e.bub && e.bub.t > 0)) continue;
      if (Math.abs(P.x - (e.x + e.w / 2)) > 120 || Math.abs(P.y - (e.y + e.h / 2)) > 110) continue;
      if (e.t === 'duo') { text('Навальный', e.ax + 6, e.gy - 27, '#ffe27a', 6, 'center'); text('В. В. Путин', e.bx + 6, e.gy - 36, '#ffe27a', 6, 'center'); }
      else if (e.t === 'ban') text(e.name, e.hx + 12, e.hy - 9, '#ffe27a', 6, 'center');
      else text(e.name, e.x + e.w / 2, e.y - (e.t === 'bar' ? 22 : 9), '#ffe27a', 6, 'center');
    }
    // босс
    const b = L.boss;
    if (b && b.kind === 'nos') {
      if (!b.dead || b.dead % 4 < 2) {
        if (b.flash % 4 > 1) ctx.globalAlpha = 0.4;
        spr(IMG.nos, b.x + (b.dead ? (Math.random() - 0.5) * 4 : 0), b.y, P.x < b.x, 2);
        ctx.globalAlpha = 1;
      }
      if (b.warn && frame % 8 < 5) text('!', b.warn.side < 0 ? 6 : VW - 6, L.groundY - 12, '#ff3b3b', 8, 'center');
    }
    if (b && b.kind === 'bear') {
      spr(b.inhale ? IMG.bearOpen : IMG.bear, b.x + (b.inhale ? Math.sin(frame) : 0), b.y - (b.lift ? 6 : 0), false, 4);
      if (b.say) text('ХА.', b.x + 10, b.y - 10, '#fff', 8);
    }
    // снаряды
    for (const s of shots) {
      if (s.k === 'b') { ctx.save(); ctx.translate(Math.round(s.x + 2), Math.round(s.y + 5)); ctx.rotate(s.rot); ctx.drawImage(IMG.bottle, -2, -5); ctx.restore(); }
      else if (s.k === 'cube') { ctx.save(); ctx.translate(Math.round(s.x + 3.5), Math.round(s.y + 3.5)); ctx.rotate(s.rot); ctx.drawImage(IMG.cube, -3.5, -3.5); ctx.restore(); }
      else if (s.k === 'usb') spr(IMG.flash, s.x, s.y);
      else if (s.k === 'fire') { ctx.fillStyle = '#e03020'; ctx.fillRect(s.x, s.y + 1, 7, 5); ctx.fillRect(s.x + 1, s.y, 5, 7); ctx.fillStyle = frame % 4 < 2 ? '#ffd23e' : '#ff8a2a'; ctx.fillRect(s.x + 2, s.y + 2, 3, 3); }
      else if (s.k === 'tok') { ctx.fillStyle = '#17161c'; ctx.fillRect(s.x - 1, s.y - 1, 8, 8); ctx.fillStyle = '#4aa3ff'; ctx.fillRect(s.x, s.y, 6, 6); ctx.fillStyle = '#fff'; ctx.fillRect(s.x + 1, s.y + 1, 2, 2); ctx.fillRect(s.x + 4, s.y + 4, 1, 1); }
      else if (s.k === 'stump') { ctx.save(); ctx.translate(Math.round(s.x + 9), Math.round(s.y + 7)); ctx.rotate(s.rot * 0.35); ctx.drawImage(IMG.stump, -9, -9.5); ctx.restore(); }
      else if (s.k === 'req') {   // душа с хвостом из трёх теней
        const m = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / m, uy = s.vy / m;
        for (let i = 3; i >= 0; i--) { ctx.fillStyle = ['#ffd23e', '#ff8a2a', '#e03020', '#7a1010'][i]; const k = 6 - i; ctx.fillRect(Math.round(s.x + 3 - k / 2 - ux * i * 4), Math.round(s.y + 3 - k / 2 - uy * i * 4), k, k); }
        ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(s.x + 2), Math.round(s.y + 2), 2, 2);
      }
      else if (s.k === 'uwu') text('UwU', s.x, s.y, '#ff7aa8', 6);
      else if (s.k === 'flag') { ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 14, 10); spr(IMG['flag' + s.f], s.x, s.y, s.vx < 0); }
      else if (s.k === 'glitch') { ctx.fillStyle = frame % 4 < 2 ? '#ff4fd8' : '#19ff9c'; ctx.fillRect(s.x, s.y, 6, 6); ctx.fillStyle = '#fff'; ctx.fillRect(s.x + 2, s.y + 2, 2, 2); }
      else if (s.k === 'sweep') { ctx.fillStyle = '#ff4fd8'; ctx.fillRect(s.x, s.y, 10, 10); ctx.fillStyle = '#19ff9c'; ctx.fillRect(s.x + 2, s.y + (frame % 6), 6, 2); }
      else if (s.k === 'nbul') { ctx.fillStyle = '#ffd23e'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 4, 2); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(s.x + (s.vx > 0 ? 3 : 0)), Math.round(s.y), 1, 2); }
      else if (s.k === 'quake') { const f = frame % 6 < 3; ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(s.x) - 1, s.y + 1, 12, 8); ctx.fillStyle = '#cfeeff'; ctx.fillRect(Math.round(s.x), s.y + (f ? 2 : 3), 10, f ? 6 : 5); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(s.x) + 3, s.y + (f ? 0 : 1), 4, 2); }
      else if (s.k === 'wave') { ctx.fillStyle = '#f7f1fa'; ctx.fillRect(s.x, s.y + 3, 10, 6); ctx.fillRect(s.x + 3, s.y, 4, 3); }
      else if (s.k === 'crystal') { ctx.fillStyle = '#f7f1fa'; ctx.fillRect(s.x + 1, s.y, 5, 8); ctx.fillStyle = '#ffb8d8'; ctx.fillRect(s.x + 2, s.y + 8, 3, 2); ctx.fillRect(s.x + 3, s.y + 10, 1, 1); }
    }
    // игрок
    if (P.inv % 6 < 3) spr(IMG.holos, P.x - 3, P.y - 3 + (P.ground && Math.abs(P.vx) > 0.5 ? Math.floor(frame / 5) % 2 : 0), P.face < 0);
    if (P.bash > 0) for (let i = 0; i < 3; i++) {   // звёздочки над головой оглушённого
      const a = frame * 0.3 + i * 2.1; ctx.fillStyle = i % 2 ? '#fff' : '#ffd23e';
      ctx.fillRect(Math.round(P.x + 4 + Math.cos(a) * 7), Math.round(P.y - 6 + Math.sin(a) * 2.5), 2, 2);
    }
    for (const p of parts) { ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 2, 2); }
    for (const p of L.pops) text(p.s, p.x, p.y, '#fff', 8);
    ctx.restore();
    // HUD
    for (let i = 0; i < P.max; i++) spr(i < P.hp ? IMG.heart : IMG.heartOff, 6 + i * 13, 6, false, 2);
    if (HC && !L.custom) text('ХАРДКОР', 22, 8, '#ff5a5a', 6);
    if (b) {
      text(b.kind === 'nos' ? 'МРДРНОС' : 'ВЕДМЕДИК БО', 314, 5, '#fff', 6, 'right');
      box(214, 14, 100, 5, '#2b2a33', '#000');
      if (b.kind === 'nos') { ctx.fillStyle = '#f08a1c'; ctx.fillRect(214, 14, 100 * Math.max(0, b.hp) / b.max, 5); }
      else { ctx.fillStyle = '#e03030'; ctx.fillRect(214, 14, 100, 5); text('HP: ∞', 314, 22, '#ff9a9a', 6, 'right'); }
    } else if (!L.custom) text(`УР.${L.n} ${Z.name}`, 314, 6, '#fff', 6, 'right');
    if (L.say) {
      box(8, 22, 304, 44, '#17161cee', '#fff');
      text(MELVI + ':', 13, 26, '#19ff9c', 6);
      wrap(L.say, 292, 6).slice(0, 4).forEach((l, i) => text(l, 13, 35 + i * 8, '#fff', 6));
    } else if (L.banner) text(L.banner[0], 160, 34, '#fff', 8, 'center');
    if (L.custom) L.custom.draw();
  },
};

// ---------- фоны
function skyline(off, col, win, bw, minH, varH, seed, base) {
  const i0 = Math.floor(off / bw);
  for (let i = i0; i < i0 + VW / bw + 2; i++) {
    const h = Math.floor(minH + hash(i, seed) * varH), x = Math.round(i * bw - off), y = base - h;
    ctx.fillStyle = col; ctx.fillRect(x, y, bw - 2, VH - y);
    if (win) { ctx.fillStyle = win; for (let wy = y + 5; wy < base - 4; wy += 9) for (let wx = 3; wx < bw - 6; wx += 6) if (hash(i * 31 + wx, wy + seed) > 0.45) ctx.fillRect(x + wx, wy, 2, 3); }
  }
}
function drawBG(z, cam) {
  const Z = ZONES[z], g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, Z.sky[0]); g.addColorStop(1, Z.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (z === 0) {
    ctx.fillStyle = '#fff6c8'; ctx.fillRect(250, 20, 16, 16);
    ctx.fillStyle = '#2f7fc4'; ctx.fillRect(0, 112, VW, 68);
    ctx.fillStyle = '#7fc0ee'; for (let i = 0; i < 14; i++) ctx.fillRect((i * 53 + Math.floor(frame / 12) * 2 - cam * 0.1) % 340 - 10, 116 + (i * 7) % 30, 10, 1);
  } else if (z === 1) { ctx.fillStyle = '#fff1c0'; ctx.fillRect(60, 30, 22, 22); }
  else if (z === 2) { ctx.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) ctx.fillRect(((i * 90 - cam * 0.08) % 400 + 400) % 400 - 40, 18 + (i * 13) % 30, 30, 6); }
  if (z < 3) {
    skyline(cam * 0.2, Z.far, null, 26, 30, 45, z * 10 + 1, 140);
    skyline(cam * 0.45, Z.near, Z.win, 22, 20, 40, z * 10 + 2, 160);
  } else if (z === 3) {
    ctx.fillStyle = '#19ff9c22';
    for (let x = -(frame / 2 % 16); x < VW; x += 16) ctx.fillRect(x, 0, 1, VH);
    for (let y = (frame / 2 % 16); y < VH; y += 16) ctx.fillRect(0, y, VW, 1);
    for (let i = 0; i < 6; i++) { const s = Math.floor(frame / 7) + i * 17; ctx.fillStyle = i % 2 ? '#ff4fd833' : '#19ff9c33'; ctx.fillRect(hash(s, 1) * VW, hash(s, 2) * VH, 10 + hash(s, 3) * 50, 2 + hash(s, 4) * 5); }
  } else if (z === 4) {
    for (let i = 0; i < 16; i++) {
      const h = 10 + hash(i, 5) * 30; ctx.fillStyle = '#3a3248';
      for (let k = 0; k < 5; k++) ctx.fillRect(i * 20 + k * 2, 0, 20 - k * 4, h * (k + 1) / 5);
      ctx.fillStyle = i % 3 ? '#4d4460' : '#ffb8d866'; const ch = 14 + hash(i, 9) * 30;
      ctx.fillRect(i * 22 + 4, 148 - ch, 6, ch + 32); ctx.fillRect(i * 22 + 6, 146 - ch, 2, 2);
    }
  } else if (z === 5) bgSynagogue(cam);
  else if (z === 6) bgServers(cam);
  else bgBackstage(cam);
}

// витражное окно с аркой: окно собрано из цветных ячеек 4×4
function archWindow(x, y, w, h, seed) {
  const pal = ['#4aa3ff', '#ffd23e', '#e03030', '#2ecc71', '#b06cff'], hw = w / 2;
  for (let cy = 0; cy < h; cy += 4) for (let cx = 0; cx < w; cx += 4) {
    const dy = cy + 2, dx = cx + 2 - hw;
    if (dy < hw && dx * dx + (dy - hw) * (dy - hw) > hw * hw) continue; // срезаем верх аркой
    ctx.fillStyle = pal[Math.floor(hash(cx + seed, cy) * pal.length)]; ctx.fillRect(x + cx, y + cy, 3, 3);
    ctx.fillStyle = '#17101f'; ctx.fillRect(x + cx + 3, y + cy, 1, 4); ctx.fillRect(x + cx, y + cy + 3, 4, 1);
  }
}
function menorah(x, y) {
  ctx.fillStyle = '#d4a017';
  ctx.fillRect(x - 7, y - 3, 14, 3); ctx.fillRect(x - 1, y - 20, 2, 17); ctx.fillRect(x - 13, y - 6, 26, 2);
  for (const o of [-12, -8, -4, 4, 8, 12]) ctx.fillRect(x + o - 1, y - 17, 2, 11);
  for (const o of [-12, -8, -4, 0, 4, 8, 12]) {
    ctx.fillStyle = hash(o + Math.floor(frame / 7), x) > 0.5 ? '#ffd23e' : '#ff9a2e';
    ctx.fillRect(x + o - 1, y - 24 + (o === 0 ? -3 : 0), 2, 4);
  }
}
function bgSynagogue(cam) {
  ctx.fillStyle = '#ffd88a14'; ctx.fillRect(0, 0, VW, VH);
  const wo = cam * 0.3;
  for (let i = Math.floor(wo / 80) - 1; i < Math.floor(wo / 80) + 6; i++) {
    const x = Math.round(i * 80 - wo + 24);
    ctx.fillStyle = '#ffd88a18'; ctx.fillRect(x - 4, 14, 36, 100);
    archWindow(x, 18, 28, 76, i * 7);
    if (i % 2 === 0) { ctx.fillStyle = '#6b5038'; ctx.fillRect(x - 2, 96, 32, 4); menorah(x + 14, 96); }
  }
  // колонны ближнего плана
  const po = cam * 0.6;
  for (let i = Math.floor(po / 112) - 1; i < Math.floor(po / 112) + 4; i++) {
    const x = Math.round(i * 112 - po + 8);
    ctx.fillStyle = '#b9a67c'; ctx.fillRect(x, 0, 14, VH);
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x + 2, 0, 4, VH);
    ctx.fillStyle = '#8a7a58'; ctx.fillRect(x + 10, 0, 4, VH);
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x - 3, 0, 20, 6); ctx.fillRect(x - 3, 150, 20, 8);
  }
  // висячие лампы
  for (let i = 0; i < 4; i++) {
    const x = ((i * 100 - cam * 0.45) % 440 + 440) % 440 - 60, sw = Math.sin(frame * 0.03 + i) * 2;
    ctx.fillStyle = '#6b5038'; ctx.fillRect(x + 6, 0, 1, 20);
    ctx.fillStyle = '#ffd23e'; ctx.fillRect(x + sw, 20, 13, 6); ctx.fillStyle = '#fff3b0'; ctx.fillRect(x + 3 + sw, 22, 7, 3);
  }
}
function bgServers(cam) {
  // огромная лямбда на стене
  ctx.strokeStyle = 'rgba(240,138,28,0.10)'; ctx.lineWidth = 14; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(130, 24); ctx.lineTo(206, 150); ctx.moveTo(171, 88); ctx.lineTo(120, 150); ctx.stroke();
  const rack = (off, bw, bh, base, body, led) => {
    const i0 = Math.floor(off / (bw + 4));
    for (let i = i0; i < i0 + VW / (bw + 4) + 2; i++) {
      const h = bh + Math.floor(hash(i, bw) * 30), x = Math.round(i * (bw + 4) - off), y = base - h;
      ctx.fillStyle = body; ctx.fillRect(x, y, bw, VH - y);
      ctx.fillStyle = '#00000055'; for (let vy = y + 6; vy < base - 4; vy += 8) ctx.fillRect(x + 3, vy, bw - 6, 2);
      for (let vy = y + 5; vy < base - 4; vy += 8) {
        const on = hash(i * 13 + vy, Math.floor(frame / (24 + (i % 3) * 8))) > 0.35;
        ctx.fillStyle = on ? (hash(i, vy) > 0.5 ? '#19ff9c' : '#ff8a1c') : '#2a3140'; ctx.fillRect(x + bw - 7, vy, 3, 2);
      }
    }
  };
  rack(cam * 0.2, 26, 50, 150, '#10151e');
  rack(cam * 0.45, 34, 60, 172, '#171d2a');
  // провисшие кабели
  ctx.strokeStyle = '#05070b'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const x0 = ((i * 170 - cam * 0.35) % 520 + 520) % 520 - 100;
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.quadraticCurveTo(x0 + 80, 40 + i * 6, x0 + 170, 0); ctx.stroke();
  }
}
function bgBackstage(cam) {
  // задники декораций: видна изнанка — фанера, брусья, раскосы
  const flats = (off, bw, minH, varH, base, ply, line) => {
    const i0 = Math.floor(off / (bw + 6));
    for (let i = i0; i < i0 + VW / (bw + 6) + 2; i++) {
      const h = Math.floor(minH + hash(i, bw) * varH), x = Math.round(i * (bw + 6) - off), y = base - h;
      ctx.fillStyle = ply; ctx.fillRect(x, y, bw, VH - y);
      ctx.fillStyle = line; ctx.fillRect(x, y, 3, VH - y); ctx.fillRect(x + bw - 3, y, 3, VH - y); ctx.fillRect(x, y, bw, 3);
      for (let k = 0; k < bw; k++) { ctx.fillRect(x + k, y + 3 + Math.floor(k * (h - 6) / bw / 2), 1, 2); ctx.fillRect(x + bw - 1 - k, y + 3 + Math.floor(k * (h - 6) / bw / 2), 1, 2); }
    }
  };
  flats(cam * 0.2, 46, 40, 40, 150, '#4a3626', '#32231a');
  flats(cam * 0.45, 38, 30, 36, 168, '#654a34', '#3f2d20');
  // световая ферма с прожекторами
  ctx.fillStyle = '#0b0807'; ctx.fillRect(0, 0, VW, 8);
  for (let i = 0; i < 4; i++) {
    const lx = ((i * 96 - cam * 0.3) % 400 + 400) % 400 - 40, sway = Math.sin(frame * 0.02 + i * 1.7) * 26;
    ctx.fillStyle = '#17161c'; ctx.fillRect(lx - 4, 6, 8, 5);
    ctx.fillStyle = 'rgba(255,232,160,0.08)'; ctx.beginPath(); ctx.moveTo(lx - 2, 10); ctx.lineTo(lx + 2, 10); ctx.lineTo(lx + sway + 34, 160); ctx.lineTo(lx + sway - 34, 160); ctx.closePath(); ctx.fill();
  }
  // верёвки с мешками-противовесами
  for (let i = 0; i < 3; i++) {
    const x = ((i * 140 - cam * 0.5) % 460 + 460) % 460 - 40;
    ctx.fillStyle = '#9a8a6a'; ctx.fillRect(x, 8, 1, 60 + (i % 2) * 20); ctx.fillStyle = '#6b5a3c'; ctx.fillRect(x - 5, 68 + (i % 2) * 20, 11, 10);
  }
}

// ---------- капча
function captchaScene() {
  let st = 0, t = 0, tries = 0;
  const b = { x: 60, y: 60, w: 200, h: 60 };
  return {
    music: 'Menu',
    update() {
      t++;
      if (st === 0 && anyPressed && (!click || inside(click, b))) { st = 1; t = 0; sfx(600, 0.05); }
      else if (st === 1 && t > 70) { tries++; t = 0; if (tries < 2) { st = 2; sfx(150, 0.3, 'sawtooth'); } else { st = 3; sfx(880, 0.15); } }
      else if (st === 2 && t > 120) { st = 0; }
      else if (st === 3 && t > 70) scene = titleScene();
    },
    draw() {
      ctx.fillStyle = '#17161c'; ctx.fillRect(0, 0, VW, VH);
      text('ПРОВЕРКА БЕЗОПАСНОСТИ', 160, 30, '#9a9aa6', 8, 'center');
      box(b.x, b.y, b.w, b.h, '#f4f4f4', '#9a9aa6');
      box(b.x + 14, b.y + 20, 20, 20, '#fff', '#17161c');
      if (st === 1) { const a = t * 0.3; ctx.fillStyle = '#4aa3ff'; for (let i = 0; i < 5; i++) ctx.fillRect(b.x + 23 + Math.cos(a + i * 0.5) * 7, b.y + 29 + Math.sin(a + i * 0.5) * 7, 2, 2); }
      if (st === 3) { ctx.fillStyle = '#2ecc71'; for (let i = 0; i < 5; i++) ctx.fillRect(b.x + 18 + i, b.y + 29 + i, 2, 3); for (let i = 0; i < 9; i++) ctx.fillRect(b.x + 23 + i, b.y + 33 - i, 2, 3); }
      if (st === 2) { ctx.fillStyle = '#e03030'; for (let i = 0; i < 12; i++) { ctx.fillRect(b.x + 18 + i, b.y + 24 + i, 2, 2); ctx.fillRect(b.x + 29 - i, b.y + 24 + i, 2, 2); } }
      text('Я не холос', b.x + 46, b.y + 26, '#17161c', 8, 'left', false);
      text('холоКАПЧА', b.x + b.w - 6, b.y + b.h - 10, '#9a9aa6', 6, 'right', false);
      const msg = st === 0 ? (tries ? 'ПОПРОБУЙ ЕЩЁ РАЗ' : 'НАЖМИ НА ГАЛОЧКУ') : st === 1 ? 'ПРОВЕРЯЕМ...' : st === 2 ? 'ХМ. ПОХОЖ НА ХОЛОСА.' : 'ЛАДНО, ВЕРИМ.';
      text(msg, 160, 136, st === 2 ? '#ff5a5a' : st === 3 ? '#2ecc71' : '#fff', 8, 'center');
    },
  };
}

// ---------- меню
// Универсальное меню-список (пауза, настройки). items() — пункты {s, f, adj(k), off, sure}: f — действие,
// adj — изменить значение (← → или клик по левой/правой половине), sure — подпись, которую показать перед повторным
// нажатием (защита от случайного «выйти» и «сбросить»). back — выход (Esc).
function listMenu(o) {
  let sel = 0, armed = -1;
  const MH = 15, MW = o.w || 210, X = Math.round((VW - MW) / 2);
  const geo = n => { const top = Math.round((VH - n * MH) / 2) + 6; return { top, y: i => top + i * MH }; };
  const act = (items, i, k) => {
    const it = items[i]; if (!it || it.off) return;
    if (it.adj) { armed = -1; it.adj(k); sfx(600, 0.04, 'square', 0, 0.03); return; }
    if (it.sure && armed !== i) { armed = i; sfx(400, 0.05, 'square', 0, 0.03); return; }
    armed = -1; sfx(600, 0.04, 'square', 0, 0.03); it.f();
  };
  return {
    pad: 'none',
    music: o.music,
    update() {
      const items = o.items(), n = items.length, g = geo(n), prev = sel;
      if (codes.has('Escape') || (o.close && o.close.some(c => codes.has(c)))) { o.back(); return; }
      if (codes.has('ArrowUp') || codes.has('KeyW')) sel = (sel + n - 1) % n;
      if (codes.has('ArrowDown') || codes.has('KeyS')) sel = (sel + 1) % n;
      if (sel !== prev) armed = -1;
      if (codes.has('ArrowLeft') || codes.has('KeyA')) { if (items[sel].adj) act(items, sel, -1); }
      if (codes.has('ArrowRight') || codes.has('KeyD')) { if (items[sel].adj) act(items, sel, 1); }
      if (codes.has('Enter') || codes.has('Space') || codes.has('KeyZ')) { act(items, sel, 1); return; }
      if (click) {
        const i = Math.floor((click.y - g.top) / MH);
        if (click.x >= X && click.x < X + MW && i >= 0 && i < n) { sel = i; act(items, i, click.x < VW / 2 ? -1 : 1); }
      }
    },
    draw() {
      o.bg();
      ctx.fillStyle = '#000000b0'; ctx.fillRect(0, 0, VW, VH);
      const items = o.items(), n = items.length, g = geo(n);
      box(X - 10, g.top - 26, MW + 20, n * MH + 44, '#17161c', o.col || '#fff');
      text(o.title, 160, g.top - 18, o.col || '#fff', 8, 'center');
      items.forEach((it, i) => {
        const y = g.y(i), on = i === sel;
        if (on) { ctx.fillStyle = '#2b2a33'; ctx.fillRect(X, y, MW, MH - 1); }
        text(armed === i && it.sure ? it.sure : it.s, 160, y + 4, it.off ? '#6b6a76' : armed === i ? '#ff7a6a' : on ? '#fff' : '#c9c9d4', 6, 'center');
      });
      text('↑ ↓ ВЫБОР   ← → МЕНЯТЬ   ESC НАЗАД', 160, g.top + n * MH + 4, '#6b6a76', 6, 'center');
    },
  };
}

// ---------- настройки. back — функция, возвращающая в то место, откуда пришли (в меню или в паузу)
function settingsScene(back, bg) {
  const lvl = v => v ? v * 10 + '%' : 'ВЫКЛ';
  return listMenu({
    title: 'НАСТРОЙКИ', bg: bg || (() => drawBG(3, frame * 0.3)), back,
    items: () => [
      { s: '← МУЗЫКА: ' + lvl(SET.music) + ' →', adj: k => { SET.music = clamp(SET.music + k, 0, 10); saveSet(); } },
      { s: '← ЗВУКИ: ' + lvl(SET.sfx) + ' →', adj: k => { SET.sfx = clamp(SET.sfx + k, 0, 10); saveSet(); sfx(520, 0.1, 'square', 300, 0.05); } },
      { s: '← ТРЯСКА ЭКРАНА: ' + (SET.shake ? 'ВКЛ' : 'ВЫКЛ') + ' →', adj: () => { SET.shake = SET.shake ? 0 : 1; saveSet(); shake = 6; } },
      ...(fsReq ? [{ s: 'ПОЛНЫЙ ЭКРАН: ' + (fsOn() ? 'ВКЛ' : 'ВЫКЛ'), f: toggleFs }] : []),
      { s: 'СБРОСИТЬ ПРОГРЕСС', sure: 'ТОЧНО? ВСЁ ПРОПАДЁТ', f: () => { try { for (const k of ['holos_lvl', 'holos_hc', 'holos_hc_win']) localStorage.removeItem(k); } catch (e) { } } },
      { s: 'НАЗАД', f: back },
    ],
  });
}

// ---------- пауза. Работает в любой сцене с флагом pausable (уровни, заплыв, паспорт): Esc, P или кнопка II
const PAUSE_BTN = { x: 128, y: 3, w: 16, h: 12 };
function drawPauseBtn() {
  box(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h, '#17161ccc', '#fff');
  ctx.fillStyle = '#fff'; ctx.fillRect(PAUSE_BTN.x + 5, PAUSE_BTN.y + 3, 2, 6); ctx.fillRect(PAUSE_BTN.x + 9, PAUSE_BTN.y + 3, 2, 6);
}
function pauseScene(prev) {
  // выйти в меню: со своего уровня — туда, откуда его запустили (редактор, список уровней), иначе — в главное меню
  const quit = () => { if (prev === playScene && L.custom) L.custom.exit(); else scene = titleScene(); };
  let me;
  const bg = () => prev.draw();
  const resume = () => { scene = prev; musDuck = 1; };
  me = listMenu({
    title: 'ПАУЗА', bg, back: resume, close: ['KeyP'],
    items: () => [
      { s: 'ПРОДОЛЖИТЬ', f: resume },
      { s: 'НАСТРОЙКИ', f: () => { scene = settingsScene(() => { scene = me; }, bg); } },
      { s: 'ВЫЙТИ В МЕНЮ', sure: HC && !(prev === playScene && L.custom) ? 'ТОЧНО? ЗАБЕГ ПРОПАДЁТ' : 'ТОЧНО ВЫЙТИ?', f: () => { musDuck = 1; quit(); } },
    ],
  });
  musDuck = 0.35;   // на паузе музыка тише
  return me;
}

function titleScene() {
  HC = false;
  const saved = load(), best = hcBest();
  const items = [];
  if (saved > 1) items.push({ s: `ПРОДОЛЖИТЬ: УР.${saved}`, f: () => gotoLevel(saved) });
  items.push({ s: 'НОВАЯ ИГРА', f: () => gotoLevel(1) });
  items.push({ s: 'ХАРДКОР' + (hcDone() ? ' (ПРОЙДЕН)' : best ? ` (РЕКОРД: УР.${best})` : ''), col: '#ff5a5a', f: () => {
    HC = true;
    scene = cardScene(['ХАРДКОР\n\nОдно сердце. Ни одной флешки. Яма — смерть.\n\nНикаких чекпоинтов: умер — и всё с первого уровня. Обычное сохранение не трогается.'], () => gotoLevel(1), 3);
  } });
  items.push({ s: 'КОНСТРУКТОР (E)', col: '#ffd23e', f: () => { scene = makerMenuScene(); } });
  items.push({ s: 'НАСТРОЙКИ', f: () => { scene = settingsScene(() => { scene = titleScene(); }); } });
  const BW = 160, BH = 15, X = (VW - BW) / 2, Y0 = 74, STEP = 17;
  let t = 0, sel = 0;
  return {
    pad: 'none',
    music: 'Menu',
    update() {
      t++;
      if (t < 15) return;
      if (codes.has('KeyE')) { scene = makerMenuScene(); return; }
      const n = items.length;
      if (codes.has('ArrowUp') || codes.has('KeyW')) sel = (sel + n - 1) % n;
      if (codes.has('ArrowDown') || codes.has('KeyS')) sel = (sel + 1) % n;
      if (codes.has('Enter') || codes.has('Space') || codes.has('KeyZ')) { items[sel].f(); return; }
      if (click) { const i = Math.floor((click.y - Y0) / STEP); if (i >= 0 && i < n && click.y - Y0 - i * STEP < BH && click.x >= X && click.x < X + BW) { sel = i; items[i].f(); } }
    },
    draw() {
      drawBG(3, 0);
      text('ХОЛОС', 160, 20, '#fff', 24, 'center');
      text('ЯДРО 8', 160, 49, '#19ff9c', 16, 'center');
      spr(IMG.holos, 30, 100 + Math.sin(frame * 0.08) * 3, false, 3);
      spr(IMG.nos, 250, 90 + Math.cos(frame * 0.06) * 4, true, 2);
      items.forEach((it, i) => {
        const y = Y0 + i * STEP, on = i === sel;
        box(X, y, BW, BH, on ? '#19ff9c' : '#2b2a33', on ? '#fff' : it.col || '#9a9aa6');
        text(it.s, 160, y + 5, on ? '#17161c' : it.col || '#fff', 6, 'center');
      });
      text('↑ ↓ ВЫБОР   ENTER   В ИГРЕ: ESC ПАУЗА', 160, 168, '#9a9aa6', 6, 'center');
    },
  };
}

// ---------- сюжетные карточки
function cardScene(pages, done, z = 3) {
  let i = 0, t = 0;
  return {
    update() {
      t++;
      if (!anyPressed) return;
      if (t * 0.8 < pages[i].length) t = 1e5;
      else { i++; t = 0; if (i >= pages.length) { i = pages.length - 1; t = 1e5; done(); } }
    },
    draw() {
      drawBG(z, frame * 0.3);
      ctx.fillStyle = '#000000b0'; ctx.fillRect(0, 0, VW, VH);
      let left = Math.floor(t * 0.8), y = 26;
      for (const l of wrap(pages[i], 280, 8)) {
        if (left <= 0) break;
        text(l.slice(0, left), 20, y, y === 26 ? '#19ff9c' : '#fff', 8);
        left -= l.length + 1; y += 12;
      }
      if (t * 0.8 >= pages[i].length && frame % 60 < 40) text('ДАЛЬШЕ ▶', 300, 164, '#9a9aa6', 6, 'right');
    },
  };
}

// ---------- поражение: Ведмедик Бо
const again = () => HC ? 'ХАРДКОР: НАЧНЁШЬ С 1 УРОВНЯ' : 'НАЖМИ, ЧТОБЫ ПОПРОБОВАТЬ СНОВА';
function bubble(x, y, w, lines) {
  box(x, y, w, lines.length * 12 + 8, '#fff', '#17161c');
  lines.forEach((l, i) => text(l, x + w / 2, y + 6 + i * 12, '#17161c', 8, 'center', false));
}
function deathScene(n, c) {
  if (c === 'navy' || c === 'putin') return duoDeathScene(n, c);
  let t = 0; const dyn = c === 'dynex', bx = dyn ? 186 : 180, by = dyn ? 62 : 34;   // «порвал туза» — это Дынекс, а не медведь
  return {
    update() {
      t++;
      if (t === 62) sfx(90, 0.25, 'sawtooth', 0, 0.08);
      if (t === 105) sfx(200, 0.3, 'square', -120);
      if (t > 150 && anyPressed) respawn(n);
    },
    draw() {
      ctx.fillStyle = '#120a0a'; ctx.fillRect(0, 0, VW, VH);
      const open = t > 30 && t < 62, jy = by + (t >= 62 && t < 90 ? Math.sin(t) * 2 : 0);
      if (dyn) spr(open ? IMG.dynexOpen : IMG.dynex, bx, jy, true, 5);
      else spr(open ? IMG.bearOpen : IMG.bear, bx, jy, false, 5);
      if (t < 60) { const k = t / 60, mx = dyn ? 40 : 42, my = dyn ? 40 : 50; spr(IMG.holos, 40 + (bx + mx - 40) * k, 120 + (by + my - 120) * k - Math.sin(k * 3.14) * 40, false, 2 - k); }
      if (c === 'dynex') text('ДЫНЕКС ПОРВАЛ ТУЗА', 160, 8, '#ff5a5a', 8, 'center');
      if (t > 100) bubble(16, 60, 150, ['ФУ БЛЯ,', 'НЕВКУСНО']);
      if (t > 150 && frame % 60 < 40) text(again(), 160, 166, '#9a9aa6', 6, 'center');
    },
  };
}

// ---------- поражение: Навальный (в зелёнке) и В. В. Путин. who — кто нанёс последний удар
function kremlinBG() {
  ctx.fillStyle = '#0d0a1a'; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = (frame + i * 11) % 90 < 70 ? '#ffffff' : '#6b6a76'; ctx.fillRect(Math.floor(hash(i, 1) * VW), Math.floor(hash(i, 2) * 100), 1, 1); }
  // башня с часами и красной звездой
  ctx.fillStyle = '#5e1420'; ctx.fillRect(140, 46, 40, 80); ctx.fillRect(147, 32, 26, 14);
  for (let k = 0; k < 5; k++) ctx.fillRect(160 - 12 + k * 2.4, 32 - k * 2, 24 - k * 4.8, 2);
  ctx.fillStyle = frame % 40 < 30 ? '#ff3b3b' : '#c02020'; ctx.fillRect(157, 20, 6, 4); ctx.fillRect(155, 21, 10, 2); ctx.fillRect(159, 18, 2, 8);
  ctx.fillStyle = '#f3e6c0'; ctx.fillRect(153, 56, 14, 14); ctx.fillStyle = '#17161c'; ctx.fillRect(159, 58, 2, 6); ctx.fillRect(159, 62, 5, 2);
  // кремлёвская стена с зубцами
  ctx.fillStyle = '#8a1c2c'; ctx.fillRect(0, 118, VW, 62);
  for (let x = 0; x < VW; x += 16) { ctx.fillRect(x + 3, 106, 10, 12); ctx.fillStyle = '#0d0a1a'; ctx.fillRect(x + 7, 106, 2, 4); ctx.fillStyle = '#8a1c2c'; }
  ctx.fillStyle = '#6b1420';
  for (let y = 124, i = 0; y < 160; y += 6, i++) { ctx.fillRect(0, y, VW, 1); for (let x = (i % 2) * 8; x < VW; x += 16) ctx.fillRect(x, y, 1, 6); }
  ctx.fillStyle = '#2b2a33'; ctx.fillRect(0, 160, VW, 20); ctx.fillStyle = '#4a4858'; ctx.fillRect(0, 160, VW, 2);
}
function duoDeathScene(n, who) {
  let t = 0; const drips = [], put = who === 'putin';
  const hx = 146, hy = 128;   // где оказывается Холос (масштаб 2)
  return {
    update() {
      t++;
      if (t === 50) sfx(put ? 90 : 900, put ? 0.4 : 0.15, put ? 'sawtooth' : 'square', put ? -40 : 0, 0.07);
      if (t === 90) sfx(220, 0.3, 'square', -100);
      if (frame % 5 === 0) drips.push({ x: 236 + Math.random() * 40, y: 92 + Math.random() * 26, vy: 0.2, c: Math.random() < 0.5 ? '#2ecc71' : '#20a04a' });
      for (const d of drips) { d.vy += 0.08; d.y += d.vy; }
      while (drips.length && drips[0].y > 160) drips.shift();
      if (t > 170 && anyPressed) respawn(n);
    },
    draw() {
      kremlinBG();
      // лужа зелёнки под Навальным
      const pw = Math.min(70, 20 + t / 4); ctx.fillStyle = '#20a04a'; ctx.fillRect(256 - pw / 2, 159, pw, 3); ctx.fillStyle = '#2ecc71'; ctx.fillRect(256 - pw / 2 + 4, 159, pw - 8, 1);
      spr(IMG.putin, 40, 88, false, 4);
      spr(IMG.navyGreen, 232, 88, true, 4);
      for (const d of drips) { ctx.fillStyle = d.c; ctx.fillRect(d.x, d.y, 2, 3); }
      // Холос прилетает в середину
      const k = Math.min(1, t / 50);
      spr(IMG.holos, 20 + (hx - 20) * k, 140 + (hy - 140) * k - Math.sin(k * 3.14) * 50, false, 2);
      if (put) {
        // решётка опускается на Холоса
        const cy = Math.min(118, -60 + Math.max(0, t - 40) * 6);
        if (t > 40) {
          ctx.fillStyle = '#4a4858'; ctx.fillRect(138, cy, 44, 3); ctx.fillRect(138, cy + 40, 44, 3);
          for (let x = 138; x <= 180; x += 7) { ctx.fillStyle = '#17161c'; ctx.fillRect(x, cy, 3, 43); ctx.fillStyle = '#9a9aa6'; ctx.fillRect(x, cy, 1, 43); }
        }
        if (t > 80) bubble(8, 40, 128, ['ПОСИДИШЬ,', 'ПОДУМАЕШЬ.']);
        if (t > 120) bubble(184, 40, 128, ['ДРУЗЬЯ, ЭТО', 'БЕСПРЕДЕЛ!']);
        text('В. В. ПУТИН ПОСАДИЛ ХОЛОСА', 160, 8, '#ff5a5a', 8, 'center');
      } else {
        // Навальный снимает расследование: телефон и мигающий REC
        if (t > 40) {
          ctx.fillStyle = '#17161c'; ctx.fillRect(220, 112, 12, 18); ctx.fillStyle = '#4aa3ff'; ctx.fillRect(222, 114, 8, 13);
          if (frame % 40 < 26) { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(214, 100, 5, 5); text('REC', 222, 99, '#fff', 6); }
        }
        if (t > 80) bubble(184, 40, 128, ['ДРУЗЬЯ, ВОТ', 'ДВОРЕЦ ХОЛОСА!']);
        if (t > 120) bubble(8, 40, 128, ['НЕ ЗНАЮ', 'ТАКОГО.']);
        text('НАВАЛЬНЫЙ СНЯЛ РАССЛЕДОВАНИЕ', 160, 8, '#2ecc71', 8, 'center');
      }
      if (t > 170 && frame % 60 < 40) text(again(), 160, 170, '#9a9aa6', 6, 'center');
    },
  };
}

// ---------- концовки
function endingScene() {
  let t = 0;
  if (HC) { try { localStorage.setItem('holos_hc_win', '1'); } catch (e) { } }
  const stars = [...Array(70)].map((_, i) => ({ x: hash(i, 1) * VW, y: hash(i, 2) * VH, s: 0.3 + hash(i, 3) * 1.5 }));
  return {
    music: 'Final',
    update() {
      t++;
      if (t === 90) sfx(200, 1.2, 'triangle', 1400, 0.08);
      if (t > 90) for (const s of stars) { s.y += s.s * (t < 300 ? 3 : 0.15); if (s.y > VH) s.y -= VH; }
      if (t > 520 && anyPressed) { save(1); scene = titleScene(); }
    },
    draw() {
      if (t < 90) {
        drawBG(3, 0);
        spr(IMG.holos, 153 + (Math.random() - 0.5) * (t / 15), 90 + (Math.random() - 0.5) * (t / 15), false);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, (t - 50) / 40)})`; ctx.fillRect(0, 0, VW, VH);
        return;
      }
      ctx.fillStyle = '#04030a'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#fff'; for (const s of stars) ctx.fillRect(s.x, s.y, 1, t < 300 ? 1 + s.s * 3 : 1);
      const earth = () => {
        const ey = t < 300 ? 400 : Math.max(250, 400 - (t - 300) * 3);
        ctx.fillStyle = '#2f7fc4'; ctx.beginPath(); ctx.arc(160, ey, 130, 0, 7); ctx.fill();
        ctx.fillStyle = '#5fae4a'; ctx.fillRect(100, ey - 118, 40, 14); ctx.fillRect(170, ey - 124, 30, 10); ctx.fillRect(130, ey - 100, 60, 12);
      };
      if (t < 300) { earth(); spr(IMG.sphere, 146, 76 + Math.sin(t * 0.3) * 2, false, 2); }
      else {
        const a = (t - 300) * 0.02, sx = 153 + Math.cos(a) * 120, sy = 96 + Math.sin(a) * 12;
        if (Math.sin(a) < 0) { spr(IMG.sphere, sx, sy); earth(); } else { earth(); spr(IMG.sphere, sx, sy); }
        text('СФЕРА ХОЛОСА', 160, 16, '#fff', 8, 'center');
        text('ВЫШЛА НА ОРБИТУ', 160, 30, '#fff', 8, 'center');
        if (t > 420) text('КОНЕЦ', 160, 52, '#19ff9c', 16, 'center');
        if (t > 450 && HC) text('ХАРДКОР ПРОЙДЕН!', 160, 74, '#ff5a5a', 8, 'center');
        if (t > 520 && frame % 60 < 40) text('НАЖМИ, ЧТОБЫ ВЕРНУТЬСЯ В МЕНЮ', 160, 168, '#9a9aa6', 6, 'center');
      }
      if (t < 110) { ctx.fillStyle = `rgba(255,255,255,${(110 - t) / 20})`; ctx.fillRect(0, 0, VW, VH); }
    },
  };
}
function crystalScene() {
  let t = 0;
  return {
    update() { t++; if (t === 40) sfx(1200, 0.6, 'triangle', -800, 0.06); if (t > 200 && anyPressed) scene = titleScene(); },
    draw() {
      drawBG(4, 0);
      ctx.fillStyle = '#000000a0'; ctx.fillRect(0, 0, VW, VH);
      const cx = 100, cy = 92, g = Math.min(1, t / 40);
      spr(IMG.holos, cx - 14, cy - 16, false, 2);
      ctx.fillStyle = `rgba(247,241,250,${0.55 * g})`;
      ctx.beginPath(); ctx.moveTo(cx, cy - 44 * g); ctx.lineTo(cx + 26 * g, cy - 20 * g); ctx.lineTo(cx + 26 * g, cy + 22 * g); ctx.lineTo(cx, cy + 40 * g); ctx.lineTo(cx - 26 * g, cy + 22 * g); ctx.lineTo(cx - 26 * g, cy - 20 * g); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,184,216,${0.35 * g})`; ctx.fillRect(cx - 20 * g, cy - 18 * g, 6, 36 * g);
      for (let i = 0; i < 5; i++) if ((frame + i * 17) % 40 < 8) { ctx.fillStyle = '#fff'; ctx.fillRect(cx - 24 + hash(i, 4) * 48, cy - 36 + hash(i, 6) * 70, 2, 2); }
      spr(IMG.bear, 210, 60, true, 3);
      if (t > 70) bubble(150, 14, 160, ['ФУ БЛЯ, НЕВКУСНО.', 'ЗАСОЛЮ НА ПОТОМ.']);
      if (t > 120) { text('ХОЛОС ЗАКЛЮЧЁН', 100, 140, '#fff', 8, 'center'); text('В СОЛЕВОЙ КРИСТАЛЛ.', 100, 152, '#fff', 8, 'center'); text('НАВЕЧНО.', 100, 164, '#ffb8d8', 8, 'center'); }
    },
  };
}

// ---------- мини-игра: заплыв (между 3 и 4 уровнями)
function drawBoat(x, y, dir, alert) {
  ctx.save(); ctx.translate(Math.round(x + 20), y); ctx.scale(dir > 0 ? 1 : -1, 1);
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
  r(-21, -9, 42, 12, '#17161c'); r(-20, -8, 40, 8, '#e8edf5'); r(-20, -3, 40, 3, '#2b5ea8'); r(16, -9, 5, 5, '#e8edf5');
  r(-8, -18, 16, 10, '#17161c'); r(-7, -17, 14, 9, '#e8edf5'); r(-5, -15, 10, 4, '#4aa3ff');
  r(0, -26, 2, 8, '#17161c'); r(-2, -29, 6, 3, frame % 20 < 10 ? '#e03030' : '#4aa3ff');
  r(-17, -6, 6, 1, '#17161c');
  ctx.restore();
  if (alert) text('!', x + 20, y - 40, '#ff3b3b', 8, 'center');
}
function swimScene(done) {
  const WW = 2800, SURF = 44, FLOOR = 166, R = rng(777);
  const mines = [], boats = [], charges = [], blasts = [], fx = [];
  for (let x = 240; x < WW - 200; x += 100 + R() * 45) {
    const two = R() < 0.45, y1 = 60 + R() * (two ? 36 : 88);
    mines.push({ x, y0: y1, ph: R() * 6, ax: R() < 0.35 ? 20 : 0 });
    if (two) mines.push({ x: x + R() * 16 - 8, y0: y1 + 64 + R() * 16, ph: R() * 6, ax: R() < 0.35 ? 20 : 0 });
  }
  for (const bx of [520, 980, 1440, 1900, 2360]) boats.push({ x0: bx - 140, x1: bx + 140, x: bx, dir: 1, cd: 70, near: false });
  const S = { x: 24, y: 100, vx: 0, vy: 0, hp: HC ? 1 : 3, max: HC ? 1 : 3, inv: 0, face: 1 };
  let st = 0, t = 0, et = 0, shk = 0, why = '';
  const mpos = m => [m.x + Math.sin(t * 0.03 + m.ph) * m.ax, m.y0 + Math.sin(t * 0.05 + m.ph) * 8];
  const boom = (x, y, n) => { for (let i = 0; i < n; i++) fx.push({ x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 18 + Math.random() * 14, col: ['#ffd23e', '#ff8a2a', '#fff'][i % 3] }); };
  const hit = reason => {
    if (S.inv > 0 || st) return;
    S.hp--; S.inv = 90; shk = 8; why = reason; sfx(120, 0.4, 'sawtooth', -60, 0.08);
    if (S.hp <= 0) { st = 2; et = 0; }
  };
  return {
    pad: 'swim', pausable: true, music: 'Odessa',
    dbg: () => ({ S, mines, boats, charges, blasts, t, mpos, WW, st }), // для автотестов
    update() {
      t++; if (shk) shk--;
      for (const p of fx) { p.x += p.vx; p.y += p.vy; p.life--; }
      for (let i = fx.length; i--;) if (fx[i].life <= 0) fx.splice(i, 1);
      if (st === 1) { if (++et > 110) done(); return; }
      if (st === 2) { et++; if (et > 60 && anyPressed) { if (HC) startLevel(1); else scene = swimScene(done); } return; }
      const ax = keys.right - keys.left, ay = keys.down - keys.jump;
      S.vx += (ax * 1.7 - S.vx) * 0.12; S.vy += (ay * 1.7 - S.vy) * 0.12;
      if (ax) S.face = ax;
      S.x = clamp(S.x + S.vx, 6, WW - 20); S.y = clamp(S.y + S.vy, SURF + 8, FLOOR - 8);
      if (S.inv > 0) S.inv--;
      if (t % 14 === 0) fx.push({ x: S.x + 6 + S.face * 6, y: S.y + 2, vx: 0, vy: -0.6, life: 30, col: '#cfeaff' });
      const cx = S.x + 6, cy = S.y + 4.5;
      for (const m of mines) {
        if (m.dead) continue;
        const [mx, my] = mpos(m);
        if (Math.hypot(cx - mx, cy - my) < 11) { m.dead = true; boom(mx, my, 16); blasts.push({ x: mx, y: my, t: 0 }); sfx(90, 0.5, 'sawtooth', -40, 0.09); hit('ХОЛОС ПОДОРВАЛСЯ НА МИНЕ'); }
      }
      for (const b of boats) {
        b.x += b.dir * 0.45; if (b.x < b.x0) b.dir = 1; if (b.x > b.x1) b.dir = -1;
        b.near = Math.abs(cx - (b.x + 20)) < 95;
        if (b.near && --b.cd <= 0) { b.cd = 80; charges.push({ x: b.x + 20, y: SURF + 6, ty: clamp(cy + (Math.random() - 0.5) * 36, 66, 150) }); sfx(300, 0.1, 'triangle', -150, 0.04); }
      }
      for (const c of charges) {
        c.y += 1.3;
        if (c.y >= c.ty) { c.dead = true; blasts.push({ x: c.x, y: c.y, t: 0 }); boom(c.x, c.y, 18); sfx(80, 0.5, 'sawtooth', -30, 0.09); shk = 6; }
      }
      for (const bl of blasts) { bl.t++; if (bl.t < 14 && Math.hypot(cx - bl.x, cy - bl.y) < 8 + bl.t * 1.4) hit('БЕРЕГОВАЯ ОХРАНА ПОПАЛА БОМБОЙ'); }
      for (let i = charges.length; i--;) if (charges[i].dead) charges.splice(i, 1);
      for (let i = blasts.length; i--;) if (blasts[i].t > 22) blasts.splice(i, 1);
      if (S.x >= WW - 60) { st = 1; et = 0; sfx(600, 0.5, 'triangle', 600, 0.07); }
    },
    draw() {
      const cam = Math.round(clamp(S.x - 110, 0, WW - VW)), sx = shk && SET.shake ? Math.round((Math.random() - 0.5) * shk) : 0;
      // небо и далёкие берега
      const sky = ctx.createLinearGradient(0, 0, 0, SURF); sky.addColorStop(0, '#7cc6ee'); sky.addColorStop(1, '#d6efff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, SURF + 2);
      ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) ctx.fillRect(((i * 120 + t * 0.15 - cam * 0.1) % 380 + 380) % 380 - 30, 8 + i * 9, 26, 5);
      if (cam < 400) skyline(cam * 0.3, '#8fb3cc', null, 26, 14, 18, 1, SURF);
      if (cam > WW - 700) { ctx.fillStyle = '#d9bf86'; for (let x = 0; x < VW; x += 8) { const h = 4 + hash(x / 8, 3) * 9; ctx.fillRect(x, SURF - h * clamp((cam - (WW - 700)) / 300, 0, 1), 8, h); } }
      ctx.fillStyle = '#d6efff'; ctx.fillRect(0, SURF, VW, 4);
      // море
      const sea = ctx.createLinearGradient(0, SURF, 0, VH); sea.addColorStop(0, '#3a9fe0'); sea.addColorStop(1, '#08224a');
      ctx.fillStyle = sea; ctx.fillRect(0, SURF + 2, VW, VH);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 5; i++) { const x = ((i * 84 + t * 0.25 - cam * 0.5) % 420 + 420) % 420 - 50; ctx.beginPath(); ctx.moveTo(x, SURF + 2); ctx.lineTo(x + 18, SURF + 2); ctx.lineTo(x + 70, VH); ctx.lineTo(x + 6, VH); ctx.fill(); }
      ctx.fillStyle = '#ffffff55'; for (let i = 0; i < 12; i++) ctx.fillRect(((i * 41 - cam + t * 0.5) % 340 + 340) % 340 - 10, SURF + 2 + (i % 3), 8, 1);
      ctx.save(); ctx.translate(-cam + sx, 0);
      // дно
      ctx.fillStyle = '#5a4a32'; ctx.fillRect(cam, FLOOR + 8, VW, VH);
      for (let x = Math.floor(cam / 20) * 20; x < cam + VW + 20; x += 20) {
        const h = 2 + hash(x / 20, 9) * 6; ctx.fillStyle = '#4a3c28'; ctx.fillRect(x, FLOOR + 8 - h, 12, h);
        if (hash(x / 20, 4) > 0.6) { ctx.fillStyle = '#2f8f4a'; ctx.fillRect(x + 4, FLOOR - 4 - hash(x, 2) * 8 + Math.sin(t * 0.05 + x) * 1, 2, 12); }
      }
      // причал в Одессе и пляж на другом берегу
      ctx.fillStyle = '#8b8b95'; ctx.fillRect(-20, SURF - 10, 46, VH); ctx.fillStyle = '#6b6b75'; ctx.fillRect(24, SURF - 10, 3, VH);
      ctx.fillStyle = '#e8cf94'; ctx.beginPath(); ctx.moveTo(WW - 190, FLOOR + 8); ctx.lineTo(WW - 30, SURF + 4); ctx.lineTo(WW + 60, SURF + 4); ctx.lineTo(WW + 60, VH); ctx.lineTo(WW - 190, VH); ctx.fill();
      ctx.fillStyle = '#d9bf86'; ctx.fillRect(WW - 40, SURF - 10, 120, 14);
      // мины
      for (const m of mines) {
        if (m.dead || Math.abs(m.x - cam - 160) > 220) continue;
        const [mx, my] = mpos(m);
        spr(IMG.mine, mx - 6.5, my - 6.5);
        ctx.fillStyle = frame % 40 < 20 ? '#ff3b3b' : '#6b1010'; ctx.fillRect(Math.round(mx) - 1, Math.round(my) - 1, 2, 2);
      }
      // глубинные бомбы и взрывы
      for (const c of charges) {
        ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(c.x) - 3, Math.round(c.y) - 4, 7, 9);
        ctx.fillStyle = (c.ty - c.y < 24 && frame % 6 < 3) ? '#ff3b3b' : '#6b6b75'; ctx.fillRect(Math.round(c.x) - 2, Math.round(c.y) - 3, 5, 7);
      }
      for (const bl of blasts) {
        const r = 8 + bl.t * 1.4; ctx.fillStyle = `rgba(255,${200 - bl.t * 6},60,${Math.max(0, 0.7 - bl.t / 32)})`;
        ctx.beginPath(); ctx.arc(bl.x, bl.y, r, 0, 7); ctx.fill();
      }
      for (const b of boats) drawBoat(b.x, SURF, b.dir, b.near);
      // игрок
      if (st !== 2 && S.inv % 6 < 3) {
        ctx.save(); ctx.translate(Math.round(S.x + 6), Math.round(S.y + 4)); ctx.rotate(S.face > 0 ? Math.PI / 2 : -Math.PI / 2);
        ctx.drawImage(IMG.holos, -7, -8 + (Math.abs(S.vx) > 0.4 ? Math.sin(t * 0.4) : 0)); ctx.restore();
      }
      for (const p of fx) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
      ctx.restore();
      // интерфейс
      for (let i = 0; i < S.max; i++) spr(i < S.hp ? IMG.heart : IMG.heartOff, 6 + i * 13, 6, false, 2);
      text('ДО БЕРЕГА', 314, 5, '#17161c', 6, 'right');
      box(214, 14, 100, 5, '#2b2a33', '#000'); ctx.fillStyle = '#19ff9c'; ctx.fillRect(214, 14, 100 * clamp(S.x / (WW - 60), 0, 1), 5);
      if (t < 200 && !st) text('ПЛЫВИ ВПРАВО. БЕРЕГОВАЯ ОХРАНА ДРОЖИТ.', 160, 28, '#17161c', 6, 'center');
      if (st === 1) { ctx.fillStyle = '#00000088'; ctx.fillRect(0, 60, VW, 50); text('БЕРЕГ!', 160, 68, '#19ff9c', 16, 'center'); text('ПОХОЖЕ, ИЗРАИЛЬ...', 160, 92, '#fff', 8, 'center'); }
      if (st === 2) {
        ctx.fillStyle = '#000000b0'; ctx.fillRect(0, 50, VW, 70);
        text(why, 160, 62, '#ff5a5a', 8, 'center'); text('ХОЛОС ИДЁТ КО ДНУ.', 160, 80, '#fff', 8, 'center');
        if (et > 60 && frame % 60 < 40) text(again(), 160, 100, '#9a9aa6', 6, 'center');
      }
    },
  };
}

// ---------- мини-игра: поддельный паспорт (между 6 и 7 уровнями), как в Papers, Please
function stampIcon(shape, c, x, y) {
  ctx.fillStyle = c;
  if (shape === 'circle') { ctx.beginPath(); ctx.arc(x + 5, y + 5, 5, 0, 7); ctx.fill(); }
  else if (shape === 'square') ctx.fillRect(x + 1, y + 1, 8, 8);
  else if (shape === 'diamond') for (let i = 0; i < 10; i++) { const w = 2 + 2 * Math.min(i, 9 - i); ctx.fillRect(x + 5 - w / 2, y + i, w, 1); }
  else { ctx.fillRect(x + 4, y, 2, 10); ctx.fillRect(x, y + 4, 10, 2); for (let i = 0; i < 10; i++) { ctx.fillRect(x + i, y + i, 1, 1); ctx.fillRect(x + 9 - i, y + i, 1, 1); } }
}
function thumb(key, x, y, maxH) {
  const img = IMG[key], k = Math.min(1, maxH / img.height);
  ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(img.width * k), Math.round(img.height * k));
}
function passportScene(done) {
  const STAMPS = [['СИНЯЯ ЗВЕЗДА', '#2f6fe0', 'star'], ['КРАСНЫЙ КРУГ', '#e03030', 'circle'], ['ЗЕЛЁНЫЙ РОМБ', '#2ecc71', 'diamond'], ['ЖЁЛТЫЙ КВАДРАТ', '#ffd23e', 'square']];
  const PHOTOS = [['ХОЛОС', 'holos'], ['ДЫНЕКС', 'dynex'], ['МРДРНОС', 'nos'], ['НИКИТА', 'yarosh']];
  const R = rng((Math.random() * 1e9) | 0);
  const pick = a => a[Math.floor(R() * a.length)];
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const digits = k => [...Array(k)].map(() => Math.floor(R() * 10)).join('');
  const d0 = 1 + Math.floor(R() * 9), bad0 = d0 % 9 + 1;
  const stamp = pick(STAMPS), birth = 1970 + Math.floor(R() * 36), expiry = 2028 + Math.floor(R() * 8);
  const row = (key, label, items, ok, kind, why, h = 14) => {
    const opts = shuf(items), okIdx = opts.indexOf(ok); let cur;
    do cur = Math.floor(R() * opts.length); while (cur === okIdx);
    return { key, label, opts, ok: okIdx, cur, kind, why, h };
  };
  const rows = [
    row('country', 'СТРАНА', ['ИЗРАИЛЬ', 'ГАЗА', 'ОДЕССА', 'МЕТА-МИР'], 'ИЗРАИЛЬ', 'text', 'СТРАНА НЕ ТА.'),
    row('stamp', 'ПЕЧАТЬ', STAMPS, stamp, 'stamp', 'ПЕЧАТЬ НЕ ТА.'),
    row('photo', 'ФОТО', PHOTOS, PHOTOS[0], 'photo', 'ЭТО НЕ ХОЛОС НА ФОТО.', 18),
    row('num', 'НОМЕР', [d0 + digits(6), bad0 + digits(6), d0 + digits(5), d0 + digits(7)], null, 'text', 'НОМЕР НЕВЕРНЫЙ.'),
    row('birth', 'РОДИЛСЯ', [String(birth), '2009', '2014', '2023'], String(birth), 'text', 'СЛИШКОМ МОЛОД.'),
    row('exp', 'ДО', [String(expiry), '2015', '2025', '2044'], String(expiry), 'text', 'СРОК НЕ ТОТ.'),
  ];
  rows[3].ok = rows[3].opts.findIndex(o => o.length === 7 && o[0] === String(d0));
  do rows[3].cur = Math.floor(R() * 4); while (rows[3].cur === rows[3].ok);
  let ry = 31; for (const r of rows) { r.y = ry; ry += r.h + 2; }
  const rules = [['СТРАНА: ИЗРАИЛЬ'], ['ПЕЧАТЬ: ' + stamp[0], () => 'stamp'], ['ФОТО: КАК У ХОЛОСА', () => 'photo'], ['НОМЕР: 7 ЦИФР, ПЕРВАЯ ' + d0], ['РОДИЛСЯ ДО 2008'], ['СРОК: 2027-2036']];
  const TIME = 4800, BTN = { x: 246, y: 146, w: 68, h: 24 };
  let t = 0, sel = 0, st = 0, et = 0, ok = false, msg = 'ДОКУМЕНТЫ.';
  const val = r => r.opts[r.cur];
  const submit = reason => {
    if (st) return;
    const bad = rows.find(r => r.cur !== r.ok);
    ok = !reason && !bad; st = 1; et = 0;
    msg = ok ? 'ОДАА!' : (reason || bad.why) + ' НЕТ.';
  };
  const change = (r, d) => { r.cur = (r.cur + d + r.opts.length) % r.opts.length; sfx(500 + r.cur * 40, 0.04, 'square', 0, 0.03); };
  return {
    pad: 'none', pausable: true, music: 'Papers PLease',
    rows, // для тестов
    update() {
      t++;
      if (st === 1) {
        et++;
        if (et === 18) sfx(ok ? 700 : 110, 0.3, ok ? 'triangle' : 'sawtooth', ok ? 500 : -60, 0.09);
        if (et > 120) { if (ok) done(); else scene = failScene(msg, () => { if (HC) startLevel(1); else scene = passportScene(done); }); }
        return;
      }
      if (t > TIME) { submit('ВРЕМЯ ВЫШЛО.'); return; }
      if (codes.has('ArrowUp') || codes.has('KeyW')) sel = (sel + rows.length - 1) % rows.length;
      if (codes.has('ArrowDown') || codes.has('KeyS')) sel = (sel + 1) % rows.length;
      if (codes.has('ArrowLeft') || codes.has('KeyA')) change(rows[sel], -1);
      if (codes.has('ArrowRight') || codes.has('KeyD')) change(rows[sel], 1);
      if (codes.has('Enter') || codes.has('Space')) { submit(); return; }
      if (click) {
        if (inside(click, BTN)) { submit(); return; }
        rows.forEach((r, i) => { if (inside(click, { x: 172, y: r.y, w: 138, h: r.h })) { sel = i; change(r, click.x < 241 ? -1 : 1); } });
      }
    },
    draw() {
      ctx.fillStyle = '#26222e'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#3a3248'; ctx.fillRect(0, 138, VW, 42);
      text('ГРАНИЦА ИЗРАИЛЯ', 6, 4, '#19ff9c', 6);
      text('ВРЕМЯ', 172, 4, '#9a9aa6', 6);
      box(206, 4, 108, 6, '#2b2a33', '#000'); const left = clamp(1 - t / TIME, 0, 1); ctx.fillStyle = left > 0.3 ? '#19ff9c' : '#ff5a5a'; ctx.fillRect(206, 4, 108 * left, 6);
      // правила
      box(4, 16, 110, 120, '#f1ead2', '#17161c');
      text('ПРАВИЛА ВЪЕЗДА', 59, 20, '#a02020', 6, 'center');
      let y = 31;
      for (const [s, ic] of rules) {
        const lines = wrap(s, ic ? 84 : 100, 6);
        lines.forEach((l, i) => text(l, 8, y + i * 8, '#17161c', 6));
        if (ic) { if (ic() === 'stamp') stampIcon(stamp[2], stamp[1], 96, y + 2); else thumb('holos', 96, y, 16); }
        y += Math.max(lines.length * 8, ic ? 16 : 0) + 4;
      }
      // паспорт
      box(118, 16, 198, 120, '#f1ead2', '#2d4c8f');
      ctx.fillStyle = '#2d4c8f'; ctx.fillRect(118, 16, 198, 12);
      text('ПАСПОРТ ХОЛОСА', 217, 19, '#fff', 6, 'center');
      rows.forEach((r, i) => {
        text(r.label, 124, r.y + (r.h - 6) / 2, '#17161c', 6);
        box(172, r.y, 138, r.h, i === sel ? '#fff7c2' : '#fff', i === sel ? '#e0a000' : '#17161c');
        text('<', 176, r.y + (r.h - 6) / 2, '#2d4c8f', 6); text('>', 301, r.y + (r.h - 6) / 2, '#2d4c8f', 6);
        const v = val(r);
        if (r.kind === 'text') text(v, 241, r.y + 4, '#17161c', 6, 'center');
        else if (r.kind === 'stamp') { stampIcon(v[2], v[1], 190, r.y + 2); text(v[0], 246, r.y + 4, '#17161c', 6, 'center'); }
        else thumb(v[1], 233, r.y + 1, 16);
      });
      // мельви
      spr(IMG.melvi, 10, 142, false, 2);
      text(MELVI + ':', 48, 141, '#19ff9c', 6);
      box(48, 150, 190, 22, '#fff', '#17161c');
      const ls = wrap(msg, 180, 6); ls.slice(0, 2).forEach((l, i) => text(l, 53, 154 + i * 8, '#17161c', 6));
      // кнопка
      box(BTN.x, BTN.y, BTN.w, BTN.h, st ? '#2b2a33' : '#19ff9c', '#fff'); text('ПОДАТЬ', BTN.x + BTN.w / 2, BTN.y + 9, st ? '#9a9aa6' : '#17161c', 6, 'center');
      // штамп вердикта
      if (st === 1 && et > 14) {
        const k = clamp((et - 14) / 8, 0, 1);
        ctx.save(); ctx.translate(217, 70 - (1 - k) * 60); ctx.rotate(-0.22); ctx.globalAlpha = 0.5 + k * 0.5;
        const txt = ok ? 'ОДАА' : 'НЕТ', col = ok ? '#1fae5a' : '#d02020';
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.strokeRect(-48, -16, 96, 32); text(txt, 0, -8, col, 16, 'center'); ctx.restore();
      }
    },
  };
}
function failScene(reason, retry) {
  let t = 0;
  return {
    pad: 'none',
    update() { t++; if (t === 30 || t === 36) sfx(1400, 0.05, 'square', -900, 0.08); if (t > 160 && anyPressed) retry(); },
    draw() {
      ctx.fillStyle = '#120a0a'; ctx.fillRect(0, 0, VW, VH);
      spr(IMG.melvi, 50, 40, false, 4);
      spr(IMG.holos, 210 + (t > 30 ? Math.sin(t * 1.3) * 2 : 0), 70, false, 3);
      if (t > 20) { const ls = wrap(reason, 140, 8); bubble(100, 24, 160, ls); }
      if (t > 30 && t < 60) text('ЩЁЛК!', 190, 60, '#fff', 8, 'center');
      if (t > 70) { text('ХОЛОСУ СДЕЛАЛИ ОБРЕЗАНИЕ.', 160, 128, '#ff5a5a', 8, 'center'); text('ХОЛОС ПРОИГРАЛ.', 160, 142, '#fff', 8, 'center'); }
      if (t > 160 && frame % 60 < 40) text(again(), 160, 166, '#9a9aa6', 6, 'center');
    },
  };
}

// ---------- цикл
scene = captchaScene();
let last = 0, acc = 0;
function tick() {
  // пауза: Esc, P или кнопка II; вход в неё съедает нажатие, чтобы оно не попало в саму паузу
  if (scene.pausable && (codes.has('Escape') || codes.has('KeyP') || (click && inside(click, PAUSE_BTN)))) {
    scene = pauseScene(scene); sfx(300, 0.06, 'square', 0, 0.03);
    click = null; anyPressed = false; jumpPressed = false; codes.clear();
  }
  scene.update(); musicTick(); jumpPressed = false; anyPressed = false; click = null; codes.clear(); frame++;
}
let padMode = null;
function render() {
  ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; scene.draw();
  if (scene.pausable) drawPauseBtn();
  const m = scene.pad || '';
  if (m !== padMode) { padMode = m; pad.dataset.mode = m; padRelease(); }
}
function loop(ts) {
  acc += Math.min(100, ts - last); last = ts;
  while (acc >= 1000 / 60) { tick(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// хук для отладки и тестов
window.__G = { startLevel, gotoLevel, buildLevel, keys, tick, render, press() { jumpPressed = true; anyPressed = true; }, get P() { return P; }, get L() { return L; }, get shots() { return shots; }, get scene() { return scene; }, set scene(s) { scene = s; }, deathScene, duoDeathScene, endingScene, crystalScene, titleScene, playScene, swimScene, passportScene, failScene, advance, ENEMY, SALT, LAST, codes, pressClick(x, y) { click = { x, y }; anyPressed = true; } };
