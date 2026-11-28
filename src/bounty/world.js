// 현상금 사냥꾼 (50단계): 한 달 흐름. 플레이어 없이도 돈다.
// - 조합 지부마다 방이 붙는다(탈옥수는 옥살이 갈래의 진짜 탈옥한 사람, 산적·해적은 그 갈래의 무리 이름을 빌린다).
// - 숨은 자는 가끔 고장을 옮기고, 경쟁 사냥꾼이 방을 떼어 가 잡아 온다. 기한이 지난 방은 거두어진다.
// - 조합원이면: 등급 오르기, 내 목에 현상금이 걸리면 쫓겨남, 내 사냥감을 노리는 경쟁자, 내가 잡은 사람의 식구.
import { HOOKS } from '../hooks.js';
import { L, queueScene, note, chron } from '../adventure/core.js';
import { byId } from '../events/core.js';
import { fullName } from '../npc.js';
import { J } from '../narrative/text.js';
import {
  B, mi, clamp, here, placeName, pick, ownRng, HALLS, HALL_IDS, hideNear, KINDS, NAMES_M, NAMES_F, NICKS, STORY, KIN_REL,
  RIVAL_POOL, STYLE, rivalName, RANKS, NEED, blog, huntOf, openPosts, wanted, trailPush,
} from './core.js';

const PORTS = new Set(['barka', 'portel', 'klein', 'libera']);
const liveBands = (g) => (g.outlaws?.bands ?? []).filter((b) => !b.gone);
const pirateBands = (g) => (g.pirates?.bands ?? []).filter((b) => !b.fell);
const busy = (g) => L(g).queue.some((x) => /^bh_/.test(x.kind)) || !!g.pendingEvent;

// 옥살이 갈래에서 최근에 탈옥한 진짜 사람 (아직 방에 오르지 않은)
function escapee(g) {
  const s = B(g), t = mi(g), seen = new Set(s.posts.map((p) => p.pid).filter((x) => x != null));
  for (const x of g.prison?.npc ?? []) {
    if (x.how !== 'escaped' || !(x.end >= t - 12) || seen.has(x.id)) continue;
    const p = byId(g, x.id);
    if (p?.alive && !p.isPlayer) return { p, from: x.place };
  }
  return null;
}

export function makePost(g, rng, hall, o = {}) {
  const s = B(g), t = mi(g);
  const w = { escapee: 2, outlaw: liveBands(g).length ? 3 : 1, pirate: PORTS.has(hall) && pirateBands(g).length ? 3 : 0, debtor: 2, killer: 2, witch: g.world?.famine || g.plague ? 2 : 0.6 };
  const real = escapee(g);
  if (real) w.escapee += 3;
  let r = rng.next() * Object.values(w).reduce((a, b) => a + b, 0), kind = 'debtor';
  for (const [k, v] of Object.entries(w)) { if ((r -= v) < 0) { kind = k; break; } }
  const K = KINDS[kind];
  const sex = kind === 'witch' ? (rng.chance(0.75) ? 'f' : 'm') : rng.chance(kind === 'debtor' ? 0.3 : 0.15) ? 'f' : 'm';
  let name = `${pick(rng, NICKS)} ${pick(rng, sex === 'f' ? NAMES_F : NAMES_M)}`, pid = null, crime = pick(rng, K.crimes);
  if (kind === 'escapee' && real) { name = fullName(real.p); pid = real.p.id; crime = `${placeName(real.from)} 감옥에서 달아났다`; }
  if (kind === 'outlaw' && liveBands(g).length) { const b = pick(rng, liveBands(g)); crime = `${b.name}에 끼어 ${pick(rng, ['길목에서 상단을 털었다', '역참을 불태웠다', '세금 수레를 덮쳤다'])}`; }
  if (kind === 'pirate' && pirateBands(g).length) { const b = pick(rng, pirateBands(g)); crime = `${b.name} 배를 타고 ${pick(rng, ['상선을 털었다', '세관 배를 불태웠다', '어촌을 덮쳤다'])}`; }
  const need = o.need ?? (rng.chance(0.5) ? 0 : rng.chance(0.6) ? 1 : rng.chance(0.6) ? 2 : 3);
  const near = hideNear(hall, 1 + Math.min(2, need));
  const loc = rng.chance(0.25) ? hall : pick(rng, near);
  const p = {
    id: s.seq++, kind, name, pid, sex, crime, hall, loc, need,
    reward: Math.round(K.pay * (0.8 + rng.next() * 0.5) + need * 18),
    pow: K.pow + rng.int(-4, 8) + need * 9,
    dead: K.dead, wrong: rng.chance(K.wrong), story: pick(rng, STORY[kind]),
    kin: { name: pick(rng, sex === 'f' ? NAMES_M : NAMES_F), rel: pick(rng, KIN_REL[sex]) },
    at: t, until: t + 12 + need * 3, by: null, end: null, moved: 0, trail: [],
  };
  s.posts.push(p); s.made += 1;
  return p;
}

function endPost(g, p, how) {
  p.end = how; p.endAt = mi(g);
  B(g).done += 1;
  if (p.pid != null && (how === 'rival' || how === 'caught')) {
    const q = byId(g, p.pid);
    if (q?.alive) { q.history.push({ y: g.date.year, m: g.date.month, text: `현상금 사냥꾼에게 붙잡혀 ${placeName(p.hall)}로 끌려갔다.` }); q.place = p.hall; }
  }
}
export { endPost };

function moveQuarry(g, rng, p) {
  const to = pick(rng, hideNear(p.loc, 2).filter((k) => k !== p.loc));
  if (!to) return;
  const s = B(g), mine = s.me.hunt === p.id;
  p.loc = to; p.moved += 1;
  if (mine) {
    if (s.me.known) trailPush(p, here(g), `${J(p.name, '이/가')} 숨던 곳을 떠났다는 말이 들린다. 다시 흔적을 찾아야 한다.`);
    s.me.known = false; s.me.clue = 0;
  }
}

function ensureRivals(g, rng) {
  const s = B(g), live = s.rivals.filter((r) => !r.gone);
  while (live.length < 3) {
    const used = new Set(s.rivals.map((r) => r.name));
    const c = RIVAL_POOL.find((x) => !used.has(x.name)) ?? pick(rng, RIVAL_POOL);
    const r = { id: `r${s.seq++}`, name: c.name, nick: c.nick, style: c.style, rank: rng.int(0, 2), caught: rng.int(0, 6), since: mi(g), gone: false };
    s.rivals.push(r); live.push(r);
  }
  if (s.rivals.length > 8) s.rivals.splice(0, s.rivals.length - 8);
}

HOOKS.afterMonth.push((g) => {
  if (g.over) return;
  const s = B(g), rng = ownRng(g, 5003), t = mi(g);
  ensureRivals(g, rng);
  // 방이 붙고, 숨은 자가 옮기고, 경쟁자가 떼어 간다
  for (const hall of HALL_IDS) {
    const op = openPosts(g, hall);
    if (op.length < 3 && rng.chance(0.3)) makePost(g, rng, hall);
    // 지부마다 견습도 뗄 만한 작은 방이 하나쯤은 있다
    else if (!op.some((p) => p.need === 0) && rng.chance(0.15)) makePost(g, rng, hall, { need: 0 });
  }
  for (const p of s.posts) {
    if (p.end) continue;
    if (p.until < t) {
      endPost(g, p, 'cold');
      if (s.me.hunt === p.id) { s.me.hunt = null; blog(g, `${J(p.name, '을/를')} 쫓던 방이 거두어졌다.`); }
      continue;
    }
    if (p.pid != null && !byId(g, p.pid)?.alive) { endPost(g, p, 'gone'); if (s.me.hunt === p.id) s.me.hunt = null; continue; }
    // 내가 같은 고장에서 숨은 곳을 알아낸 사냥감은 그달엔 못 옮긴다 (궁지에 몰렸다)
    const cornered = s.me.hunt === p.id && s.me.known && p.loc === here(g);
    if (!cornered && rng.chance(0.05)) moveQuarry(g, rng, p);
    if (typeof p.by === 'string' && p.by !== 'me' && rng.chance(0.3)) {
      const r = s.rivals.find((x) => x.id === p.by);
      endPost(g, p, 'rival'); if (r) r.caught += 1;
    }
  }
  for (const r of s.rivals) {
    if (r.gone) continue;
    if (rng.chance(0.1 * STYLE[r.style].fast)) { const op = openPosts(g).filter((p) => p.need <= r.rank + 1 && (p.need >= 1 || rng.chance(0.3))); if (op.length) pick(rng, op).by = r.id; }
    if (r.caught >= 8 + r.rank * 8 && r.rank < 3 && rng.chance(0.1)) r.rank += 1;
    if (t - r.since > 240 && rng.chance(0.01)) r.gone = true;
  }
  // 끝난 지 오래된 방은 지운다
  if (s.posts.length > 60) s.posts = s.posts.filter((p) => !p.end || t - (p.endAt ?? t) < 24 || s.me.hunt === p.id);
  const me = s.me;
  if (!me.member) return;
  // 내 목에 현상금이 걸리면 조합에서 쫓겨난다
  if (wanted(g)) {
    const h = huntOf(g); if (h) h.by = null;
    Object.assign(me, { member: false, hunt: null, quitAt: t });
    blog(g, '내 목에도 현상금이 걸렸다. 조합 명부에서 이름이 지워졌다.');
    g.news.unshift({ text: '현상금 사냥꾼 조합이 내 패를 거두어 갔다. 쫓던 쪽이 쫓기는 쪽이 되었다.', rel: 100 });
    return;
  }
  // 등급
  if (me.rank < 3 && me.pts >= NEED[me.rank]) {
    me.rank += 1;
    blog(g, `${RANKS[me.rank]}를 받았다.`);
    note(g, `현상금 사냥꾼 조합에서 ${RANKS[me.rank]}를 받았다.`);
    if (me.rank >= 2) chron(g, `${g.player.name}, 현상금 사냥꾼 조합의 ${RANKS[me.rank]}가 되다.`);
    g.news.unshift({ text: `조합 서기가 내 목에 걸 새 패를 내밀었다. ${RANKS[me.rank]}. 이제 더 큰 방을 뗄 수 있다.`, rel: 100 });
  }
  if (busy(g) || L(g).travel) return;
  // 내 사냥감을 노리는 경쟁자
  const h = huntOf(g);
  if (h && t - me.rivalAt >= 8 && t - (h.takenAt ?? t) >= 1 && rng.chance(0.08)) {
    const r = pick(rng, s.rivals.filter((x) => !x.gone));
    if (r) { me.rivalAt = t; queueScene(g, 'bh_rival', { post: h.id, rival: r.id }); return; }
  }
  // 내가 잡은 사람의 식구가 찾아온다
  const k = s.kin.find((x) => !x.done && t - x.at >= 6 && t - x.at <= 60);
  if (k && t - me.kinAt >= 12 && rng.chance(k.how === 'killed' ? 0.06 : 0.03)) { me.kinAt = t; queueScene(g, 'bh_kin', { kin: k.name, of: k.of, when: k.at }); }
});

export { moveQuarry, ensureRivals, clamp, HALLS, rivalName };
