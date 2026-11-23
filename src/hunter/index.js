// 사냥꾼과 덫꾼 (37단계): 사냥터와 영주의 숲(허가·밀렵·산지기), 철마다 다른 짐승과 모피·가죽·고기, 모피 상인과 주문,
// 사냥개·매와 함께, 큰뿔사슴·늑대 떼·들소 같은 큰 사냥과 다침, 오두막(훈연막·건조대)과 도제, 귀족 사냥 대회 몰이꾼.
// 화면: hunterLine(g) 오늘의 장면 한 줄, hunterInfo(g) 화면용 묶음 (hunterStatus는 같은 것).
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { H, mi, here, placeName, skill, isHunter, seasonOf, GROUNDS, GAME, furName, FUR_TOWNS, stockOf, licensed, bannedAt, furCount, lodgeHere, hasWood, hasLord } from './core.js';
import { furPrice } from './life.js';
import './world.js';

export { H as hunterState, GAME as HUNT_GAME, GROUNDS as HUNT_GROUNDS };
export { huntOnce, gameHere, furPrice, forester } from './life.js';
export { stockMonth, royalOk } from './world.js';

/** 화면용 묶음 */
export function hunterInfo(g) {
  const s = H(g), pl = here(g), gr = GROUNDS[pl];
  return {
    hunter: isHunter(g), skill: Math.round(skill(g)), season: seasonOf(g),
    ground: gr ? { wood: gr.wood ?? null, lord: gr.lord?.name ?? null, fee: gr.lord?.fee ?? 0, licensed: licensed(g), banned: bannedAt(g), stock: Math.round(stockOf(g, pl)) } : null,
    furs: Object.entries(s.furs).filter(([id, n]) => n > 0 && GAME[id]).map(([id, n]) => ({ name: furName(id), n, price: FUR_TOWNS[pl] ? furPrice(g, id) : null })),
    meat: s.meat, smoked: Math.round(s.smoked),
    trader: { name: s.trader.name, trust: s.trader.trust, order: s.trader.order ? { what: GAME[s.trader.order.kind].name, n: s.trader.order.n, left: Math.max(0, s.trader.order.until - mi(g)) } : null },
    lodge: s.lodge ? { place: placeName(s.lodge.place), since: s.lodge.since, apprentices: s.lodge.app.map((a) => a.name) } : null,
    licenses: Object.entries(s.license).filter(([, t]) => t > mi(g)).map(([p]) => GROUNDS[p]?.lord?.name ?? placeName(p)),
    bigs: s.bigs.slice(-6), hunts: s.hunts, earned: s.earned, poached: s.poached, caught: s.caught,
    log: s.log.slice(-8),
  };
}
export const hunterStatus = hunterInfo;

const WOOD_LINE = {
  봄: (w) => `${w}에 새끼 밴 노루 발자국이 얕게 찍혀 있다.`,
  여름: (w) => `${w} 그늘 아래 날파리가 들끓는다. 짐승들은 낮에 움직이지 않는다.`,
  가을: (w) => `${w}에서 수사슴이 우는 소리가 해 질 녘마다 들린다.`,
  겨울: (w) => `눈 덮인 ${w}에 여우 발자국이 한 줄로 길게 나 있다.`,
};
/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function hunterLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const s = H(g), t = mi(g), pl = here(g), gr = GROUNDS[pl];
  if (lodgeHere(g)) {
    if (s.lodge.app.length && t % 3 === 0) return `오두막 마당에서 ${J(s.lodge.app[0].name, '이/가')} 가죽에서 기름을 긁어내고 있다.`;
    if (t % 2 === 0) return s.smoked > 0 ? '훈연막에서 오리나무 연기가 가늘게 새어 나온다. 고기 냄새가 숲까지 번진다.' : '처마 밑 건조대에 가죽들이 바람에 흔들린다.';
  }
  const o = s.trader.order;
  if (o && o.until - t <= 2 && t % 2 === 1) return `${s.trader.name}에게 줄 ${GAME[o.kind].name} 모피가 아직 ${o.n}장 다 모이지 않았다.`;
  if (furCount(g) >= 6 && FUR_TOWNS[pl] && t % 3 === 1) return '등짐 속 모피 더미에서 짐승 냄새가 난다. 모피 거리 상인들이 곁눈질을 한다.';
  if (bannedAt(g) && gr?.lord && t % 4 === 2) return `${gr.lord.name} 울타리 앞을 지날 때마다 산지기가 나를 알아보고 눈을 가늘게 뜬다.`;
  if (!(isHunter(g) || skill(g) >= 8)) return null;
  if (gr && hasWood(pl) && stockOf(g, pl) < 25 && t % 4 === 3) return `${J(gr.wood, '이/가')} 조용하다. 짐승들이 씨가 말랐다.`;
  if (gr && hasWood(pl) && t % 5 === 0) return WOOD_LINE[seasonOf(g)](gr.wood);
  if (gr && hasLord(pl) && licensed(g) && t % 5 === 2) return `허리춤의 허가패가 ${gr.lord.name} 문지기 앞에서 짤랑거린다.`;
  return null;
}
