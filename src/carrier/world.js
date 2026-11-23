// 길 위의 달: 짐을 진 길의 위험, 닿으면 짐 넘기기, 역참 살림, 운송 상단의 세력 다툼, 쇠수레 길이 닿은 고장.
// 플레이어 없이도 운송 상단은 길을 넓히고 다투다 쇠수레 길에 무너진다.
import { HOOKS } from '../hooks.js';
import { L, queueScene, sceneQueued, chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import {
  C, mi, clamp, here, placeName, free, ownRng, routeKey, reached, carrierJob, HOUSES, HOUSE_IDS, STATION_COST, traffic, fadeAt, linksOf, logC, stationHere,
} from './core.js';
import { roadKinds, deliver, pay } from './life.js';

/* ---------- 짐을 진 길 ---------- */
export function roadChance(g) {
  const st = C(g);
  let p = 0.16 + ((g.realm?.monsters ?? 0) > 55 ? 0.05 : 0) + (st.thugs > mi(g) ? 0.1 : 0);
  if ((g.beasts?.animals ?? []).some((a) => a.alive && ['dog', 'direwolf'].includes(a.kind) && (a.trained ?? 0) >= 100)) p -= 0.03;
  if (['w_road', 'w_pass', 'w_bridge'].some((id) => g.works?.w?.[id]?.stage === 'done')) p -= 0.03;
  return clamp(p, 0.04, 0.4);
}
HOOKS.afterActions.unshift((g, rng) => {
  if (g.over) return;
  const h = C(g).haul, tr = L(g).travel;
  if (!h || !tr || tr.sea || h.hits >= 2 || sceneQueued(g, 'carrier_road') || !rng.chance(roadChance(g))) return;
  h.hits += 1;
  const ks = roadKinds(g), kind = ks[Math.floor(rng.next() * ks.length)];
  queueScene(g, 'carrier_road', { at: null, kind, snow: g.date.month >= 11 || g.date.month <= 2, roll: rng.int(0, 22), thugs: C(g).thugs > mi(g) });
});
HOOKS.afterActions.push((g, rng, results) => {
  if (g.over) return;
  const st = C(g), h = st.haul;
  if (!h || L(g).travel) return;
  if (here(g) === h.to) {
    if (h.load < 0.999) { if (!sceneQueued(g, 'carrier_short')) queueScene(g, 'carrier_short', {}, { first: true }); return; }
    results?.push({ name: '짐 넘기기', text: deliver(g, h, { late: mi(g) > h.due }) });
    return;
  }
  if (mi(g) > h.due + 2) { st.haul = null; st.lost += 1; logC(g, `${placeName(h.to)}에 가야 할 ${J(h.what, '을/를')} 끝내 넘기지 못했다.`); }
});

/* ---------- 역참 살림 ---------- */
function stationMonth(g, rng) {
  const st = C(g), s = st.station;
  if (!s) return;
  const roads = ['w_road', 'w_pass', 'w_bridge', 'w_canal'].filter((id) => g.works?.w?.[id]?.stage === 'done').length;
  const fade = fadeAt(g, s.place) * (s.inn ? 0.4 : 1);
  const take = traffic(s.place) * (0.5 + s.rep / 100) * (1 - fade) + roads;
  const cost = s.horses * 0.8 + s.hands;
  const net = Math.round(take - cost + (stationHere(g) ? 1 : 0));
  if (net > 0) { g.player.money += net; st.earned += net; } else if (net < 0) pay(g, -net);
  s.rep = clamp(s.rep + (stationHere(g) ? 0.6 : -0.4), 0, 100);
  if (stationHere(g) && free(g) && mi(g) - st.evAt >= 5 && rng.chance(0.2) && !sceneQueued(g, 'carrier_inn')) {
    st.evAt = mi(g);
    const strong = HOUSE_IDS.filter((id) => !st.houses[id].gone && st.houses[id].power >= 40);
    const kinds = ['courier', 'thief', 'wedding', ...(strong.length ? ['buyout'] : [])];
    const kind = kinds[Math.floor(rng.next() * kinds.length)];
    queueScene(g, 'carrier_inn', { kind, house: strong[0] ?? null, price: Math.round(STATION_COST * (0.8 + s.rep / 100)) });
  }
}

/* ---------- 운송 상단 ---------- */
export function housesYear(g, rng) {
  const st = C(g);
  for (const id of HOUSE_IDS) {
    const h = st.houses[id], seat = HOUSES[id].seat;
    if (h.gone) {
      if (!reached(g, 'railroad', seat) && rng.chance(0.04)) { Object.assign(h, { gone: false, power: 20, routes: [] }); chron(g, `${J(HOUSES[id].name, '이/가')} 다시 깃발을 올리다.`, 5); }
      continue;
    }
    h.power = clamp(h.power + rng.int(-6, 9) + Math.min(4, h.routes.length) - (reached(g, 'railroad', seat) ? 14 : 0) - (reached(g, 'ironcart', seat) ? 5 : 0), 0, 100);
    if (h.power <= 0) { h.gone = true; h.routes = []; chron(g, `${J(HOUSES[id].name, '이/가')} 문을 닫다. 마지막 짐수레가 팔려 나갔다.`, 10); continue; }
    if (h.power >= 35 && h.routes.length < 5) {
      const from = rng.chance(0.6) ? seat : (linksOf(seat)[Math.floor(rng.next() * linksOf(seat).length)] ?? seat);
      const to = linksOf(from)[Math.floor(rng.next() * linksOf(from).length)];
      const key = to ? routeKey(from, to) : null;
      if (key && !h.routes.includes(key) && !HOUSE_IDS.some((o) => o !== id && st.houses[o].routes.includes(key))) {
        h.routes.push(key);
        if (rng.chance(0.3)) chron(g, `${J(HOUSES[id].name, '이/가')} ${J(placeName(from), '과/와')} ${placeName(to)} 사이 길에 깃발을 꽂다.`, 4);
      }
    }
  }
}
function rivalMonth(g) {
  const st = C(g);
  if (mi(g) - st.rivalAt < 24 || !free(g) || sceneQueued(g, 'carrier_rival')) return;
  for (const [key, n] of Object.entries(st.routes)) {
    if (n < 4) continue;
    const id = HOUSE_IDS.find((x) => !st.houses[x].gone && st.houses[x].routes.includes(key) && st.hired !== x);
    if (!id || !key.split('|').includes(here(g))) continue;
    st.rivalAt = mi(g);
    queueScene(g, 'carrier_rival', { house: id, key });
    return;
  }
}
function fadeMonth(g) {
  const st = C(g);
  if (!(carrierJob(g) || stationHere(g)) || L(g).travel || fadeAt(g) < 0.35 || st.fadeSeen.includes(here(g))) return;
  st.fadeSeen.push(here(g));
  if (!sceneQueued(g, 'carrier_fade')) queueScene(g, 'carrier_fade');
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 36);
  stationMonth(g, rng);
  if (g.date.month === 3) housesYear(g, rng);
  rivalMonth(g);
  fadeMonth(g);
});
// 처음 판: 상단들은 제 고장 둘레의 길 하나씩을 쥐고 시작한다
HOOKS.newGame.push((g) => {
  const st = C(g);
  for (const id of HOUSE_IDS) { const seat = HOUSES[id].seat, nb = linksOf(seat)[0]; if (nb) st.houses[id].routes = [routeKey(seat, nb)]; }
});
// 대를 이으면: 길눈은 새 사람의 것, 역참과 수레는 집안에 남는다
HOOKS.heir.push((g) => {
  const st = C(g);
  if (st.knack > 0) st.past.push({ name: '선대의 길', knack: Math.round(st.knack), y: g.date.year, done: st.done });
  st.knack = Math.min(st.knack * 0.2, 10); st.haul = null; st.hired = null; st.cut = null; st.routes = {};
  if (st.station) { st.station.rep = Math.round(st.station.rep / 2); logC(g, `${J(st.station.name, '을/를')} 물려받았다.`); }
});
