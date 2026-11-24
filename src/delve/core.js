// 미궁 깊게 (44단계). 미궁 열셋, 층과 깊이, 층대마다 다른 위험과 수확, 미궁의 주인과 깊은 층의 비밀, 미궁 앞에 생기는 거리와 시세,
// 다른 공략대, 공략 기록. 예전 '미궁 들어가기'(adventure/dungeons.js, 한 번에 끝나는 짧은 탐색)는 그대로 두고, 여기는 여러 층을 차례로
// 내려가며 고르는 긴 공략(dv_). 싸움은 adventure/fight.js의 runFight, 동료는 companionsFor(party)를 읽는다.
// 상태는 game.delve 하나:
//   mine: { 미궁: { deepest, mark, runs, clears, lore: [조각 번호], best } }   crew: [{ name, role, pow, wage }]
//   towns: { 미궁: { pop, price, sold } }   masters: { 미궁: { alive, since, name } }   rec: { 미궁: { best, holder, me, y } }
//   parties: [{ id, name, leader, pow, at, best, alive, fame }]   log, runAt
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { FOES } from '../adventure/combat.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { playerAge } from '../game.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.bondage?.slave && !g.over;
export const adult = (g) => playerAge(g) >= 16;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 113) ^ Math.imul(mi(g) * 199 + salt + 439, 2654435761)) | 0 });

// 미궁 깊은 데서 나오는 것들
Object.assign(FOES, {
  harpy: { name: '하르피아', pow: 22, bite: true },
  lizardman: { name: '도마뱀 인간', pow: 24, weapon: '뼈창' },
  mimic: { name: '상자 흉내쟁이', pow: 30, bite: true },
  golem: { name: '돌 골렘', pow: 34 },
  shade: { name: '그림자 망령', pow: 38, undead: true },
  gargoyle: { name: '가고일', pow: 40, bite: true },
  rift_spawn: { name: '틈에서 기어 나온 것', pow: 44, bite: true },
  wolf_king: { name: '늙은 마랑왕', pow: 58, bite: true, leader: true },
  heartwood: { name: '잠든 고목의 심장', pow: 66, leader: true },
  library_golem: { name: '서고지기 골렘', pow: 70, leader: true },
  nameless_saint: { name: '이름 잃은 성인', pow: 78, undead: true, leader: true },
  legion_wraith: { name: '군단장의 망령', pow: 85, undead: true, leader: true, weapon: '녹슨 군기' },
  sea_serpent: { name: '동굴 바다뱀', pow: 90, bite: true, leader: true },
  forge_golem: { name: '불 꺼진 화로의 거인', pow: 96, leader: true },
  rift_lord: { name: '틈의 주인', pow: 120, bite: true, leader: true },
  tower_guard: { name: '층의 문지기', pow: 50, leader: true },
});

// 층대(layers): to까지가 그 층대. danger는 1~10, harvest는 한 번 내려갈 때 얻는 마석·부산물 값(은화), hazard는 그 층대의 함정 말.
// master: 가장 깊은 층의 주인. lore: 내려가며 줍는 깊은 층의 비밀 조각 셋. secret: 주인을 쓰러뜨리면 알게 되는 것.
// guild: 모험가 길드 회원만. town: 미궁 앞 거리 이름. step: 한 번에 내려가는 층 수.
export const DELVES = {
  old_tower: {
    name: '무너진 탑 지하', place: 'ern', floors: 3, step: 1, town: null,
    layers: [{ to: 3, name: '탑 밑 창고', danger: 1, harvest: [2, 5], foes: [['giant_rat', 4, 8], ['kobold', 3, 5]], hazard: '썩은 계단' }],
    master: { unit: 'skeleton', count: 2, leader: 'tower_wraith', text: '꺼진 화로 앞에 선 원령' },
    lore: ['벽에 새긴 이름들. 탑을 지키던 마법사의 제자들이다.', '화로 밑에 묻힌 쪽지. "불을 꺼뜨리지 마라."', '계단 맨 아래 돌에 긁힌 날짜. 삼백 년 전이다.'],
    secret: '원령은 탑의 마지막 제자였다. 스승이 돌아오기를 기다리며 불을 지키다, 불이 꺼진 뒤에도 자리를 뜨지 못했다.',
  },
  grey_hollow: {
    name: '회색 굴', place: 'harfen', floors: 6, step: 1, guild: true, town: '굴 어귀 천막촌',
    layers: [
      { to: 3, name: '어귀 굴', danger: 2, harvest: [3, 8], foes: [['goblin', 3, 5], ['giant_rat', 6, 10]], hazard: '고블린 올가미' },
      { to: 6, name: '고블린 마을', danger: 3, harvest: [6, 12], foes: [['goblin', 6, 9], ['hobgoblin', 1, 2]], hazard: '무너지는 석회 천장' },
    ],
    master: { unit: 'goblin', count: 5, leader: 'goblin_chief', text: '해골 옥좌의 족장' },
    lore: ['고블린 벽화. 큰 사람 그림 앞에 고블린들이 엎드려 있다.', '녹슨 투구. 백 년 전 하르펜 수비대의 것이다.', '옥좌 뒤 굴로 바람이 분다. 더 아래가 있다.'],
    secret: '옥좌 뒤 좁은 굴은 왕도 지하수로 쪽으로 이어진다. 고블린들은 누군가에게 쫓겨 여기까지 올라온 것이었다.',
  },
  old_mine: {
    name: '버려진 은광', place: 'verden', floors: 9, step: 2, guild: true, town: '은광 아래 광부 마을',
    layers: [
      { to: 4, name: '윗갱도', danger: 3, harvest: [6, 12], foes: [['cave_spider', 2, 3], ['kobold', 5, 8]], hazard: '썩은 갱목' },
      { to: 9, name: '깊은 갱도', danger: 5, harvest: [10, 20], foes: [['cave_spider', 3, 5], ['ghoul', 2, 4], ['skeleton', 4, 6]], hazard: '고인 독기' },
    ],
    master: { unit: 'skeleton', count: 4, leader: 'wight', text: '아직도 벽을 파는 망령' },
    lore: ['광부 숙소 벽의 낙서. "밤마다 벽 너머에서 곡괭이 소리가 난다."', '은맥 옆에 검은 돌. 마석이 아니다. 차갑다.', '마지막 광부 일지. "더 파면 안 된다. 그래도 반장은 판다."'],
    secret: '광부들이 판 막장 너머에 오래된 봉인석 조각이 박혀 있었다. 망령들은 그 돌을 지키는 게 아니라, 그 돌에서 멀어지지 못하는 것이었다.',
  },
  undercity: {
    name: '왕도 지하수로', place: 'leocast', floors: 14, step: 2, guild: true, town: '수로 입구 뒷골목',
    layers: [
      { to: 4, name: '수로', danger: 3, harvest: [8, 16], foes: [['giant_rat', 8, 14], ['thug', 4, 6]], hazard: '불어난 물' },
      { to: 9, name: '밀수꾼 길과 옛 기둥', danger: 5, harvest: [14, 26], foes: [['bandit', 4, 7], ['ghoul', 2, 3], ['skeleton', 5, 8]], hazard: '무너진 바닥' },
      { to: 14, name: '묻힌 신전', danger: 7, harvest: [24, 40], foes: [['cultist', 5, 7], ['shade', 2, 3]], hazard: '마신 문양의 저주' },
    ],
    master: { unit: 'cultist', count: 3, leader: 'sewer_horror', text: '신전 바닥 물속의 괴물' },
    lore: ['영웅왕 이전 시대의 글자. 왕도는 이 도시 위에 세워졌다.', '검은 촛불의 밀랍이 아직 무르다. 누군가 지금도 온다.', '제단 밑 돌판. 용사력 원년보다 오래된 날짜.'],
    secret: '묻힌 신전은 마신을 섬기던 곳이 아니었다. 마신을 처음 막으려던 사람들이 지은 곳이었고, 괴물은 그들이 남긴 문지기였다.',
  },
  tower: {
    name: '끝없는 탑', place: 'barka', floors: 120, step: 4, guild: true, town: '탑 아래 거리', endless: true,
    layers: [
      { to: 20, name: '아래층', danger: 3, harvest: [10, 20], foes: [['goblin', 6, 9], ['kobold', 6, 10], ['harpy', 2, 4]], hazard: '움직이는 계단' },
      { to: 40, name: '가운데층', danger: 5, harvest: [18, 34], foes: [['hobgoblin', 3, 5], ['harpy', 4, 6], ['golem', 1, 2]], hazard: '거꾸로 도는 방' },
      { to: 60, name: '높은 층', danger: 7, harvest: [30, 52], foes: [['gargoyle', 2, 4], ['shade', 3, 4], ['orc', 3, 5]], hazard: '숨이 엷어지는 공기' },
      { to: 90, name: '구름층', danger: 8, harvest: [48, 80], foes: [['gargoyle', 4, 6], ['golem', 3, 5], ['shade', 4, 6]], hazard: '바닥 없는 방' },
      { to: 120, name: '아무도 모르는 층', danger: 10, harvest: [80, 130], foes: [['gargoyle', 6, 8], ['rift_spawn', 4, 6]], hazard: '시간이 어긋나는 복도' },
    ],
    master: null, guardEvery: 10,
    lore: ['30층 벽의 이름들. 맨 위의 이름은 오백 년 전 용사 일행의 것이라는 말이 있다.', '60층 창밖으로 대륙 끝 얼음 해협이 보인다. 그럴 리 없는 거리다.', '90층 바닥의 문양이 마신 봉인의 문양과 닮았다.'],
    secret: '탑은 위로 자라는 것이 아니라, 아래에서 무언가를 누르고 있는 말뚝이다. 꼭대기를 찾는 사람들은 그 말뚝의 길이를 재고 있는 셈이었다.',
  },
  sunken_library: {
    name: '가라앉은 서고', place: 'serenia', floors: 12, step: 2, town: '호숫가 책 장수 골목',
    layers: [
      { to: 4, name: '물 빠진 열람실', danger: 3, harvest: [10, 18], foes: [['giant_rat', 6, 10], ['golem', 1, 1]], hazard: '썩은 책장 무너짐' },
      { to: 8, name: '잠긴 서가', danger: 5, harvest: [16, 30], foes: [['lizardman', 3, 5], ['golem', 1, 2]], hazard: '숨이 차는 물길' },
      { to: 12, name: '금서 칸', danger: 7, harvest: [26, 44], foes: [['shade', 2, 4], ['golem', 2, 3]], hazard: '글자가 눈을 홀리는 책' },
    ],
    master: { unit: 'golem', count: 2, leader: 'library_golem', text: '아직도 책을 정리하는 서고지기' },
    lore: ['젖지 않은 책 한 권. 표지에 세레니아 첫 마탑의 문장.', '서가 번호가 거꾸로 붙어 있다. 아래로 갈수록 오래된 책이다.', '금서 목록 맨 끝, 지워진 이름 하나. 7서클이라 적혀 있다.'],
    secret: '서고는 물에 잠긴 것이 아니라 일부러 잠갔다. 첫 마탑 사람들은 읽어서는 안 될 책들을 호수 밑에 두고, 골렘에게 영원히 정리하라 명했다.',
  },
  catacomb: {
    name: '성인들의 묘굴', place: 'solaris', floors: 10, step: 2, town: '순례자 묘굴 문간',
    layers: [
      { to: 5, name: '순례자의 길', danger: 3, harvest: [8, 16], foes: [['skeleton', 4, 7], ['giant_rat', 6, 10]], hazard: '무너진 납골 벽감' },
      { to: 10, name: '봉해진 묘실', danger: 6, harvest: [18, 34], foes: [['ghoul', 3, 5], ['shade', 2, 3]], hazard: '썩은 향 연기' },
    ],
    master: { unit: 'skeleton', count: 5, leader: 'nameless_saint', text: '이름이 지워진 성인의 관' },
    lore: ['성인 명부. 한 사람의 이름만 깎여 있다.', '묘실 문의 봉인은 교단의 것이 아니다. 더 오래되었다.', '관 뚜껑 안쪽의 손톱 자국.'],
    secret: '이름 잃은 성인은 교단이 성녀 리아나보다 먼저 섬겼던 사람이었다. 교단은 그를 지우고 그 위에 성당을 지었다. 그는 아직 그 이름을 찾고 있다.',
  },
  root_maze: {
    name: '뿌리 미궁', place: 'silverleaf', floors: 10, step: 2, town: '뿌리 문 앞 쉼터',
    layers: [
      { to: 5, name: '얕은 뿌리길', danger: 3, harvest: [8, 16], foes: [['cave_spider', 2, 4], ['wolf', 4, 6]], hazard: '발목을 감는 뿌리' },
      { to: 10, name: '깊은 뿌리길', danger: 6, harvest: [18, 32], foes: [['cave_spider', 4, 6], ['shade', 1, 3]], hazard: '잠이 오는 꽃가루' },
    ],
    master: { unit: 'cave_spider', count: 4, leader: 'heartwood', text: '숲 한가운데 고목의 심장' },
    lore: ['엘프 말로 새긴 경고. "고목을 깨우지 마라."', '뿌리 속에 박힌 인간의 칼. 녹이 슬지 않았다.', '뿌리가 숨을 쉰다. 아주 느리게.'],
    secret: '고목은 숲을 먹고 자라는 것이 아니라, 숲이 고목의 꿈이었다. 심장이 잠들면 숲이 조금 작아지고, 다시 깨면 자란다.',
  },
  deep_forge: {
    name: '식은 대장간', place: 'hammer', floors: 15, step: 3, town: '쇠망치 골 아랫마을',
    layers: [
      { to: 5, name: '버려진 작업장', danger: 4, harvest: [12, 22], foes: [['kobold', 6, 10], ['golem', 1, 2]], hazard: '녹은 쇳물 웅덩이' },
      { to: 10, name: '용광로 통로', danger: 6, harvest: [20, 36], foes: [['golem', 2, 3], ['orc', 2, 4]], hazard: '뜨거운 김' },
      { to: 15, name: '첫 모루의 방', danger: 8, harvest: [32, 54], foes: [['golem', 3, 5]], hazard: '무너지는 갱' },
    ],
    master: { unit: 'golem', count: 3, leader: 'forge_golem', text: '불 꺼진 화로 앞의 쇠 거인' },
    lore: ['모루 위에 남은 망치 자국. 드워프 손보다 훨씬 크다.', '용광로 벽에 볼가르의 이름.', '첫 모루 밑에 식은 불씨 하나. 아직 따뜻하다.'],
    secret: '쇠 거인은 드워프가 만든 것이 아니었다. 드워프보다 먼저 이 산에 살던 이들이 만들었고, 드워프의 첫 대장장이들은 그 불씨를 훔쳐 지금의 쇠망치 골을 세웠다.',
  },
  beast_den: {
    name: '짐승왕의 굴', place: 'fur', floors: 8, step: 2, town: '굴 앞 사냥꾼 야영지',
    layers: [
      { to: 4, name: '바위 굴', danger: 3, harvest: [8, 14], foes: [['wolf', 4, 7], ['dire_wolf', 0, 1]], hazard: '무너지는 바위' },
      { to: 8, name: '짐승들의 무덤', danger: 5, harvest: [14, 26], foes: [['wolf', 6, 9], ['mana_bear', 0, 1]], hazard: '뼈 더미 아래 구덩이' },
    ],
    master: { unit: 'wolf', count: 6, leader: 'wolf_king', text: '굴 맨 안쪽의 늙은 마랑왕' },
    lore: ['수인 부족의 첫 족장 이야기를 그린 벽화.', '사슬 조각. 성광국 노예 사냥꾼의 것이다.', '마랑왕의 뼈 침상 옆, 수인 아이의 작은 신발.'],
    secret: '마랑왕은 수인들을 해친 적이 없었다. 노예 사냥꾼에게 쫓긴 수인 아이들을 굴 깊이 숨겨 주던 짐승이었고, 그 일을 아는 족장은 이제 몇 남지 않았다.',
  },
  iron_keep: {
    name: '옛 제국 요새 지하', place: 'eisen', floors: 12, step: 2, guild: true, town: '요새 아래 병영 거리',
    layers: [
      { to: 4, name: '무기고', danger: 4, harvest: [12, 20], foes: [['skeleton', 5, 8], ['deserter', 2, 3]], hazard: '녹슨 덫' },
      { to: 8, name: '감옥 층', danger: 6, harvest: [18, 32], foes: [['ghoul', 3, 5], ['skeleton', 6, 9]], hazard: '잠기는 철문' },
      { to: 12, name: '지휘실', danger: 7, harvest: [28, 46], foes: [['shade', 3, 4], ['skeleton', 8, 10]], hazard: '무너지는 성벽 아래 길' },
    ],
    master: { unit: 'skeleton', count: 6, leader: 'legion_wraith', text: '아직 항복하지 않은 군단장' },
    lore: ['벽에 새긴 군단 깃발. 지금 제국의 깃발과 다르다.', '감옥 층 장부. 갇힌 이들 대부분이 군단 사람이었다.', '지휘실 지도. 아이젠베르크가 아직 작은 요새였던 때.'],
    secret: '군단장은 황제의 명을 거부하고 성문을 닫은 사람이었다. 지금의 제국 역사책에는 반역자로 적혀 있지만, 그가 지킨 것은 성 안의 피난민이었다.',
  },
  sea_cave: {
    name: '물에 잠긴 동굴', place: 'crow', floors: 9, step: 2, town: '동굴 위 해적 선술집',
    layers: [
      { to: 4, name: '밀물 동굴', danger: 3, harvest: [10, 18], foes: [['bandit', 3, 5], ['lizardman', 2, 4]], hazard: '밀려드는 밀물' },
      { to: 9, name: '난파선 무덤', danger: 6, harvest: [18, 34], foes: [['lizardman', 4, 6], ['ghoul', 2, 3]], hazard: '썩은 갑판 아래 구멍' },
    ],
    master: { unit: 'lizardman', count: 4, leader: 'sea_serpent', text: '난파선 사이를 도는 바다뱀' },
    lore: ['해적 깃발 조각. 백 년 전 사라진 해적단.', '난파선 장부에 적힌 짐. 사람이었다.', '바다뱀 둥지의 금화. 레오니아 옛 왕실 문장.'],
    secret: '난파선들은 바다뱀에게 당한 것이 아니었다. 옛 해적들이 쫓기던 배들을 일부러 이 동굴로 몰았고, 바다뱀은 나중에 그 보물을 둥지 삼아 들어앉았을 뿐이다.',
  },
  rift: {
    name: '성채 아래 갈라진 틈', place: 'graubel', floors: 16, step: 3, guild: true, town: '틈 앞 감시 초소 마을',
    layers: [
      { to: 6, name: '갈라진 바위', danger: 5, harvest: [14, 24], foes: [['orc', 3, 5], ['rift_spawn', 1, 2]], hazard: '흔들리는 틈' },
      { to: 11, name: '마물 굴', danger: 7, harvest: [24, 42], foes: [['rift_spawn', 2, 4], ['orc', 4, 6]], hazard: '숨 막히는 독기' },
      { to: 16, name: '틈의 밑바닥', danger: 9, harvest: [40, 70], foes: [['rift_spawn', 4, 6], ['shade', 3, 5]], hazard: '아래서 올라오는 열' },
    ],
    master: { unit: 'rift_spawn', count: 4, leader: 'rift_lord', text: '틈 밑바닥에서 숨 쉬는 것' },
    lore: ['틈 벽에 박힌 쐐기 모양 돌. 봉인 쐐기와 닮았다.', '마물들이 한 방향으로만 기어 나온다.', '밑바닥에서 들리는 소리가 맥박처럼 일정하다.'],
    secret: '틈은 마물이 파낸 굴이 아니라 봉인이 갈라진 자리였다. 틈의 주인은 그 금이 더 벌어지지 않게 몸으로 막고 있던 것이었고, 그를 쓰러뜨린 뒤로 성채 사람들은 밤마다 땅이 우는 소리를 듣는다.',
  },
  // 44단계 새 고장(src/lands/)의 미궁
  red_pit: {
    name: '붉은 갱', place: 'roten', floors: 10, step: 2, guild: true, town: '갱 입구 광부 술집 거리',
    layers: [
      { to: 5, name: '버려진 철갱', danger: 4, harvest: [12, 20], foes: [['kobold', 6, 9], ['cave_spider', 2, 3]], hazard: '녹물 고인 갱' },
      { to: 10, name: '용광로 밑 굴', danger: 6, harvest: [20, 34], foes: [['golem', 1, 2], ['orc', 2, 4]], hazard: '뜨거운 쇳가루 바람' },
    ],
    master: { unit: 'golem', count: 2, leader: 'forge_golem', text: '쇳물에 반쯤 잠긴 거인' },
    lore: ['갱 벽에 드워프와 인간의 이름이 나란히 새겨져 있다.', '제국 광산 감독관의 장부. 갱이 닫히기 사흘 전까지 캐라고 적혀 있다.', '용광로 밑 돌에 식지 않는 쇳물 자국.'],
    secret: '붉은 갱은 쇠가 떨어져서 닫힌 것이 아니었다. 갱 밑바닥에서 식은 대장간의 거인과 같은 것이 깨어났고, 제국은 광부들에게 알리지 않은 채 입구를 막았다.',
  },
  burnt_cellar: {
    name: '불탄 기둥 밑 굴', place: 'kalten', floors: 8, step: 2, town: null,
    layers: [
      { to: 4, name: '무너진 지하 창고', danger: 4, harvest: [10, 18], foes: [['giant_rat', 6, 10], ['bandit', 2, 4]], hazard: '그을린 들보' },
      { to: 8, name: '마족이 판 굴', danger: 6, harvest: [18, 30], foes: [['rift_spawn', 1, 2], ['shade', 2, 3]], hazard: '숨이 막히는 재' },
    ],
    master: { unit: 'shade', count: 3, leader: 'legion_wraith', text: '세 번 불탄 마을의 첫 촌장' },
    lore: ['불탄 기둥 셋 가운데 하나의 밑동이 굴로 이어진다.', '마족의 글씨. 길 표시다. 굴은 마을을 노리고 판 것이 아니라 지나가려고 판 것이었다.', '촌장의 일지. "세 번째에도 우리는 떠나지 않는다."'],
    secret: '마족들이 판 굴은 칼텐을 치려던 길이 아니라 마대륙으로 돌아가려던 길이었다. 길이 막힌 것을 안 그들이 마을에 불을 질렀고, 첫 촌장의 망령은 아직도 그 굴 앞을 지키고 있다.',
  },
  glow_cave: {
    name: '물빛 동굴', place: 'luen', floors: 9, step: 2, town: '호숫가 물고기 장터',
    layers: [
      { to: 4, name: '빛나는 물길', danger: 3, harvest: [10, 18], foes: [['lizardman', 2, 4], ['giant_rat', 5, 8]], hazard: '미끄러운 이끼 바위' },
      { to: 9, name: '마력이 고인 못', danger: 6, harvest: [20, 36], foes: [['lizardman', 4, 6], ['shade', 1, 2]], hazard: '정신을 흐리는 물빛' },
    ],
    master: { unit: 'lizardman', count: 3, leader: 'sea_serpent', text: '빛나는 비늘의 늙은 호수뱀' },
    lore: ['동굴 천장에서 탑의 마력이 물방울로 떨어진다.', '못 바닥에 버려진 실험 기구들. 마탑 문장이 있다.', '호수뱀의 비늘 하나가 마석처럼 빛난다.'],
    secret: '호수 물고기가 빛나는 것은 탑의 마력이 스며서가 아니었다. 마탑이 실패한 마력을 몰래 이 동굴 못에 버려 왔고, 호수뱀은 그것을 먹고 자랐다.',
  },
  lower_halls: {
    name: '그론다르 아랫거리', place: 'grondar', floors: 18, step: 3, town: '아랫계단 장터',
    layers: [
      { to: 6, name: '버려진 계단 거리', danger: 4, harvest: [14, 24], foes: [['kobold', 6, 10], ['golem', 1, 2]], hazard: '무너진 계단' },
      { to: 12, name: '닫힌 씨족의 집들', danger: 6, harvest: [22, 40], foes: [['golem', 2, 3], ['shade', 2, 3]], hazard: '바람 굴이 막혀 고인 연기' },
      { to: 18, name: '맨 아래 봉인문', danger: 8, harvest: [36, 60], foes: [['golem', 3, 5], ['rift_spawn', 2, 3]], hazard: '땅 밑에서 올라오는 열' },
    ],
    master: { unit: 'golem', count: 4, leader: 'forge_golem', text: '봉인문 앞에 선 첫 씨족의 수호상' },
    lore: ['계단마다 씨족 문장. 맨 아래로 갈수록 지금은 없는 씨족들이다.', '닫힌 집의 문에 "우리가 판 것을 다시 묻는다"는 글.', '봉인문의 문양이 봉인 쐐기와 닮았다.'],
    secret: '그론다르는 위로 쌓은 도시가 아니라 아래로 도망쳐 온 도시였다. 드워프들은 너무 깊이 판 맨 아래를 봉인하고 그 위에 새 거리를 지었고, 사라진 씨족들은 그 봉인 안쪽에 남기로 한 사람들이었다.',
  },
  old_wood: {
    name: '늙은 숲의 굴', place: 'wolfwood', floors: 7, step: 1, town: null,
    layers: [
      { to: 3, name: '뿌리 밑 굴', danger: 3, harvest: [8, 14], foes: [['wolf', 4, 7], ['cave_spider', 1, 2]], hazard: '발목을 감는 뿌리' },
      { to: 7, name: '늑대 무덤', danger: 5, harvest: [14, 24], foes: [['wolf', 5, 8], ['dire_wolf', 1, 1]], hazard: '무너지는 흙벽' },
    ],
    master: { unit: 'wolf', count: 5, leader: 'wolf_king', text: '숲보다 오래된 흰 늑대' },
    lore: ['굴 입구에 마을 사람들이 남긴 사냥 첫 몫.', '늑대 두개골에 새긴 이름들. 마을 사람 이름이다.', '흰 털 한 줌. 마을 처마의 두개골과 같은 빛깔.'],
    secret: '처마 밑 늑대 두개골은 사냥한 늑대가 아니었다. 마을을 처음 세운 사람들이 흰 늑대와 맺은 약속의 표시였고, 마을 사람들은 사냥 첫 몫을 굴 앞에 두는 것으로 그 약속을 이어 왔다.',
  },
};
export const DELVE_IDS = Object.keys(DELVES);
export const delveAt = (pl) => DELVE_IDS.find((id) => DELVES[id].place === pl) ?? null;
export const layerOf = (id, floor) => DELVES[id].layers.find((l) => floor <= l.to) ?? DELVES[id].layers[DELVES[id].layers.length - 1];
// 탑의 문지기: 열 층마다, 높을수록 세다
export const guardEnc = (floor) => ({ unit: floor >= 60 ? 'gargoyle' : floor >= 30 ? 'golem' : 'harpy', count: 2 + Math.floor(floor / 30), leader: 'tower_guard', leaderPow: Math.round(40 + floor * 1.1), leaderName: `${floor}층의 문지기` });
export const markOf = (id, floor) => (DELVES[id].endless ? Math.floor(floor / 10) * 10 : Math.floor(floor / 5) * 5);

// 공략대에 들일 수 있는 사람 (미궁 거리에서 산다): 짐꾼은 짐을, 척후는 함정을, 방패는 동료를, 치유사는 야영을 돕는다
export const CREW_ROLES = {
  porter: { name: '짐꾼', role: 'blade', pow: 6, wage: 4, desc: '짐을 더 진다.' },
  scout: { name: '척후', role: 'scout', pow: 10, wage: 7, desc: '함정을 먼저 찾고, 벽화를 놓치지 않는다.' },
  shield: { name: '방패잡이', role: 'shield', pow: 18, wage: 9, desc: '앞에서 맞아 준다.' },
  healer: { name: '치유사', role: 'healer', pow: 4, wage: 10, desc: '야영 때 상처를 잘 꿰맨다.' },
};
export const CREW_NAMES = ['도르', '미카', '벨라', '토비', '한스', '루네', '카야', '옌스', '실라', '보리스', '아다', '페인'];

export function delveState(g) {
  g.delve ??= { mine: {}, crew: [], towns: {}, masters: {}, rec: {}, parties: [], log: [], past: [], runAt: -99, crewAt: -99 };
  const s = g.delve;
  for (const id of DELVE_IDS) {
    s.towns[id] ??= { pop: DELVES[id].town ? 20 : 0, price: 1, sold: 0 };
    s.masters[id] ??= { alive: !!DELVES[id].master, since: 0 };
    s.rec[id] ??= { best: DELVES[id].endless ? 87 : 0, holder: DELVES[id].endless ? '카이렌 하스의 일행' : null, me: false, y: null };
  }
  return s;
}
export const D = delveState;
export const mineOf = (g, id) => (D(g).mine[id] ??= { deepest: 0, mark: 0, runs: 0, clears: 0, lore: [] });
export const logD = (g, text) => { const s = D(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 30) s.log.splice(0, s.log.length - 30); };
// 거리의 마석 값: 마나가 짙으면 마석이 흔해 값이 떨어진다
export const stonePrice = (g, id) => clamp((D(g).towns[id]?.price ?? 1) * (1 - (g.mana?.tide ?? 0) / 400), 0.5, 1.6);
export const canEnter = (g, id) => !DELVES[id].guild || !!L(g).fac?.guild?.member;
