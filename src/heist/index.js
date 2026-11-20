// 큰 한탕 (22단계): 여러 달에 걸친 계획 범죄. 목표 고르기(상단 금고·귀족 저택·신전 보물고·왕실 세금 수레), 사람 모으기와 역할,
// 정찰과 준비, 결행의 밤과 당일 변수, 몫 나누기와 배신, 장물 처분, 뒤쫓는 사람들, 앙심 품은 옛 일행.
// crime(솜씨·감옥·죄 기록)·underworld(조직 연줄)·repute(deed)와 이어진다.
import './core.js';
import './life.js';
import './events.js';
export { heistStatus, heistLine } from './status.js';
export { H as heistState, plan as heistPlan, atTarget, KINDS, ROLES, readiness, newTarget, newPlan, newMate } from './core.js';
export { targetsFor, candidates, canPlot, canGo, finishNight, PREPS, APPROACHES, SPLITS } from './life.js';
