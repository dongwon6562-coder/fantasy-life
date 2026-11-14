// 신앙과 교단: 설정 문서 "신앙과 교단"을 따른다.
// 성광교(빛의 여신 솔라), 대지의 어머니, 세계수 신앙, 조상 숭배, 바다의 늙은이, 그리고 금지된 마신 숭배 "검은 새벽".

export const GODS = {
  solar: {
    name: '성광교', short: '성광', deity: '빛의 여신 솔라',
    desc: '대륙에서 가장 큰 종교. 성녀 리아나가 마신 전쟁에서 여신의 기적을 보인 뒤 사실상 국교가 되었다. 신앙과 수련으로 신성력을 얻는다.',
    shrines: { ern: '마을 예배당', harfen: '하르펜 성당', verden: '베르덴 예배당', leocast: '왕도 대성당', gruental: '골짜기 예배당', eisen: '제도 성당', solaris: '금빛 대성당', graubel: '성채 예배당', barka: '항구 성당' },
    worship: '미사에 나간다',
    believer: '성광교 신자',
  },
  earth: {
    name: '대지의 어머니', short: '대지', deity: '대지의 어머니',
    desc: '농촌에서 성광교보다 오래 믿어 온 신앙. 이름 없는 돌 제단에 첫 이삭을 바친다. 교단은 묵인하지만 탐탁지 않아 한다.',
    shrines: { ern: '마을 뒤 언덕의 돌 제단', verden: '밀밭 가운데 선돌', gruental: '골짜기 샘가의 돌무지', barka: '항구 뒷골목의 작은 사당' },
    worship: '돌 제단에 곡식을 바친다',
    believer: '대지의 어머니를 섬기는 사람',
  },
  tree: {
    name: '세계수 신앙', short: '세계수', deity: '세계수',
    desc: '엘프의 신앙. 신이 아니라 세계수 자체를 섬긴다. 성광교와 말은 섞지만 개종은 거부한다. 기도가 아니라 침묵으로 섬긴다.',
    shrines: { silverleaf: '은잎 나무 아래' },
    worship: '세계수의 가지 아래에서 침묵한다',
    believer: '세계수를 섬기는 사람',
    races: ['elf', 'half_elf'],
  },
  ancestor: {
    name: '조상 숭배', short: '조상', deity: '조상들',
    desc: '드워프와 수인의 신앙. 드워프는 대장간 불에 조상이 깃든다고 믿고, 수인은 죽은 전사의 이름을 토템 기둥에 새긴다. 이름이 잊히는 것이 죽음보다 무섭다.',
    shrines: { hammer: '꺼지지 않는 조상의 화로', fur: '토템 언덕' },
    worship: '조상의 이름을 부른다',
    believer: '조상을 모시는 사람',
    races: ['dwarf', 'beast'],
  },
  sea: {
    name: '바다의 늙은이', short: '바다', deity: '바다의 늙은이',
    desc: '남해 뱃사람들의 신. 폭풍을 달래려고 제물을 바친다. 늙은이는 착하지도 나쁘지도 않다. 배고플 뿐이다.',
    shrines: { barka: '방파제 끝의 늙은이 바위' },
    worship: '바다에 제물을 던진다',
    believer: '바다의 늙은이에게 비는 사람',
  },
  none: {
    name: '믿지 않음', short: '없음', deity: null,
    desc: '어떤 신도 섬기지 않는다. 세레니아의 학자들 사이에서는 흔하지만, 성광의 땅에서는 입 밖에 내지 않는 편이 낫다.',
    shrines: {},
    believer: '아무것도 믿지 않는 사람',
  },
};
export const GOD_IDS = Object.keys(GODS);
export const OPEN_GODS = ['solar', 'earth', 'tree', 'ancestor', 'sea']; // 개종할 수 있는 신앙

// 성광교 신관 등급(설정): 수련사 → 사제 → 주교 → 대주교 → 성자. 주교까지는 factions의 교회 계급, 그 위는 여기서.
export const HIGH_RANKS = ['', '대주교', '성자'];
// 교단 안의 파벌
export const SECTS = {
  orthodox: { name: '정통파', claim: '교단은 나라 위에 있다. 왕은 교황이 세운다.', head: '교황 그레고르 7세' },
  saint: { name: '성녀파', claim: '리아나의 뜻대로 약자를 돌보는 게 먼저다. 정치에서 손 떼야 한다.', head: '지방 수도원들' },
  purge: { name: '정화파', claim: '마족은 말할 줄 알아도 모두 죽여야 한다. 마족과 통하는 자도 이단이다.', head: '성흔대장 세실리아' },
};

// 순례지: 신앙마다
export const PILGRIM = {
  solar: [
    { place: 'solaris', name: '성도 솔라리스의 금빛 대성당', end: '대성당의 돔 아래에 무릎을 꿇었다. 수천 개의 촛불이 한꺼번에 흔들렸다. 성녀 리아나의 은 손거울 앞에서 숨을 멈췄다.' },
    { place: 'leocast', name: '왕도 대성당의 성녀 유골함', end: '줄은 성당 밖 광장까지 이어져 있었다. 사흘을 기다려 유골함 유리 위에 손을 얹었다. 차가웠다. 그런데 손바닥이 오래 따뜻했다.' },
  ],
  earth: [
    { place: 'verden', name: '베르덴 밀밭 가운데 선돌', end: '선돌은 사람 키의 세 배였다. 누가 세웠는지 아무도 모른다. 이마를 대자 흙냄새가 났다. 땅이 숨을 쉬는 소리가 들리는 것 같았다.' },
    { place: 'ern', name: '에른 언덕의 오래된 돌 제단', end: '이끼 낀 제단 위에 할머니들이 두고 간 보리 이삭이 쌓여 있었다. 나도 한 줌을 올렸다. 바람이 이삭을 쓸어 갔다. 받아 주신 것이다.' },
  ],
  tree: [
    { place: 'silverleaf', name: '은잎 마을의 세계수 가지', end: '세계수 본체는 대삼림 깊은 곳에 있다. 여기 있는 것은 가지 하나다. 그 가지 하나가 마을 전체를 덮고 있었다. 사흘 밤낮을 그 아래 앉아 있었다. 아무 말도 하지 않았다.' },
  ],
  ancestor: [
    { place: 'hammer', name: '쇠망치 골의 꺼지지 않는 화로', end: '천 년 동안 꺼진 적 없다는 화로 앞에서 조상의 이름을 하나씩 불렀다. 아는 이름이 끝나자 화로지기가 남은 이름을 대신 불러 주었다.' },
    { place: 'fur', name: '털가죽 시장 뒤 토템 언덕', end: '토템 기둥마다 이름이 빼곡했다. 오래된 이름은 비바람에 지워져 가고 있었다. 칼끝으로 한 이름을 다시 깊게 팠다. 누구인지 모르지만, 잊히게 둘 수는 없었다.' },
  ],
  sea: [
    { place: 'barka', name: '바르카 방파제 끝의 늙은이 바위', end: '파도가 바위를 때릴 때마다 소금물이 얼굴로 튀었다. 은화 한 닢과 마른 생선 한 마리를 던졌다. 바다가 잠잠해졌다. 우연일 것이다. 아마도.' },
  ],
};

// 축일: 달마다 (설정의 봉인제·수확제·망자의 밤 + 신앙마다)
export const FEASTS = [
  { id: 'seal', god: 'solar', month: 1, name: '봉인제', text: '새해 첫날, 마신을 봉인한 날을 기리는 미사. 종이 열두 번 울리는 동안 모두 무릎을 꿇는다.' },
  { id: 'dead', god: '*', month: 2, name: '망자의 밤', text: '겨울 마지막 밤. 죽은 이의 이름을 부르고 문간에 등불을 건다. 마족이 가장 강해지는 밤이라 아무도 혼자 다니지 않는다.' },
  { id: 'sow', god: 'earth', month: 4, name: '씨뿌림 제사', text: '첫 씨를 뿌리기 전날 밤, 돌 제단에 우유와 꿀을 붓는다. 성광교 사제는 못 본 척한다.' },
  { id: 'leaf', god: 'tree', month: 5, name: '새잎의 날', text: '세계수에 새잎이 돋는 날. 엘프들은 하루 종일 말을 하지 않는다. 그 침묵이 숲 전체를 덮는다.' },
  { id: 'storm', god: 'sea', month: 7, name: '폭풍 달래기', text: '태풍의 달이 오기 전에 배마다 제물을 싣고 나가 바다에 던진다. 아끼는 것일수록 늙은이가 좋아한다.' },
  { id: 'harvest', god: 'solar', month: 9, name: '수확 감사 미사', text: '가을걷이가 끝나면 첫 빵을 제단에 올린다. 사제는 그 빵을 구호소로 보낸다.' },
  { id: 'ear', god: 'earth', month: 9, name: '첫 이삭 제사', text: '베어 낸 첫 이삭을 엮어 대지의 어머니 인형을 만든다. 겨울 동안 부엌에 걸어 두었다가 봄에 밭에 묻는다.' },
  { id: 'names', god: 'ancestor', month: 11, name: '이름 부르는 밤', text: '첫눈이 오는 밤, 조상의 이름을 처음부터 끝까지 부른다. 드워프 집안은 해가 뜰 때까지 끝나지 않는다.' },
];

// 이단 의심이 쌓이는 정도: 나라마다, 신앙마다 (한 달에)
export const HERESY = {
  holy: { earth: 2.5, tree: 3, ancestor: 3, sea: 3, none: 3, solar: 0 },
  leonia: { earth: 0.2, tree: 0.6, ancestor: 0.6, sea: 0.6, none: 0.8, solar: 0 },
  valhart: { earth: 0, tree: 0.2, ancestor: 0.2, sea: 0.2, none: 0.2, solar: 0 },
  march: { earth: 0.2, tree: 0.3, ancestor: 0, sea: 0.3, none: 0.5, solar: 0 },
};

// 검은 새벽 (마신 숭배, 금지)
export const DAWN_RANKS = ['입문자', '그림자', '새벽의 사도'];
export const DAWN_CITIES = ['harfen', 'leocast', 'eisen', 'barka', 'serenia', 'verden'];
