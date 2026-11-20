// 큰 공사가 저 혼자 굴러가는지 본다 (24단계): 플레이어는 쉬기만 하고, 시작·멈춤·다시 시작·버려짐·완공을 센다. npm test에는 넣지 않는다. node tools/workswatch.js [판 수] [햇수]
import './lsshim.js';
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { worksState as WS, WORKS } from '../src/works/index.js';
import { travelMonths } from '../src/places.js';
const RUNS = +(process.argv[2] ?? 6), YEARS = +(process.argv[3] ?? 60);
const tot = { start: 0, stall: 0, resume: 0, ruin: 0, done: 0, deaths: 0 };
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: 'm', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 97000 + run * 13 });
  const st = { start: 0, stall: 0, resume: 0, ruin: 0, done: 0, deaths: 0 }; const was = {};
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
    const acts = availableActions(g);
    endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
    for (const [id, w] of Object.entries(WS(g).w)) {
      const p = was[id] ?? 'idle';
      if (p === 'idle' && w.stage === 'building') st.start++;
      if (p === 'building' && w.stage === 'stalled') st.stall++;
      if (p === 'stalled' && w.stage === 'building') st.resume++;
      if (p === 'stalled' && w.stage === 'idle') st.ruin++;
      if (p !== 'done' && w.stage === 'done') st.done++;
      was[id] = w.stage;
    }
  }
  st.deaths = Object.values(WS(g).w).reduce((a, w) => a + w.deaths, 0);
  console.log(`run ${run}: ${JSON.stringify(st)} | ${Object.entries(WS(g).w).map(([id, w]) => `${WORKS[id].kind}:${w.stage[0]}${Math.round(w.progress / WORKS[id].need * 100)}`).join(' ')} | 왕도-하르펜 ${travelMonths('leocast', 'harfen')} 시대 ${g.realm?.era}`);
  for (const k of Object.keys(st)) tot[k] += st[k];
}
for (const k of Object.keys(tot)) tot[k] = Math.round(tot[k] / RUNS * 10) / 10;
console.log('avg', JSON.stringify(tot));
