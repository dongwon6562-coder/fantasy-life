// 풀리지 않은 일: 상태, 사건 만들기, 도우미, 대 잇기.
// - game.mystery: 지금 캐는 사건(cases), 식은 사건과 잘못 끝난 사건(cold, 대를 넘어 남는다), 성적, 기록.
// - 사건 = 한 고장에서 벌어진 실종·독살·도난·유령 소문. 용의자 셋(가운데 하나가 진범, 또는 아무도 아님).
//   단서를 모으면 죄 없는 사람은 하나씩 풀려나고(cleared), 진범은 드러난다(pointed).
//   캐물을수록 진범이 눈치를 챈다(heat). heat가 오르면 돈을 내밀거나(엉뚱한 사람 몰기) 보복한다.
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L, note } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { J } from '../narrative/text.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const skill = (g, id) => g.player.skills[id] ?? 0;
export const bigTown = (pl) => ['leocast', 'eisen', 'solaris', 'serenia', 'barka'].includes(pl);

const M_NAMES = ['오토', '하인츠', '베른', '루돌프', '게오르크', '마틴', '얀', '디터', '울리히', '카를', '페터', '알빈'];
const F_NAMES = ['마르타', '그레타', '안나', '리제', '헬가', '클라라', '로자', '엘자', '이다', '프리다', '베르타', '한나'];

// kind: 실종·독살·도난·유령 소문. victim: 사건의 주인공(없어진 사람, 죽은 사람, 없어진 물건, 소문의 장소).
// roles: 용의자 [역할, 성별, 동기]. none: 진범이 없을 수도 있는 사건의 참된 결말. reward: 풀면 받는 사례금.
export const KINDS = {
  missing: {
    name: '실종', reward: 30,
    victims: [['방앗간 집 딸', 'f'], ['대장간 견습생', 'm'], ['과부의 외아들', 'm'], ['양치기 소녀', 'f']],
    roles: [['떠돌이 노예상', 'm', '사람을 사고판다'], ['마을 사냥꾼', 'm', '그 아이와 다툰 일이 있다'], ['몰래 만나던 연인', 'x', '함께 떠나자고 했다는 말이 있다'], ['양아버지', 'm', '집에서 소리가 자주 났다']],
    none: '스스로 떠났다', noneText: (c) => `${J(c.victim, '은/는')} 누구에게 끌려간 것이 아니었다. 먼 고장에서 보낸 짧은 편지가 닿았다. "찾지 마세요. 잘 살고 있어요."`,
    open: (c) => `${J(c.victim, '이/가')} 열흘째 돌아오지 않는다. 마지막으로 본 곳은 마을 끝 다리였다.`,
  },
  poison: {
    name: '독살', reward: 50,
    victims: [['늙은 포목상', 'm'], ['촌장의 맏형', 'm'], ['부유한 과부', 'f'], ['여관 주인', 'm']],
    roles: [['상속받을 조카', 'x', '유산이 걸려 있다'], ['젊은 아내', 'f', '맞고 살았다는 소문이 있다'], ['약초상', 'x', '죽은 이에게 큰 빚이 있었다'], ['오래 일한 하녀', 'f', '품삯을 떼였다']],
    open: (c) => `${J(c.victim, '이/가')} 저녁을 먹다 쓰러져 그 밤에 죽었다. 입술이 검푸렀다. 사람들은 체한 것이라 하지만 아무도 그렇게 믿지 않는다.`,
  },
  theft: {
    name: '도난', reward: 40,
    victims: [['예배당의 은 성배', 'x'], ['영주 대리인의 인장 반지', 'x'], ['상인 조합의 금고', 'x'], ['교회 헌금 상자', 'x']],
    roles: [['떠돌이 악사', 'm', '그날 밤 마을에 있었다'], ['새로 온 하인', 'x', '열쇠를 만질 수 있었다'], ['야경꾼', 'm', '노름빚이 있다'], ['뒷골목 장물아비', 'm', '그런 물건을 사고판다']],
    open: (c) => `${J(c.victim, '이/가')} 하룻밤 새 사라졌다. 문은 부서지지 않았다. 안을 아는 사람의 짓이다.`,
  },
  ghost: {
    name: '유령 소문', reward: 20,
    victims: [['폐가의 불빛', 'x'], ['우물 속 울음소리', 'x'], ['묘지의 흰 그림자', 'x'], ['물레방아의 노랫소리', 'x']],
    roles: [['밀수꾼', 'm', '폐가 근처에서 자주 보인다'], ['자식 잃은 과부', 'f', '밤마다 그쪽으로 걷는다'], ['묘지기', 'm', '사람들이 그쪽에 오지 않기를 바란다'], ['떠돌이 약장수', 'x', '부적을 팔고 있다']],
    none: '정말 혼이었다', noneText: (c) => `${J(c.victim, '은/는')} 사람의 짓이 아니었다. 옛 기록을 뒤지자 그 자리에서 오래전 억울하게 죽은 사람이 있었다. 사제를 불러 혼을 달래 주자 그 뒤로 조용해졌다.`,
    open: (c) => `요즘 ${J(c.victim, '이/가')} 마을의 이야깃거리다. 아이들은 밤에 나가지 않고, 어른들은 못 본 척한다.`,
  },
};
export const KIND_IDS = Object.keys(KINDS);

function fresh() {
  return {
    seq: 1,
    cases: [], // 지금 열린 사건
    cold: [], // 식은 사건, 잘못 끝난 사건, 덮은 사건 (대를 넘어 남는다, 최대 16)
    solved: 0, wrong: 0, framed: 0, dropped: 0, oldSolved: 0,
    log: [],
  };
}
export const M = (g) => (g.mystery ??= fresh());
HOOKS.newGame.push((g) => { g.mystery = fresh(); });
HOOKS.migrate.push((g) => {
  const d = fresh();
  g.mystery = Object.assign(d, g.mystery ?? {});
  for (const k of ['cases', 'cold', 'log']) if (!Array.isArray(g.mystery[k])) g.mystery[k] = [];
  g.mystery.cases = g.mystery.cases.filter((c) => c && KINDS[c.kind] && Array.isArray(c.suspects) && c.suspects.length);
  g.mystery.cold = g.mystery.cold.filter((c) => c && KINDS[c.kind] && Array.isArray(c.suspects));
});
export function logMystery(g, text) {
  const m = M(g);
  m.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (m.log.length > 24) m.log.length = 24;
}

export const caseById = (g, id) => M(g).cases.find((c) => c.id === id) ?? null;
export const openHere = (g, pl = here(g)) => M(g).cases.find((c) => c.place === pl && c.state === 'open') ?? null;
export const culpritOf = (c) => c.suspects.find((s) => s.guilty) ?? null;
export const kindName = (c) => KINDS[c.kind]?.name ?? '사건';
export const caseTitle = (c) => `${placeName(c.place)}의 ${c.victim}`;

function nameFor(rng, sex) {
  const s = sex === 'x' ? (rng.chance(0.5) ? 'm' : 'f') : sex;
  return rng.pick(s === 'f' ? F_NAMES : M_NAMES);
}

/** 사건 하나를 만든다. 진범 하나(또는 KINDS.none이 있으면 가끔 아무도 아님). */
export function makeCase(g, rng, pl, kind = rng.pick(KIND_IDS)) {
  const K = KINDS[kind], m = M(g);
  const [victim] = rng.pick(K.victims);
  const pool = [...K.roles];
  for (let i = pool.length - 1; i > 0; i--) { const j = rng.int(0, i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const roles = pool.slice(0, 3);
  const none = !!K.none && rng.chance(kind === 'ghost' ? 0.35 : 0.25);
  const guilty = none ? -1 : rng.int(0, 2);
  const used = new Set();
  const suspects = roles.map(([role, sex, motive], i) => {
    let n = nameFor(rng, sex);
    for (let k = 0; k < 4 && used.has(n); k++) n = nameFor(rng, sex);
    used.add(n);
    return { name: `${role} ${n}`, role, motive, guilty: i === guilty, cleared: false, pointed: false };
  });
  const c = { id: m.seq++, kind, place: pl, year: g.date.year, at: mi(g), victim, suspects, clues: [], heat: 0, none, state: 'open', by: g.player.name, offered: false };
  m.cases.push(c);
  return c;
}

/** 사건을 닫는다. state: solved | wrong | dropped | cold | framed */
export function closeCase(g, c, state, extra = {}) {
  const m = M(g);
  c.state = state; c.closedAt = mi(g); c.by = g.player.name;
  Object.assign(c, extra);
  m.cases = m.cases.filter((x) => x !== c);
  if (state !== 'solved') { m.cold.push(c); if (m.cold.length > 16) m.cold.splice(0, m.cold.length - 16); }
}

/* ---------- 대 잇기: 열린 사건은 식고, 식은 사건은 집안에 남는다 ---------- */
HOOKS.heir.push((g) => {
  const m = M(g);
  for (const c of [...m.cases]) { c.heir = true; closeCase(g, c, 'cold'); }
  for (const c of m.cold) c.ancestor = true;
  m.solved = 0; m.wrong = 0; m.framed = 0; m.dropped = 0;
  const wrong = m.cold.filter((c) => (c.state === 'wrong' || c.state === 'framed') && !c.exposed).length;
  if (m.cold.length) note(g, `선대가 풀지 못한 일 ${m.cold.length}건이 집안 이야기로 남았다.${wrong ? ' 그 가운데에는 끝내 말하지 못한 일도 있다.' : ''}`);
});
