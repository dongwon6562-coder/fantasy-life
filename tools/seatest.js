import '../src/content.js';
// 바다와 항해(src/sea/)를 브라우저 없이 돌려 보는 점검.
// 1) 선원 일: 클라인 항에서 선원이 되어 단계가 오르는지.
// 2) 배 타기: 손님·뱃일·내 배로 섬과 다른 나라에 닿는지, 바다 사건이 고루 나오는지.
// 3) 배와 무역: 배를 사고 짐을 실어 다른 항구에서 파는지, 선원 삯이 나가는지.
// 4) 해적의 길: 해적단에 들고, 약탈로 단계가 오르고, 죄와 해군 추격이 따라오는지.
// 5) 영웅의 길: 해적 사냥, 소금바위섬 심해 뱀.
// 6) 옛 저장, 육로에서 섬이 빠지는지, 화면용 seaStatus.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { PLACES, travelMonths } from '../src/places.js';
import { WORK, takeJob, jobRank } from '../src/jobs.js';
import { S, SEA_ROUTES } from '../src/sea/core.js';
import { SEA_EVENTS } from '../src/sea/voyage.js';
import { seaStatus } from '../src/sea/index.js';
import { realmState, realmOf } from '../src/realms/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const seen = { events: {}, scenes: {}, arrived: new Set() };
const samples = [];

// 한 달: want에 적힌 행동을 먼저, 없으면 쉬기/일. pick(kind, keys)로 장면 선택을 고른다.
function month(g, want = [], pick = null) {
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = want.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (!a || g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) if (bad(r.text)) fail('bad result', r);
  for (const r of res) if (r.name === '도착') seen.arrived.add(L(g).place);
  let guard = 0;
  while (g.pendingEvent && guard++ < 4) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
    if (s?.kind === 'sea_event' && s.ev) seen.events[s.ev] = (seen.events[s.ev] ?? 0) + 1;
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (s?.kind && samples.length < 80 && /sea|sail|cargo|ship|pirate|navy|serpent/.test(s.kind)) samples.push(`[${pe.title}] ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = seaStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', st);
}
// 장면 하나를 띄워 고른다 (다른 사건이 먼저 뜨면 몇 달 기다린다)
function scene(g, kind, re, data = {}) {
  let done = false;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, ['rest'], (k, labels) => { if (k !== kind) return -1; done = true; return labels.findIndex((l) => re.test(l)); });
  }
  if (!done && !g.over) fail('scene never shown', kind, L(g).place, L(g).travel, L(g).queue, g.pendingEvent?.title, g.crime?.jailed, g.over);
  return done;
}
const byLabel = (re) => (kind, labels) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'farmer') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '바다', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['work']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = realmOf(place); R.last = place; }
function strong(g) {
  g.player.skills.sword = Math.max(g.player.skills.sword, 70);
  for (const k of ['str', 'agi', 'wil']) g.player.stats[k] = Math.max(g.player.stats[k], 70);
  g.player.injuries = [];
}

// 0) 자료 점검
for (const [a, b, m] of SEA_ROUTES) {
  if (!PLACES[a]?.port || !PLACES[b]?.port || !(m > 0)) fail('bad route', a, b, m);
}
for (const id of ['saltrock', 'saltmare', 'crow']) if (travelMonths('ern', id) < 99) fail('island reachable by land', id);
if (travelMonths('ern', 'klein') >= 99) fail('klein unreachable by land');
if (travelMonths('ern', 'portel') >= 99) fail('portel unreachable by land');

// 1) 선원 일
{
  const g = adult(71001);
  placeAt(g, 'klein');
  if (!WORK.sailor) fail('no sailor job');
  takeJob(g, 'sailor');
  let promoted = 0, text = '';
  for (let m = 0; m < 12 * 12 && !g.over; m++) {
    const before = jobRank(g);
    month(g, ['work']);
    if (L(g).job?.id === 'sailor' && jobRank(g) > before) promoted++;
  }
  if (!promoted) fail('sailor never promoted', g.player.skills.sailing);
  const r = WORK.sailor.work.call(WORK.sailor, g, rngOf(g));
  if (/sailing/.test(r)) fail('raw skill id in sailor text', r);
  text = r;
  console.log(`선원: ${promoted}번 승급, 뱃일 ${Math.floor(g.player.skills.sailing)} · ${text}`);
}

// 2) 배 타기: 손님, 뱃일, 여러 번
for (let run = 0; run < 20; run++) {
  const g = adult(72000 + run * 13);
  placeAt(g, ['klein', 'portel'][run % 2]);
  g.player.money += 200;
  for (let leg = 0; leg < 4 && !g.over; leg++) {
    if (!PLACES[L(g).place]?.port) break;
    scene(g, 'sail', leg % 2 ? /뱃일을 거들며/ : /손님으로/);
    let m = 0;
    while (L(g).travel && m++ < 12 && !g.over) month(g, ['sea_deck', 'at_sea']);
    if (L(g).travel) fail('voyage never ended', L(g).travel);
    if (!PLACES[L(g).place]?.port && !g.over && !g.crime?.jailed) fail('arrived somewhere not a port', L(g).place);
  }
}
for (const id of Object.keys(SEA_EVENTS)) if (id !== 'pirates' && !seen.events[id]) fail('sea event never seen', id);
console.log(`바다 사건: ${JSON.stringify(seen.events)} · 닿은 곳: ${[...seen.arrived].join(',')}`);
if (!seen.arrived.has('saltrock') && !seen.arrived.has('saltmare')) fail('never reached an island');

// 3) 배와 무역
{
  const g = adult(73001, 'merchant');
  placeAt(g, 'klein');
  g.player.skills.sailing = 65; g.player.money = 2000;
  scene(g, 'shipyard', /쌍돛 상선.*산다/);
  if (S(g).ship?.kind !== 'brig') fail('could not buy brig', S(g).ship);
  const before = g.player.money;
  scene(g, 'cargo', /^밀 /);
  if (S(g).cargo?.good !== 'grain' || S(g).cargo.qty !== 50) fail('cargo not loaded', S(g).cargo);
  scene(g, 'sail', /포르텔/);
  if (!L(g).travel?.own) fail('own ship not used', L(g).travel);
  let m = 0, sold = false;
  while (m++ < 12 && !g.over && !sold) {
    month(g, ['sea_deck'], (kind, labels) => (kind === 'cargo' ? labels.findIndex((l) => /판다/.test(l)) : kind === 'sea_event' ? labels.findIndex((l) => /달아난다|돛을|싸운다|맞선다|키를/.test(l)) : -1));
    if (L(g).place === 'portel' && !L(g).travel && !S(g).cargo) sold = true;
  }
  if (!sold && S(g).cargo) fail('cargo never sold at portel', L(g).place, S(g).cargo, L(g).queue);
  console.log(`무역: 배 ${S(g).ship?.name}(${S(g).ship?.hull}) · 장사 손익 ${S(g).profit} · 돈 ${before} → ${g.player.money}`);
  // 선원 삯이 밀리면 배를 잃는다
  g.player.money = 0;
  for (let i = 0; i < 4 && S(g).ship; i++) month(g, ['rest']);
  if (S(g).ship) fail('ship kept without wages', S(g).ship);
}

// 4) 해적의 길
{
  let ranks = 0, hunts = 0, piracy = 0, crowOpen = 0;
  for (let run = 0; run < 4; run++) {
    const g = adult(74000 + run * 7);
    placeAt(g, 'saltmare');
    strong(g);
    scene(g, 'pirate_den', /까마귀단에 들겠다/);
    if (!S(g).pirate) { fail('could not join pirates'); continue; }
    if (seaStatus(g).routes.some((r) => r.to === 'crow')) crowOpen++;
    for (let m = 0; m < 40 && !g.over; m++) {
      strong(g);
      if (L(g).place !== 'saltmare' && !L(g).travel) placeAt(g, 'saltmare');
      month(g, ['pirate_raid'], (kind, labels) => (kind === 'pirate_raid' ? labels.findIndex((l) => /상선|수송선/.test(l)) : -1));
    }
    if ((S(g).pirate?.rank ?? 0) >= 2) ranks++;
    hunts += seen.scenes.navy_hunt ?? 0;
    piracy += (g.crime?.record ?? []).filter((r) => r.c === 'piracy').length;
    if (verbose) console.log('해적', S(g).pirate, 'hunted', S(g).hunted, '악명', L(g).notoriety);
  }
  if (!ranks) fail('pirate never reached captain');
  if (!hunts) fail('navy never hunted a pirate');
  if (!piracy) fail('piracy never recorded as crime');
  if (crowOpen < 4) fail('crow route not opened for pirates');
  console.log(`해적: 선장 이상 ${ranks}/4 · 해군 추격 ${hunts} · 해적질 기록 ${piracy}`);
}

// 5) 영웅의 길
{
  const g = adult(75001);
  placeAt(g, 'klein');
  strong(g);
  for (let i = 0; i < 4; i++) { strong(g); queueScene(g, 'sea_bounty'); month(g, [], byLabel(/사냥에 나선다/)); }
  if (!(S(g).pirateKills > 0)) fail('no pirate bounty ever won');
  placeAt(g, 'saltrock');
  for (let i = 0; i < 6 && !S(g).lair; i++) { strong(g); g.player.skills.sword = 95; month(g, ['serpent_lair'], (kind, labels) => (kind === 'serpent_lair' ? 1 : -1)); }
  if (!S(g).lair) fail('serpent lair never cleared');
  console.log(`영웅: 해적 사냥 ${S(g).pirateKills} · 심해 뱀 ${S(g).lair ? '처치' : '못함'} · 명성 ${Math.round(L(g).renown)}`);
  // 해적이 배신하면 쫓긴다
  const h = adult(75002);
  placeAt(h, 'saltmare'); strong(h);
  scene(h, 'pirate_den', /까마귀단에 들겠다/);
  scene(h, 'pirate_den', /떠난다/);
  if (S(h).pirate || !S(h).traitor || S(h).hunted < 10) fail('quitting pirates had no cost', S(h));
}

// 6) 옛 저장, 대 잇기, 육로 목록
{
  const g = adult(76001);
  delete g.sea;
  delete g.player.skills.sailing;
  const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy);
  if (!copy.sea || copy.player.skills.sailing !== 0) fail('migrate old save failed', copy.sea);
  placeAt(g, 'klein');
  queueScene(g, 'travel');
  month(g, [], (kind, labels) => { if (kind === 'travel' && labels.some((l) => /소금바위|살트마레|까마귀/.test(l))) fail('island in land travel', labels); return labels.length - 1; });
  S(g).pirate = { rank: 2, raids: 9, share: 300 }; S(g).hunted = 40;
  runHooks('heir', g);
  if (S(g).pirate || S(g).hunted) fail('pirate status inherited');
}

// 7) 한 일생을 바다에서: 저절로 돌려도 멈추지 않는지
for (let run = 0; run < 3; run++) {
  const g = adult(77000 + run);
  placeAt(g, 'portel');
  g.player.money += 100;
  for (let m = 0; m < 12 * 15 && !g.over; m++) month(g, ['sail', 'cargo', 'shipyard', 'sea_deck', 'at_sea', 'sea_bounty', 'pirate_den', 'pirate_raid', 'work']);
}

console.log(`장면: ${JSON.stringify(seen.scenes)}`);
if (verbose) for (const s of samples) console.log('·', s);
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
