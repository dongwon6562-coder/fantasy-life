// 35단계 기술이 퍼지는 길 (도우미스레드3). 상태는 g.spread 하나.
//   기술 나무(techtree)에서 무언가 나오면 처음엔 그 기술이 나온 고장(where)에만 있다. 장인과 도제, 책, 떠도는 기술자, 상단을 타고 이웃 고장으로 천천히 번진다.
//   reach: { 기술 id: [[고장 번호, 들어온 해], ...] }  (고장 번호는 PLACE_IDS 순서. PLACES는 덧붙이기만 하니 번호가 바뀌지 않는다)
//   patent: { 기술 id: 끝나는 달 }  왕실 특허장이 있으면 번지는 게 더디다
//   block: { 고장: [기술 id, 끝나는 달] }  교단과 고장 사람들이 들이지 않는다
//   guard: { 기술 id: true }  내가 비법을 지킨다 (내 이름의 발명)
//   backed: { 기술 id: 후원한 몫(진척) }   me{ backed, taught, stole, caught, sold, patents, blocked, kept, spilled }   log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const spreadRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 389) ^ Math.imul(mi(g) * 181 + salt + 67, 2654435761)) | 0 });
export const PLACE_IDS = Object.keys(PLACES);
export const pidx = (pl) => PLACE_IDS.indexOf(pl);
// 기술이 머무를 수 있는 곳: 폐허는 빼고, 개척지는 사람이 살 때만
export const livable = (g, pl) => !!PLACES[pl] && pl !== 'estella' && (!pl.startsWith('fr_') || (g.frontier?.sites?.[pl]?.stage ?? 0) >= 1);
// 책이 닿는 곳 (서고·필사실·마탑·학원), 상단이 닿는 장터와 항구
export const LEARNED = ['leocast', 'verden', 'serenia', 'harfen', 'solaris', 'eisen'];
export const MARKETS = ['harfen', 'leocast', 'barka', 'portel', 'eisen', 'klein', 'saltmare', 'crow', 'saltrock', 'graubel', 'serenia', 'fur', 'hammer'];
export const PORTS = ['portel', 'barka', 'klein', 'saltmare', 'crow', 'saltrock'];
// 갈래마다 잘 타는 길: 도제(이웃으로), 책, 떠돌이, 상단
export const CHANNEL = {
  farm: { hand: 1.0, book: 0.6, wander: 1.2, trade: 0.5 },
  craft: { hand: 1.2, book: 0.4, wander: 1.0, trade: 1.0 },
  magic: { hand: 0.6, book: 1.3, wander: 0.6, trade: 0.5 },
  letters: { hand: 0.5, book: 1.6, wander: 0.6, trade: 0.8 },
  sea: { hand: 0.4, book: 0.5, wander: 0.8, trade: 1.6 },
  war: { hand: 0.8, book: 0.6, wander: 0.8, trade: 0.8 },
  city: { hand: 0.9, book: 0.8, wander: 0.5, trade: 1.0 },
  heal: { hand: 0.7, book: 1.2, wander: 1.0, trade: 0.6 },
};
// 후원으로 앞당길 수 있는 몫: 기술 하나에 품(costOf)의 12%까지 (몇 해 남짓)
export const BACK_CAP = 0.12;

const freshMe = () => ({ backed: 0, taught: 0, stole: 0, caught: 0, sold: 0, patents: 0, blocked: 0, kept: 0, spilled: 0, patronAt: -99 });
export const fresh = () => ({ reach: {}, patent: {}, block: {}, guard: {}, backed: {}, me: freshMe(), log: [] });
export const SP = (g) => (g.spread ??= fresh());
export function slog(g, text) {
  const S = SP(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
// 이 고장에 그 기술이 들어왔나 (나무에서 나오지 않았으면 어디에도 없다)
export function reachedAt(g, id, pl) {
  if (!g.history?.inventions?.includes(id)) return false;
  const r = g.spread?.reach?.[id];
  if (!r) return true; // 퍼짐을 모르는 예전 기술은 어디에나 있다고 친다
  const i = pidx(pl);
  return r.some((x) => x[0] === i);
}
export const reachList = (g, id) => (g.spread?.reach?.[id] ?? []).map(([i, y]) => [PLACE_IDS[i], y]);
export function addReach(g, id, pl) {
  const S = SP(g), r = (S.reach[id] ??= []), i = pidx(pl);
  if (i < 0 || r.some((x) => x[0] === i)) return false;
  r.push([i, g.date.year]);
  return true;
}
function fill(g) {
  const S = SP(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  S.me = Object.assign(freshMe(), S.me ?? {});
}
HOOKS.newGame.push((g) => { g.spread = fresh(); });
// 예전 저장: 이미 나온 기술은 어디에나 있다고 친다 (reach가 없으면 reachedAt이 참)
HOOKS.migrate.push((g) => fill(g));
