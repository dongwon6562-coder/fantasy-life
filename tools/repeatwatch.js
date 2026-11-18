import '../src/content.js';
// 같은 장면 덜 되풀이하기 (18단계 헤드): 여러 삶을 무작위로 살며 한 삶 안에서 같은 사건·장면·글이 몇 번 되풀이되는지 센다.
// npm test에는 넣지 않는다. 직접 실행: node tools/repeatwatch.js [판 수]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';

const N = +(process.argv[2] ?? 20);
const fams = ['farmer', 'fallen_knight', 'merchant'];
const byKey = {}, lives = [], textRep = {}, perLifeMax = {};
for (let run = 0; run < N; run++) {
  const g = newGame({ name: '점검', sex: run % 2 ? 'm' : 'f', familyId: fams[run % 3], mode: 'once', seed: 61000 + run * 11 });
  const cnt = {}, txt = {};
  let months = 0;
  for (let m = 0; m < 12 * 120 && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      let a = rng.pick(acts.filter((x) => x.id !== 'travel' && !/move/.test(x.id)));
      if (!a || g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? acts[0];
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id;
      choices.push(c);
    }
    endMonth(g, choices); months++;
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) {
      const pe = g.pendingEvent;
      const k = pe.id === 'life_scene' ? `장면:${L(g).scene?.kind}` : pe.id;
      cnt[k] = (cnt[k] ?? 0) + 1;
      const t = (pe.text ?? '').slice(0, 60);
      const tk = `${k}|${t}`;
      txt[tk] = (txt[tk] ?? 0) + 1;
      resolveEvent(g, rngOf(g), rngOf(g).int(0, pe.choices.length - 1));
    }
  }
  lives.push(months / 12);
  for (const [k, v] of Object.entries(cnt)) { byKey[k] = (byKey[k] ?? 0) + v; perLifeMax[k] = Math.max(perLifeMax[k] ?? 0, v); }
  for (const [k, v] of Object.entries(txt)) if (v >= 3) textRep[k] = Math.max(textRep[k] ?? 0, v);
}
const yrs = lives.reduce((a, b) => a + b, 0);
console.log(`${N}판, 평균 ${(yrs / N).toFixed(0)}년`);
console.log('— 한 삶에 평균 몇 번 (상위 30)  [한 삶 최다]');
console.log('— 장면이 아닌 사건만 (상위 30)');
for (const [k, v] of Object.entries(byKey).filter(([k]) => !k.startsWith('장면:') && !k.startsWith('duel_')).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`${(v / N).toFixed(1).padStart(6)}  ${String(perLifeMax[k]).padStart(4)}  ${k}`);
for (const [k, v] of Object.entries(byKey).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`${(v / N).toFixed(1).padStart(6)}  ${String(perLifeMax[k]).padStart(4)}  ${k}`);
console.log('— 똑같은 글이 한 삶에 세 번 넘게 (상위 30)');
for (const [k, v] of Object.entries(textRep).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`${String(v).padStart(4)}  ${k}`);
