// 고장 맛 익히기, 높은 집 부엌에 들기와 부엌 일, 부엌 살림(서열·시식관·가르치기), 내 요리 짓기, 요리 내놓기,
// 요리 겨루기, 연회 맡기, 매달 셈(자리 비움·시식관 품삯·요리의 이름·세상의 요리사), 대 잇기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill } from '../game.js';
import { leaveJob, PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, isAdult } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { courtState, disgraced } from '../court/index.js';
import { liveHouses, houseName } from '../history/nobles.js';
import { renown } from '../contest/core.js';
import { atInn, myInn } from '../inn/core.js';
import { J } from '../narrative/text.js';
import {
  CU, mi, clamp, here, placeName, free, stat, cookSkill, ownRng, bigTown, TASTE, tasteOf, BASES, BASE_IDS, POSTS, COURT, postTitle,
  palateCount, knows, atPost, famous, cookPower, dishName, fullDish, dj, addFame, logCook, newDish, bestDish, leavePost, chefName, rivalName, tasterName,
} from './core.js';

const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const learn = (g, base) => { const k = gainSkill(g, 'cooking', base, 'sen'); return k > 0.04 ? ` (요리 +${k.toFixed(1)})` : ''; };
const busy = (g) => !!g.army?.service || !!g.troupe?.t || !!g.poor?.bond;
const seatHouse = (g, pl = here(g)) => { try { return liveHouses(g).find((h) => h.seat === pl) ?? null; } catch { return null; } };
const canManor = (g) => !!seatHouse(g) || bigTown(here(g));
const canCourt = (g) => here(g) === COURT && cookSkill(g) >= POSTS.court.need[0] && (CU(g).fame >= 20 || CU(g).chief) && !disgraced(g);
const postFavor = (g, n) => { const p = CU(g).post; if (p) p.favor = clamp(p.favor + n, 0, 100); };
const courtUp = (g, n) => { if (CU(g).post?.kind !== 'court') return; const c = courtState(g); c.standing = clamp(c.standing + n, 0, 100); };
export const lordOf = (g) => CU(g).post?.lord ?? '영주';
const TITLES = ['늙은 왕의 저녁', '첫눈 내리는 밤', '어머니의 솥', '붉은 강', '돌아온 사냥꾼', '과부의 위로', '기사의 아침', '여름 끝의 식탁', '잿빛 들판', '왕녀의 미소'];

/* ---------- 고장의 맛 익히기 ---------- */
const canTaste = (g) => playerAge(g) >= 12 && free(g) && !!tasteOf(here(g)) && (!knows(g, here(g)) || mi(g) - CU(g).palate[here(g)] >= 12);
ACTIONS.push({
  id: 'cuisine_taste',
  name: '이 고장 음식을 맛보러 다닌다',
  icon: 'coin',
  desc: '장터와 주점과 뒷골목 부엌을 돌며 이 고장 사람들이 무엇을 어떻게 먹는지 혀로 배운다. 맛을 아는 고장이 늘수록 내 요리가 넓어진다.',
  available: canTaste,
  run(g) {
    const s = CU(g), pl = here(g), t = tasteOf(pl), first = !knows(g, pl);
    const cost = pay(g, bigTown(pl) ? 5 : 2);
    s.palate[pl] = mi(g);
    tired(g, 6);
    const k = learn(g, first ? 1.4 : 0.6);
    if (first) logCook(g, `${placeName(pl)}의 맛을 익혔다: ${t.ing}.`);
    return first
      ? `${t.line} ${J(t.taste, '이/가')} 혀에 남았다. 이제 ${J(t.ing, '을/를')} 어떻게 다뤄야 할지 안다.${cost ? ` 은화 ${cost}닢을 썼다.` : ''}${k}`
      : `한 해 만에 다시 ${placeName(pl)}의 부엌들을 돌았다. 같은 요리도 손이 바뀌니 맛이 달랐다.${cost ? ` 은화 ${cost}닢.` : ''}${k}`;
  },
});

/* ---------- 높은 집 부엌에 들기 ---------- */
const canSeek = (g) => isAdult(g) && free(g) && !busy(g) && !CU(g).post && cookSkill(g) >= POSTS.manor.need[0] && (canManor(g) || canCourt(g));
ACTIONS.push({
  id: 'cuisine_kitchen',
  name: '높은 집 부엌을 찾아간다',
  icon: 'home',
  desc: '영주의 저택이나 궁정의 부엌에 들어간다. 바닥 닦는 견습부터 시작해 부주방장, 주방장까지 오를 수 있다. 여관 부엌과는 다른 세계다.',
  available: canSeek,
  run(g) {
    if (!sceneQueued(g, 'cuisine_kitchen')) queueScene(g, 'cuisine_kitchen', {}, { first: true });
    return '뒷문으로 돌아 부엌 쪽 문을 두드렸다.';
  },
});
defineScene('cuisine_kitchen', {
  need: (g) => canSeek(g),
  title: () => '높은 집 부엌',
  text: (g) => {
    const h = seatHouse(g);
    const bits = [];
    if (canManor(g)) bits.push(`${h ? `${houseName(h)}의 저택` : `${placeName(here(g))} 영주의 저택`} 부엌은 여관 부엌 열 개를 합친 것보다 넓다. 솥이 스무 개, 일꾼이 서른이다.`);
    if (canCourt(g)) bits.push('궁정 부엌의 문지기는 내 이름을 듣고 잠시 생각하더니 문을 열어 주었다. 안에서는 아무도 큰 소리를 내지 않는다.');
    return `${bits.join(' ')} 견습은 새벽 넷째 종에 일어나 불을 지피고, 주방장의 칼에 손대지 않는다.`;
  },
  choices: (g) => {
    const out = [];
    if (canManor(g)) out.push({ label: '영주 저택 부엌에 견습으로 든다', key: 'manor' });
    if (canCourt(g)) out.push({ label: CU(g).chief ? '궁정 부엌에 부주방장으로 든다' : '궁정 부엌에 견습으로 든다', key: 'court' });
    out.push({ label: '내 솥이 더 편하다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '문 앞에서 돌아섰다. 남의 부엌에서 남의 맛을 낼 생각은 아직 없다.';
    const st = CU(g), h = seatHouse(g);
    if (L(g).job) leaveJob(g, '높은 집 부엌에 들면서 하던 일을 그만두었다.');
    const kind = key === 'court' ? 'court' : 'manor';
    st.post = { kind, place: here(g), rank: kind === 'court' && st.chief ? 1 : 0, favor: 10, months: 0, since: mi(g), away: 0, lord: kind === 'court' ? '국왕' : h ? houseName(h) : `${placeName(here(g))} 영주` };
    logCook(g, `${placeName(here(g))} ${POSTS[kind].name}에 ${J(postTitle(st.post), '으로/로')} 들었다.`);
    note(g, `${placeName(here(g))} ${POSTS[kind].name}에 들었다.`);
    return kind === 'court'
      ? '궁정 주방장이 내 손을 뒤집어 보더니 손톱 밑을 살폈다. "여기서는 실수 한 번이 목 하나다. 왕의 접시에 머리카락 한 올이 들어가도 그렇다." 내일 새벽부터 나오라고 했다.'
      : `주방장이 양파 한 자루를 던져 주었다. "해 지기 전까지. 고르게." 그렇게 ${lordOf(g)}의 부엌 사람이 되었다.`;
  },
});

/* ---------- 부엌 일 ---------- */
const canWork = (g) => atPost(g) && free(g) && !busy(g);
ACTIONS.push({
  id: 'cuisine_cook',
  name: '높은 집 부엌에서 일한다',
  icon: 'home',
  desc: '맡은 자리에서 한 달 부엌일을 한다. 주방장의 눈에 들면 자리가 오른다. 부주방장부터는 내 요리를 상에 올릴 수 있다.',
  available: canWork,
  run(g, rng) {
    const st = CU(g), p = st.post, def = POSTS[p.kind];
    const wage = def.wage[p.rank];
    g.player.money += wage;
    st.worked += 1; p.workedAt = mi(g);
    postFavor(g, 3 + Math.round(stat(g, 'sen') / 30));
    tired(g, 12);
    const k = learn(g, 1.6 + p.rank * 0.3);
    let extra = '';
    const d = p.rank >= 1 ? bestDish(g) : null;
    if (d) { d.fame = clamp(d.fame + 1.5, 0, 100); d.served += 1; extra = ` ${fullDish(d)}도 한 접시 올렸다.`; }
    const lines = [
      ['새벽 불을 지피고 솥 스무 개를 닦았다. 손등이 갈라졌다.', '주방장이 맛을 보라고 국자를 내밀었다. 처음이다.', '양파 세 자루와 마늘 한 바구니. 눈물이 마를 날이 없다.', '고기 써는 걸 지켜보다 칼질 순서를 외웠다.'],
      ['견습 아이들에게 칼질을 가르치고 소스 셋을 맡았다.', '주방장이 자리를 비운 저녁, 상 하나를 혼자 차려 냈다.', '사냥에서 돌아온 영주 일행의 늦은 저녁을 맡았다. 접시가 깨끗하게 돌아왔다.'],
      ['메뉴를 짜고 장 볼 것을 적고 서른 명의 손을 부렸다.', '내 부엌이다. 불 하나 칼 하나까지 내가 정한다.', '손님 접시가 돌아올 때마다 무엇이 남았는지 본다. 남은 것이 곧 내 잘못이다.'],
    ][p.rank];
    return `${rng.pick(lines)}${extra} 품삯 은화 ${wage}닢.${k}`;
  },
});

/* ---------- 부엌 살림 ---------- */
const canManage = (g) => atPost(g) && free(g);
ACTIONS.push({
  id: 'cuisine_post',
  name: '부엌 살림을 챙긴다',
  icon: 'crown',
  desc: '자리를 올려 달라 청하거나, 시식관을 두거나, 견습을 가르치거나, 부엌을 떠난다.',
  available: canManage,
  run(g) {
    if (!sceneQueued(g, 'cuisine_post')) queueScene(g, 'cuisine_post', {}, { first: true });
    return '불이 잦아든 밤, 부엌 한구석에 앉아 장부를 펼쳤다.';
  },
});
const canRise = (g) => { const p = CU(g).post; return !!p && p.rank < 2 && p.favor >= 60 && cookSkill(g) >= POSTS[p.kind].need[p.rank + 1]; };
defineScene('cuisine_post', {
  need: (g) => canManage(g),
  title: (g) => `${postTitle(CU(g).post)}의 밤`,
  text: (g) => {
    const st = CU(g), p = st.post, def = POSTS[p.kind];
    const nxt = p.rank < 2 ? `다음 자리(${def.ranks[p.rank + 1]})에는 요리 ${def.need[p.rank + 1]}와 주방장의 믿음이 든다.` : '이 부엌에서 더 오를 곳은 없다.';
    return `${lordOf(g)}의 ${def.name}. 지금 ${postTitle(p)}, 부엌의 믿음은 ${Math.round(p.favor)}. ${nxt}${st.taster ? ` 시식관 ${J(st.taster.name, '이/가')} 곁에 있다.` : ''}`;
  },
  choices: (g) => {
    const st = CU(g), p = st.post, out = [];
    if (canRise(g)) out.push({ label: `${POSTS[p.kind].ranks[p.rank + 1]} 자리를 청한다`, key: 'rise' });
    if (!st.taster && (p.kind === 'court' || p.rank >= 1) && g.player.money >= 4) out.push({ label: '시식관을 둔다 (달마다 은화 2닢)', key: 'taster' });
    if (st.taster) out.push({ label: `시식관 ${J(st.taster.name, '을/를')} 내보낸다`, key: 'fire' });
    if (p.rank >= 1) out.push({ label: '견습 아이들을 붙잡고 가르친다', key: 'teach' });
    out.push({ label: '부엌을 떠난다', key: 'leave' });
    out.push({ label: '장부를 덮는다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const st = CU(g), p = st.post;
    if (key === 'rise') {
      if (!canRise(g)) return '청하려던 말을 삼켰다. 아직 때가 아니다.';
      p.rank += 1; p.favor = 25;
      if (p.rank === 2) st.chief = true;
      if (p.rank === 2) addFame(g, 8);
      logCook(g, `${J(postTitle(p), '이/가')} 되었다.`);
      courtUp(g, 4);
      if (p.rank === 2) chron(g, `${J(g.player.name, '이/가')} ${placeName(p.place)} ${POSTS[p.kind].name}의 주방장이 되었다.`, p.kind === 'court' ? 70 : 40);
      return p.rank === 2
        ? `늙은 주방장이 앞치마를 풀어 내게 건넸다. "이제 이 부엌의 맛은 네 혀가 정한다." ${J(postTitle(p), '이/가')} 되었다.`
        : `주방장이 고개를 끄덕였다. "소스 셋을 맡겨 보지." ${J(postTitle(p), '이/가')} 되었다. 이제 내 요리를 상에 올릴 수 있다.`;
    }
    if (key === 'taster') {
      if (st.taster || pay(g, 2) < 2) return '사람을 구하지 못했다.';
      st.taster = { name: tasterName(rng), months: 0, loyal: 50 };
      return `${J(st.taster.name, '이/가')} 시식관이 되었다. 상에 오르는 모든 접시를 먼저 한 숟갈씩 뜬다. 그가 쓰러지면 그건 내 잘못이 아니라는 증거가 된다. 그도 그걸 안다.`;
    }
    if (key === 'fire') {
      const n = st.taster?.name ?? '시식관'; st.taster = null;
      return `${J(n, '을/를')} 내보냈다. 그는 짐을 싸며 한 번도 뒤돌아보지 않았다.`;
    }
    if (key === 'teach') {
      postFavor(g, 4); tired(g, 6);
      deed(g, 'kind', 1, '부엌 아이들을 가르쳤다');
      const k = learn(g, 0.5);
      return `${rng.pick(['칼을 고르게 쓰라고 백 번 말했다. 백한 번째에 한 아이가 해냈다.', '간을 볼 때는 숟가락을 새로 쓰라고 가르쳤다. 내가 견습일 때 맞으며 배운 것이다.', '아이 하나가 소스를 태웠다. 혼내지 않고 다시 끓이는 법을 보여 주었다.'])} 부엌이 조금 조용해졌다.${k}`;
    }
    if (key === 'leave') {
      const lord = lordOf(g);
      leavePost(g, '스스로 앞치마를 벗었다.');
      return `${lord}의 부엌을 떠났다. 주방장이 문 앞까지 따라 나와 아무 말 없이 칼 한 자루를 쥐여 주었다.`;
    }
    return '장부를 덮고 불씨를 재로 덮었다.';
  },
});

/* ---------- 내 요리 짓기 ---------- */
const canCreate = (g) => isAdult(g) && free(g) && cookSkill(g) >= BASES.stew.need && palateCount(g) >= 1;
ACTIONS.push({
  id: 'cuisine_create',
  name: '내 요리를 궁리한다',
  icon: 'scroll',
  desc: '익힌 고장의 재료와 요리의 틀을 엮어 나만의 요리를 짓는다. 솜씨와 혀가 넓을수록 좋은 요리가 나온다. 이름난 요리는 대를 넘어 남는다.',
  available: canCreate,
  run(g) {
    if (!sceneQueued(g, 'cuisine_create')) queueScene(g, 'cuisine_create', {}, { first: true });
    return '빈 솥 앞에 앉아 지금껏 맛본 것들을 하나씩 떠올렸다.';
  },
});
const combos = (g) => {
  const st = CU(g), out = [];
  const places = Object.entries(st.palate).sort((a, b) => b[1] - a[1]).map(([pl]) => pl).slice(0, 4);
  const bases = BASE_IDS.filter((b) => cookSkill(g) >= BASES[b].need).reverse();
  for (const b of bases) for (const pl of places) {
    if (st.dishes.some((d) => d.base === b && d.place === pl)) continue;
    out.push({ base: b, place: pl });
  }
  // 틀이 고르게 섞이게
  const pick = [], used = new Set();
  for (const c of out) if (!used.has(c.base) && pick.length < 6) { pick.push(c); used.add(c.base); }
  for (const c of out) if (!pick.includes(c) && pick.length < 6) pick.push(c);
  return pick;
};
defineScene('cuisine_create', {
  need: (g) => canCreate(g),
  title: () => '빈 솥 앞에서',
  text: (g) => {
    const st = CU(g);
    const pls = Object.keys(st.palate).map((pl) => TASTE[pl].short).join(', ');
    return `맛을 아는 고장: ${pls}. ${st.dishes.length ? `지금 내 요리는 ${st.dishes.length}가지다.${st.dishes.length >= 6 ? ' 더 지으면 가장 못한 것 하나는 잊힌다.' : ''}` : '아직 내 이름을 붙일 요리가 없다.'}`;
  },
  choices: (g) => [
    ...combos(g).map((c) => ({ label: `${J(TASTE[c.place].ing, '으로/로')} ${J(BASES[c.base].name, '을/를')} 짓는다`, key: `make:${c.base}:${c.place}` })),
    { label: '오늘은 떠오르지 않는다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'no') return '솥에 물만 끓이다 불을 껐다. 그런 날도 있다.';
    const [, base, pl] = key.split(':');
    if (!BASES[base] || !TASTE[pl] || cookSkill(g) < BASES[base].need || !knows(g, pl)) return '재료를 늘어놓았지만 손이 따라가지 않았다.';
    const st = CU(g);
    tired(g, 10);
    const q = cookPower(g) * 0.75 + rng.int(0, 25) - BASES[base].need * 0.15;
    const d = newDish(g, base, pl, q);
    let lost = '';
    if (st.dishes.length >= 6) {
      const worst = st.dishes.slice().sort((a, b) => a.q + a.fame - (b.q + b.fame))[0];
      st.dishes = st.dishes.filter((x) => x !== worst);
      lost = ` 대신 ${dj(worst, '은/는')} 더는 만들지 않기로 했다.`;
    }
    st.dishes.push(d);
    logCook(g, `${J(dishName(base, pl), '을/를')} 지었다.`);
    const k = learn(g, 1.0);
    const word = d.q >= 75 ? '한 숟갈 뜨고 한참 말이 없었다. 이건 오래 남을 맛이다.' : d.q >= 50 ? '괜찮다. 손님들이 다시 찾을 맛이다.' : d.q >= 30 ? '먹을 만하다. 아직 무언가가 모자라다.' : '솔직히 말해 실패다. 그래도 이름은 붙였다.';
    return `${J(TASTE[pl].ing, '을/를')} 손질해 ${BASES[base].line}. ${J(dishName(base, pl), '이/가')} 태어났다. ${word}${lost}${k}`;
  },
});

/* ---------- 요리 내놓기 ---------- */
const canServe = (g) => isAdult(g) && free(g) && CU(g).dishes.length > 0 && (bigTown(here(g)) || atInn(g) || L(g).job?.id === 'cook');
ACTIONS.push({
  id: 'cuisine_serve',
  name: '내 요리를 내놓는다',
  icon: 'coin',
  desc: '장터 좌판이나 여관 상에 내 요리를 낸다. 사 먹은 사람이 늘수록 요리에 이름이 붙는다. 내 여관이면 여관 이름도 오른다.',
  available: canServe,
  run(g, rng) {
    const st = CU(g), d = bestDish(g), inn = atInn(g) ? myInn(g) : null;
    const earn = Math.round(2 + d.q / 15 + d.fame / 20);
    g.player.money += earn;
    d.fame = clamp(d.fame + 2 + (d.q >= 60 ? 1 : 0), 0, 100); d.served += 1; st.served += 1;
    addFame(g, 0.6);
    if (inn) inn.fame = clamp(inn.fame + 1, 0, 100);
    tired(g, 8);
    const k = learn(g, 0.5);
    return `${rng.pick(['솥째 들고 나가 장터 모퉁이에 섰다.', '오늘의 접시로 칠판에 적었다.', '단골들 상에 말없이 한 접시씩 올렸다.'])} ${dj(d, '이/가')} 해 지기 전에 다 나갔다. 은화 ${earn}닢.${inn ? ` ${inn.name}의 이름도 조금 올랐다.` : ''}${k}`;
  },
});

/* ---------- 요리 겨루기 ---------- */
const canContest = (g) => isAdult(g) && free(g) && bigTown(here(g)) && CU(g).dishes.length > 0 && mi(g) - CU(g).contestAt >= 6;
ACTIONS.push({
  id: 'cuisine_contest',
  name: '요리 겨루기에 나간다',
  icon: 'crown',
  desc: '장날마다 큰 고장에서는 요리사들이 접시 하나로 겨룬다. 이기면 상금과 이름이, 지면 웃음거리가 남는다. 심사관을 매수할 수도 있다.',
  available: canContest,
  run(g) {
    if (!sceneQueued(g, 'cuisine_contest')) queueScene(g, 'cuisine_contest', {}, { first: true });
    return '광장에 긴 탁자가 놓이고 솥 열두 개에 불이 붙었다.';
  },
});
const PLACE_HOUSE = (g) => PLACES[here(g)]?.house ?? 300;
const oppLevel = (g) => 35 + Math.round(PLACE_HOUSE(g) / 40);
defineScene('cuisine_contest', {
  need: (g) => canContest(g),
  title: (g) => `${placeName(here(g))} 요리 겨루기`,
  text: (g) => {
    const st = CU(g), t = tasteOf(here(g));
    return `심사관 셋이 앉았다. 하나는 ${t ? `${J(t.taste, '을/를')} 고집하는 이 고장 토박이` : '이 고장 토박이'}, 하나는 왕도에서 온 미식가, 하나는 늙은 요리사다.${st.rival ? ` 맞은편 솥 앞에 ${J(st.rival.name, '이/가')} 서서 나를 보고 웃는다.` : ''} 무엇을 낼까.`;
  },
  choices: (g) => {
    const st = CU(g), out = st.dishes.slice().sort((a, b) => b.q - a.q).slice(0, 5).map((d) => ({ label: `${dj(d, '을/를')} 낸다`, key: `dish:${d.id}` }));
    if (g.player.money >= 30) out.push({ label: '심사관 하나의 소매에 은화 30닢을 넣는다', key: 'bribe' });
    out.push({ label: '구경만 한다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const st = CU(g);
    if (key === 'no') return '남의 솥을 구경하며 하루를 보냈다. 배운 것도 있다.';
    st.contestAt = mi(g);
    let d, bribe = 0, caught = false;
    if (key === 'bribe') { d = bestDish(g); pay(g, 30); bribe = 25; caught = rng.chance(0.25); }
    else d = st.dishes.find((x) => `dish:${x.id}` === key);
    if (!d) return '들고 온 솥이 엎어졌다. 겨루기는 다음으로 미뤘다.';
    tired(g, 10);
    if (caught) {
      reportCrime(g, 'fraud');
      deed(g, 'honest', -4, '요리 겨루기에서 심사관을 매수하다 들켰다');
      addFame(g, -10);
      st.lostC += 1;
      return `늙은 요리사 심사관이 소매 속 은화를 탁자 위에 쏟아 놓았다. "이 사람이 넣었소." 광장이 웃음과 야유로 가득 찼다. 경비병이 이름을 적어 갔다.`;
    }
    const local = d.place === here(g) ? 8 : 0;
    const me = d.q * 0.6 + cookPower(g) * 0.4 + local + bribe + rng.int(0, 20);
    const opp = oppLevel(g) + (st.rival ? 8 : 0) + rng.int(0, 25);
    if (me >= opp) {
      const prize = Math.round(PLACE_HOUSE(g) / 15);
      g.player.money += prize; st.won += 1;
      d.fame = clamp(d.fame + 12, 0, 100);
      addFame(g, 6); renown(g, 3);
      deed(g, 'brave', 1, '요리 겨루기에서 이겼다');
      if (!st.rival && rng.chance(0.5)) st.rival = { name: rivalName(rng), grudge: 30 };
      else if (st.rival) st.rival.grudge = clamp(st.rival.grudge + 10, 0, 100);
      logCook(g, `${placeName(here(g))} 요리 겨루기에서 ${dj(d, '으로/로')} 이겼다.`);
      return `토박이 심사관이 두 번 떠먹었다. 미식가가 눈을 감았다. 늙은 요리사가 내 손을 잡았다. ${dj(d, '이/가')} 이겼다. 상금 은화 ${prize}닢.${local ? ' 이 고장 재료로 이 고장 사람들을 이겼다는 말이 돌았다.' : ''}${st.rival ? ` 진 ${J(st.rival.name, '이/가')} 앞치마를 바닥에 던졌다.` : ''}`;
    }
    st.lostC += 1; addFame(g, 1); stress(g, 5);
    return `${rng.pick(['미식가가 한 숟갈 뜨고 수저를 내려놓았다. 더 뜨지 않았다.', '토박이 심사관이 고개를 저었다. "우리 고장 맛이 아니오."', '늙은 요리사가 말했다. "소금이 한 꼬집 많소." 그 한 꼬집에 졌다.'])} ${dj(d, '은/는')} 셋째에도 들지 못했다.`;
  },
});

/* ---------- 연회 맡기 ---------- */
const canFeast = (g) => isAdult(g) && free(g) && mi(g) - CU(g).feastAt >= 4 && ((atPost(g) && CU(g).post.rank >= 1) || (!CU(g).post && CU(g).fame >= 40 && bigTown(here(g))));
ACTIONS.push({
  id: 'cuisine_feast',
  name: '연회를 맡는다',
  icon: 'crown',
  desc: '혼례, 사냥 뒤풀이, 손님 맞이. 한 번의 연회에 요리사의 이름이 걸린다. 손님이 많을수록 독을 노리는 손도 많다.',
  available: canFeast,
  run(g) {
    if (!sceneQueued(g, 'cuisine_feast')) queueScene(g, 'cuisine_feast', {}, { first: true });
    return '연회 날짜가 잡혔다. 손님 명단이 부엌 벽에 붙었다.';
  },
});
const hostOf = (g) => (atPost(g) ? lordOf(g) : (seatHouse(g) ? houseName(seatHouse(g)) : `${placeName(here(g))}의 부유한 상인`));
defineScene('cuisine_feast', {
  need: (g) => canFeast(g),
  title: (g) => `${hostOf(g)}의 연회`,
  text: (g, s) => {
    const st = CU(g);
    return `손님은 ${CU(g).post?.kind === 'court' ? '백 명이 넘는 귀족과 외국 사절' : '마흔 명 남짓한 귀족과 그 식솔'}이다. 연회는 사흘 뒤다. ${st.taster ? `시식관 ${J(st.taster.name, '이/가')} 접시를 기다린다.` : '시식관은 없다.'} 상을 어떻게 차릴까.`;
  },
  choices: (g) => {
    const st = CU(g), d = bestDish(g), out = [];
    out.push({ label: '아낌없이 차린다: 향신료와 설탕을 쏟아붓는다', key: 'lavish' });
    if (d) out.push({ label: `${dj(d, '을/를')} 상 한가운데 놓는다`, key: 'mine' });
    if (tasteOf(here(g))) out.push({ label: `이 고장 재료로만 차린다: ${tasteOf(here(g)).ing}`, key: 'local' });
    out.push({ label: '늘 하던 대로 탈 없이 차린다', key: 'plain' });
    if (st.taster) out.push({ label: '시식관에게 모든 접시를 먼저 맛보게 한다', key: 'taste' });
    if (!st.post) out.push({ label: '맡지 않겠다고 한다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const st = CU(g);
    if (key === 'no') return '정중히 거절했다. 남의 잔치에 내 이름을 걸 때가 아니다.';
    st.feastAt = mi(g); st.feasts += 1;
    tired(g, 18);
    const d = bestDish(g);
    const base = cookPower(g) + rng.int(0, 25);
    const score = key === 'lavish' ? base + 12 : key === 'mine' && d ? base * 0.6 + d.q * 0.6 + d.fame * 0.15 : key === 'local' ? base + (st.palate[here(g)] ? 8 : -4) : base - 4;
    const fee = Math.round((st.post?.kind === 'court' ? 40 : 18) * (key === 'lavish' ? 0.6 : 1));
    g.player.money += fee;
    const k = learn(g, 1.2);
    let out;
    if (score >= 70) {
      addFame(g, key === 'mine' ? 7 : 5); postFavor(g, 12); courtUp(g, 5);
      if (key === 'mine' && d) d.fame = clamp(d.fame + 15, 0, 100);
      deed(g, 'generous', 1, '연회를 훌륭히 치렀다');
      logCook(g, `${hostOf(g)}의 연회를 치렀다. 손님들이 오래 이야기했다.`);
      out = `${rng.pick(['마지막 접시가 나가자 연회장에서 박수가 터졌다. 부엌까지 들렸다.', '외국 사절 하나가 부엌까지 내려와 요리사의 얼굴을 보고 싶어 했다.', '주인이 손님들 앞에서 잔을 들어 부엌 쪽을 가리켰다.'])}${key === 'mine' && d ? ` 다들 ${dj(d, '을/를')} 물었다.` : ''} 사례 은화 ${fee}닢.`;
    } else if (score >= 45) {
      addFame(g, 1); postFavor(g, 3);
      out = `탈 없이 끝났다. 칭찬도 흉도 없었다. 접시는 대부분 비어서 돌아왔다. 사례 은화 ${fee}닢.`;
    } else {
      addFame(g, -4); postFavor(g, -12); courtUp(g, -3);
      out = `${rng.pick(['고기가 덜 익었다. 귀부인 하나가 접시를 밀어냈다.', '소스가 굳어 나갔다. 주인의 얼굴이 굳었다.', '설탕 과자가 무너졌다. 웃음소리가 부엌까지 들렸다. 좋은 웃음이 아니었다.'])} 사례는 은화 ${fee}닢이었지만 주인은 눈을 마주치지 않았다.`;
    }
    // 손님이 많으면 탈도 많다: 독을 탔다는 의심 (시식관이 먼저 맛보면 거의 없다)
    if (st.post && !sceneQueued(g, 'cuisine_event') && rng.chance(key === 'taste' ? 0.02 : st.taster ? 0.06 : 0.12)) queueScene(g, 'cuisine_event', { ev: 'suspect' });
    return `${out}${k}`;
  },
});

/* ---------- 매달 셈 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const st = CU(g), now = mi(g), rng = ownRng(g, 1);
  // 세상의 요리사: 한 해에 한 번, 어딘가에서 요리 하나가 이름을 얻는다 (플레이어 없이도)
  if (now - st.worldAt >= 12) {
    st.worldAt = now;
    if (rng.chance(0.55)) {
      const pl = rng.pick(Object.keys(TASTE)), base = rng.pick(BASE_IDS), chef = chefName(rng);
      st.world.unshift({ chef, dish: dishName(base, pl), place: pl, year: g.date.year });
      if (st.world.length > 8) st.world.length = 8;
      chron(g, `${placeName(pl)}에서 ${chef}의 ${J(dishName(base, pl), '이/가')} 이름을 얻었다. 먼 데서도 그 요리를 먹으러 사람들이 온다.`, 25);
    }
  }
  // 부엌 자리: 오래 비우면 잃고, 궁정에서 쫓겨나면 궁정 부엌도 잃는다
  const p = st.post;
  if (p) {
    if (p.kind === 'court' && disgraced(g)) leavePost(g, '궁정에서 쫓겨나며 부엌 자리도 잃었다.');
    else if (here(g) !== p.place || L(g).travel) { p.away += 1; if (p.away >= 3) leavePost(g, '오래 비운 사이 다른 사람이 자리를 차지했다.'); }
    else { p.away = 0; p.months += 1; if (p.workedAt !== now - 1 && p.workedAt !== now) p.favor = clamp(p.favor - 1, 0, 100); }
  }
  // 시식관 품삯
  if (st.taster) {
    st.taster.months += 1;
    if (pay(g, 2) < 2) { st.taster.loyal -= 15; if (st.taster.loyal <= 10) { logCook(g, `품삯이 밀리자 시식관 ${J(st.taster.name, '이/가')} 떠났다.`); st.taster = null; } }
    else st.taster.loyal = clamp(st.taster.loyal + 1, 0, 100);
  }
  // 요리의 이름: 내놓지 않으면 잊히고, 많이 알려지면 사람들이 이름을 붙인다
  for (const d of st.dishes) {
    d.fame = clamp(d.fame - (famous(d) ? 0.1 : 0.3), 0, 100);
    if (famous(d) && !d.title) {
      d.title = rng.pick(TITLES.filter((t) => !st.dishes.some((x) => x.title === t))) ?? TITLES[0];
      addFame(g, 3);
      logCook(g, `'${d.title}'. 사람들이 ${J(dishName(d.base, d.place), '을/를')} 그렇게 부르기 시작했다.`);
      chron(g, `'${d.title}'. ${J(d.by, '이/가')} 지은 ${J(dishName(d.base, d.place), '을/를')} 사람들이 그렇게 부르기 시작했다.`, 30);
    }
  }
  if (st.fame > 30) st.fame = clamp(st.fame - 0.15, 0, 100);
  if (st.rival) { st.rival.grudge = clamp(st.rival.grudge - 0.5, 0, 100); if (st.rival.grudge <= 0) st.rival = null; }
  // 사건
  if (!free(g) || now - st.eventAt < 3 || sceneQueued(g, 'cuisine_event') || !rng.chance(0.3)) return;
  const evs = eligible(g);
  if (!evs.length) return;
  st.eventAt = now;
  queueScene(g, 'cuisine_event', { ev: rng.pick(evs) });
});
export function eligible(g) {
  const st = CU(g), out = [];
  if (atPost(g)) out.push('plot', 'suspect', 'spoiled', 'shortage');
  if (atPost(g) && st.taster) out.push('taster');
  if (st.rival) out.push('rival');
  if (st.dishes.length && st.fame >= 15) out.push('guest');
  if (st.fame >= 15 || (st.post?.rank ?? 0) >= 1) out.push('apprentice');
  return out;
}

/* ---------- 대 잇기: 이름난 요리는 집안의 요리가 된다 ---------- */
HOOKS.heir.push((g) => {
  const st = CU(g);
  if (st.post) leavePost(g, '주인이 세상을 떠났다.');
  st.dishes = st.dishes.filter((d) => d.fame >= 10 || d.q >= 50);
  for (const d of st.dishes) { d.gen += 1; d.q = Math.round(d.q * 0.85); }
  if (st.dishes.length) logCook(g, `집안의 요리 ${st.dishes.length}가지가 ${g.player.name}에게 넘어왔다.`);
  st.fame = Math.round(st.fame * 0.4);
  st.palate = {}; st.rival = null; st.taster = null; st.chief = false;
});
