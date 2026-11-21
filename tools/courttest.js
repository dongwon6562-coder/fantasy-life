import './lsshim.js';
import '../src/content.js';
// 궁정과 음모 점검: 출입 자격, 이름값·관직, 줄 대기, 혼인 동맹, 첩자·소문·협박·독살, 반격과 실각, 왕이 바뀐 뒤, 대 잇기·옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { courtState, courtInfo, courtAccess, courtHouses, OFFICES } from '../src/court/index.js';
import { crimeState } from '../src/crime.js';
import { makePerson } from '../src/npc.js';

import { makeRng } from '../src/rng.js';
const pickRng = makeRng({ s: 77 });
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const COURT_ACTS = ['court_attend', 'court_side', 'court_match', 'court_plot', 'work'];

function adult(seed, fam = 'fallen_knight') {
  const g = newGame({ name: '궁정', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  me(g).ageMonths = 22 * 12;
  L(g).place = 'leocast'; L(g).home = 'inn';
  g.player.money = 400;
  return g;
}
function play(g, months, prefer = COURT_ACTS, pick = {}, rate = 0.85) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id));
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel' && x.id !== 'house_move' && !x.id.startsWith('contest_') && !x.id.startsWith('poor_') && !x.id.startsWith('lineage_') && !x.id.startsWith('revolt_') && !x.id.startsWith('spy_')));
      if (g.player.fatigue > 80) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
    for (let k = 0; k < 5 && g.pendingEvent; k++) {
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
      if (/^court_/.test(kind) && samples.length < 18 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 80)} → ${String(out).slice(0, 150)}`);
    }
    if (L(g).place !== 'leocast' && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.3)) L(g).place = 'leocast'; // 왕도로 돌아온다
  }
}

// 1) 출입 자격
{
  const g = adult(1, 'farmer');
  L(g).renown = 0;
  ok(!!courtAccess(g), 'farmer nobody has no access');
  L(g).renown = 45;
  ok(!courtAccess(g), 'renown 45 has access');
  ok(availableActions(g).some((a) => a.id === 'court_attend'), 'court_attend at leocast');
  L(g).place = 'harfen';
  ok(!availableActions(g).some((a) => a.id === 'court_attend'), 'no court in harfen');
  for (const [k, v] of Object.entries(courtInfo(g))) if (k !== 'houses') ok(!bad(String(v)) || v === null, `courtInfo ${k}=${v}`);
  ok(courtHouses(g).length >= 2, 'court houses');
}

// 2) 출세: 궁정에 꾸준히 나가면 관직이 들어온다
let offices = 0, top = 0, married = 0, patrons = 0, secrets = 0, poisons = 0, falls = 0, turns = 0;
for (let run = 0; run < 12; run++) {
  const g = adult(2000 + run);
  L(g).renown = 45;
  g.player.stats.cha = 30 + run; g.player.stats.int = 30; g.player.skills.letters = 40;
  // 궁정 출세만 재려고, 고발장이 오면 합의로 덮는다 (법정 일로 옥에 가면 관직과 상관없는 운이 섞인다)
  play(g, 12 * 12, COURT_ACTS, { law_accused: 1, spy_recruit: 1, law_trial: 0, court_offer: 0, court_marriage: (pe) => (pe.choices.length > 1 && run % 2 ? 0 : pe.choices.length - 1), court_plot: run % 3 === 0 ? 0 : (pe) => pe.choices.length - 1 });
  const c = courtState(g);
  if (c.office >= 0) offices++;
  top = Math.max(top, c.office);
  if (c.marriages.length) married++;
  if (c.patron) patrons++;
  ok(Number.isFinite(c.standing) && c.standing >= 0 && c.standing <= 100, `standing ${c.standing}`);
  ok(Number.isFinite(c.favor) && Number.isFinite(c.heat), 'finite');
}
ok(offices >= 4, `got court office ${offices}/12`);
ok(married >= 1, `marriage alliances ${married}/12`);
ok(patrons >= 3, `patrons ${patrons}/12`);

// 3) 음모만 골라서: 첩자 → 비밀 → 협박, 독살, 들키면 실각
for (let run = 0; run < 10; run++) {
  const g = adult(3000 + run);
  L(g).renown = 45; courtState(g).standing = 30; crimeState(g).craft = 40;
  g.player.stats.int = 40; g.player.stats.cha = 35;
  const plotKey = ['spy', 'spy', 'rumor', 'blackmail', 'poison'];
  play(g, 12 * 6, ['court_plot', 'court_attend'], {
    court_plot: (pe) => {
      const want = plotKey[pickRng.int(0, plotKey.length - 1)];
      const names = { spy: '첩자', rumor: '소문', blackmail: '협박', poison: '독살' };
      const i = pe.choices.findIndex((c) => c.startsWith(names[want]));
      return i >= 0 ? i : 0;
    },
    court_fall: 1,
  });
  const c = courtState(g);
  secrets += c.secrets.length;
  if (seen.scenes.court_fall) falls = seen.scenes.court_fall;
  poisons = (g.chronicle ?? []).filter((x) => /독이라는 말/.test(x.text)).length + poisons;
}
ok(secrets + poisons > 0, `plots did something: secrets ${secrets}, poisons ${poisons}`);

// 4) 왕위 다툼: 편을 골랐는데 왕이 바뀌면
for (const side of ['rudolf', 'erik']) {
  const g = adult(4000 + side.length);
  L(g).renown = 45;
  const c = courtState(g); c.standing = 40; c.side = side;
  g.realm.ruler = 'rudolf'; g.realm.succession = 'settled';
  play(g, 6, ['rest'], { court_turn: 0 }, 1); // 다른 사건이 먼저 올 수 있어 몇 달 기다린다
  if (seen.scenes.court_turn) turns = seen.scenes.court_turn;
  if (side === 'rudolf') ok(courtState(g).favor >= 30, `won side favor ${courtState(g).favor}`);
  else ok(courtState(g).side === null || courtState(g).disgrace > 0, 'lost side kneels or falls');
}
ok(turns >= 2, `court_turn ${turns}`);

// 5) 대 잇기, 옛 저장
{
  const g = adult(5000);
  const c = courtState(g); c.standing = 60; c.office = 2; c.secrets.push({ house: 'stern', what: 'x', power: 1 });
  runHooks('heir', g, rngOf(g));
  ok(courtState(g).office === -1 && courtState(g).secrets.length === 0 && courtState(g).standing === 24, 'heir court reset');
  const old = JSON.parse(JSON.stringify(g)); delete old.court;
  runHooks('migrate', old);
  ok(old.court && old.court.office === -1, 'old save court');
}

// 6) 평범한 삶 몇 번 (궁정에 안 가도 깨지지 않는다)
for (let run = 0; run < 6; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 40, ['work', 'rest'], {}, 0.3);
}

for (const k of ['court_attend', 'court_plot']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['court_offer', 'court_patron', 'court_plot', 'court_marriage']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('court_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('court_')))));
console.log(`관직 ${offices}/12 (최고 ${OFFICES[top] ?? '-'}), 혼인 동맹 ${married}/12, 후원 ${patrons}/12, 비밀 ${secrets}, 독살 ${poisons}, 실각 ${falls}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `courttest: ${fail} 실패` : 'courttest: 통과');
process.exit(fail ? 1 : 0);
