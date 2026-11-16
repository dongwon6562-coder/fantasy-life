// 화면용: 내기와 겨루기의 모든 것을 한 번에.
import { C, mi, here, placeName, itchWord, bannedAt } from './core.js';
import { ARENAS, ARENA_TIERS, tierOf } from './arena.js';
import { FAIRS, fairHere } from './fair.js';
import { stakes, cardOdds } from './gamble.js';

export function contestStatus(g) {
  const c = C(g), pl = here(g), fid = fairHere(g);
  return {
    gamble: { won: c.won, lost: c.lost, net: c.won - c.lost, games: c.games, best: c.best, worst: c.worst, itch: Math.round(c.itch), itchWord: itchWord(c.itch), stakes: stakes(g), cardOdds: Math.round(cardOdds(g) * 100), bannedHere: bannedAt(g, 'gamble') },
    arena: { ...c.arena, tier: tierOf(g), tierName: ARENA_TIERS[tierOf(g)], here: !!ARENAS[pl], bannedHere: bannedAt(g, 'arena') },
    fair: fid ? { id: fid, name: FAIRS[fid].name, fee: FAIRS[fid].fee, bannedHere: bannedAt(g, 'fair') } : null,
    titles: c.titles.map((t) => ({ ...t })),
    past: (c.past ?? []).map((t) => ({ ...t })),
    oldTitles: c.old ?? 0,
    fixed: c.fixed.length, exposed: c.fixed.filter((x) => x.exposed).length,
    banned: Object.entries(c.banned).filter(([, until]) => until > mi(g)).map(([k, until]) => { const [what, p] = k.split(':'); return { what, place: p, placeName: placeName(p), months: until - mi(g) }; }),
    calendar: Object.entries(FAIRS).map(([id, f]) => ({ id, name: f.name, months: [...f.months], places: f.places.map((p) => ({ place: p, name: placeName(p) })) })),
    log: c.log.slice(0, 12),
  };
}
