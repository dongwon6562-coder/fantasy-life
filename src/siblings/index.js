// 31단계: 형제자매. 상태는 g.siblings 하나, 화면 연결점은 siblingLines(g) / siblingLine(g) / siblingsInfo(g).
// 내 형제자매는 같은 부모의 다른 자식들이다(처음 주인이든 대를 이은 자식이든). 형제와의 정은 relations의 호감(affection), 겨루는 마음은 rivalry를 그대로 쓴다.
// - 함께 자라기(내가 16살 아래): 달마다 가끔 한 줄(물려받은 옷, 몰래 나눈 과자, 천둥 치는 밤, 아버지의 칭찬), 가끔 장면.
//   장면: 깨진 항아리 뒤집어쓰기(sib_blame), 맏이와 막내의 몫(sib_share), 괴롭힘당하는 형제(sib_protect), 저녁상의 비교(sib_rival).
// - 갈라지는 길: 형제가 일을 시작하고, 떠나고, 혼인하고(사돈 집안), 아이를 낳고(조카), 살림이 피거나 기울고, 죽는다. 그때마다 한 줄.
//   플레이어 없이도: 해마다 한 번 형제마다 형편이 바뀐다(빚, 뜻밖의 벌이, 다침). 멀리 사는 형제는 가끔 소식이 온다.
// - 장면(어른): 형제의 혼례 비용(sib_wedding), 곤경에 빠진 형제의 부탁(sib_plea), 부모가 남긴 것 나누기(sib_estate, 부모가 NPC일 때),
//   늙은 부모의 가업을 누가 잇나(sib_trade), 사이가 틀어진 형제의 배신(sib_betray), 부모 잃은 조카 거두기(sib_orphan), 조카의 견습 부탁(sib_nephew).
// - 형제의 희생: 정이 깊은 형제는 내가 바닥일 때 돈을 보내고, 앓을 때 곁에 있고, 욕을 먹을 때 편을 든다.
// - 대를 이은 뒤: 옛 주인의 형제는 이제 새 주인의 큰아버지·작은아버지·고모·외삼촌·이모다. 돕거나(help) 집안 자리를 넘본다(covet, sib_uncle).
// kin(내 자식들, 내가 죽은 뒤 유산 다툼)·heir(누가 잇나)·feud(원한)·lineage(분가)와 겹치지 않게: 읽고, 호감과 돈만 민다. 원수가 되면 feud에 넘긴다.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, monthInfo } from '../game.js';
import { byId, ageYears, living } from '../npc.js';
import { JOBS } from '../data.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, stress, tired, spend, canSpend, check } from '../adventure/core.js';
import { jobDef } from '../jobs.js';
import { rel, remember } from '../relations.js';
import { isJailed } from '../crime.js';
import { addGrudge } from '../feud/index.js';
import { makeRng } from '../rng.js';
import * as T from './lines.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeOf = (p) => p.place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '먼 곳';
const jobWord = (id) => (id && id !== 'child' && id !== 'idle' ? JOBS[id]?.name ?? null : null);
const has = (p, t) => !!p?.traits?.includes?.(t);
// 이 갈래는 게임의 난수 흐름을 건드리지 않는다 (다른 갈래의 시드 고정 점검이 흔들리지 않게)
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 157) ^ Math.imul(mi(g) * 151 + salt + 29, 2654435761)) | 0 });
const aff = (p, n) => { rel(p); p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
const riv = (p, n) => { rel(p); p.rivalry = clamp((p.rivalry ?? 0) + n, 0, 100); };
const NUM = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟'];

/* ---------- 상태 ---------- */
export function siblingsState(g) {
  g.siblings ??= {};
  const s = g.siblings;
  s.seen ??= {};      // 형제 id → { j, sp, k, away, pl, alive, w }
  s.month ??= [];     // 이번 달 줄 [{ kind, id, name, text }]
  s.log ??= [];       // [{ y, m, text }]
  s.used ??= [];      // 최근에 쓴 글 열쇠
  s.sceneAt ??= 0;    // 마지막 장면
  s.childAt ??= {};   // 어린 시절 장면 종류 → 마지막 달
  s.fortune ??= {};   // 형제 id → { trouble, at }
  s.farAt ??= {};     // 형제 id → 마지막 소식
  s.giveAt ??= {};    // 형제 id → 마지막으로 나를 도운 달
  s.betrayed ??= [];  // 배신 장면이 나온 형제
  s.estates ??= [];   // 나눔이 끝난 부모 id
  s.trade ??= {};     // 부모 id → 'me' | 형제 id | 'both' | 'asked'
  s.wards ??= [];     // 거둔 조카 id
  s.nephewAsk ??= []; // 견습을 부탁한 조카
  s.uncles ??= {};    // id → { word, stance, at, done, helpAt }
  s.gen ??= 0;
  s.toldWed ??= [];
  s.farUsed ??= {};  // 형제 id → 쓴 소식 앞 문장 // 혼인 소식을 전한 먼 형제
  return s;
}
const S = siblingsState;

/* ---------- 누가 내 형제인가 ---------- */
export function siblingsOf(g, { all = false } = {}) {
  const m = me(g);
  if (!m) return [];
  const ids = new Set();
  for (const pid of [m.fatherId, m.motherId]) { const par = byId(g, pid); for (const id of par?.childIds ?? []) ids.add(id); }
  for (const id of g.player.familyIds ?? []) { const p = byId(g, id); if (p && ((p.fatherId && p.fatherId === m.fatherId) || (p.motherId && p.motherId === m.motherId))) ids.add(id); }
  ids.delete(m.id);
  return [...ids].map((id) => byId(g, id)).filter((p) => p && !p.isPlayer && (all || p.alive));
}
// 부르는 말: 나보다 위면 형·오빠·누나·언니, 아래면 동생
export function sibWord(g, p) {
  const m = me(g);
  const older = p.ageMonths > m.ageMonths;
  if (older) return p.sex === 'm' ? (m.sex === 'm' ? '형' : '오빠') : (m.sex === 'm' ? '누나' : '언니');
  return p.sex === 'm' ? '남동생' : '여동생';
}
const callWord = (g, p) => { const w = sibWord(g, p); return w.endsWith('동생') ? '동생' : w; };
const ws = (g, p) => `${callWord(g, p)} ${p.name}`;
function ctx(g, p, extra = {}) {
  rel(p);
  const m = me(g);
  const season = monthInfo(g).season;
  return {
    s: p.name, w: callWord(g, p), ws: ws(g, p), n: g.player.name,
    older: p.ageMonths > m.ageMonths, younger: p.ageMonths < m.ageMonths,
    warm: p.affection >= 40, sour: p.affection < 10, rival: p.rivalry >= 35,
    myAge: playerAge(g), sibAge: ageYears(p), winter: season === '겨울', summer: season === '여름', famine: !!g.world?.famine,
    job: jobWord(p.job) ?? '',
    ...extra,
  };
}
const eldestOf = (g, list) => list.slice().sort((a, b) => b.ageMonths - a.ageMonths)[0];
const amEldest = (g) => { const sibs = siblingsOf(g); const m = me(g); return sibs.every((s) => s.ageMonths <= m.ageMonths); };

/* ---------- 화면용 ---------- */
export function siblingLines(g) {
  const s = g?.siblings;
  if (!s?.month?.length) return [];
  return s.month.map((x) => ({ text: x.text, id: x.id ?? null, name: x.name ?? null, kind: x.kind, form: x.form }));
}
export function siblingLine(g) {
  const l = siblingLines(g);
  return l.length ? l.map((x) => x.text).join(' ') : null;
}
function bondWord(p) {
  rel(p);
  if (p.bond === 'enemy' || p.affection <= -40) return '원수가 된 사이';
  if (p.affection >= 70) return '목숨도 내줄 사이';
  if (p.rivalry >= 45) return p.affection >= 30 ? '아끼면서도 겨루는 사이' : '늘 겨루는 사이';
  if (p.affection >= 40) return '살가운 사이';
  if (p.affection >= 10) return '그럭저럭';
  if (p.affection > -15) return '데면데면한 사이';
  return '등 돌린 사이';
}
export function siblingsInfo(g) {
  const st = S(g);
  const list = siblingsOf(g, { all: true }).sort((a, b) => b.ageMonths - a.ageMonths).map((p) => ({
    id: p.id, name: p.name, word: sibWord(g, p), age: ageYears(p), alive: !!p.alive,
    job: jobWord(p.job), place: p.away ? '먼 곳' : placeName(placeOf(p)), here: !p.away && placeOf(p) === here(g),
    spouse: p.spouseId ? byId(g, p.spouseId)?.name ?? null : null,
    kids: (p.childIds ?? []).map((id) => byId(g, id)).filter((k) => k?.alive).map((k) => k.name),
    bond: bondWord(p), trouble: !!st.fortune[p.id]?.trouble,
  }));
  const uncles = Object.entries(st.uncles).map(([id, u]) => { const p = byId(g, Number(id)); return p && p.alive ? { id: p.id, name: p.name, word: u.word, stance: u.stance === 'covet' ? '집안 자리를 넘본다' : u.stance === 'help' ? '뒤를 봐준다' : '멀찍이 지켜본다' } : null; }).filter(Boolean);
  return { siblings: list, uncles, wards: st.wards.map((id) => byId(g, id)?.name).filter(Boolean), recent: st.log.slice(-8).reverse() };
}

/* ---------- 글 고르기 ---------- */
function pick(g, rng, list, key, c) {
  const st = S(g);
  const ok = list.map((x, i) => ({ x, i })).filter(({ x }) => typeof x === 'function' || !x.when || x.when(c));
  if (!ok.length) return null;
  const fresh = ok.filter(({ i }) => !st.used.includes(`${key}${i}`));
  const from = fresh.length ? fresh : ok;
  const { x, i } = rng.pick(from);
  st.used.push(`${key}${i}`); if (st.used.length > 40) st.used.shift();
  const f = typeof x === 'function' ? x : x.t;
  const out = f(c);
  return Array.isArray(out) ? rng.pick(out) : out;
}
function push(g, out, kind, p, text) {
  if (!text) return;
  out.push({ kind, id: p?.id ?? null, name: p?.name ?? null, text });
}

/* ---------- 달마다 ---------- */
const snap = (g, p) => ({ j: p.job, sp: p.spouseId ?? null, spa: !!(p.spouseId && byId(g, p.spouseId)?.alive), k: p.childIds?.length ?? 0, away: !!p.away, pl: placeOf(p), alive: !!p.alive, w: Math.round(p.wealth ?? 0) });
function turns(g, rng, sibs, out) {
  const st = S(g);
  for (const p of siblingsOf(g, { all: true })) {
    const old = st.seen[p.id];
    const cur = snap(g, p);
    st.seen[p.id] = cur;
    if (!old) continue;
    const c = ctx(g, p);
    if (old.alive && !cur.alive) {
      push(g, out, 'died', p, playerAge(g) < 10 ? T.TURN.diedKid(c) : rng.pick(T.TURN.died(c)));
      stress(g, p.affection >= 40 ? 12 : 5);
      note(g, `${sibWord(g, p)} ${J(p.name, '이/가')} 세상을 떠났다.`);
      // 남은 아이들이 고아가 되면
      const orphans = (p.childIds ?? []).map((id) => byId(g, id)).filter((k) => k?.alive && ageYears(k) < 15 && !byId(g, p.spouseId)?.alive);
      if (orphans.length && playerAge(g) >= 18) queueScene(g, 'sib_orphan', { sib: p.id, kids: orphans.map((k) => k.id) }, { first: true });
      continue;
    }
    if (!cur.alive) continue;
    if (old.j === 'child' && cur.j !== 'child' && jobWord(cur.j)) push(g, out, 'job', p, rng.pick(T.TURN.job({ ...c, job: jobWord(cur.j) })));
    if (!old.away && cur.away) push(g, out, 'left', p, rng.pick(T.TURN.left(c)));
    if (cur.sp && cur.sp !== old.sp) {
      const mate = byId(g, cur.sp);
      if (mate) {
        push(g, out, 'wed', p, rng.pick(T.TURN.wed({ ...c, mate: mate.name, mateHouse: mate.fatherId ? byId(g, mate.fatherId)?.lastName ?? mate.lastName : mate.lastName })));
        if (playerAge(g) >= 16 && !p.away && placeOf(p) === here(g) && !sceneQueued(g, 'sib_wedding')) queueScene(g, 'sib_wedding', { sib: p.id, mate: mate.id });
      }
    } else if (old.sp && old.spa && !cur.spa) push(g, out, 'widow', p, rng.pick(T.TURN.widow(c)));
    if (cur.k > old.k) {
      const baby = byId(g, p.childIds[p.childIds.length - 1]);
      if (baby) push(g, out, 'baby', p, rng.pick(T.TURN.baby({ ...c, baby: baby.name, babyWord: baby.sex === 'm' ? '아들' : '딸' })));
    }
    // 조카가 열다섯이 되면
    for (const kid of (p.childIds ?? []).map((id) => byId(g, id))) {
      if (kid?.alive && kid.ageMonths === 15 * 12 && playerAge(g) >= 25) push(g, out, 'nephew', p, rng.pick(T.TURN.grownNephew({ ...c, nephew: kid.name })));
    }
  }
}
function growing(g, rng, sibs, out) {
  if (playerAge(g) < 5 || playerAge(g) >= 16 || !rng.chance(0.22)) return;
  const home = sibs.filter((p) => !p.away && placeOf(p) === here(g) && ageYears(p) >= 3 && ageYears(p) <= 20);
  if (!home.length) return;
  const p = rng.pick(home);
  push(g, out, 'grow', p, pick(g, rng, T.GROW, 'gr', ctx(g, p)));
}
// 해마다 한 번, 어른 형제의 형편이 바뀐다 (플레이어 없이도)
function fortunes(g, rng, sibs, out) {
  const st = S(g);
  for (const p of sibs) {
    if (ageYears(p) < 18 || g.date.month !== (p.id % 12) + 1) continue;
    const f = st.fortune[p.id] ??= { trouble: null, at: 0 };
    if (f.trouble && mi(g) - f.at > 24) f.trouble = null;
    const r = rng.next();
    const c = ctx(g, p);
    const near = !p.away && placeOf(p) === here(g);
    if (r < 0.07 && !f.trouble) {
      f.trouble = rng.pick(['debt', 'debt', 'sick', 'fire']); f.at = mi(g);
      if (f.trouble === 'debt') p.wealth = (p.wealth ?? 0) - 40;
      if (f.trouble === 'sick') p.health = Math.max(15, (p.health ?? 80) - 35);
      if (near) push(g, out, 'trouble', p, rng.pick(T.TURN[f.trouble === 'debt' ? 'poor' : f.trouble](c)));
    } else if (r < 0.13) {
      p.wealth = (p.wealth ?? 0) + 45;
      if (near) push(g, out, 'rich', p, rng.pick(T.TURN.rich(c)));
    }
  }
}
function farNews(g, rng, sibs, out) {
  const st = S(g);
  if (playerAge(g) < 12) return;
  const far = sibs.filter((p) => ageYears(p) >= 16 && (p.away || placeOf(p) !== here(g)) && mi(g) - (st.farAt[p.id] ?? -99) >= 14);
  if (!far.length || !rng.chance(0.18)) return;
  const p = rng.pick(far);
  st.farAt[p.id] = mi(g);
  const mate = p.spouseId ? byId(g, p.spouseId) : null;
  const kids = (p.childIds ?? []).filter((id) => byId(g, id)?.alive).length;
  const f = st.fortune[p.id];
  const c = ctx(g, p, { far: p.away ? '먼 도시' : placeName(placeOf(p)), mate: mate?.name ?? '', kids: NUM[clamp(kids, 0, 8)] });
  const kind = f?.trouble === 'sick' ? 'sick' : f?.trouble ? 'poor' : (p.wealth ?? 0) > 120 ? 'rich' : mate && !st.toldWed.includes(p.id) ? 'wed' : kids ? 'kids' : rng.chance(0.5) ? 'miss' : 'plain';
  if (kind === 'wed') st.toldWed.push(p.id);
  c.news = T.FAR_NEWS[kind](c);
  c.gift = rng.pick(T.FAR_GIFT); c.back = rng.pick(T.FAR_BACK);
  // 같은 형제에게는 같은 앞 문장이 다시 나오지 않게 (다 나오면 처음부터)
  // 가장 최근에 쓴 다섯 앞 문장은 피한다 (일곱 가지가 돌아가며 나온다)
  const usedF = (st.farUsed[p.id] ??= []);
  const opts = T.FAR.map((f, i) => i).filter((i) => !usedF.slice(-(T.FAR.length - 2)).includes(i));
  const fi = rng.pick(opts); usedF.push(fi); if (usedF.length > T.FAR.length) usedF.shift();
  push(g, out, 'far', p, T.FAR[fi](c));
  out[out.length - 1].form = fi;
}
// 정이 깊은 형제는 내가 바닥일 때 먼저 손을 내민다
function sacrifice(g, rng, sibs, out) {
  const st = S(g);
  if (playerAge(g) < 16) return;
  const broke = g.player.money < 5 && L(g).home !== 'family';
  const sick = (g.player.injuries?.length ?? 0) >= 2 || g.player.fatigue > 85;
  if (!broke && !sick) return;
  const kind = sibs.filter((p) => p.affection >= 50 && ageYears(p) >= 16 && mi(g) - (st.giveAt[p.id] ?? -99) >= 36);
  if (!kind.length || !rng.chance(0.35)) return;
  const p = rng.pick(kind);
  st.giveAt[p.id] = mi(g);
  if (broke) {
    const amt = clamp(Math.round((p.wealth ?? 20) * 0.25), 4, 30);
    p.wealth = (p.wealth ?? 0) - amt; g.player.money += amt;
    push(g, out, 'give', p, T.GIVE.money(ctx(g, p, { amt })));
  } else if (!p.away && placeOf(p) === here(g)) {
    tired(g, -10); stress(g, -6);
    push(g, out, 'give', p, T.GIVE.nurse(ctx(g, p)));
  }
  aff(p, 3);
}
// 대를 이은 뒤 삼촌·고모가 된 형제
function uncles(g, rng, out) {
  const st = S(g);
  for (const [id, u] of Object.entries(st.uncles)) {
    const p = byId(g, Number(id));
    if (!p || !p.alive) { delete st.uncles[id]; continue; }
    const near = !p.away && placeOf(p) === here(g);
    if (!near) continue;
    const c = { ws: `${u.word} ${p.name}`, s: p.name };
    if (u.stance === 'help' && mi(g) - (u.helpAt ?? u.at) >= 10 && rng.chance(0.2)) {
      u.helpAt = mi(g);
      if (rng.chance(0.4)) g.player.familyMoney += clamp(Math.round((p.wealth ?? 20) * 0.1), 3, 20);
      push(g, out, 'uncle', p, pick(g, rng, T.UNCLE_HELP, 'uh', c));
    } else if (u.stance === 'covet') {
      if (!u.done && mi(g) - u.at >= 6 && playerAge(g) >= 15 && !sceneQueued(g, 'sib_uncle') && rng.chance(0.15)) { u.done = true; queueScene(g, 'sib_uncle', { uncle: p.id }); }
      else if (rng.chance(0.06)) push(g, out, 'uncle', p, pick(g, rng, T.UNCLE_COLD, 'uc', c));
    }
  }
}

/* ---------- 장면 고르기 ---------- */
const CRAFT = ['smith', 'baker', 'miller', 'innkeeper', 'carpenter', 'shopkeeper', 'merchant', 'weaver', 'herbalist', 'hunter', 'farmer', 'cook'];
function scenes(g, rng, sibs) {
  const st = S(g);
  const now = mi(g);
  if (now - st.sceneAt < 8 || g.pendingEvent && L(g).queue.length > 2) return;
  const age = playerAge(g);
  const homeSibs = sibs.filter((p) => !p.away && placeOf(p) === here(g));
  const opts = [];
  // 어린 시절
  if (age >= 6 && age < 16 && homeSibs.length) {
    const kids = homeSibs.filter((p) => ageYears(p) >= 4 && ageYears(p) <= 19);
    if (kids.length) {
      const p = rng.pick(kids);
      const due = (k, n) => now - (st.childAt[k] ?? -99) >= n;
      if (due('blame', 30)) opts.push(['sib_blame', { sib: p.id }, 1]);
      if (due('share', 36)) opts.push(['sib_share', { sib: p.id }, 1]);
      if (due('protect', 40) && age >= 8) opts.push(['sib_protect', { sib: p.id }, 0.8]);
      if (due('rival', 30) && Math.abs(ageYears(p) - age) <= 4 && ageYears(p) >= 6) opts.push(['sib_rival', { sib: p.id }, 1.2]);
    }
  }
  if (age >= 18) {
    // 곤경에 빠진 형제
    for (const p of sibs) { const f = st.fortune[p.id]; if (f?.trouble && !f.asked && p.affection > -30 && ageYears(p) >= 18) opts.push(['sib_plea', { sib: p.id, why: f.trouble }, 2]); }
    // 사이가 틀어진 형제의 배신
    for (const p of homeSibs) {
      if (st.betrayed.includes(p.id) || ageYears(p) < 18) continue;
      if ((p.affection <= -10 || p.rivalry >= 50) && (has(p, 'greedy') || has(p, 'cruel') || has(p, 'ambitious') || p.rivalry >= 65)) opts.push(['sib_betray', { sib: p.id }, 1.5]);
    }
    // 늙은 부모의 가업
    const m = me(g);
    for (const par of [byId(g, m.fatherId), byId(g, m.motherId)]) {
      if (!par?.alive || par.isPlayer || !CRAFT.includes(par.job) || ageYears(par) < 58 || st.trade[par.id] || placeOf(par) !== here(g)) continue;
      const cand = homeSibs.filter((p) => ageYears(p) >= 16);
      if (cand.length) opts.push(['sib_trade', { parent: par.id, sib: rng.pick(cand).id }, 2]);
    }
    // 조카의 견습 부탁
    if (jobDef(g)) {
      for (const p of homeSibs) for (const kid of (p.childIds ?? []).map((id) => byId(g, id))) {
        if (kid?.alive && ageYears(kid) >= 13 && ageYears(kid) <= 17 && !st.nephewAsk.includes(kid.id) && placeOf(kid) === here(g)) opts.push(['sib_nephew', { sib: p.id, kid: kid.id }, 0.6]);
      }
    }
  }
  if (!opts.length || !rng.chance(age < 16 ? 0.3 : 0.4)) return;
  const [kind, data] = rng.weighted(opts, (o) => o[2]);
  if (sceneQueued(g, kind)) return;
  st.sceneAt = now;
  if (kind.startsWith('sib_') && ['sib_blame', 'sib_share', 'sib_protect', 'sib_rival'].includes(kind)) st.childAt[kind.slice(4)] = now;
  if (kind === 'sib_plea') st.fortune[data.sib].asked = true;
  if (kind === 'sib_betray') st.betrayed.push(data.sib);
  if (kind === 'sib_trade') st.trade[data.parent] = 'asked';
  if (kind === 'sib_nephew') st.nephewAsk.push(data.kid);
  queueScene(g, kind, data);
}
// 부모(플레이어가 아닌)가 세상을 떠나면 남긴 것을 나눈다
function estates(g, rng) {
  const st = S(g);
  const m = me(g);
  if (playerAge(g) < 16) return;
  for (const par of [byId(g, m.fatherId), byId(g, m.motherId)]) {
    if (!par || par.alive || par.wasPlayer || st.estates.includes(par.id)) continue;
    st.estates.push(par.id);
    const heirs = siblingsOf(g).filter((p) => ageYears(p) >= 16);
    const pot = clamp(Math.round(par.wealth ?? 0), 0, 240);
    const other = byId(g, par.spouseId);
    if (!heirs.length || pot < 12 || other?.alive) continue; // 남은 부모가 있으면 그쪽이 지닌다
    queueScene(g, 'sib_estate', { parent: par.id, pot, eldest: eldestOf(g, heirs).id }, { first: true });
  }
}

function monthTick(g) {
  const st = S(g);
  st.month = [];
  if (g.over || !g.player || L(g).heirPending || !me(g)) return;
  const rng = ownRng(g, 3);
  const out = [];
  const sibs = siblingsOf(g);
  turns(g, rng, sibs, out);
  const quiet = traveling(g) || isJailed(g) || g.bondage?.slave || g.army?.campaign;
  if (!quiet) {
    growing(g, rng, sibs, out);
    fortunes(g, rng, sibs, out);
    farNews(g, rng, sibs, out);
    sacrifice(g, rng, sibs, out);
    uncles(g, rng, out);
    estates(g, rng);
    scenes(g, rng, sibs);
  } else farNews(g, rng, sibs, out);
  st.month = out.slice(0, 2);
  // 두 줄 밖으로 밀려 안 보인 먼 소식은 앞 문장을 쓴 것으로 치지 않는다 (33단계: 같은 앞 문장이 다시 보이던 일)
  for (const x of out.slice(2)) if (x.kind === 'far' && x.form != null) { const u = st.farUsed[x.id]; const i = u?.lastIndexOf(x.form) ?? -1; if (i >= 0) u.splice(i, 1); }
  for (const x of st.month) st.log.push({ y: g.date.year, m: g.date.month, text: x.text });
  if (st.log.length > 24) st.log.splice(0, st.log.length - 24);
  if (g.date.month === 1) for (const id of Object.keys(st.seen)) { const p = byId(g, Number(id)); if (!p || (!p.alive && st.seen[id].alive === false)) delete st.seen[id]; }
}

/* ---------- 어린 시절 장면 ---------- */
const sibP = (g, s) => { const p = byId(g, s.sib); return p && p.alive ? p : null; };
const need = (g, s) => !!sibP(g, s);
defineScene('sib_blame', {
  title: () => '깨진 항아리',
  need,
  text: (g, s) => { const p = sibP(g, s); const c = ctx(g, p); return `어머니가 아끼던 꿀 항아리가 부엌 바닥에 깨져 있다. 깬 것은 ${c.ws}다. 나는 봤다. 어머니의 발소리가 다가온다. ${J(p.name, '이/가')} 하얗게 질린 얼굴로 나를 본다.`; },
  choices: (g, s) => [{ label: '내가 깼다고 한다', key: 'take' }, { label: '사실대로 말한다', key: 'truth' }, { label: '둘 다 모른다고 잡아뗀다', key: 'deny' }],
  resolve(g, rng, s, key) {
    const p = sibP(g, s);
    if (key === 'take') { aff(p, 10); stress(g, 4); remember(g, p, '꿀 항아리를 대신 뒤집어써 주었다', 1, { tag: 'sib_blame' }); return `내가 깼다고 했다. 저녁을 굶었다. 밤에 ${J(p.name, '이/가')} 제 빵을 반 갈라 이불 밑으로 밀어 넣었다. 둘 다 아무 말도 하지 않았다.`; }
    if (key === 'truth') { aff(p, -6); riv(p, 6); remember(g, p, '꿀 항아리 일을 어머니에게 일렀다', -1, { tag: 'sib_blame' }); return `사실대로 말했다. ${J(p.name, '은/는')} 종아리를 맞았다. 그날 밤 ${J(p.name, '은/는')} 등을 돌리고 잤다. 틀린 말을 한 것은 아닌데, 마음이 편하지 않았다.`; }
    const ok = check(rng, (g.player.stats?.cha ?? 10) * 0.8, 18);
    if (ok) { aff(p, 6); return '둘 다 모른다고 했다. 어머니는 한참 우리를 번갈아 보더니, 고양이 탓을 했다. 고양이에게는 미안한 일이다.'; }
    aff(p, 2); stress(g, 3);
    return '둘 다 잡아뗐다. 어머니는 속지 않았다. 둘이 나란히 서서 혼났다. 그래도 같이 혼나는 것은 혼자 혼나는 것보다 나았다.';
  },
});
defineScene('sib_share', {
  title: () => '맏이의 몫',
  need,
  text: (g, s) => {
    const p = sibP(g, s); const c = ctx(g, p);
    return c.older
      ? `장날에 아버지가 새 신발 한 켤레를 사 왔다. ${c.ws}의 것이었다. 맏이니까. 나는 ${c.s}의 헌 신발을 물려받는다. 앞코가 벌어져 있다.`
      : `장날에 아버지가 새 신발 한 켤레를 사 왔다. 내 것이다. 위니까. 헌 신발은 ${c.ws}에게 간다. ${J(p.name, '이/가')} 앞코 벌어진 신발을 내려다보고 있다.`;
  },
  choices: (g, s) => {
    const c = ctx(g, sibP(g, s));
    return c.older
      ? [{ label: '불공평하다고 따진다', key: 'protest' }, { label: '헌 신발을 직접 고쳐 신는다', key: 'mend' }, { label: '말없이 받는다', key: 'accept' }]
      : [{ label: '새 신발을 동생에게 준다', key: 'give' }, { label: '헌 신발을 같이 고쳐 준다', key: 'mend' }, { label: '내 몫이다', key: 'keep' }];
  },
  resolve(g, rng, s, key) {
    const p = sibP(g, s);
    if (key === 'protest') { riv(p, 8); stress(g, 3); return '따졌다. 아버지는 "네 차례도 온다"고만 했다. 그 차례는 오지 않을 것 같다. 그날부터 맏이라는 말이 조금 미워졌다.'; }
    if (key === 'accept') { aff(p, 2); return `받았다. 발가락이 앞으로 쏠렸다. ${J(p.name, '이/가')} 다음 날 신발 안에 마른 풀을 채워 주었다.`; }
    if (key === 'mend') { aff(p, 5); g.player.stats.sen = (g.player.stats.sen ?? 0) + 0.3; return '돗바늘과 질긴 실을 빌려 밤새 앞코를 꿰맸다. 손가락을 세 번 찔렀다. 신어 보니 걸을 만했다. (감각 +0.3)'; }
    if (key === 'give') { aff(p, 14); riv(p, -5); remember(g, p, '새 신발을 양보해 주었다', 1, { tag: 'sib_share' }); return `새 신발을 ${p.name}에게 신겼다. ${J(p.name, '은/는')} 신발을 신고 마당을 열 바퀴 돌았다. 아버지는 아무 말도 하지 않았지만 저녁에 내 머리를 한 번 쓰다듬었다.`; }
    riv(p, 6); aff(p, -3);
    return `내 몫이다. 새 신발은 발에 꼭 맞았다. ${J(p.name, '은/는')} 한동안 내 신발만 보고 다녔다.`;
  },
});
defineScene('sib_protect', {
  title: () => '골목의 아이들',
  need,
  text: (g, s) => { const p = sibP(g, s); const c = ctx(g, p); return `골목 끝에서 큰 아이 셋이 ${J(c.ws, '을/를')} 둘러싸고 밀치고 있다. ${J(p.name, '이/가')} 들고 있던 바구니가 바닥에 엎어졌다.`; },
  choices: () => [{ label: '뛰어들어 막아선다', key: 'fight' }, { label: '어른을 부르러 달려간다', key: 'adult' }, { label: '못 본 척 지나간다', key: 'leave' }],
  resolve(g, rng, s, key) {
    const p = sibP(g, s);
    if (key === 'fight') {
      const ok = check(rng, (g.player.stats?.str ?? 10) * 0.6 + (g.player.stats?.wil ?? 10) * 0.6, 22);
      aff(p, 12); remember(g, p, '골목에서 큰 아이들에게 맞서 감싸 주었다', 1, { tag: 'sib_protect' });
      if (ok) return `달려들었다. 하나를 밀어 넘어뜨리자 나머지가 주춤했다. 셋은 욕을 하며 흩어졌다. ${J(p.name, '이/가')} 내 소매를 꼭 쥐고 집까지 놓지 않았다.`;
      tired(g, 8); g.player.injuries.push({ name: '멍든 눈두덩', months: 1 });
      return `달려들었다가 실컷 맞았다. 눈두덩이 퍼렇게 부었다. 그래도 녀석들은 갔다. 그날 밤 ${J(p.name, '이/가')} 찬 물수건을 몇 번이나 갈아 주었다.`;
    }
    if (key === 'adult') { aff(p, 5); return '대장간까지 뛰어가 소리쳤다. 어른들이 나오자 녀석들은 흩어졌다. 집에 가는 길에 바구니에서 쏟아진 사과를 둘이 같이 주웠다.'; }
    aff(p, -15); stress(g, 6); remember(g, p, '골목에서 괴롭힘당할 때 보고도 지나쳤다', -1, { tag: 'sib_protect' });
    return `지나갔다. 뒤에서 ${p.name}의 우는 소리가 들렸다. 저녁에 ${J(p.name, '은/는')} 내 쪽을 한 번도 보지 않았다. 그 일은 오래 남을 것이다.`;
  },
});
defineScene('sib_rival', {
  title: () => '저녁상',
  need,
  text: (g, s) => { const p = sibP(g, s); const c = ctx(g, p); return `저녁상에서 아버지가 말했다. "${J(p.name, '은/는')} 벌써 글을 다 뗐다더라. 너는 뭘 하고 다니냐." ${J(c.ws, '이/가')} 숟가락만 내려다본다.`; },
  choices: () => [{ label: '두고 보라며 밤새 글을 판다', key: 'work' }, { label: '잘난 척하지 말라고 쏘아붙인다', key: 'snap' }, { label: '가르쳐 달라고 부탁한다', key: 'ask' }],
  resolve(g, rng, s, key) {
    const p = sibP(g, s);
    if (key === 'work') { riv(p, 10); tired(g, 8); g.player.skills.letters = (g.player.skills.letters ?? 0) + 1.2; return '두고 보라고 했다. 그 밤부터 등잔불 아래에서 글자를 베꼈다. 눈이 따가웠다. 지기 싫은 마음은 생각보다 오래 탄다. (글과 학문 +1.2)'; }
    if (key === 'snap') { riv(p, 12); aff(p, -8); return `쏘아붙였다. ${J(p.name, '은/는')} 대꾸하지 않고 일어나 나갔다. 아버지는 혀를 찼다. 그날 이후 둘 사이에 말이 줄었다.`; }
    aff(p, 10); riv(p, -6); g.player.skills.letters = (g.player.skills.letters ?? 0) + 0.8;
    remember(g, p, '글을 가르쳐 달라고 머리를 숙였다', 1, { tag: 'sib_rival' });
    return `밥을 다 먹고 ${p.name}에게 가르쳐 달라고 했다. ${J(p.name, '은/는')} 놀란 얼굴이더니, 그날 밤 내 옆에 앉아 손가락으로 글자를 짚어 주었다. (글과 학문 +0.8)`;
  },
});

/* ---------- 어른 장면 ---------- */
defineScene('sib_wedding', {
  title: (g, s) => `${callWord(g, byId(g, s.sib))}의 혼례`,
  need: (g, s) => !!sibP(g, s) && !!byId(g, s.mate)?.alive,
  text: (g, s) => {
    const p = sibP(g, s); const mt = byId(g, s.mate); const house = mt.fatherId ? byId(g, mt.fatherId)?.lastName ?? mt.lastName : mt.lastName;
    return `${J(ws(g, p), '이/가')} ${house} 집안과 혼례를 치른다. 잔치 비용이 모자란다는 말이 들린다. ${house} 집안은 은근히 우리 집 형편을 재고 있다. ${J(p.name, '이/가')} 나를 따로 불렀지만 차마 돈 이야기를 꺼내지 못했다.`;
  },
  choices: (g) => {
    const out = [];
    if (canSpend(g, 20)) out.push({ label: '잔치 비용을 보탠다 (은화 20닢)', key: 'pay' });
    out.push({ label: '잔치 일을 몸으로 거든다', key: 'help' }, { label: '그 집안이 마음에 안 든다고 말한다', key: 'object' });
    return out;
  },
  resolve(g, rng, s, key) {
    const p = sibP(g, s);
    if (key === 'pay') { if (!spend(g, 20)) return '주머니가 생각보다 가벼웠다.'; aff(p, 12); remember(g, p, '혼례 비용을 보태 주었다', 1, { tag: 'sib_wed' }); return `은화 20닢을 보탰다. 잔칫상이 한 줄 늘었다. 사돈 어른이 우리 집 쪽에 먼저 술을 따랐다. ${J(p.name, '이/가')} 상 너머에서 고개를 숙였다. (은화 -20)`; }
    if (key === 'help') { aff(p, 6); tired(g, 12); return '사흘 동안 장작을 패고 상을 나르고 손님을 맞았다. 잔칫날 밤, 마당 구석에서 둘이 남은 술을 나눠 마셨다. "고맙다." 그 한마디로 충분했다. (피로 +12)'; }
    const ok = rng.chance(0.3);
    aff(p, ok ? -2 : -14); riv(p, 5);
    if (ok) return `그 집안 사람들 말이 미덥지 않다고 했다. ${J(p.name, '은/는')} 한참 생각하더니 "알아. 그래도 그 사람은 달라"라고 했다. 더는 말하지 않았다.`;
    return `그 집안이 마음에 안 든다고 했다. ${J(p.name, '은/는')} 얼굴이 굳었다. "축하는 못 해 줄망정." 잔칫날 내 자리는 문간 쪽이었다.`;
  },
});
defineScene('sib_plea', {
  title: (g, s) => `${callWord(g, byId(g, s.sib))}의 부탁`,
  need,
  text: (g, s) => {
    const p = sibP(g, s); const w = ws(g, p);
    const why = { debt: `빚쟁이들이 ${p.name}네 집 문 앞을 지킨다고 한다. 은화 30닢이면 급한 불은 끈다.`, sick: `${J(p.name, '이/가')} 몸져누웠다. 약값과 일 못 하는 동안의 끼니가 걱정이다.`, fire: `${p.name}네 집에 불이 나서 지붕이 내려앉았다. 겨울이 오기 전에 머물 곳이 필요하다.` }[s.why] ?? `${J(p.name, '이/가')} 어렵다.`;
    return `${J(w, '이/가')} 찾아왔다. 오는 길 내내 할 말을 고른 얼굴이었다. ${why}`;
  },
  choices: (g, s) => {
    const out = [];
    if (canSpend(g, 30)) out.push({ label: '은화 30닢을 내준다', key: 'money' });
    else if (canSpend(g, 10)) out.push({ label: '있는 대로 은화 10닢을 쥐여 준다', key: 'some' });
    if (['own', 'rent', 'family'].includes(L(g).home)) out.push({ label: '우리 집에서 지내라고 한다', key: 'house' });
    out.push({ label: '나도 어렵다며 돌려보낸다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const p = sibP(g, s);
    const f = S(g).fortune[p.id];
    const fix = () => { if (f) f.trouble = null; p.wealth = Math.max(p.wealth ?? 0, 5); p.health = Math.max(p.health ?? 50, 50); };
    if (key === 'money') { if (!spend(g, 30)) return '돈이 모자랐다.'; fix(); aff(p, 15); remember(g, p, '어려울 때 은화 30닢을 내주었다', 1, { tag: 'sib_plea' }); return `은화 30닢을 내주었다. ${J(p.name, '은/는')} 받지 않으려다 결국 받았다. 문을 나서며 "이 은혜는…" 하다가 말을 삼켰다. 형제 사이에 은혜라는 말이 어색했을 것이다. (은화 -30)`; }
    if (key === 'some') { if (!spend(g, 10)) return '돈이 모자랐다.'; aff(p, 8); return `은화 10닢을 쥐여 주었다. 모자란 것을 둘 다 안다. ${J(p.name, '은/는')} 그래도 고맙다고 했다. (은화 -10)`; }
    if (key === 'house') { fix(); aff(p, 12); stress(g, 4); remember(g, p, '집을 잃었을 때 제 집에 들여 주었다', 1, { tag: 'sib_plea' }); return `우리 집에서 지내라고 했다. 좁은 방에 짐이 쌓이고, 밥상에 숟가락이 늘었다. 불편했다. 그래도 저녁마다 어릴 적처럼 둘이 화롯가에 앉았다. 몇 달 뒤 ${J(p.name, '은/는')} 다시 일어섰다.`; }
    aff(p, -18); remember(g, p, '어려울 때 찾아갔다가 빈손으로 돌아섰다', -1, { tag: 'sib_plea' });
    if (p.affection <= -40) addGrudge(g, p, 20, '어려울 때 외면한 형제');
    return `돌려보냈다. ${J(p.name, '은/는')} 고개를 끄덕이고 갔다. 따지지도 않았다. 그게 더 무거웠다.`;
  },
});
defineScene('sib_estate', {
  title: () => '부모가 남긴 것',
  need: (g, s) => siblingsOf(g).some((p) => ageYears(p) >= 16),
  text: (g, s) => {
    const par = byId(g, s.parent); const e = byId(g, s.eldest);
    const meOld = e && e.ageMonths < me(g).ageMonths;
    return `${J(pw(par), '이/가')} 남긴 것을 나눌 때가 왔다. 은화로 치면 ${s.pot}닢쯤 된다. ${meOld ? '맏이는 나다. 동생들이 내 입을 본다.' : `${J(ws(g, e), '이/가')} 맏이의 몫을 말한다. 맏이가 절반을 갖는 것이 이 고장의 옛 법이다.`}`;
  },
  choices: (g, s) => {
    const e = byId(g, s.eldest);
    const meOld = !e || e.ageMonths < me(g).ageMonths;
    return meOld
      ? [{ label: '똑같이 나눈다', key: 'equal' }, { label: '맏이 몫으로 절반을 갖는다', key: 'half' }, { label: '내 몫은 동생들에게 준다', key: 'give' }]
      : [{ label: '똑같이 나누자고 한다', key: 'equal' }, { label: '맏이 몫을 인정한다', key: 'allow' }, { label: '내가 부모를 모셨으니 더 달라고 한다', key: 'more' }, { label: '다 가지라고 한다', key: 'give' }];
  },
  resolve(g, rng, s, key) {
    const heirs = siblingsOf(g).filter((p) => ageYears(p) >= 16);
    const n = heirs.length + 1;
    const e = byId(g, s.eldest);
    const meOld = !e || e.ageMonths < me(g).ageMonths;
    let mine = 0; let text;
    if (key === 'equal') {
      mine = Math.floor(s.pot / n);
      for (const p of heirs) aff(p, meOld ? 8 : (p.id === s.eldest ? -6 : 4));
      if (!meOld && e) riv(e, 8);
      text = meOld ? `똑같이 나누었다. 동생들은 놀란 얼굴이었다. 맏이가 그렇게 하면 아무도 다른 말을 못 한다.` : `똑같이 나누자고 했다. ${J(e?.name ?? '맏이', '은/는')} 얼굴을 붉혔지만 마을 어른들이 고개를 끄덕였다. 나눔은 그렇게 끝났지만 맏이의 눈빛은 한동안 차가웠다.`;
    } else if (key === 'half') {
      mine = Math.floor(s.pot / 2);
      for (const p of heirs) { aff(p, -6); riv(p, 8); }
      text = '맏이의 몫으로 절반을 가졌다. 옛 법대로다. 아무도 대놓고 말하지 않았지만, 그날 저녁 동생들은 일찍 자리를 떴다.';
    } else if (key === 'allow') {
      mine = Math.floor(s.pot / 2 / Math.max(1, n - 1));
      if (e) aff(e, 10);
      text = `맏이의 몫을 인정했다. ${J(e?.name ?? '맏이', '이/가')} 내 어깨를 두드렸다. 손에 쥔 것은 적었지만 다툴 일도 없었다.`;
    } else if (key === 'more') {
      const ok = check(rng, (g.player.stats?.cha ?? 10) * 0.5 + (g.player.skills?.letters ?? 0) * 0.4, 25);
      if (ok) { mine = Math.floor(s.pot * 0.45); for (const p of heirs) { aff(p, -8); riv(p, 10); } text = '병든 부모를 누가 모셨는지 따졌다. 어른들이 내 편을 들었다. 더 받았다. 형제들은 그 일을 잊지 않을 것이다.'; }
      else { mine = Math.floor(s.pot / n / 2); for (const p of heirs) { aff(p, -12); riv(p, 10); } if (e && e.affection <= -40) addGrudge(g, e, 20, '부모 유산을 두고 다툰 형제'); text = '더 달라고 했다가 핀잔만 들었다. 결국 남들보다 덜 받았다. 장례 뒤 처음 모인 자리가 마지막 자리가 될 것 같았다.'; }
    } else {
      mine = 0;
      for (const p of heirs) aff(p, 12);
      const keep = byId(g, s.parent)?.sex === 'm' ? '아버지가 쓰던 낡은 칼집' : '어머니가 쓰던 나무 빗';
      text = `다 가지라고 했다. 형제들은 말이 없었다. 그날 밤 ${J(eldestOf(g, heirs)?.name ?? '형제 하나', '이/가')} ${J(keep, '을/를')} 내 손에 쥐여 주었다. 그것 하나면 됐다.`;
    }
    if (mine > 0) { g.player.money += mine; text += ` (은화 +${mine})`; }
    note(g, `부모가 남긴 것을 형제들과 나누었다.`);
    return text;
  },
});
defineScene('sib_trade', {
  title: () => '가업',
  need: (g, s) => !!byId(g, s.parent)?.alive && !!sibP(g, s),
  text: (g, s) => {
    const par = byId(g, s.parent); const p = sibP(g, s);
    const pw = par.sex === 'm' ? '아버지' : '어머니';
    return `${pw}의 손이 예전 같지 않다. ${jobWord(par.job) ?? '집안'} 일을 누가 이을지 이야기할 때가 되었다. ${J(ws(g, p), '은/는')} 어릴 때부터 그 일을 거들었다. ${pw}가 나와 ${p.name}을 번갈아 본다.`;
  },
  choices: (g, s) => [{ label: '내가 잇겠다고 한다', key: 'me' }, { label: `${sibP(g, s)?.name ?? '형제'}에게 맡기자고 한다`, key: 'sib' }, { label: '둘이 같이 꾸리자고 한다', key: 'both' }],
  resolve(g, rng, s, key) {
    const par = byId(g, s.parent); const p = sibP(g, s);
    const st = S(g);
    if (key === 'me') {
      st.trade[par.id] = 'me';
      const cut = clamp(Math.round((par.wealth ?? 0) * 0.3), 0, 60);
      par.wealth = (par.wealth ?? 0) - cut; g.player.familyMoney += cut;
      riv(p, 20); aff(p, -12);
      if (rng.chance(0.4) && !p.spouseId) { p.away = true; return `내가 잇겠다고 했다. ${pw(par)}는 오래 생각하더니 고개를 끄덕였다. ${J(p.name, '은/는')} 그 겨울에 짐을 싸서 떠났다. 떠나는 날 나와 눈을 맞추지 않았다. (집안 돈 +${cut})`; }
      return `내가 잇겠다고 했다. ${J(p.name, '은/는')} 아무 말 없이 일어나 마당으로 나갔다. 그 일은 이제 내 몫이다. ${p.name}과의 사이는 그만큼 멀어졌다. (집안 돈 +${cut})`;
    }
    if (key === 'sib') {
      st.trade[par.id] = p.id;
      if (jobWord(par.job)) p.job = par.job;
      aff(p, 15); riv(p, -10);
      remember(g, p, '가업을 양보해 주었다', 1, { tag: 'sib_trade' });
      return `${p.name}에게 맡기자고 했다. ${pw(par)}의 얼굴이 풀렸다. 그날 밤 ${J(p.name, '이/가')} 술 한 병을 들고 왔다. "네 몫은 내가 평생 갚을게." 갚을 것은 없다고 했다.`;
    }
    st.trade[par.id] = 'both';
    const ok = check(rng, (p.affection ?? 0) * 0.5 + (g.player.stats?.cha ?? 10) * 0.5, 30);
    if (ok) { aff(p, 10); return '둘이 같이 꾸리기로 했다. 처음 몇 달은 손발이 엉켰지만, 어느새 한 사람은 손님을 맞고 한 사람은 일을 하는 식으로 자리가 잡혔다.'; }
    riv(p, 15); aff(p, -8);
    return '둘이 같이 꾸리기로 했다. 한 지붕 아래 주인이 둘이었다. 물건 값 하나를 두고도 언성이 높아졌다. 결국 장부를 반으로 갈랐다.';
  },
});
const pw = (par) => (par?.sex === 'm' ? '아버지' : '어머니');
defineScene('sib_betray', {
  title: (g, s) => `${callWord(g, byId(g, s.sib))}의 일`,
  need,
  text: (g, s) => {
    const p = sibP(g, s); const w = ws(g, p);
    const how = has(p, 'greedy') ? `${J(w, '이/가')} 집안 밭 한 뙈기를 몰래 제 이름으로 올려놓았다는 것을 알았다. 증인으로 선 사람은 ${J(p.name, '이/가')} 술을 산 사람이다.`
      : has(p, 'cruel') ? `내 일감을 가로채려고 내 얘기를 나쁘게 퍼뜨린 사람이 다름 아닌 ${J(w, '이었/였')}다는 것을 알았다.`
      : `내가 맡으려던 자리에 ${J(w, '이/가')} 먼저 손을 써서 들어갔다는 것을 알았다. 내 이름을 팔아서.`;
    return `${how} 피를 나눈 사이다. 그래서 더 아프다.`;
  },
  choices: () => [{ label: '마을 어른들 앞에서 따진다', key: 'confront' }, { label: '혼자 찾아가 담판을 짓는다', key: 'talk' }, { label: '핏줄이니 참는다', key: 'bear' }, { label: '인연을 끊는다', key: 'cut' }],
  resolve(g, rng, s, key) {
    const p = sibP(g, s);
    if (key === 'confront') {
      const ok = check(rng, (g.player.stats?.cha ?? 10) * 0.6 + (g.player.stats?.int ?? 10) * 0.4, 25);
      if (ok) { aff(p, -15); p.wealth = (p.wealth ?? 0) - 20; g.player.money += 15; return `어른들 앞에서 따졌다. ${J(p.name, '은/는')} 끝내 말을 잃었다. 빼앗긴 것은 돌려받았다. 은화 15닢이 덤으로 왔다. ${J(p.name, '은/는')} 그 뒤로 마을에서 얼굴을 들지 못했다. (은화 +15)`; }
      aff(p, -20); stress(g, 8);
      return `따졌지만 증거가 모자랐다. 어른들은 "형제끼리 해결하라"며 고개를 저었다. ${J(p.name, '이/가')} 돌아서며 웃는 것을 보았다.`;
    }
    if (key === 'talk') {
      const ok = check(rng, (p.affection ?? 0) + 40 + (g.player.stats?.cha ?? 10) * 0.4, 45);
      if (ok) { aff(p, 10); riv(p, -15); return `밤에 혼자 찾아갔다. 처음엔 언성이 높았다. 그러다 ${J(p.name, '이/가')} 먼저 무너졌다. "늘 네가 먼저였잖아. 어릴 때부터." 그 말을 듣고 나도 할 말이 없어졌다. 빼앗긴 것은 돌려받기로 했다.`; }
      aff(p, -12);
      return `혼자 찾아갔다. ${J(p.name, '은/는')} 문을 반만 열고 "할 말 없다"고 했다. 문이 닫혔다.`;
    }
    if (key === 'bear') { aff(p, 4); stress(g, 10); return '참았다. 핏줄이니까. 그 말을 몇 번이나 되뇌었다. 잠은 잘 오지 않았다.'; }
    p.affection = Math.min(p.affection ?? 0, -45); p.bond = 'enemy';
    addGrudge(g, p, 25, '인연을 끊은 형제');
    note(g, `${sibWord(g, p)} ${J(p.name, '과/와')} 인연을 끊었다.`);
    return `인연을 끊는다고 했다. ${J(p.name, '은/는')} "바라던 바"라고 했다. 어머니가 살아 계셨다면 울었을 것이다.`;
  },
});
defineScene('sib_orphan', {
  title: () => '남겨진 조카들',
  keep: true,
  need: (g, s) => s.kids.some((id) => byId(g, id)?.alive),
  text: (g, s) => {
    const p = byId(g, s.sib); const kids = s.kids.map((id) => byId(g, id)).filter((k) => k?.alive);
    const left = kids.length > 1 ? `${kids.map((k) => k.name).join(', ')}, 아이 ${NUM[Math.min(kids.length, 8)]}이 남았다` : `${J(kids[0].name, '이/가')} 혼자 남았다`;
    return `${p ? `${sibWord(g, p)} ${p.name}` : '형제'}의 장례가 끝났다. ${left}. 맡아 줄 사람이 없다. 친척 어른들이 서로 눈치만 본다. ${kids.length > 1 ? '아이들이' : '아이가'} 나를 보고 있다.`;
  },
  choices: (g) => {
    const out = [{ label: '내가 거둔다', key: 'take' }];
    if (canSpend(g, 15)) out.push({ label: '다른 친척에게 맡기고 돈을 보낸다 (은화 15닢)', key: 'pay' });
    out.push({ label: '내 형편으로는 어렵다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const kids = s.kids.map((id) => byId(g, id)).filter((k) => k?.alive);
    const st = S(g);
    if (key === 'take') {
      for (const k of kids) {
        k.place = here(g); k.known = true; aff(k, 30);
        if (!g.player.familyIds.includes(k.id)) g.player.familyIds.push(k.id);
        st.wards.push(k.id);
        remember(g, k, '부모를 잃었을 때 거두어 주었다', 1, { tag: 'sib_ward' });
      }
      stress(g, 6);
      note(g, `세상을 떠난 형제의 아이 ${J(kids.map((k) => k.name).join(', '), '을/를')} 거두었다.`);
      return `${kids.length > 1 ? '아이들' : '아이'} 손을 잡고 집으로 왔다. 첫날 밤 ${J(kids[0].name, '은/는')} 한숨도 자지 않고 창밖만 보았다. 며칠 뒤, 처음으로 내 옷자락을 잡고 따라왔다.`;
    }
    if (key === 'pay') { spend(g, 15); for (const k of kids) { k.known = true; aff(k, 8); } return '외가 쪽 먼 친척에게 아이들을 맡겼다. 은화 15닢을 함께 보냈다. 마차가 떠날 때 작은 손 하나가 창밖으로 흔들렸다. (은화 -15)'; }
    for (const k of kids) { k.known = true; aff(k, -10); }
    stress(g, 8);
    return '거둘 형편이 못 된다고 했다. 아이들은 결국 구빈원으로 갔다. 그 아이들이 언젠가 나를 기억할 것이다.';
  },
});
defineScene('sib_nephew', {
  title: () => '조카의 부탁',
  need: (g, s) => !!byId(g, s.kid)?.alive && !!jobDef(g),
  text: (g, s) => { const k = byId(g, s.kid); const p = byId(g, s.sib); return `${p ? `${callWord(g, p)} ${p.name}` : '형제'}의 아이 ${J(k.name, '이/가')} 찾아왔다. 열 몇 살, 눈빛이 제 부모 어릴 적과 똑같다. "${jobDef(g).name} 일을 배우고 싶어요. 받아 주세요."`; },
  choices: () => [{ label: '데리고 일을 가르친다', key: 'take' }, { label: '아직 이르다며 돌려보낸다', key: 'no' }],
  resolve(g, rng, s, key) {
    const k = byId(g, s.kid); const p = byId(g, s.sib);
    if (key === 'take') { aff(k, 15); if (p) aff(p, 8); tired(g, 6); remember(g, k, '일을 가르쳐 주었다', 1, { tag: 'sib_nephew' }); return `받아 주었다. ${J(k.name, '은/는')} 첫날부터 실수투성이였다. 그런데 손이 빨랐다. 저녁에 제 부모에게 오늘 배운 것을 하나하나 자랑했다고 한다.`; }
    aff(k, -5);
    return `아직 이르다고 했다. ${J(k.name, '은/는')} 입술을 깨물고 돌아갔다. 몇 해 뒤 다른 데서 그 일을 배웠다는 말을 들었다.`;
  },
});
defineScene('sib_uncle', {
  title: (g, s) => `${S(g).uncles[s.uncle]?.word ?? '친척'}의 말`,
  need: (g, s) => !!byId(g, s.uncle)?.alive,
  text: (g, s) => {
    const u = byId(g, s.uncle); const w = S(g).uncles[s.uncle]?.word ?? '친척';
    return `${w} ${J(u.name, '이/가')} 친척들을 모아 놓고 말했다. "집안이 어린 손에 흔들리고 있소. 내가 맡아 보겠소. 장부와 열쇠를 넘기거라." 모인 사람들이 나를 본다.`;
  },
  choices: (g) => {
    const out = [{ label: '장부를 넘긴다', key: 'yield' }, { label: '집안의 주인은 나라고 맞선다', key: 'stand' }];
    if (canSpend(g, 25)) out.push({ label: '몫을 떼어 주고 달랜다 (은화 25닢)', key: 'buy' });
    out.push({ label: '다른 어른들에게 판가름을 맡긴다', key: 'elders' });
    return out;
  },
  resolve(g, rng, s, key) {
    const u = byId(g, s.uncle); const rec = S(g).uncles[s.uncle];
    if (key === 'yield') { const n = Math.floor(g.player.familyMoney * 0.3); g.player.familyMoney -= n; u.wealth = (u.wealth ?? 0) + n; rec.stance = 'help'; return `장부를 넘겼다. ${J(u.name, '은/는')} 한 해 동안 집안을 쥐고 흔들었다. 그사이 은화 ${n}닢이 어디론가 사라졌다. 장부를 돌려받던 날 ${J(u.name, '은/는')} "이제 네가 해 봐라" 하고 웃었다.`; }
    if (key === 'buy') { spend(g, 25); rec.stance = 'quiet'; aff(u, 10); return `은화 25닢을 떼어 주었다. ${J(u.name, '은/는')} 돈을 받자 목소리가 누그러졌다. "핏줄끼리 얼굴 붉힐 일 있나." 그 뒤로 집안 일에 덜 끼어들었다. (은화 -25)`; }
    const power = key === 'stand' ? (g.player.stats?.wil ?? 10) * 0.6 + (L(g).renown ?? 0) * 0.4 : (g.player.stats?.cha ?? 10) * 0.5 + 15;
    if (check(rng, power, 30)) { rec.stance = 'quiet'; aff(u, -10); return key === 'stand' ? `물러서지 않았다. "이 집의 주인은 나입니다." 어른들 사이에 웅성거림이 일다가 잦아들었다. ${J(u.name, '은/는')} 자리를 박차고 나갔다. 그 뒤로 집안 제삿날에도 오지 않는다.` : `어른들은 오래 의논한 끝에 내 손을 들어주었다. ${J(u.name, '은/는')} 고개를 숙였지만 주먹은 쥔 채였다.`; }
    rec.stance = 'covet'; rec.done = false; rec.at = mi(g) + 12; aff(u, -15);
    const n = Math.floor(g.player.familyMoney * 0.15); g.player.familyMoney -= n;
    if (u.affection <= -40) addGrudge(g, u, 15, '집안 자리를 다툰 친척');
    return `맞섰지만 어른들은 ${u.name}의 편이었다. 밭 한 뙈기를 내주어야 했다. 다툼은 끝나지 않았다. (집안 돈 -${n})`;
  },
});

/* ---------- 대 잇기 ---------- */
// 옛 주인의 형제는 새 주인에게 큰아버지·작은아버지·고모·외삼촌·이모가 된다
function uncleWord(old, sib) {
  const older = sib.ageMonths > old.ageMonths;
  if (old.sex === 'm') return sib.sex === 'm' ? (older ? '큰아버지' : '작은아버지') : '고모';
  return sib.sex === 'm' ? '외삼촌' : '이모';
}
HOOKS.heir.push((g, rng, old) => {
  const st = S(g);
  st.month = []; st.sceneAt = mi(g); st.childAt = {}; st.estates = []; st.trade = {}; st.betrayed = []; st.nephewAsk = []; st.wards = [];
  st.gen += 1;
  const oldP = old ? byId(g, old.id) : null;
  const m = me(g);
  if (!oldP) return;
  // 새 주인이 옛 주인의 자식일 때만 그 형제가 삼촌·고모가 된다 (손주·조카·형제가 이으면 따로 부를 말이 마땅치 않아 두지 않는다)
  const direct = m.fatherId === oldP.id || m.motherId === oldP.id;
  if (!direct) { st.uncles = {}; st.seen = {}; return; }
  const mine = new Set(siblingsOf(g, { all: true }).map((p) => p.id));
  const sibIds = new Set();
  for (const pid of [oldP.fatherId, oldP.motherId]) for (const id of byId(g, pid)?.childIds ?? []) sibIds.add(id);
  sibIds.delete(oldP.id);
  const keep = {};
  for (const id of sibIds) {
    const p = byId(g, id);
    if (!p || !p.alive || p.isPlayer || ageYears(p) < 18 || mine.has(id)) continue;
    rel(p);
    const covet = (p.affection < 15 || p.rivalry >= 40) && (has(p, 'ambitious') || has(p, 'greedy') || p.rivalry >= 55);
    const help = !covet && p.affection >= 25;
    keep[id] = { word: uncleWord(oldP, p), stance: covet ? 'covet' : help ? 'help' : 'quiet', at: mi(g), done: false, helpAt: mi(g) };
    p.known = true;
  }
  // 옛 삼촌들 가운데 아직 살아 있는 이는 이제 두 대 위 어른이다: 남기지 않는다
  st.uncles = keep;
  st.seen = {};
});
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { S(g); });
HOOKS.migrate.push((g) => { S(g); });
