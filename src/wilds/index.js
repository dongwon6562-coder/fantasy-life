// 19단계: 마물의 땅. 고장마다 마물이 늘고 줄며, 둥지가 생겨 자라고, 떼가 이웃 고장으로 옮겨 가고,
// 작은 마을이 버려졌다가 다시 사람이 든다. 사냥꾼 길드 현상금과 마물 부산물 시세가 그 흐름을 따른다. 시대마다 새 마물.
// 화면용: wildsInfo(g), wildsLine(g)
import { WS, KINDS, LANDS, HAMLETS, placeName, levelAt, levelWord, kindsAt, partPrice, hamletsNear } from './state.js';
import './world.js';
import './life.js';
import { L } from '../adventure/core.js';
import { partsCount, partsValue } from './life.js';

export { KINDS, LANDS, HAMLETS, levelAt, kindsAt, partPrice };
export { wildsMonth } from './world.js';
export const wildsState = WS;

const HAMLET_STATE = { lived: '사람이 산다', abandoned: '버려졌다', returning: '사람들이 돌아오는 중' };
const nestWord = (n) => (n ? `${KINDS[n.kind]?.name ?? '마물'} 둥지 (${n.size >= 7 ? '거대함' : n.size >= 4 ? '자람' : '작음'})` : null);
const bountyView = (g, b) => ({ place: placeName(b.place), kind: KINDS[b.kind]?.name ?? '', reward: b.reward, nest: !!b.nest, months: Math.max(0, b.until - (g.date.year * 12 + g.date.month)) });

export function wildsInfo(g) {
  const S = WS(g), pl = L(g).place, s = S.land[pl];
  return {
    here: {
      place: placeName(pl), level: Math.round(s?.level ?? 0), word: levelWord(s?.level ?? 0),
      kinds: kindsAt(g, pl).map((k) => KINDS[k].name), nest: nestWord(s?.nest),
      bounties: S.bounties.filter((b) => b.place === pl).map((b) => bountyView(g, b)),
      hamlets: hamletsNear(pl).map((id) => ({ name: HAMLETS[id].name, state: HAMLET_STATE[S.hamlets[id].state] ?? '', pop: Math.round(S.hamlets[id].pop), stake: !!S.hamlets[id].stake })),
    },
    places: Object.keys(LANDS).map((p) => ({ place: placeName(p), level: Math.round(S.land[p].level), word: levelWord(S.land[p].level), nest: nestWord(S.land[p].nest) })).sort((a, b) => b.level - a.level),
    hamlets: Object.entries(HAMLETS).map(([id, h]) => ({ name: h.name, near: placeName(h.near), state: HAMLET_STATE[S.hamlets[id].state] ?? '', pop: Math.round(S.hamlets[id].pop), stake: !!S.hamlets[id].stake })),
    bounties: S.bounties.map((b) => bountyView(g, b)),
    parts: Object.entries(S.parts).filter(([, n]) => n > 0).map(([k, n]) => ({ name: KINDS[k]?.part ?? '', qty: n, price: partPrice(g, k, pl) })),
    partsValue: partsValue(g, pl),
    prices: S.seen.map((k) => ({ kind: KINDS[k].name, part: KINDS[k].part, price: partPrice(g, k, pl) })),
    herds: S.herds.slice(-5).reverse().map((h) => ({ herd: KINDS[h.kind]?.herd ?? '', from: placeName(h.from), to: placeName(h.to) })),
    rec: { ...S.rec },
    log: S.log.slice(-10).reverse(),
  };
}

// 한 줄 요약: 이 고장의 기세, 둥지, 가진 부산물
export function wildsLine(g) {
  const S = WS(g), pl = L(g).place, s = S.land[pl];
  if (!s) return '';
  const out = [`${placeName(pl)}: ${levelWord(s.level)}`];
  if (s.nest) out.push(nestWord(s.nest));
  const n = partsCount(g);
  if (n) out.push(`부산물 ${n}개`);
  return out.join(' · ');
}
