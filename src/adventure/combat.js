// 전투 계산. 전투 아이디어 모음 문서의 네 방식 중 "압승"과 "교전"을 구현한다.
// - 압승: 실력 차이가 크면 한 줄로 끝난다.
// - 교전: 우리 편(나 + 동료) 대 적 무리(묶음 단위 + 우두머리). 사기가 무너지면 무리가 흩어진다.
// 결투와 전쟁은 같은 능력치·부상·사기 규칙 위에 나중에 얹는다.
import { J } from '../narrative/text.js';
import { circleOf } from '../game.js';
import { L } from './core.js';

export const FOES = {
  giant_rat: { name: '거대 쥐', pow: 4, bite: true },
  kobold: { name: '코볼트', pow: 7, weapon: '돌창' },
  goblin: { name: '고블린', pow: 8, weapon: '녹슨 칼' },
  thug: { name: '건달', pow: 10, human: true, weapon: '단검' },
  wolf: { name: '늑대', pow: 10, bite: true },
  bandit: { name: '도적', pow: 13, human: true, weapon: '도끼' },
  skeleton: { name: '해골 병사', pow: 16, undead: true, weapon: '부러진 검' },
  deserter: { name: '탈영병', pow: 20, human: true, weapon: '군용 장검' },
  cave_spider: { name: '동굴 거미', pow: 20, bite: true },
  cultist: { name: '마신교도', pow: 22, human: true, weapon: '의식용 단검' },
  hobgoblin: { name: '홉고블린', pow: 24, weapon: '쇠몽둥이' },
  ghoul: { name: '구울', pow: 26, undead: true, bite: true },
  orc: { name: '오크', pow: 28, weapon: '도끼' },
  // 우두머리 (leader: true)
  tower_wraith: { name: '탑의 원령', pow: 26, undead: true, leader: true },
  goblin_chief: { name: '고블린 족장', pow: 30, leader: true, weapon: '톱날 검' },
  bandit_chief: { name: '도적 두목', pow: 32, human: true, leader: true, weapon: '장검' },
  dire_wolf: { name: '마랑', pow: 34, bite: true, leader: true },
  mana_bear: { name: '마력에 물든 곰', pow: 46, bite: true, leader: true },
  wight: { name: '갱도의 망령', pow: 56, undead: true, leader: true, weapon: '광부의 곡괭이' },
  orc_chief: { name: '오크 전사장', pow: 60, leader: true, weapon: '거대한 도끼' },
  spider_queen: { name: '여왕 거미', pow: 62, bite: true, leader: true },
  cult_priest: { name: '마신교 사제', pow: 72, human: true, leader: true, weapon: '검은 불꽃' },
  sewer_horror: { name: '지하수로의 괴물', pow: 88, bite: true, leader: true },
  wyvern: { name: '와이번', pow: 110, bite: true, leader: true },
};

// 내 전투력: 검술이 가장 크고, 몸과 감각, 서클 마법, 장비가 더한다. 다치고 지치면 줄어든다.
// 익힌 전투·결계 주문을 전투력에 더한다. 주문 표는 magic/spells.js에 있고, war/spellpower.js가 이어 준다.
let spellLookup = () => null;
export function registerSpellLookup(f) { spellLookup = f; }
const SPELL_POW = [0, 5, 9, 14, 20, 30, 40, 52, 66, 80];
export function battleSpells(g) {
  return (g.magic?.known ?? []).map((id) => spellLookup(id)).filter((sp) => sp && (sp.use === 'combat' || sp.use === 'ward'));
}
// 가장 센 전투 주문은 다 치고, 나머지 전투 주문은 조금씩, 결계는 막는 힘으로 조금
export function spellPower(g) {
  const sp = battleSpells(g);
  const atk = sp.filter((x) => x.use === 'combat').map((x) => SPELL_POW[x.circle] ?? 0).sort((a, b) => b - a);
  const ward = Math.max(0, ...sp.filter((x) => x.use === 'ward').map((x) => SPELL_POW[x.circle] ?? 0));
  return (atk[0] ?? 0) + atk.slice(1).reduce((t, v) => t + v * 0.25, 0) + ward * 0.4;
}
// 다른 갈래가 싸움 힘에 더할 것: (g) => 숫자. 예: 함께 다니는 짐승(src/beasts/)
export const POWER_BONUS = [];
export function playerPower(g) {
  const p = g.player;
  const s = p.stats, k = p.skills;
  let pow = k.sword * 0.55 + s.str * 0.2 + s.agi * 0.2 + s.sen * 0.1 + s.wil * 0.05;
  const c = circleOf(g);
  pow += c * c * 3 + c * 7; // 1서클 10, 2서클 26, 3서클 48, 5서클 110: 고서클은 전략 무기
  pow += spellPower(g); // 서클이 같아도 싸우는 주문을 익혀야 더 세다
  const gear = L(g).gear;
  pow += (gear.weapon ?? 0) + (gear.armor ?? 0) * 0.6;
  for (const f of POWER_BONUS) pow += Number(f(g)) || 0; // 다른 갈래가 더하는 힘 (짐승 등)
  pow *= Math.max(0.45, 1 - p.injuries.length * 0.12);
  if (p.fatigue > 70) pow *= 0.8;
  return Math.max(3, pow);
}
// 버틸 수 있는 몸 (100 기준): 힘과 의지가 높으면 조금 더, 다쳤으면 덜
export function playerVitality(g) {
  const p = g.player;
  return Math.max(25, 85 + p.stats.str * 0.2 + p.stats.wil * 0.15 + (L(g).gear.armor ?? 0) - p.injuries.length * 10 - p.fatigue / 6);
}

// 적의 힘을 말로 (화면에 숫자를 내밀지 않는다)
export function threatWord(partyPow, enc) {
  const total = foeTotal(enc);
  const r = partyPow / total;
  if (r >= 2.2) return '상대가 되지 않는다.';
  if (r >= 1.3) return '해 볼 만하다.';
  if (r >= 0.85) return '만만치 않다. 다칠 각오를 해야 한다.';
  if (r >= 0.55) return '위험하다. 질 수도 있다.';
  return '목숨을 걸어야 한다.';
}
export function foeTotal(enc) {
  const F = FOES[enc.unit];
  return (F ? F.pow * enc.count * 0.75 : 0) + (enc.leader ? leaderPow(enc) * 1.3 : 0);
}
export const leaderPow = (enc) => enc.leaderPow ?? FOES[enc.leader]?.pow ?? 0;
export const leaderName = (enc) => enc.leaderName ?? FOES[enc.leader]?.name ?? '';
export function describeFoes(enc) {
  const parts = [];
  if (enc.unit && enc.count) parts.push(`${FOES[enc.unit].name} ×${enc.count}`);
  if (enc.leader) parts.push(enc.leaderName ? `${enc.leaderName}(${FOES[enc.leader].name})` : FOES[enc.leader].name);
  return parts.join(', ');
}

const pick = (rng, arr) => arr[Math.floor(rng.next() * arr.length)];

// 교전 한 판. opts: { tactic: charge|ambush|magic, flee: 물러설 체력, companions: [{ name, pow }], hp }
export function skirmish(g, rng, enc, opts = {}) {
  const F = FOES[enc.unit] ?? null;
  const LP = enc.leader ? leaderPow(enc) : 0;
  const lname = leaderName(enc);
  const myPow = playerPower(g);
  const comps = opts.companions ?? [];
  const compPow = comps.reduce((s, c) => s + c.pow, 0);
  const party = myPow + compPow;
  const share = myPow / party;
  const log = [];
  let hp = opts.hp ?? playerVitality(g);
  const hp0 = hp;
  const out = { outcome: 'win', log, kills: 0, leaderDown: false, leaderFled: false, hits: [], compHits: [], hp };
  let units = F ? enc.count : 0;
  const count0 = units;
  let leaderHp = LP * 2.4;
  let leaderAlive = !!enc.leader;
  let morale = 100 + (leaderAlive ? 25 : 0);

  // 압승: 한 줄로 끝난다
  if ((!F || party >= F.pow * 4.2) && (!leaderAlive || party >= LP * 2.6)) {
    out.outcome = 'overwhelm';
    out.kills = units + (leaderAlive ? 1 : 0);
    out.leaderDown = leaderAlive;
    const n = describeCount(enc);
    log.push(pick(rng, [
      `${J(n, '이/가')} 무기를 제대로 들기도 전에 쓰러졌다.`,
      `싸움이라 부르기도 어려웠다. ${J(n, '은/는')} 몇 번의 칼질에 땅에 누웠다.`,
      `${J(n, '이/가')} 덤벼들었고, 숨 몇 번 고르는 사이에 끝났다.`,
    ]));
    return out;
  }

  log.push(`${J(describeCount(enc), '이/가')} 앞을 막아섰다.`);
  // 싸움 전 선택의 효과
  let atkBonus = 1, firstRoundSafe = false, enemyFirst = false;
  const tactic = opts.tactic ?? 'charge';
  if (tactic === 'ambush') {
    const ok = rng.chance(Math.max(0.1, Math.min(0.9, 0.5 + (g.player.stats.sen + g.player.stats.agi / 2 - 25 - count0 * 1.5) / 40)));
    if (ok) { atkBonus = 1.9; firstRoundSafe = true; log.push('바람을 등지고 다가가 먼저 덮쳤다. 적은 무기를 뽑을 틈도 없었다.'); }
    else { enemyFirst = true; log.push('마른 가지가 발밑에서 부러졌다. 기습은 실패했고, 적이 먼저 달려들었다.'); }
  } else if (tactic === 'magic') {
    const c = circleOf(g);
    if (c >= 1 && units > 0) {
      const burst = Math.min(units, Math.floor(c * 1.3 + rng.next() * (c + 1) + (F.pow <= 10 ? 1 : 0)));
      units -= burst; out.kills += burst; morale -= (burst / Math.max(1, count0)) * 80;
      g.player.fatigue = Math.min(100, g.player.fatigue + 6 + c * 2);
      log.push(burst > 0
        ? `영창을 마치자 ${c >= 3 ? '화염의 고리가' : c >= 2 ? '불꽃 창이' : '불씨 화살이'} 날아갔다. ${F.name} ${burst}${F.human ? '명이' : '마리가'} 불길 속에 쓰러졌다.`
        : '영창이 늦었다. 마법은 빗나가 바위만 그을렸다.');
    } else if (c >= 1 && leaderAlive) {
      leaderHp -= c * 14;
      log.push(`마력을 끌어모아 ${lname}에게 쏘았다. 살이 타는 냄새가 났다.`);
    }
  } else {
    log.push(pick(rng, ['검을 뽑고 정면으로 나섰다.', '숨을 크게 들이쉬고 앞으로 나섰다.', '물러설 곳은 없었다. 정면으로 맞섰다.']));
  }

  for (let r = 0; r < 7; r++) {
    // 우리 공격
    const atk = party * rng.float(0.6, 1.15) * (r === 0 ? atkBonus : 1);
    if (units > 0) {
      const toLeader = leaderAlive && (units <= count0 / 2 || r >= 3) ? 0.45 : 0;
      const ka = atk * (1 - toLeader) / (F.pow * 1.6);
      const kills = Math.min(units, Math.floor(ka) + (rng.chance(ka % 1) ? 1 : 0));
      units -= kills; out.kills += kills;
      morale -= (kills / Math.max(1, count0)) * 70;
      if (toLeader) leaderHp -= atk * toLeader * 0.9;
    } else if (leaderAlive) {
      leaderHp -= atk * 0.9;
    }
    if (leaderAlive && leaderHp <= 0) {
      leaderAlive = false; out.leaderDown = true; out.kills += 1; morale -= 90;
      log.push(pick(rng, [`${J(lname, '이/가')} 무릎을 꿇었다. 마지막 일격이 목을 갈랐다.`, `${lname}의 몸이 무너지듯 쓰러졌다.`, `${J(lname, '이/가')} 쓰러지자 주위가 한순간 조용해졌다.`]));
    }
    if (units <= 0 && !leaderAlive) { out.outcome = 'win'; break; }
    if (morale <= 22) {
      out.outcome = 'win';
      if (leaderAlive) { out.leaderFled = true; log.push(`무리가 무너졌다. ${J(lname, '은/는')} 남은 놈들을 버리고 어둠 속으로 달아났다.`); }
      else log.push(`남은 ${units}${F.human ? '명은' : '마리는'} ${F.human ? '무기를 버리고' : '꼬리를 말고'} 흩어졌다.`);
      break;
    }

    // 적의 공격
    if (r === 0 && firstRoundSafe) continue;
    let inc = ((F ? units * F.pow * 0.5 : 0) + (leaderAlive ? LP * 0.8 : 0)) * rng.float(0.6, 1.2);
    if (r === 0 && enemyFirst) inc *= 1.5;
    const mine = inc * share * 22 / (22 + myPow * 0.5);
    hp -= mine;
    if (mine >= 13 && rng.chance(0.55)) out.hits.push(r);
    if (comps.length && inc * (1 - share) > 18 && rng.chance(0.3)) out.compHits.push(pick(rng, comps).name);
    if (r === 1 || mine >= 13) { const ln = roundLine(rng, enc, mine); if (!log.includes(ln)) log.push(ln); }
    if (hp <= 0) { out.outcome = 'lose'; break; }
    if (hp <= (opts.flee ?? 30) && (units > 0 || leaderAlive)) {
      if (rng.chance(Math.max(0.25, Math.min(0.9, 0.45 + (g.player.stats.agi - 20) / 60)))) { out.outcome = 'flee'; log.push('더는 버틸 수 없었다. 등을 보이지 않으려 애쓰며 물러났다.'); break; }
      hp -= inc * share * 0.5 * 22 / (22 + myPow * 0.5);
      if (!log.includes('물러서려 했지만 적이 놓아주지 않았다.')) log.push('물러서려 했지만 적이 놓아주지 않았다.');
      if (hp <= 0) { out.outcome = 'lose'; break; }
    }
    if (r === 6) { out.outcome = 'flee'; log.push('싸움이 길어졌다. 서로 지쳐 물러났다.'); }
  }
  if (out.outcome === 'lose') log.push('눈앞이 하얘졌다. 땅이 솟아오르듯 다가왔다.');
  out.hp = Math.max(0, hp);
  out.hpLost = hp0 - out.hp;
  return out;
}

function describeCount(enc) {
  const F = FOES[enc.unit];
  if (F && enc.count) { const n = `${F.name} ${enc.count}${F.human ? '명' : '마리'}`; return enc.leader ? `${J(n, '과/와')} ${leaderName(enc)}` : n; }
  return leaderName(enc);
}

function roundLine(rng, enc, dmg) {
  const F = FOES[enc.unit] ?? FOES[enc.leader];
  if (dmg >= 20) return pick(rng, [`${F.name}의 일격이 제대로 들어왔다. 숨이 막혔다.`, '피가 눈으로 흘러들었다. 반쯤은 감으로 싸웠다.', '갈비뼈 쪽에서 무언가 부러지는 소리가 났다.']);
  if (dmg >= 13) return pick(rng, [`${F.weapon ? `${F.name}의 ${J(F.weapon, '이/가')}` : `${F.name}의 이빨이`} 살을 파고들었다.`, '방패 대신 팔로 막았다. 팔이 저려 왔다.', '등 뒤에서 덤벼든 놈을 늦게 보았다.']);
  return pick(rng, ['칼끝이 몇 번 스쳤지만 크게 다치지는 않았다.', '거친 숨소리와 쇳소리가 뒤엉켰다.', '발밑이 미끄러웠다. 피인지 진흙인지 알 수 없었다.']);
}
