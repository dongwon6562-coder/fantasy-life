import '../src/content.js';
// 뒤 시대의 살림과 일(src/era/later.js, src/cityday/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/citytest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { cityInfo, cityLine, cityWorld, cityState as CS, MILL_TOWNS } from '../src/cityday/index.js';
import { LATE, SMALL, lateJobIds, fadeOf, fadeCut, syncLateJobs, syncEraJobs, GOODS, shopList, priceOf } from '../src/era/index.js';
import { WORK, takeJob } from '../src/jobs.js';
import { makePerson, kill } from '../src/npc.js';
import { run as hook } from '../src/hooks.js';
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
      const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 8701 + k * 977 });
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
  const s = JSON.stringify(cityInfo(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 200));
  const l = cityLine(g);
  if (l !== null && l !== undefined && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 90) samples.push(`(${id}) ${out}`); return out; };
const invent = (g, ...ids) => { g.history.inventions ??= []; for (const id of ids) if (!g.history.inventions.includes(id)) g.history.inventions.push(id); syncLateJobs(g); syncEraJobs(g); return g; };
const ALL_OLD = ['firestone', 'streetlamp', 'warmstone', 'manamill', 'press', 'signal', 'erngrind', 'plow', 'forge', 'healstone', 'ironcart', 'railroad'];
const ALL_LATE = [...Object.values(LATE), ...Object.values(SMALL)];
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); } };

// 1. 발명 전에는 아무것도 없다
{
  const g = fresh(1, 'harfen'); g.history.inventions = [...ALL_OLD]; syncLateJobs(g);
  for (const id of lateJobIds) if (WORK[id].places.length) fail('late job open before invention', id);
  if (can(g, 'city_childwork')) fail('childwork before factory');
  if (cityLine(g) !== null) fail('city line before factory', cityLine(g));
  if (shopList(g).some((id) => GOODS[id].need && ALL_LATE.includes(GOODS[id].need))) fail('late goods before invention');
  checkInfo(g, 'pre');
  // 마부는 처음부터 있다
  if (!WORK.coachman.places.includes('harfen')) fail('coachman missing');
}

// 2. 발명마다 물건과 일이 열린다
{
  const g = invent(fresh(2, 'leocast'), ...ALL_OLD, ...ALL_LATE);
  for (const id of lateJobIds) if (!WORK[id].places.length) fail('late job closed after invention', id);
  const want = { leocast: ['notebook', 'window', 'spectacles', 'timepiece', 'compass', 'spyglass', 'gazette', 'millcloth', 'tonic', 'tap', 'skyride', 'pistol', 'bankbook', 'skyticket', 'orb'], portel: ['steamticket'] };
  for (const [pl, ids] of Object.entries(want)) { const c = clone(g); placeAt(c, pl); const list = shopList(c); for (const id of ids) if (!list.includes(id)) fail('good not in shop', pl, id); }
  // 산 날의 글
  for (const id of ['gazette', 'millcloth', 'tonic', 'tap', 'skyride', 'pistol', 'bankbook', 'skyticket', 'orb']) {
    const c = clone(g); c.player.money = 500; c.era.lastShop = -99;
    const r = direct(c, 'era_shop', {}, id);
    if (r.missing) continue; // 좌판은 다섯 가지만 보인다
    if ((c.era.goods[id] ?? 0) < 1) fail('bought', id);
  }
  for (const id of Object.keys(GOODS)) if (priceOf(g, id) < 1 || !Number.isFinite(priceOf(g, id))) fail('price', id);
  // 물건의 효과: 약은 병을 줄이고, 권총은 무기, 통장은 이자
  const e = clone(g); e.era.goods = { tonic: 1, pistol: 1, bankbook: 1, tap: 1 }; e.player.injuries = [{ name: '열병', months: 5 }]; e.player.money = 100; e.date.month = 11;
  adv(e, 1);
  if (e.player.injuries[0]?.months > 4 - 1 + 1 && e.era.goods.tonic) fail('tonic', JSON.stringify(e.player.injuries), e.era.goods.tonic);
  if ((L(e).gear.weapon ?? 0) < 11) fail('pistol gear');
  if (e.player.money <= 100 - 20) fail('bank interest', e.player.money);
  // 일하기: 모든 새 일 한 번씩
  for (const id of lateJobIds) {
    const c = clone(g); const pl = WORK[id].places[0]; placeAt(c, pl);
    c.player.skills.letters = 60; c.player.skills.magic = 40; c.player.skills.smithing = 40; c.player.skills.herbs = 40;
    takeJob(c, id); const m0 = c.player.money; runAct(c, 'work');
    if (c.player.money <= m0) fail('late job paid nothing', id);
  }
  checkInfo(g, 'late');
}

// 3. 사라지는 옛 일: 마부·서기·선원
{
  const g = fresh(3, 'harfen'); g.history.inventions = ['firestone']; syncLateJobs(g);
  takeJob(g, 'coachman');
  const base = clone(g); let a = 0; for (let i = 0; i < 6; i++) { const m0 = base.player.money; runAct(base, 'work'); a += base.player.money - m0; }
  invent(g, 'ironcart', 'railroad', LATE.factory);
  if (fadeOf(g, 'coachman') !== 3 || fadeCut(g, 'coachman') <= 0) fail('fade count', fadeOf(g, 'coachman'));
  const cut = clone(g); cut.rngState.s = base.rngState.s; let b = 0; const cut0 = clone(cut);
  for (let i = 0; i < 6; i++) { const m0 = cut.player.money; runAct(cut, 'work'); b += cut.player.money - m0; }
  if (!(b < a)) fail('fade wage', a, b);
  adv(g, 1);
  if (!L(g).queue.some((q) => q.kind === 'city_fade')) fail('fade scene not queued');
  for (const k of ['hold', 'quit', 'new:factory_hand']) { const r = direct(clone(g), 'city_fade', { job: 'coachman' }, k); if (r.missing || r.skipped) fail('fade', k, JSON.stringify(r)); }
  const nw = clone(g); direct(nw, 'city_fade', { job: 'coachman' }, 'new:factory_hand'); if (L(nw).job?.id !== 'factory_hand') fail('retrain');
  adv(g, 1); if (L(g).queue.filter((q) => q.kind === 'city_fade').length > 1) fail('fade asked twice');
  const sl = invent(fresh(4, 'portel'), LATE.steamship); takeJob(sl, 'sailor'); runAct(sl, 'work');
  const cl = invent(fresh(5, 'leocast'), 'press', LATE.newspaper); cl.player.skills.letters = 50; takeJob(cl, 'clerk'); runAct(cl, 'work');
  if (cityLine({ ...cl, date: { ...cl.date, month: 3, year: 600 } }) === null && cityLine({ ...cl, date: { ...cl.date, month: 6, year: 600 } }) === null) fail('fade line');
}

// 4. 공장 거리: 아이 일꾼, 공장 일의 장면들
{
  const g = invent(fresh(6, 'harfen'), ...ALL_OLD, LATE.factory);
  const kid = clone(g); me(kid).ageMonths = 11 * 12; L(kid).home = 'family'; kid.player.familyMoney = 10;
  if (!can(kid, 'city_childwork')) fail('childwork hidden');
  const f0 = kid.player.familyMoney; runAct(kid, 'city_childwork'); if (kid.player.familyMoney <= f0) fail('childwork pay');
  const rich = clone(kid); rich.player.familyMoney = 500; rich.player.money = 50; if (can(rich, 'city_childwork')) fail('childwork for rich kid');
  const vil = clone(kid); placeAt(vil, 'ern'); L(vil).home = 'family'; if (can(vil, 'city_childwork')) fail('childwork in village');
  takeJob(g, 'factory_hand');
  for (let i = 0; i < 8; i++) runAct(g, 'work');
  const KS = { accident: ['stop', 'cut', 'call', 'no'], kids: ['block', 'bread', 'no'], foreman: ['help', 'protest', 'no'] };
  for (const [kind, ks] of Object.entries(KS)) for (const k of ks) for (let i = 0; i < 3; i++) { const c = clone(g); c.rngState.s = 5 + i * 131; if (i === 2) c.player.money = 0; const r = direct(c, 'city_mill', { kind }, k); if (r.missing || r.skipped) fail('mill', kind, k, JSON.stringify(r)); }
  // 이름이 지워지면 공장 일을 잃는다
  const bl = clone(g); CS(bl).me.black.harfen = 99999; runAct(bl, 'work'); if (L(bl).job) fail('blacklist keeps job');
  checkInfo(g, 'factory');
  globalThis.MILL = g;
}

// 5. 파업: 플레이어 없이도 일어나고 끝난다, 내가 끼면
{
  const g = clone(globalThis.MILL);
  for (const pl of MILL_TOWNS) Object.assign(CS(g).towns[pl] ??= {}, { crowd: 80, wage: 1, unrest: 95, strike: null, last: 0 });
  let strikes = 0, wins = 0;
  for (let i = 0; i < 12 * 30; i++) { const before = Object.values(CS(g).towns).filter((t) => t.strike).length; adv(g, 1); const after = Object.values(CS(g).towns).filter((t) => t.strike).length; if (after > before) strikes++; }
  wins = Object.values(CS(g).towns).filter((t) => t.wage > 1).length;
  if (strikes < 3) fail('few strikes', strikes);
  if (verbose) console.log('strikes 30y', strikes, 'towns with raised wage', wins, CS(g).log.slice(-4).map((x) => x.text));
  const s = clone(globalThis.MILL); placeAt(s, 'harfen'); L(s).job = { id: 'factory_hand', place: 'harfen', months: 2, lastRank: 0 };
  CS(s).towns.harfen = { crowd: 70, wage: 1, unrest: 80, strike: { since: 0, stage: 0, backers: 0 }, last: 0 };
  for (const k of ['join', 'lead', 'scab', 'away']) for (let i = 0; i < 3; i++) { const c = clone(s); c.rngState.s = 3 + i * 7; const r = direct(c, 'city_strike', {}, k); if (r.missing || r.skipped) fail('strike', k, JSON.stringify(r)); }
  const sc = clone(s); direct(sc, 'city_strike', {}, 'scab'); const m0 = sc.player.money; runAct(sc, 'work'); if (sc.player.money <= m0) fail('scab cannot work');
  const st = clone(s); const m1 = st.player.money; runAct(st, 'work'); if (st.player.money !== m1) fail('worked during strike');
  if (!cityLine(s)?.includes('팔짱')) fail('strike line');
  // 앞장선 파업이 깨지면 이름이 지워진다
  let black = 0, won = 0;
  for (let i = 0; i < 20; i++) { const c = clone(s); c.rngState.s = 100 + i * 17; direct(c, 'city_strike', {}, 'lead'); for (let k = 0; k < 4; k++) adv(c, 1); if ((CS(c).me.black.harfen ?? 0) > 0) black++; if (CS(c).towns.harfen.wage > 1) won++; }
  if (!black || !won) fail('led strike outcomes', black, won);
}

// 6. 셋방 세, 아이를 공장에, 시골이 빈다
{
  const g = clone(globalThis.MILL); L(g).home = 'rent'; CS(g).towns.harfen.crowd = 70;
  for (const k of ['pay', 'haggle', 'leave']) for (let i = 0; i < 3; i++) { const c = clone(g); c.rngState.s = 9 + i * 41; const r = direct(c, 'city_landlord', {}, k); if (r.missing || r.skipped) fail('landlord', k); }
  const p = clone(g); direct(p, 'city_landlord', {}, 'pay'); p.player.money = 1; adv(p, 2); if (p.player.money < 0) fail('rent negative');
  const k = clone(g); const kid = makePerson(makeRng({ s: 3 }), { sex: 'm', ageMonths: 10 * 12 }); kid.place = 'harfen'; k.people.push(kid); me(k).childIds = [...(me(k).childIds ?? []), kid.id];
  for (const key of ['send', 'home', 'school']) { const r = direct(clone(k), 'city_sendkid', { kid: kid.id }, key); if (r.missing || r.skipped) fail('sendkid', key); }
  const sent = clone(k); direct(sent, 'city_sendkid', { kid: kid.id }, 'send'); sent.player.familyMoney = 200; // 집안 돈이 거의 없으면 달 씀씀이가 품삯을 그대로 먹어 버린다
  // 34단계(헤드): 사건이 늘어 집안 돈이 다른 데로도 새니, 아이를 안 보낸 같은 판과 견주어 품삯만 잰다
  const ctl = clone(sent); CS(ctl).me.kids = [];
  adv(sent, 3); adv(ctl, 3);
  if (sent.player.familyMoney < ctl.player.familyMoney + 4) fail('kid wages', sent.player.familyMoney - ctl.player.familyMoney);
  const v = clone(globalThis.MILL); placeAt(v, 'ern'); let moved = 0;
  // 처음 마을에 있던 사람 가운데 떠난 사람을 센다 (새로 태어난 아이로 머릿수가 메워져도 떠난 건 떠난 것)
  const start = v.people.filter((x) => x.alive && (x.place ?? 'ern') === 'ern').map((x) => x.id);
  // 48단계 도우미3: 판에 따라 마을에 떠날 만한 나이(16~40)의 직조공·날품팔이가 하나뿐이라 여섯 해 동안 아무도 안 떠났다. 젊은 농부 셋을 직조공으로 둔다
  v.people.filter((x) => x.alive && !x.isPlayer && (x.place ?? 'ern') === 'ern' && x.job === 'farmer' && x.ageMonths >= 18 * 12 && x.ageMonths < 35 * 12).slice(0, 3).forEach((x) => { x.job = 'weaver'; });
  const v0 = start.length; adv(v, 12 * 6);
  const villagers = () => start.filter((id) => { const x = v.people.find((y) => y.id === id); return x && (!x.alive || (x.place ?? 'ern') === 'ern'); }).length;
  moved = v0 - villagers();
  if (moved < 1) fail('nobody left the village', v0, villagers());
  if (verbose) console.log('village', v0, '→', villagers(), 'left', CS(v).left);
  for (const pl of ['harfen', 'leocast', 'eisen', 'ern', 'portel']) for (let m = 1; m <= 12; m++) { const c = clone(globalThis.MILL); placeAt(c, pl); c.date.month = m; checkInfo(c, `${pl} ${m}`); }
}

// 7. 옛 저장, 대 잇기, 몇 해 살아 보기
{
  const old = clone(globalThis.MILL); delete old.city.me.faded; delete old.city.left;
  runHooks('migrate', old); if (!old.city.me.faded || old.city.left !== 0) fail('migrate');
  const none = clone(globalThis.MILL); delete none.city; runHooks('migrate', none); if (!none.city) fail('migrate none');
  const h = clone(globalThis.MILL); CS(h).me.kids = [1]; runHooks('heir', h, makeRng({ s: 1 }), h.player); if (CS(h).me.kids.length) fail('heir');
  const g = invent(fresh(40, 'harfen'), ...ALL_OLD, ...ALL_LATE); g.player.money = 40; L(g).home = 'rent'; takeJob(g, 'factory_hand');
  for (let i = 0; i < 36 && !g.over; i++) {
    placeAt(g, 'harfen'); L(g).home = 'rent';
    month(g, ['work', 'era_shop']);
    if (g.player.money < 0) fail('negative money in play', g.player.money);
    checkInfo(g, `play ${i}`);
  }
  if (verbose) console.log('play', { money: g.player.money, job: L(g).job?.id, log: CS(g).log.map((x) => x.text).join(' / ') });
}

if (verbose) for (const s of samples) console.log(s);
console.log(`citytest: ${problems ? `${problems} problems` : 'ok'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (problems) process.exit(1);
