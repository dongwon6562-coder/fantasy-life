// 화면용: 농가, 밭마다의 형편, 곳간과 시세, 이웃.
import { FM, farm, atFarm, capacity, barnTotal, cropPrice, mi, placeName, farmSkill, farmland, here, regionCrop, fieldPrice, leaseFee, soilWord, waterWord, CROPS, CROP_IDS, SEEDS } from './core.js';
import { ripeAt } from './life.js';
import { J } from '../narrative/text.js';

export function farmStatus(g) {
  const s = FM(g), f = farm(g), now = mi(g);
  return {
    skill: Math.round(farmSkill(g)), canFarm: farmland(here(g)), fieldPrice: farmland(here(g)) ? fieldPrice(here(g)) : null, leaseFee: farmland(here(g)) ? leaseFee(here(g)) : null,
    prices: CROP_IDS.map((id) => ({ id, name: CROPS[id].name, price: cropPrice(g, id, f?.place ?? here(g)), sow: CROPS[id].sow, line: CROPS[id].line })),
    farm: f ? {
      name: f.name, place: f.place, placeName: placeName(f.place), here: atFarm(g), gens: f.gens, since: f.since,
      hands: f.hands, oxen: f.oxen, capacity: capacity(f), seed: SEEDS[f.seed].name, water: Math.round(f.water), waterWord: waterWord(f.water),
      year: Math.round(regionCrop(g, f.place) * 100) / 100,
      fields: f.fields.map((x) => ({
        id: x.id, crop: x.crop ? CROPS[x.crop].name : null, last: x.last ? CROPS[x.last].name : null, soil: Math.round(x.soil), soilWord: soilWord(x.soil),
        care: Math.round(x.care * 10) / 10, monthsLeft: x.crop ? Math.max(0, ripeAt(x) - now) : null, tenant: x.tenant, leased: x.leased, seed: SEEDS[x.seed].name,
      })),
      barn: CROP_IDS.filter((id) => f.barn[id]).map((id) => ({ id, name: CROPS[id].name, sacks: f.barn[id], value: Math.round(f.barn[id] * cropPrice(g, id, f.place)) })),
      barnTotal: barnTotal(f),
    } : null,
    neighbor: s.neighbor ? { name: s.neighbor.name, grudge: Math.round(s.neighbor.grudge) } : null,
    worked: s.worked, sold: s.sold, reaped: s.reaped,
    past: s.past.map((x) => ({ ...x })),
    log: s.log.slice(0, 12),
  };
}

// 한 줄 요약 (상태 막대용). 농가가 없으면 빈 문자열.
export function farmLine(g) {
  const f = farm(g);
  if (!f) return '';
  const gr = f.fields.filter((x) => x.crop).length;
  return `${J(f.name, '은/는')} 밭 ${f.fields.length}뙈기${gr ? `(${gr}뙈기에 곡식이 섰다)` : ''}, 곳간 ${barnTotal(f)}자루`;
}
