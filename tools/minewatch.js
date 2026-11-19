// 광산이 저 혼자 굴러가는지 본다 (21단계): 플레이어는 쉬기만 하고, 붕괴·죽음·파업·깨운 것·시세를 센다. npm test에는 넣지 않는다. node tools/minewatch.js [판 수] [햇수]
import './lsshim.js';
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { mineState as MS } from '../src/mine/index.js';
const RUNS = +(process.argv[2] ?? 8), YEARS = +(process.argv[3] ?? 60);
const tot = { collapses: 0, dead: 0, strikes: 0, awoke: 0, deepened: 0 };
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: 'm', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 93000 + run * 17 });
  let strikes = 0, awoke = 0; const was = {};
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
    const acts = availableActions(g);
    endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
    for (const [id, s] of Object.entries(MS(g).sites)) { const k = `${!!s.strike}${!!s.awoke}`; if (was[id] !== k) { if (s.strike && !was[id]?.startsWith('true')) strikes++; if (s.awoke && !was[id]?.endsWith('true')) awoke++; } was[id] = k; }
  }
  const S = MS(g), sites = Object.values(S.sites);
  const c = sites.reduce((a, s) => a + s.collapses, 0), d = sites.reduce((a, s) => a + s.dead, 0);
  console.log(`run ${run}: 붕괴 ${c} 죽음 ${d} 파업 ${strikes} 깨움 ${awoke} 깊이 ${sites.map((s) => s.depth).join('/')} 광맥 ${sites.map((s) => Math.round(s.vein)).join('/')} 불만 ${sites.map((s) => Math.round(s.unrest)).join('/')} 시세 ${Object.values(S.price).map((v) => v.toFixed(2)).join('/')}`);
  tot.collapses += c; tot.dead += d; tot.strikes += strikes; tot.awoke += awoke;
}
for (const k of Object.keys(tot)) tot[k] = Math.round(tot[k] / RUNS * 10) / 10;
console.log('avg', JSON.stringify(tot));
