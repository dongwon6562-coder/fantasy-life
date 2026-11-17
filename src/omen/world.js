// 세상의 징조와 예언: 큰일이 다가오면 하늘과 땅에 징조가 먼저 보이고(아무 일도 앞서지 않는 헛징조도 섞인다),
// 그 일이 오면 사람들이 징조를 떠올린다. 예언은 봉인·왕실·시대의 흐름에 따라 믿음이 오르내리고, 세력들이 저마다 끌어다 쓴다.
// 제 주사위를 따로 쓴다.
import { WORLD_TICKS, ERA_AT, rulerName, monthIndex } from '../world.js';
import { makeRng } from '../rng.js';
import { chron } from '../adventure/core.js';
import { CR, CRISES } from '../crisis/core.js';
import { SS, STAGES, stageOf, sealPower } from '../seal/state.js';
import { NS, BREADBASKET } from '../nature/state.js';
import { OS, SIGNS, SIGN_IDS, PROPHECIES, clamp, mi, olog, pending } from './state.js';

// 큰일마다: 지금 다가오고 있나(cond), 그 일이 왔나(test), 언제까지 기다리나(due, 달)
const avgCrop = (g) => { const N = NS(g); return BREADBASKET.reduce((a, r) => a + (N.crop?.[r] ?? 1), 0) / BREADBASKET.length; };
const crisisOdds = (g) => Object.values(CRISES).reduce((a, D) => a + (D.trigger?.(g) ?? 0), 0);
export const PRE = {
  king: {
    cond: (g) => g.realm.ruler === 'oswald' && g.realm.king.alive && g.realm.king.health < 14,
    snap: (g) => ({ ruler: g.realm.ruler, alive: g.realm.king.alive }), test: (g, s) => g.realm.ruler !== s.snap.ruler || (s.snap.alive && !g.realm.king.alive), due: [6, 24],
  },
  war: { cond: (g) => !g.realm.balhart.war && g.realm.balhart.tension >= 85, test: (g) => !!g.realm.balhart.war, due: [6, 24] },
  north: { cond: (g) => !g.realm.north.fallen && !g.realm.north.war && g.realm.north.garbes >= 76, test: (g) => !!g.realm.north.war, due: [8, 30] },
  seal: {
    cond: (g) => { const p = sealPower(g), st = stageOf(p); return st + 1 < STAGES.length && !SS(g).ending && p - STAGES[st + 1].at < 1.2; },
    snap: (g) => ({ stage: stageOf(sealPower(g)) }), test: (g, s) => stageOf(sealPower(g)) > s.snap.stage, due: [6, 24],
  },
  crisis: { cond: (g) => { const c = CR(g); return !c.active && c.calm - monthIndex(g) <= 2 && crisisOdds(g) >= 0.03; }, test: (g) => !!CR(g).active, due: [4, 18] },
  famine: { cond: (g) => [7, 8, 9].includes(g.date.month) && !g.world?.famine && avgCrop(g) < 0.86, test: (g) => !!g.world?.famine, due: [2, 5] },
  era: { cond: (g) => { const r = g.realm, nx = ERA_AT[r.era + 1]; return nx != null && nx - r.tech < 0.05; }, snap: (g) => ({ era: g.realm.era }), test: (g, s) => g.realm.era > s.snap.era, due: [6, 20] },
};

export function addSign(g, kind, rng, pre, say = () => {}) {
  const O = OS(g), K = SIGNS[kind], P = PRE[kind];
  if (!K || O.signs.some((s) => s.kind === kind && !s.end)) return null;
  const [short, text] = rng.pick(K.texts);
  const now = mi(g);
  const s = { id: O.seq++, kind, short, text, pre: !!pre, start: now, due: now + rng.int(P.due[0], P.due[1]), snap: P.snap?.(g) ?? {}, read: false, judged: null, preached: false, end: null, endAt: 0 };
  O.signs.push(s);
  say(text, false);
  if (kind === 'era') comet(g, say, false);
  olog(g, `징조: ${short}.`);
  return s;
}

// 꼬리별: 시대를 앞서는 징조로 뜨기도 하고, 아무 일 없이 지나가기도 한다. 그해에 난 아이는 예언 속 사람이 될 수 있다.
export function comet(g, say = () => {}, loud = true) {
  const O = OS(g);
  if (O.comets.includes(g.date.year)) return;
  O.comets.push(g.date.year);
  if (O.comets.length > 12) O.comets.shift();
  const P = O.prophecies.star;
  P.belief = clamp(P.belief + 15, 0, 100);
  if (P.status === 'whisper') P.status = 'spread';
  if (loud) say('북쪽 하늘에 꼬리 긴 별이 떴다. 장터마다 꼬리별의 예언을 읊는 사람이 나왔다. 올해 아이를 낳는 집들은 기뻐해야 할지 두려워해야 할지 모른다.', true);
  chron(g, '꼬리별이 북쪽 하늘에 뜨다.', 55);
}

const CLAIM = {
  rudolf: ['귀족파 사람들이 장터에서 사자 왕관의 예언을 읊는다. 동쪽 별을 등진 쪽이 루돌프 왕자라고 한다. 왕자의 궁이 동쪽에 있다는 것이다.', 4],
  erik: ['기사단 쪽에서 사자 왕관의 예언을 다르게 푼다. 에릭 왕자가 동쪽 국경에서 싸웠으니 동쪽 별을 등진 쪽은 그라고 한다.', -4],
};

WORLD_TICKS.push((g, worldRng, say) => {
  if (!g.realm || !g.omen) return;
  const O = g.omen, r = g.realm, now = mi(g);
  const rng = makeRng({ s: ((g.rngState?.s ?? 29) ^ Math.imul(now + 53, 2246822519)) | 0 });

  // 기다리던 징조: 그 일이 왔나, 지나갔나
  for (const s of pending(g)) {
    const P = PRE[s.kind];
    if (P.test(g, s)) {
      s.end = 'came'; s.endAt = now;
      O.belief = clamp(O.belief + (s.pre ? 6 : 3), 0, 100);
      const ago = Math.max(1, now - s.start);
      say(`사람들이 ${ago}달 전의 징조를 떠올렸다. ${s.short}. 옛말이 틀리지 않았다고 수군거린다.`, false);
      olog(g, `${s.short}: 그 뒤에 일이 왔다 (${SIGNS[s.kind].portent}).`);
    } else if (now >= s.due) {
      s.end = 'passed'; s.endAt = now;
      O.belief = clamp(O.belief - 2, 0, 100);
    }
  }
  O.signs = O.signs.filter((s) => !s.end || now - s.endAt < 60);
  if (O.signs.length > 24) O.signs.splice(0, O.signs.length - 24);

  // 새 징조: 큰일이 다가오면 넷에 하나 꼴로 먼저 보인다. 가끔은 아무것도 앞서지 않는 헛징조도 뜬다.
  for (const kind of SIGN_IDS) {
    const recent = O.signs.some((s) => s.kind === kind && (!s.end || now - s.endAt < 12));
    if (recent) continue;
    if (PRE[kind].cond(g)) { if (rng.chance(0.25)) addSign(g, kind, rng, true, say); }
  }
  if (rng.chance(0.028)) {
    const kind = rng.pick(SIGN_IDS.filter((k) => !PRE[k].cond(g) && !PRE[k].test(g, { snap: PRE[k].snap?.(g) ?? {} }) && !O.signs.some((s) => s.kind === k && !s.end)));
    if (kind) addSign(g, kind, rng, false, say);
  }
  if (rng.chance(0.0015)) comet(g, say);

  // 봉인의 예언: 고리가 풀릴수록 믿는 사람이 는다. 검은 새벽은 그 예언으로 사람을 모은다.
  const S = SS(g), sp = O.prophecies.seal, stage = stageOf(sealPower(g));
  if (stage > (O.sealStage ?? 0)) { O.ash.push(g.date.year); if (O.ash.length > 10) O.ash.shift(); }
  O.sealStage = stage;
  sp.belief = clamp(sp.belief + ((12 + stage * 13) - sp.belief) * 0.05, 0, 100);
  if (sp.status === 'whisper' && sp.belief >= 30) { sp.status = 'spread'; say('일곱 번째 금의 예언이 장터에 돈다. 전에는 마탑의 학자들이나 알던 글이다. 이제는 술집에서 아이들도 왼다.', true); }
  if (sp.belief >= 50 && S.cult < 70 && rng.chance(0.08)) {
    S.cult = clamp(S.cult + 1, 0, 100);
    if (rng.chance(0.3)) say(rng.pick([
      '검은 새벽이 일곱 번째 금의 예언을 담벼락에 써 붙였다. "실을 잡는 손은 끊는 손이다." 아침이면 교단 사람들이 그것을 긁어낸다.',
      '봉인이 풀리면 살아남는 것은 새벽을 맞은 이들뿐이라는 말이 돈다. 검은 새벽이 사람을 모으는 말이다.',
    ]));
  }
  if (S.ending && !['fulfilled', 'broken'].includes(sp.status)) {
    sp.status = S.ending === 'resealed' ? 'fulfilled' : 'broken';
    say(S.ending === 'resealed' ? '사람들은 일곱 번째 금의 예언이 이루어졌다고 말한다. 실을 잡은 손이 묶는 쪽이었다고.' : '일곱 번째 금의 예언은 끝내 끊는 쪽으로 이루어졌다. 이제 그 글을 읊는 사람은 없다.', true);
  }

  // 사자 왕관의 예언: 왕위 다툼이 있는 동안 두 왕자의 사람들이 저마다 끌어다 쓴다
  const dp = O.prophecies.dynasty;
  if (r.succession !== 'settled' && !r.king.alive) {
    dp.belief = clamp(dp.belief + 1.2, 0, 100);
    if (dp.status === 'whisper') dp.status = 'spread';
    if (rng.chance(0.04)) {
      const who = rng.pick(['rudolf', 'erik']);
      dp.claims += 1;
      r.rudolf.support = clamp(r.rudolf.support + CLAIM[who][1] * (dp.belief / 100), 0, 100);
      say(CLAIM[who][0]);
    }
  } else if (r.succession === 'settled' && dp.status === 'spread') {
    dp.status = 'fulfilled';
    say(`${rulerName(g)}의 사람들은 사자 왕관의 예언이 이루어졌다고 말한다. 진 쪽의 사람들은 그 노래를 더는 부르지 않는다.`);
    chron(g, '사자 왕관의 예언이 이루어졌다고들 하다.', 40);
  } else dp.belief = clamp(dp.belief - 0.1, 5, 100);

  // 꼬리별의 예언: 성광국은 새 용사를 내세울 때 그 예언을 끌어다 쓴다. 시대가 바뀌면 사람들이 예언을 떠올린다.
  const st = O.prophecies.star;
  if (r.heroBorn && !O.heroSeen) { O.heroSeen = true; st.belief = clamp(st.belief + 10, 0, 100); say('성광국은 새 용사가 꼬리별의 해에 났다고 선포했다. 그 해에 꼬리별이 떴는지 기억하는 사람은 없다.'); }
  if (r.era > (O.era ?? 0)) {
    O.era = r.era;
    if (O.comets.some((y) => g.date.year - y <= 40)) { st.belief = clamp(st.belief + 20, 0, 100); st.status = 'spread'; say('시대가 바뀌자 사람들이 꼬리별의 예언을 떠올렸다. 그 해에 난 아이들이 이제 어른이 되었다.'); }
  }
  st.belief = clamp(st.belief - 0.08, 5, 100);
  O.belief = clamp(O.belief + (30 - O.belief) * 0.01, 0, 100);
});

export const PRO_NAMES = Object.fromEntries(Object.entries(PROPHECIES).map(([k, v]) => [k, v.name]));
