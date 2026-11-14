// 선원과 선장의 길: 선원 일자리, 내 배, 선원 삯, 무역 짐.
// - 선원(갑판원 → 선원 → 항해사 → 선장)은 항구에서 구하는 일자리다. 뱃일이 오르면 단계가 오른다.
// - 뱃일 40이 넘으면 항구에서 배를 살 수 있다. 배가 있으면 달마다 선원 삯이 나간다.
// - 항구에서 짐을 싣고 다른 항구에 닿으면 판다. 항구마다 싼 물건과 비싼 물건이 다르다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill } from '../game.js';
import { PLACES } from '../places.js';
import { registerJob, doWork } from '../jobs.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, stress, gains, up } from '../adventure/core.js';
import { S, GOODS, PORTS, isPort, priceAt, sailing } from './core.js';

/* ---------- 선원 일자리 ---------- */
const SAILOR_LINES = [
  '새벽 썰물에 맞춰 짐배를 띄웠다.',
  '부두에서 소금 자루를 배에 실었다. 허리가 끊어질 것 같았다.',
  '연안을 따라 생선 배를 몰았다. 갈매기들이 끝까지 따라왔다.',
  '찢어진 돛을 하루 종일 기웠다.',
  '항해사에게 해도 읽는 법을 배웠다.',
  '짙은 안개 속에서 등대 불빛만 보고 배를 몰았다.',
];
registerJob('sailor', {
  name: '선원', places: ['klein', 'portel', 'saltmare', 'saltrock'], skill: 'sailing', stat: 'agi', stat2: 'str',
  ranks: ['갑판원', '선원', '항해사', '선장'], wage: [3, 4, 7, 11], npcJob: 'sailor',
  lines: SAILOR_LINES,
  promote: (g, rk) => [
    '',
    '갑판장이 이제 밧줄 잡는 손이 제법이라고 했다. 정식 선원이 되었다.',
    '선장이 키를 맡겼다. 이제 항해사다. 해도와 별을 읽는 사람이 되었다.',
    '선주 조합이 배 한 척을 맡겼다. 선장이다. 이제 배를 사서 내 뱃길을 낼 수도 있다.',
  ][rk],
  work(g, rng) {
    // doWork는 기술 이름을 모르므로 '뱃일'로 바꿔 적는다
    let text = doWork(g, rng, this).replace('sailing +', '뱃일 +');
    if (rng.chance(0.04)) {
      g.player.injuries.push({ name: rng.pick(['밧줄에 감겨 꺾인 손목', '갑판에서 미끄러져 다친 무릎', '닻줄에 쓸린 어깨']), months: 2 });
      text += ' 일을 하다 다쳤다.';
    }
    return text;
  },
});

/* ---------- 배 ---------- */
export const SHIPS = {
  sloop: { name: '외돛 범선', price: 250, need: 40, speed: 8, hold: 20, crew: 3, desc: '선원 몇이면 모는 작은 배. 연안과 가까운 섬에 알맞다.' },
  raider: { name: '쾌속선', price: 450, need: 55, speed: 22, hold: 12, crew: 5, desc: '좁고 날렵한 배. 짐은 적게 싣지만 누구보다 빠르다. 해적과 해적 사냥꾼이 탄다.' },
  brig: { name: '쌍돛 상선', price: 650, need: 60, speed: 4, hold: 50, crew: 7, desc: '짐칸이 넓은 상선. 느리지만 한 번에 큰돈을 실어 나른다.' },
};
const SHIP_NAMES = ['바다제비', '소금꽃', '늙은 고래', '새벽바람', '검은 갈매기', '은빛 물결', '파도의 딸', '붉은 돛', '떠돌이 별', '마지막 닻'];
export const holdOf = (g) => (S(g).ship ? SHIPS[S(g).ship.kind]?.hold ?? 20 : 6);
const shipyard = (place) => ['klein', 'portel', 'saltmare'].includes(place);

ACTIONS.push({
  id: 'shipyard',
  name: '조선소에 간다',
  icon: 'ship',
  desc: '배를 사거나 고치거나 판다. 배를 사려면 뱃일 40 이상이 필요하다.',
  available: (g) => isAdult(g) && !traveling(g) && shipyard(L(g).place) && !sceneQueued(g, 'shipyard'),
  run(g) { queueScene(g, 'shipyard'); return '조선소의 망치 소리를 따라 걸었다.'; },
});
defineScene('shipyard', {
  need: (g) => shipyard(L(g).place) && !traveling(g),
  title: (g) => `${PLACES[L(g).place].name}의 조선소`,
  text: (g) => {
    const sh = S(g).ship;
    if (sh) return `내 배 ${J(sh.name, '은/는')} ${SHIPS[sh.kind].name}이다. 선체는 ${sh.hull}/100. 달마다 선원 삯 은화 ${SHIPS[sh.kind].crew}닢이 나간다.${sh.unpaid ? ` 선원들에게 ${sh.unpaid}달 치 삯이 밀려 있다.` : ''}`;
    return `목수들이 용골 위에 늑골을 세우고 있다. 조선소 주인이 내 손을 보며 물었다. "배를 몰 줄은 아시오?" (지금 뱃일 ${Math.floor(sailing(g))})`;
  },
  choices: (g) => {
    const sh = S(g).ship;
    const out = [];
    if (sh) {
      const fix = repairCost(sh);
      if (fix > 0 && g.player.money >= fix) out.push({ label: `배를 고친다 (은화 ${fix}닢)`, key: 'repair' });
      if (sh.unpaid && g.player.money >= sh.unpaid * SHIPS[sh.kind].crew) out.push({ label: `밀린 선원 삯을 치른다 (은화 ${sh.unpaid * SHIPS[sh.kind].crew}닢)`, key: 'payup' });
      out.push({ label: `배를 판다 (은화 ${sellPrice(sh)}닢)`, key: 'sell' });
    } else {
      for (const [id, d] of Object.entries(SHIPS)) {
        if (sailing(g) < d.need) out.push({ label: `${d.name} (조건: 뱃일 ${d.need})`, key: `no:${id}` });
        else if (g.player.money >= d.price) out.push({ label: `${J(d.name, '을/를')} 산다 (은화 ${d.price}닢)`, key: `buy:${id}` });
        else out.push({ label: `${d.name} (은화 ${d.price}닢, 돈이 모자람)`, key: `no:${id}` });
      }
    }
    out.push({ label: '그냥 돌아간다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const sea = S(g);
    if (key === 'none') return '갓 칠한 타르 냄새만 맡고 돌아왔다.';
    if (key.startsWith('no:')) { const d = SHIPS[key.slice(3)]; return d && sailing(g) < d.need ? `조선소 주인이 고개를 저었다. "뱃일을 더 배우고 오시오. 배는 모는 사람을 닮소."` : '주머니를 뒤져 보았지만 배 한 척 값에는 한참 모자랐다.'; }
    if (key.startsWith('buy:')) {
      const id = key.slice(4);
      const d = SHIPS[id];
      if (!d || sea.ship || g.player.money < d.price || sailing(g) < d.need) return '거래는 성사되지 않았다.';
      g.player.money -= d.price;
      const name = SHIP_NAMES[(g.date.year + sea.voyages + Object.keys(SHIPS).indexOf(id)) % SHIP_NAMES.length];
      sea.ship = { name, kind: id, hull: 100, speed: d.speed, unpaid: 0 };
      note(g, `${d.name} ${J(name, '을/를')} 샀다.`);
      chron(g, `${g.player.name}, 배 '${name}'의 주인이 되다.`);
      return `은화 ${d.price}닢을 세어 주고 ${d.name}의 주인이 되었다. 뱃머리에 이름을 새겼다. '${name}'. 선원 ${d.crew}명이 내 배에 올랐다. 이제 "배 타기"로 내 배를 몰고, 짐을 실어 나를 수 있다.`;
    }
    const sh = sea.ship;
    if (!sh) return '부두에 내 배가 없었다.';
    if (key === 'repair') {
      const fix = repairCost(sh);
      if (g.player.money < fix) return '수리비가 모자랐다.';
      g.player.money -= fix; sh.hull = 100;
      return `목수들이 사흘 동안 뱃바닥에 매달렸다. 은화 ${fix}닢이 들었다. ${J(sh.name, '이/가')} 새 배처럼 물 위에 떴다.`;
    }
    if (key === 'payup') {
      const c = sh.unpaid * SHIPS[sh.kind].crew;
      if (g.player.money < c) return '돈이 모자랐다.';
      g.player.money -= c; sh.unpaid = 0;
      return `밀린 삯 은화 ${c}닢을 치렀다. 선원들의 얼굴이 펴졌다.`;
    }
    if (key === 'sell') {
      const p = sellPrice(sh);
      g.player.money += p;
      note(g, `배 ${J(sh.name, '을/를')} 팔았다.`);
      sea.ship = null;
      stress(g, 3);
      return `은화 ${p}닢을 받고 ${J(sh.name, '을/를')} 넘겼다. 새 주인이 뱃머리의 이름을 긁어내는 것을 보고 돌아섰다.`;
    }
    return '조선소를 둘러보고 나왔다.';
  },
});
const repairCost = (sh) => Math.ceil((100 - sh.hull) / 2);
const sellPrice = (sh) => Math.round(SHIPS[sh.kind].price * 0.6 * (0.4 + sh.hull / 166));

// 선원 삯: 달마다. 석 달이 밀리면 선원들이 배를 끌고 떠난다.
HOOKS.afterMonth.push((g) => {
  const sea = S(g);
  const sh = sea.ship;
  if (!sh || g.over) return;
  const wage = SHIPS[sh.kind]?.crew ?? 3;
  if (g.player.money >= wage) { g.player.money -= wage; return; }
  sh.unpaid = (sh.unpaid ?? 0) + 1;
  if (sh.unpaid >= 3 && !L(g).travel?.own) {
    note(g, `삯을 받지 못한 선원들이 배 ${J(sh.name, '을/를')} 끌고 떠났다.`);
    chron(g, `${g.player.name}의 배 '${sh.name}', 선원들이 끌고 달아나다.`);
    sea.ship = null;
  }
});

/* ---------- 무역 짐 ---------- */
const tradeMul = (g) => 1 + (g.player.skills.trade ?? 0) / 400;
export const buyPrice = (g, port, good) => Math.max(1, Math.round(priceAt(g, port, good) / tradeMul(g)));
export const sellPriceOf = (g, port, good) => Math.max(1, Math.round(priceAt(g, port, good) * tradeMul(g) * 0.92));

ACTIONS.push({
  id: 'cargo',
  name: '짐 싣고 팔기',
  icon: 'coin',
  desc: '부두 시장에서 물건을 사서 배에 싣는다. 다른 항구에 닿으면 판다. 싸게 사서 비싸게 파는 것이 장사다.',
  available: (g) => isAdult(g) && !traveling(g) && isPort(L(g).place) && !sceneQueued(g, 'cargo'),
  run(g) { queueScene(g, 'cargo'); return '부두 시장의 시세를 알아보았다.'; },
});
defineScene('cargo', {
  need: (g) => isPort(L(g).place) && !traveling(g),
  title: (g) => `${PLACES[L(g).place].name}의 부두 시장`,
  text: (g, s) => {
    const here = L(g).place;
    const c = S(g).cargo;
    const head = s?.arrived && c ? `배가 부두에 닿자 상인들이 몰려와 짐칸의 ${J(GOODS[c.good].name, '을/를')} 들여다보았다. ` : '';
    const mine = c ? `짐칸에 ${GOODS[c.good].name} ${c.qty}짐이 있다(짐당 ${Math.round(c.cost / Math.max(1, c.qty))}닢에 샀다). 여기서는 짐당 ${sellPriceOf(g, here, c.good)}닢을 쳐준다. ` : `짐칸은 비어 있다(${holdOf(g)}짐까지 실을 수 있다${S(g).ship ? '' : ', 남의 배 짐칸을 빌린다'}). `;
    const best = Object.keys(GOODS).map((k) => {
      const far = PORTS.filter((p) => p !== here && (!PLACES[p].hidden || PLACES[p].open?.(g)));
      const top = far.reduce((a, p) => (priceAt(g, p, k) > priceAt(g, a, k) ? p : a), far[0]);
      return `${GOODS[k].name} ${buyPrice(g, here, k)}닢(${PLACES[top].name}에서 ${priceAt(g, top, k)}닢)`;
    }).join(', ');
    return `${head}${mine}이곳 시세: ${best}.`;
  },
  choices: (g) => {
    const here = L(g).place;
    const c = S(g).cargo;
    const out = [];
    if (c) {
      out.push({ label: `${GOODS[c.good].name} ${c.qty}짐을 판다 (은화 ${sellPriceOf(g, here, c.good) * c.qty}닢)`, key: 'sell' });
    } else {
      const hold = holdOf(g);
      for (const k of Object.keys(GOODS)) {
        const p = buyPrice(g, here, k);
        const qty = Math.min(hold, Math.floor(g.player.money / p));
        if (qty >= 1) out.push({ label: `${GOODS[k].name} ${qty}짐을 산다 (은화 ${qty * p}닢)`, key: `buy:${k}` });
      }
    }
    out.push({ label: c ? '팔지 않고 싣고 다닌다' : '사지 않는다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const sea = S(g);
    const here = L(g).place;
    if (key === 'none') { if (sea.cargo) sea.cargo.at = here; return sea.cargo ? '더 비싸게 쳐줄 항구를 찾기로 했다.' : '시세만 눈에 익혀 두었다.'; }
    if (key === 'sell') {
      const c = sea.cargo;
      if (!c) return '짐칸은 이미 비어 있었다.';
      const got = sellPriceOf(g, here, c.good) * c.qty;
      g.player.money += got;
      sea.cargo = null;
      const profit = got - c.cost;
      const k = gainSkill(g, 'trade', profit > 0 ? 1.2 : 0.5, 'cha');
      sea.profit = (sea.profit ?? 0) + profit;
      if (profit >= 150) chron(g, `${g.player.name}, ${PLACES[here].name}에서 큰 장사를 하다.`);
      L(g).renown += profit >= 100 ? 1 : 0;
      return `${GOODS[c.good].name} ${c.qty}짐을 은화 ${got}닢에 넘겼다. ${profit > 0 ? `${profit}닢이 남았다.` : profit < 0 ? `${-profit}닢을 밑졌다. 바다 장사가 쉬운 게 아니다.` : '본전이다.'}${gains([up('장사', k)])}`;
    }
    const good = key.slice(4);
    if (!GOODS[good] || sea.cargo) return '물건은 이미 다른 상인이 채 갔다.';
    const p = buyPrice(g, here, good);
    const qty = Math.min(holdOf(g), Math.floor(g.player.money / p));
    if (qty < 1) return '물건값이 모자랐다.';
    g.player.money -= qty * p;
    sea.cargo = { good, qty, cost: qty * p, from: here, at: here };
    const k = gainSkill(g, 'trade', 0.5, 'cha');
    return `${GOODS[good].name} ${qty}짐을 은화 ${qty * p}닢에 사서 짐칸에 실었다. 이제 "배 타기"로 비싸게 쳐줄 항구를 찾아가면 된다.${gains([up('장사', k)])}`;
  },
});

// 짐을 싣고 다른 항구에 닿으면 팔지 묻는다
HOOKS.afterActions.push((g) => {
  const c = S(g).cargo;
  const life = L(g);
  if (!c || traveling(g) || g.over || !isPort(life.place) || c.at === life.place) return;
  c.at = life.place;
  if (!sceneQueued(g, 'cargo')) queueScene(g, 'cargo', { arrived: true });
});
