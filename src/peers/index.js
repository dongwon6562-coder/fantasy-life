// 45단계: 함께 자란 세대. 상태는 g.peers 하나, 화면 연결점은 peersLines(g) / peersLine(g) / peersInfo(g).
// 나와 같은 해쯤 같은 고장에서 난 아이들 다섯. 벗(friends)도 원수(feud)도 형제(siblings)도 아니다. 그냥 같은 해에 났다.
// - 어린 시절: 같은 해 난 아이들의 작은 일들이 줄로 지나가고, 열 살 무렵 한 번 함께 일을 겪는다(pe_young).
// - 열다섯쯤: 저마다 길을 고른다(남은 사람·기사·병사·장사꾼·도적·마법사·사제·관리·장인·떠난 사람). 흩어지는 날(pe_parting).
// - 그 뒤 한 해에 한 번씩 저마다의 삶이 굴러간다: 오르고, 몰락하고, 혼인하고, 아이를 보고, 죽는다. 소식이 늦게 닿는다.
// - 다시 만남: 같은 고장에서 마주침(pe_cross), 전장(같은 진영), 재판정(증인, pe_court), 약속한 동창 모임(pe_gather, 서른·마흔·쉰·예순).
// - 엇갈림과 도움: 몰락한 이가 손을 내밀고(pe_ask), 도움받은 이가 잘되면 갚으러 온다(pe_repay). 같은 길을 가면 맞수가 된다(pe_rival).
// - 늙어서 남은 사람(pe_last).
// - NPC끼리: 동세대끼리 혼인하고, 털고, 잡아넘기고, 거두고, 다툰다. 내가 대를 이으면 선대의 동세대는 뒤에서 계속 늙어 가고, 새 머리의 동세대가 새로 생긴다.
// 새 행동은 없다. 게임 난수는 건드리지 않는다(ownRng). 사람 목록(g.people)에 새 사람을 넣지 않는다: 같은 해 난 실제 이웃 아이는 이름만 빌려 따라간다.
import { J, hasBatchim } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId } from '../npc.js';
import { MALE_NAMES, FEMALE_NAMES, LAST_NAMES, TRAITS } from '../data.js';
import { PLACES } from '../places.js';
import { REALMS } from '../realms/data.js';
import { realmOf } from '../realms/index.js';
import { RACES, RACE_NAMES } from '../races/data.js';
import { raceOf } from '../races/index.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, tired, spend, canSpend, check } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { bestie } from '../childhood/state.js';
import { makeRng } from '../rng.js';
import * as T from './data.js';

const { PATHS, PATH_IDS } = T;
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 곳';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 331) ^ Math.imul(mi(g) * 191 + salt + 97, 2654435761)) | 0 });
const nd = (n) => `${n}${hasBatchim(n) ? '이다' : '다'}`;
const free = (g) => !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.captive && !L(g).heirPending;
const COHORT = 5;
const NUM = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟'];

/* ---------- 상태 ---------- */
export function peersState(g) {
  g.peers ??= {};
  const s = g.peers;
  s.gen ??= 0;
  s.built ??= false;
  s.home ??= null;      // 난 고장
  s.born ??= null;      // 내가 난 달
  s.race ??= 'human';
  s.list ??= [];        // 이번 대의 동세대
  s.elders ??= [];      // 선대의 동세대 [{ from, list }]
  s.past ??= [];        // 지난 대 정리 [{ who, n, best, alive }]
  s.news ??= [];        // [{ y, m, text }]
  s.month ??= [];
  s.log ??= [];
  s.done ??= {};
  s.used ??= [];
  s.sceneAt ??= -99;
  s.nextId ??= 1;
  s.pledge ??= false;
  s.setout ??= [];      // 흩어지는 날을 기다리는 사람 id
  s.tally ??= { scenes: 0, deaths: 0, wed: 0, pair: 0, rise: 0, fall: 0, news: 0 };
  return s;
}
const S = peersState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text, id = null) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, id, text }); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 24) s.used.shift();
  return pool[i];
}
const ageOf = (g, c) => Math.floor((mi(g) - c.born) / 12);
// 오래 사는 종족은 몸이 천천히 늙는다
const bodyOf = (g, c) => ageOf(g, c) * 70 / (RACES[c.race]?.life ?? 70);
const has = (c, t) => c.traits.includes(t);
const pOf = (c) => PATHS[c.path] ?? null;
export const stageWord = (c) => (c.path ? pOf(c).stages[c.stage] : '아이');
const fame = (c) => clamp(c.stage * 22 + (c.fallen ? -15 : 0) + (c.path === 'outlaw' ? 4 : 0), 0, 100);
const byPid = (g, c) => (c.pid != null ? byId(g, c.pid) : null);
function addLife(g, c, text) { c.life.push({ y: g.date.year, m: g.date.month, text }); if (c.life.length > 8) c.life.shift(); }
function addNews(g, text) { const s = S(g); s.news.push({ y: g.date.year, m: g.date.month, text }); if (s.news.length > 30) s.news.shift(); s.tally.news += 1; }
const alive = (c) => c.alive;
const pathed = (c) => c.alive && !!c.path;
const mine = (g) => S(g).list;
const knownName = (c) => c.name;

/* ---------- 같은 해 난 아이들 만들기 ---------- */
function namesFor(race, sex, rng) {
  const R = RACE_NAMES[race];
  if (race === 'human' || !R) return { name: rng.pick(sex === 'm' ? MALE_NAMES : FEMALE_NAMES), lastName: rng.pick(LAST_NAMES) };
  const pool = R[sex] ?? R.m;
  const last = Array.isArray(R.last) ? rng.pick(R.last) : rng.pick(Object.values(R.last ?? { x: '' }));
  return { name: rng.pick(pool), lastName: last };
}
function pickTraits(rng) {
  const out = [];
  for (let k = 0; k < 6 && out.length < 2; k++) {
    const t = rng.pick(TRAITS);
    if (out.includes(t.id) || out.some((o) => TRAITS.find((x) => x.id === o)?.opp === t.id)) continue;
    out.push(t.id);
  }
  return out;
}
function newPeer(g, rng, { born, race, home, pid = null, name, lastName, sex, traits }) {
  const s = S(g);
  return {
    id: s.nextId++, pid, name, lastName, sex, born, race, traits, home,
    path: null, stage: 0, fallen: false, alive: true, diedAt: null, cause: null,
    place: home, wed: false, spouse: null, kids: 0, tie: 'none', owed: 0, lastMet: mi(g), met: 0, life: [], gen: s.gen, wedNews: false,
  };
}
// born: 내가 난 달. home: 난 고장. skip: 빼야 할 사람 id (나, 형제, 소꿉친구)
function buildCohort(g, rng, born, home, race, skip) {
  const s = S(g);
  const out = [];
  const myAge = mi(g) - born;
  const real = (g.people ?? []).filter((p) => p.alive && !skip.has(p.id) && (p.place ?? 'ern') === home && Math.abs(p.ageMonths - myAge) <= 24 && raceOf(p) === race);
  for (const p of real.slice(0, 2)) {
    out.push(newPeer(g, rng, { born: mi(g) - p.ageMonths, race, home, pid: p.id, name: p.name, lastName: p.lastName, sex: p.sex, traits: (p.traits ?? []).slice(0, 2) }));
  }
  const taken = new Set([me(g).name, ...out.map((c) => c.name)]);
  while (out.length < COHORT) {
    const sex = rng.chance(0.5) ? 'm' : 'f';
    let nm = namesFor(race, sex, rng);
    for (let k = 0; k < 6 && taken.has(nm.name); k++) nm = namesFor(race, sex, rng);
    if (taken.has(nm.name)) break;
    taken.add(nm.name);
    out.push(newPeer(g, rng, { born: born + rng.int(-14, 14), race, home, sex, traits: pickTraits(rng), ...nm }));
  }
  return out;
}
function skipSet(g) {
  const m = me(g);
  const skip = new Set([m.id]);
  for (const p of g.people ?? []) {
    if ((p.fatherId != null && p.fatherId === m.fatherId) || (p.motherId != null && p.motherId === m.motherId) || p.id === m.fatherId || p.id === m.motherId) skip.add(p.id);
  }
  const b = bestie(g); if (b) skip.add(b.id);
  return skip;
}
function build(g, rng) {
  const s = S(g);
  const m = me(g);
  s.born = mi(g) - m.ageMonths;
  s.home = here(g);
  s.race = raceOf(m);
  s.list = buildCohort(g, rng, s.born, s.home, s.race, skipSet(g));
  s.built = true;
  // 이미 자란 머리(옛 저장·대 잇기): 지난 해들을 조용히 굴린다
  const years = Math.floor(m.ageMonths / 12);
  if (years >= 15) {
    for (let y = 15; y <= years; y++) for (const c of s.list) yearOf(g, rng, c, { quiet: true, at: c.born + y * 12 });
    s.done.young = true;
    if (years >= 18) s.done.part = true;
    s.setout = [];
  } else if (years >= 12) s.done.young = true;
}

/* ---------- 저마다의 길 ---------- */
function capitalOf(home) {
  const r = realmOf(home);
  return REALMS[r]?.capital ?? home;
}
const OPEN = () => Object.keys(PLACES).filter((k) => !PLACES[k].hidden && PLACES[k].realm !== 'demon');
function placeFor(rng, c) {
  const home = c.home;
  const go = pOf(c)?.go ?? 'home';
  const open = OPEN();
  if (go === 'home') return home;
  if (go === 'capital') return rng.chance(0.75) ? capitalOf(home) : rng.pick(open);
  if (go === 'tower') return rng.chance(0.6) ? 'serenia' : capitalOf(home);
  if (go === 'temple') return rng.chance(0.4) ? 'solaris' : capitalOf(home);
  if (go === 'trade') return rng.pick(['barka', 'portel', capitalOf(home), rng.pick(open)].filter((x) => PLACES[x]));
  if (go === 'wild') return rng.pick(open.filter((k) => REALMS[realmOf(k)]?.capital !== k));
  // 떠난 사람: 다른 나라
  const far = open.filter((k) => realmOf(k) !== realmOf(home));
  return far.length ? rng.pick(far) : rng.pick(open);
}
function choosePath(g, rng, c) {
  const p = byPid(g, c);
  const fromJob = p && p.job && p.job !== 'child' && p.job !== 'idle' ? T.JOB_PATH[p.job] : null;
  if (fromJob) return fromJob;
  if (p?.away) return 'gone';
  const w = PATH_IDS.map((id) => {
    const P = PATHS[id];
    let v = id === 'stay' ? 3 : id === 'mage' ? 0.6 : id === 'outlaw' ? 0.7 : 1;
    for (const t of P.want) if (has(c, t)) v += 1.2;
    if (c.race !== 'human' && (id === 'knight' || id === 'scholar')) v *= 0.6;
    return v;
  });
  let r = rng.next() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return PATH_IDS[i]; }
  return 'stay';
}
function deathChance(c, body) {
  let d = body < 30 ? 0.004 : body < 45 ? 0.007 : body < 58 ? 0.014 : body < 66 ? 0.03 : body < 74 ? 0.06 : 0.12;
  if (c.path) d += pOf(c).risk * (c.fallen ? 1.5 : 1);
  return d;
}
// 한 해에 한 번. quiet: 지난 해를 몰아 굴릴 때(소식 없음). at: 그 해의 달(몰아 굴릴 때)
function yearOf(g, rng, c, { quiet = false, at = mi(g), elder = false } = {}) {
  const s = S(g);
  if (!c.alive) return null;
  const age = Math.floor((at - c.born) / 12);
  const body = age * 70 / (RACES[c.race]?.life ?? 70);
  const p = byPid(g, c);
  if (c.pid != null && p && !p.alive) { c.alive = false; c.diedAt = at; c.cause = 'age'; addLife(g, c, '세상을 떠났다'); return { k: 'death', why: body < 50 ? 'sick' : 'age' }; }
  if (p) { c.name = p.name; if (p.spouseId && !c.wed) { c.wed = true; } }
  if (age < 15) return null;
  if (!c.path) {
    c.path = choosePath(g, rng, c);
    c.place = p ? (p.away ? placeFor(rng, c) : p.place ?? c.home) : placeFor(rng, c);
    addLife(g, c, T.SET_OUT[c.path] ? `${pOf(c).name}의 길로 나섰다` : '길을 떠났다');
    if (!quiet && !elder) s.setout.push(c.id);
    return { k: 'path' };
  }
  // 죽음 (실제 이웃은 세상 쪽이 죽인다)
  if (c.pid == null && rng.chance(deathChance(c, body))) {
    c.alive = false; c.diedAt = at; s.tally.deaths += 1;
    const why = c.path === 'outlaw' && c.stage >= 2 && rng.chance(0.5) ? 'rope' : (c.path === 'soldier' || c.path === 'knight') && body < 55 && rng.chance(0.6) ? 'war' : c.path === 'gone' && rng.chance(0.5) ? 'far' : body < 50 ? 'sick' : 'age';
    c.cause = why;
    addLife(g, c, why === 'rope' ? '교수대에서 죽었다' : why === 'war' ? '전장에서 죽었다' : '세상을 떠났다');
    return { k: 'death', why };
  }
  const P = pOf(c);
  const want = P.want.filter((t) => has(c, t)).length;
  // 몰락했던 이가 다시 일어선다
  if (c.fallen) {
    if (rng.chance(0.1 + want * 0.04)) { c.fallen = false; addLife(g, c, '다시 일어섰다'); return { k: 'recover' }; }
    return null;
  }
  // 오른다
  if (c.stage < 4 && body < 66) {
    let up = 0.1 + want * 0.05 - c.stage * 0.02;
    if (c.stage === 3) up *= c.path === 'mage' ? 0.12 : 0.35;
    if (c.path === 'mage' && c.stage === 2) up *= 0.5;
    if (has(c, 'lazy') || has(c, 'drunkard')) up *= 0.6;
    if (rng.chance(up)) {
      c.stage += 1; s.tally.rise += 1;
      addLife(g, c, P.rise[c.stage - 1]);
      return { k: 'rise' };
    }
  }
  // 몰락한다
  if (c.stage >= 1) {
    let dn = c.path === 'outlaw' ? 0.09 : 0.035;
    if (has(c, 'drunkard') || has(c, 'lazy')) dn += 0.03;
    if (has(c, 'diligent')) dn -= 0.01;
    if (rng.chance(dn)) {
      c.fallen = true; s.tally.fall += 1;
      if (c.stage >= 2 && rng.chance(0.5)) c.stage -= 1;
      const f = rng.pick(P.fall); c.fallText = f;
      addLife(g, c, f);
      return { k: 'fall', f };
    }
  }
  // 혼인과 아이 (실제 이웃은 세상 쪽이 짝을 맺는다)
  if (c.pid == null && !c.wed && age >= 18 && body < 45 && rng.chance(c.path === 'priest' ? 0.02 : 0.11)) { c.wed = true; s.tally.wed += 1; addLife(g, c, '혼인했다'); return { k: 'wed' }; }
  if (c.wed && body < 46 && rng.chance(0.14)) { c.kids += 1; addLife(g, c, '아이를 보았다'); return { k: 'kid' }; }
  // 자리를 옮긴다
  if (c.path !== 'stay' && rng.chance(0.06)) { c.place = placeFor(rng, c); return { k: 'move' }; }
  return null;
}

/* ---------- 소식으로 내려오기 ---------- */
function newsOf(g, rng, c, ev) {
  if (!ev) return null;
  const x = { n: c.name, p: placeName(c.place), s: stageWord(c) };
  if (ev.k === 'rise' && c.stage >= 2) return `${J(c.name, '이/가')} ${pOf(c).rise[c.stage - 1]}고 한다.`;
  if (ev.k === 'fall') return `${J(c.name, '이/가')} ${ev.f}고 한다.`;
  if (ev.k === 'death') return pickFresh(g, rng, `d${ev.why}`, T.DEATH_NEWS[ev.why] ?? T.DEATH_NEWS.age)(x);
  if (ev.k === 'wed' && rng.chance(0.6)) return pickFresh(g, rng, 'wd', T.WED_NEWS)(x);
  if (ev.k === 'kid' && rng.chance(0.25)) return pickFresh(g, rng, 'kd', T.KID_NEWS)(x);
  if (ev.k === 'recover' && rng.chance(0.5)) return `${J(c.name, '이/가')} 다시 일어섰다고 한다. ${x.p}에서 ${J(x.s, '으로/로')} 산다고.`;
  return null;
}
function cohortTick(g, rng) {
  const s = S(g);
  const now = mi(g);
  const myAge = playerAge(g);
  for (const c of s.list) {
    if (!c.alive || ((c.id * 7 + s.gen) % 12) + 1 !== g.date.month) continue;
    const ev = yearOf(g, rng, c);
    if (!ev) continue;
    if (ev.k === 'death') {
      log(g, `같은 해에 난 ${J(c.name, '이/가')} 세상을 떠났다.`);
      // 동세대 가운데 하나가 장례에 온다 (NPC끼리)
      const mourner = s.list.find((o) => o !== c && o.alive && o.path && (has(o, 'kind') || has(o, 'generous') || o.tie === 'warm'));
      if (mourner && rng.chance(0.3)) { addNews(g, T.PAIR.mourn({ a: mourner.name, b: c.name })); s.tally.pair += 1; }
    }
    const t = myAge >= 13 ? newsOf(g, rng, c, ev) : null;
    if (!t) continue;
    addNews(g, t);
    const near = c.place === here(g);
    line(g, 'news', near ? t : pickFresh(g, rng, 'nh', T.NEWS_HEAD)({ t }), c.id);
  }
  // 동세대끼리 (한 해에 한 번, 여섯째 달)
  if (g.date.month === 6) pairTick(g, rng);
  // 마지막 남은 사람 (줄)
  if (myAge >= 55 && !s.done.lastLine && s.list.length >= 4) {
    const left = s.list.filter(alive);
    if (left.length <= 1) { s.done.lastLine = now; line(g, 'last', (left.length ? T.LAST_ONE[0] : T.LAST_ONE[1])({ n: left[0]?.name ?? '' })); }
  }
}
function pairTick(g, rng) {
  const s = S(g);
  const live = s.list.filter(pathed);
  if (live.length < 2) return;
  const say = (t) => { addNews(g, t); s.tally.pair += 1; if (playerAge(g) >= 15) line(g, 'pair', pickFresh(g, rng, 'nh', T.NEWS_HEAD)({ t })); };
  const a = rng.pick(live); const b = rng.pick(live.filter((o) => o !== a));
  const ag = (c) => ageOf(g, c);
  if (!a.wed && !b.wed && a.sex !== b.sex && a.pid == null && b.pid == null && ag(a) >= 18 && ag(a) <= 34 && a.path !== 'priest' && b.path !== 'priest' && rng.chance(0.08)) {
    a.wed = b.wed = true; a.spouse = b.id; b.spouse = a.id; s.tally.wed += 1;
    addLife(g, a, `같은 해 난 ${J(b.name, '과/와')} 혼인했다`); addLife(g, b, `같은 해 난 ${J(a.name, '과/와')} 혼인했다`);
    return say(T.PAIR.wed({ a: a.name, b: b.name }));
  }
  const pair = (x, y) => (a.path === x && b.path === y ? [a, b] : b.path === x && a.path === y ? [b, a] : null);
  const rob = pair('outlaw', 'merchant');
  if (rob && rob[0].stage >= 1 && !rob[0].fallen && rng.chance(0.2)) {
    const [o, m] = rob; if (m.stage >= 1 && rng.chance(0.5)) { m.fallen = true; m.fallText = '상단을 털려 밑천을 잃었다'; }
    addLife(g, m, `같은 해 난 ${o.name}의 패에게 털렸다`);
    return say(T.PAIR.rob({ a: o.name, b: m.name }));
  }
  const law = pair('knight', 'outlaw') ?? pair('soldier', 'outlaw') ?? pair('scholar', 'outlaw');
  if (law && law[1].stage >= 2 && law[0].stage >= 1 && rng.chance(0.1)) {
    const [k, o] = law; o.alive = false; o.diedAt = mi(g); o.cause = 'rope'; s.tally.deaths += 1;
    addLife(g, o, `같은 해 난 ${k.name}에게 잡혀 교수대에서 죽었다`); addLife(g, k, `같은 해 난 ${J(o.name, '을/를')} 잡아 넘겼다`);
    return say(T.PAIR.hang({ a: k.name, b: o.name }));
  }
  const kind = [a, b].find((c) => (has(c, 'kind') || has(c, 'generous')) && c.stage >= 2 && !c.fallen);
  const down = [a, b].find((c) => c.fallen);
  if (kind && down && kind !== down && rng.chance(0.3)) {
    down.fallen = false; addLife(g, down, `같은 해 난 ${J(kind.name, '이/가')} 거두어 주었다`);
    return say(T.PAIR.save({ a: kind.name, b: down.name }));
  }
  if (a.path === b.path && a.stage >= 2 && b.stage >= 2 && a.path !== 'stay' && rng.chance(0.15)) {
    const [w, l] = rng.chance(0.5) ? [a, b] : [b, a];
    if (w.stage < 4 && rng.chance(0.4)) w.stage += 1; if (rng.chance(0.4)) { l.fallen = true; l.fallText = `같은 해 난 ${w.name}에게 자리를 빼앗겼다`; }
    return say(T.PAIR.rival({ a: a.name, b: b.name }));
  }
  return null;
}
// 선대의 동세대는 뒤에서 계속 늙는다
function elderTick(g, rng) {
  const s = S(g);
  for (const e of s.elders) {
    for (const c of e.list) {
      if (!c.alive || ((c.id * 7 + 3) % 12) + 1 !== g.date.month) continue;
      const ev = yearOf(g, rng, c, { elder: true });
      if (ev?.k === 'death' && rng.chance(0.5)) { const t = T.ELDER_NEWS[0]({ from: e.from, n: c.name }); addNews(g, t); line(g, 'elder', t); }
    }
    e.list = e.list.filter((c) => c.alive);
  }
  s.elders = s.elders.filter((e) => e.list.length);
  // 선대의 동세대가 나를 알아본다
  if (rng.chance(0.01)) {
    for (const e of s.elders) {
      const c = e.list.find((x) => x.alive && x.place === here(g));
      if (c && !c.sawHeir) { c.sawHeir = true; line(g, 'elder', T.ELDER_NEWS[1]({ from: e.from, n: c.name })); break; }
    }
  }
}
// 어린 시절의 줄
function youngTick(g, rng) {
  const s = S(g);
  const age = playerAge(g);
  const kids = s.list.filter((c) => c.alive);
  if (!kids.length || age < 5 || age >= 15 || here(g) !== s.home) return;
  if (rng.chance(age < 12 ? 0.06 : 0.05)) {
    const c = rng.pick(kids);
    line(g, 'young', pickFresh(g, rng, age < 12 ? 'yg' : 'ey', age < 12 ? T.YOUNG : T.EARLY)({ n: c.name }), c.id);
  }
}

/* ---------- 장면 ---------- */
const findC = (g, id) => S(g).list.find((c) => c.id === id) ?? null;
const tieUp = (c, t) => { if (!c) return; if (c.tie === 'foe' && t !== 'warm') return; c.tie = t; };
const myStand = (g) => clamp(Math.floor(((L(g).renown ?? 0) + (g.player.money ?? 0) / 20 + (g.player.title ? 30 : 0)) / 18), 0, 4);
const statOf = (g, id) => me(g)?.stats?.[id] ?? g.player.stats?.[id] ?? 10;

const YOUNG_SCENES = [
  {
    text: (s) => `영주의 과수원에서 같은 해 난 아이들이 사과를 따다 들켰다. 관리인이 누가 먼저 담을 넘자고 했느냐고 묻는다. ${J(s.a, '이/가')} 나를 본다. 넘자고 한 건 ${J(s.b, '이었/였')}다.`,
    choices: (s) => [{ label: '내가 했다고 나선다', key: 'take' }, { label: '입을 다문다', key: 'quiet' }, { label: `${J(s.b, '을/를')} 가리킨다`, key: 'point' }],
  },
  {
    text: (s) => `얼어붙은 연못에서 ${J(s.a, '이/가')} 얼음을 깨고 빠졌다. 같은 해 난 아이들이 비명만 지른다. ${J(s.b, '은/는')} 벌써 뒤돌아 뛰고 있다.`,
    choices: () => [{ label: '얼음 위로 엎드려 손을 뻗는다', key: 'save' }, { label: '어른을 부르러 뛴다', key: 'run' }, { label: '무서워서 그 자리에 굳는다', key: 'freeze' }],
  },
  {
    text: (s) => `같은 해 난 아이들끼리 강을 헤엄쳐 건너는 내기를 했다. 이긴 사람이 ${s.b}의 뿔 손잡이 칼을 갖는다. ${J(s.b, '은/는')} 질 리 없다는 얼굴이다.`,
    choices: () => [{ label: '이기려고 죽어라 헤엄친다', key: 'win' }, { label: '일부러 한 발 늦는다', key: 'yield' }, { label: '내기에 끼지 않는다', key: 'out' }],
  },
];
defineScene('pe_young', {
  title: () => '같은 해에 난 아이들',
  text: (g, s) => YOUNG_SCENES[s.v].text(s),
  choices: (g, s) => YOUNG_SCENES[s.v].choices(s),
  resolve(g, rng, s, key) {
    const a = findC(g, s.ai); const b = findC(g, s.bi);
    S(g).done.young = mi(g);
    if (s.v === 0) {
      if (key === 'take') { stress(g, 6); tieUp(a, 'warm'); tieUp(b, 'owes'); if (b) b.owed = 1; log(g, `과수원 일을 혼자 뒤집어썼다. ${J(s.b, '은/는')} 그 일을 잊지 않았다.`); return `회초리를 열 대 맞았다. 그날 밤 ${J(s.b, '이/가')} 창밖에서 작게 불렀다. "고맙다." 그 말 한마디로 손바닥이 덜 아팠다.`; }
      if (key === 'point') { tieUp(b, 'foe'); tieUp(a, 'cool'); log(g, `과수원 일로 ${J(s.b, '을/를')} 가리켰다.`); return `${J(s.b, '이/가')} 회초리를 맞았다. 그 뒤로 같은 해 난 아이들이 나를 보는 눈이 조금 달라졌다. ${J(s.b, '은/는')} 다시는 내 옆에 앉지 않았다.`; }
      return '관리인은 결국 모두를 세워 놓고 한 대씩 때렸다. 아무도 말하지 않았다. 그게 같은 해 난 아이들의 첫 비밀이 되었다.';
    }
    if (s.v === 1) {
      if (key === 'save') {
        if (check(rng, statOf(g, 'str') + statOf(g, 'agi') / 2, 12)) { tieUp(a, 'owes'); if (a) a.owed = 1; log(g, `얼음물에 빠진 ${J(s.a, '을/를')} 건져 냈다.`); note(g, `얼음물에 빠진 ${J(s.a, '을/를')} 건져 냈다.`); return `얼음이 쩍쩍 갈라지는 소리를 들으며 ${s.a}의 손목을 잡았다. 둘 다 흠뻑 젖어 이를 딱딱 부딪쳤다. ${s.a}의 어머니가 우리 집에 떡을 한 바구니 보냈다.`; }
        tired(g, 20); stress(g, 8); tieUp(a, 'warm'); return `손이 닿기 전에 나까지 빠졌다. 어른들이 장대를 들고 달려와 둘 다 건졌다. 사흘을 앓았다. ${J(s.a, '은/는')} 앓는 내내 문 앞에 와 있었다.`;
      }
      if (key === 'run') { tieUp(a, 'warm'); return `대장장이가 달려와 ${J(s.a, '을/를')} 건졌다. 뛰어간 건 나였다는 걸 ${J(s.a, '은/는')} 나중에 들었다.`; }
      stress(g, 10); tieUp(a, 'cool'); return `발이 얼음에 붙은 것 같았다. ${J(s.a, '은/는')} 다른 아이가 부른 어른 손에 건져졌다. 그 뒤로 ${J(s.a, '이/가')} 나를 볼 때마다 그날 생각이 났다.`;
    }
    if (key === 'win') {
      if (check(rng, statOf(g, 'str') + statOf(g, 'agi'), 18)) { tieUp(b, 'rival'); log(g, `강 건너기 내기에서 ${J(s.b, '을/를')} 이겼다.`); return `물 밖으로 먼저 손을 짚었다. ${J(s.b, '은/는')} 칼을 내밀며 이를 악물었다. "다음엔 안 진다." 그 다음은 한참 뒤에야 왔다.`; }
      tieUp(b, 'rival'); return `${J(s.b, '이/가')} 한 팔 앞서 닿았다. 그 애는 칼을 허리에 차고 거들먹거리며 돌아갔다. 다음엔 꼭 이기겠다고 마음먹었다.`;
    }
    if (key === 'yield') { tieUp(b, 'warm'); return `${J(s.b, '이/가')} 이겼다. 다른 아이들은 몰랐지만 ${J(s.b, '은/는')} 알았던 것 같다. 그날 저녁 칼 대신 말린 무화과 한 줌을 쥐여 주었다.`; }
    return '강둑에 앉아 남들이 허우적대는 걸 구경했다. 누가 이겼는지는 저녁쯤엔 아무도 신경 쓰지 않았다.';
  },
});
defineScene('pe_parting', {
  title: () => '흩어지는 날',
  text: (g, s) => `${s.lines.join(' ')} 같은 해에 난 아이들이 이렇게 하나둘 고장을 떠난다.`,
  choices: () => [{ label: '다 같이 모여 십 년 뒤를 약속한다', key: 'pledge' }, { label: '가장 가까웠던 하나를 끝까지 배웅한다', key: 'one' }, { label: '아무 말 없이 보낸다', key: 'none' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.part = mi(g);
    if (key === 'pledge') { st.pledge = true; stress(g, -4); log(g, '같은 해 난 아이들과 열 해마다 다시 모이기로 약속했다.'); return '주막 뒷마당에 모여 각자 칼끝이며 손톱으로 나무 기둥에 이름을 새겼다. "서른에 여기서." 누가 먼저 말했는지는 기억나지 않는다. 다들 웃었지만 아무도 농담으로 듣지 않았다.'; }
    if (key === 'one') {
      const c = findC(g, s.ids.find((id) => findC(g, id)?.tie === 'warm') ?? s.ids[0]);
      if (c) { tieUp(c, 'warm'); c.lastMet = mi(g); }
      return c ? `고장 어귀 돌다리까지 ${J(c.name, '과/와')} 나란히 걸었다. 별말은 없었다. 다리 끝에서 ${J(c.name, '이/가')} 돌아보며 손을 들었다. 그 모습이 오래 남았다.` : '배웅할 사람은 이미 떠난 뒤였다.';
    }
    return '창가에서 떠나는 뒷모습들을 보았다. 언젠가 다시 볼 것이다. 아니면 말고.';
  },
});
defineScene('pe_gather', {
  title: () => '같은 해에 난 사람들의 모임',
  text: (g, s) => `${s.age}살이 되던 해, 약속대로 고향 주막에 모이는 날이다. ${s.came.length ? `${J(s.came.join(', '), '이/가')} 왔다.` : '온 사람이 아무도 없다.'}${s.dead.length ? ` ${s.dead.join(', ')}의 자리는 비어 있다. 다시 오지 않는다.` : ''}${s.gone.length ? ` ${s.gone.join(', ')}에게서는 소식이 없다.` : ''}${s.away ? ` 나는 ${s.at}에 있다. 고향까지는 먼 길이다.` : ''}`,
  choices: (g, s) => (s.away
    ? [{ label: '먼 길을 나선다', key: 'go' }, { label: '편지만 보낸다', key: 'letter' }]
    : [{ label: '내가 어떻게 살았는지 자랑한다', key: 'brag' }, { label: '듣기만 한다', key: 'listen' }, { label: '술값을 내가 낸다', key: 'pay' }]),
  resolve(g, rng, s, key) {
    const st = S(g); st.done[`g${s.age}`] = mi(g);
    const came = s.ids.map((id) => findC(g, id)).filter((c) => c?.alive);
    for (const c of came) c.lastMet = mi(g);
    if (key === 'letter') { for (const c of came) if (c.tie === 'warm') c.tie = 'none'; return '짧은 편지를 썼다. 다들 잘 사느냐고, 나는 그럭저럭이라고. 그 편지가 주막 탁자 위에서 소리 내어 읽혔을지 모르겠다.'; }
    if (key === 'go') { spend(g, Math.min(15, g.player.money)); tired(g, 15); }
    if (key === 'brag') {
      const avg = came.length ? came.reduce((a, c) => a + c.stage, 0) / came.length : 0;
      if (myStand(g) >= avg + 1) { L(g).renown = (L(g).renown ?? 0) + 1; for (const c of came) if (has(c, 'ambitious') || has(c, 'greedy')) tieUp(c, 'rival'); return '내 이야기에 다들 잔을 내려놓았다. 몇은 진심으로 기뻐했고 몇은 웃는 얼굴로 잔을 비웠다. 누가 어느 쪽인지 다 보였다.'; }
      stress(g, 4); return '말을 꺼내다가 그만두었다. 탁자에 앉은 얼굴들이 살아온 것에 비하면 내 이야기는 짧았다. 누가 어깨를 두드렸다.';
    }
    if (key === 'pay') {
      const cost = 6 + came.length * 3;
      if (!canSpend(g, cost)) { for (const c of came) tieUp(c, c.tie === 'none' ? 'warm' : c.tie); return '술값을 내겠다고 일어섰다가 주머니가 가벼운 걸 알았다. 다들 웃으며 나누어 냈다. 그것도 나쁘지 않았다.'; }
      spend(g, cost); for (const c of came) if (c.tie === 'none' || c.tie === 'cool') c.tie = 'warm';
      stress(g, -8); return `은화 ${cost}닢. 아깝지 않았다. 새벽까지 강둑 이야기, 과수원 이야기, 이제 없는 사람들 이야기를 했다.`;
    }
    stress(g, -10); for (const c of came) if (c.tie === 'none') c.tie = 'warm';
    return '대부분 들었다. 누가 어디서 무엇이 되었는지, 누가 무엇을 잃었는지. 다들 많이 늙었다. 나도 그럴 것이다.';
  },
});
const CROSS_CHOICES = {
  up: [{ label: '반갑게 손을 잡는다', key: 'warm' }, { label: '그 자리를 빌려 부탁을 해 본다', key: 'ask' }, { label: '모른 척 지나간다', key: 'pass' }],
  down: [{ label: '밥을 산다', key: 'meal' }, { label: '돈을 쥐여 준다', key: 'give' }, { label: '못 본 척한다', key: 'pass' }],
  even: [{ label: '한잔한다', key: 'drink' }, { label: '옛날 이야기만 하고 헤어진다', key: 'talk' }, { label: '누가 더 잘 살았나 겨뤄 보자고 한다', key: 'rival' }],
  outlaw: [{ label: '옛정을 부른다', key: 'plead' }, { label: '칼을 뽑는다', key: 'fight' }, { label: '가진 걸 내준다', key: 'yield' }],
  war: [{ label: '같이 버티자고 한다', key: 'stand' }, { label: '술을 나눈다', key: 'drink' }, { label: '자리를 옮긴다', key: 'pass' }],
};
defineScene('pe_cross', {
  title: () => '같은 해에 난 사람',
  text: (g, s) => T.CROSS[s.mode][s.v % T.CROSS[s.mode].length]({ n: s.name, nd: nd(s.name), p: placeName(s.place), s: s.stage, sj: J(s.stage, '이/가'), f: s.f ?? '', y: s.years }),
  choices: (g, s) => CROSS_CHOICES[s.mode],
  resolve(g, rng, s, key) {
    const c = findC(g, s.ci);
    if (!c?.alive) return '그 사람은 이미 자리를 떴다.';
    c.lastMet = mi(g); c.met += 1;
    const st = S(g);
    if (s.mode === 'up') {
      if (key === 'warm') { if (has(c, 'cruel') && c.tie !== 'warm') { tieUp(c, 'cool'); return `${J(c.name, '은/는')} 손을 잡는 둥 마는 둥 했다. 따르는 사람들 앞에서 강둑의 아이를 아는 척하고 싶지 않은 얼굴이었다.`; } tieUp(c, 'warm'); stress(g, -4); return `${J(c.name, '이/가')} 따르는 사람들을 먼저 보냈다. 길가 돌 위에 앉아 한참을 웃었다. 높은 자리에 앉아도 웃는 얼굴은 그대로였다.`; }
      if (key === 'ask') {
        if (c.tie === 'warm' || c.tie === 'owes' || (has(c, 'generous') && c.tie !== 'foe')) { const n = 20 + c.stage * 10; g.player.money += n; c.tie = 'owed'; log(g, `${J(c.name, '이/가')} 손을 써 주었다.`); return `${J(c.name, '이/가')} 사람을 불러 몇 마디 했다. 다음 날 일감이 들어왔고, 은화 ${n}닢이 손에 남았다. "같은 해에 났잖아." 그 말 뒤에 갚으라는 말은 없었다.`; }
        stress(g, 6); tieUp(c, 'cool'); return `${J(c.name, '은/는')} 웃으며 다음에 보자고 했다. 다음은 오지 않을 것이다.`;
      }
      tieUp(c, 'cool'); return `고개를 돌리고 지나갔다. 등 뒤에서 ${J(c.name, '이/가')} 내 이름을 한 번 더 부르다 말았다.`;
    }
    if (s.mode === 'down') {
      if (key === 'meal') { if (!spend(g, Math.min(4, g.player.money))) return '밥값도 없었다. 둘이 나란히 앉아 물만 마셨다.'; tieUp(c, 'warm'); return `${J(c.name, '은/는')} 국을 두 그릇 비웠다. 몰락한 이야기는 하지 않았다. 강둑 이야기만 했다.`; }
      if (key === 'give') {
        const n = clamp(Math.round((g.player.money ?? 0) * 0.15 / 5) * 5, 10, 60);
        if (!spend(g, n)) return '주머니를 뒤졌지만 내밀 게 없었다.';
        c.owed = (c.owed ?? 0) + n; c.tie = 'owes'; log(g, `몰락한 ${c.name}에게 은화 ${n}닢을 쥐여 주었다.`);
        return `은화 ${n}닢을 쥐여 주었다. ${J(c.name, '은/는')} 한참 그걸 내려다보았다. "꼭 갚는다." 갚지 않아도 된다고 하려다 그만두었다. 그 말이 필요한 얼굴이었다.`;
      }
      tieUp(c, 'cool'); return `못 본 척했다. ${c.name}도 못 본 척했다. 서로 그게 낫다고 여긴 것 같다.`;
    }
    if (s.mode === 'even') {
      if (key === 'drink') { stress(g, -6); tieUp(c, 'warm'); return '세 잔이 다섯 잔이 되었다. 같은 해에 난 다른 아이들 이야기가 나왔다. 누가 죽고 누가 떠났는지 서로 아는 것을 맞추어 보았다.'; }
      if (key === 'rival') { tieUp(c, 'rival'); return `${J(c.name, '이/가')} 눈을 빛냈다. "좋지. 다음에 볼 때 누가 더 높이 있나 보자." 어릴 때 강을 건너던 얼굴 그대로였다.`; }
      return '강둑 이야기를 조금 하고 헤어졌다. 둘 다 바빴다. 다음에 또 마주칠 것이다.';
    }
    if (s.mode === 'outlaw') {
      if (key === 'plead') {
        if (c.tie === 'warm' || c.tie === 'owes' || check(rng, statOf(g, 'cha'), 14)) { tieUp(c, 'warm'); return `${J(c.name, '이/가')} 웃었다. "그래, 너는 보내 주지." 패거리가 길을 텄다. 지나갈 때 ${J(c.name, '이/가')} 낮게 말했다. "고향에는 나 봤다는 말 하지 마."`; }
        const n = Math.min(g.player.money ?? 0, 20); g.player.money -= n; tieUp(c, 'cool'); return `"옛정은 옛날 일이지." 은화 ${n}닢을 털렸다. 목숨은 남겨 두었다. 그게 옛정이었나 보다.`;
      }
      if (key === 'fight') {
        if (check(rng, statOf(g, 'str') + (me(g).skills?.sword ?? g.player.skills?.sword ?? 0) / 2, 22)) { L(g).renown = (L(g).renown ?? 0) + 2; c.fallen = true; c.fallText = '패를 잃고 쫓긴다'; tieUp(c, 'foe'); log(g, `같은 해 난 도적 ${J(c.name, '을/를')} 칼로 물리쳤다.`); return `칼이 두 번 부딪쳤다. ${J(c.name, '이/가')} 먼저 물러섰다. 패거리가 흩어졌다. 달아나며 돌아본 그 얼굴은 강둑의 아이가 아니었다.`; }
        const n = Math.min(g.player.money ?? 0, 30); g.player.money -= n; tired(g, 25); stress(g, 10); tieUp(c, 'foe');
        return `팔을 베였다. 은화 ${n}닢을 다 털렸다. ${J(c.name, '이/가')} 칼끝으로 내 턱을 들었다. "어릴 때부터 넌 그게 문제였어."`;
      }
      const n = Math.min(g.player.money ?? 0, 15); g.player.money -= n; return `은화 ${n}닢을 내밀었다. ${J(c.name, '은/는')} 세지도 않고 받았다. "고향은 그대로냐?" 대답하기 전에 그는 사라졌다.`;
    }
    // war
    if (key === 'stand') { tieUp(c, 'warm'); stress(g, -5); return '밤새 같은 방패 뒤에서 버텼다. 새벽에 둘 다 살아 있었다. 고향에 가면 이 이야기는 하지 말자고 했다.'; }
    if (key === 'drink') { tieUp(c, 'warm'); return '물 탄 술 한 병을 나눠 마셨다. 같은 해 난 다른 아이들이 지금 어디 있는지 이야기했다. 여기 있는 건 둘뿐이다.'; }
    return `자리를 옮겼다. 같은 진흙 속에서 강둑 이야기를 할 기분은 아니었다. ${c.name}도 이해하는 얼굴이었다.`;
  },
});
defineScene('pe_ask', {
  title: () => '같은 해에 난 사람의 부탁',
  text: (g, s) => (s.hide
    ? `밤늦게 문을 두드리는 사람이 있다. ${nd(s.name)}. 같은 해에 난, 지금은 쫓기는 도적. "하룻밤만. 아침이면 간다." 골목 끝에서 횃불이 움직인다.`
    : `${s.name}에게서 편지가 왔다. ${s.f}고 했다. 글씨가 많이 흔들렸다. 은화 ${s.amt}닢만 꿔 줄 수 있느냐고, 같은 해에 난 사이에 염치없지만 물을 데가 없다고 했다.`),
  choices: (g, s) => (s.hide
    ? [{ label: '숨겨 준다', key: 'hide' }, { label: '돈만 쥐여 보낸다', key: 'coin' }, { label: '경비대를 부른다', key: 'turn' }]
    : [{ label: `은화 ${s.amt}닢을 보낸다`, key: 'send' }, { label: '반만 보낸다', key: 'half' }, { label: '답장하지 않는다', key: 'no' }]),
  resolve(g, rng, s, key) {
    const c = findC(g, s.ci);
    S(g).done.ask = mi(g);
    if (!c?.alive) return '그 사람은 오지 않았다.';
    if (s.hide) {
      if (key === 'hide') { L(g).notoriety = Math.min(100, (L(g).notoriety ?? 0) + 2); c.tie = 'owes'; c.owed = (c.owed ?? 0) + 30; return `광 구석에 짚을 깔아 주었다. 새벽에 가 보니 짚만 남아 있었다. 문간에 은반지 하나가 놓여 있었다.`; }
      if (key === 'coin') { const n = Math.min(10, g.player.money ?? 0); g.player.money -= n; tieUp(c, 'none'); return `은화 ${n}닢을 쥐여 주고 문을 닫았다. 발소리가 멀어졌다. 문을 닫은 손이 한동안 떨렸다.`; }
      c.alive = false; c.diedAt = mi(g); c.cause = 'rope'; c.tie = 'foe'; g.player.money += 20; L(g).renown = (L(g).renown ?? 0) + 1; stress(g, 14); S(g).tally.deaths += 1;
      addLife(g, c, '같은 해 난 사람이 경비대에 넘겼다'); log(g, `같은 해 난 ${J(c.name, '을/를')} 경비대에 넘겼다.`); chron(g, `${J(c.name, '이/가')} 붙잡혀 교수대에 섰다.`, 40);
      return `경비대가 와서 ${J(c.name, '을/를')} 끌고 갔다. 현상금 은화 20닢을 받았다. 사흘 뒤 광장 교수대에 낯익은 얼굴이 매달렸다. 강둑에서 물수제비를 일곱 번 튀기던 그 손이었을지도 모른다.`;
    }
    if (key === 'send' || key === 'half') {
      const n = key === 'send' ? s.amt : Math.round(s.amt / 2);
      if (!spend(g, n)) return '보낼 돈이 없었다. 미안하다는 편지만 보냈다.';
      c.owed = (c.owed ?? 0) + n; c.tie = 'owes'; return key === 'send' ? `은화 ${n}닢을 보냈다. 두 달 뒤 짧은 답장이 왔다. "살았다." 그 한 줄이었다.` : `반을 보냈다. 반이라도 고맙다는 답장이 왔다. 정말 고마워하는지는 글씨로는 알 수 없었다.`;
    }
    tieUp(c, 'cool'); return '답장을 쓰려다 그만두었다. 편지는 서랍 맨 아래로 들어갔다.';
  },
});
defineScene('pe_repay', {
  title: () => '갚으러 온 사람',
  text: (g, s) => `${J(s.name, '이/가')} 찾아왔다. 지금은 ${s.stage}. 예전에 내가 도왔던 일을 꺼냈다. "그때 은화 몇 닢이 없었으면 나는 여기 없다." 탁자 위에 돈주머니를 내려놓는다.`,
  choices: () => [{ label: '받는다', key: 'take' }, { label: '사양한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const c = findC(g, s.ci);
    if (!c?.alive) return '그 사람은 오지 않았다.';
    const n = Math.max(20, (c.owed ?? 10) * 2);
    c.owed = 0; c.tie = 'warm';
    if (key === 'take') { g.player.money += n; log(g, `${J(c.name, '이/가')} 은화 ${n}닢으로 빚을 갚았다.`); return `은화 ${n}닢. 꾸어 준 것의 갑절이다. 됐다고 하자 ${J(c.name, '이/가')} 손을 내저었다. "이자라고 생각해. 같은 해에 난 이자."`; }
    L(g).renown = (L(g).renown ?? 0) + 1; stress(g, -6);
    return `${J(c.name, '은/는')} 돈주머니를 한참 보다가 다시 넣었다. 대신 어디서든 내 이름을 좋게 말하겠다고 했다. 그 뒤로 낯선 곳에서 내 이름을 아는 사람을 가끔 만났다.`;
  },
});
defineScene('pe_rival', {
  title: () => '같은 길의 맞수',
  text: (g, s) => `${s.name}도 같은 길을 가고 있다. 지금은 ${s.stage}. 이번에 같은 일거리, 같은 자리를 두고 둘이 맞섰다. 같은 해 난 아이들 가운데 둘만 같은 길로 왔다.`,
  choices: () => [{ label: '정면으로 겨룬다', key: 'fight' }, { label: '이번엔 양보한다', key: 'yield' }, { label: '손을 잡자고 한다', key: 'join' }],
  resolve(g, rng, s, key) {
    const c = findC(g, s.ci);
    S(g).done.rival = mi(g);
    if (!c?.alive) return '맞설 사람은 이미 없었다.';
    if (key === 'fight') {
      if (check(rng, (L(g).renown ?? 0) + myStand(g) * 8, c.stage * 12)) { L(g).renown = (L(g).renown ?? 0) + 2; tieUp(c, 'rival'); log(g, `같은 길의 맞수 ${J(c.name, '을/를')} 이겼다.`); return `이겼다. ${J(c.name, '은/는')} 손을 내밀었다. 웃고 있었지만 눈은 웃지 않았다. 강을 건너던 날처럼.`; }
      stress(g, 8); tieUp(c, 'rival'); return `${J(c.name, '이/가')} 가져갔다. 사람들은 그 이름을 먼저 불렀다. 같은 해에 났는데, 하고 혼자 몇 번을 되뇌었다.`;
    }
    if (key === 'yield') { stress(g, 4); c.tie = c.tie === 'foe' ? 'cool' : 'warm'; if (c.stage < 4 && rng.chance(0.4)) c.stage += 1; return `물러섰다. ${J(c.name, '이/가')} 그 일로 한 계단 올랐다. 그날 밤 술 한 병이 문 앞에 와 있었다.`; }
    if (has(c, 'greedy') || has(c, 'cruel') || c.tie === 'foe') { tieUp(c, 'rival'); return `${J(c.name, '은/는')} 코웃음을 쳤다. "같은 해에 났다고 같은 밥을 먹는 건 아니지."`; }
    c.tie = 'warm'; g.player.money += 15; return '둘이 나누어 맡았다. 일은 반이 되고 품삯도 반이 되었지만, 둘 다 손해 본 기분은 아니었다. 은화 15닢을 받았다.';
  },
});
defineScene('pe_court', {
  title: () => '재판정의 얼굴',
  text: (g, s) => `재판을 앞두고 ${placeName(s.place)}의 관청 복도에서 ${J(s.name, '과/와')} 마주쳤다. 같은 해에 난, 지금은 ${s.stage}. 이 재판정에 드나드는 사람이다.`,
  choices: () => [{ label: '증인으로 서 달라고 부탁한다', key: 'ask' }, { label: '혼자 맞선다', key: 'alone' }],
  resolve(g, rng, s, key) {
    const c = findC(g, s.ci);
    const cs = g.law?.cases?.find((x) => x.id === s.cid);
    S(g).done.court = mi(g);
    if (!c?.alive || !cs || cs.state !== 'open') return '재판은 이미 끝나 있었다.';
    if (key === 'alone') return `${J(c.name, '은/는')} 고개만 끄덕이고 지나갔다. 이 일은 내 일이다.`;
    if (c.tie === 'warm' || c.tie === 'owes' || (c.tie === 'none' && check(rng, statOf(g, 'cha'), 16))) {
      cs.evidence = clamp(cs.evidence - 18, 5, 95); c.tie = c.tie === 'owes' ? 'warm' : c.tie;
      log(g, `같은 해 난 ${J(c.name, '이/가')} 재판에서 내 편을 들어 주었다.`);
      return `${J(c.name, '이/가')} 증인석에 섰다. "같은 고장에서 같은 해에 나 이 사람을 평생 보았습니다." 재판관이 붓을 멈추었다.`;
    }
    if (c.tie === 'foe' || c.tie === 'rival' || c.tie === 'cool') { cs.evidence = clamp(cs.evidence + 8, 5, 95); tieUp(c, 'foe'); return `${J(c.name, '은/는')} 증인석에 서지 않았다. 대신 재판관에게 무언가 귓속말을 했다. 재판관의 눈이 나에게로 왔다.`; }
    return `${J(c.name, '은/는')} 곤란한 얼굴로 이 자리에서는 끼어들 수 없다고 했다. 그 말이 맞을 것이다.`;
  },
});
defineScene('pe_last', {
  title: () => '같은 해에 난 사람들',
  text: (g, s) => `같은 해에 고장에서 난 아이는 나까지 ${NUM[s.n + 1] ?? s.n + 1}이었다. ${s.dead.join(', ')}. 다 갔다.${s.left ? ` 남은 건 ${J(s.left, '과/와')} 나뿐이다.` : ' 남은 건 나 하나다.'}`,
  choices: (g, s) => [...(s.left ? [{ label: `${J(s.left, '을/를')} 찾아간다`, key: 'visit' }] : []), { label: '이름들을 적어 둔다', key: 'write' }, { label: '강둑에 가 앉는다', key: 'sit' }],
  resolve(g, rng, s, key) {
    S(g).done.last = mi(g);
    if (key === 'visit') { const c = findC(g, s.li); if (c?.alive) { c.tie = 'warm'; c.lastMet = mi(g); } stress(g, -10); return '둘 다 지팡이를 짚고 있었다. 오래 말하지 않았다. 그래도 하루가 짧았다.'; }
    if (key === 'write') { note(g, `같은 해에 난 사람들: ${[...s.dead, s.left].filter(Boolean).join(', ')}.`); chron(g, '같은 해에 난 사람들의 이름을 적어 남겼다.', 20); return '종이 한 장에 이름을 하나씩 적었다. 그 옆에 무엇이 되었는지도 적었다. 다 적고 보니 한 장이 다 차지 않았다.'; }
    stress(g, -6); return '물수제비를 떠 보았다. 두 번 튀고 가라앉았다. 일곱 번을 튀기던 아이는 이제 없다.';
  },
});

/* ---------- 장면 고르기 ---------- */
function playerTick(g, rng) {
  const s = S(g);
  const now = mi(g);
  const age = playerAge(g);
  if (!free(g) || now - s.sceneAt < 8 || L(g).queue.length >= 2) return;
  const q = (kind, data) => { queueScene(g, kind, data); s.sceneAt = now; s.tally.scenes += 1; return true; };
  const live = s.list.filter(alive);
  // 어린 시절 한 번
  if (!s.done.young && age >= 8 && age <= 12 && here(g) === s.home && live.length >= 2 && rng.chance(0.06)) {
    const [a, b] = [...live].sort(() => rng.next() - 0.5);
    s.done.young = now;
    return q('pe_young', { v: rng.int(0, YOUNG_SCENES.length - 1), ai: a.id, a: a.name, bi: b.id, b: b.name });
  }
  // 흩어지는 날
  if (!s.done.part && age >= 15 && age <= 18 && s.setout.length >= 2) {
    const ids = s.setout.slice(0, 3);
    const lines = ids.map((id) => findC(g, id)).filter(Boolean).map((c) => T.SET_OUT[c.path]({ n: c.name, p: placeName(c.place) }));
    s.setout = [];
    if (here(g) === s.home) return q('pe_parting', { ids, lines });
    s.done.part = now;
  }
  if (age < 18) return;
  // 약속한 모임: 서른·마흔·쉰·예순
  const ga = [30, 40, 50, 60].find((a) => a === age);
  if (s.pledge && ga && !s.done[`g${ga}`]) {
    const ok = s.list.filter((c) => c.alive && c.path !== 'gone' && c.tie !== 'foe' && !c.fallen ? true : c.alive && c.tie !== 'foe' && rng.chance(0.4));
    const came = ok.filter((c) => c.alive && (c.path !== 'gone' || rng.chance(0.3)));
    const gone = s.list.filter((c) => c.alive && !came.includes(c)).map(knownName);
    const dead = s.list.filter((c) => !c.alive).map(knownName);
    s.done[`g${ga}`] = now;
    return q('pe_gather', { age: ga, ids: came.map((c) => c.id), came: came.map(knownName), dead, gone, away: here(g) !== s.home, at: placeName(here(g)) });
  }
  // 재판정
  const cs = (g.law?.cases ?? []).find((x) => x.state === 'open' && x.role === 'accused' && now - x.at <= 3);
  if (cs && (!s.done.court || now - s.done.court > 24)) {
    const c = live.find((x) => x.path && x.stage >= 2 && ['scholar', 'knight', 'priest'].includes(x.path) && realmOf(x.place) === realmOf(cs.place) && !x.fallen);
    if (c) return q('pe_court', { ci: c.id, name: c.name, stage: stageWord(c), place: cs.place, cid: cs.id });
  }
  // 전장
  const camp = g.army?.campaign;
  if (camp && s.done.war !== camp.key && rng.chance(0.2)) {
    const c = live.find((x) => (x.path === 'soldier' || x.path === 'knight') && !x.fallen && realmOf(x.home) === realmOf(s.home));
    s.done.war = camp.key;
    if (c) return q('pe_cross', { mode: 'war', v: 0, ci: c.id, name: c.name, stage: stageWord(c), place: here(g), years: Math.floor((now - c.lastMet) / 12) });
  }
  // 몰락한 이의 부탁
  if ((!s.done.ask || now - s.done.ask >= 36) && rng.chance(0.03)) {
    const c = live.find((x) => x.fallen && x.tie !== 'foe' && x.tie !== 'owes');
    if (c && c.path === 'outlaw' && c.place === here(g)) return q('pe_ask', { hide: true, ci: c.id, name: c.name });
    if (c && c.path !== 'outlaw' && (g.player.money ?? 0) >= 50) return q('pe_ask', { hide: false, ci: c.id, name: c.name, f: c.fallText ?? pOf(c).fall[0], amt: clamp(Math.round(g.player.money * 0.15 / 5) * 5, 15, 80) });
  }
  // 갚으러 온다
  const owe = live.find((x) => x.tie === 'owes' && x.owed > 1 && x.stage >= 2 && !x.fallen);
  if (owe && rng.chance(0.05)) return q('pe_repay', { ci: owe.id, name: owe.name, stage: stageWord(owe) });
  // 같은 길의 맞수
  const myPath = T.JOB_PATH[L(g).job];
  if (myPath && (!s.done.rival || now - s.done.rival >= 60) && rng.chance(0.04)) {
    const c = live.find((x) => x.path === myPath && x.stage >= 2 && !x.fallen && x.path !== 'stay');
    if (c) return q('pe_rival', { ci: c.id, name: c.name, stage: stageWord(c) });
  }
  // 같은 고장에서 마주침
  const friendIds = new Set((g.friends?.list ?? []).filter((f) => f.state === 'close').map((f) => f.pid));
  const near = live.filter((c) => c.path && c.place === here(g) && now - c.lastMet >= 36 && !(c.pid != null && friendIds.has(c.pid)));
  if (near.length && rng.chance(0.08)) {
    const c = rng.pick(near);
    const st = myStand(g);
    const mode = c.path === 'outlaw' && !c.fallen && c.stage >= 1 ? 'outlaw' : c.fallen ? 'down' : c.stage >= st + 2 ? 'up' : 'even';
    return q('pe_cross', { mode, v: rng.int(0, 9), ci: c.id, name: c.name, stage: stageWord(c), place: here(g), f: c.fallText ?? pOf(c).fall[0], years: Math.max(1, Math.floor((now - c.lastMet) / 12)) });
  }
  // 늙어서 남은 사람
  if (age >= 60 && !s.done.last && s.list.length >= 4 && live.length <= 1 && rng.chance(0.1)) {
    const left = live[0];
    return q('pe_last', { n: s.list.length, dead: s.list.filter((c) => !c.alive).map(knownName), left: left?.name ?? null, li: left?.id ?? null });
  }
  return null;
}

function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over) return;
  if (!s.built) build(g, ownRng(g, 5));
  cohortTick(g, ownRng(g, 11));
  elderTick(g, ownRng(g, 19));
  youngTick(g, ownRng(g, 29));
  playerTick(g, ownRng(g, 37));
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.peers = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g, rng, old) => {
  const s = S(g);
  const from = old?.name ?? '선대';
  if (s.list.length) {
    const best = [...s.list].sort((a, b) => fame(b) - fame(a))[0];
    s.past.push({ who: from, n: s.list.length, best: best ? `${best.name}(${stageWord(best)})` : '', alive: s.list.filter(alive).length });
    if (s.past.length > 8) s.past.shift();
    const keep = s.list.filter(alive);
    if (keep.length) s.elders.push({ from, list: keep });
    if (s.elders.length > 2) s.elders.shift();
  }
  s.list = []; s.done = {}; s.pledge = false; s.setout = []; s.built = false; s.gen += 1; s.sceneAt = mi(g);
  build(g, ownRng(g, 43));
});

/* ---------- 화면 연결점 ---------- */
export function peersLines(g) { return (g.peers?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function peersLine(g) { return peersLines(g)[0]?.text ?? null; }
const TIE_KIND = { warm: 'friend', owes: 'friend', owed: 'friend', rival: 'rival', foe: 'foe' };
const wordOf = (c) => {
  if (!c.alive) return c.cause === 'rope' ? '교수대에서 죽었다' : c.cause === 'war' ? '전장에서 죽었다' : '세상을 떠났다';
  if (!c.path) return '같은 해에 난 아이';
  if (c.fallen) return c.fallText ?? pOf(c).fall[0];
  return stageWord(c);
};
export function peersInfo(g) {
  const s = S(g);
  const live = s.list.filter(alive).length;
  const one = (c) => ({
    id: c.id, name: c.name, age: c.alive ? ageOf(g, c) : Math.floor(((c.diedAt ?? mi(g)) - c.born) / 12),
    place: c.alive ? placeName(c.place) : null, path: c.path ? pOf(c).short : null, word: wordOf(c), fame: fame(c), alive: c.alive,
    fallen: !!c.fallen, wed: !!c.wed, kids: c.kids, tie: TIE_KIND[c.tie] ?? null, tieWord: T.TIE_WORD[c.tie] ?? T.TIE_WORD.none,
    last: c.life.length ? { ...c.life[c.life.length - 1] } : null,
  });
  return {
    year: s.born != null ? Math.floor(s.born / 12) : g.date.year,
    place: s.home ? placeName(s.home) : null,
    line: s.list.length ? `같은 해에 고장에서 난 ${s.list.length}명 가운데 ${live}명이 살아 있다.` : '같은 해에 난 아이들이 아직 없다.',
    cohort: [...s.list].sort((a, b) => (b.alive - a.alive) || fame(b) - fame(a)).map(one),
    news: s.news.slice(-8).reverse().map((x) => ({ ...x })),
    past: s.past.map((x) => ({ who: x.who, n: x.n, best: x.best })),
    elders: s.elders.map((e) => ({ from: e.from, left: e.list.filter(alive).map((c) => c.name) })),
    pledge: s.pledge,
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
