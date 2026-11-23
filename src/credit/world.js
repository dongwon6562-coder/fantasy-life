// 은행가 집안의 한 달: 환전상이 은행가가 되고, 왕실에 돈을 빌려주고, 떼이고, 예금자들이 몰려오고, 무너진다. 플레이어 없이도 굴러간다.
// 새 임금이 서면 옛 임금의 빚을 모른 체하기도 하고(은행가의 몰락), 작은 빚을 탕감하라는 영을 내리기도 한다.
import { WORLD_TICKS, atWar } from '../world.js';
import { J } from '../narrative/text.js';
import { E } from '../estate/core.js';
import { CS, SEATS, MAX_BANKS, liveBanks, bankAt, biggest, newBank, endBank, clog, crRng, clamp, mi, placeName, stage, houseWord, STAGE_WORD } from './state.js';

const rulerKey = (g) => g.realm?.ruler ?? null;

// 은행이 무너질 때: 맡긴 돈은 날아가고, 그 집안에서 빌린 내 빚 문서는 고리대금업자에게 넘어간다
export function failBank(g, b, end, say) {
  const S = CS(g), me = S.me;
  const lostDep = me.deposits.filter((d) => d.bank === b.id).reduce((a, d) => a + d.amt, 0);
  me.deposits = me.deposits.filter((d) => d.bank !== b.id);
  let sold = 0;
  for (const l of E(g).loans) if (l.lender === 'bank' && l.bank === b.id) { l.lender = 'shark'; l.due = Math.max(l.due, mi(g) + 3); l.sold = b.house; sold += l.principal; }
  const name = houseWord(g, b);
  say(end === 'crown'
    ? `${placeName(b.seat)}의 ${J(name, '이/가')} 문을 닫았다. 왕실이 갚지 않은 빚 문서가 금고 가득 쌓여 있었다고 한다. 예금자들이 닫힌 문을 두드리며 울었다.`
    : end === 'run'
      ? `${placeName(b.seat)}의 ${name} 금고 앞에 새벽부터 사람들이 줄을 섰다. 해가 지기 전에 금고가 비었고, 저녁에 문에 판자가 박혔다.`
      : `${placeName(b.seat)}의 ${J(name, '이/가')} 무너졌다. 장부를 들고 달아난 서기가 있었다는 말도 있다.`, true);
  clog(g, `${J(name, '이/가')} ${end === 'crown' ? '왕실 빚을 떼여 무너졌다' : end === 'run' ? '예금자들에게 금고를 털리고 문을 닫았다' : '무너졌다'}.`);
  if (lostDep > 0) { g.player.stress = Math.min(100, (g.player.stress ?? 0) + 15); clog(g, `${name}에 맡긴 내 돈 은화 ${Math.round(lostDep)}닢이 사라졌다.`); }
  if (sold > 0) clog(g, `${name}에 진 내 빚 문서(은화 ${sold}닢)가 고리대금업자 손에 넘어갔다.`);
  endBank(g, b, end);
  return { lostDep, sold };
}

export function creditMonth(g, say) {
  if (!g.credit || !g.realm) return;
  const S = CS(g), rng = crRng(g, 5), st = stage(g), r = g.realm, war = atWar(g);
  // 새 임금: 옛 빚을 모른 체하거나, 작은 빚을 탕감한다
  const rk = rulerKey(g);
  if (S.ruler == null) S.ruler = rk;
  else if (rk !== S.ruler) {
    S.ruler = rk;
    if (S.crown.owed > 0 && rng.chance(rk === 'rudolf' ? 0.6 : rk === 'regency' ? 0.4 : 0.3)) {
      S.crown.repudiated += 1;
      say(`새 왕실이 지난 임금의 빚은 지난 임금의 것이라고 선언했다. 왕실에 돈을 댄 은행가들이 하얗게 질렸다.`, true);
      clog(g, '새 왕실이 지난 임금의 빚을 모른 체했다.');
      for (const b of liveBanks(g)) if (b.crown > 0) { b.fortune -= Math.min(70, 15 + b.crown / 6); b.crown = 0; if (b.mine && S.me.crownLent) { clog(g, `왕실에 빌려준 내 돈 은화 ${S.me.crownLent}닢이 휴지가 되었다.`); S.me.book.lost += S.me.crownLent; S.me.crownLent = 0; } }
      S.crown.owed = 0;
    }
    if (mi(g) - S.crown.lastJubilee > 120 && rng.chance(0.3)) jubilee(g, say);
  }
  // 전쟁: 왕실이 가장 큰 집안에서 빌린다. 평화가 오면 조금씩 갚는다
  if (war && mi(g) - S.crown.lastAsk >= 10 && rng.chance(0.08)) {
    const b = biggest(g);
    if (b && b.fortune >= 30 && !b.mine) {
      const amt = rng.int(100, 300) * (1 + st * 0.5);
      b.crown += amt; S.crown.owed += amt; S.crown.lastAsk = mi(g);
      b.fortune = clamp(b.fortune + 1, 0, 100);
      if (rng.chance(0.5)) say(`왕실 재무관이 ${placeName(b.seat)}의 ${houseWord(g, b)}에서 은화 ${Math.round(amt) * 10}닢을 빌렸다고 한다. 전쟁은 돈을 먹는다.`);
      clog(g, `왕실이 ${houseWord(g, b)}에서 전쟁 돈을 빌렸다.`);
    }
  }
  if (!war && S.crown.owed > 0 && rng.chance(0.05)) {
    for (const b of liveBanks(g)) if (b.crown > 0) { const pay = Math.min(b.crown, 40); b.crown -= pay; S.crown.owed = Math.max(0, S.crown.owed - pay); b.fortune = clamp(b.fortune + pay / 25, 0, 100); if (b.mine && S.me.crownLent > 0) { const silver = Math.min(S.me.crownLent, pay * 10); S.me.crownLent -= silver; g.player.money += Math.round(silver * 1.2); S.me.book.earned += Math.round(silver * 0.2); clog(g, `왕실이 빌려 간 은화 ${silver}닢을 이자를 얹어 갚았다.`); } }
  }
  // 새 집안: 환전상이 서고, 시대가 오르면 부자 상단이 금고를 따로 차린다
  if (liveBanks(g).length < MAX_BANKS[st] && rng.chance(0.004 + st * 0.003)) {
    const free = SEATS.filter((pl) => !bankAt(g, pl) && !S.past.some((p) => p.seat === pl && g.date.year - p.to < 6));
    if (free.length) {
      const seat = rng.pick(free);
      const rich = (g.history?.companies ?? []).filter((c) => c && !c.gone && (c.fortune ?? 0) >= 70);
      const fromCo = st >= 1 && rich.length && rng.chance(0.5) ? rng.pick(rich) : null;
      const b = newBank(g, seat, rng, { from: fromCo ? 'company' : 'changer' });
      say(fromCo
        ? `${J(fromCo.name, '이/가')} 장사에서 번 돈으로 ${placeName(seat)}에 금고를 따로 차렸다. 이름은 ${J(houseWord(g, b), '으로/로')} 내걸었다.`
        : st === 0
          ? `${placeName(seat)} 장터 다리 위에 ${b.house} 집안이 환전 탁자를 폈다. 먼 나라 은화와 금화를 저울에 달아 바꿔 준다.`
          : `${placeName(seat)}에 ${b.house} 집안이 ${STAGE_WORD[st]} 간판을 걸었다. 돈을 맡기면 어음을 써 준다고 한다.`);
      clog(g, `${placeName(seat)}에 ${J(houseWord(g, b), '이/가')} 섰다.`);
    }
  }
  // 집안마다
  for (const b of liveBanks(g)) {
    const pr = crRng(g, 31 + b.id * 7);
    b.fortune = clamp(b.fortune + (55 + st * 4 - b.fortune) * 0.008 - (g.world?.famine ? 0.15 : 0) - (b.crown > 300 ? 0.12 : 0) + pr.normal(0, 0.8), 0, 100);
    // 큰일: 돈을 댄 배가 가라앉거나 큰 상단이 빚을 떼먹는다 (해 4% 남짓)
    if (!b.mine && pr.chance(0.0035)) {
      const hit = pr.int(15, 32);
      b.fortune = clamp(b.fortune - hit, 0, 100);
      if (hit >= 22) say(`${placeName(b.seat)}의 ${J(houseWord(g, b), '이/가')} ${pr.pick(['돈을 댄 상선단이 폭풍에 가라앉아', '크게 빌려준 상단이 빚을 떼먹고 달아나', '금고지기가 장부를 고쳐 쓴 것이 드러나', '먼 나라 왕실에 빌려준 돈을 떼여'])} 크게 휘청였다고 한다.`);
    }
    // 환전상에서 은행가로 (시대가 오르면)
    if (b.from === 'changer' && st >= 1 && !b.grown && pr.chance(0.03)) { b.grown = true; clog(g, `환전상이던 ${b.house} 집안이 어음을 써 주는 은행가가 되었다.`); }
    // 크게 일어나면 작위를 산다
    if (!b.ennobled && b.fortune >= 85 && pr.chance(0.02)) { b.ennobled = true; say(`은행가 ${b.house} 집안이 왕실에서 작위를 샀다. 옛 가문들은 '돈으로 산 피'라며 혀를 찬다.`); clog(g, `${b.house} 집안이 작위를 샀다.`); }
    if (b.mine) continue;
    // 예금자들이 몰려온다
    if (b.fortune < 22 && pr.chance(0.04)) {
      b.fortune -= pr.int(6, 14);
      if (b.fortune > 6) say(`${placeName(b.seat)}의 ${J(houseWord(g, b), '이/가')} 흔들린다는 말에 예금자들이 몰려갔다. 금고는 겨우 버텼다.`);
    }
    if (b.fortune <= 6) { failBank(g, b, b.crown > 0 && S.crown.repudiated ? 'crown' : pr.chance(0.5) ? 'run' : 'failed', say); continue; }
    // 오래된 집안은 대가 끊기거나 다른 집안에 넘어간다
    if (mi(g) - b.since > 12 * 90 && pr.chance(0.004)) {
      const other = liveBanks(g).find((x) => x !== b && x.fortune > b.fortune + 20);
      say(other ? `${houseWord(g, b)}의 금고와 장부가 ${houseWord(g, other)} 쪽으로 넘어갔다.` : `${houseWord(g, b)}의 마지막 주인이 대를 잇지 못하고 죽었다. 금고 문이 닫혔다.`);
      clog(g, `${J(houseWord(g, b), '이/가')} ${other ? '다른 집안에 넘어갔다' : '대가 끊겨 문을 닫았다'}.`);
      for (const d of S.me.deposits) if (d.bank === b.id && other) d.bank = other.id;
      if (other) for (const l of E(g).loans) if (l.lender === 'bank' && l.bank === b.id) l.bank = other.id;
      endBank(g, b, other ? 'merged' : 'faded');
    }
  }
}

// 탕감령: 새 임금이 작은 빚을 없애 준다. 내 고리대금·구휼 빚 가운데 작은 것과, 내가 돈놀이로 빌려준 작은 돈도 함께
export function jubilee(g, say) {
  const S = CS(g), e = E(g);
  S.crown.jubilees += 1; S.crown.lastJubilee = mi(g);
  say('새 임금의 첫 영이 장터마다 붙었다. 은화 백오십 닢이 안 되는 빚은 모두 없던 일로 한다는 탕감령이다. 술집마다 잔이 부딪쳤고, 대금업자들 집은 문을 걸어 잠갔다.', true);
  clog(g, '탕감령이 내렸다.');
  const gone = e.loans.filter((l) => (l.lender === 'shark' || l.lender === 'temple') && l.principal < 150);
  if (gone.length) { e.loans = e.loans.filter((l) => !gone.includes(l)); if (!e.loans.some((l) => l.missed)) e.hounded = 0; clog(g, `내 빚 은화 ${gone.reduce((a, l) => a + l.principal, 0)}닢이 탕감되었다.`); }
  const bk = S.me.book, small = bk.out.filter((l) => l.amt < 150);
  if (small.length) { bk.out = bk.out.filter((l) => !small.includes(l)); const lost = small.reduce((a, l) => a + l.amt, 0); bk.lost += lost; clog(g, `내가 빌려준 은화 ${lost}닢도 탕감령에 날아갔다.`); }
  bk.bad = bk.bad.filter((l) => l.amt >= 150);
}

WORLD_TICKS.push((g, worldRng, say) => creditMonth(g, say));
