// 대륙 지도의 버튼과 덧붙는 설명: 길 떠나기, 다른 나라(src/realms)의 법·신앙·나와의 관계, 국경 넘기.
import { crownBox } from './crowns.js';
import { MAP_ACTIONS, MAP_INFO } from '../art/map.js';
import { L, traveling, isAdult, showScene } from '../adventure/core.js';
import { PLACES, travelMonths, fareOf } from '../places.js';
import { REALMS, realmInfo, realmOf, currentRealm, borderNote, crossBorder } from '../realms/index.js';
import { autosave } from '../save.js';
import { isPort, seaRoutesFrom } from '../sea/index.js';
import { J } from '../narrative/text.js';
import { rulerName } from '../world.js';
import { esc } from './util.js';

// 지도에서 고른 곳이 어느 나라인가: 게임 장소면 places 기준, 아니면 지도 글 기준
const nationAt = (place) => (place.id && PLACES[place.id] ? realmOf(place.id) : place.nation ?? null);

// 게임 장소: '길 떠나기' 장면을 그곳을 맨 앞에 두고 띄운다
MAP_ACTIONS.push((g, place) => {
  if (!place.id || !PLACES[place.id] || g.over) return [];
  const life = L(g);
  if (place.id === life.place) return [];
  // 아직 열리지 않은 숨은 고장(개척 전의 빈 땅 등)은 길로 갈 수 없다: 개척단이나 그 갈래의 장면으로만 들어간다
  if (PLACES[place.id].hidden && !PLACES[place.id].open?.(g)) return [];
  if (!isAdult(g)) return [{ label: '열다섯 살이 되면 떠날 수 있다', run: () => {} }];
  if (traveling(g) || g.pendingEvent) return [];
  const m = travelMonths(life.place, place.id);
  const abroad = realmOf(place.id) !== currentRealm(g);
  // 바다로만 닿는 곳(섬, 바다 건너): 땅길은 없다. 항구에 있으면 부두로, 아니면 항구로 가라고 알려 준다
  const sea = (() => { try { return isPort(life.place) ? seaRoutesFrom(g, life.place).find((r) => r.to === place.id) : null; } catch { return null; } })();
  if (sea) return []; // 배 타기 버튼은 src/sea가 따로 단다
  if (m >= 99) return [{ label: isPort(life.place) ? '여기서는 그리로 가는 배가 없다. 다른 항구에서 탄다' : '배로만 갈 수 있다. 먼저 항구로 가서 배를 탄다', run: () => {} }];
  return [{
    label: `길 떠나기 (여기까지 ${m}달, 은화 ${fareOf(m)}닢)`,
    run: () => { showScene(g, { kind: 'travel', at: life.place, to: place.id, abroad }); autosave(g); },
  }];
});

// 다른 나라 땅(나라 이름이나 게임에 없는 고을): 그 나라 수도로 가는 길을 짚는다
MAP_ACTIONS.push((g, place) => {
  if (place.id && PLACES[place.id]) return [];
  const id = nationAt(place);
  const r = REALMS[id];
  if (!r || g.over || id === currentRealm(g)) return [];
  if (!isAdult(g)) return [{ label: '열다섯 살이 되면 국경을 넘을 수 있다', run: () => {} }];
  if (traveling(g) || g.pendingEvent) return [];
  const cap = PLACES[r.capital];
  if (travelMonths(L(g).place, r.capital) >= 99) return [{ label: `${J(r.short, '은/는')} 배로만 갈 수 있다. 항구에서 배를 탄다`, run: () => {} }];
  return [{
    label: `${J(r.short, '으로/로')} 떠나기 (${cap?.name ?? '수도'}까지 ${travelMonths(L(g).place, r.capital)}달)`,
    run: () => { if (crossBorder(g, id)) autosave(g); },
  }];
});

// 나라 정보: 다스리는 이, 법, 신앙, 물가, 나와의 관계, 국경 안내
const STANDING_CLS = { 고향: 'home', 귀화: 'home', 망명: 'asylum', 추방됨: 'banned' };
MAP_INFO.push((g, place) => {
  const id = nationAt(place);
  if (!REALMS[id]) return '';
  const r = realmInfo(g, id);
  if (!r) return '';
  const note = place.id && PLACES[place.id] ? borderNote(g, place.id) : null;
  const rows = [
    // 레오니아 왕은 세계 흐름에 따라 바뀐다 (설정 문서의 첫 왕 대신 지금 왕)
    ['다스리는 이', `${id === 'leonia' ? ((n) => (/섭정|국왕/.test(n) ? n : `국왕 ${n}`))(rulerName(g)) : r.ruler} (${r.rule})`],
    ['법', r.law],
    ['신앙', r.faith],
    ['신분', r.status],
    ['물가', r.priceWord],
  ];
  const crown = id === 'leonia' ? '' : crownBox(g, id);
  if (crown) rows.shift(); // 다스리는 이는 왕가 칸이 더 자세히 말한다
  if (!r.citizen) rows.push(['귀화', r.naturalizeBlock ? `${r.naturalize} (${r.naturalizeBlock})` : r.naturalize]);
  return `<div class="realm-box">
    <div class="realm-top"><strong>${esc(r.name)}</strong><span class="standing ${STANDING_CLS[r.standing] ?? ''}">${esc(r.standing)}${r.bannedMonths ? ` · ${Math.ceil(r.bannedMonths / 12)}해 더` : ''}${r.here ? ' · 지금 여기' : ''}</span></div>
    <dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    ${crown}
    ${note ? `<p class="border">${esc(note)}</p>` : ''}
  </div>`;
});
