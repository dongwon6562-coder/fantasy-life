// 내기와 겨루기 (15단계): 주사위·카드 도박과 빚, 노름 버릇, 투기장, 고장 대회(활쏘기·마상 시합·씨름·사냥), 승부 조작.
import './core.js';
import './gamble.js';
import './arena.js';
import './fair.js';
export { contestStatus } from './status.js';
export { C, itchWord, bannedAt, ban } from './core.js';
export { GAMBLE_LOAN, stakes, cardOdds } from './gamble.js';
export { ARENAS, ARENA_TIERS, PRIZE, tierOf } from './arena.js';
export { FAIRS, FAIR_IDS, fairHere, canJoust } from './fair.js';
