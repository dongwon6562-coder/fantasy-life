// 하늘과 땅. 상태는 g.nature 하나.
//   crop{region: 올해 소출 (1 = 평년, 0.3~1.3)}: 봄에 정해지고, 재앙이 깎는다. 가을에 거둔다.
//   active[]: 지금 벌어지는 재앙 { id, kind, region, sev(0~1), left(달), start{y,m} }
//   past[]: 지나간 큰 재앙 기록 (최근 40개)   dike{place: 해}: 그해 둑을 쌓은 고장   ready: 겨울나기를 마친 겨울(해)
//   lean: 흉년이 이어진 해 수   seq: 재앙 번호
import { HOOKS } from '../hooks.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 땅의 생김새로 나눈 고장 묶음
export const REGIONS = {
  south: { name: '남부 들판', places: ['ern', 'harfen', 'fur'], farm: true },
  river: { name: '강 유역', places: ['verden', 'leocast', 'klein'], farm: true },
  north: { name: '북부 변경', places: ['gruental', 'graubel'], farm: true },
  east: { name: '제국 평원', places: ['eisen'], farm: true },
  holy: { name: '성광국 고원', places: ['solaris'], farm: true },
  lake: { name: '세레니아 호숫가', places: ['serenia'], farm: false },
  forest: { name: '대삼림', places: ['silverleaf'], farm: false },
  mountain: { name: '천룡 산맥', places: ['hammer', 'gorge'], farm: false },
  coast: { name: '남해 바닷가', places: ['barka', 'portel', 'saltmare', 'saltrock', 'crow'], farm: false },
};
export const REGION_IDS = Object.keys(REGIONS);
export const regionOf = (place) => REGION_IDS.find((r) => REGIONS[r].places.includes(place)) ?? 'south';
// 레오니아 사람들의 빵이 나는 곳
export const BREADBASKET = ['south', 'river', 'north'];

// 재앙: 언제 시작하나(달), 어디에 오나(고장 묶음별 한 달 확률), 얼마나 가나, 소출을 얼마나 깎나
export const KINDS = {
  drought: { name: '가뭄', months: [6, 7, 8], odds: { south: 0.025, east: 0.025, holy: 0.03, river: 0.0125, north: 0.01 }, last: [3, 5], crop: 0.45, desc: '비가 오지 않는다. 우물 바닥이 드러나고 밀이 선 채로 누렇게 탄다.' },
  flood: { name: '홍수', months: [7, 8, 9], odds: { river: 0.03, lake: 0.02, coast: 0.015, south: 0.0075 }, last: [1, 2], crop: 0.3, home: 25, desc: '장마가 그치지 않는다. 강이 둑을 넘어 들판과 마을을 삼킨다.' },
  winter: { name: '혹한', months: [12, 1], odds: { north: 0.045, mountain: 0.04, forest: 0.02, south: 0.0125, river: 0.015, east: 0.02, holy: 0.01 }, last: [2, 3], crop: 0.1, desc: '북쪽에서 내려온 바람이 땅을 돌처럼 얼린다. 장작이 금값이 되고 늙은이들이 먼저 쓰러진다.' },
  quake: { name: '지진', months: null, odds: { mountain: 0.00125, east: 0.0006, river: 0.0003, holy: 0.0004 }, last: [1, 1], crop: 0.05, home: 45, desc: '땅이 울었다. 벽이 갈라지고 지붕이 내려앉는다.' },
  locust: { name: '메뚜기 떼', months: [8, 9], odds: { south: 0.006, holy: 0.015, east: 0.0075 }, last: [1, 2], crop: 0.5, afterDrought: 4, desc: '남쪽 하늘이 검게 흐려졌다. 구름이 아니다. 메뚜기 떼가 지나간 들에는 줄기만 남는다.' },
  storm: { name: '큰 폭풍', months: [9, 10], odds: { coast: 0.035 }, last: [1, 1], crop: 0.05, home: 15, desc: '바다에서 큰 바람이 올라왔다. 배들이 부두에 처박히고 바닷물이 골목까지 들어찬다.' },
};

export const SEASON = (m) => (m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn');
export const SEASON_NAME = { winter: '겨울', spring: '봄', summer: '여름', autumn: '가을' };
// 겨울나기는 가을(10월)에 준비해 그해 12월부터 이듬해 2월까지 버틴다
export const winterOf = (g) => (g.date.month >= 10 ? g.date.year : g.date.year - 1);

export const NS = (g) => (g.nature ??= fresh());
export function fresh() {
  const crop = {};
  for (const r of REGION_IDS) crop[r] = 1;
  return { crop, active: [], past: [], dike: {}, ready: null, lean: 0, seq: 1, log: [] };
}
export function nlog(g, text) {
  const N = NS(g);
  N.log.push({ y: g.date.year, m: g.date.month, text });
  if (N.log.length > 30) N.log.splice(0, N.log.length - 30);
}
export const cropWord = (v) => (v >= 1.12 ? '풍년' : v >= 0.92 ? '평년' : v >= 0.72 ? '소출이 줄었다' : v >= 0.5 ? '흉년' : '큰 흉년');
export const activeAt = (g, place) => NS(g).active.filter((d) => d.region === regionOf(place));

HOOKS.newGame.push((g) => { g.nature = fresh(); });
HOOKS.migrate.push((g) => {
  const N = NS(g), f = fresh();
  for (const k of Object.keys(f)) N[k] ??= f[k];
  for (const r of REGION_IDS) N.crop[r] ??= 1;
});
// 대를 이어도 하늘은 그대로다. 겨울나기만 새로 한다.
HOOKS.heir?.push((g) => { NS(g).ready = null; });
