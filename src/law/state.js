// 법과 재판. 상태는 g.law 하나.
//   cases[]: 재판 { id, role('accused' | 'plaintiff'), place, realm, charge, other{ id, name }, guilty(참된 일), evidence(0~100, 고발하는 쪽 증거),
//              crime(체포에서 온 형사 재판인가), witness, at, state('open' | 'won' | 'lost' | 'settled' | 'dropped'), verdict, form }
//   grievances[]: 내가 당한 일 { id, charge, other{ id, name }, place, at, proof(0~100) }
//   skill: 법을 아는 솜씨(0~100)   stain: 집안에 남은 죄인의 낙인(0~100)   perjury[]: 내가 한 거짓 증언 { at, place, name }
//   rec{ won, lost, pleaded, combat, ordeal, bribed, judged, witness, lies, pleas(변론인으로 맡은 일), pardons }   seq, log[], ruler
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { realmOf } from '../realms/index.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 나라마다 재판이 다르다
//   court: 누가 재판하나   forms: 쓸 수 있는 재판 (combat 결투 재판, ordeal 신명 재판, truth 진실의 주문)
//   advocate: 변론인을 쓸 수 있나(값 배수)   bias: 재판관이 고발하는 쪽으로 기우는 정도   foreign: 외지인에게 더 엄한 정도
//   nobleCombat: 귀족만 결투 재판을 청할 수 있다   bribe: 재판관 뇌물이 통하는 정도 (음수면 뇌물 자체가 죄)
export const LAWS = {
  leonia: { court: '영주의 법정', judge: '영주의 재판관', forms: ['combat', 'ordeal'], nobleCombat: true, advocate: 1, bias: 5, foreign: 6, bribe: 0.1, sum: '영주의 재판관이 판결한다. 귀족은 결투 재판을 청할 수 있고, 시골에서는 신명 재판도 남아 있다. 재판관의 성정에 따라 판결이 갈린다.' },
  valhart: { court: '제국 법원', judge: '제국 법관', forms: [], advocate: 1.3, bias: 0, foreign: 4, bribe: -0.4, sum: '법전대로 판결한다. 변론인이 법정에 서고, 증거가 모든 것이다. 재판관에게 뇌물을 내미는 것 자체가 죄다.' },
  holy: { court: '교단 재판소', judge: '교단 재판관', forms: ['ordeal'], advocate: 0.8, bias: 10, foreign: 8, bribe: 0.05, sum: '교단 재판관이 판결한다. 증거가 모자라면 신께 묻는다. 달군 쇠를 쥐고 사흘 뒤 손이 깨끗하면 죄가 없다.' },
  serenia: { court: '협회 심판정', judge: '협회 집행관', forms: ['truth'], advocate: 1.2, bias: 0, foreign: 2, bribe: -0.15, sum: '협회 집행관이 진실의 주문을 건다. 주문을 받으면 거짓을 말할 수 없다. 받지 않으면 그것도 증거가 된다.' },
  free: { court: '의회 법정', judge: '의회 판사', forms: [], advocate: 1.5, bias: 0, foreign: 2, bribe: 0.3, sum: '돈으로 굴러가는 법정. 비싼 변론인이 이기고, 판사도 값을 매긴다. 죄는 대개 배상금으로 끝난다.' },
  march: { court: '변경 군사 법정', judge: '변경 헌병 대장', forms: ['combat'], advocate: 0, bias: 6, foreign: 4, bribe: -0.1, sum: '군율로 판결한다. 변론인은 없고, 누구든 결투 재판을 청할 수 있다. 칼이 판결한다.' },
  elf: { court: '숲의 장로 회의', judge: '숲의 장로들', forms: [], advocate: 0, bias: 4, foreign: 14, bribe: -0.5, sum: '장로들이 오래 듣고 짧게 말한다. 변론인도 뇌물도 없다. 외지인의 말은 반만 믿는다.' },
  dwarf: { court: '길드 중재소', judge: '길드 중재인', forms: [], advocate: 0.7, bias: 2, foreign: 6, bribe: -0.3, sum: '장인 길드의 중재인이 장부와 계약서를 본다. 손으로 쓴 약속이 입으로 한 맹세보다 무겁다.' },
  beast: { court: '부족 회의', judge: '부족장', forms: ['combat'], advocate: 0, bias: 3, foreign: 8, bribe: 0, sum: '부족장 앞에서 말로 다투다 안 되면 싸워서 가린다. 진 쪽이 배상한다.' },
};
export const lawOf = (place) => LAWS[realmOf(place)] ?? LAWS.leonia;
export const FORM_NAME = { court: '재판', combat: '결투 재판', ordeal: '신명 재판', truth: '진실의 주문' };

// 무엇을 두고 다투나: 이름, 벌금, 무거운 죄인가(낙인), 손해 배상
export const CHARGES = {
  theft: { name: '도둑질', fine: 24, heavy: true, pay: 20 },
  slander: { name: '모함', fine: 12, heavy: false, pay: 12 },
  debt: { name: '갚지 않은 빚', fine: 18, heavy: false, pay: 26 },
  land: { name: '땅 경계 다툼', fine: 10, heavy: false, pay: 18 },
  fraud: { name: '속임수 장사', fine: 20, heavy: true, pay: 22 },
  assault: { name: '폭행', fine: 22, heavy: true, pay: 16 },
  contract: { name: '계약 어김', fine: 16, heavy: false, pay: 24 },
  heresy: { name: '이단', fine: 30, heavy: true, pay: 0 },
  crime: { name: '죄', fine: 0, heavy: true, pay: 0 },
};

export const NAMES = ['오토', '한스', '베르타', '마르가', '클라우스', '루이제', '프리츠', '에바', '게르트', '안나', '디터', '힐다', '볼프', '로테', '쿠르트', '엘제'];
export const ADVOCATES = ['늙은 변론인 아우구스트', '혀가 빠른 변론인 레나', '법전을 외는 변론인 지몬', '이름난 변론인 콘스탄체'];
const BIG = ['leocast', 'eisen', 'solaris', 'serenia', 'barka', 'harfen', 'verden'];
export const bigTown = (pl) => BIG.includes(pl);
export const townOf = (pl) => (PLACES[pl]?.house ?? 0) > 0;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const skillWord = (v) => (v >= 70 ? '법전을 꿰고 있다' : v >= 40 ? '법정에서 말할 줄 안다' : v >= 15 ? '법을 조금 안다' : '');
export const stainWord = (v) => (v >= 60 ? '죄인의 집안으로 불린다' : v >= 30 ? '수군거림이 남았다' : v >= 10 ? '옛 판결을 기억하는 사람이 있다' : '');

export const LS = (g) => (g.law ??= fresh(g));
const freshRec = () => ({ won: 0, lost: 0, pleaded: 0, combat: 0, ordeal: 0, bribed: 0, judged: 0, witness: 0, lies: 0, pleas: 0, pardons: 0 });
export function fresh(g) {
  return { cases: [], grievances: [], skill: 0, stain: 0, perjury: [], rec: freshRec(), seq: 1, log: [], ruler: g?.realm?.ruler ?? null };
}
export function llog(g, text) {
  const S = LS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export const openCases = (g) => LS(g).cases.filter((c) => c.state === 'open');
export const caseById = (g, id) => LS(g).cases.find((c) => c.id === id) ?? null;

HOOKS.newGame.push((g) => { g.law = fresh(g); });
HOOKS.migrate.push((g) => {
  const S = LS(g), f = fresh(g);
  for (const k of Object.keys(f)) S[k] ??= f[k];
  S.rec = Object.assign(freshRec(), S.rec ?? {});
});
// 대를 이으면: 법을 아는 솜씨와 내 재판은 그 사람의 것이다. 집안의 낙인은 절반쯤 남아 자식에게 내려온다.
HOOKS.heir.push((g) => {
  const S = LS(g);
  S.skill = Math.floor(S.skill * 0.2);
  S.stain = Math.floor(S.stain * 0.5);
  S.cases = S.cases.filter((c) => c.state !== 'open');
  S.grievances = [];
  S.perjury = [];
  S.rec = freshRec();
});
