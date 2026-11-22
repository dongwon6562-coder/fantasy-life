// 옷감과 재봉사: 상태와 도우미.
// - craft(대장일·요리·약초…), trade(물건 시세·상단), court(궁정 출세), era(발명과 새 물건)와 겹치지 않게
//   실 잣기·베 짜기·염색·옷 짓기·재봉 가게·옷감 길드·유행·상복과 혼례복만 맡는다.
// 상태는 game.cloth 하나:
//   hand: 바느질·베 짜는 솜씨 (0~100)
//   yarn: { linen, wool, silk }  실 타래
//   bolts: [{ f: 'linen'|'wool'|'silk', dye: null|염료 id, n }]  옷감 필
//   loom: 베틀이 있나
//   shop: null | { place, name, since, rep, stock, owed: [{ who, n, y }], guild, style }
//   wear: null | { dye, kind: 'fine'|'mourn'|'bridal', until, for }  지금 입은 옷 (초상에 보인다)
//   fashion: { id, since, by }  왕도에서 시작해 퍼지는 유행 (플레이어 없이도 바뀐다)
//   guild: { master, dues, member }  재봉 길드
//   close: [id…]  지난달 살아 있던 가까운 식구 (상복용), spouse
//   firstAt, eventAt, made, sold, earned, past, log
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { family, playerAge } from '../game.js';
import { eraOf } from '../world.js';
import { JOBS } from '../data.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const age = (g) => playerAge(g);
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 97) ^ Math.imul(mi(g) * 157 + salt + 307, 2654435761)) | 0 });
export const noble = (g) => !!g.domain || (g.court?.office ?? -1) >= 0 || /귀족/.test(family(g)?.standing ?? '');

JOBS.tailor ??= { name: '재봉사', skill: null, income: 5 };

// 실과 옷감: 한 필 값(은화), 실 잣는 곳
export const FIBERS = {
  linen: { name: '삼베', yarn: '삼실', bolt: 5, spin: null, line: '물레가 돌 때마다 삼 줄기가 가는 실로 풀려 나온다.' },
  wool: { name: '모직', yarn: '털실', bolt: 8, spin: ['ern', 'harfen', 'graubel', 'gruental', 'fr_grass', 'fur', 'verden'], line: '빗질한 양털에서 굵은 털실이 꼬여 나온다.' },
  silk: { name: '비단', yarn: '명주실', bolt: 26, spin: ['portel', 'barka', 'serenia'], line: '끓는 물에서 고치를 건져 가는 명주실을 뽑는다. 손끝이 데어 붉다.' },
};
export const FIBER_IDS = Object.keys(FIBERS);

// 염료: 풀·조개·광물. cost: 한 필 물들이는 값, mul: 값이 오르는 배수, col: 초상에 쓰는 빛깔
export const DYES = {
  weld: { name: '노란빛', src: '물푸레 풀', kind: '풀', cost: 1, mul: 1.25, col: '#a8923a' },
  woad: { name: '쪽빛', src: '대청 잎', kind: '풀', cost: 2, mul: 1.4, col: '#2f4a73' },
  madder: { name: '붉은빛', src: '꼭두서니 뿌리', kind: '풀', cost: 3, mul: 1.6, col: '#7a2f2a' },
  gall: { name: '검은빛', src: '오배자와 쇳물', kind: '광물', cost: 3, mul: 1.5, col: '#23211f' },
  cinnabar: { name: '주홍빛', src: '진사 가루', kind: '광물', cost: 9, mul: 2.4, col: '#b4472c', where: ['leocast', 'eisen', 'hammer', 'serenia'], harm: true },
  murex: { name: '자줏빛', src: '뿔고둥 즙', kind: '조개', cost: 24, mul: 4.5, col: '#4a1f4f', where: ['portel', 'saltmare', 'klein'], royal: true },
};
export const DYE_IDS = Object.keys(DYES);
// 염색 집이 있는 고장 (풀 염료는 어디서나, 비싼 염료는 where)
export const DYE_TOWNS = ['harfen', 'verden', 'leocast', 'portel', 'eisen', 'barka', 'solaris', 'serenia', 'saltmare', 'klein', 'hammer', 'graubel'];
// 재봉사 일자리와 길드가 있는 고장
export const TAILOR_TOWNS = ['harfen', 'verden', 'leocast', 'portel', 'eisen', 'barka', 'solaris', 'serenia'];
export const GUILD_TOWNS = ['leocast', 'harfen', 'eisen', 'solaris'];
// 귀족이 아니면 자줏빛을 못 입는 곳 (사치 금령)
export const SUMPTUARY = ['leocast', 'solaris', 'eisen', 'verden'];
// 옷감 값이 오르내리는 곳
export const PLACE_MUL = { leocast: 1.4, eisen: 1.45, serenia: 1.35, solaris: 1.2, portel: 1.2, barka: 1.15, verden: 1.1, harfen: 1.1, graubel: 1.15, ern: 0.8, gruental: 0.8, klein: 0.9 };
export const FIBER_PLACE = { silk: { portel: 0.7, barka: 0.65, leocast: 1.2 }, wool: { graubel: 0.8, harfen: 0.85, eisen: 1.2 }, linen: {} };

// 유행: 시대마다 왕도에서 시작해 퍼진다. dye: 그 철에 값을 더 받는 빛깔
export const FASHIONS = {
  longsleeve: { name: '땅에 끌리는 긴 소매', era: [0, 1], dye: 'madder', line: '왕도 귀부인들 소매가 길어져 계단마다 시종이 소매 끝을 받쳐 든다.' },
  highcollar: { name: '목을 감싸는 높은 깃', era: [0, 2], dye: 'gall', line: '높은 깃에 턱을 묻고 걷는 것이 점잖은 사람의 걸음이 되었다.' },
  slashed: { name: '터서 속감을 내보이는 소매', era: [0, 2], dye: 'cinnabar', line: '겉감을 일부러 찢어 속의 주홍빛을 내보이는 소매가 유행이다. 노인들은 거지 옷 같다고 혀를 찬다.' },
  blue: { name: '쪽빛 겉옷', era: [0, 3], dye: 'woad', line: '너도나도 쪽빛 겉옷이다. 대청 잎 값이 두 배로 뛰었다.' },
  plain: { name: '수수한 회색 옷', era: [1, 3], dye: 'gall', line: '마도구 공방 사람들 사이에서 꾸밈 없는 잿빛 옷이 번졌다. 화려한 옷은 촌스럽다는 말까지 나온다.' },
  stitched: { name: '마석 단추를 단 짧은 저고리', era: [1, 3], dye: 'weld', line: '빛이 도는 작은 마석 단추를 줄줄이 단 짧은 저고리가 젊은이들 사이에 유행이다.' },
  coat: { name: '허리를 조인 긴 외투', era: [2, 3], dye: 'woad', line: '공장 감독들이 입던 허리 조인 외투를 이제 서기들까지 입는다.' },
  purple: { name: '자줏빛 띠', era: [0, 3], dye: 'murex', line: '자줏빛 띠 하나에 집 한 채 값이 든다. 그래도 귀족들은 띠를 겹겹이 두른다.' },
};
export const FASHION_IDS = Object.keys(FASHIONS);
export const fashionsFor = (era) => FASHION_IDS.filter((id) => FASHIONS[id].era[0] <= era && era <= FASHIONS[id].era[1]);

// 솜씨 단계
export const HAND_RANK = ['견습', '숙련', '장인', '명장'];
export const handRank = (g) => { const h = C(g).hand; return h < 30 ? 0 : h < 55 ? 1 : h < 80 ? 2 : 3; };

const GUILD_MASTERS = ['힐데가르트', '오스발트', '마르타', '레온하르트', '게르트루트', '파비안', '클라라', '에곤'];
function fresh() {
  return {
    hand: 0, yarn: { linen: 0, wool: 0, silk: 0 }, bolts: [], loom: false, shop: null, wear: null,
    fashion: { id: 'longsleeve', since: 0, by: null }, guild: { master: GUILD_MASTERS[0], masterN: 0, dues: 20, member: false, me: false },
    close: [], spouse: null, firstAt: 0, eventAt: 0, made: 0, sold: 0, earned: 0, past: [], log: [], harm: 0,
  };
}
export const C = (g) => (g.cloth ??= fresh());
export { GUILD_MASTERS };
export const boltCount = (g) => C(g).bolts.reduce((a, b) => a + b.n, 0);
export const yarnCount = (g) => FIBER_IDS.reduce((a, f) => a + (C(g).yarn[f] ?? 0), 0);
export const fashionDye = (g) => FASHIONS[C(g).fashion.id]?.dye ?? null;
export function boltValue(g, b, pl = here(g)) {
  const F = FIBERS[b.f], D = b.dye ? DYES[b.dye] : null;
  const fash = b.dye && b.dye === fashionDye(g) ? 1.25 : 1;
  const era = 1 - eraOf(g) * 0.06; // 공방에서 옷감을 찍어 내는 시대일수록 손으로 짠 천 값이 내린다
  return Math.max(1, Math.round(F.bolt * (D ? D.mul : 1) * fash * era * (PLACE_MUL[pl] ?? 1) * (FIBER_PLACE[b.f]?.[pl] ?? 1) * b.n));
}
export const boltName = (b) => `${b.dye ? `${DYES[b.dye].name} ` : ''}${FIBERS[b.f].name}`;
export function addBolt(g, f, dye, n) {
  const s = C(g), b = s.bolts.find((x) => x.f === f && x.dye === dye);
  if (b) b.n += n; else s.bolts.push({ f, dye, n });
}
export function takeBolt(g, b, n = 1) {
  b.n -= n;
  if (b.n <= 0) C(g).bolts = C(g).bolts.filter((x) => x !== b);
}
export function logCloth(g, text) {
  const s = C(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const shopHere = (g) => !!C(g).shop && C(g).shop.place === here(g) && !L(g).travel;
export const isTailor = (g) => L(g).job?.id === 'tailor';

HOOKS.newGame.push((g) => { g.cloth = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.cloth) { g.cloth = d; return; }
  for (const k of Object.keys(d)) if (g.cloth[k] === undefined) g.cloth[k] = d[k];
});
