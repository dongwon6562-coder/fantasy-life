// 장삿길의 일들 (장면 trade_event, 다섯 달에 한 번까지): 가짜 저울, 통째로 사겠다는 상단, 상인 길드, 흉년의 밀,
// 밀수꾼의 상자, 귀족의 외상, 군납, 짐을 빼돌린 호위, 다친 짐꾼, 시세 소문.
import { HOOKS } from '../hooks.js';
import { gainSkill, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, gains, up, stress, check } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  T, GOODS, GOOD_IDS, LOCAL, mi, clamp, here, free, isMarket, cargoQty, cargoList, cargoValue, sellAt, logTrade, tradeSkill, realmOf,
} from './core.js';

const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
const war = (g) => { const r = g.realm ?? {}; return !!(r.balhart?.war || r.succession === 'civilwar' || r.north?.war); };
const hungry = (g) => (g.realm?.bread ?? 1) >= 1.2 || !!g.world?.famine;
const has = (g, k) => (T(g).cargo[k]?.qty ?? 0) > 0;
const NOBLES = ['라우엔 자작가의 집사', '몬트렐 공작가의 셋째 아들', '베르덴 백작부인의 시녀장', '이름을 밝히지 않는 기사'];

export const TRADE_EVENTS = {
  scale: {
    need: (g) => cargoQty(g) > 0,
    text: () => '짐을 넘기려던 상인의 저울이 이상하다. 추를 올릴 때마다 손가락이 접시 밑으로 들어간다.',
    choices: () => [{ label: '저울을 뒤집어 보자고 한다', key: 'call' }, { label: '경비를 부른다', key: 'guard' }, { label: '모른 척 넘어간다', key: 'let' }],
    resolve(g, rng, s, key) {
      if (key === 'let') { const v = Math.round(cargoValue(g, here(g)) * 0.05); g.player.money = Math.max(0, g.player.money - v); return `은화 ${v}닢쯤은 손해 보았을 것이다. 싸움을 피한 값이다.`; }
      const ok = check(rng, g.player.stats.sen + tradeSkill(g) * 0.4, 50);
      const sk = gainSkill(g, 'trade', 0.8, 'sen');
      if (ok) { deed(g, 'honest', 3, '장터의 가짜 저울을 밝혀냈다.'); g.player.money += 6; return `${key === 'guard' ? '경비가 저울을 뒤집자' : '저울 밑을 들여다보자'} 접시 밑에 붙은 납 조각이 떨어졌다. 상인은 얼굴이 하얘져 웃돈을 얹어 주었다.${gains([up('장사', sk)])}`; }
      stress(g, 4);
      return `저울에는 아무것도 없었다. 상인이 큰 소리로 나를 사기꾼이라 불렀다. 구경꾼들이 수군거렸다.${gains([up('장사', sk)])}`;
    },
  },
  bulk: {
    need: (g) => cargoQty(g) >= 10 && isMarket(here(g)),
    text: (g) => `${['붉은돛 상회', '은저울 상단', '철망치 상회'][g.date.month % 3]}의 대리인이 짐을 통째로 넘기라고 한다. 짐당 시세보다 조금 싸지만, 흥정할 필요도, 장터에 앉아 있을 필요도 없다. 모두 은화 ${Math.round(bulkPrice(g))}닢.`,
    choices: (g) => [{ label: `통째로 넘긴다 (은화 ${Math.round(bulkPrice(g))}닢)`, key: 'sell' }, { label: '내 손으로 판다', key: 'no' }],
    resolve(g, rng, s, key) {
      if (key !== 'sell') return '대리인은 명함 같은 나무패를 두고 갔다.';
      const t = T(g), got = Math.round(bulkPrice(g)), cost = cargoList(g).reduce((a, [, c]) => a + c.cost, 0);
      g.player.money += got; t.profit += got - cost; t.monthProfit += got - cost; t.volume += cargoQty(g); t.trips += 1;
      t.cargo = {};
      logTrade(g, `짐을 통째로 은화 ${got}닢에 넘겼다.`);
      return `짐을 통째로 넘겼다. ${got - cost >= 0 ? `${got - cost}닢이 남았다.` : `${cost - got}닢을 밑졌다.`} 대리인의 서기가 짐 수를 세는 데 반나절이 걸렸다.`;
    },
  },
  guild: {
    need: (g) => !T(g).guild && realmOf(here(g)) === 'leonia' && T(g).volume >= 30,
    text: () => '상인 길드의 서기가 찾아왔다. 길드에 들면 왕국 안 성문 통행세가 줄고, 장터에서 흥정할 때 길드 패가 통한다. 입회비는 은화 50닢, 해마다 길드 일에 얼굴을 내밀어야 한다.',
    choices: (g) => [...(g.player.money >= 50 ? [{ label: '길드에 든다 (은화 50닢)', key: 'join' }] : []), { label: '혼자 다니는 게 편하다', key: 'no' }],
    resolve(g, rng, s, key) {
      if (key !== 'join' || g.player.money < 50) return '서기는 "언젠가 들게 될 겁니다" 하고 돌아갔다.';
      g.player.money -= 50; T(g).guild = true;
      logTrade(g, '상인 길드에 들었다.');
      note(g, '상인 길드에 들었다.');
      return '길드 회관에서 저울 문양이 새겨진 놋쇠 패를 받았다. 원로 하나가 "장사는 혼자 하는 게 아니오" 하고 잔을 들었다.';
    },
  },
  famine: {
    need: (g) => hungry(g) && (has(g, 'grain') || g.player.money >= 80),
    text: (g) => `흉년이다. ${placeName(here(g))} 성문 밖에 굶주린 사람들이 줄을 섰다. ${has(g, 'grain') ? '내 짐에는 밀이 있다. 창고에 쥐고 있으면 값은 더 오를 것이다.' : '곡물상들은 창고 문을 닫아걸고 값이 오르기를 기다린다. 나도 지금 밀을 사 두면 크게 남길 수 있다.'}`,
    choices: (g) => has(g, 'grain')
      ? [{ label: '굶주린 사람들에게 제값에 판다', key: 'fair' }, { label: '나눠 준다', key: 'give' }, { label: '값이 더 오를 때까지 쥐고 있는다', key: 'hoard' }]
      : [{ label: '밀을 사서 쟁인다 (은화 80닢)', key: 'buy' }, { label: '그런 장사는 하지 않는다', key: 'no' }],
    resolve(g, rng, s, key) {
      const t = T(g), c = t.cargo.grain;
      if (key === 'fair' && c) { const got = c.qty * GOODS.grain.base; g.player.money += got; t.profit += got - c.cost; delete t.cargo.grain; deed(g, 'kind', 8, '흉년에 밀을 제값에 풀었다.'); deed(g, 'generous', 4, '흉년에 밀을 제값에 풀었다.'); return `밀 ${c.qty}짐을 흉년 전 값에 풀었다. 은화 ${got}닢. 곡물상들이 나를 노려보았지만, 아이를 안은 여자가 내 손을 잡고 울었다.`; }
      if (key === 'give' && c) { t.profit -= c.cost; delete t.cargo.grain; deed(g, 'kind', 12, '흉년에 밀을 나눠 주었다.'); deed(g, 'generous', 10, '흉년에 밀을 나눠 주었다.'); L(g).renown = (L(g).renown ?? 0) + 3; note(g, '흉년에 밀을 나눠 주었다.'); return `밀 ${c.qty}짐을 성문 밖에서 나눠 주었다. 줄은 해가 질 때까지 줄지 않았다. 사람들이 내 이름을 물었다.`; }
      if (key === 'hoard' && c) { const m = (T(g).mkt[`${here(g)}:grain`] ??= { drift: 0, sat: 0 }); m.drift = clamp(m.drift + 0.2, -0.3, 0.3); deed(g, 'kind', -8, '흉년에 밀을 쥐고 값을 올렸다.'); return '창고 문을 닫아걸었다. 밤마다 문 두드리는 소리가 들렸다. 값은 오를 것이다. 사람들의 눈빛도 달라질 것이다.'; }
      if (key === 'buy' && g.player.money >= 80) { const q = Math.max(1, Math.floor(80 / Math.max(1, Math.round(GOODS.grain.base * 1.4)))); g.player.money -= 80; const cg = (t.cargo.grain ??= { qty: 0, cost: 0 }); cg.qty += q; cg.cost += 80; deed(g, 'kind', -4, '흉년에 밀을 사서 쟁였다.'); return `밀 ${q}짐을 사서 쟁였다. 곡물상들이 나를 같은 편으로 반겼다.`; }
      return '고개를 돌리고 장터를 떠났다.';
    },
  },
  smuggle: {
    need: (g) => !T(g).contraband,
    text: () => '검은 장갑을 낀 사내가 봉인된 작은 상자를 내밀었다. "다음 고장까지만 옮겨 주시오. 열어 보지 말고. 은화 80닢." 상자는 생각보다 무겁다.',
    choices: () => [{ label: '맡는다 (은화 80닢)', key: 'take' }, { label: '거절한다', key: 'no' }, { label: '경비에게 알린다', key: 'report' }],
    resolve(g, rng, s, key) {
      if (key === 'take') {
        g.player.money += 80;
        if (rng.chance(0.3)) { reportCrime(g, 'smuggling', here(g), { mult: 0.7 }); logTrade(g, '밀수 상자를 옮기다 들켰다.'); return '성문에서 상자가 열렸다. 안에는 금지된 마도구가 들어 있었다. 은화는 받았지만 이름이 밀수꾼 명부에 올랐다.'; }
        logTrade(g, '봉인된 상자를 옮겨 주었다.');
        return '상자는 아무 일 없이 다음 고장의 한 주점 뒷방에 닿았다. 무엇이었는지는 끝내 묻지 않았다.';
      }
      if (key === 'report') { deed(g, 'honest', 5, '밀수꾼을 경비에게 알렸다.'); return '경비가 사내를 쫓았지만 골목에서 놓쳤다. 그날 밤 여관 문틈에 검은 장갑 한 짝이 꽂혀 있었다.'; }
      return '사내는 어깨를 으쓱하고 다른 장사꾼을 찾아갔다.';
    },
  },
  credit: {
    need: (g) => cargoQty(g) >= 6 && T(g).debts.length < 2,
    text: (g, s) => `${J(NOBLES[s.n ?? 0], '이/가')} 짐을 모두 사겠다고 한다. 값은 시세보다 후하다. 다만 돈은 반년 뒤에 치르겠다고 한다. "우리 집안의 이름을 못 믿는 거요?"`,
    choices: (g) => [{ label: `외상으로 넘긴다 (반년 뒤 은화 ${Math.round(cargoValue(g, here(g)) * 1.25)}닢)`, key: 'yes' }, { label: '현금이 아니면 안 된다', key: 'no' }],
    resolve(g, rng, s, key) {
      const t = T(g), who = NOBLES[s.n ?? 0];
      if (key !== 'yes') { deed(g, 'honest', 1, '귀족에게도 외상을 주지 않았다.'); return `${J(who, '은/는')} 코웃음을 치고 돌아섰다.`; }
      const amt = Math.round(cargoValue(g, here(g)) * 1.25), cost = cargoList(g).reduce((a, [, c]) => a + c.cost, 0);
      t.debts.push({ who, amt, cost, due: mi(g) + 6, odds: 0.65 });
      t.profit += amt - cost; t.volume += cargoQty(g);
      t.cargo = {};
      logTrade(g, `${who}에게 짐을 외상으로 넘겼다 (은화 ${amt}닢).`);
      return `짐을 모두 넘기고 외상 장부에 은화 ${amt}닢을 적었다. 장부 옆에는 문장이 찍힌 밀랍 봉인이 찍혔다. 봉인이 은화가 되기를 바랄 뿐이다.`;
    },
  },
  army: {
    need: (g) => war(g) && (has(g, 'iron') || has(g, 'grain') || has(g, 'wool') || has(g, 'dwarfsteel')),
    text: () => '전쟁이다. 군 보급관이 장터에 나와 쇠와 밀과 모직을 사들인다. 값은 후하지만 "왕국을 위해" 덤을 얹으라는 눈치다.',
    choices: () => [{ label: '군에 넘긴다', key: 'sell' }, { label: '군납은 하지 않는다', key: 'no' }],
    resolve(g, rng, s, key) {
      if (key !== 'sell') return '보급관이 내 이름을 장부에 적었다. 무엇을 적었는지는 모르겠다.';
      const t = T(g);
      let got = 0, cost = 0, n = 0;
      for (const k of ['iron', 'grain', 'wool', 'dwarfsteel']) {
        const c = t.cargo[k];
        if (!c?.qty) continue;
        got += Math.round(c.qty * sellAt(g, here(g), k) * 1.35); cost += c.cost; n += c.qty;
        delete t.cargo[k];
      }
      g.player.money += got; t.profit += got - cost; t.monthProfit += got - cost; t.volume += n;
      deed(g, 'loyal', 3, '전쟁 때 군에 물자를 댔다.');
      if (g.army) g.army.supplied = (g.army.supplied ?? 0) + 1;
      logTrade(g, `군에 짐 ${n}짐을 은화 ${got}닢에 넘겼다.`);
      return `짐 ${n}짐을 군수 창고에 넘기고 은화 ${got}닢을 받았다. 보급관이 "전쟁은 장사꾼을 살찌운다" 하고 웃었다. 웃음이 차가웠다.`;
    },
  },
  guard_thief: {
    need: (g) => T(g).caravan.guards > 0 && cargoQty(g) > 0,
    text: () => '짐 수가 맞지 않는다. 밤새 지켜보니 호위 하나가 짐을 풀어 다른 장사꾼에게 넘기고 있었다.',
    choices: () => [{ label: '내쫓는다', key: 'fire' }, { label: '한 번은 용서한다', key: 'forgive' }, { label: '본보기로 매질한다', key: 'beat' }],
    resolve(g, rng, s, key) {
      const t = T(g);
      if (key === 'forgive') { deed(g, 'loyal', 3, '짐을 빼돌린 호위를 용서했다.'); if (rng.chance(0.4)) { t.caravan.guards -= 1; return '그는 무릎을 꿇고 울었다. 그리고 사흘 뒤 짐 몇 짐과 함께 사라졌다.'; } return '그는 무릎을 꿇고 울었다. 그 뒤로는 누구보다 먼저 일어나 짐을 지켰다.'; }
      t.caravan.guards -= 1;
      if (key === 'beat') { deed(g, 'kind', -5, '짐을 빼돌린 호위를 매질했다.'); return '다른 호위들 앞에서 매질하고 내쫓았다. 아무도 눈을 마주치지 않았다. 그 뒤로 짐 수는 늘 맞았다.'; }
      return '마지막 삯도 주지 않고 내쫓았다.';
    },
  },
  porter: {
    need: (g) => T(g).caravan.porters > 0,
    text: () => '짐꾼 하나가 미끄러운 비탈에서 짐에 깔려 다리가 부러졌다. 의원비는 은화 10닢쯤 든다.',
    choices: (g) => [...(g.player.money >= 10 ? [{ label: '의원에게 데려간다 (은화 10닢)', key: 'heal' }] : []), { label: '삯을 쥐여 주고 내보낸다', key: 'send' }],
    resolve(g, rng, s, key) {
      const t = T(g);
      if (key === 'heal' && g.player.money >= 10) { g.player.money -= 10; deed(g, 'kind', 5, '다친 짐꾼을 의원에게 데려갔다.'); return '의원이 다리를 맞추는 동안 짐꾼은 이를 악물었다. 두 달 뒤 그는 절뚝이며 다시 짐 끈을 멨다. 다른 짐꾼들이 그 이야기를 오래 했다.'; }
      t.caravan.porters -= 1; deed(g, 'kind', -3, '다친 짐꾼을 내보냈다.');
      return '짐꾼에게 한 달 삯을 쥐여 주고 마을 어귀에 내려 주었다. 그는 아무 말도 하지 않았다.';
    },
  },
  rumor: {
    need: () => true,
    text: (g, s) => `역참 주점에서 들은 이야기: ${placeName(s.pl)}에서 ${GOODS[s.good]?.name ?? '밀'} 값이 치솟았다고 한다. ${s.real ? '말하는 사람의 눈빛이 진지했다.' : '말하는 사람은 이미 많이 취해 있었다.'}`,
    choices: () => [{ label: '장부에 적어 둔다', key: 'note' }, { label: '흘려듣는다', key: 'no' }],
    resolve(g, rng, s, key) {
      const t = T(g);
      if (s.real) { const m = (t.mkt[`${s.pl}:${s.good}`] ??= { drift: 0, sat: 0 }); m.drift = clamp(m.drift + 0.25, -0.3, 0.45); }
      if (key === 'note') { t.rumor = { pl: s.pl, good: s.good, at: mi(g) }; return `장부 귀퉁이에 "${placeName(s.pl)}, ${GOODS[s.good]?.name ?? '밀'}"${J(GOODS[s.good]?.name ?? '밀', '이/가').endsWith('이') ? '이라고' : '라고'} 적었다. 참말인지는 가 봐야 안다.`; }
      return '술값만 치르고 일어섰다.';
    },
  },
};
export const TRADE_EVENT_IDS = Object.keys(TRADE_EVENTS);
function bulkPrice(g) { return cargoList(g).reduce((a, [k, c]) => a + c.qty * sellAt(g, here(g), k) * 0.95, 0); }

defineScene('trade_event', {
  need: (g, s) => !!TRADE_EVENTS[s.ev] && TRADE_EVENTS[s.ev].need(g, s),
  title: () => '장삿길',
  text: (g, s) => TRADE_EVENTS[s.ev].text(g, s),
  choices: (g, s) => TRADE_EVENTS[s.ev].choices(g, s),
  resolve(g, rng, s, key) { return TRADE_EVENTS[s.ev].resolve(g, rng, s, key); },
});

HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const t = T(g);
  // 48단계: 어린 상속자에게 앞 사람의 짐수레 장삿길 장면이 뜨지 않게
  if (t.cool > 0 || !free(g) || playerAge(g) < 14 || sceneQueued(g, 'trade_event')) return;
  const trader = cargoQty(g) > 0 || t.caravan.wagons > 0 || t.volume >= 20;
  if (!rng.chance(trader ? 0.06 : 0)) return;
  const pl = rng.pick(Object.keys(LOCAL).filter((p) => p !== here(g)));
  const data = { n: rng.int(0, NOBLES.length - 1), pl, good: rng.pick(GOOD_IDS), real: rng.chance(0.7) };
  const evs = TRADE_EVENT_IDS.filter((e) => TRADE_EVENTS[e].need(g, data));
  if (!evs.length) return;
  queueScene(g, 'trade_event', { ev: rng.pick(evs), ...data });
  t.cool = 5;
});
