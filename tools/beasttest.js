import '../src/content.js';
// 짐승과 함께(src/beasts/)를 브라우저 없이 돌려 보는 점검.
// 1) 장터마다 짐승 들이기, 먹이 값, 돌보며 길들이기(마수는 물기도 한다).
// 2) 탈것으로 길이 빨라지는 것, 싸움 힘에 보태는 것, 매사냥·말 달리기.
// 3) 사역마 부르기와 쓸모, 팔기와 놓아주기.
// 4) 짐승과 사는 날의 일 열둘을 선택지마다, 늙어 죽음과 싸움에서 죽음, 굶겨서 잃음.
// 5) 군대 기병, 탐험 길 잃음, 대 잇기, 옛 저장, 저절로 살아 보기, beastsStatus.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { playerPower } from '../src/adventure/combat.js';
import { cavalry } from '../src/army/service.js';
import { E as EX, startExpedition, lostChance } from '../src/explore/index.js';
import { B, KINDS, alive, addAnimal, mountOf, familiarOf, beastsStatus, BEAST_EVENTS, SHOPS, sellPrice, buyPrice } from '../src/beasts/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)/.test(t);
const seen = { scenes: {}, ev: {} };
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
  for (const r of res) { if (bad(r.text)) fail('bad result', r); if (/^짐승|매사냥|말을|사역마/.test(r.name) && josa(r.text)) fail('josa result', r); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
    if (s?.kind === 'beast_event') seen.ev[s.ev] = (seen.ev[s.ev] ?? 0) + 1;
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^beast_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^beast_/.test(s?.kind ?? '') && samples.length < 80) samples.push(`[${pe.title}] ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = beastsStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'farmer') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (l.job?.id === 'soldier') l.job = null; if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }
// 길들이기를 재는 동안 남해에서 노예로 붙잡혀 가면(bondage) 짐승을 돌볼 수 없으니 풀어 둔다
const heal = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; if (g.bondage?.slave) { g.bondage.slave = null; g.bondage.fugitive = null; } };
function scene(g, kind, data, re, opt = {}) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, opt.want ?? ['rest'], (k, labels) => { if (k !== kind) return opt.other?.(k, labels) ?? -1; done = true; const i2 = idxOf(labels, re); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, JSON.stringify(data), L(g).place, playerAge(g), JSON.stringify(L(g).queue.map((q) => q.kind)));
  if (done && !chose && !g.over) fail('choice not found', kind, re);
  return done;
}

/* ---------- 1) 들이기, 먹이, 길들이기 ---------- */
{
  const buys = [['ern', 'dog', /개/], ['harfen', 'horse', /^말/], ['leocast', 'warhorse', /군마/], ['fur', 'hawk', /^매/], ['fur', 'direwolf', /서리늑대/], ['saltmare', 'shadowcat', /그림자 표범/], ['saltmare', 'wyvern', /와이번/]];
  let tamed = 0, bites = 0;
  for (const [place, kind, re] of buys) {
    const g = adult(61000 + buys.findIndex((x) => x[1] === kind));
    placeAt(g, place);
    g.player.money = 500;
    // 41단계: 하늘 소식이 주사위를 밀어 남해 장터에서 사려던 달에 노예로 붙잡혀 가는 판이 나왔다. 사는 걸 재는 동안은 붙잡히는 장면을 쉰다
    if (g.bondage) g.bondage.sceneAt = 1e9;
    // 43단계: 마신 갈래가 주사위를 밀어 와이번이 대관 서기 판에서 독 고기를 먹는 판이 나왔다. 길들이기를 재는 동안은 허가를 받아 둔 걸로 한다
    if (g.mount?.me) g.mount.me.permit = 9999;
    scene(g, 'beast_buy', {}, re);
    const a = alive(g).find((x) => x.kind === kind);
    if (!a) { fail('buy failed', kind, place); continue; }
    if (g.player.money > 500 - buyPrice(kind) + 60) fail('price not paid', kind, g.player.money); // 같은 달 다른 사건으로 들어온 돈(품삯 등)은 봐준다
    // 길들이기: 다 될 때까지
    const m0 = g.player.money;
    let months = 0;
    for (; months < 80 && (a.trained ?? 0) < 100 && a.alive && !g.over; months++) {
      const inj0 = g.player.injuries.length;
      month(g, ['beast_care']);
      if (g.player.injuries.length > inj0 && g.player.injuries.some((i) => /물린/.test(i.name))) bites++;
      heal(g);
      g.player.money = Math.max(g.player.money, 30);
    }
    if (a.trained >= 100) tamed++;
    else fail('never tamed', kind, a.trained, months, a.alive, a.how);
    if (verbose) console.log(kind, `길들기까지 ${months}달`, `정 ${Math.round(a.bond)}`, `짐승 다루기 ${g.player.skills.animals.toFixed(1)}`);
    if (KINDS[kind].feed >= 1 && g.player.money >= m0 + 1000) fail('no feed cost');
  }
  console.log(`들이기 7종: 다 길든 것 ${tamed}, 마수에게 물린 일 ${bites}`);
  if (!bites) fail('beasts never bit');
  // 아이는 개만
  const c = newGame({ name: '아이', sex: 'f', familyId: 'farmer', mode: 'free', seed: 61100 });
  for (let i = 0; i < 12 * 11; i++) month(c, ['rest']);
  placeAt(c, 'harfen');
  c.player.money = 100;
  scene(c, 'beast_buy', {}, /개|구경/);
  if (alive(c).some((a) => a.kind !== 'dog')) fail('child bought non-dog');
}

/* ---------- 2) 탈것, 싸움 힘, 매사냥, 말 달리기 ---------- */
{
  const g = adult(62000);
  placeAt(g, 'harfen');
  heal(g);
  const p0 = playerPower(g);
  addAnimal(g, 'warhorse', { ageYears: 5, trained: 100, bond: 70 });
  addAnimal(g, 'dog', { ageYears: 3, trained: 100, bond: 70 });
  const p1 = playerPower(g);
  if (p1 <= p0 + 8) fail('beasts add no power', p0, p1);
  if (!mountOf(g)) fail('no mount');
  if (!cavalry(g)) fail('not cavalry');
  // 탐험: 개가 있으면 길을 덜 잃는다
  placeAt(g, 'silverleaf'); g.player.money = 300;
  startExpedition(g, rngOf(g), 'deepwood', true);
  const lc1 = lostChance(g);
  const dog = alive(g).find((a) => a.kind === 'dog'); dog.trained = 0;
  const lc0 = lostChance(g);
  dog.trained = 100;
  if (!(lc1 < lc0)) fail('dog does not help explore', lc0, lc1);
  EX(g).exp = null;
  // 길: 하르펜에서 왕도로
  placeAt(g, 'harfen');
  g.player.money = 100;
  scene(g, 'travel', {}, /레오카스트/);
  const t = L(g).travel;
  let mm = 0;
  while (L(g).travel && mm++ < 10) month(g, ['rest']);
  console.log(`하르펜→왕도: ${mm}달 (군마)`);
  if (mm > 1) fail('mount did not speed travel', mm, JSON.stringify(t));
  // 매사냥, 말 달리기
  placeAt(g, 'verden');
  addAnimal(g, 'hawk', { ageYears: 2, trained: 100, bond: 70 });
  // 매사냥 벌이만 재려고, 돈이 크게 드는 장터 성유물 사기는 이 석 달 동안 막아 둔다 (31단계: 사건이 늘어 이 판에 끼었다)
  (g.evLast ??= {}).relic_fake = g.date.year * 12 + g.date.month;
  // 매사냥 벌이는 달 넘김(endMonth)만으로 잰다. 그 뒤 사건(곡물 창고·삶의 장면 등)이 돈을 쓰는 것은 셈에 넣지 않는다 (34단계: 사건이 늘어 또 끼었다)
  let earned = 0;
  for (let i = 0; i < 3; i++) {
    g.player.fatigue = 0;
    const b = g.player.money;
    const hawk = availableActions(g).find((x) => x.id === 'beast_hawking');
    if (hawk) { endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: 'beast_hawking' }))); earned += g.player.money - b; }
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), 0);
  }
  if (earned <= 0) fail('hawking earned nothing', earned);
  // 그사이 다른 사건이 말을 앗아 갔으면 다시 들인다 (점검이 사건 굴림에 갈리지 않게)
  if (!alive(g).some((a) => a.kind === 'warhorse')) addAnimal(g, 'warhorse', { ageYears: 5, trained: 100, bond: 70 });
  const agi0 = g.player.stats.agi;
  for (let i = 0; i < 3; i++) { month(g, ['beast_ride']); heal(g); }
  if (g.player.stats.agi <= agi0) fail('riding no agi');
}

/* ---------- 3) 사역마, 팔기, 놓아주기 ---------- */
{
  let got = 0, tries = 0;
  for (let run = 0; run < 6; run++) {
    const g = adult(63000 + run);
    placeAt(g, 'serenia');
    Object.assign(g.player, { manaAwakened: true, manaPotential: g.player.manaPotential || 60, mana: Math.max(g.player.mana ?? 0, 400) });
    Object.assign(g.player.stats, { int: 60, wil: 55 }); g.player.skills.magic = 50;
    g.player.money = 100;
    if (!availableActions(g).some((a) => a.id === 'beast_familiar')) { fail('familiar action missing', run, g.player.mana); continue; }
    for (let i = 0; i < 4 && !familiarOf(g); i++) { tries++; scene(g, 'beast_familiar', {}, [/먼 곳/, /거짓/, /글을/, /위험/][run % 4]); g.player.money = 100; }
    if (familiarOf(g)) got++;
    if (run === 0 && familiarOf(g)) {
      const mana0 = g.player.mana;
      for (let i = 0; i < 3; i++) month(g, ['rest']);
      if (g.player.mana <= mana0) fail('familiar no mana');
      runHooks('heir', g, rngOf(g), g.player);
      if (familiarOf(g)) fail('familiar survived heir');
    }
  }
  console.log(`사역마: ${got}/6 (의식 ${tries}번)`);
  if (got < 3) fail('familiar too hard', got);
  // 팔기
  const g = adult(63102);
  placeAt(g, 'leocast');
  const w = addAnimal(g, 'direwolf', { ageYears: 4, trained: 100, bond: 50 });
  const price = sellPrice(g, w);
  if (price <= buyPrice('direwolf')) fail('tamed beast not worth more', price);
  const m0 = g.player.money;
  scene(g, 'beast_sell', {}, /서리늑대.*판다/);
  if (g.player.money < m0 + price - 40) fail('sell money', g.player.money, m0, price); // 그달 다른 일로 은화가 조금 빠질 수 있다
  const dog = addAnimal(g, 'dog', { ageYears: 2, trained: 50 });
  scene(g, 'beast_sell', {}, new RegExp(`${dog.name}.*놓아준다`));
  if (dog.alive) fail('release failed');
}

/* ---------- 4) 날의 일, 죽음, 굶김 ---------- */
{
  let tried = 0;
  for (const ev of Object.keys(BEAST_EVENTS)) {
    for (let c = 0; c < 3; c++) {
      const g = adult(64000 + tried);
      const place = ev === 'cub' ? 'fur' : ev === 'egg_offer' ? 'saltmare' : 'harfen';
      placeAt(g, place);
      g.player.money = 200;
      addAnimal(g, 'dog', { ageYears: 4, trained: 80, bond: ev === 'dog_bite' ? 40 : 60 });
      if (ev === 'horse_lame') addAnimal(g, 'horse', { ageYears: 6, trained: 100, bond: 50 });
      if (ev === 'hawk_flee') addAnimal(g, 'hawk', { ageYears: 3, trained: 100, bond: 50 });
      if (ev === 'beast_loose') addAnimal(g, 'direwolf', { ageYears: 3, trained: 30, bond: 20 });
      if (ev === 'familiar_vision' || ev === 'familiar_witch') { const f = addAnimal(g, 'familiar', { trained: 100, bond: 60, form: '까마귀' }); f.formId = 'raven'; }
      // 41단계: 주사위가 밀려 스물한 살 말이 장면 전에 숨을 거두는 판이 나왔다. 늙음 문턱(16살)은 넘되 덜 늙은 열일곱 살로
      if (ev === 'old_friend') addAnimal(g, 'horse', { ageYears: 17, trained: 100, bond: 70 });
      if (ev === 'stray' || ev === 'cub' || ev === 'egg_offer') { B(g).animals = []; }
      const S = BEAST_EVENTS[ev];
      if (!S.when(g)) { fail('event condition false in setup', ev); break; }
      const n = S.choices(g, S.pick(g, {}), {}).length;
      if (c >= n) continue;
      tried++;
      let shown = false;
      for (let i = 0; i < 4 && !shown; i++) {
        L(g).queue = L(g).queue.filter((q) => q.kind !== 'beast_event');
        queueScene(g, 'beast_event', { ev }, { first: true });
        month(g, ['rest'], (k, labels, s) => { if (k !== 'beast_event' || s.ev !== ev) return -1; shown = true; return c; });
      }
      if (!shown) fail('beast event never shown', ev, c);
    }
  }
  console.log(`짐승과 사는 날: ${Object.keys(BEAST_EVENTS).length}종, 선택지 ${tried}개`);
  // 늙어 죽음
  let deaths = 0;
  for (let run = 0; run < 4; run++) {
    const g = adult(64500 + run);
    placeAt(g, 'ern');
    g.player.money = 500;
    const d = addAnimal(g, 'dog', { ageYears: 14.5, trained: 100, bond: 90 });
    for (let m = 0; m < 24 && d.alive; m++) month(g, ['rest'], (k, labels) => (k === 'beast_death' ? idxOf(labels, run % 2 ? /묻어/ : /곁을/) : -1));
    if (!d.alive) deaths++;
  }
  console.log(`늙은 개 4판: 숨을 거둔 것 ${deaths}`);
  if (deaths < 3) fail('old dogs never die', deaths);
  // 굶김
  const g = adult(64600);
  placeAt(g, 'harfen');
  addAnimal(g, 'warhorse', { ageYears: 5, trained: 100, bond: 40 });
  addAnimal(g, 'direwolf', { ageYears: 5, trained: 100, bond: 40 });
  for (let m = 0; m < 12; m++) { g.player.money = 0; g.player.familyMoney = 0; month(g, ['rest']); }
  if (alive(g).length >= 2) fail('starved beasts stayed', alive(g).length, JSON.stringify(B(g)).slice(0, 200));
}

/* ---------- 5) 대 잇기, 옛 저장, 저절로 ---------- */
{
  const g = adult(65000);
  const dog = addAnimal(g, 'dog', { ageYears: 2, trained: 100, bond: 80 });
  const f = addAnimal(g, 'familiar', { trained: 100, bond: 80, form: '흰 올빼미' });
  runHooks('heir', g, rngOf(g), g.player);
  if (!alive(g).some((a) => a.kind === 'dog')) fail('heir lost dog');
  if (f.alive) fail('familiar outlived owner');
  // 어릴 때부터 기르던 짐승이 먼저 있을 수 있어 방금 들인 개를 본다
  if (dog.bond !== 40) fail('heir bond', dog.bond);
  const o = adult(65100);
  delete o.beasts; delete o.player.skills.animals;
  runHooks('migrate', o);
  if (!o.beasts || o.player.skills.animals !== 0) fail('migrate failed');
  let owned = 0, tamedAny = 0;
  for (let run = 0; run < 4; run++) {
    const a = adult(65200 + run);
    placeAt(a, ['harfen', 'fur', 'leocast', 'saltmare'][run]);
    for (let m = 0; m < 180 && !a.over; m++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.3) ? ['beast_buy', 'beast_care', 'beast_ride', 'beast_hawking', 'beast_sell'] : [rngOf(a).pick(acts).id];
      a.player.money = Math.max(a.player.money, 30);
      month(a, want);
      owned = Math.max(owned, alive(a).length);
      tamedAny += alive(a).filter((x) => x.trained >= 100 && KINDS[x.kind].beast).length ? 1 : 0;
    }
  }
  console.log(`저절로 15년 4판: 한때 가장 많이 기른 수 ${owned}`);
  if (!owned) fail('autoplay never owned a beast');
}

console.log('장면:', JSON.stringify(seen.scenes));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
