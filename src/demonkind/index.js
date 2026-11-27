// 43단계: 마족으로 태어나기. 얼음 해협 너머 마대륙의 고장 넷을 진짜 고장(PLACES)으로 열고,
// 마족 집안 넷(가르베스의 전사 가문·엘리노어의 사절 가문·침묵령의 이름 없는 집안·사람 도시에 숨은 집안)을 FAMILIES에 붙인다.
// 마족을 처음으로 고를 수 있다(RACES.demon.npcOnly를 푼다).
// 33단계 demons(세 마왕·해협 습격)·42단계 kindred(뿔 위험·먼저 늙는 벗)와 잇는다.
//   - 서열: 이름 없는 것들(4) → 열다섯 무렵 이름을 얻으면 이름 있는 마족(3) → 백인장(2) → 대공(1). 마왕(0)은 오르지 못한다.
//   - 섬기는 마왕의 눈(favor 0~100), 세 마왕의 세력(power)은 플레이어 없이도 흐르고, 석 달에 한 번쯤 마대륙 소식이 난다.
//   - 사람 땅에서 뿔을 드러낸 마족은 나라마다 쫓기거나(banned) 꺼려진다. 뿔을 깎고 감추면 kindred의 뿔 위험으로 넘어간다.
//   - 마족이 아닌 이가 마대륙에 오면 그쪽에서는 내가 낯선 자다(dk_stranger).
// 상태는 g.demonkind 하나. 화면 연결점은 demonkindLines(g) / demonkindLine(g) / demonkindInfo(g).
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { FAMILIES, JOBS } from '../data.js';
import { me, playerAge, gainStat, gainSkill } from '../game.js';
import { byId, makePerson } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, check, traveling } from '../adventure/core.js';
import { rel } from '../relations.js';
import { makeRng } from '../rng.js';
import { realmState, realmOf } from '../realms/index.js';
import { RACES, RACE_FAMILIES, RACE_NAMES, TREATMENT, TREAT_WORD } from '../races/data.js';
import { setRace, raceOf, raceName } from '../races/index.js';
import { isJailed } from '../crime.js';
import { faithState } from '../faith/index.js';
import { LORDS, RANKS, demonsState } from '../demons/index.js';
import { kindredState } from '../kindred/index.js';
import { DK_PLACES, DK_LINKS, LORD_START, COURT_NEWS, CUSTOM, LONG_LIFE, DK_FAMILIES, MORE_NAMES } from './data.js';

export const DK_PLACE_IDS = Object.keys(DK_PLACES);
const DEMON = 'demon';

/* ---------- 일자리·이름 ---------- */
JOBS.demon_warrior ??= { name: '마족 전사', skill: 'sword', income: 5 };
JOBS.envoy ??= { name: '사절', skill: 'letters', income: 8 };
JOBS.stonekeeper ??= { name: '경계비 지기', skill: 'magic', income: 3 };
for (const sx of ['m', 'f']) for (const n of MORE_NAMES[sx]) if (!RACE_NAMES.demon[sx].includes(n)) RACE_NAMES.demon[sx].push(n);

/* ---------- 마족을 처음으로 고른다 ---------- */
delete RACES.demon.npcOnly;
RACES.demon.home = '마대륙 (사람 땅에 숨어 사는 집안도 있다)';

/* ---------- 마대륙 고장: 숨은 고장으로 두고, 마족이거나 길을 연 사람에게만 열린다 ---------- */
let current = null; // open(g)가 g 없이 불릴 때를 위해
const openFor = (g) => { if (!g?.player) return false; const r = raceOf(me(g)); return r === DEMON || !!g.demonkind?.opened; };
for (const [id, d] of Object.entries(DK_PLACES)) {
  PLACES[id] ??= {
    name: d.name, kind: d.kind, desc: d.desc,
    inn: d.inn, rent: d.rent, house: d.house, wage: d.wage,
    links: {}, realm: DEMON, lord: d.lord,
    hidden: true, demonland: true,
    open: (g) => openFor(g ?? current),
  };
}
for (const [a, b, m] of DK_LINKS) {
  if (!PLACES[a] || !PLACES[b]) continue;
  PLACES[a].links[b] = m; PLACES[b].links[a] = m;
}
// 마대륙 안에서의 대우. 마족이 아닌 쪽은 여기서 남이다.
TREATMENT.demon ??= { human: 'scorn', elf: 'wary', dwarf: 'wary', beast: 'normal', half_elf: 'wary', demon: 'welcome', half_demon: 'wary' };
export const inDemonLand = (place) => realmOf(place) === DEMON;

/* ---------- 집안 고르기에 이어 붙인다 ---------- */
for (const o of DK_FAMILIES) {
  if (FAMILIES.some((f) => f.id === o.id)) continue;
  const { id, race, name, desc, money, fatherJob, motherJob, statBias, skillBias, standing, lastNames, place } = o;
  const fam = { id, race, name, desc, money, fatherJob, motherJob, statBias, skillBias, standing, lastNames, home: place, demonkind: true };
  FAMILIES.push(fam);
  if (!RACE_FAMILIES.some((f) => f.race === DEMON)) RACE_FAMILIES.push(fam); // 종족 카드의 첫 집안
}

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 433) ^ Math.imul(mi(g) * 211 + salt + 67, 2654435761)) | 0 });
export const demonkindOf = (id) => DK_FAMILIES.find((o) => o.id === id) ?? null;
const O = (g) => demonkindOf(g.demonkind?.id);
const lordName = (id) => LORDS[id]?.name ?? '섬기는 이 없음';
export const rankName = (r) => RANKS[clamp(r ?? 4, 0, 4)];

/* ---------- 상태 ---------- */
const freshPower = () => ({ ...LORD_START });
export function demonkindState(g) {
  g.demonkind ??= {};
  const s = g.demonkind;
  s.id ??= null;        // 마족 집안 id (넷 가운데 하나일 때만)
  s.owner ??= null;
  s.lord ??= null;      // 섬기는 마왕: red | dusk | silent | null
  s.rank ??= 4;         // 서열 (RANKS 자리)
  s.favor ??= 0;        // 섬기는 마왕의 눈 0~100
  s.named ??= false;    // 이름을 얻었는가 (열다섯 무렵)
  s.flags ??= {};
  s.ties ??= {};
  s.seen ??= [];
  s.sceneAt ??= -99;
  s.lineAt ??= -99;
  s.rankAt ??= -99;
  s.warAt ??= -99;
  s.bannedAt ??= -99;
  s.strangerAt ??= -99;
  s.used ??= [];
  s.month ??= [];
  s.want ??= null;
  s.burden ??= null;
  s.opened ??= false;   // 사람이 마대륙 길을 열었는가
  s.crossed ??= false;  // 마대륙에서 난 마족이 처음 사람 땅에 닿았는가
  s.bornLand ??= false; // 지금 플레이어가 마대륙에서 났는가
  s.home ??= false;     // 사람 땅에서 난 마족이 처음 마대륙에 닿았는가
  s.lastRealm ??= null;
  s.power ??= freshPower(); // 세 마왕의 세력 (세상 흐름, 플레이어 없이도)
  s.newsAt ??= -99;
  s.news ??= [];        // 마대륙 소식 [{ y, m, id, text }]
  s.past ??= false;
  s.log ??= [];
  return s;
}
const S = demonkindState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 20) s.log.shift(); }
const mine = (g) => { const s = g.demonkind; return !!s?.id && !s.past && s.owner === g.player?.id; };
const isDemon = (g) => raceOf(me(g)) === DEMON;
const father = (g) => byId(g, me(g)?.fatherId);
const mother = (g) => byId(g, me(g)?.motherId);
const tie = (g, role) => byId(g, S(g).ties[role]);
const here = (g) => L(g).place ?? 'ern';
function ctx(g) {
  const s = S(g); const t = {};
  for (const tt of O(g)?.ties ?? []) t[tt.role] = tie(g, tt.role)?.name ?? tt.word;
  return { n: g.player.name, fa: father(g)?.name ?? '아버지', mo: mother(g)?.name ?? '어머니', place: placeName(O(g)?.place ?? here(g)), lord: lordName(s.lord), t, flags: s.flags };
}
const aff = (p, n) => { if (!p) return; rel(p); p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
function applyFx(g, fx = {}) {
  const s = S(g);
  for (const [k, v] of Object.entries(fx.stat ?? {})) gainStat(g, k, v);
  for (const [k, v] of Object.entries(fx.skill ?? {})) gainSkill(g, k, v);
  for (const [who, v] of Object.entries(fx.aff ?? {})) aff(who === 'father' ? father(g) : who === 'mother' ? mother(g) : tie(g, who), v);
  if (fx.fam) g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) + fx.fam);
  if (fx.money) g.player.money = Math.max(0, g.player.money + fx.money);
  if (fx.flag) s.flags[fx.flag] = mi(g);
  if (fx.stress) stress(g, fx.stress);
  if (fx.renown) L(g).renown = (L(g).renown ?? 0) + fx.renown;
  if (fx.rank) s.rank = clamp(s.rank + fx.rank, 1, 4);
  if (fx.favor) s.favor = clamp(s.favor + fx.favor, 0, 100);
  if (fx.opened) s.opened = true;
  if (fx.injury) g.player.injuries.push({ name: typeof fx.injury === 'string' ? fx.injury : '깊은 상처', months: 2 });
}

/* ---------- 마대륙에 사는 사람들 (처음 닿을 때 채운다) ---------- */
const POP_JOBS = { bonehill: ['demon_warrior', 'smith', 'farmer', 'demon_warrior', 'weaver'], chain: ['demon_warrior', 'merchant', 'smith', 'merchant', 'tailor'], post: ['merchant', 'envoy', 'trade_master', 'tailor', 'alchemist'], stone: ['farmer', 'weaver', 'stonekeeper', 'farmer', 'idle'] };
function populate(g, place) {
  const s = S(g);
  s.pop ??= [];
  if (s.pop.includes(place) || !DK_PLACES[place]) return;
  s.pop.push(place);
  const rng = ownRng(g, 31 + DK_PLACE_IDS.indexOf(place));
  const jobs = POP_JOBS[place] ?? ['farmer'];
  for (let i = 0; i < 8; i++) {
    const sex = i % 2 ? 'f' : 'm';
    const young = i < 4;
    const p = makePerson(rng, { sex, ageMonths: (young ? rng.int(16, 40) : rng.int(45, 220)) * 12 + rng.int(0, 11), job: rng.pick(jobs) });
    setRace(p, DEMON, rng, { rename: true, last: true });
    p.place = place; p.dkPop = true;
    g.people.push(p);
  }
}

/* ---------- 태어날 때 ---------- */
function placeAtBirth(g) {
  const s = S(g);
  const o = demonkindOf(g.player.familyId);
  if (!o) return;
  s.id = o.id; s.owner = g.player.id; s.lord = o.lord;
  const life = L(g);
  life.place = o.place; life.home = 'family';
  const R = realmState(g);
  const realm = PLACES[o.place]?.realm ?? 'free';
  R.citizen = realm; R.cur = realm; R.last = o.place;
  for (const id of g.player.familyIds) { const p = byId(g, id); if (p) p.place = o.place; }
}
// 삶 상태(g.life)를 새로 만드는 adventure 훅 바로 뒤에 끼운다 (origins·kindred와 같은 자리)
{
  const at = HOOKS.newGame.findIndex((f) => /defaultLife\(\)/.test(String(f)));
  HOOKS.newGame.splice(at >= 0 ? at + 1 : 0, 0, (g) => { g.demonkind = null; current = g; placeAtBirth(g); });
}
HOOKS.newGame.push((g) => {
  current = g;
  const s = S(g);
  const o = demonkindOf(s.id);
  if (!o) return;
  if (L(g).place !== o.place) placeAtBirth(g);
  s.ownerName = g.player.name;
  s.favor = o.lord ? 10 : 0;
  s.lastRealm = realmOf(o.place);
  s.bornLand = inDemonLand(o.place);
  const rng = ownRng(g, 2);
  for (const t of o.ties) {
    const p = makePerson(rng, { sex: t.sex, ageMonths: rng.int(t.age[0], t.age[1]) * 12 + rng.int(0, 11), job: t.job });
    if (t.race && t.race !== 'human') setRace(p, t.race, rng, { rename: true, last: true });
    p.place = o.place; p.known = true; p.affection = t.aff; if (t.riv) p.rivalry = t.riv;
    p.demonkindRole = t.role;
    g.people.push(p); s.ties[t.role] = p.id;
  }
  // 뿔: 마대륙에서 난 아이는 뿔을 감출 까닭이 없다. 사람 도시에 숨은 집안은 밤마다 깎는다.
  const k = kindredState(g);
  if (o.hidden) { k.horn = 45; k.revealed = false; s.crossed = true; }
  else { k.horn = 100; k.revealed = true; populate(g, o.place); }
  const fa = father(g);
  if (o.id === 'dk_garbes' && fa) fa.title = '백인장';
  g.news = [{ text: `${placeName(o.place)}, ${o.name}에 마족 아이가 태어났다. 마족의 이름은 아직 없다. 집에서 부르는 이름은 ${g.player.name}.`, rel: 100 }];
  note(g, `${placeName(o.place)}에서 태어났다.`);
});

/* ---------- 어린 시절 장면 ---------- */
const sceneOf = (g, sid) => O(g)?.scenes.find((x) => x.id === sid);
defineScene('dk_child', {
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

/* ---------- 열다섯 무렵: 이름을 얻는 날 ---------- */
const NAMING = {
  red: (c) => `뼈 언덕의 겨울 모닥불 앞. 이름을 얻을 아이들이 차례로 불려 나간다. 전사들이 둘러서서 창 자루로 땅을 두드린다. ${J(c.fa, '이/가')} 내 등을 떠밀었다. 이름은 스스로 대거나, 어른이 지어 주거나, 마왕의 전령에게 청할 수 있다.`,
  dusk: (c) => `황혼 교역소의 검은 부두. 엘리노어의 서기가 이름을 받아 적는 날이다. 서기는 사람 말과 마족 말 두 가지로 받아 적는다. ${J(c.mo, '이/가')} 내 옷깃을 바로잡아 주었다. "이름은 한 번 적히면 백 년을 간다. 잘 골라라."`,
  silent: () => '경계비 아래, 어른들이 말없이 둘러앉았다. 침묵령에서는 이름을 소리 내어 부르지 않는다. 손바닥에 손가락으로 써서 전한다. 지기가 내 손바닥을 펴고 기다린다.',
  hidden: (c) => `약방 다락, 촛불 하나. ${J(c.fa, '이/가')} 마족 말로 된 낡은 책을 펼쳤다. "해협 너머에서는 다들 모닥불 앞에서 이름을 얻는다. 우리는 여기서 한다. 아무도 모르게." 사람 이름 말고, 진짜 이름을 정하는 밤이다.`,
};
defineScene('dk_name', {
  title: () => '이름을 얻는 날',
  text: (g) => (NAMING[S(g).lord ?? 'hidden'] ?? NAMING.hidden)(ctx(g)),
  choices: (g) => [
    { label: '집안 어른이 지어 준 이름을 받는다', key: 'kin' },
    { label: '내가 지은 이름을 댄다', key: 'own' },
    ...(S(g).lord ? [{ label: `${lordName(S(g).lord)}에게 이름을 청한다`, key: 'lord' }] : []),
  ],
  resolve(g, rng, s, key) {
    const st = S(g);
    st.named = true; st.rank = Math.min(st.rank, 3);
    chron(g, `${g.player.name}, 마족의 이름을 얻다.`, 4);
    log(g, `이름을 얻었다 (${key === 'kin' ? '집안이 지어 준' : key === 'own' ? '스스로 지은' : '마왕에게 받은'} 이름)`);
    if (key === 'kin') { aff(father(g), 8); aff(mother(g), 8); return '할아버지의 할아버지가 쓰던 이름이다. 어른들이 그 이름을 세 번 불렀다. 처음 들어 보는 이름인데, 내 것 같았다. 오늘부터 나이를 센다. 나는 한 살이다.'; }
    if (key === 'own') { gainStat(g, 'wil', 0.6); aff(father(g), -2); stress(g, -4); note(g, '마족의 이름을 스스로 지었다.'); return '내가 지은 이름을 댔다. 잠깐 조용했다. 누군가 "건방지군" 하고 웃었다. 그래도 아무도 고치라고 하지 않았다. 이름을 스스로 고른 마족은 그 이름값을 스스로 해야 한다.'; }
    st.favor = clamp(st.favor + 12, 0, 100);
    if (check(rng, g.player.stats.cha + g.player.stats.wil, 45)) { L(g).renown = (L(g).renown ?? 0) + 2; return `${lordName(st.lord)}의 전령이 나를 오래 보았다. 그리고 짧은 이름 하나를 주었다. 마왕령에서 쓰는 옛말로 '버티는 자'라는 뜻이다. 그 이름을 들은 어른들이 한 걸음 물러섰다.`; }
    stress(g, 6); return `전령은 귀찮다는 듯 흔한 이름 하나를 던졌다. 마왕의 이름을 청한 아이는 많다. 그래도 그 이름은 마왕에게서 왔다. 언젠가 내가 그 이름을 무겁게 만들면 된다.`;
  },
});

/* ---------- 열여덟: 집안이 바란 것 ---------- */
defineScene('dk_want', {
  title: () => '집안이 바란 것',
  text: (g, s) => {
    const o = O(g); const c = ctx(g);
    const who = father(g)?.alive ? c.fa : mother(g)?.alive ? c.mo : '집안 어른들';
    return s.met
      ? `열여덟. ${o.want.text} ${J(who, '은/는')} 내 뿔을 볼 때 눈빛이 달라졌다. 집안이 바란 '${o.want.name}'에 나는 가까이 와 있다. 마족의 셈으로는 아직 아이인데도.`
      : `열여덟. ${o.want.text} 그런데 나는 다른 데 와 있다. ${J(who, '은/는')} "마족에게 열여덟은 아무것도 아니다"라고만 했다. 위로인지 미룸인지 알 수 없었다.`;
  },
  choices: (g, s) => s.met
    ? [{ label: '집안의 이름을 지고 가겠다고 한다', key: 'pride' }, { label: '내 이름은 내가 키우겠다고 한다', key: 'own' }]
    : [{ label: '시간은 많다고, 기다려 달라고 한다', key: 'sorry' }, { label: '내 길은 내가 정한다고 말한다', key: 'own' }],
  resolve(g, rng, s, key) {
    const st = S(g); const o = O(g);
    st.want = s.met ? 'met' : 'missed';
    log(g, `${o.want.name}: ${s.met ? '집안이 바란 대로' : '다른 길'}`);
    if (key === 'pride') { aff(father(g), 10); aff(mother(g), 8); st.favor = clamp(st.favor + 4, 0, 100); L(g).renown = (L(g).renown ?? 0) + 2; return '그날 밤 손님에게 내는 소금을 식구끼리 나눠 먹었다. 마족 집에서 그건 "오늘은 너를 손님처럼 대한다"는 뜻이다.'; }
    if (key === 'sorry') { aff(father(g), 4); aff(mother(g), 6); stress(g, 4); return '"우리는 백 년을 기다릴 수 있다." 어머니가 말했다. 그 말이 위로가 되는 동시에 무거웠다. 백 년 동안 기다리는 눈이 있다는 뜻이니까.'; }
    aff(father(g), s.met ? -2 : -6); stress(g, -4); note(g, '집안이 바란 길 대신 내 길을 가기로 했다.');
    return '아버지가 뿔을 한 번 숙였다가 들었다. 반대한다는 뜻인지, 들었다는 뜻인지. 마족끼리도 그 몸짓은 둘 다로 읽힌다.';
  },
});

/* ---------- 짐: 16~26살에 한 번 ---------- */
const burdenOf = (g) => O(g)?.burdenScene;
defineScene('dk_burden', {
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

/* ---------- 서열 다툼: 백인장, 그리고 대공 ---------- */
defineScene('dk_rank', {
  title: (g, s) => (s.to <= 1 ? '대공의 자리' : '백인장의 자리'),
  text: (g, s) => (s.to <= 1
    ? `${lordName(S(g).lord)}의 궁정에 대공 자리 하나가 비었다. 백 년 넘게 그 자리를 지킨 노대공이 이름을 내려놓았다. 백인장 셋이 나섰고, 그중 하나가 나다. 궁정은 칼로도, 말로도, 기다림으로도 정할 수 있다고 했다.`
    : `${S(g).lord ? `${lordName(S(g).lord)} 휘하` : '이 고장'} 백인장 하나가 늙어 자리를 내놓는다. 이름 있는 마족들 가운데 몇이 나섰다. 마족의 서열은 겨울을 넘기며 지킨 것을 보고, 맞붙어 본 것을 보고 정한다.`),
  choices: () => [
    { label: '맞붙어 겨룬다', key: 'duel' },
    { label: '어른들을 찾아다니며 말로 얻는다', key: 'talk' },
    { label: '이번엔 물러선다', key: 'wait' },
  ],
  resolve(g, rng, s, key) {
    const st = S(g); st.rankAt = mi(g);
    const P = g.player; const sk = P.skills;
    const to = s.to ?? 2;
    const title = rankName(to);
    const up = () => { st.rank = Math.min(st.rank, to); st.favor = clamp(st.favor + 8, 0, 100); L(g).renown = (L(g).renown ?? 0) + (to <= 1 ? 8 : 4); chron(g, `${g.player.name}, ${J(title, '이/가')} 되다.`, to <= 1 ? 12 : 6); log(g, `${title}에 올랐다`); };
    if (key === 'duel') {
      const dc = to <= 1 ? 95 : 72;
      if (check(rng, (sk.sword ?? 0) + (sk.magic ?? 0) / 2 + P.stats.str + P.stats.wil / 2, dc)) { up(); return `뿔과 뿔이 부딪는 소리가 골짜기에 울렸다. 상대가 먼저 뿔을 숙였다. 피는 많이 흘리지 않았다. 마족의 겨룸은 누가 먼저 고개가 아니라 뿔을 숙이느냐로 끝난다. 오늘부터 나는 ${title}이다.`; }
      P.injuries.push({ name: '서열 다툼의 상처', months: 2 }); stress(g, 10); st.favor = clamp(st.favor - 3, 0, 100);
      return '상대의 칼이 내 뿔 끝을 깎았다. 내가 먼저 숙였다. 지켜보던 이들이 조용히 흩어졌다. 진 것은 부끄러운 일이 아니다. 다만 다음 기회는 몇 해 뒤다.';
    }
    if (key === 'talk') {
      const dc = to <= 1 ? 90 : 68;
      if (check(rng, (sk.letters ?? 0) + P.stats.cha + P.stats.int / 2 + st.favor / 4, dc)) { up(); return `한 계절 동안 소금을 들고 어른들 집을 돌았다. 마지막 집 노마족이 내 소금을 받으며 말했다. "칼 안 뽑고 오른 자는 칼 뽑은 자보다 오래 간다." ${title} 자리는 그렇게 내 것이 되었다.`; }
      stress(g, 8); return '소금은 다들 받았다. 표는 다른 이에게 갔다. 받는 것과 주는 것은 다르다는 걸 배웠다.';
    }
    gainStat(g, 'wil', 0.3); stress(g, -2);
    return '나서지 않았다. 마족에게 시간은 많다. 그 말이 핑계인지 지혜인지는 백 년쯤 지나야 안다.';
  },
});

/* ---------- 마왕 사이의 다툼에 끼다 ---------- */
const otherLord = (lord, s) => (s.foe && s.foe !== lord ? s.foe : lord === 'red' ? 'dusk' : 'red');
defineScene('dk_war', {
  title: () => '두 마왕 사이',
  text: (g, s) => `${s.news} ${lordName(S(g).lord)}의 전령이 와서 이름 있는 마족을 모은다. ${lordName(otherLord(S(g).lord, s))} 쪽에도 내가 아는 얼굴들이 있다. 같이 소금을 나눠 먹은 이들이다.`,
  choices: (g, s) => [
    { label: '앞장서서 나간다', key: 'front' },
    { label: '뒤에서 길과 짐을 맡는다', key: 'back' },
    { label: `${lordName(otherLord(S(g).lord, s))} 쪽으로 넘어간다`, key: 'turn' },
    { label: '병을 핑계로 빠진다', key: 'out' },
  ],
  resolve(g, rng, s, key) {
    const st = S(g); st.warAt = mi(g);
    const P = g.player;
    if (key === 'front') {
      if (check(rng, (P.skills.sword ?? 0) + P.stats.str + P.stats.wil / 2, 60)) { st.favor = clamp(st.favor + 12, 0, 100); st.power[st.lord] = clamp((st.power[st.lord] ?? 50) + 2, 5, 95); L(g).renown = (L(g).renown ?? 0) + 3; log(g, '마왕 사이 다툼: 앞장서 이겼다'); return '골짜기 어귀에서 맞붙었다. 해가 지기 전에 저쪽이 물러났다. 돌아오는 길에 아는 얼굴 하나가 쓰러져 있었다. 저쪽 사람이었다. 뿔을 덮어 주고 왔다.'; }
      P.injuries.push({ name: '골짜기 싸움의 상처', months: 3 }); st.favor = clamp(st.favor + 5, 0, 100); stress(g, 12); log(g, '마왕 사이 다툼: 다쳤다');
      return '창 자루가 옆구리를 쳤다. 눈을 떴을 때는 이미 싸움이 끝나 있었다. 누가 이겼는지는 아무도 똑바로 말하지 않았다. 둘 다 이겼다고 했다.';
    }
    if (key === 'back') { st.favor = clamp(st.favor + 5, 0, 100); gainSkill(g, 'trade', 0.6); gainStat(g, 'int', 0.3); log(g, '마왕 사이 다툼: 뒤에서 도왔다'); return '짐마차와 소금 자루를 셌다. 칼 든 이들보다 덜 빛나는 일이다. 그래도 겨울을 넘긴 쪽은 짐이 모자라지 않은 쪽이었다.'; }
    if (key === 'turn') {
      const old = st.lord; st.lord = otherLord(old, s); st.favor = 15; st.rank = Math.max(st.rank, 3);
      aff(father(g), -15); stress(g, 10); L(g).notoriety = (L(g).notoriety ?? 0) + 2;
      note(g, `${lordName(old)}을 떠나 ${J(lordName(st.lord), '을/를')} 섬기기로 했다.`); chron(g, `${g.player.name}, ${lordName(old)}에게서 ${lordName(st.lord)}에게로 넘어가다.`, 8); log(g, `${lordName(st.lord)} 쪽으로 넘어갔다`);
      return '밤에 골짜기를 건넜다. 저쪽 백인장이 소금을 내밀었다. 받았다. 서열은 다시 바닥부터다. 아버지에게서 온 편지는 열어 보지 않았다.';
    }
    st.favor = clamp(st.favor - 8, 0, 100); stress(g, 4); log(g, '마왕 사이 다툼: 빠졌다');
    return '앓는 척 누웠다. 전령은 아무 말 없이 명부에 무언가를 적었다. 마왕령의 명부는 오래간다.';
  },
});

/* ---------- 경계를 넘다: 마대륙에서 난 마족이 처음 사람 땅에 ---------- */
const treatHere = (g) => TREATMENT[realmOf(here(g))]?.[raceOf(me(g))] ?? 'normal';
defineScene('dk_cross', {
  title: () => '해협 이쪽',
  text: (g) => {
    const t = treatHere(g);
    return `${placeName(here(g))}. 처음 밟는 사람 땅이다. 집들이 낮고 사람들은 빨리 걷는다. 다들 짧게 산다고 들었는데, 그래서인지 서두른다. 성문 앞 아이 하나가 내 뿔을 보고 그대로 굳었다. ${t === 'banned' ? '여기서는 마족을 들이지 않는다. 성문 위에 그렇게 새겨져 있다.' : t === 'scorn' || t === 'wary' ? '여기 사람들은 마족을 꺼린다. 눈길이 그렇게 말한다.' : '여기 사람들은 놀라기는 해도 쫓아내지는 않는 모양이다.'}`;
  },
  choices: () => [
    { label: '뿔을 깎고 두건을 쓴다', key: 'hide' },
    { label: '뿔을 그대로 드러낸다', key: 'show' },
    { label: '아이에게 소금 한 줌을 건넨다', key: 'salt' },
  ],
  resolve(g, rng, s, key) {
    const st = S(g); st.crossed = true;
    const k = kindredState(g);
    log(g, `처음 사람 땅에 닿았다 (${placeName(here(g))})`);
    if (key === 'hide') { k.revealed = false; k.horn = 55; stress(g, 8); note(g, '사람 땅에서 뿔을 깎고 감추기로 했다.'); return '여관 뒤뜰에서 혼자 뿔을 깎았다. 줄이 미끄러져 손가락을 베었다. 집에서는 뿔을 남에게 맡기는 게 목을 맡기는 일이었다. 여기서는 아무에게도 맡길 수 없다.'; }
    if (key === 'show') { k.revealed = true; k.horn = 100; gainStat(g, 'wil', 0.5); return '두건을 쓰지 않았다. 사람들이 길을 비켰다. 비켜 주는 것과 피하는 것은 다르다. 오늘은 피하는 쪽이었다.'; }
    gainStat(g, 'cha', 0.4); stress(g, -2);
    return '아이 손바닥에 소금을 쥐여 주었다. 아이가 소금을 내려다보더니 핥았다. 그리고 웃었다. 마족 집에서 소금은 "오늘 밤은 싸우지 않는다"는 뜻이다. 그 아이는 몰랐을 것이다. 그래도 통했다.';
  },
});

/* ---------- 처음 마대륙에: 사람 땅에서 난 마족 ---------- */
defineScene('dk_home', {
  title: () => '뿔을 깎지 않아도 되는 땅',
  text: (g) => `${placeName(here(g))}. 부두에 내리자 지나가는 마족들이 다들 뿔을 드러내고 있다. 어떤 뿔은 나보다 길고 어떤 뿔은 금이 갔다. 아무도 두건을 쓰지 않았다. 아무도 내 두건을 보지 않는다. 아니, 한 노인이 보았다. 깎인 뿔을 아는 눈이다.`,
  choices: () => [
    { label: '두건을 벗는다', key: 'bare' },
    { label: '아직은 쓴 채로 둔다', key: 'keep' },
  ],
  resolve(g, rng, s, key) {
    const st = S(g); st.home = true; st.flags.dk_home = mi(g);
    const k = kindredState(g);
    log(g, `처음 마대륙에 닿았다 (${placeName(here(g))})`);
    if (key === 'bare') { k.revealed = true; k.horn = 100; stress(g, -10); chron(g, `${g.player.name}, 해협 너머에서 처음으로 뿔을 드러내다.`, 5); return '두건을 벗었다. 바람이 깎인 뿔 끝을 스쳤다. 노인이 다가와 소금 한 줌을 내밀었다. "이제 자라게 둬라. 몇 해면 티도 안 난다." 받아서 입에 넣었다. 짰다. 눈물 맛과 비슷했다.'; }
    stress(g, 2); return '두건 끈을 다시 맸다. 노인이 어깨를 으쓱하고 지나갔다. 습관은 뿔보다 천천히 자란다. 그리고 천천히 빠진다.';
  },
});

/* ---------- 사람 땅에서 뿔을 드러낸 마족: 쫓기는 날 ---------- */
defineScene('dk_banned', {
  title: () => '마족이 왔다',
  text: (g, s) => (s.how === 'guard'
    ? `${placeName(here(g))} 성문 경비대가 창을 겨누고 다가온다. "뿔 달린 것은 이 나라에 들어올 수 없다." 뒤에서 종이 울리기 시작했다.`
    : s.how === 'mob'
      ? '장터에서 누군가 돌을 던졌다. 하나가 둘이 되었다. "해협 놈들이 우리 마을을 태웠다!" 나는 그 마을을 본 적도 없다.'
      : '성광교 사제 둘이 길을 막았다. 손에 성수 단지를 들었다. "그 뿔에 대해 묻고 싶은 게 있다. 따라오너라."'),
  choices: (g) => [
    { label: '그 길로 이 고장을 뜬다', key: 'flee' },
    { label: '맞서 버틴다', key: 'stand' },
    ...(g.player.money >= 20 ? [{ label: '은화 20닢을 내밀며 조용히 떠나겠다고 한다', key: 'pay' }] : []),
    { label: '뿔을 깎고 감추고 살겠다고 마음먹는다', key: 'hide' },
  ],
  resolve(g, rng, s, key) {
    const st = S(g); st.bannedAt = mi(g);
    const k = kindredState(g);
    const f = faithState(g);
    log(g, `${placeName(here(g))}에서 마족이라 쫓겼다`);
    if (key === 'flee') {
      const at = here(g);
      const away = Object.keys(PLACES[at]?.links ?? {}).filter((p) => PLACES[p] && (!PLACES[p].hidden || PLACES[p].open?.(g)));
      if (away.length && !traveling(g)) { away.sort((a, b) => (inDemonLand(b) ? 1 : 0) - (inDemonLand(a) ? 1 : 0)); L(g).place = away[0]; L(g).home = 'inn'; }
      stress(g, 8); note(g, `마족이라 쫓겨 ${placeName(at)}을 떠났다.`);
      return `짐 반은 두고 나왔다. ${placeName(L(g).place)}에 닿아서야 숨을 골랐다. 뒤를 돌아보면 아직도 종소리가 들리는 것 같다.`;
    }
    if (key === 'stand') {
      if (check(rng, g.player.stats.wil + g.player.stats.cha + (g.player.skills.sword ?? 0) / 3, 55)) { L(g).renown = (L(g).renown ?? 0) + 1; gainStat(g, 'wil', 0.5); return '움직이지 않았다. 칼도 뽑지 않았다. 한참 뒤 경비대장이 손을 내렸다. "해 지기 전에만 떠나라." 해 지기 전까지 이 고장은 내 것이었다.'; }
      g.player.injuries.push({ name: '돌에 맞은 상처', months: 2 }); L(g).notoriety = (L(g).notoriety ?? 0) + 2; f.suspicion = clamp((f.suspicion ?? 0) + 10, 0, 100); stress(g, 12);
      return '버텼다. 이마가 찢어졌다. 피가 뿔을 타고 흘렀다. 그 모습이 더 무서웠는지 사람들이 물러났다. 다음 날 내 얼굴이 그려진 방이 붙었다.';
    }
    if (key === 'pay' && g.player.money < 20) return '주머니를 뒤졌지만 스무 닢이 없었다. 경비대장이 코웃음을 쳤다. "그럼 오늘 밤 안에 이 고장을 떠나라."';
    if (key === 'pay') { g.player.money -= 20; stress(g, 4); return '은화를 받은 경비대장이 눈을 돌렸다. "못 본 걸로 하지. 이번 한 번." 이 나라에서 마족의 값은 은화 스무 닢이다. 기억해 둔다.'; }
    k.revealed = false; k.horn = 60; stress(g, 10); note(g, '사람 땅에서 뿔을 깎고 감추기로 했다.');
    return '그날 밤 줄을 샀다. 대장간 주인이 무엇에 쓰냐고 물었다. 손톱을 다듬는다고 했다. 여관 방에서 뿔을 깎았다. 깎인 조각을 손에 쥐고 오래 앉아 있었다.';
  },
});

/* ---------- 마족이 아닌 이가 마대륙에 왔을 때 ---------- */
defineScene('dk_stranger', {
  title: () => '해협 너머의 낯선 자',
  text: (g, s) => (s.how === 'salt'
    ? `${placeName(here(g))}의 어느 집 문간. 뿔 긴 노파가 나를 아래위로 훑더니 손바닥을 내민다. 빈손이다. 무언가를 내놓으라는 뜻 같다. 뒤에서 마족 아이들이 숨을 죽이고 본다.`
    : `${placeName(here(g))} 길목에서 젊은 마족 셋이 앞을 막았다. 하나가 내 귀를 가리키며 웃는다. "짧게 사는 것들은 귀도 짧네." 나머지 둘은 웃지 않는다. 손이 허리에 가 있다.`),
  choices: (g, s) => (s.how === 'salt'
    ? [{ label: '소금을 한 줌 내민다', key: 'salt' }, { label: '은화를 내민다', key: 'coin' }, { label: '고개를 숙이고 지나간다', key: 'pass' }]
    : [{ label: '소금을 내밀며 싸울 뜻이 없다고 한다', key: 'salt' }, { label: '맞받아친다', key: 'fight' }, { label: '돌아서서 간다', key: 'pass' }]),
  resolve(g, rng, s, key) {
    const st = S(g); st.strangerAt = mi(g);
    if (key === 'salt') { gainStat(g, 'cha', 0.4); stress(g, -3); st.flags.dk_salt = mi(g); log(g, '마대륙에서 소금을 내밀었다'); return s.how === 'salt' ? '노파가 소금을 받아 혀에 댔다. 그리고 문을 열었다. 그날 밤 그 집에서 잤다. 아무도 나를 해치지 않았다. 소금 한 줌이 칼 한 자루보다 나았다.' : '셋이 서로 얼굴을 보았다. 한 마족이 소금을 받으며 혀를 찼다. "누가 가르쳐 줬냐." 그리고 길을 비켰다. 해협 이쪽 풍습을 아는 사람은 드물다.'; }
    if (key === 'coin') { g.player.money = Math.max(0, g.player.money - 5); stress(g, 4); return '노파가 은화를 보고 코웃음을 쳤다. 그래도 받았다. 문은 열리지 않았다. 은화는 여기서도 통하지만, 소금만큼은 아니다.'; }
    if (key === 'fight') {
      if (check(rng, (g.player.skills.sword ?? 0) + g.player.stats.str + g.player.stats.agi / 2, 60)) { L(g).renown = (L(g).renown ?? 0) + 1; return '첫 주먹이 먼저 닿았다. 셋이 물러섰다. 웃던 마족이 뿔을 아주 조금 숙였다. 여기서 그건 꽤 큰 몸짓이다.'; }
      g.player.injuries.push({ name: '마족 주먹에 맞은 자국', months: 1 }); stress(g, 10);
      return '마족의 힘은 사람과 달랐다. 길바닥에 누운 채 하늘을 보았다. 셋은 웃지도 않고 가 버렸다. 해협 너머에서 사람은 그 정도다.';
    }
    stress(g, 5); return '고개를 숙이고 지나갔다. 등 뒤에서 웃음소리가 따라왔다. 해협 이쪽에서는 내가 짧게 사는 것, 빨리 늙는 것, 신기한 이야기 속의 것이다.';
  },
});

/* ---------- 세 마왕 사이 (세상 흐름: 플레이어 없이도) ---------- */
const WAR_NEWS = new Set(['red_raid', 'dusk_border']);
function politics(g, rng) {
  const s = S(g);
  const P = s.power;
  for (const k of Object.keys(LORD_START)) P[k] = clamp((P[k] ?? LORD_START[k]) + (rng.next() - 0.5) * 1.2 + (LORD_START[k] - (P[k] ?? 50)) * 0.01, 10, 90);
  if (mi(g) - s.newsAt < 4 || !rng.chance(0.35)) return null;
  const recent = s.news.slice(-3).map((n) => n.id);
  const pool = COURT_NEWS.filter((n) => n.when(P) && !recent.includes(n.id));
  if (!pool.length) return null;
  const n = rng.pick(pool);
  for (const [k, v] of Object.entries(n.fx ?? {})) P[k] = clamp((P[k] ?? 50) + v, 10, 90);
  s.newsAt = mi(g);
  const text = n.text(P);
  s.news.push({ y: g.date.year, m: g.date.month, id: n.id, text });
  if (s.news.length > 12) s.news.shift();
  // 붉은 마왕령의 기세가 오르면 해협 습격도 거세진다 (33단계 demons)
  if (n.id === 'red_raid' || n.id === 'red_famine') { const d = demonsState(g); d.raid = clamp((d.raid ?? 25) + 3, 0, 100); }
  return n;
}

/* ---------- 매달 ---------- */
function pickFrom(g, rng, pool, tag) {
  const s = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !s.used.includes(`${tag}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  s.used.push(`${tag}${i}`); if (s.used.length > 10) s.used.shift();
  return i;
}
const DK_SCENES = ['dk_child', 'dk_name', 'dk_want', 'dk_burden', 'dk_rank', 'dk_war', 'dk_cross', 'dk_home', 'dk_banned', 'dk_stranger', 'kd_horns'];
function monthTick(g) {
  current = g;
  const s = S(g);
  s.month = [];
  const rng = ownRng(g, 7);
  const news = politics(g, rng);
  if (g.over || !g.player) return;
  const demon = isDemon(g);
  const place = here(g);
  const realm = realmOf(place);
  const inLand = realm === DEMON;
  const age = playerAge(g);
  const k = kindredState(g);
  const busy = traveling(g) || isJailed(g) || DK_SCENES.some((x) => sceneQueued(g, x));
  const wasRealm = s.lastRealm;
  // 48단계: 다른 마족 장면이 걸려 있던 달에 경계를 넘으면 '처음 넘는 날'을 영영 놓쳤다. 바쁜 달에는 지난 땅을 그대로 둔다
  if (!busy) s.lastRealm = realm;
  if (inLand) populate(g, place);

  if (!busy && !traveling(g)) {
    // 경계를 넘은 첫날
    if (demon && !inLand && wasRealm === DEMON && s.bornLand && !s.crossed && age >= 8) { s.sceneAt = mi(g); queueScene(g, 'dk_cross', {}); return; }
    if (demon && inLand && wasRealm !== DEMON && wasRealm && !s.bornLand && !s.home) { s.sceneAt = mi(g); queueScene(g, 'dk_home', {}); return; }
    // 사람 땅에서 뿔을 드러낸 마족
    if (demon && !inLand && k.revealed && age >= 10 && mi(g) - s.bannedAt >= 6) {
      const t = treatHere(g);
      const p = t === 'banned' ? 0.08 : t === 'scorn' ? 0.04 : t === 'wary' ? 0.015 : 0;
      if (rng.chance(p)) { s.bannedAt = mi(g); queueScene(g, 'dk_banned', { how: realm === 'holy' ? 'priest' : rng.pick(['guard', 'mob', 'priest']) }); return; }
    }
    // 마족이 아닌 이가 마대륙에서
    if (!demon && inLand && age >= 12 && mi(g) - s.strangerAt >= 8 && rng.chance(0.12)) { s.strangerAt = mi(g); queueScene(g, 'dk_stranger', { how: rng.pick(['salt', 'road']) }); return; }
    if (demon && mi(g) - s.sceneAt >= 4) {
      // 이름을 얻는 날: 열다섯 무렵 (마대륙에 있거나 사람 땅에 숨은 집안)
      if (!s.named && age >= 15 && (inLand || O(g)?.hidden) && (age >= 17 || rng.chance(0.25))) { s.sceneAt = mi(g); queueScene(g, 'dk_name', {}); return; }
      // 서열 다툼
      if (s.named && inLand && s.rank === 3 && age >= 25 && mi(g) - s.rankAt >= 48 && rng.chance(0.05)) { s.sceneAt = mi(g); s.rankAt = mi(g); queueScene(g, 'dk_rank', { to: 2 }); return; }
      if (s.named && inLand && s.rank === 2 && age >= 70 && s.favor >= 50 && mi(g) - s.rankAt >= 96 && rng.chance(0.03)) { s.sceneAt = mi(g); s.rankAt = mi(g); queueScene(g, 'dk_rank', { to: 1 }); return; }
      // 마왕 사이 다툼
      if (news && WAR_NEWS.has(news.id) && s.named && inLand && s.lord && s.lord !== 'silent' && age >= 18 && mi(g) - s.warAt >= 24) {
        s.sceneAt = mi(g); queueScene(g, 'dk_war', { news: news.text(s.power), foe: s.lord === 'red' ? 'dusk' : 'red' }); return;
      }
    }
  }
  if (mine(g)) {
    const o = O(g);
    if (!busy && mi(g) - s.sceneAt >= 6) {
      const sc = o.scenes.find((x) => !s.seen.includes(x.id) && age >= x.age[0] && age <= x.age[1]);
      const late = sc && age >= sc.age[1];
      if (sc && (late || rng.chance(0.3))) { s.seen.push(sc.id); s.sceneAt = mi(g); queueScene(g, 'dk_child', { sid: sc.id }); return; }
      if (!s.want && age >= 18) { s.sceneAt = mi(g); queueScene(g, 'dk_want', { met: !!o.check(g, s) }); return; }
      if (!s.burden && age >= 16 && age <= 26 && (age >= 22 || rng.chance(0.06))) { s.burden = 'due'; s.sceneAt = mi(g); queueScene(g, 'dk_burden', {}); return; }
    }
    if (s.burden === 'due' && !sceneQueued(g, 'dk_burden')) s.burden = null;
    if (age <= 15 && mi(g) - s.lineAt >= 4 && rng.chance(0.3)) { s.lineAt = mi(g); s.month.push({ kind: 'home', text: o.lines[pickFrom(g, rng, o.lines, 'l')](ctx(g)) }); return; }
  }
  // 마대륙 소식: 마족이거나 마대륙에 있으면 들린다
  if (news && (inLand ? rng.chance(0.7) : demon && rng.chance(0.25))) { s.lineAt = mi(g); s.month.push({ kind: 'court', text: news.text(s.power) }); return; }
  if (mi(g) - s.lineAt < 6) return;
  if (inLand && age <= 30 && rng.chance(0.18)) { s.lineAt = mi(g); s.month.push({ kind: 'custom', text: CUSTOM[pickFrom(g, rng, CUSTOM, 'c')]() }); return; }
  if (demon && age >= 20 && rng.chance(0.06)) { s.lineAt = mi(g); s.month.push({ kind: 'long', text: LONG_LIFE[pickFrom(g, rng, LONG_LIFE, 'g')]() }); }
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.migrate.push((g) => { current = g; const s = S(g); s.power = { ...freshPower(), ...s.power }; });
HOOKS.heir.push((g) => {
  current = g;
  const s = S(g);
  // 새 플레이어: 서열과 마왕의 눈은 몸에 붙지 않는다. 섬기던 마왕은 집안을 따라간다.
  s.rank = 4; s.favor = s.lord ? 5 : 0; s.named = false; s.crossed = false; s.home = false;
  s.rankAt = -99; s.warAt = -99; s.bannedAt = -99;
  s.lastRealm = realmOf(here(g));
  s.bornLand = inDemonLand(here(g));
  if (isDemon(g) && inDemonLand(here(g))) { const k = kindredState(g); k.revealed = true; k.horn = 100; }
  if (!s.id || s.past) return;
  s.past = true;
  const o = O(g);
  if (o) chron(g, `${o.name}에서 난 ${s.ownerName ?? '선대'}의 핏줄이 이어지다.`, 40);
});

/* ---------- 화면 연결점 ---------- */
const powerWord = (v) => (v >= 70 ? '기세가 드높다' : v >= 55 ? '힘이 붙고 있다' : v >= 40 ? '버티고 있다' : v >= 25 ? '밀리고 있다' : '흔들린다');
const favorWord = (v) => (v >= 70 ? '마왕이 이름을 안다' : v >= 45 ? '궁정에서 이름이 오간다' : v >= 20 ? '명부에 이름이 있다' : '눈에 띄지 않는다');
export function demonkindLines(g) { return (g.demonkind?.month ?? []).slice(0, 1).map((x) => ({ ...x })); }
export function demonkindLine(g) { return demonkindLines(g)[0]?.text ?? null; }
export function demonkindInfo(g) {
  const s = S(g); const o = O(g);
  const demon = g.player ? isDemon(g) : false;
  const place = g.player ? here(g) : null;
  const lords = Object.entries(LORDS).map(([id, l]) => ({ id, name: l.name, land: l.land, title: l.title, stance: l.stance, power: Math.round(s.power[id] ?? 50), word: powerWord(s.power[id] ?? 50) }));
  const news = s.news.slice(-4).reverse().map((n) => ({ y: n.y, m: n.m, text: n.text }));
  const places = DK_PLACE_IDS.map((id) => ({ id, name: PLACES[id].name, kind: PLACES[id].kind, lord: lordName(DK_PLACES[id].lord), open: !!PLACES[id].open?.(g), here: place === id }));
  const treat = g.player ? treatHere(g) : 'normal';
  const self = demon ? {
    lord: s.lord, lordName: lordName(s.lord), rank: s.rank, rankName: rankName(s.rank), named: s.named,
    favor: s.lord ? Math.round(s.favor) : null, favorWord: s.lord ? favorWord(s.favor) : null,
    treatment: treat, treatmentWord: TREAT_WORD[treat] ?? '', inDemonLand: inDemonLand(place),
  } : null;
  const fam = o ? {
    id: o.id, name: o.name, place: placeName(o.place), standing: FAMILIES.find((f) => f.id === o.id)?.standing ?? '', hidden: !!o.hidden,
    want: { name: o.want.name, text: o.want.text, state: s.want === 'met' ? '이루어 가고 있다' : s.want === 'missed' ? '다른 길로 왔다' : '아직 모른다' },
    burden: { name: o.burden.name, text: o.burden.text, state: s.burden && s.burden !== 'due' ? '한 번 닥쳤다' : '아직 오지 않았다' },
    ties: o.ties.map((t) => { const p = tie(g, t.role); return { word: t.word, name: p?.name ?? null, alive: !!p?.alive, race: raceName(raceOf(p)) }; }),
    past: s.past,
  } : null;
  if (!demon && !fam && !inDemonLand(place) && !s.opened) return null;
  return { self, family: fam, lords, news, places, opened: s.opened || demon, log: s.log.slice(-6).map((x) => ({ ...x })) };
}
