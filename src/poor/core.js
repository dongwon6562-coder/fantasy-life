// 밑바닥에서 살기: 상태와 도우미.
// - 잠자리 'street'(길바닥)와 그 벌(지침·괴로움)은 places.js가, 집은 house·estate가, 조직은 underworld가 맡는다.
// - 여기(game.poor)는 그 위에 얹는다: 구걸, 무료 급식과 구빈원, 날품팔이, 빈민가 사람들, 굶주림, 다시 일어서기,
//   빚 대신 노역(빚 노예), 그리고 부자가 되었을 때 밑바닥 사람을 돕거나 부리기.
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
// 매달 굴림은 따로 굴린다 (다른 갈래의 운을 흔들지 않게)
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 53) ^ Math.imul(mi(g) * 47 + salt + 17, 2654435761)) | 0 });
// 빈민가가 있는 고장 (큰 도시와 항구)
export const SLUMS = ['harfen', 'leocast', 'verden', 'portel', 'barka', 'eisen', 'saltmare', 'klein', 'solaris', 'graubel'];
// 구빈원이 있는 고장 (신전이나 영주가 세운 것). 내가 세운 곳은 P.built에 더한다.
export const POORHOUSES = ['leocast', 'harfen', 'solaris', 'verden', 'eisen', 'portel'];
export const isSlum = (pl) => SLUMS.includes(pl);
export const hasPoorhouse = (g, pl = here(g)) => POORHOUSES.includes(pl) || !!P(g).built[pl];
// 구걸로 얻는 돈의 크기: 사람이 많은 곳일수록
export const crowdOf = (pl) => (['leocast', 'eisen', 'solaris', 'barka', 'portel'].includes(pl) ? 3 : isSlum(pl) ? 2 : 1);
// 밑바닥: 돈이 거의 없고 기댈 집이 없다
export const broke = (g) => g.player.money < 15 && !['own', 'family', 'barracks'].includes(L(g).home) && !g.army?.service;
export const onStreet = (g) => L(g).home === 'street';

export const SLUM_FOLK = [
  { id: 'king', name: '거지 왕초 루프', desc: '빈민가 구걸 자리를 나눠 주고 몫을 떼어 간다.' },
  { id: 'hag', name: '넝마주이 할멈 베타', desc: '쓰레기 더미에서 쓸 것을 골라낸다. 모르는 소문이 없다.' },
  { id: 'kid', name: '소매치기 아이 핀', desc: '열 살쯤. 손이 빠르고 눈치가 더 빠르다.' },
  { id: 'knight', name: '술에 전 옛 기사 브란트', desc: '한때 기사였다고 한다. 칼은 전당포에 있다.' },
  { id: 'widow', name: '기침하는 과부 엘레', desc: '아이 둘을 데리고 다리 밑에서 산다.' },
];
export const folk = (id) => SLUM_FOLK.find((f) => f.id === id) ?? SLUM_FOLK[0];

function fresh() {
  return {
    hunger: 0, streetMonths: 0, lowMonths: 0, ateAt: -1, bedAt: -1, begged: 0, beggedTotal: 0, labored: 0, soup: 0,
    friends: {}, // 빈민가 사람 id → 정(0~100)
    boss: {},    // 고장 → 'paid' | 'refused' | 'joined' (거지 왕초에게 몫을 내는지)
    risen: false, lowest: null, // 가장 밑바닥이던 때 { y, place }
    bond: null,  // 내가 진 빚 노역 { owed, place, master, start, kind }
    bonded: 0, fled: 0,
    charity: {}, // 고장 → 무료 급식에 낸 횟수
    built: {},   // 고장 → 내가 구빈원을 세운 해
    given: 0,    // 가난한 이에게 준 돈
    bondsmen: [], // 내가 빚으로 묶어 부리는 사람 [{ name, place, since, owed }]
    hired: 0, squeezed: 0,
    chanceAt: 0, slumAt: 0,
    log: [],
  };
}
export const P = (g) => (g.poor ??= fresh());
HOOKS.newGame.push((g) => { g.poor = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  g.poor = Object.assign(d, g.poor && typeof g.poor === 'object' ? g.poor : {});
  const p = g.poor;
  for (const k of ['friends', 'boss', 'charity', 'built']) if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {};
  for (const k of ['bondsmen', 'log']) if (!Array.isArray(p[k])) p[k] = [];
  p.bondsmen = p.bondsmen.filter((b) => b && typeof b.name === 'string');
  if (p.bond && (typeof p.bond !== 'object' || !Number.isFinite(p.bond.owed) || !PLACES[p.bond.place] || !['salt', 'quarry'].includes(p.bond.kind))) p.bond = null;
  if (p.bond) { p.bond.owed = Math.max(0, Math.round(p.bond.owed)); if (typeof p.bond.master !== 'string') p.bond.master = '감독관'; if (!Number.isFinite(p.bond.start)) p.bond.start = 0; }
  p.bondsmen = p.bondsmen.filter((b) => PLACES[b.place] && Number.isFinite(b.owed));
  for (const b of p.bondsmen) if (!Number.isFinite(b.since)) b.since = 0;
  if (p.lowest && (typeof p.lowest !== 'object' || !Number.isFinite(p.lowest.y))) p.lowest = null;
  for (const k of ['hunger', 'streetMonths', 'lowMonths', 'given', 'bonded', 'fled']) if (!Number.isFinite(p[k])) p[k] = 0;
});
export function logPoor(g, text) {
  const p = P(g);
  p.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (p.log.length > 24) p.log.length = 24;
}
export const friend = (g, id, n) => { const p = P(g); p.friends[id] = clamp((p.friends[id] ?? 20) + n, 0, 100); return p.friends[id]; };
