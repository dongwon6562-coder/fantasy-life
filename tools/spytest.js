import './lsshim.js';
import '../src/content.js';
// 첩보와 밀정 점검: 포섭(받아들임·거절·값 올리기), 스스로 찾아가기, 훈련과 가짜 신분, 임무 다섯(조심·대담·그르치기·거절),
// 붙잡힘(버팀·이름 대기·달아남·매수), 알아보는 눈, 이중간첩(시험·고르기·배신), 떠나기(순순히·쫓기기·죽은 척·문서 흥정),
// 쫓는 손, 대 잇기, 옛 저장, 여러 삶.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { spyState, spyInfo } from '../src/spy/index.js';
import { makePerson } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['spy_seek', 'spy_train', 'spy_cover', 'spy_task', 'spy_quit', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern', sex } = {}) {
  const g = newGame({ name: '바우', sex: sex ?? (seed % 2 ? 'm' : 'f'), familyId: 'farmer', mode: 'free', seed });
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
    if (/^spy_/.test(kind) && samples.length < 34 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
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
      if (/밀정|첩보|연락책|가짜 신분|조직/.test(r.name ?? '') && samples.length < 34 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`);
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
const V = spyState;
const checkInfo = (g) => {
  const info = spyInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `spyInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};
// 조직에 들어간 사람을 바로 만든다
function agent(seed, { place = 'leocast', org = 'crown', trained = 40, trust = 50, known = 10, rank = 1 } = {}) {
  const g = adult(seed, { place });
  for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 30);
  scene(g, 'spy_recruit', { org, how: 'approach' }, idxOf(/받아들/));
  const o = V(g).org;
  if (o) Object.assign(o, { trained, trust, known, rank });
  return g;
}

// 1) 포섭
{
  const g = adult(1, { place: 'leocast' });
  ok(scene(g, 'spy_recruit', { org: 'crown', how: 'approach' }, idxOf(/받아들/)), 'recruit scene');
  ok(V(g).org?.key === 'crown' && V(g).org.handler, 'joined crown');
  ok(checkInfo(g).org?.name, 'info org');
  const h = adult(2, { place: 'leocast' });
  scene(h, 'spy_recruit', { org: 'church', how: 'legacy', legacy: '저울추 모임' }, idxOf(/거절/));
  ok(!V(h).org, 'refused');
  let haggle = 0;
  for (let t = 0; t < 6; t++) { const k = adult(3 + t, { place: 'harfen' }); k.player.stats.cha = 60; scene(k, 'spy_recruit', { org: 'guild', how: 'seek' }, idxOf(/값을/)); if (V(k).org) haggle++; }
  ok(haggle >= 2, `haggle ${haggle}`);
  // 대귀족 가문
  const d = adult(10, { place: 'leocast' }); scene(d, 'spy_recruit', { org: 'house', how: 'approach' }, idxOf(/받아들/));
  ok(V(d).org && ['house', 'guild'].includes(V(d).org.key), 'house org');
  // 스스로 찾아가기
  let sought = 0;
  for (let t = 0; t < 6; t++) { const k = adult(20 + t, { place: 'leocast' }); k.player.stats.int = 60; k.player.stats.sen = 50; act(k, 'spy_seek', { spy_recruit: idxOf(/받아들/) }); resolveAll(k, { spy_recruit: idxOf(/받아들/) }); play(k, 1, ['rest'], { spy_recruit: idxOf(/받아들/) }, 1); if (V(k).org) sought++; }
  ok(sought >= 2, `seek joined ${sought}`);
  const e = adult(30, { place: 'ern' }); e.player.stats.int = 60;
  ok(!availableActions(e).some((a) => a.id === 'spy_seek'), 'no seek in village');
}

// 2) 훈련과 가짜 신분
{
  const g = agent(40, { trained: 0 });
  resolveAll(g); settle(g);
  ok(!availableActions(g).some((a) => a.id === 'spy_task'), 'no task untrained');
  const t0 = V(g).org.trained;
  act(g, 'spy_train');
  ok(V(g).org.trained > t0, 'trained up');
  act(g, 'spy_cover');
  ok(V(g).cover?.name, 'cover made');
  const d0 = V(g).cover.depth; act(g, 'spy_cover'); ok(V(g).cover.depth > d0, 'cover deepened');
  ok(checkInfo(g).cover?.trade, 'info cover');
}

// 3) 임무
{
  let done = 0, failed = 0;
  for (const m of ['letter', 'extract', 'rumor', 'watch']) {
    for (let t = 0; t < 5; t++) {
      const g = agent(50 + t * 7 + m.length, { trained: 60 });
      const n0 = V(g).org.missions;
      scene(g, 'spy_job', { mission: m, target: '외국 사절의 숙소', foe: 'valhart' }, t % 2 ? idxOf(/대담/) : idxOf(/조심/));
      if (V(g).org && V(g).org.missions > n0) done++; else failed++;
    }
  }
  ok(done >= 8 && failed >= 1, `missions ${done}/${failed}`);
  const g = agent(70); const tr = V(g).org.trust;
  scene(g, 'spy_job', { mission: 'letter', target: '세관장의 장부 상자', foe: 'holy' }, idxOf(/그르친/));
  ok(V(g).org.trust < tr, 'sabotage lowers trust');
  const r = agent(71, { trust: 5 });
  scene(r, 'spy_job', { mission: 'rumor', target: '곡물 창고가 비었다는 말', foe: 'holy' }, idxOf(/거절/));
  ok(!V(r).org && V(r).hunt, 'refuse at low trust burns');
  // 배신자 처리
  const b = agent(72, { rank: 2 }); scene(b, 'spy_job', { mission: 'burn', target: '돈을 받고 이름을 판 동료', foe: 'holy' }, idxOf(/시킨 대로/));
  ok(V(b).org?.known >= 30, 'burn raises known');
  const w = agent(73, { rank: 2 }); scene(w, 'spy_job', { mission: 'burn', target: '돈을 받고 이름을 판 동료', foe: 'holy' }, idxOf(/귀띔/));
  ok(seen.scenes.spy_job > 0, 'warn path');
  // 일 받기 행동
  const k = agent(74); act(k, 'spy_task'); resolveAll(k);
  ok(seen.acts.spy_task > 0, 'task action');
  // 승급
  const u = agent(75, { trained: 90, trust: 80, rank: 0 }); V(u).org.missions = 13;
  scene(u, 'spy_job', { mission: 'watch', target: '궁정 마구간지기', foe: 'holy' }, idxOf(/조심/));
  ok(V(u).org.rank >= 2 || V(u).org.missions === 13, 'rank up on success');
}

// 4) 붙잡힘
{
  const picks = [/입을 다문/, /이름을 댄/, /달아난/, /돈으로/];
  const out = [0, 0, 0, 0];
  for (let t = 0; t < 12; t++) {
    const g = agent(80 + t);
    g.player.money = 100;
    scene(g, 'spy_caught', { mission: 'letter' }, idxOf(picks[t % 4]));
    if (t % 4 === 1 && !V(g).org && V(g).hunt) out[1]++;
    if (t % 4 !== 1 && (crimeState(g).jailed || crimeState(g).bounty)) out[t % 4]++;
  }
  ok(out[1] >= 2, `named org ${out}`);
  ok(out[0] + out[2] + out[3] >= 3, `caught outcomes ${out}`);
}

// 5) 알아보는 눈
{
  const opts = [/다른 고장/, /부인/, /빼내/];
  let moved = 0;
  for (let t = 0; t < 6; t++) {
    const g = agent(100 + t); act(g, 'spy_cover'); V(g).heat = 70;
    const pl = L(g).place;
    scene(g, 'spy_exposed', { who: t % 2 ? 'old' : 'search' }, idxOf(opts[t % 3]));
    if (t % 3 === 0 && L(g).place !== pl) moved++;
    if (t % 3 === 2) ok(V(g).heat < 70, 'extract lowers heat');
  }
  ok(moved >= 1, 'moved away');
}

// 6) 이중간첩
{
  const g = agent(120);
  scene(g, 'spy_turn', { realm: 'valhart' }, idxOf(/양쪽/));
  ok(V(g).dbl?.realm === 'valhart', 'turned');
  ok(checkInfo(g).dbl?.name, 'info dbl');
  scene(g, 'spy_double', { ev: 'test', bait: false }, idxOf(/넘긴다/));
  ok(V(g).dbl && V(g).org, 'passed test');
  const b = agent(121); scene(b, 'spy_turn', { realm: 'holy' }, idxOf(/양쪽/));
  scene(b, 'spy_double', { ev: 'test', bait: true }, idxOf(/넘긴다/));
  ok(!V(b).org && V(b).hunt, 'bait burns');
  const c = agent(122); scene(c, 'spy_turn', { realm: 'holy' }, idxOf(/양쪽/));
  scene(c, 'spy_double', { ev: 'choose' }, idxOf(/명단/));
  ok(V(c).org?.key === 'foreign' && V(c).hunt, 'defected');
  const d = agent(123); scene(d, 'spy_turn', { realm: 'holy' }, idxOf(/양쪽/));
  scene(d, 'spy_double', { ev: 'choose' }, idxOf(/원래/));
  ok(V(d).org?.key === 'crown' && !V(d).dbl, 'stayed');
  const e = agent(124); const tr = V(e).org.trust; scene(e, 'spy_turn', { realm: 'holy' }, idxOf(/알린다/));
  ok(V(e).org.trust > tr && !V(e).dbl, 'reported turn');
}

// 7) 떠나기와 쫓는 손
{
  const g = agent(130, { known: 10 });
  act(g, 'spy_quit', { spy_leave: idxOf(/고개를/) }); resolveAll(g, { spy_leave: idxOf(/고개를/) });
  if (V(g).org) scene(g, 'spy_leave', {}, idxOf(/고개를/));
  ok(!V(g).org && !V(g).hunt, 'let go easily');
  const h = agent(131, { known: 60 }); scene(h, 'spy_leave', {}, idxOf(/그래도/));
  ok(!V(h).org && V(h).hunt?.level >= 60, 'hunted after leaving');
  let faked = 0;
  for (let t = 0; t < 6; t++) { const k = agent(140 + t, { known: 60, trained: 80 }); act(k, 'spy_cover'); V(k).cover.depth = 90; scene(k, 'spy_leave', {}, idxOf(/죽은 척/)); if (!V(k).org && !V(k).hunt) faked++; }
  ok(faked >= 2, `faked death ${faked}`);
  let paper = 0;
  for (let t = 0; t < 6; t++) { const k = agent(150 + t, { known: 60 }); k.player.skills.letters = 40; V(k).org.missions = 4; scene(k, 'spy_leave', {}, idxOf(/문서/)); if (!V(k).org && (V(k).hunt?.level ?? 0) <= 10) paper++; }
  ok(paper >= 2, `paper deal ${paper}`);
  // 쫓는 손
  const evs = [['shadow', /따라가/], ['offer', /마지막/], ['knife', /맞서/], ['knife', /달아나/], ['knife', /돌아가/]];
  for (let t = 0; t < 10; t++) {
    const k = agent(160 + t, { known: 60 }); scene(k, 'spy_leave', {}, idxOf(/그래도/));
    const [ev, re] = evs[t % 5];
    k.player.stats.str = 50; k.player.skills.sword = 40;
    scene(k, 'spy_hunter', { ev }, idxOf(re));
    if (ev === 'knife' && t % 5 === 4) ok(V(k).org && !V(k).hunt, 'went back');
  }
  ok(seen.scenes.spy_hunter >= 8, 'hunter scenes');
}

// 8) 대 잇기, 옛 저장
{
  const g = agent(170, { known: 60 }); scene(g, 'spy_leave', {}, idxOf(/그래도/));
  V(g).hunt.level = 80;
  runHooks('heir', g, undefined, { ...g.player });
  ok(V(g).hunt && V(g).hunt.level < 80 && !V(g).org, 'heir inherits hunt');
  const k = agent(171); runHooks('heir', k, undefined, { ...k.player });
  ok(!V(k).org && V(k).legacy, 'heir legacy');
  const o = adult(172); delete o.spy; runHooks('migrate', o);
  ok(o.spy && o.spy.tally && o.spy.org === null, 'old save spy');
}

// 9) 여러 삶 (짧게)
let joined = 0, lives = 0;
for (let run = 0; run < 6; run++) {
  const pl = ['leocast', 'harfen', 'verden', 'ern', 'leocast', 'harfen'][run];
  const g = adult(1000 + run, { age: 20 + (run % 3) * 8, place: pl });
  g.player.stats.int = 40;
  const start = L(g).gen ?? 1;
  play(g, 12 * 15, ACTS, {}, 0.35);
  if ((L(g).gen ?? 1) > start) lives++;
  if (V(g).org || V(g).past.length) joined++;
  checkInfo(g);
}
for (let run = 0; run < 3; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6100 + run });
  play(g, 12 * 30, ['work', 'rest', 'spy_seek', 'spy_task'], {}, 0.4);
  checkInfo(g);
}
ok(joined >= 1, `joined in lives ${joined}`);

for (const k of ['spy_seek', 'spy_train', 'spy_cover', 'spy_task', 'spy_quit']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['spy_recruit', 'spy_job', 'spy_caught', 'spy_exposed', 'spy_turn', 'spy_double', 'spy_leave', 'spy_hunter']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('spy_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('spy_')))));
console.log(`조직에 몸담은 삶 ${joined}/6, 대를 이은 삶 ${lives}/6`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `spytest: ${fail} 실패` : 'spytest: 통과');
process.exit(fail ? 1 : 0);
