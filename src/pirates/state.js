// 49단계 해적과 바다의 무법자: 상태와 자료.
// g.pirates = { seq, bands[], fleets[], hoards[], retired[], danger{west,south}, losses{west,south}, log[], me{...}, heard }
//   band: { id, name, flag, lair(이름), lairAt(실제 고장 id|null), sea, cap{name,nick,age,since}, men, ships, wealth, prizes,
//           code('even'|'captain'|'blood'), letter{realm,foe,until}|null, born, fell{y,how}|null, fame, mine }
//   fleet: { id, realm, sea, target(band id), left(달), str, wins }
//   hoard: { id, band, cap, isle, near(가까운 항구), value, y, dug(null|{y,by}), cursed }
//   me: { maps[{hoard, pieces, fake}], letter{realm,foe,until,taken,y}|null, retired{y,band,rank}|null, taken(잡힌 횟수), takenAt,
//         seenRaids, standing(동료들 눈), hunts, oldAt, pastAt, shareAt, trialAt, log[] }
// 세상 주사위와 따로 굴린다(ownRng). 플레이어 없이도 해적단이 흥하고 망한다.
import { J } from '../narrative/text.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { L } from '../adventure/core.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const here = (g) => (g.life ? L(g).place ?? 'ern' : 'ern');
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 491) ^ Math.imul(mi(g) * 151 + salt + 37, 2654435761)) | 0 });

/* ---------- 바다 ---------- */
export const SEAS = {
  west: { name: '서쪽 바다', ports: ['klein', 'saltrock'], navy: 'leonia', board: 'klein', goods: ['salt', 'grain', 'fur'] },
  south: { name: '남해', ports: ['portel', 'saltmare', 'crow'], navy: 'free', board: 'portel', goods: ['spice', 'wine', 'manastone'] },
};
export const SEA_IDS = Object.keys(SEAS);
export const seaOf = (pl) => (SEAS.west.ports.includes(pl) ? 'west' : SEAS.south.ports.includes(pl) ? 'south' : null);
export const NAVY_NAME = { leonia: '레오니아 해군', free: '자유도시 연합 함대', sea: '섬장 회의' };

/* ---------- 해적단 ---------- */
export const FIRST_BANDS = [
  { id: 'crow', name: '까마귀단', flag: '검은 바탕에 흰 까마귀', lair: '까마귀 둥지', lairAt: 'crow', sea: 'south', code: 'captain', men: 120, ships: 4 },
  { id: 'tooth', name: '소금이빨단', flag: '붉은 바탕에 흰 이빨 셋', lair: '안개 이빨 섬', lairAt: null, sea: 'west', code: 'even', men: 70, ships: 2 },
  { id: 'widow', name: '검은 과부단', flag: '검은 바탕에 붉은 손바닥', lair: '해골 여울', lairAt: null, sea: 'south', code: 'blood', men: 60, ships: 2 },
  { id: 'anchor', name: '녹슨 닻 형제회', flag: '잿빛 바탕에 부러진 닻', lair: '붉은 닻 만', lairAt: null, sea: 'west', code: 'even', men: 45, ships: 1 },
];
export const NEW_BANDS = [
  ['바다쥐단', '갈색 바탕에 이빨 드러낸 쥐'], ['세 돛 형제단', '파란 바탕에 흰 돛 셋'], ['흰 상어단', '검은 바탕에 흰 지느러미'],
  ['물개 이빨단', '초록 바탕에 굽은 이빨'], ['안개 칼단', '흰 바탕에 엇갈린 칼'], ['붉은 갈매기단', '붉은 바탕에 검은 갈매기'],
  ['굶은 고래단', '검은 바탕에 뼈만 남은 고래'], ['소금 과부들', '잿빛 바탕에 검은 면사포'], ['외눈 형제단', '검은 바탕에 붉은 눈 하나'],
  ['늙은 문어단', '자줏빛 바탕에 여덟 팔'],
];
export const NEW_LAIRS = ['검은 바위 만', '물새 섬', '부러진 등대', '난파선 무덤', '뱀 꼬리 곶', '쌍둥이 암초', '썩은 돛 섬', '안개 해협 동굴'];
export const CODES = {
  even: { name: '고른 몫', text: '선장 두 몫, 갑판장 한 몫 반, 나머지 한 몫씩. 다친 자는 팔 하나에 은화 서른.' },
  captain: { name: '선장 몫', text: '노획의 절반은 선장, 나머지를 나눈다. 대신 배와 칼은 선장이 댄다.' },
  blood: { name: '피의 규약', text: '배신자는 바다에, 도둑은 무인도에. 몫은 고르지만 규약을 어기면 목숨으로 갚는다.' },
};
export const CAP_NAMES = {
  m: ['바스코', '디에고', '말로', '킬리안', '오스만', '토마스', '라파', '에스테반', '고트프리트', '하콘', '루포', '브란트'],
  f: ['마렌', '이솔다', '카탈리나', '네라', '마리솔', '알바', '루시아', '그레타', '시그리드'],
};
export const NICKS = ['갈고리손', '소금이빨', '흑돛', '외눈', '세 손가락', '물개', '녹슨 닻', '붉은 수염', '웃는 칼', '바다쥐', '늙은 고래', '과부', '침묵', '불탄 혀'];

export const ME_RANKS = ['졸개', '갑판장', '해적 선장', '섬장'];

/* ---------- 상태 ---------- */
const freshMe = () => ({ maps: [], letter: null, retired: null, taken: 0, takenAt: -99, seenRaids: 0, standing: 50, hunts: 0, oldAt: -99, pastAt: -99, shareAt: -99, trialAt: -99, mapAt: -99, log: [] });
export const fresh = () => ({ seq: 1, bands: [], fleets: [], hoards: [], retired: [], danger: { west: 0, south: 0 }, losses: { west: 0, south: 0 }, log: [], me: freshMe(), tally: { fell: 0, rose: 0, hoards: 0, fleets: 0, letters: 0 } });
export const PI = (g) => (g.pirates ??= fresh());
export function fill(g) {
  const P = PI(g);
  P.seq ??= 1; P.bands ??= []; P.fleets ??= []; P.hoards ??= []; P.retired ??= []; P.log ??= [];
  P.danger = Object.assign({ west: 0, south: 0 }, P.danger ?? {});
  P.losses = Object.assign({ west: 0, south: 0 }, P.losses ?? {});
  P.tally = Object.assign({ fell: 0, rose: 0, hoards: 0, fleets: 0, letters: 0 }, P.tally ?? {});
  P.me = Object.assign(freshMe(), P.me ?? {});
  return P;
}
export const live = (g) => PI(g).bands.filter((b) => !b.fell);
export const bandById = (g, id) => PI(g).bands.find((b) => b.id === id) ?? null;
export const bandsIn = (g, sea) => live(g).filter((b) => b.sea === sea);
export const power = (b) => Math.round(b.men * 0.6 + b.ships * 14 + Math.min(40, b.fame * 0.4));
export const capName = (b) => `'${b.cap.nick}' ${b.cap.name}`;
export const capWithBand = (b, pair) => `${b.name}의 ${J(capName(b), pair)}`;
export function plog(g, text) {
  const P = PI(g);
  P.log.push({ y: g.date.year, m: g.date.month, text });
  if (P.log.length > 40) P.log.splice(0, P.log.length - 40);
}
export function mlog(g, text) {
  const M = PI(g).me;
  M.log.push({ y: g.date.year, m: g.date.month, text });
  if (M.log.length > 20) M.log.splice(0, M.log.length - 20);
}
export const dangerWord = (d) => (d >= 70 ? '바다가 해적 천지다' : d >= 45 ? '상선들이 호위 없이는 안 뜬다' : d >= 20 ? '가끔 검은 돛이 보인다' : '바다가 조용하다');
export const powerWord = (p) => (p >= 140 ? '바다를 주름잡는다' : p >= 90 ? '이름이 났다' : p >= 50 ? '만만치 않다' : '작은 무리다');
// 내가 든 해적단 (sea/pirates.js의 S(g).pirate를 읽는다. 예전 판은 까마귀단)
export const myBandId = (g) => (g.sea?.pirate ? g.sea.pirate.band ?? 'crow' : null);
