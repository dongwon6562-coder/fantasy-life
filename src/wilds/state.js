// 마물의 땅. 상태는 g.wilds 하나.
//   land{ 고장: { level(0~100, 마물이 얼마나 들끓나), nest(null | { kind, size(1~10), at }), high(level 75 넘은 달 수) } }
//   hamlets{ id: { pop(0~100), state('lived' | 'abandoned' | 'returning'), since, stake(내가 돈을 보탰나) } }
//   herds[]: 떼의 이동 { kind, from, to, at }   bounties[]: 사냥꾼 길드 현상금 { id, place, kind, reward, until, nest }
//   drift{ kind: 부산물 시세 흔들림 }   supply{ kind: 그 마물이 사는 땅의 평균 level }   seen[]: 세상에 나타난 마물
//   parts{ kind: 가진 부산물 수 }   rec{ hunts, kills, nests, sold, bounties, reclaimed, lost }   seq, log[]
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';

// 마물: 힘, 사는 땅, 나타나는 시대, 부산물과 값, 처음 나타날 때의 소식
//   min: 고장의 마물 기세가 이만큼은 되어야 보인다 (센 놈일수록 높다)
export const KINDS = {
  goblin: { name: '고블린', pow: 18, lands: ['forest', 'hills', 'plains'], era: 0, min: 0, part: '고블린 귀', price: 2, herd: '고블린 무리' },
  harpy: { name: '하피', pow: 28, lands: ['coast', 'mountain'], era: 0, min: 15, part: '하피 깃털', price: 9, herd: '하피 떼' },
  ghoul: { name: '구울', pow: 26, lands: ['ruins'], era: 0, min: 10, part: '구울 발톱', price: 6, herd: '구울 무리' },
  direwolf: { name: '마랑', pow: 32, lands: ['forest', 'plains', 'mountain'], era: 0, min: 20, part: '마랑 가죽', price: 12, herd: '마랑 떼' },
  orc: { name: '오크', pow: 38, lands: ['mountain', 'hills', 'ruins'], era: 0, min: 30, part: '오크 엄니', price: 10, herd: '오크 전투단' },
  troll: { name: '트롤', pow: 50, lands: ['forest', 'mountain'], era: 0, min: 45, part: '트롤 피', price: 26, herd: '트롤 일족' },
  wyvern: { name: '와이번', pow: 62, lands: ['mountain', 'coast'], era: 0, min: 55, part: '와이번 비늘', price: 42, herd: '와이번 무리' },
  basilisk: { name: '바실리스크', pow: 70, lands: ['ruins', 'deep'], era: 0, min: 65, part: '바실리스크 눈', price: 60, herd: '바실리스크 한 쌍' },
  // 시대가 바뀌며 새로 나타나는 마물
  iron_eater: { name: '쇠먹이 벌레', pow: 35, lands: ['mountain', 'deep', 'hills'], era: 1, min: 20, part: '쇠먹이 껍질', price: 20, herd: '쇠먹이 벌레 떼', first: '광산 갱도에서 쇳덩이를 갉아 먹는 벌레가 나왔다고 한다. 마도구 화로의 마석 냄새를 따라 올라왔다는 말이 돈다.' },
  mana_hound: { name: '마석 들개', pow: 45, lands: ['plains', 'forest'], era: 2, min: 30, part: '마석 이빨', price: 34, herd: '마석 들개 떼', first: '버린 마석 찌꺼기를 먹고 자란 들개가 나타났다. 이빨이 푸르게 빛나고, 마도구 수레를 노린다고 한다.' },
  chimera: { name: '키메라', pow: 75, lands: ['ruins', 'forest', 'mountain'], era: 3, min: 60, part: '키메라 심장', price: 90, herd: '키메라', first: '마도 공방에서 빠져나간 것이 숲에 산다는 소문이다. 사자의 머리에 뱀의 꼬리. 누가 만들었는지 아무도 말하지 않는다.' },
};
export const KIND_IDS = Object.keys(KINDS);

// 고장의 땅 모양과 마물이 드는 기세(base). 큰 도시는 성벽과 경비대가 있어 낮다.
export const LANDS = {
  ern: { lands: ['forest', 'plains'], base: 0 },
  harfen: { lands: ['plains', 'forest'], base: -5 },
  verden: { lands: ['forest', 'mountain'], base: 5 },
  leocast: { lands: ['plains'], base: -15 },
  gruental: { lands: ['plains', 'hills'], base: 0 },
  estella: { lands: ['ruins', 'forest'], base: 30 },
  eisen: { lands: ['plains', 'mountain'], base: -15 },
  solaris: { lands: ['plains', 'hills'], base: -10 },
  serenia: { lands: ['forest', 'ruins'], base: -8 },
  barka: { lands: ['coast', 'plains'], base: -5 },
  graubel: { lands: ['mountain', 'ruins'], base: 20 },
  silverleaf: { lands: ['forest'], base: -5 },
  hammer: { lands: ['mountain', 'deep'], base: 8 },
  fur: { lands: ['plains', 'forest'], base: 10 },
  klein: { lands: ['coast'], base: 0 },
  portel: { lands: ['coast'], base: -8 },
  saltmare: { lands: ['coast'], base: 5 },
  crow: { lands: ['coast'], base: 10 },
  saltrock: { lands: ['coast'], base: 0 },
  gorge: { lands: ['mountain', 'deep'], base: 25 },
};
export const WILD_PLACES = Object.keys(LANDS);

// 고장 둘레의 작은 마을들. 마물이 들끓으면 사람이 떠나고, 잠잠해지면 다시 들어온다.
export const HAMLETS = {
  hazel: { name: '개암나무골', near: 'ern' },
  mill: { name: '물레방아 마을', near: 'harfen' },
  charcoal: { name: '숯가마 마을', near: 'verden' },
  vineend: { name: '포도밭 끝 마을', near: 'gruental' },
  beacon: { name: '봉화대 마을', near: 'graubel' },
  trapper: { name: '덫사냥꾼 야영지', near: 'fur' },
  clam: { name: '조개잡이 마을', near: 'klein' },
  oldmine: { name: '옛 광부촌', near: 'hammer' },
  farmstead: { name: '제국 둔전', near: 'eisen' },
  pilgrim: { name: '순례자 쉼터', near: 'solaris' },
};
export const hamletsNear = (pl) => Object.entries(HAMLETS).filter(([, h]) => h.near === pl).map(([id]) => id);

// 부산물을 비싸게 사는 곳
export const BUYERS = { serenia: 1.35, leocast: 1.15, eisen: 1.15, barka: 1.1, portel: 1.05, hammer: 1.1, gorge: 1.0, solaris: 1.05, harfen: 1.0, verden: 0.95, graubel: 1.0, fur: 0.9, klein: 0.85, gruental: 0.8, ern: 0.7, silverleaf: 1.1, saltmare: 0.9 };

export const levelWord = (v) => (v >= 80 ? '마물이 들끓는다' : v >= 60 ? '마물이 잦다' : v >= 40 ? '마물이 이따금 나온다' : v >= 20 ? '조용한 편이다' : '마물 걱정이 없다');

export const WS = (g) => (g.wilds ??= fresh(g));
const freshRec = () => ({ hunts: 0, kills: 0, nests: 0, sold: 0, bounties: 0, reclaimed: 0, lost: 0 });
export function fresh(g) {
  const base = g?.realm?.monsters ?? 30;
  const land = {};
  for (const [pl, L] of Object.entries(LANDS)) land[pl] = { level: clamp(Math.round(base * 0.7 + L.base + 4), 0, 100), nest: null, high: 0 };
  const hamlets = {};
  for (const id of Object.keys(HAMLETS)) hamlets[id] = { pop: 60, state: 'lived', since: 0, stake: false };
  return { land, hamlets, herds: [], bounties: [], drift: {}, supply: {}, seen: KIND_IDS.filter((k) => KINDS[k].era === 0), parts: {}, rec: freshRec(), seq: 1, log: [] };
}
export function wlog(g, text) {
  const S = WS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export const levelAt = (g, pl) => WS(g).land[pl]?.level ?? 0;
export const eraNow = (g) => g.realm?.era ?? 0;
// 이 고장에 사는 마물 (시대와 기세에 맞는 것), 약한 것부터
export function kindsAt(g, pl) {
  const L = LANDS[pl], lv = levelAt(g, pl), S = WS(g);
  if (!L) return [];
  return KIND_IDS.filter((k) => S.seen.includes(k) && KINDS[k].lands.some((x) => L.lands.includes(x)) && lv >= KINDS[k].min);
}
export function partPrice(g, kind, pl) {
  const K = KINDS[kind], S = WS(g);
  if (!K) return 0;
  const supply = S.supply[kind] ?? 40;
  return Math.max(1, Math.round(K.price * (1.5 - supply / 100) * (1 + (S.drift[kind] ?? 0)) * (BUYERS[pl] ?? 0.9)));
}

HOOKS.newGame.push((g) => { g.wilds = fresh(g); });
HOOKS.migrate.push((g) => {
  const S = WS(g), f = fresh(g);
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const pl of Object.keys(f.land)) S.land[pl] ??= f.land[pl];
  for (const id of Object.keys(f.hamlets)) S.hamlets[id] ??= f.hamlets[id];
  S.rec = Object.assign(freshRec(), S.rec ?? {});
});
