// 마탑과 금지된 마법. 상태는 g.tower 하나.
//   member: null | { tower, rank(0~4), merit, joined, master{name, circle, bond, alive}, dutyAt, left }
//   items[]: 내가 만든 마도구 id (가진 것), made: 만든 수, craft: 지금 만드는 것 { id, prog }
//   forbidden{ necro, blood, mind }: 금지 마법 세 갈래를 얼마나 깊이 알았나 (0~3)
//   taint: 금지 마법이 몸과 마음에 남긴 얼룩 (0~100)   exposed: 들킨 적이 있나   hunted: 집행관에게 쫓기는 달까지
//   circleCert: 세레니아에서 받은 서클 공인 (5~6, magic.certified와 같이 올린다)
//   friction: 마탑과 교단 사이의 날 (0~100, 세상의 값)
//   black: 검은 탑(금지 마법 비밀 모임)과 얽힌 정도 0(모름) 1(초대받음) 2(들어감) -1(거절·밀고)
import { HOOKS } from '../hooks.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 세레니아의 네 탑: 무엇을 연구하고, 누구와 가깝나
export const TOWERS = {
  red: { name: '붉은 탑', short: '붉은 탑', desc: '불과 번개, 싸우는 마법. 제국과 왕국의 군대에 마법사를 보낸다. 거칠고 서열이 엄하다.', skill: 'combat', church: 0 },
  blue: { name: '푸른 탑', short: '푸른 탑', desc: '물과 치유. 성당 시약소와 손잡고 일한다. 교단과 가장 말이 통하는 탑이다.', skill: 'heal', church: 15 },
  grey: { name: '회색 탑', short: '회색 탑', desc: '술식 이론과 봉인 연구. 협회장의 탑이다. 오래된 서고와 금기 서고를 지킨다.', skill: 'theory', church: -5 },
  star: { name: '별의 탑', short: '별의 탑', desc: '마석 공학과 마도구. 상단의 돈이 가장 많이 흘러드는 탑이다. 공방 냄새가 난다.', skill: 'craft', church: -10 },
};
export const RANKS = ['견습 마도사', '정식 마도사', '탑 연구원', '탑주 보좌', '탑주'];
// 다음 지위에 필요한 것: 공적과 공인 서클. 고서클은 드물어서 위로 갈수록 좁다.
export const RANK_NEED = [null, { merit: 30, cert: 2 }, { merit: 80, cert: 3 }, { merit: 160, cert: 4 }, { merit: 300, cert: 5 }];

// 마도구: 서클, 재료값, 품(달), 필요한 발명(history), 갖고 있으면 생기는 쓸모, 팔면 받는 값
export const ITEMS = {
  charm: { name: '보호 부적', circle: 1, cost: 6, work: 1, sell: 14, desc: '문설주에 거는 작은 부적. 마물과 잡귀를 물린다.', keep: '잡귀가 꼬이지 않는다 (스트레스가 조금 준다)' },
  lantern: { name: '마력 등잔', circle: 1, cost: 8, work: 1.5, sell: 18, needs: ['firestone'], desc: '화석으로 불을 붙이고 마력으로 지키는 등잔. 바람에도 꺼지지 않는다.', keep: '밤일이 덜 고되다 (피로가 조금 준다)' },
  ring: { name: '치유의 반지', circle: 2, cost: 18, work: 2.5, sell: 45, desc: '끼고 있으면 상처가 빨리 아문다. 성당 시약소가 탐내는 물건이다.', keep: '다친 곳이 빨리 아문다' },
  compass: { name: '마력 나침반', circle: 2, cost: 15, work: 2, sell: 38, desc: '마석과 숨은 마력 쪽으로 바늘이 돈다. 광부와 모험가가 찾는다.', keep: '미궁에서 길을 덜 잃는다 (모험가 일에 조금 이득)' },
  staff: { name: '마석 지팡이', circle: 3, cost: 30, work: 3, sell: 80, needs: ['manamill'], desc: '마석을 박은 지팡이. 술식을 실어 나르는 손잡이가 된다.', keep: '싸울 때 손에 쥔다 (무기)' },
  coldstone: { name: '봉인 감시석', circle: 3, cost: 26, work: 3, sell: 70, desc: '봉인의 울림에 맞춰 빛이 흔들리는 돌. 마탑이 북쪽 망루마다 놓으려 한다.', keep: '봉인의 일을 조금 더 안다' },
  mirror: { name: '전언 거울', circle: 4, cost: 60, work: 4, sell: 160, needs: ['signal'], desc: '짝을 이룬 거울끼리 얼굴과 목소리를 나른다. 왕실과 상단이 금화를 싸 들고 온다.', keep: '먼 소식이 먼저 닿는다 (장사·궁정에 조금 이득)' },
};

// 금지 마법 세 갈래
export const FORBIDDEN = {
  necro: { name: '죽은 자의 술', lv: ['죽은 자의 목소리 듣기', '시신을 일으키기', '죽은 자를 부리기'], desc: '죽은 자에게서 말과 힘을 빌린다.' },
  blood: { name: '피의 술', lv: ['피로 술식 긋기', '피로 마력 끌어올리기', '남의 피로 힘 얻기'], desc: '피와 생명을 마력으로 바꾼다.' },
  mind: { name: '정신의 술', lv: ['마음 엿보기', '마음 기울이기', '마음 꺾기'], desc: '남의 생각과 마음을 건드린다.' },
};

export const TS = (g) => (g.tower ??= fresh());
export function fresh() {
  return { member: null, items: [], made: 0, craft: null, forbidden: { necro: 0, blood: 0, mind: 0 }, taint: 0, exposed: 0, hunted: 0, circleCert: 0, friction: 30, black: 0, burned: 0, log: [] };
}
export const member = (g) => TS(g).member;
export const rankName = (g) => (TS(g).member ? RANKS[TS(g).member.rank] : null);
export const towerName = (g) => (TS(g).member ? TOWERS[TS(g).member.tower].name : null);
export const forbiddenLv = (g) => Object.values(TS(g).forbidden).reduce((a, b) => a + b, 0);
export const hasItem = (g, id) => TS(g).items.includes(id);
export function tlog(g, text) {
  const T = TS(g);
  T.log.push({ y: g.date.year, m: g.date.month, text });
  if (T.log.length > 30) T.log.splice(0, T.log.length - 30);
}
export const taintWord = (v) => (v >= 70 ? '눈동자에 검은 실금이 비친다. 개들이 짖는다.' : v >= 40 ? '손이 늘 차갑다. 거울을 오래 보지 않게 되었다.' : v >= 15 ? '가끔 꿈자리가 사납다.' : '');
export const frictionWord = (v) => (v >= 70 ? '이단심문관이 탑 문 앞에 진을 쳤다' : v >= 45 ? '서로를 공공연히 비난한다' : v >= 25 ? '서먹하다' : '오랜만에 말이 통한다');

HOOKS.newGame.push((g) => { g.tower = fresh(); });
HOOKS.migrate.push((g) => {
  const T = TS(g), f = fresh();
  for (const k of Object.keys(f)) T[k] ??= f[k];
  for (const k of Object.keys(f.forbidden)) T.forbidden[k] ??= 0;
});
// 대를 이으면: 탑의 자리와 금지 마법은 사라지고, 마도구는 집안에 남는다
HOOKS.heir?.push((g) => { const T = TS(g); T.member = null; T.forbidden = { necro: 0, blood: 0, mind: 0 }; T.taint = 0; T.hunted = 0; T.craft = null; T.circleCert = 0; if (T.black > 0) T.black = 0; });
