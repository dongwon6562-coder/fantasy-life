// 성유물의 달 흐름: 플레이어가 없어도 유물이 옮겨 다닌다. 묻힌 것은 도굴꾼이 파내고, 도굴꾼은 수집가·교단·마탑·왕실·검은 새벽에 판다.
// 보물고에서 도둑맞고, 내전에 잃어버리고, 큰 인물의 손에 들어갔다가 그가 죽으면 다시 묻힌다. 드물게, 무겁게.
// 교단이 성녀의 기도서를 쥐고 있으면 봉인이 조금 덜 흔들리고, 검은 새벽이 유물을 쥐면 봉인이 깎인다. 굴림이 많아 따로 난수를 쓴다.
import { WORLD_TICKS } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { L } from '../adventure/core.js';
import { RS, RELICS, RELIC_IDS, HOLDERS, clamp, mi, rlog, placeName, relicName, hear } from './state.js';

export const relicRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 401) ^ Math.imul(mi(g) * 97 + salt + 53, 2246822519)) | 0 });
const here = (g) => (g.life ? L(g).place : 'ern');
const near = (g, pl) => { const h = here(g); return !!pl && (pl === h || !!PLACES[h]?.links?.[pl]); };
const era = (g) => g.realm?.era ?? 0;
const civilWar = (g) => g.realm?.succession === 'civilwar';

// 유물을 옮긴다. to: holder, opts{ place, legend }
export function moveRelic(g, id, to, opts = {}, say) {
  const x = RS(g).r[id], from = x.holder;
  x.holder = to; x.legend = opts.legend ?? null; x.moves += 1; x.since = mi(g);
  x.place = opts.place !== undefined ? opts.place : HOLDERS[to].seat ?? x.place;
  if (to !== 'me') x.bond = null;
  const text = opts.text ?? `${relicName(id)}: ${HOLDERS[from].name === '아무도' ? '땅속' : HOLDERS[from].name}에서 ${to === 'lost' ? '땅속으로' : J(HOLDERS[to].name, '으로/로')}.`;
  rlog(g, text);
  if (say) say(opts.news ?? text, !!opts.big, x.place ?? opts.near ?? null);
  if (opts.heard || near(g, x.place)) hear(g, id);
  return x;
}

const fitLegend = (g, id, rng) => {
  const fit = RELICS[id].fit;
  const cand = (g.legends?.list ?? []).filter((p) => p.alive && !p.timeless && fit.includes(p.kind) && p.at && PLACES[p.at]);
  return cand.length ? rng.pick(cand) : null;
};
const buyer = (rng, id) => {
  const r = rng.next();
  if (r < 0.38) return 'collector';
  if (r < 0.58) return 'church';
  if (r < 0.74) return 'tower';
  if (r < 0.86) return 'crown';
  if (r < 0.94) return 'cult';
  return RELICS[id].home === 'dwarf' ? 'dwarf' : 'collector';
};

export function relicMonth(g) {
  if (!g.relic || g.over) return [];
  const S = RS(g), news = [];
  const say = (text, big = false, pl = null) => news.push({ text, big, pl });
  RELIC_IDS.forEach((id, i) => {
    const x = S.r[id], rng = relicRng(g, i * 13 + 3), d = RELICS[id], nm = relicName(id);
    switch (x.holder) {
      case 'lost':
        if (rng.chance(0.0009 * (1 + era(g) * 0.2))) moveRelic(g, id, 'robbers', { place: x.place, news: `${placeName(x.place)} 근처에서 도굴꾼들이 오래된 무언가를 파냈다는 소문이 돈다. ${d.kind} 하나라고 한다.` }, say);
        break;
      case 'robbers':
        if (rng.chance(0.035)) {
          const to = buyer(rng, id);
          moveRelic(g, id, to, { news: to === 'cult' ? `도굴꾼들이 팔아넘긴 ${d.kind} 하나가 사라졌다. 검은 새벽이 사 갔다는 말이 있다.` : `${J(HOLDERS[to].name, '이/가')} 도굴꾼에게서 ${J(nm, '을/를')} 사들였다는 소문이 돈다. ${to === 'collector' ? '값이 금화 천 닢이었다는 사람도 있다.' : ''}`.trim(), big: to !== 'collector', near: x.place }, say);
        } else if (rng.chance(0.004)) moveRelic(g, id, 'lost', { place: x.place, news: `${placeName(x.place)}의 도굴꾼 무리가 서로 칼을 들이댔다. 그들이 파낸 것은 다시 어딘가에 묻혔다고 한다.` }, say);
        break;
      case 'collector':
        if (rng.chance(0.003)) { const to = rng.pick(['crown', 'church', 'tower', RELICS[id].home]); moveRelic(g, id, to, { news: `바르카의 수집가가 ${J(nm, '을/를')} ${HOLDERS[to].name}에 넘겼다. 값은 아무도 모른다.`, big: true }, say); }
        else if (rng.chance(0.002)) moveRelic(g, id, 'robbers', { place: 'barka', news: '바르카 상인의 비밀 진열실이 털렸다. 도둑들이 무엇을 들고 갔는지 상인은 끝내 말하지 않는다.' }, say);
        break;
      case 'cult':
        if (rng.chance(0.006)) moveRelic(g, id, 'church', { news: `이단심문소가 검은 새벽의 지하 제단을 덮쳐 ${J(nm, '을/를')} 되찾았다고 교단이 선포했다.`, big: true, heard: true }, say);
        break;
      case 'legend': {
        const p = g.legends?.list?.find((q) => q.id === x.legend);
        if (!p || !p.alive) moveRelic(g, id, 'lost', { place: p?.at && PLACES[p.at] ? p.at : 'graubel', news: `${p ? `${p.title} ${J(p.name, '이/가')}` : '그 사람이'} 죽은 뒤, 그가 지니던 ${J(nm, '이/가')} 사라졌다. 함께 묻혔다는 말도, 누가 가져갔다는 말도 있다.`, big: true, heard: true }, say);
        else { x.place = PLACES[p.at] ? p.at : x.place; if (rng.chance(0.002)) { const to = rng.pick(['church', 'crown', 'tower']); moveRelic(g, id, to, { news: `${p.title} ${J(p.name, '이/가')} ${J(nm, '을/를')} ${HOLDERS[to].name}에 바쳤다.`, big: true, heard: true }, say); } }
        break;
      }
      case 'me': break;
      default: { // crown·church·tower·dwarf: 모셔 둔 곳
        if (x.holder === 'crown' && civilWar(g) && rng.chance(0.012)) { moveRelic(g, id, 'lost', { place: 'verden', news: `내전 통에 왕도 보물고가 털렸다. ${J(nm, '이/가')} 사라졌다. 베르덴 쪽으로 달아난 패잔병이 들고 갔다는 말이 있다.`, big: true, heard: true }, say); break; }
        if (rng.chance(0.0007)) {
          const cult = rng.chance(0.3);
          moveRelic(g, id, cult ? 'cult' : 'robbers', { place: cult ? null : x.place, news: `${HOLDERS[x.holder].where}에서 ${J(nm, '이/가')} 사라졌다. ${cult ? '경비병 둘이 목이 꺾인 채 발견되었다. 벽에 검은 해가 그려져 있었다.' : '자물쇠는 멀쩡했다. 안에 내통한 자가 있다는 말이 돈다.'}`, big: true, near: x.place }, say);
          break;
        }
        if (rng.chance(0.0004)) { const p = fitLegend(g, id, rng); if (p) moveRelic(g, id, 'legend', { legend: p.id, place: p.at, news: `${J(nm, '이/가')} ${p.title} ${J(p.name, '을/를')} 골랐다. ${J(HOLDERS[x.holder].name, '이/가')} 그에게 유물을 내주었다고 한다.`, big: true, heard: true }, say); }
      }
    }
  });
  // 봉인: 교단이 성녀의 기도서를 쥐면 조금 버티고, 검은 새벽이 유물을 쥐면 깎인다 (작게)
  const r = g.realm;
  if (r && Number.isFinite(r.seal) && !g.seal?.ending) {
    if (S.r.rl_book.holder === 'church') r.seal = clamp(r.seal + 0.004, 0, 100);
    r.seal = clamp(r.seal - RELIC_IDS.filter((id) => S.r[id].holder === 'cult').length * 0.012, 0, 100);
  }
  return news;
}

WORLD_TICKS.push((g, worldRng, say) => {
  for (const n of relicMonth(g) ?? []) if (n.big || n.pl == null || near(g, n.pl)) say(n.text, n.big);
});
