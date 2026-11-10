'use strict';
// ЛИПОВАЯ ВЕТКА: десять уровней (внутри кода 101–110), открывается победой над Ведмедиком Бо.
// Файл подключается после game.js и пользуется его общими переменными (scene, L, P, ctx, keys, ...).
// Акты: I — соляная шахта (101–103), II — Мёртвое море и Моссад (104–106), III — Windows (107–109), 110 — Билл Гейтс (gates.js).

ZONES.push(
  { name: 'СОЛЯНАЯ ЖИЛА', sky: ['#0c0a12', '#1d1830'], gTop: '#f1eef7', gBody: '#a89fb8', gDark: '#7d7390' },          // 8
  { name: 'МЁРТВОЕ МОРЕ', sky: ['#d9884a', '#f6d9a0'], gTop: '#e6d3a0', gBody: '#b8996a', gDark: '#8f7550' },           // 9
  { name: 'БЕЗМЯТЕЖНОСТЬ', sky: ['#3a78d8', '#bfe4fa'], gTop: '#4cb02a', gBody: '#8a5a2c', gDark: '#6b4220' },          // 10
  { name: 'СИНИЙ ЭКРАН', sky: ['#0000a8', '#0000a8'], gTop: '#ffffff', gBody: '#0000a8', gDark: '#0000a8', bsod: true },  // 11
  { name: 'РАБОЧИЙ СТОЛ', sky: ['#008080', '#008080'], gTop: '#dfdfdf', gBody: '#808080', gDark: '#404040' },            // 12
);
ZONE_MUSIC[8] = 'Branch Salt'; ZONE_MUSIC[9] = 'Branch Mossad'; ZONE_MUSIC[10] = 'Branch Windows'; ZONE_MUSIC[11] = 'Branch Windows'; ZONE_MUSIC[12] = 'Branch Gates Boss';
Object.assign(SIZES, { ag: [12, 18], cam: [10, 8], las: [2, 16], clip: [12, 14], btn: [22, 10], key: [10, 6] });
Object.assign(NAMES, { ag: 'АГЕНТ', clip: 'Скрепыш' });

const BR = {
  NAMES: ['ЗАСОЛКА', 'РАССОЛ', 'ВДОХ', 'МЁРТВОЕ МОРЕ', 'УЧЕБКА', 'ЛЕГЕНДА', 'БЕЗМЯТЕЖНОСТЬ', 'ЦЕНТР ОБНОВЛЕНИЙ', 'СИНИЙ ЭКРАН', 'БИЛЛ ГЕЙТС'],
  keys: 0, got: {},   // ключи активации: сколько в кармане и на каких уровнях уже подобраны
  INTRO: {
    101: ['ЛИПОВАЯ ВЕТКА\n\nСоляная стена рухнула, а за ней — рельсы. Холос садится в вагонетку и едет вниз.',
      'В вагонетке трещит рация:\n\n«Холос, слышишь? Не останавливайся. Соль крошится. Кто я — потом.»'],
    102: ['РАССОЛ\n\nШахта затоплена. Рассол прибывает снизу и не торгуется.\n\nРация: «Вверх. Только вверх. Башеры тебя оглушат, а я тебя не вытащу.»'],
    103: ['ВДОХ\n\nБо проснулся. Не тот, которого ты кормил мёдом. Другой. Побольше.\n\nРация: «Не стой! Ветер тянет в пасть. Каждый прыжок вправо — короче».'],
    104: ['МЁРТВОЕ МОРЕ\n\nВагонетка выкатилась прямо в воду. Соль держит так, что нырять — это труд.\n\nРация: «Это не Газа. Это ближе к цели. Плыви.»',
      'Плыви вправо. Держи ↓, чтобы нырять: рассол выталкивает наверх, а мины плавают у поверхности.\n\nПодлодки пускают торпеды по глубине.'],
    105: ['УЧЕБКА\n\nБерег. Бетон. Камеры на потолке и лазеры в проходах.\n\nРация: «Это полоса препятствий. Так, для разминки. Шайтаны сдадут тебя камерам, если подойдёшь».'],
    106: ['ЛЕГЕНДА\n\nНа выходе — окошко. Подделать нужно три документа подряд, и правила меняются на ходу.\n\nРация: «Это не экзамен, Холос. Ну, почти.»',
      'Три паспорта подряд. Ошибка в любом — и всё сначала. На каждый следующий времени меньше.'],
    107: ['БЕЗМЯТЕЖНОСТЬ\n\nГолос в рации наконец признаётся: «Билл Гейтс заплатил Носу, чтобы тот запушил обнову в ядро 8. Тебе нужна старая XP-машина в нашей конспиративной квартире».\n\nХолос ныряет в экран.',
      'Зелёные холмы. Окна как платформы: стоять нельзя. Скрепыш очень хочет помочь.'],
    108: ['ЦЕНТР ОБНОВЛЕНИЙ\n\n«Перезагрузка через 10…»\n\nКасайся кнопок «Отложить», пока компьютер не перезагрузился. Кнопки стоят не на дороге.'],
    109: ['СИНИЙ ЭКРАН\n\nЯдро 8 упало. Твёрдый здесь только текст ошибки.\n\nДамп памяти набирается. На 100% всё закончится.'],
    110: ['БИЛЛ ГЕЙТС\n\nРабочий стол. Окно с портретом. Полоса «Установка ядра 8».\n\nГейтс не поддаётся, если флешка летит слишком долго. Бей вблизи.'],
  },
  // ----- сохранение и ключи
  unlocked() { try { return localStorage.getItem('holos_bo') === '1'; } catch (e) { return false; } },
  load() { try { return clamp(parseInt(localStorage.getItem('holos_br')) || 101, 101, 110); } catch (e) { return 101; } },
  save(n) { if (HC) return; try { localStorage.setItem('holos_br', String(n)); localStorage.setItem('holos_brk', JSON.stringify({ k: BR.keys, g: BR.got })); } catch (e) { } },
  saveKeys() { if (HC || CHEAT) return; try { localStorage.setItem('holos_brk', JSON.stringify({ k: BR.keys, g: BR.got })); } catch (e) { } },
  restore() {
    BR.keys = 0; BR.got = {};
    try { const o = JSON.parse(localStorage.getItem('holos_brk') || '{}'); BR.keys = clamp(o.k | 0, 0, 3); BR.got = o.g && typeof o.g === 'object' ? o.g : {}; } catch (e) { }
  },
  reset() { BR.keys = 0; BR.got = {}; try { localStorage.removeItem('holos_brk'); } catch (e) { } },
  // ----- вход и переходы
  begin() { BR.reset(); try { localStorage.removeItem('holos_br'); } catch (e) { } BR.go(101, true); },
  cont() { BR.restore(); BR.go(BR.load(), true); },
  go(n, intro) {
    const next = () => BR.enter(n);
    if (intro && BR.INTRO[n]) scene = cardScene(BR.INTRO[n], next, zoneOf(n)); else next();
  },
  enter(n) {
    if (!CHEAT) BR.save(n);
    if (n === 104) scene = swimScene(() => BR.advance(105), { fail: why => BR.death(104, 'swim', why), again: () => BR.againText(104) });
    else if (n === 106) scene = passportScene(() => BR.advance(107), {
      docs: 3, times: [4800, 3600, 2700], change: true, music: 'Branch Mossad',
      title: (d, D) => `УЧЕБКА: ДОКУМЕНТ ${d}/${D}`, fail: why => BR.death(106, 'doc', why),
    });
    else startLevel(n);
  },
  advance(n) { if (n > 110) return BR.win(); BR.go(n, true); },
  restart(n) { startLevel(n); },
  againText(n) {
    if (CHEAT) return 'НАЖМИ, ЧТОБЫ ПОПРОБОВАТЬ СНОВА';
    if (HC) return 'ХАРДКОР: НАЧНЁШЬ С 1 УРОВНЯ ОСНОВНОЙ ИГРЫ';
    if (BR.keys > 0) return 'КЛЮЧ АКТИВАЦИИ СГОРИТ: ПРОДОЛЖИШЬ С ЭТОГО УРОВНЯ';
    return 'ВЕТКА НАЧНЁТСЯ С 1 УРОВНЯ';
  },
  // смерть: хардкор — на 1 уровень основной игры; иначе ключ активации даёт одно продолжение здесь, без ключа — на 1 уровень ветки
  respawn(n) {
    if (CHEAT) return BR.enter(n);
    if (HC) { BR.reset(); HONEY = 0; return startLevel(1); }
    if (BR.keys > 0) { BR.keys--; BR.saveKeys(); return BR.enter(n); }
    BR.reset(); BR.go(101, true);
  },
  death(n, c, why) {
    const WHY = { fall: 'ХОЛОС УПАЛ В ПРОПАСТЬ', brine: 'РАССОЛ НЕ ПРОЩАЕТ', bear: 'БО ВДОХНУЛ ХОЛОСА', mossad: 'ХОЛОСА ЗАДЕРЖАЛ МОССАД', dump: 'ДАМП ПАМЯТИ ДОСТИГ 100%', reboot: 'ПЕРЕЗАГРУЗКА', spike: 'ХОЛОС НАСАДИЛСЯ НА ШИПЫ', gates: 'БИЛЛ ГЕЙТС ВЫИГРАЛ' };
    const title = why || WHY[c] || 'ХОЛОС ПОГИБ';
    let t = 0;
    return {
      pad: 'none',
      update() { t++; if (t === 20) sfx(160, 0.5, 'sawtooth', -120, 0.08); if (t > 100 && anyPressed) respawn(n); },
      draw() {
        drawBG(zoneOf(n), 0); ctx.fillStyle = '#000000d0'; ctx.fillRect(0, 0, VW, VH);
        const ls = wrap(title, 290, 8); ls.forEach((l, i) => text(l, 160, 42 + i * 12, '#ff5a5a', 8, 'center'));
        spr(c === 'bear' ? IMG.bearOpen : IMG.holos, c === 'bear' ? 60 : 144, c === 'bear' ? 70 : 82 + Math.min(t, 30) * 0.4, false, c === 'bear' ? 3 : 2);
        if (c === 'bear') spr(IMG.holos, 150 + Math.max(0, 40 - t) * 2, 100, false, 2);
        text(`УРОВЕНЬ ${n - 100}/10: ${BR.NAMES[n - 101]}`, 160, 132, '#9a9aa6', 6, 'center');
        if (t > 100 && frame % 60 < 40) text(BR.againText(n), 160, 152, '#fff', 6, 'center');
        if (!HC && !CHEAT && BR.keys > 0) text('КЛЮЧЕЙ: ' + BR.keys, 160, 164, '#ffd23e', 6, 'center');
      },
    };
  },
  // ----- вход в ветку: рушится соляная стена за Бо, за ней рельсы, вагонетка уезжает вглубь
  cartScene() {
    let t = 0;
    return {
      pad: 'none', music: 'Branch Salt',
      update() { t++; if (t === 30) sfx(80, 1.2, 'sawtooth', -30, 0.09); if (t > 300 || (t > 120 && anyPressed)) BR.begin(); },
      draw() {
        drawBG(4, 0); ctx.fillStyle = '#000000a0'; ctx.fillRect(0, 0, VW, VH);
        const col = Math.min(1, t / 60);
        ctx.fillStyle = '#e9e2f2'; for (let i = 0; i < 6; i++) ctx.fillRect(230 + (i % 2) * 14, 20 + i * 24 + col * 40 + (i * 7) % 5, 30, 20);   // осыпающаяся стена
        ctx.fillStyle = '#17161c'; ctx.fillRect(0, 150, VW, 6); ctx.fillStyle = '#6b6a76'; for (let x = (-t * 2) % 16; x < VW; x += 16) ctx.fillRect(x, 156, 3, 6);
        const cx = 40 + Math.max(0, t - 70) * 2.2;   // вагонетка с Холосом
        ctx.fillStyle = '#17161c'; ctx.fillRect(cx, 128, 40, 20); ctx.fillStyle = '#7a5a3c'; ctx.fillRect(cx + 1, 129, 38, 18); ctx.fillStyle = '#a98a50'; ctx.fillRect(cx + 1, 129, 38, 3);
        ctx.fillStyle = '#17161c'; ctx.fillRect(cx + 4, 146, 8, 8); ctx.fillRect(cx + 28, 146, 8, 8);
        spr(IMG.holos, cx + 12, 112, false);
        text('ЗА БО РУШИТСЯ СОЛЬ.', 160, 14, '#fff', 8, 'center');
        if (t > 50) text('ЗА НЕЙ — РЕЛЬСЫ.', 160, 28, '#b06cff', 8, 'center');
        if (t > 120 && frame % 60 < 40) text('ЛИПОВАЯ ВЕТКА ОТКРЫТА', 160, 168, '#9a9aa6', 6, 'center');
      },
    };
  },
  win() { scene = BR.mossadEnding(); },   // gates.js
  build(n) { return BUILD[n](); },
};

window.__G.BR = BR;   // для автотестов

// ---------- общий каркас уровня и генератор рельефа
function brBase(n, W) {
  const g = [...Array(H)].map(() => Array(W).fill('.'));
  return { n, W, g, ents: [], plats: [], secret: null, zone: zoneOf(n), t: 0, cam: 0, cdBase: 84, spawnY: (H - 3) * T - 14, banner: [`ВЕТКА ${n - 100}/10: ${BR.NAMES[n - 101]}`, 130], pops: [], br: {} };
}
function brFinish(L, extra) {
  const br = L.br; Object.assign(br, extra || {});
  const own = br.hud;
  br.hud = () => {
    if (!HC && (BR.keys || Object.keys(BR.got).length)) { spr(IMG.bkey, 6, 22); text('x' + BR.keys, 20, 22, '#ffd23e', 6); }
    if (own) own();
  };
  return L;
}
const brGroundY = px => { const tx = Math.floor(px / T); if (tx < 0 || tx >= L.W) return null; for (let ty = 0; ty < H; ty++) if (solid(tx, ty)) return ty * T; return null; };

function brGen(L, seed) {
  const R = rng(seed), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const g = L.g, W = L.W, ents = L.ents;
  const G = { R, ri, x: 0, gh: 3, thin: false, ch: '#', min: 1, max: 5 };
  const tile = (cx, y, ch) => { if (cx >= 0 && cx < W && y >= 0 && y < H) g[y][cx] = ch; };
  G.col = (cx, h, ch = G.ch) => { if (G.thin) tile(cx, H - h, ch); else for (let y = H - h; y < H; y++) tile(cx, y, ch); };
  G.flat = (len, ch) => { for (let i = 0; i < len && G.x < W; i++) G.col(G.x++, G.gh, ch); };
  G.top = () => (H - G.gh) * T;
  G.gap = len => { G.x += len; };
  G.step = d => { G.gh = clamp(G.gh + d, G.min, G.max); };
  G.spikes = k => { G.flat(2); for (let i = 0; i < k; i++) { G.col(G.x, G.gh); tile(G.x, H - G.gh - 1, '^'); G.x++; } G.flat(2); };
  G.yar = kind => { G.flat(2); ents.push(ent(kind, G.x * T + 1, G.top() - 16, { cd: 60 })); G.flat(ri(4, 5)); };
  // особые враги: те же, что в buildLevel (раскладка и параметры скопированы оттуда)
  G.place = t => {
    const f = G.flat, top = G.top;
    if (t === 'y' || t === 'y2') G.yar(t);
    else if (t === 'fat') { f(2); ents.push(ent('fat', G.x * T, top() - 18, { cd: 80 })); f(ri(4, 5)); }
    else if (t === 'ari') { f(2); ents.push(ent('ari', G.x * T, top() - 18, { st: 0, cd: 50, vx: 0, vy: 0, face: -1 })); f(ri(6, 7)); }
    else if (t === 'bar') { f(2); const a = G.x; f(ri(8, 10)); ents.push(ent('bar', (a + 4) * T, top() - 20, { x0: a * T, x1: G.x * T - 22, dir: -1, st: 0, cd: 40 })); f(2); }
    else if (t === 'alt') { f(2); const a = G.x; f(ri(8, 10)); ents.push(ent('alt', (a + 4) * T, top() - 18, { x0: a * T + 2, x1: G.x * T - 16, cd: 100 })); f(2); }
    else if (t === 'poc') { f(2); ents.push(ent('poc', G.x * T, top() - 20, { cd: 60, st: 0, tm: 0, met: false, talk: 0 })); f(ri(4, 5)); }
    else if (t === 'tel') { f(3); for (let i = 0; i < 2; i++) { const ex = (G.x + i * 2) * T, ey = top() - 62 - i * 16; ents.push(ent('tel', ex, ey, { hx: ex, hy: ey, ph: i * 2 })); } f(ri(6, 8)); }
    else if (t === 'ban') { f(2); const a = G.x; f(ri(7, 9)); const w = (G.x - a) * T; ents.push(ent('ban', a * T, top() - 12, { w, gy: top(), hx: a * T + w / 2 - 12, hy: top() - 90, st: 0, bt: 0, vy: 0, cd: 30 })); f(2); }
    else if (t === 'ano') { f(2); const a = G.x; f(ri(9, 11)); ents.push(ent('ano', (a + 3) * T, top() - 16, { x0: a * T, x1: G.x * T - 40, dir: -1, gy: top(), oy: 0, hv: 0, cd: 50 })); f(2); }
    else if (t === 'mak') { f(2); ents.push(ent('mak', G.x * T, top() - 24, { cd: 70, st: 0, tm: 0, anim: 0 })); f(ri(6, 7)); }
    else if (t === 'laa') { f(2); ents.push(ent('laa', G.x * T, top() - 18, { cd: 70, anim: 0 })); f(ri(5, 6)); }
    else if (t === 'vlad') { f(2); ents.push(ent('vlad', G.x * T, top() - 22, { cd: 80, n: 0, bt: 0, face: -1 })); f(ri(5, 6)); }
    else if (t === 'ros') { f(2); const a = G.x; f(ri(10, 12)); ents.push(ent('ros', (a + 4) * T, top() - 15, { x0: a * T, x1: G.x * T - 22, dir: -1, vx: 0, vy: 0, ground: true, air: false, cd: 40, jx: 0.6, mcd: 90, mk: null })); f(2); }
  };
  // общий цикл: вероятности ямы, ступеньки, шипов и особого врага (из пула по кругу, потом случайно)
  G.run = c => {
    let sp = 0; const pool = c.pool || [];
    while (G.x < c.until) {
      const r = R();
      if (r < c.pGap) { G.gap(ri(c.gap[0], c.gap[1])); G.flat(c.after || 3); }
      else if (r < c.pGap + c.pStep) { G.step((R() < 0.5 ? -1 : 1) * (c.stepMax || 1)); G.flat(3); }
      else if (r < c.pGap + c.pStep + c.pSpk) G.spikes(ri(1, 2));
      else if (r < c.pGap + c.pStep + c.pSpk + c.pEn && pool.length) G.place(sp < pool.length ? pool[sp++] : pool[ri(0, pool.length - 1)]);
      else G.flat(ri(c.flat[0], c.flat[1]));
    }
  };
  // ключ активации на двухступенчатом выступе над землёй (прыжок с первого блока на второй)
  G.nook = n => {
    G.step(0); G.gh = clamp(G.gh, 1, 4); G.flat(2);
    const bx = G.x; G.flat(8);
    const rowA = H - G.gh - 2, rowB = H - G.gh - 4;   // две ступени по 2 клетки: с земли на первый блок, с него на второй
    tile(bx, rowA, '='); tile(bx + 1, rowA, '='); tile(bx + 5, rowB, '='); tile(bx + 6, rowB, '=');
    if (!HC && !BR.got[n]) ents.push(ent('key', (bx + 5) * T + 11, rowB * T - 7));
  };
  G.end = () => { G.flat(L.W - G.x); ents.push(ent('g', (L.W - 4) * T, G.top() - 26)); };
  return G;
}

// ---------- сущности ветки
ENEMY.key = (e) => {
  if (ov(P, e, 0)) {
    e.dead = true; BR.keys = Math.min(3, BR.keys + 1); BR.got[L.n] = 1; BR.saveKeys();
    sfx(700, 0.4, 'triangle', 700, 0.08); burst(e.x + 5, e.y + 3, '#ffd23e', 16);
    L.pops.push({ x: e.x - 20, y: e.y - 14, s: 'КЛЮЧ АКТИВАЦИИ!', t: 80 }); L.banner = ['КЛЮЧ АКТИВАЦИИ: ОДНО ПРОДОЛЖЕНИЕ НА СМЕРТЬ', 150];
  }
};
ENT_DRAW.key = e => {
  spr(IMG.bkey, e.x, e.y + Math.sin(frame * 0.12) * 1.5);
  if (frame % 30 < 10) { ctx.fillStyle = '#fff'; ctx.fillRect(e.x + (frame >> 2) % 10, e.y - 3 + (frame >> 3) % 6, 1, 1); }
};
// агент Моссада: тот же ИИ, что у полицейского Путина (см. ENEMY.pol), но своя причина смерти
ENEMY.ag = (e, dx) => {
  if (--e.life <= 0 || e.y > H * T + 30) { e.dead = true; if (e.life <= 0) burst(e.x + 6, e.y + 9, '#c9c9d4', 10); return; }
  if (e.mode === undefined) { e.mode = 'run'; e.dir = e.face || 1; e.turn = 0; }
  if (e.hold > 0) { e.hold--; e.vx *= 0.8; }
  else if (e.mode === 'run') { e.vx += (e.dir * COP_RUN - e.vx) * 0.12; e.face = e.dir; if (dx * e.dir < -6) e.mode = 'brake'; }
  else if (e.mode === 'brake') { e.vx *= 0.978; e.face = e.dir; if (Math.abs(e.vx) < 0.25) { e.vx = 0; e.mode = 'turn'; e.turn = 80; } }
  else { e.vx *= 0.8; e.turn--; if (e.turn === 40) e.face = -e.dir; if (e.turn <= 0) { e.dir = Math.abs(dx) > 4 ? (dx < 0 ? -1 : 1) : -e.dir; e.face = e.dir; e.mode = 'run'; } }
  const vx0 = e.vx;
  e.vy = Math.min(7, e.vy + 0.35); e.ground = false;
  moveX(e, e.vx); const blocked = e.vx === 0 && Math.abs(vx0) > 0.5;
  moveY(e, e.vy);
  if (copDangerous(e)) { killCop(e, 'ОЙ!'); return; }
  if (blocked && e.mode === 'run' && e.ground) e.vy = -6.2;
  else if (blocked && e.mode === 'brake') { e.mode = 'turn'; e.turn = 80; }
  if (ov(P, e, 3)) {
    const hp = P.hp; hurt(1, 'mossad');
    if (scene !== playScene) return;
    if (P.hp < hp) { e.hold = 50; e.mode = 'turn'; e.turn = 80; L.pops.push({ x: e.x - 12, y: e.y - 10, s: 'СТОЯТЬ!', t: 40 }); }
  }
};
ENT_DRAW.ag = e => {
  const run = Math.abs(e.vx || 0) > 0.5;
  spr(IMG.agent, e.x, e.y - (run && Math.floor(frame / 3) % 2 ? 1 : 0), e.face < 0);
  if (frame % 20 < 10) { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(e.x + (e.face < 0 ? 9 : 2), e.y + 5, 1, 2); }   // огонёк гарнитуры
};
// камера наблюдения: конус обзора качается; заметил — копится «обнаружение» (с Шайтанами рядом конус шире и копится втрое быстрее)
ENEMY.cam = e => {
  const br = L.br, a = Math.PI / 2 + Math.sin(L.t * e.sp + e.ph) * e.amp; e.ang = a;
  const ox = e.x + 5, oy = e.y + 8, px = P.x + P.w / 2 - ox, py = P.y + P.h / 2 - oy, d = Math.hypot(px, py);
  let diff = Math.atan2(py, px) - a; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const k = br.reveal ? 1.45 : 1;
  e.seen = d < e.len * k && Math.abs(diff) < e.hw * k;
  if (e.seen && br.alarm <= 0) br.det += br.reveal ? 4.5 : 2;
};
ENT_DRAW.cam = e => {
  const alarm = L.br.alarm > 0, k = L.br.reveal ? 1.45 : 1, a = e.ang === undefined ? Math.PI / 2 : e.ang, ox = e.x + 5, oy = e.y + 8;
  ctx.fillStyle = alarm ? (frame % 10 < 5 ? 'rgba(255,40,40,0.32)' : 'rgba(255,40,40,0.18)') : e.seen ? 'rgba(255,210,60,0.34)' : 'rgba(120,255,200,0.16)';
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, e.len * k, a - e.hw * k, a + e.hw * k); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#17161c'; ctx.fillRect(e.x, e.y - 4, 10, 4); ctx.fillRect(e.x + 3, e.y, 4, 3);
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(a - Math.PI / 2); ctx.fillStyle = '#17161c'; ctx.fillRect(-5, -2, 10, 8); ctx.fillStyle = '#c9c9d4'; ctx.fillRect(-4, -1, 8, 6); ctx.fillStyle = alarm || e.seen ? '#ff3b3b' : '#19ff9c'; ctx.fillRect(-1, 2, 3, 3); ctx.restore();
};
// лазерная растяжка: пока луч включён, касание поднимает тревогу
ENEMY.las = e => {
  const ph = (L.t + e.ph) % e.period, on = ph < e.period * 0.55; e.on = on; e.warn = !on && ph > e.period - 24;
  if (on && L.br.alarm <= 0 && ov(P, e, 0)) { L.br.det = 999; L.pops.push({ x: P.x - 10, y: P.y - 14, s: 'ЛАЗЕР!', t: 40 }); sfx(1500, 0.2, 'square', -1000, 0.06); }
};
ENT_DRAW.las = e => {
  ctx.fillStyle = '#17161c'; ctx.fillRect(e.x - 3, e.y - 4, 8, 6); ctx.fillRect(e.x - 3, e.y + e.h, 8, 4);
  if (e.on) { ctx.fillStyle = '#ff2a2a'; ctx.fillRect(e.x, e.y, 2, e.h); ctx.fillStyle = '#ffd0d0'; ctx.fillRect(e.x, e.y + (frame * 3) % e.h, 2, 4); }
  else if (e.warn && frame % 6 < 3) { ctx.fillStyle = '#ff2a2a66'; ctx.fillRect(e.x, e.y, 1, e.h); }
};
// Скрепыш: «помогает» — переворачивает управление на 3 секунды (один раз), потом улетает
ENEMY.clip = (e, dx, dy) => {
  e.t2 = (e.t2 || 0) + 1;
  if (!e.used) {
    e.y = e.oy + Math.sin(e.t2 * 0.07) * 4;
    if (Math.abs(dx) < 80 && Math.abs(dy) < 70) {
      if (!e.talk) { e.talk = 1; e.bub = { lines: ['ПОХОЖЕ, ТЫ ПРЫГАЕШЬ.', 'ПОМОЧЬ?'], t: 40 }; sfx(1000, 0.1, 'square', 300, 0.04); }
      else if (++e.talk > 40) { e.used = 1; e.bub = { lines: ['ПОМОГ! :)'], t: 90 }; L.br.inv = 180; sfx(300, 0.4, 'sawtooth', 500, 0.07); L.banner = ['СКРЕПЫШ ПЕРЕВЕРНУЛ УПРАВЛЕНИЕ НА 3 СЕКУНДЫ', 150]; }
    }
  } else { e.y -= 0.8; e.x += 0.4; if (e.bub) e.bub.t--; if (e.y < -30) e.dead = true; }
  if (e.bub && !e.used && e.bub.t > 0) e.bub.t = 2;
};
ENT_DRAW.clip = e => { spr(IMG.clippy, e.x, e.y); };
// кнопка «Отложить» (уровень 108)
ENEMY.btn = e => {
  if (ov(P, e, 0)) { e.dead = true; L.br.cd = 600; L.br.pressed++; sfx(800, 0.2, 'triangle', 400, 0.07); L.pops.push({ x: e.x - 6, y: e.y - 12, s: 'ОТЛОЖЕНО', t: 50 }); }
};
ENT_DRAW.btn = e => {
  ctx.fillStyle = '#17161c'; ctx.fillRect(e.x - 1, e.y - 1, e.w + 2, e.h + 2);
  ctx.fillStyle = frame % 30 < 15 ? '#f0e8c8' : '#ffffff'; ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = '#7f7f7f'; ctx.fillRect(e.x, e.y + e.h - 1, e.w, 1);
  text('ОТЛОЖ.', e.x + e.w / 2, e.y + 2, '#17161c', 6, 'center', false);
};

// ---------- 101 ЗАСОЛКА: пол из соли крошится через ~0,4 с после приземления, с потолка падают кристаллы; нигде нельзя постоять
const BUILD = {};
BUILD[101] = () => {
  const L = brBase(101, 140), G = brGen(L, 5101);
  G.max = 5; G.min = 2; G.flat(8);
  G.thin = true; G.ch = 's'; G.step(0);
  let sp = 0;
  while (G.x < L.W - 12) {
    const r = G.R();
    if (r < 0.2) { G.gap(G.ri(1, 2)); G.flat(3); }
    else if (r < 0.36) { G.step((G.R() < 0.5 ? -1 : 1)); G.flat(3); }
    else if (r < 0.46 && G.x > 20 && sp < 6) { sp++; G.ch = '#'; G.yar('y'); G.ch = 's'; }   // на островках из крепкой породы стоят Ярош с бутылками
    else G.flat(G.ri(3, 6));
  }
  G.ch = '#'; G.end();
  const crum = {}, warns = [];
  return brFinish(L, {
    crum, warns, cdC: 90,
    post() {
      if (P.ground && !P.on) {
        const ty = Math.floor((P.y + P.h + 1) / T);
        for (const tx of [Math.floor(P.x / T), Math.floor((P.x + P.w) / T)]) if (L.g[ty] && L.g[ty][tx] === 's' && crum[tx + ',' + ty] === undefined) crum[tx + ',' + ty] = 24;
      }
      for (const k in crum) {
        if (--crum[k] > 0) continue;
        const [tx, ty] = k.split(',').map(Number); delete crum[k]; L.g[ty][tx] = '.';
        burst(tx * T + 8, ty * T + 8, '#e9e2f2', 8); sfx(240, 0.12, 'sawtooth', -120, 0.04);
      }
    },
    update() {
      const b = L.br;
      if (--b.cdC <= 0) { b.cdC = 70; b.warns.push({ x: clamp(P.x + P.vx * 26 + (Math.random() - 0.5) * 40, L.cam + 8, L.cam + VW - 14), t: 34 }); }
      for (const w of b.warns) if (--w.t <= 0) shots.push({ k: 'crystal', x: w.x, y: -12, vx: 0, vy: 2.2, g: 0.03, w: 7, h: 11 });
      b.warns = b.warns.filter(w => w.t > 0);
    },
    drawFront() { for (const w of L.br.warns) { if (w.t % 6 < 4) { ctx.fillStyle = '#ff5a5a'; ctx.fillRect(Math.round(w.x), 2, 7, 3); ctx.fillRect(Math.round(w.x) + 2, 5, 3, 2); } } },
  });
};

// ---------- 102 РАССОЛ: рассол поднимается снизу всё быстрее; путь идёт вверх по ступеням и езжающим платформам
BUILD[102] = () => {
  const L = brBase(102, 130), G = brGen(L, 5102);
  G.min = 2; G.max = 7; G.flat(8);
  let nook = false;
  while (G.x < L.W - 14) {
    const p = G.x / L.W, target = 3 + Math.floor(p * 4.4), r = G.R();
    if (!nook && G.x > 22 && G.gh <= 4) { nook = true; G.nook(102); }
    else if (G.gh < target && r < 0.6) { G.step(1); G.flat(3); }
    else if (r < 0.4) { const len = G.ri(6, 7); L.plats.push({ x: G.x * T + 2, y: G.top(), w: 32, h: 6, a: G.x * T + 2, b: (G.x + len) * T - 34, vx: 0.8 }); G.gap(len); G.flat(3); }
    else if (r < 0.66) G.yar('y2');
    else if (r < 0.74) G.place('fat');
    else G.flat(G.ri(3, 5));
  }
  G.end();
  return brFinish(L, {
    by: 190,
    pre() { L.br.by = 190 - 130 * Math.pow(L.t / 3000, 2); },
    post() { if (P.y + P.h > L.br.by + 3) die('brine'); },
    drawFront() {
      const by = L.br.by, cam = Math.round(L.cam);
      ctx.fillStyle = 'rgba(70,200,215,0.55)'; ctx.fillRect(cam, by, VW, 200);
      ctx.fillStyle = 'rgba(210,250,255,0.85)'; for (let x = 0; x < VW + 8; x += 8) ctx.fillRect(cam + x, by + Math.round(Math.sin((x + frame * 1.5) * 0.12) * 1.5), 8, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 10; i++) ctx.fillRect(cam + hash(i, 3) * VW, by + 8 + ((hash(i, 4) * 60 + frame * 0.3) % 80), 2, 2);
    },
    hud() { if (L.br.by < 176) text('РАССОЛ', 6, 172, '#c8f4ff', 6); },
  });
};

// ---------- 103 ВДОХ: постоянный ветер тянет влево, позади идёт Бо; остановился — съеден
BUILD[103] = () => {
  const L = brBase(103, 110), G = brGen(L, 5103);
  G.min = 2; G.max = 4; G.flat(10);
  G.run({ until: L.W - 14, pGap: 0.22, gap: [1, 2], after: 3, pStep: 0.12, stepMax: 1, pSpk: 0.1, pEn: 0.14, pool: ['y', 'fat', 'ari'], flat: [3, 6] });
  G.end();
  const streaks = [...Array(14)].map((_, i) => ({ x: hash(i, 1) * VW, y: 10 + hash(i, 2) * 150, l: 10 + hash(i, 3) * 16 }));
  return brFinish(L, {
    bx: -170, wind: 0.8,
    post() { moveX(P, -L.br.wind); },
    update() {
      const b = L.br;
      if (L.t > 90) b.bx += 0.72 + Math.min(0.3, L.t * 0.00006);
      if (P.x + 4 < b.bx) die('bear');
      for (const s of streaks) { s.x -= 6; if (s.x < -20) { s.x = VW + 10; s.y = 10 + Math.random() * 150; } }
    },
    drawFront() {
      const b = L.br, cam = Math.round(L.cam);
      for (const s of streaks) { ctx.fillStyle = 'rgba(247,241,250,0.35)'; ctx.fillRect(cam + Math.round(s.x), Math.round(s.y), s.l, 1); }
      spr(IMG.bearOpen, b.bx - 128, 44, false, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(b.bx - 8, 0, 8, 180);
    },
    hud() { if (L.t < 240 && frame % 40 < 28) text('НЕ ОСТАНАВЛИВАЙСЯ', 160, 46, '#ff9a9a', 8, 'center'); },
  });
};

// ---------- 105 УЧЕБКА: камеры с качающимся конусом и лазерные растяжки; заметили — сбегаются агенты Моссада
BUILD[105] = () => {
  const L = brBase(105, 130), G = brGen(L, 5105);
  G.min = 2; G.max = 4; G.flat(10);
  let pc = 0, nook = false; const pool = ['tel', 'bar', 'fat', 'tel', 'bar'];
  while (G.x < L.W - 14) {
    const r = G.R();
    if (!nook && G.x > 40) { nook = true; G.nook(105); }
    else if (r < 0.14) { G.gap(G.ri(2, 3)); G.flat(3); }
    else if (r < 0.24) { G.step(G.R() < 0.5 ? -1 : 1); G.flat(3); }
    else if (r < 0.46) {   // камера над ровным участком
      G.flat(2); const a = G.x; G.flat(G.ri(8, 10));
      L.ents.push(ent('cam', (a + 3) * T, 4, { a0: Math.PI / 2, amp: 0.85, sp: 0.022 + G.R() * 0.01, ph: G.R() * 6, len: 118, hw: 0.3 }));
      G.flat(2);
    } else if (r < 0.62) {   // лазерная растяжка
      G.flat(3); L.ents.push(ent('las', G.x * T + 7, 4, { h: G.top() - 4 - 6, period: 150, ph: Math.floor(G.R() * 150) })); G.flat(4);
    } else if (r < 0.78) G.place(pool[pc++ % pool.length]);
    else G.flat(G.ri(3, 5));
  }
  G.end();
  return brFinish(L, {
    det: 0, alarm: 0, reveal: false,
    pre() {
      const b = L.br;
      b.reveal = L.ents.some(e => e.t === 'tel' && !e.dead && Math.hypot(e.x + 5 - P.x, e.y + 5 - P.y) < 120);
      b.det = Math.max(0, b.det - 0.5); if (b.alarm > 0) b.alarm--;
    },
    update() {
      const b = L.br;
      if (b.det >= 30 && b.alarm <= 0) {
        b.det = 0; b.alarm = 480; sfx(900, 0.5, 'square', -400, 0.08); L.banner = ['ТРЕВОГА! АГЕНТЫ МОССАДА', 120]; shake = Math.max(shake, 5);
        const alive = L.ents.filter(e => e.t === 'ag' && !e.dead).length;
        for (const sx of [L.cam - 14, L.cam + VW + 4].slice(0, alive ? 1 : 2)) {
          const gy = brGroundY(sx + 6); if (gy === null) continue;
          L.ents.push(ent('ag', sx, gy - 18, { vx: 0, vy: 0, ground: true, face: sx < P.x ? 1 : -1, life: 480, hold: 24 }));
        }
        if (!L.ents.some(e => e.t === 'ag' && !e.dead)) {   // с краёв экрана негде встать — агент появляется рядом с игроком
          for (const dxs of [-70, 70]) { const gy = brGroundY(P.x + dxs); if (gy !== null) { L.ents.push(ent('ag', P.x + dxs, gy - 18, { vx: 0, vy: 0, ground: true, face: dxs < 0 ? 1 : -1, life: 480, hold: 24 })); break; } }
        }
      }
    },
    hud() {
      const b = L.br; if (L.banner || (!b.det && !b.alarm && !b.reveal)) return;
      box(6, 30, 44, 5, '#2b2a33', '#000'); ctx.fillStyle = b.alarm > 0 ? '#ff3b3b' : b.det > 16 ? '#ffd23e' : '#19ff9c'; ctx.fillRect(6, 30, 44 * clamp(b.det / 30, 0, 1), 5);
      text(b.alarm > 0 ? 'ТРЕВОГА' : b.reveal ? 'ШАЙТАНЫ СДАЮТ ТЕБЯ' : 'ОБНАРУЖЕНИЕ', 54, 30, b.alarm > 0 || b.reveal ? '#ff9a9a' : '#c9c9d4', 6);
    },
  });
};

// ---------- 107 БЕЗМЯТЕЖНОСТЬ: платформы — окна, которые закрываются вскоре после приземления; Скрепыш переворачивает управление
BUILD[107] = () => {
  const L = brBase(107, 120), G = brGen(L, 5107);
  G.min = 3; G.max = 4; G.flat(10);
  while (G.x < L.W - 14) {
    G.flat(G.ri(5, 6));   // островок: на нём ждёт Скрепыш
    L.ents.push(ent('clip', (G.x - 3) * T, G.top() - 52, { oy: G.top() - 52, talk: 0, used: 0 }));
    const n = G.ri(3, 4); let wx = G.x * T + 10, wy = G.top();
    for (let i = 0; i < n; i++) {
      L.plats.push({ x: wx, y: wy, w: 32, h: 6, a: wx, b: wx, vx: 0, win: 1, t: 0, closed: 0 });
      wx += 32 + G.ri(14, 24); wy = clamp(wy + G.ri(-1, 1) * 16, 56, 144);
    }
    G.x = Math.ceil((wx - 4) / T); G.gh = clamp(Math.round((H * T - wy) / T), 3, 4);
    // следующий остров стоит на высоте последнего окна, чтобы с него можно было допрыгнуть
    G.flat(0);
  }
  G.flat(L.W - G.x); L.ents.push(ent('g', (L.W - 4) * T, G.top() - 26));
  return brFinish(L, {
    inv: 0,
    pre() {
      const b = L.br; if (b.inv > 0) b.inv--;
      for (const pl of L.plats) {
        if (!pl.win) continue;
        if (pl.closed > 0) { if (--pl.closed === 0) { pl.t = 0; sfx(500, 0.06, 'square', 200, 0.03); } continue; }
        if (P.on === pl) { if (++pl.t >= 38) { pl.closed = 150; sfx(180, 0.15, 'square', -80, 0.05); } } else if (pl.t > 0 && pl.t < 38) pl.t = Math.max(0, pl.t - 1);
      }
    },
    hud() { if (L.br.inv > 0 && frame % 12 < 8) text('УПРАВЛЕНИЕ ПЕРЕВЁРНУТО', 160, 46, '#ff9a9a', 8, 'center'); },
  });
};

// ---------- 108 ЦЕНТР ОБНОВЛЕНИЙ: обратный отсчёт до перезагрузки; кнопки «Отложить» стоят в стороне от пути; всплывающие окна закрывают обзор
BUILD[108] = () => {
  const L = brBase(108, 140), G = brGen(L, 5108);
  G.min = 2; G.max = 4; G.flat(10);
  const pool = ['alt', 'laa', 'ros', 'ari', 'alt', 'laa']; let pc = 0, nextBtn = 22, nook = false, btns = 0;
  const btnBlock = () => {   // ступенька и блок над землёй; на нём кнопка
    G.flat(2); const bx = G.x; G.flat(7);
    const rA = H - G.gh - 1, rB = H - G.gh - 3;
    L.g[rA][bx] = '='; L.g[rA][bx + 1] = '='; L.g[rB][bx + 3] = '='; L.g[rB][bx + 4] = '=';
    L.ents.push(ent('btn', (bx + 3) * T + 5, rB * T - 10)); btns++;
  };
  while (G.x < L.W - 14) {
    const r = G.R();
    if (G.x >= nextBtn && btns < 4 && G.x < L.W - 26) { btnBlock(); nextBtn = G.x + 20; }
    else if (!nook && G.x > 60) { nook = true; G.nook(108); }
    else if (r < 0.14) { G.gap(G.ri(2, 3)); G.flat(3); }
    else if (r < 0.26) { G.step(G.R() < 0.5 ? -1 : 1); G.flat(3); }
    else if (r < 0.34) G.spikes(G.ri(1, 2));
    else if (r < 0.52) G.place(pool[pc++ % pool.length]);
    else G.flat(G.ri(3, 5));
  }
  G.end();
  const pops = [];
  return brFinish(L, {
    cd: 600, pressed: 0, pops, pt: 60,
    update() {
      const b = L.br;
      if (--b.cd <= 0) { sfx(120, 0.6, 'sawtooth', -60, 0.09); BR.restart(L.n); return; }
      if (b.cd % 60 === 0 && b.cd <= 300) sfx(600, 0.06, 'square', 0, 0.04);
      if (--b.pt <= 0) { b.pt = 130; if (b.pops.length >= 3) b.pops.shift(); const w = 96 + Math.floor(Math.random() * 20), h = 42 + Math.floor(Math.random() * 8); b.pops.push({ x: Math.floor(Math.random() * (VW - w - 10)) + 5, y: 34 + Math.floor(Math.random() * 100), w, h, t: 0, m: Math.floor(Math.random() * POP_MSG.length) }); }
      for (const p of b.pops) p.t++;
    },
    hud() {
      const b = L.br;
      for (const p of b.pops) xpWindow(p.x, p.y, p.w, p.h, POP_MSG[p.m][0], POP_MSG[p.m].slice(1));
      const sec = Math.ceil(b.cd / 60), nb = L.ents.find(e => e.t === 'btn' && !e.dead);
      text(`ПЕРЕЗАГРУЗКА ЧЕРЕЗ ${sec}…`, 160, 22, sec <= 3 && frame % 20 < 10 ? '#ffffff' : sec <= 3 ? '#ff5a5a' : '#ffd23e', 8, 'center');
      if (nb && nb.x > L.cam + VW) text('ОТЛОЖИТЬ ▶', 314, 150, '#ffd23e', 6, 'right');
    },
  });
};
const POP_MSG = [['Центр обновлений', 'Готово к установке', 'ядра 8!'], ['Скрепыш', 'Похоже, вы', 'обновляетесь.'], ['Ошибка 0x8', 'Не удаётся', 'отложить.'], ['Windows', 'Перезагрузить', 'сейчас?'], ['Реклама', 'Ядро 8 всего', 'за 0 рублей!']];
function xpWindow(x, y, w, h, title, lines) {
  ctx.fillStyle = '#0a246a'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#ece9d8'; ctx.fillRect(x, y + 9, w, h - 9);
  ctx.fillStyle = '#245edb'; ctx.fillRect(x, y, w, 9);
  text(title, x + 3, y + 2, '#fff', 6, 'left', false);
  ctx.fillStyle = '#d6482a'; ctx.fillRect(x + w - 8, y + 1, 7, 7);
  lines.forEach((l, i) => text(l, x + 4, y + 13 + i * 8, '#17161c', 6, 'left', false));
  ctx.fillStyle = '#c9c4ae'; ctx.fillRect(x + w - 22, y + h - 11, 18, 8);
  text('ОК', x + w - 13, y + h - 10, '#17161c', 6, 'center', false);
}

// ---------- 109 СИНИЙ ЭКРАН: твёрдые только строки текста (платформы в одну клетку); дамп памяти набирается до 100% — это таймер
BUILD[109] = () => {
  const L = brBase(109, 130), G = brGen(L, 5109);
  G.min = 2; G.max = 4; G.flat(8, '=');
  G.thin = true; G.ch = '=';
  const pool = ['alt', 'ban', 'ano', 'ros', 'mak', 'laa', 'vlad', 'ari', 'fat', 'bar', 'tel'];
  let pc = 0;
  while (G.x < L.W - 14) {
    const r = G.R();
    if (r < 0.3) { G.gap(G.ri(2, 3)); G.flat(G.ri(3, 5)); }
    else if (r < 0.46) { G.step(G.R() < 0.5 ? -1 : 1); G.flat(G.ri(3, 5)); }
    else if (r < 0.72) G.place(pool[pc++ % pool.length]);
    else G.flat(G.ri(4, 7));
  }
  G.end();
  return brFinish(L, {
    dump: 0,
    update() { const b = L.br; b.dump += 100 / 4800; if (b.dump >= 100) die('dump'); },
    hud() {
      const b = L.br; text('СБОР ДАМПА ПАМЯТИ: ' + Math.floor(b.dump) + '%', 160, 22, b.dump > 80 ? '#ffffff' : '#c8c8ff', 6, 'center');
      box(110, 30, 100, 4, '#000070', '#fff'); ctx.fillStyle = '#fff'; ctx.fillRect(110, 30, 100 * b.dump / 100, 4);
    },
  });
};
// окно Windows 95/XP как платформа (уровень 107): приготовившееся закрыться — краснеет и дрожит
function drawWinPlat(pl) {
  const x = Math.round(pl.x) + (pl.t > 20 ? (pl.t % 4 < 2 ? 1 : -1) : 0), y = pl.y - 2;
  ctx.fillStyle = '#0a246a'; ctx.fillRect(x - 1, y - 1, pl.w + 2, 12);
  ctx.fillStyle = '#ece9d8'; ctx.fillRect(x, y + 4, pl.w, 6);
  ctx.fillStyle = pl.t > 20 ? '#e03030' : '#245edb'; ctx.fillRect(x, y, pl.w, 4);
  ctx.fillStyle = '#d6482a'; ctx.fillRect(x + pl.w - 5, y + 1, 4, 3);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y + 1, 8, 1);
}

// ---------- фоны новых зон
function drawBgBranch(z, cam) {
  if (z === 8) {   // соляная жила: сталактиты, мерцающие кристаллы, потолочные балки
    for (let i = 0; i < 18; i++) { const h = 12 + hash(i, 5) * 36; ctx.fillStyle = '#2f2840'; for (let k = 0; k < 5; k++) ctx.fillRect(((i * 24 - cam * 0.25) % 440 + 440) % 440 - 30 + k * 2, 0, 24 - k * 4, h * (k + 1) / 5); }
    for (let i = 0; i < 12; i++) {
      const x = ((i * 41 - cam * 0.5) % 520 + 520) % 520 - 40, h = 14 + hash(i, 9) * 30;
      ctx.fillStyle = i % 3 ? '#4d4460' : '#ffb8d866'; ctx.fillRect(x, 150 - h, 7, h + 30); ctx.fillRect(x + 2, 148 - h, 3, 3);
      if ((frame + i * 17) % 60 < 8) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, 150 - h + 4, 1, 1); }
    }
    ctx.fillStyle = '#17161c'; for (let i = 0; i < 4; i++) { const x = ((i * 130 - cam * 0.4) % 520 + 520) % 520 - 40; ctx.fillRect(x, 0, 6, 180); ctx.fillRect(x - 20, 14, 46, 5); }
  } else if (z === 9) {   // Мёртвое море на закате и бетонные корпуса учебного центра
    ctx.fillStyle = '#fff1c0'; ctx.beginPath(); ctx.arc(250, 70, 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#4fb8c4'; ctx.fillRect(0, 96, VW, 22); ctx.fillStyle = '#ffffff55'; for (let i = 0; i < 10; i++) ctx.fillRect(((i * 37 + frame * 0.3 - cam * 0.1) % 340 + 340) % 340 - 10, 100 + (i * 5) % 16, 12, 1);
    skyline(cam * 0.2, '#8a7560', null, 30, 24, 40, 91, 140);
    skyline(cam * 0.45, '#5f5042', '#ffd27a', 24, 24, 46, 92, 164);
    const mx = ((60 - cam * 0.3) % 400 + 400) % 400 - 20; ctx.fillStyle = '#3a2f26'; ctx.fillRect(mx, 40, 2, 100); ctx.fillRect(mx - 8, 60, 18, 2); ctx.fillStyle = frame % 40 < 20 ? '#ff3b3b' : '#6b1010'; ctx.fillRect(mx - 1, 37, 4, 3);
  } else if (z === 10) {   // «Безмятежность»: голубое небо, облака и зелёные холмы
    ctx.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { const x = ((i * 90 - cam * 0.08 + frame * 0.05) % 400 + 400) % 400 - 40, y = 18 + (i * 13) % 34; ctx.fillRect(x, y, 34, 7); ctx.fillRect(x + 6, y - 4, 20, 5); }
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? '#3e9a2a' : '#5cba3a';
      for (let x = 0; x < VW; x += 2) { const y = 112 + layer * 22 + Math.sin((x + cam * (0.18 + layer * 0.2)) * 0.016 + layer * 2) * 16; ctx.fillRect(x, Math.round(y), 2, VH - y); }
    }
  } else if (z === 11) {   // синий экран смерти: приглушённые строки текста на всю стену
    ctx.fillStyle = '#0000a8'; ctx.fillRect(0, 0, VW, VH);
    const L2 = ['A problem has been detected and', 'Windows has been shut down to', 'prevent damage to your computer.', '', 'KERNEL8_DATA_INPAGE_ERROR', '', 'Technical information:', '*** STOP: 0x00000008 (0xNOSE)', '*** hotvet.sys - address F7A1B', '', 'Beginning dump of physical memory'];
    L2.forEach((l, i) => { if (l) text(l, 8, 8 + i * 12, '#4040e0', 6, 'left', false); });
  } else if (z === 12) {   // рабочий стол: бирюзовый фон, значки слева, окна на заднем плане
    ctx.fillStyle = '#00707a'; for (let y = 0; y < VH; y += 8) ctx.fillRect(0, y, VW, 1);
    const ic = [['Мой', '#f0e8c8'], ['Корзина', '#c0c0c0'], ['Ядро 8', '#ffd23e'], ['ЛИНУКС', '#2ecc71']];
    ic.forEach(([n, c], i) => { ctx.fillStyle = '#000'; ctx.fillRect(9, 11 + i * 28, 14, 14); ctx.fillStyle = c; ctx.fillRect(10, 12 + i * 28, 12, 12); text(n, 2, 27 + i * 28, '#fff', 6); });
    ctx.fillStyle = '#ffffff10'; ctx.fillRect(210, 20, 90, 60); ctx.fillStyle = '#ffffff22'; ctx.fillRect(210, 20, 90, 8);
  }
}
