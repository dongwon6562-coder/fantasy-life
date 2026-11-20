// 개척이 저 혼자 굴러가는지 본다 (23단계): 플레이어는 쉬기만 하고, 개척단·버려짐·개척촌·마을·고을을 센다. npm test에는 넣지 않는다. node tools/frontierwatch.js [판 수] [햇수]
import './lsshim.js';
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { frontierState as FS, SITES } from '../src/frontier/index.js';
const RUNS = +(process.argv[2] ?? 8), YEARS = +(process.argv[3] ?? 60);
const tot = { founded: 0, lost: 0, village: 0, town: 0, city: 0, alive: 0, pop: 0 };
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: 'm', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 95000 + run * 17 });
  const st = { founded: 0, lost: 0, village: 0, town: 0, city: 0 }; const was = {};
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
    const acts = availableActions(g);
    endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
    for (const [id, s] of Object.entries(FS(g).sites)) {
      const w = was[id] ?? 0;
      if (s.stage === 1 && w === 0) st.founded++;
      if (s.stage === 0 && w > 0) st.lost++;
      if (s.stage === 2 && w < 2) st.village++;
      if (s.stage === 3 && w < 3) st.town++;
      if (s.stage === 4 && w < 4) st.city++;
      was[id] = s.stage;
    }
  }
  const S = Object.entries(FS(g).sites).filter(([, s]) => s.stage > 0);
  console.log(`run ${run}: 개척단 ${st.founded} 버려짐 ${st.lost} 개척촌 ${st.village} 마을 ${st.town} 고을 ${st.city} | 남은 곳 ${S.map(([id, s]) => `${s.name ?? SITES[id].land}(${s.stage},${s.pop}명,${s.byName})`).join(' ')} 시대 ${g.realm?.era}`);
  for (const k of Object.keys(st)) tot[k] += st[k];
  tot.alive += S.length; tot.pop += S.reduce((a, [, s]) => a + s.pop, 0);
}
for (const k of Object.keys(tot)) tot[k] = Math.round(tot[k] / RUNS * 10) / 10;
console.log('avg', JSON.stringify(tot));
