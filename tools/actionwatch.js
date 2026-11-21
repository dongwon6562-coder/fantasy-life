import '../src/content.js';
// 행동 목록 길이 (26단계 헤드): 여러 삶을 살며 나이대별로 한 달에 고를 수 있는 행동 수와, 자주 보이지만 거의 안 고르는 행동을 센다.
// npm test에는 넣지 않는다. 직접 실행: node tools/actionwatch.js [판 수]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';

const N = +(process.argv[2] ?? 8);
const fams = ['farmer', 'fallen_knight', 'merchant'];
const B = (a) => (a < 6 ? '3-5' : a < 10 ? '6-9' : a < 15 ? '10-14' : a < 20 ? '15-19' : a < 35 ? '20-34' : a < 50 ? '35-49' : '50+');
const st = {}, shown = {};
let months = 0;
for (let run = 0; run < N; run++) {
  const g = newGame({ name: '점검', sex: run % 2 ? 'm' : 'f', familyId: fams[run % 3], mode: 'once', seed: 81000 + run * 7 });
  for (let m = 0; m < 12 * 70 && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g)) {
      const b = B(playerAge(g)); (st[b] ??= []).push(acts.length); months++;
      if (playerAge(g) >= 15) for (const a of acts) shown[a.id] = (shown[a.id] ?? 0) + 1;
    }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      let a = rng.pick(acts.filter((x) => x.id !== 'travel' && !x.crime && !/^(heist|spy|revolt|herd_rustle|secret_night)/.test(x.id))); // 바르게 사는 사람
      if (!a || g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? acts[0];
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id;
      choices.push(c);
    }
    endMonth(g, choices);
    let k = 0; while (g.pendingEvent && k++ < 8) resolveEvent(g, rngOf(g), rngOf(g).int(0, g.pendingEvent.choices.length - 1));
  }
}
console.log('나이   중간  최대');
for (const b of ['3-5', '6-9', '10-14', '15-19', '20-34', '35-49', '50+']) { const a = (st[b] ?? []).sort((x, y) => x - y); if (a.length) console.log(b.padEnd(6), String(a[a.length >> 1]).padStart(4), String(a.at(-1)).padStart(5)); }
const adult = Object.values(st).flat().length;
console.log('— 15살 넘어 가장 자주 보이는 행동 (보인 달 비율)');
for (const [k, v] of Object.entries(shown).sort((a, b) => b[1] - a[1]).slice(0, 60)) console.log(String(Math.round(100 * v / months)).padStart(4) + '%', k);
