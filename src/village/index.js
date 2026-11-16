// 14단계: 이웃과 마을 살이.
// 내가 사는 고장의 사람들이 나를 '우리 사람'으로 여기는가(belong 0~100). 태어난 곳이면 처음부터 높고,
// 굴러온 사람은 낮은 데서 시작한다. 오래 살고, 품앗이를 하고, 마을 일을 맡고, 이웃과 잘 지내면 오른다.
// 낮으면 텃세를 당한다. 높으면 마을 회의에서 말이 먹히고 촌장 선거에 나설 수 있다.
// - 품앗이(village_help): 이웃 일을 거든다. 갚을 품(favors)이 쌓이면 흉년·재앙·추수 때 이웃이 와서 돕는다.
// - 마을 회의: 다리·축제·물꼬 순번·떠돌이·자경단·곳간을 두고 말을 보탠다.
// - 촌장 뽑기: 촌장이 죽거나 늙으면 고장이 새 촌장을 뽑는다. 나도 나설 수 있다. 촌장이 되면 이웃 다툼을 판가름한다.
// - 이웃 다툼: 물꼬·담장·가축·밤 소란. 원한이 깊어지면 feud의 원수가 된다.
// - 마을 일 맡기(village_duty): 축제 주관, 다리 놓기, 우물 파기, 자경단, 곳간 채우기. 다 지은 것은 고장의 자랑거리로 남는다.
// - 떠돌이: 재앙이 든 해에는 더 자주 흘러든다. 받아들이면 고마운 이웃이 되기도, 골칫거리가 되기도 한다.
// 잇는 곳: relations(호감·기억, 이웃 호감 가산 addAffinity), repute(마을 일·다툼이 평판이 됨), nature(재앙·흉년이 회의·품앗이·떠돌이를 부름),
// feud(깊어진 이웃 다툼은 원한), 대 잇기(자식은 부모가 쌓은 이름 일부를 물려받는다).
// 상태는 game.village 하나. 화면 연결점: villageInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, fullName, has, ageYears, makePerson, living } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, tired, stress, spend, canSpend, check } from '../adventure/core.js';
import { rel, remember, addAffinity } from '../relations.js';
import { isJailed } from '../crime.js';
import { deed, opinionAt } from '../repute/index.js';
import { addGrudge } from '../feud/index.js';
import { calamityAt } from '../nature/index.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '어느 고장';
const isHere = (p, pl) => (p.place ?? 'ern') === pl;
// 여관·숙소살이는 머무는 것이지 사는 것이 아니다
const SETTLED = ['family', 'rent', 'own'];

export function belongWord(v) {
  if (v >= 75) return '마을의 기둥';
  if (v >= 50) return '우리 마을 사람';
  if (v >= 30) return '얼굴은 아는 이웃';
  if (v >= 15) return '굴러온 돌';
  return '뜨내기';
}
// 촌장을 뽑는 곳은 마을뿐이다. 도시는 영주와 관리가 다스린다
const VILLAGES = ['ern', 'gruental', 'silverleaf', 'hammer', 'klein'];
const HEAD = () => '촌장';

/* ---------- 상태 ---------- */
export function villageState(g) {
  g.village ??= {};
  const v = g.village;
  v.places ??= {};     // 고장 id → { belong, since, months, chores, neighbors[], favors, owed, snubs, quarrels, birth }
  v.heads ??= {};      // 고장 id → { id, since, me } 촌장 (에른은 'elder' 직업인 사람)
  v.office ??= null;   // 내가 맡은 자리 { place, since, title }
  v.projects ??= [];   // [{ kind, place, name, progress, need, at }]
  v.landmarks ??= [];  // [{ name, kind, place, y, by }]
  v.strangers ??= [];  // [{ id, name, place, at, fate }]
  v.meetingAt ??= {};  // 고장 id → 지난 회의
  v.electAt ??= {};    // 고장 id → 지난 선거
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const V = villageState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
function placeRec(g, pl = here(g)) {
  const v = V(g);
  if (!v.places[pl]) {
    const born = pl === 'ern' && g.player.familyId !== 'elf_exile';
    v.places[pl] = { belong: born ? 45 : 5, since: mi(g), months: 0, chores: 0, neighbors: [], favors: 0, owed: 0, snubs: 0, quarrels: 0, birth: born };
  }
  return v.places[pl];
}
export const belongAt = (g, pl = here(g)) => V(g).places[pl]?.belong ?? 0;
function addBelong(g, n, pl = here(g)) { const r = placeRec(g, pl); r.belong = clamp(r.belong + n, 0, 100); return r.belong; }
const settled = (g) => SETTLED.includes(L(g).home) && !traveling(g) && !isJailed(g);
const ready = (g) => playerAge(g) >= 16 && settled(g) && !g.over;

/* ---------- 이웃 ---------- */
// 에른은 마을 사람들 중에서, 다른 고장은 처음 자리 잡을 때 이웃 몇을 만든다
function neighbors(g, pl = here(g)) {
  const r = placeRec(g, pl);
  r.neighbors = r.neighbors.filter((id) => { const p = byId(g, id); return p && p.alive && !p.isPlayer && !g.player.familyIds.includes(id) && isHere(p, pl); });
  return r.neighbors.map((id) => byId(g, id));
}
function fillNeighbors(g, rng, pl = here(g)) {
  const r = placeRec(g, pl);
  const list = neighbors(g, pl);
  if (list.length >= 4) return list;
  const pool = g.people.filter((p) => p.alive && !p.isPlayer && !p.away && isHere(p, pl) && ageYears(p) >= 18 && !g.player.familyIds.includes(p.id) && !r.neighbors.includes(p.id) && p.job !== 'child');
  while (r.neighbors.length < 4 && pool.length) {
    const p = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    r.neighbors.push(p.id); p.known = true; rel(p);
  }
  // 사람이 모자란 고장은 이웃을 새로 만든다
  while (r.neighbors.length < 4) {
    const p = makePerson(rng, { ageMonths: rng.int(24, 60) * 12, job: rng.pick(['farmer', 'laborer', 'carpenter', 'weaver', 'baker']) });
    p.place = pl; p.known = true; p.affection = rng.int(-5, 10);
    g.people.push(p); rel(p);
    r.neighbors.push(p.id);
  }
  return neighbors(g, pl);
}
const neighborWord = (a) => (a >= 50 ? '형제 같은 이웃' : a >= 20 ? '살가운 이웃' : a >= -10 ? '그냥 이웃' : a >= -35 ? '껄끄러운 이웃' : '앙숙');

/* ---------- 촌장 ---------- */
function headOf(g, pl = here(g)) {
  const v = V(g);
  if (v.office?.place === pl) return { me: true, name: g.player.name };
  if (pl === 'ern') {
    const e = living(g).find((p) => p.job === 'elder' && !p.isPlayer && isHere(p, 'ern'));
    return e ? { id: e.id, name: e.name, p: e } : null;
  }
  const h = v.heads[pl] ? byId(g, v.heads[pl].id) : null;
  return h && h.alive ? { id: h.id, name: h.name, p: h } : null;
}

/* ---------- 상태 읽기 (화면용) ---------- */
export function villageInfo(g) {
  const v = V(g);
  const pl = here(g);
  const r = v.places[pl];
  const head = headOf(g, pl);
  return {
    here: pl, placeName: placeName(pl), settled: settled(g),
    belong: Math.round(r?.belong ?? 0), belongWord: belongWord(r?.belong ?? 0), years: r ? Math.floor(r.months / 12) : 0, born: !!r?.birth,
    favors: r?.favors ?? 0, owed: r?.owed ?? 0,
    head: head ? { name: head.me ? `${g.player.name} (나)` : head.name, me: !!head.me, title: HEAD(pl) } : null,
    office: v.office ? { place: v.office.place, placeName: placeName(v.office.place), title: v.office.title, years: Math.floor((mi(g) - v.office.since) / 12) } : null,
    neighbors: r ? neighbors(g, pl).map((p) => ({ id: p.id, name: fullName(p), age: ageYears(p), affection: Math.round(p.affection ?? 0), word: neighborWord(p.affection ?? 0) })) : [],
    projects: v.projects.map((x) => ({ name: x.name, kind: x.kind, place: x.place, placeName: placeName(x.place), progress: Math.round((x.progress / x.need) * 100) })),
    landmarks: v.landmarks.slice(-10).map((x) => ({ name: x.name, kind: x.kind, place: x.place, placeName: placeName(x.place), y: x.y, by: x.by })),
    strangers: v.strangers.slice(-6).map((x) => ({ name: x.name, placeName: placeName(x.place), fate: x.fate ?? '아직 자리 잡는 중' })),
    other: Object.entries(v.places).filter(([id]) => id !== pl).map(([id, x]) => ({ place: id, placeName: placeName(id), belong: Math.round(x.belong), word: belongWord(x.belong) })),
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 품앗이 ---------- */
const HELP = {
  spring: ['모내기', '밭갈이', '울타리 고치기'],
  summer: ['김매기', '지붕 이엉 잇기', '물꼬 손보기'],
  autumn: ['추수', '타작', '김장'],
  winter: ['장작 패기', '눈 치우기', '헛간 고치기'],
};
const seasonOf = (m) => (m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn');
ACTIONS.push({
  id: 'village_help', name: '이웃 일 거들기', icon: 'labor',
  desc: '품앗이. 이웃의 밭일·지붕·장작을 거든다. 몸은 고되지만 이웃이 나를 우리 사람으로 여기고, 언젠가 품을 갚으러 온다.',
  available: (g) => ready(g),
  run(g, rng) {
    const list = fillNeighbors(g, rng);
    const p = rng.pick(list);
    const r = placeRec(g);
    const work = rng.pick(HELP[seasonOf(g.date.month)]);
    tired(g, 9);
    p.affection = Math.min(100, (p.affection ?? 0) + 4);
    remember(g, p, `${work}을 거들어 주었다`.replace(`${work}을`, J(work, '을/를')), 1, { tag: 'village_help' });
    r.favors = Math.min(12, r.favors + 1);
    const b = addBelong(g, r.belong < 30 ? 1.8 : r.belong < 50 ? 1.0 : r.belong < 75 ? 0.5 : 0.2);
    if (calamityAt(g)) { addBelong(g, 1); deed(g, 'kind', 2, null); }
    const lines = {
      spring: `${p.name}네 밭에서 하루 종일 허리를 굽혔다. 저녁에 ${J(p.name, '이/가')} 막걸리 한 사발을 내밀었다.`,
      summer: `${p.name}네 ${work}. 땡볕 아래 땀이 비 오듯 했다. "자네 덕에 하루 벌었네."`,
      autumn: `${p.name}네 ${work}. 볏단을 나르다 보니 손바닥이 갈라졌다. 그래도 곳간이 차는 걸 보니 내 일처럼 뿌듯했다.`,
      winter: `${p.name}네 ${work}. 손이 곱았지만, 그 집 아이들이 처마 밑에서 손을 흔들었다.`,
    }[seasonOf(g.date.month)];
    return `${lines}${b >= 50 && !r.calledOurs ? (r.calledOurs = true, '') +  ' 이제 사람들이 나를 "우리 마을 사람"이라 부른다.' : ''}`;
  },
});

/* ---------- 마을 일 맡기 ---------- */
const TASKS = {
  festival: { name: '축제 주관', need: 1, cost: 25, line: '마을 축제를 맡는다' },
  bridge: { name: '다리 놓기', need: 6, cost: 40, line: '개울에 돌다리를 놓는다' },
  well: { name: '우물 파기', need: 4, cost: 20, line: '마을 우물을 하나 더 판다' },
  watch: { name: '자경단 꾸리기', need: 3, cost: 10, line: '밤길을 지킬 자경단을 꾸린다' },
  granary: { name: '곳간 채우기', need: 2, cost: 30, line: '흉년에 대비해 마을 곳간을 채운다' },
};
const activeProject = (g, pl = here(g)) => V(g).projects.find((x) => x.place === pl) ?? null;
ACTIONS.push({
  id: 'village_duty', name: '마을 일 맡기', icon: 'home',
  desc: '축제 주관, 다리 놓기, 우물 파기, 자경단, 곳간 채우기. 마을 사람들이 나를 얼굴은 아는 이웃쯤으로 여겨야 맡길 수 있다. 다 이룬 일은 고장에 오래 남는다.',
  available: (g) => ready(g) && playerAge(g) >= 18 && belongAt(g) >= 30 && !sceneQueued(g, 'village_task'),
  run(g, rng) {
    const pr = activeProject(g);
    if (pr) return workProject(g, rng, pr);
    queueScene(g, 'village_task', {});
    return '마을 어른들과 마주 앉았다. 무슨 일을 맡을지 정해야 한다.';
  },
});
function workProject(g, rng, pr) {
  const T = TASKS[pr.kind];
  tired(g, 8);
  const helpers = Math.min(3, Math.floor(belongAt(g) / 25));
  pr.progress += 1 + (helpers >= 2 && rng.chance(0.4) ? 1 : 0);
  addBelong(g, 1);
  if (pr.progress < pr.need) return `${pr.name}. ${helpers ? `이웃 ${helpers}명이 나와 손을 보탰다. ` : '혼자 돌을 날랐다. '}${Math.round((pr.progress / pr.need) * 100)}%쯤 되었다.`;
  return finishProject(g, rng, pr);
}
function finishProject(g, rng, pr) {
  const v = V(g);
  v.projects = v.projects.filter((x) => x !== pr);
  const r = placeRec(g, pr.place);
  r.chores += 1;
  addBelong(g, pr.kind === 'festival' ? 6 : 10, pr.place);
  deed(g, pr.kind === 'watch' ? 'brave' : 'generous', pr.kind === 'festival' ? 6 : 10, `${pr.name}을 맡아 해냈다더라`.replace(`${pr.name}을`, J(pr.name, '을/를')), pr.place);
  for (const p of neighbors(g, pr.place)) p.affection = Math.min(100, (p.affection ?? 0) + 3);
  if (pr.kind !== 'festival') {
    v.landmarks.push({ name: pr.name, kind: pr.kind, place: pr.place, y: g.date.year, by: g.player.name });
    if (v.landmarks.length > 30) v.landmarks.shift();
    chron(g, `${placeName(pr.place)}에 ${J(pr.name, '이/가')} 생기다. ${g.player.name}이 앞장섰다.`.replace(`${g.player.name}이 앞`, `${J(g.player.name, '이/가')} 앞`), 40);
  }
  log(g, `${J(pr.name, '을/를')} 해냈다.`);
  return {
    festival: '축제 날, 광장에 등불이 걸리고 북소리가 울렸다. 늙은이들이 춤을 추고 아이들이 엿을 물고 뛰었다. "올해 축제는 누가 맡았대?" 그 대답이 내 이름이었다.',
    bridge: `마지막 돌을 얹었다. 마을 사람들이 줄지어 건너 보았다. 이제 비가 와도 장에 갈 수 있다. 사람들은 이 다리를 "${pr.name}"라 부르기로 했다.`,
    well: '물줄기가 솟았다. 아낙들이 두레박을 내려 처음 길은 물을 내게 먼저 건넸다. 차고 달았다.',
    watch: '자경단이 첫 밤을 돌았다. 횃불이 골목을 지날 때마다 문틈으로 고맙다는 인사가 새어 나왔다.',
    granary: '곳간 문을 닫고 빗장을 질렀다. 올겨울은 아무도 굶지 않을 것이다.',
  }[pr.kind];
}
defineScene('village_task', {
  title: () => '마을 일',
  text: (g) => {
    const cal = calamityAt(g);
    return `${placeName(here(g))}의 어른들이 내 얼굴을 보았다. ${cal ? '재앙이 든 해다. 곳간 이야기가 먼저 나왔다.' : '올해는 무엇을 하면 좋겠냐고 물었다.'} 맡으면 내 돈과 품이 든다. 해내면 고장에 오래 남는다.`;
  },
  choices: (g) => {
    const out = [];
    for (const [k, T] of Object.entries(TASKS)) {
      if (k === 'granary' && !calamityAt(g) && g.date.month < 9) continue;
      if (k !== 'festival' && V(g).landmarks.some((x) => x.place === here(g) && x.kind === k)) continue;
      if (canSpend(g, T.cost)) out.push({ label: `${T.line} (은화 ${T.cost}닢)`, key: k });
    }
    return out.length ? [...out, { label: '이번에는 사양한다', key: 'none' }] : [];
  },
  resolve(g, rng, s, key) {
    if (key === 'none') return '사양했다. 어른 하나가 "다음에는 꼭 자네가 맡게"라고 했다.';
    const T = TASKS[key];
    if (!spend(g, T.cost)) return '돈이 모자랐다.';
    const nm = key === 'bridge' ? `${g.player.name} 다리` : key === 'well' ? `${placeName(here(g)).split(' ')[0]} 새 우물` : key === 'watch' ? `${placeName(here(g)).split(' ')[0]} 자경단` : T.name;
    const pr = { kind: key, place: here(g), name: nm, progress: 0, need: T.need, at: mi(g) };
    V(g).projects.push(pr);
    if (key === 'festival') {
      const ok = check(rng, g.player.stats.cha * 0.6 + belongAt(g) * 0.3, 35);
      pr.progress = 1;
      if (!ok) { V(g).projects = V(g).projects.filter((x) => x !== pr); addBelong(g, 2); return '축제를 맡았다. 비가 왔고, 악사는 늦었고, 국은 짰다. 그래도 사람들은 웃으며 돌아갔다. "애썼네." 다음번엔 더 잘할 것이다.'; }
      return finishProject(g, rng, pr);
    }
    return `${T.line}. 몇 달은 걸릴 일이다. '마을 일 맡기'를 할 때마다 일이 나아간다.`;
  },
});

/* ---------- 촌장 일 보기 ---------- */
ACTIONS.push({
  id: 'village_rule', name: `마을 송사 보기`, icon: 'crown',
  desc: '촌장으로서 이웃들이 들고 온 다툼을 판가름하고 마을 살림을 챙긴다.',
  available: (g) => ready(g) && V(g).office?.place === here(g) && !sceneQueued(g, 'village_judge'),
  run(g, rng) {
    const list = fillNeighbors(g, rng).concat(living(g).filter((p) => isHere(p, here(g)) && !p.isPlayer && ageYears(p) >= 18 && !g.player.familyIds.includes(p.id)));
    const uniq = [...new Map(list.map((p) => [p.id, p])).values()];
    if (uniq.length < 2) { addBelong(g, 1); return '오늘은 찾아온 사람이 없었다. 마을 장부를 정리했다.'; }
    const a = rng.pick(uniq);
    const b = rng.pick(uniq.filter((p) => p.id !== a.id));
    tired(g, 4);
    queueScene(g, 'village_judge', { a: a.id, b: b.id, what: rng.pick(['water', 'fence', 'beast', 'debt']) });
    return `${J(a.name, '과/와')} ${J(b.name, '이/가')} 서로 삿대질을 하며 찾아왔다.`;
  },
});
const WHAT = {
  water: { name: '물꼬', line: (a, b) => `${J(a, '이/가')} 밤마다 제 논으로 물꼬를 튼다고 ${J(b, '이/가')} 따진다. ${J(a, '은/는')} 물은 하늘 것이라 한다.` },
  fence: { name: '담장', line: (a, b) => `${J(b, '이/가')} 담장을 반 자 밀어 세웠다고 ${J(a, '이/가')} 성을 낸다. 둘 다 할아버지 때부터 그 자리였다고 우긴다.` },
  beast: { name: '가축', line: (a, b) => `${a}네 돼지가 ${b}네 텃밭을 다 파헤쳤다. ${J(b, '은/는')} 돼지 값을 물라 하고, ${J(a, '은/는')} 울타리가 허술한 탓이라 한다.` },
  debt: { name: '빚', line: (a, b) => `${J(a, '이/가')} 꾸어 간 씨앗 값을 안 갚는다고 ${J(b, '이/가')} 울분을 토한다.` },
};
defineScene('village_judge', {
  title: (g, s) => `${WHAT[s.what].name} 송사`,
  text: (g, s) => { const a = byId(g, s.a); const b = byId(g, s.b); return `${WHAT[s.what].line(a.name, b.name)} 마을 사람들이 내 입만 본다.`; },
  choices: (g, s) => {
    const a = byId(g, s.a); const b = byId(g, s.b);
    if (!a?.alive || !b?.alive) return [];
    return [{ label: `${a.name}의 손을 들어 준다`, key: 'a' }, { label: `${b.name}의 손을 들어 준다`, key: 'b' }, { label: '반씩 양보하게 한다', key: 'half' }, { label: '뒷돈을 준 쪽 편을 든다', key: 'bribe' }];
  },
  resolve(g, rng, s, key) {
    const a = byId(g, s.a); const b = byId(g, s.b);
    if (!a || !b) return '송사가 흐지부지되었다.';
    if (key === 'half') {
      const ok = check(rng, g.player.stats.int * 0.4 + g.player.stats.cha * 0.3 + belongAt(g) * 0.3, 40);
      addBelong(g, ok ? 3 : 0); deed(g, 'honest', ok ? 4 : 1, null);
      if (ok) { a.affection += 2; b.affection += 2; return '반씩 물리게 했다. 둘 다 투덜댔지만 돌아가는 길에 나란히 걸었다. "촌장 말이 틀린 건 아니지."'; }
      a.affection -= 2; b.affection -= 2;
      return '반씩 양보하라 했다. 둘 다 손해 봤다고 여겼다. 사람들은 촌장이 줏대가 없다고 수군거렸다.';
    }
    if (key === 'bribe') {
      const [w, l] = (a.wealth ?? 0) >= (b.wealth ?? 0) ? [a, b] : [b, a];
      g.player.money += 8;
      w.affection += 3; l.affection -= 15;
      deed(g, 'honest', -8, '촌장이 뒷돈을 받고 송사를 판다더라');
      addBelong(g, -4);
      if (l.affection <= -40) addGrudge(g, l, 30, '뒷돈 받고 송사를 판 촌장');
      return `${w.name}의 소매에서 은화 여덟 닢이 내 소매로 옮겨 갔다. ${J(l.name, '은/는')} 판결을 듣고 아무 말 없이 침을 뱉고 나갔다.`;
    }
    const [w, l] = key === 'a' ? [a, b] : [b, a];
    w.affection += 6; l.affection -= 6;
    remember(g, l, `${s.what === 'water' ? '물꼬' : '송사'}에서 내 편을 들지 않았다`, -1, { tag: 'village_judge' });
    deed(g, 'honest', 3, null);
    addBelong(g, 1);
    return `${w.name}의 손을 들어 주었다. ${J(w.name, '은/는')} 고개를 숙였고, ${J(l.name, '은/는')} 이를 갈았다. 판결은 공평했을 것이다. 그렇게 믿기로 했다.`;
  },
});

/* ---------- 마을 회의 ---------- */
const AGENDA = {
  bridge: { title: '돌다리', text: '개울을 건너는 나무다리가 또 떠내려갔다. 돌다리를 놓자면 집집이 돈을 내야 한다.', yes: '돈을 내자고 한다', no: '형편이 어렵다고 반대한다' },
  festival: { title: '축제', text: '올가을 축제를 크게 할지 작게 할지를 두고 말이 갈렸다.', yes: '크게 하자고 한다', no: '아껴 두자고 한다' },
  water: { title: '물꼬 순번', text: '가문 해다. 어느 집 논부터 물을 댈지 순번을 정해야 한다.', yes: '없는 집부터 대자고 한다', no: '땅 많은 집부터가 순리라고 한다' },
  stranger: { title: '떠돌이', text: '마을 어귀에 떠돌이들이 천막을 쳤다. 쫓아낼지 머물게 할지 정하자고 한다.', yes: '머물게 하자고 한다', no: '쫓아내자고 한다' },
  watch: { title: '자경단', text: '이웃 고장에 도적이 들었다는 소문이다. 집집이 장정을 내 밤길을 돌자고 한다.', yes: '내가 먼저 나서겠다고 한다', no: '경비대 일이라고 한다' },
  granary: { title: '곳간', text: '재앙이 든 해다. 마을 곳간을 열어 나눌지, 봄까지 닫아 둘지 다툰다.', yes: '지금 열자고 한다', no: '봄까지 버티자고 한다' },
};
defineScene('village_meeting', {
  title: (g, s) => `마을 회의: ${AGENDA[s.topic].title}`,
  text: (g, s) => {
    const b = belongAt(g);
    const lead = b < 30 ? ' 내가 입을 열려 하자 몇몇이 고개를 돌렸다. 굴러온 사람 말은 반만 듣는 마을이다.' : b >= 60 ? ' 사람들이 내 쪽을 본다. 내 말이 무게가 있다.' : '';
    return `${/마을/.test(placeName(here(g))) ? placeName(here(g)) : `${placeName(here(g))} 마을`} 회의. ${AGENDA[s.topic].text}${lead}`;
  },
  choices: (g, s) => [{ label: AGENDA[s.topic].yes, key: 'yes' }, { label: AGENDA[s.topic].no, key: 'no' }, { label: '잠자코 듣는다', key: 'quiet' }],
  resolve(g, rng, s, key) {
    const b = belongAt(g);
    if (key === 'quiet') { addBelong(g, 0.5); return '잠자코 들었다. 회의는 늘 그렇듯 목소리 큰 사람 뜻대로 끝났다.'; }
    const heard = check(rng, b * 0.6 + g.player.stats.cha * 0.4, 40);
    const t = s.topic;
    if (!heard) {
      addBelong(g, b < 30 ? -1 : 0.5);
      return b < 30 ? '"이 마을에 몇 해나 살았다고." 누군가 중얼거렸다. 내 말은 바닥에 떨어졌다.' : '말을 보탰지만 뜻대로 되지 않았다. 그래도 사람들은 내 말을 끝까지 들었다.';
    }
    addBelong(g, 2.5);
    if (t === 'bridge' && key === 'yes') { const paid = canSpend(g, 10) && spend(g, 10); deed(g, 'generous', 4, null); if (!activeProject(g)) V(g).projects.push({ kind: 'bridge', place: here(g), name: `${placeName(here(g)).split(' ')[0]} 돌다리`, progress: 1, need: 6, at: mi(g) }); return `내 말에 다들 고개를 끄덕였다. ${paid ? '은화 열 닢을 먼저 내놓았다.' : '내 주머니는 비었지만 품으로 갚겠다고 했다.'} 돌다리 일을 맡아 달라는 말이 나왔다.`; }
    if (t === 'festival' && key === 'yes') { deed(g, 'generous', 3, null); return '크게 하자는 쪽으로 기울었다. 그해 가을, 광장의 등불이 유난히 밝았다.'; }
    if (t === 'water') { deed(g, key === 'yes' ? 'kind' : 'loyal', 4, null); for (const p of neighbors(g)) p.affection += key === 'yes' ? ((p.wealth ?? 0) < 25 ? 4 : -2) : ((p.wealth ?? 0) >= 25 ? 3 : -3); return key === 'yes' ? '없는 집부터 물을 대기로 했다. 땅 많은 집 영감이 헛기침을 했다.' : '순리대로 하기로 했다. 가난한 집 아낙의 눈이 젖었다.'; }
    if (t === 'stranger') { deed(g, key === 'yes' ? 'kind' : 'brave', 4, null); if (key === 'yes') makeStranger(g, rng, 'meeting'); return key === 'yes' ? '떠돌이들을 받아들이기로 했다. 그들 중 한 집이 마을 끝 빈집에 들었다.' : '떠돌이들은 다음 날 아침 천막을 걷었다. 아이 하나가 뒤돌아 마을을 오래 보았다.'; }
    if (t === 'watch') { deed(g, key === 'yes' ? 'brave' : 'honest', 4, null); if (key === 'yes') { tired(g, 6); addBelong(g, 2); } return key === 'yes' ? '첫 밤은 내가 돌았다. 다음 밤부터 장정들이 줄을 섰다.' : '경비대에 맡기기로 했다. 사람들은 조금 실망한 눈치였다.'; }
    if (t === 'granary') { deed(g, key === 'yes' ? 'generous' : 'honest', 5, null); return key === 'yes' ? '곳간을 열었다. 집집이 보리 한 말씩 받아 갔다. 봄이 걱정이지만, 오늘 굶는 아이는 없다.' : '봄까지 버티기로 했다. 겨울이 길었다. 그래도 봄에 씨앗은 남아 있었다.'; }
    return '내 말대로 정해졌다. 회의가 끝나고 몇 사람이 어깨를 두드렸다.';
  },
});

/* ---------- 촌장 뽑기 ---------- */
function candidates(g, rng, pl) {
  const local = g.people.filter((p) => p.alive && !p.isPlayer && !p.away && isHere(p, pl) && ageYears(p) >= 35 && !g.player.familyIds.includes(p.id) && p.job !== 'elder')
    .sort((a, b) => ((b.wealth ?? 0) + ageYears(b) + (b.skill ?? 0)) - ((a.wealth ?? 0) + ageYears(a) + (a.skill ?? 0)));
  const out = local.slice(0, 2);
  while (out.length < 2) {
    const p = makePerson(rng, { ageMonths: rng.int(40, 62) * 12, job: rng.pick(['farmer', 'carpenter', 'baker']) });
    p.place = pl; p.known = true; g.people.push(p); rel(p);
    out.push(p);
  }
  return out.map((p) => p.id);
}
defineScene('village_election', {
  title: (g) => `${HEAD(here(g))} 뽑기`,
  text: (g, s) => {
    const [a, b] = s.cands.map((id) => byId(g, id));
    const why = s.why === 'dead' ? `${HEAD(here(g))} 자리가 비었다.` : s.why === 'old' ? `늙은 ${J(HEAD(here(g)), '이/가')} 물러나겠다고 했다.` : `${HEAD(here(g))}의 임기가 찼다.`;
    return `${why} 마을 사람들이 광장에 모였다. ${a.name}(${ageYears(a)}살), ${b.name}(${ageYears(b)}살)의 이름이 오르내린다.${s.canRun ? ' 내 이름을 부르는 사람도 몇 있다.' : ''}`;
  },
  choices: (g, s) => {
    const cs = s.cands.map((id) => byId(g, id));
    if (cs.some((p) => !p?.alive)) return [];
    return [
      ...cs.map((p, i) => ({ label: `${p.name}을 민다`.replace(`${p.name}을`, J(p.name, '을/를')), key: `v${i}` })),
      ...(s.canRun ? [{ label: '내가 나선다', key: 'run' }] : []),
      { label: '어느 쪽도 들지 않는다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const pl = here(g);
    const v = V(g);
    v.electAt[pl] = mi(g);
    const cs = s.cands.map((id) => byId(g, id));
    const set = (p) => {
      if (pl === 'ern') { for (const q of living(g)) if (q.job === 'elder' && q.id !== p.id && isHere(q, 'ern')) q.job = 'farmer'; p.job = 'elder'; }
      else v.heads[pl] = { id: p.id, since: mi(g) };
      p.known = true;
      p.history.push({ y: g.date.year, m: g.date.month, text: `${placeName(pl)}의 ${HEAD(pl)}이 되었다.`.replace(`${HEAD(pl)}이`, J(HEAD(pl), '이/가')) });
      chron(g, `${fullName(p)}, ${placeName(pl)}의 ${HEAD(pl)}으로 뽑히다.`.replace(`${HEAD(pl)}으로`, J(HEAD(pl), '으로/로')), 30);
    };
    if (key === 'run') {
      const op = opinionAt(g, pl);
      const score = belongAt(g) * 0.6 + g.player.stats.cha * 0.4 + (op.honest + op.kind + op.generous) / 6 + (has(cs[0], 'ambitious') ? -5 : 0);
      if (check(rng, score, 48)) {
        if (pl === 'ern') for (const q of living(g)) if (q.job === 'elder' && isHere(q, 'ern')) q.job = 'farmer';
        v.office = { place: pl, since: mi(g), title: HEAD(pl) };
        addBelong(g, 8);
        chron(g, `${g.player.name}, ${placeName(pl)}의 ${HEAD(pl)}으로 뽑히다.`.replace(`${HEAD(pl)}으로`, J(HEAD(pl), '으로/로')), 60);
        note(g, `${placeName(pl)}의 ${J(HEAD(pl), '이/가')} 되었다.`);
        log(g, `${J(HEAD(pl), '으로/로')} 뽑혔다.`);
        for (const p of cs) if (has(p, 'ambitious') || has(p, 'cruel')) addGrudge(g, p, 20, `${HEAD(pl)} 자리를 빼앗겼다`);
        return `손이 하나둘 올라갔다. 세어 보니 내 쪽이 많았다. 이제 내가 ${placeName(pl)}의 ${HEAD(pl)}이다. 송사도, 세금도, 다리도, 다 내 일이다.`;
      }
      addBelong(g, -2);
      const w = cs[0];
      set(w);
      return `손을 든 사람이 생각보다 적었다. ${J(w.name, '이/가')} ${J(HEAD(pl), '이/가')} 되었다. ${J(w.name, '은/는')} 내게 "다음엔 자네 차례일세"라고 했다. 진심인지는 모르겠다.`;
    }
    if (key === 'none') { const w = cs[rng.int(0, 1)]; set(w); return `어느 쪽도 들지 않았다. ${J(w.name, '이/가')} 뽑혔다.`; }
    const i = Number(key.slice(1));
    const mine = cs[i], other = cs[1 - i];
    const sway = belongAt(g) / 100;
    const w = rng.chance(0.4 + sway * 0.4) ? mine : other;
    set(w);
    if (w === mine) { mine.affection = Math.min(100, (mine.affection ?? 0) + 10); addBelong(g, 2); return `내가 민 ${J(mine.name, '이/가')} 뽑혔다. ${J(mine.name, '은/는')} 내 손을 꼭 잡았다. 마을 일에 내 말이 조금 더 실리게 되었다.`; }
    mine.affection = Math.min(100, (mine.affection ?? 0) + 4); other.affection = (other.affection ?? 0) - 6;
    return `${J(other.name, '이/가')} 뽑혔다. 새 ${J(HEAD(pl), '은/는')} 나를 한번 흘끗 보았다. 누구를 밀었는지 다 안다는 눈이었다.`;
  },
});

/* ---------- 텃세 ---------- */
defineScene('village_snub', {
  title: () => '텃세',
  text: (g, s) => {
    const p = byId(g, s.id);
    return {
      well: `우물가에서 ${J(p.name, '이/가')} 내 두레박을 밀어냈다. "이 우물은 이 마을 사람 거요." 아낙들이 못 본 척 고개를 돌렸다.`,
      price: `장에서 ${J(p.name, '이/가')} 내게만 값을 두 배로 불렀다. "뜨내기 값이오." 뒤에서 누가 킥킥 웃었다.`,
      gossip: `${J(p.name, '이/가')} 사람들 앞에서 내 이야기를 한다. 어디서 굴러왔는지 모를 사람이라고, 뭘 훔쳐 먹고 쫓겨 온 게 틀림없다고.`,
      field: `내 밭 가장자리 말뚝이 밤새 뽑혀 있었다. ${J(p.name, '이/가')} 원래 자기네 땅이었다고 우긴다. 마을 사람 누구도 내 편을 들지 않는다.`,
    }[s.how];
  },
  choices: (g, s) => (byId(g, s.id)?.alive ? [
    { label: '참고 넘긴다', key: 'endure' },
    { label: '맞서 따진다', key: 'confront' },
    ...(canSpend(g, 10) ? [{ label: '술 한 동이를 사 들고 찾아간다 (은화 10닢)', key: 'gift' }] : []),
    ...(headOf(g) && !headOf(g).me ? [{ label: `${HEAD(here(g))}에게 하소연한다`, key: 'head' }] : []),
  ] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const r = placeRec(g);
    if (!p) return '그 사람은 이제 없다.';
    r.snubs += 1;
    if (key === 'endure') { addBelong(g, 1.5); stress(g, 5); return '참았다. 이를 악물고 참았다. 굴러온 돌은 오래 굴러야 박힌다.'; }
    if (key === 'gift') {
      if (!spend(g, 10)) { addBelong(g, 1); return '술값이 모자랐다. 빈손으로 찾아가 고개만 숙였다. 그것도 아주 소용없지는 않았다.'; }
      p.affection = Math.min(100, (p.affection ?? 0) + 15); addBelong(g, 3);
      return `술 한 동이를 들고 ${p.name}네 문을 두드렸다. ${J(p.name, '은/는')} 어이없어하다가 결국 잔을 꺼냈다. 새벽까지 마셨다. 다음 날부터 우물가에서 아무도 나를 밀지 않았다.`;
    }
    if (key === 'head') {
      const h = headOf(g);
      if (check(rng, (h.p?.affection ?? 0) * 0.5 + g.player.stats.cha * 0.4, 30)) { p.affection = (p.affection ?? 0) + 5; addBelong(g, 2); return `${J(h.name, '이/가')} ${p.name}을 불러 꾸짖었다.`.replace(`${p.name}을`, J(p.name, '을/를')) + ' "이 사람도 이제 우리 마을 사람이야." 그 말이 오래 귀에 남았다.'; }
      addBelong(g, -1);
      return `${J(h.name, '은/는')} 고개만 끄덕였다. 아무것도 달라지지 않았다. 촌장도 결국 이 마을 사람이다.`;
    }
    if (check(rng, g.player.stats.cha * 0.4 + g.player.stats.str * 0.3 + r.belong * 0.3, 35)) {
      p.affection = (p.affection ?? 0) + 6; addBelong(g, 4); deed(g, 'brave', 3, null);
      return `물러서지 않았다. ${J(p.name, '은/는')} 한참 노려보다가 먼저 눈을 돌렸다. 구경하던 사람들 사이에서 "제법이네" 하는 소리가 들렸다.`;
    }
    p.affection = (p.affection ?? 0) - 10; addBelong(g, -2);
    if (p.affection <= -40) addGrudge(g, p, 25, '굴러온 놈이 대들었다');
    return `언성이 높아졌다. 사람들이 몰려들었지만 모두 ${p.name} 편이었다. 그날 이후 마을 길이 한층 좁아졌다.`;
  },
});

/* ---------- 이웃 다툼 ---------- */
defineScene('village_quarrel', {
  title: (g, s) => `${WHAT[s.what].name} 다툼`,
  text: (g, s) => {
    const p = byId(g, s.id);
    return {
      water: `가문 밤, 내 논의 물꼬가 막혀 있고 ${p.name}네 논으로 물이 흘러간다. 삽을 든 ${J(p.name, '이/가')} 둑 위에 서 있다.`,
      fence: `${J(p.name, '이/가')} 담장을 새로 쌓으면서 내 마당을 한 자 먹어 들어왔다. "원래 우리 땅이었소."`,
      beast: `${p.name}네 염소가 또 내 텃밭을 짓밟았다. 이번이 세 번째다. 배추가 남아나질 않는다.`,
      debt: `${J(p.name, '이/가')} 지난봄 꾸어 간 보리를 갚을 생각을 안 한다. 길에서 마주쳐도 딴청이다.`,
    }[s.what];
  },
  choices: (g, s) => (byId(g, s.id)?.alive ? [
    { label: '양보한다', key: 'yield' },
    { label: '찾아가 따진다', key: 'argue' },
    ...(headOf(g) && !headOf(g).me ? [{ label: `${HEAD(here(g))}에게 맡긴다`, key: 'head' }] : []),
    { label: '똑같이 갚아 준다', key: 'back' },
  ] : []),
  resolve(g, rng, s, key) {
    const p = byId(g, s.id);
    const r = placeRec(g);
    if (!p) return '그 사람은 이제 없다.';
    r.quarrels += 1;
    if (key === 'yield') { p.affection = (p.affection ?? 0) + 6; addBelong(g, 1); deed(g, 'kind', 3, null); stress(g, 3); return `양보했다. ${J(p.name, '은/는')} 멋쩍게 웃었다. 며칠 뒤 우리 집 문 앞에 호박 두 덩이가 놓여 있었다.`; }
    if (key === 'head') {
      const h = headOf(g);
      const mine = check(rng, belongAt(g) * 0.5 + (h.p?.affection ?? 0) * 0.3 + g.player.stats.cha * 0.2, 40);
      if (mine) { p.affection = (p.affection ?? 0) - 4; addBelong(g, 1); return `${J(h.name, '이/가')} 내 손을 들어 주었다. ${J(p.name, '은/는')} 투덜대며 물러섰다.`; }
      p.affection = (p.affection ?? 0) - 2; stress(g, 4);
      return `${J(h.name, '은/는')} ${p.name}의 편을 들었다. 오래 산 사람 말이 더 무겁다는 것을 다시 배웠다.`;
    }
    if (key === 'argue') {
      if (check(rng, g.player.stats.cha * 0.5 + belongAt(g) * 0.3, 35)) { p.affection = (p.affection ?? 0) + 2; return `한참 언성을 높였다. 결국 ${J(p.name, '이/가')} 손을 들었다. "알았네, 알았어." 둘 다 지쳐서 웃었다.`; }
      p.affection = (p.affection ?? 0) - 12;
      if (p.affection <= -40) addGrudge(g, p, 20, `${WHAT[s.what].name} 다툼`);
      return `말이 거칠어졌다. ${J(p.name, '은/는')} 문을 쾅 닫고 들어갔다. 이웃 사이에 금이 갔다.`;
    }
    p.affection = (p.affection ?? 0) - 18;
    deed(g, 'kind', -4, null);
    addBelong(g, -2);
    if (p.affection <= -35) addGrudge(g, p, 30, `${WHAT[s.what].name} 다툼 끝에 앙숙이 되었다`);
    return `똑같이 갚아 주었다. ${p.name}네 물꼬를 막고, 담장 돌을 빼냈다. 속은 시원했다. 다음 날부터 ${J(p.name, '과/와')} 나는 앙숙이 되었다.`;
  },
});

/* ---------- 떠돌이 ---------- */
function makeStranger(g, rng, how) {
  const pl = here(g);
  const p = makePerson(rng, { ageMonths: rng.int(20, 45) * 12, job: rng.pick(['laborer', 'farmer', 'weaver']) });
  p.place = pl; p.known = true; p.affection = how === 'home' ? 45 : 20;
  g.people.push(p); rel(p);
  remember(g, p, how === 'home' ? '갈 곳 없는 나를 받아 주었다' : '마을에 머물게 해 주었다', 1, { tag: 'village_stranger' });
  V(g).strangers.push({ id: p.id, name: fullName(p), place: pl, at: mi(g), fate: null });
  if (V(g).strangers.length > 20) V(g).strangers.shift();
  placeRec(g).neighbors.push(p.id);
  return p;
}
defineScene('village_stranger', {
  title: () => '떠돌이',
  text: (g, s) => `${s.cal ? '재앙을 피해 온 사람들이 길을 메웠다. ' : ''}해 질 녘, 보따리를 멘 ${s.who === 'family' ? '한 가족이' : '사람 하나가'} 우리 집 문 앞에 섰다. ${s.from} 쪽에서 왔다고 한다. 하룻밤만 재워 달라는데, 눈빛은 하룻밤 이상을 바라고 있었다.`,
  choices: (g) => [{ label: '집에 들인다', key: 'home' }, { label: '마을 끝 빈집을 알려 준다', key: 'empty' }, { label: '먹을 것만 쥐여 보낸다', key: 'food' }, { label: '문을 닫는다', key: 'shut' }],
  resolve(g, rng, s, key) {
    if (key === 'shut') { deed(g, 'kind', -2, null); return '문을 닫았다. 한참 뒤 발소리가 멀어졌다. 그날 밤 잠이 오지 않았다.'; }
    if (key === 'food') { deed(g, 'kind', 2, null); return '빵 두 덩이와 물 한 병을 쥐여 보냈다. 고맙다는 인사가 등 뒤에서 오래 들렸다.'; }
    const p = makeStranger(g, rng, key);
    deed(g, 'kind', key === 'home' ? 6 : 4, null);
    for (const n of neighbors(g)) if (n.id !== p.id && rng.chance(0.4)) n.affection += has(n, 'kind') ? 2 : -2;
    log(g, `떠돌이 ${J(p.name, '을/를')} 받아들였다.`);
    return key === 'home'
      ? `${J(p.name, '을/를')} 집에 들였다. 부엌 바닥에 짚을 깔아 주었다. 이웃 몇은 혀를 찼다. ${J(p.name, '은/는')} 다음 날 새벽부터 장작을 팼다.`
      : `마을 끝 빈집을 알려 주었다. ${J(p.name, '은/는')} 지붕부터 고치기 시작했다. 마을 사람들이 멀찍이서 지켜보았다.`;
  },
});

/* ---------- 매달 ---------- */
const FROM = ['북쪽 산골', '불탄 마을', '강 건너', '동쪽 국경', '물에 잠긴 들판', '먼 남쪽'];
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const v = V(g);
  const now = mi(g);
  const pl = here(g);
  // 1) 사는 곳: 오래 살수록 우리 사람
  for (const [id, r] of Object.entries(v.places)) {
    if (id === pl && settled(g)) {
      r.months += 1;
      let d = r.belong < 50 ? 0.18 : r.belong < 75 ? 0.07 : 0.02;
      if (me(g).spouseId && isHere(byId(g, me(g).spouseId) ?? {}, pl)) d += 0.05;
      const op = opinionAt(g, pl);
      if (op.honest < -30) d -= 0.2;
      if (op.kind > 20) d += 0.05;
      r.belong = clamp(r.belong + d, 0, 100);
    } else if (r.belong > 20) r.belong = clamp(r.belong - 0.08, 0, 100); // 떠나 있으면 천천히 잊힌다
  }
  if (!settled(g) || playerAge(g) < 16) return;
  const r = placeRec(g, pl);
  // 2) 갚을 품: 추수·재앙 때 이웃이 와서 돕는다
  const cal = calamityAt(g);
  if (r.favors >= 2 && (cal || g.date.month === 9) && rng.chance(0.5)) {
    const n = Math.min(r.favors, 4);
    r.favors -= n; r.owed += n;
    const money = n * (cal ? 4 : 2);
    g.player.money += money;
    g.news.unshift({ text: cal ? `이웃 ${n}집이 우리 집 일을 거들러 왔다. 재앙이 든 해에 품앗이가 돌아왔다. (은화 ${money}닢 아낌)` : `추수 때 이웃 ${n}집이 품을 갚으러 왔다. 일이 일찍 끝났다. (은화 ${money}닢 아낌)`, rel: 100 });
    log(g, `이웃들이 품을 갚으러 왔다.`);
  }
  // 3) 촌장 자리: 비었거나 늙으면 선거
  const head = headOf(g, pl);
  if (v.office?.place === pl) {
    g.player.money += 3;
    if (v.office.place === pl && now - v.office.since >= 96 && !sceneQueued(g, 'village_election') && rng.chance(0.1)) {
      v.office = null; // 임기가 찼다: 다시 뽑는다
      queueScene(g, 'village_election', { cands: candidates(g, rng, pl), why: 'term', canRun: true });
      return;
    }
  }
  // 맡은 고장을 한 해 넘게 비우면 자리를 내놓는다
  if (v.office && v.office.place !== pl) {
    v.office.away ??= now;
    if (now - v.office.away > 12) { log(g, `${placeName(v.office.place)}을 오래 비워 ${HEAD(v.office.place)} 자리를 내놓았다.`.replace(`${placeName(v.office.place)}을`, J(placeName(v.office.place), '을/를'))); v.office = null; }
  } else if (v.office) v.office.away = null;
  const lastE = v.electAt[pl] ?? -999;
  if (VILLAGES.includes(pl) && (pl === 'ern' || r.belong >= 30) && playerAge(g) >= 18 && !sceneQueued(g, 'village_election') && now - lastE >= 24 && v.office?.place !== pl) {
    const why = !head ? 'dead' : head.p && ageYears(head.p) >= 70 && rng.chance(0.05) ? 'old' : null;
    if (why && rng.chance(why === 'dead' ? 0.25 : 1)) {
      v.electAt[pl] = now;
      queueScene(g, 'village_election', { cands: candidates(g, rng, pl), why, canRun: belongAt(g) >= 50 && playerAge(g) >= 28 });
      return;
    }
  }
  // 5) 받아들인 떠돌이의 뒷이야기
  for (const x of v.strangers) {
    if (x.fate || now - x.at < 12 || !rng.chance(0.05)) continue;
    const p = byId(g, x.id);
    if (!p || !p.alive) { x.fate = '마을을 떠났다'; continue; }
    if (rng.chance(0.75)) {
      x.fate = rng.pick(['이웃과 혼인해 마을에 뿌리를 내렸다', '부지런히 일해 제 밭을 샀다', '마을 일에 앞장서는 사람이 되었다']);
      p.affection = Math.min(100, (p.affection ?? 0) + 10);
      addBelong(g, 2, x.place); deed(g, 'kind', 3, `떠돌이를 받아 사람 구실을 하게 했다더라`, x.place);
      g.news.unshift({ text: `내가 받아들인 ${J(p.name, '이/가')} ${x.fate}.`, rel: 100 });
    } else {
      x.fate = rng.pick(['남의 닭을 훔치다 쫓겨났다', '빚을 지고 밤에 사라졌다']);
      p.away = true;
      addBelong(g, -3, x.place);
      g.news.unshift({ text: `내가 받아들인 ${J(p.name, '이/가')} ${x.fate}. "그러게 뭐랬어." 마을 사람들이 수군거린다.`, rel: 100 });
    }
    log(g, `떠돌이 ${J(p.name, '이/가')} ${x.fate}.`);
    break;
  }
  // 4) 장면: 회의, 텃세, 이웃 다툼, 떠돌이
  if (L(g).queue.some((x) => /^village_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 4) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  if (r.months < 6 && !r.birth) return; // 막 옮겨 온 곳에서는 아직 이웃을 모른다
  const list = fillNeighbors(g, rng, pl);
  if (now - (v.meetingAt[pl] ?? -999) >= 10 && playerAge(g) >= 18 && rng.chance(0.25)) {
    v.meetingAt[pl] = now;
    const pool = ['bridge', 'festival', 'watch', 'stranger', ...(cal ? ['granary', 'granary', 'water'] : []), ...(g.date.month >= 5 && g.date.month <= 8 ? ['water'] : [])];
    return fire('village_meeting', { topic: rng.pick(pool) });
  }
  if (r.belong < 30 && rng.chance(0.09)) {
    const cold = list.filter((p) => (p.affection ?? 0) < 20);
    if (cold.length) return fire('village_snub', { id: rng.pick(cold).id, how: rng.pick(['well', 'price', 'gossip', 'field']) });
  }
  if (rng.chance(cal ? 0.06 : 0.022) && L(g).home !== 'barracks') return fire('village_stranger', { cal: !!cal, who: rng.chance(0.5) ? 'family' : 'one', from: rng.pick(FROM) });
  if (rng.chance(0.045 + (cal ? 0.03 : 0))) {
    const p = rng.pick(list);
    const what = cal === 'drought' ? 'water' : rng.pick(['water', 'fence', 'beast', 'debt']);
    return fire('village_quarrel', { id: p.id, what });
  }
});

// 우리 사람으로 여길수록 그 고장 사람들이 나를 조금 더 좋게 본다
addAffinity((g, p) => {
  const b = g.village?.places?.[p.place ?? 'ern']?.belong;
  return b == null ? 0 : (b - 30) / 60;
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g) => {
  const v = V(g);
  for (const r of Object.values(v.places)) {
    // 부모가 쌓은 이름의 일부는 자식에게 남는다
    r.belong = Math.round(r.belong * 0.7 + (r.birth ? 10 : 0));
    r.favors = Math.floor(r.favors / 2);
    r.neighbors = r.neighbors.filter((id) => !g.player.familyIds.includes(id) && byId(g, id) && !byId(g, id).isPlayer);
  }
  if (v.office) { log(g, `${placeName(v.office.place)}의 ${HEAD(v.office.place)} 자리가 비었다.`); v.office = null; }
  v.sceneAt = 0;
  v.log.push({ y: g.date.year, m: g.date.month, text: '마을 사람들이 이제 부모 대신 나를 본다.' });
});
HOOKS.newGame.push((g) => { V(g); placeRec(g, 'ern'); });
HOOKS.migrate.push((g) => { V(g); });
