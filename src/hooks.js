// 확장 지점. 각 기능 모듈은 자기 파일에서 여기에 함수를 등록한다.
// game.js를 직접 고치지 않고도 한 달 흐름에 끼어들 수 있게 하려는 것.
export const HOOKS = {
  newGame: [],     // (game, rng) 새 게임을 만든 직후: 기본값 채우기
  migrate: [],     // (game) 저장을 불러온 직후: 예전 저장에 새 필드 채우기
  afterActions: [],// (game, rng, results) 플레이어 행동이 끝난 뒤
  afterNpc: [],    // (game, rng, simEvents) NPC 한 달이 끝난 뒤 (simEvents에 소식을 더 넣어도 됨)
  afterMonth: [],  // (game, rng) 날짜가 넘어가고 소식이 정해진 뒤
};
export const run = (name, ...args) => { for (const f of HOOKS[name]) f(...args); };
