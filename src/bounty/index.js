// 현상금 사냥꾼 (50단계 도우미4): 쫓기는 사람이 아니라 쫓는 사람으로 사는 삶.
// 현상금 게시판(탈옥수·산적·해적·빚쟁이·살인자·마녀로 고발된 자), 고장을 건너는 흔적, 산 채로 잡을지 죽일지, 엉뚱한 사람,
// 조합 등급(견습→쇠 패→은 패→검은 패), 내가 잡은 사람의 식구와 원한, 경쟁 사냥꾼. 플레이어 없이도 방이 붙고 떼어진다.
// 화면: bountyInfo(g) 화면용 묶음, bountyLine(g) 오늘의 장면 한 줄.
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { seldom } from '../rumor/seldom.js';
import { B, mi, here, placeName, RANKS, NEED, HALLS, hallAt, KINDS, isMember, huntOf, openPosts, rivalName, STYLE } from './core.js';
import { makePost } from './world.js';
import './life.js';

export { B as bountyState, makePost as makeHuntPost };

const nearOf = (g, h) => { const me = B(g).me; return me.known ? (h.loc === here(g) ? 90 : 60) : Math.min(50, me.clue * 20 + 5); };

/** 화면용 묶음: 현상금 게시판 카드 */
export function bountyInfo(g) {
  const s = B(g), me = s.me, t = mi(g), pl = here(g), h = huntOf(g);
  const hall = hallAt(pl);
  const board = hall ? openPosts(g, pl).sort((a, b) => a.need - b.need || b.reward - a.reward).slice(0, 6).map((p) => ({
    name: p.name, crime: `${KINDS[p.kind].name}. ${p.crime}.`, reward: p.reward, alive: !p.dead, seen: me.boardAt >= p.at,
    need: p.need > me.rank ? `${RANKS[p.need]} 이상` : null,
  })) : [];
  const chase = h ? {
    name: h.name, crime: `${KINDS[h.kind].name}. ${h.crime}.`, reward: h.reward,
    trail: (h.trail ?? []).map((x) => ({ place: placeName(x.place), text: x.text })),
    near: nearOf(g, h), left: Math.max(0, h.until - t),
    where: me.known ? placeName(h.loc) : null,
  } : null;
  return {
    place: hall ? HALLS[pl] : null,
    board,
    chase,
    me: me.member || me.caught || me.killed ? {
      member: me.member, rank: RANKS[me.rank], rankN: me.rank, merit: me.pts, next: me.rank < 3 ? NEED[me.rank] : null, nextRank: me.rank < 3 ? RANKS[me.rank + 1] : null,
      caught: me.caught, killed: me.killed, wrong: me.wrong, freed: me.freed, earned: me.earned,
      rivals: s.rivals.filter((r) => !r.gone).map((r) => ({ name: rivalName(r), word: `${STYLE[r.style].name} ${RANKS[r.rank]}, 잡은 사람 ${r.caught}` })),
      grudges: s.kin.filter((k) => !k.done).slice(-5).map((k) => ({ name: `${k.of}의 ${k.rel} ${k.name}`, why: k.how === 'killed' ? '내가 벤 사람의 식구' : k.how === 'wrong' ? '내가 엉뚱하게 잡았던 사람의 식구' : '내가 잡아 넘긴 사람의 식구' })),
      log: s.log.slice(-8),
    } : null,
  };
}
export const bountyStatus = bountyInfo;

/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function bountyLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const pl = here(g), h = huntOf(g), t = mi(g);
  if (h && B(g).me.known && h.loc === pl && t % 2 === 0) return `이 고장 어딘가에 ${J(h.name, '이/가')} 숨어 있다. 지나가는 얼굴마다 품 안의 그림과 맞대어 본다.`;
  if (h && t % 3 === 1 && seldom(g, 'bounty:chase', 6)) return `품 안의 방이 구겨졌다. ${h.name}, 은화 ${h.reward}닢. 기한은 ${Math.max(0, h.until - t)}달 남았다.`;
  if (!hallAt(pl)) return null;
  const n = openPosts(g, pl).length;
  if (isMember(g) && n && t % 4 === 2 && seldom(g, 'bounty:board', 12)) return `조합 게시판에 새 얼굴 그림이 붙었다. 사냥꾼 몇이 그 앞에서 이를 쑤시며 값을 매긴다.`;
  if (!isMember(g) && n && t % 6 === 3 && seldom(g, 'bounty:hall', 36)) return `${HALLS[pl]} 앞에서 쇠사슬을 맨 사내가 묶인 사람을 끌고 들어간다. 구경꾼들이 길을 비켜 준다.`;
  return null;
}
