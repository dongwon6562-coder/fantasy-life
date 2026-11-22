// 33단계: 마족. 봉인 뒤에도 얼음 해협 너머에 살아남은 마족 무리와 세 마왕의 서로 다른 셈.
// 국경 습격, 말이 통하는 마족(회색 망토)과의 거래·휴전·배신, 마신교 집에 놓는 상자, 반마족 이웃, 집안에 숨은 마족 피,
// 얼음 해협을 건너 황혼 교역소·뼈 언덕·사슬 거리·마신의 관·침묵의 경계비까지.
// 화면용: demonsLine(g) 이번 달 이 고장에서 보이는 마족 한 줄(없으면 null), demonsInfo(g) 한 장
import { MAP_INFO } from '../art/map.js';
import { J } from '../narrative/text.js';
import { PLACES } from '../places.js';
import { DM, LORDS, RANKS, NORTH, PORTS, DESTS, here, mi } from './state.js';
import { demonsMonth } from './life.js';

export { LORDS, RANKS, NORTH, DESTS, DEST_IDS } from './state.js';
export { demonsMonth } from './life.js';
export const demonsState = DM;

export const raidWord = (r, truce) => (truce ? '휴전 중이다. 아무도 믿지 않는다' : r >= 70 ? '해협 너머에서 북소리가 그치지 않는다' : r >= 50 ? '습격이 잦다' : r >= 30 ? '가끔 척후가 넘어온다' : '해협이 조용하다');
const pious = (pl) => PLACES[pl]?.realm === 'holy' || ['leocast', 'solaris', 'verden', 'harfen'].includes(pl);

/** 이번 달 이 고장에서 보이는 마족 한 줄 (없으면 null) */
export function demonsLine(g) {
  if (!g?.demons || !g.date) return null;
  const D = g.demons, pl = here(g);
  if (L_travelDemon(g)) return '해협 너머 하늘은 낮과 밤의 경계가 흐리다. 붉은 땅 위로 사람 것이 아닌 연기가 오른다.';
  if (D.blood?.shown && pious(pl)) return D.blood.known >= 2 ? '성당 앞을 지날 때마다 등 뒤에서 말소리가 멈춘다. 이마의 자국을 이제 고장 사람 반은 안다.' : '모자를 깊이 눌러쓴다. 이마의 갈아 낸 자리가 비 오는 날마다 쑤신다.';
  if (NORTH.includes(pl)) {
    if (D.truce) return '해협 섬 봉화대에 휴전 깃발이 걸려 있다. 성벽 위 병사들은 그래도 활을 내려놓지 않는다.';
    if (D.raid >= 70) return '성벽 위 화로가 밤새 꺼지지 않는다. 얼음 해협 너머에서 북소리가 들린다고 보초들이 말한다.';
    if (D.raid >= 45) return '바깥 마을 사람들이 짐을 반쯤 싸 둔 채 산다. 경보종 줄을 잡는 아이가 정해져 있다.';
    return '해협에 안개가 낮게 깔렸다. 늙은 어부들은 안개 너머를 보지 않으려고 고개를 돌린다.';
  }
  if (D.contact && !D.contact.gone && PORTS.includes(pl)) return `부두 끝 창고 그늘에 회색 망토가 걸려 있다. ${J(D.contact.name, '이/가')} 와 있다는 뜻이다.`;
  return null;
}
function L_travelDemon(g) { return !!g.life?.travel?.demon; }

/** 화면 한 장 */
export function demonsInfo(g) {
  const D = DM(g), n = g.realm?.north ?? {};
  return {
    raid: Math.round(D.raid), raidWord: raidWord(D.raid, D.truce), raids: D.raids,
    truce: D.truce ? { left: Math.max(0, D.truce.until - mi(g)) } : null,
    lords: Object.entries(LORDS).map(([id, x]) => ({ id, name: x.name, title: x.title, land: x.land, rank: x.rank, stance: x.stance, hunger: id === 'red' ? Math.round(n.garbes ?? 30) : null })),
    ranks: RANKS,
    contact: D.contact ? { name: D.contact.name, trust: Math.round(D.contact.trust), deals: D.contact.deals, gone: !!D.contact.gone } : null,
    // 핏줄은 몸에 드러났을 때만 보인다 (모른 채 사는 사람은 모른다)
    blood: D.blood.shown ? { known: D.blood.known, hunted: D.blood.hunted } : null,
    away: g.life?.travel?.demon ? DESTS[g.life.travel.demon]?.name ?? null : null,
    me: { ...D.me },
    log: D.log.slice(-10).reverse(),
  };
}

// 대륙 지도: 북부 고장에 국경의 기세
MAP_INFO.push((g, place) => {
  if (!g?.demons || !place?.id || !NORTH.includes(place.id)) return '';
  return `<p class="note"><b>얼음 해협</b> · ${raidWord(g.demons.raid, g.demons.truce)}</p>`;
});
