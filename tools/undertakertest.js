import '../src/content.js';
// 장의사와 묘지기(src/undertaker/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/undertakertest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES, sceneQueued } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { makeRng } from '../src/rng.js';
import { takeJob } from '../src/jobs.js';
import { healthState } from '../src/health/index.js';
import { regionOf } from '../src/nature/state.js';
import { elderState } from '../src/elder/index.js';
import { me } from '../src/game.js';
import { undertakerInfo as info0, undertakerLine, undertakerState as U } from '../src/undertaker/index.js';
import { YARDS, mi, isUT, isGD, plotPrice, SHOP_COST } from '../src/undertaker/core.js';

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


function fresh(seed, pl, { job = null, sk = 0, age = null, money = 200 } = {}) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = money;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  L(g).job = null; g.undertaker = undefined; U(g).skill = sk;
  if (healthState(g)) { healthState(g).outbreaks = []; healthState(g).sick = []; }
  if (age != null) me(g).ageMonths = age * 12;
  if (job) takeJob(g, job);
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
  const l = undertakerLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 120) samples.push(`(${id}) ${out}`); return out; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); checkInfo(g, 'adv'); } };
const drop = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const queued = (g, k) => sceneQueued(g, k);
const plague = (g, pl, sev = 0.8) => { healthState(g).outbreaks.push({ kind: 'plague', region: regionOf(pl), sev, left: 12, start: { y: g.date.year, m: g.date.month } }); return g; };
const ALL = ['ut_wash', 'ut_shop', 'ut_coffin', 'ut_funeral', 'ut_watch', 'ut_plot', 'ut_plotsell', 'ut_plague'];

// 1. 아무나 죽은 이를 맡지 않는다: 일자리나 형편이 있어야
{
  const g = fresh(1, 'harfen'); checkInfo(g, 'start');
  for (const id of ALL) if (can(g, id)) fail('hidden action shows', id);
  const ut = fresh(2, 'harfen', { job: 'undertaker' });
  if (!isUT(ut)) fail('undertaker job');
  if (!can(fresh(3, 'ern', { job: 'gravedigger' }), 'ut_watch')) fail('gravedigger watch hidden');
  if (!can(fresh(4, 'harfen', { age: 45 }), 'ut_plot')) fail('old cannot buy plot');
  if (can(fresh(5, 'ern', { job: 'gravedigger' }), 'ut_funeral')) fail('gravedigger funeral');
  // 일하기: 품삯과 솜씨
  const w = clone(ut); const m0 = w.player.money; runAct(w, 'work');
  if (!(w.player.money > m0) || !(U(w).skill > 0) || U(w).bodies !== 1) fail('ut work', w.player.money - m0, U(w).skill);
  const d = fresh(6, 'ern', { job: 'gravedigger' }); runAct(d, 'work'); if (U(d).dug !== 1) fail('gd work');
  checkInfo(ut, 'ut');
}

// 2. 염하기: 일이 밀린 달에만. 반지 장면
{
  const g = fresh(10, 'harfen', { job: 'undertaker' }); U(g).yards.harfen.wait = 1;
  if (can(g, 'ut_wash')) fail('wash when quiet');
  U(g).yards.harfen.wait = 5;
  if (!can(g, 'ut_wash')) fail('wash hidden when busy');
  const m0 = g.player.money; runAct(g, 'ut_wash'); if (U(g).yards.harfen.wait !== 4 || g.player.money <= m0) fail('wash');
  for (const k of ['return', 'church', 'keep']) direct(clone(g), 'ut_body', {}, k);
}

// 3. 장례: 신분마다 다른 선택과 값
{
  const g = fresh(20, 'leocast', { job: 'undertaker', sk: 30 });
  if (!can(g, 'ut_funeral')) fail('funeral hidden');
  runAct(clone(g), 'ut_funeral');
  const keys = { pauper: ['free', 'pit', 'quick'], farmer: ['proper', 'discount', 'upsell'], craft: ['banner', 'proper', 'upsell'], merchant: ['mourners', 'honest', 'skim'], noble: ['perfect', 'plain', 'rush'], stranger: ['letter', 'name', 'pocket'], condemned: ['inside', 'outside', 'sell'] };
  for (const [rank, ks] of Object.entries(keys)) for (const k of ks) { const x = clone(g); const r = direct(x, 'ut_funeral', { rank }, k); if (r.missing) fail('funeral key missing', rank, k); if (U(x).funerals !== 1) fail('funeral count', rank, k); }
  const a = clone(g), b = clone(g); direct(a, 'ut_funeral', { rank: 'merchant' }, 'honest'); direct(b, 'ut_funeral', { rank: 'merchant' }, 'skim');
  if (!(b.player.money > a.player.money)) fail('skim pays more');
  const n = clone(g), p = clone(g); direct(n, 'ut_funeral', { rank: 'noble' }, 'plain'); direct(p, 'ut_funeral', { rank: 'pauper' }, 'pit');
  if (!(n.player.money > p.player.money)) fail('noble pays more than pauper');
  const poor = clone(g); poor.player.money = 1; if (!direct(poor, 'ut_funeral', { rank: 'pauper' }, 'free').missing) fail('free coffin without money');
  runAct(g, 'ut_funeral'); if (can(g, 'ut_funeral')) fail('funeral twice a month');
}

// 4. 장의사 집과 관: 내가 없어도 장례가 들어온다
{
  const g = fresh(30, 'harfen', { job: 'undertaker', sk: 30 });
  if (!can(g, 'ut_shop')) fail('shop hidden');
  if (can(fresh(31, 'harfen', { job: 'undertaker', sk: 10 }), 'ut_shop')) fail('shop for novice');
  runAct(g, 'ut_shop'); if (!U(g).shop || g.player.money !== 200 - SHOP_COST) fail('shop');
  if (can(g, 'ut_shop') || !can(g, 'ut_coffin')) fail('shop actions');
  runAct(g, 'ut_coffin'); if (U(g).shop.coffins !== 4) fail('coffin');
  const away = clone(g); placeAt(away, 'ern'); L(away).job = null; const m0 = away.player.money; adv(away, 6);
  if (!(away.player.money > m0)) fail('shop no income away', away.player.money - m0);
  checkInfo(g, 'shop');
}

// 5. 밤의 묘지와 도굴꾼, 큰 장례 뒤엔 더 꼬인다
{
  let seen = 0;
  for (let i = 0; i < 24; i++) { const g = fresh(40 + i * 7, 'verden', { job: 'gravedigger' }); U(g).yards.verden.rich = 6; runAct(g, 'ut_watch'); if (queued(g, 'ut_robbers')) seen++; if (can(g, 'ut_watch')) fail('watch twice'); }
  if (seen < 8) fail('robbers rare after rich funeral', seen);
  const g = fresh(60, 'verden', { job: 'gravedigger' });
  const keys = { gang: ['shout', 'fight', 'bribe'], student: ['report', 'let', 'bribe'], widow: ['help', 'stop', 'report'] };
  for (const [who, ks] of Object.entries(keys)) for (const k of ks) direct(clone(g), 'ut_robbers', { who }, k);
  const br = clone(g); direct(br, 'ut_robbers', { who: 'gang' }, 'bribe'); if (U(br).yards.verden.robbed !== 1 || !(U(br).yards.verden.rumor > 0)) fail('bribe effects');
  // 지키는 사람이 없으면 털리고, 집안 무덤이 있으면 흔적이 남는다
  const n = fresh(61, 'ern'); const E = elderState(n);
  E.graves.push({ id: 999, pid: -1, name: '아르노', sex: 'm', place: 'leocast', kind: 'plain', tended: 70, desecrated: false, byPlayer: false, gen: 0 });
  U(n).yards.leocast.rich = 30;
  adv(n, 24);
  if (!(U(n).yards.leocast.robbed > 0)) fail('npc robbing never');
  if (!E.graves.find((x) => x.id === 999).desecrated && U(n).yards.leocast.robbed > 3) fail('family grave never desecrated', U(n).yards.leocast.robbed);
}

// 6. 무덤 자리 사기와 팔기
{
  const g = fresh(70, 'leocast', { age: 50, money: 500 });
  runAct(g, 'ut_plot');
  const r = direct(clone(g), 'ut_plot', {}, 'crypt'); if (r.missing) fail('crypt missing');
  const h = clone(g); direct(h, 'ut_plot', {}, 'hill'); if (U(h).plot?.kind !== 'hill' || h.player.money !== 500 - Math.round(plotPrice('leocast') * 1.5)) fail('hill plot');
  if (can(h, 'ut_plot')) fail('plot twice');
  if (!direct(clone(fresh(71, 'ern', { age: 50 })), 'ut_plot', {}, 'crypt').missing) fail('crypt in village');
  direct(clone(g), 'ut_plot', {}, 'no');
  checkInfo(h, 'plot');
  const s = fresh(72, 'harfen', { job: 'gravedigger', sk: 25 });
  if (!can(s, 'ut_plotsell')) fail('plotsell hidden');
  runAct(s, 'ut_plotsell'); if (can(s, 'ut_plotsell')) fail('plotsell twice');
  const a = clone(s), b = clone(s); direct(a, 'ut_plotsale', {}, 'widow'); direct(b, 'ut_plotsale', {}, 'old');
  if (!(b.player.money > a.player.money) || !(U(b).yards.harfen.rumor > U(a).yards.harfen.rumor)) fail('old plot resale');
  direct(clone(s), 'ut_plotsale', {}, 'rich');
}

// 7. 역병: 시신이 넘치고, 누구나 수레를 끌 수 있다. 공동 구덩이
{
  const g = plague(fresh(80, 'harfen'), 'harfen');
  if (!can(g, 'ut_plague')) fail('plague cart hidden');
  if (can(fresh(81, 'harfen'), 'ut_plague')) fail('cart without plague');
  let sick = 0, got = 0;
  for (let i = 0; i < 20; i++) { const x = clone(g); x.rngState.s = 300 + i; const m0 = x.player.money; runAct(x, 'ut_plague'); got += x.player.money - m0; if (healthState(x).sick.some((s) => s.who === 'me')) sick++; }
  if (got < 100) fail('plague pay', got);
  if (sick < 1 || sick > 10) fail('plague sick', sick);
  const c0 = g.chronicle.length; adv(g, 2);
  if (!U(g).yards.harfen.pit) fail('no plague pit');
  if (!(U(g).yards.harfen.wait >= 5)) fail('plague bodies', U(g).yards.harfen.wait);
  if (!g.chronicle.slice(c0).some((c) => /공동 구덩이/.test(c.text))) fail('pit chronicle');
  checkInfo(g, 'plague');
}

// 8. 소문: 일하는 사람이 마주하고, 망령이 있는 묘지면 일이 아니라고 안다
{
  const g = fresh(90, 'harfen', { job: 'gravedigger' }); U(g).yards.harfen.rumor = 80;
  let asked = 0; for (let i = 0; i < 6 && !asked; i++) { adv(g, 1); if (queued(g, 'ut_rumor')) asked = 1; }
  if (!asked) fail('rumor scene never');
  drop(g);
  const l = clone(g); U(l).yards.harfen.rumor = 80; direct(l, 'ut_rumor', {}, 'look'); if (!(U(l).yards.harfen.rumor < 80)) fail('look calms');
  const h = clone(g); h.haunt.spots[777] = { place: 'harfen', state: 'restless' }; const r = direct(h, 'ut_rumor', {}, 'look'); if (!/영매/.test(r.out ?? '')) fail('haunt link', r.out);
  direct(clone(g), 'ut_rumor', {}, 'priest'); direct(clone(g), 'ut_rumor', {}, 'ignore');
}

// 9. 플레이어 없이도: 육십 년 동안 묘지가 차고 새 묘지를 연다. 대 잇기, 저장 왕복
{
  const g = fresh(100, 'ern'); const c0 = g.chronicle.length;
  adv(g, 12 * 60);
  const lines = g.chronicle.slice(c0).filter((c) => /묘지|무덤|구덩이/.test(c.text));
  if (!lines.some((c) => /새 묘지/.test(c.text))) fail('no new cemetery in 60y');
  if (lines.length > 120) fail('too many yard lines', lines.length);
  for (const y of Object.values(U(g).yards)) if (!(y.full >= 0 && y.full <= 100) || !(y.wait >= 0)) fail('yard state', y);
  if (verbose) console.log('60y', lines.length, lines.slice(0, 5).map((c) => c.text));
  const h = fresh(101, 'harfen', { job: 'undertaker', sk: 50 }); U(h).shop = { place: 'harfen', since: mi(h), coffins: 2, hands: 0 };
  runHooks('heir', h, R(h), null);
  if (U(h).skill !== 0 || !U(h).shop || U(h).past.length !== 1) fail('heir');
  const s = clone(h); delete s.undertaker.plot; delete s.undertaker.yards.leocast; runHooks('migrate', s); if (s.undertaker.plot !== null || !s.undertaker.yards.leocast) fail('migrate');
}

if (Object.keys(SCENES).filter((k) => k.startsWith('ut_')).length < 6) fail('scene count');
if (verbose) console.log(samples.join('\n'));
const sec = (Date.now() - t0) / 1000;
if (sec > 60) fail('too slow', sec);
console.log(problems ? `undertakertest: ${problems} problems (${sec.toFixed(1)}s)` : `undertakertest ok (${sec.toFixed(1)}s)`);
process.exit(problems ? 1 : 0);
