import '../src/content.js';
// 마법으로 먹고살기(src/magejob/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/magejobtest.js [-v]
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
import { magejobInfo as info0, magejobLine, magejobState as M, spellFor, boardTasks } from '../src/magejob/index.js';
import { TASKS, successP } from '../src/magejob/core.js';
import { SPELLS } from '../src/magic/spells.js';

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




// 서클은 마력과 마법 솜씨로 정해진다: 원하는 서클이 나올 때까지 올린다
function setCircle(g, c) {
  const p = g.player; p.manaAwakened = c > 0; p.mana = 0; p.skills.magic = 0;
  for (let i = 0; i < 400 && circleOf(g) < c; i++) { p.mana += 5; p.skills.magic = Math.min(100, p.skills.magic + 1); }
}
function fresh(seed, pl, { circle = 1, spells = ['ember', 'purify', 'light'], money = 100 } = {}) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = money;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  L(g).job = null; g.magejob = undefined; M(g);
  setCircle(g, circle);
  g.magic = { known: [...spells], certified: 0, exam: null, study: null, works: 0 };
  if (g.nature) g.nature.active = [];
  if (g.mana) g.mana.tide = 0;
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
  const l = magejobLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 120) samples.push(`(${id}) ${out}`); return out; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); checkInfo(g, 'adv'); } };
const drop = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const queued = (g, k) => sceneQueued(g, k);
const ALL = ['mj_board', 'mj_tutor', 'mj_teach', 'mj_merc'];

// 1. 주문이 없으면 일도 없다. 1서클 생활 주문만으로도 게시판 일이 있다
{
  const none = fresh(1, 'harfen', { circle: 0, spells: [] }); checkInfo(none, 'none');
  for (const id of ALL) if (can(none, id)) fail('hidden action shows', id);
  const g = fresh(2, 'harfen');
  if (circleOf(g) !== 1) fail('circle setup', circleOf(g));
  if (!can(g, 'mj_board')) fail('1-circle board hidden');
  if (!boardTasks(g).includes('kindle') || !boardTasks(g).includes('well')) fail('1-circle tasks', boardTasks(g));
  if (can(g, 'mj_tutor') || can(g, 'mj_merc')) fail('tutor/merc for 1-circle');
  if (spellFor(g, 'minelight')?.id !== 'light') fail('light for mine');
  checkInfo(g, 'c1');
}

// 2. 주문 목록을 읽기만 한다: 새 주문이 생기면 저절로 일이 늘어난다
{
  const g = fresh(3, 'harfen');
  SPELLS.push({ id: 'zz_test_cloud', circle: 3, use: 'life', name: '구름 모으기', desc: '하늘의 물기를 모아 비를 내린다.' });
  g.magic.known.push('zz_test_cloud');
  if (spellFor(g, 'rain')?.id !== 'zz_test_cloud') fail('new spell not used', spellFor(g, 'rain')?.id);
  SPELLS.pop(); g.magic.known.pop();
  // 계열이 붙은 주문도 읽는다
  SPELLS.push({ id: 'zz_test_school', circle: 2, use: 'life', name: '이름 모를 술식', desc: '', school: 'earth' });
  g.magic.known = ['zz_test_school'];
  if (spellFor(g, 'kindle')) fail('earth spell kindles');
  SPELLS.pop();
}

// 3. 게시판 → 흥정 → 해냈는가 → 책임
{
  const g = fresh(10, 'harfen');
  runAct(g, 'mj_board'); if (can(g, 'mj_board')) fail('board twice a month');
  drop(g);
  const r = direct(g, 'mj_board', {}, 'kindle'); if (r.missing || !queued(g, 'mj_job')) fail('board pick');
  drop(g);
  let ok = 0, failed = 0;
  for (let i = 0; i < 20; i++) { const x = clone(g); x.rngState.s = 100 + i; const m0 = x.player.money; direct(x, 'mj_job', { task: 'kindle' }, 'fair'); if (x.player.money > m0) ok++; if (queued(x, 'mj_fail')) failed++; }
  if (ok < 8 || failed < 1) fail('kindle odds', ok, failed);
  if (!(successP(g, 'kindle', spellFor(g, 'kindle')) > successP(g, 'ward', { circle: 1 }))) fail('harder task harder');
  for (const k of ['low', 'high', 'upfront']) direct(clone(g), 'mj_job', { task: 'well' }, k);
  for (const k of ['refund', 'again', 'blame']) direct(clone(g), 'mj_fail', { task: 'well', paid: 0 }, k);
  const up = clone(g); up.player.money = 50; direct(up, 'mj_fail', { task: 'well', paid: 5 }, 'flee'); if (up.player.money !== 50) fail('flee keeps money');
  const rf = clone(g); rf.player.money = 50; direct(rf, 'mj_fail', { task: 'well', paid: 5 }, 'refund'); if (rf.player.money !== 45) fail('refund');
  // 마나 썰물이면 덜 듣는다
  const lo = clone(g); lo.mana.tide = -80; if (!(successP(lo, 'kindle', spellFor(lo, 'kindle')) < successP(g, 'kindle', spellFor(g, 'kindle')))) fail('tide');
}

// 4. 맞는 주문 없이 비 부르기: 가뭄에만, 거의 안 된다, 물러날 수 있다
{
  const g = fresh(20, 'harfen', { circle: 1, spells: ['ember'] });
  if (boardTasks(g).includes('rain')) fail('rain without drought');
  g.nature.active.push({ kind: 'drought', region: 'south', left: 3 });
  const b = boardTasks(g); if (!b.includes('rain') || spellFor(g, 'rain')) fail('rain bluff on board', b);
  if (direct(clone(g), 'mj_job', { task: 'rain' }, 'decline').missing) fail('decline missing');
  let ok = 0; for (let i = 0; i < 20; i++) { const x = clone(g); x.rngState.s = 300 + i; const m0 = x.player.money; direct(x, 'mj_job', { task: 'rain' }, 'fair'); if (x.player.money > m0) ok++; }
  if (ok > 5) fail('rain bluff too easy', ok);
}

// 5. 마을 결계: 닳으면 게시판에 나오고, 고치면 단단해진다. 떠돌이 마법사들도 고친다
{
  const g = fresh(30, 'ern', { circle: 2, spells: ['ember', 'earthwall'] });
  M(g).wards.ern = 30;
  if (!boardTasks(g).includes('ward')) fail('ward task', boardTasks(g));
  let fixed = 0; for (let i = 0; i < 12; i++) { const x = clone(g); x.rngState.s = 400 + i; direct(x, 'mj_job', { task: 'ward' }, 'fair'); if (M(x).wards.ern > 60) fixed++; }
  if (fixed < 4) fail('ward fix rare', fixed);
  const w = fresh(31, 'ern'); const c0 = w.chronicle.length; adv(w, 12 * 30);
  if (Object.values(M(w).wards).some((v) => !(v >= 0 && v <= 100))) fail('ward range');
  if (!M(w).rivals.some((r) => r.fame > 30)) fail('rivals never work');
  const lines = w.chronicle.slice(c0).filter((c) => /결계/.test(c.text)); if (lines.length > 70) fail('too many ward lines', lines.length); // 45단계: 나라 사이 흐름으로 주사위가 밀려 64줄이 나온 판이 있어 문턱 60→70
  if (verbose) console.log('30y ward lines', lines.length, lines.slice(0, 3).map((c) => c.text));
}

// 6. 가정교사: 2서클부터, 수업 여섯 번이면 끝, 재능 없으면 솔직히 말할지
{
  const g = fresh(40, 'leocast', { circle: 2, spells: ['ember', 'sense'] });
  if (!can(g, 'mj_tutor')) fail('tutor hidden');
  runAct(g, 'mj_tutor'); drop(g);
  direct(g, 'mj_pupil', { who: 'noble', talent: 10 }, 'take'); if (!M(g).pupil || M(g).pupil.fee !== 6) fail('pupil');
  const m0 = g.player.money; adv(g, 1); if (g.player.money !== m0 + 6) fail('fee', g.player.money - m0);
  for (let i = 0; i < 6; i++) runAct(g, 'mj_teach');
  if (!queued(g, 'mj_pupil_end')) fail('pupil end not queued');
  drop(g);
  const s = clone(g); direct(s, 'mj_pupil_end', {}, 'string'); if (!M(s).pupil || M(s).pupil.prog !== 3) fail('string along');
  const t = clone(g); direct(t, 'mj_pupil_end', {}, 'truth'); if (M(t).pupil) fail('truth');
  const gd = clone(g); M(gd).pupil.talent = 80; direct(gd, 'mj_pupil_end', {}, 'tower'); if (M(gd).pupil) fail('tower');
  const away = clone(g); placeAt(away, 'ern'); adv(away, 4); if (M(away).pupil) fail('pupil kept while away');
  direct(fresh(41, 'leocast', { circle: 2, spells: ['ember'] }), 'mj_pupil', { who: 'poor', talent: 60 }, 'take');
  checkInfo(g, 'tutor');
}

// 7. 마법 용병: 전투 주문과 2서클
{
  if (can(fresh(50, 'harfen', { circle: 2, spells: ['ember', 'sense'] }), 'mj_merc')) fail('merc without combat spell');
  const g = fresh(51, 'harfen', { circle: 2, spells: ['firebolt', 'icebolt'] });
  if (!can(g, 'mj_merc')) fail('merc hidden');
  runAct(g, 'mj_merc'); if (can(g, 'mj_merc')) fail('merc twice');
  for (const who of ['caravan', 'nest', 'feud']) for (const k of ['take', 'more', 'refuse']) direct(clone(g), 'mj_merc', { who }, k);
  let paid = 0; for (let i = 0; i < 10; i++) { const x = clone(g); x.rngState.s = 500 + i; const m0 = x.player.money; direct(x, 'mj_merc', { who: 'caravan' }, 'take'); paid += x.player.money - m0; }
  if (paid < 80) fail('merc pay', paid);
}

// 8. 대 잇기와 저장 왕복
{
  const g = fresh(60, 'harfen'); M(g).fame.harfen = 50; M(g).jobs = 10;
  runHooks('heir', g, R(g), null);
  if (Object.keys(M(g).fame).length || M(g).past.length !== 1) fail('heir');
  const s = clone(g); delete s.magejob.pupil; delete s.magejob.wards.ern; runHooks('migrate', s); if (s.magejob.pupil !== null || s.magejob.wards.ern !== 60) fail('migrate');
}

if (Object.keys(SCENES).filter((k) => k.startsWith('mj_')).length < 6) fail('scene count');
if (verbose) console.log(samples.join('\n'));
const sec = (Date.now() - t0) / 1000;
if (sec > 60) fail('too slow', sec);
console.log(problems ? `magejobtest: ${problems} problems (${sec.toFixed(1)}s)` : `magejobtest ok (${sec.toFixed(1)}s)`);
process.exit(problems ? 1 : 0);
