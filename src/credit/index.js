// 39단계: 빚과 돈놀이 (도우미스레드3). 환전상과 은행가 집안(시대 따라 커짐), 왕의 빚과 은행가의 몰락, 탕감령, 전당포,
// 은행에 맡긴 돈과 빌린 돈, 빚 문서가 고리대금업자에게 넘어가는 일, 내가 돈놀이하는 길과 내 은행.
// 빌리기·갚기·빚쟁이·파산·빚 대물림은 estate(src/estate/money.js), 도박 빚은 contest, 빚 노예는 poor/bond.js가 맡는다.
// 화면용: creditLine(g) 이번 달 이 고장의 돈 이야기 한 줄(없으면 null), creditInfo(g) 한 장, bankAt(g, 고장)
import { MAP_INFO } from '../art/map.js';
import { J } from '../narrative/text.js';
import { CS, liveBanks, bankAt, myBank, bankById, placeName, mi, stage, STAGE_WORD, houseWord, fortuneWord, endWord, deposited, lentOut } from './state.js';
import { redeemPrice, lendCap } from './life.js';
import './world.js';

export { creditMonth, jubilee, failBank } from './world.js';
export { bankAt, stage as creditStage } from './state.js';
export const creditState = CS;

/** 이번 달 이 고장의 돈 이야기 한 줄 (없으면 null) */
export function creditLine(g) {
  if (!g?.credit || !g.date || !g.life || g.life.travel) return null;
  const S = g.credit, pl = g.life.place, now = mi(g), mb = myBank(g);
  if (mb && mb.seat === pl) return mb.fortune < 20 ? `${houseWord(g, mb)} 창구 앞 예금자들의 얼굴이 굳어 있다. 서기가 금고 열쇠를 자꾸 만지작거린다.` : `아침마다 ${houseWord(g, mb)} 문이 열리면 어음을 든 상인들이 줄을 선다. 내 이름이 찍힌 종이가 장터에서 은화처럼 돈다.`;
  const lastJ = S.crown.lastJubilee;
  if (lastJ > 0 && now - lastJ <= 3) return '탕감령이 붙은 장터 기둥 앞에서 늙은 농부가 글을 읽을 줄 아는 사람을 붙잡고 몇 번이고 다시 읽어 달라고 한다.';
  const b = bankAt(g, pl);
  if (b) {
    if (b.fortune < 20) return `${houseWord(g, b)} 금고 앞에 새벽부터 사람들이 서성인다. 누구도 먼저 줄을 서지는 않는다.`;
    if (b.crown > 0 && g.realm?.balhart?.war) return `${houseWord(g, b)} 문 앞에 왕실 마차가 서 있다. 전쟁 돈이 또 저 문으로 들어갔다 나온다.`;
    if (stage(g) === 0) return `장터 다리 위 ${b.house} 집안 환전 탁자에서 저울 접시가 쉼 없이 오르내린다.`;
    if ((now + b.id) % 3 === 0) return `${b.house} 집안 서기들이 검은 옷을 입고 장부를 끼고 지나간다. 사람들이 길을 비켜 준다.`;
  }
  const past = S.past.filter((x) => x.seat === pl && g.date.year - x.to <= 2).slice(-1)[0];
  if (past && (past.end === 'crown' || past.end === 'run' || past.end === 'failed')) return `판자가 박힌 ${past.house} 집안 금고 문에 누가 분필로 '도둑놈들'이라고 써 놓았다.`;
  const pawn = S.me.pawns.find((p) => p.place === pl && p.due - now <= 1);
  if (pawn) return `전당포 앞을 지나다 창살 너머 ${J(pawn.what, '을/를')} 보았다. 꼬리표가 바람에 흔들린다. 찾아갈 날이 얼마 남지 않았다.`;
  return null;
}

/** 화면 한 장 */
export function creditInfo(g) {
  const S = CS(g), now = mi(g), me = S.me, bk = me.book, mb = myBank(g);
  return {
    stage: stage(g), stageWord: STAGE_WORD[stage(g)],
    banks: liveBanks(g).map((b) => ({ id: b.id, house: houseWord(g, b), seat: b.seat, place: placeName(b.seat), fortune: Math.round(b.fortune), fortuneWord: fortuneWord(b.fortune), crown: b.crown > 0, ennobled: b.ennobled, years: Math.floor((now - b.since) / 12), mine: !!b.mine, deposit: Math.round(me.deposits.find((d) => d.bank === b.id)?.amt ?? 0) })),
    here: bankAt(g, g.life?.place ?? 'ern')?.house ?? null,
    crown: { owed: Math.round(S.crown.owed) * 10, repudiated: S.crown.repudiated, jubilees: S.crown.jubilees },
    past: S.past.slice(-6).reverse().map((x) => ({ house: x.house, place: placeName(x.seat), from: x.from, to: x.to, end: x.end, endWord: endWord(x.end), mine: !!x.mine })),
    me: {
      deposited: Math.round(deposited(g)),
      pawns: me.pawns.map((p) => ({ what: p.what, val: p.val, redeem: redeemPrice(g, p), monthsLeft: p.due - now, place: placeName(p.place) })),
      lent: lentOut(g), cap: lendCap(g), borrowers: bk.out.length, harsh: bk.harsh, earned: Math.round(bk.earned), lost: Math.round(bk.lost), forgiven: bk.forgiven, squeezed: bk.squeezed,
      bad: bk.bad.map((l) => ({ who: l.who, amt: l.amt })),
      bank: mb ? { house: houseWord(g, mb), place: placeName(mb.seat), fortune: Math.round(mb.fortune), fortuneWord: fortuneWord(mb.fortune) } : null,
      crownLent: me.crownLent,
    },
    log: S.log.slice(-10).reverse(),
  };
}

// 대륙 지도: 은행가 집안이 있는 고장
MAP_INFO.push((g, place) => {
  const b = place?.id ? bankAt(g, place.id) : null;
  if (!b) return '';
  return `<p class="note"><b>${b.mine ? '내 은행' : STAGE_WORD[stage(g)]}</b> · ${houseWord(g, b)} · ${fortuneWord(b.fortune)}</p>`;
});
export { bankById };
