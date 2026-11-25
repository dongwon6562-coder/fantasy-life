// 마도구 장인 (45단계). 상태와 도우미.
// - 주문 목록·서클은 magic이, 탑의 마도구 표(ITEMS)와 서열은 tower가, 마나의 밀물과 썰물은 mana가 맡는다. 여기서는 읽기만 한다.
// - 여기(game.artifice)는 탑 밖의 공방: 마석 다듬기, 무기·갑옷·장신구·연장에 아는 주문 새기기, 실패와 폭발,
//   내 공방과 제자, 의뢰(귀족·모험가·군대·상단), 이름난 마도구(대를 넘어 남고, 도둑맞고, 되찾는다).
// 상태는 game.artifice 하나:
//   art: 장인 솜씨 0~100 (사람의 것)   famArt: 앞 사람의 솜씨 (대를 이으면 물려받은 손버릇)
//   stones: 다듬은 마석 (가진 것)   cut: 다듬은 수   made: 만든 수   blasts: 터진 수
//   job: null | { base, spell, circle, name, prog, client?, pay?, due?, count? }   (만드는 것, 의뢰면 client)
//   kept: [{ name, base, slot, circle, q, spell, y, by }] (곁에 둔 마도구, 여섯까지)   worn: kept 가운데 몸에 지닌 장신구 번호
//   shop: null | { place, name, since, pupils: [{ name, sex, art, honest, since }], hurt }   (내 공방, 대를 넘어 가업)
//   famous: [{ id, name, base, circle, spell, maker, mine, holder, where, y, lost, stolen }] (세상의 이름난 마도구, 열넷까지)
//   orders: 마친 의뢰 수   fails: 놓친 의뢰 수   seenAt learnAt orderAt pupilAt   log past
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge, circleOf } from '../game.js';
import { knownSpells } from '../magic/spells.js';
import { costMul, sellMul } from '../mana/state.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
export const adult = (g) => playerAge(g) >= 14;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 131) ^ Math.imul(mi(g) * 211 + salt + 457, 2654435761)) | 0 });

// 마석 공방이 있는 곳과 그곳 의뢰 값의 배율. 세레니아 밖에도 마석을 다루는 손은 있다.
export const WORKSHOP = { serenia: 1.2, eisen: 1.2, barka: 1.15, leocast: 1.15, harfen: 1, portel: 1.05, solaris: 0.95, hammer: 1.1, gorge: 1.05, graubel: 1, roten: 1, grondar: 1.1, scholae: 1.05, krossen: 1, libera: 1.05 };
export const workshopAt = (pl) => (PLACES[pl] && WORKSHOP[pl] ? WORKSHOP[pl] : 0);

// 새길 바탕: 어디에 끼우나(slot), 어떤 주문이 맞나(use), 바탕값
export const BASES = {
  blade: { name: '검', slot: 'weapon', use: ['combat'], cost: 14, work: 1.2 },
  spear: { name: '창날', slot: 'weapon', use: ['combat'], cost: 10, work: 1 },
  mail: { name: '사슬 갑옷', slot: 'armor', use: ['ward'], cost: 22, work: 1.4 },
  shield: { name: '방패', slot: 'armor', use: ['ward', 'combat'], cost: 12, work: 1 },
  ring: { name: '반지', slot: 'trinket', use: ['heal', 'ward', 'life'], cost: 8, work: 0.8 },
  amulet: { name: '목걸이', slot: 'trinket', use: ['ward', 'heal', 'life', 'job'], cost: 9, work: 0.9 },
  tool: { name: '연장', slot: 'tool', use: ['job', 'life'], cost: 5, work: 0.7 },
  lamp: { name: '등잔', slot: 'tool', use: ['life', 'job'], cost: 4, work: 0.6 },
};
export const SLOT_NAME = { weapon: '무기', armor: '갑옷', trinket: '장신구', tool: '연장' };
export const RANKS = ['공방 견습', '직인', '마도구 장인', '이름난 장인', '명장'];
export function rankOf(g) {
  const A = AS(g);
  if (A.art >= 80 && A.famous.some((f) => f.mine && f.maker === g.player.name)) return 4;
  if (A.art >= 65 && A.made >= 12) return 3;
  if (A.art >= 45 && A.made >= 5) return 2;
  if (A.art >= 20) return 1;
  return 0;
}
export const rankName = (g) => RANKS[rankOf(g)];
export const artWord = (v) => (v >= 80 ? '술식이 마석 결을 따라 저절로 흐른다' : v >= 55 ? '마석 결을 눈 감고도 읽는다' : v >= 30 ? '손이 익었다' : v >= 10 ? '아직 마석을 자주 깨뜨린다' : '마석을 쥘 줄만 안다');

// 마석 값: 마나가 짙으면 흔해 싸고, 옅으면 귀해 비싸다 (mana의 배율을 그대로 쓴다)
export const tideOf = (g) => (g?.mana?.tide ?? 0) - (g?.later?.deplete ?? 0) * 0.4;
export const stoneCost = (g) => Math.max(2, Math.round(5 * costMul(tideOf(g))));
export const stoneSell = (g) => Math.max(3, Math.round(9 * sellMul(tideOf(g)) * (0.9 + workshopAt(here(g)) * 0.1)));
export const priceMul = (g) => sellMul(tideOf(g));

// 새길 수 있는 주문: 아는 것 가운데 서클이 지금 서클 이하이고 바탕에 맞는 것. 높은 서클부터.
export function fitSpells(g, base) {
  const b = BASES[base];
  if (!b) return [];
  const c = circleOf(g);
  return knownSpells(g).filter((sp) => sp && b.use.includes(sp.use) && sp.circle <= c).sort((a, b2) => b2.circle - a.circle);
}
export const canEngrave = (g) => !!g.player.manaAwakened && circleOf(g) >= 1 && AS(g).art >= 10;

// 이름난 마도구: 세상에 처음부터 있는 것 다섯
export const FAMOUS_NAMES = ['새벽 이빨', '잿빛 맹세', '첫눈', '고요한 손', '늙은 별', '세 번째 불', '물의 기억', '검은 종', '흰 까마귀', '꺼지지 않는 등', '바다의 눈', '왕의 그림자', '마지막 문지기', '은빛 숨', '깨진 서약', '겨울 왕관', '붉은 실', '아홉 번째 열쇠'];
export const OLD_MAKERS = ['별의 탑 초대 탑주 오르벤', '드워프 장인 바린', '이름 없는 떠돌이 장인', '옛 제국 궁정 마도사 셀레네', '은잎 숲의 요람지기', '용사 시대의 대장장이 하겐'];
const SEED = [
  { name: '새벽 이빨', base: 'blade', circle: 5, spell: '번개 창', maker: 0, holder: '발하르트 왕실 보물고', where: 'leocast' },
  { name: '고요한 손', base: 'ring', circle: 4, spell: '깊은 치유', maker: 3, holder: '솔라리스 대성당', where: 'solaris' },
  { name: '꺼지지 않는 등', base: 'lamp', circle: 3, spell: '빛 밝히기', maker: 1, holder: '해머 산 광부 조합', where: 'hammer' },
  { name: '겨울 왕관', base: 'amulet', circle: 5, spell: '얼음 성벽', maker: 5, holder: null, where: 'grondar', lost: true },
  { name: '물의 기억', base: 'shield', circle: 4, spell: '물의 장막', maker: 4, holder: '세레니아 별의 탑', where: 'serenia' },
];
export const freshFamous = () => SEED.map((f, i) => ({ id: `fa${i}`, ...f, maker: OLD_MAKERS[f.maker], mine: false, y: -1, lost: !!f.lost, stolen: null }));

export const AS = (g) => (g.artifice ??= fresh());
export function fresh() {
  return { art: 0, famArt: 0, stones: 0, cut: 0, made: 0, blasts: 0, job: null, kept: [], worn: -1, shop: null, famous: freshFamous(), orders: 0, fails: 0, seq: 5, seenAt: -99, learnAt: -99, orderAt: -99, pupilAt: -99, chaseAt: -99, log: [], past: [] };
}
export function logA(g, text) {
  const A = AS(g);
  A.log.push({ y: g.date.year, m: g.date.month, text });
  if (A.log.length > 30) A.log.splice(0, A.log.length - 30);
}
export const myFamous = (g) => AS(g).famous.filter((f) => f.mine);
export const artUp = (g, n) => {
  const A = AS(g);
  const star = g.tower?.member?.tower === 'star' ? 1.3 : 1;
  A.art = clamp(A.art + n * star * (1 - A.art / 130), 0, 100);
};

HOOKS.newGame.push((g) => { g.artifice = fresh(); });
HOOKS.migrate.push((g) => {
  const A = AS(g), f = fresh();
  for (const k of Object.keys(f)) A[k] ??= f[k];
});
