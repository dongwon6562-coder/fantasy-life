// 싸움 장면: 싸움 전 선택지 → 교전 → 결과(보상, 부상, 끝이 아닌 패배, 나를 기억하는 적).
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { me, rngOf, circleOf, purse } from '../game.js';
import { living, byId, fullName, kill } from '../npc.js';
import { L, defineScene, queueScene, note, chron, stress, tired } from './core.js';
import { FOES, skirmish, playerPower, threatWord, describeFoes, leaderName } from './combat.js';
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
    return `${s.intro}${nem} 적: ${describeFoes(s.enc)}.${withC} 가늠해 보니, ${threatWord(pow, s.enc)}`;
  },
  choices: (g, s) => {
    const out = [{ label: '정면으로 맞선다', key: 'charge' }, { label: '기습을 노린다', key: 'ambush' }];
    if (circleOf(g) >= 1) out.push({ label: '마법으로 먼저 친다', key: 'magic' });
    out.push({ label: s.avoidLabel ?? '싸우지 않고 물러난다', key: 'avoid' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'avoid') return avoidFight(g, rng, s);
    return runFight(g, rng, s, key);
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
  const life = L(g);
  const comps = extra.companions ?? companionsFor(g);
  const r = skirmish(g, rng, s.enc, { tactic, companions: comps, flee: extra.flee ?? 30, hp: extra.hp });
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
