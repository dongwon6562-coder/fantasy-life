// 새 물건: 발명이 나오면 장터에 들어오고, 시대가 갈수록 값이 내린다. 가진 물건은 매달 조금씩 삶을 바꾼다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, spend, traveling } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { E, invented } from './state.js';
const monthNow = (g) => g.date.year * 12 + g.date.month;

// need: 필요한 발명, where: 살 수 있는 곳(없으면 어디서나), max: 가질 수 있는 수
export const GOODS = {
  firestone: { name: '화석(火石) 부싯돌', need: 'firestone', price: 3, max: 1, desc: '불씨 없이 불을 붙인다. 아침마다 부싯돌과 씨름하지 않아도 된다.' },
  lantern: { name: '등석(燈石) 등잔', need: 'streetlamp', price: 12, max: 1, desc: '밤새 꺼지지 않는 푸른 빛. 해가 진 뒤에도 하루가 이어진다.' },
  warmstone: { name: '온석 화로', need: 'warmstone', price: 18, max: 1, desc: '겨울밤 장작 없이 방을 덥힌다. 땔감 값이 굳는다.' },
  book: { name: '찍어 낸 책', need: 'press', price: 5, max: 4, desc: '인쇄소에서 찍어 낸 싼 책. 연대기, 약초 도감, 검술 교본, 셈 공부.' },
  healband: { name: '정화석 붕대', need: 'healstone', price: 6, max: 3, desc: '상처가 덜 곪고 빨리 아문다. 다쳤을 때 하나씩 쓴다.' },
  plow: { name: '마석 쟁기', need: 'plow', price: 32, max: 1, desc: '한 사람이 두 사람 몫의 밭을 간다. 농사짓는 집이라면.' },
  blade: { name: '마석 화로에서 벼린 검', need: 'forge', price: 90, max: 1, where: ['harfen', 'leocast'], desc: '푸른 불로 벼린 쇠. 예전 강철검보다 단단하고 가볍다.' },
  cart: { name: '쇠수레 표', need: 'railroad', price: 4, max: 3, where: ['harfen', 'leocast'], desc: '왕도와 하르펜 사이를 쇠수레로 오간다. 한 장에 한 번.' },
};
// 시대가 갈수록 싸진다 (발명 직후가 가장 비싸다)
export function priceOf(g, id) {
  const d = GOODS[id];
  const n = g.history?.inventions?.length ?? 0;
  const idx = g.history?.inventions?.indexOf(d.need) ?? 0;
  const age = Math.max(0, n - 1 - idx); // 그 뒤로 나온 발명 수 = 흐른 시간
  return Math.max(1, Math.round(d.price * (1 - Math.min(0.5, age * 0.08)) * (g.realm?.bread ?? 1) ** 0.3));
}
export function shopList(g) {
  const here = L(g).place;
  return Object.entries(GOODS).filter(([id, d]) => invented(g, d.need) && (E(g).goods[id] ?? 0) < d.max && (!d.where || d.where.includes(here))).map(([id]) => id);
}

ACTIONS.push({
  id: 'era_shop', name: '새 물건 구경', icon: 'coin',
  desc: '장터에 새로 들어온 물건을 본다. 시대가 바뀌면 사는 모습도 바뀐다.',
  // 새 물건은 장날에나 들어온다: 한 번 보고 나면 반년은 지나야 다시 볼 거리가 있다
  available: (g) => playerAge(g) >= 12 && !traveling(g) && g.player.money >= 3 && !sceneQueued(g, 'era_shop')
    && monthNow(g) - (E(g).lastShop ?? -99) >= 6 && shopList(g).some((id) => priceOf(g, id) <= g.player.money),
  run(g) {
    // 같은 달에 여러 칸을 골라도 좌판은 한 번만 연다
    if (sceneQueued(g, 'era_shop')) return '좌판을 한 바퀴 더 돌았다. 아까 본 물건들이 그대로 놓여 있었다.';
    E(g).lastShop = monthNow(g); queueScene(g, 'era_shop'); return '장터의 새 물건 좌판 앞에 섰다.';
  },
});
defineScene('era_shop', {
  title: () => '새 물건 좌판',
  text: (g) => {
    const list = shopList(g);
    const fresh = list.filter((id) => (g.history.inventions.length - 1 - g.history.inventions.indexOf(GOODS[id].need)) <= 0);
    return `${fresh.length ? `${J(GOODS[fresh[0]].name, '이/가')} 새로 들어왔다고 사람들이 몰려 있다. ` : ''}${list.map((id) => `${GOODS[id].name}: ${GOODS[id].desc}`).join(' ')} 가진 돈은 은화 ${g.player.money}닢.`;
  },
  choices: (g) => shopList(g).slice(0, 5).map((id) => ({ label: `${GOODS[id].name} (은화 ${priceOf(g, id)}닢)`, key: id })).concat([{ label: '구경만 한다', key: 'none' }]),
  resolve(g, rng, s, key) {
    if (key === 'none') return '만져 보기만 하고 내려놓았다. 상인이 다음 장날엔 더 비쌀 거라고 했다.';
    const d = GOODS[key];
    if (!d || !spend(g, priceOf(g, key))) return '돈이 모자랐다.';
    const goods = E(g).goods;
    goods[key] = (goods[key] ?? 0) + 1;
    if (key === 'blade') { const gear = L(g).gear; if ((gear.weapon ?? 0) < 10) { gear.weapon = 10; gear.weaponName = '마석 화로에서 벼린 검'; } }
    if (key === 'book') {
      const kind = ['letters', 'herbs', 'sword', 'trade'][(goods.book - 1) % 4];
      gainSkill(g, kind, 2.5, 'int'); gainStat(g, 'int', 0.4);
      return `${['오래된 연대기', '약초 도감', '검술 교본', '셈과 장부 공부'][(goods.book - 1) % 4]}였다. 손때 묻지 않은 새 종이 냄새가 났다. 밤마다 조금씩 읽었다.`;
    }
    return {
      firestone: '돌 두 개를 맞부딪치자 불꽃이 튀었다. 쓰던 부싯돌 주머니는 짐 바닥 깊이 넣었다.',
      lantern: '첫날 밤, 등잔의 푸른 빛 아래서 늦도록 깨어 있었다. 밤이 이렇게 길 수 있다는 걸 처음 알았다.',
      warmstone: '온석에 손을 얹자 천천히 따뜻해졌다. 올겨울엔 장작을 덜 패도 된다.',
      healband: '정화석 가루를 먹인 붕대를 챙겨 두었다. 쓸 일이 없기를 바라면서.',
      plow: '쟁기 날 밑에 박힌 마석이 흙을 만나자 웅웅 울었다. 소가 놀라 뒷걸음질 쳤다.',
      blade: '칼날에 푸른 결이 흐른다. 대장장이는 이 검이면 예전 검 두 자루와도 맞선다고 했다.',
      cart: '쇠수레 표를 품에 넣었다. 왕도까지 사흘이면 간다고 한다.',
    }[key] ?? d.say ?? `${J(d.name, '을/를')} 샀다.`;
  },
});

// ---------- 가진 물건이 삶을 바꾼다 ----------
HOOKS.afterMonth.push((g) => {
  const goods = g.era?.goods;
  if (!goods) return;
  const p = g.player;
  const winter = g.date.month === 12 || g.date.month <= 2;
  if (goods.firestone) p.fatigue = Math.max(0, p.fatigue - 1);
  if (goods.lantern) p.stress = Math.max(0, p.stress - 1.5);
  if (goods.warmstone && winter) { p.fatigue = Math.max(0, p.fatigue - 3); p.familyMoney += 1; }
  if (goods.plow && (p.familyId === 'farmer' || g.life?.job?.id === 'farmer')) p.familyMoney += 2;
  // 정화석 붕대: 다친 데가 있으면 하나 써서 빨리 낫게
  if (goods.healband > 0 && p.injuries?.length) {
    const inj = p.injuries.find((x) => x.months > 1);
    if (inj) { inj.months -= 1; goods.healband -= 1; }
  }
});

// 쇠수레 표: 하르펜과 왕도 사이 길을 한 달 줄인다
HOOKS.afterActions.push((g) => {
  const t = g.life?.travel;
  if (!t || t.cart != null) return;
  t.cart = false;
  const route = [t.from, t.to].sort().join('-');
  if (route === 'harfen-leocast' && (g.era?.goods?.cart ?? 0) > 0 && t.left >= 1) {
    g.era.goods.cart -= 1; t.cart = true; t.left = Math.max(0, t.left - 1);
  }
});
