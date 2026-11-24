// 43단계: 마신 깊게 (도우미스레드3). 봉인 전쟁의 옛 이야기 조각, 옛 사도 일곱, 마신의 유물(힘과 대가), 꿈의 목소리,
// 사도회 '일곱 의자'(검은 새벽 안쪽), 감시탑의 파수꾼, 그 사이의 갈림길. 봉인(src/seal/)의 끝은 정하지 않는다.
// 화면용: demongodLine(g) 이번 달 한 줄(없으면 null), demongodInfo(g) 알아낸 것만 한 장
import { DG, LORE, TOPICS, APOSTLES, APOSTLE_IDS, RELICS, RELIC_IDS, HOLDERS, ORDER_RANKS, WATCH_RANKS, voiceWord, held, mi } from './state.js';
import './world.js';
import './life.js';

export { demongodMonth, moveRelic } from './world.js';
export { demongodAfterMonth } from './life.js';
export { held as heldRelics } from './state.js';
export const demongodState = DG;

/** 이번 달 한 줄 (없으면 null) */
export function demongodLine(g) {
  if (!g?.demongod || !g.date || !g.life) return null;
  const S = g.demongod, now = mi(g);
  if (S.voice >= 40 && now % 3 === 0) return S.voice >= 70 ? '그릇에 담긴 물에 내 얼굴이 비쳤다. 입술이 먼저 움직였다.' : '밤새 같은 꿈을 꾸었다. 얼음 들판, 등을 돌린 누군가.';
  const hs = held(g);
  if (hs.length && now % 4 === 1) return `궤짝 속 ${RELICS[hs[0]].name} 쪽이 오늘따라 서늘하다.`;
  if (S.order && now % 5 === 2) return '골목 벽에 재로 그린 작은 원이 보인다. 아는 사람만 아는 표시다.';
  if (S.watch && now % 5 === 3) return '목에 건 등잔 쇠붙이가 바람 없이 흔들렸다.';
  return null;
}

/** 한 장: 내가 알아낸 것만 */
export function demongodInfo(g) {
  const S = DG(g), known = new Set(S.known), heard = new Set(S.heard ?? []);
  const loreBy = TOPICS.map((t) => ({ topic: t, pieces: S.known.filter((k) => LORE[k].topic === t).map((k) => ({ id: k, voice: LORE[k].voice, text: LORE[k].text })) })).filter((x) => x.pieces.length);
  const apKnown = APOSTLE_IDS.filter((k) => known.has('apostles') || S.known.some((l) => LORE[l].topic === APOSTLES[k].name) || (S.stir[k] >= 40 && (g.seal?.known ?? 0) >= 1));
  const m = S.me;
  m.side = m.guard >= m.brk + 3 ? 'guard' : m.brk >= m.guard + 3 ? 'break' : m.guard + m.brk > 0 ? 'between' : null;
  return {
    lore: loreBy, loreCount: S.known.length, loreTotal: Object.keys(LORE).length,
    apostles: apKnown.map((k) => ({ id: k, name: APOSTLES[k].name, did: APOSTLES[k].did, rest: APOSTLES[k].rest, stirring: S.stir[k] >= 40 })),
    relics: RELIC_IDS.filter((k) => S.relics[k].at === 'me' || heard.has(k)).map((k) => ({ id: k, name: RELICS[k].name, power: RELICS[k].power, cost: RELICS[k].cost, mine: S.relics[k].at === 'me', where: S.relics[k].at === 'gone' ? '부서졌다' : HOLDERS[S.relics[k].at] ?? '' })),
    voice: { v: Math.round(S.voice), word: voiceWord(S.voice), bond: S.bond },
    order: S.order ? { rank: ORDER_RANKS[S.order.rank], tasks: S.order.tasks } : null,
    watch: S.watch ? { rank: WATCH_RANKS[S.watch.rank], tasks: S.watch.tasks } : null,
    side: S.me.side, sideWord: { guard: '봉인을 지키는 쪽', break: '봉인을 여는 쪽', between: '두 쪽 사이' }[S.me.side] ?? '',
    destroyed: S.me.destroyed, gave: S.me.gave,
    log: S.log.filter((x) => !/→/.test(x.text)).slice(-10).reverse(),
  };
}
