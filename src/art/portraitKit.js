// 초상 그리기에 함께 쓰는 연장: 난수, 색 섞기, 부드러운 곡선.

export const INK = '#21160f';

// 32비트 해시 (문자열 → 씨앗)
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rngFrom(seed) {
  let s = seed || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function weighted(r, weights) {
  const tot = weights.reduce((a, b) => a + b, 0);
  let x = r * tot;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
  return weights.length - 1;
}
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
export const shade = (c, t) => mixHex(c, '#140d09', t);
export const tint = (c, t) => mixHex(c, '#f6ecd8', t);
export const f = (n) => Math.round(n * 100) / 100;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** 점들을 지나는 부드러운 곡선 (Catmull-Rom → 베지어). open이면 'M…C…', 닫으면 끝에 Z */
export function spline(pts, closed = false, move = true) {
  const n = pts.length;
  if (n < 2) return '';
  const g = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = move ? `M${f(pts[0][0])} ${f(pts[0][1])}` : '';
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
/** 오른쪽 절반의 점(위→아래)을 받아 좌우 대칭인 닫힌 윤곽을 만든다. 첫 점과 끝 점은 가운데 선 위 */
export function mirrored(cx, right) {
  const left = right.slice(1, -1).reverse().map(([x, y]) => [2 * cx - x, y]);
  return spline([...right, ...left], true);
}
/** 좌우 대칭 열린 곡선의 점: 오른쪽 점들(가운데→바깥)을 왼쪽 바깥→가운데→오른쪽 바깥 순으로 */
export function arch(cx, right) {
  const left = right.slice(1).reverse().map(([x, y]) => [2 * cx - x, y]);
  return [...left, ...right];
}
export const pt = (p) => `${f(p[0])} ${f(p[1])}`;
