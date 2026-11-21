// 27단계 유전과 타고남 (도우미스레드4)
// 화면에서 쓰는 것:
//   birthOptions(race) → { modes, gifts[{id,name,line,icon}], traits[{id,name,opp}], maxTraits, looks{hair[],eyes[]} }
//   newGame({ ..., birth: { gift: 'magic'|'sword'|'letters'|'trade'|'craft'|'faith'|null, traits: [id, id], looks: { hair: n, eyes: n } } })
//     birth를 빼거나 null이면 '평범하게'(예전처럼 무작위). 첫 사람만. 자식은 핏줄로.
//   heredityInfo(g) → 내 큰 재능, 내가 누구를 닮았나, 자식마다 누구를 닮았나, 혼인 상대 후보에 대한 말
//   bloodHint(g, p) → 그 사람 집안 핏줄에 대한 말 (혼인 상대 고를 때), resembleOf(g, p) → '아버지를 많이 닮았다' 같은 말
import './life.js';
import { me, playerAge } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { BIRTH_GIFTS } from './data.js';
import { HD, bloodHint, resembleOf } from './core.js';
import { giftOf } from './life.js';

export { birthOptions, cleanBirth, giftOf, MAX_TRAITS } from './life.js';
export { BIRTH_GIFTS, BIRTH_GIFT_IDS } from './data.js';
export { bloodOf, bloodHint, resembleOf, inherit, giftFromBlood, HD as heredityState } from './core.js';

export function heredityInfo(g) {
  const H = HD(g), meP = me(g);
  const k = giftOf(g);
  const kids = (meP.childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && !p.isPlayer)
    .map((p) => ({ id: p.id, name: p.name, age: ageYears(p), resemble: resembleOf(g, p) }));
  const suitors = playerAge(g) >= 15 && !meP.spouseId
    ? g.people.filter((p) => p.alive && p.known && !p.isPlayer && !p.spouseId && p.sex !== meP.sex && ageYears(p) >= 16 && Math.abs(ageYears(p) - playerAge(g)) <= 12 && !g.player.familyIds.includes(p.id))
      .slice(0, 6).map((p) => ({ id: p.id, name: p.name, hint: bloodHint(g, p) }))
    : [];
  return {
    chosen: H.chosen,
    gift: k, giftName: k ? BIRTH_GIFTS[k].name : null, giftLine: k ? BIRTH_GIFTS[k].line : null,
    resemble: resembleOf(g, meP),
    spouse: meP.spouseId && byId(g, meP.spouseId) ? { id: meP.spouseId, hint: bloodHint(g, byId(g, meP.spouseId)) } : null,
    kids, suitors, leaps: H.leaps,
  };
}

export function heredityLine(g) {
  const i = heredityInfo(g);
  const bits = [];
  if (i.giftName) bits.push(`타고난 ${i.giftName}`);
  if (i.resemble) bits.push(i.resemble);
  return bits.length ? bits.join(', ') : null;
}
