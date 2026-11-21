// 술 빚기, 재료 사기, 술통 살피기와 팔기, 술도가 열기·증류기·닫기, 매달 셈(통이 익고 시어짐, 주점 납품), 대 잇기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge } from '../game.js';
import { defineScene, queueScene, sceneQueued, note, chron, stress, tired } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { J } from '../narrative/text.js';
import { farm, atFarm } from '../farm/core.js';
import { myInn } from '../inn/core.js';
import {
  BR, cellar, atCellar, capOf, brewSkill, stockCount, namedOf, drinkName, banned, canMake, ageOf, isReady, isSour, caskValue, tasteWord, ageWord, yearTaste,
  readyCasks, logBrew, newCellar, cellarCost, taxRate, mi, clamp, here, placeName, free, stat, ownRng, isPlace, brewTown,
  INGREDIENTS, ING_IDS, ingHere, DRINKS, DRINK_IDS, STILL_COST, HOME_CAP,
} from './core.js';
import { regionOf } from '../nature/state.js';

const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const busy = (g) => !!g.army?.service || !!g.troupe?.t || !!g.poor?.bond;
const add = (o, k, n) => { o[k] = Math.min(99, (o[k] ?? 0) + n); if (o[k] <= 0) delete o[k]; };
const cooking = (g) => g.player.skills?.cooking ?? 0;
const room = (g) => BR(g).casks.length < capOf(g);
const BUY = 4; // 한 번에 사는 몫

/* ---------- 술 빚기 ---------- */
// 재료가 있거나, 술도가가 있거나, 손맛이 있고 이 고장 장터에 재료가 날 때만 보인다.
const barnBarley = (g) => (atFarm(g) ? farm(g).barn?.barley ?? 0 : 0);
const canBrewHere = (g) => playerAge(g) >= 14 && free(g) && !busy(g) && isPlace(here(g)) && room(g)
  && (DRINK_IDS.some((d) => canMake(g, d)) || atCellar(g) || barnBarley(g) >= 2 || ((brewSkill(g) > 0 || cooking(g) >= 15 || (myInn(g) && myInn(g).place === here(g))) && ingHere(g).length > 0 && g.player.money >= 8));
ACTIONS.push({
  id: 'brew_make', name: '술을 빚는다', icon: 'home',
  desc: '재료를 모아 술을 빚어 통에 담는다. 통은 묵힐수록 값이 오르는 것도, 금방 시어지는 것도 있다.',
  available: (g) => canBrewHere(g),
  run(g) {
    if (!sceneQueued(g, 'brew_make')) queueScene(g, 'brew_make', {}, { first: true });
    return '술 빚을 채비를 했다.';
  },
});

function makeCask(g, rng, d) {
  const s = BR(g), D = DRINKS[d];
  if (!s.skill) s.skill = Math.min(20, Math.round(cooking(g) * 0.3));
  for (const [i, n] of Object.entries(D.need)) add(s.stock, i, -n);
  const t = yearTaste(g, rng, here(g));
  const home = D.home.includes(regionOf(here(g))) ? 10 : 0;
  const q = Math.round(clamp(30 + s.skill * 0.5 + home + stat(g, 'sen') * 0.1 + rng.int(-10, 10), 5, 100));
  const c = { id: s.seq++, d, y: g.date.year, t, q, at: mi(g), place: here(g) };
  s.casks.push(c);
  s.brewed += 1;
  add(s.made, d, 1);
  s.skill = clamp(s.skill + (s.skill < 30 ? 3 : s.skill < 60 ? 2 : 1) * (0.7 + stat(g, 'sen') / 200), 0, 100);
  tired(g, 8);
  const nm = drinkName(g, d);
  // 이름난 술: 같은 술을 오래, 잘 빚으면 사람들이 내 이름을 붙인다
  let extra = '';
  if (!namedOf(g, d) && (s.made[d] ?? 0) >= 8 && s.skill >= 50 && q >= 55) {
    s.named.push({ d, by: g.player.name, gen: 1, since: mi(g) });
    extra = ` 장터 사람들이 이 술에 내 이름을 붙였다: '${g.player.name}네 ${D.name}'.`;
    chron(g, `${J(g.player.name, '이/가')} 빚은 ${J(D.name, '이/가')} 이름을 얻다.`, 60);
    note(g, `내 ${J(D.name, '이/가')} 이름을 얻었다.`);
  }
  if (D.grain && banned(g)) {
    s.illicit += 1;
    extra += ' 흉년이라 곡식으로 술을 빚는 것은 금지되어 있다. 창을 가리고 밤에 끓였다.';
    if (rng.chance(0.15)) { reportCrime(g, 'smuggling', here(g), { mult: 0.4 }); extra += ' 굴뚝 연기를 누가 본 것 같다.'; }
  }
  logBrew(g, `${placeName(here(g))}에서 ${D.name} 한 통을 빚었다 (${tasteWord(t)}).`);
  return `${D.line} ${J(nm, '을/를')} 한 통 담았다. ${g.date.year}년, ${placeName(here(g))}의 ${tasteWord(t)}.${home ? ' 이 고장 술이라 손에 익은 맛이 난다.' : ''}${extra}`;
}

defineScene('brew_make', {
  need: (g) => canBrewHere(g),
  title: () => '술 빚기',
  text: (g) => {
    const s = BR(g);
    const st = ING_IDS.filter((i) => s.stock[i]).map((i) => `${INGREDIENTS[i].name} ${s.stock[i]}몫`).join(', ') || '없다';
    const sell = ingHere(g).map((i) => INGREDIENTS[i].name).join(', ');
    return `가진 재료: ${st}. 술통 ${s.casks.length}/${capOf(g)}개.${sell ? ` 이 고장 장터에는 ${J(sell, '이/가')} 나와 있다.` : ' 이 고장 장터에는 지금 술 재료가 없다.'}${banned(g) ? ' 흉년이라 곡식 술은 금지되어 있다.' : ''}`;
  },
  choices: (g) => {
    const out = [];
    for (const d of DRINK_IDS) if (canMake(g, d)) out.push({ label: `${J(drinkName(g, d), '을/를')} 빚는다${DRINKS[d].grain && banned(g) ? ' (금주령을 어기고)' : ''}`, key: `make:${d}` });
    if (barnBarley(g) >= 2) out.push({ label: '내 곳간의 보리를 가져온다', key: 'barn' });
    for (const i of ingHere(g)) if (g.player.money >= INGREDIENTS[i].price * BUY) out.push({ label: `${INGREDIENTS[i].name} ${BUY}몫을 산다 (은화 ${INGREDIENTS[i].price * BUY}닢)`, key: `buy:${i}` });
    out.push({ label: '그만둔다', key: 'no' });
    return out.slice(-8);
  },
  resolve(g, rng, s, key) {
    const st = BR(g);
    if (key === 'no') return '재료를 덮어 두었다.';
    if (key === 'barn') {
      const f = farm(g); const n = Math.min(8, f?.barn?.barley ?? 0);
      if (!atFarm(g) || n < 2) return '그 사이 곳간 형편이 달라졌다.';
      f.barn.barley -= n; if (f.barn.barley <= 0) delete f.barn.barley;
      add(st.stock, 'barley', n);
      if (!sceneQueued(g, 'brew_make')) queueScene(g, 'brew_make', {}, { first: true });
      return `곳간에서 보리 ${n}몫을 퍼 왔다.`;
    }
    const [k, id] = key.split(':');
    if (k === 'buy') {
      const I = INGREDIENTS[id];
      if (!I || !ingHere(g).includes(id) || pay(g, I.price * BUY) <= 0) return '그 사이 장터 형편이 달라졌다.';
      add(st.stock, id, BUY);
      if (!sceneQueued(g, 'brew_make')) queueScene(g, 'brew_make', {}, { first: true });
      return `${J(I.name, '을/를')} ${BUY}몫 샀다.`;
    }
    if (k === 'make') {
      if (!DRINKS[id] || !canMake(g, id) || !room(g)) return '그 사이 형편이 달라져 술을 빚지 못했다.';
      return makeCask(g, rng, id);
    }
    return '아무것도 하지 않았다.';
  },
});

/* ---------- 술통과 술도가 ---------- */
const canOpen = (g) => !cellar(g) && playerAge(g) >= 16 && BR(g).brewed > 0 && brewSkill(g) >= 20 && brewTown(here(g)) && g.player.money >= cellarCost(here(g));
const canCellar = (g) => playerAge(g) >= 14 && free(g) && !busy(g) && (atCellar(g) || canOpen(g) || (BR(g).casks.length > 0 && isPlace(here(g)) && (readyCasks(g).length > 0 || BR(g).casks.some((c) => isSour(g, c)))));
ACTIONS.push({
  id: 'brew_cellar', name: '술통을 살핀다', icon: 'coin',
  desc: '익은 술통을 팔거나 내 술도가를 꾸린다.',
  available: (g) => canCellar(g),
  run(g) {
    if (!sceneQueued(g, 'brew_cellar')) queueScene(g, 'brew_cellar', {}, { first: true });
    return '술통 마개를 하나씩 열어 보았다.';
  },
});

const myInnHere = (g) => !!myInn(g) && myInn(g).place === here(g);
const best = (g) => readyCasks(g).slice().sort((a, b) => caskValue(g, b) - caskValue(g, a))[0] ?? null;
function sell(g, c, mul = 1, { untaxed = false } = {}) {
  const s = BR(g), p = cellar(g);
  const v = Math.round(caskValue(g, c) * mul * (p && atCellar(g) ? 1 + p.fame / 200 : 1));
  s.casks = s.casks.filter((x) => x !== c);
  g.player.money += v;
  s.sold += 1; s.earned += v;
  if (p && !untaxed) p.taxOwed = Math.round(p.taxOwed + v * taxRate(p.place, c.d));
  if (p && atCellar(g)) p.fame = clamp(p.fame + (c.q >= 60 ? 1 : c.q < 30 ? -1 : 0.3), 0, 100);
  return v;
}
const caskLine = (g, c) => `${c.y}년 ${drinkName(g, c.d)} (${ageWord(g, c)}, 은화 ${caskValue(g, c)}닢쯤)`;

defineScene('brew_cellar', {
  need: (g) => canCellar(g),
  title: (g) => (cellar(g) && atCellar(g) ? cellar(g).name : '술통'),
  text: (g) => {
    const s = BR(g), p = cellar(g);
    const list = s.casks.slice(0, 6).map((c) => caskLine(g, c)).join(', ') || '비었다';
    if (!p && canOpen(g)) return `골목 끝 빈 창고를 은화 ${cellarCost(here(g))}닢에 얻을 수 있다. 서늘하고 바닥이 돌이라 술통을 재우기 좋다. 지금 가진 통: ${list}.`;
    const head = p && atCellar(g) ? `${p.name}. ${p.still ? '증류기가 있다. ' : ''}지난달 번 돈 은화 ${p.last}닢, 밀린 술 세금 ${p.taxOwed}닢.` : '집 광에 둔 술통들.';
    return `${head} 통: ${list}${s.casks.length > 6 ? ` 외 ${s.casks.length - 6}통` : ''}.${banned(g) ? ' 흉년이라 금주령이 내렸다. 곡식 술은 내놓고 팔 수 없다.' : ''}`;
  },
  choices: (g) => {
    const s = BR(g), p = cellar(g), out = [];
    if (!p && canOpen(g)) out.push({ label: `술도가를 연다 (은화 ${cellarCost(here(g))}닢)`, key: 'open' });
    const b = best(g);
    const legal = (c) => !(DRINKS[c.d].grain && banned(g));
    if (b && legal(b)) out.push({ label: `가장 좋은 통을 판다: ${caskLine(g, b)}`, key: 'sell1' });
    if (readyCasks(g).filter(legal).length >= 2) out.push({ label: `익은 통을 모두 판다 (${readyCasks(g).filter(legal).length}통)`, key: 'sellall' });
    if (myInnHere(g) && readyCasks(g).length) out.push({ label: '내 주점에 술을 댄다', key: 'inn' });
    if (s.casks.some((c) => isSour(g, c))) out.push({ label: '식초가 된 통을 식초 장수에게 넘긴다', key: 'sour' });
    if (p && atCellar(g) && !p.still && brewSkill(g) >= 35) out.push({ label: `증류기를 들인다 (은화 ${STILL_COST}닢)`, key: 'still' });
    if (p && atCellar(g) && p.taxOwed > 0) out.push({ label: `밀린 술 세금을 낸다 (은화 ${p.taxOwed}닢)`, key: 'tax' });
    if (p && atCellar(g)) out.push({ label: '술도가를 닫는다', key: 'close' });
    out.push({ label: '그냥 둔다', key: 'no' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const st = BR(g), p = cellar(g);
    if (key === 'no') return '마개를 다시 막고 통을 두드려 보았다. 소리가 묵직하다.';
    if (key === 'open') {
      if (!canOpen(g) || pay(g, cellarCost(here(g))) <= 0) return '그 사이 형편이 달라져 술도가를 열 수 없었다.';
      st.cellar = newCellar(g, rng);
      note(g, `${placeName(here(g))}에 ${J(st.cellar.name, '을/를')} 열었다.`);
      chron(g, `${J(g.player.name, '이/가')} ${placeName(here(g))}에 술도가를 열다.`, 40);
      logBrew(g, `${J(st.cellar.name, '을/를')} 열었다.`);
      return `${J(st.cellar.name, '이/가')} 문을 열었다. 이제 통을 열네 개까지 재울 수 있다. 다만 술도가가 되면 술 세금을 문다.`;
    }
    if (key === 'sell1') {
      const b = best(g);
      if (!b || (DRINKS[b.d].grain && banned(g))) return '그 사이 팔 만한 통이 없어졌다.';
      const line = caskLine(g, b);
      const v = sell(g, b);
      return `은화 ${v}닢에 넘겼다: ${line}.${b.q >= 70 ? ' 산 사람이 그 자리에서 한 잔 따라 마시고 고개를 끄덕였다.' : ''}`;
    }
    if (key === 'sellall') {
      const list = readyCasks(g).filter((c) => !(DRINKS[c.d].grain && banned(g)));
      if (!list.length) return '그 사이 팔 만한 통이 없어졌다.';
      let sum = 0; for (const c of list) sum += sell(g, c, 0.9);
      return `익은 통 ${list.length}개를 한꺼번에 넘겼다. 은화 ${sum}닢. 한꺼번에 팔면 값을 조금 깎인다.`;
    }
    if (key === 'inn') {
      const inn = myInn(g), list = readyCasks(g).slice(0, 3);
      if (!myInnHere(g) || !list.length) return '그 사이 형편이 달라졌다.';
      let sum = 0; for (const c of list) sum += sell(g, c, 0.8);
      inn.fame = clamp((inn.fame ?? 0) + list.length * 2, 0, 100);
      return `내 주점 뒷방에 술통 ${list.length}개를 굴려 넣었다. 셈은 은화 ${sum}닢으로 쳤다. 손님들이 술맛이 달라졌다고 한다.`;
    }
    if (key === 'sour') {
      const list = st.casks.filter((c) => isSour(g, c));
      if (!list.length) return '식초가 된 통이 없다.';
      let sum = 0; for (const c of list) { st.casks = st.casks.filter((x) => x !== c); sum += Math.max(1, Math.round(caskValue(g, c))); }
      g.player.money += sum;
      return `식초 장수가 통 ${list.length}개에 은화 ${sum}닢을 쳐 주었다. 아까운 술이었다.`;
    }
    if (key === 'still') {
      if (!p || !atCellar(g) || p.still || pay(g, STILL_COST) <= 0) return '그 사이 형편이 달라졌다.';
      p.still = true;
      return '구리 솥과 꼬불꼬불한 관을 들였다. 이제 맥주를 걸러 불술을 받아 낼 수 있다. 불술은 세금이 곱이다.';
    }
    if (key === 'tax') {
      if (!p || !atCellar(g) || p.taxOwed <= 0) return '낼 세금이 없다.';
      const n = pay(g, p.taxOwed); p.taxOwed -= n;
      return `세리 사무소에 은화 ${n}닢을 냈다.${p.taxOwed > 0 ? ` 아직 ${p.taxOwed}닢이 남았다.` : ' 장부가 깨끗해졌다.'}`;
    }
    if (key === 'close') {
      if (!p) return '닫을 술도가가 없다.';
      const extra = st.casks.length - HOME_CAP;
      let sum = 0;
      if (extra > 0) for (const c of st.casks.slice().sort((a, b) => caskValue(g, a) - caskValue(g, b)).slice(0, extra)) sum += sell(g, c, 0.5, { untaxed: true });
      st.past.push({ name: p.name, place: p.place, from: p.since, to: mi(g), by: p.by });
      st.cellar = null;
      stress(g, 4);
      return `${J(p.name, '이/가')} 문을 닫았다.${extra > 0 ? ` 집에 둘 수 없는 통 ${extra}개는 헐값에 넘겼다. 은화 ${sum}닢.` : ''}`;
    }
    return '아무것도 하지 않았다.';
  },
});

/* ---------- 매달 ---------- */
export function cellarMonth(g, rng) {
  const p = cellar(g), st = BR(g);
  if (!p) return 0;
  let earned = 0;
  // 주점 납품: 익은 통이 있으면 한 달에 하나씩 대 준다
  const c = p.contract;
  if (c) {
    const cask = readyCasks(g).find((x) => x.d === c.d) ?? null;
    if (cask && !(DRINKS[cask.d].grain && banned(g))) {
      const v = Math.round(caskValue(g, cask) * c.pay);
      st.casks = st.casks.filter((x) => x !== cask);
      g.player.money += v; earned += v; st.sold += 1; st.earned += v;
      p.taxOwed = Math.round(p.taxOwed + v * taxRate(p.place, cask.d));
      p.fame = clamp(p.fame + 0.5, 0, 100);
    } else if (rng.chance(0.5)) { p.fame = clamp(p.fame - 2, 0, 100); c.missed = (c.missed ?? 0) + 1; }
    c.left -= 1;
    if (c.left <= 0 || (c.missed ?? 0) >= 3) { logBrew(g, `${J(c.name, '과/와')}의 납품이 끝났다.`); p.contract = null; }
  }
  // 세금이 오래 밀리면 늘어난다
  if (p.taxOwed > 0 && g.date.month === 12) p.taxOwed = Math.round(p.taxOwed * 1.1);
  p.last = earned;
  return earned;
}
HOOKS.afterMonth.push((g) => {
  const st = BR(g);
  if (!st.casks.length && !st.cellar) return;
  const rng = ownRng(g, 1);
  cellarMonth(g, rng);
  // 막 시어진 통을 알린다
  for (const c of st.casks) if (ageOf(g, c) === DRINKS[c.d].spoil) logBrew(g, `${c.y}년 ${J(DRINKS[c.d].name, '이/가')} 시어 식초가 되었다.`);
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g) => {
  const s = BR(g);
  for (const n of s.named) n.gen += 1;
  if (s.cellar) { s.cellar.gens += 1; s.cellar.contract = null; }
  // 술통은 그대로 남는다 (부모가 묻어 둔 포도주). 손맛은 어깨너머로 조금.
  s.skill = Math.min(25, Math.round(s.skill * 0.3));
});
