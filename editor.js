'use strict';
// КОНСТРУКТОР УРОВНЕЙ. Рисуешь уровень клетками, расставляешь врагов, флешки, платформы, старт и портал.
// Уровень считается ПРОВЕРЕННЫМ, только если автор сам прошёл его от старта до портала (кнопка «ТЕСТ»).
// Любая правка снимает проверку. Код уровня, которым можно поделиться, выдаётся только проверенным уровням.
// Файл подключается после game.js и пользуется его общими переменными (scene, L, P, ctx, keys, ...).

const ED = { top: 12, map: 144, pal: 148, k: 12 / 16, minW: 30, maxW: 240, defW: 60 };   // k — масштаб: клетка 12 px вместо 16
const MK_KEY = 'holos_custom', MK_MAX = 40, MK_OBJ_MAX = 250, MK_PER = 7;

// ---------- указатель: протяжка (рисование, «рука»), правая кнопка мыши — ластик, колесо — прокрутка
// tap — нажатие, запомненное до ближайшего кадра (быстрый тап может начаться и закончиться между кадрами)
const ptr = { x: -1, y: -1, down: false, btn: 0, id: null, over: false, tap: null };
function ptrAt(e) { const r = cv.getBoundingClientRect(); ptr.x = (e.clientX - r.left) / r.width * VW; ptr.y = (e.clientY - r.top) / r.height * VH; }
cv.addEventListener('pointerdown', e => { ptrAt(e); ptr.down = true; ptr.btn = e.button; ptr.id = e.pointerId; ptr.over = true; ptr.tap = { x: ptr.x, y: ptr.y, btn: e.button, f: frame }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
cv.addEventListener('pointermove', e => { ptrAt(e); ptr.over = true; });
for (const n of ['pointerup', 'pointercancel']) cv.addEventListener(n, e => { if (e.pointerId === ptr.id) { ptr.down = false; ptr.id = null; } if (e.pointerType !== 'mouse') ptr.over = false; });
cv.addEventListener('pointerleave', () => { if (!ptr.down) ptr.over = false; });
let wheel = 0, undoKey = false;
cv.addEventListener('wheel', e => { if (scene && scene.wheel) { wheel += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; e.preventDefault(); } }, { passive: false });
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { undoKey = true; e.preventDefault(); } });
// после prompt() браузер не присылает keyup/pointerup — отпускаем всё сами
function releaseInput() { for (const k in keys) keys[k] = 0; ptr.down = false; ptr.id = null; ptr.tap = null; jumpPressed = false; }
function ask(msg, def) { let s = null; try { s = prompt(msg, def || ''); } catch (e) { } releaseInput(); return s; }

// ---------- палитра
const MK_TILES = { '#': 'ЗЕМЛЯ', '=': 'БЛОК', '^': 'ШИПЫ' };
const MK_TOOLS = [['hand', 'РУКА: ДВИГАТЬ ВИД'], ['erase', 'ЛАСТИК'], ['#', 'ЗЕМЛЯ'], ['=', 'БЛОК'], ['^', 'ШИПЫ'],
  ['plat', 'ЕЗДЯЩАЯ ПЛАТФОРМА'], ['f', 'ФЛЕШКА: +1 СЕРДЦЕ'], ['start', 'СТАРТ ХОЛОСА'], ['goal', 'ПОРТАЛ: ФИНИШ']];
const MK_ENEMIES = ['y', 'y2', 'd', 'poc', 'tel', 'bar', 'ari', 'fat', 'ban', 'ano', 'mak', 'ros', 'laa', 'vlad', 'alt', 'duo'];
const MK_NAME = Object.assign({}, NAMES, { y: 'Никита Ярош', y2: 'Ярош с кубами (баш 17%)', d: 'Дынекс', duo: 'Навальный и Путин' });
for (const [id, s] of MK_TOOLS) MK_NAME[id] = s;
const MK_OBJ = new Set(['plat', 'f', ...MK_ENEMIES]);
const PAL_X = i => 2 + i * 17;

// ---------- данные уровня. В редакторе: g — массив строк-массивов H×W, o — объекты по клеткам {"x,y": тип}
const newId = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
function mkBlank(W) { return [...Array(H)].map((_, y) => Array(W).fill(y >= H - 3 ? '#' : '.')); }
function mkNew() { const W = ED.defW; return { id: null, name: '', zone: 0, W, g: mkBlank(W), o: {}, start: { x: 2, y: H - 4 }, goal: { x: W - 4, y: H - 4 }, ver: false, imp: false, best: 0, dirty: false }; }
function mkPack(d) {
  return { id: d.id, name: d.name, zone: d.zone, W: d.W, rows: d.g.map(r => r.join('')),
    o: Object.keys(d.o).map(k => { const [x, y] = k.split(',').map(Number); return [d.o[k], x, y]; }),
    s: [d.start.x, d.start.y], g: [d.goal.x, d.goal.y], ver: !!d.ver, imp: !!d.imp, best: d.best || 0 };
}
function mkUnpack(p) {
  const d = { id: p.id || null, name: p.name || '', zone: p.zone, W: p.W, g: p.rows.map(r => [...r]), o: {}, start: { x: p.s[0], y: p.s[1] }, goal: { x: p.g[0], y: p.g[1] }, ver: !!p.ver, imp: !!p.imp, best: p.best || 0, dirty: false };
  for (const [t, x, y] of p.o) d.o[x + ',' + y] = t;
  return d;
}
const isInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
function mkValid(p) {
  if (!p || typeof p !== 'object' || !isInt(p.W, ED.minW, ED.maxW) || !isInt(p.zone, 0, ZONES.length - 1)) return false;
  if (!Array.isArray(p.rows) || p.rows.length !== H || p.rows.some(r => typeof r !== 'string' || r.length !== p.W || /[^.#=^]/.test(r))) return false;
  if (!Array.isArray(p.o) || p.o.length > MK_OBJ_MAX || p.o.some(o => !Array.isArray(o) || !MK_OBJ.has(o[0]) || !isInt(o[1], 0, p.W - 1) || !isInt(o[2], 0, H - 1))) return false;
  const pt = (q, y0) => Array.isArray(q) && isInt(q[0], 0, p.W - 1) && isInt(q[1], y0, H - 1);
  return pt(p.s, 0) && pt(p.g, 1) && (p.name === undefined || typeof p.name === 'string');
}

// ---------- хранилище (браузер) и коды уровней
function mkLoad() { try { const a = JSON.parse(localStorage.getItem(MK_KEY) || '[]'); return Array.isArray(a) ? a.filter(mkValid) : []; } catch (e) { return []; } }
function mkStore(list) { try { localStorage.setItem(MK_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
function mkSave(d) {
  const list = mkLoad(); if (!d.id) d.id = newId();
  const p = mkPack(d), i = list.findIndex(q => q.id === d.id);
  if (i >= 0) list[i] = p; else { if (list.length >= MK_MAX) return false; list.unshift(p); }
  if (!mkStore(list)) return false;
  d.dirty = false; return true;
}
const rle = s => s.replace(/(.)\1*/g, m => m.length > 1 ? m[0] + m.length : m);
const unrle = s => s.replace(/(\D)(\d*)/g, (_, c, n) => c.repeat(n ? Math.min(+n, ED.maxW) : 1));
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }
function b64e(str) { let s = ''; for (const c of new TextEncoder().encode(str)) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64d(str) { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(s, c => c.charCodeAt(0))); }
// код выдаётся только проверенному уровню, поэтому уровень из кода сразу считается проверенным
function mkCode(d) {
  const p = mkPack(d), j = JSON.stringify({ n: p.name, z: p.zone, w: p.W, r: p.rows.map(rle), o: p.o, s: p.s, g: p.g });
  return 'HOLOS1.' + b64e(j) + '.' + fnv(j);
}
function mkDecode(code) {
  try {
    const m = String(code || '').replace(/\s+/g, '').match(/^HOLOS1\.([A-Za-z0-9_-]+)\.([0-9a-z]+)$/i);
    if (!m) return null;
    const j = b64d(m[1]); if (fnv(j) !== m[2].toLowerCase()) return null;
    const q = JSON.parse(j);
    const p = { name: String(q.n || '').slice(0, 20), zone: q.z, W: q.w, rows: Array.isArray(q.r) ? q.r.map(r => unrle(String(r))) : null, o: q.o, s: q.s, g: q.g, ver: true, imp: true, best: 0 };
    return mkValid(p) ? p : null;
  } catch (e) { return null; }
}
function mkCopy(code, done) {
  const show = () => { ask('Код уровня — скопируй и отправь другу:', code); done('КОД ПОКАЗАН'); };
  try { navigator.clipboard.writeText(code).then(() => done('КОД СКОПИРОВАН'), show); } catch (e) { show(); }
}

// ---------- из данных редактора — в настоящий уровень (сущности с теми же параметрами, что у генератора)
function mkBuild(d) {
  const sol = (x, y) => x >= 0 && x < d.W && y >= 0 && y < H && (d.g[y][x] === '#' || d.g[y][x] === '=');
  const free = (x, y) => x >= 0 && x < d.W && !sol(x, y);
  // дорожка ходячего врага: ровный пол под ним в обе стороны (не дальше 8 клеток), до стены или обрыва
  const lane = (cx, cy) => {
    let a = cx, b = cx;
    if (sol(cx, cy + 1)) {
      while (cx - a < 8 && free(a - 1, cy) && sol(a - 1, cy + 1)) a--;
      while (b - cx < 8 && free(b + 1, cy) && sol(b + 1, cy + 1)) b++;
    }
    return [a, b];
  };
  const ents = [], plats = [];
  for (const k in d.o) {
    const t = d.o[k], [cx, cy] = k.split(',').map(Number), fy = (cy + 1) * T;
    if (t === 'plat') {   // едет вправо по пустым клеткам своего ряда (до 10 клеток) и обратно
      let e = cx; while (e - cx < 10 && e + 1 < d.W && d.g[cy][e + 1] === '.') e++;
      const a = cx * T + 2; plats.push({ x: a, y: cy * T, w: 32, h: 6, a, b: Math.max(a, (e + 1) * T - 34), vx: 0.8 }); continue;
    }
    if (t === 'f') { ents.push(ent('f', cx * T + 4, cy * T + 2)); continue; }
    if (t === 'tel') { const x = cx * T + 3, y = cy * T + 2; ents.push(ent('tel', x, y, { hx: x, hy: y, ph: (cx + cy) % 6 })); continue; }
    const [w, h] = SIZES[t], [a, b] = lane(cx, cy), lw = (b - a + 1) * T;
    const x0 = a * T, x1 = Math.max(x0, (b + 1) * T - w), x = clamp(cx * T + Math.round((T - w) / 2), x0, x1), y = fy - h;
    if (t === 'ban') { ents.push(ent('ban', x0, fy - 12, { w: lw, gy: fy, hx: clamp(cx * T - 4, x0, x0 + lw - 24), hy: fy - 90, st: 0, bt: 0, vy: 0, cd: 30 })); continue; }
    if (t === 'duo') { ents.push(ent('duo', x0, fy - 18, { w: lw, ph: 0, gy: fy, ax: x0, bx: x0 + lw - 12 })); continue; }
    const X = {
      y: { cd: 60 }, y2: { cd: 60 }, d: { x0, x1, dir: -1 }, fat: { cd: 80 }, ari: { st: 0, cd: 50, vx: 0, vy: 0, face: -1 },
      bar: { x0, x1, dir: -1, st: 0, cd: 40 }, alt: { x0: x0 + 2, x1: Math.max(x0 + 2, (b + 1) * T - 16), cd: 100 },
      poc: { cd: 60, st: 0, tm: 0, met: false, talk: 0 }, mak: { cd: 70, st: 0, tm: 0, anim: 0 }, laa: { cd: 70, anim: 0 },
      vlad: { cd: 80, n: 0, bt: 0, face: -1 }, ano: { x0, x1, dir: -1, gy: fy, oy: 0, hv: 0, cd: 50 },
      ros: { x0, x1, dir: -1, vx: 0, vy: 0, ground: true, air: false, cd: 40, jx: 0.6, mcd: 90, mk: null },
    }[t];
    ents.push(ent(t, x, y, X));
  }
  ents.push(ent('g', d.goal.x * T, (d.goal.y + 1) * T - 26));
  return { ents, plats, spawn: { x: d.start.x * T + 4, y: (d.start.y + 1) * T - 13.01 } };
}

// ---------- игра на своём уровне. mode: 'test' — проверка из редактора, 'play' — пройти сохранённый уровень
const fmtTime = f => (f / 60).toFixed(1) + ' С';
const EXIT_BTN = { x: 272, y: 3, w: 44, h: 11 };
function mkPlay(d, mode, h) {
  const b = mkBuild(d), test = mode === 'test';
  L = { n: 0, W: d.W, g: d.g.map(r => r.slice()), ents: b.ents, plats: b.plats, secret: null, zone: d.zone, t: 0, cam: 0, cdBase: 96,
    spawnY: b.spawn.y, banner: [test ? 'ПРОВЕРКА: ДОЙДИ ДО ПОРТАЛА' : (d.name || 'БЕЗ НАЗВАНИЯ'), 140], pops: [] };
  P = { x: b.spawn.x, y: b.spawn.y, w: 8, h: 13, vx: 0, vy: 0, hp: 3, max: 3, face: 1, inv: 0, ground: false, coy: 0, buf: 0, on: null, stop: 0, bash: 0, grace: 0 };
  safe = { x: P.x, y: P.y }; shots = []; parts = []; shake = 0;
  L.cam = clamp(P.x - 140, 0, Math.max(0, L.W * T - VW));
  const deaths = h.deaths || 0;
  const c = L.custom = {
    time: 0, exit: h.exit,
    update() {
      c.time++;
      if (click && inside(click, EXIT_BTN)) { sfx(300, 0.08); h.exit(); return true; }   // Esc открывает паузу (см. tick в game.js)
      return false;
    },
    draw() {
      box(EXIT_BTN.x, EXIT_BTN.y, EXIT_BTN.w, EXIT_BTN.h, '#17161ccc', '#fff');
      text(test ? 'СТОП' : 'ВЫХОД', EXIT_BTN.x + EXIT_BTN.w / 2, EXIT_BTN.y + 3, '#fff', 6, 'center');
      text(fmtTime(c.time), 314, 18, '#fff', 6, 'right');
      text(test ? 'ПРОВЕРКА' : 'ПОПЫТКА ' + (deaths + 1), 50, 8, test ? '#ffd23e' : '#9a9aa6', 6);
    },
    // смерть: при проверке — назад в редактор (уровень остаётся непроверенным), в игре — заново со старта
    die() {
      if (test) return mkMsgScene(d.zone, 'ПРОВАЛ', '#ff5a5a', ['ЧТОБЫ ПРОВЕРИТЬ УРОВЕНЬ,', 'ПРОЙДИ ЕГО ОТ СТАРТА ДО ПОРТАЛА'], h.exit, 30, 150);
      return mkMsgScene(d.zone, 'ПОПЫТКА ' + (deaths + 2), '#fff', [], () => mkPlay(d, mode, Object.assign({}, h, { deaths: deaths + 1 })), 20, 70);
    },
    win() { h.win(c.time, deaths); },
  };
  scene = playScene;
}
// карточка с крупным заголовком; next — по нажатию (не раньше wait кадров) или сама через auto кадров
function mkMsgScene(zone, title, col, lines, next, wait = 40, auto = 0) {
  let t = 0;
  return {
    pad: 'none',
    update() { t++; if ((t > wait && (anyPressed || codes.has('Escape'))) || (auto && t > auto)) next(); },
    draw() {
      drawBG(zone, frame * 0.3); ctx.fillStyle = '#000000b0'; ctx.fillRect(0, 0, VW, VH);
      text(title, 160, 50, col, 16, 'center');
      lines.forEach((l, i) => text(l, 160, 90 + i * 14, '#fff', 8, 'center'));
      if (t > wait && frame % 60 < 40) text('НАЖМИ, ЧТОБЫ ПРОДОЛЖИТЬ', 160, 160, '#9a9aa6', 6, 'center');
    },
  };
}

// ---------- значки палитры (14×14)
function mkIcon(t, x, y, Z) {
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  const fit = (img, ox = 0, bw = 14) => {
    const s = Math.min(1, bw / img.width, 14 / img.height), w = Math.max(1, Math.round(img.width * s)), h = Math.max(1, Math.round(img.height * s));
    ctx.drawImage(img, x + ox + Math.floor((bw - w) / 2), y + 14 - h, w, h);
  };
  if (t === 'hand') { r(6, 1, 2, 12, '#fff'); r(1, 6, 12, 2, '#fff'); r(5, 2, 4, 1, '#fff'); r(5, 11, 4, 1, '#fff'); r(2, 5, 1, 4, '#fff'); r(11, 5, 1, 4, '#fff'); }
  else if (t === 'erase') for (let i = 0; i < 10; i++) { r(2 + i, 2 + i, 2, 2, '#ff5a5a'); r(11 - i, 2 + i, 2, 2, '#ff5a5a'); }
  else if (t === '#') { r(0, 2, 14, 12, Z.gBody); r(0, 2, 14, 3, Z.gTop); r(3, 8, 3, 2, Z.gDark); r(9, 11, 2, 2, Z.gDark); }
  else if (t === '=') { r(0, 1, 14, 13, Z.gDark); r(1, 2, 12, 11, Z.gBody); r(0, 1, 14, 3, Z.gTop); }
  else if (t === '^') for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) r(i * 7 + 3 - k, 6 + k * 2, 2 + k * 2, 2, k < 1 ? '#fff' : '#b8b8c4');
  else if (t === 'plat') { r(0, 6, 14, 5, '#17161c'); r(1, 7, 12, 1, Z.gTop); r(1, 8, 12, 2, Z.gDark); r(1, 2, 3, 1, '#fff'); r(10, 2, 3, 1, '#fff'); r(0, 1, 1, 3, '#fff'); r(13, 1, 1, 3, '#fff'); }
  else if (t === 'goal') for (let i = 0; i < 3; i++) r(2 + i * 2, i * 2, 10 - i * 4, 14 - i * 4, ['#7a3cff', '#19ff9c', '#ff4fd8'][(i + Math.floor(frame / 6)) % 3]);
  else if (t === 'ban') { r(6, 0, 2, 7, '#8a5a2c'); r(0, 6, 14, 7, '#e03030'); r(0, 6, 14, 1, '#ff8a7a'); }
  else if (t === 'duo') { fit(IMG.navy, 0, 7); fit(IMG.putin, 7, 7); }
  else fit({ start: IMG.holos, f: IMG.flash, y: IMG.yarosh, y2: IMG.yarosh2, d: IMG.dynex }[t] || IMG[t]);
}

// ---------- редактор
function editorScene(d) {
  let cam = 0, tool = '#', menu = null, msel = 0, confirm = null, toast = null, stroke = null, built = null;
  const undo = [];
  const bMenu = { x: 2, y: 1, w: 32, h: 10 }, bL = { x: 37, y: 1, w: 12, h: 10 }, bR = { x: 51, y: 1, w: 12, h: 10 };
  const bUndo = { x: 226, y: 1, w: 44, h: 10 }, bTest = { x: 274, y: 1, w: 44, h: 10 };
  const say = s => { toast = [s, 130]; };
  const viewW = () => VW / ED.k;
  const maxCam = () => Math.max(0, d.W * T - viewW());
  const changed = () => { d.ver = false; d.dirty = true; built = null; };
  const snap = () => JSON.stringify(mkPack(d));
  const pushUndo = s => { undo.push(s || snap()); if (undo.length > 60) undo.shift(); };
  const cellAt = p => {
    if (!p || p.y < ED.top || p.y >= ED.map || p.x < 0 || p.x >= VW) return null;
    const cx = Math.floor((p.x / ED.k + cam) / T), cy = Math.floor((p.y - ED.top) / ED.k / T);
    return cx >= 0 && cx < d.W && cy >= 0 && cy < H ? { x: cx, y: cy } : null;
  };
  const onStart = (x, y) => d.start.x === x && d.start.y === y;
  const onGoal = (x, y) => d.goal.x === x && (d.goal.y === y || d.goal.y - 1 === y);
  function apply(c, t) {
    const k = c.x + ',' + c.y;
    if (t === 'erase') {
      if (d.o[k]) { delete d.o[k]; return true; }
      if (d.g[c.y][c.x] !== '.') { d.g[c.y][c.x] = '.'; return true; }
      return false;
    }
    if (MK_TILES[t]) {
      if (onStart(c.x, c.y) || onGoal(c.x, c.y) || (d.g[c.y][c.x] === t && !d.o[k])) return false;
      delete d.o[k]; d.g[c.y][c.x] = t; return true;
    }
    if (t === 'start' || t === 'goal') {
      const y = t === 'goal' ? Math.max(1, c.y) : c.y, p = d[t];
      if (p.x === c.x && p.y === y) return false;
      if (t === 'start' ? onGoal(c.x, y) : onStart(c.x, y) || onStart(c.x, y - 1)) return false;
      p.x = c.x; p.y = y;
      for (const yy of t === 'goal' ? [y, y - 1] : [y]) { d.g[yy][c.x] = '.'; delete d.o[c.x + ',' + yy]; }
      return true;
    }
    if (d.o[k] === t || onStart(c.x, c.y) || onGoal(c.x, c.y)) return false;
    if (!d.o[k] && Object.keys(d.o).length >= MK_OBJ_MAX) { say('СЛИШКОМ МНОГО ОБЪЕКТОВ'); return false; }
    d.o[k] = t; d.g[c.y][c.x] = '.'; return true;
  }
  function doUndo() {
    const s = undo.pop(); if (!s) { say('НЕЧЕГО ОТМЕНЯТЬ'); return; }
    const n = mkUnpack(JSON.parse(s));
    Object.assign(d, { W: n.W, g: n.g, o: n.o, start: n.start, goal: n.goal, zone: n.zone });
    changed(); sfx(300, 0.06, 'triangle', -100, 0.04);
  }
  function resize(nw) {
    nw = clamp(nw, ED.minW, ED.maxW); if (nw === d.W) return;
    pushUndo();
    if (nw > d.W) for (const row of d.g) { const last = row[row.length - 1]; while (row.length < nw) row.push(last === '^' ? '.' : last); }
    else {
      for (const row of d.g) row.length = nw;
      for (const k in d.o) if (+k.split(',')[0] >= nw) delete d.o[k];
      if (d.goal.x >= nw) { d.goal.x = nw - 2; for (const yy of [d.goal.y, d.goal.y - 1]) { d.g[yy][d.goal.x] = '.'; delete d.o[d.goal.x + ',' + yy]; } }
      if (d.start.x >= nw || onGoal(d.start.x, d.start.y)) { d.start.x = Math.min(d.start.x, nw - 1); if (onGoal(d.start.x, d.start.y)) d.start.x--; d.g[d.start.y][d.start.x] = '.'; delete d.o[d.start.x + ',' + d.start.y]; }
    }
    d.W = nw; changed();
  }
  function rename() { const s = ask('Название уровня (до 20 символов):', d.name); if (s !== null) { d.name = s.trim().slice(0, 20); d.dirty = true; } }
  function save() {
    if (!d.name) rename();
    if (!d.name) d.name = 'Уровень ' + (mkLoad().length + 1);
    say(mkSave(d) ? (d.ver ? 'СОХРАНЕНО (ПРОВЕРЕН)' : 'СОХРАНЕНО КАК ЧЕРНОВИК') : 'НЕ ВЫШЛО: МАКСИМУМ ' + MK_MAX + ' УРОВНЕЙ');
  }
  function share() {
    if (!d.ver) { say('СНАЧАЛА ПРОЙДИ УРОВЕНЬ: ТЕСТ ▶'); return; }
    if (d.dirty || !d.id) save();
    mkCopy(mkCode(d), say);
  }
  function test() {
    menu = null;
    mkPlay(d, 'test', {
      exit: () => { scene = me; },
      win: time => {
        d.ver = true;
        // уже сохранённый уровень сохраняем сразу вместе с отметкой о проверке
        const auto = d.id && mkSave(d);
        scene = mkMsgScene(d.zone, 'ПРОВЕРЕНО!', '#19ff9c', ['ВРЕМЯ: ' + fmtTime(time), auto ? 'УРОВЕНЬ СОХРАНЁН' : 'ТЕПЕРЬ СОХРАНИ ЕГО В МЕНЮ', 'И ПОЛУЧИ КОД УРОВНЯ'], () => { scene = me; });
      },
    });
  }
  const menuItems = () => [
    { s: 'ПРОДОЛЖИТЬ', f: () => { menu = null; } },
    { s: 'НАЗВАНИЕ: ' + (d.name || '—'), f: rename },
    { s: '← ТЕМА: ' + ZONES[d.zone].name + ' →', adj: k => { pushUndo(); d.zone = (d.zone + k + ZONES.length) % ZONES.length; changed(); } },
    { s: '← ДЛИНА: ' + d.W + ' →', adj: k => resize(d.W + k * 10) },
    { s: 'СОХРАНИТЬ', f: save },
    { s: 'КОД УРОВНЯ' + (d.ver ? '' : ' (НУЖНА ПРОВЕРКА)'), f: share, off: !d.ver },
    { s: confirm === 'clear' ? 'ТОЧНО ОЧИСТИТЬ?' : 'ОЧИСТИТЬ ВСЁ', f: () => {
      if (confirm !== 'clear') { confirm = 'clear'; return; }
      pushUndo(); d.g = mkBlank(d.W); d.o = {}; d.start = { x: 2, y: H - 4 }; d.goal = { x: d.W - 4, y: H - 4 }; changed(); confirm = null; menu = null;
    } },
    { s: confirm === 'exit' ? 'ВЫЙТИ БЕЗ СОХРАНЕНИЯ?' : 'ВЫЙТИ', f: () => {
      if (d.dirty && confirm !== 'exit') { confirm = 'exit'; return; }
      scene = makerMenuScene();
    } },
  ];
  const MX = 50, MW = 220, MY = 30, MH = 13;
  function menuUpdate() {
    const items = menuItems(), n = items.length, prev = msel;
    if (codes.has('Escape')) { menu = null; confirm = null; return; }
    if (codes.has('ArrowUp') || codes.has('KeyW')) msel = (msel + n - 1) % n;
    if (codes.has('ArrowDown') || codes.has('KeyS')) msel = (msel + 1) % n;
    let act = null, k = 0;
    if (codes.has('ArrowLeft') || codes.has('KeyA')) { act = msel; k = -1; }
    if (codes.has('ArrowRight') || codes.has('KeyD')) { act = msel; k = 1; }
    if (codes.has('Enter') || codes.has('Space')) { act = msel; k = 1; }
    if (click) {
      const i = Math.floor((click.y - MY) / MH);
      if (click.x >= MX && click.x < MX + MW && i >= 0 && i < n) { msel = i; act = i; k = click.x < MX + MW / 2 ? -1 : 1; }
      else if (!inside(click, { x: MX - 6, y: MY - 18, w: MW + 12, h: n * MH + 30 })) { menu = null; confirm = null; return; }
    }
    if (msel !== prev) confirm = null;
    if (act === null) return;
    const it = items[act];
    if (it.adj) { if (k) it.adj(k); }
    else if (k > 0 || click) { const was = confirm; it.f(); if (was && confirm === was) confirm = null; }
    sfx(600, 0.04, 'square', 0, 0.03);
  }
  const me = {
    pad: 'none', wheel: true, music: 'Level Editor',
    update() {
      if (toast && --toast[1] <= 0) toast = null;
      if (menu) { menuUpdate(); ptr.tap = null; stroke = null; wheel = 0; undoKey = false; return; }
      if (codes.has('Escape')) { menu = true; msel = 0; confirm = null; return; }
      if (undoKey) { undoKey = false; doUndo(); }
      if (codes.has('Enter') || codes.has('KeyT')) { test(); return; }
      for (let i = 0; i < MK_TOOLS.length; i++) if (codes.has('Digit' + (i + 1))) tool = MK_TOOLS[i][0];
      // кнопки
      if (click) {
        if (inside(click, bMenu)) { menu = true; msel = 0; confirm = null; return; }
        if (inside(click, bUndo)) doUndo();
        if (inside(click, bTest)) { test(); return; }
        if (click.y >= ED.pal) {
          const row = click.y < ED.pal + 16 ? MK_TOOLS.map(t => t[0]) : MK_ENEMIES, i = Math.floor((click.x - 2) / 17);
          if (i >= 0 && i < row.length) { tool = row[i]; sfx(700, 0.03, 'square', 0, 0.03); }
        }
      }
      // прокрутка: ← →, колесо, кнопки ◀ ▶ (держать)
      cam += (keys.right - keys.left) * 5 + wheel * 0.6; wheel = 0;
      if (ptr.down && inside(ptr, bL)) cam -= 6;
      if (ptr.down && inside(ptr, bR)) cam += 6;
      // рисование
      // нажатие засчитывается только в кадре, когда оно случилось (не то, которым закрыли прошлый экран)
      const tap = ptr.tap && ptr.tap.f === frame ? ptr.tap : null; ptr.tap = null;
      if (tap) {
        if (tap.y >= ED.top && tap.y < ED.map) stroke = { t: tap.btn === 2 ? 'erase' : tool, last: null, pushed: false, px: tap.x, cam };
        else if (tap.y >= ED.map && tap.y < ED.pal) stroke = { t: 'map' };
        else stroke = null;
      }
      if (stroke) {
        const at = tap || ptr;   // первый кадр штриха — точка нажатия, дальше — где сейчас палец/мышь
        if (stroke.t === 'hand') cam = stroke.cam - (at.x - stroke.px) / ED.k;
        else if (stroke.t === 'map') cam = at.x / VW * d.W * T - viewW() / 2;
        else {
          const c = cellAt(at);
          if (c && (!stroke.last || c.x !== stroke.last.x || c.y !== stroke.last.y)) {
            const single = !MK_TILES[stroke.t] && stroke.t !== 'erase';   // объекты — по одному за нажатие, тайлы и ластик — протяжкой
            if (!(single && stroke.last)) {
              const before = stroke.pushed ? null : snap();
              if (apply(c, stroke.t)) {
                if (before) { pushUndo(before); stroke.pushed = true; }
                changed(); sfx(stroke.t === 'erase' ? 200 : 500 + c.y * 20, 0.03, 'square', 0, 0.025);
              }
            }
            stroke.last = c;
          }
        }
      }
      if (!ptr.down) stroke = null;
      cam = clamp(cam, 0, maxCam());
    },
    draw() {
      const Z = ZONES[d.zone];
      if (!built) built = mkBuild(d);
      drawBG(d.zone, cam * ED.k);
      // поле
      ctx.save();
      ctx.beginPath(); ctx.rect(0, ED.top, VW, ED.map - ED.top); ctx.clip();
      ctx.translate(0, ED.top); ctx.scale(ED.k, ED.k); ctx.translate(-Math.round(cam), 0);
      const tx0 = Math.max(0, Math.floor(cam / T)), tx1 = Math.min(d.W - 1, tx0 + Math.ceil(viewW() / T) + 1);
      ctx.fillStyle = '#ffffff16';
      for (let x = tx0; x <= tx1 + 1; x++) ctx.fillRect(x * T, 0, 1, H * T);
      for (let y = 1; y < H; y++) ctx.fillRect(tx0 * T, y * T, (tx1 - tx0 + 1) * T, 1);
      drawTiles(d.g, Z, tx0, tx1);
      if (d.W * T < cam + viewW()) { ctx.fillStyle = '#000000b0'; ctx.fillRect(d.W * T, 0, viewW(), H * T); }
      for (const pl of built.plats) { ctx.fillStyle = '#ffffff50'; ctx.fillRect(pl.a, pl.y + 2, pl.b + pl.w - pl.a, 2); drawPlat(pl, Z); }
      for (const e of built.ents) {
        // дорожка ходячего врага — жёлтая полоска под ногами
        if (e.x0 !== undefined || e.t === 'ban' || e.t === 'duo') {
          const a = e.x0 !== undefined ? e.x0 : e.x, b = e.x1 !== undefined ? e.x1 + SIZES[e.t][0] : e.x + e.w, fy = e.gy || e.y + e.h;
          ctx.fillStyle = '#ffd23e70'; ctx.fillRect(a, fy - 2, b - a, 2);
        }
        drawEnt(e.t === 'ban' ? Object.assign({}, e, { hy: e.gy - 40 }) : e);
      }
      spr(IMG.holos, d.start.x * T + 1, (d.start.y + 1) * T - 16, false);
      const hc = ptr.over && cellAt(ptr);
      if (hc && !menu) {
        ctx.fillStyle = tool === 'erase' || (ptr.down && ptr.btn === 2) ? '#ff5a5a50' : '#ffffff40'; ctx.fillRect(hc.x * T, hc.y * T, T, T);
        ctx.fillStyle = '#fff'; ctx.fillRect(hc.x * T, hc.y * T, T, 1); ctx.fillRect(hc.x * T, hc.y * T + T - 1, T, 1); ctx.fillRect(hc.x * T, hc.y * T, 1, T); ctx.fillRect(hc.x * T + T - 1, hc.y * T, 1, T);
      }
      ctx.restore();
      // верхняя панель
      ctx.fillStyle = '#17161cee'; ctx.fillRect(0, 0, VW, ED.top);
      const btn = (r, s, fill, col) => { box(r.x, r.y, r.w, r.h, fill, '#000'); text(s, r.x + r.w / 2, r.y + 2, col, 6, 'center'); };
      btn(bMenu, 'МЕНЮ', '#2b2a33', '#fff'); btn(bL, '←', ptr.down && inside(ptr, bL) ? '#4a4858' : '#2b2a33', '#fff'); btn(bR, '→', ptr.down && inside(ptr, bR) ? '#4a4858' : '#2b2a33', '#fff');
      text(d.ver ? 'ПРОВЕРЕН' : 'НЕ ПРОВЕРЕН', 67, 3, d.ver ? '#19ff9c' : '#ff7a6a', 6);
      if (d.dirty) text('*', d.ver ? 117 : 135, 3, '#ffd23e', 6);
      btn(bUndo, 'ОТМЕНА', '#2b2a33', undo.length ? '#fff' : '#6b6a76');
      btn(bTest, 'ТЕСТ ▶', '#19ff9c', '#17161c');
      // мини-карта
      ctx.fillStyle = '#000'; ctx.fillRect(0, ED.map, VW, ED.pal - ED.map);
      const sx = VW / (d.W * T);
      ctx.fillStyle = '#ffffff30'; ctx.fillRect(cam * sx, ED.map, viewW() * sx, 4);
      ctx.fillStyle = '#2ecc71'; ctx.fillRect(d.start.x * T * sx, ED.map, 2, 4);
      ctx.fillStyle = '#ff4fd8'; ctx.fillRect(d.goal.x * T * sx, ED.map, 2, 4);
      // палитра
      ctx.fillStyle = '#17161cf4'; ctx.fillRect(0, ED.pal, VW, VH - ED.pal);
      const cell = (t, i, y) => {
        const x = PAL_X(i), on = t === tool;
        box(x, y, 15, 14, on ? '#4a4858' : '#2b2a33', on ? '#ffd23e' : '#000');
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, 15, 14); ctx.clip(); mkIcon(t, x + 1, y, Z); ctx.restore();
      };
      MK_TOOLS.forEach((t, i) => cell(t[0], i, ED.pal + 1));
      MK_ENEMIES.forEach((t, i) => cell(t, i, ED.pal + 17));
      text(MK_NAME[tool] || '', 157, ED.pal + 5, '#ffd23e', 6);
      text(Object.keys(d.o).length + '/' + MK_OBJ_MAX, 316, ED.pal + 21, '#6b6a76', 6, 'right');
      if (toast) { const w = textW(toast[0], 6) + 12; box(160 - w / 2, 118, w, 13, '#17161cee', '#ffd23e'); text(toast[0], 160, 121, '#fff', 6, 'center'); }
      // меню
      if (menu) {
        const items = menuItems();
        ctx.fillStyle = '#000000a0'; ctx.fillRect(0, 0, VW, VH);
        box(MX - 6, MY - 18, MW + 12, items.length * MH + 30, '#17161c', '#ffd23e');
        text('КОНСТРУКТОР', 160, MY - 13, '#ffd23e', 8, 'center');
        items.forEach((it, i) => {
          const y = MY + i * MH, on = i === msel;
          if (on) { ctx.fillStyle = '#2b2a33'; ctx.fillRect(MX, y, MW, MH - 1); }
          text(it.s, 160, y + 3, it.off ? '#6b6a76' : confirm && on ? '#ff7a6a' : on ? '#fff' : '#c9c9d4', 6, 'center');
        });
        text('↑ ↓ ВЫБОР   ← → МЕНЯТЬ   ESC НАЗАД', 160, MY + items.length * MH + 2, '#6b6a76', 6, 'center');
      }
    },
  };
  return me;
}

// ---------- список своих уровней
function makerMenuScene(msg) {
  let list = mkLoad(), sel = 0, page = 0, toast = msg ? [msg, 150] : null, confirmDel = null;
  const bNew = { x: 8, y: 22, w: 98, h: 14 }, bCode = { x: 111, y: 22, w: 98, h: 14 }, bBack = { x: 214, y: 22, w: 98, h: 14 };
  const ROW_Y = 44, ROW_H = 15, pages = () => Math.max(1, Math.ceil(list.length / MK_PER));
  const bPrev = { x: 240, y: 152, w: 16, h: 12 }, bNext = { x: 296, y: 152, w: 16, h: 12 };
  const cols = { play: { x: 188, w: 40 }, edit: { x: 231, w: 28 }, code: { x: 262, w: 22 }, del: { x: 287, w: 24 } };
  const say = s => { toast = [s, 150]; };
  const play = p => {
    const d = mkUnpack(p);
    mkPlay(d, 'play', {
      exit: () => { scene = makerMenuScene(); },
      win: (time, deaths) => {
        const all = mkLoad(), q = all.find(x => x.id === p.id), rec = q && (!q.best || time < q.best);
        if (rec) { q.best = time; mkStore(all); }
        scene = mkMsgScene(d.zone, 'ПРОЙДЕНО!', '#19ff9c', ['ВРЕМЯ: ' + fmtTime(time) + (rec ? '  РЕКОРД!' : ''), 'СМЕРТЕЙ: ' + deaths], () => { scene = makerMenuScene(); });
      },
    });
  };
  const act = (what, i) => {
    const p = list[i]; if (!p) return;
    if (what !== 'del') confirmDel = null;
    if (what === 'play') { if (p.ver) play(p); else say('ЧЕРНОВИК: СНАЧАЛА ПРОВЕРЬ ЕГО В РЕДАКТОРЕ'); }
    else if (what === 'edit') scene = editorScene(mkUnpack(p));
    else if (what === 'code') { if (p.ver) mkCopy(mkCode(mkUnpack(p)), say); else say('КОД ЕСТЬ ТОЛЬКО У ПРОВЕРЕННЫХ'); }
    else if (what === 'del') {
      if (confirmDel !== p.id) { confirmDel = p.id; say('НАЖМИ ЕЩЁ РАЗ, ЧТОБЫ УДАЛИТЬ'); return; }
      list.splice(i, 1); mkStore(list); confirmDel = null; sel = clamp(sel, 0, Math.max(0, list.length - 1)); page = Math.floor(sel / MK_PER); say('УДАЛЕНО');
    }
  };
  const create = () => { if (list.length >= MK_MAX) say('МАКСИМУМ ' + MK_MAX + ' УРОВНЕЙ'); else scene = editorScene(mkNew()); };
  const importCode = () => {
    const s = ask('Вставь код уровня:'); if (s === null || !s.trim()) return;
    const p = mkDecode(s);
    if (!p) { say('КОД НЕ ПОДХОДИТ'); return; }
    if (list.length >= MK_MAX) { say('МАКСИМУМ ' + MK_MAX + ' УРОВНЕЙ'); return; }
    p.id = newId(); if (!p.name) p.name = 'Уровень из кода';
    list.unshift(p); mkStore(list); sel = 0; page = 0; say('УРОВЕНЬ ДОБАВЛЕН — МОЖНО ИГРАТЬ');
  };
  return {
    pad: 'none', music: 'Menu',
    update() {
      if (toast && --toast[1] <= 0) toast = null;
      const n = list.length;
      if (codes.has('Escape')) { scene = titleScene(); return; }
      if (codes.has('KeyN')) { create(); return; }
      if (codes.has('KeyI')) importCode();
      if (n) {
        if (codes.has('ArrowUp') || codes.has('KeyW')) { sel = (sel + n - 1) % n; confirmDel = null; }
        if (codes.has('ArrowDown') || codes.has('KeyS')) { sel = (sel + 1) % n; confirmDel = null; }
        if (codes.has('ArrowLeft') || codes.has('KeyA')) sel = clamp(sel - MK_PER, 0, n - 1);
        if (codes.has('ArrowRight') || codes.has('KeyD')) sel = clamp(sel + MK_PER, 0, n - 1);
        page = Math.floor(sel / MK_PER);
        if (codes.has('Enter') || codes.has('Space')) { act(list[sel].ver ? 'play' : 'edit', sel); return; }
        if (codes.has('KeyE')) { act('edit', sel); return; }
        if (codes.has('KeyC')) act('code', sel);
        if (codes.has('Delete') || codes.has('Backspace')) act('del', sel);
      }
      if (!click) return;
      if (inside(click, bNew)) { create(); return; }
      if (inside(click, bCode)) { importCode(); return; }
      if (inside(click, bBack)) { scene = titleScene(); return; }
      if (pages() > 1 && inside(click, bPrev)) { page = (page + pages() - 1) % pages(); sel = page * MK_PER; }
      if (pages() > 1 && inside(click, bNext)) { page = (page + 1) % pages(); sel = page * MK_PER; }
      const r = Math.floor((click.y - ROW_Y) / ROW_H), i = page * MK_PER + r;
      if (r >= 0 && r < MK_PER && i < n && click.x >= 8 && click.x <= 312) {
        sel = i;
        for (const k in cols) if (click.x >= cols[k].x && click.x < cols[k].x + cols[k].w) { act(k, i); return; }
        confirmDel = null;
      }
    },
    draw() {
      drawBG(3, frame * 0.3); ctx.fillStyle = '#000000a8'; ctx.fillRect(0, 0, VW, VH);
      text('КОНСТРУКТОР УРОВНЕЙ', 8, 6, '#ffd23e', 8);
      const b = (r, s, fill, col) => { box(r.x, r.y, r.w, r.h, fill, '#fff'); text(s, r.x + r.w / 2, r.y + 4, col, 6, 'center'); };
      b(bNew, '+ НОВЫЙ (N)', '#19ff9c', '#17161c'); b(bCode, 'ВВЕСТИ КОД (I)', '#2b2a33', '#fff'); b(bBack, 'НАЗАД (ESC)', '#2b2a33', '#fff');
      if (!list.length) {
        text('ПОКА ПУСТО.', 160, 74, '#fff', 8, 'center');
        text('НАРИСУЙ СВОЙ УРОВЕНЬ, ПРОЙДИ ЕГО САМ —', 160, 94, '#c9c9d4', 6, 'center');
        text('И ПОЛУЧИШЬ КОД, ЧТОБЫ ПОДЕЛИТЬСЯ.', 160, 104, '#c9c9d4', 6, 'center');
      }
      for (let r = 0; r < MK_PER; r++) {
        const i = page * MK_PER + r, p = list[i]; if (!p) break;
        const y = ROW_Y + r * ROW_H, on = i === sel;
        box(8, y, 304, ROW_H - 2, on ? '#2b2a33' : '#17161ccc', on ? '#ffd23e' : '#000');
        text(p.name || 'Без названия', 12, y + 3, '#fff', 6);
        text(p.ver ? (p.imp ? 'ИЗ КОДА' : 'ПРОВЕРЕН') : 'ЧЕРНОВИК', 136, y + 3, p.ver ? '#19ff9c' : '#ff9a6a', 6);
        const c = (k, s, ok, col) => { box(cols[k].x, y + 1, cols[k].w, ROW_H - 4, ok ? col : '#2b2a33', '#000'); text(s, cols[k].x + cols[k].w / 2, y + 3, ok ? '#17161c' : '#6b6a76', 6, 'center', false); };
        c('play', 'ИГРАТЬ', p.ver, '#19ff9c'); c('edit', 'ИЗМ.', true, '#c9c9d4'); c('code', 'КОД', p.ver, '#ffd23e');
        c('del', confirmDel === p.id ? 'ДА?' : 'X', true, confirmDel === p.id ? '#ff5a5a' : '#c9c9d4');
      }
      const p = list[sel];
      if (p) text(`ДЛИНА ${p.W}` + (p.best ? `  ЛУЧШЕЕ ВРЕМЯ ${fmtTime(p.best)}` : ''), 10, 155, '#9a9aa6', 6);
      if (pages() > 1) { b(bPrev, '←', '#2b2a33', '#fff'); b(bNext, '→', '#2b2a33', '#fff'); text(`${page + 1}/${pages()}`, 276, 155, '#fff', 6, 'center'); }
      text('↑ ↓ ВЫБОР  ENTER ИГРАТЬ  E ИЗМЕНИТЬ  C КОД', 160, 170, '#6b6a76', 6, 'center');
      if (toast) { const w = textW(toast[0], 6) + 12; box(160 - w / 2, 136, w, 13, '#17161cee', '#ffd23e'); text(toast[0], 160, 139, '#fff', 6, 'center'); }
    },
  };
}

if (window.__G) Object.assign(window.__G, { makerMenuScene, editorScene, mkNew, mkPack, mkUnpack, mkBuild, mkPlay, mkCode, mkDecode, mkLoad, mkSave, ptr });
