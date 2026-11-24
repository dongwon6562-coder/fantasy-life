// 지도 그리는 사람과 측량사 (41단계). 상태와 도우미.
// - 미지의 땅 원정과 첫 지도는 explore가, 개척촌은 frontier가, 큰 공사는 works가, 밀정 조직은 spy가, 대륙 지도 그림은 art/map이 맡는다.
// - 여기(game.survey)는 '재고 그리는 일': 측량 의뢰(영지 경계·새 길·개척지 나누기·땅 재기), 고장 지도 그리기와 팔기,
//   미지의 땅 지도 옮겨 그리기, 틀린 지도로 길 잃은 일, 군용 지도의 비밀과 도둑맞음, 경계 다툼의 증인, 지도 공방과 도제, 이름 남는 지도.
// 상태는 game.survey 하나:
//   skill: 솜씨 0~100   maps: [{ id, kind, of, y, q, sold, to, secret }]   (kind: town 고장 · region 미지의 땅 · war 군용)
//   jobs drawn sold earned lost witness   atelier: null | { place, since, app: [{ name, since }] }
//   master: null | { start, prog, of }   masterworks: [{ name, y, by }]   (이름 남는 지도는 대를 넘는다)
//   borders: [{ a, b, y, shifted }]  (내가 그은 경계: 다툼이 나면 증인으로 불린다)
//   shops: { id: { name, place, rep, bad } }  (플레이어 없이도 지도를 찍어 내는 공방들)
//   evAt sellAt witnessAt theftAt seq log past
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
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 101) ^ Math.imul(mi(g) * 191 + salt + 419, 2654435761)) | 0 });
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;

// 측량사 일자리가 있는 곳 (영주·관청·상단이 있는 성읍 이상)
export const SURVEY_PLACES = ['harfen', 'verden', 'leocast', 'eisen', 'solaris', 'barka', 'portel', 'graubel', 'serenia'];
// 지도 사는 사람이 있는 곳과 값 배율 (항구와 큰 도시가 낫다)
export const MAP_TOWNS = { leocast: 1.2, eisen: 1.3, portel: 1.3, barka: 1.25, solaris: 1.1, serenia: 1.2, harfen: 1, verden: 1, graubel: 1.05, klein: 0.9, saltmare: 1.1 };
export const ATELIER_COST = 80;
// 경계를 다투는 이웃 영지들 (의뢰 장면에 쓰는 이름)
export const BORDERS = [
  ['그륀탈 영주', '베르덴 백작'], ['하르펜 영주', '에른 촌장회'], ['그라우벨 변경백', '늑대 고개 개척민'], ['클라인 항 조합', '갈대 늪 어부들'],
  ['교단 수도원', '그륀탈 영주'], ['베르덴 백작', '하르펜 영주'], ['제국 둔전관', '쇠풀 벌판 목동들'],
];
// 플레이어 없이도 지도를 찍어 내는 공방들
const SHOPS0 = {
  quill: { name: '하르펜 깃펜 공방', place: 'harfen', rep: 45, bad: 0.15 },
  compass: { name: '포르텔 나침반 집', place: 'portel', rep: 55, bad: 0.1 },
  crown: { name: '왕도 측지원', place: 'leocast', rep: 60, bad: 0.05 },
  cheap: { name: '바르카 장터 지도 노점', place: 'barka', rep: 25, bad: 0.4 },
};
export const KIND_NAME = { town: '고장 지도', region: '미지의 땅 지도', war: '군용 지도' };
export const qWord = (q) => (q >= 75 ? '눈금 하나 틀림이 없다' : q >= 50 ? '믿고 쓸 만하다' : q >= 25 ? '대강은 맞다' : '어디가 틀렸는지도 모를 만큼 엉성하다');
export const skillWord = (v) => (v >= 70 ? '산을 보면 높이가, 강을 보면 너비가 먼저 보인다' : v >= 40 ? '측량대 다루는 손이 익었다' : v >= 15 ? '사슬 재는 법은 안다' : '아직 서툴다');

function fresh() {
  const shops = {};
  for (const [k, v] of Object.entries(SHOPS0)) shops[k] = { ...v };
  return { skill: 0, maps: [], jobs: 0, drawn: 0, sold: 0, earned: 0, lost: 0, witness: 0, atelier: null, master: null, masterworks: [], borders: [], shops, evAt: -99, sellAt: -99, witnessAt: -99, theftAt: -99, seq: 1, log: [], past: [] };
}
export const S = (g) => (g.survey ??= fresh());
export function logS(g, text) {
  const s = S(g);
  s.log.push({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 30) s.log.splice(0, s.log.length - 30);
}
export const skill = (g) => S(g).skill;
export const isSV = (g) => L(g).job?.id === 'surveyor' && L(g).job.place === here(g);
export const atelierHere = (g) => !!S(g).atelier && S(g).atelier.place === here(g) && !L(g).travel;
export function gainS(g, base) { const s = S(g); const v = base * (1 - s.skill / 130); s.skill = clamp(s.skill + v, 0, 100); return v; }
export const unsold = (g) => S(g).maps.filter((m) => !m.sold);
export const secretMaps = (g) => S(g).maps.filter((m) => m.kind === 'war' && !m.sold);
export function addMap(g, kind, of, q, extra = {}) {
  const s = S(g);
  const m = { id: s.seq++, kind, of, y: g.date.year, q: Math.round(clamp(q, 1, 100)), sold: false, to: null, ...extra };
  s.maps.push(m); s.drawn += 1;
  // 오래 묵은 판 지도는 잊는다
  while (s.maps.length > 24) { const i = s.maps.findIndex((x) => x.sold); s.maps.splice(i >= 0 ? i : 0, 1); }
  return m;
}
export const mapTitle = (m) => (m.kind === 'town' ? `${placeName(m.of)} 지도` : m.kind === 'war' ? `${m.of} 군용 지도` : `${m.of} 지도`);

HOOKS.newGame.push((g) => { g.survey = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  if (!g.survey) { g.survey = d; return; }
  for (const k of Object.keys(d)) if (g.survey[k] === undefined) g.survey[k] = d[k];
  for (const k of Object.keys(d.shops)) g.survey.shops[k] ??= d.shops[k];
});
