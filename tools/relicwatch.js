// 성유물이 저 혼자 옮겨 다니는지 본다 (26단계): 플레이어는 쉬기만 하고, 유물마다 옮긴 횟수와 끝자리를 센다. npm test에는 넣지 않는다. node tools/relicwatch.js [판 수] [햇수]
import './lsshim.js';
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { relicState as RS, RELICS } from '../src/relic/index.js';
const RUNS = +(process.argv[2] ?? 6), YEARS = +(process.argv[3] ?? 60);
let tot = 0;
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: 'm', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 99000 + run * 7 });
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
    const acts = availableActions(g);
    endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), 0);
  }
  const S = RS(g); const n = Object.values(S.r).reduce((a, x) => a + x.moves, 0); tot += n;
  console.log(`run ${run}: 옮김 ${n} | ${Object.entries(S.r).map(([id, x]) => `${RELICS[id].name}:${x.holder}${x.place ? '@' + x.place : ''}(${x.moves})`).join(' ')} | 봉인 ${Math.round(g.realm.seal)}`);
}
console.log('avg moves', (tot / RUNS).toFixed(1));
