// 생산직의 깊이: 농사·요리·대장일·약초·장사를 하나의 삶으로.
// - 상태는 game.craft. 일자리 자체(어디서 누구 밑에서 일하나)는 jobs.js의 game.life.job을 그대로 쓴다.
// - 계절과 세상 형편(빵값, 전쟁, 역병, 기술 시대)이 일의 벌이를 바꾼다.
// - 솜씨 단계는 견습 → 숙련 → 장인 → 명장 (jobs.js의 GRADES).
import { HOOKS } from '../hooks.js';
import { L } from '../adventure/core.js';
import { atWar, eraOf, priceIndex } from '../world.js';
import { J } from '../narrative/text.js';

// 작은따옴표로 감싼 이름 뒤에 조사: Q('새벽빛', '을/를') → '새벽빛'을
export const Q = (name, pair) => `'${name}'${J(name, pair).slice(name.length)}`;

// 다섯 갈래. job: jobs.js의 일 id, skill: 기술 id
export const TRADES = {
  farming: { name: '농사', job: 'farmer', skill: 'farming', stat: 'str', maker: '농부' },
  cooking: { name: '요리', job: 'cook', skill: 'cooking', stat: 'sen', maker: '요리사' },
  smithing: { name: '대장일', job: 'smith', skill: 'smithing', stat: 'str', maker: '대장장이' },
  herbs: { name: '약초', job: 'herbalist', skill: 'herbs', stat: 'sen', maker: '약초사' },
  trade: { name: '장사', job: 'shop', skill: 'trade', stat: 'cha', maker: '상인' },
};
export const tradeOfJob = (jobId) => Object.keys(TRADES).find((t) => TRADES[t].job === jobId) ?? null;
export const myTrade = (g) => tradeOfJob(L(g).job?.id) ?? (g.craft?.shop ? g.craft.shop.trade : null);

export function defaultCraft() {
  return {
    v: 1,
    field: { care: 0, year: null },   // 올해 밭에 들인 손 (봄·여름 일)
    granary: 0,                        // 곳간에 둔 밀 자루
    remedies: 0,                       // 쟁여 둔 약
    fame: {},                          // 갈래별 이름값 0~100
    made: {},                          // 갈래별 만든 횟수
    masterworks: [],                   // 걸작 { trade, name, year, q }
    orders: [],                        // 맡은 납품 의뢰
    famed: {},                         // 이름난 장인이 된 갈래
  };
}
export function C(g) {
  if (!g.craft) g.craft = defaultCraft();
  return g.craft;
}

HOOKS.newGame.push((g) => { g.craft = defaultCraft(); });
HOOKS.migrate.push((g) => {
  const d = defaultCraft();
  g.craft = Object.assign(d, g.craft ?? {});
  g.craft.field = Object.assign(d.field, g.craft.field);
  if (g.player?.skills && g.player.skills.smithing == null) g.player.skills.smithing = 0;
});
HOOKS.newGame.push((g) => { if (g.player?.skills && g.player.skills.smithing == null) g.player.skills.smithing = 0; });

/* ---------- 계절 ---------- */
export const SEASONS = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
export const season = (g) => SEASONS[g.date.month - 1];

/* ---------- 솜씨 ---------- */
export const gradeOf = (v) => (v < 30 ? 0 : v < 55 ? 1 : v < 80 ? 2 : 3);
export const skillOf = (g, trade) => g.player.skills[TRADES[trade].skill] ?? 0;

// 한 번 만든 것의 품질: 솜씨 + 재주 + 운
export const QUALITY = ['조악한', '평범한', '좋은', '훌륭한', '걸작'];
export function rollQuality(g, rng, trade, bonus = 0) {
  const T = TRADES[trade];
  const v = skillOf(g, trade) + g.player.stats[T.stat] / 5 + bonus + rng.normal(0, 11) - (g.player.fatigue > 70 ? 10 : 0);
  // 걸작은 장인 이상만, 아주 드물게 (평생 한두 번)
  const sk = skillOf(g, trade);
  if (sk >= 60 && v >= 92 && rng.chance(0.006 + (sk - 60) / 4000)) return 4;
  return v < 22 ? 0 : v < 45 ? 1 : v < 66 ? 2 : 3;
}

/* ---------- 세상 형편: 이 일이 지금 얼마나 벌리나 ---------- */
// 1이 평년. 이유를 함께 돌려준다 (화면과 글에 쓴다).
export function demand(g, trade) {
  const s = season(g);
  const bread = priceIndex(g);
  const war = atWar(g);
  const era = eraOf(g);
  const w = g.world ?? {};
  let v = 1;
  const why = [];
  if (trade === 'farming') {
    v *= Math.min(1.8, bread);
    if (bread > 1.2) why.push('밀값이 비싸다');
    else if (bread < 0.9) why.push('밀값이 싸다');
  } else if (trade === 'cooking') {
    if (bread > 1.2) { v *= 0.85; why.push('재료값이 올랐다'); }
    if (s === '가을') { v *= 1.15; why.push('추수 잔치 철이다'); }
    if (w.famine) { v *= 0.8; why.push('흉년이라 사 먹는 사람이 줄었다'); }
  } else if (trade === 'smithing') {
    if (war) { v *= 1.4; why.push('전쟁 중이라 칼과 창이 모자라다'); }
    if (s === '봄') { v *= 1.1; why.push('농기구를 고치는 철이다'); }
    if (era >= 1) v *= 1.05;
  } else if (trade === 'herbs') {
    if (w.plague) { v *= 1.7; why.push('역병이 돌아 약이 귀하다'); }
    if (s === '겨울') { v *= 0.75; why.push('겨울이라 캘 풀이 없다'); }
    else if (s === '봄' || s === '여름') { v *= 1.1; }
    if (war) { v *= 1.15; why.push('전쟁터에서 고약을 찾는다'); }
  } else if (trade === 'trade') {
    if (war) { v *= 1.2; why.push('전쟁으로 물건이 귀해 값이 뛴다'); }
    if (bread > 1.3) { v *= 0.9; why.push('사람들이 지갑을 닫았다'); }
    if (era >= 1) { v *= 1.1; why.push('마도구가 새로 팔린다'); }
  }
  return { v, why };
}
export const demandWord = (v) => (v >= 1.35 ? '아주 잘 팔린다' : v >= 1.1 ? '잘 팔린다' : v >= 0.9 ? '평년과 같다' : v >= 0.75 ? '잘 안 팔린다' : '거의 안 팔린다');

/* ---------- 이름값 ---------- */
export const fameOf = (g, trade) => C(g).fame[trade] ?? 0;
export function addFame(g, trade, n) {
  const c = C(g);
  const cur = c.fame[trade] ?? 0;
  // 높아질수록 더 오르기 어렵다
  c.fame[trade] = Math.max(0, Math.min(100, cur + (n > 0 ? n * Math.max(0.1, 1 - cur / 110) : n)));
  return c.fame[trade];
}
export const FAME_WORD = (v) => (v >= 70 ? '왕국에 이름이 난' : v >= 45 ? '고장에 이름이 난' : v >= 20 ? '단골이 있는' : '아직 이름 없는');

// 화면용 한 묶음 (도우미스레드1이 공방·가게 화면에 쓴다)
export function craftStatus(g) {
  const trade = myTrade(g);
  if (!trade) return null;
  const c = C(g);
  const d = demand(g, trade);
  const sk = skillOf(g, trade);
  return {
    trade, name: TRADES[trade].name, maker: TRADES[trade].maker,
    grade: ['견습', '숙련', '장인', '명장'][gradeOf(sk)], skill: Math.round(sk),
    fame: Math.round(fameOf(g, trade)), fameWord: FAME_WORD(fameOf(g, trade)),
    season: season(g), demand: d.v, demandWord: demandWord(d.v), why: d.why,
    orders: c.orders.map((o) => ({ title: o.title, done: o.done, need: o.need, due: o.due, minQ: QUALITY[o.minQ] })),
    masterworks: c.masterworks.filter((m) => m.trade === trade).map((m) => m.name),
    granary: c.granary, remedies: c.remedies, field: trade === 'farming' ? c.field.care : null,
    shop: c.shop ?? null,
  };
}
