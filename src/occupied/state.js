// 36단계 점령지에서 살기 (도우미스레드3). 상태는 g.occ 하나.
//   발하르트와 전쟁에서 밀리면 국경 고장(그륀탈 → 베르덴 → 하르펜)이 점령된다. 강화로 끝나면 그 땅은 제국에 넘어간다(ceded: realms에서 발하르트 땅).
//   이기거나, 봉기가 이기거나, 다음 전쟁에서 되찾으면 풀린다. 풀리면 부역자 심판이 온다.
//   places: { 고장: { since, lord(점령 영주 이름), temper, harsh(가혹함 0~100), resist(저항 0~100), collab(붙는 사람 0~100), ceded, levies } }
//   past: [{ pl, from, to, how, years }]   tried: { 고장: 해방된 달 } (심판이 남은 곳)
//   me{ seen{고장:since}, post(점령군 밑 자리 고장|null), collab(부역 점수), resist(저항 점수), informed, hid, gave, bond(정든 병사 이름|null), tried, fled }   log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const occRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 571) ^ Math.imul(mi(g) * 193 + salt + 71, 2246822519)) | 0 });

// 제국군이 밀고 들어오는 차례: 전선이 이만큼 밀리면 그 고장까지
export const FRONT = [
  { pl: 'gruental', at: -3 },
  { pl: 'verden', at: -5.5 },
  { pl: 'harfen', at: -7.5 },
];
export const TARGETS = FRONT.map((x) => x.pl);
export const OFFICERS = ['폰 할데크 대령', '폰 슈트라이트 소령', '라이너 쾨펠 대위', '오스발트 그림 대령', '폰 베렌 중령', '디터 라우 대위'];
export const TEMPERS = { strict: '규율에 엄하다', cruel: '잔혹하다', fair: '공정한 편이다', greedy: '탐욕스럽다' };
export const SOLDIER_NAMES = ['요나스', '파울', '벤델', '마르틴', '루카스', '에밀', '하넬로레', '그레타'];
export const harshWord = (v) => (v >= 70 ? '밤마다 문을 두드리는 소리가 난다' : v >= 45 ? '광장에 교수대가 섰다' : v >= 25 ? '통금과 검문이 있다' : '점령군이 크게 건드리지 않는다');
export const resistWord = (v) => (v >= 70 ? '숲과 지하실이 온통 저항군이다' : v >= 40 ? '밤에 보급 수레가 불탄다' : v >= 15 ? '벽에 몰래 쓴 글씨가 보인다' : '모두 고개를 숙이고 산다');

// 원래 나라 (realms가 PLACES[pl].realm을 읽는다). 넘어간 땅만 발하르트로 바꾼다
const ORIG = Object.fromEntries(TARGETS.map((pl) => [pl, PLACES[pl]?.realm]));
export function syncOcc(g) {
  for (const pl of TARGETS) {
    if (!PLACES[pl]) continue;
    const o = g?.occ?.places?.[pl];
    if (o?.ceded) PLACES[pl].realm = 'valhart';
    else if (ORIG[pl] === undefined) delete PLACES[pl].realm;
    else PLACES[pl].realm = ORIG[pl];
  }
}
const freshMe = () => ({ seen: {}, post: null, collab: 0, resist: 0, informed: 0, hid: 0, gave: 0, bond: null, tried: 0, fled: 0 });
export const fresh = () => ({ places: {}, past: [], tried: {}, me: freshMe(), log: [] });
export const OC = (g) => (g.occ ??= fresh());
export const occAt = (g, pl) => g?.occ?.places?.[pl] ?? null;
export function olog(g, text) {
  const S = OC(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
function fill(g) {
  const S = OC(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  S.me = Object.assign(freshMe(), S.me ?? {});
}
HOOKS.newGame.push((g) => { g.occ = fresh(); syncOcc(g); });
// 새 판은 다른 갈래(태어날 집안의 국적 등)가 고장을 읽기 전에 땅 주인부터 되돌린다
HOOKS.newGame.unshift(() => syncOcc(null));
HOOKS.migrate.push((g) => { fill(g); syncOcc(g); });
