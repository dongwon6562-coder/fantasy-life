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
// 아래는 2단계에서 덧붙인 확장 지점
HOOKS.endOfMonth = [];  // (game, rng, results) 사건 고르기와 플레이어 상태 확인까지 끝난 뒤 (한 달의 맨 끝)
HOOKS.actionFilter = []; // (game, action) => false를 돌려주면 그 행동을 이번 달 목록에서 뺀다
HOOKS.heir = [];        // (game, rng, oldPlayer) 대를 이어 자식이 새 플레이어가 된 직후
HOOKS.beforeDeath = []; // (game, rng, cause) => false를 돌려주면 정해진 죽음을 한 달 미룬다 (임종 장면용)
