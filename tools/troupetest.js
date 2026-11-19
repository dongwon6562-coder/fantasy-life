import '../src/content.js';
// 유랑극단과 떠돌이 재주꾼(src/troupe/)을 브라우저 없이 돌려 보는 점검.
// 1) 극단이 고장에 들어와 들기(재주에 따라), 일자리를 그만둠. 내 극단 꾸리기. 2) 무대: 고장마다 관객, 몫, 솜씨가 늚, 풍자극과 검열.
// 3) 옮기기: 함께 길에 오름, 남의 극단을 두고 따로 떠나면 나온 것, 내 극단은 따라옴, 삯. 4) 극단 안팎의 일 선택지마다.
// 5) 대 잇기, 옛 저장, 저절로 살아 보기.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { T, myTroupe, withTroupe, troupeStatus, troupeLine, ACT_IDS, actSkill, nextStops, FOUND_COST } from '../src/troupe/index.js';

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
    if (/^troupe_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^troupe_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = troupeStatus(g);
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

const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
const clearQ = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const talent = (g) => { g.player.stats.cha = 50; g.player.stats.agi = 45; g.player.stats.int = 40; g.player.skills.music = 40; };
function member(seed, pl = 'harfen', key = 'music') {
  const g = adult(seed); placeAt(g, pl); heal(g); talent(g); g.player.money = 100; T(g).t = null;
  const r = direct(g, 'troupe_arrive', { name: '잿빛 수레' }, key);
  if (r.skipped || r.missing || !myTroupe(g)) fail('join', pl, key, JSON.stringify(r), L(g).travel, g.army?.service, g.poor?.bond, g.explore?.exp, g.crime?.jailed, g.over, !!myTroupe(g));
  return g;
}
function owner(seed, pl = 'harfen') {
  const g = adult(seed); placeAt(g, pl); heal(g); talent(g); g.player.money = 1000; T(g).t = null;
  if (!can(g, 'troupe_found')) fail('cannot found', pl);
  act('troupe_found').run(g, R(g));
  if (!myTroupe(g)?.own) fail('found');
  return g;
}

/* 1) 들기와 꾸리기 */
{
  const g = adult(101000); placeAt(g, 'harfen'); heal(g); T(g).t = null;
  for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 10; g.player.skills.music = 0;
  const r = direct(g, 'troupe_arrive', { name: '잿빛 수레' }, 'music');
  if (!r.missing) fail('join as musician without skill');
  direct(g, 'troupe_arrive', { name: '잿빛 수레' }, 'hand');
  if (!myTroupe(g) || myTroupe(g).myAct) fail('join as hand');
  const j = adult(101010); placeAt(j, 'harfen'); talent(j); T(j).t = null; L(j).job = { id: 'farmer', place: 'harfen', months: 3, lastRank: 0 };
  direct(j, 'troupe_arrive', { name: '잿빛 수레' }, 'clown');
  if (L(j).job || myTroupe(j)?.myAct !== 'clown') fail('job not left', JSON.stringify(L(j).job));
  const o = owner(101020);
  if (o.player.money !== 1000 - FOUND_COST || myTroupe(o).members.length !== 3) fail('found cost', o.player.money);
  if (can(o, 'troupe_found')) fail('found twice');
  const e = adult(101030); placeAt(e, 'ern'); talent(e); T(e).t = null; e.player.money = 1000; if (can(e, 'troupe_found')) fail('found in village');
}

// 극단이 들어오면 두 달 머문다, 찾아가야 장면이 뜬다
{
  const g = adult(101040); placeAt(g, 'harfen'); talent(g); T(g).t = null; T(g).arriveAt = -99; T(g).visiting = null;
  let came = false;
  for (let i = 0; i < 80 && !came; i++) { clearQ(g); placeAt(g, 'harfen'); T(g).arriveAt = -99; tick(g); came = !!T(g).visiting; }
  if (!came) fail('troupe never came');
  if (L(g).queue.some((q) => q.kind === 'troupe_arrive')) fail('arrive scene pushed');
  if (!can(g, 'troupe_join')) fail('cannot visit troupe', JSON.stringify(T(g).visiting), L(g).place, g.date.year * 12 + g.date.month, !!myTroupe(g), playerAge(g), L(g).travel, g.army?.service);
  act('troupe_join').run(g, R(g));
  if (!L(g).queue.some((q) => q.kind === 'troupe_arrive')) fail('join scene');
  T(g).visiting.until = 0; if (can(g, 'troupe_join')) fail('troupe gone');
}

/* 2) 무대 */
{
  const g = member(102000, 'harfen', 'music');
  const m0 = g.player.money, k0 = g.player.skills.music;
  const r = direct(g, 'troupe_show', {}, 'music');
  if (r.skipped || g.player.money <= m0 || g.player.skills.music <= k0 || T(g).shows !== 1) fail('show', g.player.money - m0);
  // 내 극단은 다 내 몫, 단원은 나눠 갖는다
  const o = owner(102010, 'harfen'); myTroupe(o).fame = myTroupe(g).fame;
  const a = o.player.money; direct(o, 'troupe_show', {}, 'music');
  console.log(`하르펜 공연 한 번: 단원 몫 은화 ${g.player.money - m0}닢, 내 극단 은화 ${o.player.money - a}닢`);
  // 광대 솜씨가 쌓인다
  const c = member(102020, 'ern', 'clown'); const s0 = T(c).skill.clown;
  for (let i = 0; i < 5; i++) direct(c, 'troupe_show', {}, 'clown');
  if (!(T(c).skill.clown > s0)) fail('clown skill');
  // 고장마다 관객: 엘프 마을은 노래, 에른은 광대
  const tastes = {}; for (const pl of ['ern', 'silverleaf', 'leocast', 'barka', 'solaris']) { const x = member(102100 + pl.length, pl, 'music'); tastes[pl] = (troupeStatus(x).taste.likes.find((l) => l.id === 'music').mult); }
  if (!(tastes.silverleaf > tastes.ern)) fail('taste', JSON.stringify(tastes));
  // 풍자극: 자유도시는 검열이 없고, 성도는 걸린다
  let censored = 0;
  for (let i = 0; i < 6; i++) { const s = member(102200 + i, 'solaris', 'play'); s.player.stats.int = 60; clearQ(s); direct(s, 'troupe_show', {}, 'satire'); if (L(s).queue.some((q) => q.kind === 'troupe_event' && q.ev === 'censor')) censored++; }
  const b = member(102300, 'barka', 'play'); clearQ(b); direct(b, 'troupe_show', {}, 'satire');
  if (L(b).queue.some((q) => q.kind === 'troupe_event' && q.ev === 'censor')) fail('censor in free city');
  if (!censored) fail('never censored in holy city');
  console.log(`성도 풍자극 6번 중 검열 ${censored}번`);
  // 쫓겨난 고장에서는 무대에 못 선다
  const x = member(102400, 'solaris', 'play'); T(x).banned.solaris = x.date.year * 12 + x.date.month + 5;
  if (can(x, 'troupe_show')) fail('show while banned');
}

/* 3) 옮기기 */
{
  const g = member(103000, 'harfen');
  for (let i = 0; i < 2; i++) { clearQ(g); tick(g); }
  const q = L(g).queue.find((x) => x.kind === 'troupe_move');
  if (!q) fail('move not queued after 2 months');
  clearQ(g);
  const to = nextStops('harfen')[myTroupe(g).shows % nextStops('harfen').length];
  direct(g, 'troupe_move', {}, `to:${to}`);
  if (!L(g).travel || L(g).travel.to !== to || myTroupe(g).place !== to) fail('move travel');
  // 닿을 때까지
  for (let i = 0; i < 6 && L(g).travel; i++) { L(g).travel.left -= 1; if (L(g).travel.left <= 0) { L(g).place = L(g).travel.to; L(g).travel = null; } clearQ(g); tick(g); }
  if (!myTroupe(g) || L(g).place !== to) fail('arrived with troupe', L(g).place, myTroupe(g)?.place);
  // 남의 극단을 두고 따로 떠나면
  const h = member(103010, 'harfen'); placeAt(h, 'verden'); clearQ(h); tick(h);
  if (myTroupe(h) || !T(h).past.length) fail('member left behind');
  // 내 극단은 따라온다, 삯을 낸다
  const o = owner(103020, 'harfen'); placeAt(o, 'verden'); const m = o.player.money; clearQ(o); tick(o);
  if (myTroupe(o)?.place !== 'verden' || m - o.player.money < myTroupe(o).members.length * 2) fail('own follows / wages', myTroupe(o)?.place, m - o.player.money);
  // 삯을 못 주면 떠난다
  const p = owner(103030, 'harfen'); p.player.money = 0; for (const x of myTroupe(p).members) x.mood = 20;
  clearQ(p); tick(p); if (myTroupe(p).members.length) fail('unpaid members stay');
  // 남아서 나오기
  const s = member(103040); direct(s, 'troupe_move', {}, 'leave'); if (myTroupe(s)) fail('leave at move');
}

/* 4) 극단 안팎의 일 */
{
  let n = 0;
  const setup = (seed, own = false) => { const g = own ? owner(seed) : member(seed); g.player.money = 300; return g; };
  const ROAD = { axle: ['pay', 'fix'], bandits: ['pay', 'fight', 'play'], river: ['wait', 'cross'], sick: ['pay', 'carry', 'leave'], mud: ['push', 'drop'] };
  for (const [kind, keys] of Object.entries(ROAD)) for (const k of keys) { const g = setup(104000 + n++); const r = direct(g, 'troupe_event', { ev: 'road', kind }, k); if (r.skipped || r.missing) fail('road', kind, k, JSON.stringify(r)); }
  for (const k of ['fine', 'burn', 'flee', 'stand']) {
    const g = setup(104100 + n++); placeAt(g, 'solaris'); myTroupe(g).place = 'solaris';
    const r = direct(g, 'troupe_event', { ev: 'censor', pl: 'solaris' }, k);
    if (r.skipped || r.missing) fail('censor', k, JSON.stringify(r));
    if ((k === 'flee' || k === 'stand') && !(T(g).banned.solaris > 0)) fail('censor ban', k);
    if (k === 'flee' && !L(g).travel) fail('censor flee travel');
  }
  for (const k of ['a', 'b', 'drink', 'bench']) { const g = setup(104200 + n++, true); const [a, b] = myTroupe(g).members; const r = direct(g, 'troupe_event', { ev: 'quarrel', a: a.id, b: b.id }, k); if (r.skipped || r.missing) fail('quarrel', k); }
  for (const k of ['yes', 'no']) { const g = setup(104300 + n++); const a = myTroupe(g).members[0]; direct(g, 'troupe_event', { ev: 'love', a: a.id }, k); if (k === 'yes' && a.love < 60) fail('love'); }
  for (const k of ['settle', 'wait', 'end']) { const g = setup(104400 + n++); myTroupe(g).members[0].love = 70; const r = direct(g, 'troupe_event', { ev: 'lover' }, k); if (r.skipped) fail('lover', k); if (k === 'settle' && myTroupe(g)) fail('settle'); }
  for (const k of ['merry', 'flatter', 'satire', 'no']) { const g = setup(104500 + n++); g.player.stats.int = 70; T(g).skill.play = 40; const r = direct(g, 'troupe_event', { ev: 'feast' }, k); if (r.skipped || r.missing) fail('feast', k, JSON.stringify(r)); }
  for (const k of ['accuse', 'let', 'lock']) { const g = setup(104600 + n++, true); const r = direct(g, 'troupe_event', { ev: 'theft' }, k); if (r.skipped || r.missing) fail('theft', k); }
  // 남의 극단에서는 돈궤 도둑이 뜨지 않는다
  if (!direct(setup(104700), 'troupe_event', { ev: 'theft' }, 'let').skipped) fail('theft in others troupe');
  // 극단 살림
  for (const k of ['hire', 'fire', 'fix', 'move', 'disband', 'none']) { const g = setup(104800 + n++, true); myTroupe(g).wagon = 40; const r = direct(g, 'troupe_manage', {}, k); if (r.skipped || r.missing) fail('manage', k, JSON.stringify(r)); }
  for (const k of ['lead', 'leave', 'none']) { const g = setup(104900 + n++); const r = direct(g, 'troupe_manage', {}, k); if (r.skipped || r.missing) fail('member manage', k, JSON.stringify(r)); }
  const f = setup(104950, true); const id = myTroupe(f).members[0].id; direct(f, 'troupe_fire', {}, `m:${id}`); if (myTroupe(f).members.some((m) => m.id === id)) fail('fire');
}

/* 5) 대 잇기, 옛 저장, 저절로 */
{
  const heirFns = HOOKS.heir.filter((f) => /myTroupe/.test(String(f)) && /gens \+= 1/.test(String(f)));
  const o = owner(105000); for (const f of heirFns) f(o);
  if (myTroupe(o)?.gens !== 2) fail('heir own', myTroupe(o)?.gens);
  const m = member(105010); for (const f of heirFns) f(m);
  if (myTroupe(m)) fail('heir member');
  const x = adult(105020);
  delete x.troupe; runHooks('migrate', x);
  if (!x.troupe || !Array.isArray(x.troupe.past)) fail('migrate');
  x.troupe = { t: { name: '흔들', place: 'harfen', members: [{ act: 'gone' }, { name: 'a', act: 'clown' }], fame: 'x', myAct: 'gone', moving: 'nowhere' }, banned: [], skill: null };
  runHooks('migrate', x);
  const t = x.troupe.t;
  if (!t || t.members.length !== 1 || t.myAct !== null || t.moving !== null || !Number.isFinite(t.fame) || Array.isArray(x.troupe.banned)) fail('migrate partial', JSON.stringify(x.troupe));
  x.troupe.visiting = { name: 1 }; runHooks('migrate', x); if (x.troupe.visiting) fail('migrate visiting');
  if (JSON.stringify(troupeStatus(x)).match(/NaN|undefined/)) fail('status');
  let shows = 0, joined = 0, moves = 0;
  for (let run = 0; run < 4; run++) {
    const a = adult(105100 + run); placeAt(a, ['harfen', 'leocast', 'barka', 'verden'][run]); talent(a); a.player.money = 400; T(a).t = null;
    if (run % 2) direct(a, 'troupe_arrive', { name: '잿빛 수레' }, 'music'); else act('troupe_found').run(a, R(a));
    const start = L(a).place;
    for (let mth = 0; mth < 96 && !a.over; mth++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.7) ? ['troupe_show', 'troupe_show', 'troupe_manage'] : [rngOf(a).pick(acts.filter((x) => !x.id.startsWith('travel') && x.id !== 'house_move')).id];
      month(a, want, (k, labels) => (k === 'troupe_move' ? labels.findIndex((l) => !/나온다|머문다/.test(l)) : k === 'troupe_manage' ? labels.findIndex((l) => /그대로/.test(l)) : -1));
      const line = troupeLine(a); if (bad(line) || josa(line)) fail('line', line);
      if (myTroupe(a) && L(a).place !== start) moves++;
    }
    shows += T(a).shows; joined += myTroupe(a) ? 1 : 0;
  }
  console.log(`저절로 8년 4판: 공연 ${shows}번, 끝까지 극단에 남은 판 ${joined}, 다른 고장에 있던 달 ${moves}`);
  if (!shows || !moves) fail('autoplay never toured');
}

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('troupe_')))));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
