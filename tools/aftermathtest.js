import './lsshim.js';
import '../src/content.js';
// 전쟁 뒤의 삶 점검: 징집과 귀향(돌아온 사람·전사·상이·행방불명), 전쟁 과부와 고아(돕기·거두기·지붕 부탁),
// 불탄 마을 다시 세우기, 적국 출신 이웃(막아서기·돌 들기), 악몽과 술·술 끊기, 전우 모임과 부탁, 상이군인 청원,
// 행방불명자의 귀환, 대 잇기, 옛 저장, 여러 삶.
// 난수가 밀려도 갈리지 않게, 장면은 형편을 직접 맞추고 띄운다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { aftermathState, aftermathInfo } from '../src/aftermath/index.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { A as armyOf } from '../src/army/index.js';
import { kinState } from '../src/kin/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['aftermath_rebuild', 'aftermath_aid', 'aftermath_sober', 'aftermath_petition', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern' } = {}) {
  const g = newGame({ name: '남은이', sex: seed % 2 ? 'm' : 'f', familyId: 'farmer', mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = place; L(g).home = 'family';
  g.player.money = 300; g.player.familyMoney = 300;
  homePlace.set(g, place);
  return g;
}
function person(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: (opts.age ?? 28) * 12, job: opts.job ?? 'farmer', sex: opts.sex });
  p.known = true; p.place = opts.place ?? 'ern'; p.affection = opts.aff ?? 20; p.childIds ??= []; g.people.push(p);
  return p;
}
// 아내와 어린 자식이 있는 사내
function family(g) {
  const m = person(g, { sex: 'm', age: 27 });
  const w = person(g, { sex: 'f', age: 25 });
  const c = person(g, { age: 5, job: 'child' });
  m.spouseId = w.id; w.spouseId = m.id; m.childIds.push(c.id); w.childIds.push(c.id);
  return m;
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
    if (/^aftermath_/.test(kind) && samples.length < 30 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
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
      if (/^aftermath_/.test(r.id ?? '') || /다시 세우기|술 끊기|상이군인/.test(r.name ?? '')) { if (samples.length < 30 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`); }
    }
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
    resolveAll(g, pick);
  }
}
// 장면 하나를 바로 띄운다. 다른 사건이 끼어들면 형편을 되돌리고 세 번까지
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
// 이 갈래 행동 하나를 확실히 한다
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
const peace = (g) => { const r = g.realm; r.balhart.war = false; r.balhart.tension = 0; r.north.war = false; if (r.succession === 'civilwar') r.succession = null; };
const checkInfo = (g) => {
  const info = aftermathInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `aftermathInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};

// 1) 징집되고, 전쟁이 끝나면 돌아오거나 돌아오지 못한다
{
  let drafted = 0, dead = 0, widows = 0, orphans = 0, back = 0, ruins = 0, foreign = 0, returns = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(10 + t);
    for (let i = 0; i < 6; i++) family(g);
    const v = aftermathState(g);
    for (let m = 0; m < 30; m++) {
      settle(g);
      const b = g.realm.balhart; b.war = true; b.front = 0; b.warMonths = 0;
      play(g, 1, ['rest'], { aftermath_return: 0 }, 1);
    }
    const ds = v.drafted.filter((d) => d.war === 'balhart');
    drafted += ds.length;
    for (const d of ds) { const p = byId(g, d.pid); ok(p?.away || !p?.alive, `drafted away ${p?.name} ${p?.place} ${JSON.stringify(p?.history?.slice(-3))} ${p?.isPlayer} fam ${(g.player.familyIds ?? []).includes(p?.id)}`); }
    ok(checkInfo(g).drafted.length === v.drafted.length, 'info drafted');
    if (!ds.length) continue;
    // 진다
    const r0 = seen.scenes.aftermath_return ?? 0;
    peace(g); g.realm.balhart.front = -9;
    v.seen.balhart = true;
    settle(g);
    play(g, 1, ['rest'], { aftermath_return: 0 }, 1);
    for (let k = 0; k < 2 && (seen.scenes.aftermath_return ?? 0) === r0; k++) { settle(g); play(g, 1, ['rest'], { aftermath_return: 0 }, 1); }
    const w = [...v.wars].reverse().find((x) => x.key === 'balhart');
    ok(w && w.outcome === 'lose', `war ended lose ${JSON.stringify(w)}`);
    if (!w) continue;
    ok(!v.drafted.some((d) => d.war === 'balhart'), 'no one left drafted');
    dead += w.dead.length; back += w.back.length + w.maimed.length;
    widows += v.widows.length; orphans += v.orphans.length;
    ruins += Object.keys(v.ruins).length; foreign += v.foreign.length;
    if ((seen.scenes.aftermath_return ?? 0) > r0) returns++;
    for (const n of w.back) ok(g.people.some((p) => p.name === n && p.alive && !p.away), `back home ${n}`);
    checkInfo(g);
  }
  ok(drafted >= 10, `drafted ${drafted}`);
  ok(dead >= 2 && back >= 3, `dead ${dead} back ${back}`);
  ok(widows >= 1 && orphans >= 1, `widows ${widows} orphans ${orphans}`);
  ok(ruins >= 5, `ruins after lost war ${ruins}`);
  ok(foreign >= 2, `foreign ${foreign}`);
  ok(returns >= 3, `return scenes ${returns}`);
}

// 2) 과부와 고아 돕기: 은화, 밭일, 고아 거두기
{
  const g = adult(30);
  const v = aftermathState(g);
  const w = person(g, { sex: 'f', age: 30, aff: 0 });
  const o = person(g, { age: 7, job: 'child', aff: 0 });
  v.widows.push({ pid: w.id, husband: '돌쇠', war: '발하르트 전쟁', y: g.date.year });
  v.orphans.push({ pid: o.id, father: '돌쇠', war: '발하르트 전쟁', y: g.date.year });
  ok(availableActions(g).some((a) => a.id === 'aftermath_aid'), 'aid available');
  const m0 = g.player.money, a0 = w.affection;
  ok(scene(g, 'aftermath_aid', {}, idxOf(/은화 열 닢/)), 'aid money scene');
  ok(w.affection > a0 && g.player.money < m0, `widow helped ${a0}→${w.affection}`);
  ok(scene(g, 'aftermath_aid', {}, idxOf(/밭일/)), 'aid work scene');
  ok(scene(g, 'aftermath_aid', {}, idxOf(/거둔다/)), 'aid adopt scene');
  ok(me(g).childIds.includes(o.id) && o.adopted && kinState(g).adopted >= 1, 'orphan adopted');
  ok(checkInfo(g).orphans.some((x) => x.adopted), 'info adopted');
  // 과부의 지붕 부탁
  const a1 = w.affection;
  ok(scene(g, 'aftermath_widow', { pid: w.id, husband: '돌쇠' }, idxOf(/지붕을 고쳐/)), 'widow scene');
  ok(w.affection > a1, 'roof fixed');
  // 행동으로도 들어간다
  const w2 = person(g, { sex: 'f', age: 33 });
  v.widows.push({ pid: w2.id, husband: '칠성', war: '북부 전쟁', y: g.date.year });
  ok(act(g, 'aftermath_aid', { aftermath_aid: idxOf(/돌아선다/) }), 'aid action');
  ok(seen.scenes.aftermath_aid >= 4, 'aid via action');
  // 다른 고장으로 떠났으면 장면이 사라진다
  w2.place = 'leocast'; w.place = 'leocast';
  ok(!availableActions(g).some((a) => a.id === 'aftermath_aid'), 'aid gone when widows leave');
}

// 3) 불탄 마을 다시 세우기
{
  const g = adult(40);
  const v = aftermathState(g);
  ok(!availableActions(g).some((a) => a.id === 'aftermath_rebuild'), 'no rebuild without ruins');
  v.ruins.ern = { damage: 14, war: '발하르트 전쟁', y: g.date.year, helped: 0 };
  let n = 0;
  for (let k = 0; k < 8 && v.ruins.ern?.damage > 0; k++) if (act(g, 'aftermath_rebuild')) n++;
  ok(n >= 1 && (v.ruins.ern?.damage ?? 0) === 0, `rebuilt ${n} ${v.ruins.ern?.damage}`);
  ok(g.chronicle?.some?.((c) => /다시 서다/.test(c.text ?? c)) ?? true, 'chron rebuilt');
  ok(checkInfo(g).ruins.every((r) => r.word), 'ruin words');
  // 시간이 지나면 저절로 아물고 지워진다
  v.ruins.harfen = { damage: 3, war: '북부 전쟁', y: g.date.year - 5, helped: 0 };
  play(g, 12, ['rest'], {}, 1);
  ok(!v.ruins.harfen, 'old ruins healed');
}

// 4) 적국 출신 이웃
{
  let stood = 0, stoned = 0;
  for (let t = 0; t < 4; t++) {
    const g = adult(50 + t);
    const v = aftermathState(g);
    const p = person(g, { age: 35, aff: 0 });
    p.foreign = '발하르트';
    v.foreign.push({ pid: p.id, from: '발하르트', place: 'ern', y: g.date.year });
    const a0 = p.affection;
    if (scene(g, 'aftermath_foreigner', { pid: p.id, from: '발하르트' }, idxOf(/막아선다/)) && p.affection > a0) stood++;
    const q = person(g, { age: 35, aff: 0 });
    v.foreign.push({ pid: q.id, from: '발하르트', place: 'ern', y: g.date.year });
    if (scene(g, 'aftermath_foreigner', { pid: q.id, from: '발하르트' }, idxOf(/돌을 든다/)) && q.affection < 0) stoned++;
    checkInfo(g);
  }
  ok(stood >= 3 && stoned >= 3, `stood ${stood} stoned ${stoned}`);
}

// 5) 악몽과 술, 술 끊기
{
  const g = adult(60);
  const a = armyOf(g);
  a.veteran = { rank: 1, years: 4, pension: 0, unit: '셋째 백인대', year: g.date.year - 2 };
  a.scars.push({ id: 'nightmare', name: '밤마다 돌아오는 전장', year: g.date.year - 2 });
  a.battles = 5;
  const v = aftermathState(g);
  for (let k = 0; k < 6; k++) scene(g, 'aftermath_night', {}, idxOf(/술병/));
  ok(v.drink >= 40 && v.nights >= 5, `drink ${v.drink} nights ${v.nights}`);
  ok(checkInfo(g).drinkWord, 'drink word');
  ok(scene(g, 'aftermath_night', {}, idxOf(/걷는다/)), 'night walk');
  g.player.stats.wil = 90;
  const d0 = v.drink;
  let tries = 0;
  for (let k = 0; k < 10 && v.drink >= 25; k++) if (act(g, 'aftermath_sober')) tries++;
  ok(tries >= 1 && v.drink < d0, `sober ${d0}→${v.drink}`);
  // 저절로 오는 악몽 (마음의 상처가 있으면)
  const n0 = seen.scenes.aftermath_night ?? 0;
  for (let k = 0; k < 6 && (seen.scenes.aftermath_night ?? 0) === n0; k++) { settle(g); play(g, 10, ['rest', 'work'], {}, 1); }
  ok((seen.scenes.aftermath_night ?? 0) > n0, 'natural nightmare');
  // 싸운 적 없는 사람에게는 오지 않는다
  const h = adult(61);
  for (let k = 0; k < 4; k++) { settle(h); play(h, 12, ['rest', 'work'], {}, 1); }
  ok(aftermathState(h).nights === 0, 'no nightmares for civilians');
}

// 6) 전우 모임과 부탁
{
  let lent = 0, refused = 0, other = 0;
  for (let t = 0; t < 4; t++) {
    const g = adult(70 + t);
    const a = armyOf(g);
    a.veteran = { rank: 1, years: 3, pension: 0, unit: '둘째 백인대', year: g.date.year - 1 };
    a.battles = 3;
    a.comrades.push({ name: '갑돌', alive: true, how: '' }, { name: '을수', alive: true, how: '' }, { name: '병철', alive: false, how: '전사' });
    const m0 = g.player.money;
    if (scene(g, 'aftermath_reunion', { names: ['갑돌', '을수'], asker: '갑돌', fallen: '병철', favor: 'loan' }, idxOf(/빌려준다/)) && g.player.money <= m0 - 15) lent++;
    if (scene(g, 'aftermath_reunion', { names: ['갑돌', '을수'], asker: '을수', fallen: '병철', favor: 'mother' }, idxOf(/거절/))) refused++;
    for (const f of ['mother', 'deserter', 'son']) if (scene(g, 'aftermath_reunion', { names: ['갑돌'], asker: '갑돌', fallen: '병철', favor: f }, idxOf(/들어준다/))) other++;
    ok(aftermathState(g).favors >= 1, 'favors counted');
    checkInfo(g);
  }
  ok(lent >= 3 && refused >= 3 && other >= 9, `lent ${lent} refused ${refused} other ${other}`);
  // 해마다 저절로 모인다
  const g = adult(79);
  const a = armyOf(g);
  a.veteran = { rank: 1, years: 3, pension: 0, unit: '둘째 백인대', year: g.date.year - 1 };
  a.battles = 3;
  a.comrades.push({ name: '갑돌', alive: true, how: '' }, { name: '병철', alive: false, how: '전사' });
  const n0 = seen.scenes.aftermath_reunion ?? 0;
  for (let k = 0; k < 6 && (seen.scenes.aftermath_reunion ?? 0) === n0; k++) { settle(g); play(g, 12, ['rest', 'work'], {}, 1); }
  ok((seen.scenes.aftermath_reunion ?? 0) > n0, 'natural reunion');
}

// 7) 상이군인 청원
{
  let granted = 0, avail = 0;
  for (let t = 0; t < 5; t++) {
    const g = adult(80 + t, { place: 'leocast' });
    const a = armyOf(g);
    a.scars.push({ id: 'limp', name: '절뚝이는 다리', year: g.date.year - 1 }, { id: 'eye', name: '흐려진 한쪽 눈', year: g.date.year - 1 });
    a.medals.push({ name: '은빛 방패', year: g.date.year - 1 });
    a.veteran = { rank: 2, years: 5, pension: 2, unit: '첫째 백인대', year: g.date.year - 1 };
    g.player.stats.cha = 60;
    if (act(g, 'aftermath_petition')) avail++;
    if (a.veteran?.pension > 2) granted++;
    ok(aftermathState(g).petitioned && !availableActions(g).some((x) => x.id === 'aftermath_petition'), 'petition once');
  }
  ok(avail >= 4 && granted >= 2, `petition ${avail} granted ${granted}`);
  const h = adult(89, { place: 'leocast' });
  ok(!availableActions(h).some((x) => x.id === 'aftermath_petition'), 'no petition without scars');
}

// 8) 행방불명자가 돌아온다
{
  let came = 0;
  for (let t = 0; t < 3; t++) {
    const g = adult(90 + t);
    const v = aftermathState(g);
    const ps = [];
    for (let i = 0; i < 6; i++) { const p = person(g, { sex: 'm', age: 30 }); p.away = true; v.missing.push({ pid: p.id, war: '발하르트 전쟁', y: g.date.year }); ps.push(p); }
    for (let k = 0; k < 8; k++) { settle(g); play(g, 12, ['rest', 'work'], {}, 1); }
    came += ps.filter((p) => p.alive && !p.away && p.warVet).length;
  }
  ok(came >= 2, `missing came back ${came}`);
}

// 9) 대 잇기와 옛 저장
{
  const g = adult(100, { age: 60 });
  const v = aftermathState(g);
  v.drink = 60; v.nights = 9; v.petitioned = true; v.owed = 15;
  const w = person(g, { sex: 'f', age: 30 });
  v.widows.push({ pid: w.id, husband: '돌쇠', war: '발하르트 전쟁', y: 500 });
  v.ruins.ern = { damage: 40, war: '발하르트 전쟁', y: g.date.year, helped: 3 };
  runHooks('heir', g, rngOf(g), g.player);
  ok(v.drink === 0 && v.nights === 0 && !v.petitioned && v.owed === 0, 'heir reset');
  ok(v.log.some((x) => /선대/.test(x.text)), 'heir log');
  ok(v.ruins.ern && v.widows.length === 1, 'world things stay');
  const old = JSON.parse(JSON.stringify(g)); delete old.aftermath;
  runHooks('migrate', old);
  ok(old.aftermath && Array.isArray(old.aftermath.drafted) && old.aftermath.owed === 0, 'old save aftermath');
  checkInfo(g);
}

// 10) 여러 삶 (전쟁은 세계가 알아서 일으킨다)
let lives = 0, wars = 0, draftedAll = 0;
for (let run = 0; run < 10; run++) {
  const g = adult(1000 + run, { age: 16 + (run % 4) * 8 });
  if (run % 2) { const a = armyOf(g); a.veteran = { rank: 1, years: 3, pension: 1, unit: '넷째 백인대', year: g.date.year }; a.battles = 2; a.comrades.push({ name: '덕배', alive: true, how: '' }); a.scars.push({ id: 'ringing', name: '귀에서 그치지 않는 북소리', year: g.date.year }); }
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.3);
  if ((L(g).gen ?? 1) > start) lives++;
  wars += aftermathState(g).wars.length;
  draftedAll += aftermathState(g).wars.reduce((s, w) => s + w.back.length + w.dead.length + w.maimed.length + w.missing.length, 0);
  checkInfo(g);
}
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'aftermath_rebuild', 'aftermath_aid'], {}, 0.4);
  wars += aftermathState(g).wars.length;
  checkInfo(g);
}

for (const k of ['aftermath_rebuild', 'aftermath_aid', 'aftermath_sober', 'aftermath_petition']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['aftermath_return', 'aftermath_aid', 'aftermath_widow', 'aftermath_foreigner', 'aftermath_night', 'aftermath_reunion']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('aftermath_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('aftermath_')))));
console.log(`대를 이은 삶 ${lives}/10, 끝난 전쟁 ${wars}, 전쟁에 끌려갔던 사람 ${draftedAll}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `aftermathtest: ${fail} 실패` : 'aftermathtest: 통과');
process.exit(fail ? 1 : 0);
