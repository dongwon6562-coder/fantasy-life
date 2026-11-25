// 45단계 나라 사이 흐름 (도우미스레드3): 9단계 politics(관계·동맹·교역·휴전·혼인·신종·전쟁·땅 주인·통치자) 위에 얹는 층.
// 여기서 새로 맡는 것:
//   stance   통치자의 외교 성향. 왕이 바뀌면 새로 정해지고, 새 왕은 옛 조약을 버리기도 한다
//   embargo  무역 봉쇄 [{by, on, since, why}]  by 나라 장터에서 on 나라 물건 값이 뛴다. 국경에서 짐을 뒤진다
//   disputes 국경 다툼 [{a, b, land, heat, since, peak}]  politics LANDS의 다툴 땅 하나를 두고 달아오르고 식는다. 끝까지 가면 전쟁
//   secrets  밀약 [{a, b, against, since, known}]  a가 동맹 against 몰래 b와 손잡는다. 드러나면 배신
//   grudges  나라의 원한 [{a, b, y, why}]  배신당하고 빼앗긴 일은 몇십 년 동안 관계를 끌어내린다
// 끝(누가 이기고 망하나)은 정하지 않는다. politics의 전쟁·땅·왕조가 그대로 판도를 만든다.
import { HOOKS } from '../hooks.js';
import { PS, nations, short, full, rulerOf } from '../politics/state.js';
import { NATURE } from '../politics/data.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export { short, full };

/* ---------- 성향 ---------- */
export const STANCES = {
  hawk: { name: '칼을 먼저 드는', heat: 1.4, embargo: 1.3, trade: 0.7, secret: 0.8, line: '국경 수비대를 두 배로 늘리라는 명이 내려갔다고 한다.' },
  dove: { name: '화친을 바라는', heat: 0.6, embargo: 0.6, trade: 1.2, secret: 0.6, line: '이웃 나라들에 화친의 사절을 보냈다고 한다.' },
  merchant: { name: '장사를 먼저 셈하는', heat: 0.8, embargo: 0.5, trade: 1.6, secret: 0.9, line: '관세를 내리고 상단들을 궁정에 불러들였다고 한다.' },
  zealot: { name: '믿음을 앞세우는', heat: 1.2, embargo: 1.6, trade: 0.7, secret: 0.5, line: '이단의 나라와는 소금 한 줌도 나누지 말라고 했다고 한다.' },
  schemer: { name: '속을 알 수 없는', heat: 1.0, embargo: 1.0, trade: 1.0, secret: 2.2, line: '사절들을 밤에만 만난다는 말이 돈다.' },
};
export const STANCE_IDS = Object.keys(STANCES);
// 나라마다 잘 나오는 성향 (같은 것이 여러 번 나올수록 잘 나온다)
const LEAN = {
  leonia: ['dove', 'merchant', 'hawk', 'schemer'],
  valhart: ['hawk', 'hawk', 'schemer', 'merchant'],
  holy: ['zealot', 'zealot', 'schemer', 'dove'],
  serenia: ['dove', 'schemer', 'merchant'],
  free: ['merchant', 'merchant', 'schemer', 'dove'],
  march: ['hawk', 'dove', 'hawk'],
  elf: ['dove', 'schemer', 'dove'],
  dwarf: ['merchant', 'hawk', 'dove'],
  beast: ['hawk', 'dove', 'hawk', 'zealot'],
  sea: ['schemer', 'merchant', 'hawk'],
};
export const leanOf = (id) => LEAN[id] ?? STANCE_IDS;

// 나라마다 내다 파는 물건 (봉쇄하면 그 물건 값이 뛴다)
export const EXPORTS = {
  leonia: ['grain', 'wool'], valhart: ['iron', 'grain'], holy: ['wine'], serenia: ['manastone'], free: ['silk', 'spice'],
  march: ['fur', 'iron'], elf: ['elfherb'], dwarf: ['dwarfsteel', 'iron'], beast: ['fur'], sea: ['salt', 'spice'],
};
// 나라의 소식이 처음 나는 고장
export const CAPITAL = { leonia: 'leocast', valhart: 'eisen', holy: 'solaris', serenia: 'serenia', free: 'barka', march: 'graubel', elf: 'silverleaf', dwarf: 'hammer', beast: 'fur', sea: 'saltmare' };
export const ARBITERS = ['serenia', 'holy', 'free'];

/* ---------- 상태 ---------- */
export const rulerKey = (g, id) => (id === 'leonia' ? g.realm?.ruler === 'oswald' ? `oswald:${g.realm?.king?.alive ? 1 : 0}` : String(g.realm?.ruler ?? 'oswald') : `${rulerOf(g, id)?.name ?? ''}:${rulerOf(g, id)?.since ?? 0}`);
export function fresh(g) {
  const stance = {}, ruler = {};
  for (const id of nations()) {
    const lean = leanOf(id);
    stance[id] = lean[(Math.abs(hash(id)) + (g?.seed ?? 0)) % lean.length];
    ruler[id] = g?.politics ? rulerKey(g, id) : '';
  }
  return { stance, ruler, embargo: [], disputes: [], secrets: [], grudges: [], log: [], news: [], newsAt: -99, tally: {}, me: { smuggled: 0, mediated: 0, forged: 0, exposed: 0, patrols: 0, levied: 0 }, searched: null };
}
function hash(s) { let h = 7; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h; }
export const AS = (g) => (g.accord ??= fresh(g));
export function fill(g) {
  const S = AS(g), f = fresh(g);
  for (const k of Object.keys(f)) S[k] ??= f[k];
  for (const id of Object.keys(f.stance)) { S.stance[id] ??= f.stance[id]; S.ruler[id] ??= f.ruler[id]; }
  for (const k of Object.keys(f.me)) S.me[k] ??= f.me[k];
  return S;
}
export const alog = (g, text) => { const S = AS(g); S.log.push({ y: g.date.year, m: g.date.month, text }); if (S.log.length > 40) S.log.splice(0, S.log.length - 40); };
export const tally = (g, k) => { const t = AS(g).tally; t[k] = (t[k] ?? 0) + 1; };
export const stanceOf = (g, id) => AS(g).stance[id] ?? 'dove';
export const pair = (x, a, b) => (x.a === a && x.b === b) || (x.a === b && x.b === a);
export const embargoOf = (g, by, on) => AS(g).embargo.find((e) => e.by === by && e.on === on) ?? null;
export const embargoed = (g, a, b) => !!(embargoOf(g, a, b) || embargoOf(g, b, a));
export const disputeOf = (g, a, b) => AS(g).disputes.find((d) => pair(d, a, b)) ?? null;
export const grudge = (g, a, b) => AS(g).grudges.filter((x) => pair(x, a, b) && g.date.year - x.y < 60).length;
export const heatWord = (h) => (h >= 85 ? '칼을 뽑기 직전' : h >= 60 ? '군대가 마주 섰다' : h >= 35 ? '날이 서 있다' : '말다툼');
export const powerOf = (id) => NATURE[id]?.power ?? 45;
export { PS };

HOOKS.newGame.push((g) => { g.accord = fresh(g); });
HOOKS.migrate.push((g) => { fill(g); });
