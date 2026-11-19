// 화면용: 극단과 내 재주를 한 번에.
import { T, myTroupe, withTroupe, bannedHere, mi, here, placeName, ACTS, ACT_IDS, actSkill, tasteOf, tasteId, crowdOf, stageOk, nextStops, fameWord, lover, WAGE } from './core.js';
import { FOUND_COST, visitingHere } from './life.js';
import { J } from '../narrative/text.js';

export function troupeStatus(g) {
  const s = T(g), t = myTroupe(g), pl = here(g);
  return {
    place: pl, placeName: placeName(pl), stage: stageOk(pl), taste: stageOk(pl) ? { id: tasteId(pl), text: tasteOf(pl).name, likes: ACT_IDS.map((a) => ({ id: a, name: ACTS[a].name, mult: tasteOf(pl)[a] })), censor: tasteOf(pl).censor } : null,
    banned: bannedHere(g), bannedPlaces: Object.entries(s.banned).filter(([, until]) => until >= mi(g)).map(([p, until]) => ({ place: p, placeName: placeName(p), monthsLeft: until - mi(g) })),
    acts: ACT_IDS.map((a) => ({ id: a, name: ACTS[a].name, who: ACTS[a].who, skill: Math.round(actSkill(g, a)) })),
    foundCost: FOUND_COST, visiting: visitingHere(g) ? { name: visitingHere(g).name, until: visitingHere(g).until } : null,
    troupe: t ? {
      name: t.name, own: t.own, leader: t.leader, gens: t.gens, here: withTroupe(g), place: t.place, placeName: placeName(t.place), moving: t.moving ?? null,
      fame: Math.round(t.fame), fameWord: fameWord(t.fame), wagon: Math.round(t.wagon), myAct: t.myAct ?? null, myActName: t.myAct ? ACTS[t.myAct].name : null, lead: !!t.lead,
      members: t.members.map((m) => ({ id: m.id, name: m.name, act: m.act, who: ACTS[m.act].who, skill: Math.round(m.skill), mood: Math.round(m.mood), love: m.love >= 60 })),
      wages: t.own ? t.members.length * WAGE : 0, shows: t.shows, earned: t.earned, stay: t.stay, satire: !!t.satire,
      next: stageOk(t.place) ? nextStops(t.place).map((p) => ({ place: p, placeName: placeName(p), crowd: crowdOf(p) })) : [],
      lover: lover(g)?.name ?? null,
    } : null,
    shows: s.shows, best: s.best ? { ...s.best, placeName: placeName(s.best.place) } : null, feasts: s.feasts, satires: s.satires, founded: s.founded,
    past: s.past.map((x) => ({ ...x })),
    log: s.log.slice(0, 12),
  };
}

// 한 줄 요약 (상태 막대용). 극단에 없으면 빈 문자열.
export function troupeLine(g) {
  const t = myTroupe(g);
  if (!t) return '';
  return `${t.own ? '내 극단' : '극단'} ${t.name}: ${t.moving ? `${J(placeName(t.moving), '으로/로')} 가는 길` : placeName(t.place)}, 단원 ${t.members.length}명, ${fameWord(t.fame)} 이름`;
}
