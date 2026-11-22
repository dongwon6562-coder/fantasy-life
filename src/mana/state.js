// 마나의 흐름. 상태는 g.mana 하나.
//   대륙의 마나(tide, -100~100)는 고르지 않고 수십 년 주기로 출렁인다. 짙은 해에는 마물이 늘고, 마력을 타고나는 아이가 많아지고,
//   마석이 흔해져 마도구 재료값이 내린다. 옅은 해에는 거꾸로. 시대가 바뀌어 마석 방아가 돌면 샘이 조금씩 마른다.
//   마나 샘 일곱(고장에 붙어 있다, 새 고장 id 없음)은 저마다 물줄기(flow)와 주인(holder)이 있고, 주인은 다툼으로 바뀐다.
//   짙은 해에는 샘 근처에 마나 폭풍이 인다. 샘물을 너무 자주 마시면 마나 중독이 된다. 샘을 지키는 샘지기가 있다.
//
//   { tide, phase, period(달), amp, noise, years{해: 그해 마나}, wells{ id: { flow, holder, guard, dry, storms, seized } },
//     storm{ well, place, left } | null, low(옅은 해 소식을 냈나), high, me{ poison, draws, lastDraw, warden(샘 id | null), wardenM, storms, defended, crave, kids }, log[] }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { ITEMS } from '../tower/state.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';

// 샘을 쥐는 쪽
export const HOLDERS = {
  wardens: { name: '샘지기', desc: '어느 나라에도 속하지 않고 샘 곁에 사는 오래된 무리. 샘물을 아무에게나 퍼 주지 않는다.' },
  tower: { name: '마탑', desc: '마탑이 샘에 돌담을 두르고 연구원을 들였다. 마석을 캐고 장부에 적는다.' },
  church: { name: '성광교 교단', desc: '교단이 샘을 성수라 부르고 순례자에게 잔당 값을 받는다.' },
  lord: { name: '그 고장 영주', desc: '영주가 샘에 병사를 세우고 마석 캐는 사람에게 세를 받는다.' },
  dwarf: { name: '드워프 장로회', desc: '드워프들이 샘을 땅 밑 대장간에 끌어다 쓴다.' },
  rogue: { name: '떠돌이 술사들', desc: '이름 없는 술사 무리가 샘을 차지하고 마나를 들이켠다. 눈이 검게 물든 자가 많다.' },
  me: { name: '나', desc: '내가 지키는 샘.' },
};
// 마나 샘 일곱. base: 그 샘이 원래 얼마나 센가.
export const WELLS = {
  wl_serenia: { name: '탑 아래 푸른 샘', place: 'serenia', base: 15, holder: 'tower', desc: '세레니아 마탑 지하에서 솟는 샘. 마탑이 이 샘 위에 세워졌다는 말이 있다.' },
  wl_silver: { name: '물푸레 고목 샘', place: 'silverleaf', base: 8, holder: 'wardens', desc: '천 년 된 물푸레 뿌리 사이로 솟는 샘. 엘프 샘지기들이 대대로 지킨다.' },
  wl_solaris: { name: '금빛 성수 샘', place: 'solaris', base: 5, holder: 'church', desc: '금빛 대성당 회랑 밑의 샘. 교단은 여신의 눈물이라 부른다.' },
  wl_gorge: { name: '구렁목 깊은 샘', place: 'gorge', base: 12, holder: 'dwarf', desc: '미궁 도시 맨 밑바닥, 마석 광맥이 갈라진 틈에서 솟는 샘.' },
  wl_graubel: { name: '잿돌 고개 샘', place: 'graubel', base: 0, holder: 'lord', desc: '성채 뒤 고개의 바위틈 샘. 변경백 병사들이 지킨다. 마물이 자주 꼬인다.' },
  wl_verden: { name: '은광 밑 샘', place: 'verden', base: -5, holder: 'wardens', desc: '버려진 은광 갱도 끝에서 솟는 작은 샘. 늙은 샘지기 몇이 갱도 입구에 산다.' },
  wl_estella: { name: '폐허의 검은 샘', place: 'estella', base: 18, holder: 'rogue', desc: '에스텔라 옛 왕궁 지하의 샘. 마신 전쟁 때 무언가가 이 샘에 빠졌다고 한다.' },
};
export const WELL_IDS = Object.keys(WELLS);
export const wellAt = (pl) => WELL_IDS.find((id) => WELLS[id].place === pl) ?? null;

export const tideWord = (t) => (t >= 60 ? '마나가 넘친다' : t >= 25 ? '마나가 짙다' : t > -25 ? '마나가 고르다' : t > -60 ? '마나가 옅다' : '마나가 말랐다');
export const flowWord = (f, dry) => (dry ? '말랐다' : f >= 80 ? '넘쳐흐른다' : f >= 55 ? '세차다' : f >= 30 ? '고르게 솟는다' : f >= 12 ? '가늘다' : '거의 말랐다');
export const poisonWord = (v) => (v >= 70 ? '핏줄이 푸르게 비치고 손끝이 떨린다' : v >= 40 ? '밤마다 귀에서 물소리가 난다' : v >= 15 ? '가끔 혀끝에 쇠 맛이 돈다' : '');
export const guardWord = (v) => (v >= 70 ? '굳게 지킨다' : v >= 40 ? '지키는 사람이 있다' : '허술하다');

// 마도구 재료값: 마나가 짙으면 마석이 흔해 싸고, 옅으면 귀해 비싸다. 탑의 마도구 표(ITEMS)는 처음 값에 배율을 곱해 판마다 다시 맞춘다.
let BASE = null;
export const costMul = (t) => clamp(1 - t * 0.0035, 0.75, 1.35);
export const sellMul = (t) => clamp(1 - t * 0.002, 0.85, 1.2);
export function syncMana(g) {
  if (!BASE) BASE = Object.fromEntries(Object.entries(ITEMS).map(([id, it]) => [id, { cost: it.cost, sell: it.sell }]));
  // 34단계: 마석 고갈 걱정(g.later.deplete)이 크면 마나가 옅은 해처럼 비싸다
  const t = (g?.mana?.tide ?? 0) - (g?.later?.deplete ?? 0) * 0.4;
  for (const [id, b] of Object.entries(BASE)) {
    if (!ITEMS[id]) continue;
    ITEMS[id].cost = Math.max(1, Math.round(b.cost * costMul(t)));
    ITEMS[id].sell = Math.max(1, Math.round(b.sell * sellMul(t)));
  }
}

const freshMe = () => ({ poison: 0, draws: 0, lastDraw: -99, warden: null, wardenM: 0, awayM: 0, storms: 0, defended: 0, crave: 0, kids: 0 });
const freshWell = (id) => ({ flow: clamp(50 + WELLS[id].base, 5, 95), holder: WELLS[id].holder, guard: 50, dry: false, storms: 0, seized: 0 });
export function fresh(rng) {
  const r = rng ?? { float: (a, b) => (a + b) / 2, int: (a) => a };
  return {
    tide: 0, phase: r.float(0, Math.PI * 2), period: r.int(12 * 28, 12 * 48), amp: r.float(40, 75), noise: 0, years: {},
    wells: Object.fromEntries(WELL_IDS.map((id) => [id, freshWell(id)])), storm: null, low: false, high: false, me: freshMe(), log: [],
  };
}
export const MS = (g) => (g.mana ??= fresh());
export function mlog(g, text) {
  const S = MS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 40) S.log.splice(0, S.log.length - 40);
}
function fill(g) {
  const S = MS(g), d = fresh();
  for (const k of ['tide', 'phase', 'period', 'amp', 'noise']) if (!Number.isFinite(S[k])) S[k] = d[k];
  S.years ??= {}; S.log ??= []; S.wells ??= {};
  S.me = Object.assign(freshMe(), S.me ?? {});
  for (const id of WELL_IDS) S.wells[id] = Object.assign(freshWell(id), S.wells[id] ?? {});
  for (const id of Object.keys(S.wells)) if (!WELLS[id]) delete S.wells[id];
  for (const w of Object.values(S.wells)) { if (!HOLDERS[w.holder]) w.holder = 'wardens'; if (!Number.isFinite(w.flow)) w.flow = 40; if (!Number.isFinite(w.guard)) w.guard = 50; }
  if (S.me.warden && !WELLS[S.me.warden]) S.me.warden = null;
  if (S.storm && !WELLS[S.storm.well]) S.storm = null;
  if (!Number.isFinite(S.me.poison)) S.me.poison = 0;
}
// 처음 마나는 주기의 어디쯤에서 시작한다 (새 판마다 다르게, 게임 난수는 건드리지 않는다)
HOOKS.newGame.push((g) => {
  let s = (g.rngState?.s ?? 7) ^ 0x2f6b1d3;
  const next = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  g.mana = fresh({ float: (a, b) => a + (b - a) * next(), int: (a, b) => Math.floor(a + (b - a + 1) * next()) });
  g.mana.tide = Math.round(g.mana.amp * Math.sin(g.mana.phase));
  g.mana.years[g.date.year] = g.mana.tide;
  syncMana(g);
});
HOOKS.migrate.push((g) => { fill(g); syncMana(g); });
