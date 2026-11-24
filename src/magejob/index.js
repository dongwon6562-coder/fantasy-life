// 마법으로 먹고살기 (42단계): 일거리 게시판, 생활 마법 의뢰(불 붙이기·우물·갱도·서리·비·잃은 것·가축·결계), 흥정과 실패 책임,
// 마법 가정교사, 마법 용병, 떠돌이 마법사들과 닳는 마을 결계. 주문은 magic의 knownSpells를 읽기만 해서, 주문이 늘면 일도 넓어진다.
// 화면: magejobLine(g) 오늘의 장면 한 줄, magejobInfo(g) 화면용 묶음 (magejobStatus는 같은 것).
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { M, mi, here, placeName, BOARD, TASKS, TASK_IDS, spellFor, canWork, fameAt, fameWord } from './core.js';
import { boardTasks } from './life.js';
import './world.js';

export { M as magejobState, TASKS as MAGE_TASKS, spellFor, boardTasks };
export { wardsMonth, pupilMonth } from './world.js';

const wardWord = (v) => (v >= 60 ? '결계가 단단하다' : v >= 35 ? '결계가 약해지고 있다' : v > 0 ? '결계가 거의 닳았다' : '결계가 없다');

/** 화면용 묶음 */
export function magejobInfo(g) {
  const s = M(g), pl = here(g);
  return {
    can: TASK_IDS.filter((id) => spellFor(g, id)).map((id) => ({ task: TASKS[id].name, spell: spellFor(g, id).name })),
    fame: Math.round(fameAt(g)), fameWord: fameWord(fameAt(g)),
    ward: BOARD[pl] ? { value: Math.round(s.wards[pl] ?? 60), word: wardWord(s.wards[pl] ?? 60) } : null,
    pupil: s.pupil ? { name: s.pupil.name, place: placeName(s.pupil.place), lessons: s.pupil.prog, fee: s.pupil.fee } : null,
    rivals: s.rivals.map((r) => ({ name: r.name, circle: r.circle, place: placeName(r.place) })),
    done: { jobs: s.jobs, fails: s.fails, earned: s.earned, refunds: s.refunds, merc: s.merc },
    past: s.past.slice(-4),
    log: s.log.slice(-8),
  };
}
export const magejobStatus = magejobInfo;

/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function magejobLine(g) {
  if (!g?.player || g.over || L(g).travel || !canWork(g)) return null;
  const s = M(g), t = mi(g), pl = here(g);
  if (s.pupil && s.pupil.place === pl && t % 3 === 0) return `${J(s.pupil.name, '이/가')} 오늘 수업에 쓸 촛불을 미리 켜 놓고 기다린다.`;
  if (BOARD[pl] && (s.wards[pl] ?? 60) < 35 && t % 2 === 1) return '마을 경계석의 문양이 희미하다. 밤이면 숲 쪽에서 무언가 결계를 더듬는 소리가 난다.';
  const r = s.rivals.find((x) => x.place === pl);
  if (r && t % 4 === 2) return `여관 게시판에 ${J(r.name, '이/가')} 다녀간 흔적이 있다. 좋은 쪽지는 벌써 떼어 갔다.`;
  if (fameAt(g) >= 30 && t % 3 === 1) return '골목에서 누가 "저기 마법사 양반" 하고 부른다. 젖은 아궁이 얘기일 것이다.';
  if (BOARD[pl] && boardTasks(g).length >= 3 && t % 5 === 0) return '여관 문간 게시판에 "마법사 구함" 쪽지가 새로 여럿 붙었다.';
  return null;
}
