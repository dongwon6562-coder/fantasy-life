import './lsshim.js';
import '../src/content.js';
// 버그 패치 점검(도우미스레드3: 사건·세계·역사·어린 시절·시대): 일부러 깨 본다.
// 1) 여러 집안으로 오래 살며 같은 행동을 여러 칸 고르기, 대 잇기, 저장·불러오기를 섞는다.
// 2) 중간중간 모든 사건을 억지로 띄워 글과 선택지를 보고, 뜬 뒤에 사람이 죽거나 떠난 상태로 고른다.
// 3) 예전 저장(시대·역사·어린 시절 상태가 없던 때) 모양으로 되돌려 불러온 뒤 계속 산다.
// node tools/fuzz3.js [판 수] [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId, living, ageYears } from '../src/npc.js';
import { marry } from '../src/relations.js';
import { makeRng } from '../src/rng.js';
import { L } from '../src/adventure/core.js';

const RUNS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 14);
const verbose = process.argv.includes('-v');
const FAMS = ['farmer', 'fallen_knight', 'merchant', 'elf_exile', 'dwarf_smith', 'beast_hunter', 'half_elf'];
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const problems = new Map(); // 같은 문제는 한 번만
const bad = (key, detail) => { if (!problems.has(key)) problems.set(key, detail); };
const clone = (g) => structuredClone(g);
const counts = {}; // 한 삶에서 같은 사건이 몇 번
let maxRepeat = [];

function checkStr(where, s) {
  if (typeof s !== 'string') { bad(`${where}:type`, `${where} 글이 문자열이 아니다: ${JSON.stringify(s)?.slice(0, 120)}`); return; }
  if (BAD.test(s)) bad(`${where}:bad`, `${where}: ${s.slice(0, 200)}`);
}
function checkGame(where, g) {
  for (const [k, v] of Object.entries(g.player.stats)) if (!Number.isFinite(v)) bad(`${where}:stat:${k}`, `${where} 능력치 ${k}=${v}`);
  for (const [k, v] of Object.entries(g.player.skills)) if (!Number.isFinite(v)) bad(`${where}:skill:${k}`, `${where} 기술 ${k}=${v}`);
  for (const k of ['money', 'familyMoney', 'stress', 'fatigue']) if (!Number.isFinite(g.player[k])) bad(`${where}:${k}`, `${where} ${k}=${g.player[k]}`);
  if (g.pendingEvent) {
    const pe = g.pendingEvent;
    checkStr(`${pe.id} 제목`, pe.title); checkStr(`${pe.id} 본문`, pe.text);
    if (!pe.choices?.length) bad(`${pe.id}:nochoice`, `${pe.id} 선택지가 없다`);
    pe.choices?.forEach((c) => checkStr(`${pe.id} 선택지`, c));
  }
}

// 사건 하나를 억지로 띄운다 (pickEvent와 같은 순서)
function force(g, e, rng) {
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const shown = e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.show || c.show(g, ctx));
  return { id: e.id, title: e.title, text: e.text(g, ctx), choices: shown.map(({ c }) => (typeof c.label === 'function' ? c.label(g, ctx) : c.label)), choiceIdx: shown.map(({ i }) => i), ctx };
}
// 사건이 뜬 뒤 세상이 바뀐다: ctx가 가리키는 사람이 죽거나 떠나고, 돈이 바닥난다
function shake(g, ctx, mode) {
  const ids = new Set();
  const walk = (v) => { if (typeof v === 'number') ids.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(ctx);
  if (mode === 1) for (const p of g.people) if (!p.isPlayer && ids.has(p.id)) { p.alive = false; }
  if (mode === 2) { g.player.money = 0; g.player.familyMoney = 0; for (const p of g.people) if (!p.isPlayer && ids.has(p.id)) p.away = true; }
  if (mode === 3) { const l = L(g); l.travel = { to: 'leocast', from: l.place ?? 'ern', left: 2 }; }
}

let swept = 0;
const covered = new Set();
const weak = new Map();
// 조건이 맞지 않는데 떴다고 치고 (불러온 저장에 남은 사건, 그 사이 바뀐 세상) 글과 고르기가 버티는지
function hard(g0, e, tag) {
  const g = clone(g0);
  const rng = makeRng({ s: (g.date.year * 17 + e.id.length) >>> 0 });
  try {
    const pe = force(g, e, rng);
    g.pendingEvent = pe;
    const out = resolveEvent(g, rng, 0);
    if (typeof out === 'string' && BAD.test(out)) weak.set(e.id, `글: ${out.slice(0, 120)}`);
  } catch (err) { if (!weak.has(e.id)) weak.set(e.id, `${err.message} ${err.stack?.split('\n')[1]?.trim()}`); }
}
function sweep(g0, tag) {
  for (const e of EVENTS) {
    if (e.quiet) continue; // 결투의 합은 결투 안에서만 뜬다
    let ok = false;
    try { ok = !!e.cond(g0); } catch { ok = false; }
    if (ok) covered.add(e.id);
    if (!ok) { if (process.argv.includes('--hard')) hard(g0, e, tag); continue; }
    for (let mode = 0; mode < 4; mode++) {
      const g = clone(g0);
      const rng = makeRng({ s: (g.date.year * 131 + mode * 7 + e.id.length) >>> 0 });
      let pe;
      try { pe = force(g, e, rng); } catch (err) { bad(`${e.id}:show`, `${e.id} 띄우다 오류(${tag}): ${err.message}`); break; }
      if (mode === 0) {
        swept++;
        checkStr(`${e.id} 본문`, pe.text);
        pe.choices.forEach((c) => checkStr(`${e.id} 선택지`, c));
        if (!pe.choices.length) bad(`${e.id}:nochoice`, `${e.id} 보이는 선택지가 없다(${tag})`);
      }
      g.pendingEvent = pe;
      shake(g, pe.ctx, mode);
      const idx = rng.int(0, Math.max(0, pe.choices.length - 1));
      try {
        const out = resolveEvent(g, rng, idx);
        checkStr(`${e.id} 결과${mode ? `(뜬 뒤 바뀜 ${mode})` : ''}`, out ?? '');
        checkGame(`${e.id} 뒤`, g);
      } catch (err) { bad(`${e.id}:run:${mode}`, `${e.id} 고르다 오류(뒤 바뀜 ${mode}, ${tag}): ${err.message} ${err.stack?.split('\n')[1]?.trim()}`); }
    }
  }
}

// 무작위 봇이 잘 닿지 못하는 상태(서클, 자격, 소꿉친구 단계, 서당, 첫 죽음, 검 등급, 큰 도시)를 억지로 만든다
function boost(g0, k) {
  const g = clone(g0);
  const rng = makeRng({ s: (k * 7919 + g.date.year) >>> 0 });
  const p = g.player;
  p.manaAwakened = true; p.mana = 9999; p.skills.magic = 95; p.skills.sword = 80; p.skills.letters = 40;
  g.magic ??= { known: [], certified: 0, exam: null, study: null, works: 0 };
  if (!g.magic.known.includes('infuse')) g.magic.known.push('infuse');
  g.magic.certified = rng.int(1, 4);
  if (g.realm) g.realm.era = rng.int(1, 3);
  g.duelStats = { ...(g.duelStats ?? {}), wins: 8 };
  g.sword = { school: g.sword?.school ?? 'yusu', rank: 2, master: g.sword?.master ?? null, tests: 1 };
  const others = g.people.filter((x) => x.alive && !x.isPlayer && !g.player.familyIds.includes(x.id) && (x.place ?? 'ern') === (g.life?.place ?? 'ern'));
  const ch = g.childhood;
  if (ch && others.length) {
    ch.friend = rng.pick(others).id;
    ch.bestie.stage = rng.int(0, 5); ch.bestie.at = 0;
    ch.school.stage = rng.int(0, 2); ch.counts.study = 5;
    if (!ch.firstDeath) ch.pendingDeath = rng.pick(others).id;
  }
  (g.flags ??= {}).child_recommend = true;
  if (g.life && !g.life.travel && rng.chance(0.5)) g.life.place = rng.pick(['harfen', 'leocast', 'verden']);
  return g;
}

// 예전 저장 모양: 뒤 단계에서 생긴 상태를 지운다
function oldSave(g) {
  const c = clone(g);
  delete c.era; delete c.childhood; delete c.history; delete c.evLast; delete c.realm; delete c.crisis;
  if (c.flags) for (const k of Object.keys(c.flags)) if (/^(era_|ch_|hist_)/.test(k)) delete c.flags[k];
  for (const p of c.people) { delete p.race; delete p.memories; }
  return c;
}

function live(g, months, tag, opts = {}) {
  const per = {};
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    let acts;
    try { acts = availableActions(g); } catch (err) { bad(`acts:${err.message}`, `행동 목록 오류(${tag}): ${err.message}`); return per; }
    const choices = [];
    const same = rng.chance(0.3) ? rng.pick(acts) : null; // 같은 행동을 모든 칸에
    for (let i = 0; i < slotsFor(g); i++) {
      const a = same ?? rng.pick(acts);
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive)?.id;
      choices.push(c);
    }
    if (playerAge(g) >= 22 && !me(g).spouseId && rng.chance(0.08)) {
      const sp = living(g).find((p) => !p.isPlayer && !p.spouseId && p.sex !== g.player.sex && Math.abs(ageYears(p) - playerAge(g)) <= 8 && ageYears(p) >= 17 && !g.player.familyIds.includes(p.id));
      if (sp) marry(g, sp);
    }
    try {
      const res = endMonth(g, choices);
      for (const r of res) checkStr(`행동 ${r.id ?? choices.map((c) => c.id).join('/')}`, r.text);
    } catch (err) { bad(`month:${err.message}`, `달 넘기기 오류(${tag}, ${choices.map((c) => c.id).join('/')}): ${err.message} ${err.stack?.split('\n')[1]?.trim()}`); return per; }
    let guard = 0;
    while (g.pendingEvent && guard++ < 60) {
      const pe = g.pendingEvent;
      checkGame(tag, g);
      per[pe.id] = (per[pe.id] ?? 0) + 1;
      const heir = L(g).scene?.kind === 'heir';
      try {
        const out = resolveEvent(g, rngOf(g), heir ? 0 : rngOf(g).int(0, Math.max(0, pe.choices.length - 1)));
        checkStr(`${pe.id} 결과`, out ?? '');
      } catch (err) { bad(`${pe.id}:resolve`, `${pe.id} 고르다 오류(${tag}): ${err.message} ${err.stack?.split('\n')[1]?.trim()}`); g.pendingEvent = null; }
    }
    if (g.pendingEvent && guard > 60) bad(`stuck:${g.pendingEvent.id}`, `${g.pendingEvent.id} 사건이 끝없이 이어진다`);
    checkGame(tag, g);
    for (const c of g.chronicle.slice(-6)) checkStr('기록', c.text);
    if (opts.sweep && m % (playerAge(g) < 16 ? 5 : 23) === 0) { sweep(g, `${tag} ${playerAge(g)}살`); if (m % 2 === 0) sweep(boost(g, m), `${tag} ${playerAge(g)}살 억지 상태`); }
    if (m % 120 === 60) { // 저장 → 불러오기, 예전 저장 → 불러오기
      const c = JSON.parse(JSON.stringify(g)); setNextId(c.nextId);
      try { runHooks('migrate', c); } catch (err) { bad(`migrate:${err.message}`, `불러오기 오류: ${err.message}`); }
      const o = JSON.parse(JSON.stringify(oldSave(g))); setNextId(o.nextId);
      try { runHooks('migrate', o); live(o, 18, `${tag} 예전 저장`); } catch (err) { bad(`oldmigrate:${err.message}`, `예전 저장 불러오기 오류: ${err.message} ${err.stack?.split('\n')[1]?.trim()}`); }
      setNextId(g.nextId);
    }
  }
  return per;
}

const t0 = Date.now();
for (let run = 0; run < RUNS; run++) {
  const fam = FAMS[run % FAMS.length];
  const g = newGame({ name: '깨보기', sex: run % 2 ? 'm' : 'f', familyId: fam, mode: 'once', seed: 9100 + run * 17 });
  if (run % 2) g.realm.tech = 1.3;
  const per = live(g, 12 * 80, `${fam}#${run}`, { sweep: true });
  const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 4);
  for (const [id, n] of Object.entries(per)) counts[id] = Math.max(counts[id] ?? 0, n);
  maxRepeat.push(top[0]);
  if (verbose) console.log(`#${run} ${fam} 세대 ${L(g).gen} 나이 ${playerAge(g)} over=${g.over} 많이 나온 사건 ${top.map(([a, b]) => `${a}:${b}`).join(' ')}`);
}
// 같은 달에 같은 행동을 네 칸 모두 고르면: 좌판은 한 번, 응시료는 한 번, 대련은 하나만
{
  const g = newGame({ name: '네칸', sex: 'm', familyId: 'merchant', mode: 'free', seed: 515 });
  g.date.year += 25; for (const p of g.people) p.ageMonths += 25 * 12; // 스물다섯 살로
  L(g).place = 'harfen'; g.player.money = 500;
  g.history.inventions = ['firestone', 'streetlamp', 'warmstone'];
  g.player.manaAwakened = true; g.player.mana = 999; g.player.skills.magic = 60;
  const four = (id) => Array.from({ length: slotsFor(g) }, () => ({ id }));
  endMonth(g, four('era_shop'));
  const shops = L(g).queue.filter((x) => x.kind === 'era_shop').length + (L(g).scene?.kind === 'era_shop' ? 1 : 0);
  if (shops > 1) bad('slots:era_shop', `새 물건 구경을 네 칸 고르면 좌판이 ${shops}번 뜬다`);
  while (g.pendingEvent) resolveEvent(g, rngOf(g), 0);
  L(g).queue.length = 0;
  const before = g.player.money;
  endMonth(g, four('circle_exam'));
  const paid = before - g.player.money;
  if (paid > 10) bad('slots:circle_exam', `서클 시험을 네 칸 고르면 응시료를 여러 번 낸다 (은화 ${paid})`);
}
const freq = Object.entries(counts).filter(([id]) => !/^(life_scene|duel_)/.test(id)).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log(`${RUNS}판, 억지로 띄운 사건 ${swept}번, ${((Date.now() - t0) / 1000).toFixed(0)}초`);
console.log(`한 삶에서 가장 많이 나온 사건(장면·결투 합 빼고): ${freq.map(([a, b]) => `${a}:${b}`).join(' ')}`);
const never = EVENTS.filter((e) => !e.quiet && !covered.has(e.id)).map((e) => e.id);
console.log(`억지로 띄워 보지 못한 사건 ${never.length}: ${never.join(' ')}`);
if (weak.size) { console.log(`조건 밖에서 깨지는 사건 ${weak.size}:`); for (const [id, w] of weak) console.log('  weak', id, w); }
for (const d of problems.values()) console.log('FAIL', d);
console.log(problems.size ? `FAIL ${problems.size}` : 'OK');
if (problems.size) process.exitCode = 1;
