// 50단계 도우미2: 자유도시 의회와 길드 정치 — 글과 표
// 연합 전체의 상인 평의회와 의장은 crowns(free)가 맡는다. 여기는 도시마다 따로 서는 시 의회와 길드다.
let J = (w) => w;
export const setJosa = (fn) => { J = fn; };

/* ---------- 도시 ---------- */
// seats: 처음 파벌 자리(합 24). lean: 이 도시가 먹고사는 길.
export const CITIES = {
  barka: { name: '바르카', hall: '탑 아래 회관', head: '집정관', seats: { merchant: 8, craft: 5, harbor: 4, old: 7 }, lean: '마석과 모험가', wall: '탑 쪽 성벽', river: '마석 거래소' },
  portel: { name: '포르텔', hall: '부두 회관', head: '항구 집정관', seats: { merchant: 7, craft: 4, harbor: 9, old: 4 }, lean: '배와 짐', wall: '바다 쪽 방파 성벽', river: '큰 부두' },
  krossen: { name: '크로센', hall: '저울 회관', head: '집정관', seats: { merchant: 9, craft: 8, harbor: 2, old: 5 }, lean: '장터와 공방', wall: '장터 둘레 성벽', river: '큰 저울터' },
  libera: { name: '리베라', hall: '운하 회관', head: '도제', seats: { merchant: 8, craft: 4, harbor: 5, old: 7 }, lean: '은행과 운하', wall: '운하 수문', river: '은행 거리' },
};
export const CITY_IDS = Object.keys(CITIES);
export const SEATS = 24;

/* ---------- 파벌 ---------- */
export const FACTIONS = {
  merchant: { name: '상인 동맹', short: '상인', guild: '상인 조합', word: '돈은 돌아야 한다', color: '#b8892f' },
  craft: { name: '장인 길드 연합', short: '장인', guild: '장인 조합', word: '손으로 만든 것이 도시를 세운다', color: '#7a5a3a' },
  harbor: { name: '부두 사람들', short: '항구', guild: '뱃사람 조합', word: '바다가 막히면 도시도 굶는다', color: '#3d6b8a' },
  old: { name: '옛 가문', short: '옛 가문', guild: null, word: '도시는 세운 집안이 지킨다', color: '#6b3d5a' },
};
export const FACTION_IDS = Object.keys(FACTIONS);

// 옛 가문 이름 (도시마다)
export const OLD_HOUSES = {
  barka: ['스칼라', '모레티', '그라소'],
  portel: ['데 루카', '벤투리', '파가니'],
  krossen: ['바르비에리', '콘티', '로셀리'],
  libera: ['콘타리니', '모체니고', '그리마니'],
};

/* ---------- 의안 ---------- */
// stance: 파벌별 찬성(+)·반대(-). fx: 통과되면 도시에 (prosper 살림, safe 안전, anger 민심 나쁨, purse 금고)
export const ISSUES = {
  tax: {
    name: '성문세 올리기', ask: (c) => `${c.name} 성문을 드나드는 짐에 매기는 세를 한 푼 더 올리자는 안이다.`,
    stance: { merchant: -2, craft: 1, harbor: -1, old: 2 }, fx: { prosper: -3, purse: 12, anger: 4 },
    pass: (c) => `${c.name} 성문세가 올랐다. 장꾼들이 성문 앞에서 짐을 풀었다 다시 싼다.`,
    fail: (c) => `${c.name} 의회가 성문세 인상을 부결했다. 금고지기만 한숨을 쉬었다.`,
  },
  wall: {
    name: '성벽 보수', ask: (c) => `무너져 가는 ${c.wall}을 고치자는 안이다. 돈은 금고와 집집의 분담금에서 나온다.`,
    stance: { merchant: -1, craft: 2, harbor: 0, old: 1 }, fx: { safe: 8, purse: -14, prosper: 1 },
    pass: (c) => `${c.name} 의회가 ${c.wall} 보수를 정했다. 석공들이 비계를 세우기 시작했다.`,
    fail: (c) => `${c.name} 의회가 성벽 보수를 미뤘다. 금 간 자리에 이끼가 낀다.`,
  },
  merc: {
    name: '용병단 고용', ask: () => '도시 경비대 대신 용병단을 사서 성문과 길을 지키게 하자는 안이다. 싸지만 믿을 수 없다는 말도 많다.',
    stance: { merchant: 2, craft: -1, harbor: 1, old: -2 }, fx: { safe: 5, purse: -8, anger: 3 },
    pass: (c) => `${c.name} 의회가 용병단과 계약했다. 낯선 깃발을 단 사내들이 성문에 섰다.`,
    fail: (c) => `${c.name} 의회가 용병 계약을 물렸다. 경비대는 그대로 모자란다.`,
  },
  dock: {
    name: '부두 넓히기', ask: (c) => `${c.river}를 넓히고 창고를 새로 짓자는 안이다. 공사판에 일자리가 생기고, 빚도 생긴다.`,
    stance: { merchant: 1, craft: 1, harbor: 2, old: -1 }, fx: { prosper: 6, purse: -12 },
    pass: (c) => `${c.name} 의회가 ${c.river} 공사를 정했다. 품팔이꾼들이 새벽부터 줄을 선다.`,
    fail: (c) => `${c.name} 의회가 ${c.river} 공사를 부결했다. 선주들이 회관 계단에서 소리를 질렀다.`,
  },
  grain: {
    name: '빵값 상한', ask: () => '흉년에 빵값이 치솟지 않게 상한을 두고 도시 곳간을 열자는 안이다. 곡물 상인들은 펄쩍 뛴다.',
    stance: { merchant: -2, craft: 1, harbor: 2, old: 0 }, fx: { anger: -8, prosper: -2, purse: -6 },
    pass: (c) => `${c.name} 의회가 빵값 상한을 정했다. 곡물 상인 몇이 곳간 문을 잠갔다.`,
    fail: (c) => `${c.name} 의회가 빵값 상한을 부결했다. 빵집 앞 줄이 길어졌다.`,
  },
  deal: {
    name: '통상 조약', ask: (c) => `${c.realm}과 통상 조약을 맺자는 안이다. 그쪽 사절이 벌써 회관 근처 여관에 묵고 있다.`,
    stance: { merchant: 2, craft: -1, harbor: 1, old: -1 }, fx: { prosper: 5, purse: 4 },
    pass: (c) => `${c.name} 의회가 ${J(c.realm, '과/와')} 통상 조약을 맺었다. 그쪽 짐마차가 성문에 늘었다.`,
    fail: (c) => `${c.name} 의회가 ${J(c.realm, '과/와')}의 조약을 물렸다. 사절이 다음 날 새벽에 떠났다.`,
  },
  guild: {
    name: '외지 장인 받기', ask: () => '조합에 들지 않은 외지 장인도 장터에 가게를 내게 하자는 안이다. 장인 조합은 문 닫고 버틸 기세다.',
    stance: { merchant: 2, craft: -3, harbor: 0, old: 0 }, fx: { prosper: 4, anger: 2 },
    pass: (c) => `${c.name} 의회가 외지 장인에게 장터를 열었다. 장인 조합 회관에 밤늦게까지 불이 켜져 있었다.`,
    fail: (c) => `${c.name} 의회가 외지 장인 안을 부결했다. 성문 밖 가건물 장인들이 짐을 쌌다.`,
  },
};
export const ISSUE_IDS = Object.keys(ISSUES);

/* ---------- 내 자리 ---------- */
export const RANK_WORD = ['', '조합원', '조합장', '의원', '집정관'];
export const RANK_OLD = ['', '가문 사람', '가문의 대표', '의원', '집정관'];

/* ---------- 이 고장 한 줄 ---------- */
export const PRESENCE = [
  (c) => `${c.hall} 계단에 의원들의 마차가 줄지어 섰다. 오늘 ${J(c.issue, '을/를')} 두고 표결이 있다고 한다.`,
  (c) => `장터에서 ${c.faction} 사람들이 술을 돌리고 있다. 다음 의회 선거가 멀지 않았다.`,
  (c) => `${c.headName} ${c.headWord}의 이름을 두고 술집이 둘로 갈렸다. 한쪽은 잔을 들고, 한쪽은 침을 뱉는다.`,
  (c) => `${c.hall} 앞 게시판에 새 의안이 붙었다. ${c.issue}. 글을 읽을 줄 아는 사람 주위로 사람이 모였다.`,
];

/* ---------- 장면 글 ---------- */
export const INVITE = {
  merchant: (c) => `장부를 맞춰 주던 상단 서기가 찻잔을 내려놓았다. "그 셈 솜씨면 ${c.city} 상인 조합에 들 만해. 회비가 은화 ${c.fee}닢. 조합 사람이 아니면 큰 거래엔 끼워 주지 않아."`,
  craft: (c) => `공방 거리의 늙은 장인이 내 손을 뒤집어 굳은살을 보았다. "${c.city} 장인 조합이 사람을 받는다네. 회비 은화 ${c.fee}닢. 조합 표식이 없으면 장터 좋은 자리는 꿈도 꾸지 마."`,
  harbor: (c) => `부두에서 밧줄을 감던 갑판장이 고개를 들었다. "너 같은 손은 뱃사람 조합에 이름을 올려야지. 회비 은화 ${c.fee}닢. 조합이 있어야 품삯 떼였을 때 누가 대신 싸워 준다."`,
};

export const ELECT_TXT = [
  (c) => `${c.city} 의회 선거다. ${c.faction} 몫으로 내 이름이 명부에 올랐다. 장터 광장에 연단이 섰고, 맞은편 후보 ${c.rival}의 사람들이 벌써 술통을 굴려 온다.`,
  (c) => `선거 철이 왔다. ${c.faction} 조합 회관에서 내 이름을 걸기로 했다. 상대는 ${c.rival}. 그 집 하인들이 골목마다 은화 꾸러미를 들고 다닌다는 말이 돈다.`,
];

export const SPEECH_OK = [
  '목소리가 떨렸지만 끝까지 말했다. 앞줄의 생선 장수가 먼저 손뼉을 쳤다. 뒤에서 누가 내 이름을 외쳤다.',
  '연단 아래 얼굴들이 하나씩 내 쪽으로 돌아섰다. 말을 마치자 잠시 조용했다. 그다음에 박수가 왔다.',
];
export const SPEECH_BAD = [
  '말이 꼬였다. 뒤쪽에서 누가 웃었고, 그 웃음이 번졌다. 연단을 내려오는 계단이 길었다.',
  '준비한 말을 반쯤 했을 때 상대 후보 사람들이 썩은 양배추를 던졌다. 나머지 반은 아무도 듣지 않았다.',
];

/* ---------- 소식 ---------- */
export const NEWS = {
  vote: (c) => c.text,
  elect: (c) => `${c.city} 의회 선거가 끝났다. ${c.top} 쪽이 ${c.n}석으로 가장 많다.`,
  head: (c) => `${c.city} 의회가 ${J(c.name, '을/를')} 새 ${J(c.word, '으로/로')} 뽑았다. ${c.faction} 사람이다.`,
  fall: (c) => `${c.city}의 ${c.word} ${J(c.name, '이/가')} 뇌물 장부가 드러나 물러났다. ${c.exile ? '도시 밖으로 쫓겨났다.' : '집 밖으로 나오지 않는다고 한다.'}`,
  dead: (c) => `${c.city}의 ${c.word} ${J(c.name, '이/가')} 세상을 떠났다. 회관에 검은 천이 걸렸다.`,
  riot: (c) => `${c.city}에서 빵값과 세금에 성난 사람들이 ${J(c.hall, '을/를')} 에워쌌다. 의원 둘이 뒷문으로 빠져나갔다.`,
  merc: (c) => `${c.city}에 고용된 용병단이 품삯이 밀리자 성문을 닫아걸었다. 의회가 금고를 털어 겨우 달랬다.`,
};

/* ---------- 실각·추방 ---------- */
export const SCANDAL = [
  (c) => `아침에 ${J(c.hall, '이/가')} 웅성거렸다. 누군가 내 이름이 적힌 장부 한 장을 게시판에 붙였다. 누구에게서 얼마를 받았는지가 내 글씨보다 반듯하게 적혀 있다.`,
  (c) => `${c.rival}의 사람이 의회 한가운데서 종이 한 묶음을 흔들었다. "${c.me} 의원이 지난 표결 전에 받은 은화다!" 몇은 나를 보고, 몇은 고개를 돌렸다.`,
];
