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
import { schoolOf, rankOf, SCHOOLS, formMul, formFor, bladeSpell } from './schools.js';
import { J } from '../narrative/text.js';
import { ENDS, registerDuelEnd, queueDuel } from './registry.js';
import { TRAITS, traitFor, HABITS, HABIT_IDS, habitMove, VENUES, venueFor, beatLine, cheerLine, sayLine, PARTS, partFor, CRIT, CRIT_TELLS, END_WORDS } from './show.js';
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
  // 결정적 순간에만 (46단계)
  finish: { name: '결정타', label: '끝낸다 (온 힘으로 벤다)', dmg: 0 },
  disarm: { name: '칼 떨구기', label: '칼을 쳐서 떨군다 (살려 둔다)', dmg: 0 },
  dodge: { name: '몸 던지기', label: '몸을 던져 피한다', dmg: 0 },
  block: { name: '받아내기', label: '칼로 정면에서 받아낸다', dmg: 0 },
};
export const MAX_ROUND = 12;
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
  v += SCHOOLS[schoolOf(g)]?.bare ? 3 : (g.life?.gear?.weapon ?? 0) * 0.4; // 맨손 유파는 무기에 기대지 않는다
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
  foe.trait = traitFor(rng, foe);
  if (!HABITS[foe.habit]) foe.habit = pick(rng, HABIT_IDS);
  const venue = venueFor(opts.kind, opts);
  g.duel = {
    kind: opts.kind ?? 'spar', title: opts.title ?? '결투', lethal: !!opts.lethal, ctx: opts.ctx ?? {}, magicDuel: opts.mode === 'magic',
    foe, hp, hp0: hp, fhp, fhp0: fhp, round: 0, mom: 0, fmom: 0, history: [],
    sharp: 0, read: 0, mana: Math.min(5, circleOf(g)) + (circleOf(g) > 0 ? (g.sword?.blade ?? 0) : 0), secretUsed: false, fmana: foe.circle ?? 0, log: [],
    next: null, tell: null,
    venue, last: null, crit: null, crits: 0, wounds: { me: [], foe: [] }, habitKnown: false, seen: [], said: [], beat: '', say: '', cheer: '',
  };
  const d = g.duel;
  d.beat = pick(rng, VENUES[venue].open);
  d.say = sayLine(rng, d, 'open');
  planFoe(g, rng);
  g.pendingEvent = duelEvent(g, opts.intro);
  return g.pendingEvent;
}

// 상대의 다음 수 정하기 + 낌새
function planFoe(g, rng) {
  const d = g.duel;
  const st = STYLES[d.foe.style];
  const tr = TRAITS[d.foe.trait] ?? {};
  const w = { ...st.w };
  for (const [k, v] of Object.entries(tr.w ?? {})) w[k] = (w[k] ?? 1) * v;
  // 결정적 순간: 기세가 한쪽으로 크게 기울면, 다음 합은 둘 중 하나를 고르는 순간이 된다 (한 결투에 두 번까지, 마법 겨루기는 없음)
  d.crit = null;
  if (!d.magicDuel && d.round >= 2) {
    if (!(d.critSides ?? []).includes('me') && d.mom - d.fmom >= 4 && d.fhp < d.fhp0 * 0.5) { d.crit = { side: 'me' }; d.crits += 1; (d.critSides ??= []).push('me'); d.next = null; d.tell = CRIT.me.text(d); d.tellTrue = true; return; }
    if (!(d.critSides ?? []).includes('foe') && d.fmom - d.mom >= 4 && d.hp > d.hp0 * 0.3) {
      (d.critSides ??= []).push('foe');
      const right = rng.chance(0.5) ? 'dodge' : 'block';
      const rel = clamp(0.4 + (g.player.stats.sen - d.foe.skill * 0.4) / 80 + (d.habitKnown ? 0.15 : 0), 0.2, 0.9);
      const seen = rng.chance(rel) ? right : rng.chance(0.5) ? (right === 'dodge' ? 'block' : 'dodge') : null;
      d.crit = { side: 'foe', right }; d.crits += 1; d.next = 'heavy';
      d.critTell = seen ? CRIT_TELLS[seen] : '어느 쪽으로 올지 읽을 수 없다.';
      d.tell = CRIT.foe.text(d); d.tellTrue = seen ? seen === right : null; return;
    }
  }
  d.habitUsed = false;
  if (d.fmana > 0) w.magic = 2.2;
  if (d.foe.aura) w.aura = 1.2;
  // 실력 있는 상대는 내 버릇을 읽는다: 최근 내가 자주 쓴 수를 이기는 수를 고른다
  const recent = d.history.slice(-3);
  if (recent.length >= 2) {
    const count = {};
    for (const m of recent) count[m] = (count[m] ?? 0) + 1;
    const [fav, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    const adapt = clamp(0.3 + d.foe.skill / 150 + (tr.adapt ?? 0), 0.3, 0.85) * (n >= 3 ? 1.2 : n >= 2 ? 1 : 0.5) * (SCHOOLS[schoolOf(g)]?.adapt ?? 1);
    if (fav !== 'wait' && rng.chance(adapt)) {
      const counters = Object.keys(BEATS).filter((m) => BEATS[m].includes(fav) && (w[m] ?? 0) > 0);
      if (counters.length) { d.next = pick(rng, counters); return tellFor(g, rng); }
    }
  }
  // 버릇: 그 때가 오면 상대는 자주 같은 수를 낸다 (내 버릇을 읽어 받아치는 것이 먼저)
  const hm = habitMove(d);
  if (hm && hm !== 'wait' && (w[hm] ?? 0) > 0 && rng.chance(0.5)) { d.next = hm; d.habitUsed = true; return tellFor(g, rng); }
  if (d.fhp < d.fhp0 * 0.3) { w.guard = (w.guard ?? 1) * 1.6; } // 몰리면 몸을 사린다
  if (d.fmom >= 2) { w.heavy = (w.heavy ?? 1) * 1.5; }        // 기세를 타면 몰아친다
  d.next = rng.weighted(Object.keys(w), (k) => w[k]);
  tellFor(g, rng);
}
function tellFor(g, rng) {
  const d = g.duel;
  const sen = g.player.stats.sen;
  let rel = 0.32 + (sen - d.foe.skill * 0.4) / 70 + d.read * 0.25 + (rankOf(g) >= 2 ? 0.1 : 0) + (d.habitKnown ? 0.1 : 0);
  rel = clamp(rel, 0.15, 0.95);
  d.read = 0;
  // 알아챈 버릇이 나오면 또렷하다
  if (d.habitKnown && d.habitUsed) { d.tell = `버릇이 나온다. ${HABITS[d.foe.habit].name}. ${pick(rng, (d.magicDuel ? MAGIC_TELLS : TELLS)[d.next] ?? UNREADABLE)}`; d.tellTrue = true; return; }
  if (!rng.chance(rel)) {
    // 못 읽었다: 아무것도 안 보이거나, 잘못 읽는다
    if (rng.chance(0.5)) { d.tell = pick(rng, UNREADABLE); d.tellTrue = null; return; }
    const wrong = pick(rng, ['heavy', 'quick', 'guard', 'feint'].filter((m) => m !== d.next));
    d.tell = pick(rng, (d.magicDuel ? MAGIC_TELLS : TELLS)[wrong]); d.tellTrue = false; return;
  }
  // 교활한 상대는 거짓 낌새를 흘린다
  if (rng.chance(STYLES[d.foe.style].trick + (TRAITS[d.foe.trait]?.trick ?? 0)) && d.next !== 'feint') {
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
  if (d.crit) return [...CRIT[d.crit.side].moves];
  const out = ['heavy', 'quick', 'guard', 'feint', 'wait'];
  if (d.mana > 0 && !d.magicDuel) out.push('magic');
  // 검기: 검성 이상에 마력이 있거나, 검기를 몸에 붙인 사람은 의지만으로도 (드물다)
  if (rankOf(g) >= 3 && ((g.player.manaAwakened && g.player.mana >= 40) || ((g.sword?.aura ?? 0) >= 2 && g.player.stats.wil >= 80))) out.push('aura');
  out.push('yield');
  return out;
}
function moveLabel(g, m) {
  if (g.duel?.magicDuel && MAGIC_LABELS[m]) return MAGIC_LABELS[m];
  const sc = SCHOOLS[schoolOf(g)];
  if (m === 'magic') {
    const bs = (g.sword?.blade ?? 0) >= 1 ? bladeSpell(g) : null;
    return bs ? `칼에 ${J(bs.name, '을/를')} 싣는다 (마검)` : `주문을 쏜다 (${d2spell(g)})`;
  }
  const f = formFor(g, m);
  if (f) return `${f.name} (${MOVES[m].name})`;
  return sc?.labels?.[m] ?? MOVES[m].label;
}
const d2spell = (g) => { const c = circleOf(g); return c >= 4 ? '번개' : c >= 3 ? '화염 고리' : c >= 2 ? '얼음 화살' : '불씨 화살'; };

function duelEvent(g, intro) {
  const d = g.duel;
  const moves = availableMoves(g);
  const head = intro ? intro + '\n\n' : '';
  const last = d.log.length ? d.log[d.log.length - 1] + '\n\n' : '';
  const status = `나는 ${hpWord(d.hp, d.hp0)}. ${josa(d.foe.name, '은', '는')} ${hpWord(d.fhp, d.fhp0)}.${momWord(d.mom - d.fmom)}`;
  const scene = [d.cheer, d.say, d.beat].filter(Boolean).join(' ');
  d.view = viewOf(g);
  return {
    id: 'duel_round',
    title: d.crit ? `${d.title} · 결정적 순간` : `${d.title} · ${d.round + 1}합`,
    text: `${head}${last}${scene ? scene + '\n\n' : ''}${status}\n\n${d.tell}`,
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
export const MOVE_IDS = ['heavy', 'quick', 'guard', 'feint', 'wait', 'magic', 'aura', 'yield', 'finish', 'disarm', 'dodge', 'block'];

// ---------- 한 합 ----------
function exchange(g, rng, mine) {
  const d = g.duel;
  const theirs = d.next;
  d.round += 1;
  d.history.push(mine);
  const sc = d.magicDuel ? null : schoolOf(g);
  const my = duelSkill(g, d.magicDuel), fs = d.foe.skill;
  const ratio = clamp(Math.pow((my + 10) / (fs + 10), 0.8), 0.35, 2.6);
  const late = 1 + Math.max(0, d.round - 5) * 0.05; // 합이 길어지면 둘 다 지쳐 한 번 맞으면 크다
  const hp1 = d.hp, fhp1 = d.fhp, mom1 = d.mom - d.fmom;
  const dealt = (m, mult = 1) => {
    let base = MOVES[m].dmg;
    if (m === 'magic') base = 12 + circleOf(g) * 9 + (d.magicDuel ? 0 : (g.sword?.blade ?? 0) * 6);
    if (m === 'aura') base += Math.max(0, (g.sword?.aura ?? 0) - 1) * 6;
    if (sc) base *= (SCHOOLS[sc]?.sig?.[m] ?? 1) * formMul(g, m);
    return base * ratio * (1 + 0.1 * d.mom) * (1 + d.sharp) * mult * late * (1 - 0.06 * d.wounds.me.length) * rng.float(0.8, 1.2);
  };
  const taken = (m, mult = 1) => {
    let base = MOVES[m].dmg;
    if (m === 'magic') base = 12 + (d.foe.circle ?? 0) * 9;
    return base / ratio * (1 + 0.1 * d.fmom) * mult * late * (1 - 0.06 * d.wounds.foe.length) * rng.float(0.8, 1.2);
  };
  d.sharp = 0;
  if (mine === 'magic') d.mana -= 1;
  if (theirs === 'magic') d.fmana -= 1;
  if (mine === 'aura') { g.player.fatigue = Math.min(100, g.player.fatigue + 8); }
  let line;
  const F = d.foe.name;

  // 마검: 칼에 실은 주문은 찌르기에 끊기지 않는다 (서로 맞는다)
  const bladeHold = !d.magicDuel && mine === 'magic' && theirs === 'quick' && (g.sword?.blade ?? 0) >= 1;
  if (mine === 'wait') {
    d.read = 1; d.sharp = 0.2 + (sc ? formMul(g, 'wait') - 1 : 0);
    const heal = sc ? SCHOOLS[sc]?.waitHeal ?? 0 : 0;
    if (heal) d.hp = Math.min(d.hp0, d.hp + heal);
    if (theirs === 'feint' || theirs === 'guard' || theirs === 'wait') line = `거리를 두고 숨을 골랐다. ${josa(F, '도', '도')} 섣불리 들어오지 않았다. 상대의 버릇이 조금 보인다.`;
    else { const t = taken(theirs, 0.5); d.hp -= t; line = `물러서며 간을 보았다. ${F}의 ${MOVES[theirs].name}이 몸을 스쳤지만 깊지 않았다. 대신 상대의 호흡을 읽었다.`; }
    d.fmom = Math.min(3, d.fmom + (theirs === 'heavy' || theirs === 'quick' ? 1 : 0)); d.mom = Math.max(-3, d.mom - (theirs === 'heavy' ? 1 : 0));
  } else if (theirs === 'wait') {
    const t = dealt(mine, 0.7); d.fhp -= t; d.mom = Math.min(3, d.mom + 1);
    line = `${josa(F, '이', '가')} 간을 보는 사이 먼저 파고들었다. ${hitLine(rng, mine)}`;
  } else if (beats(mine, theirs)) {
    // 비전: 기세를 탄 채 그 유파의 수로 이기면, 한 결투에 한 번
    const sec = sc && g.sword?.secret ? SCHOOLS[sc]?.secret : null;
    const fire = sec && sec.move === mine && d.mom >= 2 && !d.secretUsed;
    const t = dealt(mine, fire ? 1.7 : 1); d.fhp -= t; d.mom = Math.min(3, d.mom + 1); d.fmom = Math.max(-3, d.fmom - 1);
    line = winLine(rng, mine, theirs, F);
    if (fire) { d.secretUsed = true; line = `비전, ${sec.name}. ${sec.desc} ${line}`; }
  } else if (beats(theirs, mine) && !bladeHold) {
    const t = taken(theirs); d.hp -= t; d.fmom = Math.min(3, d.fmom + 1); d.mom = Math.max(-3, d.mom - 1);
    line = loseLine(rng, mine, theirs, F);
  } else if (mine === theirs) {
    // 같은 수: 실력과 유파로 가린다
    let edge = (my - fs) / 40 + ((SCHOOLS[sc]?.sig?.[mine] ?? 1) > 1 ? 0.3 : 0);
    if (rng.chance(clamp(0.5 + edge, 0.1, 0.9))) { d.fhp -= dealt(mine, 0.4); d.mom = Math.min(3, d.mom + 1); line = `같은 수가 부딪혔다. 쇳소리 끝에 내 칼이 반 뼘 더 깊었다.`; }
    else { d.hp -= taken(theirs, 0.4); d.fmom = Math.min(3, d.fmom + 1); line = `같은 수가 부딪혔다. ${F}의 칼이 반 박자 빨랐다.`; }
  } else {
    // 서로 맞는다
    d.fhp -= dealt(mine, 0.6); d.hp -= taken(theirs, 0.6);
    line = `서로의 칼이 동시에 살을 스쳤다. ${MOVES[mine].name}과 ${MOVES[theirs].name}의 맞바꿈.`;
  }
  if (d.magicDuel && (beats(mine, theirs) || beats(theirs, mine))) line = magicLine(rng, mine, theirs, F, beats(mine, theirs));
  if (d.tellTrue === false && theirs !== mine) line += ' 아까의 낌새는 미끼였다.';
  // 간을 보면 상대의 버릇이 보인다
  if (mine === 'wait' && !d.habitKnown && rng.chance(0.45 + g.player.stats.sen / 250)) { d.habitKnown = true; line += ` 버릇 하나가 눈에 들어왔다. ${HABITS[d.foe.habit].name}.`; }
  line += afterHit(g, rng, mine, theirs, hp1 - d.hp, fhp1 - d.fhp, mom1);
  d.log.push(line);
}

// 한 합의 뒤끝: 부위 상처, 지난 합 기록, 관중과 대사, 합 사이 장면
function afterHit(g, rng, mine, theirs, dm, df, mom1) {
  const d = g.duel;
  let extra = '', part = null, partWho = null;
  if (dm > d.hp0 * 0.14 && d.wounds.me.length < 3) {
    part = partFor(rng, theirs); partWho = 'me';
    if (!d.wounds.me.includes(part)) { d.wounds.me.push(part); extra += ` ${PARTS[part].me}`; }
  } else if (df > d.fhp0 * 0.14 && d.wounds.foe.length < 3) {
    part = partFor(rng, mine); partWho = 'foe';
    if (!d.wounds.foe.includes(part)) { d.wounds.foe.push(part); extra += ` ${PARTS[part].foe(d.foe.name)}`; }
  }
  const result = mine === 'wait' ? 'read' : df > dm * 1.5 ? 'win' : dm > df * 1.5 ? 'lose' : df > 0 && dm > 0 ? 'trade' : 'even';
  d.last = { mine, theirs, result, dm: Math.round(dm), df: Math.round(df), part, partWho };
  const swing = d.mom - d.fmom;
  d.cheer = (Math.sign(swing) !== Math.sign(mom1) && swing !== 0) || df > d.fhp0 * 0.18 || dm > d.hp0 * 0.18 ? cheerLine(rng, d) : '';
  d.say = result === 'win' && d.said.length < 3 && rng.chance(0.5) ? sayLine(rng, d, 'hit') : d.fmom - d.mom >= 2 && rng.chance(0.4) ? sayLine(rng, d, 'ahead') : '';
  d.beat = rng.chance(0.7) ? beatLine(rng, d) : '';
  return extra;
}

// 결정적 순간을 고른 합
function critExchange(g, rng, m) {
  const d = g.duel, F = d.foe.name;
  const my = duelSkill(g, false), fs = d.foe.skill;
  const ratio = clamp(Math.pow((my + 10) / (fs + 10), 0.8), 0.35, 2.6);
  const side = d.crit.side, right = d.crit.right;
  d.crit = null; d.round += 1; d.history.push(m);
  const hp1 = d.hp, fhp1 = d.fhp, mom1 = d.mom - d.fmom;
  let line;
  if (m === 'finish') {
    if (rng.chance(clamp(0.45 + (ratio - 1) * 0.6 + d.mom * 0.05, 0.15, 0.92))) {
      d.fhp -= (30 + d.fhp0 * 0.35) * ratio * rng.float(0.9, 1.15); d.mom = 3;
      line = `숨을 멈추고 온몸을 실었다. 칼이 ${F}의 막기를 부수고 들어갔다.`;
    } else {
      d.hp -= 10 / ratio * rng.float(0.8, 1.2); d.mom = Math.max(0, d.mom - 2); d.fmom = Math.max(0, d.fmom);
      line = `온 힘을 실은 일격이 허공을 갈랐다. ${J(F, '이/가')} 마지막 힘으로 몸을 비틀어 빠져나갔다.`;
    }
  } else if (m === 'disarm') {
    if (rng.chance(clamp(0.3 + (ratio - 1) * 0.6 + g.player.stats.sen / 300, 0.1, 0.85))) {
      d.forced = 'disarm';
      line = `칼등으로 ${F}의 손목을 쳤다.`;
    } else {
      d.hp -= 9 / ratio * rng.float(0.8, 1.2); d.mom = Math.max(-3, d.mom - 2);
      line = `손목을 노렸지만 ${J(F, '이/가')} 칼을 놓지 않았다. 되돌아온 칼끝이 나를 스쳤다.`;
    }
  } else if (m === right && rng.chance(clamp(0.7 + (ratio - 1) * 0.4, 0.35, 0.95))) {
    d.fhp -= 16 * ratio * rng.float(0.9, 1.2); d.fmom = 0; d.mom = Math.min(3, d.mom + 1);
    line = m === 'dodge' ? `몸을 옆으로 던졌다. ${F}의 칼이 땅을 찍었고, 그 틈에 옆구리를 베었다.` : `두 손으로 칼을 받쳐 정면에서 받아냈다. 팔이 울렸지만 버텼다. 밀려난 ${F}에게 칼끝을 되돌려 주었다.`;
  } else {
    d.hp -= 24 / ratio * rng.float(0.9, 1.2); d.fmom = 2; d.mom = Math.max(-3, d.mom - 1);
    line = m === 'dodge' ? `피하려 몸을 던졌지만 ${F}의 칼은 이미 그쪽에 와 있었다.` : `칼을 세워 받았지만 무게가 달랐다. 받친 칼째로 밀려 넘어졌다.`;
  }
  line += afterHit(g, rng, side === 'me' ? 'heavy' : m, side === 'me' ? 'quick' : 'heavy', hp1 - d.hp, fhp1 - d.fhp, mom1);
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
function finished(g, rng) {
  const d = g.duel;
  const floor = d.lethal ? 0 : 0.25; // 목검·시험은 한 쪽이 결정타를 맞으면 끝
  if (d.forced) { d.endKind = d.forced; return 'win'; }
  if (d.hp <= d.hp0 * floor) { d.endKind = d.lethal ? 'lose_fall' : d.wounds.me.some((w) => w === 'arm' || w === 'shoulder') && rng.chance(0.5) ? 'lose_disarm' : 'lose'; return 'lose'; }
  if (d.fhp <= d.fhp0 * floor) { d.endKind = d.lethal ? 'fall' : d.last?.mine === 'guard' && rng.chance(0.4) ? 'disarm' : 'kneel'; return 'win'; }
  // 자존심 없는 상대는 크게 밀리면 스스로 물러선다
  if (!d.lethal && d.foe.trait !== 'proud' && d.fhp < d.fhp0 * 0.35 && d.mom - d.fmom >= 2 && rng.chance(0.2)) { d.endKind = 'retreat'; return 'win'; }
  // 합이 길어지면 판가름: 여덟 합이 넘고 차이가 뚜렷하면, 열두 합이면 무조건
  const gap = d.hp / d.hp0 - d.fhp / d.fhp0;
  if ((d.round >= 8 && Math.abs(gap) >= 0.3) || d.round >= MAX_ROUND) { const w = gap >= 0; d.endKind = w ? 'judged' : 'lose_judged'; return w ? 'win' : 'lose'; }
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
  const wp = d.wounds.me[d.wounds.me.length - 1];
  if (hurt && !won && rng.chance(d.lethal ? 0.9 : 0.35)) p.injuries.push({ name: d.lethal ? (wp ? `${d.foe.name}의 칼에 베인 ${PARTS[wp].name}` : `${d.foe.name}의 칼에 깊이 베인 상처`) : '결투에서 얻은 멍과 찰과상', months: d.lethal ? 4 : 1 });
  if (d.lethal && d.wounds.me.includes('face')) me(g).history.push({ y: g.date.year, m: g.date.month, text: `${J(d.foe.name, '과/와')}의 결투에서 얼굴에 흉터가 남았다.` });
  const fn = ENDS[d.kind];
  const extra = fn ? fn(g, rng, won, d, result) : '';
  const kind = result === 'yield' ? 'yield' : d.endKind ?? (won ? 'kneel' : 'lose');
  const head = result === 'yield'
    ? `검을 내렸다. ${josa(d.foe.name, '이', '가')} 고개를 끄덕였다.`
    : `${d.log[d.log.length - 1]} ${(END_WORDS[kind] ?? END_WORDS[won ? 'kneel' : 'lose'])(d.foe.name)}`;
  // 끝 요약 카드와 그림이 읽는다 (다음 결투가 시작될 때까지 남는다)
  g.lastDuel = {
    foe: d.foe.name, title: d.title, rounds: d.round, hp: Math.max(0, Math.round(d.hp)), hp0: Math.round(d.hp0), fhp: Math.max(0, Math.round(d.fhp)), fhp0: Math.round(d.fhp0),
    end: result, endKind: kind, won, venue: VENUES[d.venue]?.name ?? '', trait: TRAITS[d.foe.trait]?.name ?? '', habit: d.habitKnown ? HABITS[d.foe.habit]?.name ?? null : null,
    wounds: d.wounds.me.map((w) => PARTS[w].name), foeWounds: d.wounds.foe.map((w) => PARTS[w].name), history: [...d.history], y: g.date.year, m: g.date.month,
  };
  const text = [head, extra].filter(Boolean).join(' ');
  g.chronicle.push({ y: g.date.year, m: g.date.month, text: `${d.title}: ${J(d.foe.name, '과/와')} 겨뤄 ${won ? '이겼다' : '졌다'}.`, rel: 100 });
  me(g).history.push({ y: g.date.year, m: g.date.month, text: `${d.title}. ${J(d.foe.name, '과/와')} 겨뤄 ${won ? '이겼다' : '졌다'}.` });
  return text;
}

// ---------- 화면과 그림이 읽는 모양 ----------
const MOVE_HINT = {
  heavy: '막기와 허초를 부순다. 속공에 진다', quick: '강공과 허초를 끊는다. 막기에 진다', guard: '속공을 흘리고 크게 받아친다', feint: '막기를 속인다. 가장 크게 벤다',
  wait: '공격하지 않고 낌새와 버릇을 읽는다', magic: '막기와 허초, 강공을 이긴다. 속공에 끊긴다', aura: '속공 말고는 다 이긴다', yield: '결투를 그만둔다',
  finish: '성공하면 끝난다. 빗나가면 기세를 잃는다', disarm: '칼만 떨군다. 이기면 상대를 살린다', dodge: '높이 내려치는 칼이면 산다', block: '낮게 파고드는 칼이면 산다',
};
function viewOf(g) {
  const d = g.duel;
  const moves = availableMoves(g);
  return {
    round: d.round + 1, maxRound: MAX_ROUND, place: VENUES[d.venue]?.name ?? null, venue: d.venue, crowd: VENUES[d.venue]?.crowd ?? 0,
    me: { name: g.player.name, hp: Math.max(0, Math.round(d.hp)), hp0: Math.round(d.hp0), word: hpWord(d.hp, d.hp0), wounds: d.wounds.me.map((w) => PARTS[w].name) },
    foe: { name: d.foe.name, hp: Math.max(0, Math.round(d.fhp)), hp0: Math.round(d.fhp0), word: hpWord(d.fhp, d.fhp0), style: STYLES[d.foe.style]?.name ?? null, trait: TRAITS[d.foe.trait]?.name ?? null,
      habit: d.habitKnown ? HABITS[d.foe.habit]?.name ?? null : null, line: d.say || null, wounds: d.wounds.foe.map((w) => PARTS[w].name), school: d.foe.school ?? null },
    mom: clamp(d.mom - d.fmom, -3, 3), intro: d.round === 0 ? d.beat || null : null, beat: d.round > 0 ? d.beat || null : null, cheer: d.cheer || null,
    last: d.log.length ? d.log[d.log.length - 1] : null, lastMoves: d.last, tell: d.tell,
    moves: moves.map((m) => ({ id: m, label: moveLabel(g, m), hint: MOVE_HINT[m] ?? null })),
    crux: !!d.crit, cruxSide: d.crit?.side ?? null, magic: !!d.magicDuel,
  };
}
/** 결투 화면용 (결투 중이 아니면 null) */
export function duelView(g) {
  if (!g?.duel) return null;
  return g.duel.view ?? viewOf(g);
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
      if (g.duel.crit) critExchange(g, rng, CRIT[g.duel.crit.side].moves.includes(m) ? m : CRIT[g.duel.crit.side].moves[0]);
      else if (['finish', 'disarm', 'dodge', 'block'].includes(m)) exchange(g, rng, 'heavy');
      else exchange(g, rng, m);
      const r = finished(g, rng);
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
  title: '결투', text: (g) => g.duelQueued.intro ?? `${J(g.duelQueued.foe.name, '과/와')} 마주 섰다.`,
  choices: [
    { label: '검을 든다', run: (g, rng) => { const o = g.duelQueued; g.duelQueued = null; startDuel(g, rng, { ...o, intro: null }); return `${josa(o.foe.name, '이', '가')} 자세를 잡았다.`; } },
    { label: '물러난다', run: (g) => { const o = g.duelQueued; g.duelQueued = null; const fn = ENDS[o.kind + ':decline']; return fn ? fn(g, o) : '검을 뽑지 않고 돌아섰다.'; } },
  ],
});

// 불러온 저장에서 결투가 어긋났으면 정리
import { HOOKS } from '../hooks.js';
HOOKS.migrate.push((g) => { if (g.duel && g.pendingEvent?.id !== 'duel_round') g.duel = null; });
