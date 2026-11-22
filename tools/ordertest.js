import '../src/content.js';
// 기사단(src/order/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/ordertest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { faithState } from '../src/faith/index.js';
import { orderInfo, orderLine, orderState as OS, startHeresy } from '../src/order/index.js';
import { level, inOrder, brothers, orderOf, facOf } from '../src/order/core.js';
import { orderMonth } from '../src/order/life.js';
import { orderYear, orderWorldMonth } from '../src/order/world.js';
import { makeRng } from '../src/rng.js';

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
      const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 8101 + k * 977 });
      while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
      if (!g.over) { BASE = JSON.stringify(g); break; }
    }
  }
  const g = JSON.parse(BASE);
  g.rngState.s = seed | 0;
  return g;
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }
function fresh(seed, pl) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = 100;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  g.player.skills.sword = 30;
  const F = faithState(g); F.god = 'solar'; F.devotion = 50; F.suspicion = 0;
  L(g).job = null;
  return g;
}
const R = (g) => rngOf(g);
const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
function direct(g, kind, data, key) {
  const def = SCENES[kind];
  const s = { kind, at: L(g).place, t: 0, ...data };
  if (def.need && !def.need(g, s)) return { skipped: true };
  const t = def.text(g, s), ch = def.choices(g, s), ti = def.title(g, s);
  if (bad(t) || bad(ti) || josa(t) || ch.some((c) => bad(c.label) || josa(c.label))) fail('scene text', kind, ti, t, ch.map((c) => c.label));
  if (ch.length > 8) fail('too many choices', kind);
  if (!ch.some((c) => c.key === key)) return { missing: true, keys: ch.map((c) => c.key) };
  const out = def.resolve(g, R(g), s, key);
  if (bad(out) || josa(out)) fail('scene out', kind, key, out);
  if (g.player.money < 0) fail('negative money', kind, key);
  if (samples.length < 80) samples.push(`[${ti}] ${key} → ${out}`);
  return { out, s };
}
const clone = (g) => JSON.parse(JSON.stringify(g));
const checkInfo = (g, where) => {
  const s = JSON.stringify(orderInfo(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 200));
  const l = orderLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
};

// 1. 행동은 뜻 있는 곳에서만
{
  const g = fresh(1, 'ern');
  if (can(g, 'order_join')) fail('join visible in ern');
  for (const id of ['order_duty', 'order_lead', 'order_retire', 'order_leave', 'order_refound']) if (can(g, id)) fail('visible outside order', id);
  placeAt(g, 'solaris');
  if (!can(g, 'order_join')) fail('join hidden at solaris');
  if (orderLine(g) === null) fail('no line at seat');
  const kid = fresh(2, 'graubel'); me(kid).ageMonths = 12 * 12;
  if (can(kid, 'order_join')) fail('join for child');
}

// 2. 들어가기: 잿빛 성벽(누구나), 성흔(믿음이 있어야, 가진 것을 바침)
let squire;
{
  const g = fresh(3, 'graubel');
  const r = direct(g, 'order_join', { id: 'march' }, 'squire');
  if (r.skipped || r.missing) fail('join march', JSON.stringify(r));
  if (!inOrder(g) || level(g) !== 0 || brothers(g).length !== 3 || !facOf(g, 'march')?.member) fail('march squire state', level(g), brothers(g).length);
  squire = g;
  const h = fresh(4, 'solaris'); faithState(h).devotion = 5;
  const r2 = direct(h, 'order_join', { id: 'stigma' }, 'squire');
  if (!r2.missing) fail('stigma join without faith');
  faithState(h).devotion = 50; h.player.money = 300;
  direct(h, 'order_join', { id: 'stigma' }, 'squire');
  if (!inOrder(h) || h.player.money > 10) fail('stigma poverty', h.player.money);
  const t = fresh(5, 'graubel'); me(t).ageMonths = 22 * 12; t.player.skills.sword = 80; t.player.stats.str = 80;
  direct(t, 'order_join', { id: 'march' }, 'test');
  if (!inOrder(t)) fail('join by test');
  checkInfo(h, 'stigma squire');
}

// 3. 기사단 일 → 서임 → 기사대장
{
  const g = clone(squire);
  for (let i = 0; i < 4; i++) month(g, ['order_duty']);
  if ((facOf(g, 'march')?.merit ?? 0) < 8) fail('duty merit', facOf(g, 'march')?.merit);
  if (!inOrder(g)) fail('left order during duty');
  me(g).ageMonths = 19 * 12; g.player.skills.sword = 40; facOf(g, 'march').merit = 70;
  orderMonth(g, makeRng({ s: 9 }));
  const r = direct(g, 'order_dub', {}, 'under');
  if (r.skipped || level(g) !== 1 || g.player.title !== '경') fail('dub', JSON.stringify(r), level(g));
  me(g).ageMonths = 25 * 12; g.player.skills.sword = 55; facOf(g, 'march').merit = 230;
  orderMonth(g, makeRng({ s: 10 }));
  if (level(g) !== 2) fail('captain', level(g));
  checkInfo(g, 'captain');
  // 임무 장면 (피난민)
  for (const k of ['open', 'shut', 'some']) direct(clone(g), 'order_mission', { id: 'march', kind: 'refugee' }, k);
  const s = clone(squire); OS(s).me.id = 'march';
  for (const k of ['stay', 'carry', 'leave']) direct(clone(g), 'order_mission', { id: 'march', kind: 'pilgrim_road' }, k);
  // 형제 사이의 일: 모든 갈래, 모든 선택
  for (const ev of ['wound', 'debt', 'doubt', 'letter', 'duel']) {
    for (const money of [100, 5]) {
      const base = clone(g); base.player.money = money;
      const bid = brothers(base)[0].id;
      const keys = SCENES.order_brother.choices(base, { ev, bid }).map((c) => c.key);
      for (const k of keys) direct(clone(base), 'order_brother', { ev, bid }, k);
    }
  }
  // 단장 자리
  for (const k of ['run', 'back', 'no']) {
    const h = clone(g); facOf(h, 'march').merit = 900; L(h).renown = 80;
    direct(h, 'order_election', { id: 'march', old: '하겐 철수염', why: '세상을 떠났다', rival: '오틸리에 그라우' }, k);
    if (k !== 'run' && OS(h).me.master) fail('master without running');
    if (k === 'run' && OS(h).me.master) {
      if (!can(h, 'order_lead')) fail('lead hidden');
      for (const kk of ['wall', 'sortie', 'ask']) direct(clone(h), 'order_lead', { id: 'march' }, kk);
      checkInfo(h, 'master');
    }
  }
  // 은퇴
  const old = clone(g); me(old).ageMonths = 56 * 12;
  if (!can(old, 'order_retire')) fail('retire hidden');
  for (const k of ['teach', 'home', 'no']) {
    const h = clone(old); direct(h, 'order_retire', { id: 'march' }, k);
    if (k !== 'no' && (inOrder(h) || !OS(h).retired)) fail('retire state', k);
    if (k !== 'no') { checkInfo(h, 'retired'); if (!orderLine(h)) fail('retired line'); if (can(h, 'order_join')) fail('rejoin after retire'); }
  }
}

// 4. 성흔기사단의 서약: 혼인·재물·추문
{
  const g = fresh(6, 'solaris'); direct(g, 'order_join', { id: 'stigma' }, 'squire');
  for (const kind of ['marriage', 'wealth', 'shame']) {
    const keys = SCENES.order_vow.choices(g, { id: 'stigma', kind }).map((c) => c.key);
    for (const k of keys) {
      const h = clone(g); h.player.money = 400;
      direct(h, 'order_vow', { id: 'stigma', kind }, k);
      if (k === 'leave' && inOrder(h)) fail('vow leave', kind);
      checkInfo(h, `vow ${kind} ${k}`);
    }
  }
  for (const kind of ['pilgrim', 'grave', 'cult', 'pilgrim_road']) {
    for (const k of ['stay', 'carry', 'leave']) direct(clone(g), 'order_mission', { id: 'stigma', kind: 'pilgrim_road' }, k);
  }
  // 5. 이단 몰이: 세 마디, 마디마다 고르기
  for (const k of ['stand', 'plead', 'testify', 'flee']) {
    const h = clone(g); facOf(h, 'stigma').rank = 1; startHeresy(h, R(h), 'stigma');
    direct(h, 'order_heresy', { id: 'stigma', stage: 1 }, k);
    if (k === 'flee' && inOrder(h)) fail('flee heresy');
    checkInfo(h, `heresy1 ${k}`);
  }
  for (const k of ['taken', 'escape', 'recant']) {
    const h = clone(g); startHeresy(h, R(h), 'stigma'); orderOf(h, 'stigma').heresy.stage = 2;
    direct(h, 'order_heresy', { id: 'stigma', stage: 2 }, k);
    checkInfo(h, `heresy2 ${k}`);
  }
  for (const k of ['defy', 'confess']) {
    const h = clone(g); orderOf(h, 'stigma').fallen = { y: h.date.year, why: '이단 판결' };
    direct(h, 'order_fall', { id: 'stigma', master: '그레고어 폰 아이헨' }, k);
    if (inOrder(h)) fail('still in fallen order');
    if (!orderLine(h)) fail('fallen line');
    // 20년 뒤 다시 세우기
    h.date.year += 25; placeAt(h, 'solaris'); h.player.money = 500; me(h).ageMonths = 45 * 12;
    if (!can(h, 'order_refound')) fail('refound hidden');
    else { const out = act('order_refound').run(h, R(h)); if (bad(out) || josa(out) || !OS(h).me?.master || orderOf(h, 'stigma').fallen) fail('refound', out); }
  }
  // 판결이 실제로 나는지: 진행을 끝까지
  let fell = 0, cleared = 0;
  for (let i = 0; i < 24; i++) {
    const h = clone(g); orderOf(h, 'stigma').wealth = 90;
    startHeresy(h, makeRng({ s: i }), 'stigma');
    for (let m = 0; m < 20 && orderOf(h, 'stigma').heresy; m++) { h.date.month = h.date.month % 12 + 1; if (h.date.month === 1) h.date.year++; orderWorldMonth(h, makeRng({ s: i * 31 + m })); }
    if (orderOf(h, 'stigma').fallen) fell++; else if (!orderOf(h, 'stigma').heresy) cleared++;
  }
  if (!fell || !cleared) fail('heresy outcomes', fell, cleared);
}

// 6. 왕국 기사단: 이미 있는 소속을 따라간다
{
  const g = fresh(7, 'leocast');
  L(g).fac.knights = { member: true, order: 'leocast', rank: 2, merit: 220 };
  L(g).job = { id: 'knight', place: 'leocast', months: 3, merit: 0 };
  orderMonth(g, makeRng({ s: 3 }));
  if (OS(g).me?.id !== 'royal' || level(g) !== 1 || brothers(g).length !== 3) fail('royal follow', OS(g).me?.id, level(g));
  checkInfo(g, 'royal');
  L(g).job = null; L(g).fac.knights.member = false;
  orderMonth(g, makeRng({ s: 4 }));
  if (inOrder(g)) fail('royal not ended');
  if (!OS(g).past.length) fail('royal past');
}

// 7. 플레이어 없이 백 년: 단장이 바뀌고, 이단 몰이가 오고 가며, 글이 깨지지 않는다
{
  let changed = 0, fallen = 0;
  for (let k = 0; k < 10; k++) {
    const g = newGame({ name: '노아', sex: 'f', familyId: 'farmer', mode: 'free', seed: 300 + k });
    const first = ORDER_NAMES(g);
    for (let y = 0; y < 100; y++) {
      for (let m = 1; m <= 12; m++) { g.date.month = m; const r = makeRng({ s: k * 10000 + y * 13 + m }); if (m === 1) orderYear(g, r); orderWorldMonth(g, r); }
      g.date.year++;
    }
    if (ORDER_NAMES(g) !== first) changed++;
    fallen += ['stigma', 'march'].filter((id) => orderOf(g, id).fallen).length;
    checkInfo(g, 'century');
  }
  if (!changed) fail('masters never change');
  if (fallen > 12) fail('orders fall too often', fallen);
  if (verbose) console.log('100년 동안 무너진 기사단', fallen, '/ 20');
}
function ORDER_NAMES(g) { return ['stigma', 'march', 'royal'].map((id) => orderOf(g, id).master?.name).join(','); }

// 8. 대를 이으면 기록이 남고, 저장을 오가도 그대로
{
  const g = clone(squire);
  runHooks('heir', g, R(g), { name: '하넬' });
  if (inOrder(g) || !OS(g).past.some((p) => p.name === '하넬')) fail('heir past');
  const h = JSON.parse(JSON.stringify(squire));
  delete h.order; runHooks('migrate', h);
  if (!h.order?.orders?.stigma) fail('migrate');
}

// 9. 실제로 몇 해 살아 보기: 기사단 일과 장면이 섞여 돌아도 깨지지 않는다
{
  const g = clone(squire); g.player.skills.sword = 38;
  const kinds = {};
  for (let m = 0; m < 48 && !g.over; m++) {
    for (const q of L(g).queue) kinds[q.kind] = (kinds[q.kind] ?? 0) + 1;
    month(g, ['order_duty', 'order_lead']);
    checkInfo(g, 'play');
  }
  if (inOrder(g) && (facOf(g, 'march')?.merit ?? 0) < 40) fail('merit too slow', facOf(g, 'march')?.merit);
  if (verbose) console.log('장면', JSON.stringify(kinds), '계급', level(g), '공적', facOf(g, 'march')?.merit);
}

if (verbose) console.log(samples.join('\n'));
const sec = (Date.now() - t0) / 1000;
if (sec > 60) fail('too slow', sec);
if (problems) { console.log(`ordertest: ${problems} problems`); process.exit(1); }
console.log(`ordertest OK (${sec.toFixed(1)}s)`);
