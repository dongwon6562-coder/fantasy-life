// 8단계: 연구와 발명. 플레이어가 공방·학자의 방·마탑에서 연구해 history의 발명을 앞당기거나 새 물건을 만든다.
// 화면에서 쓸 것: researchState(g), researchLine(g), madeThings(g)
import './state.js';
import './actions.js';
import './events.js';
import { RS, DESIGNS, nameOf, labHere, inventable, designable, INV_NAME } from './state.js';

export { RS as researchState, DESIGNS, INV_NAME, inventable, designable, labHere };
export { inventNow } from './actions.js';
// 지금 하는 연구 한 줄 (없으면 null)
export function researchLine(g) {
  const p = g.research?.project;
  if (!p) return null;
  return `${nameOf(p)} 연구 ${Math.round(p.prog * 100)}% (${p.months ?? 0}달째)`;
}
// 내가 만든 새 물건 [{ id, name, effect }]
export const madeThings = (g) => (g.research?.made ?? []).map((id) => ({ id, name: DESIGNS[id]?.name ?? id, effect: DESIGNS[id]?.effect ?? '' }));
