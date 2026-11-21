// 28단계 술 빚기와 양조장 (도우미스레드4)
// 화면에서 쓰는 것: brewStatus(g), brewLine(g)
// 행동: brew_make(술을 빚는다), brew_cellar(술통을 살핀다). 장면: brew_make, brew_cellar, brew_event(ev: taxman, ban, smuggler, noble, tavern, sour, rival, festival)
import './life.js';
import './events.js';
import { BR, cellar, brewSkill, stockCount, namedOf, drinkName, banned, ageWord, caskValue, tasteWord, fameWord, placeName, capOf, taxRate, INGREDIENTS, ING_IDS, DRINKS } from './core.js';

export { BR as brewState, cellar as brewCellar, DRINKS, INGREDIENTS, caskValue, yearTaste, newCellar, atCellar } from './core.js';
export { cellarMonth } from './life.js';
export { eligible as brewEvents } from './events.js';

export function brewStatus(g) {
  const s = BR(g), p = cellar(g);
  if (!s.brewed && !s.casks.length && !p) return null;
  return {
    skill: Math.round(brewSkill(g)),
    stock: ING_IDS.filter((i) => s.stock[i]).map((i) => ({ id: i, name: INGREDIENTS[i].name, n: s.stock[i] })),
    casks: s.casks.map((c) => ({ id: c.id, drink: c.d, name: drinkName(g, c.d), year: c.y, taste: tasteWord(c.t), quality: c.q, state: ageWord(g, c), value: caskValue(g, c) })),
    cap: capOf(g),
    cellar: p ? { name: p.name, place: placeName(p.place), fame: Math.round(p.fame), fameWord: fameWord(p.fame), still: p.still, taxOwed: p.taxOwed, taxRate: Math.round(taxRate(p.place, 'ale') * 100), contract: p.contract ? { name: p.contract.name, drink: DRINKS[p.contract.d].name, left: p.contract.left } : null, last: p.last, gens: p.gens } : null,
    named: s.named.map((n) => ({ name: `${n.by}네 ${DRINKS[n.d].name}`, gen: n.gen })),
    banned: banned(g),
    brewed: s.brewed, sold: s.sold, earned: s.earned,
    log: s.log.slice(0, 6),
  };
}

export function brewLine(g) {
  const s = BR(g), p = cellar(g);
  if (!s.casks.length && !p) return null;
  const bits = [];
  if (p) bits.push(`${p.name} (${fameWord(p.fame)})`);
  bits.push(`술통 ${s.casks.length}개`);
  if (s.named.length) bits.push(s.named.map((n) => `${n.by}네 ${DRINKS[n.d].name}`).join(', '));
  if (banned(g)) bits.push('금주령');
  return bits.join(', ');
}
