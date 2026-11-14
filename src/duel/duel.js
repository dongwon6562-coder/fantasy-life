// 1대1 결투: 심리전.
// 한 합마다 상대의 낌새를 보고 수를 고른다. 낌새는 감각이 높을수록 믿을 만하고, 속임수에 능한 상대는 거짓 낌새를 흘린다.
//   강공(내려치기)  → 막기와 허초를 이긴다. 속공에 진다.
//   속공(찌르기)    → 강공과 허초를 이긴다. 막기에 진다.
//   막기(흘리고 받아치기) → 속공을 이긴다. 강공과 허초에 진다. 이기면 크게 받아친다.
//   허초(속임수)    → 막기를 이긴다. 강공과 속공에 진다. 이기면 가장 크게 벤다.
//   간 보기        → 공격하지 않는다. 받는 피해가 줄고, 다음 합에 낌새가 또렷해지고 내 공격이 날카로워진다.
//   주문(1서클 이상) → 막기와 허초를 이긴다. 속공에 끊긴다. 쓸 수 있는 횟수가 서클만큼.
//   검기(검성 이상, 마력이 있어야) → 속공 말고는 다 이긴다.
// 같은 수끼리는 실력 차로 가린다. 이긴 쪽은 기세가 오르고, 기세는 피해를 키운다.
// 수치는 D의 전투(adventure/combat.js)와 같은 눈금: 체력은 playerVitality, 실력은 검술+몸.
import { EVENTS, josa } from '../events/core.js';
import { me, circleOf } from '../game.js';
import { playerVitality } from '../adventure/combat.js';
import { schoolOf, rankOf, SCHOOLS } from './schools.js';
import { ENDS, registerDuelEnd, queueDuel } from './registry.js';
export { registerDuelEnd, queueDuel };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (rng, arr) => arr[Math.floor(rng.next() * arr.length)];

export const MOVES = {
  heavy: { name: '강공', label: '내려친다 (강공)', dmg: 22 },
  quick: { name: '속공', label: '찌른다 (속공)', dmg: 11 },
  guard: { name: '막기', label: '흘리고 받아친다 (막기)', dmg: 19 },
  feint: { name: '허초', label: '속인다 (허초)', dmg: 26 },
  wait: { name: '간 보기', label: '거리를 두고 간을 본다', dmg: 0 },
  magic: { name: '주문', label: '주문을 쏜다', dmg: 0 },
  aura: { name: '검기', label: '검에 마력을 싣는다 (검기)', dmg: 30 },
  yield: { name: '항복', label: '검을 내린다 (항복)', dmg: 0 },
};
const BEATS = {
  heavy: ['guard', 'feint', 'wait'],
  quick: ['heavy', 'feint', 'magic', 'aura', 'wait'],
  guard: ['quick'],
  feint: ['guard'],
  magic: ['guard', 'feint', 'heavy', 'wait'],
  aura: ['guard', 'feint', 'heavy', 'magic', 'wait'],
  wait: [],
};
const beats = (a, b) => (BEATS[a] ?? []).includes(b);

// 낌새: 상대가 다음에 할 수를 몸이 먼저 말한다
const TELLS = {
  heavy: ['상대가 검을 높이 끌어올리며 숨을 깊이 들이쉰다.', '상대의 어깨에 힘이 들어간다. 무게중심이 앞발로 쏠린다.', '상대가 이를 악물고 한 걸음 크게 내디딘다.'],
  quick: ['상대의 칼끝이 가볍게 떨린다. 발뒤꿈치가 들려 있다.', '상대가 몸을 낮추고 칼끝을 내 목 높이에 맞춘다.', '상대의 손목이 풀려 있다. 짧고 빠른 것이 온다.'],
  guard: ['상대가 반걸음 물러서며 검을 몸 앞에 세운다.', '상대의 눈이 내 칼끝만 좇는다. 기다리는 눈이다.', '상대가 숨을 고르며 발을 넓게 벌린다.'],
  feint: ['상대의 시선과 칼끝이 서로 다른 곳을 향한다.', '상대가 일부러 빈틈을 보이는 것 같다. 너무 쉽다.', '상대의 입가에 아주 옅은 웃음이 걸렸다.'],
  magic: ['상대의 입술이 소리 없이 움직인다. 손끝에 빛이 모인다.', '공기가 상대 쪽으로 빨려 들어간다. 영창이다.'],
  aura: ['상대의 검신이 희미하게 울기 시작한다. 마력이 실린다.'],
  wait: ['상대가 거리를 벌리고 나를 찬찬히 뜯어본다.'],
};
const MAGIC_TELLS = {
  heavy: ['상대가 두 손을 모으고 긴 영창을 시작한다. 공기가 무거워진다.', '상대의 발밑에 큰 마법진이 천천히 그려진다.'],
  quick: ['상대의 손가락 끝이 짧게 튄다. 한 마디짜리 영창이 온다.', '상대가 숨을 짧게 끊어 쉰다. 빠른 것이 온다.'],
  guard: ['상대의 둘레에 희미한 막이 일렁인다.', '상대가 한 걸음 물러서며 손바닥을 앞으로 편다.'],
  feint: ['상대의 입술과 손짓이 서로 다른 주문을 그린다.', '상대의 마력이 손끝에 모였다가 이상하게 흩어진다.'],
  wait: ['상대가 마력을 거두고 나를 지켜본다.'],
};
const UNREADABLE = ['상대의 속을 읽을 수 없다.', '상대는 아무것도 드러내지 않는다.', '낌새를 잡기 전에 상대가 자세를 바꾼다.'];

// 상대의 성향: 수마다 고를 무게
export const STYLES = {
  bold: { name: '저돌적', w: { heavy: 4, quick: 2, guard: 1, feint: 1 }, trick: 0.05 },
  steady: { name: '침착함', w: { heavy: 1.5, quick: 2, guard: 3.5, feint: 1 }, trick: 0.1 },
  tricky: { name: '교활함', w: { heavy: 1.5, quick: 2, guard: 1.5, feint: 3.5 }, trick: 0.35 },
  swift: { name: '날렵함', w: { heavy: 1, quick: 4, guard: 1.5, feint: 2 }, trick: 0.15 },
};

// 내 실력 (D의 playerPower에서 서클과 장비를 뺀, 맨몸 검의 실력)
export function duelSkill(g, magicDuel = false) {
  const s = g.player.stats, k = g.player.skills;
  if (magicDuel) return (k.magic * 0.7 + s.int * 0.2 + s.sen * 0.1 + s.wil * 0.1) * Math.max(0.5, 1 - g.player.injuries.length * 0.1);
  let v = k.sword * 0.75 + s.str * 0.12 + s.agi * 0.18 + s.sen * 0.08;
  v += (g.life?.gear?.weapon ?? 0) * 0.4;
  v *= Math.max(0.5, 1 - g.player.injuries.length * 0.1);
  if (g.player.fatigue > 70) v *= 0.85;
  return v;
}

// ---------- 결투 시작 ----------
// opts: { kind, foe: { name, skill, style?, school?, circle?, aura?, id? }, lethal?, title?, intro?, ctx? }
// kind는 끝났을 때 부를 함수(registerDuelEnd)의 이름

// 사건이나 장면의 선택지 안에서 부르면 곧바로 결투가 뜬다
export function startDuel(g, rng, opts) {
  const foe = { style: 'steady', circle: 0, ...opts.foe };
  if (!STYLES[foe.style]) foe.style = 'steady';
  const hp = playerVitality(g);
  const fhp = 80 + foe.skill * 0.35;
  g.duel = {
    kind: opts.kind ?? 'spar', title: opts.title ?? '결투', lethal: !!opts.lethal, ctx: opts.ctx ?? {}, magicDuel: opts.mode === 'magic',
    foe, hp, hp0: hp, fhp, fhp0: fhp, round: 0, mom: 0, fmom: 0, history: [],
    sharp: 0, read: 0, mana: Math.min(5, circleOf(g)), fmana: foe.circle ?? 0, log: [],
    next: null, tell: null,
  };
  planFoe(g, rng);
  g.pendingEvent = duelEvent(g, opts.intro);
  return g.pendingEvent;
}

// 상대의 다음 수 정하기 + 낌새
function planFoe(g, rng) {
  const d = g.duel;
  const st = STYLES[d.foe.style];
  const w = { ...st.w };
  if (d.fmana > 0) w.magic = 2.2;
  if (d.foe.aura) w.aura = 1.2;
  // 실력 있는 상대는 내 버릇을 읽는다: 최근 내가 자주 쓴 수를 이기는 수를 고른다
  const recent = d.history.slice(-3);
  if (recent.length >= 2) {
    const count = {};
    for (const m of recent) count[m] = (count[m] ?? 0) + 1;
    const [fav, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    const adapt = clamp(0.3 + d.foe.skill / 150, 0.3, 0.8) * (n >= 3 ? 1.2 : n >= 2 ? 1 : 0.5) * (schoolOf(g) === 'hwanyeong' ? 0.6 : 1);
    if (fav !== 'wait' && rng.chance(adapt)) {
      const counters = Object.keys(BEATS).filter((m) => BEATS[m].includes(fav) && (w[m] ?? 0) > 0);
      if (counters.length) { d.next = pick(rng, counters); return tellFor(g, rng); }
    }
  }
  if (d.fhp < d.fhp0 * 0.3) { w.guard = (w.guard ?? 1) * 1.6; } // 몰리면 몸을 사린다
  if (d.fmom >= 2) { w.heavy = (w.heavy ?? 1) * 1.5; }        // 기세를 타면 몰아친다
  d.next = rng.weighted(Object.keys(w), (k) => w[k]);
  tellFor(g, rng);
}
function tellFor(g, rng) {
  const d = g.duel;
  const sen = g.player.stats.sen;
  let rel = 0.32 + (sen - d.foe.skill * 0.4) / 70 + d.read * 0.25 + (rankOf(g) >= 2 ? 0.1 : 0);
  rel = clamp(rel, 0.15, 0.95);
  d.read = 0;
  if (!rng.chance(rel)) {
    // 못 읽었다: 아무것도 안 보이거나, 잘못 읽는다
    if (rng.chance(0.5)) { d.tell = pick(rng, UNREADABLE); d.tellTrue = null; return; }
    const wrong = pick(rng, ['heavy', 'quick', 'guard', 'feint'].filter((m) => m !== d.next));
    d.tell = pick(rng, (d.magicDuel ? MAGIC_TELLS : TELLS)[wrong]); d.tellTrue = false; return;
  }
  // 교활한 상대는 거짓 낌새를 흘린다
  if (rng.chance(STYLES[d.foe.style].trick) && d.next !== 'feint') {
    const fake = pick(rng, ['heavy', 'quick', 'guard'].filter((m) => m !== d.next));
    d.tell = pick(rng, (d.magicDuel ? MAGIC_TELLS : TELLS)[fake]); d.tellTrue = false; return;
  }
  d.tell = pick(rng, (d.magicDuel ? MAGIC_TELLS : TELLS)[d.next] ?? UNREADABLE); d.tellTrue = true;
}

// ---------- 화면에 띄울 사건 ----------
const hpWord = (v, v0) => { const r = v / v0; return r > 0.8 ? '아직 멀쩡하다' : r > 0.55 ? '숨이 거칠다' : r > 0.3 ? '피를 흘리며 비틀거린다' : '한계에 가깝다'; };
const momWord = (m) => (m >= 2 ? ' 기세는 내 쪽이다.' : m <= -2 ? ' 기세가 상대에게 넘어갔다.' : '');

export function availableMoves(g) {
  const d = g.duel;
  const out = ['heavy', 'quick', 'guard', 'feint', 'wait'];
  if (d.mana > 0 && !d.magicDuel) out.push('magic');
  if (rankOf(g) >= 3 && g.player.manaAwakened && g.player.mana >= 40) out.push('aura');
  out.push('yield');
  return out;
}
function moveLabel(g, m) {
  if (g.duel?.magicDuel && MAGIC_LABELS[m]) return MAGIC_LABELS[m];
  const sc = SCHOOLS[schoolOf(g)];
  if (m === 'magic') return `주문을 쏜다 (${d2spell(g)})`;
  return sc?.labels?.[m] ?? MOVES[m].label;
}
const d2spell = (g) => { const c = circleOf(g); return c >= 4 ? '번개' : c >= 3 ? '화염 고리' : c >= 2 ? '얼음 화살' : '불씨 화살'; };

function duelEvent(g, intro) {
  const d = g.duel;
  const moves = availableMoves(g);
  const head = intro ? intro + '\n\n' : '';
  const last = d.log.length ? d.log[d.log.length - 1] + '\n\n' : '';
  const status = `나는 ${hpWord(d.hp, d.hp0)}. ${josa(d.foe.name, '은', '는')} ${hpWord(d.fhp, d.fhp0)}.${momWord(d.mom - d.fmom)}`;
  return {
    id: 'duel_round',
    title: `${d.title} · ${d.round + 1}합`,
    text: `${head}${last}${status}\n\n${d.tell}`,
    choices: moves.map((m) => moveLabel(g, m)),
    choiceIdx: moves.map((m) => MOVE_IDS.indexOf(m)),
  };
}
// 마법사끼리의 겨루기: 같은 심리전, 다른 이름
const MAGIC_LABELS = {
  heavy: '큰 주문을 영창한다 (강공)',
  quick: '짧은 영창으로 끊는다 (속공)',
  guard: '방어 결계를 펼친다 (막기)',
  feint: '가짜 영창으로 속인다 (허초)',
  wait: '마력을 고르며 간을 본다',
};
const MOVE_IDS = ['heavy', 'quick', 'guard', 'feint', 'wait', 'magic', 'aura', 'yield'];

// ---------- 한 합 ----------
function exchange(g, rng, mine) {
  const d = g.duel;
  const theirs = d.next;
  d.round += 1;
  d.history.push(mine);
  const sc = d.magicDuel ? null : schoolOf(g);
  const my = duelSkill(g, d.magicDuel), fs = d.foe.skill;
  const ratio = clamp(Math.pow((my + 10) / (fs + 10), 0.8), 0.35, 2.6);
  const dealt = (m, mult = 1) => {
    let base = MOVES[m].dmg;
    if (m === 'magic') base = 12 + circleOf(g) * 9;
    if (sc === 'ganggeom' && m === 'heavy') base *= 1.3;
    if (sc === 'yusu' && m === 'guard') base *= 1.35;
    if (sc === 'hwanyeong' && m === 'feint') base *= 1.3;
    return base * ratio * (1 + 0.1 * d.mom) * (1 + d.sharp) * mult * rng.float(0.8, 1.2);
  };
  const taken = (m, mult = 1) => {
    let base = MOVES[m].dmg;
    if (m === 'magic') base = 12 + (d.foe.circle ?? 0) * 9;
    return base / ratio * (1 + 0.1 * d.fmom) * mult * rng.float(0.8, 1.2);
  };
  d.sharp = 0;
  if (mine === 'magic') d.mana -= 1;
  if (theirs === 'magic') d.fmana -= 1;
  if (mine === 'aura') { g.player.fatigue = Math.min(100, g.player.fatigue + 8); }
  let line;
  const F = d.foe.name;

  if (mine === 'wait') {
    d.read = 1; d.sharp = 0.2;
    if (theirs === 'feint' || theirs === 'guard' || theirs === 'wait') line = `거리를 두고 숨을 골랐다. ${josa(F, '도', '도')} 섣불리 들어오지 않았다. 상대의 버릇이 조금 보인다.`;
    else { const t = taken(theirs, 0.5); d.hp -= t; line = `물러서며 간을 보았다. ${F}의 ${MOVES[theirs].name}이 몸을 스쳤지만 깊지 않았다. 대신 상대의 호흡을 읽었다.`; }
    d.fmom = Math.min(3, d.fmom + (theirs === 'heavy' || theirs === 'quick' ? 1 : 0)); d.mom = Math.max(-3, d.mom - (theirs === 'heavy' ? 1 : 0));
  } else if (theirs === 'wait') {
    const t = dealt(mine, 0.7); d.fhp -= t; d.mom = Math.min(3, d.mom + 1);
    line = `${josa(F, '이', '가')} 간을 보는 사이 먼저 파고들었다. ${hitLine(rng, mine)}`;
  } else if (beats(mine, theirs)) {
    const t = dealt(mine); d.fhp -= t; d.mom = Math.min(3, d.mom + 1); d.fmom = Math.max(-3, d.fmom - 1);
    line = winLine(rng, mine, theirs, F);
  } else if (beats(theirs, mine)) {
    const t = taken(theirs); d.hp -= t; d.fmom = Math.min(3, d.fmom + 1); d.mom = Math.max(-3, d.mom - 1);
    line = loseLine(rng, mine, theirs, F);
  } else if (mine === theirs) {
    // 같은 수: 실력과 유파로 가린다
    let edge = (my - fs) / 40 + (sc === 'yusu' && mine === 'guard' ? 0.3 : 0);
    if (rng.chance(clamp(0.5 + edge, 0.1, 0.9))) { d.fhp -= dealt(mine, 0.4); d.mom = Math.min(3, d.mom + 1); line = `같은 수가 부딪혔다. 쇳소리 끝에 내 칼이 반 뼘 더 깊었다.`; }
    else { d.hp -= taken(theirs, 0.4); d.fmom = Math.min(3, d.fmom + 1); line = `같은 수가 부딪혔다. ${F}의 칼이 반 박자 빨랐다.`; }
  } else {
    // 서로 맞는다
    d.fhp -= dealt(mine, 0.6); d.hp -= taken(theirs, 0.6);
    line = `서로의 칼이 동시에 살을 스쳤다. ${MOVES[mine].name}과 ${MOVES[theirs].name}의 맞바꿈.`;
  }
  if (d.magicDuel && (beats(mine, theirs) || beats(theirs, mine))) line = magicLine(rng, mine, theirs, F, beats(mine, theirs));
  if (d.tellTrue === false && theirs !== mine) line += ' 아까의 낌새는 미끼였다.';
  d.log.push(line);
}

function magicLine(rng, mine, theirs, F, won) {
  const a = won ? mine : theirs, who = won ? '내' : `${F}의`, target = won ? F : '나';
  const t = {
    heavy: `${who} 긴 영창이 끝까지 이어졌다. 불기둥이 ${josa(target, '을', '를')} 집어삼켰다.`,
    quick: `${who} 짧은 영창이 먼저 닿았다. 얼음 조각이 ${target === '나' ? '내' : F + '의'} 어깨에 박혔다.`,
    guard: `${who} 결계가 주문을 튕겨 냈고, 되튄 마력이 ${josa(target, '을', '를')} 때렸다.`,
    feint: `가짜 영창에 ${target === '나' ? '내가' : josa(F, '이', '가')} 결계를 펼친 사이, 진짜 주문이 옆구리로 파고들었다.`,
    wait: '서로 마력만 고르며 노려보았다.',
  }[a];
  return t ?? `${who} 주문이 닿았다.`;
}
function hitLine(rng, m) {
  return pick(rng, {
    heavy: ['내려친 칼이 어깨를 깊게 짓눌렀다.', '온몸을 실은 일격이 상대를 무릎 꿇렸다.'],
    quick: ['칼끝이 팔뚝을 찌르고 빠졌다.', '짧은 찌르기가 옆구리를 스쳤다.'],
    guard: ['흘려보낸 칼날 위로 받아친 칼이 미끄러져 들어갔다.'],
    feint: ['속임수에 상대의 몸이 열렸다. 그 틈으로 칼이 들어갔다.'],
    magic: ['영창이 끝나자 불꽃이 상대의 가슴팍에서 터졌다.'],
    aura: ['마력을 실은 검이 상대의 칼을 그대로 베고 들어갔다.'],
  }[m] ?? ['칼이 닿았다.']);
}
function winLine(rng, mine, theirs, F) {
  const t = {
    'heavy>guard': `${josa(F, '이', '가')} 막으려 든 칼째로 내려쳤다. 막기가 부서졌다.`,
    'heavy>feint': `${F}의 속임수가 끝나기도 전에 내 일격이 먼저 떨어졌다.`,
    'quick>heavy': `${josa(F, '이', '가')} 크게 휘두르는 사이, 칼끝이 먼저 들어갔다.`,
    'quick>feint': `${josa(F, '이', '가')} 몸을 흔드는 틈에 짧게 찔렀다.`,
    'quick>magic': `영창이 끝나기 전에 거리를 좁혀 찔렀다. 주문이 흩어졌다.`,
    'quick>aura': `검에 마력이 실리기 전에 손목을 쳤다.`,
    'guard>quick': `${F}의 찌르기를 흘려보내고, 그 힘을 그대로 돌려 받아쳤다.`,
    'feint>guard': `왼쪽을 노리는 척하자 ${josa(F, '이', '가')} 막으러 움직였다. 오른쪽이 텅 비었다.`,
    'magic>guard': `${josa(F, '이', '가')} 칼을 세워 막았지만 불꽃은 칼로 막을 수 있는 것이 아니었다.`,
    'magic>feint': `${josa(F, '이', '가')} 속임수를 쓰는 동안 주문이 완성되었다.`,
    'magic>heavy': `${josa(F, '이', '가')} 달려드는 길목에서 주문이 터졌다.`,
    'aura>guard': `마력을 실은 검이 ${F}의 칼을 두 동강 냈다.`,
    'aura>heavy': `정면으로 부딪친 칼끼리, ${F}의 칼만 튕겨 나갔다.`,
    'aura>feint': `속임수 따위는 상관없었다. 검기가 공간째 베었다.`,
    'aura>magic': `검기가 주문을 갈랐다.`,
  }[`${mine}>${theirs}`];
  return t ?? hitLine(rng, mine);
}
function loseLine(rng, mine, theirs, F) {
  const t = {
    'guard>heavy': `막으려 세운 칼 위로 ${F}의 일격이 그대로 떨어졌다. 팔이 저렸다.`,
    'feint>heavy': `속임수를 쓰려는 사이 ${F}의 칼이 먼저 떨어졌다.`,
    'heavy>quick': `크게 휘두르는 사이 ${F}의 칼끝이 먼저 들어왔다.`,
    'feint>quick': `몸을 흔드는 틈에 ${josa(F, '이', '가')} 짧게 찔러 왔다.`,
    'magic>quick': `영창을 끝내기 전에 ${josa(F, '이', '가')} 파고들었다. 주문이 흩어졌다.`,
    'aura>quick': `마력을 모으는 사이 ${josa(F, '이', '가')} 손목을 쳤다.`,
    'quick>guard': `찌른 칼이 흘러가고, ${F}의 받아치기가 어깨를 갈랐다.`,
    'guard>feint': `${josa(F, '이', '가')} 노리는 척한 곳을 막았다. 반대편이 텅 비어 있었다.`,
    'guard>magic': `칼을 세워 막았지만, ${F}의 주문은 칼로 막을 수 있는 것이 아니었다.`,
    'feint>magic': `속임수를 쓰는 동안 ${F}의 주문이 완성되었다.`,
    'heavy>magic': `달려드는 길목에서 ${F}의 주문이 터졌다.`,
  }[`${mine}>${theirs}`];
  return t ?? `${F}의 ${MOVES[theirs].name}이 들어왔다.`;
}

// ---------- 끝 ----------
function finished(g) {
  const d = g.duel;
  const floor = d.lethal ? 0 : 0.25; // 목검·시험은 한 쪽이 결정타를 맞으면 끝
  if (d.hp <= d.hp0 * floor) return 'lose';
  if (d.fhp <= d.fhp0 * floor) return 'win';
  if (d.round >= 12) return d.hp / d.hp0 >= d.fhp / d.fhp0 ? 'win' : 'lose';
  return null;
}

function endDuel(g, rng, result) {
  const d = g.duel;
  g.duel = null;
  const won = result === 'win';
  const s = (g.duelStats ??= { wins: 0, losses: 0 });
  if (won) s.wins += 1; else s.losses += 1;
  // 결투에서 배운다: 강한 상대일수록 많이
  const gain = (won ? 1.4 : 1.0) * (0.6 + d.foe.skill / 50);
  const p = g.player;
  p.skills.sword = Math.min(100, p.skills.sword + 0.3 * gain * (1 - p.skills.sword / 120));
  p.fatigue = Math.min(100, p.fatigue + 12);
  const hurt = d.hp < d.hp0 * 0.45;
  if (hurt && !won && rng.chance(d.lethal ? 0.9 : 0.35)) p.injuries.push({ name: d.lethal ? `${d.foe.name}의 칼에 깊이 베인 상처` : '결투에서 얻은 멍과 찰과상', months: d.lethal ? 4 : 1 });
  const fn = ENDS[d.kind];
  const extra = fn ? fn(g, rng, won, d, result) : '';
  const head = result === 'yield'
    ? `검을 내렸다. ${josa(d.foe.name, '이', '가')} 고개를 끄덕였다.`
    : won ? `${d.log[d.log.length - 1]} ${josa(d.foe.name, '이', '가')} 무릎을 꿇었다.` : `${d.log[d.log.length - 1]} 더는 검을 들 수 없었다.`;
  const text = [head, extra].filter(Boolean).join(' ');
  g.chronicle.push({ y: g.date.year, m: g.date.month, text: `${d.title}: ${d.foe.name}와(과) 겨뤄 ${won ? '이겼다' : '졌다'}.`, rel: 100 });
  me(g).history.push({ y: g.date.year, m: g.date.month, text: `${d.title}. ${d.foe.name}와(과) 겨뤄 ${won ? '이겼다' : '졌다'}.` });
  return text;
}

// 사건 목록에 결투 자리를 만든다 (조건은 늘 거짓, 결투 중에만 직접 세운다)
EVENTS.push({
  id: 'duel_round', once: true, noFlag: true, quiet: true,
  cond: () => false, weight: 0, title: '결투', text: () => '',
  choices: MOVE_IDS.map((m) => ({
    label: MOVES[m].label,
    run: (g, rng) => {
      if (!g.duel) return '';
      if (m === 'yield') return endDuel(g, rng, 'yield');
      exchange(g, rng, m);
      const r = finished(g);
      if (r) return endDuel(g, rng, r);
      planFoe(g, rng);
      g.pendingEvent = duelEvent(g);
      return g.duel.log[g.duel.log.length - 1];
    },
  })),
});
// 행동에서 예약한 결투를 달 끝에 띄운다
EVENTS.push({
  id: 'duel_start', once: true, noFlag: true, quiet: true,
  cond: (g) => !!g.duelQueued, weight: 99,
  title: '결투', text: (g) => g.duelQueued.intro ?? `${g.duelQueued.foe.name}와(과) 마주 섰다.`,
  choices: [
    { label: '검을 든다', run: (g, rng) => { const o = g.duelQueued; g.duelQueued = null; startDuel(g, rng, { ...o, intro: null }); return `${josa(o.foe.name, '이', '가')} 자세를 잡았다.`; } },
    { label: '물러난다', run: (g) => { const o = g.duelQueued; g.duelQueued = null; const fn = ENDS[o.kind + ':decline']; return fn ? fn(g, o) : '검을 뽑지 않고 돌아섰다.'; } },
  ],
});

// 불러온 저장에서 결투가 어긋났으면 정리
import { HOOKS } from '../hooks.js';
HOOKS.migrate.push((g) => { if (g.duel && g.pendingEvent?.id !== 'duel_round') g.duel = null; });
