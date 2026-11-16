// 장사 길과 상단 (14단계): 고장마다 다른 시세, 사고팔기, 대상단, 도적과 통행세, 큰 상회, 맞수 상단.
import './core.js';
import './market.js';
import './road.js';
import './house.js';
import './events.js';
export { tradeStatus } from './status.js';
export {
  T, GOODS, GOOD_IDS, LOCAL, CARAVAN_TOWNS, TOLLS, HOUSE_RANKS, CAP, UPKEEP, WAGON_COST, isMarket, priceAt, buyAt, sellAt,
  cargoQty, cargoValue, capacity, addCargo, loseCargo, banditChance, tollRate, tollOf, remember, bestKnown,
} from './core.js';
export { caravanPower } from './road.js';
export { houseCompany, houseIncome, FOUND_HOUSE, FOUND_PROFIT, RIVAL_EVENTS } from './house.js';
export { TRADE_EVENTS, TRADE_EVENT_IDS } from './events.js';
