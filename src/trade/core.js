// 장사 길과 상단: 상태, 물건, 고장마다 다른 시세, 대상단(마차·호위·짐꾼), 길 위의 짐과 도착.
// - 짐은 game.trade.cargo에 물건별로 {qty, cost}. 바다 장사(src/sea/의 배 짐칸)와는 따로 센다.
// - 시세 = 기본값 × (1 + 고장 보정 + 흔들림 + 내가 사고판 흔적 + 세상 형편). 전쟁·흉년·재앙·시대가 값을 움직인다.
// - 대상단: 마차(짐 15), 짐꾼(짐 4), 길든 말(짐 6, src/beasts/), 호위(도적을 막는다). 달마다 삯이 든다.
// - 짐을 지고 길에 오르면 달마다 도적이 노릴 수 있고(장면 trade_bandits), 성문에서는 통행세를 낸다(trade_toll).
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L, queueScene, sceneQueued, note } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { activeAt } from '../nature/state.js';
import { J } from '../narrative/text.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const realmOf = (place) => PLACES[place]?.realm ?? 'leonia';

/* ---------- 물건 ---------- */
export const GOODS = {
  grain: { name: '밀', base: 8, food: true },
  salt: { name: '소금', base: 6 },
  wine: { name: '포도주', base: 14 },
  wool: { name: '모직', base: 12 },
  iron: { name: '쇠', base: 16 },
  fur: { name: '모피', base: 18 },
  spice: { name: '향신료', base: 26 },
  elfherb: { name: '엘프 약초', base: 30 },
  manastone: { name: '마석', base: 34 },
  silk: { name: '비단', base: 40 },
  dwarfsteel: { name: '드워프 강철', base: 60 },
};
export const GOOD_IDS = Object.keys(GOODS);

// 고장마다 싸게 나는 것(-)과 비싸게 팔리는 것(+)
export const LOCAL = {
  ern: { grain: -0.3, wool: -0.1, iron: 0.25, salt: 0.2, spice: 0.35, silk: 0.3 },
  harfen: { wool: -0.2, grain: -0.1, iron: 0.15, spice: 0.2, fur: 0.1 },
  gruental: { wine: -0.35, grain: -0.25, salt: 0.25, iron: 0.2 },
  verden: { wool: -0.3, grain: -0.1, spice: 0.3, silk: 0.25, dwarfsteel: 0.15 },
  leocast: { grain: 0.3, wine: 0.25, fur: 0.3, silk: 0.35, spice: 0.35, dwarfsteel: 0.3, elfherb: 0.25, manastone: 0.2 },
  klein: { salt: -0.35, grain: -0.05, spice: 0.15, wool: 0.1 },
  eisen: { grain: -0.2, iron: -0.1, fur: 0.3, silk: 0.3, wine: 0.25, dwarfsteel: 0.35, manastone: 0.25 },
  solaris: { wine: -0.25, grain: -0.15, elfherb: 0.35, salt: 0.2, silk: 0.2 },
  serenia: { manastone: 0.35, elfherb: 0.3, grain: 0.25, silk: 0.25, wool: 0.1 },
  barka: { silk: -0.3, spice: -0.25, fur: 0.3, dwarfsteel: 0.25, iron: 0.15, wine: 0.1 },
  graubel: { iron: -0.2, fur: -0.1, wool: 0.3, grain: 0.2, wine: 0.2, dwarfsteel: 0.2 },
  silverleaf: { elfherb: -0.4, wine: 0.2, iron: 0.3, salt: 0.3, wool: 0.15 },
  hammer: { iron: -0.35, dwarfsteel: -0.35, manastone: -0.2, grain: 0.35, wine: 0.35, salt: 0.3, wool: 0.25 },
  gorge: { manastone: -0.3, iron: -0.2, grain: 0.35, wine: 0.3, salt: 0.2 },
  fur: { fur: -0.4, wool: -0.1, salt: 0.3, iron: 0.3, wine: 0.3, grain: 0.1, spice: 0.2 },
  portel: { spice: -0.3, silk: -0.25, salt: -0.15, fur: 0.3, grain: 0.25, wool: 0.2 },
  saltmare: { wine: 0.4, grain: 0.35, silk: -0.1, spice: -0.1, iron: 0.2 },
  saltrock: { salt: -0.45, grain: 0.3, wine: 0.25 },
};
// 장터가 서는 곳 (폐허와 숨은 섬은 뺀다)
export const isMarket = (place) => !!PLACES[place] && !!LOCAL[place] && !PLACES[place].hidden;
// 마차를 사고 호위를 구할 수 있는 큰 고장
export const CARAVAN_TOWNS = ['harfen', 'verden', 'leocast', 'eisen', 'solaris', 'serenia', 'barka', 'graubel', 'portel', 'fur', 'hammer', 'klein'];
// 성문 통행세 (짐값에 매기는 몫). 나라 경계를 넘어오면 더 붙는다.
export const TOLLS = { leocast: 0.06, eisen: 0.08, solaris: 0.05, serenia: 0.05, graubel: 0.04, harfen: 0.03, verden: 0.03, barka: 0.02, portel: 0.03, hammer: 0.05, silverleaf: 0.04, saltmare: 0.03 };
export const BORDER_TOLL = 0.03;

/* ---------- 대상단 ---------- */
export const WAGON_COST = 60;
export const GUARD_HIRE = 4;
export const UPKEEP = { guard: 3, porter: 1, wagon: 1 };
export const CAP = { back: 4, porter: 4, wagon: 15, horse: 6 };
export const HOUSE_RANKS = ['', '작은 상회', '자리 잡은 상회', '이름난 상회', '큰 상회', '왕국 제일의 상회'];

/* ---------- 상태 ---------- */
function fresh() {
  return {
    cargo: {}, // good -> {qty, cost}
    caravan: { wagons: 0, guards: 0, porters: 0 },
    mkt: {}, // 'place:good' -> {drift, sat}
    seen: {}, // place -> {at, p: {good: 팔 값}}
    road: null, // 짐을 지고 가는 길 {from, to, since, hits}
    house: null, // {id, name, level, branches[], since, founder}
    rival: null, // {id, name, heat, since, at}
    pact: null,
    guild: false,
    banned: {}, // place -> 이 달까지 장터 출입 막힘
    debts: [], // 외상: {who, amt, due}
    profit: 0, // 지금까지 장사로 남긴 돈 (밑진 것은 뺀다)
    volume: 0, // 지금까지 사고판 짐 수
    monthProfit: 0,
    trips: 0, unpaid: 0, cool: 0, rivalCool: 0, contraband: false, rumor: null,
    log: [],
  };
}
export const T = (g) => (g.trade ??= fresh());
HOOKS.newGame.push((g) => { g.trade = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  g.trade = Object.assign(d, g.trade ?? {});
  g.trade.caravan = Object.assign(d.caravan, g.trade.caravan ?? {});
  // 모르는 물건과 빈 짐은 버린다
  for (const [k, c] of Object.entries(g.trade.cargo)) if (!GOODS[k] || !c || !(c.qty > 0)) delete g.trade.cargo[k];
});
export function logTrade(g, text) {
  const t = T(g);
  t.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (t.log.length > 24) t.log.length = 24;
}

/* ---------- 쓸 만한 도우미 ---------- */
export const tradeSkill = (g) => g.player.skills.trade ?? 0;
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const cargoQty = (g) => Object.values(T(g).cargo).reduce((s, c) => s + (c?.qty ?? 0), 0);
export const cargoList = (g) => Object.entries(T(g).cargo).filter(([, c]) => c && c.qty > 0);
export const cargoValue = (g, place = null) => cargoList(g).reduce((s, [k, c]) => s + c.qty * (place && isMarket(place) ? priceAt(g, place, k) : GOODS[k].base), 0);
const packHorses = (g) => (g.beasts?.animals ?? []).filter((a) => a.alive && (a.kind === 'horse' || a.kind === 'warhorse') && (a.trained ?? 0) >= 100).length;
export function capacity(g) {
  const c = T(g).caravan;
  return CAP.back + c.porters * CAP.porter + c.wagons * CAP.wagon + packHorses(g) * CAP.horse;
}
export const spaceLeft = (g) => Math.max(0, capacity(g) - cargoQty(g));
export const maxWagons = (g) => 2 + (T(g).house?.level ?? 0) * 2;
export const maxGuards = (g) => 2 + T(g).caravan.wagons * 3;
export const upkeep = (g) => { const c = T(g).caravan; return c.guards * UPKEEP.guard + c.porters * UPKEEP.porter + c.wagons * UPKEEP.wagon; };
export function addCargo(g, good, qty, cost) {
  const t = T(g);
  const c = (t.cargo[good] ??= { qty: 0, cost: 0 });
  c.qty += qty; c.cost += cost;
}
// 짐을 몫만큼 잃는다. 잃은 짐 수를 돌려준다
export function loseCargo(g, frac) {
  let lost = 0;
  for (const [k, c] of cargoList(g)) {
    const n = Math.min(c.qty, Math.ceil(c.qty * frac));
    if (n <= 0) continue;
    c.cost = Math.round(c.cost * (1 - n / c.qty));
    c.qty -= n; lost += n;
    if (c.qty <= 0) delete T(g).cargo[k];
  }
  return lost;
}
export const cargoWords = (g) => cargoList(g).map(([k, c]) => `${GOODS[k].name} ${c.qty}짐`).join(', ');

/* ---------- 시세 ---------- */
const war = (g) => { const r = g.realm ?? {}; return !!(r.balhart?.war || r.succession === 'civilwar' || r.north?.war); };
export function worldAdj(g, place, good) {
  const r = g.realm ?? {}, w = g.world ?? {};
  let a = 0;
  if (war(g)) a += { iron: 0.25, dwarfsteel: 0.25, grain: 0.1, wool: 0.05, silk: -0.1 }[good] ?? 0;
  if (good === 'grain') a += ((r.bread ?? 1) - 1) * 0.8 + (w.famine ? 0.3 : 0);
  if (good === 'wine') a += ((r.bread ?? 1) - 1) * 0.2;
  if (good === 'manastone') a += (r.era ?? 0) * 0.05;
  if ((r.monsters ?? 0) > 55) a += 0.05;
  for (const d of activeAt(g, place)) {
    if (['drought', 'locust', 'flood'].includes(d.kind)) a += { grain: 0.4, wine: 0.15 }[good] ?? 0;
    if (d.kind === 'winter') a += { fur: 0.3, wool: 0.2, grain: 0.1 }[good] ?? 0;
    if (d.kind === 'quake') a += { iron: 0.1, grain: 0.1 }[good] ?? 0;
  }
  return a;
}
const mk = (g, place, good) => (T(g).mkt[`${place}:${good}`] ??= { drift: 0, sat: 0 });
// 그 고장의 시세 (사고팔 때의 덧붙임 전)
export function priceAt(g, place, good) {
  const G = GOODS[good];
  if (!G || !isMarket(place)) return 0;
  const m = T(g).mkt[`${place}:${good}`];
  const mul = 1 + (LOCAL[place][good] ?? 0) + (m?.drift ?? 0) + (m?.sat ?? 0) + worldAdj(g, place, good);
  return Math.max(1, Math.round(G.base * Math.max(0.3, mul)));
}
// 내가 살 때와 팔 때: 장사 솜씨가 좋을수록 흥정 폭이 줄어든다. 길드에 들면 조금 낫다.
const edge = (g) => tradeSkill(g) * 0.0005 + (T(g).guild ? 0.015 : 0);
export const buyAt = (g, place, good) => Math.max(1, Math.ceil(priceAt(g, place, good) * (1.08 - edge(g))));
export const sellAt = (g, place, good) => Math.max(1, Math.floor(priceAt(g, place, good) * (0.92 + edge(g))));
// 사고팔면 그 고장 시세가 움직인다 (많이 팔면 값이 떨어진다)
export function pushMarket(g, place, good, qty, selling) {
  const m = mk(g, place, good);
  m.sat = clamp(m.sat + (selling ? -0.005 : 0.004) * qty, -0.4, 0.4);
}
// 몇 짐을 한꺼번에 사고팔 때의 짐당 값 (반을 사고판 뒤의 값). 시세는 건드리지 않는다
export function quote(g, place, good, qty, selling) {
  const m = mk(g, place, good), sat = m.sat;
  pushMarket(g, place, good, qty / 2, selling);
  const p = selling ? sellAt(g, place, good) : buyAt(g, place, good);
  m.sat = sat;
  return p;
}
export function remember(g, place) {
  if (!isMarket(place)) return;
  const p = {};
  for (const k of GOOD_IDS) p[k] = sellAt(g, place, k);
  T(g).seen[place] = { at: mi(g), p };
}
// 적어 둔 시세 가운데 그 물건을 가장 비싸게 쳐준 곳
export function bestKnown(g, good, except = null) {
  let best = null;
  for (const [pl, s] of Object.entries(T(g).seen)) {
    if (pl === except || !s?.p?.[good]) continue;
    if (!best || s.p[good] > best.price) best = { place: pl, price: s.p[good], ago: mi(g) - s.at };
  }
  return best;
}
export const cheapWord = (g, place, good) => {
  const r = priceAt(g, place, good) / GOODS[good].base;
  return r <= 0.8 ? '싸다' : r >= 1.25 ? '비싸다' : '보통';
};

/* ---------- 매달: 시세 흔들림, 삯, 외상 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const t = T(g);
  for (const m of Object.values(t.mkt)) {
    m.drift = clamp(m.drift * 0.85 + rng.normal(0, 0.04), -0.3, 0.3);
    m.sat *= 0.8;
    if (Math.abs(m.sat) < 0.005) m.sat = 0;
  }
  // 흔적이 없는 곳에도 가끔 바람이 분다 (장사 소문이 생기도록)
  if (rng.chance(0.3)) {
    const pl = rng.pick(Object.keys(LOCAL)), good = rng.pick(GOOD_IDS);
    mk(g, pl, good).drift = clamp(mk(g, pl, good).drift + rng.normal(0, 0.12), -0.3, 0.3);
  }
  for (const pl of Object.keys(t.banned)) if (t.banned[pl] <= mi(g)) delete t.banned[pl];
  // 대상단 삯
  const cost = upkeep(g);
  if (cost > 0) {
    if (g.player.money >= cost) { g.player.money -= cost; t.unpaid = 0; }
    else {
      t.unpaid += 1;
      const c = t.caravan;
      if (t.unpaid >= 2) {
        const gone = [];
        if (c.guards) { gone.push(`호위 ${c.guards}명`); c.guards = 0; }
        if (c.porters) { gone.push(`짐꾼 ${c.porters}명`); c.porters = 0; }
        if (gone.length) { note(g, `삯을 두 달 못 주자 ${gone.join('과 ')}이 떠났다.`); logTrade(g, `삯이 밀려 ${gone.join(', ')}이 떠났다.`); }
        t.unpaid = 0;
      }
    }
  }
  // 외상값
  for (const d of [...t.debts]) {
    if (mi(g) < d.due) continue;
    t.debts.splice(t.debts.indexOf(d), 1);
    if (rng.chance(d.odds ?? 0.65)) {
      g.player.money += d.amt;
      logTrade(g, `${J(d.who, '이/가')} 외상값 은화 ${d.amt}닢을 보내왔다.`);
      note(g, `${J(d.who, '이/가')} 외상값을 갚았다.`);
    } else {
      t.profit -= d.cost ?? 0;
      logTrade(g, `${J(d.who, '은/는')} 끝내 외상값을 갚지 않았다.`);
      note(g, `${J(d.who, '이/가')} 외상값 은화 ${d.amt}닢을 떼어먹었다.`);
    }
  }
  t.monthProfit *= 0.5;
  if (t.cool > 0) t.cool -= 1;
  if (t.rivalCool > 0) t.rivalCool -= 1;
});

/* ---------- 길 위의 짐: 도적과 통행세 ---------- */
export function banditChance(g) {
  const t = T(g), r = g.realm ?? {}, tr = L(g).travel;
  if (!tr || tr.sea || tr.forced || cargoQty(g) <= 0) return 0;
  let p = 0.05;
  if ((r.monsters ?? 0) > 55) p += 0.04;
  if (war(g)) p += 0.03;
  if (realmOf(tr.to) !== 'leonia' || realmOf(tr.from) !== 'leonia') p += 0.02;
  if ((r.blackGlove ?? 0) > 60 && (tr.to === 'leocast' || tr.from === 'leocast')) p += 0.02;
  p += Math.min(0.08, cargoValue(g) / 4000);
  p -= Math.min(0.12, t.caravan.guards * 0.02);
  if ((g.beasts?.animals ?? []).some((a) => a.alive && (a.kind === 'dog' || a.kind === 'direwolf') && (a.trained ?? 0) >= 100)) p -= 0.02;
  if ((t.house?.level ?? 0) >= 3) p -= 0.02; // 큰 상회의 깃발은 도적도 안다
  if (t.rival?.thugs) p += 0.1;
  return clamp(p, 0.01, 0.4);
}
export function tollRate(g, place, from) {
  let r = TOLLS[place] ?? 0;
  if (!r) return 0;
  if (from && realmOf(from) !== realmOf(place)) r += BORDER_TOLL;
  const t = T(g);
  if (t.house?.branches?.includes(place)) r *= 0.5;
  if (t.guild && realmOf(place) === 'leonia') r *= 0.7;
  return r;
}
export const tollOf = (g, place, from) => Math.round(cargoValue(g, place) * tollRate(g, place, from));

// 길 위의 달은 places.js가 줄이고 도착시킨다. 그 앞에서 짐을 진 길을 적고 도적을 굴린다.
HOOKS.afterActions.unshift((g, rng) => {
  if (g.over) return;
  const t = T(g), tr = L(g).travel;
  if (!tr || cargoQty(g) <= 0) return;
  if (!t.road || t.road.to !== tr.to) t.road = { from: tr.from ?? here(g), to: tr.to, since: mi(g), hits: 0 };
  if (!tr.sea && !tr.forced && t.road.hits < 2 && !sceneQueued(g, 'trade_bandits') && rng.chance(banditChance(g))) {
    t.road.hits += 1;
    queueScene(g, 'trade_bandits', { at: null, thugs: !!t.rival?.thugs, roll: rng.int(0, 25) });
  }
});
// 그 뒤: 닿았으면 성문 통행세
HOOKS.afterActions.push((g) => {
  if (g.over) return;
  const t = T(g), tr = L(g).travel;
  if (tr) return;
  if (t.road) {
    const road = t.road;
    t.road = null;
    if (road.to === here(g) && cargoQty(g) > 0 && tollOf(g, here(g), road.from) > 0 && !sceneQueued(g, 'trade_toll')) queueScene(g, 'trade_toll', { from: road.from });
    if (isMarket(here(g))) remember(g, here(g));
  }
});

/* ---------- 대 잇기: 장사는 집안의 일이다 ---------- */
HOOKS.heir.push((g) => {
  const t = T(g);
  t.road = null; t.unpaid = 0; t.contraband = false;
  if (t.rival) t.rival.heat = Math.round(t.rival.heat / 2);
  if (t.rival?.thugs) t.rival.thugs = false;
  const parts = [];
  if (cargoQty(g)) parts.push(`창고의 짐(${cargoWords(g)})`);
  if (t.caravan.wagons) parts.push(`마차 ${t.caravan.wagons}대`);
  if (t.house) parts.push(t.house.name);
  if (parts.length) note(g, `선대가 남긴 ${parts.join(', ')}${J(parts[parts.length - 1], '이/가').slice(parts[parts.length - 1].length)} 내 몫이 되었다. 장부를 넘기는 서기의 손이 떨렸다.`);
});
