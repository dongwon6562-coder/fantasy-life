// 마나가 저 혼자 출렁이는지 본다 (25단계): 플레이어는 쉬기만 하고, 마나의 높낮이·폭풍·샘 주인 바뀜·마름·마물 기세를 잰다. npm test에는 넣지 않는다. node tools/manawatch.js [판 수] [햇수]
import './lsshim.js';
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { manaState as MS } from '../src/mana/index.js';
const RUNS = +(process.argv[2] ?? 4), YEARS = +(process.argv[3] ?? 60);
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: 'm', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 98000 + run * 11 });
  const st = { storms: 0, seized: 0, dry: 0, hi: 0, lo: 0 }; const line = [];
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
    const acts = availableActions(g);
    endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
    const S = MS(g);
    if (S.tide >= 45) st.hi++; if (S.tide <= -45) st.lo++;
    if (m % 60 === 0) line.push(`${S.tide}/${Math.round(g.realm.monsters)}`);
  }
  const S = MS(g);
  for (const w of Object.values(S.wells)) { st.storms += w.storms; st.seized += w.seized; st.dry += w.dry ? 1 : 0; }
  console.log(`run ${run}: ${JSON.stringify(st)} | 마나/마물 5년마다 ${line.join(' ')} | 주인 ${Object.values(S.wells).map((w) => w.holder).join(',')}`);
}
