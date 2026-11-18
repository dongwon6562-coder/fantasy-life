import '../src/content.js';
// 밑바닥에서 살기(src/poor/)를 브라우저 없이 돌려 보는 점검.
// 1) 구걸(왕초 몫), 무료 급식과 구빈원 잠자리, 굶주림, 날품팔이. 2) 빈민가 사람들·뜻밖의 손·다시 일어서기의 선택지마다.
// 3) 빚 노예: 대금업자 빚 → 노역 → 갚고 풀려나기·달아나기·자리 비우기·대 잇기. 4) 부자일 때: 베풀기·구빈원 세우기·부리기·묶어 둔 사람들.
// 5) 옛 저장, 저절로 살아 보기.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { E } from '../src/estate/core.js';
import { P, poorStatus, poorLine, BOND_KINDS, ALMS, BIND_COST, hasPoorhouse } from '../src/poor/index.js';

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
    if (/^poor_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^poor_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = poorStatus(g);
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
import { GANGS } from '../src/underworld/gangs.js';
import { crimeState } from '../src/crime.js';

const act = (g, id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(g, id).available(g);
function doAct(g, id) { const out = act(g, id).run(g, R(g)); if (bad(out) || josa(out)) fail('action text', id, out); if (samples.length < 60) samples.push(`(${id}) ${out}`); return out; }
function low(seed, pl) { const g = adult(seed); placeAt(g, pl); heal(g); L(g).home = 'street'; g.player.money = 0; g.player.familyMoney = 0; if (g.world) g.world.famine = null; return g; }
const clearQ = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; };

/* 1) 구걸·급식·굶주림·날품 */
{
  const g = low(81000, 'leocast');
  if (!can(g, 'poor_beg') || !can(g, 'poor_soup') || !can(g, 'poor_labor')) fail('low actions not offered');
  doAct(g, 'poor_beg');
  if (P(g).begged !== 1) fail('beg count');
  if (!L(g).queue.some((q) => q.kind === 'poor_boss')) fail('boss not queued in slum');
  clearQ(g);
  direct(g, 'poor_boss', {}, 'paid');
  if (P(g).boss.leocast !== 'paid') fail('boss paid');
  let sum = 0;
  for (let i = 0; i < 20; i++) { const m = g.player.money; doAct(g, 'poor_beg'); sum += g.player.money - m; g.player.money = 0; heal(g); }
  if (sum <= 0) fail('begging never paid');
  console.log(`구걸 스무 번(레오카스트, 왕초 몫 뗌): 은화 ${sum}닢`);
  // 돈이 넉넉하거나 집이 있으면 구걸하지 않는다
  g.player.money = 50; if (can(g, 'poor_beg')) fail('beg with money');
  g.player.money = 0; L(g).home = 'own'; if (can(g, 'poor_beg') || can(g, 'poor_soup')) fail('beg with own house'); L(g).home = 'street';
  // 급식과 구빈원
  clearQ(g); doAct(g, 'poor_soup');
  if (P(g).bedAt !== g.date.year * 12 + g.date.month || P(g).hunger !== 0) fail('poorhouse bed', P(g).bedAt);
  const e = low(81100, 'ern'); doAct(e, 'poor_soup');
  if (P(e).bedAt >= 0) fail('poorhouse bed in ern');
  if (can(e, 'poor_labor')) fail('labor in ern');
  // 굶주림
  const h = low(81200, 'verden');
  for (let i = 0; i < 4; i++) { clearQ(h); h.player.money = 0; tick(h); }
  if (P(h).hunger < 2 && !h.player.injuries.some((x) => /굶주려/.test(x.name))) fail('no hunger', P(h).hunger);
  if (P(h).streetMonths < 4 || !P(h).lowest) fail('street months', P(h).streetMonths);
  // 날품
  const w = low(81300, 'harfen');
  let pay = 0;
  for (let i = 0; i < 20; i++) { const m = w.player.money; doAct(w, 'poor_labor'); pay += w.player.money - m; w.player.money = 0; heal(w); }
  if (pay <= 0 || P(w).labored !== 20) fail('labor', pay, P(w).labored);
  w.player.money = 80; if (can(w, 'poor_labor')) fail('labor with money');
  console.log(`날품 스무 번(하르펜): 은화 ${pay}닢`);
}

/* 2) 빈민가 사람들, 뜻밖의 손, 다시 일어서기 */
{
  const gp = Object.keys(GANGS).find((id) => PLACES[GANGS[id].place]);
  const where = gp ? GANGS[gp].place : 'leocast';
  const KEYS = { share: ['eat', 'give'], kid: ['fence', 'scold', 'turn'], winter: ['huddle', 'temple', 'alone'], gang: ['go', 'no'], sick: ['coin', 'fetch', 'turn'] };
  let n = 0;
  for (const [ev, keys] of Object.entries(KEYS)) for (const k of keys) {
    const g = low(82000 + n++, where); g.player.money = 5; crimeState(g).gang = null;
    const r = direct(g, 'poor_slum', { ev }, k);
    if (r.skipped || r.missing) fail('slum scene', ev, k, JSON.stringify(r));
    if (ev === 'gang' && k === 'go' && !L(g).queue.some((q) => q.kind === 'gang_offer')) fail('gang offer not queued');
  }
  const x = low(82100, 'leocast'); if (!direct(x, 'poor_slum', { ev: 'gone' }, 'eat').skipped) fail('bad ev shown');
  for (const ev of ['porter', 'scribe', 'old']) for (const k of ['yes', 'no']) {
    const g = low(82200 + n++, 'verden'); g.player.skills.letters = 30;
    const m = g.player.money; const r = direct(g, 'poor_chance', { ev }, k);
    if (r.skipped || r.missing) fail('chance', ev, k);
    if (k === 'yes' && g.player.money <= m) fail('chance paid nothing', ev);
  }
  const ill = low(82300, 'verden'); ill.player.skills.letters = 0;
  if (!direct(ill, 'poor_chance', { ev: 'scribe' }, 'yes').missing) fail('illiterate scribe');
  // 다시 일어서기: 바닥에서 넉 달, 이제 돈과 잠자리
  for (const k of ['bread', 'visit', 'forget']) {
    const g = low(82400 + n++, 'harfen');
    P(g).lowMonths = 5; P(g).lowest = { y: 505, place: 'harfen' }; P(g).friends.knight = 60;
    g.player.money = 200; L(g).home = 'rent'; clearQ(g); tick(g);
    if (!L(g).queue.some((q) => q.kind === 'poor_rise')) fail('rise not queued');
    clearQ(g); const r = direct(g, 'poor_rise', {}, k);
    if (r.skipped || !P(g).risen) fail('rise', k);
    if (k === 'visit' && !/브란트를/.test(r.out)) fail('visit josa', r.out);
  }
}

/* 3) 빚 노예 */
function shark(g, principal = 80) { const e = E(g); e.loans.push({ id: e.seq++, lender: 'shark', principal, due: 0, missed: 3, from: L(g).place }); return e.loans.at(-1); }
{
  const g = low(83000, 'saltmare'); L(g).houses = []; shark(g);
  clearQ(g); tick(g);
  const q = L(g).queue.find((x) => x.kind === 'poor_bond');
  if (!q) fail('bond not offered', JSON.stringify(L(g).queue.map((x) => x.kind)));
  clearQ(g);
  direct(g, 'poor_bond', { loan: q?.loan ?? E(g).loans[0].id }, 'bond');
  const b = P(g).bond, o0 = b?.owed ?? 0; // 그새 이자가 붙었을 수 있다
  if (!b || b.kind !== 'salt' || o0 < 96 || E(g).loans.length) fail('bond start', JSON.stringify(b), E(g).loans.length);
  if (can(g, 'poor_beg') || can(g, 'poor_labor') || !can(g, 'poor_bond_work')) fail('bonded actions');
  for (let i = 0; i < 3; i++) { clearQ(g); tick(g); }
  if (P(g).bond?.owed !== o0 - 18) fail('bond monthly', P(g).bond?.owed);
  direct(g, 'poor_bond_work', {}, 'more');
  if (P(g).bond?.owed !== o0 - 22) fail('bond more', P(g).bond?.owed);
  g.player.money = 30; direct(g, 'poor_bond_work', {}, 'part');
  if (P(g).bond?.owed !== o0 - 52 || g.player.money !== 0) fail('bond part');
  g.player.money = 100; direct(g, 'poor_bond_work', {}, 'pay');
  if (P(g).bond || g.player.money !== 100 - (o0 - 52)) fail('bond paid', JSON.stringify(P(g).bond), g.player.money);
  // 끝까지 일로 갚기
  const w = low(83100, 'verden'); L(w).houses = []; const l = shark(w, 30);
  direct(w, 'poor_bond', { loan: l.id }, 'bond');
  if (P(w).bond?.kind !== 'quarry') fail('quarry kind');
  for (let i = 0; i < 8 && P(w).bond; i++) { clearQ(w); tick(w); }
  if (P(w).bond) fail('bond never ended', P(w).bond.owed);
  // 달아나기
  const f = low(83200, 'harfen'); L(f).houses = []; const l2 = shark(f);
  direct(f, 'poor_bond', { loan: l2.id }, 'bond'); direct(f, 'poor_bond_work', {}, 'flee');
  if (P(f).bond || !L(f).travel || P(f).fled !== 1 || !crimeState(f).record.some((r) => r.c === 'fraud')) fail('bond flee');
  // 자리를 비움
  const a = low(83300, 'harfen'); L(a).houses = []; const l3 = shark(a);
  direct(a, 'poor_bond', { loan: l3.id }, 'bond'); placeAt(a, 'verden'); tick(a);
  if (P(a).bond || P(a).fled !== 1) fail('bond away');
  // 대금업자 앞에서 거절·도주
  const r1 = low(83400, 'harfen'); L(r1).houses = []; const l4 = shark(r1); direct(r1, 'poor_bond', { loan: l4.id }, 'refuse');
  if (!l4.bondOffered || P(r1).bond) fail('refuse');
  clearQ(r1); tick(r1); if (L(r1).queue.some((q) => q.kind === 'poor_bond')) fail('offered twice');
  const r2 = low(83500, 'harfen'); L(r2).houses = []; const l5 = shark(r2); direct(r2, 'poor_bond', { loan: l5.id }, 'flee');
  if (!L(r2).travel || !E(r2).loans.length) fail('flee loan');
  // 집이 있으면 몸으로 갚으라 하지 않는다
  const own = low(83600, 'harfen'); L(own).houses = ['harfen']; E(own).homes.harfen = { level: 0, cond: 80, servants: 0 }; shark(own); clearQ(own); tick(own);
  if (L(own).queue.some((q) => q.kind === 'poor_bond')) fail('bond offered with house');
  // 대를 이으면 장부의 빚으로
  const h = low(83700, 'harfen'); L(h).houses = []; const l6 = shark(h); direct(h, 'poor_bond', { loan: l6.id }, 'bond');
  for (const fn of HOOKS_HEIR()) fn(h);
  if (P(h).bond || !E(h).loans.some((x) => x.lender === 'shark' && x.principal === 96)) fail('bond heir', JSON.stringify(E(h).loans));
  console.log(`빚 노예: 소금밭 ${o0}닢 → 석 달 ${o0 - 18} → 갚고 풀림, 채석장 끝까지 일로 갚음, 달아남, 자리 비움, 대 잇기`);
}
function HOOKS_HEIR() { return HOOKS.heir.filter((f) => /poor|bond|P\(g\)/.test(String(f)) && /bond/.test(String(f))); }

/* 4) 넉넉할 때 */
{
  const g = adult(84000); placeAt(g, 'barka'); heal(g); g.player.money = 1000;
  if (!can(g, 'poor_alms') || !can(g, 'poor_hire')) fail('rich actions');
  if (hasPoorhouse(g, 'barka')) fail('barka poorhouse');
  for (const k of ['alms', 'soup', 'build', 'none']) direct(g, 'poor_alms', {}, k);
  if (!hasPoorhouse(g, 'barka') || P(g).charity.barka !== 1 || P(g).given !== ALMS.alms + ALMS.soup + ALMS.build) fail('alms', JSON.stringify(P(g).charity), P(g).given);
  if (!direct(g, 'poor_alms', {}, 'build').missing) fail('build twice');
  // 세운 구빈원에서 잔다
  const b = low(84050, 'barka'); P(b).built.barka = 505; doAct(b, 'poor_soup'); if (P(b).bedAt < 0) fail('own poorhouse bed');
  g.player.money = 1000;
  for (const k of ['fair', 'squeeze', 'bind', 'bind']) direct(g, 'poor_hire', {}, k);
  if (P(g).bondsmen.length !== 2 || P(g).squeezed !== 1) fail('hire', P(g).bondsmen.length);
  if (g.beasts) g.beasts.animals = []; // 데리고 있는 짐승 먹이값이 같은 달에 빠지면 셈이 어긋난다 (난수에 따라 짐승이 생김)
  const m = g.player.money; clearQ(g); tick(g);
  if (g.player.money !== m + 8) fail('bondsmen income', g.player.money - m);
  for (const [ev, keys] of Object.entries({ flee: ['hunt', 'let'], sick: ['heal', 'cast'], beg: ['yes', 'free', 'no'] })) for (const k of keys) {
    if (!P(g).bondsmen.length) direct(g, 'poor_hire', {}, 'bind');
    const r = direct(g, 'poor_bondsman', { ev, name: P(g).bondsmen[0].name }, k);
    if (r.skipped || r.missing) fail('bondsman', ev, k);
  }
  if (!P(g).bondsmen.length) direct(g, 'poor_hire', {}, 'bind');
  direct(g, 'poor_hire', {}, 'free');
  if (P(g).bondsmen.some((x) => x.place === 'barka')) fail('free bondsmen');
  // 다 갚으면 떠난다
  direct(g, 'poor_hire', {}, 'bind');
  for (let i = 0; i < 25; i++) { clearQ(g); tick(g); }
  if (P(g).bondsmen.length) fail('bondsman never left');
  placeAt(g, 'ern'); if (can(g, 'poor_hire')) fail('hire outside slum');
}

/* 5) 옛 저장, 상태, 저절로 살아 보기 */
{
  const o = adult(85000);
  delete o.poor; runHooks('migrate', o);
  if (!o.poor || !Array.isArray(o.poor.bondsmen)) fail('migrate');
  o.poor = { bond: { owed: 5, place: 'nowhere', kind: 'salt' }, bondsmen: [{ name: 'x', place: 'nowhere', owed: 3 }, null, { name: 'y', place: 'harfen', owed: 4 }], friends: 'x', lowest: 7 }; runHooks('migrate', o);
  if (o.poor.bond || o.poor.bondsmen.length !== 1 || typeof o.poor.friends !== 'object' || o.poor.lowest) fail('migrate partial', JSON.stringify(o.poor));
  if (JSON.stringify(poorStatus(o)).match(/NaN|undefined/)) fail('status');
  let begs = 0, labor = 0, soup = 0, rose = 0, bonded = 0;
  for (let run = 0; run < 4; run++) {
    const a = low(85100 + run, ['leocast', 'harfen', 'verden', 'saltmare'][run]);
    if (run === 3) { L(a).houses = []; shark(a, 60); }
    for (let mth = 0; mth < 96 && !a.over; mth++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.6) ? ['poor_bond_work', rngOf(a).pick(['poor_labor', 'poor_beg', 'poor_soup']), 'poor_beg', 'poor_soup', 'poor_alms', 'poor_hire'] : [rngOf(a).pick(acts).id];
      month(a, want);
      const line = poorLine(a); if (bad(line) || josa(line)) fail('line', line);
    }
    const p = P(a); begs += p.begged; labor += p.labored; soup += p.soup; rose += p.risen ? 1 : 0; bonded += p.bonded;
  }
  console.log(`저절로 8년 4판: 구걸 ${begs}, 날품 ${labor}, 급식 ${soup}, 다시 일어섬 ${rose}, 빚 노예 ${bonded}`);
  if (!begs || !labor) fail('autoplay never lived low');
}

console.log('장면:', JSON.stringify(seen.scenes));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
