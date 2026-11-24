// 41단계: 하늘의 별과 점성술사 (도우미스레드3). 천문대와 별 읽는 학자, 세상이 함께 보는 하늘 사건을 저마다 다르게 읽는 일,
// 일식 예고, 달력 고치기 다툼, 별점 장사와 사기, 항해에 쓰는 별, 시대 따라 망원경(techtree를 읽기만 한다).
// 화면용: starsLine(g) 이번 달 하늘 한 줄(없으면 null), starsInfo(g) 한 장
import { MAP_INFO } from '../art/map.js';
import { J } from '../narrative/text.js';
import { SS, OBS, OBS_IDS, SKY, CONSTELLATIONS, ROLE_NAME, loreWord, activeSky, obsHere, mi, placeName, hasLens, hasGlass } from './state.js';
import './world.js';
import './life.js';

export { starsMonth, skyEvent, READ } from './world.js';
export { activeSky, obsHere } from './state.js';
export { starsAfterMonth } from './life.js';
export const starsState = SS;

const SKY_LINE = {
  comet: ['밤마다 북쪽 하늘의 꼬리별이 조금씩 자리를 옮긴다. 우물가에서도 그 이야기뿐이다.', '꼬리별 꼬리가 지난달보다 짧아졌다. 사람들이 안도하는지 아쉬워하는지 모르겠다.'],
  eclipse: ['해가 먹혔던 날 이야기가 아직 장터에 돈다. 닭이 울었다느니, 별이 보였다느니.'],
  shower: ['간밤 별똥비 이야기로 아이들이 시끄럽다. 누구는 백 개를 셌다고 한다.'],
  nova: ['서쪽 하늘의 새 별이 해 질 녘이면 제일 먼저 켜진다. 사람들이 그 별 쪽을 보고 손을 모은다.', '새 별이 조금 흐려졌다. 성당은 여전히 그 별의 축일을 두고 다툰다.'],
  conj: ['저녁 하늘에 맞붙은 두 별이 조금씩 떨어지고 있다.'],
  aurora: ['북쪽 빛이 너울거린 밤 이야기가 아직 돈다. 노인들은 조상들이 춤춘 거라 한다.'],
};

/** 이번 달 하늘 한 줄 (없으면 null) */
export function starsLine(g) {
  if (!g?.stars || !g.date || !g.life) return null;
  const S = g.stars, now = mi(g), s = activeSky(g).sort((a, b) => b.at - a.at)[0];
  if (s) { const L = SKY_LINE[s.kind]; return L[(now - s.at) % L.length]; }
  const d = S.cal.dispute;
  if (d && now % 5 === 0) return '성당 앞에서 탁발승이 "열흘을 훔치려는 자들"을 꾸짖는다. 천문대 쪽 젊은이들이 맞받아 소리친다.';
  if (S.next.told && S.next.eclipse - now <= 6 && S.next.eclipse > now) return `${J(OBS[S.next.told].name, "이/가")} 말한 일식 달이 다가온다. 그을린 유리 조각을 파는 장사꾼이 늘었다.`;
  const k = obsHere(g.life.place);
  if (k && !g.life.travel && now % 6 === 0) return S.obs[k].glass ? `${OBS[k].name} 지붕 위 놋쇠 통이 밤하늘을 향해 비스듬히 서 있다.` : `${OBS[k].name} 창에 밤늦도록 촛불이 켜져 있다.`;
  return null;
}

/** 화면 한 장 */
export function starsInfo(g) {
  const S = SS(g), me = S.me, now = mi(g);
  return {
    sky: activeSky(g).map((s) => ({ kind: s.kind, name: SKY[s.kind].name, months: s.until - now + 1, told: s.told ? OBS[s.told].name : null })),
    past: S.past.concat(S.sky.filter((s) => s.until < now)).slice(-8).reverse().map((s) => ({ name: SKY[s.kind].name, year: Math.floor(s.at / 12), told: s.told ? OBS[s.told].name : null })),
    observatories: OBS_IDS.map((k) => ({ id: k, name: OBS[k].name, place: placeName(OBS[k].place), head: S.obs[k].head, fame: Math.round(S.obs[k].fame), glass: S.obs[k].glass, found: [...S.obs[k].found] })),
    eclipseTold: S.next.told && S.next.eclipse > now ? { by: OBS[S.next.told].name, months: S.next.eclipse - now } : null,
    calendar: { drift: S.cal.drift, dispute: S.cal.dispute ? { reform: Math.round(S.cal.dispute.reform), church: Math.round(S.cal.dispute.church), me: S.cal.dispute.me } : null, reforms: S.cal.reforms, last: S.cal.last },
    tools: { lens: hasLens(g), glass: hasGlass(g) },
    me: {
      lore: Math.round(me.lore), loreWord: loreWord(me.lore), known: me.known, constellations: CONSTELLATIONS.slice(0, me.known),
      role: me.role, roleName: ROLE_NAME[me.role], obs: me.obs ? OBS[me.obs].name : null,
      charts: me.charts, reads: me.reads, cheats: me.cheats, caught: me.caught, right: me.right, wrong: me.wrong, navs: me.navs,
      predicted: me.predicted ? { months: me.predicted.guess - now } : null,
    },
    log: S.log.slice(-10).reverse(),
  };
}

// 대륙 지도: 천문대
MAP_INFO.push((g, place) => {
  if (!place?.id || !g?.stars) return '';
  const k = obsHere(place.id);
  if (!k) return '';
  const o = g.stars.obs[k];
  const bits = [`${OBS[k].name}`, `${J(o.head, '이/가')} 맡음`];
  if (o.glass) bits.push('망원경');
  if (o.found.length) bits.push(`찾아낸 것 ${o.found.length}`);
  return `<p class="note"><b>하늘</b> · ${bits.join(' · ')}</p>`;
});
