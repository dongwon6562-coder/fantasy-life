// 미궁의 주인 "깊은 왕": 첫 드워프 왕 그론. 구렁을 파다 바닥의 무언가를 만났고, 그 몸을 입은 것이 아직 판다.
// - 싸운다: 이기면 구렁이 잠잠해지고 이름이 대륙에 남는다.
// - 봉인한다: 그론의 반지(감정한 것)나 5서클 마법이 있어야 한다.
// - 무릎을 꿇는다(악당의 길): 힘을 얻는 대신, 구렁이 이따금 마물을 세상에 토해 낸다(세계의 위기와 이어진다).
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { circleOf } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, note, chron, stress } from '../adventure/core.js';
import { runFight, companionsFor } from '../adventure/fight.js';
import { playerPower, playerVitality, threatWord } from '../adventure/combat.js';
import { CR, CRISES, startCrisis } from '../crisis/core.js';
import { D, FLOORS, mi } from './core.js';
import { atGorge } from './delve.js';

const KING = { unit: 'abyss_spawn', count: 2, leader: 'deep_king' };
// 함께 가는 사람: 파티(또는 친한 모험가) + 주점에서 손잡은 탐사대
const withAlly = (g) => { const c = companionsFor(g).slice(); const al = D(g).ally; if (al) c.push({ name: al.name, pow: al.pow }); return c; };
const won = (r) => r.outcome === 'win' || r.outcome === 'overwhelm';
const canSeal = (g) => D(g).relics.some((r) => r.id === 'gron_ring' && r.known) || circleOf(g) >= 5;

ACTIONS.push({
  id: 'deep_throne',
  name: '왕좌의 문을 연다',
  icon: 'crown',
  desc: '깊은 구렁의 바닥, 깊은 왕에게 간다. 돌아오지 못할 수도 있다.',
  available: (g) => isAdult(g) && atGorge(g) && D(g).gate >= FLOORS && ['alive', 'pact'].includes(D(g).lord) && !sceneQueued(g, 'deep_throne') && !g.player.injuries.some((i) => i.mortal),
  run(g) { queueScene(g, 'deep_throne'); return '열어 둔 돌문들을 지나 다시 바닥으로 내려갔다.'; },
});
defineScene('deep_throne', {
  need: (g) => atGorge(g) && ['alive', 'pact'].includes(D(g).lord),
  title: () => '깊은 왕',
  text: (g) => {
    const comps = withAlly(g);
    const pow = playerPower(g) + comps.reduce((a, c) => a + c.pow, 0);
    if (D(g).lord === 'pact') return `왕좌의 방은 그대로다. 깊은 왕이 곡괭이질을 멈추고 나를 본다. 내 안의 목소리가 반갑게 웃는다. "내 사람이 돌아왔구나." 계약을 깰 수도 있다. 가늠해 보니 ${threatWord(pow, KING)}`;
    return `문 너머는 왕궁이었다. 드워프의 왕궁. 기둥마다 왕의 이름이 새겨져 있고, 맨 안쪽 바위벽 앞에서 왕관을 쓴 드워프가 곡괭이로 벽을 판다. 천 년 동안 판 벽은 거울처럼 매끄럽다. 왕이 돌아본다. 눈이 있어야 할 자리에 심연이 있다. "더 깊이." 목소리가 바닥에서 올라온다. "함께 파자. 바닥 아래에는 모든 것이 있다." 가늠해 보니 ${threatWord(pow, KING)}`;
  },
  choices: (g) => {
    const pact = D(g).lord === 'pact';
    const out = [
      { label: pact ? '계약을 깨고 정면으로 맞선다' : '정면으로 맞선다', key: 'charge' },
      { label: '기둥 사이로 돌아 기습한다', key: 'ambush' },
    ];
    if (circleOf(g) >= 2) out.push({ label: '마법으로 친다', key: 'magic' });
    if (canSeal(g)) out.push({ label: D(g).relics.some((r) => r.id === 'gron_ring' && r.known) ? '그론의 반지로 왕을 다시 잠재운다' : '봉인 술식으로 구렁째 잠재운다', key: 'seal' });
    if (!pact) out.push({ label: '무릎을 꿇고 목소리를 받아들인다', key: 'pact' });
    out.push({ label: '문을 닫고 돌아선다', key: 'leave' });
    return out;
  },
  resolve(g, rng, s, key) {
    const d = D(g);
    const life = L(g);
    if (key === 'leave') { stress(g, 6); return '문을 닫았다. 등 뒤에서 곡괭이 소리가 다시 시작되었다. 올라가는 내내 그 소리가 따라왔다.'; }
    if (key === 'seal') {
      if (!canSeal(g)) return '반지도 술식도 없이 봉인은 할 수 없었다.';
      const ring = d.relics.findIndex((r) => r.id === 'gron_ring');
      if (ring >= 0) d.relics.splice(ring, 1);
      d.lord = 'sealed';
      life.renown += 15;
      stress(g, 8);
      g.player.money += 200;
      chron(g, `${g.player.name}, 깊은 구렁의 바닥에서 깊은 왕을 다시 잠재우다.`, 95);
      note(g, '깊은 왕을 봉인했다.');
      return `${ring >= 0 ? '반지를 왕의 손가락에 끼웠다. 왕이 처음으로 곡괭이를 내려놓았다. 심연이던 눈에 잠깐 드워프의 눈이 돌아왔다. "아…… 너무 깊이 팠구나." 왕은 왕좌에 앉아 눈을 감았고, 돌이 되었다.' : '사흘 밤낮으로 봉인진을 그렸다. 마력이 바닥나 코피가 멈추지 않았다. 마지막 획을 긋자 왕의 몸이 돌로 굳어 갔다. 곡괭이 소리가 멎었다.'} 구렁 전체가 길게 숨을 내쉬었다. 드워프 왕궁에서 은화 200닢과 감사장이 왔다.`;
    }
    if (key === 'pact') {
      d.lord = 'pact';
      d.spawnAt = mi(g);
      const gear = life.gear;
      if ((gear.weapon ?? 0) < 24) { gear.weapon = 24; gear.weaponName = '깊은 왕의 곡괭이날'; }
      for (const k of ['str', 'wil', 'int']) g.player.stats[k] = Math.min(100, (g.player.stats[k] ?? 0) + 5);
      life.notoriety = Math.min(100, (life.notoriety ?? 0) + 15);
      stress(g, 20);
      chron(g, `${g.player.name}, 깊은 구렁의 바닥에서 돌아오다. 무엇을 보았는지는 아무도 모른다.`, 60);
      note(g, '깊은 왕과 계약했다.');
      return '무릎을 꿇었다. 왕이 곡괭이날로 내 이마를 그었다. 피가 흘러 눈으로 들어갔고, 그 피를 통해 바닥 아래가 보였다. 끝이 없었다. 모든 것이 있었다. 올라왔을 때 내 손에는 왕의 곡괭이날이 들려 있었고, 몸은 전보다 강했다. 그리고 이제 나는 안다. 구렁은 이따금 배가 고프다.';
    }
    const comps = withAlly(g);
    D(g).ally = null;
    const r = runFight(g, rng, { enc: { ...KING }, reward: {} }, key, { companions: comps, flee: 22, hp: playerVitality(g), short: true });
    if (!won(r)) { stress(g, 12); return `${r.text} 왕은 나를 쫓지 않았다. 다시 벽을 팠다. 나 따위는 천 년 중 하루에 지나지 않는다는 듯이.`; }
    const wasPact = d.lord === 'pact';
    d.lord = 'slain';
    life.renown += 25;
    if (wasPact) life.notoriety = Math.max(0, (life.notoriety ?? 0) - 10);
    g.player.money += 400;
    chron(g, `${g.player.name}, 깊은 구렁의 주인 깊은 왕을 쓰러뜨리다. 첫 드워프 왕 그론이 천 년 만에 잠들다.`, 100);
    note(g, '깊은 왕을 쓰러뜨렸다.');
    return `${r.text} 왕이 무릎을 꿇었다. 심연이 눈에서 빠져나가 바닥의 틈으로 흘러 들어갔다. 남은 것은 늙고 지친 드워프의 시체 하나였다. 왕관을 들고 올라왔다. 구렁목의 종이 밤새 울렸고, 드워프 왕궁에서 은화 400닢과 함께 그론의 왕관을 돌려 달라는 정중한 편지가 왔다.${wasPact ? ' 내 안의 목소리가 비명을 지르며 사라졌다.' : ''}`;
  },
});

// 계약의 대가: 구렁이 마물을 토해 낸다 (세계의 위기 '검은 물결'과 이어진다)
HOOKS.afterMonth.push((g, rng) => {
  const d = D(g);
  if (d.lord !== 'pact' || g.over || mi(g) - d.spawnAt < 24 || !rng.chance(0.08)) return;
  d.spawnAt = mi(g);
  note(g, '깊은 구렁에서 마물이 넘쳐 나왔다는 소식이 들려왔다. 이마의 흉터가 뜨겁다.');
  chron(g, '깊은 구렁의 돌문이 부서지고 마물이 쏟아져 나오다.', 60);
  if (!CR(g).active && CRISES.horde) startCrisis(g, rng, 'horde');
});
