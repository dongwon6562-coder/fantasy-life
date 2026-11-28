// 경비대와 치안 (49단계): 한 달 흐름.
// - 고장마다 치안이 바탕으로 돌아가려 하고, 분노(revolt)·흉년·전쟁이 깎고, 경비대장(플레이어)의 방침이 바꾼다. 플레이어 없이도 돈다.
// - 경비대원이면: 경비대에 들어감/떠남 알아채기, 맡을 사건, 계급 자리, 상관·동료 일, 폭동, 감찰, 죄를 지으면 쫓겨남, 출소한 자의 원한.
import { HOOKS } from '../hooks.js';
import { L, queueScene, sceneQueued } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { W, mi, clamp, here, ownRng, pick, NEED, WATCH_PLACES, townOf, unitOf, BOSS_NAMES, TEMPERS, logW, isWatch, orderOf } from './core.js';
import { enlist, discharge, newCase, openCase, POLICY } from './life.js';

const HOUSES = ['붉은 지붕 창고', '환전상 뒷집', '부두 끝 소금 창고', '빈 방앗간', '늙은 과부의 집'];
const busy = (g) => L(g).queue.some((x) => /^watch_/.test(x.kind)) || !!g.pendingEvent;

function orderTick(g, rng) {
  const s = W(g), anger = g.revolt?.anger ?? {};
  const famine = g.world?.famine ? 8 : 0, war = g.world?.war || g.politics?.war ? 5 : 0;
  for (const pl of WATCH_PLACES) {
    const t = townOf(pl);
    let target = t.base - (anger[pl] ?? 10) * 0.25 - famine - war;
    if (isWatch(g) && s.rank >= 3 && s.place === pl && s.policy) target += POLICY[s.policy].order;
    const cur = s.order[pl] ?? t.base;
    s.order[pl] = clamp(cur + (target - cur) * 0.08 + (rng.next() - 0.5) * 3, 5, 95);
  }
}

HOOKS.afterMonth.push((g) => {
  if (g.over) return;
  const rng = ownRng(g, 4901), s = W(g), t = mi(g);
  orderTick(g, rng);
  // 경비대에 들어감/떠남
  if (isWatch(g) && s.place !== L(g).job.place) enlist(g, rng);
  else if (!isWatch(g) && s.place) discharge(g);
  if (!isWatch(g)) return;
  // 죄를 지어 기록에 남으면 쫓겨난다
  const rec = g.crime?.record ?? [];
  if (rec.length > s.rec0) {
    const r = rec[rec.length - 1];
    s.rec0 = rec.length;
    if (r.at >= t - 1) {
      const name = s.unit;
      L(g).job = null; s.firedAt = t; discharge(g, `죄를 지어 ${name}에서 쫓겨났다.`);
      g.news.unshift({ text: `${name}에서 내 이름이 지워졌다. 경비대원이 죄를 지으면 남보다 먼저 쫓겨난다.`, rel: 100 });
      return;
    }
  }
  // 사건 기한
  for (const c of s.cases) if (!c.done && c.until < t) { c.done = true; c.result = 'cold'; s.cold += 1; s.merit = Math.max(0, s.merit - 1); logW(g, `${c.victim} 사건이 식었다.`); }
  // 대장이 바뀐다 (여덟 해쯤)
  if (s.boss && t - s.boss.since > 96 && rng.chance(0.05)) { s.boss = { name: pick(rng, BOSS_NAMES), temper: pick(rng, Object.keys(TEMPERS)), since: t }; logW(g, `대장이 ${TEMPERS[s.boss.temper].name} ${J(s.boss.name, '으로/로')} 바뀌었다.`); }
  if (busy(g) || L(g).travel) return;
  const pl = L(g).job.place, atPost = here(g) === pl;
  // 계급 자리
  if (s.rank < 3 && s.merit >= NEED[s.rank] && t - s.promoAt >= (s.promoWait ?? 6) && atPost && !sceneQueued(g, 'watch_promote')) { queueScene(g, 'watch_promote'); return; }
  // 감찰
  const dirt = s.bribes + s.skimmed - (s.inqBase ?? 0);
  if (dirt >= 4 && t - (s.inqAt ?? -99) >= 24 && rng.chance(0.03 + dirt * 0.006)) { queueScene(g, 'watch_inquiry'); return; }
  // 출소한 자의 원한
  const out = s.caught.find((x) => !x.done && x.grudge >= 1 && x.out <= t && x.out > t - 24 && x.place === here(g));
  if (out && rng.chance(0.06 * out.grudge)) { queueScene(g, 'watch_grudge', { name: out.name, crime: out.crime, when: out.at }); return; }
  for (const x of s.caught) if (!x.done && x.out <= t - 24) x.done = true;
  if (!atPost) return;
  // 폭동
  if (orderOf(g, pl) < 32 && rng.chance(0.07)) { queueScene(g, 'watch_riot'); return; }
  // 맡을 사건
  if (!openCase(g, pl) && t - s.caseAt >= 5 && rng.chance(0.22 * (1.3 - orderOf(g, pl) / 100))) { s.caseAt = t; const c = newCase(g, rng, pl); queueScene(g, 'watch_case_new', { cid: c.id }); return; }
  // 상관의 부탁
  if (s.boss && s.rank < 3 && t - (s.bossAt ?? s.since ?? 0) >= 8 && rng.chance(0.12)) { s.bossAt = t; queueScene(g, 'watch_boss', { house: pick(rng, HOUSES) }); }
});

export { orderTick };
