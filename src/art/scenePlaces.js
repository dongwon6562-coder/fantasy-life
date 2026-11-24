// 장소마다 어떤 풍경을 그릴지 정한다: 땅 모양(biome), 사는 이들(culture), 마을 크기, 눈에 띄는 건물.
// 지도 자료(mapdata.js)의 자리와 종류에서 알아내므로, 지도에 있는 곳이면 어디든 그에 맞는 풍경이 나온다.
import { P, TERRAIN, continents, innerSeas, nations } from './mapdata.js';
import { strSeed } from './sceneKit.js';

function inside(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeDist(x, y, poly) {
  let best = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], ay = poly[j][1], bx = poly[i][0], by = poly[i][1];
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
  }
  return best;
}
const inTerrain = (k, x, y, pad = 0) => (TERRAIN[k] || []).some(([, poly]) => inside(x, y, poly) || (pad && edgeDist(x, y, poly) < pad));

const CULTURE = { leonia: 'leonia', serenia: 'serenia', valhart: 'empire', holy: 'holy', free: 'free', march: 'march', elf: 'elf', beast: 'beast', dragonrealm: 'dragon', dwarf: 'dwarf', red: 'demon', dusk: 'demon', silent: 'demon', sea: 'sea' };
const SIZE = { capital: 'capital', city: 'city', town: 'village', fort: 'fort', site: 'site', dungeon: 'site', ruin: 'ruin' };

// 손으로 정해 둔 곳 (게임에서 실제로 머무는 곳들)
const HAND = {
  ern: { size: 'hamlet', biome: 'plain', feature: 'windmill', river: true, houses: 20 },
  gruental: { size: 'hamlet', biome: 'plain', feature: 'manor', river: true, houses: 16, vines: true },
  harfen: { size: 'town', biome: 'plain', feature: 'church', wall: true, houses: 44 },
  verden: { size: 'town', biome: 'plain', feature: 'keep', wall: true, houses: 34, mount: true },
  leocast: { size: 'capital', biome: 'plain', feature: 'castle', wall: true, white: true, houses: 78, river: true },
  eisen: { size: 'capital', biome: 'plain', feature: 'citadel', wall: true, houses: 78, river: true },
  solaris: { size: 'capital', biome: 'plain', feature: 'cathedral', wall: true, white: true, houses: 66 },
  serenia: { size: 'capital', biome: 'lake', feature: 'towers', houses: 46 },
  barka: { size: 'city', biome: 'coast', feature: 'endless', wall: true, houses: 56 },
  graubel: { size: 'capital', biome: 'cold', feature: 'bastion', wall: true, houses: 52, coast: true },
  // 11단계: 탑과 병영
  noah: { feature: 'wizardtower', houses: 0 }, spire: { feature: 'wizardtower', houses: 3 }, lich: { feature: 'wizardtower', houses: 2 },
  tower: { feature: 'endless', houses: 8 },
  ort: { camp: true, houses: 30, zoom: 1.5, span: 420 }, stellen: { camp: true, houses: 38, zoom: 1.5, span: 480 }, wolffort: { camp: true, houses: 26, zoom: 1.5, span: 400 }, grey: { camp: true, houses: 26, zoom: 1.5, span: 400 }, wall: { camp: true, houses: 24, zoom: 1.5, span: 400 },
  barracks: { camp: true, houses: 54, zoom: 1.4, span: 560 },
  estella: { size: 'ruin', biome: 'cold', feature: 'ruinpalace', houses: 26 },
  // 44단계: 새 고장 (src/lands). 지도 자리에서 나오는 풍경에 고장다운 것만 얹는다
  milles: { size: 'village', feature: 'windmill', river: true, vines: true, houses: 32 },
  rosen: { size: 'town', feature: 'castle', wall: true, houses: 40 },
  roten: { size: 'city', biome: 'hills', feature: 'citadel', wall: true, mount: true, houses: 52 },
  stein: { size: 'city', feature: 'fortress', wall: true, coast: true, houses: 40 },
  abel: { size: 'village', feature: 'church', white: true, houses: 30 },
  riana: { size: 'hamlet', feature: 'church', white: true, houses: 12 },
  luen: { size: 'village', biome: 'lake', houses: 22 },
  scholae: { size: 'town', feature: 'towers', houses: 40 },
  krossen: { size: 'city', feature: 'church', wall: true, houses: 58 },
  libera: { size: 'capital', feature: 'cathedral', coast: true, river: true, wall: true, houses: 72 },
  kalten: { size: 'village', feature: 'keep', wall: true, houses: 16 },
  wolfwood: { size: 'hamlet', houses: 14 },
  iela: { size: 'capital', zoom: 1.3 },
};
const COAST = new Set(['klein', 'portel', 'stein', 'kars', 'maren', 'salt', 'wall', 'cape', 'nocturna', 'post', 'barracks', 'silver', 'light', 'crow', 'saltmare', 'pearl', 'slaveisle', 'coral', 'kraken', 'noah', 'libera']);

const memo = new Map();
/** 장소 id → 풍경 설명 */
export function describe(id) {
  if (memo.has(id)) return memo.get(id);
  const p = P.find((q) => q.id === id);
  const hand = HAND[id] || {};
  const d = { id, seed: strSeed(String(id)) % 90000 + 1000, size: 'village', biome: 'plain', culture: 'leonia', feature: null, wall: false, white: false, river: false, coast: false, houses: 26 };
  if (p) {
    const nat = nations.find((N) => p.realm === N.name || (p.realm || '').startsWith(N.name));
    d.culture = nat ? CULTURE[nat.id] : p.area === '잊힌 땅' ? 'lost' : p.area === '마대륙' ? 'demon' : p.area === '대삼림' ? 'elf' : p.area === '천룡 산맥' ? 'dragon' : p.area === '남해 군도' ? 'sea' : 'leonia';
    d.size = SIZE[p.t] || 'village';
    if (p.tier === 3 && d.size === 'village') d.size = 'hamlet';
    const { x, y } = p;
    const cont = continents.find((c) => inside(x, y, c.pts));
    const shore = Math.min(cont ? edgeDist(x, y, cont.pts) : 0, ...innerSeas.map(([, poly]) => edgeDist(x, y, poly)));
    d.coast = COAST.has(id) || shore < 14;
    d.biome = d.culture === 'sea' ? 'island'
      : inTerrain('swamp', x, y, 8) ? 'swamp'
      : inTerrain('mountain', x, y) ? 'mountain'
      : inTerrain('scorch', x, y) || inTerrain('ash', x, y) ? 'ash'
      : inTerrain('blight', x, y) ? 'blight'
      : inTerrain('cold', x, y) ? 'cold'
      : inTerrain('forest', x, y) || inTerrain('deadwood', x, y) ? 'forest'
      : inTerrain('dry', x, y) ? 'dry'
      : d.coast ? 'coast' : inTerrain('hill', x, y) ? 'hills' : 'plain';
    if (d.culture === 'elf' && d.biome !== 'coast') d.biome = 'forest';
    if (d.culture === 'demon' && d.biome !== 'ash' && d.biome !== 'mountain') d.biome = 'blight';
    d.wall = d.size === 'capital' || d.size === 'city' || d.size === 'fort';
    d.houses = { capital: 64, city: 44, village: 24, hamlet: 14, fort: 10, site: 4, ruin: 18 }[d.size];
    if (p.t === 'dungeon') d.feature = 'dungeon';
  } else if (!HAND[id]) {
    d.wall = true; d.size = 'town';
  }
  Object.assign(d, hand);
  if (d.feature == null && ['elf', 'beast', 'dwarf', 'demon', 'dragon'].includes(d.culture)) d.feature = d.culture === 'demon' && d.wall ? 'demonkeep' : d.size === 'ruin' ? 'ruins' : 'none';
  if (d.feature == null) d.feature = { capital: 'keep', city: 'church', fort: 'fortress', ruin: 'ruins', site: 'shrine' }[d.size] ?? 'church';
  memo.set(id, d);
  return d;
}
