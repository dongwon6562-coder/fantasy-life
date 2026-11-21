// 몸으로 느끼는 삶 (30단계): 행동 결과 글과 달 요약이 지금 형편을 알게 한다.
// - 기존 글은 그대로 두고 '맥락 고리' 한 줄을 붙인다: 날씨·때(그달 풍경 그림과 같은 conditions), 계절, 고장, 나이,
//   다친 곳, 배고픔, 돈 사정, 식구(젖먹이·아이·배우자·사별). 한 달에 한두 결과에만, 최근에 쓴 줄은 피한다.
// - 처음 해 보는 일: 그 행동을 처음 했을 때 결과 글 앞에 짧은 장면이 붙고 삶의 기록에 한 줄 남는다(첫 품삯·첫 장사·첫 사냥·첫 술…).
// - 달 요약: sensesLine(g)이 지난달을 몸으로 느낀 한두 문장을 돌려준다(화면이 이어 붙인다).
// 저장: g.senses = { firsts: { [사람 id]: { [첫 일 id]: [년, 월] } }, recent: [줄 번호…], last: { y, m, line } }
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { me, playerAge, family } from '../game.js';
import { byId } from '../npc.js';
import { makeRng } from '../rng.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { conditions } from '../art/scene.js';
import { splitResult, MOOD_LINES } from '../narrative/text.js';
import { ACT_KIND, JOB_KIND, LINES, FIRSTS, SKY, CLEAR, NOW_SKY, NOW_BODY } from './data.js';

const SEA = ['klein', 'portel', 'saltmare', 'crow', 'saltrock', 'barka'];
const CITY = ['harfen', 'verden', 'leocast', 'eisen', 'solaris', 'serenia', 'barka', 'portel', 'saltmare', 'graubel', 'gorge'];
const RECENT_MAX = 24;
const mi = (g) => g.date.year * 12 + g.date.month;
// 달마다 따로 굴리는 난수: 게임 흐름의 난수를 건드리지 않는다
const ownRng = (g) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul(mi(g) * 59 + 3031, 2654435761)) | 0 });

function fresh() { return { firsts: {}, recent: [], last: null }; }
export const sensesState = (g) => (g.senses ??= fresh());

// ---------- 지금 형편 읽기 ----------
const HURT = [
  ['sick', /병|열병|이질|상한 몸|다친 몸|여윈|기침|앓/],
  ['leg', /다리|허벅지|발목|무릎|발/],
  ['arm', /팔|손목|손|어깨/],
  ['back', /등|허리|채찍/],
  ['head', /머리|이마|눈|얼굴/],
];
function hurtOf(p) {
  const inj = (p.injuries ?? []).filter((i) => i && i.months > 0 && typeof i.name === 'string');
  if (!inj.length) return { hurt: null, hurtName: '' };
  for (const [kind, re] of HURT) {
    const i = inj.find((x) => re.test(x.name));
    if (i) return { hurt: kind, hurtName: i.name.replace(/\s*\(.*\)$/, '') };
  }
  return { hurt: 'wound', hurtName: inj[0].name.replace(/\s*\(.*\)$/, '') };
}

/** 이 달 몸이 놓인 형편. 날짜가 넘어가기 전(행동하는 달)에 부른다. */
export function feelOf(g) {
  const p = g.player, self = me(g), life = L(g), age = playerAge(g);
  const c = conditions(g.date.year, g.date.month);
  const place = life.travel ? (life.travel.to ?? life.place) : life.place;
  const kids = (self.childIds ?? []).map((id) => byId(g, id)).filter((k) => k && k.alive && !k.isPlayer && !k.away);
  const sp = self.spouseId ? byId(g, self.spouseId) : null;
  const home = life.home;
  const money = p.money ?? 0, famMoney = p.familyMoney ?? 0;
  const withFamily = home === 'family';
  const broke = age >= 16 ? money < 15 && (!withFamily || famMoney < 20) : false;
  return {
    age, season: c.season, weather: c.weather, tod: c.tod, month: g.date.month,
    place, sea: SEA.includes(place), city: CITY.includes(place), frontier: /^fr_/.test(place) || place === 'estella',
    ...hurtOf(p), scarred: (p.scars ?? []).length > 0,
    tired: (p.fatigue ?? 0) > 60,
    hungry: (g.poor?.hunger ?? 0) >= 1 || (!!g.world?.famine && broke),
    famine: !!g.world?.famine, plague: !!g.world?.plague,
    broke, flush: money >= 400 || (age >= 16 && withFamily && famMoney >= 600),
    street: home === 'street', poorHome: age < 16 && famMoney < 25,
    newborn: kids.some((k) => (k.ageMonths ?? 99) < 12),
    kids: kids.filter((k) => (k.ageMonths ?? 999) < 12 * 12).length,
    spouse: sp && sp.alive ? sp.name : '',
    widowed: !!(sp && !sp.alive && age >= 20),
    awake: !!p.manaAwakened,
    fam: family(g)?.id,
    jailed: isJailed(g),
  };
}

// ---------- 행동 → 결 ----------
const byName = new Map();
function actionByName(name) {
  if (!byName.size || !byName.has(name)) for (const a of ACTIONS) if (!byName.has(a.name)) byName.set(a.name, a);
  return byName.get(name);
}
export function kindOf(g, act, f) {
  if (!act) return null;
  if (act.id === 'help_home') return f.fam === 'farmer' && f.age >= 7 ? 'field' : f.fam === 'merchant' ? 'trade' : 'home';
  if (act.id === 'work') {
    const job = L(g).job?.id;
    if (JOB_KIND[job]) return JOB_KIND[job];
    return null;
  }
  return ACT_KIND[act.id] ?? null;
}

// ---------- 고르기 ----------
function candidates(kind, f) {
  const out = [];
  LINES.forEach((e, i) => {
    if (e.k !== '*' && !e.k.includes(kind)) return;
    try { if (!e.w(f)) return; } catch { return; }
    out.push({ e, i });
  });
  return out;
}
const textOf = (e, f) => (typeof e.t === 'function' ? e.t(f) : e.t);
// 결과 글에 한 줄을 끼운다. 뒤에 붙일 때는 끝의 품삯·돈 문장과 몸 상태 줄보다 앞에 넣는다(장면 → 감각 → 셈 순서).
const TAIL = /은화|동화|금화|닢|품삯|값으로|벌이/;
function weave(text, add, before = false) {
  const { scene, gains } = splitResult(text);
  let body;
  if (before) body = `${add} ${scene}`;
  else {
    const sents = scene.split(/(?<=[.!?…])\s+/);
    let cut = sents.length;
    while (cut > 1 && (TAIL.test(sents[cut - 1]) || MOOD_LINES.includes(sents[cut - 1]))) cut--;
    body = [...sents.slice(0, cut), add, ...sents.slice(cut)].join(' ');
  }
  return gains ? `${body} (${gains})` : body;
}

/** 이 달 결과 글에 맥락 고리와 '처음' 장면을 붙인다. (afterActions에서 부름. 시험에서도 직접 부를 수 있다) */
export function weaveMonth(g, results, rng = ownRng(g)) {
  if (!results?.length || g.over) return [];
  const S = sensesState(g), f = feelOf(g), pid = g.player.id;
  const firsts = (S.firsts[pid] ??= {});
  const touched = [];
  // 1) 처음 해 보는 일
  for (const r of results) {
    if (!r?.text || typeof r.text !== 'string' || r.text.startsWith('사정이 바뀌어')) continue;
    const act = actionByName(r.name);
    if (!act) continue;
    const fi = FIRSTS.find((x) => x.acts.includes(act.id));
    if (!fi || firsts[fi.id] || f.age < fi.minAge) continue;
    if (fi.id !== 'jail' && f.jailed) continue;
    firsts[fi.id] = [g.date.year, g.date.month];
    const t = typeof fi.t === 'function' ? fi.t(f) : fi.t;
    r.text = weave(r.text, t, true);
    r.first = fi.id;
    me(g).history.push({ y: g.date.year, m: g.date.month, text: fi.hist });
    touched.push(r);
  }
  // 2) 맥락 고리: 한 달에 많아야 둘, 두드러진 형편일수록 자주
  let budget = rng.chance(0.75) ? (rng.chance(0.35) ? 2 : 1) : 0;
  const order = results.map((r, i) => ({ r, k: rng.next() + i * 0.01 })).sort((a, b) => a.k - b.k).map((x) => x.r);
  const usedNow = new Set();
  for (const r of order) {
    if (budget <= 0) break;
    if (!r?.text || typeof r.text !== 'string' || r.first || r.text.startsWith('사정이 바뀌어')) continue;
    const act = actionByName(r.name);
    const kind = kindOf(g, act, f);
    if (!kind) continue;
    const pool = candidates(kind, f).filter((c) => !usedNow.has(c.i));
    if (!pool.length) continue;
    const pick = rng.weighted(pool, (c) => {
      const s = c.e.s ?? 1;
      return s * s * (S.recent.includes(c.i) ? 0.03 : 1);
    });
    const add = textOf(pick.e, f);
    if (!add || r.text.includes(add)) continue;
    r.text = weave(r.text, add);
    usedNow.add(pick.i);
    S.recent.push(pick.i);
    if (S.recent.length > RECENT_MAX) S.recent.shift();
    touched.push(r);
    budget--;
  }
  return touched;
}

// ---------- 달 요약 ----------
export function monthFeel(g, f = feelOf(g)) {
  const parts = [];
  parts.push(f.weather === 'clear' ? CLEAR[f.season] : SKY[f.weather] ?? CLEAR[f.season]);
  if (f.month === 7 && f.weather === 'rain') parts[0] = '장마가 길게 이어진 달이었다.';
  const body = [];
  if (f.hurt && f.age >= 3) body.push(`${f.hurtName} 때문에 몸이 성치 않았다.`);
  if (f.hungry && f.age >= 3) body.push('배를 곯는 날이 많았다.');
  else if ((g.player.fatigue ?? 0) > 72 && f.age >= 7) body.push('쉴 틈 없이 몸을 쓴 달이었다.');
  if (f.age >= 60 && !f.hurt) body.push('몸이 예전 같지 않다는 것을 자주 느꼈다.');
  const house = [];
  if (f.newborn) house.push('집에서는 젖먹이 우는 소리가 그치지 않았다.');
  if (f.street) house.push('길바닥에서 잠을 청했다.');
  else if (f.broke) house.push('주머니 사정이 빠듯했다.');
  if (f.famine) house.push('흉년이라 집집마다 끼니를 줄였다.');
  if (f.plague) house.push('돌림병 소문에 사람들이 문을 걸어 잠갔다.');
  if (f.widowed && !f.newborn) house.push('빈자리가 아직 크게 느껴졌다.');
  if (!house.length && f.flush) house.push('살림이 넉넉해 걱정이 없었다.');
  return [...parts, ...body.slice(0, 1), ...house.slice(0, 1)].filter(Boolean).join(' ');
}
/** 지난달을 몸으로 느낀 한두 문장. 없으면 빈 문자열. */
export function sensesLine(g) {
  const last = g?.senses?.last;
  return last?.line ?? '';
}
/** 화면용: 지난달 한 줄과 지금까지 '처음' 해 본 일들 */
export function sensesInfo(g) {
  const S = sensesState(g);
  const firsts = Object.entries(S.firsts[g.player.id] ?? {}).map(([id, [y, m]]) => ({ id, y, m, text: FIRSTS.find((x) => x.id === id)?.hist ?? '' }));
  return { line: sensesLine(g), firsts };
}

/** 지금 이 달의 감각 한 줄(지금 시제): 계절·날씨·때와 몸 상태. 화면 '오늘의 장면'에 붙인다. 없으면 null. */
export function sceneLine(g) {
  if (!g?.player || g.over) return null;
  let f;
  try { f = feelOf(g); } catch { return null; }
  const sky = NOW_SKY[f.weather] ?? NOW_SKY.cloudy;
  let line = sky[f.tod] ?? sky.any;
  if (line && typeof line === 'object') line = line[f.season];
  if (!line) return null;
  const parts = [line];
  const part = (f.hurtName.match(/다리|허벅지|발목|무릎|팔|손목|손|어깨/) ?? [''])[0];
  if (f.hurt && f.age >= 3) parts.push(NOW_BODY[f.hurt]?.(part || '다친 곳') ?? '');
  else if (f.hungry && f.age >= 3) parts.push('빈속이 쓰리다.');
  else if ((g.player.fatigue ?? 0) > 75 && f.age >= 7) parts.push('몸이 천근만근이다.');
  else if (f.newborn) parts.push('밤마다 아기 우는 소리에 잠이 얕다.');
  else if (f.age >= 65) parts.push('찬 기운이 무릎에 먼저 닿는다.');
  return parts.filter(Boolean).join(' ');
}

// ---------- 고리 걸기 ----------
// 대를 이은 어른은 이미 남의 손으로 살아온 세월이 있으니 '처음'을 다 해 본 것으로 친다.
function markAllDone(g) {
  const S = sensesState(g), done = (S.firsts[g.player.id] ??= {});
  for (const fi of FIRSTS) done[fi.id] ??= [0, 0];
}
HOOKS.newGame.push((g) => { g.senses = fresh(); });
HOOKS.migrate.push((g) => {
  if (!g.senses) { g.senses = fresh(); if (playerAge(g) >= 12) markAllDone(g); }
  const S = g.senses;
  S.firsts ??= {}; if (!Array.isArray(S.recent)) S.recent = []; S.last ??= null;
});
HOOKS.heir.push((g) => { if (playerAge(g) >= 18) markAllDone(g); });
HOOKS.afterActions.push((g, rng, results) => {
  if (g.player?.alive === false) return;
  const r = ownRng(g);
  const f = feelOf(g);
  weaveMonth(g, results, r);
  sensesState(g).last = { y: g.date.year, m: g.date.month, line: monthFeel(g, f) };
});
