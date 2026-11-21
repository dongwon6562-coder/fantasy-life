// 약초 찾기, 약 달이기와 새 처방 궁리, 식구에게 내 약 먹이기, 약방 열기와 살림, 매달 셈(약방 손님·돌림병 약값·약초 마름·이름난 처방), 대 잇기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill } from '../game.js';
import { byId } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, isAdult } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { HS, KINDS as SICKNESS } from '../health/state.js';
import { outbreaksIn } from '../health/world.js';
import { closeKin } from '../health/life.js';
import { PLACES } from '../places.js';
import { J } from '../narrative/text.js';
import {
  AP, shop, atShop, knowsRx, herbCount, satchelCount, canBrew, namedOf, rxPower, logApo, newShop, shopCost, remedyName,
  mi, clamp, here, placeName, free, stat, herbSkill, ownRng, shopTown, HERBS, HERB_IDS, herbsHere, RECIPES, RECIPE_IDS, START_RECIPES,
} from './core.js';

const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const learn = (g, b) => { const k = gainSkill(g, 'herbs', b, 'sen'); return k > 0.04 ? ` (약초 +${k.toFixed(1)})` : ''; };
const busy = (g) => !!g.army?.service || !!g.troupe?.t || !!g.poor?.bond;
const add = (o, k, n) => { o[k] = Math.min(99, (o[k] ?? 0) + n); if (o[k] <= 0) delete o[k]; };
const doses = (g, id) => (AP(g).satchel[id] ?? 0) + (atShop(g) ? shop(g).stock[id] ?? 0 : 0);
const useDose = (g, id) => { const s = AP(g); if (s.satchel[id]) add(s.satchel, id, -1); else if (atShop(g) && shop(g).stock[id]) add(shop(g).stock, id, -1); };
export const PRICE_MUL = { cheap: 0.7, fair: 1, dear: 1.5 };
const PRICE_WORD = { cheap: '싸게', fair: '제값에', dear: '비싸게' };

/* ---------- 약초 찾기 ---------- */
// 숲에서 아무 풀이나 캐 파는 일(herbs)과 달리, 고장과 철에 맞는 약초를 골라 말려 둔다. 솜씨가 붙은 사람에게만 보인다.
const canGather = (g) => playerAge(g) >= 12 && free(g) && !busy(g) && herbSkill(g) >= 15 && herbsHere(g).length > 0 && herbCount(g) < 60;
ACTIONS.push({
  id: 'apo_gather',
  name: '약초를 골라 캐 말린다',
  icon: 'wander',
  desc: '이 고장, 이 철에만 나는 약초를 찾아 캐고 그늘에 말려 둔다. 말린 약초로 약을 달인다. 고장과 철마다 나는 풀이 다르다.',
  available: canGather,
  run(g, rng) {
    const s = AP(g), here0 = herbsHere(g);
    const first = !Object.keys(s.book).length;
    if (first) for (const id of START_RECIPES) s.book[id] = 1;
    const kinds = here0.map((id) => [rng.float(0, 1), id]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const pickN = Math.min(kinds.length, 1 + (herbSkill(g) >= 40 ? 2 : 1));
    const got = [];
    for (const id of kinds.slice(0, pickN)) { const n = Math.max(1, Math.round(rng.int(1, 3) * (0.7 + herbSkill(g) / 100))); add(s.herbs, id, n); got.push(`${HERBS[id].name} ${n}줌`); s.gathered += n; }
    tired(g, 12);
    let extra = '';
    if (rng.chance(0.05)) { g.player.injuries.push({ name: '벌레 물린 팔', months: 1 }); extra = ' 덤불 속에서 무언가에 팔을 물렸다. 퉁퉁 부었다.'; }
    const k = learn(g, 1.3);
    const id0 = kinds[0];
    return `${HERBS[id0].line} ${got.join(', ')}을 캐서 그늘에 매달았다.${first ? ' 늙은 약초꾼들에게 어깨너머로 배운 처방 둘(열내림 달임, 상처 고약)을 이제 내 손으로 지을 수 있다.' : ''}${extra}${k}`;
  },
});

/* ---------- 약 달이기와 궁리 ---------- */
const unknownRx = (g) => RECIPE_IDS.filter((id) => !knowsRx(g, id) && herbSkill(g) >= RECIPES[id].skill);
const canTry = (g) => herbSkill(g) >= 25 && herbCount(g) >= 3 && unknownRx(g).length > 0;
const canBrewAny = (g) => free(g) && isAdult(g) && (RECIPE_IDS.some((id) => canBrew(g, id)) || canTry(g));
ACTIONS.push({
  id: 'apo_brew',
  name: '약을 달인다',
  icon: 'scroll',
  desc: '말린 약초로 아는 처방의 약을 달이거나, 새 처방을 궁리한다. 달인 약은 약 보따리나 약방 선반에 둔다.',
  available: canBrewAny,
  run(g) {
    if (!sceneQueued(g, 'apo_brew')) queueScene(g, 'apo_brew', {}, { first: true });
    return '약탕관에 물을 붓고 불을 지폈다.';
  },
});
defineScene('apo_brew', {
  need: (g) => canBrewAny(g),
  title: () => '약탕관 앞에서',
  text: (g) => {
    const s = AP(g);
    const hs = HERB_IDS.filter((id) => s.herbs[id]).map((id) => `${HERBS[id].name} ${s.herbs[id]}`).join(', ') || '없음';
    const book = RECIPE_IDS.filter((id) => s.book[id]).map((id) => remedyName(id, namedOf(g, id))).join(', ') || '없음';
    return `말린 약초: ${hs}. 아는 처방: ${book}. 약 보따리에 ${satchelCount(g)}첩${atShop(g) ? `, 약방 선반에 ${RECIPE_IDS.reduce((a, id) => a + (shop(g).stock[id] ?? 0), 0)}첩` : ''}이 있다.`;
  },
  choices: (g) => [
    ...RECIPE_IDS.filter((id) => canBrew(g, id)).slice(0, 6).map((id) => ({ label: `${J(remedyName(id, namedOf(g, id)), '을/를')} 달인다 (${Object.entries(RECIPES[id].need).map(([h, n]) => `${HERBS[h].name} ${n}`).join(', ')})`, key: `brew:${id}` })),
    ...(canTry(g) ? [{ label: '남은 약초로 새 처방을 궁리한다', key: 'try' }] : []),
    { label: '불을 끈다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const st = AP(g);
    if (key === 'no') return '약탕관을 내려놓았다. 오늘은 손이 서지 않는다.';
    if (key === 'try') {
      if (!canTry(g)) return '궁리할 약초가 모자랐다.';
      const ids = HERB_IDS.filter((id) => st.herbs[id]).sort((a, b) => (st.herbs[b] ?? 0) - (st.herbs[a] ?? 0));
      let used = 0; for (const id of ids) { while (st.herbs[id] && used < 3) { add(st.herbs, id, -1); used++; } }
      tired(g, 10);
      const pool = unknownRx(g).filter((id) => Object.keys(RECIPES[id].need).some((h) => ids.includes(h)));
      const hit = pool.length && rng.chance(0.35 + herbSkill(g) / 200) ? rng.pick(pool) : null;
      const k = learn(g, 1.2);
      if (hit) { st.book[hit] = 1; logApo(g, `새 처방을 얻었다: ${RECIPES[hit].name}.`); return `밤새 달이고 맛보고 버리기를 되풀이했다. 새벽녘에 하나가 맞아떨어졌다. ${J(RECIPES[hit].name, '이/가')} 내 처방 장부에 올랐다. ${RECIPES[hit].line}${k}`; }
      if (ids.some((h) => ['nightshade', 'poppy'].includes(h)) && rng.chance(0.3)) { stress(g, 8); g.player.fatigue = Math.min(100, g.player.fatigue + 20); return `맛을 보다 혀가 저려 왔다. 반나절을 토하고 누워 있었다. 약과 독은 한 끗 차이다.${k}`; }
      return `약초 세 줌을 버렸다. 쓴 것과 더 쓴 것만 남았다. 그래도 무엇이 안 되는지는 알았다.${k}`;
    }
    const id = key.slice(5);
    if (!RECIPES[id] || !canBrew(g, id)) return '약초가 모자라 처방대로 달일 수 없었다.';
    for (const [h, n] of Object.entries(RECIPES[id].need)) add(st.herbs, h, -n);
    const n = 2 + (herbSkill(g) >= 50 ? 1 : 0) + (herbSkill(g) >= 80 ? 1 : 0);
    if (atShop(g)) add(shop(g).stock, id, n); else add(st.satchel, id, n);
    st.brewed += n; st.book[id] = (st.book[id] ?? 1) + 1;
    tired(g, 8);
    const k = learn(g, 0.9);
    let named = '';
    // 이름난 처방: 같은 처방을 오래, 잘 지으면 사람들이 내 이름을 붙여 부른다
    if (!namedOf(g, id) && st.book[id] >= 12 && herbSkill(g) >= 50 && !RECIPES[id].poison) {
      st.named.push({ id, by: g.player.name, gen: 1, fame: 10, since: g.date.year });
      const nm = `${g.player.name}네 ${RECIPES[id].name}`;
      named = ` 사람들이 이 약에 내 이름을 붙였다: '${nm}'.`;
      logApo(g, `'${nm}'. 내 처방에 이름이 붙었다.`);
      chron(g, `'${nm}'. ${placeName(here(g))}에서 이름을 얻은 약이다. 먼 마을에서도 그 약을 찾으러 온다.`, 25);
    }
    return `${RECIPES[id].line} ${J(remedyName(id, namedOf(g, id)), '이/가')} ${n}첩 나왔다. ${atShop(g) ? '약방 선반에 올렸다.' : '약 보따리에 넣었다.'}${named}${k}`;
  },
});

/* ---------- 식구에게 내 약 먹이기 ---------- */
// 앓는 나나 식구가 있고, 그 병에 듣는 약이 손에 있을 때만 보인다
function doseTarget(g) {
  const kin = new Set(closeKin(g).map((p) => p.id));
  for (const s of HS(g).sick) {
    if (s.treat || !(s.who === 'me' || kin.has(s.who))) continue;
    const rx = RECIPE_IDS.filter((id) => doses(g, id) > 0 && rxPower(g, id, s.kind) > 0).sort((a, b) => rxPower(g, b, s.kind) - rxPower(g, a, s.kind))[0];
    if (rx) return { s, rx };
  }
  return null;
}
ACTIONS.push({
  id: 'apo_dose',
  name: '앓는 식구에게 내 약을 먹인다',
  icon: 'heart',
  desc: '내가 달인 약을 앓는 나나 식구에게 먹인다. 병에 맞는 약이어야 듣는다.',
  available: (g) => free(g) && playerAge(g) >= 12 && !!doseTarget(g),
  run(g) {
    const t = doseTarget(g);
    if (!t) return '먹일 약이 없었다.';
    const power = rxPower(g, t.rx, t.s.kind);
    useDose(g, t.rx);
    t.s.treat = { by: 'self_herbs', power, left: 3 };
    AP(g).cured += 1;
    const who = t.s.who === 'me' ? '나' : byId(g, t.s.who)?.name ?? '식구';
    tired(g, 3);
    return `${t.s.who === 'me' ? '떨리는 손으로 내가 달인' : `${J(who, '을/를')} 일으켜 앉히고 내가 달인`} ${J(remedyName(t.rx, namedOf(g, t.rx)), '을/를')} ${t.s.who === 'me' ? '삼켰다' : '떠먹였다'}. ${SICKNESS[t.s.kind].name}에 ${power >= 0.5 ? '잘 듣는 약이다. 사흘이면 열이 꺾일 것이다.' : '조금은 듣는 약이다. 나머지는 몸이 이겨야 한다.'}`;
  },
});

/* ---------- 약방 ---------- */
const canOpen = (g) => !shop(g) && isAdult(g) && free(g) && !busy(g) && herbSkill(g) >= 30 && shopTown(here(g)) && g.player.money >= shopCost(here(g)) && AP(g).brewed > 0;
const canShop = (g) => canOpen(g) || (atShop(g) && free(g));
ACTIONS.push({
  id: 'apo_shop',
  name: '약방 일을 본다',
  icon: 'home',
  desc: '내 약방을 열거나, 열린 약방의 선반을 채우고 값을 매긴다. 약방은 내가 그 고장에 있을 때 손님이 많다.',
  available: canShop,
  run(g) {
    if (!sceneQueued(g, 'apo_shop')) queueScene(g, 'apo_shop', {}, { first: true });
    return shop(g) ? '약방 문을 열고 선반의 먼지를 털었다.' : '빈 가게 자리를 보러 다녔다.';
  },
});
defineScene('apo_shop', {
  need: (g) => canShop(g),
  title: (g) => (shop(g) ? shop(g).name : `${placeName(here(g))}에 약방을`),
  text: (g) => {
    const p = shop(g);
    if (!p) return `골목 안쪽 빈 가게 자리를 은화 ${shopCost(here(g))}닢에 얻을 수 있다. 선반과 절구와 약탕관을 들이면 약방이 된다.`;
    const st = RECIPE_IDS.filter((id) => p.stock[id]).map((id) => `${remedyName(id, namedOf(g, id))} ${p.stock[id]}첩`).join(', ') || '비었다';
    const ob = outbreaksIn(g, here(g));
    return `선반: ${st}. 약값은 ${PRICE_WORD[p.price]} 받는다${p.cut ? ', 그리고 약에 분필 가루를 섞는다' : ''}. 지난달 번 돈은 은화 ${p.last}닢. 이름은 ${Math.round(p.fame)}.${ob.length ? ` 지금 이 고장에 ${J(SICKNESS[ob[0].kind].name, '이/가')} 돈다. 약을 찾는 사람이 줄을 선다.` : ''}`;
  },
  choices: (g) => {
    const p = shop(g), out = [];
    if (!p) return [{ label: `약방을 연다 (은화 ${shopCost(here(g))}닢)`, key: 'open' }, { label: '아직 이르다', key: 'no' }];
    if (satchelCount(g)) out.push({ label: `약 보따리의 ${satchelCount(g)}첩을 선반에 올린다`, key: 'stock' });
    for (const k of ['cheap', 'fair', 'dear']) if (p.price !== k) out.push({ label: `약값을 ${PRICE_WORD[k]} 받는다`, key: `price:${k}` });
    out.push(p.cut ? { label: '분필 섞기를 그만둔다', key: 'uncut' } : { label: '약에 분필 가루를 섞어 늘린다', key: 'cut' });
    out.push({ label: '약방 문을 닫는다', key: 'close' });
    out.push({ label: '선반을 둘러보기만 한다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const st = AP(g), p = shop(g);
    if (key === 'no') return p ? '약단지 뚜껑을 하나씩 열어 냄새를 맡아 보았다. 다 제 냄새다.' : '가게 자리를 한 번 더 돌아보고 돌아왔다.';
    if (key === 'open') {
      if (!canOpen(g) || pay(g, shopCost(here(g))) <= 0) return '그 사이 형편이 달라져 약방을 열 수 없었다.';
      st.shop = newShop(g, rng);
      for (const id of RECIPE_IDS) if (st.satchel[id]) { add(st.shop.stock, id, st.satchel[id]); delete st.satchel[id]; }
      logApo(g, `${placeName(here(g))}에 ${J(st.shop.name, '을/를')} 열었다.`);
      note(g, `${placeName(here(g))}에 약방을 열었다.`);
      return `문 위에 절구 그림 간판을 걸었다. ${J(st.shop.name, '이/가')} 문을 열었다. 첫 손님은 손가락을 벤 대장장이 견습이었다.`;
    }
    if (!p) return '약방이 없다.';
    if (key === 'stock') { let n = 0; for (const id of RECIPE_IDS) if (st.satchel[id]) { n += st.satchel[id]; add(p.stock, id, st.satchel[id]); delete st.satchel[id]; } return `약 ${n}첩을 이름표를 붙여 선반에 올렸다.`; }
    if (key.startsWith('price:')) { const k = key.slice(6); if (!PRICE_MUL[k]) return '값을 그대로 두었다.'; p.price = k; return { cheap: '약값을 낮췄다. 가난한 집 아낙들이 문 앞에서 서성이다 들어오기 시작했다.', fair: '약값을 제값으로 돌렸다.', dear: '약값을 올렸다. 귀족 집 하인들은 값을 묻지 않는다. 다른 사람들은 묻고 돌아간다.' }[k]; }
    if (key === 'cut') { p.cut = true; deed(g, 'honest', -2, '약에 분필을 섞어 판다'); return '약 한 첩에 분필 가루를 반 숟갈씩 섞었다. 겉으로는 아무도 모른다. 아직은.'; }
    if (key === 'uncut') { p.cut = false; return '분필 단지를 뒷마당에 묻었다. 다시는 꺼내지 않을 생각이다.'; }
    if (key === 'close') {
      for (const id of RECIPE_IDS) if (p.stock[id]) { add(st.satchel, id, p.stock[id]); }
      st.past.unshift({ year: g.date.year, place: p.place, name: p.name, how: '문을 닫았다' }); if (st.past.length > 6) st.past.length = 6;
      st.shop = null; logApo(g, `${J(p.name, '을/를')} 닫았다.`);
      return `간판을 내렸다. 남은 약은 보따리에 쌌다. 골목 아이들이 빈 가게 창에 코를 대고 들여다보았다.`;
    }
    return '아무 일도 없었다.';
  },
});

/* ---------- 매달 셈 ---------- */
// 약방 손님: 고장 크기, 이름, 값, 돌림병. 돌림병 때는 그 병에 듣는 약이 먼저, 비싸게 나간다.
export function shopMonth(g, rng) {
  const st = AP(g), p = st.shop;
  if (!p) return 0;
  const present = atShop(g);
  const ob = outbreaksIn(g, p.place);
  const town = Math.max(1, Math.round((PLACES[p.place]?.house ?? 200) / 100));
  let want = Math.round(town * (0.6 + p.fame / 80) * (p.price === 'cheap' ? 1.4 : p.price === 'dear' ? 0.6 : 1) * (ob.length ? 2 : 1) * (present ? 1 : 0.4));
  let money = 0, sold = 0, helped = 0;
  const order = RECIPE_IDS.filter((id) => p.stock[id] && !RECIPES[id].poison).sort((a, b) => (ob.length ? (RECIPES[b].cures[ob[0].kind] ?? 0) - (RECIPES[a].cures[ob[0].kind] ?? 0) : RECIPES[b].price - RECIPES[a].price));
  for (const id of order) {
    while (want > 0 && p.stock[id]) {
      const plague = ob.length && RECIPES[id].cures[ob[0].kind] ? 2 : 1;
      money += RECIPES[id].price * PRICE_MUL[p.price] * plague * (p.cut ? 1.3 : 1);
      add(p.stock, id, -1); want--; sold++;
      if (ob.length && RECIPES[id].cures[ob[0].kind]) helped++;
    }
  }
  money = Math.round(money);
  g.player.money += money; st.sold += sold; p.last = money;
  p.fame = clamp(p.fame + sold * (p.cut ? -0.4 : 0.35) + (p.price === 'cheap' ? 0.3 : p.price === 'dear' ? -0.3 : 0) - (sold ? 0 : 0.5), 0, 100);
  if (p.cut && sold && rng.chance(0.15)) st.harmed += 1;
  if (helped >= 3 && p.price !== 'dear') deed(g, 'kind', 2, `${p.name}에서 돌림병 약을 내주었다`, p.place);
  for (const n of st.named) if (p.stock[n.id] != null || sold) n.fame = clamp(n.fame + 0.2, 0, 100);
  return money;
}
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const st = AP(g), now = mi(g), rng = ownRng(g, 1);
  if (st.shop) shopMonth(g, rng);
  // 말린 약초도 오래 두면 약효가 빠진다
  if (g.date.month === 6) for (const id of Object.keys(st.herbs)) add(st.herbs, id, -Math.ceil(st.herbs[id] * 0.2));
  if (!free(g) || now - st.eventAt < 4 || sceneQueued(g, 'apo_event') || !rng.chance(0.3)) return;
  const evs = eligible(g);
  if (!evs.length) return;
  st.eventAt = now;
  queueScene(g, 'apo_event', { ev: rng.pick(evs) });
});
export function eligible(g) {
  const st = AP(g), out = [];
  if (atShop(g)) {
    out.push('priest', 'quack');
    if (['harfen', 'verden', 'leocast', 'solaris', 'graubel', 'barka', 'portel', 'serenia', 'eisen', 'hammer', 'silverleaf'].includes(here(g))) out.push('doctor');
    if (outbreaksIn(g, here(g)).length && RECIPE_IDS.some((id) => shop(g).stock[id])) out.push('plague');
    if (shop(g).cut || st.harmed > 0) out.push('harmed');
    if (herbSkill(g) >= 35) out.push('poison');
  }
  if (herbSkill(g) >= 25 && free(g)) out.push('rare');
  return out;
}

/* ---------- 대 잇기: 처방 장부와 이름난 처방은 집안에 남는다 ---------- */
HOOKS.heir.push((g) => {
  const st = AP(g);
  for (const n of st.named) n.gen += 1;
  if (st.shop) { st.shop.gens += 1; st.shop.cut = false; logApo(g, `${J(st.shop.name, '이/가')} ${g.player.name}에게 넘어왔다.`); }
  const known = RECIPE_IDS.filter((id) => st.book[id]);
  if (known.length) logApo(g, `집안의 처방 장부(${known.length}가지)가 ${g.player.name}에게 넘어왔다.`);
  for (const id of known) st.book[id] = 1;
  st.doctor = null;
});
