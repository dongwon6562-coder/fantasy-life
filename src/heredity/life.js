// 유전과 타고남: 시작 때 고른 것 입히기, 새 아이의 핏줄과 성격, 대 잇기, 세상이 알아보는 아이, 시기.
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat, setSkillBoost } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { TRAITS } from '../data.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, newsNow } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { lookChoices } from '../art/portrait.js';
import { raceOf } from '../races/index.js';
import { BIRTH_GIFTS, LEAP_WORD } from './data.js';
import { HD, clamp, STAT_IDS, personRng, bloodOf, validBlood, inheritTraits } from './core.js';

const mi = (g) => g.date.year * 12 + g.date.month;
// 큰 재능은 고른 그 사람에게만 (자식은 핏줄로 물려받는다)
export const giftOf = (g) => { const H = g.heredity; return H?.gift && H.owner === g.player?.id && BIRTH_GIFTS[H.gift] ? H.gift : null; };
setSkillBoost((g, id) => { const k = giftOf(g); return k ? BIRTH_GIFTS[k].skills[id] ?? 1 : 1; });

/* ---------- 시작 때 고를 거리 (화면용) ---------- */
export const MAX_TRAITS = 2;
export function birthOptions(race = 'human') {
  return {
    modes: [{ id: 'plain', name: '평범하게', line: '하늘이 주는 대로 태어난다. 무엇을 타고났는지는 자라면서 알게 된다.' }, { id: 'gift', name: '큰 재능 하나', line: '한 가지 길에 크게 타고난다. 세상도 그것을 알아본다.' }],
    gifts: Object.entries(BIRTH_GIFTS).map(([id, d]) => ({ id, name: d.name, line: d.line, icon: d.icon })),
    traits: TRAITS.map((t) => ({ id: t.id, name: t.name, opp: t.opp })),
    maxTraits: MAX_TRAITS,
    looks: lookChoices(race),
  };
}
// newGame({ birth }) 값 다듬기: { gift: id|null, traits: [id..], looks: { hair, eyes } }
export function cleanBirth(b, race = 'human') {
  if (!b || typeof b !== 'object') return null;
  const out = { gift: BIRTH_GIFTS[b.gift] ? b.gift : null, traits: [], looks: null };
  for (const t of Array.isArray(b.traits) ? b.traits : []) {
    const d = TRAITS.find((x) => x.id === t);
    if (!d || out.traits.includes(t) || (d.opp && out.traits.includes(d.opp)) || out.traits.length >= MAX_TRAITS) continue;
    out.traits.push(t);
  }
  if (b.looks && typeof b.looks === 'object') {
    const lc = lookChoices(race), lk = {};
    for (const k of ['hair', 'eyes']) if (Number.isInteger(b.looks[k]) && b.looks[k] >= 0 && b.looks[k] < lc[k].length) lk[k] = b.looks[k];
    if (Object.keys(lk).length) out.looks = lk;
  }
  return out;
}

function applyGift(g, rng, id) {
  const d = BIRTH_GIFTS[id], p = g.player, H = HD(g);
  H.gift = id; H.owner = p.id;
  for (const [s, m] of Object.entries(d.talents)) p.talents[s] = clamp(Math.max(1, p.talents[s] ?? 1) * m, 0.5, 1.9);
  if (id === 'magic') p.manaPotential = Math.max(p.manaPotential ?? 0, rng.float(0.72, 0.85));
  if (id === 'faith') {
    const mp = me(g);
    if (!mp.traits.includes('pious')) { if (mp.traits.length >= MAX_TRAITS) mp.traits.pop(); mp.traits.push('pious'); }
    if (g.faith) g.faith.devotion = Math.max(g.faith.devotion ?? 0, 55);
  }
}

HOOKS.newGame.push((g) => {
  const H = HD(g);
  const meP = me(g);
  const raw = g.birth; delete g.birth;
  // 부모·형제의 핏줄을 먼저 정한다 (아이들이 닮을 바탕)
  // 첫 아이의 재능은 game.js가 무작위로 정했다. 부모의 핏줄을 거기서 거꾸로 짐작해, 아이가 부모를 닮아 보이게 한다.
  const prng = personRng(g, meP.id, 5);
  const heavy = prng.chance(0.5) ? meP.fatherId : meP.motherId; // 마력은 한쪽에서 왔다
  for (const id of [meP.fatherId, meP.motherId]) {
    const par = byId(g, id);
    if (!par || validBlood(par.blood)) continue;
    const t = {};
    for (const st of STAT_IDS) t[st] = Math.round(clamp((g.player.talents[st] ?? 1) * 0.55 + prng.normal(1, 0.2) * 0.45, 0.5, 1.8) * 100) / 100;
    const m = g.player.manaPotential ?? 0;
    par.blood = { t, mana: Math.round(clamp(id === heavy ? m * prng.float(0.7, 1.15) : Math.pow(prng.next(), 3.5) * 0.6, 0, 1) * 100) / 100 };
  }
  const b = cleanBirth(raw, raceOf(meP));
  if (!b) return;
  const rng = personRng(g, meP.id, 7);
  H.chosen = true;
  if (b.traits.length) {
    const keep = meP.traits.filter((t) => !b.traits.includes(t) && !b.traits.some((x) => TRAITS.find((d) => d.id === x)?.opp === t));
    meP.traits = [...b.traits, ...keep].slice(0, MAX_TRAITS);
  }
  if (b.looks) meP.looks = b.looks;
  if (b.gift) applyGift(g, rng, b.gift);
});

/* ---------- 새 아이: 핏줄과 성격 ---------- */
function newborns(g) {
  const H = HD(g);
  const myId = g.player.id;
  for (const p of g.people) {
    if (p.isPlayer || !p.alive || p.ageMonths > 2 || validBlood(p.blood) || (p.fatherId == null && p.motherId == null)) continue;
    const fa = byId(g, p.fatherId), mo = byId(g, p.motherId);
    bloodOf(g, p);
    p.traits = inheritTraits(personRng(g, p.id, 3), fa, mo);
    if (p.blood.leap) {
      H.leaps += 1;
      if (p.fatherId === myId || p.motherId === myId) {
        const kid = p.sex === 'm' ? '아들' : '딸';
        note(g, `${kid} ${J(p.name, '은/는')} ${LEAP_WORD[p.blood.leap]}. 산파가 그렇게 말했다.`);
        if (p.blood.leap === 'mana') chron(g, `${me(g).name}의 ${kid} ${J(p.name, '이/가')} 태어났다. 핏줄에 없던 마력을 지녔다.`, 60);
      }
    }
  }
}
HOOKS.afterNpc.push((g) => newborns(g));

/* ---------- 대 잇기: 핏줄대로 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const H = HD(g);
  const oldP = old ? byId(g, old.id) : null;
  // 옛 주인의 핏줄을 남겨 두어 손주들이 닮게 한다
  if (oldP && old.talents) oldP.blood = { t: Object.fromEntries(STAT_IDS.map((s) => [s, Math.round((old.talents[s] ?? 1) * 100) / 100])), mana: Math.round((old.manaPotential ?? 0) * 100) / 100 };
  H.gift = null; H.owner = null; H.seen = false; H.envy = false;
  const child = me(g), p = g.player;
  const b = validBlood(child.blood) ? child.blood : null;
  if (!b || raceOf(child) !== 'human') return; // 다른 종족은 races가 재능을 다시 입힌다
  const kinRec = g.kin?.kids?.[child.id];
  for (const s of STAT_IDS) p.talents[s] = clamp(b.t[s] * (kinRec?.gift === s ? 1.15 : 1), 0.5, 1.9);
  p.manaPotential = Math.max(b.mana, kinRec?.gift === 'magic' ? 0.32 : 0);
  const age = ageYears(child);
  if (p.manaPotential <= 0.18) { p.manaAwakened = false; p.mana = 0; }
  else if (age >= 10 && p.manaPotential > 0.25 && !p.manaAwakened) { p.manaAwakened = true; p.mana = Math.max(p.mana ?? 0, p.manaPotential * Math.min(age, 15) * 2); }
});

/* ---------- 매달: 큰 마력은 저절로 깬다, 세상이 알아본다, 시기 ---------- */
const canSee = (g) => !!giftOf(g) && !HD(g).seen && playerAge(g) >= 7 && playerAge(g) <= 12 && !g.over && !L(g).travel;
const canEnvy = (g) => !!giftOf(g) && !HD(g).envy && playerAge(g) >= 11 && playerAge(g) <= 17 && !g.over && !L(g).travel;
HOOKS.afterMonth.push((g) => {
  const H = HD(g);
  const k = giftOf(g);
  if (!k || g.over) return;
  const p = g.player;
  if (k === 'magic' && !p.manaAwakened && playerAge(g) >= 6) {
    p.manaAwakened = true; p.mana = Math.max(p.mana ?? 0, 3);
    g.flags = g.flags ?? {}; g.flags.mana_known = true;
    note(g, '마력이 깨어났다. 감출 수 없을 만큼 컸다.');
    newsNow(g, `${J(p.name, '이/가')} 잠든 방의 촛불이 한꺼번에 일어섰다. 아이 몸에서 마력이 넘쳐흐른다.`);
  }
  if (mi(g) - H.eventAt < 3) return;
  const rng = personRng(g, mi(g), 11);
  if (canSee(g) && !sceneQueued(g, 'heredity_seen') && rng.chance(0.09)) { H.eventAt = mi(g); queueScene(g, 'heredity_seen', { gift: k }); }
  else if (canEnvy(g) && !sceneQueued(g, 'heredity_envy') && rng.chance(0.06)) { H.eventAt = mi(g); queueScene(g, 'heredity_envy', { gift: k }); }
});

const bump = (g, id, n) => { const p = g.player; p.skills[id] = Math.min(100, (p.skills[id] ?? 0) + n); };
const topStat = (k) => Object.entries(BIRTH_GIFTS[k].talents).sort((a, b) => b[1] - a[1])[0][0];

defineScene('heredity_seen', {
  need: (g, s) => canSee(g) && giftOf(g) === s.gift,
  title: (g, s) => BIRTH_GIFTS[s.gift].seen.who,
  text: (g, s) => `${BIRTH_GIFTS[s.gift].seen.text} 부모는 아이를 한 번, 서로를 한 번 보았다.`,
  choices: (g, s) => [
    { label: s.gift === 'magic' ? '마탑에 몇 해 맡긴다' : '몇 해 드나들며 배우게 한다', key: 'go' },
    { label: '아직 어리다며 돌려보낸다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const H = HD(g), k = s.gift, d = BIRTH_GIFTS[k];
    H.seen = true;
    if (key === 'no') { stress(g, -3); note(g, `${J(d.seen.who, '이/가')} 찾아왔지만 부모가 돌려보냈다.`); return `${J(d.seen.who, '은/는')} 서운한 얼굴로 돌아갔다. 문을 나서며 한마디 남겼다. "재능은 기다려 주지 않습니다." 그날 저녁 밥상은 조용했다.`; }
    H.went = true; // 열여섯 무렵 다시 부르는 장면(call.js)이 읽는다
    bump(g, d.seen.skill, 8);
    gainStat(g, topStat(k), 1.5);
    stress(g, 6);
    if (k === 'magic') { const p = g.player; if (!p.manaAwakened) { p.manaAwakened = true; p.mana = Math.max(p.mana ?? 0, 3); } p.mana += 5; }
    if (k === 'faith' && g.faith) g.faith.devotion = Math.min(100, (g.faith.devotion ?? 0) + 12);
    note(g, `${d.seen.who}에게 몇 해 배우러 다녔다.`);
    chron(g, `${J(g.player.name, '이/가')} 어린 나이에 ${d.seen.who}의 눈에 들었다.`, 50);
    return `철마다 사람이 와서 아이를 데려갔다가 데려다주었다. 낯선 곳의 밥은 짰고 같이 배우는 아이들은 다 더 컸다. 몇 해가 지나자 그 아이들의 눈빛이 달라졌다.`;
  },
});

defineScene('heredity_envy', {
  need: (g, s) => canEnvy(g) && giftOf(g) === s.gift,
  title: () => '우물가의 말',
  text: (g, s) => `또래보다 훨씬 앞서 가는 것을 마을 사람들이 모를 리 없다. 우물가에서 이웃 아낙들이 "저 집 아이는 뭘 먹여 키웠기에" 하고 수군거리고, 같이 놀던 아이 하나는 이제 마주치면 길을 돌아간다. ${BIRTH_GIFTS[s.gift].sign}`,
  choices: () => [
    { label: '그 아이를 찾아가 배운 것을 나눠 준다', key: 'share' },
    { label: '못 들은 척한다', key: 'ignore' },
    { label: '보란 듯이 더 앞서 나간다', key: 'show' },
  ],
  resolve(g, rng, s, key) {
    HD(g).envy = true;
    if (key === 'share') { gainStat(g, 'cha', 1); stress(g, -4); return '처음에는 퉁명스러웠다. 사흘째 되는 날부터는 그 아이가 먼저 찾아왔다. 다 메워지지는 않았지만, 길을 돌아가지는 않게 되었다.'; }
    if (key === 'ignore') { gainStat(g, 'wil', 1); stress(g, 2); return '못 들은 척했다. 들리는 것은 어쩔 수 없었다. 혼자 있는 시간이 조금 늘었다.'; }
    bump(g, BIRTH_GIFTS[s.gift].seen.skill, 2);
    stress(g, 4);
    const hurt = g.people.filter((p) => p.alive && p.known && !p.isPlayer && !g.player.familyIds.includes(p.id)).slice(0, 3);
    for (const p of hurt) p.affection = (p.affection ?? 0) - 4;
    return '더 일찍 일어나고 더 늦게 잤다. 차이는 더 벌어졌다. 우물가의 말은 줄지 않았고, 이제는 들으라는 듯 커졌다.';
  },
});

/* ---------- 저장 불러오기 ---------- */
HOOKS.migrate.push((g) => {
  const H = HD(g);
  for (const k of ['eventAt', 'leaps']) if (!Number.isFinite(H[k])) H[k] = 0;
  for (const k of ['chosen', 'seen', 'envy']) H[k] = !!H[k];
  if (!BIRTH_GIFTS[H.gift]) { H.gift = null; H.owner = null; }
  delete g.birth;
  for (const p of g.people ?? []) {
    if (p.blood && !validBlood(p.blood)) delete p.blood;
    if (p.looks) {
      const lc = lookChoices(raceOf(p)), lk = {};
      if (typeof p.looks === 'object') for (const k of ['hair', 'eyes']) if (Number.isInteger(p.looks[k]) && p.looks[k] >= 0 && p.looks[k] < lc[k].length) lk[k] = p.looks[k];
      if (Object.keys(lk).length) p.looks = lk; else delete p.looks;
    }
  }
});
