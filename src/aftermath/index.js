// 19단계: 전쟁 뒤의 삶.
// 전쟁은 끝나도 끝나지 않는다. 끌려간 사람은 돌아오거나 돌아오지 않고, 돌아온 사람은 예전 사람이 아니다.
// - 징집: 레오니아가 전쟁 중이면(world의 발하르트·북부 전쟁, 왕위 내전) 고장의 젊은 사내들이 끌려간다(p.away, p.drafted).
// - 전쟁이 끝나면(aftermath_return): 돌아온 사람, 다쳐서 돌아온 사람(p.maimed), 전사한 사람, 행방을 모르는 사람.
//   전사자의 아내는 전쟁 과부, 열다섯이 안 된 자식은 전쟁 고아가 된다. 행방을 모르던 사람이 몇 해 뒤 돌아오기도 한다.
// - 불탄 마을: 지거나 북쪽이 밀고 내려오면 고장 하나가 불탄다(ruins). 다시 세우기(aftermath_rebuild)로 손을 보탠다.
// - 적국 출신 이웃: 발하르트 전쟁 뒤 적국에서 흘러온 사람이 고장에 자리를 잡는다. 마을 사람들이 돌을 들 때 내가 어디에 서는가(aftermath_foreigner).
// - 과부와 고아 돕기(aftermath_aid, aftermath_widow): 은화, 밭일, 고아 거두기(kin의 자식으로).
// - 내가 싸웠던 사람이면: 악몽(aftermath_night)과 술(drink 0~100, 높으면 술값과 식구의 근심), 술 끊기(aftermath_sober),
//   전우 모임과 부탁(aftermath_reunion: army의 comrades), 상이군인 청원(aftermath_petition: 몸에 남은 상처가 있으면 연금).
// 매달 굴림은 따로 난수(ownRng)를 써서 다른 갈래의 난수를 밀지 않는다.
// 잇는 곳: world(전쟁), army(퇴역·상처·전우·연금), village(소속감), kin(고아 거두기), love(배우자 기분), faith(기도), repute(deed), heir.
// 상태는 game.aftermath 하나. 화면 연결점: aftermathInfo(g)
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat } from '../game.js';
import { byId, fullName, ageYears, living, makePerson, kill } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, tired, stress, spend, canSpend, check } from '../adventure/core.js';
import { makeRng } from '../rng.js';
import { rel, remember } from '../relations.js';
import { isJailed, reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { addGrudge } from '../feud/index.js';
import { kinState } from '../kin/index.js';
import { loveState } from '../love/index.js';
import { faithState } from '../faith/index.js';
import { villageState } from '../village/index.js';
import { A as armyOf, SCARS } from '../army/index.js';

const jo = (w, pair) => J(w, pair).slice(w.length);
const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const here = (g) => L(g).place ?? 'ern';
const placeName = (id) => PLACES[id]?.name ?? '어느 고장';
const realmOfPlace = (pl) => PLACES[pl]?.realm ?? 'leonia';
const alive = (p) => !!p && p.alive && !p.isPlayer;
const ready = (g) => playerAge(g) >= 12 && !traveling(g) && !isJailed(g) && !g.over && !L(g).heirPending;
// 이 갈래만의 난수: 매달 굴림이 많아 다른 갈래 점검을 흔들지 않게 따로 굴린다
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 71) ^ Math.imul(mi(g) * 41 + salt + 17, 2654435761)) | 0 });

export const WARS = {
  balhart: { name: '발하르트 전쟁', enemy: '발하르트', on: (g) => !!g.realm?.balhart?.war },
  north: { name: '북부 전쟁', enemy: '마왕군', on: (g) => !!g.realm?.north?.war },
  civil: { name: '왕위 내전', enemy: '반대편 왕자 쪽', on: (g) => g.realm?.succession === 'civilwar' },
};
const MAIMS = ['한쪽 다리', '오른팔', '한쪽 눈', '손가락 셋', '귀 한쪽'];
const FRONTIER = ['harfen', 'verden', 'ern'];

/* ---------- 상태 ---------- */
export function aftermathState(g) {
  g.aftermath ??= {};
  const v = g.aftermath;
  v.seen ??= {};       // 전쟁 key → 지난달 전쟁 중이었나
  v.drafted ??= [];    // 끌려간 사람 [{ pid, war, since, home }]
  v.wars ??= [];       // 끝난 전쟁 [{ key, name, y, outcome, back, dead, maimed, missing }]
  v.widows ??= [];     // [{ pid, husband, war, y }]
  v.orphans ??= [];    // [{ pid, father, war, y }]
  v.missing ??= [];    // [{ pid, war, y }]
  v.ruins ??= {};      // 고장 → { damage, war, y, helped }
  v.foreign ??= [];    // 적국 출신 이웃 [{ pid, from, place, y }]
  v.drink ??= 0;       // 술에 기대는 정도 0~100
  v.dryMonths ??= 0;
  v.nights ??= 0;
  v.reunionAt ??= 0;
  v.favors ??= 0;
  v.petitioned ??= false;
  v.owed ??= 0;
  v.sceneAt ??= 0;
  v.log ??= [];
  return v;
}
const V = aftermathState;
function log(g, text) { const v = V(g); v.log.push({ y: g.date.year, m: g.date.month, text }); if (v.log.length > 24) v.log.shift(); }
const wasSoldier = (g) => { const a = armyOf(g); return !!(a.veteran || a.battles > 0 || a.campaigns > 0 || a.scars.length); };
const mindScar = (g) => armyOf(g).scars.some((s) => SCARS[s.id]?.mind);
const bodyScars = (g) => armyOf(g).scars.filter((s) => !SCARS[s.id]?.mind);
const liveComrades = (g) => armyOf(g).comrades.filter((c) => c.alive);
export const drinkWord = (v) => (v >= 70 ? '술 없이는 하루도 못 버틴다' : v >= 40 ? '밤마다 술병을 찾는다' : v >= 15 ? '가끔 술로 잠을 청한다' : '');
const ruinWord = (d) => (d >= 70 ? '잿더미' : d >= 40 ? '반쯤 무너졌다' : d >= 10 ? '아직 그을음이 남았다' : '다시 섰다');
const widowsHere = (g) => V(g).widows.filter((w) => { const p = byId(g, w.pid); return alive(p) && !p.away && (p.place ?? 'ern') === here(g) && p.spouseId == null; });
const orphansHere = (g) => V(g).orphans.filter((o) => { const p = byId(g, o.pid); return alive(p) && !p.away && (p.place ?? 'ern') === here(g) && ageYears(p) < 15 && !(me(g).childIds ?? []).includes(p.id); });
const foreignHere = (g) => V(g).foreign.filter((f) => { const p = byId(g, f.pid); return alive(p) && (p.place ?? 'ern') === here(g); });

/* ---------- 화면용 ---------- */
export function aftermathInfo(g) {
  const v = V(g);
  const nameOf = (id) => { const p = byId(g, id); return p ? fullName(p) : '이름 모를 사람'; };
  return {
    atWar: Object.entries(WARS).filter(([, w]) => w.on(g)).map(([k, w]) => ({ key: k, name: w.name })),
    drafted: v.drafted.map((d) => ({ name: nameOf(d.pid), war: WARS[d.war]?.name ?? '전쟁', months: mi(g) - d.since, home: placeName(d.home) })),
    wars: v.wars.slice(-6).map((w) => ({ ...w, dead: [...w.dead], back: [...w.back], maimed: [...w.maimed], missing: [...w.missing] })),
    widows: v.widows.filter((w) => byId(g, w.pid)?.alive).map((w) => ({ name: nameOf(w.pid), husband: w.husband, war: w.war, y: w.y, remarried: byId(g, w.pid)?.spouseId != null })),
    orphans: v.orphans.filter((o) => byId(g, o.pid)?.alive).map((o) => ({ name: nameOf(o.pid), age: ageYears(byId(g, o.pid)), father: o.father, adopted: (me(g).childIds ?? []).includes(o.pid) })),
    missing: v.missing.map((x) => ({ name: nameOf(x.pid), war: x.war, y: x.y })),
    ruins: Object.entries(v.ruins).map(([pl, r]) => ({ place: pl, placeName: placeName(pl), damage: Math.round(r.damage), word: ruinWord(r.damage), war: r.war, helped: r.helped ?? 0 })),
    foreign: v.foreign.filter((f) => byId(g, f.pid)?.alive).map((f) => ({ name: nameOf(f.pid), from: f.from, placeName: placeName(byId(g, f.pid)?.place ?? f.place), affection: Math.round(byId(g, f.pid)?.affection ?? 0) })),
    drink: Math.round(v.drink), drinkWord: drinkWord(v.drink), nights: v.nights,
    soldier: wasSoldier(g), comrades: liveComrades(g).map((c) => c.name), fallen: armyOf(g).comrades.filter((c) => !c.alive).map((c) => c.name),
    petitioned: v.petitioned, favors: v.favors,
    log: v.log.slice(-8).map((x) => ({ ...x })),
  };
}

/* ---------- 징집과 귀향 ---------- */
function draftable(g) {
  const v = V(g);
  const taken = new Set(v.drafted.map((d) => d.pid));
  return living(g).filter((p) => !p.isPlayer && p.sex === 'm' && !p.away && !taken.has(p.id) && ageYears(p) >= 18 && ageYears(p) <= 40
    && realmOfPlace(p.place ?? 'ern') === 'leonia' && !['knight', 'knight_captain', 'count', 'bishop', 'court_mage', 'priest', 'child'].includes(p.job));
}
function draft(g, r, key) {
  const v = V(g);
  if (v.drafted.filter((d) => d.war === key).length >= 6) return;
  const pool = draftable(g);
  if (!pool.length) return;
  // 내 고장 사람을 먼저 데려간다
  const local = pool.filter((p) => (p.place ?? 'ern') === here(g));
  const p = r.pick(local.length && r.chance(0.7) ? local : pool);
  v.drafted.push({ pid: p.id, war: key, since: mi(g), home: p.place ?? 'ern' });
  p.away = true; p.drafted = key;
  const fam = (g.player.familyIds ?? []).includes(p.id) || me(g).spouseId === p.id || (me(g).childIds ?? []).includes(p.id);
  if (p.known || fam) g.news.unshift({ text: `${fam ? '우리 집 ' : ''}${J(p.name, '이/가')} 징집되어 ${WARS[key].name}에 끌려갔다.`, rel: fam ? 100 : 70 });
}
function warEnds(g, r, key) {
  const v = V(g);
  const w = WARS[key];
  const b = g.realm?.balhart, n = g.realm?.north;
  const outcome = key === 'balhart' ? ((b?.front ?? 0) >= 8 ? 'win' : (b?.front ?? 0) <= -8 ? 'lose' : 'truce') : key === 'north' ? (n?.fallen ? 'lose' : 'win') : 'truce';
  const rec = { key, name: w.name, y: g.date.year, outcome, back: [], dead: [], maimed: [], missing: [] };
  const deadP = outcome === 'lose' ? 0.32 : 0.22;
  for (const d of v.drafted.filter((x) => x.war === key)) {
    const p = byId(g, d.pid);
    if (!p) continue;
    delete p.drafted;
    if (!p.alive) { rec.dead.push(p.name); continue; }
    const x = r.next();
    if (x < deadP) {
      p.away = false; p.place = d.home;
      const wife = byId(g, p.spouseId);
      const kids = (p.childIds ?? []).map((id) => byId(g, id)).filter((k) => alive(k) && ageYears(k) < 15);
      kill(g, p, `${w.name}에서 전사`);
      rec.dead.push(p.name);
      if (alive(wife)) v.widows.push({ pid: wife.id, husband: p.name, war: w.name, y: g.date.year });
      for (const k of kids) v.orphans.push({ pid: k.id, father: p.name, war: w.name, y: g.date.year });
    } else if (x < deadP + 0.08) {
      v.missing.push({ pid: p.id, war: w.name, y: g.date.year });
      rec.missing.push(p.name);
    } else {
      p.away = false; p.place = d.home;
      if (x < deadP + 0.25) { p.maimed = r.pick(MAIMS); p.wealth = (p.wealth ?? 0) - 10; rec.maimed.push(`${p.name}(${p.maimed})`); remember(g, p, `${w.name}에서 ${J(p.maimed, '을/를')} 잃고 돌아왔다`, -1, { tag: 'aftermath' }); }
      else rec.back.push(p.name);
      p.warVet = w.name;
    }
  }
  v.drafted = v.drafted.filter((x) => x.war !== key);
  v.wars.push(rec);
  if (v.wars.length > 8) v.wars.shift();
  // 불탄 고장
  if (outcome === 'lose' || (key === 'north' && r.chance(0.5)) || r.chance(0.3)) {
    const pl = realmOfPlace(here(g)) === 'leonia' && r.chance(0.35) ? here(g) : r.pick(FRONTIER);
    v.ruins[pl] = { damage: r.int(55, 90), war: w.name, y: g.date.year, helped: 0 };
    chron(g, `${w.name} 끝에 ${placeName(pl)}${jo(placeName(pl), '이/가')} 불타다.`, 40);
    g.news.unshift({ text: `${placeName(pl)}${jo(placeName(pl), '이/가')} 전쟁 끝에 불탔다고 한다. 집 절반이 재가 되었다.`, rel: pl === here(g) ? 100 : 80 });
  }
  // 적국에서 흘러온 사람
  if (key === 'balhart' && r.chance(0.65)) {
    const pl = realmOfPlace(here(g)) === 'leonia' ? here(g) : 'ern';
    const p = makePerson(r, { ageMonths: r.int(22, 45) * 12, job: r.pick(['laborer', 'smith', 'farmer', 'carpenter']) });
    p.place = pl; p.known = true; p.affection = r.int(-5, 10); p.foreign = w.enemy;
    p.history.push({ y: g.date.year, m: g.date.month, text: `${w.enemy}에서 흘러와 ${placeName(pl)}에 자리를 잡았다.` });
    g.people.push(p); rel(p);
    v.foreign.push({ pid: p.id, from: w.enemy, place: pl, y: g.date.year });
  }
  log(g, `${w.name}이 끝났다. 돌아온 사람 ${rec.back.length + rec.maimed.length}, 돌아오지 못한 사람 ${rec.dead.length + rec.missing.length}.`);
  const touched = rec.back.length + rec.dead.length + rec.maimed.length + rec.missing.length;
  if (touched && realmOfPlace(here(g)) === 'leonia' && playerAge(g) >= 6 && !sceneQueued(g, 'aftermath_return')) queueScene(g, 'aftermath_return', { war: w.name, outcome, back: rec.back, dead: rec.dead, maimed: rec.maimed, missing: rec.missing });
}
const OUTCOME = { win: '이겼다고들 한다', lose: '졌다', truce: '아무도 이기지 못했다' };
defineScene('aftermath_return', {
  title: () => '돌아온 사람들',
  text: (g, s) => {
    const parts = [`${s.war}이 끝났다. ${OUTCOME[s.outcome]}. 마을 어귀에 사람들이 모여 길 끝을 보았다.`];
    if (s.back.length) parts.push(`${s.back.join(', ')}. 살아서 돌아왔다. 말수가 줄었다.`);
    if (s.maimed.length) parts.push(`${s.maimed.join(', ')}. 돌아오긴 했다.`);
    if (s.dead.length) parts.push(`${s.dead.join(', ')}. 이름만 돌아왔다.`);
    if (s.missing.length) parts.push(`${s.missing.join(', ')}. 아무도 소식을 모른다.`);
    return parts.join('\n');
  },
  choices: (g) => [canSpend(g, 5) ? { label: '위령제를 열자고 나선다 (은화 5닢)', key: 'rite' } : null, playerAge(g) >= 15 ? { label: '돌아온 이들과 밤새 술을 마신다', key: 'drink' } : null, { label: '조용히 집으로 돌아간다', key: 'quiet' }].filter(Boolean),
  resolve(g, rng, s, key) {
    if (key === 'rite') {
      if (!spend(g, 5)) return '위령제를 열 돈이 없었다. 대신 이름들을 하나씩 소리 내어 불렀다.';
      deed(g, 'kind', 3, '전사자들 위령제를 연 사람이라더라');
      const r = villageState(g).places?.[here(g)];
      if (r) r.belong = clamp((r.belong ?? 0) + 6, 0, 100);
      stress(g, -6);
      return `향을 피우고 ${s.dead.length ? s.dead.join(', ') : '돌아오지 못한 사람들'}의 이름을 불렀다. 과부들이 울었다. 아이들은 왜 우는지 몰라 따라 울었다.`;
    }
    if (key === 'drink') { V(g).drink = clamp(V(g).drink + 4, 0, 100); stress(g, -5); return '돌아온 사람들은 전장 이야기를 하지 않았다. 고향 이야기만 했다. 새벽녘 하나가 갑자기 울기 시작했고, 아무도 이유를 묻지 않았다.'; }
    return '집으로 돌아왔다. 문을 닫아도 마을 어귀의 울음소리가 들렸다.';
  },
});

/* ---------- 불탄 마을 다시 세우기 ---------- */
ACTIONS.push({
  id: 'aftermath_rebuild', name: '불탄 마을 다시 세우기', icon: 'labor',
  desc: '전쟁에 불탄 고장에서 무너진 집을 치우고 다시 세운다. 고단하지만 고장 사람들이 기억한다.',
  available: (g) => ready(g) && playerAge(g) >= 14 && (V(g).ruins[here(g)]?.damage ?? 0) > 0,
  run(g) {
    const v = V(g);
    const r = v.ruins[here(g)];
    if (!r || r.damage <= 0) return '불탄 자리는 이미 다 치워져 있었다.';
    const n = 3 + g.player.stats.str / 25 + (L(g).houses?.includes(here(g)) ? 1 : 0);
    r.damage = Math.max(0, r.damage - n);
    r.helped = (r.helped ?? 0) + 1;
    tired(g, 18);
    gainStat(g, 'str', 0.3);
    const vr = villageState(g).places?.[here(g)];
    if (vr) vr.belong = clamp((vr.belong ?? 0) + 1.5, 0, 100);
    if (r.helped % 4 === 1) deed(g, 'kind', 1, '불탄 마을을 다시 세우는 데 손을 보탰다더라');
    if (r.damage <= 0) {
      chron(g, `${placeName(here(g))}${jo(placeName(here(g)), '이/가')} ${r.war}의 잿더미에서 다시 서다.`, 40);
      L(g).renown = (L(g).renown ?? 0) + 2;
      log(g, `${placeName(here(g))}${jo(placeName(here(g)), '이/가')} 다시 섰다.`);
      return '마지막 지붕에 이엉을 얹었다. 연기 대신 밥 짓는 냄새가 올라왔다. 마을 사람들이 나무 그늘 아래서 술동이를 열었다. 내 몫의 잔이 있었다.';
    }
    return rngLine(r.helped, ['그을린 들보를 끌어내고 잿더미를 수레에 실었다. 손바닥이 까맣게 됐다.', '이웃들과 흙벽을 다시 쌓았다. 아무도 말하지 않았지만, 다들 같은 집을 떠올리고 있었다.', '불탄 우물을 퍼냈다. 바닥에서 녹은 숟가락이 나왔다.', '새 기둥을 세웠다. 아이들이 기둥에 키를 재고 금을 그었다.']);
  },
});
const rngLine = (n, arr) => arr[n % arr.length];

/* ---------- 과부와 고아 ---------- */
ACTIONS.push({
  id: 'aftermath_aid', name: '전쟁 과부와 고아 돕기', icon: 'heart',
  desc: '전쟁에서 남편과 아버지를 잃은 집을 찾아간다. 은화를 건네거나, 밭일을 거들거나, 아이를 거둔다.',
  available: (g) => ready(g) && playerAge(g) >= 15 && !sceneQueued(g, 'aftermath_aid') && (widowsHere(g).length + orphansHere(g).length) > 0,
  run(g) { queueScene(g, 'aftermath_aid', {}); return '전사자 집이 모여 있는 골목으로 갔다.'; },
});
defineScene('aftermath_aid', {
  title: () => '남은 사람들',
  text: (g) => {
    const w = widowsHere(g).map((x) => `${byId(g, x.pid).name}(${x.husband}의 아내)`);
    const o = orphansHere(g).map((x) => `${byId(g, x.pid).name}(${ageYears(byId(g, x.pid))}살, ${x.father}의 아이)`);
    return `${w.length ? `과부 ${w.join(', ')}. ` : ''}${o.length ? `아버지 없는 아이 ${o.join(', ')}.` : ''} 전쟁은 끝났다고 하는데, 이 골목에서는 아직 끝나지 않았다.`;
  },
  choices: (g) => {
    const out = [];
    const w = widowsHere(g)[0], o = orphansHere(g)[0];
    if (!w && !o) return [];
    if (w && canSpend(g, 10)) out.push({ label: `${byId(g, w.pid).name}에게 은화 열 닢을 건넨다`, key: `money:${w.pid}` });
    if (w) out.push({ label: `${byId(g, w.pid).name}의 밭일을 거든다`, key: `work:${w.pid}` });
    const k = kinState(g);
    if (o && playerAge(g) >= 17 && (k.adopted ?? 0) < 3) out.push({ label: `${J(byId(g, o.pid).name, '을/를')} 내 자식으로 거둔다`, key: `adopt:${o.pid}` });
    out.push({ label: '그냥 돌아선다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '골목 끝에서 발을 돌렸다. 내가 무엇을 할 수 있겠는가. 그 물음이 집까지 따라왔다.';
    const [k, id] = key.split(':');
    const p = byId(g, Number(id));
    if (!alive(p) || (p.place ?? 'ern') !== here(g)) return '그 집은 이미 다른 고장으로 떠났다.';
    if (k === 'money') {
      if (!spend(g, 10)) return '건넬 돈이 없었다.';
      p.affection = clamp((p.affection ?? 0) + 15, -100, 100); p.wealth = (p.wealth ?? 0) + 10;
      remember(g, p, '남편을 잃었을 때 은화를 건넸다', 2, { tag: 'aftermath' });
      deed(g, 'generous', 2, '전쟁 과부를 도왔다더라');
      return `${J(p.name, '은/는')} 은화를 받고 한참 고개를 들지 못했다. "그이가 늘 말하던 대로네요. 이 마을은 서로를 버리지 않는다고."`;
    }
    if (k === 'work') {
      tired(g, 15);
      p.affection = clamp((p.affection ?? 0) + 10, -100, 100);
      remember(g, p, '밭일을 거들어 주었다', 1, { tag: 'aftermath' });
      deed(g, 'kind', 2, null);
      return `하루 종일 ${p.name}네 밭을 갈았다. 아이들이 물을 날라 왔다. 해 질 녘 ${J(p.name, '이/가')} 감자 한 바구니를 들려 보냈다.`;
    }
    const kk = kinState(g);
    if (playerAge(g) < 17 || (kk.adopted ?? 0) >= 3 || ageYears(p) >= 15) return '지금 형편으로는 아이를 거둘 수 없었다.';
    const meP = me(g);
    const sp = byId(g, meP.spouseId);
    meP.childIds.push(p.id);
    if (alive(sp)) sp.childIds.push(p.id);
    if (!g.player.familyIds.includes(p.id)) g.player.familyIds.push(p.id);
    p.adopted = true; p.known = true; p.affection = clamp((p.affection ?? 0) + 20, -100, 100); p.place = here(g);
    kk.adopted = (kk.adopted ?? 0) + 1;
    chron(g, `${g.player.name}, 전쟁 고아 ${J(p.name, '을/를')} 거두다.`, 50);
    note(g, `전쟁 고아 ${J(p.name, '을/를')} 거두었다.`);
    stress(g, -6);
    return `${J(p.name, '은/는')} 아버지가 쓰던 칼집 하나를 안고 따라왔다. 그 칼집은 지금도 그 아이 베개 밑에 있다.`;
  },
});
defineScene('aftermath_widow', {
  title: () => '과부의 부탁',
  text: (g, s) => `${J(byId(g, s.pid)?.name ?? '과부', '이/가')} 문 앞에 서 있다. ${s.husband}의 아내다. "지붕이 새요. 그이가 있었으면 벌써 고쳤을 텐데." 아이 둘이 치마 뒤에 숨어 있다.`,
  choices: (g, s) => { const p = byId(g, s.pid); if (!alive(p) || (p.place ?? 'ern') !== here(g)) return []; return [{ label: '지붕을 고쳐 준다', key: 'roof' }, canSpend(g, 6) ? { label: '은화 여섯 닢으로 이엉을 사 준다', key: 'pay' } : null, { label: '형편이 안 된다고 말한다', key: 'no' }].filter(Boolean); },
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid);
    if (!alive(p)) return '그 집은 이미 비어 있었다.';
    if (key === 'no') { p.affection = clamp((p.affection ?? 0) - 3, -100, 100); return `${J(p.name, '은/는')} 고개를 끄덕이고 돌아갔다. 원망하는 얼굴은 아니었다. 그래서 더 무거웠다.`; }
    if (key === 'pay') { if (!spend(g, 6)) return '줄 돈이 없었다.'; p.affection = clamp((p.affection ?? 0) + 10, -100, 100); deed(g, 'generous', 1, null); return '이엉 값을 쥐여 주었다. 며칠 뒤 그 집 지붕에 새 짚이 얹혀 있었다.'; }
    tired(g, 12); p.affection = clamp((p.affection ?? 0) + 14, -100, 100); remember(g, p, '지붕을 고쳐 주었다', 2, { tag: 'aftermath' }); deed(g, 'kind', 2, null);
    return '사다리를 걸치고 반나절 지붕에 올라 있었다. 내려오니 아이들이 내 손에 묻은 짚을 하나씩 떼어 주었다.';
  },
});

/* ---------- 적국 출신 이웃 ---------- */
defineScene('aftermath_foreigner', {
  title: () => '돌 든 손',
  text: (g, s) => { const p = byId(g, s.pid); return `장터에서 사람들이 ${J(p?.name ?? '그 사내', '을/를')} 에워쌌다. ${s.from}에서 흘러온 사람이다. "네놈들이 내 아들을 죽였어." 누군가 돌을 집어 들었다. ${J(p?.name ?? '그 사내', '은/는')} 손을 들어 머리만 가렸다.`; },
  choices: (g, s) => { const p = byId(g, s.pid); if (!alive(p) || (p.place ?? 'ern') !== here(g)) return []; return [{ label: '사이에 막아선다', key: 'stand' }, { label: '같이 돌을 든다', key: 'stone' }, { label: '못 본 척 지나간다', key: 'pass' }]; },
  resolve(g, rng, s, key) {
    const p = byId(g, s.pid);
    if (!alive(p)) return '그 사람은 이미 고장을 떠났다.';
    if (key === 'stand') {
      p.affection = clamp((p.affection ?? 0) + 25, -100, 100);
      remember(g, p, '돌팔매에서 막아 주었다', 3, { tag: 'aftermath' });
      deed(g, 'brave', 3, '적국 사람 편을 들었다더라');
      const vr = villageState(g).places?.[here(g)];
      if (vr) vr.belong = clamp((vr.belong ?? 0) - 3, 0, 100);
      if (!check(rng, g.player.stats.cha * 0.5 + g.player.stats.str * 0.3, 45)) { g.player.injuries.push({ name: '이마에 맞은 돌', months: 1 }); return `두 팔을 벌리고 섰다. 날아온 돌 하나가 내 이마를 쳤다. 피를 보자 사람들이 하나둘 흩어졌다. ${J(p.name, '은/는')} 내 이마를 천으로 눌러 주며 자기 나라 말로 무언가 중얼거렸다.`; }
      return `"이 사람이 그 칼을 들었소?" 아무도 대답하지 않았다. 돌이 하나둘 땅에 떨어졌다. ${J(p.name, '은/는')} 그날 저녁 우리 집 문 앞에 장작을 한 짐 쌓아 두고 갔다.`;
    }
    if (key === 'stone') {
      p.affection = clamp((p.affection ?? 0) - 40, -100, 100);
      addGrudge(g, p, 30, '마을 사람들과 함께 돌을 던졌다');
      deed(g, 'kind', -4, null);
      if (rng.chance(0.4)) { p.place = rng.pick(['leocast', 'harfen', 'barka']); log(g, `${J(p.name, '은/는')} 고장을 떠났다.`); return `돌이 날았다. 그 사람은 피를 흘리며 달아났다. 다음 날 그 집은 비어 있었다. 장터는 이긴 사람들처럼 떠들썩했다. 이상하게 이긴 기분이 들지 않았다.`; }
      return '돌이 날았다. 그 사람은 끝까지 맞서지 않았다. 피 묻은 손으로 땅을 짚고 일어나 절뚝이며 집으로 갔다. 다음 날도 그 사람은 장터에 나왔다.';
    }
    return '고개를 돌리고 지나갔다. 뒤에서 둔한 소리가 몇 번 들렸다.';
  },
});

/* ---------- 내가 싸웠던 사람이면: 악몽과 술 ---------- */
defineScene('aftermath_night', {
  title: () => '밤의 전장',
  text: (g) => `${mindScar(g) ? '또 그 꿈이다. ' : ''}눈을 뜨면 이불이 땀에 젖어 있다. 귀에서 북소리가 그치지 않는다. 진흙, 비명, 이름을 부르던 목소리.${liveComrades(g).length || armyOf(g).comrades.length ? ` ${armyOf(g).comrades.find((c) => !c.alive)?.name ?? '누군가'}의 얼굴이 어둠 속에 떠 있다.` : ''}${V(g).drink >= 40 ? ' 부엌 찬장에 술병이 있다는 걸 몸이 먼저 안다.' : ''}`,
  choices: (g) => {
    if (!ready(g)) return [];
    const out = [{ label: '술병을 연다', key: 'drink' }, { label: '밖에 나가 새벽까지 걷는다', key: 'walk' }];
    if ((faithState(g).devotion ?? 0) >= 15) out.push({ label: '무릎을 꿇고 기도한다', key: 'pray' });
    if (byId(g, me(g).spouseId)?.alive) out.push({ label: '곁에 누운 사람을 깨운다', key: 'wake' });
    return out;
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    v.nights += 1;
    if (key === 'drink') {
      stress(g, -8); v.drink = clamp(v.drink + 9, 0, 100); v.dryMonths = 0;
      if (g.player.money >= 1) g.player.money -= 1;
      return v.drink >= 60 ? '한 병을 비우고 두 병째를 땄다. 아침에 눈을 뜨니 식구들이 말없이 빈 병을 치우고 있었다.' : '목이 타도록 마셨다. 꿈은 오지 않았다. 대신 머리가 깨질 듯 아팠다.';
    }
    if (key === 'walk') { stress(g, -3); tired(g, 6); return '맨발로 마당을 나섰다. 새벽 안개 속에서 개 한 마리가 따라왔다. 해가 뜰 때까지 걸었다. 해가 뜨면 조금 낫다.'; }
    if (key === 'pray') { stress(g, -5); const f = faithState(g); f.devotion = clamp((f.devotion ?? 0) + 1, 0, 100); return `돌아오지 못한 이름들을 하나씩 불렀다. 신은 대답하지 않았다. 그래도 이름을 부르고 나면 잠이 왔다.`; }
    const sp = byId(g, me(g).spouseId);
    const ls = loveState(g).spouse;
    if (ls) ls.mood = clamp((ls.mood ?? 50) + 3, 0, 100);
    stress(g, -6);
    return `${J(sp?.name ?? '곁의 사람', '은/는')} 아무것도 묻지 않았다. 등을 토닥이며 해 뜰 때까지 깨어 있어 주었다.`;
  },
});
ACTIONS.push({
  id: 'aftermath_sober', name: '술 끊기', icon: 'meditate',
  desc: '술병을 치운다. 밤이 길어지고, 손이 떨린다. 의지가 버텨 내야 한다.',
  available: (g) => ready(g) && V(g).drink >= 25,
  run(g, rng) {
    const v = V(g);
    tired(g, 8);
    if (check(rng, g.player.stats.wil * 0.7 + v.dryMonths * 6 - v.drink * 0.3, 30)) {
      v.drink = Math.max(0, v.drink - 18); v.dryMonths += 1; stress(g, 5);
      gainStat(g, 'wil', 0.4);
      return v.drink < 15 ? '술병을 모두 우물가에 깨뜨렸다. 손은 아직 가끔 떨린다. 그래도 아침이 온다.' : '한 달을 버텼다. 밤마다 찬장 문 앞에서 돌아섰다.';
    }
    v.drink = clamp(v.drink + 3, 0, 100); stress(g, 8);
    return '사흘을 버티고 나흘째 밤에 다시 병을 땄다. 첫 모금이 넘어갈 때 부끄러움도 같이 넘어갔다.';
  },
});

/* ---------- 전우의 모임과 부탁 ---------- */
const FAVORS = {
  loan: { text: (n) => `${J(n, '이/가')} 술잔을 내려놓고 낮게 말했다. "은화 열다섯 닢만 빌려주게. 대장간을 다시 열려는데 모루가 없어."`, cost: 15 },
  mother: { text: (n, f) => `${J(n, '이/가')} 말했다. "${f}의 어머니가 아직 살아 계시네. 아들이 어떻게 죽었는지 아무도 말해 주지 않았대. 자네가 가 주겠나? 자네가 마지막에 곁에 있었잖나."`, cost: 0 },
  deserter: { text: (n) => `${J(n, '이/가')} 문을 닫고 속삭였다. "탈영병 하나가 우리 백인대 출신이야. 헌병이 쫓고 있네. 며칠만 숨겨 주게."`, cost: 0 },
  son: { text: (n) => `${J(n, '이/가')} 쑥스럽게 웃었다. "아들놈이 일자리를 못 구해. 자네가 아는 데 있으면 한마디만 넣어 주게."`, cost: 0 },
};
defineScene('aftermath_reunion', {
  title: () => '전우들',
  text: (g, s) => `해마다 이맘때면 그 전장에 있던 사람들이 주점 뒷방에 모인다. 올해는 ${s.names.join(', ')}. 빈 의자에는 ${s.fallen || '돌아오지 못한 사람들'}의 잔이 놓였다.\n${FAVORS[s.favor].text(s.asker, s.fallen || '죽은 전우')}`,
  choices: (g, s) => {
    if (!ready(g)) return [];
    const f = FAVORS[s.favor];
    return [
      f.cost ? (canSpend(g, f.cost) ? { label: `은화 ${f.cost}닢을 빌려준다`, key: 'yes' } : null) : { label: '부탁을 들어준다', key: 'yes' },
      { label: '정중히 거절한다', key: 'no' },
    ].filter(Boolean);
  },
  resolve(g, rng, s, key) {
    const v = V(g);
    stress(g, -8);
    v.drink = clamp(v.drink + 2, 0, 100);
    if (key === 'no') return `"그래, 자네 형편도 있겠지." ${J(s.asker, '은/는')} 웃었지만, 그 뒤로 잔을 부딪칠 때 눈을 맞추지 않았다.`;
    v.favors += 1;
    deed(g, 'loyal', 2, null);
    if (s.favor === 'loan') {
      if (!spend(g, 15)) return '빌려줄 돈이 모자랐다. 있는 대로 털어 주었다.';
      if (rng.chance(0.6)) v.owed = (v.owed ?? 0) + 15;
      return `은화를 건넸다. ${J(s.asker, '은/는')} 내 손을 꽉 쥐었다. "모루 첫 소리는 자네 이름으로 내겠네."`;
    }
    if (s.favor === 'mother') { tired(g, 10); stress(g, 4); return `그 어머니는 내 손을 잡고 아무 말 없이 들었다. 그 애가 마지막에 엄마를 불렀다고 말했다. 사실인지는 나도 모른다. 그 말을 하고 나니 둘 다 조금 살 것 같았다.`; }
    if (s.favor === 'deserter') {
      if (rng.chance(0.3)) { reportCrime(g, 'resist', here(g), { mult: 0.4 }); return '헛간에 사흘을 숨겨 주었다. 나흘째 헌병이 왔다. 그는 뒷문으로 달아났고, 내 이름은 헌병 장부에 남았다.'; }
      return '헛간에 사흘을 숨겨 주었다. 나흘째 새벽, 그는 빈 그릇만 남기고 사라졌다. 그릇 밑에 "고맙네"라고 적힌 쪽지가 있었다.';
    }
    L(g).renown = (L(g).renown ?? 0) + 1;
    return `아는 공방에 말을 넣었다. 한 달 뒤 ${s.asker}의 아들이 망치를 들고 일하는 걸 보았다. 아비와 똑같이 왼손잡이였다.`;
  },
});
ACTIONS.push({
  id: 'aftermath_petition', name: '상이군인 청원', icon: 'scroll',
  desc: '전쟁에서 얻은 상처를 증명하고 영주에게 상이군인 연금을 청한다. 한 번뿐이다.',
  available: (g) => ready(g) && playerAge(g) >= 16 && !V(g).petitioned && bodyScars(g).length > 0 && ['leocast', 'harfen', 'verden'].includes(here(g)),
  run(g, rng) {
    const v = V(g), a = armyOf(g);
    v.petitioned = true;
    tired(g, 6);
    const ok = check(rng, g.player.stats.cha * 0.4 + a.medals.length * 12 + bodyScars(g).length * 10, 40);
    if (!ok) { stress(g, 8); return `서기는 내 ${J(bodyScars(g)[0].name, '을/를')} 힐끗 보고 서류를 밀어냈다. "증인이 둘 있어야 하오." 증인은 둘 다 그 전장에 묻혀 있다.`; }
    const add = 2 + bodyScars(g).length;
    if (a.veteran) a.veteran.pension = (a.veteran.pension ?? 0) + add;
    else a.veteran = { rank: a.service?.rank ?? 0, years: 1, unit: a.service?.unit ?? '이름 없는 부대', year: g.date.year, pension: add };
    log(g, `상이군인 연금이 달마다 은화 ${add}닢 늘었다.`);
    return `서기가 오래 서류를 들여다보다 도장을 찍었다. 달마다 은화 ${add}닢이 더 나온다. ${bodyScars(g)[0].name}의 값이다.`;
  },
});

/* ---------- 한 달 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player || L(g).heirPending) return;
  const v = V(g);
  const r = ownRng(g, 3);
  const now = mi(g);
  // 1) 전쟁이 시작되고 끝난다
  for (const [key, w] of Object.entries(WARS)) {
    const on = w.on(g);
    if (on && !v.seen[key]) log(g, `${w.name}이 시작되었다.`);
    if (on && r.chance(key === 'civil' ? 0.08 : 0.14)) draft(g, r, key);
    if (!on && v.seen[key]) warEnds(g, r, key);
    v.seen[key] = on;
  }
  // 전쟁터에서 죽은 사람 (전쟁이 길어지면)
  for (const d of v.drafted) {
    const p = byId(g, d.pid);
    if (alive(p) && now - d.since > 6 && r.chance(0.01)) {
      const fam = (g.player.familyIds ?? []).includes(p.id) || me(g).spouseId === p.id || (me(g).childIds ?? []).includes(p.id);
      const wife = byId(g, p.spouseId);
      const kids = (p.childIds ?? []).map((id) => byId(g, id)).filter((k) => alive(k) && ageYears(k) < 15);
      kill(g, p, `${WARS[d.war]?.name ?? '전쟁'}에서 전사`);
      if (alive(wife)) v.widows.push({ pid: wife.id, husband: p.name, war: WARS[d.war]?.name ?? '전쟁', y: g.date.year });
      for (const k of kids) v.orphans.push({ pid: k.id, father: p.name, war: WARS[d.war]?.name ?? '전쟁', y: g.date.year });
      if (p.known || fam) g.news.unshift({ text: `전사 통지가 왔다. ${fam ? '우리 집 ' : ''}${J(p.name, '이/가')} 전장에서 쓰러졌다.`, rel: fam ? 100 : 75 });
    }
  }
  // 2) 행방을 모르던 사람이 돌아온다
  for (const x of [...v.missing]) {
    const p = byId(g, x.pid);
    if (!alive(p)) { v.missing = v.missing.filter((y) => y !== x); continue; }
    if (r.chance(0.008)) {
      v.missing = v.missing.filter((y) => y !== x);
      p.away = false; p.place = p.place ?? 'ern'; p.warVet = x.war;
      if (p.known) g.news.unshift({ text: `죽은 줄 알았던 ${J(p.name, '이/가')} ${g.date.year - x.y}년 만에 돌아왔다. 포로로 잡혀 있었다고 한다. 아무도 그 사람을 처음엔 알아보지 못했다.`, rel: 90 });
      log(g, `${J(p.name, '이/가')} 돌아왔다.`);
    }
  }
  // 3) 불탄 고장은 천천히 다시 선다
  for (const [pl, x] of Object.entries(v.ruins)) {
    x.damage = Math.max(0, x.damage - 0.4);
    if (x.damage <= 0 && g.date.year - x.y > 2) delete v.ruins[pl];
  }
  // 4) 술
  if (v.drink > 0) {
    v.dryMonths += 1;
    v.drink = Math.max(0, v.drink - (v.dryMonths > 2 ? 1 : 0.3));
    if (v.drink >= 40) {
      const cost = Math.min(g.player.money, r.int(1, 3));
      g.player.money -= cost;
      if (v.dryMonths > 1) stress(g, 2);
      const ls = loveState(g).spouse;
      if (ls && r.chance(0.3)) ls.mood = clamp((ls.mood ?? 50) - 2, 0, 100);
    }
  }
  // 빌려준 돈이 돌아온다
  if ((v.owed ?? 0) > 0 && r.chance(0.05)) { g.player.money += v.owed; g.news.unshift({ text: `전우가 빌려 간 은화 ${v.owed}닢을 갚으러 왔다. 모루 소리가 좋다고 했다.`, rel: 70 }); v.owed = 0; }
  // 5) 장면
  if (!ready(g)) return;
  if (L(g).queue.some((x) => /^aftermath_/.test(x.kind)) || L(g).queue.length > 2 || now - v.sceneAt < 4) return;
  const fire = (kind, data) => { v.sceneAt = now; queueScene(g, kind, data); };
  if (wasSoldier(g) && playerAge(g) >= 15 && !armyOf(g).campaign && r.chance((mindScar(g) ? 0.1 : 0.03) + v.drink / 500)) return fire('aftermath_night', {});
  const comrades = liveComrades(g);
  if (comrades.length && wasSoldier(g) && !armyOf(g).campaign && now - v.reunionAt >= 12 && r.chance(0.12)) {
    v.reunionAt = now;
    const fallen = armyOf(g).comrades.find((c) => !c.alive)?.name ?? '';
    const favors = Object.keys(FAVORS).filter((k) => k !== 'mother' || fallen);
    return fire('aftermath_reunion', { names: comrades.slice(0, 4).map((c) => c.name), asker: r.pick(comrades).name, fallen, favor: r.pick(favors) });
  }
  const fh = foreignHere(g).filter((f) => g.date.year - f.y < 8);
  if (fh.length && r.chance(0.04)) { const f = r.pick(fh); return fire('aftermath_foreigner', { pid: f.pid, from: f.from }); }
  const wh = widowsHere(g);
  if (wh.length && playerAge(g) >= 15 && r.chance(0.03)) { const w = r.pick(wh); return fire('aftermath_widow', { pid: w.pid, husband: w.husband }); }
});

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g) => {
  const v = V(g);
  if (v.drink >= 40) v.log.push({ y: g.date.year, m: g.date.month, text: '선대는 전쟁 뒤로 술을 끊지 못했다. 빈 술병이 창고에 가득하다.' });
  v.drink = 0; v.dryMonths = 0; v.nights = 0; v.petitioned = false; v.reunionAt = 0; v.favors = 0; v.owed = 0;
  v.sceneAt = 0;
  // 내가 된 사람은 과부·고아 명부에서 뺀다
  v.widows = v.widows.filter((w) => w.pid !== g.player.id);
  v.orphans = v.orphans.filter((o) => o.pid !== g.player.id);
});
HOOKS.newGame.push((g) => { V(g); });
HOOKS.migrate.push((g) => { V(g); });
