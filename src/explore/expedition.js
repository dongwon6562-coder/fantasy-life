// 원정대 꾸리기와 원정의 달들.
// - 떠나는 고장(땅마다 정해져 있다)에서 "원정대를 꾸린다". 식량을 넉넉히(짐꾼 둘) 또는 가볍게.
// - 가는 길은 땅마다 넉 달에서 다섯 달, 돌아오는 길은 그 절반. 달마다 장면 하나(explore_leg).
// - 식량이 떨어지면 굶주린다. 사기가 바닥나면 짐꾼이 들고일어난다. 길을 잃으면 그달은 나아가지 못한다.
// - 가장 깊은 곳에서 '심장'(explore_heart)을 만난다. 처음 찾았으면 이름을 붙인다(explore_name).
// - 원정 동안에는 할 수 있는 일이 줄어든다(actionFilter). 돌아오면 짐을 푼다(explore_home).
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill, circleOf } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, traveling, isAdult, note, chron, stress, tired, check } from '../adventure/core.js';
import { runFight, companionsFor } from '../adventure/fight.js';
import { playerPower, threatWord } from '../adventure/combat.js';
import { members as partyMembers, P as partyOf, leave as leaveParty, addLoyalty } from '../party/core.js';
import { kill, fullName } from '../npc.js';
import { isJailed } from '../crime.js';
import { hasRelic, charmBonus } from '../deep/core.js';
import { S as seaOf } from '../sea/core.js';
import { hasKind, huntBonus } from '../beasts/core.js';
import { J } from '../narrative/text.js';
import {
  E, REGIONS, SITES, CIVS, SITE_SHORT, FINDS, regionsFrom, regionOf, claimFirst, addFame, logExplore, keepVal, keepBonus, findName, mi,
} from './core.js';

export const FOOD_PRICE = 3;
export const PORTER_PRICE = 4;
export const CHARTER = 30;
const won = (r) => r.outcome === 'win' || r.outcome === 'overwhelm';
const backOf = (legs) => Math.ceil(legs / 2);
export const tripMonths = (R) => R.legs + backOf(R.legs);
const hasShip = (g) => !!seaOf(g).ship;
export function planCost(g, rid, full) {
  const R = REGIONS[rid];
  const food = tripMonths(R) + (full ? 2 : 0);
  return food * FOOD_PRICE + (full ? 2 * PORTER_PRICE : 0) + (R.sea && !hasShip(g) ? CHARTER : 0);
}
const awayBlocked = (g) => isJailed(g) || !!g.army?.service || !!g.army?.captive || !!g.army?.campaign;
export const canPlan = (g) => isAdult(g) && !traveling(g) && !E(g).exp && !awayBlocked(g) && !g.player.injuries.some((i) => i.mortal) && regionsFrom(L(g).place).length > 0;

/* ---------- 원정대 꾸리기 ---------- */
ACTIONS.push({
  id: 'explore_plan',
  name: '원정대를 꾸린다',
  icon: 'wander',
  desc: '지도가 끝나는 곳 너머로 갈 원정대를 꾸린다. 몇 달 동안 돌아오지 못한다. 식량과 짐꾼에 돈이 든다.',
  available: (g) => canPlan(g) && !sceneQueued(g, 'explore_plan'),
  run(g) { queueScene(g, 'explore_plan'); return '주점 구석에 낡은 지도를 펴고, 지도가 끝나는 곳에 손가락을 올렸다.'; },
});
defineScene('explore_plan', {
  need: (g) => canPlan(g),
  title: () => '지도가 끝나는 곳',
  text: (g) => {
    const rows = regionsFrom(L(g).place).map((rid) => {
      const R = REGIONS[rid];
      const k = regionOf(g, rid);
      const known = k.mapped >= 0.99 ? ' 이미 내 손으로 지도를 다 그린 땅이다.' : k.mapped > 0 ? ` 내 지도에 ${Math.max(1, Math.round(k.mapped * 10))}할쯤 그려져 있다.` : '';
      return `${R.name}: ${R.desc} 가는 데 ${R.legs}달, 돌아오는 데 ${backOf(R.legs)}달.${known}${R.sea && !hasShip(g) ? ` 내 배가 없으니 배를 빌려야 한다(은화 ${CHARTER}닢).` : ''}`;
    });
    const comps = companionsFor(g);
    return `${rows.join(' ')} ${comps.length ? `함께 갈 사람: ${comps.map((c) => c.name).join(', ')}.` : '함께 갈 동료가 없다. 짐꾼만 데리고 간다.'}`;
  },
  choices: (g) => {
    const out = [];
    for (const rid of regionsFrom(L(g).place)) {
      const R = REGIONS[rid];
      const full = planCost(g, rid, true), light = planCost(g, rid, false);
      if (g.player.money >= full) out.push({ label: `${R.name}: 식량을 넉넉히, 짐꾼 둘 (은화 ${full}닢)`, key: `go:${rid}:full` });
      if (g.player.money >= light) out.push({ label: `${R.name}: 가볍게, 딱 먹을 만큼만 (은화 ${light}닢)`, key: `go:${rid}:light` });
    }
    out.push({ label: '아직은 아니다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '지도를 접었다. 지도가 끝나는 곳은 내년에도 거기 있을 것이다.';
    const [, rid, how] = key.split(':');
    if (!REGIONS[rid]) return '';
    return startExpedition(g, rng, rid, how === 'full');
  },
});

export function startExpedition(g, rng, rid, full) {
  const e = E(g);
  const R = REGIONS[rid];
  const cost = planCost(g, rid, full);
  if (g.player.money < cost) return '돈이 모자랐다.';
  g.player.money -= cost;
  const comps = companionsFor(g);
  e.exp = {
    region: rid, from: L(g).place, phase: 'out', leg: 0, legs: R.legs, back: backOf(R.legs),
    food: tripMonths(R) + (full ? 2 : 0), porters: full ? 2 : 0, morale: full ? 65 : 55,
    lost: 0, lostRun: 0, hungry: 0, mule: true, guide: false, months: 0,
    finds: [], sites: [], dead: [], comps: comps.map((c) => c.name), started: mi(g),
  };
  e.trips += 1;
  regionOf(g, rid).trips += 1;
  tired(g, 8);
  note(g, `원정대를 꾸려 ${J(R.name, '으로/로')} 떠났다.`);
  const ship = R.sea ? (hasShip(g) ? ' 내 배의 닻을 올렸다.' : ' 빌린 배의 늙은 선장은 안개 쪽을 보지 않으려 했다.') : '';
  return `${J(R.name, '으로/로')} 떠난다. 식량은 ${e.exp.food}달 치${full ? ', 짐꾼 둘이 짐을 졌다' : ', 짐은 내 등에 다 졌다'}.${comps.length ? ` ${J(comps.map((c) => c.name).join(', '), '이/가')} 함께 간다.` : ''}${ship} 지도가 끝나는 곳에서 한 걸음을 더 디뎠다.`;
}

/* ---------- 길을 잃을 확률 ---------- */
export function lostChance(g) {
  const x = E(g).exp;
  if (!x) return 0;
  const R = REGIONS[x.region];
  const k = regionOf(g, x.region);
  let p = R.lost * (1 - k.mapped * 0.6);
  p -= keepVal(g, 'lost');
  if (hasRelic(g, 'star_map')) p -= 0.06;
  if (x.guide) p -= 0.08;
  if (companionsFor(g).some((c) => c.role === 'scout')) p -= 0.05;
  p -= (g.player.stats.sen ?? 30) / 1000;
  if (hasKind(g, 'dog') || hasKind(g, 'direwolf')) p -= 0.04; // 개는 냄새로 길을 찾는다 (src/beasts/)
  if (R.sea) p -= (g.player.skills.sailing ?? 0) / 400 + (keepBonus(g, 'sail') ? 0.08 : 0);
  return Math.max(0.03, Math.min(0.5, p));
}

/* ---------- 달마다 ---------- */
function abandon(g, why) {
  const e = E(g);
  const x = e.exp;
  if (!x) return;
  e.exp = null;
  logExplore(g, `${REGIONS[x.region].name} 원정이 ${why} 끝났다. 짐은 그곳에 두고 왔다.`);
}
function retreat(g, why) {
  const x = E(g).exp;
  if (!x || x.phase === 'back') return why;
  x.phase = 'back';
  x.back = Math.max(1, backOf(x.leg));
  x.morale = Math.max(0, x.morale - 15);
  return why;
}
export function turnBack(g) { return retreat(g, '돌아서기로 했다.'); }

function loseFind(g, rng) {
  const x = E(g).exp;
  if (!x?.finds.length) return '';
  const i = rng.int(0, x.finds.length - 1);
  const [f] = x.finds.splice(i, 1);
  return ` ${J(findName(f), '을/를')} 잃어버렸다.`;
}
function addFind(g, id, site, second = false) {
  const x = E(g).exp;
  if (!x || !FINDS[id]) return '';
  x.finds.push({ id, region: x.region, site, year: g.date.year, second });
  return FINDS[id].name;
}
// 동료 하나를 잃는다 (굶주림·추위·사고)
function loseCompanion(g, rng, how) {
  const x = E(g).exp;
  const ms = partyMembers(g);
  if (!ms.length) return '';
  const p = rng.pick(ms);
  kill(g, p, how);
  partyOf(g).fallen.push({ name: fullName(p), year: g.date.year, role: p.comp?.role, cause: how });
  leaveParty(g, p);
  x?.dead.push(p.name);
  E(g).fallen.push({ name: fullName(p), year: g.date.year, how });
  stress(g, 25);
  chron(g, `${fullName(p)}, ${J(g.player.name, '과/와')} 함께 나선 원정에서 ${how}에 쓰러지다.`, 30);
  return ` ${J(fullName(p), '이/가')} 끝내 일어나지 못했다. 언 땅을 파서 묻고, 돌을 쌓았다.`;
}

function hunger(g, rng) {
  const x = E(g).exp;
  stress(g, 6);
  tired(g, 10);
  x.morale = Math.max(0, x.morale - 12);
  const lines = ['식량이 떨어졌다. 배고픔이 잠보다 먼저 찾아온다.'];
  if (x.porters > 0 && rng.chance(0.3)) { x.porters -= 1; lines.push('밤사이 짐꾼 하나가 사라졌다.'); }
  if (x.hungry >= 2 && rng.chance(0.15)) lines.push(loseCompanion(g, rng, '굶주림과 추위').trim());
  if (x.hungry >= 3 && rng.chance(0.25) && !g.player.injuries.some((i) => i.mortal)) {
    g.player.injuries.push({ name: '굶주림과 추위로 무너진 몸', months: 2, mortal: true });
    lines.push('몸이 더는 말을 듣지 않는다. 열이 오르고, 눈앞이 자꾸 하얘진다.');
  }
  g.news?.unshift({ text: lines.filter(Boolean).join(' '), rel: 100 });
}

function queueLeg(g, ev, extra = {}) {
  if (sceneQueued(g, 'explore_leg') || sceneQueued(g, 'explore_heart')) return;
  queueScene(g, 'explore_leg', { ev, ...extra });
}

function comeHome(g, rng) {
  const e = E(g);
  const x = e.exp;
  const R = REGIONS[x.region];
  const k = regionOf(g, x.region);
  e.exp = null;
  for (const f of x.finds) e.pack.push(f);
  // 땅을 반 넘게 그렸으면 지도가 짐이 된다 (땅마다 한 번)
  const mapHeld = [...e.pack, ...e.cache, ...e.given].some((f) => f.id === 'region_map' && f.region === x.region);
  let mapLine = '';
  if (k.mapped >= 0.5 && !mapHeld) { e.pack.push({ id: 'region_map', region: x.region, site: null, year: g.date.year }); mapLine = ` 손으로 그린 ${R.name} 지도도 짐에 있다.`; }
  const fame = 3 + x.finds.length * 2 + (x.sites.length * 3);
  addFame(g, fame);
  gainSkill(g, 'letters', 0.6, 'int');
  tired(g, 15);
  const dead = x.dead.length ? ` 떠날 때보다 ${x.dead.length}명이 적다: ${x.dead.join(', ')}.` : '';
  queueScene(g, 'explore_home', { region: x.region, months: x.months, finds: x.finds.map(findName), sites: x.sites.map((s) => SITES[s]?.name ?? s), dead, mapLine });
  logExplore(g, `${R.name}에서 ${x.months}달 만에 돌아왔다.`, x.sites.length ? 25 : 0);
}

HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const e = E(g);
  const x = e.exp;
  if (!x) return;
  if (!REGIONS[x.region]) { e.exp = null; return; }
  if (awayBlocked(g)) { abandon(g, isJailed(g) ? '감옥에 갇히는 바람에' : '군에 끌려가는 바람에'); return; }
  if (traveling(g) || L(g).place !== x.from) { abandon(g, '뜻하지 않게'); return; }
  x.months += 1;
  x.food -= 1;
  if (x.food < 0) { x.food = 0; x.hungry += 1; hunger(g, rng); } else x.hungry = 0;
  if (!E(g).exp) return;
  const R = REGIONS[x.region];
  if (R.sea) gainSkill(g, 'sailing', 0.5, 'agi');
  if (x.lost) {
    e.lostMonths += 1;
    x.lostRun += 1;
    if (x.lostRun >= 3) { x.lost = 0; x.lostRun = 0; g.news?.unshift({ text: '헤맨 지 석 달, 마침내 낯익은 바위를 찾았다.', rel: 100 }); }
    else { queueLeg(g, 'lost'); return; }
  }
  if (x.phase === 'out') {
    if (x.leg + 1 >= x.legs) { x.leg = x.legs; if (!sceneQueued(g, 'explore_heart')) queueScene(g, 'explore_heart', {}); return; }
    if (rng.chance(lostChance(g))) { x.lost = 1; x.lostRun = 0; queueLeg(g, 'lost'); return; }
    x.leg += 1;
    regionOf(g, x.region).mapped = Math.min(1, regionOf(g, x.region).mapped + 0.05);
    queueLeg(g, pickEvent(g, rng, false), legExtra(g, rng));
  } else {
    x.back -= 1;
    if (x.back <= 0) { comeHome(g, rng); return; }
    queueLeg(g, pickEvent(g, rng, true), legExtra(g, rng));
  }
});

function legExtra(g, rng) {
  const x = E(g).exp;
  const R = REGIONS[x.region];
  const extra = { line: rng.pick(R.sights) };
  const site = R.sites.find((s) => !x.sites.includes(s) && !E(g).firsts[s]?.me);
  if (site) extra.site = site;
  const rival = E(g).rivals.find((r) => r.alive && r.region === x.region) ?? E(g).rivals.find((r) => r.alive);
  if (rival) extra.rival = rival.id;
  const [unit, a, b] = rng.pick(R.foes);
  extra.enc = { unit, count: rng.int(a, b) };
  return extra;
}

function pickEvent(g, rng, back) {
  const x = E(g).exp;
  if (x.hungry > 0 && (x.mule || x.phase === 'out')) return 'hunger';
  if (x.morale <= 15 && x.porters > 0) return 'mutiny';
  const R = REGIONS[x.region];
  if (!back && R.sites.some((s) => !x.sites.includes(s) && !E(g).firsts[s]?.me) && rng.chance(0.45)) return 'site';
  const pool = [['sight', 3], ['hazard', 3], ['tracks', 3], ['river', 2], ['spoiled', 1.5], ['natives', 1.5], ['campfire', 2]];
  if (x.porters > 0) pool.push(['porter_sick', 1.5]);
  if (E(g).rivals.some((r) => r.alive)) pool.push(['rival', back ? 1 : 2]);
  const tot = pool.reduce((a, [, w]) => a + w, 0);
  let r = rng.next() * tot;
  for (const [id, w] of pool) { r -= w; if (r <= 0) return id; }
  return 'sight';
}

/* ---------- 달마다 겪는 일 ---------- */
const stat = (g, k) => g.player.stats[k] ?? 30;
const skill = (g, k) => (g.player.skills[k] ?? 0) + (k === 'hunting' ? huntBonus(g) : 0);
const fightOpts = (g, x) => ({ flee: 35, short: true, noTire: false });
function tactic(g, rng) { return circleOf(g) >= 1 ? 'magic' : rng.chance(0.5) ? 'ambush' : 'charge'; }
const foodWord = (x) => (x.food <= 0 ? '식량이 없다' : x.food === 1 ? '식량이 한 달 치 남았다' : `식량이 ${x.food}달 치 남았다`);
const moraleWord = (m) => (m >= 75 ? '사기가 높다' : m >= 50 ? '사기는 버틸 만하다' : m >= 25 ? '다들 지쳐 말이 없다' : '원정대가 무너지기 직전이다');

export const LEG = {
  sight: {
    text: (g, x, R, s) => `${s.line} 길은 계속 이어진다.`,
    choices: () => [{ label: '걸으며 지도를 그린다', key: 'map' }, { label: '사냥을 나간다', key: 'hunt' }, { label: '쉬며 사람들을 다독인다', key: 'rest' }],
    run(g, rng, x, R, key) {
      if (key === 'map') { regionOf(g, x.region).mapped = Math.min(1, regionOf(g, x.region).mapped + 0.06); gainSkill(g, 'letters', 0.5, 'int'); tired(g, 4); return '지나온 길과 산의 모양을 가죽에 옮겨 그렸다. 지도가 조금 넓어졌다.'; }
      if (key === 'hunt') {
        if (check(rng, skill(g, 'hunting') + stat(g, 'sen') * 0.6, 36)) { x.food += 1; return '반나절을 엎드려 기다린 끝에 짐승 한 마리를 잡았다. 한 달은 더 버틸 수 있다.'; }
        tired(g, 6); return '하루를 쏘다녔지만 빈손이었다. 이 땅의 짐승은 사람을 모른다. 그래서 더 경계한다.';
      }
      x.morale = Math.min(100, x.morale + 8); stress(g, -4); return '하루를 쉬었다. 짐꾼들이 처음으로 웃었다.';
    },
  },
  hazard: {
    text: (g, x, R) => `${R.hazard.text}`,
    choices: () => [{ label: '버티며 나아간다', key: 'push' }, { label: '하루를 묵으며 기다린다 (식량 한 달 치)', key: 'wait' }],
    run(g, rng, x, R, key) {
      const h = R.hazard;
      const val = stat(g, h.stat) + charmBonus(g, 'hazard') + (key === 'wait' ? 14 : 0) + (R.sea ? skill(g, 'sailing') / 3 : 0);
      if (key === 'wait') x.food = Math.max(0, x.food - 1);
      if (check(rng, val, h.dc)) { x.morale = Math.min(100, x.morale + 3); return h.ok; }
      stress(g, 5); x.morale = Math.max(0, x.morale - 8);
      if (rng.chance(0.4)) g.player.injuries.push({ name: `${h.name}에 상한 몸`, months: 2 });
      let more = '';
      if (R.sea && rng.chance(0.5)) { x.food = Math.max(0, x.food - 2); more = ' 식량 두 달 치가 물에 젖어 썩었다.'; }
      else if (rng.chance(0.25)) more = loseFind(g, rng);
      return `${h.bad}${more}`;
    },
  },
  tracks: {
    text: (g, x, R, s) => `${s.line} 진흙에 처음 보는 발자국이 찍혀 있다. ${threatWord(playerPower(g) + companionsFor(g).reduce((a, c) => a + c.pow, 0), s.enc)}`,
    choices: (g) => [{ label: '뒤를 쫓는다', key: 'hunt' }, { label: '길을 돌아간다', key: 'avoid' }, ...(skill(g, 'hunting') >= 20 ? [{ label: '덫을 놓고 기다린다', key: 'trap' }] : [])],
    run(g, rng, x, R, key, s) {
      if (key === 'avoid') { if (rng.chance(0.2)) { x.lost = 1; x.lostRun = 0; return '멀리 돌아가다 방향을 잃었다.'; } return '발자국을 멀찍이 비켜 돌아갔다. 하루가 더 걸렸다.'; }
      if (key === 'trap') { if (check(rng, skill(g, 'hunting') + stat(g, 'sen') / 2, 40)) { x.food += 2; return '사흘 만에 덫에 걸렸다. 고기를 말려 두 달 치 식량을 만들었다.'; } return '덫은 비어 있었다. 무엇인가 덫을 비켜 갔다. 영리한 놈이다.'; }
      const r = runFight(g, rng, { enc: { ...s.enc }, reward: {} }, tactic(g, rng), fightOpts(g, x));
      if (r.outcome === 'lose') return `${r.text} ${retreat(g, '원정대는 돌아서야 했다.')}${loseFind(g, rng)}`;
      if (!won(r)) return r.text;
      x.food += 1;
      x.morale = Math.min(100, x.morale + 6);
      const civ = REGIONS[x.region].civ;
      if (rng.chance(0.3)) { const pool = Object.keys(FINDS).filter((id) => FINDS[id].civ === civ && FINDS[id].value <= 50); const n = pool.length ? addFind(g, rng.pick(pool), null) : ''; if (n) return `${r.text} 놈들의 굴에서 ${J(n, '을/를')} 찾았다.`; }
      return `${r.text} 고기를 나눠 지었다.`;
    },
  },
  river: {
    text: (g, x, R, s) => `${s.line} 눈 녹은 물로 불어난 강이 길을 끊었다.`,
    choices: () => [{ label: '뗏목을 엮는다 (식량 한 달 치)', key: 'raft' }, { label: '헤엄쳐 건넌다', key: 'swim' }, { label: '상류로 돌아간다', key: 'around' }],
    run(g, rng, x, R, key) {
      if (key === 'raft') { x.food = Math.max(0, x.food - 1); return '나무를 베어 뗏목을 엮었다. 엿새가 걸렸지만 모두 무사히 건넜다.'; }
      if (key === 'around') { if (x.phase === 'out') x.leg = Math.max(0, x.leg - 1); else x.back += 1; return '상류로 거슬러 올라가 얕은 여울을 찾았다. 한 달을 잃었다.'; }
      if (check(rng, stat(g, 'str') + stat(g, 'agi') / 2, 45)) return '밧줄을 허리에 묶고 먼저 건넜다. 모두 밧줄을 붙잡고 따라왔다.';
      stress(g, 6); g.player.injuries.push({ name: '물살에 부딪힌 몸', months: 1 });
      if (x.finds.length && rng.chance(0.5)) return `물살이 나를 바위에 내던졌다. 겨우 기어 나왔다.${loseFind(g, rng)}`;
      x.food = Math.max(0, x.food - 1);
      return '물살이 나를 바위에 내던졌다. 겨우 기어 나왔다. 식량 자루 하나가 떠내려갔다.';
    },
  },
  spoiled: {
    text: () => '식량 자루를 열자 시큼한 냄새가 났다. 습기가 스며 절반이 썩었다.',
    choices: (g, x) => [{ label: '짐승을 잡아 메운다', key: 'hunt' }, { label: '허리띠를 졸라맨다', key: 'tight' }, ...(x.porters > 0 ? [{ label: '짐꾼 몫부터 줄인다', key: 'porters' }] : [])],
    run(g, rng, x, R, key) {
      x.food = Math.max(0, x.food - 2);
      if (key === 'hunt') { if (check(rng, skill(g, 'hunting') + stat(g, 'sen') * 0.6, 40)) { x.food += 2; return '사흘 동안 사냥해 잃은 만큼 메웠다.'; } tired(g, 8); return '사냥은 허탕이었다. 식량 두 달 치를 잃었다.'; }
      if (key === 'porters') { x.morale = Math.max(0, x.morale - 15); x.food += 1; return '짐꾼들의 몫을 줄였다. 그들은 아무 말도 하지 않았다. 그게 더 무서웠다.'; }
      x.morale = Math.max(0, x.morale - 8); return '모두의 몫을 똑같이 줄였다. 식량 두 달 치를 잃었다.';
    },
  },
  porter_sick: {
    text: () => '짐꾼 하나가 열병에 걸렸다. 걷지 못한다.',
    choices: () => [{ label: '들것에 싣고 간다 (식량 한 달 치)', key: 'carry' }, { label: '식량을 나눠 주고 돌려보낸다', key: 'send' }, { label: '두고 간다', key: 'leave' }],
    run(g, rng, x, R, key) {
      if (key === 'carry') { x.food = Math.max(0, x.food - 1); x.morale = Math.min(100, x.morale + 6); tired(g, 6); return rng.chance(0.7) ? '들것을 번갈아 졌다. 열흘 뒤 그가 제 발로 일어섰다. 짐꾼들이 나를 보는 눈이 달라졌다.' : '들것을 번갈아 졌지만, 닷새째 밤에 그는 숨을 거두었다. 그래도 버리지 않았다는 것을 다들 기억했다.'; }
      if (key === 'send') { x.porters -= 1; x.food = Math.max(0, x.food - 1); x.morale = Math.min(100, x.morale + 2); return '식량을 나눠 주고 왔던 길을 일러 주었다. 그가 살아서 돌아갔는지는 모른다.'; }
      x.porters -= 1; x.morale = Math.max(0, x.morale - 14); stress(g, 10);
      L(g).notoriety += 1;
      return '물 한 자루를 옆에 두고 떠났다. 뒤에서 부르는 소리가 오래 들렸다. 짐꾼들은 그날 밤 아무도 노래하지 않았다.';
    },
  },
  rival: {
    text: (g, x, R, s) => { const r = E(g).rivals.find((v) => v.id === s.rival); return r ? `${R.name}에서 다른 원정대의 모닥불을 보았다. ${r.name}, ${J(r.leader, '이/가')} 이끄는 무리다. 그들도 같은 곳을 노린다.` : '멀리 다른 원정대의 모닥불이 보였다.'; },
    choices: () => [{ label: '길을 나눈다', key: 'share' }, { label: '밤새 걸어 앞지른다', key: 'race' }, { label: '그들의 야영지를 덮친다', key: 'raid' }, { label: '모른 척 지나간다', key: 'pass' }],
    run(g, rng, x, R, key, s) {
      const r = E(g).rivals.find((v) => v.id === s.rival);
      if (key === 'pass' || !r) return '불빛을 멀찍이 두고 지나갔다.';
      if (key === 'share') { regionOf(g, x.region).mapped = Math.min(1, regionOf(g, x.region).mapped + 0.1); r.prog += 1; x.morale = Math.min(100, x.morale + 5); return `${J(r.leader, '과/와')} 지도를 맞대어 보았다. 서로 모르던 길이 이어졌다. 그들도 그만큼 빨라질 것이다.`; }
      if (key === 'race') { tired(g, 15); x.food = Math.max(0, x.food - 1); r.prog = Math.max(0, r.prog - 1); if (x.phase === 'out' && x.leg + 1 < x.legs) x.leg += 1; return '불을 끄고 밤새 걸었다. 새벽에 돌아보니 그들의 연기가 한참 뒤에 있었다.'; }
      const res = runFight(g, rng, { enc: { unit: 'rival_raider', count: rng.int(3, 6) }, reward: {} }, tactic(g, rng), fightOpts(g, x));
      L(g).notoriety += 4; stress(g, 6);
      if (res.outcome === 'lose') return `${res.text} ${retreat(g, '원정대는 쫓겨 돌아서야 했다.')}${loseFind(g, rng)}`;
      if (!won(res)) return res.text;
      x.food += 3; r.prog = 0;
      if (rng.chance(0.4)) { r.alive = false; chron(g, `${r.name}, ${R.name}에서 습격을 받아 흩어지다.`, 20); }
      const pool = Object.keys(FINDS).filter((id) => FINDS[id].civ === R.civ && FINDS[id].value <= 90);
      const n = pool.length && rng.chance(0.6) ? addFind(g, rng.pick(pool), null) : '';
      return `${res.text} 그들의 식량을 빼앗았다.${n ? ` 짐 속에서 ${J(n, '을/를')} 찾았다.` : ''} 이 땅에는 법이 없다. 그래도 내가 한 일은 내가 안다.`;
    },
  },
  natives: {
    text: (g, x, R) => `${R.name}에도 사람이 살았다. 짐승 가죽을 두른 사람들이 멀리서 우리를 지켜본다. 말은 통하지 않는다.`,
    choices: (g) => [...(g.player.money >= 5 ? [{ label: '선물을 건넨다 (은화 5닢어치)', key: 'gift' }] : []), { label: '거리를 둔다', key: 'keep' }, { label: '먹을 것을 빼앗는다', key: 'rob' }],
    run(g, rng, x, R, key) {
      if (key === 'gift') { g.player.money -= 5; x.guide = true; x.morale = Math.min(100, x.morale + 5); regionOf(g, x.region).mapped = Math.min(1, regionOf(g, x.region).mapped + 0.1); return '쇠칼과 소금을 내려놓고 물러섰다. 다음 날 아침, 그들 중 하나가 앞장서서 걷기 시작했다. 따라오라는 뜻이었다.'; }
      if (key === 'rob') { x.food += 3; L(g).notoriety += 4; stress(g, 6); x.morale = Math.max(0, x.morale - 3); return '칼을 뽑자 그들은 달아났다. 말린 고기와 곡식을 챙겼다. 아이 하나가 끝까지 돌아보았다.'; }
      return '서로 거리를 지킨 채 사흘을 나란히 걸었다. 나흘째 아침, 그들은 사라졌다.';
    },
  },
  campfire: {
    text: (g, x) => `모닥불이 타닥거린다. ${moraleWord(x.morale)}. ${foodWord(x)}.`,
    choices: () => [{ label: '옛이야기를 나눈다', key: 'talk' }, { label: '지도를 다듬는다', key: 'map' }, { label: '일찍 잠든다', key: 'sleep' }],
    run(g, rng, x, R, key) {
      if (key === 'talk') { stress(g, -8); x.morale = Math.min(100, x.morale + 6); for (const p of partyMembers(g)) addLoyalty(p, 3); return '누군가 고향 노래를 시작했다. 다들 가사를 몰라 흥얼거리기만 했다. 그래도 좋았다.'; }
      if (key === 'map') { regionOf(g, x.region).mapped = Math.min(1, regionOf(g, x.region).mapped + 0.08); gainSkill(g, 'letters', 0.6, 'int'); return '불빛 아래서 지도를 다듬었다. 내 손으로 그린 선이 아무도 몰랐던 땅의 모양이 되어 간다.'; }
      tired(g, -15); return '해가 지기 무섭게 잠들었다. 꿈도 꾸지 않았다.';
    },
  },
  site: {
    text: (g, x, R, s) => { const S = SITES[s.site]; const f = E(g).firsts[s.site]; return `${S.text}${f && !f.me ? ` 그런데 누가 먼저 왔다. 기둥에 ${f.who}의 표식이 새겨져 있다. ${f.year}년.` : ' 아무도 온 흔적이 없다. 이곳을 본 것은 천 년 만에 내가 처음이다.'}`; },
    choices: () => [{ label: '파고 들어간다 (식량 한 달 치)', key: 'dig' }, { label: '살펴보고 기록만 한다', key: 'record' }, { label: '지나친다', key: 'pass' }],
    run(g, rng, x, R, key, s) {
      const S = SITES[s.site];
      if (!S) return '';
      if (key === 'pass') return '발길을 돌렸다. 언젠가 다시 올 것이다. 아마도.';
      x.sites.push(s.site);
      const first = claimFirst(g, s.site);
      if (first) { addFame(g, 5); chron(g, `${g.player.name}, ${R.name}에서 ${J(S.name, '을/를')} 처음 찾아내다.`, 40); queueScene(g, 'explore_name', { site: s.site }, { first: true }); }
      regionOf(g, x.region).mapped = Math.min(1, regionOf(g, x.region).mapped + 0.08);
      if (key === 'record') { gainSkill(g, 'letters', 0.8, 'int'); return `${J(S.name, '을/를')} 그리고 적었다. 글자를 베끼고 기둥의 수를 셌다. 아무것도 가져가지 않았다.`; }
      x.food = Math.max(0, x.food - 1);
      tired(g, 10);
      if (!check(rng, stat(g, 'sen') + charmBonus(g, 'hazard'), 42)) { g.player.injuries.push({ name: '옛 함정에 다친 몸', months: 2 }); stress(g, 6); }
      const pool = S.finds.slice();
      const got = [addFind(g, pool.splice(rng.int(0, pool.length - 1), 1)[0], s.site, !first)];
      if (first && pool.length && rng.chance(0.5)) got.push(addFind(g, pool.splice(rng.int(0, pool.length - 1), 1)[0], s.site));
      return `${J(S.name, '을/를')} 파고 들어갔다. ${got.filter(Boolean).map((n) => J(n, '을/를')).join(', ')} 짐에 넣었다.${first ? '' : ' 먼저 온 자들이 좋은 것은 이미 가져갔다.'}`;
    },
  },
  hunger: {
    text: (g, x) => `식량이 바닥났다. ${moraleWord(x.morale)}.`,
    choices: (g, x) => [...(x.mule ? [{ label: '짐 끄는 노새를 잡는다', key: 'mule' }] : []), { label: '풀뿌리와 이끼를 캔다', key: 'forage' }, ...(x.phase === 'out' ? [{ label: '돌아선다', key: 'back' }] : [])],
    run(g, rng, x, R, key) {
      if (key === 'mule') { x.mule = false; x.food += 2; x.hungry = 0; stress(g, 4); const lose = x.finds.length > 2 ? loseFind(g, rng) : ''; return `노새를 잡았다. 짐을 나눠 졌지만 다 질 수는 없었다.${lose}`; }
      if (key === 'back') return retreat(g, '원정을 접고 돌아서기로 했다. 살아서 돌아가는 것이 먼저다.');
      if (check(rng, stat(g, 'sen') + skill(g, 'herbs') + skill(g, 'hunting') / 2, 40)) { x.food += 1; return '먹을 수 있는 뿌리를 찾아냈다. 쓰고 질겼지만 한 달은 버틴다.'; }
      stress(g, 5); return '하루 종일 땅을 팠다. 손에 쥔 것은 쓴 이끼 한 줌이었다.';
    },
  },
  mutiny: {
    text: () => '짐꾼들이 짐을 내려놓았다. "더는 못 갑니다. 돌아가겠소." 그들의 손이 칼자루 가까이에 있다.',
    choices: (g, x) => [...(g.player.money >= x.porters * 5 ? [{ label: `품삯을 올려 준다 (은화 ${x.porters * 5}닢)`, key: 'pay' }] : []), { label: '칼을 뽑아 다잡는다', key: 'force' }, { label: '그들의 말을 따른다', key: 'back' }],
    run(g, rng, x, R, key) {
      if (key === 'pay') { g.player.money -= x.porters * 5; x.morale = Math.min(100, x.morale + 25); return '은화를 그 자리에서 나눠 주었다. 짐꾼들이 다시 짐을 졌다.'; }
      if (key === 'back') return retreat(g, '짐꾼들의 말을 따라 돌아서기로 했다.');
      if (check(rng, stat(g, 'cha') / 2 + stat(g, 'str') / 2 + L(g).renown / 10, 45)) { x.morale = Math.min(100, x.morale + 10); L(g).notoriety += 1; return '칼끝을 들자 아무도 나서지 못했다. 짐꾼들이 고개를 숙이고 짐을 졌다.'; }
      x.porters = 0; x.food = Math.max(0, x.food - 2);
      return '짐꾼들이 식량 두 자루를 메고 달아났다. 쫓을 힘도 없었다.';
    },
  },
  lost: {
    text: (g, x, R) => `${R.sights[0]} 길을 잃었다. 어제 본 바위를 오늘 또 지났다.${x.lostRun ? ' 벌써 몇 주째다.' : ''}`,
    choices: (g) => [{ label: '별을 읽는다', key: 'stars' }, ...(companionsFor(g).some((c) => c.role === 'scout') ? [{ label: '척후를 앞세운다', key: 'scout' }] : []), { label: '왔던 길을 되짚는다', key: 'retrace' }, { label: '그냥 앞으로 걷는다', key: 'walk' }],
    run(g, rng, x, R, key) {
      if (key === 'retrace') { x.lost = 0; if (x.phase === 'out') x.leg = Math.max(0, x.leg - 1); else x.back += 1; return '발자국을 거슬러 아는 곳까지 돌아갔다. 길을 되찾았지만 그만큼 늦었다.'; }
      if (key === 'scout') { if (rng.chance(0.75)) { x.lost = 0; return '척후가 이틀을 앞서 다녀오더니 길을 찾았다고 했다.'; } return '척후도 고개를 저었다.'; }
      if (key === 'stars') {
        const val = stat(g, 'int') + skill(g, 'letters') / 2 + (hasRelic(g, 'star_map') ? 15 : 0) + keepVal(g, 'lost') * 150 + (R.sea ? skill(g, 'sailing') / 2 : 0);
        if (check(rng, val, 50)) { x.lost = 0; gainSkill(g, 'letters', 0.4, 'int'); return '구름이 걷힌 밤, 별의 자리로 방향을 다시 잡았다.'; }
        return '하늘이 사흘 내내 흐렸다. 별은 보이지 않았다.';
      }
      if (rng.chance(0.35)) { x.lost = 0; return '무작정 걸었다. 운이 좋았다. 낯익은 강줄기가 나왔다.'; }
      stress(g, 4); return '걸을수록 더 깊이 헤맸다.';
    },
  },
};

defineScene('explore_leg', {
  need: (g, s) => !!E(g).exp && !!LEG[s.ev],
  title: (g) => { const x = E(g).exp; return `${REGIONS[x.region].name} · ${x.phase === 'out' ? `가는 길 ${Math.max(1, x.leg)}/${x.legs}` : `돌아오는 길, ${x.back}달 남음`}`; },
  text: (g, s) => { const x = E(g).exp; const R = REGIONS[x.region]; return `${LEG[s.ev].text(g, x, R, s)} (${foodWord(x)}, ${moraleWord(x.morale)})`; },
  choices: (g, s) => LEG[s.ev].choices(g, E(g).exp, s),
  resolve(g, rng, s, key) {
    const x = E(g).exp;
    if (!x) return '';
    return LEG[s.ev].run(g, rng, x, REGIONS[x.region], key, s) || '';
  },
});

/* ---------- 심장 ---------- */
defineScene('explore_heart', {
  need: (g) => !!E(g).exp && E(g).exp.phase === 'out',
  title: (g) => `${REGIONS[E(g).exp.region].name}의 가장 깊은 곳`,
  text: (g) => {
    const x = E(g).exp;
    const R = REGIONS[x.region];
    const S = SITES[R.heart];
    const f = E(g).firsts[R.heart];
    const comps = companionsFor(g);
    const pow = playerPower(g) + comps.reduce((a, c) => a + c.pow, 0);
    return `${S.text}${f && !f.me ? ` 입구에 ${f.who}의 표식이 있다. ${f.year}년. 누군가 먼저 왔다.` : f?.me ? ' 내가 남긴 표식이 그대로 있다.' : ''} 안을 지키는 것들은, 가늠해 보니 ${threatWord(pow, R.guard)}`;
  },
  choices: () => [{ label: '정면으로 들어간다', key: 'fight' }, { label: '몰래 숨어든다', key: 'sneak' }, { label: '바깥에서 그리고 적기만 한다', key: 'record' }, { label: '돌아선다', key: 'back' }],
  resolve(g, rng, s, key) {
    const x = E(g).exp;
    if (!x) return '';
    const R = REGIONS[x.region];
    const S = SITES[R.heart];
    if (key === 'back') return retreat(g, `${J(S.name, '을/를')} 눈앞에 두고 돌아섰다. 살아 있으면 다시 올 수 있다.`);
    if (key === 'record') {
      regionOf(g, x.region).mapped = Math.min(1, regionOf(g, x.region).mapped + 0.2);
      x.sites.push(R.heart);
      const first = claimFirst(g, R.heart);
      if (first) { addFame(g, 8); chron(g, `${g.player.name}, ${R.name}의 ${J(S.name, '을/를')} 처음 보고 돌아오다.`, 55); queueScene(g, 'explore_name', { site: R.heart }, { first: true }); }
      retreat(g, '');
      return `${J(S.name, '을/를')} 멀리서 그리고, 문에 새긴 글자를 베꼈다. 안에 들어가지는 않았다. 그것만으로도 아무도 가지지 못한 기록이다.`;
    }
    let text = '';
    if (key === 'sneak') {
      const scout = companionsFor(g).some((c) => c.role === 'scout');
      if (check(rng, (stat(g, 'agi') + stat(g, 'sen')) / 2 + (scout ? 12 : 0) + charmBonus(g, 'hazard'), 52)) return heartWin(g, rng, '그림자를 따라 숨어들었다. 지키는 것들이 등을 돌린 사이에 가장 안쪽 방에 닿았다.', 1);
      text = '발밑의 돌이 울렸다. 지키는 것들이 일제히 고개를 돌렸다.';
    }
    const r = runFight(g, rng, { enc: { ...R.guard }, reward: {} }, tactic(g, rng), { flee: key === 'sneak' ? 25 : 35, short: true });
    if (won(r)) return heartWin(g, rng, `${text} ${r.text}`.trim(), 2);
    return `${text} ${r.text} ${retreat(g, '원정대는 쫓기듯 돌아섰다.')}${loseFind(g, rng)}`.trim();
  },
});

function heartWin(g, rng, lead, n) {
  const x = E(g).exp;
  const R = REGIONS[x.region];
  const S = SITES[R.heart];
  x.sites.push(R.heart);
  const first = claimFirst(g, R.heart);
  const k = regionOf(g, x.region);
  k.heart = true;
  k.mapped = Math.min(1, k.mapped + 0.3);
  const pool = S.finds.slice();
  const got = [];
  const take = first ? n + (rng.chance(0.4) ? 1 : 0) : 1;
  for (let i = 0; i < take && pool.length; i++) got.push(addFind(g, pool.splice(rng.int(0, pool.length - 1), 1)[0], R.heart, !first));
  if (first) {
    addFame(g, 15);
    chron(g, `${g.player.name}, ${R.name}의 가장 깊은 곳 ${S.name}에서 ${CIVS[S.civ]?.name ?? '사라진 문명'}의 흔적을 찾아내다.`, 75);
    queueScene(g, 'explore_name', { site: R.heart }, { first: true });
  } else addFame(g, 5);
  retreat(g, '');
  x.morale = Math.min(100, x.morale + 25);
  return `${lead} ${got.filter(Boolean).map((nm) => J(nm, '을/를')).join(', ')} 손에 넣었다.${first ? ' 천 년 동안 아무도 들어오지 않은 방이었다.' : ' 먼저 온 자들이 많이 가져갔다. 그래도 빈손은 아니다.'} 이제 돌아갈 길이 남았다.`;
}

/* ---------- 이름 붙이기 ---------- */
const rago = (n) => (J(n, '이/가').endsWith('이') ? '이라고' : '라고');
defineScene('explore_name', {
  need: (g, s) => !!SITES[s.site] && !!E(g).firsts[s.site]?.me,
  title: (g, s) => `${SITES[s.site].name}에 붙일 이름`,
  text: (g, s) => `지도에 없던 곳이다. 처음 찾은 사람이 이름을 붙인다. 학자들도, 장사꾼들도, 앞으로 이곳을 그 이름으로 부를 것이다.`,
  choices: (g, s) => {
    const x = E(g).exp;
    const short = SITE_SHORT[s.site] ?? '땅';
    const out = [{ label: `내 이름을 붙인다: "${g.player.name}의 ${short}"`, key: 'me' }];
    if (g.player.lastName) out.push({ label: `집안 이름을 붙인다: "${g.player.lastName} 가문의 ${short}"`, key: 'house' });
    const dead = x?.dead?.[x.dead.length - 1] ?? E(g).fallen[E(g).fallen.length - 1]?.name?.split(' ')[0];
    if (dead) out.push({ label: `먼저 간 동료의 이름을 붙인다: "${dead}의 ${short}"`, key: `dead:${dead}` });
    out.push({ label: `옛 이름을 그대로 둔다: "${SITES[s.site].name}"`, key: 'old' });
    return out;
  },
  resolve(g, rng, s, key) {
    const f = E(g).firsts[s.site];
    const short = SITE_SHORT[s.site] ?? '땅';
    if (key === 'me') { f.name = `${g.player.name}의 ${short}`; addFame(g, 3); return `지도에 "${f.name}"${rago(f.name)} 적었다. 내가 죽어도 이 이름은 남는다.`; }
    if (key === 'house') { f.name = `${g.player.lastName} 가문의 ${short}`; addFame(g, 2); return `"${f.name}". 내 아이들과 그 아이들이 이 이름을 들을 것이다.`; }
    if (key.startsWith('dead:')) { const n = key.slice(5); f.name = `${n}의 ${short}`; stress(g, -12); return `"${f.name}". 그가 끝내 보지 못한 곳에 그의 이름을 남겼다.`; }
    addFame(g, 1); return `옛사람들이 부르던 이름을 그대로 적었다. 학자들이 그 선택을 높이 샀다.`;
  },
});

/* ---------- 돌아와서 ---------- */
defineScene('explore_home', {
  title: (g, s) => `${REGIONS[s.region]?.name ?? '미지의 땅'}에서 돌아오다`,
  text: (g, s) => `${s.months}달 만에 지도가 있는 땅으로 돌아왔다.${s.sites.length ? ` 찾은 곳: ${s.sites.join(', ')}.` : ' 이름 붙일 만한 곳은 찾지 못했다.'}${s.finds.length ? ` 짐에 든 것: ${s.finds.join(', ')}.` : ' 짐은 비었다.'}${s.mapLine}${s.dead} 찾은 것은 장터에서 팔 수도, 서고나 마탑에 바칠 수도, 아무도 모르는 곳에 숨길 수도 있다.`,
  choices: () => [{ label: '짐을 푼다', key: 'ok' }, { label: '먼저 주점에서 원정대와 술을 나눈다', key: 'drink' }],
  resolve(g, rng, s, key) {
    if (key === 'drink') { stress(g, -12); g.player.money = Math.max(0, g.player.money - 3); return '살아 돌아온 사람들과 밤새 마셨다. 돌아오지 못한 이름들을 하나씩 불렀다.'; }
    return '짐을 풀었다. 흙과 재와 소금이 바닥에 쏟아졌다.';
  },
});

/* ---------- 돌아서기, 원정 중 할 수 있는 일 ---------- */
ACTIONS.push({
  id: 'explore_turnback',
  name: '원정을 접고 돌아선다',
  icon: 'home',
  desc: '더 가지 않고 돌아선다. 온 만큼의 절반이 걸린다.',
  available: (g) => E(g).exp?.phase === 'out',
  run(g) { return turnBack(g); },
});
const EXP_OK = new Set(['rest', 'meditate', 'train_body', 'explore_turnback']);
HOOKS.actionFilter.push((g, a) => {
  if (!g.explore?.exp) return true;
  if (g.crime?.jailed) return true;
  return EXP_OK.has(a.id);
});
