// 9단계 집과 재산. 순서: core(상태·장부) → manage(집·세놓기·불과 도둑) → money(빚·투자·빚쟁이·파산) → status(화면용)
import './core.js';
import './manage.js';
import './money.js';
export { estateStatus } from './status.js';
export { E, HOME_LEVELS, LENDERS, RENT_KINDS, homeOf, homeWorth, netWorth, debtTotal } from './core.js';
export { sellHome } from './manage.js';
export { canBorrow, bankruptcy } from './money.js';
