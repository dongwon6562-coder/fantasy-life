// 빚 노예: 대금업자 빚을 갚을 길이 없을 때 몸으로 갚는다. 채석장이나 소금밭에서 노역하고, 달마다 빚이 준다.
// 자리를 뜨면 도망친 노예가 된다(사기 죄, 정직 흠). 다 갚으면 풀려난다. 대를 이으면 남은 빚은 다시 대금업자 빚이 된다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { PLACES, travelMonths } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { E } from '../estate/core.js';
import { assetsWorth } from '../estate/money.js';
import { P, mi, here, placeName, free, logPoor } from './core.js';

const SALT = ['saltmare', 'saltrock', 'portel', 'barka', 'harfen'];
export const BOND_KINDS = {
  salt: { name: '소금밭', master: '소금밭 감독관 오스릭', work: '바닷물을 길어 올리고 소금을 긁었다. 손바닥이 갈라져 피가 소금에 스몄다.' },
  quarry: { name: '채석장', master: '채석장 십장 그룬', work: '정으로 돌을 떼어 내고 날랐다. 돌가루가 목구멍에 쌓인다.' },
};
export const bondKindAt = (pl) => (SALT.includes(pl) ? 'salt' : 'quarry');
export const bondOf = (g) => P(g).bond;
const shark = (g, s) => E(g).loans.find((l) => l.id === s.loan && l.lender === 'shark') ?? null;

// 가장 가까운 다른 고장 (달아날 곳)
function nearest(g) {
  const pl = here(g);
  return Object.keys(PLACES).filter((id) => id !== pl && !PLACES[id].hidden && travelMonths(pl, id) < 99)
    .sort((a, b) => travelMonths(pl, a) - travelMonths(pl, b) || a.localeCompare(b))[0] ?? null;
}
function flee(g, why) {
  const p = P(g), to = nearest(g), life = L(g);
  p.fled += 1;
  reportCrime(g, 'fraud', here(g), { mult: 0.8 });
  deed(g, 'honest', -6, why);
  stress(g, 8);
  if (to) { life.travel = { to, left: travelMonths(here(g), to), from: here(g) }; if (life.home !== 'barracks') life.home = 'street'; }
  return to;
}

/* ---------- 빚 대신 몸으로: 대금업자가 내미는 마지막 길 ---------- */
defineScene('poor_bond', {
  need: (g, s) => free(g) && !!shark(g, s) && !P(g).bond,
  title: () => '몸으로 갚는 빚',
  text: (g, s) => {
    const l = shark(g, s), k = BOND_KINDS[bondKindAt(here(g))];
    return `대금업자가 직접 왔다. 장부를 덮고 내 손을 뒤집어 보았다. "팔 집도, 맡긴 돈도 없군. 은화 ${l.principal}닢. 이 손으로 갚으면 되겠어." ${k.name}에서 일하면 달마다 빚을 깎아 준다고 한다. 이자는 붙지 않지만, 다 갚기 전에는 그곳을 떠날 수 없다.`;
  },
  choices: (g, s) => {
    const k = BOND_KINDS[bondKindAt(here(g))];
    return [{ label: `${k.name}로 간다 (빚의 1.2배를 일로 갚는다)`, key: 'bond' }, { label: '거절하고 버틴다', key: 'refuse' }, { label: '그날 밤 고장을 뜬다', key: 'flee' }];
  },
  resolve(g, rng, s, key) {
    const l = shark(g, s), p = P(g), e = E(g);
    if (!l) return '대금업자는 장부를 다시 보더니 돌아갔다.';
    l.bondOffered = true;
    if (key === 'bond') {
      const kind = bondKindAt(here(g));
      e.loans.splice(e.loans.indexOf(l), 1);
      if (!e.loans.some((x) => x.missed)) e.hounded = 0;
      p.bond = { owed: Math.round(l.principal * 1.2), place: here(g), master: BOND_KINDS[kind].master, start: mi(g), kind };
      p.bonded += 1;
      if (L(g).home !== 'own' && L(g).home !== 'family' && L(g).home !== 'barracks') L(g).home = 'street';
      stress(g, 12);
      note(g, `빚 대신 ${BOND_KINDS[kind].name}에 묶였다.`);
      logPoor(g, `${placeName(here(g))}의 ${BOND_KINDS[kind].name}에 빚 노예로 묶였다. 은화 ${p.bond.owed}닢어치.`);
      chron(g, `${g.player.name}, 빚을 갚지 못해 ${placeName(here(g))}의 ${BOND_KINDS[kind].name}에 묶이다.`, 30);
      return `차용증 위에 손도장을 찍었다. ${J(BOND_KINDS[kind].master, '이/가')} 내 목에 나무패를 걸었다. 은화 ${p.bond.owed}닢. 그만큼 일하면 풀려난다.`;
    }
    if (key === 'flee') {
      const to = flee(g, '빚을 지고 야반도주했다.');
      return to ? `짐도 못 챙기고 밤길을 달렸다. ${J(placeName(to), '으로/로')} 가는 길이다. 빚은 장부에 그대로고, 이제 빚진 도망자다.` : '달아날 길이 없었다.';
    }
    stress(g, 6);
    return '"장부는 법관도 읽을 줄 알지." 대금업자는 웃으며 돌아갔다.';
  },
});

/* ---------- 노역하는 달 ---------- */
ACTIONS.push({
  id: 'poor_bond_work',
  name: '빚 노역을 한다',
  icon: 'coin',
  desc: '빚 노예로 묶인 일터에서 일을 더 하거나, 모은 돈으로 남은 빚을 갚거나, 달아날 궁리를 한다.',
  available: (g) => !!P(g).bond && free(g) && here(g) === P(g).bond.place,
  run(g) {
    if (!sceneQueued(g, 'poor_bond_work')) queueScene(g, 'poor_bond_work', {}, { first: true });
    return `${BOND_KINDS[P(g).bond.kind].name}의 하루가 또 시작되었다.`;
  },
});
defineScene('poor_bond_work', {
  need: (g) => free(g) && !!P(g).bond && here(g) === P(g).bond.place,
  title: (g) => BOND_KINDS[P(g).bond.kind]?.name ?? '노역장',
  text: (g) => {
    const b = P(g).bond, k = BOND_KINDS[b.kind];
    return `${k.work} 남은 빚은 은화 ${b.owed}닢. ${mi(g) - b.start}달째다. ${J(b.master, '이/가')} 장부를 들고 줄 사이를 걷는다.`;
  },
  choices: (g) => {
    const b = P(g).bond;
    return [
      { label: '밤까지 일을 더 한다', key: 'more' },
      ...(g.player.money >= b.owed ? [{ label: `남은 빚을 갚는다 (은화 ${b.owed}닢)`, key: 'pay' }] : g.player.money > 0 ? [{ label: `가진 돈을 다 갚는다 (은화 ${g.player.money}닢)`, key: 'part' }] : []),
      { label: '감시가 느슨한 밤에 달아난다', key: 'flee' },
    ];
  },
  resolve(g, rng, s, key) {
    const p = P(g), b = p.bond;
    if (!b) return '빚은 이미 없었다.';
    if (key === 'more') {
      b.owed = Math.max(0, b.owed - 4); tired(g, 14); stress(g, 3);
      if (b.owed <= 0) return release(g);
      return `해가 지고도 횃불 아래서 일했다. 십장이 장부에 줄 하나를 더 그었다. 남은 빚 은화 ${b.owed}닢.`;
    }
    if (key === 'pay') {
      if (g.player.money < b.owed) return '돈이 모자랐다.';
      g.player.money -= b.owed; b.owed = 0;
      return release(g, true);
    }
    if (key === 'part') {
      const n = g.player.money; g.player.money = 0; b.owed -= n;
      if (b.owed <= 0) return release(g, true);
      return `모은 은화 ${n}닢을 장부 위에 올렸다. 남은 빚 은화 ${b.owed}닢.`;
    }
    p.bond = null;
    const to = flee(g, '빚 노역장에서 달아났다.');
    logPoor(g, `${placeName(b.place)}의 ${BOND_KINDS[b.kind].name}에서 달아났다. 은화 ${b.owed}닢을 남기고.`);
    return to ? `나무패를 끊어 우물에 던지고 담을 넘었다. ${J(placeName(to), '으로/로')} 가는 길이다. 등 뒤에서 개 짖는 소리가 났다. 이제 도망친 빚 노예다.` : '달아날 길이 없었다.';
  },
});

function release(g, paid = false) {
  const p = P(g), b = p.bond;
  p.bond = null;
  note(g, '빚 노역에서 풀려났다.');
  logPoor(g, `${placeName(b.place)}의 ${BOND_KINDS[b.kind].name}에서 빚을 다 갚고 풀려났다.`);
  deed(g, 'honest', 3, '빚을 끝까지 몸으로 갚았다.');
  stress(g, -10);
  return `${paid ? '마지막 은화를 장부 위에 올렸다. ' : ''}${J(b.master, '이/가')} 내 목의 나무패를 끊었다. "가라." 문밖의 길이 낯설게 넓었다.`;
}

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const p = P(g), e = E(g);
  const b = p.bond;
  if (b) {
    if (L(g).travel) return;
    if (here(g) === b.place) {
      b.owed = Math.max(0, b.owed - 6); tired(g, 8); stress(g, 3);
      if (b.owed <= 0) note(g, release(g));
    } else {
      // 길이 엇갈려 자리를 비웠다: 도망친 것으로 친다
      p.bond = null; p.fled += 1;
      reportCrime(g, 'fraud', b.place, { mult: 0.6 });
      deed(g, 'honest', -6, '빚 노역을 버리고 떠났다.');
      logPoor(g, `${placeName(b.place)}의 ${BOND_KINDS[b.kind].name}을 버리고 떠났다.`);
      note(g, `${placeName(b.place)}의 ${BOND_KINDS[b.kind].name}에 돌아가지 않았다. 도망친 빚 노예로 수배가 붙었다.`);
    }
    return;
  }
  // 대금업자 빚을 석 달 넘게 못 갚고 넘길 재산도 없으면 몸으로 갚으라는 말이 나온다
  if (!free(g) || sceneQueued(g, 'poor_bond')) return;
  const l = e.loans.find((x) => x.lender === 'shark' && x.missed >= 3 && !x.bondOffered && g.player.money < x.principal);
  if (l && assetsWorth(g) <= 0) queueScene(g, 'poor_bond', { loan: l.id }, { first: true });
});

// 대를 이으면 몸으로 진 빚은 다시 장부의 빚이 된다
HOOKS.heir.push((g) => {
  const p = P(g), b = p.bond;
  if (!b) return;
  p.bond = null;
  const e = E(g);
  if (b.owed > 0) {
    e.loans.push({ id: e.seq++, lender: 'shark', principal: b.owed, due: mi(g) + 12, missed: 0, from: b.place, bondOffered: true });
    note(g, `앞 대가 남긴 노역 빚이 남았다. 대금업자 장부에 은화 ${b.owed}닢.`);
  }
});
