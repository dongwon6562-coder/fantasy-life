// 사건의 뼈대: 사건 목록, 고르기, 풀기, 그리고 사건 묶음들이 같이 쓰는 도구.
// 사건 하나의 모양:
// {
//   id, once?, cooldown?(같은 사건이 다시 나오기까지 최소 달 수, 기본 24),
//   cond(g) → bool, chance?(g) → 0~1,
//   weight: 80 이상은 '꼭 일어나야 하는 사건'(사건 줄기의 다음 단계, 찾아가기 대화 등). 가장 무거운 것이 먼저 일어난다.
//           80 미만은 무게에 비례해 무작위로 고르고, 매달 일어나지는 않는다(EVENT_RATE).
//   prepare?(g, rng) → ctx (사건에 나올 사람 등을 미리 정한다. text와 run에 넘어간다),
//   title, text(g, ctx), choices: [{ label(글 또는 (g, ctx) → 글), show?(g, ctx), run(g, rng, ctx) → 결과 글 }],
//   village?: true  마을(에른)에서만 일어나는 사건 (index.js에서 표시)
//   world?: true    세계에 묶인 한 번뿐인 사건 (국상, 시대 변화 등). 대를 이어도 다시 나오지 않는다.
//   noFlag?: true   once여도 표시를 남기지 않는다 (조건으로 되풀이를 막는 사건. D의 장면이 밀어내지 못하게 once를 쓸 때)
//   quiet?: true    결과를 연대기·인물 기록에 남기지 않는다
//   선택지 run 안에서 game.pendingEvent를 새로 세우면 그 사건이 곧바로 이어서 뜬다.
// }
import { playerAge, playerAgeMonths, family, me } from '../game.js';
import { living as livingAll, byId, ageYears, fullName } from '../npc.js';
import { HOOKS } from '../hooks.js';

export const EVENTS = [];
// 사건 하나를 고르고 난 뒤 창이 비었을 때 부르는 것들 (밀린 장면을 이어 띄우기 등)
export const AFTER_RESOLVE = [];

// ---------- 장소 ----------
// 사람마다 place가 있다(없으면 에른). 사건에 나오는 사람은 지금 내가 있는 곳의 사람이다.
// (adventure/core.js의 L(g)와 같은 g.life를 읽는다. 서로 import하면 순환이 생겨 직접 읽음)
export const here = (g) => g.life?.place ?? 'ern';
export const onRoad = (g) => !!g.life?.travel;
export const inVillage = (g) => here(g) === 'ern' && !onRoad(g);
export const local = (g, p) => (p.place ?? 'ern') === here(g);
export const living = (g) => livingAll(g).filter((p) => local(g, p));

// ---------- 공용 도구 ----------
export const flag = (g, k) => (g.flags ??= {})[k];
export const setFlag = (g, k, v = true) => { (g.flags ??= {})[k] = v; };
export const fam = (g) => family(g).id;
export const father = (g) => byId(g, g.player.familyIds[0]);
export const mother = (g) => byId(g, g.player.familyIds[1]);
export const alive = (p) => !!p && p.alive && !p.away;
export const age = (g) => playerAge(g);
export const ageM = (g) => playerAgeMonths(g);
export const monthIndex = (g) => g.date.year * 12 + (g.date.month - 1);
export const season = (g) => (g.date.month <= 2 || g.date.month === 12 ? 'winter' : g.date.month <= 5 ? 'spring' : g.date.month <= 8 ? 'summer' : 'autumn');
export const isFamily = (g, p) => g.player.familyIds.includes(p.id);
export const siblings = (g) => g.player.familyIds.slice(2).map((id) => byId(g, id)).filter(alive);
export const findJob = (g, job) => living(g).find((p) => p.job === job && !p.isPlayer);
export const peers = (g, span = 3) => living(g).filter((p) => !p.isPlayer && !isFamily(g, p)
  && Math.abs(ageYears(p) - playerAge(g)) <= span);
export const friends = (g, min = 15) => peers(g, 4).filter((p) => p.known && p.affection >= min);
export const bestFriend = (g) => friends(g).sort((a, b) => b.affection - a.affection)[0] ?? null;
export const stat = (g, id) => g.player.stats[id];
export const skill = (g, id) => g.player.skills[id];
export const money = (g) => g.player.money;
export const spend = (g, n) => { g.player.money = Math.max(0, g.player.money - n); };
export const spendFamily = (g, n) => { g.player.familyMoney = Math.max(0, g.player.familyMoney - n); };
export const stress = (g, n) => { g.player.stress = Math.max(0, g.player.stress + n); };
export const tire = (g, n) => { g.player.fatigue = Math.max(0, g.player.fatigue + n); };
export const like = (p, n) => { if (p) { p.known = true; p.affection += n; } };
export const note = (g, p, text) => p?.history.push({ y: g.date.year, m: g.date.month, text });
export const injure = (g, name, months) => g.player.injuries.push({ name, months });
// 능력 판정: 값이 높을수록 성공 확률이 높다
export const check = (rng, value, difficulty) => rng.chance(Math.max(0.05, Math.min(0.95, 0.5 + (value - difficulty) / 40)));
export const nm = (p, fallback = '누군가') => p?.name ?? fallback;
export { fullName, ageYears, byId, me };

// 받침에 맞는 조사: josa('한스', '이', '가') → '한스가'
export function josa(word, withFinal, withoutFinal) {
  const ch = String(word).charCodeAt(String(word).length - 1);
  const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
  return word + (has ? withFinal : withoutFinal);
}

// ---------- 사건 줄기(체인): 몇 달에 걸쳐 이어지는 이야기 ----------
// g.chains[id] = { step, at(이 달 이후에 다음 단계), data }
export const chain = (g, id) => (g.chains ??= {})[id];
export function startChain(g, id, step, delay, data = {}) {
  (g.chains ??= {})[id] = { step, at: monthIndex(g) + delay, data };
}
export function nextStep(g, id, step, delay, patch = {}) {
  const c = chain(g, id);
  if (!c) return;
  c.step = step; c.at = monthIndex(g) + delay; Object.assign(c.data, patch);
}
export function endChain(g, id, outcome = 'done') {
  delete (g.chains ??= {})[id];
  setFlag(g, 'chain_' + id, outcome);
}
export const chainAt = (g, id, step) => { const c = chain(g, id); return !!c && c.step === step && monthIndex(g) >= c.at; };
export const chainDone = (g, id) => flag(g, 'chain_' + id);

// ---------- 고르기와 풀기 ----------
// 한 달에 사건은 많아야 하나. 꼭 일어나야 하는 사건(weight ≥ URGENT)이 먼저고,
// 나머지는 무게에 따라 무작위로 고르되 매달 일어나지는 않는다.
const onceKey = (e) => (e.world ? 'world_ev_' : 'ev_') + e.id;

export const EVENT_RATE = 0.6;
export const URGENT = 80;

export function pickEvent(game, rng) {
  const now = monthIndex(game);
  const last = (game.evLast ??= {});
  const seen = (game.evSeen ??= {});
  const cands = EVENTS.filter((e) => {
    if (e.once && flag(game, onceKey(e))) return false;
    if (e.village && !inVillage(game)) return false;
    if (onRoad(game) && !e.road && !e.id.startsWith('chain_')) return false;
    // 이미 여러 번 본 사건은 다시 나오기까지 더 오래 걸린다 (18단계 헤드: 한 집안이 백 년 사는 동안 같은 글을 서른 번 넘게 보던 것)
    if (!e.once && last[e.id] != null && now - last[e.id] < (e.cooldown ?? 24) * (e.weight >= URGENT ? 1 : 1 + 0.5 * Math.min(6, seen[e.id] ?? 0))) return false;
    let ok = false;
    try { ok = !!e.cond(game); } catch { ok = false; }
    if (!ok) return false;
    if (e.chance && !rng.chance(e.chance(game))) return false;
    return true;
  });
  if (!cands.length) return null;
  const urgent = cands.filter((e) => e.weight >= URGENT).sort((a, b) => b.weight - a.weight);
  let e = urgent[0];
  if (!e) {
    if (!rng.chance(EVENT_RATE)) return null;
    e = rng.weighted(cands, (x) => x.weight / (1 + 0.25 * Math.min(8, seen[x.id] ?? 0)));
  }
  const ctx = e.prepare ? e.prepare(game, rng) ?? {} : {};
  const shown = e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.show || c.show(game, ctx));
  last[e.id] = now;
  if (!e.once && e.weight < URGENT) seen[e.id] = (seen[e.id] ?? 0) + 1;
  return {
    id: e.id, title: e.title, text: e.text(game, ctx),
    choices: shown.map(({ c }) => (typeof c.label === 'function' ? c.label(game, ctx) : c.label)), choiceIdx: shown.map(({ i }) => i), ctx,
  };
}

export function resolveEvent(game, rng, index) {
  const pe = game.pendingEvent;
  if (!pe) return null;
  const e = EVENTS.find((x) => x.id === pe.id);
  if (!e) { game.pendingEvent = null; return null; }
  const real = pe.choiceIdx ? pe.choiceIdx[index] ?? pe.choiceIdx[0] : index;
  const c = e.choices[real] ?? e.choices[0];
  const out = c.run(game, rng, pe.ctx ?? {}) ?? '';
  if (e.once && !e.noFlag) setFlag(game, onceKey(e));
  // 선택지가 곧바로 다음 장면을 세웠으면(결투의 다음 합, 시험의 다음 관문) 그대로 둔다
  if (game.pendingEvent === pe) game.pendingEvent = null;
  if (!game.pendingEvent) for (const f of AFTER_RESOLVE) { try { f(game); } catch (err) { console.error(err); } if (game.pendingEvent) break; }
  if (e.quiet) return out; // 결투 한 합 한 합은 기록에 남기지 않는다 (끝날 때 한 번만)
  const record = { y: game.date.year, m: game.date.month, text: `${pe.title}: ${out}`, rel: 100 };
  game.chronicle.push(record);
  me(game).history.push({ y: game.date.year, m: game.date.month, text: `${pe.title}. ${out}` });
  return out;
}

// 대를 이으면 사건 줄기는 새로 시작한다 (부모의 병, 빚 같은 건 그 사람의 이야기였으니)
HOOKS.heir?.push((g) => { g.chains = {}; if (g.evSeen) for (const k in g.evSeen) { g.evSeen[k] = Math.floor(g.evSeen[k] / 2); if (!g.evSeen[k]) delete g.evSeen[k]; } }); // 대가 바뀌면 본 횟수는 반으로 (새 사람에게는 새 일이지만 같은 글이 바로 또 뜨지 않게)
