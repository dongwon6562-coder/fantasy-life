// 32단계 하늘의 짐승 기수 (도우미스레드3). 상태는 g.mount 하나. 짐승 자체는 beasts(g.beasts.animals)에 산다.
//   와이번은 beasts에 이미 있다(밀매 알, 무너진 둥지). 여기서 그리폰을 더하고, 하늘 짐승에게만 있는 것을 얹는다:
//   둥지와 알, 알 품기, 새끼가 사나워지는 해, 등에 올라 나는 법(flight), 하늘길, 전령, 싸움터, 잿빛 날개대, 늙어 마지막으로 나는 날.
//   아주 드물고 비싸다. 귀엽지 않다: 날고기를 먹고, 사람을 다치게 하고, 이웃이 두려워한다.
//
//   eggs[{ id, kind, from, got, prog, warm, by }]   품는 알 (prog가 hatch에 닿으면 깬다, warm이 0이 되면 식어 죽는다)
//   sky{ [animalId]: { kind, flight 0~100, falls, sorties, wounds, hatchedBy, lastFlight, carried } }
//   nests{ id: { eggs, known, robbed, anger } }   band{ riders, beasts, captain, captainN, lost } (잿빛 날개대, 세상 쪽)
//   me{ member: null|{ since, rank, sorties }, nests, eggsGot, hatched, falls, flights, sorties, couriers, served, permit }
//   graves[{ name, kind, y, years, how }]  log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { L } from '../adventure/core.js';
import { KINDS } from '../beasts/core.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const here = (g) => (g.life ? L(g).place ?? 'ern' : 'ern');
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const mountRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 977) ^ Math.imul(mi(g) * 131 + salt + 29, 2654435761)) | 0 });

// 그리폰: beasts의 짐승 표에 더한다 (와이번은 이미 있다)
if (!KINDS.griffin) {
  KINDS.griffin = {
    name: '그리폰', life: [35, 50], pow: 20, feed: 3.5, ride: 2, train: 600, price: 900, beast: true,
    desc: '독수리 머리와 사자 몸. 산꼭대기 바위벽에 둥지를 튼다. 말을 통째로 채 간다. 한 사람만 태우고, 그 사람이 죽으면 다음 사람을 오래 시험한다.',
    names: ['잿빛 부리', '바위발톱', '북풍', '쇠깃', '높은 눈'],
  };
}
export const SKY = ['wyvern', 'griffin'];
export const isSky = (a) => !!a && SKY.includes(a.kind);
// 다 자라 사람을 태울 수 있는 나이, 알을 품는 달 수
export const SKY_INFO = {
  wyvern: { adult: 4, hatch: 4, eggPrice: 380, mother: 74, meat: '양', egg: '와이번 알', eggLook: '가죽처럼 질긴 잿빛 껍데기에 핏줄 같은 무늬가 있다' },
  griffin: { adult: 5, hatch: 6, eggPrice: 650, mother: 82, meat: '말', egg: '그리폰 알', eggLook: '사람 머리만 하고, 돌처럼 무겁고, 손을 대면 안에서 무언가 긁는다' },
};

// 둥지 넷. from: 둥지가 보이는 고장
export const NESTS = {
  gr_hammer: { kind: 'griffin', from: 'hammer', name: '쇠망치 골 바위탑 둥지', per: 1, text: '쇠망치 골 위쪽, 드워프들이 "독수리 이빨"이라 부르는 바위탑 꼭대기. 마른 뼈와 말 갈기가 둥지 아래 비탈에 쌓여 있다.' },
  gr_wolf: { kind: 'griffin', from: 'fr_wolf', name: '늑대 고개 벼랑 둥지', per: 1, text: '늑대 고개 북쪽 벼랑. 바람이 세서 밧줄이 연처럼 날린다. 둥지 가장자리에 부러진 창 자루가 꽂혀 있다. 먼저 온 사람의 것이다.' },
  wy_gorge: { kind: 'wyvern', from: 'gorge', name: '구렁목 절벽 둥지', per: 2, text: '구렁목 절벽 중턱의 동굴들. 유황 냄새와 썩은 고기 냄새가 같이 올라온다. 동굴 입구 바위가 발톱 자국으로 홈이 패었다.' },
  wy_ash: { kind: 'wyvern', from: 'fr_ash', name: '잿빛 고원 바위굴', per: 2, text: '잿빛 고원 바위틈의 얕은 굴. 재 속에 알이 반쯤 묻혀 있다. 어미는 재 위에 몸을 깔고 볕을 쬔다.' },
};
export const NEST_IDS = Object.keys(NESTS);
export const nestAt = (pl) => NEST_IDS.filter((id) => NESTS[id].from === pl);

// 잿빛 날개대: 잿빛 성벽 기사단 곁에서 하늘 짐승을 타는 사람들 (그라우벨)
export const BAND = {
  name: '잿빛 날개대', seat: 'graubel', ranks: ['날개잡이', '기수', '날개장'], need: [0, 6, 18], wage: [3, 5, 9],
  captains: ['하늘손 엘리자', '외눈 군터', '벼랑 마르크', '잿깃 헤드비히', '높은바람 오스카'],
  desc: '잿빛 성벽 기사단 셋째 성벽 위에 둥지 탑을 세운 하늘 기수들. 열 손가락으로 꼽을 만큼 적다. 짐승이 죽으면 사람도 내려와야 한다.',
};

const freshNests = () => Object.fromEntries(NEST_IDS.map((id) => [id, { eggs: NESTS[id].per, known: false, robbed: 0, anger: 0 }]));
const freshMe = () => ({ member: null, nests: 0, eggsGot: 0, hatched: 0, falls: 0, flights: 0, sorties: 0, couriers: 0, served: 0, permit: 0 });
const freshBand = () => ({ riders: 7, beasts: 7, captain: BAND.captains[0], captainN: 0, lost: 0 });
export const fresh = () => ({ eggs: [], sky: {}, nests: freshNests(), band: freshBand(), me: freshMe(), graves: [], log: [], seq: 0, seen: 0 });
export const MS = (g) => (g.mount ??= fresh());
export function mlog(g, text) {
  const M = MS(g);
  M.log.push({ y: g.date.year, m: g.date.month, text });
  if (M.log.length > 30) M.log.splice(0, M.log.length - 30);
}
export function fill(g) {
  const M = MS(g), f = fresh();
  for (const k of Object.keys(f)) M[k] ??= f[k];
  M.me = Object.assign(freshMe(), M.me ?? {});
  M.band = Object.assign(freshBand(), M.band ?? {});
  for (const id of NEST_IDS) M.nests[id] = Object.assign({ ...f.nests[id] }, M.nests[id] ?? {});
  for (const id of Object.keys(M.nests)) if (!NESTS[id]) delete M.nests[id];
  if (!Array.isArray(M.eggs)) M.eggs = [];
  M.eggs = M.eggs.filter((e) => e && SKY_INFO[e.kind]);
  if (!Array.isArray(M.graves)) M.graves = [];
}
HOOKS.newGame.push((g) => { g.mount = fresh(); });
HOOKS.migrate.push((g) => fill(g));
