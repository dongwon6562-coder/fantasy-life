import './lsshim.js';
import '../src/content.js';
// 원수와 복수 점검: 미움이 원한이 되기, 친구가 원수가 되기, 원수의 복수, 복수를 꾸미기, 화해, 원한 물려받기(죽음·대 잇기), 살인 뒤 식구들의 원한, 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { feudState, feudInfo, addGrudge } from '../src/feud/index.js';
import { makePerson, kill } from '../src/npc.js';
import { crimeState, assassinate } from '../src/crime.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const FEUD_ACTS = ['feud_plot', 'feud_reconcile', 'work', 'rest'];

function adult(seed, fam = 'farmer', age = 24) {
  const g = newGame({ name: '원한', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = 'ern'; L(g).home = 'inn';
  g.player.money = 200;
  return g;
}
function person(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: 30 * 12, job: 'farmer', ...opts });
  p.known = true; g.people.push(p);
  return p;
}
function play(g, months, prefer = FEUD_ACTS, pick = {}, rate = 0.5) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id) && !a.needsTarget);
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel' && x.id !== 'house_move'));
      if (g.player.fatigue > 80) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
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
      if (/^feud_/.test(kind) && samples.length < 20 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
    }
    if (L(g).place !== 'ern' && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.25)) L(g).place = 'ern';
  }
}
const checkInfo = (g) => {
  const info = feudInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `feudInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  for (const f of info.foes) ok(Number.isFinite(f.heat) && f.heat >= 0 && f.heat <= 100, `heat ${f.heat}`);
  return info;
};

// 1) 원수(relations)와 깊은 반감은 원한이 된다
{
  const g = adult(1);
  const a = person(g); a.bond = 'enemy'; a.affection = -50;
  const b = person(g); b.affection = -45;
  const c = person(g); c.affection = -10;
  play(g, 1, ['rest'], {}, 1);
  const f = feudState(g);
  ok(f.grudges[a.id] && f.grudges[b.id] && !f.grudges[c.id], 'grudges from enemies');
  const info = checkInfo(g);
  ok(info.foes.length >= 2 && info.foes[0].heatWord, `foes listed ${info.foes.length}`);
}

// 2) 친구가 원수가 된다
{
  const g = adult(2);
  const p = person(g); p.affection = 60;
  play(g, 1, ['rest'], {}, 1);
  p.affection = -55;
  play(g, 2, ['rest'], { feud_turned: 2 }, 1);
  const gr = feudState(g).grudges[p.id];
  ok(gr && gr.formerFriend, 'former friend grudge');
  ok(feudState(g).log.some((x) => /옛 친구/.test(x.text)), 'turned logged');
}

// 3) 원한을 품은 사람이 죽으면 자식이 물려받는다
{
  const g = adult(3);
  const dad = person(g, { sex: 'm', ageMonths: 55 * 12 });
  const son = person(g, { sex: 'm', ageMonths: 25 * 12 });
  son.fatherId = dad.id; dad.childIds.push(son.id);
  addGrudge(g, dad, 80, '내가 그의 밭을 빼앗았다');
  kill(g, dad, '병');
  play(g, 1, ['rest'], {}, 1);
  const gr = feudState(g).grudges[son.id];
  ok(gr && gr.gen === 1 && gr.heat >= 40, `son inherits ${JSON.stringify(gr)}`);
  ok(!feudState(g).grudges[dad.id], 'dead holder removed');
  const info = checkInfo(g);
  ok(info.foes.some((x) => x.inherited), 'inherited shown');
}

// 4) 내가 죽인 사람의 식구가 원한을 품는다
{
  let got = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(40 + t);
    g.player.skills.sword = 80; g.player.stats.agi = 80;
    const v = person(g, { sex: 'm', ageMonths: 40 * 12 });
    const w = person(g, { sex: 'f', ageMonths: 38 * 12 });
    v.spouseId = w.id; w.spouseId = v.id;
    const kid = person(g, { sex: 'm', ageMonths: 18 * 12 });
    kid.fatherId = v.id; v.childIds.push(kid.id);
    assassinate(g, rngOf(g), v);
    if (v.alive) continue;
    play(g, 1, ['rest'], {}, 1);
    const f = feudState(g);
    if (f.grudges[w.id] || f.grudges[kid.id]) got++;
  }
  ok(got >= 1, `murder kin grudge ${got}/6`);
}

// 5) 대 잇기: 부모의 원수는 내 원수, 옛 저장
{
  const g = adult(5, 'farmer', 40);
  const foe = person(g, { ageMonths: 30 * 12 });
  addGrudge(g, foe, 70, '오래된 땅 다툼');
  runHooks('heir', g, rngOf(g));
  const gr = feudState(g).grudges[foe.id];
  ok(gr && gr.gen === 1 && gr.heat < 70 && gr.why.some((w) => /부모 대/.test(w)), `heir inherits ${JSON.stringify(gr)}`);
  const old = JSON.parse(JSON.stringify(g)); delete old.feud;
  runHooks('migrate', old);
  ok(old.feud && old.feud.grudges, 'old save feud');
}

// 6) 원수가 움직인다, 내가 꾸민다, 화해한다
let strikes = 0, avenged = 0, forgiven = 0, inherited = 0;
for (let run = 0; run < 14; run++) {
  const g = adult(1000 + run, ['farmer', 'merchant', 'fallen_knight'][run % 3]);
  g.player.skills.sword = 30 + run * 3;
  for (let i = 0; i < 3; i++) {
    const p = person(g, { ageMonths: (28 + i * 14) * 12, traits: i === 0 ? ['cruel', 'ambitious'] : [] });
    addGrudge(g, p, 50 + i * 12, ['장터에서 망신을 주었다', '빚을 갚지 않았다', '혼담을 깼다'][i]);
  }
  const prefer = run % 3 === 0 ? ['feud_reconcile', 'work', 'rest'] : run % 3 === 1 ? ['feud_plot', 'work', 'rest'] : ['work', 'rest'];
  play(g, 12 * 12, prefer, { feud_plot: run % 6, feud_peace: run % 4, feud_strike: run % 3, feud_offer: run % 2, feud_deathbed: 0, feud_turned: run % 3 }, 0.35);
  const f = feudState(g);
  avenged += f.avenged; forgiven += f.forgiven;
  if (Object.values(f.grudges).some((x) => x.gen > 0)) inherited++;
  for (const gr of Object.values(f.grudges)) ok(Number.isFinite(gr.heat), 'heat finite');
  checkInfo(g);
}
strikes = seen.scenes.feud_strike ?? 0;
ok(strikes >= 4, `strikes ${strikes}`);
ok(avenged >= 1, `avenged ${avenged}`);
ok(forgiven >= 3, `forgiven ${forgiven}`);

// 7) 평범한 삶 (아이로 시작해 끝까지)
for (let run = 0; run < 6; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 40, ['work', 'rest', 'crime_pickpocket', 'feud_plot'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['feud_plot', 'feud_reconcile']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['feud_strike', 'feud_plot', 'feud_peace', 'feud_turned']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('feud_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('feud_')))));
console.log(`원수의 복수 ${strikes}, 갚아 줌 ${avenged}, 화해 ${forgiven}, 물려받은 원한 있는 삶 ${inherited}/14`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `feudtest: ${fail} 실패` : 'feudtest: 통과');
process.exit(fail ? 1 : 0);
