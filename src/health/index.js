// 15단계: 병과 의술. 고장과 철마다 도는 병(늪 열병·기침병·이질·잿빛 역병·상처 덧남), 누구에게 맡길지
// (의원·약초꾼·신전 치유·치유 마법, 그리고 돌팔이), 낫지 않는 병과 장애, 집안 내력으로 남는 병.
// 화면용: healthInfo(g), healthLine(g), outbreaksAt(g, place)
import { HS, KINDS, CHRONIC, HEALERS, sevWord, mySick } from './state.js';
import { outbreaksIn } from './world.js';
import './life.js';
import './events.js';
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { byId } from '../npc.js';
import { REGIONS } from '../nature/state.js';

export { KINDS, CHRONIC, HEALERS };
export { startOutbreak } from './world.js';
export { fallSick, addChronic, healPower, closeKin } from './life.js';
export const healthState = HS;

const sevOf = (v) => (v >= 0.7 ? '크게 돈다' : v >= 0.4 ? '돈다' : '조금 돈다');
// 그 고장에 지금 도는 병 [{ kind, name, sev, sevWord, left }]
export function outbreaksAt(g, place = L(g).place) {
  return outbreaksIn(g, place).map((o) => ({ kind: o.kind, name: KINDS[o.kind].name, sev: o.sev, sevWord: sevOf(o.sev), left: o.left }));
}

export function healthInfo(g) {
  const H = HS(g);
  const sickView = (s) => ({
    id: s.id, kind: s.kind, name: KINDS[s.kind]?.name ?? '병', who: s.who === 'me' ? '나' : byId(g, s.who)?.name ?? '식구', me: s.who === 'me',
    sev: Math.round(s.sev), sevWord: sevWord(s.sev), months: s.months, treat: s.treat ? HEALERS[s.treat.by]?.name ?? ({ self_heal: '내 의술', self_herbs: '내가 달인 약초', self_magic: '내 치유 마법' }[s.treat.by] ?? '') : null,
  });
  return {
    sick: H.sick.map(sickView),
    chronic: H.chronic.map((c) => ({ id: c.id, name: CHRONIC[c.id]?.name ?? '', desc: CHRONIC[c.id]?.desc ?? '', since: c.since, from: c.from ? KINDS[c.from]?.name ?? null : null })),
    here: outbreaksAt(g),
    outbreaks: H.outbreaks.map((o) => ({ kind: o.kind, name: KINDS[o.kind].name, region: REGIONS[o.region]?.name ?? '', sev: o.sev, sevWord: sevOf(o.sev), left: o.left })),
    lineage: Object.entries(H.lineage).filter(([, n]) => n > 0).map(([id, n]) => ({ id, name: CHRONIC[id]?.name ?? '', gens: n })),
    past: H.past.slice(-10).reverse().map((p) => ({ name: KINDS[p.kind]?.name ?? '', region: REGIONS[p.region]?.name ?? '', y: p.y })),
    cured: H.cured, quacked: H.quacked,
    log: H.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 내가 앓거나, 이 고장에 병이 돌 때
export function healthLine(g) {
  const parts = [];
  const s = mySick(g).sort((a, b) => b.sev - a.sev)[0];
  if (s) parts.push(`${KINDS[s.kind].name}: ${sevWord(s.sev)}`);
  const o = outbreaksAt(g)[0];
  if (o) parts.push(`이 고장에 ${J(o.name, '이/가')} ${o.sevWord}`);
  const kin = HS(g).sick.filter((x) => x.who !== 'me').length;
  if (kin) parts.push(`앓는 식구 ${kin}`);
  return parts.join(' · ');
}
