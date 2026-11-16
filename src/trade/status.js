// 화면용: 장사 길과 상단의 모든 것을 한 번에.
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import {
  T, GOODS, GOOD_IDS, HOUSE_RANKS, CARAVAN_TOWNS, mi, here, isMarket, cargoList, cargoQty, capacity, upkeep, maxWagons, maxGuards,
  priceAt, buyAt, sellAt, cheapWord, bestKnown, banditChance, tollRate, tollOf,
} from './core.js';
import { houseCompany, houseIncome, canLevel, branchCost, levelCost, levelProfit, FOUND_HOUSE, FOUND_PROFIT, companies } from './house.js';

const placeName = (pl) => PLACES[pl]?.name ?? pl;

export function tradeStatus(g) {
  const t = T(g), pl = here(g), market = isMarket(pl) && !L(g).travel;
  const prices = market ? GOOD_IDS.map((k) => ({ good: k, name: GOODS[k].name, base: GOODS[k].base, price: priceAt(g, pl, k), buy: buyAt(g, pl, k), sell: sellAt(g, pl, k), word: cheapWord(g, pl, k) })) : [];
  const cargo = cargoList(g).map(([k, c]) => {
    const best = bestKnown(g, k);
    return { good: k, name: GOODS[k].name, qty: c.qty, cost: c.cost, each: Math.round(c.cost / c.qty), sellHere: market ? sellAt(g, pl, k) : null, best: best ? { place: best.place, placeName: placeName(best.place), price: best.price, ago: best.ago } : null };
  });
  const h = t.house, co = houseCompany(g);
  const rivalCo = t.rival ? companies(g).find((c) => c.id === t.rival.id) : null;
  return {
    place: pl, placeName: placeName(pl), market, caravanTown: CARAVAN_TOWNS.includes(pl), banned: (t.banned[pl] ?? 0) > mi(g),
    prices,
    cargo, cargoQty: cargoQty(g), capacity: capacity(g),
    caravan: { ...t.caravan, maxWagons: maxWagons(g), maxGuards: maxGuards(g), upkeep: upkeep(g), unpaid: t.unpaid },
    road: t.road ? { from: t.road.from, to: t.road.to, toName: placeName(t.road.to), danger: banditChance(g) } : null,
    toll: market ? { rate: tollRate(g, pl, null), fee: tollOf(g, pl, null) } : null,
    seen: Object.entries(t.seen).map(([p, s]) => ({ place: p, placeName: placeName(p), ago: mi(g) - s.at, prices: s.p })).sort((a, b) => a.ago - b.ago),
    house: h ? { id: h.id, name: h.name, level: h.level, rank: HOUSE_RANKS[h.level], branches: h.branches.map((p) => ({ place: p, name: placeName(p) })), since: h.since, fortune: co ? Math.round(co.fortune) : null, income: houseIncome(g), canLevel: canLevel(g), nextRank: h.level < 5 ? HOUSE_RANKS[h.level + 1] : null, levelCost: levelCost(h.level), levelProfit: levelProfit(h.level), branchCost: branchCost(g) } : null,
    canFound: !h && t.profit >= FOUND_PROFIT, foundCost: FOUND_HOUSE, foundProfit: FOUND_PROFIT,
    rival: t.rival ? { id: t.rival.id, name: t.rival.name, heat: t.rival.heat, since: t.rival.since, fortune: rivalCo ? Math.round(rivalCo.fortune) : null, thugs: !!t.rival.thugs } : null,
    pact: t.pact && t.pact.until > mi(g) ? { name: t.pact.name, months: t.pact.until - mi(g) } : null,
    guild: t.guild,
    debts: t.debts.map((d) => ({ who: d.who, amt: d.amt, months: Math.max(0, d.due - mi(g)) })),
    rumor: t.rumor ? { place: t.rumor.pl, placeName: placeName(t.rumor.pl), good: t.rumor.good, name: GOODS[t.rumor.good]?.name ?? '', ago: mi(g) - t.rumor.at } : null,
    profit: Math.round(t.profit), volume: t.volume, trips: t.trips,
    log: t.log.slice(0, 12),
  };
}
