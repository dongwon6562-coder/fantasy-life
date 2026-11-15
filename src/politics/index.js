// 9단계: 움직이는 대륙. 나라끼리 동맹·전쟁·혼인·조약, 왕조 교체와 멸망, 국경과 땅 주인, 대륙 소식.
// 화면(지도 위 국경·전쟁)은 아래 함수만 읽으면 된다.
import './state.js';
import './world.js';
import './actions.js';
import './events.js';
import { LANDS } from './data.js';
import { PS, mi, short, full, nations, relOf, relWord, allWars, warsOf, landOwner, landsOf, rulerLine, rulerAge, alliesOf, overlordOf, pactsOf, foeIn } from './state.js';
import { strength } from './world.js';
import { mercOffer } from './actions.js';

export { LANDS, relOf, relWord, landOwner, landsOf, allWars, warsOf, rulerLine, alliesOf, overlordOf, strength, mercOffer };
export const politicsState = PS;

// 지도용 한 장: 땅 주인(지도 P id), 전쟁, 조약, 통치자
//   lands[{id, name, home, owner, changed}]  wars[{a, b, aName, bName, months, lead, edge, lands[]}]
//   pacts[{a, b, kind}]  realms[{id, name, ruler, age, stab, power, allies[], wars[], overlord}]
export function politicsMap(g) {
  const P = PS(g);
  return {
    lands: Object.entries(LANDS).map(([id, l]) => { const owner = landOwner(g, id); return { id, name: l.name, home: l.home, owner, changed: owner !== l.home }; }),
    wars: allWars(g).map((w) => {
      const lead = w.score > 3 ? w.a : w.score < -3 ? w.b : null;
      const lands = Object.keys(LANDS).filter((id) => { const l = LANDS[id]; const o = landOwner(g, id); return (o === w.a && (l.rivals.includes(w.b) || l.home === w.b)) || (o === w.b && (l.rivals.includes(w.a) || l.home === w.a)); });
      return { a: w.a, b: w.b, aName: short(w.a), bName: short(w.b), months: Math.max(0, mi(g) - w.since), lead, edge: Math.round(Math.abs(w.score)), lands };
    }),
    pacts: P.pacts.map((p) => ({ a: p.a, b: p.b, kind: p.kind })),
    realms: nations().map((id) => ({
      id, name: full(id), ruler: id === 'leonia' ? null : rulerLine(g, id), age: id === 'leonia' ? null : rulerAge(g, id),
      stab: Math.round(P.stab[id] ?? 60), power: Math.round(strength(g, id)), allies: alliesOf(g, id), wars: warsOf(g, id).map((w) => foeIn(w, id)), overlord: overlordOf(g, id),
    })),
  };
}
const KIND = { alliance: '동맹', trade: '교역 조약', truce: '휴전', marriage: '혼인', vassal: '신종' };
// 두 나라 사이 한 줄: "날 선 사이 · 휴전"
export function tieLine(g, a, b) {
  const w = allWars(g).find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  const parts = [w ? '전쟁 중' : relWord(relOf(g, a, b)), ...pactsOf(g, a, b).map((p) => KIND[p.kind])];
  return parts.join(' · ');
}
// 머리글 한 줄: 대륙에서 벌어지는 전쟁
export function politicsLine(g) {
  const ws = allWars(g);
  if (!ws.length) return '대륙: 큰 전쟁 없음';
  return `대륙: ${ws.map((w) => `${short(w.a)}-${short(w.b)} 전쟁`).join(', ')}`;
}
// 대륙 소식 (최근 것부터 n개)
export const continentNews = (g, n = 8) => PS(g).news.slice(-n).reverse();
// 끊긴 왕조
export const fallenHouses = (g) => [...PS(g).fallen];
