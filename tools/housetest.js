import '../src/content.js';
// 내 집 마련과 살림(src/house/)을 브라우저 없이 돌려 보는 점검.
// 1) 오두막 짓기(큰 도시에서는 못 지음), 오두막 값은 4할, 집 짓기와 공사판 일, 자리를 비우면 느림, 오두막 고쳐 짓기, estate로 넓히면 집이 됨.
// 2) 방과 살림: 집 크기만큼만, 집에 있는 달마다 보탬.
// 3) 이웃 다툼·옆집 불·밤손님의 선택지마다, 불에 타 무너지면 잃은 집으로 남음, 돈이 없어도 음수가 되지 않음.
// 4) 대 잇기(몇 대째, 기둥의 이름), 물려받은 집 팔기, 옛 집 되사기, 이사(팔고 가기·두고 가기), 옛 저장, 저절로 살아 보기.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { E, homeWorth } from '../src/estate/core.js';
import { H, ROOM_IDS, recOf, roomCap, hutOk, houseStatus, buildCost } from '../src/house/index.js';

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
    if (/^house_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^house_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = houseStatus(g);
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
function built(seed, pl, kind) {
  const g = adult(seed); placeAt(g, pl); g.player.money = 5000;
  const r = direct(g, 'house_build', {}, `b:${kind}`);
  if (r.missing || r.skipped) { fail('cannot start build', pl, kind, r.keys); return g; }
  for (let i = 0; i < 12 && H(g).build; i++) { placeAt(g, pl); L(g).queue = []; tick(g); }
  if (H(g).build) fail('build never finished', pl, kind);
  return g;
}

/* 1) 짓기 */
{
  const g = built(71000, 'ern', 'hut');
  const r = recOf(g, 'ern');
  if (!L(g).houses.includes('ern') || r?.kind !== 'hut') fail('hut not built', JSON.stringify(r));
  const hutWorth = homeWorth(g, 'ern');
  if (hutWorth > buildCost('ern', 'hut') * 1.2) fail('hut sells for profit', hutWorth, buildCost('ern', 'hut'));
  if (roomCap(g, 'ern') !== 2) fail('hut cap', roomCap(g, 'ern'));
  // 큰 도시에는 오두막 터가 없다
  const c = adult(71010); placeAt(c, 'leocast'); c.player.money = 9000;
  if (hutOk('leocast')) fail('hut ok in capital');
  const keys = SCENES.house_build.choices(c, { kind: 'house_build' }).map((x) => x.key);
  if (keys.includes('b:hut') || !keys.includes('b:house')) fail('capital build keys', keys);
  // 고쳐 짓기
  placeAt(g, 'ern'); g.player.money = 5000;
  const rb = direct(g, 'house_build', {}, 'b:rebuild');
  if (rb.missing) fail('no rebuild', rb.keys);
  for (let i = 0; i < 8 && H(g).build; i++) { placeAt(g, 'ern'); L(g).queue = []; tick(g); }
  if (recOf(g, 'ern').kind !== 'house' || homeWorth(g, 'ern') <= hutWorth) fail('rebuild', recOf(g, 'ern').kind, homeWorth(g, 'ern'), hutWorth);
  // 집 짓기와 공사판 일
  const v = adult(71020); placeAt(v, 'verden'); v.player.money = 5000;
  direct(v, 'house_build', {}, 'b:house');
  const b = H(v).build;
  if (!b || b.left !== 6) fail('house build', JSON.stringify(b));
  for (const [ev, keys2] of [['help', ['feast', 'alone']], ['cheat', ['argue', 'pay', 'swap']], ['short', ['buy', 'wait', 'old']], ['accident', ['catch', 'shout']]]) for (const k of keys2) { v.player.money = 500; heal(v); const r2 = direct(v, 'house_work', { ev }, k); if (r2.missing) fail('work key', ev, k, r2.keys); }
  v.player.money = 0;
  for (const [ev, k] of [['help', 'feast'], ['cheat', 'pay'], ['short', 'buy']]) { const r3 = direct(v, 'house_work', { ev }, k); if (!r3.missing) fail('paid choice shown when broke', ev, k); }
  // 자리를 비우면 느리다
  const left0 = H(v).build.left; L(v).place = 'ern'; tick(v);
  if (H(v).build && H(v).build.left !== left0 - 0.5) fail('away progress', left0, H(v).build?.left);
  for (let i = 0; i < 20 && H(v).build; i++) { placeAt(v, 'verden'); L(v).queue = []; tick(v); }
  if (recOf(v, 'verden')?.kind !== 'house') fail('verden house');
  for (const k of ['big', 'small', 'none']) { placeAt(v, 'verden'); L(v).home = 'own'; v.player.money = 100; direct(v, 'house_warm', {}, k); }
  // estate에서 넓히면 오두막은 집이 된다
  const w = built(71030, 'gruental', 'hut');
  E(w).homes.gruental.level = 1; tick(w);
  if (recOf(w, 'gruental').kind !== 'house' || roomCap(w, 'gruental') !== 6) fail('estate grow hut', recOf(w, 'gruental').kind);
  console.log(`짓기: 에른 오두막 값 ${buildCost('ern', 'hut')} → 팔면 ${hutWorth}, 고쳐 지은 뒤 ${homeWorth(g, 'ern')}`);
}

/* 2) 방과 살림 */
{
  const g = built(72000, 'ern', 'hut');
  placeAt(g, 'ern'); L(g).home = 'own'; g.player.money = 1000;
  for (let i = 0; i < 4; i++) { const r = direct(g, 'house_room', {}, (ch) => ch[0].key); if (r.skipped) fail('room skipped'); }
  if (recOf(g, 'ern').rooms.length !== 2) fail('hut rooms over cap', recOf(g, 'ern').rooms);
  const v = built(72010, 'verden', 'house');
  placeAt(v, 'verden'); L(v).home = 'own'; v.player.money = 1000;
  for (const id of ['study', 'garden', 'hearth', 'well']) { const r = direct(v, 'house_room', {}, `r:${id}`); if (r.missing) fail('room key', id, r.keys); }
  const l0 = v.player.skills.letters ?? 0;
  for (let i = 0; i < 12; i++) { placeAt(v, 'verden'); L(v).home = 'own'; L(v).queue = []; tick(v); }
  if ((v.player.skills.letters ?? 0) <= l0) fail('study did nothing', l0, v.player.skills.letters);
  if ((recOf(v, 'verden').lived ?? 0) < 12) fail('lived months', recOf(v, 'verden').lived);
  v.player.money = 0;
  if (direct(v, 'house_room', {}, 'r:wall').missing !== true) fail('room shown when broke');
  console.log(`살림: 서재 한 해 글 ${l0.toFixed(1)} → ${v.player.skills.letters.toFixed(1)}`);
}

/* 3) 집의 일 */
{
  let lostByFire = 0;
  for (const [ev, keys] of [['neighbor', ['yield', 'split', 'elder', 'fist']], ['fire', ['douse', 'roof', 'save']], ['thief', ['club', 'shout', 'hide']]]) {
    for (const k of keys) {
      for (const money of [0, 300]) {
        const g = built(73000 + k.length * 7 + money, 'verden', 'house');
        placeAt(g, 'verden'); L(g).home = 'own'; g.player.money = money; heal(g);
        if (ev === 'fire' && money) E(g).homes.verden.cond = 5;
        const r = direct(g, 'house_event', { ev, topic: 2, who: '옆집 홀거' }, k);
        if (r.missing || r.skipped) fail('event key', ev, k, r.keys);
        if (g.player.money < 0) fail('event money', ev, k);
        if (ev === 'fire' && !L(g).houses.includes('verden')) { lostByFire++; if (!H(g).lost.some((x) => x.place === 'verden' && /불/.test(x.how))) fail('fire lost not recorded'); }
      }
    }
  }
  if (!lostByFire) fail('fire never destroyed a weak house');
  // 저절로: 집에 살면 일이 생긴다
  const g = built(73900, 'verden', 'house');
  let evs = 0;
  for (let i = 0; i < 120; i++) { placeAt(g, 'verden'); L(g).home = 'own'; if (!L(g).houses.includes('verden')) break; L(g).queue = []; tick(g); if (L(g).queue.some((q) => q.kind === 'house_event')) evs++; }
  if (!evs) fail('no house events in 10 years');
  console.log(`집의 일: 10년에 ${evs}번, 약한 집이 불에 무너짐 ${lostByFire}`);
}

/* 4) 대 잇기, 되사기, 이사, 옛 저장 */
{
  const g = built(74000, 'verden', 'house');
  tick(g);
  const name0 = g.player.name;
  runHooks('heir', g, R(g), g.player);
  const r = recOf(g, 'verden');
  if (r.gens !== 2 || !r.marks.includes(name0)) fail('heir gens/marks', r.gens, r.marks);
  if (!L(g).queue.some((q) => q.kind === 'house_heir')) fail('house_heir not queued');
  L(g).queue = [];
  placeAt(g, 'verden');
  const m0 = g.player.money;
  const hs = direct(g, 'house_heir', {}, 'sell:verden');
  if (hs.missing || L(g).houses.includes('verden') || g.player.money <= m0) fail('heir sell', hs.keys);
  if (!H(g).lost.some((x) => x.place === 'verden')) fail('sold not in lost');
  // 되사기
  g.player.money = 9000; placeAt(g, 'verden');
  const bb = direct(g, 'house_build', {}, 'buyback');
  if (bb.missing || recOf(g, 'verden')?.gens !== 3 || recOf(g, 'verden').name !== r.name) fail('buyback', bb.keys, JSON.stringify(recOf(g, 'verden')));
  // 이사: 팔고 간다
  g.player.money = 500; placeAt(g, 'verden');
  const mv = direct(g, 'house_move', {}, (ch) => ch[0].key);
  if (mv.missing || mv.skipped) fail('move start');
  const q = L(g).queue.find((x) => x.kind === 'house_move_house');
  if (!q) fail('move house scene not queued');
  else {
    L(g).queue = [];
    const to = q.to;
    direct(g, 'house_move_house', { to }, 'sell');
    if (!L(g).travel || L(g).houses.includes('verden') || !H(g).moving) fail('move did not start', JSON.stringify(L(g).travel));
    for (let i = 0; i < 12 && H(g).moving; i++) { heal(g); g.player.money = Math.max(g.player.money, 50); month(g, ['rest'], (k, labels) => (k === 'border' ? idxOf(labels, /통행세|찔러|지나/) : -1)); }
    if (H(g).moving || L(g).place !== to || H(g).moves !== 1) fail('move not finished', L(g).place, to, H(g).moves);
    if (!['rent', 'own', 'inn'].includes(L(g).home)) fail('home after move', L(g).home);
    console.log(`이사: 베르덴 → ${PLACES[to].name}, 잠자리 ${L(g).home}`);
  }
  // 이사: 두고 간다
  const k = built(74100, 'ern', 'hut'); placeAt(k, 'ern'); k.player.money = 300;
  direct(k, 'house_move', {}, (ch) => ch[0].key);
  const q2 = L(k).queue.find((x) => x.kind === 'house_move_house'); L(k).queue = [];
  if (q2) { direct(k, 'house_move_house', { to: q2.to }, 'keep'); if (!L(k).houses.includes('ern') || !L(k).travel) fail('keep move'); }
  // 옛 저장
  const o = adult(74200);
  delete o.house; runHooks('migrate', o);
  if (!o.house || !Array.isArray(o.house.lost)) fail('migrate');
  o.house = { homes: { nowhere: {}, ern: { rooms: ['gone', 'well'] } }, lost: 'x', build: { place: 'nowhere' } }; runHooks('migrate', o);
  if (o.house.homes.nowhere || o.house.homes.ern.rooms.join() !== 'well' || o.house.build || !Array.isArray(o.house.lost)) fail('migrate partial', JSON.stringify(o.house));
  for (const x of [g, k, o]) { const st = houseStatus(x); if (JSON.stringify(st).match(/NaN|undefined/)) fail('status', JSON.stringify(st).slice(0, 300)); }
}

/* 5) 저절로 살아 보기 */
{
  let homes = 0, builds = 0, rooms = 0;
  for (let run = 0; run < 4; run++) {
    const a = adult(75000 + run);
    placeAt(a, ['ern', 'verden', 'harfen', 'gruental'][run]);
    for (let m = 0; m < 120 && !a.over; m++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.5) ? ['house_build', 'house_room', 'house_move', 'housing'] : [rngOf(a).pick(acts).id];
      a.player.money = Math.max(a.player.money, m % 24 === 0 ? 800 : 30);
      month(a, want);
    }
    homes += L(a).houses.length; builds += H(a).built; rooms += Object.values(H(a).homes).reduce((s, r) => s + r.rooms.length, 0);
  }
  console.log(`저절로 10년 4판: 가진 집 ${homes}, 지은 집 ${builds}, 들인 살림 ${rooms}`);
  if (!builds) fail('autoplay never built');
}

console.log('장면:', JSON.stringify(seen.scenes));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
