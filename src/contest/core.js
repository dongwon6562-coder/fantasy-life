// 내기와 겨루기: 상태, 도우미, 대 잇기.
// - game.contest: 도박 성적과 노름 버릇(itch), 대회 우승 기록(titles), 투기장 이름값, 승부 조작 기록(fixed), 출입 금지(banned).
// - 도박빚은 따로 두지 않고 집과 재산(src/estate/)의 고리대금 빚(lender 'shark')으로 들어간다. 빚쟁이도 그쪽이 보낸다.
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L, note } from '../adventure/core.js';
import { isJailed } from '../crime.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;

function fresh() {
  return {
    won: 0, lost: 0, games: 0, best: 0, worst: 0, // 도박: 딴 돈, 잃은 돈, 판 수, 한 판에 가장 크게 딴 돈과 잃은 돈
    itch: 0, // 노름 버릇 0~100
    titles: [], // {id, place, year, text}
    entered: {}, // 'fair:place:year' -> true
    arena: { wins: 0, losses: 0, fame: 0, beastWins: 0 },
    fixed: [], // {kind, place, year, exposed}
    banned: {}, // 'gamble:place' | 'fair:place' -> 이 달까지
    cool: 0, urgeAt: 0, log: [],
  };
}
export const C = (g) => (g.contest ??= fresh());
HOOKS.newGame.push((g) => { g.contest = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  g.contest = Object.assign(d, g.contest ?? {});
  g.contest.arena = Object.assign(d.arena, g.contest.arena ?? {});
  if (!Array.isArray(g.contest.titles)) g.contest.titles = [];
  if (!Array.isArray(g.contest.fixed)) g.contest.fixed = [];
});
export function logContest(g, text) {
  const c = C(g);
  c.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (c.log.length > 24) c.log.length = 24;
}
export const bannedAt = (g, what, pl = here(g)) => (C(g).banned[`${what}:${pl}`] ?? 0) > mi(g);
export const ban = (g, what, months, pl = here(g)) => { C(g).banned[`${what}:${pl}`] = mi(g) + months; };
export const renown = (g, n) => { L(g).renown = Math.max(0, (L(g).renown ?? 0) + n); };
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const skill = (g, id) => g.player.skills[id] ?? 0;
export const itchWord = (v) => (v >= 70 ? '노름에 빠져 산다' : v >= 40 ? '주사위 소리만 들으면 손이 근질거린다' : v >= 15 ? '가끔 한 판이 생각난다' : '노름에는 관심이 없다');

/* ---------- 매달: 버릇은 천천히 가라앉는다, 금지는 풀린다 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over) return;
  const c = C(g);
  c.itch = clamp(c.itch - 0.8, 0, 100);
  for (const k of Object.keys(c.banned)) if (c.banned[k] <= mi(g)) delete c.banned[k];
  if (c.cool > 0) c.cool -= 1;
});

/* ---------- 대 잇기: 우승 기록은 집안의 자랑으로 남고, 버릇은 사람을 따라 사라진다 ---------- */
HOOKS.heir.push((g) => {
  const c = C(g);
  const n = c.titles.length;
  c.itch = 0; c.banned = {}; c.arena = { wins: 0, losses: 0, fame: 0, beastWins: 0 };
  c.old = (c.old ?? 0) + n;
  c.past = [...(Array.isArray(c.past) ? c.past : []), ...c.titles].slice(-20);
  c.titles = []; c.fixed = []; c.entered = {};
  if (n) note(g, `선대가 대회에서 받은 상패 ${n}개가 벽에 걸려 있다.`);
});
