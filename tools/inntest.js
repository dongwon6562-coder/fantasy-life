import '../src/content.js';
// 주점과 여관 꾸리기(src/inn/)를 브라우저 없이 돌려 보는 점검.
// 1) 가게 열기(주점·여관), 두 번은 못 엶. 2) 매달 셈: 벌이가 돈에 들어가고 세금이 쌓임, 내가 없고 지배인도 없으면 반, 내 여관에 묵으면 방값이 안 듦.
// 3) 가게 일·꾸리기(값·일꾼·방·여관으로 늘리기·뒷방·밀수·팔기·옛 가게 되사기). 4) 가게에서 생기는 일의 선택지마다.
// 5) 대 잇기, 옛 저장, 저절로 살아 보기.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { E } from '../src/estate/core.js';
import { I, myInn, innStatus, innLine, costOf, roomCost, ROLE_IDS, REGULAR_IDS, innWorth, reckon } from '../src/inn/index.js';

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
    if (/^inn_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^inn_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = innStatus(g);
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
import { crimeState } from '../src/crime.js';

const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
const clearQ = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
function owner(seed, pl = 'harfen', kind = 'tavern') {
  const g = adult(seed); placeAt(g, pl); heal(g); g.player.money = 5000;
  if (g.world) g.world.famine = null;
  const r = direct(g, 'inn_open', {}, kind);
  if (r.skipped || r.missing || !myInn(g)) fail('open', pl, kind, JSON.stringify(r));
  g.player.money = 500;
  return g;
}

/* 1) 열기 */
{
  const g = adult(91000); placeAt(g, 'harfen'); g.player.money = 100;
  if (can(g, 'inn_open')) fail('open without money');
  g.player.money = 2000;
  if (!can(g, 'inn_open')) fail('cannot open');
  const before = g.player.money;
  direct(g, 'inn_open', {}, 'inn');
  if (!myInn(g) || myInn(g).kind !== 'inn' || myInn(g).rooms !== 1 || before - g.player.money !== costOf('harfen', 'inn')) fail('open inn', JSON.stringify(myInn(g)));
  if (can(g, 'inn_open')) fail('open twice');
  const r = adult(91010); placeAt(r, 'estella'); r.player.money = 5000; if (can(r, 'inn_open')) fail('open in ruins');
  console.log(`가게 값: 에른 주점 ${costOf('ern', 'tavern')}, 하르펜 여관 ${costOf('harfen', 'inn')}, 왕도 여관 ${costOf('leocast', 'inn')}`);
}

/* 2) 매달 셈 */
{
  const g = owner(91100, 'leocast', 'inn');
  L(g).home = 'rent';
  const m0 = g.player.money; clearQ(g); tick(g);
  const inn = myInn(g);
  if (g.player.money - m0 !== inn.last.net) fail('net to money', g.player.money - m0, inn.last.net);
  if (inn.taxOwed <= 0) fail('tax not accrued');
  const here = reckon(g);
  placeAt(g, 'harfen');
  const away = reckon(g);
  if (Math.abs(away.rev - Math.round((here.rev - here.back) * 0.5 / 1.0)) > here.rev * 0.2 + 2) fail('away without manager', here.rev, away.rev);
  // 내 여관에 묵으면 방값이 들지 않는다
  placeAt(g, 'leocast'); L(g).home = 'inn';
  const m1 = g.player.money; clearQ(g); tick(g);
  if (g.player.money - m1 !== myInn(g).last.net + PLACES.leocast.inn) fail('free bed', g.player.money - m1, myInn(g).last.net);
  // 일 년 장사
  let sum = 0; for (let i = 0; i < 12; i++) { placeAt(g, 'leocast'); L(g).home = 'rent'; clearQ(g); tick(g); sum += myInn(g).last.net; }
  console.log(`왕도 여관 한 해 벌이(혼자): 은화 ${sum}닢, 쌓인 세금 ${myInn(g).taxOwed}`);
  const e = owner(91150, 'ern', 'tavern'); let es = 0; for (let i = 0; i < 12; i++) { placeAt(e, 'ern'); L(e).home = 'rent'; clearQ(e); tick(e); es += myInn(e).last.net; }
  console.log(`에른 주점 한 해 벌이: 은화 ${es}닢`);
  if (sum <= 0 || es <= 0) fail('inn never profits', sum, es);
}

/* 3) 일·꾸리기 */
{
  const g = owner(91200, 'harfen', 'tavern');
  for (const k of ['bar', 'kitchen', 'books', 'clean']) { const r = direct(g, 'inn_work', {}, k); if (r.skipped || r.missing) fail('work', k); }
  if (myInn(g).worked !== g.date.year * 12 + g.date.month) fail('worked mark');
  for (const k of ['cheap', 'dear', 'fair']) { direct(g, 'inn_price', {}, k); if (myInn(g).price !== k) fail('price', k); }
  for (const role of ROLE_IDS) direct(g, 'inn_hire', {}, role);
  if (myInn(g).workers.length !== 4) fail('hire', myInn(g).workers.length);
  if (!direct(g, 'inn_hire', {}, 'cook').skipped) fail('hire past 4');
  const w = myInn(g).workers[0]; direct(g, 'inn_fire', {}, `w:${w.id}`);
  if (myInn(g).workers.length !== 3) fail('fire');
  g.player.money = 5000;
  direct(g, 'inn_manage', {}, 'upgrade');
  if (myInn(g).kind !== 'inn' || myInn(g).rooms !== 1) fail('upgrade');
  direct(g, 'inn_manage', {}, 'room'); direct(g, 'inn_manage', {}, 'room');
  if (myInn(g).rooms !== 3 || !direct(g, 'inn_manage', {}, 'room').missing) fail('rooms', myInn(g).rooms);
  direct(g, 'inn_manage', {}, 'gamble'); direct(g, 'inn_manage', {}, 'smuggle');
  if (!myInn(g).backroom.gamble || !myInn(g).backroom.smuggle) fail('backroom');
  const r1 = reckon(g); if (r1.back <= 0) fail('backroom income');
  const ern = owner(91210, 'ern'); if (!direct(ern, 'inn_manage', {}, 'smuggle').missing) fail('smuggle in ern');
  // 팔고 되사기
  const worth = innWorth(myInn(g)), m = g.player.money;
  direct(g, 'inn_manage', {}, 'sell');
  if (myInn(g) || g.player.money !== m + worth || !I(g).lost.length) fail('sell');
  g.player.money = 5000; direct(g, 'inn_open', {}, 'old');
  if (!myInn(g) || myInn(g).gens !== 2 || myInn(g).kind !== 'inn') fail('buyback', JSON.stringify(myInn(g)));
  // 다른 고장에서는 일하거나 꾸리지 못한다
  placeAt(g, 'verden'); if (can(g, 'inn_work') || can(g, 'inn_manage')) fail('manage away');
}

/* 4) 가게에서 생기는 일 */
{
  const KEYS = {
    arrears: ['sell', 'pay', 'hold'], tax: ['pay', 'part', 'cook', 'bribe'], brawl: ['me', 'bouncer', 'guards', 'let'], rumor: ['listen', 'no'], guest: ['best', 'plain', 'gouge'],
    newreg: ['yes', 'no'], worker: ['fire', 'forgive', 'watch'], poach: ['keep', 'let'], guard: ['bribe', 'show', 'hide'], gang: ['pay', 'refuse', 'report'],
    gamble: ['out', 'refund', 'ignore'], smuggle: ['yes', 'no'], rival_open: ['cheap', 'slander', 'greet', 'scare'], rival: ['cheap', 'buy', 'hold'],
  };
  let n = 0;
  const setup = (seed) => {
    const g = owner(seed, 'harfen', 'inn'); const inn = myInn(g);
    for (const role of ROLE_IDS) direct(g, 'inn_hire', {}, role);
    inn.workers[0].honest = false;
    inn.arrears = 50; inn.taxOwed = 40; inn.dodged = 0;
    inn.backroom = { gamble: true, smuggle: true };
    inn.rival = null; crimeState(g).contacts = 3;
    g.player.money = 500;
    return g;
  };
  for (const [ev, keys] of Object.entries(KEYS)) for (const k of keys) {
    const g = setup(92000 + n++), inn = myInn(g);
    if (ev === 'rival') inn.rival = { name: '푸른 돼지', power: 40 };
    if (ev === 'gang' && k === 'pay') inn.gang = null;
    if (k === 'part') g.player.money = 10;
    const data = { ev, reg: ev === 'newreg' ? 'bard' : null };
    const r = direct(g, 'inn_event', data, k);
    if (r.skipped || r.missing) { fail('event', ev, k, JSON.stringify(r)); continue; }
    if (ev === 'arrears' && k === 'sell' && myInn(g)) fail('arrears sell');
    if (ev === 'arrears' && k === 'pay' && myInn(g).arrears) fail('arrears pay');
    if (ev === 'tax' && k === 'cook' && !(myInn(g).dodged > 0)) fail('tax dodge');
    if (ev === 'gang' && k === 'pay' && (myInn(g).gang?.state !== 'paid' || reckon(g).cut <= 0)) fail('gang cut');
    if (ev === 'rival_open' && !myInn(g).rival) fail('rival open');
    if (ev === 'rival' && k === 'buy' && myInn(g).rival) fail('rival buy');
    if (ev === 'newreg' && k === 'yes' && myInn(g).regulars.length !== 1) fail('new regular');
  }
  // 단골마다
  for (const id of REGULAR_IDS) for (const k of ['tab', 'collect', 'listen', 'no', 'buy', 'yes']) {
    const g = setup(92500 + n++); myInn(g).regulars.push({ id, mood: 50, tab: 20, since: 0 });
    const r = direct(g, 'inn_event', { ev: 'regular', reg: id }, k);
    if (r.skipped) fail('regular skipped', id);
  }
  // 경비대: 뒷방·밀수·꾸민 장부가 다 걸린다
  const c = setup(92900); myInn(c).dodged = 40; c.player.money = 0;
  direct(c, 'inn_event', { ev: 'guard' }, 'show');
  const ci = myInn(c);
  if (ci.backroom.gamble || ci.backroom.smuggle || ci.dodged || !crimeState(c).record.some((x) => x.c === 'smuggling') || c.player.money < 0) fail('guard caught', JSON.stringify(ci.backroom), ci.dodged);
  // 다른 데 있으면 가게 일은 뜨지 않는다 (빚만 따라온다)
  const a = setup(92910); placeAt(a, 'verden');
  if (!direct(a, 'inn_event', { ev: 'brawl' }, 'let').skipped) fail('brawl away');
  if (direct(a, 'inn_event', { ev: 'arrears' }, 'hold').skipped) fail('arrears away');
  // 쌓이면 뜬다
  const b = setup(92920); myInn(b).arrears = 400; b.player.money = 0; clearQ(b); tick(b);
  if (!L(b).queue.some((q) => q.kind === 'inn_event' && q.ev === 'arrears')) fail('arrears not queued');
  const t = setup(92930); myInn(t).arrears = 0; myInn(t).taxOwed = 30; myInn(t).taxAt = 0; clearQ(t); tick(t);
  if (!L(t).queue.some((q) => q.kind === 'inn_event' && q.ev === 'tax')) fail('tax not queued');
  // 내가 없으면 세금은 일꾼이 낸다
  const t2 = setup(92940); myInn(t2).arrears = 0; myInn(t2).taxOwed = 30; myInn(t2).taxAt = 0; placeAt(t2, 'verden'); clearQ(t2); tick(t2);
  if (myInn(t2).taxOwed !== 0) fail('tax paid away');
}

/* 5) 대 잇기, 옛 저장, 저절로 */
{
  const g = owner(93000, 'verden', 'inn');
  for (const f of HOOKS.heir.filter((f) => /gens \+= 1/.test(String(f)) && /myInn/.test(String(f)))) f(g);
  if (myInn(g).gens !== 2) fail('heir gens', myInn(g).gens);
  const o = adult(93100);
  delete o.inn; runHooks('migrate', o);
  if (!o.inn || !Array.isArray(o.inn.lost)) fail('migrate');
  o.inn = { inn: { place: 'nowhere', kind: 'inn' }, lost: 'x' }; runHooks('migrate', o);
  if (o.inn.inn || !Array.isArray(o.inn.lost)) fail('migrate bad place');
  o.inn = { inn: { place: 'harfen', kind: 'tavern', name: 5, rooms: 9, fame: 'x', workers: [{ role: 'gone' }, { name: 'a', role: 'cook' }], regulars: [{ id: 'gone' }, { id: 'bard' }], price: 'odd', backroom: null, rival: { name: 1 }, gang: 'x' } };
  runHooks('migrate', o);
  const x = o.inn.inn;
  if (!x || x.rooms !== 0 || x.workers.length !== 1 || x.regulars.length !== 1 || x.price !== 'fair' || x.rival || x.gang || typeof x.name !== 'string' || !Number.isFinite(x.fame)) fail('migrate partial', JSON.stringify(x));
  if (JSON.stringify(innStatus(o)).match(/NaN|undefined/)) fail('status');
  let opened = 0, months = 0, total = 0, events = 0;
  for (let run = 0; run < 4; run++) {
    const a = adult(93200 + run); placeAt(a, ['leocast', 'harfen', 'ern', 'portel'][run]); a.player.money = 2500;
    for (let mth = 0; mth < 120 && !a.over; mth++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.6) ? ['inn_open', rngOf(a).pick(['inn_work', 'inn_manage', 'inn_work']), 'inn_work'] : [rngOf(a).pick(acts.filter((x) => x.id !== 'travel' && x.id !== 'house_move')).id];
      month(a, want);
      const line = innLine(a); if (bad(line) || josa(line)) fail('line', line);
    }
    opened += I(a).opened; if (myInn(a)) { months += myInn(a).months; total += myInn(a).total; }
    events += Object.keys(seen.scenes).filter((k) => k.startsWith('inn_')).length;
  }
  console.log(`저절로 10년 4판: 연 가게 ${opened}, 가게 달수 ${months}, 쌓인 벌이 은화 ${total}닢`);
  if (!opened || !months) fail('autoplay never ran an inn');
}

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('inn_')))));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
