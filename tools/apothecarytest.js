import '../src/content.js';
// 약초꾼과 약방(src/apothecary/)을 브라우저 없이 돌려 보는 점검. 1분 안에 끝나게: 어른 하나를 길러 복제해 쓴다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { apothecaryStatus, apothecaryLine, apothecaryState as AP, newShop, rxPower, shopMonth } from '../src/apothecary/index.js';
import { crimeState, crimeState as crimeStateOf } from '../src/crime.js';

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
    if (/^apo_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^apo_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = apothecaryStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
const BASE = {};
function grow(seed, family) {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
// 어른 하나를 한 번만 길러 두고 복제한다 (난수 씨앗만 바꿔서)
function adult(seed, family = 'farmer') {
  BASE[family] ??= JSON.stringify(grow(7001, family));
  const g = JSON.parse(BASE[family]);
  if (g.rngState) g.rngState.s = seed | 0;
  return g;
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
import { healthState as HS, fallSick } from '../src/health/index.js';
import { makePerson } from '../src/npc.js';

const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
const clearQ = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const nowMi = (g) => g.date.year * 12 + g.date.month;
const setMonth = (g, m) => { g.date.month = m; };
function fresh(seed, pl = 'ern', skill = 40) {
  const g = adult(seed); placeAt(g, pl); heal(g);
  g.player.money = 2000; for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  g.player.skills.herbs = skill;
  Object.assign(AP(g), { herbs: {}, satchel: {}, book: {}, shop: null, named: [], doctor: null, eventAt: nowMi(g), brewed: 0, harmed: 0 });
  HS(g).sick = []; HS(g).outbreaks = [];
  if (g.troupe) g.troupe.t = null; if (g.poor) g.poor.bond = null; if (g.army) g.army.service = null;
  L(g).job = null;
  return g;
}
function herbalist(seed, pl = 'harfen') {
  const g = fresh(seed, pl, 50);
  Object.assign(AP(g).book, { fever: 1, salve: 1, gut: 1, cough: 1, ward: 1, bane: 1 });
  AP(g).herbs = { willow: 10, wormwood: 10, moss: 6, gentian: 6, aloe: 4, frost: 4, mushroom: 2, nightshade: 4 };
  return g;
}
const outbreak = (g, kind = 'fever') => { HS(g).outbreaks = [{ kind, region: regionOf(here0(g)), sev: 0.6, left: 3, start: { y: g.date.year, m: g.date.month } }]; };
const here0 = (g) => L(g).place;
import { regionOf } from '../src/nature/state.js';

/* 1) 약초 찾기: 솜씨와 고장·철 */
{
  const g = fresh(701000); setMonth(g, 5);
  if (!can(g, 'apo_gather')) fail('cannot gather');
  const out = act('apo_gather').run(g, R(g));
  if (bad(out) || josa(out) || !Object.keys(AP(g).herbs).length || !AP(g).book.fever || !AP(g).book.salve) fail('gather', out, JSON.stringify(AP(g)));
  const novice = fresh(701010, 'ern', 5); setMonth(novice, 5); if (can(novice, 'apo_gather')) fail('gather novice');
  const winter = fresh(701020, 'ern'); setMonth(winter, 1); if (can(winter, 'apo_gather')) fail('gather in southern winter');
  const north = fresh(701030, 'graubel'); setMonth(north, 1); if (!can(north, 'apo_gather')) fail('frost in north winter');
  act('apo_gather').run(north, R(north)); if (!AP(north).herbs.frost) fail('north frost', JSON.stringify(AP(north).herbs));
}

/* 2) 약 달이기, 궁리, 이름난 처방 */
{
  const g = herbalist(702000, 'ern');
  if (!can(g, 'apo_brew')) fail('cannot brew');
  const ch = SCENES.apo_brew.choices(g, {}); if (ch.length > 8) fail('brew choices', ch.length);
  direct(g, 'apo_brew', {}, 'brew:fever');
  if (!(AP(g).satchel.fever >= 2) || AP(g).herbs.willow !== 8) fail('brew fever', JSON.stringify(AP(g)));
  AP(g).herbs = {}; if (can(g, 'apo_brew')) fail('brew without herbs');
  // 궁리: 모르는 처방을 얻거나 못 얻거나, 약초는 줄어든다
  const t = fresh(702010, 'ern', 60); AP(t).book = { fever: 1 }; AP(t).herbs = { moss: 3, gentian: 3, frost: 2 };
  direct(t, 'apo_brew', {}, 'try'); if (Object.values(AP(t).herbs).reduce((a, b) => a + b, 0) !== 5) fail('try uses herbs', JSON.stringify(AP(t).herbs));
  // 열두 번 넘게 잘 지으면 이름이 붙는다
  const n = herbalist(702020, 'ern'); n.player.skills.herbs = 60; AP(n).book.fever = 12;
  direct(n, 'apo_brew', {}, 'brew:fever');
  if (!AP(n).named.length || !/네 열내림 달임/.test(SCENES.apo_brew.text(n, {}))) fail('named', JSON.stringify(AP(n).named));
  const b = herbalist(702030, 'ern'); b.player.skills.herbs = 60; AP(b).book.bane = 30; direct(b, 'apo_brew', {}, 'brew:bane'); if (AP(b).named.length) fail('poison named');
}

/* 3) 식구에게 내 약 */
{
  const g = herbalist(703000, 'ern'); AP(g).satchel = { fever: 2 };
  if (can(g, 'apo_dose')) fail('dose without sick');
  fallSick(g, 'fever', 'me', R(g), 40);
  const s = HS(g).sick.find((x) => x.who === 'me');
  if (!s) fail('fallSick');
  else {
    s.treat = null;
    if (!can(g, 'apo_dose')) fail('cannot dose');
    const out = act('apo_dose').run(g, R(g));
    if (bad(out) || josa(out) || !s.treat || s.treat.by !== 'self_herbs' || !(s.treat.power > 0) || AP(g).satchel.fever !== 1) fail('dose', out, JSON.stringify(s));
    if (can(g, 'apo_dose')) fail('dose twice');
  }
  const w = herbalist(703010, 'ern'); AP(w).satchel = { salve: 2 }; fallSick(w, 'lung', 'me', R(w), 40); HS(w).sick.forEach((x) => { x.treat = null; });
  if (can(w, 'apo_dose')) fail('dose wrong remedy');
  if (!(rxPower(w, 'fever', 'fever') > rxPower(w, 'fever', 'flux'))) fail('rx power');
}

/* 4) 약방 */
{
  const g = herbalist(704000, 'harfen'); AP(g).satchel = { fever: 6, gut: 4 };
  if (can(g, 'apo_shop')) fail('shop before brewing');
  AP(g).brewed = 3;
  if (!can(g, 'apo_shop')) fail('cannot open');
  direct(g, 'apo_shop', {}, 'open');
  const p = AP(g).shop;
  if (!p || p.place !== 'harfen' || p.stock.fever !== 6 || AP(g).satchel.fever) fail('open', JSON.stringify(AP(g)));
  const m0 = g.player.money; const got = shopMonth(g, R(g));
  if (!(got > 0) || g.player.money !== m0 + got) fail('shop sales', got);
  // 돌림병 때는 그 병의 약이 먼저, 비싸게
  const o = herbalist(704010, 'harfen'); AP(o).shop = newShop(o); AP(o).shop.stock = { fever: 5, gut: 5 }; outbreak(o, 'flux');
  const pl = herbalist(704011, 'harfen'); AP(pl).shop = newShop(pl); AP(pl).shop.stock = { fever: 5, gut: 5 };
  const a = shopMonth(o, R(o)), c = shopMonth(pl, R(pl));
  if (!(a > c) || !((AP(o).shop.stock.gut ?? 0) < 5)) fail('plague prices', a, c, JSON.stringify(AP(o).shop.stock));
  // 값 매기기·분필·닫기
  direct(g, 'apo_shop', {}, 'price:dear'); if (AP(g).shop.price !== 'dear') fail('price');
  direct(g, 'apo_shop', {}, 'cut'); if (!AP(g).shop.cut) fail('cut');
  direct(g, 'apo_shop', {}, 'uncut'); if (AP(g).shop.cut) fail('uncut');
  AP(g).satchel = { salve: 2 }; direct(g, 'apo_shop', {}, 'stock'); if (AP(g).shop.stock.salve !== 2) fail('stock');
  placeAt(g, 'ern'); if (can(g, 'apo_shop')) fail('shop away'); placeAt(g, 'harfen');
  direct(g, 'apo_shop', {}, 'close'); if (AP(g).shop || !AP(g).past.length) fail('close');
  const hamlet = herbalist(704020, 'saltrock'); AP(hamlet).brewed = 3; if (can(hamlet, 'apo_shop') && (PLACES.saltrock.house ?? 0) < 120) fail('shop in hamlet');
}

/* 5) 사건 */
{
  const EVK = { doctor: ['pay', 'proof', 'ignore'], priest: ['give', 'show', 'ignore'], quack: ['expose', 'cheap', 'wait'], poison: ['refuse', 'sell', 'visit', 'report'], plague: ['gouge', 'fair', 'free'], harmed: ['pay', 'deny', 'taste'], rare: ['buy', 'drink', 'no'] };
  let n = 0;
  for (const [ev, keys] of Object.entries(EVK)) for (const k of keys) {
    const g = herbalist(705000 + n++ * 7, 'harfen'); AP(g).shop = newShop(g); AP(g).shop.stock = { fever: 4, bane: 1 }; AP(g).shop.cut = ev === 'harmed' && k === 'deny';
    if (ev === 'plague') outbreak(g);
    const r = direct(g, 'apo_event', { ev }, k);
    if (r.skipped || r.missing) fail('event', ev, k, JSON.stringify(r));
  }
  const ps = herbalist(705500, 'harfen'); AP(ps).shop = newShop(ps); AP(ps).satchel = { bane: 1 }; const m = ps.player.money;
  direct(ps, 'apo_event', { ev: 'poison' }, 'sell'); if (ps.player.money !== m + 30 || !crimeStateOf(ps).record.some((x) => x.c === 'murder')) fail('poison sell');
  const gg = herbalist(705510, 'harfen'); AP(gg).shop = newShop(gg); AP(gg).shop.stock = { fever: 5 }; outbreak(gg); const f0 = AP(gg).shop.fame;
  direct(gg, 'apo_event', { ev: 'plague' }, 'gouge'); if (AP(gg).shop.stock.fever || !(AP(gg).shop.fame < f0)) fail('gouge');
  const nb = herbalist(705520, 'harfen'); AP(nb).shop = newShop(nb); AP(nb).satchel = {}; AP(nb).shop.stock = {};
  if (SCENES.apo_event.choices(nb, { ev: 'poison' }).some((c) => c.key === 'sell')) fail('sell poison without any');
  const p = fresh(705600); for (const e of ['doctor', 'priest', 'plague', 'harmed']) if (!direct(p, 'apo_event', { ev: e }, 'pay').skipped) fail('event without shop', e);
  const q = herbalist(705700, 'harfen'); AP(q).shop = newShop(q); const got = new Set();
  for (let i = 0; i < 80; i++) { clearQ(q); AP(q).eventAt = -99; AP(q).shop.stock = { fever: 4 }; AP(q).shop.cut = true; outbreak(q); q.player.money = 2000; tick(q); for (const x of L(q).queue) if (x.kind === 'apo_event') got.add(x.ev); }
  if (got.size < 5) fail('monthly events', [...got]);
}

/* 6) 대 잇기, 옛 저장, 저절로 */
{
  const heirFns = HOOKS.heir.filter((f) => /처방 장부/.test(String(f)));
  if (heirFns.length !== 1) fail('heir hook', heirFns.length);
  const h = herbalist(706000); AP(h).shop = newShop(h); AP(h).shop.cut = true; AP(h).named = [{ id: 'fever', by: '하넬', gen: 1, fame: 10, since: 500 }]; AP(h).book.fever = 20;
  for (const f of heirFns) f(h);
  if (AP(h).shop.gens !== 2 || AP(h).shop.cut || AP(h).named[0].gen !== 2 || AP(h).book.fever !== 1) fail('heir', JSON.stringify(AP(h)));
  const x = adult(706100);
  delete x.apoth; runHooks('migrate', x);
  if (!x.apoth || x.apoth.shop !== null) fail('migrate');
  x.apoth = { herbs: { willow: 'x', moss: 3.4, gone: 2 }, satchel: 'x', book: { fever: 3, gone: 1 }, shop: { place: 'harfen', stock: { fever: 2, ward: 'x' }, price: 'gone', fame: 400 }, named: [{ id: 'gone' }, { id: 'fever', by: '옛' }], doctor: { name: 3 } };
  runHooks('migrate', x);
  const a = x.apoth;
  if (JSON.stringify(a.herbs) !== '{"moss":3}' || JSON.stringify(a.satchel) !== '{}' || Object.keys(a.book).join() !== 'fever' || a.shop?.price !== 'fair' || a.shop.fame !== 100 || JSON.stringify(a.shop.stock) !== '{"fever":2}' || a.named.length !== 1 || a.named[0].gen !== 1 || a.doctor) fail('migrate partial', JSON.stringify(a));
  x.apoth = { shop: { place: 'nowhere' } }; runHooks('migrate', x); if (x.apoth.shop) fail('migrate bad place');
  if (JSON.stringify(apothecaryStatus(x)).match(/NaN|undefined/)) fail('status');
  // 저절로 살아 보기 (짧게)
  let brewed = 0, sold = 0;
  for (let run = 0; run < 3; run++) {
    const g = fresh(706200 + run, ['harfen', 'verden', 'graubel'][run], 35);
    for (let mth = 0; mth < 48 && !g.over; mth++) {
      const acts = availableActions(g);
      const want = rngOf(g).chance(0.8) ? ['apo_gather', 'apo_brew', 'apo_shop', 'apo_dose'].sort(() => rngOf(g).float(-1, 1)) : [rngOf(g).pick(acts.filter((x2) => !x2.id.startsWith('travel') && x2.id !== 'house_move')).id];
      month(g, want, (k2, labels) => (k2 === 'apo_brew' ? labels.findIndex((l) => /달인다/.test(l)) : k2 === 'apo_shop' ? labels.findIndex((l) => /연다|올린다/.test(l)) : -1));
      const line = apothecaryLine(g); if (bad(line) || josa(line)) fail('line', line);
    }
    brewed += AP(g).brewed; sold += AP(g).sold;
  }
  console.log(`저절로 4년 3판: 달인 약 ${brewed}첩, 약방에서 판 약 ${sold}첩`);
  if (!brewed) fail('autoplay never brewed');
}

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('apo_')))));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
