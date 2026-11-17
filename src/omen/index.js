// 16단계: 예언과 징조. 큰일을 앞서는 하늘과 땅의 징조(헛징조도 섞인다), 세상에 도는 세 예언(일곱 번째 금·사자 왕관·꼬리별),
// 예언을 끌어다 쓰는 세력(검은 새벽, 두 왕자, 성광국), 거짓 예언자, 나나 내 자식이 예언 속 사람으로 지목되기.
// 화면용: omenInfo(g), omenLine(g)
import { OS, SIGNS, PROPHECIES, BY_NAME, STANCE_NAME, beliefWord, loreWord, mi, pending } from './state.js';
import './world.js';
import './life.js';
import './events.js';
import { byId } from '../npc.js';
import { chosenOfMine } from './life.js';

export { SIGNS, PROPHECIES };
export { addSign, comet, PRE } from './world.js';
export { nameChosen, chosenOfMine, amChosen } from './life.js';
export const omenState = OS;

const STATUS = { whisper: '아는 사람이 드물다', spread: '널리 돈다', fulfilled: '이루어졌다고들 한다', broken: '어긋났다' };
const prophetTitle = (M) => (M.approved ? '교단이 인정한 예언자' : M.right >= 3 && M.right > M.wrong * 2 ? '이름난 예언자' : M.wrong >= 3 && M.wrong > M.right ? '거짓 예언자' : M.preached ? '장터의 예언자' : '');

export function omenInfo(g) {
  const O = OS(g), now = mi(g);
  const signView = (s) => ({
    id: s.id, short: s.short, text: s.text, months: now - s.start,
    read: s.read, judged: s.read ? (s.judged ? '참된 징조로 보인다' : '헛것으로 보인다') : null,
    portent: s.read ? SIGNS[s.kind].portent : null, preached: s.preached,
    end: s.end === 'came' ? '그 일이 왔다' : s.end === 'passed' ? '아무 일 없이 지나갔다' : null,
  });
  return {
    signs: pending(g).map(signView),
    past: O.signs.filter((s) => s.end).slice(-8).reverse().map(signView),
    prophecies: Object.entries(PROPHECIES).map(([id, P]) => {
      const st = O.prophecies[id], c = st.chosen;
      return {
        id, name: P.name, words: P.words, from: P.from, belief: Math.round(st.belief), beliefWord: beliefWord(st.belief), status: STATUS[st.status] ?? '',
        chosen: c ? { name: c.id === g.player.id ? '나' : byId(g, c.id)?.name ?? c.name, by: BY_NAME[c.by] ?? '', stance: c.stance ? STANCE_NAME[c.stance] : '아직 답하지 않았다' } : null,
      };
    }),
    mine: chosenOfMine(g).map((c) => ({ pro: PROPHECIES[c.pro].name, who: c.p.id === g.player.id ? '나' : c.p.name })),
    comets: [...O.comets],
    belief: Math.round(O.belief), beliefWord: beliefWord(O.belief),
    lore: Math.round(O.lore), loreWord: loreWord(O.lore),
    prophet: { title: prophetTitle(O.me), preached: O.me.preached, right: O.me.right, wrong: O.me.wrong, banned: O.me.banned > now },
    log: O.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 내 집안에 예언 속 사람이 있거나, 새 징조가 돌 때
export function omenLine(g) {
  const parts = [];
  const c = chosenOfMine(g)[0];
  if (c) parts.push(`${PROPHECIES[c.pro].name} 속 사람: ${c.p.id === g.player.id ? '나' : c.p.name}`);
  const s = pending(g).filter((x) => mi(g) - x.start <= 2).pop();
  if (s) parts.push(`징조: ${s.short}`);
  const t = prophetTitle(OS(g).me);
  if (t) parts.push(t);
  return parts.join(' · ');
}
