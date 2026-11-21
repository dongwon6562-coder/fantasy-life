// 30단계: 먼저 다가오는 사람들.
// 아는 사람들이 나를 기억하고 먼저 말을 건다. 행동을 늘리지 않고, 한 달이 끝날 때 그달에 마주친 사람 한두 명을 고른다.
// - 그냥 건네는 말: 그 사람의 성격·나와의 사이·철·흉년·내 몸 상태·내 나이를 안다.
// - 내게 생긴 일(혼인·아이·사별·새 일·승급·이름값·악명·다친 곳·집·이사·귀향)에 대한 반응: 축하, 위로, 비웃음, 걱정.
// - 내가 한 일이 소문난 뒤(repute의 이 고장 소문): 칭찬, 원망, 실망, 비웃음.
// - 그 사람에게 생긴 일(혼인·아이·사별·새 일·살림이 피거나 기움·병)을 자기가 먼저 꺼낸다.
// - 오랜만에 만난 사람: 열여덟 달 넘게 못 본 사이에 달라진 모습(어른이 됨, 늙음, 혼인, 아이, 사별, 새 일, 형편, 병).
// - 함께한 옛일(relations의 기억)을 꺼내고, 입이 가벼운 사람은 남의 이야기를 물어 온다.
// - 이웃들끼리의 일: NPC 한 달에서 생긴 혼례·출산·장례·떠남·이사를 눈과 귀로 보고 듣고, 이웃끼리 다투고 화해하고 눈이 맞는다(ties).
// - 가끔 부탁(돈 빌리기·일손·다툼 중재)이 장면으로 온다. 빌려준 돈은 갚기도, 떼먹히기도 한다.
// relations(호감·기억)·repute(소문)·village(이웃)·letters(편지)는 읽기만 하고, 호감만 조금 민다.
// 상태는 g.encounter 하나. 화면 연결점: encounterLines(g) / encounterInfo(g) / encounterLine(g)
import { J, hasBatchim } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, monthInfo } from '../game.js';
import { byId, ageYears, living } from '../npc.js';
import { JOBS } from '../data.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, tired, spend, canSpend, check } from '../adventure/core.js';
import { jobDef, jobRank } from '../jobs.js';
import { rel, remember } from '../relations.js';
import { isJailed } from '../crime.js';
import { reputeState } from '../repute/index.js';
import * as T from './lines.js';
import { makeRng } from '../rng.js';

const mi = (g) => g.date.year * 12 + g.date.month;
// 이 갈래는 게임의 난수 흐름을 건드리지 않는다: 달마다 따로 만든 난수를 쓴다 (다른 갈래의 시드 고정 점검이 흔들리지 않게)
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 131) ^ Math.imul(mi(g) * 131 + salt + 17, 2654435761)) | 0 });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const isHere = (p, pl) => (p.place ?? 'ern') === pl;
const jobWord = (id) => JOBS[id]?.name ?? null;
const RURAL = ['ern', 'gruental', 'silverleaf', 'hammer', 'klein'];
const GAP = 18;          // 이만큼 못 보면 '오랜만'
const FRESH = 3;         // 생긴 일을 꺼내는 기한(달)
const has = (p, t) => !!p?.traits?.includes?.(t);
const NUM = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱'];

/* ---------- 상태 ---------- */
export function encounterState(g) {
  g.encounter ??= {};
  const e = g.encounter;
  e.seen ??= {};     // 사람 id → 마지막으로 본 모습 { m, a, j, sp, spa, k, w, h }
  e.fresh ??= [];    // 그 사람에게 생긴 일 [{ id, k, at, x }]
  e.mine ??= [];     // 내게 생긴 일 [{ k, at, used }]
  e.me ??= null;     // 지난달 내 모습
  e.lived ??= {};    // 살아 본 고장 → 마지막 달
  e.deeds ??= [];    // 이미 말이 나온 소문 id
  e.ties ??= {};     // 'a-b' → { k: feud|court|mend, at, n }
  e.loans ??= [];    // [{ id, amt, at, due }]
  e.last ??= {};     // 사람 id → 마지막으로 다가온 달
  e.used ??= [];     // 최근에 쓴 말 열쇠
  e.said ??= {};     // 사람 id → 그 사람이 한 말 열쇠
  e.month ??= [];    // 이번 달 마주친 사람들 [{ kind, id, name, text }]
  e.log ??= [];      // [{ y, m, text }]
  e.askAt ??= 0;
  e.sim ??= [];
  return e;
}
const E = encounterState;

/* ---------- 화면용 ---------- */
export function encounterLines(g) {
  const e = g?.encounter;
  if (!e?.month?.length) return [];
  return e.month.map((x) => ({ text: x.text, id: x.id ?? null, name: x.name ?? null, kind: x.kind }));
}
export function encounterLine(g) {
  const l = encounterLines(g);
  return l.length ? l.map((x) => x.text).join(' ') : null;
}
export function encounterInfo(g) {
  const e = E(g);
  return { lines: encounterLines(g), recent: e.log.slice(-8).reverse(), loans: e.loans.map((x) => ({ name: byId(g, x.id)?.name ?? '누군가', amt: x.amt })) };
}

/* ---------- 누가 여기 있나 ---------- */
function isFamily(g, p) {
  const m = me(g);
  return g.player.familyIds.includes(p.id) || p.id === m.spouseId || p.fatherId === m.id || p.motherId === m.id || m.fatherId === p.id || m.motherId === p.id;
}
function people(g, pl) {
  return living(g).filter((p) => !p.isPlayer && p.known && isHere(p, pl) && ageYears(p) >= 6 && !isFamily(g, p));
}
const snap = (g, p) => {
  const sp = p.spouseId ? byId(g, p.spouseId) : null;
  return { m: mi(g), a: ageYears(p), j: p.job, sp: p.spouseId ?? null, spa: !!sp?.alive, k: p.childIds?.length ?? 0, w: Math.round(p.wealth ?? 0), h: Math.round(p.health ?? 80) };
};
const wBand = (w) => (w < 0 ? 0 : w < 40 ? 1 : w < 150 ? 2 : 3);

/* ---------- 말씨 ---------- */
// 반말: 내가 아이일 때, 나보다 열 살 넘게 많을 때, 비슷한 나이에 가깝거나 날 선 사이일 때
function lowSpeech(g, p) {
  const my = playerAge(g); const a = ageYears(p);
  if (my < 16) return true;
  if (a < 16) return false;
  if (a - my >= 10) return true;
  if (my - a >= 10) return false;
  rel(p);
  return p.affection >= 30 || p.rivalry >= 35 || p.bond === 'enemy' || p.bond === 'lover' || p.bond === 'ex' || p.affection <= -30;
}
function ctxFor(g, p, extra = {}) {
  const my = playerAge(g); const a = ageYears(p);
  rel(p);
  const lo = lowSpeech(g, p);
  const m = me(g);
  const parent = byId(g, m.fatherId) ?? byId(g, m.motherId);
  const n = g.player.name;
  const c = {
    g, p, lo, n, nm: p.name, job: jobWord(p.job) ?? '', myAge: my,
    call: lo && (my < 30 || a - my >= 20) ? `${J(n, '아/야')}, ` : '',
    kid: my < 16, old: my >= 58, older: a - my >= 10, younger: my - a >= 10, peer: Math.abs(a - my) <= 4,
    season: monthInfo(g).season, famine: !!g.world?.famine, plague: !!g.world?.plague,
    tired: g.player.fatigue > 65, hurt: (g.player.injuries?.length ?? 0) > 0,
    friend: p.affection >= 35 && p.bond !== 'enemy', rival: p.rivalry >= 40,
    enemy: p.bond === 'enemy' || p.affection <= -40, ex: p.bond === 'ex', cool: p.affection <= -15 && p.affection > -40 && p.bond !== 'enemy',
    romance: p.romance >= 45 && p.bond !== 'spouse' && p.bond !== 'ex', firstLove: g.player.firstLoveId === p.id,
    wed: !!m.spouseId, pWed: !!p.spouseId, kidsHere: (p.childIds?.length ?? 0) > 0,
    parentWord: parent ? (parent.sex === 'm' ? '네 아버지' : '네 어머니') : '네 부모',
    myJob: jobDef(g)?.name ?? '',
    rural: RURAL.includes(here(g)) || /마을|촌|골짜기/.test(PLACES[here(g)]?.kind ?? '') || ['farmer', 'laborer', 'elder', 'miller', 'herder'].includes(p.job),
    has: (t) => has(p, t),
    ...extra,
  };
  return c;
}
// 말 한 줄 꾸미기: 다가오는 모습 + 말, 또는 말 + 누가
function opener(c, rng) {
  const p = c.p;
  const pool = [...(T.DOING[p.job] ?? []), ...T.DOING_ANY, ...(T.DOING_SEASON[c.season] ?? [])];
  const verbs = (p.traits ?? []).map((t) => T.VERB_BY[t]).filter(Boolean).flat();
  const plainJob = c.job && JOBS[p.job] && p.job !== 'child' && p.job !== 'elder' && !/의 /.test(c.job);
  const who = plainJob && rng.chance(0.45) ? `${c.job} ${J(c.nm, '이/가')}` : J(c.nm, '이/가');
  if (verbs.length && rng.chance(0.25)) return `${who} ${rng.pick(verbs)}.`;
  return `${who} ${rng.pick(pool)} ${rng.pick(T.VERB)}.`;
}
function spoken(c, rng, s, quoteFirst = false) {
  const said = c.lo ? s[0] : s[1];
  if (quoteFirst || rng.chance(0.3)) return `"${said}" ${J(c.nm, '이/가')} ${c.lo ? '말했다' : rng.pick(['말했다', '웃으며 말했다'])}.`;
  return `${opener(c, rng)} "${said}"`;
}
// 조건 맞는 것 중 무게대로, 최근에 쓴 말은 피해서
function pickEntry(g, rng, list, c, key, only = null) {
  const e = E(g);
  const ok = list.map((x, i) => ({ x, i })).filter(({ x }) => (!only || only(x)) && (!x.when || x.when(c)));
  if (!ok.length) return null;
  // 같은 사람은 같은 말을 되풀이하지 않고, 누구든 최근에 나온 말은 피한다
  const pid = c.p?.id;
  const said = pid != null ? (e.said[pid] ??= []) : [];
  let from = ok.filter(({ i }) => !e.used.includes(`${key}${i}`) && !said.includes(`${key}${i}`));
  let picked;
  if (from.length) picked = rng.weighted(from, ({ x }) => (x.w ?? 1));
  else {
    // 다 한 번씩 나왔으면 가장 오래전에 나온 말
    const rest = ok.filter(({ i }) => !said.includes(`${key}${i}`));
    if (!rest.length) return null;
    picked = rest.reduce((best, o) => (e.used.lastIndexOf(`${key}${o.i}`) < e.used.lastIndexOf(`${key}${best.i}`) ? o : best));
  }
  const { x, i } = picked;
  e.used.push(`${key}${i}`);
  if (e.used.length > 80) e.used.shift();
  if (pid != null) { said.push(`${key}${i}`); if (said.length > 8) said.shift(); }
  return x;
}
function render(c, rng, x, quoteFirst = false) {
  if (!x) return null;
  if (x.narr) return x.narr(c);
  if (typeof x.s === 'function') {
    const s = x.s(c);
    if (typeof s === 'string') return s;
    const line = spoken(c, rng, s, quoteFirst);
    return x.tail ? `${line} ${x.tail(c)}` : line;
  }
  return null;
}

/* ---------- 이번 달 거리들 ---------- */
// 내 모습이 지난달과 달라진 것
function myChanges(g) {
  const e = E(g);
  const m = me(g);
  const kids = (m.childIds ?? []).map((id) => byId(g, id)).filter(Boolean);
  const sp = m.spouseId ? byId(g, m.spouseId) : null;
  const cur = {
    sp: m.spouseId ?? null, spa: !!sp?.alive, k: kids.length, kd: kids.filter((k) => !k.alive).length,
    job: L(g).job?.id ?? null, rk: jobDef(g) ? jobRank(g) : 0, rn: L(g).renown ?? 0, nt: L(g).notoriety ?? 0,
    inj: g.player.injuries?.length ?? 0, home: L(g).home, pl: here(g), a: playerAge(g),
  };
  const was = e.me;
  e.me = cur;
  if (!was) return;
  const now = mi(g);
  const add = (k) => { e.mine = e.mine.filter((x) => x.k !== k); e.mine.push({ k, at: now }); };
  if (cur.sp && cur.sp !== was.sp) add('wed');
  else if (was.sp && was.spa && !cur.spa) add('widow');
  if (cur.k > was.k) add('baby');
  if (cur.kd > was.kd) add('childlost');
  if (cur.job && cur.job !== was.job) add('newjob');
  else if (cur.job && cur.rk > was.rk) add('rankup');
  if (cur.rn - was.rn >= 6) add('renown');
  if (cur.nt - was.nt >= 6) add('noto');
  if (cur.inj > was.inj && now - (e.hurtAt ?? -99) >= 12) { add('hurt'); e.hurtAt = now; }
  if (cur.home === 'own' && was.home !== 'own') add('home');
  if (cur.pl !== was.pl) {
    const before = e.lived[cur.pl];
    add(before == null ? 'moved' : now - before >= 12 ? 'back' : 'x');
  }
  e.lived[cur.pl] = now;
  e.mine = e.mine.filter((x) => x.k !== 'x' && now - x.at <= FRESH);
}
// 아는 사람들을 둘러보며 그 사람에게 생긴 일과 오랜만인 사람을 찾는다
function scanPeople(g, pool) {
  const e = E(g);
  const now = mi(g);
  const long = [];
  for (const p of pool) {
    const cur = snap(g, p);
    const old = e.seen[p.id];
    e.seen[p.id] = cur;
    if (!old) continue;
    if (now - old.m >= GAP) { long.push({ p, old, cur }); continue; }
    if (now - old.m > 2) continue;
    const push = (k, x) => e.fresh.push({ id: p.id, k, at: now, x });
    if (cur.sp && cur.sp !== old.sp) push('wed', cur.sp);
    else if (old.sp && old.spa && !cur.spa) push('widow', old.sp);
    if (cur.k > old.k) push('baby', p.childIds[p.childIds.length - 1]);
    if (cur.j !== old.j && old.j !== 'child' && cur.j !== 'child' && jobWord(cur.j)) push('job', cur.j);
    if (wBand(cur.w) > wBand(old.w) && cur.w - old.w >= 30) push('rich');
    else if (wBand(cur.w) < wBand(old.w) && old.w - cur.w >= 25) push('poor');
    if (cur.h < 35 && old.h >= 35) push('sick');
  }
  e.fresh = e.fresh.filter((x) => now - x.at <= FRESH).slice(-30);
  return long;
}

/* ---------- 거리마다 한 줄 ---------- */
const recallOf = (m) => m.recall ?? String(m.text).replace(/다$/, '던 일');
function rumorBits(text, lo, name) {
  let t = String(text).replace(/[.\s]+$/, '');
  if (name && t.startsWith(name)) t = t.slice(name.length).replace(/^(이|가|은|는)\s+/, '');
  t = t.replace(/다고 한다$/, '다더라').replace(/다는 말이 돈다$/, '다더라').replace(/다고들 한다$/, '다더라');
  if (/다$/.test(t)) t += '더라';
  if (!/더라$/.test(t)) return { rumor: lo ? '네 얘기 들었다.' : '얘기 들었어요.', rumorShort: '그런' };
  return { rumor: `${t}고${lo ? '' : '요'}.`, rumorShort: `'${t.replace(/더라$/, '')}'는` };
}
const QUOTES = ['사람 속은 모르는 거야.', '세상 참 무서워졌어.', '저런 사람이랑 한 우물 물을 먹다니.', '어쩐지 눈빛이 싸하더라니.'];

function lineGreet(g, rng, p) {
  const c = ctxFor(g, p);
  if ((c.enemy || c.ex || c.cool) && rng.chance(0.75)) return render(c, rng, pickEntry(g, rng, T.COLD, c, 'cold'));
  if (ageYears(p) < 16) {
    if (!c.kid) return render(c, rng, pickEntry(g, rng, T.CHILD, c, 'ch'));
    return render(c, rng, pickEntry(g, rng, T.GREET, c, 'gr', (x) => x.k && /c\.peer/.test(String(x.when))));
  }
  return render(c, rng, pickEntry(g, rng, T.GREET, c, 'gr', c.kid ? (x) => x.k : null));
}
function lineMine(g, rng, p, k) {
  const c = ctxFor(g, p);
  if (k !== 'widow' && k !== 'childlost' && c.enemy && k !== 'noto') return null;
  if ((k === 'newjob' || k === 'rankup') && !c.myJob) return null;
  return render(c, rng, pickEntry(g, rng, T.MINE[k], c, `mi${k}`));
}
function lineDeed(g, rng, p, r) {
  const c = ctxFor(g, p, { axis: r.axis, rumorQuote: rng.pick(QUOTES) });
  Object.assign(c, rumorBits(r.text, c.lo, g.player.name));
  return render(c, rng, pickEntry(g, rng, r.val > 0 ? T.DEED.good : T.DEED.bad, c, r.val > 0 ? 'dg' : 'db'));
}
function lineTheirs(g, rng, p, f) {
  const mate = f.k === 'wed' || f.k === 'widow' ? byId(g, f.x)?.name : null;
  const baby = f.k === 'baby' ? byId(g, f.x) : null;
  if ((f.k === 'wed' || f.k === 'widow') && !mate) return null;
  if (f.k === 'baby' && !baby) return null;
  const c = ctxFor(g, p, { mate, baby: baby?.name, babyRa: baby && hasBatchim(baby.name) ? '이라' : '라', babyWord: baby?.sex === 'm' ? '아들' : '딸', job: jobWord(f.x) ?? jobWord(p.job) ?? '' });
  return render(c, rng, pickEntry(g, rng, T.THEIRS[f.k], c, `th${f.k}`));
}
function lineReunion(g, rng, { p, old, cur }) {
  const yrs = Math.max(1, Math.round((cur.m - old.m) / 12));
  const gap = yrs >= 2 ? `${yrs}년` : '한 해';
  const mate = cur.sp ? byId(g, cur.sp)?.name : null;
  const kidsNew = cur.k - old.k;
  const c = ctxFor(g, p, { gap, mate, job: jobWord(cur.j) ?? '', kidsNew: NUM[clamp(kidsNew, 0, 7)], meGrew: playerAge(g) >= 16 && playerAge(g) - yrs < 15, meOld: playerAge(g) >= 55 && cur.a >= 50 });
  const bits = [];
  if (old.a < 16 && cur.a >= 16) bits.push(rng.pick(T.CHANGE.grewUp(c)));
  else if (cur.a >= 58 && (old.a < 58 || yrs >= 6)) bits.push(rng.pick(T.CHANGE.aged(c)));
  else if (yrs >= 5 && cur.a >= 25) bits.push(rng.pick(T.CHANGE.older(c)));
  if (cur.sp && cur.sp !== old.sp && mate && cur.spa) bits.push(rng.pick(T.CHANGE.wed(c)));
  else if (old.sp && old.spa && !cur.spa) bits.push(rng.pick(T.CHANGE.widow(c)));
  if (kidsNew > 0) bits.push(rng.pick(T.CHANGE.kids(c)));
  if (cur.j !== old.j && old.j !== 'child' && jobWord(cur.j)) bits.push(rng.pick(T.CHANGE.job(c)));
  if (cur.w - old.w >= 60) bits.push(rng.pick(T.CHANGE.rich(c)));
  else if (old.w - cur.w >= 40) bits.push(rng.pick(T.CHANGE.poor(c)));
  if (cur.h < 35) bits.push(rng.pick(T.CHANGE.sick(c)));
  const head = `${gap} 만에 ${J(p.name, '을/를')} 다시 만났다.`;
  const body = bits.slice(0, 3).join(' ');
  const said = render(c, rng, pickEntry(g, rng, T.REUNION, c, 're'), true);
  remember(g, p, '오랜만에 다시 만났다', 0, { tag: 'enc_met' });
  if (!c.cool && !c.enemy) p.affection = clamp(p.affection + 2, -100, 100);
  return [head, body, said].filter(Boolean).join(' ');
}
function lineRecall(g, rng, p) {
  const now = mi(g);
  if (playerAge(g) < 14 || ageYears(p) < 14) return null;
  const mems = (p.memories ?? []).filter((m) => m.tone && now - (m.y * 12 + m.m) >= 12 && m.tag !== 'enc_met' && m.tag !== 'met' && now - (m.said ?? -999) >= 60);
  if (!mems.length) return null;
  const m = rng.pick(mems);
  m.said = now;
  const c = ctxFor(g, p, { recall: recallOf(m) });
  if (m.tone < 0 && c.friend) return null;
  return render(c, rng, pickEntry(g, rng, m.tone > 0 ? T.RECALL.good : T.RECALL.bad, c, m.tone > 0 ? 'rg' : 'rb'));
}
function lineGossip(g, rng, p, pool) {
  const e = E(g);
  const others = pool.filter((x) => x.id !== p.id);
  const opts = [];
  for (const f of e.fresh) { const o = byId(g, f.id); if (o && o.id !== p.id && o.name !== p.name && T.GOSSIP[f.k]) opts.push({ k: f.k, o }); }
  for (const [key, t] of Object.entries(e.ties)) {
    const [a, b] = key.split('-').map(Number).map((id) => byId(g, id));
    if (!a?.alive || !b?.alive || a.id === p.id || b.id === p.id || a.name === p.name || b.name === p.name || a.name === b.name) continue;
    if (t.k === 'feud' || t.k === 'court') opts.push({ k: t.k, o: a, o2: b });
  }
  for (const o of others.filter((x) => x.name !== p.name)) { if (has(o, 'drunkard')) opts.push({ k: 'drunk', o }); else if (has(o, 'lazy') && o.job === 'farmer') opts.push({ k: 'lazy', o }); }
  const freshOpts = opts.filter((x) => !e.used.includes(`go${x.k}${x.o.id}`));
  if (!freshOpts.length) return null;
  const pickd = rng.pick(freshOpts);
  e.used.push(`go${pickd.k}${pickd.o.id}`); if (e.used.length > 60) e.used.shift();
  const c = ctxFor(g, p, { other: pickd.o.name, other2: pickd.o2?.name ?? '' });
  const s = T.GOSSIP[pickd.k](c);
  return spoken(c, rng, s);
}

/* ---------- 이웃들끼리 ---------- */
// NPC 한 달에서 생긴 일 가운데 이 고장 사람의 일을 모아 둔다
HOOKS.afterNpc.push((g, _rng, sim) => {
  const e = E(g);
  e.sim = [];
  if (!Array.isArray(sim) || !g.player) return;
  const pl = here(g);
  for (const ev of sim) {
    const ids = ev?.who ?? [];
    const a = byId(g, ids[0]);
    if (!a || !isHere(a, pl) || isFamily(g, a) || a.isPlayer) continue;
    const t = String(ev.text ?? '');
    let k = null; let x = null; let y = null;
    if (/혼인했다/.test(t) && ids.length >= 2) { k = 'wed'; x = ids[0]; y = ids[1]; }
    else if (/태어났다/.test(t) && ids.length >= 2) { k = 'baby'; x = ids[1]; }
    else if (!a.alive && a.ageMonths >= 16 * 12) { k = 'death'; x = ids[0]; }
    else if (/떠났다/.test(t) && a.away) { k = 'left'; x = ids[0]; }
    else if (/정착했다|이사 왔다/.test(t)) { k = 'came'; x = ids[0]; }
    if (k) e.sim.push({ k, x, y, known: ids.some((id) => byId(g, id)?.known) });
  }
});
function lineWitness(g, rng) {
  const e = E(g);
  const known = e.sim.filter((s) => s.known);
  const from = known.length ? known : e.sim;
  if (!from.length) return null;
  const s = rng.pick(from);
  const a = byId(g, s.x); const b = s.y ? byId(g, s.y) : null;
  if (!a || (s.k === 'wed' && !b)) return null;
  return rng.pick(T.WITNESS[s.k]({ a: a.name, b: b?.name }));
}
const tieKey = (a, b) => (a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`);
function lineBetween(g, rng, pl) {
  const e = E(g);
  const now = mi(g);
  const adults = living(g).filter((p) => !p.isPlayer && isHere(p, pl) && ageYears(p) >= 16 && !isFamily(g, p));
  if (adults.length < 3) return null;
  // 묵은 사이가 먼저: 다툰 집은 또 붙거나 화해하고, 눈 맞은 사이는 소문이 난다
  for (const [key, t] of Object.entries(e.ties)) {
    const [a, b] = key.split('-').map(Number).map((id) => byId(g, id));
    if (!a?.alive || !b?.alive || !isHere(a, pl) || !isHere(b, pl)) { delete e.ties[key]; continue; }
    if (now - t.at < 4 || !rng.chance(0.35)) continue;
    if (t.k === 'feud') {
      t.at = now; t.n += 1;
      if (t.n >= 2 && rng.chance(0.4)) { t.k = 'mend'; return rng.pick(T.WITNESS.mend({ a: a.name, b: b.name })); }
      return rng.pick(T.WITNESS.requarrel({ a: a.name, b: b.name }));
    }
    if (t.k === 'court' && !a.spouseId && !b.spouseId) { t.at = now; return rng.pick(T.WITNESS.court({ a: a.name, b: b.name })); }
  }
  const a = rng.pick(adults);
  const rest = adults.filter((x) => x.id !== a.id);
  const b = rng.pick(rest);
  if (!(a.known || b.known) || a.name === b.name) return null;
  const key = tieKey(a, b);
  const kinds = [];
  if (!e.ties[key]) kinds.push('quarrel');
  if (has(a, 'cruel') || has(a, 'greedy')) kinds.push('quarrel');
  if (has(a, 'drunkard')) kinds.push('drunk', 'drunk');
  if (has(a, 'kind') || has(a, 'generous')) kinds.push('help', 'help');
  if (has(a, 'greedy') && (b.wealth ?? 0) > (a.wealth ?? 0) + 30) kinds.push('envy');
  if ((a.childIds?.length ?? 0) >= 2) kinds.push('kids');
  const single = (x) => !x.spouseId && ageYears(x) >= 17 && ageYears(x) <= 35;
  if (single(a) && single(b) && a.sex !== b.sex && Math.abs(ageYears(a) - ageYears(b)) <= 8 && !e.ties[key]) kinds.push('court', 'court');
  if (!kinds.length) return null;
  const fresh = kinds.filter((x) => !e.used.includes(`bw${x}`));
  if (!fresh.length) return null;
  const k = rng.pick(fresh);
  e.used.push(`bw${k}`); if (e.used.length > 60) e.used.shift();
  if (k === 'quarrel') e.ties[key] = { k: 'feud', at: now, n: 1 };
  if (k === 'court') e.ties[key] = { k: 'court', at: now, n: 1 };
  const keys = Object.keys(e.ties);
  if (keys.length > 16) delete e.ties[keys[0]];
  return rng.pick(T.WITNESS[k]({ a: a.name, b: b.name }));
}

/* ---------- 빌려준 돈 ---------- */
function loanLines(g, rng, pl) {
  const e = E(g);
  const now = mi(g);
  const out = [];
  for (const L0 of [...e.loans]) {
    const p = byId(g, L0.id);
    if (!p || !p.alive) {
      e.loans = e.loans.filter((x) => x !== L0);
      if (p) out.push({ kind: 'loan', id: p.id, name: p.name, text: `${J(p.name, '이/가')} 세상을 떠났다. 빌려준 은화 ${L0.amt}닢은 이제 받을 길이 없다. 그 집 문 앞에서 그 생각을 한 것이 조금 부끄러웠다.` });
      continue;
    }
    if (now < L0.due || !isHere(p, pl)) continue;
    const bad = has(p, 'drunkard') || has(p, 'lazy') || has(p, 'greedy');
    const pays = !bad || rng.chance(0.25) || p.wealth > 60;
    if (pays) {
      e.loans = e.loans.filter((x) => x !== L0);
      g.player.money += L0.amt;
      p.affection = clamp(p.affection + 3, -100, 100);
      const extra = has(p, 'generous') || has(p, 'kind') ? ' 달걀 한 바구니가 같이 들려 있었다.' : '';
      out.push({ kind: 'loan', id: p.id, name: p.name, text: `${J(p.name, '이/가')} 은화 ${L0.amt}닢을 들고 찾아왔다. "${lowSpeech(g, p) ? '늦어서 미안해. 그때 정말 살았어.' : '늦어서 죄송해요. 그때 정말 살았어요.'}"${extra} (은화 +${L0.amt})` });
    } else if (now - L0.due >= 12) {
      e.loans = e.loans.filter((x) => x !== L0);
      remember(g, p, '빌린 돈을 끝내 갚지 않았다', -1, { tag: 'enc_loan' });
      out.push({ kind: 'loan', id: p.id, name: p.name, text: `${J(p.name, '은/는')} 이제 나를 보면 먼저 골목을 돌아간다. 빌려 간 은화 ${L0.amt}닢 이야기는 서로 꺼내지 않는다.` });
    } else if (now - L0.due >= 2 && rng.chance(0.3)) {
      out.push({ kind: 'loan', id: p.id, name: p.name, text: `${J(p.name, '이/가')} 주점에서 웃고 떠들다 나와 눈이 마주쳤다. 빌려 간 은화 ${L0.amt}닢이 생각났는지 얼른 잔을 내려놓았다.` });
    }
  }
  return out;
}

/* ---------- 부탁 (장면) ---------- */
function maybeAsk(g, rng, pool) {
  const e = E(g);
  const now = mi(g);
  if (playerAge(g) < 18 || now - e.askAt < 9 || sceneQueued(g, 'enc_ask') || !rng.chance(0.3)) return;
  if (!['family', 'rent', 'own'].includes(L(g).home)) return;
  const near = pool.filter((p) => ageYears(p) >= 18 && p.affection >= 0 && p.bond !== 'enemy' && !e.loans.some((x) => x.id === p.id));
  if (!near.length) return;
  const p = rng.pick(near);
  const opts = [];
  if ((p.wealth ?? 0) < 20 || g.world?.famine) opts.push('loan', 'loan');
  opts.push('hands');
  const feud = Object.entries(e.ties).find(([key, t]) => t.k === 'feud' && key.split('-').map(Number).includes(p.id));
  if (feud) opts.push('word', 'word');
  const ask = rng.pick(opts);
  const data = { id: p.id, ask };
  if (ask === 'loan') { data.amt = Math.round(rng.int(4, 12) * (g.world?.famine ? 1.5 : 1)); data.why = rng.pick(g.world?.famine ? T.LOAN_WHY_FAMINE : T.LOAN_WHY); }
  if (ask === 'hands') data.task = rng.pick(T.TASKS[monthInfo(g).season]);
  if (ask === 'word') data.other = feud[0].split('-').map(Number).find((id) => id !== p.id);
  e.askAt = now;
  queueScene(g, 'enc_ask', data);
}
const askPerson = (g, s) => { const p = byId(g, s.id); return p && p.alive && isHere(p, here(g)) ? p : null; };
defineScene('enc_ask', {
  title: (g, s) => `${byId(g, s.id)?.name ?? '이웃'}의 부탁`,
  need: (g, s) => !!askPerson(g, s) && (s.ask !== 'word' || !!byId(g, s.other)?.alive),
  text: (g, s) => {
    const p = askPerson(g, s);
    const c = ctxFor(g, p, { amt: s.amt, why: s.why, task: s.task, other: byId(g, s.other)?.name ?? '' });
    return T.ASK[s.ask](c);
  },
  choices: (g, s) => {
    const p = askPerson(g, s);
    if (!p) return [];
    if (s.ask === 'loan') {
      const out = [];
      if (canSpend(g, s.amt)) out.push({ label: `은화 ${s.amt}닢을 빌려준다`, key: 'all' });
      const half = Math.ceil(s.amt / 2);
      if (s.amt >= 6 && canSpend(g, half)) out.push({ label: `절반(${half}닢)만 빌려준다`, key: 'half' });
      out.push({ label: '형편이 안 된다며 거절한다', key: 'no' });
      return out;
    }
    if (s.ask === 'hands') return [{ label: '하루 거든다', key: 'yes' }, { label: '바쁘다며 거절한다', key: 'no' }];
    const o = byId(g, s.other);
    return [{ label: `${p.name}의 편을 들어 준다`, key: 'side' }, { label: `${o?.name ?? '상대'}의 사정도 들어 보라고 한다`, key: 'other' }, { label: '둘을 불러 앉혀 화해시킨다', key: 'mend' }, { label: '남의 일에 끼지 않는다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const p = askPerson(g, s);
    if (!p) return '그 일은 흐지부지되었다.';
    const lo = lowSpeech(g, p);
    const aff = (n) => { p.affection = clamp(p.affection + n, -100, 100); };
    const e = E(g);
    if (s.ask === 'loan') {
      if (key === 'no') { aff(p.affection >= 35 ? -6 : -3); remember(g, p, '어려울 때 돈을 빌리러 왔다가 빈손으로 돌아갔다', -1, { tag: 'enc_loan' }); return `${J(p.name, '은/는')} "${lo ? '아니야, 내가 괜한 말을 했다.' : '아니에요, 제가 괜한 말씀을 드렸네요.'}" 하고 돌아섰다. 어깨가 처져 있었다.`; }
      const amt = key === 'half' ? Math.ceil(s.amt / 2) : s.amt;
      if (!spend(g, amt)) return '주머니를 뒤져 보니 돈이 모자랐다. 서로 민망하게 웃었다.';
      e.loans.push({ id: p.id, amt, at: mi(g), due: mi(g) + rng.int(4, 14) });
      aff(key === 'half' ? 4 : 7);
      remember(g, p, '어려울 때 은화를 빌려주었다', 1, { tag: 'enc_loan' });
      return `은화 ${amt}닢을 쥐여 주었다. ${J(p.name, '은/는')} 그 손을 한참 놓지 않았다. "${lo ? '꼭 갚을게. 꼭.' : '꼭 갚을게요. 꼭요.'}" (은화 -${amt})`;
    }
    if (s.ask === 'hands') {
      if (key === 'no') { aff(-3); return `${J(p.name, '은/는')} "${lo ? '그래, 다들 바쁘지.' : '네, 다들 바쁘시죠.'}" 하고 웃었다. 다른 집 문을 두드리러 가는 뒷모습이 보였다.`; }
      tired(g, 12); aff(5);
      remember(g, p, '바쁜 철에 일손을 보태 주었다', 1, { tag: 'enc_hands' });
      return `${J(s.task, '을/를')} 하루 종일 거들었다. 저녁에 ${p.name}네 식구들과 한 상에 앉아 거친 빵과 국을 나눠 먹었다. 허리가 뻐근했지만 나쁘지 않은 하루였다. (피로 +12)`;
    }
    const o = byId(g, s.other);
    const key2 = o ? tieKey(p, o) : null;
    if (key === 'side') { aff(5); if (o) o.affection = clamp(o.affection - 6, -100, 100); return `${p.name}의 편을 들어 주었다. ${J(p.name, '은/는')} 기세가 올랐고, ${o ? `${J(o.name, '은/는')} 그 뒤로 나를 보는 눈이 달라졌다.` : ''}`.trim(); }
    if (key === 'other') { aff(-2); return `${J(p.name, '은/는')} 입을 삐죽였다. "${lo ? '너까지 그러기냐.' : '그쪽까지 그러세요.'}" 그래도 며칠 뒤 ${o?.name ?? '상대'}네 담 앞에서 서성이는 것을 보았다.`; }
    if (key === 'mend') {
      const ok = check(rng, (g.player.stats?.cha ?? 20) * 0.7 + (g.player.stats?.wil ?? 20) * 0.3, 30);
      if (ok && key2) { e.ties[key2] = { k: 'mend', at: mi(g), n: 1 }; aff(4); if (o) o.affection = clamp(o.affection + 4, -100, 100); return `둘을 주점 구석에 앉혀 놓고 술을 한 병 시켰다. 처음엔 서로 딴 데만 보더니, 병이 비었을 때는 둘이 같이 영주 욕을 하고 있었다. 다툼은 그걸로 끝났다.`; }
      aff(-1); if (o) o.affection = clamp(o.affection - 2, -100, 100);
      return '둘을 한자리에 앉혔지만 말 세 마디 만에 언성이 높아졌다. 결국 둘 다 나한테 화를 내고 돌아갔다.';
    }
    return `"${lo ? '알았다. 네 일 아니지.' : '알겠어요. 그쪽 일은 아니죠.'}" ${J(p.name, '은/는')} 서운한 얼굴로 돌아갔다.`;
  },
});

/* ---------- 한 달 고르기 ---------- */
function canMeet(g) {
  if (g.over || !g.player || L(g).heirPending) return false;
  if (playerAge(g) < 5) return false;
  if (traveling(g) || isJailed(g) || g.bondage?.slave || g.army?.campaign || g.army?.captive) return false;
  return true;
}
function monthTick(g, rng) {
  const e = E(g);
  e.month = [];
  if (!canMeet(g)) { e.sim = []; return; }
  const now = mi(g);
  const pl = here(g);
  myChanges(g);
  const pool = people(g, pl);
  const long = scanPeople(g, pool);
  const out = loanLines(g, rng, pl).slice(0, 1);
  const recently = (p) => now - (e.last[p.id] ?? -99) < 3;
  const cands = [];
  // 오랜만에 만난 사람
  for (const x of long) cands.push({ k: 'reunion', w: 6, p: x.p, run: () => lineReunion(g, rng, x) });
  // 내게 생긴 일
  for (const m of e.mine) {
    if (m.used) continue;
    let speakers = pool.filter((p) => ageYears(p) >= 12 && !recently(p));
    if (m.k === 'moved') {
      const strangers = living(g).filter((p) => !p.isPlayer && !p.known && isHere(p, pl) && ageYears(p) >= 16 && !isFamily(g, p));
      speakers = strangers.length ? strangers : speakers;
    }
    if (!speakers.length) continue;
    const pref = speakers.filter((p) => p.affection >= 20 || m.k === 'moved');
    const p = rng.pick(pref.length && rng.chance(0.7) ? pref : speakers);
    cands.push({ k: 'mine', w: m.k === 'widow' || m.k === 'childlost' ? 7 : 4, p, run: () => { m.used = true; if (m.k === 'moved') { p.known = true; rel(p); } return lineMine(g, rng, p, m.k); } });
  }
  // 내가 한 일이 소문났다
  const rumors = reputeState(g).rumors.filter((r) => r.from === pl && now - r.at <= 3 && (!r.lie || r.known) && Math.abs(r.val) >= 5 && r.text && !e.deeds.includes(r.id));
  if (rumors.length && pool.length) {
    const r = rng.pick(rumors);
    const ok = pool.filter((x) => ageYears(x) >= 14 && !recently(x));
    const p = ok.length ? rng.pick(ok) : null;
    if (p) cands.push({ k: 'deed', w: 3, p, run: () => { e.deeds.push(r.id); if (e.deeds.length > 30) e.deeds.shift(); return lineDeed(g, rng, p, r); } });
  }
  // 그 사람에게 생긴 일
  for (const f of e.fresh) {
    if (f.told) continue;
    const p = byId(g, f.id);
    if (!p?.alive || !isHere(p, pl) || recently(p) || !T.THEIRS[f.k]) continue;
    cands.push({ k: 'theirs', w: 2.5, p, run: () => { f.told = true; return lineTheirs(g, rng, p, f); } });
  }
  const free = pool.filter((p) => !recently(p));
  if (free.length) {
    const p = rng.pick(free);
    cands.push({ k: 'greet', w: playerAge(g) < 16 ? 1 : 1.6, p, run: () => lineGreet(g, rng, p) });
    const friends = free.filter((x) => (x.memories ?? []).some((m) => m.tone));
    if (friends.length) { const q = rng.pick(friends); cands.push({ k: 'recall', w: 0.8, p: q, run: () => lineRecall(g, rng, q) }); }
    const talkers = free.filter((x) => has(x, 'gossip'));
    const gp = talkers.length ? rng.pick(talkers) : rng.chance(0.3) ? p : null;
    if (gp && ageYears(gp) >= 14) cands.push({ k: 'gossip', w: talkers.length ? 1.2 : 0.5, p: gp, run: () => lineGossip(g, rng, gp, pool) });
  }
  if (e.sim.length) cands.push({ k: 'witness', w: e.sim.some((s) => s.known) ? 2.2 : 0.8, p: null, run: () => lineWitness(g, rng) });
  if (playerAge(g) >= 8) cands.push({ k: 'between', w: 0.7, p: null, run: () => lineBetween(g, rng, pl) });

  const want = rng.chance(0.42) ? 2 : 1;
  const usedK = new Set(); const usedP = new Set();
  for (let tries = 0; out.length < want && tries < 6 && cands.length; tries++) {
    const left = cands.filter((c) => !usedK.has(c.k) && !(c.p && usedP.has(c.p.id)));
    if (!left.length) break;
    const c = rng.weighted(left, (x) => x.w);
    cands.splice(cands.indexOf(c), 1);
    let text = null;
    try { text = c.run(); } catch (err) { if (globalThis.__ENC_STRICT) throw err; text = null; }
    if (!text) continue;
    usedK.add(c.k); if (c.p) { usedP.add(c.p.id); e.last[c.p.id] = now; }
    out.push({ kind: c.k, id: c.p?.id ?? null, name: c.p?.name ?? null, text });
  }
  e.month = out.slice(0, 2);
  for (const x of e.month) e.log.push({ y: g.date.year, m: g.date.month, text: x.text });
  if (e.log.length > 24) e.log.splice(0, e.log.length - 24);
  maybeAsk(g, rng, pool);
  e.sim = [];
  // 해마다 한 번 묵은 기록을 치운다
  if (g.date.month === 1) {
    for (const id of Object.keys(e.seen)) { const p = byId(g, Number(id)); if (!p || !p.alive) delete e.seen[id]; }
    for (const id of Object.keys(e.last)) if (now - e.last[id] > 24) delete e.last[id];
    for (const id of Object.keys(e.said)) { const p = byId(g, Number(id)); if (!p || !p.alive) delete e.said[id]; }
  }
}

HOOKS.afterMonth.push((g) => monthTick(g, ownRng(g, 1)));
// 대를 이으면 나를 아는 사람이 달라진다: 내 모습과 소식은 새로 시작하고, 사람들의 모습 기록은 둔다
HOOKS.heir.push((g) => { const e = E(g); e.me = null; e.mine = []; e.month = []; e.loans = []; e.askAt = mi(g); });
HOOKS.newGame.push((g) => { E(g); });
HOOKS.migrate.push((g) => { E(g); });
