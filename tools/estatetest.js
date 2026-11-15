import '../src/content.js';
// 집과 재산(src/estate/)을 브라우저 없이 돌려 보는 점검.
// 1) 집: 사고, 고치고, 넓히고, 하인 두고, 세놓고, 판다.
// 2) 밭·가게 자리: 사서 세놓으면 달마다 세가 들어온다.
// 3) 빚: 빌리고, 이자가 붙고, 갚는다. 안 갚으면 빚쟁이가 오고, 끝내 파산한다.
// 4) 상단에 맡긴 돈이 상단 형편 따라 오르내리고, 상단이 망하면 사라진다.
// 5) 불과 도둑, 옛 저장, 대 잇기(빚도 물려받음), 저절로 살아 보기, estateStatus.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L, queueScene, SCENE_STRICT } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { E, homeOf, netWorth, debtTotal, mi } from '../src/estate/core.js';
import { estateStatus } from '../src/estate/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
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
    if (/estate|debt/.test(s?.kind ?? '') && samples.length < 50) samples.push(`[${pe.title}] ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = estateStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
function scene(g, kind, re, data = {}) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, ['rest'], (k, labels) => { if (k !== kind) return -1; done = true; const i2 = labels.findIndex((l) => re.test(l)); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, L(g).place);
  if (done && !chose && !g.over) fail('choice not found', kind, re);
  return done;
}
function adult(seed, family = 'merchant') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '재산', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 20 && !g.over) month(g, ['work']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; }

// 1) 집 (드물게 점검 도중 병으로 죽으면 다른 씨앗으로 다시 한다)
for (let attempt = 0; attempt < 4; attempt++) {
  const p0 = problems;
  const g = adult(91001 + attempt * 7);
  placeAt(g, 'harfen');
  g.player.money = 3000;
  scene(g, 'housing', /집을 산다/);
  if (!L(g).houses.includes('harfen')) fail('could not buy house');
  const h = homeOf(g, 'harfen');
  h.cond = 40;
  scene(g, 'estate_manage', /집을 고친다/);
  if (h.cond < 99) fail('repair failed', h.cond);
  scene(g, 'estate_manage', /넓은 집으로 넓힌다/);
  if (h.level !== 1) fail('grow failed', h.level);
  scene(g, 'estate_manage', /저택으로 넓힌다/);
  if (h.level !== 2) fail('manor failed', h.level);
  scene(g, 'estate_manage', /하인을/);
  scene(g, 'estate_manage', /하인을/);
  if (h.servants !== 2) fail('hire failed', h.servants);
  const st0 = g.player.stress;
  L(g).home = 'own';
  g.player.stress = 60;
  for (let i = 0; i < 3; i++) month(g, ['rest']);
  if (g.player.stress >= 60) fail('manor with servants did not ease stress', g.player.stress);
  const m0 = g.player.money;
  scene(g, 'estate_manage', /집을 세놓는다/);
  if (L(g).home === 'own') fail('still living in rented-out house');
  let rentIn = 0;
  for (let i = 0; i < 6; i++) { const before = g.player.money; month(g, ['rest']); rentIn += E(g).ledger.rent; }
  if (!rentIn) fail('house rent never came in');
  scene(g, 'estate_manage', /세를 거두고/);
  if (L(g).home !== 'own') fail('unrent failed');
  const worth = estateStatus(g).homes[0]?.worth;
  scene(g, 'estate_manage', /집을 판다/);
  if (L(g).houses.includes('harfen')) fail('sell failed');
  if (g.over) { problems = p0; console.log(`(집 점검 중 ${g.date.year}년에 죽어서 다시: 위의 FAIL은 세지 않는다)`); continue; }
  console.log(`집: 저택까지 넓힘, 하인 2, 반년 세 ${rentIn}닢, 판 값 ${worth}닢 · 마음고생 ${st0}→${Math.round(g.player.stress)}`);
  break;
}

// 2) 밭과 가게 자리
{
  const g = adult(91103);
  placeAt(g, 'harfen');
  g.player.money = 2000;
  scene(g, 'estate_manage', /밭을 사서/);
  scene(g, 'estate_manage', /가게 자리를 사서/);
  if (E(g).rentals.length !== 2) fail('rentals not bought', E(g).rentals);
  let rent = 0;
  for (let i = 0; i < 24 && !g.over; i++) { month(g, ['rest']); rent += E(g).ledger.rent; }
  if (rent < 40 && !g.over) fail('rentals earn too little', rent, g.over, E(g).rentals);
  console.log(`밭·가게 자리: 2년 세 ${rent}닢 · 세입자 ${E(g).rentals.map((r) => r.tenant ?? '없음').join(', ')}`);
}

// 3) 빚: 빌리고 갚기, 안 갚으면 빚쟁이, 파산
{
  const g = adult(91201);
  placeAt(g, 'harfen');
  g.player.money = 10;
  scene(g, 'estate_borrow', /고리대금업자에서 은화 150닢/);
  if (debtTotal(g) !== 150) fail('borrow failed', E(g).loans);
  month(g, ['rest']);
  if (debtTotal(g) <= 150) fail('no interest');
  g.player.money = 1000;
  scene(g, 'estate_borrow', /다 갚는다/);
  if (debtTotal(g)) fail('repay failed', E(g).loans);
  // 집을 가진 채 빌리고 버틴다 → 빚쟁이 → 파산
  g.player.money = 0;
  L(g).houses.push('harfen');
  homeOf(g, 'harfen');
  scene(g, 'estate_borrow', /상단 금고에서 은화/);
  if (!E(g).loans.some((l) => l.lender === 'company')) fail('company loan with house as collateral failed', estateStatus(g).collateral);
  scene(g, 'estate_borrow', /고리대금업자에서 은화 150닢/);
  g.player.money = 0;
  let collectors = 0, broke = false;
  for (let m = 0; m < 30 && !g.over && !broke; m++) {
    g.player.money = 0;
    month(g, ['rest'], (k, labels) => { if (k !== 'debt_collector') return -1; collectors++; const b = labels.findIndex((l) => /파산/.test(l)); return collectors >= 3 && b >= 0 ? b : labels.findIndex((l) => /빈다|달아난다/.test(l)); });
    if (E(g).bankrupt) broke = true;
  }
  if (!collectors) fail('collector never came');
  if (!broke) fail('never went bankrupt', E(g).loans);
  if (broke && (E(g).loans.length || L(g).houses.includes('harfen'))) fail('bankruptcy left debt or house', E(g));
  // 다섯 달을 넘기면 묻지 않고 파산
  const f = adult(91202);
  placeAt(f, 'harfen'); f.player.money = 0;
  E(f).loans.push({ id: 77, lender: 'shark', principal: 400, due: mi(f) - 1, missed: 4 });
  month(f, ['rest']);
  if (E(f).loans.length || !E(f).bankrupt) fail('forced bankruptcy at 5 missed months did not happen', E(f).loans);
  console.log(`빚: 빚쟁이 ${collectors}번 · 파산 ${E(g).bankrupt}번 · 남은 집 ${L(g).houses.length}`);
}

// 4) 상단에 맡긴 돈
{
  let up = 0, down = 0, lostAll = 0;
  for (let run = 0; run < 6; run++) {
    const g = adult(91300 + run);
    placeAt(g, 'leocast');
    g.player.money = 1000;
    scene(g, 'estate_invest', /은화 200닢을 맡긴다/);
    if (!E(g).deposits.length) { fail('deposit failed'); continue; }
    const start = E(g).deposits[0].amount;
    for (let m = 0; m < 12 * 8 && !g.over; m++) month(g, ['rest']);
    const d = E(g).deposits[0];
    if (!d) lostAll++; else if (d.amount > start) up++; else down++;
  }
  console.log(`상단 투자(8년 6판): 불어남 ${up} · 줄어듦 ${down} · 상단이 망해 날아감 ${lostAll}`);
  if (up + down + lostAll === 0) fail('investment never resolved');
  // 상단이 망하면 사라진다
  const g = adult(91399);
  placeAt(g, 'leocast'); g.player.money = 500;
  scene(g, 'estate_invest', /맡긴다/);
  const id = E(g).deposits[0]?.company;
  g.history.companies = g.history.companies.filter((c) => c.id !== id);
  month(g, ['rest']);
  if (E(g).deposits.length) fail('deposit survived company collapse');
}

// 5) 불과 도둑, 옛 저장, 대 잇기, 저절로
{
  let fires = 0, thefts = 0;
  for (let run = 0; run < 6; run++) {
    const g = adult(91500 + run);
    placeAt(g, 'harfen');
    L(g).houses.push('harfen'); L(g).home = 'own';
    // 홀수 판은 낡은 집(불), 짝수 판은 멀쩡한 집(도둑): 낡은 집은 일찍 타 버려 도둑이 들 틈이 없을 때가 있다
    homeOf(g, 'harfen').cond = run % 2 ? 20 : 95;
    for (let m = 0; m < 12 * 10 && !g.over; m++) {
      g.player.money = Math.max(g.player.money, 600);
      // 불에 타 여관으로 나앉았으면 다시 집을 지어 들어간다 (도둑을 시험하려면 내 집에 살아야 한다)
      if (L(g).home !== 'own' && !L(g).travel) { placeAt(g, 'harfen'); if (!L(g).houses.includes('harfen')) L(g).houses.push('harfen'); L(g).home = 'own'; }
      month(g, ['rest']);
    }
    const notes = JSON.stringify(g.people.find((p) => p.id === g.player.id)?.history ?? []);
    fires += (notes.match(/불이 났다|불에 타/g) ?? []).length;
    thefts += (notes.match(/도둑이 들었다/g) ?? []).length;
  }
  console.log(`10년 6판: 불 ${fires} · 도둑 ${thefts}`);
  if (!fires) fail('no fire in 60 years of old houses');
  if (!thefts) fail('no theft in 60 years of rich homes');
  const g = adult(91601);
  delete g.estate;
  const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy);
  if (!copy.estate || !Array.isArray(copy.estate.loans)) fail('migrate old save failed');
  E(g).loans.push({ id: 99, lender: 'shark', principal: 300, due: mi(g) - 2, missed: 2 });
  runHooks('heir', g);
  if (debtTotal(g) !== 300 || E(g).loans[0].missed) fail('heir should inherit debt with fresh grace', E(g).loans);
  for (let run = 0; run < 3; run++) {
    const h = adult(91700 + run);
    placeAt(h, ['harfen', 'leocast', 'verden'][run]);
    h.player.money += 400;
    for (let m = 0; m < 12 * 15 && !h.over; m++) month(h, ['estate_manage', 'estate_borrow', 'estate_invest', 'housing', 'work']);
    if (verbose) console.log('저절로', run, JSON.stringify(estateStatus(h)).slice(0, 300));
  }
}

console.log(`장면: ${JSON.stringify(seen.scenes)}`);
if (verbose) for (const s of samples) console.log('·', s);
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
