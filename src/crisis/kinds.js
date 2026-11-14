// 세 가지 큰 위기: 마물 대침공(검은 물결), 잿빛 열병, 큰 전쟁.
// 각 위기는 네 단계를 몇 년에 걸쳐 밟는다. 단계마다 영웅·방관·이용의 길이 있고,
// 동료(파티)와 함께 싸우는 길, 영지 병사를 이끄는 길(전쟁 지휘 모드), 왕국의 소집에 응하는 길이 열린다.
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { gainSkill, circleOf } from '../game.js';
import { PLACES } from '../places.js';
import { atWar, nudge, monthIndex } from '../world.js';
import { living, kill } from '../npc.js';
import { L, note, chron, check, stress, tired } from '../adventure/core.js';
import { FOES } from '../adventure/combat.js';
import { runFight } from '../adventure/fight.js';
import { ourArmy, queueBattle, BATTLE_OUTS } from '../war/battle.js';
import { activeWars, summonable } from '../war/summons.js';
import { D } from '../domain/state.js';
import { ready } from '../party/core.js';
import { defineCrisis, deepen, active, clamp, LEONIA, inLeonia } from './core.js';

// 위기에만 나오는 적 (교전 규칙의 FOES에 더한다)
Object.assign(FOES, {
  imperial: { name: '제국 병사', pow: 22, human: true, weapon: '제국식 장창' },
  imperial_knight: { name: '제국 기사', pow: 44, human: true, leader: true, weapon: '기병창' },
  demon_soldier: { name: '마족 병사', pow: 27, weapon: '흑철 도끼' },
  demon_captain: { name: '마족 백인장', pow: 58, leader: true, weapon: '피 묻은 대검' },
  rival_soldier: { name: '반대편 왕자의 병사', pow: 20, human: true, weapon: '장창' },
  rival_knight: { name: '반대편 기사', pow: 40, human: true, leader: true, weapon: '장검' },
});

const fight = (g, rng, enc, tactic = 'charge') => runFight(g, rng, { enc, reward: {} }, tactic, { short: true });
const won = (r) => r.outcome === 'win' || r.outcome === 'overwhelm';
// 위기로 버는 돈의 크기 (고장의 품삯에 맞춘다)
const wage = (g) => (PLACES[L(g).place]?.wage ?? 1) * 0.55;
const withRole = (g, role) => ready(g).find((p) => p.comp.role === role) ?? null;
const townName = (c) => PLACES[c.data.town]?.name ?? '하르펜';
const canMuster = (g) => ourArmy(g).troops > 0;
const isMage = (g) => circleOf(g) >= 2;

// 위기 속 백성의 죽음: 그 고장 사람들 가운데 몇이 죽는다 (플레이어는 빼고)
function toll(g, rng, chance, cause) {
  let n = 0;
  for (const p of living(g)) {
    if (p.isPlayer || p.id === g.player.id) continue;
    if (rng.chance(chance)) { kill(g, p, cause); n++; }
  }
  return n;
}
// 영지가 있으면 영지도 다친다
function hurtDomain(g, popPct, morale) {
  const d = D(g);
  if (!d) return;
  d.pop = Math.max(30, Math.round(d.pop * (1 - popPct)));
  d.morale = clamp(d.morale - morale, 0, 100);
}
// 다음 달 전투(전쟁 지휘 모드)를 건다
function muster(g, rng, c, title, intro, key, mult = [0.8, 1.5]) {
  queueBattle(g, {
    title, intro, enemy: { key, troops: Math.max(25, Math.round(ourArmy(g).troops * rng.float(mult[0], mult[1]))) },
    context: 'crisis', reward: { renown: 4, favor: 4 }, big: true, extra: [{ label: '싸우지 않고 병사를 물린다', key: 'avoid' }],
  });
  return `${ourArmy(g).name} ${ourArmy(g).troops}명에게 출정 채비를 시켰다. 다음 달 깃발을 올린다.`;
}

BATTLE_OUTS.crisis = {
  win: (g) => { deepen(g, -12); return '이 한 판이 위기의 흐름을 바꾸었다. 소식이 왕국에 퍼졌다.'; },
  draw: (g) => { deepen(g, -3); return '물러서지 않은 것만으로도 시간을 벌었다.'; },
  lose: (g) => { deepen(g, 6); return '패전 소식에 사람들의 얼굴이 더 어두워졌다.'; },
  other: (g) => { deepen(g, 2); return '병사들을 물렸다. 누군가는 겁쟁이라 했고, 누군가는 현명하다 했다.'; },
};

/* =========================================================
   마물 대침공: 검은 물결
   ========================================================= */
defineCrisis('horde', {
  name: '검은 물결', kind: 'monsters',
  trigger: (g) => {
    const r = g.realm;
    return 0.0006 + Math.max(0, r.monsters - 50) * 0.0007 + (r.north.fallen ? 0.008 : 0) + (r.seal < 70 ? 0.002 : 0);
  },
  init(g, rng, c) {
    c.sev = clamp(42 + (g.realm.monsters - 45) * 0.5, 30, 75);
    c.data.town = ['harfen', 'verden', 'gruental'].includes(L(g).place) ? L(g).place : rng.pick(['harfen', 'verden']);
  },
  drift: (g) => 0.35 - (g.realm.heroBorn ? 0.15 : 0),
  helpName: '토벌대에 낀다', exploitName: '마물 소재와 피란민의 짐을 사고판다',
  help(g, rng) {
    tired(g, 15);
    const r = fight(g, rng, { unit: rng.pick(['goblin', 'wolf', 'kobold']), count: rng.int(2, 4), leader: null });
    if (won(r)) { deepen(g, -2.5); L(g).renown += 1; return `길드 토벌대에 끼어 숲을 쓸었다. ${r.text}`; }
    return `토벌대는 밀려났다. ${r.text}`;
  },
  exploit(g, rng) {
    const m = Math.round(rng.int(6, 16) * wage(g));
    g.player.money += m; L(g).notoriety += 1; deepen(g, 0.5);
    return `마물 가죽과 송곳니, 피란민이 내다 판 은수저를 헐값에 사서 왕도 상인에게 넘겼다. 은화 ${m}닢이 남았다.`;
  },
  phases: [
    {
      id: 'omen', name: '징조', months: [4, 7],
      intro: () => '미궁마다 마물이 들끓는다는 소식이 겹쳐 들어온다. 사냥꾼들이 숲에서 돌아오지 않는다. 늙은이들은 마신 시대의 노래를 읊으며 "물결"이 온다고 했다.',
      text: () => '숲이 조용하다. 새도, 짐승도 울지 않는다. 길드 게시판에는 실종자 이름만 늘어 간다. 무언가가 깊은 곳에서 올라오고 있다.',
      choices: (g) => [
        { label: '숲 깊이 들어가 무엇이 오는지 알아낸다', key: 'scout', stance: 'hero' },
        { label: '마을마다 돌며 성벽과 망루를 고치자고 설득한다', key: 'warn', stance: 'hero' },
        { label: '식량을 쟁여 두고 문을 걸어 잠근다', key: 'stock', stance: 'idle' },
        ...(g.player.money >= 30 ? [{ label: '피란 갈 사람들의 땅을 헐값에 사들인다 (은화 30닢)', key: 'buy', stance: 'use' }] : []),
      ],
      resolve(g, rng, c, key) {
        if (key === 'scout') {
          const scout = withRole(g, 'scout');
          const r = fight(g, rng, { unit: 'goblin', count: scout ? 3 : 5, leader: 'goblin_chief' }, scout ? 'ambush' : 'charge');
          if (won(r)) { deepen(g, -7); c.data.known = true; return `${scout ? `척후 ${J(scout.name, '이/가')} 앞장서 길을 냈다. ` : ''}${r.text} 쓰러진 고블린 족장 뒤로, 땅 밑으로 뚫린 거대한 굴이 보였다. 물결이 어디서 올지 알았다. 길드에 알렸다.`; }
          return `${r.text} 굴 근처까지도 가지 못했다.`;
        }
        if (key === 'warn') {
          if (check(rng, g.player.stats.cha + L(g).renown / 3, 45)) { deepen(g, -5); return '마을 원로들이 처음엔 비웃었지만, 끝내 망루에 사람을 세우고 목책을 두 겹으로 둘렀다. 그 목책이 몇 달 뒤 사람들을 살렸다.'; }
          deepen(g, -1);
          return '"마물 몇 마리에 호들갑이군." 대부분은 듣지 않았다. 그래도 한 마을은 목책을 고쳤다.';
        }
        if (key === 'stock') { g.player.money = Math.max(0, g.player.money - 10); c.data.stocked = true; return '곳간에 밀과 소금에 절인 고기를 채웠다. 문빗장도 새로 달았다. 무슨 일이 와도 우리 식구는 버틴다.'; }
        if (g.player.money < 30) return '주머니를 뒤져 보니 돈이 모자랐다.';
        g.player.money -= 30; c.data.land = true; L(g).notoriety += 2;
        return '겁에 질린 사람들이 땅문서를 내밀었다. 시세의 반의반 값이었다. 물결이 지나가고 나면 이 땅은 금이 될 것이다. 살아남는다면.';
      },
    },
    {
      id: 'flood', name: '범람', months: [9, 15],
      intro: (g, c) => `물결이 왔다. 미궁 입구가 터지고 고블린과 오크와 이름 모를 짐승들이 가도를 덮었다. ${townName(c)} 둘레의 외딴 마을들이 하룻밤 새 비었다.`,
      tick(g, rng, c, say) {
        nudge(g, 'monsters', 0.4);
        const n = toll(g, rng, 0.0004 + c.sev * 0.00003, '마물의 습격');
        if (n) say(`마물이 마을 외곽을 덮쳤다. ${n}명이 돌아오지 못했다.`, 90);
        if (c.sev > 55) hurtDomain(g, 0.01, 1.5);
        if (rng.chance(0.2)) say(rng.pick(['피란민 행렬이 성문 앞에 사흘째 늘어서 있다.', '가도마다 짐수레가 뒤집힌 채 버려져 있다. 상단들이 길을 끊었다.', '길드가 D급 이상 모험가를 모두 불러 모았다.', '밤마다 성벽 밖에서 무언가가 긁는 소리가 난다.']));
      },
      text: (g, c) => `${J(townName(c), '으로/로')} 가는 길에 피란민이 줄을 이었다. 뒤에서 북소리와 짐승 울음이 쫓아온다. 수레를 버리고 아이만 안고 달리는 사람들도 있다.`,
      choices: (g) => [
        { label: '피란민 행렬을 지키며 길을 연다', key: 'escort', stance: 'hero' },
        ...(canMuster(g) ? [{ label: '병사를 이끌고 마물 떼를 친다', key: 'muster', stance: 'hero' }] : []),
        { label: '식구를 데리고 성벽 안으로 피한다', key: 'flee', stance: 'idle' },
        { label: '버려진 마을을 뒤져 값나가는 것을 챙긴다', key: 'loot', stance: 'use' },
      ],
      resolve(g, rng, c, key) {
        if (key === 'escort') {
          const r = fight(g, rng, { unit: 'goblin', count: rng.int(4, 6), leader: rng.chance(0.5) ? 'goblin_chief' : 'dire_wolf' });
          if (won(r)) { deepen(g, -8); L(g).renown += 3; return `${r.text} 행렬 끝의 마지막 수레까지 성문 안으로 들어갔다. 한 노파가 내 손에 입을 맞췄다.`; }
          deepen(g, 2);
          return `${r.text} 행렬 뒤쪽의 수레 몇 대는 끝내 오지 못했다.`;
        }
        if (key === 'muster') return muster(g, rng, c, '마물 떼 토벌', `${townName(c)} 들판. 마물 떼가 검은 물결처럼 언덕을 넘어온다.`, 'monsters');
        if (key === 'flee') { stress(g, c.data.stocked ? 2 : 8); return `${c.data.stocked ? '쟁여 둔 식량을 수레에 싣고' : '맨몸으로'} 성벽 안으로 들어갔다. 성문이 닫히는 소리 뒤로 비명이 들렸다. 돌아보지 않았다.`; }
        const m = Math.round(rng.int(20, 55) * wage(g));
        g.player.money += m; L(g).notoriety += 3;
        if (rng.chance(0.35)) {
          const r = fight(g, rng, { unit: 'goblin', count: 3, leader: null });
          return `빈집의 장롱을 뒤지다 고블린 떼와 마주쳤다. ${r.text} 그래도 은화 ${m}닢어치를 챙겨 나왔다.`;
        }
        return `불탄 마을의 빈집들을 뒤졌다. 은촛대, 숨겨 둔 동전 단지, 결혼 반지. 은화 ${m}닢어치였다. 주인들이 살아 있는지는 묻지 않았다.`;
      },
    },
    {
      id: 'siege', name: '포위', months: [4, 8],
      intro: (g, c) => `${J(townName(c), '이/가')} 포위되었다. 오크 전사장이 이끄는 물결의 본대가 성벽을 둘러쌌다. 성 안에는 피란민이 넘친다.`,
      tick(g, rng, c, say) {
        const n = toll(g, rng, 0.0003 + c.sev * 0.00002, '포위 속의 굶주림');
        if (n && rng.chance(0.5)) say(`성 안에 먹을 것이 모자라다. 이번 달에만 ${n}명이 굶주림과 병으로 죽었다.`, 85);
        g.realm.bread = Math.min(3, g.realm.bread + 0.03);
      },
      text: (g, c) => `${townName(c)} 성벽 아래 횃불이 바다를 이룬다. 공성 사다리가 밤마다 걸리고, 성벽 위 병사들은 사흘째 잠을 자지 못했다.`,
      choices: (g) => [
        { label: '성벽 위에 서서 사다리를 밀어낸다', key: 'wall', stance: 'hero' },
        ...(isMage(g) ? [{ label: '성벽 위에서 마법으로 적진을 불사른다', key: 'magic', stance: 'hero' }] : []),
        ...(canMuster(g) ? [{ label: '구원군을 이끌고 포위를 뚫는다', key: 'relief', stance: 'hero' }] : []),
        { label: '지하실에 숨어 끝나기를 기다린다', key: 'cellar', stance: 'idle' },
        { label: '성 안 사람들에게 식량을 비싸게 판다', key: 'sell', stance: 'use' },
      ],
      resolve(g, rng, c, key) {
        if (key === 'wall' || key === 'magic') {
          const r = fight(g, rng, { unit: 'orc', count: rng.int(2, 3), leader: 'orc_chief' }, key === 'magic' ? 'magic' : 'charge');
          if (won(r)) { deepen(g, -12); L(g).renown += 5; chron(g, `${g.player.name}, ${townName(c)} 성벽에서 물결의 본대를 막아 내다.`, 80); return `${r.text} 새벽, 오크들이 사다리를 버리고 물러났다. 성벽 위에서 누군가 내 이름을 외쳤고, 다들 따라 외쳤다.`; }
          deepen(g, 3);
          return `${r.text} 성벽 한 구간이 무너졌다가 겨우 다시 막혔다.`;
        }
        if (key === 'relief') return muster(g, rng, c, `${townName(c)} 구원`, `${townName(c)} 성 밖. 포위한 오크와 마물의 등 뒤로 다가갔다.`, 'orcs', [0.9, 1.6]);
        if (key === 'cellar') { stress(g, 10); return '지하실 어둠 속에서 머리 위로 지나가는 발소리를 셌다. 사람의 것인지 아닌지 알 수 없었다.'; }
        const m = Math.round(rng.int(40, 90) * wage(g));
        g.player.money += m; L(g).notoriety += 4; deepen(g, 2);
        return `밀 한 자루에 평소의 열 배를 불렀다. 사람들은 이를 갈며 은화를 내밀었다. 은화 ${m}닢. 어떤 아이 엄마는 반지를 빼 주었다.`;
      },
    },
    {
      id: 'after', name: '반격과 여파', months: [4, 7],
      intro: (g, c) => (c.sev < 50 ? '물결이 꺾였다. 기사단과 길드가 반격에 나섰고, 마물들은 미궁으로 쫓겨 들어가고 있다.' : '포위는 풀렸지만 물결은 아직 왕국 곳곳에 고여 있다. 불탄 마을의 연기가 몇 달째 오른다.'),
      text: (g, c) => `폐허가 된 마을들 사이로 사람들이 돌아오고 있다. ${c.sev < 50 ? '남은 마물은 둥지로 숨었다.' : '아직 길은 안전하지 않다.'} 주인 잃은 땅과 집이 셀 수 없다.`,
      choices: (g) => [
        { label: '남은 마물의 둥지를 찾아 뿌리를 뽑는다', key: 'hunt', stance: 'hero' },
        ...(g.player.money >= 50 ? [{ label: '불탄 마을을 다시 세우는 데 돈을 낸다 (은화 50닢)', key: 'rebuild', stance: 'hero' }] : []),
        { label: '집으로 돌아가 다시 밭을 간다', key: 'home', stance: 'idle' },
        { label: '주인 잃은 땅에 말뚝을 박는다', key: 'claim', stance: 'use' },
      ],
      resolve(g, rng, c, key) {
        if (key === 'hunt') {
          const r = fight(g, rng, { unit: 'wolf', count: 3, leader: 'dire_wolf' }, withRole(g, 'scout') ? 'ambush' : 'charge');
          if (won(r)) { deepen(g, -6); return `${r.text} 둥지 깊은 곳의 알과 새끼까지 불태웠다. 이 골짜기에서 물결이 다시 일 일은 없을 것이다.`; }
          return `${r.text} 둥지는 생각보다 깊었다.`;
        }
        if (key === 'rebuild') { if (g.player.money < 50) return '주머니를 뒤져 보니 돈이 모자랐다.'; g.player.money -= 50; deepen(g, -5); L(g).renown += 3; return '목수와 석공을 사서 불탄 마을에 집 열두 채와 우물을 세웠다. 마을 어귀 돌에 내 이름이 새겨졌다.'; }
        if (key === 'home') { stress(g, -5); return '쟁기를 다시 잡았다. 밭고랑 사이에서 녹슨 화살촉이 나왔다. 그래도 봄은 왔다.'; }
        const m = Math.round(rng.int(30, 70) * wage(g)) + (c.data.land ? 60 : 0);
        g.player.money += m; L(g).notoriety += 3;
        return `${c.data.land ? '헐값에 사 둔 땅에, ' : ''}주인이 돌아오지 않은 땅에 말뚝을 박고 영주 서기에게 은화를 쥐여 주었다. 땅을 되팔아 은화 ${m}닢을 벌었다.`;
      },
    },
  ],
  end(g, rng, c, result) {
    const r = g.realm;
    if (result === 'saved') { r.monsters = clamp(r.monsters - 25, 0, 100); return '검은 물결이 물러갔다. 미궁 입구마다 기사단이 새 돌문을 세웠다. 길드는 그해를 "검은 물결의 해"라 부르기로 했다.'; }
    if (result === 'scarred') { r.monsters = clamp(r.monsters - 10, 0, 100); hurtDomain(g, 0.05, 5); return '물결은 물러갔지만 마을 여럿이 지도에서 지워졌다. 살아남은 사람들은 성벽 도시로 옮겨 가 다시 돌아오지 않았다.'; }
    r.monsters = clamp(r.monsters + 5, 0, 100); hurtDomain(g, 0.15, 12);
    toll(g, rng, 0.03, '검은 물결');
    return '물결은 끝내 다 물러가지 않았다. 왕국 남부의 숲과 고개가 마물의 땅이 되었고, 사람들은 성벽 안에서만 산다. 상단은 호위 없이는 길을 나서지 않는다.';
  },
});

/* =========================================================
   역병: 잿빛 열병
   ========================================================= */
function catchFever(g, rng, c, base) {
  const healer = withRole(g, 'healer');
  const risk = base * (healer ? 0.4 : 1) * (1 - Math.min(0.6, g.player.skills.herbs / 100)) * (0.6 + c.sev / 100);
  if (!rng.chance(risk)) return '';
  // 한 번뿐인 삶의 무게: 아주 드물게 열병이 목숨을 가져간다
  if (!healer && g.player.skills.herbs < 25 && rng.chance(0.05)) { L(g).pendingDeath = '잿빛 열병'; return ' 사흘째부터 열이 올랐다. 살갗에 잿빛 반점이 돋았다.'; }
  g.player.injuries.push({ name: '잿빛 열병', months: rng.int(1, 3) });
  stress(g, 8);
  return ` 그러다 나도 열병에 걸렸다. ${healer ? `${J(healer.name, '이/가')} 밤새 곁을 지켰다.` : '며칠을 앓아누웠다.'}`;
}
function plagueOn(g) { g.world.plague = true; g.world.plagueMonths = Math.max(g.world.plagueMonths ?? 0, 2); }

defineCrisis('plague', {
  name: '잿빛 열병', kind: 'plague',
  trigger: (g) => (g.world?.plague ? 0.02 : 0.0009) + (g.world?.famine ? 0.004 : 0) + (atWar(g) ? 0.0015 : 0),
  init(g, rng, c) { c.sev = rng.int(42, 58); c.data.town = rng.pick(['harfen', 'leocast', 'verden']); plagueOn(g); },
  drift: (g) => 0.3 - (g.realm.era ?? 0) * 0.12,
  helpName: '구호소에서 환자를 돌본다', exploitName: '약값을 올려 받는다',
  help(g, rng, c) {
    tired(g, 18);
    deepen(g, -2.5);
    gainSkill(g, 'herbs', 1.2, 'int');
    return `성당 앞 구호소에서 한 달을 보냈다. 열을 식히고, 물을 먹이고, 죽은 이의 눈을 감겨 주었다.${catchFever(g, rng, c, 0.06)}`;
  },
  exploit(g, rng) {
    const m = Math.round(rng.int(7, 18) * wage(g) * (0.6 + g.player.skills.herbs / 60));
    g.player.money += m; L(g).notoriety += 1; deepen(g, 0.5);
    return `식초와 쑥 다발, 박하 기름을 평소의 다섯 배에 팔았다. 사람들은 깎지도 않았다. 은화 ${m}닢.`;
  },
  phases: [
    {
      id: 'first', name: '첫 환자', months: [3, 5],
      intro: (g, c) => `${townName(c)} 빈민가에서 잿빛 반점이 돋는 열병이 돌기 시작했다. 앓는 사람의 살갗이 재처럼 바랜다고 한다.`,
      tick: (g) => plagueOn(g),
      text: (g, c) => `${townName(c)}에서 온 짐꾼이 기침을 하며 쓰러졌다. 목덜미에 잿빛 반점이 있었다. 사람들이 그를 피해 길을 비켰다.`,
      choices: (g) => [
        { label: '병이 어디서 시작됐는지 캐낸다', key: 'source', stance: 'hero' },
        ...(D(g) ? [{ label: '영지의 길목을 막고 드나드는 사람을 가둔다', key: 'quarantine', stance: 'hero' }] : [{ label: '영주와 사제에게 성문을 닫으라고 청한다', key: 'warn', stance: 'hero' }]),
        { label: '식구를 데리고 시골 친척 집으로 몸을 피한다', key: 'leave', stance: 'idle' },
        ...(g.player.money >= 20 ? [{ label: '약초와 식초를 미리 사 모은다 (은화 20닢)', key: 'hoard', stance: 'use' }] : []),
      ],
      resolve(g, rng, c, key) {
        if (key === 'source') {
          if (check(rng, (g.player.stats.int + g.player.stats.sen) / 2 + g.player.skills.herbs / 3, 45)) { c.data.source = true; deepen(g, -5); return '죽은 이들의 집을 하나하나 짚어 보니 모두 같은 우물 물을 길었다. 그 우물가에서 검은 재로 그린 원을 보았다. 마신교의 표식이었다.'; }
          return '며칠을 물어보고 다녔지만 실마리는 잡히지 않았다. 다들 서로를 탓할 뿐이었다.';
        }
        if (key === 'quarantine') { const d = D(g); d.morale = clamp(d.morale - 6, 0, 100); deepen(g, -7); return `${d.name}의 길목마다 병사를 세웠다. 장이 서지 않고 장사꾼이 끊겼다. 영민들은 투덜거렸지만, 열병은 영지 경계에서 멈칫했다.`; }
        if (key === 'warn') {
          if (check(rng, g.player.stats.cha + L(g).renown / 3, 50)) { deepen(g, -5); return '사제가 먼저 고개를 끄덕였고, 영주가 마지못해 따랐다. 성문이 닫혔다. 상인들이 아우성쳤지만, 그 덕에 몇백이 살았다.'; }
          return '"장사를 막으면 세금은 누가 내나?" 영주의 서기는 문을 닫아 버렸다.';
        }
        if (key === 'leave') { stress(g, -3); return '짐을 꾸려 시골로 갔다. 친척은 문을 열어 주었지만, 첫 사흘은 헛간에서 자게 했다. 당연한 일이었다.'; }
        if (g.player.money < 20) return '주머니를 뒤져 보니 돈이 모자랐다.';
        g.player.money -= 20; c.data.hoard = true;
        return '약재상을 돌며 쑥과 식초, 박하 기름을 쓸어 담았다. 약재상 주인이 이상하다는 눈으로 보았다.';
      },
    },
    {
      id: 'spread', name: '번짐', months: [6, 10],
      intro: () => '잿빛 열병이 고장마다 번졌다. 장례 종이 하루에도 몇 번씩 울린다. 문마다 흰 분필로 십자가 그어졌다.',
      tick(g, rng, c, say) {
        plagueOn(g);
        const n = toll(g, rng, 0.0008 + c.sev * 0.00004, '잿빛 열병');
        if (n) say(`잿빛 열병으로 이번 달 ${n}명이 세상을 떠났다.`, 90);
        if (c.sev > 50) hurtDomain(g, 0.012, 1);
      },
      text: () => '길에 사람이 없다. 문을 두드리는 건 시체를 거두는 수레꾼뿐이다. 성당 앞 계단에는 앓는 사람들이 누워 있고, 사제는 셋 중 둘이 쓰러졌다.',
      choices: (g, c) => [
        { label: '환자들 곁에서 열을 내리고 죽은 이를 묻는다', key: 'tend', stance: 'hero' },
        ...(withRole(g, 'healer') ? [{ label: `치유사 ${J(withRole(g, 'healer').name, '과/와')} 임시 구호소를 연다`, key: 'clinic', stance: 'hero' }] : []),
        ...(g.player.money >= 40 ? [{ label: '가진 돈으로 약과 빵을 나눈다 (은화 40닢)', key: 'pay', stance: 'hero' }] : []),
        { label: '문을 걸어 잠그고 아무도 들이지 않는다', key: 'lock', stance: 'idle' },
        { label: '가짜 영약을 만들어 판다', key: 'cure', stance: 'use' },
        ...(c.data.hoard ? [{ label: '쟁여 둔 약초를 열 배 값에 푼다', key: 'sellhoard', stance: 'use' }] : []),
      ],
      resolve(g, rng, c, key) {
        if (key === 'tend') { deepen(g, -7); gainSkill(g, 'herbs', 2, 'int'); L(g).renown += 2; return `석 달 동안 구호소에서 잤다. 살린 사람보다 묻은 사람이 많았다. 그래도 살린 사람들은 내 얼굴을 잊지 않았다.${catchFever(g, rng, c, 0.15)}`; }
        if (key === 'clinic') { const h = withRole(g, 'healer'); deepen(g, -10); L(g).renown += 3; h.comp.loyalty = Math.min(100, h.comp.loyalty + 5); return `${J(h.name, '이/가')} 버려진 창고에 침상 마흔 개를 놓았다. 끓인 물, 식초, 기도. 그 창고에서 나간 사람 중 셋에 둘은 걸어서 나갔다.${catchFever(g, rng, c, 0.06)}`; }
        if (key === 'pay') { if (g.player.money < 40) return '주머니를 뒤져 보니 돈이 모자랐다.'; g.player.money -= 40; deepen(g, -5); L(g).renown += 2; return '빵과 약초를 수레에 싣고 문 닫힌 집들 앞에 두고 다녔다. 문틈으로 손이 나와 수레를 비웠다.'; }
        if (key === 'lock') { stress(g, 6); return '문을 걸어 잠갔다. 밤에 누군가 문을 두드리며 물 한 모금만 달라고 했다. 대답하지 않았다. 아침엔 조용했다.'; }
        if (key === 'cure') {
          const m = Math.round(rng.int(30, 70) * wage(g)); g.player.money += m; L(g).notoriety += 4; deepen(g, 3);
          return `색깔 낸 물에 쓴 풀을 섞어 "성녀의 눈물"이라 써 붙였다. 은화 ${m}닢을 벌었다. 그걸 마시고 죽은 사람들은 따지러 오지 못했다.`;
        }
        const m = Math.round(rng.int(80, 130) * wage(g)); g.player.money += m; L(g).notoriety += 3; c.data.hoard = false;
        return `쟁여 둔 약초를 풀었다. 쑥 한 다발에 은화 한 닢. 은화 ${m}닢이 들어왔다. 약재상 주인이 침을 뱉었다.`;
      },
    },
    {
      id: 'peak', name: '절정', months: [5, 8],
      intro: () => '묘지가 모자라 성 밖에 구덩이를 팠다. 성광교 사제들 중에도 쓰러진 사람이 나왔다. 누군가는 마신교도가 우물에 저주를 풀었다고 수군거린다.',
      tick(g, rng, c, say) {
        plagueOn(g);
        const n = toll(g, rng, 0.0015 + c.sev * 0.00006, '잿빛 열병');
        if (n) say(`잿빛 열병이 절정이다. 이번 달에만 ${n}명이 죽었다.`, 95);
        if (c.sev > 45) hurtDomain(g, 0.02, 2);
      },
      text: (g, c) => `${c.data.source ? '처음 짚었던 그 우물가에서 밤마다 검은 옷을 입은 자들이 목격된다.' : '우물가에서 밤마다 검은 옷을 입은 자들을 봤다는 말이 돈다.'} 열병이 그냥 병이 아닐지도 모른다.`,
      choices: (g, c) => [
        { label: '저주받은 우물의 소문을 쫓는다', key: 'well', stance: 'hero' },
        { label: '구호소로 돌아가 끝까지 환자를 돌본다', key: 'tend', stance: 'hero' },
        { label: '성당에 엎드려 기도하며 견딘다', key: 'pray', stance: 'idle' },
        { label: '주인 없는 집에서 물건을 챙긴다', key: 'rob', stance: 'use' },
      ],
      resolve(g, rng, c, key) {
        if (key === 'well') {
          const r = fight(g, rng, { unit: 'cultist', count: c.data.source ? 2 : 4, leader: null }, c.data.source ? 'ambush' : 'charge');
          if (won(r)) { deepen(g, -14); L(g).renown += 5; chron(g, `${g.player.name}, 잿빛 열병을 퍼뜨린 마신교도들을 처단하다.`, 85); return `${r.text} 우물 밑바닥에서 검게 썩은 짐승 뼈와 저주 문양이 새겨진 돌판이 나왔다. 돌판을 깨뜨리자, 그날부터 새 환자가 줄기 시작했다.`; }
          deepen(g, 2);
          return `${r.text} 마신교도들은 어둠 속으로 사라졌다.`;
        }
        if (key === 'tend') { deepen(g, -6); gainSkill(g, 'herbs', 2, 'int'); return `마지막 고비를 구호소에서 넘겼다. 사제가 쓰러진 자리에서 기도문을 대신 읽었다.${catchFever(g, rng, c, 0.15)}`; }
        if (key === 'pray') { stress(g, -4); return '성당 바닥의 차가운 돌에 이마를 대고 밤을 지새웠다. 신이 들었는지는 모르겠다. 나는 살아남았다.'; }
        const m = Math.round(rng.int(30, 80) * wage(g)); g.player.money += m; L(g).notoriety += 5;
        return `분필 십자가가 그어진 집들은 문이 열려 있었다. 은화 ${m}닢어치를 챙겼다.${catchFever(g, rng, c, 0.12)}`;
      },
    },
    {
      id: 'wane', name: '잦아듦', months: [3, 5],
      intro: () => '열병이 잦아든다. 문의 분필 자국이 하나둘 지워지고, 살아남은 사람들이 서로의 얼굴을 확인하며 울었다.',
      tick: (g, rng, c) => { if (c.sev > 40) plagueOn(g); },
      text: () => '장례 종이 멎었다. 거리에 부모 잃은 아이들과 주인 없는 집이 남았다.',
      choices: (g) => [
        { label: '부모 잃은 아이들을 거둘 곳을 마련한다', key: 'orphans', stance: 'hero' },
        { label: '죽은 이들을 위해 초를 밝힌다', key: 'mourn', stance: 'idle' },
        { label: '유족 없는 재산을 헐값에 사들인다', key: 'inherit', stance: 'use' },
      ],
      resolve(g, rng, c, key) {
        if (key === 'orphans') { g.player.money = Math.max(0, g.player.money - 25); deepen(g, -3); L(g).renown += 3; return '성당 옆 빈집 하나를 고쳐 아이들 열넷을 들였다. 밤마다 우는 아이가 하나씩 줄었다.'; }
        if (key === 'mourn') { stress(g, -6); return '성당 앞에 초를 밝혔다. 이름을 아는 사람, 얼굴만 아는 사람, 모르는 사람. 초가 다 타도록 서 있었다.'; }
        const m = Math.round(rng.int(40, 90) * wage(g)); g.player.money += m; L(g).notoriety += 3;
        return `주인이 죽고 상속인도 죽은 집들을 서기와 짜고 헐값에 넘겨받았다. 되팔아서 은화 ${m}닢을 남겼다.`;
      },
    },
  ],
  end(g, rng, c, result) {
    g.world.plagueMonths = 1;
    if (result === 'saved') return '잿빛 열병이 물러갔다. 생각보다 적게 죽었다. 사람들은 끝까지 구호소를 지킨 이들의 이름을 불렀다.';
    if (result === 'scarred') { hurtDomain(g, 0.04, 4); return '열병이 지나갔다. 마을마다 빈집이 남았고, 장터의 목소리가 한동안 작았다.'; }
    hurtDomain(g, 0.12, 10);
    g.realm.bread = Math.min(3, g.realm.bread + 0.35);
    toll(g, rng, 0.03, '잿빛 열병');
    return '잿빛 열병이 왕국 사람 열에 하나를 데려갔다. 일손이 모자라 밀밭이 묵었고, 빵값이 치솟았다. 성광교는 이것이 신벌이라 설교했다.';
  },
});

/* =========================================================
   큰 전쟁
   ========================================================= */
const WAR = {
  balhart: { foe: '발하르트 제국군', unit: 'imperial', leader: 'imperial_knight', army: 'balhart', call: '징집령이 내려왔다. 열여섯에서 마흔까지, 집집마다 한 사람씩. 제국과의 전쟁이 한두 해로 끝나지 않을 거라는 말이 돈다.' },
  garbes: { foe: '붉은 마왕군', unit: 'demon_soldier', leader: 'demon_captain', army: 'garbes', call: '북부 변경이 무너지기 직전이다. 국왕이 중앙의 모든 기사와 모험가에게 북쪽으로 가라는 칙령을 내렸다.' },
  civil: { foe: '반대편 왕자의 군대', unit: 'rival_soldier', leader: 'rival_knight', army: 'civil', call: '두 왕자가 모두 사람을 모은다. 마을마다 어느 편에 설지 정하라는 사자가 다녀갔다. 고르지 않으면 양쪽 모두의 적이 된다.' },
};
const W = (c) => WAR[c.data.war] ?? WAR.balhart;

defineCrisis('war', {
  name: '큰 전쟁', kind: 'war',
  trigger: (g) => {
    const r = g.realm;
    if (r.balhart.war && r.balhart.warMonths <= 6) return 0.08;
    if (r.north.war && r.north.warMonths <= 6) return 0.06;
    if (r.succession === 'civilwar' && r.civilWarMonths <= 6) return 0.1;
    return 0;
  },
  init(g, rng, c) {
    const wars = activeWars(g);
    c.data.war = wars.includes('civil') ? 'civil' : wars.includes('balhart') ? 'balhart' : wars[0] ?? 'balhart';
    c.data.town = ['harfen', 'verden', 'gruental', 'leocast'].includes(L(g).place) ? L(g).place : 'harfen';
    c.sev = 48 + (g.realm.balhart.fortsLost ?? 0) * 4;
  },
  drift: () => 0.25,
  helpName: '보급 수레를 끌고 전선 마을을 돕는다', exploitName: '군납으로 한몫 챙긴다',
  help(g, rng, c) {
    tired(g, 18);
    if (rng.chance(0.35)) {
      const r = fight(g, rng, { unit: W(c).unit, count: 2, leader: null });
      if (won(r)) deepen(g, -3.5);
      return `보급 수레를 몰고 전선 마을로 가다가 적의 척후와 마주쳤다. ${r.text}`;
    }
    deepen(g, -2);
    return '밀과 붕대와 화살을 실은 수레를 몰고 전선 마을을 오갔다. 지친 병사들이 수레 뒤를 따라 걸었다.';
  },
  exploit(g, rng, c) {
    const m = Math.round(rng.int(8, 20) * wage(g) * (g.realm.bread ?? 1));
    g.player.money += m; L(g).notoriety += 1;
    return `군 보급관에게 뇌물을 쥐여 주고 묵은 밀과 낡은 가죽을 납품했다. 은화 ${m}닢. 병사들이 그 밀로 끓인 죽을 먹고 배앓이를 했다는 말은 못 들은 척했다.`;
  },
  phases: [
    {
      id: 'call', name: '징집령', months: [3, 5],
      intro: (g, c) => W(c).call,
      text: (g, c) => `마을 광장에 징집관이 탁자를 폈다. 이름이 불린 집마다 울음이 났다. ${W(c).foe}에 맞설 사람이 모자란다.`,
      choices: (g, c) => [
        ...(summonable(g) || canMuster(g) ? [{ label: '병사를 이끌고 전장에 나간다', key: 'enlist', stance: 'hero' }] : [{ label: '의용군에 자원한다', key: 'militia', stance: 'hero' }]),
        { label: '징집관에게 은화를 쥐여 주고 빠진다', key: 'dodge', stance: 'idle' },
        ...(g.player.money >= 30 ? [{ label: '군량으로 쓸 밀을 사재기한다 (은화 30닢)', key: 'grain', stance: 'use' }] : []),
      ],
      resolve(g, rng, c, key) {
        if (key === 'enlist') return muster(g, rng, c, `${J(W(c).foe, '과/와')} 싸움`, `${W(c).foe}의 선봉이 강 건너에 진을 쳤다.`, W(c).army);
        if (key === 'militia') {
          const r = fight(g, rng, { unit: W(c).unit, count: rng.int(2, 3), leader: rng.chance(0.4) ? W(c).leader : null });
          if (won(r)) { deepen(g, -6); L(g).renown += 2; return `의용군 창병으로 첫 싸움에 나섰다. ${r.text} 백인장이 내 어깨를 두드렸다.`; }
          return `의용군 창병으로 첫 싸움에 나섰다. ${r.text}`;
        }
        if (key === 'dodge') { g.player.money = Math.max(0, g.player.money - 15); stress(g, 3); return '징집관의 장부에서 내 이름이 지워졌다. 대신 옆집 아들의 이름이 올라갔다.'; }
        if (g.player.money < 30) return '주머니를 뒤져 보니 돈이 모자랐다.';
        g.player.money -= 30; c.data.grain = true;
        return '밀 창고 세 곳을 통째로 샀다. 곡물상들이 이를 갈았다. 전쟁이 길어질수록 이 밀은 금이 된다.';
      },
    },
    {
      id: 'front', name: '무너지는 전선', months: [8, 14],
      intro: (g, c) => `전선이 밀려 내려온다. 피란민이 길을 메웠다. ${J(W(c).foe, '이/가')} 지나간 마을에는 굴뚝만 남았다고 한다.`,
      tick(g, rng, c, say) {
        nudge(g, 'front', (50 - c.sev) / 200);
        if (rng.chance(0.25)) say(rng.pick(['전사자 명단이 성당 문에 붙었다. 사람들이 손가락으로 이름을 짚어 내려갔다.', '피란민 수레가 길을 막아 장이 서지 않았다.', '징집관이 또 왔다. 이번엔 열다섯 살도 데려갔다.', '패잔병 무리가 남쪽 마을을 털었다는 소식이다.']));
        if (c.sev > 60) hurtDomain(g, 0.008, 1);
      },
      text: (g, c) => `${townName(c)} 길목에 피란민 행렬이 끝없다. 뒤쫓는 ${W(c).foe}의 척후와, 그 틈에 피란민을 터는 패잔병이 뒤섞였다.`,
      choices: (g, c) => [
        { label: '피란민 행렬을 지켜 남쪽까지 데려간다', key: 'escort', stance: 'hero' },
        ...(canMuster(g) ? [{ label: '병사를 내어 무너지는 전선을 받친다', key: 'levy', stance: 'hero' }] : []),
        { label: '곳간 깊이 숨어 지나가기를 기다린다', key: 'hide', stance: 'idle' },
        ...(c.data.grain ? [{ label: '쟁여 둔 밀을 군대에 세 배 값에 판다', key: 'sell', stance: 'use' }] : []),
        { label: '적군에 길과 물자를 몰래 판다', key: 'smuggle', stance: 'use' },
      ],
      resolve(g, rng, c, key) {
        if (key === 'escort') {
          const r = fight(g, rng, { unit: 'deserter', count: rng.int(3, 4), leader: 'bandit_chief' });
          if (won(r)) { deepen(g, -7); L(g).renown += 3; return `피란민을 털던 패잔병들을 쫓아냈다. ${r.text} 행렬을 이끌고 남쪽 성까지 열흘을 걸었다.`; }
          return `${r.text} 행렬은 흩어졌다.`;
        }
        if (key === 'levy') return muster(g, rng, c, '전선을 받치다', `무너지는 전선. ${W(c).foe}의 깃발이 고개를 넘어온다.`, W(c).army, [0.9, 1.7]);
        if (key === 'hide') { stress(g, 8); return '곳간 깊이 숨었다. 사흘 동안 말발굽 소리가 지나갔다. 나와 보니 이웃집이 비어 있었다.'; }
        if (key === 'sell') {
          const m = Math.round(rng.int(90, 150) * wage(g) * (g.realm.bread ?? 1)); g.player.money += m; L(g).notoriety += 2; c.data.grain = false;
          return `보급관이 장부에 세 배 값을 적었다. 은화 ${m}닢. 전쟁은 누군가에게는 장사다.`;
        }
        const m = Math.round(rng.int(60, 110) * wage(g)); g.player.money += m; L(g).notoriety += 6; deepen(g, 6);
        if (c.data.war === 'balhart') nudge(g, 'front', -1);
        return `밤에 국경 숲에서 ${W(c).foe}의 사람을 만났다. 마을 길과 곡물 창고 위치를 그린 지도를 넘기고 은화 ${m}닢을 받았다. 다시는 돌아오지 못할 강을 건넌 기분이었다.`;
      },
    },
    {
      id: 'battle', name: '고향 앞의 싸움', months: [3, 6],
      intro: (g, c) => `${W(c).foe}의 별동대가 ${townName(c)} 코앞까지 왔다. 성문 앞 들판에 적의 막사가 섰다.`,
      tick(g, rng, c) { nudge(g, 'front', (50 - c.sev) / 160); if (c.sev > 55) hurtDomain(g, 0.01, 1.5); },
      text: (g, c) => `${townName(c)} 성벽 위에서 적진이 보인다. ${W(c).foe}의 깃발 아래 공성구가 조립되고 있다. 성 안에는 싸울 사람보다 숨은 사람이 많다.`,
      choices: (g, c) => [
        { label: '성문 앞에 나가 적의 별동대와 싸운다', key: 'stand', stance: 'hero' },
        ...(isMage(g) ? [{ label: '밤에 몰래 나가 마법으로 공성구를 불태운다', key: 'magic', stance: 'hero' }] : []),
        ...(canMuster(g) ? [{ label: '병사를 이끌고 성 밖 적진을 친다', key: 'sally', stance: 'hero' }] : []),
        { label: '식구를 데리고 반대편 성문으로 빠져나간다', key: 'flee', stance: 'idle' },
        { label: '성문 열쇠를 적에게 넘긴다', key: 'open', stance: 'use' },
      ],
      resolve(g, rng, c, key) {
        if (key === 'stand' || key === 'magic') {
          const r = fight(g, rng, { unit: W(c).unit, count: key === 'magic' ? 2 : rng.int(3, 4), leader: W(c).leader }, key === 'magic' ? 'magic' : 'charge');
          if (won(r)) { deepen(g, -12); L(g).renown += 5; chron(g, `${g.player.name}, ${townName(c)} 앞에서 ${W(c).foe}의 별동대를 물리치다.`, 85); return `${r.text} ${key === 'magic' ? '공성구가 밤하늘에 불기둥이 되었다.' : '적의 깃발이 진흙 속에 처박혔다.'} 별동대는 그날 밤 물러갔다.`; }
          deepen(g, 3);
          return `${r.text} 성문은 버텼지만, 성 밖 마을이 불탔다.`;
        }
        if (key === 'sally') return muster(g, rng, c, `${townName(c)} 앞 들판`, `${townName(c)} 성 밖. 포위하려는 ${W(c).foe}의 별동대가 막사를 세우고 있다.`, W(c).army, [0.8, 1.4]);
        if (key === 'flee') { stress(g, 10); return '반대편 성문으로 빠져나와 밤새 걸었다. 새벽에 돌아보니 성 쪽 하늘이 붉었다.'; }
        const m = Math.round(rng.int(150, 250) * wage(g)); g.player.money += m; L(g).notoriety += 12; deepen(g, 12);
        chron(g, `${g.player.name}, ${townName(c)}의 성문을 적에게 열어 주다.`, 90);
        note(g, `${townName(c)}의 성문 열쇠를 적에게 넘겼다.`);
        return `밤에 쪽문 빗장을 풀었다. 은화 ${m}닢이 든 자루를 받았다. 새벽의 비명은 오래도록 귀에서 떠나지 않을 것이다.`;
      },
    },
    {
      id: 'peace', name: '전쟁의 끝', months: [3, 5],
      intro: (g, c) => (c.sev < 50 ? `${J(W(c).foe, '이/가')} 물러가고 있다. 사람들이 성문 밖으로 나와 불탄 들판을 바라보았다.` : '싸움이 잦아든다. 이긴 쪽도 진 쪽도 없이, 지친 사람들만 남았다.'),
      text: () => '다리를 저는 병사들이 마을로 돌아온다. 돌아오지 못한 사람의 집에는 검은 천이 걸렸다.',
      choices: (g) => [
        ...(g.player.money >= 30 ? [{ label: '다친 병사와 과부들을 돌본다 (은화 30닢)', key: 'veterans', stance: 'hero' }] : [{ label: '다친 병사들의 상처를 함께 돌본다', key: 'care', stance: 'hero' }]),
        { label: '집으로 돌아가 아무 일 없던 듯 산다', key: 'home', stance: 'idle' },
        { label: '전사자들의 장비를 모아 판다', key: 'spoils', stance: 'use' },
      ],
      resolve(g, rng, c, key) {
        if (key === 'veterans') { if (g.player.money < 30) return '주머니를 뒤져 보니 돈이 모자랐다.'; g.player.money -= 30; deepen(g, -3); L(g).renown += 2; return '외팔이 병사에게 일자리를, 과부들에게 겨울 땔감을 마련했다. 고맙다는 말 대신 오래 손을 잡았다.'; }
        if (key === 'care') { deepen(g, -2); tired(g, 10); return '성당 마당에서 붕대를 감고 고름을 짰다. 밤에는 열에 들뜬 병사의 손을 잡아 주었다.'; }
        if (key === 'home') { stress(g, -4); return '집으로 돌아갔다. 전쟁 이야기는 하지 않기로 했다.'; }
        const m = Math.round(rng.int(30, 70) * wage(g)); g.player.money += m; L(g).notoriety += 3;
        return `들판에 버려진 갑옷과 칼을 모아 대장간에 넘겼다. 은화 ${m}닢. 갑옷 안쪽에 아이 이름이 새겨진 것도 있었다.`;
      },
    },
  ],
  end(g, rng, c, result) {
    const war = c.data.war;
    if (result === 'saved') {
      if (war === 'balhart') nudge(g, 'front', 4);
      return `큰 전쟁이 끝을 향한다. 레오니아는 버텨 냈다. ${W(c).foe}에 맞서 싸운 마을들의 이름이 왕도 광장에서 불렸다.`;
    }
    if (result === 'scarred') { hurtDomain(g, 0.04, 4); return '큰 전쟁의 불길이 잦아들었다. 무엇을 얻었는지 아는 사람은 없다. 잃은 것은 모두가 안다.'; }
    if (war === 'balhart') nudge(g, 'front', -4);
    hurtDomain(g, 0.1, 10);
    g.realm.bread = Math.min(3, g.realm.bread + 0.25);
    toll(g, rng, 0.02, '전쟁');
    return `큰 전쟁이 왕국을 짓밟았다. ${J(W(c).foe, '이/가')} 지나간 땅에는 사람이 살지 않는다. 사람들은 이 몇 해를 "불의 해들"이라 불렀다.`;
  },
});

// 전쟁이 먼저 끝나면 위기도 마무리 단계로 넘어간다
HOOKS.afterMonth.push((g) => {
  const c = active(g);
  if (!c || c.id !== 'war' || c.data.over) return;
  if (!activeWars(g).includes(c.data.war)) {
    c.data.over = true;
    if (c.phase < 2) c.phase = 2; // 다음 달 "전쟁의 끝"으로 넘어간다
    c.due = monthIndex(g);
  }
});

export { LEONIA, inLeonia };
