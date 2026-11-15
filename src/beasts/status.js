// 화면용 한 묶음 (도우미스레드1이 짐승 화면에 쓴다).
import { B, KINDS, alive, ageOf, old, young, familiarOf, mountOf, kindName, beastPow, beastsPower, huntBonus, BOND_WORD, AGE_WORD, MAX_ANIMALS } from './core.js';
import { SHOPS, BEAST_BUYERS, buyPrice, sellPrice, canFamiliar } from './events.js';
import { L } from '../adventure/core.js';

// 짐승 초상(src/art/beastPortrait.js)에 넘길 값: beastPortrait({ ...portrait, id, name, old, wild })
const PORTRAIT = { dog: ['dog'], horse: ['horse'], warhorse: ['horse'], hawk: ['hawk'], direwolf: ['monster', 'direwolf'], shadowcat: ['monster', 'shadowcat'], wyvern: ['monster', 'drake'] };
export const portraitOf = (a) => {
  if (a.kind === 'familiar') return { kind: 'familiar', sub: a.form ?? null };
  const [kind, sub = null] = PORTRAIT[a.kind] ?? ['dog'];
  return { kind, sub };
};

export function beastsStatus(g) {
  const b = B(g);
  const place = L(g).place;
  const m = mountOf(g);
  const f = familiarOf(g);
  return {
    animals: alive(g).map((a) => ({
      id: a.id, kind: a.kind, kindName: kindName(a), name: a.name, form: a.form ?? null, portrait: portraitOf(a),
      age: Math.round(ageOf(g, a) * 10) / 10, ageWord: AGE_WORD(g, a), young: young(g, a), old: old(g, a), life: KINDS[a.kind].life.slice(),
      bond: Math.round(a.bond), bondWord: BOND_WORD(a.bond), trained: Math.round(a.trained ?? 0), tamed: (a.trained ?? 0) >= 100,
      pow: Math.round(beastPow(g, a) * 10) / 10, ride: !!KINDS[a.kind].ride, beast: !!KINDS[a.kind].beast, familiar: !!KINDS[a.kind].familiar,
      feed: KINDS[a.kind].feed, price: KINDS[a.kind].familiar ? null : sellPrice(g, a), since: a.since, desc: KINDS[a.kind].desc,
    })),
    max: MAX_ANIMALS,
    mount: m ? { id: m.id, name: m.name, kindName: kindName(m) } : null,
    familiar: f ? { id: f.id, name: f.name, form: f.form } : null,
    canFamiliar: canFamiliar(g),
    power: Math.round(beastsPower(g) * 10) / 10,
    hunt: Math.round(huntBonus(g) * 10) / 10,
    feedPerMonth: Math.round(alive(g).reduce((s, a) => s + (KINDS[a.kind].feed ?? 0), 0) * 10) / 10,
    hungry: (b.hungry ?? 0) > 0,
    shop: (SHOPS[place] ?? []).map((k) => ({ kind: k, name: KINDS[k].name, price: buyPrice(k), cub: !!KINDS[k].beast })),
    beastBuyer: BEAST_BUYERS[place] != null,
    cavalry: alive(g).some((a) => a.kind === 'warhorse' && (a.trained ?? 0) >= 100),
    lost: b.lost.slice(-10),
    sold: b.sold,
    log: b.log.slice(-12),
  };
}
