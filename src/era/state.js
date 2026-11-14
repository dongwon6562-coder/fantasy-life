// 시대가 바뀌는 세계: history의 발명(g.history.inventions)이 실제 삶에 들어오는 자리.
// 새 물건(장터), 새 일(점등꾼·신호수·마도구 수리공...), 바뀐 생활 글, 시대의 사건.
// 상태는 g.era 하나: 가진 물건과 그 수.
import { HOOKS } from '../hooks.js';

export const E = (g) => (g.era ??= { goods: {} });
export const invented = (g, id) => !!g.history?.inventions?.includes(id);
export const eraIdx = (g) => g.realm?.era ?? 0;
export const owns = (g, id) => (E(g).goods[id] ?? 0) > 0;

HOOKS.newGame.push((g) => { g.era = { goods: {} }; });
HOOKS.migrate.push((g) => { if (!g.era) g.era = { goods: {} }; });
// 물건은 집안에 남는다: 대를 이어도 그대로 (등잔·화로·쟁기는 물려받는 것)
