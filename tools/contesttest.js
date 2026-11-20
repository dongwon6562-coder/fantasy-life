import '../src/content.js';
// 내기와 겨루기(src/contest/)를 브라우저 없이 돌려 보는 점검.
// 1) 도박판: 주사위(작게·크게), 카드, 속임수(들키면 출입 금지), 고리대금 빚으로 걸기, 돈이 없을 때, 노름 버릇과 참지 못하는 밤.
// 2) 투기장: 직접 싸움(결투 끝맺음), 짐승 싸움, 내기, 져 주기, 이름값이 오르면 상대가 세짐.
// 3) 고장 대회: 활쏘기·마상 시합·씨름·사냥, 세 판, 심판 매수, 내기, 결승에서 져 주기, 우승 기록.
// 4) 승부 조작이 들통남, 출입 금지, 대 잇기, 옛 저장, 장면이 뜬 뒤 돈이 바뀌어도 음수가 되지 않음, 저절로 살아 보기.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES, travelMonths } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { addAnimal } from '../src/beasts/index.js';
import { alive, beastPow } from '../src/beasts/core.js';
import { E as estate } from '../src/estate/core.js';
import { ENDS } from '../src/duel/registry.js';
import { C, contestStatus, FAIRS, FAIR_IDS, fairHere, tierOf, bannedAt } from '../src/contest/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const seen = { scenes: {} };
const samples = [];

function month(g, want = [], pick = null) {
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
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
        if (pe.choices.length > 8) fail('too many choices', s?.kind, pe.choices.length);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^contest_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^contest_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = contestStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
  if (!(C(g).itch >= 0 && C(g).itch <= 100)) fail('bad itch', C(g).itch);
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'merchant') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (l.job?.id === 'soldier') l.job = null; if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }
const heal = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; };
function scene(g, kind, data, re, opt = {}) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    opt.each?.(g); // 장면이 뜰 때까지 형편(전쟁·흉년)을 붙잡아 둔다
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, opt.want ?? ['rest'], (k, labels) => { if (k !== kind) return opt.other?.(k, labels) ?? -1; done = true; const i2 = idxOf(labels, re); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, JSON.stringify(data), L(g).place, playerAge(g), JSON.stringify(L(g).queue.map((q) => q.kind)));
  if (done && !chose && !g.over) fail('choice not found', kind, re, JSON.stringify(data));
  return chose;
}

// 장면을 직접 풀어 본다: 뜬 뒤에 돈이 0이 되어도 음수가 되면 안 된다
function drained(g, kind, data) {
  const def = SCENES[kind];
  const s = { kind, at: L(g).place, t: 0, ...data };
  g.player.money = 300;
  const keys = def.choices(g, s).map((c) => c.key);
  def.text(g, s);
  for (const k of keys) {
    const s2 = { ...s };
    g.player.money = 0;
    const out = def.resolve(g, rngOf(g), s2, k);
    if (bad(out)) fail('drained bad text', kind, k, out);
    if (g.player.money < 0) fail('drained negative money', kind, k, g.player.money);
    g.player.money = 300;
  }
  return keys;
}

/* 1) 도박판 */
{
  const g = adult(91000);
  placeAt(g, 'harfen');
  g.player.money = 500;
  if (!availableActions(g).some((a) => a.id === 'contest_gamble')) fail('no gamble action at harfen');
  for (const re of [/주사위에 은화 10닢/, /주사위에 은화 50닢/, /카드판/, /고리대금업자/, /일어선다/]) { heal(g); g.player.money = Math.max(g.player.money, 300); scene(g, 'contest_gamble', {}, re); }
  if (!estate(g).loans.some((l) => l.lender === 'shark')) fail('gamble loan not recorded');
  if (C(g).games < 3) fail('games not counted', C(g).games);
  let caught = false;
  for (let i = 0; i < 25 && !caught && !g.over; i++) { placeAt(g, 'harfen'); heal(g); g.player.money = 300; scene(g, 'contest_gamble', {}, /바꿔치기/); caught = bannedAt(g, 'gamble', 'harfen'); }
  if (!caught) fail('cheat never caught');
  else if (availableActions(g).some((a) => a.id === 'contest_gamble') && L(g).place === 'harfen') fail('banned but still can gamble');
  // 돈이 없으면 일어서는 것만
  placeAt(g, 'verden'); g.player.money = 0; L(g).home = 'inn';
  const s0 = { kind: 'contest_gamble', at: 'verden' };
  const labels = SCENES.contest_gamble.choices(g, s0).map((c) => c.label);
  if (labels.some((l) => /건다|카드|바꿔/.test(l) && !/빌려/.test(l))) fail('broke but can bet', labels);
  const keys = drained(g, 'contest_gamble', {});
  if (keys.length < 5) fail('few gamble keys', keys);
  // 노름 버릇
  C(g).itch = 80; C(g).urgeAt = 0;
  for (const re of [/참는다/, /한 판만/, /털어놓는다/]) { heal(g); g.player.money = 100; scene(g, 'contest_urge', {}, re); }
  drained(g, 'contest_urge', {});
  let urged = 0; C(g).itch = 90;
  for (let m = 0; m < 40 && !g.over; m++) { placeAt(g, 'verden'); C(g).itch = 90; heal(g); month(g, ['rest'], (k) => { if (k === 'contest_urge') urged++; return -1; }); }
  if (!urged) fail('urge never came');
  C(g).itch = 50; for (let m = 0; m < 12; m++) runHooks('afterMonth', g, rngOf(g));
  if (C(g).itch >= 50) fail('itch did not fade', C(g).itch);
  console.log(`도박: 판 ${C(g).games}, 딴 돈 ${C(g).won}, 잃은 돈 ${C(g).lost}, 버릇 밤 ${urged}`);
}

/* 2) 투기장 */
{
  const g = adult(92000);
  placeAt(g, 'leocast');
  g.player.money = 300;
  if (!availableActions(g).some((a) => a.id === 'contest_arena')) fail('no arena action at leocast');
  placeAt(g, 'ern');
  if (availableActions(g).some((a) => a.id === 'contest_arena')) fail('arena at ern');
  placeAt(g, 'leocast');
  scene(g, 'contest_arena', {}, /모래판에 선다/);
  if (!g.duelQueued && !(C(g).arena.wins + C(g).arena.losses)) {
    // 결투는 사건으로 뜬다: 몇 달 안에 끝나야 한다
  }
  for (let i = 0; i < 4 && g.duelQueued; i++) { heal(g); month(g, ['rest']); }
  const w0 = C(g).arena.wins + C(g).arena.losses;
  for (const won of [true, false]) { const m0 = g.player.money; const out = ENDS.contest_arena(g, rngOf(g), won, { ctx: { tier: 1, place: 'leocast', prize: 60 } }); if (bad(out) || josa(out)) fail('arena end text', out); if (won && g.player.money !== m0 + 60) fail('arena prize', m0, g.player.money); if (!won && g.player.money !== m0 + 6) fail('arena comfort', m0, g.player.money); }
  if (C(g).arena.wins + C(g).arena.losses !== w0 + 2) fail('arena record');
  const dec = ENDS['contest_arena:decline'](g, rngOf(g), false, {}); if (bad(dec)) fail('decline text', dec);
  // 짐승
  addAnimal(g, 'dog', { ageYears: 3, trained: 100, bond: 60 });
  addAnimal(g, 'warhorse', { ageYears: 6, trained: 100, bond: 60 });
  for (let i = 0; i < 6; i++) {
    placeAt(g, 'leocast'); heal(g); g.player.money = 300;
    // 싸움판에서 짐승이 죽거나 다칠 수 있다: 내보낼 짐승이 없으면 새로 들인다 (운에 따라 시험이 갈리지 않게)
    if (!alive(g).some((a) => a.kind !== 'familiar' && beastPow(g, a) > 0)) addAnimal(g, 'dog', { ageYears: 3, trained: 100, bond: 60 });
    scene(g, 'contest_arena', {}, /짐승 싸움판/);
  }
  for (const re of [/이름난 쪽/, /약한 쪽/, /구경만/]) { placeAt(g, 'leocast'); heal(g); g.player.money = 300; scene(g, 'contest_arena', {}, re); }
  // 져 주기 제의
  C(g).arena.fame = 30;
  if (tierOf(g) !== 2) fail('tier from fame', tierOf(g));
  let offered = false;
  for (let i = 0; i < 12 && !offered; i++) {
    placeAt(g, 'leocast'); heal(g);
    const s = { kind: 'contest_arena', at: 'leocast' };
    SCENES.contest_arena.text(g, s);
    if (s.offer) { offered = true; const f0 = C(g).fixed.length; const out = SCENES.contest_arena.resolve(g, rngOf(g), s, 'throw'); if (bad(out) || C(g).fixed.length !== f0 + 1) fail('throw failed', out); }
    else runHooks('afterMonth', g, rngOf(g)), g.date.month = g.date.month % 12 + 1;
  }
  if (!offered) fail('no throw offer in a year');
  drained(g, 'contest_arena', {});
  console.log(`투기장: ${C(g).arena.wins}승 ${C(g).arena.losses}패, 짐승 ${C(g).arena.beastWins}승, 이름값 ${C(g).arena.fame}`);
}

/* 3) 고장 대회 */
{
  const tally = {};
  for (const id of FAIR_IDS) {
    const f = FAIRS[id];
    let champ = 0, entered = 0;
    for (let run = 0; run < 6; run++) {
      const g = adult(93000 + run * 31 + id.length);
      const pl = f.places[run % f.places.length];
      placeAt(g, pl);
      g.date.month = f.months[0];
      Object.assign(g.player.stats, { str: 70, agi: 70, sen: 70, wil: 60 });
      g.player.skills.sword = 60; g.player.skills.hunting = 60;
      if (id === 'joust') addAnimal(g, 'warhorse', { ageYears: 6, trained: 100, bond: 60 });
      if (fairHere(g) !== id) { fail('fairHere', id, pl, fairHere(g)); continue; }
      if (!availableActions(g).some((a) => a.id === 'contest_fair')) { fail('no fair action', id, pl); continue; }
      g.player.money = 300;
      const how = run === 1 ? /찔러/ : /참가한다/;
      const def = SCENES.contest_fair;
      const s = { kind: 'contest_fair', at: pl, fair: id };
      const labels = def.choices(g, s).map((c) => c.label);
      const i = labels.findIndex((l) => how.test(l));
      if (i < 0) { fail('no enter', id, labels); continue; }
      const out = def.resolve(g, rngOf(g), s, def.choices(g, s)[i].key);
      if (bad(out) || josa(out)) fail('fair text', out);
      entered++;
      // 세 판
      for (let r = 0; r < 4; r++) {
        const q = L(g).queue.find((x) => x.kind === 'contest_round');
        if (!q) break;
        L(g).queue = L(g).queue.filter((x) => x !== q);
        const rd = SCENES.contest_round;
        const t = rd.text(g, q), ch = rd.choices(g, q);
        if (bad(t) || josa(t) || ch.some((c) => bad(c.label))) fail('round text', t);
        seen.scenes[`round:${id}:${q.round}`] = (seen.scenes[`round:${id}:${q.round}`] ?? 0) + 1;
        const k = run === 2 && q.offer ? 'throw' : run === 3 ? 'quit' : ch[rngOf(g).int(0, 2)].key;
        const o = rd.resolve(g, rngOf(g), q, k);
        if (bad(o) || josa(o)) fail('round out', id, k, o);
        if (samples.length < 40) samples.push(`[${id} ${q.round}] ${k} → ${o}`);
      }
      if (C(g).titles.some((x) => x.id === id)) champ++;
      if (!C(g).entered[`${id}:${pl}:${g.date.year}`]) fail('entered not marked', id);
      if (availableActions(g).some((a) => a.id === 'contest_fair')) fail('can enter twice', id);
      if (g.player.money < 0) fail('fair money', g.player.money);
      drained(g, 'contest_fair', { fair: id });
      drained(g, 'contest_round', { fair: id, round: 2, foe: '시험 상대', foeT: 1 });
    }
    tally[id] = `${champ}/${entered}`;
  }
  console.log('대회 우승/참가:', JSON.stringify(tally));
  // 마상 시합은 말 없이는 못 나간다
  const g = adult(93900); placeAt(g, 'leocast'); g.date.month = 6; g.player.money = 300; g.player.skills.sword = 60;
  g.beasts && (g.beasts.animals = []);
  const lab = SCENES.contest_fair.choices(g, { kind: 'contest_fair', at: 'leocast', fair: 'joust' }).map((c) => c.label);
  if (lab.some((l) => /참가한다/.test(l))) fail('joust without horse', lab);
  // 다른 달에는 대회가 없다
  g.date.month = 2; if (fairHere(g)) fail('fair in february');
}

/* 4) 승부 조작 들통, 대 잇기, 옛 저장 */
{
  const g = adult(94000);
  placeAt(g, 'verden');
  C(g).fixed.push({ kind: 'fair', fair: 'archery', place: 'verden', year: g.date.year, exposed: false, at: g.date.year * 12 + g.date.month });
  let m = 0;
  for (; m < 400 && !C(g).fixed[0].exposed; m++) { runHooks('afterMonth', g, rngOf(g)); C(g).fixed[0].at = g.date.year * 12 + g.date.month; }
  if (!C(g).fixed[0].exposed) fail('fix never exposed');
  else { if (!bannedAt(g, 'fair', 'verden') || !bannedAt(g, 'arena', 'verden')) fail('exposure did not ban'); console.log(`승부 조작 들통: ${m}달 만`); }
  g.date.month = 5;
  if (availableActions(g).some((a) => a.id === 'contest_fair')) fail('banned but fair open');
  C(g).titles.push({ id: 'archery', place: 'verden', year: 1, text: '베르덴 활쏘기 대회 우승' });
  C(g).itch = 70;
  runHooks('heir', g, rngOf(g), g.player);
  if (C(g).itch !== 0 || C(g).titles.length || !C(g).past?.length || C(g).fixed.length) fail('heir', JSON.stringify(C(g)).slice(0, 300));
  const o = adult(94100);
  delete o.contest;
  runHooks('migrate', o);
  if (!o.contest?.arena) fail('migrate failed');
  o.contest = { won: 5 }; runHooks('migrate', o);
  if (!o.contest.arena || !Array.isArray(o.contest.fixed) || o.contest.won !== 5) fail('migrate partial');
  const st = contestStatus(o);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('status', JSON.stringify(st));
}

/* 5) 저절로 살아 보기 */
{
  let games = 0, fights = 0;
  const f0 = seen.scenes.contest_fair ?? 0;
  for (let run = 0; run < 4; run++) {
    const a = adult(95020 + run);
    placeAt(a, ['harfen', 'leocast', 'verden', 'eisen'][run]);
    for (let m = 0; m < 120 && !a.over; m++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.5) ? ['contest_fair', 'contest_arena', 'contest_gamble', 'travel'] : [rngOf(a).pick(acts).id];
      a.player.money = Math.max(a.player.money, 30);
      month(a, want);
    }
    games += C(a).games; fights += C(a).arena.wins + C(a).arena.losses + C(a).arena.beastWins; 
  }
  console.log(`저절로 10년 4판: 도박 ${games}판, 투기장 ${fights}, 대회 ${(seen.scenes.contest_fair ?? 0) - f0}`);
  if (!games) fail('autoplay never gambled');
}

console.log('장면:', JSON.stringify(seen.scenes));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
