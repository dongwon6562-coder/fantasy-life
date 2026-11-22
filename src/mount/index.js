// 32단계: 하늘의 짐승 기수. 그리폰·와이번의 둥지와 알, 알 품기, 사나워지는 새끼, 등에 올라 나는 법, 하늘길·전령·싸움터,
// 잿빛 날개대(잿빛 성벽 기사단 곁의 하늘 기수들), 늙은 짐승의 마지막 비행과 선대의 짐승이 새 주인을 시험하는 일.
// 화면용: mountLine(g) 이번 달 이 고장에서 보이는 하늘 짐승 한 줄(없으면 null), mountInfo(g) 한 장
import { MAP_INFO } from '../art/map.js';
import { J } from '../narrative/text.js';
import { KINDS, ageOf, old } from '../beasts/core.js';
import { MS, SKY_INFO, NESTS, NEST_IDS, BAND, nestAt, here, placeName } from './state.js';
import { skyBeasts, skyOf, grown, ready, rideable, mountMonth } from './life.js';

export { SKY, SKY_INFO, NESTS, NEST_IDS, BAND, isSky } from './state.js';
export { skyBeasts, skyOf, ready, rideable, mountMonth, takeEgg } from './life.js';
export const mountState = MS;

export function stageWord(g, a) {
  const r = skyOf(g, a);
  if (old(g, a)) return r.flight >= 100 ? '늙어 멀리 날지 못한다' : '늙었다';
  if (ready(g, a)) return '사람을 태우고 난다';
  if (grown(g, a)) return (a.trained ?? 0) >= 100 ? `등에 오르는 법을 익히는 중 (${Math.round(r.flight)}/100)` : '다 자랐지만 아직 사슬을 견디지 않는다';
  if (ageOf(g, a) >= 1.5) return '사나워지는 해';
  return '날고기를 찢는 새끼';
}

/** 이번 달 이 고장에서 보이는 하늘 짐승 한 줄 (없으면 null) */
export function mountLine(g) {
  if (!g?.mount || !g.date) return null;
  const M = g.mount;
  const e = M.eggs?.find((x) => x.prog >= SKY_INFO[x.kind].hatch - 1);
  if (e) return '화덕 곁 재 속에서 알이 가끔 저 혼자 흔들린다. 안에서 긁는 소리가 밤마다 커진다.';
  const list = g.beasts ? skyBeasts(g) : [];
  const a = list[0];
  if (a) {
    const k = KINDS[a.kind].name;
    if (old(g, a)) return `${J(a.name, '이/가')} 볕 드는 바위에 엎드려 하루를 보낸다. 깃이 성기고, 하늘을 올려다보는 시간이 길어졌다.`;
    if (ready(g, a)) return `${J(a.name, '이/가')} 고장 위 하늘에 원을 그리다 내려앉는다. 지붕 그림자가 지나갈 때마다 사람들이 고개를 든다.`;
    if (grown(g, a)) return `다 자란 ${J(k, '이/가')} 우리 안에서 날개를 편다. 날개 끝이 우리 양쪽 벽에 닿는다. 하루에 ${J(SKY_INFO[a.kind].meat, '을/를')} 반 마리씩 먹는다.`;
    return `${J(a.name, '이/가')} 우리 안에서 날고기를 찢는다. 이웃 아이들이 담 너머로 훔쳐보다 눈이 마주치면 달아난다.`;
  }
  const n = nestAt(here(g)).find((id) => M.nests?.[id]?.known);
  if (n) return `${placeName(NESTS[n].from)} 위 벼랑으로 ${KINDS[NESTS[n].kind].name}의 큰 그림자가 지나간다. 양치기들이 양을 몰아 바위 밑으로 숨는다.`;
  if (here(g) === BAND.seat) return `셋째 성벽 둥지 탑 위로 날개 ${M.band?.riders ?? 7}쌍이 오르내린다. 성벽 아래 아이들이 손가락으로 센다.`;
  return null;
}

/** 화면 한 장 */
export function mountInfo(g) {
  const M = MS(g), list = g.beasts ? skyBeasts(g) : [];
  return {
    eggs: M.eggs.map((e) => ({ kind: e.kind, name: SKY_INFO[e.kind].egg, prog: e.prog, hatch: SKY_INFO[e.kind].hatch, warm: e.warm })),
    beasts: list.map((a) => { const r = skyOf(g, a); return { id: a.id, name: a.name, kind: a.kind, kindName: KINDS[a.kind].name, age: Math.floor(ageOf(g, a)), stage: stageWord(g, a), flight: Math.round(r.flight), falls: r.falls, sorties: r.sorties, wounds: r.wounds, bond: Math.round(a.bond), hatchedBy: r.hatchedBy }; }),
    riding: rideable(g)?.name ?? null,
    band: { name: BAND.name, riders: M.band.riders, captain: M.band.captain, member: M.me.member ? { rank: BAND.ranks[M.me.member.rank], sorties: M.me.member.sorties } : null },
    nests: NEST_IDS.filter((id) => M.nests[id].known).map((id) => ({ id, name: NESTS[id].name, kind: KINDS[NESTS[id].kind].name, place: NESTS[id].from, placeName: placeName(NESTS[id].from), eggs: M.nests[id].eggs })),
    graves: M.graves.slice(-6).reverse().map((x) => ({ name: x.name, kind: KINDS[x.kind]?.name ?? '하늘 짐승', y: x.y, years: x.years, how: x.how })),
    me: { ...M.me, member: undefined },
    log: M.log.slice(-10).reverse(),
  };
}

// 대륙 지도: 아는 둥지, 날개대 탑
MAP_INFO.push((g, place) => {
  if (!g?.mount || !place?.id) return '';
  let out = NEST_IDS.filter((id) => NESTS[id].from === place.id && g.mount.nests[id]?.known)
    .map((id) => `<p class="note"><b>${NESTS[id].name}</b> · ${KINDS[NESTS[id].kind].name} 둥지${g.mount.nests[id].eggs > 0 ? ` · 알 ${g.mount.nests[id].eggs}` : ''}</p>`).join('');
  if (place.id === BAND.seat) out += `<p class="note"><b>${BAND.name}</b> · 기수 ${g.mount.band.riders}${g.mount.me.member ? ` · 나는 ${BAND.ranks[g.mount.me.member.rank]}` : ''}</p>`;
  return out;
});
