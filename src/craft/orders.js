// 납품 의뢰: 기사단의 창날, 여관의 혼례 잔치, 성당의 역병 약, 영주관의 밀, 상단의 짐.
// 받으면 정한 달 안에 일을 몇 번 해서 일정 품질 이상으로 채워야 한다. 채우면 큰돈과 이름값, 못 채우면 신용을 잃는다.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, isAdult } from '../adventure/core.js';
import { atWar, monthIndex, lordName } from '../world.js';
import { TRADES, C, myTrade, QUALITY, skillOf, gradeOf, addFame, fameOf } from './core.js';

// 갈래마다 의뢰. need: 일 횟수, minQ: 최소 품질(0 조악 ~ 3 훌륭), pay: 한 번 몫의 값(장소 품삯 배수 전)
const ORDERS = {
  smithing: [
    { id: 'spears', title: '기사단 창날', from: '기사단 병참관', text: '기사단 병참관이 창날 마흔 개를 주문했다. 날이 무르면 전장에서 사람이 죽는다며 품질을 따지겠다고 한다.', need: 5, minQ: 1, pay: 6, war: true },
    { id: 'plows', title: '마을 쟁기 날', from: '촌장', text: '촌장이 봄갈이 전에 마을 쟁기 날을 모두 새로 쳐 달라고 한다. 값은 박하지만 급하다고.', need: 4, minQ: 0, pay: 3 },
    { id: 'gate', title: '성문 경첩', from: '영주의 성지기', text: (g) => `${lordName(g)}의 성지기가 성문 경첩과 빗장을 새로 맞추러 왔다. 영주관 일은 실수하면 다시는 들어갈 수 없다.`, need: 4, minQ: 2, pay: 7 },
    { id: 'blade', title: '귀족 자제의 장검', from: '젊은 귀족', text: '왕도에서 온 젊은 귀족이 성인식에 찰 장검을 맞추겠다고 한다. 돈은 아끼지 않겠지만, 눈이 높다.', need: 3, minQ: 3, pay: 18, minGrade: 2 },
  ],
  cooking: [
    { id: 'wedding', title: '혼례 잔치', from: '방앗간 주인', text: '방앗간 주인이 딸의 혼례 잔치를 통째로 맡기겠다고 한다. 손님만 여든 명이다.', need: 4, minQ: 1, pay: 5 },
    { id: 'guild', title: '길드 연회', from: '모험가 길드', text: '모험가 길드가 A급 파티의 귀환 연회를 맡긴다. 거친 사람들이지만 입은 까다롭다.', need: 3, minQ: 2, pay: 8 },
    { id: 'lord', title: '영주의 사냥 연회', from: '영주관 집사', text: (g) => `${lordName(g)}의 집사가 가을 사냥 연회의 요리를 맡아 달라고 한다. 잘하면 영주관 부엌에 이름이 오른다.`, need: 4, minQ: 3, pay: 14, minGrade: 2 },
  ],
  herbs: [
    { id: 'plague', title: '역병 약', from: '성당 사제', text: '성당 사제가 열병 환자들에게 쓸 해열제를 대 달라고 한다. 값은 성당 헌금에서 나온다.', need: 5, minQ: 1, pay: 5, plague: true },
    { id: 'salve', title: '전장 고약', from: '기사단 의무관', text: '기사단 의무관이 상처에 바를 고약을 단지째 주문했다.', need: 4, minQ: 1, pay: 5, war: true },
    { id: 'midwife', title: '산파의 약상자', from: '마을 산파', text: '마을 산파가 해산 때 쓸 지혈약과 진통약을 채워 달라고 한다.', need: 3, minQ: 2, pay: 4 },
  ],
  farming: [
    { id: 'manor', title: '영주관 밀 납품', from: '영주관 집사', text: (g) => `${lordName(g)}의 집사가 겨울 곳간에 넣을 밀을 미리 사겠다고 한다. 알이 굵어야 한다.`, need: 5, minQ: 1, pay: 4 },
    { id: 'brewer', title: '양조장 보리', from: '양조장 주인', text: '하르펜 양조장 주인이 맥주 보리를 대 달라고 한다. 보리가 좋으면 해마다 사겠다고.', need: 4, minQ: 2, pay: 5 },
  ],
  trade: [
    { id: 'salt', title: '소금 수송', from: '은저울 상단', text: '은저울 상단이 남부 소금 짐을 맡기겠다고 한다. 길에서 젖거나 털리면 내가 물어야 한다.', need: 4, minQ: 1, pay: 7 },
    { id: 'army', title: '군수품 조달', from: '기사단 병참관', text: '기사단 병참관이 건빵과 화살대를 모아 달라고 한다. 전쟁 중이라 값은 잘 쳐준다.', need: 5, minQ: 1, pay: 9, war: true },
    { id: 'artifact', title: '마도구 들여오기', from: '왕도 공방', text: '왕도 공방이 남쪽 마석을 들여와 달라고 한다. 진짜와 가짜를 가릴 눈이 있어야 한다.', need: 3, minQ: 2, pay: 12, era: 1 },
  ],
};

const resolveText = (o, g) => (typeof o.text === 'function' ? o.text(g) : o.text);

function eligible(g, trade) {
  const sk = skillOf(g, trade);
  return ORDERS[trade].filter((o) => (!o.war || atWar(g)) && (!o.plague || g.world?.plague) && (!o.era || (g.realm?.era ?? 0) >= o.era) && gradeOf(sk) >= (o.minGrade ?? 0));
}

defineScene('craft_order', {
  title: (g, s) => `납품 의뢰: ${s.title}`,
  text: (g, s) => `${s.text} ${s.months}달 안에 ${QUALITY[s.minQ]} 것 이상으로 ${s.need}번 일해 채워야 한다. 다 채우면 은화 ${s.pay}닢. 못 채우면 신용을 잃는다.`,
  choices: () => [{ label: '맡는다', key: 'yes' }, { label: '거절한다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key !== 'yes') return `${J(s.from, '은/는')} 아쉬운 얼굴로 돌아갔다.`;
    const c = C(g);
    c.orders.push({ id: s.id, trade: s.trade, title: s.title, from: s.from, need: s.need, done: 0, minQ: s.minQ, pay: s.pay, due: monthIndex(g) + s.months, place: L(g).place });
    return `${J(s.from, '과/와')} 손을 맞잡았다. 이제부터 일하러 가면 이 일부터 한다.`;
  },
});

export function queueOrder(g, rng, trade = myTrade(g)) {
  if (!trade) return false;
  const pool = eligible(g, trade).filter((o) => !C(g).orders.some((x) => x.id === o.id));
  if (!pool.length) return false;
  const o = rng.pick(pool);
  const placeWage = PLACES[L(g).place]?.wage ?? 1;
  const pay = Math.round(o.need * o.pay * placeWage * (1 + fameOf(g, trade) / 120) * rng.float(0.9, 1.15));
  queueScene(g, 'craft_order', { id: o.id, trade, title: o.title, from: o.from, text: resolveText(o, g), need: o.need, minQ: o.minQ, pay, months: Math.max(2, Math.ceil(o.need / 3) + 1) });
  return true;
}

HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const c = C(g);
  const now = monthIndex(g);
  // 끝난 의뢰와 기한이 지난 의뢰
  for (const o of [...c.orders]) {
    if (o.done >= o.need) {
      c.orders.splice(c.orders.indexOf(o), 1);
      g.player.money += o.pay;
      addFame(g, o.trade, 2 + o.minQ);
      L(g).renown += o.minQ >= 2 ? 1 : 0;
      note(g, `${o.title} 의뢰를 마쳤다.`);
      g.news.unshift({ text: `${o.title}: ${J(o.from, '이/가')} 약속한 은화 ${o.pay}닢을 치렀다. 솜씨가 좋다는 말이 돌았다.`, rel: 100 });
    } else if (now >= o.due) {
      c.orders.splice(c.orders.indexOf(o), 1);
      addFame(g, o.trade, -6);
      const part = o.done ? Math.round(o.pay * o.done / o.need * 0.5) : 0;
      g.player.money += part;
      g.news.unshift({ text: `${o.title} 의뢰를 기한 안에 채우지 못했다. ${o.from}의 얼굴이 굳었다.${part ? ` 채운 몫으로 은화 ${part}닢만 받았다.` : ''}`, rel: 100 });
    }
  }
  // 새 의뢰: 생산직으로 일하고 있고, 맡은 의뢰가 없을 때
  const life = L(g);
  const trade = myTrade(g);
  if (!trade || !isAdult(g) || life.travel || c.orders.length || sceneQueued(g, 'craft_order')) return;
  const chance = 0.05 + fameOf(g, trade) / 600 + gradeOf(skillOf(g, trade)) * 0.015;
  if (rng.chance(chance)) queueOrder(g, rng, trade);
});

export { ORDERS, TRADES };
