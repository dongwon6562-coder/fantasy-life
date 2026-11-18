// 화면용: 밑바닥 살이와 베풂·부림을 한 번에.
import { L } from '../adventure/core.js';
import { P, mi, here, placeName, isSlum, hasPoorhouse, crowdOf, broke, onStreet, SLUM_FOLK } from './core.js';
import { BOND_KINDS } from './bond.js';
import { ALMS, BIND_COST, bondsmenOf } from './rich.js';

const HUNGER = ['배는 견딜 만하다', '배가 고프다', '며칠 굶었다', '굶주려 쓰러질 듯하다'];

export function poorStatus(g) {
  const p = P(g), pl = here(g), b = p.bond;
  return {
    place: pl, placeName: placeName(pl), slum: isSlum(pl), poorhouse: hasPoorhouse(g, pl), crowd: crowdOf(pl),
    broke: broke(g), street: onStreet(g), sleep: L(g).home,
    hunger: p.hunger, hungerWord: HUNGER[Math.min(3, p.hunger)],
    streetMonths: p.streetMonths, lowMonths: p.lowMonths, lowest: p.lowest ? { year: p.lowest.y, place: p.lowest.place, placeName: placeName(p.lowest.place) } : null,
    risen: p.risen,
    begged: p.begged, beggedTotal: p.beggedTotal, labored: p.labored, soup: p.soup,
    boss: p.boss[pl] ?? null,
    folk: SLUM_FOLK.filter((f) => p.friends[f.id] != null).map((f) => ({ id: f.id, name: f.name, desc: f.desc, bond: p.friends[f.id] })),
    bond: b ? { owed: b.owed, place: b.place, placeName: placeName(b.place), master: b.master, kind: b.kind, name: BOND_KINDS[b.kind]?.name ?? '노역장', months: mi(g) - b.start, here: pl === b.place } : null,
    bonded: p.bonded, fled: p.fled,
    given: p.given,
    charity: Object.entries(p.charity).map(([place, n]) => ({ place, placeName: placeName(place), times: n })),
    built: Object.entries(p.built).map(([place, year]) => ({ place, placeName: placeName(place), year })),
    bondsmen: bondsmenOf(g), hired: p.hired, squeezed: p.squeezed,
    costs: { ...ALMS, bind: BIND_COST },
    log: p.log.slice(0, 12),
  };
}

// 한 줄 요약 (상태 막대용). 밑바닥과 상관없으면 빈 문자열.
export function poorLine(g) {
  const p = P(g), b = p.bond;
  if (b) return `${placeName(b.place)} ${BOND_KINDS[b.kind]?.name ?? '노역장'} 빚 노예, 남은 빚 은화 ${b.owed}닢`;
  if (onStreet(g)) return `길바닥 ${p.streetMonths}달째, ${HUNGER[Math.min(3, p.hunger)]}`;
  if (p.bondsmen.length) return `빚으로 묶어 부리는 사람 ${p.bondsmen.length}명`;
  return '';
}
