// 밑바닥에서 살기 (18단계): 구걸, 무료 급식과 구빈원, 빈민가 사람들, 날품팔이, 굶주림, 빚 노예와 빚 갚기, 다시 일어서기,
// 넉넉해지면 밑바닥 사람을 돕거나(동냥·급식·구빈원) 부리기(품삯 깎기·빚으로 묶기).
// 잠자리 'street'(places), 집(house·estate), 조직(underworld) 위에 얹는다.
import './core.js';
import './life.js';
import './bond.js';
import './rich.js';
export { poorStatus, poorLine } from './status.js';
export { P, SLUMS, POORHOUSES, SLUM_FOLK, isSlum, hasPoorhouse, broke, onStreet } from './core.js';
export { BOND_KINDS, bondKindAt, bondOf } from './bond.js';
export { ALMS, BIND_COST, bondsmenOf } from './rich.js';
