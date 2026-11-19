// 잠든 용이 저 혼자 굴러가는지 본다 (20단계): 플레이어는 쉬기만 하고, 깨어남·불·원정대·숭배자 세를 센다. npm test에는 넣지 않는다. node tools/dragonwatch.js [판 수] [햇수]
import './lsshim.js';
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { dragonState as DS } from '../src/dragon/index.js';
const RUNS = +(process.argv[2] ?? 8), YEARS = +(process.argv[3] ?? 60);
const tot = { wakes: 0, burns: 0, stole: 0, sent: 0, stir: 0, cult: 0, youngDead: 0, north: 0, minSleep: 0 };
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: 'm', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 91000 + run * 17 });
  let stirM = 0;
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) choices.push({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id });
    endMonth(g, choices);
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
    const S = DS(g);
    if (Object.values(S.dragons).some((d) => d.state === 'stir')) stirM++;
  }
  const S = DS(g);
  const w = Object.values(S.dragons).reduce((a, d) => a + d.wakes, 0);
  const north = Object.values(S.dragons).reduce((a, d) => a + (d.north ?? 0), 0);
  console.log(`run ${run}: wakes ${w} burns ${S.burns ?? 0} seekers ${JSON.stringify(S.seekers)} stirMonths ${stirM} cult ${Math.round(S.cult.power)} young ${S.dragons.young.state} sleeps ${['ash','frost','blind','obsidian'].map((k) => Math.round(S.dragons[k].sleep)).join('/')} north ${north} seal ${g.seal?.stage}`);
  tot.wakes += w; tot.burns += S.burns ?? 0; tot.stole += S.seekers.stole; tot.sent += S.seekers.sent; tot.stir += stirM; tot.cult += S.cult.power; tot.youngDead += S.dragons.young.state === 'dead' ? 1 : 0; tot.north += north;
}
for (const k of Object.keys(tot)) tot[k] = Math.round(tot[k] / RUNS * 10) / 10;
console.log('avg', JSON.stringify(tot));
