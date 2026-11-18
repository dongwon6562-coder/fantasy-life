import '../src/content.js';
// 어린 시절 첫 15년 흐름 (19단계 헤드): 나이마다 한 해에 뜨는 사건·장면 수, 아무것도 안 뜬 달, 고를 수 있는 행동 수를 센다.
// npm test에는 넣지 않는다. 직접 실행: node tools/childwatch.js [판 수]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';

const N = +(process.argv[2] ?? 30);
const fams = ['farmer', 'fallen_knight', 'merchant'];
const A = 16, z = () => Array(A).fill(0);
const ev = z(), empty = z(), acts = z(), months = z(), slots = z(), ids = Array.from({ length: A }, () => ({}));
for (let run = 0; run < N; run++) {
  const g = newGame({ name: '아이', sex: run % 2 ? 'm' : 'f', familyId: fams[run % 3], mode: 'once', seed: 47000 + run * 17 });
  for (let m = 0; m < 12 * 16 && !g.over; m++) {
    const age = playerAge(g); if (age >= A) break;
    const rng = rngOf(g);
    const av = availableActions(g);
    acts[age] += av.length; slots[age] += slotsFor(g); months[age]++;
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) choices.push({ id: rng.pick(av).id });
    endMonth(g, choices);
    let n = 0, guard = 0;
    while (g.pendingEvent && guard++ < 6) {
      const pe = g.pendingEvent; const k = pe.id === 'life_scene' ? `장면:${L(g).scene?.kind}` : pe.id;
      ids[age][k] = (ids[age][k] ?? 0) + 1; n++;
      resolveEvent(g, rngOf(g), rngOf(g).int(0, pe.choices.length - 1));
    }
    ev[age] += n; if (!n) empty[age]++;
  }
}
console.log(`${N}판. 나이: 한 해 사건 수 / 빈 달 / 행동 칸 / 고를 행동 수 / 가장 잦은 것`);
for (let a = 0; a < A; a++) {
  const per = Math.max(1, months[a] / 12);
  const top = Object.entries(ids[a]).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k}:${(v / N).toFixed(1)}`).join(' ');
  const kinds = Object.keys(ids[a]).length;
  console.log(`${String(a).padStart(2)}살  ${(ev[a] / per).toFixed(1).padStart(5)}  ${(empty[a] / per).toFixed(1).padStart(5)}  ${(slots[a] / Math.max(1, months[a])).toFixed(1)}  ${(acts[a] / Math.max(1, months[a])).toFixed(1).padStart(5)}  종류 ${String(kinds).padStart(3)}  ${top}`);
}
