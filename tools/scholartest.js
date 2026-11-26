import './lsshim.js';
import '../src/content.js';

// 달마다 기세와 바깥 마을, 대 잇기, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId, bodyAgeOf, ageYears } from '../src/npc.js';
import { playerPower } from '../src/adventure/combat.js';
import { encodeSave, decodeSave } from '../src/save.js';

const T0 = Date.now();
SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])|\(으\)|을\(를\)|이\(가\)/;
const BAD0 = /undefined|NaN|\[object/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = typeof e.text === 'function' ? e.text(g, ctx) : e.text;
  check(!BAD.test(text), `${id} 본문: ${text}`);
  const shown = e.choices.map((c, i) => [c, i]).filter(([c]) => !c.show || c.show(g, ctx));
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(([c]) => c.label), choiceIdx: shown.map(([, i]) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  if (process.env.SHOW) console.log(`[${id}] ${text}\n  > ${out}`);
  return out;
};
const grown = (g, y) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); if (process.env.SHOW) console.log(`[${id}] > ${out}`); return out; };
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
  if (process.env.SHOW) console.log(`[${kind}/${key}] ${g.pendingEvent?.text ?? ""}\n  > ${out}`);
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
import { PS, nations, relOf, shiftRel, pactOf, addPact, dropPact, warOf } from '../src/politics/state.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { scholarInfo, scholarLine } from '../src/scholar/index.js';
import { SS, fresh, LIBS, SCHOOLS, HIST, BEASTS, KIND, noteKey, needOf, myBooks, liveBooks, bookById } from '../src/scholar/state.js';
import { makeBook, scholarYear, seed, GEO_PLACES } from '../src/scholar/world.js';
import { topics, censorRisk } from '../src/scholar/life.js';
import { PLACES } from '../src/places.js';

// 47단계 학자의 길 점검 (도우미스레드3). 1분 안.
const mk = (seed = 47) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const adult = (seed = 47, place = 'leocast') => { const g = mk(seed); grown(g, 22); stay(g, place); g.player.skills.letters = 30; g.player.stats.int = 45; g.player.injuries = []; L(g).queue = []; return g; };
const textOK = (arr, what) => { for (const t of arr) check(typeof t === 'string' && !BAD.test(t), `${what}: ${t}`); };
const runMonthHooks = (g) => { for (const f of HOOKS.afterMonth) f(g, makeRng({ s: 2 })); };

// 1. 처음 세상: 대학자 넷, 옛 책, 서고와 고장이 맞는다
{
  const g = mk(1), S = SS(g);
  check(S.seeded && S.greats.length === 4 && S.greats.every((x) => SCHOOLS[x.school] && x.alive), `대학자 넷 ${JSON.stringify(S.greats)}`);
  check(S.books.length >= 10 && S.books.every((b) => KIND[b.kind] && LIBS[b.where] && b.title && !BAD.test(b.title)), '옛 책들');
  textOK(S.books.flatMap((b) => b.wrong.map((w) => w.text)), '틀린 말');
  for (const [pl, l] of Object.entries(LIBS)) check(PLACES[pl] && l.fields.length && (!l.lean || SCHOOLS[l.lean]), `서고 ${pl}`);
  for (const s of Object.values(SCHOOLS)) check(LIBS[s.home] && SCHOOLS[s.rival], `학파 ${s.name}`);
  for (const b of Object.values(BEASTS)) for (const pl of b.at) check(PLACES[pl], `짐승 고장 ${pl}`);
  for (const pl of GEO_PLACES) check(PLACES[pl], `지리 고장 ${pl}`);
}

// 2. 서고에서 읽기: 서고 있는 고장, 글 아는 사람에게만
{
  const g = adult(2, 'ern');
  check(!has(g, 'sc_read'), '서고 없는 마을에선 읽기 없음');
  stay(g, 'leocast');
  check(has(g, 'sc_read'), '왕도 서고에서 읽기');
  g.player.skills.letters = 0; g.player.stats.int = 20;
  check(!has(g, 'sc_read'), '글 모르면 읽기 없음');
  g.player.skills.letters = 30;
  const S = SS(g), l0 = S.lore;
  for (let i = 0; i < 8; i++) act(g, 'sc_read', i + 1);
  check(S.lore > l0 + 10 && Object.keys(S.notes).length >= 3 && S.read.length >= 1, `읽으면 학식·자료·읽은 책 (${S.lore}, ${Object.keys(S.notes)}, ${S.read})`);
  // 자료를 넉넉히 모은 주제의 책을 읽으면 틀린 곳을 알아챈다
  const b = makeBook(g, makeRng({ s: 3 }), { kind: 'history', subj: 'seal', by: '시험 학자', school: 'record', skill: 50, material: 0, where: 'leocast' });
  S.notes[noteKey('history', 'seal')] = 9; S.read = S.read.filter((x) => x !== b.id);
  for (const x of liveBooks(g)) if (x !== b) S.read.push(x.id);
  for (let i = 0; i < 20 && !S.spotted[b.id]; i++) act(g, 'sc_read', 40 + i);
  check(S.spotted[b.id] >= 1 && b.wrong.some((w) => w.me), '읽다가 틀린 곳을 알아챈다');
}

// 3. 서고 일: 필사공 → 사서 → 사서장, 자리를 오래 비우면 잃는다
{
  const g = adult(3), S = SS(g);
  check(has(g, 'sc_job') && !has(g, 'sc_copy'), '일자리 구하기');
  act(g, 'sc_job');
  check(S.job?.rank === 0 && has(g, 'sc_copy') && !has(g, 'sc_job'), '필사공');
  const m0 = g.player.money;
  S.lore = 50;
  for (let i = 0; i < 40; i++) act(g, 'sc_copy', i);
  check(g.player.money > m0 + 100 && S.job.rank === 2, `품삯과 승진 (${g.player.money - m0}, ${S.job.rank})`);
  stay(g, 'harfen');
  for (let i = 0; i < 5; i++) runMonthHooks(g);
  check(!S.job, '자리를 오래 비우면 일을 잃는다');
}

// 4. 답사: 짐승 사는 고장, 학식이 조금 있어야
{
  const g = adult(4, 'kalten'), S = SS(g);
  check(!has(g, 'sc_survey'), '학식 없으면 답사 없음');
  S.lore = 20;
  check(has(g, 'sc_survey'), '답사');
  act(g, 'sc_survey');
  check(Object.keys(S.notes).some((k) => k.startsWith('n:')) && Object.keys(S.notes).some((k) => k === 'g:kalten') && !has(g, 'sc_survey'), `답사 자료 ${Object.keys(S.notes)}`);
}

// 5. 책 쓰기: 고르기 → 원고 → 마치기. 자료가 모자라면 틀린 말이 남는다
const writeBook = (g, subjKey, finish = 'library', seed = 5) => {
  const S = SS(g);
  act(g, 'sc_write', seed);
  const i = topics(g).findIndex((t) => noteKey(t.kind, t.subj) === subjKey);
  scene(g, 'sc_plan', i >= 0 ? `t${i}` : 't0', seed);
  for (let k = 0; k < 20 && S.draft && !queued(g, 'sc_finish'); k++) act(g, 'sc_draft', seed + k);
  return scene(g, 'sc_finish', finish, seed);
};
{
  const g = adult(5), S = SS(g);
  check(!has(g, 'sc_write'), '자료 없으면 쓰기 없음');
  S.lore = 30; S.notes['h:leo'] = 1;
  check(has(g, 'sc_write'), '쓰기');
  let errLow = 0, errHigh = 0;
  const keys = ['library', 'anon', 'patron', 'copies'];
  for (let i = 0; i < 16; i++) {
    g.player.money = 100;
    S.notes = { 'h:leo': i % 2 ? 9 : 0 }; S.notes['h:leo'] ||= 1;
    const out = writeBook(g, 'h:leo', keys[i % 4], 10 + i);
    const b = myBooks(g).at(-1);
    check(b && b.mine && b.pid === g.player.id && out.length > 10, `책이 나왔다 ${out}`);
    if (i % 2) errHigh += b.wrong.filter((w) => !w.flatter).length; else errLow += b.wrong.filter((w) => !w.flatter).length;
    if (keys[i % 4] === 'anon') check(b.by === '이름 없는 학자', '이름 숨김');
    if (keys[i % 4] === 'patron') check(b.flatter && b.wrong.some((w) => w.flatter), '후원자 책엔 듣기 좋은 거짓');
  }
  check(errLow > errHigh + 6, `자료가 모자라면 틀린 말이 많다 (${errLow} / ${errHigh})`);
  // 지리서·박물지도
  S.notes = { 'g:kalten': 3 }; writeBook(g, 'g:kalten', 'library', 51);
  check(myBooks(g).at(-1).kind === 'geography' && myBooks(g).at(-1).realmAt, '지리서');
  S.notes = { 'n:griffin': 2 }; writeBook(g, 'n:griffin', 'library', 52);
  check(myBooks(g).at(-1).kind === 'nature', '박물지');
  // 남의 책 틀린 곳을 알아챈 주제로 쓰면 반박이 된다
  const foe = makeBook(g, makeRng({ s: 9 }), { kind: 'history', subj: 'estella', by: '남의 학자', school: 'field', skill: 50, material: 0, where: 'leocast' });
  foe.wrong[0].me = true; S.notes = { 'h:estella': 9 };
  const f0 = S.fame;
  writeBook(g, 'h:estella', 'library', 53);
  check(foe.wrong[0].found?.me && myBooks(g).at(-1).refutes === foe.id && S.fame > f0, '반박서');
}

// 6. 옛 글 옮기기: 유적 고대어를 읽기만 한다
{
  const g = adult(6, 'serenia'), S = SS(g);
  check(!has(g, 'sc_translate'), '고대어 모르면 번역 없음');
  g.ruins = { ...(g.ruins ?? {}), tongue: 60, read: 4, pieces: { starroom: 3 } };
  check(has(g, 'sc_translate'), '번역');
  act(g, 'sc_translate');
  check(S.draft?.kind === 'tongue' && S.draft.subj === 'arcana' && g.ruins.tongue === 60, '번역 원고, 고대어는 그대로');
  for (let k = 0; k < 20 && !queued(g, 'sc_finish'); k++) act(g, 'sc_draft', k);
  scene(g, 'sc_finish', 'library');
  check(myBooks(g).at(-1)?.kind === 'tongue' && /아르카나/.test(myBooks(g).at(-1).title), `옛 글 옮김 ${myBooks(g).at(-1)?.title}`);
}

// 7. 학파와 검열
{
  const g = adult(7), S = SS(g);
  S.lore = 25;
  runMonthHooks(g);
  check(queued(g, 'sc_school'), '서고에서 학파의 부름');
  scene(g, 'sc_school', 'join');
  check(S.school === 'record', '기록 학파에 들었다');
  // 회색 탑 학파 박물지를 성당 서고에 내면 검열관이 온다
  for (const key of ['revise', 'smuggle', 'defy', 'accept']) {
    S.school = 'tower'; stay(g, 'solaris'); L(g).queue = [];
    S.notes = { 'n:undead': 4 }; S.lore = 40;
    writeBook(g, 'n:undead', 'library', 70);
    const b = myBooks(g).at(-1);
    check(censorRisk(g, b) === 'church' && S.watch?.id === b.id, `검열 볼 책 ${key}`);
    g.date.year += 1; runMonthHooks(g);
    check(queued(g, 'sc_censor'), '검열관 장면');
    scene(g, 'sc_censor', key, 71);
    if (key === 'revise') check(!b.banned, '고치면 남는다');
    if (key === 'accept') check(b.banned === 'holy', '받아들이면 금서');
    if (key === 'smuggle') check(b.banned && liveBooks(g).some((x) => x.title === b.title && x.where === 'barka'), '바르카로 빼돌린 사본');
  }
}

// 8. 논쟁·강의·제자·서고의 사건
{
  const g = adult(8), S = SS(g);
  S.lore = 50; S.school = 'record'; S.fame = 50;
  check(cond(g, 'sc_debate'), '논쟁 조건');
  const foe = makeBook(g, makeRng({ s: 4 }), { kind: 'geography', subj: 'harfen', by: '길 위의 학자', school: 'field', skill: 40, material: 0, where: 'scholae' });
  foe.wrong[0].me = true;
  for (let c = 0; c < 4; c++) fire(g, 'sc_debate', c, 20 + c);
  check(foe.wrong[0].found?.me && S.me.debated === 4, '논쟁에서 틀린 곳을 짚는다');
  check(has(g, 'sc_lecture'), '강의');
  for (let i = 0; i < 30; i++) { delete S.lectAt; act(g, 'sc_lecture', i); }
  check(S.pupils.length >= 2, `제자 ${S.pupils.length}`);
  S.job = { lib: 'leocast', rank: 1, prog: 5, since: 0, away: 0 };
  const ban = myBooks(g)[0] ?? makeBook(g, makeRng({ s: 5 }), { kind: 'history', subj: 'leo', by: '누군가', skill: 40, material: 3, where: 'leocast' });
  ban.banned = 'leonia'; ban.where = 'leocast';
  check(cond(g, 'sc_secretcopy'), '금서 필사 의뢰 조건');
  for (let c = 0; c < 3; c++) { S.job ??= { lib: 'leocast', rank: 1, prog: 5, since: 0, away: 0 }; fire(g, 'sc_secretcopy', c, 30 + c); }
  stay(g, 'ern'); S.lore = 20;
  check(cond(g, 'sc_elder'), '노인의 옛이야기 조건');
  fire(g, 'sc_elder', 0); fire(g, 'sc_elder', 1);
  // 제자들의 앞날: 오르거나, 스승을 반박하거나
  const t = makeBook(g, makeRng({ s: 6 }), { kind: 'history', subj: 'tower', by: g.player.name, pid: g.player.id, mine: true, school: 'record', skill: 50, material: 0, where: 'leocast' });
  for (let y = 0; y < 12; y++) { g.date.year += 1; g.date.month = 1; scholarYear(g); }
  check(S.pupils.some((p) => p.fate), '제자의 앞날이 정해진다');
  void t;
}

// 9. 대학자, 대 잇기, 저장 왕복
{
  const g = adult(9), S = SS(g);
  S.lore = 80; S.fame = 60; S.school = 'field';
  for (let i = 0; i < 2; i++) { const b = makeBook(g, makeRng({ s: i }), { kind: 'nature', subj: 'griffin', by: g.player.name, pid: g.player.id, mine: true, school: 'field', skill: 90, material: 9, where: 'scholae' }); b.esteem = 60; }
  runMonthHooks(g);
  check(S.great === g.date.year && S.greats.some((x) => x.pid === g.player.id), '대학자');
  check(scholarInfo(g).great && /대학자/.test(scholarLine(g)), '대학자 줄');
  const back = decodeSave(encodeSave(g));
  check(back.scholar?.great === S.great && back.scholar.books.length === S.books.length, '저장 왕복');
  delete back.scholar.me.surveyed; delete back.scholar.standing;
  for (const f of HOOKS.migrate) f(back);
  check(back.scholar.me.surveyed === 0 && back.scholar.standing.record > 0, '예전 저장에 새 칸');
  const old = mk(32); delete old.scholar; for (const f of HOOKS.migrate) f(old);
  check(old.scholar?.seeded && old.scholar.greats.length === 4, '아주 예전 저장에도 학자들');
  const nBooks = S.books.length, pid = g.player.id;
  for (const f of HOOKS.heir) f(g, makeRng({ s: 1 }), g.player);
  check(S.lore <= 12 && !S.school && !S.great && S.books.length === nBooks, '대를 이으면 사람 몫만 새로');
  // 자식이 서고에서 선대의 책을 만난다
  S.read = []; S.lore = 10;
  const anc = myBooks(g).find((b) => b.pid === pid && !b.lost); anc.where = 'leocast'; anc.pid = -1; // 선대가 쓴 책으로
  for (const x of liveBooks(g)) if (x !== anc) S.read.push(x.id);
  let met = false;
  for (let i = 0; i < 30 && !met; i++) met = /선대가 쓴/.test(act(g, 'sc_read', 100 + i));
  check(met, '선대의 책');
}

// 10. 화면 정보 모양
{
  const g = adult(10), S = SS(g);
  S.lore = 45; S.school = 'tower'; S.job = { lib: 'leocast', rank: 1, prog: 3, since: 0, away: 0 }; S.draft = { kind: 'nature', subj: 'wyvern', prog: 2, need: 6, by: g.player.id };
  makeBook(g, makeRng({ s: 1 }), { kind: 'nature', subj: 'wolf', by: g.player.name, pid: g.player.id, mine: true, school: 'tower', skill: 50, material: 1, where: 'serenia' });
  S.read = liveBooks(g).filter((b) => !b.mine).slice(0, 3).map((b) => b.id);
  S.pupils = [{ name: '요하나', y: 500, fate: 'rise' }];
  const v = scholarInfo(g);
  for (const k of ['lore', 'loreWord', 'rank', 'school', 'job', 'wrote', 'read', 'pupils', 'great', 'log']) check(k in v, `정보에 ${k}`);
  check(v.school.name && v.school.rival && v.job.name === '사서' && v.draft.prog > 0, '학파·일자리·원고');
  for (const b of [...v.wrote, ...v.read]) check(['name', 'kind', 'y', 'author', 'where', 'copies', 'lost', 'banned', 'wrong', 'readers'].every((k) => k in b), `책 줄 ${JSON.stringify(b)}`);
  const js = JSON.stringify(v).replace(/:null/g, ':0'); check(!BAD.test(js), `정보 글 ${js.match(BAD)}`);
}

// 11. 무플레이 백 년: 책이 쌓이고, 금서·불·틀린 곳 짚기·대학자 교대가 굴러가고 너무 많아지지 않는다
{
  const g = mk(11), S = SS(g);
  const said = [];
  for (let y = 0; y < 100; y++) { g.date.year += 1; g.date.month = 1; scholarYear(g, (t) => said.push(t)); }
  const found = S.books.reduce((a, b) => a + b.wrong.filter((w) => w.found).length, 0);
  check(S.books.length >= 30 && S.books.length <= 90, `책 수 ${S.books.length}`);
  check((S.tally.banned ?? 0) >= 1 && found >= 10, `금서 ${S.tally.banned}, 짚인 틀린 곳 ${found}`);
  check(S.greats.filter((x) => x.alive).length >= 2 && S.greats.length > 4, '대학자가 나고 진다');
  textOK(said, '세상 소식'); textOK(S.log.map((x) => x.text), '학자 기록');
  if (process.env.SHOW) console.log(JSON.stringify(S.tally), S.books.length, found, said.length);
}

// 12. 짧은 플레이: 왕도에서 학자로 두 해, 달 넘김이 깨지지 않는다
{
  const g = adult(12), S = SS(g);
  S.lore = 35; S.notes = { 'h:feud': 3, 'g:leocast': 2 };
  for (let m = 0; m < 24 && !g.over; m++) {
    const acts = availableActions(g).map((a) => a.id);
    const want = ['sc_draft', 'sc_write', 'sc_copy', 'sc_job', 'sc_read'].filter((id) => acts.includes(id));
    endMonth(g, Array.from({ length: slotsFor(g) }, (_, i) => ({ id: want[i % Math.max(1, want.length)] ?? 'rest' })));
    let k = 0;
    while (g.pendingEvent && k++ < 6) {
      const pick = /무엇을 쓸까|책을 마쳤다/.test(g.pendingEvent.title) ? 0 : g.pendingEvent.choices.length - 1;
      const out = resolveEvent(g, rngOf(g), pick);
      check(typeof out === 'string' && !BAD.test(out), `플레이 글 ${out}`);
    }
  }
  check(S.me.read >= 3 && S.me.copied >= 3 && S.me.wrote >= 1, `두 해 동안 학자로 살았다 ${JSON.stringify(S.me)}`);
}

console.log(fail ? `실패 ${fail}` : '학자의 길 점검 모두 통과', `${((Date.now() - T0) / 1000).toFixed(1)}초`);
process.exit(fail ? 1 : 0);
