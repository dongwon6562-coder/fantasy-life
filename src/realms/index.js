// 4단계: 다른 왕국. 레오니아 밖으로 이주·여행·망명.
// 나라마다 법(범죄 처벌, 신분), 종교, 말과 이름, 물가, 받아 주는 직업이 다르다.
// 국경 통과, 추방, 망명, 거주와 귀화. 지도 화면은 아래 "화면용" export를 쓴다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainStat, gainSkill, circleOf } from '../game.js';
import { makePerson, byId } from '../npc.js';
import { L, defineScene, queueScene, sceneQueued, showScene, isAdult, traveling, note, chron, tired, stress, up, gains, spend, check } from '../adventure/core.js';
import { FOES } from '../adventure/combat.js';
import { queueFight } from '../adventure/fight.js';
import { PLACES, travelMonths, leaveJob } from '../places.js';
import { registerJob, WORK } from '../jobs.js';
import { fac } from '../factions.js';
import { setRealmLaw, setExileOption, crimeState, notoriety, addNotoriety, isJailed, jail, reportCrime, sentenceAt, craftOf } from '../crime.js';
import { remember } from '../relations.js';
import { REALMS, NAMES, REALM_PLACES, LEONIA_LINKS, REALM_PEOPLE, FOREIGN, REALM_IDS } from './data.js';

export { REALMS, REALM_IDS };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mi = (g) => g.date.year * 12 + g.date.month;

/* ---------- 장소와 길 ---------- */
Object.assign(PLACES, REALM_PLACES);
for (const [from, to] of Object.entries(LEONIA_LINKS)) Object.assign(PLACES[from].links, to);
// 잊힌 땅(에스텔라)은 어느 나라의 땅도 아니다
export const realmOf = (place) => PLACES[place]?.realm ?? (place === 'estella' ? 'wild' : 'leonia');
export const realmName = (id) => REALMS[id]?.name ?? '주인 없는 땅';
const realmShort = (id) => REALMS[id]?.short ?? '잊힌 땅';
export const realmPlaces = (id) => Object.keys(PLACES).filter((p) => realmOf(p) === id && !PLACES[p].hidden);

/* ---------- 상태 ---------- */
// game.realms: citizen(국적) cur(지금 있는 나라) last(지난달 장소) lived{나라: 달} visited[]
//   banned{나라: 풀리는 달} illegal{나라: true} asylum(망명을 받아 준 나라) piety(성광국 미사)
export function realmState(g) {
  g.realms ??= {};
  const R = g.realms;
  R.citizen ??= 'leonia';
  R.cur ??= realmOf(L(g).place ?? 'ern');
  R.last ??= L(g).place ?? 'ern';
  R.lived ??= {};
  R.visited ??= [R.cur];
  R.banned ??= {};
  R.illegal ??= {};
  R.asylum ??= null;
  R.piety ??= 0;
  R.naturalized ??= [];
  R.eventAt ??= 0;
  return R;
}
const RS = realmState;
HOOKS.newGame.push((g) => { RS(g); });
HOOKS.migrate.push((g) => { RS(g); });

export const currentRealm = (g) => realmOf(L(g).place ?? 'ern');
export const citizenship = (g) => RS(g).citizen;
export const isForeigner = (g) => REALMS[currentRealm(g)] != null && currentRealm(g) !== RS(g).citizen;
const bannedLeft = (g, id) => Math.max(0, (RS(g).banned[id] ?? 0) - mi(g));
// 외지인의 말씨: 그 나라에서 산 지 오래되면 옅어진다
export function accentOf(g) {
  if (!isForeigner(g)) return null;
  const months = RS(g).lived[currentRealm(g)] ?? 0;
  if (months >= 36) return null;
  return REALMS[RS(g).citizen]?.speech ?? null;
}

/* ---------- 이름: 그 나라 사람은 그 나라 이름을 쓴다 ---------- */
export function realmPersonName(rng, realm, sex) {
  const n = NAMES[realm];
  if (!n) return null;
  return { name: rng.pick(sex === 'm' ? n.m : n.f), lastName: rng.pick(n.last) };
}
function ensureRealmPeople(g, rng, place) {
  const life = L(g);
  if (life.placeNpcs[place] || !REALM_PEOPLE[place]) return;
  life.placeNpcs[place] = [];
  const realm = realmOf(place);
  for (const r of REALM_PEOPLE[place]) {
    const p = makePerson(rng, { sex: r.sex, ageMonths: rng.int(r.age[0], r.age[1]) * 12 + rng.int(0, 11), job: r.job, traits: r.traits });
    Object.assign(p, realmPersonName(rng, realm, p.sex));
    p.skill = r.skill ? rng.int(r.skill[0], r.skill[1]) : rng.int(35, 70);
    p.place = place;
    p.role = r.role;
    p.realm = realm;
    if (r.title) p.title = r.title;
    p.wealth = rng.int(30, 200);
    g.people.push(p);
    life.placeNpcs[place].push(p.id);
  }
}
const localBy = (g, place, role) => (L(g).placeNpcs[place] ?? []).map((id) => byId(g, id)).find((p) => p?.alive && p.role === role) ?? null;
function meetLocal(g, place, role) {
  const p = localBy(g, place, role);
  if (p && !p.known) {
    p.known = true; p.affection = 5;
    p.history.push({ y: g.date.year, m: g.date.month, text: `${J(g.player.name, '과/와')} 처음 알게 되었다.` });
  }
  return p;
}

/* ---------- 나라마다 다른 법 (crime.js로 넘긴다) ---------- */
// 이 나라에서 저 고장의 현상금이 쫓아오는가
function bountyReaches(g, here, fromPlace) {
  const to = realmOf(here), from = realmOf(fromPlace);
  if (to === from) return true;
  const law = REALMS[to]?.law;
  if (!law) return false; // 잊힌 땅에는 법이 없다
  if (RS(g).asylum === to) return false;
  if (law.bountyAll) return true;
  return (REALMS[from]?.extradites ?? []).includes(to);
}
setRealmLaw((g, place) => {
  const r = REALMS[realmOf(place)];
  if (!r) return { watch: '개척민 자경단', sentence: 0.6, fine: 0.5, bribe: 0.2, hangAt: 2, hangNoto: 101, lord: false, reach: () => false };
  const law = { ...r.law, reach: (from) => bountyReaches(g, place, from) };
  if (law.mageMul && g.player.manaAwakened && circleOf(g) >= 1) law.sentence *= law.mageMul;
  return law;
});

// 추방: 레오니아 사람은 감옥 대신 왕국 밖으로 쫓겨나기를 청할 수 있고,
// 제국은 외국인의 작은 죄를 국경 밖으로 쫓아내는 것으로 끝낸다.
setExileOption((g) => {
  const R = RS(g);
  const realm = currentRealm(g);
  const r = REALMS[realm];
  if (!r) return null;
  const m = sentenceAt(g);
  if (r.law.exile && R.citizen === realm && m >= 4) {
    return { label: `감옥 대신 ${r.short} 밖으로 추방을 청한다 (다섯 해 동안 돌아올 수 없다)`, run: (g2, rng) => exile(g2, rng, realm, 60, 'exile') };
  }
  if (realm !== R.citizen && (r.law.deport || m <= 6) && realm !== 'holy') {
    return { label: `국경 밖으로 쫓겨나는 것으로 끝낸다 (세 해 동안 ${r.short}에 들어올 수 없다)`, run: (g2, rng) => exile(g2, rng, realm, 36, 'deport') };
  }
  return null;
});
// 쫓겨난 나라 밖의 가장 가까운 고장으로 끌려간다
function nearestOutside(g, realm) {
  const here = L(g).place;
  const home = RS(g).citizen;
  const cands = Object.keys(PLACES).filter((p) => !PLACES[p].hidden && realmOf(p) !== realm && REALMS[realmOf(p)] && !bannedLeft(g, realmOf(p)));
  cands.sort((a, b) => (travelMonths(here, a) - (realmOf(a) === home ? 0.5 : 0)) - (travelMonths(here, b) - (realmOf(b) === home ? 0.5 : 0)));
  return cands[0] ?? 'ern';
}
function exile(g, rng, realm, months, kind) {
  const R = RS(g);
  const life = L(g);
  R.banned[realm] = mi(g) + months;
  delete R.illegal[realm];
  const to = nearestOutside(g, realm);
  leaveJob(g, `${realmShort(realm)}에서 쫓겨나며 일을 잃었다.`);
  life.travel = { to, left: Math.max(1, travelMonths(life.place, to)), from: life.place, forced: true };
  if (life.home !== 'street') life.home = 'inn';
  stress(g, 15);
  const r = REALMS[realm];
  note(g, `${r.name}에서 추방되었다.`);
  chron(g, `${g.player.name}, ${r.name}에서 추방되다.`);
  // 고향에서 쫓겨나면 가족이 운다
  if (kind === 'exile') {
    for (const id of g.player.familyIds) {
      const f = byId(g, id);
      if (f?.alive && !f.isPlayer) { f.affection -= 5; remember(g, f, `${r.short}에서 쫓겨났다`, -1, { tag: 'exiled' }); }
    }
    return `재판관은 잠시 장부를 내려다보다가 고개를 끄덕였다. "${r.short}의 땅을 떠나라. 다섯 해 안에 다시 발을 들이면 그때는 목을 매단다." 병사 둘이 국경까지 따라왔다. 등 뒤로 고향의 하늘이 멀어졌다. ${PLACES[to].name}까지 걸어서 가야 한다.`;
  }
  return `${r.law.watch ?? '경비대'}는 감옥 자리를 외지인에게 내주지 않았다. 짐을 뒤져 쓸 만한 것을 챙긴 뒤, 국경까지 끌고 가 등을 떠밀었다. "세 해 안에 다시 보이면 그때는 다르다." ${PLACES[to].name} 쪽으로 걸음을 옮겼다.`;
}

/* ---------- 국경 ---------- */
const tollOf = (g, realm) => Math.round(2 + (REALMS[realm]?.price ?? 1) * 2);
const atWarWith = (g, realm) => realm === 'valhart' && RS(g).citizen === 'leonia' && !!g.realm?.balhart?.war
  || realm === 'leonia' && RS(g).citizen === 'valhart' && !!g.realm?.balhart?.war;
const sneakPower = (g) => craftOf(g) * 0.5 + g.player.stats.agi * 0.3 + g.player.stats.sen * 0.3;

const BORDER_LINE = {
  leonia: '레오니아 국경 초소. 낡은 사자 깃발 아래에서 병사들이 하품을 하며 짐마차를 세운다.',
  valhart: '제국의 국경 관문. 돌로 쌓은 검문소에 반듯한 제복의 헌병들이 서 있고, 통행자의 이름과 생김새를 장부에 하나하나 적는다.',
  holy: '성광국의 경계. 순례자 행렬 사이로 회색 옷의 이단심문관이 지나는 사람마다 성호를 그어 보라고 한다.',
  serenia: '세레니아로 드는 호숫가 다리. 다리 기둥에 새긴 마법진이 지나는 사람의 마력을 훑는다. 협회 집행관이 그 빛을 지켜본다.',
  free: '자유도시의 관세 문. 서기가 짐을 풀어 값을 매기고, 그 옆에서 용병들이 시시덕거린다. 여기서는 모든 것에 값이 있다.',
  march: '변경으로 드는 마지막 성문. 칼을 찬 병사가 내 손바닥의 굳은살을 보고는 턱짓으로 들어가라고 한다. 남쪽에서 무엇을 했는지는 묻지 않는다.',
};

defineScene('border', {
  title: (g, s) => `${realmShort(s.to)} 국경`,
  text: (g, s) => {
    const R = RS(g);
    const r = REALMS[s.to];
    const lines = [BORDER_LINE[s.to] ?? ''];
    if (bannedLeft(g, s.to)) lines.push(`나는 이 나라에서 쫓겨난 몸이다. 앞으로 ${Math.ceil(bannedLeft(g, s.to) / 12)}해는 들어올 수 없다. 얼굴을 알아보면 끝이다.`);
    else if (atWarWith(g, s.to)) lines.push(`지금은 전쟁 중이다. ${realmShort(R.citizen)} 사람은 모두 첩자로 의심받는다.`);
    if (s.to === 'holy' && g.flags?.faith !== 'devout') lines.push('믿음이 얕은 외지인은 이곳에서 오래 붙잡혀 있곤 한다.');
    lines.push(`통행세는 은화 ${tollOf(g, s.to)}닢. ${r.law.sum}`);
    return lines.filter(Boolean).join(' ');
  },
  choices: (g, s) => {
    const R = RS(g);
    const banned = bannedLeft(g, s.to) > 0;
    const out = [];
    if (!banned && R.citizen === s.to) out.push({ label: `${realmShort(s.to)} 사람임을 밝힌다`, key: 'citizen' });
    if (!banned && fac(g, 'guild')?.member) out.push({ label: '모험가 길드 패를 보인다 (길드 모험가는 국경을 자유롭게 넘는다)', key: 'guild' });
    if (!banned && s.to === 'march') out.push({ label: '칼을 보이고 그냥 들어간다', key: 'sword' });
    if (!banned) out.push({ label: `통행세를 낸다 (은화 ${tollOf(g, s.to) * (atWarWith(g, s.to) ? 3 : 1)}닢)`, key: 'toll' });
    out.push({ label: `병사에게 은화를 찔러 준다 (은화 ${tollOf(g, s.to) * (banned ? 6 : 3)}닢)`, key: 'bribe' });
    out.push({ label: '산길로 몰래 넘는다', key: 'sneak' });
    out.push({ label: '돌아선다', key: 'back' });
    return out;
  },
  resolve(g, rng, s, key) {
    const R = RS(g);
    const r = REALMS[s.to];
    const banned = bannedLeft(g, s.to) > 0;
    const enter = (text) => { enterRealm(g, rng, s.to); return text; };
    if (key === 'citizen') return enter(`병사가 내 말씨를 듣더니 고개를 끄덕였다. "돌아왔군." ${J(r.short, '은/는')} 그래도 내 나라다.`);
    if (key === 'guild') return enter('길드 패를 내밀자 병사의 태도가 달라졌다. 모험가 법은 어느 나라에서나 통한다. 재앙급 마물이 나오면 끌려가 싸워야 한다는 것만 빼면.');
    if (key === 'sword') return enter('병사는 내 칼자루를 한 번 보고는 비켜섰다. "성벽에 일손이 모자라. 생각 있으면 수비대로 와."');
    if (key === 'toll') {
      const n = tollOf(g, s.to) * (atWarWith(g, s.to) ? 3 : 1);
      if (!spend(g, n)) return turnBack(g, rng, s, `통행세 은화 ${n}닢이 없었다. 병사는 손을 내저었다.`);
      if (s.to === 'holy' && g.flags?.faith !== 'devout' && rng.chance(0.35)) {
        stress(g, 8);
        return enter(`은화 ${n}닢을 냈는데도 이단심문관이 나를 따로 불러 반나절이나 기도문을 외게 했다. 틀릴 때마다 장부에 무언가를 적었다.`);
      }
      if (atWarWith(g, s.to)) return enter(`은화 ${n}닢. 첩자 심문이라며 짐을 다 풀어 헤치고 옷 솔기까지 뜯어 보았다. 나온 것이 없자 들여보내 주었다.`);
      return enter(`은화 ${n}닢을 내고 장부에 이름을 적었다. ${r.name}에 들어섰다.`);
    }
    if (key === 'bribe') {
      const n = tollOf(g, s.to) * (banned ? 6 : 3);
      if (!spend(g, n)) return turnBack(g, rng, s, '찔러 줄 은화가 모자랐다.');
      const odds = clamp(0.7 + r.law.bribe - (banned ? 0.2 : 0), 0.1, 0.95);
      if (rng.chance(odds)) { if (banned) R.illegal[s.to] = true; return enter(`병사는 은화를 소매에 넣고 장부에서 눈을 돌렸다.${banned ? ' 쫓겨났던 나라에 몰래 다시 들어섰다. 들키면 감옥이다.' : ''}`); }
      addNotoriety(g, 1);
      return turnBack(g, rng, s, `병사가 은화를 바닥에 내던졌다. "${r.law.watch ?? '경비대'}를 뭘로 보고." 은화 ${n}닢만 잃고 쫓겨났다.`);
    }
    if (key === 'sneak') {
      tired(g, 15);
      if (check(rng, sneakPower(g), s.to === 'valhart' ? 34 : 28)) {
        if (banned) R.illegal[s.to] = true;
        return enter(`달 없는 밤에 산길을 탔다. 초소의 불빛이 발아래로 지나갔다. 장부에 내 이름은 없다.${banned ? ' 쫓겨났던 나라다. 들키면 감옥이다.' : ''}`);
      }
      g.player.injuries.push({ name: '국경 산길에서 접질린 발목', months: 2 });
      return turnBack(g, rng, s, '산길에서 순찰에게 걸렸다. 쫓기다 비탈을 굴렀고, 겨우 몸만 빠져나왔다.');
    }
    return turnBack(g, rng, s, '발길을 돌렸다. 이 나라는 아직이다.');
  },
});
function turnBack(g, rng, s, text) {
  const life = L(g);
  const to = s.back && realmOf(s.back) !== s.to ? s.back : nearestOutside(g, s.to);
  life.travel = { to, left: Math.max(1, travelMonths(life.place, to)), from: life.place };
  return `${text} ${PLACES[to].name} 쪽으로 되돌아간다.`;
}
function enterRealm(g, rng, realm) {
  const R = RS(g);
  R.cur = realm;
  ensureRealmPeople(g, rng, L(g).place);
  if (!R.visited.includes(realm)) {
    R.visited.push(realm);
    chron(g, `${g.player.name}, 처음으로 ${realmName(realm)}에 발을 들이다.`);
    const r = REALMS[realm];
    note(g, `${r.name}에 처음 들어섰다. ${r.desc}`);
  }
}

/* ---------- 매달: 국경을 넘었는지, 얼마나 살았는지, 나라마다 생기는 일 ---------- */
HOOKS.afterActions.push((g, rng) => {
  const R = RS(g);
  const life = L(g);
  if (life.travel) return;
  const place = life.place;
  const realm = realmOf(place);
  if (realm !== R.cur) {
    if (!REALMS[realm] || isJailed(g) || playerAge(g) < 15) { R.cur = realm; ensureRealmPeople(g, rng, place); }
    else if (!sceneQueued(g, 'border')) queueScene(g, 'border', { to: realm, back: R.last }, { first: true });
    R.last = place;
    return;
  }
  R.last = place;
  if (!REALMS[realm]) return;
  R.lived[realm] = (R.lived[realm] ?? 0) + 1;
  ensureRealmPeople(g, rng, place);
  // 성광국의 십일조
  if (realm === 'holy' && isAdult(g) && g.player.money >= 4) g.player.money -= 1;
  // 쫓겨난 나라에 몰래 있는 사람은 언젠가 들킨다
  if (R.illegal[realm] && !isJailed(g) && rng.chance(0.04)) queueScene(g, 'caught_illegal', {}, { first: true });
});
HOOKS.afterMonth.push((g, rng) => {
  const R = RS(g);
  for (const [k, v] of Object.entries(R.banned)) if (v <= mi(g)) { delete R.banned[k]; delete R.illegal[k]; }
  if (traveling(g) || isJailed(g) || !isAdult(g) || L(g).queue.length) return;
  if (mi(g) - R.eventAt < 6) return;
  const realm = currentRealm(g);
  const ev = REALM_EVENTS[realm];
  if (!ev || !ev.when(g) || !rng.chance(ev.p)) return;
  R.eventAt = mi(g);
  queueScene(g, ev.scene, ev.data?.(g, rng) ?? {});
});

defineScene('caught_illegal', {
  title: () => '밀입국자',
  text: (g) => `${REALMS[currentRealm(g)].law.watch ?? '경비대'}의 손이 어깨에 얹혔다. "얼굴이 낯익은데. 쫓겨난 놈이 왜 아직 여기 있지?"`,
  choices: () => [{ label: '순순히 따라간다', key: 'go' }, { label: '달아난다', key: 'run' }],
  resolve(g, rng, s, key) {
    const R = RS(g);
    const realm = currentRealm(g);
    if (key === 'run' && check(rng, sneakPower(g), 30)) { stress(g, 8); return '골목 셋을 지나 하수구 덮개 밑으로 숨었다. 이번에는 놓쳤다. 다음은 모른다.'; }
    reportCrime(g, 'jailbreak', L(g).place, { mult: 0.5 });
    R.banned[realm] = mi(g) + 48;
    delete R.illegal[realm];
    jail(g, 3);
    return `붙잡혔다. 석 달을 갇힌 뒤 다시 쫓겨날 것이다. 이 나라에 들어올 수 없는 날이 네 해로 늘었다.`;
  },
});

/* ---------- 망명과 귀화 ---------- */
// 고향에 현상금이 걸렸거나 쫓겨났다면, 다른 나라에 망명을 청할 수 있다
const homeTrouble = (g) => {
  const R = RS(g);
  const c = crimeState(g);
  const bounty = Object.entries(c.bounty).filter(([p]) => realmOf(p) === R.citizen).reduce((a, [, v]) => a + v, 0);
  return bounty >= 10 || bannedLeft(g, R.citizen) > 0;
};
const naturalMonths = (g, realm) => {
  const r = REALMS[realm];
  let m = r.naturalize.months;
  if (realm === 'serenia' && circleOf(g) >= 2) m = 24;
  if (RS(g).asylum === realm) m = Math.ceil(m / 2);
  return m;
};
// 귀화 조건: 채워지지 않은 것을 글로 돌려준다 (다 채우면 null)
function naturalizeBlock(g, realm) {
  const R = RS(g);
  const r = REALMS[realm];
  const job = L(g).job;
  const lived = R.lived[realm] ?? 0;
  const need = naturalMonths(g, realm);
  const served = (id) => job?.id === id && job.months >= 12;
  const long = lived >= need || (realm === 'valhart' && served('imperial_soldier')) || (realm === 'march' && served('wall_guard'));
  if (r.naturalize.faith && g.flags?.faith !== 'devout' && R.piety < 12) return '믿음을 보여야 한다 (대성당 미사에 꾸준히 나가기)';
  if (bannedLeft(g, realm) || R.illegal[realm]) return '이 나라에서 쫓겨난 몸이다';
  if (!long) return `이 나라에서 ${need}달을 살아야 한다 (지금 ${lived}달)`;
  if (g.player.money < r.naturalize.fee) return `수수료 은화 ${r.naturalize.fee}닢이 필요하다`;
  return null;
}

ACTIONS.push({
  id: 'realm_office',
  name: '관청에 가 보기',
  icon: 'scroll',
  desc: '이 나라의 관청에서 거주 신고, 귀화, 망명을 알아본다. 나라마다 받아 주는 조건이 다르다.',
  available: (g) => isAdult(g) && !traveling(g) && !isJailed(g) && isForeigner(g) && !sceneQueued(g, 'realm_office'),
  run(g) { queueScene(g, 'realm_office'); return '관청 앞 줄에 섰다.'; },
});

defineScene('realm_office', {
  title: (g) => `${realmShort(currentRealm(g))}의 관청`,
  text: (g) => {
    const realm = currentRealm(g);
    const r = REALMS[realm];
    const R = RS(g);
    const why = naturalizeBlock(g, realm);
    const accent = accentOf(g);
    return [
      `${r.name}. 다스리는 이는 ${r.ruler}. ${r.status}`,
      `귀화: ${r.naturalize.how}${why ? ` 아직은 안 된다. ${why}.` : ' 지금 신청할 수 있다.'}`,
      R.asylum === realm ? '이 나라는 나를 망명자로 받아 주었다.' : '',
      accent ? `서기가 내 ${J(accent, '을/를')} 듣고 눈썹을 올렸다.` : '',
    ].filter(Boolean).join(' ');
  },
  choices: (g) => {
    const realm = currentRealm(g);
    const r = REALMS[realm];
    const R = RS(g);
    const out = [];
    if (!naturalizeBlock(g, realm)) out.push({ label: `귀화를 신청한다 (은화 ${r.naturalize.fee}닢)`, key: 'naturalize' });
    if (r.naturalize.buy && !bannedLeft(g, realm)) out.push({ label: `시민권을 산다 (은화 ${r.naturalize.buy}닢)`, key: 'buy' });
    if (homeTrouble(g) && R.asylum !== realm) out.push({ label: `망명을 청한다 (${realmShort(R.citizen)}에 쫓기는 몸이다)`, key: 'asylum' });
    out.push({ label: '그냥 돌아간다', key: 'leave' });
    return out;
  },
  resolve(g, rng, s, key) {
    const realm = currentRealm(g);
    const r = REALMS[realm];
    const R = RS(g);
    if (key === 'leave') return '서류 더미와 긴 줄을 보고 발길을 돌렸다.';
    if (key === 'naturalize') {
      if (naturalizeBlock(g, realm)) return '서기가 서류를 밀어냈다. 조건이 모자랐다.';
      g.player.money -= r.naturalize.fee;
      return naturalize(g, realm, NATURALIZE_TEXT[realm]);
    }
    if (key === 'buy') {
      if (g.player.money < r.naturalize.buy) return `은화 ${r.naturalize.buy}닢. 의회 서기는 돈이 모자란 사람에게 눈길도 주지 않았다.`;
      g.player.money -= r.naturalize.buy;
      return naturalize(g, realm, '의회 서기가 은화를 세어 금고에 넣고, 시민 명부에 내 이름을 적었다. 그것으로 끝이었다. 자유도시에서는 나라도 사고판다.');
    }
    if (key === 'asylum') return asylum(g, rng, realm);
    return '';
  },
});
const NATURALIZE_TEXT = {
  leonia: '영주의 장부에 다시 이름을 올렸다. 서기는 내가 어디서 무엇을 했는지 묻지 않았다. 레오니아는 그런 데 관심이 없다.',
  valhart: '등록관이 법전의 한 구절을 읽게 했다. "제국은 피를 묻지 않는다. 다만 충성을 묻는다." 손을 들어 맹세했다. 이제 황제의 신민이다.',
  holy: '대성당 제단 앞에서 무릎을 꿇었다. 추기경의 대리인이 이마에 성유를 바르고 이름을 교적부에 적었다. 이제 이 땅의 신자다. 그리고 교단의 사람이다.',
  serenia: '협회 등록관이 탑의 문장이 찍힌 청동 패를 내밀었다. "세레니아의 시민은 어느 나라에도 속하지 않습니다. 탑에만 속하지요."',
  free: '의회 서기가 시민 명부에 내 이름을 적었다. 축하한다는 말 대신 세금 고지서를 건넸다.',
  march: '장성 대장이 내 어깨를 쳤다. "이제 변경 사람이다. 남쪽에서 무슨 짓을 했든 여기서는 상관없다. 다만 도망치면 목을 매단다."',
};
function naturalize(g, realm, text) {
  const R = RS(g);
  const old = R.citizen;
  R.citizen = realm;
  R.naturalized.push({ realm, at: mi(g) });
  if (R.asylum === realm) R.asylum = null;
  note(g, `${realmName(realm)} 사람이 되었다.`);
  chron(g, `${g.player.name}, ${J(realmShort(old), '을/를')} 떠나 ${realmName(realm)} 사람이 되다.`);
  // 원수 나라의 사람이 되면 고향 가족이 등을 돌린다
  if (old === 'leonia' && realm === 'valhart' && (g.realm?.balhart?.tension ?? 0) >= 50) {
    for (const id of g.player.familyIds) {
      const f = byId(g, id);
      if (f?.alive && !f.isPlayer) { f.affection -= 8; remember(g, f, '제국 신민이 되었다', -1, { tag: 'turncoat', recall: '네가 제국 놈들의 신민이 된 일' }); }
    }
    return `${text} 고향에서는 이 소식을 반기지 않을 것이다.`;
  }
  return text;
}
function asylum(g, rng, realm) {
  const R = RS(g);
  const grant = () => { R.asylum = realm; note(g, `${realmName(realm)}에 망명했다.`); chron(g, `${g.player.name}, ${realmName(realm)}에 망명하다.`); };
  if (realm === 'valhart' && R.citizen === 'leonia') {
    grant();
    g.realm && (g.realm.balhart.tension = clamp(g.realm.balhart.tension + 2, 0, 100));
    return '제국 관리는 레오니아에서 도망쳐 온 사람을 반겼다. 대신 왕국 남부의 길과 영주들에 대해 반나절 동안 물었다. 아는 것을 말했다. 망명이 받아들여졌다. 레오니아의 현상금은 이제 여기까지 오지 못한다.';
  }
  if (realm === 'holy') {
    if (g.flags?.faith === 'devout' && notoriety(g) < 40) { grant(); return '대성당은 회개하는 죄인을 내치지 않는다고 했다. 고해를 마치자 망명이 받아들여졌다. 교단의 그늘 아래에서는 왕국의 현상금도 손을 대지 못한다.'; }
    return '대성당 서기는 내 이름을 듣더니 장부를 덮었다. "교단은 죄인을 숨겨 주지 않습니다." 이단심문관이 내 얼굴을 오래 보았다.';
  }
  if (realm === 'free') {
    if (!spend(g, 50)) return '의회 서기가 말했다. "보호에도 값이 있습니다. 은화 50닢." 그만한 돈이 없었다.';
    grant();
    return '은화 50닢을 내자 의회 서기가 보호 증서에 도장을 찍었다. 이제 현상금 사냥꾼들은 의회와 싸울 각오를 해야 한다.';
  }
  if (realm === 'serenia') {
    if (circleOf(g) >= 1) { grant(); return '협회는 마법사를 다른 나라에 넘겨주지 않는다. 등록관은 내 마력을 한 번 재 보고 망명 서류에 서명했다.'; }
    return '협회 등록관이 고개를 저었다. "세레니아는 마법사의 도시입니다. 마력도 없는 도망자를 위한 곳이 아니지요."';
  }
  grant();
  return '장성 대장은 서류도 보지 않았다. "여기서는 칼만 들면 된다. 남쪽 놈들이 쫓아오면 성벽 밖으로 던져 주지." 망명이 받아들여졌다.';
}

/* ---------- 나라마다 받아 주는 일 ---------- */
const addPlaces = (id, ...places) => { if (WORK[id]) WORK[id].places.push(...places.filter((p) => !WORK[id].places.includes(p))); };
addPlaces('laborer', 'eisen', 'solaris', 'serenia', 'barka', 'graubel');
addPlaces('cook', 'eisen', 'serenia', 'barka');
addPlaces('shop', 'eisen', 'solaris', 'barka');
addPlaces('clerk', 'eisen', 'barka', 'serenia');
addPlaces('guard', 'barka');
addPlaces('smith', 'eisen', 'graubel');
addPlaces('artificer', 'eisen', 'serenia');
// 제국 관청 서기는 신민만, 성광국은 믿음이 있어야 한다
const clerkReq = WORK.clerk?.req;
if (WORK.clerk) WORK.clerk.req = (g) => (realmOf(L(g).place) === 'valhart' && RS(g).citizen !== 'valhart' ? '제국 신민' : clerkReq?.(g) ?? null);

registerJob('imperial_soldier', {
  name: '제국군 병사', places: ['eisen'], skill: 'sword', stat: 'str', stat2: 'wil', wage: [3, 5, 8, 12], npcJob: 'guard', fightRisk: 0.06, lodging: 'barracks',
  ranks: ['병사', '하사관', '백인대장', '제국 기사'],
  req: (g) => (g.player.stats.str < 18 ? '힘 18' : null),
  lines: ['연병장에서 창 대열을 맞췄다. 교관은 출신 대신 발이 맞는지만 보았다.', '제국 법전을 소리 내어 외웠다. 병사도 글을 알아야 한다는 것이 황제의 뜻이다.', '마법사 군단과 합동 훈련을 했다. 불덩이가 머리 위로 지나갔다.', '국경 행군에서 돌아왔다. 군화 밑창이 다 닳았다.'],
});
registerJob('temple_servant', {
  name: '대성당 일꾼', places: ['solaris'], skill: null, stat: 'wil', wage: [2, 3, 4, 6], npcJob: 'laborer',
  req: (g) => (g.flags?.faith === 'devout' || RS(g).citizen === 'holy' || RS(g).piety >= 6 ? null : '믿음 (미사에 나가기)'),
  lines: ['새벽 미사 전에 대성당 바닥을 닦았다. 금빛 모자이크에 비친 내 얼굴이 작았다.', '순례자들의 발을 씻겼다. 먼 남쪽에서 맨발로 걸어온 노파도 있었다.', '이단심문소로 들어가는 짐마차를 보았다. 무엇을 실었는지는 묻지 않았다.'],
});
registerJob('tower_scribe', {
  name: '탑의 필경사', places: ['serenia'], skill: 'letters', stat: 'int', wage: [3, 5, 8, 12], npcJob: 'scholar',
  req: (g) => (g.player.skills.letters >= 30 ? null : '글과 학문 30'),
  lines: ['닳아 가는 마법서를 새 양피지에 옮겨 적었다. 마법진 하나를 잘못 그리면 처음부터 다시다.', '탑의 서고에서 목록을 정리했다. 열쇠가 없는 칸이 몇 개 있었다.', '젊은 마법사의 논문을 정서해 주었다. 틀린 계산을 고쳐 주었더니 얼굴이 붉어졌다.'],
});
registerJob('tower_porter', {
  name: '탑 짐꾼', places: ['barka'], skill: null, stat: 'str', stat2: 'sen', wage: [3, 4, 6, 8], npcJob: 'laborer', risk: 0.05,
  lines: ['모험가 파티의 짐을 지고 끝없는 탑 3층까지 올랐다.', '마석 자루를 지고 거래소까지 뛰었다. 한 자루가 내 품삯의 백 배다.', '돌아오지 못한 파티의 짐을 찾으러 올라갔다. 짐만 있었다.'],
});
registerJob('wall_guard', {
  name: '장성 수비대', places: ['graubel'], skill: 'sword', stat: 'str', stat2: 'wil', wage: [4, 5, 8, 12], npcJob: 'guard', fightRisk: 0.09, lodging: 'barracks',
  ranks: ['신병', '고참', '십인대장', '성벽 기사'],
  lines: ['얼어붙은 성벽 위에서 밤새 북쪽 바다를 보았다.', '마족 정찰병의 시체를 성벽 밖으로 던졌다. 생각보다 사람과 닮았다.', '드워프 대장장이에게 칼날을 갈았다. 그는 내 칼을 보고 혀를 찼다.', '신병들에게 활 쏘는 법을 가르쳤다. 열두 살짜리도 있었다.'],
});

/* ---------- 수도마다 할 수 있는 일 ---------- */
const fee = (g, n, fail) => (spend(g, n) ? null : fail);
ACTIONS.push(
  {
    id: 'eisen_academy', place: ['eisen'], name: '사관학교 공개 강의',
    desc: '제국 기사 사관학교가 평민에게 여는 강의. 병법과 검술 이론. 은화 4닢.',
    available: (g) => playerAge(g) >= 13,
    run(g, rng) {
      const f = fee(g, 4, '청강료가 모자랐다. 제국은 공짜가 없다.'); if (f) return f;
      tired(g, 12);
      const k = gainSkill(g, 'sword', 1.2, 'agi'), l = gainSkill(g, 'letters', 1.2, 'int'), i = gainStat(g, 'int', 0.4);
      const p = meetLocal(g, 'eisen', 'recruiter');
      return `${rng.pick(['교관이 칠판에 레오니아 국경 요새 셋을 그렸다. "이 셋을 얻는 데 이백 년이 걸렸다. 너희 대에 끝낸다."', '평민 출신 백인대장이 강단에 섰다. 귀족이던 학생들이 숨을 죽였다.', '검왕 레온이 젊었을 때 썼다는 보법을 배웠다. 반쯤 따라 했다.'])}${p ? ` ${p.title} ${J(p.name, '이/가')} 나를 눈여겨보았다.` : ''}${gains([up('검술', k), up('글과 학문', l), up('지능', i)])}`;
    },
  },
  {
    id: 'solaris_mass', place: ['solaris'], name: '대성당 미사',
    desc: '금빛 대성당의 미사에 나간다. 마음이 가라앉고, 이 나라 사람들의 눈길이 누그러진다.',
    available: (g) => playerAge(g) >= 6,
    run(g, rng) {
      const R = RS(g);
      tired(g, 4); stress(g, -10);
      R.piety += 1;
      const w = gainStat(g, 'wil', 0.5);
      let extra = '';
      if (R.piety >= 12 && g.flags?.faith !== 'devout') { g.flags = g.flags ?? {}; g.flags.faith = 'devout'; extra = ' 어느 날부터 기도문이 입이 아니라 가슴에서 나왔다. 믿음이 생긴 것이다.'; }
      meetLocal(g, 'solaris', 'neighbor');
      return `${rng.pick(['수천 명이 한목소리로 기도문을 외웠다. 그 소리가 돔 천장에서 비처럼 쏟아졌다.', '교황이 발코니에 나왔다. 아주 작고 늙은 사람이었다. 군중이 울었다.', '설교 사제가 이종족은 빛의 자식이 아니라고 했다. 옆자리 사람들이 고개를 끄덕였다.', '성녀 리아나의 유품이라는 은 손거울이 행렬을 따라 지나갔다.'])}${extra}${gains([up('의지', w)])}`;
    },
  },
  {
    id: 'serenia_lecture', place: ['serenia'], name: '탑의 공개 강의',
    desc: '일곱 탑이 돌아가며 여는 공개 강의. 마력이 있으면 마법을, 없으면 학문을 얻는다. 은화 6닢.',
    available: (g) => playerAge(g) >= 12,
    run(g, rng) {
      const f = fee(g, 6, '세레니아의 강의는 비싸다. 돈이 모자랐다.'); if (f) return f;
      tired(g, 12);
      const mg = g.player.manaAwakened ? gainSkill(g, 'magic', 1.8, 'int') : 0;
      const l = gainSkill(g, 'letters', g.player.manaAwakened ? 0.8 : 2.0, 'int'), i = gainStat(g, 'int', 0.6);
      if (g.player.manaAwakened) g.player.mana += g.player.manaPotential * 0.3;
      const m = meetLocal(g, 'serenia', 'mage');
      return `${rng.pick(['5서클 노마법사가 마력 회로를 셋으로 나누는 이론을 설명했다. 강의실 절반이 졸았고, 나머지 절반은 울상이었다.', '노아가 오백 년 전에 남긴 주석서의 한 줄을 두고 두 교수가 강단에서 싸웠다.', '시공 마법은 이론으로만 다룬다는 말을 교수가 세 번이나 강조했다. 뒷줄의 누군가가 웃었다.'])}${m && m.affection <= 5 ? ` 강단 옆에 선 ${m.title} ${J(m.name, '이/가')} 청강생들을 훑어보았다.` : ''}${gains([up('마법', mg), up('글과 학문', l), up('지능', i)])}`;
    },
  },
  {
    id: 'barka_exchange', place: ['barka'], name: '마석 거래소',
    desc: '마석 시세가 매일 바뀌는 거래소. 눈치가 늘고, 운이 좋으면 몇 닢 남긴다. 운이 나쁘면 잃는다.',
    available: (g) => isAdult(g),
    run(g, rng) {
      tired(g, 8); stress(g, 4);
      const t = gainSkill(g, 'trade', 1.6, 'cha'), sn = gainStat(g, 'sen', 0.4);
      const stake = Math.min(g.player.money, 10);
      const skill = g.player.skills.trade ?? 0;
      let res = '';
      if (stake >= 3) {
        const win = rng.chance(clamp(0.4 + skill / 250, 0.4, 0.7));
        const n = Math.max(1, Math.round(stake * rng.int(2, 6) / 10));
        g.player.money += win ? n : -n;
        res = win ? ` 하급 마석 몇 개를 사서 오후에 팔았다. 은화 ${n}닢이 남았다.` : ` 탑에서 대량으로 마석이 나왔다는 소문에 값이 떨어졌다. 은화 ${n}닢을 잃었다.`;
      }
      meetLocal(g, 'barka', 'broker');
      return `${rng.pick(['칠판의 숫자가 한 시진마다 바뀌었다. 중개상들의 손가락이 쉴 새 없이 움직였다.', '남해 연맹 쪽 상인들이 몰려와 값을 흔들었다. 의회 경비대가 문 앞에 섰다.', '탑 60층에서 나왔다는 상급 마석 하나가 금화 열 닢에 팔렸다.'])}${res}${gains([up('장사', t), up('감각', sn)])}`;
    },
  },
  {
    id: 'graubel_watch', place: ['graubel'], name: '성벽 위에서 망보기',
    desc: '삯 없이 성벽 위 횃불 곁에 선다. 감각과 의지가 단련되고, 변경 사람들이 얼굴을 기억한다. 가끔 북쪽에서 무언가가 온다.',
    available: (g) => playerAge(g) >= 14,
    run(g, rng) {
      tired(g, 12);
      const sn = gainStat(g, 'sen', 0.6), w = gainStat(g, 'wil', 0.5);
      const p = meetLocal(g, 'graubel', 'official');
      if (p) p.affection += 1;
      if (rng.chance(0.12)) {
        queueFight(g, rng, {
          title: '성벽 아래의 그림자',
          intro: '자정 무렵, 성벽 아래 눈밭에서 검은 형체들이 기어 올라왔다. 마족 척후다. 경보종이 울리기 전에 막아야 한다.',
          enc: { unit: 'demon_scout', count: rng.int(2, 4), leader: rng.chance(0.25) ? 'demon_captain' : null },
          reward: { money: 6, renown: 2 },
          avoidLabel: '경보종을 치러 달려간다',
          avoidText: '종을 쳤다. 수비대가 몰려와 척후들을 밀어냈다. 나는 칼 한 번 뽑지 못했다.',
        });
        return `밤바람 속에서 무언가 움직였다.${gains([up('감각', sn), up('의지', w)])}`;
      }
      return `${rng.pick(['북쪽 바다 위로 붉은 불빛이 깜박였다. 마왕령 쪽이다. 아무도 말하지 않았다.', '고참 병사가 50년 전 마왕군이 성벽까지 왔던 밤 이야기를 했다. 그의 아버지가 그날 죽었다.', '눈보라 속에서 밤새 횃불을 지켰다. 아침에 손가락이 굳어 펴지지 않았다.'])}${gains([up('감각', sn), up('의지', w)])}`;
    },
  },
);
Object.assign(FOES, {
  demon_scout: { name: '마족 척후', pow: 30, weapon: '검은 곡도' },
  demon_captain: { name: '마족 백인장', pow: 58, leader: true, weapon: '피 묻은 대검' },
});

/* ---------- 나라마다 생기는 일 ---------- */
const REALM_EVENTS = {
  holy: { scene: 'realm_inquisitor', p: 0.18, when: (g) => g.flags?.faith !== 'devout' && (notoriety(g) >= 15 || (g.player.manaAwakened && RS(g).citizen !== 'holy')) },
  valhart: { scene: 'realm_spy', p: 0.2, when: (g) => RS(g).citizen === 'leonia' && (g.realm?.balhart?.tension ?? 0) >= 55 },
  free: { scene: 'realm_slaves', p: 0.15, when: () => true },
  march: { scene: 'realm_raid', p: 0.18, when: (g) => (g.realm?.north?.garbes ?? 0) >= 35 },
  serenia: { scene: 'realm_forbidden', p: 0.15, when: (g) => g.player.manaAwakened },
};

defineScene('realm_inquisitor', {
  title: () => '이단심문관',
  text: (g) => {
    const p = localBy(g, 'solaris', 'inquisitor');
    return `회색 옷의 ${p ? J(p.name, '이/가') : '이단심문관이'} 숙소 앞에서 나를 기다리고 있었다. "외지인. 당신의 이름이 몇 번 들려왔소. ${g.player.manaAwakened ? '마력을 지녔다지. 협회에 등록은 했소? 교단의 허락은?' : '미사에 잘 나오지 않는다지.'} 잠깐 이야기를 나눕시다."`;
  },
  choices: () => [
    { label: '순순히 심문을 받는다', key: 'submit' },
    { label: '대성당에 헌금하고 넘어간다 (은화 20닢)', key: 'pay' },
    { label: '오늘 밤 이 나라를 뜬다', key: 'flee' },
  ],
  resolve(g, rng, s, key) {
    const p = localBy(g, 'solaris', 'inquisitor');
    if (p) p.known = true;
    if (key === 'pay' && spend(g, 20)) { RS(g).piety += 3; return '은화 스무 닢이 헌금함으로 들어갔다. 심문관은 성호를 긋고 돌아섰다. "신앙은 행동으로 보이는 것이오." 교단은 언제나 이렇게 말한다.'; }
    if (key === 'flee') { RS(g).banned.holy = mi(g) + 24; const to = nearestOutside(g, 'holy'); const life = L(g); leaveJob(g); life.travel = { to, left: Math.max(1, travelMonths(life.place, to)), from: life.place }; return `짐을 싸서 밤길을 나섰다. 성도의 종소리가 등 뒤에서 멀어졌다. 한동안은 이 나라에 돌아오지 않는 편이 낫다. ${PLACES[to].name}로 간다.`; }
    const ok = check(rng, g.player.stats.wil * 0.6 + g.player.stats.cha * 0.4, 30);
    tired(g, 15); stress(g, 15);
    if (ok) { RS(g).piety += 2; return '사흘 동안 지하의 돌방에서 같은 질문에 답했다. 나흘째 아침, 문이 열렸다. "이번에는 그대의 말을 믿겠소." 이번에는.'; }
    g.player.injuries.push({ name: '심문소에서 얻은 손가락 상처', months: 3 });
    addNotoriety(g, 3);
    jail(g, 2);
    return '대답이 마음에 들지 않았던 모양이다. 손가락 셋이 부러진 채 회색 감옥으로 옮겨졌다. 두 달 뒤에야 풀려날 것이다.';
  },
});

defineScene('realm_spy', {
  title: () => '제국의 눈',
  text: () => '선술집 구석에서 말끔한 옷차림의 남자가 맞은편에 앉았다. "레오니아에서 왔다지. 남쪽 길과 영주들 사정에 밝겠군. 제국은 쓸모 있는 사람에게 후하오." 탁자 위에 은화 주머니가 놓였다.',
  choices: () => [
    { label: '아는 것을 팔아넘긴다 (은화 40닢)', key: 'sell' },
    { label: '거짓 정보를 흘린다', key: 'lie' },
    { label: '거절한다', key: 'refuse' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'sell') {
      g.player.money += 40;
      g.realm && (g.realm.balhart.tension = clamp(g.realm.balhart.tension + 3, 0, 100));
      addNotoriety(g, 3);
      crimeState(g).secrets.push({ about: 'self', text: '제국에 고향의 사정을 팔아넘겼다', at: mi(g) });
      return '은화 마흔 닢. 고향 영주들의 이름과 성벽이 무너진 곳을 말해 주었다. 남자는 꼼꼼히 받아 적고는 사라졌다. 술맛이 썼다.';
    }
    if (key === 'lie') {
      if (check(rng, g.player.stats.cha * 0.6 + g.player.stats.int * 0.4, 32)) { g.player.money += 15; return '그럴듯한 거짓말을 늘어놓았다. 남자는 은화 열다섯 닢을 놓고 갔다. 언젠가 거짓인 줄 알게 되겠지만, 그때 나는 여기 없을 것이다.'; }
      stress(g, 12); g.player.injuries.push({ name: '뒷골목에서 맞은 갈비뼈', months: 2 });
      return '남자의 눈이 가늘어졌다. 그날 밤 숙소로 돌아가는 골목에서 사내 셋에게 둘러싸였다. 제국은 거짓말을 싫어한다.';
    }
    return '"아쉽군." 남자는 주머니를 거두고 일어섰다. 그 뒤로 거리에서 같은 얼굴을 두 번 더 보았다.';
  },
});

defineScene('realm_slaves', {
  title: () => '밤의 부두',
  text: () => '자정의 부두 창고. 등불 아래 쇠사슬에 묶인 수인 아이들이 앉아 있다. 노예상이 손님을 부른다. "성광국에서 금화 열 닢은 받을 놈들이오. 오늘은 은화 마흔 닢." 의회 경비대는 보이지 않는다.',
  choices: () => [
    { label: '한 아이의 값을 치르고 풀어 준다 (은화 40닢)', key: 'free' },
    { label: '창고에 몰래 불을 지르고 사슬을 끊는다', key: 'raid' },
    { label: '일손을 구하는 노예상 밑에서 일한다', key: 'join' },
    { label: '못 본 척 지나간다', key: 'pass' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'free') {
      if (!spend(g, 40)) return '은화 마흔 닢이 없었다. 노예상은 웃으며 다음 손님에게 갔다.';
      L(g).renown += 2; addNotoriety(g, -2);
      chron(g, `${g.player.name}, 바르카의 밤 부두에서 수인 아이 하나를 사서 풀어 주다.`);
      return '사슬을 풀자 아이는 고맙다는 말 없이 어둠 속으로 달아났다. 그래도 됐다. 노예상은 내 얼굴을 기억해 두는 눈치였다.';
    }
    if (key === 'raid') {
      if (check(rng, craftOf(g) * 0.4 + g.player.stats.agi * 0.4 + g.player.stats.sen * 0.3, 34)) {
        L(g).renown += 3;
        return '창고 뒤편 짚더미에 불을 놓았다. 노예상들이 불을 끄러 뛰는 사이 자물쇠를 부쉈다. 아이들이 부두 너머로 흩어졌다. 아무도 내 얼굴을 보지 못했다.';
      }
      reportCrime(g, 'burglary');
      queueFight(g, rng, { title: '노예상의 칼잡이', intro: '자물쇠를 부수던 손목을 누군가 붙잡았다. 노예상의 칼잡이들이다.', enc: { unit: 'thug', count: rng.int(2, 4), leader: rng.chance(0.4) ? 'bandit_chief' : null }, reward: { money: 5, renown: 2 }, avoidLabel: '바다로 뛰어든다', avoidText: '차가운 바다로 뛰어들었다. 등 뒤로 욕설이 쏟아졌다.' });
      return '불이 제대로 붙지 않았다.';
    }
    if (key === 'join') {
      g.player.money += 25; addNotoriety(g, 6);
      crimeState(g).secrets.push({ about: 'self', text: '노예상 밑에서 일했다', at: mi(g) });
      return '쇠사슬 끝을 쥐고 아이들을 배에 태웠다. 은화 스물다섯 닢을 받았다. 그날 밤은 잠이 오지 않았다. 아니, 생각보다 잘 잤다. 그게 더 무서웠다.';
    }
    stress(g, 6);
    return '발걸음을 재촉했다. 등 뒤에서 아이 하나가 울기 시작했다가 곧 그쳤다.';
  },
});

defineScene('realm_raid', {
  title: () => '경보',
  text: () => '새벽, 성벽의 경보종이 미친 듯이 울렸다. 마족 습격대가 바깥 마을을 덮쳤다. 수비대가 문을 나서며 소리친다. "칼 든 놈은 다 따라와!"',
  choices: () => [{ label: '칼을 들고 따라나선다', key: 'go' }, { label: '성벽 안에 남아 다친 사람을 나른다', key: 'help' }, { label: '문을 걸어 잠근다', key: 'hide' }],
  resolve(g, rng, s, key) {
    if (key === 'go') {
      queueFight(g, rng, { title: '바깥 마을의 싸움', intro: '불타는 집 사이로 마족들이 사람을 끌고 가고 있다.', enc: { unit: 'demon_scout', count: rng.int(2, 4), leader: rng.chance(0.35) ? 'demon_captain' : null }, reward: { money: 8, renown: 3 }, avoidLabel: '끌려가던 사람을 데리고 물러난다', avoidText: '한 사람이라도 데리고 성벽 안으로 물러났다.' }, { first: true });
      return '칼을 뽑고 문밖으로 뛰었다.';
    }
    if (key === 'help') { const w = gainStat(g, 'wil', 0.6); tired(g, 15); L(g).renown += 1; return `하루 종일 피투성이 사람들을 날랐다. 저녁 무렵 손이 떨려 물잔을 들 수 없었다.${gains([up('의지', w)])}`; }
    stress(g, 10);
    const p = localBy(g, 'graubel', 'neighbor');
    if (p?.known) { p.affection -= 6; remember(g, p, '경보가 울렸을 때 문을 걸어 잠갔다', -1, { tag: 'coward' }); }
    return '문을 걸어 잠그고 비명이 그치기를 기다렸다. 변경 사람들은 이런 일을 오래 기억한다.';
  },
});

defineScene('realm_forbidden', {
  title: () => '열쇠 없는 칸',
  text: () => '호숫가 찻집에서 처음 보는 마법사가 말을 걸었다. "제7탑 지하에 열쇠 없는 서고가 있소. 노아가 봉인했다는 시공 마법 사본이 있지. 오늘 밤 문이 열리오. 관심 있소?" 금기 마법은 모든 나라에서 사형이다.',
  choices: () => [{ label: '따라간다', key: 'go' }, { label: '협회에 알린다', key: 'report' }, { label: '못 들은 것으로 한다', key: 'pass' }],
  resolve(g, rng, s, key) {
    if (key === 'go') {
      const k = gainSkill(g, 'magic', 4, 'int');
      g.player.mana += g.player.manaPotential * 0.6;
      stress(g, 15);
      if (rng.chance(0.3)) { reportCrime(g, 'snoop'); addNotoriety(g, 4); return `한 시진 동안 사본을 읽었다. 머리가 깨질 듯했다. 돌아 나오는 계단에서 협회 집행관의 등불을 보았다. 얼굴을 가리고 달렸지만, 장부에 무언가 적혔을 것이다.${gains([up('마법', k)])}`; }
      return `한 시진 동안 사본을 읽었다. 시간이 접히는 이야기였다. 반도 이해하지 못했지만, 그 반이 나를 바꿔 놓았다. 아무도 보지 못했다.${gains([up('마법', k)])}`;
    }
    if (key === 'report') { const p = meetLocal(g, 'serenia', 'official'); if (p) p.affection += 8; L(g).renown += 1; return '협회 등록관은 고맙다고 했다. 그 마법사는 다시 보이지 않았다. 등록관이 왜 그렇게 놀라지 않았는지는 지금도 모르겠다.'; }
    return '찻잔을 내려놓고 일어섰다. 그날 밤 제7탑 꼭대기의 불은 늦게까지 꺼지지 않았다.';
  },
});

/* ---------- 대 잇기: 국적은 이어지고, 추방과 망명은 그 사람으로 끝난다 ---------- */
HOOKS.heir.push((g) => {
  const R = RS(g);
  R.banned = {}; R.illegal = {}; R.asylum = null; R.piety = 0;
  R.cur = currentRealm(g);
  R.last = L(g).place;
});

/* ---------- 화면용 (도우미스레드1: 대륙 지도, 국경 이동) ---------- */
// 나라 하나의 정보와 나와의 관계
export function realmInfo(g, id) {
  const r = REALMS[id];
  if (!r) return null;
  const R = RS(g);
  const banned = bannedLeft(g, id);
  const standing = R.citizen === id ? (R.naturalized.some((n) => n.realm === id) ? '귀화' : '고향') : banned ? '추방됨' : R.asylum === id ? '망명' : R.visited.includes(id) ? '가 봄' : '모름';
  return {
    id, name: r.name, short: r.short, ruler: r.ruler, rule: r.rule, desc: r.desc,
    faith: r.faith.name, faithDesc: r.faith.desc, status: r.status, law: r.law.sum, speech: r.speech,
    price: r.price, priceWord: r.price >= 1.25 ? '비쌈' : r.price >= 1.1 ? '조금 비쌈' : '보통',
    capital: r.capital, places: realmPlaces(id),
    standing, citizen: R.citizen === id, here: currentRealm(g) === id,
    lived: R.lived[id] ?? 0, bannedMonths: banned, illegal: !!R.illegal[id],
    naturalize: r.naturalize.how, naturalizeBlock: R.citizen === id ? null : naturalizeBlock(g, id),
  };
}
export const realmsForMap = (g) => REALM_IDS.map((id) => realmInfo(g, id));
// 지도에서 장소를 고를 때 보일 국경 안내 (같은 나라면 null)
export function borderNote(g, toPlace) {
  const from = currentRealm(g), to = realmOf(toPlace);
  if (from === to || !REALMS[to]) return null;
  if (bannedLeft(g, to)) return `${REALMS[to].short}에서 쫓겨난 몸이다. 몰래 넘어야 한다.`;
  if (RS(g).citizen === to) return `${REALMS[to].short} 국경 (내 나라)`;
  return `${REALMS[to].short} 국경을 넘는다 (통행세 은화 ${tollOf(g, to)}닢${atWarWith(g, to) ? ', 전쟁 중이라 세 배' : ''})`;
}
// 지금 있는 나라와 내 국적 (화면 위쪽 한 줄, 지도 탭 머리말용)
export function realmStatus(g) {
  const here = currentRealm(g);
  const R = RS(g);
  return {
    here, hereName: realmName(here), citizen: R.citizen, citizenName: realmName(R.citizen),
    foreigner: isForeigner(g), accent: accentOf(g), asylum: R.asylum, info: realmInfo(g, here),
    line: !REALMS[here] ? '주인 없는 땅' : isForeigner(g) ? `${REALMS[here].short} (외지인, ${REALMS[R.citizen].short} 사람)` : REALMS[here].short,
  };
}
// 지도에 넣을 왕국 장소: 게임에서 갈 수 있는 다른 나라 장소 (지도 P에 이미 같은 id가 있다)
export const MAP_PLACES_EXTRA = Object.entries(REALM_PLACES).map(([id, p]) => ({ id, realm: p.realm, name: p.name }));
// 지도에서 나라를 눌렀을 때: 그 나라 수도로 가는 길 떠나기 장면을 띄운다. 못 가면 false
export function crossBorder(g, realmId) {
  const r = REALMS[realmId];
  if (!r || !isAdult(g) || traveling(g) || isJailed(g) || g.over || realmId === currentRealm(g)) return false;
  return showScene(g, { kind: 'travel', at: L(g).place, to: r.capital, abroad: true }, { force: true });
}
export { FOREIGN };
