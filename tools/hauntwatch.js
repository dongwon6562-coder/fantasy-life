// 망자와 저주가 저 혼자 굴러가는지 본다 (22단계): 플레이어는 쉬기만 하고, 흉한 자리·진짜 잔향·망령·풀린 자리를 센다. npm test에는 넣지 않는다. node tools/hauntwatch.js [판 수] [햇수]
import './lsshim.js';
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { hauntState as HS } from '../src/haunt/index.js';
const RUNS = +(process.argv[2] ?? 8), YEARS = +(process.argv[3] ?? 60);
const tot = { spots: 0, real: 0, laid: 0, gone: 0, wraiths: 0, wraithDead: 0, live: 0, maxDread: 0 };
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: 'm', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 94000 + run * 17 });
  const seen = new Set(), stat = { spots: 0, real: 0, laid: 0, gone: 0, wraiths: 0, wraithDead: 0, maxDread: 0 }; const was = {};
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
    const acts = availableActions(g);
    endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
    const H = HS(g);
    for (const [id, s] of Object.entries(H.spots)) {
      if (!seen.has(id)) { seen.add(id); stat.spots++; if (s.real) stat.real++; }
      const k = `${s.state}${s.wraith}`;
      if (was[id] !== k) { if (s.state === 'laid') stat.laid++; if (s.state === 'gone') stat.gone++; if (s.wraith && !was[id]?.endsWith('true')) stat.wraiths++; was[id] = k; }
    }
    stat.maxDread = Math.max(stat.maxDread, ...Object.values(H.dread), 0);
  }
  const H = HS(g);
  stat.wraithDead = Object.values(H.spots).filter((s) => s.wraith || s.hurt).reduce((a, s) => a + s.hurt, 0);
  const live = Object.values(H.spots).filter((s) => s.state === 'quiet' || s.state === 'restless').length;
  console.log(`run ${run}: 자리 ${stat.spots} (진짜 ${stat.real}) 풀림 ${stat.laid} 흩어짐/헛소문 ${stat.gone} 망령 ${stat.wraiths} 다친·죽은 ${stat.wraithDead} 남은 자리 ${live} 최고 흉흉함 ${Math.round(stat.maxDread)} 봉인 ${Math.round(g.realm?.seal ?? 100)}`);
  for (const k of Object.keys(stat)) tot[k] += stat[k];
  tot.live += live;
}
for (const k of Object.keys(tot)) tot[k] = Math.round(tot[k] / RUNS * 10) / 10;
console.log('avg', JSON.stringify(tot));
