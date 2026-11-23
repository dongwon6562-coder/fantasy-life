// 길 위의 일: 마부와 역참 (36단계). 짐꾼·짐수레꾼·마부·길잡이와 역참 주인.
// 짐 맡기와 품삯, 수레 꾸리기, 역참 차리기, 길의 위험, 운송 상단과 겨루기, 쇠수레 길이 오면 줄어드는 일.
// 화면: carrierLine(g) 오늘의 장면 한 줄, carrierInfo(g) 화면용 묶음 (carrierStatus는 같은 것).
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { C, Q, mi, here, placeName, carrierJob, horses, CARTS, LOADS, HOUSES, HOUSE_IDS, KNACK_RANK, knackRank, fadeAt, stationHere, travelMonths } from './core.js';
import './life.js';
import './world.js';

export { C as carrierState, CARTS, HOUSES as CARRIER_HOUSES };
export { offersFor, kindsFor, payFor, deliver, roadKinds } from './life.js';
export { roadChance, housesYear } from './world.js';

/** 화면용 묶음 */
export function carrierInfo(g) {
  const s = C(g), h = s.haul, st = s.station;
  return {
    knack: Math.round(s.knack), rank: KNACK_RANK[knackRank(g)], job: carrierJob(g),
    cart: s.cart ? CARTS[s.cart.kind].name : null, horses: horses(g).map((a) => a.name),
    haul: h ? { what: h.what, kind: LOADS[h.kind].name, from: placeName(h.from), to: placeName(h.to), pay: h.pay, load: Math.round(h.load * 100), late: mi(g) > h.due } : null,
    station: st ? { name: st.name, place: placeName(st.place), since: st.since, rep: Math.round(st.rep), horses: st.horses, hands: st.hands, inn: !!st.inn } : null,
    houses: HOUSE_IDS.map((id) => ({ name: HOUSES[id].name, seat: placeName(HOUSES[id].seat), power: Math.round(s.houses[id].power), routes: s.houses[id].routes.map((k) => k.split('|').map(placeName).join('–')), gone: !!s.houses[id].gone, mine: s.hired === id })),
    fade: Math.round(fadeAt(g) * 100),
    done: s.done, earned: s.earned, lost: s.lost, routes: Object.entries(s.routes).map(([k, n]) => ({ road: k.split('|').map(placeName).join('–'), n })),
    past: s.past, log: s.log.slice(-8),
  };
}
export const carrierStatus = carrierInfo;

const ROAD = [
  (h) => `${J(placeName(h.to), '으로/로')} 가는 길, 이정표 돌에 이끼가 끼었다. ${h.kind === 'people' ? '마차 안에서 손님들이 졸고 있다.' : '짐을 묶은 밧줄을 다시 조였다.'}`,
  (h) => `길가 역참에서 말에게 물을 먹였다. ${placeName(h.to)}까지 아직 멀었다.`,
  (h) => (h.kind === 'mail' ? '품 안의 봉인 편지가 말이 뛸 때마다 가슴을 친다.' : `${J(h.what, '을/를')} 실은 바퀴가 돌부리를 넘을 때마다 덜컹거린다.`),
];
const STATION = [
  (n) => `${n} 마구간에서 역마가 여물을 씹는 소리가 난다.`,
  (n) => `${n} 마당에 밤늦게 들어온 마차 바퀴 자국이 깊다.`,
  (n) => `${n} 문간에 걸린 말굽 간판이 바람에 삐걱거린다.`,
];
/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function carrierLine(g) {
  if (!g?.player || g.over) return null;
  const s = C(g), t = mi(g), h = s.haul;
  if (h && L(g).travel && !L(g).travel.sea) return ROAD[t % ROAD.length](h);
  if (L(g).travel) return null;
  if (stationHere(g) && t % 2 === 0) {
    if (fadeAt(g) >= 0.35 && t % 4 === 0) return `${Q(s.station.name, '은/는')} 요즘 손님보다 빈 마구간이 많다. 쇠수레 기적 소리가 들판을 건너온다.`;
    return STATION[t % STATION.length](`'${s.station.name}'`);
  }
  if ((carrierJob(g) || s.cart) && fadeAt(g) >= 0.35 && t % 3 === 1) return '성문 앞에 일감 없는 마부들이 쪼그려 앉아 쇠수레가 지나가는 것을 본다.';
  const seat = HOUSE_IDS.find((id) => HOUSES[id].seat === here(g) && !s.houses[id].gone);
  if (seat && t % 5 === 2) return `${HOUSES[seat].name} 깃발을 단 짐수레들이 성문 앞에 줄지어 섰다.`;
  if (s.cart && t % 6 === 3) return `${CARTS[s.cart.kind].name} 바퀴에 기름을 먹였다. 축이 낡아 소리가 난다.`;
  return null;
}
