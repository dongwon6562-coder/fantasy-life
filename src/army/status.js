// 화면용 한 묶음 (도우미스레드1이 군대 화면에 쓴다).
import { L } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { leadership } from '../war/battle.js';
import { A, RANKS, RANK_KIND, MERIT, SCARS } from './core.js';
import { warsForArmy } from './campaign.js';

export function armyStatus(g) {
  const a = A(g);
  const s = a.service;
  const c = a.campaign;
  return {
    enlisted: !!s,
    service: s ? {
      unit: s.unit, rank: s.rank, rankName: RANKS[s.rank], kind: RANK_KIND[s.rank],
      merit: Math.round(s.merit), nextMerit: MERIT[s.rank + 1] ?? null, months: s.months, termLeft: Math.max(0, s.term),
      place: s.place, placeName: PLACES[s.place]?.name ?? '', awol: s.awol,
    } : null,
    campaign: c ? { name: c.name, month: c.month, months: c.months, morale: Math.round(c.morale), peace: c.kind === 'peace' } : null,
    captive: a.captive ? { by: a.captive.by, months: a.captive.months, ransom: a.captive.ransom, officer: a.captive.officer } : null,
    deserter: !!(a.deserted && !a.deserted.caught), desertedYear: a.deserted?.year ?? null,
    veteran: a.veteran ? { ...a.veteran, rankName: RANKS[a.veteran.rank] } : null,
    scars: a.scars.map((x) => ({ name: x.name, year: x.year, mind: !!SCARS[x.id]?.mind })),
    medals: a.medals.map((m) => ({ ...m })),
    battles: a.battles, won: a.won, campaigns: a.campaigns,
    comrades: a.comrades.map((m) => ({ ...m })),
    wars: warsForArmy(g).map((w) => w.name),
    leadership: Math.round(leadership(g)),
    renown: L(g).renown,
    log: a.log.slice(-12),
  };
}
