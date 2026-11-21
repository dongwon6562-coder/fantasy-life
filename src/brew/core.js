// 술 빚기와 양조장: 상태와 도우미.
// - 주점(inn)은 술을 파는 가게, 농장(farm)은 보리를 거두는 곳이다. 여기서는 그 사이: 재료를 모아 술을 빚고, 통에 묵히고, 내 술도가를 연다.
//   고장마다 나는 재료와 그 고장 술이 다르고, 해마다 맛이 다르다(그해 소출, nature). 주점·귀족에 대고, 술 세금과 밀주, 흉년의 금주령, 이름난 술의 대 잇기.
// 상태는 game.brew 하나: { stock{}, casks[], cellar, named[], skill, made{}, log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { regionOf, NS } from '../nature/state.js';
import { realmOf } from '../realms/index.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 73) ^ Math.imul(mi(g) * 107 + salt + 61, 2654435761)) | 0 });
export const isPlace = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
export const brewTown = (pl) => isPlace(pl) && (PLACES[pl]?.house ?? 0) >= 120;

// 재료: 나는 지방, 나는 달(장터에 나오는 때), 값(한 몫)
export const INGREDIENTS = {
  barley: { name: '보리', regions: ['south', 'river', 'north', 'east', 'holy'], months: null, price: 3 },
  apples: { name: '사과', regions: ['river', 'lake', 'north'], months: [9, 10, 11], price: 2 },
  honey: { name: '꿀', regions: ['forest', 'north', 'east', 'mountain'], months: [6, 7, 8, 9], price: 5 },
  grapes: { name: '포도', regions: ['south', 'coast', 'holy'], months: [9, 10], price: 4 },
};
export const ING_IDS = Object.keys(INGREDIENTS);
export const ingHere = (g, pl = here(g), m = g.date.month) => ING_IDS.filter((id) => INGREDIENTS[id].regions.includes(regionOf(pl)) && (!INGREDIENTS[id].months || INGREDIENTS[id].months.includes(m)));

// 술: 드는 재료(한 통), 익는 달, 가장 좋은 때, 상하는 때, 통 한 개 값, 묵히면 오르는 폭, 솜씨, 그 고장 술(home)
export const DRINKS = {
  ale: { name: '보리 맥주', need: { barley: 2 }, ready: 2, peak: 5, spoil: 12, price: 16, gain: 0.2, skill: 0, grain: true, home: ['south', 'river'], line: '보리를 싹 틔워 말리고 끓여 거품이 일게 둔다. 빨리 익고 빨리 시어진다.' },
  cider: { name: '사과술', need: { apples: 3 }, ready: 3, peak: 10, spoil: 30, price: 18, gain: 0.4, skill: 10, home: ['river', 'lake'], line: '사과를 찧어 즙을 짜고 통에 가둔다.' },
  mead: { name: '꿀술', need: { honey: 2 }, ready: 4, peak: 24, spoil: 96, price: 30, gain: 0.8, skill: 15, home: ['forest', 'north'], line: '꿀을 물에 풀어 오래 둔다. 묵을수록 깊어진다.' },
  wine: { name: '포도주', need: { grapes: 3 }, ready: 6, peak: 48, spoil: 180, price: 34, gain: 1.5, skill: 20, home: ['south', 'holy', 'coast'], line: '포도를 밟아 껍질째 띄운다. 해마다 맛이 다르다.' },
  spirit: { name: '불술', need: { barley: 4 }, ready: 1, peak: 60, spoil: 999, price: 45, gain: 1.2, skill: 40, grain: true, still: true, tax: 2, home: ['north', 'mountain'], line: '맥주를 증류기에 걸어 불 붙는 술만 받아 낸다. 세금이 곱이다.' },
};
export const DRINK_IDS = Object.keys(DRINKS);
export const HOME_CAP = 3, CELLAR_CAP = 14;
export const STILL_COST = 40;
export const cellarCost = (pl) => Math.round(50 + (PLACES[pl]?.house ?? 200) * 0.3);
// 술 세금: 나라마다 (불술은 곱)
export const TAX = { leonia: 0.1, valhart: 0.15, holy: 0.2 };
export const taxRate = (pl, d) => (TAX[realmOf(pl)] ?? 0.1) * (DRINKS[d]?.tax ?? 1);

const CELLAR_NAMES = ['보리 이삭 술도가', '검은 통 술도가', '언덕 아래 술도가', '늙은 참나무 술도가', '세 개의 통', '거품 이는 집'];
const RIVALS = ['조합 술도가의 하인리히', '큰 술도가 주인 마르타', '왕도에서 온 술장수 베른트'];
export const rivalName = (rng) => rng.pick(RIVALS);
const TAVERNS = ['외눈 주점의 오스카', '다리 옆 주점의 게르다', '푸른 닻 주점의 루돌프'];
export const tavernName = (rng) => rng.pick(TAVERNS);
const NOBLES = ['베르덴 백작가의 집사', '강변 영주의 술 시종', '왕도 귀족의 심부름꾼'];
export const nobleName = (rng) => rng.pick(NOBLES);

function fresh() {
  return { stock: {}, casks: [], cellar: null, named: [], made: {}, skill: 0, log: [], seq: 1, eventAt: 0, brewed: 0, sold: 0, earned: 0, illicit: 0, past: [] };
}
export const BR = (g) => (g.brew ??= fresh());
export const cellar = (g) => BR(g).cellar;
export const atCellar = (g) => !!cellar(g) && cellar(g).place === here(g) && !L(g).travel;
export const capOf = (g) => (cellar(g) ? CELLAR_CAP : HOME_CAP);
export const brewSkill = (g) => BR(g).skill ?? 0;
export const stockCount = (g) => ING_IDS.reduce((a, id) => a + (BR(g).stock[id] ?? 0), 0);
export const namedOf = (g, d) => BR(g).named.find((n) => n.d === d) ?? null;
export const drinkName = (g, d) => { const n = namedOf(g, d); return n ? `${n.by}네 ${DRINKS[d].name}` : DRINKS[d].name; };
// 흉년이면 곡식으로 술을 빚지 못하게 한다 (금주령)
export const banned = (g) => !!g.world?.famine;
export const canMake = (g, d) => { const D = DRINKS[d]; return brewSkill(g) >= D.skill && (!D.still || !!cellar(g)?.still) && Object.entries(D.need).every(([i, n]) => (BR(g).stock[i] ?? 0) >= n); };

// 통의 나이와 값
export const ageOf = (g, c) => mi(g) - c.at;
export const isReady = (g, c) => ageOf(g, c) >= DRINKS[c.d].ready && ageOf(g, c) < DRINKS[c.d].spoil;
export const isSour = (g, c) => ageOf(g, c) >= DRINKS[c.d].spoil;
export function ageMul(g, c) {
  const D = DRINKS[c.d], a = ageOf(g, c);
  if (a >= D.spoil) return 0.15;
  if (a < D.ready) return 0.35;
  return 1 + (Math.min(a, D.peak) - D.ready) / Math.max(1, D.peak - D.ready) * D.gain;
}
export const caskValue = (g, c) => Math.round(DRINKS[c.d].price * (0.5 + c.q / 100) * c.t * ageMul(g, c) * (namedOf(g, c.d) ? 1.3 : 1));
export const tasteWord = (t) => (t >= 1.12 ? '좋은 해' : t >= 0.92 ? '여느 해' : '궂은 해');
export const ageWord = (g, c) => { const a = ageOf(g, c), D = DRINKS[c.d]; return a >= D.spoil ? '식초가 되었다' : a < D.ready ? '아직 덜 익었다' : a >= D.peak ? '가장 좋을 때다' : '익어 간다'; };
// 그해 그 지방의 맛: 소출과 따로 굴린 주사위
export function yearTaste(g, rng, pl) {
  const crop = NS(g)?.crop?.[regionOf(pl)] ?? 1;
  return Math.round(clamp(0.78 + crop * 0.22 + rng.float(-0.16, 0.16), 0.7, 1.3) * 100) / 100;
}
export const fameWord = (v) => (v >= 70 ? '먼 고장 귀족도 찾는 술도가' : v >= 45 ? '이름난 술도가' : v >= 20 ? '고장 사람들이 아는 술도가' : '아직 이름 없는 술도가');
export const readyCasks = (g) => BR(g).casks.filter((c) => isReady(g, c));

export function logBrew(g, text) {
  const s = BR(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
export function newCellar(g, rng) {
  return { place: here(g), name: rng ? rng.pick(CELLAR_NAMES) : CELLAR_NAMES[0], fame: 10, still: false, contract: null, taxOwed: 0, since: mi(g), gens: 1, by: g.player.name, last: 0 };
}
const cleanCounts = (o, ids) => { const out = {}; if (o && typeof o === 'object' && !Array.isArray(o)) for (const k of Object.keys(o)) if (ids.includes(k) && Number.isFinite(o[k]) && o[k] > 0) out[k] = Math.min(99, Math.round(o[k])); return out; };

HOOKS.newGame.push((g) => { g.brew = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.brew && typeof g.brew === 'object' ? g.brew : {});
  for (const k of ['log', 'named', 'past', 'casks']) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of ['seq', 'eventAt', 'brewed', 'sold', 'earned', 'illicit', 'skill']) if (!Number.isFinite(s[k])) s[k] = k === 'seq' ? 1 : 0;
  s.skill = clamp(s.skill, 0, 100);
  s.stock = cleanCounts(s.stock, ING_IDS);
  s.made = cleanCounts(s.made, DRINK_IDS);
  s.casks = s.casks.filter((c) => c && typeof c === 'object' && DRINKS[c.d] && Number.isFinite(c.at)).slice(0, CELLAR_CAP + 4);
  for (const c of s.casks) {
    if (!Number.isFinite(c.q)) c.q = 40;
    c.q = clamp(c.q, 0, 100);
    if (!Number.isFinite(c.t)) c.t = 1;
    c.t = clamp(c.t, 0.7, 1.3);
    if (!Number.isFinite(c.y)) c.y = g.date?.year ?? 500;
    if (!Number.isFinite(c.id)) c.id = s.seq++;
  }
  s.named = s.named.filter((n) => n && DRINKS[n.d] && typeof n.by === 'string').slice(0, 5);
  for (const n of s.named) for (const k of ['gen', 'since']) if (!Number.isFinite(n[k])) n[k] = k === 'gen' ? 1 : 0;
  const p = s.cellar;
  if (p && (typeof p !== 'object' || !brewTown(p.place))) s.cellar = null;
  if (s.cellar) {
    if (typeof p.name !== 'string') p.name = CELLAR_NAMES[0];
    if (typeof p.by !== 'string') p.by = g.player?.name ?? '이름 모를 술도가';
    for (const k of ['fame', 'since', 'gens', 'last', 'taxOwed']) if (!Number.isFinite(p[k])) p[k] = k === 'gens' ? 1 : k === 'fame' ? 10 : 0;
    p.fame = clamp(p.fame, 0, 100);
    p.taxOwed = Math.max(0, p.taxOwed);
    p.still = !!p.still;
    if (p.contract && (typeof p.contract !== 'object' || typeof p.contract.name !== 'string' || !Number.isFinite(p.contract.left) || !DRINKS[p.contract.d])) p.contract = null;
  }
  g.brew = s;
});
