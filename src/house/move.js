// 이사: 식구와 살림을 싣고 다른 고장으로 옮긴다. 이 고장의 집은 팔거나 두고 간다. 닿으면 셋방부터 얻는다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, me } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, canSpend, spend } from '../adventure/core.js';
import { PLACES, travelMonths, fareOf } from '../places.js';
import { homeWorth } from '../estate/core.js';
import { sellHome } from '../estate/manage.js';
import { byId } from '../npc.js';
import { J } from '../narrative/text.js';
import { H, here, placeName, free, recOf, logHouse } from './core.js';
import { loseHome } from './life.js';
import { opener } from '../narrative/openers.js';

// 함께 가는 식구: 살아 있는 배우자와 열다섯 살 아래 자식
export function household(g) {
  const p = me(g), out = [];
  const sp = p?.spouseId != null ? byId(g, p.spouseId) : null;
  if (sp?.alive) out.push(sp);
  for (const id of p?.childIds ?? []) { const c = byId(g, id); if (c?.alive && c.ageMonths < 15 * 12) out.push(c); }
  return out;
}
export const moveCost = (g, to) => fareOf(travelMonths(here(g), to)) * (1 + household(g).length) + 5;
export function destinations(g) {
  const pl = here(g);
  return Object.keys(PLACES)
    .filter((id) => id !== pl && (!PLACES[id].hidden || PLACES[id].open?.(g)) && travelMonths(pl, id) < 99 && (PLACES[id].house ?? 0) > 0)
    .sort((a, b) => travelMonths(pl, a) - travelMonths(pl, b) || a.localeCompare(b))
    .slice(0, 5);
}
const canMove = (g) => playerAge(g) >= 16 && free(g) && !H(g).moving && !H(g).build;

ACTIONS.push({
  id: 'house_move',
  name: '이사한다',
  icon: 'travel',
  desc: '식구와 살림을 싣고 다른 고장으로 옮겨 산다. 이 고장의 집은 팔거나 두고 간다. 닿으면 셋방부터 얻는다.',
  available: (g) => canMove(g) && !sceneQueued(g, 'house_move') && !sceneQueued(g, 'house_move_house'),
  run(g, rng) { queueScene(g, 'house_move'); return opener(g, 'house_move', rng); },
});

defineScene('house_move', {
  need: (g) => canMove(g),
  title: () => '이삿짐',
  text: (g) => {
    const fam = household(g), r = recOf(g, here(g));
    return `${fam.length ? `${J(fam.map((p) => p.name).join(', '), '과/와')} 함께 간다. ` : '혼자 몸이다. '}짐수레에 실을 것을 헤아렸다. 가진 돈은 은화 ${g.player.money}닢.${r ? ` 이 고장에는 ${J(r.name, '이/가')} 있다.` : ''}`;
  },
  choices: (g) => [
    ...destinations(g).filter((to) => canSpend(g, moveCost(g, to))).map((to) => ({ label: `${J(placeName(to), '으로/로')} 이사한다 (${travelMonths(here(g), to)}달 길, 은화 ${moveCost(g, to)}닢)`, key: `to:${to}` })),
    { label: '그냥 여기서 산다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'no') return '짐을 다시 풀었다. 여기도 나쁘지 않다.';
    const to = key.slice(3);
    if (!PLACES[to] || !canSpend(g, moveCost(g, to))) return '짐삯이 모자랐다.';
    if (L(g).houses.includes(here(g))) { queueScene(g, 'house_move_house', { to }, { first: true }); return `${J(placeName(to), '으로/로')} 가기로 했다. 남은 것은 이 집이다.`; }
    return startMove(g, to, false);
  },
});

defineScene('house_move_house', {
  need: (g, s) => canMove(g) && L(g).houses.includes(here(g)) && !!PLACES[s.to],
  title: (g) => `${J(recOf(g, here(g))?.name ?? '이 집', '을/를')} 어찌할까`,
  text: (g, s) => { const r = recOf(g, here(g)); return `${J(placeName(s.to), '으로/로')} 떠난다. ${r.name}에서 ${r.gens > 1 ? `${r.gens}대가 살았다` : `${Math.floor((r.lived ?? 0) / 12)}해를 살았다`}. 팔면 은화 ${homeWorth(g, here(g))}닢을 받는다.`; },
  choices: (g, s) => [{ label: `팔고 간다 (은화 ${homeWorth(g, here(g))}닢)`, key: 'sell' }, { label: '두고 간다 (언제든 돌아올 수 있다)', key: 'keep' }, { label: '떠나지 않는다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '문지방에서 돌아섰다. 이 집을 두고는 못 가겠다.';
    if (!canSpend(g, moveCost(g, s.to))) return '짐삯이 모자랐다.';
    return startMove(g, s.to, key === 'sell');
  },
});

function startMove(g, to, sell) {
  const from = here(g), life = L(g), h = H(g), fam = household(g);
  let soldText = '';
  if (sell && life.houses.includes(from)) {
    const r = recOf(g, from), price = homeWorth(g, from);
    g.player.money += price;
    loseHome(g, from, '이사하며 팔았다', price);
    sellHome(g, from);
    soldText = ` ${J(r.name, '을/를')} 은화 ${price}닢에 팔았다.`;
  }
  const cost = moveCost(g, to);
  if (!spend(g, cost)) return '짐삯이 모자랐다.';
  life.travel = { to, left: travelMonths(from, to), from };
  h.moving = { to, from, year: g.date.year, family: fam.length, sold: sell };
  logHouse(g, `${placeName(from)}에서 ${J(placeName(to), '으로/로')} 이사를 떠났다.`);
  stress(g, 4);
  return `짐수레에 살림을 실었다.${soldText} ${fam.length ? '식구들이 뒤돌아 마을을 오래 보았다. ' : ''}${J(placeName(to), '으로/로')} 가는 길에 올랐다.`;
}

// 닿으면: 내 집이 있으면 그리로, 없으면 셋방을 얻는다
HOOKS.afterMonth.push((g) => {
  const h = H(g), mv = h.moving, life = L(g);
  if (!mv || g.over) return;
  if (life.travel) return;
  if (here(g) !== mv.to) { h.moving = null; return; } // 길이 바뀌었다
  h.moving = null; h.moves += 1;
  if (life.home !== 'barracks') {
    if (life.houses.includes(mv.to)) life.home = 'own';
    else if (life.home !== 'own' && spend(g, (PLACES[mv.to].rent ?? 3) * 2)) life.home = 'rent';
  }
  note(g, `${placeName(mv.from)}에서 ${J(placeName(mv.to), '으로/로')} 이사했다.`);
  chron(g, `${g.player.name}${mv.family ? '네 식구' : ''}, ${J(placeName(mv.to), '으로/로')} 옮겨 살다.`, 30);
  logHouse(g, `${placeName(mv.to)}에 닿아 살림을 풀었다.`);
});
