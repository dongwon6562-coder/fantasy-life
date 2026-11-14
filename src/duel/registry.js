// 결투가 끝났을 때 부를 함수 모음. (서로 import하는 모듈 사이에서 먼저 준비돼야 해서 따로 둔다)
export const ENDS = {};
export function registerDuelEnd(kind, fn) { ENDS[kind] = fn; }
// 행동(한 달 계획) 안에서는 바로 결투를 띄울 수 없으니 달 끝에 띄운다
export function queueDuel(g, opts) { g.duelQueued = opts; }
