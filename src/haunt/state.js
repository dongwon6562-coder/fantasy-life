// 망자와 저주. 상태는 g.haunt 하나.
//   이 세계에서 사람의 넋은 죽으면 흩어진다. 다만 마력은 몸보다 오래 남는다. 원한이나 미련을 품고 험하게 죽은 사람의 마력이
//   자리(집·무덤·우물·싸움터·갱도)나 물건에 들러붙어 굳으면, 마탑은 그것을 '잔향'이라 부르고 교단은 '길 잃은 혼', 시골 영매들은 '원념'이라 부른다.
//   잔향은 생각하지 않는다. 죽던 날의 마음을 되풀이할 뿐이고, 해가 갈수록 엷어진다. 대부분의 흉가 소문은 잔향조차 아니다.
//   마신의 봉인이 약해지면 그 틈에서 새는 힘이 굳은 잔향을 채운다. 그렇게 생긴 것만이 사람을 죽이는 '망령'이 된다. 아주 드물다.
//
//   spots{ id: { name, place, kind, dead{ name, how, grief, ask }, power(0~100, 잔향의 세기. 가짜 소문이면 0), real(진짜 잔향인가),
//                state('quiet' 잠잠 | 'restless' 들끓음 | 'laid' 풀림 | 'gone' 잊힘), wraith(봉인의 힘이 들어찬 망령인가), known(0 소문 · 1 겪어 봄 · 2 사연까지),
//                truth(가짜일 때 실제 까닭), since, hurt(다친·죽은 사람 수), robbed } }
//   dread{ 고장: 0~100 흉흉함 }   frauds{ 고장: 사기꾼 무당 수 }   items[{ id, kind, name, from(자리 id|null), power, since }]
//   curse(집안의 저주 | null){ kind, by, why, power, gen, since, place }   wraith(지금 떠도는 망령 자리 id | null)
//   seen{ mine{ 광산 id: 죽은 수 }, hamlet{ 마을 id: 버려진 달 } }
//   me{ visits, laid, robbed, rites, fakes, exposed, cursed, lifted, items, passed, medium(영매 공부 0~100), faced, wraiths, fled }   seq, log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { J } from '../narrative/text.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? pl;

// 흉한 자리의 갈래
export const KINDS = {
  house: { name: '흉가', word: '빈집', icon: '집' },
  grave: { name: '버려진 묘지', word: '묘지', icon: '묘' },
  well: { name: '막아 둔 우물', word: '우물', icon: '우물' },
  field: { name: '옛 싸움터', word: '싸움터', icon: '들' },
  mine: { name: '무너진 갱도', word: '갱도', icon: '갱' },
  hamlet: { name: '버려진 마을', word: '마을 터', icon: '터' },
};
export const KIND_IDS = Object.keys(KINDS);

// 죽은 사람이 무엇을 놓지 못했나 (넋을 달래려면 그것을 해 주어야 한다)
//   ask: 풀어 주는 일   cost: 드는 은화
export const GRIEFS = {
  name: { word: '이름 없이 묻혔다', ask: '이름을 찾아 묘비에 새겨 준다', cost: 12 },
  home: { word: '고향에 돌아가지 못했다', ask: '뼈를 추려 고향 땅에 묻어 준다', cost: 25 },
  wrong: { word: '억울하게 죽었다', ask: '누가 그랬는지 밝혀 사람들 앞에서 말한다', cost: 0 },
  child: { word: '두고 간 아이를 찾는다', ask: '아이가 어떻게 되었는지 알아내 무덤 앞에서 일러 준다', cost: 5 },
  debt: { word: '갚지 못한 빚에 목을 맸다', ask: '남은 빚을 대신 갚고 차용증을 태운다', cost: 30 },
  rite: { word: '장례를 치르지 못했다', ask: '늦게라도 제대로 된 장례를 치러 준다', cost: 15 },
};
export const GRIEF_IDS = Object.keys(GRIEFS);

// 자리마다 어울리는 죽음
export const DEATHS = {
  house: [
    { how: '빚에 몰려 들보에 목을 맸다', grief: 'debt' },
    { how: '남편 손에 맞아 죽었는데 집안이 넘어진 것이라 했다', grief: 'wrong' },
    { how: '불이 났을 때 다락에서 나오지 못했다', grief: 'child' },
    { how: '독이 든 국을 먹고 죽었다. 재산은 조카에게 갔다', grief: 'wrong' },
  ],
  grave: [
    { how: '돌림병 때 구덩이 하나에 여럿이 함께 묻혔다', grief: 'name' },
    { how: '떠돌이로 죽어 묘지 담 밖에 묻혔다', grief: 'home' },
    { how: '목이 잘려 죄인 묘에 묻혔다. 죄가 없었다는 말이 돈다', grief: 'wrong' },
  ],
  well: [
    { how: '우물에 빠져 죽었다. 밀었다는 말과 뛰어들었다는 말이 반반이다', grief: 'wrong' },
    { how: '잿빛 열병이 돌 때 앓다가 우물가에서 쓰러졌다', grief: 'rite' },
  ],
  field: [
    { how: '징집되어 끌려와 이름도 없이 쓰러졌다', grief: 'name' },
    { how: '남쪽 고향을 떠나와 여기서 죽었다', grief: 'home' },
    { how: '항복하고도 목이 베였다', grief: 'wrong' },
  ],
  mine: [
    { how: '무너진 갱도 안에서 사흘 동안 벽을 두드리다 숨이 멎었다', grief: 'rite' },
    { how: '갇힌 채 묻혔다. 시신은 지금도 돌 밑에 있다', grief: 'rite' },
    { how: '감독이 버팀목 값을 아끼다 무너진 갱도에 깔렸다', grief: 'wrong' },
  ],
  hamlet: [
    { how: '마물 떼가 몰려온 밤 달아나지 못했다', grief: 'rite' },
    { how: '모두 떠난 마을에 혼자 남았다가 겨울에 죽었다', grief: 'child' },
  ],
};

// 가짜 소문의 실제 까닭 (밝혀지면 이렇게 끝난다)
export const TRUTHS = [
  '밀수꾼들이 물건을 숨겨 두려고 귀신 소문을 냈다',
  '굴뚝에 둥지를 튼 올빼미와 바람 소리였다',
  '빈집을 헐값에 사려던 이웃이 소문을 퍼뜨렸다',
  '떠돌이 하나가 몰래 들어와 살고 있었다',
  '썩은 마루 밑에서 올라온 늪 기운에 사람들이 헛것을 보았다',
  '마을에서 쫓겨난 노파가 밤마다 남편 무덤에 다녀갔다',
];

// 저주받은 물건: 잔향이 깃든 것. 값은 비싸게 쳐주지만 지니고 있으면 달마다 탈이 난다.
export const ITEMS = {
  ring: { name: '검은 진주 가락지', value: 60, desc: '물에 빠져 죽은 신부의 손가락에서 뺀 것이라고 한다. 끼고 자면 숨이 막히는 꿈을 꾼다.' },
  sword: { name: '이 빠진 기사의 검', value: 45, desc: '항복하고도 목이 베인 기사의 것. 칼집에 넣어 두어도 밤이면 칼날이 운다.' },
  mirror: { name: '은테 손거울', value: 50, desc: '거울 속 내 얼굴 뒤로 가끔 다른 얼굴이 비친다. 깨려고 하면 손이 멈춘다.' },
  doll: { name: '머리카락을 엮은 인형', value: 15, desc: '돌림병에 죽은 아이가 끌어안고 있던 것. 어느 방에 두어도 아침이면 문 쪽을 보고 있다.' },
  coin: { name: '갱도에서 나온 옛 금화', value: 70, desc: '무너진 갱도의 돌 밑에서 나왔다. 쓰려고 꺼내면 손이 무겁고, 쓴 날 밤엔 두드리는 소리가 난다.' },
  locket: { name: '이름이 긁힌 목걸이 함', value: 35, desc: '안의 초상이 긁혀 있다. 지닌 사람은 자꾸 남의 이름을 잘못 부른다.' },
};
export const ITEM_IDS = Object.keys(ITEMS);

// 집안의 저주: 대를 이어 내려온다. 세대마다 엷어져 대개 세 대쯤이면 사라진다.
export const CURSES = {
  dying: { name: '죽어 가며 내뱉은 저주', desc: '원수가 마지막 숨으로 핏줄을 저주했다.' },
  grave: { name: '파헤친 무덤의 원념', desc: '무덤을 판 손에 죽은 이의 원념이 따라붙었다.' },
  item: { name: '버리지 못한 물건의 원념', desc: '저주받은 물건을 너무 오래 지녔다. 물건이 없어져도 원념은 남았다.' },
  necro: { name: '죽은 자를 부린 값', desc: '죽은 자의 술로 넋을 부렸다. 부림을 당한 것들이 핏줄을 기억한다.' },
  old: { name: '오래된 집안의 저주', desc: '어느 대에서 시작했는지 아무도 모른다. 집안 어른들이 입에 올리지 않는다.' },
};

// 영매가 사는 곳: 대지의 어머니와 조상을 모시는 시골 무당들. 교단이 있는 곳에서는 숨어서 일한다.
export const MEDIUMS = {
  ern: { name: '언덕 돌 제단지기 노파', open: false },
  verden: { name: '선돌 옆 오두막의 눈먼 영매', open: false },
  gruental: { name: '샘가의 넋 달래는 여자', open: false },
  barka: { name: '뒷골목 사당의 바다 무당', open: true },
  klein: { name: '갯가 무당 할멈', open: true },
  hammer: { name: '조상 화로의 이름 부르는 이', open: true },
  fur: { name: '토템 언덕의 늙은 주술사', open: true },
  portel: { name: '항구 창고 뒤의 점쟁이', open: true },
};
// 교단 사제가 퇴마 의식을 하는 곳
export const EXORCISTS = ['leocast', 'solaris', 'harfen', 'eisen', 'graubel', 'verden', 'barka'];
// 교단의 눈이 무거운 땅 (영매 일을 하면 수군거림이 는다)
export const CHURCH_REALMS = ['holy', 'leonia', 'march'];

export const dreadWord = (v) => (v >= 70 ? '해가 지면 아무도 문밖에 나가지 않는다' : v >= 45 ? '밤길을 피하는 사람이 많다' : v >= 25 ? '흉한 이야기가 돈다' : '');
export const powerWord = (v) => (v >= 70 ? '숨이 얼 만큼 짙다' : v >= 40 ? '또렷하다' : v >= 15 ? '엷다' : '거의 흩어졌다');
export const curseWord = (v) => (v >= 60 ? '무겁다' : v >= 35 ? '아직 남아 있다' : '엷어졌다');
export const mediumWord = (v) => (v >= 60 ? '죽은 이의 말을 알아듣는다' : v >= 30 ? '넋 달래는 법을 안다' : v >= 10 ? '영매 흉내는 낸다' : '');

export const HS = (g) => (g.haunt ??= fresh());
const freshMe = () => ({ visits: 0, laid: 0, robbed: 0, rites: 0, fakes: 0, exposed: 0, cursed: 0, lifted: 0, items: 0, passed: 0, medium: 0, faced: 0, wraiths: 0, fled: 0 });
export function fresh() {
  return { spots: {}, dread: {}, frauds: {}, items: [], curse: null, wraith: null, seen: { mine: {}, hamlet: {}, grave: {} }, me: freshMe(), mediums: {}, seq: 1, log: [], wraithAt: 0 };
}
export function hlog(g, text) {
  const H = HS(g);
  H.log.push({ y: g.date.year, m: g.date.month, text });
  if (H.log.length > 30) H.log.splice(0, H.log.length - 30);
}
export const spotsAt = (g, pl) => Object.entries(HS(g).spots).filter(([, s]) => s.place === pl && (s.state === 'quiet' || s.state === 'restless')).map(([id]) => id);
export const liveSpots = (g) => Object.entries(HS(g).spots).filter(([, s]) => s.state === 'quiet' || s.state === 'restless').map(([id]) => id);
export const spotName = (s) => s?.name ?? '흉한 자리';
export const realmOfPlace = (pl) => PLACES[pl]?.realm || 'leonia';
export const dreadAt = (g, pl) => HS(g).dread[pl] ?? 0;

HOOKS.newGame.push((g) => { g.haunt = fresh(); });
HOOKS.migrate.push((g) => {
  const H = HS(g), f = fresh();
  for (const k of Object.keys(f)) H[k] ??= f[k];
  H.seen.mine ??= {}; H.seen.hamlet ??= {}; H.seen.grave ??= {};
  H.me = Object.assign(freshMe(), H.me ?? {});
});
// 대를 이으면: 집안의 저주는 따라오되 엷어진다(세 대쯤이면 사라진다). 물건은 유품으로 남는다. 영매 공부는 몸에 밴 것이라 이어지지 않는다.
HOOKS.heir?.push((g) => {
  const H = HS(g);
  if (H.curse) {
    H.curse.power = Math.round(H.curse.power * 0.62 - 4);
    if (H.curse.power < 12) { hlog(g, `${J(CURSES[H.curse.kind]?.name ?? '집안의 저주', '이/가')} 대를 넘으며 끝내 흩어졌다.`); H.curse = null; }
  }
  H.me.medium = Math.round(H.me.medium * 0.3);
});
