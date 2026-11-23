import '../src/content.js';
// 길 위의 일(src/carrier/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/carriertest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { takeJob, WORK } from '../src/jobs.js';
import { makeRng } from '../src/rng.js';
import { addAnimal } from '../src/beasts/core.js';
import { syncEraJobs } from '../src/era/index.js';
import { carrierInfo as info0, carrierLine, carrierState as C, offersFor, kindsFor, payFor, roadKinds, roadChance, housesYear } from '../src/carrier/index.js';
import { routeKey, fadeAt, railed, HOUSE_IDS, STATION_COST } from '../src/carrier/core.js';

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
function fresh(seed, pl, job = null, sk = 0) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = 200;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  L(g).job = null;
  C(g).knack = sk;
  if (job) takeJob(g, job);
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
  const l = carrierLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 100) samples.push(`(${id}) ${out}`); return out; };
const invent = (g, ...ids) => { g.history.inventions ??= []; for (const id of ids) if (!g.history.inventions.includes(id)) g.history.inventions.push(id); syncEraJobs(g); return g; };
const horse = (g, n = 1) => { for (let i = 0; i < n; i++) addAnimal(g, 'horse', { ageYears: 6, trained: 100, bond: 50 }); return g; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); } };
// 짐 하나를 맡겨 길에 올린다
function take(g, offer) {
  const r = direct(g, 'carrier_offer', { offers: [offer] }, 'o0');
  if (r.missing || r.skipped) { fail('offer', JSON.stringify(offer), JSON.stringify(r)); return null; }
  return C(g).haul;
}
// 남은 길을 한 달로 줄이고 한 달을 넘겨 닿게 한다 (길 위 장면은 닿으면 버려진다)
function arrive(g) { L(g).travel.left = 1; month(g, ['on_road']); }

// 1. 처음 판: 운송 상단은 길 하나씩, 아무나 짐을 맡지는 않는다
{
  const g = fresh(1, 'harfen');
  for (const id of HOUSE_IDS) if (C(g).houses[id].routes.length < 1 && !C(g).houses[id].gone) fail('house start routes', id);
  if (can(g, 'carrier_haul')) fail('haul for nobody');
  if (can(g, 'carrier_station') || can(g, 'carrier_cart')) fail('station/cart for nobody');
  checkInfo(g, 'start');
}

// 2. 짐꾼: 등짐을 지고 이웃 고장까지, 닿으면 삯
{
  const g = fresh(2, 'hammer', 'porter');
  const m0 = g.player.money; runAct(g, 'work'); if (g.player.money <= m0) fail('porter wage');
  if (!can(g, 'carrier_haul')) fail('porter cannot haul');
  runAct(g, 'carrier_haul');
  if (!L(g).queue.some((q) => q.kind === 'carrier_offer')) fail('offer not queued');
  const offers = offersFor(g, R(g));
  if (!offers.length || offers.some((o) => o.kind !== 'back')) fail('porter offers', JSON.stringify(offers));
  const o = offers[0], h = take(g, o);
  if (!h || L(g).travel?.to !== o.to) fail('haul travel');
  if (can(g, 'carrier_haul')) fail('haul twice');
  checkInfo(g, 'on road');
  if (carrierLine(g) === null) fail('road line');
  const m1 = C(g).earned; arrive(g);
  if (C(g).haul || C(g).done !== 1 || C(g).earned < m1 + o.pay) fail('delivered', C(g).done, C(g).earned - m1, o.pay);
  if (!Object.values(C(g).routes).includes(1)) fail('route count');
  if (L(g).job?.id !== 'porter') fail('job lost on haul');
  // 늦으면 깎인다
  const late = fresh(3, 'hammer', 'porter'); const lo = offersFor(late, R(late))[0]; take(late, lo); C(late).haul.due = 0; const m2 = C(late).earned; arrive(late);
  if (C(late).earned - m2 >= lo.pay || C(late).done !== 1) fail('late not cut', C(late).earned - m2, lo.pay);
}

// 3. 수레와 말: 큰 짐, 손님, 편지, 길 안내
{
  const g = fresh(4, 'harfen', 'hauler');
  if (kindsFor(g).join() !== 'back') fail('kinds on foot', kindsFor(g));
  C(g).done = 2; g.player.money = 300;
  if (!can(g, 'carrier_cart')) fail('cart hidden');
  const c1 = clone(g); runAct(c1, 'carrier_cart'); const r1 = direct(c1, 'carrier_cart', {}, 'handcart'); if (r1.missing || C(c1).cart?.kind !== 'handcart') fail('handcart');
  if (!direct(clone(g), 'carrier_cart', {}, 'wagon').missing) fail('wagon without horse');
  horse(g); direct(g, 'carrier_cart', {}, 'wagon');
  if (C(g).cart?.kind !== 'wagon' || !kindsFor(g).includes('freight') || !kindsFor(g).includes('mail')) fail('wagon kinds', kindsFor(g));
  horse(g); g.player.money = 300; direct(g, 'carrier_cart', {}, 'coach');
  if (!kindsFor(g).includes('people')) fail('coach people', kindsFor(g));
  const gd = fresh(5, 'graubel', 'guide', 40); if (!kindsFor(gd).includes('guide')) fail('guide kind');
  // 큰 수레일수록 삯이 크다
  const w = clone(g); C(w).cart = { kind: 'wagon' }; const hc = clone(g); C(hc).cart = { kind: 'handcart' };
  if (!(payFor(w, 'freight', 'verden') > payFor(hc, 'freight', 'verden'))) fail('cart pay');
  globalThis.COACH = g;
}

// 4. 길 위의 위험
{
  const g = clone(globalThis.COACH); placeAt(g, 'harfen');
  take(g, { kind: 'people', to: 'verden', what: '순례자들', pay: 30 });
  for (const m of [1, 7]) { const c = clone(g); c.date.month = m; const ks = roadKinds(c); if (!ks.includes('bandit') || !ks.includes('sick')) fail('road kinds', m, ks); }
  if (!(roadChance(g) > 0 && roadChance(g) < 0.5)) fail('road chance', roadChance(g));
  const KS = { bandit: ['fight', 'pay', 'flee', 'trail'], weather: ['push', 'wait', 'detour'], bridge: ['ford', 'ferry', 'around'], lame: ['rest', 'push', 'buy'], sick: ['heal', 'push', 'leave'] };
  for (const [kind, ks] of Object.entries(KS)) for (const k of ks) for (let i = 0; i < 3; i++) {
    const c = clone(g); c.rngState.s = 7 + i * 113; C(c).knack = i === 1 ? 60 : 10; if (i === 2) c.player.money = 0;
    const left = L(c).travel.left;
    const r = direct(c, 'carrier_road', { kind, snow: i === 0, roll: 10 }, k);
    if (r.missing) { if (!(k === 'trail' && i !== 1) && !(['ferry', 'buy'].includes(k) && i === 2)) fail('road', kind, k, JSON.stringify(r)); continue; }
    if (['wait', 'detour', 'around', 'trail', 'rest'].includes(k) && L(c).travel.left !== left + 1) fail('no delay', kind, k);
    if (['pay', 'flee'].includes(k) && C(c).haul.load >= 1) fail('no loss', kind, k);
  }
  // 모자란 짐을 넘길 때
  const s = clone(g); C(s).haul.load = 0.6; placeAt(s, 'verden');
  for (const k of ['tell', 'make', 'lie']) for (let i = 0; i < 3; i++) { const c = clone(s); c.rngState.s = 50 + i * 17; const r = direct(c, 'carrier_short', {}, k); if (r.missing || r.skipped) fail('short', k); if (C(c).haul) fail('haul left after short', k); }
  const sh = clone(s); L(sh).queue = []; const res = []; runHooks('afterActions', sh, R(sh), res);
  if (!L(sh).queue.some((q) => q.kind === 'carrier_short')) fail('short not queued');
}

// 5. 역참
{
  const g = fresh(6, 'verden', 'hauler', 35); g.player.money = 300;
  if (!can(g, 'carrier_station')) fail('station hidden');
  const no = fresh(7, 'serenia', 'hauler', 35); no.player.money = 300; if (can(no, 'carrier_station')) fail('station off road');
  runAct(g, 'carrier_station');
  if (!C(g).station || g.player.money !== 300 - STATION_COST) fail('station open');
  const m0 = g.player.money; for (let i = 0; i < 6; i++) { placeAt(g, 'verden'); if (g.occ?.places) delete g.occ.places.verden; adv(g, 1); L(g).queue = []; } // 점령세가 끼면 역참 벌이를 잴 수 없다
  if (g.player.money <= m0) fail('station income', m0, g.player.money);
  const KS = { courier: ['give', 'pay', 'lie'], thief: ['guard', 'scold', 'hire'], buyout: ['sell', 'refuse'], wedding: ['host', 'gouge'] };
  for (const [kind, ks] of Object.entries(KS)) for (const k of ks) for (let i = 0; i < 2; i++) { const c = clone(g); c.rngState.s = 3 + i * 91; const r = direct(c, 'carrier_inn', { kind, house: 'verdencart', price: 130 }, k); if (r.missing || r.skipped) fail('inn', kind, k); if (k === 'sell' && C(c).station) fail('sold station kept'); }
  checkInfo(g, 'station');
  globalThis.STATION = g;
}

// 6. 운송 상단과 겨루기
{
  const g = clone(globalThis.COACH); placeAt(g, 'harfen');
  const key = C(g).houses.greywheel.routes[0];
  const to = key.split('|').find((x) => x !== 'harfen');
  const base = payFor(g, 'freight', to); const other = clone(g); C(other).houses.greywheel.routes = []; if (!(payFor(other, 'freight', to) > base)) fail('house undercut');
  const hired = clone(g); C(hired).hired = 'greywheel'; if (!(payFor(hired, 'freight', to) > payFor(other, 'freight', to))) fail('hired pay');
  C(g).routes[key] = 5; L(g).queue = []; adv(g, 1);
  if (!L(g).queue.some((q) => q.kind === 'carrier_rival')) fail('rival not queued');
  for (const k of ['cut', 'join', 'share', 'sabotage']) for (let i = 0; i < 3; i++) { const c = clone(g); c.rngState.s = 11 + i * 29; const r = direct(c, 'carrier_rival', { house: 'greywheel', key }, k); if (r.missing || r.skipped) fail('rival', k); if (k === 'share' && C(c).houses.greywheel.routes.includes(key)) fail('share kept route'); }
  // 플레이어 없이: 상단은 길을 넓힌다, 쇠수레 길이 오면 무너진다
  const w = fresh(8, 'ern'); w.history.inventions = []; const rail = invent(clone(w), 'ironcart', 'railroad');
  for (let y = 0; y < 30; y++) { housesYear(w, makeRng({ s: y + 1 })); housesYear(rail, makeRng({ s: y + 1 })); }
  const routes = (x) => HOUSE_IDS.reduce((a, id) => a + C(x).houses[id].routes.length, 0), power = (x) => HOUSE_IDS.reduce((a, id) => a + C(x).houses[id].power, 0);
  if (routes(w) <= 3) fail('houses never grew', routes(w));
  if (!(power(rail) < power(w))) fail('railroad did not hurt houses', power(rail), power(w));
}

// 7. 쇠수레 길이 오면 일이 준다
{
  const g = fresh(9, 'harfen', 'hauler'); g.history.inventions = []; syncEraJobs(g);
  if (fadeAt(g) !== 0) fail('fade before rail');
  const a = clone(g), b = invent(clone(g), 'ironcart', 'railroad'); b.rngState.s = a.rngState.s;
  let pa = 0, pb = 0;
  for (let i = 0; i < 6; i++) { const ma = a.player.money, mb = b.player.money; runAct(a, 'work'); runAct(b, 'work'); pa += a.player.money - ma; pb += b.player.money - mb; a.player.fatigue = b.player.fatigue = 0; }
  if (!(pb < pa)) fail('hauler wage after rail', pa, pb);
  if (!railed(b, 'harfen', 'leocast')) fail('railed');
  const off = clone(b); horse(off); C(off).cart = { kind: 'wagon' };
  for (let i = 0; i < 20; i++) if (offersFor(off, makeRng({ s: i })).some((o) => o.to === 'leocast' && ['freight', 'people'].includes(o.kind))) { fail('freight on railed road'); break; }
  L(b).queue = []; adv(b, 1);
  if (!L(b).queue.some((q) => q.kind === 'carrier_fade')) fail('fade not queued');
  for (const k of ['iron', 'hold']) { const c = clone(b); const r = direct(c, 'carrier_fade', {}, k); if (r.missing || r.skipped) fail('fade', k, JSON.stringify(r)); if (k === 'iron' && L(c).job?.id !== 'carter') fail('carter'); }
  const q = horse(clone(b)); const r = direct(q, 'carrier_fade', {}, 'quit'); if (r.missing || q.beasts.animals.some((x) => x.kind === 'horse')) fail('quit horses');
  const st = clone(globalThis.STATION); invent(st, 'ironcart', 'railroad'); placeAt(st, 'verden'); const ri = direct(st, 'carrier_fade', {}, 'inn'); if (ri.missing || !C(st).station.inn) fail('inn conversion');
  L(b).queue = []; adv(b, 1); if (L(b).queue.some((q2) => q2.kind === 'carrier_fade')) fail('fade asked twice');
}

// 8. 옛 저장, 대 잇기, 몇 해 살아 보기
{
  const old = clone(globalThis.STATION); delete old.carrier.fadeSeen; delete old.carrier.houses.northpost;
  runHooks('migrate', old); if (!Array.isArray(old.carrier.fadeSeen) || !old.carrier.houses.northpost) fail('migrate');
  const none = clone(globalThis.STATION); delete none.carrier; runHooks('migrate', none); if (!none.carrier) fail('migrate none');
  const h = clone(globalThis.STATION); C(h).haul = { kind: 'back', what: '소금 자루', to: 'harfen', from: 'verden', pay: 5, load: 1, due: 0, hits: 0 };
  runHooks('heir', h, makeRng({ s: 1 }), h.player);
  if (C(h).haul || !C(h).station || C(h).knack > 10) fail('heir');
  const g = horse(fresh(40, 'harfen', 'hauler', 20)); C(g).cart = { kind: 'wagon' }; g.player.money = 80;
  for (let i = 0; i < 48 && !g.over; i++) {
    if (!L(g).travel && !C(g).haul && L(g).place !== 'harfen') placeAt(g, 'harfen');
    month(g, ['carrier_haul', 'on_road', 'work']);
    if (g.player.money < 0) fail('negative money in play', g.player.money);
    checkInfo(g, `play ${i}`);
  }
  if (C(g).done < 3) fail('few hauls in play', C(g).done);
  if (verbose) console.log('play', { money: g.player.money, done: C(g).done, earned: C(g).earned, lost: C(g).lost, log: C(g).log.map((x) => x.text).join(' / ') });
}

if (verbose) for (const s of samples) console.log(s);
console.log(`carriertest: ${problems ? `${problems} problems` : 'ok'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (problems) process.exit(1);
