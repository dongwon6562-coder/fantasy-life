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
  // 길 위의 달은 어느 곳에도 적지 않는다. 다만 길이 얼마나 되는지는 적어 둔다(지도에 간 만큼 그리려고)
  if (life.travel) { const tr = life.travel, o = A.go; if (!o || o.to !== tr.to || o.from !== tr.from) A.go = { to: tr.to, from: tr.from, tot: (tr.left ?? 1) + 1 }; else o.tot = Math.max(o.tot, tr.left ?? 1); return; }
  if (A.go) delete A.go;
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
  // 51단계: 간 만큼은 굵은 실선, 남은 길은 점선. 길손 표와 '몇 달 남음', 닿을 곳엔 빈 깃발.
  if (ta && tb && ta !== tb) {
    const go = A.go && A.go.to === tr.to ? A.go : null, left = Math.max(0, tr.left ?? 1), tot = Math.max(left, go?.tot ?? left, 1);
    const t = Math.max(0.06, Math.min(0.94, (tot - left) / tot));
    const dx = tb.x - ta.x, dy = tb.y - ta.y, len = Math.hypot(dx, dy) || 1, bend = Math.min(40, len * 0.16) * (tr.sea ? -1 : 1);
    const cx = (ta.x + tb.x) / 2 - dy / len * bend, cy = (ta.y + tb.y) / 2 + dx / len * bend;
    const q = (u) => [(1 - u) * (1 - u) * ta.x + 2 * (1 - u) * u * cx + u * u * tb.x, (1 - u) * (1 - u) * ta.y + 2 * (1 - u) * u * cy + u * u * tb.y];
    // 앞부분 곡선(0..t)의 조절점: 드 카스텔조
    const c1 = [ta.x + (cx - ta.x) * t, ta.y + (cy - ta.y) * t], P = q(t), c2 = [cx + (tb.x - cx) * t, cy + (tb.y - cy) * t];
    const whole = `M${ta.x} ${ta.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${tb.x} ${tb.y}`;
    const done = `M${ta.x} ${ta.y}Q${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${P[0].toFixed(1)} ${P[1].toFixed(1)}`;
    const rest = `M${P[0].toFixed(1)} ${P[1].toFixed(1)}Q${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${tb.x} ${tb.y}`;
    const tg = el('g', { class: 'trail-go', 'pointer-events': 'none' }, layer);
    el('path', { d: whole, fill: 'none', stroke: '#f0e6cb', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.7 }, tg);
    el('path', { d: done, fill: 'none', stroke: INK, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, tg);
    el('path', { d: rest, fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-dasharray': '4 3.2', 'stroke-linecap': 'round', opacity: 0.85 }, tg);
    // 닿을 곳: 빈 깃발
    const fl = el('g', { class: 'trail-go', 'pointer-events': 'none' }, layer); pin(fl, tb.x, tb.y, '--ls');
    el('path', { d: 'M0 -9V-29', stroke: '#3a1a10', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, fl);
    el('path', { d: 'M0.6 -29Q6 -30.3 12 -27Q6 -25.2 0.6 -21.6Z', fill: '#f0e6cb', stroke: INK, 'stroke-width': 1.1, 'stroke-linejoin': 'round' }, fl);
    // 길손: 붉은 원 안에 발자국(배로 가면 돛)
    const w = el('g', { class: 'trail-go', 'pointer-events': 'none' }, layer); pin(w, P[0], P[1], '--ls');
    el('circle', { cx: 0, cy: 0, r: 6.4, fill: INK, stroke: '#f0e6cb', 'stroke-width': 1.6 }, w);
    if (tr.sea) el('path', { d: 'M-3.6 1.4h7.2l-1.4 2.2h-4.4Z M-0.4 0.8V-4l3.2 4Z', fill: '#f0e6cb' }, w);
    else el('path', { d: 'M-2.6 -3.2a1.3 1.8 0 1 0 0.1 0Z M2 -0.6a1.3 1.8 0 1 0 0.1 0Z', fill: '#f0e6cb' }, w);
    const lbl = left > 0 ? `${left}달 남음` : '곧 닿음';
    el('text', { x: 9.5, y: 3.6, 'text-anchor': 'start', 'font-family': SERIF, 'font-weight': 700, 'font-size': 10.5, fill: INK, stroke: '#f6edd4', 'stroke-width': 3, 'stroke-linejoin': 'round', 'paint-order': 'stroke' }, w).textContent = lbl;
  }
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

/* ---------- 지도 밖의 땅 (탐험) ---------- */
// 지도 가장자리 어디쯤인가. 지도는 거기서 끝나므로, 양피지 귀퉁이에 손으로 덧적은 메모처럼 그린다.
// (탐험 갈래의 땅 표를 그대로 옮겨 적은 것. 지도 그림이 놀이 규칙 파일을 끌어오지 않게 하려고 따로 둔다)
const BEYOND = { frost: [1480, 40], ash: [1578, 285, 'end'], cloud: [960, 38], deepwood: [180, 455], mist: [120, 850] };
const REGIONS = {
  frost: { name: '서리 너머', from: ['estella'], sites: ['frozen_fleet', 'singing_glacier'], heart: 'giant_tomb' },
  deepwood: { name: '뿌리 아래 골짜기', from: ['silverleaf', 'fur'], sites: ['moss_city', 'beast_graves'], heart: 'old_root' },
  cloud: { name: '구름 위 고원', from: ['hammer', 'gorge'], sites: ['dragon_nest', 'frozen_shrine'], heart: 'sky_stair' },
  mist: { name: '안개 군도', from: ['saltrock', 'klein'], sites: ['sunken_port', 'turtle_isle'], heart: 'drowned_palace' },
  ash: { name: '재의 사막', from: ['estella'], sites: ['glass_city', 'iron_river'], heart: 'first_tombs' },
};
const SERIF = '"Noto Serif KR","Nanum Myeongjo","Batang",serif';
/** 유적 id → 그 유적이 있는 땅 id (삽화가 쓴다) */
export const regionOfSite = (s) => Object.keys(REGIONS).find((id) => REGIONS[id].heart === s || REGIONS[id].sites.includes(s)) ?? null;
/**
 * 탐험으로 알게 된 지도 밖의 땅. game.explore를 읽기만 한다.
 * 가 본 땅: 떠난 곳에서 이어지는 점선, 땅 이름, 얼마나 그렸는가, 찾은 유적마다 별(우리 집안이 처음이면 금빛, 남이 먼저면 빈 별).
 * 아직 안 간 땅: 떠날 수 있는 곳에 가 본 적이 있으면 흐린 이름만.
 * 돌려주는 값: 찾은 유적 수
 */
export function drawBeyond(el, layer, g, byId, pin) {
  const e = safe(() => g.explore); if (!e) return 0;
  const A = safe(() => atlasOf(g)) ?? { v: {} };
  let found = 0;
  for (const [id, [x, y, al = 'middle']] of Object.entries(BEYOND)) {
    const R = REGIONS[id]; if (!R) continue;
    const k = e.regions?.[id] ?? {}, sites = [...R.sites, R.heart].map((s) => [s, e.firsts?.[s]]).filter(([, f]) => f);
    const been = (k.trips ?? 0) > 0 || (k.mapped ?? 0) > 0 || sites.length > 0 || e.exp?.region === id;
    const heard = R.from.some((p) => A.v[p]);
    if (!been && !heard) continue;
    const line = el('g', { class: 'trail-beyond', 'pointer-events': 'none' }, layer);
    const from = R.from.map((p) => byId[p]).find(Boolean);
    if (been && from) {
      const mx = (from.x + x) / 2 + (hash(x, y) - 0.5) * 30, my = (from.y + y) / 2 + (hash(y, x) - 0.5) * 30, d = `M${from.x} ${from.y}Q${mx} ${my} ${x} ${y}`;
      el('path', { d, fill: 'none', stroke: '#f0e6cb', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5 }, line);
      el('path', { d, fill: 'none', stroke: INK, 'stroke-width': 1.5, 'stroke-dasharray': '1.5 3.6', 'stroke-linecap': 'round', opacity: 0.85 }, line);
    }
    // 글과 표는 확대해도 읽을 만한 크기를 지킨다
    const m = el('g', { class: 'trail-beyond', 'pointer-events': 'none', opacity: been ? 1 : 0.6 }, layer); pin(m, x, y, '--ls');
    // 가위표: 여기서부터는 지도에 없다
    if (been) el('path', { d: 'M-5 -5l10 10M5 -5l-10 10', fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, m);
    const tx = al === 'end' ? 8 : 0, ty = 20;
    el('text', { x: tx, y: ty, 'text-anchor': al, 'font-family': SERIF, 'font-style': 'italic', 'font-weight': 700, 'font-size': 12, fill: INK, stroke: '#f0e6cb', 'stroke-width': 2.6, 'paint-order': 'stroke' }, m).textContent = R.name;
    const sub = been ? (k.heart ? '가장 깊은 곳까지 다녀옴' : `지도에 옮긴 만큼 ${Math.round((k.mapped ?? 0) * 100)}%`) : '아직 아무도 그리지 못한 땅';
    el('text', { x: tx, y: ty + 11, 'text-anchor': al, 'font-family': SERIF, 'font-style': 'italic', 'font-size': 8, fill: '#5a3a2a', stroke: '#f0e6cb', 'stroke-width': 2.2, 'paint-order': 'stroke' }, m).textContent = sub;
    // 찾은 유적: 이름 아래 한 줄씩
    sites.forEach(([s, f], i) => {
      found++;
      const sy = ty + 23 + i * 10.5, mineStar = f.me || f.family;
      let d = ''; for (let j = 0; j < 10; j++) { const an = (j / 10) * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? 1.5 : 3.6; d += `${j ? 'L' : 'M'}${((al === 'end' ? tx - 3 : tx - 34) + Math.cos(an) * rr).toFixed(1)} ${(sy - 2.8 + Math.sin(an) * rr).toFixed(1)}`; }
      el('path', { d: d + 'Z', fill: mineStar ? '#c9a25a' : '#f0e6cb', stroke: '#3a2214', 'stroke-width': 0.6, 'stroke-linejoin': 'round' }, m);
      el('text', { x: al === 'end' ? tx - 9 : tx - 28, y: sy, 'text-anchor': al === 'end' ? 'end' : 'start', 'font-family': SERIF, 'font-size': 7.6, fill: '#3a2214', stroke: '#f0e6cb', 'stroke-width': 2, 'paint-order': 'stroke' }, m).textContent = `${f.name ?? s}${s === R.heart ? ' ✦' : ''} (${f.year}년${mineStar ? '' : `, ${f.who}`})`;
    });
  }
  return found;
}
