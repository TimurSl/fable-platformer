'use strict';
// БИЛЛ ГЕЙТС (уровень 110 Липовой ветки) и концовка «Холос завербован Моссадом».
// Подключается после branch.js. «Здоровье» Гейтса — полоса установки «Установка ядра 8»: 24 попадания царь-флешкой, четыре фазы по шесть.
// Флешка засчитывается, только если летит недолго (BR.MAXF кадров): иначе Гейтс сворачивается на панель задач, неуязвим, и ездит по полу.

BR.MAXF = 26;        // дольше в воздухе флешка не живёт
BR.FLASH_SPEED = 5;  // пикселей за кадр
const GT = { W: 66, H: 68 };   // окно Гейтса
const gPhase = b => clamp(1 + Math.floor((b.max - b.hp) / 6), 1, 4);

BR.arena = function (n) {
  const W = 20, g = [...Array(H)].map(() => Array(W).fill('.'));
  for (let x = 0; x < W; x++) { g[H - 1][x] = '#'; g[H - 2][x] = '#'; }
  for (const x of [1, 2, 3, 4, 8, 9, 10, 11, 15, 16, 17, 18]) g[6][x] = '=';
  const groundY = (H - 2) * T, py = 6 * T;
  const L = { n, W, g, ents: [], plats: [], secret: null, zone: zoneOf(n), t: 0, cam: 0, cdBase: 100, spawnY: groundY - 14, groundY, pops: [], br: {} };
  L.spots = [[36, py - 16], [160, py - 16], [276, py - 16], [20, groundY - 18], [108, groundY - 18], [212, groundY - 18], [296, groundY - 18]];
  L.boss = {
    kind: 'gates', x: 127, y: 12, w: GT.W, h: GT.H, hp: 24, max: 24, t: 0, ph: 1, phase: 1, wob: 0,
    cdA: 90, cdS: 150, cdW: 200, cdD: 120, cdR: 120, cdC: 500, cdF: 40, flash: 0, min: 0, hz: null, sp: [], warn: null,
    fl: null, flT: 160, rb: null, rbT: 1200, dump: 0, dlg: [], fin: 0, finT: 0, dead: 0, swapped: false, zone: 0,
  };
  L.banner = ['БОСС: БИЛЛ ГЕЙТС', 150];
  L.br = { inv: 0, pre() { if (L.br.inv > 0) L.br.inv--; }, drawFront: BR.drawGatesFront, hud() { if (L.br.inv > 0 && frame % 12 < 8) text('УПРАВЛЕНИЕ ПЕРЕВЁРНУТО', 160, 46, '#ff9a9a', 8, 'center'); } };
  return L;
};
BR.flightTime = e => {
  const b = L.boss, d = Math.hypot(e.x + 4 - (b.x + b.w / 2), e.y + 6 - (b.y + b.h / 2));
  return Math.max(10, Math.round(d / BR.FLASH_SPEED));
};
// флешка достигла окна (или провисела в воздухе слишком долго)
BR.hitGates = function (b, s) {
  if (b.dead || b.min > 0) return;
  if (b.fin) return;
  if (s && s.t < s.n) { BR.minimize(b); return; }   // летела слишком долго: Гейтс сворачивается
  b.hp--; b.flash = 14; shake = 5; sfx(220, 0.25, 'sawtooth', -120, 0.08); burst(b.x + b.w / 2, b.y + b.h / 2, '#19ff9c', 12);
  L.pops.push({ x: b.x + b.w / 2 - 8, y: b.y + 8, s: (Math.round((24 - b.hp) / 24 * 100)) + '%', t: 40 });
  if (b.hp <= 0) { b.fin = 1; b.finT = 300; shots = []; b.sp = []; b.fl = null; b.rb = null; b.dlg = []; L.plats = L.plats.filter(p => !p.dlg); L.banner = ['БИЛЛ ГЕЙТС (НЕ ОТВЕЧАЕТ). ЖМИ КРАСНЫЙ ✕!', 170]; sfx(120, 1, 'sawtooth', 200, 0.08); return; }
  const ph = gPhase(b);
  if (ph !== b.phase) { b.phase = ph; shots = []; b.warn = null; b.sp = []; b.fl = null; if (ph === 4) b.dump = 0; L.banner = [['', 'ФАЗА 1: WINDOWS 95', 'ФАЗА 2: WINDOWS XP', 'ФАЗА 3: WINDOWS 8', 'ФАЗА 4: СИНИЙ ЭКРАН'][ph], 130]; }
};
BR.minimize = function (b) {
  b.min = 270; shots = shots.filter(s => s.k === 'usb'); b.sp = []; b.warn = null; b.cdF = Math.max(b.cdF, 120);
  b.hz = { x: clamp(b.x + b.w / 2, 0, VW - 60), dir: P.x > b.x ? 1 : -1 };
  L.banner = ['ФЛЕШКА ЛЕТЕЛА СЛИШКОМ ДОЛГО: ГЕЙТС СВЁРНУТ!', 120]; sfx(200, 0.4, 'square', -100, 0.07);
};
BR.updGates = function (b) {
  b.t++; if (b.flash) b.flash--;
  const G = L.groundY;
  // ---- конец: победа
  if (b.dead) {
    b.dead++; shots = []; if (b.dead % 5 === 0) { burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, b.dead % 10 ? '#19ff9c' : '#fff', 6); sfx(100 + Math.random() * 300, 0.1, 'sawtooth'); }
    if (b.dead > 130) { try { localStorage.setItem('holos_br_win', '1'); } catch (e) { } BR.win(); }
    return;
  }
  // ---- «(Не отвечает)»: 5 секунд, чтобы допрыгнуть до красного ✕
  if (b.fin) {
    b.x += (127 - b.x) * 0.08; b.y += (34 - b.y) * 0.08;
    const cx = { x: b.x + b.w - 11, y: b.y + 1, w: 9, h: 8 };
    if (b.fin === 1) {
      if (b.t % 12 === 0) shots.push({ k: 'glitch', x: 8 + Math.random() * (VW - 20), y: -8, vx: 0, vy: 1.8, g: 0.04, w: 6, h: 6 });
      if (ov(P, cx, 0)) { b.fin = 2; b.finT = 0; shots = []; sfx(700, 0.3, 'triangle', 500, 0.08); L.banner = ['ВСТАНЬ НА «ДА»', 120]; return; }
      if (--b.finT <= 0) { b.hp = 3; b.fin = 0; b.phase = gPhase(b); L.banner = ['ГЕЙТС ВОССТАНОВИЛ 3 ПОПАДАНИЯ', 130]; sfx(150, 0.6, 'sawtooth', 200, 0.08); }
      return;
    }
    // диалог «Завершить Билла Гейтса?»: кнопки на полу; когда подходишь к «ДА», они меняются местами (один раз)
    const yes = { x: b.swapped ? 196 : 76, y: G - 12, w: 48, h: 12 }, no = { x: b.swapped ? 76 : 196, y: G - 12, w: 48, h: 12 };
    if (!b.swapped && Math.abs(P.x + 4 - (yes.x + 24)) < 56) { b.swapped = true; sfx(900, 0.2, 'square', -500, 0.06); L.banner = ['КНОПКИ ПОМЕНЯЛИСЬ МЕСТАМИ!', 90]; }
    const onYes = P.ground && ov(P, { x: yes.x, y: yes.y - 6, w: yes.w, h: yes.h + 8 }, 0), onNo = P.ground && ov(P, { x: no.x, y: no.y - 6, w: no.w, h: no.h + 8 }, 0);
    b.dlgT = onYes ? (b.dlgT || 0) + 1 : onNo ? -(Math.abs(b.dlgT || 0) + 1) : 0;
    if (b.dlgT >= 28) { b.dead = 1; sfx(200, 1.2, 'triangle', 1000, 0.09); shake = 10; return; }
    if (b.dlgT <= -28) { b.hp = 3; b.fin = 0; b.dlgT = 0; b.phase = gPhase(b); b.swapped = false; L.banner = ['НЕТ. ГЕЙТС ВОССТАНОВИЛ 3 ПОПАДАНИЯ', 130]; sfx(150, 0.6, 'sawtooth', 200, 0.08); }
    return;
  }
  const ph = gPhase(b); b.ph = ph;
  // ---- движение окна
  if (b.min > 0) {
    b.min--; const z = b.hz;
    z.x += z.dir * 2.4; if (z.x < 0) { z.x = 0; z.dir = 1; } if (z.x > VW - 60) { z.x = VW - 60; z.dir = -1; }
    if (ov(P, { x: z.x, y: G - 13, w: 60, h: 13 }, 1)) hurt(1, 'gates');
    if (b.min === 0) { b.hz = null; b.x = clamp(z.x - 3, 0, VW - b.w); L.banner = ['ГЕЙТС РАЗВЁРНУТ. БЕЙ СНОВА', 90]; }
    spawnFlash(b); return;
  }
  b.wob += 0.012 * [0, 1, 1.2, 1.5, 1.7][ph];
  b.x = 160 - b.w / 2 + Math.sin(b.wob) * [0, 40, 80, 90, 100][ph];
  b.y = 12 + Math.sin(b.t * 0.05) * 5 + (ph >= 3 ? Math.pow(Math.max(0, Math.sin(b.t * (ph === 3 ? 0.025 : 0.034))), 6) * 40 : 0);
  if (ov(P, b, 6)) hurt(1, 'gates');
  // ---- веер квадратов Windows (фазы 1, 3, 4): цвета логотипа; в фазе 3 и 4 гуще
  if (ph !== 2 && --b.cdA <= 0) {
    b.cdA = [0, 100, 0, 80, 90][ph];
    const cx = b.x + b.w / 2, cy = b.y + b.h, a0 = Math.atan2(P.y - cy, P.x - cx), sp = 2 + ph * 0.18, da = ph === 1 ? [-0.3, -0.1, 0.1, 0.3] : [-0.45, -0.22, 0, 0.22, 0.45];
    da.forEach((d, i) => shots.push({ k: 'pane', c: i % 4, x: cx, y: cy, vx: Math.cos(a0 + d) * sp, vy: Math.sin(a0 + d) * sp, w: 7, h: 7 }));
    sfx(600, 0.08, 'square', -250, 0.03);
  }
  // ---- кнопки панели задач выскакивают из пола шипами (фазы 1 и 4)
  if ((ph === 1 || ph === 4) && --b.cdS <= 0) {
    b.cdS = ph === 1 ? 150 : 120;
    const n = ph === 1 ? 1 : 2; for (let i = 0; i < n; i++) b.sp.push({ x: clamp(P.x + (i ? 40 : -4) + Math.random() * 30, 6, VW - 34), t: 0 });
    sfx(500, 0.15, 'square', 0, 0.03);
  }
  for (const s of b.sp) { s.t++; if (s.t >= 45 && s.t < 95 && ov(P, { x: s.x, y: G - 14, w: 26, h: 14 }, 3)) hurt(1, 'gates'); }
  b.sp = b.sp.filter(s => s.t < 100);
  // ---- Скрепыш (фазы 1 и 4): появляется и «помогает»
  if ((ph === 1 || ph === 4) && --b.cdC <= 0) {
    b.cdC = 640;
    if (!L.ents.some(e => e.t === 'clip' && !e.dead)) { const x = Math.random() < 0.5 ? 40 : 250; L.ents.push(ent('clip', x, G - 60, { oy: G - 60, talk: 0, used: 0 })); }
  }
  // ---- фаза 2 и 4: диалоги с ошибками — твёрдые (на них можно встать) и закрывают обзор
  if ((ph === 2 || ph === 4) && --b.cdD <= 0) {
    b.cdD = ph === 2 ? 130 : 240;
    if (b.dlg.length < 3) {
      const w = 84, x = 12 + Math.floor(Math.random() * (VW - w - 24)), y = 66 + Math.floor(Math.random() * 56), d = { x, y, w, t: 0, life: 220, m: Math.floor(Math.random() * 4) };
      b.dlg.push(d); L.plats.push({ x, y, w, h: 6, a: x, b: x, vx: 0, dlg: 1, d }); sfx(380, 0.1, 'square', 0, 0.04);
    }
  }
  for (const d of b.dlg) d.t++;
  for (const d of b.dlg) if (d.t > d.life) L.plats = L.plats.filter(p => p.d !== d);
  b.dlg = b.dlg.filter(d => d.t <= d.life);
  // ---- фазы 2–4: ползущие по полу «развёртки» с обеих сторон
  if (ph >= 2 && !b.warn && --b.cdW <= 0) { b.cdW = [0, 0, 190, 150, 120][ph]; b.warn = { side: Math.random() < 0.5 ? -1 : 1, t: 50, both: ph === 4 }; sfx(700, 0.3, 'square', 0, 0.03); }
  if (b.warn && --b.warn.t <= 0) {
    for (const s of b.warn.both ? [-1, 1] : [b.warn.side]) shots.push({ k: 'sweep', x: s < 0 ? -12 : VW + 2, y: G - 10, vx: -s * (ph >= 3 ? 3.3 : 2.8), vy: 0, w: 10, h: 10 });
    b.warn = null;
  }
  // ---- фаза 2 и 4: перезагрузка каждые 20 секунд — встань на «Отложить», иначе «восстановление системы» отнимет два попадания
  if ((ph === 2 || ph === 4) && !b.rb && --b.rbT <= 0) {
    b.rbT = 1200; b.rb = { t: 300, x: 30 + Math.floor(Math.random() * 230) }; L.banner = ['ПЕРЕЗАГРУЗКА! СТАНЬ НА «ОТЛОЖИТЬ»', 100]; sfx(400, 0.3, 'square', 200, 0.06);
  }
  if (b.rb) {
    b.rb.t--;
    const on = P.ground && ov(P, { x: b.rb.x, y: G - 14, w: 44, h: 16 }, 0);
    if (on) { b.rb = null; L.pops.push({ x: P.x - 10, y: P.y - 14, s: 'ОТЛОЖЕНО', t: 50 }); sfx(800, 0.2, 'triangle', 400, 0.06); }
    else if (b.rb.t <= 0) {
      b.rb = null; b.hp = Math.min(b.max, b.hp + 2); b.phase = gPhase(b); shots = [];
      L.banner = ['ВОССТАНОВЛЕНИЕ СИСТЕМЫ: ГЕЙТС ВЕРНУЛ 2 ПОПАДАНИЯ', 140]; sfx(120, 0.8, 'sawtooth', -50, 0.09); shake = 8;
    }
  }
  // ---- фазы 3 и 4: плитки пола переворачиваются шипами по телеграфируемым узорам; безопасное окно уезжает от флешки
  if (ph >= 3 && !b.fl && --b.flT <= 0) {
    b.flT = ph === 3 ? 150 : 260;
    const fe = L.ents.find(e => e.t === 'f' && !e.dead), fx = fe ? fe.x : P.x;
    let s0 = Math.floor(Math.random() * 14);
    for (let i = 0; i < 6; i++) { const c = Math.floor(Math.random() * 14); if (Math.abs((c + 3) * T - fx) > Math.abs((s0 + 3) * T - fx)) s0 = c; }
    b.fl = { s0, t: 0 }; sfx(300, 0.2, 'square', 100, 0.04);
  }
  if (b.fl) {
    b.fl.t++;
    if (b.fl.t >= 55 && b.fl.t < 140 && P.ground && P.y + P.h > G - 2) {
      const col = Math.floor((P.x + P.w / 2) / T); if (col < b.fl.s0 || col >= b.fl.s0 + 6) hurt(1, 'gates');
    }
    if (b.fl.t > 140) b.fl = null;
  }
  // ---- фаза 4: дождь глитчей, дамп памяти. Дошёл до 100% — бой заново с фазы 1
  if (ph === 4) {
    if (--b.cdR <= 0) { b.cdR = 50; shots.push({ k: 'glitch', x: clamp(P.x + (Math.random() - 0.5) * 60, 4, VW - 10), y: -10, vx: 0, vy: 1.6, g: 0.03, w: 6, h: 6 }); }
    b.dump += 100 / 3600;
    if (b.dump >= 100) {
      b.hp = 24; b.phase = 1; b.dump = 0; shots = []; b.sp = []; b.fl = null; b.rb = null; b.dlg = []; L.plats = L.plats.filter(p => !p.dlg); b.rbT = 1200; b.cdA = 90;
      L.banner = ['ДАМП ДОСТИГ 100%: ВСЁ ЗАНОВО', 150]; sfx(100, 1.2, 'sawtooth', -40, 0.1); shake = 12; return;
    }
  }
  spawnFlash(b);
};

// ---------- отрисовка
const GATE_STYLE = [null, { t: '#000080', n: 'Gates 95', body: '#c0c0c0' }, { t: '#0a58e0', n: 'Gates XP', body: '#ece9d8' }, { t: '#2a9df4', n: 'Gates 8', body: '#f3f3f3' }, { t: '#0000a8', n: ':(', body: '#0000a8' }];
BR.drawGates = function (b) {
  if (b.min > 0 && b.hz) {   // свёрнут: по полу ездит кнопка на панели задач
    const z = b.hz, y = L.groundY - 13;
    ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(z.x) - 1, y - 1, 62, 15); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(Math.round(z.x), y, 60, 13); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(z.x), y, 60, 1);
    spr(IMG.gates, Math.round(z.x) + 2, y + 1, false, 0.5); text('Гейтс', Math.round(z.x) + 14, y + 4, '#17161c', 6, 'left', false);
    return;
  }
  if (b.dead && b.dead % 4 >= 2) return;
  const st = b.fin ? { t: '#808080', n: '(Не отвечает)', body: '#c0c0c0' } : GATE_STYLE[gPhase(b)], x = Math.round(b.x + (b.dead ? (Math.random() - 0.5) * 5 : 0)), y = Math.round(b.y);
  if (b.flash % 4 > 1) ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#17161c'; ctx.fillRect(x - 1, y - 1, b.w + 2, b.h + 2);
  ctx.fillStyle = st.body; ctx.fillRect(x, y, b.w, b.h);
  ctx.fillStyle = st.t; ctx.fillRect(x + 1, y + 1, b.w - 2, 9);
  text(st.n.slice(0, 9), x + 3, y + 3, '#fff', 6, 'left', false);
  ctx.fillStyle = b.fin ? (frame % 20 < 12 ? '#ff2a2a' : '#c01010') : '#c0c0c0'; ctx.fillRect(x + b.w - 11, y + 2, 9, 7); text('x', x + b.w - 9, y + 2, '#fff', 6, 'left', false);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y + 11, b.w - 4, b.h - 13);
  if (gPhase(b) === 4 && !b.fin) { ctx.fillStyle = '#0000a8'; ctx.fillRect(x + 2, y + 11, b.w - 4, b.h - 13); }
  spr(IMG.gates, x + 9, y + 13, b.fin ? false : P.x < b.x, 3);
  if (b.fin) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 2, y + 11, b.w - 4, b.h - 13); }
  ctx.globalAlpha = 1;
  if (b.fin === 1) { ctx.strokeStyle = frame % 16 < 8 ? '#ff2a2a' : '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(x + b.w - 12.5, y + 1.5, 11, 9); }
};
BR.drawShot = function (s) {
  if (s.k === 'pane') {
    const col = ['#f25022', '#7fba00', '#00a4ef', '#ffb900'][s.c || 0];
    ctx.fillStyle = '#17161c'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 9, 9); ctx.fillStyle = col; ctx.fillRect(Math.round(s.x), Math.round(s.y), 7, 7); ctx.fillStyle = '#ffffff88'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 7, 1);
  }
};
// передний план арены: диалоги с ошибками, таксбар-шипы, плитки пола, кнопка «Отложить», кнопки «ДА/НЕТ», дамп памяти
BR.drawGatesFront = function () {
  const b = L.boss, G = L.groundY; if (!b) return;
  for (const s of b.sp) {
    const up = s.t >= 45, h = up ? Math.min(14, (s.t - 45) * 3 + 2) : 0, x = Math.round(s.x);
    if (!up) { ctx.fillStyle = s.t % 8 < 4 ? '#ff3b3b88' : '#ff3b3b33'; ctx.fillRect(x, G - 14, 26, 14); }
    else if (h > 0) { ctx.fillStyle = '#17161c'; ctx.fillRect(x - 1, G - h - 1, 28, h + 1); ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x, G - h, 26, h); ctx.fillStyle = '#fff'; ctx.fillRect(x, G - h, 26, 1); if (h > 8) text('ПУСК', x + 13, G - h + 3, '#17161c', 6, 'center', false); }
  }
  if (b.fl) {   // плитки пола: до t=55 мигают красным, потом поднимаются шипами. Безопасно только окно из шести плиток
    for (let c = 0; c < 20; c++) {
      if (c >= b.fl.s0 && c < b.fl.s0 + 6) { ctx.fillStyle = '#19ff9c44'; ctx.fillRect(c * T, G, T, 3); continue; }
      if (b.fl.t < 55) { if (b.fl.t % 10 < 6) { ctx.fillStyle = '#ff3b3b88'; ctx.fillRect(c * T, G - 2, T, 4); } }
      else if (b.fl.t < 140) { ctx.fillStyle = '#e8e8f0'; for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) ctx.fillRect(c * T + i * 8 + 3 - k, G - 10 + k * 2, 2 + k * 2, 2); }
    }
  }
  if (b.rb) {
    ctx.fillStyle = '#17161c'; ctx.fillRect(b.rb.x - 1, G - 15, 46, 15); ctx.fillStyle = frame % 24 < 12 ? '#fff7c2' : '#ece9d8'; ctx.fillRect(b.rb.x, G - 14, 44, 13);
    text('ОТЛОЖИТЬ', b.rb.x + 22, G - 11, '#17161c', 6, 'center', false);
    ctx.fillStyle = '#ff3b3b'; ctx.fillRect(b.rb.x, G - 16, Math.round(44 * b.rb.t / 300), 2);
  }
  if (b.fin === 2) {
    const yes = { x: b.swapped ? 196 : 76 }, no = { x: b.swapped ? 76 : 196 };
    box(84, 98, 152, 31, '#ece9d8', '#0a246a'); ctx.fillStyle = '#0a246a'; ctx.fillRect(84, 98, 152, 9); text('Завершить процесс', 88, 100, '#fff', 6, 'left', false);
    text('ЗАВЕРШИТЬ БИЛЛА ГЕЙТСА?', 160, 110, '#17161c', 6, 'center', false); text('ДАННЫЕ ПРОПАДУТ', 160, 119, '#a02020', 6, 'center', false);
    for (const [bx, lab, ok, k] of [[yes.x, 'ДА', true, b.dlgT || 0], [no.x, 'НЕТ', false, -(b.dlgT || 0)]]) {
      ctx.fillStyle = '#17161c'; ctx.fillRect(bx - 1, G - 13, 50, 14); ctx.fillStyle = k > 0 ? '#19ff9c' : '#ece9d8'; ctx.fillRect(bx, G - 12, 48, 12);
      text(lab, bx + 24, G - 9, '#17161c', 6, 'center', false);
      if (k > 0) { ctx.fillStyle = ok ? '#1fae5a' : '#d02020'; ctx.fillRect(bx, G - 15, Math.round(48 * Math.min(1, k / 28)), 2); }
    }
  }
  for (const d of b.dlg) {   // диалоги с ошибками: стоишь на верхней кромке, но остальное закрывает тебе экран
    const fade = d.t > d.life - 25 && d.t % 6 < 3 ? 0.4 : 1; ctx.globalAlpha = fade;
    xpWindow(d.x, d.y - 40, d.w, 44, ['Ошибка', 'Ядро 8', 'Нет ответа', 'Windows'][d.m], [['Не найдено', 'ядро 7.'], ['Фатальная', 'ошибка 8.'], ['Программа не', 'отвечает.'], ['Хотите', 'отправить?']][d.m]);
    ctx.globalAlpha = 1;
  }
};
BR.hudGates = function (b) {
  text('УСТАНОВКА ЯДРА 8', 314, 5, '#fff', 6, 'right');
  box(214, 14, 100, 5, '#2b2a33', '#000'); ctx.fillStyle = b.fin ? '#ff5a5a' : '#19ff9c'; ctx.fillRect(214, 14, 100 * (b.max - Math.max(0, b.hp)) / b.max, 5);
  for (const k of [6, 12, 18]) { ctx.fillStyle = '#000'; ctx.fillRect(214 + 100 * k / 24, 14, 1, 5); }
  text(Math.round((b.max - Math.max(0, b.hp)) / b.max * 100) + '%   ФАЗА ' + (b.fin ? '—' : gPhase(b)), 314, 22, '#9affd4', 6, 'right');
  if (!b.fin && gPhase(b) === 4) { text('ДАМП ПАМЯТИ ' + Math.floor(b.dump) + '%', 314, 30, b.dump > 75 ? '#ff5a5a' : '#c8c8ff', 6, 'right'); }
  if (b.rb) text('ПЕРЕЗАГРУЗКА ЧЕРЕЗ ' + Math.ceil(b.rb.t / 60) + '…', 160, 22, '#ffd23e', 8, 'center');
  if (b.fin === 1) text('(НЕ ОТВЕЧАЕТ) ' + Math.ceil(b.finT / 60) + ' С', 160, 22, '#ff5a5a', 8, 'center');
};

// ---------- концовка: Холос завербован Моссадом
BR.mossadEnding = function () {
  let beat = 0, t = 0, dodge = 0, selNo = false, noX = 196, noY = 112;
  const yesR = { x: 70, y: 112, w: 56, h: 20 };
  const BEATS = [
    ['Рабочий стол рассыпается на окна. Холос падает сквозь них.'],
    ['И приземляется на асфальт. Ночная парковка, рядом чёрный фургон.'],
    ['Вокруг шлёпаются Шайтаны. Телефоны не звонят. Они записывают.'],
    [MELVI + ': «Паспорт был плохой. Но так нагло его ещё никто не подделывал.»'],
    [MELVI + ': «Мёд подбросили мы. Бо был последним экзаменом. Гейтс — вторым. Кто платил Носу — теперь знаешь.»'],
    ['МОССАД ПРЕДЛАГАЕТ РАБОТУ.'],
    ['ПАСПОРТ ВЫДАН.'],
    ['ЗАДАНИЕ №1'],
  ];
  const stars = [...Array(50)].map((_, i) => ({ x: hash(i, 1) * VW, y: hash(i, 2) * 90 }));
  const finish = () => { try { localStorage.setItem('holos_br_win', '1'); } catch (e) { } BR.reset(); HONEY = 0; scene = titleScene(); };
  const done = () => t * 0.8 >= BEATS[beat][0].length;
  const next = () => { beat++; t = 0; sfx(500, 0.06, 'square', 0, 0.03); if (beat >= BEATS.length) finish(); };
  const van = (vx, open) => {
    ctx.fillStyle = '#05060a'; ctx.fillRect(vx, 98, 96, 44); ctx.fillStyle = '#12141c'; ctx.fillRect(vx + 2, 100, 92, 6);
    ctx.fillStyle = '#243044'; ctx.fillRect(vx + 70, 104, 20, 14); ctx.fillStyle = '#05060a'; ctx.fillRect(vx + 6, 106, 44, 30);
    ctx.fillStyle = open ? '#2a2638' : '#0c0e14'; ctx.fillRect(vx + 8, 108, 40, 28);
    ctx.fillStyle = '#17161c'; ctx.fillRect(vx + 12, 138, 16, 10); ctx.fillRect(vx + 68, 138, 16, 10);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(vx + 92, 124, 4, 4);
  };
  return {
    pad: 'none', music: 'Final',
    update() {
      t++;
      if (beat === 5) {   // предложение: «НЕТ» убегает от курсора, нажать можно только «ДА»
        if (t < 20) return;
        const near = (px, py) => Math.abs(px - (noX + 28)) < 44 && Math.abs(py - (noY + 10)) < 28;
        // «НЕТ» убегает: из нескольких случайных мест справа от «ДА» выбирается самое далёкое от нынешнего (цикл ограничен — вечного перебора нет)
        const flee = () => { dodge++; let best = noX, bd = -1; for (let k = 0; k < 10; k++) { const nx = 140 + Math.floor(Math.random() * 124); if (Math.abs(nx - noX) > bd) { bd = Math.abs(nx - noX); best = nx; } } noX = best; noY = 100 + Math.floor(Math.random() * 36); sfx(900 + Math.random() * 300, 0.06, 'square', 200, 0.04); };
        if (typeof ptr !== 'undefined' && ptr.over && near(ptr.x, ptr.y)) flee();
        if (codes.has('ArrowRight') || codes.has('KeyD')) { selNo = true; flee(); }
        if (codes.has('ArrowLeft') || codes.has('KeyA')) selNo = false;
        if (click) { if (near(click.x, click.y)) flee(); else if (inside(click, yesR)) { next(); return; } }
        if (codes.has('Enter') || codes.has('Space')) { if (selNo) { flee(); selNo = false; } else { next(); return; } }
        return;
      }
      if (beat === 7) { if (t > 700 || (t > 240 && anyPressed)) finish(); return; }
      if (beat === 6 && t < 140) return;
      if (anyPressed) { if (beat === 6 || done()) next(); else t = 1e5; }
    },
    draw() {
      const k = Math.floor(Math.min(t * 0.8, 1e4));
      if (beat === 0) {   // окна рассыпаются, Холос падает сквозь них
        ctx.fillStyle = '#008080'; ctx.fillRect(0, 0, VW, VH);
        for (let i = 0; i < 9; i++) { const wx = 20 + hash(i, 1) * 250, wy = ((hash(i, 2) * 200 + t * (1.5 + hash(i, 3) * 2.5)) % 220) - 30; xpWindow(Math.round(wx), Math.round(wy), 54, 32, ['Ошибка', 'Ядро 8', 'Гейтс', 'Windows'][i % 4], ['Нет ответа', 'Крах', '0x8', 'Фатально'][i % 4].split(' ')); }
        spr(IMG.holos, 150 + Math.sin(t * 0.1) * 8, 60 + Math.sin(t * 0.04) * 20, false, 2);
      } else if (beat < 7) {
        const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#05060f'); g.addColorStop(1, '#1a1830'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = '#fff'; for (const s of stars) if ((frame + s.x) % 50 < 40) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
        ctx.fillStyle = '#2b2a33'; ctx.fillRect(0, 142, VW, 38); ctx.fillStyle = '#6b6a76'; for (let x = 10; x < VW; x += 40) ctx.fillRect(x, 160, 22, 2);
        for (const lx of [40, 250]) { ctx.fillStyle = '#17161c'; ctx.fillRect(lx, 52, 3, 90); ctx.fillStyle = '#ffd27a'; ctx.fillRect(lx - 6, 50, 15, 4); ctx.fillStyle = '#ffd27a22'; ctx.beginPath(); ctx.moveTo(lx - 6, 54); ctx.lineTo(lx + 9, 54); ctx.lineTo(lx + 40, 142); ctx.lineTo(lx - 36, 142); ctx.fill(); }
        van(190, beat >= 3);
        const hy = beat === 1 ? Math.min(118, -20 + t * 4) : 118;
        spr(IMG.holos, 120, hy, false, 2);
        if (beat >= 1 && beat < 6) for (let i = 0; i < 5; i++) { const px = [30, 60, 90, 150, 170][i], py = beat === 1 ? Math.min(136, -30 + (t - i * 8) * 5) : 136; if (t > i * 8 || beat > 1) { spr(IMG.tel, px, beat > 1 ? 136 : py, false, 1); if (beat > 1 && frame % 40 < 20 && i % 2) { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(px + 5, 134, 2, 2); } } }
        if (beat >= 3) spr(IMG.melvi, beat === 3 ? 200 - Math.min(40, t * 0.4) : 160, 106, true, 2);
        if (beat === 5) {
          box(40, 70, 240, 74, '#ece9d8', '#0a246a'); ctx.fillStyle = '#0a246a'; ctx.fillRect(40, 70, 240, 10); text('Моссад', 44, 72, '#fff', 6, 'left', false);
          text('ХОЛОС, РАБОТА ЕСТЬ.', 160, 86, '#17161c', 6, 'center', false); text('ХОЧЕШЬ ЛИ ТЫ РАБОТАТЬ НА МОССАД?', 160, 96, '#17161c', 6, 'center', false);
          box(yesR.x, yesR.y, yesR.w, yesR.h, selNo ? '#ece9d8' : '#19ff9c', '#17161c'); text('ДА', yesR.x + yesR.w / 2, yesR.y + 7, '#17161c', 8, 'center', false);
          box(noX, noY, 56, 20, '#ece9d8', '#17161c'); text('НЕТ', noX + 28, noY + 7, '#17161c', 8, 'center', false);
          if (dodge > 5) text('НЕТ: ТОЛЬКО ДА.', 160, 148, '#ffd27a', 6, 'center');
        }
        if (beat < 5) {
          box(8, 150, 304, 26, '#17161cee', '#fff'); const ls = wrap(BEATS[beat][0].slice(0, k), 292, 6); ls.slice(0, 2).forEach((l, i) => text(l, 13, 154 + i * 9, '#fff', 6));
          if (done() && frame % 60 < 40) text('ДАЛЬШЕ ▶', 308, 168, '#9a9aa6', 6, 'right');
        }
      } else if (beat === 6) {   // новый паспорт
        ctx.fillStyle = '#17161c'; ctx.fillRect(0, 0, VW, VH);
        box(70, 20, 180, 110, '#f1ead2', '#2d4c8f'); ctx.fillStyle = '#2d4c8f'; ctx.fillRect(70, 20, 180, 12); text('ПАСПОРТ', 160, 23, '#fff', 6, 'center');
        spr(IMG.holos, 82, 42, false, 3);
        text('ИМЯ', 130, 42, '#6b6a76', 6); text('НЕ ХОЛОС', 130, 52, '#a02020', 8);
        text('СТРАНА', 130, 70, '#6b6a76', 6); text('ИЗРАИЛЬ', 130, 80, '#17161c', 6);
        text('ВЫДАН', 130, 94, '#6b6a76', 6); text('МОССАД', 130, 104, '#17161c', 6);
        ctx.save(); ctx.translate(215, 108); ctx.rotate(-0.25); ctx.strokeStyle = '#1fae5a'; ctx.lineWidth = 2; ctx.strokeRect(-26, -9, 52, 18); text('ОДАА', 0, -4, '#1fae5a', 8, 'center'); ctx.restore();
        if (t > 40) text('ХОЛОС ЗАВЕРБОВАН МОССАДОМ.', 160, 142, '#fff', 8, 'center');
        if (t > 90) text('ЛИНУКС ТАК И НЕ ПОЧИНИЛИ.', 160, 156, '#ff5a5a', 8, 'center');
        if (t > 140 && frame % 60 < 40) text('ДАЛЬШЕ ▶', 308, 168, '#9a9aa6', 6, 'right');
      } else {   // сцена после титров: первое задание
        ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = '#000'; ctx.fillRect(136, 50, 48, 36); ctx.fillStyle = '#e8d49a'; ctx.fillRect(137, 53, 46, 32); ctx.fillRect(137, 49, 20, 6); ctx.fillStyle = '#b09a5a'; ctx.fillRect(137, 83, 46, 2);
        text('ЗАДАНИЕ_1', 160, 92, '#9a9aa6', 6, 'center');
        const s = 'Найти Носатого'; text(s.slice(0, Math.max(0, Math.floor((t - 50) / 4))), 160, 112, '#19ff9c', 8, 'center');
        if (t > 190) text('КОНЕЦ ЛИПОВОЙ ВЕТКИ', 160, 150, '#fff', 8, 'center');
        if (t > 240 && frame % 60 < 40) text('НАЖМИ, ЧТОБЫ ВЕРНУТЬСЯ В МЕНЮ', 160, 168, '#9a9aa6', 6, 'center');
      }
    },
  };
};
