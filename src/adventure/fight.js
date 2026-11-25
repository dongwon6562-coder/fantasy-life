// 싸움 장면: 싸움 전 선택지 → 교전 → 결과(보상, 부상, 끝이 아닌 패배, 나를 기억하는 적).
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, rngOf, circleOf, purse } from '../game.js';
import { living, byId, fullName, kill } from '../npc.js';
import { L, defineScene, queueScene, showScene, note, chron, stress, tired, check } from './core.js';
import { FOES, skirmish, skirmishStart, skirmishRounds, skirmishEnd, castBurst, moveOf, playerPower, playerVitality, threatWord, describeFoes, leaderName, foeTotal } from './combat.js';
import { PLACES } from '../places.js';
import { P as partyOf, ready as partyReady, compPow, addLoyalty, leave as leaveParty, ROLES } from '../party/core.js';

/* ---------- 동료 ---------- */
// 함께 싸워 줄 사람: 친한 모험가·기사 NPC (같은 곳에 있어야 한다)
export function companionsFor(g) {
  // 파티가 있으면 파티 동료가 함께 싸운다 (다친 동료는 빠진다)
  const party = partyReady(g).filter((p) => (p.place ?? 'ern') === L(g).place || L(g).travel);
  if (party.length) return party.map((p) => ({ name: p.name, pow: compPow(p), id: p.id, role: p.comp.role }));
  const here = L(g).place;
  return living(g)
    .filter((p) => !p.isPlayer && p.known && p.affection >= 35 && ['adventurer', 'guard', 'knight', 'hunter'].includes(p.job)
      && (p.place ?? 'ern') === here && p.ageMonths >= 16 * 12 && p.ageMonths < 50 * 12)
    .sort((a, b) => b.affection - a.affection)
    .slice(0, 2)
    .map((p) => ({ name: p.name, pow: 12 + p.skill * 0.45, id: p.id }));
}

/* ---------- 부상 ---------- */
const PARTS = ['팔', '다리', '어깨', '옆구리', '허벅지', '얼굴'];
export function woundName(rng, enc) {
  const F = FOES[enc.leader && rng.chance(0.4) ? enc.leader : enc.unit] ?? FOES[enc.leader];
  const part = PARTS[Math.floor(rng.next() * PARTS.length)];
  if (F.bite) return `${F.name}에게 물린 ${part}`;
  if (F.weapon && rng.chance(0.75)) return `${F.weapon}에 베인 ${part}`;
  return rng.chance(0.5) ? '부러진 갈비뼈' : `금 간 ${part === '얼굴' ? '광대뼈' : part + '뼈'}`;
}
export function addWound(g, rng, enc, months) {
  const name = woundName(rng, enc);
  g.player.injuries.push({ name, months });
  return name;
}

/* ---------- 나를 기억하는 적 ---------- */
const NEMESIS_NAMES = {
  goblin_chief: ['외눈박이 그락', '귀 잘린 스니크', '썩은니 보르그'],
  bandit_chief: ['붉은 수염 오도', '칼자국 베른', '늑대 이빨 하겐', '과부 마르가'],
  dire_wolf: ['흰 갈기', '찢긴 귀'],
  orc_chief: ['도끼 이빨 우그라트', '두 번 죽은 가르쉬'],
  hobgoblin: ['쇠턱'],
  cult_priest: ['재의 사제 오르반'],
  mana_bear: ['검은 등'],
};
function makeNemesis(g, rng, enc) {
  const life = L(g);
  if (!enc.leader || enc.nemesisId) return null;
  const names = NEMESIS_NAMES[enc.leader];
  if (!names) return null;
  const used = new Set(life.nemeses.map((n) => n.name));
  if (life.nemeses.filter((n) => n.alive).length >= 3) return null;
  const name = names.find((n) => !used.has(n));
  if (!name) return null;
  const n = { id: `n${life.nemeses.length + 1}_${g.date.year}`, name, unit: enc.leader, pow: Math.round((enc.leaderPow ?? FOES[enc.leader].pow) * 1.15), grudge: 1, place: life.place, met: 1, alive: true };
  life.nemeses.push(n);
  return n;
}
// 싸움을 만들 때 부르면, 가끔 예전에 놓친 적이 다시 나타난다
export function maybeNemesis(g, rng, enc) {
  if (!enc.leader) return enc;
  const cands = L(g).nemeses.filter((n) => n.alive && n.unit === enc.leader);
  if (!cands.length || !rng.chance(0.35)) return enc;
  const n = cands[0];
  return { ...enc, leaderName: n.name, leaderPow: n.pow, nemesisId: n.id };
}

/* ---------- 싸움 장면 ---------- */
// data: { enc, title, intro, reward: { money, merit: [fac, n], renown }, context, avoidText }
export function queueFight(g, rng, data, opt) {
  data.enc = maybeNemesis(g, rng, data.enc);
  queueScene(g, 'fight', data, opt);
}

defineScene('fight', {
  title: (g, s) => s.title ?? '싸움',
  text: (g, s) => {
    const comps = companionsFor(g);
    const pow = playerPower(g) + comps.reduce((a, c) => a + c.pow, 0);
    const n = s.enc.nemesisId ? L(g).nemeses.find((x) => x.id === s.enc.nemesisId) : null;
    const nem = n ? ` 무리 뒤에 낯익은 얼굴이 있다. ${n.name}. 지난번에 놓친 그놈이다. 놈도 나를 알아보았다.` : '';
    const withC = comps.length ? ` ${J(comps.map((c) => c.name).join(', '), '이/가')} 곁에 있다.` : '';
    const T = TERRAINS[terrainOf(g, s)];
    return `${s.intro}${nem} 적: ${describeFoes(s.enc)}.${withC} ${T.line} 가늠해 보니, ${threatWord(pow, s.enc)}`;
  },
  choices: (g, s) => {
    const out = [{ label: '정면으로 맞선다', key: 'charge' }, { label: '기습을 노린다', key: 'ambush' }];
    if (circleOf(g) >= 1) out.push({ label: '마법으로 먼저 친다', key: 'magic' });
    out.push({ label: s.avoidLabel ?? '싸우지 않고 물러난다', key: 'avoid' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'avoid') return avoidFight(g, rng, s);
    if (s.oneShot) return runFight(g, rng, s, key);
    return beginBeats(g, rng, s, key);
  },
});

function avoidFight(g, rng, s) {
  const life = L(g);
  stress(g, 6);
  if (s.avoidCost) g.player.money -= Math.floor(purse(g) * s.avoidCost);
  if (s.reward?.merit) {
    const [fac] = s.reward.merit;
    if (life.fac[fac]) life.fac[fac].merit = Math.max(0, life.fac[fac].merit - Math.ceil(s.reward.merit[1] / 2));
  }
  return s.avoidText ?? '싸움을 피했다. 살아남는 것도 실력이라고 스스로를 달랬다.';
}

export function runFight(g, rng, s, tactic, extra = {}) {
  const r = fightFull(g, rng, s, tactic, extra);
  return extra.short ? r : r.text;
}

function fightFull(g, rng, s, tactic, extra) {
  const comps = extra.companions ?? companionsFor(g);
  const r = skirmish(g, rng, s.enc, { tactic, companions: comps, flee: extra.flee ?? 30, hp: extra.hp });
  return fightAfter(g, rng, s, r, comps, extra);
}
// 싸움이 끝난 뒤: 부상, 동료, 숙적, 보상 (한 번에 치든 고비마다 고르든 같은 길)
function fightAfter(g, rng, s, r, comps, extra = {}) {
  const life = L(g);
  life.stats.fights += 1;
  life.stats.kills += r.kills;
  tired(g, extra.noTire ? 0 : 15);
  const lines = [...r.log];
  // 부상
  const wounds = new Set();
  for (const _ of r.hits.slice(0, 2)) {
    const w = addWound(g, rng, s.enc, rng.int(1, 3));
    if (!wounds.has(w)) lines.push(`(부상: ${w})`);
    wounds.add(w);
  }
  // 동료
  for (const name of [...new Set(r.compHits)]) {
    const c = comps.find((x) => x.name === name);
    const p = c?.id ? byId(g, c.id) : null;
    const guard = comps.some((x) => ROLES[x.role]?.guard && x.name !== name);
    const healer = comps.some((x) => ROLES[x.role]?.heal && x.name !== name);
    if (p && rng.chance(0.12 * (guard ? 0.6 : 1) * (healer ? 0.5 : 1))) {
      kill(g, p, `${J(describeFoes(s.enc), '과/와')} 싸우다`);
      if (p.comp) { partyOf(g).fallen.push({ name: `${p.name} ${p.lastName}`, year: g.date.year, role: p.comp.role, cause: describeFoes(s.enc) }); leaveParty(g, p); }
      lines.push(`${J(fullName(p), '이/가')} 쓰러져 다시 일어나지 못했다. 그 얼굴을 오래 잊지 못할 것이다.`);
      stress(g, 30);
      note(g, `${J(fullName(p), '이/가')} 나와 함께 싸우다 죽었다.`);
      chron(g, `${fullName(p)}, ${J(g.player.name, '과/와')} 함께 싸우다 전사하다.`);
    } else if (p) {
      p.affection = Math.min(100, p.affection + 4);
      p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 함께 싸우다 다쳤다.` });
      if (p.comp) { p.comp.out = Math.max(p.comp.out ?? 0, rng.int(1, healer ? 1 : 3)); addLoyalty(p, p.traits.includes('timid') ? -4 : 1); }
      lines.push(`${J(p.name, '이/가')} 다쳤지만 목숨은 건졌다.${p.comp?.out ? ` 몇 달은 쉬어야 한다.` : ''}`);
    }
  }
  const won = r.outcome === 'win' || r.outcome === 'overwhelm';
  for (const c of comps) {
    const p = c.id ? byId(g, c.id) : null;
    if (p?.alive) { p.affection = Math.min(100, p.affection + 3); }
    if (p?.alive && p.comp) {
      p.comp.fights += 1;
      if (won) { p.comp.wins += 1; addLoyalty(p, (p.traits.includes('brave') ? 3 : 2) * (p.comp.loyalty > 70 ? 0.25 : 1)); p.skill = Math.min(100, p.skill + 0.4); }
      else if (r.outcome === 'lose') addLoyalty(p, p.traits.includes('timid') ? -7 : -3);
    }
  }
  if (comps.length && r.outcome !== 'lose' && !extra.short) lines.splice(1, 0, `${J(comps.map((c) => c.name).join(', '), '이/가')} 등을 맡아 주었다.`);

  const nem = s.enc.nemesisId ? life.nemeses.find((x) => x.id === s.enc.nemesisId) : null;
  if (nem) nem.met += 1;
  if (r.outcome === 'win' || r.outcome === 'overwhelm') {
    if (nem && r.leaderDown) { nem.alive = false; lines.push(`${J(nem.name, '은/는')} 이번에는 달아나지 못했다. 오래 묵은 빚을 갚은 기분이었다.`); note(g, `숙적 ${J(nem.name, '을/를')} 쓰러뜨렸다.`); chron(g, `${g.player.name}, 숙적 ${J(nem.name, '을/를')} 쓰러뜨리다.`); life.renown += 6; }
    if (r.leaderFled) {
      if (nem) { nem.grudge += 1; nem.pow = Math.round(nem.pow * 1.1); }
      else { const n = makeNemesis(g, rng, s.enc); if (n) lines.push(`달아난 놈의 이름을 나중에 들었다. ${n.name}. 놈은 나를 잊지 않을 것이다.`); }
    }
    lines.push(reward(g, rng, s.reward));
    if (s.onWin) lines.push(s.onWin);
    return { text: lines.filter(Boolean).join(' '), outcome: r.outcome, hp: r.hp };
  }
  if (r.outcome === 'flee') {
    stress(g, 8);
    if (s.reward?.merit) { const [fac, n] = s.reward.merit; if (life.fac[fac]) life.fac[fac].merit += Math.floor(n / 4); }
    lines.push(s.fleeText ?? '목숨은 건졌지만 아무것도 얻지 못했다.');
    return { text: lines.join(' '), outcome: r.outcome, hp: r.hp };
  }
  // 졌다: 끝이 아닌 패배
  lines.push(defeat(g, rng, s, comps));
  if (s.enc.leader && !nem) {
    const n = makeNemesis(g, rng, s.enc);
    if (n) lines.push(`정신을 잃기 직전, ${n.name}이라 불리는 놈이 나를 내려다보며 웃는 것을 보았다.`);
  } else if (nem) { nem.grudge += 1; nem.pow = Math.round(nem.pow * 1.08); }
  return { text: lines.join(' '), outcome: r.outcome, hp: r.hp };
}

function reward(g, rng, rw = {}) {
  const life = L(g);
  const out = [];
  if (rw.money) { g.player.money += rw.money; out.push(`은화 ${rw.money}닢`); }
  if (rw.merit) { const [fac, n] = rw.merit; if (life.fac[fac]) { life.fac[fac].merit += n; out.push(`공적 +${n}`); } }
  if (rw.renown) { life.renown += rw.renown; }
  return out.length ? `(${out.join(', ')})` : '';
}

function defeat(g, rng, s, comps) {
  const p = g.player;
  stress(g, 25);
  const human = FOES[s.enc.unit]?.human || FOES[s.enc.leader]?.human;
  let mortal = (human ? 0.18 : 0.32) - comps.length * 0.08 - (comps.some((c) => ROLES[c.role]?.heal) ? 0.1 : 0);
  if (L(g).gear.armor >= 7) mortal -= 0.06;
  // 지니고 다니던 돈만 잃는다 (모아 둔 돈 전부를 들고 다니지는 않는다)
  const lost = Math.min(p.money, human ? rng.int(10, 40) : rng.int(0, 12));
  p.money -= lost;
  const wound = addWound(g, rng, s.enc, rng.int(3, 5));
  note(g, `${describeFoes(s.enc)}에게 패해 크게 다쳤다.`);
  if (rng.chance(Math.max(0.05, mortal))) {
    p.injuries.push({ name: `치명상 (${wound})`, months: 2, mortal: true });
    return `${comps.length ? `${J(comps[0].name, '이/가')} 나를 끌고 빠져나왔다.` : '지나던 사냥꾼이 쓰러진 나를 발견했다.'} 상처가 깊다. 열이 끓고, 숨이 얕다. 다음 달을 넘길 수 있을지 아무도 장담하지 못한다.${lost ? ` 주머니에서 은화 ${lost}닢이 사라졌다.` : ''}`;
  }
  if (human) return `깨어 보니 길가 도랑이었다. 놈들은 목숨 대신 가진 것을 가져갔다.${lost ? ` 은화 ${lost}닢을 잃었다.` : ''} (${wound})`;
  return `${comps.length ? `${J(comps[0].name, '이/가')} 나를 들쳐 업고 달렸다.` : '어떻게 빠져나왔는지 기억나지 않는다. 기어서 나왔다고 했다.'} 살아 있다. 그것만으로도 운이 좋았다. (${wound})`;
}

/* ---------- 치명상: 한 달 뒤 생사가 갈린다 ---------- */
HOOKS.endOfMonth.push((g, rng) => {
  if (g.over) return;
  const p = g.player;
  const mortal = p.injuries.find((i) => i.mortal);
  if (!mortal || mortal.checked) return;
  mortal.checked = true;
  let risk = 0.42 - p.stats.wil / 300 - (p.fatigue < 30 ? 0.08 : 0);
  if (L(g).job?.id === 'cleric' || L(g).fac.church?.member) risk -= 0.1; // 교단의 치유
  if (p.money >= 15) { p.money -= 10; risk -= 0.1; } // 의원을 부른다
  if (rng.chance(Math.max(0.05, risk))) {
    L(g).pendingDeath = `${mortal.name.replace(/^치명상 \((.*)\)$/, '$1')}의 상처`;
    return;
  }
  p.injuries = p.injuries.filter((i) => i !== mortal);
  const inner = mortal.name.replace(/^치명상 \((.*)\)$/, '$1');
  p.injuries.push({ name: /베인|물린/.test(inner) ? `깊이 ${inner}` : `${inner} (덧난 상처)`, months: 4 });
  g.news.unshift({ text: '열이 내렸다. 죽음의 문턱에서 돌아왔다. 상처는 오래 남을 것이다.', rel: 100 });
  note(g, '치명상을 이겨 내고 살아남았다.');
});

export { rngOf, me };

/* ---------- 46단계: 고비마다 고르는 교전 ----------
   첫 고비 = 싸움 전 고르기(정면·기습·마법). 두 합을 치고 둘째 고비, 두 합을 더 치고 셋째 고비, 남은 합으로 끝.
   고비마다 고르기는 지형(숲·다리·골목·눈밭·굴·들판)과 적의 움직임(둘러쌈·돌진·도망·떼·겁 없음·주문)에 따라 달라진다.
   아무것도 고르지 않은 셈(그대로 밀어붙인다)이면 예전 교전과 수치가 거의 같다. 고르는 것은 주고받기다. */
export const TERRAINS = {
  forest: { name: '숲', line: '나무가 빽빽해서 칼을 크게 휘두를 수 없다.', label: '나무 사이로 끌어들인다', icon: 'hunt', hint: '둘러싸이지 않는다', atk: 0.95, inc: 0.8, counters: ['pack', 'charge', 'swarm'], text: ['굵은 나무를 등지고 섰다. 한 번에 덤빌 수 있는 놈이 둘을 넘지 않았다.', '나무 사이를 누비며 놈들을 한 줄로 끌어냈다. 둘러쌀 틈을 주지 않았다.'] },
  bridge: { name: '다리', line: '좁은 다리 위다. 한 사람이 겨우 지나간다.', label: '다리목을 막아선다', icon: 'shield', hint: '한 놈씩만 덤빈다', atk: 0.9, inc: 0.65, counters: ['pack', 'swarm', 'charge'], text: ['다리목에 버티고 섰다. 놈들은 하나씩밖에 건너오지 못했다.', '난간을 등지고 다리 한가운데를 막았다. 밀려난 놈 하나가 물로 떨어졌다.'] },
  alley: { name: '골목', line: '좁은 골목이다. 빨랫줄과 술통이 길을 막는다.', label: '골목 안쪽으로 몰아넣는다', icon: 'door', hint: '겁을 먹인다', atk: 1.1, mor: 15, counters: ['flee', 'swarm'], text: ['술통을 걷어차 길을 막고 놈들을 막다른 골목으로 몰았다. 겁먹은 얼굴들이 보였다.', '빨랫줄을 끊어 놈들 머리 위로 떨어뜨렸다. 허둥대는 사이 골목 끝으로 몰아붙였다.'] },
  snow: { name: '눈밭', line: '눈이 무릎까지 쌓였다. 발이 잘 빠지지 않는다.', label: '눈보라 속에 숨었다가 친다', icon: 'wander', hint: '세게 치지만 지친다', atk: 1.2, inc: 0.9, tire: 8, counters: ['charge'], text: ['눈보라가 시야를 가린 틈에 옆으로 돌아 들어갔다. 몸은 얼어붙었지만 칼끝은 정확했다.', '눈더미 뒤에 엎드려 기다렸다. 발이 빠진 놈부터 쳤다.'] },
  cave: { name: '굴', line: '어둡고 습하다. 횃불 하나에 그림자가 길다.', label: '횃불을 휘둘러 몰아낸다', icon: 'torch', hint: '겁 없는 것도 불은 꺼린다', atk: 1.0, inc: 0.85, mor: 12, counters: ['undead', 'pack'], text: ['횃불을 크게 휘둘렀다. 불빛에 놈들이 움찔 물러섰다.', '횃불을 바닥에 던져 불길을 세웠다. 놈들이 불 너머에서 머뭇거렸다.'] },
  field: { name: '들판', line: '탁 트인 들판이다. 숨을 곳이 없다.', label: '거리를 벌리고 숨을 고른다', icon: 'boot', hint: '돌진과 주문을 피한다', atk: 0.9, inc: 0.8, counters: ['charge', 'caster'], text: ['뒤로 몇 걸음 물러나 거리를 벌렸다. 돌진해 오던 놈들의 발이 엉켰다.', '바람을 등지고 원을 그리며 돌았다. 놈들이 숨을 헐떡이기 시작했다.'] },
};
const MOVE_WORD = { pack: '둘러싼다', flee: '불리하면 달아난다', charge: '돌진한다', swarm: '떼로 기어든다', undead: '겁을 모른다', caster: '주문을 쓴다' };
const MOVE_LINE = {
  pack: (F) => `${F.name}들이 둥글게 돌며 등 뒤를 노린다.`,
  flee: () => '몇 놈이 벌써 뒤를 힐끔거린다. 형세가 기울면 달아날 놈들이다.',
  charge: (F) => `${J(F.name, '이/가')} 고함을 지르며 다시 돌진해 온다.`,
  swarm: (F) => `${F.name}들이 사방에서 기어든다. 쓰러뜨려도 또 나온다.`,
  undead: () => '쓰러진 놈들 사이로 남은 것들이 아무렇지 않게 걸어온다. 겁을 모르는 것들이다.',
  caster: () => '뒤쪽에서 낮은 영창 소리가 들린다. 검은 불꽃이 모인다.',
};
const isTown = (pl) => /도시|왕도|성읍|항|수도|도성/.test(PLACES[pl]?.kind ?? '');
// 지형은 주사위 없이 정한다 (세상 주사위를 건드리지 않게)
export function terrainOf(g, s) {
  if (s.terrain && TERRAINS[s.terrain]) return s.terrain;
  const enc = s.enc, mv = moveOf(enc), F = FOES[enc.unit] ?? FOES[enc.leader] ?? {};
  if (mv === 'undead' || ['cave_spider', 'spider_queen', 'sewer_horror', 'giant_rat'].includes(enc.unit ?? enc.leader) || /delve|dungeon|deep|mine|ruin|tower/.test(s.context ?? '')) return 'cave';
  const m = g.date.month, road = !!L(g).travel, pl = L(g).place ?? 'ern', town = !road && isTown(pl);
  if ((m === 12 || m <= 2) && !town) return 'snow';
  if (town && F.human) return 'alley';
  const h = (pl.length * 7 + m * 13 + (enc.count ?? 1) * 3) % 10;
  if (road) return h < 3 ? 'bridge' : h < 7 ? 'forest' : 'field';
  return F.bite ? 'forest' : h < 5 ? 'field' : 'forest';
}
const hpWord = (r) => (r >= 0.75 ? '아직 숨이 고르다' : r >= 0.5 ? '숨이 차오른다' : r >= 0.3 ? '다리가 후들거린다' : '서 있는 게 용하다');
const foeWord = (st) => {
  const left = st.count0 ? st.units / st.count0 : 0;
  const lr = st.leaderAlive ? Math.max(0, st.leaderHp) / Math.max(1, st.leaderHp0) : 0;
  if (!st.units && st.leaderAlive) return lr >= 0.7 ? '우두머리만 남았다. 아직 멀쩡하다' : lr >= 0.35 ? '우두머리만 남았다. 피를 흘린다' : '우두머리만 남았다. 비틀거린다';
  return left >= 0.75 ? '아직 거의 그대로다' : left >= 0.45 ? '절반쯤 남았다' : '몇 남지 않았다';
};
const ORD = ['첫', '둘째', '셋째'];
const COMP_LINE = {
  blade: (n, F) => `${J(n, '이/가')} 옆에서 ${F.name} 하나를 베어 넘겼다.`,
  shield: (n) => `${J(n, '이/가')} 방패로 내게 오는 일격을 받아 냈다.`,
  archer: (n, F) => `${n}의 화살이 ${F.name}의 어깨에 꽂혔다.`,
  scout: (n) => `${J(n, '이/가')} 뒤로 돌아가는 놈을 먼저 보고 소리쳤다.`,
  mage: (n) => `${n}의 얼음 창이 앞줄을 흩었다.`,
  healer: (n) => `${J(n, '이/가')} 내 상처를 재빨리 묶어 주었다.`,
};
function allyLine(st, comps, beat) {
  if (!comps.length) return null;
  const c = comps[(beat + st.r) % comps.length], F = FOES[st.enc.unit] ?? FOES[st.enc.leader];
  return (COMP_LINE[c.role] ?? ((n) => `${J(n, '이/가')} 등을 맡아 주었다.`))(c.name, F);
}

function beatOptions(g, b) {
  const st = b.st, T = TERRAINS[b.terrain], lname = leaderName(st.enc), out = [];
  out.push({ id: 'press', label: '그대로 밀어붙인다', hint: '하던 대로', icon: 'sword' });
  out.push({ id: 'terrain', label: T.label, hint: T.hint, icon: T.icon });
  if (st.leaderAlive) out.push({ id: 'leader', label: `${lname}에게 곧장 파고든다`, hint: '우두머리를 쓰러뜨리면 무리가 흩어진다', icon: 'crown' });
  if (st.units > 1) out.push({ id: 'flank', label: '옆으로 돌아 친다', hint: '날래면 크게 먹히고, 들키면 크게 맞는다', icon: 'boot' });
  if (circleOf(g) >= 1 && g.player.fatigue < 90) out.push({ id: 'spell', label: '주문을 외운다', hint: '지치지만 한꺼번에 친다', icon: 'magic' });
  if (b.comps.length) out.push({ id: 'guard', label: `${b.comps[0].name}의 앞을 막아선다`, hint: '동료가 다치지 않는다', icon: 'shield' });
  out.push({ id: 'retreat', label: '물러난다', hint: '날래면 빠져나간다', icon: 'door' });
  out.push({ id: 'hold', label: '앞줄을 지키며 버틴다', hint: '덜 맞고 덜 벤다', icon: 'shield' });
  return out.slice(0, 8);
}

function beatMod(g, rng, b, key, lines) {
  const st = b.st, T = TERRAINS[b.terrain], mv = b.mv, mod = {};
  let counters = [];
  const mul = (k, v) => { mod[k] = (mod[k] ?? 1) * v; };
  if (key === 'hold') { mul('atk', 0.85); mul('inc', 0.8); counters = ['pack', 'charge']; lines.push(rng.pick(['앞줄을 지키며 한 발도 물러서지 않았다.', '자세를 낮추고 막는 데 힘을 썼다. 서두르지 않았다.', '칼을 세워 들고 들어오는 놈만 쳐 냈다.'])); }
  else if (key === 'terrain') {
    if (T.atk) mul('atk', T.atk); if (T.inc) mul('inc', T.inc);
    if (T.mor) st.morale -= T.mor;
    if (T.tire) tired(g, T.tire);
    counters = T.counters; lines.push(rng.pick(T.text));
  } else if (key === 'leader') { mod.toLeader = 0.8; mul('inc', 1.1); counters = ['caster']; lines.push(rng.pick([`무리를 헤치고 ${leaderName(st.enc)}에게 곧장 파고들었다.`, `졸개들은 내버려 두고 ${J(leaderName(st.enc), '을/를')} 향해 달려들었다.`])); }
  else if (key === 'flank') {
    counters = ['swarm'];
    if (check(rng, g.player.stats.agi + g.player.stats.sen / 2, 40)) { mul('atk', 1.35); st.morale -= 10; lines.push('몸을 낮춰 옆으로 돌아 들어갔다. 놈들의 옆구리가 훤히 비었다.'); }
    else { mul('inc', 1.25); lines.push('옆으로 돌다가 들켰다. 등을 내준 꼴이 되었다.'); }
  } else if (key === 'spell') { counters = ['swarm', 'caster']; castBurst(g, rng, st, 1, 0, false); }
  else if (key === 'guard') { mod.noComp = true; mul('inc', 1.1); counters = ['pack']; lines.push(`${b.comps[0].name}의 앞을 막아섰다. 내 쪽으로 칼날이 몰렸다.`); }
  else if (key === 'retreat') {
    if (rng.chance(Math.max(0.25, Math.min(0.9, 0.5 + (g.player.stats.agi - 20) / 60)))) { st.out.outcome = 'flee'; st.done = true; lines.push('틈을 보아 몸을 뺐다. 놈들은 쫓아오지 않았다.'); return mod; }
    mul('inc', 1.2); lines.push('물러서려 했지만 놈들이 길을 막았다. 다시 칼을 들어야 했다.');
  } else lines.push(rng.pick(['이를 악물고 다시 앞으로 나섰다.', '숨 돌릴 틈 없이 다시 칼을 휘둘렀다.', '하던 대로 밀어붙였다.']));
  // 적의 움직임
  if (mv === 'pack' && st.units >= 3 && !counters.includes('pack')) mul('inc', 1.1);
  if (mv === 'charge' && !counters.includes('charge')) mod.firstInc = 1.3;
  if (mv === 'charge' && key === 'hold') mod.firstAtk = 1.25;
  if (mv === 'flee') mod.brk = key === 'terrain' && b.terrain === 'alley' ? 34 : 30;
  if (mv === 'swarm' && st.units >= 4 && !counters.includes('swarm')) mul('inc', 1.05);
  if (mv === 'undead' && !counters.includes('undead')) mod.mor = 0.7;
  if (mv === 'caster' && !counters.includes('caster')) mul('inc', 1.15);
  return mod;
}

function makeBeat(g, s, st, comps, beat, terrain, extra) {
  const { choices, ...fs } = s;
  return { kind: 'fight_beat', at: L(g).place, t: g.date.year * 12 + g.date.month, keep: true, fs, st, comps, beat, terrain, mv: moveOf(s.enc), ...extra };
}
function showBeat(g, b) {
  b.view = viewOf(g, b);
  if (!showScene(g, b, { force: true })) { L(g).queue.unshift(b); }
}
const cntOf = (st) => (FOES[st.enc.unit]?.human ? '명' : '마리');
const killsWord = (n, c) => (n > 0 ? `${J(`${n}${c}`, '을/를')} 쓰러뜨렸다` : '아무도 쓰러뜨리지 못했다');
// 한 고비 동안 쓰러뜨린 무리를 한 줄로 (우두머리는 따로 글이 있다)
function felledLine(st, before) {
  const F = FOES[st.enc.unit], n = before - st.units;
  return F && n > 0 ? `${J(`${F.name} ${n}${cntOf(st)}`, '이/가')} 쓰러졌다.` : null;
}
function stageLine(st, label, k0) {
  const k = st.out.kills - k0;
  return `${label}: ${killsWord(k, cntOf(st))}${st.done ? ` · ${{ win: '이겼다', overwhelm: '압승', flee: '물러났다', lose: '쓰러졌다' }[st.out.outcome]}` : ''}`;
}
const TACTIC_LABEL = { charge: '정면으로 맞섰다', ambush: '기습을 노렸다', magic: '마법으로 먼저 쳤다' };

function beginBeats(g, rng, s, tactic) {
  const comps = companionsFor(g);
  const inj0 = g.player.injuries.length;
  const st = skirmishStart(g, rng, s.enc, { tactic, companions: comps, flee: 30 });
  const terrain = terrainOf(g, s);
  const u0 = st.units;
  if (!st.done) { skirmishRounds(g, rng, st, 2); const fl = felledLine(st, u0); if (fl && !st.done) st.out.log.push(fl); }
  const b = makeBeat(g, s, st, comps, 2, terrain, { inj0, stages: [stageLine(st, TACTIC_LABEL[tactic] ?? '맞섰다', 0)] });
  if (st.done) return endBeats(g, rng, b, 0);
  const text = st.out.log.join(' ');
  st.shown = st.out.log.length;
  showBeat(g, b);
  return text;
}
function endBeats(g, rng, b, from) {
  const st = b.st, r = skirmishEnd(st);
  const res = fightAfter(g, rng, b.fs, { ...r, log: r.log.slice(from) }, b.comps, {});
  const wounds = g.player.injuries.slice(b.inj0 ?? 0).map((w) => w.name);
  g.lastFight = { kind: 'skirmish', title: b.fs.title ?? '싸움', result: r.outcome, word: { win: '이겼다', overwhelm: '압승', flee: '물러났다', lose: '졌다' }[r.outcome], stages: b.stages ?? [], wounds, kills: r.kills, loot: /\((은화|공적)[^)]*\)/.exec(res.text)?.[0]?.slice(1, -1) ?? null, y: g.date.year, m: g.date.month, terrain: b.terrain, foe: describeFoes(st.enc) };
  return res.text;
}

defineScene('fight_beat', {
  keep: true,
  need: (g, s) => !!s.st && !s.st.done,
  title: (g, s) => `${s.fs.title ?? '싸움'}: ${ORD[s.beat - 1] ?? '마지막'} 고비`,
  text: (g, s) => {
    const st = s.st, F = FOES[st.enc.unit] ?? FOES[st.enc.leader], T = TERRAINS[s.terrain];
    const mv = s.mv && (s.mv !== 'pack' || st.units >= 3) ? ` ${MOVE_LINE[s.mv](F)}` : '';
    const crux = cruxOf(st) ? ' 지금이 갈림길이다.' : '';
    return `${describeFoes({ ...st.enc, count: st.units, leader: st.leaderAlive ? st.enc.leader : null }) || '적'}. ${foeWord(st)}.${mv} 나는 ${hpWord(st.hp / st.hp0)}. ${T.line}${crux}`;
  },
  choices: (g, s) => beatOptions(g, s).map((o) => ({ label: o.label, key: o.id })),
  resolve(g, rng, s, key) {
    const st = s.st, lines = [], k0 = st.out.kills;
    const mod = beatMod(g, rng, s, key, lines);
    st.out.log.push(...lines);
    const from = st.shown ?? 0, u0 = st.units;
    if (!st.done) skirmishRounds(g, rng, st, s.beat === 2 ? 4 : 7, mod);
    const fl = felledLine(st, u0); if (fl && !st.done) st.out.log.push(fl);
    const al = allyLine(st, s.comps, s.beat);
    if (al && !st.done) { st.out.log.push(al); if (s.comps.some((c) => c.role === 'healer')) st.hp = Math.min(st.hp0, st.hp + 4); }
    const label = beatOptions(g, s).find((o) => o.id === key)?.label ?? key;
    s.stages = [...(s.stages ?? []), stageLine(st, label, k0)];
    if (st.done) return endBeats(g, rng, s, from);
    const text = st.out.log.slice(from).join(' ');
    st.shown = st.out.log.length;
    if (s.beat >= 3) { skirmishRounds(g, rng, st, 7); return `${text} ${endBeats(g, rng, s, st.shown)}`; }
    showBeat(g, { ...s, beat: s.beat + 1, choices: undefined });
    return text;
  },
});
const cruxOf = (st) => (st.leaderAlive && st.units <= st.count0 / 2) || st.hp / st.hp0 < 0.35;

/* ---------- 화면·그림용 ---------- */
function viewOf(g, b) {
  const st = b.st, F = FOES[st.enc.unit] ?? null, T = TERRAINS[b.terrain];
  const hpThem = (F ? st.units * F.pow : 0) + Math.max(0, st.leaderAlive ? st.leaderHp : 0), hp0Them = (F ? st.count0 * F.pow : 0) + st.leaderHp0;
  return {
    kind: 'skirmish', stage: b.beat, stages: 3, terrain: b.terrain, terrainName: T.name,
    us: { hp: Math.round(st.hp), hp0: Math.round(st.hp0), word: hpWord(st.hp / st.hp0) },
    them: { name: describeFoes(st.enc), unit: st.enc.unit ?? null, leader: st.enc.leader ?? null, count: st.units, count0: st.count0, leaderAlive: st.leaderAlive, hp: Math.round(hpThem), hp0: Math.round(hp0Them), word: foeWord(st), how: b.mv, howWord: MOVE_WORD[b.mv] ?? null },
    allies: b.comps.map((c) => `${c.name}${ROLES[c.role] ? ` (${ROLES[c.role].name})` : ''}`),
    options: beatOptions(g, b),
    crux: cruxOf(st),
    last: b.stages?.at(-1) ?? null,
  };
}
// 지금 떠 있는 교전 장면의 모양 (첫 고비는 싸움 전 고르기)
export function skirmishView(g) {
  const s = L(g).scene;
  if (!s) return null;
  if (s.kind === 'fight_beat') return viewOf(g, s);
  if (s.kind !== 'fight' || !s.enc) return null;
  const comps = companionsFor(g), hp = playerVitality(g), F = FOES[s.enc.unit] ?? null, terrain = terrainOf(g, s), mv = moveOf(s.enc);
  const tot = Math.round(foeTotal(s.enc));
  return {
    kind: 'skirmish', stage: 1, stages: 3, terrain, terrainName: TERRAINS[terrain].name,
    us: { hp: Math.round(hp), hp0: Math.round(hp), word: hpWord(1) },
    them: { name: describeFoes(s.enc), unit: s.enc.unit ?? null, leader: s.enc.leader ?? null, count: s.enc.count ?? 0, count0: s.enc.count ?? 0, leaderAlive: !!s.enc.leader, hp: tot, hp0: tot, word: threatWord(playerPower(g) + comps.reduce((a, c) => a + c.pow, 0), s.enc), how: mv, howWord: MOVE_WORD[mv] ?? null },
    allies: comps.map((c) => `${c.name}${ROLES[c.role] ? ` (${ROLES[c.role].name})` : ''}`),
    options: (s.choices ?? []).map((c) => ({ id: c.key, label: c.label, icon: { charge: 'sword', ambush: 'dagger', magic: 'magic', avoid: 'door' }[c.key] ?? 'sword', hint: { charge: '하던 대로', ambush: '들키지 않으면 먼저 친다', magic: '한꺼번에 친다', avoid: '싸우지 않는다' }[c.key] ?? null })),
    crux: false, last: null, unitPow: F?.pow ?? null,
  };
}
