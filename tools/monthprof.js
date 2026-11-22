// 달 넘기기 한 번에 어느 훅이 시간을 많이 쓰는지 잰다 (헤드, 35단계).
// node tools/monthprof.js [달 수=600] [씨앗=1]
import './lsshim.js';
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { HOOKS } from '../src/hooks.js';
import { FAMILIES } from '../src/data.js';
import { makeRng } from '../src/rng.js';

const MONTHS = Number(process.argv[2]) || 600, SEED = Number(process.argv[3]) || 1;
const cost = new Map();
// 훅마다 시간을 재도록 감싼다
for (const [name, list] of Object.entries(HOOKS)) {
  if (!Array.isArray(list)) continue;
  list.forEach((fn, i) => {
    if (typeof fn !== 'function') return;
    const key = `${name}#${i} ${(fn.name || '').slice(0, 30)} ${String(fn).slice(0, 60).replace(/\s+/g, ' ')}`;
    list[i] = function (...a) { const t = performance.now(); try { return fn.apply(this, a); } finally { const c = cost.get(key) ?? [0, 0]; c[0] += performance.now() - t; c[1]++; cost.set(key, c); } };
  });
}
const g = newGame({ familyId: FAMILIES[0].id, seed: SEED, mode: 'free', name: '재기' });
const rng = makeRng({ s: SEED * 7 });
const t0 = performance.now();
let m = 0;
for (; m < MONTHS && !g.over; m++) {
  const acts = availableActions(g);
  const ch = [];
  for (let i = 0; i < slotsFor(g); i++) ch.push({ id: acts[rng.int(0, acts.length - 1)].id });
  endMonth(g, ch);
  let k = 0;
  while (g.pendingEvent && k++ < 6) resolveEvent(g, rng, rng.int(0, g.pendingEvent.choices.length - 1));
}
const total = performance.now() - t0;
console.log(`${m}달, 한 달 ${(total / m).toFixed(1)}ms, 사람 ${g.people.length}`);
const rows = [...cost].sort((a, b) => b[1][0] - a[1][0]).slice(0, Number(process.env.TOP) || 20);
for (const [k, [ms, n]] of rows) console.log(`${(ms / m).toFixed(2).padStart(7)}ms/달  ${String(n).padStart(6)}번  ${k}`);
