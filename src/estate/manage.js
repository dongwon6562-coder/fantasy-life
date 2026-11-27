// 집과 세놓을 것을 돌본다: 고치기, 넓히기, 하인, 세놓기, 밭·가게 자리 사고팔기. 그리고 불과 도둑.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, stress, spend } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { SHOP_COST } from '../craft/shop.js';
import { E, HOME_LEVELS, LEVEL_MUL, SERVANT_WAGE, MAX_SERVANTS, RENT_KINDS, pickTenant, homeOf, houseValue, homeWorth, rentedOut, rentalWorth, placeName } from './core.js';
import { opener } from '../narrative/openers.js';

const here = (g) => L(g).place;
const repairCost = (g, place) => { const h = homeOf(g, place); return h ? Math.ceil((100 - h.cond) / 100 * houseValue(place) * LEVEL_MUL[h.level] * 0.25) : 0; };
const growCost = (g, place) => { const h = homeOf(g, place); return h && h.level < 2 ? Math.round(houseValue(place) * (LEVEL_MUL[h.level + 1] - LEVEL_MUL[h.level])) : 0; };
export const houseRent = (g, place) => { const h = homeOf(g, place); return h ? Math.max(1, Math.round(houseValue(place) * LEVEL_MUL[h.level] * RENT_KINDS.house.rate)) : 0; };
const shopPrice = (place) => Math.round((SHOP_COST[place] ?? Math.round((PLACES[place]?.house ?? 300) * 0.5)) * 1.2);
const landHere = (g) => RENT_KINDS.land.places.includes(here(g)) && PLACES[here(g)];
const shopHere = (g) => RENT_KINDS.shop.places.includes(here(g)) && PLACES[here(g)];
const hasAnything = (g) => L(g).houses.length > 0 || E(g).rentals.length > 0;

ACTIONS.push({
  id: 'estate_manage',
  name: '집과 재산 돌보기',
  icon: 'home',
  desc: '내 집을 고치고 넓히고, 하인을 두고, 집이나 밭·가게 자리를 세놓는다.',
  available: (g) => isAdult(g) && !traveling(g) && (hasAnything(g) || ((landHere(g) || shopHere(g)) && g.player.money >= RENT_KINDS.land.price)) && !sceneQueued(g, 'estate_manage'),
  run(g, rng) { queueScene(g, 'estate_manage'); return opener(g, 'estate_manage', rng); },
});

defineScene('estate_manage', {
  title: (g) => `${placeName(here(g))}의 재산`,
  text: (g) => {
    const place = here(g);
    const h = homeOf(g, place);
    const parts = [];
    if (h) parts.push(`이곳 내 집은 ${HOME_LEVELS[h.level]}, ${condWord(h.cond)}. 하인 ${h.servants ? `${h.servants}명` : '없음'}.${rentedOut(g, place) ? ' 지금은 세를 놓았다.' : ''} 값으로 치면 은화 ${homeWorth(g, place)}닢쯤.`);
    const mine = E(g).rentals.filter((r) => r.place === place && r.kind !== 'house');
    if (mine.length) parts.push(`이곳에 가진 것: ${mine.map((r) => `${RENT_KINDS[r.kind].name}(${r.tenant ? `세입자 ${r.tenant}` : '빈 채'})`).join(', ')}.`);
    const far = L(g).houses.filter((p) => p !== place).map(placeName);
    if (far.length) parts.push(`다른 곳의 집: ${far.join(', ')}.`);
    if (!parts.length) parts.push('이 고장에는 아직 내 것이 없다. 밭이나 가게 자리를 사서 세를 놓을 수 있다.');
    return `${parts.join(' ')} 가진 돈은 은화 ${g.player.money}닢.`;
  },
  choices: (g) => {
    const place = here(g);
    const h = homeOf(g, place);
    const out = [];
    if (h) {
      const rc = repairCost(g, place);
      if (h.cond < 85 && rc > 0) out.push({ label: `집을 고친다 (은화 ${rc}닢)`, key: 'repair' });
      const gc = growCost(g, place);
      if (gc && h.cond >= 50) out.push({ label: `${HOME_LEVELS[h.level + 1]}으로 넓힌다 (은화 ${gc}닢)`, key: 'grow' });
      if (h.servants < MAX_SERVANTS[h.level]) out.push({ label: `하인을 하나 더 둔다 (달마다 은화 ${SERVANT_WAGE}닢)`, key: 'hire' });
      if (h.servants > 0) out.push({ label: '하인 하나를 내보낸다', key: 'fire' });
      if (!rentedOut(g, place)) out.push({ label: `집을 세놓는다 (달마다 은화 ${houseRent(g, place)}닢쯤, 나는 다른 데서 지낸다)`, key: 'rent_house' });
      else out.push({ label: '세를 거두고 집을 비운다', key: 'unrent_house' });
      out.push({ label: `집을 판다 (은화 ${homeWorth(g, place)}닢)`, key: 'sell_house' });
    }
    if (landHere(g)) out.push({ label: `밭을 사서 소작을 준다 (은화 ${RENT_KINDS.land.price}닢, 달마다 은화 ${RENT_KINDS.land.rent}닢쯤)`, key: 'buy_land' });
    if (shopHere(g)) { const p = shopPrice(place); out.push({ label: `가게 자리를 사서 세놓는다 (은화 ${p}닢, 달마다 은화 ${Math.round(p * RENT_KINDS.shop.rate)}닢쯤)`, key: 'buy_shop' }); }
    for (const r of E(g).rentals.filter((x) => x.place === place && x.kind !== 'house').slice(0, 2)) {
      if (r.cond < 70) out.push({ label: `${J(RENT_KINDS[r.kind].name, '을/를')} 손본다 (은화 ${fixRentalCost(r)}닢)`, key: `fix:${r.id}` });
      out.push({ label: `${J(RENT_KINDS[r.kind].name, '을/를')} 판다 (은화 ${rentalWorth(r)}닢)`, key: `sellr:${r.id}` });
    }
    out.push({ label: '그대로 둔다', key: 'none' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const place = here(g);
    const e = E(g);
    const h = homeOf(g, place);
    const life = L(g);
    if (key === 'none') return '장부를 덮었다. 지금은 이대로가 좋다.';
    if (key === 'buy_land' || key === 'buy_shop') {
      const kind = key === 'buy_land' ? 'land' : 'shop';
      const price = kind === 'land' ? RENT_KINDS.land.price : shopPrice(place);
      if (!spend(g, price)) return '돈이 모자랐다. 땅 주인은 다음에 오라고 했다.';
      const rent = kind === 'land' ? RENT_KINDS.land.rent : Math.round(price * RENT_KINDS.shop.rate);
      e.rentals.push({ id: e.seq++, kind, place, tenant: rng.chance(0.6) ? pickTenant(g, rng) : null, rent, cond: 75, unpaid: 0, value: price });
      note(g, `${placeName(place)}에 ${J(RENT_KINDS[kind].name, '을/를')} 샀다.`);
      return kind === 'land' ? '마을 어귀의 밭 한 뙈기를 샀다. 소작인이 모자를 벗고 고개를 숙였다. 가을마다 세를 바치겠다고 했다.' : '큰길가의 가게 자리를 샀다. 문 위에 "세놓음" 판자를 걸었다.';
    }
    if (key.startsWith('fix:') || key.startsWith('sellr:')) {
      const r = e.rentals.find((x) => x.id === Number(key.split(':')[1]));
      if (!r) return '그 땅은 이미 내 것이 아니었다.';
      if (key.startsWith('fix:')) {
        const c = fixRentalCost(r);
        if (!spend(g, c)) return '손볼 돈이 모자랐다.';
        r.cond = 95;
        return `은화 ${c}닢을 들여 손봤다. 세입자가 고맙다고 했다.`;
      }
      const v = rentalWorth(r);
      g.player.money += v;
      e.rentals.splice(e.rentals.indexOf(r), 1);
      return `${J(RENT_KINDS[r.kind].name, '을/를')} 은화 ${v}닢에 넘겼다.`;
    }
    if (!h) return '이 고장에는 내 집이 없었다.';
    if (key === 'repair') {
      const c = repairCost(g, place);
      if (!spend(g, c)) return '고칠 돈이 모자랐다.';
      h.cond = 100;
      return `목수와 미장이를 불러 지붕을 새로 이고 벽을 발랐다. 은화 ${c}닢이 들었다. 집이 다시 반듯해졌다.`;
    }
    if (key === 'grow') {
      const c = growCost(g, place);
      if (!c || !spend(g, c)) return '넓힐 돈이 모자랐다.';
      h.level += 1;
      if (h.level === 2) chron(g, `${g.player.name}, ${placeName(place)}에 저택을 짓다.`, 40);
      note(g, `${placeName(place)}의 집을 ${HOME_LEVELS[h.level]}으로 넓혔다.`);
      return h.level === 2 ? `옆집 두 채를 사들여 허물고 저택을 올렸다. 은화 ${c}닢. 대문 위에 집안 문장을 새겼다. 이웃들이 나를 다르게 부르기 시작했다.` : `방을 들이고 마당을 넓혔다. 은화 ${c}닢. 손님을 들일 만한 집이 되었다.`;
    }
    if (key === 'hire') {
      if (h.servants >= MAX_SERVANTS[h.level]) return '집이 좁아 더 들일 수 없었다.';
      h.servants += 1;
      return rng.pick(['조용한 중년 여인을 하녀로 들였다. 첫날부터 부엌이 달라졌다.', '고아 소년 하나를 심부름꾼으로 들였다. 먹는 것만큼 일한다.', '은퇴한 병사를 문지기 겸 머슴으로 들였다. 밤에 문단속이 든든하다.', '요리를 잘한다는 처녀를 들였다. 저녁상이 달라졌다.']);
    }
    if (key === 'fire') { if (h.servants > 0) h.servants -= 1; stress(g, 2); return '하인 하나에게 한 달 치 삯을 더 얹어 주고 내보냈다. 문간에서 한참 머뭇거리다 떠났다.'; }
    if (key === 'rent_house') {
      if (rentedOut(g, place)) return '이미 세를 놓았다.';
      e.rentals.push({ id: e.seq++, kind: 'house', place, tenant: rng.chance(0.7) ? pickTenant(g, rng) : null, rent: houseRent(g, place), cond: h.cond, unpaid: 0 });
      if (life.home === 'own') life.home = 'inn';
      return `집을 세놓았다. 나는 여관으로 짐을 옮겼다. 달마다 은화 ${houseRent(g, place)}닢쯤 들어올 것이다.`;
    }
    if (key === 'unrent_house') {
      const r = e.rentals.find((x) => x.kind === 'house' && x.place === place);
      if (r) e.rentals.splice(e.rentals.indexOf(r), 1);
      life.home = 'own';
      return r?.tenant ? `세입자 ${r.tenant}에게 석 달 말미를 주고 집을 비우게 했다. 내 집으로 돌아왔다.` : '빈 집으로 돌아왔다. 내 집이다.';
    }
    if (key === 'sell_house') {
      const v = homeWorth(g, place);
      g.player.money += v;
      sellHome(g, place);
      note(g, `${placeName(place)}의 집을 팔았다.`);
      return `${placeName(place)}의 집을 은화 ${v}닢에 넘겼다. 마지막으로 문을 잠그고 열쇠를 건넸다.`;
    }
    return '장부를 덮었다.';
  },
});
export function sellHome(g, place) {
  const life = L(g);
  const e = E(g);
  life.houses = life.houses.filter((p) => p !== place);
  delete e.homes[place];
  e.rentals = e.rentals.filter((r) => !(r.kind === 'house' && r.place === place));
  if (life.place === place && life.home === 'own') life.home = 'inn';
}
const fixRentalCost = (r) => Math.max(5, Math.round((100 - r.cond) / 100 * (r.kind === 'land' ? 60 : (r.value ?? 200) * 0.3)));
export const condWord = (c) => (c >= 85 ? '반듯하다' : c >= 60 ? '쓸 만하다' : c >= 35 ? '여기저기 낡았다' : c >= 15 ? '비가 샌다' : '무너지기 직전이다');

/* ---------- 불과 도둑 ---------- */
// 달마다 집마다 작은 확률. 낡고 하인이 없으면 불이 잘 나고, 돈이 많고 지키는 사람이 없으면 도둑이 든다.
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const life = L(g);
  const winter = [12, 1, 2].includes(g.date.month);
  for (const place of life.houses.slice()) {
    const h = homeOf(g, place);
    if (!h) continue;
    const fireP = 0.003 + (winter ? 0.003 : 0) + (h.cond < 30 ? 0.004 : 0) - h.servants * 0.0008;
    if (rng.chance(Math.max(0.001, fireP))) {
      const saved = h.servants > 0 || (life.place === place && !life.travel && rng.chance(0.5));
      const loss = saved ? rng.int(20, 40) : rng.int(55, 100);
      h.cond = Math.max(0, h.cond - loss);
      stress(g, 12);
      if (h.cond <= 0) {
        sellHome(g, place);
        note(g, `${placeName(place)}의 집이 불에 타 무너졌다. 잿더미에서 건진 것은 거의 없었다.`);
        chron(g, `${g.player.name}의 ${placeName(place)} 집, 불에 타다.`, 30);
      } else note(g, `${placeName(place)}의 집에 불이 났다. ${saved ? '하인들이 물동이를 날라 겨우 껐다.' : '이웃들이 끄기는 했지만 반이 탔다.'}`);
    }
  }
  // 도둑: 내 집에서 지내는데 돈이 많으면
  const atHome = life.home === 'own' && !life.travel;
  const h = atHome ? homeOf(g, life.place) : null;
  if (h && g.player.money > 250) {
    const thiefP = 0.012 - h.servants * 0.004 - h.level * 0.002;
    if (rng.chance(Math.max(0.001, thiefP))) {
      const took = Math.round((g.player.money - 100) * rng.float(0.15, 0.35));
      g.player.money -= took;
      stress(g, 10);
      note(g, `밤사이 ${placeName(life.place)}의 집에 도둑이 들었다. 궤짝 자물쇠가 뜯겨 있었다. 은화 ${took}닢을 잃었다.`);
    }
  }
});
