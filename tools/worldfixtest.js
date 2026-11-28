import './lsshim.js';
import '../src/content.js';

// 48단계 도우미3: 플레이 점검에서 찾아 고친 세상·사건 쪽 문제가 다시 생기지 않게 지킨다 (1초 남짓).
import { newGame, endMonth, availableActions, me } from '../src/game.js';
import { EVENTS } from '../src/events.js';
import { L, showScene, queueScene } from '../src/adventure/core.js';
import { activeAt } from '../src/nature/state.js';
import { seldom, firstMonths } from '../src/rumor/seldom.js';
import { ACTIONS } from '../src/actions.js';
import { B } from '../src/beasts/core.js';

const T0 = Date.now();
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const ev = (id) => EVENTS.find((e) => e.id === id);
const fresh = (seed = 4801, fam = 'farmer') => newGame({ name: '점검', sex: 'f', familyId: fam, mode: 'free', seed });
const setAge = (g, y) => { me(g).ageMonths = y * 12; };
const mi = (g) => g.date.year * 12 + g.date.month;

// 1) 매서운 추위: 아기에게는 안 뜨고, 남쪽보다 북쪽이 잦고, 아이는 장작을 '나르는' 쪽만 본다
{
  const g = fresh(); g.date.month = 1;
  const hw = ev('harsh_winter');
  setAge(g, 2); check(!hw.cond(g), '두 살 아기에게 매서운 추위가 뜬다');
  setAge(g, 8);
  if (!(g.nature && activeAt(g, L(g).place).some((d) => d.kind === 'winter'))) check(hw.cond(g), '여덟 살 1월에 매서운 추위 조건이 막혔다');
  const kidLabels = hw.choices.filter((c) => !c.show || c.show(g)).map((c) => c.label);
  check(!kidLabels.includes('장작을 해 온다') && kidLabels.includes('어른들을 도와 장작을 나른다'), `여덟 살 선택지: ${kidLabels}`);
  check(!hw.choices[hw.choices.length - 1].show, '마지막 선택지는 늘 보여야 한다');
  L(g).place = 'gruental'; const north = hw.chance(g);
  L(g).place = 'libera'; const south = hw.chance(g);
  check(north > south, `북쪽(${north})이 남쪽(${south})보다 추위가 잦아야 한다`);
}

// 2) 힘겨루기는 여덟 살부터
{
  const g = fresh(); setAge(g, 4);
  const c = ev('harvest_festival').choices.find((x) => x.label.includes('힘겨루기'));
  check(c && c.show && !c.show(g), '네 살에게 힘겨루기 선택지가 보인다');
}

// 3) 국상·즉위식은 일이 난 뒤 잠깐만 뜬다 (몇 해 늦게 뜨지 않는다)
{
  const g = fresh(); setAge(g, 10);
  const r = g.realm; check(r && r.king, '왕국 상태가 없다');
  if (r?.king) {
    r.king.alive = false; r.king.diedAt = mi(g) - 1;
    check(ev('king_mourning').cond(g), '승하 한 달 뒤 국상이 안 뜬다');
    r.king.diedAt = mi(g) - 40;
    check(!ev('king_mourning').cond(g), '승하 세 해 뒤에도 국상이 뜬다');
    r.king.diedAt = mi(g) - 1; const home = L(g).place; L(g).place = 'silverleaf';
    check(!ev('king_mourning').cond(g), '엘프 은잎 마을에서 레오니아 국상이 뜬다');
    L(g).place = home;
    r.succession = 'settled'; r.ruler = 'rudolf'; r.crownedAt = mi(g) - 2;
    check(ev('coronation').cond(g), '즉위 두 달 뒤 사면령이 안 뜬다');
    r.crownedAt = mi(g) - 30;
    check(!ev('coronation').cond(g), '즉위 두 해 뒤에도 사면령이 뜬다');
  }
}

// 4) 관청은 지금 왕 이름을 말한다 (죽은 왕 이름이 아니라)
{
  const g = fresh(); setAge(g, 25);
  g.realm.ruler = 'rudolf';
  const rs = g.realms ?? null;
  if (rs) rs.citizen = 'valhart';
  g.pendingEvent = null; L(g).scene = null;
  showScene(g, { kind: 'realm_office', at: L(g).place, t: mi(g) }, { force: true });
  const text = g.pendingEvent?.text ?? '';
  check(text.includes('루돌프 2세'), `관청 글에 새 왕 이름이 없다: ${text.slice(0, 80)}`);
}

// 5) 어린아이에게는 무구점·장삿길·거지 장면이 열리지 않는다 (어린 상속자가 앞 사람 살림을 물려받아도)
{
  const g = fresh(4802, 'merchant'); setAge(g, 4);
  L(g).place = 'harfen'; g.player.money = 200;
  check(!availableActions(g).some((a) => a.id === 'gear'), '네 살에게 장비 맞추기가 보인다');
  L(g).home = 'street'; g.player.money = 0;
  if (g.trade) { g.trade.volume = 999; g.trade.cool = 0; }
  const bad = new Set();
  for (let m = 0; m < 24; m++) {
    setAge(g, 4);
    endMonth(g, [{ id: 'rest' }]);
    for (const s of [...L(g).queue, L(g).scene].filter(Boolean)) if (/^(trade_event|poor_slum|poor_chance|gear)$/.test(s.kind)) bad.add(s.kind);
    g.pendingEvent = null; L(g).scene = null; L(g).queue.length = 0;
    if (g.over) break;
  }
  check(!bad.size, `네 살에게 어른 장면이 뜬다: ${[...bad]}`);
}

// 7) 고장 한 줄은 같은 말을 달마다 하지 않는다, '막 들어왔다'는 처음 석 달만
{
  const g = fresh(4804); L(g).place = 'leocast';
  let shown = 0, first = 0;
  for (let m = 0; m < 120; m++) {
    if (seldom(g, 'x', 36)) shown++;
    check(seldom(g, 'x', 36) === seldom(g, 'x', 36), '같은 달에 seldom 답이 바뀐다');
    if (firstMonths(g, 'y', 3)) first++;
    g.date.month++; if (g.date.month > 12) { g.date.month = 1; g.date.year++; }
  }
  check(shown >= 3 && shown <= 4, `열 해에 세 해 간격 줄이 ${shown}번`);
  check(first === 3, `'막 들어왔다'가 ${first}달`);
}

// 8) 아이는 짐승 장터에서 개 한 마리까지만
{
  const g = fresh(4805); setAge(g, 11); L(g).place = 'harfen'; g.player.money = 500;
  const buy = ACTIONS.find((a) => a.id === 'beast_buy');
  check(buy && buy.available(g), '열한 살 첫 개를 못 들인다');
  if (buy && buy.available(g)) {
    B(g).animals = [{ id: 1, kind: 'dog', name: '누렁이', alive: true, age: 2, trained: 50 }];
    let ok = true; try { ok = !buy.available(g); } catch { ok = true; }
    check(ok, '개가 있는 열한 살에게 짐승 장터가 또 열린다');
  }
}

// 6) 빵값 소식은 한 번 뛰면 가라앉을 때까지 다시 '뛰었다'고 하지 않는다
{
  const g = fresh(4803); setAge(g, 20);
  const seq = [];
  for (let m = 0; m < 12 * 40 && !g.over; m++) {
    endMonth(g, [{ id: 'rest' }]);
    for (const n of g.news ?? []) {
      if (n.text.startsWith('빵값이 뛰었다')) seq.push('up');
      else if (/^(물가가 겨우 가라앉았다|빵값이 제자리로|밀값이 내렸다)/.test(n.text)) seq.push('down'); // 51단계: 가라앉는 말이 해마다 바뀐다
    }
    g.pendingEvent = null; L(g).queue.length = 0; L(g).scene = null;
  }
  const small = g.chronicle.filter((c) => c.text.includes('솜씨를 인정받는다는 말이 돈다') && c.rel < 40).length;
  check(small === 0, `모르는 사람 솜씨 소문 ${small}줄이 연대기에 쌓였다`);
  let twice = 0;
  for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) twice++;
  check(twice === 0, `빵값 소식이 같은 말을 거푸 한다: ${seq.join(',')}`);
}

console.log(fail ? `worldfixtest: 실패 ${fail}` : `worldfixtest: 통과 (${Date.now() - T0}ms)`);
process.exit(fail ? 1 : 0);
