// 경비대와 치안 (49단계): 마을 경비대원·도시 경비대·경비대장으로 사는 삶.
// 순찰(일하러 가기)과 그 길의 말썽(소매치기·주점 싸움·밀수 짐마차·길 잃은 아이·귀족 자제·광장 설교자), 성문 지키기, 맡은 사건 캐기와 범인 지목,
// 뇌물과 눈감기·자릿세·감찰, 상관(깐깐한·느긋한·뒷돈 챙기는·공정한)과 동료, 계급(경비병→조장→부대장→경비대장), 경비대장의 방침,
// 내가 잡아넣은 사람의 원한, 고장마다 다른 경비대와 치안(플레이어 없이도 오르내린다), 폭동.
// 화면: watchInfo(g) 화면용 묶음(watchView가 쓴다), watchLine(g) 오늘의 장면 한 줄.
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { W, mi, here, placeName, RANKS, NEED, TOWNS, townOf, unitOf, TEMPERS, isWatch, orderOf, orderWord, rankName } from './core.js';
import { CASE_KINDS, caseName, openCase, POLICY } from './life.js';
import { seldom } from '../rumor/seldom.js';
import './world.js';

export { W as watchState, TOWNS as WATCH_TOWNS, RANKS as WATCH_RANKS, orderOf as watchOrder };
export { newCase, openCase as watchCaseHere } from './life.js';

/** 화면용 묶음: 경비대 카드 */
export function watchInfo(g) {
  const s = W(g), t = mi(g), pl = here(g), job = isWatch(g);
  const town = townOf(pl) ? { name: placeName(pl), unit: unitOf(pl), order: Math.round(orderOf(g, pl)), word: orderWord(orderOf(g, pl)) } : null;
  return {
    member: job && !!s.place,
    rank: job && s.place ? rankName(g) : null, rankN: s.rank,
    unit: s.unit, place: s.place ? placeName(s.place) : null, since: s.since,
    merit: Math.round(s.merit), next: job && s.rank < 3 ? NEED[s.rank] : null, nextRank: job && s.rank < 3 ? RANKS[s.rank + 1] : null,
    boss: s.boss ? `${TEMPERS[s.boss.temper].name} ${s.boss.name}` : null,
    mates: s.mates.map((m) => `${m.trait} ${m.name}${m.hurt ? '(다친 다리)' : ''}`),
    policy: s.policy ? POLICY[s.policy].name : null,
    town,
    cases: s.cases.slice(-6).map((c) => ({
      name: caseName(c), text: CASE_KINDS[c.kind].name, clue: c.clue,
      suspect: c.suspects.filter((_, i) => !c.cleared.includes(i)).map((x) => x.name),
      prog: Math.min(100, Math.round(c.clue * 20)), left: c.done ? 0 : Math.max(0, c.until - t),
      solved: c.result === 'solved', cold: c.result === 'cold', wrong: c.result === 'wrong',
    })),
    solved: s.solved, wrong: s.wrong, coldN: s.cold,
    caught: s.caught.length, bribes: s.bribes + s.skimmed,
    grudges: s.caught.filter((x) => !x.done && x.grudge >= 1).map((x) => ({ name: x.name, crime: x.crime, out: x.out <= t })).slice(-5),
    served: s.served + (s.place ? t - (s.since ?? t) : 0),
    log: s.log.slice(-8),
  };
}
export const watchStatus = watchInfo;

/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function watchLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const s = W(g), t = mi(g), pl = here(g), tw = townOf(pl);
  if (!tw) return null;
  const o = orderOf(g, pl);
  if (isWatch(g) && s.place === pl) {
    const c = openCase(g, pl);
    if (c && t % 2 === 0) return `품 안의 사건 종이가 바스락거린다. ${caseName(c)}, 남은 달은 ${Math.max(0, c.until - t)}.`;
    const out = s.caught.find((x) => !x.done && x.grudge >= 1 && x.out <= t && x.place === pl);
    if (out && t % 3 === 1) return `${J(out.name, '이/가')} 감방에서 나왔다는 말이 들린다. 골목 어귀를 지날 때 자꾸 뒤를 보게 된다.`;
    if (s.rank >= 3 && t % 4 === 0 && seldom(g, 'watch:yard', 12)) return `경비대 마당에서 대원들이 창을 닦는다. 내가 지나가자 모두 일어섰다.`;
    if (t % 5 === 2 && seldom(g, 'watch:gate', 12)) return `${tw.gate}의 횃불이 바람에 흔들린다. 오늘 밤 근무표에 내 이름이 있다.`;
    return null;
  }
  if (o < 30 && t % 3 === 0 && seldom(g, 'watch:dark', 24)) return `해가 지기도 전에 ${placeName(pl)} 가게들이 덧문을 내린다. ${J(tw.unit, '은/는')} 큰길에서만 보인다.`;
  if (o >= 78 && t % 6 === 1 && seldom(g, 'watch:calm', 36)) return `${tw.unit} 순라꾼이 등불을 들고 지나간다. 문을 열어 둔 집도 있다.`;
  return null;
}
