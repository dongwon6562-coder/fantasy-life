// 집과 재산: 집(고치기·넓히기·하인), 세놓은 집·밭·가게, 빚과 이자, 상단에 맡긴 돈, 불과 도둑.
// - 집 자체를 사는 것은 places.js의 "집 구하기"(life.houses)다. 여기는 산 집을 돌보고, 재산을 굴린다.
// - 상태는 game.estate 하나. 집마다의 상태는 estate.homes[장소], 없으면 처음 볼 때 만든다.
// - 달마다(afterMonth) 장부를 맞춘다: 세 받기, 하인 삯, 이자, 맡긴 돈의 오르내림, 집이 낡음.
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { PLACES } from '../places.js';
import { L, note, chron, stress } from '../adventure/core.js';

export const HOME_LEVELS = ['보통 집', '넓은 집', '저택'];
export const LEVEL_MUL = [1, 1.8, 3.5];        // 집값 배수 (넓히는 값, 파는 값, 세)
export const SERVANT_WAGE = 3;                  // 하인 한 명 달 삯
export const MAX_SERVANTS = [1, 2, 4];

// 세놓을 수 있는 것
export const RENT_KINDS = {
  house: { name: '집', rate: 0.018 },           // 집값의 몇 할을 달마다 세로
  land: { name: '밭', price: 150, rent: 4, places: ['ern', 'harfen', 'verden', 'gruental', 'milles'] },
  shop: { name: '가게 자리', rate: 0.02, places: ['harfen', 'verden', 'leocast', 'portel', 'barka', 'serenia', 'eisen'] },
};
export const TENANTS = ['방앗간집 홀거', '과부 마르타', '젊은 대장장이 루츠', '떠돌이 악사 페터', '상인 부부 클라우스와 안나', '은퇴한 병사 오토', '재봉사 그레타', '빵집 막내 하인츠', '필경사 요아힘', '약초꾼 리제'];

// 빌려주는 곳: rate는 달 이자. 상단·신전은 믿을 만한 사람에게만.
export const LENDERS = {
  shark: { name: '고리대금업자', rate: 0.05, max: 200, cruel: true, places: ['harfen', 'leocast', 'verden', 'portel', 'barka', 'saltmare', 'eisen', 'gorge', 'graubel'] },
  company: { name: '상단 금고', rate: 0.015, max: 1200, places: ['harfen', 'leocast', 'verden', 'portel', 'barka', 'eisen'] },
  temple: { name: '신전 구휼 금고', rate: 0.008, max: 120, places: ['leocast', 'solaris', 'harfen'] },
};
export const LOAN_MONTHS = 12;

export function defaultEstate() {
  return {
    homes: {},          // 장소 → { level, cond(0~100), servants }
    rentals: [],        // { id, kind, place, tenant, rent, cond, unpaid }
    loans: [],          // { id, lender, principal, due, missed }
    deposits: [],       // { company, name, amount, last }
    ledger: { rent: 0, wages: 0, interest: 0, invest: 0, upkeep: 0 },
    hounded: 0,         // 빚쟁이에게 쫓기는 정도
    bankrupt: 0,        // 파산한 횟수
    seq: 1,
  };
}
export function E(g) {
  if (!g.estate) g.estate = defaultEstate();
  return g.estate;
}
HOOKS.newGame.push((g) => { g.estate = defaultEstate(); });
HOOKS.migrate.push((g) => {
  const e = Object.assign(defaultEstate(), g.estate ?? {});
  for (const k of ['rentals', 'loans', 'deposits']) if (!Array.isArray(e[k])) e[k] = [];
  if (!e.homes || typeof e.homes !== 'object') e.homes = {};
  e.ledger = Object.assign(defaultEstate().ledger, e.ledger ?? {});
  g.estate = e;
});

export function pickTenant(g, rng) { const used = new Set(E(g).rentals.map((r) => r.tenant)); const free = TENANTS.filter((t) => !used.has(t)); return rng.pick(free.length ? free : TENANTS); }
export const mi = (g) => g.date.year * 12 + g.date.month;
export const houseValue = (place) => PLACES[place]?.house || 200;
// 내 집 하나의 상태 (없으면 만든다)
export function homeOf(g, place) {
  if (!L(g).houses.includes(place)) return null;
  const e = E(g);
  e.homes[place] ??= { level: 0, cond: 80, servants: 0 };
  return e.homes[place];
}
export const ownHomes = (g) => L(g).houses.filter((p) => PLACES[p]).map((p) => ({ place: p, ...homeOf(g, p) }));
// 집 값: 집값 × 넓이 × 낡은 정도
export const homeWorth = (g, place) => { const h = homeOf(g, place); return h ? Math.round(houseValue(place) * LEVEL_MUL[h.level] * (0.4 + h.cond / 166)) : 0; };
export const rentedOut = (g, place) => E(g).rentals.some((r) => r.kind === 'house' && r.place === place);
export const debtTotal = (g) => E(g).loans.reduce((a, l) => a + l.principal, 0);
export const depositTotal = (g) => E(g).deposits.reduce((a, d) => a + d.amount, 0);
export function rentalWorth(r) {
  if (r.kind === 'land') return Math.round(RENT_KINDS.land.price * (0.6 + r.cond / 250));
  if (r.kind === 'shop') return Math.round(r.value * (0.5 + r.cond / 200));
  return 0; // 집은 homeWorth로 센다
}
export function netWorth(g) {
  const homes = L(g).houses.reduce((a, p) => a + homeWorth(g, p), 0);
  const rent = E(g).rentals.reduce((a, r) => a + rentalWorth(r), 0);
  return Math.round(g.player.money + homes + rent + depositTotal(g) - debtTotal(g));
}
export const companies = (g) => (g.history?.companies ?? []).filter((c) => c && !c.gone && c.fortune != null);
export const companyOf = (g, id) => companies(g).find((c) => c.id === id) ?? null;

// 돈을 낸다: 모자라면 낼 수 있는 만큼만 내고 모자란 만큼을 돌려준다
export function payOut(g, n) {
  const p = g.player;
  const paid = Math.min(p.money, n);
  p.money -= paid;
  return n - paid;
}

/* ---------- 달마다 장부 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const e = E(g);
  const life = L(g);
  const led = { rent: 0, wages: 0, interest: 0, invest: 0, upkeep: 0 };
  // 내 집: 낡고, 하인 삯이 나간다. 사는 집이면 편하다.
  for (const place of life.houses.slice()) {
    const h = homeOf(g, place);
    if (!h) continue;
    h.cond = Math.max(0, h.cond - (h.servants ? 0.4 : 1.1) - (rentedOut(g, place) ? 0.6 : 0));
    if (h.servants) {
      const w = h.servants * SERVANT_WAGE;
      const short = payOut(g, w);
      led.wages += w - short;
      if (short > 0) {
        h.unpaid = (h.unpaid ?? 0) + 1;
        if (h.unpaid >= 2) { h.servants -= 1; h.unpaid = 0; note(g, `${PLACES[place].name} 집의 하인 하나가 삯을 받지 못해 떠났다.`); }
      } else h.unpaid = 0;
    }
    if (life.home === 'own' && life.place === place && !life.travel) {
      stress(g, -(h.level * 1.5 + Math.min(2, h.servants)));
      if (h.servants) g.player.fatigue = Math.max(0, g.player.fatigue - Math.min(6, h.servants * 2));
      if (h.cond < 25) stress(g, 3);
    }
  }
  // 세: 세입자가 낸다. 가끔 밀리고, 가끔 떠난다.
  for (const r of e.rentals.slice()) {
    r.cond = Math.max(0, (r.cond ?? 80) - 0.7);
    if (r.kind === 'house' && !life.houses.includes(r.place)) { e.rentals.splice(e.rentals.indexOf(r), 1); continue; }
    if (!r.tenant) { if (rng.chance(0.35)) { r.tenant = pickTenant(g, rng); r.unpaid = 0; } continue; }
    const rent = Math.round(r.rent * (0.5 + r.cond / 200));
    if (rng.chance(r.unpaid ? 0.35 : 0.06)) { r.unpaid = (r.unpaid ?? 0) + 1; }
    else { g.player.money += rent; led.rent += rent; r.unpaid = 0; }
    if (r.unpaid >= 3 || rng.chance(0.01)) {
      note(g, `${placeName(r.place)} ${RENT_KINDS[r.kind].name}의 세입자 ${J(r.tenant, '이/가')} ${r.unpaid >= 3 ? '세를 떼어먹고 밤중에 달아났다' : '짐을 싸서 떠났다'}.`);
      r.tenant = null; r.unpaid = 0;
      if (rng.chance(0.3)) r.cond = Math.max(0, r.cond - 15);
    }
  }
  // 빚: 이자가 붙는다. 갚을 날이 지나면 빚쟁이가 온다(money.js).
  for (const l of e.loans) {
    const L0 = LENDERS[l.lender] ?? LENDERS.shark;
    const add = Math.max(1, Math.round(l.principal * L0.rate));
    l.principal += add;
    led.interest += add;
  }
  // 상단에 맡긴 돈: 상단 형편에 따라 늘고 준다. 상단이 망하면 날아간다.
  for (const d of e.deposits.slice()) {
    const c = companyOf(g, d.company);
    if (!c) {
      e.deposits.splice(e.deposits.indexOf(d), 1);
      note(g, `${J(d.name, '이/가')} 무너졌다. 맡겨 둔 은화 ${Math.round(d.amount)}닢이 함께 사라졌다.`);
      chron(g, `${g.player.name}, ${J(d.name, '이/가')} 무너지며 맡긴 돈을 잃다.`, 25);
      stress(g, 15);
      continue;
    }
    const change = (c.fortune - (d.last ?? c.fortune)) / 100 * 1.5 + 0.002; // 헤드 균형: 바탕 이자를 해 2.4%로 (대를 이어 불리면 은화가 수만 닢까지 쌓였다)
    const before = d.amount;
    d.amount = Math.max(0, d.amount * (1 + change));
    d.last = c.fortune;
    led.invest += d.amount - before;
  }
  led.invest = Math.round(led.invest);
  e.ledger = led;
});

export const placeName = (p) => PLACES[p]?.name ?? '먼 곳';
