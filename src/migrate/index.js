// 40단계: 피난과 이주 (도우미스레드3). 전쟁·점령·불탄 마을·용의 불·재앙·돌림병·마물·흉년이 사람들을 밀어내는 큰 이동,
// 길 위의 피난 행렬, 닫힌 성문과 난민촌, 받아 주는 고장의 이주민 거리와 텃세, 세대가 지나 섞이는 일, 고장마다 바뀌는 사람 수.
// 플레이어 없이도 세계에서 일어난다. aftermath(불탄 마을)·occupied(점령)·nature(재앙)·health(돌림병)·wilds(마물)·dragon(용의 불)을 읽기만 한다.
// 화면용: migrateLine(g) 이번 달 이 고장의 피난·이주 한 줄(없으면 null), migrateInfo(g) 한 장, popOf(g, 고장) 사람 수, campAt, quartersAt
import { MAP_INFO, MAP_MARKS } from '../art/map.js';
import { J } from '../narrative/text.js';
import { MS, WHY, MG_PLACES, popOf, baseOf, campAt, quartersAt, placeName, quarterName, tensionWord, mixWord, mi } from './state.js';
import { pushAt, gateOpen } from './world.js';
import './life.js';

export { migrateMonth, pushAt, gateOpen, pickRefuge } from './world.js';
export { popOf, campAt, quartersAt } from './state.js';
export const migrateState = MS;

/** 이번 달 이 고장의 피난·이주 한 줄 (없으면 null) */
export function migrateLine(g) {
  if (!g?.migrate || !g.date || !g.life) return null;
  const S = g.migrate, now = mi(g);
  if (g.life.travel) {
    const t = g.life.travel, f = S.flows.find((x) => (x.from === t.from || x.to === t.to) && x.left > 0);
    if (S.me.refugee) return '앞도 뒤도 사람이다. 수레, 염소, 등에 업힌 노인. 아무도 큰 소리로 말하지 않는다.';
    if (f) return `길가에 ${placeName(f.from)} 쪽에서 오는 피난 수레들이 줄지어 서 있다. 바퀴 자국마다 진흙이 고였다.`;
    return null;
  }
  const pl = g.life.place, c = campAt(g, pl);
  if (S.me.refugee?.camp && c) return `천막 틈으로 성벽이 보인다. 저 안에서는 오늘도 빵을 굽겠지.`;
  if (c) return `성문 밖 개울가에 ${placeName(c.from)} 피난민 천막이 ${c.size >= 300 ? '언덕까지 이어져 있다' : '몇십 채 서 있다'}. 성문지기가 들고 나는 사람의 얼굴을 하나하나 본다.`;
  const left = S.flows.find((f) => f.from === pl && now - f.at <= 2);
  if (left) return `빈집 문마다 빗장이 걸렸다. 떠난 사람들이 언제 돌아올지 아무도 모른다.`;
  const q = quartersAt(g, pl).sort((a, b) => b.size - a.size)[0];
  if (q && (now + q.since) % 4 === 0) return q.tension >= 35 ? `${quarterName(q)} 어귀에서 토박이 젊은이들이 서성인다. ${tensionWord(q.tension)}.` : `${quarterName(q)}에서 ${placeName(q.from)} 말씨로 흥정하는 소리가 들린다. ${mixWord(q.mix)}.`;
  return null;
}

/** 화면 한 장 */
export function migrateInfo(g) {
  const S = MS(g), pl = g.life?.place ?? 'ern', now = mi(g), r = S.me.refugee;
  return {
    here: { place: pl, name: placeName(pl), pop: popOf(g, pl), base: baseOf(pl), push: Math.round(S.push[pl] ?? 0), why: pushAt(g, pl).why ? WHY[pushAt(g, pl).why].name : null, gateOpen: gateOpen(g, pl) },
    flows: S.flows.map((f) => ({ from: placeName(f.from), to: placeName(f.to), why: WHY[f.why]?.name ?? '', size: f.size, left: f.left })),
    camps: Object.entries(S.camps).map(([p, c]) => ({ place: p, name: placeName(p), from: placeName(c.from), why: WHY[c.why]?.name ?? '', size: c.size, months: now - c.since })),
    quarters: Object.entries(S.quarters).flatMap(([p, list]) => list.map((q) => ({ place: p, name: placeName(p), quarter: quarterName(q), from: placeName(q.from), size: q.size, years: Math.floor((now - q.since) / 12), mix: Math.round(q.mix), mixWord: mixWord(q.mix), tension: Math.round(q.tension), tensionWord: tensionWord(q.tension) }))),
    pops: MG_PLACES.map((p) => ({ place: p, name: placeName(p), pop: popOf(g, p), base: baseOf(p), change: Math.round((popOf(g, p) / baseOf(p) - 1) * 100) })).filter((x) => Math.abs(x.change) >= 3),
    past: S.past.slice(-8).reverse().map((x) => ({ kind: x.kind, place: placeName(x.place), from: placeName(x.from), fromY: x.fromY, toY: x.toY, end: x.end ?? null })),
    me: { refugee: r ? { from: placeName(r.from), to: placeName(r.to), why: WHY[r.why]?.name ?? '', camp: !!r.camp, months: now - r.since } : null, settledFrom: S.me.settledFrom ? placeName(S.me.settledFrom) : null, gave: S.me.gave, worked: S.me.worked, spoke: S.me.spoke, organized: S.me.organized, wentHome: S.me.wentHome },
    log: S.log.slice(-10).reverse(),
  };
}

// 대륙 지도: 사람 수와 난민촌·이주민 거리
MAP_INFO.push((g, place) => {
  if (!place?.id || !g?.migrate || !MG_PLACES.includes(place.id)) return '';
  const c = campAt(g, place.id), qs = quartersAt(g, place.id), pop = popOf(g, place.id), d = Math.round((pop / baseOf(place.id) - 1) * 100);
  const bits = [`사람 ${pop.toLocaleString('ko-KR')}명${Math.abs(d) >= 5 ? ` (평소보다 ${d > 0 ? `${d}% 많다` : `${-d}% 적다`})` : ''}`];
  if (c) bits.push(`성 밖 난민촌 ${c.size}명`);
  for (const q of qs.slice(0, 2)) bits.push(`${quarterName(q)}(${mixWord(q.mix)})`);
  return `<p class="note"><b>사람</b> · ${bits.join(' · ')}</p>`;
});
// 지도 표: 사람들이 떠나는 고장 (험한 곳 표). 난민촌은 설명 칸(MAP_INFO)에
MAP_MARKS.push((g) => {
  if (!g?.migrate) return [];
  const out = [];
  for (const f of g.migrate.flows) out.push({ place: f.from, kind: 'danger', text: `${J(WHY[f.why]?.name ?? '난리', '을/를')} 피해 사람들이 떠난다` });
  return out;
});
