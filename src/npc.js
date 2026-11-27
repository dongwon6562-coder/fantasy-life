// 마을 NPC 생성과 한 달 시뮬레이션.
// 플레이어가 보든 말든 NPC는 매달 늙고, 일하고, 사랑하고, 아이를 낳고, 떠나고, 죽는다.
import {
  MALE_NAMES, FEMALE_NAMES, LAST_NAMES, JOBS, ADULT_JOB_CHOICES, TRAITS,
} from './data.js';

let nextId = 1;
export function setNextId(n) { nextId = n; }
export function getNextId() { return nextId; }

function pickTraits(rng, n = 2) {
  const out = [];
  while (out.length < n) {
    const t = rng.pick(TRAITS);
    if (out.includes(t.id) || (t.opp && out.includes(t.opp))) continue;
    out.push(t.id);
  }
  return out;
}

export function makePerson(rng, { sex, ageMonths, lastName, job, traits, fatherId, motherId } = {}) {
  sex = sex ?? (rng.chance(0.5) ? 'm' : 'f');
  return {
    id: nextId++,
    name: rng.pick(sex === 'm' ? MALE_NAMES : FEMALE_NAMES),
    lastName: lastName ?? rng.pick(LAST_NAMES),
    sex,
    ageMonths: ageMonths ?? 0,
    job: job ?? 'child',
    skill: 0, // 직업 숙련
    traits: traits ?? pickTraits(rng),
    alive: true,
    away: false, // 마을을 떠남
    spouseId: null,
    fatherId: fatherId ?? null,
    motherId: motherId ?? null,
    childIds: [],
    health: rng.int(70, 100),
    wealth: rng.int(5, 40),
    // 플레이어와의 관계
    known: false,
    affection: 0,
    history: [], // 인물 수첩에 쌓이는 삶의 기록 { y, m, text }
    deathCause: null,
  };
}

// 48단계: 한 마을에 같은 이름이 서넛씩 있지 않게. 뽑은 이름이 이미 있으면 목록을 일정한 걸음으로 건너뛰어
// 안 겹치는 이름을 고른다(난수를 더 쓰지 않아 다른 흐름은 그대로).
export function freshName(name, sex, taken) {
  if (!taken.has(name)) return name;
  const pool = sex === 'm' ? MALE_NAMES : FEMALE_NAMES;
  const i0 = Math.max(0, pool.indexOf(name));
  for (let k = 1; k < pool.length; k++) { const c = pool[(i0 + k * 7) % pool.length]; if (!taken.has(c)) return c; }
  return name;
}
const namesAt = (people, place) => new Set(people.filter((x) => x.alive && !x.away && (x.place ?? 'ern') === place).map((x) => x.name));

export const ageYears = (p) => Math.floor(p.ageMonths / 12);
// 몸 나이: 오래 사는 종족은 천천히 늙는다 (src/races/가 바꾼다). 늙음·죽음·출산은 이 값을 쓴다.
let bodyAgeFn = (p) => ageYears(p);
export const bodyAgeOf = (p) => bodyAgeFn(p);
export function setBodyAge(fn) { bodyAgeFn = fn; }
export const getBodyAge = () => bodyAgeFn; // 앞의 규칙을 감싸서 새 규칙을 얹을 때 (불로: src/ageless/)
// 다른 종족끼리, 엘프끼리는 아이가 드물다 (src/races/가 바꾼다)
let fertilityFn = () => 1;
export function setFertility(fn) { fertilityFn = fn; }
export const fullName = (p) => `${p.name} ${p.lastName}`;
export const has = (p, t) => p.traits.includes(t);

// 처음 마을 만들기: 몇 개의 가구를 만든다.
export function generateVillage(rng) {
  const people = [];
  const add = (p) => { p.name = freshName(p.name, p.sex, new Set(people.map((x) => x.name))); people.push(p); return p; };
  const couple = (job, wifeJob, ageY) => {
    const ln = rng.pick(LAST_NAMES);
    const h = add(makePerson(rng, { sex: 'm', ageMonths: ageY * 12 + rng.int(0, 11), lastName: ln, job }));
    const w = add(makePerson(rng, {
      sex: 'f', ageMonths: (ageY - rng.int(0, 5)) * 12 + rng.int(0, 11), lastName: ln, job: wifeJob ?? job,
    }));
    h.spouseId = w.id; w.spouseId = h.id;
    h.skill = rng.int(30, 70); w.skill = rng.int(20, 60);
    const kids = rng.int(0, 3);
    for (let i = 0; i < kids; i++) {
      const maxAge = Math.max(0, Math.min(ageY - 18, 20));
      const kAge = rng.int(0, maxAge);
      const k = add(makePerson(rng, {
        ageMonths: kAge * 12 + rng.int(0, 11), lastName: ln,
        job: kAge >= 15 ? rng.pick(ADULT_JOB_CHOICES) : 'child', fatherId: h.id, motherId: w.id,
      }));
      if (kAge >= 15) k.skill = rng.int(5, 30);
      h.childIds.push(k.id); w.childIds.push(k.id);
    }
    return h;
  };

  couple('elder', 'weaver', rng.int(52, 60));
  couple('smith', 'laborer', rng.int(35, 45));
  couple('baker', 'baker', rng.int(30, 42));
  couple('innkeeper', 'cook', rng.int(38, 50));
  couple('miller', 'farmer', rng.int(40, 50));
  couple('farmer', 'farmer', rng.int(25, 35));
  couple('farmer', 'farmer', rng.int(30, 45));
  couple('hunter', 'herbalist', rng.int(28, 40));
  couple('carpenter', 'weaver', rng.int(26, 36));
  // 혼자 사는 사람들
  add(makePerson(rng, { sex: 'm', ageMonths: rng.int(55, 68) * 12, job: 'priest', traits: ['pious', rng.pick(['kind', 'reserved'])] }));
  add(makePerson(rng, { sex: rng.chance(0.5) ? 'm' : 'f', ageMonths: rng.int(45, 62) * 12, job: 'hedge_mage', traits: ['reserved', rng.pick(['kind', 'greedy', 'ambitious'])] }));
  add(makePerson(rng, { sex: 'm', ageMonths: rng.int(20, 30) * 12, job: 'guard' }));
  add(makePerson(rng, { sex: 'f', ageMonths: rng.int(19, 26) * 12, job: 'adventurer', traits: ['brave', rng.pick(['ambitious', 'drunkard'])] }));
  add(makePerson(rng, { sex: rng.chance(0.5) ? 'm' : 'f', ageMonths: rng.int(18, 24) * 12, job: 'laborer' }));
  for (const p of people) if (p.job !== 'child' && p.skill === 0) p.skill = rng.int(30, 70);
  return people;
}

// 사람 찾기: 백 년 넘게 이어 하면 사람이 수백 명이라 매번 처음부터 훑는 게 한 달 시간의 큰 몫이었다 (20단계 헤드).
// id → 자리 번호를 기억해 두고, 그 자리에 그 사람이 그대로 있는지 확인한 뒤 돌려준다. 어긋나면 다시 만든다.
const PIDX = new WeakMap();
function reindex(game) {
  const m = new Map();
  game.people.forEach((p, i) => { if (p && !m.has(p.id)) m.set(p.id, i); });
  const c = { arr: game.people, m, n: game.people.length, last: game.people[game.people.length - 1] };
  PIDX.set(game, c);
  return c;
}
export const byId = (game, id) => {
  if (id == null || !game.people) return undefined;
  let c = PIDX.get(game);
  const P = game.people;
  // 배열이 바뀌었거나, 사람이 늘거나 빠졌으면(끝 사람이 달라짐) 다시 만든다
  if (!c || c.arr !== P || c.n !== P.length || c.last !== P[P.length - 1]) c = reindex(game);
  let i = c.m.get(id);
  if (i != null && game.people[i]?.id === id) return game.people[i];
  if (i == null) return undefined;
  // 가운데서 빠지고 끝에 들어와 자리가 밀린 경우
  c = reindex(game);
  i = c.m.get(id);
  return i != null ? game.people[i] : undefined;
};
export const living = (game) => game.people.filter((p) => p.alive && !p.away);

// 관계 점수: 소식을 고를 때 쓴다. 가족 > 친구 > 아는 사람 > 모르는 사람
export function relevance(game, p) {
  if (!p) return 0;
  if (game.player.familyIds.includes(p.id)) return 100;
  if (p.known) return 40 + Math.max(0, p.affection) / 2;
  return 8;
}

// 한 달 시뮬레이션. 일어난 일을 events 배열로 돌려준다 { text, who:[ids], weight }
export function simulateMonth(game, rng) {
  const events = [];
  const { year, month } = game.date;
  const note = (p, text) => p.history.push({ y: year, m: month, text });
  const ev = (text, who, weight) => events.push({ text, who, weight });

  const alive = living(game);

  for (const p of alive) {
    if (p.isPlayer) continue;
    p.ageMonths += 1;
    const age = ageYears(p);

    // 일과 숙련
    if (p.job !== 'child') {
      const gain = (has(p, 'diligent') ? 0.5 : has(p, 'lazy') ? 0.12 : 0.28) * (age < 40 ? 1 : 0.5);
      const before = p.skill;
      p.skill = Math.min(100, p.skill + gain * rng.float(0.5, 1.5));
      p.wealth += Math.round((JOBS[p.job]?.income ?? 2) * (0.6 + p.skill / 120)) - 3;
      if (has(p, 'drunkard')) p.wealth -= 1;
      // 쌓인 돈은 쓰인다: 집을 늘리고 혼수를 대고 빚을 놓다 떼인다. 이것이 없으면 마을 사람 재산이 60년 내내 불기만 했다 (17단계 헤드)
      if (p.wealth > 200) p.wealth -= Math.round((p.wealth - 200) * 0.006);
      else if (p.wealth < -60) p.wealth += Math.max(1, Math.round(-p.wealth * 0.004)); // 빚은 친척이 갚아 주거나 일부 탕감된다
      if (Math.floor(before / 25) < Math.floor(p.skill / 25) && p.skill >= 50) {
        const t = `${JOBS[p.job].name}로서 솜씨가 늘어 마을에서 인정받기 시작했다.`;
        note(p, t);
        ev(`${fullName(p)}의 ${JOBS[p.job].name} 솜씨가 좋아졌다는 말이 돈다.`, [p.id], 1);
      }
    }

    // 15살: 일을 고른다 (부모 일을 잇거나 다른 길로)
    if (p.job === 'child' && p.ageMonths >= 15 * 12) {
      const father = byId(game, p.fatherId);
      let job;
      if (father && father.job !== 'child' && rng.chance(0.45)) job = father.job === 'elder' ? 'farmer' : father.job;
      else job = rng.pick(ADULT_JOB_CHOICES);
      if (job === 'adventurer' && has(p, 'timid')) job = 'farmer';
      p.job = job;
      p.skill = rng.int(3, 15);
      note(p, `성인이 되어 ${JOBS[job].name}의 길을 걷기 시작했다.`);
      ev(`${fullName(p)}이(가) 성인이 되어 ${JOBS[job].name} 일을 시작했다.`, [p.id], 2);
    }

    // 건강과 죽음 (몸 나이로)
    const body = bodyAgeOf(p);
    let deathRisk = 0.0004;
    if (body >= 50) deathRisk += (body - 50) * 0.0006;
    if (body >= 70) deathRisk += (body - 70) * 0.003;
    if (age < 3) deathRisk += 0.002; // 어린아이 사망은 이 시대에 흔하다
    if (game.world.plague) deathRisk *= 3;
    if (game.world.famine) deathRisk *= 1.8;
    if (p.job === 'adventurer') deathRisk += 0.0025;
    if (p.job === 'hunter') deathRisk += 0.0006;
    if (rng.chance(deathRisk)) {
      kill(game, p, body >= 60 ? '노환' : p.job === 'adventurer' ? '의뢰 중 마물에게' : rng.pick(['병', '열병', '사고']));
      ev(deathText(p), [p.id], 5);
      continue;
    }

    // 모험가는 가끔 마을을 떠난다
    if (p.job === 'adventurer' && age >= 18 && rng.chance(0.006)) {
      p.away = true;
      note(p, '더 큰 의뢰를 찾아 하르펜으로 떠났다.');
      ev(`${fullName(p)}이(가) 더 큰 의뢰를 찾아 마을을 떠났다.`, [p.id], 3);
      continue;
    }
    // 젊은이 일부는 도시로 떠난다
    if (p.job !== 'child' && age >= 16 && age <= 25 && !p.spouseId && (has(p, 'ambitious') ? rng.chance(0.004) : rng.chance(0.0008))) {
      p.away = true;
      note(p, '도시에서 일을 찾겠다며 마을을 떠났다.');
      ev(`${fullName(p)}이(가) 도시에서 일을 찾겠다며 마을을 떠났다.`, [p.id], 3);
      continue;
    }
  }

  // 연애와 결혼
  const singles = living(game).filter((p) => !p.spouseId && ageYears(p) >= 17 && ageYears(p) <= 40 && !p.isPlayer);
  for (const a of singles) {
    if (a.spouseId || a.sex !== 'm') continue;
    if (!rng.chance(0.012)) continue;
    const valid = singles.filter((b) => b.sex === 'f' && !b.spouseId
      && Math.abs(ageYears(a) - ageYears(b)) <= 8
      && (b.fatherId == null || b.fatherId !== a.fatherId));
    if (!valid.length) continue;
    const b = rng.pick(valid);
    a.spouseId = b.id; b.spouseId = a.id;
    b.lastName = a.lastName;
    note(a, `${b.name}와(과) 혼인했다.`);
    note(b, `${a.name}와(과) 혼인했다.`);
    ev(`${fullName(a)}와(과) ${b.name}이(가) 성광교 예배당에서 혼인했다.`, [a.id, b.id], 3);
  }

  // 출산
  for (const w of living(game)) {
    if (w.isPlayer || w.sex !== 'f' || !w.spouseId || ageYears(w) < 17 || bodyAgeOf(w) > 42) continue;
    const h = byId(game, w.spouseId);
    if (!h || !h.alive) continue;
    const kids = w.childIds.length;
    const lastChild = kids ? byId(game, w.childIds[kids - 1]) : null;
    if (lastChild && lastChild.ageMonths < 18) continue;
    if (!rng.chance((kids >= 4 ? 0.004 : 0.018) * fertilityFn(h, w))) continue;
    const baby = makePerson(rng, { lastName: h.lastName, fatherId: h.id, motherId: w.id });
    baby.name = freshName(baby.name, baby.sex, namesAt(game.people, w.place ?? 'ern'));
    game.people.push(baby);
    w.childIds.push(baby.id); h.childIds.push(baby.id);
    note(w, `${baby.sex === 'm' ? '아들' : '딸'} ${baby.name}을(를) 낳았다.`);
    note(h, `${baby.sex === 'm' ? '아들' : '딸'} ${baby.name}이(가) 태어났다.`);
    note(baby, '태어났다.');
    ev(`${fullName(h)}의 집에 ${baby.sex === 'm' ? '아들' : '딸'}이 태어났다. 이름은 ${baby.name}.`, [w.id, h.id, baby.id], 2);
  }

  // 마을에 새 사람이 들어온다 (인구가 너무 줄지 않게. 60년을 돌리면 47명에서 36명까지 줄어 문턱을 40으로 올림, 17단계 헤드)
  if (living(game).length < 40 && rng.chance(0.04)) {
    const p = makePerson(rng, { ageMonths: rng.int(18, 35) * 12, job: rng.pick(ADULT_JOB_CHOICES) });
    p.name = freshName(p.name, p.sex, namesAt(game.people, 'ern'));
    p.skill = rng.int(15, 50);
    game.people.push(p);
    note(p, `${JOBS[p.job].name} 일을 하러 에른 마을로 이사 왔다.`);
    ev(`낯선 ${p.sex === 'm' ? '남자' : '여자'}가 마을에 정착했다. ${JOBS[p.job].name}인 ${fullName(p)}라고 한다.`, [p.id], 2);
  }

  return events;
}

function deathText(p) {
  const c = p.deathCause;
  if (c === '노환') return `${fullName(p)}이(가) 노환으로 세상을 떠났다. 향년 ${ageYears(p)}세.`;
  if (c?.includes('마물')) return `${fullName(p)}이(가) 의뢰 중 마물에게 목숨을 잃었다는 소식이 왔다.`;
  return `${fullName(p)}이(가) ${c}(으)로 세상을 떠났다. ${ageYears(p)}세였다.`;
}

export function kill(game, p, cause) {
  p.alive = false;
  p.deathCause = cause;
  p.history.push({ y: game.date.year, m: game.date.month, text: `${cause}(으)로 세상을 떠났다.` });
  const s = byId(game, p.spouseId);
  if (s) {
    s.history.push({ y: game.date.year, m: game.date.month, text: `배우자 ${p.name}을(를) 잃었다.` });
    s.spouseId = null;
  }
}
