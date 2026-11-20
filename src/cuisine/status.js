// 화면용: 익힌 맛, 부엌 자리, 내 요리, 시식관, 경쟁자, 세상의 이름난 요리를 한 번에.
import { CU, here, placeName, cookSkill, cookPower, TASTE, BASES, POSTS, postTitle, palateCount, atPost, dishName, fullDish, dishWord, fameWord, famous } from './core.js';

export function cuisineStatus(g) {
  const s = CU(g), p = s.post;
  return {
    skill: Math.round(cookSkill(g)), power: Math.round(cookPower(g)), fame: Math.round(s.fame), fameWord: fameWord(s.fame),
    palate: Object.keys(s.palate).map((pl) => ({ place: pl, placeName: placeName(pl), ing: TASTE[pl].ing, taste: TASTE[pl].taste })),
    palateCount: palateCount(g), here: TASTE[here(g)] ? { ing: TASTE[here(g)].ing, taste: TASTE[here(g)].taste, known: !!s.palate[here(g)] } : null,
    post: p ? {
      kind: p.kind, name: POSTS[p.kind].name, title: postTitle(p), rank: p.rank, place: p.place, placeName: placeName(p.place), lord: p.lord,
      favor: Math.round(p.favor), months: p.months, here: atPost(g), next: p.rank < 2 ? { title: POSTS[p.kind].ranks[p.rank + 1], skill: POSTS[p.kind].need[p.rank + 1] } : null,
    } : null,
    dishes: s.dishes.map((d) => ({ id: d.id, name: fullDish(d), plain: dishName(d.base, d.place), base: BASES[d.base].name, place: d.place, quality: d.q, fame: Math.round(d.fame), word: dishWord(d), famous: famous(d), by: d.by, gen: d.gen, served: d.served })),
    taster: s.taster ? { name: s.taster.name, months: s.taster.months, loyal: Math.round(s.taster.loyal) } : null,
    rival: s.rival ? { name: s.rival.name, grudge: Math.round(s.rival.grudge) } : null,
    world: s.world.map((w) => ({ ...w, placeName: placeName(w.place) })),
    won: s.won, lost: s.lostC, feasts: s.feasts, served: s.served, chief: !!s.chief,
    past: s.past.map((x) => ({ ...x })),
    log: s.log.slice(0, 12),
  };
}

// 한 줄 요약 (상태 막대용). 부엌 자리도 내 요리도 없으면 빈 문자열.
export function cuisineLine(g) {
  const s = CU(g), bits = [];
  if (s.post) bits.push(`${placeName(s.post.place)} ${postTitle(s.post)}`);
  const top = s.dishes.filter(famous).map(fullDish);
  if (top.length) bits.push(`이름난 요리: ${top.join(', ')}`);
  else if (s.dishes.length) bits.push(`내 요리 ${s.dishes.length}가지`);
  return bits.join(' · ');
}
