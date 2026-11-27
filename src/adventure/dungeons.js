// 미궁. 층마다 교전이 벌어지고, 다친 몸은 다음 층으로 이어진다. 가장 깊은 곳엔 주인이 있다.
// 그리고 장비: 무기와 갑옷을 맞춘다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { circleOf, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, traveling, isAdult, note, chron, stress, tired, spend, canSpend } from './core.js';
import { runFight, companionsFor } from './fight.js';
import { playerVitality, playerPower, threatWord, describeFoes, foeTotal } from './combat.js';
import { fac } from '../factions.js';
import { PLACES } from '../places.js';
import { opener } from '../narrative/openers.js';

export const DUNGEONS = {
  old_tower: {
    name: '무너진 탑 지하', place: 'ern', guild: false,
    desc: '숲 너머 무너진 탑. 아이들이 밤에 불빛을 보았다던 그곳의 계단은 생각보다 깊이 내려간다.',
    floors: [
      { text: '이끼 낀 계단 아래 창고였던 방.', foes: [['giant_rat', 4, 8]] },
      { text: '벽에 오래된 문양이 새겨진 복도. 공기가 차갑다.', foes: [['kobold', 3, 5], ['giant_rat', 6, 9]] },
    ],
    boss: { text: '맨 아래 원형의 방. 꺼진 화로 앞에 무언가 서 있다. 불빛의 정체였다.', enc: { unit: 'skeleton', count: 2, leader: 'tower_wraith' } },
    loot: [2, 5], bossLoot: 25, prize: { slot: 'weapon', name: '문양이 새겨진 단검', value: 4 },
  },
  grey_hollow: {
    name: '회색 굴', place: 'harfen', guild: true,
    desc: '하르펜 남쪽 언덕의 석회 동굴. 고블린의 소굴이 되어 길드가 출입을 관리한다. 초보 모험가가 가장 많이 죽는 곳이기도 하다.',
    floors: [
      { text: '입구 쪽 넓은 굴. 뼈와 오물 냄새.', foes: [['goblin', 3, 5], ['giant_rat', 6, 10]] },
      { text: '갈라진 통로와 고블린의 함정들.', foes: [['goblin', 5, 7], ['kobold', 5, 7]] },
      { text: '고블린 마을이라 부를 만한 큰 동굴. 북소리가 들린다.', foes: [['goblin', 6, 9], ['hobgoblin', 1, 2]] },
    ],
    boss: { text: '동굴 맨 안쪽, 해골로 쌓은 옥좌.', enc: { unit: 'goblin', count: 5, leader: 'goblin_chief' } },
    loot: [4, 9], bossLoot: 60, merit: [3, 25], prize: { slot: 'armor', name: '고블린 족장의 사슬 조끼', value: 5 },
  },
  old_mine: {
    name: '버려진 은광', place: 'verden', guild: true,
    desc: '베르덴 서쪽 골짜기의 은광. 오십 년 전 광부들이 갱 안에서 한꺼번에 사라진 뒤로 아무도 캐지 않는다.',
    floors: [
      { text: '무너진 갱목과 녹슨 수레 레일.', foes: [['cave_spider', 2, 3], ['kobold', 5, 8]] },
      { text: '거미줄이 천장을 덮은 깊은 갱도.', foes: [['cave_spider', 3, 5]] },
      { text: '광부들의 숙소였던 곳. 침상마다 누군가 누워 있다.', foes: [['ghoul', 2, 4], ['skeleton', 4, 6]] },
    ],
    boss: { text: '은맥이 드러난 막장. 곡괭이를 든 형체가 아직도 벽을 파고 있다.', enc: { unit: 'skeleton', count: 4, leader: 'wight' } },
    loot: [8, 16], bossLoot: 140, merit: [6, 50], prize: { slot: 'weapon', name: '은맥으로 벼린 장검', value: 10 },
  },
  undercity: {
    name: '왕도 지하수로', place: 'leocast', guild: true,
    desc: '레오카스트 아래로 뻗은 수로. 그 아래에는 영웅왕 이전 시대의 무너진 도시가 묻혀 있다는 말이 있다.',
    floors: [
      { text: '악취 나는 수로와 쥐 떼.', foes: [['giant_rat', 8, 14], ['thug', 4, 6]] },
      { text: '빈민가 아래 밀수꾼들의 통로.', foes: [['bandit', 4, 7], ['ghoul', 2, 3]] },
      { text: '돌의 결이 달라졌다. 고대의 기둥들.', foes: [['cultist', 3, 5], ['skeleton', 5, 8]] },
      { text: '검은 촛불이 늘어선 제단의 방. 벽에 마신의 문양.', foes: [['cultist', 5, 7]] },
    ],
    boss: { text: '무너진 고대 신전의 바닥 아래, 물속에서 무언가 몸을 일으켰다.', enc: { unit: 'cultist', count: 3, leader: 'sewer_horror' } },
    loot: [14, 28], bossLoot: 320, merit: [10, 90], prize: { slot: 'armor', name: '고대 신전의 흑철 갑옷', value: 12 },
  },
};
export const dungeonHere = (g) => Object.entries(DUNGEONS).find(([, d]) => d.place === L(g).place);

ACTIONS.push({
  id: 'delve',
  name: '미궁 들어가기',
  desc: '근처의 미궁에 들어간다. 깊이 갈수록 위험하고 얻는 것도 많다.',
  available: (g) => {
    if (traveling(g) || sceneQueued(g, 'dungeon') || g.player.injuries.some((i) => i.mortal)) return false;
    const d = dungeonHere(g);
    if (!d) return false;
    if (d[1].guild) return isAdult(g) && !!fac(g, 'guild')?.member;
    return playerAge(g) >= 14;
  },
  run(g) {
    const dh = dungeonHere(g);
    if (!dh) return '미궁 입구를 찾아갔지만, 이 고장에는 들어갈 만한 미궁이 없었다.';
    const [id, d] = dh;
    queueScene(g, 'dungeon', { id });
    return `${d.name} 앞에 섰다.`;
  },
});

defineScene('dungeon', {
  title: (g, s) => DUNGEONS[s.id].name,
  text: (g, s) => {
    const d = DUNGEONS[s.id];
    const rec = L(g).dungeons[s.id];
    const comps = companionsFor(g);
    const pow = playerPower(g) + comps.reduce((a, c) => a + c.pow, 0);
    const known = rec ? ` 지난번엔 ${rec.cleared ? '주인을 쓰러뜨렸다' : `${rec.deepest}층까지 내려갔다`}.` : '';
    return `${d.desc}${known} 맨 아래의 주인은, 가늠해 보니 ${threatWord(pow, d.boss.enc)}${comps.length ? ` ${J(comps.map((c) => c.name).join(', '), '이/가')} 함께 가겠다고 했다.` : ''}`;
  },
  choices: (g, s) => {
    const out = [
      { label: '첫 층만 살피고 나온다', key: 'shallow' },
      { label: '신중하게, 갈 수 있는 데까지', key: 'careful' },
      { label: '과감하게, 가장 깊은 곳까지', key: 'bold' },
    ];
    if (canSpend(g, 12)) out.push({ label: '용병을 사서 신중하게 (은화 12닢)', key: 'merc' });
    out.push({ label: '돌아선다', key: 'leave' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'leave') return '입구의 어둠을 한참 들여다보다 돌아섰다.';
    return delve(g, rng, s.id, key);
  },
});

function delve(g, rng, id, mode) {
  const d = DUNGEONS[id];
  const life = L(g);
  const rec = (life.dungeons[id] ??= { deepest: 0, cleared: false, visits: 0 });
  rec.visits += 1;
  const comps = companionsFor(g);
  if (mode === 'merc') { spend(g, 12); comps.push({ name: '용병', pow: 22 + rng.int(0, 10) }); mode = 'careful'; }
  const flee = mode === 'bold' ? 18 : 45;
  let hp = playerVitality(g);
  const lines = [];
  let money = 0, merit = 0;
  const maxFloor = mode === 'shallow' ? 1 : d.floors.length;
  let floor = 0;
  let outcome = 'out';
  tired(g, 10);
  if (comps.length) lines.push(`${J(comps.map((c) => c.name).join(', '), '과/와')} 함께 내려갔다.`);
  for (; floor < maxFloor; floor++) {
    const f = d.floors[floor];
    const [unit, a, b] = rng.pick(f.foes);
    const enc = { unit, count: rng.int(a, b) };
    const tactic = floor === 0 && circleOf(g) >= 1 ? 'magic' : rng.chance(0.5) ? 'ambush' : 'charge';
    const r = runFight(g, rng, { enc, reward: {} }, tactic, { companions: comps, flee, hp, noTire: true, short: true });
    hp = r.hp ?? hp;
    lines.push(`[${floor + 1}층] ${f.text}`);
    lines.push(r.text);
    if (r.outcome === 'lose') { outcome = 'lose'; break; }
    if (r.outcome === 'flee') { outcome = 'fled'; break; }
    rec.deepest = Math.max(rec.deepest, floor + 1);
    const got = rng.int(d.loot[0], d.loot[1]);
    money += got;
    merit += d.merit?.[0] ?? 0;
    if (mode === 'careful' && hp < 55 && floor < maxFloor - 1) { lines.push('상처가 쌓였다. 더 내려가는 것은 욕심이다. 발길을 돌렸다.'); outcome = 'out'; floor++; break; }
  }
  // 주인
  if (outcome !== 'lose' && outcome !== 'fled' && floor >= d.floors.length && mode !== 'shallow' && (mode === 'bold' || hp >= 60)) {
    const enc = { ...d.boss.enc };
    const r = runFight(g, rng, { enc, reward: {} }, circleOf(g) >= 2 ? 'magic' : 'charge', { companions: comps, flee: mode === 'bold' ? 12 : 30, hp, noTire: true, short: true });
    lines.push(`[가장 깊은 곳] ${d.boss.text}`);
    lines.push(r.text);
    if (r.outcome === 'lose') outcome = 'lose';
    else if (r.outcome === 'flee') outcome = 'fled';
    else {
      outcome = 'cleared';
      money += d.bossLoot;
      merit += d.merit?.[1] ?? 0;
      if (!rec.cleared) {
        rec.cleared = true;
        life.renown += 5;
        note(g, `${d.name}의 주인을 쓰러뜨렸다.`);
        chron(g, `${g.player.name}, ${d.name}의 가장 깊은 곳에 닿다.`);
        if (d.prize && (life.gear[d.prize.slot] ?? 0) < d.prize.value) {
          life.gear[d.prize.slot] = d.prize.value;
          life.gear[d.prize.slot + 'Name'] = d.prize.name;
          lines.push(`주인의 곁에서 ${J(d.prize.name, '을/를')} 얻었다.`);
        }
      }
    }
  }
  if (outcome === 'lose') money = Math.floor(money / 3);
  g.player.money += money;
  if (merit && fac(g, 'guild')?.member) fac(g, 'guild').merit += merit;
  tired(g, 15);
  if (outcome === 'cleared') stress(g, -10); else stress(g, 6);
  const sum = { cleared: '미궁을 끝까지 정복했다.', out: '살아서 나왔다.', fled: '쫓기듯 빠져나왔다.', lose: '' }[outcome];
  return `${lines.join(' ')} ${sum}${money ? ` 마석과 전리품을 팔아 은화 ${money}닢을 벌었다.` : ''}${merit && fac(g, 'guild')?.member ? ` (길드 공적 +${merit})` : ''}`.trim();
}

/* ---------- 장비 ---------- */
const GEAR = {
  weapon: [
    { name: '쓸 만한 장검', value: 4, price: 15 },
    { name: '하르펜 대장간의 강철검', value: 8, price: 60, places: ['harfen', 'verden', 'leocast'] },
    { name: '드워프제 장검', value: 14, price: 220, places: ['leocast'] },
  ],
  armor: [
    { name: '누빈 가죽 갑옷', value: 3, price: 12 },
    { name: '사슬 갑옷', value: 7, price: 55, places: ['harfen', 'verden', 'leocast'] },
    { name: '판금 흉갑', value: 12, price: 200, places: ['leocast'] },
  ],
};
ACTIONS.push({
  id: 'gear',
  name: '장비 맞추기',
  desc: '대장간과 무구점에서 무기와 갑옷을 산다.',
  available: (g) => !traveling(g) && g.player.money >= 10 && L(g).place !== 'ern' && !sceneQueued(g, 'gear'),
  run(g, rng) { queueScene(g, 'gear'); return opener(g, 'gear', rng); },
});
defineScene('gear', {
  title: () => '무구점',
  text: (g) => {
    const gear = L(g).gear;
    return `지금 무기: ${gear.weaponName ?? '변변한 것 없음'}, 갑옷: ${gear.armorName ?? '없음'}. 가진 돈은 은화 ${g.player.money}닢.`;
  },
  choices: (g) => {
    const here = L(g).place;
    const gear = L(g).gear;
    const out = [];
    for (const slot of ['weapon', 'armor']) {
      for (const it of GEAR[slot]) {
        if (it.places && !it.places.includes(here)) continue;
        if ((gear[slot] ?? 0) >= it.value) continue;
        out.push({ label: `${it.name} (은화 ${it.price}닢)`, key: `${slot}:${it.name}` });
      }
    }
    out.push({ label: '구경만 한다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '칼날에 비친 내 얼굴만 실컷 보고 나왔다.';
    const [slot, name] = key.split(':');
    const it = GEAR[slot].find((x) => x.name === name);
    if (!it || !spend(g, it.price)) return '돈이 모자랐다. 주인이 칼을 도로 진열대에 걸었다.';
    const gear = L(g).gear;
    gear[slot] = it.value; gear[slot + 'Name'] = it.name;
    return `${J(it.name, '을/를')} 샀다. ${slot === 'weapon' ? '손에 감기는 무게가 좋았다.' : '어깨가 무거워진 만큼 마음이 가벼워졌다.'}`;
  },
});

export { foeTotal, PLACES };
