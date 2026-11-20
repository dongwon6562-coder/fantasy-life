import './lsshim.js';
import '../src/content.js';
// 가문의 내력과 가풍 점검: 가훈 정하기·지키기·어기기, 문장, 족보 꾸미기와 들통, 가풍을 거스르는 자식(허락·타이름·의절),
// 분가 내주기와 분가의 일, 어린 가장의 본가 자리 다툼, 해마다 제사와 거른 제사, 가을 모임,
// 대 잇기(가업·버릇·자랑과 수치·형제의 분가), 옛 저장, 여러 삶.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { lineageState, lineageInfo, MOTTOS } from '../src/lineage/index.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { reputeState } from '../src/repute/index.js';
import { courtState } from '../src/court/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['lineage_motto', 'lineage_crest', 'lineage_forge', 'lineage_branch', 'lineage_rite', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern', sex } = {}) {
  const g = newGame({ name: '가람', sex: sex ?? (seed % 2 ? 'm' : 'f'), familyId: 'farmer', mode: 'free', seed });
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
    if (/^lineage_/.test(kind) && samples.length < 34 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
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
      if (/가훈|문장|족보|분가|제사/.test(r.name ?? '') && samples.length < 34 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`);
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
const V = lineageState;
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const checkInfo = (g) => {
  const info = lineageInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `lineageInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};
function child(g, opts = {}) {
  const p = person(g, { age: opts.age ?? 22, place: opts.place, aff: 30 });
  const m = me(g);
  if (m.sex === 'f') p.motherId = m.id; else p.fatherId = m.id;
  p.lastName = g.player.lastName;
  m.childIds = [...(m.childIds ?? []), p.id];
  g.player.familyIds = [...(g.player.familyIds ?? []), p.id];
  return p;
}
const ancestors = (g, n = 2) => { L(g).ancestors = Array.from({ length: n }, (_, i) => ({ name: ['한솔', '두메', '세찬'][i % 3], lastName: g.player.lastName, id: 9000 + i, born: 400 + i * 30, died: 450 + i * 30, age: 50, cause: '병', summary: '농사꾼' })); };
const setOp = (g, axis, val, pl = L(g).place) => { const R = reputeState(g); R.base[pl] ??= {}; R.base[pl][axis] = val; };

// 1) 가훈: 정하기, 지키기, 어기기, 대가 바뀌면 다시 고르기
{
  const g = adult(1);
  ok(has(g, 'lineage_motto'), 'motto available');
  ok(!has(adult(2, { age: 18 }), 'lineage_motto'), 'motto needs 20');
  ok(act(g, 'lineage_motto', { lineage_motto: idxOf(/말은 한 번/) }), 'motto act');
  const v = V(g);
  ok(v.motto?.key === 'honest', `motto set ${v.motto?.key}`);
  ok(!has(g, 'lineage_motto'), 'motto once per gen');
  setOp(g, 'honest', 0); play(g, 1, ['rest'], {}, 1);
  setOp(g, 'honest', 10); play(g, 1, ['rest'], {}, 1);
  ok(v.mottoKept >= 1, `motto kept ${v.mottoKept}`);
  setOp(g, 'honest', -10); play(g, 1, ['rest'], {}, 1);
  ok(v.mottoBroken >= 1, `motto broken ${v.mottoBroken}`);
  ok(checkInfo(g).motto?.text === MOTTOS.honest.text, 'info motto');
  v.gens += 1;
  ok(has(g, 'lineage_motto'), 'motto again next gen');
  ok(scene(g, 'lineage_motto', {}, idxOf(/그대로 둔다/)), 'motto keep scene');
  ok(v.motto.key === 'honest' && v.motto.gen === v.gens, 'motto kept over');
  v.gens += 1;
  ok(scene(g, 'lineage_motto', {}, idxOf(/굶는 이웃/)), 'motto change scene');
  ok(v.motto.key === 'kind', 'motto changed');
}

// 2) 문장
{
  const g = adult(10);
  ok(act(g, 'lineage_crest', { lineage_crest: 0 }), 'crest act');
  ok(!!V(g).crest && !has(g, 'lineage_crest'), 'crest set once');
  ok(/바탕에/.test(checkInfo(g).crest?.text ?? ''), 'info crest');
  const h = adult(11);
  scene(h, 'lineage_crest', { signs: ['늑대 머리', '저울', '닻', '등불'], color: '검은 바탕' }, idxOf(/그만둔다/));
  ok(!V(h).crest, 'crest declined');
}

// 3) 족보 꾸미기와 들통
{
  const g = adult(20, { place: 'leocast' });
  ok(!has(adult(21), 'lineage_forge'), 'forge only in cities');
  const c0 = courtState(g).standing ?? 0;
  ok(act(g, 'lineage_forge', { lineage_forge: 0 }), 'forge act');
  const v = V(g);
  ok(!!v.fake && (courtState(g).standing ?? 0) > c0, 'forged');
  ok(scene(g, 'lineage_exposed', {}, idxOf(/털어놓는다/)), 'exposed admit');
  ok(v.fake.exposed && v.shame.some((x) => /족보/.test(x.text)), 'exposed shame');
  ok(checkInfo(g).fake?.exposed === true, 'info fake');
  const h = adult(22, { place: 'leocast' });
  act(h, 'lineage_forge', { lineage_forge: 0 });
  h.player.money = 300;
  ok(scene(h, 'lineage_exposed', {}, idxOf(/은화로/)), 'exposed pay');
  ok(V(h).fake && !V(h).fake.exposed && V(h).fake.risk === 0, 'paid off');
  const k = adult(23, { place: 'leocast' });
  act(k, 'lineage_forge', { lineage_forge: 0 });
  ok(scene(k, 'lineage_exposed', {}, idxOf(/우긴다/)), 'exposed deny');
  // 저절로 들통나기
  let natural = 0;
  for (let t = 0; t < 6; t++) {
    const q = adult(30 + t, { place: 'leocast' });
    act(q, 'lineage_forge', { lineage_forge: 0 });
    if (V(q).fake) V(q).fake.risk = 100;
    const n0 = seen.scenes.lineage_exposed ?? 0;
    play(q, 60, ['rest', 'work'], {}, 1);
    if ((seen.scenes.lineage_exposed ?? 0) > n0) natural++;
  }
  ok(natural >= 1, `natural exposed ${natural}`);
}

// 4) 가풍을 거스르는 자식
{
  for (const [i, re, test] of [[0, /제 길을/, (g, p) => V(g).blackSheep === 1 && me(g).childIds.includes(p.id)], [1, /타이른다/, (g) => V(g).blackSheep === 1], [2, /이 집 사람이 아니/, (g, p) => !me(g).childIds.includes(p.id) && V(g).shame.length === 1]]) {
    const g = adult(40 + i, { age: 45 });
    const p = child(g, { age: 18 });
    V(g).craft = { skill: 'farming', depth: 2, gens: 2 };
    V(g).motto = { key: 'brave', text: MOTTOS.brave.text, by: '선대', y: 400, gen: 1 };
    ok(scene(g, 'lineage_blacksheep', { pid: p.id, why: i === 1 ? 'motto' : 'craft', craft: '농사', want: '떠돌이 악사', motto: MOTTOS.brave.text }, idxOf(re)), `blacksheep ${i}`);
    ok(test(g, p), `blacksheep result ${i}`);
  }
  // 저절로
  let n = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(50 + t, { age: 45 });
    for (let k = 0; k < 3; k++) child(g, { age: 15 + k });
    V(g).motto = { key: 'loyal', text: MOTTOS.loyal.text, by: '선대', y: 400, gen: 1 };
    const n0 = seen.scenes.lineage_blacksheep ?? 0;
    play(g, 72, ['rest', 'work'], {}, 1);
    if ((seen.scenes.lineage_blacksheep ?? 0) > n0) n++;
  }
  ok(n >= 1, `natural blacksheep ${n}`);
}

// 5) 분가: 내주기, 분가의 일, 어린 가장 넘보기
{
  const g = adult(60, { age: 50 });
  const p = child(g, { age: 25, place: 'leocast' });
  ok(has(g, 'lineage_branch'), 'branch available');
  ok(act(g, 'lineage_branch'), 'branch act');
  const v = V(g);
  ok(v.branches.length === 1 && v.branches[0].pid === p.id, 'branch made');
  ok(!has(g, 'lineage_branch'), 'branch once per child');
  const b = v.branches[0];
  for (const [ev, re] of [['help', /스무 닢/], ['gift', /반은/], ['quarrel', /물러선다/], ['gift', /고맙게/], ['help', /어렵다/], ['quarrel', /체면/]]) ok(scene(g, 'lineage_branch_ev', { bid: b.id, ev }, idxOf(re)), `branch ev ${ev}`);
  const info = checkInfo(g);
  ok(info.branches[0]?.placeName && info.branches[0].head === p.name, 'info branch');
  // 분가 가장이 죽으면 자식이 잇는다
  const gc = person(g, { age: 20, place: 'leocast' }); p.childIds = [gc.id]; p.alive = false;
  play(g, 1, ['rest'], {}, 1);
  ok(b.pid === gc.id, 'branch succession');
  // 어린 가장
  for (const [i, re] of [[0, /유언/], [1, /맡긴다/]]) {
    const h = adult(61 + i, { age: 14 });
    const q = person(h, { age: 30, place: 'leocast' });
    V(h).branches.push({ id: 0, name: '레오캐스트 분가', pid: q.id, place: 'leocast', y: h.date.year, standing: 60, ties: 50, by: '선대' });
    V(h).bseq = 1;
    ok(scene(h, 'lineage_claim', { bid: 0 }, idxOf(re)), `claim ${i}`);
  }
  // 저절로 분가의 일과 모임
  let ev = 0;
  for (let t = 0; t < 4; t++) {
    const h = adult(70 + t, { age: 50 });
    const q = child(h, { age: 26, place: 'harfen' });
    act(h, 'lineage_branch');
    const n0 = (seen.scenes.lineage_branch_ev ?? 0) + (seen.scenes.lineage_gathering ?? 0);
    play(h, 48, ['rest', 'work'], {}, 1);
    if ((seen.scenes.lineage_branch_ev ?? 0) + (seen.scenes.lineage_gathering ?? 0) > n0) ev++;
  }
  ok(ev >= 2, `natural branch/gathering ${ev}`);
}

// 6) 제사: 해마다 한 번, 오래 거르면 수치
{
  const g = adult(80);
  ok(!has(g, 'lineage_rite'), 'rite needs ancestors');
  ancestors(g);
  ok(act(g, 'lineage_rite'), 'rite act');
  ok(V(g).rites === 1 && !has(g, 'lineage_rite'), 'rite once a year');
  ok(checkInfo(g).rites.count === 1, 'info rites');
  V(g).riteY = g.date.year - 6;
  play(g, 1, ['rest'], {}, 1);
  ok(V(g).shame.some((x) => /제사/.test(x.text)), 'missed rites shame');
}

// 7) 가을 모임
{
  for (const [ev, re] of [['loan', /빌려준다/], ['match', /혼담/], ['story', /끝까지/], ['feud', /공평/], ['feud', /맏집/], ['loan', /술잔/]]) {
    const g = adult(90);
    V(g).gens = 2; V(g).pride.push({ text: '선대가 다리를 놓았다', y: 400, by: '한솔' });
    ok(scene(g, 'lineage_gathering', { ev, name: '두메' }, idxOf(re)), `gathering ${ev}`);
  }
  const g = adult(95);
  V(g).fake = { key: 'hero', who: '용사의 방패를 들던 종자', y: '용사력 원년', at: 0, exposed: false, risk: 5 };
  for (let k = 0; k < 6; k++) scene(g, 'lineage_gathering', { ev: 'story', name: '두메' }, idxOf(/끝까지/));
  ok(V(g).fake.risk > 5, `story raises fake risk ${V(g).fake.risk}`);
}

// 8) 대 잇기: 가업, 버릇, 자랑과 수치, 형제의 분가
{
  const g = adult(100, { age: 30 });
  me(g).fatherId ??= 8888;
  const sib = person(g, { age: 28, place: 'harfen' }); sib.fatherId = me(g).fatherId; g.player.familyIds = [...(g.player.familyIds ?? []), sib.id];
  setOp(g, 'kind', 30); setOp(g, 'honest', -25);
  L(g).renown = 30; L(g).notoriety = 25;
  crimeState(g).record.push({ c: 'murder', y: g.date.year });
  const old = { ...g.player, name: '선대가람', skills: { ...g.player.skills, farming: 55 } };
  const f0 = g.player.skills.farming ?? 0, cha0 = g.player.stats.cha;
  runHooks('heir', g, rngOf(g), old);
  const v = V(g);
  ok(v.gens === 2, 'gens up');
  ok(v.craft?.skill === 'farming' && v.craft.depth === 1, `craft ${JSON.stringify(v.craft)}`);
  ok((g.player.skills.farming ?? 0) > f0, 'craft bonus');
  ok(v.habits.kind?.good === true && v.habits.honest?.good === false, `habits ${JSON.stringify(v.habits)}`);
  ok(g.player.stats.cha > cha0, 'good habit stat');
  ok(v.pride.some((x) => /이름이/.test(x.text)), 'pride renown');
  ok(v.shame.some((x) => /악명/.test(x.text)) && v.shame.some((x) => /피가/.test(x.text)), 'shame');
  ok(v.branches.some((b) => b.pid === sib.id), 'sibling branch');
  setOp(g, 'kind', 30); setOp(g, 'honest', -25);
  runHooks('heir', g, rngOf(g), { ...old, name: '둘째가람' });
  ok(v.craft.depth === 2 && v.craft.gens === 2 && v.habits.kind.gens === 2, 'craft/habit deepen');
  runHooks('heir', g, rngOf(g), { ...old, name: '셋째가람', skills: {} });
  ok(v.craft.depth === 1, 'craft fades');
  const info = checkInfo(g);
  ok(info.gens === 4 && info.habits.length >= 1 && info.craft?.skillName, 'info heir');
}

// 9) 옛 저장
{
  const g = adult(110);
  delete g.lineage;
  runHooks('migrate', g);
  ok(g.lineage && Array.isArray(g.lineage.branches) && g.lineage.gens === 1, 'old save lineage');
  checkInfo(g);
}

// 10) 여러 삶
let lives = 0, gens = 0, mottos = 0;
for (let run = 0; run < 10; run++) {
  const pl = ['ern', 'leocast', 'harfen', 'portel', 'solaris'][run % 5];
  const g = adult(1000 + run, { age: 18 + (run % 4) * 7, place: pl });
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.3);
  if ((L(g).gen ?? 1) > start) lives++;
  gens += V(g).gens - 1; if (V(g).motto) mottos++;
  checkInfo(g);
}
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'lineage_rite', 'lineage_motto', 'lineage_branch'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['lineage_motto', 'lineage_crest', 'lineage_forge', 'lineage_branch', 'lineage_rite']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['lineage_motto', 'lineage_crest', 'lineage_forge', 'lineage_exposed', 'lineage_blacksheep', 'lineage_branch_ev', 'lineage_claim', 'lineage_gathering']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('lineage_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('lineage_')))));
console.log(`대를 이은 삶 ${lives}/10, 이어진 대 ${gens}, 가훈 있는 집 ${mottos}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `lineagetest: ${fail} 실패` : 'lineagetest: 통과');
process.exit(fail ? 1 : 0);
