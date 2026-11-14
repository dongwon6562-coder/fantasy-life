// 화면용: 바다와 관련된 지금 상태를 한 덩어리로 돌려준다 (도우미스레드1이 화면에 쓴다).
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { S, GOODS, isPort, seaRoutesFrom, seaFare, atSea, priceAt, sailing } from './core.js';
import { SHIPS, holdOf, buyPrice, sellPriceOf } from './crew.js';
import { PIRATE_RANKS } from './pirates.js';

export function seaStatus(g) {
  const sea = S(g);
  const life = L(g);
  const here = life.place;
  const port = isPort(here) && !life.travel;
  const sh = sea.ship;
  return {
    sailing: Math.floor(sailing(g)),
    port: port ? { id: here, name: PLACES[here].name } : null,
    routes: port ? seaRoutesFrom(g, here).map((r) => ({ ...r, name: PLACES[r.to].name, fare: seaFare(r.months) })) : [],
    voyage: atSea(g) ? { to: life.travel.to, toName: PLACES[life.travel.to]?.name ?? '', left: life.travel.left, from: life.travel.from, own: !!life.travel.own, work: !!life.travel.work } : null,
    ship: sh ? { name: sh.name, kind: sh.kind, kindName: SHIPS[sh.kind]?.name ?? '', hull: sh.hull, speed: sh.speed, hold: holdOf(g), crewWage: SHIPS[sh.kind]?.crew ?? 0, unpaid: sh.unpaid ?? 0 } : null,
    cargo: sea.cargo ? { good: sea.cargo.good, name: GOODS[sea.cargo.good]?.name ?? '', qty: sea.cargo.qty, cost: sea.cargo.cost, from: sea.cargo.from } : null,
    prices: port ? Object.keys(GOODS).map((k) => ({ good: k, name: GOODS[k].name, buy: buyPrice(g, here, k), sell: sellPriceOf(g, here, k), base: GOODS[k].base, raw: priceAt(g, here, k) })) : [],
    pirate: sea.pirate ? { rank: sea.pirate.rank, rankName: PIRATE_RANKS[sea.pirate.rank], raids: sea.pirate.raids, share: sea.pirate.share } : null,
    hunted: Math.round(sea.hunted),
    traitor: !!sea.traitor,
    voyages: sea.voyages,
    monsters: sea.monsters,
    lair: !!sea.lair,
    pirateKills: sea.pirateKills ?? 0,
    profit: sea.profit ?? 0,
  };
}
