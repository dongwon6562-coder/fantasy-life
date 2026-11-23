// 37단계: 무법 지대와 산적 무리 (도우미스레드3). 들판과 길 위의 무리: 산채, 두목, 길목 털기와 통행세, 의적, 토벌대와 현상금, 잡혀가기와 몸값.
// 플레이어 없이도 무법한 고장(흉년·전쟁·분노·점령) 근처 숲에 무리가 서고, 커지고, 토벌되거나 흩어지거나 사면받는다.
// 꺾인 봉기(revolt)의 잔당과 전쟁 뒤 탈영병이 무리가 된다. 도시 조직(crime·underworld)과는 따로.
// 화면용: outlawsLine(g) 이번 달 이 고장의 산적 한 줄(없으면 null), outlawsInfo(g) 한 장, outlawAt(g, 고장), outlawsOnRoad(g, a, b) 이 길을 노리는 무리
import { MAP_INFO, MAP_MARKS } from '../art/map.js';
import { J } from '../narrative/text.js';
import { OS, LAIRS, bandAt, myBand, bandOnRoad, liveBands, bounty, menWord, heatWord, endWord, placeName, lawless, mi } from './state.js';
import './world.js';
import './life.js';

export { LAIRS, lawless, bounty, menWord, heatWord } from './state.js';
export { outMonth, purge } from './world.js';
export const outlawsState = OS;
export const outlawAt = bandAt;
export const outlawsOnRoad = bandOnRoad;

/** 이번 달 이 고장의 산적 한 줄 (없으면 null) */
export function outlawsLine(g) {
  if (!g?.outlaws || !g.date || !g.life) return null;
  const S = g.outlaws, mine = myBand(g);
  if (g.life.travel) {
    const t = g.life.travel, b = t.sea ? null : bandOnRoad(g, t.from, t.to);
    if (b && b.id !== mine?.id) return b.toll ? `길가 나무에 붉은 천이 묶여 있다. ${J(b.name, '이/가')} 통행세를 받는 길이라는 표시다.` : '마부가 자꾸 숲 쪽을 흘끔거린다. 이 길에서 짐수레가 털렸다는 이야기를 들은 모양이다.';
    return null;
  }
  const pl = g.life.place;
  if (mine && mine.lair === pl) return S.me.role === 'chief' ? `모닥불 둘레에 ${Math.round(mine.men)}명. 모두 내 말 한마디를 기다린다. 산 밑 장터 기둥엔 내 얼굴을 닮은 그림이 붙어 있다.` : `${LAIRS[pl].name} 산채의 아침. 누군가 화살촉을 갈고, 누군가 어젯밤 털이 몫을 두고 다툰다.`;
  const b = bandAt(g, pl);
  if (b) {
    if (b.heat >= 40) return `장터 기둥에 ${J(b.chief, '을/를')} 그린 방이 붙어 있다. 목에 은화 ${bounty(b)}닢.`;
    if (b.noble && g.world?.famine) return `아이들이 ${J(b.chief, '을/를')} 노래하며 논다. 영주관 사람이 지나가면 노래가 뚝 그친다.`;
    if (b.toll) return `${LAIRS[pl].name} 쪽 길로 가는 사람은 은화 몇 닢을 따로 챙겨 간다.`;
    return `해 지면 ${LAIRS[pl].name} 쪽으로는 아무도 가지 않는다.`;
  }
  const past = S.past.filter((x) => x.lair === pl).slice(-1)[0];
  if (past && past.end === 'crushed' && g.date.year - past.to <= 2) return `장터 교수대에 매달렸던 ${J(past.chief, '을/를')} 두고 아직도 말이 많다. 도둑놈이라는 사람도, 아까운 사람이라는 사람도 있다.`;
  return null;
}

/** 화면 한 장 */
export function outlawsInfo(g) {
  const S = OS(g), pl = g.life?.place ?? 'ern', now = mi(g), b = myBand(g);
  return {
    bands: liveBands(g).map((x) => ({ id: x.id, name: x.name, chief: x.chief, lair: x.lair, lairName: LAIRS[x.lair]?.name, place: placeName(x.lair), men: Math.round(x.men), menWord: menWord(x.men), noble: x.noble, toll: x.toll, deal: x.deal, fame: Math.round(x.fame), heat: Math.round(x.heat), heatWord: heatWord(x.heat), bounty: x.heat >= 40 ? bounty(x) : 0, years: Math.floor((now - x.since) / 12), mine: S.me.band === x.id })),
    here: bandAt(g, pl)?.name ?? null,
    lawless: Math.round(lawless(g, pl)),
    past: S.past.slice(-6).reverse().map((x) => ({ name: x.name, chief: x.chief, place: placeName(x.lair), from: x.from, to: x.to, end: x.end, endWord: endWord(x.end), noble: !!x.noble })),
    me: { band: b?.name ?? null, role: S.me.role, rides: S.me.rides, robbed: S.me.robbed, tolls: S.me.tolls, ransom: S.me.ransom, hunted: S.me.hunted, informed: S.me.informed, gave: S.me.gave, captive: !!S.me.captive },
    log: S.log.slice(-10).reverse(),
  };
}

// 대륙 지도: 산채가 있는 고장
MAP_INFO.push((g, place) => {
  const b = place?.id ? bandAt(g, place.id) : null;
  if (!b) return '';
  return `<p class="note"><b>${b.noble ? '의적' : '산적'}</b> · ${LAIRS[b.lair].name}에 ${b.name} · ${heatWord(b.heat)}</p>`;
});

// 38단계 지도 표: 산채가 있는 고장에 험한 곳 표
MAP_MARKS.push((g) => liveBands(g).map((b) => ({ place: b.lair, kind: 'danger', text: `${LAIRS[b.lair].name}에 ${b.name}${b.toll ? ', 길목에서 통행세를 받는다' : ''}${b.heat >= 40 ? `, 두목 목에 은화 ${bounty(b)}닢` : ''}.` })));
