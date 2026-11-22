// 마나의 달 흐름: 플레이어가 없어도 대륙의 마나가 출렁이고, 샘이 세지거나 마르고, 샘 주인이 바뀌고, 짙은 해에는 마나 폭풍이 인다.
// 마나가 짙으면 마물이 조금씩 늘고(realm.monsters), 폭풍이 지나간 고장은 마물 기세가 오르고(wilds), 마석 시세가 내린다(trade drift).
// 굴림이 많아 따로 난수를 쓴다.
import { WORLD_TICKS } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { J } from '../narrative/text.js';
import { L, queueScene, sceneQueued } from '../adventure/core.js';
import { MS, WELLS, WELL_IDS, HOLDERS, clamp, mi, mlog, placeName, syncMana, tideWord } from './state.js';

export const manaRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 307) ^ Math.imul(mi(g) * 89 + salt + 43, 2246822519)) | 0 });
const here = (g) => (g.life ? L(g).place : 'ern');
const near = (g, pl) => { const h = here(g); return pl === h || !!PLACES[h]?.links?.[pl]; };
const era = (g) => g.realm?.era ?? 0;
const playerAt = (g, pl) => !!g.life && L(g).place === pl && !L(g).travel;
const MARKETS = ['harfen', 'verden', 'leocast', 'eisen', 'solaris', 'serenia', 'barka', 'graubel', 'portel', 'fur', 'hammer', 'klein', 'gorge', 'silverleaf', 'ern', 'gruental'];

// 샘을 노리는 쪽 (주인이 아닌 쪽에서 고른다)
const RIVALS = { wl_serenia: ['church', 'rogue'], wl_silver: ['tower', 'rogue', 'lord'], wl_solaris: ['tower', 'rogue'], wl_gorge: ['tower', 'rogue'], wl_graubel: ['tower', 'rogue', 'wardens'], wl_verden: ['lord', 'tower', 'rogue'], wl_estella: ['tower', 'wardens', 'church'] };

export function seize(g, id, by, say) {
  const S = MS(g), w = S.wells[id], d = WELLS[id], old = w.holder;
  w.holder = by; w.guard = by === 'rogue' ? 35 : 50; w.seized += 1;
  if (S.me.warden === id && by !== 'wardens') { S.me.warden = null; }
  const text = `${placeName(d.place)} ${d.name}의 주인이 바뀌었다. ${J(HOLDERS[by].name, '이/가')} ${J(HOLDERS[old].name, '을/를')} 몰아냈다.`;
  say?.(text, false, d.place);
  mlog(g, text);
}

export function manaMonth(g) {
  if (!g.mana || g.over) return [];
  const S = MS(g), rng = manaRng(g, 1), news = [];
  const say = (text, big = false, pl = null) => news.push({ text, big, pl });
  // 대륙의 마나: 수십 년 주기 + 잔물결
  S.phase += (Math.PI * 2) / S.period;
  if (S.phase >= Math.PI * 2) { S.phase -= Math.PI * 2; S.period = rng.int(12 * 28, 12 * 48); S.amp = rng.float(40, 75); }
  S.noise = clamp(S.noise * 0.93 + rng.normal(0, 2.2), -25, 25);
  const before = S.tide;
  S.tide = Math.round(clamp(S.amp * Math.sin(S.phase) + S.noise, -100, 100));
  if (g.date.month === 12) {
    S.years[g.date.year] = S.tide;
    const keys = Object.keys(S.years).map(Number).sort((a, b) => a - b);
    while (keys.length > 120) delete S.years[keys.shift()];
  }
  if (S.tide >= 45 && !S.high) { S.high = true; say(`올해는 마나가 짙다. 마탑의 수정 저울이 한쪽으로 기울었고, 샘마다 물줄기가 세졌다. 마물이 늘었다는 말과 마력을 타고난 아이가 많다는 말이 함께 돈다.`, true); mlog(g, '마나가 짙어지는 해가 왔다.'); }
  if (S.tide < 20 && S.high) S.high = false;
  if (S.tide <= -45 && !S.low) { S.low = true; say(`마나가 옅어졌다. 마석이 귀해지고 마도구 값이 오른다. 늙은 마법사들은 술식이 무겁다고 투덜거린다.`, true); mlog(g, '마나가 옅어지는 해가 왔다.'); }
  if (S.tide > -20 && S.low) S.low = false;
  if (Math.sign(before) !== Math.sign(S.tide) || g.date.month === 1) syncMana(g);

  // 마나가 짙으면 마물이 조금씩 는다 (봉인과 전쟁이 끄는 쪽보다 훨씬 약하게)
  const r = g.realm;
  if (r && Number.isFinite(r.monsters)) r.monsters = clamp(r.monsters + S.tide * 0.001, 0, 100);
  // 마석 시세: 짙으면 흔해서 싸다
  if (g.trade?.mkt) for (const pl of MARKETS) {
    const k = `${pl}:manastone`, m = (g.trade.mkt[k] ??= { drift: 0, sat: 0 });
    if (Number.isFinite(m.drift)) m.drift = clamp(m.drift - S.tide * 0.0004, -0.3, 0.3);
  }

  // 샘
  WELL_IDS.forEach((id, i) => {
    const w = S.wells[id], d = WELLS[id], wr = manaRng(g, 11 + i * 5), pn = placeName(d.place);
    const target = clamp(48 + d.base + S.tide * 0.55 - Math.min(3, Math.max(0, era(g) - 1)) * 5 - (g.later?.deplete ?? 0) * 0.1, 0, 100); // 34단계: 시대 몫은 셋까지, 그 뒤는 마석 고갈 걱정이 샘을 말린다
    w.flow = clamp(w.flow + (target - w.flow) * 0.08 + wr.normal(0, 2), 0, 100);
    if (!w.dry && w.flow < 6) { w.dry = true; say(`${pn} ${J(d.name, '이/가')} 말랐다. 샘지기들이 바닥을 들여다보며 기다린다.`, false, d.place); mlog(g, `${J(d.name, '이/가')} 말랐다.`); }
    else if (w.dry && w.flow > 18) { w.dry = false; say(`말랐던 ${pn} ${J(d.name, '이/가')} 다시 솟는다.`, false, d.place); }
    w.guard = clamp(w.guard + (w.holder === 'rogue' ? -0.3 : 0.2), 0, 100);
    // 차지 다툼: 샘이 셀수록, 마나가 짙을수록 노린다
    if (!w.dry && wr.chance(0.0035 * (w.flow / 50) * (S.tide > 40 ? 1.6 : 1))) {
      const by = wr.pick(RIVALS[id].filter((x) => x !== w.holder));
      const def = w.guard + (w.holder === 'me' || S.me.warden === id ? 20 : 0);
      if (playerAt(g, d.place) && (w.holder === 'me' || S.me.warden === id) && !sceneQueued(g, 'mana_siege')) queueScene(g, 'mana_siege', { id, by });
      else if (wr.chance(clamp(0.6 - def / 200, 0.1, 0.8))) seize(g, id, by, say);
      else { w.guard = clamp(w.guard - 10, 0, 100); say(`${J(HOLDERS[by].name, '이/가')} ${pn} ${J(d.name, '을/를')} 차지하려다 물러났다.`, false, d.place); }
    }
    // 마나 폭풍: 짙은 해에 센 샘 근처에서
    if (!S.storm && S.tide >= 40 && !w.dry && wr.chance(0.006 * (w.flow / 60))) {
      S.storm = { well: id, place: d.place, left: wr.int(1, 3) };
      w.storms += 1;
      const land = g.wilds?.land?.[d.place];
      if (land && Number.isFinite(land.level)) land.level = clamp(land.level + 8, 0, 100);
      say(`${pn} 하늘에 마나 폭풍이 일었다. 푸른 번개가 땅에서 하늘로 치솟고, 우물물이 끓고, 짐승들이 미쳐 날뛴다. 마물이 몰려든다는 소문이 돈다.`, true, d.place);
      mlog(g, `${pn}에 마나 폭풍.`);
    }
  });
  if (S.storm) {
    if (playerAt(g, S.storm.place) && !sceneQueued(g, 'mana_storm') && !S.storm.seen) { S.storm.seen = true; queueScene(g, 'mana_storm', { well: S.storm.well }); }
    S.storm.left -= 1;
    if (S.storm.left <= 0) S.storm = null;
  }
  return news;
}

WORLD_TICKS.push((g, worldRng, say) => {
  for (const n of manaMonth(g) ?? []) if (n.big || n.pl == null || near(g, n.pl)) say(n.text, n.big);
});
export { tideWord };
