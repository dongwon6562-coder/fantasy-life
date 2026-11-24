// 장의사와 묘지기 (40단계): 장의사·묘지기 일자리, 염하기와 관 짜기, 신분마다 다른 장례(빈민·농부·장인·상인·귀족·이방인·죄인),
// 밤의 묘지와 도굴꾼, 장의사 집, 집안 무덤 자리 사고팔기, 역병 수레와 공동 구덩이, 묘지에 도는 소문(일 쪽), 플레이어 없이도 차고 털리는 묘지.
// 화면: undertakerLine(g) 오늘의 장면 한 줄, undertakerInfo(g) 화면용 묶음 (undertakerStatus는 같은 것).
import { L } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { U, mi, here, placeName, YARDS, yardHere, skill, skillWord, isUT, isGD, shopHere, seasonOf } from './core.js';
import { plagueHere } from './life.js';
import './world.js';

export { U as undertakerState, YARDS as UT_YARDS };
export { RANKS as UT_RANKS, plotPrice } from './core.js';
export { yardMonth, robMonth, shopMonth } from './world.js';

const fullWord = (v) => (v >= 90 ? '더 묻을 데가 없다' : v >= 70 ? '빈자리가 드물다' : v >= 40 ? '자리가 남아 있다' : '넉넉하다');
const rumorWord = (v) => (v >= 60 ? '해 지면 아무도 묘지 길로 다니지 않는다' : v >= 30 ? '흉한 말이 돈다' : '');

/** 화면용 묶음 */
export function undertakerInfo(g) {
  const s = U(g), y = yardHere(g), pl = here(g);
  return {
    job: isUT(g) ? '장의사' : isGD(g) ? '묘지기' : null,
    skill: Math.round(skill(g)), skillWord: skillWord(skill(g)),
    yard: y ? { name: YARDS[pl].name, crypt: YARDS[pl].crypt ?? null, wait: y.wait, full: Math.round(y.full), fullWord: fullWord(y.full), rumor: Math.round(y.rumor), rumorWord: rumorWord(y.rumor), robbed: y.robbed, pit: y.pit } : null,
    shop: s.shop ? { place: placeName(s.shop.place), years: Math.floor((mi(g) - s.shop.since) / 12), coffins: s.shop.coffins } : null,
    plot: s.plot ? { place: placeName(s.plot.place), yard: YARDS[s.plot.place]?.name ?? '', kind: { hill: '볕 드는 언덕', wall: '담 옆', crypt: '납골당 한 칸' }[s.plot.kind] ?? '' } : null,
    done: { bodies: s.bodies, coffins: s.coffins, funerals: s.funerals, dug: s.dug, caught: s.caught, earned: s.earned },
    past: s.past.slice(-3),
    log: s.log.slice(-8),
  };
}
export const undertakerStatus = undertakerInfo;

const GD_LINE = {
  봄: '무덤 사이 풀이 무릎까지 자랐다. 낫을 갈아 두었다.',
  여름: '한낮의 묘지는 매미 소리뿐이다. 비석 그늘에 앉아 물을 마셨다.',
  가을: '비석마다 낙엽이 쌓였다. 이름이 묻히지 않게 쓸어 낸다.',
  겨울: '언 땅에 곡괭이 자국이 하얗게 남았다. 헛간에 봄을 기다리는 관이 둘 있다.',
};
/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function undertakerLine(g) {
  if (!g?.player || g.over || L(g).travel) return null;
  const s = U(g), t = mi(g), y = yardHere(g);
  if (y && plagueHere(g).length && t % 2 === 0) return y.pit ? `${YARDS[here(g)].name} 끝에 판 긴 구덩이 위로 석회 가루가 하얗게 날린다.` : '역병 수레의 종소리가 골목마다 지나간다. 문이 열리고, 닫힌다.';
  if (shopHere(g) && t % 3 === 0) return s.shop.coffins > 0 ? `장의사 집 마당에 관 ${s.shop.coffins}개가 벽에 기대 서 있다. 지나가는 아이들이 곁눈질을 한다.` : '장의사 집 마당이 비었다. 판자를 사러 가야 한다.';
  if (y && (isUT(g) || isGD(g))) {
    if (y.rumor >= 30 && t % 3 === 1) return `장에서 ${YARDS[here(g)].name} 불빛 이야기를 하던 사람들이 나를 보고 입을 다문다.`;
    if (y.robbed > 0 && y.rich >= 2 && t % 3 === 2) return '큰 장례가 지나간 뒤로 묘지 담 밖에 낯선 발자국이 늘었다.';
    if (isGD(g) && t % 2 === 0) return GD_LINE[seasonOf(g)];
    if (isUT(g) && y.wait >= 3 && t % 2 === 1) return `상가 세 곳에서 사람을 보냈다. 검은 천이 모자란다.`;
  }
  if (s.plot && s.plot.place === here(g) && t % 7 === 3) return `${YARDS[here(g)].name} ${s.plot.kind === 'crypt' ? '납골당 돌문에' : '언덕에'} 집안 이름이 새겨진 자리가 있다. 아직 비어 있다.`;
  if (y && y.rumor >= 60 && t % 5 === 0) return `해가 지자 ${J(YARDS[here(g)].name, '으로/로')} 가는 길에 인적이 끊겼다.`;
  return null;
}
