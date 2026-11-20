// 요리사의 길: 상태와 도우미.
// - 요리 솜씨는 craft의 cooking 기술 하나를 그대로 쓴다. 여관 요리사(jobs의 cook)·빵집·여관 부엌(inn)은 그대로 두고,
//   여기서는 그 위에 얹는다: 고장마다 다른 맛 익히기, 내 요리 짓기, 귀족·궁정 부엌의 서열, 요리 겨루기, 연회, 독살 의심과 시식관,
//   이름난 요리가 대를 넘어 남기.
// - 세상에는 플레이어 없이도 이름난 요리사와 요리가 생기고 잊힌다(world).
// 상태는 game.cuisine 하나: { palate, post, dishes, taster, fame, rival, world, log, ... }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';

export const mi = (g) => g.date.year * 12 + g.date.month;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const here = (g) => L(g).place;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const free = (g) => !L(g).travel && !isJailed(g) && !g.explore?.exp && !g.army?.campaign && !g.army?.captive && !g.over;
export const stat = (g, id) => g.player.stats[id] ?? 0;
export const cookSkill = (g) => g.player.skills?.cooking ?? 0;
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 83) ^ Math.imul(mi(g) * 97 + salt + 41, 2654435761)) | 0 });
export const isPlace = (pl) => !!PLACES[pl] && !PLACES[pl].hidden && (PLACES[pl].house ?? 0) > 0;
export const bigTown = (pl) => (PLACES[pl]?.house ?? 0) >= 280;

// 고장의 맛: 그 고장에서만 나는 재료와 맛의 결
export const TASTE = {
  ern: { ing: '산나물과 사슴고기', short: '에른', taste: '숲 냄새 나는 투박한 맛', line: '장작불에 오래 끓인 사슴 스튜와 쑥을 넣은 보리빵.' },
  harfen: { ing: '강 송어', short: '하르펜', taste: '맑고 짭짤한 강가의 맛', line: '강 송어를 소금에 절여 훈연한다. 장터마다 연기가 오른다.' },
  verden: { ing: '보리와 흑맥주', short: '베르덴', taste: '쌉싸름하고 묵직한 맛', line: '흑맥주에 졸인 돼지 정강이. 양조장 골목에서 먹는다.' },
  leocast: { ing: '먼 바다의 향신료', short: '왕도', taste: '화려하고 겹겹이 쌓인 맛', line: '귀족들은 정향과 육두구를 아끼지 않는다. 접시가 그림 같다.' },
  gruental: { ing: '양젖 치즈', short: '그륀탈', taste: '고소하고 시큼한 들판의 맛', line: '동굴에서 묵힌 양젖 치즈를 빵에 녹여 먹는다.' },
  eisen: { ing: '훈제 소시지', short: '아이젠베르크', taste: '단단하고 기름진 제국의 맛', line: '제국 사람들은 소시지 하나에도 법도가 있다. 겨자는 꼭 둘.' },
  solaris: { ing: '꿀과 무화과', short: '솔라리스', taste: '단정하고 달콤한 성도의 맛', line: '수도원에서 빚은 꿀술과 무화과 과자. 금식 날에는 아무것도 없다.' },
  serenia: { ing: '푸른 소금과 호수 장어', short: '세레니아', taste: '서늘하고 묘한 맛', line: '마탑 사람들은 늦게 먹고 적게 먹는다. 장어 요리만은 예외다.' },
  barka: { ing: '사막 고추와 대추야자', short: '바르카', taste: '맵고 뜨거운 남쪽의 맛', line: '혀가 타는 고추 소스에 대추야자를 곁들인다. 물은 나중에 준다.' },
  graubel: { ing: '보리죽과 말린 고기', short: '그라우벨', taste: '배를 채우는 성채의 맛', line: '병사들의 냄비 요리. 맛보다 양이고, 양보다 따뜻함이다.' },
  silverleaf: { ing: '숲 버섯과 이슬 꽃잎', short: '은잎', taste: '가볍고 향이 오래 남는 맛', line: '엘프들은 불을 거의 쓰지 않는다. 날것과 말린 것과 절인 것.' },
  hammer: { ing: '검은 빵과 돌 화덕 고기', short: '쇠망치 골', taste: '진하고 쇠 냄새 도는 맛', line: '드워프의 화덕은 꺼지지 않는다. 고기는 사흘을 굽는다.' },
  fur: { ing: '뿔소 고기와 들풀', short: '털가죽', taste: '피 냄새 나는 날것의 맛', line: '수인들은 고기를 거의 익히지 않는다. 들풀로 비린내를 잡는다.' },
  klein: { ing: '조개와 해초', short: '클라인', taste: '비리고 시원한 바닷가 맛', line: '어부 아낙들이 솥 하나에 그날 잡은 것을 다 넣는다.' },
  portel: { ing: '올리브와 포도주', short: '포르텔', taste: '기름지고 느긋한 항구의 맛', line: '항구 주점마다 포도주에 졸인 문어를 낸다.' },
  saltmare: { ing: '소금에 절인 대구', short: '살트마레', taste: '짜고 오래가는 뱃사람의 맛', line: '긴 항해를 버티는 절인 대구. 물에 사흘 불려야 먹는다.' },
  saltrock: { ing: '바위 소금과 갈매기 알', short: '소금바위섬', taste: '거칠고 짠 섬의 맛', line: '섬사람들은 바위에서 소금을 긁고 갈매기 알을 줍는다.' },
  gorge: { ing: '동굴 이끼와 눈먼 물고기', short: '구렁목', taste: '흙냄새 나는 땅 밑의 맛', line: '빛이 닿지 않는 물에서 잡은 물고기는 뼈까지 하얗다.' },
};
export const tasteOf = (pl) => TASTE[pl] ?? null;

// 요리의 틀: 필요한 솜씨, 이름 짓는 말
export const BASES = {
  stew: { name: '스튜', need: 20, line: '오래 끓여 깊은 맛을 냈다' },
  roast: { name: '구이', need: 25, line: '불 조절 하나에 모든 것을 걸었다' },
  pie: { name: '파이', need: 35, line: '반죽과 속이 함께 익도록 화덕 앞을 지켰다' },
  soup: { name: '맑은 국', need: 40, line: '기름 한 방울 뜨지 않게 맑게 걸렀다' },
  sauce: { name: '소스 요리', need: 55, line: '사흘을 졸여 소스 한 국자를 얻었다' },
  sweet: { name: '과자', need: 45, line: '은값인 설탕을 녹여 실처럼 뽑았다' },
};
export const BASE_IDS = Object.keys(BASES);

// 부엌 자리: 영주 저택과 궁정
export const POSTS = {
  manor: { name: '영주 저택 부엌', ranks: ['부엌 견습', '부주방장', '주방장'], wage: [2, 5, 9], need: [20, 40, 60] },
  court: { name: '궁정 부엌', ranks: ['궁정 부엌 견습', '궁정 부주방장', '궁정 주방장'], wage: [4, 9, 16], need: [45, 65, 80] },
};
export const COURT = 'leocast';
export const postTitle = (p) => (p ? POSTS[p.kind].ranks[p.rank] : null);

// 세상의 요리사 (플레이어 없이 이름이 났다 잊힌다)
const CHEFS = ['늙은 주방장 마르타', '외팔이 요리사 겔트', '제국에서 온 요리사 프란츠', '수도원 주방의 수사 오도', '항구의 요리사 니나', '사막 요리사 하심', '드워프 화덕장 보린', '과부 요리사 엘케'];
export const chefName = (rng) => rng.pick(CHEFS);
const RIVALS = ['젊은 요리사 레온', '궁정 부주방장 아델', '제국 요리사 클라우스', '재주 많은 오스발트', '은잎에서 온 셀레네'];
export const rivalName = (rng) => rng.pick(RIVALS);
const TASTERS = ['말수 적은 하인 오토', '고아 출신 소년 핀', '전직 병사 루츠', '늙은 시녀 그레타', '쌍둥이 형 얀'];
export const tasterName = (rng, not = null) => rng.pick(TASTERS.filter((n) => n !== not));

function fresh() {
  return {
    palate: {}, post: null, dishes: [], taster: null, fame: 0, rival: null, world: [], past: [],
    log: [], seq: 1, eventAt: 0, contestAt: 0, feastAt: 0, worldAt: 0, won: 0, lostC: 0, feasts: 0, served: 0, worked: 0,
  };
}
export const CU = (g) => (g.cuisine ??= fresh());
export const palateCount = (g) => Object.keys(CU(g).palate).length;
export const knows = (g, pl) => !!CU(g).palate[pl];
export const atPost = (g) => !!CU(g).post && CU(g).post.place === here(g) && !L(g).travel;
export const famous = (d) => d.fame >= 60;
export const dishWord = (d) => (d.fame >= 80 ? '온 나라가 아는 요리' : d.fame >= 60 ? '이름난 요리' : d.fame >= 30 ? '찾는 사람이 있는 요리' : d.fame >= 10 ? '아는 사람만 아는 요리' : '아직 아무도 모르는 요리');
export const fameWord = (v) => (v >= 80 ? '나라 안 최고의 요리사' : v >= 55 ? '이름난 요리사' : v >= 30 ? '솜씨 좋다는 소문' : v >= 10 ? '아는 사람은 아는 요리사' : '이름 없는 요리사');
// 요리하는 힘: 솜씨, 익힌 맛의 넓이, 이름값
export const cookPower = (g) => cookSkill(g) + Math.min(10, palateCount(g)) * 1.5 + CU(g).fame * 0.1;
export const dishName = (base, pl) => `${TASTE[pl]?.short ?? '이름 없는'}식 ${BASES[base]?.name ?? '요리'}`;
export const fullDish = (d) => (d.title ? `'${d.title}'` : dishName(d.base, d.place));
// 요리 이름 + 조사 (따옴표가 붙은 이름도 받침에 맞게)
export const dj = (d, pair) => (d.title ? `'${d.title}'${J(d.title, pair).slice(d.title.length)}` : J(dishName(d.base, d.place), pair));
export const addFame = (g, n) => { const s = CU(g); s.fame = clamp(s.fame + n, 0, 100); };

export function logCook(g, text) {
  const s = CU(g);
  s.log.unshift({ y: g.date.year, m: g.date.month, text });
  if (s.log.length > 24) s.log.length = 24;
}
export function newDish(g, base, pl, q) {
  const s = CU(g);
  return { id: s.seq++, base, place: pl, q: Math.round(clamp(q, 1, 100)), fame: 0, born: mi(g), by: g.player.name, gen: 1, title: null, served: 0 };
}
export const bestDish = (g) => CU(g).dishes.slice().sort((a, b) => b.q + b.fame * 0.5 - (a.q + a.fame * 0.5))[0] ?? null;
export const leavePost = (g, how) => {
  const s = CU(g); if (!s.post) return;
  s.past.unshift({ year: g.date.year, what: `${placeName(s.post.place)} ${postTitle(s.post)}`, how });
  if (s.past.length > 6) s.past.length = 6;
  logCook(g, `${J(`${placeName(s.post.place)} ${POSTS[s.post.kind].name}`, '을/를')} 떠났다. ${how}`);
  s.post = null;
  if (s.taster) s.taster = null;
};

HOOKS.newGame.push((g) => { g.cuisine = fresh(); });
HOOKS.migrate.push((g) => {
  const s = Object.assign(fresh(), g.cuisine && typeof g.cuisine === 'object' ? g.cuisine : {});
  for (const k of ['log', 'dishes', 'world', 'past']) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of ['seq', 'eventAt', 'contestAt', 'feastAt', 'worldAt', 'won', 'lostC', 'feasts', 'served', 'worked', 'fame']) if (!Number.isFinite(s[k])) s[k] = k === 'seq' ? 1 : 0;
  s.fame = clamp(s.fame, 0, 100);
  if (!s.palate || typeof s.palate !== 'object' || Array.isArray(s.palate)) s.palate = {};
  for (const k of Object.keys(s.palate)) if (!TASTE[k] || !Number.isFinite(s.palate[k])) delete s.palate[k];
  s.dishes = s.dishes.filter((d) => d && typeof d === 'object' && BASES[d.base] && TASTE[d.place]);
  for (const d of s.dishes) {
    for (const k of ['id', 'q', 'fame', 'born', 'gen', 'served']) if (!Number.isFinite(d[k])) d[k] = k === 'id' ? s.seq++ : k === 'gen' ? 1 : k === 'q' ? 20 : 0;
    d.q = clamp(d.q, 1, 100); d.fame = clamp(d.fame, 0, 100);
    if (typeof d.by !== 'string') d.by = g.player?.name ?? '이름 모를 요리사';
    if (d.title != null && typeof d.title !== 'string') d.title = null;
  }
  if (s.dishes.length > 6) s.dishes.length = 6;
  const p = s.post;
  if (p && (typeof p !== 'object' || !POSTS[p.kind] || !isPlace(p.place))) s.post = null;
  if (s.post) {
    for (const k of ['rank', 'favor', 'months', 'since', 'away']) if (!Number.isFinite(p[k])) p[k] = 0;
    p.rank = clamp(Math.round(p.rank), 0, 2); p.favor = clamp(p.favor, 0, 100);
    if (typeof p.lord !== 'string') p.lord = p.kind === 'court' ? '국왕' : '영주';
  }
  if (s.taster && (typeof s.taster !== 'object' || typeof s.taster.name !== 'string')) s.taster = null;
  if (s.taster) for (const k of ['months', 'loyal']) if (!Number.isFinite(s.taster[k])) s.taster[k] = k === 'loyal' ? 50 : 0;
  if (s.taster && !s.post) s.taster = null;
  if (s.rival && (typeof s.rival !== 'object' || typeof s.rival.name !== 'string' || !Number.isFinite(s.rival.grudge))) s.rival = null;
  s.world = s.world.filter((w) => w && typeof w.chef === 'string' && typeof w.dish === 'string' && Number.isFinite(w.year)).slice(0, 8);
  g.cuisine = s;
});
