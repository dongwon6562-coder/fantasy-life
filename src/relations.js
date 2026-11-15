// 관계: 친구, 라이벌, 첫사랑, 연인, 배우자, 원수. NPC가 나와 있었던 일을 기억한다.
// 찾아가기는 짧은 장면 글 + 이어지는 대화 선택지(사건 창)로 나온다.
// 혼인하면 배우자가 집안 식구가 되고, 아이가 태어난다.
//
// 사람마다 더하는 필드 (rel()이 기본값을 채운다)
//   memories: [{ y, m, text, tone, tag?, recall? }]  NPC가 기억하는 나와의 일 (최대 10개)
//   romance: 0~100   나에 대한 연정
//   rivalry: 0~100   나에 대한 경쟁심
//   bond: null | 'lover' | 'spouse' | 'ex' | 'enemy'
//   lastSeen: 마지막으로 만난 달 (year*12+month)
// game.player.firstLoveId: 첫사랑
// game.relations: { talk, ties, news, heartbreak, tryChild }
import { EVENTS } from './events.js';
import { HOOKS } from './hooks.js';
import { me, playerAge, gainStat, gainSkill, rngOf } from './game.js';
import { living, byId, ageYears, fullName, has, makePerson, bodyAgeOf } from './npc.js';
// 다른 종족(src/races/)이 끼어드는 자리: 아이가 생길 확률 배율, 처음 보는 사람이 나를 대하는 태도
const HOOK = { fertility: () => 1, affinity: () => 0 };
export function setRelationHooks(h) { Object.assign(HOOK, h); }
// 다른 갈래(신앙 등)가 호감에 더하는 몫. 종족의 affinity와 합쳐진다.
const AFFINITY = [];
export function addAffinity(fn) { AFFINITY.push(fn); }
const affinityOf = (g, p) => AFFINITY.reduce((a, f) => a + (f(g, p) || 0), HOOK.affinity(g, p));
import { JOBS, SKILLS } from './data.js';
import { J, join, up, gains, splitResult, pickLine } from './narrative/text.js';
import * as S from './narrative/talk-text.js';
import { reputationShift } from './crime.js';

// 악명과 이름값 (game.life)
const noto = (g) => g.life?.notoriety ?? 0;
const renownOf = (g) => g.life?.renown ?? 0;
// 고백·청혼 때 악명이 미치는 영향: 바른 사람일수록 꺼린다. 거친 사람은 오히려 끌린다.
function repOdds(g, p) {
  const n = noto(g);
  let k = -n / 200;
  if (has(p, 'pious') || has(p, 'kind')) k *= 2;
  if (has(p, 'cruel') || has(p, 'brave')) k = n / 400;
  return k + renownOf(g) / 300;
}

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const stress = (g, n) => { g.player.stress = clamp(g.player.stress + n, 0, 100); };
const note = (g, p, text) => p.history.push({ y: g.date.year, m: g.date.month, text });

export function rel(p) {
  p.memories ??= [];
  p.romance ??= 0;
  p.rivalry ??= 0;
  p.bond ??= null;
  p.lastSeen ??= null;
  return p;
}
export function relState(g) {
  g.relations ??= {};
  const R = g.relations;
  R.talk ??= null;
  R.ties ??= [];
  R.news ??= [];
  R.heartbreak ??= null;
  R.tryChild ??= 0;
  return R;
}

// ---------- 기억 ----------
// text는 '~했다'로 끝나는 과거형. 대화에서 '~했던 일'로 바꿔 꺼낸다.
// tone: 1 좋은 기억, -1 나쁜 기억, 0 그저 있었던 일. tag가 같으면 새 기억으로 갈아 끼운다.
export function remember(g, p, text, tone = 0, opts = {}) {
  if (!p || p.isPlayer) return;
  rel(p);
  if (opts.tag) {
    const i = p.memories.findIndex((x) => x.tag === opts.tag);
    if (i >= 0) p.memories.splice(i, 1);
  }
  p.memories.push({ y: g.date.year, m: g.date.month, text, tone, tag: opts.tag, recall: opts.recall });
  if (p.memories.length > 10) {
    const i = p.memories.findIndex((x) => !x.tone);
    p.memories.splice(i >= 0 ? i : 0, 1);
  }
  if (opts.log) note(g, p, opts.log);
}
export const meetMemory = (g, p, text) => remember(g, p, text, 1, { tag: 'met' });
const recallOf = (m) => m.recall ?? m.text.replace(/다$/, '던 일');
export const memoriesOf = (p) => rel(p).memories;

// ---------- 관계 판별 ----------
function isKin(g, p) {
  const meP = me(g);
  if (p.id === meP.spouseId) return false;
  if (g.player.familyIds.includes(p.id)) return true;
  if (p.fatherId === meP.id || p.motherId === meP.id || meP.fatherId === p.id || meP.motherId === p.id) return true;
  if (p.fatherId && p.fatherId === meP.fatherId) return true;
  if (p.motherId && p.motherId === meP.motherId) return true;
  return false;
}

// 화면용 관계 이름: '아버지', '연인', '라이벌', '친구 · 첫사랑' 같은 것
export function relationLabel(g, p) {
  rel(p);
  const meP = me(g);
  const tags = [];
  if (p.id === meP.spouseId || p.bond === 'spouse') tags.push(p.alive ? '배우자' : '먼저 떠난 배우자');
  else if (p.fatherId === meP.id || p.motherId === meP.id) tags.push(p.sex === 'm' ? '아들' : '딸');
  else if (meP.fatherId === p.id) tags.push('아버지');
  else if (meP.motherId === p.id) tags.push('어머니');
  else if ((p.fatherId && p.fatherId === meP.fatherId) || (p.motherId && p.motherId === meP.motherId)) {
    const older = p.ageMonths > meP.ageMonths;
    if (older) tags.push(p.sex === 'm' ? (meP.sex === 'm' ? '형' : '오빠') : (meP.sex === 'm' ? '누나' : '언니'));
    else tags.push(p.sex === 'm' ? '남동생' : '여동생');
  } else if (p.bond === 'lover') tags.push(p.alive ? '연인' : '먼저 떠난 연인');
  else if (p.bond === 'ex') tags.push('옛 연인');
  else if (p.bond === 'enemy' || p.affection <= -40) tags.push('원수');
  else if (p.rivalry >= 40) tags.push(p.affection >= 35 ? '좋은 맞수' : '라이벌');
  else if (p.affection >= 65) tags.push('절친한 친구');
  else if (p.affection >= 35) tags.push('친구');
  else if (p.affection <= -15) tags.push('사이 나쁨');
  else tags.push('아는 사이');
  if (g.player.firstLoveId === p.id && p.bond !== 'spouse') tags.push('첫사랑');
  return tags.join(' · ');
}

function role(g, p) {
  const meP = me(g);
  if (p.id === meP.spouseId) return 'spouse';
  if (meP.fatherId === p.id) return 'father';
  if (meP.motherId === p.id) return 'mother';
  if (p.fatherId === meP.id || p.motherId === meP.id) return 'child';
  if (isKin(g, p)) return 'sibling';
  if (p.bond === 'lover') return 'lover';
  if (p.bond === 'ex') return 'ex';
  if (p.bond === 'enemy' || p.affection <= -40) return 'enemy';
  if (p.rivalry >= 35) return 'rival';
  if (p.affection >= 35) return 'friend';
  return 'acq';
}

export function canRomance(g, p) {
  if (!p || !p.alive || p.away || p.isPlayer) return false;
  const meP = me(g);
  const a = playerAge(g), b = ageYears(p);
  if (a < 12 || b < 12) return false;
  if (isKin(g, p)) return false;
  if (p.spouseId && p.spouseId !== meP.id) return false;
  if (meP.spouseId && meP.spouseId !== p.id) return false; // 외도는 아직 없다
  if (p.bond === 'enemy') return false;
  const lim = Math.min(a, b) < 18 ? 3 : 12;
  return Math.abs(a - b) <= lim;
}
// 끌림: 사람마다 정해진 궁합 (0~1). 같은 두 사람은 늘 같다.
export function chemistry(g, p) {
  const h = Math.imul(p.id ^ 0x9e3779b1, 2654435761) ^ Math.imul(g.player.id + 7, 40503) ^ (g.rngSeed ?? 0);
  return ((h >>> 0) % 1000) / 1000;
}

// ---------- 찾아가기 ----------
export function visitPerson(g, rng, p) {
  rel(p);
  const meP = me(g);
  const r = role(g, p);
  const long = p.lastSeen != null && mi(g) - p.lastSeen > 12;
  let gain = rng.int(4, 9) + (has(p, 'kind') ? 2 : 0) - (has(p, 'cruel') ? 3 : 0) + (long ? 2 : 0);
  if (r === 'enemy') gain = Math.round(gain / 3);
  if (!['father', 'mother', 'sibling', 'child', 'spouse'].includes(r)) gain = Math.max(r === 'enemy' ? 0 : 1, gain + reputationShift(g, p) + affinityOf(g, p));
  p.affection = Math.min(100, p.affection + gain);
  const c = gainStat(g, 'cha', 0.4);
  if (canRomance(g, p)) {
    const ch = chemistry(g, p);
    if (ch > 0.3 || p.bond === 'lover' || p.id === meP.spouseId) {
      const rom = (ch * 5 + g.player.stats.cha / 30 + (p.affection > 40 ? 2 : 0)) * rng.float(0.5, 1.2);
      p.romance = Math.min(100, p.romance + Math.round(rom));
    }
  }
  const scene = pickLine(g, rng, S.VISIT, { p, role: r, n: p.name }) || `${J(p.name, '과/와')} 시간을 보냈다.`;
  const lead = long ? `${J(p.name, '과/와')} 이렇게 마주 앉은 게 얼마 만인지 몰랐다.` : '';
  p.lastSeen = mi(g);
  if (r === 'friend' || r === 'acq') remember(g, p, '함께 시간을 보냈다', 1, { tag: 'visit' });
  queueTalk(g, p, rng);
  return join(lead, scene, S.closeness(p.affection), gains(`호감 +${gain}`, up('매력', c)));
}

const PRIORITY = { propose: 7, confess: 6, crush: 5, enemy: 4, rival: 3, spouse: 2, chat: 1, chat_young: 1 };
function talkKind(g, p) {
  const meP = me(g);
  const a = playerAge(g);
  if (p.id === meP.spouseId) return 'spouse';
  if (p.bond === 'enemy' || p.affection <= -30) return 'enemy';
  if (canRomance(g, p)) {
    if (p.bond === 'lover' && a >= 17 && ageYears(p) >= 17 && p.romance >= 60 && p.affection >= 50) return 'propose';
    if (p.bond !== 'lover' && a >= 15 && ageYears(p) >= 15 && p.romance >= 40 && p.affection >= 35) return 'confess';
    if (!g.player.firstLoveId && a <= 17 && p.romance >= 20 && p.bond !== 'lover') return 'crush';
  }
  if (p.rivalry >= 35) return 'rival';
  return a < 13 ? 'chat_young' : 'chat';
}
export function queueTalk(g, p, rng) {
  const R = relState(g);
  const kind = talkKind(g, p);
  // 평범한 대화는 가끔만 장면으로 이어진다. 같은 사람과는 석 달에 한 번 정도.
  if (PRIORITY[kind] <= 2) {
    if (p._talkAt != null && mi(g) - p._talkAt < 3) return;
    if (!rng.chance(kind === 'spouse' ? 0.3 : 0.4)) return;
  }
  const cur = R.talk && R.talk.at === mi(g) ? R.talk : null;
  if (cur && PRIORITY[cur.kind] >= PRIORITY[kind]) return;
  R.talk = { id: p.id, kind, at: mi(g) };
  p._talkAt = mi(g);
}
// 사건을 고를 때는 이미 달이 넘어가 있다
function talkTarget(g, kind) {
  const t = g.relations?.talk;
  if (!t || t.kind !== kind || t.at !== mi(g) - 1) return null;
  const p = byId(g, t.id);
  return p && p.alive && !p.away ? p : null;
}
const curTalk = (g) => { const p = byId(g, g.relations?.talk?.id); return p?.alive ? p : null; };
const endTalk = (g) => { relState(g).talk = null; };

// 대화 장면의 첫 문단: 장소 + 상대의 기색 + (가끔) 기억 꺼내기
function opening(g, p, body) {
  const rng = rngOf(g);
  const x = { p, role: role(g, p), n: p.name };
  const home = ['spouse', 'father', 'mother', 'sibling', 'child'].includes(x.role);
  const parts = [pickLine(g, rng, home ? S.HOME_SETTING : S.SETTING, x)];
  const t = p.traits.filter((k) => S.MOOD[k]);
  const mems = rel(p).memories.filter((m) => m.tone !== 0 && m.tag !== 'visit');
  if (mems.length && rng.chance(0.5)) {
    const m = rng.pick(mems);
    parts.push((m.tone > 0 ? rng.pick(S.RECALL_GOOD) : rng.pick(S.RECALL_BAD))(p.name, recallOf(m)));
  } else if (!home && (noto(g) >= 15 || renownOf(g) >= 15) && rng.chance(0.45)) {
    parts.push(S.reputationLine(p, noto(g), renownOf(g)));
  } else if (t.length && rng.chance(0.6)) parts.push(S.MOOD[rng.pick(t)](p.name));
  const b = Array.isArray(body) ? rng.pick(body) : body;
  parts.push(typeof b === 'function' ? b(p, g) : b);
  return join(...parts);
}

// ---------- 대화 사건들 ----------
function talkEvent(kind, title, body, choices) {
  return {
    id: 'talk_' + kind,
    cond: (g) => !!talkTarget(g, kind),
    weight: 80,
    title,
    text: (g) => opening(g, talkTarget(g, kind), body),
    choices: choices.map(([label, fn]) => ({
      label,
      run: (g, rng) => {
        const p = curTalk(g);
        endTalk(g);
        if (!p) return '이야기는 흐지부지 끝났다.';
        rel(p);
        return fn(g, rng, p);
      },
    })),
  };
}

const n = (p) => p.name;

EVENTS.push(
  talkEvent('chat_young', '나란히 앉아', [
    (p) => `${J(n(p), '이/가')} 무슨 할 말이 있는 얼굴로 옆구리를 쿡 찔렀다.`,
    (p) => `${J(n(p), '이/가')} 주머니에서 반들반들한 돌멩이를 꺼내 보여 주었다. 숲에서 주웠다고 했다.`,
    (p) => `${J(n(p), '은/는')} 어른들이 밤에 수군거리는 이야기를 엿들었다며 목소리를 낮췄다.`,
    (p) => `한참 놀다 지쳐 나란히 드러누웠다. ${J(n(p), '이/가')} 하늘을 보며 커서 뭐가 될 거냐고 물었다.`,
  ], [
    ['비밀을 털어놓는다', (g, rng, p) => {
      if (has(p, 'gossip') && rng.chance(0.4)) {
        p.affection += 2; stress(g, 8);
        remember(g, p, '비밀을 들었다', 0);
        return `둘만 아는 이야기라고 다짐을 받았다. 사흘 뒤, 골목 아이들 모두가 그 이야기를 알고 있었다. ${J(n(p), '은/는')} 눈을 피했다.`;
      }
      p.affection += rng.int(4, 8);
      remember(g, p, '서로 비밀을 하나씩 나눴다', 1, { tag: 'secret', log: `${J(g.player.name, '과/와')} 비밀을 나눴다.` });
      return `아무에게도 말하지 않은 이야기를 했다. ${J(n(p), '은/는')} 한참 생각하더니 자기 비밀도 하나 꺼냈다. 이제 둘은 서로의 약점을 쥔 사이다.`;
    }],
    ['내기를 건다', (g, rng, p) => {
      p.rivalry = Math.min(100, p.rivalry + rng.int(4, 8));
      const won = g.player.stats.agi + g.player.stats.str / 2 + rng.int(-8, 8) > 6 + ageYears(p) * 1.6;
      if (won) {
        gainStat(g, 'wil', 0.3);
        remember(g, p, '고목 오르기 내기에서 졌다', -1, { tag: 'bet', recall: '고목 오르기 내기에서 내가 졌던 일' });
        return `누가 먼저 고목 꼭대기에 닿나 내기를 했다. 이겼다. ${J(n(p), '은/는')} 나뭇가지에 매달린 채 다음엔 두고 보자고 했다.`;
      }
      remember(g, p, '고목 오르기 내기에서 이겼다', 1, { tag: 'bet' });
      return `누가 먼저 고목 꼭대기에 닿나 내기를 했다. 졌다. 손바닥이 다 까졌는데, 이상하게 분하기보다 웃음이 났다.`;
    }],
    ['말없이 곁에 있는다', (g, rng, p) => {
      const bonus = has(p, 'reserved') || has(p, 'timid') ? 4 : 0;
      p.affection += 3 + bonus; stress(g, -5);
      return bonus
        ? `아무 말도 하지 않았다. ${J(n(p), '은/는')} 그게 오히려 편한 듯했다. 헤어질 때 처음으로 먼저 손을 흔들었다.`
        : '해가 질 때까지 나란히 앉아 개울을 보았다. 할 말이 없어도 괜찮았다.';
    }],
  ]),

  talkEvent('chat', '마주 앉아', [
    (p, g) => playerAge(g) >= 16 ? `${J(n(p), '이/가')} 잔을 내려놓으며 요즘 어떻게 지내느냐고 물었다.` : `${J(n(p), '이/가')} 요즘 어떻게 지내느냐고 물었다.`,
    (p) => `${J(n(p), '은/는')} 한동안 딴 데를 보다가, 사실 할 이야기가 있었다며 입을 열었다.`,
    (p) => `이야기가 끊긴 사이, ${J(n(p), '이/가')} 먼저 물었다. "넌 요즘 무슨 생각 하며 사냐."`,
    (p) => `${J(n(p), '은/는')} 오늘 하루가 유난히 길었다며 기지개를 켰다.`,
  ], [
    ['속마음을 털어놓는다', (g, rng, p) => {
      if (has(p, 'gossip') && rng.chance(0.35)) {
        stress(g, 10);
        remember(g, p, '속내를 들었다', 0);
        return `오래 묵혀 둔 이야기를 꺼냈다. 다음 주, 그 이야기가 우물가에서 돌고 있었다. 살짝 덧붙여진 채로.`;
      }
      p.affection += rng.int(4, 8); stress(g, -10);
      if (canRomance(g, p) && chemistry(g, p) > 0.4) p.romance = Math.min(100, p.romance + 3);
      remember(g, p, '서로 속마음을 털어놓았다', 1, { tag: 'heart', log: `${J(g.player.name, '과/와')} 깊은 이야기를 나눴다.` });
      return has(p, 'cruel')
        ? `털어놓고 나니 ${J(n(p), '이/가')} 코웃음을 쳤다. 그런데도 끝까지 들어 준 건 ${n(p)}뿐이었다.`
        : `오래 묵혀 둔 이야기를 꺼냈다. ${J(n(p), '은/는')} 끼어들지 않고 끝까지 들었다. 말하고 나니 어깨가 가벼워졌다.`;
    }],
    ['도움을 청한다', (g, rng, p) => {
      const skill = JOBS[p.job]?.skill;
      if (has(p, 'cruel') || p.affection < 10) {
        p.affection -= 2;
        return `${J(n(p), '은/는')} 들은 척도 하지 않았다. "내가 왜?"`;
      }
      if (has(p, 'greedy') && !has(p, 'generous')) {
        if (g.player.money >= 2) {
          g.player.money -= 2;
          if (skill) gainSkill(g, skill, 1.0);
          return `${J(n(p), '은/는')} 도와주겠다며 손바닥을 내밀었다. 은화 두 닢을 쥐여 주고서야 요령을 몇 가지 들을 수 있었다.`;
        }
        return `${J(n(p), '은/는')} 공짜는 없다며 웃었다. 주머니가 비어 있었다.`;
      }
      p.affection += 2;
      remember(g, p, '부탁을 들어주었다', 1, { tag: 'helped' });
      if (skill && ageYears(p) >= 16) {
        const k = gainSkill(g, skill, 1.4);
        const sk = { sword: '검', magic: '마법', letters: '글', farming: '농사', cooking: '요리', trade: '장사', herbs: '약초', smithing: '대장일' }[skill] ?? SKILLS.find((s) => s.id === skill)?.name ?? '일';
        return join(`${J(n(p), '은/는')} 소매를 걷어붙이고 ${sk} 요령을 직접 보여 주었다. 몇 년을 걸려 익힌 걸 한나절 만에.`, gains(up(sk, k)));
      }
      if ((has(p, 'generous') || has(p, 'kind')) && p.wealth > 20 && ageYears(p) >= 16) {
        const m = rng.int(2, 4);
        g.player.money += m; p.wealth -= m;
        return `사정을 들은 ${J(n(p), '은/는')} 말없이 은화 ${m}닢을 쥐여 주었다. 갚으라는 말은 하지 않았다.`;
      }
      stress(g, -6);
      return `${J(n(p), '은/는')} 뾰족한 수는 없다면서도 밤늦도록 함께 고민해 주었다.`;
    }],
    ['시답잖은 이야기로 웃는다', (g, rng, p) => {
      p.affection += 3; stress(g, -6);
      return rng.pick([
        `촌장 집 염소가 또 담을 넘은 이야기로 한참 웃었다. 별것 아닌 저녁이었다.`,
        `${J(n(p), '이/가')} 하르펜에서 사기당한 이야기를 하며 스스로 배를 잡았다.`,
        `누가 먼저 졸았는지를 두고 끝까지 우겼다. 둘 다 졸았다.`,
      ]);
    }],
    ['날을 세운다', (g, rng, p) => {
      const d = rng.int(8, 14) + (has(p, 'cruel') ? 5 : 0);
      p.affection -= d; p.rivalry = Math.min(100, p.rivalry + 8);
      remember(g, p, '날 선 말을 들었다', -1, { tag: 'insult', log: `${J(g.player.name, '과/와')} 언성을 높이며 다퉜다.` });
      if (p.affection <= -40) p.bond = 'enemy';
      return p.bond === 'enemy'
        ? `해서는 안 될 말까지 나왔다. ${J(n(p), '은/는')} 대꾸 없이 일어섰다. 다시는 이 집 문을 두드리지 말라고 했다.`
        : `가시 돋친 말이 오갔다. ${J(n(p), '은/는')} 얼굴이 굳은 채 먼저 자리를 떴다. (호감 -${d})`;
    }],
  ]),

  talkEvent('crush', '첫사랑', (p) => `${J(n(p), '이/가')} 고개를 돌려 웃었다. 그 순간 가슴께가 이상하게 저릿했다. 늘 보던 얼굴인데, 오늘은 처음 보는 사람 같았다.`, [
    ['마음속에 담아 둔다', (g, rng, p) => {
      g.player.firstLoveId = p.id;
      p.romance = Math.min(100, p.romance + 5);
      note(g, me(g), `${J(n(p), '을/를')} 마음에 두기 시작했다.`);
      remember(g, p, '함께 있으면 자꾸 눈이 마주쳤다', 1, { tag: 'crush' });
      return `아무에게도 말하지 않았다. 그날부터 ${n(p)}의 목소리는 골목 끝에서도 알아들을 수 있었다.`;
    }],
    ['괜히 퉁명스럽게 군다', (g, rng, p) => {
      g.player.firstLoveId = p.id;
      p.romance = Math.min(100, p.romance + 2); p.affection -= 3; p.rivalry = Math.min(100, p.rivalry + 3);
      note(g, me(g), `${J(n(p), '을/를')} 마음에 두기 시작했다.`);
      return `마음과 다르게 말이 툭 튀어나왔다. ${J(n(p), '은/는')} 영문을 모르겠다는 얼굴이었다. 돌아오는 길 내내 제 머리를 쥐어박았다.`;
    }],
    ['아무 일 없던 걸로 한다', (g, rng, p) => {
      p.romance = Math.max(0, p.romance - 6);
      return '기분 탓이라고 생각하기로 했다. 그렇게 생각하기로 한 것도, 며칠은 잘 되지 않았다.';
    }],
  ]),

  talkEvent('confess', '고백', [
    (p) => `몇 번이나 말을 꺼내려다 삼켰다. ${J(n(p), '이/가')} 왜 그러느냐는 얼굴로 보았다. 지금이 아니면 다시는 말하지 못할 것 같았다.`,
    (p) => `${J(n(p), '이/가')} 일어서려는 순간, 소매를 붙잡았다. 붙잡고 나서야 무슨 말을 할지 생각했다.`,
  ], [
    ['마음을 고백한다', (g, rng, p) => {
      const chance = clamp(0.15 + (p.romance - 40) / 60 + (p.affection - 35) / 150 + g.player.stats.cha / 400 + repOdds(g, p), 0.05, 0.95);
      if (rng.chance(chance)) {
        p.bond = 'lover';
        p.romance = Math.min(100, p.romance + 10);
        remember(g, p, '서로 마음을 확인했다', 1, { tag: 'confess', log: `${J(g.player.name, '과/와')} 연인이 되었다.` });
        note(g, me(g), `${J(n(p), '과/와')} 연인이 되었다.`);
        relState(g).news.push({ text: `${J(fullName(p), '과/와')} ${J(g.player.name, '이/가')} 요즘 함께 다니는 모습이 자주 보인다는 소문이 돈다.`, who: [p.id], weight: 4 });
        stress(g, -15);
        return has(p, 'timid')
          ? `${J(n(p), '은/는')} 귀까지 빨개져 한참을 땅만 보았다. 그러다 아주 작게, 고개를 끄덕였다.`
          : `${J(n(p), '은/는')} 놀란 얼굴로 보다가 웃음을 터뜨렸다. "왜 이제야 말해." 그 손이 먼저 내 손을 잡았다.`;
      }
      p.romance = Math.max(0, p.romance - 15); p.affection -= 5; stress(g, 15);
      remember(g, p, '고백을 받고 거절했다', 0, { tag: 'confess', recall: '그날 네 고백을 거절했던 일' });
      return `${J(n(p), '은/는')} 오래 말이 없었다. "미안해. 너를 그렇게 생각해 본 적은 없어." 돌아오는 길이 유난히 길었다.`;
    }],
    ['아직은 말하지 않는다', (g, rng, p) => {
      p.romance = Math.min(100, p.romance + 2);
      return '목까지 차오른 말을 삼켰다. 대신 내일도 보자고만 했다. 그것만으로도 심장이 시끄러웠다.';
    }],
  ]),

  talkEvent('propose', '청혼', (p) => `${J(n(p), '과/와')} 함께한 지 꽤 되었다. 성광 예배당 앞을 지날 때마다 둘 다 같은 생각을 하는 걸 알았다.`, [
    ['청혼한다', (g, rng, p) => {
      let chance = 0.4 + (p.romance - 60) / 50 + (p.affection - 50) / 100 + repOdds(g, p) * 1.5;
      const poor = g.player.money + g.player.familyMoney < 40;
      if (poor && (has(p, 'greedy') || has(p, 'ambitious'))) chance -= 0.25;
      if (rng.chance(clamp(chance, 0.05, 0.95))) return marry(g, p);
      p.romance = Math.max(0, p.romance - 12); stress(g, 20);
      if (p.romance < 30) {
        p.bond = 'ex';
        remember(g, p, '청혼을 거절하고 헤어졌다', -1, { tag: 'propose', log: `${J(g.player.name, '과/와')} 헤어졌다.` });
        return poor
          ? `${J(n(p), '은/는')} 고개를 저었다. "사랑만으로 먹고살 수는 없어." 그날로 둘 사이는 끝났다.`
          : `${J(n(p), '은/는')} 울면서 고개를 저었다. 이유는 끝내 말하지 않았다. 그날로 둘 사이는 끝났다.`;
      }
      remember(g, p, '청혼을 미뤘다', 0, { tag: 'propose' });
      return `${J(n(p), '은/는')} 손을 꼭 쥐었지만 대답은 하지 않았다. "조금만 더 시간을 줘."`;
    }],
    ['조금 더 기다린다', (g, rng, p) => {
      p.romance = Math.min(100, p.romance + 2);
      return '반지 살 돈을 더 모으기로 했다. 아니, 그건 핑계였다. 아직 용기가 모자랐다.';
    }],
  ]),

  talkEvent('rival', '맞수', (p) => `${J(n(p), '이/가')} 턱을 치켜들었다. "요즘 좀 한다며?"`, [
    ['정정당당히 겨루자고 한다', (g, rng, p) => {
      const pl = g.player;
      const mine = Math.max(pl.skills.sword, (pl.stats.str + pl.stats.agi) / 2) + rng.int(-12, 12);
      const theirs = Math.min(70, ageYears(p) * 1.8 + (JOBS[p.job]?.skill === 'sword' ? p.skill / 2 : 0)) + p.rivalry / 10 + rng.int(-12, 12);
      const what = pl.skills.sword >= 15 ? '목검을 들고 마주 섰다' : '맨손으로 맞붙었다';
      if (mine >= theirs) {
        const w = gainStat(g, 'wil', 0.6);
        p.rivalry = Math.max(0, p.rivalry - 4); p.affection += 4;
        remember(g, p, '겨루기에서 졌다', -1, { tag: 'duel', recall: '겨루기에서 내가 졌던 일' });
        return join(`광장 뒤 공터에서 ${what}. 마지막에 서 있는 건 나였다. ${J(n(p), '은/는')} 흙을 털고 일어나 처음으로 진심으로 고개를 숙였다.`, gains(up('의지', w)));
      }
      const w = gainStat(g, 'wil', 0.9);
      p.rivalry = Math.min(100, p.rivalry + 5); stress(g, 6);
      remember(g, p, '겨루기에서 이겼다', 1, { tag: 'duel' });
      return join(`광장 뒤 공터에서 ${what}. 졌다. ${J(n(p), '이/가')} 손을 내밀었지만 잡지 않았다. 다음엔 지지 않는다.`, gains(up('의지', w)));
    }],
    ['화해를 청한다', (g, rng, p) => {
      if (has(p, 'ambitious') && rng.chance(0.5)) {
        p.rivalry = Math.min(100, p.rivalry + 3);
        return `${J(n(p), '은/는')} 내민 손을 내려다보고 웃었다. "겁먹었냐?"`;
      }
      p.rivalry = Math.max(0, p.rivalry - 15); p.affection += 6;
      remember(g, p, '먼저 손을 내밀어 화해했다', 1, { tag: 'duel' });
      return `먼저 손을 내밀었다. ${J(n(p), '은/는')} 한참 망설이다 손을 잡았다. 경쟁이 끝난 건 아니다. 다만 이제는 서로를 인정한다.`;
    }],
    ['비웃어 준다', (g, rng, p) => {
      p.rivalry = Math.min(100, p.rivalry + 12); p.affection -= 10;
      remember(g, p, '모두 앞에서 비웃음을 당했다', -1, { tag: 'mock' });
      if (p.affection <= -40) p.bond = 'enemy';
      return p.bond === 'enemy'
        ? `사람들 앞에서 ${J(n(p), '을/를')} 비웃었다. 웃음소리 사이로 ${n(p)}의 눈빛이 바뀌는 게 보였다. 이건 더 이상 경쟁이 아니다.`
        : `코웃음을 쳐 주었다. ${n(p)}의 얼굴이 붉어졌다. 이 일은 두고두고 갚으려 들 것이다.`;
    }],
  ]),

  talkEvent('spouse', '같은 지붕 아래', [
    (p, g) => (me(g).childIds.length ? `아이들이 잠든 뒤, ${J(n(p), '이/가')} 등잔불 아래에서 하던 일을 멈추고 나를 보았다.` : `식구들이 잠든 뒤, ${J(n(p), '이/가')} 등잔불 아래에서 하던 일을 멈추고 나를 보았다.`),
    (p) => `${J(n(p), '은/는')} 오늘따라 말수가 적었다. 저녁 그릇을 치우다 말고 무언가 말하려는 얼굴이었다.`,
    (p) => `잠자리에 누웠는데 ${J(n(p), '이/가')} 등을 돌린 채 물었다. "자?"`,
  ], [
    ['아이 이야기를 꺼낸다', (g, rng, p) => {
      p.affection += 4;
      const meP = me(g);
      const wife = meP.sex === 'f' ? meP : p;
      if (p.sex === meP.sex || bodyAgeOf(wife) > 42) {
        return '둘 사이에 아이가 생기기는 어렵다는 걸 둘 다 알았다. 대신 오래 손을 맞잡고 있었다.';
      }
      relState(g).tryChild = 4;
      const kids = me(g).childIds.length;
      return kids
        ? rng.pick([`"하나 더?" ${J(n(p), '은/는')} 웃다가, 대답 대신 등잔불을 불어 껐다.`, `${J(n(p), '은/는')} 잠든 아이들 쪽을 한 번 보고는 조용히 내 손을 잡았다.`])
        : rng.pick([`${J(n(p), '은/는')} 대답 대신 등잔불을 불어 껐다.`, `${J(n(p), '은/는')} 한참 말이 없다가, 이름은 무엇으로 할지부터 물었다.`]);
    }],
    ['고단함을 털어놓는다', (g, rng, p) => {
      p.affection += 3; stress(g, -15);
      return `요즘 힘든 일을 하나도 빼지 않고 다 말했다. ${J(n(p), '은/는')} 다 듣고 나서 "그래도 우리 집이잖아." 하고만 말했다. 그거면 됐다.`;
    }],
    ['언성을 높인다', (g, rng, p) => {
      p.affection -= 10; stress(g, -4);
      remember(g, p, '크게 다퉜다', -1, { tag: 'fight' });
      return `쌓인 게 터졌다. 돈 이야기, 집안 이야기, 오래된 서운함까지. ${J(n(p), '은/는')} 그날 밤 등을 돌리고 누웠다.`;
    }],
  ]),

  talkEvent('enemy', '원한', (p) => `${J(n(p), '이/가')} 팔짱을 낀 채 문간을 막고 섰다. "무슨 낯으로 왔어?"`, [
    ['먼저 사과한다', (g, rng, p) => {
      if (has(p, 'cruel') && rng.chance(0.6)) {
        p.affection += 2;
        return `고개를 숙였다. ${J(n(p), '은/는')} 그 모습을 한참 내려다보며 즐기다가 문을 닫았다.`;
      }
      p.affection += 12;
      if (p.affection > -25 && p.bond === 'enemy') p.bond = null;
      remember(g, p, '먼저 고개를 숙이고 사과했다', 1, { tag: 'apology' });
      return p.bond === 'enemy'
        ? `${J(n(p), '은/는')} 사과를 받지 않았다. 그래도 문을 닫기 전에 잠깐 망설였다.`
        : `${J(n(p), '은/는')} 한숨을 쉬었다. "…됐어. 나도 지나쳤지." 쌓인 게 다 풀리진 않았지만, 칼끝은 내려갔다.`;
    }],
    ['경고한다', (g, rng, p) => {
      const meStr = g.player.stats.str + g.player.stats.wil + g.player.skills.sword;
      p.affection -= 5;
      if (has(p, 'timid') || meStr > 90 + ageYears(p)) {
        p.rivalry = Math.max(0, p.rivalry - 10);
        return `한 걸음 다가서 낮게 말했다. 한 번만 더 그러면 그냥 넘어가지 않겠다고. ${n(p)}의 눈이 흔들렸다.`;
      }
      remember(g, p, '협박을 들었다', -1, { tag: 'threat' });
      return `경고했지만 ${J(n(p), '은/는')} 코웃음만 쳤다. "해 봐."`;
    }],
    ['돌아선다', (g) => '말을 섞을 가치도 없었다. 등 뒤로 침 뱉는 소리가 들렸다.'],
  ]),
);

// ---------- 혼인과 아이 ----------
export function marry(g, p) {
  const meP = me(g);
  const R = relState(g);
  meP.spouseId = p.id; p.spouseId = meP.id;
  p.bond = 'spouse';
  // 신부가 신랑의 성을 따른다. 내가 아내일 때 남편은 성을 지키고, 아이는 내 집안 성을 잇는다.
  if (p.sex === 'f' && meP.sex === 'm') p.lastName = g.player.lastName;
  if (!g.player.familyIds.includes(p.id)) g.player.familyIds.push(p.id);
  let cost = '';
  if (g.player.money >= 10) { g.player.money -= 10; cost = '모아 둔 은화를 털어 마을 사람들에게 술과 빵을 돌렸다.'; }
  else if (g.player.familyMoney >= 10) { g.player.familyMoney -= 10; cost = '집안 돈으로 조촐한 잔치를 열었다.'; }
  else cost = '잔치를 열 돈은 없었다. 사제 앞에서 맹세만 하고, 둘이서 빵 한 덩이를 나눠 먹었다.';
  note(g, p, `${J(g.player.name, '과/와')} 혼인했다.`);
  note(g, meP, `${J(fullName(p), '과/와')} 혼인했다.`);
  remember(g, p, '예배당에서 혼인 서약을 했다', 1, { tag: 'wedding' });
  R.news.push({ text: `${J(g.player.name, '과/와')} ${J(fullName(p), '이/가')} 성광교 예배당에서 혼인했다.`, who: [p.id], weight: 10 });
  stress(g, -20);
  return `${J(n(p), '은/는')} 대답 대신 울음을 터뜨렸고, 그게 대답이었다. 다음 달, 예배당 종이 울렸다. ${cost}`;
}

function playerBirth(g, rng) {
  const meP = me(g);
  const sp = byId(g, meP.spouseId);
  const R = relState(g);
  if (!sp || !sp.alive || sp.away || sp.sex === meP.sex) return;
  const wife = meP.sex === 'f' ? meP : sp;
  const husband = wife === meP ? sp : meP;
  const wAge = ageYears(wife);
  if (wAge < 17 || bodyAgeOf(wife) > 42) return;
  const kids = wife.childIds.length;
  const last = kids ? byId(g, wife.childIds[kids - 1]) : null;
  if (last && last.ageMonths < 18) return;
  // 내가 남편이면 NPC 쪽 출산 규칙이 이미 돈다. 아이 이야기를 나눈 뒤에만 덧붙인다.
  let chance = meP.sex === 'f' ? (kids >= 4 ? 0.004 : 0.018) : 0;
  if (R.tryChild > 0) chance += 0.035;
  if (!rng.chance(chance * HOOK.fertility(husband, wife))) return;
  const baby = makePerson(rng, { lastName: g.player.lastName, fatherId: husband.id, motherId: wife.id });
  g.people.push(baby);
  wife.childIds.push(baby.id); husband.childIds.push(baby.id);
  note(g, baby, '태어났다.');
  note(g, sp, `${baby.sex === 'm' ? '아들' : '딸'} ${J(baby.name, '이/가')} 태어났다.`);
  if (meP.sex === 'f') note(g, meP, `${baby.sex === 'm' ? '아들' : '딸'} ${J(baby.name, '을/를')} 낳았다.`);
  else note(g, meP, `${baby.sex === 'm' ? '아들' : '딸'} ${J(baby.name, '이/가')} 태어났다.`);
}

// 내 아이가 새로 태어났으면 식구로 받는다 (NPC 규칙으로 태어난 아이 포함)
function registerChildren(g, sim) {
  const meP = me(g);
  for (const x of g.people) {
    if (x.ageMonths !== 0 || !x.alive || x.isPlayer) continue;
    if (x.fatherId !== meP.id && x.motherId !== meP.id) continue;
    if (g.player.familyIds.includes(x.id)) continue;
    g.player.familyIds.push(x.id);
    x.known = true; x.affection = 40; x.lastName = g.player.lastName;
    rel(x);
    stress(g, -10);
    relState(g).tryChild = 0;
    sim.push({ text: `${g.player.name}의 집에 ${x.sex === 'm' ? '아들' : '딸'}이 태어났다. 이름은 ${x.name}.`, who: [x.id], weight: 10 });
  }
}

// ---------- 한 달마다: 기억과 관계가 스스로 움직인다 ----------
function monthly(g, rng, sim) {
  const R = relState(g);
  const meP = me(g);
  const now = mi(g);
  for (const p of g.people) rel(p);

  playerBirth(g, rng);
  registerChildren(g, sim);
  if (R.tryChild > 0) R.tryChild -= 1;

  for (const p of g.people) {
    if (p.isPlayer || !p.known) continue;

    // 가까운 사람을 잃음
    if (!p.alive && !p._mourned) {
      p._mourned = true;
      const close = p.id === meP.spouseId || p.bond === 'spouse' || p.bond === 'lover' || g.player.firstLoveId === p.id
        || p.affection >= 50 || g.player.familyIds.includes(p.id);
      if (close) {
        stress(g, p.bond === 'spouse' || g.player.familyIds.includes(p.id) ? 30 : 18);
        note(g, meP, `${J(fullName(p), '을/를')} 잃었다.`);
      }
      continue;
    }
    if (!p.alive) continue;

    // 연인이 다른 사람과 혼인했다
    if (p.bond === 'lover' && p.spouseId && p.spouseId !== meP.id) {
      const other = byId(g, p.spouseId);
      p.bond = 'ex';
      R.heartbreak = { id: p.id, other: other?.id ?? null, at: now };
      remember(g, p, '다른 사람과 혼인했다', 0, { tag: 'married_other' });
      stress(g, 20);
      note(g, meP, `연인이었던 ${J(p.name, '이/가')} 다른 사람과 혼인했다.`);
      continue;
    }

    // 오래 못 본 연인은 마음이 식는다
    if (p.bond === 'lover' && p.lastSeen != null && now - p.lastSeen > 5) p.romance = Math.max(0, p.romance - 3);
    if (p.bond === 'lover' && (p.romance < 25 || p.affection < 15)) {
      p.bond = 'ex';
      remember(g, p, '헤어지자고 했다', -1, { tag: 'breakup', log: `${J(g.player.name, '과/와')} 헤어졌다.` });
      note(g, meP, `${J(p.name, '과/와')} 헤어졌다.`);
      stress(g, 15);
      sim.push({ text: `${J(fullName(p), '이/가')} ${J(g.player.name, '과/와')} 갈라섰다는 이야기가 들린다.`, who: [p.id], weight: 4 });
    }

    // 해가 바뀔 때, 한 해 넘게 못 본 친구와는 조금 멀어진다
    if (g.date.month === 1 && !g.player.familyIds.includes(p.id) && p.affection > 20 && p.lastSeen != null && now - p.lastSeen > 12) {
      p.affection -= 3;
    }

    // 원수는 가만있지 않는다
    if (p.bond === 'enemy' && !p.away && rng.chance(0.04)) {
      for (const q of living(g)) if (has(q, 'gossip') && q.known && q !== p) q.affection -= 2;
      sim.push({ text: `${J(fullName(p), '이/가')} ${g.player.name}에 대해 험담을 늘어놓고 다닌다. 듣는 귀가 적지 않다.`, who: [p.id], weight: 5 });
    }

    // 나를 좋게 기억하는 사람은 가끔 먼저 찾아온다
    const good = p.memories.filter((m) => m.tone > 0).length;
    if (good >= 3 && p.affection >= 60 && !g.player.familyIds.includes(p.id) && rng.chance(0.015)) {
      const gift = rng.pick(['말린 사과 한 자루', '직접 짠 털장갑', '훈제 고기 한 덩이', '꿀 한 단지', '손수 깎은 나무 빗']);
      remember(g, p, `${J(gift, '을/를')} 가져다주었다`, 1, { tag: 'gift' });
      sim.push({ text: `${J(fullName(p), '이/가')} ${g.player.name}의 집에 들러 ${J(gift, '을/를')} 두고 갔다. 지난번 일이 고마웠다고 한다.`, who: [p.id], weight: 6 });
    }
  }

  npcTies(g, rng, sim);
  for (const e of R.news) sim.push(e);
  R.news = [];
}

// ---------- NPC끼리의 관계 (소식으로) ----------
const FEUD_WHY = ['밭 경계 말뚝 문제로', '갚지 않은 빚 때문에', '물길을 두고', '여관 술자리에서 시비가 붙어', '개가 닭을 물어 죽인 일로', '오래 묵은 앙금이 터져'];
const FRIEND_TAIL = ['여관 구석에서 둘이 늦게까지 잔을 기울이는 모습이 자주 보인다.', '함께 하르펜 장에 다녀왔다고 한다.', '서로 일손이 모자랄 때마다 거들어 준다고 한다.'];
const RUMOR_WHAT = ['몰래 빚을 지고 있다', '밤마다 숲에 들어간다', '하르펜에 숨겨 둔 자식이 있다', '영주의 세리를 속였다', '젊었을 때 도둑질을 했다'];

function npcTies(g, rng, sim) {
  const R = relState(g);
  const now = mi(g);
  const meP = me(g);
  // 오래 오간 눈길은 혼인으로 이어지기도 한다
  for (const t of R.ties) {
    if (t.kind !== 'flirt' || t.done) continue;
    const a = byId(g, t.a), b = byId(g, t.b);
    if (!a || !b || !a.alive || !b.alive || a.away || b.away || a.spouseId || b.spouseId) { t.done = true; continue; }
    if (a.bond === 'lover' || b.bond === 'lover') continue;
    if (ageYears(a) >= 18 && ageYears(b) >= 18 && rng.chance(0.015)) {
      t.done = true;
      const [h, w] = a.sex === 'm' ? [a, b] : [b, a];
      h.spouseId = w.id; w.spouseId = h.id; w.lastName = h.lastName;
      note(g, h, `${J(w.name, '과/와')} 혼인했다.`);
      note(g, w, `${J(h.name, '과/와')} 혼인했다.`);
      sim.push({ text: `소문이 사실이었다. ${J(fullName(h), '과/와')} ${J(w.name, '이/가')} 예배당에서 혼인했다.`, who: [h.id, w.id], weight: 3 });
    }
  }
  R.ties = R.ties.filter((t) => !t.done || now - t.at < 24).slice(-30);

  if (!rng.chance(0.12)) return;
  const adults = living(g).filter((p) => !p.isPlayer && ageYears(p) >= 16 && p.id !== meP.spouseId);
  if (adults.length < 2) return;
  const a = rng.pick(adults);
  const related = (x, y) => x.spouseId === y.id || (x.fatherId && x.fatherId === y.fatherId) || x.fatherId === y.id || y.fatherId === x.id || x.motherId === y.id || y.motherId === x.id;
  const others = adults.filter((b) => b !== a && !related(a, b));
  if (!others.length) return;
  const b = rng.pick(others);
  const A = fullName(a), B = fullName(b);
  const old = R.ties.find((t) => (t.a === a.id && t.b === b.id) || (t.a === b.id && t.b === a.id));
  let kind;
  if (has(a, 'cruel') || has(b, 'cruel') || (has(a, 'greedy') && has(b, 'greedy')) || old?.kind === 'feud') kind = 'feud';
  else if (has(a, 'gossip')) kind = 'rumor';
  else if (!a.spouseId && !b.spouseId && a.sex !== b.sex && Math.abs(ageYears(a) - ageYears(b)) <= 8 && ageYears(a) <= 40 && ageYears(b) <= 40) kind = 'flirt';
  else kind = 'friend';

  let text;
  if (kind === 'feud') {
    text = old
      ? `${J(A, '과/와')} ${J(B, '이/가')} 또 붙었다. 이번엔 경비대가 말려야 했다.`
      : `${J(A, '과/와')} ${J(B, '이/가')} ${rng.pick(FEUD_WHY)} 크게 다퉜다는 말이 돈다.`;
  } else if (kind === 'rumor') {
    text = `${J(A, '이/가')} ${J(B, '이/가')} ${rng.pick(RUMOR_WHAT)}고 떠들고 다닌다. 믿는 사람 반, 안 믿는 사람 반이다.`;
    b.affection -= 0; // 소문은 내 일이 아니다
  } else if (kind === 'flirt') {
    text = rng.pick([
      `우물가에서 ${J(A, '과/와')} ${J(B, '이/가')} 한참 이야기하는 걸 본 사람이 있다.`,
      `${J(A, '이/가')} 요즘 ${b.name}네 집 앞을 자주 서성인다는 소문이 돈다.`,
    ]);
  } else {
    text = `${J(A, '과/와')} ${J(B, '이/가')} 요즘 부쩍 가까워졌다. ${rng.pick(FRIEND_TAIL)}`;
  }
  if (!old) R.ties.push({ a: a.id, b: b.id, kind, at: now });
  else old.at = now;
  sim.push({ text, who: [a.id, b.id], weight: kind === 'feud' ? 2 : 1.5 });
}

// ---------- 먼저 찾아오는 사람, 떠나간 연인 ----------
const missingFriend = (g) => {
  const now = mi(g);
  return living(g)
    .filter((p) => p.known && !p.isPlayer && !g.player.familyIds.includes(p.id) && p.affection >= 55 && p.lastSeen != null && now - p.lastSeen >= 5)
    .sort((a, b) => b.affection - a.affection)[0] ?? null;
};
EVENTS.push(
  {
    id: 'rel_old_friend',
    cond: (g) => playerAge(g) >= 6 && !!missingFriend(g),
    chance: () => 0.06,
    weight: 45,
    title: '문 두드리는 소리',
    text: (g) => {
      const p = missingFriend(g);
      return `저녁 무렵 누가 문을 두드렸다. ${J(p.name, '이었/였')}다. "요즘 통 얼굴을 못 봐서." 손에는 뭔가 먹을 것이 들려 있었다.`;
    },
    choices: [
      { label: '반갑게 맞아들인다', run: (g) => {
        const p = missingFriend(g);
        if (!p) return '문밖엔 아무도 없었다.';
        p.affection = Math.min(100, p.affection + 6); p.lastSeen = mi(g); stress(g, -8);
        remember(g, p, '오랜만에 찾아가 밤늦도록 이야기했다', 1, { tag: 'visit' });
        return `밤이 깊도록 그간 쌓인 이야기를 했다. 돌아가는 ${J(p.name, '은/는')} 다음엔 네가 오라고 했다.`;
      } },
      { label: '바쁘다며 돌려보낸다', run: (g) => {
        const p = missingFriend(g);
        if (!p) return '문밖엔 아무도 없었다.';
        p.affection -= 6;
        remember(g, p, '찾아갔다가 문 앞에서 돌아섰다', -1, { tag: 'turned_away' });
        return `${J(p.name, '은/는')} 괜찮다며 웃었지만, 돌아서는 어깨가 조금 처져 있었다.`;
      } },
    ],
  },
  {
    id: 'rel_heartbreak',
    cond: (g) => { const h = g.relations?.heartbreak; return !!h && h.at === mi(g) - 1 && !!byId(g, h.id); },
    weight: 92,
    title: '혼인 소식',
    text: (g) => {
      const h = g.relations.heartbreak;
      const p = byId(g, h.id), o = byId(g, h.other);
      return `${J(p.name, '이/가')} ${o ? J(o.name, '과/와') : '다른 사람과'} 혼인한다는 말을 들었다. 예배당 종소리가 오늘따라 크게 들렸다. 약속 같은 건 한 적이 없었다. 그래서 더 할 말이 없었다.`;
    },
    choices: [
      { label: '찾아가 축하한다', run: (g) => {
        const p = byId(g, g.relations.heartbreak.id);
        relState(g).heartbreak = null;
        const w = gainStat(g, 'wil', 0.8);
        if (p) { p.affection += 5; remember(g, p, '혼인을 축하해 주었다', 1, { tag: 'blessing' }); }
        return join(`웃으며 축하한다고 말했다. ${p ? J(p.name, '은/는') : '그 사람은'} 고맙다고 하면서도 끝내 눈을 마주치지 못했다.`, gains(up('의지', w)));
      } },
      { label: '아무에게도 말하지 않는다', run: (g) => {
        relState(g).heartbreak = null;
        stress(g, 10);
        return '그날 밤, 아무도 없는 개울가에서 오래 앉아 있었다. 물소리만 들렸다.';
      } },
    ],
  },
);

// ---------- 훅 등록 ----------
function init(g) {
  relState(g);
  g.player.firstLoveId ??= null;
  for (const p of g.people) {
    rel(p);
    if (!p.alive) p._mourned = true;
  }
}
HOOKS.newGame.push((g) => init(g));
HOOKS.migrate.push((g) => init(g));
HOOKS.afterNpc.push((g, rng, sim) => monthly(g, rng, sim));
// 결과 글을 장면(scene)과 수치(gains)로 나눠 둔다. 화면은 scene을 크게, gains를 작게 보여 줄 수 있다.
HOOKS.afterActions.push((g, rng, results) => {
  for (const r of results) Object.assign(r, splitResult(r.text));
});
