// 31단계: 고대 유적과 잃어버린 마법. 마신 봉인 이전, 서클 마법 이전의 유적 여섯과 잊힌 술식 일곱.
// 소문 → 들어가 글 조각 떠 오기 → 서고에서 고대어 읽기 → 술식 되살리기 → 집안 마도서(대를 넘어 남음).
// 도굴꾼·학자·마탑·교단이 끼어들고, 너무 깊이 파면 유적에 잠든 것이 깨어난다. 술식은 서클을 올려 주지 않는다.
// 화면용: ruinsLine(g) 이 고장에서 보이는 유적 한 줄(없으면 null), ruinsInfo(g) 한 장
import { MAP_INFO } from '../art/map.js';
import { circleOf } from '../game.js';
import { J } from '../narrative/text.js';
import { PLACES } from '../places.js';
import { RU, RUINS, RUIN_IDS, ARTS, ART_IDS, LIBRARIES, here, piecesOf, piecesAll, knowsArt, placeName, civName } from './state.js';
import { needsMet, ruinsMonth } from './life.js';
import { seldom } from '../rumor/seldom.js';

export { RUINS, RUIN_IDS, ARTS, ART_IDS, LIBRARIES, ruinAt, piecesOf, knowsArt } from './state.js';
export { learn, restorable, needsMet, ruinsMonth } from './life.js';
export const ruinsTick = ruinsMonth;

const near = (g, pl) => here(g) === pl || !!PLACES[here(g)]?.links?.[pl];

export function tongueWord(t) {
  if (t >= 80) return '고대어를 제 나라 말처럼 읽는다';
  if (t >= 60) return '고대어 문장을 막힘없이 읽는다';
  if (t >= 40) return '고대어 문장 뜻을 대강 잡는다';
  if (t >= 20) return '고대어 낱말을 띄엄띄엄 읽는다';
  if (t > 0) return '고대어 글자 몇 개를 안다';
  return '고대어를 모른다';
}
export function siteWord(x) {
  if (x.woke === 'awake') return '잠든 것이 깨어났다';
  if (x.woke === 'stir') return '땅 밑에서 무언가 뒤척인다';
  if (x.woke === 'calmed') return '깨어난 것을 다시 잠재웠다';
  if (x.woke === 'sealed') return '마탑이 봉했다';
  if (x.claim === 'tower') return '마탑 표식이 붙었다';
  if (x.looted >= 60) return '도굴꾼이 거의 다 털었다';
  if (x.looted >= 25) return '도굴꾼이 드나든다';
  return '아직 손 탄 데가 적다';
}

/** 이 고장에서 보이는 유적 한 줄 (없으면 null) */
export function ruinsLine(g) {
  if (!g?.ruins || !g.date) return null;
  const R = g.ruins;
  const aw = RUIN_IDS.find((id) => R.sites[id]?.woke === 'awake' && near(g, RUINS[id].from));
  if (aw && seldom(g, `ruin:aw:${aw}`, 12)) return `${RUINS[aw].name} 쪽 하늘이 밤마다 이상하다. ${J(RUINS[aw].wake.name, '이/가')} 깨어난 뒤로 그쪽 길을 가는 사람이 없다.`;
  const id = RUIN_IDS.find((x) => RUINS[x].from === here(g) && R.sites[x]?.known >= 1);
  if (id && seldom(g, `ruin:${id}`, 24)) { // 48단계: 같은 유적 줄은 두 해에 한 번
    const x = R.sites[id];
    if (x.woke === 'stir') return `${RUINS[id].name} 들머리에서 밤마다 긁는 소리가 올라온다고 고장 사람들이 수군거린다.`;
    if (x.woke === 'sealed') return `${RUINS[id].name} 들머리에 마탑의 봉인 표식이 붙었다. 회색 로브 둘이 번갈아 지킨다.`;
    if (x.woke === 'calmed') return `${RUINS[id].name} 쪽은 조용하다. 고장 사람들은 그 앞을 지날 때 아직도 걸음을 빨리한다.`;
    if (x.looted >= 60) return `${RUINS[id].name} 들머리 주막이 도굴꾼으로 붐빈다. 정과 자루를 파는 노점까지 섰다.`;
    if (x.looted >= 25) return `${RUINS[id].name} 쪽으로 밤에 횃불 몇 개가 내려가는 것이 보인다.`;
  }
  if (R.work && LIBRARIES[here(g)]) return `${LIBRARIES[here(g)]} 책상에 ${ARTS[R.work.id].name}의 원을 그리다 만 종이가 쌓여 간다.`;
  return null;
}

/** 화면 한 장 */
export function ruinsInfo(g) {
  const R = RU(g), c = circleOf(g);
  return {
    tongue: Math.round(R.tongue), tongueWord: tongueWord(R.tongue), read: R.read, pieces: piecesAll(g),
    sites: RUIN_IDS.filter((id) => R.sites[id].known >= 1).map((id) => {
      const x = R.sites[id];
      return { id, name: RUINS[id].name, place: RUINS[id].from, placeName: placeName(RUINS[id].from), civ: civName(RUINS[id].civ), depth: x.depth, pieces: piecesOf(g, id), state: siteWord(x), woke: x.woke };
    }),
    arts: R.known.filter((a) => ARTS[a]).map((a) => ({ id: a, name: ARTS[a].name, desc: ARTS[a].desc, usable: c >= ARTS[a].circle })),
    // 읽어 냈지만 서클이 모자라 쓰지 못하는 것
    blocked: ART_IDS.filter((a) => !knowsArt(g, a) && R.tongue >= ARTS[a].tongue && needsMet(g, a) && c < ARTS[a].circle).map((a) => ({ id: a, name: ARTS[a].name, circle: ARTS[a].circle })),
    work: R.work ? { id: R.work.id, name: ARTS[R.work.id].name, prog: Math.round(R.work.prog * 100) } : null,
    book: R.book ? { title: R.book.title, entries: R.book.entries.map((e) => ({ name: e.name, by: e.by, y: e.y, known: knowsArt(g, e.art) })) } : null,
    foe: { tower: R.foe.tower, church: R.foe.church },
    log: R.log.slice(-10).reverse(),
  };
}

// 대륙 지도: 내가 아는 유적이 있는 고장
MAP_INFO.push((g, place) => {
  if (!g?.ruins || !place?.id) return '';
  return RUIN_IDS.filter((id) => RUINS[id].from === place.id && g.ruins.sites[id]?.known >= 1)
    .map((id) => `<p class="note"><b>${RUINS[id].name}</b> · ${civName(RUINS[id].civ)} · ${siteWord(g.ruins.sites[id])}</p>`).join('');
});
