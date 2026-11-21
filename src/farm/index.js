// 내 농장 일구기 (25단계): 밭 사고 늘리기, 소작 주고 받기, 작물과 돌려짓기, 씨앗, 품꾼과 소, 곳간과 장터, 물길 다툼, 대를 잇는 땅.
import './core.js';
import './life.js';
import './events.js';
export { farmStatus, farmLine } from './status.js';
export { FM as farmState, farm, atFarm, newFarm, newField, CROPS, SEEDS, cropPrice, fieldPrice, barnTotal, capacity } from './core.js';
export { eligible as farmEvents, fieldYield, ripeAt } from './life.js';
