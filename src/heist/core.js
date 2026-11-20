// 큰 한탕: 여러 달에 걸친 계획 범죄. 상태와 도우미.
// - crime.js의 빈집털이·소매치기는 한 칸짜리 일이다. 여기서는 목표를 고르고, 사람을 모으고, 몇 달 정찰하고 준비한 뒤 하룻밤에 건다.
// - 잡히면 crime의 감옥(jail)과 죄 기록(reportCrime)을 쓴다. 지하 조직(underworld)에 있으면 사람 모으기가 쉽다.
// 상태는 game.heist 하나: { plan: 지금 꾸미는 일 | null, loot: 아직 처분 못 한 장물 | null, hunt: 뒤쫓는 사람 | null, done, log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES, travelMonths } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed, crimeState } from '../crime.js';
import { makeRng } from '../rng.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 73) ^ Math.imul(mi(g) * 83 + salt + 31, 2654435761)) | 0 });
export const isPlace = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
export const craft = (g) => crimeState(g).craft ?? 0;
// 몰래 하는 솜씨 (crime.js의 stealth와 같은 셈)
export const sneak = (g) => craft(g) * 0.6 + stat(g, 'agi') * 0.25 + stat(g, 'sen') * 0.25;
export { travelMonths };

// 목표 종류: 어디에 있나, 얼마나 지키나, 무엇이 나오나, 누가 쫓아오나
export const KINDS = {
  vault: { name: '상단 금고', places: ['harfen', 'leocast', 'portel', 'barka', 'verden', 'saltmare'], guard: 50, prize: [600, 1100], hunter: '상단이 푼 사냥개들', hunterPow: 40, line: '두꺼운 철문 너머에 상단의 한 해 장사가 잠들어 있다.' },
  manor: { name: '귀족 저택', places: ['leocast', 'verden', 'eisen', 'graubel', 'serenia', 'solaris'], guard: 45, prize: [450, 900], hunter: '집안 사병과 고용한 추적자', hunterPow: 35, line: '담은 높고 개는 사납지만, 안주인의 보석함은 침실 벽장에 있다고 한다.' },
  temple: { name: '신전 보물고', places: ['solaris', 'leocast', 'harfen', 'eisen'], guard: 55, prize: [700, 1200], hunter: '성광교 이단 심문관', hunterPow: 50, line: '순례자들이 바친 금붙이와 성물이 지하 보물고에 쌓여 있다. 손대면 신앙을 거스르는 일이다.' },
  tax: { name: '왕실 세금 수레', places: ['leocast', 'verden', 'harfen', 'eisen', 'graubel'], guard: 60, prize: [1000, 1800], hunter: '왕실 감찰관과 기마대', hunterPow: 60, line: '철마다 고장의 세금을 실은 수레가 호위를 달고 왕도로 간다. 그 길목은 단 하루만 열린다.' },
};
export const KIND_IDS = Object.keys(KINDS);
const OWNERS = {
  vault: ['은저울 상단', '소금 상단', '포목 상단 과부 주인', '늙은 환전상 길드'],
  manor: ['폰 아르님 백작가', '늙은 남작 부인', '새로 작위를 산 상인 가문', '왕비의 사촌 집안'],
  temple: ['성광교 대신전', '오래된 순례 신전', '수도원 부속 신전'],
  tax: ['국왕의 세리', '변경백의 세리', '황제의 징세관'],
};

// 사람의 역할: 당일 변수 가운데 무엇을 덜어 주나
export const ROLES = {
  lock: { name: '자물쇠장이', helps: ['lock'], text: '철문과 궤짝' },
  muscle: { name: '힘쓰는 사람', helps: ['guard', 'fight'], text: '경비를 누르고 무거운 것을 든다' },
  inside: { name: '안사람', helps: ['shift', 'witness'], text: '목표 안에서 일하는 끄나풀' },
  lookout: { name: '망꾼', helps: ['watch', 'rival'], text: '골목과 지붕을 지켜본다' },
  driver: { name: '마부', helps: ['escape'], text: '수레와 말, 빠져나갈 길' },
  forger: { name: '위조꾼', helps: ['papers'], text: '통행증과 가짜 인장' },
};
export const ROLE_IDS = Object.keys(ROLES);
const NAMES = ['손 빠른 니나', '구두장이 오이겐', '벙어리 테오', '외팔이 바르톨', '수녀였던 아가테', '쥐새끼 핍', '늙은 금고장이 요나스', '말 도둑 칼레', '가짜 서기 루트비히', '빨간 머리 졸레', '쌍둥이 형 마츠', '조용한 하이데'];

function fresh() {
  return { plan: null, loot: null, hunt: null, done: [], log: [], seq: 1, eventAt: 0, total: 0, betrayed: 0, caught: 0, crewBook: [], offers: null };
}
export const H = (g) => (g.heist ??= fresh());
export const plan = (g) => H(g).plan;
export const atTarget = (g) => !!plan(g) && plan(g).place === here(g) && !L(g).travel;

export function logHeist(g, text) {
  const s = H(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
export function newMate(g, rng, role, used = new Set()) {
  const s = H(g);
  const name = rng.pick(NAMES.filter((n) => !used.has(n))) ?? rng.pick(NAMES);
  const skill = rng.int(30, 70);
  return { id: s.seq++, name, role: ROLES[role] ? role : rng.pick(ROLE_IDS), skill, greed: rng.int(20, 80), loyal: rng.int(35, 70), fee: Math.round(10 + skill * 0.4) };
}
export const NAME_POOL = NAMES;

export function newTarget(g, rng, kind, place) {
  const k = KINDS[kind];
  const prize = rng.int(k.prize[0], k.prize[1]);
  return { kind, place, owner: rng.pick(OWNERS[kind]), name: `${placeName(place)} ${k.name}`, guard: k.guard + rng.int(-6, 10), prize };
}
export function newPlan(g, t) {
  return { ...t, crew: [], intel: 0, prep: { tools: false, plan: false, bribe: false, escape: false, papers: false }, since: mi(g), alarm: 0, day: t.kind === 'tax' ? mi(g) + 4 : null, idle: 0 };
}
export const roleHave = (p, role) => p.crew.some((m) => m.role === role);
export const crewPow = (p) => p.crew.reduce((a, m) => a + m.skill * 0.12, 0);
export const hasHelp = (p, need) => p.crew.some((m) => ROLES[m.role].helps.includes(need));
// 준비가 얼마나 됐나: 0~100
export function readiness(p) {
  const prep = Object.values(p.prep).filter(Boolean).length;
  return clamp(Math.round(p.intel * 0.5 + prep * 7 + Math.min(4, p.crew.length) * 4 - p.alarm * 0.5), 0, 100);
}
export function endPlan(g, how, take = 0) {
  const s = H(g), p = s.plan;
  if (!p) return;
  s.done.unshift({ name: p.name, kind: p.kind, owner: p.owner, year: g.date.year, how, take });
  if (s.done.length > 8) s.done.length = 8;
  s.plan = null;
  logHeist(g, `${p.name}: ${how}.`);
}
export const hotWord = (h) => (h >= 70 ? '바짝 뒤에 붙었다' : h >= 40 ? '냄새를 맡았다' : h >= 15 ? '헛다리를 짚고 있다' : '거의 손을 놓았다');

HOOKS.newGame.push((g) => { g.heist = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.heist && typeof g.heist === 'object' ? g.heist : {});
  for (const k of ['done', 'log', 'crewBook']) if (!Array.isArray(s[k])) s[k] = [];
  s.done = s.done.filter((x) => x && typeof x.name === 'string');
  for (const k of ['seq', 'eventAt', 'total', 'betrayed', 'caught']) if (!Number.isFinite(s[k])) s[k] = k === 'seq' ? 1 : 0;
  if (s.offers && (typeof s.offers !== 'object' || !Array.isArray(s.offers.list))) s.offers = null;
  if (s.cands && (typeof s.cands !== 'object' || !Array.isArray(s.cands.list))) s.cands = null;
  if (s.split && (typeof s.split !== 'object' || !Number.isFinite(s.split.value) || !Array.isArray(s.split.crew))) s.split = null;
  if (s.split) { s.split.crew = s.split.crew.filter((m) => m && typeof m.name === 'string' && ROLES[m.role] && Number.isFinite(m.greed) && Number.isFinite(m.loyal)); if (typeof s.split.name !== 'string') s.split.name = '한탕'; }
  if (s.grudge && (typeof s.grudge !== 'object' || !Array.isArray(s.grudge.names) || !Number.isFinite(s.grudge.at))) s.grudge = null;
  if (s.grudge) { s.grudge.names = s.grudge.names.filter((n) => typeof n === 'string'); if (!s.grudge.names.length) s.grudge = null; }
  s.crewBook = s.crewBook.filter((b) => b && typeof b.name === 'string' && ROLES[b.role]);
  for (const b of s.crewBook) { if (!Number.isFinite(b.loyal)) b.loyal = 40; if (!Number.isFinite(b.skill)) b.skill = 40; }
  const p = s.plan;
  if (p && (typeof p !== 'object' || !KINDS[p.kind] || !isPlace(p.place))) s.plan = null;
  if (s.plan) {
    if (typeof p.name !== 'string') p.name = `${placeName(p.place)} ${KINDS[p.kind].name}`;
    if (typeof p.owner !== 'string') p.owner = KINDS[p.kind].name;
    if (!Array.isArray(p.crew)) p.crew = [];
    p.crew = p.crew.filter((m) => m && typeof m.name === 'string' && ROLES[m.role]);
    for (const m of p.crew) for (const k of ['id', 'skill', 'greed', 'loyal', 'fee']) if (!Number.isFinite(m[k])) m[k] = k === 'id' ? s.seq++ : 40;
    for (const k of ['intel', 'guard', 'prize', 'alarm', 'since', 'idle']) if (!Number.isFinite(p[k])) p[k] = k === 'guard' ? KINDS[p.kind].guard : k === 'prize' ? KINDS[p.kind].prize[0] : 0;
    p.intel = clamp(p.intel, 0, 100); p.alarm = clamp(p.alarm, 0, 100); p.prize = Math.max(0, Math.round(p.prize));
    const prep = p.prep && typeof p.prep === 'object' ? p.prep : {};
    p.prep = { tools: !!prep.tools, plan: !!prep.plan, bribe: !!prep.bribe, escape: !!prep.escape, papers: !!prep.papers };
    if (p.day != null && !Number.isFinite(p.day)) p.day = null;
    if (p.kind === 'tax' && p.day == null) p.day = mi(g) + 3;
  }
  const l = s.loot;
  if (l && (typeof l !== 'object' || !Number.isFinite(l.value) || typeof l.from !== 'string')) s.loot = null;
  if (s.loot) { l.value = Math.max(0, Math.round(l.value)); if (!KINDS[l.kind]) l.kind = 'vault'; if (!Number.isFinite(l.at)) l.at = mi(g); }
  const h = s.hunt;
  if (h && (typeof h !== 'object' || typeof h.by !== 'string' || !Number.isFinite(h.clue))) s.hunt = null;
  if (s.hunt) { h.clue = clamp(h.clue, 0, 100); if (!KINDS[h.kind]) h.kind = 'vault'; if (!Number.isFinite(h.pow)) h.pow = 40; for (const k of ['pow', 'until']) if (!Number.isFinite(h[k])) h[k] = k === 'pow' ? 40 : mi(g) + 24; if (typeof h.target !== 'string') h.target = '한탕'; }
  g.heist = s;
});
