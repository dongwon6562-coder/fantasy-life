// 움직이는 대륙: 나라와 나라 사이의 관계, 조약, 전쟁, 땅 주인, 통치자. 상태는 g.politics 하나.
//   rel{'a|b': -100~100}  pacts[{a,b,kind,since,until}] (kind: alliance 동맹 | trade 교역 | truce 휴전 | marriage 혼인 | vassal 신종(a가 주군))
//   wars[{a,b,since,score(+면 a 우세),weary,taken[]}]  owner{땅: 나라}  rulers{나라: {title,name,house,born,since,heir,legend,no}}
//   stab{나라: 0~100}  fallen[{realm,house,y}] 끊긴 왕조  news[{y,m,text}] 대륙 소식  me{...} 플레이어가 끼어든 흔적
// 레오니아-발하르트 사이는 world.js(g.realm.balhart)가 맡고, 여기서는 그것을 읽어 보여 주고 살짝 민다.
import { HOOKS } from '../hooks.js';
import { REALMS, NAMES } from '../realms/data.js';
import { LANDS, NATURE, START_REL, START_PACTS, START_RULERS, EXTRA_NAMES } from './data.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const NATIONS = Object.keys(NATURE);
export const nations = () => NATIONS.filter((id) => REALMS[id]);
export const short = (id) => REALMS[id]?.short ?? id;
export const full = (id) => REALMS[id]?.name ?? id;

export const PS = (g) => (g.politics ??= fresh(g));
export function fresh(g) {
  const rel = {};
  for (const a of NATIONS) for (const b of NATIONS) if (a < b) rel[key(a, b)] = START_REL[key(a, b)] ?? START_REL[`${a}|${b}`] ?? START_REL[`${b}|${a}`] ?? 0;
  const y = g?.date?.year ?? 500;
  const rulers = {};
  for (const [id, r] of Object.entries(START_RULERS)) rulers[id] = { title: r.title, sex: r.sex ?? 'm', no: +(r.name.match(/(\d)세$/)?.[1] ?? 0), name: r.name, house: r.house ?? null, born: y - r.age, since: y - Math.min(20, Math.floor(r.age / 3)), heir: !!r.heir, legend: r.legend ?? null };
  const stab = {};
  for (const id of NATIONS) stab[id] = 60;
  return {
    rel, rulers, stab,
    pacts: START_PACTS.map((p) => ({ ...p, since: y - 10, until: null })),
    wars: [], owner: {}, fallen: [], news: [],
    me: { envoy: 0, merc: 0, mercFor: null, mercAt: -99, spyFor: null, spied: 0, smuggled: 0 },
  };
}

// ---------- 관계 ----------
export function relOf(g, a, b) {
  if (a === b) return 100;
  if (key(a, b) === 'leonia|valhart' && g.realm?.balhart) return clamp(Math.round(30 - g.realm.balhart.tension * 1.2), -100, 100);
  return PS(g).rel[key(a, b)] ?? 0;
}
export function shiftRel(g, a, b, n) {
  if (a === b) return;
  if (key(a, b) === 'leonia|valhart' && g.realm?.balhart) { g.realm.balhart.tension = clamp(g.realm.balhart.tension - n / 1.2, 0, 100); return; }
  const P = PS(g), k = key(a, b);
  P.rel[k] = clamp((P.rel[k] ?? 0) + n, -100, 100);
}
export const relWord = (v) => (v >= 60 ? '굳은 우방' : v >= 30 ? '가까운 사이' : v >= 5 ? '무난한 사이' : v > -25 ? '서먹한 사이' : v > -55 ? '날 선 사이' : '원수지간');

// ---------- 조약 ----------
export const pactOf = (g, a, b, kind) => PS(g).pacts.find((p) => p.kind === kind && ((p.a === a && p.b === b) || (p.a === b && p.b === a))) ?? null;
export const pactsOf = (g, a, b) => PS(g).pacts.filter((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
export function addPact(g, a, b, kind, months = null) {
  if (pactOf(g, a, b, kind)) return false;
  PS(g).pacts.push({ a, b, kind, since: mi(g), until: months ? mi(g) + months : null });
  return true;
}
export function dropPact(g, a, b, kind) {
  const P = PS(g);
  const n = P.pacts.length;
  P.pacts = P.pacts.filter((p) => !(p.kind === kind && ((p.a === a && p.b === b) || (p.a === b && p.b === a))));
  return P.pacts.length < n;
}
export const alliesOf = (g, id) => PS(g).pacts.filter((p) => p.kind === 'alliance' && (p.a === id || p.b === id)).map((p) => (p.a === id ? p.b : p.a));
export const overlordOf = (g, id) => PS(g).pacts.find((p) => p.kind === 'vassal' && p.b === id)?.a ?? null;

// ---------- 전쟁 ----------
// 레오니아-발하르트 전쟁은 world.js의 것을 같은 모양으로 보여 준다
function balhartWar(g) {
  const b = g.realm?.balhart;
  if (!b?.war) return null;
  return { a: 'leonia', b: 'valhart', since: mi(g) - (b.warMonths ?? 0), score: (b.front ?? 0) * 3, weary: b.warMonths ?? 0, taken: [], world: true };
}
export const ownWars = (g) => PS(g).wars;
export const allWars = (g) => { const w = balhartWar(g); return w ? [w, ...PS(g).wars] : [...PS(g).wars]; };
export const warOf = (g, a, b) => allWars(g).find((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a)) ?? null;
export const warsOf = (g, id) => allWars(g).filter((w) => w.a === id || w.b === id);
export const atWarRealm = (g, id) => warsOf(g, id).length > 0;
export const foeIn = (w, id) => (w.a === id ? w.b : w.a);
// 이 전쟁에서 id 쪽이 얼마나 앞서나 (+ 우세)
export const edgeOf = (w, id) => (w.a === id ? w.score : -w.score);

// ---------- 땅 ----------
export function landOwner(g, land) {
  const L0 = LANDS[land];
  if (!L0) return null;
  if (land === 'ort') return (g.realm?.balhart?.fortsLost ?? 0) >= 1 ? 'valhart' : 'leonia';
  if (land === 'stellen') return (g.realm?.balhart?.fortsLost ?? 0) >= 2 ? 'valhart' : 'leonia';
  return PS(g).owner[land] ?? L0.home;
}
export const landsOf = (g, id) => Object.keys(LANDS).filter((l) => landOwner(g, l) === id);
// a와 b가 다툴 수 있는 땅: 한쪽 땅이면서 다른 쪽이 노리거나, 원래 다른 쪽 땅이었던 곳
export function contested(g, a, b) {
  return Object.entries(LANDS).filter(([id, l]) => !l.fixed && (
    (landOwner(g, id) === a && (l.rivals.includes(b) || l.home === b)) || (landOwner(g, id) === b && (l.rivals.includes(a) || l.home === a))
  )).map(([id]) => id);
}
export const neighbors = (g, a, b) => Object.values(LANDS).some((l) => (l.home === a && l.rivals.includes(b)) || (l.home === b && l.rivals.includes(a)));

// ---------- 통치자 ----------
export const rulerOf = (g, id) => PS(g).rulers[id] ?? null;
export function rulerAge(g, id) { const r = rulerOf(g, id); return r ? g.date.year - r.born : 0; }
export function rulerLine(g, id) {
  if (id === 'leonia') return null;
  const r = rulerOf(g, id);
  if (!r) return REALMS[id]?.ruler ?? '';
  return `${r.title} ${r.name}${r.house && NATURE[id]?.kind === 'dynasty' && !r.name.includes(r.house) ? ` ${r.house}` : ''}`;
}
export function nameFor(rng, realm, sex = 'm') {
  const n = NAMES[realm] ?? EXTRA_NAMES[realm] ?? NAMES.valhart;
  const list = sex === 'f' ? n.f : n.m;
  return { name: rng.pick(list), last: n.last?.length ? rng.pick(n.last) : '' };
}

// ---------- 소식 ----------
export function pnews(g, text) {
  const P = PS(g);
  P.news.push({ y: g.date.year, m: g.date.month, text });
  if (P.news.length > 40) P.news.splice(0, P.news.length - 40);
}

// REALMS의 통치자 글을 지금 통치자로 맞춘다 (나라 정보 화면이 그대로 읽는다)
const ORIG_RULER = {};
export function syncRulerText(g) {
  for (const id of nations()) {
    if (ORIG_RULER[id] == null) ORIG_RULER[id] = REALMS[id].ruler;
    if (id === 'leonia' || NATURE[id]?.kind === 'council') continue;
    const r = g ? rulerOf(g, id) : null;
    REALMS[id].ruler = r && g ? rulerLine(g, id) : ORIG_RULER[id];
  }
}

function fill(g) {
  const P = PS(g), f = fresh(g);
  for (const k of Object.keys(f)) P[k] ??= f[k];
  for (const k of Object.keys(f.rel)) P.rel[k] ??= f.rel[k];
  for (const k of Object.keys(f.rulers)) P.rulers[k] ??= f.rulers[k];
  for (const k of Object.keys(f.stab)) P.stab[k] ??= f.stab[k];
  for (const k of Object.keys(f.me)) P.me[k] ??= f.me[k];
}
HOOKS.newGame.push((g) => { syncRulerText(null); g.politics = fresh(g); syncRulerText(g); });
HOOKS.migrate.push((g) => { fill(g); syncRulerText(g); });
