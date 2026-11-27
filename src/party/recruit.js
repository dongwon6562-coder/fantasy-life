// 동료 모으기와 함께 지내기.
// - 아는 사람: 친한 모험가·사냥꾼·경비병·마법사·사제에게 함께 가자고 청한다 (충성은 친밀도에서).
// - 용병: 큰 고장 주점에서 달삯을 주고 쓴다 (돈이 끊기면 떠난다).
// - 길드: 모험가 길드 회원이면 길드가 같은 등급 모험가를 소개한다 (보수의 몫을 나눈다).
// 매달: 동료는 나를 따라다니고, 다친 동료는 쉬고, 충성이 오르내리고, 바닥나면 떠난다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { living, byId, makePerson, ageYears, fullName } from '../npc.js';
import { traitName } from '../data.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, stress } from '../adventure/core.js';
import { fac } from '../factions.js';
import { P, members, join, leave, ROLES, roleOfJob, FIGHT_JOBS, MAX_COMPANIONS, compPow, addLoyalty, LOYAL_WORD } from './core.js';
import { opener } from '../narrative/openers.js';

const MERC_TOWNS = ['harfen', 'verden', 'leocast', 'gruental'];
const traitWord = (p) => p.traits.slice(0, 2).map(traitName).join(', ');

/* ---------- 동료 모으기 ---------- */
ACTIONS.push({
  id: 'gather_party',
  name: '동료 모으기',
  icon: 'heart',
  desc: '함께 미궁과 의뢰에 나설 동료를 구한다. 아는 사람, 주점의 용병, 길드의 소개.',
  available: (g) => isAdult(g) && !traveling(g) && P(g).members.length < MAX_COMPANIONS && !sceneQueued(g, 'gather_party'),
  run(g, rng) { queueScene(g, 'gather_party', { offers: makeOffers(g, rng) }); return opener(g, 'gather_party', rng); },
});

// 이 고장에서 청할 수 있는 아는 사람
function friendsHere(g) {
  const here = L(g).place;
  return living(g).filter((p) => !p.isPlayer && p.known && !p.comp && !p.away && p.affection >= 25 && FIGHT_JOBS.includes(p.job)
    && (p.place ?? 'ern') === here && ageYears(p) >= 16 && ageYears(p) <= 52 && !g.player.familyIds?.includes(p.id) && p.id !== g.people.find((x) => x.isPlayer)?.spouseId)
    .sort((a, b) => b.affection - a.affection).slice(0, 3);
}

// 용병·길드 후보는 장면 데이터에 담아 둔다 (같은 장면을 다시 열어도 같은 사람)
function makeOffers(g, rng) {
  const here = L(g).place;
  const offers = [];
  if (MERC_TOWNS.includes(here)) {
    for (let i = 0; i < 2; i++) {
      const skill = rng.int(25, 60);
      const job = rng.pick(['adventurer', 'adventurer', 'hunter', 'guard']);
      offers.push({ kind: 'merc', sex: rng.chance(0.7) ? 'm' : 'f', age: rng.int(19, 40), skill, job, role: roleOfJob(job, rng), wage: Math.round(3 + skill / 9 + (here === 'leocast' ? 2 : 0)) });
    }
    if (rng.chance(0.35)) offers.push({ kind: 'merc', sex: rng.chance(0.5) ? 'm' : 'f', age: rng.int(22, 45), skill: rng.int(40, 70), job: 'hedge_mage', role: 'mage', wage: rng.int(9, 14) });
  }
  const gd = fac(g, 'guild');
  if (gd?.member) {
    const skill = 25 + gd.rank * 10 + rng.int(0, 10);
    const job = 'adventurer';
    offers.push({ kind: 'guild', sex: rng.chance(0.6) ? 'm' : 'f', age: rng.int(18, 35), skill, job, role: rng.pick(['blade', 'archer', 'scout', 'healer', 'mage']), wage: 0 });
  }
  return offers;
}

defineScene('gather_party', {
  title: () => '동료 모으기',
  text: (g, s) => {
    const cur = members(g);
    const fr = friendsHere(g);
    return `지금 동료: ${cur.length ? cur.map((p) => `${p.name}(${ROLES[p.comp.role].name})`).join(', ') : '없음'}. 자리는 ${MAX_COMPANIONS - cur.length}개 남았다.${fr.length ? ` 함께 가자고 청해 볼 만한 사람: ${fr.map((p) => `${p.name}(${traitWord(p)})`).join(', ')}.` : ''}${s.offers?.length ? ` ${MERC_TOWNS.includes(L(g).place) ? '주점 구석에 칼을 찬 사람들이 앉아 있다.' : ''}${s.offers.some((o) => o.kind === 'guild') ? ' 길드 접수원이 소개할 사람이 있다고 한다.' : ''}` : ''}`;
  },
  choices: (g, s) => {
    const out = friendsHere(g).map((p) => ({ label: `${p.name}에게 함께 가자고 청한다`, key: `f:${p.id}` }));
    (s.offers ?? []).forEach((o, i) => out.push({ label: o.kind === 'guild' ? `길드가 소개한 ${J(ROLES[o.role].name, '을/를')} 만난다` : `용병 ${ROLES[o.role].name} (솜씨 ${o.skill < 40 ? '보통' : o.skill < 55 ? '좋음' : '뛰어남'}, 달마다 은화 ${o.wage}닢)`, key: `o:${i}` }));
    out.push({ label: '오늘은 그만둔다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '혼자 걷는 길도 나쁘지 않다고 생각했다.';
    if (P(g).members.length >= MAX_COMPANIONS) return '자리가 이미 다 찼다. 더 데려갈 수는 없다.';
    const [kind, v] = key.split(':');
    if (kind === 'f') {
      const p = byId(g, +v);
      if (!p?.alive || p.comp) return '그 사람은 이미 떠나고 없었다.';
      const ok = rng.chance(Math.min(0.95, 0.25 + p.affection / 120 + (p.traits.includes('brave') ? 0.15 : 0) - (p.traits.includes('timid') ? 0.25 : 0) - (p.spouseId ? 0.2 : 0)));
      if (!ok) { p.affection = Math.max(-100, p.affection - 2); return `${J(p.name, '은/는')} 한참 망설이다 고개를 저었다. "${p.spouseId ? '집에 기다리는 사람이 있어서.' : p.traits.includes('timid') ? '나는 칼 들고 싸우는 사람이 아니야.' : '지금은 때가 아니야. 미안해.'}"`; }
      join(g, p, { role: roleOfJob(p.job, rng) });
      return `${J(p.name, '이/가')} 웃으며 손을 내밀었다. "언젠가 네가 이 말을 할 줄 알았어." ${J(ROLES[p.comp.role].name, '으로/로')} 함께한다.`;
    }
    const o = s.offers?.[+v];
    if (!o) return '찾던 사람은 이미 다른 일을 맡아 떠났다.';
    const p = makePerson(rng, { sex: o.sex, ageMonths: o.age * 12 + rng.int(0, 11), job: o.job });
    p.skill = o.skill; p.place = L(g).place; p.role = o.kind === 'guild' ? 'guild_mate' : 'mercenary';
    g.people.push(p);
    g.nextId = Math.max(g.nextId ?? 0, p.id + 1);
    if (o.kind === 'merc') {
      if (g.player.money < o.wage) return `${J(p.name, '은/는')} 첫 달 삯을 먼저 달라고 했다. 주머니가 비어 있었다.`;
      g.player.money -= o.wage;
      join(g, p, { role: o.role, hired: true, wage: o.wage, loyalty: 30 });
      return `${fullName(p)}. ${traitWord(p)} 사람이다. 첫 달 삯 은화 ${o.wage}닢을 받자 말없이 칼을 챙겼다. "돈이 나오는 동안은 등을 맡기지."`;
    }
    join(g, p, { role: o.role, loyalty: 40 });
    p.comp.guild = true;
    return `길드가 소개한 ${fullName(p)}. ${ROLES[o.role].name} 일을 맡겠다고 했다. 보수는 의뢰마다 나누기로 했다.`;
  },
});

/* ---------- 동료 돌보기 ---------- */
ACTIONS.push({
  id: 'party_manage',
  name: '동료들과 지내기',
  icon: 'heart',
  desc: '모닥불 가에서 이야기를 듣고, 몫을 나누고, 맞지 않는 동료와는 헤어진다.',
  available: (g) => isAdult(g) && members(g).length > 0 && !sceneQueued(g, 'party_manage'),
  run(g, rng) { queueScene(g, 'party_manage'); return opener(g, 'party_manage', rng); },
});

defineScene('party_manage', {
  title: () => '동료들',
  text: (g) => members(g).map((p) => `${p.name}(${ROLES[p.comp.role].name}, ${traitWord(p)}): ${LOYAL_WORD(p.comp.loyalty)}${p.comp.out > 0 ? ', 다쳐서 쉬는 중' : ''}${p.comp.hired ? `, 달삯 ${p.comp.wage}닢` : ''}.`).join(' '),
  choices: (g) => {
    const out = [{ label: '모닥불 가에서 이야기를 나눈다', key: 'talk' }];
    if (g.player.money >= members(g).length * 10) out.push({ label: `몫을 넉넉히 나눠 준다 (은화 ${members(g).length * 10}닢)`, key: 'share' });
    for (const p of members(g)) out.push({ label: `${J(p.name, '과/와')} 헤어진다`, key: `bye:${p.id}` });
    out.push({ label: '그만둔다', key: 'none' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const ms = members(g);
    if (!ms.length) return '불가에 둘러앉을 동료가 아무도 남아 있지 않았다.';
    if (key === 'talk') {
      stress(g, -6);
      for (const p of ms) { addLoyalty(p, p.traits.includes('reserved') ? 2 : 4); p.affection = Math.min(100, p.affection + 3); }
      const p = rng.pick(ms);
      return `${rng.pick([
        `${J(p.name, '이/가')} 고향 이야기를 꺼냈다. 강가 마을, 일찍 죽은 형, 처음 칼을 쥔 날.`,
        `${J(p.name, '은/는')} 오래전 함께 다니던 동료가 미궁에서 돌아오지 못한 이야기를 했다. 그 뒤로 불을 끄고 자지 못한다고.`,
        `술이 돌자 ${J(p.name, '이/가')} 노래를 불렀다. 모두 틀린 박자로 따라 불렀다.`,
        `${J(p.name, '이/가')} 물었다. "너는 왜 이 길을 걷지?" 대답을 한참 생각했다.`,
      ])} 불씨가 꺼질 때까지 이야기가 이어졌다.`;
    }
    if (key === 'share') {
      if (g.player.money < ms.length * 10) return '주머니를 뒤져 보니 돈이 모자랐다.';
      g.player.money -= ms.length * 10;
      for (const p of ms) addLoyalty(p, p.traits.includes('greedy') ? 12 : 6);
      return '전리품의 몫을 넉넉히 나눴다. 욕심 많은 동료일수록 입꼬리가 오래 올라가 있었다.';
    }
    if (key.startsWith('bye:')) {
      const p = byId(g, +key.slice(4));
      if (!p?.comp) return '그 사람은 이미 떠나고 없었다.';
      leave(g, p, `${J(g.player.name, '과/와')} 헤어졌다.`);
      p.affection = Math.max(-100, p.affection - 5);
      return `${J(p.name, '과/와')} 갈림길에서 헤어졌다. ${rng.pick(['서로 등을 보이고 걸었다. 뒤돌아보지 않았다.', '"몸 성히 지내." 짧은 인사였다.', '그는 아무 말 없이 고개만 숙였다.'])}`;
    }
    return '오늘은 각자 쉬었다.';
  },
});

/* ---------- 떠나는 동료 ---------- */
defineScene('comp_leave', {
  title: (g, s) => `${byId(g, s.id)?.name ?? '동료'}의 결심`,
  text: (g, s) => {
    const p = byId(g, s.id);
    if (!p) return '떠나려던 동료는 이미 보이지 않았다.';
    return `${J(p.name, '이/가')} 짐을 꾸리고 있었다. ${s.why} 붙잡을 수 있을지도 모른다.`;
  },
  choices: (g, s) => [...(g.player.money >= s.cost ? [{ label: `몫을 더 주겠다며 붙잡는다 (은화 ${s.cost}닢)`, key: 'pay' }] : []), { label: '진심으로 이야기해 본다', key: 'talk' }, { label: '보내 준다', key: 'go' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    if (!p?.comp) return '붙잡으려 했지만 이미 떠나고 없었다.';
    if (key === 'pay' && g.player.money >= s.cost) { g.player.money -= s.cost; addLoyalty(p, 25); return `${J(p.name, '은/는')} 은화 자루를 받고 다시 짐을 풀었다. 이번에는.`; }
    if (key === 'talk' && rng.chance(0.25 + g.player.stats.cha / 200 + p.affection / 300)) { addLoyalty(p, 20); return `밤새 이야기를 나눴다. 새벽에 ${J(p.name, '은/는')} 꾸린 짐을 다시 풀었다. "한 번만 더 믿어 보지."`; }
    const steal = p.traits.includes('greedy') && p.comp.hired && rng.chance(0.4);
    const lost = steal ? Math.min(g.player.money, rng.int(5, 25)) : 0;
    g.player.money -= lost;
    leave(g, p, `${g.player.name}의 곁을 떠났다.`);
    return `${J(p.name, '은/는')} 떠났다.${lost ? ` 아침에 보니 내 주머니에서 은화 ${lost}닢이 함께 사라져 있었다.` : ''}`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const life = L(g);
  for (const p of members(g)) {
    const c = p.comp;
    // 나를 따라다닌다
    p.place = life.travel ? life.travel.to : life.place;
    if (c.out > 0) c.out -= 1;
    // 용병은 달삯
    if (c.hired) {
      if (g.player.money >= c.wage) { g.player.money -= c.wage; addLoyalty(p, 0.5); }
      else { addLoyalty(p, -15); g.news.unshift({ text: `${J(p.name, '이/가')} 이번 달 삯을 받지 못했다. 눈빛이 달라졌다.`, rel: 90 }); }
    }
    // 성격: 싸움이 없으면 용감한 동료는 지루해하고, 겁 많은 동료는 편해한다
    if (p.traits.includes('brave')) addLoyalty(p, -0.4);
    if (p.traits.includes('timid')) addLoyalty(p, 0.2);
    if (p.traits.includes('kind') && life.notoriety > 20) addLoyalty(p, -1);
    if (p.traits.includes('cruel') && life.notoriety > 20) addLoyalty(p, 0.5);
    // 늙거나 오래 다치면 떠날 생각을 한다
    if (ageYears(p) >= 55 && rng.chance(0.08)) { leave(g, p, '나이가 들어 칼을 내려놓았다.'); g.news.unshift({ text: `${J(p.name, '이/가')} 이제 칼을 내려놓겠다고 했다. 무릎이 예전 같지 않다며 웃었다.`, rel: 90 }); continue; }
    if (c.loyalty < 15 && !sceneQueued(g, 'comp_leave') && rng.chance(0.5)) {
      const why = c.hired ? '삯도, 대우도 마음에 들지 않는다고 했다.' : p.traits.includes('timid') ? '이대로 가다간 죽을 것 같다고 했다.' : p.traits.includes('kind') && life.notoriety > 20 ? '네가 하는 일을 더는 볼 수 없다고 했다.' : '이 길이 더는 자기 길이 아닌 것 같다고 했다.';
      queueScene(g, 'comp_leave', { id: p.id, why, cost: 20 + (c.wage ?? 0) * 3 });
    }
  }
  // 죽거나 사라진 동료 정리
  const party = P(g);
  for (const id of [...party.members]) {
    const p = byId(g, id);
    if (!p || !p.alive || !p.comp) {
      party.members = party.members.filter((x) => x !== id);
      if (p && !p.alive) party.fallen.push({ name: `${p.name} ${p.lastName}`, year: g.date.year, cause: p.deathCause ?? '병' });
    }
  }
});

export { friendsHere, MERC_TOWNS, chron, note, PLACES };
