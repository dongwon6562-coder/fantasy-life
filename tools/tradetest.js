import '../src/content.js';
// 장사 길과 상단(src/trade/)을 브라우저 없이 돌려 보는 점검.
// 1) 고장마다 다른 시세, 전쟁·가뭄이 값을 움직임, 많이 사고팔면 값이 움직임.
// 2) 장터에서 사서 먼 고장에 가져가 팔기 (길 위의 도적, 성문 통행세), 대상단(마차·호위·짐꾼·말), 삯.
// 3) 도적과 통행세의 선택지마다.
// 4) 상회 세우기, 지점, 키우기, 세상의 상단 목록과 잇기, 망하기. 가게 상단을 상회로 키우기.
// 5) 맞수 상단의 일 여섯 가지 선택지마다, 맞수가 무너짐.
// 6) 장삿길의 일 열 가지 선택지마다.
// 7) 대 잇기, 옛 저장, 저절로 살아 보기, tradeStatus.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { PLACES, travelMonths } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { H } from '../src/history/state.js';
import { addAnimal } from '../src/beasts/index.js';
import {
  T, GOODS, GOOD_IDS, LOCAL, isMarket, priceAt, buyAt, sellAt, capacity, addCargo, cargoQty, cargoValue, tollOf, banditChance,
  tradeStatus, houseCompany, TRADE_EVENTS, TRADE_EVENT_IDS, RIVAL_EVENTS, FOUND_HOUSE,
} from '../src/trade/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const seen = { scenes: {}, ev: {}, rival: {} };
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
    if (s?.kind === 'trade_event') seen.ev[s.ev] = (seen.ev[s.ev] ?? 0) + 1;
    if (s?.kind === 'trade_rival') seen.rival[s.ev] = (seen.rival[s.ev] ?? 0) + 1;
    if (pe.choices.length > 8) fail('too many choices', s?.kind, pe.choices.length);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^trade_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^trade_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = tradeStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
  for (const c of Object.values(T(g).cargo)) if (!c || c.qty <= 0 || !Number.isFinite(c.cost)) fail('bad cargo', JSON.stringify(T(g).cargo));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'merchant') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (l.job?.id === 'soldier') l.job = null; if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; T(g).road = null; }
const heal = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; };
function scene(g, kind, data, re, opt = {}) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, opt.want ?? ['rest'], (k, labels) => { if (k !== kind) return opt.other?.(k, labels) ?? -1; done = true; const i2 = idxOf(labels, re); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, JSON.stringify(data), L(g).place, playerAge(g), JSON.stringify(L(g).queue.map((q) => q.kind)));
  if (done && !chose && !g.over) fail('choice not found', kind, re, JSON.stringify(data));
  return chose;
}
function go(g, to, pick = null) {
  const from = L(g).place;
  L(g).travel = { to, left: travelMonths(from, to), from };
  const pk = (k, labels, s) => (verbose && console.log('  scene', k, L(g).place, JSON.stringify(T(g).road)), k === 'border' ? idxOf(labels, /통행세를 낸다|찔러/) : pick ? pick(k, labels, s) : -1);
  for (let i = 0; i < 12 && L(g).travel && !g.over; i++) { heal(g); g.player.money = Math.max(g.player.money, 200); month(g, ['on_road', 'rest'], pk); }
  if (L(g).place !== to && !g.over) fail('did not arrive', from, to, L(g).place);
  for (let i = 0; i < 3 && L(g).queue.length + (g.pendingEvent ? 1 : 0) > 0; i++) { heal(g); month(g, ['rest'], pk); } // 닿은 뒤의 장면(국경, 통행세)
}

/* ---------- 1) 시세 ---------- */
{
  const g = adult(71000);
  const spread = GOOD_IDS.map((k) => { const ps = Object.keys(LOCAL).filter(isMarket).map((p) => priceAt(g, p, k)); return Math.max(...ps) / Math.min(...ps); });
  if (spread.some((x) => x < 1.4)) fail('price spread too flat', spread.map((x) => x.toFixed(2)).join(' '));
  if (!(priceAt(g, 'hammer', 'dwarfsteel') < priceAt(g, 'leocast', 'dwarfsteel'))) fail('dwarfsteel not cheaper at hammer');
  if (!(priceAt(g, 'fur', 'fur') < priceAt(g, 'eisen', 'fur'))) fail('fur not cheaper at fur market');
  for (const p of Object.keys(LOCAL).filter(isMarket)) for (const k of GOOD_IDS) if (!(buyAt(g, p, k) > sellAt(g, p, k))) fail('no spread', p, k);
  const iron0 = priceAt(g, 'harfen', 'iron');
  g.realm.balhart.war = true;
  if (!(priceAt(g, 'harfen', 'iron') > iron0)) fail('war did not raise iron');
  g.realm.balhart.war = false;
  const grain0 = priceAt(g, 'ern', 'grain');
  g.nature.active.push({ kind: 'drought', region: 'south', sev: 2, left: 3 });
  if (!(priceAt(g, 'ern', 'grain') > grain0)) fail('drought did not raise grain', grain0, priceAt(g, 'ern', 'grain'));
  g.nature.active.pop();
  // 많이 사면 값이 오른다
  placeAt(g, 'hammer');
  g.player.money = 5000;
  T(g).caravan.wagons = 2;
  const p0 = buyAt(g, 'hammer', 'iron');
  scene(g, 'trade_market', {}, /^쇠 \d+짐을 산다/);
  if (!(T(g).cargo.iron?.qty > 0)) fail('did not buy iron', JSON.stringify(T(g).cargo));
  if (!(buyAt(g, 'hammer', 'iron') > p0)) fail('buying did not raise price', p0, buyAt(g, 'hammer', 'iron'));
  console.log(`시세: 하르펜 쇠 ${iron0} (전쟁 때 더 비쌈), 쇠망치 골 드워프 강철 ${priceAt(g, 'hammer', 'dwarfsteel')}, 왕도 ${priceAt(g, 'leocast', 'dwarfsteel')}`);
}

/* ---------- 2) 사서 가져가 팔기, 대상단 ---------- */
{
  let profits = 0, tolls = 0, bandits = 0;
  for (let run = 0; run < 4; run++) {
    const g = adult(72000 + run);
    placeAt(g, 'harfen');
    g.player.money = 600;
    scene(g, 'trade_caravan', {}, /마차를 산다/);
    if (T(g).caravan.wagons !== 1) fail('wagon not bought', JSON.stringify(T(g).caravan));
    scene(g, 'trade_caravan', {}, /호위 둘을 둔다/);
    scene(g, 'trade_caravan', {}, /짐꾼 둘을 쓴다/);
    const cap = capacity(g);
    if (cap !== 4 + 15 + 8) fail('capacity', cap);
    addAnimal(g, 'horse', { ageYears: 5, trained: 100, bond: 40 });
    if (capacity(g) !== cap + 6) fail('horse capacity', capacity(g));
    const m0 = g.player.money;
    month(g, ['rest']);
    if (!(g.player.money < m0)) fail('upkeep not paid', m0, g.player.money);
    // 바르카에서 비단을 사서 왕도에 판다
    placeAt(g, 'barka');
    g.player.money = 1500;
    const bought = scene(g, 'trade_market', {}, /^비단 \d+짐을 산다/);
    if (!bought) continue;
    const before = T(g).profit;
    go(g, 'leocast', (k, labels) => { if (k === 'trade_toll') { tolls++; return idxOf(labels, /통행세를 낸다|짐으로 낸다/); } if (k === 'trade_bandits') { bandits++; return idxOf(labels, /맞서/); } return -1; });
    if (verbose) console.log('run', run, L(g).place, JSON.stringify(T(g).cargo), JSON.stringify(T(g).road), T(g).log.slice(0, 4).map((x) => x.text).join(' / '));
    if (L(g).place === 'leocast' && T(g).cargo.silk?.qty) {
      scene(g, 'trade_market', {}, /^비단 \d+짐을 판다/);
      if (T(g).cargo.silk?.qty) fail('silk not sold');
      if (T(g).profit - before > 0) profits++;
    }
  }
  console.log(`바르카 비단 → 왕도: 4판 중 남긴 판 ${profits}, 통행세 장면 ${tolls}, 도적 ${bandits}`);
  if (profits < 2) fail('silk run rarely profitable', profits);
  if (!tolls) fail('no toll on arrival in leocast');
  // 삯을 못 주면 떠난다
  const g = adult(72100);
  placeAt(g, 'harfen');
  Object.assign(T(g).caravan, { wagons: 1, guards: 4, porters: 2 });
  for (let m = 0; m < 4; m++) { g.player.money = 0; g.player.familyMoney = 0; month(g, ['rest']); }
  if (T(g).caravan.guards || T(g).caravan.porters) fail('unpaid guards stayed', JSON.stringify(T(g).caravan));
}

/* ---------- 3) 도적과 통행세 선택지마다 ---------- */
{
  const outs = {};
  for (const re of [/맞서/, /일부를 내주고/, /달아난다/, /흥정한다/]) {
    for (let i = 0; i < 2; i++) {
      const g = adult(73000 + i * 10 + Object.keys(outs).length);
      placeAt(g, 'harfen');
      g.player.skills.trade = 50; T(g).caravan.guards = 2; T(g).caravan.wagons = 1; g.player.money = 300;
      addCargo(g, 'silk', 10, 300);
      L(g).travel = { to: 'leocast', left: 3, from: 'harfen' };
      const q0 = cargoQty(g);
      const chose = scene(g, 'trade_bandits', { at: null, roll: 12 }, re, { want: ['on_road'] });
      if (chose) outs[re.source] = (outs[re.source] ?? 0) + 1;
      if (chose && /내주고/.test(chose) && !(cargoQty(g) < q0)) fail('pay lost nothing');
    }
  }
  if (Object.keys(outs).length < 4) fail('bandit choices', JSON.stringify(outs));
  for (const re of [/통행세를 낸다/, /따진다/, /소매에/, /개구멍/]) {
    const g = adult(73500 + Object.keys(outs).length);
    outs[re.source] = 1;
    placeAt(g, 'leocast');
    g.player.money = 500;
    addCargo(g, 'spice', 10, 200);
    if (!(tollOf(g, 'leocast', 'barka') > tollOf(g, 'leocast', 'harfen'))) fail('border toll not higher');
    const m0 = g.player.money;
    const chose = scene(g, 'trade_toll', { from: 'harfen' }, re);
    if (chose && /통행세를 낸다/.test(chose) && !(g.player.money < m0)) fail('toll not paid');
  }
  // 호위와 개가 도적을 줄인다
  const g = adult(73900);
  placeAt(g, 'harfen');
  addCargo(g, 'silk', 20, 600);
  L(g).travel = { to: 'leocast', left: 2, from: 'harfen' };
  const p0 = banditChance(g);
  T(g).caravan.guards = 6;
  if (!(banditChance(g) < p0)) fail('guards did not lower bandits', p0, banditChance(g));
}

/* ---------- 4) 상회 ---------- */
{
  const g = adult(74000);
  placeAt(g, 'harfen');
  T(g).profit = 400; g.player.money = 3000;
  scene(g, 'trade_house', {}, /상회를 세운다/);
  const h = T(g).house;
  if (!h) fail('house not founded');
  else {
    if (!houseCompany(g)?.player) fail('house not in history companies');
    placeAt(g, 'verden');
    scene(g, 'trade_house', {}, /지점을 낸다/);
    if (h.branches.length !== 2) fail('branch', h.branches);
    T(g).profit = 2000; g.player.money = 3000;
    scene(g, 'trade_house', {}, /키운다/);
    if (h.level !== 2) fail('level up', h.level);
    if (!(tollOf(g, 'verden', 'harfen') < (addCargo(g, 'wine', 5, 50), Math.round(cargoValue(g, 'verden') * 0.03)) + 1)) fail('branch toll discount');
    const m0 = g.player.money;
    month(g, ['rest']);
    if (!(g.player.money > m0 - 5)) fail('no house income', m0, g.player.money);
    // 망하기: 세상의 상단 목록에서 사라지면
    const list = H(g).companies;
    list.splice(list.indexOf(houseCompany(g)), 1);
    month(g, ['rest']);
    if (T(g).house) fail('house survived bankruptcy');
  }
  // 가게로 세운 상단을 상회로
  const g2 = adult(74100);
  placeAt(g2, 'harfen');
  H(g2).companies.push({ id: 'pX', name: '하넬 상회', kind: 'arms', fortune: 40, peak: 40, founded: g2.date.year, player: true });
  g2.craft = g2.craft ?? {};
  g2.craft.ownCompany = { id: 'pX', name: '하넬 상회', since: g2.date.year };
  g2.player.money = 500;
  scene(g2, 'trade_house', {}, /장사 길 상회로 키운다/);
  if (T(g2).house?.id !== 'pX') fail('craft company not linked', JSON.stringify(T(g2).house));
  if (H(g2).companies.filter((c) => c.player).length !== 1) fail('double company');
}

/* ---------- 5) 맞수 상단 ---------- */
{
  const keys = { undercut: [/값 싸움/, /다른 길/, /손을 잡자/], sabotage: [/고발/, /갚아/, /참는다/], poach: [/웃돈/, /갈 사람/], guild: [/선물/, /따진다/, /버린다/], thugs: [/호위를 더/, /웃돈을 준다/, /소문일/], buyout: [/판다/, /거절/] };
  let n = 0;
  for (const ev of RIVAL_EVENTS) {
    for (const re of keys[ev]) {
      const g = adult(75000 + n++);
      placeAt(g, 'harfen');
      T(g).profit = 3000; g.player.money = 3000;
      scene(g, 'trade_house', {}, /상회를 세운다/);
      const co = H(g).companies.find((c) => !c.player && !c.pillar);
      T(g).rival = { id: co.id, name: co.name, heat: 1, since: 0, thugs: false };
      T(g).caravan.guards = 4; T(g).caravan.wagons = 1;
      addCargo(g, 'wool', 8, 80);
      scene(g, 'trade_rival', { ev, offer: 900 }, re);
    }
  }
  if (Object.keys(seen.rival).length < RIVAL_EVENTS.length) fail('rival events', JSON.stringify(seen.rival));
  // 맞수가 무너지면 이긴다
  const g = adult(75900);
  placeAt(g, 'harfen');
  const co = H(g).companies.find((c) => !c.player && !c.pillar);
  T(g).rival = { id: co.id, name: co.name, heat: 1, since: 0 };
  H(g).companies.splice(H(g).companies.indexOf(co), 1);
  month(g, ['rest']);
  if (T(g).rival) fail('rival survived its fall');
  if (!g.chronicle.some((c) => c.text.includes(co.name))) fail('rival fall not in chronicle');
}

/* ---------- 6) 장삿길의 일 ---------- */
{
  let n = 0;
  for (const ev of TRADE_EVENT_IDS) {
    for (let ci = 0; ci < 3; ci++) {
      const g = adult(76000 + n++);
      placeAt(g, 'harfen');
      g.player.money = 400; g.player.skills.trade = 40;
      Object.assign(T(g).caravan, { wagons: 1, guards: 2, porters: 2 });
      T(g).volume = 50;
      addCargo(g, 'grain', 10, 70); addCargo(g, 'iron', 5, 80);
      if (ev === 'famine') g.realm.bread = 1.4;
      if (ev === 'army') g.realm.balhart.war = true;
      const data = { ev, n: 1, pl: 'leocast', good: 'silk', real: true };
      if (!TRADE_EVENTS[ev].need(g, data)) { fail('event need false', ev); break; }
      const labels = TRADE_EVENTS[ev].choices(g, data).map((c) => c.label);
      if (ci >= labels.length) break;
      scene(g, 'trade_event', data, new RegExp(`^${labels[ci].split(' (')[0]}`));
      g.realm.balhart.war = false;
    }
  }
  if (Object.keys(seen.ev).length < TRADE_EVENT_IDS.length) fail('trade events seen', JSON.stringify(seen.ev));
  // 외상값은 반년 뒤에
  const g = adult(76900);
  placeAt(g, 'harfen');
  T(g).debts.push({ who: '시험 귀족', amt: 100, cost: 50, due: 0, odds: 1 });
  const m0 = g.player.money;
  month(g, ['rest']);
  if (!(g.player.money >= m0 + 90)) fail('credit not paid', m0, g.player.money);
}

/* ---------- 7) 대 잇기, 옛 저장, 저절로 ---------- */
{
  const g = adult(77000);
  placeAt(g, 'harfen');
  addCargo(g, 'wine', 5, 60);
  T(g).caravan.wagons = 1;
  runHooks('heir', g, rngOf(g), g.player);
  if (!T(g).cargo.wine || T(g).caravan.wagons !== 1) fail('heir lost cargo or wagons');
  const o = adult(77100);
  delete o.trade;
  runHooks('migrate', o);
  if (!o.trade || !o.trade.caravan) fail('migrate failed');
  let traded = 0, houses = 0, rivals = 0;
  for (let run = 0; run < 4; run++) {
    const a = adult(77200 + run);
    placeAt(a, ['harfen', 'barka', 'leocast', 'hammer'][run]);
    for (let m = 0; m < 180 && !a.over; m++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.45) ? ['trade_market', 'trade_caravan', 'trade_house', 'travel'] : [rngOf(a).pick(acts).id];
      a.player.money = Math.max(a.player.money, 40);
      month(a, want);
      if (T(a).house) houses = Math.max(houses, T(a).house.level);
      if (T(a).rival) rivals++;
    }
    traded += T(a).volume;
  }
  console.log(`저절로 15년 4판: 사고판 짐 ${traded}, 가장 큰 상회 ${houses}단계, 맞수가 있던 달 ${rivals}`);
  if (!traded) fail('autoplay never traded');
}

console.log('장면:', JSON.stringify(seen.scenes));
console.log('장삿길의 일:', JSON.stringify(seen.ev));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
