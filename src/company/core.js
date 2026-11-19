// 용병단 꾸리기: 상태와 도우미.
// - politics의 '용병으로 싸우기'(pol_merc)는 혼자 칼을 파는 일이다. 여기서는 내 깃발 아래 사람을 모아 계약을 맺고 판다.
// - 왕국군(army)·동료(party)·영지 병사(war/domain)와 따로 논다. 용병단은 단장(나)을 따라다니고, 계약이 있으면 그 고장 싸움터에 붙는다.
// 상태는 game.company 하나: { c: 지금 용병단 | null, banner: 대를 잇는 깃발, rivals: 이름난 맞수 용병단, families: 죽거나 다친 단원의 식구, past, log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES, travelMonths } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { realmOf } from '../realms/index.js';
import { REALMS } from '../realms/data.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const realmShort = (id) => REALMS[id]?.short ?? '어느 나라';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 67) ^ Math.imul(mi(g) * 71 + salt + 29, 2654435761)) | 0 });
export const isPlace = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
export const town = (pl) => isPlace(pl) && (PLACES[pl].house ?? 0) >= 280;
export const MERC_HUBS = ['barka', 'portel', 'saltmare'];
export { realmOf, travelMonths };

// 깃발 표: 무늬와 그에 붙는 이름
export const SIGNS = {
  wolf: { name: '잿빛 늑대', sign: '잿빛 늑대 머리', motto: '무리는 하나를 버리지 않는다' },
  crow: { name: '검은 까마귀', sign: '검은 까마귀', motto: '싸움이 끝나면 우리가 남는다' },
  spear: { name: '부러진 창', sign: '가운데가 부러진 창', motto: '부러져도 찌른다' },
  hand: { name: '붉은 손', sign: '피 묻은 손바닥', motto: '값을 치르면 손을 빌려준다' },
  stars: { name: '세 별', sign: '푸른 바탕에 별 셋', motto: '셋이 남을 때까지' },
  bell: { name: '쇠종', sign: '금 간 쇠종', motto: '종이 울리면 모인다' },
};
export const SIGN_IDS = Object.keys(SIGNS);

// 몫 나누기와 약탈 규율
export const SPLITS = {
  equal: { name: '똑같이 나눈다', mine: 0.12, morale: 1.5, text: '단장도 창병도 같은 몫' },
  rank: { name: '계급대로 나눈다', mine: 0.25, morale: 0, text: '단장과 부관이 더 받는다' },
  captain: { name: '단장이 크게 떼어 간다', mine: 0.5, morale: -2, text: '단장 몫이 절반' },
};
export const LOOTS = {
  forbid: { name: '약탈 금지', mult: 0, drill: 1, morale: -1.5, text: '어기면 목을 매단다' },
  tenth: { name: '십일조만', mult: 1, drill: 0, morale: 0, text: '거둔 것의 열에 하나는 단의 궤로' },
  free: { name: '가져가는 사람 것', mult: 2.2, drill: -3, morale: 2, text: '이긴 날은 마음대로' },
};
export const ROLES = { lt: '부관', bearer: '기수', bow: '궁수대장', pike: '창병대장', surgeon: '군의' };
export const ROLE_IDS = Object.keys(ROLES);
const VET_NAMES = ['외눈 그레고르', '말 없는 바실', '붉은 수염 오도', '키 작은 마르타', '늙은 창잡이 하인츠', '흉터 난 이자크', '노래하는 렌츠', '쌍도끼 브루나', '셈 빠른 오틸리에', '절름발이 콘라트', '털보 야로', '조용한 엘제'];
const SOLDIER_NAMES = ['요스트', '디터', '한나', '파울', '베른트', '우테', '클라우스', '프리다', '알브레히트', '지크', '마티스', '로타르'];
const KIN = ['아내와 어린 아들', '늙은 어머니', '어린 딸 둘', '약혼녀', '홀아비 아버지와 동생들', '젖먹이를 안은 아내'];
export const WAGE = 1; // 창병 하나의 달 삯
export const VET_WAGE = 3;
export const FOUND_COST = 150;

// 이름난 맞수 용병단: 대륙을 떠도는 다른 깃발들
const RIVALS = [
  { id: 'iron', name: '쇠사슬 형제단', captain: '사슬의 디트마르', fame: 60 },
  { id: 'lance', name: '검은 창 용병단', captain: '창잡이 부인 히루데', fame: 55 },
  { id: 'old', name: '늙은 늑대들', captain: '백발의 오스카', fame: 45 },
  { id: 'gray', name: '잿빛 망토단', captain: '망토의 셀린', fame: 35 },
  { id: 'red', name: '붉은 매 자유대', captain: '매눈 로렌츠', fame: 40 },
];
const CAPTAINS = ['굽은 칼의 에발트', '두 손가락 미르코', '얼음눈 카타리나', '털보 군터', '젊은 늑대 펠릭스', '자루 없는 도끼 오토'];

function fresh() {
  return {
    c: null, banner: null, past: [], families: [], log: [], seq: 1,
    rivals: RIVALS.map((r) => ({ ...r, grudge: 0, side: null })),
    eventAt: 0, rivalAt: 0, contracts: 0, battles: 0, won: 0, turned: 0, sacks: 0, dead: 0, hunted: {}, offers: null,
  };
}
export const S = (g) => (g.company ??= fresh());
export const myCo = (g) => S(g).c;
export const commanding = (g) => !!myCo(g) && !myCo(g).regent;
export const withCo = (g) => commanding(g) && !L(g).travel;
export const rivalById = (g, id) => S(g).rivals.find((r) => r.id === id) ?? null;
export const famWord = (f) => (f >= 70 ? '온 대륙이 아는' : f >= 45 ? '이름난' : f >= 25 ? '전장마다 아는' : f >= 10 ? '조금 알려진' : '이름 없는');

export function logCo(g, text) {
  const s = S(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
export function newVet(g, rng, role, used = new Set()) {
  const s = S(g);
  const name = rng.pick(VET_NAMES.filter((n) => !used.has(n))) ?? rng.pick(VET_NAMES);
  return { id: s.seq++, name, role: ROLES[role] ? role : 'pike', skill: rng.int(30, 55), loyal: rng.int(50, 70), since: mi(g) };
}
export const soldierName = (rng) => rng.pick(SOLDIER_NAMES);
export const kinOf = (rng) => rng.pick(KIN);
export const captainName = (rng) => rng.pick(CAPTAINS);

export function newCompany(g, rng, { sign, old = false, men = 14 }) {
  const used = new Set();
  const vets = [];
  for (const r of ['lt', 'bearer']) { const v = newVet(g, rng, r, used); used.add(v.name); vets.push(v); }
  const b = S(g).banner;
  return {
    name: `${SIGNS[sign].name} 용병단`, sign, place: here(g), men, vets, drill: 30, morale: 60, chest: 20,
    fame: old && b ? clamp(10 + b.honors.length * 4 - (b.stains ?? 0) * 3, 5, 40) : 5,
    split: 'rank', loot: 'tenth', contract: null, since: mi(g), battles: 0, won: 0, lost: 0, dead: 0, foughtAt: -1, regent: null, owed: 0,
  };
}
// 깃발: 처음 세우면 생기고, 대를 이어 남는다
export function raiseBanner(g, sign) {
  const s = S(g);
  if (s.banner && s.banner.sign === sign) { s.banner.raised += 1; return s.banner; }
  s.banner = { sign, name: SIGNS[sign].name, motto: SIGNS[sign].motto, founder: g.player.name, founded: g.date.year, gens: 1, honors: [], stains: 0, raised: 1, holder: g.player.name };
  return s.banner;
}
export function honor(g, text) {
  const b = S(g).banner;
  if (!b) return;
  b.honors.unshift({ y: g.date.year, text });
  if (b.honors.length > 10) b.honors.length = 10;
}
export function endCompany(g, how) {
  const s = S(g), c = s.c;
  if (!c) return;
  s.past.unshift({ name: c.name, year: g.date.year, how, battles: c.battles, won: c.won, dead: c.dead, fame: Math.round(c.fame) });
  if (s.past.length > 8) s.past.length = 8;
  s.c = null;
  logCo(g, `${c.name}: ${how}.`);
}
export const wagesOf = (c) => c.men * WAGE + c.vets.length * VET_WAGE + (c.pensions ?? 0);
export function coPow(c) {
  const vet = c.vets.length ? c.vets.reduce((a, v) => a + v.skill, 0) / c.vets.length : 20;
  return 10 + Math.sqrt(Math.max(0, c.men)) * 5 + c.drill * 0.15 + c.morale * 0.1 + vet * 0.1;
}
// 다치거나 죽은 단원의 식구
export function addFamily(g, rng, dead, { vet = false, maimed = false } = {}) {
  const s = S(g);
  s.families.unshift({ id: s.seq++, dead, kin: kinOf(rng), place: myCo(g)?.place ?? here(g), since: mi(g), vet, maimed, helped: null, pension: false });
  // 도움을 다 받은 식구부터 지워 열둘까지만
  while (s.families.length > 12) {
    const i = s.families.map((f) => f.helped != null && !f.pension).lastIndexOf(true);
    s.families.splice(i >= 0 ? i : s.families.length - 1, 1);
  }
}
export const waiting = (g) => S(g).families.filter((f) => f.helped == null);

HOOKS.newGame.push((g) => { g.company = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.company && typeof g.company === 'object' ? g.company : {});
  for (const k of ['past', 'log', 'families', 'rivals']) if (!Array.isArray(s[k])) s[k] = [];
  if (!s.rivals.length) s.rivals = fresh().rivals;
  s.rivals = s.rivals.filter((r) => r && typeof r.name === 'string' && typeof r.id === 'string');
  for (const r of s.rivals) { for (const k of ['fame', 'grudge']) if (!Number.isFinite(r[k])) r[k] = k === 'fame' ? 30 : 0; if (typeof r.captain !== 'string') r.captain = '이름 모를 단장'; }
  s.families = s.families.filter((f) => f && typeof f.dead === 'string' && typeof f.kin === 'string');
  for (const f of s.families) if (!Number.isFinite(f.id)) f.id = s.seq++;
  if (!s.hunted || typeof s.hunted !== 'object' || Array.isArray(s.hunted)) s.hunted = {};
  for (const k of ['seq', 'eventAt', 'rivalAt', 'contracts', 'battles', 'won', 'turned', 'sacks', 'dead']) if (!Number.isFinite(s[k])) s[k] = k === 'seq' ? 1 : 0;
  if (s.offers && (typeof s.offers !== 'object' || !Array.isArray(s.offers.list))) s.offers = null;
  if (s.banner && (typeof s.banner !== 'object' || !SIGNS[s.banner.sign])) s.banner = null;
  if (s.banner) { if (!Array.isArray(s.banner.honors)) s.banner.honors = []; for (const k of ['gens', 'stains', 'raised', 'founded']) if (!Number.isFinite(s.banner[k])) s.banner[k] = k === 'gens' || k === 'raised' ? 1 : 0; }
  const c = s.c;
  if (c && (typeof c !== 'object' || !SIGNS[c.sign] || !isPlace(c.place))) s.c = null;
  if (s.c) {
    if (!Array.isArray(c.vets)) c.vets = [];
    c.vets = c.vets.filter((v) => v && typeof v.name === 'string' && ROLES[v.role]);
    for (const v of c.vets) for (const k of ['id', 'skill', 'loyal', 'since']) if (!Number.isFinite(v[k])) v[k] = k === 'id' ? s.seq++ : 40;
    for (const k of ['men', 'drill', 'morale', 'chest', 'fame', 'battles', 'won', 'lost', 'dead', 'foughtAt', 'owed', 'pensions']) if (!Number.isFinite(c[k])) c[k] = k === 'foughtAt' ? -1 : k === 'morale' ? 50 : 0;
    c.men = Math.max(0, Math.round(c.men)); c.drill = clamp(c.drill, 0, 100); c.morale = clamp(c.morale, 0, 100); c.fame = clamp(c.fame, 0, 100); c.chest = Math.max(0, c.chest);
    if (!SPLITS[c.split]) c.split = 'rank';
    if (!LOOTS[c.loot]) c.loot = 'tenth';
    if (c.regent != null && typeof c.regent !== 'string') c.regent = null;
    if (typeof c.name !== 'string') c.name = `${SIGNS[c.sign].name} 용병단`;
    const k = c.contract;
    if (k && (typeof k !== 'object' || !isPlace(k.where) || !Number.isFinite(k.left) || !Number.isFinite(k.pay) || typeof k.by !== 'string' || !['war', 'guard', 'lord', 'beast'].includes(k.kind)
      || (k.kind === 'war' && (!REALMS[k.side] || !REALMS[k.foe])))) c.contract = null;
    if (c.contract) {
      const k2 = c.contract;
      for (const f of ['months', 'bonus', 'danger', 'won', 'lost', 'unpaid']) if (!Number.isFinite(k2[f])) k2[f] = f === 'danger' ? 1 : f === 'months' ? Math.max(1, k2.left) : 0;
      k2.danger = clamp(Math.round(k2.danger), 1, 3); k2.left = Math.max(0, Math.round(k2.left)); k2.started = !!k2.started;
      if (!['fair', 'stingy', 'sly'].includes(k2.temper)) k2.temper = 'fair';
      if (k2.rival != null && !s.rivals.some((r) => r.id === k2.rival)) k2.rival = null;
      if (k2.kind !== 'war') { k2.side = null; k2.foe = null; }
    }
  }
  g.company = s;
});
