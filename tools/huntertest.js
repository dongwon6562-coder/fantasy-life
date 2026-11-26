import '../src/content.js';
// 사냥꾼과 덫꾼(src/hunter/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/huntertest.js [-v]
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
import { regionOf } from '../src/nature/state.js';
import { hunterInfo as info0, hunterLine, hunterState as H, huntOnce, gameHere, furPrice, stockMonth } from '../src/hunter/index.js';
import { GAME, GROUNDS, licensed, bannedAt, furCount, lodgeHere, mi, LODGE_COST } from '../src/hunter/core.js';

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
  g.player.skills.hunting = sk; g.hunter = undefined; H(g);
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
  const l = hunterLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 100) samples.push(`(${id}) ${out}`); return out; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); } };
const setMonth = (g, m) => { g.date.month = m; return g; };
const dog = (g) => { addAnimal(g, 'dog', { ageYears: 3, trained: 100, bond: 70 }); return g; };
const many = (n, f) => { let k = 0; for (let i = 0; i < n; i++) if (f(i)) k++; return k; };

// 1. 아무나 사냥을 나서지는 않는다. 사냥꾼, 솜씨, 사냥개가 있으면 나선다
{
  const g = fresh(1, 'ern');
  if (can(g, 'hunter_go') || can(g, 'hunter_poach') || can(g, 'hunter_lodge') || can(g, 'hunter_sell')) fail('hunt actions for nobody');
  checkInfo(g, 'start');
  if (!can(fresh(2, 'ern', 'hunter'), 'hunter_go')) fail('hunter cannot hunt');
  if (!can(dog(fresh(3, 'ern')), 'hunter_go')) fail('dog owner cannot hunt');
  if (can(fresh(4, 'klein', 'hunter', 40), 'hunter_go')) fail('hunt in town without ground');
  if (can(fresh(5, 'leocast', 'hunter', 40), 'hunter_go')) fail('royal forest without license');
}

// 2. 철마다 다른 짐승: 겨울 산엔 담비, 여름엔 없다. 금렵 숲 짐승은 허가가 있어야
{
  const w = setMonth(fresh(6, 'graubel', 'hunter', 40), 1);
  if (!gameHere(w).includes('marten') || gameHere(w).includes('deer')) fail('winter game', gameHere(w));
  const s = setMonth(fresh(7, 'graubel', 'hunter', 40), 7);
  if (gameHere(s).includes('marten') || gameHere(s).includes('fox')) fail('summer game', gameHere(s));
  const v = setMonth(fresh(8, 'verden', 'hunter', 40), 10);
  if (gameHere(v).includes('deer') || !gameHere(v, true).includes('deer')) fail('lord forest game', gameHere(v), gameHere(v, true));
  if (gameHere(setMonth(fresh(9, 'ern', 'hunter', 40), 1)).includes('beaver')) fail('winter beaver');
  // 사냥을 나가면 모피와 고기가 쌓이고 사냥터 짐승이 준다
  let furs = 0, meat = 0;
  for (let i = 0; i < 12; i++) { const g = setMonth(fresh(10 + i, 'graubel', 'hunter', 50), 12); runAct(g, 'hunter_go'); furs += furCount(g); meat += H(g).meat; if (H(g).hunts !== 1) fail('hunt count'); }
  if (furs < 4) fail('few furs', furs);
  const st = setMonth(fresh(30, 'graubel', 'hunter', 90), 12); for (let i = 0; i < 6; i++) huntOnce(st, R(st), false);
  if (!(H(st).stock.graubel < 70)) fail('stock not drained', H(st).stock.graubel);
  if (verbose) console.log('winter hunts', { furs, meat });
}

// 3. 영주의 숲: 허가를 사면 든다, 몰래 들면 산지기
{
  const g = setMonth(fresh(40, 'verden', 'hunter', 30), 10);
  if (!can(g, 'hunter_license') || !can(g, 'hunter_poach')) fail('lord actions hidden');
  const m0 = g.player.money; runAct(g, 'hunter_license');
  if (!licensed(g) || g.player.money !== m0 - GROUNDS.verden.lord.fee) fail('license');
  if (can(g, 'hunter_license') || can(g, 'hunter_poach')) fail('license twice / poach licensed');
  const lc = setMonth(fresh(41, 'leocast', 'hunter', 30), 10); runAct(lc, 'hunter_license'); if (!can(lc, 'hunter_go')) fail('royal forest with license');
  adv(g, 13); if (licensed(g)) fail('license never ends');
  // 산지기 장면
  const c = setMonth(fresh(42, 'verden', 'hunter', 30), 10);
  const f = clone(c); direct(f, 'hunter_caught', {}, 'fine'); if (f.player.money !== 200 - GROUNDS.verden.lord.fee * 2 || H(f).caught !== 1) fail('fine');
  const poor = clone(c); poor.player.money = 5; direct(poor, 'hunter_caught', {}, 'fine'); if (!poor.player.injuries.length) fail('poor fine whip');
  const ft = clone(c); direct(ft, 'hunter_caught', {}, 'fight'); if (!bannedAt(ft) || can(ft, 'hunter_poach') || can(ft, 'hunter_license')) fail('fight ban');
  for (const k of ['bribe', 'run']) { const x = clone(c); const r = direct(x, 'hunter_caught', {}, k); if (r.missing) fail('caught key', k); }
  // 밀렵은 들킬 때가 있다
  const caught = many(30, (i) => { const x = setMonth(fresh(50 + i, 'verden', 'hunter', 10), 10); runAct(x, 'hunter_poach'); return L(x).queue.some((q) => q.kind === 'hunter_caught'); });
  if (caught < 1 || caught > 20) fail('poach caught rate', caught);
  if (H(setMonth(fresh(90, 'verden', 'hunter', 10), 10)).poached !== 0) fail('poached start');
}

// 4. 모피 상인: 털가죽 시장이 낫고 겨울 담비가 비싸다. 주문을 맡고 채우거나 못 채운다
{
  const g = setMonth(fresh(100, 'fur', 'hunter', 30), 12);
  H(g).furs = { marten: 4, hare: 3, fox: 2 }; H(g).smoked = 4;
  const e = clone(g); placeAt(e, 'ern');
  if (!(furPrice(g, 'marten') > furPrice(e, 'marten'))) fail('fur town price');
  const sm = clone(g); setMonth(sm, 7); if (!(furPrice(g, 'marten') > furPrice(sm, 'marten'))) fail('winter marten price');
  if (!can(g, 'hunter_sell') || can(fresh(101, 'gorge', 'hunter'), 'hunter_sell')) fail('sell availability');
  runAct(g, 'hunter_sell'); if (!L(g).queue.some((q) => q.kind === 'hunter_trader')) fail('trader not queued');
  const a = clone(g); const m0 = a.player.money; direct(a, 'hunter_trader', {}, 'all');
  if (furCount(a) || H(a).smoked || a.player.money <= m0 || H(a).earned !== a.player.money - m0) fail('sell all', furCount(a), a.player.money - m0);
  const so = clone(g); setMonth(so, 10); direct(so, 'hunter_trader', {}, 'some'); if (H(so).furs.marten !== 4 || H(so).furs.hare) fail('keep fine furs');
  // 주문
  const o = clone(g); H(o).trader.offer = { kind: 'fox', n: 3, paid: 12 };
  const mo = o.player.money; direct(o, 'hunter_trader', {}, 'take');
  if (!H(o).trader.order || o.player.money !== mo + 12) fail('order take');
  if (!direct(clone(o), 'hunter_trader', {}, 'order').missing) fail('order ready too early');
  H(o).furs.fox = 3; const t0 = H(o).trader.trust; direct(o, 'hunter_trader', {}, 'order');
  if (H(o).trader.order || H(o).furs.fox !== 0 || H(o).trader.trust <= t0) fail('order deliver');
  const ex = clone(g); H(ex).trader.order = { kind: 'otter', n: 6, until: mi(ex) + 1, paid: 10 }; H(ex).trader.trust = 50; adv(ex, 2);
  if (H(ex).trader.order || H(ex).trader.trust !== 30) fail('order expiry', H(ex).trader.trust);
  // 공장 가죽이 들어오면 거친 가죽 값이 내린다
  const fa = clone(g); fa.history.inventions = [...(fa.history.inventions ?? []), 'factory'];
  if (!(furPrice(fa, 'wolf') < furPrice(g, 'wolf')) || furPrice(fa, 'marten') !== furPrice(g, 'marten')) fail('factory hides');
}

// 5. 큰 사냥: 솜씨와 사냥개가 낫고, 실패하면 다친다. 개가 죽기도 한다
{
  const base = setMonth(dog(fresh(110, 'fur', 'hunter', 100)), 10);
  const win = many(20, (i) => { const x = clone(base); x.rngState.s = 900 + i; direct(x, 'hunter_big', { kind: 'bison' }, 'dogs'); return (H(x).furs.bison ?? 0) > 0; });
  if (win < 14) fail('skilled big hunt', win);
  const weak = setMonth(dog(fresh(111, 'fur', 'hunter', 0)), 10); weak.player.stats.agi = 0;
  let hurt = 0, dead = 0;
  for (let i = 0; i < 40; i++) { const x = clone(weak); x.rngState.s = 700 + i; const d0 = x.beasts.animals.filter((a) => a.kind === 'dog').length; direct(x, 'hunter_big', { kind: 'bison' }, 'dogs'); if (x.player.injuries.length) hurt++; if (x.beasts.animals.filter((a) => a.kind === 'dog').length < d0) dead++; }
  if (hurt < 20 || dead < 1) fail('weak big hunt', hurt, dead); // 47단계: 마흔 번을 보고, 원래 기르던 개가 있는 판도 있어 개 수가 줄었는지로 센다
  const wolf = clone(base); wolf.rngState.s = 5; const r = direct(wolf, 'hunter_big', { kind: 'wolf' }, 'bow'); if (r.missing) fail('wolf bow');
  if (!direct(clone(base), 'hunter_big', { kind: 'stag' }, 'leave').out) fail('leave');
  if (H(base).bigs.length) fail('bigs before');
}

// 6. 오두막: 고기를 훈제하고 가죽 값이 오른다. 도제를 들이고, 세 해 뒤 떠나보낸다
{
  const g = setMonth(fresh(120, 'graubel', 'hunter', 35), 12);
  if (!can(g, 'hunter_lodge')) fail('lodge hidden');
  const before = furPrice(g, 'marten');
  runAct(g, 'hunter_lodge');
  if (!lodgeHere(g) || g.player.money !== 200 - LODGE_COST || can(g, 'hunter_lodge')) fail('lodge');
  if (!(furPrice(g, 'marten') >= before)) fail('lodge price');
  H(g).meat = 6; adv(g, 1); if (H(g).meat || H(g).smoked !== 6) fail('smoke', H(g).meat, H(g).smoked);
  const nolodge = fresh(121, 'ern', 'hunter', 20); H(nolodge).meat = 6; const m0 = nolodge.player.money; adv(nolodge, 1); if (H(nolodge).meat || nolodge.player.money < m0) fail('meat spoil/sell');
  g.player.skills.hunting = 20; if (can(g, 'hunter_apprentice')) fail('apprentice low skill');
  g.player.skills.hunting = 40; H(g).lodge.appAt = -99;
  if (!can(g, 'hunter_apprentice')) fail('apprentice hidden');
  runAct(g, 'hunter_apprentice');
  const ap = H(g).lodge.app[0];
  if (!ap || !g.people.some((p) => p.id === ap.id)) fail('apprentice');
  if (can(g, 'hunter_apprentice')) fail('apprentice twice at once');
  // 도제가 철마다 가죽을 보탠다
  const f0 = furCount(g); adv(g, 12); if (!(furCount(g) > f0)) fail('apprentice furs', f0, furCount(g));
  ap.since = mi(g) - 36; L(g).queue = []; adv(g, 1);
  if (!L(g).queue.some((q) => q.kind === 'hunter_journey')) fail('journey not queued');
  const b = clone(g); direct(b, 'hunter_journey', { id: ap.id }, 'bow');
  if (H(b).lodge.app.length || b.people.find((p) => p.id === ap.id)?.job !== 'hunter') fail('journey bow');
  const k = clone(g); direct(k, 'hunter_journey', { id: ap.id }, 'keep'); if (H(k).lodge.app.length !== 1) fail('journey keep');
  globalThis.LODGE = g;
}

// 7. 가을 귀족 사냥 대회: 금렵 숲 고장에서, 해마다 한 번 넘게는 아니다
{
  const g = setMonth(fresh(130, 'verden', 'hunter', 45), 8);
  let seen = 0;
  for (let y = 0; y < 4; y++) for (let m = 0; m < 12; m++) { L(g).queue = []; adv(g, 1); if (L(g).queue.some((q) => q.kind === 'hunter_royal')) { seen++; if (g.date.month < 9 || g.date.month > 11) fail('royal off season', g.date.month); } }
  if (seen < 1 || seen > 4) fail('royal count', seen);
  const e = setMonth(fresh(131, 'ern', 'hunter', 45), 8); for (let i = 0; i < 24; i++) { L(e).queue = []; adv(e, 1); if (L(e).queue.some((q) => q.kind === 'hunter_royal')) fail('royal without lord forest'); }
  const c = setMonth(fresh(132, 'verden', 'hunter', 45), 10);
  for (const key of ['beat', 'guide', 'shoot', 'no']) { const x = clone(c); const r = direct(x, 'hunter_royal', {}, key); if (r.missing) fail('royal key', key); }
  const bt = clone(c); direct(bt, 'hunter_royal', {}, 'beat'); if (bt.player.money !== 206) fail('beater pay');
  if (!direct(fresh(133, 'verden', 'hunter', 10), 'hunter_royal', {}, 'shoot').missing) fail('shoot low skill');
}

// 8. 플레이어 없이도: 봄에 짐승이 늘고 혹한에 준다
{
  const g = setMonth(fresh(140, 'ern'), 2); H(g).stock = { ern: 40 };
  adv(g, 3); if (!(H(g).stock.ern > 45)) fail('spring stock', H(g).stock.ern);
  const w = setMonth(fresh(141, 'ern'), 12); H(w).stock = { ern: 50 };
  w.nature.active.push({ kind: 'winter', region: regionOf('ern'), sev: 2, id: 9999, until: 9e9 });
  const plain = clone(w); plain.nature.active = plain.nature.active.filter((d) => d.id !== 9999);
  stockMonth(w, makeRng({ s: 1 })); stockMonth(plain, makeRng({ s: 1 }));
  if (!(H(w).stock.ern < H(plain).stock.ern - 3)) fail('winter stock', H(w).stock.ern, H(plain).stock.ern);
  if (verbose) console.log('winter', H(w).stock.ern, H(plain).stock.ern);
}

// 9. 옛 저장, 대 잇기, 몇 해 살아 보기
{
  const old = clone(globalThis.LODGE); delete old.hunter.trader; delete old.hunter.stock;
  runHooks('migrate', old); if (!old.hunter.trader || !old.hunter.stock) fail('migrate');
  const none = clone(globalThis.LODGE); delete none.hunter; runHooks('migrate', none); if (!none.hunter) fail('migrate none');
  const h = clone(globalThis.LODGE); H(h).caught = 3; H(h).banned = { verden: 9e9 }; H(h).trader.trust = 60;
  runHooks('heir', h, makeRng({ s: 1 }), h.player);
  if (!H(h).lodge || H(h).caught || Object.keys(H(h).banned).length || H(h).trader.trust !== 30) fail('heir');
  const g = setMonth(fresh(150, 'fur', 'hunter', 20), 9);
  for (let i = 0; i < 36 && !g.over; i++) {
    if (!L(g).travel && L(g).place !== 'fur') placeAt(g, 'fur');
    month(g, furCount(g) >= 8 ? ['hunter_sell', 'hunter_go'] : ['hunter_go', 'work']);
    if (g.player.money < 0) fail('negative money in play', g.player.money);
    checkInfo(g, `play ${i}`);
  }
  if (H(g).hunts < 10 || H(g).earned < 20) fail('little hunting in play', H(g).hunts, H(g).earned);
  if (verbose) console.log('play', { money: g.player.money, hunts: H(g).hunts, earned: H(g).earned, skill: Math.round(g.player.skills.hunting), bigs: H(g).bigs, log: H(g).log.map((x) => x.text).join(' / ') });
}

if (verbose) for (const s of samples) console.log(s);
console.log(`huntertest: ${problems ? `${problems} problems` : 'ok'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (problems) process.exit(1);
