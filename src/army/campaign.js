// 원정과 행군, 큰 싸움, 포로와 몸값, 전쟁 영웅.
// - 전쟁 중이면(world.js의 발하르트·북부·내전, politics의 레오니아 전쟁) 백인대가 출정한다. 평시에는 가끔 도적·마물 토벌.
// - 원정은 몇 달 걸린다. 달마다 행군 장면 하나, 마지막 달에 큰 싸움.
// - 병졸·부사관은 대열 안에서 싸우고, 백인장·천인장은 전쟁 지휘 모드(war/battle.js의 fightBattle)로 자기 부대를 이끈다.
// - 원정과 포로 동안에는 할 수 있는 일이 줄어든다(actionFilter).
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, stress, tired, check, canSpend, spend } from '../adventure/core.js';
import { FOES, playerPower } from '../adventure/combat.js';
import { addWound, queueFight } from '../adventure/fight.js';
import { ARMIES, fightBattle, leadership } from '../war/battle.js';
import { activeWars } from '../war/summons.js';
import { ownWars, foeIn, short } from '../politics/state.js';
import { isJailed } from '../crime.js';
import { nudge } from '../world.js';
import { J } from '../narrative/text.js';
import { A, enlisted, onCampaign, captive, rankOf, addMerit, logArmy, addScar, pickOf } from './core.js';
import { desert } from './service.js';

Object.assign(FOES, {
  army_mp: { name: '왕국군 헌병', pow: 18, human: true, weapon: '곤봉과 짧은 칼' },
  enemy_scout: { name: '적 척후병', pow: 16, human: true, weapon: '단궁과 단검' },
});

const WAR_NAME = { balhart: '발하르트 전선', garbes: '북부 변경', civil: '왕위 내전', bandits: '산적 토벌', monsters: '마물 토벌', orcs: '오크 토벌' };
// 지금 나갈 수 있는 전쟁들: [{ key(ARMIES), name, kind, foe }]
export function warsForArmy(g) {
  const out = activeWars(g).map((k) => ({ key: k, name: WAR_NAME[k], kind: 'realm' }));
  for (const w of ownWars(g)) {
    if (w.a !== 'leonia' && w.b !== 'leonia') continue;
    const foe = foeIn(w, 'leonia');
    if (ARMIES[`realm_${foe}`]) out.push({ key: `realm_${foe}`, name: `${short(foe)} 전선`, kind: 'politics', foe });
  }
  return out;
}

/* ---------- 출정 ---------- */
function startCampaign(g, rng, war) {
  const a = A(g);
  a.campaign = { key: war.key, name: war.name, kind: war.kind, foe: war.foe ?? null, month: 0, months: war.kind === 'peace' ? rng.int(1, 2) : rng.int(3, 5), morale: 60, marched: [] };
  a.campaigns += 1;
}
defineScene('army_muster', {
  need: (g, s) => enlisted(g) && !onCampaign(g) && !captive(g),
  title: (g, s) => '출정 명령',
  text: (g, s) => {
    const peace = s.war.kind === 'peace';
    return peace
      ? `${(ARMIES[s.war.key] ?? ARMIES.bandits).name}이 고갯길 마을들을 덮쳤다는 전갈이 왔다. ${A(g).service.unit}에 토벌 명령이 떨어졌다. 한두 달이면 돌아올 것이다.`
      : `북이 세 번 울렸다. ${A(g).service.unit}은 ${J(s.war.name, '으로/로')} 간다. 막사마다 사람들이 말없이 짐을 꾸렸다. 누군가 유서를 쓰는 소리가 들렸다. 몇 달은 돌아오지 못할 것이다.`;
  },
  choices: (g) => [{ label: '대열에 선다', key: 'go' }, { label: '밤을 틈타 병영을 빠져나간다', key: 'desert' }],
  resolve(g, rng, s, key) {
    if (key === 'desert') { desert(g, 'muster'); return '자정 무렵 담을 넘었다. 뒤에서 아무도 부르지 않았다. 그게 더 무서웠다.'; }
    startCampaign(g, rng, s.war);
    tired(g, 10);
    return `${J(A(g).campaign.name, '으로/로')} 가는 행렬에 섰다. 성문을 나설 때 아이들이 따라오며 손을 흔들었다.`;
  },
});

/* ---------- 행군 ---------- */
const MARCH = [
  {
    id: 'mud', title: '진흙길', text: '사흘째 비가 그치지 않는다. 길은 무릎까지 빠지는 진흙탕이 되었다. 수레바퀴가 박혀 움직이지 않는다.',
    choices: [{ label: '어깨로 수레를 민다', key: 'push' }, { label: '짐을 덜어 버리자고 한다', key: 'dump' }],
    resolve(g, rng, key) {
      if (key === 'push') { tired(g, 15); gainStat(g, 'str', 0.4); addMerit(g, 4); return '진흙을 뒤집어쓰고 수레를 밀었다. 해 질 녘에야 고개를 넘었다. 십인장이 내 등을 두드렸다.'; }
      A(g).campaign.morale -= 4; return '화살 다발 두 짐을 길가에 버렸다. 열흘 뒤, 그 화살이 아쉬웠다.';
    },
  },
  {
    id: 'forage', title: '굶주린 행군', text: '보급 마차가 끊겼다. 사흘째 빵 한 조각으로 버틴다. 길가 마을의 곳간에는 겨울을 날 밀이 있다. 백인장은 "알아서 구하라"고만 했다.',
    choices: [{ label: '곳간을 턴다', key: 'loot' }, { label: '값을 치르고 산다', key: 'buy' }, { label: '굶는다', key: 'starve' }],
    resolve(g, rng, key) {
      if (key === 'loot') { stress(g, 6); A(g).campaign.morale += 5; L(g).notoriety = Math.min(100, (L(g).notoriety ?? 0) + 2); return '곳간 문을 부쉈다. 할머니 하나가 문간에 주저앉아 울었다. 그날 밤 부대는 배불리 먹었다.'; }
      if (key === 'buy') { if (!spend(g, 10)) { tired(g, 10); return '주머니가 비어 있었다. 굶었다.'; } A(g).campaign.morale += 3; return '내 품삯으로 밀 두 자루를 샀다. 마을 사람들이 놀란 얼굴로 은화를 세었다.'; }
      tired(g, 18); stress(g, 4); A(g).campaign.morale -= 5; return '허리띠를 졸랐다. 행군 대열에서 쓰러지는 사람이 생겼다.';
    },
  },
  {
    id: 'fever', title: '진영의 열병', text: '진영에 이질이 돌았다. 하룻밤 새 열 명이 쓰러졌다. 군의관은 한 명뿐이다.',
    choices: [{ label: '앓는 동료들을 돌본다', key: 'nurse' }, { label: '멀찍이 떨어져 지낸다', key: 'away' }],
    resolve(g, rng, key) {
      if (key === 'nurse') { addMerit(g, 6); if (rng.chance(0.3)) { g.player.injuries.push({ name: '진영에서 옮은 이질', months: 2 }); return '물을 끓이고 토사물을 치웠다. 사흘 뒤 나도 쓰러졌다. 살아남았다.'; } return '물을 끓이고 토사물을 치웠다. 돌본 열 명 중 일곱이 일어났다.'; }
      return '바람이 불어오는 쪽에 천막을 쳤다. 앓는 소리가 밤새 들렸다.';
    },
  },
  {
    id: 'burn_village', title: '불태우라는 명령', text: '적이 쓸 수 없게 강가 마을을 태우라는 명령이 내려왔다. 마을 사람들은 아직 집 안에 있다. 백인장은 해가 지기 전에 끝내라고 했다.',
    choices: [{ label: '명령대로 한다', key: 'obey' }, { label: '먼저 사람들을 내보내고 태운다', key: 'warn' }, { label: '횃불을 내려놓는다', key: 'refuse' }],
    resolve(g, rng, key) {
      if (key === 'obey') { stress(g, 14); addMerit(g, 6); if (rng.chance(0.25)) addScar(g, rng, true); return '횃불을 던졌다. 연기 너머에서 무슨 소리가 났다. 듣지 않으려고 했다.'; }
      if (key === 'warn') { addMerit(g, 2); stress(g, 4); L(g).renown += 1; return '집집마다 문을 두드려 사람들을 내보냈다. 시간이 걸렸다. 백인장은 혀를 찼지만 마을은 해 지기 전에 탔다. 사람은 타지 않았다.'; }
      addMerit(g, -35); stress(g, 6);
      if (rankOf(g) >= 3) return '나는 백인장이다. 내 백인대는 횃불을 들지 않는다고 말했다. 천인장은 나를 오래 노려보았다. 마을은 다른 부대가 태웠다.';
      return '횃불을 땅에 내려놓았다. 십인장이 나를 묶어 짐수레에 실었다. 마을은 다른 손이 태웠다.';
    },
  },
  {
    id: 'ambush', title: '매복', text: '골짜기를 지나는데 위에서 돌이 굴러떨어졌다. 적 척후대다.',
    choices: [{ label: '비탈을 올라 맞선다', key: 'fight' }, { label: '방패를 들고 버틴다', key: 'hold' }],
    resolve(g, rng, key) {
      if (key === 'hold') { if (rng.chance(0.3)) addWound(g, rng, { unit: 'enemy_scout', count: 3 }, 1); A(g).campaign.morale -= 3; return '방패 뒤에 웅크렸다. 척후대는 화살을 쏟고 사라졌다. 셋이 죽었다.'; }
      addMerit(g, 8);
      queueFight(g, rng, { title: '골짜기의 매복', intro: '비탈 위 바위 뒤에 적 척후병들이 있다.', enc: { unit: 'enemy_scout', count: rng.int(3, 5), leader: null }, reward: { renown: 1 }, avoidLabel: '대열로 물러난다' }, { first: true });
      return '방패를 버리고 비탈을 기어올랐다.';
    },
  },
  {
    id: 'campfire', title: '모닥불', text: '행군이 멈춘 밤, 모닥불 앞에 십여 명이 둘러앉았다. 각자 고향 이야기를 한다. 대장장이 아들, 양치기, 빚을 지고 도망친 서기. 한 녀석이 전쟁이 끝나면 장가를 간다고 했다.',
    choices: [{ label: '내 이야기를 한다', key: 'talk' }, { label: '듣기만 한다', key: 'listen' }],
    resolve(g, rng, key) {
      const name = pickOf(rng, ['한스', '디터', '볼프', '쿠르트', '파울', '에른스트', '빌리', '오스카']);
      A(g).comrades.push({ name, alive: true, how: '모닥불 앞에서 만났다' });
      stress(g, -8);
      return key === 'talk' ? `내 고향 이야기를 했다. ${J(name, '이/가')} 제일 크게 웃었다. 그 뒤로 ${J(name, '은/는')} 행군 내내 내 옆에서 걸었다.` : `불꽃 너머로 ${J(name, '이/가')} 장가갈 여자의 이름을 몇 번이고 되뇌었다. 다들 놀렸다. 다들 부러워했다.`;
    },
  },
  {
    id: 'runaway', title: '도망치는 동료', text: '새벽 보초를 서는데 동료 하나가 짐을 메고 숲 쪽으로 기어가는 것을 보았다. 눈이 마주쳤다. 그는 손가락을 입술에 댔다.',
    choices: [{ label: '보내 준다', key: 'let' }, { label: '고함을 지른다', key: 'shout' }, { label: '같이 간다', key: 'join' }],
    resolve(g, rng, key) {
      if (key === 'join') { desert(g, 'march'); return '말없이 짐을 챙겨 그를 따라갔다. 숲은 생각보다 어두웠다.'; }
      if (key === 'shout') { addMerit(g, 10); stress(g, 10); return '고함을 질렀다. 그는 숲 가장자리에서 붙잡혔다. 다음 날 아침 대열 앞에서 그의 목이 매달렸다. 그의 눈이 오래 남았다.'; }
      return '고개를 돌렸다. 아침 점호에서 한 자리가 비었다. 아무도 내게 묻지 않았다.';
    },
  },
  {
    id: 'river', title: '강을 건너다', text: '다리가 끊겼다. 물살이 빠르다. 공병들이 밧줄을 걸었지만 갑옷을 입고 건너기엔 위험하다.',
    choices: [{ label: '갑옷을 벗고 먼저 건너 밧줄을 묶는다', key: 'swim' }, { label: '차례를 기다린다', key: 'wait' }],
    resolve(g, rng, key) {
      if (key === 'wait') { if (rng.chance(0.2)) { const n = A(g).comrades.find((c) => c.alive); if (n) { n.alive = false; n.how = '강에 휩쓸렸다'; stress(g, 12); return `차례를 기다렸다. 앞서 건너던 ${J(n.name, '이/가')} 발을 헛디뎠다. 물살이 그를 데려갔다.`; } } return '차례를 기다려 밧줄을 잡고 건넜다. 이가 딱딱 부딪쳤다.'; }
      if (check(rng, g.player.stats.str + g.player.stats.agi, 50)) { addMerit(g, 12); return '찬물에 뛰어들었다. 세 번 휩쓸릴 뻔했다. 건너편 나무에 밧줄을 묶었을 때 강 건너에서 함성이 났다.'; }
      g.player.injuries.push({ name: '강바위에 찢긴 다리', months: 2 }); addMerit(g, 5); return '물살에 휩쓸려 바위에 부딪쳤다. 동료들이 밧줄로 끌어냈다. 다리를 다쳤지만 밧줄은 건너갔다.';
    },
  },
];
defineScene('army_march', {
  need: (g, s) => onCampaign(g) && !!MARCH.find((e) => e.id === s.ev),
  title: (g, s) => MARCH.find((e) => e.id === s.ev).title,
  text: (g, s) => `(${A(g).campaign.name}, 행군 ${A(g).campaign.month}달째) ${MARCH.find((e) => e.id === s.ev).text}`,
  choices: (g, s) => MARCH.find((e) => e.id === s.ev).choices,
  resolve: (g, rng, s, key) => MARCH.find((e) => e.id === s.ev).resolve(g, rng, key),
});

/* ---------- 큰 싸움 ---------- */
const enemyOf = (c) => ARMIES[c.key] ?? ARMIES.bandits;
defineScene('army_clash', {
  need: (g) => onCampaign(g),
  title: (g) => `${A(g).campaign.name}의 싸움`,
  text: (g) => {
    const c = A(g).campaign;
    const E = enemyOf(c);
    const rk = rankOf(g);
    const mood = c.morale >= 65 ? '병사들의 눈이 살아 있다.' : c.morale >= 45 ? '병사들은 지쳤지만 아직 버틴다.' : '대열 곳곳에서 떨리는 창끝이 보인다.';
    if (rk >= 3) return `새벽 안개 너머로 ${E.name}의 깃발이 보인다. 내 ${rk === 4 ? '천인대' : '백인대'}는 ${rk === 4 ? '중앙' : '왼쪽 날개'}를 맡았다. ${mood} 작전을 정해야 한다.`;
    return `새벽 안개 너머로 ${E.name}의 깃발이 보인다. 북이 울리고, 앞줄부터 창이 내려왔다. ${mood} 내 자리는 ${rk === 2 ? '열 명의 맨 앞' : '대열 셋째 줄'}이다.`;
  },
  choices: (g) => (rankOf(g) >= 3
    ? [{ label: '정면으로 진격한다', key: 'charge' }, { label: '측면으로 돈다', key: 'flank' }, { label: '언덕에 진을 치고 기다린다', key: 'hold' }, { label: '밤을 틈타 기습한다', key: 'night' }]
    : [{ label: '대열을 지킨다', key: 'line' }, { label: '앞장서서 적진에 뛰어든다', key: 'front' }, { label: '몸을 사린다', key: 'back' }, { label: '창을 버리고 달아난다', key: 'flee' }]),
  resolve(g, rng, s, key) {
    const a = A(g);
    const c = a.campaign;
    if (key === 'flee') { desert(g, 'battle'); stress(g, 10); return '창을 버리고 등을 돌렸다. 뒤에서 누군가 내 이름을 불렀다. 돌아보지 않았다.'; }
    const E = enemyOf(c);
    const rk = rankOf(g);
    tired(g, 25); stress(g, 12);
    a.battles += 1;
    gainSkill(g, 'sword', 1.2, 'str');
    const lines = [];
    let won;
    if (rk >= 3) {
      const troops = rk === 4 ? 400 : 100;
      const q = Math.min(75, 40 + leadership(g) / 4 + (c.morale - 50) / 5);
      const r = fightBattle(g, rng, { troops, q }, { key: ARMIES[c.key] ? c.key : 'bandits', troops: Math.round(troops * rng.float(0.8, 1.5)) }, key);
      lines.push(...r.log, `(우리 쪽 ${r.lostOur}명, 적 ${r.lostThem}명이 쓰러졌다)`);
      won = r.outcome === 'win' ? true : r.outcome === 'lose' ? false : rng.chance(0.5);
      if (r.moments.includes('duel_win')) heroic(g, rng, lines, c);
    } else {
      // 전장 전체의 승패는 사기와 운이 정한다. 내 행동은 나와 내 곁의 몇 명을 바꾼다.
      const myPow = playerPower(g);
      let p = 0.52 + (c.morale - 55) / 150 - (E.q - 45) / 200;
      if (key === 'front') {
        const ok = check(rng, myPow, E.champ * 0.5);
        if (ok) { p += 0.08; lines.push(pickOf(rng, ['적의 첫 줄을 뚫고 들어갔다. 내 뒤로 동료들이 쏟아져 들어왔다.', `${E.champName}의 호위병 둘을 쓰러뜨렸다. 적의 대열이 흔들렸다.`])); heroic(g, rng, lines, c); }
        else { lines.push('앞으로 뛰쳐나갔지만 적의 창벽에 막혔다.'); addWound(g, rng, { unit: E.foe, count: 1 }, rng.int(1, 3)); }
        addMerit(g, 20);
      } else if (key === 'line') { lines.push(pickOf(rng, ['방패를 겹치고 버텼다. 옆 사람의 숨소리가 들렸다.', '창을 내지르고, 당기고, 다시 내질렀다. 몇 번인지 세지 않았다.'])); addMerit(g, 12); if (rng.chance(0.3)) addWound(g, rng, { unit: E.foe, count: 1 }, 1); }
      else { lines.push('셋째 줄 뒤에서 방패를 머리 위로 들고 버텼다. 앞줄이 하나씩 쓰러졌다.'); addMerit(g, 3); }
      won = rng.chance(Math.max(0.1, Math.min(0.9, p)));
      lines.push(won ? pickOf(rng, [`${J(E.name, '이/가')} 무너졌다. 들판에 함성이 퍼졌다.`, '적의 깃발이 쓰러졌다. 이겼다. 다리가 풀려 주저앉았다.']) : pickOf(rng, ['퇴각 나팔이 울렸다. 대열이 무너졌다.', '옆 대열이 먼저 무너졌다. 우리도 밀렸다. 졌다.']));
    }
    // 동료의 죽음
    const friend = a.comrades.find((x) => x.alive);
    if (friend && rng.chance(won ? 0.15 : 0.3)) { friend.alive = false; friend.how = `${c.name}에서 죽었다`; stress(g, 15); lines.push(`싸움이 끝나고 ${J(friend.name, '을/를')} 찾아다녔다. 진흙 속에서 찾았다. 눈을 감겨 주었다.`); }
    // 몸과 마음의 상처
    if (rng.chance(0.08)) { const sc = addScar(g, rng, false); if (sc) lines.push(`(평생 남을 상처: ${sc})`); }
    if (rng.chance(won ? 0.06 : 0.14)) { const sc = addScar(g, rng, true); if (sc) lines.push(`(마음에 남은 것: ${sc})`); }
    moveWar(g, c, won ? 1 : -1);
    if (won) { a.won += 1; addMerit(g, 15); g.player.money += 5 + rk * 5; lines.push(`(전리품 몫 은화 ${5 + rk * 5}닢)`); }
    a.campaign = null;
    note(g, `${c.name}의 싸움: ${won ? '이겼다' : '졌다'}.`);
    // 지면 포로가 되기도 한다
    if (!won && rng.chance(rk >= 3 ? 0.35 : key === 'front' ? 0.3 : 0.18)) {
      a.captive = { by: E.name, months: 0, ransom: 30 + rk * 60, officer: rk >= 3, war: c.key };
      logArmy(g, `${c.name}에서 ${E.name}에게 사로잡혔다.`, 40);
      lines.push(`정신이 들었을 때 손목이 묶여 있었다. ${E.name}의 포로가 되었다.`);
    } else lines.push(won ? '살아서 병영으로 돌아간다.' : '남은 자들을 모아 병영으로 물러났다.');
    return lines.filter(Boolean).join(' ');
  },
});
function heroic(g, rng, lines, c) {
  const a = A(g);
  if (!rng.chance(0.45)) return;
  const name = `${c.name.replace(/의 싸움$/, '')} 전투의 은빛 방패`;
  a.medals.push({ name, year: g.date.year, why: c.name });
  addMerit(g, 60);
  L(g).renown += 5;
  logArmy(g, `${c.name}에서 공을 세워 ${J(name, '을/를')} 받았다.`, 70);
  lines.push(`싸움이 끝나고 천인장이 내 이름을 불렀다. ${J(name, '이/가')} 내 가슴에 걸렸다.`);
}
function moveWar(g, c, dir) {
  if (c.key === 'balhart') nudge(g, 'front', dir * 1.2);
  else if (c.key === 'garbes') nudge(g, 'garbes', -dir * 2);
  else if (c.kind === 'politics') {
    const w = ownWars(g).find((x) => (x.a === 'leonia' && x.b === c.foe) || (x.b === 'leonia' && x.a === c.foe));
    if (w) w.score += (w.a === 'leonia' ? 1 : -1) * dir * 1.2;
  }
}

/* ---------- 포로와 몸값 ---------- */
ACTIONS.push({
  id: 'army_escape', name: '탈출을 노리기', icon: 'wander',
  desc: '포로 막사의 빈틈을 찾는다. 실패하면 매를 맞는다.',
  available: (g) => captive(g),
  run(g, rng) {
    const a = A(g);
    if (!a.captive) return '이미 풀려나 있었다. 막사 울타리가 멀리 보였다.';
    tired(g, 12);
    if (check(rng, g.player.stats.agi + g.player.stats.sen + a.captive.months * 3, 85)) {
      const by = a.captive.by;
      release(g, 'escape');
      addMerit(g, 30); L(g).renown += 2;
      return `보초가 조는 틈에 울타리 밑을 팠다. 사흘 밤낮을 숲으로 걸어 우리 진영에 닿았다. ${by}의 포로 막사에서 제 발로 걸어 나온 사람은 드물다.`;
    }
    g.player.injuries.push({ name: '포로 막사에서 맞은 등', months: 1 }); stress(g, 8);
    return '울타리를 넘다 붙잡혔다. 그날 밤 매를 맞았다. 빈틈은 다시 찾으면 된다.';
  },
});
ACTIONS.push({
  id: 'army_captive_wait', name: '포로 막사에서 견디기', icon: 'meditate',
  desc: '몸값이나 포로 교환을 기다린다.',
  available: (g) => captive(g),
  run(g, rng) {
    if (!A(g).captive) return '하루를 쉬었다. 묶였던 손목이 아직 저렸다.';
    tired(g, -10); stress(g, 3);
    gainStat(g, 'wil', 0.3);
    return pickOf(rng, ['묽은 죽을 받아 마셨다. 옆 포로가 남긴 것까지 마셨다.', '적 병사들이 우리를 보며 무언가 수군거렸다. 몸값 이야기 같았다.', '흙바닥에 날짜를 새겼다. 줄이 늘어 간다.', '같은 막사의 늙은 포로가 적의 말을 몇 마디 가르쳐 주었다.']);
  },
});
const CAPTIVE_OK = new Set(['army_escape', 'army_captive_wait', 'rest', 'meditate']);
const CAMPAIGN_OK = new Set(['rest', 'meditate', 'train_body', 'work', 'army_resign']);
HOOKS.actionFilter.push((g, a) => {
  const ar = g.army;
  if (!ar) return true;
  if (ar.captive) return CAPTIVE_OK.has(a.id);
  if (CAPTIVE_OK.has(a.id) && a.id.startsWith('army_')) return false;
  if (ar.campaign) return CAMPAIGN_OK.has(a.id) && a.id !== 'army_resign';
  return true;
});
function release(g, how) {
  const a = A(g);
  a.captive = null;
  if (a.service) { a.service.awol = 0; L(g).place = a.service.place; L(g).travel = null; }
  note(g, { escape: '포로 막사에서 달아났다.', ransom: '몸값을 치르고 풀려났다.', exchange: '포로 교환으로 풀려났다.', crown: '왕국이 몸값을 치러 주어 풀려났다.' }[how] ?? '풀려났다.');
}
defineScene('army_ransom', {
  need: (g) => captive(g),
  title: () => '몸값',
  text: (g) => {
    const c = A(g).captive;
    return `${c.by}의 장교가 포로 막사에 들어와 명부를 읽었다. 몸값을 낼 수 있는 자는 은화 ${c.ransom}닢이면 풀어 준다고 했다. ${c.officer ? '장교는 몸값이 비싸지만, 그만큼 왕국이 챙긴다는 말도 있다.' : '병졸의 몸값은 아무도 대신 내 주지 않는다.'}`;
  },
  choices: (g) => [...(canSpend(g, A(g).captive.ransom) ? [{ label: `은화 ${A(g).captive.ransom}닢을 치른다`, key: 'pay' }] : []), { label: '기다린다', key: 'wait' }],
  resolve(g, rng, s, key) {
    if (key === 'pay' && spend(g, A(g).captive.ransom)) { release(g, 'ransom'); return '집에 편지를 보냈다. 한 달 뒤 몸값이 왔다. 묶였던 손목에 자국이 남았다.'; }
    return '기다렸다. 명부를 읽는 장교의 목소리가 멀어졌다.';
  },
});

/* ---------- 달마다: 원정 진행, 출정, 포로 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const a = A(g);
  if (a.captive) {
    const c = a.captive;
    c.months += 1;
    const warOver = !warsForArmy(g).some((w) => w.key === c.war) && !['bandits', 'monsters', 'orcs'].includes(c.war);
    if (warOver || c.months >= 12) { release(g, 'exchange'); g.news.unshift({ text: warOver ? '전쟁이 끝나 포로들이 교환되었다. 나도 집으로 간다.' : '포로 교환으로 풀려났다. 한 해 만에 하늘이 넓었다.', rel: 100 }); return; }
    if (c.officer && c.months >= 6 && rng.chance(0.3)) { release(g, 'crown'); g.news.unshift({ text: '왕국이 장교들의 몸값을 치렀다. 풀려났다.', rel: 100 }); return; }
    if (c.months % 3 === 1 && !sceneQueued(g, 'army_ransom')) queueScene(g, 'army_ransom', { at: null });
    return;
  }
  if (!a.service || isJailed(g)) return;
  const c = a.campaign;
  if (c) {
    c.month += 1;
    if (c.month >= c.months) { if (!sceneQueued(g, 'army_clash')) queueScene(g, 'army_clash', {}, { first: true }); return; }
    const pool = MARCH.filter((e) => !c.marched.includes(e.id));
    if (pool.length && !sceneQueued(g, 'army_march')) { const e = pickOf(rng, pool); c.marched.push(e.id); queueScene(g, 'army_march', { ev: e.id }, { first: true }); }
    return;
  }
  if (sceneQueued(g, 'army_muster') || L(g).travel || L(g).place !== a.service.place) return;
  const wars = warsForArmy(g);
  if (wars.length && rng.chance(0.15)) queueScene(g, 'army_muster', { war: pickOf(rng, wars) }, { first: true });
  else if (!wars.length && rng.chance(0.025)) { const k = pickOf(rng, ['bandits', 'bandits', 'monsters', 'orcs']); queueScene(g, 'army_muster', { war: { key: k, name: WAR_NAME[k], kind: 'peace' } }, { first: true }); }
});

export { release, MARCH, WAR_NAME };
