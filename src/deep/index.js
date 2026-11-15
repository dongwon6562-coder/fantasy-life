// 8단계 큰 미궁 "깊은 구렁". 순서: core(미궁 도시·지층·마물·유물·다른 탐사대) → delve(내려가기·주점·감정소) → lord(깊은 왕) → status(화면용)
import './core.js';
import './delve.js';
import './lord.js';
export { deepStatus } from './status.js';
export { FLOORS, STRATA, RELICS, stratumOf, isGuardFloor, hasRelic, lordAlive } from './core.js';
export { supplyCost, gatesOpen, expedition, useRelic } from './delve.js';
