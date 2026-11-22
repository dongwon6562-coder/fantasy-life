import '../src/content.js';
// 시대 속도 (34단계 헤드): 플레이어는 쉬기만 하고 여러 판을 YEARS년(대 잇기 포함) 돌려
// 발명마다 처음 나온 해(판들의 가운데 값·가장 이른·가장 늦은)와 10년마다 기술 값을 찍는다.
// npm test에는 넣지 않는다. 직접 실행: node tools/erawatch.js [판 수] [햇수]
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { INVENTIONS } from '../src/history/powers.js';

const RUNS = +(process.argv[2] ?? 4), YEARS = +(process.argv[3] ?? 200);
const when = {}; const techAt = [];
for (let run = 0; run < RUNS; run++) {
  const g = newGame({ name: '구경', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 31000 + run * 17 });
  const y0 = g.date.year;
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
    const acts = availableActions(g);
    endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts.find((x) => x.id === 'work') ?? acts[0]).id })));
    let k = 0; while (g.pendingEvent && k++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
    for (const id of g.history?.inventions ?? []) { (when[id] ??= []); if (when[id].length <= run) when[id][run] ??= g.date.year - y0; }
    if (m % 120 === 119) { (techAt[(m + 1) / 120 - 1] ??= []).push((g.realm.tech ?? 0).toFixed(2)); }
  }
}
const med = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : '-'; };
console.log('발명 (처음 나온 해: 가운데 [이른~늦은], 나온 판 수)');
for (const v of INVENTIONS) { const a = (when[v.id] ?? []).filter((x) => x != null); console.log(`  ${v.id.padEnd(12)} at ${String(v.at).padEnd(5)} ${med(a)}년 [${a.length ? Math.min(...a) : '-'}~${a.length ? Math.max(...a) : '-'}] ${a.length}/${RUNS}`); }
console.log('기술 값 (10년마다): ' + techAt.map((a, i) => `${(i + 1) * 10}년 ${a.join('/')}`).join(' · '));
