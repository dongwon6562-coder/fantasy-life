// 목수와 석공 (35단계): 상태와 도우미.
// - 일자리(carpenter·mason)와 솜씨('목공과 석공' building), 이름값(vocation fame builder), 큰 건축(vocation paths)은 10단계 vocation이 맡는다.
// - 여기(game.builder)는 그 위에 얹는다: 도제·직인·장인·명장, 의뢰(나무와 돌 고르기·품삯), 조합과 장인의 표식,
//   무너진 일과 책임, 내 작업장과 도제, 이름이 남는 건물(내 것과 세상의 것), 기술 나무에 따라 바뀌는 일.
// 상태는 game.builder 하나:
//   job: null | { kind, place, client, pay, left, need, mat, cut, q0, started, away, works? }   맡은 의뢰
//   built: [{ id, kind, name, place, y, q, cut, mark, by, fam, gone: null|{ y, how } }]   내 집안이 지은 것 (대를 넘는다)
//   world: [{ id, kind, name, place, y, q, by, gone }]   세상의 이름난 건물 (플레이어 없이도 서고 무너진다)
//   mark: null | 표식 id     famMark: 집안에 남은 표식 (대를 이으면 물려받을 수 있다)
//   guild: { tries, banned(달), dues(빚) }   shop: null | { place, name, since, rep, app: [{ id, name, since }] }
//   done, places[], earned, falls, owned(물어 준 횟수), seq, examAt, evAt, ownBuild, worksPart[], log
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge } from '../game.js';
import { invented } from '../era/state.js';
import { J } from '../narrative/text.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
// 건물 이름에 붙이는 짧은 고장 이름 ('마법도시 세레니아' → '세레니아')
const TOWN_HEAD = ['왕도', '제도', '성도', '마법도시', '성채도시', '항구도시'], TOWN_TAIL = ['마을', '항'];
export function townName(pl) {
  const w = (PLACES[pl]?.name ?? '먼 고장').split(' ');
  if (w.length === 2 && TOWN_HEAD.includes(w[0])) return w[1];
  if (w.length === 2 && TOWN_TAIL.includes(w[1])) return w[0];
  return w.join(' ');
}
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 89) ^ Math.imul(mi(g) * 151 + salt + 353, 2654435761)) | 0 });
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;
export const skill = (g) => g.player.skills.building ?? 0;
export const trade = (g) => (['carpenter', 'mason'].includes(L(g).job?.id) ? L(g).job.id : null);
export const isBuilder = (g) => !!trade(g);
export const adult = (g) => playerAge(g) >= 15;

// 도제 → 직인 → 장인 → 명장. 장인 이상은 조합의 표식이 있어야 한다 (변경 개척촌엔 조합이 없다)
export const RANKS = ['도제', '직인', '장인', '명장'];
export const skillRank = (g) => { const s = skill(g); return s < 30 ? 0 : s < 55 ? 1 : s < 80 ? 2 : 3; };
export const rankOf = (g) => Math.min(skillRank(g), B(g).mark ? 3 : 1);
export const GUILD_TOWNS = ['leocast', 'harfen', 'eisen', 'solaris', 'verden'];
export const frontierSite = (pl) => /^fr_/.test(pl ?? '');
export const rankAt = (g, pl = here(g)) => (frontierSite(pl) ? skillRank(g) : rankOf(g));

// 장인의 표식: 돌과 들보에 새긴다
export const MARKS = {
  hammers: { name: '엇갈린 망치 둘', carve: '엇갈린 망치 둘' },
  leaf: { name: '참나무 잎', carve: '참나무 잎 하나' },
  star: { name: '여섯 모 별', carve: '여섯 모 별' },
  fish: { name: '거꾸로 선 물고기', carve: '거꾸로 선 물고기' },
  key: { name: '열쇠와 원', carve: '원 안의 열쇠' },
  wheel: { name: '살 여덟 바퀴', carve: '살 여덟 개짜리 바퀴' },
};
export const MARK_IDS = Object.keys(MARKS);

// 의뢰 종류. by: 누가 맡나(c 목수·m 석공), min: 등급, months, pay: 품삯(은화), big: 이름이 남는다
//   need: 기술 나무 id (그 기술이 있어야 들어온다), at: 들어오는 고장 (village·town·frontier·특정 고장 목록)
const VILLAGE = ['ern', 'gruental', 'klein', 'saltmare', 'fur', 'silverleaf'];
const TOWN = ['harfen', 'verden', 'leocast', 'portel', 'eisen', 'solaris', 'graubel', 'serenia', 'barka', 'hammer'];
export const KINDS = {
  shed: { name: '헛간', by: 'c', min: 0, months: 1, pay: 9, at: [...VILLAGE, 'harfen', 'verden', 'graubel'] },
  roof: { name: '지붕 갈기', by: 'c', min: 0, months: 1, pay: 7, at: [...VILLAGE, ...TOWN] },
  wall: { name: '돌담과 축대', by: 'm', min: 0, months: 1, pay: 9, at: [...VILLAGE, ...TOWN] },
  house: { name: '살림집', by: 'cm', min: 1, months: 3, pay: 34, at: [...VILLAGE, ...TOWN] },
  mill: { name: '물레방앗간', by: 'c', min: 1, months: 3, pay: 42, at: ['ern', 'gruental', 'verden', 'harfen', 'klein', 'leocast'] },
  windmill: { name: '풍차', by: 'c', min: 1, months: 3, pay: 48, need: 'windmill', at: ['verden', 'ern', 'gruental', 'harfen', 'eisen'] },
  brickhouse: { name: '벽돌집', by: 'm', min: 1, months: 2, pay: 40, need: 'brick', at: TOWN },
  street: { name: '돌길 깔기', by: 'm', min: 1, months: 2, pay: 32, need: 'paving', at: ['leocast', 'harfen', 'verden', 'eisen', 'solaris', 'portel'] },
  bridge: { name: '다리', by: 'cm', min: 2, months: 5, pay: 95, big: true, at: ['verden', 'gruental', 'ern', 'harfen', 'klein', 'graubel', 'leocast'] },
  hall: { name: '회관', by: 'c', min: 2, months: 4, pay: 85, big: true, at: TOWN },
  chapel: { name: '예배당', by: 'm', min: 2, months: 6, pay: 115, big: true, at: [...VILLAGE, ...TOWN] },
  tower: { name: '종탑', by: 'm', min: 2, months: 6, pay: 120, big: true, at: TOWN },
  palisade: { name: '목책과 망루', by: 'c', min: 0, months: 2, pay: 18, at: 'frontier' },
  camphall: { name: '개척촌 회관', by: 'cm', min: 1, months: 3, pay: 26, big: true, at: 'frontier' },
  factoryhall: { name: '공장 건물', by: 'm', min: 1, months: 4, pay: 70, need: 'factory', at: ['harfen', 'leocast', 'eisen'] },
  ironbridge: { name: '쇠 다리', by: 'm', min: 2, months: 5, pay: 135, big: true, need: 'bridge', at: ['verden', 'harfen', 'leocast', 'klein'] },
  station: { name: '쇠수레 역사', by: 'm', min: 2, months: 6, pay: 145, big: true, need: 'railroad', at: ['harfen', 'leocast'] },
  works: { name: '큰 공사의 한 몫', by: 'cm', min: 2, months: 3, pay: 60, at: 'works' },
};
export const KIND_IDS = Object.keys(KINDS);
// 기술이 나오면 일이 바뀐다: 기중기는 높은 일을 빨리, 측량은 다리를 튼튼히, 유리는 예배당 값을, 시계는 종탑을 시계탑으로
export const kindName = (g, kind) => (kind === 'tower' && invented(g, 'clock') ? '시계탑' : KINDS[kind]?.name ?? '건물');
export const monthsOf = (g, kind) => {
  const d = KINDS[kind];
  let m = d.months;
  if (invented(g, 'crane') && ['tower', 'chapel', 'station', 'ironbridge', 'factoryhall', 'works'].includes(kind)) m -= 1;
  if (invented(g, 'brick') && ['house', 'wall'].includes(kind) && trade(g) === 'mason') m -= kind === 'house' ? 1 : 0;
  return Math.max(1, m);
};
export function payOf(g, kind, pl = here(g)) {
  const d = KINDS[kind];
  let p = d.pay * (PLACES[pl]?.house ? clamp(PLACES[pl].house / 400, 0.7, 1.6) : 1);
  if (kind === 'tower' && invented(g, 'clock')) p += 30;
  if (kind === 'chapel' && invented(g, 'glass')) p += 20;
  if (frontierSite(pl)) p *= 0.8;
  return Math.max(3, Math.round(p * (1 + skill(g) / 200)));
}
export const tradeFits = (g, kind) => KINDS[kind].by.includes(trade(g) === 'mason' ? 'm' : 'c');

// 재료: 받은 값만큼 제대로 · 싸게 하고 값도 깎아 · 싼 재료에 값은 다 받기(속임) · 내 돈을 보태 더 좋은 재료
export const MATS = {
  c: {
    good: { name: '잘 마른 참나무', q: 10, cost: 0 },
    cheap: { name: '소나무', q: -6, cost: 0 },
    cut: { name: '덜 마른 생나무', q: -26, cost: 0 },
    fine: { name: '열 해 말린 참나무 심재', q: 22, cost: 0.3 },
  },
  m: {
    good: { name: '다듬은 화강암', q: 10, cost: 0 },
    cheap: { name: '막돌', q: -6, cost: 0 },
    cut: { name: '모래를 잔뜩 섞은 회반죽', q: -26, cost: 0 },
    fine: { name: '먼 채석장의 단단한 돌', q: 22, cost: 0.3 },
    brick: { name: '가마에 구운 벽돌', q: 14, cost: 0.1, need: 'brick' },
  },
};
export const matSide = (g) => (trade(g) === 'mason' ? 'm' : 'c');

// 의뢰인
export const CLIENTS = {
  village: ['이웃 농부', '방앗간 주인', '촌장', '과부 한 사람', '젊은 신혼부부', '양치기 집안'],
  town: ['포목 상인', '교구 사제', '영주 집사', '상인 조합', '여관 주인', '부유한 과부', '시 참사회'],
  frontier: ['개척촌 사람들'],
};
export const NAMES = ['오토', '하인리히', '베른트', '마티아스', '루트거', '지몬', '알브레히트', '에바', '야코프', '울리히', '헤르만', '테오도르'];

function fresh() {
  return {
    job: null, built: [], world: [], mark: null, famMark: null,
    guild: { tries: 0, banned: 0, dues: 0 }, shop: null,
    done: 0, places: [], earned: 0, falls: 0, owned: 0, seq: 1, examAt: 0, evAt: 0, ownBuild: null, worksPart: [], log: [],
  };
}
export const B = (g) => (g.builder ??= fresh());
export function logB(g, text) {
  const s = B(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const standing = (list) => list.filter((b) => !b.gone);
export const mineHere = (g, pl = here(g)) => standing(B(g).built).filter((b) => b.place === pl);
export const shopHere = (g) => !!B(g).shop && B(g).shop.place === here(g) && !L(g).travel;
export const qualWord = (q) => (q >= 80 ? '백 년은 너끈히 갈' : q >= 60 ? '반듯한' : q >= 40 ? '그럭저럭 쓸 만한' : '어딘가 미덥지 않은');
export { invented };

HOOKS.newGame.push((g) => { g.builder = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.builder) { g.builder = d; return; }
  for (const k of Object.keys(d)) if (g.builder[k] === undefined) g.builder[k] = d[k];
  if (g.builder.job && !KINDS[g.builder.job.kind]) g.builder.job = null;
});
