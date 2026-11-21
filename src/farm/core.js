// 내 농장 일구기: 상태와 도우미.
// - 농부 일자리(jobs의 farmer, craft의 밭 돌보기와 곳간)와 nature의 봄 파종 품팔이, estate의 밭 세놓기(은화 세)는 그대로 둔다.
//   여기서는 내 땅을 가진 농사꾼의 살림을 얹는다: 밭 사고 늘리기, 남의 땅 빌려 짓기(소작 받기), 내 밭 소작 주기(타작 몫),
//   작물과 돌려짓기, 씨앗 고르기, 품꾼과 소, 거두고 팔 때와 쟁여 둘 때, 물길 다툼, 대를 잇는 땅.
// - 소출은 nature의 그해 소출(crop[지방])과 재앙을 따른다. 값은 나라의 밀값(world priceIndex)과 철을 따른다.
// 상태는 game.farm 하나: { farm: { place, fields[], hands, oxen, barn{}, water, ... } | null, skill?, log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { NS, REGIONS, regionOf, activeAt } from '../nature/state.js';
import { priceIndex } from '../world.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const farmSkill = (g) => g.player.skills?.farming ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul(mi(g) * 101 + salt + 43, 2654435761)) | 0 });
export const isPlace = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
export const farmland = (pl) => isPlace(pl) && !!REGIONS[regionOf(pl)]?.farm;
export const regionCrop = (g, pl) => NS(g).crop?.[regionOf(pl)] ?? 1;

// 작물: 장터 값(자루당), 밭 한 뙈기 소출(자루), 땅심을 얼마나 먹나(-) 살리나(+), 뿌리는 달, 거두기까지 달 수
export const CROPS = {
  wheat: { name: '밀', price: 4, yield: 9, soil: -12, sow: [3, 4, 10], grow: 5, line: '빵이 되는 곡식. 값이 좋은 대신 땅을 많이 먹는다.' },
  barley: { name: '보리', price: 3, yield: 10, soil: -8, sow: [3, 4], grow: 4, line: '맥주와 죽. 어디서나 잘 자란다.' },
  rye: { name: '호밀', price: 3, yield: 8, soil: -5, sow: [9, 10], grow: 9, line: '추위를 견디는 검은 빵의 곡식. 가을에 뿌려 겨울을 난다.' },
  beans: { name: '콩', price: 2, yield: 8, soil: 12, sow: [4, 5], grow: 4, line: '값은 싸지만 지친 땅을 살린다.' },
  flax: { name: '아마', price: 6, yield: 6, soil: -14, sow: [4, 5], grow: 4, line: '천과 기름이 된다. 직조공들이 비싸게 산다.' },
};
export const CROP_IDS = Object.keys(CROPS);
// 씨앗: 소출 배수, 재앙에 견디는 정도, 밭 한 뙈기에 드는 값
export const SEEDS = {
  local: { name: '묵은 토종 씨', mul: 1, hardy: 0, cost: 0 },
  fine: { name: '골라 낸 굵은 씨', mul: 1.25, hardy: 0, cost: 4 },
  hardy: { name: '북부 내한종', mul: 0.95, hardy: 0.5, cost: 3 },
};
export const SEED_IDS = Object.keys(SEEDS);
export const MAX_FIELDS = 8;
export const HAND_WAGE = 3;
export const fieldPrice = (pl) => Math.round(60 + (PLACES[pl]?.house ?? 200) * 0.25);
export const leaseFee = (pl) => Math.round(fieldPrice(pl) * 0.12);

const LANDLORDS = ['방앗간 주인 볼프', '늙은 지주 하르트만', '수도원 땅지기 수사 안젤름', '과부 지주 엘리자', '읍장 에른스트'];
export const landlordName = (rng) => rng.pick(LANDLORDS);
const TENANTS = ['빚진 농부 마테스', '아이 다섯 둔 요르크', '떠돌다 온 부부 한스와 리나', '전쟁에서 돌아온 쿠르트', '말 없는 청년 벤'];
export const tenantName = (rng, not = []) => rng.pick(TENANTS.filter((n) => !not.includes(n))) ?? rng.pick(TENANTS);
const NEIGHBORS = ['윗마을 지주 그로스', '개울 건너 농부 바이스', '새로 이사 온 부농 렌츠', '물레방아를 가진 오토'];
export const neighborName = (rng) => rng.pick(NEIGHBORS);
const FARM_NAMES = ['개울가 밭', '느릅나무 언덕 농장', '돌담 농가', '버드나무 들', '남쪽 비탈 농장', '까마귀 들 농가'];

function fresh() {
  return { farm: null, worked: 0, sold: 0, reaped: 0, log: [], past: [], seq: 1, eventAt: 0, neighbor: null };
}
export const FM = (g) => (g.farm ??= fresh());
export const farm = (g) => FM(g).farm;
export const atFarm = (g) => !!farm(g) && farm(g).place === here(g) && !L(g).travel;
export const myFields = (f) => (f ? f.fields.filter((x) => !x.tenant) : []);
export const ownedFields = (f) => (f ? f.fields.filter((x) => !x.leased) : []);
export const capacity = (f) => (f ? 2 + f.hands * 2 + f.oxen * 2 : 0);   // 내 손으로 돌볼 수 있는 밭 수
export const barnTotal = (f) => (f ? CROP_IDS.reduce((a, id) => a + (f.barn[id] ?? 0), 0) : 0);
// 장터 값: 밀값, 철(거둔 뒤에는 싸고 봄에는 비싸다), 그해 지방 소출
export function cropPrice(g, id, pl = here(g)) {
  const m = g.date.month;
  const season = m >= 8 && m <= 10 ? 0.8 : m >= 3 && m <= 6 ? 1.25 : 1;
  const lean = clamp(1.4 - regionCrop(g, pl) * 0.4, 0.8, 1.3);
  return Math.max(1, Math.round(CROPS[id].price * clamp(priceIndex(g), 0.5, 2.5) * season * lean * 10) / 10);
}
export const soilWord = (v) => (v >= 80 ? '기름진 땅' : v >= 60 ? '쓸 만한 땅' : v >= 40 ? '지친 땅' : '메마른 땅');
export const waterWord = (v) => (v >= 70 ? '물길이 넉넉하다' : v >= 40 ? '물이 모자라지 않다' : v >= 20 ? '물이 늘 아쉽다' : '물길이 끊겼다');
export const disasterHere = (g, pl) => activeAt(g, pl).filter((d) => ['drought', 'flood', 'winter', 'locust'].includes(d.kind));

export function logFarm(g, text) {
  const s = FM(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
export function newField(g, extra = {}) {
  const s = FM(g);
  return { id: s.seq++, crop: null, last: null, soil: 70, sown: 0, care: 0, seed: 'local', tenant: null, leased: null, ...extra };
}
export function newFarm(g, rng) {
  return { place: here(g), name: rng ? rng.pick(FARM_NAMES) : FARM_NAMES[0], fields: [], hands: 0, oxen: 0, barn: {}, water: 60, since: mi(g), gens: 1, seed: 'local' };
}
export function emptyCheck(g, how = '땅을 다 잃었다') {
  const s = FM(g), f = s.farm;
  if (f && !f.fields.length) {
    s.past.unshift({ year: g.date.year, place: f.place, name: f.name, how });
    if (s.past.length > 6) s.past.length = 6;
    s.farm = null; logFarm(g, `${f.name}의 마지막 밭을 놓았다.`);
    return true;
  }
  return false;
}

HOOKS.newGame.push((g) => { g.farm = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.farm && typeof g.farm === 'object' ? g.farm : {});
  for (const k of ['log', 'past']) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of ['worked', 'sold', 'reaped', 'seq', 'eventAt']) if (!Number.isFinite(s[k])) s[k] = k === 'seq' ? 1 : 0;
  if (s.neighbor && (typeof s.neighbor !== 'object' || typeof s.neighbor.name !== 'string' || !Number.isFinite(s.neighbor.grudge))) s.neighbor = null;
  const f = s.farm;
  if (f && (typeof f !== 'object' || !farmland(f.place) || !Array.isArray(f.fields))) s.farm = null;
  if (s.farm) {
    if (typeof f.name !== 'string') f.name = FARM_NAMES[0];
    for (const k of ['hands', 'oxen', 'water', 'since', 'gens']) if (!Number.isFinite(f[k])) f[k] = k === 'water' ? 50 : k === 'gens' ? 1 : 0;
    f.hands = clamp(Math.round(f.hands), 0, 8); f.oxen = clamp(Math.round(f.oxen), 0, 2); f.water = clamp(f.water, 0, 100);
    if (!SEEDS[f.seed]) f.seed = 'local';
    if (!f.barn || typeof f.barn !== 'object' || Array.isArray(f.barn)) f.barn = {};
    for (const k of Object.keys(f.barn)) if (!CROPS[k] || !Number.isFinite(f.barn[k]) || f.barn[k] <= 0) delete f.barn[k]; else f.barn[k] = Math.round(f.barn[k]);
    f.fields = f.fields.filter((x) => x && typeof x === 'object').slice(0, MAX_FIELDS);
    for (const x of f.fields) {
      if (!Number.isFinite(x.id)) x.id = s.seq++;
      if (x.crop != null && !CROPS[x.crop]) x.crop = null;
      if (x.last != null && !CROPS[x.last]) x.last = null;
      if (!SEEDS[x.seed]) x.seed = 'local';
      for (const k of ['soil', 'sown', 'care']) if (!Number.isFinite(x[k])) x[k] = k === 'soil' ? 60 : 0;
      x.soil = clamp(x.soil, 5, 100); x.care = clamp(x.care, 0, 6);
      if (x.tenant != null && typeof x.tenant !== 'string') x.tenant = null;
      if (x.leased != null && typeof x.leased !== 'string') x.leased = null;
      if (x.tenant) x.crop = null;
    }
    if (!f.fields.length) { s.past.unshift({ year: g.date.year, place: f.place, name: f.name, how: '밭이 없어졌다' }); s.farm = null; }
  }
  if (s.past.length > 6) s.past.length = 6;
  g.farm = s;
});
