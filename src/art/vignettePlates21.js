// 42단계 삽화: 마법 계열(불·물·바람·흙·빛·그림자·생명·정신), 마력 폭주, 주문 짓는 책상,
// 그리고 다른 종족 집안의 어린 시절(엘프 셋, 드워프 셋, 수인 부족 셋, 반엘프 마을, 뿔을 감추는 반마족 집).
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, road, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, crowd, lying, tree, banner, crows, finish } from './vignetteKit.js';
import { horseSil, cottage, dogSil } from './vignettePlates4.js';
import { spear, wagon } from './vignettePlates5.js';
import { facade, table } from './vignettePlates18.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const bend = (ctx, a, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 2; i + 3 < a.length; i += 4) ctx.quadraticCurveTo(a[i], a[i + 1], a[i + 2], a[i + 3]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const ring = (ctx, x, y, rx, ry, w, c, rot = 0, a0 = 0, a1 = TAU) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, a0, a1); ctx.stroke(); };
const lit = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
const WARM = 'rgba(255,190,110,.55)', COLD = 'rgba(190,210,240,.45)', FIRE = 'rgba(255,150,70,.6)', GREEN = 'rgba(190,230,150,.5)', VIOLET = 'rgba(200,170,255,.5)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const mage = (v, o = {}) => mine(v, { robe: true, ...o });
const kid = (v, o = {}) => mine(v, { child: true, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const robed = (i, o = {}) => ({ cloth: ['#2f3a5a', '#3a3050', '#34404a'][i % 3], hair: HR[i % 6], robe: true, ...o });

// ───────── 종족 도우미: 사람 그림 위에 귀·꼬리·뿔·수염을 얹는다 ─────────
export const headOf = (x, y, h, o) => { const s = h / 100, drop = o.pose === 'kneel' ? 24 : o.pose === 'sit' ? 20 : 0; return o.child ? { s, hy: y - (95.6 - drop) * s, r: 9.6 * s, drop } : { s, hy: y - (93.2 - drop) * s, r: 7.2 * s, drop }; };
/** 엘프: 조금 가늘고, 머리칼 밖으로 나온 긴 귀. o.ear로 귀 길이(반엘프는 0.6쯤) */
export function elf(v, x, y, h, o = {}) {
  const { ctx } = v, skin = o.skin ?? '#dcc6a8', tone = (c) => (o.raw ? c : v.t(c));
  ctx.save(); ctx.translate(x, y); ctx.scale(o.thin ?? 0.9, 1); ctx.translate(-x, -y); person(v, x, y, h, { long: true, skin, ...o }); ctx.restore();
  const { hy, r } = headOf(x, y, h, o), f = o.f ?? 0, len = (o.ear ?? 1) * r * 1.05;
  for (const k of f ? [-f] : [-1, 1]) { const ex = x + k * r * (f ? 0.35 : 0.8); poly(ctx, [ex - k * r * 0.3, hy - r * 0.15, ex, hy + r * 0.5, ex + k * len, hy - len * 0.5], tone(dark(skin, 0.1))); }
}
const FUR = { wolf: '#6e6c70', tiger: '#b4722e', hawk: '#5a4630' };
/** 수인: 머리 위 귀와 꼬리(늑대·호랑이), 매 부족은 깃 장식과 깃 망토 */
export function beastman(v, x, y, h, kind, o = {}) {
  const { ctx } = v, tone = (c) => (o.raw ? c : v.t(c)), fur = o.hair ?? FUR[kind], f = o.f ?? 0, hd = headOf(x, y, h, o), { s, hy, r, drop } = hd, d = -(f || 1), c = tone(fur), dk = tone(dark(fur, 0.45));
  if (kind !== 'hawk' && o.pose !== 'sit') {
    const ty = y - (47 - drop) * s, w = (kind === 'wolf' ? 5.4 : 2.8) * s;
    bend(ctx, [x + d * 3 * s, ty, x + d * 15 * s, ty + 9 * s, x + d * 19 * s, ty - 6 * s], w, c);
    oval(ctx, x + d * 19 * s, ty - 6 * s, 2.6 * s, 2.6 * s, tone(kind === 'tiger' ? '#2a1c12' : '#c8c4bc'));
  }
  if (kind === 'hawk') poly(ctx, [x - 10 * s, y - (78 - drop) * s, x + 10 * s, y - (78 - drop) * s, x + 14 * s, y - (40 - drop) * s, x + 6 * s, y - (34 - drop) * s, x, y - (40 - drop) * s, x - 6 * s, y - (34 - drop) * s, x - 14 * s, y - (40 - drop) * s], tone(dark(fur, 0.2)));
  person(v, x, y, h, { skin: '#b08a64', hair: fur, ...o });
  if (kind === 'hawk') { for (let i = 0; i < 3; i++) stroke(ctx, [x + d * r * 0.5, hy - r * (0.5 - i * 0.35), x + d * r * 1.5, hy - r * (0.2 - i * 0.4)], 1.4 * s, i === 1 ? tone('#d8d0bc') : c); return; }
  for (const k of [-1, 1]) {
    const ex = x + k * r * 0.62 + f * r * 0.1;
    if (kind === 'wolf') { poly(ctx, [ex - r * 0.36, hy - r * 0.62, ex + r * 0.36, hy - r * 0.62, ex + k * r * 0.2, hy - r * 1.7], c); poly(ctx, [ex - r * 0.14, hy - r * 0.74, ex + r * 0.14, hy - r * 0.74, ex + k * r * 0.14, hy - r * 1.3], dk); }
    else { const tx = x + k * r * 0.5 + f * r * 0.1; oval(ctx, tx, hy - r * 0.92, r * 0.3, r * 0.3, c); oval(ctx, tx, hy - r * 0.9, r * 0.13, r * 0.13, dk); }
  }
}
/** 반마족: 잿빛 도는 살갗과 이마 위 작은 뿔 */
function hornkin(v, x, y, h, o = {}) {
  const { ctx } = v, tone = (c) => (o.raw ? c : v.t(c));
  person(v, x, y, h, { skin: '#a89aa4', hair: '#1c1820', ...o });
  const { hy, r } = headOf(x, y, h, o), f = o.f ?? 0, c = tone(o.horn ?? '#3a2a2e');
  if (!o.hideHorn) for (const k of [-1, 1]) { const bx = x + k * r * 0.5 + f * r * 0.2; stroke(ctx, [bx, hy - r * 0.78, bx + k * r * 0.26, hy - r * 1.3, bx + k * r * 0.1, hy - r * 1.66], r * 0.3, c); }
}
/** 드워프: 낮고 떡 벌어진 몸, 땋은 수염. h는 사람 키 기준으로 넣는다 */
export function dwarf(v, x, y, h, o = {}) {
  const { ctx } = v, tone = (c) => (o.raw ? c : v.t(c)), hh = h * (o.child ? 0.8 : 0.74);
  ctx.save(); ctx.translate(x, y); ctx.scale(1.34, 1); ctx.translate(-x, -y);
  person(v, x, y, hh, { skin: '#c49a78', ...o });
  const { hy, r } = headOf(x, y, hh, o), f = o.f ?? 0;
  if (!o.child && !o.female && (o.f !== 0)) { const bc = tone(o.beard ?? o.hair ?? '#6a4a2a'); poly(ctx, [x - r * 0.5 + f * r * 0.45, hy + r * 0.5, x + r * 0.6 + f * r * 0.45, hy + r * 0.5, x + f * r * 0.95, hy + r * 2.5, x + f * r * 0.3, hy + r * 3], bc); stroke(ctx, [x + f * r * 0.5, hy + r * 1.7, x + f * r * 0.8, hy + r * 1.9], r * 0.16, tone('#9a8450')); }
  ctx.restore();
}
const pack = (v, x, y, s, c = '#5a4a36') => { const { ctx, t } = v; rect(ctx, x - 7 * s, y - 12 * s, 14 * s, 16 * s, t(c)); rect(ctx, x - 8 * s, y - 15 * s, 16 * s, 4 * s, t(dark(c, 0.2))); };
/** 가죽 덮은 긴 집: 휜 나무 갈비 위에 가죽을 기워 덮고 돌로 눌렀다. 낮고 길다 */
function hideHall(v, x, y, w, h, c = '#7a6248') {
  const { ctx, t } = v;
  ctx.fillStyle = t(c); ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w / 2, y - h * 1.3, x + w / 2, y - h * 1.3, x + w / 2, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = t(dark(c, 0.28)); ctx.beginPath(); ctx.moveTo(x + w * 0.16, y); ctx.bezierCurveTo(x + w * 0.2, y - h * 0.9, x + w / 2, y - h * 1.1, x + w / 2, y); ctx.closePath(); ctx.fill();
  for (let i = 1; i < 6; i++) { const u = i / 6, px = x - w / 2 + w * u, top = y - h * 0.98 * Math.sin(Math.PI * u) ** 0.6; stroke(ctx, [px, y, px + (u - 0.5) * 4, top], 0.8, t(dark(c, 0.36))); }
  for (let i = 0; i < 5; i++) stroke(ctx, [x - w * 0.36 + i * w * 0.15, y - h * 0.5 - (i % 2) * 4, x - w * 0.3 + i * w * 0.15, y - h * 0.46 - (i % 2) * 4], 0.6, t('#c8b890'));
  ctx.fillStyle = t('#1c1612'); ctx.beginPath(); ctx.moveTo(x - w * 0.2, y); ctx.lineTo(x - w * 0.2, y - h * 0.4); ctx.quadraticCurveTo(x - w * 0.12, y - h * 0.56, x - w * 0.04, y - h * 0.4); ctx.lineTo(x - w * 0.04, y); ctx.fill();
  for (let i = 0; i < 7; i++) oval(ctx, x - w / 2 + 4 + i * (w - 8) / 6, y - 1, 4, 2.4, t('#5e5a54'));
}
/** 부족의 돌 표지: 세운 선돌에 짐승 머리뼈와 뿔, 색 바랜 긴 띠 */
function clanStone(v, x, y, h, kind) {
  const { ctx, t } = v, bone = t('#d0c8b0');
  poly(ctx, [x - 11, y, x - 8, y - h * 0.7, x - 3, y - h, x + 6, y - h * 0.94, x + 10, y - h * 0.5, x + 12, y], t('#5e5a54')); poly(ctx, [x + 2, y, x + 1, y - h * 0.96, x + 6, y - h * 0.94, x + 10, y - h * 0.5, x + 12, y], t('#45423e'));
  for (let i = 0; i < 4; i++) stroke(ctx, kind === 'tiger' ? [x - 7, y - h * (0.2 + i * 0.1), x - 1, y - h * (0.24 + i * 0.1)] : kind === 'hawk' ? [x - 6, y - h * (0.2 + i * 0.1), x - 3, y - h * (0.25 + i * 0.1), x, y - h * (0.2 + i * 0.1)] : [x - 4, y - h * (0.18 + i * 0.1), x - 4, y - h * (0.24 + i * 0.1)], 1, t('#2a2622'));
  for (let i = 0; i < 5; i++) oval(ctx, x - 14 + i * 7, y + 1, 4.6, 2.6, t('#55514c'));
  const sy = y - h * 0.66;
  if (kind === 'hawk') { for (const k of [-1, 1]) for (let i = 0; i < 4; i++) stroke(ctx, [x + k * 2, sy - 4, x + k * (10 + i * 4), sy - 12 + i * 5], 1.3, t(i % 2 ? '#5a4630' : '#8a7a5a')); oval(ctx, x, sy, 3.6, 4.4, bone); poly(ctx, [x - 1.6, sy + 2, x + 1.6, sy + 2, x, sy + 8], bone); }
  else { poly(ctx, [x - 5, sy - 5, x + 5, sy - 5, x + 3.4, sy + 3, x + 1.6, sy + 9, x - 1.6, sy + 9, x - 3.4, sy + 3], bone); oval(ctx, x - 2.2, sy - 1, 1.2, 1.5, t('#1c1612')); oval(ctx, x + 2.2, sy - 1, 1.2, 1.5, t('#1c1612')); if (kind === 'wolf') for (const k of [-1, 1]) bend(ctx, [x + k * 5, sy - 4, x + k * 16, sy - 6, x + k * 15, sy - 20], 1.8, bone); else for (const k of [-1, 1]) for (let i = 0; i < 3; i++) stroke(ctx, [x + k * 6, sy + 10 + i * 5, x + k * 8, sy + 15 + i * 5], 1.4, bone); }
  stroke(ctx, [x + 14, y, x + 16, y - h * 1.25], 1.4, t('#2a2018'));
  const bc = t(kind === 'wolf' ? '#4a5a6a' : kind === 'tiger' ? '#8a3a22' : '#b8a060'); ctx.fillStyle = bc; ctx.beginPath(); ctx.moveTo(x + 16, y - h * 1.25); ctx.quadraticCurveTo(x + 30, y - h * 1.2, x + 44, y - h * 1.28); ctx.lineTo(x + 40, y - h * 1.2); ctx.lineTo(x + 46, y - h * 1.14); ctx.quadraticCurveTo(x + 30, y - h * 1.08, x + 16, y - h * 1.12); ctx.fill();
}
/** 책 꽂힌 선반 */
export function shelf(ctx, x, y, w, rows, seed) {
  rect(ctx, x - 3, y - 3, w + 6, rows * 26 + 6, '#241c16');
  for (let r = 0; r < rows; r++) { rect(ctx, x, y + r * 26, w, 23, '#15110e'); let bx = x + 2; for (let i = 0; bx < x + w - 6; i++) { const bw = 3 + hash(i, seed + r) * 4, bh = 14 + hash(i, seed + r + 9) * 7; rect(ctx, bx, y + r * 26 + 23 - bh, bw, bh, ['#5a2e28', '#2e3e52', '#4a4a30', '#3e2e4a', '#6a5a3a'][Math.floor(hash(i, seed + r + 5) * 5)]); bx += bw + 0.8; } }
}
const book = (ctx, x, y, w) => { poly(ctx, [x - w, y, x, y + 2, x + w, y, x + w - 2, y - w * 0.36, x, y - w * 0.3, x - w + 2, y - w * 0.36], '#d8ceb0'); stroke(ctx, [x, y + 2, x, y - w * 0.3], 0.8, '#6a5a40'); for (let i = 0; i < 3; i++) { stroke(ctx, [x - w + 5, y - 3 - i * 3, x - 4, y - 2 - i * 3], 0.5, '#5a4e3e'); stroke(ctx, [x + 4, y - 2 - i * 3, x + w - 5, y - 3 - i * 3], 0.5, '#5a4e3e'); } };

// ───────── 마법 계열 ─────────
/** 불: 해 질 녘 탑 뒤뜰의 수련. 손끝에서 뻗은 불줄기가 그을린 돌기둥의 허수아비를 삼킨다 */
function spFire(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => Math.max(fn(x), 150) + 26; ground(v, g, { color: '#5e5a44', color2: '#3a3a2c', tufts: 30 });
  // 뜰의 담과 탑 밑동
  rect(ctx, 0, 96, VW, 78, t('#4a4640')); for (let i = 0; i < 16; i++) rect(ctx, i * 42, 90, 24, 8, t('#4a4640')); rect(ctx, 0, 0, 96, 176, t('#3a3632')); rect(ctx, 40, 60, 16, 30, t('#15110e')); glow(v, 48, 74, 20, '#ffcf80', 0.2);
  // 그을린 바닥과 불빛
  for (let i = 0; i < 5; i++) oval(ctx, 300 + i * 44, 206 + (i % 2) * 5, 30, 4, 'rgba(14,10,8,.3)'); pool(v, 360, 218, 190, 14, '#ff9a48', 0.14);
  // 돌기둥과 타는 허수아비
  rect(ctx, 486, 120, 22, 108, t('#3a3430')); rect(ctx, 480, 222, 34, 8, t('#2e2a26')); stroke(ctx, [470, 150, 524, 150], 4, '#2a1c12'); oval(ctx, 497, 132, 9, 10, '#3a2a18');
  glow(v, 497, 150, 70, '#ff8a3a', 0.2); for (const [x, y, s] of [[497, 126, 12], [480, 146, 9], [514, 148, 9], [497, 168, 8]]) flame(v, x, y, s); smoke(v, 500, 110, 90, 40, '#2a2622', 0.3);
  // 불줄기
  lit(ctx, () => { bend(ctx, [236, 162, 320, 138, 400, 154, 450, 146, 482, 148], 20, 'rgba(255,110,40,.16)'); bend(ctx, [236, 162, 320, 142, 400, 154, 450, 148, 482, 148], 9, 'rgba(255,160,70,.4)'); bend(ctx, [236, 162, 320, 146, 400, 154, 450, 149, 482, 148], 3, 'rgba(255,236,190,.85)'); });
  for (let i = 0; i < 26; i++) oval(ctx, 300 + hash(i, 3) * 230, 96 + hash(i, 4) * 70, 1, 1, `rgba(255,${170 + Math.floor(hash(i, 5) * 60)},90,${0.4 + hash(i, 6) * 0.5})`);
  // 스승과 물통, 얼굴을 가리는 수련생들
  person(v, 96, 236, 110, robed(0, { f: 1, old: true, hair: '#a8a49c', stick: 'staff', rim: FIRE, rimDir: 1 }));
  for (const x of [146, 166]) { poly(ctx, [x - 7, 222, x + 7, 222, x + 6, 236, x - 6, 236], t('#4a3a2a')); oval(ctx, x, 222, 7, 2, t('#6a7a8a')); }
  person(v, 574, 236, 98, robed(1, { f: -1, arm: 'chest', rim: FIRE, rimDir: -1 })); person(v, 612, 238, 92, robed(2, { f: -1, arm: 'up', female: true, long: true, rim: FIRE, rimDir: -1 }));
  // 나
  person(v, 214, 236, 112, mage(v, { f: 1, arm: 'fwd', rim: FIRE, rimDir: 1 })); glow(v, 238, 162, 16, '#ffd08a', 0.24);
  finish(v, { noLeaves: true });
}
/** 물: 갈라진 밭가의 못에서 물기둥이 하늘로 감겨 올라가 먹구름이 되고, 밭에 비가 긋기 시작한다 */
function spWater(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 120, 150, {}); const g = (x) => Math.max(fn(x), 146) + 28; ground(v, g, { color: '#8a7c52', color2: '#5a5038', plain: true });
  // 갈라진 흙과 마른 이랑
  for (let i = 0; i < 9; i++) stroke(ctx, [0, 184 + i * 7, VW, 180 + i * 7.6], 0.7, rgba(t('#4a4030'), 0.4)); for (let i = 0; i < 22; i++) { const x = hash(i, 2) * VW, y = 190 + hash(i, 3) * 46; stroke(ctx, [x, y, x + 8, y + 3, x + 5, y + 8], 0.7, rgba(t('#3a3024'), 0.5)); }
  // 못
  oval(ctx, 420, 204, 60, 9, t('#3a4652')); oval(ctx, 420, 203, 52, 6, t('#6a7e92'));
  // 먹구름과 빗줄기
  for (const [x, y, rx, ry] of [[470, 30, 120, 26], [560, 44, 100, 22], [390, 48, 70, 18], [520, 16, 90, 18], [440, 52, 50, 14], [610, 58, 60, 14], [500, 56, 60, 12], [340, 36, 50, 12]]) oval(ctx, x, y, rx, ry, 'rgba(38,46,60,.4)');
  for (let i = 0; i < 70; i++) { const x = 400 + hash(i, 7) * 250, y = 60 + hash(i, 8) * 150; stroke(ctx, [x, y, x - 4, y + 14], 0.8, 'rgba(200,220,240,.38)'); }
  // 감겨 오르는 물기둥
  lit(ctx, () => { for (const k of [0, 1]) { ctx.strokeStyle = k ? 'rgba(220,240,255,.7)' : 'rgba(120,170,220,.3)'; ctx.lineWidth = k ? 1.6 : 9; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, x = 420 + u * 44 + Math.sin(u * 13 + k * 3.14) * (14 - u * 6), y = 200 - u * 156; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } });
  glow(v, 420, 198, 40, '#a8d0f0', 0.16); for (let i = 0; i < 12; i++) oval(ctx, 392 + hash(i, 11) * 60, 150 + hash(i, 12) * 50, 1.2, 1.8, 'rgba(210,230,250,.7)');
  // 비를 맞는 농부들
  person(v, 520, 234, 96, folk(0, { f: -1, pose: 'kneel', arm: 'up', hat: true })); person(v, 572, 236, 100, folk(1, { f: -1, arm: 'up' })); person(v, 606, 238, 56, folk(2, { f: -1, child: true, arm: 'up' }));
  person(v, 96, 236, 100, folk(4, { f: 1, old: true, stick: 'staff' })); poly(ctx, [130, 224, 150, 224, 148, 238, 132, 238], t('#4a3a2a'));
  // 나
  person(v, 318, 236, 112, mage(v, { f: 1, arm: 'up', stick: 'staff', cloak: true, rim: COLD, rimDir: 1 }));
  finish(v, { noLeaves: true });
}
/** 바람: 고갯마루에서 일으킨 돌풍. 나무가 눕고 창 든 무리가 밀려난다 */
function spWind(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); const g = (x) => 176 - Math.sin((x + 60) / 200) * 22 + (x > 380 ? (x - 380) * 0.06 : 0); ground(v, g, { color: '#6a7250', color2: '#444a34', tufts: 60 });
  tree(v, 420, g(420) + 6, 120, { lean: 0.55 }); tree(v, 600, g(600) + 6, 100, { lean: 0.7, bare: true }); tree(v, 60, g(60) + 4, 110, { lean: 0.2 });
  // 밀려나는 무리와 찢기는 깃발
  for (const [x, i] of [[470, 0], [520, 1], [566, 2]]) { person(v, x, 234 + i * 2, 98 + i * 3, { f: -1, pose: i === 1 ? 'kneel' : 'bow', cloth: ['#4a3a34', '#3a3e44', '#54463a'][i], hair: HR[i], hat: i !== 1, cloak: i === 0 }); spear(v, x + 16, 236, 96, 0.5 + i * 0.16); }
  stroke(ctx, [600, 236, 616, 130], 2, t('#2a2018')); poly(ctx, [616, 132, 640, 122, 632, 138, 640, 150, 618, 152], t('#6a2a2a'));
  // 바람결: 길게 휘는 줄과 소용돌이, 날리는 잎과 모자
  for (let i = 0; i < 9; i++) { const y = 60 + i * 19, x0 = 230 + hash(i, 3) * 40; bend(ctx, [x0, y + 30, x0 + 120, y - 6, x0 + 230, y + 8, x0 + 300, y + 22, x0 + 380 + hash(i, 4) * 40, y - 4], 1 + hash(i, 5) * 1.6, `rgba(232,238,240,${0.2 + hash(i, 6) * 0.25})`); }
  for (const [x, y, r] of [[400, 96, 16], [520, 150, 12]]) { ring(ctx, x, y, r, r * 0.7, 1.2, 'rgba(232,238,240,.4)', 0, 0.6, 5.4); ring(ctx, x, y, r * 0.5, r * 0.36, 1, 'rgba(232,238,240,.4)', 0, 2, 7); }
  for (let i = 0; i < 34; i++) oval(ctx, 280 + hash(i, 8) * 350, 60 + hash(i, 9) * 160, 2.4, 1, t(i % 3 ? '#6a7a3a' : '#9a7a3a'), hash(i, 10) * 3);
  oval(ctx, 548, 96, 9, 2.6, t('#3a2c20'), -0.4); oval(ctx, 548, 93, 5, 3.4, t('#3a2c20'), -0.4);
  // 나: 망토가 뒤로 날린다
  poly(ctx, [236, 150, 170, 168, 150, 200, 186, 190, 228, 200], t(dark(v.me.cloth, 0.3)));
  person(v, 246, 234, 114, mage(v, { f: 1, arm: 'fwd', rim: COLD, rimDir: -1 })); person(v, 150, 238, 96, folk(3, { f: 1, pose: 'kneel', arm: 'chest' }));
  finish(v, { noLeaves: true });
}
/** 흙: 땅에 손을 짚자 갈라진 틈을 따라 돌벽이 솟아 달려오던 기병을 막는다 */
function spEarth(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); const g = (x) => Math.max(fn(x), 150) + 26; ground(v, g, { color: '#77724e', color2: '#4a4834', tufts: 40 });
  // 벽 너머의 기병: 앞발을 든 말과 먼지
  smoke(v, 560, 200, 80, 90, '#b0a488', 0.3);
  for (const [x, y, h, i] of [[540, 226, 92, 0], [604, 220, 80, 1]]) { person(v, x + 4, y - h * 0.5, h * 0.9, { f: -1, cloth: '#4a3a34', hair: '#1c1614', hat: true, arm: 'up', noShadow: true }); ctx.save(); ctx.translate(x, y); ctx.rotate(0.3 - i * 0.12); horseSil(v, 0, 0, h, -1, i ? '#3a2c22' : '#5a3a24', {}); ctx.restore(); spear(v, x + 16, y - h * 0.6, 80, -0.4); }
  // 솟은 돌판들
  for (const [x, h, w, lean, i] of [[352, 86, 40, -0.1, 0], [396, 118, 46, 0.04, 1], [444, 100, 42, 0.12, 2], [488, 70, 36, 0.22, 3], [316, 52, 30, -0.24, 4]]) {
    ctx.save(); ctx.translate(x, 232); ctx.rotate(lean);
    poly(ctx, [-w / 2, 0, -w / 2 + 4, -h + 10, -w * 0.1, -h, w / 2 - 6, -h + 14, w / 2, 0], t('#6e675c')); poly(ctx, [w * 0.1, 0, -w * 0.1, -h, w / 2 - 6, -h + 14, w / 2, 0], t('#4e4840'));
    for (let j = 0; j < 4; j++) stroke(ctx, [-w / 2 + 6 + hash(j, i) * w * 0.5, -h * (0.2 + j * 0.18), -w / 2 + 14 + hash(j, i + 4) * w * 0.5, -h * (0.26 + j * 0.18)], 0.8, rgba(t('#2e2a26'), 0.6));
    ctx.restore(); oval(ctx, x, 233, w * 0.7, 5, t('#3e382e')); smoke(v, x, 228, 26, 30, '#b0a488', 0.22);
  }
  // 땅의 금: 손에서 벽으로
  for (const p of [[196, 232, 240, 226, 280, 234, 330, 230], [196, 234, 250, 238, 300, 240], [196, 230, 236, 220, 270, 222, 300, 214]]) stroke(ctx, p, 1.6, rgba(t('#1c1814'), 0.75));
  for (let i = 0; i < 10; i++) poly(ctx, [220 + i * 12, 220 - hash(i, 3) * 24, 224 + i * 12, 217 - hash(i, 3) * 24, 226 + i * 12, 222 - hash(i, 3) * 24], t('#5a544a'));
  // 뒤의 마을 사람들
  person(v, 60, 236, 96, folk(1, { f: 1, arm: 'chest' })); person(v, 96, 238, 58, folk(2, { f: 1, child: true })); person(v, 26, 238, 100, folk(4, { f: 1, stick: 'spear' }));
  // 나
  person(v, 168, 238, 112, mage(v, { f: 1, pose: 'kneel', arm: 'fwd', rim: WARM, rimDir: -1 })); glow(v, 196, 230, 22, '#d8b070', 0.2);
  finish(v, { noLeaves: true });
}
/** 빛: 밤의 외딴 마을 위에 친 결계. 지팡이 끝의 빛에서 엷은 금빛 둥근 막이 내려오고, 밖에는 눈들이 떠 있다 */
function spLight(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => Math.max(fn(x), 150) + 30; ground(v, g, { color: '#3e4a44', color2: '#26302c', tufts: 30 });
  for (const x of [20, 70, 590, 630]) tree(v, x, 214, 130, { dark: true });
  cottage(v, 228, 208, 86, 52, {}); cottage(v, 420, 204, 96, 56, {}); cottage(v, 326, 196, 60, 40, {});
  rect(ctx, 214, 180, 10, 12, '#e8b060'); rect(ctx, 432, 174, 10, 12, '#e8b060'); glow(v, 219, 186, 20, '#ffcf80', 0.2); glow(v, 437, 180, 20, '#ffcf80', 0.2);
  // 막 밖의 것들
  for (const [x, y, d] of [[44, 226, 1], [104, 212, 1], [596, 224, -1], [548, 208, -1]]) { dogSil(v, x, y, 44, d, '#0c0a0e', {}); for (const k of [0, 1]) oval(ctx, x + d * (13 + k * 4), y - 31, 1.2, 1, 'rgba(230,90,70,.9)'); }
  // 둥근 막
  lit(ctx, () => {
    ctx.fillStyle = 'rgba(255,236,180,.045)'; ctx.beginPath(); ctx.ellipse(320, 240, 200, 196, 0, Math.PI, TAU); ctx.fill();
    ring(ctx, 320, 240, 200, 196, 5, 'rgba(255,224,150,.1)', 0, Math.PI, TAU); ring(ctx, 320, 240, 200, 196, 1.4, 'rgba(255,240,200,.6)', 0, Math.PI, TAU);
    for (let i = 1; i < 16; i++) { const a = Math.PI + (i / 16) * Math.PI, x = 320 + Math.cos(a) * 200, y = 240 + Math.sin(a) * 196; stroke(ctx, [x, y, 320 + Math.cos(a) * 190, 240 + Math.sin(a) * 186], 1, 'rgba(255,240,200,.5)'); }
    for (const k of [-1, 1]) bend(ctx, [320, 44, 320 + k * 90, 100, 320 + k * 110, 240], 0.7, 'rgba(255,236,180,.2)');
    stroke(ctx, [334, 134, 320, 44], 0.9, 'rgba(255,240,200,.45)');
  });
  // 안쪽 사람들
  person(v, 196, 234, 84, folk(0, { f: 1, stick: 'torch' })); person(v, 232, 236, 80, folk(1, { f: 1, arm: 'chest' })); person(v, 256, 238, 48, folk(2, { f: 1, child: true })); person(v, 452, 236, 84, folk(4, { f: -1, stick: 'spear' }));
  // 나: 등 돌리고 지팡이를 들었다
  person(v, 322, 238, 112, mage(v, { f: 0, arm: 'up', cloak: true, rim: WARM, rimDir: 1 })); stroke(ctx, [336, 210, 334, 128], 2.2, '#2a2018'); oval(ctx, 334, 126, 4, 4, '#fff2cc'); glow(v, 334, 126, 46, '#ffe8a8', 0.24); glow(v, 334, 126, 12, '#fff6dc', 0.24);
  finish(v, { noLeaves: true });
}
/** 그림자: 촛불 하나 켠 방. 벽에 선 내 그림자가 천장까지 자라 손을 뻗고, 바닥의 그늘이 물러서는 사람의 발목을 감는다 */
function spShadow(v) {
  const { ctx } = v; room(v, { wall: '#5a4e42', floor: '#352c24', fy: 182 });
  rect(ctx, 0, 0, VW, 14, '#2a221c'); for (let i = 0; i < 5; i++) rect(ctx, 60 + i * 130, 14, 10, 170, 'rgba(30,24,20,.35)');
  // 탁자와 촛불
  table(ctx, 60, 170, 196, '#5a4634', 5, 40); candle(v, 120, 196, 10); glow(v, 120, 182, 110, '#ffcf80', 0.2); pool(v, 180, 226, 120, 10, '#ffcf80', 0.1); book(ctx, 90, 195, 14);
  // 벽의 큰 그림자: 내 모습보다 크고, 팔이 길다
  ctx.save(); ctx.globalAlpha = 0.62; ctx.translate(380, 236); ctx.scale(2.1, 2.1); person(v, 0, 0, 112, { raw: true, f: 1, arm: 'fwd', robe: true, cloth: '#0a080a', hair: '#0a080a', skin: '#0a080a', noShadow: true }); ctx.restore();
  for (let i = 0; i < 4; i++) bend(ctx, [428, 88 + i * 3, 480, 70 + i * 8, 520 + i * 6, 96 + i * 10, 540 + i * 5, 110 + i * 12, 552 - i * 3, 128 + i * 9], 3.4 - i * 0.4, 'rgba(10,8,10,.62)');
  // 바닥을 기는 그늘
  for (const p of [[270, 234, 340, 226, 420, 238, 500, 230, 548, 232], [270, 238, 360, 240, 440, 232, 520, 238, 556, 236], [270, 230, 330, 216, 400, 222, 470, 214, 540, 226]]) bend(ctx, p, 5, 'rgba(8,6,10,.6)');
  ring(ctx, 552, 230, 12, 4, 3, 'rgba(8,6,10,.7)'); ring(ctx, 566, 226, 10, 4, 3, 'rgba(8,6,10,.7)');
  // 물러서는 사람과 떨어뜨린 칼
  person(v, 560, 236, 106, { raw: true, f: -1, arm: 'up', cloth: '#4a3a34', hair: '#3a2a1e', cloak: true, rim: WARM, rimDir: -1 }); stroke(ctx, [500, 236, 530, 232], 1.6, '#9aa0a8'); stroke(ctx, [497, 234, 501, 238], 2, '#3a2c20');
  // 나
  person(v, 252, 236, 112, mage(v, { raw: true, f: 1, arm: 'fwd', cloth: dark(v.me.cloth, 0.35), rim: WARM, rimDir: -1 }));
  finish(v, { inside: true });
}
/** 생명: 병상 곁에 무릎 꿇고 얹은 손. 풀빛 도는 빛이 번지고 창턱의 시든 화분에 새순이 돋는다 */
function spLife(v) {
  const { ctx } = v; room(v, { wall: '#6a6052', floor: '#3e342a', fy: 180 });
  windowAt(v, 440, 40, 60, 80, { arch: true }); shaft(v, 470, 120, 60, 110, -110, '#e8e0c0', 0.12);
  // 창턱 화분: 반은 시들고 반은 새순
  rect(ctx, 432, 120, 76, 5, '#3a2c20'); poly(ctx, [452, 120, 474, 120, 471, 106, 455, 106], '#7a4a34'); stroke(ctx, [460, 106, 454, 92, 448, 94], 1, '#6a5a3a'); stroke(ctx, [466, 106, 470, 88], 1.1, '#5a8a3a'); oval(ctx, 473, 88, 4, 2, '#7ab04a', -0.6); oval(ctx, 467, 92, 3.4, 1.8, '#7ab04a', 0.6);
  // 벽의 말린 약초와 선반
  rect(ctx, 80, 70, 120, 4, '#3a2c20'); for (let i = 0; i < 6; i++) { stroke(ctx, [92 + i * 19, 74, 92 + i * 19, 86], 0.6, '#2a2018'); oval(ctx, 92 + i * 19, 92, 4, 8, ['#5a6a3a', '#7a6a3a', '#4a5a34'][i % 3]); }
  // 침상과 누운 사람
  rect(ctx, 262, 196, 230, 12, '#4a3a2a'); rect(ctx, 262, 208, 8, 26, '#3a2c20'); rect(ctx, 484, 208, 8, 26, '#3a2c20'); rect(ctx, 256, 170, 10, 64, '#3a2c20'); oval(ctx, 290, 192, 22, 7, '#c8c0a8');
  lying(v, 280, 196, 190, { raw: true, cover: '#8a8068', hair: '#3a2a1e' });
  // 번지는 빛과 가는 넝쿨 같은 줄
  glow(v, 340, 178, 80, '#c8e89a', 0.2); glow(v, 340, 180, 26, '#eaf6c8', 0.24);
  lit(ctx, () => { for (let i = 0; i < 6; i++) { const x1 = 300 + i * 26; bend(ctx, [338, 180, (338 + x1) / 2, 150 - (i % 2) * 14, x1 + 20, 186], 0.9, 'rgba(210,240,160,.5)'); oval(ctx, x1 + 20, 186, 2.6, 1.3, 'rgba(210,240,160,.6)', 0.5); } });
  // 지켜보는 식구와 늙은 의원
  person(v, 540, 236, 104, folk(1, { raw: true, f: -1, arm: 'chest', veil: true, rim: GREEN, rimDir: -1 })); person(v, 584, 238, 58, folk(2, { raw: true, f: -1, child: true })); person(v, 130, 236, 104, { raw: true, f: 1, old: true, cloth: '#4a4a3e', hair: '#a8a49c', stick: 'staff', hood: true });
  // 나
  person(v, 268, 238, 112, mage(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', rim: GREEN, rimDir: 1 }));
  finish(v, { inside: true });
}
/** 정신: 탁자를 사이에 둔 심문. 이마에서 이마로 가는 빛줄, 맞은편 사람의 등 뒤 벽에 그의 기억이 엷게 비친다 */
function spMind(v) {
  const { ctx } = v; room(v, { wall: '#45404a', floor: '#2a2630', fy: 182, stone: true });
  rect(ctx, 20, 60, 70, 124, '#141216'); for (let i = 0; i < 4; i++) rect(ctx, 26 + i * 16, 60, 3, 124, '#2e2a30'); person(v, 110, 236, 108, { raw: true, f: 1, cloth: '#3a3e48', hair: '#1c1614', hat: true, stick: 'spear' });
  // 벽에 비친 기억: 집과 여자와 아이, 불타는 지붕
  ctx.save(); ctx.globalAlpha = 0.24; const mc = '#c8b0ff';
  poly(ctx, [470, 150, 470, 112, 500, 90, 530, 112, 530, 150], mc); rect(ctx, 492, 126, 14, 24, '#45404a');
  person(v, 560, 152, 56, { raw: true, f: -1, cloth: mc, hair: mc, skin: mc, female: true, long: true, noShadow: true }); person(v, 584, 152, 32, { raw: true, f: -1, child: true, cloth: mc, hair: mc, skin: mc, noShadow: true });
  stroke(ctx, [600, 80, 612, 60, 606, 44], 1.4, mc); stroke(ctx, [446, 100, 438, 78], 1.2, mc); ring(ctx, 520, 110, 96, 62, 0.8, mc); ctx.restore(); glow(v, 520, 112, 90, '#a890e0', 0.1);
  // 맞은편: 묶인 사람, 풀린 눈
  person(v, 430, 238, 110, { raw: true, f: -1, pose: 'sit', cloth: '#5a5448', hair: '#3a2a1e', rim: VIOLET, rimDir: -1 }); rect(ctx, 438, 150, 6, 86, '#2a2018'); rect(ctx, 424, 146, 30, 5, '#2a2018');
  // 탁자와 촛불
  table(ctx, 270, 390, 196, '#32281e', 5, 40); candle(v, 330, 196, 9); glow(v, 330, 184, 70, '#ffcf80', 0.16); stroke(ctx, [398, 192, 412, 190], 2, '#5a5e66');
  // 나
  person(v, 232, 238, 112, mage(v, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: VIOLET, rimDir: 1 }));
  // 이마에서 이마로
  lit(ctx, () => { for (let i = 0; i < 4; i++) bend(ctx, [240, 156, 300 + i * 10, 120 + i * 9, 334, 150 - i * 4, 380 - i * 6, 172 - i * 12, 422, 150], i ? 0.8 : 2.4, i ? 'rgba(210,190,255,.55)' : 'rgba(150,120,230,.22)'); });
  glow(v, 422, 150, 22, '#c8b0ff', 0.24); glow(v, 240, 156, 14, '#c8b0ff', 0.2);
  // 받아 적는 서기
  person(v, 600, 238, 100, robed(1, { raw: true, f: -1, pose: 'sit', arm: 'fwd', hood: true })); poly(ctx, [556, 190, 580, 188, 582, 198, 558, 200], '#d8ceb0');
  finish(v, { inside: true });
}
/** 폭주: 탑의 방. 손에서 터진 빛이 방을 찢고 종이와 책이 날린다. 창이 깨지고 제자가 벽으로 밀려났다 */
function spSurge(v) {
  const { ctx } = v; room(v, { wall: '#3a3642', floor: '#221f28', fy: 182, stone: true });
  shelf(ctx, 30, 40, 110, 5, 3); windowAt(v, 520, 36, 56, 86, { arch: true });
  for (const p of [[530, 60, 548, 84, 536, 96], [560, 50, 552, 80, 566, 104], [548, 84, 570, 76]]) stroke(ctx, p, 1, 'rgba(230,236,255,.7)'); for (let i = 0; i < 9; i++) poly(ctx, [470 + hash(i, 2) * 60, 110 + hash(i, 3) * 90, 476 + hash(i, 2) * 60, 106 + hash(i, 3) * 90, 474 + hash(i, 2) * 60, 114 + hash(i, 3) * 90], 'rgba(220,230,250,.7)');
  // 엎어진 책상과 떨어지는 책
  poly(ctx, [150, 236, 240, 236, 250, 176, 240, 170, 150, 228], '#3a2c20'); rect(ctx, 150, 226, 6, 12, '#2a2018');
  for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(120 + i * 22, 150 + hash(i, 5) * 60); ctx.rotate(hash(i, 6) * 3); rect(ctx, -7, -5, 14, 10, ['#5a2e28', '#2e3e52', '#4a4a30'][i % 3]); rect(ctx, -6, -4, 12, 2, '#d8ceb0'); ctx.restore(); }
  // 바닥의 금과 분필 원
  ring(ctx, 320, 222, 120, 16, 1.4, 'rgba(220,220,230,.4)'); ring(ctx, 320, 222, 96, 12, 0.8, 'rgba(220,220,230,.3)');
  for (let i = 0; i < 9; i++) { const a = 0.2 + i * 0.36, r = 90 + hash(i, 7) * 130; stroke(ctx, [320, 224, 320 + Math.cos(a) * r * 0.5, 224 + Math.sin(a) * 8 + (hash(i, 8) - 0.5) * 10, 320 + Math.cos(a) * r, 226 + Math.sin(a) * 12], 1.6, 'rgba(8,6,12,.75)'); }
  // 터진 빛
  glow(v, 320, 140, 170, '#a8b4ff', 0.2); glow(v, 320, 140, 60, '#e8e8ff', 0.24);
  lit(ctx, () => { for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU + hash(i, 9) * 0.2, r0 = 16, r1 = 70 + hash(i, 10) * 190, mx = 320 + Math.cos(a + 0.12) * r1 * 0.5, my = 140 + Math.sin(a + 0.12) * r1 * 0.34; stroke(ctx, [320 + Math.cos(a) * r0, 140 + Math.sin(a) * r0 * 0.7, mx, my, 320 + Math.cos(a - 0.05) * r1, 140 + Math.sin(a - 0.05) * r1 * 0.66], 0.8 + hash(i, 11) * 1.8, `rgba(${170 + Math.floor(hash(i, 12) * 60)},180,255,${0.3 + hash(i, 13) * 0.4})`); } });
  // 날리는 종이
  for (let i = 0; i < 16; i++) { ctx.save(); ctx.translate(180 + hash(i, 14) * 300, 30 + hash(i, 15) * 150); ctx.rotate(hash(i, 16) * 3); rect(ctx, -6, -4, 12, 8, 'rgba(226,218,196,.9)'); ctx.restore(); }
  // 밀려난 제자
  person(v, 596, 238, 96, robed(1, { raw: true, f: -1, pose: 'kneel', arm: 'up', rim: COLD, rimDir: -1 }));
  // 나: 무릎이 꺾였다
  person(v, 320, 238, 114, mage(v, { raw: true, f: 1, pose: 'kneel', arm: 'up', rim: 'rgba(210,214,255,.7)', rimDir: 1 })); glow(v, 330, 142, 18, '#ffffff', 0.24);
  finish(v, { inside: true });
}
/** 주문 짓는 책상: 밤의 서재. 펼친 책 위에 떠 있는 술식 도형, 바닥의 구긴 종이와 그을린 시험 자국 */
function spDesk(v) {
  const { ctx } = v; room(v, { wall: '#463e36', floor: '#2a2420', fy: 184 });
  shelf(ctx, 24, 30, 130, 5, 11); shelf(ctx, 520, 56, 96, 3, 17); windowAt(v, 420, 34, 54, 84, { arch: true });
  // 바닥: 구긴 종이, 분필 원과 그을음
  for (let i = 0; i < 9; i++) oval(ctx, 130 + hash(i, 4) * 70, 224 + hash(i, 5) * 12, 3.4, 2.6, '#8a8270', hash(i, 6) * 3);
  ring(ctx, 552, 222, 56, 9, 1.2, 'rgba(220,220,210,.5)'); ring(ctx, 552, 222, 40, 6, 0.8, 'rgba(220,220,210,.4)'); oval(ctx, 552, 222, 24, 4, 'rgba(10,8,8,.6)'); smoke(v, 552, 216, 50, 16, '#3a3632', 0.22);
  // 나: 옆모습으로 앉아 깃펜을 들었다
  person(v, 232, 240, 114, mage(v, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: WARM, rimDir: 1 })); rect(ctx, 214, 196, 30, 5, '#2a2018'); rect(ctx, 208, 150, 5, 88, '#2a2018');
  // 책상과 그 위의 것들
  table(ctx, 258, 500, 192, '#5a4634', 6, 44); rect(ctx, 258, 198, 242, 3, 'rgba(0,0,0,.3)');
  book(ctx, 340, 190, 26); for (let i = 0; i < 4; i++) rect(ctx, 440 - i, 188 - i * 4, 34, 4, ['#5a2e28', '#2e3e52', '#4a4a30', '#3e2e4a'][i]); candle(v, 296, 191, 11); glow(v, 296, 176, 90, '#ffcf80', 0.2);
  poly(ctx, [392, 191, 404, 191, 398, 183, 404, 175, 392, 175, 398, 183], '#c8b890'); oval(ctx, 418, 189, 5, 3, '#1c1814'); stroke(ctx, [270, 168, 282, 190], 1, '#d8d0bc'); oval(ctx, 384, 188, 4, 3, '#7ab0e0'); glow(v, 384, 187, 14, '#8ac0ff', 0.24);
  // 떠 있는 술식 도형
  lit(ctx, () => {
    const cx = 356, cy = 104, c = 'rgba(170,210,255,.7)', c2 = 'rgba(170,210,255,.35)';
    ring(ctx, cx, cy, 50, 50, 1.2, c); ring(ctx, cx, cy, 42, 42, 0.6, c2); ring(ctx, cx, cy, 20, 20, 0.9, c);
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3, b = a + TAU / 3; stroke(ctx, [cx + Math.cos(a) * 42, cy + Math.sin(a) * 42, cx + Math.cos(b) * 42, cy + Math.sin(b) * 42], 0.9, c); oval(ctx, cx + Math.cos(a) * 42, cy + Math.sin(a) * 42, 2.4, 2.4, 'rgba(220,236,255,.9)'); }
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24; stroke(ctx, [cx + Math.cos(a) * 46, cy + Math.sin(a) * 46, cx + Math.cos(a) * (i % 3 ? 49 : 53), cy + Math.sin(a) * (i % 3 ? 49 : 53)], 0.7, c); }
    for (let i = 0; i < 5; i++) { const a = 0.6 + i * 1.26; stroke(ctx, [cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, cx + Math.cos(a + 0.5) * 16, cy + Math.sin(a + 0.5) * 16], 0.8, c); }
    bend(ctx, [340, 180, 344, 160, 352, 154], 0.6, c2); bend(ctx, [340, 180, 330, 160, 322, 142], 0.6, c2); bend(ctx, [340, 180, 366, 166, 384, 146], 0.6, c2);
  });
  glow(v, 356, 104, 60, '#8ab0f0', 0.14);
  // 걸상에서 잠든 제자
  person(v, 604, 240, 92, robed(2, { raw: true, f: -1, pose: 'huddle', noShadow: true }));
  finish(v, { inside: true });
}

// ───────── 다른 종족 집안의 어린 시절 ─────────
/** 숲 깊은 곳 장로 집안: 굵은 나무 사이의 다리와 등불, 줄기 속 문. 장로가 아이에게 가지 하나를 건넨다 */
function kdGrove(v) {
  const { ctx, t } = v; sky(v); rect(ctx, 0, 0, VW, VH, t('#34483a')); for (let i = 0; i < 14; i++) rect(ctx, i * 50 + hash(i, 2) * 20, 0, 10 + hash(i, 3) * 16, 200, rgba(t('#22302a'), 0.7)); glow(v, 320, 90, 260, '#c8d8a0', 0.12);
  for (let i = 0; i < 5; i++) shaft(v, 120 + i * 110, 0, 30, 200, 40, '#e8e0a0', 0.05);
  rect(ctx, 0, 196, VW, 44, t('#26301e')); for (let i = 0; i < 40; i++) oval(ctx, hash(i, 4) * VW, 200 + hash(i, 5) * 40, 8, 2, rgba(t('#3e4a2a'), 0.6));
  // 굵은 줄기들
  for (const [x, w, i] of [[90, 80, 0], [330, 110, 1], [560, 90, 2]]) {
    poly(ctx, [x - w / 2, 0, x + w / 2, 0, x + w * 0.56, 170, x + w * 0.9, 206, x - w * 0.9, 206, x - w * 0.56, 170], t('#2e261e')); poly(ctx, [x + w * 0.1, 0, x + w / 2, 0, x + w * 0.56, 170, x + w * 0.9, 206, x + w * 0.2, 206], t('#221c16'));
    for (let j = 0; j < 7; j++) stroke(ctx, [x - w * 0.4 + j * w * 0.13, 10 + hash(j, i) * 30, x - w * 0.42 + j * w * 0.13, 190], 0.8, rgba(t('#15110e'), 0.5));
  }
  // 가운데 줄기의 문과 감아 오르는 계단
  ctx.fillStyle = '#e8b060'; ctx.beginPath(); ctx.moveTo(316, 204); ctx.lineTo(316, 166); ctx.quadraticCurveTo(331, 146, 346, 166); ctx.lineTo(346, 204); ctx.fill(); glow(v, 331, 180, 44, '#ffd890', 0.22);
  for (let i = 0; i < 9; i++) rect(ctx, 270 + i * 3, 150 - i * 12, 26 - i, 3, t('#4a3a28'));
  // 줄기 사이의 다리와 걷는 엘프들, 등불
  bend(ctx, [130, 96, 210, 112, 276, 98], 2.4, t('#4a3a28')); bend(ctx, [130, 80, 210, 96, 276, 82], 0.8, t('#6a5a40')); for (let i = 0; i < 9; i++) stroke(ctx, [140 + i * 15, 82 + Math.sin(i / 8 * Math.PI) * 12, 140 + i * 15, 98 + Math.sin(i / 8 * Math.PI) * 12], 0.6, t('#6a5a40'));
  bend(ctx, [386, 84, 450, 98, 516, 86], 2.4, t('#4a3a28')); bend(ctx, [386, 68, 450, 82, 516, 70], 0.8, t('#6a5a40'));
  elf(v, 190, 108, 36, { f: 1, cloth: '#5a6a52', hair: '#c8c0a0', robe: true, noShadow: true }); elf(v, 460, 96, 34, { f: -1, cloth: '#4a5a62', hair: '#3a2a1e', robe: true, noShadow: true });
  for (const [x, y] of [[150, 120], [250, 126], [420, 110], [500, 116], [40, 150], [610, 140]]) { stroke(ctx, [x, y - 16, x, y - 4], 0.5, t('#4a3a28')); oval(ctx, x, y, 3, 4, '#f0e8b0'); glow(v, x, y, 18, '#e8e0a0', 0.22); }
  for (let i = 0; i < 20; i++) oval(ctx, hash(i, 8) * VW, 130 + hash(i, 9) * 90, 0.9, 0.9, 'rgba(232,240,170,.8)');
  // 장로와 아이(나), 뒤에 선 부모
  elf(v, 236, 236, 112, { f: 1, old: true, cloth: '#b8b49c', hair: '#e0dcd0', robe: true, arm: 'fwd', stick: 'staff', rim: WARM, rimDir: 1 });
  stroke(ctx, [262, 172, 284, 164], 1.2, t('#6a5a3a')); oval(ctx, 286, 162, 4, 2, t('#7ab04a'), -0.4); oval(ctx, 280, 168, 3.4, 1.8, t('#7ab04a'), 0.5);
  elf(v, 306, 238, 64, kid(v, { f: -1, arm: 'fwd', thin: 1, rim: WARM, rimDir: 1 }));
  elf(v, 404, 236, 108, { f: -1, cloth: '#4a5a4a', hair: '#8a6a44', robe: true, female: true, arm: 'chest' }); elf(v, 446, 238, 112, { f: -1, cloth: '#3e4a52', hair: '#2a1e16', cloak: true });
  finish(v, { noLeaves: true });
}
/** 인간 도시의 악사 집안: 저녁 광장 모퉁이. 류트와 하프와 작은 피리, 뒤집어 놓은 모자, 둘러선 사람들의 등 */
function kdMinstrel(v) {
  const { ctx, t } = v; sky(v); facade(v, 0, 250, 20, 196, { door: 150, lit: true }); facade(v, 250, 180, 44, 196, { wall: '#5e5648', lit: true }); facade(v, 430, 210, 10, 196, { wall: '#70624c', door: 500, lit: true });
  rect(ctx, 0, 196, VW, 44, t('#57524a')); for (let i = 0; i < 40; i++) oval(ctx, hash(i, 2) * VW, 200 + hash(i, 3) * 38, 9, 2.4, rgba(t('#6e685e'), 0.5));
  // 등불 기둥
  rect(ctx, 458, 96, 3, 110, t('#2a2018')); oval(ctx, 459, 94, 5, 6, '#f0c878'); glow(v, 459, 94, 60, '#ffcf80', 0.22); pool(v, 360, 222, 130, 12, '#ffcf80', 0.12);
  // 아버지: 류트
  elf(v, 290, 232, 110, { f: 1, cloth: '#5a3a4a', hair: '#c8b888', arm: 'fwd', rim: WARM, rimDir: 1 }); oval(ctx, 306, 172, 10, 13, t('#8a5a30'), 0.5); oval(ctx, 306, 172, 3, 3, t('#2a1c12')); stroke(ctx, [312, 164, 334, 144], 2.4, t('#5a3a20'));
  // 어머니: 앉아서 하프
  elf(v, 362, 236, 108, { f: 1, pose: 'sit', female: true, cloth: '#3e5a5a', hair: '#8a6a44', arm: 'fwd', rim: WARM, rimDir: 1 });
  stroke(ctx, [384, 228, 384, 150, 410, 164, 404, 228], 2.4, t('#9a7a40')); for (let i = 0; i < 5; i++) stroke(ctx, [387 + i * 3.6, 156 + i * 2.6, 387 + i * 3.6, 226], 0.4, 'rgba(240,230,200,.8)');
  // 나: 작은 피리
  elf(v, 426, 236, 62, kid(v, { f: -1, arm: 'fwd', thin: 1, rim: WARM, rimDir: -1 })); stroke(ctx, [404, 196, 418, 192], 1.6, t('#c8b890'));
  // 모자와 동전
  oval(ctx, 340, 232, 12, 3.4, t('#2a2018')); oval(ctx, 340, 230, 8, 2, t('#15110e')); for (const [x, y] of [[336, 229], [343, 230], [356, 234]]) oval(ctx, x, y, 1.4, 0.9, '#d8b860');
  // 구경꾼: 양옆과 앞줄의 등
  person(v, 196, 234, 104, folk(0, { f: 1, arm: 'chest' })); person(v, 232, 236, 60, folk(2, { f: 1, child: true })); person(v, 520, 234, 106, folk(4, { f: -1, hat: true })); person(v, 560, 236, 100, folk(1, { f: -1 })); person(v, 606, 234, 108, { f: -1, cloth: '#3a3e48', hair: '#1c1614', hat: true, stick: 'spear' });
  crowd(v, 60, 250, 266, 5, 100, { rim: WARM, rimDir: 1 }); crowd(v, 470, 620, 268, 4, 100, { rim: WARM, rimDir: -1 });
  finish(v, { noLeaves: true });
}
/** 노예였다 풀려난 집안: 새벽의 장원 문 앞. 끊어 놓은 족쇄를 뒤에 두고 길로 나서는 식구, 문가에서 지켜보는 감독 */
function kdFreed(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => Math.max(fn(x), 148) + 26; ground(v, g, { color: '#6e7050', color2: '#444832', tufts: 50 }); road(v, 60, 520, 240, { w: 120 });
  glow(v, 600, 150, 120, '#ffd8a0', 0.2);
  // 장원 담과 열린 쇠문, 멀리 본채
  rect(ctx, 0, 110, 150, 100, t('#5a544a')); for (let i = 0; i < 4; i++) rect(ctx, i * 40, 104, 24, 8, t('#5a544a')); rect(ctx, 150, 86, 22, 126, t('#4a443c')); rect(ctx, 146, 80, 30, 8, t('#3e3832')); rect(ctx, 36, 86, 22, 126, t('#4a443c')); rect(ctx, 32, 80, 30, 8, t('#3e3832'));
  rect(ctx, 58, 110, 92, 100, t('#8a8470')); rect(ctx, 80, 150, 50, 60, t('#6a5a48')); poly(ctx, [74, 150, 105, 126, 136, 150], t('#4a3a30'));
  poly(ctx, [172, 100, 214, 116, 214, 222, 172, 210], rgba(t('#15120f'), 0.9)); for (let i = 0; i < 5; i++) stroke(ctx, [176 + i * 8, 102 + i * 3, 176 + i * 8, 212 + i * 2.4], 1.6, t('#15120f'));
  // 감독과 묶인 채 남은 이들
  person(v, 120, 222, 96, { f: 1, cloth: '#5a2630', hair: '#2a1e16', hat: true, stick: 'staff', arm: 'chest' }); for (let i = 0; i < 2; i++) elf(v, 76 + i * 20, 216, 78, { f: 1, cloth: '#5a5448', hair: HR[i + 3], noShadow: true });
  // 끊어진 족쇄
  for (const x of [232, 250]) ring(ctx, x, 232, 5, 3, 1.6, t('#3a3c42')); ctx.setLineDash([2.4, 2]); stroke(ctx, [237, 232, 245, 232], 1.4, t('#3a3c42')); stroke(ctx, [255, 232, 270, 236], 1.4, t('#3a3c42')); ctx.setLineDash([]);
  // 길로 나선 식구: 지팡이 짚은 노인, 보따리 진 아버지, 아이 손을 잡은 어머니
  elf(v, 300, 234, 100, { f: 1, old: true, cloth: '#625a4c', hair: '#c8c4bc', stick: 'staff' });
  elf(v, 360, 236, 112, { f: 1, cloth: '#5a5448', hair: '#3a2a1e', arm: 'fwd', rim: WARM, rimDir: 1 }); pack(v, 346, 170, 1.1, '#6a5a44'); poly(ctx, [378, 168, 392, 166, 393, 176, 379, 178], t('#e0d8c0')); oval(ctx, 386, 176, 1.8, 1.8, t('#8a2e2a'));
  elf(v, 428, 236, 106, { f: 1, female: true, cloth: '#504a40', hair: '#8a6a44', veil: true, rim: WARM, rimDir: 1 }); elf(v, 464, 238, 62, kid(v, { f: -1, thin: 1, cloth: '#625a4c', rim: WARM, rimDir: 1 }));
  tree(v, 590, 216, 120, {}); crows(v, 500, 60, 3, 50);
  finish(v);
}
/** 광산 씨족 장손: 바위를 깎은 큰 방. 화로 앞에서 씨족장이 아이 손에 작은 망치를 쥐여 준다 */
function kdHall(v) {
  const { ctx } = v; room(v, { wall: '#3e3a36', floor: '#26221e', fy: 184, stone: true });
  // 벽의 새김 띠와 기둥
  rect(ctx, 0, 30, VW, 12, '#2e2a26'); for (let i = 0; i < 44; i++) { const x = 8 + i * 14.4; stroke(ctx, i % 3 === 0 ? [x, 33, x + 5, 39, x + 9, 33] : i % 3 === 1 ? [x, 39, x + 4, 33, x + 8, 39] : [x + 2, 33, x + 2, 39, x + 7, 36], 0.9, '#8a7450'); }
  for (const x of [110, 510]) { rect(ctx, x, 42, 34, 150, '#4a4640'); rect(ctx, x - 6, 42, 46, 10, '#57524a'); rect(ctx, x - 6, 182, 46, 10, '#57524a'); rect(ctx, x + 22, 52, 12, 130, 'rgba(0,0,0,.25)'); banner(v, x + 17, 170, 100, '#6a2a22', { mark: true, raw: true }); }
  // 화로: 둥근 아가리 속의 불
  ctx.fillStyle = '#15110e'; ctx.beginPath(); ctx.moveTo(264, 186); ctx.lineTo(264, 120); ctx.quadraticCurveTo(320, 70, 376, 120); ctx.lineTo(376, 186); ctx.fill(); rect(ctx, 256, 182, 128, 8, '#57524a');
  glow(v, 320, 160, 130, '#ff8a3a', 0.2); for (const [x, s] of [[300, 9], [320, 12], [340, 9]]) flame(v, x, 180, s); pool(v, 320, 222, 150, 12, '#ff9a48', 0.14);
  // 모루와 연장
  poly(ctx, [430, 236, 462, 236, 458, 222, 470, 214, 422, 214, 434, 222], '#2e2c2e'); rect(ctx, 418, 208, 56, 7, '#3e3c40'); stroke(ctx, [480, 236, 492, 196], 2, '#3a2c20'); rect(ctx, 486, 190, 14, 8, '#5a5e66');
  // 뒤에 선 씨족 사람들
  for (let i = 0; i < 5; i++) dwarf(v, 40 + i * 26 + (i > 2 ? 470 : 0) - (i > 2 ? 78 : 0), 230, 96 + (i % 2) * 6, { raw: true, f: i > 2 ? -1 : 1, cloth: CL[i], hair: HR[i + 1], hat: i % 2 === 0, rim: FIRE, rimDir: i > 2 ? -1 : 1 });
  // 씨족장과 아이(나), 어머니
  dwarf(v, 262, 238, 122, { raw: true, f: 1, old: true, cloth: '#5a2e22', hair: '#c8c4bc', beard: '#d0ccc4', cloak: true, arm: 'fwd', rim: FIRE, rimDir: 1 });
  stroke(ctx, [292, 190, 304, 184], 1.8, '#3a2c20'); rect(ctx, 302, 178, 10, 7, '#8a8e96');
  dwarf(v, 330, 238, 76, kid(v, { raw: true, f: -1, arm: 'fwd', rim: FIRE, rimDir: 1 }));
  dwarf(v, 392, 238, 112, { raw: true, f: -1, female: true, long: true, cloth: '#4a4a3e', hair: '#8a4a2a', arm: 'chest', rim: FIRE, rimDir: -1 });
  finish(v, { inside: true });
}
/** 지상에 나온 상인 집안: 인간 도시 장터의 쇠붙이 좌판. 발판 위의 아버지, 상자를 나르는 아이, 물건을 재 보는 키 큰 손님들 */
function kdTrader(v) {
  const { ctx, t } = v; sky(v); facade(v, 0, 300, 24, 190, { door: 60 }); facade(v, 300, 340, 40, 190, { wall: '#766a54', door: 560 }); rect(ctx, 0, 190, VW, 50, t('#625c52')); for (let i = 0; i < 40; i++) oval(ctx, hash(i, 2) * VW, 196 + hash(i, 3) * 40, 9, 2.4, rgba(t('#777064'), 0.5));
  // 차양
  rect(ctx, 196, 96, 4, 110, t('#3a2c20')); rect(ctx, 470, 96, 4, 110, t('#3a2c20')); for (let i = 0; i < 7; i++) poly(ctx, [190 + i * 42, 96, 232 + i * 42, 96, 236 + i * 42, 122, 186 + i * 42, 122], t(i % 2 ? '#7a2e28' : '#c8bc9c'));
  // 걸어 놓은 솥과 연장
  for (const [x, k] of [[236, 0], [290, 1], [400, 0], [440, 2]]) { stroke(ctx, [x, 122, x, 136], 0.8, t('#2a2018')); if (k === 0) { oval(ctx, x, 144, 10, 8, t('#2e2c2e')); ring(ctx, x, 138, 8, 5, 1, t('#2e2c2e'), 0, Math.PI, TAU); } else if (k === 1) { stroke(ctx, [x, 136, x, 160], 1.6, t('#3a2c20')); rect(ctx, x - 6, 136, 12, 6, t('#6a6e76')); } else { ring(ctx, x, 142, 6, 6, 1.6, t('#6a6e76')); } }
  // 아버지(발판 위)와 어머니
  rect(ctx, 320, 222, 44, 14, t('#4a3a2a')); dwarf(v, 342, 222, 118, { f: 1, cloth: '#3e4a52', hair: '#8a4a2a', arm: 'fwd', hat: true }); dwarf(v, 420, 234, 110, { f: -1, female: true, long: true, cloth: '#5a4a3a', hair: '#6a4a2a', arm: 'chest' });
  // 좌판과 물건: 칼, 자물쇠, 저울
  table(ctx, 206, 464, 196, t('#4a3a2a'), 6, 40); rect(ctx, 206, 202, 258, 34, t('#3a2e22'));
  for (let i = 0; i < 4; i++) { stroke(ctx, [222 + i * 14, 194, 232 + i * 14, 186], 1.6, t('#b0b4bc')); stroke(ctx, [220 + i * 14, 195, 223 + i * 14, 193], 2.4, t('#3a2c20')); } for (let i = 0; i < 3; i++) { rect(ctx, 290 + i * 16, 187, 9, 8, t('#8a7450')); ring(ctx, 294.5 + i * 16, 187, 3, 4, 1, t('#6a6e76'), 0, Math.PI, TAU); }
  stroke(ctx, [384, 195, 384, 168], 1.4, t('#9a8450')); stroke(ctx, [366, 172, 402, 172], 1.2, t('#9a8450')); for (const x of [366, 402]) { stroke(ctx, [x, 172, x - 5, 186], 0.5, t('#9a8450')); stroke(ctx, [x, 172, x + 5, 186], 0.5, t('#9a8450')); oval(ctx, x, 187, 7, 2, t('#9a8450')); } oval(ctx, 440, 190, 9, 5, t('#2e2c2e'));
  // 나: 상자를 나른다
  dwarf(v, 160, 238, 78, kid(v, { f: 1, arm: 'fwd' })); rect(ctx, 168, 196, 20, 14, t('#6a5438')); stroke(ctx, [168, 203, 188, 203], 0.8, t('#3a2c20'));
  // 손님들과 길드 사람
  person(v, 520, 238, 114, folk(1, { f: -1, arm: 'fwd' })); person(v, 560, 238, 60, folk(2, { f: -1, child: true })); person(v, 610, 236, 112, { f: -1, cloth: '#5a2630', hair: '#3a2a1e', cloak: true, hat: true, arm: 'chest' }); person(v, 80, 236, 110, folk(4, { f: 1, hat: true }));
  finish(v, { noLeaves: true });
}
/** 쫓겨난 씨족: 닫힌 돌문을 등지고 눈 오는 고갯길을 내려가는 짧은 행렬. 한 사람이 돌아본다 */
function kdExile(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); const g = (x) => 168 + x * 0.05 + Math.sin(x / 70) * 5; ground(v, g, { color: '#8a8880', color2: '#5a5a58', plain: true });
  // 벼랑과 닫힌 문
  poly(ctx, [0, 0, 190, 0, 170, 60, 200, 130, 176, 200, 0, 214], t('#4a4844')); poly(ctx, [120, 0, 190, 0, 170, 60, 200, 130, 176, 200, 140, 206], t('#3a3836'));
  rect(ctx, 34, 84, 96, 122, t('#2a2826')); rect(ctx, 40, 90, 84, 116, t('#3e3c3a')); stroke(ctx, [82, 90, 82, 206], 1.4, t('#1c1a18')); rect(ctx, 28, 76, 108, 10, t('#57524a'));
  for (let i = 0; i < 7; i++) { const x = 38 + i * 13; stroke(ctx, i % 2 ? [x, 78, x + 5, 84, x + 9, 78] : [x + 2, 78, x + 2, 84, x + 7, 81], 0.9, t('#8a7450')); } ring(ctx, 68, 150, 5, 5, 1.6, t('#6a6e76')); ring(ctx, 96, 150, 5, 5, 1.6, t('#6a6e76'));
  for (let i = 0; i < 26; i++) oval(ctx, hash(i, 2) * VW, 176 + hash(i, 3) * 60, 16, 3, rgba(t('#d8dce0'), 0.5)); tree(v, 600, 220, 110, { bare: true });
  // 행렬: 돌아보는 노인, 짐 진 이들, 조랑말 수레
  dwarf(v, 214, 226, 110, { f: -1, old: true, cloth: '#4a4a3e', hair: '#c8c4bc', beard: '#d0ccc4', hood: true, stick: 'staff' });
  horseSil(v, 430, 234, 62, 1, '#5a4a3a', {}); wagon(v, 360, 234, 0.86, 1); rect(ctx, 336, 196, 44, 16, t('#6a5a44')); rect(ctx, 344, 186, 26, 10, t('#4a3e30'));
  dwarf(v, 290, 232, 108, { f: 1, female: true, long: true, cloth: '#54463a', hair: '#8a4a2a', hood: true }); pack(v, 278, 190, 1, '#6a5a44');
  dwarf(v, 500, 236, 114, { f: 1, cloth: '#3a3e4a', hair: '#2a1e16', hat: true, stick: 'spear' }); pack(v, 487, 190, 1.1, '#5a4a36');
  dwarf(v, 560, 238, 112, { f: 1, cloth: '#4e3a34', hair: '#6a4a2a', hood: true }); pack(v, 547, 192, 1.1, '#4a4234');
  // 나: 어머니 곁, 작은 보따리
  dwarf(v, 250, 236, 76, kid(v, { f: 1, hood: true })); pack(v, 242, 204, 0.6, '#6a5a44');
  for (let i = 0; i < 90; i++) oval(ctx, hash(i, 5) * VW, hash(i, 6) * VH, 1 + hash(i, 7) * 0.8, 1 + hash(i, 7) * 0.8, 'rgba(236,240,244,.7)');
  finish(v, { noLeaves: true });
}
/** 수인 부족의 마을: 가죽 덮은 긴 집과 머리뼈 건 선돌, 모닥불. 늑대 부족은 달밤의 솔숲, 호랑이 부족은 해 질 녘 갈대밭, 매 부족은 벼랑 위 */
function kdTribe(v, kind) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: kind !== 'tiger' });
  const g = kind === 'hawk' ? (x) => (x > 470 ? 190 + (x - 470) * 0.9 : 176 - Math.sin(x / 120) * 6) : (x) => Math.max(fn(x), 148) + 28;
  ground(v, g, kind === 'wolf' ? { color: '#3e4a44', color2: '#26302c', tufts: 40 } : kind === 'tiger' ? { color: '#8a7a44', color2: '#5a4e2e', tufts: 90 } : { color: '#7a7862', color2: '#4e4c40', tufts: 30 });
  if (kind === 'wolf') { for (const x of [16, 60, 110, 560, 600, 636]) tree(v, x, 208, 150, { dark: true }); for (const [x, d] of [[530, -1], [150, 1]]) dogSil(v, x, 204, 40, d, '#2a2a30', {}); }
  if (kind === 'tiger') for (let i = 0; i < 70; i++) { const x = hash(i, 2) * VW, y = 170 + hash(i, 3) * 26, h = 30 + hash(i, 4) * 30; bend(ctx, [x, y, x + 2, y - h * 0.6, x + 8 + hash(i, 5) * 6, y - h], 1, rgba(t(i % 3 ? '#9a8a4a' : '#6a5e34'), 0.8)); }
  if (kind === 'hawk') { crows(v, 540, 70, 5, 70); rect(ctx, 560, 130, 3, 60, t('#2a2018')); stroke(ctx, [550, 132, 574, 132], 2, t('#2a2018')); poly(ctx, [558, 132, 566, 132, 568, 118, 563, 112, 558, 119], t('#4a3a2a')); stroke(ctx, [563, 114, 567, 116], 1, t('#c8a850')); }
  // 가죽 덮은 긴 집
  hideHall(v, 130, 208, 190, 62, kind === 'tiger' ? '#8a6a3e' : '#6e5a46'); if (kind !== 'hawk') hideHall(v, 588, 206, 110, 50, '#75604a'); smoke(v, 150, 150, 60, 14, '#3a3632', 0.16);
  // 선돌 표지
  clanStone(v, kind === 'hawk' ? 474 : 498, 222, 104, kind);
  // 모닥불
  const fx = kind === 'hawk' ? 300 : 340; for (const k of [-1, 1]) stroke(ctx, [fx - 12 * k, 232, fx + 10 * k, 226], 2.4, t('#2a1c12')); flame(v, fx, 226, 10); glow(v, fx, 214, 90, '#ff9a48', kind === 'hawk' ? 0.08 : 0.2); pool(v, fx, 232, 90, 8, '#ff9a48', 0.12); smoke(v, fx, 200, 80, 24, '#2a2622', 0.2);
  // 사람들: 어른 둘과 노인, 아이(나)
  const dim = kind !== 'hawk', R1 = dim ? { rim: FIRE, rimDir: 1 } : {}, R2 = dim ? { rim: FIRE, rimDir: -1 } : {};
  beastman(v, fx - 86, 236, 104, kind, { f: 1, old: true, cloth: '#5a4636', hair: kind === 'wolf' ? '#a8a6a8' : undefined, stick: 'staff', cloak: true, ...R1 });
  beastman(v, fx - 40, 238, 66, kind, kid(v, { f: 1, arm: 'fwd', hair: undefined, ...R1 }));
  beastman(v, fx + 56, 236, 112, kind, { f: -1, cloth: '#4a3a2e', arm: 'fwd', stick: 'spear', ...R2 });
  beastman(v, fx + 104, 238, 106, kind, { f: -1, female: true, long: true, cloth: '#6a4a36', arm: 'chest', ...R2 });
  beastman(v, 40, 236, 100, kind, { f: 1, cloth: '#54463a' });
  // 가죽 말리는 틀
  const hx = kind === 'hawk' ? 612 : 250; stroke(ctx, [hx - 16, 236, hx - 12, 190, hx + 12, 190, hx + 16, 236], 1.6, t('#2a2018')); poly(ctx, [hx - 9, 194, hx + 9, 194, hx + 11, 222, hx, 228, hx - 11, 222], t('#9a7a54'));
  finish(v, { noLeaves: true });
}
/** 숲 경계 마을의 반엘프: 왼쪽은 밭과 초가, 오른쪽은 큰 숲. 사람 아버지와 엘프 어머니 사이에 선 아이, 양쪽에서 지켜보는 눈 */
function kdBorder(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => Math.max(fn(x), 150) + 26; ground(v, g, { color: '#72784e', color2: '#4a5038', tufts: 60 });
  // 왼쪽: 밭이랑과 집, 울타리
  for (let i = 0; i < 7; i++) stroke(ctx, [0, 188 + i * 7, 260 - i * 8, 184 + i * 7], 1, rgba(t('#5a5234'), 0.5)); cottage(v, 90, 186, 80, 48, {}); cottage(v, 190, 180, 56, 36, {}); smoke(v, 110, 130, 50, 14, '#8a8478', 0.2);
  for (let i = 0; i < 9; i++) rect(ctx, 20 + i * 28, 196, 2, 14, t('#3a2c20')); stroke(ctx, [20, 200, 246, 200], 1, t('#3a2c20')); stroke(ctx, [20, 206, 246, 206], 1, t('#3a2c20'));
  // 오른쪽: 큰 숲의 벽
  rect(ctx, 420, 40, 220, 150, rgba(t('#1e2a22'), 0.92)); for (let i = 0; i < 9; i++) rect(ctx, 428 + i * 24, 30, 8 + hash(i, 2) * 8, 160, rgba(t('#16201a'), 0.9));
  for (const [x, h] of [[430, 190], [500, 220], [570, 200], [630, 230]]) tree(v, x, 206, h, { dark: true }); for (const [x, y] of [[470, 150], [540, 136], [600, 160]]) { oval(ctx, x, y, 2, 3, '#f0e8b0'); glow(v, x, y, 14, '#e8e0a0', 0.2); }
  for (let i = 0; i < 12; i++) oval(ctx, 424 + i * 20, 204 + (i % 2) * 3, 16, 7, t('#2a3a26'));
  // 숲 그늘의 엘프들과 밭가의 마을 사람들
  elf(v, 520, 206, 56, { f: -1, cloth: '#3e4a40', hair: '#c8c0a0', robe: true, noShadow: true }); elf(v, 556, 204, 52, { f: -1, cloth: '#34403a', hair: '#3a2a1e', hood: true, noShadow: true });
  person(v, 150, 210, 56, folk(0, { f: 1, stick: 'crook', hat: true, noShadow: true })); person(v, 176, 212, 52, folk(1, { f: 1, arm: 'chest', noShadow: true }));
  // 숲으로 드는 오솔길
  ctx.fillStyle = rgba(t('#9a8a64'), 0.6); ctx.beginPath(); ctx.moveTo(250, 240); ctx.quadraticCurveTo(360, 214, 460, 196); ctx.lineTo(470, 200); ctx.quadraticCurveTo(390, 222, 330, 240); ctx.fill();
  // 아버지(사람), 아이(나), 어머니(엘프)
  person(v, 262, 236, 112, { f: 1, cloth: '#54463a', hair: '#3a2a1e', arm: 'fwd', hat: true }); stroke(ctx, [240, 236, 236, 150], 2, t('#3a2c20')); poly(ctx, [230, 150, 242, 150, 240, 136, 232, 136], t('#6a6e76'));
  elf(v, 326, 238, 66, kid(v, { f: 1, thin: 1, ear: 0.6 }));
  elf(v, 392, 236, 114, { f: -1, female: true, cloth: '#4a5a4a', hair: '#c8b888', robe: true, arm: 'fwd' });
  finish(v);
}
/** 뿔을 감추고 사는 집안: 덧문 닫은 밤의 방. 어머니가 아이 이마에 천을 감고, 벽의 그림자에는 뿔이 그대로 선다. 아버지는 덧문 틈으로 밖의 횃불을 본다 */
function kdHidden(v) {
  const { ctx } = v; room(v, { wall: '#54483c', floor: '#30281f', fy: 184 });
  // 덧문과 틈새의 불빛
  rect(ctx, 500, 50, 70, 84, '#2a2018'); for (let i = 0; i < 5; i++) rect(ctx, 503 + i * 13.4, 53, 11.6, 78, '#3e3024'); rect(ctx, 500, 86, 70, 5, '#2a2018'); rect(ctx, 534, 53, 1.6, 78, '#ffb060'); glow(v, 535, 92, 30, '#ff9a48', 0.2);
  // 침상과 궤, 벽의 못에 건 두건들
  rect(ctx, 24, 196, 130, 12, '#4a3a2a'); oval(ctx, 50, 192, 20, 7, '#b8ae94'); rect(ctx, 24, 208, 130, 26, '#3a2c20'); rect(ctx, 590, 204, 44, 30, '#3a2c20'); rect(ctx, 590, 204, 44, 5, '#2a2018');
  for (const [x, c] of [[400, '#5a2e28'], [430, '#3e4a52']]) { oval(ctx, x, 80, 2, 2, '#15110e'); poly(ctx, [x - 9, 82, x + 9, 82, x + 12, 108, x, 100, x - 12, 108], c); }
  // 탁자와 촛불
  table(ctx, 168, 250, 198, '#3a2c20', 5, 38); candle(v, 196, 198, 10); glow(v, 196, 184, 110, '#ffcf80', 0.2); pool(v, 290, 228, 130, 10, '#ffcf80', 0.1); oval(ctx, 228, 196, 9, 3, '#6a5a44');
  // 벽에 선 아이의 그림자: 뿔이 크게
  ctx.save(); ctx.globalAlpha = 0.34; ctx.translate(452, 190); ctx.scale(1.7, 1.7); hornkin(v, 0, 0, 64, { raw: true, child: true, f: 1, cloth: '#0c0a0c', hair: '#0c0a0c', skin: '#0c0a0c', horn: '#0c0a0c', noShadow: true }); ctx.restore();
  // 어머니: 무릎 꿇고 천을 감는다
  hornkin(v, 300, 238, 110, { raw: true, f: 1, pose: 'kneel', female: true, veil: true, hideHorn: true, cloth: '#4a3a44', arm: 'fwd', rim: WARM, rimDir: -1 });
  // 나: 뿔이 아직 드러나 있다
  hornkin(v, 356, 238, 66, kid(v, { raw: true, f: -1, rim: WARM, rimDir: -1 })); bend(ctx, [330, 186, 340, 176, 350, 178], 2.4, '#c8bca0'); bend(ctx, [350, 178, 360, 184, 366, 196], 1.6, '#c8bca0');
  // 아버지: 덧문 틈에 눈을 대고
  person(v, 520, 236, 112, { raw: true, f: 1, cloth: '#3e3a36', hair: '#2a1e16', hood: true, arm: 'fwd', rim: FIRE, rimDir: 1 }); stroke(ctx, [556, 236, 562, 170], 2, '#2a2018'); rect(ctx, 556, 164, 12, 8, '#5a5e66');
  finish(v, { inside: true });
}

export const PLATES21 = {
  /** 마법 계열 판. variant: fire·water·wind·earth·light·shadow·life·mind·surge·desk */
  spell(v) { const k = v.variant ?? 'desk'; return ({ fire: spFire, water: spWater, wind: spWind, earth: spEarth, light: spLight, shadow: spShadow, life: spLife, mind: spMind, surge: spSurge }[k] ?? spDesk)(v); },
  /** 다른 종족 집안의 어린 시절. variant: grove·minstrel·freed·hall·trader·exile·wolf·tiger·hawk·border·hidden */
  kindred(v) { const k = v.variant ?? 'border'; if (k === 'wolf' || k === 'tiger' || k === 'hawk') return kdTribe(v, k); return ({ grove: kdGrove, minstrel: kdMinstrel, freed: kdFreed, hall: kdHall, trader: kdTrader, exile: kdExile, hidden: kdHidden }[k] ?? kdBorder)(v); },
};
