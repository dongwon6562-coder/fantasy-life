import './lsshim.js';
import '../src/content.js';
// 28단계 도우미2 점검: 사절과 볼모. 말 배우기, 외교청, 협상(강화·국경 전쟁·조약), 외교 사고, 자식을 볼모로, 볼모로 자라는 아이,
// 두 나라 사이의 삶, 대 잇기, 플레이어 없이 오가는 사절, 옛 저장, 짧은 여러 삶.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { makePerson } from '../src/npc.js';
import { PLACES } from '../src/places.js';
import { crimeState } from '../src/crime.js';
import { realmState } from '../src/realms/index.js';
import { envoyState, envoyInfo, envoyLine } from '../src/envoy/index.js';
import { PS, warOf, pactOf, relOf } from '../src/politics/state.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['envoy_tongue', 'envoy_join', 'envoy_mission', 'work', 'rest'];
const homePlace = new WeakMap();
const V = envoyState;

function adult(seed, { age = 30, place = 'leocast', sex, family = 'farmer' } = {}) {
  const g = newGame({ name: '바우', sex: sex ?? (seed % 2 ? 'm' : 'f'), familyId: family, mode: 'free', seed });
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
    if (/^envoy_/.test(kind) && samples.length < 30 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 70)} → ${String(out).slice(0, 110)}`);
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
    const choices = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) {
      const w = acts.filter((a) => prefer.includes(a.id) && !a.needsTarget);
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel'));
      if (g.player.fatigue > 85) a = acts.find((x) => x.id === 'rest') ?? a;
      if (!a) continue;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) {
      ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
      if (/말을 익힌|외교청|사절단/.test(r.name ?? '') && samples.length < 30 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 110)}`);
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
const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `${path}.${k}=${v}`); } };
const checkInfo = (g) => { walk(envoyInfo(g), 'envoy'); ok(!bad(envoyLine(g) ?? ''), 'line'); };
const has = (g, id) => { resolveAll(g); settle(g); return availableActions(g).some((a) => a.id === id); };
function strong(g, n = 50) { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], n); g.player.skills.letters = n; }
function weak(g) { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 3; g.player.skills.letters = 0; }
function kid(g, age = 10) { const p = person(g, { age }); me(g).childIds.push(p.id); p.fatherId = me(g).id; return p; }
const post = (g, role = 'head', realm = 'leonia') => { V(g).post = { realm, role, since: 0, missions: 0, wins: 0, fails: 0, lastAt: -99 }; };
const war = (g, a, b) => { PS(g).wars.push({ a, b, since: g.date.year * 12, score: 0, weary: 12, taken: [] }); };

// 0) 평범한 삶에는 새 행동이 없다
{
  const g = adult(1); g.player.skills.letters = 5;
  for (const id of ['envoy_tongue', 'envoy_join', 'envoy_mission', 'envoy_resign']) ok(!has(g, id), `plain shows ${id}`);
  const e = adult(2, { place: 'ern' }); strong(e);
  ok(!has(e, 'envoy_join'), 'no join outside capital');
}

// 1) 다른 말
{
  const g = adult(10, { place: 'eisen' }); strong(g);
  ok(has(g, 'envoy_tongue'), 'tongue in valhart');
  for (let t = 0; t < 4; t++) { V(g).tongueAt = -99; act(g, 'envoy_tongue'); }
  ok((V(g).tongues.imperial ?? 0) > 10, `imperial ${V(g).tongues.imperial}`);
  ok(!has(g, 'envoy_join'), 'no join in foreign capital');
  checkInfo(g);
}

// 2) 외교청과 사절단
{
  const g = adult(20); strong(g);
  ok(has(g, 'envoy_join'), 'join with letters');
  for (let t = 0; t < 6 && !V(g).post; t++) { V(g).joinAt = -99; act(g, 'envoy_join'); }
  ok(!!V(g).post, 'joined');
  ok(has(g, 'envoy_mission') && has(g, 'envoy_resign'), 'mission & resign shown');
  act(g, 'envoy_mission');
  play(g, 2, ['rest'], {}, 1);
  ok(seen.scenes.envoy_talks > 0, 'talks after mission');
  act(g, 'envoy_resign');
  ok(!V(g).post && V(g).past.length === 1, 'resigned');
}

// 3) 강화: 협상으로 전쟁을 끝낸다
{
  let peaced = 0;
  for (let t = 0; t < 4 && !peaced; t++) {
    const g = adult(30 + t); strong(g, 70); post(g, 'head'); war(g, 'march', 'leonia');
    scene(g, 'envoy_talks', { to: 'march', talk: 'truce' }, idxOf(/내주고/));
    if (!warOf(g, 'march', 'leonia')) { peaced++; ok(V(g).talks.peaces === 1 && pactOf(g, 'march', 'leonia', 'truce'), 'peace pact'); }
  }
  ok(peaced, 'talks made peace');
}

// 4) 국경 협상이 깨져 전쟁이 난다
{
  let wars = 0;
  for (let t = 0; t < 12 && !wars; t++) {
    const g = adult(40 + t); weak(g); post(g, 'head'); PS(g).rel['free|leonia'] = -85;
    scene(g, 'envoy_talks', { to: 'free', talk: 'border' }, idxOf(/물러서지/));
    if (warOf(g, 'free', 'leonia')) { wars++; ok(V(g).talks.wars === 1, 'war counted'); }
  }
  ok(wars, 'border talks caused war');
}

// 5) 통상·혼인, 따라가는 자리, 승진
{
  let trade = 0, wed = 0;
  for (let t = 0; t < 4; t++) {
    const g = adult(50 + t); strong(g, 70); post(g, 'envoy'); PS(g).rel['holy|leonia'] = 40;
    for (const p of PS(g).pacts.filter((x) => (x.a === 'holy' || x.b === 'holy'))) p.kind = 'none';
    scene(g, 'envoy_talks', { to: 'holy', talk: 'trade' }, idxOf(/내주고/));
    if (pactOf(g, 'holy', 'leonia', 'trade')) trade++;
    scene(g, 'envoy_talks', { to: 'holy', talk: 'marriage' }, idxOf(/내주고/));
    if (pactOf(g, 'holy', 'leonia', 'marriage')) wed++;
  }
  ok(trade && wed, `trade ${trade} marriage ${wed}`);
  const c = adult(60); strong(c); post(c, 'clerk'); V(c).post.wins = 1;
  for (let t = 0; t < 4 && V(c).post?.role === 'clerk'; t++) scene(c, 'envoy_talks', { to: 'march', talk: 'trade' }, idxOf(/초안/));
  ok(V(c).post?.role !== 'clerk', `clerk promoted ${V(c).post?.role}`);
  let caught = 0;
  for (let t = 0; t < 10 && !caught; t++) { const s = adult(61 + t); strong(s); post(s, 'interpreter'); scene(s, 'envoy_talks', { to: 'march', talk: 'trade' }, idxOf(/속셈/)); if (!V(s).post) caught++; }
  ok(caught, 'seller caught');
}

// 6) 외교 사고
{
  const picks = { insult: [/웃으며/, /되받/], spy: [/넘긴다/, /면책/, /몰래/], murder: [/캐 본다/, /탓한다/, /수습/] };
  let n = 0;
  for (const [ev, list] of Object.entries(picks)) for (const re of list) {
    const g = adult(70 + n++); strong(g); post(g, 'envoy'); PS(g).rel['march|leonia'] = -30;
    ok(scene(g, 'envoy_incident', { to: 'march', ev }, idxOf(re)), `incident ${ev}`);
  }
}

// 7) 자식을 볼모로 보낸다
{
  const g = adult(80, { age: 40 }); strong(g); post(g, 'head');
  const k = kid(g, 10);
  scene(g, 'envoy_pledge', { to: 'march' }, idxOf(/보낸다/));
  ok(V(g).pledged.length === 1 && k.place === 'graubel', 'kid pledged');
  war(g, 'march', 'leonia');
  play(g, 2, ['rest'], { envoy_kid_war: idxOf(/몸값/) }, 1);
  ok(seen.scenes.envoy_kid_war > 0 && !V(g).pledged.length, 'ransomed in war');
  const h = adult(81, { age: 40 }); post(h, 'head'); const k2 = kid(h, 14);
  scene(h, 'envoy_pledge', { to: 'march' }, idxOf(/보낸다/));
  V(h).pledged[0].until = h.date.year * 12 + h.date.month;
  play(h, 1, ['rest'], {}, 1);
  ok(!V(h).pledged.length && k2.place !== 'graubel', 'kid back at term');
  const r = adult(82, { age: 40 }); post(r, 'head'); kid(r, 9);
  scene(r, 'envoy_pledge', { to: 'march' }, idxOf(/없다고/));
  ok(!V(r).pledged.length, 'refused');
}

// 8) 볼모로 자라는 아이
{
  const g = adult(90, { age: 8, place: 'ern', family: 'fallen_knight' });
  ok(scene(g, 'envoy_hostage_sent', { to: 'march' }, 0), 'sent scene');
  ok(V(g).hostage && L(g).place === 'graubel', `hostage at ${L(g).place}`);
  homePlace.set(g, 'graubel');
  for (const ev of ['tutor', 'prince', 'cruel', 'letter']) for (const i of [0, 1]) scene(g, 'envoy_hostage_life', { ev }, i);
  ok(seen.scenes.envoy_hostage_life >= 8, 'hostage life');
  play(g, 6, ['rest'], {}, 1);
  ok((V(g).tongues.common ?? 0) === 0, 'same tongue not learned');
  war(g, 'march', 'leonia');
  play(g, 1, ['rest'], { envoy_hostage_war: idxOf(/숨죽/) }, 1);
  ok(seen.scenes.envoy_hostage_war > 0, 'hostage war');
  me(g).ageMonths = 16 * 12; V(g).hostage.until = g.date.year * 12 + g.date.month;
  play(g, 1, ['rest'], { envoy_hostage_return: idxOf(/고향/) }, 1);
  ok(!V(g).hostage && V(g).between?.host === 'march' && L(g).place === 'ern', `returned ${L(g).place}`);
  // 엘프 궁정에서는 그 나라 말이 는다, 남기
  const e = adult(91, { age: 9, place: 'ern', family: 'fallen_knight' });
  scene(e, 'envoy_hostage_sent', { to: 'elf' }, 1); homePlace.set(e, 'silverleaf');
  play(e, 12, ['rest'], {}, 1);
  ok((V(e).tongues.elvish ?? 0) > 8, `elvish ${V(e).tongues.elvish}`);
  me(e).ageMonths = 16 * 12; V(e).hostage.until = e.date.year * 12 + e.date.month;
  play(e, 1, ['rest'], { envoy_hostage_return: idxOf(/남는다/) }, 1);
  ok(realmState(e).citizen === 'elf' && V(e).between?.host === 'leonia', 'stayed abroad');
  checkInfo(e);
  // 달아나기
  let fled = 0;
  for (let t = 0; t < 8 && !fled; t++) {
    const f = adult(92 + t, { age: 11, place: 'ern', family: 'fallen_knight' }); f.player.stats.agi = 60;
    scene(f, 'envoy_hostage_sent', { to: 'march' }, 0); homePlace.set(f, 'graubel');
    war(f, 'march', 'leonia'); V(f).hostage.warSeen = true;
    scene(f, 'envoy_hostage_war', {}, idxOf(/담을/));
    if (!V(f).hostage) { fled++; ok(L(f).place === 'ern' && V(f).between, 'fled home'); }
  }
  ok(fled, 'fled');
  // 저절로 보내지는 아이 (몰락 기사 집안)
  let auto = 0;
  for (let t = 0; t < 30 && !auto; t++) {
    const a = adult(200 + t, { age: 11, place: 'ern', family: 'fallen_knight' }); homePlace.delete(a);
    play(a, 24, ['rest'], {}, 0.2);
    if (seen.scenes.envoy_hostage_sent && V(a).hostage) auto++;
  }
  ok(auto, 'auto hostage happens');
}

// 9) 두 나라 사이
{
  const g = adult(100); V(g).between = { host: 'march', ties: 50, since: 0 };
  for (const re of [/보인다/, /다리/, /아무 말/]) ok(scene(g, 'envoy_between', {}, idxOf(re)), `between ${re}`);
  ok(V(g).between.ties < 50, 'prove cut ties');
  const j = adult(101); g.player.skills.letters = 0; V(j).between = { host: 'march', ties: 50, since: 0 };
  ok(has(j, 'envoy_join'), 'between can join');
}

// 10) 대 잇기: 볼모로 가 있던 자식이 대를 잇는다
{
  const g = adult(110, { age: 45 }); post(g, 'head');
  const k = kid(g, 12);
  scene(g, 'envoy_pledge', { to: 'march' }, idxOf(/보낸다/));
  L(g).pendingDeath = '병';
  play(g, 3, ['rest'], {}, 1);
  ok(g.player.id === k.id, 'heir is the pledged kid');
  ok(V(g).hostage?.to === 'march' && !V(g).post && V(g).past.length, `heir hostage ${JSON.stringify(V(g).hostage)}`);
  checkInfo(g);
}

// 11) 플레이어 없이도 사절이 오간다
{
  const g = newGame({ name: '평민', sex: 'f', familyId: 'farmer', mode: 'free', seed: 7700 });
  play(g, 12 * 6, ['rest'], {}, 0.5);
  ok(V(g).world.n + V(g).world.incidents >= 3, `world envoys ${JSON.stringify(V(g).world)}`);
  ok(!envoyInfo(g) || !envoyInfo(g).post, 'no post for plain');
}

// 12) 옛 저장
{
  const o = adult(130); delete o.envoy; runHooks('migrate', o);
  ok(o.envoy?.tongues && Array.isArray(o.envoy.pledged), 'old save');
}

// 13) 짧은 여러 삶
for (let run = 0; run < 4; run++) {
  const g = adult(1000 + run, { age: 22 + run * 4, place: ['leocast', 'eisen', 'serenia', 'graubel'][run] }); strong(g, 40);
  if (run === 1 || run === 3) realmState(g).citizen = run === 1 ? 'valhart' : 'march';
  play(g, 12 * 15, ACTS, {}, 0.4);
  checkInfo(g);
}

for (const k of ['envoy_tongue', 'envoy_join', 'envoy_mission', 'envoy_resign']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['envoy_talks', 'envoy_incident', 'envoy_pledge', 'envoy_kid_war', 'envoy_hostage_sent', 'envoy_hostage_life', 'envoy_hostage_war', 'envoy_hostage_return', 'envoy_between']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => /^envoy_/.test(k)))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => /^envoy_/.test(k)))));
for (const s of samples) console.log(' -', s);
console.log(fail ? `envoytest: ${fail} 실패` : 'envoytest: 통과');
process.exit(fail ? 1 : 0);
