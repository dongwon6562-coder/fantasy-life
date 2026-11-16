// 나이대마다 삶이 고른지 본다: 조용한 달, 해마다 사건·장면 수, 사건 종류. 어른 삶에서 세상 사건이 장면에 밀려 사라지지 않는지(헤드 15단계).
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf, playerAge } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
const bands = [[0, 2], [3, 6], [7, 11], [12, 15], [16, 25], [26, 40], [41, 55], [56, 90]];
const st = bands.map(() => ({ m: 0, quiet: 0, ev: 0, sc: 0, acts: 0, kinds: new Set() }));
for (let run = 0; run < 4; run++) {
  const g = newGame({ name: 'a', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 93000 + run * 7 });
  for (let m = 0; m < 12 * 75 && !g.over; m++) {
    const age = playerAge(g); const b = bands.findIndex(([a, z]) => age >= a && age <= z); const S = st[b];
    const rng = rngOf(g); const acts = availableActions(g); const ch = [];
    S.acts += acts.length;
    for (let i = 0; i < slotsFor(g); i++) { let a = rng.pick(acts.filter((x) => !x.needsTarget)); if (g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? a; ch.push({ id: a.id }); }
    endMonth(g, ch);
    S.m++; let any = false; let gd = 0;
    while (g.pendingEvent && gd++ < 8) { any = true; if (g.pendingEvent.id === 'life_scene') { S.sc++; } else { S.ev++; S.kinds.add(g.pendingEvent.id); } resolveEvent(g, rngOf(g), rngOf(g).int(0, g.pendingEvent.choices.length - 1)); }
    if (!any) S.quiet++;
  }
}
bands.forEach(([a, z], i) => { const S = st[i]; if (!S.m) return; console.log(`${a}~${z}살: ${S.m}달, 조용한 달 ${(100 * S.quiet / S.m).toFixed(0)}%, 해마다 사건 ${(12 * S.ev / S.m).toFixed(1)} 장면 ${(12 * S.sc / S.m).toFixed(1)}, 사건 종류 ${S.kinds.size}, 고를 행동 ${(S.acts / S.m).toFixed(0)}개`); });
let bad = 0;
st.forEach((S, i) => {
  const [a] = bands[i]; if (!S.m) return;
  const evY = 12 * S.ev / S.m;
  if (a >= 16 && evY < 2.5) { bad++; console.log(`FAIL ${a}살대 세상 사건이 너무 적다 ${evY.toFixed(1)}`); }
  if (a >= 3 && a < 16 && S.quiet / S.m > 0.75) { bad++; console.log(`FAIL ${a}살대 조용한 달이 너무 많다`); }
});
console.log(bad ? `FAIL ${bad}` : 'OK');
process.exit(bad ? 1 : 0);
