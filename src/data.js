// 게임 데이터: 집안, 이름, 직업, 성격. 설정 문서(용사력 500년, 레오니아 왕국)를 따른다.

export const START_YEAR = 500; // 용사력
export const VILLAGE = '에른 마을';
export const REGION = '레오니아 왕국 남부';

export const MONTHS = [
  { n: 1, name: '1월', season: '겨울' },
  { n: 2, name: '2월', season: '겨울' },
  { n: 3, name: '3월', season: '봄' },
  { n: 4, name: '4월', season: '봄' },
  { n: 5, name: '5월', season: '봄' },
  { n: 6, name: '6월', season: '여름' },
  { n: 7, name: '7월', season: '여름' },
  { n: 8, name: '8월', season: '여름' },
  { n: 9, name: '9월', season: '가을' },
  { n: 10, name: '10월', season: '가을' },
  { n: 11, name: '11월', season: '가을' },
  { n: 12, name: '12월', season: '겨울' },
];

export const STATS = [
  { id: 'str', name: '힘' },
  { id: 'agi', name: '민첩' },
  { id: 'int', name: '지능' },
  { id: 'wil', name: '의지' },
  { id: 'cha', name: '매력' },
  { id: 'sen', name: '감각' },
];

export const SKILLS = [
  { id: 'sword', name: '검술' },
  { id: 'magic', name: '마법' },
  { id: 'letters', name: '글과 학문' },
  { id: 'farming', name: '농사' },
  { id: 'cooking', name: '요리' },
  { id: 'trade', name: '장사' },
  { id: 'herbs', name: '약초' },
  { id: 'smithing', name: '대장일' },
];

// 숙련 등급 (기술 수치 0~100)
export function skillGrade(v) {
  if (v < 10) return '모름';
  if (v < 30) return '견습';
  if (v < 55) return '숙련';
  if (v < 80) return '장인';
  return '명장';
}

export const FAMILIES = [
  {
    id: 'farmer',
    name: '자작농 집안',
    desc: '에른 마을 언덕 아래 밀밭을 일구는 집. 부유하지 않지만 굶지 않고, 이웃과 가깝다. 몸이 튼튼하게 자라고, 마을 사람들 사이에서 자연스럽게 큰다.',
    money: 40,
    fatherJob: 'farmer',
    motherJob: 'farmer',
    statBias: { str: 4, wil: 3, sen: 2 },
    skillBias: { farming: 6 },
    standing: '평민',
    lastNames: ['브란트', '휘트먼', '오어', '베일'],
  },
  {
    id: 'fallen_knight',
    name: '몰락한 기사 가문',
    desc: '삼대 전에는 영주를 섬기던 기사 가문이었지만 지금은 낡은 저택과 녹슨 검만 남았다. 아버지는 아직 검을 놓지 않았다. 이름은 무겁고, 주머니는 가볍다.',
    money: 25,
    fatherJob: 'old_knight',
    motherJob: 'weaver',
    statBias: { str: 2, wil: 4, cha: 2 },
    skillBias: { sword: 4, letters: 3 },
    standing: '몰락 귀족',
    lastNames: ['폰 하르트', '폰 에셴', '폰 그라우'],
  },
  {
    id: 'merchant',
    name: '상인 집안',
    desc: '마을 광장에서 잡화점을 하며 하르펜 시장까지 짐마차를 끈다. 돈 냄새를 일찍 배우고, 바깥 소식을 누구보다 먼저 듣는다.',
    money: 120,
    fatherJob: 'merchant',
    motherJob: 'shopkeeper',
    statBias: { int: 3, cha: 4, sen: 2 },
    skillBias: { trade: 6, letters: 2 },
    standing: '평민',
    lastNames: ['크라머', '벡슬러', '몬트'],
  },
];

export const MALE_NAMES = [
  '한스', '루카스', '테오', '마르틴', '요나스', '펠릭스', '오토', '카를', '빌헬름',
  '디터', '로렌츠', '파울', '야콥', '하인리히', '레온', '군터', '엘리아스', '모리츠', '아르민',
  '베른트', '콘라트', '프리츠', '알빈', '지몬', '토비아스', '울리히', '라이너',
  // 48단계: 마을 하나에 같은 이름이 서넛씩 겹쳐서 늘림('에른스트'는 에른 마을과 헷갈려 뺌)
  '볼프강', '게오르크', '하르트무트', '프란츠', '구스타프', '에밀', '발터', '오스발트',
  '롤프', '베네딕트', '크리스토프', '안톤', '페터', '루트비히', '막스', '니콜라우스', '아달베르트', '에드가',
];
export const FEMALE_NAMES = [
  '엘자', '마리', '안나', '리제', '클라라', '헬가', '로테', '그레타', '이다', '프리다',
  '마르타', '조피', '레나', '한나', '에바', '루이제', '베르타', '이르마', '알마', '도라',
  '카타리나', '에밀리', '유디트', '마틸데', '로자', '니나', '헤드비히', '아그네스',
  '게르트루트', '힐데', '잉그리트', '베로니카', '마그다', '테레제', '우르줄라', '오틸리에',
  '레기나', '자비네', '코넬리아', '아델하이트', '바바라', '하넬로레', '미나', '로잘린데', '빌마', '야나',
];
export const LAST_NAMES = [
  '뮐러', '슈미트', '베버', '피셔', '바그너', '호프만', '쾰러', '랑에', '슈타인', '브라운',
  '하르퉁', '그로세', '마이어', '렌츠', '포겔', '크룹', '아이젠', '로트',
];

// 직업. skill: 그 직업이 쓰는 기술, income: 한 달 벌이(은화)
export const JOBS = {
  child: { name: '아이', skill: null, income: 0 },
  farmer: { name: '농부', skill: 'farming', income: 4 },
  old_knight: { name: '퇴역 기사', skill: 'sword', income: 3 },
  weaver: { name: '직조공', skill: null, income: 3 },
  merchant: { name: '행상인', skill: 'trade', income: 8 },
  shopkeeper: { name: '잡화점 주인', skill: 'trade', income: 6 },
  smith: { name: '대장장이', skill: null, income: 6 },
  baker: { name: '빵집 주인', skill: 'cooking', income: 5 },
  innkeeper: { name: '여관 주인', skill: 'cooking', income: 6 },
  cook: { name: '여관 요리사', skill: 'cooking', income: 4 },
  hunter: { name: '사냥꾼', skill: null, income: 4 },
  priest: { name: '성광교 사제', skill: 'letters', income: 3 },
  herbalist: { name: '약초사', skill: 'herbs', income: 4 },
  hedge_mage: { name: '떠돌이 마법사', skill: 'magic', income: 5 },
  guard: { name: '마을 경비대', skill: 'sword', income: 4 },
  miller: { name: '방앗간 주인', skill: null, income: 5 },
  carpenter: { name: '목수', skill: null, income: 5 },
  laborer: { name: '일꾼', skill: null, income: 2 },
  adventurer: { name: '모험가', skill: 'sword', income: 6 },
  elder: { name: '촌장', skill: 'letters', income: 5 },
  apprentice: { name: '견습생', skill: null, income: 1 },
};

// 아이가 커서 고를 만한 직업 (NPC가 15세에 고름)
export const ADULT_JOB_CHOICES = [
  'farmer', 'farmer', 'farmer', 'laborer', 'laborer', 'smith', 'baker', 'cook', 'hunter',
  'guard', 'carpenter', 'weaver', 'merchant', 'herbalist', 'adventurer',
];

export const TRAITS = [
  { id: 'kind', name: '다정함', opp: 'cruel' },
  { id: 'cruel', name: '모짊', opp: 'kind' },
  { id: 'brave', name: '용감함', opp: 'timid' },
  { id: 'timid', name: '겁 많음', opp: 'brave' },
  { id: 'ambitious', name: '야심 있음', opp: 'content' },
  { id: 'content', name: '안분지족', opp: 'ambitious' },
  { id: 'greedy', name: '욕심 많음', opp: 'generous' },
  { id: 'generous', name: '너그러움', opp: 'greedy' },
  { id: 'diligent', name: '부지런함', opp: 'lazy' },
  { id: 'lazy', name: '게으름', opp: 'diligent' },
  { id: 'gossip', name: '입이 가벼움', opp: 'reserved' },
  { id: 'reserved', name: '과묵함', opp: 'gossip' },
  { id: 'pious', name: '독실함', opp: null },
  { id: 'drunkard', name: '술꾼', opp: null },
];
export const traitName = (id) => TRAITS.find((t) => t.id === id)?.name ?? id;
