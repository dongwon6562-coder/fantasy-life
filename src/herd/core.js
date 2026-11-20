// 목축과 유목: 상태와 도우미.
// - 짐승과 함께(beasts)는 곁에 두는 짐승 몇 마리다. 여기서는 양·소·말을 떼로 길러 늘리고 파는 살림이다.
// - 목동 일(남의 떼 몰기)에서 시작해 내 떼를 갖고, 겨울 꼴을 쌓고, 병과 소도둑과 이웃 목장을 겪는다. 명마 혈통을 기를 수 있다.
// - 유목민 무리는 정해진 길을 철 따라 돈다(무리의 자리는 달로 정해져 저장하지 않는다). 들면 함께 떠돈다.
// 상태는 game.herd 하나: { flock: 내 떼 | null, band: 든 무리 | null, skill: 목축 솜씨, prices, neighbor, log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES, travelMonths } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 79) ^ Math.imul(mi(g) * 89 + salt + 37, 2654435761)) | 0 });
export const isPlace = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
export { travelMonths };

// 풀밭: 고장마다 떼를 먹일 만한 정도 (없으면 떼를 둘 수 없다)
export const PASTURE = { ern: 1, gruental: 1.1, verden: 0.9, harfen: 0.6, graubel: 1, fur: 1.1, silverleaf: 0.5, hammer: 0.5, gorge: 0.4, eisen: 0.6, klein: 0.5, saltrock: 0.4, leocast: 0.4, solaris: 0.4 };
export const pastureOf = (pl) => PASTURE[pl] ?? 0;

// 짐승: 값(장터 기준), 겨울 꼴(마리당 달), 봄에 느는 몫, 손이 가는 정도
export const STOCK = {
  sheep: { name: '양', unit: '마리', price: 6, fodder: 0.1, birth: 0.35, care: 0.05, line: '털과 젖과 고기. 늑대가 가장 좋아한다.' },
  cattle: { name: '소', unit: '마리', price: 28, fodder: 0.5, birth: 0.12, care: 0.2, line: '느리고 무겁고 값지다. 소도둑도 그렇게 생각한다.' },
  horses: { name: '말', unit: '필', price: 45, fodder: 0.4, birth: 0.1, care: 0.25, line: '빠르고 예민하다. 잘 기른 말 한 필이 집 한 채 값이다.' },
};
export const STOCK_IDS = Object.keys(STOCK);

// 가축 병
export const SICK = {
  rot: { name: '발굽 썩음병', hits: ['sheep', 'cattle'], kill: 0.08, text: '양들이 절뚝거리고, 발굽 사이에서 썩는 냄새가 난다.' },
  murrain: { name: '소 역병', hits: ['cattle', 'sheep'], kill: 0.18, text: '소들이 침을 흘리며 쓰러진다. 이웃 목장에서도 같은 소리가 들린다.' },
  strangles: { name: '말 목병', hits: ['horses'], kill: 0.12, text: '말들의 목이 붓고 콧물이 흐른다. 한 마리가 기침하면 다 따라 한다.' },
};
export const SICK_IDS = Object.keys(SICK);

// 유목민 무리: 철마다 머무는 자리. camp[철] = 고장.
export const BANDS = {
  brown: { name: '갈색 천막 무리', people: '사람', chief: '늙은 족장 오르반', camp: { winter: 'ern', spring: 'harfen', summer: 'gruental', autumn: 'gruental' }, stock: '말과 양', text: '남쪽 들판을 도는 말 탄 목자들. 천막은 소가죽이고, 아이들도 안장 위에서 잔다.' },
  frost: { name: '서리 갈기 씨족', people: '사람', chief: '여족장 사르나', camp: { winter: 'eisen', spring: 'graubel', summer: 'graubel', autumn: 'eisen' }, stock: '털이 긴 말과 소', text: '북쪽 고원의 씨족. 제국과 변경 사이를 오가며 어느 쪽에도 무릎 꿇지 않는다.' },
  fur: { name: '털가죽 무리', people: '수인', chief: '외눈 무리장 그라우', camp: { winter: 'fur', spring: 'fur', summer: 'silverleaf', autumn: 'fur' }, stock: '뿔 긴 소', text: '수인 목자들. 소를 형제라 부르고, 소를 훔친 자는 형제를 죽인 자로 친다.' },
};
export const BAND_IDS = Object.keys(BANDS);
export const seasonOf = (m) => (m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn');
export const bandCamp = (id, month) => BANDS[id]?.camp[seasonOf(month)] ?? null;
export const bandsHere = (g) => BAND_IDS.filter((id) => bandCamp(id, g.date.month) === here(g));
const NEIGHBORS = ['붉은 담장 목장의 브란트', '과부 헤라의 목장', '세 아들 둔 영감 쿠노', '새로 온 지주의 마름'];
export const neighborName = (rng) => rng.pick(NEIGHBORS);
const STEED_NAMES = ['밤바람', '잿빛 왕관', '새벽 갈기', '검은 화살', '은방울', '천둥발'];
export const steedName = (rng, used = new Set()) => rng.pick(STEED_NAMES.filter((n) => !used.has(n))) ?? rng.pick(STEED_NAMES);

function fresh() {
  return {
    flock: null, band: null, skill: 0, worked: 0, prices: { sheep: 1, cattle: 1, horses: 1 }, neighbor: null, steeds: [],
    log: [], seq: 1, eventAt: 0, priceAt: 0, sold: 0, lost: 0, born: 0, past: [],
  };
}
export const HD = (g) => (g.herd ??= fresh());
export const flock = (g) => HD(g).flock;
export const withFlock = (g) => !!flock(g) && flock(g).place === here(g) && !L(g).travel;
export const head = (f) => (f ? f.sheep + f.cattle + f.horses : 0);
export const priceOf = (g, id) => Math.max(1, Math.round(STOCK[id].price * (HD(g).prices[id] ?? 1)));
export const flockValue = (g, f = flock(g)) => (f ? STOCK_IDS.reduce((a, id) => a + f[id] * priceOf(g, id), 0) : 0);
export const fodderNeed = (f) => (f ? STOCK_IDS.reduce((a, id) => a + f[id] * STOCK[id].fodder, 0) : 0);
// 목축 솜씨: 이 갈래의 솜씨와 짐승 다루기(beasts가 더한 기술, 없을 수 있음)
export const herdSkill = (g) => HD(g).skill + (g.player.skills?.animals ?? 0) * 0.4;
export const hasDog = (g) => (g.beasts?.animals ?? []).some((a) => a && a.alive !== false && a.kind === 'dog');

export function logHerd(g, text) {
  const s = HD(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
export function newFlock(g) {
  return { place: here(g), sheep: 0, cattle: 0, horses: 0, fodder: 0, health: 80, hands: 0, sick: null, since: mi(g), gens: 1 };
}
export function emptyCheck(g) {
  const s = HD(g), f = s.flock;
  if (f && head(f) <= 0) { s.past.unshift({ year: g.date.year, how: '떼가 다 없어졌다' }); if (s.past.length > 6) s.past.length = 6; s.flock = null; logHerd(g, '떼가 다 없어졌다.'); return true; }
  return false;
}
export const bandWord = (v) => (v >= 70 ? '무리의 한 핏줄' : v >= 45 ? '믿는 손' : v >= 20 ? '받아 준 사람' : '낯선 사람');

HOOKS.newGame.push((g) => { g.herd = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.herd && typeof g.herd === 'object' ? g.herd : {});
  for (const k of ['log', 'steeds', 'past']) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of ['skill', 'worked', 'seq', 'eventAt', 'priceAt', 'sold', 'lost', 'born']) if (!Number.isFinite(s[k])) s[k] = k === 'seq' ? 1 : 0;
  s.skill = clamp(s.skill, 0, 100);
  if (!s.prices || typeof s.prices !== 'object') s.prices = fresh().prices;
  for (const id of STOCK_IDS) s.prices[id] = Number.isFinite(s.prices[id]) ? clamp(s.prices[id], 0.4, 2.5) : 1;
  const f = s.flock;
  if (f && (typeof f !== 'object' || !pastureOf(f.place))) s.flock = null;
  if (s.flock) {
    for (const id of STOCK_IDS) f[id] = Number.isFinite(f[id]) ? Math.max(0, Math.round(f[id])) : 0;
    for (const k of ['fodder', 'health', 'hands', 'since', 'gens']) if (!Number.isFinite(f[k])) f[k] = k === 'health' ? 70 : k === 'gens' ? 1 : 0;
    f.fodder = Math.max(0, f.fodder); f.health = clamp(f.health, 0, 100); f.hands = clamp(Math.round(f.hands), 0, 6);
    if (f.sick && (typeof f.sick !== 'object' || !SICK[f.sick.kind] || !Number.isFinite(f.sick.left))) f.sick = null;
  }
  s.steeds = s.steeds.filter((h) => h && typeof h.name === 'string');
  for (const h of s.steeds) for (const k of ['id', 'q', 'born', 'trained', 'fame']) if (!Number.isFinite(h[k])) h[k] = k === 'id' ? s.seq++ : k === 'born' ? mi(g) : 0;
  const b = s.band;
  if (b && (typeof b !== 'object' || !BANDS[b.id])) s.band = null;
  if (s.band) for (const k of ['standing', 'since', 'camp']) if (k !== 'camp' && !Number.isFinite(b[k])) b[k] = 0;
  if (s.band && (typeof s.band.camp !== 'string' || !isPlace(s.band.camp))) s.band.camp = bandCamp(s.band.id, g.date.month);
  if (s.band) s.band.standing = clamp(s.band.standing, 0, 100);
  if (s.neighbor && (typeof s.neighbor !== 'object' || typeof s.neighbor.name !== 'string' || !Number.isFinite(s.neighbor.grudge))) s.neighbor = null;
  g.herd = s;
});
