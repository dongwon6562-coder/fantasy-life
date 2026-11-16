// 병과 의술. 상태는 g.health 하나.
//   sick[]: 지금 앓는 병 { id, kind, who('me' | 사람 id), sev(0~100), months, start, treat: null | { by, power, left } }
//   chronic[]: 낫지 않는 병과 장애 { id, since, from }  (플레이어 몸에 남은 것)
//   outbreaks[]: 고장 묶음마다 도는 병 { kind, region, sev(0~1), left(달), start{y,m} }
//   lineage{ chronic id: 대물림된 횟수 }: 집안 내력   past[]: 지나간 큰 돌림병 (최근 30)
//   cured, quacked: 고친 병 수, 돌팔이에게 속은 수   seq, log[], seen[]
import { HOOKS } from '../hooks.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;

// 병: 도는 철과 고장(고장 묶음별 한 달 확률), 하루하루 깊어지는 정도, 목숨을 앗는가, 남기는 것, 누가 잘 고치나
//   cure: 치료마다의 힘 (physician 의원, herbalist 약초꾼, temple 신전, mage 치유 마법, quack 돌팔이)
export const KINDS = {
  fever: {
    name: '늪 열병', months: [6, 7, 8, 9], odds: { south: 0.02, river: 0.03, coast: 0.025, lake: 0.03, forest: 0.01 },
    grow: 9, last: [2, 4], deadly: 0.07, leaves: { frail: 0.25, blind: 0.05 },
    cure: { physician: 0.7, herbalist: 0.6, temple: 0.4, mage: 0.85, quack: -0.2 },
    desc: '늪과 강가에서 여름마다 도는 열병. 오한과 땀이 번갈아 오고, 사흘마다 열이 다시 오른다.',
  },
  lung: {
    name: '기침병', months: [11, 12, 1, 2, 3], odds: { north: 0.03, mountain: 0.03, forest: 0.015, east: 0.02, river: 0.015, south: 0.01 },
    grow: 6, last: [3, 6], deadly: 0.09, leaves: { lungs: 0.4 },
    cure: { physician: 0.5, herbalist: 0.45, temple: 0.35, mage: 0.8, quack: -0.15 },
    desc: '겨울의 축축한 방에서 옮는 기침. 가슴이 끓고, 오래 끌면 피를 토한다.',
  },
  flux: {
    name: '이질', months: [6, 7, 8, 9, 10], odds: { river: 0.01, south: 0.008, coast: 0.01 }, afterFlood: 6,
    grow: 13, last: [1, 2], deadly: 0.1, leaves: { frail: 0.2 },
    cure: { physician: 0.65, herbalist: 0.55, temple: 0.3, mage: 0.8, quack: -0.3 },
    desc: '물이 넘친 뒤나 굶주린 해에 도는 배앓이. 하루에도 몇 번씩 쏟아내다 사람이 마른다.',
  },
  plague: {
    name: '잿빛 역병', months: null, odds: {}, grow: 16, last: [2, 4], deadly: 0.22, leaves: { pocked: 0.5, frail: 0.3 },
    cure: { physician: 0.4, herbalist: 0.25, temple: 0.35, mage: 0.85, quack: -0.3 },
    desc: '살갗에 잿빛 반점이 돋는 돌림병. 한 집에 들면 온 식구가 눕는다.',
  },
  rot: {
    name: '상처 덧남', months: null, odds: {}, grow: 12, last: [1, 2], deadly: 0.12, leaves: { lame: 0.3, hand: 0.15 },
    cure: { physician: 0.75, herbalist: 0.5, temple: 0.3, mage: 0.9, quack: -0.3 },
    desc: '아물어야 할 상처가 붓고 고름이 찬다. 붉은 줄이 팔다리를 타고 올라오면 늦은 것이다.',
  },
};
export const KIND_IDS = Object.keys(KINDS);

// 낫지 않는 병과 장애: 처음 남을 때 깎이는 능력치, 다달이 오는 고단함, 대물림
export const CHRONIC = {
  lungs: { name: '약해진 폐', desc: '겨울이면 숨이 차고 기침이 난다.', stat: { str: -3 }, winter: 4, heir: 0.3 },
  frail: { name: '쇠약해진 몸', desc: '큰 병을 앓은 뒤로 예전 같은 힘이 돌아오지 않는다.', stat: { str: -4, wil: -1 }, tire: 1 },
  pocked: { name: '얽은 얼굴', desc: '역병이 남긴 자국이 얼굴에 가득하다.', stat: { cha: -6 } },
  lame: { name: '저는 다리', desc: '덧난 상처가 힘줄을 먹었다. 오래 걸으면 다리가 끌린다.', stat: { agi: -7 }, tire: 2 },
  hand: { name: '굳은 손', desc: '손가락 두 개가 펴지지 않는다.', stat: { agi: -3, sen: -2 } },
  blind: { name: '흐려진 한쪽 눈', desc: '열병이 지나간 뒤 한쪽 눈이 뿌옇게 흐려졌다.', stat: { sen: -6 } },
  fits: { name: '발작', desc: '가끔 눈앞이 하얘지고 몸이 뒤틀린다. 집안 내력이다.', stat: {}, fits: 0.06, heir: 0.25 },
};

// 누구에게 맡기나: 어디에 있나, 값(고장 품삯을 곱한다)
export const HEALERS = {
  physician: { name: '의원', places: ['harfen', 'verden', 'leocast', 'solaris', 'graubel', 'barka', 'portel', 'serenia', 'eisen', 'hammer', 'silverleaf'], cost: 9 },
  herbalist: { name: '약초꾼', places: null, cost: 3 },
  temple: { name: '신전 치유', places: null, cost: 5 },
  mage: { name: '치유 마법사', places: ['serenia', 'leocast', 'solaris', 'eisen'], cost: 30 },
  quack: { name: '떠돌이 약장수', places: null, cost: 4 },
};

export const HS = (g) => (g.health ??= fresh());
export function fresh() {
  return { sick: [], chronic: [], outbreaks: [], lineage: {}, past: [], cured: 0, quacked: 0, seq: 1, log: [], seen: [] };
}
export function hlog(g, text) {
  const H = HS(g);
  H.log.push({ y: g.date.year, m: g.date.month, text });
  if (H.log.length > 30) H.log.splice(0, H.log.length - 30);
}
export const sevWord = (v) => (v >= 80 ? '사경을 헤맨다' : v >= 55 ? '깊이 앓는다' : v >= 30 ? '앓아누웠다' : v >= 10 ? '기운이 없다' : '거의 나았다');
export const hasChronic = (g, id) => HS(g).chronic.some((c) => c.id === id);
export const mySick = (g) => HS(g).sick.filter((s) => s.who === 'me');

HOOKS.newGame.push((g) => { g.health = fresh(); });
HOOKS.migrate.push((g) => {
  const H = HS(g), f = fresh();
  for (const k of Object.keys(f)) H[k] ??= f[k];
});
// 대를 이으면: 앓던 병과 몸의 장애는 그 사람과 함께 간다. 집안 내력은 피를 타고 내려올 수 있다(heir 훅에서 정한다).
