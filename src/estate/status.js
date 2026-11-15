// 화면용: 집과 재산의 지금 상태 (도우미스레드1이 화면에 쓴다).
import { L } from '../adventure/core.js';
import { E, HOME_LEVELS, LENDERS, RENT_KINDS, SERVANT_WAGE, mi, homeOf, homeWorth, rentedOut, rentalWorth, debtTotal, depositTotal, netWorth, companyOf, placeName } from './core.js';
import { condWord, houseRent } from './manage.js';
import { canBorrow, collateral } from './money.js';

export function estateStatus(g) {
  const e = E(g);
  const life = L(g);
  const homes = life.houses.filter((p) => homeOf(g, p)).map((p) => {
    const h = homeOf(g, p);
    return { place: p, name: placeName(p), level: h.level, levelName: HOME_LEVELS[h.level], cond: Math.round(h.cond), condWord: condWord(h.cond), servants: h.servants, servantWage: h.servants * SERVANT_WAGE, worth: homeWorth(g, p), rented: rentedOut(g, p), rent: houseRent(g, p), living: life.home === 'own' && life.place === p && !life.travel };
  });
  const rentals = e.rentals.map((r) => ({ id: r.id, kind: r.kind, kindName: RENT_KINDS[r.kind]?.name ?? '', place: r.place, name: placeName(r.place), tenant: r.tenant ?? null, rent: r.rent, cond: Math.round(r.cond ?? 0), unpaid: r.unpaid ?? 0, worth: r.kind === 'house' ? 0 : rentalWorth(r) }));
  const loans = e.loans.map((l) => ({ id: l.id, lender: l.lender, lenderName: LENDERS[l.lender]?.name ?? '', principal: l.principal, rate: LENDERS[l.lender]?.rate ?? 0, monthsLeft: l.due - mi(g), missed: l.missed, extended: !!l.extended }));
  const deposits = e.deposits.map((d) => ({ company: d.company, name: d.name, amount: Math.round(d.amount), fortune: companyOf(g, d.company)?.fortune ?? null }));
  const L0 = e.ledger;
  return {
    homes, rentals, loans, deposits,
    ledger: { ...L0, net: Math.round(L0.rent + L0.invest - L0.wages - L0.interest) },
    money: g.player.money,
    debt: debtTotal(g),
    deposited: Math.round(depositTotal(g)),
    netWorth: netWorth(g),
    collateral: Math.round(collateral(g)),
    borrowable: Object.fromEntries(Object.keys(LENDERS).map((id) => [id, canBorrow(g, id)])),
    hounded: e.hounded,
    bankrupt: e.bankrupt,
  };
}
