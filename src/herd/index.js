// 목축과 유목 (23단계): 목동 일, 가축 장터와 시세, 내 떼 늘리기와 겨울 꼴, 가축 병, 늑대와 소도둑, 이웃 목장과의 다툼,
// 명마 혈통 기르기, 소 훔치기, 철 따라 떠도는 유목민 무리(갈색 천막·서리 갈기·털가죽)에 들기.
// beasts(짐승 다루기 기술·개), nature(혹한·가뭄), crime(reportCrime), repute(deed)와 이어진다.
import './core.js';
import './life.js';
import './events.js';
export { herdStatus, herdLine } from './status.js';
export { HD as herdState, flock, withFlock, STOCK, BANDS, bandCamp, bandsHere, newFlock, pastureOf, priceOf } from './core.js';
export { inBand, readySteed } from './life.js';
