import './lsshim.js';
import '../src/content.js';
import { INVENTIONS } from '../src/history/powers.js';
// 시대 점검: 발명이 나오면 일자리·물건·글이 열리고, 발명 전에는 보이지 않는지. 물건의 효과, 쇠수레 표, 30년 흐름.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { WORK } from '../src/jobs.js';
import { eraJobIds, syncEraJobs, shopList, GOODS } from '../src/era/index.js';
import { autosave, load } from '../src/save.js';
import { L } from '../src/adventure/core.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const adult = (g) => { me(g).ageMonths = 22 * 12; (g.flags ??= {}).adult = true; L(g).place = 'harfen'; g.player.money = 300; };

// 1) 발명 전에는 새 일이 어디에도 없다
{
  const g = newGame({ name: '시대', sex: 'm', familyId: 'farmer', mode: 'free', seed: 31 });
  syncEraJobs(g);
  for (const id of eraJobIds) check(WORK[id] && WORK[id].places.length === 0, `발명 전에 ${id}가 열려 있다`);
  adult(g);
  check(shopList(g).length === 0, '발명 전에 새 물건이 있다');
  check(!availableActions(g).some((a) => a.id === 'era_shop'), '발명 전에 새 물건 구경이 보인다');
  // 2) 발명이 나오면 열린다
  g.history.inventions = ['firestone', 'streetlamp', 'warmstone', 'manamill', 'press', 'signal'];
  syncEraJobs(g);
  check(WORK.lamplighter.places.includes('harfen'), '등석 가로등 뒤 점등꾼이 하르펜에 없다');
  check(WORK.signalman.places.includes('harfen'), '전신탑 뒤 신호수가 없다');
  check(WORK.carter.places.length === 0, '쇠수레 전에 몰이꾼이 열렸다');
  check(shopList(g).includes('lantern') && !shopList(g).includes('plow'), '물건 목록이 발명과 맞지 않다');
  check(availableActions(g).some((a) => a.id === 'era_shop'), '새 물건 구경이 안 보인다');
  // 3) 사서 효과 보기
  g.era.goods.warmstone = 1; g.era.goods.healband = 2;
  g.player.injuries.push({ name: '시험 상처', months: 4 });
  g.date.month = 12;
  const fm = g.player.familyMoney;
  endMonth(g, [{ id: 'rest' }]);
  check(g.player.familyMoney >= fm, '온석 화로가 겨울 땔감을 아끼지 않는다');
  check(g.era.goods.healband === 1, '정화석 붕대가 쓰이지 않았다');
  // 4) 쇠수레 표
  g.history.inventions.push('erngrind', 'plow', 'forge', 'healstone', 'ironcart', 'railroad');
  g.era.goods.cart = 1;
  g.life.place = 'harfen'; g.life.travel = { to: 'leocast', left: 2, from: 'harfen' };
  endMonth(g, [{ id: 'rest' }]);
  check(g.era.goods.cart === 0 && (g.life.travel == null || g.life.travel.left <= 0), `쇠수레 표가 길을 줄이지 않았다 ${JSON.stringify(g.life.travel)}`);
  // 저장과 불러오기 뒤에도 일자리가 맞는지
  autosave(g);
  const g2 = load('auto');
  check(WORK.carter.places.length > 0 && g2.era.goods, '불러온 뒤 시대 일자리가 닫혔다');
  // 새 판을 시작하면 다시 닫힌다
  newGame({ name: '새판', sex: 'f', familyId: 'merchant', mode: 'free', seed: 32 });
  check(WORK.carter.places.length === 0, '새 판인데 앞 판의 일자리가 열려 있다');
}
// 5) 30년을 살아 보면 발명과 함께 새 일·물건이 실제로 쓰인다 (오류 없이)
{
  let jobsOpened = 0, bought = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '흐름', sex: 'm', familyId: ['farmer', 'merchant', 'fallen_knight'][run % 3], mode: 'free', seed: 400 + run });
    // 시대가 빨리 오게. 34단계부터 기술 값은 기술 나무가 정하므로 tech 대신 마석 방아·인쇄기·전신탑까지 나온 판으로 시작한다
    for (const t of INVENTIONS) if (t.at <= 1.62 && !g.history.inventions.includes(t.id)) g.history.inventions.push(t.id);
    for (let m = 0; m < 12 * 30 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      const choices = [];
      for (let i = 0; i < slotsFor(g); i++) {
        const shop = acts.find((a) => a.id === 'era_shop');
        choices.push({ id: shop && rng.chance(0.15) ? 'era_shop' : rng.pick(acts).id });
      }
      endMonth(g, choices);
      let gd = 0;
      while (g.pendingEvent && gd++ < 8) resolveEvent(g, rngOf(g), Math.floor(rngOf(g).next() * g.pendingEvent.choices.length));
    }
    jobsOpened += eraJobIds.filter((id) => WORK[id].places.length).length;
    bought += Object.values(g.era.goods).filter((v) => v > 0).length;
    for (const c of g.chronicle) if (/undefined|NaN/.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
  }
  console.log(`30년 4판: 열린 새 일 평균 ${jobsOpened / 4}, 산 물건 종류 평균 ${bought / 4}`);
  check(jobsOpened / 4 >= 2, '30년 동안 새 일이 거의 열리지 않는다');
}
void GOODS;
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
