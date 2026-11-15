import './lsshim.js';
import '../src/content.js';
// 깨 보기 점검 (관계·범죄·다른 나라·종족): 겹치는 상황을 일부러 만들어 멈춤·오류·undefined·NaN을 찾는다.
//  - 같은 달에 같은 행동을 여러 칸, 죽었거나 없는 사람을 대상으로 고르기
//  - 장면이 뜨기 전·고르기 전에 상황 바꾸기 (대상이 죽음, 감옥, 길 위, 다른 나라로 옮겨짐, 돈 0)
//  - 저장 → 불러오기, 예전 저장 모양(새 상태 필드가 없는 저장) 불러오기
//  - 대 잇기 뒤에도 이어서
// node tools/breaktest.js [판 수] [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me, knownPeople } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, showScene } from '../src/adventure/core.js';
import { FAMILIES } from '../src/data.js';
import { PLACES } from '../src/places.js';
import { crimeState, jail, CRIMES } from '../src/crime.js';
import { autosave, load } from '../src/save.js';
import { makeRng } from '../src/rng.js';
import { marry } from '../src/relations.js';
import { EVENTS } from '../src/events/core.js';
import { run as runHooks } from '../src/hooks.js';
import { GANGS } from '../src/underworld/gangs.js';
import { living, ageYears } from '../src/npc.js';

const RUNS = Number(process.argv[2]) || 30;
const verbose = process.argv.includes('-v');
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|=>/.test(t);
const problems = new Map();
const report = (key, detail) => {
  const k = key.slice(0, 160);
  if (!problems.has(k)) problems.set(k, { n: 0, detail });
  problems.get(k).n++;
};
const stackKey = (e) => `${e.message} @ ${(e.stack ?? '').split('\n').slice(1, 3).map((s) => s.trim().replace(/^at /, '').replace(/\(file:\/\/.*\/fantasy-life\//, '(')).join(' < ')}`;
const scenes = {};
const perturbs = {};

// 예전 저장 모양: 뒤에 생긴 상태를 지운다
const OLD_FIELDS = ['realms', 'races', 'crime', 'era', 'crisis', 'history'];
function oldShape(g) {
  for (const f of OLD_FIELDS) delete g[f];
  const life = g.life ?? g.adventure;
  if (life) { delete life.party; delete life.childhood; }
  for (const p of g.people) { delete p.race; delete p.beast; delete p.memories; delete p.bond; }
  return g;
}

const PLACE_IDS = Object.keys(PLACES).filter((p) => !PLACES[p].hidden);
function perturb(g, rng, where) {
  const life = L(g);
  const kinds = ['kill', 'jail', 'travel', 'move', 'broke', 'unjail', 'age'];
  const k = rng.pick(kinds);
  perturbs[`${where}:${k}`] = (perturbs[`${where}:${k}`] ?? 0) + 1;
  if (k === 'kill') {
    const ps = knownPeople(g).filter((p) => p.alive);
    const s = life.scene ?? life.queue[0];
    // 장면이 붙잡고 있는 사람이 있으면 그 사람부터
    const ids = s ? Object.values(s).filter((v) => typeof v === 'number') : [];
    const v = ids.map((id) => g.people.find((p) => p.id === id && p.alive && !p.isPlayer)).find(Boolean) ?? rng.pick(ps);
    if (v) { v.alive = false; v.deathYear = g.date.year; }
  } else if (k === 'jail') { if (!crimeState(g).jailed) jail(g, rng.int(1, 6)); }
  else if (k === 'unjail') { crimeState(g).jailed = null; }
  else if (k === 'travel') { if (!life.travel && !crimeState(g).jailed) life.travel = { to: rng.pick(PLACE_IDS), left: rng.int(1, 3), from: life.place }; }
  else if (k === 'move') { life.travel = null; life.place = rng.pick(PLACE_IDS); }
  else if (k === 'broke') { g.player.money = 0; }
  else if (k === 'age') { me(g).ageMonths += rng.int(1, 8) * 12; }
}

function check(g, where) {
  const pe = g.pendingEvent;
  if (pe) {
    if (bad(pe.title) || bad(pe.text)) report(`bad scene text ${L(g).scene?.kind ?? pe.id}`, `${pe.title} | ${pe.text}`);
    if (!Array.isArray(pe.choices) || !pe.choices.length) report(`empty choices ${L(g).scene?.kind ?? pe.id}`, where);
    else for (const c of pe.choices) if (bad(c) || !c) report(`bad choice ${L(g).scene?.kind ?? pe.id}`, String(c));
  }
  const p = g.player;
  for (const k of ['money', 'fatigue', 'stress', 'mana']) if (p[k] != null && !Number.isFinite(p[k])) report(`NaN player.${k}`, where);
  for (const x of g.people) {
    if (!Number.isFinite(x.affection ?? 0)) report('NaN affection', `${x.name} ${where}`);
    if (!Number.isFinite(x.ageMonths)) report('NaN ageMonths', `${x.name} ${where}`);
  }
}

for (let run = 0; run < RUNS; run++) {
  const fam = FAMILIES[run % FAMILIES.length].id;
  const seed = (Number(process.env.SEED) || 51000) + run * 7;
  let g = newGame({ name: run % 3 ? '시험' : '아주 길고 긴 이름의 사람', sex: run % 2 ? 'm' : 'f', familyId: fam, mode: run % 2 ? 'free' : 'once', seed });
  const side = makeRng({ s: seed * 31 + 5 });
  let lives = 0;
  for (let m = 0; m < 12 * 160 && !g.over; m++) {
    const where = `run${run} ${fam} m${m} age${playerAge(g)} ${L(g).place}`;
    try {
      const acts = availableActions(g);
      const slots = slotsFor(g);
      if (slots > 0 && !acts.length) { report('no actions', `${where} travel=${JSON.stringify(L(g).travel)} jailed=${JSON.stringify(crimeState(g).jailed)}`); L(g).travel = null; crimeState(g).jailed = null; continue; }
      const choices = [];
      const same = side.chance(0.3) ? side.pick(acts) : null;
      for (let i = 0; i < slots; i++) {
        const a = same ?? side.pick(acts);
        const c = { id: a.id };
        if (a.needsTarget) {
          const ps = knownPeople(g);
          const r = side.next();
          c.target = r < 0.1 ? 999999 : r < 0.2 ? g.player.id : (side.pick(ps)?.id ?? 999999);
        }
        choices.push(c);
      }
      // 대 잇기를 보려면 아이가 있어야 한다: 다른 종족과도 혼인시킨다
      if (playerAge(g) >= 20 && !me(g).spouseId && side.chance(0.08)) {
        const sp = living(g).find((p) => !p.isPlayer && !p.spouseId && p.sex !== g.player.sex && ageYears(p) >= 17 && ageYears(p) <= playerAge(g) + 10 && !g.player.familyIds.includes(p.id));
        if (sp) { try { marry(g, sp); } catch (e) { report(stackKey(e), `marry ${where}`); } }
      }
      if (side.chance(0.08)) perturb(g, side, 'before');
      endMonth(g, choices);
      for (const r of g.lastResults ?? []) if (bad(r.text) || bad(r.name)) report(`bad result ${r.name}`, r.text);
      for (const n of g.news ?? []) if (bad(n.text)) report('bad news', n.text);
      check(g, where);
      for (let k = 0; k < 6 && g.pendingEvent; k++) {
        const kind = L(g).scene?.kind ?? g.pendingEvent.id;
        scenes[kind] = (scenes[kind] ?? 0) + 1;
        if (side.chance(0.1)) perturb(g, side, 'scene');
        const idx = kind === 'heir' ? 0 : side.int(0, g.pendingEvent.choices.length - 1);
        const out = resolveEvent(g, rngOf(g), idx);
        if (bad(typeof out === 'string' ? out : '')) report(`bad outcome ${kind}`, String(out));
        if (kind === 'heir') lives++;
        check(g, where);
      }
      // 줄 선 장면을 상황을 바꾼 뒤 억지로 띄워 본다
      const q = L(g).queue;
      if (q.length && !g.pendingEvent && side.chance(0.3)) {
        perturb(g, side, 'queued');
        const s = q.shift();
        if (showScene(g, s)) check(g, `${where} forced ${s.kind}`);
      }
      if (m % 37 === 36) {
        autosave(g);
        g = load('auto');
        check(g, `${where} reload`);
      }
      if (m === 300 && run % 3 === 0) {
        const raw = oldShape(JSON.parse(JSON.stringify(g)));
        localStorage.setItem('fantasy-life:old', JSON.stringify(raw));
        g = load('old');
        check(g, `${where} old save`);
      }
    } catch (e) {
      report(stackKey(e), where);
      if (verbose) console.log(e);
      // 같은 상태로 다시 터지지 않게 장면을 비우고 넘어간다
      g.pendingEvent = null;
      if (L(g)) { L(g).scene = null; L(g).queue = []; }
    }
  }
  if (verbose) console.log(`run ${run} ${fam} 끝: 나이 ${playerAge(g)} 대 ${lives} 해 ${g.date.year} 죽음 ${me(g).deathCause ?? me(g).cause ?? ''} over=${g.over}`);
}

// 내 장면(관계·범죄·다른 나라·종족)을 이상한 상황에서 억지로 띄우고 선택지를 하나씩 고른다
const MY_SCENES = ['arrest', 'witness_blackmail', 'thugs', 'bounty_hunters', 'gang_offer', 'gang_contract', 'gang_turf', 'gang_takeover', 'gang_rescue',
  'border', 'caught_illegal', 'realm_office', 'realm_inquisitor', 'realm_spy', 'realm_slaves', 'realm_raid', 'realm_forbidden', 'city_story', 'race_slight', 'farewell', 'drift',
  'pilgrim_pick', 'pilgrim_end', 'faith_convert', 'faith_sect', 'faith_sect_task', 'faith_high', 'faith_inquisition', 'dawn_invite', 'dawn_task',
  'court_offer', 'court_patron', 'court_marriage', 'court_plot', 'court_strike', 'court_fall', 'court_turn', 'court_affair'];
const STATES = ['plain', 'jailed', 'travel', 'broke', 'dead', 'old', 'child', 'heir'];
const PLACES_TRY = ['ern', 'harfen', 'leocast', 'eisen', 'solaris', 'serenia', 'barka', 'graubel', 'silverleaf', 'hammer', 'fur', 'estella'].filter((p) => PLACES[p]);
let forced = 0;
for (const [si, kind] of MY_SCENES.entries()) {
  for (const [sti, st] of STATES.entries()) {
    for (let choice = 0; choice < 8; choice++) {
      const seed = 70000 + si * 101 + sti * 13 + choice;
      const famId = FAMILIES[(si + sti + choice) % FAMILIES.length].id;
      const where = `${kind} state=${st} choice=${choice} ${famId}`;
      let g;
      try {
        g = newGame({ name: '깨기', sex: choice % 2 ? 'm' : 'f', familyId: famId, mode: 'free', seed });
        me(g).ageMonths = (st === 'child' ? 9 : 26) * 12;
        const side = makeRng({ s: seed });
        // 몇 달 살려서 아는 사람과 상태를 만든다
        for (let m = 0; m < 6; m++) { endMonth(g, Array(slotsFor(g)).fill(0).map(() => ({ id: side.pick(availableActions(g).filter((a) => !a.needsTarget)).id }))); for (let k = 0; k < 4 && g.pendingEvent; k++) resolveEvent(g, rngOf(g), 0); }
        L(g).place = side.pick(PLACES_TRY); L(g).travel = null;
        const known = knownPeople(g).filter((p) => p.alive);
        const v = side.pick(known) ?? g.people.find((p) => !p.isPlayer && p.alive);
        const gangId = side.pick(Object.keys(GANGS));
        if (st === 'jailed') jail(g, 3);
        if (st === 'travel') L(g).travel = { to: 'harfen', left: 2, from: L(g).place };
        if (st === 'broke') g.player.money = 0;
        if (st === 'dead' && v) v.alive = false;
        if (st === 'old') { localStorage.setItem('fantasy-life:old', JSON.stringify(oldShape(JSON.parse(JSON.stringify(g))))); g = load('old'); }
        if (st === 'heir') { me(g).childIds = []; }
        const gangScene = kind.startsWith('gang') && kind !== 'gang_contract';
        const data = { id: gangScene ? gangId : st === 'dead' ? v?.id : side.chance(0.2) ? 999999 : v?.id, target: v?.id, pay: 40, crime: side.pick(Object.keys(CRIMES)), why: side.pick(['gang', 'blackmail']), gang: gangId,
          total: 50, to: side.pick(['valhart', 'holy', 'serenia', 'free', 'march', 'elf', 'dwarf', 'beast', 'leonia']), back: side.pick(['ern', 'harfen', undefined]), place: side.pick(['eisen', 'solaris', 'serenia', 'barka', 'graubel', 'silverleaf', 'hammer', 'fur']), step: side.int(0, 1), sect: side.pick(['orthodox', 'saint', 'purge']), line: side.int(0, 9), hunter: side.chance(0.3), n: 1 };
        if (kind.startsWith('court_')) {
          const hs = (g.history?.houses ?? []).filter((h) => !h.fallen);
          Object.assign(data, { house: side.chance(0.15) ? 'gone' : side.pick(hs)?.id, step: side.pick(['pick', 'how']), level: side.int(0, 3), won: side.chance(0.5), affair: side.int(0, 4), why: side.pick(['poison', 'heat', 'lost']) });
          if (st !== 'child') { L(g).renown = 50; g.court = g.court ?? {}; g.court.standing = side.int(0, 90); }
        }
        L(g).queue = []; L(g).scene = null; g.pendingEvent = null;
        if (!showScene(g, { kind, ...data })) continue;
        forced++;
        check(g, where);
        if (choice >= g.pendingEvent.choices.length) { L(g).scene = null; g.pendingEvent = null; continue; }
        const out = resolveEvent(g, rngOf(g), choice);
        if (bad(typeof out === 'string' ? out : '')) report(`bad outcome ${kind}`, `${where}: ${out}`);
        // 그 뒤 몇 달 더 굴려 본다
        for (let m = 0; m < 3 && !g.over; m++) {
          const acts = availableActions(g);
          if (slotsFor(g) > 0 && !acts.length) { report(`no actions after ${kind}`, where); break; }
          endMonth(g, Array(slotsFor(g)).fill(0).map(() => ({ id: acts[0].id })));
          for (let k = 0; k < 4 && g.pendingEvent; k++) { check(g, where); resolveEvent(g, rngOf(g), 0); }
        }
      } catch (e) { report(stackKey(e), where); if (verbose) console.log(e); }
    }
  }
}
console.log('억지로 띄운 장면:', forced);

// 관계 사건: 사건이 뜬 뒤 고르기 전에 그 사람이 죽거나 사라지거나, 저장을 다시 불러와도 견디나
let relForced = 0;
const MY_EVENTS = EVENTS.filter((e) => /^(talk_|rel_)/.test(e.id));
for (let run = 0; run < 40; run++) {
  const g0 = newGame({ name: '관계', sex: run % 2 ? 'm' : 'f', familyId: FAMILIES[run % FAMILIES.length].id, mode: 'free', seed: 81000 + run });
  const side = makeRng({ s: 81000 + run });
  const ageTo = [8, 14, 19, 25, 34, 50][run % 6];
  try {
    while (playerAge(g0) < ageTo && !g0.over) {
      endMonth(g0, Array(slotsFor(g0)).fill(0).map(() => { const a = side.pick(availableActions(g0)); return { id: a.id, target: knownPeople(g0)[0]?.id }; }));
      for (let k = 0; k < 4 && g0.pendingEvent; k++) resolveEvent(g0, rngOf(g0), 0);
    }
  } catch (e) { report(stackKey(e), `rel grow ${run}`); continue; }
  if (g0.over) continue;
  const snap = JSON.stringify(g0);
  for (const e of MY_EVENTS) {
    for (const mode of ['plain', 'kill', 'vanish', 'reload']) {
      const g = JSON.parse(snap);
      runHooks('migrate', g);
      const where = `${e.id} ${mode} run${run} age${playerAge(g)}`;
      try {
        if (e.id.startsWith('talk_')) {
          const kind = e.id.slice(5);
          const cands = knownPeople(g).filter((p) => p.alive && !p.away);
          const p = kind === 'spouse' ? g.people.find((x) => x.id === me(g).spouseId) : side.pick(cands);
          if (p) { g.relations ??= {}; g.relations.talk = { kind, id: p.id, at: g.date.year * 12 + g.date.month - 1 }; }
        }
        let ok = false;
        try { ok = !!e.cond(g); } catch { ok = false; }
        if (!ok) continue;
        const ctx = e.prepare ? e.prepare(g, rngOf(g)) ?? {} : {};
        const shown = e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.show || c.show(g, ctx));
        g.pendingEvent = { id: e.id, title: e.title, text: e.text(g, ctx), choices: shown.map(({ c }) => (typeof c.label === 'function' ? c.label(g, ctx) : c.label)), choiceIdx: shown.map(({ i }) => i), ctx };
        relForced++;
        check(g, where);
        const ids = [...Object.values(ctx).filter((v) => typeof v === 'number'), ...knownPeople(g).map((p) => p.id)];
        if (mode === 'kill') for (const id of ids.slice(0, 6)) { const p = g.people.find((x) => x.id === id && !x.isPlayer); if (p) { p.alive = false; } }
        if (mode === 'vanish') g.people = g.people.filter((x) => x.isPlayer || !ids.slice(0, 6).includes(x.id));
        let gg = g;
        if (mode === 'reload') { localStorage.setItem('fantasy-life:rel', JSON.stringify(g)); gg = load('rel'); }
        const idx = side.int(0, gg.pendingEvent.choices.length - 1);
        const out = resolveEvent(gg, rngOf(gg), idx);
        if (bad(typeof out === 'string' ? out : '')) report(`bad outcome ${e.id}`, `${where}: ${out}`);
        endMonth(gg, Array(slotsFor(gg)).fill(0).map(() => ({ id: availableActions(gg)[0].id })));
        check(gg, where);
      } catch (err) { report(stackKey(err), where); if (verbose) console.log(err); }
    }
  }
}
console.log('관계 사건 억지로:', relForced);
console.log('흔든 것:', JSON.stringify(perturbs));
console.log('장면 수:', Object.keys(scenes).length);
if (!problems.size) { console.log('breaktest: 통과'); process.exit(0); }
for (const [k, v] of [...problems].sort((a, b) => b[1].n - a[1].n)) console.log(`(${v.n}) ${k}\n     ${String(v.detail).slice(0, 220)}`);
console.log(`breaktest: 문제 ${problems.size}가지`);
process.exit(1);
