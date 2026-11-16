import '../src/content.js';
// 군대의 삶(src/army/)을 브라우저 없이 돌려 보는 점검.
// 1) 입대하고 훈련하면 공이 쌓이고 계급이 오른다. 십인장·백인장(임관금)·천인장.
// 2) 전쟁이 나면 출정한다. 행군 장면, 큰 싸움(병사는 대열 안, 백인장부터 지휘), 포로가 되기도 한다.
// 3) 포로: 할 수 있는 일이 줄고, 탈출·몸값·교환으로 풀려난다.
// 4) 탈영(일을 버림, 병영을 비움, 싸움에서 달아남)과 헌병 추적, 징집.
// 5) 복무 기한, 퇴역과 연금, 전쟁의 상처, 옛 저장, 대 잇기, 저절로 살아 보기, armyStatus.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { takeJob, jobRank } from '../src/jobs.js';
import { realmState } from '../src/realms/index.js';
import { isJailed } from '../src/crime.js';
import { A, MERIT, addScar } from '../src/army/core.js';
import { armyStatus, MARCH } from '../src/army/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const seen = { scenes: {}, march: {} };
const samples = [];

function month(g, want = [], pick = null) {
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = want.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (!a || g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? acts.find((x) => x.id === 'army_captive_wait') ?? acts[0];
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) if (bad(r.text)) fail('bad result', r);
  let guard = 0;
  while (g.pendingEvent && guard++ < 5) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
    if (s?.kind === 'army_march') seen.march[s.ev] = (seen.march[s.ev] ?? 0) + 1;
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    // 기본으로는 탈영하지 않는다 (탈영은 따로 시험한다)
    if (s?.kind === 'army_muster') idx = 0;
    if (s?.kind === 'army_clash' && /달아난다/.test(pe.choices[idx])) idx = 0;
    if (s?.kind === 'army_march' && /같이 간다/.test(pe.choices[idx])) idx = 0;
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^army_/.test(s?.kind ?? '') && samples.length < 80) samples.push(`[${pe.title}] ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = armyStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'farmer') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '병사', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; }
function scene(g, kind, data, re, opt = {}) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, opt.want ?? ['rest'], (k, labels) => { if (k !== kind) return opt.other?.(k, labels) ?? -1; done = true; const i2 = idxOf(labels, re); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, JSON.stringify(data), L(g).place, !!A(g).service, playerAge(g), JSON.stringify(L(g).queue.map((q) => q.kind)));
  if (done && !chose && !g.over) fail('choice not found', kind, re);
  return done;
}
const peace = (g) => { g.realm.balhart.war = false; g.realm.north.war = false; if (g.realm.succession === 'civilwar') g.realm.succession = 'settled'; if (g.politics) g.politics.wars = []; };
const war = (g) => { g.realm.balhart.war = true; g.realm.balhart.warMonths = 0; };
const heal = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; };
function soldier(seed, family = 'farmer', place = 'harfen') {
  const g = adult(seed, family);
  placeAt(g, place);
  peace(g);
  if (!A(g).service) scene(g, 'army_enlist', {}, /서명한다/);
  if (!A(g).service) fail('enlist failed', seed, playerAge(g), L(g).place, L(g).fac?.knights?.member, isJailed(g), L(g).travel);
  return g;
}

/* ---------- 1) 입대와 진급 ---------- */
{
  let ranks = 0, valid = 0;
  for (let run = 0; valid < 3 && run < 6; run++) {
    const g = soldier(41000 + run);
    if (L(g).job?.id !== 'soldier' || L(g).home !== 'barracks') fail('soldier job/lodging', L(g).job, L(g).home);
    const m0 = g.player.money;
    const who = g.player.id;
    for (let m = 0; m < 24 && !g.over && A(g).service; m++) { peace(g); if (L(g).place !== A(g).service.place) placeAt(g, A(g).service.place); month(g, ['work']); heal(g); }
    // 병으로 죽어 대가 바뀐 삶은 복무 점검에서 뺀다 (다른 모듈이 늘어 난수가 밀리면 생길 수 있다)
    if (g.player.id !== who || g.over) { console.log('복무 중 죽음, 이 판은 건너뜀', run); continue; }
    if (!A(g).service) { fail('lost service in peace', A(g).deserted); continue; }
    ranks += A(g).service.rank; valid++;
    if (g.player.money <= m0) fail('soldier earned nothing');
  }
  console.log(`평시 2년 3판: 오른 계급 합 ${ranks}`);
  if (ranks < 3) fail('too slow promotion', ranks);
  // 십인장 → 백인장: 평민은 임관금, 귀족은 그냥
  const g = soldier(41100);
  Object.assign(A(g).service, { rank: 2, merit: MERIT[3], months: 30 });
  Object.assign(g.player.stats, { int: 50, cha: 50, wil: 50 }); g.player.skills.letters = 30; g.player.money = 120;
  scene(g, 'army_promote', { to: 3 }, /임관금/);
  if (A(g).service.rank !== 3 || g.player.money > 55) fail('commission not bought', A(g).service.rank, g.player.money);
  const n = soldier(41200, 'fallen_knight');
  Object.assign(A(n).service, { rank: 2, merit: MERIT[3], months: 30 });
  Object.assign(n.player.stats, { int: 50, cha: 50, wil: 50 }); n.player.skills.letters = 30;
  scene(n, 'army_promote', { to: 3 }, /받는다/);
  if (A(n).service.rank !== 3) fail('noble promotion failed');
  if (jobRank(n) !== 3) fail('jobRank should follow army rank', jobRank(n));
}

/* ---------- 2) 원정과 싸움 ---------- */
{
  let battles = 0, wins = 0, caught = 0, medals = 0, scars = 0;
  const choicesTried = new Set();
  for (let run = 0; run < 16; run++) {
    const officer = run % 4 === 3;
    const g = soldier(42000 + run);
    if (officer) { A(g).service.rank = 3; Object.assign(g.player.stats, { int: 45, cha: 45, wil: 45 }); }
    g.player.skills.sword = 30 + run * 2;
    war(g);
    scene(g, 'army_muster', { war: { key: 'balhart', name: '발하르트 전선', kind: 'realm' } }, /대열에 선다/);
    if (!A(g).campaign) { fail('campaign not started'); continue; }
    // 원정 중에는 할 수 있는 일이 줄어든다
    const ids = availableActions(g).map((a) => a.id);
    if (ids.some((id) => ['seek_job', 'housing', 'army_enlist', 'on_road'].includes(id))) fail('free actions during campaign', ids.join(','));
    const want = ['line', 'front', 'back', 'line'][run % 4];
    for (let m = 0; m < 8 && A(g).campaign && !g.over; m++) {
      war(g);
      month(g, ['work'], (k, labels) => { if (k !== 'army_clash') return -1; const i = officer ? idxOf(labels, [/정면/, /측면/, /언덕/, /밤을/][run % 4 === 3 ? (run >> 2) % 4 : 0]) : idxOf(labels, { line: /대열을 지킨다/, front: /앞장서서/, back: /몸을 사린다/ }[want]); choicesTried.add(labels[i]); return i; });
      heal(g);
    }
    if (A(g).campaign) fail('campaign never ended', A(g).campaign);
    battles += A(g).battles; wins += A(g).won; medals += A(g).medals.length; scars += A(g).scars.length;
    if (A(g).captive) caught++;
  }
  console.log(`원정 16판: 싸움 ${battles}, 이김 ${wins}, 포로 ${caught}, 훈장 ${medals}, 상처 ${scars}, 행군 장면 ${Object.keys(seen.march).length}/${MARCH.length}`);
  if (battles < 14) fail('too few battles', battles);
  if (!wins || wins === battles) fail('battles should both win and lose', wins, battles);
  if (Object.keys(seen.march).length < 6) fail('too few march scenes', JSON.stringify(seen.march));
  // 싸움에서 달아나면 탈영이다
  const g = soldier(42500); war(g);
  scene(g, 'army_muster', { war: { key: 'garbes', name: '북부 변경', kind: 'realm' } }, /대열에 선다/);
  A(g).campaign.month = A(g).campaign.months - 1;
  for (let m = 0; m < 3 && A(g).campaign; m++) month(g, ['work'], (k, labels) => (k === 'army_clash' ? idxOf(labels, /달아난다/) : -1));
  if (A(g).service || !A(g).deserted) fail('fleeing battle should be desertion');
  // 평시 토벌
  const p = soldier(42600);
  scene(p, 'army_muster', { war: { key: 'bandits', name: '산적 토벌', kind: 'peace' } }, /대열에 선다/);
  for (let m = 0; m < 4 && A(p).campaign; m++) { peace(p); month(p, ['work']); }
  if (A(p).campaign) fail('peace campaign should end');
  // 정치 전쟁(레오니아 대 다른 나라)도 출정 대상이다
  const q = soldier(42700);
  q.politics.wars.push({ a: 'leonia', b: 'valhart', since: 0, score: 0, weary: 0, taken: [] });
  const { warsForArmy } = await import('../src/army/campaign.js');
  if (!warsForArmy(q).some((w) => w.kind === 'politics')) fail('politics war not offered');
}

/* ---------- 3) 포로 ---------- */
{
  let escaped = 0, freed = 0;
  for (let run = 0; run < 6; run++) {
    const g = soldier(43000 + run); war(g);
    A(g).captive = { by: '발하르트 제국군', months: 0, ransom: 30, officer: false, war: 'balhart' };
    const ids = availableActions(g).map((a) => a.id);
    if (ids.some((id) => !['army_escape', 'army_captive_wait', 'rest', 'meditate'].includes(id))) fail('captive can do too much', ids.join(','));
    g.player.money = run % 2 ? 100 : 0;
    let ran = false;
    for (let m = 0; m < 14 && A(g).captive && !g.over; m++) { war(g); month(g, run % 2 === 0 ? ['army_escape'] : ['army_captive_wait'], (k, labels) => (k === 'army_ransom' ? 0 : -1)); heal(g); if ((g.lastResults ?? []).some((r) => /제 발로 걸어 나온/.test(r.text))) ran = true; }
    if (A(g).captive) fail('captive never freed');
    // 기록 끝 여섯 줄은 다른 갈래(짐승 등)의 일로 밀려날 수 있어, 이번 달 결과로 본다
    if (ran || /달아났다/.test(JSON.stringify(g.people.find((p) => p.id === g.player.id).history.slice(-6)))) escaped++; else freed++;
  }
  console.log(`포로 6판: 탈출 ${escaped}, 풀려남 ${freed}`);
  if (!escaped) fail('nobody escaped');
  // 전쟁이 끝나면 교환된다
  const g = soldier(43100); A(g).captive = { by: 'x', months: 0, ransom: 999, officer: false, war: 'balhart' }; peace(g);
  month(g, ['army_captive_wait']);
  if (A(g).captive) fail('captive should be exchanged when war ends');
}

/* ---------- 4) 탈영, 추적, 징집 ---------- */
{
  // 일을 그만두면 탈영
  const g = soldier(44000);
  scene(g, 'seek_job', {}, /그만둔다/);
  month(g, ['rest']);
  if (A(g).service || !A(g).deserted) fail('quitting job should be desertion');
  let hunted = 0;
  // 노숙하다 옥에 갇힐 수도 있다: 옥에서 나오면 다시 쫓긴다 (옥살이 동안은 기다린다)
  for (let m = 0; m < 72 && !g.over; m++) { month(g, ['rest'], (k, labels) => { if (k === 'army_hunted') { hunted++; return idxOf(labels, hunted % 2 ? /달아난다/ : /손을 내민다/); } return -1; }); }
  if (!hunted) fail('deserter never hunted in 6 years at harfen', JSON.stringify(A(g).deserted), L(g).place, isJailed(g), g.over, JSON.stringify(L(g).queue), JSON.stringify(seen.scenes));
  // 병영을 석 달 비우면 탈영
  const h = soldier(44100);
  placeAt(h, 'ern');
  for (let m = 0; m < 8 && A(h).service; m++) { peace(h); A(h).campaign = null; if (L(h).place === A(h).service.place) placeAt(h, 'ern'); month(h, ['rest']); }
  if (A(h).service || !A(h).deserted) fail('awol should become desertion', JSON.stringify(A(h).service), L(h).place, L(h).job?.id, isJailed(h), JSON.stringify(A(h).deserted));
  // 옥에 갇히면 쫓겨난다(탈영 아님)
  const j = soldier(44200);
  const { jail } = await import('../src/crime.js');
  jail(j, 2); month(j, ['rest']);
  if (A(j).service || A(j).deserted) fail('jailed soldier should be discharged, not deserter', !!A(j).service, A(j).deserted);
  // 징집
  let pressed = 0;
  for (let run = 0; run < 4; run++) {
    const p = adult(44300 + run); placeAt(p, 'ern'); war(p); L(p).job = null;
    scene(p, 'army_press', {}, run % 2 ? /끌려간다/ : /숨는다/);
    if (A(p).service) pressed++;
  }
  if (!pressed) fail('press gang took nobody');
}

/* ---------- 5) 기한, 퇴역, 상처, 저장, 대 잇기, 저절로 ---------- */
{
  const g = soldier(45000);
  Object.assign(A(g).service, { rank: 2, months: 40, term: 1 });
  scene(g, 'army_term', {}, /떠난다/);
  if (A(g).service || !A(g).veteran) fail('retire failed');
  const pen = A(g).veteran?.pension ?? 0;
  if (!pen) fail('veteran of 3+ years should get pension', A(g).veteran);
  const m0 = g.player.money; month(g, ['rest']);
  if (g.player.money < m0 + pen - 30) fail('pension not paid');
  // 다시 입대: 연금은 멈추고 복무 햇수는 쌓인다
  placeAt(g, 'harfen'); scene(g, 'army_enlist', {}, /서명한다/);
  if (!A(g).service) fail('re-enlist failed');
  // 상처
  const s0 = g.player.stats.agi;
  for (let i = 0; i < 5; i++) addScar(g, rngOf(g), false);
  if (g.player.stats.agi >= s0) fail('body scars should cost something');
  addScar(g, rngOf(g), true);
  // 옛 저장
  const old = soldier(45100); delete old.army;
  const copy = JSON.parse(JSON.stringify(old)); setNextId(copy.nextId); runHooks('migrate', copy);
  if (!copy.army || !Array.isArray(copy.army.scars)) fail('migrate old save failed');
  // 대 잇기
  A(g).medals.push({ name: '시험 훈장', year: 600, why: 'x' });
  runHooks('heir', g);
  if (A(g).service || A(g).medals.length || !A(g).log.length) fail('heir reset wrong', JSON.stringify(A(g)).slice(0, 200));
  // 저절로: 15년씩, 전쟁과 평화가 오간다
  let maxRank = 0, deaths = 0, vets = 0;
  for (let run = 0; run < 5; run++) {
    const h = soldier(45200 + run, run % 2 ? 'merchant' : 'farmer');
    for (let m = 0; m < 12 * 15 && !h.over; m++) {
      if (m % 40 === 0) war(h); if (m % 40 === 18) peace(h);
      month(h, ['work', 'army_escape', 'army_enlist', 'rest']);
    }
    if (h.over) deaths++;
    maxRank = Math.max(maxRank, A(h).service?.rank ?? A(h).veteran?.rank ?? 0);
    if (A(h).veteran) vets++;
    if (verbose) console.log('저절로', run, JSON.stringify(armyStatus(h)).slice(0, 400));
  }
  console.log(`저절로 15년 5판: 가장 높은 계급 ${maxRank}, 죽음 ${deaths}, 퇴역 ${vets}`);
}

console.log(`장면: ${JSON.stringify(seen.scenes)}`);
if (verbose) for (const s of samples) console.log('·', s);
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
