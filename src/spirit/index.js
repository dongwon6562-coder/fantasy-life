// 28단계: 정령과 계약. 서클 마법보다 오래된 길. 물·불·바람·땅의 정령(낯설고 큰 것), 알아보는 눈, 엘프·드워프의 보는 법,
// 계약의 조건과 대가, 정령의 변덕, 깨진 계약이 집안에 남기는 것, 교단과 마탑의 눈. 정령의 기분은 플레이어 없이도 움직인다.
// 화면용: spiritInfo(g), spiritLine(g)
import { SP, SPIRITS, SPIRIT_IDS, spiritName, mi } from './state.js';
import './world.js';
import './life.js';
import { MAP_INFO } from '../art/map.js';
import { J } from '../narrative/text.js';

export { SPIRITS, SPIRIT_IDS, spiritName, spiritAt, bornSight } from './state.js';
export { spiritMonth } from './world.js';
export { breakPact } from './life.js';
export const spiritState = SP;

const SIGHT = ['못 본다', '얼핏 본다', '똑바로 본다', '말을 섞는다'];
const favorWord = (v) => (v >= 75 ? '그것이 나를 아낀다' : v >= 45 ? '그것이 나를 지켜본다' : v >= 20 ? '그것이 등을 돌리려 한다' : '그것이 나를 잊으려 한다');
const moodWord = (v) => (v >= 40 ? '들떠 있다' : v > -20 ? '잠잠하다' : v > -60 ? '거칠다' : '깨어나려 한다');
// 화면 한 장
//   { sight, sightWord, pact: null | { id, name, kind, home, term, gift, favor, favorWord, breaches, years },
//     curse: null | { name, text, years, heavy }, known[ { id, name, kind, home, desc, mood } ](눈을 뜬 뒤에만), me{ pacts, broken, seen }, log[] }
export function spiritInfo(g) {
  const S = SP(g), p = S.pact, c = S.curse;
  return {
    sight: S.sight, sightWord: SIGHT[S.sight] ?? SIGHT[0],
    pact: p ? { id: p.id, name: spiritName(p.id), kind: SPIRITS[p.id].kind, home: SPIRITS[p.id].home, term: SPIRITS[p.id].term, gift: SPIRITS[p.id].gift, favor: Math.round(p.favor), favorWord: favorWord(p.favor), breaches: p.breaches, years: Math.floor((mi(g) - p.since) / 12) } : null,
    curse: c ? { name: spiritName(c.id), text: SPIRITS[c.id].curse, years: Math.max(0, Math.ceil((c.until - mi(g)) / 12)), heavy: !!c.heavy } : null,
    known: S.sight > 0 ? SPIRIT_IDS.map((id) => ({ id, name: spiritName(id), kind: SPIRITS[id].kind, home: SPIRITS[id].home, desc: SPIRITS[id].desc, mood: moodWord(S.spirits[id].mood) })) : [],
    me: { ...S.me }, log: S.log.slice(-10).reverse(),
  };
}
// 머리글 한 줄: 계약이 있거나 깨진 계약이 남았을 때만
export function spiritLine(g) {
  const S = g.spirit;
  if (!S) return null;
  if (S.pact) return `정령 계약: ${spiritName(S.pact.id)} (${favorWord(S.pact.favor)})`;
  if (S.curse) return `${J(spiritName(S.curse.id), '이/가')} 남긴 것: ${SPIRITS[S.curse.id].curse}`;
  return null;
}
// 대륙 지도: 정령의 자리로 가는 고장에, 눈을 뜬 사람에게만
MAP_INFO.push((g, place) => {
  const S = g?.spirit;
  if (!S || S.sight < 1 || !place?.id) return '';
  const id = SPIRIT_IDS.find((x) => SPIRITS[x].from === place.id);
  if (!id) return '';
  return `<p class="note"><b>${SPIRITS[id].home}</b> · ${spiritName(id)}, ${moodWord(S.spirits[id].mood)}</p>`;
});
