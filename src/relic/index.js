// 26단계: 용사 시대의 성유물. 용사 레오의 검과 방패, 성녀 리아나의 기도서, 대마도사 노아의 반지, 드워프 전사 볼가르의 도끼.
// 진짜와 가짜, 유물을 쫓는 교단·마탑·왕실·도굴꾼·검은 새벽, 유물이 주인을 고르거나 거부하는 일, 유물의 대가. 유물은 스스로 옮겨 다닌다(플레이어 없이도).
// 화면용: relicInfo(g), relicLine(g)
import { RS, RELICS, RELIC_IDS, HOLDERS, relicName, whereWord, mine, chosenMine, placeName } from './state.js';
import './world.js';
import './life.js';
import { MAP_INFO } from '../art/map.js';
import { J } from '../narrative/text.js';

export { RELICS, RELIC_IDS, HOLDERS, relicName } from './state.js';
export { relicMonth, moveRelic } from './world.js';
export { relicScore, take } from './life.js';
export const relicState = RS;

// 화면용 한 장
//   { relics[다섯: { id, name, what, kind, desc, known(소문을 들었나), rumor(내가 아는 자리 글 | ''), mine, bond('고름'|'거부'|''), price(대가 글) }],
//     mine[내 손의 유물 같은 모양], me{ found, given, sold, fakes, refused, chosen }, log[{y,m,text}] }
//   진짜 자리는 플레이어가 들은 소문만큼만 보여 준다(rumor). 내 손에 있으면 그대로.
export function relicInfo(g) {
  const S = RS(g);
  const view = (id) => {
    const x = S.r[id], d = RELICS[id], k = S.me.known[id];
    let rumor = '';
    if (x.holder === 'me') rumor = '내 손';
    else if (k) rumor = `${k.y}년에 들은 소문: ${k.holder === 'lost' ? `${placeName(k.place)} 어딘가의 땅속` : k.holder === 'robbers' ? `${placeName(k.place)} 근처 도굴꾼의 손` : k.holder === 'legend' ? '이름난 누군가의 손' : `${HOLDERS[k.holder]?.name ?? '누군가'}의 손`}`;
    return {
      id, name: d.name, what: d.what, kind: d.kind, desc: d.desc, known: !!k || x.holder === 'me', rumor,
      mine: x.holder === 'me', bond: x.holder === 'me' ? (x.bond === 'chosen' ? '고름' : x.bond === 'refused' ? '거부' : '') : '',
      price: x.holder === 'me' && x.bond === 'chosen' ? d.price : '',
    };
  };
  return { relics: RELIC_IDS.map(view), mine: mine(g).map(view), me: { found: S.me.found, given: S.me.given, sold: S.me.sold, fakes: S.me.fakes, refused: S.me.refused, chosen: S.me.chosen }, log: S.log.slice(-10).reverse() };
}
// 머리글 한 줄: 유물을 쥐고 있을 때만
export function relicLine(g) {
  const m = mine(g);
  if (!m.length) return null;
  const c = chosenMine(g);
  return `성유물: ${m.map((id) => RELICS[id].name).join(', ')}${c.length ? ` (${J(c.map((id) => RELICS[id].name).join(', '), '이/가')} 나를 골랐다)` : ''}`;
}

// 대륙 지도: 유물을 모셔 둔 고장 설명 칸에, 내가 소문으로 아는 만큼만
MAP_INFO.push((g, place) => {
  if (!g?.relic || !place?.id) return '';
  const S = g.relic;
  const ids = RELIC_IDS.filter((id) => { const k = S.me?.known?.[id]; return k && k.place === place.id && S.r[id].holder !== 'me'; });
  if (!ids.length) return '';
  return ids.map((id) => `<p class="note"><b>${relicName(id)}</b> · 소문 (${S.me.known[id].y}년)</p>`).join('');
});
export { whereWord };
