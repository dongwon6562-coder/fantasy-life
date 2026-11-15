import './lsshim.js';
import '../src/content.js';
// 옛 저장 점검: 예전 판(8단계 무렵)이 만든 저장 묶음을 지금 코드로 불러와 몇 해 더 산다.
// 묶음은 tools/fixtures/oldsaves.json (헤드가 단계마다 하나씩 더할 수 있다).
import fs from 'fs';
import { endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { load } from '../src/save.js';

const saves = JSON.parse(fs.readFileSync(new URL('./fixtures/oldsaves.json', import.meta.url)));
let fail = 0;
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object/.test(t);
saves.forEach((text, i) => {
  localStorage.setItem('fantasy-life:old' + i, text);
  let g;
  try { g = load('old' + i); } catch (e) { fail++; console.log('FAIL load', i, e.message); return; }
  if (!g) { fail++; console.log('FAIL load null', i); return; }
  try {
    for (let m = 0; m < 36 && !g.over; m++) {
      const rng = rngOf(g); const acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => { const a = rng.pick(acts); const c = { id: a.id }; if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id; return c; }));
      for (const r of g.lastResults ?? []) if (bad(r.text)) { fail++; console.log('FAIL text', i, r.name, r.text); }
      let k = 0; while (g.pendingEvent && k++ < 6) { const out = resolveEvent(g, rngOf(g), rngOf(g).int(0, g.pendingEvent.choices.length - 1)); if (bad(typeof out === 'string' ? out : '')) { fail++; console.log('FAIL outcome', i, out); } }
    }
  } catch (e) { fail++; console.log('FAIL play', i, e.stack.split('\n').slice(0, 3).join(' | ')); }
});
console.log(fail ? `oldsavetest: ${fail} 실패` : `oldsavetest: 통과 (옛 저장 ${saves.length}개)`);
process.exit(fail ? 1 : 0);
