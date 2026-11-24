// 40단계 피난과 이주 (도우미스레드3). 상태는 g.migrate 하나.
//   전쟁·점령·불탄 마을·용의 불·재앙·돌림병·마물·흉년이 고장 사람들을 밀어낸다. 피난 행렬은 길 위에 있다가
//   받아 주는 고장에선 이주민 거리(quarter)가 되고, 막는 고장에선 성문 밖 난민촌(camp)이 된다. 거리는 세대가 지나며 섞인다.
//   pop{고장: 사람 수}  (이 갈래만 쓰는 수다. 다른 갈래는 읽기만: popOf)
//   flows[{ id, from, to, why, size, left, at }]  camps{고장: { from, why, size, since }}  quarters{고장: [{ from, size, since, mix(0~100), tension(0~100) }]}
//   push{고장: 지난달 밀어내는 힘}  lastFlow{고장: 달}  open{고장: 달까지 성문을 연다}  past[]  log[]
//   me{ refugee: null|{ from, why, since, to }, settledFrom, settledAt, gave, worked, bribed, spoke, organized, wentHome, hired }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const mgRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 521) ^ Math.imul(mi(g) * 173 + salt + 29, 2246822519)) | 0 });

// 고장마다 평소 사람 수 (꼴에 따라)
const BASE_BY_T = { '왕도': 12000, '제도': 10000, '성도': 6000, '마법도시': 5000, '자유도시': 5000, '항구 도시': 5000, '섬의 수도': 4000, '소도시': 3200, '백작령 성읍': 3000, '성채도시': 3000, '미궁 도시': 2000, '드워프 마을': 1200, '엘프 교역 마을': 600, '부족 교역장': 800, '항구 마을': 700, '마을': 400, '골짜기 마을': 350, '해적 요새 섬': 300, '외딴 섬': 200 };
export const MG_PLACES = Object.keys(PLACES).filter((p) => !PLACES[p].hidden);
export const baseOf = (pl) => BASE_BY_T[PLACES[pl]?.kind ?? PLACES[pl]?.t] ?? 500;
export const realmOf = (pl) => PLACES[pl]?.realm || 'leonia';
export const WHY = {
  war: { name: '전쟁', flee: '전쟁을 피해' },
  occupied: { name: '점령', flee: '점령군을 피해' },
  ruin: { name: '불탄 마을', flee: '불탄 집을 버리고' },
  dragon: { name: '용의 불', flee: '용이 지나간 잿더미를 떠나' },
  calamity: { name: '재앙', flee: '물난리와 가뭄에 밀려' },
  plague: { name: '돌림병', flee: '돌림병을 피해' },
  monsters: { name: '마물', flee: '마물에 쫓겨' },
  famine: { name: '흉년', flee: '굶주림에 밀려' },
};
export const tensionWord = (t) => (t >= 60 ? '언제 주먹다짐이 날지 모른다' : t >= 35 ? '골목마다 수군거린다' : t >= 15 ? '서로 데면데면하다' : '그럭저럭 어울려 산다');
export const mixWord = (m) => (m >= 75 ? '이제 말투만 조금 다를 뿐이다' : m >= 45 ? '혼례로 맺어진 집이 늘었다' : m >= 20 ? '아이들은 섞여 논다' : '저희끼리 모여 산다');
export const quarterName = (q) => `${placeName(q.from)} 사람들 거리`;

const freshMe = () => ({ refugee: null, settledFrom: null, settledAt: 0, gave: 0, worked: 0, bribed: 0, spoke: 0, organized: 0, wentHome: 0, hired: 0 });
export const fresh = () => ({ seq: 1, pop: Object.fromEntries(MG_PLACES.map((p) => [p, baseOf(p)])), flows: [], camps: {}, quarters: {}, push: {}, lastFlow: {}, open: {}, burn: {}, past: [], me: freshMe(), log: [] });
export const MS = (g) => (g.migrate ??= fresh());
/** 이 고장 사람 수 (다른 갈래는 이것만 읽는다) */
export const popOf = (g, pl) => Math.round(g?.migrate?.pop?.[pl] ?? baseOf(pl));
export const campAt = (g, pl) => g?.migrate?.camps?.[pl] ?? null;
export const quartersAt = (g, pl) => g?.migrate?.quarters?.[pl] ?? [];
export function mlog(g, text) {
  const S = MS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export function pastPush(g, rec) {
  const S = MS(g);
  S.past.push(rec);
  if (S.past.length > 16) S.past.shift();
}

function fill(g) {
  const S = MS(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const p of MG_PLACES) S.pop[p] ??= baseOf(p);
  S.me = Object.assign(freshMe(), S.me ?? {});
}
HOOKS.newGame.push((g) => { g.migrate = fresh(); });
HOOKS.migrate.push((g) => { fill(g); });
