// 화면용: 말린 약초, 처방 장부, 약 보따리, 약방, 이름난 처방, 이 고장 이 철에 나는 약초.
import { AP, shop, atShop, herbCount, satchelCount, canBrew, namedOf, remedyName, shopCost, shopTown, fameWord, here, placeName, herbSkill, HERBS, HERB_IDS, herbsHere, RECIPES, RECIPE_IDS } from './core.js';
import { J } from '../narrative/text.js';

export function apothecaryStatus(g) {
  const s = AP(g), p = shop(g);
  return {
    skill: Math.round(herbSkill(g)),
    here: herbsHere(g).map((id) => ({ id, name: HERBS[id].name, line: HERBS[id].line })),
    herbs: HERB_IDS.filter((id) => s.herbs[id]).map((id) => ({ id, name: HERBS[id].name, count: s.herbs[id] })), herbCount: herbCount(g),
    book: RECIPE_IDS.filter((id) => s.book[id]).map((id) => ({ id, name: remedyName(id, namedOf(g, id)), made: s.book[id] - 1, canBrew: canBrew(g, id), need: Object.entries(RECIPES[id].need).map(([h, n]) => ({ id: h, name: HERBS[h].name, n })), poison: !!RECIPES[id].poison })),
    satchel: RECIPE_IDS.filter((id) => s.satchel[id]).map((id) => ({ id, name: remedyName(id, namedOf(g, id)), count: s.satchel[id] })), satchelCount: satchelCount(g),
    shop: p ? {
      name: p.name, place: p.place, placeName: placeName(p.place), here: atShop(g), fame: Math.round(p.fame), fameWord: fameWord(p.fame), price: p.price, cut: p.cut, last: p.last, gens: p.gens, by: p.by,
      stock: RECIPE_IDS.filter((id) => p.stock[id]).map((id) => ({ id, name: remedyName(id, namedOf(g, id)), count: p.stock[id] })),
    } : null,
    canOpenHere: !p && shopTown(here(g)) ? shopCost(here(g)) : null,
    named: s.named.map((n) => ({ id: n.id, name: `${n.by}네 ${RECIPES[n.id].name}`, by: n.by, gen: n.gen, since: n.since, fame: Math.round(n.fame) })),
    doctor: s.doctor ? { name: s.doctor.name, grudge: Math.round(s.doctor.grudge) } : null,
    gathered: s.gathered, brewed: s.brewed, sold: s.sold, cured: s.cured, harmed: s.harmed,
    past: s.past.map((x) => ({ ...x })),
    log: s.log.slice(0, 12),
  };
}

// 한 줄 요약 (상태 막대용). 약방도 약도 없으면 빈 문자열.
export function apothecaryLine(g) {
  const s = AP(g), p = shop(g), bits = [];
  if (p) bits.push(`${J(p.name, '은/는')} ${fameWord(p.fame)}`);
  if (satchelCount(g)) bits.push(`약 보따리 ${satchelCount(g)}첩`);
  if (s.named.length) bits.push(`이름난 처방: ${s.named.map((n) => `${n.by}네 ${RECIPES[n.id].name}`).join(', ')}`);
  return bits.join(' · ');
}
