// 기사단: 상태와 도우미.
// 상태 game.order:
//   orders: { [id]: { strength, wealth, master: { name, born, pid? }, fallen: null|{ y, why }, heresy: null|{ stage, at, next }, founded } }
//   me: null | { id, joined, dubbed, brothers: [id…], mentor, broke: […], hidden: null|'marriage'|'wealth', penance, master }
//   past: [{ id, rank, from, to, how, name }]   지난 기사 생활(내 것과 선대의 것)
//   retired: null | { id, y, how }
//   eventAt, brotherAt, log
// 계급은 L(g).fac에 둔다(성흔: fac.stigma, 잿빛 성벽: fac.march, 왕국: 이미 있는 fac.knights). 싸움 보상(공적)이 그대로 들어온다.
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { me, playerAge } from '../game.js';
import { byId } from '../npc.js';
import { ORDERS, ORDER_IDS, NEW_ORDERS } from './data.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const sword = (g) => g.player.skills?.sword ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 79) ^ Math.imul(mi(g) * 113 + salt + 97, 2654435761)) | 0 });

function freshOrders() {
  const o = {};
  ORDER_IDS.forEach((id, i) => {
    o[id] = { strength: id === 'march' ? 55 : 60, wealth: id === 'stigma' ? 55 : id === 'royal' ? 45 : 25, master: { name: ORDERS[id].master[0], born: 448 + i * 3 }, masterN: 0, fallen: null, heresy: null, founded: null };
  });
  return o;
}
function fresh() {
  return { orders: freshOrders(), me: null, past: [], retired: null, eventAt: 0, brotherAt: 0, vowAt: 0, log: [], expelled: {} };
}
export const OS = (g) => (g.order ??= fresh());
export const orderOf = (g, id) => OS(g).orders[id];
export const isFallen = (g, id) => !!orderOf(g, id)?.fallen;

export function logOrder(g, text) {
  const s = OS(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}

// ---------- 내 기사단 ----------
export const facOf = (g, id) => L(g).fac?.[ORDERS[id].fac] ?? null;
// 왕국 기사단은 이미 있는 소속을 읽는다. 기사단 일을 하는 동안만 그 기사다.
export const royalMember = (g) => !!(L(g).fac?.knights?.member && L(g).job?.id === 'knight');
export const myOrderId = (g) => OS(g).me?.id ?? null;
export const inOrder = (g) => !!OS(g).me;
// 계급을 한 줄로: 0 종자, 1 기사, 2 기사대장, 3 단장
export function level(g) {
  const s = OS(g).me;
  if (!s) return -1;
  if (s.master) return 3;
  const f = facOf(g, s.id);
  if (!f) return 0;
  if (s.id === 'royal') return f.rank >= 3 ? 2 : f.rank >= 2 ? 1 : 0;
  return clamp(f.rank ?? 0, 0, 2);
}
export function rankName(g) {
  const s = OS(g).me;
  if (!s) return '';
  const O = ORDERS[s.id];
  if (s.master) return '단장';
  if (s.id === 'royal') return O.ranks[facOf(g, 'royal')?.rank ?? 0];
  return O.ranks[level(g)];
}
export const orderName = (id) => ORDERS[id]?.name ?? '기사단';
// 남의 기사단 이름: 왕국 기사단은 베르덴 백작 기사단일 수도 있다
export function myOrderName(g) {
  const s = OS(g).me;
  if (!s) return '';
  if (s.id === 'royal' && facOf(g, 'royal')?.order === 'verden') return '베르덴 백작 기사단';
  return orderName(s.id);
}
export const brothers = (g) => (OS(g).me?.brothers ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive);
export const merit = (g) => facOf(g, myOrderId(g) ?? 'stigma')?.merit ?? 0;
export const addMerit = (g, n) => { const s = OS(g).me; if (!s) return; const f = facOf(g, s.id); if (f) f.merit = Math.max(0, (f.merit ?? 0) + n); };
export const atSeat = (g) => { const s = OS(g).me; if (!s) return false; const seat = s.id === 'royal' ? facOf(g, 'royal')?.order ?? 'leocast' : ORDERS[s.id].seat; return here(g) === seat; };
export const age = (g) => playerAge(g);
export const nm = (g) => me(g).name ?? g.player.name;

// ---------- 지난 기사 생활 ----------
export function endService(g, how) {
  const s = OS(g), m = s.me;
  if (!m) return;
  s.past.push({ id: m.id, rank: rankName(g), from: m.joined?.[0] ?? g.date.year, to: g.date.year, how, name: g.player.name });
  if (s.past.length > 12) s.past.splice(0, s.past.length - 12);
  if (m.id !== 'royal') { const f = facOf(g, m.id); if (f) f.member = false; }
  s.me = null;
}
// 이 집안에서 그 기사단을 섬긴 사람 (선대 포함)
export const servedBefore = (g, id) => OS(g).past.filter((p) => p.id === id);

export { ORDERS, ORDER_IDS, NEW_ORDERS };
export const orderFresh = fresh;

HOOKS.newGame.push((g) => { g.order = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.order) { g.order = d; return; }
  const s = g.order;
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  for (const id of ORDER_IDS) if (!s.orders[id]) s.orders[id] = d.orders[id];
});
