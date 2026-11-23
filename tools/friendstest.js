import './lsshim.js';
import '../src/content.js';
// 35단계 도우미2 점검: 평생의 벗. 어른이 되어 벗이 생기는지, 깊어지고 멀어지는지, 장면이 그 형편에서 뜨고 글이 깨지지 않는지,
// NPC끼리 벗이 생기고 갈라지는지, 의형제는 빠지는지, 대를 이으면 선대의 벗과 대를 이은 벗이 이어지는지, 옛 저장을 본다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { byId, makePerson, kill } from '../src/npc.js';
import { friendsLines, friendsLine, friendsInfo, friendsState } from '../src/friends/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const kinds = {}; const samples = {};
const keep = (k, t) => { (samples[k] ??= []).length < 2 && !samples[k].includes(t) && samples[k].push(t); };

function resolveAll(g, pickIdx) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    const mine = kind.startsWith('fr_');
    if (mine) { scenes[kind] = (scenes[kind] ?? 0) + 1; ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.text} | ${pe.choices}`); }
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    if (mine && pickIdx != null) idx = Math.min(pickIdx, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); keep(kind, `${pe.text.slice(0, 80)}… [${pe.choices[idx]}] → ${String(out).slice(0, 90)}`); }
    ok(g.player.money >= 0 && Number.isFinite(g.player.money), `money after ${kind}`);
  }
}
function checkMonth(g) {
  const ls = friendsLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
  const l = friendsLine(g); ok(l === null || typeof l === 'string', 'line');
}
function checkInfo(g) {
  const i = friendsInfo(g);
  ok(i && Array.isArray(i.friends) && JSON.stringify(i).match(/undefined|NaN/) == null, `info ${JSON.stringify(i).slice(0, 200)}`);
  for (const f of [...i.friends, ...i.past]) ok(!bad(f.name) && !bad(f.word) && !bad(f.where), `info word ${JSON.stringify(f)}`);
}
function life(seed, years, opts = {}) {
  const g = newGame({ name: seed % 2 ? '요나스' : '클라라', sex: seed % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'capital_artisan', 'port_folk'][seed % 4], mode: 'free', seed });
  const rng = rngOf(g);
  for (let m = 0; m < years * 12 && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !opts.stay || !/travel|move/.test(a.id));
    const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    opts.each?.(g, m);
    endMonth(g, ch);
    resolveAll(g);
    checkMonth(g);
    if (m % 48 === 0) checkInfo(g);
  }
  return g;
}

// 1. 그냥 사는 삶: 열여섯 넘어 벗이 생기고, 장면이 뜨고, NPC끼리도 벗이 생긴다
let made = 0; let npcPairs = 0; let npcEnds = 0;
for (let k = 0; k < 6; k++) {
  const g = life(3500 + k, 45, { stay: k < 3 });
  const s = friendsState(g);
  made += s.list.length; npcPairs += s.npc.length; npcEnds += s.npc.filter((x) => x.end).length;
  ok(s.list.every((f) => f.depth >= 0 && f.depth <= 100), 'depth 범위');
  ok(s.list.every((f) => { const p = byId(g, f.pid); return p && !p.isPlayer && p.id !== me(g).spouseId; }), '벗 목록에 나나 배우자');
  checkInfo(g);
}
ok(made >= 5, `벗이 너무 적음 ${made}`); // 무작위 행동 삶이라 다른 갈래가 늘면 흔들린다: 장면 자체는 2·3에서 본다
ok(npcPairs >= 8 && npcEnds >= 1, `NPC 벗 ${npcPairs} 끝 ${npcEnds}`);
ok(scenes.fr_meet > 0, '벗 사귀기 장면');

// 2. 장면마다 고를 것을 다 골라 본다
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3520 });
  me(g).ageMonths = 30 * 12; g.player.money = 900;
  const rng = rngOf(g);
  const mk = (age, sex = 'm') => { const p = makePerson(rng, { ageMonths: age * 12, sex, job: 'farmer' }); p.place = L(g).place; p.known = true; p.affection = 50; g.people.push(p); return p; };
  const a = mk(31); const b = mk(29, 'f'); const kid = makePerson(rng, { ageMonths: 6 * 12, fatherId: a.id }); g.people.push(kid); a.childIds.push(kid.id);
  const s = friendsState(g);
  const base = { pid: a.id, name: a.name };
  const DATA = {
    fr_meet: [{ ...base, where: 'work' }, { ...base, where: 'war' }, { pid: b.id, name: b.name, where: 'school' }],
    fr_drink: [{ ...base, v: 1 }],
    fr_reunion: [{ ...base, years: 6 }],
    fr_loan: [{ ...base, amt: 60, why: '장사 밑천이 떨어졌다고.' }],
    fr_debt: [{ ...base, amt: 60 }],
    fr_surety: [{ ...base, amt: 200, why: '배 한 척을 사려' }],
    fr_surety_due: [{ ...base, amt: 200 }],
    fr_wedding: [{ ...base, sp: b.name }, { ...base, sp: '' }],
    fr_jealous: [base],
    fr_betray: [{ ...base, v: 0 }, { ...base, v: 2 }],
    fr_forgive: [{ ...base, years: 7 }],
    fr_old: [{ ...base, lost: 3 }, { ...base, lost: 0 }],
    fr_elder: [{ ...base, from: '마르틴' }, { pid: b.id, name: b.name, from: '안나' }],
    fr_legacy: [{ pid: b.id, name: b.name, parent: '오토' }],
  };
  for (const [kind, list] of Object.entries(DATA)) for (const d of list) for (let i = 0; i < 3; i++) {
    for (const p of [a, b]) { p.alive = true; p.away = false; p.place = L(g).place; }
    if (!s.list.some((f) => f.pid === a.id)) s.list.push({ pid: a.id, since: 0, where: 'work', depth: 50, lastMet: 0, state: 'close', wed: false, debt: null, jealous: 0, shown: false, betrayedAt: null, forgiven: null, diedAt: null, kidsAt: -99 });
    const f = s.list.find((x) => x.pid === a.id);
    if (kind === 'fr_debt') f.debt = { kind: 'loan', amt: 60, at: 0, asked: true };
    if (kind === 'fr_surety_due') f.debt = { kind: 'surety', amt: 200, at: 0, asked: true };
    if (kind === 'fr_forgive') { f.state = 'broken'; f.betrayedAt = 0; f.forgiven = null; }
    ok(showScene(g, { kind, at: L(g).place, t: 0, ...d }, { force: true }) && g.pendingEvent, `장면이 안 뜸 ${kind}`);
    resolveAll(g, i);
    g.player.money = Math.max(g.player.money, 900);
    f.state = 'close';
  }
  // 장례: 벗이 죽는다 → 장면, 남은 아이를 돌보면 대를 이은 벗 후보
  for (let i = 0; i < 3; i++) {
    const c = mk(33); c.childIds = []; const ck = makePerson(rng, { ageMonths: 5 * 12, fatherId: c.id }); g.people.push(ck); c.childIds.push(ck.id);
    s.list.push({ pid: c.id, since: 0, where: 'tavern', depth: 60, lastMet: 0, state: 'close', wed: false, debt: null, jealous: 0, shown: false, betrayedAt: null, forgiven: null, diedAt: null, kidsAt: -99 });
    kill(g, c, '열병');
    ok(showScene(g, { kind: 'fr_funeral', at: L(g).place, t: 0, pid: c.id, name: c.name }, { force: true }), '장례 장면');
    resolveAll(g, i);
  }
  ok(s.legacy.length >= 1, '장례 뒤 남은 아이');
  for (const k of [...Object.keys(DATA), 'fr_funeral']) ok(scenes[k] > 0, `장면 ${k}`);
}

// 3. 형편이 되면 저절로: 빚, 질투와 배신, 혼례, 장례 소식, 멀어짐, 다시 만남, 늙은 벗, 아이들
{
  const before = { ...scenes };
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3530 });
  me(g).ageMonths = 25 * 12;
  const rng = rngOf(g);
  const s = friendsState(g);
  const mk = (age, traits) => { const p = makePerson(rng, { ageMonths: age * 12, sex: 'm', job: 'farmer', traits }); p.place = L(g).place; p.known = true; p.affection = 60; g.people.push(p); s.list.push({ pid: p.id, since: 0, where: 'work', depth: 70, lastMet: 0, state: 'close', wed: false, debt: null, jealous: 0, shown: false, betrayedAt: null, forgiven: null, diedAt: null, kidsAt: -99 }); return p; };
  const envy = mk(26, ['ambitious', 'cruel']); mk(27, ['generous', 'kind']); const lazy = mk(24, ['lazy', 'drunkard']);
  const far = mk(28, ['kind']); far.place = 'harfen'; s.list.at(-1).lastMet = -100;
  L(g).renown = 40;
  for (let m = 0; m < 30 * 12 && !g.over; m++) {
    g.player.money = Math.max(g.player.money, 600);
    if (m === 60) far.place = L(g).place;          // 멀리 간 벗이 돌아온다
    if (m === 30 && !lazy.spouseId) { const w = makePerson(rng, { ageMonths: 24 * 12, sex: 'f' }); g.people.push(w); lazy.spouseId = w.id; w.spouseId = lazy.id; }
    if (m === 200) kill(g, envy.alive ? lazy : envy, '사고');
    endMonth(g, [{ id: 'rest' }]); resolveAll(g); checkMonth(g);
    if (me(g).ageMonths < 60 * 12 && m > 240) { me(g).ageMonths = 61 * 12; for (const f of s.list) { const p = byId(g, f.pid); if (p?.alive) p.ageMonths = Math.max(p.ageMonths, 58 * 12); } }
  }
  const got = Object.fromEntries(Object.keys(scenes).map((k) => [k, scenes[k] - (before[k] ?? 0)]));
  for (const k of ['fr_jealous', 'fr_reunion', 'fr_wedding', 'fr_old']) ok(got[k] > 0, `저절로 안 뜸 ${k} ${JSON.stringify(got)}`);
  ok((got.fr_loan ?? 0) + (got.fr_surety ?? 0) > 0, `돈 장면 없음 ${JSON.stringify(got)}`);
  ok((got.fr_funeral ?? 0) + (kinds.grief ?? 0) > 0, '장례');
  checkInfo(g);
}

// 4. 의형제는 벗 목록에서 빠진다
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3540 });
  me(g).ageMonths = 25 * 12;
  const p = makePerson(rngOf(g), { ageMonths: 25 * 12, sex: 'm' }); p.place = L(g).place; p.known = true; p.affection = 70; g.people.push(p);
  const s = friendsState(g);
  s.list.push({ pid: p.id, since: 0, where: 'work', depth: 70, lastMet: 0, state: 'close', wed: false, debt: null, jealous: 0, shown: false, betrayedAt: null, forgiven: null, diedAt: null, kidsAt: -99 });
  g.oath ??= {}; g.oath.bonds = [...(g.oath.bonds ?? []), { id: 99, kind: 'blood', pid: p.id, name: p.name, since: 0 }];
  endMonth(g, [{ id: 'rest' }]); resolveAll(g);
  ok(s.list[0].state === 'sworn' && friendsInfo(g).friends.length === 0, '의형제');
}

// 5. 대를 이으면: 선대의 벗, 대를 이은 벗
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3550 });
  const rng = rngOf(g);
  const s = friendsState(g);
  const p = makePerson(rng, { ageMonths: 50 * 12, sex: 'm' }); p.place = L(g).place; p.known = true; g.people.push(p);
  const pk = makePerson(rng, { ageMonths: 18 * 12, sex: 'f', fatherId: p.id }); pk.place = L(g).place; g.people.push(pk); p.childIds.push(pk.id);
  s.list.push({ pid: p.id, since: 0, where: 'tavern', depth: 70, lastMet: 0, state: 'close', wed: false, debt: null, jealous: 0, shown: false, betrayedAt: null, forgiven: null, diedAt: null, kidsAt: -99 });
  const old = { ...g.player, name: '마르틴' };
  me(g).ageMonths = 20 * 12;
  runHooks('heir', g, rng, old);
  ok(s.elders.some((e) => e.pid === p.id && e.from === '마르틴') && s.legacy.some((x) => x.pid === pk.id) && s.list.length === 0 && s.gen === 1, '대 잇기');
  const before = { ...scenes };
  for (let m = 0; m < 120 && !g.over; m++) { endMonth(g, [{ id: 'rest' }]); resolveAll(g); checkMonth(g); }
  ok((scenes.fr_elder ?? 0) > (before.fr_elder ?? 0), '선대의 벗 장면');
  ok((scenes.fr_legacy ?? 0) > (before.fr_legacy ?? 0), '대를 이은 벗 장면');
}

// 6. 옛 저장
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3560 });
  delete g.friends; runHooks('migrate', g);
  ok(g.friends && Array.isArray(g.friends.list) && Array.isArray(g.friends.npc), '옛 저장');
  endMonth(g, [{ id: 'rest' }]); checkInfo(g);
}

console.log(`장면 ${JSON.stringify(scenes)}`);
console.log(`줄 ${JSON.stringify(kinds)}  벗 ${made} NPC 벗 ${npcPairs}(끝 ${npcEnds})`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('friendstest OK');
