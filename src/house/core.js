// 내 집 마련과 살림: 상태와 도우미.
// - 잠자리(여관·셋방·부모님 집·내 집)는 places.js의 life.home, 가진 집 목록은 life.houses다.
// - 집의 낡음·넓이(보통 집/넓은 집/저택)·하인·세는 estate(game.estate.homes)가 맡는다.
// - 여기(game.house)는 그 위에 얹는다: 오두막, 짓기(달을 넘기는 공사), 방과 살림, 이웃, 집의 이름과 대를 넘는 내력, 판 집, 이사.
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L, note } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { WORTH_HOOKS } from '../estate/core.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const valueAt = (pl) => PLACES[pl]?.house || 200;
// 오두막은 땅값이 싼 고장에서만 지을 수 있다 (큰 도시는 터가 없다)
export const hutOk = (pl) => !!PLACES[pl] && valueAt(pl) <= 400 && !PLACES[pl].hidden;

// 방과 살림. cap: 집 크기마다 들일 수 있는 방 수 (오두막·보통 집·넓은 집·저택)
export const ROOMS = {
  hearth: { name: '화덕 부엌', cost: 20, desc: '따뜻한 밥. 집에 있는 달마다 마음이 조금 풀린다.' },
  garden: { name: '텃밭과 정원', cost: 15, desc: '손에 흙을 묻힌다. 농사 솜씨가 조금씩 늘고 마음이 풀린다.' },
  well: { name: '우물', cost: 30, desc: '불이 났을 때 물이 가깝다.' },
  wall: { name: '돌담과 대문', cost: 35, desc: '도둑이 쉽게 넘지 못한다.' },
  cellar: { name: '광과 숨긴 궤짝', cost: 25, desc: '도둑이 들어도 잃는 것이 반으로 준다.' },
  study: { name: '서재', cost: 40, desc: '책상과 등잔. 집에 있는 달마다 글이 조금씩 는다.' },
  workshop: { name: '작업장', cost: 40, desc: '연장과 화덕. 집에 있는 달마다 손재주(대장일·요리 가운데 나은 쪽)가 조금씩 는다.' },
  stable: { name: '마구간', cost: 30, desc: '기르는 짐승이 편히 쉰다. 짐승과의 정이 조금씩 깊어진다.' },
};
export const ROOM_IDS = Object.keys(ROOMS);
export const ROOM_CAP = { hut: 2, 0: 4, 1: 6, 2: 8 };
export const KIND_WORD = { hut: '오두막', house: '집' };

const NAMES = ['느릅나무 집', '붉은 지붕 집', '우물가 집', '언덕 위 집', '돌담 집', '제비 집', '물레방아 옆 집', '사과나무 집', '파란 대문 집', '굴뚝 둘 집'];
export const houseName = (seed) => NAMES[Math.abs(seed) % NAMES.length];
const hashOf = (s) => [...String(s)].reduce((a, ch) => a + ch.charCodeAt(0), 0);

function fresh() {
  return {
    homes: {},   // 장소 → { kind: 'hut'|'house', name, built, by, rooms[], gens, lived, marks[] }
    build: null, // { place, kind: 'hut'|'house'|'rebuild', left, cost, cond, events, started }
    lost: [],    // 판 집, 불탄 집 { place, name, kind, built, by, gens, rooms, year, how, price }
    moving: null, // { to, from, year, sold }
    moves: 0, built: 0, evAt: 0,
    neighbors: {}, // 장소 → { name, mood(-50~50), quarrels }
    log: [],
  };
}
export const H = (g) => (g.house ??= fresh());
HOOKS.newGame.push((g) => { g.house = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  g.house = Object.assign(d, g.house && typeof g.house === 'object' ? g.house : {});
  const h = g.house;
  if (!h.homes || typeof h.homes !== 'object') h.homes = {};
  if (!h.neighbors || typeof h.neighbors !== 'object') h.neighbors = {};
  for (const k of ['lost', 'log']) if (!Array.isArray(h[k])) h[k] = [];
  for (const [pl, x] of Object.entries(h.homes)) {
    if (!x || !PLACES[pl]) { delete h.homes[pl]; continue; }
    if (!Array.isArray(x.rooms)) x.rooms = [];
    x.rooms = x.rooms.filter((r) => ROOMS[r]);
    if (!Array.isArray(x.marks)) x.marks = [];
    if (x.kind !== 'hut') x.kind = 'house';
  }
  h.lost = h.lost.filter((x) => x && PLACES[x.place]);
  if (h.build && (!PLACES[h.build.place] || !Number.isFinite(h.build.left) || !['hut', 'house', 'rebuild'].includes(h.build.kind))) h.build = null;
  if (h.moving && !PLACES[h.moving.to]) h.moving = null;
});
export function logHouse(g, text) {
  const h = H(g);
  h.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (h.log.length > 24) h.log.length = 24;
}

/** 내가 가진 집 하나의 내력 (places.js에서 산 집도 처음 볼 때 만든다). 없으면 null */
export function recOf(g, pl) {
  if (!L(g).houses.includes(pl) || !PLACES[pl]) return null;
  const h = H(g);
  h.homes[pl] ??= { kind: 'house', name: houseName(hashOf(pl) + g.date.year), built: g.date.year, by: g.player.name, rooms: [], gens: 1, lived: 0, marks: [] };
  return h.homes[pl];
}
export const roomCap = (g, pl) => { const r = recOf(g, pl); if (!r) return 0; if (r.kind === 'hut') return ROOM_CAP.hut; return ROOM_CAP[g.estate?.homes?.[pl]?.level ?? 0] ?? 4; };
export const hasRoom = (g, pl, id) => !!recOf(g, pl)?.rooms.includes(id);
export const atOwnHome = (g) => L(g).home === 'own' && !L(g).travel && L(g).houses.includes(here(g));
export const kindWord = (g, pl) => { const r = recOf(g, pl); if (!r) return '집'; if (r.kind === 'hut') return '오두막'; return ['집', '넓은 집', '저택'][g.estate?.homes?.[pl]?.level ?? 0] ?? '집'; };

// 오두막은 팔 때 집값의 4할만 받는다 (estate.homeWorth에 얹는 배수)
WORTH_HOOKS.push((g, pl) => (g.house?.homes?.[pl]?.kind === 'hut' ? 0.4 : 1));

/* ---------- 대 잇기: 집은 남고, 내력이 한 줄 는다 ---------- */
HOOKS.heir.push((g) => {
  const h = H(g);
  for (const pl of L(g).houses) {
    const r = recOf(g, pl);
    if (!r) continue;
    r.gens = (r.gens ?? 1) + 1;
    r.marks.push(h.lastName ?? '선대');
    if (r.marks.length > 12) r.marks.shift();
  }
  h.build = null; h.moving = null; h.neighbors = {};
  const n = L(g).houses.length;
  if (n) note(g, `${L(g).houses.map((pl) => `${placeName(pl)}의 ${recOf(g, pl).name}`).join(', ')}. 이제 ${recOf(g, L(g).houses[0]).gens}대째 사는 집이다.`);
});
// 대가 바뀌기 전 이름을 기억해 둔다 (기둥에 새길 이름)
HOOKS.afterMonth.push((g) => { if (g.player) H(g).lastName = g.player.name; });
