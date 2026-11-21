import './lsshim.js';
import '../src/content.js';
// 27단계 도우미2 점검: 노아 실마리, 용의 참이름, 핏줄의 세월, 불로가 된 뒤의 삶, 스스로 고르는 죽음.
// 행동이 뜻 있는 형편에서만 보이는지, 장면마다 갈림길, 대 잇기, 옛 저장, 짧은 여러 삶.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { makePerson, byId, ageYears } from '../src/npc.js';
import { PLACES } from '../src/places.js';
import { crimeState } from '../src/crime.js';
import { realmState } from '../src/realms/index.js';
import { AG, makeAgeless, playerAgeless, agelessInfo } from '../src/ageless/core.js';
import { noahState, noahInfo, clueCount } from '../src/ageless/noah.js';
import { dragonnameState, dragonnameInfo } from '../src/ageless/dragonname.js';
import { bloodyearsState, bloodyearsInfo } from '../src/ageless/bloodyears.js';
import { afterState, afterInfo } from '../src/ageless/after.js';
import { farewellState, farewellInfo } from '../src/farewell/index.js';
import { DS } from '../src/dragon/state.js';
import { SS } from '../src/seal/state.js';
import { startOutbreak } from '../src/health/world.js';
import { regionOf } from '../src/nature/state.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['noah_archive', 'noah_seek', 'dragonname_study', 'dragonname_call', 'bloodyears_rite', 'after_rename', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern', sex } = {}) {
  const g = newGame({ name: '바우', sex: sex ?? (seed % 2 ? 'm' : 'f'), familyId: 'farmer', mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = place; L(g).home = 'family';
  const R = realmState(g); R.cur = PLACES[place]?.realm ?? 'leonia'; R.last = place;
  g.player.money = 300; g.player.familyMoney = 300;
  homePlace.set(g, place);
  return g;
}
function person(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: (opts.age ?? 28) * 12, job: opts.job ?? 'farmer', sex: opts.sex });
  p.known = true; p.place = opts.place ?? homePlace.get(g) ?? 'ern'; p.affection = opts.aff ?? 20; p.childIds ??= []; g.people.push(p);
  return p;
}
const idxOf = (re) => (pe) => Math.max(0, pe.choices.findIndex((c) => re.test(c)));
function resolveAll(g, pick = {}) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    seen.scenes[kind] = (seen.scenes[kind] ?? 0) + 1;
    ok(!bad(pe.title) && !bad(pe.text) && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (typeof pick[kind] === 'function') idx = pick[kind](pe);
    else if (pick[kind] != null) idx = Math.min(pick[kind], pe.choices.length - 1);
    if (kind === 'heir') idx = 0;
    const out = resolveEvent(g, rngOf(g), idx);
    ok(!bad(typeof out === 'string' ? out : ''), `bad outcome ${kind}: ${out}`);
    ok(g.player.money >= 0, `money ${g.player.money} after ${kind}`);
    if (/^(noah|dragonname|bloodyears|after|farewell)_/.test(kind) && samples.length < 34 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
  }
}
function settle(g) {
  const pl = homePlace.get(g);
    if (pl && !crimeState(g).jailed) { L(g).place = pl; L(g).travel = null; }
}
function play(g, months, prefer = ACTS, pick = {}, rate = 0.5) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id) && !a.needsTarget);
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel'));
      if (g.player.fatigue > 85) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) {
      ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
      if (/노아|고대어|세월|이름을 바꾸/.test(r.name ?? '') && samples.length < 34 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`);
    }
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
    resolveAll(g, pick);
  }
}
function scene(g, kind, data, pick) {
  for (let t = 0; t < 3; t++) {
    resolveAll(g);
    settle(g);
    const n0 = seen.scenes[kind] ?? 0;
    L(g).queue = L(g).queue.filter((x) => x.kind === kind);
    queueScene(g, kind, data, { first: true });
    play(g, 1, ['rest'], { [kind]: pick }, 1);
    if ((seen.scenes[kind] ?? 0) > n0) return true;
  }
  return false;
}
function act(g, id, pick = {}) {
  for (let t = 0; t < 3; t++) {
    resolveAll(g); settle(g);
    if (!availableActions(g).some((a) => a.id === id)) continue;
    const n0 = seen.acts[id] ?? 0;
    play(g, 1, [id], pick, 1);
    if ((seen.acts[id] ?? 0) > n0) return true;
  }
  return false;
}
const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `${path}.${k}=${v}`); } };
const checkInfo = (g) => { walk(noahInfo(g), 'noah'); walk(dragonnameInfo(g), 'dname'); walk(bloodyearsInfo(g), 'blood'); walk(afterInfo(g), 'after'); walk(farewellInfo(g), 'farewell'); walk(agelessInfo(g), 'ageless'); };
const has = (g, id) => { resolveAll(g); settle(g); return availableActions(g).some((a) => a.id === id); };
function strong(g) { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 45); g.player.skills.letters = 50; g.player.skills.sword = 40; }
function kid(g, age = 22) {
  const p = person(g, { age, job: 'farmer' });
  me(g).childIds.push(p.id); p.fatherId = me(g).id;
  return p;
}
const dead = (g) => !!L(g).pendingDeath || g.over;

// 0) 평범한 삶에는 새 행동이 없다
{
  const g = adult(1, { place: 'serenia' }); strong(g);
  for (const id of ['noah_archive', 'noah_seek', 'dragonname_study', 'dragonname_call', 'bloodyears_rite', 'after_rename']) ok(!has(g, id), `plain shows ${id}`);
}

// 1) 노아 실마리
{
  const g = adult(10, { place: 'serenia' }); strong(g);
  (g.flags ??= {}).noah_word = true; play(g, 1, ['rest'], {}, 1);
  ok(noahState(g).clues.voice, 'voice clue');
  ok(has(g, 'noah_archive'), 'archive with one clue');
  let got = false;
  for (let t = 0; t < 6 && !got; t++) { noahState(g).archiveAt = -99; act(g, 'noah_archive'); got = !!noahState(g).clues.letter; }
  ok(got, 'letter clue');
  ok(!has(g, 'noah_seek'), 'no seek outside graubel');
  L(g).place = 'graubel'; homePlace.set(g, 'graubel');
  ok(!has(g, 'noah_seek'), 'no seek with 2 clues');
  scene(g, 'noah_sighting', {}, idxOf(/늙은이/));
  ok(clueCount(g) >= 3, 'three clues');
  ok(has(g, 'noah_seek'), 'seek at graubel');
  let met = false;
  for (let t = 0; t < 8 && !met && !dead(g); t++) {
    noahState(g).seekAt = -99;
    act(g, 'noah_seek', { noah_journey: idxOf(/혼자/), noah_meet: idxOf(/늙지 않는/) });
    resolveAll(g, { noah_journey: idxOf(/혼자/), noah_meet: idxOf(/늙지 않는/) });
    play(g, 1, ['rest'], { noah_journey: idxOf(/혼자/), noah_meet: idxOf(/늙지 않는/) }, 1);
    met = !!noahState(g).met;
  }
  ok(met || dead(g), 'met noah');
  if (met) ok(noahState(g).hints.dragon && noahState(g).hints.blood, 'hints');
  checkInfo(g);
  const r = adult(11);
  if (r.relic?.r?.rl_ring) { r.relic.r.rl_ring.holder = 'me'; play(r, 1, ['rest'], {}, 1); ok(noahState(r).clues.ring, 'ring clue'); }
}

// 2) 용의 참이름
{
  const g = adult(20, { place: 'serenia' }); strong(g);
  ok(!has(g, 'dragonname_study'), 'no study unheard');
  noahState(g).hints.dragon = 2000; play(g, 1, ['rest'], {}, 1);
  ok(dragonnameState(g).heard, 'heard');
  ok(has(g, 'dragonname_study'), 'study available');
  for (let t = 0; t < 12 && dragonnameState(g).frags < 3; t++) { dragonnameState(g).studyAt = -99; act(g, 'dragonname_study'); }
  ok(dragonnameState(g).frags >= 1, `frags ${dragonnameState(g).frags}`);
  L(g).place = 'gorge'; homePlace.set(g, 'gorge');
  scene(g, 'dragonname_tablet', {}, idxOf(/베낀다/));
  dragonnameState(g).frags = 5;
  const D = DS(g).dragons; D.ash.known = 1; D.ash.state = 'sleep';
  ok(has(g, 'dragonname_call'), 'call available');
  act(g, 'dragonname_call', { dragonname_call: idxOf(/물러난/) }); resolveAll(g, { dragonname_call: idxOf(/물러난/) });
  let made = 0, failed = 0;
  for (let t = 0; t < 10; t++) {
    const k = adult(30 + t, { place: 'gorge' }); strong(k);
    noahState(k).hints.dragon = 2000; dragonnameState(k).heard = true; dragonnameState(k).frags = 5;
    const d = DS(k).dragons; d.ash.known = 1; d.ash.state = 'sleep'; d.frost.known = 1; d.frost.state = 'sleep';
    scene(k, 'dragonname_call', { dragon: 'ash' }, idxOf(/끝까지/));
    if (playerAgeless(k)) { made++; ok(AG(k).path === 'dragonname', 'path set'); ok(!has(k, 'dragonname_call'), 'no call when ageless'); }
    else if (dragonnameState(k).failed.includes('ash')) failed++;
    checkInfo(k);
  }
  ok(made >= 2 && failed >= 1, `dragon call made ${made} failed ${failed}`);
}

// 3) 핏줄의 세월
{
  const g = adult(50, { age: 48 }); strong(g);
  ok(!has(g, 'bloodyears_rite'), 'no rite unknown');
  scene(g, 'bloodyears_offer', {}, idxOf(/배운다/));
  ok(bloodyearsState(g).known, 'learned');
  ok(!has(g, 'bloodyears_rite'), 'no rite without grown kid');
  const c = kid(g, 24); const a0 = c.ageMonths;
  ok(has(g, 'bloodyears_rite'), 'rite available');
  act(g, 'bloodyears_rite', { bloodyears_rite: idxOf(/받는다/) }); resolveAll(g, { bloodyears_rite: idxOf(/받는다/) });
  if (!playerAgeless(g)) scene(g, 'bloodyears_rite', {}, idxOf(/받는다/));
  ok(playerAgeless(g) && AG(g).path === 'bloodyears', 'bloodyears ageless');
  ok(c.ageMonths >= a0 + 120, 'kid aged');
  ok(checkInfo(g) || true, 'info');
  bloodyearsState(g).due = 0; play(g, 1, ['rest'], { bloodyears_due: idxOf(/받는다/) }, 1); resolveAll(g, { bloodyears_due: idxOf(/받는다/) });
  ok(playerAgeless(g) && c.ageMonths >= a0 + 240, 'took again');
  bloodyearsState(g).due = 0; play(g, 1, ['rest'], { bloodyears_due: idxOf(/더는/) }, 1); resolveAll(g, { bloodyears_due: idxOf(/더는/) });
  ok(!playerAgeless(g) && AG(g).lost.length === 1, 'stopped taking');
  // 자식이 없으면 저절로 풀린다
  const h = adult(51, { age: 50 }); bloodyearsState(h).known = true; const k2 = kid(h, 30);
  scene(h, 'bloodyears_rite', {}, idxOf(/받는다/));
  k2.alive = false; bloodyearsState(h).due = 0; play(h, 1, ['rest'], {}, 1);
  ok(!playerAgeless(h), 'no kids loses');
}

// 4) 불로가 된 뒤
{
  const g = adult(60, { place: 'harfen' }); strong(g);
  makeAgeless(g, 'dragonname');
  ok(!has(g, 'after_rename'), 'no rename early');
  AG(g).since -= 12 * 20;
  ok(has(g, 'after_rename'), 'rename after 20 years');
  const n0 = g.player.name;
  act(g, 'after_rename');
  ok(g.player.name !== n0 && AG(g).names.some((x) => x.name === n0), 'renamed');
  ok(g.secret?.alias?.name === g.player.name || !g.secret, 'secret alias');
  ok(!has(g, 'after_rename'), 'rename resets');
  afterState(g).rumor = 45; afterState(g).rumorSeen = false; afterState(g).sceneAt = -99;
  scene(g, 'after_rumor', {}, idxOf(/숙부/));
  for (const [who, re] of [['church', /답한다/], ['crown', /궁정/], ['church', /사라진다/], ['crown', /잡아뗀다/]]) {
    const k = adult(61 + who.length + re.source.length, { place: 'leocast' }); makeAgeless(k, 'dragonname');
    scene(k, 'after_hunted', { who }, idxOf(re));
    checkInfo(k);
  }
  // 먼저 떠나보내기
  const f = adult(70); makeAgeless(f, 'bloodyears'); const c = kid(f, 30);
  play(f, 1, ['rest'], {}, 1);
  ok(afterState(f).watch.some((x) => x.id === c.id), 'watching kin');
  c.alive = false;
  play(f, 1, ['rest'], { after_farewell: idxOf(/적어/) }, 1); resolveAll(f, { after_farewell: idxOf(/적어/) });
  ok(afterState(f).gone.some((x) => x.name === c.name), 'farewell recorded');
  ok(seen.scenes.after_farewell > 0, 'farewell scene');
  checkInfo(f);
}

// 5) 스스로 고르는 죽음
{
  // 뒤를 막기
  const g = adult(80); strong(g);
  g.army = g.army ?? {}; const camp = () => ({ key: 'w', name: '북쪽 전쟁', kind: 'war', foe: null, month: 1, months: 4, morale: 50, marched: [] });
  g.army.campaign = camp();
  scene(g, 'farewell_rearguard', {}, idxOf(/남아서/));
  ok(farewellState(g).past.some((x) => x.kind === 'rearguard'), 'rearguard chosen');
  const back = adult(81); back.army = back.army ?? {}; back.army.campaign = camp();
  scene(back, 'farewell_rearguard', {}, idxOf(/물러난/));
  ok(!farewellState(back).past.length && farewellState(back).refused === 1, 'rearguard declined');
  // 쐐기
  const w = adult(82, { place: 'leocast' }); SS(w).wedges.leocast = 'cracked';
  scene(w, 'farewell_wedge', { wedge: 'leocast' }, idxOf(/묶는다/));
  ok(SS(w).wedges.leocast === 'whole' && farewellState(w).past.some((x) => x.kind === 'wedge'), 'wedge bound');
  // 역병
  let died = 0, lived = 0;
  for (let t = 0; t < 8; t++) {
    const p = adult(90 + t, { place: 'harfen' });
    startOutbreak(p, 'plague', regionOf('harfen'), 0.8, rngOf(p));
    scene(p, 'farewell_plague', { sick: '흑사병' }, idxOf(/남아서/));
    if (farewellState(p).past.length) died++; else if (farewellState(p).stayed) lived++;
  }
  ok(died >= 1 && lived >= 1, `plague died ${died} lived ${lived}`);
  // 명예
  const h = adult(100); h.army = h.army ?? {}; h.army.captive = { by: '발하르트군', months: 1, ransom: 50, officer: false, war: 'bandits' };
  scene(h, 'farewell_honor', {}, idxOf(/밀어/));
  ok(farewellState(h).past.some((x) => x.kind === 'honor'), 'honor chosen');
  const s = adult(101); s.army = s.army ?? {}; s.army.captive = { by: '발하르트군', months: 1, ransom: 50, officer: false, war: 'bandits' };
  scene(s, 'farewell_honor', {}, idxOf(/짚는다/));
  ok(!s.army.captive && !farewellState(s).past.length, 'signed and freed');
  // 불로를 내려놓기
  const a = adult(110); makeAgeless(a, 'dragonname');
  scene(a, 'farewell_letgo', {}, idxOf(/남은 세월/));
  ok(!playerAgeless(a) && AG(a).lost.length === 1, 'let go and age');
  const e = adult(111); makeAgeless(e, 'dragonname');
  scene(e, 'farewell_letgo', {}, idxOf(/삶을 마친다/));
  ok(farewellState(e).past.some((x) => x.kind === 'letgo'), 'let go and end');
  // 죽음 뒤 대 잇기: 남은 사람들의 기록
  const d = adult(120, { age: 40 }); kid(d, 18); d.army = d.army ?? {}; d.army.campaign = camp();
  scene(d, 'farewell_rearguard', {}, idxOf(/남아서/));
  play(d, 3, ['rest'], {}, 1);
  ok(!farewellState(d).last, 'after record written on heir');
  ok(farewellState(d).log.some((x) => /다리/.test(x.text)), 'heir sees what was left');
  checkInfo(d);
}

// 6) 옛 저장
{
  const o = adult(130); for (const k of ['noah', 'afterlife', 'farewell']) delete o[k]; runHooks('migrate', o);
  ok(o.noah?.clues && o.afterlife?.gone && o.farewell?.past, 'old save');
}

// 7) 짧은 여러 삶
let lives = 0;
for (let run = 0; run < 5; run++) {
  const g = adult(1000 + run, { age: 30 + run * 5, place: ['serenia', 'graubel', 'gorge', 'harfen', 'leocast'][run] }); strong(g);
  if (run % 2 === 0) makeAgeless(g, run === 0 ? 'dragonname' : 'bloodyears');
  noahState(g).hints.dragon = 2000;
  const start = L(g).gen ?? 1;
  play(g, 12 * 25, ACTS, {}, 0.35);
  if ((L(g).gen ?? 1) > start) lives++;
  checkInfo(g);
}
for (let run = 0; run < 3; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6300 + run });
  play(g, 12 * 30, ['work', 'rest'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['noah_archive', 'noah_seek', 'dragonname_study', 'dragonname_call', 'bloodyears_rite', 'after_rename']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['noah_sighting', 'noah_journey', 'noah_meet', 'dragonname_tablet', 'dragonname_call', 'bloodyears_offer', 'bloodyears_rite', 'bloodyears_due', 'after_rumor', 'after_hunted', 'after_farewell', 'farewell_rearguard', 'farewell_wedge', 'farewell_plague', 'farewell_honor', 'farewell_letgo']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => /^(noah|dragonname|bloodyears|after)_/.test(k)))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => /^(noah|dragonname|bloodyears|after|farewell)_/.test(k)))));
console.log(`대를 이은 삶 ${lives}/5`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `farewelltest: ${fail} 실패` : 'farewelltest: 통과');
process.exit(fail ? 1 : 0);
