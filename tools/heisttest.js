import '../src/content.js';
// 큰 한탕(src/heist/)을 브라우저 없이 돌려 보는 점검.
// 1) 꾸미기 조건과 목표. 2) 사람 모으기, 정찰과 준비. 3) 결행의 밤: 당일 변수 선택지마다, 성공·실패·붙잡힘. 4) 몫과 배신, 장물, 추적자.
// 5) 매달 일, 대 잇기, 옛 저장, 저절로.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { heistStatus, heistLine, heistState as H, heistPlan as plan, targetsFor, candidates, finishNight, newTarget, newPlan, newMate, readiness } from '../src/heist/index.js';
import { crimeState } from '../src/crime.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const seen = { scenes: {} };
const samples = [];

function month(g, want = [], pick = null) {
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = want.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (!a || g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) { if (bad(r.text)) fail('bad result', r); if (josa(r.text)) fail('josa result', r); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
        if (pe.choices.length > 8) fail('too many choices', s?.kind, pe.choices.length);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^heist_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^heist_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = heistStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'merchant') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (l.job?.id === 'soldier') l.job = null; if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }
const heal = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; };
function scene(g, kind, data, re, opt = {}) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    opt.each?.(g); // 장면이 뜰 때까지 형편(전쟁·흉년)을 붙잡아 둔다
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, opt.want ?? ['rest'], (k, labels) => { if (k !== kind) return opt.other?.(k, labels) ?? -1; done = true; const i2 = idxOf(labels, re); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, JSON.stringify(data), L(g).place, playerAge(g), JSON.stringify(L(g).queue.map((q) => q.kind)));
  if (done && !chose && !g.over) fail('choice not found', kind, re, JSON.stringify(data));
  return chose;
}


const R = (g) => rngOf(g);
// 장면 정의를 직접 부른다 (글과 선택지를 검사하고, 고른 열쇠로 푼다)
function direct(g, kind, data, key) {
  const def = SCENES[kind];
  const s = { kind, at: L(g).place, t: 0, ...data };
  if (def.need && !def.need(g, s)) return { skipped: true };
  const t = def.text(g, s), ch = def.choices(g, s), ti = def.title(g, s);
  if (bad(t) || bad(ti) || josa(t) || ch.some((c) => bad(c.label) || josa(c.label))) fail('scene text', kind, ti, t, ch.map((c) => c.label));
  if (ch.length > 8) fail('too many choices', kind);
  const k = typeof key === 'function' ? key(ch) : key;
  if (!ch.some((c) => c.key === k)) return { missing: true, keys: ch.map((c) => c.key) };
  const out = def.resolve(g, R(g), s, k);
  if (bad(out) || josa(out)) fail('scene out', kind, k, out);
  if (g.player.money < 0) fail('negative money', kind, k);
  if (samples.length < 60) samples.push(`[${ti}] ${k} → ${out}`);
  return { out, s };
}

const tick = (g) => { runHooks('afterMonth', g, R(g)); g.date.month = g.date.month % 12 + 1; if (g.date.month === 1) g.date.year += 1; };

import { ACTIONS } from '../src/actions.js';
import { me } from '../src/game.js';

const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
const clearQ = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const nowMi = (g) => g.date.year * 12 + g.date.month;
function fresh(seed, pl = 'harfen') {
  const g = adult(seed); placeAt(g, pl); heal(g);
  const c = crimeState(g); c.craft = 40; c.jailed = null; c.gang = null; c.heat = {}; c.bounty = {};
  g.player.stats.agi = 50; g.player.stats.sen = 45; g.player.stats.cha = 45; g.player.stats.int = 40; g.player.money = 2000;
  const s = H(g); s.plan = null; s.loot = null; s.hunt = null; s.split = null; s.grudge = null; s.offers = null; s.cands = null; s.crewBook = [];
  if (g.troupe) g.troupe.t = null; if (g.poor) g.poor.bond = null;
  return g;
}
// 하르펜 상단 금고를 노리는 판: 일행과 준비를 직접 맞춘다
function plotted(seed, { crew = ['lock', 'muscle', 'inside', 'lookout', 'driver'], intel = 80, kind = 'vault', pl = 'harfen' } = {}) {
  const g = fresh(seed, pl);
  const t = newTarget(g, R(g), kind, pl);
  const p = newPlan(g, t); p.intel = intel;
  if (kind === 'tax') p.day = nowMi(g);
  const used = new Set();
  for (const r of crew) { const m = newMate(g, R(g), r, used); used.add(m.name); m.loyal = 60; p.crew.push(m); }
  H(g).plan = p;
  return g;
}

/* 1) 꾸미기 조건과 목표 */
{
  const v = fresh(301000, 'ern'); if (can(v, 'heist_plan')) fail('plan in village');
  const n = fresh(301010); crimeState(n).craft = 0; L(n).notoriety = 0; if (can(n, 'heist_plan')) fail('plan without skill');
  crimeState(n).gang = { id: 'rats', rank: 0, rep: 0 }; if (!can(n, 'heist_plan')) fail('gang cannot plan');
  const g = fresh(301020);
  const list = targetsFor(g);
  if (list.length < 3 || list.some((t) => !t.prize || !t.owner)) fail('targets', JSON.stringify(list));
  const i = list.findIndex((t) => t.place === 'harfen');
  const r = direct(g, 'heist_target', {}, `t:${i >= 0 ? i : 0}`);
  if (r.missing || !plan(g)) fail('pick target', JSON.stringify(r));
  if (can(g, 'heist_plan')) fail('plan twice');
  const far = fresh(301030);
  const j = targetsFor(far).findIndex((t) => t.place !== 'harfen');
  if (j >= 0) { direct(far, 'heist_target', {}, `t:${j}`); if (!L(far).travel || L(far).travel.to !== plan(far).place) fail('travel to target', JSON.stringify(L(far).travel)); }
  const tax = targetsFor(fresh(301040)).find((t) => t.kind === 'tax');
  if (tax) { const tg = fresh(301041); tg.heist.offers = null; const k = targetsFor(tg).findIndex((t) => t.kind === 'tax'); direct(tg, 'heist_target', {}, `t:${k}`); if (!(plan(tg).day > nowMi(tg))) fail('tax day'); }
}

/* 2) 사람 모으기, 정찰과 준비 */
{
  const g = plotted(302000, { crew: [], intel: 0 });
  if (!can(g, 'heist_crew') || !can(g, 'heist_scout')) fail('crew/scout not available');
  if (can(g, 'heist_go')) fail('go without crew');
  const m0 = g.player.money;
  const r = direct(g, 'heist_crew', {}, 'c:0');
  if (r.missing || plan(g).crew.length !== 1 || g.player.money >= m0) fail('hire', JSON.stringify(r));
  direct(g, 'heist_crew', {}, 'c:1');
  direct(g, 'heist_crew', {}, 'drop');
  if (plan(g).crew.length !== 1) fail('drop', plan(g).crew.length);
  // 정찰: 경비 지켜보기와 하인과 술잔은 아는 것을 늘리거나 경보를 올린다
  for (const key of ['watch', 'servant']) { const p = plan(g); const i0 = p.intel, a0 = p.alarm; direct(g, 'heist_scout', {}, key); if (p.intel <= i0 && p.alarm <= a0) fail('scout did nothing', key); }
  for (const id of ['plan', 'tools', 'bribe', 'escape', 'papers']) { direct(g, 'heist_scout', {}, `p:${id}`); if (!plan(g).prep[id]) fail('prep', id); }
  const st = direct(g, 'heist_scout', {}, 'p:tools'); if (!st.missing) fail('prep twice');
  // 위조꾼이 있으면 통행증은 돈이 들지 않는다
  const f = plotted(302010, { crew: ['forger'] }); f.player.money = 0;
  if (direct(f, 'heist_scout', {}, 'p:papers').missing || !plan(f).prep.papers) fail('forger papers free');
  // 예전 일행은 다시 온다
  const o = plotted(302020, { crew: [] }); H(o).crewBook = [{ name: '옛 동무', role: 'lock', skill: 70, loyal: 60, grudge: false }];
  let came = false; for (let i = 0; i < 12 && !came; i++) { H(o).cands = null; o.date.month = i % 12 + 1; came = candidates(o).some((c) => c.name === '옛 동무' && c.old); }
  if (!came) fail('old mate never came back');
}

/* 3) 결행의 밤 */
{
  // 들어가는 방법: 안사람이 없으면 그 길은 없다
  const n = plotted(303000, { crew: ['lock'] });
  if (!direct(n, 'heist_day', {}, 'inside').missing) fail('inside without insider');
  if (!direct(n, 'heist_day', {}, 'disguise').missing) fail('disguise without papers');
  const w = plotted(303010); direct(w, 'heist_day', {}, 'wait'); if (!plan(w) || plan(w).crew.some((m) => m.loyal !== 56)) fail('wait loyalty');
  const d = plotted(303020); const r = direct(d, 'heist_day', {}, 'quiet');
  if (r.missing || !L(d).queue.some((q) => q.kind === 'heist_twist')) fail('twist queued', JSON.stringify(r));
  // 당일 변수 선택지마다
  const keys = { shift: ['help', 'wait', 'push'], lock: ['help', 'pick', 'force'], witness: ['help', 'tie', 'coin', 'let'], rival: ['help', 'share', 'race', 'tip'], panic: ['calm', 'leave', 'knock'], guard: ['help', 'fight', 'around'], papers: ['bluff', 'coin'] };
  let n2 = 0, wins = 0, jails = 0;
  for (const [twist, ks] of Object.entries(keys)) for (const key of [...ks, 'abort']) {
    const g = plotted(303100 + n2++, { crew: ['lock', 'muscle', 'inside', 'lookout', 'forger'] });
    const r2 = direct(g, 'heist_twist', { app: 'quiet', twist, base: 60 }, key);
    if (r2.missing || r2.skipped) { fail('twist', twist, key, JSON.stringify(r2)); continue; }
    if (key === 'abort') { if (!plan(g) || plan(g).alarm < 15) fail('abort keeps plan'); continue; }
    if (plan(g)) fail('night did not end plan', twist, key);
    if (H(g).loot) wins++;
    if (crimeState(g).jailed) jails++;
  }
  if (!wins) fail('never won a night');
  // 성공: 장물과 추적자와 몫 장면
  const ok = plotted(303300); const p = plan(ok); const res = finishNight(ok, { chance: () => true, int: (a) => a, pick: (a) => a[0] }, p, 200, 'quiet');
  if (!H(ok).loot || !H(ok).hunt || !H(ok).split || !L(ok).queue.some((q) => q.kind === 'heist_split') || bad(res)) fail('success state', JSON.stringify(H(ok).loot), res);
  // 실패하고 붙잡힘: 감옥과 죄 기록
  const bad1 = plotted(303310); const res2 = finishNight(bad1, { chance: () => false, int: (a) => a, pick: (a) => a[0] }, plan(bad1), 0, 'quiet');
  if (!crimeState(bad1).jailed || plan(bad1) || H(bad1).caught !== 1 || !crimeState(bad1).record.some((x) => x.c === 'burglary')) fail('caught state', res2);
  // 세금 수레는 정해진 달에만
  const tx = plotted(303320, { kind: 'tax', pl: 'leocast' }); if (!can(tx, 'heist_go')) fail('tax go on day');
  plan(tx).day = nowMi(tx) + 2; if (can(tx, 'heist_go')) fail('tax go off day');
  plan(tx).day = nowMi(tx) - 1; clearQ(tx); tick(tx); if (!(plan(tx).day > nowMi(tx))) fail('tax day rolls', plan(tx).day, nowMi(tx));
}

/* 4) 몫과 배신, 장물, 추적자 */
{
  const setup = (seed) => { const g = plotted(seed); finishNight(g, { chance: () => true, int: (a) => a, pick: (a) => a[0] }, plan(g), 200, 'quiet'); clearQ(g); return g; };
  const vals = {};
  for (const key of ['equal', 'role', 'greedy', 'cross']) {
    const g = setup(304000 + key.length); const v0 = H(g).split.value;
    const r = direct(g, 'heist_split', {}, key);
    if (r.missing) { fail('split', key); continue; }
    vals[key] = H(g).loot.value;
    if (H(g).split) fail('split stays');
    if (H(g).crewBook.length !== 5) fail('crew book', H(g).crewBook.length);
    if (key === 'cross' && (H(g).loot.value !== v0 || H(g).betrayed !== 1 || !H(g).grudge || H(g).crewBook.some((b) => !b.grudge))) fail('cross', JSON.stringify(H(g).crewBook));
  }
  if (!(vals.cross > vals.greedy && vals.greedy > vals.role && vals.role > vals.equal)) fail('split order', JSON.stringify(vals));
  // 장물: 뜨거울 때 팔면 싸고 추적자가 냄새를 맡는다
  const hot = setup(304100); direct(hot, 'heist_split', {}, 'equal'); const hv = H(hot).loot.value; const c0 = H(hot).hunt.clue; const m0 = hot.player.money;
  act('heist_fence').run(hot, R(hot));
  if (hot.player.money - m0 !== Math.round(hv * 0.3) && hot.player.money - m0 !== Math.round(hv * 0.4)) fail('hot fence', hot.player.money - m0, hv);
  if (H(hot).loot || !(H(hot).hunt.clue > c0)) fail('fence state');
  const cold = setup(304110); direct(cold, 'heist_split', {}, 'equal'); H(cold).loot.hot = 0; placeAt(cold, 'leocast'); const cv = H(cold).loot.value; const cm = cold.player.money;
  act('heist_fence').run(cold, R(cold)); if (cold.player.money - cm !== Math.round(cv * 0.8)) fail('cold fence', cold.player.money - cm, cv);
  // 몸 낮추기
  const low = setup(304120); H(low).hunt.clue = 50; act('heist_lay_low').run(low, R(low)); if (!(H(low).hunt.clue < 50)) fail('lay low');
  // 추적자: 바짝 다가오면 귀띔, 닿으면 문 앞
  for (const key of ['flee', 'fight', 'bribe', 'give']) {
    const g = setup(304200 + key.length); direct(g, 'heist_split', {}, 'equal');
    const r = direct(g, 'heist_event', { ev: 'caught' }, key);
    if (r.missing || r.skipped) { fail('caught ev', key, JSON.stringify(r)); continue; }
    if (key === 'give' && (!crimeState(g).jailed || H(g).loot || H(g).hunt)) fail('give up state');
  }
  for (const key of ['run', 'trail', 'hush', 'stay']) { const g = setup(304300 + key.length); const r = direct(g, 'heist_event', { ev: 'close' }, key); if (r.missing || r.skipped) fail('close ev', key, JSON.stringify(r)); }
  for (const key of ['face', 'buy', 'run']) { const g = setup(304400 + key.length); const r = direct(g, 'heist_event', { ev: 'rat', who: '쥐새끼 핍' }, key); if (r.missing || r.skipped) fail('rat ev', key, JSON.stringify(r)); }
  const q = setup(304500); if (!direct(q, 'heist_event', { ev: 'blab', a: 999 }, 'cut').skipped) fail('blab without mate');
  const nh = fresh(304510); if (!direct(nh, 'heist_event', { ev: 'caught' }, 'give').skipped) fail('caught without hunt');
  // 매달: 냄새가 차면 문 앞까지 온다, 멀리 가면 식는다
  const mc = setup(304600); direct(mc, 'heist_split', {}, 'equal'); H(mc).hunt.clue = 99; clearQ(mc); tick(mc);
  if (!L(mc).queue.some((x) => x.kind === 'heist_event' && x.ev === 'caught')) fail('hunters arrive', H(mc).hunt?.clue);
  const cool = setup(304610); direct(cool, 'heist_split', {}, 'equal'); H(cool).hunt.clue = 30; H(cool).hunt.until = nowMi(cool) - 1; clearQ(cool); tick(cool);
  if (H(cool).hunt) fail('hunt ends');
  // 앙심 품은 옛 일행이 밀고하러 온다
  const gr = setup(304620); direct(gr, 'heist_split', {}, 'cross'); H(gr).grudge.at = nowMi(gr); clearQ(gr); tick(gr);
  if (!L(gr).queue.some((x) => x.kind === 'heist_event' && x.ev === 'rat')) fail('grudge rat');
}

/* 5) 꾸미는 동안의 일, 대 잇기, 옛 저장, 저절로 */
{
  const evs = { blab: ['scare', 'cut', 'laugh'], greed: ['pay', 'promise', 'out'], informant: ['sell', 'lie', 'deny'] };
  let n = 0;
  for (const [ev, keys] of Object.entries(evs)) for (const key of keys) {
    const g = plotted(305000 + n++); const m = plan(g).crew[0];
    const r = direct(g, 'heist_event', { ev, a: m.id }, key);
    if (r.missing || r.skipped) { fail('plot ev', ev, key, JSON.stringify(r)); continue; }
    if (ev === 'informant' && key === 'sell' && (plan(g) || H(g).betrayed !== 1 || !H(g).grudge)) fail('sell out');
    if ((key === 'cut' || key === 'out') && plan(g).crew.some((x) => x.id === m.id)) fail('cut', ev);
  }
  // 오래 기다리면 일행이 지쳐 빠진다
  const idle = plotted(305100); for (const m of plan(idle).crew) m.loyal = 14; clearQ(idle); tick(idle);
  if (plan(idle).crew.length) fail('idle crew stays');
  // 매달 일이 저절로 뜬다
  const ev = plotted(305110); plan(ev).alarm = 30; const got = new Set();
  for (let i = 0; i < 60; i++) { clearQ(ev); H(ev).eventAt = -99; for (const m of plan(ev).crew) m.loyal = 60; plan(ev).idle = 0; tick(ev); for (const x of L(ev).queue) if (x.kind === 'heist_event') got.add(x.ev); }
  if (got.size < 2) fail('monthly plot events', [...got]);
  // 대 잇기
  const heirFns = HOOKS.heir.filter((f) => /hunt = null/.test(String(f)) && /inherited/.test(String(f)));
  if (heirFns.length !== 1) fail('heir hook', heirFns.length);
  const hh = plotted(305200); H(hh).loot = { value: 200, kind: 'vault', from: 'x', owner: 'y', at: 0, hot: 90 }; H(hh).hunt = { by: 'z', clue: 50, pow: 40, until: nowMi(hh) + 10, target: 'x', place: 'harfen', kind: 'vault' };
  for (const f of heirFns) f(hh);
  if (plan(hh) || H(hh).hunt || H(hh).loot?.hot !== 0 || !H(hh).loot.inherited) fail('heir', JSON.stringify(H(hh)));
  // 옛 저장
  const x = adult(305300);
  delete x.heist; runHooks('migrate', x);
  if (!x.heist || !Array.isArray(x.heist.done)) fail('migrate');
  x.heist = { plan: { kind: 'vault', place: 'harfen', name: 3, crew: [{ role: 'gone' }, { name: 'a', role: 'lock' }], prep: null, intel: 'x', day: 'y' }, loot: { value: 'x' }, hunt: { by: 'h', clue: 500 }, split: { value: 3 }, grudge: { names: [3], at: 1 }, crewBook: [{ name: 'b', role: 'gone' }] };
  runHooks('migrate', x);
  const p = x.heist.plan;
  if (!p || p.crew.length !== 1 || typeof p.name !== 'string' || !Number.isFinite(p.intel) || p.day !== null || x.heist.loot || x.heist.hunt?.clue !== 100 || x.heist.split || x.heist.grudge || x.heist.crewBook.length) fail('migrate partial', JSON.stringify(x.heist));
  if (JSON.stringify(heistStatus(x)).match(/NaN|undefined/)) fail('status');
  if (bad(heistLine(x)) || josa(heistLine(x))) fail('line', heistLine(x));
  // 저절로 살아 보기
  let total = 0, caught = 0, started = 0;
  for (let run = 0; run < 4; run++) {
    const a = fresh(305400 + run, ['harfen', 'leocast', 'barka', 'verden'][run]);
    for (let mth = 0; mth < 96 && !a.over; mth++) {
      const acts = availableActions(a);
      const pa = plan(a); const want = rngOf(a).chance(0.75) ? (pa ? (pa.crew.length < 3 ? ['heist_crew', 'heist_scout'] : readiness(pa) < 55 ? ['heist_scout'] : ['heist_go', 'heist_scout']) : ['heist_fence', 'heist_lay_low', 'heist_plan']) : [rngOf(a).pick(acts.filter((x2) => !x2.id.startsWith('travel') && x2.id !== 'house_move')).id];
      if (plan(a)) started = Math.max(started, 1);
      month(a, want, (k, labels) => (k === 'heist_target' ? labels.findIndex((l) => !/길\)/.test(l) && !/아직/.test(l)) : k === 'heist_day' ? (readiness(plan(a)) >= 50 ? 0 : labels.length - 1) : k === 'heist_crew' ? labels.findIndex((l) => /닢/.test(l)) : -1));
      const line = heistLine(a); if (bad(line) || josa(line)) fail('line', line);
    }
    total += H(a).total; caught += H(a).caught;
  }
  console.log(`저절로 8년 4판: 해낸 한탕 ${total}번, 붙잡힘 ${caught}번`);
  if (!total) fail('autoplay never pulled one off');
}

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('heist_')))));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
