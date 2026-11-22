import './lsshim.js';
import '../src/content.js';
// 맹세와 의형제 점검: 의형제 맺기와 부름, 저버리면 원한, 먼저 간 의형제, 주군과 녹과 부름, 주군이 바뀜, 가신 받기와 떠남,
// 서원과 시험·깨짐, 두 집안의 약속(돕기·혼약)과 대물림, 대 잇기, 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { oathState, oathInfo } from '../src/oath/index.js';
import { makePerson, kill } from '../src/npc.js';
import { feudState } from '../src/feud/index.js';
import { faithState } from '../src/faith/index.js';
import { crimeState } from '../src/crime.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['oath_blood', 'oath_liege', 'oath_man', 'oath_vow', 'oath_pact', 'work', 'rest'];

function adult(seed, age = 25, fam = 'farmer') {
  const g = newGame({ name: '맹세', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = 'ern'; L(g).home = 'family';
  g.player.money = 300;
  return g;
}
function person(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: 30 * 12, job: 'farmer', ...opts });
  p.known = true; p.place = 'ern'; g.people.push(p);
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
    if (/^oath_/.test(kind) && samples.length < 24 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
  }
}
function play(g, months, prefer = ACTS, pick = {}, rate = 0.5) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id) && !a.needsTarget);
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel' && x.id !== 'house_move'));
      if (g.player.fatigue > 85) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
    resolveAll(g, pick);
    if (L(g).place !== 'ern' && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.3)) L(g).place = 'ern';
  }
}
const checkInfo = (g) => {
  const info = oathInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `oathInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  ok(info.brand >= 0 && info.brand <= 100, `brand ${info.brand}`);
  return info;
};

// 1) 의형제를 맺는다, 부르면 간다, 저버리면 원한
{
  let sworn = 0, kept = 0, broke = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(10 + t);
    g.player.stats.cha = 60;
    const f = person(g, { sex: g.player.sex }); f.affection = 85;
    play(g, 4, ['oath_blood'], { oath_blood: 0 }, 1);
    const v = oathState(g);
    const b = v.bonds.find((x) => x.kind === 'blood' && x.pid === f.id);
    if (!b) continue;
    sworn++;
    for (const need of ['debt', 'fight']) {
      queueScene(g, 'oath_blood_call', { who: f.id, need });
      play(g, 1, ['rest'], { oath_blood_call: t % 2 ? idxOf(/모른 척/) : 0 }, 1);
    }
    if (L(g).ancestors.length) { checkInfo(g); continue; } // 갑작스런 병으로 죽어 대가 바뀐 판은 뺀다 (33단계: 행동이 늘어 판이 달라지자 걸림)
    if (v.bonds.some((x) => x.pid === f.id)) kept++;
    else { broke++; ok(feudState(g).grudges[f.id] && v.brand > 0, 'betrayed blood → grudge & brand'); }
    checkInfo(g);
  }
  ok(sworn >= 4, `sworn ${sworn}/6`);
  ok(kept >= 1 && broke >= 1, `kept ${kept} broke ${broke}`);
}

// 2) 의형제가 먼저 가면, 대를 이으면 두 집안의 약속
{
  const g = adult(20, 45);
  const f = person(g, { sex: g.player.sex, ageMonths: 50 * 12 }); f.affection = 90;
  const fk = person(g, { ageMonths: 20 * 12, lastName: f.lastName }); fk.fatherId = f.id; f.childIds.push(fk.id);
  play(g, 4, ['oath_blood'], { oath_blood: 0 }, 1);
  ok(oathState(g).bonds.some((x) => x.pid === f.id), 'sworn for mourn');
  kill(g, f, '겨울 열병');
  play(g, 2, ['rest'], { oath_blood_mourn: idxOf(/약속으로/) }, 1);
  ok(seen.scenes.oath_blood_mourn > 0, 'mourn scene');
  ok(oathState(g).pacts.some((x) => x.pid === fk.id), 'pact to sworn kid');
  // 대 잇기: 살아 있는 의형제는 약속으로
  const h = adult(21, 50);
  const f2 = person(h, { sex: h.player.sex }); f2.affection = 90;
  play(h, 4, ['oath_blood'], { oath_blood: 0 }, 1);
  const had = oathState(h).bonds.some((x) => x.pid === f2.id);
  oathState(h).brand = 50;
  runHooks('heir', h, rngOf(h), h.player);
  ok(!had || oathState(h).pacts.some((x) => x.pid === f2.id && !x.done), 'heir: blood → pact');
  ok(oathState(h).brand === 20 && oathState(h).bonds.length === 0, `heir brand ${oathState(h).brand}`);
  const old = JSON.parse(JSON.stringify(h)); delete old.oath;
  runHooks('migrate', old);
  ok(old.oath && Array.isArray(old.oath.bonds), 'old save oath');
}

// 3) 주군: 맹세, 녹, 부름, 거역하면 낙인
{
  let sworn = 0, broke = 0, gone = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(30 + t);
    g.player.skills.sword = 40;
    play(g, 3, ['oath_liege'], { oath_liege_offer: 0 }, 1);
    const v = oathState(g);
    if (!v.bonds.some((x) => x.kind === 'liege')) continue;
    sworn++;
    const m0 = g.player.money;
    for (const need of ['tax', 'war', 'dirty']) {
      queueScene(g, 'oath_liege_call', { need });
      play(g, 1, ['rest'], { oath_liege_call: t % 3 === 2 ? idxOf(/거역|가지 않는다|내지 않는다/) : 0 }, 1);
    }
    if (!v.bonds.some((x) => x.kind === 'liege')) { broke++; ok(v.brand > 0, 'liege brand'); }
    else if (t % 2) {
      g.realm.lord = { ...(g.realm.lord ?? {}), house: '새가문', name: '새영주', title: '백작' };
      play(g, 2, ['rest'], { oath_liege_gone: 0 }, 1);
      if (seen.scenes.oath_liege_gone) gone++;
    }
    ok(g.player.money >= 0 && Number.isFinite(m0), 'money ok');
    checkInfo(g);
  }
  ok(sworn >= 4, `liege sworn ${sworn}/6`);
  ok(broke >= 1, `liege broken ${broke}`);
  ok(gone >= 1, `liege gone ${gone}`);
}

// 4) 서원: 지키기, 깨기
{
  let kept = 0, broke = 0;
  for (let t = 0; t < 8; t++) {
    const g = adult(40 + t);
    faithState(g).devotion = 50;
    const kind = ['silence', 'poverty', 'sword', 'pilgrim'][t % 4];
    play(g, 2, ['oath_vow'], { oath_vow: idxOf(new RegExp({ silence: '침묵', poverty: '청빈', sword: '칼을', pilgrim: '순례' }[kind])) }, 1);
    const v = oathState(g);
    if (!v.vow) continue;
    if (kind === 'sword') L(g).stats.kills += 1;
    if (kind === 'pilgrim' && t % 8 < 4) L(g).place = 'solaris';
    if (kind === 'poverty') g.player.money = 200;
    play(g, 14, ['rest', 'work'], { oath_vow_test: t < 4 ? 0 : 1 }, 1);
    for (const x of v.vows) { if (x.how === 'kept') kept++; else broke++; }
    checkInfo(g);
  }
  ok(kept >= 2 && broke >= 2, `vows kept ${kept} broke ${broke}`);
}

// 5) 두 집안의 약속: 혼약이 대를 넘어 온다
{
  let due = 0, wed = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(50 + t, 40);
    g.player.stats.cha = 60;
    const head = person(g, { ageMonths: 42 * 12, sex: 'm' }); head.affection = 70;
    const their = person(g, { ageMonths: 18 * 12, lastName: head.lastName, sex: g.player.sex === 'm' ? 'f' : 'm' }); their.fatherId = head.id; head.childIds.push(their.id);
    const mine = person(g, { ageMonths: 18 * 12, lastName: g.player.lastName, sex: their.sex === 'm' ? 'f' : 'm' });
    if (g.player.sex === 'm') mine.fatherId = me(g).id; else mine.motherId = me(g).id;
    me(g).childIds.push(mine.id);
    play(g, 4, ['oath_pact'], { oath_pact: idxOf(/혼인/) }, 1);
    const v = oathState(g);
    if (!v.pacts.some((x) => x.kind === 'marry')) continue;
    // 그 집 어른이 죽어도 약속은 자식에게 간다
    if (t % 2) { const k2 = person(g, { ageMonths: 22 * 12, lastName: head.lastName }); k2.fatherId = head.id; head.childIds.push(k2.id); kill(g, head, '노환'); }
    play(g, 30, ['rest', 'work'], { oath_pact_due: t % 3 === 2 ? 2 : 0 }, 1);
    if (seen.scenes.oath_pact_due) due++;
    if (mine.spouseId === their.id) wed++;
    checkInfo(g);
  }
  ok(due >= 1 && wed >= 1, `pact due ${due} wed ${wed}`);
}

// 6) 여러 삶
let lives = 0;
for (let run = 0; run < 12; run++) {
  const g = adult(1000 + run, 18 + (run % 4) * 6, ['farmer', 'merchant', 'fallen_knight'][run % 3]);
  g.player.skills.sword = 20 + run * 3;
  faithState(g).devotion = 30 + run * 3;
  for (let i = 0; i < 3; i++) { const p = person(g, { sex: i % 2 ? 'm' : 'f', ageMonths: (24 + i * 8) * 12 }); p.affection = 50 + i * 12; if (i === 2) { const k = person(g, { lastName: p.lastName, ageMonths: 4 * 12 }); k.fatherId = p.id; p.childIds.push(k.id); } }
  if (run % 3 === 0) L(g).renown = 40;
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.35);
  if ((L(g).gen ?? 1) > start) lives++;
  checkInfo(g);
}

// 7) 평범한 삶
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'oath_blood', 'oath_vow'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['oath_blood', 'oath_liege', 'oath_man', 'oath_vow', 'oath_pact']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['oath_blood', 'oath_blood_call', 'oath_blood_mourn', 'oath_liege_offer', 'oath_liege_call', 'oath_liege_gone', 'oath_man', 'oath_vow', 'oath_vow_test', 'oath_pact', 'oath_pact_call', 'oath_pact_due']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('oath_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('oath_')))));
console.log(`대를 이은 삶 ${lives}/12`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `oathtest: ${fail} 실패` : 'oathtest: 통과');
process.exit(fail ? 1 : 0);
