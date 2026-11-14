// 가게 내기와 제자 두기. 장인이 되면 남의 밑에서 벗어나 내 가게를 낸다.
// 가게는 매달 손님을 받고(이름값·수요·장소), 집세를 낸다. 제자는 가게 일을 거들며 자라고, 언젠가 독립한다.
// 가게는 대를 이어 물려줄 수 있다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { JOBS } from '../data.js';
import { me, playerAge } from '../game.js';
import { makePerson, byId, fullName, ageYears } from '../npc.js';
import { WORK } from '../jobs.js';
import { PLACES, leaveJob } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, isAdult, traveling, spend, canSpend } from '../adventure/core.js';
import { Q, TRADES, C, myTrade, tradeOfJob, skillOf, gradeOf, demand, fameOf, addFame } from './core.js';

// 장소마다 가게 값과 집세 (은화). 시골일수록 싸고, 손님도 적다.
export const SHOP_COST = { ern: 120, gruental: 150, harfen: 260, verden: 230, leocast: 520 };
export const SHOP_RENT = { ern: 2, gruental: 2, harfen: 5, verden: 4, leocast: 10 };
const KIND = { farming: '농장', cooking: '식당', smithing: '대장간', herbs: '약방', trade: '상점' };
const NPC_JOB = { farming: 'farmer', cooking: 'cook', smithing: 'smith', herbs: 'herbalist', trade: 'shopkeeper' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const shop = (g) => C(g).shop ?? null;
export const atShop = (g) => !!shop(g) && L(g).place === shop(g).place && !traveling(g);

// 가게를 낼 수 있나: 생산직으로 일하고 있고 장인(장사는 숙련) 이상, 가게를 낼 수 있는 고장
export function canOpen(g) {
  const t = tradeOfJob(L(g).job?.id);
  if (!t || shop(g) || !isAdult(g) || traveling(g)) return null;
  if (gradeOf(skillOf(g, t)) < (t === 'trade' ? 1 : 2)) return null;
  if (SHOP_COST[L(g).place] == null) return null;
  if (t === 'farming' && !['ern', 'gruental'].includes(L(g).place)) return null;
  return t;
}

ACTIONS.push({
  id: 'open_shop',
  name: '내 가게 내기',
  icon: 'home',
  desc: '남의 밑에서 일하던 솜씨로 내 가게를 낸다. 손님도 집세도 이제 내 몫이다.',
  available: (g) => !!canOpen(g) && !sceneQueued(g, 'open_shop'),
  run(g) { queueScene(g, 'open_shop'); return '빈 가게 자리를 알아보러 다녔다.'; },
});

function shopNames(g, t) {
  const ln = me(g).lastName;
  const P = PLACES[L(g).place].name;
  const base = {
    farming: [`${ln}네 농장`, '개울가 밀밭', `${P} 언덕 농장`],
    cooking: [`${ln}네 식당`, '구리 솥', '모닥불과 빵'],
    smithing: [`${ln} 대장간`, '모루와 망치', '붉은 풀무'],
    herbs: [`${ln}네 약방`, '쑥국화 약방', '은방울 약재상'],
    trade: [`${ln} 상점`, '은빛 저울', `${P} 잡화점`],
  }[t];
  return base;
}

defineScene('open_shop', {
  title: () => '내 가게',
  text: (g) => {
    const t = canOpen(g);
    const place = L(g).place;
    // 장면이 뜨기 전에 사정이 바뀌었으면(일을 그만둠, 길을 떠남 등) 가게를 낼 수 없다고만 알린다
    if (!t) return `${PLACES[place]?.name ?? '이곳'}에 가게 자리를 알아보았지만, 지금 형편으로는 낼 수 없었다.`;
    return `${PLACES[place].name}에 빈 ${KIND[t]} 자리가 났다. 연장과 첫 재료까지 은화 ${SHOP_COST[place]}닢, 집세는 달마다 ${SHOP_RENT[place]}닢. 내 가게를 내면 지금 주인 밑의 일은 그만두게 된다. 간판에 무엇이라 쓸까. 내 돈은 은화 ${g.player.money}닢이다.`;
  },
  choices: (g) => {
    const t = canOpen(g);
    const ok = canSpend(g, SHOP_COST[L(g).place]);
    return [...(ok && t ? shopNames(g, t).map((n) => ({ label: `'${n}' 간판을 단다`, key: n })) : []), { label: '아직은 아니다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    const t = canOpen(g);
    if (key === 'no' || !t || !spend(g, SHOP_COST[L(g).place])) return '가게 자리를 둘러보기만 하고 돌아왔다.';
    const life = L(g);
    const place = life.place;
    const job = TRADES[t].job;
    C(g).shop = { trade: t, place, name: key, since: g.date.year, price: 0, lastIncome: 0, months: 0 };
    // 이제 남의 밑이 아니라 내 가게에서 일한다
    leaveJob(g);
    life.job = { id: job, place, months: 0, lastRank: gradeOf(skillOf(g, t)), own: true };
    me(g).job = NPC_JOB[t];
    if (!life.houses.includes(place)) life.houses.push(place);
    if (life.home !== 'family') life.home = 'own';
    note(g, `${PLACES[place].name}에 ${Q(key, '을/를')} 열었다.`);
    chron(g, `${g.player.name}, ${PLACES[place].name}에 ${KIND[t]} ${Q(key, '을/를')} 열다.`, 60);
    return `문 위에 '${key}' 간판을 걸었다. 첫날 손님은 셋이었다. 셋 다 이웃이었고, 하나는 외상이었다. 그래도 내 가게다.`;
  },
});

/* ---------- 가게 돌보기 ---------- */
ACTIONS.push({
  id: 'shop_manage',
  name: '가게 돌보기',
  icon: 'coin',
  desc: '값을 정하고, 간판을 손보고, 제자를 들인다.',
  available: (g) => atShop(g) && isAdult(g) && !sceneQueued(g, 'shop_manage'),
  run(g) { queueScene(g, 'shop_manage'); return '가게 장부를 펼쳤다.'; },
});

const PRICE = ['싸게', '보통으로', '비싸게'];
defineScene('shop_manage', {
  need: (g) => !!shop(g),
  title: (g) => `'${shop(g).name}'`,
  text: (g) => {
    const sh = shop(g);
    const ap = apprentices(g).map((p) => `${p.name}(${ageYears(p)}살, 솜씨 ${skillWord(p.skill)})`).join(', ');
    return `${PLACES[sh.place].name}의 ${KIND[sh.trade]}. 연 지 ${g.date.year - sh.since}년. 값은 ${PRICE[sh.price + 1]} 받는다. 지난달 가게에서 남은 돈 은화 ${sh.lastIncome}닢. 제자: ${ap || '없음'}.`;
  },
  choices: (g) => {
    const sh = shop(g);
    const out = [];
    if (sh.price > -1) out.push({ label: '값을 내린다 (손님이 늘고 이름이 난다)', key: 'down' });
    if (sh.price < 1) out.push({ label: '값을 올린다 (덜 팔려도 남는 게 많다)', key: 'up' });
    if (apprentices(g).length < (gradeOf(skillOf(g, sh.trade)) >= 3 ? 2 : 1) && gradeOf(skillOf(g, sh.trade)) >= 2) out.push({ label: '제자를 들인다', key: 'apprentice' });
    if (g.player.money >= 30) out.push({ label: '간판과 진열대를 새로 한다 (은화 30닢)', key: 'sign' });
    out.push({ label: '가게를 처분한다', key: 'close' });
    out.push({ label: '장부를 덮는다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const sh = shop(g);
    if (!sh) return '';
    if (key === 'down') { sh.price -= 1; return '값을 내렸다. 옆 가게 주인이 눈을 흘겼다.'; }
    if (key === 'up') { sh.price += 1; return '값을 올렸다. 단골 몇이 투덜거렸지만 발길을 끊지는 않았다.'; }
    if (key === 'sign') { if (g.player.money < 30) return '주머니를 뒤져 보니 돈이 모자랐다.'; g.player.money -= 30; addFame(g, sh.trade, 3); return '새 간판에 금박을 입혔다. 지나가던 사람들이 걸음을 멈추고 안을 들여다보았다.'; }
    if (key === 'apprentice') { queueScene(g, 'apprentice_pick'); return '제자를 구한다는 말을 냈다. 다음 달이면 찾아오는 아이가 있을 것이다.'; }
    if (key === 'close') {
      const back = Math.round(SHOP_COST[sh.place] * 0.4);
      g.player.money += back;
      for (const p of apprentices(g)) releaseApprentice(g, p, '가게가 문을 닫아 떠났다.');
      C(g).shop = null;
      if (L(g).job?.own) { leaveJob(g); }
      note(g, `${Q(sh.name, '을/를')} 정리했다.`);
      return `'${sh.name}'의 간판을 내렸다. 연장과 자리를 넘기고 은화 ${back}닢을 받았다.`;
    }
    return '장부를 덮었다.';
  },
});

/* ---------- 제자 ---------- */
const skillWord = (v) => (v < 20 ? '서툶' : v < 40 ? '제법' : v < 55 ? '쓸 만함' : '한몫함');
export const apprentices = (g) => (C(g).apprentices ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive);

defineScene('apprentice_pick', {
  need: (g) => !!shop(g),
  title: () => '제자를 구한다',
  text: (g, s) => {
    if (!s.cands) s.cands = makeCandidates(g, s);
    return `가게 문 앞에 아이들이 찾아왔다. ${s.cands.map((c) => `${c.name}(${c.age}살): ${c.desc}`).join(' ')}`;
  },
  choices: (g, s) => {
    if (!s.cands) s.cands = makeCandidates(g, s);
    return [...s.cands.map((c, i) => ({ label: `${J(c.name, '을/를')} 받는다`, key: String(i) })), { label: '아무도 받지 않는다', key: 'none' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'none' || !shop(g)) return '아이들을 돌려보냈다.';
    const c = s.cands[+key];
    const p = makePerson(rng, { sex: c.sex, ageMonths: c.age * 12 + rng.int(0, 11), lastName: c.lastName, job: 'apprentice', traits: c.traits });
    p.name = c.name; p.skill = c.skill; p.known = true; p.affection = 25; p.place = shop(g).place; p.role = 'apprentice';
    p.history.push({ y: g.date.year, m: g.date.month, text: `${g.player.name}의 가게에 제자로 들어갔다.` });
    g.people.push(p);
    g.nextId = Math.max(g.nextId ?? 0, p.id + 1);
    (C(g).apprentices ??= []).push(p.id);
    note(g, `${J(c.name, '을/를')} 제자로 들였다.`);
    return `${J(c.name, '이/가')} 보따리 하나를 들고 가게 뒷방에 짐을 풀었다. "열심히 하겠습니다." 목소리가 떨렸다.`;
  },
});

function makeCandidates(g, s) {
  // 장면 데이터에 후보를 담아 둔다 (저장해도 같은 후보가 나온다)
  const seed = (g.date.year * 31 + g.date.month * 7 + (g.nextId ?? 1)) >>> 0;
  let x = seed || 1;
  const r = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  const NAMES_M = ['한스', '페터', '루카', '오토', '야콥', '파울'];
  const NAMES_F = ['리제', '안나', '마르타', '엘제', '그레타', '헤디'];
  const LN = ['뮐러', '바우어', '슈미트', '호프만', '베버', '피셔'];
  const DESC = [
    ['diligent', '눈빛이 곧고 손이 부지런하다.', 12],
    ['curious', '이것저것 묻는 게 많다. 손재주가 있어 보인다.', 16],
    ['lazy', '말은 잘하는데 손이 느리다.', 8],
    ['brave', '힘이 세고 겁이 없다. 대신 성미가 급하다.', 10],
  ];
  return [0, 1].map(() => {
    const sex = r() < 0.5 ? 'm' : 'f';
    const d = DESC[Math.floor(r() * DESC.length)];
    return { sex, name: (sex === 'm' ? NAMES_M : NAMES_F)[Math.floor(r() * 6)], lastName: LN[Math.floor(r() * 6)], age: 13 + Math.floor(r() * 4), traits: [d[0]], desc: d[1], skill: d[2] };
  });
}

function releaseApprentice(g, p, why) {
  const c = C(g);
  c.apprentices = (c.apprentices ?? []).filter((id) => id !== p.id);
  if (why) p.history.push({ y: g.date.year, m: g.date.month, text: why });
}

defineScene('apprentice_done', {
  need: (g) => !!shop(g),
  title: () => '제자의 독립',
  text: (g, s) => {
    const p = byId(g, s.id);
    return `${J(p.name, '이/가')} 이제 혼자서도 ${J(TRADES[s.trade].name, '을/를')} 해낼 만큼 자랐다. 들어올 때는 ${s.age0}살 아이였다. 계속 내 가게에서 일하게 할 수도, 제 가게를 내게 놓아줄 수도 있다.`;
  },
  choices: () => [{ label: '내 가게의 일꾼으로 남게 한다', key: 'stay' }, { label: '축복하며 독립시킨다', key: 'go' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (!p) return '';
    const sh = shop(g);
    p.job = NPC_JOB[s.trade];
    if (key === 'stay') {
      p.role = 'journeyman';
      if (sh) sh.journeymen = [...(sh.journeymen ?? []), p.id];
      releaseApprentice(g, p, `${g.player.name}의 가게에 일꾼으로 남았다.`);
      p.affection = clamp(p.affection + 5, -100, 100);
      return `${J(p.name, '은/는')} 고개를 숙이고 남겠다고 했다. 이제 품삯을 줘야 하지만, 가게가 그만큼 넓어졌다.`;
    }
    releaseApprentice(g, p, `스승 ${g.player.name}의 축복을 받으며 제 가게를 냈다.`);
    p.affection = clamp(p.affection + 20, -100, 100);
    addFame(g, s.trade, 5);
    L(g).renown += 2;
    chron(g, `${fullName(p)}, 스승 ${g.player.name}의 곁을 떠나 제 ${J(KIND[s.trade], '을/를')} 열다.`, 50);
    return `${J(p.name, '이/가')} 떠나는 날, 내가 쓰던 연장 하나를 쥐여 주었다. 언젠가 누군가 그 아이에게 스승이 누구였냐고 물을 것이다.`;
  },
});

/* ---------- 매달: 가게 장사 ---------- */
export function shopTick(g, rng) {
  const sh = shop(g);
  if (!sh) return null;
  const life = L(g);
  const here = life.place === sh.place && !life.travel;
  const aps = apprentices(g);
  const jm = (sh.journeymen ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && p.job === NPC_JOB[sh.trade]);
  sh.journeymen = jm.map((p) => p.id);
  const minders = aps.length + jm.length;
  // 주인도 일꾼도 없으면 문을 닫는다 (집세는 낸다)
  const open = here || minders > 0;
  const rent = SHOP_RENT[sh.place];
  let sales = 0;
  if (open) {
    const fame = fameOf(g, sh.trade);
    const d = demand(g, sh.trade).v;
    const wage = PLACES[sh.place].wage;
    const customers = (3 + fame / 8) * d * (sh.price === -1 ? 1.25 : sh.price === 1 ? 0.8 : 1);
    const margin = (here ? 0.9 + skillOf(g, sh.trade) / 120 : 0.6) * (sh.price === -1 ? 0.8 : sh.price === 1 ? 1.3 : 1);
    sales = customers * margin * wage + aps.reduce((t, p) => t + p.skill / 25, 0) + jm.reduce((t, p) => t + p.skill / 12, 0);
    sales -= jm.length * 3; // 일꾼 품삯
    if (sh.price === -1) addFame(g, sh.trade, 0.2);
  }
  const net = Math.round((sales - rent) * rng.float(0.85, 1.15));
  sh.lastIncome = net;
  sh.months += 1;
  g.player.money = Math.max(0, g.player.money + net);
  // 제자는 스승의 솜씨를 따라 자란다
  for (const p of aps) {
    p.skill = Math.min(100, p.skill + (here ? 0.25 + skillOf(g, sh.trade) / 300 : 0.1) * (p.traits.includes('diligent') ? 1.4 : p.traits.includes('lazy') ? 0.6 : 1));
    if (p.skill >= 55 && ageYears(p) >= 18 && !sceneQueued(g, 'apprentice_done')) queueScene(g, 'apprentice_done', { id: p.id, trade: sh.trade, age0: Math.max(13, ageYears(p) - Math.round((g.date.year - (p.history[0]?.y ?? g.date.year)))) });
  }
  return { open, net };
}

HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const r = shopTick(g, rng);
  if (!r) return;
  const sh = shop(g);
  if (!r.open && rng.chance(0.3)) g.news.unshift({ text: `'${sh.name}'의 문이 닫혀 있는 사이에도 집세는 나간다.`, rel: 70 });
  else if (r.net >= 25 && rng.chance(0.25)) g.news.unshift({ text: `'${sh.name}'에 손님이 끊이지 않는다. 지난달 은화 ${r.net}닢이 남았다.`, rel: 80 });
  else if (r.net < 0 && rng.chance(0.3)) g.news.unshift({ text: `${Q(sh.name, '이/가')} 지난달 은화 ${-r.net}닢을 밑졌다.`, rel: 80 });
});

// 내 가게에서 일하면 품삯이 아니라 가게 매상이 된다: 주인 몫이 더 크다
HOOKS.afterActions.push((g) => { if (L(g).job?.own && !shop(g)) { L(g).job.own = false; } });

// 대를 이으면 가게도 물려받는다. 솜씨는 물려받지 못하니 이름값은 줄어든다.
HOOKS.heir.push((g) => {
  const sh = shop(g);
  if (!sh) return;
  const c = C(g);
  c.fame[sh.trade] = Math.round((c.fame[sh.trade] ?? 0) * 0.6);
  note(g, `${Q(sh.name, '을/를')} 물려받았다.`);
  if (playerAge(g) >= 15 && !L(g).job && L(g).place === sh.place) { L(g).job = { id: TRADES[sh.trade].job, place: sh.place, months: 0, lastRank: 0, own: true }; me(g).job = NPC_JOB[sh.trade]; }
});

export { KIND, NPC_JOB, JOBS, WORK, myTrade };
