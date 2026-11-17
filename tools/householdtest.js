import './lsshim.js';
import '../src/content.js';
// 하인과 식솔 점검: 하인 들이기와 자리(estate 하인 수), 웃돈과 불만, 삯이 밀려 떠남, 훔치는 하인, 엿듣는 하인(입막음·내쫓기),
// 집사의 장부, 하인의 청, 늙은 하인과 대를 이어 섬기는 집안, 대 잇기, 큰 집안의 하인으로 살기(심부름·비밀·누명·금고·쫓겨남·주인 바뀜),
// 하인 자리가 대를 넘어 이어짐, 옛 저장, 여러 삶.
// 난수가 밀려도 갈리지 않게, 장면은 형편을 직접 맞추고 띄운다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { householdState, householdInfo } from '../src/household/index.js';
import { makePerson, kill } from '../src/npc.js';
import { homeOf, MAX_SERVANTS } from '../src/estate/core.js';
import { loveState } from '../src/love/index.js';
import { crimeState } from '../src/crime.js';
import { courtState } from '../src/court/index.js';
import { liveHouses } from '../src/history/nobles.js';
import { feudState } from '../src/feud/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['household_hire', 'household_manage', 'household_serve', 'work', 'rest'];

function adult(seed, { age = 30, place = 'ern', level = 2, house = true } = {}) {
  const g = newGame({ name: '주인', sex: seed % 2 ? 'm' : 'f', familyId: 'merchant', mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = place;
  if (house) { if (!L(g).houses.includes(place)) L(g).houses.push(place); L(g).home = 'own'; homeOf(g, place).level = level; }
  else L(g).home = 'inn';
  g.player.money = 400;
  homePlace.set(g, place);
  return g;
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
    if (/^household_/.test(kind) && samples.length < 30 && !samples.some((x) => x.startsWith(kind))) samples.push(`${kind}: ${pe.text.slice(0, 80)} → ${String(out).slice(0, 130)}`);
  }
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
    for (const r of g.lastResults) ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
    resolveAll(g, pick);
  }
}
// 장면 하나를 바로 띄우고 고른다 (다른 장면은 먼저 비운다)
// 난수에 따라 다른 사건이 먼저 와서 고장을 옮기거나 형편을 바꿀 수 있으니, 형편을 되돌리고 세 번까지 띄운다
const homePlace = new WeakMap();
function settle(g) {
  const pl = homePlace.get(g);
  if (pl && !crimeState(g).jailed) { L(g).place = pl; L(g).travel = null; }
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
const checkInfo = (g) => {
  const info = householdInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `householdInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};
const hireN = (g, n) => { for (let t = 0; t < 12 && householdState(g).staff.length < n; t++) play(g, 1, ['household_hire'], { household_hire: 0 }, 1); };
const liveStaff = (g) => householdState(g).staff.filter((s) => g.people.find((p) => p.id === s.pid)?.alive);
const named = (g) => householdState(g).staff.map((s) => ({ s, p: g.people.find((x) => x.id === s.pid) }));

// 1) 하인 들이기: 저택이면 넷까지, 자리는 estate 하인 수 안에서
{
  const g = adult(1);
  hireN(g, 4);
  const v = householdState(g), h = homeOf(g, 'ern');
  ok(v.staff.length === 4, `hired ${v.staff.length}`);
  ok(h.servants === 4 && h.servants <= MAX_SERVANTS[h.level], `servants ${h.servants}`);
  ok(!availableActions(g).some((a) => a.id === 'household_hire'), 'hire hidden when full');
  ok(new Set(v.staff.map((s) => s.role)).size >= 3, `roles ${v.staff.map((s) => s.role)}`);
  const info = checkInfo(g);
  ok(info.staff.length === 4 && info.staff.every((x) => x.roleName && x.wage >= 3), 'info staff');
  // 집이 없으면 들일 수 없다
  const n = adult(2, { house: false });
  ok(!availableActions(n).some((a) => a.id === 'household_hire'), 'no house no hire');
  // 집사의 웃돈이 못 나가면 불만
  const st = v.staff.find((s) => s.wage > 0) ?? v.staff[0];
  st.wage = Math.max(1, st.wage); st.grievance = 0;
  g.player.money = 0;
  play(g, 1, ['rest'], {}, 1);
  ok(st.grievance >= 8, `unpaid grievance ${st.grievance}`);
  // estate가 삯 밀린 하인을 내보내면 이름 있는 하인도 하나 준다
  g.player.money = 500;
  h.servants = 3;
  play(g, 1, ['rest'], {}, 1);
  ok(householdState(g).staff.length === 3, `reconcile ${householdState(g).staff.length}`);
  // 상 주기와 내보내기
  const s0 = liveStaff(g)[0]; s0.grievance = 50;
  scene(g, 'household_manage', {}, idxOf(/상을 준다/));
  ok(s0.grievance <= 25, `gift ${s0.grievance}`);
  const before = householdState(g).staff.length;
  scene(g, 'household_manage', {}, idxOf(/내보낸다/));
  ok(householdState(g).staff.length === before - 1 && homeOf(g, 'ern').servants === before - 1, 'dismiss');
}

// 2) 훔치는 하인: 다그치기와 방 뒤지기
{
  let found = 0, wrong = 0;
  for (let t = 0; t < 6; t++) {
    const g = adult(10 + t);
    hireN(g, 3);
    const v = householdState(g);
    if (liveStaff(g).length < 2) continue;
    const th = liveStaff(g)[0];
    th.trait = 'sly'; th.loyalty = 30;
    const m0 = g.player.money;
    scene(g, 'household_thief', { thief: th.id, what: '은촛대', worth: 10 }, t % 2 ? idxOf(/모두 뒤진다/) : 1);
    if (th.caught) found++; else wrong++;
    ok(g.player.money >= 0 && Number.isFinite(m0), 'money ok');
    checkInfo(g);
  }
  ok(found >= 3 && wrong >= 1, `thief found ${found} wrong ${wrong}`);
}

// 3) 엿듣는 하인: 비밀이 있을 때. 입막음, 내쫓기, 충성스러운 하인의 귀띔
{
  const g = adult(20);
  hireN(g, 3);
  const v = householdState(g);
  const lover = makePerson(rngOf(g), { ageMonths: 28 * 12 }); lover.known = true; lover.place = 'ern'; g.people.push(lover);
  loveState(g).affair = { id: lover.id, at: 0, risk: 0 };
  const e = liveStaff(g)[0];
  const m0 = g.player.money;
  scene(g, 'household_ears', { sid: e.id, secret: 'affair', warn: false }, idxOf(/스무 닢/));
  ok(e.knows === 'affair' && g.player.money <= m0 - 20, `hush ${g.player.money} ${m0}`);
  const e2 = liveStaff(g).find((x) => x !== e);
  e2.grievance = 70;
  scene(g, 'household_ears', { sid: e2.id, secret: 'affair', warn: false }, idxOf(/내쫓는다/));
  ok(!v.staff.includes(e2), 'ears out');
  const e3 = liveStaff(g).find((s) => s !== e);
  if (e3) { e3.loyalty = 85; scene(g, 'household_ears', { sid: e3.id, secret: 'affair', warn: true }, 0); ok(e3.loyalty >= 85, 'warn loyalty'); }
  // 비밀이 생기면 귀 밝은 하인이 저절로 알아챈다
  const h = adult(21);
  hireN(h, 3);
  for (const s of householdState(h).staff) { s.trait = 'ears'; s.loyalty = 40; }
  crimeState(h).murders = 1;
  let got = false;
  for (let m = 0; m < 80 && !got; m++) { play(h, 1, ['rest'], { household_ears: 0 }, 1); got = householdState(h).staff.some((s) => s.knows === 'blood') || (seen.scenes.household_ears ?? 0) > 3; }
  ok(got, 'ears natural');
}

// 4) 집사의 장부, 하인의 청
{
  const g = adult(30);
  for (let t = 0; t < 10 && !householdState(g).staff.some((s) => s.role === 'steward'); t++) play(g, 1, ['household_hire'], { household_hire: idxOf(/집사로/) }, 1);
  const stw = householdState(g).staff.find((s) => s.role === 'steward');
  ok(!!stw, 'steward hired');
  if (stw) {
    stw.trait = 'sly'; stw.loyalty = 20; stw.grievance = 0;
    let skimmed = false;
    for (let m = 0; m < 40 && !skimmed; m++) { play(g, 1, ['rest'], { household_skim: idxOf(/장부를 내민다/), household_grievance: 0 }, 1); skimmed = (seen.scenes.household_skim ?? 0) > 0; stw.loyalty = Math.min(stw.loyalty, 30); }
    ok(skimmed, 'skim scene');
  }
  const h = adult(31);
  hireN(h, 3);
  const [s, s2] = liveStaff(h);
  s.grievance = 75;
  scene(h, 'household_grievance', { sid: s.id }, idxOf(/한 닢을 더/));
  ok(s.wage >= 1 && s.grievance < 50, `raise ${s.wage} ${s.grievance}`);
  if (s2) { s2.grievance = 75; scene(h, 'household_grievance', { sid: s2.id }, idxOf(/거절/)); ok(!householdState(h).staff.includes(s2) && feudState(h).grudges[s2.pid], 'refuse → leave & grudge'); }
}

// 5) 늙은 하인과 대를 이어 섬기는 집안, 하인의 죽음
{
  const g = adult(40);
  hireN(g, 2);
  const v = householdState(g);
  const [a, b] = named(g);
  a.p.ageMonths = 61 * 12; a.s.since -= 12 * 20;
  let t = 0;
  while (t++ < 6 && !(seen.scenes.household_old > 0)) play(g, 1, ['rest'], { household_old: idxOf(/자식을 대신/) }, 1);
  ok(v.lines.length === 1 && v.lines[0].gens === 2, `line ${JSON.stringify(v.lines)}`);
  const kid = v.staff.find((s) => s.line === v.lines[0]?.id);
  ok(!!kid && kid.loyalty >= 55, 'servant kid hired');
  ok(homeOf(g, 'ern').servants === v.staff.length, `seat ${homeOf(g, 'ern').servants} ${v.staff.length}`);
  // 하인이 죽으면
  b.s.since -= 12 * 8;
  kill(g, b.p, '겨울 열병');
  const before = seen.scenes.household_old;
  play(g, 2, ['rest'], { household_old: idxOf(/장례를 치러 주고/) }, 1);
  ok(seen.scenes.household_old > before, 'death scene');
  ok(v.staff.every((s) => g.people.find((p) => p.id === s.pid)?.alive), 'no dead staff');
  ok(homeOf(g, 'ern').servants === v.staff.length, `seat after death ${homeOf(g, 'ern').servants} ${v.staff.length}`);
  // 대를 이으면 하인은 남고, 몇 대를 섬겼는지가 쌓인다
  const n = v.staff.length;
  v.staff[0].grievance = 0;
  runHooks('heir', g, rngOf(g), g.player);
  ok(v.staff.length === n && v.staff.every((s) => s.masters >= 2), `heir masters ${v.staff.map((s) => s.masters)}`);
  ok(L(g).queue.some((x) => x.kind === 'household_heir'), 'heir scene queued');
  play(g, 1, ['rest'], { household_heir: 0 }, 1);
  ok(seen.scenes.household_heir > 0, 'heir scene seen');
  // 이를 갈던 하인은 장례 뒤에 떠난다
  v.staff[0].grievance = 90;
  runHooks('heir', g, rngOf(g), g.player);
  ok(v.staff.length === n - 1, 'sore servant leaves at heir');
  checkInfo(g);
}

// 6) 내가 큰 집안의 하인으로 산다
{
  const g = adult(50, { age: 18, place: 'leocast', house: false });
  ok(liveHouses(g).some((h) => h.seat === 'leocast'), 'house in leocast');
  const v = householdState(g);
  // 섬기는 자리를 형편대로 다시 세운다 (다른 사건이 일자리를 앗아 가도 점검이 갈리지 않게)
  const ensure = () => {
    settle(g);
    if (v.service && L(g).job?.id === 'house_servant') return true;
    v.service = null; if (L(g).job) L(g).job = null;
    scene(g, 'household_serve', {}, 0);
    settle(g);
    return !!v.service && L(g).job?.id === 'house_servant';
  };
  play(g, 1, ['household_serve'], { household_serve: 0 }, 1);
  ok(ensure(), `serve ${JSON.stringify(v.service)}`);
  ok(!availableActions(g).some((a) => a.id === 'household_serve'), 'serve hidden in service');
  let grew = false;
  for (let t = 0; t < 4 && !grew; t++) { ensure(); const sv = v.service, t0 = sv.trust; play(g, 2, ['work'], {}, 1); grew = v.service === sv && sv.trust > t0; }
  ok(grew, 'trust grows by work');
  ensure();
  // 심부름, 엿들은 비밀, 누명, 금고
  const sec0 = courtState(g).secrets.length;
  ensure(); v.service.suspicion = 0;
  scene(g, 'household_errand', { to: '슈테른 후작가' }, idxOf(/값을 받는다/));
  ok(courtState(g).secrets.length > sec0 && v.service.suspicion >= 15, 'sell letter');
  ensure(); v.service.suspicion = 0;
  scene(g, 'household_overheard', { what: '바깥에 진 엄청난 빚' }, idxOf(/적어 둔다/));
  ok(courtState(g).secrets.some((x) => x.what === '바깥에 진 엄청난 빚'), 'keep secret');
  ensure(); scene(g, 'household_framed', { who: '하녀 베르타' }, idxOf(/결백/));
  ensure(); scene(g, 'household_strongbox', {}, idxOf(/알린다/));
  ok(seen.scenes.household_framed > 0 && seen.scenes.household_strongbox > 0, 'serve scenes');
  // 신임이 오르면 몸종·집사 보좌·집사
  ensure(); v.service.trust = 85;
  play(g, 1, ['work'], {}, 1);
  ensure();
  ok(/집사/.test(householdInfo(g).service?.rankName ?? ''), `rank ${householdInfo(g).service?.rankName}`);
  // 주인이 바뀌면
  const hs = liveHouses(g).find((h) => h.id === v.service.house);
  hs.head = '새 주인 오토';
  v.service.trust = 50;
  play(g, 1, ['rest'], {}, 1);
  settle(g);
  ok(v.service == null || v.service.head === '새 주인 오토', 'new head noticed');
  // 대를 이으면 자식에게 자리가 열린다
  if (v.service) {
    v.service.trust = 70;
    runHooks('heir', g, rngOf(g), g.player);
    ok(v.service == null && v.serviceLine?.house === hs.id, 'service line');
    ok(L(g).queue.some((x) => x.kind === 'household_serve'), 'heir serve offer');
    L(g).job = null;
    settle(g);
    play(g, 1, ['rest'], { household_serve: 0 }, 1);
    if (!v.service) scene(g, 'household_serve', { heir: true }, 0);
    ok(v.service?.line === 2 && v.service.trust >= 30, `second gen ${JSON.stringify(v.service)}`);
  }
  // 의심이 차면 쫓겨나고, 훔친 게 드러나면 죄
  if (v.service) {
    v.service.suspicion = 90; v.service.stolen = 2;
    play(g, 1, ['rest'], {}, 1);
    ok(!v.service && L(g).job?.id !== 'house_servant', 'dismissed on suspicion');
    ok(v.formerHouses[hs.id] === 0, 'former house remembers');
  }
  // 금고를 털다 붙잡히면 옥
  let jailed = 0;
  for (let t = 0; t < 6; t++) {
    const h = adult(60 + t, { age: 20, place: 'leocast', house: false });
    scene(h, 'household_serve', {}, 0);
    settle(h);
    if (!householdState(h).service || L(h).job?.id !== 'house_servant') continue;
    h.player.stats.agi = 5; h.player.stats.sen = 5; householdState(h).service.trust = 0;
    scene(h, 'household_strongbox', {}, idxOf(/챙긴다/));
    if (crimeState(h).jailed) { jailed++; ok(!householdState(h).service, 'jailed → no service'); }
    checkInfo(h);
  }
  ok(jailed >= 2, `jailed ${jailed}`);
  checkInfo(g);
}

// 7) 옛 저장
{
  const g = adult(70);
  const old = JSON.parse(JSON.stringify(g)); delete old.household;
  runHooks('migrate', old);
  ok(old.household && Array.isArray(old.household.staff), 'old save household');
}

// 8) 여러 삶
let lives = 0;
for (let run = 0; run < 10; run++) {
  const pl = ['ern', 'leocast', 'harfen', 'verden'][run % 4];
  const g = adult(1000 + run, { age: 18 + (run % 4) * 8, place: pl, level: run % 3, house: run % 2 === 0 });
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.35);
  if ((L(g).gen ?? 1) > start) lives++;
  checkInfo(g);
}
// 평범한 삶
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'household_hire', 'household_serve'], {}, 0.4);
  checkInfo(g);
}

for (const k of ['household_hire', 'household_manage', 'household_serve']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['household_hire', 'household_manage', 'household_thief', 'household_ears', 'household_skim', 'household_grievance', 'household_old', 'household_heir', 'household_serve', 'household_errand', 'household_overheard', 'household_framed', 'household_strongbox']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('household_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('household_')))));
console.log(`대를 이은 삶 ${lives}/10`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `householdtest: ${fail} 실패` : 'householdtest: 통과');
process.exit(fail ? 1 : 0);
