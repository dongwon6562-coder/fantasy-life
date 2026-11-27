// 34단계: 기술 나무 (도우미스레드3). 발명은 한 줄로 이어 붙인 목록이 아니라 선행 기술을 타고 자라는 나무다.
// 큰 발명 사이에 작은 기술이 촘촘히 끼고, 연구할 사람·재료·수요가 갖춰져야 진척이 쌓인다. 다른 나라에서 먼저 나와 건너오기도 한다.
// 화면용: techInfo(g) 한 장, techLine(g) 이번 달 이 고장에서 보이는 기술 한 줄(없으면 null)
import { HOOKS } from '../hooks.js';
import { makeRng } from '../rng.js';
import { PLACES } from '../places.js';
import { TECHS, TECH, FIELDS, ERA_KEYS } from './nodes.js';
import { TT, isDone, isOpen, openTechs, costOf, techValue, speedOf, FOREIGN, seedTree, migrateTree } from './grow.js';
import { seldom } from '../rumor/seldom.js';

export { TECHS, TECH, TECH_IDS, FIELDS, ERA_KEYS, HAND } from './nodes.js';
export { techGrow, techValue, openTechs, isOpen, costOf, FOREIGN, AFTER_TECH, ERA_TECH } from './grow.js';
export const techState = TT;
const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';

HOOKS.newGame.push((g) => { g.techtree = { prog: {}, abroad: {}, fprog: {}, when: {}, log: [] }; seedTree(g, makeRng({ s: ((g.rngState?.s ?? 7) ^ 0x7ec7) | 0 })); if (g.realm) g.realm.tech = techValue(g); });
HOOKS.migrate.push((g) => { migrateTree(g); const T = TT(g); T.prog ??= {}; T.abroad ??= {}; T.fprog ??= {}; T.when ??= {}; T.log ??= []; });

// 다음에 열릴 만한 것은 소문으로만: 이름 대신 흐릿한 말
const HINT = {
  farm: '농사꾼들 사이에 새 농법 이야기가 돈다', craft: '공방 거리에서 무언가 새것을 시험한다는 말이 있다', magic: '마탑 실험실 불이 밤새 꺼지지 않는다고 한다',
  letters: '학자들이 무언가를 두고 밤새 다툰다고 한다', sea: '조선소와 부두에서 이상한 것을 만든다는 소문이다', war: '성채 공방에 사람 출입을 막았다고 한다',
  city: '관청이 도시를 뜯어고칠 궁리를 한다는 말이 있다', heal: '의원과 마법사들이 같은 방에 모인다는 소문이다',
};
const stage = (p) => (p >= 0.75 ? '거의 다 왔다' : p >= 0.45 ? '한창이다' : p >= 0.2 ? '막 손을 댔다' : '말만 나온다');

/** 화면 한 장 */
export function techInfo(g) {
  const T = TT(g), inv = g.history?.inventions ?? [];
  const yearOf = (id) => T.when?.[id] ?? (g.realm?.log ?? []).find((x) => x.text.startsWith('발명') && x.text.includes((TECH[id]?.text ?? '').slice(0, 12)))?.y ?? null;
  const open = openTechs(g).map((t) => ({ t, p: (T.prog[t.id]?.[0] ?? 0) / costOf(t) })).sort((a, b) => b.p - a.p);
  return {
    tech: Math.round(techValue(g) * 100) / 100,
    done: inv.filter((id) => TECH[id]).map((id) => ({ id, name: TECH[id].name, field: FIELDS[TECH[id].field], big: !!TECH[id].big, y: yearOf(id), where: placeName(TECH[id].where), from: T.abroad[id] ? FOREIGN[T.abroad[id][0]]?.name ?? null : null })),
    // 지금 연구 중인 곳: 진척이 붙은 것만, 이름은 이미 알려진 것(남의 나라에서 나왔거나 반 넘게 왔을 때)만
    working: open.filter((x) => x.p >= 0.15).slice(0, 4).map(({ t, p }) => ({
      where: placeName(t.where), field: FIELDS[t.field], stage: stage(p),
      name: T.abroad[t.id] || p >= 0.5 ? t.name : null, from: T.abroad[t.id] ? FOREIGN[T.abroad[t.id][0]]?.name ?? null : null,
      slow: speedOf(g, t) < 0.75,
    })),
    rumors: [...new Set(open.filter((x) => x.p < 0.5 && !T.abroad[x.t.id]).slice(0, 6).map((x) => HINT[x.t.field]))].slice(0, 3),
    abroad: Object.entries(T.abroad).filter(([id]) => !inv.includes(id) && TECH[id]).map(([id, [k, y]]) => ({ name: TECH[id].name, by: FOREIGN[k]?.name ?? '먼 나라', y })),
    total: TECHS.length, count: inv.filter((id) => TECH[id]).length,
    log: T.log.slice(-10).reverse(),
  };
}

/** 이번 달 이 고장에서 보이는 기술 한 줄 (없으면 null): 이 고장에서 한창 연구 중인 것 */
export function techLine(g) {
  if (!g?.techtree || !g.date || !g.life) return null;
  const pl = g.life?.place ?? null;
  const T = g.techtree;
  const t = openTechs(g).find((x) => x.where === pl && (T.prog[x.id]?.[0] ?? 0) / costOf(x) >= 0.6);
  if (!t || !seldom(g, `tech:${t.id}`, 24)) return null; // 48단계: 같은 연구 소문은 두 해에 한 번
  if (T.abroad[t.id]) return `${FOREIGN[T.abroad[t.id][0]].name}에서 들여온 ${t.name} 이야기를 공방 사람들이 입에 달고 산다. 흉내 낸 물건이 곧 나온다고 한다.`;
  return `${HINT[t.field]}. 이 고장 어딘가에서 곧 무언가 새것이 나올 것 같다.`;
}
