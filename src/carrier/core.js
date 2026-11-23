// 길 위의 일: 마부와 역참 (36단계). 상태와 도우미.
// - 장사(trade)의 짐과 상회, 길 떠나기(places travel), 말(beasts), 큰 공사(works)의 길은 그쪽이 맡는다.
// - 여기(game.carrier)는 남의 짐과 사람을 나르는 사람의 삶: 짐꾼·짐수레꾼·마부·길잡이와 역참 주인.
//   짐 맡기와 품삯, 수레 꾸리기, 역참 차리기, 길의 위험, 운송 상단과 겨루기, 쇠수레 길이 오면 줄어드는 일.
// 상태는 game.carrier 하나:
//   knack: 길눈 (0~100)   cart: null | { kind, cond }   haul: null | 맡은 짐
//   station: null | { place, name, since, rep, horses, hands }   routes: { 'a|b': 다닌 횟수 }
//   houses: { id: { power, routes[], gone } }  운송 상단 (플레이어 없이도 길을 넓히고, 쇠수레 길에 무너진다)
//   rivalAt, evAt, fadeSeen[], done, earned, lost, log, past
import { HOOKS } from '../hooks.js';
import { PLACES, travelMonths } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge } from '../game.js';
import { reachedAt } from '../techspread/state.js';
import { J } from '../narrative/text.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
export const adult = (g) => playerAge(g) >= 15;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 83) ^ Math.imul(mi(g) * 163 + salt + 379, 2654435761)) | 0 });
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;
export const routeKey = (a, b) => [a, b].sort().join('|');
export const reached = (g, id, pl = here(g)) => reachedAt(g, id, pl);

// 길 위의 일자리 (마부 coachman은 34단계 era/later.js)
export const CARRIER_JOBS = ['porter', 'hauler', 'coachman', 'guide'];
export const carrierJob = (g) => (CARRIER_JOBS.includes(L(g).job?.id) ? L(g).job.id : null);

// 말: 길든 말과 군마 (beasts)
export const horses = (g) => (g.beasts?.animals ?? []).filter((a) => a.alive && ['horse', 'warhorse'].includes(a.kind) && (a.trained ?? 0) >= 60);

// 수레: 손수레(혼자 끈다), 짐수레(말 하나), 승합 마차(말 둘, 손님)
export const CARTS = {
  handcart: { name: '손수레', cost: 10, horses: 0, cap: 2, desc: '바퀴 둘 달린 손수레. 내 힘으로 끈다.' },
  wagon: { name: '짐수레', cost: 45, horses: 1, cap: 5, desc: '말 한 마리가 끄는 짐수레. 곡식 열 섬은 싣는다.' },
  coach: { name: '승합 마차', cost: 110, horses: 2, cap: 4, people: true, desc: '말 둘이 끄는 지붕 덮인 마차. 손님 여섯을 태운다.' },
};
export const CART_IDS = Object.keys(CARTS);

// 맡는 짐: back 등짐(짐꾼), freight 수레 짐, people 손님, mail 편지와 급한 소식, guide 길 안내
export const LOADS = {
  back: { name: '등짐', what: ['소금 자루', '약초 꾸러미', '쇠못 상자', '털가죽 묶음'], base: 3, need: null },
  freight: { name: '수레 짐', what: ['밀 열 섬', '포도주 통', '쇠붙이 궤짝', '옷감 짐짝', '돌 판'], base: 6, need: 'cart' },
  people: { name: '손님', what: ['장사꾼 일행', '순례자들', '시집가는 처녀와 어머니', '휴가 나온 병사들', '학원 가는 젊은이들'], base: 7, need: 'coach' },
  mail: { name: '급한 편지', what: ['상단의 어음', '영주의 봉인 편지', '혼담 편지', '부고'], base: 5, need: 'horse' },
  guide: { name: '길 안내', what: ['고개를 넘는 상인', '사냥꾼 일행', '광맥 찾는 드워프', '길 잃은 순례자'], base: 5, need: 'guide' },
};

// 역참을 차릴 만한 길목 (길이 셋 넘게 갈라지거나 고개 앞)
export const STATION_PLACES = ['verden', 'harfen', 'graubel', 'gruental', 'fur', 'klein', 'hammer', 'ern', 'barka', 'leocast', 'eisen'];
export const STATION_COST = 120;
export const traffic = (pl) => Math.min(6, Object.keys(PLACES[pl]?.links ?? {}).length) + ((PLACES[pl]?.crowd ?? 0.2) * 5);

// 운송 상단: 큰 길을 차지하고 값을 후려친다
export const HOUSES = {
  greywheel: { name: '회색 바퀴 운송단', seat: 'harfen', motto: '하르펜 성문에서 왕도까지, 늦으면 삯을 받지 않는다' },
  northpost: { name: '북로 역마회', seat: 'graubel', motto: '눈 덮인 고개에도 역마는 달린다' },
  verdencart: { name: '베르덴 짐수레 조합', seat: 'verden', motto: '강 건너 짐은 우리 바퀴로' },
};
export const HOUSE_IDS = Object.keys(HOUSES);

// 길이 바뀐다: 쇠수레 길·쇠수레·전신탑·비행선이 오면 일이 준다 (기술이 그 고장에 닿았는가로 본다)
export const FADE = { railroad: 0.35, ironcart: 0.15, signal: 0.1, airship: 0.15 };
export function fadeAt(g, pl = here(g)) {
  let f = 0;
  for (const [id, v] of Object.entries(FADE)) if (reached(g, id, pl)) f += v;
  return Math.min(0.7, f);
}
// 철길이 놓인 구간은 짐도 손님도 쇠수레로 간다
export const RAIL = [['leocast', 'harfen']];
export const railed = (g, a, b) => reached(g, 'railroad', a) && reached(g, 'railroad', b) && RAIL.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export const KNACK_RANK = ['풋내기', '길 아는 사람', '길에 밝은 사람', '길의 귀신'];
export const knackRank = (g) => { const k = C(g).knack; return k < 25 ? 0 : k < 50 ? 1 : k < 75 ? 2 : 3; };
export const linksOf = (pl) => Object.keys(PLACES[pl]?.links ?? {}).filter((x) => PLACES[x] && !PLACES[x].hidden);
export { travelMonths };

function fresh() {
  const houses = {};
  for (const id of HOUSE_IDS) houses[id] = { power: 30, routes: [], gone: false };
  return { knack: 0, cart: null, haul: null, station: null, routes: {}, houses, rivalAt: 0, evAt: 0, fadeSeen: [], done: 0, earned: 0, lost: 0, log: [], past: [] };
}
export const C = (g) => (g.carrier ??= fresh());
export function logC(g, text) {
  const s = C(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export function gainKnack(g, base) {
  const s = C(g);
  const v = base * (0.7 + (g.player.stats.sen ?? 0) / 100) * (1 - s.knack / 115);
  s.knack = clamp(s.knack + v, 0, 100);
  return v;
}
export const stationHere = (g) => !!C(g).station && C(g).station.place === here(g) && !L(g).travel;
export const houseOn = (g, key) => HOUSE_IDS.find((id) => !C(g).houses[id].gone && C(g).houses[id].routes.includes(key)) ?? null;

HOOKS.newGame.push((g) => { g.carrier = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.carrier) { g.carrier = d; return; }
  for (const k of Object.keys(d)) if (g.carrier[k] === undefined) g.carrier[k] = d[k];
  for (const id of HOUSE_IDS) g.carrier.houses[id] ??= d.houses[id];
  if (g.carrier.haul && !PLACES[g.carrier.haul.to]) g.carrier.haul = null;
});
