import '../src/content.js';
// 큰 미궁(src/deep/)을 브라우저 없이 돌려 보는 점검.
// 1) 자료: 구렁목 가는 길, 지층·마물·유물.
// 2) 약한 사람·보통 사람·강한 사람이 내려가 본다: 문지기 돌문이 열리고, 위험·발견이 나오고, 죽기도 한다.
// 3) 유물: 감정, 쓰기(장비·능력치·지니기), 저주, 팔기.
// 4) 깊은 왕: 싸움, 봉인(반지), 계약(마물이 넘쳐 위기로).
// 5) 다른 탐사대가 저절로 내려가고 죽고 새로 생기는지, 옛 저장, 대 잇기, deepStatus.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { PLACES, travelMonths } from '../src/places.js';
import { FOES } from '../src/adventure/combat.js';
import { D, STRATA, RELICS, RELIC_IDS, FLOORS } from '../src/deep/core.js';
import { deepStatus } from '../src/deep/index.js';
import { realmState } from '../src/realms/index.js';
import { CR } from '../src/crisis/core.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const seen = { scenes: {}, gates: {}, deaths: 0 };
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
  for (const r of res) if (bad(r.text)) fail('bad result', r);
  let guard = 0;
  while (g.pendingEvent && guard++ < 4) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (s?.kind?.startsWith('deep') && samples.length < 40) samples.push(`[${pe.title}] ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  if (JSON.stringify(deepStatus(g)).match(/NaN|undefined/)) fail('bad status', deepStatus(g));
}
function scene(g, kind, re, data = {}) {
  let done = false;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    if (L(g).place !== 'gorge' && !L(g).travel) placeAt(g, 'gorge');
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, ['rest'], (k, labels) => { if (k !== kind) return -1; done = true; return labels.findIndex((l) => re.test(l)); });
  }
  if (!done && !g.over) fail('scene never shown', kind, L(g).place, L(g).queue);
  return done;
}
function adult(seed, family = 'farmer') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '구렁', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['work']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; }
function power(g, lv) {
  g.player.skills.sword = Math.max(g.player.skills.sword, lv);
  for (const k of ['str', 'agi', 'wil', 'sen', 'int']) g.player.stats[k] = Math.max(g.player.stats[k], Math.min(95, lv));
  g.player.injuries = []; g.player.fatigue = 0;
  L(g).gear.weapon = Math.max(L(g).gear.weapon ?? 0, Math.round(lv / 4));
  L(g).gear.armor = Math.max(L(g).gear.armor ?? 0, Math.round(lv / 6));
}

// 1) 자료
if (travelMonths('hammer', 'gorge') !== 1) fail('gorge not linked to hammer');
if (travelMonths('ern', 'gorge') >= 99) fail('gorge unreachable from ern');
for (const st of STRATA) {
  for (const [u] of st.foes) if (!FOES[u]) fail('missing foe', u);
  if (!FOES[st.guard.enc.unit] || !FOES[st.guard.enc.leader]) fail('missing guard foe', st.name);
}
for (let s = 0; s < STRATA.length; s++) if (!RELIC_IDS.some((id) => RELICS[id].st === s)) fail('no relic in stratum', s);

// 2) 내려가기: 세 수준의 사람이 1년씩
for (const [lv, label] of [[20, '약함'], [55, '보통'], [95, '강함']]) {
  let deepest = 0, gate = 0, deaths = 0, money = 0, relics = 0;
  for (let run = 0; run < 4; run++) {
    const g = adult(81000 + lv * 10 + run);
    placeAt(g, 'gorge');
    g.player.money += 300;
    for (let m = 0; m < 24 && !g.over; m++) {
      if (lv >= 55) power(g, lv);
      if (L(g).place !== 'gorge' && !L(g).travel) placeAt(g, 'gorge');
      const before = g.player.money;
      month(g, ['deep_descend'], (k, labels) => (k === 'deep_descend' ? labels.findIndex((l) => (lv >= 55 ? /과감하게/ : /신중하게/).test(l)) : -1));
      money += Math.max(0, g.player.money - before);
    }
    if (g.over) deaths++;
    deepest = Math.max(deepest, D(g).deepest);
    gate = Math.max(gate, D(g).gate);
    relics += D(g).relics.length + D(g).charms.length;
    seen.gates[label] = Math.max(seen.gates[label] ?? 0, D(g).gate);
  }
  console.log(`${label}(${lv}): 가장 깊이 ${deepest}층 · 연 돌문 ${gate} · 죽음 ${deaths}/4 · 유물 ${relics} · 번 돈 ${money}`);
  if (lv === 95 && gate < 15) fail('strong delver never got past 15', gate);
  if (lv === 20 && gate >= 15) fail('weak delver too deep', gate);
}
if (!seen.scenes.deep_descend) fail('descend scene never shown');

// 3) 유물
{
  const g = adult(82001, 'merchant');
  placeAt(g, 'gorge');
  g.player.money = 500;
  const d = D(g);
  d.relics = [{ id: 'lava_axe', known: false }, { id: 'heartstone', known: true }, { id: 'spore_crown', known: true }, { id: 'lamp', known: true }];
  const wBefore = L(g).gear.weapon ?? 0;
  scene(g, 'deep_market', /1번 물건을 감정한다/);
  if (!d.relics.find((r) => r.id === 'lava_axe')?.known) fail('appraise failed');
  scene(g, 'deep_market', /용암에 벼린 도끼날을 쓴다/);
  if ((L(g).gear.weapon ?? 0) < Math.max(wBefore, 13)) fail('gear relic not equipped', L(g).gear);
  const wil = g.player.stats.wil;
  scene(g, 'deep_market', /심장석을 쓴다/);
  if (g.player.stats.wil <= wil && wil < 100) fail('stat relic did nothing');
  const st = g.player.stress;
  scene(g, 'deep_market', /포자 왕관을 쓴다/);
  if (g.player.stress <= st && st < 100) fail('curse did nothing');
  scene(g, 'deep_market', /등불을 쓴다/);
  if (!d.charms.includes('lamp')) fail('charm not kept');
  d.relics.push({ id: 'star_map', known: true });
  const money = g.player.money;
  scene(g, 'deep_market', /별 지도를 판다/);
  if (g.player.money <= money) fail('sell gave nothing');
}

// 4) 깊은 왕
{
  // 싸움
  let slain = 0;
  for (let run = 0; run < 3; run++) {
    const g = adult(83000 + run);
    placeAt(g, 'gorge'); power(g, 95);
    g.player.skills.sword = 100; L(g).gear.weapon = 30; L(g).gear.armor = 20;
    D(g).gate = FLOORS;
    for (let i = 0; i < 4 && D(g).lord === 'alive' && !g.over; i++) { power(g, 95); D(g).ally = { name: '붉은 방패단의 브론', pow: 150 }; scene(g, 'deep_throne', /정면으로/); }
    if (D(g).lord === 'slain') slain++;
  }
  console.log(`깊은 왕 싸움: 3번 중 ${slain}번 쓰러뜨림`);
  if (!slain) fail('deep king never slain by a 95-level delver');
  // 봉인
  const s = adult(83101);
  placeAt(s, 'gorge'); D(s).gate = FLOORS; D(s).relics.push({ id: 'gron_ring', known: true });
  scene(s, 'deep_throne', /반지로/);
  if (D(s).lord !== 'sealed') fail('seal failed', D(s).lord);
  // 계약 → 마물이 넘친다
  const p = adult(83201);
  placeAt(p, 'gorge'); D(p).gate = FLOORS;
  const w = p.player.stats.str;
  scene(p, 'deep_throne', /무릎을 꿇고/);
  if (D(p).lord !== 'pact' || p.player.stats.str <= w) fail('pact failed', D(p).lord);
  let spawned = false;
  CR(p).active = null;
  for (let m = 0; m < 12 * 25 && !p.over && !spawned; m++) { month(p, ['rest']); if (CR(p).active?.id === 'horde' || CR(p).past.some((c) => c.id === 'horde')) spawned = true; }
  if (!spawned && !p.over) fail('pact never spawned a horde');
  console.log(`봉인 ${D(s).lord} · 계약 ${D(p).lord} · 계약 뒤 검은 물결 ${spawned ? '옴' : '안 옴'}`);
}

// 5) 다른 탐사대, 옛 저장, 대 잇기
{
  let deepestRival = 0, deadRivals = 0, taken = 0, replaced = 0;
  for (let run = 0; run < 5; run++) {
    const g = newGame({ name: '세상', sex: 'f', familyId: 'farmer', mode: 'free', seed: 84000 + run });
    const names0 = D(g).rivals.map((r) => r.name).join();
    for (let m = 0; m < 12 * 40 && !g.over; m++) month(g, ['rest']);
    const d = D(g);
    deepestRival = Math.max(deepestRival, ...d.rivals.map((r) => r.best));
    deadRivals += d.rivals.filter((r) => !r.alive).length;
    if (d.lord === 'taken') taken++;
    if (d.rivals.map((r) => r.name).join() !== names0) replaced++;
  }
  console.log(`다른 탐사대(40년 5판): 가장 깊이 ${deepestRival}층 · 전멸한 채로 남은 ${deadRivals} · 새로 생긴 판 ${replaced} · 남이 왕을 쓰러뜨린 판 ${taken}`);
  if (deepestRival < 8) fail('rivals never go deep');
  if (!replaced) fail('rivals never replaced');
  const g = adult(85001);
  delete g.deep;
  const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy);
  if (!copy.deep || !Array.isArray(copy.deep.rivals)) fail('migrate old save failed');
  D(g).gate = 20; D(g).relics.push({ id: 'lamp', known: true });
  runHooks('heir', g);
  if (D(g).gate !== 0 || !D(g).relics.length) fail('heir rule wrong', D(g));
}

console.log(`장면: ${JSON.stringify(seen.scenes)}`);
if (verbose) for (const s of samples) console.log('·', s);
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
