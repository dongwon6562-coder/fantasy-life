// 갈래 D 3단계: 높은 곳까지. 영지(받기·다스리기·작위), 전쟁 지휘, 잊힌 땅에 나라 세우기.
import './state.js';
import '../war/battle.js';
import './rule.js';
import '../war/summons.js';
import './nation.js';
import { MAP_PLACES_EXTRA } from '../art/map.js';

// 지도에 그륀탈을 올린다 (하르펜과 베르덴 사이 골짜기)
MAP_PLACES_EXTRA.push({
  id: 'gruental', n: '그륀탈', x: 566, y: 506, t: 'town', area: '중앙 대륙', realm: '레오니아 왕국 남부',
  d: '하르펜과 베르덴 사이 골짜기 마을이에요. 언덕 위에 주인 없는 낡은 영주관이 있어요. 공을 세운 기사가 영지로 받거나, 왕도 문장원에서 작위를 사면 다스릴 수 있어요.',
  todo: '영지 받기, 영주로 다스리기',
});
