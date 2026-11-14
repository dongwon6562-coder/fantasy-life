// 브라우저 없이 게임을 수십 년 돌려 보는 점검 스크립트.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, circleOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { living } from '../src/npc.js';

const fams = ['farmer', 'fallen_knight', 'merchant'];
let problems = 0;
for (let run = 0; run < 30; run++) {
  const g = newGame({ name: '테스트', sex: run % 2 ? 'm' : 'f', familyId: fams[run % 3], mode: 'once', seed: 1000 + run });
  const evs = new Set();
  for (let m = 0; m < 12 * 25 && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const a = rng.pick(acts);
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive)?.id;
      choices.push(c);
    }
    endMonth(g, choices);
    if (g.pendingEvent) { evs.add(g.pendingEvent.id); resolveEvent(g, rngOf(g), 0); }
    for (const [k, v] of Object.entries(g.player.stats)) if (!Number.isFinite(v)) { problems++; console.log('bad stat', k, v); }
  }
  JSON.parse(JSON.stringify(g));
  if (run < 6) console.log(`#${run} ${fams[run % 3]} age ${playerAge(g)} over=${g.over} pop=${living(g).length} total=${g.people.length} mana=${g.player.mana.toFixed(0)}(${g.player.manaPotential.toFixed(2)}) circle=${circleOf(g)} money=${g.player.money}/${g.player.familyMoney} str=${g.player.stats.str.toFixed(0)} sword=${g.player.skills.sword.toFixed(0)} chron=${g.chronicle.length} events=${[...evs].join(',')}`);
}
console.log(problems ? `FAIL ${problems}` : 'OK');
