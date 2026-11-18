// 18단계: 학원과 시험. 왕도의 왕립 학원·제국 아카데미·성광 신학원 입학과 장학금, 학원 생활과 학년 시험,
// 기사 서임 시험, 관리 시험(장원이면 서기관), 길드 장인 시험, 커닝과 시험관 매수, 낙방과 재수, 같은 해 붙은 동문이 평생 얽히기.
// 마탑의 서클 시험(src/tower)과는 따로 간다. 화면용: schoolInfo(g), schoolLine(g)
import { SS, ACADEMIES, OFFICIAL, MASTER_TRADES, KNIGHT_SEATS, KIND_NAME, placeName, enrolled } from './state.js';
import './exams.js';
import './academy.js';
import './alumni.js';
import { examsHere } from './exams.js';
import { aliveAlumni } from './exams.js';
import { statusWord } from './alumni.js';
import { byId } from '../npc.js';

export { ACADEMIES, OFFICIAL, MASTER_TRADES, KNIGHT_SEATS };
export { examsHere, takeExam, addAlumni } from './exams.js';
export const schoolState = SS;

const RESULT = { pass: '붙었다', top: '수석으로 붙었다', fail: '떨어졌다', caught: '부정이 들켰다' };
const HOW = { honest: '', cheat: '부정', bribe: '매수' };
const examLabel = (e) => (e.kind === 'master' ? `${MASTER_TRADES[e.trade]?.guild ?? '조합'} 장인 시험` : e.kind === 'academy' ? `${ACADEMIES[e.place]?.name ?? '학원'} 입학 시험` : e.kind === 'official' ? OFFICIAL[e.place]?.name ?? '관리 시험' : e.kind === 'knight' ? '기사 서임 시험' : KIND_NAME[e.kind] ?? '시험');

// 내가 딴 자격들 (글)
export function schoolTitles(g) {
  const T = SS(g).titles, out = [];
  if (T.academy) out.push(`${ACADEMIES[T.academy.place]?.name ?? '학원'} ${T.academy.honors ? '수석 ' : ''}졸업 (${T.academy.year}년)`);
  if (T.knight) out.push(`${KNIGHT_SEATS[T.knight.place] ?? '기사단'} 서임 (${T.knight.year}년)`);
  if (T.official) out.push(`${OFFICIAL[T.official.place]?.name ?? '관리 시험'} ${T.official.top ? '장원' : '급제'} (${T.official.year}년)`);
  for (const [t, v] of Object.entries(T.master ?? {})) out.push(`${MASTER_TRADES[t]?.guild ?? '조합'} 장인 (${v.year}년)`);
  return out;
}

export function schoolInfo(g) {
  const S = SS(g), a = S.acad;
  return {
    academy: a ? {
      name: ACADEMIES[a.place]?.name ?? '학원', place: placeName(a.place), year: a.year, grade: a.grade,
      state: { enrolled: '다니는 중', graduated: '졸업', expelled: '쫓겨남', left: '그만둠' }[a.state] ?? '', scholar: !!a.scholar,
      work: a.work, fails: a.fails, fee: ACADEMIES[a.place]?.fee ?? 0,
    } : null,
    titles: schoolTitles(g),
    open: examsHere(g).map((e) => ({ name: e.label, why: e.why ?? null })),
    exams: S.exams.slice(-8).reverse().map((e) => ({ name: examLabel(e), place: placeName(e.place), year: e.year, result: RESULT[e.result] ?? '', how: HOW[e.how] ?? '' })),
    tries: Object.fromEntries(Object.entries(S.tries).map(([k, v]) => [KIND_NAME[k] ?? k, v])),
    alumni: aliveAlumni(g).map(({ a: x, p }) => ({ id: p.id, name: p.name, cls: x.cls, year: x.year, rival: !!x.rival, status: statusWord(x), affection: Math.round(p.affection ?? 0) })),
    parentAlumni: S.parentAlumni.map((x) => byId(g, x.id)).filter((p) => p && p.alive).map((p) => p.name),
    banned: Object.entries(S.ban).filter(([, v]) => v > g.date.year * 12 + g.date.month).map(([k]) => KIND_NAME[k] ?? k),
    log: S.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 학원, 자격, 동문
export function schoolLine(g) {
  const S = SS(g), out = [];
  if (enrolled(g)) out.push(`${ACADEMIES[S.acad.place]?.name ?? '학원'} ${S.acad.grade}학년${S.acad.scholar ? ' 장학생' : ''}`);
  const t = schoolTitles(g);
  if (t.length) out.push(t[0].replace(/ \(\d+년\)$/, ''));
  const n = aliveAlumni(g).length;
  if (n) out.push(`동문 ${n}명`);
  return out.join(' · ');
}
