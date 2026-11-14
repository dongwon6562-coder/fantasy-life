// 장소, 이동(여행·이사), 집 구하기, 장소마다 다른 행동과 사람.
// 에른 마을 → 하르펜(소도시) → 베르덴(백작령 성읍) → 왕도 레오카스트.
import { J } from './narrative/text.js';
import { ACTIONS } from './actions.js';
import { HOOKS } from './hooks.js';
import { JOBS } from './data.js';
import { me, playerAge, gainStat, gainSkill, circleOf } from './game.js';
import { makePerson, byId, fullName, ageYears } from './npc.js';
import {
  L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, newsNow,
  tired, stress, up, gains, spend, canSpend, check,
} from './adventure/core.js';

export const PLACES = {
  ern: {
    name: '에른 마을', kind: '마을',
    desc: '레오니아 왕국 남쪽 끝, 밀밭과 숲 사이의 작은 마을. 모두가 서로의 이름을 안다.',
    inn: 2, rent: 2, house: 120, wage: 1.0,
    links: { harfen: 1 },
  },
  harfen: {
    name: '하르펜', kind: '소도시',
    desc: '에른에서 북쪽으로 사흘 길. 성벽을 두른 남부의 교역 도시. 모험가 길드 지부와 은저울 상단 본점, 성광교 성당이 있고, 남쪽 언덕에는 고블린이 들끓는 회색 굴이 입을 벌리고 있다.',
    inn: 3, rent: 4, house: 320, wage: 1.15,
    links: { ern: 1, verden: 1, leocast: 2 },
  },
  verden: {
    name: '베르덴', kind: '백작령 성읍',
    desc: '베르덴 백작이 다스리는 영지의 중심. 언덕 위 성채 아래로 기사단 훈련장이 있고, 서쪽 골짜기에는 오래전 버려진 은광이 있다.',
    inn: 3, rent: 4, house: 280, wage: 1.1,
    links: { harfen: 1, leocast: 2 },
  },
  leocast: {
    name: '왕도 레오카스트', kind: '왕도',
    desc: '영웅왕 레오가 세운 백색 성의 도시. 성 안은 화려하고, 성 밖 빈민가는 범죄 조직 "검은 장갑"이 쥐고 있다. 병든 왕의 두 왕자를 둘러싼 소문이 끊이지 않는다.',
    inn: 5, rent: 7, house: 900, wage: 1.4,
    links: { harfen: 2, verden: 2 },
  },
};
export const placeOf = (g) => PLACES[L(g).place] ?? PLACES.ern;
export const placeName = (g) => (traveling(g) ? `${J(PLACES[L(g).travel.to].name, '으로/로')} 가는 길` : placeOf(g).name);
export const HOME_NAMES = { family: '부모님 집', inn: '여관', rent: '셋방', own: '내 집', barracks: '숙소', street: '노숙' };

// 두 장소 사이에 걸리는 달 수 (가장 짧은 길)
export function travelMonths(from, to) {
  if (from === to) return 0;
  const dist = { [from]: 0 };
  const todo = [from];
  while (todo.length) {
    todo.sort((a, b) => dist[a] - dist[b]);
    const cur = todo.shift();
    for (const [nb, m] of Object.entries(PLACES[cur].links)) {
      const d = dist[cur] + m;
      if (dist[nb] == null || d < dist[nb]) { dist[nb] = d; todo.push(nb); }
    }
  }
  return dist[to] ?? 99;
}
export const fareOf = (months) => months * 3;

/* ---------- 장소마다 만나는 사람 ---------- */
Object.assign(JOBS, {
  idle: { name: '일 없음', skill: null, income: 0 },
  guild_clerk: { name: '길드 접수원', skill: 'letters', income: 4 },
  guildmaster: { name: '길드 지부장', skill: 'sword', income: 9 },
  knight: { name: '기사', skill: 'sword', income: 8 },
  knight_captain: { name: '기사단장', skill: 'sword', income: 14 },
  count: { name: '백작', skill: 'letters', income: 40 },
  trade_master: { name: '상단주', skill: 'trade', income: 20 },
  gang_boss: { name: '검은 장갑의 두목', skill: 'sword', income: 15 },
  court_mage: { name: '궁정 마법사', skill: 'magic', income: 16 },
  bishop: { name: '주교', skill: 'letters', income: 10 },
  scholar: { name: '학자', skill: 'letters', income: 6 },
  sword_master: { name: '검술 사범', skill: 'sword', income: 8 },
});

const PLACE_PEOPLE = {
  harfen: [
    { role: 'guild_clerk', job: 'guild_clerk', age: [20, 30], sex: 'f', traits: ['diligent', 'reserved'] },
    { role: 'guildmaster', job: 'guildmaster', age: [46, 58], sex: 'm', traits: ['brave', 'reserved'], skill: [70, 85] },
    { role: 'trade_master', job: 'trade_master', age: [40, 55], traits: ['greedy', 'ambitious'] },
    { role: 'priest', job: 'priest', age: [35, 50], sex: 'm', traits: ['pious', 'ambitious'] },
    { role: 'rival', job: 'adventurer', age: [16, 20], traits: ['brave', 'ambitious'] },
    { role: 'sword_master', job: 'sword_master', age: [38, 52], sex: 'm', traits: ['diligent', 'cruel'], skill: [55, 68] },
  ],
  verden: [
    { role: 'count', job: 'count', age: [44, 60], sex: 'm', traits: ['ambitious', 'reserved'] },
    { role: 'knight_captain', job: 'knight_captain', age: [38, 50], sex: 'm', traits: ['brave', 'diligent'], skill: [65, 78] },
    { role: 'senior_knight', job: 'knight', age: [24, 32], traits: ['cruel', 'ambitious'], skill: [40, 55] },
    { role: 'priest', job: 'priest', age: [40, 60], traits: ['pious', 'kind'] },
  ],
  leocast: [
    { role: 'knight_captain', job: 'knight_captain', age: [42, 55], sex: 'm', traits: ['brave', 'reserved'], skill: [78, 90] },
    { role: 'guild_clerk', job: 'guild_clerk', age: [22, 34], traits: ['gossip', 'diligent'] },
    { role: 'guildmaster', job: 'guildmaster', age: [50, 62], traits: ['reserved', 'greedy'], skill: [78, 90] },
    { role: 'gang_boss', job: 'gang_boss', age: [34, 48], traits: ['cruel', 'ambitious'], skill: [50, 65] },
    { role: 'court_mage', job: 'court_mage', age: [55, 70], traits: ['reserved', 'ambitious'], skill: [80, 92] },
    { role: 'bishop', job: 'bishop', age: [55, 70], sex: 'm', traits: ['pious', 'greedy'] },
    { role: 'sword_master', job: 'sword_master', age: [45, 60], traits: ['reserved', 'diligent'], skill: [72, 85] },
  ],
};

// 처음 그 장소에 갔을 때 그곳 사람들을 만들어 둔다
export function ensurePlacePeople(g, rng, place) {
  const life = L(g);
  if (life.placeNpcs[place] || !PLACE_PEOPLE[place]) return;
  life.placeNpcs[place] = [];
  for (const r of PLACE_PEOPLE[place]) {
    const p = makePerson(rng, { sex: r.sex, ageMonths: rng.int(r.age[0], r.age[1]) * 12 + rng.int(0, 11), job: r.job, traits: r.traits });
    p.skill = r.skill ? rng.int(r.skill[0], r.skill[1]) : rng.int(35, 70);
    p.place = place;
    p.role = r.role;
    p.wealth = rng.int(30, 200);
    g.people.push(p);
    life.placeNpcs[place].push(p.id);
  }
}
// 그 장소에서 맡은 역할의 사람 (살아 있으면)
export function placePerson(g, place, role) {
  const ids = L(g).placeNpcs[place] ?? [];
  return ids.map((id) => byId(g, id)).find((p) => p && p.alive && p.role === role) ?? null;
}
export function meetPlacePerson(g, place, role, affection = 10) {
  const p = placePerson(g, place, role);
  if (p && !p.known) {
    p.known = true; p.affection = affection;
    p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 처음 알게 되었다.` });
  }
  return p;
}

/* ---------- 행동 제한: 마을 행동은 에른에서만, 길 위에서는 할 수 있는 게 적다 ---------- */
const ERN_ONLY = new Set(['play', 'help_home', 'study', 'sword_father', 'sword_guard', 'magic_lesson', 'inn_kitchen', 'day_labor', 'wander']);
const ON_ROAD = new Set(['rest', 'meditate', 'train_body', 'on_road']);
HOOKS.actionFilter.push((g, a) => {
  const life = L(g);
  if (life.travel) return ON_ROAD.has(a.id);
  if (a.place && !a.place.includes(life.place)) return false;
  if (ERN_ONLY.has(a.id) && life.place !== 'ern') return false;
  if (a.id === 'help_home' && life.home !== 'family') return false;
  return true;
});

/* ---------- 길 떠나기 ---------- */
ACTIONS.push({
  id: 'travel',
  name: '길 떠나기',
  desc: '다른 고장으로 떠난다. 머물다 올 수도, 아예 터를 옮길 수도 있다. 길에는 달이 걸린다.',
  available: (g) => isAdult(g) && !traveling(g) && !sceneQueued(g, 'travel'),
  run(g) {
    queueScene(g, 'travel');
    return '어디로 갈지 마음을 정하기로 했다.';
  },
});

defineScene('travel', {
  title: () => '길 떠나기',
  text: (g) => {
    const life = L(g);
    const job = life.job ? ' 지금 하는 일은 그만두게 된다.' : '';
    return `${placeOf(g).name}의 ${L(g).place === 'ern' ? '마을 어귀' : '성문 앞'}에 섰다. 짐마차 삯은 한 달 길에 은화 3닢이다. 돈이 없으면 걸어서 가야 하고, 그만큼 오래 걸린다.${job}`;
  },
  choices: (g) => {
    const here = L(g).place;
    const out = Object.keys(PLACES).filter((id) => id !== here).map((id) => {
      const m = travelMonths(here, id);
      return { label: `${J(PLACES[id].name, '으로/로')} (${m}달, 은화 ${fareOf(m)}닢)`, key: id };
    });
    out.push({ label: '그만둔다', key: 'stay' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'stay') return '짐을 다시 풀었다. 아직은 떠날 때가 아니다.';
    const life = L(g);
    const m = travelMonths(life.place, key);
    const fare = fareOf(m);
    let walk = false;
    if (!spend(g, fare)) walk = true;
    if (life.job) { leaveJob(g, `${J(PLACES[key].name, '으로/로')} 떠나며 일을 그만두었다.`); }
    life.travel = { to: key, left: walk ? m + 1 : m, from: life.place };
    note(g, `${placeOf(g).name}를 떠나 ${J(PLACES[key].name, '으로/로')} 향했다.`);
    if (walk) return `삯을 낼 돈이 없어 걸어서 가기로 했다. ${PLACES[key].name}까지 ${m + 1}달은 걸릴 것이다.`;
    return `짐마차에 올랐다. ${PLACES[key].name}까지 ${m}달 길이다.`;
  },
});

// 일자리를 떠나는 공통 처리 (jobs.js, factions.js가 덮어쓰지 않도록 여기서 한다)
export function leaveJob(g, text) {
  const life = L(g);
  if (!life.job) return;
  if (text) note(g, text);
  if (['barracks'].includes(life.home)) life.home = 'inn';
  life.job = null;
  me(g).job = 'idle';
}

ACTIONS.push({
  id: 'on_road',
  name: '길을 재촉한다',
  desc: '쉬지 않고 걷고, 길 위의 사람들과 풍경을 눈에 담는다.',
  available: (g) => traveling(g),
  run(g, rng) {
    tired(g, 10);
    const sn = gainStat(g, 'sen', 0.5), w = gainStat(g, 'wil', 0.4);
    const line = rng.pick([
      '이정표의 이끼 낀 글씨를 읽으며 걸었다. 왕국은 생각보다 넓다.',
      '역참 마구간에서 행상인들과 함께 밤을 보냈다. 북쪽 전선 이야기가 오갔다.',
      '비가 사흘 내렸다. 진흙길에서 수레바퀴를 함께 밀었다.',
      '언덕 너머로 불탄 농가를 지났다. 아무도 무슨 일이 있었는지 말하지 않았다.',
      '길가 사당에 성광교 순례자들이 모여 기도하고 있었다.',
    ]);
    return `${line}${gains([up('감각', sn), up('의지', w)])}`;
  },
});

// 매달: 길 위의 진행, 도착, 노숙/집세
HOOKS.afterActions.push((g, rng, results) => {
  const life = L(g);
  if (life.travel) {
    life.travel.left -= 1;
    if (life.travel.left <= 0) arrive(g, rng, results);
    else if (rng.chance(0.18)) roadEncounter(g, rng);
    return;
  }
  payLiving(g, rng, results);
});

function roadEncounter(g, rng) {
  // 길 위의 위험은 adventure/quests.js가 장면을 정의한다
  queueScene(g, 'road');
}

function arrive(g, rng, results) {
  const life = L(g);
  const to = life.travel.to;
  life.travel = null;
  life.place = to;
  ensurePlacePeople(g, rng, to);
  const P = PLACES[to];
  if (to === 'ern' && g.player.familyIds.some((id) => byId(g, id)?.alive)) life.home = 'family';
  else if (life.houses.includes(to)) life.home = 'own';
  else life.home = 'inn';
  const lines = [`${P.name}에 닿았다. ${P.desc}`];
  // 재회: 에른을 떠났던 아는 사람을 낯선 도시에서 만난다
  const left = g.people.filter((p) => p.alive && p.away && p.known && !p.isPlayer && !p.place);
  if (to !== 'ern' && left.length && rng.chance(0.6)) {
    const p = rng.pick(left);
    p.place = to;
    p.affection = Math.min(100, p.affection + 8);
    lines.push(`광장에서 낯익은 얼굴을 보았다. 에른을 떠났던 ${fullName(p)}(${ageYears(p)}살)이다. 둘은 한참 고향 이야기를 했다.`);
    p.history.push({ y: g.date.year, m: g.date.month, text: `${P.name}에서 ${J(g.player.name, '과/와')} 다시 만났다.` });
  }
  lines.push(`잠자리는 ${HOME_NAMES[life.home]}.`);
  results.push({ name: '도착', text: lines.join(' ') });
  note(g, `${P.name}에 도착했다.`);
  chron(g, `${g.player.name}, ${P.name}에 들어서다.`);
}

function payLiving(g, rng, results) {
  const life = L(g);
  const P = placeOf(g);
  const cost = { family: 0, inn: P.inn, rent: P.rent, own: 1, barracks: 0, street: 0 }[life.home] ?? 0;
  if (!cost) {
    if (life.home === 'street') {
      tired(g, 12); stress(g, 10);
      if (canSpend(g, P.inn + 2)) { life.home = 'inn'; results.push({ name: '잠자리', text: '돈이 조금 모여 다시 여관에 방을 얻었다.' }); }
      else results.push({ name: '잠자리', text: '마구간 짚더미에서 잤다. 몸이 쑤시고 마음이 무겁다.' });
    }
    return;
  }
  if (spend(g, cost)) return;
  if (life.home === 'own') return; // 집이 있으면 세금이 밀려도 쫓겨나지는 않는다
  const was = life.home;
  life.home = 'street';
  stress(g, 15);
  results.push({ name: '잠자리', text: `${HOME_NAMES[was]}값 은화 ${cost}닢을 낼 수 없어 쫓겨났다. 오늘 밤은 길에서 자야 한다.` });
}

/* ---------- 집 구하기 ---------- */
ACTIONS.push({
  id: 'housing',
  name: '집 구하기',
  desc: '이곳에서 지낼 곳을 정한다. 여관, 셋방, 아니면 내 집.',
  available: (g) => isAdult(g) && !traveling(g) && !sceneQueued(g, 'housing'),
  run(g) { queueScene(g, 'housing'); return '지낼 곳을 알아보러 다녔다.'; },
});

defineScene('housing', {
  title: (g) => `${placeOf(g).name}에서 지낼 곳`,
  text: (g) => `지금 잠자리는 ${HOME_NAMES[L(g).home]}. 내 돈은 은화 ${g.player.money}닢이다.`,
  choices: (g) => {
    const life = L(g); const P = placeOf(g);
    const out = [];
    if (life.place === 'ern' && life.home !== 'family' && g.player.familyIds.some((id) => byId(g, id)?.alive)) out.push({ label: '부모님 집으로 돌아간다', key: 'family' });
    if (life.home !== 'inn') out.push({ label: `여관에 묵는다 (달마다 은화 ${P.inn}닢)`, key: 'inn' });
    if (life.home !== 'rent') out.push({ label: `셋방을 얻는다 (달마다 은화 ${P.rent}닢, 보증금 ${P.rent * 2}닢)`, key: 'rent' });
    if (life.houses.includes(life.place)) { if (life.home !== 'own') out.push({ label: '내 집으로 들어간다', key: 'own' }); }
    else out.push({ label: `집을 산다 (은화 ${P.house}닢)`, key: 'buy' });
    out.push({ label: '지금 그대로 지낸다', key: 'stay' });
    return out;
  },
  resolve(g, rng, s, key) {
    const life = L(g); const P = placeOf(g);
    if (key === 'stay') return '지금 지내는 곳에 그대로 머물기로 했다.';
    if (key === 'family') { life.home = 'family'; return '어머니가 말없이 방을 치워 두었다. 집 냄새가 났다.'; }
    if (key === 'inn') { life.home = 'inn'; return '여관 이층 구석방을 잡았다. 밤마다 아래층 술꾼들의 노래가 들린다.'; }
    if (key === 'own') { life.home = 'own'; return '내 집 문을 열었다. 먼지 냄새마저 반가웠다.'; }
    if (key === 'rent') {
      if (!spend(g, P.rent * 2)) return '보증금을 낼 돈이 없었다. 집주인은 문을 닫았다.';
      life.home = 'rent';
      return rng.pick(['골목 끝 이층 셋방을 얻었다. 창문으로 성벽이 보인다.', '빵집 위 다락방을 빌렸다. 새벽마다 빵 굽는 냄새에 눈을 뜬다.', '과부가 세를 놓은 작은 방을 얻었다. 집주인은 밤늦게 다니지 말라고 했다.']);
    }
    if (key === 'buy') {
      if (!spend(g, P.house)) return `은화 ${P.house}닢. 지금 가진 돈으로는 어림도 없다.`;
      life.houses.push(life.place); life.home = 'own';
      note(g, `${P.name}에 내 집을 마련했다.`);
      chron(g, `${g.player.name}, ${P.name}에 집을 사다.`);
      return `${P.name}에 내 집을 마련했다. 열쇠가 손바닥에 묵직했다. 이 집은 자식에게 물려줄 수 있다.`;
    }
    return '';
  },
});

/* ---------- 장소마다 다른 행동 ---------- */
const fee = (g, n, fail) => (spend(g, n) ? null : fail);

ACTIONS.push(
  {
    id: 'harfen_market', place: ['harfen'], name: '하르펜 시장 돌기',
    desc: '남부의 물건과 소문이 모이는 시장을 돈다. 장사 눈이 트이고 사람을 사귄다.',
    available: (g) => isAdult(g) || playerAge(g) >= 12,
    run(g, rng) {
      tired(g, 6); stress(g, -4);
      const t = gainSkill(g, 'trade', 1.0, 'cha'), c = gainStat(g, 'cha', 0.4), sn = gainStat(g, 'sen', 0.4);
      const p = meetPlacePerson(g, 'harfen', rng.pick(['trade_master', 'rival', 'guild_clerk']), 8);
      const line = rng.pick([
        '드워프제 칼이 은화 백 닢에 팔리는 것을 보았다.',
        '북쪽에서 온 소금 값이 지난달의 두 배가 되었다.',
        '마석 거래상들이 회색 굴에서 나온 마석의 질을 두고 다투고 있었다.',
        '사기꾼 약장수가 "엘프의 눈물"이라며 맹물을 팔고 있었다.',
      ]);
      return `${line}${p ? ` ${JOBS[p.job].name} ${J(fullName(p), '과/와')} 말을 섞었다.` : ''}${gains([up('장사', t), up('매력', c), up('감각', sn)])}`;
    },
  },
  {
    id: 'harfen_dojo', place: ['harfen'], name: '하르펜 검술 도장',
    desc: '성벽 아래 도장에서 강검류를 배운다. 한 달에 은화 3닢. 사범은 엄하다.',
    available: (g) => playerAge(g) >= 12,
    run(g, rng) {
      const f = fee(g, 3, '수업료가 없어 도장 문턱에서 돌아섰다.'); if (f) return f;
      tired(g, 18); stress(g, 6);
      const k = gainSkill(g, 'sword', 2.4, 'str'), s = gainStat(g, 'str', 0.5), w = gainStat(g, 'wil', 0.4);
      const m = meetPlacePerson(g, 'harfen', 'sword_master', 0);
      if (m) m.affection += 1;
      const line = rng.pick([
        '"검이 가벼우면 목숨도 가볍다." 사범의 목검이 손등을 내리쳤다.',
        '같은 문하생과 맞대련을 했다. 이기고 나서도 사범은 칭찬하지 않았다.',
        '강검류의 첫 번째 형, 산을 쪼개는 내려베기를 천 번 반복했다.',
        '도장 구석에서 피 묻은 붕대를 감는 선배를 보았다. 실전에서 돌아온 것이다.',
      ]);
      return `${line}${gains([up('검술', k), up('힘', s), up('의지', w)])}`;
    },
  },
  {
    id: 'harfen_library', place: ['harfen'], name: '성당 서고에서 공부',
    desc: '하르펜 성당 서고에서 책을 읽는다. 은화 1닢을 헌금하면 들여보내 준다.',
    available: (g) => playerAge(g) >= 10,
    run(g, rng) {
      const f = fee(g, 1, '헌금할 동전이 없었다.'); if (f) return f;
      tired(g, 8);
      const k = gainSkill(g, 'letters', 2.0, 'int'), i = gainStat(g, 'int', 0.7);
      const line = rng.pick([
        '제2차 인마대전의 연대기를 읽었다. 그때도 왕국은 둘로 갈라져 있었다.',
        '마석이 어떻게 생기는지에 대한 학자들의 논쟁을 읽었다. 아무도 확실히 모른다.',
        '레오니아 귀족 가문의 문장도감을 넘겼다. 몰락한 이름이 생각보다 많았다.',
      ]);
      return `${line}${gains([up('글과 학문', k), up('지능', i)])}`;
    },
  },
  {
    id: 'verden_yard', place: ['verden'], name: '기사단 훈련장 기웃거리기',
    desc: '베르덴 성채 아래 훈련장에서 기사들의 훈련을 지켜보고 따라 한다.',
    available: (g) => playerAge(g) >= 10,
    run(g, rng) {
      tired(g, 14);
      const k = gainSkill(g, 'sword', 1.4, 'agi'), s = gainStat(g, 'str', 0.4), a = gainStat(g, 'agi', 0.4);
      const kn = meetPlacePerson(g, 'verden', rng.chance(0.5) ? 'senior_knight' : 'knight_captain', 0);
      const line = rng.pick([
        '말 탄 기사들이 창끝을 맞추는 모습을 보았다. 땅이 울렸다.',
        '종자들이 갑옷을 닦으며 투덜대고 있었다. 기사가 되는 길은 길다.',
        '울타리 너머에서 목검을 휘두르다 기사 하나에게 들켰다.',
      ]);
      return `${line}${kn ? ` ${J(fullName(kn), '이/가')} 나를 눈여겨보았다.` : ''}${gains([up('검술', k), up('힘', s), up('민첩', a)])}`;
    },
  },
  {
    id: 'leocast_library', place: ['leocast'], name: '왕립 도서관',
    desc: '왕도의 왕립 도서관. 출입료 은화 3닢. 대륙의 역사와 마법 이론서가 있다.',
    available: (g) => playerAge(g) >= 12,
    run(g, rng) {
      const f = fee(g, 3, '출입료가 모자랐다. 문지기가 비켜 주지 않았다.'); if (f) return f;
      tired(g, 8);
      const k = gainSkill(g, 'letters', 2.6, 'int'), i = gainStat(g, 'int', 0.9);
      const mg = g.player.manaAwakened ? gainSkill(g, 'magic', 0.6, 'int') : 0;
      const line = rng.pick([
        '용사 아르스의 원정 기록 사본을 읽었다. 마지막 몇 장이 찢겨 있었다.',
        '대마도사 노아가 남긴 서클 이론의 주석서를 읽었다. 반도 이해하지 못했다.',
        '발하르트 제국이 갈라져 나간 경위를 적은 책을 읽었다. 왕국 쪽 기록과 제국 쪽 기록이 달랐다.',
        '"마신은 죽지 않았다, 잠들었을 뿐이다." 낡은 책 여백에 누군가 적어 두었다.',
      ]);
      return `${line}${gains([up('글과 학문', k), up('지능', i), up('마법', mg)])}`;
    },
  },
  {
    id: 'leocast_tower', place: ['leocast'], name: '마탑 강의 청강',
    desc: '왕도 마탑의 공개 강의를 듣는다. 은화 8닢. 서클을 이룬 사람만 들어갈 수 있다.',
    available: (g) => g.player.manaAwakened && circleOf(g) >= 1,
    run(g, rng) {
      const f = fee(g, 8, '청강료가 모자랐다.'); if (f) return f;
      tired(g, 14); stress(g, 8);
      const k = gainSkill(g, 'magic', 2.6, 'int'), i = gainStat(g, 'int', 0.5);
      g.player.mana += g.player.manaPotential * 0.4;
      const m = meetPlacePerson(g, 'leocast', 'court_mage', 0);
      return `${rng.pick(['3서클 마법사가 칠판 가득 마법진을 그렸다. 강의실의 절반은 졸았다.', '마력 회로를 둘로 나누는 이론을 들었다. 머리가 아팠다.', '강의가 끝나고 늙은 마법사에게 질문을 했다. 그는 대답 대신 책 한 권의 이름을 알려 주었다.'])}${m && m.affection < 5 ? ` 강단에 선 사람은 궁정 마법사 ${fullName(m)}였다.` : ''}${gains([up('마법', k), up('지능', i)])}`;
    },
  },
  {
    id: 'leocast_dojo', place: ['leocast'], name: '유수류 도장',
    desc: '왕도의 유수류 도장. 흐르는 물처럼 받아 흘리는 검. 한 달에 은화 6닢.',
    available: (g) => playerAge(g) >= 13,
    run(g, rng) {
      const f = fee(g, 6, '수업료가 없었다. 왕도의 도장은 싸지 않다.'); if (f) return f;
      tired(g, 18); stress(g, 6);
      const k = gainSkill(g, 'sword', 2.8, 'agi'), a = gainStat(g, 'agi', 0.6), sn = gainStat(g, 'sen', 0.4);
      meetPlacePerson(g, 'leocast', 'sword_master', 0);
      return `${rng.pick(['"베려 하지 마라. 상대의 힘이 지나갈 길을 열어 줘라." 사범이 말했다.', '물 위에 띄운 나뭇잎을 베지 않고 검끝으로 밀어내는 연습을 했다.', '귀족 자제들 사이에서 대련했다. 그들은 내 검을 천하다고 했고, 나는 그들의 검을 느리다고 생각했다.'])}${gains([up('검술', k), up('민첩', a), up('감각', sn)])}`;
    },
  },
  {
    id: 'slums', place: ['leocast'], name: '빈민가 뒷골목 일',
    desc: '검은 장갑이 주는 일을 한다. 돈은 되지만 손이 더러워진다. 경비대에 잡힐 수도 있다.',
    available: (g) => isAdult(g),
    run(g, rng) {
      tired(g, 12); stress(g, 8);
      const life = L(g);
      const boss = meetPlacePerson(g, 'leocast', 'gang_boss', 0);
      if (boss) boss.affection += 2;
      const a = gainStat(g, 'agi', 0.5), sn = gainStat(g, 'sen', 0.5);
      if (!check(rng, g.player.stats.agi + g.player.stats.sen / 2, 30 + life.notoriety / 3)) {
        life.notoriety += 4;
        const lost = Math.min(g.player.money, rng.int(5, 15));
        g.player.money -= lost;
        g.player.injuries.push({ name: '경비대 곤봉에 맞은 어깨', months: 2 });
        note(g, '뒷골목 일을 하다 경비대에 붙잡혔다.');
        return `물건을 넘기다 경비대에 붙잡혔다. 곤봉 세례를 받고 벌금으로 은화 ${lost}닢을 뺏겼다. 이름이 경비대 장부에 올랐다.`;
      }
      const earn = rng.int(6, 14);
      g.player.money += earn;
      life.notoriety += 2;
      const line = rng.pick([
        '이름 모를 상자를 강 건너 창고까지 옮겼다. 묻지 않는 것이 이 일의 규칙이다.',
        '빚을 안 갚는 술집 주인을 찾아가 "말"을 전했다. 주인의 손이 떨렸다.',
        '귀족가 하인에게서 봉투 하나를 받아 왔다. 봉랍의 문장은 보지 않은 척했다.',
      ]);
      return `${line} 은화 ${earn}닢을 받았다.${gains([up('민첩', a), up('감각', sn)])}`;
    },
  },
);

// 15살이 되면 할 수 있는 일이 늘었다는 것을 알려 준다
HOOKS.afterMonth.push((g) => {
  if (me(g).ageMonths === 15 * 12) {
    g.news.unshift({ text: '열다섯. 이제 일자리를 구하고, 길을 떠나고, 기사단이나 길드 같은 곳의 문을 두드릴 수 있다.', rel: 100 });
  }
});
