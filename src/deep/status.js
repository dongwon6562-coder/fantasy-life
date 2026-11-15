// 화면용: 깊은 구렁과 관련된 지금 상태 (도우미스레드1이 화면에 쓴다).
import { L } from '../adventure/core.js';
import { D, FLOORS, STRATA, stratumOf, RELICS, charmBonus } from './core.js';
import { supplyCost, gatesOpen, sellValue } from './delve.js';

export function deepStatus(g) {
  const d = D(g);
  const here = L(g).place === 'gorge' && !L(g).travel;
  return {
    here,
    floors: FLOORS,
    strata: STRATA.map((s, i) => ({ name: s.name, from: s.from, to: s.from + 4, guard: s.guard.enc.leader })),
    gate: d.gate,
    gates: gatesOpen(g).map((f) => ({ floor: f, cost: supplyCost(f) })),
    deepest: d.deepest,
    nextStratum: d.gate >= FLOORS ? null : stratumOf(d.gate + 1).name,
    runs: d.runs,
    ore: d.ore,
    relics: d.relics.map((r, i) => ({ i, id: r.id, known: !!r.known, name: r.known ? RELICS[r.id].name : '이름 모를 물건', kind: r.known ? RELICS[r.id].kind : null, cursed: r.known ? !!RELICS[r.id].curse : null, value: r.known ? sellValue(g, RELICS[r.id]) : null })),
    charms: d.charms.map((id) => ({ id, name: RELICS[id]?.name ?? '' })),
    hazardBonus: charmBonus(g, 'hazard'),
    guide: !!d.guide,
    ally: d.ally ? d.ally.name : null,
    lord: d.lord,
    lordBy: d.lordBy,
    atThrone: d.gate >= FLOORS,
    record: { ...d.record },
    rivals: d.rivals.map((r) => ({ name: r.name, leader: r.leader, race: r.race, depth: r.depth, best: r.best, alive: r.alive })),
  };
}
