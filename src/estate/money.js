// 빚과 이자, 상단에 돈 맡기기, 빚쟁이와 파산.
// - 고리대금업자는 누구에게나 빌려주지만 이자가 무섭고 사람을 보낸다. 상단 금고는 담보(재산·영지·가게)가 있어야 한다.
//   신전 구휼 금고는 가난한 사람에게만 조금.
// - 갚을 날(12달)이 지나면 달마다 빚쟁이가 온다. 석 달을 넘기면 재산을 넘기고 파산한다.
// - 상단에 맡긴 돈은 상단 형편(history 상단의 fortune)에 따라 늘고 준다. 상단이 망하면 날아간다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, stress } from '../adventure/core.js';
import { runFight } from '../adventure/fight.js';
import { reportCrime } from '../crime.js';
import { E, LENDERS, LOAN_MONTHS, mi, debtTotal, netWorth, companies, companyOf, homeWorth, rentalWorth, placeName, payOut } from './core.js';
import { sellHome } from './manage.js';

const here = (g) => L(g).place;
const lendersHere = (g) => Object.entries(LENDERS).filter(([, d]) => !d.places || d.places.includes(here(g)));
export function collateral(g) {
  return Math.max(0, netWorth(g)) + (g.domain ? 1000 : 0) + (g.craft?.shop ? 200 : 0);
}
// 이 금고에서 더 빌릴 수 있는 돈
export function canBorrow(g, id) {
  const d = LENDERS[id];
  const owed = E(g).loans.filter((l) => l.lender === id).reduce((a, l) => a + l.principal, 0);
  let cap = d.max - owed;
  if (id === 'company') cap = Math.min(cap * (g.domain ? 2 : 1), Math.round(collateral(g) * 0.6) - owed);
  if (id === 'temple' && g.player.money > 40) cap = 0;
  if (id === 'shark' && E(g).bankrupt >= 2) cap = Math.min(cap, 50);
  return Math.max(0, Math.floor(cap));
}
const fortuneWord = (f) => (f >= 70 ? '돈이 넘친다' : f >= 50 ? '튼튼하다' : f >= 30 ? '그럭저럭' : f >= 18 ? '흔들린다' : '곧 무너질 것 같다');

/* ---------- 돈 빌리기·갚기 ---------- */
ACTIONS.push({
  id: 'estate_borrow',
  name: '돈 빌리기·갚기',
  icon: 'coin',
  desc: '급한 돈을 빌리거나 빚을 갚는다. 이자는 달마다 붙는다. 돈을 빌려주는 곳이 있는 도시에서, 주머니가 가볍거나 빚이 있을 때 찾아간다.',
  available: (g) => isAdult(g) && !traveling(g) && lendersHere(g).length > 0 && (g.player.money < 80 || E(g).loans.length > 0) && !sceneQueued(g, 'estate_borrow'),
  run(g) { queueScene(g, 'estate_borrow'); return '돈 이야기를 하러 나섰다.'; },
});
defineScene('estate_borrow', {
  title: () => '빚',
  text: (g) => {
    const e = E(g);
    const debts = e.loans.map((l) => `${LENDERS[l.lender].name}에 은화 ${l.principal}닢(${dueWord(g, l)})`).join(', ');
    const offers = lendersHere(g).map(([id, d]) => `${J(d.name, '은/는')} 달 이자 ${Math.round(d.rate * 1000) / 10}푼${canBorrow(g, id) ? `, 은화 ${canBorrow(g, id)}닢까지` : ', 지금은 빌려주지 않는다'}`).join('. ');
    return `${debts ? `지금 빚: ${debts}.` : '지금은 빚이 없다.'} ${offers}.${e.bankrupt ? ' 파산한 적이 있어 사람들이 돈 이야기를 꺼리면 얼굴을 굳힌다.' : ''}`;
  },
  choices: (g) => {
    const e = E(g);
    const out = [];
    for (const l of e.loans.slice(0, 3)) {
      if (g.player.money >= l.principal) out.push({ label: `${LENDERS[l.lender].name} 빚을 다 갚는다 (은화 ${l.principal}닢)`, key: `repay:${l.id}` });
      else if (g.player.money >= 10) out.push({ label: `${LENDERS[l.lender].name} 빚을 있는 만큼 갚는다 (은화 ${g.player.money}닢)`, key: `part:${l.id}` });
    }
    for (const [id, d] of lendersHere(g)) {
      const cap = canBorrow(g, id);
      for (const amt of [50, 150, 400, 1000]) if (amt <= cap && out.length < 7) out.push({ label: `${d.name}에서 은화 ${amt}닢을 빌린다`, key: `borrow:${id}:${amt}` });
    }
    out.push({ label: '그냥 돌아간다', key: 'none' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const e = E(g);
    if (key === 'none') return '돈 이야기는 다음으로 미뤘다.';
    const [how, a, b] = key.split(':');
    if (how === 'borrow') {
      const d = LENDERS[a];
      const amt = Number(b);
      if (!d || amt > canBorrow(g, a)) return '금고지기가 장부를 덮었다. 그만큼은 안 된다고 했다.';
      g.player.money += amt;
      e.loans.push({ id: e.seq++, lender: a, principal: amt, due: mi(g) + LOAN_MONTHS, missed: 0, from: here(g) });
      note(g, `${d.name}에서 은화 ${amt}닢을 빌렸다.`);
      return {
        shark: `뒷골목 이층 방. 손가락에 반지를 낀 사내가 은화를 세어 내밀었다. "열두 달. 이자는 달마다 다섯 푼. 늦으면 내 친구들이 찾아갈 거요. 친구들은 말이 없지." 은화 ${amt}닢을 받았다.`,
        company: `상단 금고의 서기가 내 재산 목록을 꼼꼼히 받아 적고 차용증에 도장을 찍었다. 은화 ${amt}닢. 열두 달 안에 갚기로 했다.`,
        temple: `사제가 나를 오래 바라보더니 구휼 금고를 열었다. "갚을 수 있을 때 갚으시오. 다만 거짓말은 마시오." 은화 ${amt}닢을 받았다.`,
      }[a];
    }
    const l = e.loans.find((x) => x.id === Number(a));
    if (!l) return '그 빚은 이미 없었다.';
    if (how === 'repay') {
      if (g.player.money < l.principal) return '돈이 모자랐다.';
      g.player.money -= l.principal;
      e.loans.splice(e.loans.indexOf(l), 1);
      if (!e.loans.some((x) => x.missed)) e.hounded = 0;
      stress(g, -6);
      return `${LENDERS[l.lender].name}에 빚 은화 ${l.principal}닢을 다 갚았다. 차용증을 돌려받아 그 자리에서 찢었다. 어깨가 가벼웠다.`;
    }
    const pay = Math.min(g.player.money, l.principal);
    g.player.money -= pay;
    l.principal -= pay;
    if (l.principal <= 0) e.loans.splice(e.loans.indexOf(l), 1);
    else if (l.missed) { l.due = Math.max(l.due, mi(g) + 3); l.missed = Math.max(0, l.missed - 1); }
    return `은화 ${pay}닢을 갚았다.${l.principal > 0 ? ` 아직 ${l.principal}닢이 남았다.` : ' 빚이 끝났다.'}`;
  },
});
const dueWord = (g, l) => { const left = l.due - mi(g); return left > 0 ? `${left}달 남음` : `${-left}달 밀림`; };

/* ---------- 상단에 돈 맡기기 ---------- */
const investHere = (g) => !!LENDERS.company.places.includes(here(g));
ACTIONS.push({
  id: 'estate_invest',
  name: '상단에 돈 맡기기',
  icon: 'coin',
  desc: '상단에 돈을 맡겨 굴린다. 상단이 잘되면 불어나고, 망하면 함께 사라진다.',
  available: (g) => isAdult(g) && !traveling(g) && investHere(g) && companies(g).length > 0 && (g.player.money >= 100 || E(g).deposits.length > 0) && !sceneQueued(g, 'estate_invest'),
  run(g) { queueScene(g, 'estate_invest'); return '상단 거리의 금고들을 돌았다.'; },
});
defineScene('estate_invest', {
  need: (g) => investHere(g) && !traveling(g),
  title: () => '상단 거리',
  text: (g) => {
    const e = E(g);
    const list = topCompanies(g).map((c) => `${c.name}(${fortuneWord(c.fortune)})`).join(', ');
    const mine = e.deposits.map((d) => `${d.name}에 은화 ${Math.round(d.amount)}닢`).join(', ');
    return `금고 앞마다 장부를 든 서기가 앉아 있다. 이름난 상단: ${list}. ${mine ? `맡겨 둔 돈: ${mine}.` : '아직 맡긴 돈은 없다.'} 지난달 맡긴 돈이 ${e.ledger.invest >= 0 ? `은화 ${e.ledger.invest}닢 불었다` : `은화 ${-e.ledger.invest}닢 줄었다`}.`;
  },
  choices: (g) => {
    const e = E(g);
    const out = [];
    for (const d of e.deposits.slice(0, 3)) out.push({ label: `${d.name}에서 돈을 찾는다 (은화 ${Math.floor(d.amount * 0.98)}닢)`, key: `take:${d.company}` });
    const amts = [50, 200, Math.floor(g.player.money / 2)].filter((v, i, arr) => v >= 50 && v <= g.player.money && arr.indexOf(v) === i);
    for (const c of topCompanies(g)) for (const amt of amts) if (out.length < 7) out.push({ label: `${c.name}에 은화 ${amt}닢을 맡긴다`, key: `put:${c.id}:${amt}` });
    out.push({ label: '그냥 돌아간다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const e = E(g);
    if (key === 'none') return '돈은 내 주머니에 두기로 했다.';
    const [how, id, n] = key.split(':');
    if (how === 'take') {
      const d = e.deposits.find((x) => x.company === id);
      if (!d) return '그 돈은 이미 없었다.';
      const got = Math.floor(d.amount * 0.98);
      g.player.money += got;
      e.deposits.splice(e.deposits.indexOf(d), 1);
      return `${d.name}에서 은화 ${got}닢을 찾았다. 서기가 수수료를 떼며 아쉬운 얼굴을 했다.`;
    }
    const c = companyOf(g, id);
    const amt = Number(n);
    if (!c || g.player.money < amt) return '서기가 고개를 저었다. 거래는 없었다.';
    g.player.money -= amt;
    const d = e.deposits.find((x) => x.company === id);
    if (d) d.amount += amt; else e.deposits.push({ company: id, name: c.name, amount: amt, last: c.fortune });
    return `${c.name}에 은화 ${amt}닢을 맡겼다. ${c.fortune >= 50 ? '서기가 상단의 배와 창고 이야기를 늘어놓았다.' : '서기의 웃음이 어딘지 조급했다.'} 맡긴 돈은 상단의 형편을 따라 오르내린다.`;
  },
});
const topCompanies = (g) => [...companies(g)].sort((a, b) => b.fortune - a.fortune).slice(0, 3);

/* ---------- 빚쟁이 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const e = E(g);
  const late = e.loans.filter((l) => mi(g) > l.due);
  for (const l of late) { l.missed += 1; l.due = mi(g); }
  if (!late.length) return;
  e.hounded = Math.min(10, e.hounded + 1);
  // 다섯 달을 넘기면 묻지 않고 재산을 넘긴다 (빚이 평생 끝나지 않게 두지 않는다)
  if (late.some((l) => l.missed >= 5)) { const t = bankruptcy(g, rng, null); note(g, `빚쟁이들이 법관을 데려왔다. ${t}`); return; }
  if (L(g).travel || g.crime?.jailed || sceneQueued(g, 'debt_collector')) return;
  const worst = late.sort((a, b) => b.missed - a.missed)[0];
  queueScene(g, 'debt_collector', { loan: worst.id });
});
defineScene('debt_collector', {
  need: (g, s) => E(g).loans.some((l) => l.id === s.loan) && !traveling(g),
  title: (g, s) => (loanOf(g, s)?.lender === 'shark' ? '문을 두드리는 사내들' : '빚 독촉'),
  text: (g, s) => {
    const l = loanOf(g, s);
    const owe = `빚은 이자가 붙어 은화 ${l.principal}닢. 갚을 날이 ${l.missed}달 지났다.`;
    const n = g.date.year * 12 + g.date.month; // 같은 글이 거듭 뜨지 않게 첫머리를 돌린다 (18단계 헤드)
    if (l.lender === 'shark') return `${['덩치 큰 사내 둘이 문을 막아섰다. 하나가 손마디를 꺾었다. "대금업자 나리께서 안부를 물으시오."', '아침에 문을 여니 문턱에 죽은 쥐가 놓여 있었다. 길 건너에서 대금업자의 사내가 손을 흔들었다.', '장터에서 누가 소매를 잡아당겼다. 대금업자의 사내였다. "나리께서 기다리다 지치셨소."', '밤중에 창문이 깨졌다. 돌에 쪽지가 감겨 있었다. 숫자 하나만 적혀 있었다.'][n % 4]} ${owe}${l.missed >= 3 ? ' 오늘은 빈손으로 돌아가지 않겠다는 얼굴이다.' : ''}`;
    if (l.lender === 'bank') return `은행가 집안의 서기가 검은 옷을 입고 찾아와 차용증 사본을 펼쳤다. "기한이 지났습니다. 집안 어른들께서 걱정하십니다." ${owe}${l.missed >= 3 ? ' 서기 뒤에 법관의 하급 관리가 서 있다. 압류 이야기다.' : ''}`; // 39단계 은행가 금고 (src/credit/)
    if (l.lender === 'company') return `상단 금고의 서기가 법관의 하급 관리를 데리고 왔다. "차용증 기한이 지났습니다." ${owe}${l.missed >= 3 ? ' 관리가 재산 목록을 펼쳤다. 압류 이야기다.' : ''}`;
    return `신전의 젊은 사제가 찾아왔다. 꾸짖는 얼굴이 아니라 걱정하는 얼굴이었다. ${owe}`;
  },
  choices: (g, s) => {
    const l = loanOf(g, s);
    const out = [];
    if (g.player.money >= l.principal) out.push({ label: `다 갚는다 (은화 ${l.principal}닢)`, key: 'pay' });
    else if (g.player.money > 0) out.push({ label: `있는 돈을 다 준다 (은화 ${g.player.money}닢)`, key: 'part' });
    if (!l.extended) out.push({ label: '여섯 달만 더 달라고 빈다 (빚이 한 할 는다)', key: 'plead' });
    if (assetsWorth(g) > 0) out.push({ label: '재산을 넘겨 빚을 정리한다 (파산)', key: 'bankrupt' });
    if (l.lender === 'shark') out.push({ label: '주먹으로 돌려보낸다', key: 'fight' });
    out.push({ label: '뒷문으로 달아난다', key: 'flee' });
    return out;
  },
  resolve(g, rng, s, key) {
    const e = E(g);
    const l = loanOf(g, s);
    if (!l) return '빚쟁이들은 장부를 다시 보더니 돌아갔다.';
    if (key === 'pay') {
      if (g.player.money < l.principal) return '돈이 모자랐다.';
      g.player.money -= l.principal;
      e.loans.splice(e.loans.indexOf(l), 1);
      if (!e.loans.some((x) => x.missed)) e.hounded = 0;
      return '돈주머니를 던져 주었다. 사내가 하나하나 세어 보고는 모자를 들어 보였다. 빚은 끝났다.';
    }
    if (key === 'part') {
      const pay = g.player.money;
      g.player.money = 0;
      l.principal -= pay;
      l.due = mi(g) + 2;
      l.missed = Math.max(0, l.missed - 1);
      return `가진 은화 ${pay}닢을 다 내주었다. 두 달 말미를 얻었다. 아직 ${l.principal}닢이 남았다.`;
    }
    if (key === 'plead') {
      l.extended = true;
      l.principal = Math.round(l.principal * 1.1);
      l.due = mi(g) + 6;
      l.missed = 0;
      stress(g, 6);
      return l.lender === 'shark' ? '무릎을 꿇었다. 사내가 내 뺨을 두어 번 두드렸다. "여섯 달. 그다음엔 손가락이오." 빚이 한 할 늘었다.' : '사정을 털어놓았다. 기한이 여섯 달 늘었다. 대신 빚이 한 할 붙었다.';
    }
    if (key === 'bankrupt') return bankruptcy(g, rng, l);
    if (key === 'fight') {
      const r = runFight(g, rng, { enc: { unit: 'thug', count: rng.int(2, 3) + Math.min(2, l.missed), leader: l.missed >= 3 ? 'bandit_chief' : null }, reward: {} }, 'charge', { short: true });
      if (r.outcome === 'win' || r.outcome === 'overwhelm') {
        reportCrime(g, 'assault', here(g), { mult: 0.6 });
        l.due = mi(g) + 3;
        return `${r.text} 사내들이 피를 닦으며 물러갔다. 석 달은 조용하겠지만, 대금업자는 잊지 않는다. 빚도 그대로다.`;
      }
      l.principal += 10;
      g.player.injuries.push({ name: '빚쟁이에게 맞아 부은 손', months: 2 });
      return `${r.text} 사내들이 내 손가락을 하나씩 꺾으며 말했다. "다음 달에 다시 오지." 수고비라며 빚에 은화 10닢이 붙었다.`;
    }
    // 달아난다
    e.hounded = Math.min(10, e.hounded + 2);
    stress(g, 8);
    if (rng.chance(0.4)) g.player.money = Math.max(0, g.player.money - Math.round(g.player.money * 0.3));
    return '뒷문으로 빠져나가 골목을 달렸다. 등 뒤에서 욕설이 쫓아왔다. 빚은 그대로고, 그들은 다시 올 것이다.';
  },
});
const loanOf = (g, s) => E(g).loans.find((l) => l.id === s.loan) ?? null;
export function assetsWorth(g) {
  const e = E(g);
  return L(g).houses.reduce((a, p) => a + homeWorth(g, p), 0) + e.rentals.reduce((a, r) => a + rentalWorth(r), 0) + e.deposits.reduce((a, d) => a + d.amount, 0);
}

// 파산: 맡긴 돈 → 세놓은 것 → 집 순서로 넘겨 빚을 갚는다. 그래도 모자라면 남은 빚은 사라지지만 이름에 흠이 남는다.
export function bankruptcy(g, rng, first) {
  const e = E(g);
  const life = L(g);
  let need = debtTotal(g) - g.player.money;
  const lost = [];
  g.player.money = Math.max(0, g.player.money - debtTotal(g));
  for (const d of e.deposits.splice(0)) { need -= d.amount; lost.push(`${d.name}에 맡긴 돈`); }
  for (const r of e.rentals.filter((x) => x.kind !== 'house')) {
    if (need <= 0) break;
    need -= rentalWorth(r);
    e.rentals.splice(e.rentals.indexOf(r), 1);
    lost.push(`${placeName(r.place)}의 ${r.kind === 'land' ? '밭' : '가게 자리'}`);
  }
  // 집: 지금 사는 집은 맨 나중에
  const homes = [...life.houses].sort((a, b) => (a === life.place ? 1 : 0) - (b === life.place ? 1 : 0));
  for (const p of homes) {
    if (need <= 0) break;
    need -= homeWorth(g, p);
    sellHome(g, p);
    lost.push(`${placeName(p)}의 집`);
  }
  if (need < 0) g.player.money += Math.floor(-need * 0.8); // 남은 값은 경매 수수료를 떼고 돌려받는다
  const cruel = e.loans.some((l) => l.lender === 'shark');
  e.loans = [];
  e.hounded = 0;
  e.bankrupt += 1;
  life.renown = Math.max(0, life.renown - 5);
  stress(g, 25);
  if (cruel && need > 0) g.player.injuries.push({ name: '대금업자의 사내들에게 맞은 갈비뼈', months: 3 });
  note(g, '파산했다.');
  chron(g, `${g.player.name}, 빚을 이기지 못하고 파산하다.`, 35);
  return `법관의 하급 관리가 재산 목록에 붉은 줄을 그어 나갔다. ${lost.length ? `${lost.join(', ')}. 모두 넘어갔다.` : '넘길 것도 별로 없었다.'} 빚은 정리되었다. 장부 위의 숫자는 사라졌지만, 사람들의 눈에 남은 것은 사라지지 않는다.${cruel && need > 0 ? ' 모자란 몫은 대금업자의 사내들이 주먹으로 받아 갔다.' : ''}`;
}

// 대를 이으면 빚도 물려받는다
HOOKS.heir.push((g) => {
  const e = E(g);
  if (e.loans.length) note(g, `빚도 물려받았다. 은화 ${debtTotal(g)}닢.`);
  for (const l of e.loans) { l.due = Math.max(l.due, mi(g) + 6); l.missed = 0; l.extended = false; }
  e.hounded = 0;
});

export { payOut };
