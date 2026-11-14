// 어린 시절(0~15살)의 기억. 무엇을 하며 자랐는지, 누구와 친했는지, 무엇을 잃었는지.
// 상태는 g.childhood 하나. 대를 이으면 새 아이의 것으로 바뀐다.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { playerAge } from '../game.js';
import { byId } from '../npc.js';

export const CH = (g) => (g.childhood ??= fresh());
export function fresh() {
  return {
    counts: {},          // 어릴 때 고른 행동 { play: 34, study: 12, ... }
    friend: null,        // 소꿉친구 id
    bestie: { stage: 0, at: 0, den: null, quarrel: null, promise: null, parted: null },
    school: { stage: 0, recite: null, letter: null },
    tastes: {},          // 견습 맛보기 { smith: 1, hunter: 1 }
    duty: null,          // 집안 일 줄기의 결과
    firstDeath: null,    // { id, name, rel, grief }
    knownAs: null,       // 마을이 기억하는 아이: wild, bookish, worker, blade, mage, forest, gentle, self
  };
}
export const monthIdx = (g) => g.date.year * 12 + (g.date.month - 1);
export const bestie = (g) => { const id = CH(g).friend; const p = id != null ? byId(g, id) : null; return p && p.alive ? p : null; };
export const tastedJobs = (g) => Object.keys(CH(g).tastes);
export const knownAs = (g) => CH(g).knownAs;

// 마을이 기억하는 아이: 어릴 때 가장 많이 한 일로 정한다
export const KNOWN = {
  wild: { name: '들판을 쏘다니던 아이', acts: ['play', 'wander'] },
  bookish: { name: '예배당 맨 앞자리의 아이', acts: ['study'] },
  worker: { name: '어른 몫을 하던 아이', acts: ['help_home', 'day_labor', 'inn_kitchen'] },
  blade: { name: '목검을 놓지 않던 아이', acts: ['sword_father', 'sword_guard', 'train_body', 'sword_school_train', 'sword_spar'] },
  mage: { name: '눈을 감고 앉아 있던 아이', acts: ['meditate', 'magic_lesson', 'spell_study', 'magic_selfstudy'] },
  forest: { name: '숲 냄새가 나던 아이', acts: ['herbs'] },
  gentle: { name: '남의 집 문을 두드리던 아이', acts: ['visit'] },
};
export function knownOf(g) {
  const c = CH(g).counts;
  let best = null, bestN = 0;
  for (const [k, v] of Object.entries(KNOWN)) {
    const n = v.acts.reduce((s, a) => s + (c[a] ?? 0), 0);
    if (n > bestN) { best = k; bestN = n; }
  }
  return best ?? 'wild';
}

// 어릴 때 고른 행동을 센다 (결과의 이름으로 행동을 찾는다)
const byName = () => Object.fromEntries(ACTIONS.map((a) => [a.name, a.id]));
let NAME_TO_ID = null;
HOOKS.afterActions.push((g, rng, results) => {
  if (playerAge(g) >= 15) return;
  NAME_TO_ID ??= byName();
  const c = CH(g).counts;
  for (const r of results) {
    const id = NAME_TO_ID[r.name] ?? (NAME_TO_ID = byName())[r.name];
    if (id) c[id] = (c[id] ?? 0) + 1;
  }
});

HOOKS.newGame.push((g) => { g.childhood = fresh(); });
// 이미 어른이면 어린 시절 줄기를 건너뛴다
function grownUp(g) {
  const c = fresh();
  if (playerAge(g) >= 15) { c.knownAs = 'self'; c.bestie.stage = 9; c.school.stage = 9; c.duty = 'skip'; c.firstDeath = { skip: true }; }
  return c;
}
HOOKS.migrate.push((g) => { if (!g.childhood) g.childhood = grownUp(g); });
// 대를 이은 자식: 아이면 새로 자라고, 이미 어른이면 건너뛴다
HOOKS.heir?.push((g) => { g.childhood = grownUp(g); });
