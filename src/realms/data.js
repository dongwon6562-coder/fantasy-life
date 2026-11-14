// 나라들: 설정 문서(나라와 세력, 사회와 일상, 신앙과 교단)를 따른다.
// id는 지도(art/mapdata.js nations)의 id와 같다.

export const REALMS = {
  leonia: {
    name: '레오니아 왕국', short: '레오니아', capital: 'leocast',
    rule: '왕과 귀족 파벌',
    ruler: '국왕 오스발트 3세',
    desc: '가장 오래된 인간 왕국이자 용사의 고향. 귀족들은 썩었고 범죄 조직이 왕도의 뒷골목을 쥐었다. 병든 왕 아래에서 두 왕자가 왕위를 다툰다.',
    faith: { name: '성광교', desc: '빛의 여신 솔라를 섬긴다. 왕의 대관식은 교황이 집전한다. 시골에서는 대지의 어머니를 함께 모신다.' },
    status: '신분이 핏줄을 따른다. 평민이 올라갈 길은 교단과 기사단, 그리고 모험가 길드뿐이다.',
    speech: '레오니아 말씨',
    price: 1.0,
    law: {
      sum: '영주마다 다르다. 형은 감옥살이, 돈으로 벌금을 대신할 수 있다.',
      sentence: 1, fine: 1, bribe: 0, hangAt: 2, hangNoto: 101, lord: true,
      exile: true, // 왕국 밖으로 쫓겨나는 형을 청할 수 있다
    },
    naturalize: { months: 24, fee: 20, how: '두 해를 살고 영주의 장부에 이름을 올리면 된다.' },
    extradites: ['holy'], // 이 나라의 현상금이 쫓아가는 나라 (동맹)
  },
  valhart: {
    name: '발하르트 제국', short: '발하르트', capital: 'eisen',
    rule: '실력주의 황제',
    ruler: '황제 율리안 발하르트',
    desc: '귀족을 숙청한 젊은 황제가 다스리는 대륙 최강국. 출신을 묻지 않고 인재를 뽑는다. 마법사 군단과 검왕 레온이 있고, 레오니아를 삼키려 해마다 국경 전투를 벌인다.',
    faith: { name: '성광교 (힘을 잃는 중)', desc: '황제가 교단 재산 몰수를 검토하고 있어서 성당의 종소리가 작다. 사람들은 신보다 황제의 법전을 더 무서워한다.' },
    status: '피보다 실력. 평민도 사관학교에 들어가 기사가 될 수 있다. 100년 전까지 수인을 노예로 부렸고, 그 차별은 아직 남아 있다.',
    speech: '제국 말씨',
    price: 1.15,
    law: {
      sum: '법전대로. 뇌물이 거의 통하지 않고, 형은 군 노역으로 치른다. 살인자는 한 번이면 목을 매단다.',
      watch: '제국 헌병대', sentence: 1.25, fine: 1.5, bribe: -0.35, hangAt: 2, hangNoto: 40, lord: false,
      deport: true, // 외국인의 작은 죄는 국경 밖으로 쫓아낸다
    },
    naturalize: { months: 24, fee: 30, how: '두 해를 살거나 제국군에서 한 해를 복무하면 신민이 될 수 있다. 황제는 출신을 묻지 않는다.' },
    extradites: [],
  },
  holy: {
    name: '성광 신성국', short: '성광국', capital: 'solaris',
    rule: '교황과 추기경단',
    ruler: '교황 그레고르 7세',
    desc: '인간만이 신의 자식이라 가르치는 종교 국가. 금빛 대성당과 이단심문소가 있고, 이종족은 허가된 노예만 들어올 수 있다.',
    faith: { name: '성광교 정통파', desc: '교단이 곧 나라다. 미사에 빠지는 사람은 이름이 적히고, 마을마다 이단심문소의 눈이 있다.' },
    status: '성직자가 맨 위. 신앙이 깊은 평민은 교단 안에서 출세할 수 있지만, 믿음이 얕은 외지인은 늘 의심받는다.',
    speech: '성광국 말씨',
    price: 1.05,
    law: {
      sum: '죄는 곧 죄악이다. 형이 무겁고, 교단에 속죄금을 내면 조금 덜어 준다. 레오니아의 현상금도 여기까지 쫓아온다.',
      watch: '성도 경비대', sentence: 1.4, fine: 0.8, bribe: 0.1, hangAt: 2, hangNoto: 70, lord: false,
    },
    naturalize: { months: 36, fee: 50, how: '세 해를 살며 믿음을 보이고 대성당에 헌금해야 한다. 믿지 않는 자는 받아 주지 않는다.', faith: true },
    extradites: ['leonia'],
  },
  serenia: {
    name: '마법도시 세레니아', short: '세레니아', capital: 'serenia',
    rule: '마도사 협회',
    ruler: '협회장 마그누스',
    desc: '일곱 개의 탑이 호수를 둘러싼 대학 도시. 대륙의 마법 지식이 모이고, 서클 승급 시험을 여기서 치른다. 어느 나라에도 중립이지만, 금지된 연구를 하는 파벌이 있다는 소문이 있다.',
    faith: { name: '여러 신앙', desc: '탑마다 믿는 것이 다르다. 성광교 예배당도 있고 아무것도 믿지 않는 학자도 많다. 다만 금기 마법만은 여기서도 사형이다.' },
    status: '서클이 곧 신분. 평민 출신 마법사도 귀족 대우를 받는다. 마력이 없는 사람은 그저 손님이다.',
    speech: '탑의 말씨',
    price: 1.3,
    law: {
      sum: '협회 집행관이 법을 맡는다. 평범한 죄에는 덤덤하지만 마법사의 죄는 무겁게 다룬다. 누구의 현상금도 넘겨주지 않는다.',
      watch: '협회 집행관', sentence: 1, fine: 1.2, bribe: -0.1, hangAt: 2, hangNoto: 80, lord: false, mageMul: 1.6,
    },
    naturalize: { months: 60, fee: 40, how: '다섯 해를 살거나, 2서클 이상의 마법사라면 두 해 만에 시민이 될 수 있다.' },
    extradites: [],
  },
  free: {
    name: '자유도시 연합', short: '자유도시', capital: 'barka',
    rule: '상인 의회',
    ruler: '상인 의회',
    desc: '왕 없이 상인 의회가 다스리는 도시들의 연합. 모험가 길드 본부와 끝없는 탑, 대륙 최대의 항구가 있다. 뒤에서는 이종족 노예 암시장이 돌아간다.',
    faith: { name: '무엇이든', desc: '성광교 성당 옆에 바다의 늙은이 사당이 있고, 그 옆에서 대지의 어머니 제사를 지낸다. 돈 되는 신이 좋은 신이다.' },
    status: '돈이 곧 신분. 시민권도 돈으로 살 수 있다. 모험가와 용병은 출신을 묻지 않는다.',
    speech: '항구 말씨',
    price: 1.2,
    law: {
      sum: '죄는 돈으로 갚는다. 형이 가볍고 뇌물이 잘 통한다. 대신 현상금 사냥꾼이 어디서 온 현상금이든 쫓는다.',
      watch: '의회 경비대', sentence: 0.6, fine: 0.7, bribe: 0.25, hangAt: 3, hangNoto: 101, lord: false,
      bountyAll: true,
    },
    naturalize: { months: 36, fee: 50, buy: 160, how: '세 해를 살거나, 은화 160닢으로 시민권을 산다.' },
    extradites: [],
  },
  march: {
    name: '북부 변경백령', short: '변경백령', capital: 'graubel',
    rule: '성채 영주들의 동맹',
    ruler: '변경백 울프릭 그라우벨',
    desc: '마대륙과 맞닿은 최전선. 50년 전 마왕군을 막아냈지만 중앙의 나라들이 돕지 않아 독립을 고민하고 있다. 누구나 칼을 차고 다닌다.',
    faith: { name: '성광교와 조상 숭배', desc: '성당은 작고 투박하다. 드워프 이웃들은 대장간 불에 조상이 깃든다고 믿고, 병사들은 둘 다 믿는다.' },
    status: '성벽 위에 선 자는 모두 같다. 변경은 과거를 묻지 않는다. 다만 도망병은 용서하지 않는다.',
    speech: '변경 말씨',
    price: 1.1,
    law: {
      sum: '군율. 형 대신 장성 복무를 시키고, 살인자와 도망병은 목을 매단다. 남쪽의 현상금은 성벽을 넘지 못한다.',
      watch: '변경 헌병', sentence: 0.8, fine: 1, bribe: -0.15, hangAt: 1, hangNoto: 101, lord: false,
    },
    naturalize: { months: 36, fee: 0, how: '세 해를 살거나 장성에서 한 해를 서면 변경 사람이 된다.' },
    extradites: [],
  },
};

export const REALM_IDS = Object.keys(REALMS);
export const FOREIGN = REALM_IDS.filter((id) => id !== 'leonia');

// 나라마다 다른 이름 (레오니아 이름은 data.js)
export const NAMES = {
  valhart: {
    m: ['프리드리히', '클라우스', '루트비히', '게르하르트', '라인하르트', '볼프강', '지크프리트', '에크하르트', '루돌프', '알브레히트', '마티아스', '호르스트'],
    f: ['게르트루트', '브룬힐데', '이졸데', '발트라우트', '레기나', '지글린데', '우르줄라', '힐데가르트', '엘케', '임가르트'],
    last: ['폰 슈트라흐', '아이젠하르트', '크뢰거', '하우프트만', '블라우', '슈벤크', '레링', '오스터만', '바르텔'],
  },
  holy: {
    m: ['베네딕트', '아우구스틴', '세바스티안', '그레고르', '클레멘스', '이그나츠', '바실리우스', '도미니크', '우르반', '로렌티우스'],
    f: ['루치아', '체칠리아', '아가타', '모니카', '베아트릭스', '클라리사', '세라피나', '이레네', '마들렌', '오틸리아'],
    last: ['데 솔라', '아르겐툼', '루미나', '산크투스', '벨라도', '카스텔로', '피오레', '마르첼리'],
  },
  serenia: {
    m: ['알라릭', '셀레스탄', '오리온', '테오도르', '에반더', '카시안', '루시엔', '바렌'],
    f: ['셀레네', '아스트리드', '에올린', '리세', '오필리아', '미라벨', '나디아', '이브린'],
    last: ['애쉬', '블랙솔', '스타브', '윈터레이크', '그레이로브', '실버론', '하이타워'],
  },
  free: {
    m: ['마르코', '로렌초', '조반니', '파비오', '니콜로', '안셀모', '바르톨로', '엔초', '살바토레', '비토'],
    f: ['베아트리체', '루크레치아', '조반나', '키아라', '프란체스카', '이사벨라', '로자나', '비앙카'],
    last: ['벤투리', '콘티', '모레티', '데 루카', '파가니', '스칼라', '바르비에리', '그라소'],
  },
  march: {
    m: ['비요른', '울프', '군나르', '하랄', '토르발', '에이릭', '스벤', '라그나르', '오드', '케틸'],
    f: ['잉그리드', '시그룬', '아슬라우그', '헬가', '토라', '군힐드', '라그나', '프레야'],
    last: ['그라우벨', '얼음손', '스톤헬름', '레이븐', '하겐', '볼프스', '철갑'],
  },
};

// 새 장소 (places.js PLACES에 덧붙인다). 지도 P의 id와 같다.
export const REALM_PLACES = {
  eisen: {
    name: '제도 아이젠베르크', kind: '제도', realm: 'valhart',
    desc: '황제가 새로 지은 반듯한 계획 도시. 바둑판처럼 곧은 길마다 제국 깃발이 걸려 있고, 제국 마법원과 기사 사관학교가 있다. 광장의 게시판에는 출신을 묻지 않는 모병 공고가 붙어 있다.',
    inn: 6, rent: 8, house: 1000, wage: 1.5, loot: 2.0, crowd: 0.36,
    links: { leocast: 3, serenia: 2, barka: 2, graubel: 2 },
  },
  solaris: {
    name: '성도 솔라리스', kind: '성도', realm: 'holy',
    desc: '금빛 대성당의 첨탑이 도시 어디서나 보인다. 종이 울리면 거리의 모든 사람이 무릎을 꿇는다. 이단심문소의 회색 옷이 군중 사이를 천천히 지나간다.',
    inn: 4, rent: 6, house: 760, wage: 1.2, loot: 1.8, crowd: 0.4,
    links: { harfen: 2, barka: 2 },
  },
  serenia: {
    name: '마법도시 세레니아', kind: '마법도시', realm: 'serenia',
    desc: '일곱 개의 탑이 호수를 둘러싼 대학 도시. 밤에도 탑 꼭대기에 마력 등불이 켜져 있고, 호숫가 찻집마다 젊은 마법사들이 이론을 두고 언성을 높인다.',
    inn: 7, rent: 9, house: 1200, wage: 1.5, loot: 2.2, crowd: 0.38,
    links: { leocast: 1, eisen: 2, barka: 2 },
  },
  barka: {
    name: '바르카', kind: '자유도시', realm: 'free',
    desc: '끝없는 탑 아래 세워진 모험가의 도시. 모험가 길드 본부와 마석 거래소가 있고, 술집마다 탑에서 돌아온 사람과 돌아오지 못한 사람의 이야기가 오간다.',
    inn: 5, rent: 7, house: 900, wage: 1.4, loot: 2.2, crowd: 0.28,
    links: { solaris: 2, serenia: 2, eisen: 2 },
  },
  graubel: {
    name: '성채도시 그라우벨', kind: '성채도시', realm: 'march',
    desc: '세 겹 성벽으로 둘러싸인 최전선 도시. 바람에서 쇠와 연기 냄새가 난다. 아이들도 칼을 차고 다니고, 성벽 위에는 밤낮으로 횃불이 탄다.',
    inn: 4, rent: 5, house: 600, wage: 1.3, loot: 1.3, crowd: 0.45,
    links: { eisen: 2, verden: 3 },
  },
};
// 레오니아 쪽에서 이어지는 길
export const LEONIA_LINKS = { leocast: { eisen: 3, serenia: 1 }, harfen: { solaris: 2 }, verden: { graubel: 3 } };

// 그 나라 수도에서 만나는 사람들
export const REALM_PEOPLE = {
  eisen: [
    { role: 'recruiter', job: 'knight', age: [35, 48], sex: 'm', traits: ['diligent', 'reserved'], title: '모병관' },
    { role: 'official', job: 'scholar', age: [30, 50], traits: ['diligent', 'ambitious'], title: '이주민 등록관' },
    { role: 'neighbor', job: 'smith', age: [25, 45], traits: ['kind', 'brave'] },
    { role: 'merchant', job: 'shopkeeper', age: [30, 55], traits: ['greedy', 'gossip'] },
  ],
  solaris: [
    { role: 'inquisitor', job: 'priest', age: [38, 55], traits: ['pious', 'cruel'], title: '이단심문관' },
    { role: 'official', job: 'priest', age: [45, 65], traits: ['pious', 'greedy'], title: '대성당 서기' },
    { role: 'neighbor', job: 'farmer', age: [25, 45], traits: ['pious', 'kind'] },
    { role: 'merchant', job: 'shopkeeper', age: [30, 55], traits: ['pious', 'greedy'] },
  ],
  serenia: [
    { role: 'official', job: 'scholar', age: [40, 70], traits: ['reserved', 'diligent'], title: '협회 등록관' },
    { role: 'mage', job: 'court_mage', age: [30, 60], traits: ['ambitious', 'reserved'], skill: [60, 85], title: '탑의 마법사' },
    { role: 'neighbor', job: 'scholar', age: [18, 26], traits: ['diligent', 'gossip'] },
    { role: 'merchant', job: 'shopkeeper', age: [30, 55], traits: ['greedy', 'reserved'] },
  ],
  barka: [
    { role: 'official', job: 'guild_clerk', age: [25, 40], traits: ['gossip', 'diligent'], title: '의회 서기' },
    { role: 'broker', job: 'trade_master', age: [35, 55], traits: ['greedy', 'ambitious'], title: '마석 중개상' },
    { role: 'neighbor', job: 'adventurer', age: [18, 30], traits: ['brave', 'gossip'] },
    { role: 'merchant', job: 'innkeeper', age: [35, 55], traits: ['kind', 'greedy'] },
  ],
  graubel: [
    { role: 'official', job: 'knight_captain', age: [40, 55], sex: 'm', traits: ['brave', 'reserved'], skill: [65, 80], title: '장성 대장' },
    { role: 'recruiter', job: 'knight', age: [30, 45], traits: ['brave', 'cruel'], title: '수비대 하사' },
    { role: 'neighbor', job: 'hunter', age: [20, 40], traits: ['brave', 'kind'] },
    { role: 'merchant', job: 'smith', age: [40, 70], traits: ['diligent', 'reserved'], title: '드워프 대장장이' },
  ],
};
