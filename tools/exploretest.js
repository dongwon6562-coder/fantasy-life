import '../src/content.js';
// 지도에 없는 땅(src/explore/)을 브라우저 없이 돌려 보는 점검.
// 1) 다섯 땅에 원정을 나가 돌아온다. 달마다 장면, 가장 깊은 곳, 이름 붙이기, 돌아와 짐 풀기.
// 2) 달마다 겪는 일 열셋을 선택지마다 다 골라 본다.
// 3) 굶주림, 길 잃음, 사기와 짐꾼, 돌아서기, 원정 중 할 수 있는 일, 감옥에 가면 원정이 끝나는 것.
// 4) 찾은 것: 팔기, 학계에 바치기(연구가 나아간다), 숨기기와 꺼내기, 숨긴 것의 쓸모와 뒤탈, 찾아오는 사람.
// 5) 첫 발견자: 다른 탐사대가 먼저 찾기, 대 잇기, 옛 저장, 저절로 살아 보기, exploreStatus.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { jail } from '../src/crime.js';
import { RS } from '../src/research/state.js';
import { living } from '../src/npc.js';
import { join, members } from '../src/party/core.js';
import { E, REGIONS, REGION_IDS, SITES, FINDS, LEG, exploreStatus, startExpedition, claimFirst } from '../src/explore/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)/.test(t);
const seen = { scenes: {}, leg: {} };
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
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
    if (s?.kind === 'explore_leg') seen.leg[s.ev] = (seen.leg[s.ev] ?? 0) + 1;
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    // 기본으로는 돌아서지 않는다 (돌아서기는 따로 시험한다)
    if (/돌아선다|따른다|아직은 아니다/.test(pe.choices[idx])) idx = 0;
    if (s?.kind === 'explore_heart') idx = 0;
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^explore_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, out);
    if (/^explore_/.test(s?.kind ?? '') && samples.length < 90) samples.push(`[${pe.title}] ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = exploreStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'farmer') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '루카', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 20 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (l.job?.id === 'soldier') l.job = null; if (g.crime) g.crime.jailed = null; }
const heal = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; };
const strong = (g) => { Object.assign(g.player.stats, { str: 70, agi: 65, sen: 60, int: 60, wil: 60, cha: 50 }); g.player.skills.sword = 70; L(g).gear.weapon = 12; L(g).gear.armor = 9; };
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
// 원정 하나를 끝까지
function expedition(g, rid, opt = {}) {
  const from = REGIONS[rid].from[0];
  placeAt(g, from);
  g.player.money = Math.max(g.player.money, 300);
  heal(g);
  scene(g, 'explore_plan', {}, new RegExp(`${REGIONS[rid].name}: ${opt.light ? '가볍게' : '식량을 넉넉히'}`));
  const x = E(g).exp;
  if (!x || x.region !== rid) { fail('expedition not started', rid, !!x); return null; }
  let m = 0;
  while (E(g).exp && m++ < 24 && !g.over) {
    const acts = availableActions(g).map((a) => a.id);
    // 탐사 중에 붙잡혀 옥에 갇히면 옥살이 행동만 남는다 (expedition.js가 일부러 열어 둠)
    if (!g.crime?.jailed && acts.some((id) => !['rest', 'meditate', 'train_body', 'explore_turnback'].includes(id))) fail('action not filtered', acts.join(','));
    if (opt.each) opt.each(g, m);
    month(g, ['rest'], opt.pick);
    if (opt.heal !== false) { g.player.injuries = g.player.injuries.filter((i) => !i.mortal); g.player.fatigue = Math.min(g.player.fatigue, 50); }
  }
  if (E(g).exp && !g.over) fail('expedition never ended', rid, JSON.stringify(E(g).exp).slice(0, 200));
  return x;
}

/* ---------- 1) 다섯 땅 ---------- */
{
  let hearts = 0, sites = 0, finds = 0, trips = 0, homes = 0, months = 0;
  for (const rid of REGION_IDS) {
    for (let run = 0; run < 2; run++) {
      const g = adult(52000 + REGION_IDS.indexOf(rid) * 10 + run);
      strong(g);
      const x = expedition(g, rid);
      if (!x) continue;
      trips++;
      months += x.months;
      if (L(g).place !== x.from) fail('not home after expedition', rid, L(g).place);
      const st = exploreStatus(g);
      const R = st.regions.find((r) => r.id === rid);
      if (R.heart) hearts++;
      sites += x.sites.length;
      finds += E(g).pack.length;
      if (R.mapped <= 0) fail('nothing mapped', rid);
      // 짐 풀기 장면
      for (let i = 0; i < 2; i++) month(g, ['rest']);
      homes += seen.scenes.explore_home ? 1 : 0;
      if (verbose) console.log(rid, run, `달 ${x.months}`, `유적 ${x.sites.join(',')}`, `짐 ${E(g).pack.map((f) => f.id).join(',')}`, `이름값 ${E(g).fame}`);
    }
  }
  console.log(`다섯 땅 2판씩: 원정 ${trips}, 평균 ${(months / Math.max(1, trips)).toFixed(1)}달, 가장 깊은 곳 ${hearts}, 유적 ${sites}, 찾은 것 ${finds}`);
  if (trips < 10) fail('some expeditions failed to start');
  if (hearts < 5) fail('too few hearts reached', hearts);
  if (finds < 10) fail('too few finds', finds);
  if (!seen.scenes.explore_name) fail('naming scene never shown');
  if (!seen.scenes.explore_home) fail('home scene never shown');
}

/* ---------- 2) 달마다 겪는 일, 선택지마다 ---------- */
{
  let tried = 0;
  for (const ev of Object.keys(LEG)) {
    for (let c = 0; c < 4; c++) {
      const g = adult(53000 + tried);
      strong(g);
      placeAt(g, 'estella');
      g.player.money = 300;
      startExpedition(g, rngOf(g), 'ash', true);
      const x = E(g).exp;
      x.leg = 2;
      x.finds.push({ id: 'glass_rose', region: 'ash', site: null, year: g.date.year });
      if (ev === 'hunger') { x.food = 0; x.hungry = 1; }
      if (ev === 'mutiny') x.morale = 10;
      if (ev === 'lost') x.lost = 1;
      // 잘 나오게: 동료 척후 하나
      if (c === 0 && !members(g).length) { const p = living(g).find((q) => !q.isPlayer && q.ageMonths > 20 * 12 && q.ageMonths < 40 * 12); if (p) { join(g, p, { role: 'scout' }); p.place = L(g).place; } }
      g.player.skills.hunting = 30;
      const data = { ev, line: REGIONS.ash.sights[0], site: 'glass_city', rival: E(g).rivals[0].id, enc: { unit: 'ash_ghoul', count: 2 } };
      const choicesNow = LEG[ev].choices(g, x, data);
      if (c >= choicesNow.length) continue;
      tried++;
      let shown = false;
      for (let i = 0; i < 4 && !shown && E(g).exp; i++) {
        L(g).queue = L(g).queue.filter((q) => q.kind !== 'explore_leg');
        queueScene(g, 'explore_leg', data, { first: true });
        month(g, ['rest'], (k, labels, s) => { if (k !== 'explore_leg' || s.ev !== ev) return -1; shown = true; return c < labels.length ? c : 0; });
      }
      if (!shown && E(g).exp) fail('leg event never shown', ev, c);
    }
  }
  console.log(`달마다 겪는 일: ${Object.keys(LEG).length}종, 선택지 ${tried}개 시험`);
  for (const ev of Object.keys(LEG)) if (!seen.leg[ev]) fail('leg event unseen', ev);
}

/* ---------- 3) 굶주림, 길 잃음, 돌아서기, 감옥 ---------- */
{
  // 굶주림: 식량이 떨어지면 사기가 떨어지고 동료를 잃기도 한다
  let hungryHits = 0, deaths = 0, mortal = 0;
  for (let run = 0; run < 6; run++) {
    const g = adult(54000 + run);
    placeAt(g, 'silverleaf');
    g.player.money = 300;
    const p = living(g).find((q) => !q.isPlayer && q.ageMonths > 20 * 12 && q.ageMonths < 40 * 12);
    if (p) { join(g, p, { role: 'blade' }); p.place = 'silverleaf'; }
    startExpedition(g, rngOf(g), 'deepwood', false);
    const x = E(g).exp;
    x.food = 0; x.mule = false;
    const m0 = x.morale;
    for (let m = 0; m < 4 && E(g).exp && !g.over; m++) {
      E(g).exp.food = 0;
      month(g, ['rest'], (k, labels) => (k === 'explore_leg' ? Math.max(0, idxOf(labels, /풀뿌리/)) : -1));
      if (E(g).exp?.hungry) hungryHits++;
      if (g.player.injuries.some((i) => i.mortal)) { mortal++; g.player.injuries = []; }
    }
    if (E(g).exp && E(g).exp.morale >= m0) fail('hunger did not hurt morale', m0, E(g).exp.morale);
    deaths += E(g).fallen.length;
  }
  console.log(`굶주림 6판: 굶은 달 ${hungryHits}, 잃은 동료 ${deaths}, 죽을 고비 ${mortal}`);
  if (!hungryHits) fail('never hungry');

  // 길 잃음: 석 달 안에는 길을 찾는다
  {
    const g = adult(54100);
    placeAt(g, 'saltrock');
    g.player.money = 300;
    startExpedition(g, rngOf(g), 'mist', true);
    if (g.player.money !== 300 - (6 + 2) * 3 - 8 - 30) fail('charter cost not paid', g.player.money);
    E(g).exp.lost = 1;
    let found = false;
    for (let m = 0; m < 4 && !found; m++) { month(g, ['rest'], (k, labels) => (k === 'explore_leg' ? idxOf(labels, /앞으로 걷는다/) : -1)); if (!E(g).exp?.lost || E(g).exp?.lostRun === 0) found = true; }
    if (!found) fail('lost forever', JSON.stringify(E(g).exp));
    if (!E(g).lostMonths) fail('lost months not counted');
  }
  // 돌아서기: 행동으로
  {
    const g = adult(54200);
    placeAt(g, 'hammer');
    g.player.money = 300;
    startExpedition(g, rngOf(g), 'cloud', true);
    E(g).exp.leg = 2;
    month(g, ['explore_turnback'], () => 0);
    if (E(g).exp && E(g).exp.phase !== 'back') fail('turnback failed', E(g).exp.phase);
    for (let m = 0; m < 4 && E(g).exp; m++) month(g, ['rest']);
    if (E(g).exp) fail('did not come home after turning back');
  }
  // 감옥: 원정이 끝난다
  {
    const g = adult(54300);
    placeAt(g, 'estella');
    g.player.money = 300;
    startExpedition(g, rngOf(g), 'frost', true);
    jail(g, 3);
    month(g, ['rest']);
    if (E(g).exp) fail('expedition survived jail');
  }
  // 아이·군인·돈 없음: 꾸릴 수 없다
  {
    const g = newGame({ name: '아이', sex: 'f', familyId: 'farmer', mode: 'free', seed: 54400 });
    placeAt(g, 'estella');
    if (availableActions(g).some((a) => a.id === 'explore_plan')) fail('child can plan expedition');
  }
}

/* ---------- 4) 찾은 것 ---------- */
{
  const g = adult(55000);
  const e = E(g);
  const add = (id, region = 'ash') => e.pack.push({ id, region, site: null, year: g.date.year });
  ['first_crown', 'king_annals', 'glass_rose', 'war_relic', 'stone_codex', 'mana_core', 'root_heart', 'star_chart'].forEach((id) => add(id));
  add('region_map', 'frost');
  // 팔기 (포르텔)
  placeAt(g, 'portel');
  const m0 = g.player.money;
  scene(g, 'explore_sell', {}, /유리 장미/);
  if (g.player.money <= m0 || e.sold <= 0) fail('sell gave no money');
  if (e.pack.some((f) => f.id === 'glass_rose')) fail('sold item still in pack');
  // 바치기 (왕립 서고) + 연구가 나아간다
  placeAt(g, 'leocast');
  const r = RS(g);
  r.project = { kind: 'design', id: 'pocketlamp', prog: 0.1, place: 'leocast', months: 1, fails: 0 };
  const f0 = e.fame, rf0 = r.fame;
  scene(g, 'explore_give', {}, /연대기 석판/);
  if (e.fame <= f0 || r.fame <= rf0) fail('give gave no fame', e.fame, r.fame);
  if (r.project.prog <= 0.1) fail('research did not advance', r.project.prog);
  // 그사이 사건(현상금 사냥꾼에게 끌려가기 등)으로 고장이 바뀔 수 있어 바칠 때마다 서고 앞에 다시 선다
  placeAt(g, 'leocast'); scene(g, 'explore_give', {}, /사전/);
  placeAt(g, 'leocast'); scene(g, 'explore_give', {}, /지도/);
  if (e.given.length !== 3) fail('given count', e.given.length);
  // 별자리판은 마탑에
  placeAt(g, 'serenia');
  g.player.manaAwakened = true;
  scene(g, 'explore_give', {}, /별자리판/);
  // 숨기기와 꺼내기
  placeAt(g, 'ern');
  scene(g, 'explore_hide', {}, /전부 숨긴다/);
  if (e.pack.length || e.cache.length < 3) fail('hide failed', e.pack.length, e.cache.length);
  scene(g, 'explore_unhide', {}, /성검 조각/);
  if (!e.pack.some((f) => f.id === 'war_relic')) fail('unhide failed');
  // 숨긴 것의 쓸모: 마력핵이면 마력이 조금 더 쌓인다, 관이면 마음고생
  g.player.manaPotential = g.player.manaPotential || 50;
  const mana0 = g.player.mana;
  for (let i = 0; i < 6; i++) month(g, ['rest']);
  if (g.player.mana <= mana0) fail('mana core did nothing');
  // 찾아오는 사람: 넷 다
  for (const [id, who, re] of [['root_heart', 'elf', /돌려준다/], ['war_relic', 'church', /거절한다/], ['king_annals', 'scholar', /함께 연구한다/], ['first_crown', 'collector', /판다/]]) {
    if (!e.cache.some((f) => f.id === id)) e.cache.push({ id, region: 'ash', site: null, year: g.date.year });
    // 저절로 찾아온 다른 사람(같은 장면 종류)이 줄에 있으면 그쪽이 먼저 떠서 엉뚱한 것을 내준다
    L(g).queue = L(g).queue.filter((q) => q.kind !== 'explore_seek');
    if (g.crime) g.crime.jailed = null; // 옥에 갇히면(무작위) 장면이 뜨지 않는다
    scene(g, 'explore_seek', { id, who }, re);
  }
  // 병으로 일찍 죽으면(무작위) 장면이 뜨지 않으니 보지 않는다
  if (!g.over && e.cache.some((f) => f.id === 'root_heart')) fail('elf did not take root heart');
  if (g.over) {
    // 새 판에서 엘프가 숲의 심장을 받아 가는지만 다시 본다
    const g2 = adult(9100);
    placeAt(g2, 'ern');
    E(g2).cache.push({ id: 'root_heart', region: 'ash', site: null, year: g2.date.year });
    scene(g2, 'explore_seek', { id: 'root_heart', who: 'elf' }, /돌려준다/);
    if (!g2.over && E(g2).cache.some((f) => f.id === 'root_heart')) fail('elf did not take root heart (2)');
  }
  console.log(`찾은 것: 판 값 ${e.sold}, 바친 것 ${e.given.length}, 숨긴 것 ${e.cache.length}, 이름값 ${e.fame}`);
}

/* ---------- 5) 첫 발견자, 다른 탐사대, 대 잇기, 옛 저장, 저절로 ---------- */
{
  // 다른 탐사대가 먼저 찾는다
  const g = adult(56000);
  for (const r of E(g).rivals) { r.pow = 200; r.prog = 6; }
  for (let m = 0; m < 120 && !g.over; m++) month(g, ['rest']);
  const theirs = Object.values(E(g).firsts).filter((f) => !f.me).length;
  console.log(`다른 탐사대 10년: 먼저 찾은 곳 ${theirs}`);
  if (!theirs) fail('rivals never found anything');
  // 이미 남이 찾은 곳: 내 것이 되지 않는다
  const site = Object.keys(E(g).firsts)[0];
  if (site && claimFirst(g, site)) fail('claimed a site already found');
  // 내 첫 발견과 대 잇기
  const h = adult(56100);
  const mySite = Object.keys(SITES).find((k) => !E(h).firsts[k]);
  claimFirst(h, mySite);
  E(h).cache.push({ id: 'star_lens', region: 'frost', site: null, year: h.date.year });
  E(h).exp = { region: 'frost', from: 'estella', phase: 'out', leg: 1, legs: 5, back: 3, food: 3, porters: 0, morale: 50, lost: 0, lostRun: 0, hungry: 0, mule: true, guide: false, months: 1, finds: [], sites: [], dead: [], comps: [], started: 0 };
  E(h).fame = 100;
  runHooks('heir', h, rngOf(h), h.player);
  if (E(h).exp) fail('heir kept expedition');
  if (mySite && (!E(h).firsts[mySite]?.family || E(h).firsts[mySite].me)) fail('heir first not family');
  if (E(h).cache.length !== 1) fail('heir lost cache');
  if (E(h).fame !== 30) fail('heir fame', E(h).fame);
  // 옛 저장
  const o = adult(56200);
  delete o.explore;
  runHooks('migrate', o);
  if (!o.explore || !Array.isArray(o.explore.pack)) fail('migrate failed');
  o.explore.exp = { region: 'nowhere' };
  runHooks('migrate', o);
  if (o.explore.exp) fail('bad expedition survived migrate');
  // 저절로 살아 보기: 떠나는 고장에서 무작위로
  let started = 0;
  for (let run = 0; run < 4; run++) {
    const a = adult(56300 + run);
    placeAt(a, ['estella', 'silverleaf', 'hammer', 'saltrock'][run]);
    for (let m = 0; m < 180 && !a.over; m++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.2) ? ['explore_plan', 'explore_sell', 'explore_hide'] : [rngOf(a).pick(acts).id];
      a.player.money = Math.max(a.player.money, 40);
      const had = !!E(a).exp;
      month(a, want);
      if (!had && E(a).exp) started++;
    }
  }
  console.log(`저절로 15년 4판: 떠난 원정 ${started}`);
  if (!started) fail('autoplay never explored');
}

console.log('장면:', JSON.stringify(seen.scenes));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
