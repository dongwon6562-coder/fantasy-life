// 36단계: 점령지에서 살기 (도우미스레드3). 발하르트와의 전쟁에서 밀리면 국경 고장이 점령되고, 강화로 지면 제국 땅이 된다.
// 점령군과 새 영주, 점령 세금, 징발, 점령 관청의 자리(부역), 숨어서 맞서는 사람들, 밀고와 보복, 점령군 병사와의 정, 해방 뒤 부역자 심판.
// 플레이어 없이도 점령되고 풀린다(전선·강화·봉기). revolt의 분노, realms의 땅 주인(넘어간 땅은 발하르트)과 잇는다.
// 화면용: occLine(g) 이번 달 이 고장의 점령 한 줄(없으면 null), occInfo(g) 한 장, occAt(g, 고장)
import { MAP_INFO, MAP_MARKS } from '../art/map.js';
import { J } from '../narrative/text.js';
import { OC, occAt, TEMPERS, harshWord, resistWord, placeName, mi } from './state.js';
import './world.js';
import './life.js';

export { occAt, TARGETS, FRONT, harshWord, resistWord } from './state.js';
export { occMonth, occupy, liberate } from './world.js';
export const occState = OC;

/** 이번 달 이 고장의 점령 한 줄 (없으면 null) */
export function occLine(g) {
  if (!g?.occ || !g.date || !g.life || g.life.travel) return null;
  const pl = g.life.place, o = occAt(g, pl), S = g.occ;
  if (o) {
    if (o.ceded && mi(g) - o.since > 12 * 20) return '관청 간판의 제국 글씨가 비바람에 바랬다. 아이들은 학교에서 제국 말로 노래를 배운다. 늙은이들만 옛 이름으로 고장을 부른다.';
    if (o.resist >= 50) return '벽마다 밤새 누가 쓴 글씨를 병사들이 아침마다 긁어낸다. 해 질 녘이면 골목에서 사람이 사라진다.';
    if (o.harsh >= 50) return '광장 교수대에 이번 주에도 누군가 매달렸다. 사람들은 그 앞을 지날 때 땅만 본다.';
    return `성문 위에 검은 독수리 깃발이 걸려 있다. 해 질 녘이면 통금 종이 울리고, 제국 병사들이 골목마다 둘씩 짝지어 돈다.`;
  }
  const t = S.tried?.[pl];
  if (t != null && mi(g) - t <= 24) return '해방 기념 깃발이 아직 걸려 있다. 그 아래, 머리를 짧게 깎인 사람들이 고개를 숙이고 지나간다.';
  const past = (S.past ?? []).filter((x) => x.pl === pl).slice(-1)[0];
  if (past && g.date.year - past.to <= 10 && past.years >= 1) return `${past.years}년의 점령을 겪은 고장이다. 늙은이들은 아직 제국 병사의 군화 소리를 꿈에서 듣는다고 한다.`;
  return null;
}

/** 화면 한 장 */
export function occInfo(g) {
  const S = OC(g), now = mi(g), pl = g.life?.place ?? 'ern';
  return {
    places: Object.entries(S.places).map(([id, o]) => ({ id, name: placeName(id), lord: o.lord, temper: TEMPERS[o.temper], years: Math.floor((now - o.since) / 12), ceded: o.ceded, harsh: Math.round(o.harsh), harshWord: harshWord(o.harsh), resist: Math.round(o.resist), resistWord: resistWord(o.resist), collab: Math.round(o.collab), levies: o.levies })),
    here: occAt(g, pl) ? placeName(pl) : null,
    past: S.past.slice(-6).reverse().map((x) => ({ name: placeName(x.pl), from: x.from, to: x.to, years: x.years, how: x.how })),
    me: { post: S.me.post ? placeName(S.me.post) : null, collab: S.me.collab, resist: S.me.resist, informed: S.me.informed, hid: S.me.hid, bond: S.me.bond, tried: S.me.tried, fled: S.me.fled },
    log: S.log.slice(-10).reverse(),
  };
}

// 대륙 지도: 점령된 고장
MAP_INFO.push((g, place) => {
  const o = place?.id ? occAt(g, place.id) : null;
  if (!o) return '';
  return `<p class="note"><b>${o.ceded ? '발하르트 땅' : '점령지'}</b> · ${J(o.lord, '이/가')} 다스린다 · ${harshWord(o.harsh)}</p>`;
});

// 38단계 지도 표: 점령된 고장에 험한 곳 표
MAP_MARKS.push((g) => Object.entries(g?.occ?.places ?? {}).map(([pl, o]) => ({ place: pl, kind: 'danger', text: `${o.ceded ? '발하르트 제국 땅이 되었다' : '발하르트군이 점령하고 있다'}. ${harshWord(o.harsh)}.` })));
