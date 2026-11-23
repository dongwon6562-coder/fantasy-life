// 사냥의 달: 사냥터의 짐승 수(봄에 늘고 혹한과 사냥에 준다, 플레이어 없이도), 고기의 훈제와 상함,
// 모피 주문의 기한, 오두막 도제의 사냥과 떠나는 날, 가을 귀족 사냥 대회.
import { HOOKS } from '../hooks.js';
import { queueScene, sceneQueued, L } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { activeAt } from '../nature/state.js';
import { J } from '../narrative/text.js';
import { H, mi, clamp, here, placeName, free, adult, ownRng, skill, isHunter, seasonOf, GROUNDS, GAME, GAME_IDS, hasLord, logH, stockOf, lodgeHere, addFur } from './core.js';

/* ---------- 사냥터의 짐승 수 ---------- */
export function stockMonth(g, rng) {
  const s = H(g), se = seasonOf(g);
  for (const pl of Object.keys(GROUNDS)) {
    let v = stockOf(g, pl);
    if (se === '봄') v += 3 + rng.next() * 2; // 새끼 철
    else if (se === '여름') v += 1;
    v -= 0.6 + rng.next() * 0.6; // 고장 사냥꾼들
    if (se === '겨울' && activeAt(g, pl).some((d) => d.kind === 'winter')) v -= 4; // 혹한에 굶어 죽는다
    if (s.lodge?.place === pl) v -= s.lodge.app.length * 0.4;
    s.stock[pl] = clamp(Math.round(v * 10) / 10, 0, 100);
  }
}

/* ---------- 고기: 오두막이 있으면 훈제, 없으면 이웃에 나눈다 ---------- */
function meatMonth(g) {
  const s = H(g);
  if (s.meat <= 0) return;
  if (s.lodge) { s.smoked = Math.min(40, s.smoked + s.meat); s.meat = 0; return; }
  const n = Math.floor(s.meat / 2);
  if (n > 0) { g.player.money += n; s.earned += n; }
  s.meat = 0; // 남은 것은 상하거나 식구 입으로
}

/* ---------- 모피 주문의 기한 ---------- */
function orderMonth(g) {
  const tr = H(g).trader, o = tr.order;
  if (!o || mi(g) <= o.until) return;
  tr.order = null; tr.trust = clamp(tr.trust - 20, 0, 100);
  deed(g, 'honest', -2, null);
  logH(g, `${GAME[o.kind].name} 모피 주문을 채우지 못했다. ${J(tr.name, '은/는')} 먼저 준 은화를 잊지 않을 것이다.`);
}

/* ---------- 오두막 도제 ---------- */
function lodgeMonth(g, rng) {
  const lo = H(g).lodge;
  if (!lo) return;
  const se = seasonOf(g);
  const pool = GAME_IDS.filter((id) => GAME[id].small && GAME[id].fur && GAME[id].when.includes(se) && (!GAME[id].where || GAME[id].where.includes(lo.place)));
  for (const a of lo.app) {
    if (!g.people.find((p) => p.id === a.id && p.alive)) { lo.app = lo.app.filter((x) => x.id !== a.id); continue; }
    if (pool.length && rng.chance(0.4 * stockOf(g, lo.place) / 70)) addFur(g, pool[Math.floor(rng.next() * pool.length)]);
  }
  if (!lodgeHere(g) || !free(g) || sceneQueued(g, 'hunter_journey')) return;
  const ripe = lo.app.find((a) => mi(g) - a.since >= 36);
  if (ripe) queueScene(g, 'hunter_journey', { id: ripe.id });
}

/* ---------- 가을 귀족 사냥 대회 ---------- */
export const royalOk = (g) => free(g) && adult(g) && hasLord(here(g)) && !L(g).travel && g.date.month >= 9 && g.date.month <= 11
  && (isHunter(g) || skill(g) >= 10) && mi(g) - H(g).beatAt >= 12 && !sceneQueued(g, 'hunter_royal') && !((H(g).banned[here(g)] ?? 0) > mi(g));
function royalMonth(g, rng) {
  if (!royalOk(g) || !rng.chance(0.35)) return;
  H(g).beatAt = mi(g);
  queueScene(g, 'hunter_royal');
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const rng = ownRng(g, 37);
  stockMonth(g, rng);
  meatMonth(g);
  orderMonth(g);
  lodgeMonth(g, rng);
  royalMonth(g, rng);
});

// 대를 이으면: 오두막과 모은 가죽은 집안에 남고, 산지기 장부와 상인의 믿음은 새 사람 몫
HOOKS.heir.push((g) => {
  const s = H(g);
  s.caught = 0; s.banned = {}; s.license = {}; s.trader.order = null; s.trader.offer = null;
  s.trader.trust = Math.round(s.trader.trust / 2);
  if (s.lodge) logH(g, `${placeName(s.lodge.place)} 숲 가장자리의 오두막을 물려받았다.`);
});
