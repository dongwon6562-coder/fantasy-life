// 31단계 삽화: 형제자매(함께 자란 집, 갈라선 상속 자리, 떠나는 형제), 고대 유적(무너진 회랑, 고대 문자, 깨어나는 것, 도굴의 밤),
// 기사단(서약식, 성채, 행군, 무너진 날).
import { fbm1, hash, rgba, dark, light } from './sceneKit.js';
import { VW, VH, sky, far, ground, road, room, windowAt, shaft, glow, flame, blaze, candle, pool, smoke, person, tree, banner, sunSign, crows, finish, zoom } from './vignetteKit.js';
import { cottage, horseSil } from './vignettePlates4.js';
import { spear, torch } from './vignettePlates5.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.5)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const kin = (v, o = {}) => ({ cloth: v.other.cloth, hair: v.other.hair, female: v.other.female, long: v.other.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const dimOf = (v) => v.S.tod === 'night' || v.S.tod === 'dusk';
const MAIL = '#5c6068', MANTLE = '#cfc8b8';

/** 기사단의 흰 망토: 사람을 그리기 전에 깔면 어깨 뒤로 드리운다. back이면 등을 다 덮고 표식을 단다 */
function mantle(v, x, y, h, o = {}) {
  const { ctx } = v, s = h / 100, c = o.raw ? (o.color ?? MANTLE) : v.t(o.color ?? MANTLE), d = o.d ?? 1;
  if (o.kneel) { poly(ctx, [x - 13 * s, y - 56 * s, x + 13 * s, y - 56 * s, x - d * 34 * s, y, x + d * 6 * s, y], c); return; }
  poly(ctx, [x - 14 * s, y - 80 * s, x + 14 * s, y - 80 * s, x + 19 * s, y - 6 * s, x - 19 * s, y - 6 * s], c);
  ctx.fillStyle = rgba('#000000', 0.16); ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 78 * s); ctx.lineTo(x - 7 * s, y - 6 * s); ctx.lineTo(x - 1 * s, y - 6 * s); ctx.fill();
}
/** 기사 한 명. o.back이면 등을 보이고 선다(망토가 등을 덮는다) */
function knight(v, x, y, h, o = {}) {
  const { ctx } = v, s = h / 100, raw = !!o.raw;
  if (o.back) {
    person(v, x, y, h, { raw, f: 0, cloth: MAIL, hair: '#3a3a40' });
    mantle(v, x, y, h, { raw, color: o.color });
    sunSign(v, x, y - 52 * s, 4.2 * s, raw ? '#8a6a2a' : v.t('#8a6a2a'));
    oval(ctx, x, y - 93 * s, 7.6 * s, 8 * s, raw ? '#7c8088' : v.t('#7c8088')); // 투구
    return;
  }
  mantle(v, x, y, h, { raw, color: o.color, kneel: o.pose === 'kneel', d: -(o.f || 1) });
  person(v, x, y, h, { raw, cloth: MAIL, hair: o.hair ?? '#3a2a1e', ...o });
}
/** 말 탄 기사: 말, 망토, 창과 창깃 */
function rider(v, x, y, h, d, o = {}) {
  const { ctx, t } = v, s = h / 100;
  // 사람을 먼저 그리고 말을 덮어 그린다: 다리가 말 몸통 뒤로 가려 안장에 앉은 것처럼 보인다
  const px = x - d * 6 * s, py = y - 50 * s, ph = h * 0.86;
  poly(ctx, [px - 10 * s, py - 66 * s, px + 10 * s, py - 66 * s, px - d * 30 * s, py - 20 * s, px - d * 4 * s, py - 24 * s], t(o.color ?? MANTLE));
  person(v, px, py, ph, { f: d, cloth: MAIL, hair: '#3a3a40', hat: true, rim: o.rim, rimDir: d, ...(o.who ?? {}) });
  horseSil(v, x, y, h, d, o.coat ?? '#3a2c24', { tack: true, blanket: o.blanket });
  // 말 옆구리로 내려온 다리와 등자
  stroke(ctx, [px + d * 2 * s, y - 80 * s, px + d * 7 * s, y - 52 * s], 5.5 * s, t(dark(MAIL, 0.35))); stroke(ctx, [px + d * 7 * s, y - 52 * s, px + d * 12 * s, y - 50 * s], 4 * s, t('#2a2420'));
  if (o.lance !== false) {
    const lx = px + d * 12 * s, ly = py - 30 * s, len = h * (o.len ?? 1.5), tilt = d * (o.tilt ?? 0.07);
    spear(v, lx, ly, len, tilt);
    if (o.pennon) { const tx = lx + Math.sin(tilt) * len * 0.9, ty = ly - Math.cos(tilt) * len * 0.9; poly(ctx, [tx, ty, tx - d * 16 * s, ty + 3 * s, tx - d * 9 * s, ty + 6 * s, tx - d * 15 * s, ty + 10 * s, tx, ty + 9 * s], t(o.pennon)); }
  }
}
/** 부러져 누운 기둥 토막 */
function drum(v, x, y, r, len, c, a = 0) {
  const { ctx } = v; ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  rect(ctx, 0, -r, len, r * 2, c); ctx.fillStyle = rgba('#000000', 0.22); ctx.fillRect(0, r * 0.2, len, r * 0.8);
  for (let i = 1; i < 5; i++) stroke(ctx, [0, -r + (i * r * 2) / 5, len, -r + (i * r * 2) / 5], 0.6, rgba('#000000', 0.2));
  oval(ctx, len, 0, r * 0.42, r, light(c, 0.12)); oval(ctx, 0, 0, r * 0.42, r, dark(c, 0.25));
  ctx.restore();
}
/** 선 기둥 (홈이 팬 몸통, 머릿돌). broken이면 위가 깨져 있다 */
export function column(v, x, y, w, h, c, o = {}) {
  const { ctx, R } = v;
  rect(ctx, x - w * 0.7, y - w * 0.3, w * 1.4, w * 0.3, dark(c, 0.2));
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - w / 2, y - w * 0.3); ctx.lineTo(x - w * 0.44, y - h);
  if (o.broken) { ctx.lineTo(x - w * 0.2, y - h - w * 0.3); ctx.lineTo(x + w * 0.06, y - h + w * 0.2); ctx.lineTo(x + w * 0.3, y - h - w * 0.12); }
  ctx.lineTo(x + w * 0.44, y - h); ctx.lineTo(x + w / 2, y - w * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.24); ctx.fillRect(x + w * 0.12, y - h, w * 0.34, h - w * 0.3);
  for (let i = -2; i <= 2; i++) stroke(ctx, [x + i * w * 0.16, y - w * 0.3, x + i * w * 0.145, y - h + 2], 0.6, rgba('#000000', 0.18));
  ctx.fillStyle = rgba(light(c, 0.3), 0.4); ctx.fillRect(x - w * 0.44, y - h, w * 0.1, h - w * 0.3);
  if (!o.broken) { rect(ctx, x - w * 0.62, y - h - w * 0.22, w * 1.24, w * 0.22, light(c, 0.06)); rect(ctx, x - w * 0.74, y - h - w * 0.38, w * 1.48, w * 0.16, c); }
  if (o.moss) for (let i = 0; i < 9; i++) oval(ctx, x - w * 0.5 + R() * w, y - R() * h * 0.5 - w * 0.3, 2 + R() * 3, 1.4 + R() * 2, rgba(o.moss, 0.6));
}
/** 고대 문자 한 글자: 씨앗마다 모양이 정해진다. (cx, cy) 둘레 s 크기 */
function glyph(ctx, cx, cy, s, seed, c, w = 1) {
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const k = Math.floor(hash(seed, 1) * 6), n = 2 + Math.floor(hash(seed, 2) * 3);
  ctx.beginPath();
  if (k === 0) { ctx.arc(cx, cy, s * 0.5, hash(seed, 3) * TAU, hash(seed, 3) * TAU + 4.4); }
  else if (k === 1) { ctx.moveTo(cx, cy - s * 0.6); ctx.lineTo(cx, cy + s * 0.6); ctx.moveTo(cx - s * 0.45, cy - s * 0.5); ctx.lineTo(cx, cy - s * 0.1); ctx.lineTo(cx + s * 0.45, cy - s * 0.5); }
  else if (k === 2) { ctx.moveTo(cx - s * 0.5, cy + s * 0.55); ctx.lineTo(cx, cy - s * 0.6); ctx.lineTo(cx + s * 0.5, cy + s * 0.55); }
  else if (k === 3) { ctx.moveTo(cx - s * 0.45, cy - s * 0.15); ctx.lineTo(cx, cy - s * 0.6); ctx.lineTo(cx + s * 0.45, cy - s * 0.15); ctx.moveTo(cx - s * 0.45, cy + s * 0.5); ctx.lineTo(cx, cy + s * 0.05); ctx.lineTo(cx + s * 0.45, cy + s * 0.5); }
  else if (k === 4) { ctx.rect(cx - s * 0.4, cy - s * 0.5, s * 0.8, s); }
  else { ctx.moveTo(cx - s * 0.5, cy); ctx.quadraticCurveTo(cx, cy - s * 0.9, cx + s * 0.5, cy); ctx.quadraticCurveTo(cx, cy + s * 0.9, cx - s * 0.5, cy); }
  ctx.stroke();
  for (let i = 0; i < n; i++) { const a = hash(seed, 10 + i) * TAU, r0 = s * (0.15 + hash(seed, 20 + i) * 0.3); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 1.2); ctx.lineTo(cx + Math.cos(a) * (r0 + s * 0.3), cy + Math.sin(a) * (r0 + s * 0.3) * 1.2); ctx.stroke(); }
  if (hash(seed, 5) < 0.35) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + (hash(seed, 6) - 0.5) * s * 0.5, cy + s * 0.72, w * 0.9, 0, TAU); ctx.fill(); }
}
/** 돌무더기 */
export function rubble(v, x, y, w, n, c) {
  const { ctx, R } = v;
  for (let i = 0; i < n; i++) { const px = x + (R() - 0.5) * w, s = 3 + R() * 7, py = y - R() * s * 0.4; poly(ctx, [px - s, py, px - s * 0.6, py - s * 0.8, px + s * 0.3, py - s, px + s, py - s * 0.3, px + s * 0.8, py], R() < 0.5 ? c : dark(c, 0.2)); }
}

/* ---------- 형제자매 ---------- */
/** 함께 자란 집: 난롯가의 아이들, 한 침상의 베개 둘, 문설주의 키 잰 금 */
function siblingsHome(v) {
  const { ctx } = v; room(v, { wall: '#3c3026', floor: '#2c2219', fy: 174, stone: false });
  ctx.save(); zoom(v, 330, 240, 1.1);
  // 들보와 걸어 둔 것들
  rect(ctx, 0, 14, VW, 9, '#2a2019'); for (const x of [150, 330, 510]) rect(ctx, x - 5, 0, 10, 174, '#30251c');
  for (const [x, c] of [[214, '#7a6a3a'], [236, '#8a4a2a'], [258, '#6a7040']]) { stroke(ctx, [x, 23, x, 40], 0.8, '#1c1612'); oval(ctx, x, 48, 5, 9, c); }
  windowAt(v, 420, 52, 46, 44); rect(ctx, 394, 96, 52, 4, '#2a2019');
  // 난로
  const hx = 134, hy = 176; rect(ctx, hx - 62, 44, 124, 132, '#4a443e'); poly(ctx, [hx - 70, 44, hx + 70, 44, hx + 50, 18, hx - 50, 18], '#3e3832'); rect(ctx, hx - 70, 84, 140, 8, '#332e29');
  ctx.fillStyle = '#120e0c'; ctx.beginPath(); ctx.moveTo(hx - 40, hy); ctx.lineTo(hx - 40, 124); ctx.quadraticCurveTo(hx, 98, hx + 40, 124); ctx.lineTo(hx + 40, hy); ctx.fill();
  for (const k of [-16, 4, 18]) stroke(ctx, [hx + k - 12, hy - 4, hx + k + 12, hy - 8], 4, '#2a1c14'); flame(v, hx - 8, hy - 6, 17); flame(v, hx + 14, hy - 5, 11); glow(v, hx, hy - 20, 120, '#ff9a48', 0.22);
  rect(ctx, hx + 20, 132, 2, 34, '#1c1816'); oval(ctx, hx + 21, 168, 9, 6, '#1c1816'); // 걸린 솥
  pool(v, hx + 70, 214, 230, 50, '#ff9a48', 0.36); glow(v, hx + 90, 150, 200, '#ff8a3a', 0.1, 110);
  // 문설주의 키 잰 금: 해마다 그은 칼자국 (두 줄, 두 아이)
  const dx = 560; rect(ctx, dx - 30, 40, 60, 134, '#241a14'); rect(ctx, dx - 36, 34, 8, 140, '#4a3828'); rect(ctx, dx + 28, 34, 8, 140, '#4a3828'); rect(ctx, dx - 36, 34, 72, 7, '#4a3828');
  for (let i = 0; i < 7; i++) { stroke(ctx, [dx - 35, 150 - i * 11, dx - 30, 150 - i * 11], 1, '#c8b890'); if (i < 5) stroke(ctx, [dx - 35, 156 - i * 10.4, dx - 32, 156 - i * 10.4], 1, '#9a8a68'); }
  // 한 침상, 베개 둘, 기운 이불
  const bx = 470, by = 204; rect(ctx, bx - 70, by - 26, 140, 10, '#4a3626'); rect(ctx, bx - 74, by - 50, 8, 62, '#3a2a1c'); rect(ctx, bx + 66, by - 36, 8, 48, '#3a2a1c');
  poly(ctx, [bx - 66, by - 30, bx + 66, by - 30, bx + 66, by - 16, bx - 66, by - 16], '#8a7c64'); oval(ctx, bx - 46, by - 33, 15, 6, '#c8bca0'); oval(ctx, bx - 18, by - 33, 15, 6, '#b8ac90');
  poly(ctx, [bx - 2, by - 31, bx + 66, by - 31, bx + 66, by - 12, bx + 2, by - 14], '#5a4a52'); rect(ctx, bx + 24, by - 28, 14, 10, '#7a5a3a'); rect(ctx, bx + 46, by - 24, 10, 8, '#4a5a4a');
  // 침상에 기대 둔 나무칼 두 자루와 작은 걸상
  stroke(ctx, [392, 212, 404, 168], 2.4, '#7a5c38'); stroke(ctx, [396, 198, 404, 200], 2.4, '#7a5c38'); stroke(ctx, [380, 214, 386, 178], 2, '#6a4e30'); stroke(ctx, [379, 204, 387, 205], 2, '#6a4e30');
  rect(ctx, 340, 212, 26, 4, '#4a3626'); rect(ctx, 343, 216, 3, 12, '#3a2a1c'); rect(ctx, 360, 216, 3, 12, '#3a2a1c');
  // 아이들: 불가에 앉은 나와 동생, 책을 읽어 주는 맏이
  person(v, 226, 236, 74, mine(v, { raw: true, f: -1, pose: 'sit', child: true, arm: 'fwd', rim: WARM, rimDir: -1 }));
  person(v, 270, 240, 62, kin(v, { raw: true, f: -1, pose: 'sit', child: true, rim: WARM, rimDir: -1 }));
  person(v, 326, 238, 100, folk(1, { raw: true, f: -1, pose: 'sit', arm: 'chest', rim: WARM, rimDir: -1 })); poly(ctx, [304, 190, 320, 186, 322, 198, 306, 202], '#d8ccae');
  person(v, 196, 234, 50, folk(3, { raw: true, f: -1, pose: 'huddle', child: true, rim: WARM, rimDir: -1 }));
  ctx.restore(); finish(v, { inside: true });
}
/** 갈라선 상속 자리: 비어 있는 아버지의 의자, 탁자 위의 유언장과 열쇠, 서로 등을 진 형제 */
function siblingsSplit(v) {
  const { ctx } = v; room(v, { wall: '#343028', floor: '#27221c', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.1);
  windowAt(v, 330, 22, 50, 92, { arch: true }); shaft(v, 330, 110, 44, 130, 0, '#b8c8e0', 0.13);
  for (const x of [120, 540]) { rect(ctx, x - 11, 0, 22, 172, '#2a2620'); rect(ctx, x - 15, 160, 30, 12, '#211d18'); }
  // 벽의 가문 방패에 검은 천
  for (const x of [220, 440]) { poly(ctx, [x - 16, 44, x + 16, 44, x + 16, 70, x, 86, x - 16, 70], '#5a2a24'); stroke(ctx, [x - 20, 40, x + 2, 62, x + 20, 44], 3, '#141210'); }
  // 높은 등받이 의자: 비어 있고, 겉옷만 걸려 있다
  const cx = 330; rect(ctx, cx - 22, 96, 44, 76, '#2c2018'); poly(ctx, [cx - 22, 96, cx, 80, cx + 22, 96], '#2c2018'); rect(ctx, cx - 18, 142, 36, 8, '#4a2e2a');
  poly(ctx, [cx - 24, 100, cx + 8, 98, cx + 14, 150, cx - 4, 158, cx - 26, 146], '#1c1a1c');
  // 탁자
  const ty = 208; poly(ctx, [cx - 150, ty - 38, cx + 150, ty - 38, cx + 172, ty - 20, cx - 172, ty - 20], '#4a382a'); rect(ctx, cx - 172, ty - 20, 344, 7, '#2e2218'); for (const k of [-152, 144]) rect(ctx, cx + k, ty - 13, 8, 40, '#261c14');
  candle(v, cx, ty - 36, 12); pool(v, cx, ty - 38, 96, 30, '#ffb060', 0.2);
  // 유언장(봉인이 뜯겼다), 열쇠 꾸러미, 반으로 가른 장부, 작은 궤
  poly(ctx, [cx - 60, ty - 35, cx - 16, ty - 36, cx - 12, ty - 25, cx - 64, ty - 24], '#d8ccae'); for (let i = 0; i < 4; i++) stroke(ctx, [cx - 54, ty - 33 + i * 2.3, cx - 22, ty - 33.6 + i * 2.3], 0.6, '#5a4a3a'); oval(ctx, cx - 22, ty - 26, 3.2, 2.2, '#7a1a16'); stroke(ctx, [cx - 24, ty - 27, cx - 20, ty - 25], 0.7, '#2a0c0a');
  ctx.strokeStyle = '#b89a48'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx + 34, ty - 30, 5, 0, TAU); ctx.stroke(); for (const k of [0, 5, 10]) stroke(ctx, [cx + 38, ty - 28, cx + 48 + k * 0.6, ty - 25 + k * 0.5], 1.2, '#b89a48');
  rect(ctx, cx + 80, ty - 46, 34, 16, '#3a2a1c'); rect(ctx, cx + 80, ty - 49, 34, 5, '#5a4428'); rect(ctx, cx + 95, ty - 42, 4, 5, '#b89a48');
  // 나는 탁자 왼쪽에 서 있고, 형제는 오른쪽에서 등을 돌렸다. 가운데에 서기 노인.
  person(v, cx - 124, ty + 30, 108, mine(v, { raw: true, f: 1, arm: 'chest', rim: WARM, rimDir: 1 }));
  person(v, cx + 132, ty + 30, 108, kin(v, { raw: true, f: 1, cloak: true, rim: COLD, rimDir: -1 }));
  person(v, cx + 62, ty - 14, 76, folk(4, { raw: true, f: -1, old: true, robe: true, pose: 'sit' }));
  // 문가에서 지켜보는 막내
  person(v, cx - 214, ty + 22, 74, folk(1, { raw: true, f: 1, child: true }));
  ctx.restore(); finish(v, { inside: true });
}
/** 떠나는 형제: 새벽길로 멀어지는 등, 사립문에 남은 나 */
function siblingsLeave(v) {
  const { ctx, t } = v, dim = dimOf(v) || v.S.tod === 'dawn', rim = dim ? WARM : null; sky(v); far(v, { woods: true });
  const gy = (x) => 160 - fbm1(x / 200 + v.q, 3) * 8; ground(v, gy, { tufts: 130 });
  road(v, 250, 470, 150, { w: 120 });
  cottage(v, 110, 196, 120, 56, { lit: dim, snow: !!v.P.snow }); smoke(v, 140, 100, 44, 10, '#8a8478', 0.22);
  tree(v, 30, 200, 120); tree(v, 600, 176, 70);
  // 사립문과 울타리 (앞쪽, 사람 허리 높이)
  for (let x = 96; x < 420; x += 17) { if (x > 228 && x < 318) continue; poly(ctx, [x, 238, x, 204, x + 2.5, 199, x + 5, 204, x + 5, 238], t('#4a3a2a')); }
  for (const yy of [212, 226]) { stroke(ctx, [96, yy, 228, yy], 2.2, t('#3e3022')); stroke(ctx, [322, yy, 424, yy], 2.2, t('#3e3022')); }
  poly(ctx, [322, 204, 372, 190, 372, 226, 322, 238], rgba(t('#5a4630'), 0.92)); stroke(ctx, [322, 206, 372, 224], 1.6, t('#3e3022')); // 열어 둔 문짝
  // 길 저편의 형제: 봇짐과 지팡이, 돌아보지 않는다
  person(v, 430, 178, 44, kin(v, { f: 0, cloak: true, stick: 'staff', rim, rimDir: 1 })); oval(ctx, 426, 152, 6, 5, t('#5a4a36'));
  // 문 앞의 나, 내 옷자락을 잡은 어린 동생, 문턱의 어머니
  person(v, 274, 238, 96, mine(v, { f: 0, rim, rimDir: 1 }));
  person(v, 244, 239, 56, folk(1, { f: 0, child: true }));
  person(v, 168, 214, 70, folk(4, { f: 1, female: true, long: true, old: true, arm: 'chest' }));
  finish(v, { noLeaves: false });
}

/* ---------- 고대 유적 ---------- */
/** 무너진 회랑: 두 줄로 멀어지는 기둥, 쓰러진 토막, 틈으로 자란 나무 */
function ruinsHall(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { peaks: true });
  const gy = (x) => 150 - fbm1(x / 230 + v.q, 3) * 5; ground(v, gy, { tufts: 170, color: '#6f7458', color2: '#4a4e3c' });
  const st = '#8f887a', moss = t('#5a6a40');
  // 깔린 판석 길: 소실점으로 모인다
  const vx = 330, vy = 146; poly(ctx, [vx - 8, vy, vx + 8, vy, 470, VH, 190, VH], rgba(t('#7c776c'), 0.75));
  for (let i = 1; i < 9; i++) { const k = (i / 9) ** 2, y = vy + (VH - vy) * k, hw = 8 + 132 * k; stroke(ctx, [vx - hw, y, vx + hw, y], 0.8, rgba('#000000', 0.2)); }
  // 멀리 무너진 정면: 박공과 들보 한 토막
  rect(ctx, vx - 46, vy - 46, 8, 46, t(st)); rect(ctx, vx + 38, vy - 46, 8, 46, t(st)); rect(ctx, vx - 14, vy - 38, 7, 38, t(dark(st, 0.1)));
  poly(ctx, [vx - 52, vy - 46, vx + 20, vy - 46, vx + 14, vy - 54, vx - 52, vy - 56], t(st)); poly(ctx, [vx - 52, vy - 56, vx - 20, vy - 74, vx + 6, vy - 60, vx + 2, vy - 56], t(dark(st, 0.08)));
  // 두 줄 기둥 (먼 것부터)
  const rows = [[0.16, 1], [0.3, 0], [0.48, 1], [0.7, 0], [1, 1]];
  for (const [k, whole] of rows) for (const side of [-1, 1]) {
    const y = vy + (VH + 6 - vy) * k * 0.92, hw = 22 + 190 * k, w = 9 + 30 * k, h = (side < 0 ? (whole ? 1 : 0.46) : (whole ? 0.72 : 1)) * (60 + 190 * k);
    column(v, vx + side * hw, y, w, h, t(dark(st, 0.25 - k * 0.2)), { broken: side < 0 ? !whole : whole && k < 1 ? true : k === 1, moss });
  }
  // 아직 얹혀 있는 들보 한 토막 (오른쪽 가운데 두 기둥 위)
  poly(ctx, [vx + 106, 96, vx + 176, 44, vx + 184, 56, vx + 112, 108], t(dark(st, 0.12)));
  // 쓰러진 토막과 돌무더기
  drum(v, 178, 206, 15, 62, t(dark(st, 0.05)), -0.12); drum(v, 420, 190, 9, 34, t(dark(st, 0.14)), 0.2); drum(v, 86, 226, 20, 46, t(st), 0.05);
  rubble(v, 250, 222, 80, 10, t(dark(st, 0.1))); rubble(v, 470, 214, 60, 8, t(dark(st, 0.16)));
  // 틈으로 자란 나무와 덩굴
  tree(v, 520, 178, 96, { lean: -0.12 }); tree(v, 150, 168, 60);
  for (let i = 0; i < 26; i++) { const x = vx + 190 + hash(i, 4) * 26 - 13, y = 60 + hash(i, 5) * 150; oval(ctx, x, y, 3.4, 2.4, rgba(moss, 0.75)); }
  // 가운데에 선 사람: 크기를 알려 준다
  person(v, 318, 214, 46, mine(v, { f: 0, cloak: true, stick: 'staff', rim, rimDir: 1 }));
  person(v, 352, 206, 38, folk(3, { f: -1, hood: true }));
  crows(v, 400, 60, 4, 50);
  finish(v, { noLeaves: true });
}
/** 고대 문자: 횃불 아래 드러난 벽 가득한 글. 몇 글자가 옅게 빛난다 */
function ruinsGlyph(v) {
  const { ctx, R } = v; room(v, { wall: '#2e2c2a', floor: '#201e1c', fy: 180 });
  ctx.save(); zoom(v, 330, 240, 1.08);
  // 벽을 채운 큰 석판 세 장과 테두리
  const lit = [];
  for (const [x0, w] of [[70, 150], [236, 190], [442, 150]]) {
    rect(ctx, x0, 18, w, 150, '#3a3836'); rect(ctx, x0, 18, w, 4, '#48464a'); rect(ctx, x0, 164, w, 4, '#242224');
    for (let row = 0; row < 7; row++) for (let col = 0; col < Math.floor(w / 17); col++) {
      const gx = x0 + 12 + col * 17, gy = 34 + row * 19, seed = x0 * 7 + row * 31 + col;
      if (hash(seed, 9) < 0.07) continue; // 닳아 없어진 자리
      const glowing = hash(seed, 8) < 0.1 && Math.abs(gx - 330) < 150;
      glyph(ctx, gx, gy, 6.2, seed, glowing ? '#9fe0d0' : rgba('#0e0c0c', 0.72), glowing ? 1.3 : 1.1);
      if (!glowing) glyph(ctx, gx + 0.7, gy + 0.7, 6.2, seed, rgba('#7a766e', 0.25), 0.6);
      else lit.push([gx, gy]);
    }
  }
  // 갈라진 금과 떨어져 나간 조각
  stroke(ctx, [300, 18, 312, 60, 296, 96, 318, 140, 310, 168], 1.4, '#141212'); poly(ctx, [520, 120, 560, 108, 592, 132, 580, 168, 532, 168], '#262424');
  rubble(v, 556, 196, 70, 9, '#3a3836'); rubble(v, 120, 200, 50, 6, '#343230');
  // 횃불빛
  pool(v, 300, 110, 210, 120, '#ffa050', 0.26);
  for (const [gx, gy] of lit) glow(v, gx, gy, 12, '#7fe0d0', 0.34);
  // 횃불을 든 나, 무릎 꿇고 베껴 쓰는 학자, 뒤에서 망을 보는 일꾼
  person(v, 232, 238, 110, mine(v, { raw: true, f: 1, cloak: true, stick: 'torch', tilt: 0.06, rim: WARM, rimDir: 1 }));
  person(v, 384, 236, 100, { raw: true, f: -1, pose: 'kneel', cloth: '#4a3e52', hair: '#9a948a', old: true, robe: true, arm: 'fwd', rim: WARM, rimDir: -1 });
  poly(ctx, [338, 204, 372, 200, 376, 214, 342, 218], '#d8ccae'); for (let i = 0; i < 5; i++) glyph(ctx, 345 + i * 6, 209 - i * 0.7, 2.2, 400 + i, '#3a2e24', 0.6);
  person(v, 560, 236, 96, folk(2, { raw: true, f: 1, hood: true, stick: 'staff' }));
  // 먼지
  for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba('#ffd8a0', 0.1 + R() * 0.2); ctx.fillRect(180 + R() * 240, 30 + R() * 150, 1.2, 1.2); }
  ctx.restore(); finish(v, { inside: true });
}
/** 깨어나는 것: 벽에 반쯤 묻힌 거상. 가슴의 글줄에 빛이 돌고, 눈이 뜨인다 */
function ruinsWake(v) {
  const { ctx, R } = v; room(v, { wall: '#22242a', floor: '#191a1e', fy: 186 });
  ctx.save(); zoom(v, 330, 240, 1.04);
  const C = '#3a3d46', D = '#2a2c34', L = '#8fe6da';
  // 둥근 천장의 갈빗대와 양옆 기둥
  ctx.strokeStyle = '#1a1b20'; ctx.lineWidth = 7; for (const r of [300, 250, 200]) { ctx.beginPath(); ctx.arc(330, 220, r, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); }
  for (const x of [58, 602]) column(v, x, 190, 30, 170, '#2c2e36', {});
  // 거상: 앉은 채 고개를 숙였다. 어깨, 몸통, 무릎, 바닥에 놓인 손
  const cx = 330;
  ctx.save(); ctx.translate(cx, 190); ctx.scale(0.84, 0.84); ctx.translate(-cx, -190);
  poly(ctx, [cx - 120, 186, cx - 132, 96, cx - 96, 62, cx + 96, 62, cx + 132, 96, cx + 120, 186], C); // 몸통
  poly(ctx, [cx - 132, 96, cx - 172, 110, cx - 180, 186, cx - 120, 186], D); poly(ctx, [cx + 132, 96, cx + 172, 110, cx + 180, 186, cx + 120, 186], D); // 팔
  poly(ctx, [cx - 96, 186, cx - 100, 140, cx - 30, 132, cx - 22, 186], '#42454e'); poly(ctx, [cx + 96, 186, cx + 100, 140, cx + 30, 132, cx + 22, 186], '#42454e'); // 무릎
  poly(ctx, [cx - 36, 70, cx - 40, 26, cx - 22, 6, cx + 22, 6, cx + 40, 26, cx + 36, 70], '#40434c'); poly(ctx, [cx - 40, 26, cx + 40, 26, cx + 34, 40, cx - 34, 40], D); // 머리와 이마 그늘
  poly(ctx, [cx - 204, 186, cx - 200, 164, cx - 150, 160, cx - 146, 186], C); for (let i = 0; i < 4; i++) stroke(ctx, [cx - 192 + i * 13, 164, cx - 192 + i * 13, 186], 1, '#1c1d22'); // 손
  // 세월: 금, 떨어진 조각, 덮인 흙
  stroke(ctx, [cx - 60, 62, cx - 44, 100, cx - 66, 140], 1.6, '#14151a'); stroke(ctx, [cx + 80, 70, cx + 62, 118, cx + 84, 160], 1.4, '#14151a'); stroke(ctx, [cx + 10, 6, cx + 18, 30], 1.2, '#14151a');
  rubble(v, cx - 150, 204, 90, 10, '#30323a'); rubble(v, cx + 170, 206, 80, 9, '#2c2e36');
  // 가슴을 가로지르는 글줄: 가운데부터 불이 들어온다
  for (let row = 0; row < 3; row++) for (let i = -6; i <= 6; i++) {
    const gx = cx + i * 15, gy = 86 + row * 16, on = Math.abs(i) <= 4 - row * 1.5;
    glyph(ctx, gx, gy, 5.4, 900 + row * 40 + i, on ? L : rgba('#0c0c10', 0.7), on ? 1.3 : 1);
    if (on) glow(v, gx, gy, 10, '#6fe0d0', 0.22);
  }
  // 뜨이는 눈: 가는 틈 두 줄과 새어 나오는 빛
  for (const s of [-1, 1]) { poly(ctx, [cx + s * 9, 33, cx + s * 27, 31, cx + s * 27, 34.5, cx + s * 9, 35.5], '#d8fff6'); glow(v, cx + s * 18, 33, 22, '#7fe8dc', 0.5, 9); }
  glow(v, cx, 96, 150, '#4fc8c0', 0.16, 70); pool(v, cx, 200, 170, 26, '#4fc8c0', 0.16);
  ctx.restore();
  // 천장에서 떨어지는 돌가루
  for (let i = 0; i < 46; i++) { const x = cx - 190 + R() * 380, y = R() * 180; ctx.fillStyle = rgba('#c8ccd0', 0.14 + R() * 0.22); ctx.fillRect(x, y, 1, 2 + R() * 5); }
  // 발치의 사람들: 횃불을 든 채 물러서는 나, 주저앉은 길잡이
  person(v, 262, 240, 62, mine(v, { raw: true, f: 1, cloak: true, stick: 'torch', tilt: -0.1, rim: COLD, rimDir: 1 }));
  person(v, 216, 242, 54, folk(2, { raw: true, f: 1, pose: 'huddle', hood: true }));
  person(v, 420, 240, 58, { raw: true, f: -1, cloth: '#4a3e52', hair: '#9a948a', old: true, robe: true, arm: 'up', rim: COLD, rimDir: -1 });
  ctx.restore(); finish(v, { inside: true });
}
/** 도굴의 밤: 파헤친 구덩이, 삼각대와 밧줄에 매달린 석판, 가린 등불 */
function ruinsDig(v) {
  const { ctx, t } = v; sky(v); far(v, { woods: true });
  const gy = (x) => 156 - fbm1(x / 180 + v.q, 3) * 8; ground(v, gy, { tufts: 120, color: '#5a5a48', color2: '#3a3a30' });
  const st = '#7a756a';
  // 반쯤 묻힌 유적: 기운 기둥 둘과 문틀
  column(v, 110, 190, 26, 110, t(dark(st, 0.2)), { broken: true }); column(v, 560, 176, 20, 84, t(dark(st, 0.26)), {});
  rect(ctx, 470, 108, 10, 62, t(dark(st, 0.2))); rect(ctx, 520, 112, 10, 58, t(dark(st, 0.22))); poly(ctx, [462, 108, 538, 112, 536, 100, 464, 96], t(dark(st, 0.14)));
  // 구덩이와 파낸 흙더미
  ctx.fillStyle = '#0e0c0a'; ctx.beginPath(); ctx.ellipse(330, 214, 104, 22, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = t('#4a4032'); ctx.beginPath(); ctx.moveTo(150, 226); ctx.quadraticCurveTo(200, 176, 252, 222); ctx.fill(); ctx.beginPath(); ctx.moveTo(420, 216); ctx.quadraticCurveTo(470, 180, 516, 220); ctx.fill();
  // 삼각대와 도르래, 올라오는 석판
  for (const x of [262, 398, 336]) stroke(ctx, [x, 220, 330, 96], 3, t('#3a2c1e')); stroke(ctx, [330, 100, 330, 168], 1.2, '#c8b890');
  poly(ctx, [304, 168, 356, 168, 360, 204, 300, 204], t('#6e6a62')); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) glyph(ctx, 314 + i * 16, 178 + j * 14, 4.6, 70 + i * 3 + j, rgba('#16120e', 0.8), 1);
  // 가린 등불 하나: 빛이 한쪽으로만 샌다
  rect(ctx, 232, 204, 8, 12, '#1c1814'); rect(ctx, 236, 206, 4, 8, '#ffc870'); glow(v, 262, 206, 70, '#ffa850', 0.3, 30);
  // 밧줄을 당기는 둘, 구덩이를 들여다보는 나, 망보는 사람
  person(v, 430, 232, 84, folk(0, { f: -1, arm: 'fwd', hood: true, rim: WARM, rimDir: -1 })); person(v, 468, 236, 86, folk(4, { f: -1, arm: 'fwd', rim: WARM, rimDir: -1 }));
  stroke(ctx, [330, 100, 420, 190], 1.2, '#c8b890');
  person(v, 214, 238, 92, mine(v, { f: 1, pose: 'kneel', cloak: true, arm: 'fwd', rim: WARM, rimDir: 1 }));
  person(v, 86, 214, 62, folk(2, { f: -1, hood: true, cloak: true })); spear(v, 78, 214, 74, -0.04);
  finish(v, { noLeaves: true });
}

/* ---------- 기사단 ---------- */
/** 서약식: 높은 창의 빛 아래 무릎 꿇은 종자, 어깨에 얹힌 칼, 두 줄로 선 형제 기사들 */
function orderVow(v) {
  const { ctx } = v; room(v, { wall: '#3a3834', floor: '#2a2824', fy: 174 });
  ctx.save(); zoom(v, 330, 240, 1.08);
  // 기둥과 높은 창 셋, 빛줄기
  for (const x of [90, 210, 450, 570]) { rect(ctx, x - 12, 0, 24, 174, '#2e2c28'); rect(ctx, x - 16, 162, 32, 12, '#24221e'); rect(ctx, x - 16, 0, 32, 8, '#24221e'); }
  for (const x of [150, 330, 510]) windowAt(v, x, 10, x === 330 ? 44 : 34, x === 330 ? 110 : 96, { arch: true, bars: 3 });
  shaft(v, 330, 118, 40, 120, -30, '#ffe6b0', 0.2); shaft(v, 150, 104, 30, 120, 40, '#ffe6b0', 0.1); shaft(v, 510, 104, 30, 120, -70, '#ffe6b0', 0.12);
  // 기사단 깃발 둘
  for (const x of [262, 398]) { poly(ctx, [x - 16, 22, x + 16, 22, x + 16, 112, x, 100, x - 16, 112], '#cfc8b8'); sunSign(v, x, 60, 6, '#8a2a22'); rect(ctx, x - 20, 18, 40, 4, '#8a7038'); }
  // 제단과 촛불, 놓인 투구와 박차
  const ax = 330; rect(ctx, ax - 46, 138, 92, 36, '#4a463e'); rect(ctx, ax - 52, 132, 104, 7, '#5a564c'); poly(ctx, [ax - 40, 139, ax + 40, 139, ax + 40, 150, ax, 158, ax - 40, 150], '#8a2a22');
  for (const k of [-36, 36]) candle(v, ax + k, 132, 12); oval(ctx, ax, 126, 8, 7, '#8a8e96'); rect(ctx, ax - 8, 126, 16, 6, '#8a8e96');
  pool(v, ax - 20, 214, 120, 26, '#ffe0a0', 0.18);
  // 두 줄로 선 기사들: 등을 보인 앞줄, 마주 선 안쪽 줄
  for (const [x, h] of [[70, 92], [128, 96], [186, 90]]) knight(v, x, 226 + (x % 5), h, { raw: true, f: 1, rim: WARM, rimDir: 1 });
  for (const [x, h] of [[474, 90], [532, 96], [590, 92]]) knight(v, x, 226 + (x % 5), h, { raw: true, f: -1, rim: WARM, rimDir: -1 });
  // 가운데: 무릎 꿇은 나, 칼을 얹는 단장
  person(v, ax - 30, 232, 102, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'chest', rim: 'rgba(255,230,180,.7)', rimDir: 1 }));
  knight(v, ax + 44, 228, 110, { raw: true, f: -1, old: true, hair: '#b8b4ac', arm: 'fwd', rim: 'rgba(255,230,180,.6)', rimDir: -1 });
  stroke(ctx, [ax + 26, 170, ax - 22, 158], 2.2, '#d8dce0'); stroke(ctx, [ax + 30, 164, ax + 24, 176], 2.4, '#8a7038'); // 칼
  ctx.restore(); finish(v, { inside: true });
}
/** 기사단의 성채: 바위 위의 성, 긴 깃발, 굽은 길을 오르는 기수들 */
function orderKeep(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { peaks: true });
  const gy = (x) => 168 - fbm1(x / 220 + v.q, 3) * 8; ground(v, gy, { tufts: 120 });
  const st = t('#77726a'), sd = t('#59554f'), rf = t('#3e4654');
  // 바위 언덕
  ctx.fillStyle = t('#5e5a52'); ctx.beginPath(); ctx.moveTo(200, 176); ctx.lineTo(244, 120); ctx.lineTo(300, 104); ctx.lineTo(430, 100); ctx.lineTo(500, 122); ctx.lineTo(548, 178); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.2); ctx.beginPath(); ctx.moveTo(400, 102); ctx.lineTo(500, 122); ctx.lineTo(548, 178); ctx.lineTo(440, 178); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 14; i++) stroke(ctx, [230 + i * 22, 126 + hash(i, 2) * 30, 238 + i * 22, 150 + hash(i, 3) * 26], 0.8, rgba('#000000', 0.22));
  // 성벽과 흉벽
  rect(ctx, 270, 70, 190, 40, st); for (let x = 270; x < 460; x += 12) rect(ctx, x, 64, 7, 6, st); rect(ctx, 380, 70, 80, 40, sd);
  // 탑 넷과 가운데 큰 탑
  for (const [x, w, h, cone] of [[262, 24, 70, 1], [468, 24, 66, 1], [330, 20, 84, 0], [408, 18, 78, 0], [368, 42, 112, 1]]) {
    rect(ctx, x - w / 2, 110 - h, w, h, st); rect(ctx, x, 110 - h, w / 2, h, sd);
    for (let i = 0; i < 4; i++) rect(ctx, x - w / 2 + (i * w) / 3.4 - 1, 110 - h - 5, w / 6, 5, st);
    if (cone) poly(ctx, [x - w * 0.62, 110 - h - 4, x, 110 - h - w * 1.1, x + w * 0.62, 110 - h - 4], rf);
    for (let i = 0; i < Math.floor(h / 26); i++) rect(ctx, x - 1.5, 110 - h + 12 + i * 24, 3, 7, dim ? '#f2c070' : t('#1e1c1c'));
  }
  // 성문과 다리
  poly(ctx, [352, 110, 352, 90, 368, 80, 384, 90, 384, 110], t('#1c1816')); if (dim) glow(v, 368, 100, 22, '#ffb060', 0.3);
  // 긴 깃발: 흰 바탕에 붉은 표식
  banner(v, 368, -12, 26, '#cfc8b8', { len: 22, w: 16 }); banner(v, 262, 28, 18, '#cfc8b8'); banner(v, 468, 32, 18, '#cfc8b8');
  // 굽이굽이 오르는 길
  ctx.strokeStyle = rgba(t('#a8987a'), 0.8); ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(170, VH); ctx.quadraticCurveTo(250, 200, 330, 196); ctx.quadraticCurveTo(470, 190, 440, 160); ctx.quadraticCurveTo(410, 136, 368, 112); ctx.stroke();
  // 아랫마을의 지붕 몇 채, 순례자의 십자 표석
  cottage(v, 86, 204, 54, 26, { lit: dim }); cottage(v, 140, 192, 40, 20, { lit: dim }); tree(v, 30, 214, 86); tree(v, 606, 204, 76);
  rect(ctx, 552, 190, 4, 26, t('#6a665e')); rect(ctx, 545, 196, 18, 4, t('#6a665e'));
  // 길을 오르는 기수 셋(멀리), 길목에서 올려다보는 나와 말
  rider(v, 420, 170, 20, -1, { lance: false }); rider(v, 446, 180, 24, -1, { len: 1.3, pennon: '#8a2a22' });
  horseSil(v, 250, 232, 60, 1, '#4a3424', { tack: true }); person(v, 214, 236, 82, mine(v, { f: 1, cloak: true, rim, rimDir: 1 }));
  finish(v, { noLeaves: true });
}
/** 행군: 흰 망토의 기수들이 줄지어 길을 간다. 앞선 깃발, 창끝의 깃 */
function orderMarch(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { peaks: v.D.biome === 'mountain' || v.D.biome === 'cold' });
  const gy = (x) => 150 - fbm1(x / 240 + v.q, 3) * 7; ground(v, gy, { tufts: 150 });
  // 길: 오른쪽 멀리서 왼쪽 앞으로
  ctx.fillStyle = rgba(t(v.P.snow ? '#b9b3a8' : '#9a8a6c'), 0.82); ctx.beginPath(); ctx.moveTo(640, 150); ctx.lineTo(640, 160); ctx.quadraticCurveTo(360, 176, 150, VH); ctx.lineTo(-40, VH); ctx.quadraticCurveTo(300, 160, 640, 150); ctx.fill();
  // 길가의 표석과 마른 나무, 멀리 망루
  rect(ctx, 600, 116, 9, 34, t('#6a665e')); poly(ctx, [596, 116, 604.5, 106, 613, 116], t('#4a4640')); tree(v, 560, 156, 60, { bare: true }); tree(v, 24, 190, 100);
  // 먼 줄: 점점이 이어지는 창과 망토
  for (let i = 0; i < 9; i++) { const x = 628 - i * 22, y = 153 + i * 1.2, h = 14 + i * 1.3; rect(ctx, x - 3, y - h, 6, h * 0.6, t('#c8c2b2')); rect(ctx, x - 4, y - h * 0.5, 8, h * 0.5, t('#3a2c24')); stroke(ctx, [x + 3, y - h * 0.6, x + 4, y - h * 1.9], 0.8, t('#2a2420')); }
  // 가운데 줄
  rider(v, 420, 180, 34, -1, { pennon: '#8a2a22', rim }); rider(v, 372, 186, 40, -1, { coat: '#5a4634', rim }); rider(v, 318, 194, 48, -1, { pennon: '#8a2a22', coat: '#2a2220', rim });
  // 앞줄: 나, 기수(깃발), 늙은 기사
  rider(v, 232, 212, 66, -1, { coat: '#6a4a30', who: mine(v, { hat: false }), blanket: '#8a2a22', rim, lance: false });
  rider(v, 136, 228, 80, -1, { coat: '#2e2622', lance: false, rim }); banner(v, 116, 196, 132, '#cfc8b8', { d: 1, w: 44, len: 58 }); sunSign(v, 138, 88, 6.5, t('#8a2a22'));
  rider(v, 40, 246, 92, -1, { coat: '#8a8478', pennon: '#8a2a22', len: 1.3, rim });
  // 말발굽이 일으킨 먼지
  for (let i = 0; i < 12; i++) glow(v, 60 + i * 34, 232 - i * 6, 22, v.P.snow ? '#e8ecee' : '#c8b490', 0.07);
  // 길가에서 모자를 벗은 농부와 아이
  person(v, 500, 214, 62, folk(0, { f: -1, arm: 'chest', old: true })); person(v, 530, 216, 40, folk(1, { f: -1, child: true }));
  finish(v, { noLeaves: true });
}
/** 무너진 날: 불타는 성채, 땅에 떨어진 깃발, 쌓인 방패, 사슬에 묶여 무릎 꿇은 기사들 */
function orderFall(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true });
  const gy = (x) => 160 - fbm1(x / 200 + v.q, 3) * 8; ground(v, gy, { tufts: 110, color: '#5a5444', color2: '#3a352c' });
  // 멀리 불타는 성채
  const st = t('#4a4640'); rect(ctx, 400, 96, 150, 50, st); for (let x = 400; x < 550; x += 12) rect(ctx, x, 91, 7, 5, st);
  for (const [x, w, h] of [[410, 22, 74], [476, 30, 100], [540, 22, 66]]) { rect(ctx, x - w / 2, 146 - h, w, h, st); for (let i = 0; i < 3; i++) rect(ctx, x - 1.5, 146 - h + 12 + i * 20, 3, 7, '#ff9a40'); }
  poly(ctx, [461, 46, 468, 30, 476, 44, 484, 34, 491, 46], st); // 깨진 탑 꼭대기
  blaze(v, 476, 60, 44, 54); blaze(v, 420, 96, 30, 30); smoke(v, 476, 40, 110, 30, '#1c1a1a', 0.42); smoke(v, 424, 80, 70, 18, '#242020', 0.3);
  glow(v, 470, 110, 150, '#ff7a30', 0.2, 70);
  // 땅에 떨어진 깃발: 진흙 묻은 흰 천, 부러진 장대
  stroke(ctx, [70, 232, 150, 206], 3, t('#2e241a')); stroke(ctx, [150, 206, 176, 214], 3, t('#2e241a'));
  ctx.fillStyle = t('#b8b0a0'); ctx.beginPath(); ctx.moveTo(84, 228); ctx.quadraticCurveTo(120, 210, 150, 222); ctx.quadraticCurveTo(170, 236, 136, 240); ctx.quadraticCurveTo(100, 244, 84, 228); ctx.fill(); sunSign(v, 122, 228, 5, t('#7a2a22')); oval(ctx, 142, 234, 12, 4, rgba(t('#3a3026'), 0.7));
  // 쌓아 놓은 방패와 칼
  for (const [x, y, a] of [[232, 226, -0.3], [252, 230, 0.2], [270, 224, 0.5], [246, 216, 0]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); poly(ctx, [-9, -12, 9, -12, 9, 2, 0, 12, -9, 2], t('#b0a898')); ctx.strokeStyle = t('#7a2a22'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -3, 4, 0, TAU); ctx.stroke(); ctx.restore(); }
  for (const k of [0, 9, 17]) stroke(ctx, [290 + k, 232, 318 + k, 204 - k * 0.4], 1.6, t('#b8bcc0'));
  // 무릎 꿇은 기사 넷: 망토가 벗겨지고 손이 묶였다. 이어진 사슬
  const xs = [352, 402, 452, 502];
  xs.forEach((x, i) => { if (i === 1) person(v, x, 234, 84, mine(v, { f: -1, pose: 'kneel', rim: WARM, rimDir: 1 })); else person(v, x, 234 + (i % 2) * 2, 84, { f: -1, pose: 'kneel', cloth: MAIL, hair: HR[i + 1], old: i === 3, rim: WARM, rimDir: 1 }); });
  ctx.strokeStyle = t('#1c1a18'); ctx.lineWidth = 1.6; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(340, 206); for (const x of xs) ctx.quadraticCurveTo(x + 14, 216, x + 36, 206); ctx.stroke(); ctx.setLineDash([]);
  // 지키는 병사들과 문서를 읽는 관리
  person(v, 566, 238, 96, { f: -1, cloth: '#3a3e4a', hair: '#1c1614', hat: true, rim: WARM, rimDir: -1 }); spear(v, 580, 238, 120, 0.03);
  person(v, 612, 240, 98, { f: -1, cloth: '#3a3e4a', hair: '#2a1e16', hat: true }); spear(v, 626, 240, 122, -0.02);
  person(v, 310, 240, 96, { f: 1, cloth: '#4a2e2a', hair: '#8a8478', old: true, robe: true, arm: 'fwd' }); poly(ctx, [322, 176, 340, 174, 342, 192, 324, 194], t('#d8ccae'));
  torch(v, 196, 238, 64, 5);
  crows(v, 300, 70, 6, 80);
  finish(v, { noLeaves: true });
}

export const PLATES10 = {
  /** 형제자매. variant: home(함께 자란 집) split(갈라선 상속 자리) leave(떠나는 형제) */
  siblings(v) { const k = v.variant ?? 'home'; return k === 'split' ? siblingsSplit(v) : k === 'leave' ? siblingsLeave(v) : siblingsHome(v); },
  /** 고대 유적. variant: hall(무너진 회랑) glyph(고대 문자) wake(깨어나는 것) dig(도굴의 밤) */
  ruins(v) { const k = v.variant ?? 'hall'; return k === 'glyph' ? ruinsGlyph(v) : k === 'wake' ? ruinsWake(v) : k === 'dig' ? ruinsDig(v) : ruinsHall(v); },
  /** 기사단. variant: vow(서약식) keep(성채) march(행군) fall(무너진 날) */
  order(v) { const k = v.variant ?? 'vow'; return k === 'keep' ? orderKeep(v) : k === 'march' ? orderMarch(v) : k === 'fall' ? orderFall(v) : orderVow(v); },
};
