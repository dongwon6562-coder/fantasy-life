// 화면용: 용병단, 깃발, 맞수, 식구를 한 번에.
import { S, myCo, mi, here, placeName, realmShort, SIGNS, SPLITS, LOOTS, ROLES, famWord, wagesOf, coPow, waiting, FOUND_COST } from './core.js';
import { contractHere } from './life.js';
import { J } from '../narrative/text.js';

const KIND_NAME = { war: '전쟁', guard: '상단 호위', lord: '영주의 싸움', beast: '마물 토벌' };
export function companyStatus(g) {
  const s = S(g), c = myCo(g), b = s.banner;
  const k = c?.contract;
  return {
    foundCost: FOUND_COST,
    company: c ? {
      name: c.name, sign: SIGNS[c.sign].sign, place: c.place, placeName: placeName(c.place), regent: c.regent ?? null,
      men: c.men, drill: Math.round(c.drill), morale: Math.round(c.morale), chest: Math.round(c.chest), wages: wagesOf(c), owed: Math.round(c.owed ?? 0),
      fame: Math.round(c.fame), fameWord: famWord(c.fame), power: Math.round(coPow(c)),
      split: { id: c.split, name: SPLITS[c.split].name, text: SPLITS[c.split].text }, loot: { id: c.loot, name: LOOTS[c.loot].name, text: LOOTS[c.loot].text },
      vets: c.vets.map((v) => ({ id: v.id, name: v.name, role: ROLES[v.role], skill: Math.round(v.skill), loyal: Math.round(v.loyal) })),
      battles: c.battles, won: c.won, lost: c.lost, dead: c.dead, since: c.since,
      contract: k ? {
        kind: k.kind, kindName: KIND_NAME[k.kind], by: k.by, side: k.side ? realmShort(k.side) : null, foe: k.foe ? realmShort(k.foe) : null,
        where: k.where, whereName: placeName(k.where), started: !!k.started, here: contractHere(g), left: k.left, months: k.months, pay: k.pay, bonus: k.bonus,
        danger: k.danger, won: k.won, lost: k.lost, unpaid: k.unpaid ?? 0, rival: k.rival ? (s.rivals.find((r) => r.id === k.rival)?.name ?? null) : null,
      } : null,
      foughtThisMonth: c.foughtAt === mi(g),
    } : null,
    banner: b ? { name: b.name, sign: SIGNS[b.sign].sign, motto: b.motto, founder: b.founder, founded: b.founded, gens: b.gens, holder: b.holder ?? null, honors: b.honors.map((h) => ({ ...h })), stains: b.stains, raised: b.raised } : null,
    rivals: s.rivals.map((r) => ({ id: r.id, name: r.name, captain: r.captain, fame: Math.round(r.fame), fameWord: famWord(r.fame), grudge: Math.round(r.grudge) })),
    families: s.families.map((f) => ({ id: f.id, dead: f.dead, kin: f.kin, placeName: placeName(f.place), vet: !!f.vet, maimed: !!f.maimed, helped: f.helped, pension: !!f.pension })),
    waiting: waiting(g).length,
    contracts: s.contracts, battles: s.battles, won: s.won, dead: s.dead, turned: s.turned, sacks: s.sacks,
    hunted: Object.entries(s.hunted).filter(([, until]) => until >= mi(g)).map(([id, until]) => ({ realm: realmShort(id), monthsLeft: until - mi(g) })),
    past: s.past.map((x) => ({ ...x })),
    log: s.log.slice(0, 12),
    here: here(g),
  };
}

// 한 줄 요약 (상태 막대용). 용병단이 없으면 빈 문자열.
export function companyLine(g) {
  const c = myCo(g);
  if (!c) return '';
  if (c.regent) return `${c.name}: ${J(c.regent, '이/가')} 맡아 지키는 중, 창병 ${c.men}명`;
  const k = c.contract;
  return `${c.name}: 창병 ${c.men}명, ${k ? `${k.by}의 ${KIND_NAME[k.kind]} 계약 ${k.left}달 남음` : '계약 없음'}, 사기 ${c.morale >= 60 ? '높음' : c.morale >= 35 ? '보통' : '바닥'}`;
}
