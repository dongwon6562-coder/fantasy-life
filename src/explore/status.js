// 화면용 한 묶음 (도우미스레드1이 탐험 화면에 쓴다).
import { E, REGIONS, REGION_IDS, SITES, FINDS, CIVS, regionsFrom, regionOf, findName, findValue, FAME_WORD } from './core.js';
import { lostChance, planCost, tripMonths } from './expedition.js';
import { MARKETS, ACADEMIES, priceAt } from './finds.js';
import { L } from '../adventure/core.js';

const findRow = (g, f) => ({ id: f.id, name: findName(f), kind: FINDS[f.id]?.kind, value: findValue(f), civ: FINDS[f.id]?.civ ? CIVS[FINDS[f.id].civ].name : null, region: f.region, regionName: REGIONS[f.region]?.name ?? '', year: f.year, desc: FINDS[f.id]?.desc ?? '', keep: FINDS[f.id]?.keep?.text ?? null, curse: FINDS[f.id]?.curse?.text ?? null });

export function exploreStatus(g) {
  const e = E(g);
  const x = e.exp;
  const place = L(g).place;
  return {
    onExpedition: !!x,
    expedition: x ? {
      region: x.region, regionName: REGIONS[x.region].name, phase: x.phase, leg: x.leg, legs: x.legs, back: x.back,
      food: x.food, porters: x.porters, morale: Math.round(x.morale), lost: !!x.lost, hungry: x.hungry > 0,
      lostChance: Math.round(lostChance(g) * 100), months: x.months, finds: x.finds.map(findName), sites: x.sites.map((s) => SITES[s]?.name ?? s), dead: x.dead.slice(), comps: x.comps.slice(),
    } : null,
    regions: REGION_IDS.map((id) => {
      const R = REGIONS[id];
      const k = e.regions[id] ?? { mapped: 0, trips: 0, heart: false };
      return {
        id, name: R.name, desc: R.desc, civ: CIVS[R.civ].name, from: R.from.slice(), legs: R.legs, months: tripMonths(R), sea: !!R.sea,
        mapped: Math.round(k.mapped * 100), trips: k.trips, heart: k.heart,
        sites: [...R.sites, R.heart].map((s) => ({ id: s, name: SITES[s].name, heart: !!SITES[s].heart, first: e.firsts[s] ? { who: e.firsts[s].who, me: !!e.firsts[s].me, family: !!e.firsts[s].family, name: e.firsts[s].name, year: e.firsts[s].year } : null })),
      };
    }),
    canPlanHere: regionsFrom(place).map((id) => ({ id, name: REGIONS[id].name, full: planCost(g, id, true), light: planCost(g, id, false) })),
    firsts: Object.entries(e.firsts).filter(([, f]) => f.me || f.family).map(([s, f]) => ({ site: s, name: f.name, oldName: SITES[s]?.name ?? s, year: f.year, family: !!f.family })),
    pack: e.pack.map((f) => ({ ...findRow(g, f), price: MARKETS[place] != null ? priceAt(g, f) : null })),
    cache: e.cache.map((f) => findRow(g, f)),
    given: e.given.map((f) => ({ name: findName(f), to: f.to, year: f.year })),
    market: MARKETS[place] != null, academy: ACADEMIES[place]?.name ?? null,
    sold: e.sold, trips: e.trips, lostMonths: e.lostMonths,
    fame: Math.round(e.fame), fameWord: FAME_WORD(e.fame),
    fallen: e.fallen.slice(-8),
    rivals: e.rivals.map((r) => ({ name: r.name, leader: r.leader, region: REGIONS[r.region]?.name ?? '', alive: r.alive })),
    log: e.log.slice(-12),
  };
}
