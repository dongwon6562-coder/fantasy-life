import '../src/content.js';
// 미궁 깊게(src/delve/, 44단계) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/delvetest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES, sceneQueued } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { makeRng } from '../src/rng.js';
import { takeJob } from '../src/jobs.js';
import { me, circleOf } from '../src/game.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
const t0 = Date.now();
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const samples = [];

function month(g, want = []) {
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
    const out = resolveEvent(g, rngOf(g), rngOf(g).int(0, pe.choices.length - 1));
    if (bad(out)) fail('bad scene text', L(g).scene?.kind, pe.title, out);
  }
}
let BASE = null;
function adult(seed) {
  if (!BASE) {
    for (let k = 0; ; k++) {
      const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3501 + k * 977 });
      while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
      if (!g.over) { BASE = JSON.stringify(g); break; }
    }
  }
  const g = JSON.parse(BASE);
  g.rngState.s = seed | 0;
  return g;
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place]?.realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }

import { run as hooks } from '../src/hooks.js';
import { FOES } from '../src/adventure/combat.js';
import { delveInfo, delveLine, delveState as D, DELVES, DELVE_IDS } from '../src/delve/index.js';
import { mineOf } from '../src/delve/core.js';
import { seedParties } from '../src/delve/world.js';

function fresh(seed, pl, { strong = true, money = 200, guild = true } = {}) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = money;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = strong ? 85 : 25;
  g.player.skills.sword = strong ? 95 : 5;
  L(g).gear = { weapon: strong ? 14 : 0, armor: strong ? 12 : 0 };
  L(g).fac = guild ? { guild: { member: true, rank: 0, merit: 0 } } : {};
  g.delve = undefined; D(g); seedParties(g, makeRng({ s: seed }));
  if (g.party) g.party.members = [];
  L(g).renown = 0;
  return g;
}
const R = (g) => rngOf(g);
const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g) && availableActions(g).some((a) => a.id === id);
function direct(g, kind, data, key) {
  const def = SCENES[kind];
  const s = { kind, at: L(g).place, t: 0, ...data };
  if (def.need && !def.need(g, s)) return { skipped: true };
  const t = def.text(g, s), ch = def.choices(g, s), ti = def.title(g, s);
  if (bad(t) || bad(ti) || josa(t) || josa(ti) || ch.some((c) => bad(c.label) || josa(c.label))) fail('scene text', kind, ti, t, ch.map((c) => c.label));
  if (ch.length > 8) fail('too many choices', kind);
  if (!ch.some((c) => c.key === key)) return { missing: true, keys: ch.map((c) => c.key) };
  const out = def.resolve(g, R(g), s, key);
  if (bad(out) || josa(out)) fail('scene out', kind, key, out);
  if (g.player.money < 0) fail('negative money', kind, key);
  if (samples.length < 140) samples.push(`[${ti}] ${key} → ${out}`);
  return { out, s, keys: ch.map((c) => c.key) };
}
const checkInfo = (g, where) => {
  const s = JSON.stringify(delveInfo(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 300));
  const l = delveLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (samples.length < 140) samples.push(`(${id}) ${out}`); return out; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; hooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); if (i % 12 === 0) checkInfo(g, 'adv'); } };
const drop = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const clone = (g) => JSON.parse(JSON.stringify(g));
const top = (g, kind) => L(g).queue.find((x) => x.kind === kind) ?? null;
// 공략 하나를 끝까지: pick(keys, s)가 고른다
function expedition(g, id, startKey = 'entry', pick = (keys) => (keys.includes('master') ? 'master' : keys.includes('down') ? 'down' : 'out')) {
  drop(g);
  const r0 = direct(g, 'dv_plan', { id }, startKey);
  if (r0.missing) { fail('plan key', startKey, r0.keys); return null; }
  let guard = 0, last = null;
  while (guard++ < 20) {
    const riv = top(g, 'dv_rival');
    if (riv) { L(g).queue = L(g).queue.filter((x) => x !== riv); direct(g, 'dv_rival', riv, 'pass'); continue; }
    const s = top(g, 'dv_run');
    if (!s) break;
    L(g).queue = L(g).queue.filter((x) => x !== s);
    const keys = SCENES.dv_run.choices(g, s).map((c) => c.key);
    last = { ...s };
    direct(g, 'dv_run', s, pick(keys, s));
  }
  if (guard >= 20) fail('expedition never ended', id);
  return last;
}

// 1. 미궁 열셋, 자료가 맞다
{
  if (DELVE_IDS.length < 12) fail('delve count', DELVE_IDS.length);
  for (const id of DELVE_IDS) {
    const d = DELVES[id];
    if (!PLACES[d.place]) fail('place', id, d.place);
    if (d.lore.length !== 3 || !d.secret) fail('lore', id);
    if (d.layers[d.layers.length - 1].to !== d.floors) fail('layers end', id);
    for (const l of d.layers) for (const [u] of l.foes) if (!FOES[u]) fail('foe', id, u);
    if (d.master && (!FOES[d.master.unit] || !FOES[d.master.leader])) fail('master foe', id);
  }
  if (new Set(DELVE_IDS.map((id) => DELVES[id].place)).size !== DELVE_IDS.length) fail('one delve per place');
}

// 2. 들어가는 조건: 어른, 길드 미궁은 길드원만
{
  const g = fresh(1, 'barka', { guild: false });
  if (can(g, 'dv_go')) fail('tower without guild');
  L(g).fac = { guild: { member: true, rank: 0, merit: 0 } };
  if (!can(g, 'dv_go')) fail('tower hidden for guild');
  const c = fresh(2, 'ern'); me(c).ageMonths = 14 * 12;
  if (can(c, 'dv_go')) fail('child delves');
  const n = fresh(3, 'klein');
  if (can(n, 'dv_go') || can(n, 'dv_crew')) fail('no dungeon here');
  runAct(g, 'dv_go');
  if (!top(g, 'dv_plan')) fail('plan not queued');
  if (can(g, 'dv_go')) fail('go twice a month');
  checkInfo(g, 'go');
}

// 3. 공략대 꾸리기
{
  const g = fresh(4, 'barka');
  if (!can(g, 'dv_crew')) fail('crew hidden');
  for (const r of ['porter', 'scout', 'shield']) direct(g, 'dv_crew', { id: 'tower' }, `hire:${r}`);
  if (D(g).crew.length !== 3) fail('crew 3', D(g).crew.length);
  const r = direct(g, 'dv_crew', { id: 'tower' }, 'hire:healer');
  if (!r.missing) fail('4th crew');
  if (g.player.money >= 200) fail('crew costs');
  const m0 = g.player.money;
  expedition(g, 'tower');
  if (g.player.money === m0) fail('no wage/sale', m0);
  direct(g, 'dv_crew', { id: 'tower' }, 'disband');
  if (D(g).crew.length) fail('disband');
}

// 4. 한 걸음씩: 층이 늘고, 표식이 남고, 다음엔 표식에서
{
  const g = fresh(5, 'verden');
  const m0 = g.player.money;
  const last = expedition(g, 'old_mine', 'entry', (keys, s) => (s.floor >= 6 || !keys.includes('down') ? 'out' : 'down'));
  const m = mineOf(g, 'old_mine');
  if (m.deepest < 6) fail('deepest', m.deepest, last);
  if (m.mark !== 5) fail('mark', m.mark);
  if (g.player.money <= m0) fail('sold nothing');
  drop(g);
  const r = direct(g, 'dv_plan', { id: 'old_mine' }, 'mark');
  if (r.missing) fail('mark start missing', r.keys);
  if (top(g, 'dv_run')?.floor !== 5) fail('start at mark', top(g, 'dv_run')?.floor);
  checkInfo(g, 'mark');
}

// 5. 주인과 깊은 층의 비밀
{
  let cleared = 0;
  for (let i = 0; i < 4; i++) {
    const g = fresh(10 + i, 'harfen');
    expedition(g, 'grey_hollow');
    if (!D(g).masters.grey_hollow.alive) {
      cleared++;
      if (!mineOf(g, 'grey_hollow').secret || !g.chronicle.some((c) => /주인을 쓰러뜨렸다/.test(c.text))) fail('clear record');
      if (!delveInfo(g).here.mine.secret) fail('info secret');
      // 비어 있는 주인의 방
      drop(g); direct(g, 'dv_plan', { id: 'grey_hollow' }, 'entry');
      const s = { ...top(g, 'dv_run'), floor: 6 };
      if (SCENES.dv_run.choices(g, s).some((c) => c.key === 'master')) fail('master twice');
    }
  }
  if (cleared < 2) fail('strong party rarely clears', cleared);
}

// 6. 약하면 진다: 돈은 음수가 안 되고 짐을 잃는다
{
  let lost = 0;
  for (let i = 0; i < 4; i++) {
    const g = fresh(20 + i, 'graubel', { strong: false, money: 5 });
    expedition(g, 'rift', 'entry', (keys) => (keys.includes('down') ? 'down' : 'out'));
    if (g.player.money < 0) fail('negative');
    if (g.player.injuries.length) lost++;
  }
  if (!lost) fail('weak never hurt');
}

// 7. 야영, 탑의 문지기, 다른 공략대
{
  const g = fresh(30, 'barka');
  drop(g); direct(g, 'dv_plan', { id: 'tower' }, 'entry');
  const s = { ...top(g, 'dv_run'), floor: 8, hp: 20 };
  drop(g);
  direct(g, 'dv_run', s, 'camp');
  const s2 = top(g, 'dv_run');
  if (s2 && s2.hp <= 20 && s2.steps === 1) fail('camp heal', s2.hp);
  drop(g);
  const s3 = { ...s, hp: s.hp0 };
  direct(g, 'dv_run', s3, 'down');
  const s4 = top(g, 'dv_run') ?? top(g, 'dv_rival')?.run;
  if (s4 && s4.floor !== 10) fail('guard floor', s4.floor);
  // 다른 공략대
  const p = D(g).parties[0]; p.at = 'tower'; p.best = 10; p.alive = true;
  for (const key of ['pass', 'join', 'fight']) {
    const c = clone(g); drop(c);
    const run = { id: 'tower', floor: 10, hp: 100, hp0: 100, bag: 40, loads: 2, steps: 2, merc: false, ally: null, met: [p.id], found: 0 };
    const r = direct(c, 'dv_rival', { pid: p.id, run }, key);
    if (r.missing || r.skipped) fail('rival', key, r);
  }
}

// 8. 플레이어 없이 60년: 공략대·기록·거리·주인
{
  const g = fresh(40, 'ern');
  D(g).masters.catacomb.alive = false; D(g).masters.catacomb.since = 0;
  const c0 = g.chronicle.length;
  const names0 = D(g).parties.map((p) => p.id).join();
  const pop0 = D(g).towns.tower.pop;
  adv(g, 60 * 12);
  const s = D(g);
  if (s.parties.filter((p) => p.alive).length < 3) fail('parties died out');
  if (s.parties.map((p) => p.id).join() === names0) fail('parties never changed');
  if (s.rec.tower.best <= 87) fail('tower record never moved', s.rec.tower.best);
  if (Math.abs(s.towns.tower.pop - pop0) < 3) fail('town static', pop0, s.towns.tower.pop);
  if (!s.masters.catacomb.alive) fail('master never returned');
  const n = g.chronicle.length - c0;
  const mine = g.chronicle.slice(c0).filter((c) => /공략대|미궁|탑|주인|거리/.test(c.text)).length;
  if (mine < 5 || mine > 160) fail('delve chronicle', mine, n);
  if (verbose) console.log('chron', mine, 'tower', s.rec.tower.best, s.rec.tower.holder, 'pop', Math.round(s.towns.tower.pop));
  checkInfo(g, 'world');
}

// 9. 대를 이으면, 옛 저장
{
  const g = fresh(50, 'verden');
  expedition(g, 'old_mine');
  hooks('heir', g, R(g), null);
  if (Object.keys(D(g).mine).length || D(g).crew.length || !D(g).past.length) fail('heir', D(g));
  if (Object.values(D(g).rec).some((r) => r.me)) fail('heir rec me');
  const o = fresh(51, 'barka'); delete o.delve;
  hooks('migrate', o);
  if (!D(o).parties.length) fail('old save parties');
  checkInfo(o, 'old');
  if (!delveInfo(o).here || delveInfo(o).here.record.best < 87) fail('info here');
}

const ms = Date.now() - t0;
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `delvetest: ${problems} problems (${ms}ms)` : `delvetest ok (${ms}ms)`);
process.exit(problems ? 1 : 0);
