import '../src/content.js';
// 새 일 갈래(src/vocation/)를 브라우저 없이 돌려 보는 점검.
// 1) 일곱 새 일과 사냥꾼: 일자리를 얻고 몇 해 일하면 솜씨 단계가 오르고, 이름값이 붙고, 고유 사건이 뜬다.
// 2) 그 일로만 가는 길: 갈림길마다 받아들이면 그 길이 열리고, 큰일(노래·책·영약·현자의 돌·건축)은 일하면 끝난다.
// 3) 사냥꾼: 덫 놓기, 달마다 걸리는 가죽, 가죽 팔기, 큰 짐승, 흰 수사슴과 잿빛 큰곰.
// 4) 음유시인의 떠돌며 노래하기, 물약, 옛 저장, 대 잇기, 저절로 살아 보기, vocationStatus.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { WORK, takeJob, jobRank } from '../src/jobs.js';
import { realmState } from '../src/realms/index.js';
import { V, vocOfJob } from '../src/vocation/core.js';
import { crimeState } from '../src/crime.js';
import { vocationStatus, VOC_JOB_IDS, PATHS, VOC_EVENTS } from '../src/vocation/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const seen = { scenes: {}, events: {}, paths: {} };
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
    if (s?.kind === 'voc_event') seen.events[s.ev] = (seen.events[s.ev] ?? 0) + 1;
    if (s?.kind === 'voc_path') seen.paths[s.path] = (seen.paths[s.path] ?? 0) + 1;
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^voc_/.test(s?.kind ?? '') && samples.length < 80) samples.push(`[${pe.title}] ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = vocationStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
function adult(seed, family = 'merchant') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '장인', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; }
// 장면 하나를 억지로 띄워 고른다
function scene(g, kind, data, re) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, ['rest'], (k, labels, s) => { if (k !== kind) return -1; done = true; const i2 = labels.findIndex((l) => re.test(l)); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, JSON.stringify(data));
  if (done && !chose && !g.over) fail('choice not found', kind, JSON.stringify(data), re);
  return done;
}
const healAll = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; };

/* ---------- 1) 일마다 몇 해씩 ---------- */
const SETUP = {
  physician: { place: 'harfen', sk: { herbs: 20, healing: 15 } },
  bard: { place: 'barka', st: { cha: 30 }, sk: { music: 15 } },
  tutor: { place: 'harfen', sk: { letters: 30 } },
  scholar: { place: 'leocast', sk: { letters: 48 } },
  alchemist: { place: 'serenia', st: { int: 35 }, sk: { alchemy: 10 } },
  carpenter: { place: 'verden', sk: { building: 5 } },
  mason: { place: 'graubel', st: { str: 30 }, sk: { building: 10 } },
  hunter: { place: 'verden', sk: { hunting: 10 } },
};
{
  for (const id of VOC_JOB_IDS) {
    const S = SETUP[id];
    let ranks = 0, fame = 0, money = 0, evs = 0;
    for (let run = 0; run < 3; run++) {
      const g = adult(30100 + run * 13 + id.length * 101);
      placeAt(g, S.place);
      Object.assign(g.player.stats, S.st ?? {});
      Object.assign(g.player.skills, S.sk ?? {});
      if (WORK[id].req?.(g)) { fail('req not met after setup', id, WORK[id].req(g)); continue; }
      if (!WORK[id].places.includes(S.place)) fail('job not offered at', id, S.place);
      takeJob(g, id);
      const r0 = jobRank(g), m0 = g.player.money;
      for (let m = 0; m < 12 * 5 && !g.over; m++) {
        if (L(g).place !== S.place) placeAt(g, S.place);
        if (L(g).job?.id !== id) takeJob(g, id);
        month(g, ['work']);
        if (g.player.injuries.length > 2) healAll(g);
        crimeState(g).jailed = null; // 다른 사건으로 갇히면 일을 잃는다: 이 점검은 일 자체만 본다
      }
      if (g.over) continue;
      if (L(g).job?.id !== id) takeJob(g, id);
      ranks += jobRank(g) - r0;
      fame += V(g).fame[vocOfJob(id)] ?? 0;
      money += g.player.money - m0;
      evs += Object.values(seen.events).reduce((a, b) => a + b, 0);
      const st = vocationStatus(g);
      if (st.voc !== vocOfJob(id) || !st.rank) fail('status voc wrong', id, st.voc, st.rank);
    }
    console.log(`${WORK[id].name}: 5년 3판 단계 +${ranks}, 이름값 ${Math.round(fame / 3)}, 번 돈 ${Math.round(money / 3)}`);
    if (ranks < 2) fail('too little progress', id, ranks);
    if (fame / 3 < 8) fail('fame too low', id, fame / 3);
    if (money / 3 < 60) fail('earned too little', id, money / 3);
  }
  const vocs = new Set(Object.keys(seen.events).map((e) => VOC_EVENTS.find((x) => x.id === e)?.voc));
  for (const v of ['healer', 'bard', 'teacher', 'alchemy', 'builder', 'hunter']) if (!vocs.has(v)) fail('no event seen for', v);
  console.log(`사건: ${Object.keys(seen.events).length}/${VOC_EVENTS.length}종, 갈림길: ${JSON.stringify(seen.paths)}`);
}

/* ---------- 2) 고유 사건 하나하나 ---------- */
{
  const JOB_OF = { healer: 'physician', bard: 'bard', teacher: 'scholar', alchemy: 'alchemist', builder: 'mason', hunter: 'hunter' };
  for (const e of VOC_EVENTS) {
    const g = adult(31000 + e.id.length * 7);
    const id = e.id === 'gifted_student' || e.id === 'noble_heir' ? 'tutor' : JOB_OF[e.voc];
    placeAt(g, SETUP[id].place);
    Object.assign(g.player.stats, SETUP[id].st ?? {}, { str: 35, int: 35, cha: 30 });
    for (const k of ['healing', 'music', 'letters', 'alchemy', 'building', 'hunting', 'herbs']) g.player.skills[k] = 60;
    takeJob(g, id);
    if (e.voc === 'builder') g.world.famine = true;
    if (e.when && !e.when(g)) { fail('event when false in setup', e.id); continue; }
    const nChoices = e.choices(g, {}).length;
    for (let c = 0; c < nChoices; c++) {
      const h = JSON.parse(JSON.stringify(g)); setNextId(h.nextId); runHooks('migrate', h);
      const label = e.choices(h, {})[c].label;
      scene(h, 'voc_event', { ev: e.id }, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
}

/* ---------- 3) 갈림길과 큰일 ---------- */
function pathGame(seed, id, setup) {
  const g = adult(seed);
  placeAt(g, setup.place);
  Object.assign(g.player.stats, { str: 35, int: 40, cha: 35, sen: 30 });
  for (const k of ['healing', 'music', 'letters', 'alchemy', 'building', 'hunting', 'herbs', 'magic']) g.player.skills[k] = 85;
  g.player.money = 500;
  takeJob(g, setup.job);
  for (const [k, n] of Object.entries(setup.fame ?? {})) V(g).fame[k] = n;
  setup.pre?.(g);
  return g;
}
{
  const PS = {
    royal_physician: { job: 'physician', place: 'harfen', fame: { healer: 50 }, check: (g) => L(g).job.place === 'leocast' },
    plague_doctor: { job: 'physician', place: 'harfen', pre: (g) => { g.world.plague = true; } },
    court_bard: { job: 'bard', place: 'barka', fame: { bard: 50 }, check: (g) => L(g).job.place === 'leocast' },
    ballad: { job: 'bard', place: 'barka', proj: true },
    school: { job: 'tutor', place: 'harfen', pre: (g) => { V(g).students = 8; }, check: (g) => !!V(g).school && g.player.money >= 300 - 200 },
    book: { job: 'scholar', place: 'leocast', proj: true },
    elixir: { job: 'alchemist', place: 'serenia', proj: true },
    stone: { job: 'alchemist', place: 'serenia', fame: { alchemy: 40 }, proj: true },
    build: { job: 'mason', place: 'graubel', proj: true },
    white_stag: { job: 'hunter', place: 'verden' },
    beast_slayer: { job: 'hunter', place: 'verden' },
  };
  for (const p of PATHS) if (!PS[p.id]) fail('path without test', p.id);
  for (const [id, S] of Object.entries(PS)) {
    const p = PATHS.find((x) => x.id === id);
    const g = pathGame(32000 + id.length * 31, id, S);
    if (!p.when(g)) { fail('path when false', id); continue; }
    const yes = p.choices(g).find((c) => c.key !== 'no');
    scene(g, 'voc_path', { path: id }, new RegExp(yes.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    if (S.check && !S.check(g)) fail('path effect missing', id);
    if (!S.proj && !['beast_slayer'].includes(id) && !Object.keys(V(g).paths).length) fail('path not taken', id);
    if (S.proj) {
      if (!V(g).project) { fail('project not started', id); continue; }
      const before = V(g).works.length;
      for (let m = 0; m < 12 * 4 && V(g).project && !g.over; m++) { if (L(g).place !== S.place) placeAt(g, S.place); month(g, ['work']); healAll(g); if (g.army) { g.army.service = null; g.army.campaign = null; g.army.captive = null; } if (g.crime) g.crime.jailed = null; } // 군대에 끌려가거나 갇히면 일을 못 한다: 이 점검은 일만 본다
      if (g.over) { console.log(`  (${id}: 일하다 병으로 죽은 판, 건너뜀)`); continue; } // 드물게 어른도 병사한다
      if (V(g).project) fail('project not finished in 4 years', id, V(g).project);
      if (id !== 'stone' && V(g).works.length <= before) fail('project left no work', id);
    }
    // 거절도 해 본다
    const h = pathGame(32500 + id.length * 31, id, S);
    if (p.when(h)) scene(h, 'voc_path', { path: id }, /아직|거절|않는다|아니다|남는다|두고|헛된|맡지|살아 있는|시위를|이르다|없다/);
  }
  // 현자의 돌: 여러 판 중에 성공도 실패도 있어야 한다
  let ok = 0, ko = 0;
  for (let run = 0; run < 10; run++) {
    const g = pathGame(33000 + run, 'stone', PS.stone);
    scene(g, 'voc_path', { path: 'stone' }, /시작한다/);
    for (let m = 0; m < 12 * 4 && V(g).project && !g.over; m++) { if (L(g).place !== 'serenia') placeAt(g, 'serenia'); month(g, ['work']); healAll(g); }
    if (V(g).paths.philosopher) ok++; else ko++;
  }
  console.log(`현자의 돌 10판: 성공 ${ok}, 실패 ${ko}`);
  if (!ok || !ko) fail('stone should both succeed and fail sometimes');
}

/* ---------- 4) 사냥꾼: 덫·가죽·큰 짐승 ---------- */
{
  let pelts = 0, sold = 0, beasts = 0, legend = 0;
  for (let run = 0; run < 4; run++) {
    const g = adult(34000 + run, 'farmer');
    placeAt(g, 'verden');
    g.player.skills.hunting = 45; g.player.money = 100;
    takeJob(g, 'hunter');
    for (let m = 0; m < 24 && !g.over; m++) {
      if (L(g).place !== 'verden') placeAt(g, 'verden');
      const p0 = V(g).pelts;
      month(g, ['voc_traps', 'work']);
      pelts += Math.max(0, V(g).pelts - p0);
      if (m % 6 === 5) { crimeState(g).jailed = null; /* 다른 갈래 사건으로 갇혀 있으면 가죽을 못 판다 */ if (L(g).place !== 'verden') placeAt(g, 'verden'); const m0 = g.player.money, n = V(g).pelts; month(g, ['voc_pelts']); if (n && g.player.money <= m0) fail('pelts sold for nothing'); sold += n - V(g).pelts; }
      healAll(g);
    }
    if (!V(g).traps && !V(g).lastCatch && !pelts) fail('traps do nothing');
    // 큰 짐승 억지로
    for (const b of ['great_boar', 'cave_bear', 'mana_bear']) { const t = V(g).trophies.length; g.player.skills.hunting = 80; g.player.stats.agi = 45; g.player.stats.sen = 45; scene(g, 'voc_beast', { beast: b }, /숨어서/); healAll(g); beasts += V(g).trophies.length - t; }
    const h = JSON.parse(JSON.stringify(g)); setNextId(h.nextId); runHooks('migrate', h);
    scene(h, 'voc_beast', { beast: 'ash_bear' }, /숨어서/);
    if (V(h).paths.beast_slayer) legend++;
  }
  console.log(`사냥 2년 4판: 가죽 ${pelts}장, 판 가죽 ${sold}장, 큰 짐승 ${beasts}/12, 잿빛 큰곰 ${legend}/4`);
  if (pelts < 20) fail('too few pelts', pelts);
  if (!sold) fail('no pelts sold');
  if (beasts < 4) fail('hunters with skill 80 should win some beast fights', beasts);
  // 털가죽 시장에서 겨울 값이 더 좋다
  const g = adult(34100, 'farmer'); g.player.skills.hunting = 40; V(g).pelts = 5;
  placeAt(g, 'verden'); g.date.month = 7; const { peltPrice } = await import('../src/vocation/hunt.js'); const a = peltPrice(g);
  placeAt(g, 'fur'); g.date.month = 1; const b = peltPrice(g);
  if (!(b > a)) fail('fur market in winter should pay more', a, b);
  // 다른 고장으로 떠나면 덫을 잃는다
  V(g).traps = 6; V(g).trapAt = 'ern'; placeAt(g, 'leocast');
  for (let m = 0; m < 12; m++) month(g, ['rest']);
  if (V(g).traps > 1) fail('traps should be lost when away', V(g).traps);
}

/* ---------- 5) 음유시인 떠돌기, 물약, 옛 저장, 대 잇기, 저절로 ---------- */
{
  const g = adult(35000);
  placeAt(g, 'barka'); g.player.stats.cha = 35; g.player.skills.music = 30; takeJob(g, 'bard');
  placeAt(g, 'harfen');
  const m0 = g.player.money;
  for (let m = 0; m < 12; m++) { if (L(g).place !== 'harfen') placeAt(g, 'harfen'); month(g, ['voc_busk']); }
  if (g.player.money <= m0) fail('busking earned nothing');
  if (!availableActions(g).some((a) => a.id === 'voc_busk')) fail('busk not available away from job');
  V(g).banned.harfen = g.date.year * 12 + g.date.month + 6;
  if (availableActions(g).some((a) => a.id === 'voc_busk')) fail('busk should be blocked where banned');
  // 물약: 다치면 쓰고, 남으면 판다
  V(g).potions = 5; g.player.injuries = [{ name: '시험 상처', months: 4 }];
  month(g, ['rest']);
  if (g.over) console.log('  (물약 점검: 거리 공연 중 칼부림으로 죽은 판, 건너뜀)'); else if (V(g).potions !== 4 || g.player.injuries.some((w) => w.name === '시험 상처' && w.months > 0)) fail('potion not used', V(g).potions, g.player.injuries);
  const m1 = g.player.money; month(g, ['voc_potions']);
  if (V(g).potions !== 1 || g.player.money <= m1) fail('potions not sold', V(g).potions);
  // 옛 저장: vocation과 새 기술이 없고, 예전 사냥꾼은 일한 달 수로 솜씨를 채운다
  const old = adult(35100);
  placeAt(old, 'verden'); takeJob(old, 'hunter'); L(old).job.months = 60;
  delete old.vocation; for (const k of ['healing', 'music', 'alchemy', 'building', 'hunting']) delete old.player.skills[k];
  const copy = JSON.parse(JSON.stringify(old)); setNextId(copy.nextId); runHooks('migrate', copy);
  if (!copy.vocation || !Array.isArray(copy.vocation.works) || copy.player.skills.music !== 0) fail('migrate old save failed');
  if (!(copy.player.skills.hunting >= 30)) fail('old hunter should keep rank', copy.player.skills.hunting);
  for (let m = 0; m < 6; m++) month(copy, ['work']);
  // 대 잇기: 남긴 것과 학당은 남고, 사람에 묶인 것은 비운다
  V(g).works.push({ voc: 'bard', kind: '노래', name: '시험 노래', year: 600 }); V(g).school = { place: 'harfen', name: '시험 학당', year: 600 };
  V(g).project = { id: 'book', voc: 'teacher', name: 'x', prog: 1, need: 16, started: 0 }; V(g).traps = 5; V(g).fame.bard = 60;
  runHooks('heir', g);
  if (V(g).works.length !== 1 || !V(g).school || V(g).project || V(g).traps || V(g).fame.bard > 20) fail('heir reset wrong', JSON.stringify(V(g)).slice(0, 200));
  // 저절로: 새 일을 골라 15년씩
  for (let run = 0; run < 4; run++) {
    const h = adult(35200 + run);
    const id = ['physician', 'bard', 'alchemist', 'carpenter'][run];
    const S = SETUP[id];
    placeAt(h, S.place); Object.assign(h.player.stats, S.st ?? {}); Object.assign(h.player.skills, S.sk ?? {}); takeJob(h, id);
    for (let m = 0; m < 12 * 15 && !h.over; m++) month(h, ['work', 'voc_busk', 'voc_potions', 'voc_traps', 'voc_pelts', 'seek_job', 'rest']);
    if (verbose) console.log('저절로', id, JSON.stringify(vocationStatus(h)).slice(0, 300));
  }
}

console.log(`장면: ${JSON.stringify(seen.scenes)}`);
if (verbose) for (const s of samples) console.log('·', s);
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
