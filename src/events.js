// 사건 모듈의 입구. 실제 내용은 src/events/ 아래에 묶음별로 있다.
// (game.js와 ui.js가 예전처럼 여기서 pickEvent / resolveEvent를 가져갈 수 있게 남겨 둔 파일)
export { EVENTS, AFTER_RESOLVE, pickEvent, resolveEvent } from './events/core.js';
