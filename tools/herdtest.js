import '../src/content.js';
// 목축과 유목(src/herd/)을 브라우저 없이 돌려 보는 점검.
// 1) 목동 일, 장터(사고팔기·꼴·통째로), 2) 떼 돌보기 선택지마다, 명마, 3) 매달: 봄 새끼·겨울 꼴·병·일꾼·비워 둔 떼, 소 훔치기.
// 4) 유목민 무리: 들기, 철 따라 옮기기, 떨어지면 나옴, 무리 일. 5) 사건 선택지마다, 대 잇기, 옛 저장, 저절로.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { herdStatus, herdLine, herdState as HD, flock, newFlock, BANDS, bandCamp } from '../src/herd/index.js';
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
    if (/^herd_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^herd_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = herdStatus(g);
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
function fresh(seed, pl = 'ern') {
  const g = adult(seed); placeAt(g, pl); heal(g);
  g.player.money = 2000; g.player.stats.wil = 40; g.player.stats.sen = 40; g.player.stats.agi = 40; g.player.stats.cha = 40; g.player.stats.str = 40;
  const s = HD(g); s.flock = null; s.band = null; s.steeds = []; s.neighbor = null; s.skill = 30; s.prices = { sheep: 1, cattle: 1, horses: 1 }; s.eventAt = nowMi(g);
  if (g.troupe) g.troupe.t = null; if (g.poor) g.poor.bond = null; if (g.beasts) g.beasts.animals = [];
  L(g).job = null;
  return g;
}
function rancher(seed, pl = 'ern', stock = { sheep: 20, cattle: 4, horses: 3 }) {
  const g = fresh(seed, pl);
  const f = newFlock(g); Object.assign(f, stock); f.fodder = 0; f.health = 80;
  HD(g).flock = f;
  return g;
}
const setMonth = (g, m) => { g.date.month = m; };

/* 1) 목동 일과 장터 */
{
  const g = fresh(401000); const s0 = HD(g).skill, m0 = g.player.money;
  if (!can(g, 'herd_work')) fail('cannot herd');
  const out = act('herd_work').run(g, R(g));
  if (bad(out) || josa(out) || !(HD(g).skill > s0) || !(g.player.money > m0)) fail('herd work', out);
  const town = fresh(401010, 'serenia'); if (can(town, 'herd_work') || can(town, 'herd_market')) fail('herd in city');
  // 사면 떼가 생긴다
  const b = fresh(401020);
  if (direct(b, 'herd_market', {}, 'buy:sheep').missing || flock(b)?.sheep !== 5 || flock(b).place !== 'ern') fail('buy first', JSON.stringify(flock(b)));
  direct(b, 'herd_market', {}, 'buy:cattle'); direct(b, 'herd_market', {}, 'buy:horses');
  if (flock(b).cattle !== 1 || flock(b).horses !== 1) fail('buy more');
  const mm = b.player.money; direct(b, 'herd_market', {}, 'sell:sheep'); if (flock(b).sheep !== 0 || !(b.player.money > mm)) fail('sell');
  direct(b, 'herd_market', {}, 'fodder'); if (!(flock(b).fodder > 0)) fail('fodder');
  // 다른 고장에서는 내 떼를 사고팔 수 없다
  placeAt(b, 'harfen'); if (can(b, 'herd_market') || can(b, 'herd_tend')) fail('market away from flock');
  placeAt(b, 'ern'); direct(b, 'herd_market', {}, 'all'); if (flock(b) || !HD(b).past.length) fail('sell all');
  // 시세: 비싸면 비싸게
  const p = fresh(401030); HD(p).prices.cattle = 2; const lab = SCENES.herd_market.choices(p, {}).map((c) => c.label).join('|');
  if (!/소 1마리를 산다 \(은화 56닢\)/.test(lab)) fail('price', lab);
}

/* 2) 떼 돌보기, 명마 */
{
  for (const [key, month] of [['hay', 7], ['graze', 5], ['wool', 5], ['hire', 5], ['no', 5]]) {
    const g = rancher(402000 + key.length + month); setMonth(g, month); const f = flock(g);
    const before = JSON.stringify(f);
    const r = direct(g, 'herd_tend', {}, key);
    if (r.missing || r.skipped) { fail('tend', key, JSON.stringify(r)); continue; }
    if (key === 'hay' && !(f.fodder > 0)) fail('hay');
    if (key === 'hire' && f.hands !== 1) fail('hire');
    if (key !== 'no' && JSON.stringify(f) === before && key !== 'wool') fail('tend no change', key);
  }
  const w = rancher(402100); setMonth(w, 1); if (!direct(w, 'herd_tend', {}, 'hay').missing) fail('hay in winter');
  // 병 돌보기
  const sk = rancher(402110); flock(sk).sick = { kind: 'rot', left: 3 }; direct(sk, 'herd_tend', {}, 'treat'); if (flock(sk).sick && flock(sk).sick.left !== 2) fail('treat', JSON.stringify(flock(sk).sick));
  // 혈통 잇기와 길들이기, 내놓기
  const h = rancher(402120); HD(h).skill = 60;
  if (direct(h, 'herd_tend', {}, 'breed').missing || HD(h).steeds.length !== 1) fail('breed');
  const st = HD(h).steeds[0]; st.born = nowMi(h) - 40;
  for (let i = 0; i < 12 && st.trained < 100; i++) direct(h, 'herd_tend', {}, 'train');
  if (st.trained < 100) fail('train', st.trained);
  if (!can(h, 'herd_steed')) fail('steed ready');
  for (const key of ['sell', 'gift', 'race', 'keep']) {
    const x = rancher(402200 + key.length); HD(x).steeds = [{ id: 1, name: '밤바람', q: 80, born: nowMi(x) - 48, trained: 100, fame: 0 }];
    const m0 = x.player.money; const r = direct(x, 'herd_steed', {}, key);
    if (r.missing || r.skipped) { fail('steed', key, JSON.stringify(r)); continue; }
    if (key === 'sell' && (HD(x).steeds.length || x.player.money - m0 !== 640)) fail('steed sell', x.player.money - m0);
    if (key === 'gift' && HD(x).steeds.length) fail('steed gift');
    if (key === 'keep' && (!HD(x).steeds[0]?.kept || can(x, 'herd_steed') !== true)) fail('steed keep');
  }
}

/* 3) 매달 */
{
  // 봄이면 새끼가 는다
  const s = rancher(403000); setMonth(s, 4); flock(s).health = 90; const n0 = flock(s).sheep; tick(s); if (!(flock(s).sheep > n0)) fail('spring births', flock(s).sheep, n0);
  // 겨울에 꼴이 없으면 굶어 죽고, 있으면 버틴다
  const w = rancher(403010); setMonth(w, 1); flock(w).fodder = 0; const h0 = flock(w).sheep + flock(w).cattle + flock(w).horses; tick(w);
  if (!(flock(w).sheep + flock(w).cattle + flock(w).horses < h0)) fail('winter starve');
  const w2 = rancher(403020); setMonth(w2, 1); flock(w2).fodder = 50; const h2 = flock(w2).sheep + flock(w2).cattle + flock(w2).horses; tick(w2);
  if (flock(w2).sheep + flock(w2).cattle + flock(w2).horses !== h2 || !(flock(w2).fodder < 50)) fail('winter fed', flock(w2).fodder);
  // 병은 짐승을 죽이고 언젠가 지나간다
  const k = rancher(403030); setMonth(k, 7); flock(k).sick = { kind: 'murrain', left: 1 }; const c0 = flock(k).cattle; tick(k);
  if (!(flock(k).cattle < c0) || flock(k).sick) fail('sickness', flock(k).cattle, JSON.stringify(flock(k).sick));
  // 일꾼 삯을 못 주면 떠난다
  const hd = rancher(403040); setMonth(hd, 7); flock(hd).hands = 2; hd.player.money = 0; tick(hd); if (flock(hd).hands !== 1) fail('hands leave');
  // 비워 둔 떼는 축난다
  const aw = rancher(403050); setMonth(aw, 7); placeAt(aw, 'leocast'); flock(aw).health = 80; tick(aw); if (!(flock(aw).health < 80)) fail('away flock');
  // 다 없어지면 떼가 끝난다
  const z = rancher(403060, 'ern', { sheep: 0, cattle: 0, horses: 0 }); setMonth(z, 7); tick(z); if (flock(z)) fail('empty flock');
  // 시세는 석 달마다 움직인다
  const p = fresh(403070); HD(p).priceAt = -99; const pr = JSON.stringify(HD(p).prices); tick(p); if (JSON.stringify(HD(p).prices) === pr) fail('prices fixed');
  // 소 훔치기: 되면 소가 늘고, 안 되면 죄가 남는다
  let got = false, caught = false;
  for (let i = 0; i < 30 && !(got && caught); i++) {
    const r = rancher(403100 + i); crimeState(r).craft = i % 2 ? 80 : 0; HD(r).skill = i % 2 ? 80 : 0; r.player.stats.agi = i % 2 ? 80 : 0;
    const c1 = flock(r).cattle; const rec = crimeState(r).record.length; const out = act('herd_rustle').run(r, R(r));
    if (bad(out) || josa(out)) fail('rustle text', out);
    if (flock(r).cattle > c1) got = true;
    if (crimeState(r).record.length > rec) caught = true;
  }
  if (!got || !caught) fail('rustle outcomes', got, caught);
}

/* 4) 유목민 무리 */
{
  // 갈색 천막 무리: 겨울에 에른, 봄에 하르펜
  const g = rancher(404000, 'ern'); setMonth(g, 1);
  if (!can(g, 'herd_band_join')) fail('band here');
  L(g).job = { id: 'farmer', place: 'ern', months: 3, lastRank: 0 };
  const r = direct(g, 'herd_band', { id: 'brown' }, 'join');
  if (r.missing || HD(g).band?.id !== 'brown' || L(g).job) fail('join band', JSON.stringify(r), JSON.stringify(HD(g).band));
  if (!can(g, 'herd_band_life') || !can(g, 'herd_work')) fail('band actions');
  setMonth(g, 2); clearQ(g); tick(g);
  if (!L(g).travel || L(g).travel.to !== 'harfen' || flock(g).place !== 'harfen' || HD(g).band.camp !== 'harfen') fail('band moves', JSON.stringify(L(g).travel), flock(g)?.place, HD(g).band?.camp);
  // 무리를 두고 다른 데 있으면 나온 것
  const l = fresh(404010, 'ern'); setMonth(l, 1); direct(l, 'herd_band', { id: 'brown' }, 'join'); placeAt(l, 'leocast'); clearQ(l); tick(l);
  if (HD(l).band) fail('left band');
  // 솜씨 없으면 바로 들 수 없다
  const n = fresh(404020, 'ern'); HD(n).skill = 0; setMonth(n, 1); if (!direct(n, 'herd_band', { id: 'brown' }, 'join').missing) fail('join without skill');
  direct(n, 'herd_band', { id: 'brown' }, 'prove'); if (HD(n).band && HD(n).skill < 15) fail('prove');
  // 무리 안의 일
  for (const key of ['break', 'council', 'rest', 'leave']) {
    const x = fresh(404100 + key.length, 'ern'); setMonth(x, 1); direct(x, 'herd_band', { id: 'brown' }, 'join'); HD(x).band.standing = 75;
    const r2 = direct(x, 'herd_band_life', {}, key);
    if (r2.missing || r2.skipped) { fail('band life', key, JSON.stringify(r2)); continue; }
    if (key === 'council' && !HD(x).band.elder) fail('elder');
    if (key === 'leave' && HD(x).band) fail('leave');
  }
  // 무리가 없는 철에는 찾아갈 수 없다
  const e = fresh(404200, 'ern'); setMonth(e, 7); if (can(e, 'herd_band_join')) fail('band off season');
  // 털가죽 무리의 자리
  if (bandCamp('fur', 7) !== 'silverleaf' || bandCamp('fur', 1) !== 'fur') fail('fur camps');
}

/* 5) 사건, 대 잇기, 옛 저장, 저절로 */
{
  const flockEvs = { sick: ['isolate', 'doctor', 'cull', 'wait'], wolves: ['watch', 'trap', 'hunter', 'pen'], rustlers: ['watch', 'guard', 'face', 'brand'], neighbor: ['share', 'buy', 'stand', 'move'], dealer: ['sell', 'horses', 'no'] };
  let n = 0;
  for (const [ev, keys] of Object.entries(flockEvs)) for (const key of keys) {
    const g = rancher(405000 + n++); setMonth(g, 6);
    if (ev === 'sick') flock(g).sick = { kind: 'rot', left: 3 };
    if (ev === 'neighbor') HD(g).neighbor = { name: '과부 헤라의 목장', grudge: 45 };
    const r = direct(g, 'herd_event', { ev }, key);
    if (r.missing || r.skipped) { fail('flock ev', ev, key, JSON.stringify(r)); continue; }
    if (ev === 'dealer' && key === 'sell' && flock(g)) fail('dealer sell');
    if (ev === 'sick' && key === 'cull' && flock(g)?.sick) fail('cull');
  }
  const bandEvs = { raid: ['fight', 'chase', 'mine'], race: ['steed', 'ride', 'watch'], dzud: ['share', 'mine', 'south'] };
  for (const [ev, keys] of Object.entries(bandEvs)) for (const key of keys) {
    const g = rancher(405100 + n++); setMonth(g, 1); direct(g, 'herd_band', { id: 'brown' }, 'join');
    HD(g).steeds = [{ id: 1, name: '천둥발', q: 75, born: nowMi(g) - 50, trained: 100, fame: 0 }];
    const s0 = HD(g).band.standing;
    const r = direct(g, 'herd_event', { ev }, key);
    if (r.missing || r.skipped) { fail('band ev', ev, key, JSON.stringify(r)); continue; }
    if (key === 'mine' && !(HD(g).band.standing < s0)) fail('mine standing', ev);
  }
  // 형편이 안 맞으면 뜨지 않는다
  const p = fresh(405300); for (const ev of ['wolves', 'dealer', 'raid', 'sick', 'neighbor']) if (!direct(p, 'herd_event', { ev }, 'no').skipped) fail('event without state', ev);
  // 매달 일이 저절로 뜬다
  const q = rancher(405400); const got = new Set();
  for (let i = 0; i < 60; i++) { clearQ(q); HD(q).eventAt = -99; if (!flock(q)) HD(q).flock = Object.assign(newFlock(q), { sheep: 20, cattle: 4, horses: 3, fodder: 50 }); flock(q).fodder = 50; tick(q); for (const x of L(q).queue) if (x.kind === 'herd_event') got.add(x.ev); }
  if (got.size < 3) fail('monthly events', [...got]);
  // 대 잇기
  const heirFns = HOOKS.heir.filter((f) => /gens \+= 1/.test(String(f)) && /standing/.test(String(f)));
  if (heirFns.length !== 1) fail('heir hook', heirFns.length);
  const hh = rancher(405500); setMonth(hh, 1); direct(hh, 'herd_band', { id: 'brown' }, 'join'); HD(hh).band.standing = 80; for (const f of heirFns) f(hh);
  if (flock(hh)?.gens !== 2 || HD(hh).band.standing !== 48) fail('heir', JSON.stringify(flock(hh)), HD(hh).band?.standing);
  // 옛 저장
  const x = adult(405600);
  delete x.herd; runHooks('migrate', x);
  if (!x.herd || !x.herd.prices) fail('migrate');
  x.herd = { flock: { place: 'ern', sheep: 'x', cattle: 3.6, sick: { kind: 'gone' }, hands: 30 }, band: { id: 'brown', camp: 'nowhere' }, steeds: [{ name: 3 }, { name: '말' }], neighbor: { name: 3 }, prices: { sheep: 9 } };
  runHooks('migrate', x);
  const f = x.herd.flock;
  if (!f || f.sheep !== 0 || f.cattle !== 4 || f.sick || f.hands !== 6 || x.herd.band.camp !== bandCamp('brown', x.date.month) || x.herd.steeds.length !== 1 || x.herd.neighbor || x.herd.prices.sheep !== 2.5) fail('migrate partial', JSON.stringify(x.herd));
  if (JSON.stringify(herdStatus(x)).match(/NaN|undefined/)) fail('status');
  if (bad(herdLine(x)) || josa(herdLine(x))) fail('line', herdLine(x));
  // 저절로 살아 보기
  let born = 0, sold = 0, banded = 0;
  for (let run = 0; run < 4; run++) {
    const a = fresh(405700 + run, ['ern', 'gruental', 'fur', 'graubel'][run]);
    for (let mth = 0; mth < 96 && !a.over; mth++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.75) ? (flock(a) ? ['herd_tend', 'herd_market', 'herd_steed', 'herd_work'] : ['herd_market', 'herd_band_join', 'herd_work']) : [rngOf(a).pick(acts.filter((x2) => !x2.id.startsWith('travel') && x2.id !== 'house_move')).id];
      month(a, want, (k2, labels) => (k2 === 'herd_market' ? labels.findIndex((l) => (flock(a) && head0(a) > 40 ? /판다/ : /산다/).test(l)) : k2 === 'herd_tend' ? labels.findIndex((l) => /꼴|풀밭|혈통|길들인다/.test(l)) : -1));
      if (HD(a).band) banded++;
      const line = herdLine(a); if (bad(line) || josa(line)) fail('line', line);
    }
    born += HD(a).born; sold += HD(a).sold;
  }
  console.log(`저절로 8년 4판: 태어난 새끼 ${born}, 판 짐승 ${sold}, 무리에 있던 달 ${banded}`);
  if (!born) fail('autoplay never bred');
}
function head0(g) { const f = flock(g); return f ? f.sheep + f.cattle + f.horses : 0; }

console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('herd_')))));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
