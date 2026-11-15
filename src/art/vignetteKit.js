// 사건 삽화에 함께 쓰는 연장: 바탕(하늘·먼 산·땅·방 안), 사람, 나무, 불빛, 마무리.
// 그림 크기는 640x240 눈금으로 생각하고 그린다. 풍경 그림(scene*)의 하늘·날씨·빛깔을 그대로 빌려 쓴다.
import { W, H, hash, fbm1, ridged1, mixh, rgba, dark, light, puff, vgrad, grain } from './sceneKit.js';
import { paintSky, paintWeather } from './sceneSky.js';

export const VW = 640, VH = 240, HZ = 124;
const TAU = Math.PI * 2;

/** 때와 날씨에 맞춰 빛깔을 가라앉힌다 (불빛처럼 스스로 빛나는 것은 거치지 않는다) */
export function toner(S) {
  if (S.tod === 'night') return (c) => mixh(c, '#0b1124', 0.64);
  if (S.tod === 'dusk') return (c) => mixh(mixh(c, '#e2854c', S.overcast ? 0.08 : 0.2), '#241c3a', 0.26);
  if (S.tod === 'dawn') return (c) => mixh(mixh(c, '#f0b88a', S.overcast ? 0.06 : 0.16), '#414c74', 0.16);
  if (S.overcast) return (c) => mixh(c, '#727880', S.heavy ? 0.3 : 0.2);
  return (c) => c;
}

/* ---------- 바깥 바탕 ---------- */
function curve(ctx, fn, fill, bottom = VH) {
  ctx.beginPath(); ctx.moveTo(0, bottom);
  for (let x = 0; x <= VW; x += 4) ctx.lineTo(x, fn(x));
  ctx.lineTo(VW, bottom); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
/** 하늘 (풍경 그림과 같은 하늘) */
export function sky(v) {
  const { ctx } = v;
  ctx.save(); ctx.scale(VW / W, VH / H); paintSky(ctx, v.S, v.R, v.k); ctx.restore();
}
/** 먼 산과 언덕. o.sea면 수평선과 바다. 돌려주는 값: 땅이 시작하는 높이 함수 */
export function far(v, o = {}) {
  const { ctx, S, P, D, t, q } = v;
  const high = D.biome === 'mountain' || D.biome === 'cold' || o.peaks;
  const c1 = t(mixh(P.far, S.haze, 0.62)), c2 = t(mixh(P.far, S.haze, 0.36));
  if (high) {
    const f1 = (x) => HZ - 6 - ridged1(x / 120 + q, 5) * 62;
    curve(ctx, f1, c1);
    // 눈 덮인 봉우리의 밝은 면
    ctx.save(); ctx.beginPath(); for (let x = 0; x <= VW; x += 4) ctx.lineTo(x, f1(x)); ctx.lineTo(VW, HZ - 34); ctx.lineTo(0, HZ - 34); ctx.closePath(); ctx.clip();
    ctx.fillStyle = rgba(t('#eef0ee'), 0.5); ctx.fillRect(0, 0, VW, HZ - 34); ctx.restore();
  }
  curve(ctx, (x) => HZ + 2 - fbm1(x / 130 + q, 9, 3) * (high ? 26 : 22), high ? c2 : c1);
  if (o.sea) {
    ctx.fillStyle = vgrad(ctx, HZ, VH, [[0, t(mixh(P.water, S.low, 0.6))], [0.4, t(P.water)], [1, t(dark(P.water, 0.35))]]);
    ctx.fillRect(0, HZ, VW, VH - HZ);
    return () => HZ;
  }
  curve(ctx, (x) => HZ + 12 - fbm1(x / 90 + q * 2, 15, 3) * 20, t(mixh(P.hill, S.haze, 0.42)));
  // 숲 띠
  if (D.biome === 'forest' || o.woods) { ctx.fillStyle = t(mixh(P.conifer, S.haze, 0.3)); for (let x = -4; x < VW; x += 5) { const h = 8 + hash(x, 3) * 12, y = HZ + 16 - fbm1(x / 90 + q * 2, 15, 3) * 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - h); ctx.lineTo(x + 8, y); ctx.fill(); } }
  ctx.fillStyle = rgba(S.haze, 0.22); ctx.fillRect(0, HZ - 10, VW, 34);
  return (x) => HZ + 16;
}
/** 멀리 보이는 마을이나 성. cx 둘레에 지붕 몇 채와 첨탑, 저녁이면 창에 불 */
export function townFar(v, cx, y, o = {}) {
  const { ctx, S, D, t, R } = v, s = o.s ?? 1, lit = S.tod === 'night' || S.tod === 'dusk';
  const wall = t(mixh(D.white ? '#d8d2c4' : '#8a7a68', S.haze, 0.3)), roof = t(mixh('#5e4436', S.haze, 0.3));
  const n = o.n ?? ({ capital: 16, city: 13, town: 11, fort: 5 }[D.size] ?? 8);
  if (D.wall || o.keep) { // 성채
    const kx = cx + 30 * s, kw = 26 * s, kh = 34 * s;
    ctx.fillStyle = wall; ctx.fillRect(kx - kw / 2, y - kh, kw, kh);
    for (let i = 0; i < 4; i++) ctx.fillRect(kx - kw / 2 + i * kw / 3.5 - 1, y - kh - 3 * s, kw / 7, 3 * s);
    ctx.fillRect(kx - kw, y - kh * 0.5, kw * 2, kh * 0.5);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(kx + kw * 0.7, y - kh * 0.5); ctx.lineTo(kx + kw * 0.85, y - kh * 0.95); ctx.lineTo(kx + kw, y - kh * 0.5); ctx.fill();
  }
  for (let i = 0; i < n; i++) {
    const x = cx + (R() - 0.5) * 150 * s, w = (9 + R() * 8) * s, h = (6 + R() * 5) * s, yy = y + R() * 4;
    ctx.fillStyle = wall; ctx.fillRect(x - w / 2, yy - h, w, h);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - w / 2 - 1, yy - h); ctx.lineTo(x, yy - h - w * 0.5); ctx.lineTo(x + w / 2 + 1, yy - h); ctx.fill();
    if (lit && R() < 0.7) { ctx.fillStyle = '#f2c070'; ctx.fillRect(x - 1, yy - h + 2, 2 * s, 2.4 * s); }
  }
  if (!o.noSpire) { // 예배당 첨탑
    const x = cx - 22 * s; ctx.fillStyle = wall; ctx.fillRect(x - 3 * s, y - 24 * s, 6 * s, 24 * s);
    ctx.fillStyle = roof; ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 24 * s); ctx.lineTo(x, y - 40 * s); ctx.lineTo(x + 4 * s, y - 24 * s); ctx.fill();
  }
}
/** 땅: fn(x) 높이에서 아래까지. 눈이 왔으면 흰 땅 */
export function ground(v, fn, o = {}) {
  const { ctx, P, S, t, R } = v;
  const base = o.color ?? (P.snow ? '#d9dee0' : P.grass), c0 = t(mixh(base, S.haze, o.haze ?? 0.12)), c1 = t(dark(P.snow ? '#aab4bc' : (o.color2 ?? P.grass2), 0.3));
  const y0 = Math.min(fn(0), fn(VW / 2), fn(VW));
  curve(ctx, fn, vgrad(ctx, y0 - 8, VH, [[0, c0], [0.55, t(mixh(base, P.snow ? '#aab4bc' : P.grass2, 0.6))], [1, c1]]));
  if (o.plain) return;
  // 풀 자국 (눈밭이면 마른 풀대)
  const n = o.tufts ?? 150;
  for (let i = 0; i < n; i++) {
    const x = R() * VW, d = R(), y = fn(x) + 3 + d * d * (VH - fn(x)), h = 2 + d * 6;
    ctx.strokeStyle = rgba(t(P.snow ? '#7a7466' : R() < 0.5 ? light(base, 0.2) : dark(base, 0.3)), P.snow ? 0.4 : 0.5); ctx.lineWidth = 0.8 + d * 0.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 3 + S.dir, y - h); ctx.stroke();
  }
}
/** 흙길: 앞에서 (x1,y1)로 좁아지며 멀어진다 */
export function road(v, x0, x1, y1, o = {}) {
  const { ctx, P, t } = v, w0 = o.w ?? 90;
  ctx.fillStyle = rgba(t(P.snow ? '#b9b3a8' : mixh(P.soil, '#b09a74', 0.45)), 0.85);
  ctx.beginPath(); ctx.moveTo(x0 - w0 / 2, VH); ctx.quadraticCurveTo((x0 + x1) / 2 - w0 * 0.3, (VH + y1) / 2, x1 - 3, y1); ctx.lineTo(x1 + 3, y1);
  ctx.quadraticCurveTo((x0 + x1) / 2 + w0 * 0.34, (VH + y1) / 2, x0 + w0 / 2, VH); ctx.closePath(); ctx.fill();
}

/* ---------- 방 안 바탕 ---------- */
/** 돌벽 방. o: wall, floor 빛깔, fy 바닥선. 벽돌 줄눈을 옅게 긋는다 */
export function room(v, o = {}) {
  const { ctx, R } = v, fy = o.fy ?? 176, wall = o.wall ?? '#3a3028', floor = o.floor ?? '#2a221c';
  ctx.fillStyle = vgrad(ctx, 0, fy, [[0, dark(wall, 0.45)], [1, wall]]); ctx.fillRect(0, 0, VW, fy);
  if (o.stone !== false) {
    ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = 1;
    for (let y = 10; y < fy; y += 17) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); for (let x = (y / 17 % 2) * 20 + R() * 6; x < VW; x += 40) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 17); ctx.stroke(); } }
  } else { // 나무 벽
    ctx.strokeStyle = rgba('#000000', 0.2); ctx.lineWidth = 1;
    for (let x = 14; x < VW; x += 30 + R() * 8) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, fy); ctx.stroke(); }
  }
  ctx.fillStyle = vgrad(ctx, fy, VH, [[0, floor], [1, dark(floor, 0.5)]]); ctx.fillRect(0, fy, VW, VH - fy + 40);
  ctx.strokeStyle = rgba('#000000', 0.22);
  for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(VW / 2 + i * 44, fy); ctx.lineTo(VW / 2 + i * 120, VH); ctx.stroke(); }
  return fy;
}
/** 창: 바깥 하늘빛이 비친다. arch면 위가 둥글다. 돌려주는 값은 없음 */
export function windowAt(v, x, y, w, h, o = {}) {
  const { ctx, S } = v;
  ctx.save(); ctx.beginPath();
  if (o.arch) { ctx.moveTo(x - w / 2, y + h); ctx.lineTo(x - w / 2, y + w / 2); ctx.arc(x, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w / 2, y + h); } else ctx.rect(x - w / 2, y, w, h);
  ctx.closePath(); ctx.fillStyle = '#17120e'; ctx.fill(); ctx.clip();
  ctx.fillStyle = vgrad(ctx, y, y + h, [[0, S.mid], [1, S.low]]); ctx.fillRect(x - w / 2 + 2, y + 2, w - 4, h - 3);
  if (S.tod === 'night') { ctx.fillStyle = '#e8e2c8'; for (let i = 0; i < 5; i++) ctx.fillRect(x - w / 2 + 4 + hash(i, v.k) * (w - 8), y + 4 + hash(i, v.k + 9) * (h - 8), 1, 1); }
  if (v.P.snow || S.weather === 'snow') { ctx.fillStyle = 'rgba(240,242,240,.8)'; for (let i = 0; i < 9; i++) ctx.fillRect(x - w / 2 + 3 + hash(i, 5) * (w - 6), y + 3 + hash(i, 6) * (h - 6), 1.4, 1.4); }
  ctx.strokeStyle = '#17120e'; ctx.lineWidth = 2;
  if (o.bars) for (let i = 1; i < o.bars; i++) { const bx = x - w / 2 + (w * i) / o.bars; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + h); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.moveTo(x - w / 2, y + h * 0.5); ctx.lineTo(x + w / 2, y + h * 0.5); ctx.stroke(); }
  ctx.restore();
}
/** 창에서 비스듬히 떨어지는 빛줄기 */
export function shaft(v, x, y, w, len, dx, color, a = 0.16) {
  const { ctx } = v;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(x, y, x + dx, y + len); g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + dx + w * 1.3, y + len); ctx.lineTo(x + dx - w * 0.9, y + len); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ---------- 빛 ---------- */
export function glow(v, x, y, r, color, a = 0.5, ry = r) {
  const { ctx } = v; ctx.save(); ctx.globalCompositeOperation = 'lighter'; puff(ctx, x, y, r, ry, color, a); ctx.restore();
}
/** 불꽃 (모닥불·횃불·촛불). s는 크기 */
export function flame(v, x, y, s) {
  const { ctx, R } = v;
  glow(v, x, y - s, s * 5.5, '#ff9a48', 0.34); glow(v, x, y - s * 0.6, s * 2.4, '#ffd08a', 0.5);
  for (const [c, k] of [['#e8602a', 1], ['#ffb04a', 0.68], ['#fff0b8', 0.36]]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - s * 0.5 * k, y);
    ctx.quadraticCurveTo(x - s * 0.7 * k, y - s * 0.9 * k, x + (R() - 0.5) * s * 0.5, y - s * 2.1 * k);
    ctx.quadraticCurveTo(x + s * 0.7 * k, y - s * 0.9 * k, x + s * 0.5 * k, y); ctx.closePath(); ctx.fill();
  }
}
/** 크게 타오르는 불: 빛 덩어리를 겹쳐 올린다 */
export function blaze(v, x, y, w, h) {
  const { ctx, R } = v; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) { const k = R(), px = x + (R() - 0.5) * w * (1 - k * 0.55), py = y - k * h, r = w * 0.17 * (1.25 - k); puff(ctx, px, py, r, r * 1.5, k < 0.3 ? '#ffd080' : k < 0.65 ? '#ff8428' : '#b83c18', 0.42 * (1 - k * 0.55)); }
  for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba('#ffc060', 0.3 + R() * 0.6); ctx.fillRect(x + (R() - 0.5) * w * 1.3, y - h * (0.5 + R() * 1.3), 1.3, 1.3); }
  ctx.restore();
}
/** 그림의 한 점을 중심으로 키운다 (부른 쪽에서 ctx.save / restore) */
export function zoom(v, cx, cy, k) { v.ctx.translate(cx, cy); v.ctx.scale(k, k); v.ctx.translate(-cx, -cy); }
export function candle(v, x, y, h = 7) {
  const { ctx } = v; ctx.fillStyle = '#d8ccb0'; ctx.fillRect(x - 1, y - h, 2, h);
  glow(v, x, y - h - 2, 16, '#ffb860', 0.4); ctx.fillStyle = '#ffe6a8'; ctx.beginPath(); ctx.ellipse(x, y - h - 2, 1.1, 2.4, 0, 0, TAU); ctx.fill();
}
/** 바닥에 고인 불빛 */
export function pool(v, x, y, rx, ry, color = '#ff9a48', a = 0.3) { glow(v, x, y, rx, color, a, ry); }
/** 피어오르는 연기 */
export function smoke(v, x, y, hgt, w, color = '#2a2622', a = 0.3) {
  const { ctx, R, S } = v;
  for (let i = 0; i < 16; i++) { const k = i / 16; puff(ctx, x + S.dir * k * k * hgt * 0.5 + (R() - 0.5) * w * k, y - k * hgt, w * (0.3 + k), w * (0.26 + k * 0.7), color, a * (1 - k * 0.75)); }
}

/* ---------- 사람 ---------- */
const HAIR = ['#2a1e16', '#4a3220', '#6e4a28', '#9a7a48', '#1c1a1c', '#7a3a22', '#c0a468'];
const CLOTH = ['#5a4636', '#4a5240', '#5a3a34', '#3e4658', '#6a5a3c', '#44403c', '#584460'];
/** 게임 속 사람 → 그림 속 사람 차림 (머리 빛깔·옷 빛깔은 사람마다 늘 같다) */
export function lookFor(p, fallbackSeed = 1) {
  const seed = p ? (typeof p.id === 'number' ? p.id * 7 + 3 : [...String(p.id ?? p.name ?? '')].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)) : fallbackSeed;
  const age = p ? (p.ageMonths ?? 300) / 12 : 30;
  const hair = age > 62 ? '#b8b4ac' : age > 50 ? mixh(HAIR[Math.floor(hash(seed, 1) * HAIR.length)], '#a8a49c', 0.55) : HAIR[Math.floor(hash(seed, 1) * HAIR.length)];
  return { female: p ? p.sex === 'f' : hash(seed, 3) < 0.5, age, hair, cloth: CLOTH[Math.floor(hash(seed, 2) * CLOTH.length)], long: hash(seed, 4) < 0.6 };
}
/**
 * 사람 한 명. 발끝이 (x, y), 키가 h.
 * o: pose 'stand'|'kneel'|'bow'|'sit'|'huddle', f 얼굴 방향(-1 왼쪽, 1 오른쪽, 0 등 돌림), cloth, hair, female, long(긴 머리), hood, veil, hat, robe(긴 옷), cloak,
 *    arm 'up'|'out'|'fwd'|'chest'|null, child, old(굽은 등), skin, rim(빛 받는 쪽 테두리 빛깔), stick 'staff'|'spear'|'torch'|'crook', raw(빛깔을 가라앉히지 않음)
 */
export function person(v, x, y, h, o = {}) {
  const { ctx, t, S } = v;
  const pose = o.pose ?? 'stand', f = o.f ?? 0, d = f || 1, female = !!o.female, robe = !!o.robe, skirt = female || robe;
  const tone = (c) => (o.raw ? c : t(c));
  const cloth = tone(o.cloth ?? '#4a4038'), hair = tone(o.hair ?? '#2a1e16'), skin = tone(o.skin ?? '#c9a184');
  const legs = tone(dark(o.cloth ?? '#4a4038', 0.45)), sleeve = tone(dark(o.cloth ?? '#4a4038', 0.14));
  const s = h / 100, sw = female ? 10.5 : 13, wst = female ? 6.5 : robe ? 11 : 9;
  const drop = pose === 'kneel' ? 24 : pose === 'sit' ? 20 : 0;                 // 윗몸이 내려앉는 만큼
  const lean = pose === 'bow' ? 0.06 : o.old ? 0.09 : 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * d, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
  if (pose === 'huddle') { // 바닥에 웅크려 앉음
    ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-16, -30, -2, -44); ctx.quadraticCurveTo(8, -46, 12, -38); ctx.lineTo(20, -30); ctx.lineTo(30, 0); ctx.closePath(); ctx.fill();
    line([20, -30, 30, -2], 8, legs); line([4, -38, 14, -24, 22, -28], 6, sleeve);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(11, -49, 7.4, 0, TAU); ctx.fill();
    ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(9.5, -51, 7.6, Math.PI * 0.75, Math.PI * 1.95); ctx.fill();
    if (o.long || female) { ctx.beginPath(); ctx.moveTo(3, -54); ctx.quadraticCurveTo(-6, -42, -2, -30); ctx.lineTo(4, -36); ctx.closePath(); ctx.fill(); }
    if (o.rim) line([-13, -4, -14, -30, -2, -44], 1.3, o.rim);
    ctx.restore(); return;
  }
  // 다리와 아랫도리
  if (pose === 'kneel') {
    if (skirt) { ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-wst, -34); ctx.lineTo(wst, -34); ctx.quadraticCurveTo(22, -20, 24, 0); ctx.lineTo(-30, 0); ctx.quadraticCurveTo(-22, -16, -wst, -34); ctx.fill(); }
    else { line([-2, -28, -4, -4, -26, -3], 8.5, legs); line([3, -28, 19, -25, 19, -2], 8.5, legs); }
  } else if (pose === 'sit') {
    if (skirt) { ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-wst, -38); ctx.lineTo(wst, -40); ctx.lineTo(24, -36); ctx.lineTo(27, 0); ctx.lineTo(9, 0); ctx.lineTo(7, -24); ctx.lineTo(-wst, -24); ctx.fill(); }
    else line([0, -30, 20, -30, 21, -2], 8.5, legs);
  }
  ctx.rotate(lean);
  ctx.translate(0, drop);
  if (o.cloak || o.hood) { ctx.fillStyle = tone(dark(o.cloth ?? '#4a4038', 0.3)); ctx.beginPath(); ctx.moveTo(-sw - 1, -80); ctx.lineTo(sw + 1, -80); ctx.lineTo(15, -20 - drop * 0.4); ctx.lineTo(-16, -18 - drop * 0.4); ctx.fill(); }
  if (pose === 'stand' || pose === 'bow') {
    if (skirt) { ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-wst, -60); ctx.lineTo(wst, -60); ctx.quadraticCurveTo(robe && !female ? 13 : 15, -30, robe && !female ? 14 : 18, 0); ctx.lineTo(robe && !female ? -14 : -18, 0); ctx.quadraticCurveTo(robe && !female ? -13 : -15, -30, -wst, -60); ctx.fill(); }
    else { ctx.fillStyle = legs; ctx.beginPath(); ctx.moveTo(-8, -48); ctx.lineTo(-0.6, -48); ctx.lineTo(-1.6, 0); ctx.lineTo(-8.6, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(0.6, -48); ctx.lineTo(8, -48); ctx.lineTo(8.6, 0); ctx.lineTo(1.6, 0); ctx.fill(); }
  }
  // 윗몸
  ctx.fillStyle = cloth; ctx.beginPath(); ctx.moveTo(-sw, -79); ctx.quadraticCurveTo(0, -86, sw, -79); ctx.lineTo(wst, -59);
  if (skirt) ctx.lineTo(-wst, -59); else { ctx.lineTo(wst + 2, -42); ctx.lineTo(-wst - 2, -42); ctx.lineTo(-wst, -59); }
  ctx.closePath(); ctx.fill();
  if (!skirt) { ctx.fillStyle = tone(dark(o.cloth ?? '#4a4038', 0.5)); ctx.fillRect(-wst - 0.5, -60, wst * 2 + 1, 2.4); }
  // 팔
  const aw = female ? 4.2 : 5.2, hand = (hx2, hy2) => { ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hx2, hy2, 2.3, 0, TAU); ctx.fill(); };
  const rest = (sx) => { line([sx * (sw - 1.5), -77, sx * (sw + 0.5), -52], aw, sleeve); hand(sx * (sw + 0.5), -50); };
  if (o.arm === 'up') { line([sw - 2, -77, 20, -101], aw, sleeve); line([-sw + 2, -77, -20, -101], aw, sleeve); hand(20.5, -103); hand(-20.5, -103); }
  else if (o.arm === 'out') { rest(-1); line([sw - 2, -77, 30, -72], aw, sleeve); hand(32, -72); }
  else if (o.arm === 'fwd') { rest(-1); line([sw - 2, -77, 17, -64, 27, -58], aw, sleeve); hand(29, -57); }
  else if (o.arm === 'chest') { line([sw - 2, -77, 12, -62, 2, -66], aw, sleeve); line([-sw + 2, -77, -12, -62, -1, -64], aw, sleeve); }
  else { rest(-1); rest(1); }
  // 빛 받는 쪽 테두리
  const rim = o.rim ?? (S.tod === 'night' ? null : rgba(S.lit, 0.4));
  if (rim) { const ls = (o.rimDir ?? S.dir) * d; ctx.strokeStyle = rim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ls * sw, -79); ctx.lineTo(ls * (wst + (o.arm ? 0 : 5)), -59); if (pose === 'stand' || pose === 'bow') ctx.lineTo(ls * (skirt ? 16 : 8.5), -2); ctx.stroke(); }
  // 목과 머리
  const r = o.child ? 9.6 : 7.2, hy = -86 - r + (pose === 'bow' ? 4 : 0), hx = pose === 'bow' ? 4.5 : 0;
  ctx.fillStyle = f ? skin : hair; ctx.fillRect(-2.6, -87, 5.2, 5);
  if (o.hood) {
    ctx.fillStyle = cloth; ctx.beginPath(); ctx.arc(hx, hy, r * 1.22, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(hx - r * 1.2, hy); ctx.lineTo(-sw + 1, -77); ctx.lineTo(sw - 1, -77); ctx.lineTo(hx + r * 1.2, hy); ctx.fill();
    if (f) { ctx.fillStyle = tone(dark(o.skin ?? '#c9a184', 0.4)); ctx.beginPath(); ctx.arc(hx + r * 0.45, hy + r * 0.15, r * 0.66, 0, TAU); ctx.fill(); }
  } else {
    ctx.fillStyle = f ? skin : hair; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = hair;
    if (f) { ctx.beginPath(); ctx.arc(hx - 0.8, hy - 0.6, r * 1.06, Math.PI * 0.62, Math.PI * 1.78); ctx.fill(); }
    if (o.long || female) { ctx.beginPath(); if (f) { ctx.moveTo(hx - r, hy - 2); ctx.quadraticCurveTo(hx - r * 1.9, hy + r * 1.6, hx - r * 0.9, hy + r * (female ? 3.3 : 2.1)); ctx.lineTo(hx - r * 0.1, hy + r * 1.1); } else { ctx.moveTo(hx - r, hy); ctx.lineTo(hx - r * 1.05, hy + r * (female ? 3 : 1.9)); ctx.lineTo(hx + r * 1.05, hy + r * (female ? 3 : 1.9)); ctx.lineTo(hx + r, hy); } ctx.closePath(); ctx.fill(); }
    if (o.veil) { ctx.fillStyle = rgba(tone('#f0ece0'), 0.78); ctx.beginPath(); ctx.moveTo(hx + r * 0.5, hy - r * 1.05); ctx.quadraticCurveTo(hx - r * 1.4, hy - r * 1.3, hx - r * 1.3, hy + r * 0.6); ctx.lineTo(hx - r * 2.6, hy + r * 6.4); ctx.lineTo(hx - r * 0.3, hy + r * 5.6); ctx.lineTo(hx - r * 0.2, hy + r * 1.2); ctx.closePath(); ctx.fill(); }
    if (o.hat) { ctx.fillStyle = tone(dark(o.cloth ?? '#4a4038', 0.4)); ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.55, r * 1.8, r * 0.36, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(hx, hy - r * 0.6, r * 0.95, Math.PI, 0); ctx.fill(); }
  }
  // 손에 든 것
  let torch = null;
  if (o.stick) {
    const px = sw + 5, top = o.stick === 'spear' ? -132 : o.stick === 'torch' ? -98 : -106, tilt = (o.tilt ?? 0) * 100;
    line([px, o.stick === 'torch' ? -54 : drop ? -drop : 0, px + tilt, top], o.stick === 'spear' ? 1.8 : 2.4, tone('#33281e'));
    if (o.stick === 'spear') { ctx.fillStyle = tone('#aab0b4'); ctx.beginPath(); ctx.moveTo(px + tilt - 2, top); ctx.lineTo(px + tilt * 1.06, top - 11); ctx.lineTo(px + tilt + 2, top); ctx.fill(); }
    if (o.stick === 'crook') { ctx.strokeStyle = tone('#33281e'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(px + 4, top, 4, Math.PI, Math.PI * 2.3); ctx.stroke(); }
    if (o.stick === 'torch') torch = [x + d * s * (px + tilt), y + s * (top + drop)];
    hand(px, -60);
  }
  ctx.restore();
  if (torch) flame(v, torch[0], torch[1], h * 0.06);
}
/** 등을 보인 구경꾼 무리 (그림 맨 앞, 어두운 실루엣) */
export function crowd(v, x0, x1, y, n, h, o = {}) {
  const { R } = v;
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + R() * 0.7) / n) * (x1 - x0), hh = h * (0.86 + R() * 0.26);
    person(v, x, y + R() * 6, hh, { f: 0, cloth: dark(CLOTH[Math.floor(R() * CLOTH.length)], o.dark ?? 0.45), hair: dark(HAIR[Math.floor(R() * HAIR.length)], 0.3), female: R() < 0.45, hood: R() < (o.hoods ?? 0.2), hat: R() < 0.12, child: false, rim: o.rim, rimDir: o.rimDir });
  }
}
/** 누운 사람 (침상·들것). 머리가 x 쪽, 발이 x + d*len */
export function lying(v, x, y, len, o = {}) {
  const { ctx, t } = v, d = o.d ?? 1, r = len * 0.07;
  ctx.fillStyle = o.raw ? (o.cover ?? '#8a8474') : t(o.cover ?? '#8a8474');
  ctx.beginPath(); ctx.moveTo(x + d * r * 1.4, y); ctx.quadraticCurveTo(x + d * len * 0.4, y - r * 1.7, x + d * len * 0.86, y - r * 0.9); ctx.quadraticCurveTo(x + d * len * 0.97, y - r * 1.7, x + d * len, y); ctx.closePath(); ctx.fill();
  if (!o.shroud) { ctx.fillStyle = o.raw ? (o.skin ?? '#c9a184') : t(o.skin ?? '#c9a184'); ctx.beginPath(); ctx.arc(x, y - r * 0.9, r, 0, TAU); ctx.fill(); ctx.fillStyle = o.raw ? (o.hair ?? '#2a1e16') : t(o.hair ?? '#2a1e16'); ctx.beginPath(); ctx.arc(x - d * r * 0.3, y - r * 1.1, r, 0, TAU); ctx.fill(); }
}

/* ---------- 나무와 물건 ---------- */
function branch(ctx, x, y, a, len, w, depth, R) {
  const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
  ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  if (depth <= 0) return;
  const n = 2 + (R() < 0.3 ? 1 : 0);
  for (let i = 0; i < n; i++) branch(ctx, x2, y2, a + (i - (n - 1) / 2) * 0.7 + (R() - 0.5) * 0.4, len * (0.62 + R() * 0.16), w * 0.62, depth - 1, R);
}
/** 나무 한 그루. 겨울엔 앙상하고, 가을엔 물들고, 봄엔 꽃이 섞인다. o.bare면 늘 앙상 */
export function tree(v, x, y, h, o = {}) {
  const { ctx, P, t, R, S } = v;
  ctx.strokeStyle = t(o.dark ? '#1c1612' : P.trunk); ctx.lineCap = 'round';
  branch(ctx, x, y, -Math.PI / 2 + (o.lean ?? 0), h * 0.42, h * 0.07, 4, R);
  const leaf = o.bare || P.blight ? null : P.leaf;
  if (leaf) {
    const cols = P.autumn ? ['#b8742e', '#9a4a2a', '#c49a3a'] : [leaf, dark(leaf, 0.2), light(leaf, 0.15)];
    const n = P.autumn && P.autumn < 1 ? 20 : 46;
    for (let i = 0; i < n; i++) { const a = R() * TAU, d = Math.sqrt(R()) * h * 0.42, px = x + Math.cos(a) * d * 1.1 + (o.lean ?? 0) * h * 0.5, py = y - h * 0.72 + Math.sin(a) * d * 0.7; puff(ctx, px + S.dir * 2, py, h * 0.13, h * 0.1, t(o.dark ? dark(cols[i % 3], 0.5) : cols[i % 3]), 0.8); }
    if (P.blossom) for (let i = 0; i < 18 * P.blossom; i++) { const a = R() * TAU, d = Math.sqrt(R()) * h * 0.4; puff(ctx, x + Math.cos(a) * d, y - h * 0.72 + Math.sin(a) * d * 0.7, 3, 3, t('#f0dcd8'), 0.8); }
  } else if (P.snow) { ctx.strokeStyle = rgba(t('#eef0f0'), 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - h * 0.2, y - h * 0.62); ctx.lineTo(x + h * 0.02, y - h * 0.66); ctx.moveTo(x + h * 0.08, y - h * 0.8); ctx.lineTo(x + h * 0.26, y - h * 0.74); ctx.stroke(); }
}
/** 깃발: 장대 끝에서 바람 쪽으로 늘어진다 */
export function banner(v, x, y, h, color, o = {}) {
  const { ctx, t, S } = v, d = o.d ?? S.dir, w = o.w ?? h * 0.34, len = o.len ?? h * 0.42;
  ctx.strokeStyle = t('#2e241a'); ctx.lineWidth = Math.max(1, h * 0.022); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
  ctx.fillStyle = o.raw ? color : t(color); ctx.beginPath(); ctx.moveTo(x, y - h); ctx.quadraticCurveTo(x + d * w * 0.5, y - h + 3, x + d * w, y - h + 1);
  ctx.lineTo(x + d * w * 0.9, y - h + len); ctx.lineTo(x + d * w * 0.5, y - h + len * 0.8); ctx.lineTo(x, y - h + len * 0.96); ctx.closePath(); ctx.fill();
  if (o.mark) { ctx.fillStyle = o.raw ? o.mark : t(o.mark); ctx.beginPath(); ctx.arc(x + d * w * 0.5, y - h + len * 0.42, w * 0.16, 0, TAU); ctx.fill(); }
}
/** 성광교의 표식: 햇살 달린 둥근 테 */
export function sunSign(v, x, y, r, color) {
  const { ctx } = v; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, r * 0.22); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3); ctx.lineTo(x + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 1.8); ctx.stroke(); }
}
/** 까마귀 떼 */
export function crows(v, x, y, n, spread = 60) {
  const { ctx, R } = v; ctx.strokeStyle = '#14100e'; ctx.lineWidth = 1.2;
  for (let i = 0; i < n; i++) { const px = x + (R() - 0.5) * spread * 2, py = y + (R() - 0.5) * spread * 0.7, s = 2.5 + R() * 3; ctx.beginPath(); ctx.moveTo(px - s, py - s * 0.4); ctx.quadraticCurveTo(px - s * 0.4, py - s * 0.7, px, py); ctx.quadraticCurveTo(px + s * 0.4, py - s * 0.7, px + s, py - s * 0.4); ctx.stroke(); }
}

/* ---------- 마무리 ---------- */
/** 날씨, 해 쪽 빛, 가장자리 어둠, 종이 결. inside면 날씨 없이 어둠과 결만 */
export function finish(v, o = {}) {
  const { ctx } = v;
  if (!o.inside) { ctx.save(); ctx.scale(VW / W, VH / H); paintWeather(ctx, v.S, v.R, { leaves: !!v.P.autumn && !v.P.blight && !o.noLeaves }); ctx.restore(); }
  else { const g = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.3, VW / 2, VH * 0.55, VW * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,6,5,.62)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  ctx.save(); ctx.scale(VW / W, VH / H); grain(ctx); ctx.restore();
}
export { curve };
