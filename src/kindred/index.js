// 42단계: 다른 종족으로 태어날 집안 늘리기. 엘프 셋·드워프 셋·수인 셋·하프엘프 둘·반마족 둘을 FAMILIES에 이어 붙인다.
// 반마족은 이번에 처음 고를 수 있다(RACES.half_demon.npcOnly를 푼다).
// 33단계 origins와 같은 꼴: 시작 장소·국적·인맥 둘·어린 시절 장면 셋(kd_child)·열여덟에 돌아보는 바람(kd_want)·한 번 닥치는 짐(kd_burden).
// 종족마다 다른 결: 오래 사는 피는 스물다섯 넘어 사람 벗이 먼저 늙는 글과 장면(kd_slow),
//   반마족은 뿔이 드러날 위험(horn 0~100)을 안고 살고, 꺼리는 나라에서 들킬 뻔한 일(kd_horns)이 생긴다.
// 상태는 g.kindred 하나, 화면 연결점은 kindredLines(g) / kindredLine(g) / kindredInfo(g).
// races(종족 입히기·부모 종족)·peoples(종족 땅)·faith(의심)·origins(사람 집안)와 잇는다. 대를 이으면 집안 이야기는 past.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { FAMILIES, JOBS, MALE_NAMES, FEMALE_NAMES } from '../data.js';
import { me, playerAge, gainStat, gainSkill } from '../game.js';
import { byId, makePerson, ageYears } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, check, traveling } from '../adventure/core.js';
import { rel } from '../relations.js';
import { makeRng } from '../rng.js';
import { realmState, realmOf } from '../realms/index.js';
import { faithState } from '../faith/index.js';
import { RACES, RACE_FAMILIES, TREATMENT } from '../races/data.js';
import { setRace, raceOf, raceName } from '../races/index.js';
import { bestie } from '../childhood/index.js';
import { isJailed } from '../crime.js';
import { KINDRED, NEW_JOBS, SLOW, HORN } from './data.js';

/* ---------- 집안 고르기에 이어 붙인다 ---------- */
for (const [k, v] of Object.entries(NEW_JOBS)) JOBS[k] ??= v;
delete RACES.half_demon.npcOnly; // 반마족을 처음으로 고를 수 있다
for (const o of KINDRED) {
  if (FAMILIES.some((f) => f.id === o.id)) continue;
  const { id, race, name, desc, money, fatherJob, motherJob, statBias, skillBias, standing, lastNames, place, fatherRace, motherRace } = o;
  const fam = { id, race, name, desc, money, fatherJob, motherJob, statBias, skillBias, standing, lastNames, home: place, kindred: true };
  if (fatherRace) fam.fatherRace = fatherRace;
  if (motherRace) fam.motherRace = motherRace;
  FAMILIES.push(fam);
  if (race === 'half_demon' && !RACE_FAMILIES.some((f) => f.race === 'half_demon')) RACE_FAMILIES.push(fam); // 종족 카드의 첫 집안
}

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 421) ^ Math.imul(mi(g) * 197 + salt + 59, 2654435761)) | 0 });
export const kindredOf = (id) => KINDRED.find((o) => o.id === id) ?? null;
const O = (g) => kindredOf(g.kindred?.id);
const LONG = new Set(['elf', 'dwarf', 'half_elf', 'half_demon', 'demon']);
// 뿔을 감추고 사는 피: 반마족, 그리고 43단계부터 사람 땅에 숨은 마족(demonkind)
const HORNED = new Set(['half_demon', 'demon']);

/* ---------- 상태 ---------- */
export function kindredState(g) {
  g.kindred ??= {};
  const s = g.kindred;
  s.id ??= null;       // 집안 id (새 열셋 가운데 하나일 때만)
  s.owner ??= null;    // 그 집안에서 태어난 사람 id
  s.flags ??= {};
  s.ties ??= {};
  s.seen ??= [];
  s.sceneAt ??= -99;
  s.lineAt ??= -99;
  s.used ??= [];
  s.month ??= [];
  s.want ??= null;     // 'met' | 'missed'
  s.burden ??= null;   // 짐 결과 열쇠 ('due'는 기다리는 중)
  s.slow ??= null;     // 사람 벗이 먼저 늙는 장면을 봤는가: 벗 id
  s.horn ??= 20;       // 반마족: 뿔이 드러날 위험 (0~100)
  s.revealed ??= false;// 반마족임이 드러났는가
  s.hornAt ??= -99;
  s.horns ??= 0;       // 들킬 뻔한 일 수
  s.past ??= false;
  s.log ??= [];
  return s;
}
const S = kindredState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 20) s.log.shift(); }
const mine = (g) => { const s = g.kindred; return !!s?.id && !s.past && s.owner === g.player?.id; };
const father = (g) => byId(g, me(g)?.fatherId);
const mother = (g) => byId(g, me(g)?.motherId);
const tie = (g, role) => byId(g, S(g).ties[role]);
function ctx(g) {
  const s = S(g); const t = {};
  for (const tt of O(g)?.ties ?? []) t[tt.role] = tie(g, tt.role)?.name ?? tt.word;
  return { n: g.player.name, fa: father(g)?.name ?? '아버지', mo: mother(g)?.name ?? '어머니', place: placeName(O(g)?.place), t, flags: s.flags };
}
const aff = (p, n) => { if (!p) return; rel(p); p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
function applyFx(g, fx = {}) {
  for (const [k, v] of Object.entries(fx.stat ?? {})) gainStat(g, k, v);
  for (const [k, v] of Object.entries(fx.skill ?? {})) gainSkill(g, k, v);
  for (const [who, v] of Object.entries(fx.aff ?? {})) aff(who === 'father' ? father(g) : who === 'mother' ? mother(g) : tie(g, who), v);
  if (fx.fam) g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) + fx.fam);
  if (fx.money) g.player.money = Math.max(0, g.player.money + fx.money);
  if (fx.flag) S(g).flags[fx.flag] = mi(g);
  if (fx.stress) stress(g, fx.stress);
  if (fx.renown) L(g).renown = (L(g).renown ?? 0) + fx.renown;
  if (fx.horn) S(g).horn = clamp(S(g).horn + fx.horn, 0, 100);
  if (fx.injury) g.player.injuries.push({ name: fx.injury, months: 2 });
}

/* ---------- 태어날 때 ---------- */
function placeAtBirth(g) {
  const s = S(g);
  const o = kindredOf(g.player.familyId);
  if (!o) return;
  s.id = o.id; s.owner = g.player.id;
  const life = L(g);
  life.place = o.place; life.home = 'family';
  const R = realmState(g);
  const realm = PLACES[o.place]?.realm ?? 'leonia';
  R.citizen = realm; R.cur = realm; R.last = o.place;
  for (const id of g.player.familyIds) { const p = byId(g, id); if (p) p.place = o.place; }
}
// 삶 상태(g.life)를 새로 만드는 adventure 훅 바로 뒤에 끼운다 (origins와 같은 자리)
{
  const at = HOOKS.newGame.findIndex((f) => /defaultLife\(\)/.test(String(f)));
  HOOKS.newGame.splice(at >= 0 ? at + 1 : 0, 0, (g) => { g.kindred = null; placeAtBirth(g); });
}
HOOKS.newGame.push((g) => {
  const s = S(g);
  const o = kindredOf(s.id);
  if (!o) return;
  if (L(g).place !== o.place) placeAtBirth(g);
  s.ownerName = g.player.name;
  const rng = ownRng(g, 2);
  const fa = father(g), mo = mother(g);
  for (const t of o.ties) {
    const p = makePerson(rng, { sex: t.sex, ageMonths: rng.int(t.age[0], t.age[1]) * 12 + rng.int(0, 11), job: t.job });
    if (t.race && t.race !== 'human') setRace(p, t.race, rng, { rename: true, last: true, beast: t.beast ?? null });
    const taken = [g.player.name, fa?.name, mo?.name, ...Object.values(s.ties).map((id) => byId(g, id)?.name)];
    if (!t.race || t.race === 'human') for (let k = 0; k < 8 && taken.includes(p.name); k++) p.name = rng.pick(t.sex === 'm' ? MALE_NAMES : FEMALE_NAMES);
    p.place = o.place; p.known = true; p.affection = t.aff; if (t.riv) p.rivalry = t.riv;
    p.kindredRole = t.role;
    g.people.push(p); s.ties[t.role] = p.id;
  }
  if (o.hidden) s.horn = 30;
  if (o.race === 'half_demon' && !o.hidden) { s.horn = 100; s.revealed = true; } // 변경 집안은 뿔을 감추지 않는다
  if (o.id === 'half_elf_noble' && fa) { fa.title = '기사'; fa.wealth = Math.max(fa.wealth ?? 0, 500); }
  if (o.id === 'dwarf_heir' && fa) fa.wealth = Math.max(fa.wealth ?? 0, 600);
  g.news = [{ text: `${placeName(o.place)}, ${o.name}에 ${raceName(o.race)} 아이가 태어났다. 이름은 ${g.player.name}.`, rel: 100 }];
  note(g, `${placeName(o.place)}에서 태어났다.`);
});

/* ---------- 어린 시절 장면 ---------- */
const sceneOf = (g, sid) => O(g)?.scenes.find((x) => x.id === sid);
defineScene('kd_child', {
  title: (g, s) => sceneOf(g, s.sid)?.title ?? '어린 날',
  text: (g, s) => sceneOf(g, s.sid)?.text(ctx(g)) ?? '',
  choices: (g, s) => (sceneOf(g, s.sid)?.choices ?? []).map((c, i) => ({ label: c.label, key: `c${i}` })),
  resolve(g, rng, s, key) {
    const sc = sceneOf(g, s.sid);
    const c = sc?.choices[+String(key).slice(1)] ?? sc?.choices[0];
    if (!c) return '지나간 일이다.';
    const out = c.out(ctx(g));
    applyFx(g, c.fx);
    log(g, `${sc.title}: ${c.label}`);
    return out;
  },
});

/* ---------- 열여덟: 집안이 바란 것 ---------- */
defineScene('kd_want', {
  title: () => '집안이 바란 것',
  text: (g, s) => {
    const o = O(g); const c = ctx(g);
    const who = father(g)?.alive ? c.fa : mother(g)?.alive ? c.mo : '집안 어른들';
    return s.met
      ? `열여덟. ${o.want.text} ${J(who, '은/는')} 요즘 내 이야기를 할 때 목소리가 달라졌다. 집안이 바란 '${o.want.name}'에 나는 가까이 와 있다.`
      : `열여덟. ${o.want.text} 그런데 나는 다른 데 와 있다. ${J(who, '은/는')} 그 이야기를 꺼내지 않는다. 꺼내지 않는 것이 더 크게 들린다.`;
  },
  choices: (g, s) => s.met
    ? [{ label: '집안의 자랑으로 살겠다고 한다', key: 'pride' }, { label: '그래도 내 길은 따로 있다고 한다', key: 'own' }]
    : [{ label: '바란 대로 못 해 미안하다고 한다', key: 'sorry' }, { label: '내 길은 내가 정한다고 말한다', key: 'own' }],
  resolve(g, rng, s, key) {
    const st = S(g); const o = O(g);
    st.want = s.met ? 'met' : 'missed';
    log(g, `${o.want.name}: ${s.met ? '집안이 바란 대로' : '다른 길'}`);
    if (key === 'pride') { aff(father(g), 10); aff(mother(g), 8); L(g).renown = (L(g).renown ?? 0) + 2; note(g, `집안이 바란 ${J(o.want.name, '을/를')} 이루어 가고 있다.`); return '그날 저녁상은 길었다. 집안 사람들이 오래된 노래를 불렀다. 처음 듣는 대목까지 다 불렀다.'; }
    if (key === 'sorry') { aff(father(g), 4); aff(mother(g), 6); stress(g, 6); return '어깨에 손 하나가 얹혔다. "살아 있으면 된다. 우리 피는 시간이 많다." 위로였는지 체념이었는지는 묻지 못했다.'; }
    aff(father(g), s.met ? -2 : -6); stress(g, -4); note(g, '집안이 바란 길 대신 내 길을 가기로 했다.');
    return s.met ? '다들 웃었다. 농담인 줄 알았던 것이다. 나는 웃지 않았다.' : '한동안 아무도 말하지 않았다. 그러다 누군가 "그 고집은 누굴 닮았는지" 하고 웃었다. 그것으로 끝이었다.';
  },
});

/* ---------- 짐: 16~26살에 한 번 ---------- */
const burdenOf = (g) => O(g)?.burdenScene;
defineScene('kd_burden', {
  title: (g) => burdenOf(g)?.title ?? '집안의 짐',
  text: (g) => burdenOf(g)?.text(ctx(g)) ?? '',
  choices: (g) => (burdenOf(g)?.choices ?? []).map((c) => ({ label: c.label, key: c.key })),
  resolve(g, rng, s, key) {
    const b = burdenOf(g); if (!b) return '지나간 일이다.';
    const c = b.choices.find((x) => x.key === key) ?? b.choices[0];
    const st = S(g);
    st.burden = c.key;
    log(g, `${b.title}: ${c.label}`);
    if (c.test) {
      const ok = check(rng, c.test(g, st), c.dc);
      const r = ok ? c.ok : c.bad;
      applyFx(g, r.fx); if (!ok) st.burden = `${c.key}_bad`;
      return r.out(ctx(g));
    }
    applyFx(g, c.fx);
    return c.out(ctx(g));
  },
});

/* ---------- 오래 사는 피: 사람 벗이 먼저 늙는다 ---------- */
function slowFriend(g) {
  const b = bestie(g);
  const human = (p) => p && p.alive && !p.away && raceOf(p) === 'human' && ageYears(p) >= 38 && ageYears(p) <= 75;
  if (human(b)) return b;
  return g.people.find((p) => human(p) && p.known && (p.affection ?? 0) >= 30 && Math.abs(ageYears(p) - playerAge(g)) <= 6) ?? null;
}
defineScene('kd_slow', {
  title: () => '먼저 늙는 벗',
  text: (g, s) => `${J(s.f, '이/가')} 지팡이를 짚고 찾아왔다. 같이 자란 사이다. 그 애 얼굴엔 주름이 깊고, 손등엔 검버섯이 앉았다. 내 얼굴을 한참 보더니 웃었다. "너는 내가 처음 본 날 그대로구나. 나 죽을 때도 그 얼굴이겠지."`,
  choices: () => [{ label: '"그때도 옆에 있을게"라고 한다', key: 'stay' }, { label: '옛날 이야기를 밤새 나눈다', key: 'talk' }, { label: '대답하지 못하고 고개를 돌린다', key: 'away' }],
  resolve(g, rng, s, key) {
    const p = byId(g, s.id); S(g).slow = s.id;
    if (key === 'stay') { aff(p, 15); stress(g, 4); log(g, `먼저 늙는 벗 ${s.f}: 곁에 있기로`); return '그 애가 내 손을 잡았다. 손이 가볍고 차가웠다. 약속은 쉬웠다. 지키는 데는 그 애 남은 생이 다 걸릴 것이다. 나에게는 잠깐이다. 그게 슬펐다.'; }
    if (key === 'talk') { aff(p, 10); stress(g, -4); gainStat(g, 'sen', 0.4); log(g, `먼저 늙는 벗 ${s.f}: 옛날 이야기`); return '개울의 가재, 첫 술, 첫 연애, 망친 일들. 그 애는 반쯤 잊었고 나는 다 기억했다. 내가 이야기하고 그 애가 웃었다. 새벽에 그 애가 말했다. "네가 기억해 주니 다행이다."'; }
    aff(p, -4); stress(g, 8); log(g, `먼저 늙는 벗 ${s.f}: 고개를 돌림`); return '창밖을 보았다. 그 애도 더 묻지 않았다. 차가 식을 때까지 둘 다 말이 없었다. 돌아가는 뒷모습이 작았다.';
  },
});

/* ---------- 반마족: 들킬 뻔한 날 ---------- */
const hornRealm = (g) => { const r = realmOf(L(g).place ?? 'ern'); const race = raceOf(me(g)); return TREATMENT[r]?.[HORNED.has(race) ? race : 'half_demon'] ?? 'normal'; };
defineScene('kd_horns', {
  title: () => '이마를 본 눈',
  text: (g, s) => s.how === 'wind'
    ? '장터에서 바람이 두건을 걷어 갔다. 뿔이 드러났다. 맞은편 생선 장수와 눈이 마주쳤다. 그 여자의 입이 천천히 벌어진다.'
    : s.how === 'heal'
      ? '다쳐서 의원에게 갔다. 의원이 머리 상처를 보려고 머리카락을 걷었다. 손이 멈췄다. 의원이 문 쪽을 한 번 보았다.'
      : '여관 방 거울 앞에서 머리를 다듬다가 문이 열렸다. 일하는 아이가 물동이를 든 채 서 있다. 내 이마를 보고 있다.',
  choices: (g) => [
    { label: '태연하게 둘러댄다', key: 'lie' },
    ...(g.player.money >= 15 ? [{ label: '은화 15닢으로 입을 막는다', key: 'pay' }] : []),
    { label: '그 길로 이 고장을 뜬다', key: 'flee' },
    { label: '숨기지 않기로 한다', key: 'show' },
  ],
  resolve(g, rng, s, key) {
    const st = S(g); st.horns += 1;
    const f = faithState(g);
    if (key === 'lie') {
      if (check(rng, g.player.stats.cha + g.player.stats.wil / 2, 40)) { st.horn = clamp(st.horn - 5, 0, 100); return '"어릴 때 소가 들이받아서 뼈가 튀어나왔소." 웃으며 말했다. 상대가 머뭇거리다 따라 웃었다. 집에 와서 손바닥을 보니 손톱 자국이 나 있었다.'; }
      st.horn = clamp(st.horn + 15, 0, 100); f.suspicion = clamp((f.suspicion ?? 0) + 12, 0, 100); stress(g, 10);
      return '말이 꼬였다. 상대가 뒷걸음질 쳤다. 다음 날 장터에 "뿔 난 사람" 이야기가 돌았다. 아직 이름은 붙지 않았다. 아직은.';
    }
    if (key === 'pay') { g.player.money -= 15; st.horn = clamp(st.horn + 3, 0, 100); return '은화를 쥐여 주었다. 상대가 고개를 끄덕였다. 이 사람이 언제까지 입을 다물지는 은화가 정한다. 은화는 오래가지 않는다.'; }
    if (key === 'flee') {
      const here = L(g).place; const away = Object.keys(PLACES[here]?.links ?? {}).filter((k) => PLACES[k] && !PLACES[k].hidden);
      if (away.length && !traveling(g)) { L(g).place = rng.pick(away); L(g).home = 'inn'; }
      st.horn = clamp(st.horn - 10, 0, 100); stress(g, 8);
      note(g, `뿔을 들킬 뻔해 ${placeName(here)}을 떠났다.`);
      return `짐도 다 챙기지 못하고 나왔다. ${placeName(L(g).place)}에 닿아서야 두건 끈을 다시 맸다. 손이 아직 떨렸다.`;
    }
    st.revealed = true; st.horn = 100; stress(g, 12);
    const bad = ['scorn', 'banned'].includes(hornRealm(g));
    if (bad) f.suspicion = clamp((f.suspicion ?? 0) + 20, 0, 100);
    note(g, '뿔을 감추지 않기로 했다.'); chron(g, `${g.player.name}, ${raceName(raceOf(me(g)))}임을 숨기지 않다.`, 6);
    return bad
      ? '두건을 내려놓았다. 상대가 비명을 지르며 달아났다. 그날 저녁 성당 종이 이상한 때에 울렸다. 이제부터는 숨는 게 아니라 버티는 삶이다.'
      : '두건을 내려놓았다. 상대가 한참 보더니 어깨를 으쓱했다. "뿔이 작네." 그게 다였다. 여기서는 그게 다일 수도 있다.';
  },
});

/* ---------- 매달 ---------- */
function pickFrom(g, rng, pool, tag) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${tag}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${tag}${i}`); if (s.used.length > 8) s.used.shift();
  return i;
}
function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over || !g.player) return;
  const race = raceOf(me(g));
  const rng = ownRng(g, 7);
  const age = playerAge(g);
  const busy = traveling(g) || isJailed(g) || ['kd_child', 'kd_want', 'kd_burden', 'kd_slow', 'kd_horns'].some((k) => sceneQueued(g, k));
  // 반마족: 꺼리는 나라에서 감춘 뿔이 들킬 뻔한다 (어느 집안이든, 대를 이은 뒤에도)
  if (HORNED.has(race) && !s.revealed && age >= 12 && !busy && mi(g) - s.hornAt >= 18 && hornRealm(g) !== 'welcome') {
    const tr = hornRealm(g);
    const p = (tr === 'banned' ? 0.03 : tr === 'scorn' ? 0.012 : tr === 'wary' ? 0.006 : 0.002) * (0.5 + s.horn / 50);
    if (rng.chance(p)) { s.hornAt = mi(g); queueScene(g, 'kd_horns', { how: rng.pick(['wind', 'heal', 'inn']) }); return; }
  }
  if (HORNED.has(race) && !s.revealed && age >= 16 && mi(g) % 12 === 0) s.horn = clamp(s.horn + 2, 0, 100); // 뿔은 천천히 자란다
  if (!mine(g)) {
    // 대를 이은 뒤에도 오래 사는 피의 글은 이어진다
    slowTick(g, rng, race, age, busy);
    return;
  }
  const o = O(g); if (!o) return;
  if (!busy && mi(g) - s.sceneAt >= 6) {
    const sc = o.scenes.find((x) => !s.seen.includes(x.id) && age >= x.age[0] && age <= x.age[1]);
    const late = sc && age >= sc.age[1];
    if (sc && (late || rng.chance(0.3))) { s.seen.push(sc.id); s.sceneAt = mi(g); queueScene(g, 'kd_child', { sid: sc.id }); return; }
    if (!s.want && age >= 18) { s.sceneAt = mi(g); queueScene(g, 'kd_want', { met: !!o.check(g, s) }); return; }
    if (!s.burden && age >= 16 && age <= 26 && (age >= 22 || rng.chance(0.06))) { s.burden = 'due'; s.sceneAt = mi(g); queueScene(g, 'kd_burden', {}); return; }
  }
  if (s.burden === 'due' && !sceneQueued(g, 'kd_burden')) s.burden = null;
  if (age <= 15 && mi(g) - s.lineAt >= 4 && rng.chance(0.3)) { s.lineAt = mi(g); s.month.push({ kind: 'home', text: o.lines[pickFrom(g, rng, o.lines, 'l')](ctx(g)) }); return; }
  slowTick(g, rng, race, age, busy);
}
function slowTick(g, rng, race, age, busy) {
  const s = S(g);
  if (!LONG.has(race) || age < 25) return;
  const f = slowFriend(g);
  if (f && !s.slow && !busy && ageYears(f) >= 50 && mi(g) - s.sceneAt >= 6 && rng.chance(0.06)) { s.sceneAt = mi(g); queueScene(g, 'kd_slow', { f: f.name, id: f.id }); return; }
  if (mi(g) - s.lineAt < 8) return;
  if (HORNED.has(race) && !s.revealed && rng.chance(0.15)) { s.lineAt = mi(g); s.month.push({ kind: 'horn', text: HORN[pickFrom(g, rng, HORN, 'h')]() }); return; }
  if (f && rng.chance(0.12)) {
    s.lineAt = mi(g);
    const call = me(g).sex === 'm' ? '아저씨' : '아주머니';
    s.month.push({ kind: 'slow', text: SLOW[pickFrom(g, rng, SLOW, 's')]({ n: g.player.name, f: f.name, call, age: ageYears(f) }) });
  }
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g) => {
  const s = S(g);
  s.slow = null; s.hornAt = -99;
  // 새 플레이어가 반마족이 아니면 뿔 걱정은 끝난다. 반마족이면 감춘 채로 시작한다.
  if (HORNED.has(raceOf(me(g)))) { s.revealed = false; s.horn = 25; }
  if (!s.id || s.past) return;
  s.past = true;
  const o = O(g);
  if (o) chron(g, `${o.name}에서 난 ${s.ownerName ?? '선대'}의 핏줄이 이어지다.`, 40);
});

/* ---------- 화면 연결점 ---------- */
export function kindredLines(g) { return (g.kindred?.month ?? []).slice(0, 1).map((x) => ({ ...x })); }
export function kindredLine(g) { return kindredLines(g)[0]?.text ?? null; }
export function kindredInfo(g) {
  const s = S(g); const o = O(g);
  const race = raceOf(me(g));
  const horn = HORNED.has(race) ? { risk: s.revealed ? null : s.horn, revealed: s.revealed, near: s.horns, realm: hornRealm(g) } : null;
  if (!o && !horn) return null;
  const base = o ? {
    id: o.id, name: o.name, race: o.race, raceName: raceName(o.race), place: placeName(o.place), standing: FAMILIES.find((f) => f.id === o.id)?.standing ?? '',
    want: { name: o.want.name, text: o.want.text, state: s.want === 'met' ? '이루어 가고 있다' : s.want === 'missed' ? '다른 길로 왔다' : '아직 모른다' },
    burden: { name: o.burden.name, text: o.burden.text, state: s.burden && s.burden !== 'due' ? '한 번 닥쳤다' : '아직 오지 않았다' },
    ties: o.ties.map((t) => { const p = tie(g, t.role); return { word: t.word, name: p?.name ?? null, alive: !!p?.alive, race: raceName(raceOf(p)) }; }),
    past: s.past,
  } : { id: null, past: true };
  return { ...base, horn, log: s.log.slice(-6).map((x) => ({ ...x })) };
}
