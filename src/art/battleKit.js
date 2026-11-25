// 전투 연출의 그림 도구: 무대 크기, 자세, 적 종류별 생김새, 칼자국·불티·먼지 같은 효과.
// 무대 좌표는 가로 640, 세로 300, 땅은 y = 248. 사람·짐승 그림은 battleFigure.js, 주문은 battleSpell.js, 배경은 battleBack.js.
export const SW = 640, SH = 300, GY = 248;

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const EASE = {
  lin: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2,
};
export const rad = (d) => (d * Math.PI) / 180;
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return h.length === 4 ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixes = new Map();
/** 두 빛깔을 섞는다 (#rrggbb 둘, t = 0이면 a). 같은 물음은 적어 둔다 */
export function mix(a, b, t) {
  const key = a + b + (t * 64 | 0);
  let v = mixes.get(key);
  if (!v) { const [r1, g1, b1] = hexRgb(a), [r2, g2, b2] = hexRgb(b); v = '#' + [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join(''); if (mixes.size > 600) mixes.clear(); mixes.set(key, v); }
  return v;
}
export const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };

/* ---------- 자세 (각도는 도. 팔 0 = 아래로 늘어뜨림, 90 = 앞으로, 180 = 위로) ---------- */
export const POSE = {
  stand: { lean: 3, crouch: 0.04, armA: 18, elbow: 14, wpn: 20, armB: 8, elbB: 16, step: 0.2, spread: 0.2 },
  guard: { lean: 9, crouch: 0.16, armA: 66, elbow: 42, wpn: 30, armB: 34, elbB: 56, step: 0.55, spread: 0.55 },
  windup: { lean: -8, crouch: 0.1, armA: 172, elbow: 34, wpn: 14, armB: 60, elbB: 40, step: 0.3, spread: 0.6 },
  slash: { lean: 30, crouch: 0.3, armA: 54, elbow: 8, wpn: 26, armB: -20, elbB: 30, step: 1.05, spread: 0.8 },
  thrust: { lean: 32, crouch: 0.26, armA: 90, elbow: 2, wpn: 0, armB: -34, elbB: 24, step: 1.15, spread: 0.9 },
  block: { lean: -5, crouch: 0.22, armA: 104, elbow: 62, wpn: 44, armB: 70, elbB: 70, step: 0.3, spread: 0.7 },
  feint: { lean: 16, crouch: 0.2, armA: 120, elbow: 30, wpn: -30, armB: 20, elbB: 40, step: 0.8, spread: 0.4 },
  stagger: { lean: -28, crouch: 0.12, armA: 24, elbow: 22, wpn: 46, armB: -30, elbB: 20, step: -0.25, spread: 0.5 },
  kneel: { lean: 34, crouch: 0.78, armA: 12, elbow: 12, wpn: 84, armB: 30, elbB: 50, step: 0.7, spread: 0.3 },
  cast: { lean: -7, crouch: 0.06, armA: 124, elbow: 8, wpn: 0, armB: 104, elbB: 10, step: 0.35, spread: 0.45 },
  lower: { lean: 5, crouch: 0.02, armA: 6, elbow: 6, wpn: 4, armB: 6, elbB: 10, step: 0.15, spread: 0.2 },
  run: { lean: 22, crouch: 0.14, armA: 50, elbow: 60, wpn: 40, armB: -30, elbB: 60, step: 1.0, spread: 1.0 },
  // 46단계: 수마다 다른 몸짓
  overhead: { lean: -16, crouch: 0.04, armA: 198, elbow: 34, wpn: 8, armB: 150, elbB: 40, step: 0.1, spread: 0.75 }, // 강공: 머리 위로 치켜든다
  chop: { lean: 36, crouch: 0.44, armA: 44, elbow: 6, wpn: 34, armB: 30, elbB: 30, step: 1.2, spread: 0.85 }, // 내려친다
  twist: { lean: -6, crouch: 0.26, armA: 138, elbow: 52, wpn: -70, armB: 64, elbB: 60, step: -0.15, spread: 0.85 }, // 허초: 몸을 튼다
  low: { lean: 26, crouch: 0.5, armA: 30, elbow: 30, wpn: 40, armB: -40, elbB: 30, step: 1.1, spread: 0.9 }, // 낮게 벤다
  parry: { lean: 0, crouch: 0.2, armA: 84, elbow: 44, wpn: 52, armB: 20, elbB: 60, step: 0.4, spread: 0.7 }, // 칼을 세워 받는다
  deflect: { lean: 12, crouch: 0.24, armA: 74, elbow: 16, wpn: -52, armB: -10, elbB: 40, step: 0.6, spread: 0.7 }, // 흘린다
  dodge: { lean: -24, crouch: 0.3, armA: 40, elbow: 50, wpn: 50, armB: -40, elbB: 40, step: -0.5, spread: 0.9 }, // 물러나며 피한다
  charge: { lean: 4, crouch: 0.24, armA: 150, elbow: 70, wpn: -30, armB: 110, elbB: 60, step: 0.5, spread: 0.8 }, // 검기: 기를 모은다
  invoke: { lean: -10, crouch: 0.02, armA: 168, elbow: 8, wpn: -6, armB: 160, elbB: 10, step: 0.2, spread: 0.5 }, // 두 팔을 든다
  push: { lean: 14, crouch: 0.16, armA: 94, elbow: 2, wpn: 0, armB: 86, elbB: 4, step: 0.8, spread: 0.6 }, // 손바닥을 내민다
  sway: { lean: -12, crouch: 0.1, armA: 30, elbow: 40, wpn: 60, armB: 120, elbB: 100, step: 0, spread: 0.4 }, // 정신 마법에 흔들린다
  cheer: { lean: -4, crouch: 0, armA: 176, elbow: 6, wpn: 0, armB: 20, elbB: 20, step: 0.25, spread: 0.3 },
};

/* ---------- 누구를 어떻게 그릴까 ---------- */
// 적 종류 → 그림 틀. 모르는 종류는 사람 모양으로 그린다.
const LOOK = {
  giant_rat: { form: 'beast', s: 0.55, body: '#4a4038', kind: 'rat', eye: '#d06050' },
  wolf: { form: 'beast', s: 0.9, body: '#565a62', eye: '#e8c060', kind: 'wolf' },
  dire_wolf: { form: 'beast', s: 1.3, body: '#33363e', eye: '#f0a040', kind: 'wolf', mane: true },
  mana_bear: { form: 'beast', s: 1.9, bulk: 1.5, body: '#4a3c34', eye: '#a8c8ff', kind: 'bear', glow: '#7aa8ff' },
  sewer_horror: { form: 'beast', s: 2.1, bulk: 1.6, body: '#2e3c36', eye: '#b8e070', kind: 'horror' },
  wyvern: { form: 'beast', s: 2.0, bulk: 1.1, body: '#3c4a40', eye: '#e8c050', wings: true, kind: 'wyvern' },
  cave_spider: { form: 'spider', s: 0.9, body: '#2c2830' },
  spider_queen: { form: 'spider', s: 1.7, body: '#34242e', eye: '#e05a4a', mark: '#8a2c3a' },
  tower_wraith: { form: 'wraith', s: 1.1, body: '#3a4254', eye: '#a8d4ff' },
  wight: { form: 'wraith', s: 1.25, body: '#34403c', eye: '#b8ffd0' },
  kobold: { s: 0.72, body: '#3a3024', weapon: 'spear', hunch: 10, skin: '#7a5c3a', bare: true, snout: true },
  goblin: { s: 0.74, body: '#3a3426', weapon: 'sword', hunch: 12, skin: '#66783e', bare: true, ears: true },
  goblin_chief: { s: 0.95, body: '#3a3426', weapon: 'sword', hunch: 8, accent: '#7a3026', helm: true, skin: '#66783e', ears: true, shield: true },
  thug: { s: 1, body: '#4a3c30', weapon: 'dagger', hair: '#2a2018' },
  bandit: { s: 1, body: '#4a4034', weapon: 'axe', accent: '#6a4a2c', hoodie: true, hair: '#3a2a1c' },
  bandit_chief: { s: 1.08, body: '#3a302a', weapon: 'sword', accent: '#7a3026', cloak: true, hair: '#1c1614', armor: true },
  deserter: { s: 1.02, body: '#44464e', weapon: 'sword', helm: true, armor: true, shield: true },
  skeleton: { s: 1, body: '#a8a290', weapon: 'sword', thin: true, skin: '#c4bea8', bare: true, bald: true, eye: '#9ad0ff' },
  ghoul: { s: 1, body: '#5a5f52', weapon: 'none', thin: true, hunch: 18, skin: '#7c846e', bare: true, bald: true, eye: '#d8e080' },
  cultist: { s: 1, body: '#2e2228', weapon: 'dagger', accent: '#5a1e22', hood: true, robe: true },
  cult_priest: { s: 1.1, body: '#261a20', weapon: 'staff', accent: '#7a2026', hood: true, robe: true, glow: '#c04060' },
  hobgoblin: { s: 1.12, bulk: 1.25, body: '#3c3a2c', weapon: 'club', skin: '#6a7044', bare: true, ears: true, bald: true },
  orc: { s: 1.18, bulk: 1.35, body: '#3a362c', weapon: 'axe', skin: '#5c6a48', bare: true, tusk: true, hair: '#1a1816' },
  orc_chief: { s: 1.34, bulk: 1.45, body: '#34302a', weapon: 'axe', accent: '#7a3424', helm: true, skin: '#5c6a48', tusk: true, armor: true },
};
export function lookOf(unit) {
  if (LOOK[unit]) return { form: 'human', bulk: 1, ...LOOK[unit] };
  return { form: 'human', s: 1, bulk: 1, body: '#4a4238', weapon: 'sword', hair: '#2a2018' };
}
export const HERO = { form: 'human', s: 1.02, bulk: 1, body: '#3c465a', weapon: 'sword', cloak: true, accent: '#8a6a34', hair: '#3a2a1c', armor: true };
export const MAGE = { form: 'human', s: 1, bulk: 0.95, body: '#2e3654', weapon: 'staff', accent: '#4a5a94', hood: true, robe: true, glow: '#9cc4ff' };
export const ALLY = { form: 'human', s: 0.98, bulk: 1, body: '#4a4e58', weapon: 'sword', accent: '#5a6a7a', helm: true, armor: true };
export const SOLDIER = { form: 'human', s: 1, bulk: 1.05, body: '#44464e', weapon: 'sword', helm: true, accent: '#7a6a44', armor: true, shield: true };

/* ---------- 빛과 효과 ---------- */
const orbs = new Map();
export function orb(c, x, y, r, color, a = 1) {
  if (r <= 0 || a <= 0) return;
  let s = orbs.get(color);
  if (!s) {
    s = document.createElement('canvas'); s.width = s.height = 48;
    const g = s.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.18, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
    if (orbs.size > 24) orbs.clear();
    orbs.set(color, s);
  }
  const ga = c.globalAlpha, op = c.globalCompositeOperation;
  c.globalAlpha = ga * a; c.globalCompositeOperation = 'lighter'; c.drawImage(s, x - r, y - r, r * 2, r * 2);
  c.globalAlpha = ga; c.globalCompositeOperation = op;
}

/** 효과 한 개를 그린다. k: 0(시작)~1(끝) */
export function drawFx(c, e, k) {
  const fade = 1 - k;
  if (e.type === 'slash') { // 칼이 지나간 자리: 초승달 꼴 빛
    c.save(); c.translate(e.x, e.y); c.rotate(e.ang); c.scale(e.flip ?? 1, 1);
    const r = e.r * (0.8 + k * 0.3), sweep = lerp(0.3, 1, EASE.out(clamp(k * 2.4)));
    c.globalCompositeOperation = 'lighter'; c.globalAlpha *= fade ** 1.4; c.fillStyle = e.color ?? '#f2ead8';
    c.beginPath(); c.arc(0, 0, r, -1.15, -1.15 + 2.3 * sweep); c.arc(r * 0.24, 0, r * 0.86, -1.15 + 2.3 * sweep, -1.15, true); c.closePath(); c.fill();
    c.restore();
    if (e.glow) orb(c, e.x, e.y, e.r * 1.5, e.glow, fade * 0.6);
  } else if (e.type === 'thrust') {
    c.save(); c.globalAlpha *= fade; c.strokeStyle = e.color ?? '#f2ead8'; c.lineCap = 'round'; c.lineWidth = 2.4 * fade + 0.4;
    c.beginPath(); c.moveTo(e.x - e.dx * (1 - k * 0.5), e.y); c.lineTo(e.x + e.dx * 0.3, e.y); c.stroke(); c.restore();
  } else if (e.type === 'spark') {
    const x = e.x + e.vx * k * e.life, y = e.y + e.vy * k * e.life + 160 * (k * e.life) ** 2;
    c.save(); c.globalAlpha *= fade; c.strokeStyle = e.color ?? '#ffd9a0'; c.lineWidth = 1.3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - e.vx * 0.035, y - e.vy * 0.035); c.stroke(); c.restore();
  } else if (e.type === 'chip') { // 튀는 조각: 천·쇠·돌·얼음 (돌면서 떨어진다)
    const tt = k * e.life, x = e.x + e.vx * tt, y = Math.min(GY + 1, e.y + e.vy * tt + (e.g ?? 420) * tt * tt);
    c.save(); c.globalAlpha *= clamp(fade * 2.4); c.translate(x, y); c.rotate((e.spin ?? 9) * tt + e.vx); c.fillStyle = e.color ?? '#8a8478';
    c.beginPath(); c.moveTo(-e.r, -e.r * 0.5); c.lineTo(e.r * 0.8, -e.r * 0.7); c.lineTo(e.r, e.r * 0.6); c.lineTo(-e.r * 0.6, e.r * 0.5); c.closePath(); c.fill(); c.restore();
  } else if (e.type === 'star') { // 맞는 순간: 사방으로 뻗는 짧은 빛줄기
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= fade ** 1.2; c.strokeStyle = e.color ?? '#fff4dc'; c.lineCap = 'round';
    const n = e.n ?? 9, r0 = e.r * (0.25 + EASE.out(k) * 0.5), r1 = e.r * (0.5 + EASE.out(k) * 0.9);
    for (let i = 0; i < n; i++) { const an = (i / n) * 6.283 + (e.rot ?? 0), q = 0.6 + ((i * 7) % 5) * 0.14; c.lineWidth = (2.2 - k * 1.6) * (i % 2 ? 0.6 : 1); c.beginPath(); c.moveTo(e.x + Math.cos(an) * r0, e.y + Math.sin(an) * r0 * 0.8); c.lineTo(e.x + Math.cos(an) * r1 * q, e.y + Math.sin(an) * r1 * q * 0.8); c.stroke(); }
    c.restore();
  } else if (e.type === 'wave') { // 검기: 날아가는 초승달
    const kk = clamp(k / 0.8), x = lerp(e.x, e.tx, EASE.out(kk) * 0.4 + kk * 0.6), a = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2, f = Math.sign(e.tx - e.x) || 1, r = e.r * (0.8 + kk * 0.5);
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, e.y); c.scale(f, 1);
    for (let i = 0; i < 4; i++) { c.globalAlpha = a * (0.8 - i * 0.2); c.fillStyle = i ? e.color : '#ffffff'; const o = -i * 9; c.beginPath(); c.arc(o - r * 0.7, 0, r, -0.95, 0.95); c.arc(o - r * 0.42 - i * 1.5, 0, r * 0.84, 0.95, -0.95, true); c.closePath(); c.fill(); }
    c.restore(); orb(c, x, e.y, r * 1.5, e.color, a * 0.5);
  } else if (e.type === 'streak') { // 빠르게 스치는 선
    const x = e.x + e.vx * k * e.life, y = e.y + (e.vy ?? 0) * k * e.life;
    c.save(); c.globalAlpha *= Math.sin(k * Math.PI) * (e.a ?? 0.6); c.strokeStyle = e.color ?? '#f4f0e4'; c.lineWidth = e.w ?? 1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); if (e.curl) c.quadraticCurveTo(x - e.len * 0.5 * Math.sign(e.vx), y - e.curl, x - e.len * Math.sign(e.vx), y + e.curl * 0.4); else c.lineTo(x - e.len * Math.sign(e.vx || 1), y - (e.vy ?? 0) * 0.05); c.stroke(); c.restore();
  } else if (e.type === 'gather') { // 한 점으로 모여드는 빛
    const q = EASE.in(k), x = lerp(e.x, e.tx, q), y = lerp(e.y, e.ty, q);
    orb(c, x, y, e.r * (1 - q * 0.5), e.color, Math.sin(k * Math.PI) * 0.9 + 0.1);
  } else if (e.type === 'beam') { // 빛기둥·광선
    const a = k < 0.15 ? k / 0.15 : fade ** 1.5, w = e.w * (k < 0.15 ? 0.4 + k * 4 : 1 - k * 0.5);
    const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [m, col, al] of [[2.6, e.color, 0.25], [1.2, e.color, 0.55], [0.4, '#ffffff', 0.95]]) { c.globalAlpha = a * al; c.fillStyle = col; c.beginPath(); c.moveTo(e.x + nx * w * m * 0.5, e.y + ny * w * m * 0.5); c.lineTo(e.tx + nx * w * m, e.ty + ny * w * m); c.lineTo(e.tx - nx * w * m, e.ty - ny * w * m); c.lineTo(e.x - nx * w * m * 0.5, e.y - ny * w * m * 0.5); c.closePath(); c.fill(); }
    c.restore(); orb(c, e.tx, e.ty, w * 6, e.color, a * 0.8);
  } else if (e.type === 'spike') { // 땅에서 솟는 돌기둥 (솟았다가 부서진다)
    const up = k < 0.18 ? EASE.out(k / 0.18) : 1, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1, h = e.h * up, w = e.w;
    c.save(); c.globalAlpha *= a; c.translate(e.x, e.y); c.rotate(e.tilt ?? 0);
    c.fillStyle = e.color ?? '#5a5248'; c.beginPath(); c.moveTo(-w, 2); c.lineTo(-w * 0.5, -h * 0.5); c.lineTo(w * 0.1, -h); c.lineTo(w * 0.7, -h * 0.4); c.lineTo(w, 2); c.closePath(); c.fill();
    c.fillStyle = e.lit ?? 'rgba(232,220,196,.3)'; c.beginPath(); c.moveTo(-w, 2); c.lineTo(-w * 0.5, -h * 0.5); c.lineTo(w * 0.1, -h); c.lineTo(-w * 0.1, 2); c.closePath(); c.fill();
    c.restore();
  } else if (e.type === 'tendril') { // 땅에서 자라 휘감는 줄기 (그림자·덩굴)
    const grow = clamp(k / 0.35), a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1, n = 14;
    c.save(); c.globalAlpha *= a; c.strokeStyle = e.color; c.lineCap = 'round'; c.lineJoin = 'round';
    let px = e.x, py = e.y;
    for (let i = 1; i <= n * grow; i++) { const q = i / n, wob = Math.sin(q * 7 + e.ph + k * 6) * e.curl * (1 - q * 0.4), x = lerp(e.x, e.tx, q) + wob, y = lerp(e.y, e.ty, EASE.out(q)); c.lineWidth = e.w * (1.1 - q * 0.8); c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); if (e.leaf && i % 3 === 0) { c.fillStyle = e.leaf; c.beginPath(); c.ellipse(x + 3, y - 1, 3.4, 1.5, q * 5, 0, 6.3); c.fill(); } px = x; py = y; }
    c.restore(); if (e.glow) orb(c, px, py, 8, e.glow, a * 0.6);
  } else if (e.type === 'ripple') { // 정신 마법: 번져 가는 겹고리
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = e.color;
    for (let i = 0; i < 3; i++) { const q = (k * 1.4 + i * 0.22) % 1; c.globalAlpha = (1 - q) * fade * 0.8; c.lineWidth = 1.6 * (1 - q) + 0.4; c.beginPath(); c.ellipse(e.x, e.y, e.r * q, e.r * q * (e.flat ?? 0.7), e.rot ?? 0, 0, 6.3); c.stroke(); }
    c.restore();
  } else if (e.type === 'rune') { // 발밑 마법진
    const a = Math.sin(clamp(k) * Math.PI) ** 0.5;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= a * 0.8; c.strokeStyle = e.color; c.translate(e.x, e.y); c.scale(1, 0.24);
    c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, e.r, 0, 6.3); c.stroke(); c.lineWidth = 0.9; c.beginPath(); c.arc(0, 0, e.r * 0.72, 0, 6.3); c.stroke();
    c.rotate(k * 2.4); c.beginPath(); for (let i = 0; i < 6; i++) { const an = i * 1.0472; c.moveTo(Math.cos(an) * e.r * 0.72, Math.sin(an) * e.r * 0.72); c.lineTo(Math.cos(an + 2.0944) * e.r * 0.72, Math.sin(an + 2.0944) * e.r * 0.72); } c.stroke();
    c.restore(); orb(c, e.x, e.y - 4, e.r * 1.2, e.color, a * 0.22);
  } else if (e.type === 'claw') { // 할퀸 자국: 세 줄
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= fade ** 1.3; c.strokeStyle = e.color ?? '#fff0dc'; c.lineCap = 'round'; c.lineWidth = 2.2 * fade + 0.4;
    const len = e.r * EASE.out(clamp(k * 3));
    for (const o of [-1, 0, 1]) { c.beginPath(); c.moveTo(e.x - e.f * e.r * 0.5 + o * 5, e.y - e.r * 0.6 + o * 3); c.lineTo(e.x - e.f * e.r * 0.5 + o * 5 + e.f * len, e.y - e.r * 0.6 + o * 3 + len * 1.1); c.stroke(); }
    c.restore();
  } else if (e.type === 'blade') { // 손에서 떨어져 날아가는 칼: 돌다가 땅에 꽂힌다
    const tt = k * e.life, fall = (-e.vy + Math.sqrt(e.vy * e.vy + 1040 * Math.max(1, GY - e.len * 0.84 - e.y))) / 520, q = Math.min(tt, fall);
    const x = e.x + e.vx * q, y = e.y + e.vy * q + 260 * q * q, ang = tt < fall ? e.spin * q : Math.PI + (e.vx > 0 ? 0.3 : -0.3), L = e.len;
    c.save(); c.translate(x, y); c.rotate(ang); c.lineCap = 'round';
    c.strokeStyle = '#8e959c'; c.lineWidth = L * 0.1; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -L); c.stroke(); c.strokeStyle = '#e4e8ec'; c.lineWidth = L * 0.04; c.beginPath(); c.moveTo(-L * 0.02, 0); c.lineTo(-L * 0.02, -L * 0.94); c.stroke();
    c.strokeStyle = '#7a6a44'; c.lineWidth = L * 0.07; c.beginPath(); c.moveTo(-L * 0.14, 0); c.lineTo(L * 0.14, 0); c.stroke(); c.strokeStyle = '#2a2018'; c.lineWidth = L * 0.08; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, L * 0.22); c.stroke();
    c.restore();
  } else if (e.type === 'smoke') { // 피어오르는 연기·김
    c.save(); c.globalAlpha *= Math.sin(k * Math.PI) * (e.a ?? 0.3); c.fillStyle = e.color ?? '#3a3438';
    c.beginPath(); c.arc(e.x + (e.vx ?? 0) * k, e.y - (e.rise ?? 30) * k, e.r * (0.6 + k), 0, 6.3); c.fill(); c.restore();
  } else if (e.type === 'dust') {
    c.save(); c.globalAlpha *= fade * 0.34; c.fillStyle = e.color ?? '#a89a84';
    c.beginPath(); c.ellipse(e.x + e.vx * k, e.y - 10 * k, e.r * (0.5 + k), e.r * (0.3 + k * 0.5), 0, 0, 6.3); c.fill(); c.restore();
  } else if (e.type === 'flash') {
    orb(c, e.x, e.y, e.r * (0.6 + k * 0.8), e.color ?? '#fff0d0', fade ** 2);
  } else if (e.type === 'ring') {
    c.save(); c.globalAlpha *= fade; c.strokeStyle = e.color ?? '#f0e4c8'; c.lineWidth = 2.4 * fade + 0.3;
    c.beginPath(); c.ellipse(e.x, e.y, e.r * EASE.out(k), e.r * EASE.out(k) * (e.flat ?? 1), 0, 0, 6.3); c.stroke(); c.restore();
  } else if (e.type === 'bolt') { // 날아가는 주문 (불, 얼음, 어둠)
    const kk = EASE.in(clamp(k / 0.82)), x = lerp(e.x, e.tx, kk), y = lerp(e.y, e.ty, kk) - Math.sin(kk * Math.PI) * (e.arc ?? 10);
    if (k < 0.82) {
      for (let i = 0; i < 6; i++) { const q = clamp(kk - i * 0.035); orb(c, lerp(e.x, e.tx, q), lerp(e.y, e.ty, q) - Math.sin(q * Math.PI) * (e.arc ?? 10), e.r * (1 - i * 0.13), e.color, 0.7 - i * 0.1); }
      if (e.shard) { c.save(); c.translate(x, y); c.rotate(Math.atan2(e.ty - e.y, e.tx - e.x)); c.fillStyle = '#e8f4ff'; c.beginPath(); c.moveTo(9, 0); c.lineTo(-6, -2.6); c.lineTo(-6, 2.6); c.closePath(); c.fill(); c.restore(); }
    } else { const b = (k - 0.82) / 0.18; orb(c, e.tx, e.ty, e.r * (2 + b * 5), e.color, (1 - b) ** 1.5); }
  } else if (e.type === 'lightning') {
    if (k > 0.5 && k < 0.62) return; // 한 번 깜박인다
    c.save(); c.globalAlpha *= clamp(fade * 1.6); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'miter'; c.lineCap = 'round';
    for (const [w, col] of [[5, 'rgba(120,150,255,.4)'], [1.6, '#eef4ff']]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); e.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
    c.restore(); orb(c, e.tx, e.ty, 40, '#9ab4ff', fade);
  } else if (e.type === 'ward') { // 결계: 반투명한 둥근 막 (맞으면 육각 무늬가 번쩍인다)
    const a = Math.sin(clamp(k) * Math.PI) ** 0.6, col = e.color ?? '#a8d0ff';
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(e.x, e.y); c.scale(e.f, 1);
    c.globalAlpha = a * 0.07; c.fillStyle = col; c.beginPath(); c.arc(0, 0, e.r, -1.35, 1.35); c.closePath(); c.fill();
    c.globalAlpha = a * 0.9; c.strokeStyle = col; c.lineWidth = 1.8; c.beginPath(); c.arc(0, 0, e.r, -1.35, 1.35); c.stroke();
    c.globalAlpha = a * 0.5 * (e.hit ? 1 : 0.5); c.lineWidth = 0.8; for (let i = -2; i <= 2; i++) { const an = i * 0.5, x = Math.cos(an) * e.r * 0.93, y = Math.sin(an) * e.r * 0.93; c.beginPath(); for (let j = 0; j <= 6; j++) { const h = j * 1.0472; c[j ? 'lineTo' : 'moveTo'](x + Math.cos(h) * 5 * 0.5, y + Math.sin(h) * 5); } c.stroke(); }
    c.restore(); orb(c, e.x + e.f * e.r * 0.8, e.y, e.r * 0.9, col, a * (e.hit ? 0.3 : 0.14));
  } else if (e.type === 'arrows') {
    c.save(); c.strokeStyle = 'rgba(20,18,16,.8)'; c.lineWidth = 1; c.beginPath();
    for (const [dx, dl] of e.set) { const q = clamp(k * 1.25 - dl); if (q <= 0 || q >= 1) continue; const x = lerp(e.x, e.tx, q) + dx, y = lerp(e.y, e.ty, q) - Math.sin(q * Math.PI) * e.h, an = Math.atan2((e.ty - e.y) / (e.tx - e.x) - Math.cos(q * Math.PI) * e.h * Math.PI / (e.tx - e.x), 1) * Math.sign(e.tx - e.x); c.moveTo(x, y); c.lineTo(x - Math.cos(an) * 7 * Math.sign(e.tx - e.x), y - Math.sin(an) * 7 * Math.sign(e.tx - e.x)); }
    c.stroke(); c.restore();
  } else if (e.type === 'ember') {
    orb(c, e.x + e.vx * k, e.y + e.vy * k, e.r * fade, e.color ?? '#ff9a50', fade);
  }
}

/** 번개가 지나갈 꺾인 길 */
export function zigzag(x0, y0, x1, y1, rnd, n = 9) {
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const t = i / n; pts.push([lerp(x0, x1, t) + (rnd() - 0.5) * 26, lerp(y0, y1, t) + (rnd() - 0.5) * 12]); }
  pts.push([x1, y1]);
  return pts;
}
