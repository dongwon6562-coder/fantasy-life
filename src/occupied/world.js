// 점령과 해방의 한 달: 발하르트 전선을 따라 고장이 점령되고, 강화로 넘어가고, 다시 풀린다. 플레이어 없이도 굴러간다.
import { WORLD_TICKS } from '../world.js';
import { J } from '../narrative/text.js';
import { OC, FRONT, OFFICERS, TEMPERS, clamp, mi, placeName, olog, occRng, syncOcc } from './state.js';

const playerAt = (g, pl) => !!g.life && !g.life.travel && g.life.place === pl;

export function occupy(g, pl, rng, say) {
  const S = OC(g);
  if (S.places[pl]) return null;
  const temper = rng.pick(Object.keys(TEMPERS));
  const rvOld = (g.revolt?.past ?? []).filter((x) => x.place === pl).map((x) => `${x.y}:${x.leader}`);
  const o = { since: mi(g), rvOld, lord: rng.pick(OFFICERS), temper, harsh: temper === 'cruel' ? 60 : temper === 'fair' ? 20 : 35, resist: 10, collab: 8, ceded: false, levies: 0 };
  S.places[pl] = o;
  say(`${placeName(pl)} 성문에 발하르트 제국의 검은 독수리 깃발이 올랐다. ${J(o.lord, '이/가')} 점령 영주로 들어앉았다. 피란 수레가 남쪽 길을 메웠다.`, true);
  olog(g, `${J(placeName(pl), '이/가')} 발하르트군에 점령되었다 (${o.lord}).`);
  if (g.revolt?.anger && Number.isFinite(g.revolt.anger[pl])) g.revolt.anger[pl] = clamp(g.revolt.anger[pl] + 15, 0, 100);
  return o;
}
export function liberate(g, pl, how, say) {
  const S = OC(g), o = S.places[pl];
  if (!o) return false;
  delete S.places[pl];
  const years = Math.round((mi(g) - o.since) / 12);
  S.past.push({ pl, from: Math.floor(o.since / 12), to: g.date.year, how, years });
  if (S.past.length > 12) S.past.shift();
  S.tried[pl] = mi(g);
  syncOcc(g);
  const word = how === 'won' ? '레오니아군이 성문을 열고 들어왔다' : how === 'rising' ? '고장 사람들이 들고일어나 점령군을 몰아냈다' : how === 'treaty' ? '협상으로 제국군이 물러갔다' : '제국군이 스스로 물러갔다';
  say(`${placeName(pl)} 해방. ${word}. ${years >= 2 ? `${years}년 만이다. ` : ''}종이 울렸다. 그리고 사람들은 누가 점령군에 붙었는지 세기 시작했다.`, true);
  olog(g, `${J(placeName(pl), '이/가')} 풀려났다 (${years}년 만).`);
  if (g.realms && g.life?.place === pl) g.realms.cur = 'leonia';
  return true;
}
function cede(g, pl, say) {
  const o = OC(g).places[pl];
  if (!o || o.ceded) return;
  o.ceded = true;
  syncOcc(g);
  if (g.realms && playerAt(g, pl)) g.realms.cur = 'valhart';
  say(`강화 조약에 따라 ${J(placeName(pl), '은/는')} 발하르트 제국 땅이 되었다. 관청 간판이 제국 말로 바뀌고, 세리는 제국 은화로만 세금을 받는다.`, true);
  olog(g, `${J(placeName(pl), '이/가')} 강화로 제국 땅이 되었다.`);
}

export function occMonth(g, say) {
  if (!g.occ || !g.realm) return;
  const S = OC(g), b = g.realm.balhart, rng = occRng(g, 1);
  const wasWar = !!S.war;
  // 전쟁 중: 전선을 따라 점령과 탈환
  if (b.war) {
    if (!S.war) S.forts = b.fortsLost ?? 0;
    S.war = true;
    for (const f of FRONT) if (!S.places[f.pl] && b.front <= f.at && rng.chance(0.12)) { occupy(g, f.pl, rng, say); break; }
    // 밀어붙이면 가장 늦게 빼앗긴 곳부터 되찾는다
    const held = FRONT.filter((f) => S.places[f.pl] && !S.places[f.pl].ceded).reverse();
    if (held.length && b.front >= held[0].at + 3 && rng.chance(0.1)) liberate(g, held[0].pl, 'won', say);
  } else if (wasWar) {
    // 전쟁이 막 끝났다: 진 강화면 넘어가고, 이기면 다 풀리고, 휴전이면 반반
    S.war = false;
    const lost = (b.fortsLost ?? 0) > (S.forts ?? 0), won = !lost && b.tension === 25;
    for (const pl of Object.keys(S.places)) {
      if (won) liberate(g, pl, 'won', say);
      else if (lost) cede(g, pl, say);
      else if (!S.places[pl].ceded) (rng.chance(0.5) ? liberate(g, pl, 'treaty', say) : cede(g, pl, say));
    }
  }
  // 점령지마다: 가혹함과 저항과 붙는 사람
  for (const [pl, o] of Object.entries(S.places)) {
    const pr = occRng(g, 11 + pl.length * 7);
    const pull = o.temper === 'cruel' ? 70 : o.temper === 'strict' ? 45 : o.temper === 'greedy' ? 40 : 22;
    o.harsh = clamp(o.harsh + (pull + o.resist * 0.25 - o.harsh) * 0.03 + pr.normal(0, 1), 0, 100);
    o.resist = clamp(o.resist + o.harsh * 0.007 - o.collab * 0.005 - (o.ceded ? 0.08 : 0) + pr.normal(0, 0.6), 0, 100);
    o.collab = clamp(o.collab + (o.ceded ? 0.05 : 0.02) + (o.temper === 'fair' ? 0.04 : 0) - o.harsh * 0.0015 + pr.normal(0, 0.3), 0, 100);
    // 넘어간 땅은 세월이 흐르면 조금씩 누그러진다
    if (o.ceded && mi(g) - o.since > 12 * 25) o.harsh = clamp(o.harsh - 0.05, 0, 100);
    // 저항이 분노가 되어 봉기로 (revolt가 맡는다)
    if (g.revolt?.anger && Number.isFinite(g.revolt.anger[pl])) g.revolt.anger[pl] = clamp(Math.max(g.revolt.anger[pl], o.resist * 0.8), 0, 100);
    // 징발
    if (pr.chance(0.02 + o.harsh * 0.0004)) { o.levies += 1; if (pr.chance(0.3)) say(`${placeName(pl)} 점령군이 곡식과 말을 징발해 갔다. 씨앗 자루까지 가져갔다고 한다.`); }
    // 보복
    if (o.resist >= 45 && pr.chance(0.012)) { o.harsh = clamp(o.harsh + 8, 0, 100); say(`${placeName(pl)}에서 제국 보급 수레가 불탔다. 이튿날 점령군이 마을 장정 열을 광장에 세웠다.`); olog(g, `${placeName(pl)}에서 저항과 보복.`); }
    // 봉기가 이긴 곳은 풀린다
    // 점령 뒤에 그 고장에서 이긴 봉기 (점령 때 이미 있던 기록은 빼고)
    const won = (g.revolt?.past ?? []).find((x) => x.place === pl && x.out === 'won' && !(o.rvOld ?? []).includes(`${x.y}:${x.leader}`) && x.y * 12 + 12 >= o.since);
    if (won || (o.resist >= 92 && pr.chance(0.02))) { liberate(g, pl, 'rising', say); continue; }
    // 넘어간 땅을 다음 전쟁에서 되찾는 건 위의 전선이 맡는다. 오래된 땅은 아주 드물게 협상으로
    if (o.ceded && mi(g) - o.since > 12 * 40 && pr.chance(0.0015)) liberate(g, pl, 'treaty', say);
  }
  // 심판은 열 해 지나면 잊힌다
  for (const [pl, t] of Object.entries(S.tried)) if (mi(g) - t > 120) delete S.tried[pl];
}

WORLD_TICKS.push((g, worldRng, say) => occMonth(g, say));
