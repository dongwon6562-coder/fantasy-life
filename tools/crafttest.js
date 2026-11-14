import '../src/content.js';
// 생산직(농사·요리·대장일·약초·장사)을 브라우저 없이 돌려 보는 점검.
// 갈래마다 몇 사람을 스무 살에 그 일에 앉히고 30년 동안 주로 일만 시킨다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { takeJob } from '../src/jobs.js';
import { TRADES, C, craftStatus, skillOf, gradeOf } from '../src/craft/core.js';

const verbose = process.argv.includes('-v');
let problems = 0;
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const seen = { scenes: new Set(), orders: {}, ordersDone: 0, ordersFailed: 0, masterworks: [], famed: 0, grades: {}, income: {} };
const samples = [];
const PLACE = { farming: 'ern', cooking: 'harfen', smithing: 'harfen', herbs: 'ern', trade: 'harfen' };

function month(g) {
  const rng = rngOf(g);
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = acts.find((x) => x.id === 'work');
    if (!a || rng.chance(0.25)) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    if (g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? a;
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) {
    if (bad(r.text)) { problems++; console.log('bad result', r); }
    if (/걸작|이름을 새겼다/.test(r.text) && samples.length < 30) samples.push(r.text);
  }
  for (const n of g.news) if (bad(n.text)) { problems++; console.log('bad news', n); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 3) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    if (s) seen.scenes.add(s.kind);
    if (bad(pe.text) || pe.choices.some(bad)) { problems++; console.log('bad scene', pe.title, pe.text); }
    const idx = s?.kind === 'craft_order' ? (rngOf(g).chance(0.8) ? 0 : 1) : s?.kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (bad(out)) { problems++; console.log('bad scene text', pe.title, out); }
    if (s && ['harvest', 'craft_order', 'granary'].includes(s.kind) && samples.length < 30) samples.push(`[${pe.title}] ${out}`);
  }
  if (!Number.isFinite(g.player.money) || g.player.money < 0) { problems++; console.log('bad money', g.player.money); }
}

for (const trade of Object.keys(TRADES)) {
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '장인', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant'][run % 2], mode: 'free', seed: 12000 + run * 13 + trade.length });
    while (playerAge(g) < 16 && !g.over) month(g);
    if (g.over) continue;
    const life = L(g);
    life.place = PLACE[trade]; life.travel = null; life.home = trade === 'farming' || trade === 'herbs' ? 'family' : 'inn';
    if (trade === 'herbs') g.player.skills.herbs = Math.max(g.player.skills.herbs, 16);
    takeJob(g, TRADES[trade].job);
    let ordersBefore = 0;
    const money0 = g.player.money + g.player.familyMoney;
    for (let m = 0; m < 12 * 30 && !g.over; m++) {
      const before = C(g).orders.length;
      month(g);
      const c = C(g);
      if (c.orders.length > before) seen.orders[trade] = (seen.orders[trade] ?? 0) + 1;
      if (m === 60 && trade === 'smithing') g.realm.balhart.war = true;
      if (m % 61 === 0) { const copy = JSON.parse(JSON.stringify(g)); setNextId(copy.nextId); runHooks('migrate', copy); if (!copy.craft || copy.player.skills.smithing == null) { problems++; console.log('migrate lost craft'); } }
      void ordersBefore;
    }
    const c = C(g);
    seen.masterworks.push(...c.masterworks.map((x) => `${TRADES[x.trade].name}:${x.name}`));
    seen.famed += Object.keys(c.famed).length;
    const gr = gradeOf(skillOf(g, trade));
    (seen.grades[trade] ??= []).push(gr);
    (seen.income[trade] ??= []).push(Math.round((g.player.money + g.player.familyMoney - money0) / 30));
    for (const [t, v] of Object.entries(c.fame)) if (!Number.isFinite(v) || v < 0 || v > 100) { problems++; console.log('bad fame', t, v); }
    const st = craftStatus(g);
    if (verbose || run === 0) console.log(`${TRADES[trade].name} #${run} age=${playerAge(g)} over=${g.over} ${st ? `${st.grade}(${st.skill}) 이름값 ${st.fame} ${st.fameWord} · ${st.season} ${st.demandWord}` : '일 없음'} 걸작 ${c.masterworks.length} 곳간 ${c.granary}`);
  }
}

console.log(`장면: ${[...seen.scenes].filter((k) => ['harvest', 'granary', 'craft_order'].includes(k)).join(',')}`);
console.log(`의뢰(갈래별 맡음): ${JSON.stringify(seen.orders)} · 걸작 ${seen.masterworks.length}: ${seen.masterworks.slice(0, 8).join(', ')} · 이름난 장인 ${seen.famed}`);
console.log(`단계(30년 뒤): ${JSON.stringify(seen.grades)}`);
console.log(`해마다 늘어난 돈(대략): ${JSON.stringify(seen.income)}`);
if (verbose) for (const s of samples) console.log('·', s);
for (const k of ['harvest', 'craft_order']) if (!seen.scenes.has(k)) { problems++; console.log('장면이 한 번도 나오지 않음:', k); }
for (const t of Object.keys(TRADES)) if (!seen.orders[t]) { problems++; console.log('의뢰가 한 번도 없음:', t); }
if (!seen.masterworks.length) { problems++; console.log('걸작이 한 번도 나오지 않음'); }
console.log(problems ? `FAIL ${problems}` : 'OK');
if (problems) process.exit(1);
