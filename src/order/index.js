// 기사단 (31단계): 성흔기사단(솔라리스)·잿빛 성벽 기사단(그라우벨)·레오니아 왕국 기사단(이미 있는 소속).
// 종자로 들어가 서임받기, 서약과 계율, 순례길·묘지·마신교·국경·성벽 너머 임무, 형제 기사, 단장 자리,
// 재물이 쌓인 기사단이 이단으로 몰려 무너지는 일, 은퇴, 무너진 기사단을 다시 세우는 대 잇기.
// 학원의 기사 서임 시험(school)과 왕국 기사단의 일(factions)은 그대로 두고, 그 위에 형제·서약·단장·은퇴를 얹는다.
// 화면: orderLine(g) 오늘의 장면 한 줄, orderInfo(g) 화면용 묶음.
import { HOOKS } from '../hooks.js';
import { sceneQueued } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { OS, orderOf, inOrder, level, rankName, myOrderName, brothers, atSeat, here, mi, ownRng, ORDERS, ORDER_IDS, NEW_ORDERS } from './core.js';
import { orderMonth } from './life.js';
import { orderYear, orderWorldMonth } from './world.js';

export { OS as orderState } from './core.js';
export { startHeresy } from './world.js';
export { readyToDub } from './life.js';

const wealthWord = (w) => (w >= 70 ? '곳간이 넘친다' : w >= 40 ? '살림이 넉넉하다' : w >= 15 ? '살림이 빠듯하다' : '곳간이 비었다');
const strengthWord = (s) => (s >= 70 ? '강하다' : s >= 40 ? '버틸 만하다' : s >= 15 ? '지쳐 있다' : '이름만 남았다');

/** 화면용 묶음 */
export function orderInfo(g) {
  const st = OS(g);
  const orders = ORDER_IDS.map((id) => {
    const o = orderOf(g, id), O = ORDERS[id];
    return {
      id, name: O.name, seat: O.seat, hall: O.hall, banner: O.banner, desc: O.desc, vows: O.vows.slice(),
      master: o.master?.name ?? null, strength: strengthWord(o.strength), wealth: wealthWord(o.wealth),
      fallen: o.fallen ? { y: o.fallen.y, why: o.fallen.why } : null, heresy: o.heresy?.stage ?? 0,
    };
  });
  const m = st.me;
  return {
    orders,
    me: m ? {
      id: m.id, name: myOrderName(g), rank: rankName(g), level: level(g), master: !!m.master, since: m.joined?.[0] ?? null,
      vows: ORDERS[m.id].vows.slice(), broken: m.broke.slice(), hidden: !!m.hidden,
      brothers: brothers(g).map((b) => ({ id: b.id, name: `${b.name} ${b.lastName}`, mentor: b.id === m.mentor })),
    } : null,
    retired: st.retired ? { ...st.retired } : null,
    past: st.past.map((p) => ({ ...p, order: ORDERS[p.id]?.name ?? '기사단' })),
    log: st.log.slice(-8),
  };
}

const BRO_LINE = [
  (b) => `형제 ${J(b, '이/가')} 성벽 위에서 손을 들어 보였다.`,
  (b) => `${J(b, '이/가')} 저녁 식탁에서 내 몫의 빵을 남겨 두었다.`,
  (b) => `${J(b, '은/는')} 오늘도 마구간에서 말에게 혼잣말을 하고 있었다.`,
  (b) => `${J(b, '이/가')} 새로 들어온 종자의 칼 잡는 손을 고쳐 주고 있었다.`,
  (b) => `${J(b, '과/와')} 막사 앞에서 말없이 칼을 갈았다.`,
];
/** 오늘의 장면에 붙는 한 줄. 할 말이 없으면 null. */
export function orderLine(g) {
  if (!g?.player || g.over) return null;
  const st = OS(g), m = st.me;
  if (m) {
    const o = orderOf(g, m.id);
    if (o.heresy) return o.heresy.stage >= 2 ? '붙잡혀 간 형제들의 빈 침상이 막사에 줄지어 있다.' : '이단심문소 사람들이 성채 문 앞을 오간다. 형제들의 말수가 줄었다.';
    const bs = brothers(g);
    const head = `${myOrderName(g)} ${rankName(g)}.`;
    if (bs.length && atSeat(g)) { const b = bs[mi(g) % bs.length]; return `${head} ${BRO_LINE[(mi(g) >> 1) % BRO_LINE.length](b.name)}`; }
    if (m.hidden === 'marriage') return `${head} 옷 안의 반지가 오늘따라 무겁다.`;
    return head;
  }
  if (st.retired) {
    const n = g.date.year - st.retired.y;
    return n <= 0 ? `${st.retired.name}에서 막 물러났다. 새벽 종소리에 아직도 몸이 먼저 일어난다.` : `${st.retired.name}에서 물러난 지 ${n}년. 성채 쪽에서 종이 울리면 아직도 몸이 먼저 일어난다.`;
  }
  const lost = st.past.find((p) => orderOf(g, p.id)?.fallen);
  if (lost) return `${ORDERS[lost.id].name}의 깃발은 내려간 지 오래다. 낡은 망토는 아직 궤짝 안에 있다.`;
  const here_ = here(g);
  for (const id of NEW_ORDERS) {
    if (ORDERS[id].seat !== here_) continue;
    const o = orderOf(g, id);
    if (o.fallen) return `무너진 ${ORDERS[id].hall}의 빈 망루에 까마귀가 앉아 있다.`;
    if (o.heresy) return `${ORDERS[id].hall} 앞에 이단심문소 경비병들이 서 있다.`;
    return `${ORDERS[id].hall} 위로 ${ORDERS[id].banner}이 펄럭인다.`;
  }
  return null;
}

HOOKS.afterMonth.push((g) => {
  if (g.over) return;
  const rng = ownRng(g, 7);
  if (g.date.month === 1) orderYear(g, rng);
  orderWorldMonth(g, rng);
  orderMonth(g, rng);
  // 단장 자리가 비어 있는데 고를 사람이 없으면 기사단이 알아서 세운다
  for (const id of ORDER_IDS) {
    const o = orderOf(g, id);
    if (o.master?.vacant && !(OS(g).me?.id === id && level(g) >= 2 && sceneQueued(g, 'order_election'))) {
      o.masterN = (o.masterN ?? 0) + 1;
      o.master = { name: ORDERS[id].master[o.masterN % ORDERS[id].master.length], born: g.date.year - 50 };
    }
  }
});
export { inOrder };
