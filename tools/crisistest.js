import '../src/content.js';
// 세계의 위기(src/crisis/)를 브라우저 없이 돌려 보는 점검.
// 1) 위기 종류마다 영웅·방관·이용 쪽으로만 고르는 사람을 세워 위기를 처음부터 끝까지 겪게 한다.
// 2) 아무것도 건드리지 않은 일생 몇 번에서 위기가 저절로 오고 끝나는지 본다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { grantFief } from '../src/domain/state.js';
import { CR, CRISES, active, phaseOf, startCrisis, crisisStatus } from '../src/crisis/core.js';

const verbose = process.argv.includes('-v');
let problems = 0;
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const seen = { results: {}, stances: {}, phases: new Set(), natural: {}, battles: 0, deaths: 0 };
const samples = [];

const ARMY_KEYS = ['muster', 'relief', 'enlist', 'levy', 'sally'];
function month(g, want, army = false) {
  const rng = rngOf(g);
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = null;
    if (want === 'hero') a = acts.find((x) => x.id === 'crisis_help');
    if (want === 'use') a = acts.find((x) => x.id === 'crisis_use');
    if (!a || g.player.fatigue > 70 || rng.chance(0.4)) a = acts.find((x) => x.id === (g.player.fatigue > 60 ? 'rest' : 'work')) ?? acts.find((x) => x.id === 'rest') ?? acts[0];
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) if (bad(r.text)) { problems++; console.log('bad result', r); }
  for (const n of g.news) if (bad(n.text)) { problems++; console.log('bad news', n); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 3) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) { problems++; console.log('bad scene', s?.kind, pe.title, pe.text, pe.choices); }
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    const c = active(g);
    if (s?.kind === 'crisis_turn' && c) {
      seen.phases.add(`${c.id}:${phaseOf(c)?.id}`);
      const list = phaseOf(c).choices(g, c);
      const armyPick = army ? list.findIndex((x) => ARMY_KEYS.includes(x.key)) : -1;
      const pick = armyPick >= 0 ? armyPick : want ? list.findIndex((x) => x.stance === want) : -1;
      if (pick >= 0) idx = pick;
    }
    if (s?.kind === 'battle' && s.context === 'crisis') seen.battles++;
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) { problems++; console.log('bad scene text', s?.kind, pe.title, out); }
    if (['crisis_turn', 'battle'].includes(s?.kind) && samples.length < 60) samples.push(`[${pe.title}] ${out}`);
  }
  const st = crisisStatus(g);
  if (st.active && (!Number.isFinite(st.active.sev) || bad(st.active.phaseName) || bad(st.active.sevWord))) { problems++; console.log('bad status', st.active); }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) { problems++; console.log('bad money', g.player.money); }
}

const KINDS = Object.keys(CRISES);
for (const id of KINDS) {
  for (const want of ['hero', 'idle', 'use']) {
    for (let run = 0; run < 3; run++) {
      const g = newGame({ name: '위기', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant'][run % 2], mode: 'free', seed: 41000 + run * 31 + id.length * 7 + want.length });
      while (playerAge(g) < 20 && !g.over) month(g, null);
      if (g.over) continue;
      const life = L(g);
      life.place = 'harfen'; life.travel = null; life.home = 'inn';
      g.player.money += 150;
      g.player.skills.sword = Math.max(g.player.skills.sword, 35);
      if (run === 2) grantFief(g, { name: '시험 영지', place: 'harfen', liege: 'verden', pop: 300 }), g.domain.garrison = 40;
      CR(g).active = null;
      if (id === 'war') g.realm.balhart.war = true, g.realm.balhart.warMonths = 0;
      startCrisis(g, rngOf(g), id);
      let m = 0;
      while (active(g) && m++ < 80 && !g.over) {
        month(g, want, run === 2 && want === 'hero');
        if (m % 13 === 0) {
          const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy);
          if (!copy.crisis?.active || copy.crisis.active.id !== active(g)?.id) { if (active(g)) { problems++; console.log('migrate lost crisis'); } }
        }
      }
      if (g.over) { seen.deaths++; continue; }
      if (active(g)) { problems++; console.log('crisis never ended', id, active(g).phase, active(g).due); continue; }
      const p = CR(g).past.at(-1);
      (seen.results[id] ??= {})[p.result] = (seen.results[id][p.result] ?? 0) + 1;
      (seen.stances[want] ??= {})[p.stance] = (seen.stances[want][p.stance] ?? 0) + 1;
      if (verbose || run === 0) console.log(`${p.name} · ${want} → ${p.stance} · ${p.from}~${p.to} · 깊이 ${p.sev} ${p.result} · 돈 ${g.player.money} 명성 ${Math.round(life.renown)} 악명 ${Math.round(life.notoriety)}`);
    }
  }
}

// 저절로 오는 위기: 아무것도 고르지 않는 일생
for (let run = 0; run < 8; run++) {
  const g = newGame({ name: '평범', sex: run % 2 ? 'm' : 'f', familyId: 'farmer', mode: 'free', seed: 51000 + run * 101 });
  let m = 0;
  while (!g.over && m++ < 12 * 70) month(g, null);
  for (const p of CR(g).past) seen.natural[p.id] = (seen.natural[p.id] ?? 0) + 1;
}

// 옛 저장(위기 없음)
{
  const g = newGame({ name: '옛', sex: 'm', familyId: 'farmer', mode: 'free', seed: 7 });
  delete g.crisis;
  const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy);
  if (!copy.crisis || !Array.isArray(copy.crisis.past)) { problems++; console.log('migrate old save failed'); }
}

const allPhases = KINDS.flatMap((id) => CRISES[id].phases.map((p) => `${id}:${p.id}`));
console.log(`결말: ${JSON.stringify(seen.results)}`);
console.log(`고른 쪽 → 기록된 쪽: ${JSON.stringify(seen.stances)} · 위기 속 전투(지휘) ${seen.battles} · 위기 중 죽음 ${seen.deaths}`);
console.log(`저절로 온 위기(일생 8번, 70년): ${JSON.stringify(seen.natural)} · 단계 ${seen.phases.size}/${allPhases.length}`);
if (verbose) for (const s of samples) console.log('·', s);
for (const id of KINDS) if (!seen.results[id]) { problems++; console.log('끝까지 가 본 적 없는 위기:', id); }
for (const w of ['hero', 'use']) if (!seen.stances[w]?.[w]) { problems++; console.log('그 쪽으로 기록된 적 없음:', w); }
if (!Object.keys(seen.natural).length) { problems++; console.log('저절로 온 위기가 없음'); }
const missing = allPhases.filter((p) => !seen.phases.has(p));
if (missing.length) { problems++; console.log('나오지 않은 단계:', missing.join(',')); }
const heroSaved = Object.values(seen.results).reduce((a, r) => a + (r.saved ?? 0), 0);
if (!heroSaved) { problems++; console.log('한 번도 막아 내지 못함'); }
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
