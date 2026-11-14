// 7단계: 세계의 큰 인물들. 십강과 그 둘레의 이름들이 history 안에서 살고 움직이며 플레이어와 얽힌다.
// 화면에서 쓸 것: tenGreats(g), legendsOf(g), legendLine(x), playerRank(g)
import './state.js';
import './world.js';
import './events.js';
import './actions.js';
import { LG, legend, legendName, playerScore } from './state.js';
import { placeName } from './world.js';

export { LG, legend, legendName, playerScore };
export { ranking } from './world.js';

const ROLE = { master: '스승', foe: '적', patron: '은인' };
// 십강: 지난 발표 순서대로 [{ rank, id, name, title, place, role, isPlayer }]
export function tenGreats(g) {
  const lg = LG(g);
  return (lg.ranks ?? []).map((id, i) => {
    if (id === 'player') return { rank: i + 1, id, name: g.player.name, title: '', place: null, role: null, isPlayer: true };
    const x = legend(g, id);
    if (!x) return null;
    return { rank: i + 1, id, name: x.name, title: x.title, place: x.hidden ? null : placeName(x.at), role: ROLE[x.role] ?? null, alive: x.alive, isPlayer: false };
  }).filter(Boolean);
}
// 플레이어가 알거나 얽힌 큰 인물 (죽은 사람 포함)
export const legendsOf = (g) => LG(g).list.filter((x) => x.met || x.role || x.seen);
export const legendLine = (x) => `${legendName(x)}${x.alive ? '' : ' (죽음)'}${x.role ? ` · 나의 ${ROLE[x.role]}` : ''}`;
export const playerRank = (g) => LG(g).playerRank ?? null;
