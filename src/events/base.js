// 1단계 사건들 (아기~성인식). 2단계에서 묶음으로 옮겼다.
import { playerAge, playerAgeMonths, gainStat, gainSkill } from '../game.js';
import { ageYears } from '../npc.js';
import { EVENTS, flag, setFlag, fam, father, mother, check, injure, living } from './core.js';

const knownChildFriend = (g) => living(g).find((p) => p.known && !p.isPlayer && p.affection >= 15
  && Math.abs(ageYears(p) - playerAge(g)) <= 3 && !g.player.familyIds.includes(p.id));

EVENTS.push(
  {
    id: 'first_steps', once: true,
    cond: (g) => playerAgeMonths(g) >= 11 && playerAgeMonths(g) <= 15,
    weight: 100,
    title: '첫걸음',
    text: (g) => `${mother(g)?.name ?? '어머니'}가 내민 손을 향해, 아이가 처음으로 두 발로 섰다. 비틀거리며 세 걸음. 집 안에 웃음이 터졌다.`,
    choices: [{ label: '계속', run: (g) => { gainStat(g, 'agi', 0.5); return '그날 저녁, 아버지는 이웃들에게 몇 번이고 그 이야기를 했다.'; } }],
  },
  {
    id: 'first_word', once: true,
    cond: (g) => playerAgeMonths(g) >= 16 && playerAgeMonths(g) <= 22,
    weight: 100,
    title: '첫 말',
    text: () => '아이가 처음으로 또렷하게 말을 했다.',
    choices: [
      { label: '"엄마"', run: (g) => { const m = mother(g); if (m) m.affection += 10; return '어머니는 아이를 꼭 끌어안았다.'; } },
      { label: '"아빠"', run: (g) => { const f = father(g); if (f) f.affection += 10; return '아버지는 애써 무덤덤한 척했지만, 귀가 빨개졌다.'; } },
      { label: '"빵"', run: (g) => { gainStat(g, 'sen', 0.5); return '부모는 한참을 웃었다. 이 아이는 먹을 것에 진심이다.'; } },
    ],
  },
  {
    id: 'mana_awaken', once: true,
    cond: (g) => !g.player.manaAwakened && playerAge(g) >= 4 && playerAge(g) <= 12 && g.player.manaPotential > 0.18,
    chance: (g) => 0.03 + g.player.manaPotential * 0.06,
    weight: 90,
    title: '손끝의 열기',
    text: () => '잠들기 전, 손끝이 이상하게 따뜻했다. 어둠 속에서 손을 펴자 희미한 빛이 아주 잠깐 맴돌다 사라졌다. 몸속 어딘가에서 무언가가 흐르고 있다.',
    choices: [
      { label: '부모에게 말한다', run: (g) => { g.player.manaAwakened = true; g.player.mana = 2; setFlag(g, 'mana_known'); return '부모는 놀랐고, 조금 두려워했다. 마력을 가진 아이는 흔하지 않다. 아버지는 마을 변두리의 마법사를 떠올렸다.'; } },
      { label: '비밀로 한다', run: (g) => { g.player.manaAwakened = true; g.player.mana = 2; gainStat(g, 'wil', 0.8); return '아무에게도 말하지 않았다. 밤마다 혼자 그 흐름을 더듬었다.'; } },
    ],
  },
  {
    id: 'harvest_festival', cooldown: 11,
    cond: (g) => g.date.month === 9 && playerAge(g) >= 4,
    weight: 60,
    title: '수확제',
    text: (g) => g.world.famine
      ? '흉년이라 수확제는 조촐했다. 그래도 사람들은 광장에 모였다. 사제가 성광의 이름으로 다음 해를 빌었다.'
      : '밀단이 광장 가득 쌓이고, 여관에서 맥주통이 굴러 나왔다. 피리 소리에 맞춰 사람들이 춤을 춘다.',
    choices: [
      { label: '춤을 춘다', run: (g, rng) => { const c = gainStat(g, 'cha', 1.0); g.player.stress = Math.max(0, g.player.stress - 20); const p = living(g).find((x) => !x.isPlayer && Math.abs(ageYears(x) - playerAge(g)) <= 2 && !g.player.familyIds.includes(x.id)); if (p) { p.known = true; p.affection += 8; return `${p.name}와(과) 손을 잡고 춤을 췄다. (매력 +${c.toFixed(1)})`; } return `밤늦게까지 춤을 췄다. (매력 +${c.toFixed(1)})`; } },
      { label: '힘겨루기에 나간다', run: (g, rng) => { if (playerAge(g) < 10) return '"꼬마는 내년에 와라." 어른들이 웃으며 돌려보냈다.'; if (check(rng, g.player.stats.str, 25)) { g.player.money += 3; return '또래를 전부 넘어뜨리고 상으로 은화 3닢을 받았다. 사람들이 이름을 기억하기 시작했다.'; } gainStat(g, 'wil', 0.5); return '첫 판에 나가떨어졌다. 흙투성이가 된 채 다음 해를 다짐했다.'; } },
      { label: '구경만 한다', run: (g) => { gainStat(g, 'sen', 0.5); return '사람들을 구경했다. 누가 누구를 좋아하는지, 누가 누구와 사이가 나쁜지 보였다.'; } },
    ],
  },
  {
    id: 'harsh_winter', cooldown: 11,
    cond: (g) => g.date.month === 1,
    chance: () => 0.3,
    weight: 50,
    title: '혹한',
    text: () => '북쪽에서 내려온 바람이 마을을 얼렸다. 우물이 얼고, 장작이 빠르게 줄어든다.',
    choices: [
      { label: '장작을 해 온다', run: (g) => { if (playerAge(g) < 8) return '도끼를 들기엔 아직 어렸다. 대신 불씨를 지켰다.'; g.player.fatigue += 20; gainStat(g, 'str', 0.8); gainStat(g, 'wil', 0.5); return '눈 덮인 숲에서 장작을 끌고 왔다. 손가락이 얼어붙는 줄 알았다.'; } },
      { label: '집 안에 웅크린다', run: (g) => { g.player.familyMoney = Math.max(0, g.player.familyMoney - 5); return '장작을 사느라 집안 돈이 줄었다.'; } },
    ],
  },
  {
    id: 'wolves',
    cond: (g) => playerAge(g) >= 8,
    chance: () => 0.025,
    weight: 70,
    title: '숲가의 늑대',
    text: () => '해 질 녘, 숲 가장자리에서 회색 그림자 셋이 마을 쪽을 보고 있었다. 늑대다. 아직 아무도 눈치채지 못했다.',
    choices: [
      { label: '어른들에게 알린다', run: (g) => { const e = living(g).find((p) => p.job === 'elder'); if (e) { e.known = true; e.affection += 6; } return '촌장이 사냥꾼과 경비대를 불렀다. 그날 밤 양 한 마리도 잃지 않았다. 촌장이 머리를 쓰다듬었다.'; } },
      { label: '직접 다가가 본다', run: (g, rng) => { if (check(rng, g.player.stats.sen + g.player.stats.agi / 2, 30)) { gainStat(g, 'sen', 1.0); gainStat(g, 'wil', 0.8); return '바람을 등지고 다가가 늑대들이 사라지는 방향을 지켜봤다. 무섭고, 이상하게 가슴이 뛰었다.'; } injure(g, '늑대에게 물린 팔', 3); g.player.stress += 25; return '마른 가지를 밟았다. 늑대가 덤벼들었고, 팔을 물린 채 겨우 도망쳤다. 흉터가 남을 것이다.'; } },
      { label: '못 본 척한다', run: (g) => { g.player.stress += 8; return '다음 날 아침, 누군가의 닭장이 엉망이 되어 있었다. 아무에게도 말하지 않았다.'; } },
    ],
  },
  {
    id: 'goblins',
    cond: (g) => playerAge(g) >= 11,
    chance: () => 0.012,
    weight: 80,
    title: '닭장의 고블린',
    text: () => '한밤중 닭이 미친 듯이 운다. 창문 너머로 키 작은 녹색 형체 둘이 닭장을 뜯고 있다. 고블린이다.',
    choices: [
      { label: '몽둥이를 들고 나간다', run: (g, rng) => { const power = g.player.skills.sword + g.player.stats.str / 2; if (check(rng, power, 35)) { gainSkill(g, 'sword', 1.5, 'str'); gainStat(g, 'wil', 1.0); return '정신없이 휘둘렀다. 고블린 하나가 쓰러지고, 나머지는 숲으로 달아났다. 다음 날 온 마을이 이 이야기를 했다.'; } injure(g, '고블린의 칼에 베인 옆구리', 4); g.player.stress += 25; return '고블린의 녹슨 칼이 옆구리를 스쳤다. 아버지가 뛰어나오지 않았다면 위험했다.'; } },
      { label: '집안 어른을 깨운다', run: (g) => { const f = father(g); return f?.alive ? `${f.name}이(가) 쇠스랑을 들고 나가 고블린을 쫓아냈다. 닭 두 마리를 잃었다.` : '어른이 없었다. 닭장은 텅 비었다.'; } },
      { label: '이불 속에 숨는다', run: (g) => { g.player.stress += 15; g.player.familyMoney = Math.max(0, g.player.familyMoney - 4); return '아침에 보니 닭장은 텅 비어 있었다.'; } },
    ],
  },
  {
    id: 'bard',
    cond: (g) => playerAge(g) >= 5,
    chance: () => 0.03,
    weight: 40,
    title: '떠돌이 음유시인',
    text: () => '여관에 류트를 멘 음유시인이 들렀다. 용사 아르스와 대마도사 노아, 오백 년 전 마신을 봉인한 일행의 노래를 부른다고 한다.',
    choices: [
      { label: '끝까지 듣는다', run: (g) => { gainStat(g, 'int', 0.6); setFlag(g, 'heard_hero_song'); return '노래가 끝날 무렵, 음유시인은 목소리를 낮췄다. "노아님은 아직 살아 계신다더군. 북쪽 얼음 해협의 탑에서. 그런데 그 탑의 불이 꺼졌다지." 사람들이 웅성거렸다.'; } },
      { label: '동전을 던져 준다', run: (g) => { if (g.player.money < 1) return '줄 동전이 없었다.'; g.player.money -= 1; gainStat(g, 'cha', 0.6); return '음유시인이 윙크하며 내 이름을 노래 끝에 넣어 불렀다.'; } },
    ],
  },
  {
    id: 'knight_sword', once: true,
    cond: (g) => fam(g) === 'fallen_knight' && playerAge(g) >= 6 && father(g)?.alive,
    weight: 95,
    title: '녹슨 장검',
    text: (g) => `${father(g).name}이(가) 벽에 걸린 장검을 내렸다. 날은 녹슬었지만 손잡이의 문장은 아직 선명했다. "우리 가문의 검이다. 언젠가 네 것이 된다."`,
    choices: [
      { label: '검을 받아 든다', run: (g) => { gainStat(g, 'wil', 1.0); father(g).affection += 8; return '너무 무거워서 두 손으로도 겨우 들었다. 아버지는 처음으로 크게 웃었다. 내일부터 검을 가르치겠다고 했다.'; } },
      { label: '"저는 기사가 되기 싫어요"', run: (g) => { father(g).affection -= 5; gainStat(g, 'int', 0.5); return '아버지는 한동안 말이 없었다. "그래도 검은 배워 둬라. 세상은 험하다."'; } },
    ],
  },
  {
    id: 'merchant_trip', once: true,
    cond: (g) => fam(g) === 'merchant' && playerAge(g) >= 8 && father(g)?.alive,
    weight: 90,
    title: '하르펜 가는 길',
    text: (g) => `${father(g).name}이(가) 짐마차를 꾸리며 물었다. "이번엔 하르펜 시장까지 같이 가 보겠니?"`,
    choices: [
      { label: '따라간다', run: (g) => { gainSkill(g, 'trade', 2.0, 'cha'); gainStat(g, 'sen', 0.8); gainStat(g, 'int', 0.5); setFlag(g, 'seen_harfen'); return '처음 본 도시는 시끄럽고 거대했다. 성벽, 모험가 길드의 깃발, 갑옷 입은 사람들. 아버지는 상인들과 값을 깎으며 눈을 찡긋했다.'; } },
      { label: '집에 남는다', run: (g) => '집에 남아 어머니와 가게를 지켰다.' },
    ],
  },
  {
    id: 'farm_storm', cooldown: 11,
    cond: (g) => fam(g) === 'farmer' && g.date.month === 7 && playerAge(g) >= 6,
    chance: () => 0.2,
    weight: 60,
    title: '여름 폭풍',
    text: () => '검은 구름이 몰려왔다. 다 익어 가는 밀밭 위로 우박이 쏟아지기 시작한다.',
    choices: [
      { label: '가족과 밀을 거둔다', run: (g) => { g.player.fatigue += 25; gainSkill(g, 'farming', 2.0, 'str'); gainStat(g, 'wil', 0.8); return '온 가족이 비를 맞으며 밤새 밀단을 헛간으로 옮겼다. 절반은 건졌다.'; } },
      { label: '집 안에서 지켜본다', run: (g) => { g.player.familyMoney = Math.max(0, g.player.familyMoney - 8); return '밀밭 절반이 누웠다. 올겨울은 빠듯할 것이다.'; } },
    ],
  },
  {
    id: 'tower_dare',
    cond: (g) => playerAge(g) >= 7 && playerAge(g) <= 14 && !!knownChildFriend(g),
    chance: () => 0.035,
    weight: 55,
    title: '폐탑에 가 보자',
    text: (g) => `${knownChildFriend(g).name}이(가) 속삭였다. "숲 너머 무너진 탑 알지? 밤에 불빛이 보인대. 같이 가 볼래?"`,
    choices: [
      { label: '간다', run: (g, rng) => { const f = knownChildFriend(g); if (f) f.affection += 10; if (check(rng, g.player.stats.wil + g.player.stats.sen / 2, 25)) { g.player.money += 2; gainStat(g, 'wil', 0.8); return '무너진 계단 아래에서 오래된 은화 두 닢과 이상한 문양이 새겨진 돌을 찾았다. 불빛의 정체는 끝내 알 수 없었다.'; } g.player.stress += 20; return '탑 안에서 무언가 움직였다. 둘은 비명을 지르며 도망쳤다. 그날 밤 잠을 이루지 못했다.'; } },
      { label: '거절한다', run: (g) => { const f = knownChildFriend(g); if (f) f.affection -= 4; return '"겁쟁이." 친구는 혼자 가지도 못하면서 투덜댔다.'; } },
    ],
  },
  {
    id: 'bully',
    cond: (g) => playerAge(g) >= 6 && playerAge(g) <= 12,
    chance: () => 0.025,
    weight: 50,
    title: '골목의 큰 아이',
    text: () => '방앗간 골목에서 덩치 큰 아이가 길을 막았다. "가진 거 다 내놔."',
    choices: [
      { label: '맞선다', run: (g, rng) => { if (check(rng, g.player.stats.str + g.player.skills.sword / 2, 15)) { gainStat(g, 'wil', 1.0); return '주먹이 오갔다. 코피가 났지만, 그 아이는 다시는 길을 막지 않았다.'; } injure(g, '멍든 눈', 1); gainStat(g, 'wil', 0.6); return '흠씬 맞았다. 하지만 울지는 않았다.'; } },
      { label: '참고 내준다', run: (g) => { g.player.money = Math.max(0, g.player.money - 2); g.player.stress += 12; return '주머니를 털렸다. 분했다.'; } },
      { label: '어른에게 이른다', run: (g) => { gainStat(g, 'int', 0.3); return '어른들이 그 아이의 부모를 찾아갔다. 대신 골목 아이들 사이에선 고자질쟁이가 되었다.'; } },
    ],
  },
  {
    id: 'baptism', once: true,
    cond: (g) => playerAge(g) >= 7 && living(g).some((p) => p.job === 'priest'),
    weight: 85,
    title: '성광의 세례',
    text: () => '일곱 살이 된 아이들은 예배당에서 성광의 세례를 받는다. 사제가 성수를 이마에 떨어뜨리며 묻는다. "성광을 따르겠느냐?"',
    choices: [
      { label: '진심으로 따르겠다고 한다', run: (g) => { setFlag(g, 'faith', 'devout'); const p = living(g).find((x) => x.job === 'priest'); if (p) p.affection += 10; gainStat(g, 'wil', 0.5); return '사제의 얼굴이 환해졌다. 그 뒤로 사제는 눈에 띄게 다정했다.'; } },
      { label: '정해진 대로 대답한다', run: (g) => { setFlag(g, 'faith', 'nominal'); return '모두가 하는 대답을 했다. 성수는 차가웠다.'; } },
    ],
  },
  {
    id: 'coming_of_age', once: true,
    cond: (g) => playerAge(g) >= 15,
    weight: 100,
    title: '성인식',
    text: (g) => `열다섯 번째 봄, 예배당 앞에서 성인식이 열렸다. 촌장이 내 이름을 불렀다. 앞으로 나섰다. 이제 누구의 아이가 아니라, 자기 이름으로 사는 사람이다.`,
    choices: [{ label: '앞으로 나선다', run: (g) => { gainStat(g, 'wil', 1.0); setFlag(g, 'adult'); return '이제부터는 무엇을 하며 살지 스스로 정해야 한다. 마을에 남을 수도, 떠날 수도 있다.'; } }],
  },
);
