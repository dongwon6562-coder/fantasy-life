// 32단계: 내 나라 세우기. 상태는 g.founding 하나, 화면 연결점은 foundingLines(g) / foundingLine(g) / foundingInfo(g).
// - 땅이 먼저다. 내 영지(domain), 내가 촌장인 개척촌(frontier, 개척촌 이상), 내가 앞장서 이긴 봉기의 고장(revolt orders.mine) 가운데 하나.
//   그 위에 따르는 사람(영민 300↑), 군사(40↑, 내 용병단도 센다), 돈(은화 500↑), 명분(50↑: 이름값·왕가의 피·봉기·주인 없던 땅·주군의 박대·어지러운 시절), 나이 20살↑.
//   다 갖추어야 '나라를 세운다' 행동이 보인다. 두셋만 모자라면 가끔 수군거리는 한 줄이 모자란 것을 알려 준다.
// - 선포(found_declare): 공국 또는 왕국. 땅은 domain으로 이어진다(영지가 없던 개척촌·봉기 고장은 nation 영지로 새로 받는다).
//   주군이 있던 영지면 주군과 옛 주인 나라는 반역으로 보고 군대를 보낸다.
// - 그 뒤 몇 달에 걸쳐: 나라 이름(found_name), 왕조 이름(found_dynasty), 신하(found_council), 법(found_law), 첫 세금(found_tax),
//   수도와 궁(found_capital), 교단의 대관(found_crown: 무릎 꿇고 받기·스스로 쓰기·옛 신앙의 사제), 이웃 나라 사절(found_envoy: 인정·공물·거부).
// - 전쟁(BATTLE_OUTS.founding): 옛 주인이나 날 선 이웃이 쳐들어온다. 수도에 있으면 직접 싸우고, 없으면 성의 병사들이 싸운다.
// - 매달: 정통성(legit)과 안정(stab)이 움직인다. 신하의 음모(found_plot), 집안들의 청(found_petition), 다른 왕을 내세우는 자(found_pretender).
//   공국이 커지면 왕을 칭할 수 있다(found_raise). 정통성과 안정이 함께 바닥이거나 전쟁에서 밀리면 나라가 무너진다(found_fall).
// - 대 잇기: 왕위가 이어진다. 정통성은 대를 넘을수록 굳고, 이은 자의 형제가 왕좌를 넘보기도 한다(found_succession).
// - 플레이어 없이도: 드물게 개척촌·봉기 고장·먼 나라의 변방에서 누군가 새 나라를 세우고, 대부분은 몇 해 못 가 무너진다.
// domain(살림·작위·병사)·frontier·revolt·company·claim(남의 왕좌)·court(레오니아 궁정)·politics(기존 나라 사이)는 읽기만 하고,
// 땅을 nation 영지로 바꾸는 것과 봉기 질서를 닫는 것만 손댄다. 게임 난수는 건드리지 않는다(ownRng).
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge } from '../game.js';
import { byId, ageYears } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, traveling, note, chron, stress, tired, check } from '../adventure/core.js';
import { rel } from '../relations.js';
import { isJailed } from '../crime.js';
import { makeRng } from '../rng.js';
import { D, grantFief, NATION_KIND, NATION_TITLES } from '../domain/state.js';
import { ARMIES, queueBattle, BATTLE_OUTS, leadership } from '../war/battle.js';
import { REALMS } from '../realms/data.js';
import { realmPersonName } from '../realms/index.js';
import { faithState } from '../faith/index.js';
import { pnews } from '../politics/state.js';
import { atWar } from '../world.js';
import * as T from './lines.js';

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const short = (id) => REALMS[id]?.short ?? '이웃';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 173) ^ Math.imul(mi(g) * 163 + salt + 41, 2654435761)) | 0 });
function personName(rng, realm, sex, taken = []) {
  for (let k = 0; k < 6; k++) {
    const nm = REALMS[realm] && realm !== 'leonia' ? realmPersonName(rng, realm, sex) : null;
    const first = nm?.name ?? rng.pick(sex === 'f' ? T.LEONIA_F : T.LEONIA_M);
    const last = nm?.lastName ?? rng.pick(T.NOBLE_HOUSES);
    if (!taken.includes(first) || k === 5) return { name: first, lastName: last, full: `${first} ${last}` };
  }
}
const realmOfPlace = (pl) => PLACES[pl]?.realm ?? (pl === 'estella' ? 'wild' : 'leonia');

export const NEED = { folk: 300, troops: 40, money: 500, cause: 50, age: 20 };
const NEED_WORD = { folk: '따르는 사람', troops: '군사', money: '돈', cause: '명분', age: '나이' };
export const DECLARE_COST = 300;
const KIND_WORD = (k) => NATION_KIND[k >= 3 ? 3 : 2];
const RULER_WORD = (k) => NATION_TITLES[k >= 3 ? 3 : 2];

// 땅의 옛 주인 나라에서 보이는 이웃
const NEIGH = {
  leonia: ['leonia', 'valhart', 'holy', 'free'], wild: ['march', 'dwarf', 'leonia'], march: ['march', 'leonia', 'dwarf', 'valhart'],
  valhart: ['valhart', 'leonia', 'march'], elf: ['elf', 'leonia', 'serenia'], beast: ['beast', 'leonia', 'holy'],
  dwarf: ['dwarf', 'march', 'valhart'], holy: ['holy', 'leonia', 'beast'], free: ['free', 'leonia', 'serenia'], serenia: ['serenia', 'leonia', 'free'],
};
// 쳐들어올 때의 병력
const POWER = { leonia: 90, valhart: 120, holy: 70, serenia: 50, free: 55, march: 75, elf: 60, dwarf: 80, beast: 70 };
for (const id of Object.keys(POWER)) ARMIES[`found_${id}`] ??= { name: id === 'free' ? '자유도시의 용병군' : `${short(id)}의 군대`, q: id === 'valhart' ? 60 : id === 'dwarf' ? 58 : 48, champ: 60, champName: `${short(id)}의 기사`, foe: 'bandit_chief' };

const ROLES = { chancellor: '재상', marshal: '원수', treasurer: '재무관', priest: '궁정 사제' };
export const LAWS = {
  old: { name: '옛 법을 그대로 따른다', short: '옛 법', text: '옛 주인의 법전을 그대로 베꼈다. 바뀐 것은 맨 앞장의 이름뿐이다. 사람들은 낯설어하지 않았다.' },
  strict: { name: '엄한 법을 세운다', short: '엄한 법', text: '도둑은 손을, 반역은 목을. 첫 달에 광장 교수대가 두 번 쓰였다. 길은 조용해졌고, 사람들은 고개를 숙이고 다닌다.' },
  free: { name: '자유민의 법을 세운다', short: '자유민의 법', text: '농노의 굴레를 풀고 누구나 땅을 사고팔 수 있게 했다. 장터는 들떴고, 옛 집안들은 문을 닫고 모였다.' },
  custom: { name: '고장마다 제 관습을 따르게 한다', short: '고장의 관습', text: '마을마다 지켜 온 관습을 그대로 두고, 다툼이 큰 것만 내가 가린다. 일은 더디지만 불평은 적다.' },
};
const CROWN_WORD = { church: '교단의 대주교가 관을 씌웠다', self: '스스로 관을 썼다', old: '옛 신앙의 사제에게 관을 받았다' };

/* ---------- 상태 ---------- */
export function foundingState(g) {
  g.founding ??= {};
  const f = g.founding;
  f.realm ??= null;   // 내 나라 (아래 newRealm)
  f.world ??= [];     // 플레이어 없이 선 나라 [{ id, name, place, by, y, legit, fall, how }]
  f.past ??= [];      // 무너진 내 나라들 [{ name, dyn, y0, y1, how, gens }]
  f.month ??= [];     // 이번 달 줄 [{ kind, text }]
  f.log ??= [];       // [{ y, m, text }]
  f.used ??= [];      // 최근에 쓴 글 열쇠
  f.sceneAt ??= 0;
  f.urgeAt ??= -99;
  f.hintAt ??= -99;
  f.seq ??= 1;
  if (f.realm) {
    const r = f.realm;
    r.rel ??= {}; r.recog ??= {}; r.council ??= {}; r.steps ??= {}; r.reign ??= []; r.lowAt ??= 0; r.gen ??= 1;
    for (const k of ['legit', 'stab']) if (!Number.isFinite(r[k])) r[k] = 40;
  }
  return f;
}
const S = foundingState;
const R = (g) => S(g).realm;
function log(g, text) { const f = S(g); f.log.push({ y: g.date.year, m: g.date.month, text }); if (f.log.length > 30) f.log.shift(); }
function line(g, kind, text) { const f = S(g); if (f.month.length < 2 && !f.month.some((x) => x.text === text)) f.month.push({ kind, text }); }
function pickFresh(g, rng, kind, pool) {
  const f = S(g);
  const opts = pool.map((_, i) => i).filter((i) => !f.used.includes(`${kind}${i}`));
  const i = rng.pick(opts.length ? opts : pool.map((_, k) => k));
  f.used.push(`${kind}${i}`); if (f.used.length > 16) f.used.shift();
  return pool[i];
}
const free = (g) => playerAge(g) >= 15 && !traveling(g) && !isJailed(g) && !g.over;
const atCap = (g) => !!R(g) && L(g).place === R(g).capital && !traveling(g);
const fullName = (r) => `${r.name ?? placeName(r.capital)} ${KIND_WORD(r.kind)}`;

/* ---------- 땅과 조건 ---------- */
function landOf(g) {
  const d = D(g);
  if (d) return { base: 'domain', place: d.place, folk: d.pop, troops: d.garrison, name: d.name };
  const F = g.frontier;
  if (F?.sites) for (const [id, x] of Object.entries(F.sites)) if (x.chief && x.stage >= 2) return { base: 'frontier', place: id, folk: x.pop, troops: Math.round(x.pop * 0.1 + (x.safety ?? 0) / 4), name: x.name ?? placeName(id) };
  const o = g.revolt?.orders?.find((x) => x.mine && !x.ended);
  if (o) return { base: 'revolt', place: o.place, folk: (PLACES[o.place]?.house ?? 0) >= 280 ? 900 : 420, troops: 30 + (g.revolt.tally?.led ?? 0) * 10, name: placeName(o.place) };
  return null;
}
const myCompany = (g) => (g.company?.c && !g.company.c.regent ? g.company.c : null);
function causeOf(g, land) {
  const parts = [];
  const add = (w, v) => { if (v > 0) parts.push({ w, v: Math.round(v) }); };
  add('이름값', Math.min(40, (L(g).renown ?? 0) / 2));
  const b = g.claim?.blood;
  if (b?.known && b.status !== 'sold') add('왕가의 피', 30);
  if (land.base === 'revolt') add('봉기로 얻은 땅', 25);
  if (land.base === 'frontier') add('주인 없던 땅', 25);
  const d = D(g);
  if (land.base === 'domain' && d?.nation) add('내 손으로 일군 땅', 30);
  if (land.base === 'domain' && d?.liege && (d.favor ?? 50) < 35) add('주군의 박대', 15);
  if (myCompany(g)) add('따르는 용병단', 10);
  if (atWar(g)) add('어지러운 시절', 10);
  return { parts, total: parts.reduce((a, x) => a + x.v, 0) };
}
export function foundingReady(g) {
  if (R(g) || g.claim?.blood?.status === 'crowned') return null;
  const land = landOf(g);
  if (!land) return null;
  const co = myCompany(g)?.men ?? 0;
  const money = g.player.money + (land.base === 'domain' ? Math.max(0, D(g).treasury) : 0);
  const cause = causeOf(g, land);
  const have = { folk: Math.round(land.folk), troops: Math.round(land.troops + co), money: Math.round(money), cause: cause.total, age: playerAge(g) };
  const missing = Object.keys(NEED).filter((k) => have[k] < NEED[k]);
  return { land, have, missing, ok: !missing.length, causes: cause.parts };
}
const canKing = (rd) => rd.have.folk >= 800 && rd.have.cause >= 70;

ACTIONS.push({
  id: 'found_declare', name: '나라를 세운다', icon: 'crown',
  desc: '땅과 사람과 군사와 명분을 모았다. 누구의 신하도 아닌 나라를 선포한다. 옛 주인은 이것을 반역으로 볼 것이다.',
  available: (g) => { if (!free(g) || sceneQueued(g, 'found_declare')) return false; const rd = foundingReady(g); return !!rd?.ok && L(g).place === rd.land.place; },
  run(g) { queueScene(g, 'found_declare', {}, { first: true }); return '밤늦도록 지도와 장부를 번갈아 들여다보았다. 촛불이 두 번 바뀌었다.'; },
});

/* ---------- 선포 ---------- */
function masterOf(g, land) {
  const d = D(g);
  if (land.base === 'domain' && d?.nation && !d.liege) return null; // 잊힌 땅에 세운 개척지: 주인이 없다
  const r = realmOfPlace(land.place);
  return REALMS[r] ? r : null;
}
function payCost(g, n) {
  const d = D(g);
  if (d) { const t = Math.min(Math.max(0, d.treasury), n); d.treasury -= t; n -= t; }
  g.player.money = Math.max(0, g.player.money - n);
}
const canPay = (g, n) => g.player.money + Math.max(0, D(g)?.treasury ?? 0) >= n;

defineScene('found_declare', {
  title: () => '깃발을 올리는 날',
  text: (g) => {
    const rd = foundingReady(g);
    if (!rd) return '때가 지나갔다.';
    const m = masterOf(g, rd.land);
    return `${rd.land.name}의 사람 ${rd.have.folk}명, 창을 들 사람 ${rd.have.troops}명, 금고의 은화 ${rd.have.money}닢. 명분은 ${rd.causes.map((x) => x.w).join(', ')}. 잔치와 깃발과 사방에 보낼 사절에 은화 ${DECLARE_COST}닢이 든다.${m ? ` ${short(m)}에서는 이것을 반역으로 볼 것이다. 군대가 올 것이다.` : ' 이 땅에는 옛 주인이 없다. 막아 줄 사람도 없다.'}`;
  },
  choices: (g) => {
    const rd = foundingReady(g);
    if (!rd?.ok) return [{ label: '아직 때가 아니다', key: 'no' }];
    return [
      ...(canKing(rd) ? [{ label: '왕국을 선포하고 왕을 칭한다', key: 'king' }] : []),
      { label: '공국을 선포하고 대공을 칭한다', key: 'duke' },
      { label: '아직 때가 아니다', key: 'no' },
    ];
  },
  resolve(g, rng, s, key) {
    const rd = foundingReady(g);
    if (key === 'no' || !rd?.ok) return '깃발은 다시 궤짝 속에 들어갔다. 집사가 안도하는 얼굴을 숨기지 못했다.';
    return declare(g, rng, rd, key === 'king' && canKing(rd) ? 3 : 2);
  },
});

function newRealm(g, rd, kind, master) {
  return {
    name: null, dyn: null, kind, capital: rd.land.place, base: rd.land.base, y: g.date.year, m: g.date.month, at: mi(g),
    founder: g.player.name, gen: 1, legit: clamp(20 + rd.have.cause / 4, 20, 50), stab: 55, crown: null, master,
    rel: {}, recog: {}, war: null, council: {}, law: null, palace: null, steps: {}, lowAt: 0, warAt: null,
    reign: [{ name: g.player.name, y: g.date.year }], wars: 0, wins: 0,
  };
}
function declare(g, rng, rd, kind) {
  const f = S(g);
  const land = rd.land;
  const master = masterOf(g, land);
  payCost(g, DECLARE_COST);
  let d = D(g);
  if (land.base !== 'domain') {
    d = grantFief(g, { name: land.name, place: land.place, liege: null, nation: true, pop: land.folk }, '스스로 나라를 세웠다.');
    Object.assign(d, { garrison: land.troops, quality: 35, treasury: 40, morale: 62, order: 45 });
  }
  const co = myCompany(g);
  if (co) d.garrison += Math.round((co.men ?? 0) * 0.6);
  d.liege = null; d.nation = true; d.rank = Math.max(d.rank, kind);
  if (land.base === 'revolt') { const o = g.revolt.orders.find((x) => x.mine && !x.ended); if (o) { o.ended = true; o.crowned = true; } }
  const r = (f.realm = newRealm(g, rd, d.rank >= 3 ? 3 : 2, master));
  for (const n of NEIGH[master ?? 'wild'] ?? NEIGH.wild) r.rel[n] = n === master ? -50 : rng.int(-15, 15);
  if (master) { r.recog[master] = 'no'; r.warAt = mi(g) + rng.int(3, 7); }
  L(g).renown = (L(g).renown ?? 0) + 15;
  stress(g, 10);
  chron(g, `${g.player.name}, ${placeName(land.place)}에서 누구의 신하도 아닌 나라를 선포하고 ${J(RULER_WORD(r.kind), '을/를')} 칭하다.`, 130);
  note(g, `${placeName(land.place)}에서 나라를 선포했다.`);
  log(g, `${placeName(land.place)}에서 나라를 선포했다.`);
  pnews(g, `${placeName(land.place)}에서 ${J(g.player.name, '이/가')} 스스로 ${J(RULER_WORD(r.kind), '을/를')} 칭했다.`);
  queueScene(g, 'found_name', {}, { first: true });
  return `${placeName(land.place)} 광장에 사람들이 모였다. 돌계단에 올라 옛 주인의 깃발을 내리게 했다. 새 깃발이 올라가는 동안 아무도 소리 내지 않았다. 그러다 맨 앞의 늙은 병사가 무릎을 꿇었고, 물결처럼 모두가 따라 꿇었다.${master ? ` 그날 밤 ${short(master)}로 가는 길에 말 탄 사람 둘이 서둘러 떠나는 것이 보였다.` : ''}`;
}

/* ---------- 이름 ---------- */
defineScene('found_name', {
  title: () => '나라의 이름',
  text: (g) => `서기가 첫 칙령의 맨 윗줄을 비워 두고 기다린다. 이 땅을 무엇이라 부를지, 오늘 쓴 이름이 연대기에 남는다. ${KIND_WORD(R(g)?.kind ?? 2)}이라는 말 앞에 붙을 이름이다.`,
  choices: (g) => {
    const r = R(g); if (!r) return [{ label: '붓을 내려놓는다', key: 'x' }];
    const rng = ownRng(g, 3);
    const pl = placeName(r.capital).replace(/ .*$/, '');
    const ln = (me(g).lastName ?? '').replace(/^(폰|데|반) /, '') || null;
    const p1 = rng.pick(T.REALM_NAMES); const poet = [p1, rng.pick(T.REALM_NAMES.filter((x) => x !== p1))];
    const names = [...new Set([pl, `새 ${pl}`, ...(ln ? [ln] : []), ...poet])].slice(0, 4);
    return names.map((n) => ({ label: `${n} ${KIND_WORD(r.kind)}`, key: n }));
  },
  resolve(g, rng, s, key) {
    const r = R(g); if (!r || key === 'x') return '이름은 다음으로 미뤘다.';
    r.name = key; r.steps.name = mi(g);
    chron(g, `${J(fullName(r), '이/가')} 서다.`, 120);
    log(g, `나라 이름을 ${J(fullName(r), '으로/로')} 정했다.`);
    queueScene(g, 'found_dynasty', {}, { first: true });
    return `서기가 비워 둔 줄에 '${fullName(r)}'이라고 적었다. 잉크가 마르는 동안 모두 그 글자를 들여다보았다. 처음 보는 이름이었다. 내일부터는 아닐 것이다.`;
  },
});
defineScene('found_dynasty', {
  title: () => '왕가의 이름',
  text: (g) => `문장관이 물었다. 왕좌에 앉는 집안을 무엇이라 부를지. 내 자식과 그 자식들이 이 이름을 달고 살거나, 이 이름 때문에 죽을 것이다.`,
  choices: (g) => {
    const rng = ownRng(g, 5);
    const ln = me(g).lastName;
    const sign = rng.pick(T.HOUSE_SIGNS);
    return [
      ...(ln ? [{ label: `${ln} 가문으로 한다`, key: ln }] : []),
      { label: `문장을 따서 ${sign} 가문으로 한다`, key: sign },
      { label: `내 이름을 따서 ${g.player.name} 가문으로 한다`, key: g.player.name },
    ];
  },
  resolve(g, rng, s, key) {
    const r = R(g); if (!r) return '문장관이 물러났다.';
    r.dyn = `${key} 가문`; r.steps.dyn = mi(g);
    chron(g, `${fullName(r)}의 왕가는 ${r.dyn}이라 불리다.`, 90);
    return `문장관이 새 인장을 깎아 왔다. ${r.dyn}. 붉은 밀랍에 처음 찍어 보았다. 손이 조금 떨렸다.`;
  },
});

/* ---------- 신하 ---------- */
function candidates(g, rng) {
  const out = [];
  const known = g.people.filter((p) => p.alive && !p.isPlayer && p.known && ageYears(p) >= 20 && (p.affection ?? 0) >= 15)
    .sort((a, b) => (b.affection ?? 0) - (a.affection ?? 0)).slice(0, 2);
  for (const p of known) out.push({ id: p.id, name: p.name, kind: 'friend', loyal: clamp(60 + (p.affection ?? 0) / 3, 0, 95), skill: rng.int(30, 60) });
  const nm = personName(rng, R(g)?.master ?? 'leonia', rng.chance(0.7) ? 'm' : 'f', out.map((x) => x.name));
  out.push({ id: null, name: `${nm.name} ${rng.pick(T.NOBLE_HOUSES)}`, kind: 'noble', loyal: rng.int(35, 55), skill: rng.int(55, 80) });
  return out;
}
const stranger = (g, rng, role) => { const taken = Object.values(R(g)?.council ?? {}).filter(Boolean).map((c) => c.name); const nm = personName(rng, R(g)?.master ?? 'leonia', role === 'priest' && rng.chance(0.3) ? 'f' : 'm', taken); return { id: null, name: nm.name, kind: role, loyal: rng.int(45, 70), skill: rng.int(40, 70) }; };
defineScene('found_council', {
  title: () => '누구에게 맡길까',
  text: (g, s) => `${fullName(R(g) ?? { kind: 2, capital: L(g).place })}의 일은 혼자 다 볼 수 없다. 재상 자리를 두고 사람들이 오르내린다. ${s.c.map((x) => (x.kind === 'friend' ? `${J(x.name, '은/는')} 오래 내 곁에 있었다. 믿을 수 있지만 나랏일은 처음이다.` : `${J(x.name, '은/는')} 옛 집안 출신이다. 장부와 법을 알고, 옛 귀족들이 그 이름에 고개를 끄덕인다. 속은 모른다.`)).join(' ')}`,
  choices: (g, s) => s.c.map((x, i) => ({ label: `${J(x.name, '을/를')} 재상으로 삼는다`, key: `c${i}` })),
  resolve(g, rng, s, key) {
    const r = R(g); if (!r) return '자리는 비어 있다.';
    const c = s.c[+key.slice(1)] ?? s.c[0];
    r.council.chancellor = { ...c };
    r.council.marshal = stranger(g, rng, 'marshal');
    r.council.treasurer = stranger(g, rng, 'treasurer');
    r.council.priest = stranger(g, rng, 'priest');
    if (c.kind === 'noble') r.legit = clamp(r.legit + 6, 0, 100);
    if (c.id) { const p = byId(g, c.id); if (p) { rel(p); p.affection = clamp((p.affection ?? 0) + 8, -100, 100); } }
    r.steps.council = mi(g);
    log(g, `${J(c.name, '을/를')} 재상으로 삼았다.`);
    return c.kind === 'friend'
      ? `${J(c.name, '은/는')} 한참 말이 없다가 "제가 뭘 압니까" 하고 웃었다. 그래도 다음 날 새벽, 누구보다 먼저 집무실에 나와 있었다. 원수는 ${r.council.marshal.name}, 재무관은 ${r.council.treasurer.name}에게 맡겼다.`
      : `${J(c.name, '은/는')} 깊이 허리를 숙였다. 옛 집안들이 하나둘 축하 서신을 보내왔다. 그가 내 편인지, 내 자리의 편인지는 시간이 말해 줄 것이다. 원수는 ${r.council.marshal.name}, 재무관은 ${r.council.treasurer.name}에게 맡겼다.`;
  },
});

/* ---------- 법과 세금 ---------- */
defineScene('found_law', {
  title: () => '첫 법전',
  text: (g) => `${fullName(R(g) ?? { kind: 2, capital: L(g).place })}의 법은 아직 없다. 지금은 옛 주인의 법을 쓰는 고장, 아무 법도 없는 고장이 섞여 있다. 어떤 법 아래 살게 할지 정해야 한다.`,
  choices: () => Object.entries(LAWS).map(([k, x]) => ({ label: x.name, key: k })),
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '법전은 미뤄졌다.';
    const k = LAWS[key] ? key : 'old';
    r.law = k; r.steps.law = mi(g);
    if (k === 'old') { r.legit = clamp(r.legit + 8, 0, 100); r.stab = clamp(r.stab + 5, 0, 100); }
    if (k === 'strict') { d.order = clamp(d.order + 15, 0, 100); d.morale = clamp(d.morale - 8, 0, 100); r.stab = clamp(r.stab + 3, 0, 100); }
    if (k === 'free') { d.morale = clamp(d.morale + 12, 0, 100); r.legit = clamp(r.legit - 5, 0, 100); const ch = r.council.chancellor; if (ch?.kind === 'noble') ch.loyal = clamp(ch.loyal - 12, 0, 100); }
    if (k === 'custom') { d.morale = clamp(d.morale + 6, 0, 100); r.stab = clamp(r.stab + 4, 0, 100); r.legit = clamp(r.legit + 2, 0, 100); }
    log(g, `${LAWS[k].short}으로 나라를 다스리기로 했다.`);
    return LAWS[k].text;
  },
});
defineScene('found_tax', {
  title: () => '첫 세금',
  text: () => '재무관이 장부를 펼쳤다. 병사 봉급, 사절의 노자, 성벽 수리. 나가는 돈은 정해져 있고, 들어오는 돈은 내가 정한다. 첫해의 세금은 사람들이 오래 기억한다.',
  choices: () => [
    { label: '첫해는 가볍게 걷는다', key: 'light' },
    { label: '옛 주인 때와 같게 걷는다', key: 'same' },
    { label: '전쟁에 대비해 무겁게 걷는다', key: 'heavy' },
  ],
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '장부를 덮었다.';
    r.steps.tax = mi(g);
    if (key === 'light') { d.tax = 0; d.morale = clamp(d.morale + 8, 0, 100); r.legit = clamp(r.legit + 4, 0, 100); return '세금을 옛날의 절반으로 내렸다. 장터에서 내 이름을 부르며 건배하는 소리가 들렸다고 한다. 금고는 그만큼 가벼워질 것이다.'; }
    if (key === 'heavy') { d.tax = 2; d.morale = clamp(d.morale - 8, 0, 100); d.treasury += 80; return '세금을 올렸다. 재무관은 흡족해했고, 시골에서는 옛 주인이 낫다는 말이 돌기 시작했다.'; }
    d.tax = 1; return '세금은 그대로 두었다. 사람들은 무엇이 바뀌었는지 모르는 채로 세금을 냈다. 그것도 나쁘지 않다.';
  },
});

/* ---------- 수도와 궁 ---------- */
defineScene('found_capital', {
  title: () => '왕이 사는 곳',
  text: (g) => `${placeName(R(g)?.capital ?? L(g).place)}의 영주관은 작다. 사절을 맞을 방 하나가 없고, 비가 오면 알현실 구석에 양동이를 놓는다. 수도는 나라의 얼굴이다.`,
  choices: (g) => [
    { label: '옛 영주관을 그대로 궁으로 쓴다', key: 'keep' },
    ...(canPay(g, 300) ? [{ label: '언덕 위에 성채를 쌓는다 (은화 300닢)', key: 'fort' }] : []),
    ...(canPay(g, 400) ? [{ label: '돌로 새 궁을 짓는다 (은화 400닢)', key: 'palace' }] : []),
  ],
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '설계도를 접었다.';
    r.steps.capital = mi(g);
    if (key === 'fort' && canPay(g, 300)) { payCost(g, 300); r.palace = 'fort'; d.buildings.wall = true; d.order = clamp(d.order + 6, 0, 100); return '언덕 위에 성채를 쌓았다. 아름답지는 않다. 사절들은 그 벽을 올려다보고, 돌아가서 그 높이를 말할 것이다.'; }
    if (key === 'palace' && canPay(g, 400)) { payCost(g, 400); r.palace = 'palace'; d.buildings.manor = true; r.legit = clamp(r.legit + 10, 0, 100); return '석공 마흔 명이 한 해를 매달려 새 궁을 올렸다. 처음 알현실에 들어섰을 때 내 발소리가 천장까지 울렸다. 사람들은 왕을 궁의 크기로 잰다.'; }
    r.palace = 'keep'; d.buildings.manor = true; return '지붕만 새로 이었다. 사절들은 영주관이 소박하다고 했다. 병사들은 봉급이 밀리지 않는다고 했다. 어느 쪽 말을 들을지는 정했다.';
  },
});

/* ---------- 대관 ---------- */
function churchWilling(g, r) {
  const fs = faithState(g);
  if (r.master === 'holy') return false;
  let w = 35 + (fs.devotion ?? 0) / 2 + (fs.holy ?? 0) / 3 + r.legit / 3;
  if (r.master === 'leonia' && r.recog.leonia !== 'yes') w -= 30;
  if (r.recog.holy === 'yes') w += 20;
  return w >= 50;
}
defineScene('found_crown', {
  title: () => '누가 관을 씌우나',
  text: (g, s) => {
    const r = R(g);
    return s.ok
      ? `성광교 대주교가 서신을 보냈다. 관을 씌워 줄 수 있다고 한다. 대신 은화 200닢의 헌금과, 교단의 땅에는 세금을 걷지 않는다는 약조를 원한다. 무릎을 꿇는 모습은 ${fullName(r)}의 모든 사람이 보게 될 것이다.`
      : `성광교 대주교에게 보낸 사절이 빈손으로 돌아왔다. "${r?.master ? `${short(r.master)}의 왕관이 아직 이 땅 위에 있다` : '하늘이 아직 그 자리를 허락하지 않았다'}"고 했다고 한다. 관 없는 왕은 오래 버티지 못한다.`;
  },
  choices: (g, s) => [
    ...(s.ok && canPay(g, 200) ? [{ label: '대주교 앞에 무릎 꿇고 관을 받는다 (은화 200닢)', key: 'church' }] : []),
    { label: '교단 없이 스스로 관을 쓴다', key: 'self' },
    { label: '시골 사람들이 모시는 대지의 어머니 사제에게 관을 받는다', key: 'old' },
    ...(!s.ok ? [{ label: '다시 청하는 서신을 보내고 기다린다', key: 'wait' }] : []),
  ],
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '왕관은 궤짝에 남았다.';
    if (key === 'wait') { r.steps.crown = null; r.crownAt = mi(g) + 12; r.legit = clamp(r.legit - 2, 0, 100); return '서신을 다시 보냈다. 답이 오기까지 한 해는 걸릴 것이다. 그동안 나는 관 없이 왕이다.'; }
    r.steps.crown = mi(g);
    const fs = faithState(g);
    if (key === 'church' && s.ok && canPay(g, 200)) {
      payCost(g, 200); r.crown = 'church'; r.legit = clamp(r.legit + 25, 0, 100); r.rel.holy = clamp((r.rel.holy ?? 0) + 20, -100, 100);
      chron(g, `${g.player.name}, 성광교 대주교에게서 ${fullName(r)}의 관을 받다.`, 110);
      return '대주교의 손이 관을 내 머리 위에 내려놓았다. 생각보다 무거웠다. 성가대가 노래하는 동안 무릎이 저렸다. 일어섰을 때, 어제와 같은 사람들이 어제와 다른 눈으로 나를 보았다.';
    }
    if (key === 'old') {
      r.crown = 'old'; r.legit = clamp(r.legit + 12, 0, 100); d.morale = clamp(d.morale + 5, 0, 100); r.rel.holy = clamp((r.rel.holy ?? 0) - 10, -100, 100);
      chron(g, `${g.player.name}, 대지의 어머니 사제에게서 ${fullName(r)}의 관을 받다.`, 100);
      return '밀밭 한가운데 돌 제단에서, 맨발의 늙은 여사제가 보리 이삭을 엮은 관을 씌웠다. 그 위에 쇠관을 얹었다. 농부들은 울었고, 성광교 사제들은 그날 오지 않았다.';
    }
    r.crown = 'self'; r.legit = clamp(r.legit + 6, 0, 100); r.rel.holy = clamp((r.rel.holy ?? 0) - 25, -100, 100); fs.suspicion = clamp((fs.suspicion ?? 0) + 8, 0, 100);
    chron(g, `${g.player.name}, 스스로 ${fullName(r)}의 관을 쓰다.`, 100);
    return '아무도 관을 들고 오지 않았다. 그래서 내가 들어 내 손으로 썼다. 알현실이 조용했다. 누군가 기침을 했다. 그날부터 성광교 설교에서 내 이름은 빠졌다.';
  },
});

/* ---------- 이웃 나라의 사절 ---------- */
const recogN = (r) => Object.values(r.recog).filter((x) => x === 'yes').length;
defineScene('found_envoy', {
  title: (g, s) => `${short(s.n)}의 사절`,
  text: (g, s) => {
    const r = R(g);
    if (s.st === 'yes') return `${short(s.n)}의 사절이 비단에 싼 서신을 내밀었다. ${fullName(r)}을 한 나라로 대하겠다는 글이다. ${r.master && r.master !== s.n ? `${short(r.master)}의 적은 곧 그들의 벗이라는 셈일 것이다.` : '공짜는 아닐 것이다. 그래도 처음으로 남이 내 나라를 나라라고 불렀다.'}`;
    if (s.st === 'tribute') return `${short(s.n)}의 사절이 의자에 앉기도 전에 말했다. 해마다 은화 60닢을 보내면 ${fullName(r)}을 나라로 쳐 주겠다고. 지금 은화 150닢을 먼저 내라고. 거절하면 그들의 장부에 우리는 반란군으로 남는다.`;
    return `${short(s.n)}의 사절은 앉지 않았다. "그대들이 나라라고 부르는 것을 우리 왕은 모른다." 문 앞에서 돌아서며 덧붙였다. "국경을 넘는 자는 도적으로 다룰 것이오."`;
  },
  choices: (g, s) => {
    if (s.st === 'yes') return [{ label: '서신을 받고 답례를 보낸다', key: 'ok' }, ...(canPay(g, 120) ? [{ label: '혼약을 청해 사이를 굳힌다 (은화 120닢)', key: 'wed' }] : [])];
    if (s.st === 'tribute') return [...(canPay(g, 150) ? [{ label: '은화 150닢을 내고 해마다 공물을 보낸다', key: 'pay' }] : []), { label: '돈으로 사는 인정은 필요 없다', key: 'refuse' }];
    return [...(canPay(g, 100) ? [{ label: '선물을 들려 다시 사절을 보낸다 (은화 100닢)', key: 'gift' }] : []), { label: '그렇다면 국경에서 보자고 답한다', key: 'defy' }, { label: '아무 답도 하지 않는다', key: 'quiet' }];
  },
  resolve(g, rng, s, key) {
    const r = R(g); if (!r) return '사절이 돌아갔다.';
    const n = s.n;
    const relN = (v) => { r.rel[n] = clamp((r.rel[n] ?? 0) + v, -100, 100); };
    if (key === 'ok' || key === 'wed') {
      r.recog[n] = 'yes'; relN(key === 'wed' ? 30 : 15); r.legit = clamp(r.legit + (key === 'wed' ? 9 : 6), 0, 100);
      if (key === 'wed') { payCost(g, 120); r.pact ??= {}; r.pact[n] = 'marriage'; }
      chron(g, `${J(short(n), '이/가')} ${J(fullName(r), '을/를')} 한 나라로 인정하다.`, 90);
      log(g, `${J(short(n), '이/가')} 나라로 인정했다.`);
      return key === 'wed' ? `${short(n)}의 먼 왕족 하나와 우리 집안 사이에 혼약을 맺었다. 혼례는 몇 해 뒤다. 그때까지 두 나라 사이 길에는 도적만 다닐 것이다.` : '답례로 은잔 한 벌과 우리 땅의 첫 수확을 보냈다. 서신은 알현실 벽에 걸었다.';
    }
    if (key === 'pay' && canPay(g, 150)) { payCost(g, 150); r.recog[n] = 'tribute'; relN(8); r.legit = clamp(r.legit + 4, 0, 100); return '은화를 세어 넘겼다. 사절은 상자를 열어 하나하나 깨물어 보았다. 이제 우리는 그들의 장부에 나라로 오른다. 공물을 바치는 나라로.'; }
    if (key === 'refuse') { r.recog[n] = 'no'; relN(-15); return '사절은 웃으며 돌아갔다. 그 웃음이 마음에 들지 않았다.'; }
    if (key === 'gift' && canPay(g, 100)) { payCost(g, 100); relN(18); r.recog[n] = null; r.envoyAt ??= {}; r.envoyAt[n] = mi(g) + rng.int(8, 16); return '말 두 필과 은잔을 실어 다시 사절을 보냈다. 받기는 받았다고 한다. 답은 아직 없다.'; }
    if (key === 'defy') {
      r.recog[n] = 'no'; relN(-20);
      if ((r.rel[n] ?? 0) < -35 && !r.war && rng.chance(0.5)) r.warAt = Math.min(r.warAt ?? 9e9, mi(g) + rng.int(2, 5)), r.warFoe = n;
      return '사절의 말을 그대로 돌려주었다. 병사들은 좋아했다. 원수는 말없이 국경 쪽 성벽 지도를 펼쳤다.';
    }
    r.recog[n] = 'no'; return '사절이 떠난 뒤에도 한동안 아무도 입을 열지 않았다.';
  },
});

/* ---------- 전쟁 ---------- */
function startWar(g, rng, n) {
  const r = R(g);
  r.war = { realm: n, score: 0, months: 0, at: mi(g), next: mi(g) };
  r.wars += 1; r.warAt = null; r.warFoe = null;
  chron(g, `${J(short(n), '이/가')} ${fullName(r)}에 군대를 보내다.`, 100);
  log(g, `${J(short(n), '이/가')} 군대를 보냈다.`);
}
function enemyTroops(g, r, rng) {
  const w = r.war;
  return Math.max(20, Math.round((POWER[w.realm] ?? 60) * (0.6 + Math.min(12, w.months) * 0.03) * (1 - w.score * 0.12) * (0.85 + rng.float(0, 0.3))));
}
function warResult(g, rng, outcome) {
  const r = R(g); const d = D(g); if (!r?.war || !d) return '';
  const w = r.war;
  if (outcome === 'win') { w.score += 1; r.wins += 1; r.legit = clamp(r.legit + 4, 0, 100); }
  if (outcome === 'lose') { w.score -= 1; r.legit = clamp(r.legit - 5, 0, 100); d.pop = Math.max(60, Math.round(d.pop * 0.94)); d.morale = clamp(d.morale - 5, 0, 100); }
  if (w.score >= 2 || (w.months >= 18 && w.score >= 0)) {
    r.recog[w.realm] = 'yes'; r.rel[w.realm] = clamp((r.rel[w.realm] ?? 0) + 20, -100, 100); r.legit = clamp(r.legit + 15, 0, 100); r.war = null;
    chron(g, `${J(short(w.realm), '이/가')} 화친을 청하고 ${J(fullName(r), '을/를')} 나라로 인정하다.`, 110);
    log(g, `${J(short(w.realm), '과/와')} 싸워 버텼고, 나라로 인정받았다.`);
    return `${short(w.realm)}의 진영에서 흰 깃발을 든 사람이 왔다. 화친하자고, 국경은 지금 선대로 두자고. 오늘부터 그들의 지도에 우리 땅이 그려진다.`;
  }
  if (w.score <= -2) { if (!sceneQueued(g, 'found_fall')) queueScene(g, 'found_fall', { why: 'war', n: w.realm }, { first: true }); return `${short(w.realm)}의 깃발이 ${placeName(r.capital)} 성벽 아래까지 왔다.`; }
  return '';
}
BATTLE_OUTS.founding = {
  win: (g, rng) => warResult(g, rng, 'win') || '적이 물러갔다. 병사들이 밤새 노래를 불렀다.',
  lose: (g, rng) => warResult(g, rng, 'lose') || '밀렸다. 국경 마을 둘을 내주고 성으로 물러났다.',
  draw: () => '해가 지도록 승부가 나지 않았다. 양쪽 다 시체를 거두러 나왔다.',
  other: (g, rng) => {
    const r = R(g); if (!r?.war) return '싸움을 피했다.';
    if (canPay(g, 200)) {
      payCost(g, 200); const n = r.war.realm; r.recog[n] = 'tribute'; r.legit = clamp(r.legit - 8, 0, 100); r.war = null;
      chron(g, `${fullName(r)}, ${short(n)}에 공물을 바치고 화친하다.`, 80);
      return `은화 200닢과 해마다의 공물을 약조하고 화친을 샀다. ${short(n)}의 장군은 웃지도 않았다. 병사들은 살아서 집으로 갔다. 나는 그 값을 오래 생각할 것이다.`;
    }
    r.war.score -= 1;
    return '화친을 청할 은화가 없었다. 사절은 문전에서 쫓겨났고, 적은 더 깊이 들어왔다.';
  },
};
function warTick(g, rng) {
  const r = R(g); const d = D(g); const w = r.war;
  w.months += 1;
  if (mi(g) < w.next) return;
  w.next = mi(g) + rng.int(2, 3);
  const troops = enemyTroops(g, r, rng);
  if (atCap(g) && playerAge(g) >= 16 && d.garrison > 0 && !sceneQueued(g, 'battle')) {
    queueBattle(g, {
      title: `${short(w.realm)}의 군대`,
      intro: rng.pick([`${short(w.realm)}의 깃발이 국경 언덕을 넘어왔다. 창끝이 해를 받아 번쩍인다.`, `새벽 안개 속에서 ${short(w.realm)}의 북소리가 들렸다. 성벽 위의 병사들이 서로 얼굴을 보았다.`, `${short(w.realm)}의 군대가 밀밭을 밟으며 다가온다. 올해 거둘 것은 없을 것이다.`]),
      enemy: { key: `found_${w.realm}`, troops }, context: 'founding', reward: { renown: 4 }, big: true,
      extra: [{ label: '공물을 약조하고 화친을 청한다 (은화 200닢)', key: 'sue' }],
    }, { first: true });
    return;
  }
  const ourP = d.garrison * (0.5 + d.quality / 100) * (r.council.marshal ? 1 + (r.council.marshal.skill - 50) / 200 : 1);
  const p = clamp(ourP / (troops * 1.0) * 0.5, 0.1, 0.85);
  const win = rng.chance(p);
  d.garrison = Math.max(0, d.garrison - rng.int(2, win ? 6 : 12));
  const after = warResult(g, rng, win ? 'win' : 'lose');
  line(g, 'war', after || (win ? `${placeName(r.capital)}에서 전갈이 왔다. ${short(w.realm)}의 군대를 국경에서 막아 냈다고 한다.` : `${placeName(r.capital)}에서 전갈이 왔다. ${short(w.realm)}의 군대에 국경 마을을 내주었다고 한다.`));
}

/* ---------- 무너짐 ---------- */
function endRealm(g, how) {
  const f = S(g); const r = f.realm; if (!r) return;
  f.past.push({ name: fullName(r), dyn: r.dyn, y0: r.y, y1: g.date.year, how, gens: r.gen });
  if (f.past.length > 6) f.past.shift();
  f.realm = null;
  const HOW = { vassal: '무릎을 꿇고 신하가 되다', fled: '왕좌를 버리고 달아나다', fell: '무너지다', abdicate: '왕관을 내려놓다', lost: '땅을 잃고 사라지다' };
  chron(g, `${fullName(r)}, ${g.date.year - r.y}년 만에 ${HOW[how] ?? '사라지다'}.`, 120);
  pnews(g, `${J(fullName(r), '이/가')} 선 지 ${g.date.year - r.y}년 만에 무너졌다.`);
  log(g, `${J(fullName(r), '이/가')} 끝났다.`);
}
const REFUGE = ['barka', 'serenia', 'portel', 'solaris'];
defineScene('found_fall', {
  title: () => '무너지는 날',
  text: (g, s) => {
    const r = R(g);
    if (!r) return '이미 끝난 일이다.';
    return s.why === 'war'
      ? `${short(s.n)}의 군대가 ${J(placeName(r.capital), '을/를')} 에워쌌다. 성벽 위 병사는 절반이 남았고 우물물은 줄어든다. 원수 ${J(r.council.marshal?.name ?? '노병', '이/가')} 말했다. "오늘 정하셔야 합니다."`
      : `${placeName(r.capital)} 거리에 내 깃발을 찢어 밟는 사람들이 나왔다. 세금 장부가 불탔고, 재무관이 피를 흘리며 궁으로 달려왔다. 신하들 눈빛이 예전 같지 않다. ${fullName(r)}이 흔들린다.`;
  },
  choices: (g, s) => {
    const r = R(g); if (!r) return [{ label: '고개를 돌린다', key: 'x' }];
    if (s.why === 'war') return [
      { label: `항복하고 ${short(s.n)}의 영주로 남는다`, key: 'vassal' },
      { label: '금고를 챙겨 밤에 달아난다', key: 'flee' },
      { label: '성에 남아 끝까지 싸운다', key: 'stand' },
    ];
    return [
      { label: '군대를 풀어 거리를 누른다', key: 'crush' },
      { label: '광장에 나가 사람들 앞에 선다', key: 'face' },
      { label: '왕관을 내려놓고 영주로 물러난다', key: 'abdicate' },
    ];
  },
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '이미 끝난 일이다.';
    tired(g, 15); stress(g, 20);
    if (key === 'vassal') {
      d.nation = false; d.rank = Math.min(d.rank, 1); d.liege = s.n === 'leonia' ? 'crown' : null; d.favor = 30;
      endRealm(g, 'vassal');
      return `성문을 열고 걸어 나가 ${short(s.n)}의 장군 앞에 칼을 내려놓았다. 장군은 칼을 집어 들지 않았다. 살려 둔 것은 이 땅에 영주가 필요해서다. 내 깃발은 그날 저녁 불탔다.`;
    }
    if (key === 'flee') {
      const loot = Math.round(Math.max(0, d.treasury) / 2);
      g.player.money += loot;
      const from = d.place;
      g.domain = null;
      endRealm(g, 'fled');
      const to = REFUGE.find((x) => PLACES[x] && realmOfPlace(x) !== s.n) ?? 'barka';
      L(g).home = 'inn';
      L(g).travel = { to, left: 2, from };
      return `금고에서 은화 ${loot}닢을 자루에 쓸어 담고, 수로 쪽 쪽문으로 빠져나왔다. 뒤에서 성문이 부서지는 소리가 들렸다. 돌아보지 않았다. ${placeName(to)}까지는 두 달 길이다.`;
    }
    if (key === 'stand') {
      if (check(rng, leadership(g) + d.garrison / 4, 60)) {
        r.war = null; r.recog[s.n] = 'yes'; r.legit = clamp(r.legit + 20, 0, 100); r.stab = clamp(r.stab + 10, 0, 100);
        chron(g, `${g.player.name}, ${placeName(r.capital)} 포위를 버텨 내다.`, 110);
        return '마흔 날을 버텼다. 마흔하루째 아침, 적의 진영에 역병이 돌았다는 말이 들렸고 그날 밤 그들은 떠났다. 성벽 위에서 그 횃불 행렬을 끝까지 지켜보았다. 이제 아무도 이 나라를 나라가 아니라고 하지 않는다.';
      }
      endRealm(g, 'fell');
      L(g).pendingDeath = '무너지는 성에서 마지막까지 칼을 들었다';
      return '성문이 부서졌다. 알현실 계단에서 마지막 병사들과 함께 섰다. 왕관은 쓰지 않았다. 칼만 들었다.';
    }
    if (key === 'crush') { d.order = clamp(d.order + 20, 0, 100); d.morale = clamp(d.morale - 15, 0, 100); r.stab = clamp(r.stab + 18, 0, 100); r.legit = clamp(r.legit - 10, 0, 100); r.lowAt = 0; return '병사들이 광장을 쓸었다. 해가 지기 전에 거리는 조용해졌다. 조용한 거리에서 사람들은 나를 보면 고개를 숙이고, 등 뒤에서 침을 뱉는다.'; }
    if (key === 'face') {
      r.lowAt = 0;
      if (check(rng, (g.player.stats.cha ?? 30) + (L(g).renown ?? 0) / 4, 50)) { r.stab = clamp(r.stab + 22, 0, 100); r.legit = clamp(r.legit + 6, 0, 100); return '호위도 없이 광장 한가운데 섰다. 돌이 하나 날아와 이마를 스쳤다. 피를 닦지 않고 말했다. 무엇이 모자라는지, 무엇을 고치겠는지. 한 사람이 돌을 내려놓았고, 다른 사람들도 그랬다.'; }
      r.stab = clamp(r.stab - 5, 0, 100); stress(g, 15);
      return '광장에 섰지만 내 목소리는 고함에 묻혔다. 호위들이 나를 끌고 들어왔다. 등 뒤에서 문이 닫힐 때까지 돌이 날아왔다.';
    }
    if (key === 'abdicate') { d.rank = 1; endRealm(g, 'abdicate'); return '왕관을 탁자에 내려놓았다. 이제 나는 이 땅의 영주일 뿐이다. 거리의 고함이 차츰 잦아들었다. 집사가 왕관을 궤짝에 넣으며 물었다. 자물쇠를 채울까요. 채우라고 했다.'; }
    return '고개를 돌렸다.';
  },
});

/* ---------- 매달의 일들 ---------- */
defineScene('found_urge', {
  title: () => '왕이 되십시오',
  text: (g) => { const rd = foundingReady(g); return `밤에 ${rd?.land.name ?? '이 땅'}의 우두머리들이 찾아왔다. 늙은 촌장, 병사들의 대장, 장사꾼 조합장. 한 사람이 말을 꺼냈다. "이만한 땅과 사람과 칼이 있는데, 왜 남의 깃발 아래 있습니까. 깃발을 올리십시오. 우리가 따르겠습니다."`; },
  choices: () => [{ label: '그 말을 마음에 새겨 둔다', key: 'keep' }, { label: '입 밖에 내지 말라고 이른다', key: 'hush' }],
  resolve(g, rng, s, key) { return key === 'keep' ? '대답하지 않았다. 그들은 대답하지 않은 것을 대답으로 듣고 돌아갔다.' : '그런 말이 이 방 밖으로 나가면 목이 날아간다고 일렀다. 다들 고개를 숙였다. 그래도 그 말은 이미 밖에 있다.'; },
});
defineScene('found_plot', {
  title: () => '밤의 보고',
  text: (g, s) => { const r = R(g); const c = r?.council?.[s.role]; return `원수가 한밤중에 찾아와 문을 잠갔다. ${ROLES[s.role]} ${J(c?.name ?? '그 사람', '이/가')} ${s.role === 'chancellor' ? '옛 집안들과' : '국경 너머 사람과'} 밤마다 만난다고 한다. 증거는 편지 한 장. 필체는 그의 것 같다.`; },
  choices: () => [{ label: '불러서 편지를 보여 준다', key: 'face' }, { label: '모른 척 지켜본다', key: 'watch' }, { label: '내일 아침 목을 친다', key: 'kill' }],
  resolve(g, rng, s, key) {
    const r = R(g); if (!r) return '보고는 묻혔다.';
    const c = r.council[s.role]; if (!c) return '그 사람은 이미 떠났다.';
    if (key === 'kill') { const nm = c.name; r.council[s.role] = stranger(g, rng, s.role); r.stab = clamp(r.stab - 4, 0, 100); r.legit = clamp(r.legit - 3, 0, 100); log(g, `${J(nm, '을/를')} 반역으로 베었다.`); return `${nm}의 목이 성문 위에 걸렸다. 옛 집안들은 사흘 동안 아무도 궁에 오지 않았다. 그 자리는 ${r.council[s.role].name}에게 맡겼다.`; }
    if (key === 'face') { if (c.loyal < 30 && rng.chance(0.5)) { const nm = c.name; r.council[s.role] = stranger(g, rng, s.role); return `${J(nm, '은/는')} 편지를 보더니 얼굴이 하얘졌다. 변명하지 않았다. 그날 밤 짐도 싸지 않고 국경을 넘었다.`; } c.loyal = clamp(c.loyal + 15, 0, 100); return `${J(c.name, '은/는')} 편지를 읽고 웃었다. 누이에게 보낸 것이라 했다. 사실인지는 모른다. 그래도 그날부터 그는 더 일찍 나오고 더 늦게 들어간다.`; }
    c.loyal = clamp(c.loyal - 5, 0, 100); c.watched = true; return '편지를 원수에게 돌려주고 지켜보라 일렀다. 그 뒤로 알현실에서 그와 눈이 마주칠 때마다 무엇을 숨기는지 생각한다.';
  },
});
defineScene('found_petition', {
  title: () => '옛 집안들의 청',
  text: (g) => `옛 집안 가장 셋이 함께 알현을 청했다. ${fullName(R(g) ?? { kind: 2, capital: L(g).place })}이 서는 데 그들 집안의 칼과 곡식이 들었다고. 작위와 땅을 달라고 한다. 주면 그들은 내 편이 되고, 그만큼 내 몫이 준다.`,
  choices: () => [{ label: '작위와 땅을 나눠 준다', key: 'give' }, { label: '작위만 주고 땅은 주지 않는다', key: 'title' }, { label: '공은 공이고 땅은 내 것이라 이른다', key: 'no' }],
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '청은 묻혔다.';
    if (key === 'give') { r.legit = clamp(r.legit + 8, 0, 100); r.stab = clamp(r.stab + 6, 0, 100); d.pop = Math.round(d.pop * 0.93); return '세 집안에 백작 작위와 고을 하나씩을 내렸다. 그날 저녁 잔치에서 그들이 처음으로 나를 폐하라 불렀다. 세금 장부에서 세 고을 이름이 지워졌다.'; }
    if (key === 'title') { r.legit = clamp(r.legit + 3, 0, 100); return '작위 증서만 내렸다. 그들은 정중하게 받았다. 돌아가는 마차 안에서 무슨 말을 했을지는 알 만하다.'; }
    r.stab = clamp(r.stab - 6, 0, 100); const ch = r.council.chancellor; if (ch?.kind === 'noble') ch.loyal = clamp(ch.loyal - 10, 0, 100); return '청을 물리쳤다. 세 가장은 아무 말 없이 절하고 나갔다. 원수가 그들의 성에 병사를 몇이나 두었는지 알아보겠다고 했다.';
  },
});
defineScene('found_pretender', {
  title: () => '다른 왕',
  text: (g, s) => `${s.where}에서 ${J(s.who, '이/가')} 사람들을 모은다고 한다. 옛 주인의 핏줄이라고도 하고, 이 땅의 진짜 주인이라고도 한다. ${fullName(R(g) ?? { kind: 2, capital: L(g).place })}의 정통성이 흔들리는 틈을 노린 것이다.`,
  choices: (g) => [{ label: '병사를 보내 잡아 온다', key: 'catch' }, ...(canPay(g, 120) ? [{ label: '은화로 그 사람을 산다 (은화 120닢)', key: 'buy' }] : []), { label: '내버려 둔다. 곧 흩어질 것이다', key: 'leave' }],
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '소문은 흩어졌다.';
    if (key === 'catch') { if (rng.chance(clamp(d.garrison / 120, 0.25, 0.85))) { r.legit = clamp(r.legit + 5, 0, 100); return `${J(s.who, '은/는')} 헛간 다락에서 잡혀 왔다. 늙고 겁먹은 사람이었다. 광장에서 무릎을 꿇렸다. 그 뒤로 그런 말은 들리지 않는다.`; } d.garrison = Math.max(0, d.garrison - rng.int(3, 8)); r.stab = clamp(r.stab - 6, 0, 100); return `보낸 병사들이 숲에서 매복을 만났다. 몇은 돌아오지 못했다. ${J(s.who, '은/는')} 아직 숲 어딘가에 있다.`; }
    if (key === 'buy' && canPay(g, 120)) { payCost(g, 120); r.stab = clamp(r.stab + 3, 0, 100); return `${s.who}에게 은화와 남쪽 바닷가의 작은 집을 주었다. 그는 다음 날 떠났다. 그를 따르던 사람들은 속았다며 술집에서 그를 욕했다.`; }
    r.legit = clamp(r.legit - 4, 0, 100); return '내버려 두었다. 석 달이 지나도 소문은 흩어지지 않았다. 오히려 노래가 하나 생겼다.';
  },
});
defineScene('found_raise', {
  title: () => '왕을 칭할 때',
  text: (g) => `${fullName(R(g))}의 사람이 ${D(g)?.pop ?? 0}명을 넘었다. 이웃 나라 몇이 우리를 나라로 대한다. 재상이 말했다. "대공이라는 이름은 남의 왕 아래의 이름입니다. 이제 왕을 칭하실 때입니다."`,
  choices: () => [{ label: '왕국을 선포하고 왕을 칭한다', key: 'up' }, { label: '대공으로 남는다. 이름보다 땅이다', key: 'stay' }],
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '이야기는 그쳤다.';
    r.raised = true;
    if (key !== 'up') return '대공으로 남았다. 이웃 왕들은 그것을 겸손으로 보았고, 내 신하 몇은 겁으로 보았다.';
    const old = fullName(r); r.kind = 3; d.rank = 3; r.legit = clamp(r.legit + 6, 0, 100);
    chron(g, `${J(old, '이/가')} ${J(fullName(r), '으로/로')} 높아지다. ${g.player.name}, 왕을 칭하다.`, 120);
    return `${old}의 이름을 ${J(fullName(r), '으로/로')} 고쳐 썼다. 새 관을 맞추느라 대장장이가 한 달을 매달렸다. 이웃 왕 둘은 축하 서신을, 하나는 침묵을 보냈다.`;
  },
});
defineScene('found_succession', {
  title: () => '왕좌를 넘보는 형제',
  text: (g, s) => `${s.parent ?? '아버지'}의 장례가 끝나기도 전에 ${J(s.name, '이/가')} 성에 병사들을 데리고 왔다. "${fullName(R(g) ?? { kind: 2, capital: L(g).place })}은 선왕의 것이었지 너 하나의 것이 아니다." 옛 집안 몇이 그쪽에 서 있다.`,
  choices: (g) => [{ label: '땅 한쪽을 떼어 주고 달랜다', key: 'share' }, ...(canPay(g, 200) ? [{ label: '은화로 달래어 멀리 보낸다 (은화 200닢)', key: 'pay' }] : []), { label: '붙잡아 탑에 가둔다', key: 'jail' }],
  resolve(g, rng, s, key) {
    const r = R(g); const d = D(g); if (!r || !d) return '형제는 돌아갔다.';
    const p = byId(g, s.id);
    if (key === 'share') { d.pop = Math.round(d.pop * 0.85); r.stab = clamp(r.stab + 6, 0, 100); if (p) { rel(p); p.affection = clamp((p.affection ?? 0) + 15, -100, 100); } return `동쪽 고을 둘을 ${s.name}에게 떼어 주었다. 형제는 내 손을 잡았다. 그 손이 아직 칼자루 쪽으로 가 있는 것을 보았다.`; }
    if (key === 'pay' && canPay(g, 200)) { payCost(g, 200); if (p) { rel(p); p.affection = clamp((p.affection ?? 0) - 5, -100, 100); p.away = true; } return `은화 자루를 받은 ${J(s.name, '은/는')} 바다 건너로 떠났다. 부두에서 돌아보지 않았다. 나도 손을 흔들지 않았다.`; }
    r.legit = clamp(r.legit - 8, 0, 100); r.stab = clamp(r.stab + 4, 0, 100); if (p) { rel(p); p.affection = clamp((p.affection ?? 0) - 60, -100, 100); p.rivalry = clamp((p.rivalry ?? 0) + 40, 0, 100); }
    return `${J(s.name, '은/는')} 북쪽 탑에 갇혔다. 창으로 성문이 보이는 방이다. 어머니는 그날 이후 나와 밥을 먹지 않는다.`;
  },
});

/* ---------- 매달 굴림 ---------- */
const STEPS = [
  ['council', 1, 'found_council'], ['law', 2, 'found_law'], ['tax', 3, 'found_tax'], ['capital', 4, 'found_capital'], ['crown', 5, 'found_crown'],
];
const anyFound = (g) => L(g).queue.some((x) => (x.kind ?? '').startsWith('found_')) || (L(g).scene?.kind ?? '').startsWith('found_');
function nextStep(g, rng) {
  const r = R(g);
  if (anyFound(g) || !r.name) { if (!r.name && !anyFound(g)) queueScene(g, 'found_name', {}, { first: true }); return true; }
  if (!r.dyn) { queueScene(g, 'found_dynasty', {}, { first: true }); return true; }
  if (playerAge(g) < 16) return false;
  for (const [k, after, kind] of STEPS) {
    if (r.steps[k]) continue;
    if (mi(g) - r.at < after) return false;
    if (k === 'crown' && r.crownAt && mi(g) < r.crownAt) continue;
    if (k === 'council') { queueScene(g, kind, { c: candidates(g, rng) }, { first: true }); return true; }
    if (k === 'crown') { queueScene(g, kind, { ok: churchWilling(g, r) }, { first: true }); return true; }
    queueScene(g, kind, {}, { first: true }); return true;
  }
  return false;
}
function envoyTick(g, rng) {
  const r = R(g); const d = D(g);
  if (mi(g) - r.at < 2) return false;
  const opts = Object.keys(r.rel).filter((n) => n !== r.master && !r.recog[n] && REALMS[n] && (!r.envoyAt?.[n] || mi(g) >= r.envoyAt[n]) && !(r.war?.realm === n));
  if (!opts.length || !rng.chance(0.18)) return false;
  const n = rng.pick(opts);
  const enemyOfMaster = r.master && (g.politics?.rel?.[[n, r.master].sort().join('|')] ?? 0) < -10;
  const score = r.legit / 2 + d.garrison / 8 + (r.rel[n] ?? 0) + (enemyOfMaster ? 20 : 0) + (r.crown === 'church' && ['holy', 'leonia'].includes(n) ? 10 : 0) - 20 + rng.int(-15, 15);
  const st = score >= 30 ? 'yes' : score >= 8 ? 'tribute' : 'no';
  queueScene(g, 'found_envoy', { n, st }, { first: true });
  return true;
}
function eventTick(g, rng) {
  const r = R(g); const d = D(g); const f = S(g);
  if (mi(g) - f.sceneAt < 5 || playerAge(g) < 16) return false;
  const low = Object.entries(r.council).find(([, c]) => c && c.loyal < 40);
  if (low && rng.chance(0.04)) { queueScene(g, 'found_plot', { role: low[0] }); return true; }
  if (r.legit < 40 && rng.chance(0.015)) { const nm = personName(rng, r.master ?? 'leonia', 'm'); queueScene(g, 'found_pretender', { who: rng.chance(0.5) ? nm.full : `떠돌이 기사 ${nm.name}`, where: rng.pick(['국경 숲', '동쪽 고을', '옛 수도원 터', '산골 마을']) }); return true; }
  if (mi(g) - r.at >= 12 && !r.petitioned && rng.chance(0.03)) { r.petitioned = true; queueScene(g, 'found_petition', {}); return true; }
  if (r.kind === 2 && !r.raised && d.pop >= 1500 && r.legit >= 60 && recogN(r) >= 2) { queueScene(g, 'found_raise', {}); return true; }
  return false;
}
function realmTick(g, rng) {
  const f = S(g); const r = f.realm; const d = D(g);
  if (!d || d.place !== r.capital) { endRealm(g, 'lost'); return; }
  if (d.rank < 2) d.rank = 2;
  r.kind = d.rank >= 3 ? 3 : 2;
  d.liege = null; d.nation = true;
  // 정통성: 인정한 나라, 관, 궁, 대를 넘음, 법
  const target = 18 + recogN(r) * 8 + ({ church: 25, old: 12, self: 6 }[r.crown] ?? 0) + (r.palace === 'palace' ? 8 : r.palace ? 3 : 0) + Math.min(24, (r.gen - 1) * 8) + (r.law === 'old' ? 5 : 0) + Math.min(10, (g.date.year - r.y) / 2);
  r.legit = clamp(r.legit + (Math.min(100, target) - r.legit) * 0.03 + rng.normal(0, 0.4), 0, 100);
  const loyal = Object.values(r.council).filter(Boolean);
  const avgLoyal = loyal.length ? loyal.reduce((a, c) => a + c.loyal, 0) / loyal.length : 50;
  const stabT = (d.morale + d.order) / 2 + (avgLoyal - 50) / 5 - (r.war ? 12 : 0) + (r.legit - 40) / 6;
  r.stab = clamp(r.stab + (stabT - r.stab) * 0.08 + rng.normal(0, 0.8), 0, 100);
  for (const c of loyal) c.loyal = clamp(c.loyal + (r.stab > 50 ? 0.15 : -0.2) + rng.normal(0, 0.5), 0, 100);
  // 해마다 공물
  if (g.date.month === 1) for (const [n, st] of Object.entries(r.recog)) if (st === 'tribute') {
    if (canPay(g, 60)) payCost(g, 60);
    else { r.recog[n] = 'no'; r.rel[n] = clamp((r.rel[n] ?? 0) - 20, -100, 100); line(g, 'envoy', `${short(n)}에 보낼 공물이 모자랐다. 사절이 빈 상자를 보고 돌아갔다. 그들의 장부에서 우리 이름이 다시 지워질 것이다.`); }
  }
  // 전쟁
  if (!r.war && r.warAt && mi(g) >= r.warAt) {
    const n = r.warFoe ?? r.master;
    if (n && r.recog[n] !== 'yes' && r.recog[n] !== 'tribute') startWar(g, rng, n); else { r.warAt = null; r.warFoe = null; }
  }
  if (r.war) warTick(g, rng);
  // 장면
  let queued = nextStep(g, rng) || envoyTick(g, rng) || eventTick(g, rng);
  if (queued) f.sceneAt = mi(g);
  // 무너짐
  r.lowAt = r.stab < 15 && r.legit < 25 ? r.lowAt + 1 : 0;
  if (r.lowAt >= 6 && !sceneQueued(g, 'found_fall') && playerAge(g) >= 16) { queueScene(g, 'found_fall', { why: 'unrest' }, { first: true }); r.lowAt = 0; }
  // 한 줄
  const c = ctx(g, r);
  if (g.date.month === r.m && (g.date.year - r.y) > 0 && (g.date.year - r.y) % 10 === 0) { line(g, 'day', pickFresh(g, rng, 'day', T.DAY)({ ...c, years: g.date.year - r.y })); chron(g, `${fullName(r)}, 선 지 ${g.date.year - r.y}년.`, 60); }
  else if (!f.month.length && rng.chance(0.22)) {
    const pools = [['court', T.COURT], ['folk', T.FOLK], ['coin', T.COIN]];
    if (r.war) pools.push(['war', T.WAR], ['war', T.WAR]); else if (Object.values(r.recog).includes('no')) pools.push(['border', T.BORDER]);
    const [k, pool] = rng.pick(pools);
    if (!queued || k !== 'war') line(g, k, pickFresh(g, rng, k, pool)(c));
  }
}
function ctx(g, r) {
  const foe = r.war?.realm ?? Object.entries(r.recog).find(([, v]) => v === 'no')?.[0] ?? r.master;
  return {
    realm: fullName(r), short: r.name ?? placeName(r.capital), cap: placeName(r.capital), dyn: r.dyn ?? `${me(g).lastName ?? g.player.name} 가문`, n: g.player.name, title: RULER_WORD(r.kind),
    chan: r.council.chancellor?.name ?? '집사', marsh: r.council.marshal?.name ?? '병사들의 대장', priest: r.council.priest?.name ?? '늙은 사제', foe: short(foe ?? 'leonia'),
  };
}
function hintTick(g, rng) {
  const f = S(g);
  const rd = foundingReady(g);
  if (!rd) return;
  if (rd.ok) {
    if (mi(g) - f.urgeAt >= 36 && L(g).place === rd.land.place && free(g) && rng.chance(0.25) && !sceneQueued(g, 'found_urge')) { f.urgeAt = mi(g); queueScene(g, 'found_urge', {}); }
    return;
  }
  if (rd.missing.length <= 2 && !rd.missing.includes('age') && mi(g) - f.hintAt >= 10 && rng.chance(0.2)) {
    f.hintAt = mi(g);
    line(g, 'hint', pickFresh(g, rng, 'hint', T.HINT)({ place: placeName(rd.land.place), n: g.player.name, lack: rd.missing.map((k) => NEED_WORD[k]).join('과 ').replace(/(.+)과 (.+)/, (m, a, b) => `${J(a, '과/와')} ${b}`) }));
  }
}

/* ---------- 플레이어 없이 서는 나라 ---------- */
const WORLD_SPOTS = [
  { realm: 'march', place: 'graubel', w: '변경의 성주' }, { realm: 'beast', place: 'fur', w: '갈라선 씨족장' }, { realm: 'free', place: 'portel', w: '항구의 용병대장' },
  { realm: 'valhart', place: null, w: '숙청을 피한 옛 귀족' }, { realm: 'leonia', place: 'verden', w: '왕도와 틀어진 영주' }, { realm: 'holy', place: null, w: '파문당한 성기사' },
];
function worldTick(g, rng) {
  const f = S(g);
  if (g.date.month !== 7) return;
  for (const w of f.world) {
    if (w.fall) continue;
    const age = g.date.year - w.y;
    const p = age < 5 ? 0.14 : age < 20 ? 0.05 : 0.02;
    if (rng.chance(p)) {
      w.fall = g.date.year;
      chron(g, `${J(w.name, '이/가')} 선 지 ${age}년 만에 무너지다.`, 70);
      pnews(g, `${placeName(w.place)}의 ${J(w.name, '이/가')} 무너졌다.`);
      if (rng.chance(0.6)) line(g, 'world', rng.pick(T.WORLD_FALL)({ name: w.name, place: placeName(w.place), by: w.by, years: age }));
    } else if (age > 0 && age % 15 === 0 && rng.chance(0.5)) line(g, 'world', T.WORLD_HOLD[0]({ name: w.name, place: placeName(w.place), years: age }));
  }
  if (f.world.filter((w) => !w.fall).length >= 3 || !rng.chance(0.022)) return;
  // 어디서 서나: 남이 일군 고을급 개척촌, 남이 이긴 봉기의 고장, 먼 나라의 변방
  const spots = [];
  for (const [id, x] of Object.entries(g.frontier?.sites ?? {})) if (x.stage >= 3 && !x.chief && !f.world.some((w) => w.place === id && !w.fall)) spots.push({ place: id, by: x.byName, realm: realmOfPlace(id), w: '개척촌장' });
  for (const o of g.revolt?.orders ?? []) if (!o.mine && !o.ended && !f.world.some((w) => w.place === o.place && !w.fall)) spots.push({ place: o.place, by: byId(g, o.pid)?.name ?? null, realm: realmOfPlace(o.place), w: '봉기의 우두머리', order: o });
  for (const s of WORLD_SPOTS) { const pl = s.place ?? REALMS[s.realm]?.capital; if (pl && PLACES[pl] && !f.world.some((w) => w.place === pl && !w.fall) && D(g)?.place !== pl && R(g)?.capital !== pl) spots.push({ ...s, place: pl }); }
  if (!spots.length) return;
  const s = rng.pick(spots);
  const by = s.by ?? personName(rng, s.realm, 'm').full;
  const name = `${rng.pick(T.REALM_NAMES)} ${rng.chance(0.7) ? '공국' : '자유령'}`;
  if (s.order) s.order.ended = true;
  f.world.push({ id: f.seq++, name, place: s.place, by, who: s.w, y: g.date.year, fall: null });
  if (f.world.length > 12) f.world.splice(0, f.world.length - 12);
  chron(g, `${placeName(s.place)}에서 ${s.w} ${J(by, '이/가')} ${J(name, '을/를')} 세우다.`, 80);
  pnews(g, `${placeName(s.place)}에서 ${s.w} ${J(by, '이/가')} ${J(name, '을/를')} 선포했다.`);
  line(g, 'world', rng.pick(T.WORLD_RISE)({ name, place: placeName(s.place), by }));
}

function monthTick(g) {
  const f = S(g);
  f.month = [];
  if (g.over) return;
  const rng = ownRng(g, 11);
  worldTick(g, ownRng(g, 23));
  if (f.realm) realmTick(g, rng);
  else hintTick(g, rng);
}

/* ---------- 대 잇기 ---------- */
HOOKS.heir.push((g, rng0, old) => {
  const r = R(g); if (!r) return;
  const rng = ownRng(g, 37);
  r.gen += 1;
  r.legit = clamp(r.legit - 6, 0, 100);
  r.reign.push({ name: g.player.name, y: g.date.year });
  if (r.reign.length > 12) r.reign.shift();
  for (const c of Object.values(r.council)) if (c) c.loyal = clamp(c.loyal - 8, 0, 100);
  if (r.war) r.war.next = mi(g) + 2;
  chron(g, `${g.player.name}, ${fullName(r)}의 ${r.gen}대 ${J(RULER_WORD(r.kind), '이/가')} 되다.`, 110);
  log(g, `${r.gen}대 ${J(RULER_WORD(r.kind), '으로/로')} 왕좌에 앉았다.`);
  const oldP = old ? byId(g, old.id) : null;
  const rivals = (oldP?.childIds ?? []).map((id) => byId(g, id)).filter((p) => p && p.alive && p.id !== me(g).id && ageYears(p) >= 18 && !p.away);
  const p = rivals.sort((a, b) => (b.rivalry ?? 0) - (a.rivalry ?? 0) || (a.affection ?? 0) - (b.affection ?? 0))[0];
  if (p && rng.chance(clamp(0.2 + (p.rivalry ?? 0) / 160 - (p.affection ?? 0) / 300, 0.05, 0.8))) {
    queueScene(g, 'found_succession', { id: p.id, name: p.name, parent: (oldP?.sex ?? old?.sex) === 'f' ? '어머니' : '아버지' });
  }
  if (playerAge(g) < 15) line(g, 'court', `어린 ${RULER_WORD(r.kind)} 대신 재상 ${J(r.council.chancellor?.name ?? '집사', '이/가')} 섭정한다. 알현실 왕좌 옆에 작은 의자가 하나 놓였다.`);
});
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.newGame.push((g) => { g.founding = null; S(g); });
HOOKS.migrate.push((g) => { S(g); });

/* ---------- 화면 연결점 ---------- */
export function foundingLines(g) { return (g.founding?.month ?? []).slice(0, 2).map((x) => ({ ...x })); }
export function foundingLine(g) { return foundingLines(g)[0]?.text ?? null; }
const legitWord = (v) => (v >= 75 ? '누구도 의심하지 않는다' : v >= 55 ? '대체로 받아들인다' : v >= 35 ? '수군거림이 남아 있다' : v >= 18 ? '찬탈자라 부르는 사람이 많다' : '거의 아무도 인정하지 않는다');
const stabWord = (v) => (v >= 70 ? '단단하다' : v >= 50 ? '버틸 만하다' : v >= 30 ? '흔들린다' : v >= 15 ? '위태롭다' : '무너지기 직전이다');
const loyalWord = (v) => (v >= 70 ? '믿을 만하다' : v >= 45 ? '아직은 내 편이다' : v >= 30 ? '속을 모르겠다' : '마음이 떠났다');
const RECOG_WORD = { yes: '나라로 인정했다', tribute: '공물을 받고 인정했다', no: '인정하지 않는다' };
export function foundingInfo(g) {
  const f = S(g); const r = f.realm;
  const rd = foundingReady(g);
  return {
    ready: rd ? { place: placeName(rd.land.place), base: { domain: '영지', frontier: '개척촌', revolt: '봉기로 얻은 고장' }[rd.land.base], have: rd.have, need: { ...NEED }, missing: rd.missing.map((k) => NEED_WORD[k]), causes: rd.causes.map((x) => x.w), ok: rd.ok } : null,
    realm: r ? {
      name: fullName(r), kind: KIND_WORD(r.kind), title: RULER_WORD(r.kind), dyn: r.dyn, capital: placeName(r.capital), founder: r.founder, y: r.y, years: g.date.year - r.y, gen: r.gen,
      legit: Math.round(r.legit), legitWord: legitWord(r.legit), stab: Math.round(r.stab), stabWord: stabWord(r.stab),
      crown: r.crown ? CROWN_WORD[r.crown] : '아직 관을 쓰지 않았다', law: r.law ? LAWS[r.law].short : null,
      council: Object.entries(r.council).filter(([, c]) => c).map(([k, c]) => ({ role: ROLES[k], name: c.name, word: loyalWord(c.loyal) })),
      recog: Object.entries(r.recog).filter(([, v]) => v).map(([n, v]) => ({ realm: short(n), word: RECOG_WORD[v] })),
      war: r.war ? { realm: short(r.war.realm), months: r.war.months, word: r.war.score > 0 ? '우리가 밀어붙인다' : r.war.score < 0 ? '밀리고 있다' : '팽팽하다' } : null,
      reign: r.reign.map((x) => ({ ...x })),
    } : null,
    world: f.world.filter((w) => !w.fall).map((w) => ({ name: w.name, place: placeName(w.place), by: w.by, y: w.y })),
    fallen: f.world.filter((w) => w.fall).slice(-4).map((w) => ({ name: w.name, place: placeName(w.place), y: w.y, fall: w.fall })),
    past: f.past.map((x) => ({ ...x })),
    log: f.log.slice(-8).map((x) => ({ ...x })),
  };
}
