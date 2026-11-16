// 장면 밀림 점검: 여러 갈래 장면이 쌓여 몇 달씩 늦게 뜨지 않는지 본다 (한 달 여러 장면 이어 띄우기, 묵은 장면 버리기).
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf, playerAge } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
let qsum = 0, n = 0, qmax = 0, shown = 0, waits = [];
for (let run = 0; run < 3; run++) {
  const g = newGame({ name: 'q', sex: 'm', familyId: ['farmer','merchant','fallen_knight'][run%3], mode: 'free', seed: 81000 + run });
  for (let m = 0; m < 12 * 30 && !g.over; m++) {
    const rng = rngOf(g); const acts = availableActions(g); const ch = [];
    for (let i = 0; i < slotsFor(g); i++) { let a = rng.pick(acts); if (g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? a; const c = { id: a.id }; if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id; ch.push(c); }
    for (const s of L(g).queue) s._t ??= m;
    endMonth(g, ch);
    for (const s of L(g).queue) s._t ??= m;
    let guard = 0;
    while (g.pendingEvent && guard++ < 8) { const s = L(g).scene; if (s) { shown++; if (s._t != null) waits.push(m - s._t); } resolveEvent(g, rngOf(g), Math.floor(rngOf(g).next() * g.pendingEvent.choices.length)); }
    if (playerAge(g) >= 15) { qsum += L(g).queue.length; n++; qmax = Math.max(qmax, L(g).queue.length); }
  }
}
waits.sort((a,b)=>a-b);
const med = waits[waits.length >> 1], p90 = waits[Math.floor(waits.length * 0.9)];
console.log(`대기열 평균 ${(qsum/n).toFixed(2)} 최대 ${qmax} 본 장면 ${shown} 기다린 달 중간 ${waits[waits.length>>1]} 90% ${waits[Math.floor(waits.length*0.9)]} 최대 ${waits.at(-1)}`);
let bad = 0;
if (med > 1) { bad++; console.log('FAIL 기다린 달 중간값', med); }
if (p90 > 2) { bad++; console.log('FAIL 기다린 달 90%', p90); }
if (waits.at(-1) > 7) { bad++; console.log('FAIL 묵은 장면이 버려지지 않음', waits.at(-1)); }
console.log(bad ? `FAIL ${bad}` : 'OK');
process.exit(bad ? 1 : 0);
