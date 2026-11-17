// 화면용: 내 집과 살림의 모든 것을 한 번에.
import { L } from '../adventure/core.js';
import { E, homeWorth } from '../estate/core.js';
import { H, ROOMS, ROOM_IDS, here, placeName, valueAt, hutOk, recOf, roomCap, kindWord } from './core.js';
import { BUILDS, buildCost, buybackCost } from './build.js';
import { destinations, moveCost, household } from './move.js';

export function houseStatus(g) {
  const h = H(g), life = L(g), pl = here(g);
  const homes = life.houses.filter((p) => recOf(g, p)).map((p) => {
    const r = recOf(g, p), e = E(g).homes[p] ?? {};
    return {
      place: p, placeName: placeName(p), name: r.name, kind: r.kind, kindWord: kindWord(g, p), level: e.level ?? 0, cond: e.cond ?? null, worth: homeWorth(g, p),
      built: r.built, by: r.by, gens: r.gens, livedMonths: r.lived ?? 0, marks: [...r.marks],
      rooms: r.rooms.map((id) => ({ id, name: ROOMS[id].name, desc: ROOMS[id].desc })), roomCap: roomCap(g, p), here: p === pl,
    };
  });
  const b = h.build;
  return {
    sleep: life.home, place: pl, placeName: placeName(pl), houseValue: valueAt(pl), hutOk: hutOk(pl),
    homes,
    build: b ? { place: b.place, placeName: placeName(b.place), kind: b.kind, name: BUILDS[b.kind].name, monthsLeft: Math.max(0, Math.ceil(b.left)), cost: b.cost } : null,
    buildCosts: Object.fromEntries(Object.keys(BUILDS).map((k) => [k, buildCost(pl, k)])),
    lost: h.lost.map((x) => ({ place: x.place, placeName: placeName(x.place), name: x.name, by: x.by, year: x.year, how: x.how, gens: x.gens ?? 1, buyback: buybackCost(x.place) })),
    rooms: ROOM_IDS.map((id) => ({ id, ...ROOMS[id] })),
    neighbor: h.neighbors[pl] ? { name: h.neighbors[pl].name, mood: h.neighbors[pl].mood, quarrels: h.neighbors[pl].quarrels } : null,
    moving: h.moving ? { to: h.moving.to, toName: placeName(h.moving.to), from: h.moving.from } : null,
    moves: h.moves, built: h.built,
    household: household(g).map((p) => p.name),
    destinations: destinations(g).map((to) => ({ place: to, name: placeName(to), cost: moveCost(g, to) })),
    log: h.log.slice(0, 12),
  };
}
