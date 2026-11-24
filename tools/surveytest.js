import '../src/content.js';
// 지도 그리는 사람과 측량사(src/survey/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/surveytest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES, sceneQueued } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { makeRng } from '../src/rng.js';
import { takeJob } from '../src/jobs.js';
import { me } from '../src/game.js';
import { surveyInfo as info0, surveyLine, surveyState as S, mapValue } from '../src/survey/index.js';
import { mi, isSV, addMap, ATELIER_COST } from '../src/survey/core.js';

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



function fresh(seed, pl, { job = false, sk = 0, letters = 30, money = 200 } = {}) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = money;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  g.player.skills.letters = letters;
  L(g).job = null; g.survey = undefined; S(g).skill = sk;
  if (g.explore) g.explore.regions = {};
  if (g.realm) { if (g.realm.balhart) g.realm.balhart.war = false; if (g.realm.north) g.realm.north.war = false; if (g.realm.succession === 'civilwar') g.realm.succession = null; }
  if (job) takeJob(g, 'surveyor');
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
  if (samples.length < 120) samples.push(`[${ti}] ${key} → ${out}`);
  return { out, s };
}
const clone = (g) => JSON.parse(JSON.stringify(g));
const checkInfo = (g, where) => {
  const s = JSON.stringify(info0(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 200));
  const l = surveyLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 120) samples.push(`(${id}) ${out}`); return out; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); checkInfo(g, 'adv'); } };
const drop = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const queued = (g, k) => sceneQueued(g, k);
const ALL = ['sv_commission', 'sv_draw', 'sv_copy', 'sv_sell', 'sv_atelier', 'sv_master', 'sv_war', 'sv_burn'];

// 1. 아무나 측량대를 들지 않는다
{
  const g = fresh(1, 'harfen'); checkInfo(g, 'start');
  for (const id of ALL) if (can(g, id)) fail('hidden action shows', id);
  const j = fresh(2, 'harfen', { job: true });
  if (!isSV(j)) fail('surveyor job');
  if (!can(j, 'sv_draw')) fail('surveyor cannot draw');
  if (can(j, 'sv_commission')) fail('commission for novice');
  const w = clone(j); const m0 = w.player.money; runAct(w, 'work'); if (!(w.player.money > m0) || !(S(w).skill > 0)) fail('work');
  checkInfo(j, 'job');
}

// 2. 측량 의뢰 넷: 정직하게, 돈을 받고, 사이에서
{
  const g = fresh(10, 'harfen', { job: true, sk: 20 });
  if (!can(g, 'sv_commission')) fail('commission hidden');
  runAct(clone(g), 'sv_commission');
  const keys = { border: ['true', 'shift', 'split'], road: ['straight', 'around', 'bribe'], frontier: ['fair', 'founder', 'poor'], estate: ['true', 'small', 'big'] };
  for (const [what, ks] of Object.entries(keys)) for (const k of ks) { const x = clone(g); const r = direct(x, 'sv_commission', { what, a: '그륀탈 영주', b: '베르덴 백작', site: 'fr_wood', work: 'w_wall' }, k); if (r.missing) fail('key missing', what, k); if (S(x).jobs !== 1) fail('job count'); }
  const t = clone(g), sh = clone(g); direct(t, 'sv_commission', { what: 'border', a: 'A 영주', b: 'B 백작' }, 'true'); direct(sh, 'sv_commission', { what: 'border', a: 'A 영주', b: 'B 백작' }, 'shift');
  if (!(sh.player.money > t.player.money) || !S(sh).borders[0].shifted || S(t).borders[0].shifted) fail('shift pays and remembers');
  runAct(g, 'sv_commission'); if (can(g, 'sv_commission')) fail('commission every month');
  // 경계 다툼의 증인: 몇 해 뒤 불린다
  let called = 0;
  for (let i = 0; i < 4 && !called; i++) { const x = clone(sh); x.rngState.s = 70 + i; for (let m = 0; m < 48; m++) { adv(x, 1); if (queued(x, 'sv_witness')) { called = 1; drop(x); break; } } }
  if (!called) fail('witness never called');
  for (const k of ['truth', 'side', 'dodge']) { const x = clone(sh); direct(x, 'sv_witness', {}, k); if (k === 'truth' && S(x).borders.at(-1).shifted) fail('truth clears shift'); }
}

// 3. 지도 그리기와 팔기, 흠을 숨기면 뒤탈
{
  const g = fresh(20, 'portel', { job: false, sk: 15 });
  if (!can(g, 'sv_draw')) fail('skilled cannot draw');
  runAct(g, 'sv_draw');
  if (S(g).maps.length !== 1 || can(g, 'sv_draw')) fail('draw once per town');
  if (!can(g, 'sv_sell')) fail('sell hidden');
  runAct(clone(g), 'sv_sell');
  const m = S(g).maps[0];
  for (const k of ['fair', 'haggle', 'hide', 'keep']) direct(clone(g), 'sv_sell', { map: m.id, buyer: 'guild' }, k);
  const low = clone(g); S(low).maps[0].q = 20; const r = direct(low, 'sv_sell', { map: m.id, buyer: 'captain' }, 'hide'); if (r.missing || !S(low).maps[0].lie) fail('hide lie');
  let back = 0; for (let i = 0; i < 60 && !back; i++) { adv(low, 1); if (S(low).lost) back = 1; }
  if (!back) fail('lie never comes back');
  const inland = fresh(21, 'ern', { sk: 15 }); addMap(inland, 'town', 'ern', 50); if (can(inland, 'sv_sell')) fail('sell in village');
  checkInfo(g, 'maps');
}

// 4. 미지의 땅: 원정 밑그림이 있어야 옮겨 그린다. 낯선 손님
{
  const g = fresh(30, 'portel', { sk: 20 });
  if (can(g, 'sv_copy')) fail('copy without expedition');
  g.explore.regions.frost = { mapped: 0.7, trips: 1, heart: false };
  if (!can(g, 'sv_copy')) fail('copy hidden');
  runAct(g, 'sv_copy'); if (can(g, 'sv_copy') || S(g).maps[0].kind !== 'region') fail('copy once');
  const m = S(g).maps[0];
  if (!(mapValue(g, m) > mapValue(g, addMap(clone(g), 'town', 'portel', m.q)))) fail('region map worth more');
  const d = clone(g); direct(d, 'sv_sell', { map: m.id, buyer: 'stranger' }, 'double'); if (!S(d).maps[0].foreign) fail('foreign sale');
}

// 5. 공방, 도제, 평생의 지도
{
  const g = fresh(40, 'leocast', { job: true, sk: 60, money: 300 });
  if (!can(g, 'sv_atelier')) fail('atelier hidden');
  if (can(fresh(41, 'leocast', { job: true, sk: 20, money: 300 }), 'sv_atelier')) fail('atelier for novice');
  runAct(g, 'sv_atelier'); if (!S(g).atelier || g.player.money !== 300 - ATELIER_COST) fail('atelier');
  if (can(g, 'sv_master')) fail('master without maps');
  for (let i = 0; i < 6; i++) addMap(g, 'town', 'ern', 50);
  if (!can(g, 'sv_master')) fail('master hidden');
  const c0 = g.chronicle.length;
  for (let i = 0; i < 6 && !S(g).masterworks.length; i++) { g.player.fatigue = 0; runAct(g, 'sv_master'); }
  if (S(g).masterworks.length !== 1 || !g.chronicle.slice(c0).some((c) => /대륙 지도/.test(c.text))) fail('masterwork');
  if (can(g, 'sv_master')) fail('masterwork twice');
  adv(g, 14); if (!S(g).atelier.app.length) fail('no apprentice');
  const a = clone(g); a.survey.atelier.app[0].since -= 60; const s0 = Object.keys(S(a).shops).length; adv(a, 1); if (Object.keys(S(a).shops).length !== s0 + 1) fail('apprentice shop');
  checkInfo(g, 'atelier');
  runHooks('heir', g, R(g), null);
  if (S(g).skill !== 0 || !S(g).atelier || !S(g).masterworks[0].family) fail('heir');
  if (S(g).masterworks.some((w) => w.mine)) fail('heir mine flag');
}

// 6. 군용 지도: 전쟁 때만, 쥐고 있으면 밤 손님
{
  const g = fresh(50, 'leocast', { job: true, sk: 40 });
  if (can(g, 'sv_war')) fail('war map in peace');
  g.realm.balhart.war = true;
  if (!can(g, 'sv_war')) fail('war map hidden');
  runAct(g, 'sv_war'); if (!S(g).maps.some((m) => m.kind === 'war') || !can(g, 'sv_burn') || can(g, 'sv_war')) fail('war map');
  if (can(g, 'sv_sell') && S(g).maps.every((m) => m.kind === 'war')) fail('war map sold in market');
  let came = 0; for (let i = 0; i < 4 && !came; i++) { const x = clone(g); x.rngState.s = 90 + i; for (let m = 0; m < 24; m++) { adv(x, 1); if (queued(x, 'sv_theft')) { came = 1; break; } } }
  if (!came) fail('no night visitor');
  for (const k of ['refuse', 'report', 'sell']) direct(clone(g), 'sv_theft', {}, k);
  const sl = clone(g); const c0 = sl.chronicle.length; direct(sl, 'sv_theft', {}, 'sell'); if (!sl.chronicle.slice(c0).length || can(sl, 'sv_burn')) fail('sell war map');
  const b = clone(g); runAct(b, 'sv_burn'); if (can(b, 'sv_burn')) fail('burn');
}

// 7. 플레이어 없이도: 공방들이 지도를 찍고 틀린 지도에 길을 잃는다; 저장 왕복
{
  const g = fresh(60, 'ern'); const c0 = g.chronicle.length;
  adv(g, 12 * 40);
  const lines = g.chronicle.slice(c0).filter((c) => /지도/.test(c.text));
  if (lines.length < 3 || lines.length > 60) fail('shop lines', lines.length);
  if (verbose) console.log('40y', lines.length, lines.slice(0, 3).map((c) => c.text));
  const s = clone(g); delete s.survey.atelier; delete s.survey.shops.cheap; runHooks('migrate', s); if (s.survey.atelier !== null || !s.survey.shops.cheap) fail('migrate');
}

if (Object.keys(SCENES).filter((k) => k.startsWith('sv_')).length < 4) fail('scene count');
if (verbose) console.log(samples.join('\n'));
const sec = (Date.now() - t0) / 1000;
if (sec > 60) fail('too slow', sec);
console.log(problems ? `surveytest: ${problems} problems (${sec.toFixed(1)}s)` : `surveytest ok (${sec.toFixed(1)}s)`);
process.exit(problems ? 1 : 0);
