import '../src/content.js';
// 풀리지 않은 일(src/mystery/)을 브라우저 없이 돌려 보는 점검.
// 1) 사건이 고장마다 정해진 달에 벌어짐, 네 종류 모두, 오래되면 식음.
// 2) 조사: 현장·캐묻기·뒷골목·이름난 사람, 단서가 죄 없는 사람을 풀고 진범을 가리킴, 지목(맞음·틀림), "아무도 아님".
// 3) 진범이 돈을 내밂(엉뚱한 사람 몰기·거절·경비대), 보복(맞섬·달아남·손 뗌), 조직의 앙갚음, 조직 일 덮기.
// 4) 잘못 끝낸 일이 들통남, 대 잇기, 선대의 옛 미제, 옛 저장, 장면이 뜬 뒤 돈이 바뀌어도 음수가 되지 않음, 저절로 살아 보기.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, queueScene, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { crimeState } from '../src/crime.js';
import { LG } from '../src/legends/index.js';
import { M, KINDS, KIND_IDS, makeCase, openHere, culpritOf, mysteryStatus } from '../src/mystery/index.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)|[가-힣]\(이\)|[가-힣]\(을\)/.test(t);
const seen = { scenes: {}, kinds: {} };
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
  for (const r of res) { if (bad(r.text)) fail('bad result', r); if (josa(r.text)) fail('josa result', r); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('bad scene', s?.kind, pe.title, pe.text, pe.choices);
    if (s) seen.scenes[s.kind] = (seen.scenes[s.kind] ?? 0) + 1;
        if (pe.choices.length > 8) fail('too many choices', s?.kind, pe.choices.length);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (pick && s) { const k = pick(s.kind, pe.choices, s); if (k != null && k >= 0) idx = k; }
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) fail('bad scene text', s?.kind, pe.title, out);
    if (/^mystery_/.test(s?.kind ?? '') && (josa(out) || josa(pe.text) || pe.choices.some(josa))) fail('josa', s.kind, pe.text, pe.choices, out);
    if (/^mystery_/.test(s?.kind ?? '') && samples.length < 120) samples.push(`[${pe.title}] ${pe.choices[idx]} → ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) fail('bad money', g.player.money);
  const st = mysteryStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('bad status', JSON.stringify(st).slice(0, 300));
}
const idxOf = (labels, re) => labels.findIndex((l) => re.test(l));
function adult(seed, family = 'merchant') {
  for (let k = 0; ; k++) {
    const g = newGame({ name: '하넬', sex: seed % 2 ? 'm' : 'f', familyId: family, mode: 'free', seed: seed + k * 977 });
    while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
    if (!g.over) return g;
  }
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place].realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (l.job?.id === 'soldier') l.job = null; if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }
const heal = (g) => { g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; };
function scene(g, kind, data, re, opt = {}) {
  let done = false, chose = null;
  for (let i = 0; i < 6 && !done && !g.over; i++) {
    opt.each?.(g); // 장면이 뜰 때까지 형편(전쟁·흉년)을 붙잡아 둔다
    if (!L(g).queue.some((x) => x.kind === kind) && L(g).scene?.kind !== kind) queueScene(g, kind, data, { first: true });
    month(g, opt.want ?? ['rest'], (k, labels) => { if (k !== kind) return opt.other?.(k, labels) ?? -1; done = true; const i2 = idxOf(labels, re); chose = i2 >= 0 ? labels[i2] : null; return i2; });
  }
  if (!done && !g.over) fail('scene never shown', kind, JSON.stringify(data), L(g).place, playerAge(g), JSON.stringify(L(g).queue.map((q) => q.kind)));
  if (done && !chose && !g.over) fail('choice not found', kind, re, JSON.stringify(data));
  return chose;
}


const R = (g) => rngOf(g);
// 장면 정의를 직접 부른다 (글과 선택지를 검사하고, 고른 열쇠로 푼다)
function direct(g, kind, data, key) {
  const def = SCENES[kind];
  const s = { kind, at: L(g).place, t: 0, ...data };
  if (def.need && !def.need(g, s)) return { skipped: true };
  const t = def.text(g, s), ch = def.choices(g, s), ti = def.title(g, s);
  if (bad(t) || bad(ti) || josa(t) || ch.some((c) => bad(c.label) || josa(c.label))) fail('scene text', kind, ti, t, ch.map((c) => c.label));
  if (ch.length > 8) fail('too many choices', kind);
  const k = typeof key === 'function' ? key(ch) : key;
  if (!ch.some((c) => c.key === k)) return { missing: true, keys: ch.map((c) => c.key) };
  const out = def.resolve(g, R(g), s, k);
  if (bad(out) || josa(out)) fail('scene out', kind, k, out);
  if (g.player.money < 0) fail('negative money', kind, k);
  if (samples.length < 60) samples.push(`[${ti}] ${k} → ${out}`);
  return { out, s };
}
function fresh(seed, pl = 'verden', kind) {
  const g = adult(seed);
  placeAt(g, pl);
  M(g).cases = [];
  const c = makeCase(g, R(g), pl, kind);
  return { g, c };
}
// 단서를 다 모은다
function crack(g, c) {
  for (let i = 0; i < 30 && c.state === 'open'; i++) {
    g.player.stats.sen = 90; g.player.stats.int = 90; g.player.stats.cha = 90; g.player.stats.wil = 90;
    const u = c.suspects.findIndex((s) => !s.cleared && !s.guilty);
    const r = direct(g, 'mystery_case', { id: c.id }, u >= 0 ? `ask:${u}` : 'look');
    if (r.skipped) break;
    const cul = culpritOf(c);
    if ((!cul || cul.pointed) && c.suspects.filter((s) => !s.guilty).every((s) => s.cleared)) break;
  }
}

/* 1) 사건이 벌어진다 */
{
  const g = adult(81000);
  placeAt(g, 'verden');
  let n = 0;
  for (let m = 0; m < 60 && !g.over; m++) { placeAt(g, 'verden'); runHooks('afterMonth', g, R(g)); g.date.month = g.date.month % 12 + 1; if (g.date.month === 1) g.date.year++; if (openHere(g)) { n++; seen.kinds[openHere(g).kind] = 1; M(g).cases = []; } }
  if (n < 2) fail('cases did not appear', n);
  const { g: g2, c } = fresh(81100);
  c.at -= 40; runHooks('afterMonth', g2, R(g2));
  if (M(g2).cases.length || !M(g2).cold.some((x) => x.id === c.id && x.state === 'cold')) fail('case did not go cold');
  console.log(`새 사건: 5년에 ${n}건`);
}

/* 2) 조사와 지목 */
{
  let right = 0, wrongs = 0, nones = 0;
  for (let run = 0; run < 24; run++) {
    const kind = KIND_IDS[run % 4];
    const { g, c } = fresh(82000 + run, ['verden', 'harfen', 'leocast', 'ern'][run % 4], kind);
    seen.kinds[kind] = (seen.kinds[kind] ?? 0) + 1;
    g.player.money = 100;
    for (const k of ['look', 'buy', 'no']) direct(g, 'mystery_case', { id: c.id }, k);
    crack(g, c);
    const cul = culpritOf(c);
    const m0 = g.player.money;
    if (run % 3 === 2) {
      // 일부러 틀린 사람
      const i = c.suspects.findIndex((s) => !s.guilty);
      const r = direct(g, 'mystery_case', { id: c.id }, `accuse:${i}`);
      if (r.missing) { fail('no accuse', r.keys); continue; }
      if (c.state !== 'wrong') fail('wrong accuse state', c.state);
      wrongs++;
    } else if (!cul) {
      const r = direct(g, 'mystery_case', { id: c.id }, 'none');
      if (r.missing) { fail('no none choice', kind, r.keys); continue; }
      if (c.state !== 'solved' || g.player.money <= m0) fail('none not solved', c.state);
      nones++;
    } else {
      if (!cul.pointed) fail('culprit never pointed', kind);
      const r = direct(g, 'mystery_case', { id: c.id }, `accuse:${c.suspects.indexOf(cul)}`);
      if (r.missing) { fail('no accuse', r.keys); continue; }
      if (c.state !== 'solved' || g.player.money <= m0) fail('right accuse not solved', c.state, g.player.money, m0);
      right++;
    }
    if (M(g).cases.includes(c)) fail('closed case still open');
  }
  for (const kind of ['ghost', 'missing']) {
    const { g, c } = fresh(82800 + kind.length, 'gruental', kind);
    c.none = true; c.suspects.forEach((s) => { s.guilty = false; });
    crack(g, c);
    if (!c.suspects.every((s) => s.cleared)) fail('none: not all cleared', kind);
    const r = direct(g, 'mystery_case', { id: c.id }, 'none');
    if (r.missing || c.state !== 'solved') fail('none not solved', kind, c.state); else nones++;
  }
  console.log(`지목: 맞음 ${right}, 아무도 아님 ${nones}, 틀림 ${wrongs}`);
  if (!right || !wrongs) fail('accuse paths', right, wrongs);
  // 이름난 사람의 도움
  const { g, c } = fresh(82900, 'harfen', 'theft');
  const lg = LG(g).list.find((x) => x.id === 'kairen'); lg.alive = true; lg.at = 'harfen';
  const r = direct(g, 'mystery_case', { id: c.id }, 'legend');
  if (r.missing || !lg.met) fail('legend help', r.keys);
  // 조직의 일을 덮는다
  const { g: g3, c: c3 } = fresh(82950, 'harfen', 'theft');
  c3.suspects.forEach((s) => { s.guilty = false; }); c3.suspects[0].guilty = true; c3.suspects[0].role = '뒷골목 장물아비'; c3.none = false;
  crimeState(g3).gang = { id: 'rats', rank: 1, rep: 0, since: 1 };
  const r3 = direct(g3, 'mystery_case', { id: c3.id }, 'cover');
  if (r3.missing || c3.state !== 'dropped' || crimeState(g3).gang.rep <= 0) fail('cover', r3.keys, c3.state);
  // 장물아비를 잡으면 조직이 앙갚음
  const { g: g4, c: c4 } = fresh(82960, 'harfen', 'theft');
  c4.suspects.forEach((s) => { s.guilty = false; }); c4.suspects[0].guilty = true; c4.suspects[0].role = '뒷골목 장물아비'; c4.none = false;
  crack(g4, c4);
  direct(g4, 'mystery_case', { id: c4.id }, 'accuse:0');
  if (!M(g4).grudge) fail('no gang grudge');
  for (let i = 0; i < 4; i++) runHooks('afterMonth', g4, R(g4)), g4.date.month = g4.date.month % 12 + 1;
  if (!L(g4).queue.some((q) => q.kind === 'mystery_revenge' && q.gang)) fail('gang revenge not queued');
  for (const k of ['fight', 'pay', 'flee']) { g4.player.money = 50; direct(g4, 'mystery_revenge', { gang: 'rats' }, k); }
}

/* 3) 진범의 제의와 보복 */
{
  let framed = 0, called = 0, revenge = 0;
  for (let run = 0; run < 9; run++) {
    const { g, c } = fresh(83000 + run, 'verden', 'poison');
    if (!culpritOf(c)) continue;
    c.heat = 2;
    runHooks('afterMonth', g, R(g));
    if (!L(g).queue.some((q) => q.kind === 'mystery_offer')) { fail('offer not queued'); continue; }
    const key = ['take', 'refuse', 'call'][run % 3];
    const m0 = g.player.money;
    direct(g, 'mystery_offer', { id: c.id }, key);
    if (key === 'take') { if (c.state !== 'framed' || g.player.money <= m0) fail('take', c.state); else framed++; }
    if (key === 'call' && c.state === 'solved') called++;
    if (c.state === 'open') {
      c.heat = 3; L(g).queue = [];
      runHooks('afterMonth', g, R(g));
      if (!L(g).queue.some((q) => q.kind === 'mystery_revenge')) fail('revenge not queued', c.heat, c.struck);
      const k2 = ['fight', 'flee', 'drop'][run % 3];
      g.player.injuries = [];
      direct(g, 'mystery_revenge', { id: c.id }, k2);
      revenge++;
      if (k2 === 'drop' && c.state !== 'dropped') fail('drop', c.state);
    }
  }
  if (!framed) fail('never framed');
  console.log(`제의: 몰기 ${framed}, 경비대로 잡음 ${called}, 보복 ${revenge}`);
  // 돈이 0이 되어도
  const { g, c } = fresh(83900, 'verden', 'theft');
  g.player.money = 0;
  const r = direct(g, 'mystery_case', { id: c.id }, 'buy');
  if (!r.missing) fail('buy shown without money');
  const def = SCENES.mystery_case; g.player.money = 50; const s = { kind: 'mystery_case', at: 'verden', id: c.id };
  def.choices(g, s); g.player.money = 0; def.resolve(g, R(g), s, 'buy');
  if (g.player.money < 0) fail('buy negative');
}

/* 4) 들통, 대 잇기, 옛 미제, 옛 저장 */
{
  const { g, c } = fresh(84000, 'verden', 'poison');
  const cul = culpritOf(c) ?? c.suspects[0];
  if (!culpritOf(c)) { c.none = false; cul.guilty = true; }
  const inn = c.suspects.find((s) => !s.guilty);
  direct(g, 'mystery_case', { id: c.id }, 'look');
  if (!c.clues.length) c.clues.push('시험 단서');
  direct(g, 'mystery_case', { id: c.id }, `accuse:${c.suspects.indexOf(inn)}`);
  const x = M(g).cold.find((y) => y.id === c.id);
  if (!x || x.state !== 'wrong') fail('wrong not cold', x?.state);
  let m = 0;
  for (; m < 600 && !x.exposed; m++) { runHooks('afterMonth', g, R(g)); x.closedAt = g.date.year * 12 + g.date.month; }
  if (!x.exposed) fail('wrong never exposed'); else console.log(`잘못 몬 일 들통: ${m}달 만`);
  // 대 잇기
  const c2 = makeCase(g, R(g), 'verden', 'theft');
  const y = M(g).cold.find((z) => z.id === c.id); y.exposed = false;
  runHooks('heir', g, R(g), g.player);
  if (M(g).cases.length || !M(g).cold.every((z) => z.ancestor)) fail('heir');
  // 옛 미제: 열 해 뒤 그 고장
  for (const z of M(g).cold) z.at -= 200;
  let shown = 0;
  for (let i = 0; i < 12 && shown < 2; i++) {
    placeAt(g, 'verden');
    runHooks('afterMonth', g, R(g)); g.date.month = g.date.month % 12 + 1;
    const q = L(g).queue.find((q2) => q2.kind === 'mystery_old');
    if (q) { shown++; L(g).queue = []; const z = M(g).cold.find((w) => w.id === q.id); const r = direct(g, 'mystery_old', { id: q.id }, (ch) => ch[0].key); if (r.missing || r.skipped) fail('old scene'); if (z.state !== 'cleared') fail('old not cleared', z.state); }
  }
  if (!shown) fail('old case never resurfaced');
  if (!M(g).oldSolved) fail('oldSolved');
  console.log(`옛 미제: ${shown}건이 다시 떠올랐다`);
  // 옛 저장
  const o = adult(84100);
  delete o.mystery; runHooks('migrate', o);
  if (!o.mystery || !Array.isArray(o.mystery.cold)) fail('migrate');
  o.mystery = { cases: [{ kind: 'gone' }, null], cold: 'x', solved: 3 }; runHooks('migrate', o);
  if (o.mystery.cases.length || !Array.isArray(o.mystery.cold) || o.mystery.solved !== 3) fail('migrate partial');
  const st = mysteryStatus(g);
  if (JSON.stringify(st).match(/NaN|undefined/)) fail('status', JSON.stringify(st).slice(0, 300));
}

/* 5) 저절로 살아 보기 */
{
  let probes = 0, closed = 0;
  for (let run = 0; run < 4; run++) {
    const a = adult(85000 + run);
    placeAt(a, ['verden', 'harfen', 'leocast', 'ern'][run]);
    for (let m = 0; m < 120 && !a.over; m++) {
      const acts = availableActions(a);
      const want = rngOf(a).chance(0.5) ? ['mystery_probe', 'travel'] : [rngOf(a).pick(acts).id];
      if (acts.some((x) => x.id === 'mystery_probe')) probes++;
      a.player.money = Math.max(a.player.money, 30);
      month(a, want);
    }
    const mm = M(a); closed += mm.solved + mm.wrong + mm.dropped + mm.cold.length;
  }
  console.log(`저절로 10년 4판: 캘 수 있던 달 ${probes}, 끝난 사건 ${closed}`);
  if (!probes) fail('autoplay never probed');
}

console.log('장면:', JSON.stringify(seen.scenes), '종류:', JSON.stringify(seen.kinds));
if (verbose) for (const s of samples) console.log(s);
console.log(problems ? `FAIL ${problems}` : 'OK');
process.exit(problems ? 1 : 0);
