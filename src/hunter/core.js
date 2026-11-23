// 사냥꾼과 덫꾼 (37단계). 상태와 도우미.
// - 사냥꾼 일자리, 솜씨 '사냥'(hunting), 덫 놓기(voc_traps)와 큰 짐승(voc_beast: 큰 멧돼지·곰), 흰 수사슴은 10단계 vocation이 맡는다.
// - 마물과 현상금, 부산물은 wilds가, 개·매 기르기와 매사냥은 beasts가 맡는다.
// - 여기(game.hunter)는 보통 짐승 사냥의 살림: 사냥터와 영주의 숲(허가·밀렵), 철마다 다른 짐승, 짐승마다 다른 모피·가죽·고기,
//   모피 상인, 사냥개·매와 함께, 큰뿔사슴·들소·늑대 떼 같은 큰 사냥과 다침, 사냥꾼 오두막(훈연막·건조대)과 도제, 귀족 사냥 대회 몰이꾼.
// 상태는 game.hunter 하나:
//   furs: { 짐승 id: 장 }  meat: 고기(달이 가면 상한다)  smoked: 훈제 고기
//   license: { 고장: 끝나는 달 }  caught: 밀렵에 걸린 횟수  banned: { 고장: 풀리는 달 }
//   stock: { 고장: 짐승 수 0~100 }  (플레이어 없이도 사냥과 혹한에 줄고, 봄에 는다)
//   lodge: null | { place, since, smoke, rack, app: [{ id, name, since }] }
//   trader: { name, trust, order: null | { kind, n, until, paid } }
//   bigs[], hunts, earned, poached, beatAt, evAt, log
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
export const adult = (g) => playerAge(g) >= 14;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 79) ^ Math.imul(mi(g) * 167 + salt + 389, 2654435761)) | 0 });
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;
export const skill = (g) => g.player.skills.hunting ?? 0;
export const isHunter = (g) => L(g).job?.id === 'hunter';
export const SEASON = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
export const seasonOf = (g) => SEASON[g.date.month - 1];

// 사냥터: 누구나 드는 숲과 들 (wood), 영주와 왕실의 금렵 숲 (lord: 허가 값)
export const GROUNDS = {
  ern: { wood: '마을 뒤 참나무 숲' },
  gruental: { wood: '그륀탈 둑방 너머 갈대밭과 잡목 숲', lord: { name: '그륀탈 영주의 사슴 숲', fee: 14, who: '영주의 산지기' } },
  verden: { wood: '베르덴 강 건너 너도밤나무 숲', lord: { name: '베르덴 백작의 사냥 숲', fee: 18, who: '백작의 산지기' } },
  leocast: { lord: { name: '왕실 사냥터 붉은 사슴 숲', fee: 30, who: '왕실 수렵관' } },
  harfen: { wood: '하르펜 남쪽 언덕의 덤불 숲', lord: { name: '하르펜 영주의 멧돼지 숲', fee: 16, who: '영주의 산지기' } },
  silverleaf: { wood: '대삼림 가장자리' },
  fur: { wood: '털가죽 시장 너머 초원과 바위 언덕' },
  graubel: { wood: '천룡 산맥 기슭의 가문비 숲' },
  gorge: { wood: '구렁목 골짜기 숲' },
  hammer: { wood: '쇠망치 골 위쪽 산비탈' },
  eisen: { lord: { name: '황실 수렵원', fee: 28, who: '황실 수렵관' } },
  solaris: { lord: { name: '성광국 교단 숲', fee: 20, who: '교단 산지기' } },
  fr_wood: { wood: '물푸레 숲 끝의 깊은 숲' },
  fr_wolf: { wood: '늑대 고개의 바위 비탈' },
  fr_moor: { wood: '남쪽 황무지의 덤불과 샘가' },
};
export const groundOf = (pl) => GROUNDS[pl] ?? null;
export const hasWood = (pl) => !!GROUNDS[pl]?.wood;
export const hasLord = (pl) => !!GROUNDS[pl]?.lord;

// 짐승: when 철(그때 잘 잡힌다), fur 모피·가죽 한 장 값(은화), meat 고기 몫, where 많이 사는 사냥터(없으면 어디나), lord 금렵 숲에 많다
export const GAME = {
  hare: { name: '산토끼', when: ['가을', '겨울', '봄'], fur: 1, meat: 1, small: true },
  fox: { name: '여우', when: ['겨울', '가을'], fur: 5, meat: 0, small: true, winter: 1.6 },
  marten: { name: '담비', when: ['겨울'], fur: 11, meat: 0, small: true, winter: 1.5, where: ['graubel', 'silverleaf', 'fr_wood', 'gorge', 'hammer', 'fr_wolf'] },
  beaver: { name: '비버', when: ['봄', '가을'], fur: 7, meat: 1, small: true, where: ['gruental', 'verden', 'ern', 'fr_wood'] },
  otter: { name: '수달', when: ['겨울', '봄'], fur: 8, meat: 0, small: true, where: ['gruental', 'verden', 'silverleaf'] },
  pheasant: { name: '꿩', when: ['가을', '겨울'], fur: 0, meat: 1, small: true, bird: true },
  deer: { name: '노루', when: ['가을', '여름'], fur: 3, meat: 4, lord: true },
  boar: { name: '멧돼지', when: ['가을', '겨울'], fur: 2, meat: 5, lord: true },
  stag: { name: '큰뿔사슴', when: ['가을'], fur: 6, meat: 7, big: true, lord: true },
  wolf: { name: '늑대', when: ['겨울'], fur: 6, meat: 0, big: true, where: ['graubel', 'fur', 'fr_wolf', 'gorge', 'silverleaf', 'fr_moor'] },
  bison: { name: '들소', when: ['여름', '가을'], fur: 9, meat: 10, big: true, where: ['fur', 'fr_moor', 'fr_wood'] },
};
export const GAME_IDS = Object.keys(GAME);
export const furName = (id) => `${GAME[id].name} ${GAME[id].small ? '모피' : '가죽'}`;

// 모피 상인과 값: 털가죽 시장이 가장 낫고, 왕도와 제도는 담비·여우를 비싸게 산다
export const FUR_TOWNS = { fur: 1.5, leocast: 1.25, eisen: 1.3, portel: 1.1, harfen: 1.05, verden: 1, graubel: 1.05, solaris: 1.15, serenia: 1.15, barka: 1.05, klein: 0.95, ern: 0.8, gruental: 0.85, silverleaf: 0.9 };
export const TRADERS = ['수인 상인 그라흐', '모피상 루돌프', '털가죽 거간 마르타', '북쪽 상인 오스카', '왕도 모피 조합의 펠릭스'];

export const LODGE_PLACES = ['ern', 'gruental', 'verden', 'silverleaf', 'fur', 'graubel', 'gorge', 'fr_wood', 'fr_wolf', 'fr_moor'];
export const LODGE_COST = 40;

function fresh() {
  return {
    furs: {}, meat: 0, smoked: 0, license: {}, caught: 0, banned: {}, stock: {}, lodge: null,
    trader: { name: TRADERS[0], trust: 0, order: null }, bigs: [], hunts: 0, earned: 0, poached: 0, beatAt: 0, evAt: 0, log: [],
  };
}
export const H = (g) => (g.hunter ??= fresh());
export function logH(g, text) {
  const s = H(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const stockOf = (g, pl) => H(g).stock[pl] ?? 70;
export const licensed = (g, pl = here(g)) => (H(g).license[pl] ?? 0) > mi(g);
export const bannedAt = (g, pl = here(g)) => (H(g).banned[pl] ?? 0) > mi(g);
export const furCount = (g) => Object.values(H(g).furs).reduce((a, n) => a + n, 0);
export const lodgeHere = (g) => !!H(g).lodge && H(g).lodge.place === here(g) && !L(g).travel;
export function addFur(g, id, n = 1) { const s = H(g); s.furs[id] = (s.furs[id] ?? 0) + n; }
// 사냥개·매: 길든 정도만큼 돕는다 (beasts)
export const dogs = (g) => (g.beasts?.animals ?? []).filter((a) => a.alive && ['dog', 'direwolf'].includes(a.kind) && (a.trained ?? 0) >= 100);
export const hawks = (g) => (g.beasts?.animals ?? []).filter((a) => a.alive && a.kind === 'hawk' && (a.trained ?? 0) >= 100);

HOOKS.newGame.push((g) => { g.hunter = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.hunter) { g.hunter = d; return; }
  for (const k of Object.keys(d)) if (g.hunter[k] === undefined) g.hunter[k] = d[k];
});
