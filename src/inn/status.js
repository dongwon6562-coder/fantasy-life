// 화면용: 내 가게의 모든 것을 한 번에.
import { I, myInn, atInn, here, placeName, innOk, crowdOf, KINDS, costOf, roomCost, MAX_ROOMS, PRICES, ROLES, ROLE_IDS, REGULARS, SMUGGLE, taxRate, innTitle, innWorth, foodOf, FOOD_WORD, fameWord } from './core.js';
import { reckon, gangAt } from './month.js';
import { GANGS } from '../underworld/gangs.js';

export function innStatus(g) {
  const s = I(g), inn = myInn(g), pl = here(g);
  const r = inn ? reckon(g) : null;
  return {
    place: pl, placeName: placeName(pl), canOpenHere: !inn && innOk(pl), costs: innOk(pl) ? { tavern: costOf(pl, 'tavern'), inn: costOf(pl, 'inn') } : null, crowd: innOk(pl) ? crowdOf(pl) : 0,
    inn: inn ? {
      place: inn.place, placeName: placeName(inn.place), here: atInn(g), name: inn.name, title: innTitle(inn), kind: inn.kind, kindName: KINDS[inn.kind].name,
      rooms: inn.rooms, maxRooms: MAX_ROOMS, roomCost: roomCost(inn.place), fame: Math.round(inn.fame), fameWord: fameWord(inn.fame), clean: Math.round(inn.clean),
      price: inn.price, priceName: PRICES[inn.price].name, food: foodOf(g), foodWord: FOOD_WORD[foodOf(g)],
      workers: inn.workers.map((w) => ({ id: w.id, name: w.name, role: w.role, roleName: ROLES[w.role].name, wage: ROLES[w.role].wage, loyal: Math.round(w.loyal), skill: Math.round(w.skill) })),
      regulars: inn.regulars.map((x) => ({ id: x.id, name: REGULARS[x.id].name, desc: REGULARS[x.id].desc, mood: Math.round(x.mood), tab: x.tab })),
      gens: inn.gens, founded: inn.founded, by: inn.by, months: inn.months, total: inn.total, worth: innWorth(inn),
      last: { ...inn.last }, forecast: r ? { guests: r.guests, rev: r.rev, cost: r.cost, net: r.net, tax: r.tax } : null,
      taxOwed: inn.taxOwed, taxRate: taxRate(inn.place), dodged: inn.dodged, arrears: inn.arrears, heat: Math.round(inn.heat),
      backroom: { ...inn.backroom }, canSmuggle: SMUGGLE.includes(inn.place),
      gang: inn.gang ? { name: GANGS[inn.gang.id]?.name ?? '뒷골목 패거리', state: inn.gang.state } : gangAt(inn.place) ? { name: GANGS[gangAt(inn.place)].name, state: null } : null,
      rival: inn.rival ? { name: inn.rival.name, power: Math.round(inn.rival.power) } : null,
      freeBed: inn.rooms > 0,
    } : null,
    roles: ROLE_IDS.map((id) => ({ id, ...ROLES[id] })),
    lost: s.lost.map((x) => ({ place: x.place, placeName: placeName(x.place), name: x.name, kind: x.kind, year: x.year, how: x.how, gens: x.gens ?? 1 })),
    opened: s.opened, sold: s.sold,
    log: s.log.slice(0, 12),
  };
}

// 한 줄 요약 (상태 막대용). 가게가 없으면 빈 문자열.
export function innLine(g) {
  const inn = myInn(g);
  if (!inn) return '';
  return `${innTitle(inn)}${inn.gens > 1 ? ` ${inn.gens}대째` : ''}: 지난달 손님 ${inn.last.guests}명, 벌이 은화 ${inn.last.net}닢${inn.arrears ? `, 외상 ${inn.arrears}닢` : ''}`;
}
