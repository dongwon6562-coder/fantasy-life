// 약초꾼과 약방: 상태와 도우미.
// - 숲에서 약초 캐기(actions의 herbs)와 약초사 일자리(jobs·craft), 병과 치료(health), 연금술사 물약(vocation)은 그대로 둔다.
//   여기서는 그 위에 얹는다: 고장·철마다 다른 약초를 찾아 말려 두기, 처방 익히기와 약 달이기, 내 약방 열기와 값 매기기,
//   의원·사제와의 다툼, 가짜 약과 독, 돌림병 때의 약값, 이름난 처방이 대를 넘기.
// - 병의 힘(어느 병에 얼마나 듣나)은 health의 KINDS를 따른다. 식구에게 내 약을 먹이면 health의 치료로 들어간다.
// 상태는 game.apoth 하나: { herbs{}, satchel{}, book{}, shop, named[], log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { regionOf } from '../nature/state.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const herbSkill = (g) => g.player.skills?.herbs ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 67) ^ Math.imul(mi(g) * 103 + salt + 47, 2654435761)) | 0 });
export const isPlace = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
export const shopTown = (pl) => (PLACES[pl]?.house ?? 0) >= 120 && isPlace(pl);

// 약초: 나는 지방(nature 지방), 나는 달, 장터 값
export const HERBS = {
  willow: { name: '버드나무 껍질', regions: ['south', 'river', 'lake'], months: [3, 4, 5, 6, 7, 8, 9, 10], price: 1, line: '강가 버드나무의 속껍질. 씹으면 쓰고 열이 내린다.' },
  wormwood: { name: '쑥', regions: ['south', 'north', 'east', 'holy'], months: [4, 5, 6, 7], price: 1, line: '들판 어디에나 있다. 알아보는 눈만 있으면.' },
  moss: { name: '늪 이끼', regions: ['river', 'lake', 'forest'], months: [6, 7, 8, 9], price: 2, line: '물가 그늘에서 긁어낸다. 배앓이를 멎게 한다.' },
  gentian: { name: '용담 뿌리', regions: ['mountain', 'north', 'forest'], months: [9, 10, 11], price: 3, line: '산비탈에서 캔다. 쓰기로는 이만한 것이 없다.' },
  frost: { name: '서리꽃', regions: ['north', 'mountain'], months: [12, 1, 2], price: 4, line: '눈 속에서만 피는 흰 꽃. 기침을 가라앉힌다.' },
  aloe: { name: '사막 알로에', regions: ['coast', 'holy'], months: [5, 6, 7, 8, 9], price: 2, line: '남쪽 바닷가 모래땅의 두툼한 잎. 상처에 바른다.' },
  poppy: { name: '흰 양귀비', regions: ['holy', 'east'], months: [6, 7], price: 5, line: '진통에 듣는다. 많이 쓰면 사람을 잡아먹는다.' },
  mushroom: { name: '은방울버섯', regions: ['forest', 'south'], months: [9, 10], price: 3, line: '가을 숲 그늘의 은빛 버섯. 늙은 약초꾼들은 역병에 쓴다.' },
  nightshade: { name: '검은 가시풀', regions: ['forest', 'mountain'], months: [8, 9, 10], price: 6, line: '열매가 까맣고 달다. 아이들이 따 먹다 죽는다.' },
};
export const HERB_IDS = Object.keys(HERBS);
export const herbsHere = (g, pl = here(g), m = g.date.month) => HERB_IDS.filter((id) => HERBS[id].regions.includes(regionOf(pl)) && HERBS[id].months.includes(m));

// 처방: 드는 약초, 듣는 병(health KINDS id → 힘), 다치면 쓰는가, 한 첩 값, 필요한 약초 솜씨
export const RECIPES = {
  fever: { name: '열내림 달임', need: { willow: 2, wormwood: 1 }, cures: { fever: 0.55, flux: 0.25 }, price: 4, skill: 15, line: '버드나무 껍질과 쑥을 반나절 달인다.' },
  salve: { name: '상처 고약', need: { aloe: 1, wormwood: 1 }, cures: { rot: 0.5 }, wound: true, price: 4, skill: 15, line: '찧은 잎을 기름에 개어 굳힌다.' },
  gut: { name: '배앓이 가루', need: { moss: 2, gentian: 1 }, cures: { flux: 0.6, fever: 0.15 }, price: 5, skill: 25, line: '말린 이끼와 용담을 곱게 빻는다.' },
  cough: { name: '서리꽃 시럽', need: { frost: 1, wormwood: 1 }, cures: { lung: 0.55 }, price: 6, skill: 30, line: '서리꽃을 꿀에 재워 졸인다.' },
  sleep: { name: '잠 오는 물약', need: { poppy: 2 }, cures: {}, wound: true, price: 9, skill: 35, line: '양귀비 진을 묽게 탄다. 아픔을 잊게 하지만 버릇이 든다.' },
  ward: { name: '역병 막이 탕', need: { mushroom: 1, gentian: 1, frost: 1 }, cures: { plague: 0.35, lung: 0.2 }, price: 10, skill: 45, line: '세 가지 쓴 것을 한 솥에 사흘 끓인다.' },
  bane: { name: '검은 물방울', need: { nightshade: 2 }, cures: {}, poison: true, price: 30, skill: 40, line: '검은 가시풀 열매를 짜서 졸인다. 냄새도 맛도 없다.' },
};
export const RECIPE_IDS = Object.keys(RECIPES);
export const START_RECIPES = ['fever', 'salve'];
export const remedyName = (id, named) => (named ? `${named.by}네 ${RECIPES[id].name}` : RECIPES[id].name);

const RIVAL_DOCTORS = ['조합 의원 바르텔', '왕도에서 온 의원 페르디난트', '늙은 의원 아우구스트'];
export const doctorName = (rng) => rng.pick(RIVAL_DOCTORS);
const QUACKS = ['푸른 병의 약장수 질바', '만병통치약 장수 모리츠', '떠돌이 약장수 쌍둥이'];
export const quackName = (rng) => rng.pick(QUACKS);
const SHOP_NAMES = ['쑥 향기 약방', '버드나무 약방', '흰 절구 약방', '늙은 약초꾼의 집', '초록 문 약방', '세 개의 약단지'];
export const shopCost = (pl) => Math.round(60 + (PLACES[pl]?.house ?? 200) * 0.35);

function fresh() {
  return { herbs: {}, satchel: {}, book: {}, shop: null, named: [], log: [], past: [], seq: 1, eventAt: 0, gathered: 0, brewed: 0, sold: 0, cured: 0, harmed: 0, poisons: 0, doctor: null };
}
export const AP = (g) => (g.apoth ??= fresh());
export const shop = (g) => AP(g).shop;
export const atShop = (g) => !!shop(g) && shop(g).place === here(g) && !L(g).travel;
export const knowsRx = (g, id) => !!AP(g).book[id];
export const herbCount = (g) => HERB_IDS.reduce((a, id) => a + (AP(g).herbs[id] ?? 0), 0);
export const satchelCount = (g) => RECIPE_IDS.reduce((a, id) => a + (AP(g).satchel[id] ?? 0), 0);
export const canBrew = (g, id) => knowsRx(g, id) && herbSkill(g) >= RECIPES[id].skill * 0.8 && Object.entries(RECIPES[id].need).every(([h, n]) => (AP(g).herbs[h] ?? 0) >= n);
export const namedOf = (g, id) => AP(g).named.find((n) => n.id === id) ?? null;
// 약 한 첩의 힘: 처방의 힘 × (솜씨) × 이름난 처방이면 조금 더
export const rxPower = (g, id, kind) => {
  const base = RECIPES[id]?.cures[kind] ?? 0;
  if (!base) return 0;
  return Math.round(clamp(base * (0.6 + herbSkill(g) / 120) * (namedOf(g, id) ? 1.1 : 1), 0, 0.9) * 100) / 100;
};
export const fameWord = (v) => (v >= 70 ? '먼 고장에서도 찾아오는 약방' : v >= 45 ? '믿고 찾는 약방' : v >= 20 ? '동네 약방' : '아직 아무도 모르는 약방');

export function logApo(g, text) {
  const s = AP(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
export function newShop(g, rng) {
  return { place: here(g), name: rng ? rng.pick(SHOP_NAMES) : SHOP_NAMES[0], stock: {}, fame: 10, price: 'fair', cut: false, since: mi(g), gens: 1, by: g.player.name, last: 0 };
}
const cleanCounts = (o, ids) => { const out = {}; if (o && typeof o === 'object' && !Array.isArray(o)) for (const k of Object.keys(o)) if (ids.includes(k) && Number.isFinite(o[k]) && o[k] > 0) out[k] = Math.min(99, Math.round(o[k])); return out; };

HOOKS.newGame.push((g) => { g.apoth = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.apoth && typeof g.apoth === 'object' ? g.apoth : {});
  for (const k of ['log', 'named', 'past']) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of ['seq', 'eventAt', 'gathered', 'brewed', 'sold', 'cured', 'harmed', 'poisons']) if (!Number.isFinite(s[k])) s[k] = k === 'seq' ? 1 : 0;
  s.herbs = cleanCounts(s.herbs, HERB_IDS);
  s.satchel = cleanCounts(s.satchel, RECIPE_IDS);
  const book = {};
  if (s.book && typeof s.book === 'object') for (const k of Object.keys(s.book)) if (RECIPES[k] && s.book[k]) book[k] = Number.isFinite(s.book[k]) ? s.book[k] : 1;
  s.book = book;
  s.named = s.named.filter((n) => n && RECIPES[n.id] && typeof n.by === 'string').slice(0, 7);
  for (const n of s.named) for (const k of ['gen', 'fame', 'since']) if (!Number.isFinite(n[k])) n[k] = k === 'gen' ? 1 : 0;
  if (s.doctor && (typeof s.doctor !== 'object' || typeof s.doctor.name !== 'string' || !Number.isFinite(s.doctor.grudge))) s.doctor = null;
  const p = s.shop;
  if (p && (typeof p !== 'object' || !shopTown(p.place))) s.shop = null;
  if (s.shop) {
    if (typeof p.name !== 'string') p.name = SHOP_NAMES[0];
    if (typeof p.by !== 'string') p.by = g.player?.name ?? '이름 모를 약초꾼';
    p.stock = cleanCounts(p.stock, RECIPE_IDS);
    for (const k of ['fame', 'since', 'gens', 'last']) if (!Number.isFinite(p[k])) p[k] = k === 'gens' ? 1 : k === 'fame' ? 10 : 0;
    p.fame = clamp(p.fame, 0, 100);
    if (!['cheap', 'fair', 'dear'].includes(p.price)) p.price = 'fair';
    p.cut = !!p.cut;
  }
  g.apoth = s;
});
