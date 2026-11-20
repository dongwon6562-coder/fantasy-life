// 화면용: 떼, 기르는 말, 시세, 이웃, 유목민 무리를 한 번에.
import { HD, flock, withFlock, head, priceOf, flockValue, fodderNeed, herdSkill, mi, here, placeName, pastureOf, STOCK, STOCK_IDS, SICK, BANDS, BAND_IDS, bandCamp, bandsHere, bandWord, seasonOf } from './core.js';
import { J } from '../narrative/text.js';

export function herdStatus(g) {
  const s = HD(g), f = flock(g), b = s.band;
  return {
    skill: Math.round(herdSkill(g)), pasture: pastureOf(here(g)), worked: s.worked,
    prices: STOCK_IDS.map((id) => ({ id, name: STOCK[id].name, price: priceOf(g, id) })),
    flock: f ? {
      place: f.place, placeName: placeName(f.place), here: withFlock(g),
      stock: STOCK_IDS.map((id) => ({ id, name: STOCK[id].name, count: f[id] })), head: head(f), value: flockValue(g),
      fodder: Math.round(f.fodder * 10) / 10, winterNeed: Math.round(fodderNeed(f) * 10) / 10, winterMonths: fodderNeed(f) > 0 ? Math.floor(f.fodder / fodderNeed(f)) : null,
      health: Math.round(f.health), hands: f.hands, sick: f.sick ? { name: SICK[f.sick.kind].name, left: f.sick.left } : null, gens: f.gens,
    } : null,
    steeds: s.steeds.map((h) => ({ id: h.id, name: h.name, quality: h.q, trained: Math.round(h.trained), ageYears: Math.floor((mi(g) - h.born) / 12), fame: h.fame, kept: !!h.kept })),
    neighbor: s.neighbor ? { name: s.neighbor.name, grudge: Math.round(s.neighbor.grudge) } : null,
    band: b ? { id: b.id, name: BANDS[b.id].name, chief: BANDS[b.id].chief, people: BANDS[b.id].people, standing: Math.round(b.standing), word: bandWord(b.standing), elder: !!b.elder, camp: b.camp, campName: placeName(b.camp), next: placeName(bandCamp(b.id, (g.date.month % 12) + 1)) } : null,
    bands: BAND_IDS.map((id) => ({ id, name: BANDS[id].name, people: BANDS[id].people, stock: BANDS[id].stock, camp: bandCamp(id, g.date.month), campName: placeName(bandCamp(id, g.date.month)), here: bandsHere(g).includes(id) })),
    season: seasonOf(g.date.month),
    sold: s.sold, lost: s.lost, born: s.born,
    past: s.past.map((x) => ({ ...x })),
    log: s.log.slice(0, 12),
  };
}

// 한 줄 요약 (상태 막대용). 떼도 무리도 없으면 빈 문자열.
export function herdLine(g) {
  const s = HD(g), f = flock(g), bits = [];
  if (f) bits.push(`내 떼(${placeName(f.place)}): 양 ${f.sheep}, 소 ${f.cattle}, 말 ${f.horses}${f.sick ? `, ${J(SICK[f.sick.kind].name, '이/가')} 돈다` : ''}`);
  if (s.band) bits.push(`${BANDS[s.band.id].name}의 천막`);
  return bits.join(' · ');
}
