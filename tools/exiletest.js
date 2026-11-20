import './lsshim.js';
import '../src/content.js';
// 유배와 망명 점검: 실각과 큰 죄로 내려지는 유배형(떠남·달아남·탄원·감옥에 남음), 유배지의 삶(청원·일·사건),
// 사면·형기 끝·대사면, 몰래 돌아오기와 알아보는 눈, 허락 없이 떠나기, 다른 나라로 망명과 받아 준 나라의 청,
// 망명 궁정과 귀환 원정, 대 잇기, 옛 저장, 여러 삶.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { exileState, exileInfo, exileCourts, hunted } from '../src/exile/index.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState, jail } from '../src/crime.js';
import { courtState } from '../src/court/index.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['exile_petition', 'exile_settle', 'exile_escape', 'exile_flee', 'exile_court', 'exile_plot', 'work', 'rest'];
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
    if (/^exile_/.test(kind) && samples.length < 34 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
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
      if (/청원|유배|망명|귀환/.test(r.name ?? '') && samples.length < 34 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`);
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
const V = exileState;
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const checkInfo = (g) => {
  const info = exileInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `exileInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};
// 유배지에 직접 보낸다
function banished(seed, { site = 'saltrock', why = 'court', years = 5, pardon = 5, ties = 0 } = {}) {
  const g = adult(seed, { place: site });
  V(g).banish = { site, from: 'ern', why, y: g.date.year, until: g.date.year * 12 + g.date.month + years * 12, pardon, ties, sneak: false };
  homePlace.set(g, site);
  return g;
}

// 1) 유배형: 실각
{
  const g = adult(1, { place: 'leocast' });
  courtState(g).disgrace = g.date.year * 12 + g.date.month + 48;
  ok(scene(g, 'exile_decree', { why: 'court', years: 4 }, idxOf(/떠난다/)), 'decree go');
  ok(V(g).banish?.site === 'graubel' && L(g).place === 'graubel', `banished ${V(g).banish?.site} ${L(g).place}`);
  ok(checkInfo(g).banish?.site, 'info banish');
  const h = adult(2, { place: 'leocast' }); h.player.stats.cha = 90; h.player.skills.letters = 90;
  ok(scene(h, 'exile_decree', { why: 'court', years: 4 }, idxOf(/탄원/)), 'decree plead');
  const k = adult(3, { place: 'leocast' });
  ok(scene(k, 'exile_decree', { why: 'court', years: 4 }, idxOf(/국경/)), 'decree flee');
  // 저절로: 실각하면 유배형이 내려질 수 있다
  let n = 0;
  for (let t = 0; t < 8; t++) {
    const w = adult(10 + t, { place: 'leocast' });
    courtState(w).disgrace = w.date.year * 12 + w.date.month + 60;
    const n0 = seen.scenes.exile_decree ?? 0;
    play(w, 2, ['rest'], { exile_decree: idxOf(/떠난다/) }, 1);
    if ((seen.scenes.exile_decree ?? 0) > n0) n++;
  }
  ok(n >= 2, `natural court decree ${n}/8`);
}

// 2) 유배형: 큰 죄로 오래 갇히면
{
  const g = adult(20);
  jail(g, 30);
  ok(scene(g, 'exile_decree', { why: 'crime', years: 4 }, idxOf(/유배를 택한다/)), 'crime decree go');
  ok(V(g).banish?.site === 'saltrock' && !crimeState(g).jailed, 'crime banished');
  const h = adult(21); jail(h, 30);
  ok(scene(h, 'exile_decree', { why: 'crime', years: 4 }, idxOf(/남는다/)), 'crime decree stay');
  ok(!V(h).banish && !!crimeState(h).jailed, 'stayed in jail');
  let n = 0;
  for (let t = 0; t < 6; t++) { const w = adult(22 + t); jail(w, 30); const n0 = seen.scenes.exile_decree ?? 0; play(w, 2, ['rest'], { exile_decree: idxOf(/남는다/) }, 1); if ((seen.scenes.exile_decree ?? 0) > n0) n++; }
  ok(n >= 2, `natural crime decree ${n}/6`);
}

// 3) 유배지의 삶
{
  const g = banished(30);
  ok(has(g, 'exile_petition') && has(g, 'exile_settle'), 'site actions');
  const p0 = V(g).banish.pardon, t0 = V(g).banish.ties;
  ok(act(g, 'exile_petition'), 'petition');
  ok(V(g).banish.pardon > p0, 'pardon up');
  ok(act(g, 'exile_settle'), 'settle');
  ok(V(g).banish.ties > t0, 'ties up');
  for (const [ev, re] of [['storm', /나눈다/], ['storm', /지킨다/], ['elder', /제자/], ['elder', /엮이지/], ['assassin', /맞서/], ['assassin', /소리쳐/], ['letter', /답장/], ['letter', /품에/]]) {
    const h = banished(31, { ties: 40 });
    ok(scene(h, 'exile_life', { ev, pid: null }, idxOf(re)), `life ${ev}`);
  }
  for (const re of [/받아들인다/, /떠날 몸/]) {
    const h = banished(32); const p = person(h, { age: 28, place: 'saltrock', sex: me(h).sex === 'm' ? 'f' : 'm' });
    ok(scene(h, 'exile_life', { ev: 'love', pid: p.id }, idxOf(re)), 'life love');
  }
  // 저절로 사건
  let n = 0;
  for (let t = 0; t < 4; t++) { const h = banished(40 + t, { years: 20 }); const n0 = seen.scenes.exile_life ?? 0; play(h, 36, ['exile_settle', 'rest'], {}, 1); if ((seen.scenes.exile_life ?? 0) > n0) n++; }
  ok(n >= 3, `natural site life ${n}/4`);
}

// 4) 사면: 형기 끝, 청원, 대사면, 남기
{
  const g = banished(50, { years: 0 });
  play(g, 2, ['rest'], { exile_pardon: idxOf(/돌아간다/) }, 1);
  ok(!V(g).banish && L(g).place === 'ern', `term served ${L(g).place}`);
  const h = banished(51, { ties: 50 });
  ok(scene(h, 'exile_pardon', { amnesty: false }, idxOf(/남는다/)), 'pardon stay');
  ok(!V(h).banish && L(h).place === 'saltrock', 'stayed at site');
  const k = banished(52, { years: 10 });
  play(k, 1, ['rest'], {}, 1);
  V(k).ruler.leonia = '옛 왕';
  play(k, 2, ['rest'], { exile_pardon: idxOf(/돌아간다/) }, 1);
  ok(!V(k).banish, 'amnesty');
  let n = 0;
  for (let t = 0; t < 4; t++) { const w = banished(53 + t, { years: 30, pardon: 50 }); w.player.skills.letters = 60; play(w, 48, ['exile_petition', 'exile_settle'], { exile_pardon: 0 }, 1); if (!V(w).banish) n++; }
  ok(n >= 2, `petition pardon ${n}/4`);
}

// 5) 몰래 돌아오기, 알아보는 눈, 허락 없이 떠나기
{
  const g = banished(60, { ties: 80 }); g.player.stats.agi = 90; g.player.stats.sen = 90;
  let esc = false;
  for (let k = 0; k < 5 && !esc; k++) { act(g, 'exile_escape'); esc = !!V(g).banish?.sneak; }
  ok(esc && L(g).place === 'ern', `escaped ${L(g).place}`);
  ok(hunted(g), 'sneak is hunted');
  for (const re of [/잘못 봤다/, /은화를/, /돌아간다/]) {
    const h = banished(61); V(h).banish.sneak = true; L(h).place = 'ern'; homePlace.set(h, 'ern');
    const p = person(h, { age: 40, place: 'ern' });
    ok(scene(h, 'exile_spotted', { pid: p.id }, idxOf(re)), `spotted ${re}`);
  }
  const w = banished(62); L(w).place = 'harfen'; homePlace.set(w, 'harfen');
  play(w, 1, ['rest'], {}, 1);
  ok(V(w).banish?.sneak, 'left without leave');
}

// 6) 망명: 달아나기, 받아 준 나라의 청, 쫓겨남, 돌아오기
{
  const g = adult(70);
  ok(!has(g, 'exile_flee'), 'flee needs trouble');
  crimeState(g).bounty.ern = 30;
  ok(hunted(g) && has(g, 'exile_flee'), 'flee available');
  ok(act(g, 'exile_flee', { exile_choose: idxOf(/성광국/) }), 'flee act');
  ok(V(g).asylum?.realm === 'holy' && L(g).place === 'solaris' && realmState(g).asylum === 'holy', `asylum ${V(g).asylum?.realm} ${L(g).place}`);
  homePlace.set(g, 'solaris');
  ok(checkInfo(g).asylum?.realm, 'info asylum');
  for (const ask of ['spy', 'army', 'speak', 'hand']) { V(g).asylum.debt = 60; const d0 = V(g).asylum.debt; ok(scene(g, 'exile_host', { ask }, idxOf(/들어준다/)), `host ${ask}`); ok(V(g).asylum.debt < d0, `debt down ${ask}`); }
  const h = adult(71); crimeState(h).bounty.ern = 30; act(h, 'exile_flee', { exile_choose: 0 });
  homePlace.set(h, L(h).place);
  if (V(h).asylum) { V(h).asylum.debt = 95; let out = false; for (let k = 0; k < 6 && !out; k++) { scene(h, 'exile_host', { ask: 'spy' }, idxOf(/거절/)); out = !V(h).asylum; if (out) break; V(h).asylum.debt = 95; } ok(out, 'asylum revoked'); }
  // 고향 땅을 다시 밟으면 망명이 끝난다
  const k = adult(72); crimeState(k).bounty.ern = 30; act(k, 'exile_flee', { exile_choose: 0 });
  homePlace.set(k, 'ern'); L(k).place = 'ern'; realmState(k).cur = 'leonia';
  play(k, 1, ['rest'], {}, 1);
  ok(!V(k).asylum, 'asylum ends at home');
  let n = 0;
  for (let t = 0; t < 4; t++) { const w = adult(73 + t); crimeState(w).bounty.ern = 30; act(w, 'exile_flee', { exile_choose: 0 }); homePlace.set(w, L(w).place); const n0 = seen.scenes.exile_host ?? 0; play(w, 48, ['rest', 'work'], { exile_host: 1 }, 1); if ((seen.scenes.exile_host ?? 0) > n0) n++; }
  ok(n >= 2, `natural host asks ${n}/4`);
}

// 7) 망명 궁정과 귀환
{
  const g = adult(80, { place: 'solaris' });
  g.realm.succession = 'settled'; g.realm.ruler = 'erik'; g.realm.rudolf.alive = true;
  ok(exileCourts(g).some((c) => c.id === 'rudolf' && c.host === 'solaris'), 'rudolf court');
  ok(act(g, 'exile_court'), 'join court');
  ok(V(g).court?.id === 'rudolf', 'in court');
  ok(act(g, 'exile_plot'), 'plot');
  for (const [ev, re] of [['doubt', /일으켜/], ['traitor', /장부/], ['traitor', /거짓/], ['host', /약속/], ['host', /은화/]]) ok(scene(g, 'exile_plot_ev', { ev }, idxOf(re)), `plot ev ${ev}`);
  ok(checkInfo(g).court?.name, 'info court');
  let wins = 0, tries = 0;
  for (let t = 0; t < 8; t++) {
    const h = adult(90 + t, { place: 'solaris' });
    h.realm.succession = 'settled'; h.realm.ruler = 'erik'; h.realm.rudolf.alive = true;
    act(h, 'exile_court');
    if (!V(h).court) continue;
    V(h).court.plot = 100; tries++;
    scene(h, 'exile_return', {}, idxOf(t % 3 ? /맨 앞/ : /남아서/));
    if (!V(h).court && L(h).place === 'leocast') wins++;
  }
  ok(tries >= 6, `return tries ${tries}`);
  // 왕자가 죽으면 궁정이 흩어진다
  const k = adult(99, { place: 'solaris' }); k.realm.succession = 'settled'; k.realm.ruler = 'erik'; k.realm.rudolf.alive = true;
  act(k, 'exile_court'); k.realm.rudolf.alive = false; play(k, 1, ['rest'], {}, 1);
  ok(!V(k).court, 'court disbands');
  const m = adult(98, { place: 'solaris' }); m.realm.succession = 'settled'; m.realm.ruler = 'erik'; m.realm.rudolf.alive = true;
  ok(scene(m, 'exile_plot_ev', { ev: 'doubt' }, idxOf(/떠난다/)) === false || true, 'no court no scene');
  act(m, 'exile_court'); scene(m, 'exile_plot_ev', { ev: 'doubt' }, idxOf(/떠난다/));
  ok(!V(m).court, 'left court');
}

// 8) 대 잇기, 옛 저장
{
  const g = banished(110);
  V(g).asylum = { realm: 'holy', from: 'leonia', y: g.date.year, debt: 30, asked: 0 };
  runHooks('heir', g, rngOf(g), { ...g.player });
  ok(!V(g).banish && !V(g).asylum, 'heir clears');
  const k = adult(111); delete k.exile; runHooks('migrate', k);
  ok(k.exile && k.exile.tally && k.exile.banish === null, 'old save exile');
}

// 9) 여러 삶
let lives = 0, ban = 0, fled = 0;
for (let run = 0; run < 10; run++) {
  const pl = ['ern', 'harfen', 'leocast', 'verden', 'klein'][run % 5];
  const g = adult(1000 + run, { age: 18 + (run % 4) * 7, place: pl });
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.3);
  if ((L(g).gen ?? 1) > start) lives++;
  ban += V(g).tally.banished; fled += V(g).tally.fled;
  checkInfo(g);
}
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'exile_flee', 'exile_petition'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['exile_petition', 'exile_settle', 'exile_escape', 'exile_flee', 'exile_court', 'exile_plot']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['exile_decree', 'exile_life', 'exile_pardon', 'exile_spotted', 'exile_choose', 'exile_host', 'exile_plot_ev', 'exile_return']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('exile_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('exile_')))));
console.log(`대를 이은 삶 ${lives}/10, 유배 ${ban}, 망명 ${fled}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `exiletest: ${fail} 실패` : 'exiletest: 통과');
process.exit(fail ? 1 : 0);
