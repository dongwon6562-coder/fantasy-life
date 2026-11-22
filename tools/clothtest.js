import '../src/content.js';
// 옷감과 재봉사(src/cloth/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/clothtest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { clothInfo, clothLine, clothWorld } from '../src/cloth/index.js';
import { C, boltCount, yarnCount, handRank, DYES, FASHIONS, fashionsFor } from '../src/cloth/core.js';
import { clothMonth } from '../src/cloth/life.js';
import { setFashion, masterOf } from '../src/cloth/shop.js';
import { takeJob } from '../src/jobs.js';
import { makePerson, kill } from '../src/npc.js';
import { lifeOf } from '../src/art/portraitLife.js';
import { outfitOf, wearCloth } from '../src/art/portraitGarb.js';
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
      const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 8501 + k * 977 });
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
  const s = JSON.stringify(clothInfo(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 200));
  const l = clothLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 90) samples.push(`(${id}) ${out}`); return out; };
const home = (g, h = 'own') => { L(g).home = h; return g; };

// 1. 행동은 뜻 있는 형편에서만
{
  const g = fresh(1, 'ern');
  g.player.money = 200;
  for (const id of ['cloth_spin', 'cloth_loom', 'cloth_weave', 'cloth_dye', 'cloth_sell', 'cloth_wear', 'cloth_shop', 'cloth_tend', 'cloth_manage']) if (can(g, id)) fail('visible with nothing', id);
  home(g, 'family'); if (!can(g, 'cloth_spin')) fail('spin hidden at family home');
  home(g, 'street'); if (can(g, 'cloth_spin')) fail('spin on street');
  const kid = fresh(2, 'ern'); me(kid).ageMonths = 10 * 12; home(kid, 'family');
  if (!can(kid, 'cloth_spin')) fail('spin hidden for kid');
  me(kid).ageMonths = 6 * 12; if (can(kid, 'cloth_spin')) fail('spin for small child');
  if (clothLine(fresh(3, 'ern')) !== null) fail('line with nothing in ern');
}

// 2. 물레 → 베틀 → 베 짜기 → 염색 → 팔기
let WEAVER;
{
  const g = home(fresh(4, 'harfen'), 'family'); g.player.money = 10;
  const m0 = g.player.money; runAct(g, 'cloth_spin');
  if (g.player.money <= m0 || yarnCount(g)) fail('spin without loom should sell yarn', g.player.money - m0, yarnCount(g));
  C(g).hand = 8; g.player.money = 60; home(g, 'own');
  if (!can(g, 'cloth_loom')) fail('loom hidden');
  runAct(g, 'cloth_loom'); if (!C(g).loom || g.player.money !== 30) fail('loom buy', g.player.money);
  for (let i = 0; i < 4; i++) runAct(g, 'cloth_spin');
  if (C(g).yarn.wool < 3) fail('wool yarn in harfen', JSON.stringify(C(g).yarn));
  if (!can(g, 'cloth_weave')) fail('weave hidden');
  runAct(g, 'cloth_weave'); if (boltCount(g) < 1) fail('weave made nothing');
  if (!can(g, 'cloth_dye')) fail('dye hidden at harfen');
  for (const k of ['weld', 'woad', 'madder', 'gall', 'no']) { const r = direct(clone(g), 'cloth_dye', {}, k); if (r.missing || r.skipped) fail('dye', k, JSON.stringify(r)); }
  if (!direct(clone(g), 'cloth_dye', {}, 'murex').missing) fail('murex in harfen');
  WEAVER = clone(g);
  const s = clone(g); direct(s, 'cloth_dye', {}, 'woad');
  if (!C(s).bolts.every((b) => b.dye === 'woad')) fail('dye state');
  // 팔기: 왕도가 시골보다 비싸다
  const a = clone(s); placeAt(a, 'leocast'); const b = clone(s); placeAt(b, 'ern');
  const ma = a.player.money, mb = b.player.money;
  runAct(a, 'cloth_sell'); runAct(b, 'cloth_sell');
  if (!(a.player.money - ma > b.player.money - mb)) fail('leocast price', a.player.money - ma, b.player.money - mb);
  if (boltCount(a)) fail('sold all');
  checkInfo(s, 'weaver');
}

// 3. 비싼 염료: 자줏빛(포르텔), 주홍빛 독(왕도)
{
  const g = clone(WEAVER); placeAt(g, 'portel'); g.player.money = 500; C(g).bolts = [{ f: 'silk', dye: null, n: 2 }];
  const r = direct(g, 'cloth_dye', {}, 'murex'); if (r.missing || !C(g).bolts.some((b) => b.dye === 'murex')) fail('murex dye', JSON.stringify(r));
  const h = clone(WEAVER); placeAt(h, 'leocast'); h.player.money = 500;
  for (let i = 0; i < 3; i++) { C(h).bolts = [{ f: 'linen', dye: null, n: 1 }]; direct(h, 'cloth_dye', {}, 'cinnabar'); }
  if (!h.player.injuries.some((x) => x.name === '진사 독에 떨리는 손')) fail('cinnabar harm');
  // 자줏빛 옷을 입고 왕도를 다니면 금령
  const w = clone(g); placeAt(w, 'portel'); C(w).hand = 30;
  if (!can(w, 'cloth_wear')) fail('wear hidden');
  direct(w, 'cloth_wear', {}, 'b:silk:murex'); if (C(w).wear?.dye !== 'murex') fail('wear murex');
  placeAt(w, 'leocast');
  let law = 0; for (let i = 0; i < 20; i++) { const c = clone(w); c.date.month = (i % 12) + 1; clothMonth(c, makeRng({ s: 100 + i })); if (L(c).queue.some((q) => q.kind === 'cloth_law')) law++; }
  if (law < 3) fail('sumptuary rare', law);
  for (const k of ['fine', 'strip', 'bribe', 'lie']) for (let i = 0; i < 3; i++) { const c = clone(w); c.rngState.s = 9 + i * 77; if (i === 2) c.player.money = 0; const rr = direct(c, 'cloth_law', {}, k); if (rr.skipped || (rr.missing && !(k === 'bribe' && i === 2))) fail('law', k, JSON.stringify(rr)); }
  // 초상: 지어 입은 옷이 보인다
  const L1 = lifeOf(w, { ...me(w), isPlayer: true }, 25, 'adult');
  if (L1.garb?.kind !== 'fine' || !L1.key.includes('fine')) fail('portrait garb', JSON.stringify(L1.garb));
  const o = outfitOf('farmer', 'm', 'adult', 0.3, 0.3, 0.3);
  if (wearCloth(o, { kind: 'mourn' }).main !== '#2a2725') fail('mourn color');
  if (wearCloth(o, null) !== o) fail('no garb changes outfit');
  if (!outfitOf('tailor', 'f', 'adult', 0.1, 0.2, 0.3)) fail('tailor outfit');
  checkInfo(w, 'purple');
}

// 4. 상복과 혼례 옷
{
  const g = fresh(10, 'ern'); g.player.money = 50;
  const dad = g.people.find((p) => p.id === me(g).fatherId);
  if (!dad) fail('no father');
  clothMonth(g, makeRng({ s: 1 }));
  if (dad) { dad.alive = true; clothMonth(g, makeRng({ s: 2 })); kill(g, dad, '병'); clothMonth(g, makeRng({ s: 3 })); }
  if (!L(g).queue.some((q) => q.kind === 'cloth_mourn')) fail('mourn not queued');
  const q = L(g).queue.find((x) => x.kind === 'cloth_mourn') ?? { name: '아버지' };
  for (const k of ['buy', 'band', 'none']) direct(clone(g), 'cloth_mourn', { name: q.name }, k);
  C(g).bolts = [{ f: 'linen', dye: 'gall', n: 1 }];
  const m = clone(g); direct(m, 'cloth_mourn', { name: q.name }, 'own');
  if (C(m).wear?.kind !== 'mourn' || boltCount(m)) fail('mourn own');
  if (can(m, 'cloth_wear')) fail('wear new clothes in mourning');
  checkInfo(m, 'mourning');
  if (!clothLine(m)) fail('no mourning line');
  const L2 = lifeOf(m, { ...me(m), isPlayer: true }, 25, 'adult'); if (L2.garb?.kind !== 'mourn') fail('portrait mourn');
  for (let i = 0; i < 12; i++) { m.date.month = (m.date.month % 12) + 1; if (m.date.month === 1) m.date.year++; clothMonth(m, makeRng({ s: 40 + i })); }
  if (C(m).wear) fail('mourning never ends', JSON.stringify(C(m).wear));
  // 혼인
  const w = fresh(11, 'ern'); w.player.money = 40; clothMonth(w, makeRng({ s: 1 }));
  const sp = makePerson(makeRng({ s: 5 }), { sex: 'f', ageMonths: 20 * 12, job: 'farmer' }); sp.place = 'ern'; w.people.push(sp);
  me(w).spouseId = sp.id; sp.spouseId = me(w).id;
  clothMonth(w, makeRng({ s: 2 }));
  if (!L(w).queue.some((x) => x.kind === 'cloth_wed')) fail('wed not queued');
  C(w).bolts = [{ f: 'wool', dye: 'madder', n: 1 }];
  for (const k of ['old', 'bolt', 'buy', 'none']) { const r = direct(clone(w), 'cloth_wed', { name: sp.name }, k); if (r.missing) fail('wed', k); }
  const b = clone(w); direct(b, 'cloth_wed', { name: sp.name }, 'old'); if (C(b).wear?.kind !== 'bridal') fail('bridal');
  clothMonth(b, makeRng({ s: 3 })); if (L(b).queue.filter((x) => x.kind === 'cloth_wed').length > 1) fail('wed queued twice');
  // 배우자를 잃으면 상복
  const d = clone(b); C(d).wear = null; kill(d, d.people.find((p) => p.id === sp.id), '사고'); clothMonth(d, makeRng({ s: 4 }));
  if (!L(d).queue.some((x) => x.kind === 'cloth_mourn')) fail('spouse mourn');
}

// 5. 재봉사 견습 → 장인 → 내 가게
let SHOP;
{
  const g = fresh(20, 'leocast'); g.player.money = 20;
  takeJob(g, 'tailor');
  for (let i = 0; i < 6; i++) runAct(g, 'work');
  if (!C(g).master || C(g).hand <= 0) fail('tailor work', C(g).master, C(g).hand);
  const ms = g.people.find((p) => p.id === C(g).master); if (!ms || ms.job !== 'tailor') fail('master person');
  // 스승 가게의 주문 (견습)
  for (const kind of ['noble', 'mourn', 'wed']) {
    const ks = { noble: ['fashion', 'new', 'cash'], mourn: ['night', 'double', 'kind', 'no'], wed: ['cheap', 'free', 'no'] }[kind];
    for (const k of ks) { const r = direct(clone(g), 'cloth_order', { kind, own: false, who: '그라이펜 백작가' }, k); if (r.skipped || r.missing) fail('master order', kind, k, JSON.stringify(r)); }
  }
  C(g).hand = 60; g.player.money = 300;
  if (handRank(g) !== 2) fail('rank', handRank(g));
  if (!can(g, 'cloth_shop')) fail('shop hidden at 장인');
  for (const k of ['guild', 'back', 'no']) direct(clone(g), 'cloth_open', {}, k);
  const r = direct(g, 'cloth_open', {}, 'guild');
  if (!C(g).shop || !C(g).guild.member || r.missing) fail('open guild shop');
  const m0 = g.player.money; runAct(g, 'cloth_tend'); if (g.player.money <= m0) fail('tend earned nothing');
  if (!clothLine(g) && !clothLine({ ...g, date: { ...g.date, month: g.date.month + 1 } })) fail('no shop line');
  SHOP = clone(g);
  const nog = fresh(21, 'portel'); C(nog).hand = 60; nog.player.money = 300; direct(nog, 'cloth_open', {}, 'open'); if (!C(nog).shop || C(nog).shop.back) fail('open plain shop');
  const low = fresh(22, 'leocast'); C(low).hand = 40; low.player.money = 300; if (can(low, 'cloth_shop')) fail('shop for 숙련');
}

// 6. 가게 주문, 장부, 길드
{
  const g = clone(SHOP); g.player.money = 200; C(g).bolts = [{ f: 'silk', dye: 'murex', n: 2 }];
  const KS = { noble: ['fashion', 'new', 'purple', 'cash'], mourn: ['night', 'double', 'kind', 'no'], wed: ['cheap', 'free', 'no'], fake: ['do', 'no', 'report'], hem: ['do', 'no', 'peek'] };
  for (const [kind, ks] of Object.entries(KS)) for (const k of ks) for (let i = 0; i < 3; i++) {
    const c = clone(g); c.rngState.s = 3 + i * 211; C(c).hand = i === 2 ? 90 : 60;
    const r = direct(c, 'cloth_order', { kind, own: true, who: '그라이펜 백작가' }, k);
    if (r.skipped || r.missing) fail('shop order', kind, k, JSON.stringify(r));
  }
  // 새 모양이 유행이 된다
  let set = 0; for (let i = 0; i < 20; i++) { const c = clone(g); c.rngState.s = 500 + i * 37; C(c).hand = 95; direct(c, 'cloth_order', { kind: 'noble', own: true, who: '어느 댁' }, 'new'); if (C(c).fashion.by === c.player.name) set++; }
  if (!set) fail('player fashion never set');
  // 장부
  C(g).shop.owed.push({ who: '그라이펜 백작가', n: 40, y: g.date.year }); C(g).shop.style = 'blue'; C(g).fashion.id = 'longsleeve';
  if (!can(g, 'cloth_manage')) fail('manage hidden');
  for (const k of ['style', 'appr', 'owed', 'close', 'no']) { const r = direct(clone(g), 'cloth_manage', {}, k); if (r.missing) fail('manage', k, JSON.stringify(r)); }
  const ap = clone(g); direct(ap, 'cloth_manage', {}, 'appr'); me(ap).ageMonths = 55 * 12;
  const hd = direct(ap, 'cloth_manage', {}, 'hand'); if (hd.missing || C(ap).shop || !C(ap).past.length) fail('hand down shop', JSON.stringify(hd));
  // 길드
  const GK = { inspect: ['show', 'bribe'], dues: ['pay', 'resist', 'expose'], election: ['run', 'back', 'no'] };
  for (const [kind, ks] of Object.entries(GK)) for (const k of ks) for (let i = 0; i < 3; i++) {
    const c = clone(g); c.rngState.s = 11 + i * 97; C(c).shop.rep = 70; C(c).hand = 85; if (i === 2) c.player.money = 0;
    const r = direct(c, 'cloth_guild', { kind }, k);
    if (r.skipped || (r.missing && !(k === 'bribe' && i === 2))) fail('guild', kind, k, JSON.stringify(r));
  }
  let won = 0; for (let i = 0; i < 20; i++) { const c = clone(g); c.rngState.s = 900 + i * 13; C(c).shop.rep = 90; C(c).hand = 95; direct(c, 'cloth_guild', { kind: 'election' }, 'run'); if (C(c).guild.me) won++; }
  if (!won) fail('never guild master');
  const back = clone(g); C(back).shop.back = true; C(back).shop.guild = false; C(back).guild.member = false;
  for (const k of ['join', 'stay', 'quit']) { const r = direct(clone(back), 'cloth_guild', { kind: 'harass' }, k); if (r.skipped || r.missing) fail('harass', k, JSON.stringify(r)); }
  if (!direct(clone(g), 'cloth_guild', { kind: 'harass' }, 'stay').skipped) fail('harass a guild shop');
  // 가게를 오래 비우면 이름값이 준다, 세는 마이너스로 안 간다
  const away = clone(g); placeAt(away, 'ern'); away.player.money = 0; const rep0 = C(away).shop.rep;
  for (let i = 0; i < 6; i++) runHooks('afterMonth', away, makeRng({ s: i }));
  if (C(away).shop.rep >= rep0 || away.player.money < 0) fail('away shop', C(away).shop.rep, away.player.money);
  checkInfo(g, 'shop');
}

// 7. 유행은 플레이어 없이도 바뀐다, 시대가 바뀌면 옛 유행은 사라진다
{
  const g = fresh(30, 'leocast'); const rng = makeRng({ s: 7 });
  const seen = new Set();
  for (let i = 0; i < 12 * 60; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; clothWorld(g, rng); seen.add(C(g).fashion.id); }
  if (seen.size < 4) fail('fashion rarely changes', seen.size);
  g.realm.era = 3; for (let i = 0; i < 60; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; clothWorld(g, rng); }
  if (!fashionsFor(3).includes(C(g).fashion.id)) fail('stale fashion in era 3', C(g).fashion.id);
  for (const pl of ['leocast', 'harfen', 'portel', 'ern', 'klein']) for (let m = 1; m <= 12; m++) { const c = clone(SHOP); placeAt(c, pl); c.date.month = m; checkInfo(c, `${pl} ${m}`); }
  if (verbose) console.log('fashions seen', [...seen].map((id) => FASHIONS[id].name).join(', '));
}

// 8. 옛 저장, 대 잇기
{
  const old = clone(SHOP); delete old.cloth.harm; delete old.cloth.fashion;
  runHooks('migrate', old); if (old.cloth.harm !== 0 || !old.cloth.fashion) fail('migrate');
  const none = clone(SHOP); delete none.cloth; runHooks('migrate', none); if (!none.cloth) fail('migrate none');
  const h = clone(SHOP); C(h).wear = { kind: 'fine', dye: 'woad', col: '#2f4a73' }; runHooks('heir', h, makeRng({ s: 1 }), h.player);
  if (C(h).wear || !C(h).shop || C(h).hand > 12) fail('heir', JSON.stringify(C(h).wear), C(h).hand);
}

// 9. 몇 해 살아 보기: 왕도 재봉사
{
  const g = fresh(40, 'leocast'); g.player.money = 30; takeJob(g, 'tailor');
  for (let i = 0; i < 48 && !g.over; i++) {
    placeAt(g, 'leocast');
    month(g, ['cloth_manage', 'cloth_shop', 'cloth_tend', 'work']);
    if (g.player.money < 0) fail('negative money in play', g.player.money);
    checkInfo(g, `play ${i}`);
  }
  if (C(g).hand < 15) fail('play hand', C(g).hand);
  if (verbose) console.log('play', { hand: Math.round(C(g).hand), rank: handRank(g), shop: C(g).shop?.name, money: g.player.money, log: C(g).log.map((x) => x.text).join(' / ') });
}

if (verbose) for (const s of samples) console.log(s);
console.log(`clothtest: ${problems ? `${problems} problems` : 'ok'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (problems) process.exit(1);
