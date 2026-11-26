// 전쟁 지휘 모드. 전투 아이디어 모음 문서의 "전쟁": 병력·질·사기·지휘·지형으로 계산하고,
// 플레이어는 싸움 전에 작전을 고른다. 싸움 중 "적장이 나타났다", "한쪽이 무너진다" 같은 순간에는
// 플레이어 자신의 검과 마법(교전 규칙의 전투력)이 판을 흔든다. 강한 개인은 전략 무기다.
import { J } from '../narrative/text.js';
import { circleOf } from '../game.js';
import { L, defineScene, queueScene, showScene, note, chron, stress, tired, check } from '../adventure/core.js';
import { playerPower, battleSpells } from '../adventure/combat.js';
import { addWound } from '../adventure/fight.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (rng, arr) => arr[Math.floor(rng.next() * arr.length)];

// 적의 종류. q: 병사의 질(0~100), champ: 적장의 개인 전투력, foe: 적장이 칼을 맞댈 때 쓰는 교전 적 id
export const ARMIES = {
  bandits: { name: '도적 떼', q: 25, champ: 32, champName: '도적 두목', foe: 'bandit_chief' },
  rebels: { name: '봉기한 영민들', q: 15, champ: 22, champName: '봉기 우두머리', foe: 'bandit_chief', kin: true },
  neighbor: { name: '이웃 영주의 사병', q: 40, champ: 45, champName: '이웃 영주의 기사', foe: 'bandit_chief' },
  monsters: { name: '마물 무리', q: 30, champ: 46, champName: '마력에 물든 짐승', foe: 'mana_bear', beast: true },
  orcs: { name: '오크 전단', q: 45, champ: 60, champName: '오크 전사장', foe: 'orc_chief', beast: true },
  balhart: { name: '발하르트 제국군', q: 60, champ: 70, champName: '제국 기사', foe: 'bandit_chief' },
  garbes: { name: '붉은 마왕군', q: 62, champ: 85, champName: '마족 장군', foe: 'orc_chief', beast: true },
  civil: { name: '반대편 왕자의 군대', q: 50, champ: 60, champName: '적 기사단장', foe: 'bandit_chief' },
  undead: { name: '에스텔라의 망령 군단', q: 45, champ: 75, champName: '망국의 기사왕', foe: 'wight', beast: true },
};

// 지휘 능력: 머리·말솜씨·의지, 검, 이름값
export function leadership(g) {
  const s = g.player.stats;
  return (s.int + s.cha + s.wil) / 3 * 0.7 + g.player.skills.sword * 0.15 + Math.min(30, L(g).renown * 0.25) + (g.player.skills.letters ?? 0) * 0.1;
}

// 우리 군: 영지 병사, 또는 기사단에서 맡긴 기사대
export function ourArmy(g) {
  const d = g.domain;
  const k = L(g).fac.knights;
  const ex = L(g).expedition;
  if (ex && ex.troops > 0) return { troops: ex.troops, q: ex.q, source: 'expedition', name: '원정대' };
  if (d && d.garrison > 0) return { troops: d.garrison, q: d.quality, source: 'domain', name: `${d.name}의 병사` };
  if (k?.member && k.rank >= 2) return { troops: 30 + k.rank * 20, q: 55, source: 'knights', name: '맡은 기사대' };
  return { troops: 0, q: 0, source: 'none', name: '' };
}

const PLANS = {
  charge: { label: '정면으로 진격한다', atk: 1.15, def: 0.9 },
  flank: { label: '기병으로 측면을 돈다', atk: 1.0, def: 1.0, flank: true },
  hold: { label: '유리한 땅에 진을 치고 기다린다', atk: 0.85, def: 1.3 },
  night: { label: '밤을 틈타 기습한다', atk: 1.0, def: 1.0, night: true },
  walls: { label: '성벽 안에서 버틴다', atk: 0.7, def: 1.7 },
};

// 한 판의 전투. side: 우리 군 { troops, q }, enemy: { key, troops }
// 46단계: 시작(전열) → 세 판 → 해 질 녘으로 나눴다. 장면에서는 판 사이에 고르기를 끼운다(아래 battle_beat).
// fightBattle(한 번에 끝까지)은 예전과 주사위 순서까지 같다.
export function fightBattle(g, rng, side, enemy, planKey) {
  const b = battleStart(g, rng, side, enemy, planKey);
  for (let phase = 0; phase < 3 && !b.done; phase++) battlePhase(g, rng, b, phase);
  if (!b.done) battleDusk(rng, b);
  return battleResult(b);
}
export function battleStart(g, rng, side, enemy, planKey) {
  const E = ARMIES[enemy.key];
  const plan = PLANS[planKey] ?? PLANS.charge;
  const lead = leadership(g);
  const log = [];
  const b = { key: enemy.key, plan: PLANS[planKey] ? planKey : 'charge', lead, me: playerPower(g), log, ours: side.troops, theirs: enemy.troops, ours0: side.troops, theirs0: enemy.troops,
    mOur: 60 + lead / 4 + (g.domain?.morale ?? 50) / 10, mThem: 55 + E.q / 5, qOur: side.q, qThem: E.q, bonus: 1, moments: [], done: false, outcome: null, phase: 0 };

  // 작전의 성패
  if (plan.flank) {
    if (check(rng, lead + g.player.stats.sen / 2, 35)) { b.bonus = 1.45; log.push('기병이 숲 뒤로 돌아 적의 옆구리를 찔렀다. 적진이 출렁였다.'); }
    else { b.bonus = 0.8; log.push('측면으로 돌던 기병이 늪에 발이 묶였다. 본대가 혼자 버텨야 했다.'); }
  } else if (plan.night) {
    if (check(rng, lead + g.player.stats.agi / 2 - (E.beast ? 15 : 0), 38)) { b.bonus = 1.6; b.mThem -= 15; log.push('달 없는 밤, 횃불 없이 다가가 적진에 불을 질렀다. 적은 자다 깬 채로 싸웠다.'); }
    else { b.bonus = 0.75; b.mOur -= 10; log.push('야습은 들켰다. 어둠 속에서 아군끼리 칼을 섞는 혼란이 벌어졌다.'); }
  } else if (planKey === 'hold') log.push('언덕 위에 창을 세우고 적이 올라오기를 기다렸다.');
  else if (planKey === 'walls') log.push('성문을 닫고 성벽 위에 활과 돌을 올렸다.');
  else log.push(pick(rng, ['북이 울리고, 대열이 앞으로 나아갔다.', `${J(E.name, '을/를')} 향해 정면으로 진격했다.`, '깃발을 앞세우고 들판을 가로질렀다.']));

  // 서클 마법사는 전략 무기다. 다만 싸우는 주문을 익혀야 한다.
  const atkSpells = battleSpells(g).filter((x) => x.use === 'combat' && x.circle >= 2).sort((a, b2) => b2.circle - a.circle);
  if (atkSpells.length) {
    const sp = atkSpells[0];
    const c = Math.min(circleOf(g), sp.circle + 1);
    const burn = Math.round(b.theirs * (0.03 * c + (sp.circle >= 5 ? 0.1 : 0)));
    b.theirs -= burn; b.mThem -= c * 3;
    log.push(`${J(sp.name, '이/가')} 적의 대열 한가운데 떨어졌다. ${burn}명이 휩쓸렸다.`);
  }
  const ward = battleSpells(g).find((x) => x.use === 'ward' && x.circle >= 2);
  if (ward && (planKey === 'hold' || planKey === 'walls')) { b.mOur += 6; log.push(`${J(ward.name, '이/가')} 진지 앞을 막아섰다. 적의 화살이 허공에서 꺾였다.`); }
  return b;
}
// 한 판: 서로 깎고, 둘째 판엔 결정적 순간(opt.moment가 없으면 저절로), 무너졌는지 본다
// opt: { atk, def, moment: (g, rng, b) => void }
export function battlePhase(g, rng, b, phase, opt = {}) {
  const E = ARMIES[b.key], plan = PLANS[b.plan], log = b.log;
  const powOur = b.ours * (0.5 + b.qOur / 100) * (b.mOur / 70) * (phase === 0 ? b.bonus : 1) * (1 + b.lead / 300);
  const powThem = b.theirs * (0.5 + b.qThem / 100) * (b.mThem / 70);
  const lossThem = Math.round(Math.min(b.theirs, powOur * plan.atk * (opt.atk ?? 1) * rng.float(0.1, 0.2)));
  const lossOur = Math.round(Math.min(b.ours, powThem / (plan.def * (opt.def ?? 1)) * rng.float(0.1, 0.2)));
  b.theirs -= lossThem; b.ours -= lossOur;
  b.mThem -= (lossThem / Math.max(1, b.theirs0)) * 110;
  b.mOur -= (lossOur / Math.max(1, b.ours0)) * 100;
  b.phase = phase + 1;
  // 결정적 순간: 둘째 판에 한 번
  if (phase === 1) (opt.moment ?? autoMoment)(g, rng, b);
  if (b.mThem <= 30 || b.theirs <= b.theirs0 * 0.3) { log.push(pick(rng, [`${J(E.name, '이/가')} 무너졌다. 남은 자들이 무기를 버리고 달아났다.`, '적의 깃발이 쓰러졌다. 들판에 승리의 함성이 퍼졌다.'])); b.done = true; b.outcome = 'win'; return b; }
  if (b.mOur <= 30 || b.ours <= b.ours0 * 0.35) { log.push(pick(rng, ['아군이 무너졌다. 퇴각 나팔을 불게 했다.', '더 버티면 전멸이었다. 남은 병사를 모아 물러났다.'])); b.done = true; b.outcome = 'lose'; return b; }
  return b;
}
function autoMoment(g, rng, b) {
  if (rng.chance(0.55)) champMoment(g, rng, b, 'duel');
  else lineMoment(g, rng, b, 'lead');
}
// 적장이 나타났다
function champMoment(g, rng, b, how) {
  const E = ARMIES[b.key], log = b.log;
  if (how === 'duel') {
    const ok = rng.chance(clamp(0.5 + (b.me - E.champ) / 50, 0.08, 0.95));
    if (ok) { b.mThem -= 30; b.mOur += 12; b.moments.push('duel_win'); log.push(`적진에서 ${J(E.champName, '이/가')} 말을 몰고 나왔다. 내가 맞섰다. 세 합 만에 그의 투구가 땅에 굴렀다. 적의 함성이 끊겼다.`); L(g).renown += 3; }
    else { b.mOur -= 15; b.moments.push('duel_lose'); log.push(`${J(E.champName, '이/가')} 나를 노리고 달려왔다. 칼을 막았지만 말에서 떨어졌다. 부하들이 나를 끌어냈다.`); addWound(g, rng, { unit: E.foe, count: 1 }, rng.int(2, 4)); }
  } else if (how === 'knights') {
    if (check(rng, b.lead + b.qOur / 4, 42)) { b.mThem -= 15; b.mOur += 5; b.moments.push('knights_win'); log.push(`가장 날랜 기사 셋이 ${J(E.champName, '을/를')} 에워쌌다. 적장은 말에서 끌려 내려왔다.`); }
    else { b.mOur -= 8; b.ours -= Math.round(b.ours * 0.03); b.moments.push('knights_lose'); log.push(`맡긴 기사들이 하나씩 쓰러졌다. ${J(E.champName, '은/는')} 피 묻은 칼을 들어 우리 쪽을 가리켰다.`); }
  } else if (how === 'arrows') {
    if (rng.chance(clamp(0.35 + b.lead / 200, 0.2, 0.7))) { b.mThem -= 20; b.moments.push('arrows_win'); log.push(`궁수들이 한꺼번에 시위를 놓았다. ${J(E.champName, '이/가')} 탄 말이 거꾸러졌다.`); }
    else { b.mOur -= 5; b.moments.push('arrows_miss'); log.push(`화살이 ${E.champName}의 방패에 꽂혀 고슴도치처럼 되었다. 적장은 멈추지 않았다.`); }
  } else { b.mOur += 3; b.mThem += 5; b.moments.push('champ_avoid'); log.push(`${J(E.champName, '을/를')} 상대하지 않고 대열만 굳게 지켰다. 적의 기세가 올랐지만 우리 줄은 무너지지 않았다.`); }
}
// 한쪽이 무너진다
function lineMoment(g, rng, b, how) {
  const log = b.log;
  if (how === 'lead') {
    const ok = check(rng, b.lead + b.me / 3, 40);
    if (ok) { b.mOur += 10; b.moments.push('line_hold'); log.push('좌익이 무너지려는 순간, 예비대를 이끌고 직접 틈을 메웠다. 대열이 다시 섰다.'); }
    else { b.mOur -= 18; b.ours -= Math.round(b.ours * 0.08); b.moments.push('line_break'); log.push('좌익이 무너졌다. 달려갔을 때는 이미 늦었다. 병사들이 등을 보이며 흩어졌다.'); }
  } else if (how === 'send') {
    if (check(rng, b.lead, 45)) { b.mOur += 7; b.moments.push('line_hold'); log.push('예비대가 북소리에 맞춰 좌익 뒤를 받쳤다. 무너지던 줄이 버텼다.'); }
    else { b.mOur -= 10; b.ours -= Math.round(b.ours * 0.05); b.moments.push('line_break'); log.push('예비대가 늦었다. 좌익이 반쯤 흩어진 뒤였다.'); }
  } else if (how === 'pull') { b.mOur -= 5; b.pulled = true; b.moments.push('line_pull'); log.push('나팔을 불어 전열을 한 걸음 물렸다. 줄은 짧아졌지만 단단해졌다.'); }
  else {
    if (check(rng, b.lead + g.player.stats.sen / 2, 50)) { b.mThem -= 25; b.moments.push('counter_win'); log.push('좌익을 버려 두고 오른쪽 언덕으로 기병을 몰았다. 적의 옆구리가 열렸다. 도박이 먹혔다.'); }
    else { b.mOur -= 20; b.ours -= Math.round(b.ours * 0.1); b.moments.push('counter_lose'); log.push('반대편을 치러 간 사이 좌익이 통째로 무너졌다. 도박은 실패했다.'); }
  }
}
// 해 질 녘: 남은 힘과 사기를 견준다
export function battleDusk(rng, b) {
  const log = b.log;
  const endOur = Math.max(0, b.ours) * (0.5 + b.qOur / 100) * b.mOur, endThem = Math.max(0, b.theirs) * (0.5 + b.qThem / 100) * b.mThem;
  b.done = true;
  if (endOur > endThem * 1.3) { log.push('해 질 녘, 적이 먼저 진을 거두고 물러났다. 들판은 우리 차지였다.'); b.outcome = 'win'; return b; }
  if (endThem > endOur * 1.3) { log.push('해 질 녘, 더 버틸 힘이 없었다. 어둠을 틈타 물러났다.'); b.outcome = 'lose'; return b; }
  log.push('해가 지도록 승부가 나지 않았다. 양쪽 모두 진지로 물러났다.');
  b.outcome = 'draw';
  return b;
}
export function battleResult(b) {
  return { outcome: b.outcome, log: b.log, lostOur: b.ours0 - Math.max(0, b.ours), lostThem: b.theirs0 - Math.max(0, b.theirs), moments: b.moments };
}

/* ---------- 전투 장면 ---------- */
// data: { title, intro, enemy: { key, troops }, context, reward: { treasury, renown, favor }, extra: [{ label, key }] }
export function queueBattle(g, data, opt) { queueScene(g, 'battle', data, opt); }

defineScene('battle', {
  title: (g, s) => s.title ?? '전투',
  text: (g, s) => {
    const side = ourArmy(g);
    const E = ARMIES[s.enemy.key];
    const ratio = (side.troops * (0.5 + side.q / 100)) / Math.max(1, s.enemy.troops * (0.5 + E.q / 100));
    const word = ratio >= 2 ? '수와 질 모두 우리가 앞선다.' : ratio >= 1.2 ? '우리가 조금 앞선다.' : ratio >= 0.8 ? '팽팽하다. 작전이 승부를 가를 것이다.' : ratio >= 0.5 ? '불리하다. 정면으로 붙으면 진다.' : '절망적이다.';
    return `${s.intro} 아군: ${side.name} ${side.troops}명. 적: ${E.name} 약 ${s.enemy.troops}명. ${word}`;
  },
  choices: (g, s) => {
    const out = [];
    if (ourArmy(g).troops > 0) {
      out.push({ label: PLANS.charge.label, key: 'charge' }, { label: PLANS.flank.label, key: 'flank' }, { label: PLANS.hold.label, key: 'hold' }, { label: PLANS.night.label, key: 'night' });
      if (s.context === 'defense' && g.domain?.buildings.wall) out.push({ label: PLANS.walls.label, key: 'walls' });
    }
    for (const x of s.extra ?? []) out.push(x);
    if (!out.length) out.push({ label: '싸울 병사가 없다. 물러난다', key: 'avoid' });
    return out;
  },
  resolve(g, rng, s, key) {
    const handler = BATTLE_OUTS[s.context];
    if (!PLANS[key]) return handler?.other?.(g, rng, s, key) ?? '싸움을 피했다.';
    if (s.oneShot) return runBattle(g, rng, s, key);
    return beginWarBeats(g, rng, s, key);
  },
});

export function runBattle(g, rng, s, plan) {
  const side = ourArmy(g);
  const r = fightBattle(g, rng, side, s.enemy, plan);
  return battleAfter(g, rng, s, r, side);
}
function battleAfter(g, rng, s, r, side) {
  tired(g, 25); stress(g, 15);
  const d = g.domain;
  const life = L(g);
  // 병력 손실을 반영한다
  if (side.source === 'domain' && d) { d.garrison = Math.max(0, d.garrison - r.lostOur); d.battles += 1; if (r.outcome === 'win') d.wins += 1; }
  if (side.source === 'expedition') life.expedition.troops = Math.max(0, life.expedition.troops - r.lostOur);
  const lines = [...r.log, `(아군 ${r.lostOur}명, 적 ${r.lostThem}명을 잃었다)`];
  const handler = BATTLE_OUTS[s.context];
  const after = handler?.[r.outcome]?.(g, rng, s, r);
  if (after) lines.push(after);
  if (r.outcome === 'win') {
    life.renown += s.reward?.renown ?? 2;
    if (d && s.reward?.treasury) { d.treasury += s.reward.treasury; lines.push(`전리품으로 금고에 은화 ${s.reward.treasury}닢이 들어왔다.`); }
    if (d && s.reward?.favor) d.favor = clamp(d.favor + s.reward.favor, 0, 100);
    if (s.big && s.enemy.troops >= 60) chron(g, `${g.player.name}, ${J(ARMIES[s.enemy.key].name, '을/를')} 무찌르다.`);
  }
  if (r.outcome === 'lose' && d) d.morale = clamp(d.morale - 8, 0, 100);
  if (s.big) note(g, `${s.title}: ${{ win: '이겼다', lose: '졌다', draw: '승부가 나지 않았다' }[r.outcome]}.`);
  return lines.join(' ');
}

// 맥락마다 결과 처리 (다른 파일이 채운다: domain/rule.js, domain/nation.js, war/summons.js)
export const BATTLE_OUTS = {};

/* ---------- 46단계: 전쟁을 단계별로 ----------
   첫 단계 = 전열(작전 고르기)과 첫 판. 둘째 단계 = 결정적 순간(적장이 나오거나, 한쪽 줄이 흔들린다) 고르기와 둘째 판.
   셋째 단계 = 해 지기 전 예비대(총공세·대열 유지·마지막 예비대·물러남)와 셋째 판, 그리고 해 질 녘. */
const STAGE_NAME = ['전열', '결정적 순간', '해 지기 전'];
const moraleWord = (m) => (m >= 70 ? '사기가 높다' : m >= 55 ? '버틸 만하다' : m >= 40 ? '흔들린다' : '무너지기 직전이다');
function warOptions(g, w) {
  const E = ARMIES[w.b.key];
  // 추격: 적이 무너져 달아날 때. 맨 끝 '놓아준다'가 예전과 같은 끝.
  if (w.step === 'chase') return [
    { id: 'chase', label: '기병을 풀어 끝까지 쫓는다', hint: E.beast ? '더 많이 베지만 매복이 있을 수 있다' : '포로와 전리품이 늘지만 매복이 있을 수 있다', icon: 'horse' },
    { id: 'let', label: '놓아주고 진을 거둔다', hint: '이긴 것으로 족하다', icon: 'shield' },
  ];
  if (w.step === 2 && w.moment === 'champ') return [
    { id: 'knights', label: '날랜 기사들에게 맡긴다', hint: '지휘와 병사의 질에 달렸다', icon: 'banner' },
    { id: 'arrows', label: '궁수들에게 적장을 쏘게 한다', hint: '맞으면 크다', icon: 'eye' },
    { id: 'avoid', label: '상대하지 않고 대열만 지킨다', hint: '잃는 것도 얻는 것도 적다', icon: 'shield' },
    { id: 'duel', label: `${J(E.champName, '과/와')} 직접 칼을 맞댄다`, hint: '이기면 적의 기세가 꺾이고, 지면 다친다', icon: 'sword' },
  ];
  if (w.step === 2) return [
    { id: 'send', label: '예비대만 보낸다', hint: '덜 위험하지만 덜 확실하다', icon: 'flag' },
    { id: 'pull', label: '전열을 한 걸음 물려 다시 짠다', hint: '사기가 조금 깎이고 다음 판에 단단해진다', icon: 'shield' },
    { id: 'counter', label: '반대편 측면을 친다', hint: '크게 이기거나 크게 진다', icon: 'horse' },
    { id: 'lead', label: '예비대를 직접 이끌고 틈을 메운다', hint: '내 칼과 지휘에 달렸다', icon: 'sword' },
  ];
  // 맨 끝은 '하던 대로' (저절로 고를 때 맨 끝을 고르는 도구들이 있어 늘 무난한 것을 끝에 둔다)
  const out = [{ id: 'push', label: '총공세를 명한다', hint: '세게 치지만 많이 잃는다', icon: 'banner' }];
  if (!w.b.reserveUsed) out.push({ id: 'reserve', label: '마지막 예비대를 푼다', hint: '사기가 오른다', icon: 'flag' });
  out.push({ id: 'retreat', label: '질서 있게 물러난다', hint: '지지만 덜 잃는다', icon: 'door' });
  out.push({ id: 'steady', label: '대열을 지키며 밀고 당긴다', hint: '하던 대로', icon: 'shield' });
  return out;
}
function warView(g, w) {
  const b = w.b, E = ARMIES[b.key];
  return {
    kind: 'war', stage: w.step === 'chase' ? 3 : w.step, stages: 3, stageName: w.step === 'chase' ? '추격' : STAGE_NAME[w.step - 1], chase: w.step === 'chase', plan: b.plan, moment: w.step === 2 ? w.moment : null,
    us: { name: w.side?.name ?? '아군', troops: Math.max(0, b.ours), troops0: b.ours0, morale: Math.round(b.mOur), word: moraleWord(b.mOur) },
    them: { name: E.name, key: b.key, troops: Math.max(0, b.theirs), troops0: b.theirs0, morale: Math.round(b.mThem), word: moraleWord(b.mThem), champ: E.champName, beast: !!E.beast },
    allies: w.side?.name ? [w.side.name] : [], options: warOptions(g, w), crux: w.step === 2, last: w.stages?.at(-1) ?? null,
  };
}
function showWar(g, w) { w.view = warView(g, w); if (!showScene(g, w, { force: true })) L(g).queue.unshift(w); }
const lossLine = (b, o0, t0) => `아군 ${Math.max(0, o0 - Math.max(0, b.ours))}명, 적 ${Math.max(0, t0 - Math.max(0, b.theirs))}명`;
function beginWarBeats(g, rng, s, plan) {
  const side = ourArmy(g);
  const b = battleStart(g, rng, side, s.enemy, plan);
  battlePhase(g, rng, b, 0);
  if (!b.done) b.log.push(`${pick(rng, ['화살이 비처럼 오갔다.', '창끝과 창끝이 맞부딪쳤다.', '방패 벽과 방패 벽이 맞붙었다.', '함성과 비명이 한데 뒤엉켰다.'])} 첫 부딪침에 아군 ${b.ours0 - b.ours}명, 적 ${b.theirs0 - b.theirs}명이 쓰러졌다.`);
  const { choices, ...fs } = s;
  const w = { kind: 'battle_beat', at: L(g).place, t: g.date.year * 12 + g.date.month, keep: true, fs, b, side: { name: side.name, source: side.source }, step: 2, inj0: g.player.injuries.length, stages: [`${PLANS[b.plan].label}: ${lossLine(b, b.ours0, b.theirs0)}`] };
  if (b.done) return endWar(g, rng, w, 0);
  w.moment = rng.chance(0.55) ? 'champ' : 'line';
  const text = b.log.join(' ');
  b.shown = b.log.length;
  showWar(g, w);
  return text;
}
function endWar(g, rng, w, from) {
  const b = w.b;
  // 이겼는데 적이 남아 달아나면 한 번 더 고른다: 쫓을지 놓아줄지
  if (!w.chased && b.outcome === 'win' && b.theirs > 0) {
    const text = b.log.slice(from).join(' ');
    b.shown = b.log.length;
    showWar(g, { ...w, step: 'chase', choices: undefined });
    return text;
  }
  const r = battleResult(b);
  const text = battleAfter(g, rng, w.fs, { ...r, log: r.log.slice(from) }, ourArmy(g));
  g.lastFight = { kind: 'war', title: w.fs.title ?? '전투', result: r.outcome, word: { win: '이겼다', lose: '졌다', draw: '승부가 나지 않았다' }[r.outcome], stages: w.stages, wounds: g.player.injuries.slice(w.inj0 ?? 0).map((x) => x.name), lost: { ours: r.lostOur, theirs: r.lostThem }, moments: r.moments, y: g.date.year, m: g.date.month, foe: ARMIES[b.key].name };
  return text;
}
defineScene('battle_beat', {
  keep: true,
  need: (g, s) => !!s.b && (s.step === 'chase' ? !s.chased : !s.b.done),
  title: (g, s) => `${s.fs.title ?? '전투'}: ${s.step === 'chase' ? '달아나는 적' : s.step === 2 ? (s.moment === 'champ' ? '적장이 나왔다' : '한쪽 줄이 흔들린다') : '해 지기 전'}`,
  text: (g, s) => {
    const b = s.b, E = ARMIES[b.key];
    if (s.step === 'chase') return `${J(E.name, '이/가')} 무너져 달아난다. 남은 ${Math.max(0, b.theirs)}명이 ${E.beast ? '숲과 골짜기로 흩어진다' : '깃발을 버리고 흩어진다'}. 아군은 ${Math.max(0, b.ours)}명, 지쳤지만 기세가 올랐다.`;
    const head = s.step === 2
      ? (s.moment === 'champ' ? `적진 한가운데서 ${J(E.champName, '이/가')} 말을 몰고 나왔다. 우리 병사들이 그쪽을 본다.` : '왼쪽 날개가 밀리기 시작했다. 깃발 몇 개가 뒤로 기운다.')
      : '해가 기울었다. 오늘 안에 승부를 내려면 지금 마지막 수를 써야 한다.';
    return `${head} 아군 ${Math.max(0, b.ours)}명, ${moraleWord(b.mOur)}. ${E.name} ${Math.max(0, b.theirs)}명, ${moraleWord(b.mThem)}.`;
  },
  choices: (g, s) => warOptions(g, s).map((o) => ({ label: o.label, key: o.id })),
  resolve(g, rng, s, key) {
    const b = s.b, from = b.shown ?? 0, o0 = b.ours, t0 = b.theirs;
    const label = warOptions(g, s).find((o) => o.id === key)?.label ?? key;
    if (s.step === 'chase') return resolveWarChase(g, rng, s, key, from);
    if (s.step === 2) {
      battlePhase(g, rng, b, 1, { moment: (g2, r2, b2) => (s.moment === 'champ' ? champMoment(g2, r2, b2, key) : lineMoment(g2, r2, b2, key)) });
      s.stages = [...(s.stages ?? []), `${label}: ${lossLine(b, o0, t0)}`];
      if (b.done) return endWar(g, rng, s, from);
      b.log.push(`이 고비에 ${lossLine(b, o0, t0)}이 쓰러졌다.`);
      const text = b.log.slice(from).join(' ');
      b.shown = b.log.length;
      showWar(g, { ...s, step: 3, choices: undefined });
      return text;
    }
    if (key === 'retreat') {
      b.log.push('나팔을 길게 불게 했다. 방패를 뒤로 겹치며 한 줄씩 물러났다. 진 싸움이지만, 살아 돌아갈 사람이 많다.');
      b.done = true; b.outcome = 'lose'; b.moments.push('retreat');
      s.stages = [...(s.stages ?? []), `${label}: 물러났다`];
      return endWar(g, rng, s, from);
    }
    const opt = { def: b.pulled ? 1.2 : 1 };
    if (key === 'push') { opt.atk = 1.25; opt.def *= 0.85; b.log.push('마지막 북이 울렸다. 모두가 한꺼번에 앞으로 쏟아져 나갔다.'); }
    else if (key === 'reserve') { b.mOur += 10; b.reserveUsed = true; b.log.push('숲 뒤에 숨겨 둔 마지막 예비대가 함성을 지르며 나왔다. 지친 병사들의 얼굴이 밝아졌다.'); }
    else b.log.push('대열을 지키며 밀고 당겼다. 서두르지 않았다.');
    battlePhase(g, rng, b, 2, opt);
    if (!b.done) battleDusk(rng, b);
    s.stages = [...(s.stages ?? []), `${label}: ${lossLine(b, o0, t0)}`];
    return endWar(g, rng, s, from);
  },
});
function resolveWarChase(g, rng, s, key, from) {
  const b = s.b, E = ARMIES[b.key], d = g.domain;
  s.chased = true;
  const extra = [];
  if (key === 'chase') {
    if (check(rng, b.lead + b.qOur / 4 + 5, 32)) {
      const caught = Math.max(1, Math.round(b.theirs * rng.float(0.2, 0.4)));
      b.theirs -= caught; b.moments.push('chase_win');
      b.log.push(E.beast ? `기병이 흩어지는 무리를 끝까지 몰았다. ${caught}마리를 더 쓰러뜨렸다.` : `기병이 달아나는 자들을 끝까지 몰았다. ${caught}명을 더 베거나 사로잡았다. 포로들이 줄줄이 끌려왔다.`);
      s.stages = [...(s.stages ?? []), `끝까지 쫓았다: 적 ${caught}명 더`];
      if (d && s.fs.reward?.treasury) { const add = Math.round(s.fs.reward.treasury * 0.3); d.treasury += add; extra.push(`버리고 간 짐과 ${E.beast ? '부산물' : '포로 몸값'}으로 은화 ${add}닢이 더 들어왔다.`); }
      L(g).renown += 1;
    } else {
      const lost = Math.max(1, Math.round(b.ours * rng.float(0.03, 0.06)));
      b.ours -= lost; b.moments.push('chase_lose');
      b.log.push(`쫓던 기병이 골짜기에서 매복을 만났다. ${lost}명을 잃고 겨우 돌아왔다.`);
      if (rng.chance(0.35)) { addWound(g, rng, { unit: E.foe, count: 1 }, rng.int(1, 2)); b.log.push('앞장서 달리던 나도 날아온 것에 맞았다.'); }
      s.stages = [...(s.stages ?? []), `쫓다가 매복: 아군 ${lost}명`];
    }
  } else {
    b.log.push(pick(rng, ['달아나는 등은 쫓지 않았다. 다친 병사부터 거두게 했다.', '나팔을 불어 기병을 불러들였다. 이긴 것으로 족하다.']));
    s.stages = [...(s.stages ?? []), '놓아주었다'];
  }
  const text = endWar(g, rng, s, from);
  return extra.length ? `${text} ${extra.join(' ')}` : text;
}
// 지금 떠 있는 전투 장면의 모양 (첫 단계는 작전 고르기)
export function battleView(g) {
  const s = L(g).scene;
  if (!s) return null;
  if (s.kind === 'battle_beat') return warView(g, s);
  if (s.kind !== 'battle' || !s.enemy) return null;
  const side = ourArmy(g), E = ARMIES[s.enemy.key];
  if (!E) return null;
  return {
    kind: 'war', stage: 1, stages: 3, stageName: STAGE_NAME[0], plan: null, moment: null,
    us: { name: side.name || '아군', troops: side.troops, troops0: side.troops, morale: null, word: null },
    them: { name: E.name, key: s.enemy.key, troops: s.enemy.troops, troops0: s.enemy.troops, morale: null, word: null, champ: E.champName, beast: !!E.beast },
    allies: side.name ? [side.name] : [], options: (s.choices ?? []).map((c) => ({ id: c.key, label: c.label, hint: { charge: '세게 치고 많이 맞는다', flank: '지휘에 달렸다', hold: '덜 맞고 덜 친다', night: '들키지 않으면 크다', walls: '성벽 덕에 단단하다' }[c.key] ?? null, icon: { charge: 'banner', flank: 'horse', hold: 'shield', night: 'lantern', walls: 'tower' }[c.key] ?? 'flag' })),
    crux: false, last: null,
  };
}
