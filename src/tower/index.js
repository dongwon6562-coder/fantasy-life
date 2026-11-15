// 11단계: 마탑과 금지된 마법. 탑 안의 삶(입문·탑 일·스승·승급·5~6서클 공인), 마도구, 금지 마법 세 갈래와 그 값,
// 마탑과 교단 사이의 날. 화면용: towerInfo(g), towerLine(g).
import { HOOKS } from '../hooks.js';
import { TS, mi, TOWERS, ITEMS, FORBIDDEN, RANKS, RANK_NEED, forbiddenLv, taintWord, frictionWord } from './state.js';
import './life.js';
import './forbidden.js';
import './events.js';
export { craftable, promote } from './life.js';
export { TOWERS, ITEMS, FORBIDDEN, RANKS };
export const towerState = TS;

const BLACK_WORD = { '-1': '검은 탑과는 연을 끊었다', 0: '', 1: '검은 봉투를 받은 적이 있다', 2: '검은 탑의 모임에 드나든다' };

export function towerInfo(g) {
  const T = TS(g), M = T.member;
  const need = M && M.rank < 4 ? RANK_NEED[M.rank + 1] : null;
  return {
    member: M ? {
      tower: M.tower, towerName: TOWERS[M.tower].name, towerDesc: TOWERS[M.tower].desc,
      rank: M.rank, rankName: RANKS[M.rank], merit: Math.round(M.merit),
      next: need ? { rankName: RANKS[M.rank + 1], merit: need.merit, cert: need.cert } : null,
      master: M.master ? { name: M.master.name, circle: M.master.circle, bond: Math.round(M.master.bond), alive: !!M.master.alive } : null,
    } : null,
    expelled: !!T.expelled,
    circleCert: T.circleCert,
    items: T.items.map((id) => ({ id, name: ITEMS[id]?.name ?? id, keep: ITEMS[id]?.keep ?? '' })),
    made: T.made,
    craft: T.craft ? { id: T.craft.id, name: ITEMS[T.craft.id]?.name ?? T.craft.id, prog: Math.round(Math.min(1, T.craft.prog) * 100) } : null,
    forbidden: Object.entries(FORBIDDEN).filter(([k]) => T.forbidden[k] > 0).map(([k, f]) => ({ id: k, name: f.name, lv: T.forbidden[k], lvName: f.lv[T.forbidden[k] - 1] })),
    taint: Math.round(T.taint), taintWord: taintWord(T.taint),
    hunted: T.hunted > mi(g) ? T.hunted - mi(g) : 0,
    black: T.black, blackWord: BLACK_WORD[T.black] ?? '',
    friction: Math.round(T.friction), frictionWord: frictionWord(T.friction),
    log: T.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 상태창 아래 등
export function towerLine(g) {
  const T = TS(g), M = T.member;
  const parts = [];
  if (M) parts.push(`${TOWERS[M.tower].name} ${RANKS[M.rank]}`);
  if (T.hunted > mi(g)) parts.push('협회 집행관에게 쫓기는 몸');
  if (forbiddenLv(g) > 0 && T.taint >= 15) parts.push(taintWord(T.taint));
  return parts.join(' · ');
}

// 가진 마도구의 쓸모 (매달)
HOOKS.afterMonth.push((g, rng) => {
  const T = g.tower;
  if (!T?.items?.length) return;
  const p = g.player;
  const has = (id) => T.items.includes(id);
  if (has('charm')) p.stress = Math.max(0, p.stress - 1);
  if (has('lantern')) p.fatigue = Math.max(0, (p.fatigue ?? 0) - 1);
  if (has('ring') && g.date.month % 2 === 0) for (const inj of p.injuries ?? []) if (inj.months > 1) inj.months -= 1;
  if (has('compass') && g.life?.travel && rng?.chance?.(0.15)) p.money += rng.int(2, 6);
  if (has('coldstone') && g.seal) g.seal.known = Math.max(g.seal.known ?? 0, (g.seal.stage ?? 0) >= 2 ? 2 : 1);
  if (has('mirror') && g.date.month % 3 === 0) p.money += 2;
});
