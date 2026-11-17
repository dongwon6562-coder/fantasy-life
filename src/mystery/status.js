// 화면용: 풀리지 않은 일의 모든 것을 한 번에.
import { M, KINDS, here, placeName, openHere, kindName, caseTitle } from './core.js';

const view = (c) => ({
  id: c.id, kind: c.kind, kindName: kindName(c), place: c.place, placeName: placeName(c.place), year: c.year, victim: c.victim, title: caseTitle(c), state: c.state, by: c.by ?? null,
  suspects: c.suspects.map((s) => ({ name: s.name, role: s.role, motive: s.motive, cleared: !!s.cleared, pointed: !!s.pointed })),
  clues: [...(c.clues ?? [])], heat: c.heat ?? 0,
});

export function mysteryStatus(g) {
  const m = M(g), c = openHere(g);
  return {
    here: c ? view(c) : null,
    open: m.cases.map(view),
    cold: m.cold.map((x) => ({ ...view(x), accused: x.accused ?? null, exposed: !!x.exposed, ancestor: !!x.ancestor, culprit: x.exposed || x.state === 'cleared' ? x.culprit ?? null : null })),
    solved: m.solved, wrong: m.wrong, framed: m.framed, dropped: m.dropped, oldSolved: m.oldSolved,
    kinds: Object.entries(KINDS).map(([id, k]) => ({ id, name: k.name })),
    place: here(g), log: m.log.slice(0, 12),
  };
}
