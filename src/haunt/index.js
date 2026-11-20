// 22단계: 망자와 저주. 원한을 품고 죽은 사람의 잔향, 흉가와 버려진 묘지, 저주받은 물건과 집안의 저주,
// 시골 영매와 교단의 퇴마 사제, 사기꾼 무당, 그리고 마신 봉인의 틈에서 힘을 얻은 망령(아주 드물게).
// 화면용: hauntInfo(g), hauntLine(g)
import { HS, KINDS, GRIEFS, ITEMS, CURSES, MEDIUMS, placeName, spotsAt, liveSpots, dreadWord, powerWord, curseWord, mediumWord } from './state.js';
import './world.js';
import './life.js';
import { L } from '../adventure/core.js';

export { KINDS, ITEMS, CURSES } from './state.js';
export { hauntMonth, makeSpot, laySpot, becomeWraith, sealStage } from './world.js';
export const hauntState = HS;

const view = (g, id) => {
  const s = HS(g).spots[id];
  return {
    id, name: s.name, place: placeName(s.place), kind: KINDS[s.kind]?.name ?? '',
    // 겪어 보기 전에는 진짜인지 모른다
    real: s.known >= 1 ? s.real : null, feel: s.known >= 1 && s.real ? powerWord(s.power) : '',
    dead: s.dead.name, how: s.dead.how, grief: s.known >= 2 ? GRIEFS[s.dead.grief].word : '', ask: s.known >= 2 ? GRIEFS[s.dead.grief].ask : '',
    restless: s.state === 'restless', wraith: !!s.wraith, hurt: s.hurt, known: s.known,
  };
};
// 화면용 한 장
//   { here[이 고장 흉한 자리], known[겪어 본 자리 전부], dread(이 고장 흉흉함: 낱말), frauds(이 고장 사기꾼 무당 수),
//     medium(이 고장 영매 이름 | ''), wraith{ name, place, hurt } | null, items[{ name, desc }],
//     curse{ name, why, power(낱말), gens(몇 대째), known } | null, me{ ..., mediumWord }, log[{y,m,text}] }
export function hauntInfo(g) {
  const H = HS(g), pl = L(g).place;
  const w = H.wraith ? H.spots[H.wraith] : null;
  const C = H.curse;
  return {
    here: spotsAt(g, pl).map((id) => view(g, id)),
    known: liveSpots(g).filter((id) => H.spots[id].known >= 1).map((id) => view(g, id)),
    dread: dreadWord(H.dread[pl] ?? 0), frauds: H.frauds[pl] ?? 0,
    medium: MEDIUMS[pl] && !H.mediums?.[pl]?.gone ? MEDIUMS[pl].name : '',
    wraith: w?.wraith ? { name: w.name, place: placeName(w.place), hurt: w.hurt } : null,
    items: H.items.map((it) => ({ name: ITEMS[it.kind]?.name ?? it.name, desc: ITEMS[it.kind]?.desc ?? '' })),
    curse: C ? { name: CURSES[C.kind]?.name ?? '집안의 저주', why: C.why, power: C.known ? curseWord(C.power) : '', gens: (L(g).gen ?? 1) - C.gen + 1, known: !!C.known } : null,
    me: { ...H.me, medium: Math.round(H.me.medium), mediumWord: mediumWord(H.me.medium) },
    log: H.log.slice(-10).reverse(),
  };
}
// 머리글 한 줄: 망령이 이 고장에 있거나, 집안의 저주가 있거나, 이 고장에 들끓는 자리가 있을 때만
export function hauntLine(g) {
  const H = HS(g), pl = L(g).place;
  const w = H.wraith ? H.spots[H.wraith] : null;
  if (w?.wraith && w.place === pl) return `망령: ${w.name}, 벌써 ${w.hurt}명이 죽었다`;
  if (H.curse) return `집안의 저주: ${CURSES[H.curse.kind]?.name ?? '저주'}`;
  const r = spotsAt(g, pl).map((id) => H.spots[id]).find((s) => s.state === 'restless' && s.known >= 1);
  if (r) return `흉한 자리: ${r.name}`;
  return null;
}
