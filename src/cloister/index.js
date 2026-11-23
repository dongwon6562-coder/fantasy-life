// 수도원과 은둔 (39단계): 수도원 넷(골짜기·흰 바위·솔라리스 대수도원·베르덴 강가 수녀원), 늦은 귀의와 어린 헌납,
// 청원자·수련자·서원·부원장·원장, 필사실·약초밭·양조실·종지기·밭, 원장 선출, 영주와의 땅 다툼, 산속 은둔처와 손님, 세속으로 돌아가기.
// 화면: cloisterLine(g) 오늘의 장면 한 줄, cloisterInfo(g) 화면용 묶음 (cloisterStatus는 같은 것).
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { C, mi, here, placeName, HOUSES, houseAt, ROLES, STAGES, HERMIT_PLACES, inHouse, hermitHere, houseOf, monkWord } from './core.js';
import './life.js';
import './world.js';

export { C as cloisterState, HOUSES as CLOISTER_HOUSES, ROLES as CLOISTER_ROLES };
export { leaveVows, endHermit, callFelt, gateOk, hermitOk } from './life.js';
export { stageMonth, housesYear, disputeYear, disputeMonth, visitMonth, oblateOk } from './world.js';

/** 화면용 묶음 */
export function cloisterInfo(g) {
  const s = C(g), v = s.vow, h = s.hermit;
  return {
    vow: v ? { house: HOUSES[v.house].name, stage: STAGES[v.stage], role: v.role ? ROLES[v.role].name : null, years: Math.floor((mi(g) - v.since) / 12), merit: Math.round(v.merit ?? 0), away: v.away ?? 0 } : null,
    houses: Object.entries(s.houses).map(([id, hs]) => ({ name: HOUSES[id].name, place: placeName(HOUSES[id].place), abbot: hs.abbot, monks: hs.monks, land: Math.round(hs.land), wealth: Math.round(hs.wealth), rep: Math.round(hs.rep), dispute: hs.dispute ? hs.dispute.lord : null })),
    hermit: h ? { place: HERMIT_PLACES[h.place] ?? placeName(h.place), months: mi(g) - h.since, visits: h.visits, fame: Math.round(h.fame) } : null,
    done: { copied: s.copied, herbs: s.herbs, brewed: s.brewed, rung: s.rung },
    left: s.left.slice(-4).map((x) => ({ house: HOUSES[x.house]?.name ?? '', y: x.y, how: x.how })),
    past: s.past.slice(-4),
    log: s.log.slice(-8),
  };
}
export const cloisterStatus = cloisterInfo;

const ROLE_LINE = {
  scriptorium: '필사실 창으로 드는 빛이 양피지 위를 천천히 건너간다. 펜 긁는 소리만 들린다.',
  herbs: '약초밭 고랑 사이로 세이지와 쑥 냄새가 올라온다. 병실 창이 열려 있다.',
  brew: '양조실 솥에서 보리 끓는 냄새가 회랑까지 번진다.',
  bells: '종탑 줄에 쓸린 손바닥이 아직 화끈거린다. 다음 종까지 모래시계 반 바퀴.',
  fields: '곳간 문 앞에 빵을 기다리는 사람들이 조용히 줄을 섰다.',
};
const HERMIT_LINE = [
  '움막 앞 바위에 이끼가 한 뼘 더 자랐다. 아무도 오지 않은 날이 길다.',
  '샘물 위로 낙엽이 하나 떠간다. 산 아래 마을 연기가 가늘게 오른다.',
  '바람이 움막 틈으로 들어와 촛불을 눕혔다가 일으킨다.',
];
/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function cloisterLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const s = C(g), t = mi(g), v = s.vow;
  if (inHouse(g)) {
    const h = HOUSES[v.house], hs = houseOf(g), w = monkWord(g);
    if (hs.dispute && ['prior', 'abbot'].includes(v.stage) && t % 2 === 0) return `${J(hs.dispute.lord, '이/가')} 보낸 사람들이 수도원 숲 가장자리에 말뚝을 박고 돌아갔다.`;
    if (v.stage === 'oblate' && t % 3 === 0) return `나이 든 ${J(w.brother, '이/가')} 회랑 끝에서 글자를 가르쳐 준다. 담 너머에서 아이들 노는 소리가 넘어온다.`;
    if (v.stage === 'postulant' && t % 3 === 1) return '아직 머리가 덜 자란 정수리가 새벽바람에 시리다. 기도문 순서를 또 틀렸다.';
    if (v.role && t % 3 === 2) return ROLE_LINE[v.role];
    if (t % 2 === 0) return h.bell;
    return null;
  }
  if (hermitHere(g)) {
    const hm = s.hermit;
    if (hm.fame >= 15 && t % 3 === 0) return '산길 아래 바위에 누가 두고 간 빵과 초가 놓여 있다. 은자의 움막을 찾는 사람이 늘었다.';
    return t % 2 === 0 ? HERMIT_LINE[t % HERMIT_LINE.length] : null;
  }
  const id = houseAt(here(g));
  if (id && !v && s.left.some((x) => x.house === id) && t % 6 === 1) return `${HOUSES[id].name} 종소리가 들린다. 저 담 안에서 보낸 날들이 아직 몸에 남아 있다.`;
  if (id && !v && t % 8 === 3) return HOUSES[id].bell;
  return null;
}
