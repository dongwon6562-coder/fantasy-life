import '../src/content.js';
// 포구와 어부의 삶(src/harbor/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/harbortest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { harborInfo, harborLine, harborWorld } from '../src/harbor/index.js';
import { H, boat, freshCount, curedCount, HARBORS, FISH } from '../src/harbor/core.js';
import { harborMonth, eligible } from '../src/harbor/life.js';
import { conditions } from '../src/art/scene.js';
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
      const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 8301 + k * 977 });
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
  const s = JSON.stringify(harborInfo(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 200));
  const l = harborLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
};
// 날씨가 맞는 달로 옮긴다
function setWeather(g, want, months = null) {
  for (let y = g.date.year; y < g.date.year + 80; y++) for (let m = 1; m <= 12; m++) {
    if (months && !months.includes(m)) continue;
    if (want.includes(conditions(y, m).weather)) { g.date.year = y; g.date.month = m; return g; }
  }
  fail('no weather', want); return g;
}
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 80) samples.push(`(${id}) ${out}`); return out; };
const giveBoat = (g, kind = 'boat', pl = L(g).place) => { H(g).boat = { kind, name: '갈매기', place: pl, hull: 100, nets: 2, crew: [], since: g.date.year }; return H(g).boat; };

// 1. 행동은 포구에서만
{
  const g = fresh(1, 'ern');
  for (const id of ['harbor_fish', 'harbor_cure', 'harbor_boat']) if (can(g, id)) fail('visible inland', id);
  if (can(g, 'harbor_sell')) fail('sell without cured');
  if (harborLine(g) !== null) fail('line inland');
  placeAt(g, 'klein');
  if (!can(g, 'harbor_fish')) fail('fish hidden at klein');
  if (can(g, 'harbor_cure')) fail('cure without fish');
  if (can(g, 'harbor_boat')) fail('boat before hauls');
  if (harborLine(g) === null) fail('no line at harbor');
  const kid = fresh(2, 'klein'); me(kid).ageMonths = 8 * 12;
  if (can(kid, 'harbor_fish')) fail('fish for small child');
  me(kid).ageMonths = 12 * 12;
  if (!can(kid, 'harbor_fish')) fail('fish hidden for 12');
  setWeather(kid, ['clear'], [3]); kid.player.money = 0;
  runAct(kid, 'harbor_fish');
  checkInfo(g, 'start');
}

// 2. 몫꾼으로 타기, 첫 출어
{
  const g = setWeather(fresh(3, 'portel'), ['clear'], [3]);
  const m0 = g.player.money;
  runAct(g, 'harbor_fish');
  if (g.player.money <= m0) fail('hired fishing paid nothing', g.player.money - m0);
  if (freshCount(g) !== 0) fail('hired kept fish');
  if (!L(g).queue.some((q) => q.kind === 'harbor_event' && q.ev === 'first')) fail('first outing scene not queued');
  for (const k of ['sea', 'priest', 'none']) direct(clone(g), 'harbor_event', { ev: 'first' }, k);
  H(g).hauls = 3;
  if (!can(g, 'harbor_boat')) fail('boat hidden after hauls');
}

// 3. 배 사기, 손보기, 그물, 선원, 바꾸기, 팔기
{
  const g = fresh(4, 'klein'); g.player.money = 600; H(g).hauls = 5;
  const r = direct(g, 'harbor_boat', {}, 'buy:boat');
  if (r.missing || !boat(g) || boat(g).kind !== 'boat' || g.player.money !== 440) fail('buy boat', JSON.stringify(r), g.player.money);
  boat(g).hull = 40; boat(g).nets = 1;
  direct(g, 'harbor_boat', {}, 'fix'); if (boat(g).hull !== 75) fail('fix', boat(g).hull);
  direct(g, 'harbor_boat', {}, 'net'); if (boat(g).nets !== 2) fail('net', boat(g).nets);
  direct(g, 'harbor_boat', {}, 'hire'); direct(g, 'harbor_boat', {}, 'hire');
  if (boat(g).crew.length !== 2) fail('hire', boat(g).crew.length);
  const r2 = direct(g, 'harbor_boat', {}, 'hire'); if (!r2.missing) fail('hire over limit');
  const up = direct(clone(g), 'harbor_boat', {}, 'up:smack'); if (up.missing) fail('upgrade missing', JSON.stringify(up));
  const sold = clone(g); direct(sold, 'harbor_boat', {}, 'sellboat'); if (boat(sold)) fail('sellboat');
  direct(clone(g), 'harbor_boat', {}, 'no');
  const far = clone(g); placeAt(far, 'portel'); direct(far, 'harbor_boat', {}, 'bring'); if (boat(far).place !== 'portel' || boat(far).kind !== 'boat') fail('bring boat');
  const poor = fresh(5, 'klein'); poor.player.money = 50; H(poor).hauls = 5;
  const rp = direct(poor, 'harbor_boat', {}, 'buy:boat'); if (!rp.missing) fail('bought boat without money');
  // 내 배로 고기잡이 → 날생선 → 손질
  const f = setWeather(clone(g), ['clear'], [11]);
  runAct(f, 'harbor_fish');
  if (freshCount(f) <= 0) fail('own boat caught nothing');
  if (!can(f, 'harbor_cure')) fail('cure hidden with fish');
  for (const k of ['sell', 'dry', 'salt', 'no']) direct(clone(f), 'harbor_cure', {}, k);
  const d = clone(f); direct(d, 'harbor_cure', {}, 'dry'); direct(d, 'harbor_cure', {}, 'salt');
  if (freshCount(d) !== 0 || curedCount(d) <= 0) fail('cure state', freshCount(d), curedCount(d));
  const sv = clone(d); direct(sv, 'harbor_cure', {}, 'cured'); if (curedCount(sv) !== 0) fail('sell cured');
  // 내륙 장터
  placeAt(d, 'leocast');
  if (!can(d, 'harbor_sell')) fail('inland sell hidden');
  const m0 = d.player.money; runAct(d, 'harbor_sell'); if (d.player.money <= m0 || curedCount(d)) fail('inland sell');
  // 달이 넘어가면 날생선은 상한다
  const sp = clone(f); harborMonth(sp, makeRng({ s: 3 })); if (freshCount(sp) || !H(sp).spoiled) fail('spoil');
  checkInfo(f, 'own boat');
  globalThis.OWN = g;
}

// 4. 폭풍: 모든 갈래, 모든 결과 (표류·선원 실종·침몰·부상)
{
  const base = setWeather(clone(globalThis.OWN), ['clear'], [6]);
  const outs = new Set();
  for (const k of ['cut', 'hold', 'cape']) direct(clone(base), 'harbor_storm', { own: true, baskets: 4 }, k);
  let drift = 0, lostCrew = 0, sank = 0;
  for (let i = 0; i < 120; i++) {
    const g = clone(base); g.player.skills.sailing = 0; g.rngState.s = 1000 + i * 7919;
    if (i % 3 === 0) boat(g).hull = 20;
    const n0 = H(g).lost.length;
    const r = direct(g, 'harbor_storm', { own: true, baskets: 4 }, 'hold');
    if (L(g).place !== 'klein') { drift++; if (!HARBORS[L(g).place]) fail('drift to non-harbor', L(g).place); if (boat(g) && boat(g).place !== L(g).place) fail('boat left behind on drift'); }
    if (H(g).lost.length > n0) lostCrew++;
    if (!boat(g)) sank++;
    outs.add(r.out?.slice(0, 12));
  }
  if (!drift || !lostCrew || !sank) fail('storm outcomes', drift, lostCrew, sank);
  // 남의 배에 탔을 때, 내 배가 다른 포구에 있어도 깨지지 않는다
  const away = clone(base); placeAt(away, 'portel');
  for (let i = 0; i < 40; i++) { const g = clone(away); g.rngState.s = 50 + i * 131; g.player.skills.sailing = 0; direct(g, 'harbor_storm', { own: false, baskets: 2 }, 'hold'); if (boat(g)?.crew.length !== 2) fail('hired storm hurt own crew'); }
  // 폭풍 날에 나가면 폭풍 장면이 자주 온다
  let st = 0;
  for (let i = 0; i < 30; i++) { const g = setWeather(fresh(10 + i, 'klein'), ['storm']); act('harbor_fish').run(g, R(g)); if (L(g).queue.some((q) => q.kind === 'harbor_storm')) st++; }
  if (st < 4) fail('storms rare on storm days', st);
  if (verbose) console.log('storm', { drift, lostCrew, sank, st });
}

// 5. 포구의 일들 (모든 갈래)
{
  const g = clone(globalThis.OWN); H(g).hauls = 6; g.player.money = 200;
  H(g).fresh = { herring: 6 }; H(g).widows = [];
  H(g).widows.push({ name: '토마스의 아내', place: 'klein', y: g.date.year, helped: false, of: '토마스' });
  g.date.month = 9;
  const ev = eligible(g);
  for (const e of ['ground', 'smuggler', 'pirate', 'salvage', 'widow', 'festival', 'omen']) if (!ev.includes(e)) fail('not eligible', e);
  const KEYS = { ground: ['cut', 'talk', 'share', 'move'], smuggler: ['carry', 'no', 'report'], pirate: ['tribute', 'flee', 'fight'], salvage: ['keep', 'hand', 'bury'], widow: ['coin', 'boy', 'work', 'no'], festival: ['host', 'some', 'none'], omen: ['stay', 'go'] };
  for (const [e, ks] of Object.entries(KEYS)) for (const k of ks) for (let i = 0; i < 3; i++) {
    const c = clone(g); c.rngState.s = 7 + i * 101; c.player.money = i === 2 ? 0 : 200;
    const r = direct(c, 'harbor_event', { ev: e }, k);
    if (r.skipped || r.missing) fail('event', e, k, JSON.stringify(r));
  }
  const p = clone(g); g.sea = g.sea ?? {}; p.sea = { ...(p.sea ?? {}), pirate: { name: '검은 갈매기단' } };
  direct(p, 'harbor_event', { ev: 'pirate' }, 'tribute');
  const w = clone(g); direct(w, 'harbor_event', { ev: 'widow' }, 'boy'); if (boat(w).crew.length !== boat(g).crew.length + 1) fail('widow boy crew');
  const cut = clone(g); direct(cut, 'harbor_event', { ev: 'ground' }, 'cut'); if (H(cut).grounds.klein.feud < 30) fail('feud');
  // 배가 없으면 어장·밀수·해적은 안 온다
  const nb = fresh(30, 'klein'); if (eligible(nb).some((e) => ['ground', 'smuggler', 'pirate'].includes(e))) fail('boat events without boat');
  // 과부가 도움받으면 다시 안 온다
  const wd = clone(g); direct(wd, 'harbor_event', { ev: 'widow' }, 'coin'); if (eligible(wd).includes('widow')) fail('widow again');
}

// 6. 플레이어 없이도 굴러가는 포구, 대 잇기, 옛 저장
{
  const g = fresh(40, 'ern');
  const rng = makeRng({ s: 77 });
  for (let i = 0; i < 12 * 60; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; harborWorld(g, rng); }
  const h = H(g);
  if (h.lost.length < 10) fail('world: few lost', h.lost.length);
  if (h.widows.length > 16) fail('widows cap', h.widows.length);
  if (verbose) console.log('world 60y', { lost: h.lost.length, widows: h.widows.length, chron: g.chronicle.filter((c) => c.text.includes('고깃배')).length });
  const old = clone(globalThis.OWN); delete old.harbor.spoiled; delete old.harbor.grounds;
  hook('migrate', old); if (old.harbor.spoiled !== 0 || !old.harbor.grounds) fail('migrate');
  const none = clone(globalThis.OWN); delete none.harbor; hook('migrate', none); if (!none.harbor) fail('migrate none');
  const heir = clone(globalThis.OWN); H(heir).fresh = { cod: 3 }; hook('heir', heir, makeRng({ s: 1 }), heir.player);
  if (freshCount(heir) || !boat(heir)) fail('heir');
  for (const pl of Object.keys(HARBORS)) for (let m = 1; m <= 12; m++) { const c = clone(globalThis.OWN); placeAt(c, pl); c.date.month = m; checkInfo(c, `${pl} ${m}`); }
}

// 7. 포구에서 몇 해 살아 보기
{
  const g = fresh(50, 'saltrock'); g.player.money = 30;
  for (let i = 0; i < 48 && !g.over; i++) {
    placeAt(g, 'saltrock');
    month(g, ['harbor_boat', 'harbor_cure', 'harbor_fish']);
    if (g.player.money < 0) fail('negative money in play', g.player.money);
    checkInfo(g, `play ${i}`);
  }
  if (H(g).hauls < 10) fail('play hauls', H(g).hauls);
  if (verbose) console.log('play', { log: H(g).log.map((x) => x.text).join(' / '), hauls: H(g).hauls, earned: H(g).earned, boat: boat(g)?.kind, money: g.player.money, lost: H(g).lost.length });
}

if (verbose) for (const s of samples) console.log(s);
console.log(`harbortest: ${problems ? `${problems} problems` : 'ok'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (problems) process.exit(1);
