import './lsshim.js';
import '../src/content.js';
// 노예와 자유 점검: 나라마다 다른 법, 붙잡혀 노예가 되기, 빚이 팔리기(poor 빚 노예 위), 섬기기·신임·몰래 모은 돈,
// 달아나기(성공·낙인), 몸값·식구의 몸값·주인의 해방, 주인 집의 일, 노예 사냥꾼, 새 이름, 낙인,
// 노예 시장(사서 부리기·사서 풀어 주기), 부려 먹기·풀어 주기·데리고 있는 사람의 일, 금지된 땅에서 부리면 죄, 사슬 끊기,
// 저절로 붙잡히기, 대 잇기, 옛 저장, 여러 삶.
// 난수가 밀려도 갈리지 않게, 장면은 형편을 직접 맞추고 띄운다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { bondageState, bondageInfo, enslave, BLAWS } from '../src/bondage/index.js';
import { makePerson, byId } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['bondage_serve', 'bondage_escape', 'bondage_ransom', 'bondage_market', 'bondage_drive', 'bondage_manumit', 'bondage_rescue', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern', sex } = {}) {
  const g = newGame({ name: '사슬이', sex: sex ?? (seed % 2 ? 'm' : 'f'), familyId: 'farmer', mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = place; L(g).home = 'family';
  const R = realmState(g); R.cur = PLACES[place]?.realm ?? 'leonia'; R.last = place;
  g.player.money = 300; g.player.familyMoney = 300;
  homePlace.set(g, place);
  return g;
}
function person(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: (opts.age ?? 28) * 12, job: opts.job ?? 'farmer', sex: opts.sex });
  p.known = true; p.place = opts.place ?? homePlace.get(g) ?? 'ern'; p.affection = opts.aff ?? 20; p.childIds ??= []; g.people.push(p);
  return p;
}
const idxOf = (re) => (pe) => Math.max(0, pe.choices.findIndex((c) => re.test(c)));
function resolveAll(g, pick = {}) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    seen.scenes[kind] = (seen.scenes[kind] ?? 0) + 1;
    ok(!bad(pe.title) && !bad(pe.text) && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (typeof pick[kind] === 'function') idx = pick[kind](pe);
    else if (pick[kind] != null) idx = Math.min(pick[kind], pe.choices.length - 1);
    if (kind === 'heir') idx = 0;
    const out = resolveEvent(g, rngOf(g), idx);
    ok(!bad(typeof out === 'string' ? out : ''), `bad outcome ${kind}: ${out}`);
    ok(g.player.money >= 0, `money ${g.player.money} after ${kind}`);
    if (/^bondage_/.test(kind) && samples.length < 34 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
  }
}
function settle(g) {
  const pl = homePlace.get(g);
  if (bondageState(g).slave) { L(g).place = bondageState(g).slave.place; L(g).travel = null; return; }
  if (pl && !crimeState(g).jailed) { L(g).place = pl; L(g).travel = null; }
}
function play(g, months, prefer = ACTS, pick = {}, rate = 0.5) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id) && !a.needsTarget);
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel'));
      if (g.player.fatigue > 85) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) {
      ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
      if (/섬긴다|달아난다|몸값|노예|사슬/.test(r.name ?? '') && samples.length < 34 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`);
    }
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
    resolveAll(g, pick);
  }
}
function scene(g, kind, data, pick) {
  for (let t = 0; t < 3; t++) {
    resolveAll(g);
    settle(g);
    const n0 = seen.scenes[kind] ?? 0;
    L(g).queue = L(g).queue.filter((x) => x.kind === kind);
    queueScene(g, kind, data, { first: true });
    play(g, 1, ['rest'], { [kind]: pick }, 1);
    if ((seen.scenes[kind] ?? 0) > n0) return true;
  }
  return false;
}
function act(g, id, pick = {}) {
  for (let t = 0; t < 3; t++) {
    resolveAll(g); settle(g);
    if (!availableActions(g).some((a) => a.id === id)) continue;
    const n0 = seen.acts[id] ?? 0;
    play(g, 1, [id], pick, 1);
    if ((seen.acts[id] ?? 0) > n0) return true;
  }
  return false;
}
const V = bondageState;
const here = (g) => L(g).place;
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const checkInfo = (g) => {
  const info = bondageInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `bondageInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};
// 노예로 만든다 (형편을 직접 맞춘다)
function slave(seed, place = 'saltmare', opts = {}) {
  const g = adult(seed, { place, ...opts });
  enslave(g, rngOf(g), { how: 'captured', place });
  homePlace.set(g, place);
  return g;
}

// 1) 나라마다 다른 법
{
  const g = adult(1);
  const own = (pl) => { L(g).place = pl; return checkInfo(g).law.own; };
  ok(own('ern') === '금지' && own('saltmare') === '허용' && own('solaris') === '이종족만' && own('portel') === '암시장', 'laws by realm');
  L(g).place = 'ern';
  ok(Object.keys(BLAWS).length >= 9, 'law table');
}

// 2) 붙잡혀 노예가 된다: 할 수 있는 일이 줄어든다
{
  let taken = 0;
  for (let t = 0; t < 3; t++) {
    const g = adult(10 + t, { place: 'saltmare' });
    g.player.stats.str = 10; g.player.stats.agi = 10;
    const m0 = g.player.money;
    if (scene(g, 'bondage_taken', { where: 'road', nonhuman: false }, (pe) => pe.choices.length - 1) && V(g).slave) {
      taken++;
      homePlace.set(g, 'saltmare');
      ok(g.player.money < m0 / 2, `money taken ${m0}→${g.player.money}`);
      const acts = availableActions(g).map((a) => a.id);
      ok(acts.every((id) => ['bondage_serve', 'bondage_escape', 'bondage_ransom', 'rest', 'meditate'].includes(id)) && acts.includes('bondage_serve'), `slave actions ${acts}`);
      ok(!L(g).job, 'job lost');
      ok(checkInfo(g).slave?.master, 'info slave');
    }
  }
  ok(taken >= 3, `taken ${taken}`);
  // 싸워서 이기기
  const g = adult(15, { place: 'saltmare' });
  g.player.stats.str = 99; g.player.stats.agi = 99;
  scene(g, 'bondage_taken', { where: 'road', nonhuman: false }, 0);
  ok(!V(g).slave, 'fought off');
}

// 3) 섬기기, 신임, 몰래 모은 돈, 몸값
{
  const g = slave(20);
  const s = V(g).slave;
  for (let k = 0; k < 10; k++) act(g, 'bondage_serve');
  ok(s.trust >= 40 && s.savings > 0, `trust ${s.trust} savings ${s.savings}`);
  ok(!has(g, 'bondage_ransom') || s.savings + g.player.money >= s.ransom, 'ransom gated');
  s.savings = s.ransom;
  const old = g.player.name;
  ok(act(g, 'bondage_ransom', { bondage_newname: idxOf(/새로 산다/) }), 'ransom action');
  ok(!V(g).slave && V(g).freed?.how === 'ransom' && V(g).freed.papers, 'freed by ransom');
  if (!seen.scenes.bondage_newname) play(g, 1, ['rest'], { bondage_newname: idxOf(/새로 산다/) }, 1);
  ok(seen.scenes.bondage_newname > 0, 'newname scene');
  ok(g.player.name !== old && V(g).freed.oldName === old && me(g).name === g.player.name, `renamed ${old}→${g.player.name}`);
  ok(checkInfo(g).freed?.oldName === old, 'info oldName');
}

// 4) 달아나기: 성공하면 쫓기는 몸, 실패하면 낙인
{
  let ran = 0, branded = 0;
  for (let t = 0; t < 4; t++) {
    const g = slave(30 + t);
    g.player.stats.agi = 90; g.player.stats.sen = 90; V(g).slave.trust = 90;
    if (act(g, 'bondage_escape') && !V(g).slave && V(g).fugitive) {
      ran++;
      const to = L(g).travel?.to;
      ok(!to || BLAWS[PLACES[to]?.realm ?? 'leonia'].own === false, `refuge ${to}`);
    }
    const h = slave(40 + t);
    h.player.stats.agi = 0; h.player.stats.sen = 0; V(h).slave.trust = 0;
    act(h, 'bondage_escape');
    if (V(h).slave?.branded) branded++;
  }
  ok(ran >= 3 && branded >= 3, `escape ${ran} branded ${branded}`);
}

// 5) 주인 집의 일: 매질, 글, 반란, 감독 제의, 되팔림
{
  const evs = { cruel: ['endure', /견딘다/], kind: ['learn', /배운다/], revolt: ['join', /낀다/], offer: ['take', /채찍을 받는다/], sold: ['go', /체념/] };
  let n = 50;
  for (const [ev, [, re]] of Object.entries(evs)) {
    for (let t = 0; t < 2; t++) {
      const g = slave(n++);
      V(g).slave.trust = 60;
      const p0 = V(g).slave.place;
      ok(scene(g, 'bondage_master', { ev }, idxOf(re)), `master ${ev}`);
      if (ev === 'sold' && V(g).slave) ok(V(g).slave.place !== p0 && here(g) === V(g).slave.place, 'resold elsewhere');
      if (ev === 'offer' && V(g).slave) ok(V(g).slave.trust >= 75, 'overseer trust');
      checkInfo(g);
    }
  }
  // 다른 선택지들
  for (const [ev, re] of [['cruel', /빼앗는다/], ['cruel', /빈다/], ['revolt', /일러바친다/], ['revolt', /빠진다/], ['offer', /거절/], ['sold', /병든 척/], ['kind', /고개를/]]) {
    const g = slave(n++);
    V(g).slave.trust = 60;
    ok(scene(g, 'bondage_master', { ev }, idxOf(re)), `master ${ev} other`);
  }
  // 노예로 살다 보면 저절로 일이 생긴다
  const g = slave(70);
  const m0 = seen.scenes.bondage_master ?? 0;
  for (let k = 0; k < 4 && V(g).slave; k++) play(g, 12, ['bondage_serve', 'rest'], { bondage_master: 0 }, 1);
  ok((seen.scenes.bondage_master ?? 0) > m0, 'natural master events');
  ok(!V(g).slave || here(g) === V(g).slave.place, 'slave stays put');
}

// 6) 식구가 몸값을 보낸다, 주인이 풀어 준다
{
  let fam = 0, man = 0;
  for (let t = 0; t < 3; t++) {
    const g = slave(80 + t);
    g.player.familyMoney = 999;
    const f = person(g, { aff: 50 }); g.player.familyIds.push(f.id);
    if (scene(g, 'bondage_family', { pid: f.id, from: f.name, amount: V(g).slave.ransom }, idxOf(/풀려난다/)) && V(g).freed?.how === 'family') fam++;
    const h = slave(85 + t);
    V(h).slave.trust = 95; V(h).slave.since -= 48;
    for (let k = 0; k < 8 && V(h).slave; k++) { V(h).slave.trust = 95; play(h, 12, ['rest'], { bondage_master: 0 }, 1); }
    if (V(h).freed?.how === 'manumit') man++;
  }
  ok(fam >= 2, `family ransom ${fam}`);
  ok(man >= 1, `manumit ${man}`);
}

// 7) 노예 사냥꾼
{
  let fought = 0, caught = 0, bribed = 0;
  for (let t = 0; t < 3; t++) {
    const g = adult(90 + t, { place: 'portel' });
    g.player.stats.str = 95; g.player.stats.agi = 95;
    V(g).fugitive = { from: 'saltmare', realm: 'sea', y: g.date.year, heat: 80, branded: true };
    if (scene(g, 'bondage_hunters', {}, idxOf(/칼을/)) && V(g).fugitive && V(g).fugitive.heat < 80) fought++;
    const h = adult(95 + t, { place: 'portel' });
    h.player.stats.str = 0; h.player.stats.agi = 0; h.player.stats.sen = 0;
    V(h).fugitive = { from: 'saltmare', realm: 'sea', y: h.date.year, heat: 80, branded: false };
    scene(h, 'bondage_hunters', {}, idxOf(/뒷문/));
    if (V(h).slave?.branded) caught++;
    const b = adult(98 + t, { place: 'portel' });
    V(b).fugitive = { from: 'saltmare', realm: 'sea', y: b.date.year, heat: 80, branded: false };
    if (scene(b, 'bondage_hunters', {}, idxOf(/은화/)) && V(b).fugitive?.heat <= 50) bribed++;
  }
  ok(fought >= 2 && caught >= 2 && bribed >= 2, `hunters fought ${fought} caught ${caught} bribed ${bribed}`);
  // 노예를 금하는 땅에서는 쫓는 손이 식는다
  const g = adult(99);
  V(g).fugitive = { from: 'saltmare', realm: 'sea', y: g.date.year, heat: 20, branded: false };
  for (let k = 0; k < 12 && V(g).fugitive; k++) play(g, 1, ['rest'], { bondage_hunters: idxOf(/은화/) }, 1);
  ok(!V(g).fugitive, 'heat cools in leonia');
}

// 8) 낙인
{
  const g = adult(100, { place: 'saltmare' });
  V(g).freed = { y: g.date.year, how: 'ransom', branded: true, papers: true, oldName: null };
  ok(scene(g, 'bondage_brand', {}, idxOf(/증서/)) && !V(g).slave, 'brand papers');
  const h = adult(101);
  V(h).freed = { y: h.date.year, how: 'ransom', branded: true, papers: true, oldName: null };
  ok(scene(h, 'bondage_brand', {}, idxOf(/똑바로/)), 'brand stand');
  const k = adult(102, { place: 'saltmare' });
  k.player.stats.agi = 0;
  V(k).freed = { y: k.date.year, how: 'escape', branded: true, papers: false, oldName: null };
  scene(k, 'bondage_brand', {}, idxOf(/달아난다/));
  ok(!!V(k).slave, 'no papers recaptured');
}

// 9) 빚이 노예상에게 팔린다 (poor 빚 노예 위에 얹는다)
{
  let sold = 0;
  for (let t = 0; t < 3; t++) {
    const g = adult(110 + t, { place: 'saltmare' });
    g.poor ??= {}; g.poor.bond = { owed: 50, place: 'saltmare', master: '소금밭 감독관 오스릭', start: 0, kind: 'salt' };
    if (scene(g, 'bondage_debtsold', {}, idxOf(/따라간다/)) && V(g).slave?.how === 'debt' && !g.poor.bond) sold++;
  }
  ok(sold >= 2, `debt sold ${sold}`);
}

// 10) 노예 시장: 사서 부리기, 사서 풀어 주기, 부려 먹기, 풀어 주기, 데리고 있는 사람의 일
{
  const g = adult(120, { place: 'saltmare' });
  g.player.money = 2000;
  ok(has(g, 'bondage_market') && !has(adult(121), 'bondage_market'), 'market only at markets');
  for (let k = 0; k < 3; k++) act(g, 'bondage_market', { bondage_market: idxOf(/사서 부린다/) });
  const v = V(g);
  ok(v.owned.length >= 2, `bought ${v.owned.length}`);
  act(g, 'bondage_market', { bondage_market: idxOf(/풀어 준다/) });
  ok(v.helped >= 1, 'bought to free');
  const m0 = g.player.money, l0 = v.owned[0]?.loyalty;
  act(g, 'bondage_drive');
  ok(g.player.money > m0 - 1 && v.owned[0]?.loyalty < l0 + 1, 'drive');
  ok(checkInfo(g).owned.length === v.owned.length, 'info owned');
  for (const [ev, re] of [['beg', /문을 닫는다/], ['flee', /사냥개/], ['sick', /약초사/], ['knife', /붙잡는다/]]) {
    const o = v.owned.find((x) => byId(g, x.pid)?.alive);
    if (!o) break;
    ok(scene(g, 'bondage_owned', { pid: o.pid, ev }, idxOf(re)), `owned ${ev}`);
  }
  const n0 = v.owned.length, h0 = v.helped;
  if (n0) { ok(act(g, 'bondage_manumit'), 'manumit action'); ok(v.owned.length === n0 - 1 && v.helped === h0 + 1, 'manumitted'); }
  // 금지된 땅에서 부리면 죄가 된다
  let reported = 0;
  for (let t = 0; t < 3; t++) {
    const h = adult(130 + t, { place: 'saltmare' });
    h.player.money = 2000;
    for (let k = 0; k < 4; k++) act(h, 'bondage_market', { bondage_market: idxOf(/사서 부린다/) });
    homePlace.set(h, 'ern'); L(h).place = 'ern'; realmState(h).cur = 'leonia'; realmState(h).last = 'ern';
    for (let k = 0; k < 6 && !crimeState(h).record.some((r) => r.c === 'slaving'); k++) play(h, 12, ['rest', 'work'], { bondage_owned: idxOf(/문을 닫는다|사냥개|약초사|붙잡는다/) }, 1);
    if (crimeState(h).record.some((r) => r.c === 'slaving')) reported++;
  }
  ok(reported >= 2, `slaving reported ${reported}`);
}

// 11) 사슬을 끊는다
{
  const g = adult(140, { place: 'portel' });
  g.player.stats.agi = 95; g.player.stats.sen = 95; g.player.stats.str = 95;
  for (let k = 0; k < 4; k++) act(g, 'bondage_rescue');
  ok(V(g).helped >= 6, `rescued ${V(g).helped}`);
}

// 12) 저절로 붙잡힌다 (남해 섬에서)
{
  let n = 0;
  for (let t = 0; t < 8; t++) {
    const g = adult(150 + t, { place: 'saltmare' });
    g.player.stats.str = 10;
    for (let k = 0; k < 10 && !V(g).slave; k++) { if (!L(g).travel && here(g) !== 'saltmare') { L(g).place = 'saltmare'; realmState(g).cur = 'sea'; } play(g, 12, ['rest', 'work'], { bondage_taken: (pe) => pe.choices.length - 1, bondage_market: idxOf(/지켜본다/), border: 0 }, 1); }
    if (V(g).slave) n++;
  }
  ok(n >= 3, `natural capture ${n}`);
  // 레오니아에서는 붙잡히지 않는다
  const g = adult(160);
  for (let k = 0; k < 5; k++) play(g, 12, ['rest', 'work'], {}, 1);
  ok(!V(g).slave && V(g).enslaved === 0, 'safe at home');
}

// 13) 대 잇기와 옛 저장
{
  const g = slave(170, 'saltmare', { age: 60 });
  V(g).owned.push({ pid: person(g).id, bought: 0, price: 40, loyalty: 50 });
  runHooks('heir', g, rngOf(g), { ...g.player });
  ok(!V(g).slave && !V(g).fugitive && !V(g).freed, 'heir free');
  ok(V(g).owned[0].loyalty === 30, 'owned passes with less loyalty');
  ok(V(g).log.some((x) => /노예로 죽었다/.test(x.text)), 'heir log');
  ok(!availableActions(g).some((a) => a.id === 'bondage_serve'), 'heir not slave');
  const old = JSON.parse(JSON.stringify(g)); delete old.bondage;
  runHooks('migrate', old);
  ok(old.bondage && Array.isArray(old.bondage.owned), 'old save bondage');
}

// 14) 여러 삶
let lives = 0, slaves = 0;
for (let run = 0; run < 10; run++) {
  const pl = ['ern', 'saltmare', 'portel', 'leocast', 'solaris'][run % 5];
  const g = adult(1000 + run, { age: 18 + (run % 4) * 7, place: pl });
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.3);
  if ((L(g).gen ?? 1) > start) lives++;
  slaves += V(g).enslaved;
  checkInfo(g);
}
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'bondage_market', 'bondage_rescue'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['bondage_serve', 'bondage_escape', 'bondage_ransom', 'bondage_market', 'bondage_drive', 'bondage_manumit', 'bondage_rescue']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['bondage_taken', 'bondage_debtsold', 'bondage_master', 'bondage_family', 'bondage_hunters', 'bondage_newname', 'bondage_brand', 'bondage_market', 'bondage_owned']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('bondage_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('bondage_')))));
console.log(`대를 이은 삶 ${lives}/10, 노예가 된 일 ${slaves}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `bondagetest: ${fail} 실패` : 'bondagetest: 통과');
process.exit(fail ? 1 : 0);
