import './lsshim.js';
import '../src/content.js';
// 자식 기르기 점검: 자식 기록, 가르칠 길, 반항·형제 다툼·집 떠나기, 양자·의절, 유언과 유산 다툼, 대 잇기에서 기른 만큼 자라 있기, 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { kinState, kinInfo, myKids } from '../src/kin/index.js';
import { becomeHeir } from '../src/heir.js';
import { makePerson, byId, ageYears } from '../src/npc.js';
import { marry } from '../src/relations.js';
import { crimeState } from '../src/crime.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const KIN_ACTS = ['kin_time', 'kin_adopt', 'kin_will', 'work', 'rest'];

function parent(seed, kids = 3, fam = 'farmer') {
  const g = newGame({ name: '부모', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  const meP = me(g);
  meP.ageMonths = 30 * 12;
  L(g).place = 'ern'; L(g).home = 'own';
  g.player.money = 200; g.player.familyMoney = 100;
  const rng = rngOf(g);
  const sp = makePerson(rng, { sex: meP.sex === 'm' ? 'f' : 'm', ageMonths: 29 * 12, job: 'farmer' });
  g.people.push(sp); sp.known = true; sp.affection = 70;
  marry(g, sp);
  for (let i = 0; i < kids; i++) {
    const father = meP.sex === 'm' ? meP : sp, mother = father === meP ? sp : meP;
    const k = makePerson(rng, { ageMonths: (1 + i * 3) * 12, lastName: g.player.lastName, fatherId: father.id, motherId: mother.id });
    g.people.push(k); meP.childIds.push(k.id); sp.childIds.push(k.id); g.player.familyIds.push(k.id); k.known = true;
  }
  return g;
}
function play(g, months, prefer = KIN_ACTS, pick = {}, rate = 0.6) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id));
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel'));
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
      if (/^kin_/.test(kind) && samples.length < 20 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
    }
    if (L(g).place !== 'ern' && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.3)) L(g).place = 'ern';
  }
}
const checkInfo = (g) => {
  const info = kinInfo(g);
  for (const k of info.kids) for (const [key, v] of Object.entries(k)) ok(!bad(String(v)) || v === null, `kinInfo ${key}=${v}`);
  return info;
};

// 1) 자식 기록과 kinInfo
{
  const g = parent(11);
  play(g, 2, ['rest']);
  const info = checkInfo(g);
  ok(info.kids.length === 3, `3 kids ${info.kids.length}`);
  ok(info.kids.every((k) => k.temper && k.temperName), 'tempers');
  ok(info.heirReady != null, 'heir ready');
}

// 2) 여러 집안: 자식 돌보기를 자주 하며 20년
let paths = 0, rebels = 0, quarrels = 0, leaves = 0, adopts = 0, wills = 0, disowns = 0, jobs = 0;
for (let run = 0; run < 14; run++) {
  const g = parent(1000 + run, 2 + (run % 3), ['farmer', 'merchant', 'fallen_knight'][run % 3]);
  play(g, 12 * 20, run % 3 === 0 ? KIN_ACTS : ['kin_time', 'work', 'rest'], { kin_adopt: run % 2 ? 0 : 3, kin_rebel: run % 4, kin_leave: run % 3 === 0 ? 3 : 0, kin_path: (pe) => run % pe.choices.length });
  const k = kinState(g);
  const recs = Object.values(k.kids);
  paths += recs.filter((r) => r.path).length;
  leaves += recs.filter((r) => r.left).length;
  disowns += recs.filter((r) => r.disowned).length;
  adopts += k.adopted;
  if (k.will) wills++;
  jobs += myKids(g).filter((p) => ageYears(p) >= 15 && p.job !== 'child').length;
  for (const r of recs) ok(Number.isFinite(r.bond) && r.bond >= 0 && r.bond <= 100 && Number.isFinite(r.learned), `rec finite ${r.bond} ${r.learned}`);
  checkInfo(g);
}
rebels = seen.scenes.kin_rebel ?? 0; quarrels = seen.scenes.kin_quarrel ?? 0;
ok(paths >= 20, `paths chosen ${paths}`);
ok(rebels >= 3, `rebels ${rebels}`);
ok(quarrels >= 2, `quarrels ${quarrels}`);
ok(leaves >= 2, `leaves ${leaves}`);
ok(adopts >= 2, `adopts ${adopts}`);
ok(jobs >= 10, `grown kids with jobs ${jobs}`);

// 3) 대 잇기: 검을 배운 자식은 검을 안다, 유언과 다른 자식이 이으면 다툼
let disputes = 0;
for (let run = 0; run < 8; run++) {
  const g = parent(3000 + run, 3);
  const kids = myKids(g);
  for (const p of kids) p.ageMonths += 14 * 12;
  play(g, 1, ['rest']);
  const k = kinState(g);
  const target = kids[0];
  k.kids[target.id].path = 'sword'; k.kids[target.id].learned = 70; k.kids[target.id].gift = 'str'; k.kids[target.id].bond = 80;
  k.will = { mode: 'chosen', heirId: kids[1].id, at: 0 };
  const before = g.player.skills.sword;
  L(g).ancestors.push({ name: g.player.name, lastName: g.player.lastName, age: 50, cause: '병', id: g.player.id });
  const out = becomeHeir(g, rngOf(g), target);
  ok(!bad(out), `heir text ${out}`);
  ok(g.player.id === target.id, 'became heir');
  ok(g.player.skills.sword >= 25, `heir learned sword ${g.player.skills.sword} (parent ${before})`);
  ok(L(g).queue.some((s) => s.kind === 'kin_dispute'), 'dispute queued when will names another');
  if (L(g).queue.some((s) => s.kind === 'kin_dispute')) disputes++;
  ok(kinState(g).will === null, 'will cleared');
  play(g, 3, ['rest'], { kin_dispute: run % 4 });
}
ok(disputes >= 6, `disputes ${disputes}`);

// 4) 똑같이 나누는 유언: 다툼 없이 몫을 뗀다
{
  const g = parent(4100, 3);
  for (const p of myKids(g)) p.ageMonths += 16 * 12;
  play(g, 1, ['rest']);
  kinState(g).will = { mode: 'equal', heirId: myKids(g)[0].id };
  const total = g.player.money + g.player.familyMoney;
  L(g).ancestors.push({ name: g.player.name, lastName: g.player.lastName, age: 50, cause: '병', id: g.player.id });
  becomeHeir(g, rngOf(g), myKids(g)[0]);
  ok(!L(g).queue.some((s) => s.kind === 'kin_dispute'), 'no dispute on equal will');
  ok(g.player.money + g.player.familyMoney < total, 'equal will splits money');
}

// 5) 의절한 자식은 대를 잇지 못한다, 옛 저장
{
  const g = parent(5100, 2);
  play(g, 1, ['rest']);
  const kid = myKids(g)[0];
  const k = kinState(g);
  k.kids[kid.id].disowned = true; k.kids[kid.id].parent = g.player.id;
  me(g).childIds = me(g).childIds.filter((id) => id !== kid.id);
  ok(!myKids(g).includes(kid), 'disowned not in kids');
  ok(kinInfo(g).kids.some((x) => x.id === kid.id && x.status === 'disowned'), 'disowned shown');
  const old = JSON.parse(JSON.stringify(g)); delete old.kin;
  runHooks('migrate', old);
  ok(old.kin && old.kin.kids, 'old save kin');
  runHooks('heir', g, rngOf(g)); // 옛 부르기 (old 없이)
}

// 6) 평범한 삶 (자식 없이도, 아이로 시작해도 깨지지 않는다)
for (let run = 0; run < 6; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 45, ['work', 'rest', 'kin_time', 'kin_will'], {}, 0.4);
}

for (const k of ['kin_time', 'kin_adopt', 'kin_will']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['kin_path', 'kin_rebel', 'kin_quarrel', 'kin_leave', 'kin_adopt', 'kin_will', 'kin_dispute']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('kin_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('kin_')))));
console.log(`길 ${paths}, 반항 ${rebels}, 다툼 ${quarrels}, 떠남 ${leaves}, 거둠 ${adopts}, 유언 ${wills}, 의절 ${disowns}, 일 잡은 자식 ${jobs}, 유산 다툼 ${disputes}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `kintest: ${fail} 실패` : 'kintest: 통과');
process.exit(fail ? 1 : 0);
