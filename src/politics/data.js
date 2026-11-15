// 움직이는 대륙의 바탕 자료: 주인이 바뀔 수 있는 땅, 나라의 힘과 성향, 처음 다스리는 사람, 새 통치자의 이름.
// 땅 id는 지도(src/art/mapdata.js P)의 id와 같다. 지도는 이 id로 점을 찾아 주인 색을 칠하면 된다.

// home: 처음 주인, rivals: 이 땅을 노리는 나라
// 레오니아와 발하르트 사이의 두 요새(ort, stellen)는 world.js의 발하르트 전쟁(fortsLost)이 주인을 정한다.
export const LANDS = {
  ort: { name: '오르트 요새', home: 'leonia', rivals: ['valhart'], fixed: true },
  stellen: { name: '슈텔렌 요새', home: 'leonia', rivals: ['valhart'], fixed: true },
  roten: { name: '로텐부르크', home: 'valhart', rivals: ['march'] },
  stein: { name: '슈타인 군항', home: 'valhart', rivals: ['march', 'sea'] },
  ostmark: { name: '오스트마르크', home: 'valhart', rivals: ['free'] },
  kars: { name: '카르스 항', home: 'valhart', rivals: ['free', 'sea'] },
  krossen: { name: '크로센', home: 'free', rivals: ['valhart'] },
  libera: { name: '리베라', home: 'free', rivals: ['valhart', 'holy'] },
  gard: { name: '용병 도시 가르드', home: 'free', rivals: ['valhart'] },
  portel: { name: '항구도시 포르텔', home: 'free', rivals: ['sea'] },
  abel: { name: '순례의 마을 아벨', home: 'holy', rivals: ['free'] },
  mist: { name: '안개 늪', home: 'holy', rivals: ['free'] },
  wolffort: { name: '늑대 요새', home: 'march', rivals: ['valhart'] },
  irongate: { name: '철문 관문', home: 'dwarf', rivals: ['march'] },
  silver: { name: '은사슬 관문', home: 'elf', rivals: ['beast'] },
  border: { name: '경계촌', home: 'elf', rivals: ['beast'] },
  roots: { name: '뿌리 미궁 어귀', home: 'elf', rivals: ['beast'] },
  crow: { name: '까마귀 둥지', home: 'sea', rivals: ['free'] },
  pearl: { name: '진주섬', home: 'sea', rivals: ['free'] },
};

// 나라의 성향. power: 군세(0~100), greed: 남의 땅 욕심, faith: 성광교와의 거리(0 = 정통, 1 = 남), kind: 다스리는 방식
//   dynasty(가문이 잇는다) | elect(뽑는다) | council(회의가 다스린다) | ageless(오래 사는 군주)
export const NATURE = {
  leonia: { power: 55, greed: 0.3, faith: 0.1, kind: 'dynasty' },
  valhart: { power: 72, greed: 0.8, faith: 0.5, kind: 'dynasty' },
  holy: { power: 50, greed: 0.5, faith: 0, kind: 'elect' },
  serenia: { power: 45, greed: 0.15, faith: 0.6, kind: 'elect' },
  free: { power: 48, greed: 0.4, faith: 0.7, kind: 'council' },
  march: { power: 52, greed: 0.3, faith: 0.3, kind: 'dynasty' },
  elf: { power: 46, greed: 0.15, faith: 1, kind: 'ageless' },
  dwarf: { power: 50, greed: 0.2, faith: 1, kind: 'dynasty' },
  beast: { power: 47, greed: 0.55, faith: 1, kind: 'elect' },
  sea: { power: 44, greed: 0.5, faith: 0.8, kind: 'council' },
};

// 처음 관계 (-100~100). 적지 않은 쌍은 0에서 시작해 성향에 따라 흐른다.
export const START_REL = {
  'leonia|valhart': -30, 'leonia|holy': 35, 'leonia|serenia': 30, 'leonia|march': 40, 'leonia|elf': 10, 'leonia|dwarf': 20, 'leonia|free': 15,
  'valhart|holy': -35, 'valhart|serenia': 10, 'valhart|free': -30, 'valhart|march': -20, 'valhart|dwarf': 15, 'valhart|sea': -10,
  'holy|serenia': -25, 'holy|free': -10, 'holy|elf': -20, 'holy|beast': -45, 'holy|dwarf': -5,
  'free|sea': -35, 'free|serenia': 20, 'elf|beast': -40, 'elf|dwarf': -10, 'march|dwarf': 25, 'beast|free': 5,
};
// 조약이 처음부터 있는 쌍
export const START_PACTS = [
  { a: 'leonia', b: 'march', kind: 'alliance' },
  { a: 'leonia', b: 'holy', kind: 'alliance' },
  { a: 'march', b: 'dwarf', kind: 'trade' },
  { a: 'serenia', b: 'free', kind: 'trade' },
];

// 처음 다스리는 사람 (레오니아는 world.js의 왕실이 맡는다)
// house: 가문 (dynasty만), heir: 대 이을 사람이 있나
export const START_RULERS = {
  valhart: { title: '황제', name: '율리안', house: '발하르트', age: 46, heir: true },
  holy: { title: '교황', name: '그레고르 7세', age: 71 },
  serenia: { title: '협회장', name: '마그누스', age: 88, legend: 'magnus' },
  free: { title: '의장', name: '로렌초 벤투리', age: 58 },
  march: { title: '변경백', name: '울프릭', house: '그라우벨', age: 54, heir: true },
  elf: { title: '여왕', name: '아이리스', age: 640, sex: 'f' },
  dwarf: { title: '왕', name: '두린스 3세', house: '돌모루', age: 182, heir: true },
  beast: { title: '대족장', name: '가룸', age: 38, legend: 'garum' },
  sea: { title: '섬장', name: '카시아 모레', age: 49, sex: 'f' },
};

// 새 통치자 이름 (realms/data.js NAMES에 없는 나라)
export const EXTRA_NAMES = {
  elf: { m: ['엘라리온', '실바란', '나엘', '이산디르'], f: ['아이리스', '엘루네', '세릴', '아리엔', '닐라엘'], last: [] },
  dwarf: { m: ['두린스', '보르강', '스로르', '그림발', '토르딘', '발린스'], f: ['헤드라', '디스', '브룬나'], last: ['돌모루', '쇠턱', '깊은불', '잿수염', '바위심장'] },
  beast: { m: ['가룸', '라샥', '우르골', '테무르', '바락', '사르한'], f: ['카이라', '시라', '나흐', '레아'], last: ['검은갈기', '은발톱', '붉은이빨', '바람귀'] },
};
// 회의·선출 나라는 이런 이름으로 새 사람을 부른다
export const ELECT_TITLE = { holy: '교황', serenia: '협회장', free: '의장', beast: '대족장', sea: '섬장' };
export const POPE_NAMES = ['클레멘스', '인노켄티우스', '우르반', '베네딕트', '그레고르', '레오', '파스칼', '시릴'];
export const ROMAN = ['', ' 2세', ' 3세', ' 4세', ' 5세', ' 6세', ' 7세', ' 8세', ' 9세'];

// 혼인할 수 있는 가문 (레오니아 왕실은 world.js의 왕자들)
export const MARRYING = ['leonia', 'valhart', 'march', 'dwarf'];
