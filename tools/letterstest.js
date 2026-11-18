import './lsshim.js';
import '../src/content.js';
// 편지와 먼 인연 점검: 편지 쓰기와 닿기·답장, 받는 편지(안부·돈 부탁·연서), 죽은 뒤 닿은 편지와 그 자식에게 잇기, 잃은 편지,
// 답 없는 편지와 끊김, 배우자에게 들킨 연서, 떠난 자식, 남의 편지(궁정 비밀·풀리지 않은 일의 실마리), 위조와 사기죄,
// 대 잇기(선대의 벗·편지 묶음·선대 앞으로 온 편지), 옛 저장, 여러 삶.
// 난수가 밀려도 갈리지 않게, 장면과 편지는 형편을 직접 맞추고 띄운다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { lettersState, lettersInfo } from '../src/letters/index.js';
import { makePerson, kill } from '../src/npc.js';
import { kinState } from '../src/kin/index.js';
import { loveState } from '../src/love/index.js';
import { crimeState } from '../src/crime.js';
import { courtState } from '../src/court/index.js';
import { M as mysteryOf } from '../src/mystery/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['letters_write', 'letters_forge', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern' } = {}) {
  const g = newGame({ name: '쓰는이', sex: seed % 2 ? 'm' : 'f', familyId: 'farmer', mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = place; L(g).home = 'family';
  g.player.money = 300; g.player.familyMoney = 300;
  g.player.skills.letters = 30;
  homePlace.set(g, place);
  return g;
}
function friend(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: 30 * 12, job: 'farmer', ...opts });
  p.known = true; p.place = opts.place ?? 'leocast'; p.affection = opts.aff ?? 60; g.people.push(p);
  return p;
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
    if (/^letters_/.test(kind) && samples.length < 30 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
  }
}
function settle(g) {
  const pl = homePlace.get(g);
  if (pl && !crimeState(g).jailed) { L(g).place = pl; L(g).travel = null; }
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
// 장면 하나를 바로 띄운다. 다른 사건이 끼어들면 형편을 되돌리고 세 번까지
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
// 편지 한 통이 내게 닿게 한다
function deliver(g, p, lk, extra = {}, pick = 0) {
  const v = lettersState(g);
  for (let t = 0; t < 3; t++) {
    resolveAll(g); settle(g);
    const n0 = seen.scenes.letters_arrive ?? 0;
    v.inbox = v.inbox.filter((x) => x.from !== p.id);
    v.inbox.unshift({ id: v.seq++, from: p.id, name: p.name, lk, sent: 0, arrive: 0, need: lk === 'need' ? 12 : 0, toOld: false, lost: false, ...extra });
    play(g, 1, ['rest'], { letters_arrive: pick }, 1);
    if ((seen.scenes.letters_arrive ?? 0) > n0) return true;
  }
  return false;
}
const checkInfo = (g) => {
  const info = lettersInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `lettersInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};

// 1) 편지를 쓰고, 닿고, 답장이 온다
{
  let replied = 0, sent = 0;
  for (let t = 0; t < 5; t++) {
    const g = adult(10 + t);
    const p = friend(g);
    const v = lettersState(g);
    ok(availableActions(g).some((a) => a.id === 'letters_write'), 'write available');
    for (let k = 0; k < 4 && !v.outbox.length; k++) play(g, 1, ['letters_write'], { letters_write: idxOf(new RegExp(p.name)), letters_send: idxOf(/급사/) }, 1);
    const l = v.outbox.find((x) => x.to === p.id);
    if (!l) continue;
    sent++;
    l.lost = false;
    ok(l.arrive > l.sent, 'takes months');
    const a0 = p.affection;
    for (let m = 0; m < 8 && v.outbox.includes(l); m++) play(g, 1, ['rest'], {}, 1);
    ok(!v.outbox.includes(l) && v.corr[p.id]?.count >= 1 && p.affection > a0, `arrived ${v.corr[p.id]?.count} ${a0}→${p.affection}`);
    for (let m = 0; m < 10 && !(seen.scenes.letters_arrive > 0 && v.corr[p.id]?.count >= 2); m++) play(g, 1, ['rest'], { letters_arrive: idxOf(/답장/) }, 1);
    if (v.corr[p.id]?.count >= 2) replied++;
    checkInfo(g);
  }
  ok(sent >= 4, `sent ${sent}`);
  ok(replied >= 2, `replied ${replied}`);
  // 같은 고장 사람에게는 쓸 수 없다
  const h = adult(20);
  const near = friend(h, { place: 'ern' });
  ok(!availableActions(h).some((a) => a.id === 'letters_write') || lettersInfo(h).corr.every((c) => c.name !== near.name), 'near person not a correspondent');
}

// 2) 받는 편지: 돈 부탁, 연서, 답장
{
  const g = adult(30);
  const p = friend(g);
  const v = lettersState(g);
  const m0 = g.player.money;
  deliver(g, p, 'need', {}, idxOf(/부쳐 준다/));
  ok(g.player.money <= m0 - 12 && v.outbox.some((x) => x.to === p.id && x.gift === 12), `need sent ${m0}→${g.player.money}`);
  deliver(g, p, 'love', {}, idxOf(/간직/));
  ok(v.kept.some((x) => x.love), 'love kept');
  deliver(g, p, 'news', {}, idxOf(/답장/));
  ok(v.corr[p.id].unanswered === 0, 'reply clears unanswered');
  // 답이 없으면 끊긴다
  v.corr[p.id].unanswered = 3;
  play(g, 1, ['rest'], {}, 1);
  ok(v.corr[p.id].stopped, 'stopped after 3 unanswered');
  ok(!lettersInfo(g).corr.find((c) => c.name.startsWith(p.name))?.waiting || v.corr[p.id].stopped, 'info waiting');
  checkInfo(g);
}

// 3) 죽은 뒤에 닿은 편지, 그 자식에게 잇기
{
  const g = adult(40);
  const p = friend(g, { ageMonths: 60 * 12 });
  const kid = friend(g, { ageMonths: 25 * 12, lastName: p.lastName, aff: 0 }); kid.fatherId = p.id; p.childIds.push(kid.id);
  kill(g, p, '겨울 열병');
  deliver(g, p, 'sick', {}, idxOf(/자식/));
  const v = lettersState(g);
  ok(v.corr[kid.id]?.inherited, 'dead → kid correspondent');
  ok(v.inbox.some((x) => x.from === kid.id), 'kid writes back');
  // 되돌아온 편지
  const q = friend(g);
  v.outbox.push({ id: v.seq++, to: q.id, name: q.name, sent: 0, arrive: 0, lost: false, gift: 0, love: false, secret: false });
  kill(g, q, '사고');
  play(g, 1, ['rest'], {}, 1);
  ok(v.kept.some((x) => x.line.includes('돌아온')), 'returned letter kept');
}

// 4) 잃은 편지, 배우자에게 들킨 연서
{
  let caught = 0;
  for (let t = 0; t < 10; t++) {
    const g = adult(50 + t);
    const sp = friend(g, { place: 'ern', sex: g.player.sex === 'm' ? 'f' : 'm' });
    me(g).spouseId = sp.id; sp.spouseId = me(g).id;
    loveState(g).spouse = { id: sp.id, mood: 70 };
    const ex = friend(g, { sex: sp.sex });
    loveState(g).exes.push({ id: ex.id, name: ex.name, how: 'divorce', at: 0 });
    g.player.skills.letters = 0;
    scene(g, 'letters_send', { to: ex.id }, idxOf(/연서/));
    if ((loveState(g).spouse?.mood ?? 70) < 70) caught++;
    const l = lettersState(g).outbox.find((x) => x.to === ex.id);
    ok(!l || (l.love && l.secret), 'secret love letter');
    checkInfo(g);
  }
  ok(caught >= 1, `love caught ${caught}`);
  const g = adult(61);
  const p = friend(g);
  const v = lettersState(g);
  v.outbox.push({ id: v.seq++, to: p.id, name: p.name, sent: 0, arrive: 0, lost: true, gift: 10, love: false, secret: false });
  play(g, 1, ['rest'], {}, 1);
  ok(v.log.some((x) => x.text.includes('사라졌다')) && !v.corr[p.id]?.count, 'lost gift');
}

// 5) 떠난 자식
{
  const g = adult(70, { age: 50 });
  const kid = friend(g, { ageMonths: 22 * 12, lastName: g.player.lastName, place: 'ern', aff: 50 });
  me(g).childIds.push(kid.id); kid.fatherId = me(g).id;
  kinState(g).kids[kid.id] = { bond: 50, left: 'leocast', disowned: false, grudge: {} };
  scene(g, 'letters_send', { to: kid.id }, idxOf(/열 닢/));
  const v = lettersState(g);
  const l = v.outbox.find((x) => x.to === kid.id);
  ok(!!l, 'letter to left kid');
  if (l) { l.lost = false; l.arrive = 0; play(g, 1, ['rest'], {}, 1); ok(kinState(g).kids[kid.id].bond > 50, `kid bond ${kinState(g).kids[kid.id].bond}`); }
  ok(lettersInfo(g).corr.some((c) => c.kind === 'kid'), 'kid kind');
}

// 6) 남의 편지
{
  const g = adult(80);
  g.player.stats.agi = 90; g.player.skills.letters = 90;
  const s0 = courtState(g).secrets.length;
  scene(g, 'letters_found', { lk: 'court', house: '몬트렐 공작가', hid: 'montrel', who: '오토', how: '여관 주인이 내 방에 잘못 넣어 둔 편지다.' }, idxOf(/뜯어/));
  ok(courtState(g).secrets.length > s0, 'court secret from letter');
  const c = { id: 99, kind: 'theft', place: 'ern', year: g.date.year, at: g.date.year * 12 + g.date.month, victim: '은 성배', suspects: [{ name: '야경꾼 오토', role: '야경꾼', motive: '노름빚', guilty: true, cleared: false, pointed: false }], clues: [], heat: 0, none: false, state: 'open', by: '누군가', offered: false };
  mysteryOf(g).cases.push(c);
  scene(g, 'letters_found', { lk: 'crime', house: '', hid: '', who: '오토', how: '여관 주인이 내 방에 잘못 넣어 둔 편지다.' }, idxOf(/뜯어/));
  ok(c.suspects[0].pointed && c.clues.length, 'mystery clue from letter');
  const m0 = g.player.money;
  scene(g, 'letters_found', { lk: 'plain', house: '', hid: '', who: '한스', how: '길가 도랑에 전령 가방이 처박혀 있었다.' }, idxOf(/전해/));
  ok(g.player.money >= m0, 'pass on');
  ok(lettersState(g).opened >= 2, 'opened count');
  // 저절로도 손에 들어온다 (여관살이, 길 위)
  const h = adult(81);
  L(h).home = 'inn';
  for (let m = 0; m < 200 && !(seen.scenes.letters_found > 3); m++) play(h, 1, ['rest'], {}, 1);
  ok(seen.scenes.letters_found > 3, 'found naturally');
}

// 7) 위조
{
  const g = adult(90);
  g.player.skills.letters = 95; g.player.stats.int = 90; g.player.stats.agi = 90;
  ok(availableActions(g).some((a) => a.id === 'letters_forge'), 'forge available');
  const m0 = g.player.money;
  scene(g, 'letters_forge', {}, idxOf(/증서/));
  ok(lettersState(g).forged >= 1 && g.player.money > m0, `forged seal ${g.player.money - m0}`);
  scene(g, 'letters_forge', {}, idxOf(/밀서/));
  ok(courtState(g).secrets.some((x) => x.what.includes('거짓 밀서')), 'forged house letter');
  let caught = 0;
  for (let t = 0; t < 6; t++) {
    const h = adult(91 + t);
    h.player.skills.letters = 25; h.player.stats.int = 0; h.player.stats.agi = 0;
    scene(h, 'letters_forge', {}, idxOf(/유언장/));
    if (crimeState(h).record.some((r) => r.c === 'fraud')) caught++;
  }
  ok(caught >= 3, `forge caught ${caught}`);
  const n = adult(98);
  n.player.skills.letters = 10;
  ok(!availableActions(n).some((a) => a.id === 'letters_forge'), 'no forge without skill');
}

// 8) 대 잇기: 선대의 벗, 편지 묶음, 선대 앞으로 온 편지
{
  const g = adult(100, { age: 60 });
  const p = friend(g, { aff: 70 });
  const cold = friend(g, { aff: 10 });
  const v = lettersState(g);
  v.corr[p.id] = { pid: p.id, name: p.name, warmth: 85, count: 5, last: 0, unanswered: 0, gen: 1, inherited: false, stopped: false };
  v.corr[cold.id] = { pid: cold.id, name: cold.name, warmth: 20, count: 1, last: 0, unanswered: 2, gen: 1, inherited: false, stopped: false };
  v.kept.push({ from: p.name, y: 500, line: '안부 편지', love: false }, { from: '이름 모를 사람', y: 501, line: '연서', love: true });
  v.inbox.push({ id: v.seq++, from: p.id, name: p.name, lk: 'news', sent: 0, arrive: 99999, need: 0, toOld: false, lost: false });
  runHooks('heir', g, rngOf(g), g.player);
  ok(v.corr[p.id]?.inherited && v.corr[p.id].warmth === 51, `inherited ${JSON.stringify(v.corr[p.id])}`);
  ok(!v.corr[cold.id], 'cold correspondent dropped');
  ok(v.inbox.every((x) => x.toOld), 'inbox to old');
  ok(L(g).queue.some((x) => x.kind === 'letters_bundle'), 'bundle queued');
  play(g, 1, ['rest'], { letters_bundle: 0 }, 1);
  ok(seen.scenes.letters_bundle > 0, 'bundle seen');
  v.inbox[0].arrive = 0;
  for (let m = 0; m < 3 && v.inbox.length; m++) { settle(g); play(g, 1, ['rest'], { letters_arrive: 0 }, 1); }
  ok(lettersInfo(g).corr.some((c) => c.kind === 'heirloom'), 'heirloom kind');
  const old = JSON.parse(JSON.stringify(g)); delete old.letters;
  runHooks('migrate', old);
  ok(old.letters && old.letters.corr, 'old save letters');
  checkInfo(g);
}

// 9) 여러 삶
let lives = 0, letters = 0;
for (let run = 0; run < 10; run++) {
  const g = adult(1000 + run, { age: 16 + (run % 4) * 8 });
  for (let i = 0; i < 3; i++) friend(g, { place: ['leocast', 'harfen', 'verden'][i], aff: 30 + i * 15 });
  const start = L(g).gen ?? 1;
  play(g, 12 * 30, ACTS, {}, 0.3);
  if ((L(g).gen ?? 1) > start) lives++;
  letters += Object.values(lettersState(g).corr).reduce((a, c) => a + c.count, 0);
  checkInfo(g);
}
for (let run = 0; run < 5; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6000 + run });
  play(g, 12 * 50, ['work', 'rest', 'letters_write'], {}, 0.4);
  checkInfo(g);
}
ok(letters > 20, `letters in lives ${letters}`);

for (const k of ['letters_write', 'letters_forge']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['letters_write', 'letters_send', 'letters_arrive', 'letters_found', 'letters_forge', 'letters_bundle']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('letters_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('letters_')))));
console.log(`대를 이은 삶 ${lives}/10, 오간 편지 ${letters}`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `letterstest: ${fail} 실패` : 'letterstest: 통과');
process.exit(fail ? 1 : 0);
