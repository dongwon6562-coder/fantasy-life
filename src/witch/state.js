// 50단계 숲의 마녀와 민간 주술: 상태와 자료.
// 서클 마법과 다른 길. 마을 변두리의 노파·주술사가 부적과 묘약, 해산 돕기, 날씨 점, 저주 풀기로 먹고산다.
// 마력이 약해도 배운다(약초와 제물과 기억). 효험은 진짜일 때도, 속임수일 때도 있다.
// g.witch = { seq, wise[], hunts[], heat{고장:0~100}, huntAt{고장:달}, log[], me{...}, tally }
//   wise: { id, name, sex, age, place, kind('true'|'half'|'fraud'), trust(마을 눈길 0~100), fame, line(집안 이름), gen(몇 대째), born, gone{y,how}|null, met }
//   hunt: { y, m, place, who(이름), me(bool), how('fled'|'ordeal_live'|'ordeal_dead'|'burned'|'banished'|'saved'|'fined') }
//   me: { lore, known{주술:1~3}, teacher(wise id), look{고장:눈길}, fame, fraud, clients, hexes, mark, lineage{line,gen}|null,
//         gran(할머니가 마녀였던 집안), seenHut, studyAt, clientAt, lessonAt, scornAt, huntAt, gotAt, log[] }
// 세상 주사위와 따로 굴린다(ownRng). 플레이어 없이도 마녀가 늙고, 대를 잇고, 흉년이면 쫓긴다.
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { L } from '../adventure/core.js';
import { playerAge } from '../game.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const here = (g) => (g.life ? L(g).place ?? 'ern' : 'ern');
export const age = (g) => playerAge(g);
export const realmAt = (pl) => PLACES[pl]?.realm ?? (pl === 'estella' ? 'wild' : 'leonia');
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 313) ^ Math.imul(mi(g) * 157 + salt + 59, 2654435761)) | 0 });

/* ---------- 나라마다 마녀를 보는 눈 ---------- */
// hunt: 흉년·역병 때 마녀사냥이 일 기세(0이면 안 일어남). 성광 신성국이 가장 사납고, 마탑의 나라는 깔보기만 한다.
export const REALM_EYE = {
  holy: { hunt: 1.8, word: '교단이 마녀를 불태운다' },
  leonia: { hunt: 1.0, word: '사제는 미워하고 마을은 몰래 찾는다' },
  march: { hunt: 1.1, word: '변경 사람들은 겁이 많다' },
  valhart: { hunt: 0.6, word: '제국 법은 주술을 사기로 다룬다' },
  free: { hunt: 0.5, word: '돈만 내면 아무도 묻지 않는다' },
  serenia: { hunt: 0.3, word: '마탑 사람들은 시골 주술을 비웃는다' },
};
export const huntPower = (pl) => REALM_EYE[realmAt(pl)]?.hunt ?? 0;
// 마녀가 살 만한 곳: 사람 나라의 마을과 작은 고을
export const witchPlace = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && !!REALM_EYE[realmAt(pl)] && (PLACES[pl].house ?? 0) >= 60 && (PLACES[pl].house ?? 0) <= 460;
export const witchPlaces = () => Object.keys(PLACES).filter(witchPlace);

/* ---------- 주술 ---------- */
// lore: 배우는 데 드는 솜씨, real: 진짜 효험이 나는 바탕(나머지는 마음의 위안이거나 속임수), fee: 마을 사람이 내는 값
export const CHARMS = {
  amulet: { name: '부적', icon: 'rune', lore: 0, real: 0.5, fee: 3, stuff: '쑥 다발과 붉은 실, 못 하나', do: '부적을 만들어 준다', ask: ['집에 나쁜 것이 못 들게 문설주에 걸 부적을 청한다', '먼 길 떠나는 아들 품에 넣어 줄 부적을 청한다', '밤마다 외양간 소가 운다며 부적을 청한다'] },
  find: { name: '잃은 것 찾기', icon: 'eye', lore: 8, real: 0.4, fee: 4, stuff: '체에 꽂은 가위와 물그릇', do: '잃은 것을 찾아 준다', ask: ['잃어버린 은반지를 찾아 달라고 한다', '집 나간 염소를 어디서 찾아야 할지 묻는다', '어머니가 숨겨 둔 은화 단지를 찾아 달라고 한다'] },
  birth: { name: '해산 돕기', icon: 'heart', lore: 12, real: 0.75, fee: 6, stuff: '끓인 물과 깨끗한 천, 쑥 연기', do: '아이를 받으러 간다', ask: ['아내가 사흘째 진통을 한다며 문을 두드린다', '딸이 첫아이를 낳는데 아이가 거꾸로 섰다며 운다', '양치기 오두막에서 며느리가 산기가 있다며 사람을 보냈다'] },
  love: { name: '사랑 묘약', icon: 'flask', lore: 18, real: 0.2, fee: 8, stuff: '장미 꽃잎과 꿀, 상대의 머리카락 한 올', do: '묘약을 달여 준다', ask: ['방앗간 집 아들의 마음을 얻을 묘약을 청한다', '바람난 남편이 돌아오게 할 묘약을 청한다', '축제 날 춤을 청할 용기가 나는 묘약을 청한다'] },
  weather: { name: '날씨 점', icon: 'sun', lore: 22, real: 0.45, fee: 4, stuff: '뼈 주사위와 까마귀 깃털', do: '날씨를 점친다', ask: ['씨를 뿌려도 될지, 비가 올지 묻는다', '건초를 언제 베어야 비를 피할지 묻는다', '혼례 날 날씨가 어떨지 봐 달라고 한다'] },
  uncurse: { name: '저주 풀기', icon: 'candle', lore: 32, real: 0.5, fee: 10, stuff: '소금 한 줌과 흐르는 물, 달걀 하나', do: '저주를 풀어 준다', ask: ['누가 집에 저주를 걸었다며 풀어 달라고 한다', '아이가 밤마다 경기를 하는 게 눈독 탓이라며 풀어 달라고 한다', '우물물이 갑자기 썩었다며 저주를 풀어 달라고 한다'] },
  hex: { name: '저주 걸기', icon: 'skull', lore: 38, real: 0.3, fee: 20, stuff: '밀랍 인형과 녹슨 바늘', do: '저주를 건다', ask: ['이웃을 망하게 할 저주를 걸어 달라고 은화를 내민다', '자기를 버린 약혼자에게 저주를 걸어 달라고 한다'], dark: true },
};
export const CHARM_IDS = Object.keys(CHARMS);
export const LEVEL_WORD = ['', '겨우 흉내 낸다', '손에 익었다', '이름이 났다'];

/* ---------- 이름 ---------- */
export const WISE_NAMES = {
  f: ['마르타', '헤드비히', '군힐트', '베르타', '알무트', '오틸리에', '발부르가', '이름가르트', '로스비타', '크레스첸츠', '게르트루트', '말비네', '자비네', '힐데'],
  m: ['고트립', '에베르하르트', '아달베르트', '라인홀트', '지기스문트', '바르톨트'],
};
export const LINES = ['쑥밭집', '까마귀 우물집', '늪가집', '세 그루 참나무집', '검은 암탉집', '물레방아 뒷집', '버드나무집', '돌무덤집', '여우굴집', '달맞이집'];
export const KIND_WORD = { true: '진짜', half: '반반', fraud: '속임수' };

/* ---------- 말 ---------- */
export const loreWord = (v) => (v >= 80 ? '숲이 말을 걸어온다' : v >= 55 ? '마을 사람들이 밤에 찾아온다' : v >= 25 ? '주술 몇 가지를 안다' : v >= 5 ? '노파 곁에서 배우는 중이다' : '');
export const lookWord = (v) => (v >= 75 ? '마을이 고마워한다' : v >= 55 ? '몰래 찾는 사람이 많다' : v >= 35 ? '수군대며 피한다' : v >= 15 ? '손가락질을 받는다' : '마녀라 침을 뱉는다');
export const heatWord = (v) => (v >= 60 ? '마녀를 찾아내라는 소리가 높다' : v >= 35 ? '흉한 일을 누구 탓으로 돌릴지 수군댄다' : v >= 15 ? '사람들 눈이 날카롭다' : '');
export const rankOf = (M, sex = 'f') => {
  if (M.lore < 5 && !Object.keys(M.known).length) return '주술을 모름';
  if (M.lore >= 80 && M.fame >= 50) return sex === 'f' ? '숲의 큰어머니' : '숲의 큰 주술사';
  if (M.lore >= 55 && M.fame >= 30) return sex === 'f' ? '이름난 마녀' : '이름난 주술사';
  if (M.lore >= 25) return '마을 주술사';
  return '풋내기 주술사';
};

/* ---------- 상태 ---------- */
const freshMe = () => ({
  lore: 0, known: {}, teacher: null, look: {}, fame: 0, fraud: 0, clients: 0, hexes: 0, mark: null, lineage: null, gran: false, seenHut: 0,
  studyAt: -99, clientAt: -99, lessonAt: -99, scornAt: -99, huntAt: -99, gotAt: -99, hutAt: -99, log: [],
});
export const fresh = () => ({ seq: 1, wise: [], hunts: [], heat: {}, huntAt: {}, log: [], me: freshMe(), tally: { hunts: 0, burned: 0, saved: 0, born: 0, died: 0 } });
export const WS = (g) => (g.witch ??= fresh());
export function fill(g) {
  const W = WS(g);
  W.seq ??= 1; W.wise ??= []; W.hunts ??= []; W.heat ??= {}; W.huntAt ??= {}; W.log ??= [];
  W.tally = Object.assign({ hunts: 0, burned: 0, saved: 0, born: 0, died: 0 }, W.tally ?? {});
  W.me = Object.assign(freshMe(), W.me ?? {});
  W.me.known ??= {}; W.me.look ??= {};
  return W;
}
export const liveWise = (g) => WS(g).wise.filter((w) => !w.gone);
export const wiseAt = (g, pl) => liveWise(g).find((w) => w.place === pl) ?? null;
export const wiseById = (g, id) => WS(g).wise.find((w) => w.id === id) ?? null;
export const wiseName = (w) => `${w.line}의 ${w.name}`;
export const knows = (g) => Object.keys(WS(g).me.known);
export const isWitch = (g) => WS(g).me.lore >= 10 || knows(g).length >= 2;
export function wlog(g, text) {
  const W = WS(g);
  W.log.push({ y: g.date.year, m: g.date.month, text });
  if (W.log.length > 40) W.log.splice(0, W.log.length - 40);
}
export function mlog(g, text) {
  const M = WS(g).me;
  M.log.push({ y: g.date.year, m: g.date.month, text });
  if (M.log.length > 20) M.log.splice(0, M.log.length - 20);
}
export const lookAt = (g, pl = here(g)) => WS(g).me.look[pl] ?? 50;
export const addLook = (g, n, pl = here(g)) => { const M = WS(g).me; M.look[pl] = clamp((M.look[pl] ?? 50) + n, 0, 100); };
