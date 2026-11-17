import './lsshim.js';
import '../src/content.js';
// 이웃과 마을 살이 점검: 우리 사람(belong), 품앗이와 갚는 품, 마을 일(축제·다리), 마을 회의, 촌장 뽑기와 송사, 텃세, 이웃 다툼, 떠돌이, 대 잇기, 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { villageState, villageInfo, belongAt } from '../src/village/index.js';
import { living, kill } from '../src/npc.js';
import { crimeState } from '../src/crime.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const VIL_ACTS = ['village_help', 'village_duty', 'village_rule', 'work', 'rest'];

function adult(seed, fam = 'farmer', age = 25, place = 'ern') {
  const g = newGame({ name: '이웃', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = place; L(g).home = place === 'ern' ? 'family' : 'rent';
  g.player.money = 300;
  return g;
}
function play(g, months, prefer = VIL_ACTS, pick = {}, rate = 0.5, stay = 'ern') {
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
    for (let k = 0; k < 6 && g.pendingEvent; k++) {
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
      if (/^village_/.test(kind) && samples.length < 22 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
    }
    if (L(g).place !== stay && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.3)) L(g).place = stay;
    if (!['family', 'rent', 'own', 'inn'].includes(L(g).home) && !L(g).travel) L(g).home = stay === 'ern' ? 'family' : 'rent';
  }
}
const checkInfo = (g) => {
  const info = villageInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `villageInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  ok(Number.isFinite(info.belong) && info.belong >= 0 && info.belong <= 100, `belong ${info.belong}`);
  return info;
};

// 1) 고향 사람은 처음부터 마을 사람에 가깝고, 굴러온 사람은 뜨내기에서 시작한다
{
  const g = adult(1);
  ok(belongAt(g, 'ern') >= 40, `born belong ${belongAt(g, 'ern')}`);
  const h = adult(2, 'farmer', 25, 'harfen');
  play(h, 1, ['rest'], {}, 1, 'harfen');
  ok(belongAt(h, 'harfen') < 15, `newcomer belong ${belongAt(h, 'harfen')}`);
  const info = checkInfo(h);
  ok(info.neighbors.length === 0 && info.belongWord === '뜨내기', `newcomer info ${info.neighbors.length} ${info.belongWord}`);
  play(h, 1, ['village_help'], {}, 1, 'harfen');
  ok(villageInfo(h).neighbors.length === 4, `neighbors after help ${villageInfo(h).neighbors.length}`);
}

// 2) 품앗이: 우리 사람이 되고, 갚을 품이 쌓이고, 추수나 재앙 때 돌아온다
{
  const g = adult(3, 'farmer', 25, 'harfen');
  play(g, 18, ['village_help'], { village_snub: 0 }, 1, 'harfen');
  const r = villageState(g).places.harfen;
  ok(r.belong >= 25, `help raises belong ${r.belong.toFixed(1)}`);
  ok(r.owed > 0 || r.favors > 0, `favors ${r.favors}/${r.owed}`);
  checkInfo(g);
}

// 3) 마을 일: 다리를 놓으면 고장에 남는다
{
  const g = adult(4);
  villageState(g).places.ern.belong = 60;
  play(g, 14, ['village_duty'], { village_task: (pe) => Math.max(0, pe.choices.findIndex((c) => /돌다리/.test(c))) }, 1);
  const v = villageState(g);
  ok(v.landmarks.some((x) => x.kind === 'bridge'), `bridge built ${JSON.stringify(v.landmarks)} ${JSON.stringify(v.projects)}`);
  checkInfo(g);
}

// 4) 촌장이 죽으면 뽑는다, 내가 나서서 뽑히면 송사를 본다
{
  let won = 0, judged = 0, elected = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(40 + t, 'farmer', 35);
    villageState(g).places.ern.belong = 85;
    g.player.stats.cha = 70;
    for (const p of living(g)) if (p.job === 'elder') kill(g, p, '노환');
    play(g, 30, ['village_rule', 'work', 'rest'], { village_election: (pe) => Math.max(0, pe.choices.findIndex((c) => /내가 나선다/.test(c))) }, 1);
    if (seen.scenes.village_election) elected++;
    if (villageState(g).office) won++;
    if (seen.scenes.village_judge) judged++;
    if (!villageState(g).office) ok(living(g).some((p) => p.job === 'elder') || !seen.scenes.village_election, 'someone else became elder');
    checkInfo(g);
  }
  ok(elected >= 1 && won >= 2, `elections ${seen.scenes.village_election} won ${won}/6`);
  ok(judged >= 1, `judged ${seen.scenes.village_judge}`);
}

// 5) 대 잇기, 옛 저장
{
  const g = adult(5, 'farmer', 40);
  villageState(g).places.ern.belong = 80;
  villageState(g).office = { place: 'ern', since: 6000, title: '촌장' };
  runHooks('heir', g, rngOf(g));
  ok(villageState(g).office === null && belongAt(g, 'ern') >= 50 && belongAt(g, 'ern') < 80, `heir belong ${belongAt(g, 'ern')}`);
  const old = JSON.parse(JSON.stringify(g)); delete old.village;
  runHooks('migrate', old);
  ok(old.village && old.village.places, 'old save village');
}

// 6) 여러 삶: 고향에서, 낯선 고장에서 15년
let pillars = 0, landmarks = 0, strangers = 0, offices = 0;
for (let run = 0; run < 14; run++) {
  const place = run % 2 ? 'harfen' : 'ern';
  const g = adult(1000 + run, ['farmer', 'merchant', 'fallen_knight'][run % 3], 20, place);
  play(g, 12 * 15, VIL_ACTS, { village_election: run % 3 === 0 ? (pe) => pe.choices.length - 2 : null, village_stranger: run % 4 }, 0.4, place);
  const v = villageState(g);
  if (belongAt(g, place) >= 75) pillars++;
  landmarks += v.landmarks.length;
  strangers += v.strangers.length;
  if (v.office) offices++;
  checkInfo(g);
}
ok(landmarks >= 3, `landmarks ${landmarks}`);

// 7) 평범한 삶 (아이로 시작해 끝까지)
for (let run = 0; run < 6; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 40, ['work', 'rest', 'village_help'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['village_help', 'village_duty', 'village_rule']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['village_meeting', 'village_election', 'village_task', 'village_judge', 'village_snub', 'village_quarrel', 'village_stranger']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('village_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('village_')))));
console.log(`마을의 기둥 ${pillars}/14, 남긴 것 ${landmarks}, 떠돌이 ${strangers}, 촌장 ${offices}/14`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `villagetest: ${fail} 실패` : 'villagetest: 통과');
process.exit(fail ? 1 : 0);
