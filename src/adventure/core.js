// 갈래 D(성인 이후 삶·모험·대 잇기)의 공통 바탕.
// - game.life: 사는 곳, 직업, 소속, 장비, 미궁 기록, 가계 같은 성인 이후 상태
// - 장면(scene): 고를 것이 있는 행동(일자리, 이사, 의뢰, 미궁…)을 사건 창으로 보여 주는 장치.
//   사건 창(game.pendingEvent)과 resolveEvent를 그대로 쓰므로 화면 코드를 고칠 필요가 없다.
import { HOOKS } from '../hooks.js';
import { EVENTS, AFTER_RESOLVE } from '../events.js';
import { me, playerAge } from '../game.js';

export function defaultLife() {
  return {
    v: 1,
    place: 'ern',      // 지금 사는 곳 (places.js)
    home: 'family',    // family 부모님 집 | inn 여관 | rent 셋방 | own 자기 집 | barracks 숙소 | street 노숙
    travel: null,      // { to, left } 길 위에 있을 때
    job: null,         // { id, place, months, merit } 지금 하는 일 (jobs.js / factions.js)
    fac: {},           // 소속: { guild: { rank, merit }, knights: { order, rank, merit }, ... }
    gear: { weapon: 0, armor: 0, weaponName: null, armorName: null },
    renown: 0,         // 이름이 알려진 정도
    notoriety: 0,      // 악명
    nemeses: [],       // 나를 기억하는 적 { id, name, unit, power, grudge, place }
    dungeons: {},      // { [id]: { deepest, cleared, visits } }
    houses: [],        // 가진 집의 장소 id
    placeNpcs: {},     // 장소마다 만들어 둔 사람 { [place]: [ids] }
    queue: [],         // 보여 줄 장면 대기열
    scene: null,       // 지금 사건 창에 떠 있는 장면
    gen: 1,            // 몇 대째인가
    ancestors: [],     // 앞 세대 { name, lastName, born, died, age, cause, summary }
    stats: { kills: 0, fights: 0, quests: 0 },
  };
}

export function L(game) {
  if (!game.life) game.life = defaultLife();
  return game.life;
}

HOOKS.newGame.push((g) => { g.life = defaultLife(); });
HOOKS.migrate.push((g) => {
  const d = defaultLife();
  g.life = Object.assign(d, g.life ?? {});
  g.life.gear = Object.assign(d.gear, g.life.gear);
  g.life.stats = Object.assign({ kills: 0, fights: 0, quests: 0 }, g.life.stats);
});

/* ---------- 작은 도우미 ---------- */
export const isAdult = (g) => playerAge(g) >= 15;
export const traveling = (g) => !!L(g).travel;
export const note = (g, text) => me(g).history.push({ y: g.date.year, m: g.date.month, text });
export const chron = (g, text, rel = 100) => g.chronicle.push({ y: g.date.year, m: g.date.month, text, rel });
// 이번 달 소식 맨 위에 덧붙이기 (endOfMonth 이후에 부르면 바로 보인다)
export const newsNow = (g, text) => { g.news.unshift({ text, rel: 100 }); };
export const tired = (g, n) => { g.player.fatigue = Math.max(0, Math.min(100, g.player.fatigue + n)); };
export const stress = (g, n) => { g.player.stress = Math.max(0, Math.min(100, g.player.stress + n)); };
export const up = (name, v) => (v > 0.04 ? `${name} +${v.toFixed(1)}` : null);
export const gains = (arr) => { const s = arr.filter(Boolean).join(', '); return s ? ` (${s})` : ''; };
export function spend(g, n) {
  const p = g.player;
  if (p.money >= n) { p.money -= n; return true; }
  // 부모님 집에 사는 동안에는 집안 돈에서 보탤 수 있다
  if (L(g).home === 'family' && p.money + p.familyMoney >= n) { p.familyMoney -= n - p.money; p.money = 0; return true; }
  return false;
}
export const canSpend = (g, n) => g.player.money >= n || (L(g).home === 'family' && g.player.money + g.player.familyMoney >= n);
// 능력 판정: 값이 높을수록 성공 확률이 높다
export const check = (rng, value, difficulty) => rng.chance(Math.max(0.05, Math.min(0.95, 0.5 + (value - difficulty) / 40)));

/* ---------- 장면 ---------- */
// defineScene(kind, { title(g,s), text(g,s), choices(g,s) -> [{ label, key }], resolve(g, rng, s, key) -> 글 })
const SCENES = {};
export const SCENE_ID = 'life_scene';
export function defineScene(kind, def) { SCENES[kind] = def; }
const monthNo = (g) => g.date.year * 12 + g.date.month;
export function queueScene(g, kind, data = {}, { first = false } = {}) {
  const s = { kind, at: kind === 'road' ? null : L(g).place, t: monthNo(g), ...data };
  if (first) L(g).queue.unshift(s); else L(g).queue.push(s);
}
export const sceneQueued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;

// 장면이 깨졌을 때(조건이 바뀌어 글이나 선택지를 못 만들 때) 멈추지 않고 그 장면을 버린다.
// 점검 도구는 SCENE_STRICT.on = true로 켜서 깨진 장면을 오류로 본다.
export const SCENE_STRICT = { on: false };
// def.need(g, s)가 거짓이면 그 장면은 띄우지 않고 버린다 (예: 영지 장면인데 영지가 없어졌을 때)

// 장면을 사건 창에 띄운다. force면 떠 있던 사건을 밀어낸다.
export function showScene(g, s, opt = {}) { return tryShow(g, s, opt) === 'ok'; }

// 'ok' 띄웠다 | 'wait' 다른 사건이 떠 있어 기다린다 | 'drop' 띄울 수 없는 장면이라 버린다
function tryShow(g, s, { force = false } = {}) {
  const life = L(g);
  let def = SCENES[s.kind];
  if (!def) return 'drop';
  const pe = g.pendingEvent;
  if (pe && !force) {
    // 떠 있는 사건이 먼저다. 장면은 그 사건을 고른 뒤 이어서 뜬다 (AFTER_RESOLVE).
    // 예전에는 되풀이되는 사건이 장면에 자리를 내주어, 장면이 많은 어른 삶에서 세상 사건이 한 해 두 번도 안 나왔다.
    return 'wait';
  }
  let choices, title, text;
  try {
    if (def.need && !def.need(g, s)) return 'drop';
    choices = def.choices(g, s);
    // 장면이 스스로 다른 종류로 바뀔 수 있다 (예: 길 위의 일 → 싸움)
    if (SCENES[s.kind] && SCENES[s.kind] !== def) { def = SCENES[s.kind]; choices = def.choices(g, s); }
    choices = (choices ?? []).slice(0, 8);
    if (!choices.length) return 'drop';
    title = def.title(g, s);
    text = def.text(g, s);
  } catch (e) {
    if (SCENE_STRICT.on) throw e;
    return 'drop';
  }
  if (force && life.scene && life.scene !== s) life.queue.unshift(life.scene);
  s.choices = choices;
  life.scene = s;
  g.pendingEvent = { id: SCENE_ID, title, text, choices: choices.map((c) => c.label) };
  return 'ok';
}

function resolveScene(g, rng, i) {
  const life = L(g);
  const s = life.scene;
  life.scene = null;
  if (!s) return '';
  const c = s.choices?.[i] ?? s.choices?.[0];
  const def = SCENES[s.kind];
  if (!def || !c) return '';
  try {
    const out = def.resolve(g, rng, s, c.key) || '';
    if (g.player.money < 0) { if (SCENE_STRICT.on) throw new Error(`돈이 음수가 됨: ${s.kind}/${c.key} ${g.player.money}`); g.player.money = 0; }
    return out;
  } catch (e) {
    if (SCENE_STRICT.on) throw e;
    return '그 일은 흐지부지 끝났다.';
  }
}

// resolveEvent가 찾을 수 있게 사건 목록에 자리를 하나 만든다 (조건은 늘 거짓이라 저절로 뽑히지 않는다)
EVENTS.push({
  id: SCENE_ID,
  cond: () => false,
  weight: 0,
  title: '',
  text: () => '',
  choices: Array.from({ length: 8 }, (_, i) => ({ label: '', run: (g, rng) => resolveScene(g, rng, i) })),
});

// 한 달 끝: 대기열의 장면을 하나 띄운다
HOOKS.endOfMonth.push((g) => {
  if (g.over) return;
  const life = L(g);
  if (life.scene) {
    // 불러온 저장 등에서 장면이 사건 창과 어긋났으면 다시 띄운다
    if (g.pendingEvent?.id !== SCENE_ID) { const s = life.scene; life.scene = null; life.queue.unshift(s); } else return;
  }
  life.shown = { t: monthNo(g), n: 0 };
  showNextQueued(g);
});

// 한 달에 띄우는 장면 수. 하나씩만 띄우면 여러 갈래 장면이 몇 달씩 밀려, 내가 고른 일의 결과가 늦게 왔다.
export const SCENES_PER_MONTH = 3;
// 이만큼 묵은 장면은 철 지난 일이라 버린다 (def.keep이면 남긴다)
export const SCENE_STALE = 6;
function showNextQueued(g) {
  const life = L(g);
  const now = monthNo(g);
  while (life.queue.length) {
    const s = life.queue[0];
    // 그 사이 다른 곳으로 떠났다면 그곳에서 고르려던 일은 없던 일이 된다
    if (!SCENES[s.kind] || (s.at && (s.at !== life.place || life.travel))) { life.queue.shift(); continue; }
    if (s.t != null && now - s.t > SCENE_STALE && !SCENES[s.kind].keep && !s.keep) { life.queue.shift(); continue; }
    const r = tryShow(g, s);
    if (r === 'wait') break;
    life.queue.shift();
    if (r === 'ok') { if (life.shown?.t === now) life.shown.n += 1; break; }
  }
}

// 장면이나 사건 하나를 끝내고 창이 비면, 이번 달 몫이 남았을 때 밀린 장면을 이어 띄운다
AFTER_RESOLVE.push((g) => {
  if (g.over || !g.life) return;
  const life = L(g);
  if (life.scene || !life.queue.length || life.heirPending) return;
  const now = monthNo(g);
  if (life.shown?.t !== now) life.shown = { t: now, n: 0 };
  if (life.shown.n >= SCENES_PER_MONTH) return;
  showNextQueued(g);
});

// 사건 창에 떠 있던 장면을 다른 사건이 덮어썼다면 장면 상태를 정리한다
HOOKS.afterActions.push((g) => {
  const life = L(g);
  if (life.scene && g.pendingEvent?.id !== SCENE_ID) life.scene = null;
});
export { SCENES };
