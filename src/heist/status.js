// 화면용: 꾸미는 일, 장물, 뒤쫓는 사람, 지난 한탕을 한 번에.
import { H, plan, atTarget, mi, here, placeName, KINDS, ROLES, ROLE_IDS, readiness, hotWord, craft } from './core.js';
import { J } from '../narrative/text.js';

const PREP_NAME = { plan: '도면', tools: '연장', bribe: '매수한 경비', escape: '도망길', papers: '가짜 통행증' };
export function heistStatus(g) {
  const s = H(g), p = plan(g), l = s.loot, h = s.hunt;
  return {
    craft: Math.round(craft(g)),
    plan: p ? {
      name: p.name, kind: p.kind, kindName: KINDS[p.kind].name, owner: p.owner, place: p.place, placeName: placeName(p.place), here: atTarget(g),
      prize: p.prize, guard: Math.round(p.guard), intel: Math.round(p.intel), alarm: Math.round(p.alarm), ready: readiness(p),
      prep: Object.entries(p.prep).map(([id, v]) => ({ id, name: PREP_NAME[id], done: !!v })),
      crew: p.crew.map((m) => ({ id: m.id, name: m.name, role: ROLES[m.role].name, skill: Math.round(m.skill), loyal: Math.round(m.loyal), greed: Math.round(m.greed) })),
      missing: ROLE_IDS.filter((r) => !p.crew.some((m) => m.role === r)).map((r) => ROLES[r].name),
      day: p.day ?? null, monthsToDay: p.day != null ? p.day - mi(g) : null, months: mi(g) - p.since,
    } : null,
    loot: l ? { value: l.value, from: l.from, owner: l.owner, hot: Math.round(l.hot), inherited: !!l.inherited } : null,
    hunt: h ? { by: h.by, target: h.target, clue: Math.round(h.clue), word: hotWord(h.clue), monthsLeft: Math.max(0, h.until - mi(g)), placeName: placeName(h.place) } : null,
    done: s.done.map((x) => ({ ...x, kindName: KINDS[x.kind]?.name ?? '' })),
    crewBook: s.crewBook.map((b) => ({ name: b.name, role: ROLES[b.role]?.name ?? '', loyal: Math.round(b.loyal), grudge: !!b.grudge })),
    total: s.total, betrayed: s.betrayed, caught: s.caught,
    log: s.log.slice(0, 12),
    here: here(g),
  };
}

// 한 줄 요약 (상태 막대용). 꾸미는 일도 장물도 추적자도 없으면 빈 문자열.
export function heistLine(g) {
  const s = H(g), p = plan(g), bits = [];
  if (p) bits.push(`${J(p.name, '을/를')} 노리는 중 (일행 ${p.crew.length}명, 준비 ${readiness(p)})`);
  if (s.loot) bits.push(`장물 ${s.loot.value}닢 어치`);
  if (s.hunt) bits.push(`${J(s.hunt.by, '이/가')} ${hotWord(s.hunt.clue)}`);
  return bits.join(', ');
}
