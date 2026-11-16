// 장터에서 사고팔기, 대상단 꾸리기.
import { ACTIONS } from '../actions.js';
import { gainSkill, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, gains, up, tired } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { J } from '../narrative/text.js';
import {
  T, GOODS, GOOD_IDS, CARAVAN_TOWNS, WAGON_COST, GUARD_HIRE, UPKEEP, CAP, mi, here, free, isMarket,
  cargoQty, cargoList, capacity, spaceLeft, maxWagons, maxGuards, upkeep, addCargo, priceAt, buyAt, sellAt,
  pushMarket, remember, quote, bestKnown, cheapWord, logTrade, tradeSkill,
} from './core.js';

const canTrade = (g) => playerAge(g) >= 14 && free(g) && isMarket(here(g)) && !(T(g).banned[here(g)] > mi(g));
const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';

/* ---------- 장터 ---------- */
ACTIONS.push({
  id: 'trade_market',
  name: '장터에서 사고판다',
  icon: 'coin',
  desc: '이 고장에서 싸게 나는 것을 사서, 비싸게 쳐주는 고장에 가져가 판다. 고장마다 시세가 다르고, 전쟁과 흉년이 값을 흔든다.',
  available: (g) => canTrade(g) && !sceneQueued(g, 'trade_market'),
  run(g) {
    remember(g, here(g));
    queueScene(g, 'trade_market');
    return rngLine(g, ['장터의 좌판을 한 바퀴 돌며 값을 물었다.', '상인들의 저울과 장부를 곁눈질하며 시세를 셈했다.', '흥정 소리 사이로 오늘의 값이 오갔다.']);
  },
});
const rngLine = (g, arr) => arr[(g.date.month + g.date.year) % arr.length];

// 사면 좋을 물건: 기본값보다 싸게 나는 것부터
function buyList(g) {
  const pl = here(g);
  return GOOD_IDS.map((k) => ({ k, p: buyAt(g, pl, k), r: priceAt(g, pl, k) / GOODS[k].base }))
    .sort((a, b) => a.r - b.r);
}

defineScene('trade_market', {
  need: (g) => canTrade(g),
  title: (g) => `${placeName(here(g))}의 장터`,
  text: (g) => {
    const pl = here(g);
    const cheap = buyList(g).slice(0, 3).map((x) => `${GOODS[x.k].name} ${x.p}닢`).join(', ');
    const dear = GOOD_IDS.map((k) => ({ k, r: priceAt(g, pl, k) / GOODS[k].base })).sort((a, b) => b.r - a.r).slice(0, 3)
      .map((x) => `${GOODS[x.k].name} ${sellAt(g, pl, x.k)}닢`).join(', ');
    const lines = [`싸게 나는 것: ${cheap}. 비싸게 사 주는 것: ${dear}.`];
    const mine = cargoList(g);
    if (mine.length) {
      lines.push(`지고 온 짐: ${mine.map(([k, c]) => {
        const best = bestKnown(g, k, pl);
        return `${GOODS[k].name} ${c.qty}짐(짐당 ${Math.round(c.cost / c.qty)}닢에 샀다, 여기서 ${sellAt(g, pl, k)}닢${best && best.price > sellAt(g, pl, k) ? `, ${placeName(best.place)}에서는 ${best.price}닢이었다` : ''})`;
      }).join(', ')}.`);
    }
    lines.push(`짐은 ${cargoQty(g)}/${capacity(g)}짐. 가진 돈 은화 ${g.player.money}닢.`);
    return lines.join(' ');
  },
  choices: (g) => {
    const pl = here(g), out = [];
    const mine = cargoList(g).sort((a, b) => b[1].qty * sellAt(g, pl, b[0]) - a[1].qty * sellAt(g, pl, a[0]));
    for (const [k, c] of mine.slice(0, 3)) out.push({ label: `${GOODS[k].name} ${c.qty}짐을 판다 (은화 ${c.qty * quote(g, pl, k, c.qty, true)}닢쯤)`, key: `sell:${k}` });
    if (mine.length > 1) out.push({ label: `짐을 모두 판다 (은화 ${mine.reduce((s, [k, c]) => s + c.qty * quote(g, pl, k, c.qty, true), 0)}닢쯤)`, key: 'sellall' });
    const room = spaceLeft(g);
    if (room > 0) {
      for (const x of buyList(g)) {
        if (out.length >= 7) break;
        let qty = Math.min(room, Math.floor(g.player.money / x.p), 40);
        if (qty < 1 || x.r > 1.05) continue;
        let each = quote(g, pl, x.k, qty, false);
        qty = Math.min(qty, Math.floor(g.player.money / each));
        if (qty < 1) continue;
        each = quote(g, pl, x.k, qty, false);
        out.push({ label: `${GOODS[x.k].name} ${qty}짐을 산다 (짐당 ${each}닢쯤)`, key: `buy:${x.k}:${qty}` });
      }
    }
    out.push({ label: '시세만 적어 둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const pl = here(g), t = T(g);
    if (key === 'no') { remember(g, pl); return '좌판마다 값을 물어 장부에 적었다. 다음 고장의 값과 견주어 볼 것이다.'; }
    if (key.startsWith('buy:')) {
      const [, k, q] = key.split(':');
      if (!GOODS[k]) return '흥정을 하는 사이 물건은 다른 상인이 채 갔다.';
      // 많이 사들이면 값이 오른다: 반을 사들인 뒤의 값으로 셈한다
      let qty = Math.min(Number(q) || 0, spaceLeft(g));
      pushMarket(g, pl, k, qty / 2, false);
      const p = buyAt(g, pl, k);
      qty = Math.min(qty, Math.floor(g.player.money / p));
      if (qty < 1) { pushMarket(g, pl, k, -(Number(q) || 0) / 2, false); return '흥정을 하는 사이 물건은 다른 상인이 채 갔다.'; }
      g.player.money -= qty * p;
      addCargo(g, k, qty, qty * p);
      pushMarket(g, pl, k, qty / 2, false);
      t.volume += qty;
      const sk = gainSkill(g, 'trade', 0.6 + Math.min(1, qty / 20), 'int');
      logTrade(g, `${placeName(pl)}에서 ${GOODS[k].name} ${qty}짐을 은화 ${qty * p}닢에 샀다.`);
      const best = bestKnown(g, k, pl);
      return `${GOODS[k].name} ${qty}짐을 은화 ${qty * p}닢에 사서 묶었다.${best && best.price > p ? ` 적어 둔 장부로는 ${placeName(best.place)}에서 짐당 ${best.price}닢을 쳐주었다.` : ' 어디서 비싸게 쳐줄지는 다녀 봐야 안다.'}${gains([up('장사', sk)])}`;
    }
    const sellOne = (k) => {
      const c = t.cargo[k];
      if (!c?.qty) return null;
      // 많이 풀면 값이 떨어진다: 반을 푼 뒤의 값으로 셈한다
      pushMarket(g, pl, k, c.qty / 2, true);
      const p = sellAt(g, pl, k), got = c.qty * p, profit = got - c.cost;
      g.player.money += got;
      t.profit += profit; t.monthProfit += profit; t.volume += c.qty;
      pushMarket(g, pl, k, c.qty / 2, true);
      delete t.cargo[k];
      return { k, qty: c.qty, got, profit };
    };
    const sold = (key === 'sellall' ? cargoList(g).map(([k]) => k) : [key.split(':')[1]]).map(sellOne).filter(Boolean);
    if (!sold.length) return '사겠다던 상인이 슬그머니 자리를 떴다.';
    const got = sold.reduce((a, x) => a + x.got, 0), profit = sold.reduce((a, x) => a + x.profit, 0);
    t.trips += 1;
    const sk = gainSkill(g, 'trade', 0.8 + Math.min(1.2, sold.reduce((a, x) => a + x.qty, 0) / 20), 'int');
    tired(g, 4);
    remember(g, pl);
    logTrade(g, `${placeName(pl)}에서 ${sold.map((x) => `${GOODS[x.k].name} ${x.qty}짐`).join(', ')}을 은화 ${got}닢에 팔았다 (${profit >= 0 ? `${profit}닢 남김` : `${-profit}닢 밑짐`}).`);
    if (profit >= 200) note(g, `${placeName(pl)} 장터에서 한 번에 은화 ${profit}닢을 남겼다.`);
    const what = sold.map((x) => `${GOODS[x.k].name} ${x.qty}짐`).join(', ');
    const tail = profit > 0 ? (profit >= 100 ? `${profit}닢이 남았다. 상인들이 내 얼굴을 기억하기 시작했다.` : `${profit}닢이 남았다.`) : profit < 0 ? `${-profit}닢을 밑졌다. 길 위의 달과 삯을 생각하면 더 쓰리다.` : '본전이다.';
    return `${J(what, '을/를')} 은화 ${got}닢에 넘겼다. ${tail}${gains([up('장사', sk)])}`;
  },
});

/* ---------- 대상단 꾸리기 ---------- */
const canCaravan = (g) => playerAge(g) >= 16 && free(g) && CARAVAN_TOWNS.includes(here(g));
ACTIONS.push({
  id: 'trade_caravan',
  name: '대상단을 꾸린다',
  icon: 'travel',
  desc: '마차를 사고, 호위와 짐꾼을 둔다. 짐을 많이 실을수록 한 번에 크게 남지만, 달마다 삯이 들고 도적의 눈에도 잘 띈다.',
  available: (g) => canCaravan(g) && !sceneQueued(g, 'trade_caravan'),
  run(g) { queueScene(g, 'trade_caravan'); return '마구간과 용병 주점을 돌며 사람과 수레를 알아보았다.'; },
});
defineScene('trade_caravan', {
  need: (g) => canCaravan(g),
  title: () => '대상단',
  text: (g) => {
    const c = T(g).caravan;
    const horses = Math.max(0, (capacity(g) - CAP.back - c.porters * CAP.porter - c.wagons * CAP.wagon) / CAP.horse);
    return `마차 ${c.wagons}대, 호위 ${c.guards}명, 짐꾼 ${c.porters}명${horses ? `, 짐을 지는 말 ${horses}마리` : ''}. 실을 수 있는 짐은 ${capacity(g)}짐이다. 달마다 삯은 은화 ${upkeep(g)}닢(호위 ${UPKEEP.guard}닢, 짐꾼 ${UPKEEP.porter}닢, 마차 ${UPKEEP.wagon}닢씩). 마차 한 대는 짐 ${CAP.wagon}짐을 싣고, 은화 ${WAGON_COST}닢이다. 호위가 많을수록 도적이 덜 덤빈다.`;
  },
  choices: (g) => {
    const c = T(g).caravan, out = [], m = g.player.money;
    if (c.wagons < maxWagons(g) && m >= WAGON_COST) out.push({ label: `마차를 산다 (은화 ${WAGON_COST}닢)`, key: 'wagon' });
    if (c.guards + 2 <= maxGuards(g) && m >= GUARD_HIRE * 2) out.push({ label: `호위 둘을 둔다 (계약금 은화 ${GUARD_HIRE * 2}닢, 달마다 ${UPKEEP.guard * 2}닢)`, key: 'guard' });
    if (c.porters < 8) out.push({ label: `짐꾼 둘을 쓴다 (달마다 은화 ${UPKEEP.porter * 2}닢)`, key: 'porter' });
    if (c.guards) out.push({ label: '호위를 모두 내보낸다', key: 'noguard' });
    if (c.porters) out.push({ label: '짐꾼을 모두 내보낸다', key: 'noporter' });
    if (c.wagons) out.push({ label: `마차 한 대를 판다 (은화 ${Math.round(WAGON_COST / 2)}닢)`, key: 'sellwagon' });
    out.push({ label: '이대로 둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const t = T(g), c = t.caravan;
    if (key === 'wagon' && g.player.money >= WAGON_COST && c.wagons < maxWagons(g)) {
      g.player.money -= WAGON_COST; c.wagons += 1;
      logTrade(g, '마차 한 대를 샀다.');
      return rng.pick(['바퀴살이 튼튼한 마차와 늙은 황소 두 마리를 샀다. 마부가 덤으로 따라왔다.', '덮개를 씌운 짐마차를 샀다. 옆판에 내 이름을 새겼다.']);
    }
    if (key === 'guard' && g.player.money >= GUARD_HIRE * 2) {
      g.player.money -= GUARD_HIRE * 2; c.guards += 2;
      logTrade(g, '호위 둘을 두었다.');
      return rng.pick(['용병 주점에서 흉터가 많은 둘을 골랐다. 하나는 북부 전선에서 왔고, 하나는 말이 없다.', '모험가 길드에서 철패 둘을 소개받았다. 칼은 낡았지만 손은 빠르다.']);
    }
    if (key === 'porter') { c.porters += 2; logTrade(g, '짐꾼 둘을 썼다.'); return '등이 넓은 짐꾼 둘이 짐 끈을 어깨에 걸었다. 품삯은 달마다 치른다.'; }
    if (key === 'noguard') { const n = c.guards; c.guards = 0; logTrade(g, `호위 ${n}명을 내보냈다.`); return `호위 ${n}명에게 마지막 삯을 치렀다. 그들은 뒤도 돌아보지 않고 주점으로 갔다.`; }
    if (key === 'noporter') { const n = c.porters; c.porters = 0; logTrade(g, `짐꾼 ${n}명을 내보냈다.`); return `짐꾼 ${n}명을 내보냈다.`; }
    if (key === 'sellwagon' && c.wagons) {
      c.wagons -= 1; g.player.money += Math.round(WAGON_COST / 2);
      // 실을 곳이 줄어 넘치는 짐은 헐값에 넘긴다
      let over = cargoQty(g) - capacity(g), dumped = 0;
      for (const [k, cg] of cargoList(g)) {
        if (over <= 0) break;
        const n = Math.min(cg.qty, over);
        const p = Math.max(1, Math.floor(sellAt(g, here(g), k) * 0.6));
        g.player.money += n * p; t.profit += n * p - Math.round(cg.cost * n / cg.qty);
        cg.cost = Math.round(cg.cost * (1 - n / cg.qty)); cg.qty -= n; over -= n; dumped += n;
        if (cg.qty <= 0) delete t.cargo[k];
      }
      logTrade(g, '마차 한 대를 팔았다.');
      return `마차 한 대를 팔았다.${dumped ? ` 실을 데가 없는 짐 ${dumped}짐은 헐값에 넘겼다.` : ''}`;
    }
    return '수레와 사람은 그대로 두었다.';
  },
});

export { GOOD_IDS };
