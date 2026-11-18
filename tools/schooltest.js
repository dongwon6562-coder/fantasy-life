import './lsshim.js';
import '../src/content.js';
// 학원과 시험 점검: 처음 상태, 학원 입학과 장학금, 학원 생활과 졸업, 학년 시험 낙방과 퇴학, 떠나 있음, 수업료,
// 기사 서임 시험, 관리 시험과 궁정 자리, 길드 장인 시험, 커닝과 매수(들킴·재판·숨은 부정이 드러남), 동문의 앞날과 사건, 대 잇기, 예전 저장, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { courtState } from '../src/court/index.js';
import { takeJob } from '../src/jobs.js';
import { schoolState, schoolInfo, schoolLine, schoolTitles, examsHere } from '../src/school/index.js';
import { exposeText } from '../src/school/alumni.js';

SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = e.text(g, ctx);
  check(!BAD.test(text) && typeof e.title === 'string', `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: e.choices.map((c) => c.label), choiceIdx: e.choices.map((c, i) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 35); g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); return out; };
const scene = (g, kind, key, seed = 5) => {
  let s;
  if (L(g).scene?.kind === kind && g.pendingEvent?.id === 'life_scene') s = L(g).scene;
  else {
    const q = L(g).queue, i = q.findIndex((x) => x.kind === kind);
    if (i < 0) { check(false, `장면 ${kind}이 대기열에 없다`); return ''; }
    [s] = q.splice(i, 1);
    g.pendingEvent = null; L(g).scene = null;
    if (!showScene(g, s, { force: true })) { check(false, `장면 ${kind}을 띄우지 못했다`); return ''; }
  }
  check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title), `${kind} 글: ${g.pendingEvent.title} / ${g.pendingEvent.text}`);
  const idx = key == null ? 0 : s.choices.findIndex((c) => c.key === key);
  check(idx >= 0, `${kind}에 선택지 ${key}가 없다 (${s.choices.map((c) => c.key)})`);
  const out = resolveEvent(g, makeRng({ s: seed }), Math.max(0, idx));
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
const month = (g) => { for (const p of g.people) if (p.alive) p.ageMonths += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; runHooks('afterMonth', g, makeRng({ s: 2 })); };
const child = (g, ageY) => { const p = makePerson(makeRng({ s: ageY + 40 }), { sex: 'f', ageMonths: ageY * 12, lastName: '아이' }); p.place = L(g).place; p.alive = true; g.people.push(p); byId(g, g.player.id).childIds.push(p.id); p.motherId = g.player.id; return p; };
const fresh = (seed, name = '학생', fam = 'merchant') => newGame({ name, sex: 'm', familyId: fam, mode: 'free', seed });



const setStats = (g, v) => { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; };
const young = (seed, place = 'leocast', fam = 'merchant') => { const g = fresh(seed, '학생', fam); grown(g, 17); stay(g, place); g.player.money = 300; g.player.familyMoney = 0; setStats(g, 45); g.player.skills.letters = 45; return g; };
const takeIt = (g, examKey, how = 'honest', seed = 5) => {
  stay(g, L(g).place);
  queueScene(g, 'school_exam', { place: L(g).place });
  scene(g, 'school_exam', examKey, seed);
  return scene(g, 'school_take', how, seed);
};
const at = (g, mo) => { g.date.month = mo; };

// 1) 처음
{
  const g = fresh(1801);
  check(!!g.school && g.school.acad === null && g.school.alumni.length === 0, '처음 상태');
  check(!BAD.test(JSON.stringify(schoolInfo(g)).replace(/null/g, '0')), '처음 화면 정보');
  check(schoolLine(g) === '', '처음 한 줄');
  check(!has(g, 'school_exam'), '아이는 시험을 못 본다');
}
// 2) 학원 입학: 정직하게, 붙으면 수업료를 내고 동기 셋
{
  const g = young(1802);
  check(examsHere(g).some((e) => e.kind === 'academy' && !e.why), '왕도에서 학원 입학 시험이 열린다');
  check(has(g, 'school_exam'), '시험 보기 행동');
  act(g, 'school_exam');
  check(queued(g, 'school_exam'), '시험 공고 장면');
  L(g).queue = [];
  const before = g.player.money;
  takeIt(g, 'academy');
  const S = schoolState(g);
  check(S.acad?.state === 'enrolled' && S.acad.place === 'leocast', `입학: ${JSON.stringify(S.acad)}`);
  check(S.alumni.length === 3 && S.alumni.every((a) => byId(g, a.id)?.known), '동기 셋');
  check(S.acad.scholar || g.player.money <= before - 30, '수업료');
  check(!has(g, 'school_exam') || !examsHere(g).some((e) => e.kind === 'academy'), '다니는 동안 입학 시험은 없다');
  check(has(g, 'school_study'), '학원 수업 행동');
  check(/1학년/.test(act(g, 'school_study')) && S.acad.work === 1, '수업');
  check(/왕립 학원 1학년/.test(schoolLine(g)), `한 줄: ${schoolLine(g)}`);
}
// 3) 장학생: 어린 시절 추천서, 성적이 높으면
{
  const g = young(1803); g.flags.child_recommend = true; g.player.money = 2;
  takeIt(g, 'academy');
  check(schoolState(g).acad?.scholar === true && g.flags.child_recommend === 'used', '추천서로 장학생');
  const h = young(1804); h.player.money = 2; h.player.skills.letters = 10; h.player.stats.int = 30;
  let ok = 0;
  for (let i = 0; i < 6; i++) { const k = young(1810 + i); k.player.money = 2; takeIt(k, 'academy', 'honest', 30 + i); if (k.school.exams.at(-1)?.result === 'pass' && !k.school.acad) ok++; }
  check(ok >= 1, `붙고도 수업료가 없으면 못 들어간다 (${ok})`);
  takeIt(h, 'academy', 'honest', 7);
  check(h.school.exams.at(-1)?.result === 'fail' && h.school.tries.academy === 1, '모자라면 떨어진다');
  check(examsHere(h).find((e) => e.kind === 'academy')?.why === '올해는 이미 보았다', '한 해에 한 번');
  h.date.year += 1;
  check(!examsHere(h).find((e) => e.kind === 'academy')?.why, '다음 해에 재수');
}
// 4) 학원 생활: 학년 시험 셋을 넘기면 졸업, 궁정 이름값
{
  const g = young(1805); takeIt(g, 'academy');
  const S = schoolState(g); S.acad.scholar = true;
  const cs0 = courtState(g).standing;
  for (let y = 0; y < 3; y++) {
    S.acad.work = 10; at(g, 5); g.date.year = S.acad.year + 1 + y;
    month(g);
    check(queued(g, 'school_finals'), `${y + 1}학년 시험이 온다`);
    stay(g, 'leocast');
    scene(g, 'school_finals', 'honest', 40 + y);
  }
  check(S.acad.state === 'graduated' && !!S.titles.academy, `졸업: ${JSON.stringify(S.acad)}`);
  check(courtState(g).standing > cs0, '왕립 학원 졸업은 궁정 이름값');
  check(schoolTitles(g).length === 1 && /왕립 학원/.test(schoolTitles(g)[0]), '자격');
  check(!has(g, 'school_study'), '졸업하면 수업이 없다');
}
// 5) 학년 시험 낙방: 두 번이면 쫓겨나고, 제국 아카데미는 한 번이면
{
  const g = young(1806); takeIt(g, 'academy');
  const S = schoolState(g); S.acad.scholar = true;
  for (let i = 0; i < 2; i++) { S.acad.work = 0; g.player.skills.letters = 0; g.player.stats.int = 0; S.acad.lastFinals = null; queueScene(g, 'school_finals', {}); scene(g, 'school_finals', 'honest', 50 + i); }
  check(S.acad.state === 'expelled' && S.acad.fails === 2, `두 번 떨어지면 쫓겨난다 ${JSON.stringify(S.acad)}`);
  const e = young(1807, 'eisen'); e.player.skills.letters = 60; setStats(e, 60); takeIt(e, 'academy');
  check(e.school.acad?.place === 'eisen', '제국 아카데미 입학');
  e.school.acad.work = 0; e.player.skills.letters = 0; e.player.stats.int = 0;
  queueScene(e, 'school_finals', {}); scene(e, 'school_finals', 'honest', 60);
  check(e.school.acad.state === 'expelled', '제국 아카데미는 한 번이면 끝');
}
// 6) 떠나 있으면 학적이 지워지고, 학년 시험을 빼먹으면 낙방
{
  const g = young(1808); takeIt(g, 'academy');
  L(g).place = 'ern';
  for (let i = 0; i < 5; i++) month(g);
  check(schoolState(g).acad.state === 'left', '다섯 달 떠나 있으면 학적이 지워진다');
  const h = young(1809); takeIt(h, 'academy'); h.school.acad.scholar = true; h.school.acad.year -= 1;
  at(h, 8); month(h);
  check(h.school.acad.fails === 1 && h.school.acad.state === 'enrolled', '학년 시험을 빼먹으면 낙방 하나');
}
// 7) 수업료: 내기, 장학금 청하기, 그만두기
{
  const g = young(1811); takeIt(g, 'academy'); const A = schoolState(g).acad; A.scholar = false; A.paidYear = A.year;
  g.date.year = A.year; at(g, 12); month(g);
  check(queued(g, 'school_fee'), '새해 수업료');
  stay(g, 'leocast'); g.player.money = 100;
  scene(g, 'school_fee', 'pay');
  check(A.paidYear === g.date.year && g.player.money === 70, '수업료를 냈다');
  const h = young(1812); takeIt(h, 'academy'); const B = h.school.acad; B.scholar = false; B.paidYear = B.year; h.date.year = B.year + 1; h.player.money = 0; h.player.skills.letters = 90; h.player.stats.cha = 90; B.work = 10;
  queueScene(h, 'school_fee', {}); scene(h, 'school_fee', 'ask');
  check(B.scholar === true, '장학금을 청해 받는다');
  const q = young(1813); takeIt(q, 'academy'); const Q = q.school.acad; Q.scholar = false; Q.paidYear = Q.year; q.date.year = Q.year + 1;
  queueScene(q, 'school_fee', {}); scene(q, 'school_fee', 'quit');
  check(Q.state === 'left', '그만둔다');
}
// 8) 기사 서임 시험
{
  const mk = (seed, v) => { const g = young(seed, 'leocast', 'fallen_knight'); grown(g, 3); stay(g, 'leocast'); L(g).fac.knights = { member: true, order: 'leocast', rank: 1, merit: 100 }; takeJob(g, 'knight'); setStats(g, v); g.player.skills.sword = v; return g; };
  const g = mk(1814, 90);
  check(examsHere(g).some((e) => e.kind === 'knight' && !e.why), '견습 기사는 서임 시험을 본다');
  takeIt(g, 'knight');
  check(L(g).fac.knights.rank === 2 && g.player.title === '경' && !!schoolState(g).titles.knight, `서임 ${JSON.stringify(L(g).fac.knights)}`);
  check(schoolState(g).alumni.filter((a) => a.cls === '서임').length === 2, '같은 날 서임받은 동기');
  let fails = 0;
  for (let i = 0; i < 4; i++) { const k = mk(1820 + i, 15); k.player.skills.sword = 40; takeIt(k, 'knight', 'honest', 70 + i); if (k.school.tries.knight) fails++; }
  check(fails >= 3, `약하면 떨어진다 (${fails}/4)`);
  const v = mk(1825, 90); stay(v, 'verden');
  check(!examsHere(v).some((e) => e.kind === 'knight'), '내 기사단이 아닌 곳에서는 못 본다');
}
// 9) 관리 시험: 짝수 해에만, 급제하면 궁정 자리
{
  const g = young(1830); g.player.skills.letters = 95; setStats(g, 95);
  if (g.date.year % 2) g.date.year += 1;
  takeIt(g, 'official');
  const T = schoolState(g).titles.official;
  check(!!T, `관리 시험 급제 ${JSON.stringify(schoolState(g).exams)}`);
  check(queued(g, 'school_appoint'), '급제자 자리');
  scene(g, 'school_appoint', 'yes');
  check(courtState(g).office >= 0 && L(g).job?.id === 'courtier', `궁정 관직 ${courtState(g).office}`);
  const o = young(1831); o.player.skills.letters = 95; if (o.date.year % 2 === 0) o.date.year += 1;
  check(/짝수 해/.test(examsHere(o).find((e) => e.kind === 'official')?.why ?? ''), '홀수 해에는 열리지 않는다');
  const e = young(1832, 'eisen'); e.player.skills.letters = 95; setStats(e, 95); const m0 = e.player.money;
  takeIt(e, 'official');
  check(!!e.school.titles.official && e.player.money > m0, '제국 관리 시험은 녹봉');
}
// 10) 길드 장인 시험
{
  const g = young(1840, 'harfen'); grown(g, 5); stay(g, 'harfen'); g.player.skills.smithing = 75; g.player.money = 100;
  const f0 = g.craft?.fame?.smithing ?? 0;
  check(examsHere(g).some((e) => e.kind === 'master' && e.trade === 'smithing'), '대장장이 조합 장인 시험');
  takeIt(g, 'master:smithing');
  check(!!schoolState(g).titles.master?.smithing && g.player.money === 80, `장인 ${JSON.stringify(schoolState(g).exams)}`);
  check((g.craft?.fame?.smithing ?? 0) > f0, '장인이 되면 이름값');
  const d = young(1841, 'hammer'); grown(d, 5); stay(d, 'hammer'); d.player.skills.smithing = 50; setStats(d, 30);
  takeIt(d, 'master:smithing', 'honest', 9);
  check(d.school.exams.at(-1)?.result === 'fail', '드워프 땅은 엄하다');
  const n = young(1842, 'harfen'); grown(n, 5); stay(n, 'harfen'); n.player.money = 5; n.player.skills.cooking = 70;
  queueScene(n, 'school_exam', { place: 'harfen' }); scene(n, 'school_exam', 'master:cooking');
  check(L(n).scene?.kind === 'school_take' && !L(n).scene.choices.some((c) => c.key === 'honest'), '응시료가 없으면 들어가지 못한다');
}
// 11) 부정과 매수: 들키면 몇 해 금지, 뇌물이 죄인 나라에서는 재판, 통하면 숨은 부정
{
  let caughtN = 0, passN = 0;
  for (let i = 0; i < 12; i++) { const g = young(1850 + i); g.player.stats.sen = 0; g.player.stats.agi = 0; takeIt(g, 'academy', 'cheat', 80 + i); if (g.school.exams.at(-1)?.result === 'caught') caughtN++; else passN++; }
  check(caughtN >= 1 && passN >= 1, `커닝은 들키기도 하고 통하기도 한다 (${caughtN}/${passN})`);
  const g = young(1870); g.player.stats.sen = 0; g.player.stats.agi = 0;
  let k = 0; for (; k < 30 && g.school.exams.at(-1)?.result !== 'caught'; k++) { g.school.last = {}; g.school.acad = null; takeIt(g, 'academy', 'cheat', 200 + k); }
  check(g.school.exams.at(-1)?.result === 'caught' && g.school.ban.academy > g.date.year * 12, '들키면 시험 금지');
  check(/년 동안/.test(examsHere(g).find((e) => e.kind === 'academy')?.why ?? ''), '금지 까닭');
  const v = young(1871, 'eisen'); v.player.skills.letters = 0; setStats(v, 10); v.player.money = 500;
  let trial = false;
  for (let i = 0; i < 20 && !trial; i++) { v.school.last = {}; v.school.ban = {}; v.school.acad = null; takeIt(v, 'academy', 'bribe', 300 + i); trial = L(v).queue.some((s) => s.kind === 'law_trial'); }
  check(trial, '제국에서 매수가 들키면 법정에 선다');
  const b = young(1872, 'barka'); b.player.money = 500; b.player.skills.trade = 50; grown(b, 5); stay(b, 'barka'); b.player.money = 500;
  let hid = false;
  for (let i = 0; i < 20 && !hid; i++) { b.school.last = {}; b.school.ban = {}; takeIt(b, 'master:trade', 'bribe', 400 + i); hid = b.school.hidden.length > 0; }
  check(hid && !!b.school.titles.master?.trade, '자유도시에서는 매수가 잘 통한다');
  const text = exposeText(b, b.school.hidden[0]);
  check(!BAD.test(text) && !b.school.titles.master?.trade, `드러나면 자격을 잃는다: ${text}`);
}
// 12) 동문의 앞날과 사건들
{
  const g = young(1880); takeIt(g, 'academy'); grown(g, 6); stay(g, 'leocast');
  const S = schoolState(g);
  S.alumni[0].fate = 'rise'; S.alumni[0].rival = false; S.alumni[1].fate = 'fall'; S.alumni[2].fate = 'plain'; S.alumni[2].rival = true;
  for (const a of S.alumni) a.fateAt = 0;
  for (const a of S.alumni) { const p = byId(g, a.id); p.affection = 20; }
  byId(g, S.alumni[2].id).affection = -10;
  month(g);
  check(S.alumni[0].status === 'rose' && S.alumni[1].status === 'fell' && !S.alumni[2].status, `동문의 앞날 ${S.alumni.map((a) => a.status)}`);
  check(cond(g, 'school_alum_help'), '출세한 동문');
  const m0 = g.player.money; const cs0 = courtState(g).standing;
  fire(g, 'school_alum_help', 0);
  check(S.alumni[0].helped && (g.player.money > m0 || courtState(g).standing > cs0), '도움을 받는다');
  check(cond(g, 'school_alum_plea'), '몰락한 동문');
  g.player.money = 50; fire(g, 'school_alum_plea', 0);
  check(g.player.money === 30 && S.alumni[1].pleaded, '은화를 내준다');
  check(cond(g, 'school_alum_rival'), '옛 맞수');
  fire(g, 'school_alum_rival', 1);
  S.reunionAt = -999; S.alumni.forEach((a) => { a.year -= 5; });
  check(cond(g, 'school_reunion'), '동문회');
  fire(g, 'school_reunion', 0);
  check(S.reunionAt === g.date.year * 12 + g.date.month, '동문회에 갔다');
  check(schoolInfo(g).alumni.length === 3 && !BAD.test(JSON.stringify(schoolInfo(g)).replace(/null/g, '0')), '화면의 동문');
}
// 13) 대 잇기: 자격은 사라지고, 부모의 동문이 찾아온다
{
  const g = young(1890); takeIt(g, 'academy'); schoolState(g).titles.knight = { place: 'leocast', year: 500 };
  runHooks('heir', g, makeRng({ s: 1 }));
  const S = schoolState(g);
  check(!S.acad && !Object.keys(S.titles).length && S.alumni.length === 0 && S.parentAlumni.length === 3 && S.parentAlumni[0].parent === '학생', '대를 이으면');
  check(cond(g, 'school_parent_alum'), '부모의 동문');
  fire(g, 'school_parent_alum', 0);
  check(S.parentAlumni.some((x) => x.used), '부모의 동문이 도왔다');
}
// 13-2) 시골에서 듣는 시험 공고: 왕도로 가는 길
{
  const g = young(1893, 'ern'); g.player.skills.letters = 25; g.date.year += g.date.year % 2 ? 0 : 1;
  check(cond(g, 'school_call'), '시골에서 학원 공고를 듣는다');
  fire(g, 'school_call', 1);
  check(L(g).queue.some((s) => s.kind === 'travel' && s.to === 'leocast') || L(g).scene?.kind === 'travel', '왕도로 가는 길');
}
// 14) 예전 저장
{
  const g = young(1895); delete g.school;
  runHooks('migrate', g, makeRng({ s: 1 }));
  check(!!g.school && Array.isArray(g.school.alumni) && g.school.acad === null, '예전 저장을 채운다');
}
// 15) 40년 플레이
{
  let years = 0, exams = 0, alums = 0;
  const seen = {};
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 1897 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('school_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.6) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
    }
    years += m / 12; exams += schoolState(g).exams.length; alums += schoolState(g).alumni.length;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of schoolState(g).log) if (BAD.test(l.text)) { check(false, `학원 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    check(!BAD.test(JSON.stringify(schoolInfo(g)).replace(/null/g, '0')) && !BAD.test(schoolLine(g)), '화면 정보에 이상한 값');
  }
  console.log(`학원과 시험 ${Math.round(years)}년 4판 플레이, 시험 ${exams}번, 동문 ${alums}명, 장면 ${Object.keys(seen).filter((k) => k.startsWith('school_')).join(',')}`);
  check(exams > 0, '40년 동안 시험을 한 번도 안 봤다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
