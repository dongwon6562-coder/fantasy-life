// 11단계: 사랑과 혼인 깊이.
// relations가 맡은 것(호감·연정·첫사랑·고백·청혼·혼인)은 그대로 두고, 그 앞뒤를 채운다.
// 연애: 눈길 → 만남(만나러 가기) → 고백(relations) → 약혼(정략혼) → 혼인. 짝사랑과 거절, 나를 마음에 둔 사람.
// 혼인 뒤: 배우자에게도 자기 일과 바람이 있고, 기분(mood)이 있다. 다툼과 화해, 바람(양쪽 모두), 이혼, 재혼.
// 사별 뒤: 무덤을 찾고, 시간이 지나면 다시 마음을 열거나 평생 혼자 살기로 한다.
// court의 혼인 동맹으로 맺은 배우자는 정략혼으로 본다: 처음엔 정이 얕고, 함께 지내며 사랑이 자랄 수도 있다.
// 상태는 game.love 하나. 화면 연결점: loveInfo(g), WISHES
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { makePerson, byId, fullName, has, ageYears, living } from '../npc.js';
import { LAST_NAMES } from '../data.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { marry, remember, rel, relState, chemistry, queueTalk } from '../relations.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 배우자의 바람: 들어주면 기분이 크게 오르고, 오래 못 들어주면 서운함이 쌓인다
export const WISHES = {
  shop: { text: '제 가게를 내고 싶다', cost: 40, job: 'shopkeeper', done: '광장 모퉁이에 작은 가게를 얻었다. 간판은 배우자가 직접 칠했다.' },
  study: { text: '글을 제대로 배우고 싶다', cost: 10, job: null, done: '예배당 서당 맨 뒷자리에 어른 하나가 앉게 되었다. 저녁마다 집에서 글 읽는 소리가 났다.' },
  child: { text: '아이를 하나 더 갖고 싶다', cost: 0, job: null, done: '그날 밤 오래 이야기를 나누었다. 둘 다 같은 것을 바라고 있었다.' },
  travel: { text: '왕도를 한 번 구경하고 싶다', cost: 15, job: null, done: '둘이서 왕도에 다녀왔다. 성문 앞에서 배우자는 아이처럼 입을 벌리고 서 있었다.' },
  faith: { text: '성지에 순례를 다녀오고 싶다', cost: 10, job: null, done: '배우자가 순례를 다녀왔다. 돌아온 얼굴이 한결 맑았다.' },
  garden: { text: '집 뒤에 작은 밭을 일구고 싶다', cost: 5, job: null, done: '집 뒤 빈터를 갈아엎었다. 봄이 되자 콩 싹이 올라왔다.' },
  craft: { text: '배우던 일을 다시 하고 싶다', cost: 8, job: null, done: '배우자는 다시 일을 나가기 시작했다. 저녁에 돌아오면 손에 굳은살이 박여 있었다.' },
};

/* ---------- 상태 ---------- */
export function loveState(g) {
  g.love ??= {};
  const v = g.love;
  v.spouse ??= null;    // { id, wish, wishAt, wishDone, mood, arranged, since, timeAt, quarrels, cheated }
  v.affair ??= null;    // { id, at, risk } 내가 몰래 만나는 사람
  v.engaged ??= null;   // { id, at, wedAt, arranged }
  v.widowed ??= null;   // { id, name, at, vow }
  v.exes ??= [];        // [{ id, name, how, at }]
  v.marriages ??= 0;
  v.sceneAt ??= 0;
  v.pursue ??= {};      // 짝사랑: 사람 id → 헛걸음 수
  return v;
}
const V = loveState;
const spouseP = (g) => { const id = me(g).spouseId; const p = id != null ? byId(g, id) : null; return p && p.alive ? p : null; };
function kinOf(g, p) {
  const meP = me(g);
  if (g.player.familyIds.includes(p.id) && p.id !== meP.spouseId) return true;
  if (p.fatherId != null && (p.fatherId === meP.fatherId || p.fatherId === meP.id)) return true;
  if (p.motherId != null && (p.motherId === meP.motherId || p.motherId === meP.id)) return true;
  return meP.fatherId === p.id || meP.motherId === p.id;
}
// 사랑할 수 있는 사람 (혼인 여부는 따로 본다)
function eligible(g, p, { ignoreMine = false } = {}) {
  if (!p || !p.alive || p.away || p.isPlayer) return false;
  const a = playerAge(g), b = ageYears(p);
  if (a < 15 || b < 15) return false;
  if (kinOf(g, p)) return false;
  if (p.spouseId && p.spouseId !== me(g).id) return false;
  if (!ignoreMine && me(g).spouseId && me(g).spouseId !== p.id) return false;
  if (p.bond === 'enemy') return false;
  return Math.abs(a - b) <= (Math.min(a, b) < 18 ? 3 : 12);
}
const ready = (g) => isAdult(g) && !traveling(g) && !isJailed(g) && !g.over;
const lover = (g) => g.people.find((p) => p.alive && !p.isPlayer && p.bond === 'lover' && p.id !== me(g).spouseId && (!V(g).affair || V(g).affair.id !== p.id)) ?? null;
const word = (p) => (p.sex === 'm' ? '그' : '그녀');
function moodWord(m) {
  if (m >= 80) return '깊이 사랑한다';
  if (m >= 60) return '다정하다';
  if (m >= 40) return '무덤덤하다';
  if (m >= 20) return '서운함이 쌓였다';
  return '마음이 떠났다';
}
function addMood(g, n) { const s = V(g).spouse; if (s) s.mood = clamp(s.mood + n, 0, 100); return n; }

/* ---------- 상태 읽기 (화면용) ---------- */
export function loveInfo(g) {
  const v = V(g);
  const sp = spouseP(g);
  const s = v.spouse;
  const lv = lover(g);
  const af = v.affair ? byId(g, v.affair.id) : null;
  const en = v.engaged ? byId(g, v.engaged.id) : null;
  const admirers = g.people.filter((p) => eligible(g, p) && p.known && p.bond !== 'lover' && (p.romance ?? 0) >= 40 && p.id !== me(g).spouseId).slice(0, 4);
  return {
    spouse: sp && s ? {
      id: sp.id, name: sp.name, age: ageYears(sp), job: sp.job ?? null, mood: Math.round(s.mood), moodWord: moodWord(s.mood),
      wish: s.wishDone ? null : s.wish, wishText: s.wishDone ? null : WISHES[s.wish]?.text ?? null, arranged: !!s.arranged,
      romance: Math.round(sp.romance ?? 0), years: Math.floor((mi(g) - s.since) / 12), cheated: !!s.cheated,
    } : null,
    engaged: en && en.alive ? { id: en.id, name: en.name, age: ageYears(en), wedIn: Math.max(0, v.engaged.wedAt - mi(g)), arranged: !!v.engaged.arranged } : null,
    lover: lv ? { id: lv.id, name: lv.name, age: ageYears(lv), romance: Math.round(lv.romance ?? 0) } : null,
    affair: af && af.alive ? { id: af.id, name: af.name, risk: Math.round(v.affair.risk) } : null,
    admirers: admirers.map((p) => ({ id: p.id, name: p.name, age: ageYears(p) })),
    widowed: v.widowed ? { name: v.widowed.name, years: Math.floor((mi(g) - v.widowed.at) / 12), vow: !!v.widowed.vow } : null,
    exes: v.exes.slice(-5).map((x) => ({ id: x.id, name: x.name, how: x.how, howName: { divorce: '이혼', breakup: '헤어짐', fled: '파혼' }[x.how] ?? x.how })),
    marriages: v.marriages,
  };
}

/* ---------- 행동: 만나러 가기 (연애의 '만남') ---------- */
function dateTarget(g) {
  const v = V(g);
  if (v.affair) { const p = byId(g, v.affair.id); if (p && p.alive) return p; }
  const sp = spouseP(g);
  if (sp) return null;
  const lv = lover(g);
  if (lv && eligible(g, lv)) return lv;
  const en = v.engaged ? byId(g, v.engaged.id) : null;
  if (en && en.alive) return en;
  const first = g.player.firstLoveId != null ? byId(g, g.player.firstLoveId) : null;
  if (first && eligible(g, first) && first.known) return first;
  return g.people.filter((p) => eligible(g, p) && p.known && p.affection >= 20).sort((a, b) => (b.romance + b.affection / 2) - (a.romance + a.affection / 2))[0] ?? null;
}
const DATE_LINES = [
  (p) => `${J(p.name, '과/와')} 장터를 걸었다. 산 것은 없었다. 오래 걸었다.`,
  (p) => `강가 둑에 앉아 해가 지는 것을 보았다. ${J(p.name, '이/가')} 무슨 말을 했는데, 내용은 기억나지 않고 목소리만 남았다.`,
  (p) => `축제 날 밤, 사람들 틈에서 ${p.name}의 손이 내 손을 스쳤다. 둘 다 모르는 척했다.`,
  (p) => `${J(p.name, '이/가')} 싸 온 빵을 나눠 먹었다. 조금 탔다. 맛있다고 했다. 거짓말은 아니었다.`,
  (p) => `비가 와서 처마 밑에 나란히 서 있었다. 비가 그쳤는데도 한참 그대로 있었다.`,
];
ACTIONS.push({
  id: 'love_date', name: '마음에 둔 사람 만나기', icon: 'heart',
  desc: '마음에 둔 사람, 연인, 약혼자를 만나러 간다. 연정이 깊어진다. 상대의 마음이 다른 데 있으면 헛걸음일 수도 있다.',
  available: (g) => ready(g) && playerAge(g) >= 15 && !!dateTarget(g),
  run(g, rng) {
    const p = dateTarget(g);
    if (!p) return '만날 사람이 없었다.';
    const v = V(g);
    rel(p);
    tired(g, 5);
    spend(g, 1);
    p.lastSeen = mi(g);
    const ch = chemistry(g, p);
    // 몰래 만나는 사이
    if (v.affair?.id === p.id) {
      p.romance = Math.min(100, p.romance + rng.int(3, 7));
      v.affair.risk = clamp(v.affair.risk + rng.float(6, 12) - g.player.stats.int / 30, 0, 100);
      stress(g, 4);
      return `${rng.pick(['해가 진 뒤 방앗간 뒤편에서', '장터 끝 낡은 여관 이층에서', '숲가 사냥막에서'])} ${J(p.name, '을/를')} 만났다. 돌아오는 길에 누가 볼까 몇 번이고 뒤를 돌아보았다.`;
    }
    // 짝사랑: 상대의 마음이 다른 데 있다
    if (ch < 0.3 && p.bond !== 'lover' && v.engaged?.id !== p.id) {
      v.pursue[p.id] = (v.pursue[p.id] ?? 0) + 1;
      p.affection = Math.min(100, p.affection + 1);
      stress(g, 3);
      if (v.pursue[p.id] >= 3 && !sceneQueued(g, 'love_unrequited')) queueScene(g, 'love_unrequited', { id: p.id });
      return `${J(p.name, '을/를')} 만나러 갔다. ${rng.pick([`${J(p.name, '은/는')} 반갑게 웃었다. 친구에게 짓는 웃음이었다.`, `${J(p.name, '은/는')} 내내 다른 사람 이야기를 했다.`, `${J(p.name, '은/는')} 바쁘다며 일찍 일어섰다.`])}`;
    }
    const rom = Math.round((2 + ch * 6 + g.player.stats.cha / 30) * rng.float(0.7, 1.3));
    p.romance = Math.min(100, p.romance + rom);
    p.affection = Math.min(100, p.affection + 2);
    stress(g, -5);
    if (p.bond !== 'lover' && v.engaged?.id !== p.id) remember(g, p, '둘이서 만났다', 1, { tag: 'date' });
    // 마음이 무르익으면 고백이나 청혼으로 이어진다 (relations의 대화)
    if (v.engaged?.id !== p.id) queueTalk(g, p, rng);
    return `${rng.pick(DATE_LINES)(p)}${gains([up('연정', rom)])}`;
  },
});

/* ---------- 행동: 배우자와 시간 보내기 ---------- */
const SPOUSE_LINES = [
  (p) => `${J(p.name, '과/와')} 저녁을 지어 먹었다. 별말 없이 먹었는데, 그게 좋았다.`,
  (p) => `${p.name}의 일을 거들었다. 서툴다고 핀잔을 들었다. 핀잔을 들으며 웃었다.`,
  (p) => `둘이서 장에 다녀왔다. 오는 길에 ${J(p.name, '이/가')} 예전 이야기를 꺼냈다. 처음 만났던 날 이야기였다.`,
  (p) => `밤늦게까지 ${J(p.name, '과/와')} 이야기를 나눴다. 아이들 이야기, 돈 이야기, 그리고 아무것도 아닌 이야기.`,
];
ACTIONS.push({
  id: 'love_spouse', name: '배우자와 시간 보내기', icon: 'home',
  desc: '배우자와 함께 지낸다. 기분이 풀리고 정이 깊어진다. 오래 소홀하면 서운함이 쌓인다.',
  available: (g) => ready(g) && !!spouseP(g),
  run(g, rng) {
    const p = spouseP(g);
    const s = V(g).spouse;
    if (!p || !s) return '함께할 사람이 곁에 없다.';
    tired(g, 3); stress(g, -6);
    s.timeAt = mi(g);
    const m = addMood(g, rng.float(4, 8) + (s.mood < 30 ? 2 : 0));
    p.affection = Math.min(100, p.affection + 2);
    if (s.arranged || p.romance < 60) p.romance = Math.min(100, p.romance + rng.int(1, 3));
    return `${rng.pick(SPOUSE_LINES)(p)}${gains([up('정', m)])}`;
  },
});

/* ---------- 행동: 무덤 찾기 ---------- */
ACTIONS.push({
  id: 'love_grave', name: '먼저 간 사람의 무덤 찾기', icon: 'pray',
  desc: '먼저 떠난 배우자의 무덤을 찾는다. 슬픔이 조금 가라앉는다.',
  available: (g) => ready(g) && !!V(g).widowed,
  run(g, rng) {
    const w = V(g).widowed;
    tired(g, 2); stress(g, -10);
    w.visits = (w.visits ?? 0) + 1;
    const yrs = Math.floor((mi(g) - w.at) / 12);
    return rng.pick([
      `${w.name}의 무덤에 들꽃을 놓았다. ${yrs ? `${yrs}해가 지났다.` : '아직 흙이 새것이다.'} 하고 싶은 말이 많았는데 한마디도 하지 못했다.`,
      `무덤 앞에 앉아 요즘 일을 이야기했다. 대답은 없었다. 바람이 풀을 눕혔다가 일으켰다.`,
      `${w.name}${yrs >= 3 ? '의 얼굴이 조금씩 흐려진다. 그게 무서워서 자주 온다.' : '가 좋아하던 노래를 낮게 흥얼거렸다.'}`,
    ]);
  },
});

/* ---------- 이혼 ---------- */
export function divorce(g, why = '이혼') {
  const v = V(g);
  const meP = me(g);
  const p = byId(g, meP.spouseId);
  if (!p) return null;
  meP.spouseId = null; p.spouseId = null;
  p.bond = 'ex'; p.romance = Math.min(p.romance, 10); p.affection = Math.min(p.affection, 5);
  g.player.familyIds = g.player.familyIds.filter((id) => id !== p.id);
  v.exes.push({ id: p.id, name: p.name, how: 'divorce', at: mi(g) });
  v.spouse = null;
  // 재산을 나눈다
  const half = Math.floor(g.player.money * 0.4);
  g.player.money -= half;
  p.wealth = (p.wealth ?? 0) + half;
  note(g, `${J(p.name, '과/와')} 갈라섰다.`);
  p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 갈라섰다.` });
  chron(g, `${g.player.name}, ${J(fullName(p), '과/와')} 갈라서다.`, 60);
  relState(g).news.push({ text: `${J(g.player.name, '과/와')} ${J(fullName(p), '이/가')} 갈라섰다는 말이 돈다.`, who: [p.id], weight: 6 });
  stress(g, 20);
  // 성광교는 이혼을 좋게 보지 않는다
  if (g.faith?.god === 'solar') deed(g, 'loyal', -6, '혼인 서약을 깨고 갈라섰다더라');
  return { p, half, why };
}

/* ---------- 매달: 사랑이 스스로 움직인다 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const v = V(g);
  const meP = me(g);
  // 배우자 기록 맞추기
  const sp = spouseP(g);
  if (v.spouse && (!sp || v.spouse.id !== sp.id)) {
    const old = byId(g, v.spouse.id);
    if (old && !old.alive) {
      v.widowed = { id: old.id, name: old.name, at: mi(g), vow: false };
      chron(g, `${g.player.name}, 배우자 ${J(old.name, '을/를')} 먼저 보내다.`, 80);
    }
    v.spouse = null;
  }
  if (sp && !v.spouse) {
    const arranged = (g.court?.marriages ?? []).some((m) => m.who === sp.id) || (v.engaged?.id === sp.id && v.engaged.arranged);
    const wishes = Object.keys(WISHES);
    v.spouse = { id: sp.id, wish: rng.pick(wishes), wishAt: mi(g), wishDone: false, mood: arranged ? 45 : 65, arranged, since: mi(g), timeAt: mi(g), quarrels: 0, cheated: false };
    if (arranged) sp.romance = Math.min(sp.romance ?? 0, 15);
    v.marriages += 1;
    if (v.engaged?.id === sp.id) v.engaged = null;
    if (v.widowed) v.widowed = null; // 새 사람을 맞았다
  }
  // 배우자의 기분
  const s = v.spouse;
  if (s && sp) {
    let d = -0.6;
    if (mi(g) - s.timeAt <= 2) d += 0.8;
    if (traveling(g) || isJailed(g)) d -= 1.5;
    if (g.player.money + g.player.familyMoney < 10) d -= 0.8;
    if (!s.wishDone && mi(g) - s.wishAt > 30) d -= 0.4;
    if (has(sp, 'content')) d += 0.3;
    if (has(sp, 'ambitious') && L(g).renown < 10) d -= 0.2;
    addMood(g, d);
    // 정략혼: 함께 지내며 사랑이 자란다 (또는 끝내 자라지 않는다)
    if (s.arranged && s.mood >= 50 && sp.romance < 60 && rng.chance(0.3)) sp.romance += 1;
  }
  // 약혼: 날이 오면 혼례
  if (v.engaged) {
    const en = byId(g, v.engaged.id);
    if (!en || !en.alive || (en.spouseId && en.spouseId !== meP.id)) { v.engaged = null; note(g, '약혼이 깨졌다.'); }
    else if (mi(g) >= v.engaged.wedAt && !meP.spouseId && ready(g) && !sceneQueued(g, 'love_wedding')) { queueScene(g, 'love_wedding', { id: en.id }, { first: true }); }
  }
  // 몰래 만나는 사람
  if (v.affair) {
    const af = byId(g, v.affair.id);
    if (!af || !af.alive || !meP.spouseId || (af.spouseId && af.spouseId !== meP.id && rng.chance(0.02))) { if (af) af.bond = af.bond === 'lover' ? 'ex' : af.bond; v.affair = null; }
    else {
      v.affair.risk = clamp(v.affair.risk + 1.5, 0, 100);
      if (s && rng.chance(v.affair.risk / 250 + (has(byId(g, s.id), 'gossip') ? 0.01 : 0)) && !sceneQueued(g, 'love_caught') && ready(g)) { queueScene(g, 'love_caught', { id: af.id }, { first: true }); return; }
    }
  }
  // 다른 갈래 장면이 한둘 기다리는 것은 괜찮다 (빈 대기열만 기다리면 사랑 장면이 굶는다)
  if (!ready(g) || L(g).queue.some((x) => /^love_/.test(x.kind)) || L(g).queue.length > 2 || mi(g) - v.sceneAt < 5) return;
  const fire = (kind, data) => { v.sceneAt = mi(g); queueScene(g, kind, data); };
  const age = playerAge(g);
  if (s && sp) {
    // 배우자가 떠나고 싶어 한다
    if (s.mood < 12 && rng.chance(0.25)) return fire('love_leave', { id: sp.id });
    // 배우자의 바람(외도)
    if (s.mood < 28 && !has(sp, 'pious') && !s.cheated && rng.chance(0.02)) return fire('love_betrayed', { id: sp.id, other: rng.pick(['떠돌이 악사', '방앗간 일꾼', '옆 마을 상인', '경비대 하사']) });
    // 유혹
    if (s.mood < 50 && !v.affair && rng.chance(0.03)) {
      const c = g.people.filter((p) => eligible(g, p, { ignoreMine: true }) && p.known && p.id !== sp.id && chemistry(g, p) > 0.45).sort((a, b) => chemistry(g, b) - chemistry(g, a))[0];
      if (c) return fire('love_temptation', { id: c.id });
    }
    // 다툼
    if (s.mood < 45 && rng.chance(0.08 + (45 - s.mood) / 300)) return fire('love_quarrel', { id: sp.id, why: rng.int(0, QUARRELS.length - 1) });
    // 바람(소원)
    if (!s.wishDone && mi(g) - s.wishAt >= 8 && rng.chance(0.06)) return fire('love_wish', { id: sp.id });
    // 정략혼에서 사랑이 피었다
    if (s.arranged && sp.romance >= 55 && !s.bloomed) { s.bloomed = true; return fire('love_bloom', { id: sp.id }); }
    return;
  }
  // 사별 뒤
  if (v.widowed && !v.widowed.vow) {
    const since = mi(g) - v.widowed.at;
    if (since >= 18 && rng.chance(0.03)) return fire('love_after', { seed: rng.int(1, 1e9) });
    return;
  }
  if (age < 15) return;
  // 정략혼 자리가 들어온다 (이름 있는 집안이고 어릴 때)
  const fam = g.player.familyId;
  if (!v.engaged && age >= 16 && age <= 23 && ['fallen_knight', 'merchant'].includes(fam) && !v.arrangedAsked && rng.chance(0.03)) { v.arrangedAsked = true; return fire('love_arranged', { seed: rng.int(1, 1e9) }); }
  // 나를 마음에 둔 사람 (짝사랑을 받는다)
  const adm = g.people.find((p) => eligible(g, p) && p.known && p.bond !== 'lover' && (p.romance ?? 0) >= 45 && p.affection >= 25 && v.engaged?.id !== p.id && !p._admired);
  if (adm && rng.chance(0.08)) { adm._admired = true; return fire('love_admirer', { id: adm.id }); }
  // 눈길: 아직 짝이 없으면
  if (!lover(g) && !v.engaged && age <= 40 && rng.chance(0.02)) {
    const c = living(g).filter((p) => eligible(g, p) && !p.known && (p.place ?? 'ern') === L(g).place)[0]
      ?? living(g).filter((p) => eligible(g, p) && (p.romance ?? 0) < 15 && (p.place ?? 'ern') === L(g).place).sort(() => rng.next() - 0.5)[0];
    if (c) return fire('love_glance', { id: c.id });
  }
});

/* ---------- 눈길 ---------- */
defineScene('love_glance', {
  title: () => '눈길',
  text: (g, s) => {
    const p = byId(g, s.id);
    const who = p.known ? `늘 보던 ${p.name}` : `낯선 ${p.sex === 'm' ? '청년' : '아가씨'}`;
    return `${J(who, '이/가')} ${['우물가에서', '장터 천막 사이에서', '예배당 계단에서', '여관 창가에서'][s.id % 4]} 나를 보고 있었다. 눈이 마주치자 ${word(p)}는 고개를 돌렸다. 조금 늦게.`;
  },
  choices: (g, s) => (eligible(g, byId(g, s.id)) ? [{ label: '말을 걸어 본다', key: 'talk' }, { label: '눈인사만 한다', key: 'nod' }, { label: '모른 척한다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (!p) return '그 사람은 이미 가고 없었다.';
    rel(p);
    if (key === 'no') return '못 본 척 지나쳤다. 등 뒤가 한참 따가웠다.';
    if (!p.known) { p.known = true; p.affection = Math.max(p.affection, 8); }
    if (key === 'nod') { p.romance = Math.min(100, p.romance + 4); return '고개를 살짝 숙였다. 저쪽도 숙였다. 그게 다였다. 그날 밤 그게 다가 아니었던 것 같았다.'; }
    const ch = chemistry(g, p);
    p.romance = Math.min(100, p.romance + (ch > 0.4 ? 10 : 3));
    p.affection = Math.min(100, p.affection + 5);
    remember(g, p, '처음 말을 나누었다', 1, { tag: 'met' });
    return ch > 0.4
      ? `${p.name}. 이름을 물었고, 대답을 들었다. 별것 아닌 이야기를 했는데 해가 기울어 있었다.`
      : `말을 걸었다. ${J(p.name, '은/는')} 예의 바르게 대답했지만 눈은 다른 곳을 보고 있었다.`;
  },
});

/* ---------- 짝사랑: 내가 / 나를 ---------- */
defineScene('love_unrequited', {
  title: () => '짝사랑',
  text: (g, s) => { const p = byId(g, s.id); return `${J(p.name, '을/를')} 몇 번이나 찾아갔다. ${J(p.name, '은/는')} 늘 친절했다. 그 친절이 대답이라는 것을 이제는 안다.`; },
  choices: (g, s) => (byId(g, s.id)?.alive ? [{ label: '마음을 접는다', key: 'let' }, { label: '그래도 기다린다', key: 'wait' }, { label: '한 번은 말해 본다', key: 'say' }] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const v = V(g);
    if (!p) return '그 사람은 이제 없다.';
    v.pursue[p.id] = 0;
    if (key === 'let') { stress(g, 6); return '마음을 접기로 했다. 접은 자리가 오래 아팠다. 그래도 접었다.'; }
    if (key === 'wait') { stress(g, 4); p.affection = Math.min(100, p.affection + 2); return '기다리기로 했다. 사람 마음은 모르는 거니까. 아마도.'; }
    if (rng.chance(0.12 + p.affection / 300)) { p.bond = 'lover'; p.romance = Math.max(p.romance, 50); note(g, `${J(p.name, '과/와')} 연인이 되었다.`); return `${J(p.name, '은/는')} 한참 나를 보다가 말했다. "바보같이. 왜 이제 말해." 몰랐던 것은 나뿐이었다.`; }
    p.romance = 0; stress(g, 14);
    remember(g, p, '고백을 받고 거절했다', 0, { tag: 'confess' });
    return `"미안해." ${J(p.name, '은/는')} 그 말을 하면서 나보다 더 아픈 얼굴을 했다. 그게 더 아팠다.`;
  },
});
defineScene('love_admirer', {
  title: () => '나를 마음에 둔 사람',
  text: (g, s) => {
    const p = byId(g, s.id);
    return `${J(p.name, '이/가')} ${['서툰 글씨로 쓴 편지를 건넸다', '말린 들꽃 한 다발을 문 앞에 두고 갔다', '장터에서 산 리본을 쥐여 주고 달아났다', '술기운을 빌려 할 말이 있다고 했다'][s.id % 4]}. 오래전부터 나를 마음에 두고 있었다고 한다.`;
  },
  choices: (g, s) => (eligible(g, byId(g, s.id)) && byId(g, s.id).bond !== 'lover' ? [
    { label: '마음을 받아 준다', key: 'yes' }, { label: '시간을 달라고 한다', key: 'wait' }, { label: '정중히 거절한다', key: 'no' }, { label: '차갑게 돌려보낸다', key: 'cold' },
  ] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (!p) return '그 사람은 이제 없다.';
    if (key === 'yes') { p.bond = 'lover'; p.romance = Math.max(p.romance, 55); note(g, `${J(p.name, '과/와')} 연인이 되었다.`); remember(g, p, '서로 마음을 확인했다', 1, { tag: 'confess' }); stress(g, -10); return `고개를 끄덕였다. ${J(p.name, '은/는')} 믿기지 않는다는 얼굴로 나를 보다가, 그 자리에서 울어 버렸다.`; }
    if (key === 'wait') { p.romance = Math.min(100, p.romance + 2); return `시간을 달라고 했다. ${J(p.name, '은/는')} 기다리겠다고 했다. 정말 기다릴 얼굴이었다.`; }
    if (key === 'no') { p.romance = 5; p.affection -= 5; remember(g, p, '마음을 전했다가 거절당했다', -1, { tag: 'rejected' }); return `미안하다고 했다. ${J(p.name, '은/는')} 괜찮다고, 알고 있었다고 웃었다. 돌아서는 어깨가 작았다.`; }
    p.romance = 0; p.affection = Math.min(p.affection - 20, -10); remember(g, p, '마음을 전했다가 비웃음을 샀다', -2, { tag: 'rejected' });
    if (p.affection <= -40) p.bond = 'enemy';
    return `편지를 돌려주며 다시는 이러지 말라고 했다. ${p.name}의 얼굴이 하얗게 질렸다. 사람의 마음은 상처를 오래 기억한다.`;
  },
});

/* ---------- 정략혼과 약혼, 혼례 ---------- */
function arrangedCand(g, s) {
  let x = s.seed >>> 0;
  const nx = () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; };
  const sex = me(g).sex === 'm' ? 'f' : 'm';
  const names = sex === 'm' ? ['아르민', '콘라트', '베른트', '울리히', '라이너', '프리츠'] : ['마틸데', '헤드비히', '카타리나', '조피', '이르마', '유디트'];
  const houses = g.player.familyId === 'fallen_knight' ? ['폰 리히트', '폰 아들러', '폰 마르크'] : ['그로세', '아이젠', '하르퉁'];
  const why = g.player.familyId === 'fallen_knight' ? ['저택 지붕을 고칠 지참금이 딸려 온다.', '그 집안은 아직 영주의 기사 명부에 이름이 남아 있다.'] : ['하르펜 상단과 줄이 닿는 집안이다.', '그 집 창고와 우리 짐마차를 합치면 장사가 두 배가 된다.'];
  return { sex, name: names[Math.floor(nx() * names.length)], last: houses[Math.floor(nx() * houses.length)], age: Math.max(16, playerAge(g) + Math.floor(nx() * 7) - 3), why: why[Math.floor(nx() * why.length)], kind: nx() < 0.5 };
}
defineScene('love_arranged', {
  title: () => '정해진 혼처',
  text: (g, s) => { const c = arrangedCand(g, s); return `부모님이 나를 앉혀 놓고 말을 꺼냈다. ${c.last} 집안의 ${c.age}살 ${c.name}. ${c.why} 얼굴은 한 번 본 적이 있는지 없는지도 모르겠다. ${lover(g) ? `${lover(g).name}의 얼굴이 먼저 떠올랐다.` : ''}`.trim(); },
  choices: (g) => (me(g).spouseId || V(g).engaged ? [] : [
    { label: '집안의 뜻을 따른다', key: 'yes' },
    { label: '싫다고 한다', key: 'no' },
    ...(lover(g) ? [{ label: '사랑하는 사람이 있다고 말한다', key: 'love' }] : []),
  ]),
  resolve(g, rng, s, key) {
    const c = arrangedCand(g, s);
    const parents = [me(g).fatherId, me(g).motherId].map((id) => byId(g, id)).filter((p) => p && p.alive);
    if (key === 'no') { for (const p of parents) p.affection -= 8; stress(g, 8); return '싫다고 했다. 아버지는 아무 말 없이 방을 나갔다. 어머니는 한숨만 쉬었다. 그날 저녁상은 조용했다.'; }
    if (key === 'love') {
      const lv = lover(g);
      if (rng.chance(0.4 + (lv?.wealth ?? 0) / 300)) { V(g).engaged = { id: lv.id, at: mi(g), wedAt: mi(g) + 4, arranged: false }; note(g, `${J(lv.name, '과/와')} 약혼했다.`); return `${lv.name} 이야기를 했다. 오래 침묵이 흘렀다. "...데려와 봐라." 아버지가 말했다. 넉 달 뒤로 날을 잡았다.`; }
      for (const p of parents) p.affection -= 12; stress(g, 12);
      return `${lv?.name ?? '그 사람'} 이야기를 꺼내자 아버지의 얼굴이 굳었다. "그런 집안과는 안 된다." 그 말 한마디로 이야기는 끝났다. 혼처 이야기도, 당분간은.`;
    }
    const p = makePerson(rng, { sex: c.sex, ageMonths: c.age * 12 + rng.int(0, 11), lastName: c.last, job: 'idle', traits: c.kind ? ['kind', 'reserved'] : ['ambitious', 'reserved'] });
    p.name = c.name; p.known = true; p.affection = 20; p.wealth = rng.int(80, 200);
    p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 정혼했다.` });
    g.people.push(p); rel(p);
    V(g).engaged = { id: p.id, at: mi(g), wedAt: mi(g) + 6, arranged: true };
    for (const q of parents) q.affection = Math.min(100, q.affection + 6);
    note(g, `${J(fullName(p), '과/와')} 정혼했다.`);
    return `고개를 숙였다. 여섯 달 뒤로 날이 잡혔다. 상견례 날 처음 제대로 본 ${J(c.name, '은/는')} 나만큼이나 굳은 얼굴이었다. 둘 다 같은 처지라는 것이 조금은 위로가 되었다.`;
  },
});
defineScene('love_wedding', {
  title: () => '혼례',
  text: (g, s) => {
    const p = byId(g, s.id);
    const lv = lover(g);
    return `혼례 날이 밝았다. 예배당에 꽃이 걸리고 ${J(p.name, '이/가')} 예복을 입고 기다린다.${lv && lv.id !== p.id ? ` 그리고 예배당 뒤편 느릅나무 아래, ${J(lv.name, '이/가')} 서 있는 것이 보였다.` : ''}`;
  },
  choices: (g, s) => {
    const p = byId(g, s.id);
    if (!p || !p.alive || me(g).spouseId || (p.spouseId && p.spouseId !== me(g).id)) return [];
    const lv = lover(g);
    return [{ label: '혼인 서약을 한다', key: 'wed' }, ...(lv && lv.id !== p.id ? [{ label: `${lv.name}의 손을 잡고 달아난다`, key: 'flee' }] : []), { label: '혼례를 무른다', key: 'call' }];
  },
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const v = V(g);
    if (!p) return '혼례는 열리지 못했다.';
    if (key === 'wed') {
      const lv = lover(g);
      if (lv && lv.id !== p.id) { lv.bond = 'ex'; remember(g, lv, '다른 사람과 혼인했다', -1, { tag: 'married_other' }); stress(g, 12); }
      const out = marry(g, p);
      return `${lv && lv.id !== p.id ? `${lv.name} 쪽은 보지 않았다. ` : ''}${out}`;
    }
    v.engaged = null;
    p.affection = Math.min(p.affection, -20); p.romance = 0;
    v.exes.push({ id: p.id, name: p.name, how: 'fled', at: mi(g) });
    for (const q of [me(g).fatherId, me(g).motherId].map((id) => byId(g, id)).filter((q) => q && q.alive)) q.affection -= 20;
    deed(g, 'loyal', -10, '혼례 날 신랑 신부를 두고 사라졌다더라');
    if (key === 'flee') {
      const lv = lover(g);
      chron(g, `${g.player.name}, 혼례 날 ${J(lv.name, '과/와')} 달아나다.`, 80);
      const out = marry(g, lv);
      return `${lv.name}의 손을 잡고 뛰었다. 뒤에서 누가 소리를 질렀다. 이웃 마을 작은 예배당에서, 증인 하나 없이 서약했다. ${out.split('. ').slice(-1)[0]}`;
    }
    stress(g, 15);
    return `예배당 문 앞에서 돌아섰다. ${J(p.name, '은/는')} 혼자 남았다. 이 고장 사람들은 이 일을 오래 이야기할 것이다.`;
  },
});

/* ---------- 혼인 뒤: 바람(소원), 다툼, 꽃핌 ---------- */
defineScene('love_wish', {
  title: (g, s) => `${byId(g, s.id)?.name ?? '배우자'}의 바람`,
  text: (g, s) => { const p = byId(g, s.id); const w = WISHES[V(g).spouse?.wish]; return `잠들기 전, ${J(p.name, '이/가')} 천장을 보며 말했다. "나, ${w?.text ?? '하고 싶은 게 있다'}." 처음 듣는 말이었다. 아니, 어쩌면 몇 번 들었는데 흘려들었는지도 모른다.${w?.cost ? ` (은화 ${w.cost}닢쯤 든다)` : ''}`; },
  choices: (g, s) => {
    const sp = spouseP(g);
    const sv = V(g).spouse;
    if (!sp || sp.id !== s.id || !sv || sv.wishDone) return [];
    const w = WISHES[sv.wish];
    const can = g.player.money + g.player.familyMoney >= (w?.cost ?? 0);
    return [...(can ? [{ label: '들어준다', key: 'yes' }] : []), { label: '지금은 어렵다고 한다', key: 'later' }, { label: '안 된다고 한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const sp = spouseP(g);
    const sv = V(g).spouse;
    if (!sp || !sv) return '함께할 사람이 곁에 없다.';
    const w = WISHES[sv.wish];
    if (key === 'yes') {
      let c = w.cost;
      const f = Math.min(g.player.familyMoney, c); g.player.familyMoney -= f; c -= f; g.player.money = Math.max(0, g.player.money - c);
      sv.wishDone = true; addMood(g, 25);
      if (w.job) sp.job = w.job;
      if (sv.wish === 'child') relState(g).tryChild = 8;
      sp.romance = Math.min(100, sp.romance + 6);
      return w.done;
    }
    sv.wishAt = mi(g);
    if (key === 'later') { addMood(g, -4); return '지금은 어렵다고 했다. "알아." 배우자는 돌아누웠다. 정말 아는 목소리였다. 그래서 더 미안했다.'; }
    addMood(g, -12);
    // 안 된다고 하면 다른 바람을 품는다
    sv.wish = rng.pick(Object.keys(WISHES).filter((k) => k !== sv.wish));
    return '안 된다고 잘라 말했다. 배우자는 대답하지 않았다. 그 뒤로 그 이야기를 다시 꺼내지 않았다. 꺼내지 않는 것이 더 무서웠다.';
  },
});
const QUARRELS = [
  '돈 이야기 끝에 목소리가 높아졌다. 누가 더 벌고 누가 더 쓰는지, 해묵은 장부가 다 나왔다.',
  '집을 너무 자주 비운다는 말이 나왔다. "당신은 이 집에 손님이야."',
  '시댁과 처가 이야기가 나오자 둘 다 말이 날카로워졌다.',
  '아이를 어떻게 키울지를 두고 부딪쳤다. 아이가 문틈으로 보고 있었다.',
  '별것 아닌 일이었다. 국이 짰다. 그런데 싸움은 짠 국에서 십 년 전 일까지 갔다.',
];
defineScene('love_quarrel', {
  title: () => '부부 싸움',
  text: (g, s) => `${QUARRELS[s.why] ?? QUARRELS[0]} ${byId(g, s.id)?.name ?? '배우자'}의 눈이 붉었다.`,
  choices: (g, s) => (spouseP(g)?.id === s.id ? [
    { label: '먼저 사과한다', key: 'sorry' }, { label: '끝까지 맞선다', key: 'fight' },
    ...(g.player.money >= 5 ? [{ label: '이튿날 선물을 사 온다', key: 'gift' }] : []), { label: '며칠 집을 비운다', key: 'out' },
  ] : []),
  resolve(g, rng, s, key) {
    const sv = V(g).spouse;
    const sp = spouseP(g);
    if (!sv || !sp) return '싸울 사람이 곁에 없다.';
    sv.quarrels += 1;
    if (key === 'sorry') { addMood(g, 12); stress(g, 3); return '먼저 미안하다고 했다. 배우자는 한참 등을 보이고 있다가, 내 쪽으로 돌아누웠다.'; }
    if (key === 'gift') { spend(g, 5); addMood(g, 9); return '장에서 은 머리핀을 사 왔다. 배우자는 "이런 걸로 넘어갈 줄 알아?" 하면서 그날 저녁 그 핀을 꽂고 있었다.'; }
    if (key === 'out') { addMood(g, -6); stress(g, -6); return '며칠 여관에서 지냈다. 돌아왔을 때 집은 조용했다. 화해한 것인지 포기한 것인지 알 수 없는 조용함이었다.'; }
    if (check(rng, g.player.stats.wil * 0.5 + g.player.stats.cha * 0.4, 45)) { addMood(g, 2); return '끝까지 물러서지 않았다. 새벽이 되어서야 배우자가 "당신 말도 맞아"라고 했다. 이긴 것 같았는데 기분은 좋지 않았다.'; }
    addMood(g, -10); stress(g, 10);
    return '끝까지 맞섰다. 그릇이 하나 깨졌다. 그 뒤로 사흘 동안 집 안에서 말소리가 나지 않았다.';
  },
});
defineScene('love_bloom', {
  title: () => '정략혼과 사랑 사이',
  text: (g, s) => { const p = byId(g, s.id); return `집안이 정해 준 사람이었다. 처음 몇 해는 한 지붕 아래 사는 남이었다. 그런데 오늘, ${J(p.name, '이/가')} 열이 난 나를 밤새 간호하는 것을 보다가 알았다. 언제부터인지 모르게, 이 사람을 사랑하게 되었다.`; },
  choices: (g, s) => (spouseP(g)?.id === s.id ? [{ label: '그 마음을 말한다', key: 'say' }, { label: '말없이 손을 잡는다', key: 'hold' }] : []),
  resolve(g, rng, s, key) {
    const sp = spouseP(g);
    if (!sp) return '그 사람은 이제 곁에 없다.';
    addMood(g, 15); sp.romance = Math.min(100, sp.romance + 15); stress(g, -10);
    return key === 'say' ? `말했다. ${J(sp.name, '은/는')} 놀라지 않았다. "나는 작년 겨울부터였어." 그 말에 둘 다 웃었다.` : '말없이 손을 잡았다. 그 손이 마주 잡아 왔다. 말은 필요 없었다.';
  },
});

/* ---------- 바람: 유혹, 들킴, 배신당함 ---------- */
defineScene('love_temptation', {
  title: () => '유혹',
  text: (g, s) => { const p = byId(g, s.id); return `요즘 집에 들어가는 발걸음이 무거웠다. 그런 날이면 꼭 ${J(p.name, '과/와')} 마주쳤다. 오늘은 ${J(p.name, '이/가')} 먼저 말했다. "잠깐 걸을래요?" 그 말이 무슨 뜻인지 둘 다 알았다.`; },
  choices: (g, s) => (spouseP(g) && eligible(g, byId(g, s.id), { ignoreMine: true }) && !V(g).affair ? [{ label: '따라 걷는다', key: 'go' }, { label: '선을 긋는다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (!p) return '그 사람은 이미 가고 없었다.';
    if (key === 'no') { addMood(g, 3); return '집에 가 봐야 한다고 했다. 돌아오는 길, 이상하게 마음이 가벼웠다. 오랜만에 배우자가 보고 싶었다.'; }
    V(g).affair = { id: p.id, at: mi(g), risk: 10 };
    p.bond = 'lover'; p.romance = Math.max(p.romance, 50); p.lastSeen = mi(g);
    stress(g, 6);
    return `따라 걸었다. 강둑 끝까지. 돌아올 때는 둘 다 말이 없었다. 이제 지켜야 할 비밀이 생겼다.`;
  },
});
defineScene('love_caught', {
  title: () => '들킨 비밀',
  text: (g, s) => { const p = byId(g, s.id); const sp = spouseP(g); return `${sp ? J(sp.name, '이/가') : '배우자가'} 식탁 위에 무언가를 내려놓았다. ${J(p?.name ?? '그 사람', '이/가')} 준 손수건이었다. "언제부터야." 묻는 목소리가 너무 조용했다.`; },
  choices: (g) => (spouseP(g) ? [{ label: '무릎 꿇고 빈다', key: 'beg' }, { label: '다시는 안 만나겠다고 한다', key: 'end' }, { label: '갈라서자고 한다', key: 'divorce' }, { label: '끝까지 아니라고 한다', key: 'deny' }] : []),
  resolve(g, rng, s, key) {
    const v = V(g);
    const p = byId(g, s.id);
    const sv = v.spouse;
    if (sv) sv.cheated = true;
    deed(g, 'loyal', -14, '배우자를 두고 바람을 피웠다더라');
    const endAffair = () => { if (p) { p.bond = 'ex'; p.romance = Math.min(p.romance, 20); remember(g, p, '몰래 만나던 사이가 끝났다', -1, { tag: 'breakup' }); } v.affair = null; };
    if (key === 'divorce') { endAffair(); const d = divorce(g, 'affair'); return `갈라서자고 했다. 배우자는 울지 않았다. 짐을 싸는 손이 떨렸을 뿐이다.${d?.half ? ` 은화 ${d.half}닢이 함께 나갔다.` : ''}`; }
    if (key === 'deny') {
      if (check(rng, g.player.stats.cha * 0.6, 55)) { addMood(g, -10); v.affair.risk = 40; return '아니라고 했다. 끝까지. 배우자는 믿는 척했다. 믿는 척하는 얼굴을 보는 것이 더 괴로웠다.'; }
      endAffair(); addMood(g, -40); stress(g, 15);
      return '아니라고 했지만 증거가 너무 많았다. 거짓말이 바람보다 더 깊은 상처를 냈다.';
    }
    endAffair();
    if (key === 'beg') { addMood(g, -25); stress(g, 15); return '무릎을 꿇었다. 배우자는 오래 나를 내려다보았다. "일어나." 용서한다는 말은 아니었다. 아직은.'; }
    addMood(g, -30); stress(g, 12);
    return `${p?.name ?? '그 사람'}에게 끝내자고 했다. 배우자는 고개를 끄덕였지만, 그날부터 내가 늦게 들어오는 밤마다 깨어 있었다.`;
  },
});
defineScene('love_betrayed', {
  title: () => '배신',
  text: (g, s) => { const sp = byId(g, s.id); return `빨래터 아낙들이 나를 보고 입을 다물었다. 이유를 알게 된 것은 사흘 뒤였다. ${J(sp.name, '이/가')} ${s.other}${hasB(s.other) ? '과' : '와'} 만난다는 것이다. 모르는 사람은 나 하나였다.`; },
  choices: (g, s) => (spouseP(g)?.id === s.id ? [{ label: '따져 묻고, 용서한다', key: 'forgive' }, { label: '갈라선다', key: 'divorce' }, { label: '그 상대를 찾아간다', key: 'confront' }, { label: '모른 척한다', key: 'ignore' }] : []),
  resolve(g, rng, s, key) {
    const sv = V(g).spouse;
    const sp = spouseP(g);
    if (!sv || !sp) return '그 사람은 이제 곁에 없다.';
    stress(g, 20);
    if (key === 'divorce') { const d = divorce(g, 'betrayed'); return `갈라서자고 했다. ${J(sp.name, '은/는')} 변명하지 않았다.${d?.half ? ` 재산은 나누었다. 은화 ${d.half}닢.` : ''} 혼자 남은 집은 생각보다 넓었다.`; }
    if (key === 'confront') {
      if (check(rng, g.player.stats.str * 0.4 + g.player.skills.sword * 0.4 + g.player.stats.wil * 0.2, 35)) { deed(g, 'brave', 4, null); addMood(g, 10); return `${s.other}를 찾아가 멱살을 잡았다. 그는 다시는 이 고장에 얼씬도 하지 않겠다고 했다. 배우자는 그날 밤 처음으로 울며 용서를 빌었다.`.replace(`${s.other}를`, `${s.other}${hasB(s.other) ? '을' : '를'}`); }
      stress(g, 10); g.player.injuries.push({ name: '얻어맞은 얼굴', months: 1 });
      return `${s.other}를 찾아갔다가 되레 얻어맞았다. 동네가 다 아는 웃음거리가 되었다.`.replace(`${s.other}를`, `${s.other}${hasB(s.other) ? '을' : '를'}`);
    }
    if (key === 'ignore') { addMood(g, 4); deed(g, 'brave', -3, null); return '모른 척하기로 했다. 배우자도 내가 아는 것을 아는 것 같았다. 둘 다 아무 말도 하지 않는 집이 되었다.'; }
    addMood(g, 25); sp.affection = Math.min(100, sp.affection + 10);
    return `밤새 따져 물었다. 새벽에 ${J(sp.name, '은/는')} 다 털어놓았다. 외로웠다고 했다. 내가 집에 없었다고. 용서했다. 잊지는 못하겠지만.`;
  },
});
const hasB = (w) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
defineScene('love_leave', {
  title: () => '떠나려는 사람',
  text: (g, s) => { const sp = byId(g, s.id); return `${J(sp.name, '이/가')} 보따리를 싸 놓고 기다리고 있었다. "더는 못 하겠어. 당신은 나를 보지 않아. 오래전부터." 붙잡을 말을 찾았지만, 무슨 말을 해도 늦은 것 같았다.`; },
  choices: (g, s) => (spouseP(g)?.id === s.id ? [{ label: '붙잡는다', key: 'stay' }, { label: '보내 준다', key: 'go' }] : []),
  resolve(g, rng, s, key) {
    const sp = spouseP(g);
    if (!sp) return '그 사람은 이미 떠났다.';
    if (key === 'stay' && check(rng, g.player.stats.cha * 0.5 + (sp.romance ?? 0) * 0.3 + (V(g).spouse?.quarrels ?? 0) * -2, 35)) { addMood(g, 25); return '처음으로 내 쪽에서 울었다. 배우자는 보따리를 내려놓았다. 이번이 마지막이라고 했다. 그 말을 가슴에 새겼다.'; }
    const d = divorce(g, 'left');
    return `${key === 'stay' ? '붙잡았지만 소용없었다. ' : ''}${J(sp.name, '은/는')} 떠났다. 문간에 남은 신발 자국이 한동안 지워지지 않았다.${d?.half ? ` 은화 ${d.half}닢을 챙겨 주었다.` : ''}`;
  },
});

/* ---------- 사별 뒤의 삶 ---------- */
defineScene('love_after', {
  title: () => '다시 봄',
  text: (g) => { const w = V(g).widowed; const yrs = Math.floor((mi(g) - w.at) / 12); return `${w.name}${hasB(w.name) ? '이' : '가'} 떠난 지 ${yrs || 1}해. 이웃들이 조심스럽게 말을 꺼내기 시작했다. 혼자 늙기엔 아직 이르다고. 거울을 보니 정말 그런지 아닌지 알 수 없었다.`; },
  choices: (g) => (V(g).widowed && !me(g).spouseId ? [{ label: '마음을 다시 열어 본다', key: 'open' }, { label: '아직은 아니다', key: 'not' }, { label: '평생 그 사람만 기억하기로 한다', key: 'vow' }] : []),
  resolve(g, rng, s, key) {
    const w = V(g).widowed;
    if (key === 'vow') { w.vow = true; stress(g, -5); note(g, `평생 ${J(w.name, '을/를')} 기억하며 혼자 살기로 했다.`); return `${w.name}의 반지를 다시 끼었다. 이제 빼지 않을 것이다. 이상하게 마음이 놓였다.`; }
    if (key === 'not') { w.at = mi(g) - 6; return '아직은 아니라고 했다. 이웃들은 고개를 끄덕였다. 기다려 주는 것도 정이다.'; }
    const c = living(g).filter((p) => eligible(g, p) && (has(p, 'kind') || has(p, 'generous') || has(p, 'content')) && (p.place ?? 'ern') === L(g).place)[0]
      ?? living(g).filter((p) => eligible(g, p))[0];
    stress(g, -8);
    if (!c) return '마음을 열기로 했다. 아직 누가 그 자리에 올지는 모르지만, 문을 조금 열어 두었다.';
    rel(c); c.known = true; c.affection = Math.max(c.affection, 25); c.romance = Math.max(c.romance, 25);
    remember(g, c, '먼저 말을 걸어 왔다', 1, { tag: 'met' });
    return `마음을 열기로 했다. 그 주 장날, ${J(c.name, '이/가')} 먼저 말을 걸어왔다. 자기도 혼자된 지 오래라고 했다. 둘 다 서툴렀다. 서툰 게 다행이었다.`;
  },
});

/* ---------- 대 잇기, 저장 ---------- */
HOOKS.heir.push((g) => {
  const v = V(g);
  // 새 주인의 혼인 상태로 다시 맞춘다 (배우자는 다음 달에 기록된다)
  v.spouse = null; v.affair = null; v.engaged = null; v.widowed = null; v.exes = []; v.marriages = 0; v.pursue = {}; v.sceneAt = 0; v.arrangedAsked = false;
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
