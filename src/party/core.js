// 동료와 모험: 함께 다니는 동료(최대 3명, 나까지 4명).
// - 동료는 실제 인물(NPC)이다. 동료 정보는 그 사람의 p.comp에 둔다: { role, loyalty, joined, hired, wage, fights, wins, out }
// - 파티 명단은 game.party.members (사람 id 목록).
// - 교전(adventure/fight.js의 companionsFor)이 파티를 먼저 쓴다.
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { byId, ageYears } from '../npc.js';
import { L, note } from '../adventure/core.js';

export const MAX_COMPANIONS = 3;

// 역할: 전투력에 더하는 몫과 하는 일
export const ROLES = {
  blade: { name: '검사', pow: 8, desc: '앞에 서서 칼을 막는다.' },
  shield: { name: '방패잡이', pow: 4, guard: true, desc: '동료 대신 맞는다. 쓰러지는 사람이 줄어든다.' },
  archer: { name: '궁수', pow: 6, desc: '뒤에서 화살을 날린다.' },
  scout: { name: '척후', pow: 3, scout: true, desc: '길을 먼저 살핀다. 기습을 당하지 않고, 함정을 찾는다.' },
  mage: { name: '마법사', pow: 12, desc: '불과 얼음을 쏜다. 몸은 약하다.' },
  healer: { name: '치유사', pow: 0, heal: true, desc: '상처를 꿰매고 기도한다. 죽을 사람을 살린다.' },
};
// 직업으로 정하는 기본 역할
export function roleOfJob(job, rng) {
  if (job === 'knight' || job === 'old_knight') return 'shield';
  if (job === 'guard') return rng ? rng.pick(['blade', 'shield']) : 'blade';
  if (job === 'hunter') return rng ? rng.pick(['archer', 'scout']) : 'archer';
  if (job === 'hedge_mage' || job === 'court_mage') return 'mage';
  if (job === 'priest' || job === 'herbalist') return 'healer';
  return rng ? rng.pick(['blade', 'blade', 'archer', 'scout']) : 'blade';
}
// 동료가 될 수 있는 직업
export const FIGHT_JOBS = ['adventurer', 'guard', 'knight', 'hunter', 'hedge_mage', 'priest', 'herbalist', 'old_knight'];

export function defaultParty() { return { members: [], fallen: [], stories: {}, story: null }; }
export function P(g) {
  if (!g.party) g.party = defaultParty();
  return g.party;
}
HOOKS.newGame.push((g) => { g.party = defaultParty(); });
HOOKS.migrate.push((g) => { g.party = Object.assign(defaultParty(), g.party ?? {}); });

export const members = (g) => P(g).members.map((id) => byId(g, id)).filter((p) => p && p.alive && p.comp);
export const ready = (g) => members(g).filter((p) => !(p.comp.out > 0));

// 동료의 싸움 힘
export function compPow(p) {
  const R = ROLES[p.comp.role] ?? ROLES.blade;
  const age = ageYears(p);
  const agePen = age > 45 ? 0.8 : age < 17 ? 0.85 : 1;
  return Math.round((12 + p.skill * 0.45 + R.pow + (p.comp.wins ?? 0) * 0.3) * agePen * (p.comp.loyalty < 25 ? 0.85 : 1));
}

export const LOYAL_WORD = (v) => (v >= 80 ? '목숨을 맡길 사이' : v >= 60 ? '믿음직하다' : v >= 40 ? '그럭저럭' : v >= 20 ? '불만이 쌓였다' : '떠날 생각을 한다');

export function addLoyalty(p, n) { p.comp.loyalty = Math.max(0, Math.min(100, p.comp.loyalty + n)); return p.comp.loyalty; }

// 파티에 넣는다
export function join(g, p, { role, hired = false, wage = 0, loyalty } = {}) {
  const party = P(g);
  if (party.members.includes(p.id) || party.members.length >= MAX_COMPANIONS) return false;
  p.known = true;
  p.comp = { role: role ?? roleOfJob(p.job), loyalty: loyalty ?? Math.max(20, Math.min(90, 30 + p.affection * 0.6)), joined: g.date.year, hired, wage, fights: 0, wins: 0, out: 0 };
  p.place = L(g).place;
  party.members.push(p.id);
  p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 함께 다니기로 했다.` });
  note(g, `${J(p.name, '이/가')} 동료가 되었다 (${ROLES[p.comp.role].name}).`);
  return true;
}

// 파티에서 뺀다 (죽음, 떠남, 내보냄)
export function leave(g, p, why) {
  const party = P(g);
  party.members = party.members.filter((id) => id !== p.id);
  if (why) p.history.push({ y: g.date.year, m: g.date.month, text: why });
  if (p.comp) { p.comp.left = g.date.year; p.comp.out = 0; }
  delete p.comp;
}

// 화면용 (도우미스레드1이 동료·파티 화면에 쓴다)
export function partyStatus(g) {
  const party = P(g);
  return {
    size: members(g).length + 1, max: MAX_COMPANIONS + 1,
    members: members(g).map((p) => ({
      id: p.id, name: p.name, lastName: p.lastName, age: ageYears(p), job: p.job,
      role: p.comp.role, roleName: ROLES[p.comp.role]?.name, roleDesc: ROLES[p.comp.role]?.desc,
      traits: p.traits, loyalty: Math.round(p.comp.loyalty), loyaltyWord: LOYAL_WORD(p.comp.loyalty),
      pow: compPow(p), hired: !!p.comp.hired, wage: p.comp.wage, injured: p.comp.out > 0, outMonths: p.comp.out,
      fights: p.comp.fights, wins: p.comp.wins, since: p.comp.joined,
    })),
    fallen: party.fallen.slice(-8),
    story: party.story ? { id: party.story.id, title: party.story.title, step: party.story.step, steps: party.story.steps } : null,
  };
}
