// 풍경 그리기에 함께 쓰는 연장: 난수, 잡음, 색 섞기, 붓질.

export const W = 1200, H = 480, HZ = 236;

export function hash(n, s = 0) {
  let h = Math.imul(n | 0, 374761393) + Math.imul(s | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
export function noise1(x, s) {
  const i = Math.floor(x), t = x - i, u = t * t * (3 - 2 * t);
  return hash(i, s) * (1 - u) + hash(i + 1, s) * u;
}
export function fbm1(x, s, oct = 4) {
  let a = 0.5, f = 1, sum = 0, n = 0;
  for (let i = 0; i < oct; i++) { sum += a * noise1(x * f, s + i * 13); n += a; a *= 0.5; f *= 2.1; }
  return sum / n;
}
export function ridged1(x, s, oct = 5) {
  let a = 0.5, f = 1, sum = 0, n = 0;
  for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(noise1(x * f, s + i * 7) * 2 - 1); sum += a * v * v; n += a; a *= 0.5; f *= 2.2; }
  return sum / n;
}
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
export const strSeed = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
export const sbump = (x, c, w) => { const t = bump(x, c, w); return t * t * (3 - 2 * t); };

/* ---------- 색 ---------- */
const arr = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r, g, b) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
export function mixh(a, b, t) {
  const A = arr(a), B = arr(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export const rgba = (c, a) => { const A = arr(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };
export const dark = (c, t) => mixh(c, '#0e0c14', t);
export const light = (c, t) => mixh(c, '#fff4dc', t);
/** 채도를 낮춘다 (0 그대로, 1 회색) */
export function dull(c, t) { const A = arr(c), g = A[0] * 0.3 + A[1] * 0.59 + A[2] * 0.11; return toHex(A[0] + (g - A[0]) * t, A[1] + (g - A[1]) * t, A[2] + (g - A[2]) * t); }

/* ---------- 길과 면 ---------- */
export function trace(ctx, fn, x0 = 0, x1 = W, step = 6, move = true) {
  for (let x = x0; x <= x1 + 0.01; x += step) { if (move && x === x0) ctx.moveTo(x, fn(x)); else ctx.lineTo(x, fn(x)); }
}
export function fillCurve(ctx, fn, fill, bottom = H, x0 = 0, x1 = W) {
  ctx.beginPath(); ctx.moveTo(x0, bottom); trace(ctx, fn, x0, x1, 6, false); ctx.lineTo(x1, bottom); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}
/** fn 아래쪽만 그려지게 자른다 (부른 쪽에서 restore) */
export function clipBelow(ctx, fn, bottom = H) {
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, bottom); trace(ctx, fn, 0, W, 6, false); ctx.lineTo(W, bottom); ctx.closePath(); ctx.clip();
}
export function poly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([t, c]) => g.addColorStop(t, c));
  return g;
}

/* ---------- 부드러운 붓 자국 ---------- */
const sprites = new Map();
function sprite(color) {
  let s = sprites.get(color);
  if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 64;
  const c = s.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(color, 1)); g.addColorStop(0.45, rgba(color, 0.62)); g.addColorStop(0.8, rgba(color, 0.14)); g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  if (sprites.size > 160) sprites.clear();
  sprites.set(color, s);
  return s;
}
/** 가장자리가 풀어지는 타원 한 점 */
export function puff(ctx, x, y, rx, ry, color, a = 1) {
  ctx.globalAlpha = a;
  ctx.drawImage(sprite(color), x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalAlpha = 1;
}
/** 가로로 깔리는 안개 띠 */
export function mist(ctx, y, h, color, a) {
  const g = ctx.createLinearGradient(0, y - h, 0, y + h);
  g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.5, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(0, y - h, W, h * 2);
}
/** 종이 결: 한 번 만들어 두고 겹쳐 쓴다 */
let grainCv = null;
export function grain(ctx) {
  if (!grainCv) {
    grainCv = document.createElement('canvas'); grainCv.width = W; grainCv.height = H;
    const c = grainCv.getContext('2d'), r = rng(4242);
    for (let i = 0; i < 9000; i++) { c.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; c.fillRect(r() * W, r() * H, 1.4, 1.4); }
    c.strokeStyle = 'rgba(255,250,235,.022)'; c.lineWidth = 1;
    for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H, l = 30 + r() * 90; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y + (r() - 0.5) * 6); c.stroke(); }
  }
  ctx.drawImage(grainCv, 0, 0);
}
