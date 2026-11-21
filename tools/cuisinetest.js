import '../src/content.js';
// 요리사의 길(src/cuisine/)을 브라우저 없이 돌려 보는 점검.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { cuisineStatus, cuisineLine, cuisineState as CU, newDish, bestDish } from '../src/cuisine/index.js';
import { crimeState } from '../src/crime.js';
import { NS, regionOf } from '../src/nature/state.js';

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
    if (/^cuisine_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^cuisine_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = cuisineStatus(g);
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
import { me } from '../src/game.js';

const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
const clearQ = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const nowMi = (g) => g.date.year * 12 + g.date.month;
function fresh(seed, pl = 'ern', cook = 30) {
  const g = adult(seed); placeAt(g, pl); heal(g);
  g.player.money = 2000; for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  g.player.skills.cooking = cook;
  const s = CU(g); Object.assign(s, { palate: {}, post: null, dishes: [], taster: null, fame: 0, rival: null, chief: false, eventAt: nowMi(g), contestAt: -99, feastAt: -99 });
  if (g.troupe) g.troupe.t = null; if (g.poor) g.poor.bond = null; if (g.army) g.army.service = null;
  if (g.court) g.court.disgrace = 0;
  L(g).job = null;
  return g;
}
function cook(seed, pl = 'harfen', kind = 'manor', rank = 1) {
  const g = fresh(seed, pl, 50);
  CU(g).post = { kind, place: pl, rank, favor: 40, months: 0, since: nowMi(g), away: 0, lord: '흔들 백작가' };
  CU(g).palate = { ern: nowMi(g), harfen: nowMi(g) };
  CU(g).dishes = [newDish(g, 'stew', 'ern', 60)];
  return g;
}

/* 1) 고장의 맛 */
{
  const g = fresh(501000); const m0 = g.player.money, k0 = g.player.skills.cooking;
  if (!can(g, 'cuisine_taste')) fail('cannot taste');
  const out = act('cuisine_taste').run(g, R(g));
  if (bad(out) || josa(out) || !CU(g).palate.ern || !(g.player.money < m0) || !(g.player.skills.cooking > k0)) fail('taste', out);
  if (can(g, 'cuisine_taste')) fail('taste again same year');
  CU(g).palate.ern -= 12; if (!can(g, 'cuisine_taste')) fail('taste after a year');
  const kid = fresh(501010); kid.player.skills.cooking = 0; if (can(kid, 'cuisine_create')) fail('create without skill/palate');
}

/* 2) 높은 집 부엌 */
{
  const g = fresh(502000, 'harfen', 30);
  L(g).job = { id: 'cook', place: 'harfen', months: 3, lastRank: 0 };
  if (!can(g, 'cuisine_kitchen')) fail('cannot seek kitchen');
  const r = direct(g, 'cuisine_kitchen', {}, 'manor');
  if (r.missing || CU(g).post?.kind !== 'manor' || CU(g).post.rank !== 0 || L(g).job) fail('join manor', JSON.stringify(CU(g).post), JSON.stringify(L(g).job));
  if (direct(g, 'cuisine_kitchen', {}, 'manor').skipped !== true) fail('kitchen twice');
  const low = fresh(502010, 'harfen', 10); if (can(low, 'cuisine_kitchen')) fail('kitchen without skill');
  // 궁정은 왕도에서, 솜씨와 이름이 있어야
  const c = fresh(502020, 'leocast', 50);
  if (!direct(c, 'cuisine_kitchen', {}, 'court').missing) fail('court without fame');
  CU(c).fame = 25; direct(c, 'cuisine_kitchen', {}, 'court'); if (CU(c).post?.kind !== 'court') fail('court join');
  // 부엌 일
  const m0 = g.player.money, f0 = CU(g).post.favor;
  const w = act('cuisine_cook').run(g, R(g));
  if (bad(w) || josa(w) || !(g.player.money > m0) || !(CU(g).post.favor > f0)) fail('kitchen work', w);
  placeAt(g, 'ern'); if (can(g, 'cuisine_cook') || can(g, 'cuisine_post')) fail('work away from post'); placeAt(g, 'harfen');
  // 살림: 오르기, 시식관, 가르치기, 떠나기
  if (!direct(g, 'cuisine_post', {}, 'rise').missing) fail('rise too early');
  CU(g).post.favor = 70; g.player.skills.cooking = 45; direct(g, 'cuisine_post', {}, 'rise'); if (CU(g).post.rank !== 1) fail('rise');
  direct(g, 'cuisine_post', {}, 'taster'); if (!CU(g).taster) fail('taster');
  direct(g, 'cuisine_post', {}, 'teach');
  direct(g, 'cuisine_post', {}, 'fire'); if (CU(g).taster) fail('fire taster');
  CU(g).post.favor = 70; g.player.skills.cooking = 65; direct(g, 'cuisine_post', {}, 'rise'); if (CU(g).post.rank !== 2 || !CU(g).chief) fail('chief');
  direct(g, 'cuisine_post', {}, 'leave'); if (CU(g).post || !CU(g).past.length) fail('leave');
  // 주방장을 지낸 사람은 궁정에 부주방장으로
  placeAt(g, 'leocast'); CU(g).fame = 0; direct(g, 'cuisine_kitchen', {}, 'court'); if (CU(g).post?.rank !== 1) fail('chief to court', JSON.stringify(CU(g).post));
}

/* 3) 내 요리 짓기와 내놓기 */
{
  const g = fresh(503000, 'harfen', 70);
  CU(g).palate = { ern: 1, harfen: 2, barka: 3 };
  const ch = SCENES.cuisine_create.choices(g, {});
  if (ch.length < 4 || ch.length > 7) fail('create choices', ch.length);
  for (const c of ch) if (bad(c.label) || josa(c.label)) fail('create label', c.label);
  const r = direct(g, 'cuisine_create', {}, (cs) => cs[0].key);
  if (CU(g).dishes.length !== 1 || bad(r.out)) fail('create', r.out);
  for (let i = 0; i < 6; i++) direct(g, 'cuisine_create', {}, (cs) => cs[0].key);
  if (CU(g).dishes.length !== 6) fail('dish cap', CU(g).dishes.length);
  if (!direct(g, 'cuisine_create', {}, 'make:sauce:verden').missing) fail('unknown palate dish');
  const m0 = g.player.money, d = bestDish(g), f0 = d.fame;
  if (!can(g, 'cuisine_serve')) fail('cannot serve');
  const out = act('cuisine_serve').run(g, R(g));
  if (bad(out) || josa(out) || !(g.player.money > m0) || !(d.fame > f0)) fail('serve', out);
  const small = fresh(503010, 'gruental', 40); CU(small).dishes = [newDish(small, 'stew', 'ern', 40)]; if (can(small, 'cuisine_serve')) fail('serve in hamlet');
}

/* 4) 요리 겨루기 */
{
  const g = fresh(504000, 'leocast', 100); CU(g).palate = Object.fromEntries(['ern', 'harfen', 'verden', 'leocast', 'gruental', 'eisen', 'solaris', 'serenia', 'barka', 'graubel'].map((p) => [p, 1])); CU(g).fame = 100;
  CU(g).dishes = [newDish(g, 'sauce', 'leocast', 100)];
  const m0 = g.player.money; direct(g, 'cuisine_contest', {}, (cs) => cs[0].key);
  if (CU(g).won !== 1 || !(g.player.money > m0) || !(CU(g).dishes[0].fame >= 12)) fail('contest win', CU(g).won);
  if (can(g, 'cuisine_contest')) fail('contest cooldown');
  const l = fresh(504010, 'leocast', 0); CU(l).palate = { ern: 1 }; CU(l).dishes = [newDish(l, 'stew', 'ern', 1)];
  direct(l, 'cuisine_contest', {}, (cs) => cs[0].key); if (CU(l).lostC !== 1 || CU(l).won) fail('contest lose');
  const b = fresh(504020, 'leocast', 50); CU(b).dishes = [newDish(b, 'stew', 'ern', 50)];
  const bm = b.player.money; direct(b, 'cuisine_contest', {}, 'bribe'); if (!(b.player.money <= bm - 30 + 200)) fail('bribe');
}

/* 5) 연회 */
{
  const g = cook(505000, 'leocast', 'court', 1); g.player.skills.cooking = 100; CU(g).fame = 100; CU(g).palate = Object.fromEntries(['ern', 'harfen', 'verden', 'leocast', 'gruental', 'eisen', 'solaris', 'serenia', 'barka', 'graubel'].map((p) => [p, 1]));
  const s0 = (g.court?.standing ?? 0), f0 = CU(g).post.favor;
  if (!can(g, 'cuisine_feast')) fail('cannot feast');
  direct(g, 'cuisine_feast', {}, 'lavish');
  if (!(CU(g).post.favor > f0) || !((g.court?.standing ?? 0) > s0) || CU(g).feasts !== 1) fail('feast win', CU(g).post.favor, g.court?.standing);
  if (can(g, 'cuisine_feast')) fail('feast cooldown');
  const b = cook(505010, 'harfen', 'manor', 1); b.player.skills.cooking = 0; CU(b).palate = { ern: 1 }; CU(b).fame = 0;
  const bf = CU(b).post.favor; direct(b, 'cuisine_feast', {}, 'plain'); if (!(CU(b).post.favor < bf)) fail('feast fail');
  const n = fresh(505020, 'harfen', 30); CU(n).fame = 10; if (can(n, 'cuisine_feast')) fail('feast without post or fame');
  CU(n).fame = 45; if (!can(n, 'cuisine_feast') || direct(n, 'cuisine_feast', {}, 'no').missing) fail('private feast');
  const t = cook(505030, 'harfen', 'manor', 1); CU(t).taster = { name: '시식관', months: 0, loyal: 50 };
  if (direct(t, 'cuisine_feast', {}, 'taste').missing) fail('feast taster choice');
}

/* 6) 사건 */
{
  const EVK = { plot: ['refuse', 'report', 'accept'], suspect: ['taster', 'probe', 'plead', 'flee'], taster: ['find', 'heal', 'mourn'], rival: ['face', 'outdo', 'sabotage', 'ignore'], shortage: ['make', 'buy', 'thin'], guest: ['sell', 'proud', 'more'], apprentice: ['teach', 'work', 'away'], spoiled: ['reject', 'cook', 'fresh'] };
  let n = 0;
  for (const [ev, keys] of Object.entries(EVK)) for (const k of keys) {
    const g = cook(506000 + n++ * 7); CU(g).taster = { name: '말수 적은 하인 오토', months: 0, loyal: 50 }; CU(g).rival = { name: '젊은 요리사 레온', grudge: 40 }; CU(g).fame = 30;
    const r = direct(g, 'cuisine_event', { ev }, k);
    if (r.skipped || r.missing) fail('event', ev, k, JSON.stringify(r));
  }
  const sh = cook(506490); NS(sh).active = [{ id: 1, kind: 'winter', region: regionOf('harfen'), sev: 0.5, left: 2 }];
  if (!/혹한이 들어/.test(SCENES.cuisine_event.text(sh, { ev: 'shortage' }))) fail('shortage disaster text', SCENES.cuisine_event.text(sh, { ev: 'shortage' }));
  const a = cook(506500); const m = a.player.money; direct(a, 'cuisine_event', { ev: 'plot' }, 'accept');
  if (a.player.money !== m + 200 || !crimeState(a).record.some((x) => x.c === 'murder')) fail('poison accept');
  const r2 = cook(506510); const f2 = CU(r2).post.favor; direct(r2, 'cuisine_event', { ev: 'plot' }, 'report'); if (!(CU(r2).post.favor > f2)) fail('poison report');
  const fl = cook(506520); direct(fl, 'cuisine_event', { ev: 'suspect' }, 'flee'); if (CU(fl).post) fail('flee keeps post');
  const h = cook(506530); CU(h).taster = { name: '오토', months: 0, loyal: 50 }; direct(h, 'cuisine_event', { ev: 'taster' }, 'heal'); if (!CU(h).taster) fail('heal taster');
  const mo = cook(506540); CU(mo).taster = { name: '오토', months: 0, loyal: 50 }; direct(mo, 'cuisine_event', { ev: 'taster' }, 'mourn'); if (CU(mo).taster) fail('mourn taster');
  const sb = cook(506550); CU(sb).rival = { name: '레온', grudge: 40 }; direct(sb, 'cuisine_event', { ev: 'rival' }, 'sabotage'); if (CU(sb).rival) fail('sabotage rival');
  // 형편이 안 맞으면 뜨지 않는다
  const p = fresh(506600); for (const ev of ['plot', 'suspect', 'taster', 'rival', 'guest', 'spoiled']) if (!direct(p, 'cuisine_event', { ev }, 'refuse').skipped) fail('event without state', ev);
  // 매달 일이 저절로 뜬다
  const q = cook(506700); CU(q).taster = { name: '오토', months: 0, loyal: 99 }; CU(q).fame = 30; const got = new Set();
  for (let i = 0; i < 80; i++) { clearQ(q); CU(q).eventAt = -99; if (!CU(q).post) CU(q).post = { kind: 'manor', place: 'harfen', rank: 1, favor: 40, months: 0, since: 0, away: 0, lord: '흔들 백작가' }; if (!CU(q).taster) CU(q).taster = { name: '오토', months: 0, loyal: 99 }; tick(q); for (const x of L(q).queue) if (x.kind === 'cuisine_event') got.add(x.ev); }
  if (got.size < 4) fail('monthly events', [...got]);
}

/* 7) 매달: 자리 비움, 시식관 품삯, 요리의 이름, 세상의 요리 */
{
  const g = cook(507000); placeAt(g, 'ern');
  for (let i = 0; i < 3; i++) tick(g);
  if (CU(g).post) fail('post kept while away');
  const t = cook(507010); CU(t).taster = { name: '오토', months: 0, loyal: 50 }; const m = t.player.money; tick(t);
  if (t.player.money !== m - 2 || CU(t).taster.months !== 1) fail('taster wage', m - t.player.money);
  t.player.money = 0; CU(t).taster.loyal = 20; tick(t); if (CU(t).taster) fail('unpaid taster stays');
  const d = cook(507020); CU(d).dishes[0].fame = 70; tick(d);
  if (!CU(d).dishes[0].title || !/'/.test(CU(d).log[0]?.text ?? '')) fail('dish title', JSON.stringify(CU(d).dishes[0]));
  const w = fresh(507030); for (let i = 0; i < 12 * 40 && !CU(w).world.length; i++) tick(w);
  if (!CU(w).world.length) fail('world dishes never appear');
  if (bad(cuisineLine(d)) || josa(cuisineLine(d)) || !/이름난 요리/.test(cuisineLine(d))) fail('line', cuisineLine(d));
}

/* 8) 대 잇기, 옛 저장, 저절로 */
{
  const heirFns = HOOKS.heir.filter((f) => /palate = \{\}/.test(String(f)));
  if (heirFns.length !== 1) fail('heir hook', heirFns.length);
  const h = cook(508000); CU(h).dishes.push(newDish(h, 'pie', 'harfen', 10)); CU(h).fame = 50;
  for (const f of heirFns) f(h);
  if (CU(h).post || CU(h).dishes.length !== 1 || CU(h).dishes[0].gen !== 2 || CU(h).dishes[0].q !== 51 || CU(h).fame !== 20 || Object.keys(CU(h).palate).length) fail('heir', JSON.stringify(CU(h)));
  const x = adult(508100);
  delete x.cuisine; runHooks('migrate', x);
  if (!x.cuisine || !Array.isArray(x.cuisine.dishes)) fail('migrate');
  x.cuisine = { palate: { ern: 'x', harfen: 5, nowhere: 3 }, post: { kind: 'manor', place: 'harfen', rank: 9, favor: 'x', lord: 3 }, dishes: [{ base: 'gone' }, { base: 'stew', place: 'ern', q: 'x', title: 4 }], taster: { name: 3 }, rival: { name: '레온' }, fame: 400, world: [{ chef: 3 }] };
  runHooks('migrate', x);
  const c = x.cuisine;
  if (Object.keys(c.palate).join() !== 'harfen' || c.post?.rank !== 2 || c.post.favor !== 0 || c.post.lord !== '영주' || c.dishes.length !== 1 || c.dishes[0].q !== 20 || c.dishes[0].title !== null || c.taster || c.rival || c.fame !== 100 || c.world.length) fail('migrate partial', JSON.stringify(c));
  if (JSON.stringify(cuisineStatus(x)).match(/NaN|undefined/)) fail('status');
  // 저절로 살아 보기
  let made = 0, posts = 0, won = 0;
  for (let run = 0; run < 4; run++) {
    const a = fresh(508200 + run, ['harfen', 'leocast', 'verden', 'ern'][run], 35);
    for (let mth = 0; mth < 96 && !a.over; mth++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.75) ? ((l) => { const r0 = rngOf(a); return l.map((v) => [r0.next ? r0.next() : r0.int(0, 999), v]).sort((p, q2) => p[0] - q2[0]).map((p) => p[1]); })(['cuisine_taste', 'cuisine_kitchen', 'cuisine_create', 'cuisine_cook', 'cuisine_feast', 'cuisine_contest', 'cuisine_post', 'cuisine_serve']) : [rngOf(a).pick(acts.filter((x2) => !x2.id.startsWith('travel') && x2.id !== 'house_move')).id];
      month(a, want, (k2, labels) => (k2 === 'cuisine_kitchen' ? labels.findIndex((l) => /든다/.test(l)) : k2 === 'cuisine_post' ? labels.findIndex((l) => /청한다|가르친다/.test(l)) : -1));
      if (CU(a).post) posts++;
      const line = cuisineLine(a); if (bad(line) || josa(line)) fail('line', line);
    }
    made += CU(a).dishes.length; won += CU(a).won;
  }
  console.log(`저절로 8년 4판: 남은 요리 ${made}, 부엌에 있던 달 ${posts}, 겨루기 이김 ${won}`);
  if (!made || !posts) fail('autoplay never cooked');
}

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('cuisine_')))));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
