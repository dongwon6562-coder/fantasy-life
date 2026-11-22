// 34단계: 뒤 시대의 세계 (도우미스레드3). 마탑·교단·상단·왕실이 새 기술에 서는 법, 마석 고갈 걱정과 마석 값·마나, 뒤 시대 사건.
// 화면용: laterLine(g) 이번 달 이 고장에서 보이는 시대의 한 줄(없으면 null), laterInfo(g) 한 장
import { ERAS } from '../world.js';
import { LE, SIDES, SIDE_IDS, stanceWord, depleteWord } from './state.js';
import './world.js';
import './events.js';

export { SIDES, stanceWord, depleteWord, REACT, HUNGRY, RELIEF } from './state.js';
export { laterMonth } from './world.js';
export const laterState = LE;
const has = (g, id) => !!g.history?.inventions?.includes(id);

/** 이번 달 이 고장에서 보이는 시대의 한 줄 (없으면 null) */
export function laterLine(g) {
  if (!g?.later || !g.date || !g.life || g.life.travel) return null;
  const S = g.later, pl = g.life.place;
  if (S.deplete >= 45 && ['harfen', 'leocast', 'portel', 'serenia', 'barka', 'hammer'].includes(pl)) return '마석 거간꾼 앞 칠판의 숫자를 사람들이 말없이 올려다본다. 등석 가로등이 한 줄 걸러 하나씩 꺼져 있다.';
  if (has(g, 'medicine') && S.stance.faith <= -15 && (pl === 'leocast' || pl === 'verden')) return '성당 문에 "몸은 신이 고친다"는 벽보가 붙었다. 바로 맞은편 마도 의원 앞 줄은 오늘도 길다.';
  if (has(g, 'crystal') && S.stance.tower >= 15 && pl === 'serenia') return '마탑 전신소 수정구 앞에 왕실 전령과 상단 서기가 나란히 줄을 선다. 탑의 회색 로브가 순서를 정한다.';
  if (has(g, 'gun') && pl === 'graubel') return '성벽 위 총포수 셋이 마석을 갈아 끼우는 동안, 그 옆 검사들은 칼을 갈며 웃는다.';
  if (S.deplete >= 25 && pl === 'hammer') return '깊은 갱 입구에서 드워프 노인 하나가 땅에 귀를 대고 있다. "지쳤어. 땅이 지쳤어."';
  return null;
}

/** 화면 한 장 */
export function laterInfo(g) {
  const S = LE(g), r = g.realm ?? {};
  return {
    era: ERAS[r.era ?? 0]?.name ?? '',
    deplete: Math.round(S.deplete), depleteWord: depleteWord(S.deplete),
    sides: SIDE_IDS.map((id) => ({ id, name: SIDES[id].name, stance: Math.round(S.stance[id]), word: stanceWord(S.stance[id]), last: S.last[id] ?? null })),
    me: { ...S.me },
    log: S.log.slice(-10).reverse(),
  };
}
