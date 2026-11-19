import './lsshim.js';
import '../src/content.js';
// 비밀과 이중생활 점검: 숨겨 둔 아이(밝히기·숨기기·부정, 자라서 찾아옴), 바꾼 이름, 두 집 살림, 밤의 얼굴(의적·밀정·이단·내려놓기),
// 아는 사람과 입막음(돈·으름장·애원·영원히), 들통(털어놓기·잡아떼기)과 그 뒤, 저절로 생기는 아는 사람과 들통,
// 대 잇기(선대의 가면·다른 이름, 배다른 형제), 옛 저장, 여러 삶.
// 난수가 밀려도 갈리지 않게, 장면은 형편을 직접 맞추고 띄운다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { secretState, secretInfo } from '../src/secret/index.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { loveState, WISHES } from '../src/love/index.js';
import { faithState } from '../src/faith/index.js';
import { courtState } from '../src/court/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['secret_alias', 'secret_twohome', 'secret_mask', 'secret_night', 'secret_unmask', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern', sex } = {}) {
  const g = newGame({ name: '숨긴이', sex: sex ?? (seed % 2 ? 'm' : 'f'), familyId: 'farmer', mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = place; L(g).home = 'family';
  g.player.money = 300; g.player.familyMoney = 300;
  homePlace.set(g, place);
  return g;
}
function person(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: (opts.age ?? 28) * 12, job: opts.job ?? 'farmer', sex: opts.sex });
  p.known = true; p.place = opts.place ?? homePlace.get(g) ?? 'ern'; p.affection = opts.aff ?? 20; p.childIds ??= []; g.people.push(p);
  return p;
}
function marry(g) {
  const sp = person(g, { sex: me(g).sex === 'm' ? 'f' : 'm', age: playerAge(g), aff: 60 });
  me(g).spouseId = sp.id; sp.spouseId = me(g).id;
  if (!g.player.familyIds.includes(sp.id)) g.player.familyIds.push(sp.id);
  loveState(g).spouse = { id: sp.id, wish: Object.keys(WISHES)[0], wishAt: 0, wishDone: 0, mood: 60, arranged: false, since: 0, timeAt: 0, quarrels: 0, cheated: false };
  return sp;
}
function affair(g, opts = {}) {
  const p = person(g, { sex: me(g).sex === 'm' ? 'f' : 'm', age: 26, aff: 60, ...opts });
  p.bond = 'lover'; p.romance = 70;
  loveState(g).affair = { id: p.id, at: 0, risk: 0 };
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
    if (/^secret_/.test(kind) && samples.length < 34 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
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
      if (/밤일|다른 이름|두 집|가면/.test(r.name ?? '') && samples.length < 34 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`);
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
const sec = (g, kind) => secretState(g).list.find((s) => s.kind === kind && !s.out && s.gen === 0);
const checkInfo = (g) => {
  const info = secretInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `secretInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};

// 1) 숨겨 둔 아이: 숨기기, 밝히기, 부정하기 (남녀 모두)
{
  let hid = 0, owned = 0, denied = 0;
  for (let t = 0; t < 4; t++) {
    const sex = t % 2 ? 'f' : 'm';
    const g = adult(10 + t, { sex });
    const sp = marry(g);
    const p = affair(g);
    if (scene(g, 'secret_bastard', { pid: p.id }, (pe) => { return idxOf(/달마다/)(pe); })) {
      const s = sec(g, 'bastard');
      if (!s) { console.log('DBG', sex, JSON.stringify(me(g).childIds), JSON.stringify(g.people.filter((x) => x.hiddenParent).map((x) => x.name)), g.lastResults.map((r) => r.text).join('/').slice(0, 300)); continue; }
      const kid = s && byId(g, s.pid);
      if (kid && kid.hiddenParent === me(g).id && !me(g).childIds.includes(kid.id)) hid++;
      g.player.money = 0; g.player.familyMoney = 0;
      const r0 = s.risk;
      play(g, 2, ['rest'], { love_caught: idxOf(/다시는/) }, 1);
      ok(s.risk >= r0 + 4 || s.out, `unpaid upkeep raises risk ${r0}→${s.risk}`);
      g.player.money = 300;
      ok(checkInfo(g).hiddenKids.length === 1 || s.out, `info hidden kid ${JSON.stringify(s)} ${kid.alive}`);
    }
    if (!loveState(g).spouse || !byId(g, me(g).spouseId)?.alive) continue;
    const q = affair(g);
    const mood0 = loveState(g).spouse.mood;
    if (scene(g, 'secret_bastard', { pid: q.id }, idxOf(/떳떳이/))) {
      const kid = byId(g, q.childIds[q.childIds.length - 1]);
      if (kid && me(g).childIds.includes(kid.id) && loveState(g).spouse.mood < mood0) owned++;
    }
    const r = affair(g);
    const a0 = r.affection;
    if (scene(g, 'secret_bastard', { pid: r.id }, (pe) => pe.choices.length - 1) && r.affection < a0) denied++;
    ok(sp.alive, 'spouse fine');
  }
  ok(hid >= 3 && owned >= 3 && denied >= 3, `bastard hid ${hid} owned ${owned} denied ${denied}`);
}

// 2) 숨긴 아이가 자라서 찾아온다
{
  let came = 0, took = 0;
  for (let t = 0; t < 3; t++) {
    const g = adult(20 + t, { sex: 'm', age: 50 });
    marry(g);
    const p = affair(g);
    scene(g, 'secret_bastard', { pid: p.id }, idxOf(/달마다/));
    const s = sec(g, 'bastard');
    if (!s) continue;
    const kid = byId(g, s.pid);
    kid.ageMonths = 16 * 12;
    if (scene(g, 'secret_child', { sid: s.id, pid: kid.id, otherName: s.otherName }, idxOf(/받아들인다/))) came++;
    if (me(g).childIds.includes(kid.id) && s.out) took++;
  }
  ok(came >= 2 && took >= 2, `child came ${came} took ${took}`);
  // 저절로 찾아온다
  const g = adult(25, { sex: 'm', age: 50 });
  const p = affair(g);
  scene(g, 'secret_bastard', { pid: p.id }, idxOf(/달마다/));
  const s = sec(g, 'bastard');
  ok(!!s, 'unmarried hidden kid');
  if (s) {
    byId(g, s.pid).ageMonths = 17 * 12;
    s.risk = 0;
    const n0 = seen.scenes.secret_child ?? 0;
    for (let k = 0; k < 8 && (seen.scenes.secret_child ?? 0) === n0; k++) { settle(g); s.risk = Math.min(s.risk, 10); play(g, 12, ['rest', 'work'], { secret_child: idxOf(/잘못 찾았다/) }, 1); }
    ok((seen.scenes.secret_child ?? 0) > n0, 'natural child visit');
  }
}

// 3) 바꾼 이름: 태어난 곳을 떠나야 하고, 악명이 옅어지고, 들키면 돌아온다
{
  const g0 = adult(30);
  ok(!availableActions(g0).some((a) => a.id === 'secret_alias'), 'no alias at birthplace');
  let done = 0, back = 0;
  for (let t = 0; t < 3; t++) {
    const g = adult(31 + t);
    homePlace.set(g, 'leocast'); settle(g);
    L(g).notoriety = 50;
    ok(act(g, 'secret_alias', { secret_alias: idxOf(/기사 집안/) }), 'alias action');
    const v = secretState(g);
    if (!v.alias) { resolveAll(g, { secret_alias: idxOf(/기사 집안/) }); }
    if (v.alias && L(g).notoriety < 30 && sec(g, 'alias')) done++;
    ok(checkInfo(g).alias?.name, 'info alias');
    const s = sec(g, 'alias');
    if (s && scene(g, 'secret_exposed', { sid: s.id, who: '옛 동무' }, idxOf(/털어놓는다/)) && !v.alias && L(g).notoriety >= 40 && s.out) back++;
  }
  ok(done >= 2 && back >= 2, `alias done ${done} exposed ${back}`);
}

// 4) 두 집 살림
{
  let made = 0, broke = 0;
  for (let t = 0; t < 4; t++) {
    const g = adult(40 + t);
    marry(g);
    affair(g);
    ok(act(g, 'secret_twohome'), 'twohome action');
    const s = sec(g, 'twohome');
    if (!s) continue;
    made++;
    const m0 = g.player.money;
    loveState(g).affair.risk = 0;
    play(g, 2, ['rest'], {}, 1);
    ok(g.player.money <= m0, 'twohome upkeep');
    loveState(g).spouse.mood = 10;
    if (scene(g, 'secret_exposed', { sid: s.id, who: '심부름꾼' }, idxOf(/잡아뗀다/)) && (s.out || s.risk < 50)) broke++;
  }
  ok(made >= 3 && broke >= 3, `twohome made ${made} exposed ${broke}`);
  // 연인이 끝나면 그 집도 정리된다
  const g = adult(49);
  marry(g); affair(g);
  act(g, 'secret_twohome');
  const s = sec(g, 'twohome');
  loveState(g).affair = null;
  play(g, 1, ['rest'], {}, 1);
  ok(!s || s.out, 'twohome ends with affair');
}

// 5) 밤의 얼굴: 의적, 밀정, 이단, 내려놓기
{
  const kinds = { robin: /의적/, spy: /밀정/, heretic: /이단/ };
  let n = 0;
  for (const [k, re] of Object.entries(kinds)) {
    for (let t = 0; t < 2; t++) {
      const g = adult(50 + n++, { place: k === 'spy' ? 'leocast' : 'ern' });
      g.player.stats.agi = 50; g.player.stats.int = 50; g.player.stats.sen = 40;
      ok(act(g, 'secret_mask', { secret_mask: idxOf(re) }), `mask action ${k}`);
      const v = secretState(g);
      if (!v.mask) resolveAll(g, { secret_mask: idxOf(re) });
      ok(v.mask?.kind === k, `mask kind ${k} ${v.mask?.kind}`);
      if (!v.mask) continue;
      const s0 = faithState(g).suspicion;
      for (let i = 0; i < 4 && v.mask; i++) { const ms = sec(g, 'mask'); if (ms) ms.risk = 0; v.mask.heat = 0; act(g, 'secret_night'); }
      if (!v.mask) { ok(false, `mask lost ${k}`); continue; }
      ok(v.mask.deeds >= 2, `night deeds ${k} ${v.mask.deeds}`);
      if (k === 'heretic') ok(faithState(g).suspicion > s0, 'heretic suspicion');
      ok(checkInfo(g).mask?.name, 'info mask');
      ok(act(g, 'secret_unmask'), 'unmask');
      ok(v.mask.hung && !availableActions(g).some((a) => a.id === 'secret_night'), 'mask hung');
      const s = sec(g, 'mask');
      if (t === 1 && s) {
        const before = crimeState(g).record?.length ?? 0;
        scene(g, 'secret_exposed', { sid: s.id, who: '경비대 끄나풀' }, idxOf(/털어놓는다/));
        ok(s.out, `mask exposed ${k}`);
        if (k === 'spy') ok(courtState(g).disgrace > 0, 'spy disgrace');
        if (k === 'robin') ok((crimeState(g).record?.length ?? 0) > before || Object.keys(crimeState(g).bounty ?? {}).length || crimeState(g).jailed, 'robin crime');
      }
    }
  }
}

// 6) 아는 사람과 입막음
{
  const res = { pay: 0, threat: 0, plead: 0, kill: 0 };
  const re = { pay: /은화 열두/, threat: /가만두지/, plead: /털어놓고/, kill: /영원히/ };
  let seed = 60;
  for (const k of Object.keys(res)) {
    for (let t = 0; t < 3; t++) {
      const g = adult(seed++);
      g.player.stats.str = 60; g.player.stats.cha = 60; g.player.stats.agi = 50; g.player.stats.int = 50;
      const p = affair(g);
      scene(g, 'secret_bastard', { pid: p.id }, idxOf(/달마다/));
      const s = sec(g, 'bastard');
      if (!s) continue;
      const kn = person(g, { aff: k === 'plead' ? 50 : 0 });
      s.knowers.push(kn.id);
      s.risk = 20;
      if (!scene(g, 'secret_knower', { sid: s.id, pid: kn.id, greedy: false }, idxOf(re[k]))) continue;
      if (k === 'kill') { if (!kn.alive && secretState(g).silenced === 1) res.kill++; }
      else if (!s.knowers.includes(kn.id) || s.risk > 20) res[k]++;
    }
  }
  ok(res.pay >= 2 && res.threat >= 2 && res.plead >= 2 && res.kill >= 2, `knower ${JSON.stringify(res)}`);
  // 욕심 많은 사람은 다달이 뜯어 간다
  const g = adult(70);
  const p = affair(g);
  scene(g, 'secret_bastard', { pid: p.id }, idxOf(/달마다/));
  const s = sec(g, 'bastard');
  if (s) {
    const kn = person(g, { aff: 0 });
    s.knowers.push(kn.id);
    scene(g, 'secret_knower', { sid: s.id, pid: kn.id, greedy: true }, idxOf(/은화 열두/));
    ok(s.paid === 1 && s.knowers.includes(kn.id), 'greedy keeps knowing');
  }
}

// 7) 저절로: 아는 사람이 생기고, 찾아오고, 들통난다
{
  let knew = 0, visits = 0, exposed = 0;
  for (let t = 0; t < 4; t++) {
    const g = adult(80 + t);
    for (let i = 0; i < 8; i++) person(g, { aff: 10 });
    const p = affair(g);
    scene(g, 'secret_bastard', { pid: p.id }, idxOf(/달마다/));
    const s = sec(g, 'bastard');
    if (!s) continue;
    const k0 = seen.scenes.secret_knower ?? 0, e0 = seen.scenes.secret_exposed ?? 0;
    for (let k = 0; k < 10 && !s.out; k++) { settle(g); play(g, 12, ['rest', 'work'], { secret_exposed: 0, secret_knower: idxOf(/털어놓고/) }, 1); if (s.knowers.length) knew++; }
    if ((seen.scenes.secret_knower ?? 0) > k0) visits++;
    if ((seen.scenes.secret_exposed ?? 0) > e0 || s.out) exposed++;
    checkInfo(g);
  }
  ok(knew >= 2, `knowers appear ${knew}`);
  ok(visits >= 1, `knower visits ${visits}`);
  ok(exposed >= 2, `natural exposure ${exposed}`);
  // 높은 말솜씨로 잡아떼기
  let denied = 0;
  for (let t = 0; t < 4; t++) {
    const g = adult(90 + t);
    g.player.stats.cha = 95; g.player.stats.int = 95;
    const p = affair(g);
    scene(g, 'secret_bastard', { pid: p.id }, idxOf(/달마다/));
    const s = sec(g, 'bastard');
    if (!s) continue;
    s.risk = 10;
    scene(g, 'secret_exposed', { sid: s.id, who: '이웃 하나' }, idxOf(/잡아뗀다/));
    if (!s.out) denied++;
  }
  ok(denied >= 2, `deny works ${denied}`);
}

// 8) 대 잇기: 선대의 가면과 숨긴 아이
{
  let legacy = 0, took = 0, sib = 0;
  for (let t = 0; t < 3; t++) {
    const g = adult(100 + t, { sex: 'm', age: 60 });
    g.player.stats.agi = 50;
    const p = affair(g);
    scene(g, 'secret_bastard', { pid: p.id }, idxOf(/달마다/));
    const s = sec(g, 'bastard');
    act(g, 'secret_mask', { secret_mask: idxOf(/의적/) });
    if (!secretState(g).mask) resolveAll(g, { secret_mask: idxOf(/의적/) });
    const name = secretState(g).mask?.name;
    if (s) byId(g, s.pid).ageMonths = 20 * 12;
    runHooks('heir', g, rngOf(g), { ...g.player });
    ok(!secretState(g).mask, 'mask not carried');
    ok(!s || s.gen === 1, 'secret inherited');
    if (L(g).queue.some((x) => x.kind === 'secret_legacy')) legacy++;
    me(g).ageMonths = 25 * 12;
    play(g, 1, ['rest'], { secret_legacy: idxOf(/두건을 쓴다/) }, 1);
    if (name && secretState(g).mask?.name === name) took++;
    if (s && scene(g, 'secret_halfsib', { sid: s.id, pid: s.pid, parent: s.parent ?? '선대', parentSex: 'm' }, idxOf(/형제로/)) && g.player.familyIds.includes(s.pid)) sib++;
    checkInfo(g);
  }
  ok(legacy >= 2 && took >= 2 && sib >= 2, `legacy ${legacy} took ${took} sib ${sib}`);
  // 바꾼 이름은 상자 속 증서로 남는다 (간직하면 편지 묶음에)
  const g = adult(110, { place: 'leocast' });
  homePlace.set(g, 'leocast');
  secretState(g).born = 'ern';
  act(g, 'secret_alias', { secret_alias: idxOf(/장사꾼/) });
  if (!secretState(g).alias) resolveAll(g, { secret_alias: idxOf(/장사꾼/) });
  runHooks('heir', g, rngOf(g), { ...g.player });
  const k0 = g.letters?.kept?.length ?? 0;
  play(g, 1, ['rest'], { secret_legacy: idxOf(/간직/) }, 1);
  ok((g.letters?.kept?.length ?? 0) > k0, 'alias kept in letters');
  ok(!secretState(g).alias, 'alias not carried');
  // 옛 저장
  const old = JSON.parse(JSON.stringify(g)); delete old.secret;
  runHooks('migrate', old);
  ok(old.secret && Array.isArray(old.secret.list), 'old save secret');
}

// 9) 여러 삶
let lives = 0, secrets = 0;
for (let run = 0; run < 10; run++) {
  const g = adult(1000 + run, { age: 18 + (run % 4) * 7 });
  if (run % 2) { marry(g); affair(g); }
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.3);
  if ((L(g).gen ?? 1) > start) lives++;
  secrets += secretState(g).list.length;
  checkInfo(g);
}
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'secret_night', 'secret_mask'], {}, 0.4);
  checkInfo(g);
}
ok(secrets >= 5, `secrets in lives ${secrets}`);

for (const k of ['secret_alias', 'secret_twohome', 'secret_mask', 'secret_night', 'secret_unmask']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['secret_bastard', 'secret_child', 'secret_alias', 'secret_mask', 'secret_knower', 'secret_exposed', 'secret_halfsib', 'secret_legacy']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('secret_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('secret_')))));
console.log(`대를 이은 삶 ${lives}/10, 쌓인 비밀 ${secrets}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `secrettest: ${fail} 실패` : 'secrettest: 통과');
process.exit(fail ? 1 : 0);
