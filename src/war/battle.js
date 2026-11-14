// 전쟁 지휘 모드. 전투 아이디어 모음 문서의 "전쟁": 병력·질·사기·지휘·지형으로 계산하고,
// 플레이어는 싸움 전에 작전을 고른다. 싸움 중 "적장이 나타났다", "한쪽이 무너진다" 같은 순간에는
// 플레이어 자신의 검과 마법(교전 규칙의 전투력)이 판을 흔든다. 강한 개인은 전략 무기다.
import { J } from '../narrative/text.js';
import { circleOf } from '../game.js';
import { L, defineScene, queueScene, note, chron, stress, tired, check } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
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
export function fightBattle(g, rng, side, enemy, planKey) {
  const E = ARMIES[enemy.key];
  const plan = PLANS[planKey] ?? PLANS.charge;
  const lead = leadership(g);
  const me = playerPower(g);
  const log = [];
  let ours = side.troops, theirs = enemy.troops;
  const ours0 = ours, theirs0 = theirs;
  let mOur = 60 + lead / 4 + (g.domain?.morale ?? 50) / 10, mThem = 55 + E.q / 5;
  const qOur = side.q, qThem = E.q;
  let bonus = 1;

  // 작전의 성패
  if (plan.flank) {
    if (check(rng, lead + g.player.stats.sen / 2, 35)) { bonus = 1.45; log.push('기병이 숲 뒤로 돌아 적의 옆구리를 찔렀다. 적진이 출렁였다.'); }
    else { bonus = 0.8; log.push('측면으로 돌던 기병이 늪에 발이 묶였다. 본대가 혼자 버텨야 했다.'); }
  } else if (plan.night) {
    if (check(rng, lead + g.player.stats.agi / 2 - (E.beast ? 15 : 0), 38)) { bonus = 1.6; mThem -= 15; log.push('달 없는 밤, 횃불 없이 다가가 적진에 불을 질렀다. 적은 자다 깬 채로 싸웠다.'); }
    else { bonus = 0.75; mOur -= 10; log.push('야습은 들켰다. 어둠 속에서 아군끼리 칼을 섞는 혼란이 벌어졌다.'); }
  } else if (planKey === 'hold') log.push('언덕 위에 창을 세우고 적이 올라오기를 기다렸다.');
  else if (planKey === 'walls') log.push('성문을 닫고 성벽 위에 활과 돌을 올렸다.');
  else log.push(pick(rng, ['북이 울리고, 대열이 앞으로 나아갔다.', `${J(E.name, '을/를')} 향해 정면으로 진격했다.`, '깃발을 앞세우고 들판을 가로질렀다.']));

  // 서클 마법사는 전략 무기다
  const c = circleOf(g);
  if (c >= 2) { const burn = Math.round(theirs * (0.03 * c)); theirs -= burn; mThem -= c * 3; log.push(`${c}서클의 화염이 적의 대열 한가운데 떨어졌다. ${burn}이 불길에 휩쓸렸다.`); }

  const moments = [];
  for (let phase = 0; phase < 3; phase++) {
    const powOur = ours * (0.5 + qOur / 100) * (mOur / 70) * (phase === 0 ? bonus : 1) * (1 + lead / 300);
    const powThem = theirs * (0.5 + qThem / 100) * (mThem / 70);
    const lossThem = Math.round(Math.min(theirs, powOur * plan.atk * rng.float(0.1, 0.2)));
    const lossOur = Math.round(Math.min(ours, powThem / plan.def * rng.float(0.1, 0.2)));
    theirs -= lossThem; ours -= lossOur;
    mThem -= (lossThem / Math.max(1, theirs0)) * 110;
    mOur -= (lossOur / Math.max(1, ours0)) * 100;

    // 결정적 순간: 둘째 판에 한 번
    if (phase === 1) {
      if (rng.chance(0.55)) {
        // 적장이 나타났다 → 내 칼로 맞선다
        const ok = rng.chance(clamp(0.5 + (me - E.champ) / 50, 0.08, 0.95));
        if (ok) { mThem -= 30; mOur += 12; moments.push('duel_win'); log.push(`적진에서 ${J(E.champName, '이/가')} 말을 몰고 나왔다. 내가 맞섰다. 세 합 만에 그의 투구가 땅에 굴렀다. 적의 함성이 끊겼다.`); L(g).renown += 3; }
        else { mOur -= 15; moments.push('duel_lose'); log.push(`${J(E.champName, '이/가')} 나를 노리고 달려왔다. 칼을 막았지만 말에서 떨어졌다. 부하들이 나를 끌어냈다.`); addWound(g, rng, { unit: E.foe, count: 1 }, rng.int(2, 4)); }
      } else {
        // 한쪽이 무너진다 → 예비대를 이끌고 메운다
        const ok = check(rng, lead + me / 3, 40);
        if (ok) { mOur += 10; moments.push('line_hold'); log.push('좌익이 무너지려는 순간, 예비대를 이끌고 직접 틈을 메웠다. 대열이 다시 섰다.'); }
        else { mOur -= 18; ours -= Math.round(ours * 0.08); moments.push('line_break'); log.push('좌익이 무너졌다. 달려갔을 때는 이미 늦었다. 병사들이 등을 보이며 흩어졌다.'); }
      }
    }
    if (mThem <= 30 || theirs <= theirs0 * 0.3) { log.push(pick(rng, [`${J(E.name, '이/가')} 무너졌다. 남은 자들이 무기를 버리고 달아났다.`, '적의 깃발이 쓰러졌다. 들판에 승리의 함성이 퍼졌다.'])); return finish('win'); }
    if (mOur <= 30 || ours <= ours0 * 0.35) { log.push(pick(rng, ['아군이 무너졌다. 퇴각 나팔을 불게 했다.', '더 버티면 전멸이었다. 남은 병사를 모아 물러났다.'])); return finish('lose'); }
  }
  // 해 질 녘: 남은 힘과 사기를 견준다
  const endOur = Math.max(0, ours) * (0.5 + qOur / 100) * mOur, endThem = Math.max(0, theirs) * (0.5 + qThem / 100) * mThem;
  if (endOur > endThem * 1.3) { log.push('해 질 녘, 적이 먼저 진을 거두고 물러났다. 들판은 우리 차지였다.'); return finish('win'); }
  if (endThem > endOur * 1.3) { log.push('해 질 녘, 더 버틸 힘이 없었다. 어둠을 틈타 물러났다.'); return finish('lose'); }
  log.push('해가 지도록 승부가 나지 않았다. 양쪽 모두 진지로 물러났다.');
  return finish('draw');

  function finish(outcome) {
    return { outcome, log, lostOur: ours0 - Math.max(0, ours), lostThem: theirs0 - Math.max(0, theirs), moments };
  }
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
    return runBattle(g, rng, s, key);
  },
});

export function runBattle(g, rng, s, plan) {
  const side = ourArmy(g);
  const r = fightBattle(g, rng, side, s.enemy, plan);
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
