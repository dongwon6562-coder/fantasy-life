// 35단계: 기술이 퍼지는 길과 내 손 (도우미스레드3). 기술 나무에서 나온 것이 장인과 도제, 책, 떠도는 기술자, 상단을 타고
// 고장에서 고장으로 천천히 번진다. 플레이어는 연구를 후원하고, 떠돌이 기술자를 들이고, 비법을 훔치거나 지키고,
// 왕실 특허장을 받거나, 다른 나라에 팔거나, 교단과 함께 막는다. 앞당기는 힘은 작다(몇 해 남짓).
// 화면용: spreadLine(g) 이번 달 이 고장의 기술 한 줄(없으면 null), spreadInfo(g) 한 장, reachedAt(g, id, 고장) 그 고장에 들어왔나
import { TECH } from '../techtree/nodes.js';
import { J } from '../narrative/text.js';
import { SP, PLACE_IDS, livable, reachedAt, placeName, mi } from './state.js';
import './world.js';
import './life.js';
import { firstMonths } from '../rumor/seldom.js';

export { reachedAt, reachList, PLACE_IDS, CHANNEL, BACK_CAP } from './state.js';
export { spreadMonth } from './world.js';
export const spreadState = SP;

/** 이번 달 이 고장의 기술 한 줄 (없으면 null) */
export function spreadLine(g) {
  if (!g?.spread || !g.date || !g.life || g.life.travel) return null;
  const pl = g.life.place, S = g.spread, inv = g.history?.inventions ?? [], i = PLACE_IDS.indexOf(pl);
  // 막 들어온 것
  const fresh = inv.map((id) => TECH[id]).filter((t) => t && (S.reach[t.id] ?? []).some(([p, y]) => p === i && g.date.year - y <= 1 && (S.reach[t.id][0][0] !== i))).sort((a, b) => b.at - a.at)[0];
  // 48단계: '막 들어왔다'는 이 고장에서 처음 본 뒤 석 달만
  if (fresh && firstMonths(g, `spread:${fresh.id}`, 3)) return `${J(fresh.name, '이/가')} 이 고장에 막 들어왔다. 구경꾼들이 둘러서서 처음 보는 것을 만져 본다. 늙은이들은 팔짱을 끼고 서 있다.`;
  // 막힌 것
  const b = S.block[pl];
  if (b && b[1] > mi(g) && TECH[b[0]]) return `성당 문에 "${TECH[b[0]].name} 들이지 말 것"이라는 벽보가 붙어 있다. 그것을 들고 왔던 장사꾼이 짐을 다시 싼다.`;
  // 이웃엔 있는데 여기엔 아직인 큰 것
  const late = inv.map((id) => TECH[id]).filter((t) => t?.big && S.reach[t.id] && !reachedAt(g, t.id, pl) && g.date.year - S.reach[t.id][0][1] >= 5).sort((a, b) => b.at - a.at)[0];
  if (late) return `${placeName(S.reach[late.id][0][0] != null ? PLACE_IDS[S.reach[late.id][0][0]] : 'harfen')}에선 벌써 ${J(late.name, '을/를')} 쓴다는데, 이 고장엔 아직 없다. 장에 나온 사람들이 그 얘기를 남의 나라 일처럼 한다.`;
  return null;
}

/** 화면 한 장 */
export function spreadInfo(g) {
  const S = SP(g), inv = g.history?.inventions ?? [], pl = g.life?.place ?? 'ern', now = mi(g);
  const total = PLACE_IDS.filter((p) => livable(g, p)).length;
  return {
    total,
    techs: inv.filter((id) => TECH[id] && S.reach[id]).map((id) => {
      const r = S.reach[id];
      return { id, name: TECH[id].name, places: r.length, first: placeName(PLACE_IDS[r[0][0]]), since: r[0][1], here: reachedAt(g, id, pl), patent: S.patent[id] > now ? Math.ceil((S.patent[id] - now) / 12) : 0, guard: !!S.guard[id] };
    }).reverse(),
    missing: inv.filter((id) => TECH[id] && S.reach[id] && !reachedAt(g, id, pl)).map((id) => TECH[id].name).slice(-6).reverse(),
    block: S.block[pl] && S.block[pl][1] > now ? { name: TECH[S.block[pl][0]]?.name ?? '', left: Math.ceil((S.block[pl][1] - now) / 12) } : null,
    backed: Object.keys(S.backed).filter((id) => TECH[id]).map((id) => ({ name: TECH[id].name, done: inv.includes(id) })),
    me: { ...S.me },
    log: S.log.slice(-10).reverse(),
  };
}
