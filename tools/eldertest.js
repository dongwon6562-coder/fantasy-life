import './lsshim.js';
import '../src/content.js';
// 늙음과 마지막 해들 점검: 몸과 기억의 쇠함, 물러나기, 묵은 일 풀기, 마지막 여행, 회고록, 장례 준비, 임종, 장례와 무덤, 무덤의 원수와 낯선 사람, 앞 대 회고록, 옛 저장.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { elderState, elderInfo } from '../src/elder/index.js';
import { makePerson } from '../src/npc.js';
import { addGrudge, feudState } from '../src/feud/index.js';
import { crimeState } from '../src/crime.js';
import { takeJob } from '../src/jobs.js';
import { artsState } from '../src/arts/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === "string" && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const OLD_ACTS = ['elder_care', 'elder_retire', 'elder_visit', 'elder_journey', 'elder_memoir', 'elder_funeral', 'elder_tomb', 'work', 'rest'];

function elder(seed, age = 62, fam = 'farmer') {
  const g = newGame({ name: '노인', sex: seed % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = 'ern'; L(g).home = 'family';
  g.player.money = 300;
  return g;
}
function person(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: 40 * 12, job: 'farmer', ...opts });
  p.known = true; p.place = 'ern'; g.people.push(p);
  return p;
}
function kid(g, age = 30) {
  const k = person(g, { ageMonths: age * 12, lastName: g.player.lastName });
  if (g.player.sex === 'm') k.fatherId = me(g).id; else k.motherId = me(g).id;
  me(g).childIds.push(k.id);
  return k;
}
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
    if (idx < 0) idx = 0;
    const out = resolveEvent(g, rngOf(g), idx);
    ok(!bad(typeof out === 'string' ? out : ''), `bad outcome ${kind}: ${out}`);
    ok(g.player.money >= 0, `money ${g.player.money} after ${kind}`);
    if (/^elder_/.test(kind) && samples.length < 24 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 90)} → ${String(out).slice(0, 140)}`);
  }
}
const idxOf = (re) => (pe) => Math.max(0, pe.choices.findIndex((c) => re.test(c)));
function play(g, months, prefer = OLD_ACTS, pick = {}, rate = 0.5) {
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
    for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
    resolveAll(g, pick);
    if (L(g).place !== 'ern' && !L(g).travel && !crimeState(g).jailed && rngOf(g).chance(0.3)) L(g).place = 'ern';
  }
}
const checkInfo = (g) => {
  const info = elderInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `elderInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  ok(info.frail >= 0 && info.frail <= 100 && info.fog >= 0 && info.fog <= 100, `frail/fog ${info.frail}/${info.fog}`);
  return info;
};

// 1) 몸과 기억이 쇠한다, 돌보면 늦어진다
{
  // 72살은 두 해 안에 죽을 수도 있다. 죽어 대가 바뀌면 쇠함이 처음부터라 비교가 안 되니, 둘 다 살아남은 판으로 본다
  let a, b;
  for (let seed = 1; seed < 9; seed++) {
    a = elder(seed, 72); b = elder(seed, 72);
    play(a, 24, ['rest'], {}, 1);
    play(b, 24, ['elder_care'], {}, 1);
    if (a.player.name === '노인' && b.player.name === '노인' && !a.over && !b.over) break;
  }
  const va = elderState(a), vb = elderState(b);
  // 늙은 몸은 병으로 일찍 떠날 수도 있다: 그 판은 쇠함을 잴 수 없다
  ok(a.over || (va.frail > 5 && va.fog > 2), `decline ${va.frail.toFixed(1)}/${va.fog.toFixed(1)}`);
  ok(a.over || b.over || vb.frail < va.frail, `care slows ${vb.frail.toFixed(1)} < ${va.frail.toFixed(1)}`);
  const y = elder(2, 30); play(y, 12, ['rest'], {}, 1);
  ok(elderState(y).frail === 0 && !availableActions(y).some((x) => x.id === 'elder_care'), 'young not frail');
  checkInfo(a);
}

// 2) 일에서 물러나기
{
  let retired = 0;
  for (let t = 0; t < 4; t++) {
    const g = elder(10 + t, 60);
    takeJob(g, 'farmer');
    kid(g, 32);
    play(g, 6, ['elder_retire'], { elder_retire: idxOf(t % 2 ? /물려준다/ : /은화를 받는다/) }, 1);
    if (elderState(g).retired && !L(g).job) retired++;
    checkInfo(g);
  }
  ok(retired >= 3, `retired ${retired}/4`);
}

// 3) 묵은 일 풀기: 원수를 찾아가 사과한다
{
  let eased = 0;
  for (let t = 0; t < 6; t++) {
    const g = elder(20 + t, 64);
    g.player.stats.cha = 60;
    const foe = person(g, { ageMonths: 66 * 12 });
    addGrudge(g, foe, 45, '젊을 때 밭 경계로 다퉜다');
    play(g, 10, ['elder_visit'], { elder_amends: idxOf(/은화 30닢|사과/) }, 1);
    const gr = feudState(g).grudges[foe.id];
    if (!gr || gr.heat < 45) eased++;
  }
  ok(eased >= 4, `amends eased ${eased}/6`);
}

// 4) 회고록: 다 쓰면 작품으로 남는다
{
  const g = elder(30, 62);
  g.player.skills.letters = 45;
  for (let i = 0; i < 6; i++) me(g).history.push({ y: 470 + i, m: 3, text: ['장터에서 은화 주머니를 훔쳤다.', '첫 아이가 태어났다.', '하르펜으로 이사했다.', '옛 벗을 배신했다.', '마을 축제를 맡았다.', '대장간을 차렸다.'][i] });
  play(g, 14, ['elder_memoir'], { elder_memoir: 0 }, 1);
  const v = elderState(g);
  ok(v.memoir?.done && v.memoir.workId != null, `memoir done ${JSON.stringify(v.memoir)}`);
  ok(artsState(g).works.some((w) => w.memoir), 'memoir in arts');
}

// 5) 장례 준비 → 임종 → 대 잇기 → 장례 → 무덤 → 무덤의 원수 → 앞 대 회고록
let deathbeds = 0, funerals = 0, graves = 0;
for (let t = 0; t < 6; t++) {
  const g = elder(40 + t, 68);
  g.player.money = 400;
  g.player.skills.letters = 40;
  const heir = kid(g, 40);
  kid(g, 36);
  const foe = person(g, { ageMonths: 50 * 12 });
  addGrudge(g, foe, 70, '형을 죽게 만들었다');
  let sawWish = true; // 물려받은 돈이 모자라 '뜻대로' 장례를 고를 수 없던 판은 무덤이 수수하다 (난수가 밀려 생김)
  const P = { elder_funeral_wish: idxOf(/가문 묘역/), elder_funeral: (pe) => { sawWish = pe.choices.some((c) => /뜻대로/.test(c)); return 0; }, elder_deathbed: idxOf(/손을 잡고/), elder_memoir: 0 };
  const db0 = seen.scenes.elder_deathbed ?? 0;
  play(g, 2, ['elder_funeral'], P, 1);
  ok(elderState(g).wish === 'family' || me(g).id === heir.id, `wish ${elderState(g).wish}`);
  const wished = elderState(g).wish === 'family'; // 바람을 고르기 전에 먼저 죽은 판은 무덤이 수수하다 (난수가 밀려 생김)
  play(g, 6, ['elder_memoir'], P, 1);
  if (!g.over && me(g).id !== heir.id) L(g).pendingDeath = '노환';
  for (let m = 0; m < 4 && me(g).id !== heir.id && !g.over; m++) { endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: 'rest' }))); resolveAll(g, P); }
  if ((seen.scenes.elder_deathbed ?? 0) > db0) deathbeds++;
  const v = elderState(g);
  const gr = v.graves.find((x) => x.byPlayer);
  if (gr) graves++;
  if (seen.scenes.elder_funeral) funerals++;
  ok(!gr || gr.epitaph != null, 'epitaph');
  if (me(g).id === heir.id) {
    ok(gr && (gr.kind === 'family' || !wished || !sawWish), `family grave ${gr?.kind}`);
    play(g, 30, ['elder_tomb', 'rest', 'work'], { elder_grave_foe: t % 3 }, 0.6);
  }
  checkInfo(g);
}
ok(deathbeds >= 4, `deathbeds ${deathbeds}/6`);
ok(graves >= 5, `graves ${graves}/6`);

// 6) 대 잇기 상태 정리, 옛 저장
{
  const g = elder(5, 70);
  elderState(g).frail = 50; elderState(g).wish = 'ash';
  runHooks('heir', g, rngOf(g), g.player);
  ok(elderState(g).frail === 0 && elderState(g).wish === null, 'heir reset');
  const old = JSON.parse(JSON.stringify(g)); delete old.elder;
  runHooks('migrate', old);
  ok(old.elder && Array.isArray(old.elder.graves), 'old save elder');
}

// 7) 여러 삶: 마흔다섯부터 끝까지, 대를 이어 가며
let lives = 0, kinGraves = 0;
for (let run = 0; run < 12; run++) {
  const g = elder(1000 + run, 45 + (run % 4) * 5, ['farmer', 'merchant', 'fallen_knight'][run % 3]);
  g.player.skills.letters = 20 + run * 3;
  for (let i = 0; i < 2 + (run % 3); i++) kid(g, 15 + i * 3);
  if (run % 2) addGrudge(g, person(g, { ageMonths: 35 * 12 }), 55, '빚 문제');
  const sp = person(g, { ageMonths: (60 + run) * 12, sex: g.player.sex === 'm' ? 'f' : 'm' });
  sp.spouseId = me(g).id; me(g).spouseId = sp.id;
  const start = L(g).gen ?? 1;
  play(g, 12 * 40, OLD_ACTS, { elder_funeral_wish: run % 6, elder_journey: 0 }, 0.45);
  if ((L(g).gen ?? 1) > start) lives++;
  kinGraves += elderState(g).graves.filter((x) => !x.byPlayer).length;
  checkInfo(g);
}
ok(lives >= 6, `lives continued ${lives}/12`);

// 8) 평범한 삶 (아이로 시작해 끝까지)
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 60, ['work', 'rest', 'elder_care', 'elder_tomb'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['elder_care', 'elder_retire', 'elder_visit', 'elder_journey', 'elder_memoir', 'elder_funeral', 'elder_tomb']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['elder_retire', 'elder_amends', 'elder_journey', 'elder_memoir', 'elder_funeral_wish', 'elder_forget', 'elder_deathbed', 'elder_funeral', 'elder_grave_foe', 'elder_grave_stranger', 'elder_memoir_read']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('elder_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('elder_')))));
console.log(`임종 ${deathbeds}/6, 장례 ${funerals}, 무덤 ${graves}/6, 대를 이은 삶 ${lives}/12, 식구 무덤 ${kinGraves}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `eldertest: ${fail} 실패` : 'eldertest: 통과');
process.exit(fail ? 1 : 0);
