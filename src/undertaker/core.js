// 장의사와 묘지기 (40단계). 상태와 도우미.
// - 망령·저주·흉한 자리·영매는 haunt가, 내 장례 준비와 집안 무덤 돌보기는 elder가, 병은 health가 맡는다.
// - 여기(game.undertaker)는 죽은 사람을 맡는 '일': 염하고 관 짜기, 신분마다 다른 장례, 무덤 파기와 밤의 묘지, 도굴꾼,
//   역병 때 넘쳐나는 시신과 수레, 무덤 자리 팔고 사기, 묘지에 도는 소문(일 쪽에서 본 것).
// 상태는 game.undertaker 하나:
//   skill: 솜씨 0~100   bodies coffins funerals dug earned caught
//   shop: null | { place, since, coffins, hands }   plot: null | { place, since, kind }  (집안 무덤 자리)
//   yards: { 고장: { wait, full, robbed, rumor, rich, pit, guardAt, newAt } }  (플레이어 없이도 차고, 털리고, 새 묘지를 연다)
//   evAt plotAt rumorAt log past
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge } from '../game.js';
import { J } from '../narrative/text.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
export const adult = (g) => playerAge(g) >= 15;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 97) ^ Math.imul(mi(g) * 181 + salt + 409, 2654435761)) | 0 });
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;
export const SEASON = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
export const seasonOf = (g) => SEASON[g.date.month - 1];

// 묘지: big 고장 크기(1~4, 죽는 사람 수), crypt 귀족 납골당, nobles 귀족·부자 장례가 잦음, sea 바다에 묻기도 한다
export const YARDS = {
  ern: { name: '마을 뒤 언덕 묘지', big: 1 },
  gruental: { name: '골짜기 예배당 묘지', big: 1 },
  klein: { name: '항구 위 바람 언덕 묘지', big: 1, sea: true },
  harfen: { name: '하르펜 성 밖 공동묘지', big: 2 },
  verden: { name: '백작령 성당 묘지', big: 2, crypt: '백작 가문 지하 납골당', nobles: true },
  graubel: { name: '성채 아래 전사 묘역', big: 2 },
  gorge: { name: '구렁목 바위벽 묘굴', big: 2 },
  barka: { name: '자유도시 운하 끝 묘지', big: 3, sea: true },
  portel: { name: '포르텔 등대 언덕 묘지', big: 3, sea: true },
  serenia: { name: '세레니아 고요한 정원', big: 2, nobles: true },
  saltmare: { name: '살트마레 절벽 묘지', big: 2, sea: true },
  leocast: { name: '왕도 성벽 밖 큰 묘지', big: 4, crypt: '왕도 대성당 지하 납골당', nobles: true },
  eisen: { name: '제도 북문 밖 묘원', big: 4, crypt: '황실 묘원 옆 귀족 묘실', nobles: true },
  solaris: { name: '성도 순교자 묘역', big: 3, crypt: '대성당 성인 납골당', nobles: true },
};
export const YARD_IDS = Object.keys(YARDS);
export const yardOf = (pl) => YARDS[pl] ?? null;
// 장의사 집이 설 만한 곳 (성읍 이상)
export const SHOP_PLACES = ['harfen', 'verden', 'leocast', 'eisen', 'solaris', 'barka', 'portel', 'graubel', 'serenia'];
export const SHOP_COST = 60;
export const plotPrice = (pl) => [0, 12, 20, 32, 50][YARDS[pl]?.big ?? 1];

// 죽은 이의 신분: 신분마다 장례가 다르다
export const RANKS = {
  pauper: { name: '빈민', fee: 1, desc: '거적에 싸인 몸. 관 값을 낼 사람이 없다. 교구가 주는 동전 몇 닢이 전부다.' },
  farmer: { name: '농부', fee: 4, desc: '흙 묻은 손을 가슴에 모았다. 식구들이 이웃에게 돈을 꾸어 관 값을 마련했다.' },
  craft: { name: '장인', fee: 7, desc: '조합 사람들이 줄지어 왔다. 조합 깃발로 관을 덮어 달라고 한다.' },
  merchant: { name: '상인', fee: 14, desc: '살찐 상인의 상주가 곡하는 사람을 열 명 사 달라고 한다. 이웃에게 보일 장례를 원한다.' },
  noble: { name: '귀족', fee: 30, desc: '문장 덮개, 횃불 행렬, 납골당 자리. 집사가 순서를 적은 양피지를 내밀었다. 한 가지라도 틀리면 안 된다.' },
  stranger: { name: '이방인', fee: 2, desc: '길에서 죽은 낯선 사람. 이름도 고향도 모른다. 품속에 낯선 글씨의 편지 한 장.' },
  condemned: { name: '죄인', fee: 2, desc: '교수대에서 내린 몸. 사제는 축성한 땅에 묻을 수 없다 하고, 어미는 묘지 담 안에 묻어 달라고 운다.' },
};
export const RANK_IDS = Object.keys(RANKS);

function freshYards() {
  const y = {};
  for (const id of YARD_IDS) y[id] = { wait: YARDS[id].big, full: 30 + YARDS[id].big * 8, robbed: 0, rumor: 0, rich: 0, pit: false, guardAt: -99, newAt: 0 };
  return y;
}
function fresh() {
  return { skill: 0, bodies: 0, coffins: 0, funerals: 0, dug: 0, earned: 0, caught: 0, shop: null, plot: null, yards: freshYards(), evAt: 0, plotAt: -99, rumorAt: -99, sellAt: -99, log: [], past: [] };
}
export const U = (g) => (g.undertaker ??= fresh());
export function logU(g, text) {
  const s = U(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const yardHere = (g) => (L(g).travel ? null : U(g).yards[here(g)] ?? null);
export const skill = (g) => U(g).skill;
export const isUT = (g) => L(g).job?.id === 'undertaker' && L(g).job.place === here(g);
export const isGD = (g) => L(g).job?.id === 'gravedigger' && L(g).job.place === here(g);
export const deathWork = (g) => isUT(g) || isGD(g);
export const shopHere = (g) => !!U(g).shop && U(g).shop.place === here(g) && !L(g).travel;
// 솜씨: 오를수록 더디다
export function gainU(g, base) { const s = U(g); const v = base * (1 - s.skill / 130); s.skill = clamp(s.skill + v, 0, 100); return v; }
export const skillWord = (v) => (v >= 70 ? '산 사람보다 죽은 사람을 더 잘 안다' : v >= 40 ? '손이 익었다' : v >= 15 ? '이제 손이 떨리지 않는다' : '아직 서툴다');

HOOKS.newGame.push((g) => { g.undertaker = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.undertaker) { g.undertaker = d; return; }
  for (const k of Object.keys(d)) if (g.undertaker[k] === undefined) g.undertaker[k] = d[k];
  for (const id of YARD_IDS) g.undertaker.yards[id] ??= d.yards[id];
});
