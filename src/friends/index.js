// 35단계: 평생의 벗. 상태는 g.friends 하나, 화면 연결점은 friendsLines(g) / friendsLine(g) / friendsInfo(g).
// 소꿉친구 뒤로 끊기던 우정을 잇는다. 의형제(oath)보다 가벼운 사이: 피를 섞지 않고, 부르면 꼭 가야 하는 것도 아니다.
// - 벗 사귀기(fr_meet): 열여섯 넘어 같은 고장에서 호감이 쌓인 또래가 벗이 된다. 어디서 사귀었나(일터·술집·싸움터·학원)가 남는다.
//   소꿉친구는 열여섯에 저절로 벗 목록에 든다. 의형제를 맺은 사람은 oath가 맡으니 여기서 빠진다.
// - 우정의 깊이(depth): 같은 고장에 있으면 천천히 깊어지고, 두 해 넘게 못 보면 옅어진다. 너무 옅어지면 멀어진 벗(cold).
// - 다시 만남(fr_reunion): 네 해 넘게 못 본 벗과 같은 고장에서 마주친다.
// - 돈 꿔 주기(fr_loan)와 갚지 않는 벗(fr_debt), 보증(fr_surety)과 도망친 벗(fr_surety_due).
// - 벗의 혼례(fr_wedding)와 장례(fr_funeral). 장례 뒤 남은 식구를 돌보면 그 집 아이와 이어진다.
// - 질투(fr_jealous): 내가 벗보다 크게 잘되면 야심 있거나 욕심 많은 벗이 식는다. 더 나빠지면 배신(fr_betray), 몇 해 뒤 사과(fr_forgive).
// - 늙어서 남은 벗(fr_old): 예순 넘어 둘 다 살아 있을 때.
// - 대를 넘는 우정: 대를 이으면 선대의 벗이 찾아오고(fr_elder), 선대 벗의 자식과 벗이 될 수 있다(fr_legacy). 내 아이와 벗의 아이가 어울리는 줄.
// - 플레이어 없이도 NPC끼리 벗이 생기고(같은 고장 또래) 다투거나 떠나거나 죽어 갈라진다.
// 새 행동은 없다. 장면은 그 형편일 때만 뜬다. 게임 난수는 건드리지 않는다(ownRng).
import { J, hasBatchim } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat } from '../game.js';
import { byId, ageYears, living, makePerson } from '../npc.js';
import { JOBS, MALE_NAMES, FEMALE_NAMES, LAST_NAMES, TRAITS } from '../data.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, spend, canSpend, check } from '../adventure/core.js';
import { rel, remember } from '../relations.js';
import { isJailed } from '../crime.js';
import { addGrudge } from '../feud/index.js';
import { deed } from '../repute/index.js';
import { enrolled } from '../school/state.js';
import { makeRng } from '../rng.js';
import * as T from './lines.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeOf = (p) => p.place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 곳';
const has = (p, t) => !!p?.traits?.includes?.(t);
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 331) ^ Math.imul(mi(g) * 173 + salt + 61, 2654435761)) | 0 });
const aff = (p, n) => { if (!p) return; rel(p); p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
const jobWord = (p) => (p?.job && p.job !== 'child' && p.job !== 'idle' ? JOBS[p.job]?.name ?? null : null);
// 노예로 묶여 있거나 유배 중일 때는 벗 장면을 띄우지 않는다 (그쪽 갈래가 삶을 맡는다)
const free = (g) => playerAge(g) >= 16 && !traveling(g) && !isJailed(g) && !g.over && !g.explore?.exp && !g.bondage?.slave && !g.exile?.banish && !g.army?.captive && !L(g).heirPending;
const MAX_ACTIVE = 5;

/* ---------- 상태 ---------- */
export function friendsState(g) {
  g.friends ??= {};
  const s = g.friends;
  s.list ??= [];     // [{ pid, since, where, depth, lastMet, state: close|cold|broken|dead|sworn, wed, debt, jealous, shown, betrayedAt, forgiven, diedAt, kidsAt }]
  s.npc ??= [];      // NPC끼리 [{ a, b, place, since, end: null|quarrel|moved|death, endAt }]
  s.elders ??= [];   // 선대의 벗 [{ pid, from, at, met }]
  s.legacy ??= [];   // 선대 벗의 자식 [{ pid, parent, asked }]
  s.done ??= {};     // 장면 열쇠 → 달
  s.month ??= [];
  s.used ??= [];
  s.log ??= [];
  s.sceneAt ??= -99;
  s.newAt ??= -99;
  s.farAt ??= -99;
  s.gen ??= 0;
  s.lost ??= 0;      // 먼저 보낸 벗
  return s;
}
const S = friendsState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.shift(); }
function line(g, kind, text, pid = null) { const s = S(g); if (s.month.length < 2 && !s.month.some((x) => x.text === text)) s.month.push({ kind, pid, text }); }
function pickFresh(g, rng, key, pool) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${key}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${key}${i}`); if (s.used.length > 20) s.used.shift();
  return pool[i];
}
const fOf = (g, pid) => S(g).list.find((f) => f.pid === pid) ?? null;
const sworn = (g, pid) => !!g.oath?.bonds?.some((b) => b.kind === 'blood' && b.pid === pid);
const isKin = (g, p) => {
  const m = me(g);
  return p.id === m.fatherId || p.id === m.motherId || p.fatherId === m.id || p.motherId === m.id || p.id === m.spouseId
    || (p.fatherId != null && p.fatherId === m.fatherId) || (p.motherId != null && p.motherId === m.motherId) || (g.player.familyIds ?? []).includes(p.id);
};
const nearMe = (g, p) => p?.alive && !p.away && placeOf(p) === here(g) && !traveling(g);
const active = (s) => s.list.filter((f) => f.state === 'close');
export const depthWord = (d) => (d >= 80 ? '말하지 않아도 아는 사이' : d >= 60 ? '속을 터놓는 벗' : d >= 40 ? '가까운 벗' : d >= 20 ? '가끔 마시는 벗' : '얼굴만 아는 사이가 되어 간다');
const stateWord = { close: null, cold: '멀어졌다', broken: '등을 돌렸다', dead: '세상을 떠났다', sworn: '의형제가 되었다' };
const he = (p) => (p?.sex === 'f' ? '그녀' : '그');

function addFriend(g, p, where, depth) {
  const s = S(g);
  if (!p || fOf(g, p.id)) return null;
  const f = { pid: p.id, since: mi(g), where, depth: clamp(depth, 0, 100), lastMet: mi(g), state: 'close', wed: !!p.spouseId, debt: null, jealous: 0, shown: false, betrayedAt: null, forgiven: null, diedAt: null, kidsAt: -99 };
  s.list.push(f);
  if (s.list.length > 16) { const i = s.list.findIndex((x) => x.state !== 'close'); s.list.splice(i >= 0 ? i : 0, 1); }
  return f;
}
const whereNow = (g) => (g.army?.campaign ? 'war' : enrolled(g) ? 'school' : L(g).job ? 'work' : 'tavern');

/* ---------- 달마다: 벗 하나하나 ---------- */
function friendTick(g, rng) {
  const s = S(g);
  const now = mi(g);
  for (const f of s.list) {
    const p = byId(g, f.pid);
    if (!p || f.state === 'dead' || f.state === 'sworn') continue;
    if (sworn(g, f.pid)) { f.state = 'sworn'; continue; }
    if (!p.alive) {
      const was = f.state;
      f.state = 'dead'; f.diedAt = now; s.lost += 1;
      log(g, `벗 ${J(p.name, '이/가')} 세상을 떠났다.`);
      if (was === 'close' && f.depth >= 35) {
        if (free(g) && placeOf(p) === here(g)) queueScene(g, 'fr_funeral', { pid: p.id, name: p.name });
        else line(g, 'grief', `${placeName(placeOf(p))}에서 ${J(p.name, '이/가')} 세상을 떠났다는 소식이 늦게 닿았다. 장례는 이미 끝났다고 한다. 그날 저녁 혼자 잔을 두 개 놓았다.`, p.id);
      }
      continue;
    }
    if (f.state === 'broken') continue;
    const near = nearMe(g, p);
    if (near) {
      const gap = now - f.lastMet;
      if (gap >= 48 && f.depth >= 20 && !sceneQueued(g, 'fr_reunion')) queueScene(g, 'fr_reunion', { pid: p.id, name: p.name, years: Math.floor(gap / 12) });
      f.lastMet = now;
      if ((p.affection ?? 0) >= 15 && f.depth < (p.affection ?? 0) + 25) f.depth = clamp(f.depth + 0.07, 0, 100);
      if (f.state === 'cold' && f.depth >= 25) f.state = 'close';
    } else if (now - f.lastMet > 24) {
      f.depth = clamp(f.depth - 0.3, 0, 100);
    }
    if (f.state === 'close' && f.depth < 12) {
      f.state = 'cold'; log(g, `${J(p.name, '과/와')} 멀어졌다.`);
      if (near) line(g, 'drift', pickFresh(g, rng, 'dr', T.DRIFT)({ n: p.name }), p.id);
    }
    // 벗이 혼인한다
    if (p.spouseId && !f.wed) {
      f.wed = true;
      if (p.spouseId !== me(g).id && f.state === 'close') {
        if (near && free(g) && f.depth >= 25) queueScene(g, 'fr_wedding', { pid: p.id, name: p.name, sp: byId(g, p.spouseId)?.name ?? '' });
        else line(g, 'wed', `${placeName(placeOf(p))}의 ${J(p.name, '이/가')} 혼인했다는 말을 들었다.`, p.id);
      }
    }
    // 질투: 내가 크게 잘될 때, 야심 있거나 욕심 많은 벗
    const rise = (L(g).renown ?? 0) >= 30 || g.player.money >= 500 || !!g.player.title;
    const envious = has(p, 'ambitious') || has(p, 'greedy') || (p.rivalry ?? 0) >= 30;
    f.jealous = clamp(f.jealous + (rise && envious && (p.wealth ?? 0) < 80 ? 0.35 : -0.25), 0, 100);
    // 빚
    if (f.debt) {
      const d = f.debt;
      if (d.kind === 'loan' && !d.asked) {
        const pay = has(p, 'greedy') || has(p, 'lazy') ? 0.008 : has(p, 'generous') || has(p, 'diligent') ? 0.04 : 0.022;
        if (rng.chance(pay)) {
          g.player.money += d.amt; f.debt = null; f.depth = clamp(f.depth + 4, 0, 100);
          log(g, `${J(p.name, '이/가')} 꾼 돈 은화 ${d.amt}닢을 갚았다.`);
          line(g, 'debt', `${J(p.name, '이/가')} 꾸어 간 은화 ${d.amt}닢을 들고 왔다. 이자 삼아 술 한 병도 얹었다.`, p.id);
        } else if (now - d.at >= 36) d.asked = true;
      }
      if (d.kind === 'surety' && !d.asked) {
        const run = has(p, 'greedy') || has(p, 'lazy') || has(p, 'drunkard') ? 0.02 : 0.008;
        if (rng.chance(run)) d.asked = true;
        else if (now - d.at >= 48) { f.debt = null; log(g, `${p.name}의 보증이 풀렸다.`); line(g, 'debt', `${J(p.name, '이/가')} 대금업자에게 진 빚을 다 갚았다고 한다. 내 이름이 적힌 보증 문서가 불 속에 들어갔다.`, p.id); }
      }
    }
  }
}

/* ---------- 새 벗 ---------- */
function makeTick(g, rng) {
  const s = S(g);
  const age = playerAge(g);
  // 소꿉친구는 열여섯에 벗 목록으로
  const bid = g.childhood?.friend;
  if (age >= 16 && bid != null && !s.done.bestie) {
    s.done.bestie = mi(g);
    const b = byId(g, bid);
    if (b?.alive && !sworn(g, b.id)) { addFriend(g, b, 'child', clamp(b.affection ?? 40, 30, 80)); log(g, `소꿉친구 ${J(b.name, '과/와')} 어른이 되어서도 벗으로 남았다.`); }
  }
  if (age < 16 || !free(g) || active(s).length >= MAX_ACTIVE || mi(g) - s.newAt < 12 || !rng.chance(0.12)) return false;
  const pool = living(g).filter((p) => !p.isPlayer && p.known && ageYears(p) >= 16 && Math.abs(ageYears(p) - age) <= 15 && placeOf(p) === here(g)
    && (p.affection ?? 0) >= 25 && !fOf(g, p.id) && !isKin(g, p) && !sworn(g, p.id) && !['spouse', 'lover', 'ex', 'enemy'].includes(p.bond) && (p.rivalry ?? 0) < 40);
  s.newAt = mi(g);
  let where = whereNow(g);
  const v = (s.meets = (s.meets ?? 0) + 1); // 갈래마다 글을 돌려 쓴다
  if (pool.length) {
    pool.sort((a, b) => (b.affection ?? 0) - (a.affection ?? 0));
    const p = pool[rng.int(0, Math.min(2, pool.length - 1))];
    // 아는 이웃인데 일터도 술집도 아니면 '늘 같은 자리에 앉는 술꾼'처럼 쓰지 않는다
    if (where === 'tavern' && !rng.chance(0.35)) where = 'village';
    queueScene(g, 'fr_meet', { pid: p.id, name: p.name, where, v });
    return true;
  }
  // 낯선 고장이나 새 일터: 거기서 처음 보는 또래와 벗이 된다 (사람은 벗이 되기로 했을 때 만든다)
  if (!rng.chance(0.7)) return false;
  const sex = rng.chance(me(g).sex === 'm' ? 0.75 : 0.35) ? 'm' : 'f';
  const tmp = { name: rng.pick(sex === 'm' ? MALE_NAMES : FEMALE_NAMES), lastName: rng.pick(LAST_NAMES), traits: [rng.pick(TRAITS).id] };
  const job = where === 'war' ? 'guard' : where === 'school' ? 'apprentice' : where === 'work' ? (L(g).job?.id && JOBS[L(g).job.id] ? L(g).job.id : 'laborer') : rng.pick(['laborer', 'smith', 'carpenter', 'merchant', 'hunter', 'cook', 'weaver', 'miller']);
  const fresh = { sex, name: tmp.name, lastName: tmp.lastName, traits: tmp.traits, age: clamp(age + rng.int(-6, 6), 16, 90), job };
  queueScene(g, 'fr_meet', { pid: null, name: fresh.name, where, fresh, v });
  return true;
}

/* ---------- NPC끼리 ---------- */
function npcTick(g, rng) {
  const s = S(g);
  for (const x of s.npc) {
    if (x.end) continue;
    const a = byId(g, x.a); const b = byId(g, x.b);
    let end = null;
    if (!a?.alive || !b?.alive) end = 'death';
    else if (b.away || a.away || placeOf(a) !== placeOf(b)) end = 'moved';
    else if (rng.chance(has(a, 'greedy') || has(b, 'greedy') || has(a, 'drunkard') ? 0.006 : 0.002)) end = 'quarrel';
    if (!end) continue;
    x.end = end; x.endAt = mi(g);
    let [p, q] = [a, b];
    if (end === 'death' && !b?.alive && a?.alive) [p, q] = [a, b]; else if (end === 'death') [p, q] = [b, a];
    if (end === 'moved' && b?.away === false && a?.away) [p, q] = [b, a];
    if (p && q && (p.known || q.known) && (placeOf(p) === here(g) || rng.chance(0.3))) line(g, 'npc', T.NPC_END[end]({ a: p.name, b: q.name }));
  }
  if (rng.chance(0.1)) {
    const ppl = living(g).filter((p) => !p.isPlayer && ageYears(p) >= 16 && !s.npc.some((x) => !x.end && (x.a === p.id || x.b === p.id)));
    const a = rng.pick(ppl.length ? ppl : [null]);
    if (a) {
      const cands = ppl.filter((b) => b !== a && placeOf(b) === placeOf(a) && Math.abs(ageYears(b) - ageYears(a)) <= 12 && b.id !== a.spouseId
        && b.fatherId !== a.id && a.fatherId !== b.id && !(b.fatherId != null && b.fatherId === a.fatherId));
      const b = cands.length ? rng.pick(cands) : null;
      if (b) {
        s.npc.push({ a: a.id, b: b.id, place: placeOf(a), since: mi(g), end: null, endAt: null });
        if ((a.known || b.known) && placeOf(a) === here(g) && rng.chance(0.5)) line(g, 'npc', pickFresh(g, rng, 'nm', T.NPC_MAKE)({ a: a.name, b: b.name, place: placeName(placeOf(a)) }));
      }
    }
  }
  if (s.npc.length > 40) { const i = s.npc.findIndex((x) => x.end); s.npc.splice(i >= 0 ? i : 0, 1); }
}

/* ---------- 장면 ---------- */
defineScene('fr_meet', {
  title: () => '벗',
  text: (g, s) => { const list = T.MEET[s.where] ?? T.MEET.tavern; return list[(s.v ?? 0) % list.length]({ n: s.name }); },
  choices: () => [{ label: '마음을 연다', key: 'open' }, { label: '적당히 선을 긋는다', key: 'line' }],
  resolve(g, rng, s, key) {
    let p = s.pid != null ? byId(g, s.pid) : null;
    if (!p && s.fresh && key === 'open') {
      const c = s.fresh;
      p = makePerson(ownRng(g, 7), { sex: c.sex, ageMonths: c.age * 12 + 3, job: c.job, traits: c.traits });
      p.name = c.name; p.lastName = c.lastName; p.place = here(g); p.known = true; p.affection = 30;
      g.people.push(p);
    }
    if (key !== 'open') S(g).newAt = mi(g) + 18; // 선을 그었으면 한동안 새 벗 자리가 안 난다(한 삶에 스무 번 뜨던 것)
    if (!p && s.fresh) return `좋은 사람이다. 그래도 거기까지만 하기로 했다. ${J(s.name, '은/는')} 눈치를 챘는지 다음부터는 인사만 했다.`;
    if (!p?.alive) return '그 사람은 이제 여기 없다.';
    if (key === 'open') {
      addFriend(g, p, s.where, 30 + rng.int(0, 10)); aff(p, 8); stress(g, -6);
      remember(g, p, '처음으로 속 이야기를 나누었다', 1, { tag: 'friend' });
      log(g, `${J(p.name, '과/와')} 벗이 되었다.`); note(g, `${J(p.name, '과/와')} 벗이 되었다.`);
      return `헤어질 때 ${J(p.name, '이/가')} 어깨를 한 번 쳤다. "또 보자." 오랜만에 듣는 말이었다.`;
    }
    aff(p, 2);
    return `좋은 사람이다. 그래도 거기까지만 하기로 했다. ${J(p.name, '은/는')} 눈치를 챘는지 다음부터는 인사만 했다.`;
  },
});
defineScene('fr_drink', {
  title: () => '벗과 보내는 저녁',
  text: (g, s) => T.DRINK[s.v % T.DRINK.length]({ n: s.name }),
  choices: () => [{ label: '요즘 고민을 털어놓는다', key: 'mine' }, { label: `벗의 이야기를 듣는다`, key: 'his' }, { label: '일찍 일어선다', key: 'early' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.drink = mi(g);
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '약속한 자리에 아무도 오지 않았다.';
    if (key === 'mine') { stress(g, -12); f.depth = clamp(f.depth + 3, 0, 100); return `${J(p.name, '은/는')} 끝까지 듣고 해결책 대신 잔을 채워 주었다. 그걸로 됐다.`; }
    if (key === 'his') { f.depth = clamp(f.depth + 5, 0, 100); aff(p, 4); remember(g, p, '고민을 끝까지 들어 주었다', 1, { tag: 'friend' }); return `${p.name}에게도 말 못 한 일이 많았다. 오늘 그중 하나를 들었다. ${he(p)}가 다 말하고 나서 한숨을 길게 쉬었다.`; }
    stress(g, -3); return '내일 일이 있다며 먼저 일어섰다. 문을 나서며 돌아보니 벗이 혼자 남은 잔을 비우고 있었다.';
  },
});
defineScene('fr_reunion', {
  title: () => '다시 만난 벗',
  text: (g, s) => `${s.years}년 만이다. 장터 한복판에서 누가 내 이름을 불렀다. ${s.name}. 얼굴에 주름이 늘었고 목소리는 그대로였다. ${s.name}도 내 얼굴을 한참 들여다보았다.`,
  choices: () => [{ label: '끌어안는다', key: 'hug' }, { label: '어색하게 손을 잡는다', key: 'shy' }, { label: '그동안 왜 연락이 없었냐고 묻는다', key: 'ask' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '돌아보니 사람들 사이로 사라지고 없었다.';
    if (f.state === 'cold') f.state = 'close';
    if (key === 'hug') { f.depth = clamp(f.depth + 12, 0, 100); aff(p, 8); stress(g, -10); remember(g, p, `${s.years}년 만에 다시 만나 끌어안았다`, 1, { tag: 'reunion' }); return '둘 다 장터 한복판에서 한참을 그러고 서 있었다. 지나가던 사람들이 웃었다. 그날 밤 술집 문을 닫을 때까지 지난 세월을 서로 채워 넣었다.'; }
    if (key === 'shy') { f.depth = clamp(f.depth + 5, 0, 100); return '"잘 지냈어?" "그럭저럭." 그 말만 오가고도 한참 서 있었다. 다음 장날에 다시 보자고 했다. 그건 지킬 것 같다.'; }
    if (check(rng, g.player.stats.cha, 35)) { f.depth = clamp(f.depth + 8, 0, 100); return `${J(p.name, '이/가')} 쓴웃음을 지었다. "너도 안 했잖아." 맞는 말이다. 둘이 같이 웃었다. 그걸로 다 정리되었다.`; }
    f.depth = clamp(f.depth - 4, 0, 100); aff(p, -3); return `${J(p.name, '이/가')} 얼굴을 굳혔다. "사는 게 바빴다." 그 뒤로는 날씨 이야기만 했다.`;
  },
});
defineScene('fr_loan', {
  title: () => '꿔 달라는 돈',
  text: (g, s) => `${J(s.name, '이/가')} 해 질 녘에 찾아왔다. 한참 딴 이야기를 하다가 겨우 꺼냈다. ${s.why} 은화 ${s.amt}닢이면 된다고. 봄까지는 갚겠다고. 눈을 똑바로 보지 못했다.`,
  choices: (g, s) => [...(canSpend(g, s.amt) ? [{ label: `은화 ${s.amt}닢을 꿔 준다`, key: 'lend' }, { label: '갚지 않아도 된다며 그냥 준다', key: 'give' }] : []), { label: '형편이 안 된다고 한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.loan = mi(g);
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '그는 다시 오지 않았다.';
    if (key === 'lend' && spend(g, s.amt)) { f.debt = { kind: 'loan', amt: s.amt, at: mi(g), asked: false }; f.depth = clamp(f.depth + 4, 0, 100); log(g, `${p.name}에게 은화 ${s.amt}닢을 꿔 주었다.`); return `돈주머니를 받는 손이 떨렸다. "꼭 갚을게." 문을 나서며 몇 번이나 그 말을 했다.`; }
    if (key === 'give' && spend(g, s.amt)) { f.depth = clamp(f.depth + 10, 0, 100); aff(p, 10); deed(g, 'generous', 2, `벗 ${p.name}에게 돈을 그냥 주었다`); remember(g, p, '어려울 때 돈을 그냥 내주었다', 1, { tag: 'loan' }); return `${J(p.name, '은/는')} 한참 말이 없었다. 그러다 고개를 숙였다. 이 일은 둘 다 평생 잊지 않을 것이다.`; }
    f.depth = clamp(f.depth - 6, 0, 100); aff(p, -4); return `"그래, 그렇지. 괜히 말 꺼냈다." ${J(p.name, '이/가')} 웃으며 일어섰다. 웃는 얼굴이 아니었다.`;
  },
});
defineScene('fr_debt', {
  title: () => '갚지 않는 돈',
  text: (g, s) => `${J(s.name, '이/가')} 꿔 간 은화 ${s.amt}닢. 봄까지라던 게 세 해가 지났다. 그동안 ${s.name}네 집에 새 수레가 들어온 것을 보았다. 오늘 장터에서 마주쳤는데 먼저 눈을 피했다.`,
  choices: () => [{ label: '잊어버리기로 한다', key: 'forgive' }, { label: '조용히 찾아가 갚으라고 한다', key: 'ask' }, { label: '사람들 앞에서 따진다', key: 'shame' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f || !f.debt) return '이제 와서 받을 사람이 없다.';
    const amt = f.debt.amt; f.debt = null;
    if (key === 'forgive') { f.depth = clamp(f.depth - 3, 0, 100); deed(g, 'generous', 1, '벗이 갚지 않는 돈을 덮어 두었다'); return '돈은 잊기로 했다. 벗은 잊기 어렵다. 그 뒤로 술자리에서 그 사람이 먼저 잔을 사는 일이 늘었다.'; }
    if (key === 'ask') {
      if (check(rng, g.player.stats.cha + (has(p, 'greedy') ? -15 : 10), 40)) { g.player.money += Math.round(amt / 2); f.depth = clamp(f.depth - 2, 0, 100); return `${J(p.name, '은/는')} 얼굴이 빨개져서 반을 내놓았다. 나머지는 가을에 주겠다고 했다. 그 말은 이제 반만 믿는다.`; }
      f.depth = clamp(f.depth - 15, 0, 100); aff(p, -10); return `"지금 나를 빚쟁이 취급하는 거냐." 문이 닫혔다. 돈도, 벗도 그 문 안에 있다.`;
    }
    g.player.money += amt; f.state = 'broken'; aff(p, -30); addGrudge(g, p, 35, '사람들 앞에서 빚 독촉을 당했다', { formerFriend: true });
    log(g, `${p.name}에게서 빚을 받아 냈다. 사이는 끝났다.`); return `장터 사람들이 다 보는 앞이었다. ${J(p.name, '이/가')} 돈주머니를 땅에 내던졌다. 은화는 다 있었다. 그날 이후 ${he(p)}는 나를 모르는 사람처럼 대한다.`;
  },
});
defineScene('fr_surety', {
  title: () => '보증',
  text: (g, s) => `${J(s.name, '이/가')} 대금업자에게 은화 ${s.amt}닢을 빌려 ${s.why} 한다고. 대금업자가 보증인을 세우라 했단다. "네 이름이면 믿어 준대." 문서 끝에 빈칸이 하나 있다.`,
  choices: () => [{ label: '보증을 서 준다', key: 'sign' }, { label: '돈은 못 꿔 줘도 보증은 못 선다고 한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.surety = mi(g);
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '그 일은 없던 일이 되었다.';
    if (key === 'sign') { f.debt = { kind: 'surety', amt: s.amt, at: mi(g), asked: false }; f.depth = clamp(f.depth + 8, 0, 100); aff(p, 8); log(g, `${p.name}의 빚 은화 ${s.amt}닢에 보증을 섰다.`); return '빈칸에 이름을 적었다. 대금업자가 문서를 접어 품에 넣으며 웃었다. 벗은 내 손을 두 손으로 잡았다.'; }
    f.depth = clamp(f.depth - 5, 0, 100); return `${J(p.name, '은/는')} 고개를 끄덕였다. "그래, 너도 처자식이 있지." 이해한다는 말이 오히려 오래 남았다.`;
  },
});
defineScene('fr_surety_due', {
  title: () => '도망친 벗',
  text: (g, s) => `대금업자가 문 앞에 서 있다. ${J(s.name, '이/가')} 밤사이 식구를 데리고 사라졌다고 한다. 은화 ${s.amt}닢. 보증 문서 끝에 내 이름이 있다.`,
  choices: (g, s) => [...(canSpend(g, s.amt) ? [{ label: '내가 갚는다', key: 'pay' }] : []), { label: '나눠서 갚겠다고 사정한다', key: 'part' }, { label: '모르는 일이라고 버틴다', key: 'deny' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (f) { f.debt = null; f.state = 'broken'; }
    if (p) { p.away = true; aff(p, -10); }
    if (key === 'pay' && spend(g, s.amt)) { deed(g, 'honest', 3, '도망친 벗의 빚을 보증인으로서 갚았다'); stress(g, 10); log(g, `도망친 ${p?.name ?? '벗'}의 빚을 대신 갚았다.`); return '돈을 세어 주었다. 대금업자는 이런 일이 처음이 아니라는 얼굴이었다. 그 사람이 어디서 무얼 하는지는 모른다. 알고 싶지 않다고 생각하려 애쓴다.'; }
    if (key === 'part') { const half = Math.min(g.player.money, Math.round(s.amt / 2)); g.player.money -= half; stress(g, 14); deed(g, 'honest', 1, '보증 빚을 나눠 갚기로 했다'); return `가진 것을 털어 은화 ${half}닢을 내주었다. 나머지는 해마다 조금씩. 그 사람 이름이 나올 때마다 이 장부를 떠올리게 될 것이다.`; }
    deed(g, 'honest', -4, '보증을 서 놓고 모르는 일이라 버텼다'); stress(g, 8);
    if (check(rng, g.player.stats.wil + g.player.stats.cha / 2, 55)) return '모르는 일이라고 했다. 대금업자는 문서를 흔들며 관청에 가겠다고 했지만 다시 오지 않았다. 이웃들은 그 일을 다 알았다.';
    g.player.money = Math.max(0, g.player.money - Math.round(s.amt / 3)); return '버텼지만 대금업자가 경비대를 데리고 왔다. 집 안의 쓸 만한 것이 실려 나갔다.';
  },
});
defineScene('fr_wedding', {
  title: () => '벗의 혼례',
  text: (g, s) => `${J(s.name, '이/가')} ${s.sp ? `${J(s.sp, '과/와')} ` : ''}혼례를 올린다. 하객 자리 맨 앞줄에 내 이름이 적혀 있다. 신랑신부 앞에서 한마디 해 달라는 부탁도 받았다.`,
  choices: (g) => [{ label: '축사를 한다', key: 'speech' }, ...(canSpend(g, 20) ? [{ label: '은화 20닢어치 선물을 들고 간다', key: 'gift' }] : []), { label: '조용히 하객으로만 간다', key: 'quiet' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '혼례는 열리지 않았다.';
    if (key === 'speech') {
      if (check(rng, g.player.stats.cha + g.player.stats.int / 3, 40)) { f.depth = clamp(f.depth + 8, 0, 100); aff(p, 8); gainStat(g, 'cha', 0.3); remember(g, p, '혼례에서 축사를 해 주었다', 1, { tag: 'wed' }); return `어릴 적 일 하나를 꺼냈더니 하객들이 웃었다. 마지막 말에서 ${J(p.name, '이/가')} 고개를 숙이고 눈을 닦았다. 신부 쪽 어머니가 내 잔을 채워 주었다.`; }
      f.depth = clamp(f.depth + 3, 0, 100); return '준비한 말을 반쯤 잊었다. 그래도 끝까지 했다. 벗은 웃으며 박수를 쳤다. 그 박수가 제일 컸다.';
    }
    if (key === 'gift' && spend(g, 20)) { f.depth = clamp(f.depth + 5, 0, 100); aff(p, 6); return '좋은 구리 냄비 한 벌을 들고 갔다. 벗의 신부가 몇 번이고 고맙다고 했다. 그 냄비로 끓인 국을 언젠가 얻어먹게 될 것이다.'; }
    f.depth = clamp(f.depth + 2, 0, 100); return '뒷줄에 앉아 혼례를 보았다. 잔치가 끝날 무렵 벗이 술병을 들고 내 자리까지 찾아왔다.';
  },
});
defineScene('fr_funeral', {
  title: () => '벗의 장례',
  text: (g, s) => { const p = byId(g, s.pid); const kids = (p?.childIds ?? []).map((id) => byId(g, id)).filter((k) => k?.alive && ageYears(k) < 16); return `${s.name}의 장례. 관이 생각보다 작다. ${kids.length ? `어린 ${kids.length > 1 ? '아이들이' : '아이가'} 어미 치맛자락을 잡고 서 있다. ` : ''}누가 나를 보고 앞으로 나와 한마디 하라고 손짓했다.`; },
  choices: (g, s) => { const p = byId(g, s.pid); const kids = (p?.childIds ?? []).some((id) => { const k = byId(g, id); return k?.alive && ageYears(k) < 16; }); return [{ label: '벗을 위한 말을 한다', key: 'speak' }, ...(kids ? [{ label: '남은 식구를 돌보겠다고 약속한다', key: 'care' }] : []), { label: '뒤에서 조용히 보낸다', key: 'quiet' }]; },
  resolve(g, rng, s, key) {
    const st = S(g); const p = byId(g, s.pid);
    stress(g, 8);
    if (key === 'speak') { deed(g, 'loyal', 2, `벗 ${s.name}의 장례에서 말을 했다`); return '처음 만난 날 이야기를 했다. 거기까지만 하고 목이 메었다. 아무도 재촉하지 않았다.'; }
    if (key === 'care' && p) {
      const kid = (p.childIds ?? []).map((id) => byId(g, id)).filter((k) => k?.alive && ageYears(k) < 16).sort((a, b) => b.ageMonths - a.ageMonths)[0];
      if (kid) { rel(kid); kid.known = true; aff(kid, 25); remember(g, kid, '아버지의 벗이 우리 집을 돌봐 주었다', 1, { tag: 'fr_ward' }); st.legacy.push({ pid: kid.id, parent: s.name, asked: false }); }
      const sp = byId(g, p.spouseId ?? -1); if (sp) aff(sp, 15);
      deed(g, 'kind', 3, `죽은 벗의 식구를 돌보기로 했다`); log(g, `${s.name}의 남은 식구를 돌보기로 했다.`);
      return `"걱정 마라." 아이 머리에 손을 얹었다. 그 손이 무거웠다. 앞으로 명절마다 저 집 문을 두드리게 될 것이다.`;
    }
    return '맨 뒤에 서서 흙이 덮이는 소리를 들었다. 다들 돌아간 뒤에 무덤 앞에 술 한 잔을 부었다.';
  },
});
defineScene('fr_jealous', {
  title: () => '식어 가는 벗',
  text: (g, s) => `요즘 ${J(s.name, '이/가')} 나를 대하는 게 다르다. 술자리에서 내 이야기가 나오면 잔을 내려놓는다. 어제는 다른 사람들 앞에서 "요즘 형편 좋은 사람은 다르더라"고 했다. 웃으며 한 말이었다.`,
  choices: () => [{ label: '단둘이 만나 속을 터놓는다', key: 'talk' }, { label: '벗에게 좋은 일감을 나눠 준다', key: 'share' }, { label: '그냥 두기로 한다', key: 'leave' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '그럴 일도 없어졌다.';
    f.shown = true;
    if (key === 'talk') {
      if (check(rng, g.player.stats.cha + f.depth / 3, 50)) { f.jealous = clamp(f.jealous - 40, 0, 100); f.depth = clamp(f.depth + 4, 0, 100); return `한참 돌려 말하다 ${J(p.name, '이/가')} 결국 털어놓았다. "네가 잘되는 게 좋으면서도 싫다. 내가 못나서 그렇다." 그 말을 하고 나니 둘 다 조금 가벼워졌다.`; }
      f.jealous = clamp(f.jealous + 10, 0, 100); return `"내가 뭘 어쨌다고." ${J(p.name, '은/는')} 끝까지 아무 일도 없다고 했다. 그 말이 거짓인 걸 둘 다 안다.`;
    }
    if (key === 'share') { f.jealous = clamp(f.jealous - 25, 0, 100); p.wealth = (p.wealth ?? 0) + 20; aff(p, 6); return '아는 사람에게 벗을 소개해 일감을 이어 주었다. 벗은 고맙다고 했다. 얼굴 한쪽은 여전히 굳어 있었다. 받는 쪽도 쉽지 않은 법이다.'; }
    f.depth = clamp(f.depth - 6, 0, 100); return '모른 척하기로 했다. 시간이 해결해 줄 수도 있다. 아닐 수도 있다.';
  },
});
const BETRAY = [
  { why: '내 장사 장부를 경쟁 상회에 넘겼다', loss: 60 },
  { why: '내가 술자리에서 한 말을 영주의 사람에게 옮겼다', loss: 0 },
  { why: '내 집안 부끄러운 일을 장터에 퍼뜨렸다', loss: 0 },
  { why: '내 일자리를 가로채려고 주인에게 나를 헐뜯었다', loss: 20 },
];
defineScene('fr_betray', {
  title: () => '등 뒤의 칼',
  text: (g, s) => `알게 되었다. ${J(s.name, '이/가')} ${BETRAY[s.v].why}. 전해 준 사람은 거짓말할 까닭이 없는 사람이다. 지난 장날에도 같이 마셨다.`,
  choices: () => [{ label: '찾아가 따진다', key: 'face' }, { label: '용서한다. 한 번은', key: 'forgive' }, { label: '아무 말 없이 연을 끊는다', key: 'cut' }],
  resolve(g, rng, s, key) {
    const st = S(g); const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '이제 와서 따질 사람이 없다.';
    const b = BETRAY[s.v];
    if (b.loss) g.player.money = Math.max(0, g.player.money - b.loss);
    if (b.loss === 0 && s.v === 2) { L(g).renown = Math.max(0, (L(g).renown ?? 0) - 2); }
    f.betrayedAt = mi(g); f.jealous = 0;
    if (key === 'forgive') { f.depth = clamp(f.depth - 20, 0, 100); f.forgiven = true; deed(g, 'kind', 2, '등 돌린 벗을 용서했다'); stress(g, 8); return `"한 번이다." 그렇게만 말했다. ${J(p.name, '은/는')} 고개를 들지 못했다. 다음 장날에도 같이 마셨다. 예전 같지는 않았다.`; }
    f.state = 'broken'; aff(p, -25); addGrudge(g, p, key === 'face' ? 30 : 15, '벗이었던 사람에게 배신을 들켰다', { formerFriend: true });
    log(g, `${J(p.name, '이/가')} ${b.why}. 연을 끊었다.`); note(g, `벗이었던 ${J(p.name, '이/가')} 등을 돌렸다.`);
    if (key === 'face') { stress(g, 6); return `${p.name}네 문을 두드렸다. 변명은 길었다. 결국 ${J(p.name, '이/가')} 소리쳤다. "너만 늘 잘됐잖아!" 그 말에 더 할 말이 없어졌다.`; }
    stress(g, 10); return '아무 말도 하지 않았다. 다음 장날부터 그 술집에 가지 않았다. 벗이 몇 번 찾아왔지만 문을 열지 않았다.';
  },
});
defineScene('fr_forgive', {
  title: () => '늦은 사과',
  text: (g, s) => `${s.years}년 만에 ${J(s.name, '이/가')} 우리 집 문 앞에 섰다. 머리가 희끗하다. "그때 일, 사과하러 왔다. 받아 주지 않아도 된다. 말은 하고 죽어야겠어서."`,
  choices: () => [{ label: '들어오라고 한다', key: 'yes' }, { label: '사과는 받되 문은 닫는다', key: 'half' }, { label: '돌아가라고 한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '문을 열었을 때는 아무도 없었다.';
    f.forgiven = key !== 'no';
    if (key === 'yes') { f.state = 'close'; f.depth = 30; aff(p, 25); deed(g, 'kind', 3, '오래전 등 돌린 벗을 다시 받아들였다'); stress(g, -10); log(g, `${J(p.name, '과/와')} 다시 벗이 되었다.`); return '부엌에서 말없이 술을 꺼냈다. 그날 밤 그때 이야기는 한 마디도 하지 않았다. 할 필요가 없었다.'; }
    if (key === 'half') { aff(p, 10); stress(g, -4); return '"알았다." 그렇게만 말했다. 벗은 고개를 숙이고 돌아갔다. 등이 예전보다 굽어 있었다.'; }
    aff(p, -5); return '문을 닫았다. 창밖으로 그 사람이 한참 서 있다가 가는 것을 보았다.';
  },
});
defineScene('fr_old', {
  title: () => '남은 벗',
  text: (g, s) => `${J(s.name, '과/와')} 성당 앞 돌계단에 앉아 해를 쬐었다. 둘이 아는 사람 이름을 하나씩 대 보았다. ${s.lost ? `먼저 간 사람이 ${s.lost}명이다. ` : ''}"이제 우리 둘 남았나." ${J(s.name, '이/가')} 웃었다.`,
  choices: () => [{ label: '젊을 때 일을 꺼낸다', key: 'past' }, { label: '누가 먼저 갈지 내기를 건다', key: 'bet' }, { label: '말없이 해만 쬔다', key: 'sun' }],
  resolve(g, rng, s, key) {
    const st = S(g); st.done.old = mi(g);
    const p = byId(g, s.pid); const f = fOf(g, s.pid);
    if (!p?.alive || !f) return '계단에는 나 혼자였다.';
    f.depth = clamp(f.depth + 5, 0, 100); stress(g, -10);
    if (key === 'past') { remember(g, p, '늙어서 젊을 때 이야기를 함께 했다', 1, { tag: 'old' }); return '둘의 기억이 또 달랐다. 이번에는 누구 말이 맞는지 따지지 않았다. 둘 다 맞기로 했다.'; }
    if (key === 'bet') return `"진 사람이 장례 술값 내는 거다." "죽은 사람이 어떻게 내냐." 둘이 한참 웃었다. 지나가던 아이들이 이상하게 쳐다보았다.`;
    return '해가 지붕 뒤로 넘어갈 때까지 앉아 있었다. 둘 다 아무 말도 하지 않았다. 그래도 하루를 같이 보냈다.';
  },
});
defineScene('fr_elder', {
  title: () => '선대의 벗',
  text: (g, s) => `낯선 노인이 찾아왔다. "${s.from}의 자식이지? 네 부모와 서른 해를 같이 마셨다. ${s.name}${hasBatchim(s.name) ? '이라고' : '라고'} 하면 알 거다." 손이 거칠고 눈이 맑았다.`,
  choices: () => [{ label: '부모님 젊을 때 이야기를 청한다', key: 'story' }, { label: '어려운 일이 있으면 도와 달라고 한다', key: 'help' }, { label: '정중히 인사하고 돌려보낸다', key: 'bye' }],
  resolve(g, rng, s, key) {
    const st = S(g); const e = st.elders.find((x) => x.pid === s.pid); if (e) e.met = mi(g);
    const p = byId(g, s.pid);
    if (!p?.alive) return '노인은 다시 오지 않았다.';
    rel(p); p.known = true;
    if (key === 'story') { aff(p, 12); remember(g, p, '옛 벗의 자식에게 옛이야기를 들려주었다', 1, { tag: 'elder' }); return `${J(s.from, '이/가')} 젊을 때 무슨 짓을 했는지 들었다. 집에서는 한 번도 듣지 못한 이야기다. 노인은 가면서 "많이 닮았다"고 했다.`; }
    if (key === 'help') { const n = clamp(Math.round((p.wealth ?? 20) / 2), 10, 60); g.player.money += n; aff(p, 4); return `노인은 말없이 은화 ${n}닢을 내려놓았다. "네 부모한테 받은 게 더 많다." 갚을 필요 없다는 말은 하지 않았다. 그래도 받지 않을 수 없었다.`; }
    return '노인은 고개를 끄덕이고 돌아갔다. 문간에서 한 번 뒤돌아보았다.';
  },
});
defineScene('fr_legacy', {
  title: () => '대를 이은 벗',
  text: (g, s) => `${J(s.name, '이/가')} 찾아왔다. ${s.parent}의 자식이다. 우리 부모와 그 부모가 벗이었다는 건 둘 다 어릴 때부터 들었다. "아버지가 너희 집 이야기를 자주 했다. 한번 제대로 마셔 보고 싶었어."`,
  choices: () => [{ label: '술상을 차린다', key: 'yes' }, { label: '부모 대의 일은 부모 대의 일이라고 한다', key: 'no' }],
  resolve(g, rng, s, key) {
    const st = S(g); const x = st.legacy.find((y) => y.pid === s.pid); if (x) x.asked = true;
    const p = byId(g, s.pid);
    if (!p?.alive) return '그 사람은 오지 않았다.';
    if (key === 'yes') { p.known = true; addFriend(g, p, 'legacy', 40); aff(p, 10); log(g, `부모 대의 벗의 자식 ${J(p.name, '과/와')} 벗이 되었다.`); return '부모들 이야기로 시작해서 우리 이야기로 끝났다. 어느새 그 집 부모와 우리 부모가 앉던 자리에 앉아 있었다.'; }
    aff(p, -3); return `${J(p.name, '은/는')} 웃으며 고개를 끄덕였다. "그래, 그것도 맞다." 가는 길에 우리 집 담장을 한 번 쓰다듬었다.`;
  },
});

/* ---------- 장면 고르기 ---------- */
function playerTick(g, rng) {
  const s = S(g);
  const now = mi(g);
  // 다른 장면이 둘 넘게 기다리면 끼어들지 않는다 (떠 있는 사건까지 기다리면 어른 삶에선 거의 늘 막혀 벗 장면이 굶는다, 37단계)
  if (!free(g) || now - s.sceneAt < 6 || L(g).queue.length >= 2) return;
  const q = (kind, data) => { queueScene(g, kind, data); s.sceneAt = now; return true; };
  const age = playerAge(g);
  // 선대의 벗, 대를 이은 벗
  for (const e of s.elders) { const p = byId(g, e.pid); if (!e.met && p?.alive && nearMe(g, p) && rng.chance(0.12)) return q('fr_elder', { pid: p.id, name: p.name, from: e.from }); }
  for (const x of s.legacy) { const p = byId(g, x.pid); if (!x.asked && p?.alive && ageYears(p) >= 16 && age >= 16 && nearMe(g, p) && !fOf(g, p.id) && rng.chance(0.06)) return q('fr_legacy', { pid: p.id, name: p.name, parent: x.parent }); }
  const near = s.list.filter((f) => { const p = byId(g, f.pid); return nearMe(g, p); });
  // 배신과 사과
  for (const f of near) {
    const p = byId(g, f.pid);
    if (f.state === 'broken' && f.betrayedAt != null && f.forgiven == null && now - f.betrayedAt >= 60 && rng.chance(0.05)) return q('fr_forgive', { pid: p.id, name: p.name, years: Math.floor((now - f.betrayedAt) / 12) });
    if (f.state !== 'close') continue;
    if (f.betrayedAt == null && (f.jealous >= 70 || (has(p, 'greedy') && has(p, 'cruel') && f.depth < 40 && f.jealous >= 30)) && rng.chance(0.1)) return q('fr_betray', { pid: p.id, name: p.name, v: rng.int(0, BETRAY.length - 1) });
    if (!f.shown && f.jealous >= 40 && rng.chance(0.15)) return q('fr_jealous', { pid: p.id, name: p.name });
  }
  const close = near.filter((f) => f.state === 'close');
  if (!close.length) return;
  const f = rng.pick(close); const p = byId(g, f.pid);
  const d = s.done;
  if (age >= 60 && ageYears(p) >= 55 && f.depth >= 35 && (!d.old || now - d.old >= 96) && rng.chance(0.08)) return q('fr_old', { pid: p.id, name: p.name, lost: s.lost });
  if (f.debt?.asked && f.debt.kind === 'loan' && rng.chance(0.3)) return q('fr_debt', { pid: p.id, name: p.name, amt: f.debt.amt });
  if (f.debt?.asked && f.debt.kind === 'surety') return q('fr_surety_due', { pid: p.id, name: p.name, amt: f.debt.amt });
  if (!f.debt && f.depth >= 35 && g.player.money >= 80 && (!d.loan || now - d.loan >= 48) && rng.chance(0.04)) {
    const why = rng.pick(['집 지붕이 내려앉았다고.', '아이가 아파 약값이 든다고.', '장사 밑천이 떨어졌다고.', '세금을 못 내면 땅을 잃는다고.']);
    return q('fr_loan', { pid: p.id, name: p.name, amt: clamp(Math.round(g.player.money * 0.2 / 5) * 5, 20, 150), why });
  }
  if (!f.debt && f.depth >= 45 && ((L(g).renown ?? 0) >= 10 || g.player.money >= 150) && (!d.surety || now - d.surety >= 96) && rng.chance(0.02)) {
    const why = rng.pick(['방앗간을 사려', '배 한 척을 사려', '가게를 넓히려', '밭 한 뙈기를 더 사려']);
    return q('fr_surety', { pid: p.id, name: p.name, amt: rng.pick([100, 150, 200, 300]), why });
  }
  if ((!d.drink || now - d.drink >= 24) && rng.chance(0.04)) return q('fr_drink', { pid: p.id, name: p.name, v: rng.int(0, 99) });
}

/* ---------- 줄 ---------- */
function lineTick(g, rng) {
  const s = S(g);
  const now = mi(g);
  // 먼 벗의 소식
  if (now - s.farAt >= 18 && rng.chance(0.06)) {
    const far = s.list.filter((f) => { const p = byId(g, f.pid); return f.state === 'close' && p?.alive && (p.away || placeOf(p) !== here(g)) && f.depth >= 25; });
    if (far.length) { const f = rng.pick(far); const p = byId(g, f.pid); s.farAt = now; line(g, 'far', pickFresh(g, rng, 'far', T.FAR_NEWS)({ n: p.name, place: placeName(placeOf(p)) }), p.id); }
  }
  // 내 아이와 벗의 아이
  if (rng.chance(0.04)) {
    const myKids = (me(g).childIds ?? []).map((id) => byId(g, id)).filter((k) => k?.alive && !k.away && ageYears(k) >= 5 && ageYears(k) <= 14);
    for (const f of s.list) {
      if (f.state !== 'close' || now - f.kidsAt < 60) continue;
      const p = byId(g, f.pid); if (!nearMe(g, p)) continue;
      const theirs = (p.childIds ?? []).map((id) => byId(g, id)).filter((k) => k?.alive && !k.away && ageYears(k) >= 5 && ageYears(k) <= 14);
      const pair = myKids.flatMap((a) => theirs.filter((b) => Math.abs(ageYears(a) - ageYears(b)) <= 3).map((b) => [a, b]))[0];
      if (!pair) continue;
      f.kidsAt = now; const [a, b] = pair; rel(b); b.known = true; aff(b, 5);
      line(g, 'kids', pickFresh(g, rng, 'kd', T.KIDS)({ kid: a.name, fk: b.name, n: p.name }), p.id);
      break;
    }
  }
}

function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over) return;
  const rng = ownRng(g, 17);
  npcTick(g, ownRng(g, 41));
  if (playerAge(g) < 12) return;
  friendTick(g, rng);
  if (makeTick(g, ownRng(g, 23))) s.sceneAt = mi(g);
  else playerTick(g, ownRng(g, 31));
  lineTick(g, ownRng(g, 53));
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.friends = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g, rng, old) => {
  const s = S(g);
  const from = old?.name ?? '선대';
  const keep = s.list.filter((f) => (f.state === 'close') && byId(g, f.pid)?.alive && f.depth >= 25);
  for (const f of keep) if (!s.elders.some((e) => e.pid === f.pid)) s.elders.push({ pid: f.pid, from, at: mi(g), met: null });
  // 선대 벗의 자식: 새 머리와 나이가 비슷하면 대를 이은 벗이 될 수 있다
  const heirAge = ageYears(me(g));
  for (const f of s.list) {
    const p = byId(g, f.pid); if (!p || f.state === 'broken' || f.depth < 25) continue;
    for (const k of (p.childIds ?? []).map((id) => byId(g, id))) if (k?.alive && Math.abs(ageYears(k) - heirAge) <= 8 && !s.legacy.some((x) => x.pid === k.id)) s.legacy.push({ pid: k.id, parent: p.name, asked: false });
  }
  if (s.elders.length > 8) s.elders.splice(0, s.elders.length - 8);
  if (s.legacy.length > 8) s.legacy.splice(0, s.legacy.length - 8);
  s.list = []; s.done = {}; s.sceneAt = mi(g); s.newAt = -99; s.lost = 0; s.gen += 1;
});

/* ---------- 화면 연결점 ---------- */
export function friendsLines(g) { return (g.friends?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function friendsLine(g) { return friendsLines(g)[0]?.text ?? null; }
export function friendsInfo(g) {
  const s = S(g);
  const now = mi(g);
  const one = (f) => {
    const p = byId(g, f.pid);
    return {
      id: f.pid, name: p?.name ?? '누군가', where: T.WHERE[f.where]?.name ?? '벗', since: Math.floor((now - f.since) / 12),
      depth: Math.round(f.depth), word: stateWord[f.state] ?? depthWord(f.depth), state: f.state,
      place: p?.alive ? placeName(placeOf(p)) : null, job: p?.alive ? jobWord(p) : null,
      apart: f.state === 'close' && now - f.lastMet > 24 ? Math.floor((now - f.lastMet) / 12) : 0,
      debt: f.debt ? { kind: f.debt.kind === 'loan' ? '꿔 준 돈' : '보증', amt: f.debt.amt } : null,
    };
  };
  const order = { close: 0, cold: 1, broken: 2, dead: 3, sworn: 4 };
  return {
    friends: s.list.filter((f) => f.state === 'close').sort((a, b) => b.depth - a.depth).map(one),
    past: s.list.filter((f) => f.state !== 'close').sort((a, b) => order[a.state] - order[b.state]).slice(0, 8).map(one),
    elders: s.elders.filter((e) => byId(g, e.pid)?.alive).map((e) => ({ name: byId(g, e.pid).name, from: e.from })),
    lost: s.lost,
    npc: s.npc.filter((x) => !x.end && (byId(g, x.a)?.known || byId(g, x.b)?.known)).slice(-5).map((x) => ({ a: byId(g, x.a)?.name ?? '', b: byId(g, x.b)?.name ?? '', place: placeName(x.place) })),
    log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
