// 6단계: 시대가 바뀌는 세계. history의 발명이 새 물건·새 일·바뀐 생활 글·시대의 사건으로 삶에 들어온다.
// 다른 갈래에서 쓸 것: invented(g, id), owns(g, id), GOODS, shopList(g), eraJobIds, ERA_JOB_NEED
import './state.js';
import './goods.js';
import './jobs.js';
import './lines.js';
import './events.js';
import './later.js'; // 34단계 뒤 시대의 물건과 일, 사라지는 옛 일
export { invented, owns, eraIdx } from './state.js';
export { GOODS, shopList, priceOf } from './goods.js';
export { eraJobIds, ERA_JOB_NEED, syncEraJobs } from './jobs.js';
export { LATE, SMALL, lateJobIds, LATE_JOB_NEED, FADING, fadeOf, fadeCut, syncLateJobs } from './later.js';
