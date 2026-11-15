// 지도에 남는 내 발자취: 가 본 곳, 머문 달 수, 옮겨 다닌 길.
// 규칙은 건드리지 않는다. 달이 넘어갈 때마다 지금 있는 곳을 읽어 game.atlas에 적어 둘 뿐이다 (저장에 함께 실린다. 몇 백 바이트).
//   game.atlas = { home: 태어난 곳, last: 지난달 있던 곳, v: { 장소 id: [처음 온 해, 머문 달 수] }, t: [옮겨 다닌 차례대로의 장소 id …(끝 80곳)], f: { 장소 id: 찾아낸 해 } }
// 대를 이어도 지우지 않는다. 지도에는 집안이 다닌 길이 쌓인다.
import { HOOKS } from '../hooks.js';

const TRAIL_MAX = 80;
const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };

export function atlasOf(g) {
  if (!g) return null;
  const here = g.life?.place ?? 'ern';
  if (!g.atlas || typeof g.atlas !== 'object') g.atlas = { home: here, last: null, v: {}, t: [], f: {} };
  const A = g.atlas; A.v ??= {}; A.t ??= []; A.f ??= {};
  return A;
}
function note(g) {
  const A = atlasOf(g); if (!A) return;
  const life = g.life ?? {};
  if (life.travel) return; // 길 위의 달은 어느 곳에도 적지 않는다
  const here = life.place; if (!here) return;
  const year = g.date?.year ?? 500;
  const rec = A.v[here] ?? (A.v[here] = [year, 0]);
  rec[1]++;
  if (A.last !== here) { A.t.push(here); if (A.t.length > TRAIL_MAX) A.t.splice(0, A.t.length - TRAIL_MAX); A.last = here; }
}
/** 다른 갈래가 부를 수 있다: 지도에 없던 곳을 찾아냈을 때 (탐험 등) */
export function markFound(g, placeId) { const A = atlasOf(g); if (A && placeId && !A.f[placeId]) A.f[placeId] = g.date?.year ?? 500; }

HOOKS.newGame.push((g) => safe(() => note(g)));
HOOKS.migrate.push((g) => safe(() => { if (!g.atlas) note(g); }));
HOOKS.afterMonth.push((g) => safe(() => note(g)));

/* ---------- 그리기 (map.js가 부른다) ---------- */
const INK = '#8c2a1a';
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/**
 * 발자취 겹을 그린다. el: map.js의 SVG 요소 만들기, layer: 장소 기호 아래에 깔리는 <g>, byId: 장소 표, pin: 확대에 맞춰 크기를 잡아 주는 함수
 * 돌려주는 값: { count: 가 본 곳 수, info(place): 설명 칸에 덧붙일 글 }
 */
export function drawTrail(el, layer, g, byId, pin) {
  const A = safe(() => atlasOf(g));
  if (!A) return { count: 0, info: () => '' };
  // 1. 옮겨 다닌 길: 붉은 잉크 점선. 오래된 구간일수록 흐리다. 같은 길을 여러 번 다녔으면 한 번만 긋는다.
  const seen = new Set(), segs = [];
  for (let i = A.t.length - 1; i > 0; i--) {
    const a = byId[A.t[i - 1]], b = byId[A.t[i]]; if (!a || !b || a === b) continue;
    const key = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id; if (seen.has(key)) continue; seen.add(key);
    segs.push([a, b, (A.t.length - i) / A.t.length]);
  }
  segs.reverse().forEach(([a, b, age]) => {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, k = (hash(a.x + b.x, a.y + b.y) - 0.5) * Math.min(26, len * 0.22);
    const mx = (a.x + b.x) / 2 - dy / len * k, my = (a.y + b.y) / 2 + dx / len * k;
    const d = `M${a.x} ${a.y}Q${mx} ${my} ${b.x} ${b.y}`;
    el('path', { d, fill: 'none', stroke: '#f0e6cb', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.6 }, layer);
    el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 1.9, 'stroke-dasharray': '3.4 2.8', 'stroke-linecap': 'round', opacity: 0.95 - age * 0.35 }, layer);
  });
  // 지금 걷는 길
  const tr = g.life?.travel, ta = tr && byId[tr.from ?? g.life.place], tb = tr && byId[tr.to];
  if (ta && tb) el('path', { d: `M${ta.x} ${ta.y}L${tb.x} ${tb.y}`, fill: 'none', stroke: INK, 'stroke-width': 1.5, 'stroke-dasharray': '5 3', 'stroke-linecap': 'round', opacity: 0.9 }, layer);
  // 2. 가 본 곳: 손으로 두른 붉은 고리. 한 해 넘게 산 곳은 겹고리, 고향은 작은 집 표
  let count = 0;
  for (const [id, [, months]] of Object.entries(A.v)) {
    const p = byId[id]; if (!p) continue; count++;
    const m = el('g', { class: 'trail-mark', 'pointer-events': 'none' }, layer); pin(m, p.x, p.y, '--ls');
    const r = 8.6, wob = (i) => r + (hash(p.x + i, p.y) - 0.5) * 1.3;
    let d = ''; for (let i = 0; i <= 12; i++) { const an = (i / 12) * Math.PI * 2 + 0.3, rr = wob(i % 12); d += `${i ? 'L' : 'M'}${(Math.cos(an) * rr).toFixed(1)} ${(Math.sin(an) * rr).toFixed(1)}`; }
    el('path', { d: d + 'Z', fill: INK, 'fill-opacity': 0.1, stroke: INK, 'stroke-width': 0.9, 'stroke-linejoin': 'round', opacity: 0.85 }, m);
    if (months >= 12) el('circle', { cx: 0, cy: 0, r: 11.4, fill: 'none', stroke: INK, 'stroke-width': 0.6, opacity: 0.7 }, m);
    if (id === A.home) { el('path', { d: 'M-15 -9.5l4.2 -3.8l4.2 3.8v4.6h-8.4Z', fill: '#f0e6cb', stroke: INK, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, m); el('path', { d: 'M-11.6 -4.9v-2.6h1.6v2.6', fill: 'none', stroke: INK, 'stroke-width': 0.7 }, m); }
  }
  // 3. 내가 찾아낸 곳: 작은 별표
  for (const id of Object.keys(A.f)) {
    const p = byId[id]; if (!p) continue;
    const m = el('g', { class: 'trail-mark', 'pointer-events': 'none' }, layer); pin(m, p.x, p.y, '--ls');
    let d = ''; for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? 2 : 4.6; d += `${i ? 'L' : 'M'}${(11 + Math.cos(an) * rr).toFixed(1)} ${(-10 + Math.sin(an) * rr).toFixed(1)}`; }
    el('path', { d: d + 'Z', fill: '#c9a25a', stroke: '#3a2214', 'stroke-width': 0.7, 'stroke-linejoin': 'round' }, m);
  }
  const info = (place) => {
    const rec = place?.id != null ? A.v[place.id] : null, found = place?.id != null ? A.f[place.id] : null;
    const bits = [];
    if (rec) bits.push(`${place.id === A.home ? '고향 · ' : ''}용사력 ${rec[0]}년에 처음 발을 들였다 · 머문 날 ${rec[1] >= 12 ? `${Math.floor(rec[1] / 12)}년 ${rec[1] % 12 ? `${rec[1] % 12}달` : ''}` : `${rec[1]}달`}`);
    if (found) bits.push(`용사력 ${found}년, 우리 집안이 처음 지도에 올린 곳`);
    return bits.length ? `<p class="note" style="color:#8c2a1a">${bits.join('<br>')}</p>` : '';
  };
  return { count, info };
}
