// 10단계: 봉인의 흔들림. 화면은 아래 함수만 읽으면 된다.
import './state.js';
import './world.js';
import './actions.js';
import './events.js';
import { shiftRel } from '../politics/state.js';
import { POL, wear } from './world.js';
import { SS, WEDGES, WEDGE_IDS, STAGES, sealPower, wedgeState, brokenWedges } from './state.js';

POL.shiftRel = shiftRel;
export { WEDGES, STAGES, wear };
export const sealState = SS;

const STANCE = {
  church: { deny: '모른 척한다', purge: '이단 사냥과 용사 의식', unite: '마탑과 손잡았다' },
  tower: { observe: '지켜본다', reinforce: '보강 술식을 짠다' },
  crown: { deny: '쉬쉬한다', arm: '토벌세를 걷고 병사를 늘린다' },
  empire: { exploit: '봉인석 근처 마석을 캔다', unite: '광산을 닫고 마탑을 돕는다' },
};
const WHO = { church: '성광교단', tower: '세레니아 마탑', crown: '레오니아 왕실', empire: '발하르트 제국' };
const WEDGE_WORD = { whole: '온전하다', stolen: '도둑맞았다', broken: '부서졌다', dark: '불이 꺼졌다' };

// 화면용 한 장. 플레이어가 아는 만큼만 보여 준다 (known 0: 아무것도, 1: 소문, 2: 쐐기와 세력, 3: 숫자까지)
//   { known, stage, stageName, desc, power(known 3만), ending, wedges[{id,name,state,word}](known 2+), stances[{who,word}](known 2+),
//     spies(대략), cult(대략), path{guard, exploit, pact, fragments}, log[{y,m,text}] }
export function sealInfo(g) {
  const S = SS(g);
  const k = S.known;
  const st = STAGES[S.stage];
  return {
    known: k,
    stage: k >= 1 ? S.stage : 0,
    stageName: k >= 1 ? st.name : '알 수 없음',
    desc: k >= 1 ? st.desc : '북쪽의 일은 먼 옛이야기일 뿐이다.',
    power: k >= 3 ? Math.round(sealPower(g)) : null,
    ending: S.ending,
    wedges: k >= 2 ? WEDGE_IDS.map((id) => ({ id, name: WEDGES[id].name, state: wedgeState(g, id), word: WEDGE_WORD[wedgeState(g, id)] })) : [],
    stances: k >= 2 ? Object.keys(STANCE).map((x) => ({ who: WHO[x], word: STANCE[x][S.stance[x]] ?? '' })) : [],
    spies: k >= 2 ? (S.spies >= 6 ? '많다' : S.spies >= 2 ? '여럿' : S.spies >= 1 ? '있다' : '보이지 않는다') : null,
    cult: k >= 2 ? (S.cult >= 50 ? '세가 크다' : S.cult >= 25 ? '퍼지고 있다' : '숨어 있다') : null,
    council: S.council ?? null,
    path: { guard: Math.round(S.me.guard), exploit: S.me.exploit, pact: S.me.pact, fragments: S.me.fragments },
    log: k >= 1 ? S.log.slice(-10).reverse() : [],
  };
}
// 머리글 한 줄
export function sealLine(g) {
  const S = SS(g);
  if (S.ending === 'broken') return '봉인: 깨졌다';
  if (S.known < 1 || S.stage < 1) return null;
  return `봉인: ${STAGES[S.stage].name}${S.known >= 2 ? ` (빠진 쐐기 ${brokenWedges(g).length})` : ''}`;
}
