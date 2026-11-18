// 학원과 시험. 상태는 g.school 하나.
//   acad: 다니는 학원 { place, year(입학한 해), grade(학년 1~3), work(올해 수업 들은 칸), fails, scholar(장학생), away(학원 고장을 떠나 있던 달), state('enrolled') } | null
//   titles: 내가 딴 자격 { academy{ place, year, honors }, knight{ place, year }, official{ place, year, top }, master{ 갈래: { place, year } } }
//   exams[]: 본 시험 { kind, place, year, result('pass' | 'top' | 'fail' | 'caught'), how('honest' | 'cheat' | 'bribe'), trade }
//   tries{ kind: 떨어진 횟수 }   last{ kind: 마지막으로 본 해 }   ban{ kind: 이 달까지 시험을 못 본다 }
//   hidden[]: 들키지 않은 부정 { kind, at, place, how, trade }   (언젠가 드러날 수 있다)
//   alumni[]: 동문 { id, cls(어디서 함께였나), year, place, fate('rise' | 'fall' | 'plain'), fateAt, status(null | 'rose' | 'fell'), rival, helped, pleaded, with(그때의 나) }
//   parentAlumni[]: 부모의 동문 { id, parent }   seq, log[], reunionAt
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 학원: 왕도의 왕립 학원, 제국 아카데미, 성광 신학원 (마탑의 서클 시험과는 따로 간다)
//   fee: 한 해 수업료   pass: 입학 시험 문턱   gain: 수업에서 느는 것   finals: 학년 시험 문턱   strict: 한 번 떨어지면 내보낸다
export const ACADEMIES = {
  leocast: { name: '왕립 학원', fee: 30, pass: 34, finals: 40, gain: ['letters', 'int', 'cha'], noble: true, sum: '귀족 자제가 대부분이다. 평민은 장학생이 되어야 버틸 수 있다. 여기서 맺은 인연이 궁정까지 간다.' },
  eisen: { name: '제국 아카데미', fee: 40, pass: 38, finals: 45, gain: ['letters', 'int'], strict: true, sum: '집안을 묻지 않고 성적만 본다. 대신 학년 시험에 한 번만 떨어져도 내보낸다.' },
  solaris: { name: '성광 신학원', fee: 12, pass: 26, finals: 36, gain: ['letters', 'wil'], sum: '교단이 사제와 학자를 기르는 곳. 수업료는 싸지만 새벽 기도를 빼먹으면 회초리가 기다린다.' },
};

// 관리 시험이 열리는 곳
export const OFFICIAL = {
  leocast: { name: '왕국 관리 시험', pass: 42, sum: '두 해마다 왕도에서 열린다. 급제하면 궁정의 말석에 이름이 오른다. 장원이면 서기관 자리가 기다린다.' },
  eisen: { name: '제국 관리 시험', pass: 46, sum: '해마다 제도에서 열린다. 제국 관리 명부에 이름이 오르면 녹봉이 나오고, 어디서든 문이 열린다.' },
};

// 길드 장인 시험이 열리는 곳 (드워프 땅은 더 엄하다)
export const GUILD_TOWNS = { harfen: 0, leocast: 0, eisen: 2, barka: 0, portel: 0, hammer: 6, gorge: 6, solaris: 0 };
export const MASTER_TRADES = {
  smithing: { name: '대장장이', guild: '대장장이 조합', work: '칼 한 자루와 쟁기 날 하나', stat: 'str' },
  cooking: { name: '요리사', guild: '요리사 조합', work: '조합장들 앞에 올릴 다섯 접시', stat: 'sen' },
  herbs: { name: '약초사', guild: '약제사 조합', work: '해독제 한 병과 열내림 약 한 첩', stat: 'sen' },
  trade: { name: '상인', guild: '상인 조합', work: '한 해 장부와 큰 거래 하나', stat: 'cha' },
};

// 기사 서임 시험: 기사단이 있는 곳에서 견습 기사가 본다
export const KNIGHT_SEATS = { leocast: '레오니아 왕국 기사단', verden: '베르덴 백작 기사단' };

export const KIND_NAME = { academy: '학원 입학 시험', finals: '학년 시험', knight: '기사 서임 시험', official: '관리 시험', master: '장인 시험' };
// 시험관 매수 값
export const BRIBE_COST = { academy: 30, finals: 20, knight: 50, official: 60, master: 30 };

export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';

export const SS = (g) => (g.school ??= fresh());
export function fresh() {
  return { acad: null, titles: {}, exams: [], tries: {}, last: {}, ban: {}, hidden: [], alumni: [], parentAlumni: [], seq: 1, log: [], reunionAt: 0 };
}
export function slog(g, text) {
  const S = SS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export const enrolled = (g) => SS(g).acad?.state === 'enrolled';

HOOKS.newGame.push((g) => { g.school = fresh(); });
HOOKS.migrate.push((g) => {
  const S = SS(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
});
// 대를 이으면: 자격과 학적은 그 사람의 것이다. 부모의 동문은 "아버지(어머니)의 동문"으로 남는다.
HOOKS.heir.push((g) => {
  const S = SS(g);
  const ids = new Set(g.people.filter((p) => p.alive).map((p) => p.id));
  S.parentAlumni = S.alumni.filter((a) => ids.has(a.id)).slice(0, 4).map((a) => ({ id: a.id, parent: a.with ?? '', cls: a.cls, used: false }));
  S.alumni = [];
  S.acad = null;
  S.titles = {};
  S.exams = [];
  S.tries = {};
  S.last = {};
  S.ban = {};
  S.hidden = [];
});
