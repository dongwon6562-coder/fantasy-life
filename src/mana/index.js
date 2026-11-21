// 25단계: 마나의 흐름. 대륙의 마나가 수십 년 주기로 출렁이고, 짙은 해에는 마물·재능 있는 아이·마도구 값이 함께 움직인다(플레이어 없이도).
// 마나 샘 일곱과 마른 땅, 마나 폭풍, 샘 차지 다툼, 마나 중독, 샘을 지키는 샘지기.
// 화면용: manaInfo(g), manaLine(g)
import { MS, WELLS, WELL_IDS, HOLDERS, tideWord, flowWord, poisonWord, guardWord, placeName, costMul, syncMana } from './state.js';
import './world.js';
import './life.js';
import { L } from '../adventure/core.js';
import { MAP_INFO } from '../art/map.js';

export { WELLS, WELL_IDS, HOLDERS, syncMana } from './state.js';
export { manaMonth, seize } from './world.js';
export const manaState = MS;

const view = (g, id) => {
  const w = MS(g).wells[id], d = WELLS[id];
  return {
    id, name: d.name, place: d.place, placeName: placeName(d.place), desc: d.desc,
    flow: Math.round(w.flow), flowWord: flowWord(w.flow, w.dry), dry: !!w.dry,
    holder: HOLDERS[w.holder].name, guard: guardWord(w.guard), storms: w.storms, seized: w.seized,
    warden: MS(g).me.warden === id, here: L(g).place === d.place,
  };
};
// 화면용 한 장
//   { tide(-100~100), word, price('마석이 싸다'|...), years[{y, tide}] 최근 스무 해, wells[일곱], here(이 고장 샘 | null),
//     storm{ place, placeName } | null, me{ poison, poisonWord, draws, warden(샘 이름|''), storms, defended, kids }, log[{y,m,text}] }
export function manaInfo(g) {
  const S = MS(g), here = WELL_IDS.find((id) => WELLS[id].place === L(g).place);
  const cm = costMul(S.tide);
  return {
    tide: S.tide, word: tideWord(S.tide),
    price: cm <= 0.88 ? '마석이 흔해 싸다' : cm >= 1.12 ? '마석이 귀해 비싸다' : '마석 값이 평년 같다',
    years: Object.entries(S.years).map(([y, t]) => ({ y: +y, tide: t })).sort((a, b) => a.y - b.y).slice(-20),
    wells: WELL_IDS.map((id) => view(g, id)),
    here: here ? view(g, here) : null,
    storm: S.storm ? { place: S.storm.place, placeName: placeName(S.storm.place) } : null,
    me: { poison: Math.round(S.me.poison), poisonWord: poisonWord(S.me.poison), draws: S.me.draws, warden: S.me.warden ? WELLS[S.me.warden].name : '', storms: S.me.storms, defended: S.me.defended, kids: S.me.kids },
    log: S.log.slice(-10).reverse(),
  };
}
// 머리글 한 줄: 마나가 짙거나 옅을 때, 폭풍이 이 고장에 있을 때, 중독이 깊을 때만
export function manaLine(g) {
  const S = MS(g);
  if (S.storm && S.storm.place === L(g).place) return `마나 폭풍: ${placeName(S.storm.place)}`;
  if (S.me.poison >= 40) return `마나 중독: ${poisonWord(S.me.poison)}`;
  if (Math.abs(S.tide) >= 45) return tideWord(S.tide);
  return null;
}

// 대륙 지도: 샘이 있는 고장 설명 칸에 샘 형편 한 줄
MAP_INFO.push((g, place) => {
  if (!g?.mana || !place?.id) return '';
  const id = WELL_IDS.find((x) => WELLS[x].place === place.id);
  if (!id) return '';
  const w = g.mana.wells[id];
  return `<p class="note"><b>${WELLS[id].name}</b> · ${flowWord(w.flow, w.dry)} · ${HOLDERS[w.holder].name}의 샘${g.mana.storm?.place === place.id ? ' · 마나 폭풍' : ''}</p>`;
});
