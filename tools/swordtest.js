import '../src/content.js';
// 검술 깊게 + 마검사(src/duel/, 43단계) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/swordtest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES, sceneQueued } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { makeRng } from '../src/rng.js';
import { takeJob } from '../src/jobs.js';
import { me, circleOf } from '../src/game.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
const t0 = Date.now();
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const samples = [];

function month(g, want = []) {
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = want.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (!a || g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) { if (bad(r.text)) fail('bad result', r); if (josa(r.text)) fail('josa result', r); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent;
    const out = resolveEvent(g, rngOf(g), rngOf(g).int(0, pe.choices.length - 1));
    if (bad(out)) fail('bad scene text', L(g).scene?.kind, pe.title, out);
  }
}
let BASE = null;
function adult(seed) {
  if (!BASE) {
    for (let k = 0; ; k++) {
      const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3501 + k * 977 });
      while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
      if (!g.over) { BASE = JSON.stringify(g); break; }
    }
  }
  const g = JSON.parse(BASE);
  g.rngState.s = seed | 0;
  return g;
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place]?.realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }

import { EVENTS } from '../src/events/core.js';
import { run as hooks } from '../src/hooks.js';
import { ENDS } from '../src/duel/registry.js';
import { startDuel, availableMoves } from '../src/duel/duel.js';
import { swordInfo, swordLine, swordState as S, hallState as H, mastersHere, schoolFits, SCHOOLS, SCHOOL_IDS } from '../src/duel/index.js';
import { refusedHere, formMul, bladeSpell, rankName } from '../src/duel/schools.js';
import { nextForm, famousHere } from '../src/duel/craft.js';
import { legend } from '../src/legends/state.js';

function setCircle(g, c) {
  const p = g.player; p.manaAwakened = c > 0; p.mana = 0; p.skills.magic = 0;
  for (let i = 0; i < 400 && circleOf(g) < c; i++) { p.mana += 5; p.skills.magic = Math.min(100, p.skills.magic + 1); }
}
function fresh(seed, pl, { sword = 20, school = null, rank = -1, money = 200, age = null } = {}) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = money;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  g.player.skills.sword = sword; g.player.manaAwakened = false; g.player.mana = 0;
  if (age) me(g).ageMonths = age * 12;
  g.sword = { school, rank, master: null, tests: 0 }; S(g);
  g.duelQueued = null; g.duel = null; L(g).renown = 0;
  return g;
}
const R = (g) => rngOf(g);
const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g) && availableActions(g).some((a) => a.id === id);
function direct(g, kind, data, key) {
  const def = SCENES[kind];
  const s = { kind, at: L(g).place, t: 0, ...data };
  if (def.need && !def.need(g, s)) return { skipped: true };
  const t = def.text(g, s), ch = def.choices(g, s), ti = def.title(g, s);
  if (bad(t) || bad(ti) || josa(t) || josa(ti) || ch.some((c) => bad(c.label) || josa(c.label))) fail('scene text', kind, ti, t, ch.map((c) => c.label));
  if (ch.length > 8) fail('too many choices', kind);
  if (!ch.some((c) => c.key === key)) return { missing: true, keys: ch.map((c) => c.key) };
  const out = def.resolve(g, R(g), s, key);
  if (bad(out) || josa(out)) fail('scene out', kind, key, out);
  if (g.player.money < 0) fail('negative money', kind, key);
  if (samples.length < 120) samples.push(`[${ti}] ${key} → ${out}`);
  return { out, s };
}
const checkInfo = (g, where) => {
  const s = JSON.stringify(swordInfo(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 300));
  const l = swordLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 120) samples.push(`(${id}) ${out}`); return out; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; hooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); checkInfo(g, 'adv'); } };
const clone = (g) => JSON.parse(JSON.stringify(g));
const drop = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const queued = (g, k) => sceneQueued(g, k);
const fakeDuel = (g) => ({ ctx: g.duelQueued.ctx, foe: g.duelQueued.foe, kind: g.duelQueued.kind });
// 결투를 끝까지 돌린다: pick(moves)가 고른 수로
function playDuel(g, pick) {
  let guard = 0, text = '';
  while (g.pendingEvent?.id === 'duel_round' && guard++ < 30) {
    const pe = g.pendingEvent;
    for (const c of pe.choices) if (bad(c) || josa(c)) fail('duel label', c);
    const moves = pe.choiceIdx.map((i) => ['heavy', 'quick', 'guard', 'feint', 'wait', 'magic', 'aura', 'yield'][i]);
    let k = moves.indexOf(pick(moves));
    if (k < 0) k = 0;
    const out = resolveEvent(g, R(g), k);
    if (bad(out) || josa(out)) fail('duel out', out);
    text += out + '\n';
  }
  drop(g);
  return text;
}

// 1. 유파 여덟, 종족에 따라 받아 주기
{
  if (SCHOOL_IDS.length < 8) fail('schools', SCHOOL_IDS.length);
  for (const id of SCHOOL_IDS) { const sc = SCHOOLS[id]; if (sc.forms.length !== 4 || !sc.secret || !sc.style || !sc.stat || !sc.motto || !sc.taunt || sc.train.length < 2) fail('school data', id); }
  const g = fresh(1, 'hammer');
  if (mastersHere(g).some((m) => m.school === 'moru')) fail('human weak gets moru');
  if (!refusedHere(g).includes('moru')) fail('refused list');
  g.player.stats.str = 50;
  if (!mastersHere(g).some((m) => m.school === 'moru')) fail('strong human refused moru');
  const d = fresh(2, 'hammer'); d.player.race = 'dwarf';
  if (!schoolFits(d, 'moru')) fail('dwarf moru');
  const h = fresh(3, 'solaris'); h.player.race = 'elf';
  if (schoolFits(h, 'seonghwi')) fail('elf seonghwi');
  checkInfo(g, 'start');
}

// 2. 입문 고르기 (여러 유파가 있는 곳) → 수련 → 초식
{
  const g = fresh(4, 'portel', { sword: 25 });
  if (!can(g, 'sword_school_join')) fail('join hidden at portel');
  runAct(g, 'sword_school_join');
  const ev = EVENTS.find((e) => e.id === 'sword_join');
  if (!ev.cond(g)) fail('join cond');
  const t = ev.text(g); if (bad(t) || josa(t)) fail('join text', t);
  const shown = ev.choices.filter((c) => !c.show || c.show(g));
  if (shown.length > 8 || shown.length < 3) fail('join choices', shown.length);
  const k = shown.findIndex((c) => typeof c.label === 'function' && c.label(g).startsWith('물결칼'));
  if (k < 0) fail('mulgyeol not offered', shown.map((c) => (typeof c.label === 'function' ? c.label(g) : c.label)));
  else { const out = shown[k].run(g, R(g)); if (bad(out) || josa(out)) fail('join out', out); samples.push(out); }
  if (S(g).school !== 'mulgyeol' || S(g).rank !== 0) fail('joined', S(g).school);
  runAct(g, 'sword_school_train');
  if (!can(g, 'sw_form')) fail('form hidden');
  runAct(g, 'sw_form');
  if (!S(g).forms.includes('mg1')) fail('form learned', S(g).forms);
  if (can(g, 'sw_form')) fail('form twice in 3 months');
  g.date.month = (g.date.month % 12) + 1; g.date.month = (g.date.month % 12) + 1; g.date.month = (g.date.month % 12) + 1; if (g.date.month <= 3) g.date.year++;
  if (can(g, 'sw_form')) fail('form need not enforced', nextForm(g)?.need);
  g.player.skills.sword = 40;
  if (!can(g, 'sw_form')) fail('2nd form hidden');
  checkInfo(g, 'forms');
  const info = swordInfo(g);
  if (info.forms.length !== 5 || !info.forms.some((f) => f.secret) || info.forms.filter((f) => f.learned).length !== 1) fail('info forms', info.forms);
  if (!info.school || info.ranks.length !== 5 || !info.aura) fail('info shape', info);
}

// 3. 결투: 초식 이름이 수에 붙고, 유파 수가 세고, 비전이 터진다
{
  for (const id of SCHOOL_IDS) {
    const g = fresh(10 + id.length, 'harfen', { sword: 70, school: id, rank: 3 });
    g.sword.forms = SCHOOLS[id].forms.map((f) => f.id); g.sword.secret = true;
    if (formMul(g, SCHOOLS[id].forms[0].move) <= 1) fail('formMul', id);
    let fired = false;
    for (let n = 0; n < 12 && !fired; n++) {
      const sec0 = SCHOOLS[id].secret.move;
      startDuel(g, R(g), { kind: 'spar', title: '시험', foe: { name: '허수아비 검객', skill: 60, style: { guard: 'swift', heavy: 'steady', quick: 'bold', feint: 'steady' }[sec0] } });
      const labels = g.pendingEvent.choices;
      const f = SCHOOLS[id].forms[3];
      if (!labels.some((l) => l.startsWith(f.name))) fail('form label', id, labels);
      const sec = SCHOOLS[id].secret.move;
      const text = playDuel(g, (moves) => { if (g.duel) { g.duel.mom = 3; g.duel.history = []; } return moves.includes(sec) ? sec : moves[0]; });
      if (/비전/.test(text)) fired = true;
    }
    if (!fired) fail('secret never fired', id);
  }
  // 맨손 유파는 무기를 안 탄다, 다른 유파는 탄다
  const a = fresh(20, 'fur', { sword: 50, school: 'balto', rank: 1 }), b = fresh(20, 'fur', { sword: 50, school: 'yusu', rank: 1 });
  if (a.life.gear) { a.life.gear.weapon = 20; b.life.gear.weapon = 20; }
}

// 4. 검기: 상급부터 수련, 검성이 되어야 칼날에 머문다. 마력 없이도 의지로
{
  const g = fresh(30, 'harfen', { sword: 60, school: 'yusu', rank: 2 });
  if (can(g, 'sw_aura')) fail('aura without mana or will');
  g.player.stats.wil = 82;
  if (!can(g, 'sw_aura')) fail('aura hidden for strong will');
  for (let i = 0; i < 40; i++) { runAct(g, 'sw_aura'); g.player.fatigue = 0; }
  if (S(g).aura !== 1) fail('aura capped at 1 under 검성', S(g).aura);
  g.sword.rank = 3;
  runAct(g, 'sw_aura');
  if (S(g).aura !== 2) fail('aura 2 at 검성', S(g).aura);
  startDuel(g, R(g), { kind: 'spar', title: '시험', foe: { name: '허수아비', skill: 20 } });
  if (!availableMoves(g).includes('aura')) fail('aura move by will');
  playDuel(g, (m) => (m.includes('aura') ? 'aura' : m[0]));
}

// 5. 승급 대련 → 의식 장면, 검성이면 칼이 운다
{
  const g = fresh(40, 'leocast', { sword: 82, school: 'ganggeom', rank: 2 });
  const out = ENDS.rank_test(g, R(g), true, { ctx: { rank: 3, masterId: null }, foe: { name: '사범' } });
  if (bad(out)) fail('rank end', out);
  if (S(g).rank !== 3 || S(g).aura < 2) fail('rank 3 aura', S(g));
  if (!queued(g, 'sw_rite')) fail('rite not queued');
  for (const key of ['bow', 'show', 'alone', 'blade']) { const r = direct(clone(g), 'sw_rite', { rank: 3 }, key); if (r.missing) fail('rite key', key, r.keys); }
  const lose = ENDS.rank_test(g, R(g), false, { ctx: { rank: 4, masterId: null }, foe: { name: '사범' } });
  if (S(g).rank !== 3 || bad(lose)) fail('rank lose');
}

// 6. 이름난 검객: 세상에 여덟 남짓, 도전하면 결투, 이기면 이름과 초식
{
  const g = fresh(50, 'hammer', { sword: 75, school: 'yusu', rank: 2 });
  if (H(g).famous.filter((f) => f.alive).length < 8) fail('famous count', H(g).famous.length);
  // 48단계: 죽은 마검사의 제자가 마검을 이으면 기록에 둘이 남는다. 살아 있는 마검사가 많아야 하나, 세상에 한 번은 있었어야 한다.
  if (H(g).famous.filter((f) => f.blade && f.alive).length > 1 || !H(g).famous.some((f) => f.blade)) fail('one spellblade famous');
  // 44단계: 주사위가 밀려 모루류 검객이 어른이 되기 전에 숨을 거둔 판이 나왔다. 살아 있는 걸로 세운다
  const f = H(g).famous.find((x) => x.school === 'moru'); f.place = 'hammer'; f.lastAt = -99; f.alive = true;
  if (!famousHere(g).length || !can(g, 'sw_challenge')) fail('challenge hidden');
  runAct(g, 'sw_challenge');
  if (g.duelQueued?.kind !== 'sw_famous') fail('famous duel not queued');
  const r0 = L(g).renown;
  g.player.skills.sword = 80;
  let learned = false;
  for (let i = 0; i < 6; i++) { const c = clone(g); const out = ENDS.sw_famous(c, makeRng({ s: i + 5 }), true, fakeDuel(c)); if (bad(out) || josa(out)) fail('famous out', out); if (S(c).forms.some((x) => x.startsWith('mr'))) learned = true; if (L(c).renown <= r0 || !S(c).fought.length) fail('famous win'); }
  if (!learned) fail('never learned foe form');
  const lo = ENDS.sw_famous(g, R(g), false, fakeDuel(g)); if (bad(lo)) fail('famous lose');
  if (can(g, 'sw_challenge')) fail('challenge twice in a year');
  // 검왕 레온
  const x = legend(g, 'leon');
  if (x) {
    x.at = 'hammer'; x.alive = true; g.sword.rank = 3; g.duelQueued = null;
    H(g).famous.forEach((y) => { y.lastAt = 9e9; });
    if (!can(g, 'sw_challenge')) fail('leon challenge hidden');
    runAct(g, 'sw_challenge');
    if (!g.duelQueued?.ctx.leon) fail('leon duel');
    const o = ENDS.sw_famous(clone(g), R(g), true, fakeDuel(g)); if (bad(o)) fail('leon out');
  }
}

// 7. 비전 청하기
{
  const g = fresh(60, 'eisen', { sword: 85, school: 'ganggeom', rank: 3 });
  if (can(g, 'sw_secret')) fail('secret without forms');
  g.sword.forms = SCHOOLS.ganggeom.forms.map((f) => f.id);
  if (!can(g, 'sw_secret')) fail('secret hidden');
  runAct(g, 'sw_secret');
  if (!queued(g, 'sw_secret')) fail('secret scene');
  drop(g);
  g.player.stats.wil = 95; g.player.skills.sword = 95;
  let got = 0;
  for (let i = 0; i < 6; i++) { const c = clone(g); c.rngState.s = i * 31; direct(c, 'sw_secret', {}, 'vigil'); if (S(c).secret) got++; }
  if (got < 2) fail('vigil too hard', got);
  const c = clone(g); direct(c, 'sw_secret', {}, 'duel');
  if (c.duelQueued?.kind !== 'sw_secret') fail('secret duel');
  ENDS.sw_secret(c, R(c), true, fakeDuel(c));
  if (!S(c).secret) fail('secret by duel');
  direct(clone(g), 'sw_secret', {}, 'wait');
}

// 8. 내 유파 세우기 → 도장 → 대를 넘어 남는다
{
  const g = fresh(70, 'harfen', { sword: 85, school: 'hwanyeong', rank: 3, age: 32 });
  L(g).renown = 30;
  if (!can(g, 'sw_found')) fail('found hidden');
  runAct(g, 'sw_found');
  const r = direct(g, 'sw_found', {}, 'n0');
  if (!H(g).own || g.player.money !== 100) fail('found', H(g).own, g.player.money);
  if (!rankName(g).startsWith(H(g).own.name)) fail('rank name house', rankName(g));
  drop(g);
  if (!can(g, 'sw_hall')) fail('hall hidden');
  const m0 = g.player.money; runAct(g, 'sw_hall'); if (g.player.money <= m0) fail('hall income');
  if (can(g, 'sw_found')) fail('found twice');
  adv(g, 12);
  if (H(g).own.pupils < 2) fail('pupils shrank at home', H(g).own.pupils);
  checkInfo(g, 'hall');
  // 대를 잇는다
  hooks('heir', g, R(g), null);
  if (H(g).own.mine || !H(g).own.headName) fail('heir own', H(g).own);
  if (S(g).rank !== -1) fail('heir sword reset');
  me(g).ageMonths = 14 * 12; placeAt(g, 'harfen'); g.swordJoinAt = -99;
  const ms = mastersHere(g);
  if (!ms.some((m) => m.house)) fail('house school not offered', ms.map((m) => m.who));
  g.swordJoinQueued = true;
  const ev = EVENTS.find((e) => e.id === 'sword_join');
  const shown = ev.choices.filter((c) => !c.show || c.show(g));
  const k = shown.findIndex((c) => typeof c.label === 'function' && c.label(g).startsWith(H(g).own.name));
  if (k < 0) fail('house choice'); else shown[k].run(g, R(g));
  if (!S(g).house || S(g).school !== 'hwanyeong') fail('joined house', S(g));
  if (!rankName(g).startsWith(H(g).own.name)) fail('heir rank name', rankName(g));
  checkInfo(g, 'heir');
}

// 9. 마검사: 상급+2서클+전투 주문, 둘 다 올라야 다음 단계
{
  const g = fresh(80, 'serenia', { sword: 60, school: 'yusu', rank: 2 });
  g.magic = { known: ['icebolt', 'purify'], certified: 0, exam: null, study: null, works: 0 };
  setCircle(g, 1);
  if (can(g, 'sw_blade')) fail('blade at circle 1');
  setCircle(g, 2);
  if (bladeSpell(g)?.id !== 'icebolt') fail('blade spell', bladeSpell(g));
  if (!can(g, 'sw_blade')) fail('blade hidden');
  for (let i = 0; i < 60; i++) { runAct(g, 'sw_blade'); g.player.fatigue = 0; }
  if (S(g).blade !== 1) fail('blade stuck at 1', S(g).blade);
  startDuel(g, R(g), { kind: 'spar', title: '시험', foe: { name: '허수아비', skill: 20 } });
  if (!g.pendingEvent.choices.some((c) => c.includes('얼음 화살') && c.includes('마검'))) fail('blade label', g.pendingEvent.choices);
  playDuel(g, (m) => (m.includes('magic') ? 'magic' : 'quick'));
  g.sword.rank = 3; setCircle(g, 3);
  for (let i = 0; i < 30; i++) { runAct(g, 'sw_blade'); g.player.fatigue = 0; }
  if (S(g).blade !== 2) fail('blade 2', S(g).blade);
  if (!g.chronicle.some((c) => /마검사/.test(c.text))) fail('blade chron');
  checkInfo(g, 'blade');
  if (!swordInfo(g).blade) fail('info blade');
}

// 10. 옛 저장: g.sword가 옛 모양이고 swordhall이 없어도
{
  const g = fresh(90, 'leocast');
  g.sword = { school: 'yusu', rank: 1, master: null, tests: 2 }; delete g.swordhall;
  hooks('migrate', g);
  checkInfo(g, 'old');
  if (!H(g).famous.length || !Array.isArray(S(g).forms)) fail('old save migrate');
  if (!g.sword.school || g.sword.rank !== 1) fail('old sword broken');
}

// 11. 플레이어 없이 60년: 이름난 검객이 늙어 죽고 제자가 잇는다, 도장 사범도 바뀐다
{
  const g = fresh(100, 'ern');
  mastersHere(fresh(101, 'hammer'));
  placeAt(g, 'hammer'); g.player.stats.str = 60; mastersHere(g); placeAt(g, 'ern');
  const names0 = H(g).famous.filter((f) => f.alive).map((f) => f.id).join();
  const c0 = g.chronicle.length;
  adv(g, 60 * 12);
  const alive = H(g).famous.filter((f) => f.alive);
  if (alive.length < 8) fail('famous died out', alive.length);
  if (alive.map((f) => f.id).join() === names0) fail('famous never changed');
  const n = g.chronicle.slice(c0).filter((c) => /검객|꺾었다/.test(c.text)).length;
  if (n < 3 || n > 80) fail('famous chronicle', n);
  if (verbose) console.log('famous chron', n, alive.map((f) => `${f.name}(${f.school} ${f.age})`).join(' '));
}

const ms = Date.now() - t0;
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `swordtest: ${problems} problems (${ms}ms)` : `swordtest ok (${ms}ms)`);
process.exit(problems ? 1 : 0);
