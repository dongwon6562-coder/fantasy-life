import '../src/content.js';
// 마도구 장인(src/artifice/, 45단계) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/artificetest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES, sceneQueued } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { makeRng } from '../src/rng.js';
import { takeJob } from '../src/jobs.js';
import { me, circleOf } from '../src/game.js';

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

import { run as hooks } from '../src/hooks.js';
import { artificeInfo, artificeLine, artificeState as A } from '../src/artifice/index.js';
import { BASES, WORKSHOP, stoneCost, mi } from '../src/artifice/core.js';
import { blastChance } from '../src/artifice/life.js';

function fresh(seed, pl, { mage = false, art = 0, money = 200 } = {}) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = money;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 60;
  L(g).gear = { weapon: 3, weaponName: '낡은 칼', armor: 0 };
  g.artifice = undefined; A(g).art = art;
  if (g.tower) g.tower.member = null;
  if (g.sword) g.sword.blade = 0;
  if (mage) {
    g.player.manaAwakened = true; g.player.mana = 100; g.player.skills.magic = 50;
    g.magic ??= { known: [] };
    g.magic.known = ['firebolt', 'shield', 'mend', 'light', 'icebolt', 'earthwall', 'focus'];
  } else { g.player.manaAwakened = false; g.player.mana = 0; }
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
  if (ch.length > 8) fail('too many choices', kind, ch.length);
  if (!ch.some((c) => c.key === key)) return { missing: true, keys: ch.map((c) => c.key) };
  const out = def.resolve(g, R(g), s, key);
  if (bad(out) || josa(out)) fail('scene out', kind, key, out);
  if (g.player.money < 0) fail('negative money', kind, key);
  if (samples.length < 140) samples.push(`[${ti}] ${key} → ${out}`);
  return { out, s, keys: ch.map((c) => c.key) };
}
const checkInfo = (g, where) => {
  const s = JSON.stringify(artificeInfo(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 300));
  const l = artificeLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money act', id); if (samples.length < 140) samples.push(`(${id}) ${out}`); return out; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; hooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); if (i % 12 === 0) checkInfo(g, 'adv'); } };
const drop = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };
const clone = (g) => JSON.parse(JSON.stringify(g));
const take = (g, kind) => { const s = L(g).queue.find((x) => x.kind === kind); if (s) L(g).queue = L(g).queue.filter((x) => x !== s); return s ?? null; };
const strip = (s) => { const o = { ...s }; delete o.kind; delete o.at; delete o.t; return o; };
// 새기는 일을 끝까지: 터지면 엎드리고, 다 되면 doneKey
function work(g, doneKey = 'keep', max = 60) {
  for (let i = 0; i < max; i++) {
    g.player.fatigue = 0;
    if (!A(g).job) return true;
    runAct(g, 'af_make');
    const b = take(g, 'af_blast'); if (b) direct(g, 'af_blast', strip(b), 'duck');
    const d = take(g, 'af_done'); if (d) { direct(g, 'af_done', strip(d), doneKey); return true; }
  }
  return !A(g).job;
}

// 1. 자료
{
  for (const p of Object.keys(WORKSHOP)) if (!PLACES[p]) fail('workshop place', p);
  for (const [id, b] of Object.entries(BASES)) if (!b.use.length || !b.name) fail('base', id);
  const g = fresh(1, 'eisen');
  if (A(g).famous.length < 5) fail('famous seed');
}

// 2. 마력이 없어도 공방 일은 있다. 공방 없는 고장에선 없다.
{
  const g = fresh(2, 'eisen');
  if (!can(g, 'af_learn')) fail('learn hidden');
  if (can(g, 'af_make') || can(g, 'af_order') || can(g, 'af_cut')) fail('engrave without mana/skill');
  const m0 = g.player.money;
  for (let i = 0; i < 6; i++) runAct(g, 'af_learn');
  if (A(g).art < 5 || g.player.money <= m0) fail('learn gains', A(g).art, g.player.money);
  if (!can(g, 'af_cut')) fail('cut hidden after learning');
  const n = fresh(3, 'ern');
  if (can(n, 'af_learn')) fail('learn in ern');
  me(n).ageMonths = 12 * 12;
  const k = fresh(3, 'eisen'); me(k).ageMonths = 12 * 12;
  if (can(k, 'af_learn')) fail('child learns');
  checkInfo(g, 'learn');
}

// 3. 마석 다듬기와 팔기
{
  const g = fresh(4, 'barka', { art: 30 });
  for (let i = 0; i < 6; i++) runAct(g, 'af_cut');
  if (A(g).stones < 2) fail('cut stones', A(g).stones);
  const m0 = g.player.money, n = A(g).stones;
  runAct(g, 'af_sell');
  if (A(g).stones !== 0 || g.player.money !== m0 + n * (g.player.money - m0) / n) fail('sell');
  if (g.player.money <= m0) fail('sell money');
  const p = fresh(5, 'barka', { art: 30, money: 3 });
  runAct(p, 'af_cut');
  if (A(p).stones) fail('cut without money');
}

// 4. 새기기: 고르고, 새기고, 곁에 두기 / 팔기 / 이름 붙이기
{
  const g = fresh(6, 'eisen', { mage: true, art: 40 });
  if (circleOf(g) < 2) fail('test mage circle', circleOf(g));
  if (!can(g, 'af_make')) fail('make hidden');
  runAct(g, 'af_make');
  const s = take(g, 'af_pick');
  if (!s) fail('pick not queued');
  const keys = SCENES.af_pick.choices(g, s).map((c) => c.key);
  if (keys.length > 8) fail('pick choices', keys.length);
  if (!keys.some((k) => k.startsWith('own:'))) fail('own weapon option');
  if (!keys.some((k) => k.startsWith('mail:') || k.startsWith('shield:'))) fail('ward base option', keys);
  const sh = keys.find((k) => k.startsWith('shield:'));
  direct(g, 'af_pick', {}, sh);
  if (!A(g).job || A(g).job.base !== 'shield') fail('job set', A(g).job);
  if (!work(g, 'keep')) fail('job never ends');
  if (!A(g).made || !A(g).kept.length) fail('made/kept', A(g).made, A(g).kept.length);
  if (!(L(g).gear.armor > 0)) fail('shield worn as armor', L(g).gear);
  // 지금 쓰는 무기에 새기면 무기가 좋아진다
  const w0 = L(g).gear.weapon;
  for (let tries = 0, m = A(g).made; tries < 6 && A(g).made === m; tries++) {
    g.player.money = 200;
    runAct(g, 'af_make'); const s2 = take(g, 'af_pick');
    direct(g, 'af_pick', {}, SCENES.af_pick.choices(g, s2).map((c) => c.key).find((k) => k.startsWith('own:')));
    work(g, 'keep');
  }
  if (!(L(g).gear.weapon > w0) || !/새긴/.test(L(g).gear.weaponName)) fail('own weapon upgrade', L(g).gear);
  // 팔기
  const m0 = g.player.money;
  direct(g, 'af_done', { name: '시험 반지', base: 'ring', circle: 1, spell: 'mend', q: 50 }, 'sell');
  if (g.player.money <= m0) fail('sell item');
  // 이름 붙이기: 3서클 좋은 물건만
  const lo = direct(g, 'af_done', { name: '낮은 것', base: 'ring', circle: 1, spell: 'mend', q: 90 }, 'name');
  if (!lo.missing) fail('name low circle');
  direct(g, 'af_done', { name: '높은 것', base: 'amulet', circle: 3, spell: 'ward', q: 80 }, 'name');
  const f = A(g).famous.find((x) => x.mine);
  if (!f || f.maker !== g.player.name) fail('famous mine', f);
  if (A(g).worn < 0) fail('amulet worn');
  // 마도구에 손대지 않은 사람에게는 카드가 없다
  const n = fresh(7, 'ern'); if (artificeInfo(n) !== null) fail('info for stranger');
  checkInfo(g, 'make');
  // 돈이 모자라면 시작하지 않는다
  const poor = fresh(8, 'eisen', { mage: true, art: 40, money: 0 });
  runAct(poor, 'af_make'); const ps = take(poor, 'af_pick');
  direct(poor, 'af_pick', {}, SCENES.af_pick.choices(poor, ps).map((c) => c.key)[0]);
  if (A(poor).job) fail('job without money');
}

// 5. 터짐: 서클이 높을수록, 마나가 넘칠수록 잘 터진다
{
  const g = fresh(9, 'eisen', { mage: true, art: 30 });
  if (!(blastChance(g, 4) > blastChance(g, 1) * 2)) fail('blast by circle', blastChance(g, 1), blastChance(g, 4));
  g.mana ??= {}; g.mana.tide = 0; const b1 = blastChance(g, 2); g.mana.tide = 60;
  if (!(blastChance(g, 2) > b1)) fail('blast by tide');
  for (const key of ['hold', 'throw', 'duck']) {
    const c = clone(g); A(c).job = { base: 'blade', spell: 'firebolt', circle: 4, name: '시험 검', prog: 0.6 };
    direct(c, 'af_blast', { name: '시험 검', circle: 4 }, key);
    if (A(c).job && A(c).job.prog >= 0.6) fail('blast no effect', key);
  }
  const c = clone(g); A(c).job = { base: 'blade', spell: 'firebolt', circle: 4, name: '시험 검', prog: 0.6 };
  const r = direct(c, 'af_blast', { name: '시험 검', circle: 4 }, 'cover');
  if (!r.missing) fail('cover without pupil');
}

// 6. 의뢰: 받고, 기한 안에 넘기면 값, 넘기면 깨짐
{
  const g = fresh(10, 'leocast', { mage: true, art: 50 });
  if (!can(g, 'af_order')) fail('order hidden');
  runAct(g, 'af_order');
  const s = take(g, 'af_offer');
  const keys = SCENES.af_offer.choices(g, s).map((c) => c.key).filter((k) => k !== 'none');
  if (!keys.length) fail('no feasible order', s.offers);
  direct(g, 'af_offer', strip(s), keys[0]);
  if (!A(g).job?.client) fail('order job');
  if (can(g, 'af_order')) fail('order while working');
  const m0 = g.player.money;
  A(g).job.prog = 0.98;
  work(g, 'keep');
  if (A(g).orders !== 1 && !A(g).job) { if (A(g).blasts === 0) fail('order done', A(g).orders); }
  if (A(g).orders === 1 && g.player.money <= m0) fail('order pay');
  const late = fresh(11, 'leocast', { mage: true, art: 50 });
  A(late).job = { base: 'ring', spell: 'mend', circle: 1, name: '시험 반지', prog: 0.2, client: '귀족 집안 집사', pay: 80, due: mi(late) };
  adv(late, 2);
  if (A(late).job || A(late).fails !== 1) fail('late order', A(late).job, A(late).fails);
}

// 7. 내 공방과 제자
{
  const g = fresh(12, 'eisen', { mage: true, art: 40, money: 300 });
  if (!can(g, 'af_shop')) fail('shop hidden');
  runAct(g, 'af_shop');
  if (!A(g).shop || g.player.money !== 150) fail('shop', A(g).shop, g.player.money);
  if (can(g, 'af_shop')) fail('second shop');
  if (can(g, 'af_pupil')) fail('pupil at low art');
  A(g).art = 50;
  if (!can(g, 'af_pupil')) fail('pupil hidden');
  runAct(g, 'af_pupil');
  const s = take(g, 'af_pupils');
  direct(g, 'af_pupils', strip(s), 'p0');
  if (A(g).shop.pupils.length !== 1) fail('pupil taken');
  if (can(g, 'af_pupil')) fail('pupil again soon');
  // 제자가 터질 때 감싸기
  const c = clone(g); A(c).job = { base: 'blade', spell: 'firebolt', circle: 2, name: '시험 검', prog: 0.5 };
  direct(c, 'af_blast', { name: '시험 검', circle: 2 }, 'cover');
  if (!c.player.injuries.length) fail('cover hurts me');
  // 다 자라면 나가겠다고 한다
  A(g).shop.pupils[0].art = 60; A(g).shop.pupils[0].honest = 80;
  const m0 = g.player.money;
  adv(g, 1);
  if (g.player.money <= m0) fail('shop earns');
  const q = take(g, 'af_pupil_go');
  if (!q || q.why !== 'ready') fail('pupil ready scene', q);
  else { const b = clone(g); direct(b, 'af_pupil_go', strip(q), 'bless'); if (A(b).shop.pupils.length) fail('bless'); direct(g, 'af_pupil_go', strip(q), 'stay'); if (!A(g).shop.pupils[0].partner) fail('stay'); }
  // 손버릇 나쁜 제자
  const t = clone(g); A(t).shop.pupils[0].honest = 20;
  const r = direct(t, 'af_pupil_go', { name: A(t).shop.pupils[0].name, why: 'theft' }, 'ask');
  if (A(t).shop.pupils.length) fail('dishonest stays', r.out);
  checkInfo(g, 'shop');
  if (!artificeInfo(g).shop.apprentices.length) fail('info apprentices');
}

// 8. 이름난 마도구: 도둑맞고 되찾기
{
  const g = fresh(13, 'eisen', { mage: true, art: 70, money: 500 });
  direct(g, 'af_done', { name: '높은 것', base: 'amulet', circle: 3, spell: 'ward', q: 80 }, 'name');
  const f = A(g).famous.find((x) => x.mine);
  f.stolen = { by: '검은 손 패거리', y: g.date.year }; f.where = 'barka';
  if (can(g, 'af_seek')) fail('seek elsewhere');
  placeAt(g, 'barka');
  if (!can(g, 'af_seek')) fail('seek hidden');
  checkInfo(g, 'stolen');
  runAct(g, 'af_seek');
  const s = take(g, 'af_chase');
  const b = clone(g); direct(b, 'af_chase', strip(s), 'buy');
  if (A(b).famous.find((x) => x.id === f.id).stolen) fail('buy back');
  const w = clone(g); for (const k of ['wil', 'str', 'agi']) w.player.stats[k] = 95; w.player.skills.sword = 95; L(w).gear.weapon = 14;
  direct(w, 'af_chase', strip(s), 'fight');
  const p = clone(g); p.player.money = 0;
  const r = direct(p, 'af_chase', strip(s), 'buy');
  if (!r.missing) fail('buy without money');
  // 도둑맞으면 지니던 것도 사라진다 (월 흐름에서)
  const h = fresh(14, 'eisen', { mage: true, art: 70 });
  direct(h, 'af_done', { name: '높은 것', base: 'amulet', circle: 3, spell: 'ward', q: 80 }, 'name');
  let gone = false;
  for (let i = 0; i < 1200 && !gone; i++) { adv(h, 1); gone = A(h).famous.some((x) => x.mine && x.stolen); }
  if (!gone) fail('never stolen in 100 years');
  else if (A(h).kept.some((k) => k.fid && A(h).famous.find((x) => x.id === k.fid)?.stolen)) fail('kept while stolen');
}

// 9. 마나가 짙으면 마석이 싸다
{
  const g = fresh(15, 'eisen');
  g.mana ??= {}; g.mana.tide = 80; const lo = stoneCost(g);
  g.mana.tide = -80; const hi = stoneCost(g);
  if (!(lo < hi)) fail('stone price by tide', lo, hi);
}

// 10. 백 년 흐름: 걸작이 태어나고 도둑맞고, 목록은 넘치지 않고, 연대기는 드문드문
{
  const g = fresh(16, 'ern');
  const c0 = g.chronicle.length;
  adv(g, 1200);
  const s = A(g);
  if (s.famous.length > 14) fail('famous overflow', s.famous.length);
  if (s.famous.length <= 5) fail('no new famous in 100 years');
  const lines = g.chronicle.slice(c0).filter((c) => /마도구/.test(c.text)).length; if (verbose) console.log(g.chronicle.slice(c0).filter((c) => /마도구/.test(c.text)).map((c) => c.y + ' ' + c.text).join('\n'));
  if (lines > 25) fail('too many chronicle lines', lines);
  if (verbose) console.log('famous', s.famous.map((f) => `${f.name}(${f.circle}) ${f.stolen ? '도둑' : f.lost ? '잃음' : f.holder}`).join(', '), 'chron', lines);
}

// 11. 대를 이으면, 옛 저장
{
  const g = fresh(17, 'eisen', { mage: true, art: 70, money: 300 });
  runAct(g, 'af_shop');
  direct(g, 'af_done', { name: '높은 것', base: 'amulet', circle: 3, spell: 'ward', q: 80 }, 'name');
  hooks('heir', g, R(g), null);
  const s = A(g);
  if (s.art > 20 || !s.shop || !s.famous.some((f) => f.mine) || !s.kept.length || !s.past.length) fail('heir', s.art, !!s.shop, s.past.length);
  const o = fresh(18, 'eisen'); delete o.artifice;
  hooks('migrate', o);
  if (!A(o).famous.length) fail('old save');
  checkInfo(o, 'old');
}

const ms = Date.now() - t0;
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `artificetest: ${problems} problems (${ms}ms)` : `artificetest ok (${ms}ms)`);
process.exit(problems ? 1 : 0);
