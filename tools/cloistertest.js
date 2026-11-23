import '../src/content.js';
// 수도원과 은둔(src/cloister/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/cloistertest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES, sceneQueued } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { makeRng } from '../src/rng.js';
import { cloisterInfo as info0, cloisterLine, cloisterState as C, oblateOk } from '../src/cloister/index.js';
import { mi, HOUSES, inHouse, hermitHere, vowed } from '../src/cloister/core.js';
import { faithState } from '../src/faith/index.js';
import { me } from '../src/game.js';
import { byId } from '../src/npc.js';

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

function fresh(seed, pl, { dev = 0, stress = 10, age = null } = {}) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = stress; g.player.money = 200;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  L(g).job = null; g.cloister = undefined; C(g);
  faithState(g).devotion = dev;
  const sp = me(g).spouseId != null ? byId(g, me(g).spouseId) : null; if (sp) sp.alive = false;
  if (age != null) me(g).ageMonths = age * 12;
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
  if (samples.length < 90) samples.push(`[${ti}] ${key} → ${out}`);
  return { out, s };
}
const clone = (g) => JSON.parse(JSON.stringify(g));
const checkInfo = (g, where) => {
  const s = JSON.stringify(info0(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 200));
  const l = cloisterLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 100) samples.push(`(${id}) ${out}`); return out; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); checkInfo(g, 'adv'); } };
const enter = (g) => direct(g, 'cloister_gate', { house: 'valley' }, 'enter');
const drop = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const queued = (g, k) => sceneQueued(g, k);

// 1. 아무나 수도원 문을 두드리지 않는다: 믿음이 깊거나, 마음이 무너졌거나, 늙었거나
{
  const g = fresh(1, 'gruental'); checkInfo(g, 'start');
  if (can(g, 'cloister_gate')) fail('gate for nobody');
  if (!can(fresh(2, 'gruental', { dev: 60 }), 'cloister_gate')) fail('devout cannot knock');
  if (!can(fresh(3, 'gruental', { stress: 85 }), 'cloister_gate')) fail('broken cannot knock');
  if (can(fresh(4, 'ern', { dev: 80 }), 'cloister_gate')) fail('gate without house');
  if (can(fresh(6, 'verden', { dev: 80 }), 'cloister_gate')) fail('man at nunnery');
  { const f = fresh(7, 'verden', { dev: 80 }); f.player.sex = 'f'; if (!can(f, 'cloister_gate')) fail('woman cannot enter nunnery'); }
  for (const id of ['cloister_work', 'cloister_labor', 'cloister_hours', 'cloister_leave', 'cloister_hermit', 'cloister_solitude', 'cloister_rule']) if (can(g, id)) fail('hidden action shows', id);
  const sp = fresh(5, 'gruental', { dev: 80 }); const s = me(sp).spouseId != null ? byId(sp, me(sp).spouseId) : null;
  if (s) { s.alive = true; if (can(sp, 'cloister_gate')) fail('married knocks'); }
}

// 2. 손님·시주·청원자: 가진 것을 바치고 들어간다
{
  const base = fresh(10, 'gruental', { dev: 60 });
  runAct(clone(base), 'cloister_gate');
  const r = clone(base); direct(r, 'cloister_gate', { house: 'valley' }, 'retreat'); if (r.player.money !== 196 || vowed(r)) fail('retreat');
  const gi = clone(base); direct(gi, 'cloister_gate', { house: 'valley' }, 'gift'); if (gi.player.money !== 180) fail('gift');
  const e = clone(base); enter(e);
  if (!vowed(e) || C(e).vow.stage !== 'postulant' || e.player.money !== 40) fail('enter', C(e).vow, e.player.money);
  if (!inHouse(e) || !can(e, 'cloister_hours') || !can(e, 'cloister_work') || can(e, 'cloister_gate')) fail('postulant actions');
  if (can(e, 'love_date')) fail('vowed can court');
  checkInfo(e, 'postulant');
}

// 3. 청원자 → 수련자 → 서원 → 부원장, 맡은 일
{
  const g = fresh(20, 'gruental', { dev: 60 }); enter(g);
  direct(g, 'cloister_role', {}, 'herbs');
  if (C(g).vow.role !== 'herbs' || can(g, 'cloister_work')) fail('role pick');
  const h0 = g.player.skills.herbs ?? 0; for (let i = 0; i < 4; i++) runAct(g, 'cloister_labor');
  if (!((g.player.skills.herbs ?? 0) > h0) || C(g).herbs !== 4) fail('labor', g.player.skills.herbs, C(g).herbs);
  for (const r of ['scriptorium', 'brew', 'bells', 'fields']) { const x = clone(g); direct(x, 'cloister_role', {}, r); g.player.fatigue = 0; runAct(x, 'cloister_labor'); }
  runAct(g, 'cloister_hours');
  adv(g, 6); drop(g);
  if (C(g).vow.stage !== 'novice') fail('novice', C(g).vow.stage);
  adv(g, 12);
  if (!queued(g, 'cloister_vows')) fail('vows not queued');
  drop(g);
  const w = clone(g); direct(w, 'cloister_vows', {}, 'wait'); if (C(w).vow.stage !== 'novice') fail('wait');
  const go = clone(g); direct(go, 'cloister_vows', {}, 'go'); if (vowed(go) || C(go).left.length !== 1) fail('go from vows');
  direct(g, 'cloister_vows', {}, 'vow'); if (C(g).vow.stage !== 'monk') fail('vow');
  C(g).vow.merit = 40; adv(g, 1); drop(g); if (C(g).vow.stage !== 'prior') fail('prior', C(g).vow.stage);
  checkInfo(g, 'prior');
  // 담 밖에 오래 있으면 서원이 흐려진다
  const away = clone(g); placeAt(away, 'ern'); adv(away, 8); if (vowed(away) || C(away).left.at(-1).how !== 'away') fail('away lapse');
  // 떠나기
  const l1 = clone(g); runAct(l1, 'cloister_leave'); direct(l1, 'cloister_leave', {}, 'blessing'); if (vowed(l1)) fail('leave blessing');
  const l2 = clone(g); direct(l2, 'cloister_leave', {}, 'night'); if (vowed(l2)) fail('leave night');
  const l3 = clone(g); direct(l3, 'cloister_leave', {}, 'stay'); if (!vowed(l3)) fail('stay');
  if (!can(l1, 'cloister_gate') || l1.player.stress > 100) { faithState(l1).devotion = 0; l1.player.stress = 0; if (!can(l1, 'cloister_gate')) fail('left cannot come back'); }
}

// 4. 원장 선출과 원장의 일, 땅 다툼
{
  const g = fresh(30, 'gruental', { dev: 60 }); enter(g); C(g).vow.stage = 'monk'; C(g).vow.merit = 90;
  const hs = C(g).houses.valley; hs.age = 200; // 반드시 죽는다
  g.date.month = 12; adv(g, 1);
  if (!queued(g, 'cloister_election')) fail('election not queued', hs.abbot);
  drop(g);
  let won = 0;
  for (let i = 0; i < 12; i++) { const x = clone(g); x.rngState.s = 100 + i; direct(x, 'cloister_election', {}, 'stand'); if (C(x).vow.stage === 'abbot') won++; if (C(x).houses.valley.abbot === '빈자리') fail('empty abbot'); }
  if (won < 4) fail('merit abbot rarely wins', won);
  const b = clone(g); direct(b, 'cloister_election', {}, 'back'); if (C(b).vow.stage !== 'prior') fail('back → prior');
  const a = clone(g); C(a).vow.stage = 'abbot'; C(a).houses.valley.abbot = a.player.name;
  if (!can(a, 'cloister_rule')) fail('abbot rule hidden');
  for (const k of ['alms', 'build', 'sell', 'feast', 'keep']) direct(clone(a), 'cloister_rule', {}, k);
  runAct(a, 'cloister_rule'); if (can(a, 'cloister_rule')) fail('rule twice');
  // 땅 다툼: 원장이면 장면, 아니면 저절로 끝난다
  C(a).houses.valley.dispute = { lord: HOUSES.valley.lord, since: mi(a), stake: 10, until: mi(a) + 12 }; drop(a);
  adv(a, 1); if (!queued(a, 'cloister_dispute')) fail('dispute scene');
  drop(a);
  for (const k of ['court', 'yield', 'bishop']) { const x = clone(a); const l0 = C(x).houses.valley.land; direct(x, 'cloister_dispute', {}, k); if (C(x).houses.valley.dispute) fail('dispute stays', k); if (k === 'yield' && C(x).houses.valley.land !== l0 - 10) fail('yield land'); }
  const f = clone(a); f.player.skills.letters = 60; if (direct(f, 'cloister_dispute', {}, 'forge').missing) fail('forge hidden');
  const n = fresh(31, 'ern'); C(n).houses.stone.dispute = { lord: HOUSES.stone.lord, since: mi(n), stake: 8, until: mi(n) + 3 };
  adv(n, 4); if (C(n).houses.stone.dispute) fail('npc dispute never ends');
  // 원장이 떠나면 새 원장
  const lv = clone(a); direct(lv, 'cloister_leave', {}, 'blessing'); if (C(lv).houses.valley.abbot === lv.player.name) fail('abbot leaves but keeps seat');
}

// 5. 플레이어 없이도: 육십 년 동안 원장이 바뀌고 땅을 다툰다
{
  const g = fresh(40, 'ern'); const a0 = HOUSES && Object.values(C(g).houses).map((h) => h.abbot).join();
  const c0 = g.chronicle.length;
  adv(g, 12 * 60);
  const a1 = Object.values(C(g).houses).map((h) => h.abbot).join();
  if (a0 === a1) fail('abbots never change');
  const lines = g.chronicle.slice(c0).filter((c) => /수도원|수녀원/.test(c.text));
  if (lines.length < 8) fail('few cloister chronicle lines', lines.length);
  if (lines.length > 80) fail('too many cloister lines', lines.length);
  for (const h of Object.values(C(g).houses)) if (h.abbot === '빈자리' || !(h.land >= 0)) fail('house state', h);
  if (verbose) console.log('60y', lines.length, a1, lines.slice(0, 4).map((c) => c.text));
}

// 6. 은둔처와 손님
{
  if (can(fresh(50, 'graubel', { dev: 60 }), 'cloister_hermit')) fail('young hermit');
  const g = fresh(51, 'graubel', { dev: 60, age: 45 });
  if (!can(g, 'cloister_hermit')) fail('hermit hidden');
  if (can(fresh(52, 'ern', { dev: 60, age: 45 }), 'cloister_hermit')) fail('hermit without wild');
  runAct(g, 'cloister_hermit');
  if (!hermitHere(g) || !can(g, 'cloister_solitude') || can(g, 'cloister_down') || can(g, 'love_date')) fail('hermit actions');
  runAct(g, 'cloister_solitude');
  let seen = 0;
  for (let i = 0; i < 10; i++) { adv(g, 1); if (queued(g, 'cloister_visitor')) { seen++; drop(g); } }
  if (seen < 1) fail('no visitors');
  for (const kind of ['pilgrim', 'sick', 'lord', 'fugitive', 'kin', 'thief']) {
    g.player.skills.herbs = 30;
    for (const k of ['bless', 'bread', 'herbs', 'pray', 'peace', 'silent', 'war', 'hide', 'turn', 'go', 'stay', 'let', 'follow']) direct(clone(g), 'cloister_visitor', { who: kind }, k);
  }
  const k = clone(g); direct(k, 'cloister_visitor', { who: 'kin' }, 'go'); if (C(k).hermit) fail('kin go keeps hermit');
  if (!can(g, 'cloister_down')) fail('down hidden');
  const d = clone(g); runAct(d, 'cloister_down'); if (C(d).hermit || C(d).past.length !== 1) fail('down');
  const m = clone(g); placeAt(m, 'ern'); adv(m, 1); if (C(m).hermit) fail('hermit kept after moving');
  // 서원한 수도자도 은둔할 수 있다
  const mk = fresh(53, 'graubel', { dev: 60 }); C(mk).vow = { house: 'stone', since: mi(mk), stage: 'monk', role: null, roleAt: 0, oblate: false, merit: 0, away: 0 };
  if (!can(mk, 'cloister_hermit')) fail('monk hermit hidden');
  runAct(mk, 'cloister_hermit'); adv(mk, 8); if (!vowed(mk)) fail('hermit monk lapsed');
}

// 7. 어린 헌납: 가난하고 식구 많은 집, 또는 믿음 깊은 집. 한 번만
{
  const g = fresh(60, 'gruental', { age: 8 }); g.player.money = 0; g.player.familyMoney = 5; while (g.player.familyIds.length < 5) g.player.familyIds.push(g.player.familyIds[0]);
  if (!oblateOk(g)) fail('oblate not ok');
  const rich = clone(g); rich.player.familyMoney = 300; if (oblateOk(rich)) fail('rich oblate');
  if (oblateOk(fresh(61, 'gruental', { age: 20 }))) fail('adult oblate');
  // 해마다 다섯 번 중 한 번꼴: 여러 집에서 보면 거의 다 묻는다
  let asked = 0;
  for (let k = 0; k < 6; k++) { const x = clone(g); x.rngState.s = 900 + k * 31; for (let i = 0; i < 24; i++) { adv(x, 1); if (queued(x, 'cloister_oblate')) { asked++; if (!C(x).oblateAsked) fail('asked flag'); adv(x, 3); if (L(x).queue.filter((q) => q.kind === 'cloister_oblate').length > 1) fail('oblate twice'); break; } } }
  if (asked < 4) fail('oblate rarely asked', asked);
  drop(g);
  const h = clone(g); direct(h, 'cloister_oblate', {}, 'hide'); if (vowed(h)) fail('hide');
  direct(g, 'cloister_oblate', {}, 'go'); if (C(g).vow?.stage !== 'oblate') fail('oblate go');
  if (can(g, 'cloister_leave') || can(g, 'cloister_work')) fail('oblate actions');
  checkInfo(g, 'oblate');
  me(g).ageMonths = 15 * 12; adv(g, 1); if (!queued(g, 'cloister_vows')) fail('oblate vows at 15');
  drop(g); direct(g, 'cloister_vows', {}, 'vow'); if (C(g).vow.stage !== 'monk') fail('oblate vow');
}

// 8. 대를 이으면 서원과 움막은 끝나고 기록은 남는다; 저장 왕복
{
  const g = fresh(70, 'gruental', { dev: 60 }); enter(g); C(g).vow.stage = 'abbot'; C(g).houses.valley.abbot = g.player.name;
  runHooks('heir', g, R(g), null);
  if (vowed(g) || C(g).past.length !== 1 || C(g).houses.valley.abbot === g.player.name) fail('heir');
  const s = clone(g); delete s.cloister.hermit; runHooks('migrate', s); if (s.cloister.hermit !== null) fail('migrate');
}

// 9. 장면 이름은 cloister_ 로 시작하고, 시험 시간 1분
if (Object.keys(SCENES).filter((k) => k.startsWith('cloister_')).length < 9) fail('scene count');
if (verbose) console.log(samples.join('\n'));
const sec = (Date.now() - t0) / 1000;
if (sec > 60) fail('too slow', sec);
console.log(problems ? `cloistertest: ${problems} problems (${sec.toFixed(1)}s)` : `cloistertest ok (${sec.toFixed(1)}s)`);
process.exit(problems ? 1 : 0);
