import './lsshim.js';
import '../src/content.js';
// 봉기와 반란 점검: 고장의 분노, 저절로 이는 봉기, 밤의 모임(가담·앞장·빠짐·일러바침), 부추기기, 곳간 털기, 진압하기,
// 반란군 안의 다툼·배신·협상, 꺾인 날(달아남·나섬·끝까지)과 교수대, 이긴 날과 새 질서, 새 질서가 썩는 일,
// 숨어 사는 잔당, 반역자의 자식, 대 잇기, 옛 저장, 여러 삶.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { revoltState, revoltInfo } from '../src/revolt/index.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['revolt_stir', 'revolt_raid', 'revolt_suppress', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern', sex } = {}) {
  const g = newGame({ name: '돌쇠', sex: sex ?? (seed % 2 ? 'm' : 'f'), familyId: 'farmer', mode: 'free', seed });
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
    if (/^revolt_/.test(kind) && samples.length < 34 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
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
      if (/부추|곳간|진압/.test(r.name ?? '') && samples.length < 34 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`);
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
const V = revoltState;
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const checkInfo = (g) => {
  const info = revoltInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `revoltInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};
// 봉기를 직접 세운다
function rising(g, { place = L(g).place, phase = 'brewing', me: role = null, str = 50, months = 0, leader } = {}) {
  const v = V(g);
  const lead = leader ?? (role === 'leader' ? 'me' : person(g, { age: 35, place }).id);
  const r = { id: v.seq++, place, leader: lead, start: g.date.year * 12 + g.date.month, phase, months, str, me: role, quarrel: false, parley: false, betray: false, cause: 'famine', called: true };
  v.risings.push(r);
  return r;
}

// 1) 분노가 끓으면 봉기가 저절로 인다 (플레이어 없이도)
{
  let n = 0;
  for (let t = 0; t < 5; t++) {
    const g = adult(1 + t);
    V(g).anger.verden = 90; V(g).anger.ern = 5;
    play(g, 24, ['rest', 'work'], {}, 1);
    if (V(g).risings.some((r) => r.place === 'verden') || V(g).past.some((x) => x.place === 'verden')) n++;
  }
  ok(n >= 3, `natural risings ${n}/5`);
  // 결말이 난다 (이김·꺾임)
  let ends = 0;
  for (let t = 0; t < 4; t++) {
    const g = adult(10 + t);
    rising(g, { place: 'verden', phase: 'up', months: 2, str: t % 2 ? 95 : 5 });
    play(g, 2, ['rest'], {}, 1);
    const p = V(g).past.find((x) => x.place === 'verden');
    if (p && (t % 2 ? p.out === 'won' : ['crushed', 'deal'].includes(p.out))) ends++;
  }
  ok(ends === 4, `rising outcomes ${ends}/4`);
}

// 2) 밤의 모임: 가담, 앞장, 빠짐, 일러바침
{
  const g = adult(20); g.player.stats.cha = 60;
  let r = rising(g);
  ok(scene(g, 'revolt_call', { rid: r.id }, idxOf(/함께하겠다/)), 'call join');
  ok(r.me === 'member' && V(g).tally.joined === 1, 'joined');
  const h = adult(21); h.player.stats.cha = 90; L(h).renown = 60;
  r = rising(h);
  ok(scene(h, 'revolt_call', { rid: r.id }, idxOf(/앞장/)), 'call lead');
  ok(r.me === 'leader' || r.me === 'member', `lead ${r.me}`);
  const k = adult(22); const m0 = k.player.money;
  r = rising(k); const s0 = r.str;
  ok(scene(k, 'revolt_call', { rid: r.id }, idxOf(/일러바친다/)), 'call inform');
  ok(k.player.money > m0 && r.str < s0 && V(k).tally.informed === 1, 'informed');
  const q = adult(23); r = rising(q);
  ok(scene(q, 'revolt_call', { rid: r.id }, idxOf(/빠진다/)), 'call out');
  ok(!r.me, 'stayed out');
  // 저절로 모임에 불린다
  let called = 0;
  for (let t = 0; t < 5; t++) {
    const w = adult(30 + t); const x = rising(w); x.called = false;
    const n0 = seen.scenes.revolt_call ?? 0;
    play(w, 2, ['rest'], {}, 1);
    if ((seen.scenes.revolt_call ?? 0) > n0) called++;
  }
  ok(called >= 2, `natural call ${called}/5`);
}

// 3) 부추기기: 분노가 오르고, 끓으면 내가 봉기를 이끈다
{
  const g = adult(40);
  ok(!has(g, 'revolt_stir'), 'stir needs anger');
  V(g).anger.ern = 40;
  ok(act(g, 'revolt_stir'), 'stir act');
  ok(V(g).anger.ern > 38, `stir raises ${V(g).anger.ern}`);
  const h = adult(41); h.player.stats.cha = 90; L(h).renown = 40; h.player.stats.agi = 100;
  let led = false;
  for (let k = 0; k < 8 && !led; k++) { V(h).anger.ern = 85; act(h, 'revolt_stir'); led = V(h).risings.some((r) => r.me === 'leader'); }
  ok(led, 'stir starts my rising');
  ok(!has(h, 'revolt_stir'), 'no stir while rising');
}

// 4) 곳간 털기와 진압하기
{
  const g = adult(50);
  const r = rising(g, { phase: 'up', me: 'member', str: 50 });
  ok(act(g, 'revolt_raid'), 'raid act');
  ok(V(g).tally.raids >= 1, 'raided');
  const h = adult(51); h.player.skills.sword = 40;
  rising(h, { phase: 'up', str: 50 });
  ok(has(h, 'revolt_suppress') && !has(adult(52), 'revolt_suppress'), 'suppress needs arms');
  ok(act(h, 'revolt_suppress'), 'suppress act');
  ok(V(h).tally.suppressed >= 1, 'suppressed');
  ok(checkInfo(g).mine?.role === '가담자', 'info mine');
}

// 5) 반란군 안의 일: 다툼, 배신, 협상
{
  for (const [i, re] of [[0, /성까지/], [1, /요구만/], [2, /달래/]]) {
    const g = adult(60 + i); const r = rising(g, { phase: 'up', me: 'member', months: 1 });
    const p = person(g, { age: 30 });
    ok(scene(g, 'revolt_quarrel', { rid: r.id, pid: p.id }, idxOf(re)), `quarrel ${i}`);
    ok(r.quarrel, `quarrel mark ${i}`);
  }
  {
    const g = adult(65); const r = rising(g, { phase: 'up', me: 'member' }); const m0 = g.player.money;
    ok(scene(g, 'revolt_betray', { rid: r.id, who: 'me' }, idxOf(/판다/)), 'betray sell');
    ok(g.player.money >= m0 + 50 && !r.me, 'sold');
    const h = adult(66); const x = rising(h, { phase: 'up', me: 'member' });
    ok(scene(h, 'revolt_betray', { rid: x.id, who: 'me' }, idxOf(/거절/)), 'betray refuse');
  }
  for (const [i, re] of [[0, /캐묻는다/], [1, /거짓 계획/], [2, /용서/]]) {
    const g = adult(67 + i); const p = person(g, { age: 30 }); const r = rising(g, { phase: 'up', me: 'leader' });
    r.second = p.id;
    ok(scene(g, 'revolt_betray', { rid: r.id, who: 'second', pid: p.id }, idxOf(re)), `betray second ${i}`);
  }
  for (const [i, re] of [[0, /받아들인다/], [1, /버틴다/], [2, /돌려보내고/]]) {
    const g = adult(70 + i); g.player.stats.cha = 80; const r = rising(g, { phase: 'up', me: i === 0 ? 'leader' : 'member', months: 2, str: 70 });
    ok(scene(g, 'revolt_parley', { rid: r.id }, idxOf(re)), `parley ${i}`);
    ok(r.parley, `parley mark ${i}`);
  }
}

// 6) 꺾인 날과 교수대
{
  const g = adult(80); g.player.stats.agi = 100; g.player.stats.sen = 80;
  ok(scene(g, 'revolt_crushed', { place: 'ern', role: 'member' }, idxOf(/달아나/)), 'crushed flee');
  ok(!!V(g).hidden || crimeState(g).jailed || L(g).queue.some((x) => x.kind === 'revolt_gallows'), 'fled or caught');
  ok(crimeState(g).record.some((x) => x.c === 'rebellion'), 'rebellion record');
  const h = adult(81);
  ok(scene(h, 'revolt_crushed', { place: 'ern', role: 'member' }, idxOf(/무기를 버리고/)), 'crushed yield');
  ok(!!crimeState(h).jailed, 'yield jailed');
  const k = adult(82); k.player.skills.sword = 5; k.player.stats.str = 5;
  ok(scene(k, 'revolt_crushed', { place: 'ern', role: 'leader' }, idxOf(/끝까지/)), 'crushed stand');
  ok(!!L(k).pendingDeath || k.over || L(k).queue.some((x) => x.kind === 'revolt_gallows') || !!V(k).hidden || !!crimeState(k).jailed, 'stand result');
  const w = adult(83);
  ok(scene(w, 'revolt_gallows', { place: 'ern' }, idxOf(/마지막 말/)), 'gallows words');
  ok(!!L(w).pendingDeath || w.over, 'hanged');
  ok(V(w).blood?.how === 'hanged', 'blood mark');
  const e = adult(84); e.player.stats.agi = 100; e.player.stats.sen = 100;
  scene(e, 'revolt_gallows', { place: 'ern' }, idxOf(/틈을/));
  ok(!!V(e).hidden || !!L(e).pendingDeath || e.over, 'gallows escape or death');
  // 내가 낀 봉기가 꺾이면 장면이 뜬다
  const n = adult(85); rising(n, { phase: 'up', me: 'member', months: 2, str: 5 });
  play(n, 2, ['rest'], { revolt_crushed: idxOf(/무기를 버리고/) }, 1);
  ok((seen.scenes.revolt_crushed ?? 0) >= 4, 'crushed scene from flow');
}

// 7) 이긴 날과 새 질서, 새 질서가 썩는 일
{
  for (const [i, re] of [[0, /회의를 세우고/], [1, /의자에 앉는다/], [2, /물러난다/]]) {
    const g = adult(90 + i); rising(g, { phase: 'up', me: 'leader', months: 2, str: 95 });
    play(g, 2, ['rest'], { revolt_won: idxOf(re) }, 1);
    const o = V(g).orders.find((x) => x.place === 'ern');
    ok(!!o, `order made ${i}`);
    ok(i === 2 ? !o?.mine : o?.mine, `order mine ${i}`);
    if (i === 0) {
      ok(checkInfo(g).order?.placeName, 'info order');
      for (const [ev, re2] of [['skim', /바로잡는다/], ['tax', /눈감아/], ['purge', /내쫓는다/]]) { o.rot = 40; ok(scene(g, 'revolt_rot', { place: 'ern', ev }, idxOf(re2)), `rot ${ev}`); }
      // 저절로 썩어 가고 분노가 다시 쌓인다
      o.rot = 80; V(g).anger.ern = 20;
      play(g, 24, ['rest', 'work'], { revolt_rot: idxOf(/눈감아/) }, 1);
      ok(V(g).anger.ern > 20 || o.ended || (seen.scenes.revolt_rot ?? 0) > 3, `rot feeds anger ${V(g).anger.ern}`);
    }
  }
  const g = adult(95); rising(g, { phase: 'up', me: 'member', months: 2, str: 95 });
  play(g, 2, ['rest'], { revolt_won: idxOf(/회의에 들어간다/) }, 1);
  ok(V(g).orders.find((x) => x.place === 'ern')?.member, 'member joins council');
}

// 8) 숨어 사는 잔당
{
  for (const [ev, re] of [['hunter', /뒷문/], ['hunter', /은화로/], ['hunter', /덮친다/], ['neighbor', /털어놓고/], ['neighbor', /떠난다/], ['comrade', /다시 일어선다/], ['comrade', /조용히/]]) {
    const g = adult(100); V(g).hidden = { from: 'harfen', y: g.date.year, heat: 60, name: '돌쇠' };
    ok(scene(g, 'revolt_hunted', { ev }, idxOf(re)), `hunted ${ev}`);
  }
  const g = adult(105); V(g).hidden = { from: 'harfen', y: g.date.year, heat: 3, name: '돌쇠' };
  ok(checkInfo(g).hidden?.word, 'info hidden');
  play(g, 12, ['rest', 'work'], { revolt_hunted: 0 }, 1);
  ok(!V(g).hidden, 'hidden fades');
  let n = 0;
  for (let t = 0; t < 4; t++) { const h = adult(110 + t); V(h).hidden = { from: 'harfen', y: h.date.year, heat: 90, name: '돌쇠' }; const n0 = seen.scenes.revolt_hunted ?? 0; play(h, 36, ['rest', 'work'], {}, 1); if ((seen.scenes.revolt_hunted ?? 0) > n0) n++; }
  ok(n >= 2, `natural hunted ${n}/4`);
}

// 9) 반역자의 자식, 대 잇기
{
  const g = adult(120);
  V(g).blood = { by: '옛돌쇠', place: 'ern', y: g.date.year - 20, how: 'hanged', seen: false };
  ok(scene(g, 'revolt_legacy', {}, idxOf(/자랑스럽게/)), 'legacy proud');
  ok(V(g).blood.seen, 'legacy seen');
  const h = adult(121); rising(h, { phase: 'up', me: 'leader' }); V(h).hidden = { from: 'harfen', y: h.date.year, heat: 50, name: '돌쇠' };
  V(h).orders.push({ place: 'klein', by: '돌쇠', pid: null, mine: true, y: h.date.year, rot: 10, ended: false });
  runHooks('heir', h, rngOf(h), { ...h.player });
  ok(!V(h).risings.some((r) => r.me) && !V(h).hidden && !V(h).orders.some((o) => o.mine), 'heir clears');
  const k = adult(122); delete k.revolt; runHooks('migrate', k);
  ok(k.revolt && k.revolt.anger.ern != null && Array.isArray(k.revolt.risings), 'old save revolt');
}

// 10) 여러 삶
let lives = 0, total = 0, mine = 0;
for (let run = 0; run < 10; run++) {
  const pl = ['ern', 'harfen', 'verden', 'leocast', 'klein'][run % 5];
  const g = adult(1000 + run, { age: 18 + (run % 4) * 7, place: pl });
  if (run % 2) for (const p of Object.keys(V(g).anger)) V(g).anger[p] = 60;
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.3);
  if ((L(g).gen ?? 1) > start) lives++;
  total += V(g).past.length; mine += V(g).tally.joined;
  checkInfo(g);
}
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'revolt_stir', 'revolt_raid', 'revolt_suppress'], {}, 0.4);
  total += V(g).past.length;
  checkInfo(g);
}

for (const k of ['revolt_stir', 'revolt_raid', 'revolt_suppress']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['revolt_call', 'revolt_quarrel', 'revolt_betray', 'revolt_parley', 'revolt_crushed', 'revolt_gallows', 'revolt_won', 'revolt_rot', 'revolt_hunted', 'revolt_legacy']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('revolt_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('revolt_')))));
console.log(`대를 이은 삶 ${lives}/10, 끝난 봉기 ${total}, 가담 ${mine}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `revolttest: ${fail} 실패` : 'revolttest: 통과');
process.exit(fail ? 1 : 0);
