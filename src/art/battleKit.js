// 전투 연출의 그림 도구: 사람·짐승·망령 실루엣과 칼자국·불꽃·먼지 같은 효과.
// 무대 좌표는 가로 640, 세로 220, 땅은 y = 178. 그림은 어두운 실루엣에 빛 받는 쪽만 살짝 밝힌다.
export const SW = 640, SH = 220, GY = 178;

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const EASE = {
  lin: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2,
};
const rad = (d) => (d * Math.PI) / 180;

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
  cheer: { lean: -4, crouch: 0, armA: 176, elbow: 6, wpn: 0, armB: 20, elbB: 20, step: 0.25, spread: 0.3 },
};

/* ---------- 누구를 어떻게 그릴까 ---------- */
// 적 종류 → 그림 틀. 모르는 종류는 사람 모양으로 그린다.
const LOOK = {
  giant_rat: { form: 'beast', s: 0.55, body: '#2a2422' },
  wolf: { form: 'beast', s: 0.9, body: '#24262a', eye: '#d8b060' },
  dire_wolf: { form: 'beast', s: 1.3, body: '#1c1e24', eye: '#e0a050' },
  mana_bear: { form: 'beast', s: 1.9, bulk: 1.5, body: '#231e22', eye: '#a8c8ff' },
  sewer_horror: { form: 'beast', s: 2.1, bulk: 1.6, body: '#1a2220', eye: '#b8e070' },
  wyvern: { form: 'beast', s: 2.0, bulk: 1.1, body: '#222a26', eye: '#e8c050', wings: true },
  cave_spider: { form: 'spider', s: 0.9, body: '#1c1a20' },
  spider_queen: { form: 'spider', s: 1.7, body: '#201820', eye: '#d04a4a' },
  tower_wraith: { form: 'wraith', s: 1.1, body: '#20242e', eye: '#a8d4ff' },
  wight: { form: 'wraith', s: 1.25, body: '#1e2226', eye: '#b8ffd0' },
  kobold: { s: 0.72, body: '#2e2a22', weapon: 'spear', hunch: 10 },
  goblin: { s: 0.74, body: '#2a3122', weapon: 'sword', hunch: 12 },
  goblin_chief: { s: 0.95, body: '#2a3122', weapon: 'sword', hunch: 8, accent: '#6a2a22', helm: true },
  thug: { s: 1, body: '#2a2420', weapon: 'dagger' },
  bandit: { s: 1, body: '#2c2620', weapon: 'axe', accent: '#4a3a26' },
  bandit_chief: { s: 1.08, body: '#261f1c', weapon: 'sword', accent: '#6a2c24', cloak: true },
  deserter: { s: 1.02, body: '#2a2a2e', weapon: 'sword', helm: true },
  skeleton: { s: 1, body: '#8c8778', weapon: 'sword', thin: true },
  ghoul: { s: 1, body: '#5a5f52', weapon: 'none', thin: true, hunch: 18 },
  cultist: { s: 1, body: '#1e181c', weapon: 'dagger', cloak: true, accent: '#5a1e22', hood: true },
  cult_priest: { s: 1.1, body: '#191418', weapon: 'staff', cloak: true, accent: '#7a2026', hood: true, glow: '#c04060' },
  hobgoblin: { s: 1.12, bulk: 1.25, body: '#2c3026', weapon: 'club' },
  orc: { s: 1.18, bulk: 1.35, body: '#2a3028', weapon: 'axe' },
  orc_chief: { s: 1.34, bulk: 1.45, body: '#262c24', weapon: 'axe', accent: '#5a2a20', helm: true },
};
export function lookOf(unit) {
  if (LOOK[unit]) return { form: 'human', bulk: 1, ...LOOK[unit] };
  return { form: 'human', s: 1, bulk: 1, body: '#2a2622', weapon: 'sword' };
}
export const HERO = { form: 'human', s: 1.02, bulk: 1, body: '#1e2026', weapon: 'sword', cloak: true, accent: '#7a5a2c' };
export const MAGE = { form: 'human', s: 1, bulk: 0.95, body: '#1c1e2a', weapon: 'staff', cloak: true, accent: '#3a4a7a', hood: true, glow: '#9cc4ff' };
export const ALLY = { form: 'human', s: 0.98, bulk: 1, body: '#22242a', weapon: 'sword', accent: '#4a5a6a', helm: true };
export const SOLDIER = { form: 'human', s: 1, bulk: 1.05, body: '#24262c', weapon: 'sword', helm: true, accent: '#6a5a3a' };

/* ---------- 사람 모양 ---------- */
const STEEL = '#c2c7cc';
function limb(c, ax, ay, bx, by, w) { c.lineWidth = w; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function knee(hx, hy, fx, fy, l, bend) {
  const dx = fx - hx, dy = fy - hy, d = Math.min(Math.hypot(dx, dy), l * 2 - 0.01) || 0.01;
  const h = Math.sqrt(Math.max(0, l * l - (d / 2) ** 2));
  return [hx + dx / 2 + (-dy / d) * h * -bend, hy + dy / 2 + (dx / d) * h * -bend];
}
function weapon(c, kind, hx, hy, ang, f, s, glow, t) {
  const dir = (len) => [hx + f * Math.sin(ang) * len, hy + Math.cos(ang) * len];
  c.lineCap = 'round';
  if (kind === 'none') return null;
  if (kind === 'sword' || kind === 'dagger') {
    const L = (kind === 'sword' ? 30 : 13) * s, [tx, ty] = dir(L), [gx, gy] = dir(-4 * s);
    c.strokeStyle = '#0c0c0e'; limb(c, gx, gy, tx, ty, 3.6 * s);
    c.strokeStyle = glow ?? STEEL; limb(c, hx, hy, tx, ty, 1.9 * s);
    const [qx, qy] = dir(2 * s), px = Math.cos(ang) * 4 * s * f, py = -Math.sin(ang) * 4 * s; // 코등이
    c.strokeStyle = '#3a2e22'; limb(c, qx - px, qy - py, qx + px, qy + py, 2 * s);
    return [tx, ty];
  }
  if (kind === 'axe' || kind === 'club' || kind === 'spear' || kind === 'staff') {
    const L = (kind === 'spear' ? 46 : kind === 'staff' ? 40 : 24) * s, back = (kind === 'spear' || kind === 'staff' ? 14 : 4) * s;
    const [tx, ty] = dir(L), [bx, by] = dir(-back);
    c.strokeStyle = '#2a2018'; limb(c, bx, by, tx, ty, (kind === 'club' ? 3.4 : 2.4) * s);
    if (kind === 'axe') {
      const [ax, ay] = dir(L * 0.82), nx = Math.cos(ang) * f, ny = -Math.sin(ang);
      c.fillStyle = STEEL; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + nx * 9 * s + (tx - ax) * 0.6, ay + ny * 9 * s + (ty - ay) * 0.6); c.lineTo(ax + nx * 9 * s - (tx - ax) * 0.9, ay + ny * 9 * s - (ty - ay) * 0.9); c.closePath(); c.fill();
    } else if (kind === 'club') { c.strokeStyle = '#1e1814'; const [mx, my] = dir(L * 0.62); limb(c, mx, my, tx, ty, 6.4 * s); }
    else if (kind === 'spear') { const [mx, my] = dir(L - 8 * s); c.strokeStyle = STEEL; limb(c, mx, my, tx, ty, 2.6 * s); }
    else if (glow) orb(c, tx, ty, (6 + Math.sin(t * 5) * 1.2) * s, glow, 0.85);
    return [tx, ty];
  }
  return null;
}
/**
 * 사람 모양 한 명. a: { x, y, face(+1 오른쪽을 봄), look, st(지금 자세 값), t(시간) }
 * 돌려주는 값: 무기 끝과 가슴 자리 (효과를 붙일 곳)
 */
export function human(c, a) {
  const { look: k, st: p } = a, f = a.face, s = k.s * (a.scale ?? 1), b = (k.bulk ?? 1) * (k.thin ? 0.72 : 1);
  const hunch = k.hunch ?? 0, breath = Math.sin(a.t * 2.2 + a.seed) * 0.6;
  const leg = 23 * s, torso = 21 * s;
  const hy = a.y - leg * 2 * (1 - p.crouch * 0.42) * 0.96, hx = a.x + f * (p.lean * 0.12 + p.crouch * 2) * s;
  const f1 = [a.x + f * (4 + p.step * 15) * s, a.y], f2 = [a.x - f * (4 + p.spread * 11) * s, a.y];
  const la = rad(p.lean + hunch);
  const sx = hx + f * Math.sin(la) * torso, sy = hy - Math.cos(la) * torso + breath;
  const hdx = sx + f * Math.sin(la + rad(hunch * 0.8)) * 8.5 * s, hdy = sy - Math.cos(la) * 8.5 * s;
  const arm = (base, el, l1, l2) => {
    const a1 = rad(base) + la * 0.4, a2 = rad(base + el) + la * 0.4;
    const ex = sx + f * Math.sin(a1) * l1, ey = sy + Math.cos(a1) * l1;
    return [ex, ey, ex + f * Math.sin(a2) * l2, ey + Math.cos(a2) * l2, a2];
  };
  c.lineCap = 'round'; c.lineJoin = 'round';
  const body = k.body, dark = '#0e0d10';
  // 망토 (몸 뒤)
  if (k.cloak) {
    const sway = Math.sin(a.t * 3 + a.seed) * 3 * s + p.lean * -0.25 * s;
    c.fillStyle = k.accent ?? '#2a2a30'; c.beginPath(); c.moveTo(sx - f * 2 * s, sy - 3 * s);
    c.quadraticCurveTo(hx - f * (13 * s + sway), hy - 4 * s, hx - f * (11 * s + sway * 1.6), hy + leg * 0.9 * (1 - p.crouch * 0.5));
    c.lineTo(hx + f * 2 * s, hy + 3 * s); c.closePath(); c.fill();
  }
  // 뒷다리, 뒷팔
  c.strokeStyle = dark;
  const k2 = knee(hx, hy, f2[0], f2[1], leg, f); limb(c, hx, hy, k2[0], k2[1], 6.2 * s * b); limb(c, k2[0], k2[1], f2[0], f2[1], 5 * s * b);
  const B = arm(p.armB, p.elbB, 10 * s, 9 * s); limb(c, sx, sy, B[0], B[1], 4.4 * s * b); limb(c, B[0], B[1], B[2], B[3], 3.8 * s * b);
  // 앞다리
  c.strokeStyle = body;
  const k1 = knee(hx, hy, f1[0], f1[1], leg, f); limb(c, hx, hy, k1[0], k1[1], 6.8 * s * b); limb(c, k1[0], k1[1], f1[0], f1[1], 5.4 * s * b);
  c.strokeStyle = dark; limb(c, f1[0] - f * 1 * s, f1[1], f1[0] + f * 5 * s, f1[1], 3.2 * s); limb(c, f2[0] - f * 1 * s, f2[1], f2[0] + f * 5 * s, f2[1], 3.2 * s);
  // 몸통
  c.strokeStyle = body; limb(c, hx, hy, sx, sy, 11.5 * s * b);
  if (k.accent && !k.cloak) { c.strokeStyle = k.accent; limb(c, hx + f * 1, hy - 2 * s, lerp(hx, sx, 0.3), lerp(hy, sy, 0.3), 12 * s * b); }
  // 빛 받는 쪽 가장자리
  c.strokeStyle = 'rgba(214,200,176,.2)'; limb(c, hx + a.lit * 5 * s * b, hy - 2 * s, sx + a.lit * 5 * s * b, sy + 2 * s, 1.2);
  // 머리
  c.fillStyle = k.thin && !k.hunch ? body : k.hood ? (k.accent ?? body) : '#2a2420';
  c.beginPath(); c.arc(hdx, hdy, 5.6 * s, 0, 6.3); c.fill();
  if (k.hood) { c.beginPath(); c.moveTo(hdx - f * 6 * s, hdy + 5 * s); c.quadraticCurveTo(hdx - f * 8 * s, hdy - 9 * s, hdx + f * 4 * s, hdy - 5.5 * s); c.lineTo(hdx + f * 2 * s, hdy + 5 * s); c.closePath(); c.fill(); }
  if (k.helm) { c.fillStyle = '#4a4e56'; c.beginPath(); c.arc(hdx, hdy - 0.6 * s, 6 * s, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(hdx + f * 6.4 * s, hdy + 1 * s); c.closePath(); c.fill(); }
  c.strokeStyle = 'rgba(224,210,186,.26)'; c.lineWidth = 1.1; c.beginPath(); c.arc(hdx, hdy, 5.2 * s, a.lit > 0 ? -1.2 : Math.PI - 0.4, a.lit > 0 ? 0.4 : Math.PI + 1.2); c.stroke();
  // 무기 든 팔
  const A = arm(p.armA, p.elbow, 10.5 * s, 9.5 * s);
  const tip = weapon(c, k.weapon, A[2], A[3], A[4] + rad(p.wpn), f, s, a.blade, a.t);
  c.strokeStyle = body; limb(c, sx, sy, A[0], A[1], 4.8 * s * b); limb(c, A[0], A[1], A[2], A[3], 4.2 * s * b);
  if (a.blade && tip) orb(c, lerp(A[2], tip[0], 0.6), lerp(A[3], tip[1], 0.6), 16 * s, a.blade, 0.5);
  a.tip = tip ?? [A[2], A[3]]; a.hand = [B[2], B[3]]; a.chest = [lerp(hx, sx, 0.6), lerp(hy, sy, 0.6)]; a.head = [hdx, hdy];
}

/* ---------- 네발짐승 ---------- */
export function beast(c, a) {
  const k = a.look, p = a.st, f = a.face, s = k.s * (a.scale ?? 1), b = k.bulk ?? 1;
  const lunge = p.lunge ?? 0, rear = p.rear ?? 0;
  const bx = a.x + f * lunge * 10 * s, by = a.y - (15 + rear * 7 - p.crouch * 5) * s;
  const gait = Math.sin(a.t * 9 + a.seed) * (p.gait ?? 0);
  c.lineCap = 'round'; c.strokeStyle = '#0d0c0f';
  const legAt = (ox, sw, back) => { const tx = bx + f * ox * s, fx = tx + f * (sw * 9 + (back ? -lunge : lunge) * 9) * s; limb(c, tx, by + 2 * s, lerp(tx, fx, 0.4) - f * (back ? 3 : -1) * s, by + 9 * s, 4.2 * s * b); limb(c, lerp(tx, fx, 0.4) - f * (back ? 3 : -1) * s, by + 9 * s, fx, a.y, 3.2 * s * b); };
  legAt(-13, -gait, true); legAt(11, gait, false);
  if (k.wings) {
    const flap = Math.sin(a.t * 4 + a.seed) * 8;
    c.fillStyle = '#161c1a'; c.beginPath(); c.moveTo(bx - f * 4 * s, by - 6 * s); c.lineTo(bx - f * 30 * s, by - (40 + flap) * s); c.lineTo(bx - f * 16 * s, by - (20 + flap * 0.4) * s); c.lineTo(bx - f * 40 * s, by - (22 + flap) * s); c.lineTo(bx - f * 22 * s, by - 6 * s); c.lineTo(bx - f * 34 * s, by + 2 * s); c.closePath(); c.fill();
  }
  c.save(); c.translate(bx, by); c.rotate(-f * rad(rear * 26 + lunge * -6));
  c.fillStyle = k.body; c.beginPath(); c.ellipse(0, 0, (20 + lunge * 3) * s, (8.5 - lunge) * s * b, 0, 0, 6.3); c.fill();
  // 꼬리, 목, 머리
  c.strokeStyle = k.body; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(-f * 18 * s, -2 * s); c.quadraticCurveTo(-f * 30 * s, -6 * s - gait * 3, -f * 34 * s, 2 * s + lunge * -8 * s); c.stroke();
  const hx = f * (21 + lunge * 4) * s, hy = (-7 + (k.wings ? -8 : 0)) * s;
  c.lineWidth = 8 * s * b; c.beginPath(); c.moveTo(f * 12 * s, -3 * s); c.lineTo(hx, hy); c.stroke();
  c.fillStyle = k.body; c.beginPath(); c.ellipse(hx + f * 3 * s, hy, 7 * s, 5.2 * s, f * 0.3, 0, 6.3); c.fill();
  c.beginPath(); c.moveTo(hx + f * 6 * s, hy - 3 * s); c.lineTo(hx + f * 15 * s, hy + (1 + (p.bite ?? 0) * -2) * s); c.lineTo(hx + f * 6 * s, hy + 3 * s); c.closePath(); c.fill();
  if (p.bite) { c.beginPath(); c.moveTo(hx + f * 6 * s, hy + 2 * s); c.lineTo(hx + f * 13 * s, hy + (3 + p.bite * 5) * s); c.lineTo(hx + f * 4 * s, hy + 5 * s); c.closePath(); c.fill(); }
  c.beginPath(); c.moveTo(hx - f * 1 * s, hy - 4 * s); c.lineTo(hx, hy - 11 * s); c.lineTo(hx + f * 4 * s, hy - 4 * s); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(214,200,176,.16)'; c.lineWidth = 1.1; c.beginPath(); c.ellipse(0, 0, 19 * s, 7.6 * s * b, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  if (k.eye) { c.fillStyle = k.eye; c.beginPath(); c.arc(hx + f * 5 * s, hy - 1.4 * s, 1.1 * Math.max(1, s * 0.8), 0, 6.3); c.fill(); }
  c.restore();
  c.strokeStyle = '#0d0c0f'; legAt(-9, gait, true); legAt(14, -gait, false);
  a.tip = [bx + f * 34 * s, by - 6 * s]; a.chest = [bx, by]; a.head = [bx + f * 24 * s, by - 8 * s];
}

/* ---------- 거미 ---------- */
export function spider(c, a) {
  const k = a.look, p = a.st, f = a.face, s = k.s * (a.scale ?? 1);
  const bx = a.x + f * (p.lunge ?? 0) * 12 * s, by = a.y - (13 - p.crouch * 5 + (p.rear ?? 0) * 6) * s;
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#0d0c10'; c.lineWidth = 2.2 * s;
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? 1 : -1, n = i % 4, w = Math.sin(a.t * 10 + i * 1.7 + a.seed) * (p.gait ?? 0) * 3;
    const dx = side * (10 + n * 7) * s + w, kx = bx + dx * 0.9, ky = by - (12 + n * 3) * s, fx = bx + dx * 1.7, fy = a.y;
    c.beginPath(); c.moveTo(bx + side * 3 * s, by); c.lineTo(kx, ky); c.lineTo(fx, fy); c.stroke();
  }
  c.fillStyle = k.body; c.beginPath(); c.ellipse(bx - f * 9 * s, by - 2 * s, 12 * s, 9 * s, 0, 0, 6.3); c.fill();
  c.beginPath(); c.ellipse(bx + f * 6 * s, by, 7 * s, 5.6 * s, 0, 0, 6.3); c.fill();
  c.fillStyle = k.eye ?? '#b84a4a'; for (const [ex, ey] of [[10, -2], [12, 0.5], [8, 0]]) { c.beginPath(); c.arc(bx + f * ex * s, by + ey * s, 0.9 * Math.max(1, s * 0.8), 0, 6.3); c.fill(); }
  a.tip = [bx + f * 16 * s, by + 2 * s]; a.chest = [bx, by]; a.head = [bx + f * 8 * s, by];
}

/* ---------- 망령 ---------- */
export function wraith(c, a) {
  const k = a.look, p = a.st, f = a.face, s = k.s * (a.scale ?? 1);
  const bob = Math.sin(a.t * 1.8 + a.seed) * 3, x = a.x + f * (p.lunge ?? 0) * 16 * s, top = a.y - 62 * s + bob - (p.rear ?? 0) * 6;
  c.save(); c.globalAlpha *= 0.86;
  c.fillStyle = k.body; c.beginPath(); c.moveTo(x, top);
  c.bezierCurveTo(x + 14 * s, top + 4 * s, x + 14 * s, top + 30 * s, x + 18 * s, a.y - 6 + bob);
  for (let i = 0; i <= 6; i++) { const xx = x + (18 - i * 6) * s, w = Math.sin(a.t * 4 + i * 1.3 + a.seed) * 3; c.lineTo(xx, a.y - (i % 2 ? 2 : 10) * s + bob + w); }
  c.bezierCurveTo(x - 14 * s, top + 30 * s, x - 14 * s, top + 4 * s, x, top); c.fill();
  // 뻗은 팔
  c.strokeStyle = k.body; c.lineCap = 'round'; c.lineWidth = 4 * s; c.beginPath(); c.moveTo(x + f * 6 * s, top + 22 * s); c.quadraticCurveTo(x + f * 20 * s, top + (22 - (p.lunge ?? 0) * 6) * s, x + f * (24 + (p.lunge ?? 0) * 10) * s, top + (30 - (p.lunge ?? 0) * 8) * s); c.stroke();
  c.restore();
  orb(c, x + f * 3 * s, top + 11 * s, 9 * s, k.eye, 0.5);
  c.fillStyle = k.eye; c.beginPath(); c.arc(x + f * 1 * s, top + 11 * s, 1.2, 0, 6.3); c.arc(x + f * 5.5 * s, top + 11 * s, 1.2, 0, 6.3); c.fill();
  a.tip = [x + f * 30 * s, top + 26 * s]; a.chest = [x, top + 30 * s]; a.head = [x, top + 10 * s];
}

export function drawActor(c, a) {
  if (a.st.alpha <= 0.01) return;
  c.save(); c.globalAlpha = clamp(a.st.alpha);
  // 발밑 그림자
  c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.ellipse(a.x, a.y + 1.5, 15 * a.look.s * (1 + a.st.fall * 0.8), 3.2, 0, 0, 6.3); c.fill();
  const fl = a.st.fall;
  if (fl > 0.001) {
    c.translate(a.x, a.y);
    if (a.look.form === 'human') c.rotate(-a.face * rad(fl * 86)); // 사람은 뒤로 넘어간다
    else if (a.look.form === 'wraith') { c.globalAlpha *= 1 - fl; c.scale(1 - fl * 0.3, 1 + fl * 0.3); } // 망령은 흩어진다
    else { c.rotate(a.face * rad(fl * 10)); c.scale(1, 1 - fl * 0.5); } // 짐승은 옆으로 눕는다
    c.translate(-a.x, -a.y + fl * 3);
  }
  ({ human, beast, spider, wraith })[a.look.form](c, a);
  c.restore();
}

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
    c.globalAlpha *= fade ** 1.4; c.fillStyle = e.color ?? '#f2ead8';
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
  } else if (e.type === 'blood') {
    const tt = k * e.life, x = e.x + e.vx * tt, y = Math.min(GY + 1, e.y + e.vy * tt + 300 * tt * tt);
    c.save(); c.globalAlpha *= clamp(fade * 2); c.fillStyle = '#5a1418'; c.beginPath(); c.arc(x, y, e.r, 0, 6.3); c.fill(); c.restore();
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
  } else if (e.type === 'ward') { // 결계: 반투명한 둥근 막
    const a = Math.sin(clamp(k) * Math.PI) ** 0.6;
    c.save(); c.globalAlpha *= a * 0.9; c.strokeStyle = e.color ?? '#a8d0ff'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(e.x, e.y, e.r, -1.3, 1.3); c.stroke(); c.globalAlpha *= 0.5; c.beginPath(); c.arc(e.x - e.f * 3, e.y, e.r * 0.86, -1.1, 1.1); c.stroke();
    c.restore(); orb(c, e.x + e.r * 0.8, e.y, e.r * 1.1, e.color ?? '#a8d0ff', a * 0.3);
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
