// 지도 그리는 사람과 측량사 (41단계): 측량사 일자리, 측량 의뢰(영지 경계·새 길·개척지 나누기·땅 재기), 고장 지도와 미지의 땅 지도,
// 지도 팔기(흠 숨기기·낯선 손님), 틀린 지도로 길 잃은 일, 군용 지도의 비밀과 밤 손님, 경계 다툼의 증인, 지도 공방과 도제, 이름 남는 큰 지도.
// 화면: surveyLine(g) 오늘의 장면 한 줄, surveyInfo(g) 화면용 묶음 (surveyStatus는 같은 것).
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { S, mi, here, placeName, KIND_NAME, qWord, skill, skillWord, isSV, atelierHere, unsold, secretMaps, mapTitle } from './core.js';
import { mapValue } from './life.js';
import './world.js';

export { S as surveyState, mapValue };
export { addMap, mapTitle } from './core.js';
export { shopsYear, liesMonth, atelierMonth } from './world.js';

/** 화면용 묶음 */
export function surveyInfo(g) {
  const s = S(g);
  return {
    surveyor: isSV(g), skill: Math.round(skill(g)), skillWord: skillWord(skill(g)),
    maps: unsold(g).map((m) => ({ title: mapTitle(m), kind: KIND_NAME[m.kind], y: m.y, q: m.q, word: qWord(m.q), secret: m.kind === 'war' })),
    atelier: s.atelier ? { place: placeName(s.atelier.place), years: Math.floor((mi(g) - s.atelier.since) / 12), apprentices: s.atelier.app.map((a) => a.name) } : null,
    master: s.master ? { prog: Math.floor(s.master.prog), of: 6 } : null,
    masterworks: s.masterworks.map((w) => ({ name: w.name, y: w.y, by: w.by })),
    shops: Object.values(s.shops).map((x) => ({ name: x.name, place: placeName(x.place), rep: Math.round(x.rep) })),
    done: { jobs: s.jobs, drawn: s.drawn, sold: s.sold, earned: s.earned, lost: s.lost, witness: s.witness },
    past: s.past.slice(-3),
    log: s.log.slice(-8),
  };
}
export const surveyStatus = surveyInfo;

/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function surveyLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const s = S(g), t = mi(g);
  if (secretMaps(g).length && t % 2 === 0) return '궤짝 밑바닥의 군용 지도 밑그림이 마음에 걸린다. 골목에서 누가 창을 올려다본 것 같다.';
  if (atelierHere(g)) {
    if (s.master && t % 2 === 1) return `공방 긴 탁자 위에 그리다 만 큰 지도가 펼쳐져 있다. 해안선 절반이 아직 연필 자국이다.`;
    if (s.atelier.app.length && t % 3 === 0) return `공방 창가에서 ${J(s.atelier.app[0].name, '이/가')} 혀를 내밀고 등고선을 긋는다.`;
    if (t % 3 === 1) return '공방에 물감 냄새와 양피지 가루가 떠다닌다. 말아 둔 지도들이 벽장에서 삐져나와 있다.';
  }
  if (isSV(g)) {
    if (unsold(g).length >= 3 && t % 3 === 2) return `팔지 못한 지도 ${unsold(g).length}장이 등짐에서 바스락거린다.`;
    if (t % 4 === 0) return `${placeName(here(g))} 성문 밖 언덕에 내가 박은 측량 말뚝이 아직 서 있다.`;
  }
  if (s.masterworks.some((w) => w.family) && t % 9 === 4) return `${J(s.masterworks.find((w) => w.family).name, '을/를')} 베낀 지도가 장터 노점에도 걸려 있다. 집안 사람이 그린 지도다.`;
  return null;
}
