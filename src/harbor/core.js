// 포구와 어부의 삶: 상태와 도우미.
// - sea(src/sea/)는 큰 배의 항해·뱃길·교역·해적질을 맡는다. 여기서는 포구에 매인 작은 배의 삶: 고깃배, 그물, 철마다 드는 고기,
//   어장, 폭풍과 실종, 내 배와 선원, 생선 말리기·소금 절이기와 팔기, 포구의 풍습과 과부들.
// 상태는 game.harbor 하나:
//   boat: null | { kind, name, place, hull, nets, crew: [id…], since }
//   fresh: { [fish]: 광주리 }   이 달에 잡은 날생선 (달이 넘어가면 상한다)
//   cured: [{ f, how: 'dried'|'salted', n, y }]   말리거나 절인 생선 (오래 간다)
//   grounds: { [포구]: { rival, feud } }   어장 다툼
//   lost: [{ name, y, place, how }]   바다에서 돌아오지 못한 사람
//   widows: [{ name, place, y, helped }]   포구의 과부
//   firstAt, eventAt, hauls, earned, smuggled, tribute, log
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { conditions } from '../art/scene.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const sail = (g) => g.player.skills?.sailing ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 83) ^ Math.imul(mi(g) * 131 + salt + 211, 2654435761)) | 0 });
export const sky = (g) => conditions(g.date.year, g.date.month);

// 고기잡이 포구: 앞바다 어장과 맞수 포구
export const HARBORS = {
  klein: { name: '클라인 항', ground: '클라인 앞바다', rival: 'saltrock', salt: 2, folk: '레오니아 어부', god: '바다의 늙은이와 성광' },
  saltrock: { name: '소금바위섬', ground: '흰바위 여울', rival: 'klein', salt: 1, folk: '섬 어부', god: '바다의 늙은이' },
  portel: { name: '항구도시 포르텔', ground: '포르텔 만', rival: 'saltmare', salt: 2, folk: '포르텔 뱃사람', god: '여러 나라의 신' },
  saltmare: { name: '살트마레', ground: '군도 사이 물길', rival: 'portel', salt: 2, folk: '섬사람', god: '바다의 늙은이' },
};
export const isHarbor = (pl) => !!HARBORS[pl];
export const atHarbor = (g) => isHarbor(here(g)) && !L(g).travel;

// 철마다 드는 고기: 광주리 값, 드는 달, 말릴 수 있나, 절일 수 있나
export const FISH = {
  herring: { name: '청어', months: [2, 3, 4, 5], price: 2, salt: true, line: '청어 떼가 들어와 바다가 은빛으로 끓는다.' },
  mackerel: { name: '고등어', months: [6, 7, 8, 9], price: 3, salt: true, line: '고등어 떼가 물낯을 뒤집는다.' },
  squid: { name: '오징어', months: [7, 8, 9], price: 3, dry: true, night: true, line: '밤바다에 집어등이 줄지어 뜬다.' },
  eel: { name: '장어', months: [9, 10], price: 5, line: '갯바위 틈마다 장어 통발이 놓였다.' },
  cod: { name: '대구', months: [11, 12, 1, 2], price: 4, dry: true, salt: true, line: '찬 바다에서 대구가 올라온다.' },
  oyster: { name: '굴', months: [10, 11, 12, 1], price: 3, shore: true, line: '썰물 때 아낙들이 갯바위에서 굴을 딴다.' },
};
export const FISH_IDS = Object.keys(FISH);
export const fishNow = (m) => FISH_IDS.filter((id) => FISH[id].months.includes(m));

// 배: 값, 선원 수, 잡는 힘, 폭풍에 견디는 힘
export const BOATS = {
  skiff: { name: '쪽배', cost: 40, crew: 0, haul: 1, sturdy: 0, nets: 1 },
  boat: { name: '고깃배', cost: 160, crew: 2, haul: 2.4, sturdy: 12, nets: 2 },
  smack: { name: '큰 어선', cost: 480, crew: 5, haul: 4.6, sturdy: 25, nets: 3 },
};
export const BOAT_NAMES = ['갈매기', '은비늘', '늙은 고래', '바람개비', '아침물결', '세 자매', '소금꽃', '검은 닻', '푸른 등'];
export const NET_COST = 12;

function fresh() {
  return { boat: null, fresh: {}, cured: [], grounds: {}, lost: [], widows: [], firstAt: 0, eventAt: 0, hauls: 0, earned: 0, smuggled: 0, tribute: 0, log: [], spoiled: 0, worldAt: 0 };
}
export const H = (g) => (g.harbor ??= fresh());
export const boat = (g) => H(g).boat;
export const boatHere = (g) => !!boat(g) && boat(g).place === here(g) && atHarbor(g);
export const freshCount = (g) => FISH_IDS.reduce((a, f) => a + (H(g).fresh[f] ?? 0), 0);
export const curedCount = (g) => H(g).cured.reduce((a, c) => a + c.n, 0);
export const curedValue = (c) => Math.round(FISH[c.f].price * c.n * (c.how === 'salted' ? 1.9 : 1.7));
export const freshValue = (g) => FISH_IDS.reduce((a, f) => a + (H(g).fresh[f] ?? 0) * FISH[f].price, 0);
export function logHarbor(g, text) {
  const s = H(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const groundOf = (g, pl) => (H(g).grounds[pl] ??= { feud: 0, rival: HARBORS[pl]?.rival ?? null });

HOOKS.newGame.push((g) => { g.harbor = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.harbor) { g.harbor = d; return; }
  for (const k of Object.keys(d)) if (g.harbor[k] === undefined) g.harbor[k] = d[k];
});
