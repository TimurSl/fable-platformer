'use strict';
// ХОЛОС: ЯДРО 8 — пиксельный браузерный платформер. Без движка, чистый Canvas 2D.

const VW = 320, VH = 180, SC = 3, T = 16, H = 11;
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
function setFont(size) { ctx.font = size + 'px "Press Start 2P", monospace'; ctx.textBaseline = 'top'; }
function text(s, x, y, col = '#fff', size = 8, align = 'left') {
  setFont(size); ctx.textAlign = align;
  if (col !== '#17161c') { ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrap(s, maxW, size = 8) {
  setFont(size); const out = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const tst = line ? line + ' ' + w : w;
      if (ctx.measureText(tst).width > maxW && line) { out.push(line); line = w; } else line = tst;
    }
    out.push(line);
  }
  return out;
}
function box(x, y, w, h, fill, border) {
  ctx.fillStyle = border; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
}

// ---------- звук
let AC = null;
function initAudio() { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } if (AC && AC.state === 'suspended') AC.resume(); }
function sfx(f, d = 0.1, type = 'square', slide = 0, vol = 0.05) {
  if (!AC) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain(), now = AC.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, now);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), now + d);
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + d);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(now + d);
  } catch (e) { }
}

// ---------- ввод
const keys = { left: 0, right: 0, jump: 0 };
let jumpPressed = false, anyPressed = false, click = null;
const KM = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump' };
addEventListener('keydown', e => {
  const k = KM[e.code];
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
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) pad.classList.add('on');
pad.querySelectorAll('button').forEach(b => {
  const k = b.dataset.k;
  const dn = e => { e.preventDefault(); if (k === 'jump' && !keys.jump) { jumpPressed = true; anyPressed = true; } keys[k] = 1; b.classList.add('act'); initAudio(); };
  const up = e => { e.preventDefault(); keys[k] = 0; b.classList.remove('act'); };
  b.addEventListener('pointerdown', dn);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, up));
});

// ---------- сохранение
function save(n) { try { localStorage.setItem('holos_lvl', String(n)); } catch (e) { } }
function load() { try { return clamp(parseInt(localStorage.getItem('holos_lvl')) || 1, 1, 10); } catch (e) { return 1; } }

// ---------- зоны и сюжет
const ZONES = [
  { name: 'ОДЕССА', sky: ['#5bb8f0', '#c8ebff'], far: '#8fb3cc', near: '#6a8aa3', win: '#ffe9a0', gTop: '#5fae4a', gBody: '#7a5a3c', gDark: '#5e4630' },
  { name: 'ГАЗА', sky: ['#f0a85a', '#f9e0a8'], far: '#dcae78', near: '#b98856', win: '#7a5230', gTop: '#ecd596', gBody: '#c9a865', gDark: '#a98a50' },
  { name: 'ИЗРАИЛЬ', sky: ['#7cc6ee', '#eef7fa'], far: '#ddd6c2', near: '#beb59c', win: '#6d8fa8', gTop: '#f3eedd', gBody: '#cfc6ac', gDark: '#aea58c' },
  { name: 'МЕТА-ПРОСТРАНСТВО', sky: ['#07000f', '#1d0038'], gTop: '#19ff9c', gBody: '#16122a', gDark: '#241d44' },
  { name: 'СОЛЕВАЯ ШАХТА', sky: ['#120f18', '#2a2238'], gTop: '#f7f1fa', gBody: '#b9aec4', gDark: '#8d829a' },
];
const zoneOf = n => n <= 3 ? 0 : n <= 6 ? 1 : n <= 9 ? 2 : n === 10 ? 3 : 4;
const INTRO = {
  1: ['ПРЕДЫСТОРИЯ\n\nМрДрНос случайно запушил новую обнову для ВОТВ прямо в ядро Линукс. У всех, кто скачал ядро 8-й версии, Линукс сломался.',
    'ОДЕССА\n\nХолос решил сбежать из города и навалять Носатому.\n\nНа пути — бутылки Никиты Яроша и Дынекс. Дынексу не попадайся: порвёт туза.'],
  4: ['ГАЗА\n\nХолос перепутал карты и вместо Израиля попал в Газу.\n\nМолодец, Холос.'],
  7: ['ИЗРАИЛЬ\n\nХолос ищет МрДрНоса. Говорят, некий melvi знает дорогу в мета-пространство.'],
  10: ['МЕТА-ПРОСТРАНСТВО\n\nВот он. Носатый.\n\nХватай царь-флешки и ставь ему нормальный дистрибутив.'],
  11: ['СОЛЕВАЯ ШАХТА\n\nТут пахнет солью. И медведем.\n\nОчень большим медведем.'],
};
const END_TEXT = ['Нос повержен.\n\nХолос узнаёт всю правду о СИСТЕМ-Д СЛЕЖКЕ и проекте РЕДХАТ.',
  'Не выдержав запретных знаний, Холос выходит на новый план бытия...'];

// ---------- состояние
let frame = 0, scene = null, L = null, P = null, shots = [], parts = [], safe = null, shake = 0;

// ---------- построение уровней
function ent(t, x, y, extra) {
  const size = { y: [14, 16], d: [16, 18], f: [8, 12], m: [14, 18], g: [16, 26] }[t];
  return Object.assign({ t, x, y, w: size[0], h: size[1] }, extra);
}
function buildLevel(n) {
  const R = rng(1000 + n * 77), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const W = 80 + n * 9;
  const g = [...Array(H)].map(() => Array(W).fill('.'));
  const ents = [], plats = [];
  let secret = null, gh = 3, x = 0, sinceFlash = 0, secretDone = false;
  const col = (cx, h) => { for (let y = H - h; y < H; y++) g[y][cx] = '#'; };
  const flat = len => { for (let i = 0; i < len && x < W; i++) col(x++, gh); };
  const top = () => (H - gh) * T;
  const pGap = 0.2, pStep = pGap + 0.15, pYar = pStep + 0.14 + n * 0.012,
    pDyn = pYar + (n >= 2 ? 0.07 + n * 0.012 : 0), pSpk = pDyn + (n >= 3 ? 0.1 : 0);
  flat(9);
  if (n === 1) ents.push(ent('m', 5 * T, top() - 18, { say: 'Здарова, Холос. Стрелки — бежать, вверх или пробел — прыжок. Бутылки бьют, флешки лечат. Дынекса обходи: порвёт туза.' }));
  while (x < W - 14) {
    const r = R(), x0 = x;
    if (n === 8 && !secretDone && x > W * 0.55) {
      flat(5);
      ents.push(ent('m', (x - 4) * T, top() - 18, { say: 'Псс. Чуешь? Солью тянет... вон из той ямы. Я бы туда не прыгал. Или прыгал.' }));
      const gs = x; x += 3; secret = { x0: gs * T, x1: x * T };
      flat(4); secretDone = true; continue;
    }
    if (r < pGap) {
      if (n >= 4 && R() < 0.45) {
        const len = ri(6, 7);
        plats.push({ x: x * T + 2, y: top(), w: 32, h: 6, a: x * T + 2, b: (x + len) * T - 34, vx: 0.7 + n * 0.03 });
        x += len;
      } else x += ri(2, 3);
      flat(3);
    } else if (r < pStep) {
      gh = clamp(gh + (R() < 0.5 ? -1 : 1) * ri(1, 2), 1, 5); flat(3);
    } else if (r < pYar) {
      flat(2);
      if (R() < 0.4) {
        g[H - gh - 3][x] = '='; g[H - gh - 3][x + 1] = '=';
        ents.push(ent('y', x * T + 9, (H - gh - 3) * T - 16, { cd: 60 }));
      } else ents.push(ent('y', x * T + 1, top() - 16, { cd: 60 }));
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
    } else flat(ri(3, 6));
    sinceFlash += x - x0;
    if (sinceFlash > 26 + n * 2 && g[H - gh][x - 2] === '#' && g[H - gh - 1][x - 2] === '.') {
      ents.push(ent('f', (x - 2) * T + 4, top() - 30)); sinceFlash = 0;
    }
  }
  while (x < W) col(x++, gh);
  if (n === 9) ents.push(ent('m', (W - 8) * T, top() - 18, { say: 'Нос сидит в мета-пространстве. Прыгай в портал — закину. И наваляй ему за ядро.' }));
  ents.push(ent('g', (W - 4) * T, top() - 26));
  return { n, W, g, ents, plats, secret, zone: zoneOf(n), t: 0, cam: 0, cdBase: 120 - n * 6, spawnY: (H - 3) * T - 14, banner: [`УРОВЕНЬ ${n}: ${ZONES[zoneOf(n)].name}`, 130], pops: [] };
}
function buildArena(n) {
  const W = 20, g = [...Array(H)].map(() => Array(W).fill('.'));
  for (let x = 0; x < W; x++) { g[H - 1][x] = '#'; g[H - 2][x] = '#'; }
  const groundY = (H - 2) * T, py = 6 * T;
  const L = { n, W, g, ents: [], plats: [], secret: null, zone: zoneOf(n), t: 0, cam: 0, cdBase: 100, spawnY: groundY - 14, groundY, pops: [] };
  if (n === 10) {
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
  if (n <= 10) save(n);
  L = n >= 10 ? buildArena(n) : buildLevel(n);
  P = { x: 24, y: L.spawnY, w: 8, h: 13, vx: 0, vy: 0, hp: 3, face: 1, inv: 0, ground: false, coy: 0, buf: 0, on: null };
  safe = { x: P.x, y: P.y }; shots = []; parts = []; shake = 0;
  scene = playScene;
}
function gotoLevel(n) {
  if (INTRO[n]) scene = cardScene(INTRO[n], () => startLevel(n), zoneOf(n)); else startLevel(n);
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
  if (P.inv > 0 || scene !== playScene) return;
  P.hp -= n; P.inv = 90; P.vy = -3.5; shake = 6; sfx(180, 0.2, 'sawtooth', -100, 0.07);
  if (P.hp <= 0) die(c);
}
function die(c) {
  if (scene !== playScene) return;
  sfx(300, 0.5, 'sawtooth', -260, 0.08);
  scene = L.n === 11 ? crystalScene() : deathScene(L.n, c);
}
function onFlash(e) {
  sfx(900, 0.12, 'square', 600);
  if (L.boss) shots.push({ k: 'usb', x: e.x, y: e.y, sx: e.x, sy: e.y, t: 0, w: 8, h: 12, vx: 0, vy: 0 });
  else { P.hp = Math.min(3, P.hp + 1); burst(e.x + 4, e.y + 6, '#2ecc71', 10); L.pops.push({ x: e.x - 4, y: e.y - 8, s: '+1', t: 40 }); }
}
function hitBoss() {
  const b = L.boss;
  if (b.kind === 'bear') { b.hits++; b.say = 100; L.pops.push({ x: b.x + 20, y: b.y + 10, s: '0', t: 50 }); sfx(110, 0.25, 'sawtooth'); return; }
  if (b.dead) return;
  b.hp--; b.flash = 14; shake = 5; sfx(220, 0.25, 'sawtooth', -120, 0.08); burst(b.x + b.w / 2, b.y + b.h / 2, '#19ff9c', 12);
  if (b.hp <= 0) { b.dead = 1; return; }
  if (b.hp === 6 || b.hp === 3) { P.hp = Math.min(3, P.hp + 1); L.banner = [b.hp === 6 ? 'ФАЗА 2: KERNEL PANIC' : 'ФАЗА 3: SEGFAULT', 130]; }
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

// ---------- игровая сцена
const playScene = {
  update() {
    L.t++;
    for (const pl of L.plats) { pl.x += pl.vx; if (pl.x < pl.a) { pl.x = pl.a; pl.vx = Math.abs(pl.vx); } if (pl.x > pl.b) { pl.x = pl.b; pl.vx = -Math.abs(pl.vx); } }
    if (P.on) { moveX(P, P.on.vx); P.on = null; }
    // игрок
    const ax = keys.right - keys.left;
    P.vx += (ax * 2 - P.vx) * 0.3; if (Math.abs(P.vx) < 0.05) P.vx = 0;
    if (ax) P.face = ax;
    P.buf = jumpPressed ? 7 : Math.max(0, P.buf - 1);
    P.coy = P.ground ? 7 : Math.max(0, P.coy - 1);
    if (P.buf && P.coy) { P.vy = -6.2; P.buf = 0; P.coy = 0; sfx(420, 0.12, 'square', 300, 0.04); }
    if (!keys.jump && P.vy < -2.5) P.vy = -2.5;
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
      if (L.secret && P.x + P.w > L.secret.x0 && P.x < L.secret.x1) { sfx(200, 0.6, 'triangle', 600); gotoLevel(11); return; }
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
      if (e.t === 'y') {
        e.face = dx < 0 ? -1 : 1;
        if (e.anim) e.anim--;
        if (Math.abs(dx) < 170 && Math.abs(dy) < 120 && --e.cd <= 0) {
          const tt = 42 + Math.random() * 12;
          shots.push({ k: 'b', x: e.x + 5, y: e.y, vx: dx / tt, vy: dy / tt - 0.075 * tt, g: 0.15, w: 5, h: 8, rot: 0 });
          e.cd = L.cdBase + Math.random() * 30; e.anim = 12; sfx(300, 0.08, 'triangle', 200, 0.04);
        }
        if (ov(P, e, 3)) hurt(1, 'yarosh');
      } else if (e.t === 'd') {
        const ag = Math.abs(dx) < 90 && Math.abs(dy) < 36;
        if (ag && !e.ag) sfx(90, 0.25, 'sawtooth', 60, 0.06);
        e.ag = ag; if (ag && Math.abs(dx) > 3) e.dir = dx < 0 ? -1 : 1;
        e.x += e.dir * (ag ? 1.7 : 0.7);
        if (e.x < e.x0) { e.x = e.x0; if (!ag) e.dir = 1; }
        if (e.x > e.x1) { e.x = e.x1; if (!ag) e.dir = -1; }
        if (P.inv <= 0 && ov(P, e, 3)) { P.hp = 0; die('dynex'); return; }
      } else if (e.t === 'f') {
        if (ov(P, e)) { e.dead = true; onFlash(e); }
      } else if (e.t === 'm') {
        if (Math.abs(dx) < 60 && Math.abs(dy) < 48) L.say = e.say;
      } else if (e.t === 'g') {
        if (ov(P, e, 2)) { sfx(500, 0.4, 'triangle', 900); gotoLevel(L.n + 1); return; }
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
      s.vy += s.g || 0; s.x += s.vx; s.y += s.vy; s.rot = (s.rot || 0) + 0.25;
      const ground = s.k === 'wave' || s.k === 'sweep';
      if (!ground && tileAt(s.x + s.w / 2, s.y + s.h / 2)) {
        burst(s.x, s.y, s.k === 'b' ? '#c05f10' : s.k === 'crystal' ? '#f7f1fa' : '#ff4fd8', 5);
        if (s.k === 'b') sfx(1200, 0.05, 'square', -600, 0.03);
        return false;
      }
      if (ov(P, s)) { hurt(1, s.k); if (!ground) return false; }
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
    ctx.translate(-cam + (shake ? Math.round((Math.random() - 0.5) * shake) : 0), 4);
    // тайлы
    const tx0 = Math.max(0, Math.floor(cam / T)), tx1 = Math.min(L.W - 1, tx0 + 21);
    for (let ty = 0; ty < H; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const c = L.g[ty][tx], x = tx * T, y = ty * T;
      if (c === '#') {
        ctx.fillStyle = Z.gBody; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = Z.gDark;
        ctx.fillRect(x + Math.floor(hash(tx, ty) * 12), y + 5 + Math.floor(hash(ty, tx) * 8), 3, 2);
        ctx.fillRect(x + Math.floor(hash(tx + 9, ty) * 12), y + 3 + Math.floor(hash(ty + 5, tx) * 10), 2, 2);
        if (ty === 0 || L.g[ty - 1][tx] !== '#') { ctx.fillStyle = Z.gTop; ctx.fillRect(x, y, T, 4); ctx.fillRect(x + Math.floor(hash(tx, 3) * 10), y + 4, 3, 2); }
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
    if (L.secret) for (let i = 0; i < 6; i++) {
      if ((frame + i * 13) % 50 < 25) { ctx.fillStyle = '#fff'; ctx.fillRect(L.secret.x0 + 4 + hash(i, 7) * 40, 150 + hash(i, 8) * 24, 1, 1); }
    }
    for (const pl of L.plats) {
      ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(pl.x), pl.y, pl.w, pl.h);
      ctx.fillStyle = Z.gTop; ctx.fillRect(Math.round(pl.x) + 1, pl.y + 1, pl.w - 2, 2);
      ctx.fillStyle = Z.gDark; ctx.fillRect(Math.round(pl.x) + 1, pl.y + 3, pl.w - 2, 2);
    }
    // сущности
    for (const e of L.ents) {
      if (e.dead) continue;
      if (e.t === 'y') spr(IMG.yarosh, e.x, e.y - (e.anim ? 2 : 0), e.face < 0);
      else if (e.t === 'd') {
        spr(IMG.dynex, e.x, e.y + (Math.floor(frame / (e.ag ? 4 : 8)) % 2), e.dir < 0);
        if (e.ag) text('!', e.x + 8, e.y - 11, '#ff3b3b', 8, 'center');
      } else if (e.t === 'f') spr(IMG.flash, e.x, e.y + Math.sin(frame * 0.1) * 2);
      else if (e.t === 'm') spr(IMG.melvi, e.x, e.y, P.x < e.x);
      else if (e.t === 'g') {
        for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#7a3cff', '#19ff9c', '#ff4fd8', '#ffffff'][(i + Math.floor(frame / 6)) % 4]; ctx.fillRect(e.x + i * 2, e.y + i * 3, 16 - i * 4, 26 - i * 6); }
      }
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
      else if (s.k === 'usb') spr(IMG.flash, s.x, s.y);
      else if (s.k === 'glitch') { ctx.fillStyle = frame % 4 < 2 ? '#ff4fd8' : '#19ff9c'; ctx.fillRect(s.x, s.y, 6, 6); ctx.fillStyle = '#fff'; ctx.fillRect(s.x + 2, s.y + 2, 2, 2); }
      else if (s.k === 'sweep') { ctx.fillStyle = '#ff4fd8'; ctx.fillRect(s.x, s.y, 10, 10); ctx.fillStyle = '#19ff9c'; ctx.fillRect(s.x + 2, s.y + (frame % 6), 6, 2); }
      else if (s.k === 'wave') { ctx.fillStyle = '#f7f1fa'; ctx.fillRect(s.x, s.y + 3, 10, 6); ctx.fillRect(s.x + 3, s.y, 4, 3); }
      else if (s.k === 'crystal') { ctx.fillStyle = '#f7f1fa'; ctx.fillRect(s.x + 1, s.y, 5, 8); ctx.fillStyle = '#ffb8d8'; ctx.fillRect(s.x + 2, s.y + 8, 3, 2); ctx.fillRect(s.x + 3, s.y + 10, 1, 1); }
    }
    // игрок
    if (P.inv % 6 < 3) spr(IMG.holos, P.x - 3, P.y - 3 + (P.ground && Math.abs(P.vx) > 0.5 ? Math.floor(frame / 5) % 2 : 0), P.face < 0);
    for (const p of parts) { ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 2, 2); }
    for (const p of L.pops) text(p.s, p.x, p.y, '#fff', 8);
    ctx.restore();
    // HUD
    for (let i = 0; i < 3; i++) spr(i < P.hp ? IMG.heart : IMG.heartOff, 6 + i * 13, 6, false, 2);
    if (b) {
      text(b.kind === 'nos' ? 'МРДРНОС' : 'ВЕДМЕДИК БО', 314, 5, '#fff', 6, 'right');
      box(214, 14, 100, 5, '#2b2a33', '#000');
      if (b.kind === 'nos') { ctx.fillStyle = '#f08a1c'; ctx.fillRect(214, 14, 100 * Math.max(0, b.hp) / b.max, 5); }
      else { ctx.fillStyle = '#e03030'; ctx.fillRect(214, 14, 100, 5); text('HP: ∞', 314, 22, '#ff9a9a', 6, 'right'); }
    } else text(`УР.${L.n} ${Z.name}`, 314, 6, '#fff', 6, 'right');
    if (L.say) {
      box(8, 22, 304, 44, '#17161cee', '#fff');
      text('melvi:', 13, 26, '#19ff9c', 6);
      wrap(L.say, 292, 6).slice(0, 4).forEach((l, i) => text(l, 13, 35 + i * 8, '#fff', 6));
    } else if (L.banner) text(L.banner[0], 160, 34, '#fff', 8, 'center');
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
  } else {
    for (let i = 0; i < 16; i++) {
      const h = 10 + hash(i, 5) * 30; ctx.fillStyle = '#3a3248';
      for (let k = 0; k < 5; k++) ctx.fillRect(i * 20 + k * 2, 0, 20 - k * 4, h * (k + 1) / 5);
      ctx.fillStyle = i % 3 ? '#4d4460' : '#ffb8d866'; const ch = 14 + hash(i, 9) * 30;
      ctx.fillRect(i * 22 + 4, 148 - ch, 6, ch + 32); ctx.fillRect(i * 22 + 6, 146 - ch, 2, 2);
    }
  }
}

// ---------- капча
function captchaScene() {
  let st = 0, t = 0, tries = 0;
  const b = { x: 60, y: 60, w: 200, h: 60 };
  return {
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
      ctx.textAlign = 'left'; setFont(8); ctx.fillStyle = '#17161c'; ctx.fillText('Я не холос', b.x + 46, b.y + 26);
      setFont(6); ctx.fillStyle = '#9a9aa6'; ctx.textAlign = 'right'; ctx.fillText('холоКАПЧА', b.x + b.w - 6, b.y + b.h - 10);
      const msg = st === 0 ? (tries ? 'ПОПРОБУЙ ЕЩЁ РАЗ' : 'НАЖМИ НА ГАЛОЧКУ') : st === 1 ? 'ПРОВЕРЯЕМ...' : st === 2 ? 'ХМ. ПОХОЖ НА ХОЛОСА.' : 'ЛАДНО, ВЕРИМ.';
      text(msg, 160, 136, st === 2 ? '#ff5a5a' : st === 3 ? '#2ecc71' : '#fff', 8, 'center');
    },
  };
}

// ---------- меню
function titleScene() {
  const saved = load();
  const bNew = { x: 90, y: saved > 1 ? 118 : 104, w: 140, h: 18 }, bCont = { x: 90, y: 94, w: 140, h: 18 };
  let t = 0;
  return {
    update() {
      t++;
      if (!anyPressed || t < 15) return;
      if (click) { if (inside(click, bNew)) gotoLevel(1); else if (saved > 1 && inside(click, bCont)) gotoLevel(saved); }
      else gotoLevel(saved > 1 ? saved : 1);
    },
    draw() {
      drawBG(3, 0);
      text('ХОЛОС', 160, 22, '#fff', 24, 'center');
      text('ЯДРО 8', 160, 52, '#19ff9c', 16, 'center');
      spr(IMG.holos, 30, 100 + Math.sin(frame * 0.08) * 3, false, 3);
      spr(IMG.nos, 250, 90 + Math.cos(frame * 0.06) * 4, true, 2);
      if (saved > 1) { box(bCont.x, bCont.y, bCont.w, bCont.h, '#19ff9c', '#fff'); text(`ПРОДОЛЖИТЬ: УР.${saved}`, 160, bCont.y + 6, '#17161c', 6, 'center'); }
      box(bNew.x, bNew.y, bNew.w, bNew.h, saved > 1 ? '#2b2a33' : '#19ff9c', '#fff');
      text('НОВАЯ ИГРА', 160, bNew.y + 6, saved > 1 ? '#fff' : '#17161c', 6, 'center');
      text('← → БЕЖАТЬ   ↑ / ПРОБЕЛ ПРЫЖОК', 160, 160, '#9a9aa6', 6, 'center');
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
function bubble(x, y, w, lines) {
  box(x, y, w, lines.length * 12 + 8, '#fff', '#17161c');
  lines.forEach((l, i) => { setFont(8); ctx.textAlign = 'center'; ctx.fillStyle = '#17161c'; ctx.fillText(l, x + w / 2, y + 6 + i * 12); });
}
function deathScene(n, c) {
  let t = 0; const bx = 180, by = 34;
  return {
    update() {
      t++;
      if (t === 62) sfx(90, 0.25, 'sawtooth', 0, 0.08);
      if (t === 105) sfx(200, 0.3, 'square', -120);
      if (t > 150 && anyPressed) startLevel(n);
    },
    draw() {
      ctx.fillStyle = '#120a0a'; ctx.fillRect(0, 0, VW, VH);
      spr(t > 30 && t < 62 ? IMG.bearOpen : IMG.bear, bx, by + (t >= 62 && t < 90 ? Math.sin(t) * 2 : 0), false, 5);
      if (t < 60) { const k = t / 60; spr(IMG.holos, 40 + (bx + 42 - 40) * k, 120 + (by + 50 - 120) * k - Math.sin(k * 3.14) * 40, false, 2 - k); }
      if (c === 'dynex') text('ДЫНЕКС ПОРВАЛ ТУЗА', 160, 8, '#ff5a5a', 8, 'center');
      if (t > 100) bubble(16, 60, 150, ['ФУ БЛЯ,', 'НЕВКУСНО']);
      if (t > 150 && frame % 60 < 40) text('НАЖМИ, ЧТОБЫ ПОПРОБОВАТЬ СНОВА', 160, 166, '#9a9aa6', 6, 'center');
    },
  };
}

// ---------- концовки
function endingScene() {
  let t = 0;
  const stars = [...Array(70)].map((_, i) => ({ x: hash(i, 1) * VW, y: hash(i, 2) * VH, s: 0.3 + hash(i, 3) * 1.5 }));
  return {
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

// ---------- цикл
scene = captchaScene();
let last = 0, acc = 0;
function tick() { scene.update(); jumpPressed = false; anyPressed = false; click = null; frame++; }
function render() { ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; scene.draw(); }
function loop(ts) {
  acc += Math.min(100, ts - last); last = ts;
  while (acc >= 1000 / 60) { tick(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// хук для отладки и тестов
window.__G = { startLevel, gotoLevel, buildLevel, keys, tick, render, press() { jumpPressed = true; anyPressed = true; }, get P() { return P; }, get L() { return L; }, get scene() { return scene; }, set scene(s) { scene = s; }, deathScene, endingScene, crystalScene, titleScene, playScene };
