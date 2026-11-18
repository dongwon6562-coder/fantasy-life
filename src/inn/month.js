// 매달 장사: 손님, 벌이, 삯, 세금(쌓였다가 세리가 걷음), 자릿세, 이름값, 깨끗함, 경쟁 가게. 그리고 가게에서 생기는 일 고르기.
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L, queueScene, sceneQueued, note } from '../adventure/core.js';
import { atWar } from '../world.js';
import { J } from '../narrative/text.js';
import { outbreaksAt } from '../health/index.js';
import { GANGS } from '../underworld/gangs.js';
import { I, myInn, atInn, mi, clamp, ownRng, free, crowdOf, PRICES, REGULAR_IDS, taxRate, workerOf, wagesOf, foodOf, logInn } from './core.js';

export const gangAt = (pl) => Object.keys(GANGS).find((id) => GANGS[id].place === pl) ?? null;

// 이 달 장사 셈 (화면에서 미리 보기에도 쓴다)
export function reckon(g) {
  const inn = myInn(g);
  if (!inn) return null;
  const pl = inn.place, pr = PRICES[inn.price] ?? PRICES.fair;
  const present = atInn(g), manager = workerOf(g, 'manager');
  let traffic = crowdOf(pl) * (0.6 + inn.fame / 100) * pr.traffic * (0.8 + inn.clean / 250) * (1 + 0.05 * inn.regulars.length);
  if (workerOf(g, 'maid')) traffic *= 1.1;
  if ([12, 1, 2].includes(g.date.month)) traffic *= 1.1; // 겨울엔 다들 불가에 모인다
  if (g.world?.famine) traffic *= 0.6;
  if (atWar(g)) traffic *= 0.85;
  if (outbreaksAt(g, pl).length) traffic *= 0.6;
  if (inn.rival) traffic *= 1 - clamp(inn.rival.power, 0, 100) / 250;
  let rev = traffic * (10 + foodOf(g) * 4 + inn.rooms * 6) * pr.margin;
  const worked = present && inn.worked === mi(g);
  if (worked) rev *= 1.15;
  if (!present && !manager) rev *= 0.5;
  let skim = 0;
  if (manager && !manager.honest && !present) skim = Math.round(rev * 0.15);
  rev -= skim;
  const back = (inn.backroom.gamble ? crowdOf(pl) * 5 : 0) + (inn.backroom.smuggle ? 10 : 0);
  rev = Math.max(0, Math.round(rev + back));
  const tax = Math.round(rev * taxRate(pl));
  const wages = wagesOf(inn), upkeep = 2 + inn.rooms * 2 - (worked && inn.workKind === 'books' ? 1 : 0);
  const cut = inn.gang?.state === 'paid' ? Math.round(rev * 0.1) : 0;
  const cost = wages + upkeep + cut;
  return { guests: Math.round(traffic * 20), rev, tax, wages, upkeep, cut, skim, cost, net: rev - cost, present, back };
}

HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const inn = myInn(g);
  if (!inn || !PLACES[inn.place]) return;
  const rng = ownRng(g, 1), now = mi(g), r = reckon(g);
  inn.months += 1;
  // 세금은 쌓였다가 세리가 걷는다
  inn.taxOwed += r.tax;
  if (r.skim) { inn.skimmed = (inn.skimmed ?? 0) + r.skim; }
  g.player.money += r.net;
  if (g.player.money < 0) { inn.arrears += -g.player.money; g.player.money = 0; }
  else if (inn.arrears > 0) { const p = Math.min(inn.arrears, g.player.money); inn.arrears -= p; g.player.money -= p; }
  inn.total += r.net;
  inn.last = { rev: r.rev, cost: r.cost, net: r.net, guests: r.guests };
  // 이름값과 깨끗함
  const pr = PRICES[inn.price] ?? PRICES.fair;
  inn.fame = clamp(inn.fame + pr.fame * 0.5 + (foodOf(g) - 1) * 0.5 + (r.present ? 0.3 : -0.2) - (inn.clean < 30 ? 0.8 : 0), 0, 100);
  inn.clean = clamp(inn.clean - (workerOf(g, 'maid') ? 1 : 4), 0, 100);
  inn.heat = clamp(inn.heat - 3 + (inn.backroom.gamble ? 3 : 0) + (inn.backroom.smuggle ? 4 : 0), 0, 100);
  for (const w of inn.workers) w.loyal = clamp(w.loyal + 1, 0, 100);
  if (inn.rival) { inn.rival.power = clamp(inn.rival.power + (inn.price === 'cheap' ? -3 : inn.fame > 60 ? -1 : 0.5), 0, 100); if (inn.rival.power <= 0) { logInn(g, `경쟁 가게 ${J(inn.rival.name, '이/가')} 문을 닫았다.`); note(g, `건너편 ${inn.rival.name}의 간판이 내려졌다.`); inn.rival = null; } }
  // 내 여관이 있는 고장에서 여관에 묵으면 방값은 들지 않는다 (places.js가 뗀 방값을 돌려준다)
  if (L(g).home === 'inn' && L(g).place === inn.place && inn.rooms > 0 && !L(g).travel) g.player.money += PLACES[inn.place].inn ?? 0;
  // 빚이 쌓이면 가게를 내놓으라는 말이 나온다
  if (inn.arrears >= 60 && !sceneQueued(g, 'inn_event') && free(g)) { queueScene(g, 'inn_event', { ev: 'arrears' }, { first: true }); return; }
  // 세리: 여섯 달에 한 번쯤
  if (inn.taxOwed >= 20 && now - (inn.taxAt ?? 0) >= 6) {
    inn.taxAt = now;
    if (atInn(g) && free(g) && !sceneQueued(g, 'inn_event')) { queueScene(g, 'inn_event', { ev: 'tax' }); return; }
    // 내가 없으면 일꾼이 낸다 (돈이 없으면 빚으로)
    const pay = Math.min(inn.taxOwed, g.player.money);
    g.player.money -= pay; inn.arrears += inn.taxOwed - pay; inn.taxOwed = 0;
    logInn(g, `세리가 다녀갔다. 은화 ${pay}닢을 냈다.`);
    return;
  }
  if (!atInn(g) || !free(g) || sceneQueued(g, 'inn_event')) return;
  if (now - I(g).eventAt < 2 || !rng.chance(0.4)) return;
  I(g).eventAt = now;
  const pool = ['brawl', 'brawl', 'rumor', 'rumor', 'guest'];
  const missing = REGULAR_IDS.filter((id) => !inn.regulars.some((x) => x.id === id));
  if (missing.length && inn.regulars.length < 4) pool.push('newreg', 'newreg');
  if (inn.regulars.length) pool.push('regular', 'regular');
  if (inn.workers.some((w) => !w.honest || w.loyal < 30)) pool.push('worker');
  if (workerOf(g, 'cook')) pool.push('poach');
  if (inn.heat >= 20 || inn.dodged >= 30) pool.push('guard', 'guard');
  if (gangAt(inn.place) && !inn.gang) pool.push('gang', 'gang', 'gang');
  if (inn.gang?.state === 'refused') pool.push('gang');
  if (inn.backroom.gamble) pool.push('gamble');
  if (inn.backroom.smuggle) pool.push('smuggle');
  if (!inn.rival && crowdOf(inn.place) >= 2 && now - I(g).rivalAt >= 24) pool.push('rival_open');
  if (inn.rival) pool.push('rival');
  const ev = rng.pick(pool);
  if (ev === 'rival_open') I(g).rivalAt = now;
  queueScene(g, 'inn_event', { ev, reg: ev === 'newreg' ? rng.pick(missing) : ev === 'regular' ? rng.pick(inn.regulars).id : null });
});

// 대를 이으면 가게도 이어진다
HOOKS.heir.push((g) => {
  const inn = myInn(g);
  if (!inn) return;
  inn.gens += 1;
  inn.fame = clamp(inn.fame - 5, 0, 100);
  for (const w of inn.workers) w.loyal = clamp(w.loyal - 10, 0, 100);
  for (const r of inn.regulars) r.mood = clamp(r.mood - 10, 0, 100);
  inn.worked = -1;
  logInn(g, `${g.player.name}에게 가게가 넘어왔다. ${inn.gens}대째.`);
  note(g, `${inn.name} 간판이 이제 내 것이다. ${inn.gens}대째 가게다.`);
});
