import '../src/content.js';
// 내 농장 일구기(src/farm/)를 브라우저 없이 돌려 보는 점검. 1분 안에 끝나게: 어른 하나를 길러 복제해 쓴다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { farmStatus, farmLine, farmState as FM, farm, newFarm, newField, CROPS, cropPrice, barnTotal, capacity, fieldYield } from '../src/farm/index.js';
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
    if (/^farm_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^farm_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = farmStatus(g);
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
import { NS, regionOf } from '../src/nature/state.js';

const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
const clearQ = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const nowMi = (g) => g.date.year * 12 + g.date.month;
const setMonth = (g, m) => { g.date.month = m; };
function fresh(seed, pl = 'ern', skill = 30) {
  const g = adult(seed); placeAt(g, pl); heal(g);
  g.player.money = 3000; for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  g.player.skills.farming = skill;
  Object.assign(FM(g), { farm: null, neighbor: null, eventAt: nowMi(g) });
  if (g.troupe) g.troupe.t = null; if (g.poor) g.poor.bond = null; if (g.army) g.army.service = null;
  NS(g).active = []; for (const r of Object.keys(NS(g).crop)) NS(g).crop[r] = 1;
  if (g.realm) g.realm.bread = 1;
  L(g).job = null;
  return g;
}
function farmer(seed, pl = 'ern', n = 3, extra = {}) {
  const g = fresh(seed, pl);
  const f = newFarm(g); FM(g).farm = f;
  for (let i = 0; i < n; i++) f.fields.push(newField(g, { soil: 70 }));
  Object.assign(f, extra);
  return g;
}

/* 1) 땅 사고팔기·빌리기·소작 */
{
  const g = fresh(601000);
  if (!can(g, 'farm_land')) fail('cannot land');
  const m0 = g.player.money;
  direct(g, 'farm_land', {}, 'buy');
  if (!farm(g) || farm(g).fields.length !== 1 || farm(g).place !== 'ern' || !(g.player.money < m0)) fail('buy first', JSON.stringify(farm(g)));
  direct(g, 'farm_land', {}, 'lease'); if (farm(g).fields.length !== 2 || !farm(g).fields[1].leased) fail('lease');
  direct(g, 'farm_land', {}, 'tenant'); if (!farm(g).fields[0].tenant) fail('tenant');
  direct(g, 'farm_land', {}, 'take'); if (farm(g).fields[0].tenant) fail('take back');
  direct(g, 'farm_land', {}, 'return'); if (farm(g).fields.length !== 1) fail('return lease');
  const m1 = g.player.money; direct(g, 'farm_land', {}, 'sell'); if (farm(g) || !(g.player.money > m1) || !FM(g).past.length) fail('sell last');
  const town = fresh(601010, 'serenia'); if (can(town, 'farm_land')) fail('farm in lake city');
  const away = farmer(601020); placeAt(away, 'harfen'); if (can(away, 'farm_land') || can(away, 'farm_sow') || can(away, 'farm_work')) fail('farm away');
  const full = farmer(601030, 'ern', 8); if (!direct(full, 'farm_land', {}, 'buy').missing) fail('field cap');
}

/* 2) 씨 뿌리기, 돌려짓기, 밭일, 거두기 */
{
  const g = farmer(602000, 'ern', 3, { hands: 1 }); setMonth(g, 3);
  if (!can(g, 'farm_sow')) fail('cannot sow');
  const ch = SCENES.farm_sow.choices(g, {}); if (ch.length > 8) fail('sow choices');
  direct(g, 'farm_sow', {}, 'crop:wheat');
  if (farm(g).fields.some((x) => x.crop !== 'wheat')) fail('sow wheat', JSON.stringify(farm(g).fields));
  if (can(g, 'farm_sow')) fail('sow again without fallow');
  const w = farmer(602010); setMonth(w, 8); if (can(w, 'farm_sow')) fail('sow in august');
  // 손이 모자라면 다 못 뿌린다
  const c = farmer(602020, 'ern', 6); setMonth(c, 4); direct(c, 'farm_sow', {}, 'crop:barley');
  if (farm(c).fields.filter((x) => x.crop).length !== capacity(farm(c))) fail('capacity', farm(c).fields.filter((x) => x.crop).length);
  // 돌려짓기: 지친 밭엔 콩, 아니면 지난번과 다르게
  const r = farmer(602030, 'ern', 2); setMonth(r, 4); farm(r).fields[0].soil = 30; farm(r).fields[1].last = 'flax';
  direct(r, 'farm_sow', {}, 'rotate');
  if (farm(r).fields[0].crop !== 'beans' || farm(r).fields[1].crop === 'flax' || !farm(r).fields[1].crop) fail('rotate', JSON.stringify(farm(r).fields));
  // 밭일
  const before = farm(g).fields[0].care; act('farm_work').run(g, R(g)); if (!(farm(g).fields[0].care > before)) fail('work care');
  // 거두기: 밀은 다섯 달 뒤
  clearQ(g); setMonth(g, 3); for (const x of farm(g).fields) x.sown = nowMi(g);
  for (let i = 0; i < 6; i++) tick(g);
  if (farm(g).fields.some((x) => x.crop) || !barnTotal(farm(g)) || !L(g).queue.some((q) => q.kind === 'farm_harvest')) fail('harvest', JSON.stringify(farm(g)), JSON.stringify(L(g).queue.map((q) => q.kind)));
  if (farm(g).fields.some((x) => x.last !== 'wheat' || x.soil >= 70)) fail('soil after wheat');
  const hq = L(g).queue.find((q) => q.kind === 'farm_harvest'); const m0 = g.player.money;
  direct(g, 'farm_harvest', hq, 'half'); if (!(g.player.money > m0) || !barnTotal(farm(g))) fail('harvest half');
  // 소출: 땅심·흉년·씨앗·가뭄과 물길
  const y = farmer(602040); const f = farm(y), x = f.fields[0]; x.crop = 'wheat'; x.care = 3;
  const base = fieldYield(y, f, x);
  x.soil = 30; if (!(fieldYield(y, f, x) < base)) fail('soil yield'); x.soil = 70;
  NS(y).crop[regionOf('ern')] = 0.5; const lean = fieldYield(y, f, x); if (!(lean < base)) fail('lean yield');
  x.seed = 'hardy'; if (!(fieldYield(y, f, x) > lean * 0.95)) fail('hardy seed'); x.seed = 'fine'; NS(y).crop[regionOf('ern')] = 1; if (!(fieldYield(y, f, x) > base)) fail('fine seed'); x.seed = 'local';
  NS(y).active = [{ kind: 'drought', region: regionOf('ern'), name: '가뭄', left: 2 }]; f.water = 0; const dry = fieldYield(y, f, x); f.water = 100; if (!(fieldYield(y, f, x) > dry) || !(dry < base)) fail('drought water'); NS(y).active = [];
  // 재앙이 든 해의 거두기 글
  const dz = farmer(602045, 'ern', 1); const dx = farm(dz).fields[0]; dx.crop = 'barley'; dx.sown = nowMi(dz) - 4; NS(dz).active = [{ id: 1, kind: 'drought', region: regionOf('ern'), sev: 0.5, left: 2 }];
  clearQ(dz); tick(dz); const dq = L(dz).queue.find((q) => q.kind === 'farm_harvest'); if (!dq || bad(dq.why) || !/가뭄/.test(dq.why)) fail('disaster harvest text', dq?.why);
  // 빌린 밭은 삼분의 일을 바친다
  const l = farmer(602050, 'ern', 1); const lf = farm(l).fields[0]; lf.leased = '지주'; lf.crop = 'barley'; lf.sown = nowMi(l) - 4; lf.care = 3; const full0 = fieldYield(l, farm(l), lf);
  clearQ(l); placeAt(l, 'harfen'); tick(l); if (Math.abs(barnTotal(farm(l)) - (full0 - Math.round(full0 / 3))) > 3) fail('lease share', barnTotal(farm(l)), full0);
}

/* 3) 살림, 곳간, 장터 */
{
  const g = farmer(603000);
  direct(g, 'farm_manage', {}, 'hire'); if (farm(g).hands !== 1) fail('hire');
  direct(g, 'farm_manage', {}, 'ox'); if (farm(g).oxen !== 1 || capacity(farm(g)) !== 6) fail('ox', capacity(farm(g)));
  direct(g, 'farm_manage', {}, 'seed:fine'); if (farm(g).seed !== 'fine') fail('seed');
  const w0 = farm(g).water; direct(g, 'farm_manage', {}, 'ditch'); if (!(farm(g).water > w0)) fail('ditch');
  direct(g, 'farm_manage', {}, 'fire'); if (farm(g).hands !== 0) fail('fire');
  // 품삯을 못 주면 떠난다
  farm(g).hands = 2; g.player.money = 0; clearQ(g); tick(g); if (farm(g).hands !== 1) fail('unpaid hand');
  // 장터: 봄이 거둔 뒤보다 비싸다
  const p = farmer(603010); farm(p).barn = { wheat: 20, beans: 5 };
  setMonth(p, 9); const autumn = cropPrice(p, 'wheat'); setMonth(p, 4); const spring = cropPrice(p, 'wheat');
  if (!(spring > autumn)) fail('season price', autumn, spring);
  p.realm.bread = 2; if (!(cropPrice(p, 'wheat') > spring)) fail('bread price');
  p.realm.bread = 1; const m0 = p.player.money; direct(p, 'farm_market', {}, 'sell:wheat'); if (farm(p).barn.wheat || !(p.player.money > m0)) fail('sell wheat');
  direct(p, 'farm_market', {}, 'all'); if (barnTotal(farm(p))) fail('sell all');
  if (can(p, 'farm_market')) fail('market empty barn');
  // 곳간은 줄어든다
  const b = farmer(603020); farm(b).barn = { wheat: 100 }; clearQ(b); tick(b); if (!(farm(b).barn.wheat < 100)) fail('spoil');
  // 내가 없으면 품꾼이 보리를 뿌린다
  const h = farmer(603030, 'ern', 3, { hands: 1 }); placeAt(h, 'harfen'); setMonth(h, 3); tick(h); if (farm(h).fields.filter((x) => x.crop === 'barley').length !== 2) fail('hands sow', JSON.stringify(farm(h).fields));
  // 소작 몫은 9월에
  const t = farmer(603040, 'ern', 2); farm(t).fields[0].tenant = '소작인'; setMonth(t, 9); clearQ(t); tick(t); if (!(farm(t).barn.barley > 0)) fail('tenant share');
}

/* 4) 사건 */
{
  const EVK = { water: ['share', 'break', 'law', 'well'], boundary: ['back', 'elders', 'give'], blight: ['burn', 'ash', 'wait'], hands: ['raise', 'feast', 'refuse'], tenant: ['forgive', 'later', 'evict'], buyer: ['sell', 'refuse', 'haggle'], thief: ['track', 'lock', 'leave'], levy: ['give', 'plead', 'hide'] };
  let n = 0;
  for (const [ev, keys] of Object.entries(EVK)) for (const k of keys) {
    const g = farmer(604000 + n++ * 7, 'ern', 4, { hands: 3, barn: { wheat: 30, barley: 12 } });
    farm(g).fields[0].crop = 'wheat'; farm(g).fields[0].sown = nowMi(g); farm(g).fields[1].tenant = '아이 다섯 둔 요르크';
    const r = direct(g, 'farm_event', { ev }, k);
    if (r.skipped || r.missing) fail('event', ev, k, JSON.stringify(r));
  }
  const lv = farmer(604500, 'ern', 3, { barn: { wheat: 30 } }); direct(lv, 'farm_event', { ev: 'levy' }, 'give'); if (farm(lv).barn.wheat !== 20) fail('levy give', farm(lv).barn.wheat);
  const by = farmer(604510, 'ern', 3); const m = by.player.money; direct(by, 'farm_event', { ev: 'buyer' }, 'sell'); if (farm(by) || !(by.player.money > m)) fail('sell farm');
  const ev = farmer(604520, 'ern', 3); farm(ev).fields[0].tenant = '요르크'; direct(ev, 'farm_event', { ev: 'tenant' }, 'evict'); if (farm(ev).fields[0].tenant) fail('evict');
  const p = fresh(604600); for (const e of ['water', 'blight', 'hands', 'thief']) if (!direct(p, 'farm_event', { ev: e }, 'share').skipped) fail('event without farm', e);
  const q = farmer(604700, 'ern', 4, { hands: 3 }); const got = new Set();
  for (let i = 0; i < 80; i++) { clearQ(q); FM(q).eventAt = -99; farm(q).barn = { wheat: 30 }; farm(q).hands = 3; q.player.money = 3000; if (!farm(q).fields[1].tenant) farm(q).fields[1].tenant = '요르크'; tick(q); for (const x of L(q).queue) if (x.kind === 'farm_event') got.add(x.ev); }
  if (got.size < 5) fail('monthly events', [...got]);
}

/* 5) 대 잇기, 옛 저장, 저절로 */
{
  const heirFns = HOOKS.heir.filter((f) => /gens \+= 1/.test(String(f)) && /대째 땅/.test(String(f)));
  if (heirFns.length !== 1) fail('heir hook', heirFns.length);
  const h = farmer(605000); farm(h).fields[0].care = 3; for (const f of heirFns) f(h);
  if (farm(h).gens !== 2 || farm(h).fields[0].care !== 0) fail('heir');
  const x = adult(605100);
  delete x.farm; runHooks('migrate', x);
  if (!x.farm || x.farm.farm !== null) fail('migrate');
  x.farm = { farm: { place: 'ern', name: 3, fields: [3, { crop: 'gone', soil: 'x', tenant: 4, seed: 'gone' }, { crop: 'wheat', tenant: '소작인' }], hands: 30, barn: { wheat: 'x', gone: 3, beans: 4.4 } }, neighbor: { name: 3 } };
  runHooks('migrate', x);
  const f = x.farm.farm;
  if (!f || f.fields.length !== 2 || f.fields[0].crop !== null || f.fields[0].soil !== 60 || f.fields[0].tenant !== null || f.fields[0].seed !== 'local' || f.fields[1].crop !== null || f.hands !== 8 || JSON.stringify(f.barn) !== '{"beans":4}' || x.farm.neighbor) fail('migrate partial', JSON.stringify(x.farm));
  x.farm = { farm: { place: 'serenia', fields: [{}] } }; runHooks('migrate', x); if (x.farm.farm) fail('migrate non-farmland');
  if (JSON.stringify(farmStatus(x)).match(/NaN|undefined/)) fail('status');
  // 저절로 살아 보기 (짧게)
  let reaped = 0, sold = 0;
  for (let run = 0; run < 3; run++) {
    const a = fresh(605200 + run, ['ern', 'verden', 'gruental'][run]);
    for (let mth = 0; mth < 48 && !a.over; mth++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.8) ? ['farm_sow', 'farm_land', 'farm_market', 'farm_work', 'farm_manage'].sort(() => rngOf(a).float(-1, 1)) : [rngOf(a).pick(acts.filter((x2) => !x2.id.startsWith('travel') && x2.id !== 'house_move')).id];
      month(a, want, (k2, labels) => (k2 === 'farm_land' ? labels.findIndex((l) => (farm(a)?.fields.length ?? 0) < 4 ? /산다/.test(l) : /덮는다/.test(l)) : k2 === 'farm_sow' ? labels.findIndex((l) => /돌려짓는다/.test(l)) : k2 === 'farm_manage' ? labels.findIndex((l) => (farm(a)?.hands ?? 0) < 2 ? /들인다/.test(l) : /덮는다/.test(l)) : -1));
      const line = farmLine(a); if (bad(line) || josa(line)) fail('line', line);
    }
    reaped += FM(a).reaped; sold += FM(a).sold;
  }
  console.log(`저절로 4년 3판: 거둔 자루 ${reaped}, 판 자루 ${sold}`);
  if (!reaped) fail('autoplay never reaped');
}

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('farm_')))));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
