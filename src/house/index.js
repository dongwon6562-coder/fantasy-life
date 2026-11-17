// 내 집 마련과 살림 (17단계): 셋방에서 오두막·집·넓은 집·저택으로, 짓기·고쳐 짓기, 방과 살림, 이웃 다툼·옆집 불·밤손님, 대를 넘는 집과 판 집 되사기, 이사.
// 잠자리(places.js life.home/houses)와 집의 낡음·넓이·하인·세(estate) 위에 얹는다.
import './core.js';
import './build.js';
import './life.js';
import './move.js';
export { houseStatus } from './status.js';
export { H, ROOMS, ROOM_IDS, recOf, roomCap, hutOk, valueAt } from './core.js';
export { BUILDS, buildCost, buybackCost } from './build.js';
export { loseHome } from './life.js';
export { household, destinations, moveCost } from './move.js';
