// 21단계: 광산과 땅 밑 일. 광산 고장, 광맥 찾기와 광업권·소유권 다툼, 광부의 삶과 갱도 붕괴, 마석 광맥과 시세,
// 드워프에게 배우기, 광부들의 파업, 너무 깊이 파서 깨운 것. 큰 미궁(깊은 구렁, src/deep)과는 따로다.
// 화면용: mineInfo(g), mineLine(g)
import { MS, ORES, ORE_IDS, DEEP, OWNER_WORD, placeName, unrestWord, veinWord, safeWord, myMines, sitesNear, oreValue, outputOf } from './state.js';
import './world.js';
import './life.js';
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';

export { ORES, MINES } from './state.js';
export { mineMonth, collapse, awaken } from './world.js';
export const mineState = MS;

const view = (g, id) => {
  const s = MS(g).sites[id];
  return {
    id, name: s.name, place: placeName(s.near), ore: ORES[s.ore]?.name ?? '', owner: OWNER_WORD[s.owner] ?? '', ownerName: s.owner === 'me' ? '나' : s.ownerName ?? '',
    mine: s.owner === 'me', depth: s.depth, vein: veinWord(s.vein), safety: safeWord(s.safety), unrest: unrestWord(s.unrest),
    strike: !!s.strike, closed: s.closed > 0, awoke: s.awoke ? DEEP[s.awoke.kind]?.name ?? '' : '', dead: s.dead, collapses: s.collapses,
    miners: s.owner === 'me' ? s.miners : null, wage: s.owner === 'me' ? s.wage : null, legal: s.legal !== false,
    output: s.owner === 'me' ? Math.round(outputOf(s, s.miners)) : null,
  };
};
// 화면용 한 장
//   { here[이 고장 광산들], mine[내 광산들], all[모든 광산], prices[{ore, price(짐당 은화)}], me{ shifts, finds, owned, sold, income, lastIncome, lore, strikes, scabbed, saved, sealed },
//     dwarf(드워프 길드가 나를 보는 눈: 낱말), log[{y,m,text}] }
export function mineInfo(g) {
  const S = MS(g), pl = L(g).place;
  const dw = S.dwarf;
  return {
    here: sitesNear(g, pl).map((id) => view(g, id)),
    mine: myMines(g).map((id) => view(g, id)),
    all: Object.keys(S.sites).map((id) => view(g, id)),
    prices: ORE_IDS.map((o) => ({ ore: ORES[o].name, price: oreValue(g, o) })),
    me: { ...S.me, lore: Math.round(S.me.lore) },
    dwarf: dw >= 30 ? '믿을 만한 사람으로 본다' : dw >= 5 ? '얼굴을 안다' : dw > -30 ? '' : '너무 깊이 판 사람으로 본다',
    log: S.log.slice(-10).reverse(),
  };
}
// 머리글 한 줄: 내 광산이 있거나, 이 고장 광산에 큰일이 있을 때만
export function mineLine(g) {
  const S = MS(g), mine = myMines(g).map((id) => S.sites[id]);
  const bad = mine.find((s) => s.awoke || s.strike);
  if (bad) return `광산: ${J(bad.name, '이/가')} ${bad.awoke ? '막혔다' : '파업 중'}`;
  if (mine.length) return `광산: ${mine.length}곳, 지난달 몫 은화 ${S.me.lastIncome}닢`;
  const h = sitesNear(g, L(g).place).map((id) => S.sites[id]).find((s) => s.awoke || s.strike);
  if (h) return `광산: ${J(h.name, '이/가')} ${h.awoke ? '막혔다' : '파업 중'}`;
  return null;
}
