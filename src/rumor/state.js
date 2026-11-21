// 30단계 세상의 소리 (도우미스레드3). 상태는 g.rumor 하나.
//   먼 곳의 일은 그 자리에서만 그날 안다. 다른 고장에는 전령·벽보·장터 소문·상인·순례자·뱃사람·음유시인을 타고
//   길의 멀기만큼 늦게, 그리고 조금씩 틀리게 닿는다. 틀린 말은 나중에 바른 소식이 따라오기도 하고, 끝내 그대로 남기도 한다.
//
//   facts[]: { id, k(갈래), at(일어난 달), pl(일어난 고장), d(자세한 것), big, via(먼저 닿는 길), wrong(틀린 판 번호 | -1),
//              h1(먼저 들음), h2(바로잡힘), off(이 고장에선 직접 봄) }
//   heard[]: { y, m, text, via, k, fid, wrong, fix }   최근 들은 것 (30개)
//   legends[]: { k, d, y }   노래가 될 만한 큰일 (음유시인이 해가 지난 뒤 부른다)
//   snap: 지난달 세상 모습 (무엇이 바뀌었나 견주려고)   recent[]: 최근 쓴 거리 풍경 열쇠   now: 이번 달 화면용
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { L } from '../adventure/core.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const here = (g) => (g.life ? L(g).place ?? 'ern' : 'ern');
export const rumorRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 557) ^ Math.imul(mi(g) * 97 + salt + 29, 2654435761)) | 0 });

// 고장의 성격
const TOWN_KINDS = ['소도시', '왕도', '제도', '성도', '마법도시', '자유도시', '성채도시', '항구 도시', '백작령 성읍', '섬의 수도', '미궁 도시'];
export const isTown = (pl) => TOWN_KINDS.includes(PLACES[pl]?.kind);
export const realmAt = (pl) => PLACES[pl]?.realm ?? (pl?.startsWith?.('fr_') ? 'wild' : 'leonia');
export const PORTS = ['klein', 'portel', 'barka', 'saltmare', 'crow', 'saltrock'];
export const isPort = (pl) => PORTS.includes(pl);

// 길의 멀기: 고장 사이 길(links)의 값을 더한다. 섬은 뱃길로 잇는다.
const SEA = { saltmare: { portel: 3, klein: 4, crow: 1, saltrock: 1 }, crow: { saltmare: 1, portel: 3 }, saltrock: { saltmare: 1, klein: 4 } };
let graph = null;
function edges() {
  if (graph) return graph;
  graph = {};
  const add = (a, b, w) => { if (!PLACES[a] || !PLACES[b]) return; (graph[a] ??= {}); (graph[b] ??= {}); graph[a][b] = Math.min(graph[a][b] ?? 99, w); graph[b][a] = Math.min(graph[b][a] ?? 99, w); };
  for (const [a, p] of Object.entries(PLACES)) for (const [b, w] of Object.entries(p.links ?? {})) add(a, b, Number(w) || 1);
  for (const [a, m] of Object.entries(SEA)) for (const [b, w] of Object.entries(m)) add(a, b, w);
  return graph;
}
const distCache = new Map();
export function distFrom(from) {
  if (distCache.has(from)) return distCache.get(from);
  const G = edges(), d = { [from]: 0 }, done = new Set();
  for (;;) {
    let u = null;
    for (const k of Object.keys(d)) if (!done.has(k) && (u === null || d[k] < d[u])) u = k;
    if (u === null) break;
    done.add(u);
    for (const [v, w] of Object.entries(G[u] ?? {})) if (d[u] + w < (d[v] ?? Infinity)) d[v] = d[u] + w;
  }
  distCache.set(from, d);
  return d;
}
export const dist = (a, b) => (a === b ? 0 : distFrom(a)[b] ?? 9);

export const fresh = () => ({ facts: [], heard: [], legends: [], snap: null, seq: 1, recent: [], now: null, sungAt: 0 });
export const RS = (g) => (g.rumor ??= fresh());
export function fill(g) {
  const R = RS(g), f = fresh();
  for (const k of Object.keys(f)) R[k] ??= f[k];
  if (!Array.isArray(R.facts)) R.facts = [];
  if (!Array.isArray(R.heard)) R.heard = [];
  if (!Array.isArray(R.legends)) R.legends = [];
  if (!Array.isArray(R.recent)) R.recent = [];
}
HOOKS.newGame.push((g) => { g.rumor = fresh(); });
HOOKS.migrate.push((g) => fill(g));
