// 17단계: 하인과 식솔.
// 집이 커지면 사람이 든다. 들인 사람은 이름이 있고, 마음이 있고, 귀와 손이 있다.
// - 하인 들이기(household_hire): 내 집이 있는 고장에서 하녀·머슴, 유모, 집사, 마부, 찬모, 문지기를 들인다.
//   estate의 하인 수(homeOf.servants) 안에서 이름 있는 사람을 둔다. 하인 삯(SERVANT_WAGE)은 estate가 내고, 맡은 일의 웃돈은 여기서 낸다.
// - 집안 살피기(household_manage): 상을 주거나 웃돈을 올리거나 내보낸다.
// - 충성(loyalty)과 불만(grievance): 삯이 밀리면, 내가 맹세를 깬 사람이면, 몰아세우면 불만이 쌓인다. 오래 섬기면 충성이 쌓인다.
//   손버릇 나쁜 하인은 물건을 훔치고(household_thief), 귀 밝은 하인은 내 비밀을 엿듣는다(household_ears).
//   집사는 살림을 아끼거나 몰래 빼돌린다(household_skim). 불만이 차면 웃돈을 달라고 한다(household_grievance).
// - 대를 이어 섬기는 집안: 늙거나 죽은 하인의 자식을 들이면(household_old) 그 집안이 '몇 대째' 우리 집을 섬긴다.
//   내가 죽어 대를 이어도 하인은 남는다(household_heir). 몇 대를 섬겼는지(masters)가 쌓인다.
// - 내가 하인으로 살기(household_serve): 큰 집안(백작가·공작가 등 history 가문)의 하인으로 들어간다. 일은 jobs의 'house_servant'.
//   신임(trust)이 쌓이면 몸종·집사 보좌·집사로 오른다. 밀서 심부름, 엿들은 비밀, 누명, 열린 금고(household_errand/overheard/framed/strongbox).
//   비밀은 court의 secrets로 들어가 궁정에서 쓸 수 있다. 의심(suspicion)이 차면 쫓겨나고, 훔친 게 드러나면 옥에 간다.
//   주인이 바뀌면 새 주인이 나를 다시 본다. 대를 이으면 자식이 같은 집안에 들어갈 수 있다(serviceLine).
// 잇는 곳: estate(집·하인 수·삯), kin(유모와 아이의 정), court(비밀·가문), crime(감옥·죄), love(바람), underworld(패거리),
// repute(deed), feud(내쫓긴 하인의 원한), oath(낙인), history(가문), heir(대 잇기).
// 상태는 game.household 하나. 화면 연결점: householdInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, fullName, ageYears, makePerson } from '../npc.js';
import { PLACES, leaveJob } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, spend, canSpend, check } from '../adventure/core.js';
import { registerJob, takeJob, doWork } from '../jobs.js';
import { homeOf, rentedOut, MAX_SERVANTS, SERVANT_WAGE } from '../estate/core.js';
import { rel, remember } from '../relations.js';
import { isJailed, crimeState, reportCrime, jail, notoriety } from '../crime.js';
import { deed } from '../repute/index.js';
import { addGrudge } from '../feud/index.js';
import { kinState } from '../kin/index.js';
import { loveState } from '../love/index.js';
import { courtState } from '../court/index.js';
import { H } from '../history/state.js';
import { liveHouses, houseName } from '../history/nobles.js';
import { opener } from '../narrative/openers.js';

const jo = (w, pair) => J(w, pair).slice(w.length);
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '어느 고장';
const alive = (p) => !!p && p.alive && !p.isPlayer;
const ready = (g) => playerAge(g) >= 16 && !traveling(g) && !isJailed(g) && !g.over && !L(g).heirPending;

/* ---------- 맡는 일 ---------- */
export const ROLES = {
  maid: { name: (p) => (p?.sex === 'm' ? '머슴' : '하녀'), extra: 0, npcJob: 'laborer', desc: '집안 살림과 잔일' },
  nurse: { name: () => '유모', extra: 1, npcJob: 'weaver', desc: '어린 자식을 돌본다' },
  steward: { name: () => '집사', extra: 3, npcJob: 'guild_clerk', desc: '살림과 돈을 맡는다' },
  groom: { name: () => '마부', extra: 1, npcJob: 'laborer', desc: '말과 수레, 바깥 심부름' },
  cook: { name: () => '찬모', extra: 1, npcJob: 'cook', desc: '부엌을 맡는다' },
  guard: { name: () => '문지기', extra: 2, npcJob: 'guard', desc: '대문과 밤을 지킨다' },
};
// 겉으로 보이는 인상. 속은 들여 봐야 안다.
export const TRAITS = {
  honest: { look: '말수가 적고 우직해 보인다' },
  sly: { look: '말이 번지르르하고 눈치가 빠르다' },
  gentle: { look: '손이 곱고 아이들을 좋아한다' },
  proud: { look: '고개를 빳빳이 든다. 자존심이 세 보인다' },
  ears: { look: '귀가 밝고 한 번 들은 건 잊지 않는다고 한다' },
};
const roleName = (st, p) => ROLES[st.role]?.name(p) ?? '하인';

/* ---------- 상태 ---------- */
export function householdState(g) {
  g.household ??= {};
  const v = g.household;
  v.staff ??= [];        // [{ id, pid, role, place, trait, loyalty, grievance, since, masters, wage, line }]
  v.lines ??= [];        // 대를 이어 섬기는 집안 [{ id, surname, since, gens, served }]
  v.service ??= null;    // 내가 하인으로 사는 집 { house, name, head, place, trust, suspicion, since, stolen, sold, line }
  v.serviceLine ??= null; // 우리 집안이 대를 이어 섬기는 큰 집 { house, name, gens }
  v.formerHouses ??= {}; // 섬기다 나온 집 id → 마지막 신임
  v.seq ??= 1;
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const V = householdState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
const staffAt = (g, pl = here(g)) => V(g).staff.filter((s) => s.place === pl && alive(byId(g, s.pid)));
const staffById = (g, id) => V(g).staff.find((s) => s.id === id) ?? null;
const lineOf = (g, st) => (st?.line ? V(g).lines.find((l) => l.id === st.line) ?? null : null);
const extraWages = (g) => V(g).staff.reduce((a, s) => a + (s.wage ?? 0), 0);
const myKidsYoung = (g, max = 8) => (me(g).childIds ?? []).map((id) => byId(g, id)).filter((k) => k && k.alive && ageYears(k) < max);

export const loyaltyWord = (v) => (v >= 80 ? '목숨이라도 바칠 사람' : v >= 60 ? '믿을 만하다' : v >= 40 ? '그럭저럭 섬긴다' : v >= 20 ? '마음이 떠 있다' : '등을 보이면 안 된다');
export const grievanceWord = (v) => (v >= 70 ? '이를 갈고 있다' : v >= 45 ? '불만이 쌓였다' : v >= 20 ? '조금 서운하다' : '');

// 내 집에서 이름 있는 하인을 하나 더 둘 수 있나
function roomFor(g, pl = here(g)) {
  const h = homeOf(g, pl);
  if (!h || rentedOut(g, pl)) return false;
  return h.servants < MAX_SERVANTS[h.level] || staffAt(g, pl).length < h.servants;
}
// 이름 있는 하인은 estate 하인 수 안에서 센다. 자리가 남지 않으면 하인 수를 늘린다.
function seat(g, pl) {
  const h = homeOf(g, pl);
  if (!h) return false;
  if (staffAt(g, pl).length < h.servants) return true;
  if (h.servants >= MAX_SERVANTS[h.level]) return false;
  h.servants += 1;
  return true;
}
function unseat(g, st) {
  const h = homeOf(g, st.place);
  if (h && h.servants > 0) h.servants -= 1;
}
function addStaff(g, p, role, { trait = 'honest', line = null, loyalty = 40 } = {}) {
  const v = V(g);
  const st = { id: v.seq++, pid: p.id, role, place: here(g), trait, loyalty: clamp(loyalty, 0, 100), grievance: 0, since: mi(g), masters: 1, wage: ROLES[role].extra, line };
  v.staff.push(st);
  p.place = st.place; p.known = true; p.affection = Math.max(p.affection ?? 0, 10);
  p.job = ROLES[role].npcJob; p.servantOf = g.player.id;
  rel(p);
  return st;
}
function dropStaff(g, st, { seatToo = true } = {}) {
  const v = V(g);
  v.staff = v.staff.filter((x) => x !== st);
  if (seatToo) unseat(g, st);
  const p = byId(g, st.pid);
  if (p) { delete p.servantOf; if (p.alive && p.job !== 'old') p.job = 'laborer'; }
}

/* ---------- 화면용 ---------- */
export function householdInfo(g) {
  const v = V(g);
  const now = mi(g);
  const staff = v.staff.map((s) => {
    const p = byId(g, s.pid);
    const ln = lineOf(g, s);
    return {
      id: s.id, name: p ? fullName(p) : '이름 모를 하인', age: p ? ageYears(p) : null, role: s.role, roleName: roleName(s, p),
      place: s.place, placeName: placeName(s.place), here: s.place === here(g),
      loyalty: Math.round(s.loyalty), loyaltyWord: loyaltyWord(s.loyalty), grievance: Math.round(s.grievance), grievanceWord: grievanceWord(s.grievance),
      years: Math.floor((now - s.since) / 12), masters: s.masters ?? 1, wage: SERVANT_WAGE + (s.wage ?? 0),
      line: ln ? { surname: ln.surname, gens: ln.gens } : null,
    };
  });
  const unnamed = {};
  for (const pl of L(g).houses ?? []) {
    const h = homeOf(g, pl);
    if (!h) continue;
    const n = h.servants - staffAt(g, pl).length;
    if (n > 0) unnamed[pl] = n;
  }
  const sv = v.service;
  return {
    staff, unnamed, wages: v.staff.length * SERVANT_WAGE + extraWages(g),
    lines: v.lines.map((l) => ({ surname: l.surname, gens: l.gens, since: l.since, serving: v.staff.some((s) => s.line === l.id) })),
    service: sv ? { house: sv.house, houseName: sv.name, head: sv.head, place: sv.place, placeName: placeName(sv.place), rank: rankOf(sv), rankName: SERVE_RANKS[rankOf(sv)], trust: Math.round(sv.trust), trustWord: trustWord(sv.trust), suspicion: Math.round(sv.suspicion), suspicionWord: sv.suspicion >= 40 ? '눈총을 받고 있다' : '', years: Math.floor((now - sv.since) / 12), line: sv.line ?? 1 } : null,
    serviceLine: v.serviceLine ? { ...v.serviceLine } : null,
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 하인 들이기 ---------- */
function rolesWanted(g) {
  const h = homeOf(g, here(g));
  const out = ['maid', 'cook', 'groom'];
  if (myKidsYoung(g).length) out.unshift('nurse');
  if (h && (h.level >= 1 || (L(g).houses ?? []).length >= 2)) out.push('steward', 'guard');
  const have = new Set(staffAt(g).map((s) => s.role));
  return out.filter((r) => r === 'maid' || !have.has(r));
}
function makeCandidates(g, rng) {
  // 맡길 자리를 섞되, 유모가 필요하면 유모부터
  const want = rolesWanted(g);
  const roles = want.filter((r) => r === 'nurse');
  const rest = want.filter((r) => r !== 'nurse');
  while (rest.length) roles.push(rest.splice(rng.int(0, rest.length - 1), 1)[0]);
  const taken = new Set(V(g).staff.map((x) => byId(g, x.pid)?.name));
  const v = V(g);
  const out = [];
  // 대대로 섬기는 집안에 혼기 찬 자식이 있으면 먼저 찾아온다
  const ln = v.lines.find((l) => !v.staff.some((s) => s.line === l.id));
  const n = Math.min(3, roles.length + 1);
  for (let i = 0; i < n; i++) {
    const role = roles[i % roles.length];
    const fromLine = i === 0 && ln ? ln : null;
    const sex = role === 'nurse' || role === 'cook' ? 'f' : role === 'guard' || role === 'groom' ? 'm' : (rng.chance(0.5) ? 'm' : 'f');
    let p = makePerson(rng, { sex, ageMonths: rng.int(role === 'nurse' ? 24 : 16, role === 'steward' ? 50 : 40) * 12, lastName: fromLine?.surname });
    for (let k = 0; k < 6 && (taken.has(p.name) || out.some((x) => x.name === p.name)); k++) p = makePerson(rng, { sex, ageMonths: p.ageMonths, lastName: fromLine?.surname });
    const trait = fromLine ? rng.pick(['honest', 'honest', 'gentle', 'ears']) : rng.pick(Object.keys(TRAITS));
    out.push({ name: p.name, last: p.lastName, sex, age: Math.floor(p.ageMonths / 12), role, trait, line: fromLine?.id ?? null });
  }
  return out;
}
ACTIONS.push({
  id: 'household_hire', name: '하인 들이기', icon: 'home',
  desc: '내 집에 이름 있는 하인을 들인다. 하녀·머슴, 유모, 집사, 마부, 찬모, 문지기. 하인 삯(달마다 은화 3닢)에 맡은 일만큼 웃돈이 붙는다.',
  available: (g) => ready(g) && !sceneQueued(g, 'household_hire') && roomFor(g) && rolesWanted(g).length > 0,
  run(g, rng) {
    queueScene(g, 'household_hire', { cands: makeCandidates(g, rng) });
    return '사람을 구한다는 말을 냈다. 며칠 사이 문간에 사람들이 찾아왔다.';
  },
});
defineScene('household_hire', {
  title: () => '사람을 들인다',
  text: (g, s) => `하인은 집 안에서 먹고 자고, 내가 하는 말을 듣고, 내 물건을 만진다. 아무나 들일 수는 없다.\n${s.cands.map((c) => `· ${c.name} ${c.last} (${c.age}살, ${ROLES[c.role].name({ sex: c.sex })} 자리): ${TRAITS[c.trait].look}.${c.line ? ` ${c.last} 집안은 대대로 우리 집을 섬겨 왔다.` : ''}`).join('\n')}`,
  choices: (g, s) => {
    if (!roomFor(g)) return [];
    const out = s.cands.map((c, i) => {
      const cost = SERVANT_WAGE + ROLES[c.role].extra;
      return canSpend(g, cost) ? { label: `${J(c.name, '을/를')} ${ROLES[c.role].name({ sex: c.sex })}로 들인다 (달마다 은화 ${cost}닢, 첫 달 치 먼저)`, key: `c:${i}` } : null;
    }).filter(Boolean);
    out.push({ label: '아무도 들이지 않는다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '고맙다는 말만 하고 모두 돌려보냈다.';
    const c = s.cands[Number(key.slice(2))];
    if (!c) return '그 사람은 벌써 다른 집에 들어갔다.';
    if (!homeOf(g, here(g)) || rentedOut(g, here(g))) return '들일 집이 이제 내 손에 없었다.';
    const cost = SERVANT_WAGE + ROLES[c.role].extra;
    if (!canSpend(g, cost)) return '첫 달 치 삯도 줄 형편이 못 되었다. 미안하다는 말만 했다.';
    if (!seat(g, here(g))) return '방이 모자랐다. 지금 집으로는 더 들일 수 없다.';
    spend(g, cost);
    const p = makePerson(rng, { sex: c.sex, ageMonths: c.age * 12 + rng.int(0, 11), lastName: c.last });
    p.name = c.name;
    g.people.push(p);
    const ln = c.line ? V(g).lines.find((l) => l.id === c.line) : null;
    const st = addStaff(g, p, c.role, { trait: c.trait, line: ln?.id ?? null, loyalty: ln ? 60 : c.trait === 'honest' ? 48 : 38 });
    if (ln) { ln.gens += 1; ln.served += 1; }
    remember(g, p, '하인으로 들였다', 1, { tag: 'household' });
    log(g, `${J(fullName(p), '을/를')} ${roleName(st, p)}로 들였다.`);
    note(g, `${J(fullName(p), '을/를')} ${roleName(st, p)}로 들였다.`);
    return ln
      ? `${J(p.name, '이/가')} 문간에서 절을 했다. "${ln.surname} 집안 ${ln.gens}대째입니다. 할아버지 때부터 이 집 밥을 먹었습니다." 짐 보따리가 작았다.`
      : `${J(p.name, '이/가')} 짐 보따리 하나를 들고 들어왔다. 뒷방에 자리를 내주었다. 이제 이 집 식솔이다.`;
  },
});

/* ---------- 집안 살피기 ---------- */
ACTIONS.push({
  id: 'household_manage', name: '식솔 살피기', icon: 'home',
  desc: '하인들을 불러 앉힌다. 상을 주거나, 웃돈을 올리거나, 내보낸다.',
  available: (g) => ready(g) && staffAt(g).length > 0 && !sceneQueued(g, 'household_manage'),
  run(g) { queueScene(g, 'household_manage', {}); return '저녁상을 물리고 하인들을 불렀다.'; },
});
defineScene('household_manage', {
  title: () => '식솔들',
  text: (g) => staffAt(g).map((s) => { const p = byId(g, s.pid); const yrs = Math.floor((mi(g) - s.since) / 12); return `· ${p.name} (${roleName(s, p)}, ${yrs ? `${yrs}해째` : '갓 들어옴'}${(s.masters ?? 1) >= 2 ? `, 우리 집 ${s.masters}대를 섬김` : ''}): ${loyaltyWord(s.loyalty)}.${grievanceWord(s.grievance) ? ` ${grievanceWord(s.grievance)}.` : ''}`; }).join('\n') || '집 안이 조용하다.',
  choices: (g) => {
    const st = staffAt(g).slice(0, 3);
    if (!st.length) return [];
    const out = [];
    for (const s of st) {
      const p = byId(g, s.pid);
      if (canSpend(g, 5)) out.push({ label: `${p.name}에게 상을 준다 (은화 5닢)`, key: `gift:${s.id}` });
      out.push({ label: `${J(p.name, '을/를')} 내보낸다`, key: `fire:${s.id}` });
    }
    out.push({ label: '다들 수고한다고 말하고 일어난다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'none') { for (const x of staffAt(g)) x.grievance = Math.max(0, x.grievance - 2); return '"다들 수고한다." 그 말 한마디에 부엌 쪽이 조금 밝아졌다.'; }
    const [k, id] = key.split(':');
    const st = staffById(g, Number(id));
    const p = st ? byId(g, st.pid) : null;
    if (!st || !alive(p) || st.place !== here(g)) return '그 사람은 이미 이 집에 없었다.';
    if (k === 'gift') {
      if (!spend(g, 5)) return '줄 돈이 없었다. 어깨만 두드려 주었다.';
      st.grievance = Math.max(0, st.grievance - 30); st.loyalty = clamp(st.loyalty + 8, 0, 100);
      p.affection = clamp((p.affection ?? 0) + 6, -100, 100);
      return `${J(p.name, '은/는')} 은화를 두 손으로 받고 한참 고개를 들지 못했다.`;
    }
    return dismiss(g, rng, st, p);
  },
});
// 하인을 내보낸다. 오래 섬긴 사람, 이를 가는 사람, 내 비밀을 아는 사람은 그냥 나가지 않는다.
function dismiss(g, rng, st, p) {
  dropStaff(g, st);
  const years = Math.floor((mi(g) - st.since) / 12);
  log(g, `${J(fullName(p), '을/를')} 내보냈다.`);
  if (years >= 10 || (st.masters ?? 1) >= 2) {
    p.affection = clamp((p.affection ?? 0) - 25, -100, 100);
    deed(g, 'kind', -3, '평생 섬긴 하인을 내쳤다더라');
    remember(g, p, '평생 섬긴 집에서 쫓겨났다', -2, { tag: 'household' });
    return `${J(p.name, '은/는')} 대문 앞에서 이 집을 오래 올려다보았다. "${years}해입니다." 그 말만 남기고 갔다.`;
  }
  if (st.grievance >= 60 || st.knows) {
    addGrudge(g, p, 25, '하인 자리에서 쫓겨났다');
    if (st.knows && rng.chance(0.6)) leak(g, rng, st.knows, p);
    return `${J(p.name, '은/는')} 짐을 싸면서 혼잣말을 했다. 들으라고 한 혼잣말이었다. "이 집 일, 나만 아는 거 아니겠지요."`;
  }
  return `한 달 치 삯을 얹어 주고 내보냈다. ${J(p.name, '은/는')} 고개를 꾸벅 숙이고 갔다.`;
}

/* ---------- 내 비밀 ---------- */
function mySecret(g) {
  const c = crimeState(g);
  if (c.murders > 0) return 'blood';
  if (loveState(g).affair) return 'affair';
  if ((g.court?.heat ?? 0) >= 20) return 'plot';
  if (c.gang) return 'gang';
  if (c.record.some((r) => !r.paid && r.at > mi(g) - 36)) return 'crime';
  return null;
}
const SECRET_WORD = { blood: '사람을 죽인 일', affair: '바깥에 사람을 둔 일', plot: '궁정에서 꾸미는 일', gang: '패거리와 어울리는 일', crime: '경비대가 찾는 일' };
// 비밀이 새어 나간다
function leak(g, rng, kind, p) {
  const who = p ? p.name : '하인';
  if (kind === 'blood' || kind === 'crime') { const c = crimeState(g); c.heat[here(g)] = clamp((c.heat[here(g)] ?? 0) + 15, 0, 100); }
  if (kind === 'affair') { const a = loveState(g).affair; if (a) a.risk = (a.risk ?? 0) + 30; }
  if (kind === 'plot') { const c = courtState(g); c.heat = clamp(c.heat + 15, 0, 100); }
  deed(g, 'honest', -4, `그 집 ${who}의 입에서 ${SECRET_WORD[kind]}가 새어 나왔다더라`);
  g.news.unshift({ text: `${J(who, '이/가')} 주막에서 ${J(SECRET_WORD[kind], '을/를')} 떠벌렸다고 한다.`, rel: 85 });
  log(g, `${SECRET_WORD[kind]}가 하인 입으로 새어 나갔다.`);
}

/* ---------- 집 안의 일들 ---------- */
defineScene('household_thief', {
  title: () => '없어진 은수저',
  text: (g, s) => `${s.what}${jo(s.what, '이/가')} 없어졌다. 집 안에 드나드는 사람은 뻔하다. 누구를 의심할지, 의심을 드러낼지부터 정해야 한다.`,
  choices: (g, s) => {
    const sus = staffAt(g).slice(0, 3);
    if (!sus.length || !staffById(g, s.thief)) return [];
    const out = sus.map((x) => ({ label: `${J(byId(g, x.pid).name, '을/를')} 불러 다그친다`, key: `ask:${x.id}` }));
    out.push({ label: '하인들 방을 모두 뒤진다', key: 'search' }, { label: '덮어 둔다', key: 'let' });
    return out;
  },
  resolve(g, rng, s, key) {
    const th = staffById(g, s.thief);
    const tp = th ? byId(g, th.pid) : null;
    if (!th || !alive(tp) || th.place !== here(g)) return '없어진 물건은 끝내 나오지 않았다. 그 사이 사람도 바뀌었다.';
    if (key === 'let') { th.grievance = Math.max(0, th.grievance - 5); th.stole = (th.stole ?? 0) + 1; return '모른 척했다. 물건 하나로 집안 분위기를 깨고 싶지 않았다. 다음 달에도 무언가 없어질지 모른다.'; }
    if (key === 'search') {
      for (const x of staffAt(g)) { x.grievance = clamp(x.grievance + 12, 0, 100); x.loyalty = clamp(x.loyalty - 4, 0, 100); }
      g.player.money += s.worth;
      th.stole = 0; th.loyalty = clamp(th.loyalty - 10, 0, 100); th.caught = true;
      return `${tp.name}의 이불 속에서 ${J(s.what, '이/가')} 나왔다. 물건은 찾았지만, 뒤짐을 당한 다른 하인들의 얼굴이 굳었다. 이제 ${J(tp.name, '을/를')} 어떻게 할지는 내 몫이다.`;
    }
    const st = staffById(g, Number(key.split(':')[1]));
    const sp = st ? byId(g, st.pid) : null;
    if (!st || !alive(sp)) return '그 사람은 이미 집을 나간 뒤였다.';
    if (st !== th) {
      st.grievance = clamp(st.grievance + 30, 0, 100); st.loyalty = clamp(st.loyalty - 15, 0, 100);
      sp.affection = clamp((sp.affection ?? 0) - 15, -100, 100);
      deed(g, 'kind', -2, null);
      return `${J(sp.name, '은/는')} 얼굴이 하얘져서 아니라고만 했다. 정말 아닌 것 같았다. 잘못 짚었다. 그 뒤로 ${J(sp.name, '은/는')} 내 눈을 피한다.`;
    }
    g.player.money += s.worth;
    th.stole = 0; th.caught = true;
    if (check(rng, g.player.stats.cha * 0.5 + th.loyalty * 0.5, 45)) {
      th.loyalty = clamp(th.loyalty + 15, 0, 100); th.trait = 'honest';
      return `${J(tp.name, '은/는')} 무릎을 꿇었다. 아픈 어미 약값이었다고 했다. 물건을 돌려받고 한 번은 눈감아 주기로 했다. ${J(tp.name, '은/는')} 그날 밤 부엌 바닥을 혼자 다 닦았다.`;
    }
    th.grievance = clamp(th.grievance + 20, 0, 100);
    return `${J(tp.name, '은/는')} 끝까지 아니라고 하다가, 보따리에서 ${J(s.what, '이/가')} 나오자 입을 다물었다. 물건은 찾았다. 그 눈빛이 마음에 걸린다.`;
  },
});
defineScene('household_ears', {
  title: (g, s) => (s.warn ? '부엌에서 들은 말' : '문 뒤의 귀'),
  text: (g, s) => {
    const p = byId(g, staffById(g, s.sid)?.pid);
    const n = p?.name ?? '하인';
    return s.warn
      ? `${J(n, '이/가')} 밤늦게 조용히 찾아왔다. "낮에 웬 사내가 와서 ${J(SECRET_WORD[s.secret], '을/를')} 캐묻더이다. 저는 아무것도 모른다고 했습니다." ${J(n, '은/는')} 다 알고 있었다. 그리고 입을 다물었다.`
      : `${J(n, '이/가')} 찻잔을 내려놓으며 낮게 말했다. "${SECRET_WORD[s.secret]}, 저는 다 압니다. 입이 무거운 사람한테는 그만한 값이 있어야지요."`;
  },
  choices: (g, s) => {
    const st = staffById(g, s.sid);
    if (!st || !alive(byId(g, st.pid)) || st.place !== here(g)) return [];
    if (s.warn) return [canSpend(g, 10) ? { label: '은화 열 닢을 쥐여 준다', key: 'thank_pay' } : null, { label: '고맙다고만 한다', key: 'thank' }].filter(Boolean);
    return [
      canSpend(g, 20) ? { label: '은화 스무 닢으로 입을 막는다', key: 'pay' } : null,
      { label: '당장 내쫓는다', key: 'out' },
      { label: '목소리를 낮춰 겁을 준다', key: 'scare' },
    ].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const st = staffById(g, s.sid);
    const p = st ? byId(g, st.pid) : null;
    if (!st || !alive(p) || st.place !== here(g)) return '그 하인은 이미 집에 없었다.';
    if (key === 'thank_pay') { if (!spend(g, 10)) return '줄 돈이 없었다. 손을 꼭 잡아 주었다.'; st.loyalty = clamp(st.loyalty + 8, 0, 100); return `${J(p.name, '은/는')} 돈을 받지 않으려 했다. 억지로 쥐여 주었다.`; }
    if (key === 'thank') { st.loyalty = clamp(st.loyalty + 3, 0, 100); return '"고맙네." 그 말에 하인은 고개만 숙였다. 이 집에서 믿을 사람이 하나는 있다.'; }
    if (key === 'pay') {
      if (!spend(g, 20)) return '주머니가 비어 있었다. 하인이 피식 웃었다.';
      st.knows = s.secret; st.paid = (st.paid ?? 0) + 1; st.grievance = Math.max(0, st.grievance - 10);
      return '은화 스무 닢이 앞치마 주머니로 사라졌다. 한 번 받은 돈은 또 달라고 하는 법이다.';
    }
    if (key === 'out') { st.knows = s.secret; return dismiss(g, rng, st, p); }
    if (check(rng, g.player.stats.cha * 0.4 + g.player.stats.str * 0.3 + (crimeState(g).gang ? 15 : 0), 50)) {
      st.grievance = clamp(st.grievance + 20, 0, 100); st.loyalty = clamp(st.loyalty - 10, 0, 100); st.knows = s.secret;
      return `"이 집 담장이 높은 데는 다 까닭이 있네." ${J(p.name, '은/는')} 얼굴이 하얘져 물러갔다. 입은 다물겠지만, 마음까지 다문 건 아니다.`;
    }
    st.knows = s.secret;
    leak(g, rng, s.secret, p);
    dropStaff(g, st);
    addGrudge(g, p, 20, '주인에게 겁박을 당했다');
    return `${J(p.name, '은/는')} 겁먹은 척도 하지 않았다. 다음 날 아침 하인 방이 비어 있었다. 그리고 그 말이 장터에 돌기 시작했다.`;
  },
});
defineScene('household_skim', {
  title: () => '집사의 장부',
  text: (g, s) => `장부를 넘기다 손이 멈췄다. 같은 쌀값이 두 번 적혀 있다. 땔감값은 해마다 오르는데 땔감은 그대로다. 어림잡아 은화 ${s.sum}닢이 어디론가 새었다. 장부를 쓴 건 ${byId(g, staffById(g, s.sid)?.pid)?.name ?? '집사'}다.`,
  choices: (g, s) => {
    const st = staffById(g, s.sid);
    if (!st || !alive(byId(g, st.pid))) return [];
    return [{ label: '불러서 장부를 내민다', key: 'face' }, { label: '경비대에 넘긴다', key: 'law' }, { label: '모른 척하고 장부를 내가 본다', key: 'watch' }];
  },
  resolve(g, rng, s, key) {
    const st = staffById(g, s.sid);
    const p = st ? byId(g, st.pid) : null;
    if (!st || !alive(p)) return '집사는 이미 이 집을 떠났다.';
    st.skim = 0;
    if (key === 'watch') { st.watched = true; tiredNote(g); return '그날부터 장부는 내가 덮고 내가 열었다. 집사는 아무 말도 하지 않았다. 눈치는 챘을 것이다.'; }
    if (key === 'law') {
      dropStaff(g, st);
      p.affection = clamp((p.affection ?? 0) - 40, -100, 100);
      addGrudge(g, p, 30, '주인이 경비대에 넘겼다');
      deed(g, 'honest', 2, null);
      g.player.money += Math.floor(s.sum / 3);
      return `경비대가 ${J(p.name, '을/를')} 끌고 갔다. 빼돌린 돈 가운데 ${Math.floor(s.sum / 3)}닢이 돌아왔다. 나머지는 이미 어디론가 사라졌다.`;
    }
    if (check(rng, st.loyalty + g.player.stats.cha * 0.3, 55)) {
      g.player.money += Math.floor(s.sum / 2);
      st.loyalty = clamp(st.loyalty + 15, 0, 100); st.trait = 'honest';
      return `${J(p.name, '은/는')} 장부를 보더니 털썩 주저앉았다. 아들 빚이었다고 했다. 반은 갚겠다고, 나머지는 평생 일해서 갚겠다고 했다.`;
    }
    dropStaff(g, st);
    addGrudge(g, p, 15, '집사 자리에서 쫓겨났다');
    return `${J(p.name, '은/는')} 끝까지 장부가 틀렸다고 우겼다. 그 자리에서 열쇠 꾸러미를 받아 냈다. 집사는 그날로 나갔다.`;
  },
});
function tiredNote(g) { stress(g, 3); }
defineScene('household_grievance', {
  title: () => '하인의 청',
  text: (g, s) => { const p = byId(g, staffById(g, s.sid)?.pid); return `${J(p?.name ?? '하인', '이/가')} 앞치마를 쥐고 서 있다. "삯을 조금만 올려 주십시오. 장터 쌀값이 작년 같지 않습니다." 그 뒤에서 다른 하인들도 귀를 세우고 있다.`; },
  choices: (g, s) => {
    const st = staffById(g, s.sid);
    if (!st || !alive(byId(g, st.pid)) || st.place !== here(g)) return [];
    return [{ label: '달마다 은화 한 닢을 더 준다', key: 'raise' }, canSpend(g, 10) ? { label: '이번만 은화 열 닢을 준다', key: 'once' } : null, { label: '거절한다', key: 'no' }].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const st = staffById(g, s.sid);
    const p = st ? byId(g, st.pid) : null;
    if (!st || !alive(p) || st.place !== here(g)) return '청을 하던 하인은 이미 떠났다.';
    if (key === 'raise') { st.wage = (st.wage ?? 0) + 1; st.grievance = Math.max(0, st.grievance - 40); st.loyalty = clamp(st.loyalty + 6, 0, 100); return `${J(p.name, '은/는')} 몇 번이고 절을 했다. 다른 하인들 얼굴에도 화색이 돌았다.`; }
    if (key === 'once') { if (!spend(g, 10)) return '줄 돈이 없었다.'; st.grievance = Math.max(0, st.grievance - 20); return '은화 열 닢으로 한 철은 넘길 것이다. 한 철만.'; }
    st.grievance = clamp(st.grievance + 15, 0, 100); st.loyalty = clamp(st.loyalty - 10, 0, 100);
    if (st.grievance >= 80) { dropStaff(g, st); addGrudge(g, p, 10, '삯을 올려 달라는 말을 무시당했다'); return `${J(p.name, '은/는')} 그 길로 짐을 쌌다. "다른 집도 사람은 구합니다."`; }
    return `${J(p.name, '은/는')} 더 말하지 않고 물러갔다. 부엌에서 그릇 부딪는 소리가 평소보다 컸다.`;
  },
});
// 늙거나 죽은 하인: 그 자식을 들이면 대를 이어 섬기는 집안이 된다
function heirOfServant(g, rng, p) {
  const kid = (g.people ?? []).find((k) => k.alive && !k.isPlayer && (k.fatherId === p.id || k.motherId === p.id) && ageYears(k) >= 15 && ageYears(k) <= 35 && !k.servantOf);
  if (kid) return { id: kid.id, name: kid.name };
  const k = makePerson(rng, { ageMonths: rng.int(16, 24) * 12, lastName: p.lastName, [p.sex === 'm' ? 'fatherId' : 'motherId']: p.id });
  return { make: { name: k.name, sex: k.sex, age: Math.floor(k.ageMonths / 12) }, name: k.name };
}
defineScene('household_old', {
  title: (g, s) => (s.dead ? '하인의 죽음' : '늙은 하인'),
  text: (g, s) => {
    const n = s.name;
    const yrs = s.years;
    return s.dead
      ? `${J(n, '이/가')} 뒷방에서 숨을 거두었다. 이 집에서 ${yrs}해를 살았다. 하인들이 모여 울었다. ${s.kid.name}, ${n}의 자식이 장례를 치를 돈도 없어 문간에 서 있다.`
      : `${J(n, '이/가')} 계단을 오르다 주저앉았다. 이 집에서 ${yrs}해를 살았다. 이제 무릎이 말을 듣지 않는다고 한다. 자식 ${J(s.kid.name, '이/가')} 데리러 오겠다고 했다.`;
  },
  choices: (g, s) => {
    if (s.dead) return [canSpend(g, 8) ? { label: '장례를 치러 주고, 자식을 대신 들인다 (은화 8닢)', key: 'bury_take' } : null, canSpend(g, 8) ? { label: '장례만 치러 준다 (은화 8닢)', key: 'bury' } : null, { label: `자식을 대신 들인다`, key: 'take' }, { label: '그냥 보낸다', key: 'none' }].filter(Boolean);
    const st = staffById(g, s.sid);
    if (!st || !alive(byId(g, st.pid))) return [];
    return [canSpend(g, 15) ? { label: '은화 열다섯 닢을 쥐여 편히 쉬게 보낸다', key: 'pension' } : null, { label: '보내고 그 자식을 대신 들인다', key: 'take' }, { label: '뒷방에서 여생을 보내게 한다', key: 'keep' }, { label: '그냥 내보낸다', key: 'none' }].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    const st = s.sid ? staffById(g, s.sid) : null;
    const p = byId(g, s.pid);
    if (!s.dead && (!st || !alive(p))) return '그 사이 일이 달라져 있었다.';
    if (key === 'keep') { st.retired = true; st.wage = 0; st.loyalty = 100; for (const x of staffAt(g)) x.loyalty = clamp(x.loyalty + 5, 0, 100); return `${J(p.name, '은/는')} 뒷방 볕 드는 자리에 앉아 콩을 고른다. 다른 하인들이 그 모습을 본다. 이 집은 늙은 사람을 내치지 않는다.`; }
    if (!s.dead) {
      dropStaff(g, st, { seatToo: key !== 'take' });
      if (key === 'pension') { if (spend(g, 15)) p.affection = clamp((p.affection ?? 0) + 15, -100, 100); deed(g, 'kind', 2, null); }
      if (key === 'none') { p.affection = clamp((p.affection ?? 0) - 15, -100, 100); deed(g, 'kind', -2, '늙은 하인을 빈손으로 내보냈다더라'); }
    } else {
      const h = homeOf(g, s.place);
      if (key === 'bury' || key === 'bury_take') { if (spend(g, 8)) { for (const x of staffAt(g)) x.loyalty = clamp(x.loyalty + 8, 0, 100); deed(g, 'kind', 2, null); } }
      if (key !== 'take' && key !== 'bury_take' && h && h.servants > 0) h.servants -= 1;
    }
    if (key === 'take' || key === 'bury_take') {
      if (here(g) !== s.place || !homeOf(g, s.place)) { const h = homeOf(g, s.place); if (h && h.servants > 0) h.servants -= 1; return '집을 떠나 있는 사이 그 자식은 다른 데로 갔다.'; }
      let ln = v.lines.find((l) => l.id === s.line) ?? v.lines.find((l) => l.surname === s.last);
      if (!ln) { ln = { id: v.seq++, surname: s.last, since: g.date.year - s.years, gens: 1, served: 1 }; v.lines.push(ln); }
      let kid = s.kid.id != null ? byId(g, s.kid.id) : null;
      if (!alive(kid)) {
        const m = s.kid.make ?? { name: s.kid.name, sex: 'm', age: 18 };
        kid = makePerson(rng, { sex: m.sex, ageMonths: m.age * 12, lastName: s.last });
        kid.name = m.name;
        if (s.sex === 'm') kid.fatherId = s.pid; else kid.motherId = s.pid;
        g.people.push(kid);
      }
      const role = s.role === 'nurse' && !myKidsYoung(g).length ? 'maid' : s.role;
      const ns = addStaff(g, kid, role, { trait: rng.pick(['honest', 'honest', 'gentle', 'ears', 'proud']), line: ln.id, loyalty: 55 + Math.min(20, s.years) });
      ns.masters = s.masters ?? 1;
      ln.gens += 1; ln.served += 1;
      log(g, `${ln.surname} 집안 ${ln.gens}대째 ${J(kid.name, '이/가')} 들어왔다.`);
      chron(g, `${ln.surname} 집안이 ${g.player.name}의 집을 ${ln.gens}대째 섬기게 되다.`, 15);
      return `${J(kid.name, '이/가')} 부모가 쓰던 뒷방에 짐을 풀었다. "${ln.surname} 집안은 이 집을 떠나지 않습니다." ${ln.gens}대째다.`;
    }
    return s.dead ? `${J(s.name, '은/는')} 마을 뒤 공동묘지에 묻혔다. 이 집 대문 앞을 지나 상여가 나갔다.` : `${J(p.name, '이/가')} 자식의 부축을 받으며 대문을 나섰다. 뒤를 한 번 돌아보았다.`;
  },
});
defineScene('household_heir', {
  title: () => '새 주인에게 절하다',
  text: (g, s) => `장례가 끝난 이튿날, 하인들이 마당에 줄지어 섰다. 맨 앞의 ${J(s.name, '이/가')} 무릎을 꿇었다. "${s.masters >= 3 ? `${s.masters}대째 이 집을 섬깁니다` : '선대 어른께 받은 은혜, 이제 새 주인께 갚겠습니다'}." 다들 내 얼굴을 본다. 선대의 사람들을 그대로 둘지, 새 사람을 쓸지.`,
  choices: (g) => (V(g).staff.length ? [{ label: '집을 그대로 맡긴다', key: 'keep' }, { label: '새 사람을 쓰겠다며 모두 내보낸다', key: 'clear' }] : []),
  resolve(g, rng, s, key) {
    if (key === 'keep') { for (const x of V(g).staff) { x.loyalty = clamp(x.loyalty + 10, 0, 100); x.grievance = Math.max(0, x.grievance - 10); } return '"하던 대로 해 주게." 하인들이 일제히 고개를 숙였다. 이 집의 낮과 밤은 그대로 굴러간다.'; }
    const n = V(g).staff.length;
    for (const x of [...V(g).staff]) { const p = byId(g, x.pid); dropStaff(g, x); if (alive(p) && (x.masters ?? 1) >= 2) { p.affection = clamp((p.affection ?? 0) - 30, -100, 100); remember(g, p, '대를 이어 섬긴 집에서 쫓겨났다', -2, { tag: 'household' }); } }
    deed(g, 'kind', -3, '선대가 부리던 하인들을 다 내보냈다더라');
    return `선대의 하인 ${n}명이 짐을 싸서 나갔다. 집이 낯설게 조용해졌다.`;
  },
});

/* ---------- 내가 하인으로 살기 ---------- */
export const SERVE_RANKS = ['하인', '몸종', '집사 보좌', '집사'];
const rankOf = (sv) => (sv.trust >= 80 ? 3 : sv.trust >= 55 ? 2 : sv.trust >= 30 ? 1 : 0);
export const trustWord = (v) => (v >= 80 ? '주인이 안방 열쇠를 맡긴다' : v >= 55 ? '주인이 이름을 부른다' : v >= 30 ? '눈에 띄기 시작했다' : '아직 얼굴도 모른다');
const houseAlive = (g, id) => (H(g)?.houses ?? []).find((h) => h.id === id && !h.fallen) ?? null;
const servingHouses = (g) => liveHouses(g).filter((h) => h.seat === here(g));
const SV = (g) => V(g).service;
const inService = (g) => { const sv = SV(g); return !!sv && L(g).job?.id === 'house_servant' && sv.place === here(g) && !traveling(g) && !isJailed(g); };

registerJob('house_servant', {
  name: '대갓집 하인', places: [], stat: 'cha', stat2: 'sen', wage: [2, 3, 5, 8], npcJob: 'laborer', lodging: 'barracks',
  ranks: SERVE_RANKS,
  rankOf: (g) => (SV(g) ? rankOf(SV(g)) : 0),
  title: (g) => (SV(g) ? `${SV(g).name} ${SERVE_RANKS[rankOf(SV(g))]}` : '대갓집 하인'),
  promote: (g, rk) => `${SV(g)?.name ?? '주인 집'}에서 ${SERVE_RANKS[rk]} 자리에 올랐다. ${rk >= 3 ? '집안 열쇠 꾸러미가 내 허리에 걸렸다.' : '맡는 일이 무거워지고, 삯도 올랐다.'}`,
  lines: ['새벽에 일어나 마당을 쓸고 물을 길었다.', '은그릇을 닦고 또 닦았다. 마님이 그릇에 얼룩이 있으면 그릇째 던진다.', '손님 상을 차리느라 하루가 갔다. 남은 음식으로 하인들이 늦은 밥을 먹었다.', '도련님 말고삐를 잡고 장터를 한 바퀴 돌았다.', '밤새 연회장 촛불을 갈았다. 귀족들의 웃음소리는 새벽까지 이어졌다.'],
  work(g, rng) {
    const sv = SV(g);
    if (!sv || !houseAlive(g, sv.house)) { leaveJob(g, '섬기던 집이 무너져 일자리를 잃었다.'); V(g).service = null; return '대문에 다른 집안의 문장이 걸려 있었다. 섬기던 집은 이제 없다.'; }
    const out = doWork(g, rng, this);
    sv.trust = clamp(sv.trust + 1 + g.player.stats.cha / 100 - sv.suspicion / 200, 0, 100);
    return out;
  },
});
ACTIONS.push({
  id: 'household_serve', name: '큰 집안 하인으로 들어가기', icon: 'crown',
  desc: '이 고장에 터를 둔 귀족 가문의 하인으로 들어간다. 먹고 잘 곳이 생기고, 신임을 얻으면 집사까지 오른다. 남의 집 담 안에서는 들리는 것도 많다.',
  available: (g) => playerAge(g) >= 14 && !traveling(g) && !isJailed(g) && !g.over && !L(g).heirPending && !SV(g) && servingHouses(g).length > 0 && !sceneQueued(g, 'household_serve'),
  run(g, rng) { queueScene(g, 'household_serve', {}); return opener(g, 'household_serve', rng); },
});
defineScene('household_serve', {
  title: (g, s) => (s.heir ? '선대가 섬기던 집' : '대갓집 뒷문'),
  text: (g, s) => {
    const sl = V(g).serviceLine;
    return s.heir && sl
      ? `${sl.name}의 집사가 찾아왔다. "선대께서 우리 집을 ${sl.gens}대째 섬기셨지요. 자리는 비워 두었습니다." 큰 집의 담 안은 밥이 있고, 지붕이 있고, 눈치가 있다.`
      : '대갓집 뒷문은 앞문보다 바쁘다. 장작 수레, 생선 바구니, 일자리를 구하는 사람들. 집사가 한 사람씩 훑어본다. 손을 보고, 눈을 보고, 말투를 듣는다.';
  },
  choices: (g, s) => {
    if (SV(g)) return [];
    const sl = V(g).serviceLine;
    const hs = servingHouses(g).slice(0, 3);
    const out = hs.map((h) => ({ label: `${houseName(h)}에 들어간다${sl?.house === h.id ? ' (선대가 섬기던 집)' : ''}`, key: `h:${h.id}` }));
    if (!out.length) return [];
    out.push({ label: s.heir ? '나는 내 길을 가겠다' : '그만둔다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return s.heir ? '"고맙지만, 나는 다른 길을 가겠소." 집사는 섭섭한 얼굴로 돌아갔다.' : '뒷문 앞에 줄 선 사람들을 보다가 돌아섰다.';
    const h = houseAlive(g, key.slice(2));
    if (!h || h.seat !== here(g)) return '그 집은 이제 이곳에 없었다.';
    if (SV(g) || isJailed(g)) return '이미 형편이 달라져 있었다.';
    const v = V(g);
    const line = v.serviceLine?.house === h.id ? v.serviceLine : null;
    const before = v.formerHouses[h.id];
    if (!line && (notoriety(g) >= 45 || (before != null && before < 15))) return before != null ? '집사가 나를 알아보았다. "이 집 문턱은 다시 못 넘는다." 뒷문이 닫혔다.' : '집사가 내 얼굴을 한참 보더니 고개를 저었다. "자네 이름은 이 고장에 너무 알려졌어."';
    takeJob(g, 'house_servant');
    v.service = { house: h.id, name: houseName(h), head: h.head, place: here(g), trust: line ? 30 : clamp(5 + g.player.stats.cha * 0.1, 0, 20), suspicion: 0, since: mi(g), stolen: 0, sold: 0, line: line ? line.gens + 1 : 1 };
    L(g).job.lastRank = rankOf(v.service);
    log(g, `${houseName(h)}의 하인이 되었다.`);
    note(g, `${houseName(h)}의 하인이 되었다.`);
    return line
      ? `늙은 하인들이 내 얼굴에서 선대를 찾았다. "눈매가 똑같구먼." 첫날부터 몸종 자리였다.`
      : `집사가 턱짓으로 행랑채를 가리켰다. "새벽 닭 울기 전에 일어나. 주인 어른 눈에 띄지 말고, 마님 눈 밖에 나지 말고." 오늘부터 ${houseName(h)}의 하인이다.`;
  },
});
const OVERHEARD = ['맏아들이 사실은 다른 사내의 씨라는 것', '영지 세금을 빼돌린 장부가 서재 둘째 서랍에 있다는 것', '왕자 하나에게 몰래 보낸 충성 서약', '바깥에 진 엄청난 빚', '돌아가신 마님이 독을 먹었다는 것'];
defineScene('household_errand', {
  title: () => '밤의 심부름',
  text: (g, s) => `${SV(g)?.head ?? '주인'}${jo(SV(g)?.head ?? '주인', '이/가')} 나를 따로 불렀다. 봉랍을 찍은 편지 한 통. "${s.to}에 전하게. 아무도 모르게." 봉랍은 따뜻했다. 촛불에 비추면 글자가 비칠 것도 같다.`,
  choices: (g) => (inService(g) ? [{ label: '그대로 전한다', key: 'go' }, { label: '몰래 뜯어 읽고 다시 봉한다', key: 'read' }, { label: '다른 집안에 편지를 보여 주고 값을 받는다', key: 'sell' }] : []),
  resolve(g, rng, s, key) {
    const sv = SV(g);
    if (!inService(g)) return '그 사이 그 집을 나와 있었다.';
    if (key === 'go') { sv.trust = clamp(sv.trust + 8, 0, 100); deed(g, 'loyal', 1, null); return '새벽 안개 속을 걸어 편지를 전했다. 받는 사람은 나를 보지도 않았다. 돌아오니 주인이 고개를 한 번 끄덕였다.'; }
    if (key === 'read') {
      if (check(rng, g.player.stats.sen * 0.6 + g.player.stats.agi * 0.3, 50)) {
        pushSecret(g, rng, sv.house, '주인 집과 ' + s.to + ' 사이의 밀약');
        sv.trust = clamp(sv.trust + 4, 0, 100);
        return '칼날을 데워 봉랍을 들어 올렸다. 두 집안이 손을 잡는다는 내용이었다. 다시 봉하고 전했다. 아무도 몰랐다. 나만 안다.';
      }
      sv.trust = clamp(sv.trust - 25, 0, 100); sv.suspicion = clamp(sv.suspicion + 35, 0, 100);
      return '봉랍이 갈라졌다. 받는 쪽 집사가 편지를 뒤집어 보더니 눈을 가늘게 떴다. 그 말은 곧 주인에게 들어갈 것이다.';
    }
    g.player.money += 25; sv.sold += 1; sv.suspicion = clamp(sv.suspicion + 20, 0, 100);
    pushSecret(g, rng, sv.house, '주인 집과 ' + s.to + ' 사이의 밀약');
    deed(g, 'loyal', -3, null);
    return '다른 집안 집사가 편지를 베껴 쓰는 동안 문가를 지켰다. 은화 스물다섯 닢. 편지는 반나절 늦게 도착했다.';
  },
});
function pushSecret(g, rng, house, what) {
  const c = courtState(g);
  c.secrets.push({ house, what, power: rng.int(1, 2), at: mi(g) });
  if (c.secrets.length > 12) c.secrets.shift();
}
defineScene('household_overheard', {
  title: () => '닫힌 문 너머',
  text: (g, s) => `서재 앞을 닦고 있는데 안에서 언성이 높아졌다. 걸레질을 멈추지 않으려고 애썼다. 다 듣고 말았다. ${s.what}. 이 집안이 쥐고 있는 가장 무거운 비밀이다.`,
  choices: (g) => {
    if (!inService(g)) return [];
    const rivals = liveHouses(g).filter((h) => h.id !== SV(g).house);
    return [{ label: '못 들은 걸로 한다', key: 'bury' }, { label: '머릿속에 적어 둔다 (궁정에서 쓸 비밀)', key: 'keep' }, rivals.length ? { label: `${houseName(rivals[0])}에 판다`, key: `sell:${rivals[0].id}` } : null, { label: '주인을 떠본다', key: 'press' }].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const sv = SV(g);
    if (!inService(g)) return '그 집을 나온 뒤라 쓸 데가 없었다.';
    if (key === 'bury') { sv.trust = clamp(sv.trust + 6, 0, 100); deed(g, 'loyal', 2, null); return '그날 밤 그 말을 마음속 가장 깊은 데 묻었다. 하인은 귀가 없어야 오래 산다.'; }
    if (key === 'keep') { pushSecret(g, rng, sv.house, s.what); return '아무 내색 없이 걸레질을 마쳤다. 언젠가 이 말 한마디가 칼보다 무거울 날이 올 것이다.'; }
    if (key.startsWith('sell')) {
      const r = houseAlive(g, key.slice(5));
      if (!r) return '사겠다던 집안이 이미 무너졌다.';
      g.player.money += 30; sv.sold += 1; sv.suspicion = clamp(sv.suspicion + 25, 0, 100);
      const c = courtState(g); c.foes[sv.house] = (c.foes[sv.house] ?? 0) + 10;
      deed(g, 'loyal', -4, '어느 집 하인이 주인 집 비밀을 팔았다더라');
      return `${houseName(r)}의 집사가 은화 서른 닢을 밀어 주었다. "또 들리는 게 있으면." 돌아오는 길이 유난히 길었다.`;
    }
    if (check(rng, g.player.stats.cha * 0.5 + sv.trust * 0.3, 60)) {
      g.player.money += 50; sv.trust = clamp(sv.trust - 20, 0, 100); sv.suspicion = clamp(sv.suspicion + 30, 0, 100);
      return `"서재 앞에서 들은 말이 있습니다." 주인의 얼굴이 굳었다가 풀렸다. 은화 쉰 닢이 든 주머니가 탁자 위로 밀려왔다. "자네는 아무것도 못 들었네." 그 눈빛을 잊을 수 없다.`;
    }
    reportCrime(g, 'blackmail');
    endService(g, '주인을 협박하다 쫓겨났다', 0);
    return '주인은 끝까지 듣지도 않았다. 종을 울리자 하인들이 몰려와 나를 대문 밖에 내던졌다. 경비대에 내 이름이 들어갔다.';
  },
});
defineScene('household_framed', {
  title: () => '누명',
  text: (g, s) => `마님의 진주 목걸이가 없어졌다. 하인들이 마당에 줄을 섰다. ${J(s.who, '이/가')} 손가락으로 나를 가리켰다. "어젯밤 마님 방 앞에 있던 건 저 사람입니다."`,
  choices: (g) => (inService(g) ? [{ label: '결백을 주장한다', key: 'plead' }, { label: '진짜 범인을 찾아낸다', key: 'find' }, { label: '말없이 짐을 싼다', key: 'leave' }] : []),
  resolve(g, rng, s, key) {
    const sv = SV(g);
    if (!inService(g)) return '그 집을 나온 뒤에 그 소문을 들었다.';
    if (key === 'leave') { endService(g, '누명을 쓰고 집을 나왔다', sv.trust * 0.5); return '변명하지 않았다. 행랑채의 짐은 보따리 하나였다. 대문을 나서는데 아무도 붙잡지 않았다.'; }
    if (key === 'find') {
      if (check(rng, g.player.stats.sen * 0.5 + g.player.stats.int * 0.3, 55)) { sv.trust = clamp(sv.trust + 15, 0, 100); sv.suspicion = Math.max(0, sv.suspicion - 20); return `밤마다 ${s.who}의 뒤를 밟았다. 사흘째 밤, 마구간 짚더미 속에서 목걸이가 나왔다. ${J(s.who, '은/는')} 그날로 쫓겨났고, 마님은 처음으로 내 이름을 물었다.`; }
      sv.suspicion = clamp(sv.suspicion + 20, 0, 100); return '아무것도 찾지 못했다. 남의 방을 뒤지다 들킨 꼴이 되었다.';
    }
    if (check(rng, g.player.stats.cha * 0.4 + sv.trust * 0.5, 45)) { sv.suspicion = Math.max(0, sv.suspicion - 5); return '주인이 나를 오래 보더니 말했다. "이 사람은 그럴 사람이 아니다." 목걸이는 사흘 뒤 마님 경대 뒤에서 나왔다.'; }
    sv.trust = clamp(sv.trust - 15, 0, 100); sv.suspicion = clamp(sv.suspicion + 25, 0, 100);
    return '아무도 내 말을 믿지 않았다. 목걸이는 끝내 나오지 않았고, 그 의심은 내 몫으로 남았다.';
  },
});
defineScene('household_strongbox', {
  title: () => '열린 금고',
  text: () => '서재를 치우다 보니 금고 문이 반쯤 열려 있다. 주인은 사냥을 나갔다. 은화 자루, 금반지, 봉인된 문서. 복도에는 아무도 없다.',
  choices: (g) => {
    if (!inService(g)) return [];
    const out = [{ label: '은화 자루 하나를 챙긴다', key: 'steal' }, { label: '문을 닫고 집사에게 알린다', key: 'tell' }, { label: '못 본 척 나온다', key: 'leave' }];
    if (crimeState(g).gang) out.splice(1, 0, { label: '패거리에게 금고 자리와 집 구조를 넘긴다', key: 'gang' });
    return out;
  },
  resolve(g, rng, s, key) {
    const sv = SV(g);
    if (!inService(g)) return '그 집을 나온 뒤였다.';
    if (key === 'tell') { sv.trust = clamp(sv.trust + 10, 0, 100); deed(g, 'honest', 2, null); return '집사가 금고를 확인하고 나를 오래 보았다. 그날 저녁 주인이 은화 두 닢을 던져 주었다. 시험이었는지도 모른다.'; }
    if (key === 'leave') { sv.trust = clamp(sv.trust + 2, 0, 100); return '조용히 문을 닫고 나왔다. 금고 생각이 며칠 머리에서 떠나지 않았다.'; }
    if (key === 'gang') {
      g.player.money += 40; sv.stolen += 1; sv.suspicion = clamp(sv.suspicion + 30, 0, 100);
      chron(g, `${sv.name}에 도둑이 들다.`, 10);
      return '패거리에게 뒷문 빗장이 어디 있는지, 개가 몇 마리인지 다 일러 주었다. 나흘 뒤 밤, 금고가 털렸다. 내 몫은 은화 마흔 닢. 아침에 하인들이 모두 불려 나갔다.';
    }
    const got = rng.int(25, 45);
    if (check(rng, g.player.stats.agi * 0.5 + g.player.stats.sen * 0.3 + sv.trust * 0.2, 40)) {
      g.player.money += got; sv.stolen += 1; sv.suspicion = clamp(sv.suspicion + 15, 0, 100);
      return `은화 ${got}닢이 든 자루를 앞치마 속에 넣었다. 심장이 귀까지 뛰었다. 아무도 나를 보지 않았다. 아직은.`;
    }
    reportCrime(g, 'burglary');
    endService(g, '주인 집 금고를 털다 붙잡혔다', 0);
    jail(g, 3);
    return '자루를 쥔 순간 뒤에서 헛기침 소리가 났다. 집사였다. 경비대가 오기까지 한 식경도 걸리지 않았다.';
  },
});
function endService(g, why, keepTrust) {
  const v = V(g), sv = v.service;
  if (!sv) return;
  v.formerHouses[sv.house] = Math.round(keepTrust);
  if (keepTrust >= 50) v.serviceLine = { house: sv.house, name: sv.name, gens: sv.line ?? 1 };
  v.service = null;
  if (L(g).job?.id === 'house_servant') leaveJob(g, `${sv.name}: ${why}.`);
  log(g, `${sv.name}: ${why}.`);
}

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  const now = mi(g);
  // 1) 집과 하인 수를 맞춘다 (집을 팔거나 estate가 삯 밀린 하인을 내보냈으면)
  for (const st of [...v.staff]) {
    const p = byId(g, st.pid);
    const h = homeOf(g, st.place);
    if (!h) { dropStaff(g, st, { seatToo: false }); if (p) g.news.unshift({ text: `${placeName(st.place)} 집이 남의 손에 넘어가며 하인 ${p.name}도 떠났다.`, rel: 70 }); continue; }
    if (p && !p.alive) {
      v.staff = v.staff.filter((x) => x !== st);
      const years = Math.floor((now - st.since) / 12);
      if (years >= 5 && !sceneQueued(g, 'household_old')) queueScene(g, 'household_old', { dead: true, pid: p.id, name: p.name, last: p.lastName, sex: p.sex, years, role: st.role, line: st.line, masters: st.masters ?? 1, place: st.place, kid: heirOfServant(g, rng, p) });
      else { if (h.servants > 0) h.servants -= 1; g.news.unshift({ text: `하인 ${J(p.name, '이/가')} 세상을 떠났다.`, rel: 70 }); }
      continue;
    }
  }
  for (const pl of new Set(v.staff.map((s) => s.place))) {
    const h = homeOf(g, pl);
    const list = v.staff.filter((s) => s.place === pl);
    while (h && list.length > h.servants) {
      const st = list.pop();
      const p = byId(g, st.pid);
      dropStaff(g, st, { seatToo: false });
      if (p) { addGrudge(g, p, st.grievance >= 50 ? 15 : 0, '삯을 받지 못하고 쫓겨났다'); g.news.unshift({ text: `${J(p.name, '이/가')} 짐을 싸서 나갔다. 삯이 밀린 지 오래였다.`, rel: 75 }); }
    }
  }
  // 2) 웃돈, 충성과 불만
  const extra = extraWages(g);
  const short = extra > 0 && g.player.money < extra;
  if (!short) g.player.money -= extra;
  const brand = g.oath?.brand ?? 0;
  const hereNow = here(g);
  for (const st of v.staff) {
    const p = byId(g, st.pid);
    if (!alive(p)) continue;
    if (short && st.wage > 0) st.grievance = clamp(st.grievance + 12, 0, 100);
    st.grievance = clamp(st.grievance - 1.2 + (st.trait === 'proud' ? 0.6 : 0) + (brand >= 40 ? 0.5 : 0), 0, 100);
    st.loyalty = clamp(st.loyalty + 0.35 + (st.trait === 'honest' ? 0.25 : 0) + (st.masters >= 2 ? 0.2 : 0) - st.grievance / 120, 0, 100);
    if (st.retired) continue;
    const home = st.place === hereNow && !traveling(g);
    // 3) 맡은 일
    if (st.role === 'nurse' && home) { for (const k of myKidsYoung(g)) { const r = kinState(g).kids[k.id]; if (r) r.bond = clamp((r.bond ?? 50) + (st.trait === 'gentle' ? 0.6 : 0.3), 0, 100); } }
    if (st.role === 'cook' && home) stress(g, -1.5);
    if (st.role === 'groom' && home) g.player.fatigue = Math.max(0, g.player.fatigue - 3);
    if (st.role === 'steward') {
      const h = homeOf(g, st.place);
      if (h) h.cond = Math.min(100, h.cond + 0.4);
      if (st.trait === 'sly' && st.loyalty < 45 && !st.watched) { const n = rng.int(1, 3); g.player.money = Math.max(0, g.player.money - n); st.skim = (st.skim ?? 0) + n; }
      else if (st.loyalty >= 50 && h) g.player.money += 1 + h.level;
    }
    if (st.role === 'guard' && rng.chance(0.03)) { st.loyalty = clamp(st.loyalty + 1, 0, 100); g.news.unshift({ text: `문지기 ${J(p.name, '이/가')} 담을 넘던 밤도둑을 몽둥이로 쫓아냈다.`, rel: 60 }); }
    // 손버릇: 덮어 둔 도둑은 또 훔친다
    if (st.stole && rng.chance(0.15)) { g.player.money = Math.max(0, g.player.money - rng.int(2, 6)); st.stole += 1; }
  }
  // 4) 충성스러운 하인이 나를 돕는다
  const loyal = v.staff.filter((s) => s.loyalty >= 80 && alive(byId(g, s.pid)));
  if (loyal.length && isJailed(g) && rng.chance(0.2)) { const p = byId(g, rng.pick(loyal).pid); stress(g, -6); g.news.unshift({ text: `${J(p.name, '이/가')} 옥문 앞까지 따뜻한 밥을 지어 왔다.`, rel: 80 }); }
  // 5) 늙은 하인
  for (const st of v.staff) {
    const p = byId(g, st.pid);
    if (!alive(p) || st.retired || ageYears(p) < 60 || st.oldAsked) continue;
    if (st.place === hereNow && !sceneQueued(g, 'household_old') && ready(g)) { st.oldAsked = true; queueScene(g, 'household_old', { sid: st.id, pid: p.id, name: p.name, last: p.lastName, sex: p.sex, years: Math.floor((now - st.since) / 12), role: st.role, line: st.line, masters: st.masters ?? 1, place: st.place, kid: heirOfServant(g, rng, p) }); break; }
  }
  // 6) 내가 섬기는 집
  const sv = v.service;
  if (sv) {
    const hs = houseAlive(g, sv.house);
    if (L(g).job?.id !== 'house_servant') { v.formerHouses[sv.house] = Math.round(sv.trust); if (sv.trust >= 50) v.serviceLine = { house: sv.house, name: sv.name, gens: sv.line ?? 1 }; log(g, `${sv.name}을 나왔다.`); v.service = null; }
    else if (!hs) { endService(g, '섬기던 집안이 무너졌다', 0); g.news.unshift({ text: `${sv.name}${jo(sv.name, '이/가')} 무너졌다. 하인들은 뿔뿔이 흩어졌다.`, rel: 90 }); }
    else {
      sv.suspicion = Math.max(0, sv.suspicion - 1.5);
      if (hs.head !== sv.head) {
        const old = sv.head; sv.head = hs.head;
        if (sv.trust >= 60 && rng.chance(0.6)) { g.player.money += 20; g.news.unshift({ text: `${old}의 유언장에 내 이름이 있었다. 은화 스무 닢. "오래 곁을 지켜 준 사람에게."`, rel: 90 }); }
        sv.trust = Math.round(sv.trust * 0.6);
        if (sv.trust < 12 && rng.chance(0.5)) { endService(g, '새 주인이 사람을 갈았다', sv.trust); g.news.unshift({ text: `새 주인 ${J(hs.head, '이/가')} 하인들을 갈았다. 나도 그 안에 있었다.`, rel: 90 }); }
        else g.news.unshift({ text: `${J(old, '이/가')} 가고 ${J(hs.head, '이/가')} 집안의 머리가 되었다. 새 주인은 아직 내 이름을 모른다.`, rel: 80 });
      } else if (sv.suspicion >= 60) {
        const caught = sv.stolen > 0 && rng.chance(0.5);
        endService(g, caught ? '훔친 일이 드러나 쫓겨났다' : '의심을 받다 쫓겨났다', 0);
        if (caught) { reportCrime(g, 'burglary'); g.news.unshift({ text: `${sv.name}에서 내 짐을 뒤져 장물이 나왔다. 경비대가 나를 찾는다.`, rel: 95 }); }
        else g.news.unshift({ text: `${sv.name}의 집사가 내 보따리를 대문 밖에 내던졌다. 증거는 없었지만, 의심이면 충분했다.`, rel: 90 });
      }
    }
  }
  // 7) 장면
  if (!ready(g) && !(v.service && playerAge(g) >= 14)) return;
  if (L(g).queue.some((x) => /^household_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 4) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  if (inService(g)) {
    const roll = rng.next();
    const others = liveHouses(g).filter((h) => h.id !== v.service.house);
    if (roll < 0.05) return fire('household_errand', { to: others.length ? houseName(rng.pick(others)) : '이웃 고을 영주' });
    if (roll < 0.09) return fire('household_overheard', { what: rng.pick(OVERHEARD) });
    if (roll < 0.12) return fire('household_framed', { who: `하녀 ${rng.pick(['베르타', '힐데', '마르가', '이르마', '로자'])}` });
    if (roll < 0.15) return fire('household_strongbox', {});
  }
  if (!ready(g)) return;
  const st = staffAt(g).filter((s) => !s.retired);
  if (!st.length) return;
  const skim = st.find((s) => (s.skim ?? 0) >= 12);
  if (skim) return fire('household_skim', { sid: skim.id, sum: skim.skim });
  const sly = st.filter((s) => s.trait === 'sly' && (s.loyalty < 55 || s.grievance > 40) && !s.caught);
  if (sly.length && rng.chance(0.06)) {
    const th = rng.pick(sly);
    const it = rng.pick([['은수저 한 벌', 8], ['어머니가 물려준 브로치', 15], ['찬장 속 은화 주머니', 12], ['은촛대', 10]]);
    g.player.money = Math.max(0, g.player.money - it[1]);
    return fire('household_thief', { thief: th.id, what: it[0], worth: it[1] });
  }
  const sec = mySecret(g);
  if (sec) {
    const ears = st.filter((s) => (s.trait === 'ears' || s.grievance >= 50) && s.knows !== sec);
    const warn = st.filter((s) => s.loyalty >= 70 && s.knows !== sec);
    if (ears.length && rng.chance(0.05)) { const e = rng.pick(ears); return fire('household_ears', { sid: e.id, secret: sec, warn: e.loyalty >= 70 }); }
    if (warn.length && rng.chance(0.02)) { const e = rng.pick(warn); e.knows = sec; return fire('household_ears', { sid: e.id, secret: sec, warn: true }); }
  }
  const sore = st.find((s) => s.grievance >= 60);
  if (sore && rng.chance(0.3)) return fire('household_grievance', { sid: sore.id });
  // 입막음 돈을 받은 하인은 또 손을 내민다
  const paid = st.find((s) => s.paid && s.knows && s.loyalty < 60);
  if (paid && rng.chance(0.04)) return fire('household_ears', { sid: paid.id, secret: paid.knows, warn: false });
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng, old) => {
  const v = V(g);
  // 섬기던 큰 집: 신임이 두터웠으면 자식에게 자리가 열린다
  if (v.service) {
    const sv = v.service;
    v.formerHouses[sv.house] = Math.round(sv.trust);
    if (sv.trust >= 50 && houseAlive(g, sv.house)) v.serviceLine = { house: sv.house, name: sv.name, gens: sv.line ?? 1 };
    v.service = null;
  }
  // 하인들: 내가 된 사람이나 식구는 하인 명부에서 뺀다
  for (const st of [...v.staff]) if (st.pid === g.player.id || (g.player.familyIds ?? []).includes(st.pid)) dropStaff(g, st);
  // 선대에게 이를 갈던 하인은 장례가 끝나면 떠난다
  let gone = 0;
  for (const st of [...v.staff]) {
    const p = byId(g, st.pid);
    if (!alive(p) || st.grievance >= 60) { dropStaff(g, st); gone += 1; continue; }
    st.masters = (st.masters ?? 1) + 1;
    st.loyalty = clamp(Math.round(st.loyalty * 0.7 + 15), 0, 100);
    st.grievance = Math.round(st.grievance * 0.5);
    st.knows = null; st.paid = 0;
    if (st.role === 'nurse' && !myKidsYoung(g).length) st.role = 'maid';
  }
  v.sceneAt = 0;
  const first = [...v.staff].sort((a, b) => (b.masters - a.masters) || (a.since - b.since))[0];
  const fp = first ? byId(g, first.pid) : null;
  if (gone) v.log.push({ y: g.date.year, m: g.date.month, text: `선대의 하인 ${gone}명이 장례 뒤에 떠났다.` });
  if (fp && first.place === here(g)) queueScene(g, 'household_heir', { name: fp.name, masters: first.masters });
  if (v.serviceLine && playerAge(g) >= 14 && servingHouses(g).some((h) => h.id === v.serviceLine.house)) queueScene(g, 'household_serve', { heir: true });
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
