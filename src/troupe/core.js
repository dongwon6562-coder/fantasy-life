// 유랑극단과 떠돌이 재주꾼: 상태와 도우미.
// - 음유시인 일자리(vocation 'bard')는 한 고장에 붙어 노래하는 일이다. 극단은 수레를 끌고 고장을 옮겨 다니는 무리다.
// - 극단에 단원으로 들거나(남의 극단), 내 극단을 꾸린다. 재주는 광대·곡예·악사·연극 넷. 악사 솜씨는 player.skills.music을 쓴다.
// - 극단이 옮길 때 나도 함께 길에 오른다(places의 life.travel). 남의 극단을 두고 내가 따로 떠나면 극단을 나온 것으로 친다.
// 상태는 game.troupe 하나: { t: 지금 극단 | null, skill: 재주 솜씨, shows, past: 거쳐 온 극단, banned, log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES, travelMonths } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 61) ^ Math.imul(mi(g) * 59 + salt + 23, 2654435761)) | 0 });

export const ACTS = {
  clown: { name: '광대 놀음', who: '광대', stats: ['cha', 'agi'], line: '얼굴에 분칠을 하고 넘어지고 또 넘어졌다.' },
  acro: { name: '곡예', who: '곡예사', stats: ['agi', 'str'], line: '두 길 높이의 장대 위에서 몸을 뒤집었다.' },
  music: { name: '노래와 연주', who: '악사', stats: ['sen', 'cha'], line: '류트를 켜고 북을 울렸다.' },
  play: { name: '연극', who: '배우', stats: ['cha', 'int'], line: '천막 무대에 올라 남의 삶을 살았다.' },
};
export const ACT_IDS = Object.keys(ACTS);
// 내 재주 솜씨: 악사는 음악 솜씨, 나머지는 극단에서 쌓은 솜씨. 능력치가 받쳐 준다.
export function actSkill(g, act) {
  const base = act === 'music' ? (g.player.skills.music ?? 0) : (T(g).skill[act] ?? 0);
  const [a, b] = ACTS[act]?.stats ?? ['cha', 'cha'];
  return base + stat(g, a) * 0.35 + stat(g, b) * 0.15;
}

// 고장마다 관객: 무엇을 좋아하나(배수)와 검열이 얼마나 센가(0 풀어 줌 ~ 3 엄함)
const TASTE = {
  village: { clown: 1.3, acro: 1.1, music: 1.1, play: 0.7, censor: 1, name: '시골 사람들은 넘어지고 맞는 광대 놀음에 배를 잡는다.' },
  town: { clown: 1, acro: 1.2, music: 1, play: 1, censor: 1, name: '장터 사람들은 높이 나는 곡예에 은화를 던진다.' },
  capital: { clown: 0.8, acro: 1.1, music: 1, play: 1.4, censor: 2, name: '왕도 사람들은 눈이 높다. 연극이 아니면 오래 서 있지 않는다.' },
  holy: { clown: 0.6, acro: 0.9, music: 1.3, play: 1, censor: 3, name: '성도 사람들은 성가 같은 노래를 좋아하고, 우스개에는 얼굴을 찡그린다.' },
  free: { clown: 1, acro: 1, music: 1, play: 1.3, censor: 0, name: '자유도시 사람들은 높은 사람을 비웃는 풍자극에 열광한다.' },
  empire: { clown: 0.8, acro: 1.2, music: 1, play: 1.1, censor: 3, name: '제국 사람들은 질서를 좋아한다. 황제를 건드리는 말은 목숨값이다.' },
  magic: { clown: 0.9, acro: 1, music: 1.1, play: 1.3, censor: 1, name: '마법도시 사람들은 머리를 쓰는 연극을 좋아한다.' },
  elf: { clown: 0.5, acro: 1, music: 1.6, play: 0.9, censor: 1, name: '엘프들은 노래 말고는 거의 웃지 않는다.' },
  dwarf: { clown: 1, acro: 1.4, music: 1, play: 0.6, censor: 1, name: '드워프들은 힘과 재주를 보여 주는 곡예에 탁자를 두드린다.' },
  beast: { clown: 1.1, acro: 1.2, music: 1.3, play: 0.5, censor: 0, name: '수인들은 북소리에 맞춰 함께 발을 구른다.' },
  sea: { clown: 1.2, acro: 1, music: 1.2, play: 0.9, censor: 0, name: '뱃사람들은 뱃노래와 거친 우스개를 좋아한다.' },
};
const TASTE_OF = {
  ern: 'village', gruental: 'village', klein: 'sea', saltrock: 'sea', saltmare: 'sea', portel: 'free', barka: 'free', harfen: 'town', verden: 'town', graubel: 'town',
  leocast: 'capital', solaris: 'holy', eisen: 'empire', serenia: 'magic', silverleaf: 'elf', hammer: 'dwarf', gorge: 'dwarf', fur: 'beast',
};
export const tasteOf = (pl) => TASTE[TASTE_OF[pl] ?? 'town'];
export const tasteId = (pl) => TASTE_OF[pl] ?? 'town';
export const crowdOf = (pl) => { const h = PLACES[pl]?.house ?? 0; return h >= 750 ? 3 : h >= 280 ? 2 : 1; };
export const stageOk = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
// 다음 고장 후보: 가까운 곳부터
export function nextStops(pl, n = 4) {
  return Object.keys(PLACES).filter((id) => id !== pl && stageOk(id) && travelMonths(pl, id) <= 3)
    .sort((a, b) => travelMonths(pl, a) - travelMonths(pl, b) || a.localeCompare(b)).slice(0, n);
}

export const TROUPE_NAMES = ['잿빛 수레', '떠돌이 등불', '일곱 가면', '바람개비', '마지막 막', '은종'];
const MEMBER_NAMES = ['외줄의 리아', '키다리 오스발트', '목소리 고운 에다', '불 먹는 카즈', '늙은 연출가 베네딕트', '쌍둥이 곡예사 펠과 핀', '가면장이 마르고', '북치기 루돌', '떠돌이 각본가 헤르만', '말 많은 광대 지기'];
export const MEMBER_POOL = MEMBER_NAMES;
export const WAGE = 2; // 내 극단 단원 하나의 달 삯

function fresh() {
  return { t: null, skill: { clown: 0, acro: 0, play: 0 }, shows: 0, best: null, past: [], banned: {}, log: [], seq: 1, arriveAt: 0, eventAt: 0, visiting: null, feasts: 0, satires: 0, founded: 0 };
}
export const T = (g) => (g.troupe ??= fresh());
export const myTroupe = (g) => T(g).t;
export const own = (g) => !!myTroupe(g)?.own;
export const withTroupe = (g) => !!myTroupe(g) && myTroupe(g).place === here(g) && !L(g).travel;
export const bannedHere = (g, pl = here(g)) => (T(g).banned[pl] ?? -1) >= mi(g);

export function newMember(g, rng, act, used = new Set()) {
  const s = T(g);
  const name = rng.pick(MEMBER_NAMES.filter((n) => !used.has(n))) ?? rng.pick(MEMBER_NAMES);
  return { id: s.seq++, name, act: ACTS[act] ? act : rng.pick(ACT_IDS), skill: rng.int(25, 60), mood: rng.int(45, 70), since: mi(g), love: 0 };
}
export function newTroupe(g, rng, { own: mine, name, place }) {
  const used = new Set();
  const members = [];
  for (const act of ['clown', 'acro', 'music']) { const m = newMember(g, rng, act, used); used.add(m.name); members.push(m); }
  return { name, own: !!mine, leader: mine ? g.player.name : '늙은 연출가 베네딕트', place, members: mine ? members : members.filter((m) => m.name !== '늙은 연출가 베네딕트'), fame: mine ? 5 : 25, wagon: 70, stay: 0, since: mi(g), lead: null, shows: 0, earned: 0, gens: 1, satire: false };
}
export function logTroupe(g, text) {
  const s = T(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
export function leaveTroupe(g, how) {
  const s = T(g), t = s.t;
  if (!t) return;
  s.past.unshift({ name: t.name, own: t.own, year: g.date.year, how, shows: t.shows, fame: Math.round(t.fame) });
  if (s.past.length > 8) s.past.length = 8;
  s.t = null;
  logTroupe(g, `${t.name}: ${how}.`);
}
export const fameWord = (f) => (f >= 70 ? '온 대륙이 아는' : f >= 45 ? '이름난' : f >= 25 ? '고장마다 기다리는' : f >= 10 ? '조금 알려진' : '이름 없는');
export const lover = (g) => myTroupe(g)?.members.find((m) => m.love >= 60) ?? null;

HOOKS.newGame.push((g) => { g.troupe = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.troupe && typeof g.troupe === 'object' ? g.troupe : {});
  if (!s.skill || typeof s.skill !== 'object') s.skill = fresh().skill;
  for (const k of ['clown', 'acro', 'play']) if (!Number.isFinite(s.skill[k])) s.skill[k] = 0;
  for (const k of ['past', 'log']) if (!Array.isArray(s[k])) s[k] = [];
  s.past = s.past.filter((x) => x && typeof x === 'object');
  if (s.visiting && (typeof s.visiting !== 'object' || typeof s.visiting.name !== 'string' || !stageOk(s.visiting.place) || !Number.isFinite(s.visiting.until))) s.visiting = null;
  if (!s.banned || typeof s.banned !== 'object' || Array.isArray(s.banned)) s.banned = {};
  for (const k of ['seq', 'shows', 'arriveAt', 'eventAt', 'feasts', 'satires']) if (!Number.isFinite(s[k])) s[k] = k === 'seq' ? 1 : 0;
  const t = s.t;
  if (t && (typeof t !== 'object' || !stageOk(t.place) || typeof t.name !== 'string')) s.t = null;
  if (s.t) {
    if (!Array.isArray(t.members)) t.members = [];
    t.members = t.members.filter((m) => m && typeof m.name === 'string' && ACTS[m.act]);
    for (const m of t.members) for (const k of ['id', 'skill', 'mood', 'love', 'since']) if (!Number.isFinite(m[k])) m[k] = k === 'id' ? s.seq++ : k === 'love' ? 0 : 40;
    for (const k of ['fame', 'wagon', 'stay', 'shows', 'earned', 'gens']) if (!Number.isFinite(t[k])) t[k] = k === 'wagon' ? 70 : k === 'gens' ? 1 : 0;
    t.fame = clamp(t.fame, 0, 100); t.wagon = clamp(t.wagon, 0, 100);
    t.own = !!t.own;
    if (typeof t.leader !== 'string') t.leader = '연출가';
    if (t.lead != null && !ACTS[t.lead]) t.lead = null;
    if (t.myAct != null && !ACTS[t.myAct]) t.myAct = null;
    if (t.moving != null && !stageOk(t.moving)) t.moving = null;
  }
  g.troupe = s;
});
