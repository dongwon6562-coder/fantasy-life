// 4단계: 세계가 스스로 굴러가기. world.js의 한 달(WORLD_TICKS)에 끼어들어 가문·상단·사람·세력·발명을 움직인다.
// 화면에서 쓸 것: historySummary(g), worldChronicle(g), placeChanges(g, place), notablesOf(g), housesOf(g), companiesOf(g), powerOf(g, key)
import { HOOKS } from '../hooks.js';
import { makeRng } from '../rng.js';
import { WORLD_TICKS } from '../world.js';
import { H, makeHistory, POWERS, COMPANY_KIND, TEMPER } from './state.js';
import { noblesTick, houseName, liveHouses } from './nobles.js';
import { tradeTick } from './trade.js';
import { peopleTick, notableLine } from './people.js';
import { powerTick } from './powers.js';

WORLD_TICKS.push((g, rng, say, record) => {
  if (!g.history) return;
  const yearEnd = g.date.month === 12; // world.js와 같은 기준: 12월이 끝나면 한 해가 간다
  noblesTick(g, rng, say, record, yearEnd);
  tradeTick(g, rng, say, record, yearEnd);
  peopleTick(g, rng, say, record, yearEnd);
  powerTick(g, rng, say, record, yearEnd);
});

HOOKS.newGame.push((g, rng) => { g.history = makeHistory(rng, g); });
HOOKS.migrate.push((g) => {
  // 예전 저장: 게임 난수 흐름을 건드리지 않도록 따로 만든 난수로 채운다
  if (!g.history && g.realm) g.history = makeHistory(makeRng({ s: ((g.rngState?.s ?? 7) ^ 0x2f6b1a3d) | 0 }), g);
});

// ---------- 화면에서 쓸 것 ----------
export const housesOf = (g) => liveHouses(g);
export const companiesOf = (g) => H(g)?.companies ?? [];
export const notablesOf = (g) => [...(H(g)?.notables ?? [])].sort((a, b) => b.fame - a.fame);
export const powerOf = (g, key) => Math.round(H(g)?.powers?.[key] ?? 50);
export const placeChanges = (g, place) => H(g)?.places?.[place] ?? [];
// 세계 연대기: 왕국의 큰일 { y, m, text } (오래된 것부터)
export const worldChronicle = (g) => g.realm?.log ?? [];

export function historySummary(g) {
  const hist = H(g);
  if (!hist) return [];
  const lines = [];
  lines.push('가문: ' + liveHouses(g).sort((a, b) => b.power - a.power).slice(0, 5).map((h) => `${houseName(h)}(${h.head}, ${TEMPER[h.temper] ?? ''})`).join(', '));
  lines.push('상단: ' + [...hist.companies].sort((a, b) => b.fortune - a.fortune).map((c) => `${c.name}(${COMPANY_KIND[c.kind]}${c.fortune > 70 ? ', 번창' : c.fortune < 20 ? ', 휘청' : ''})`).join(', '));
  const P = hist.powers;
  lines.push('세력: ' + Object.keys(POWERS).sort((a, b) => P[b] - P[a]).map((k) => `${POWERS[k]} ${Math.round(P[k])}`).join(' · '));
  const top = notablesOf(g).slice(0, 4);
  if (top.length) lines.push('이름난 사람: ' + top.map(notableLine).join(', '));
  return lines;
}
