// 27단계 불로의 뼈대 (헤드). 여러 갈래가 각자 '불로가 되는 길'을 만들고, 몸이 늙지 않는 규칙과 상태는 여기 하나에 둔다.
// 불로는 '늙지 않을 뿐'이다. 칼·병·굶주림으로는 여전히 죽는다. 고르게 한 나이에서 몸 나이가 멈춘다.
//
// 상태 g.ageless = {
//   path: 지금 플레이어가 걸은 길 id | null, since: 불로가 된 달(monthIndex), at: 멈춘 몸 나이,
//   names: [{ name, y }] 바꿔 쓴 이름들 (불로가 된 뒤의 삶 갈래가 씀),
//   lost: [{ path, y, why }] 잃었거나 내려놓은 불로 (대를 넘어 남는 집안 이야기),
//   paths: { 길 id: 그 길 갈래가 마음대로 쓰는 진척 객체 } (대 잇기 때 비운다. 대를 넘는 건 각 갈래가 world_ 플래그나 자기 상태로),
// }
// 사람마다 p.agelessAt(멈춘 몸 나이)를 둔다. NPC도 불로일 수 있다 (노아, 그릇 옮기기의 옛 주인 등).
//
// 길 등록: registerAgelessPath('seventh', { name: '일곱째 서클', kind: 'free'|'price'|'forbidden', owner: '도우미스레드3',
//   blurb: '화면에 한 줄', onLose?(g, why) }).
// 불로가 되기: makeAgeless(g, 'seventh', { at?: 멈출 몸 나이(기본 지금), note?: 연대기에 남길 글 })
// 잃기·내려놓기: loseAgeless(g, why) → 그 자리부터 다시 늙는다 (밀린 세월을 한꺼번에 받게 하려면 갈래가 p.ageMonths를 직접 늘린다).
import { getBodyAge, setBodyAge, ageYears, bodyAgeOf } from '../npc.js';
import { me } from '../game.js';
import { HOOKS } from '../hooks.js';

export const AGELESS_PATHS = {};
export function registerAgelessPath(id, def) { AGELESS_PATHS[id] = { id, kind: 'free', ...def }; }

const mi = (g) => g.date.year * 12 + (g.date.month - 1);
export function AG(g) {
  const a = (g.ageless ??= {});
  a.path ??= null; a.since ??= null; a.at ??= null;
  a.names ??= []; a.lost ??= []; a.paths ??= {};
  return a;
}
export const pathState = (g, id) => (AG(g).paths[id] ??= {});

// 몸 나이 규칙을 감싼다: 불로인 사람은 멈춘 나이를 넘지 않는다 (races가 먼저 얹은 규칙 위에)
const prev = getBodyAge();
setBodyAge((p) => { const b = prev(p); return p.agelessAt != null ? Math.min(b, p.agelessAt) : b; });

export const isAgeless = (p) => !!p && p.agelessAt != null;
export const playerAgeless = (g) => isAgeless(me(g));
export const agelessYears = (g) => (AG(g).since == null ? 0 : Math.floor((mi(g) - AG(g).since) / 12));

export function makeAgeless(g, path, { at, note } = {}) {
  const p = me(g);
  if (!p || isAgeless(p)) return false;
  const a = AG(g);
  p.agelessAt = Math.max(16, Math.floor(at ?? bodyAgeOf(p)));
  a.path = path; a.since = mi(g); a.at = p.agelessAt;
  const text = note ?? `몸이 ${p.agelessAt}살에서 멈췄다. ${AGELESS_PATHS[path]?.name ?? '알 수 없는 길'}.`;
  p.history?.push({ y: g.date.year, m: g.date.month, text });
  g.chronicle?.push({ y: g.date.year, m: g.date.month, text, rel: 100 });
  return true;
}

export function loseAgeless(g, why = '') {
  const p = me(g), a = AG(g);
  if (!isAgeless(p)) return false;
  const path = a.path;
  try { AGELESS_PATHS[path]?.onLose?.(g, why); } catch (e) { console.error(e); }
  a.lost.push({ path, y: g.date.year, why });
  delete p.agelessAt;
  a.path = null; a.since = null; a.at = null;
  return true;
}

// NPC를 불로로 (노아 같은 사람). 플레이어 상태는 건드리지 않는다.
export function makeNpcAgeless(p, at) { if (p) p.agelessAt = Math.floor(at ?? bodyAgeOf(p)); }

// 화면용: 불로가 아니고 잃은 적도 없으면 null
export function agelessInfo(g) {
  const a = AG(g), p = me(g);
  if (!isAgeless(p) && !a.lost.length) return null;
  const def = AGELESS_PATHS[a.path];
  return {
    ageless: isAgeless(p), path: a.path, pathName: def?.name ?? null, kind: def?.kind ?? null, blurb: def?.blurb ?? null,
    at: p?.agelessAt ?? null, realAge: p ? ageYears(p) : null, years: agelessYears(g),
    names: a.names.map((x) => ({ ...x })), lost: a.lost.map((x) => ({ ...x, pathName: AGELESS_PATHS[x.path]?.name ?? x.path })),
  };
}

// 대 잇기: 불로는 그 사람의 것이다. 자식에게 넘어가지 않는다. 잃은 기록은 집안 이야기로 남긴다.
HOOKS.heir?.push((g) => {
  const a = AG(g);
  a.path = null; a.since = null; a.at = null; a.names = []; a.paths = {};
  if (a.lost.length > 12) a.lost = a.lost.slice(-12);
});
