// 5단계: 다른 종족. 엘프·드워프·수인·하프엘프(설정 문서 "종족")를 집안 선택과 NPC에 넣는다.
// 종족마다 수명(몸이 늙는 빠르기)·성장·마력·재능·사는 곳·편견이 다르다.
// 오래 사는 종족은 인간 친구가 늙어 죽는 걸 보고, 세월을 흘려보낼 수 있다.
// 초상(페이블 스레드)은 p.race, p.beast, 그리고 bodyAge(p)를 읽는다.
import { J } from '../narrative/text.js';
import { makeRng } from '../rng.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { FAMILIES, STATS } from '../data.js';
import { me, playerAge, gainStat, gainSkill, endMonth, slotsFor } from '../game.js';
import { byId, ageYears, fullName, setBodyAge, bodyAgeOf, setFertility } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { setRelationHooks, remember } from '../relations.js';
import { isJailed } from '../crime.js';
import { realmOf, setRaceRule, setLocalPersonHook } from '../realms/index.js';
import { RACES, BEASTS, RACE_NAMES, RACE_FAMILIES, TREATMENT, TREAT_WORD, TREAT_SHIFT, childRace, fertility } from './data.js';

export { RACES, BEASTS, TREATMENT, TREAT_WORD };
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- 기본 ---------- */
export const raceOf = (p) => (p?.race && RACES[p.race] ? p.race : 'human');
export const raceName = (id) => RACES[id]?.name ?? '인간';
export const playerRace = (g) => raceOf(me(g));
// 몸 나이: 스무 살까지는 누구나 같이 크고, 그 뒤로는 종족마다 늙는 빠르기가 다르다
export const bodyAge = (p) => bodyAgeOf(p);
setBodyAge((p) => {
  const a = p.ageMonths / 12;
  const sc = RACES[raceOf(p)].scale;
  return Math.floor(a <= 20 ? a : 20 + (a - 20) * sc);
});
const longLived = (p) => RACES[raceOf(p)].scale < 0.5;
setFertility((h, w) => fertility(raceOf(h), raceOf(w)));

// 이름을 종족에 맞게 바꾼다 (성은 그대로 두거나 종족 성으로)
function nameFor(rng, p, race, { last = false } = {}) {
  const n = RACE_NAMES[race];
  if (!n) return;
  p.name = rng.pick(p.sex === 'm' ? n.m : n.f);
  if (last) p.lastName = race === 'beast' ? n.last[p.beast] ?? '회색 갈기' : rng.pick(n.last);
}
function setRace(p, race, rng, { rename = false, last = false, beast = null } = {}) {
  p.race = race;
  if (race === 'beast') p.beast = beast ?? p.beast ?? rng.pick(Object.keys(BEASTS));
  if (rename) nameFor(rng, p, race, { last });
}

/* ---------- 상태 ---------- */
// game.races: farewells(떠나보낸 인간 친구 수), lastFarewell, slightAt(편견 장면), drifted(흘려보낸 해)
export function raceState(g) {
  g.races ??= {};
  const R = g.races;
  R.farewells ??= 0;
  R.lastFarewell ??= 0;
  R.slightAt ??= 0;
  R.drifted ??= 0;
  R.aloof ??= false;
  return R;
}
const RS = raceState;
HOOKS.migrate.push((g) => {
  RS(g);
  g.player.race ??= raceOf(me(g));
  for (const p of g.people) if (!p.alive) p._rf = true;
});

/* ---------- 집안 고르기: 종족마다 한 집안 ---------- */
for (const f of RACE_FAMILIES) if (!FAMILIES.some((x) => x.id === f.id)) FAMILIES.push(f);
const familyRace = (g) => FAMILIES.find((f) => f.id === g.player.familyId)?.race ?? 'human';

// 플레이어에게 종족의 재능과 마력을 입힌다 (태어날 때, 대를 이을 때)
function applyRace(g, rng, { birth = false } = {}) {
  const p = g.player;
  const race = raceOf(me(g));
  const r = RACES[race];
  p.race = race;
  if (me(g).beast) p.beast = me(g).beast;
  const bt = race === 'beast' ? BEASTS[me(g).beast]?.talent ?? {} : {};
  for (const s of STATS) {
    const t = (r.talent[s.id] ?? 1) * (bt[s.id] ?? 1);
    // 인간은 재능의 편차가 크고(천재가 자주 나오고), 엘프·드워프는 고르다
    const dev = (p.talents[s.id] - 1) * (r.spread ?? 1);
    p.talents[s.id] = clamp((1 + dev) * t, 0.5, 1.9);
  }
  p.manaPotential = clamp(r.mana(p.manaPotential, rng), 0, 1);
  if (birth && r.skill) for (const [k, v] of Object.entries(r.skill)) p.skills[k] = (p.skills[k] ?? 0) + v * 0.3;
}

HOOKS.newGame.push((g) => {
  RS(g);
  // 따로 굴리는 주사위: 인간 집안의 게임은 예전과 똑같이 흘러가게 한다
  const rng = makeRng({ s: (g.rngState.s * 2654435761 + 97) >>> 0 });
  const race = familyRace(g);
  const fam = FAMILIES.find((f) => f.id === g.player.familyId);
  // 마을에도 다른 종족이 몇 있다: 떠돌이 마법사는 엘프일 수 있고, 대장장이는 드워프일 수 있다
  for (const p of g.people) {
    if (g.player.familyIds.includes(p.id) || p.isPlayer) continue;
    if (p.job === 'hedge_mage' && rng.chance(0.35)) { setRace(p, 'elf', rng, { rename: true, last: true }); p.ageMonths = rng.int(180, 420) * 12; }
    else if (p.job === 'smith' && !p.spouseId && rng.chance(0.3)) { setRace(p, 'dwarf', rng, { rename: true, last: true }); p.ageMonths = rng.int(50, 110) * 12; }
  }
  if (race === 'human') { g.player.race = 'human'; return; }
  const meP = me(g);
  const [fid, mid] = g.player.familyIds;
  const father = byId(g, fid), mother = byId(g, mid);
  const beast = race === 'beast' ? (Object.entries(RACE_NAMES.beast.last).find(([, v]) => v === g.player.lastName)?.[0] ?? rng.pick(Object.keys(BEASTS))) : null;
  const fr = fam.fatherRace ?? race, mr = fam.motherRace ?? race;
  setRace(father, fr, rng, { rename: fr !== 'human', beast });
  setRace(mother, mr, rng, { rename: mr !== 'human', beast });
  // 오래 사는 종족의 부모는 실제로는 훨씬 나이가 많다
  const old = (p, lo, hi) => { p.ageMonths = rng.int(lo, hi) * 12 + rng.int(0, 11); };
  if (fr === 'elf') old(father, 140, 420);
  if (mr === 'elf') old(mother, 120, 380);
  if (fr === 'dwarf') old(father, 60, 130);
  if (mr === 'dwarf') old(mother, 55, 120);
  for (const id of g.player.familyIds.slice(2)) { const s = byId(g, id); if (s) setRace(s, childRace(fr, mr, rng), rng, { rename: race !== 'half_elf', beast }); }
  setRace(meP, race, rng, { beast });
  applyRace(g, rng, { birth: true });
  g.news = [{ text: `${fullName(father)}와(과) ${mother.name}의 집에 ${raceName(race)} 아이가 태어났다. 이름은 ${g.player.name}.`, rel: 100 }];
});

// 대를 이으면 그 아이의 종족을 입는다
HOOKS.heir.push((g, rng) => {
  applyRace(g, rng);
  const R = RS(g);
  R.aloof = false; R.lastFarewell = 0;
});

/* ---------- 태어나는 아이의 종족 ---------- */
HOOKS.afterNpc.push((g, rng) => {
  for (const p of g.people) {
    if (p.ageMonths !== 0 || p.race) continue;
    const f = byId(g, p.fatherId), m = byId(g, p.motherId);
    if (!f && !m) continue;
    const r = childRace(raceOf(f), raceOf(m), rng);
    if (r === 'human') continue;
    setRace(p, r, rng, { beast: raceOf(f) === 'beast' ? f.beast : m?.beast });
  }
});

/* ---------- 다른 나라 수도의 사람들 ---------- */
const PLACE_RACES = {
  graubel: [['dwarf', 0.3]], serenia: [['elf', 0.2], ['half_elf', 0.12]], barka: [['beast', 0.3], ['dwarf', 0.1], ['half_elf', 0.06]],
  eisen: [['dwarf', 0.08]], solaris: [],
};
setLocalPersonHook((p, rng, place, r) => {
  let race = /드워프/.test(r.title ?? '') ? 'dwarf' : null;
  for (const [id, odds] of PLACE_RACES[place] ?? []) if (!race && rng.chance(odds)) race = id;
  if (!race) return;
  setRace(p, race, rng, { rename: true, last: true });
  if (race === 'elf') p.ageMonths = rng.int(60, 500) * 12;
  if (race === 'dwarf') p.ageMonths = Math.max(p.ageMonths, rng.int(40, 160) * 12);
});

/* ---------- 나라와 사람들의 대우 ---------- */
export const treatment = (g, realm, race = playerRace(g)) => (race === 'human' ? 'normal' : TREATMENT[realm]?.[race] ?? 'normal');
setRaceRule((g, realm) => treatment(g, realm));
// 처음 사귀는 사람이 나를 대하는 태도: 동족은 반기고, 그 고장이 꺼리는 종족은 덜 반긴다
setRelationHooks({
  fertility: (h, w) => fertility(raceOf(h), raceOf(w)),
  affinity: (g, p) => {
    const mine = playerRace(g);
    if (raceOf(p) === mine) return mine === 'human' ? 0 : 2;
    if (mine === 'human') return raceOf(p) === 'human' ? 0 : -1;
    if (raceOf(p) !== 'human') return 0;
    return TREAT_SHIFT[treatment(g, realmOf(p.place ?? 'ern'))] ?? 0;
  },
});

// 편견과 마주치는 일: 수인은 멸시, 엘프는 노예 사냥꾼, 하프엘프는 어느 쪽에도 속하지 못함
const SLIGHTS = {
  beast: [
    '여관 주인이 문간에서 손을 내저었다. "짐승은 마구간에서 자. 그게 싫으면 다른 데 알아보든가."',
    '장터에서 아이들이 개 짖는 소리를 흉내 내며 따라왔다. 어른들은 웃기만 했다.',
    '경비병이 길을 막고 통행증을 내놓으라고 했다. 내 앞의 인간들에게는 묻지 않은 것이다.',
  ],
  elf: [
    '술집 구석에서 사내 둘이 내 얼굴을 오래 보더니 수군거렸다. 남해로 가는 배에서 엘프 하나가 금화 몇 닢에 팔린다는 이야기였다.',
    '사제가 나를 보고 성호를 그었다. "빛의 여신은 숲의 사람들에게도 자비로우시지." 그 말투가 어딘가 낯설었다.',
  ],
  half_elf: [
    '마을 노파가 내 귀를 보고 혀를 찼다. "반쪽짜리는 어디에도 못 낀다니까."',
    '혼삿말이 오가던 집에서 소식이 끊겼다. 그 집 어머니가 "아이들이 귀가 뾰족하면 어쩌려고"라고 했다고 한다.',
  ],
  dwarf: ['인간 대장장이 조합이 내 물건을 장터에 내지 못하게 막았다. "산에서 내려온 놈들 때문에 우리가 굶는다."'],
};
HOOKS.afterMonth.push((g, rng) => {
  const R = RS(g);
  const race = playerRace(g);
  if (race === 'human' || g.over || traveling(g) || isJailed(g) || playerAge(g) < 8 || L(g).queue.length) return;
  if (mi(g) - R.slightAt < 8) return;
  const t = treatment(g, realmOf(L(g).place));
  const p = { welcome: 0, normal: 0.02, wary: 0.08, scorn: 0.16, banned: 0.2 }[t] ?? 0;
  if (!SLIGHTS[race] || !rng.chance(p)) return;
  R.slightAt = mi(g);
  queueScene(g, 'race_slight', { line: rng.int(0, SLIGHTS[race].length - 1), hunter: race === 'elf' && isAdult(g) && rng.chance(0.35) });
});
defineScene('race_slight', {
  title: (g) => `${raceName(playerRace(g))}라는 것`,
  text: (g, s) => (s.hunter ? '해 질 녘 숲길에서 사내 셋이 앞뒤를 막았다. 손에 쇠사슬과 자루를 들고 있다. "엘프는 상처 없이 데려가야 값이 나가." 노예 사냥꾼이다.' : SLIGHTS[playerRace(g)]?.[s.line] ?? SLIGHTS.beast[0]),
  choices: (g, s) => (s.hunter
    ? [{ label: '맞서 싸운다', key: 'fight' }, { label: '숲속으로 달아난다', key: 'run' }]
    : [{ label: '참는다', key: 'endure' }, { label: '똑바로 맞받아친다', key: 'retort' }, { label: '보란 듯이 더 잘해 보인다', key: 'prove' }]),
  resolve(g, rng, s, key) {
    if (key === 'fight') {
      queueFight(g, rng, { title: '노예 사냥꾼', intro: '쇠사슬이 바람을 갈랐다.', enc: { unit: 'thug', count: rng.int(2, 3), leader: rng.chance(0.3) ? 'bandit_chief' : null }, reward: { money: 8, renown: 1 }, avoidLabel: '틈을 보아 달아난다', avoidText: '나뭇가지에 얼굴이 긁히며 달렸다. 쇠사슬 소리가 뒤에서 멀어졌다.' }, { first: true });
      return '칼을 뽑았다. 숲은 엘프의 편이다.';
    }
    if (key === 'run') {
      if (check(rng, g.player.stats.agi + g.player.stats.sen / 2, 30)) { tired(g, 10); return '숲길을 벗어나 덤불 사이로 몸을 숨겼다. 사냥꾼들은 밤새 횃불을 들고 헤맸다. 이 고장도 이제 안전하지 않다.'; }
      g.player.injuries.push({ name: '쇠사슬에 감긴 발목', months: 2 });
      stress(g, 15);
      return '발목에 쇠사슬이 감겼다. 넘어지며 사슬을 끊어 내고 겨우 빠져나왔다. 그들의 얼굴을 잊지 않을 것이다.';
    }
    if (key === 'endure') { stress(g, 10); const w = gainStat(g, 'wil', 0.6); return `입을 다물었다. 이런 일은 처음이 아니고, 마지막도 아닐 것이다.${gains([up('의지', w)])}`; }
    if (key === 'retort') {
      if (check(rng, g.player.stats.cha * 0.6 + g.player.stats.wil * 0.4, 30)) { stress(g, -4); return '눈을 피하지 않고 한마디 했다. 상대는 더듬거리다 자리를 떴다. 지켜보던 사람 몇이 고개를 끄덕였다.'; }
      stress(g, 8); L(g).notoriety = (L(g).notoriety ?? 0) + 1;
      return '말다툼이 몸싸움이 되었다. 경비병은 나만 붙잡아 꾸짖었다. 늘 그렇다.';
    }
    const k = gainSkill(g, 'trade', 0.6, 'cha'); const c = gainStat(g, 'cha', 0.4);
    return `대꾸하지 않고 하던 일을 두 배로 잘 해냈다. 그걸로 바뀌는 건 없다는 걸 안다. 그래도 그렇게 했다.${gains([up('장사', k), up('매력', c)])}`;
  },
});

/* ---------- 오래 사는 종족: 인간 친구를 떠나보낸다 ---------- */
HOOKS.afterNpc.push((g, rng) => {
  const R = RS(g);
  const meP = me(g);
  const young = longLived(meP) && ageYears(meP) - bodyAge(meP) >= 8;
  for (const p of g.people) {
    if (p.alive || p._rf || p.isPlayer) continue;
    p._rf = true;
    if (!young || !p.known || raceOf(p) === playerRace(g)) continue;
    const close = p.affection >= 30 || g.player.familyIds.includes(p.id) || p.id === meP.spouseId;
    if (!close) continue;
    R.farewells += 1;
    remember(g, p, '나보다 먼저 늙어 떠났다', 0, { tag: 'outlived' });
    if (mi(g) - R.lastFarewell >= 12 && !sceneQueued(g, 'farewell') && !g.over) {
      R.lastFarewell = mi(g);
      queueScene(g, 'farewell', { id: p.id, n: R.farewells });
    }
  }
});
defineScene('farewell', {
  title: () => '먼저 가는 사람',
  text: (g, s) => {
    const p = byId(g, s.id);
    const meP = me(g);
    const lines = [`${J(fullName(p), '이/가')} ${ageYears(p)}살로 세상을 떠났다.`];
    if (s.n === 1) lines.push(`처음 만났을 때 그는 젊었다. 장례식에서 거울처럼 맑은 물에 비친 내 얼굴은 그때와 거의 같았다. 나는 ${ageYears(meP)}살이고, 몸은 아직 ${bodyAge(meP)}살이다.`);
    else if (s.n < 6) lines.push(`벌써 ${s.n}번째다. 장례 절차를 이제는 사제보다 내가 더 잘 안다.`);
    else lines.push(`세는 것을 그만둔 지 오래다. 마을에서 내 어린 시절을 기억하는 사람은 이제 없다.`);
    return lines.join(' ');
  },
  choices: () => [
    { label: '무덤 곁을 오래 지킨다', key: 'stay' },
    { label: '그 사람의 이야기를 적어 둔다', key: 'write' },
    { label: '다시는 인간과 깊이 사귀지 않겠다고 다짐한다', key: 'aloof' },
    { label: '그 사람의 아이들을 찾아간다', key: 'kin' },
  ],
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const R = RS(g);
    if (key === 'stay') { stress(g, 6); const w = gainStat(g, 'wil', 0.8); return `사흘 밤을 무덤 곁에서 보냈다. 인간의 무덤은 금방 풀에 덮인다. 그래서 더 오래 앉아 있었다.${gains([up('의지', w)])}`; }
    if (key === 'write') {
      const k = gainSkill(g, 'letters', 1.5, 'int');
      chron(g, `${g.player.name}, 먼저 간 벗 ${fullName(p)}의 이야기를 글로 남기다.`);
      return `밤새 그가 했던 말과 웃던 얼굴을 적었다. 백 년 뒤에도 누군가는 읽을 것이다. 나는 그때도 살아 있을 것이고.${gains([up('글과 학문', k)])}`;
    }
    if (key === 'aloof') { R.aloof = true; stress(g, -10); return '마음 한쪽의 문을 닫았다. 덜 아플 것이다. 대신 덜 따뜻할 것이다. 엘프들이 왜 그렇게 차가운지 이제 조금 알 것 같았다.'; }
    const kids = (p?.childIds ?? []).map((id) => byId(g, id)).filter((c) => c?.alive);
    if (!kids.length) { stress(g, 4); return '그에게는 남긴 자식이 없었다. 집은 이미 다른 사람이 들어 살고 있었다.'; }
    const c = rng.pick(kids);
    c.known = true; c.affection = Math.max(c.affection, 25);
    remember(g, c, '부모님의 옛 벗이라며 찾아왔다', 1, { tag: 'parent_friend' });
    return `${fullName(c)}를 찾아갔다. 아버지를 꼭 닮은 눈이었다. 내가 그 아이의 아버지가 어릴 적 이야기를 해 주자, 아이는 나를 이상한 눈으로 보았다. 그래도 차를 내왔다.`;
  },
});
// 마음을 닫은 오래 사는 자는 새로 사귀는 인간에게 덜 다가간다
HOOKS.afterMonth.push((g) => {
  if (!RS(g).aloof) return;
  for (const p of g.people) if (p.known && p.alive && raceOf(p) === 'human' && p.affection > 40 && !g.player.familyIds.includes(p.id) && p.id !== me(g).spouseId) p.affection -= 0.2;
});

/* ---------- 오래 사는 종족: 세월을 흘려보낸다 ---------- */
ACTIONS.push({
  id: 'drift_years',
  name: '세월 흘려보내기',
  icon: 'rest',
  desc: '오래 사는 종족에게 한 해는 짧다. 몇 해를 조용히 흘려보낸다. 그동안 세상은 저 혼자 움직인다.',
  available: (g) => longLived(me(g)) && playerAge(g) >= 30 && !traveling(g) && !isJailed(g) && !sceneQueued(g, 'drift'),
  run(g) { queueScene(g, 'drift'); return '창밖의 계절이 바뀌는 것을 오래 바라보았다.'; },
});
defineScene('drift', {
  title: () => '세월',
  text: (g) => `인간의 한 해는 내게 한 계절 같다. 얼마나 흘려보낼까. 그동안 일을 하고 있다면 일은 계속하고, 아니면 조용히 지낸다. 그 사이의 일은 고를 수 없다.`,
  choices: () => [{ label: '한 해', key: 1 }, { label: '다섯 해', key: 5 }, { label: '열 해', key: 10 }, { label: '그만둔다', key: 0 }],
  resolve(g, rng, s, key) {
    if (!key) return '아직은 하루하루를 세며 살고 싶다.';
    return driftYears(g, key);
  },
});
// 화면에서도 부를 수 있다. 끝에 남은 장면·사건은 지운다 (죽거나 대를 이어야 하면 그대로 둔다).
export function driftYears(g, years) {
  const R = RS(g);
  const startMoney = g.player.money;
  const startYear = g.date.year;
  const knownAlive = new Set(g.people.filter((p) => p.alive && p.known && !p.isPlayer).map((p) => p.id));
  g.pendingEvent = null;
  let months = 0;
  for (; months < years * 12; months++) {
    const life = L(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) choices.push({ id: life.job && life.job.place === life.place && i < 2 ? 'work' : 'rest' });
    endMonth(g, choices);
    if (g.over || g.player.alive === false || L(g).heirPending) break;
    g.pendingEvent = null; L(g).scene = null; L(g).queue = [];
    if (isJailed(g) || traveling(g)) break;
  }
  if (!g.over && !L(g).heirPending) { g.pendingEvent = null; L(g).scene = null; L(g).queue = []; }
  R.drifted += months / 12;
  const gone = [...knownAlive].map((id) => byId(g, id)).filter((p) => p && !p.alive);
  const yrs = Math.round(months / 12 * 10) / 10;
  const dm = g.player.money - startMoney;
  const span = months < 12 ? `${months}달이` : `${({ 1: '한', 2: '두', 3: '세', 4: '네', 5: '다섯', 10: '열' })[Math.round(yrs)] ?? Math.round(yrs)} 해가`;
  const parts = [`${span} 흘렀다. 용사력 ${startYear}년이 ${g.date.year}년이 되었다.`];
  if (gone.length) {
    const names = gone.slice(0, 3).map((p) => fullName(p)).join(', ');
    parts.push(`그 사이 ${gone.length > 3 ? `${names} 등 ${gone.length}명이` : J(names, '이/가')} 세상을 떠났다.`);
  }
  if (dm) parts.push(`주머니는 은화 ${Math.abs(dm)}닢 ${dm > 0 ? '불었다' : '줄었다'}.`);
  parts.push(`거울 속 얼굴은 여전히 ${bodyAge(me(g))}살쯤이다.`);
  note(g, `${yrs}해를 조용히 흘려보냈다.`);
  return parts.join(' ');
}

/* ---------- 화면용 ---------- */
// 플레이어 종족 정보 (인물 칸, 집안 고르기 설명)
export function raceInfo(g, p = me(g)) {
  const id = raceOf(p);
  const r = RACES[id];
  const realm = realmOf(L(g).place ?? 'ern');
  return {
    id, name: r.name, desc: r.desc, life: r.life, home: r.home,
    beast: p.beast ? BEASTS[p.beast]?.name : null,
    age: ageYears(p), bodyAge: bodyAge(p),
    treatment: treatment(g, realm, id), treatmentWord: TREAT_WORD[treatment(g, realm, id)],
    farewells: p.isPlayer ? RS(g).farewells : 0,
  };
}
export const playableRaces = () => Object.entries(RACES).filter(([, r]) => !r.npcOnly).map(([id, r]) => ({ id, name: r.name, desc: r.desc, life: r.life, family: id === 'human' ? 'farmer' : RACE_FAMILIES.find((f) => f.race === id)?.id ?? null }));
