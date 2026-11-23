// 39단계 빚과 돈놀이 (도우미스레드3). 상태는 g.credit 하나.
//   빌리기·갚기·빚쟁이·파산·빚 대물림은 estate(src/estate/money.js)에 이미 있다. 여기는 그 위에 얹는다:
//   환전상과 은행가 집안(시대 따라 커짐), 왕의 빚과 은행가의 몰락, 탕감령, 전당포, 은행에 맡긴 돈, 빚 문서가 넘어가는 일, 내가 돈놀이하는 길.
//   banks: [{ id, house(집안 이름), seat(고장), fortune(0~100), crown(왕실이 진 빚), since, from('changer'|'company'|'me'), founder, mine, ennobled, gone }]
//   past: [{ house, seat, from, to, end }]
//   crown: { owed(왕실 빚 합), lastAsk, repudiated, jubilees }  ruler: 마지막으로 본 임금
//   me: { deposits[{bank, amt}], pawns[{id, what, kind, val, due}], book{ out[{id, who, why, amt, at, due, late}], bad[{who, amt}], lent, earned, lost, forgiven, squeezed, harsh }, bank(id|null), crownLent, founded }
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { LENDERS } from '../estate/core.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mi = (g) => g.date.year * 12 + g.date.month;
export const placeName = (pl) => PLACES[pl]?.name ?? '먼 고장';
export const crRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 433) ^ Math.imul(mi(g) * 197 + salt + 61, 2654435761)) | 0 });

// 은행가 집안이 설 수 있는 큰 도시
export const SEATS = ['harfen', 'leocast', 'verden', 'portel', 'barka', 'eisen', 'serenia', 'saltmare'].filter((p) => PLACES[p]);
// 전당포가 있는 고장 (마을 말고 장이 서는 곳)
export const PAWN_TOWNS = [...new Set([...SEATS, 'graubel', 'gorge', 'klein', 'solaris', 'fur'])].filter((p) => PLACES[p]);
export const HOUSES = ['로슈발트', '아이헨', '그라프만', '슈토르크', '벨링', '오르사', '카펠', '테르넨', '발도', '미르케', '하젤로트', '진더'];
export const FIRST = ['요나스', '아말리에', '크리스토프', '레기네', '발타자르', '우르줄라', '에버하르트', '도로테아'];

// 왕국 기술이 오를수록 돈 다루는 집이 커진다: 0 환전상, 1 은행가 집안(금속 활자 뒤 어음), 2 지점(마도 전신탑), 3 마석 은행
const done = (g, id) => (g.history?.inventions ?? []).includes(id);
export function stage(g) {
  if (done(g, 'stonebank')) return 3;
  if (done(g, 'signal')) return 2;
  if (done(g, 'type') || done(g, 'press')) return 1;
  return 0;
}
export const STAGE_WORD = ['환전상', '은행가', '은행가', '마석 은행'];
export const MAX_BANKS = [2, 3, 4, 4];
export const houseWord = (g, b) => (b.from === 'changer' && stage(g) === 0 ? `환전상 ${b.house} 가` : `${b.house} 가`);
export const fortuneWord = (f) => (f >= 75 ? '금고가 넘친다' : f >= 50 ? '튼튼하다' : f >= 30 ? '그럭저럭 버틴다' : f >= 15 ? '흔들린다는 말이 돈다' : '곧 문을 닫는다는 말이 돈다');
export const endWord = (e) => ({ failed: '무너졌다', crown: '왕실이 빚을 떼먹어 무너졌다', run: '예금자들이 몰려와 문을 닫았다', merged: '다른 집안에 넘어갔다', faded: '대가 끊겨 문을 닫았다' }[e] ?? '사라졌다');

// estate 빚 장부에 '은행가 금고'를 더한다. places가 비어 있어 estate의 빌리기 화면엔 나오지 않고, 은행가 집안 장면에서만 빌린다.
LENDERS.bank ??= { name: '은행가 금고', rate: 0.012, max: 1500, places: [] };

const freshBook = () => ({ out: [], bad: [], lent: 0, earned: 0, lost: 0, forgiven: 0, squeezed: 0, harsh: false, seq: 1 });
const freshMe = () => ({ deposits: [], pawns: [], book: freshBook(), bank: null, crownLent: 0, founded: 0, pawnSeq: 1 });
export const fresh = () => ({ seq: 1, banks: [], past: [], crown: { owed: 0, lastAsk: -99, repudiated: 0, jubilees: 0, lastJubilee: -99 }, ruler: null, me: freshMe(), log: [] });
export const CS = (g) => (g.credit ??= fresh());
export const liveBanks = (g) => (g?.credit?.banks ?? []).filter((b) => !b.gone);
export const bankAt = (g, pl) => liveBanks(g).find((b) => b.seat === pl) ?? null;
export const bankById = (g, id) => liveBanks(g).find((b) => b.id === id) ?? null;
export const myBank = (g) => (g?.credit?.me?.bank != null ? bankById(g, g.credit.me.bank) : null);
export const biggest = (g) => [...liveBanks(g)].sort((a, b) => b.fortune - a.fortune)[0] ?? null;
export function clog(g, text) {
  const S = CS(g);
  S.log.push({ y: g.date.year, m: g.date.month, text });
  if (S.log.length > 30) S.log.splice(0, S.log.length - 30);
}
export function newBank(g, seat, rng, { from = 'changer', fortune, founder, mine = false, house } = {}) {
  const S = CS(g);
  const used = new Set(liveBanks(g).map((b) => b.house));
  const pool = HOUSES.filter((h) => !used.has(h));
  const b = { id: S.seq++, house: house ?? rng.pick(pool.length ? pool : HOUSES), seat, fortune: fortune ?? rng.int(30, 45), crown: 0, since: mi(g), from, founder: founder ?? rng.pick(FIRST), mine, ennobled: false, gone: false };
  S.banks.push(b);
  return b;
}
export function endBank(g, b, end) {
  const S = CS(g);
  b.gone = true;
  S.crown.owed = Math.max(0, S.crown.owed - (b.crown ?? 0));
  S.past.push({ house: b.house, seat: b.seat, from: Math.floor(b.since / 12), to: g.date.year, end, mine: !!b.mine });
  if (S.past.length > 12) S.past.shift();
  S.banks = S.banks.filter((x) => !x.gone);
  if (S.me.bank === b.id) S.me.bank = null;
}
export const deposited = (g) => (g?.credit?.me?.deposits ?? []).reduce((a, d) => a + d.amt, 0);
export const lentOut = (g) => (g?.credit?.me?.book?.out ?? []).reduce((a, l) => a + l.amt, 0);

function fill(g) {
  const S = CS(g), f = fresh();
  for (const k of Object.keys(f)) S[k] ??= f[k];
  S.crown = Object.assign(fresh().crown, S.crown ?? {});
  S.me = Object.assign(freshMe(), S.me ?? {});
  S.me.book = Object.assign(freshBook(), S.me.book ?? {});
}
HOOKS.newGame.push((g) => { g.credit = fresh(); });
HOOKS.migrate.push((g) => { fill(g); });
