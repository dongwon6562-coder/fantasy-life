// 게임 상태와 한 달 진행.
import { makeRng } from './rng.js';
import { FAMILIES, START_YEAR, STATS, SKILLS, MONTHS, JOBS } from './data.js';
import {
  generateVillage, makePerson, simulateMonth, relevance, byId, living, ageYears, fullName,
  setNextId, getNextId, kill, bodyAgeOf,
} from './npc.js';
import { ACTIONS } from './actions.js';
import { pickEvent } from './events.js';
import { run as runHooks, HOOKS } from './hooks.js';

export function rngOf(game) { return makeRng(game.rngState); }

export function newGame({ name, sex, familyId, mode, seed }) {
  const game = {
    version: 1,
    mode, // 'once' | 'free'
    rngState: { s: seed ?? Math.floor(Math.random() * 2 ** 31) },
    date: { year: START_YEAR, month: 3 },
    people: [],
    world: { famine: false, plague: false, famineMonths: 0, plagueMonths: 0 },
    news: [], // 이번 달 소식 (지난 달에 일어난 일 중 고른 것)
    chronicle: [], // 연대기: 모든 소식 { y, m, text, rel }
    lastResults: [], // 지난 달 내 행동 결과
    pendingEvent: null,
    over: false,
  };
  setNextId(1);
  const rng = rngOf(game);
  const fam = FAMILIES.find((f) => f.id === familyId);
  const lastName = rng.pick(fam.lastNames);

  game.people = generateVillage(rng);
  const fatherAge = rng.int(24, 34);
  const father = makePerson(rng, { sex: 'm', ageMonths: fatherAge * 12 + rng.int(0, 11), lastName, job: fam.fatherJob });
  const mother = makePerson(rng, { sex: 'f', ageMonths: (fatherAge - rng.int(0, 5)) * 12 + rng.int(0, 11), lastName, job: fam.motherJob });
  father.skill = rng.int(35, 65); mother.skill = rng.int(30, 60);
  father.spouseId = mother.id; mother.spouseId = father.id;
  father.known = mother.known = true;
  father.affection = mother.affection = 60;
  game.people.push(father, mother);
  const familyIds = [father.id, mother.id];

  if (rng.chance(0.55)) {
    const sib = makePerson(rng, { ageMonths: rng.int(2, 6) * 12 + rng.int(0, 11), lastName, fatherId: father.id, motherId: mother.id });
    sib.known = true; sib.affection = 40;
    father.childIds.push(sib.id); mother.childIds.push(sib.id);
    game.people.push(sib);
    familyIds.push(sib.id);
  }

  // 플레이어도 마을 사람 명단에 올린다 (시뮬레이션은 건너뛴다)
  const me = makePerson(rng, { sex, lastName, fatherId: father.id, motherId: mother.id });
  me.name = name;
  me.isPlayer = true;
  me.known = true;
  father.childIds.push(me.id); mother.childIds.push(me.id);
  game.people.push(me);

  // 모두가 아는 사람: 촌장, 사제
  for (const p of game.people) if (p.job === 'elder' || p.job === 'priest') p.known = true;

  // 재능: 능력치마다 성장 배율. 마력 잠재력은 대부분 낮고 드물게 높다.
  const talents = {};
  for (const s of STATS) talents[s.id] = Math.max(0.5, Math.min(1.8, rng.normal(1, 0.25)));
  // 마력을 느낄 만큼(0.18 이상)인 아이는 열에 넷쯤, 크게 될 재능(0.6 이상)은 스물에 하나쯤
  const manaPotential = Math.min(1, Math.pow(rng.next(), 3.5) * 1.15);

  const stats = {};
  for (const s of STATS) stats[s.id] = rng.int(1, 4) + (fam.statBias[s.id] ?? 0) * 0.3;
  const skills = {};
  for (const s of SKILLS) skills[s.id] = 0;

  game.player = {
    id: me.id,
    name, lastName, sex,
    familyId,
    familyIds,
    stats, skills, talents,
    manaPotential,
    manaAwakened: false,
    mana: 0,
    fatigue: 0,
    stress: 0,
    money: 0, // 내 주머니 (집안 돈과 별도)
    familyMoney: fam.money,
    injuries: [],
    alive: true,
  };
  runHooks('newGame', game, rng);
  game.nextId = getNextId();
  game.news = [{ text: `${fullName(father)}와(과) ${mother.name}의 집에 아이가 태어났다. 이름은 ${name}.`, rel: 100 }];
  game.chronicle.push({ y: game.date.year, m: game.date.month, text: `${name}, ${fam.name}에서 태어나다.`, rel: 100 });
  me.history.push({ y: game.date.year, m: game.date.month, text: `${fam.name}에서 태어났다.` });
  return game;
}

export const me = (game) => byId(game, game.player.id);
export const playerAgeMonths = (game) => me(game).ageMonths;
export const playerAge = (game) => Math.floor(playerAgeMonths(game) / 12);
export const family = (game) => FAMILIES.find((f) => f.id === game.player.familyId);
export const monthInfo = (game) => MONTHS[game.date.month - 1];

// 나이에 따른 한 달 행동 칸 수
export function slotsFor(game) {
  const a = playerAge(game);
  if (a < 3) return 0;
  if (a < 7) return 2;
  if (a < 12) return 3;
  return 4;
}

// 성장 배율: 어릴수록 빨리 큰다. 피로하면 덜 큰다.
export function growthFactor(game) {
  const a = bodyAgeOf(me(game));
  const age = a < 12 ? 1.25 : a < 18 ? 1.0 : a < 30 ? 0.7 : a < 45 ? 0.45 : 0.25;
  const f = game.player.fatigue;
  const fat = f > 80 ? 0.4 : f > 60 ? 0.7 : 1;
  return age * fat;
}

export function gainStat(game, id, base) {
  const p = game.player;
  // 높을수록 오르기 어렵다. 0.3: 한 달 행동 하나의 기본 성장 폭
  const g = 0.3 * base * p.talents[id] * growthFactor(game) * (1 - p.stats[id] / 125);
  p.stats[id] = Math.min(100, p.stats[id] + g);
  return g;
}
export function gainSkill(game, id, base, statId) {
  const p = game.player;
  const helper = statId ? 0.7 + p.stats[statId] / 100 : 1;
  const g = 0.3 * base * helper * growthFactor(game) * (1 - p.skills[id] / 120);
  p.skills[id] = Math.min(100, p.skills[id] + g);
  return g;
}

// 서클: 마력량과 마법 기술 둘 다 필요
const CIRCLE_MANA = [0, 15, 40, 80, 140, 230, 360, 540, 800, 1200];
const CIRCLE_SKILL = [0, 15, 30, 45, 60, 72, 84, 93, 98, 100];
export function circleOf(game) {
  const p = game.player;
  if (!p.manaAwakened) return 0;
  let c = 0;
  for (let i = 1; i < CIRCLE_MANA.length; i++) {
    if (p.mana >= CIRCLE_MANA[i] && p.skills.magic >= CIRCLE_SKILL[i]) c = i;
  }
  return c;
}

// 행동 고르기 → 이 달 보내기
export function endMonth(game, choices) {
  const rng = rngOf(game);
  const p = game.player;
  const results = [];
  const done = new Set();

  for (const c of choices) {
    const act = ACTIONS.find((a) => a.id === c.id);
    if (!act) continue;
    // 앞 칸에서 처지가 바뀌었으면(일자리를 잃었다, 끌려갔다, 갇혔다) 이 칸은 하지 못한다 (헤드: 갈래가 많아 생긴 오류 묶음)
    // 같은 일을 이미 이 달에 했으면 조용히 넘어가고, 다른 까닭이면 한 줄 남긴다.
    if (game.player.alive !== false && act.available && !act.available(game)) {
      if (!done.has(act.id)) results.push({ name: act.name, text: '사정이 바뀌어 하지 못했다.' });
      continue;
    }
    done.add(act.id);
    const text = act.run(game, rng, c);
    if (text) results.push({ name: act.name, text });
  }

  runHooks('afterActions', game, rng, results);

  const meP = me(game);
  meP.ageMonths += 1;

  // 아기 시절엔 행동 없이 자란다
  if (slotsFor(game) === 0) {
    for (const s of STATS) gainStat(game, s.id, 0.12);
  }

  // 마력: 15살 전엔 빠르게, 이후엔 느리게 계속 자란다
  const age = playerAge(game);
  if (p.manaAwakened) {
    const rate = age < 15 ? 0.9 : 0.12;
    p.mana += p.manaPotential * rate * (0.7 + rng.next() * 0.6);
  }

  // 부상: 시간이 지나면 낫지만 깊은 상처는 흉터로 남는다
  for (const inj of p.injuries) {
    inj.months -= 1;
    p.fatigue += 4;
    if (inj.months <= 0 && /물린|베인/.test(inj.name)) {
      me(game).history.push({ y: game.date.year, m: game.date.month, text: `${inj.name}이(가) 아물었지만 흉터가 남았다.` });
      (p.scars ??= []).push(inj.name);
    }
  }
  p.injuries = p.injuries.filter((i) => i.months > 0);

  // 피로와 스트레스 자연 회복
  p.fatigue = Math.max(0, p.fatigue - 12);
  p.stress = Math.max(0, p.stress - 6);

  // 과로하면 병이 난다
  if (p.fatigue > 85 && rng.chance(0.25)) {
    p.fatigue = 50;
    p.stress += 10;
    results.push({ name: '몸살', text: '무리한 탓에 앓아누웠다. 한동안 아무것도 못 했다.' });
  }

  // 집안 살림: 가족의 벌이가 집안 돈이 된다
  const fam = game.player.familyIds.map((id) => byId(game, id)).filter((x) => x && x.alive && !x.away && x.job !== 'child');
  const income = fam.reduce((s, x) => s + (JOBS[x.job]?.income ?? 2), 0);
  // 살림이 넉넉할수록 씀씀이와 세금도 커진다 (집안 돈이 끝없이 쌓이지 않게)
  const upkeep = 2 + game.player.familyIds.length + (game.world.famine ? 4 : 0) + Math.floor(game.player.familyMoney * 0.03);
  p.familyMoney = Math.max(0, p.familyMoney + income - upkeep);

  // 세계 흐름
  worldTick(game, rng);

  // NPC 한 달
  const sim = simulateMonth(game, rng);
  runHooks('afterNpc', game, rng, sim);
  // 새로 태어난 동생은 가족에 넣는다
  for (const x of game.people) {
    if (!x.isPlayer && x.ageMonths === 0 && x.alive && (x.fatherId === game.player.familyIds[0])) {
      if (!game.player.familyIds.includes(x.id)) { game.player.familyIds.push(x.id); x.known = true; x.affection = 30; }
    }
  }

  // 날짜 넘기기
  game.date.month += 1;
  if (game.date.month > 12) { game.date.month = 1; game.date.year += 1; }

  // 이번 달 소식 고르기: 관계 × 사건 크기
  const scored = sim.map((e) => {
    const rel = Math.max(...e.who.map((id) => relevance(game, byId(game, id))));
    return { text: e.text, rel, score: rel * e.weight };
  });
  for (const e of scored) game.chronicle.push({ y: game.date.year, m: game.date.month, text: e.text, rel: e.rel });
  scored.sort((a, b) => b.score - a.score);
  const news = scored.filter((e) => e.rel >= 40 || e.score >= 16).slice(0, 4);
  // 소문으로 모르는 사람 이야기도 하나쯤
  const rumor = scored.find((e) => !news.includes(e) && rng.chance(0.5));
  if (rumor && news.length < 4) news.push(rumor);
  for (const w of game.worldNews ?? []) news.unshift({ text: w, rel: 60 });
  game.worldNews = [];
  game.news = news;
  game.lastResults = results;

  runHooks('afterMonth', game, rng);

  // 사건
  game.pendingEvent = pickEvent(game, rng);

  // 가족이 다 죽으면 고아
  checkPlayerState(game, rng);
  runHooks('endOfMonth', game, rng, results);
  game.nextId = getNextId();
  return results;
}

function worldTick(game, rng) {
  const w = game.world;
  game.worldNews = game.worldNews ?? [];
  if (w.famine) {
    w.famineMonths -= 1;
    if (w.famineMonths <= 0) { w.famine = false; game.worldNews.push('흉년이 끝나 간다. 올해 밀은 제대로 여물었다.'); }
  } else if (game.date.month === 8 && rng.chance(0.12)) {
    w.famine = true; w.famineMonths = 10;
    game.worldNews.push('여름 가뭄으로 밀이 말라 죽고 있다. 흉년이 들 것 같다.');
  }
  if (w.plague) {
    w.plagueMonths -= 1;
    if (w.plagueMonths <= 0) { w.plague = false; game.worldNews.push('돌림병이 잦아들었다.'); }
  } else if (rng.chance(0.004)) {
    w.plague = true; w.plagueMonths = 4;
    game.worldNews.push('하르펜에서 돌림병이 돌기 시작했다는 소식이 들려온다.');
  }
}

function checkPlayerState(game, rng) {
  const p = game.player;
  // 아주 드물게 어른이 병으로 갑자기 죽는다 (한 번뿐인 삶의 무게).
  // 아이는 죽지 않는다: 이을 자식이 없을 때라 삶 전체가 바로 끝나 버려서, 처음 몇 분 만에 게임이 끝나는 일이 있었다.
  const age = playerAge(game);
  if (age < 16) return;
  let risk = 0.0002;
  if (game.world.plague) risk *= 4;
  if (p.fatigue > 90) risk *= 3;
  if (rng.chance(risk)) {
    p.alive = false;
    kill(game, me(game), '병');
    game.over = true;
  }
}

export function availableActions(game) {
  const list = ACTIONS.filter((a) => a.available(game) && HOOKS.actionFilter.every((f) => f(game, a) !== false));
  // 여러 갈래의 잠금(감옥, 포로, 원정 등)이 겹쳐 할 일이 하나도 남지 않으면, 적어도 쉬기는 할 수 있게 (헤드)
  if (!list.length && slotsFor(game) > 0) return ACTIONS.filter((a) => a.id === 'rest');
  return list;
}

export function knownPeople(game) {
  return game.people.filter((x) => x.known && !x.isPlayer);
}

export { living, byId, ageYears, fullName };
