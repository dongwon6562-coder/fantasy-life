import '../src/content.js';
// 갈래 D(직업·장소·소속·모험·영지·전쟁·생산직·파티·위기)를 일부러 깨 보는 점검.
// - 아무 행동이나 고르고, 같은 행동을 여러 칸 고르고, 장면은 아무 선택지나 고른다.
// - 가끔 세상을 흔든다: 저장 왕복(예전 저장처럼 일부 상태를 지움), 위기·전쟁·역병, 감옥, 여행, 영지 주기·뺏기, 가게 없애기, 동료 죽이기, 돈 0.
// - 장면이 떠 있을 때 조건을 바꾸고(동료·영지·가게·위기 사라짐, 돈 0, 길 위, 감옥) 장면 글을 다시 그려 보고 고른다.
// 멈춤(예외)·undefined·NaN이 나오면 실패. 사용법: node tools/fuzzd.js [판 수] [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId, makePerson } from '../src/npc.js';
import { FAMILIES } from '../src/data.js';
import { PLACES } from '../src/places.js';
import { L, SCENES, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
SCENE_STRICT.on = true;
import { jail, isJailed } from '../src/crime.js';
import { grantFief } from '../src/domain/state.js';
import { domainReport } from '../src/domain/rule.js';
import { C as craftOf, craftStatus } from '../src/craft/core.js';
import { P as partyOf, members, partyStatus } from '../src/party/core.js';
import { CR, CRISES, startCrisis, crisisStatus } from '../src/crisis/core.js';

const N = +process.argv.find((a) => /^\d+$/.test(a)) || 16;
const verbose = process.argv.includes('-v');
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null\b/.test(t);
const errors = new Map(); // 같은 오류는 한 번만
let checks = 0;
function fail(kind, detail, seed, m) {
  const key = `${kind}: ${String(detail).split('\n').slice(0, 2).join(' | ')}`.slice(0, 300);
  if (!errors.has(key)) errors.set(key, { n: 0, seed, m });
  errors.get(key).n++;
}
const deepBad = (o, path = '') => {
  if (o == null) return null;
  if (typeof o === 'number') return Number.isFinite(o) ? null : path;
  if (typeof o === 'string') return /undefined|NaN/.test(o) ? path : null;
  if (typeof o === 'object') for (const [k, v] of Object.entries(o)) { const r = deepBad(v, `${path}.${k}`); if (r) return r; }
  return null;
};
const LEONIA = ['ern', 'harfen', 'verden', 'leocast', 'gruental'];
const ALL_PLACES = Object.keys(PLACES);
import { S, seaRoutesFrom } from '../src/sea/core.js';
import { setSail } from '../src/sea/voyage.js';
import { seaStatus } from '../src/sea/index.js';
import { deepStatus } from '../src/deep/index.js';
import { estateStatus } from '../src/estate/index.js';
import { E as EST } from '../src/estate/core.js';
import { vocationStatus, VOC_JOB_IDS } from '../src/vocation/index.js';
import { armyStatus } from '../src/army/index.js';
import { A as ARMY } from '../src/army/core.js';
import { exploreStatus } from '../src/explore/index.js';
import { beastsStatus, B as BEASTS, KIND_IDS as BEAST_KINDS, addAnimal as addBeast } from '../src/beasts/index.js';
import { tradeStatus, T as TRADE, GOOD_IDS as TRADE_GOODS } from '../src/trade/index.js';
import { contestStatus, C as CONTEST, FAIR_IDS } from '../src/contest/index.js';
import { houseStatus, H as HOUSE, ROOM_IDS as HOUSE_ROOMS } from '../src/house/index.js';
import { poorStatus, poorLine, P as POOR } from '../src/poor/index.js';
import { troupeStatus, troupeLine, T as TROUPE, ACT_IDS as TROUPE_ACTS } from '../src/troupe/index.js';
import { companyStatus, companyLine, companyState as COMPANY } from '../src/company/index.js';
import { heistStatus, heistLine, heistState as HEIST } from '../src/heist/index.js';
import { innStatus, innLine, I as INN, ROLE_IDS as INN_ROLES, REGULAR_IDS as INN_REGS } from '../src/inn/index.js';
import { mysteryStatus, M as MYSTERY, makeCase, KIND_IDS as MYSTERY_KINDS } from '../src/mystery/index.js';
import { E as EXPL, REGION_IDS as EXPL_REGIONS, FINDS as EXPL_FINDS } from '../src/explore/core.js';
import { V as VOC } from '../src/vocation/core.js';
import { WORK as VWORK } from '../src/jobs.js';
import { D as DEEP, RELIC_IDS } from '../src/deep/core.js';

function roundTrip(g, rng) {
  const copy = JSON.parse(JSON.stringify(g));
  // 예전 저장처럼: 뒤에 생긴 상태를 가끔 지운다
  if (rng.chance(0.3)) for (const k of ['crisis', 'party', 'craft']) if (rng.chance(0.5)) delete copy[k];
  if (rng.chance(0.3)) for (const k of ['fac', 'dungeons', 'nemeses', 'houses', 'placeNpcs', 'stats', 'gear', 'ancestors', 'expedition', 'lastSummons']) if (rng.chance(0.3)) delete copy.life[k];
  if (copy.domain && rng.chance(0.3)) for (const k of ['buildings', 'cheap', 'battles', 'wins', 'unrest', 'favor']) if (rng.chance(0.4)) delete copy.domain[k];
  if (copy.party && rng.chance(0.3)) for (const k of ['fallen', 'stories']) delete copy.party[k];
  setNextId(copy.nextId);
  runHooks('migrate', copy);
  return copy;
}

// 세상을 흔든다
function chaos(g, rng) {
  const life = L(g);
  const adult = playerAge(g) >= 15;
  const r = rng.int(0, 30);
  if (r === 0) return 'roundtrip';
  if (r === 1 && !CR(g).active) startCrisis(g, rng, rng.pick(Object.keys(CRISES)));
  else if (r === 2) { g.realm.balhart.war = true; g.realm.balhart.warMonths = 0; }
  else if (r === 3) { g.world.plague = true; g.world.plagueMonths = 3; }
  else if (r === 4 && adult && !isJailed(g)) jail(g, rng.int(1, 4));
  else if (r === 5 && !life.travel) life.travel = { to: rng.pick(ALL_PLACES), left: rng.int(1, 3), from: life.place };
  else if (r === 6 && adult && !g.domain) grantFief(g, { name: '흔들린 영지', place: rng.pick(LEONIA), liege: 'verden', pop: rng.int(120, 600) }, '시험');
  else if (r === 7) g.domain = null;
  else if (r === 8 && craftOf(g).shop) craftOf(g).shop = null;
  else if (r === 9) for (const p of members(g)) { p.alive = false; }
  else if (r === 10) g.player.money = 0;
  else if (r === 11) g.player.money += rng.int(200, 2000);
  else if (r === 12) { life.place = rng.pick(ALL_PLACES); life.travel = null; }
  else if (r === 13 && CR(g).active) CR(g).active = null;
  else if (r === 14) seaShake(g, rng);
  else if (r === 16) deepShake(g, rng);
  else if (r === 17) estateShake(g, rng);
  else if (r === 18 && adult && !isJailed(g)) vocationShake(g, rng);
  else if (r === 19 && adult && !isJailed(g)) armyShake(g, rng);
  else if (r === 20 && adult && !isJailed(g)) exploreShake(g, rng);
  else if (r === 21) beastShake(g, rng);
  else if (r === 22) tradeShake(g, rng);
  else if (r === 23) contestShake(g, rng);
  else if (r === 24) mysteryShake(g, rng);
  else if (r === 25) houseShake(g, rng);
  else if (r === 26) poorShake(g, rng);
  else if (r === 27) innShake(g, rng);
  else if (r === 28) troupeShake(g, rng);
  else if (r === 29) companyShake(g, rng);
  else if (r === 30) heistShake(g, rng);
  else if (r === 15 && adult && !life.travel && !isJailed(g)) { const port = rng.pick(['klein', 'portel', 'saltmare', 'saltrock']); life.place = port; const rt = rng.pick(seaRoutesFrom(g, port)); if (rt) setSail(g, rt.to, rt.months, { own: !!S(g).ship }); }
  return null;
}

// 장면이 떠 있는 동안 조건을 바꾼다
function stale(g, rng) {
  const life = L(g);
  const r = rng.int(0, 8);
  if (r === 0) for (const p of members(g)) p.alive = false;
  else if (r === 1) partyOf(g).members = [];
  else if (r === 2) g.domain = null;
  else if (r === 3) { const c = craftOf(g); c.shop = null; }
  else if (r === 4) CR(g).active = null;
  else if (r === 5) g.player.money = 0;
  else if (r === 6 && !life.travel) life.travel = { to: rng.pick(ALL_PLACES), left: 2, from: life.place };
  else if (r === 7 && playerAge(g) >= 15 && !isJailed(g)) jail(g, 2);
  else if (r === 8) { const sea = S(g); sea.ship = null; sea.pirate = null; sea.cargo = null; sea.lair = true; const d = DEEP(g); d.relics = []; d.lord = 'slain'; d.gate = 0; L(g).houses = []; EST(g).loans = []; EST(g).rentals = []; VOC(g).project = null; VOC(g).traps = 0; ARMY(g).campaign = null; ARMY(g).captive = null; EXPL(g).exp = null; EXPL(g).pack = []; EXPL(g).cache = []; if (VOC_JOB_IDS.includes(life.job?.id)) life.job = null; }
}
// 집과 재산을 흔든다 (src/estate/)
function estateShake(g, rng) {
  const e = EST(g);
  const life = L(g);
  if (rng.chance(0.5) && !life.houses.includes(life.place)) life.houses.push(life.place);
  if (rng.chance(0.3)) life.houses = [];
  e.loans = rng.chance(0.5) ? [{ id: 900 + rng.int(0, 99), lender: rng.pick(['shark', 'company', 'temple']), principal: rng.int(10, 900), due: g.date.year * 12 + g.date.month - rng.int(-3, 4), missed: rng.int(0, 4) }] : [];
  e.rentals = rng.chance(0.5) ? [{ id: 800, kind: rng.pick(['land', 'shop', 'house']), place: rng.pick(ALL_PLACES), tenant: rng.chance(0.5) ? '흔들 세입자' : null, rent: 5, cond: rng.int(0, 100), unpaid: rng.int(0, 3), value: 200 }] : [];
  e.deposits = rng.chance(0.4) ? [{ company: rng.chance(0.5) ? 'silverscale' : 'gone', name: '흔들 상단', amount: rng.int(10, 500), last: 40 }] : [];
}
// 군대를 흔든다 (src/army/)
function armyShake(g, rng) {
  const a = ARMY(g);
  const life = L(g);
  if (rng.chance(0.5)) { life.job = { id: 'soldier', place: rng.chance(0.7) ? life.place : rng.pick(ALL_PLACES), months: rng.int(0, 60), lastRank: 0 }; a.service = { unit: '흔들 백인대', rank: rng.int(0, 4), merit: rng.int(0, 700), months: rng.int(0, 80), place: life.job.place, term: rng.int(-2, 36), since: 0, awol: rng.int(0, 2) }; }
  else if (rng.chance(0.3)) a.service = null;
  a.campaign = a.service && rng.chance(0.4) ? { key: rng.pick(['balhart', 'garbes', 'bandits', 'realm_valhart', 'nothing']), name: '흔들 원정', kind: rng.pick(['realm', 'peace', 'politics']), foe: 'valhart', month: rng.int(0, 5), months: rng.int(1, 5), morale: rng.int(10, 90), marched: [] } : null;
  a.captive = !a.campaign && rng.chance(0.2) ? { by: '흔들 군', months: rng.int(0, 11), ransom: rng.int(10, 300), officer: rng.chance(0.3), war: rng.pick(['balhart', 'bandits', 'gone']) } : null;
  a.deserted = rng.chance(0.2) ? { year: g.date.year - rng.int(0, 12), at: 0, caught: rng.chance(0.5), unit: '흔들 백인대' } : a.deserted;
  a.veteran = rng.chance(0.2) ? { rank: rng.int(0, 4), years: rng.int(0, 20), unit: 'x', year: 500, pension: rng.int(0, 20) } : a.veteran;
  if (rng.chance(0.3)) a.scars.push({ id: rng.pick(['limp', 'nightmare', 'gone']), name: '흔들 상처', year: g.date.year });
}
// 짐승을 흔든다 (src/beasts/)
function beastShake(g, rng) {
  const b = BEASTS(g);
  if (rng.chance(0.6)) { const a = addBeast(g, rng.pick(BEAST_KINDS), { ageYears: rng.float(0, 30), trained: rng.int(0, 100), bond: rng.int(0, 100), form: '까마귀' }); if (a && rng.chance(0.2)) a.dying = 'old'; }
  if (rng.chance(0.2)) b.animals.push({ id: 999, kind: 'gone', name: 'x', born: 0, bond: 0, trained: 0, alive: true });
  if (rng.chance(0.2) && b.animals.length) b.animals[0].alive = false;
  if (rng.chance(0.2)) b.debt = rng.int(0, 20);
  b.animals = b.animals.filter((a) => a.kind !== 'gone' || rng.chance(0.5));
  if (b.animals.some((a) => a.kind === 'gone')) runHooks('migrate', g);
}
// 장사 길을 흔든다 (src/trade/)
function tradeShake(g, rng) {
  const t = TRADE(g);
  if (rng.chance(0.6)) { const k = rng.chance(0.1) ? 'gone' : rng.pick(TRADE_GOODS); t.cargo[k] = { qty: rng.int(0, 60), cost: rng.int(0, 2000) }; }
  if (rng.chance(0.3)) Object.assign(t.caravan, { wagons: rng.int(0, 6), guards: rng.int(0, 12), porters: rng.int(0, 8) });
  if (rng.chance(0.2)) t.house = { id: rng.chance(0.5) ? 'nope' : (g.history?.companies?.[0]?.id ?? 'nope'), name: '흔들 상회', level: rng.int(1, 5), branches: ['harfen'], since: 500 };
  if (rng.chance(0.2) && g.history?.companies?.length) { const c = rng.pick(g.history.companies); t.rival = { id: rng.chance(0.8) ? c.id : 'nope', name: c.name, heat: rng.int(0, 5), since: 0, thugs: rng.chance(0.5) }; }
  if (rng.chance(0.2)) t.debts.push({ who: '흔들 귀족', amt: rng.int(0, 300), cost: 10, due: 0 });
  if (rng.chance(0.2)) { t.profit = rng.int(-500, 5000); t.volume = rng.int(0, 900); }
  if (rng.chance(0.2)) t.banned[g.life?.place ?? 'ern'] = 99999;
  if (rng.chance(0.1)) { t.seen.nowhere = { at: 0, p: { gone: 5, silk: 9 } }; t.rumor = { pl: 'nowhere', good: 'gone', at: 0 }; if (t.house) t.house.branches.push('nowhere'); }
  if (rng.chance(0.1)) g.trade = JSON.parse(JSON.stringify(g.trade)); // 저장 왕복
  if (rng.chance(0.3)) runHooks('migrate', g);
}
// 내기와 겨루기를 흔든다 (src/contest/)
function contestShake(g, rng) {
  const c = CONTEST(g);
  if (rng.chance(0.4)) c.itch = rng.int(0, 100);
  if (rng.chance(0.3)) Object.assign(c.arena, { fame: rng.int(0, 90), wins: rng.int(0, 20), beastWins: rng.int(0, 12) });
  if (rng.chance(0.3)) c.fixed.push({ kind: rng.pick(['arena', 'fair']), fair: rng.chance(0.2) ? 'gone' : rng.pick(FAIR_IDS), place: rng.chance(0.2) ? 'nowhere' : rng.pick(ALL_PLACES), year: g.date.year, exposed: false, at: rng.int(0, 99999) });
  if (rng.chance(0.2)) c.banned[`${rng.pick(['gamble', 'arena', 'fair'])}:${g.life?.place ?? 'ern'}`] = 99999;
  if (rng.chance(0.2)) c.titles.push({ id: rng.pick(FAIR_IDS), place: rng.pick(ALL_PLACES), year: g.date.year, text: '흔들린 우승' });
  if (rng.chance(0.4)) { const k = rng.pick(['contest_gamble', 'contest_arena', 'contest_fair', 'contest_round', 'contest_urge']); queueScene(g, k, k === 'contest_fair' || k === 'contest_round' ? { fair: rng.chance(0.2) ? 'gone' : rng.pick(FAIR_IDS), round: rng.int(0, 2), foe: '흔들 상대', foeT: rng.int(0, 2) } : {}); }
  if (rng.chance(0.1)) g.contest = JSON.parse(JSON.stringify(g.contest));
  if (rng.chance(0.2)) { delete g.contest.arena; runHooks('migrate', g); }
  if (rng.chance(0.3)) runHooks('migrate', g);
}
// 풀리지 않은 일을 흔든다 (src/mystery/)
function mysteryShake(g, rng) {
  const m = MYSTERY(g);
  if (rng.chance(0.5) && g.life?.place) { const c = makeCase(g, rng, g.life.place, rng.pick(MYSTERY_KINDS)); c.heat = rng.int(0, 4); if (rng.chance(0.3)) c.clues.push('흔들린 단서'); if (rng.chance(0.2)) c.at -= rng.int(0, 60); }
  if (rng.chance(0.2) && m.cases.length) { const c = rng.pick(m.cases); c.state = rng.pick(['wrong', 'framed', 'cold']); c.accused = c.suspects[0].name; c.ancestor = true; c.at -= 200; c.closedAt = 0; m.cases = m.cases.filter((x) => x !== c); m.cold.push(c); }
  if (rng.chance(0.2)) m.grudge = { gang: rng.pick(['rats', 'glove', 'gone']), at: 0 };
  if (rng.chance(0.2)) m.cold.push({ kind: 'gone', suspects: [] });
  if (rng.chance(0.3)) { const k = rng.pick(['mystery_case', 'mystery_offer', 'mystery_revenge', 'mystery_old']); queueScene(g, k, rng.chance(0.3) ? { gang: rng.pick(['rats', 'gone']) } : { id: rng.chance(0.2) ? 999 : (m.cases[0]?.id ?? m.cold[0]?.id ?? 1) }); }
  if (rng.chance(0.1)) g.mystery = JSON.parse(JSON.stringify(g.mystery));
  runHooks('migrate', g);
}
// 집과 살림을 흔든다 (src/house/)
function houseShake(g, rng) {
  const h = HOUSE(g), life = L(g);
  if (rng.chance(0.4) && life.place && !life.houses.includes(life.place)) life.houses.push(life.place);
  for (const pl of life.houses) if (rng.chance(0.3) && h.homes[pl]) { h.homes[pl].kind = rng.pick(['hut', 'house', 'odd']); h.homes[pl].rooms.push(rng.pick([...HOUSE_ROOMS, 'gone'])); }
  if (rng.chance(0.2)) h.build = { place: rng.chance(0.2) ? 'nowhere' : life.place ?? 'ern', kind: rng.pick(['hut', 'house', 'rebuild']), left: rng.int(-1, 6), cost: 50, cond: rng.int(0, 90), events: 0, started: 0, name: '흔들 집' };
  if (rng.chance(0.2)) h.moving = { to: rng.chance(0.2) ? 'nowhere' : rng.pick(ALL_PLACES), from: 'ern', year: 500, family: 2 };
  if (rng.chance(0.2) && life.houses.length) { const pl = rng.pick(life.houses); life.houses = life.houses.filter((x) => x !== pl); }
  if (rng.chance(0.2) && g.estate?.homes) for (const k of Object.keys(g.estate.homes)) g.estate.homes[k].cond = rng.int(0, 100);
  if (rng.chance(0.3)) { const k = rng.pick(['house_build', 'house_work', 'house_warm', 'house_room', 'house_event', 'house_heir', 'house_move', 'house_move_house']); queueScene(g, k, { ev: rng.pick(['help', 'cheat', 'fire', 'thief', 'neighbor', 'gone']), topic: rng.int(0, 5), who: '흔들 이웃', to: rng.pick([...ALL_PLACES, 'nowhere']) }); }
  if (rng.chance(0.1)) g.house = JSON.parse(JSON.stringify(g.house));
  runHooks('migrate', g);
}
// 극단을 흔든다 (src/troupe/)
function troupeShake(g, rng) {
  const s = TROUPE(g), life = L(g);
  if (rng.chance(0.4) && !s.t) s.t = { name: rng.chance(0.1) ? 3 : '흔들 극단', own: rng.chance(0.5), leader: '흔들', place: rng.chance(0.15) ? 'nowhere' : rng.chance(0.7) ? life.place ?? 'ern' : rng.pick(ALL_PLACES), members: [], fame: rng.int(-5, 120), wagon: rng.int(-5, 120), stay: rng.int(0, 5), shows: 0, earned: 0, gens: 1, myAct: rng.pick([...TROUPE_ACTS, null, 'gone']), lead: rng.pick([null, 'clown', 'gone']) };
  const t = s.t;
  if (t && typeof t === 'object') {
    if (rng.chance(0.5)) t.members = [...(Array.isArray(t.members) ? t.members : []), rng.chance(0.2) ? { act: 'gone' } : { id: rng.int(1, 9), name: '흔들 단원', act: rng.pick(TROUPE_ACTS), skill: rng.int(0, 90), mood: rng.int(0, 100), love: rng.pick([0, 70]), since: 0 }];
    if (rng.chance(0.2)) t.moving = rng.pick([null, life.place ?? 'ern', 'nowhere']);
  }
  if (rng.chance(0.2)) s.banned[rng.pick(ALL_PLACES)] = rng.int(0, 7000);
  if (rng.chance(0.2)) s.t = null;
  if (rng.chance(0.3)) { const k = rng.pick(['troupe_arrive', 'troupe_show', 'troupe_manage', 'troupe_fire', 'troupe_move', 'troupe_event']); queueScene(g, k, { ev: rng.pick(['censor', 'road', 'quarrel', 'love', 'lover', 'feast', 'theft', 'gone']), kind: rng.pick(['axle', 'bandits', 'river', 'sick', 'mud', 'gone']), a: rng.int(0, 9), b: rng.int(0, 9), name: rng.pick(['잿빛 수레', '없는 극단']), pl: life.place }); }
  if (rng.chance(0.1)) g.troupe = JSON.parse(JSON.stringify(g.troupe));
  runHooks('migrate', g);
}
// 한탕을 흔든다 (src/heist/)
function heistShake(g, rng) {
  const s = HEIST(g), life = L(g);
  if (rng.chance(0.4) && !s.plan) s.plan = { kind: rng.pick(['vault', 'manor', 'temple', 'tax', 'gone']), place: rng.chance(0.15) ? 'nowhere' : rng.chance(0.7) ? life.place ?? 'ern' : rng.pick(ALL_PLACES), name: rng.chance(0.1) ? 3 : '흔들 금고', owner: '흔들 상단', guard: rng.int(-5, 120), prize: rng.int(-10, 900), crew: [], intel: rng.int(-5, 120), prep: rng.chance(0.2) ? null : { tools: rng.chance(0.5), escape: 1 }, alarm: rng.int(-5, 120), day: rng.pick([null, 'x', rng.int(6000, 6100)]) };
  const p = s.plan;
  if (p && typeof p === 'object' && rng.chance(0.5)) p.crew = [...(Array.isArray(p.crew) ? p.crew : []), rng.chance(0.2) ? { role: 'gone' } : { id: rng.int(1, 9), name: '흔들 일행', role: rng.pick(['lock', 'muscle', 'inside', 'lookout', 'driver', 'forger']), skill: rng.int(0, 90), greed: rng.int(0, 100), loyal: rng.int(0, 100), fee: 10 }];
  if (rng.chance(0.2)) s.loot = rng.chance(0.2) ? { value: 'x' } : { value: rng.int(0, 500), kind: rng.pick(['vault', 'gone']), from: '흔들 금고', owner: '흔들', at: 0, hot: rng.int(0, 100) };
  if (rng.chance(0.2)) s.hunt = rng.chance(0.2) ? { by: 3 } : { by: '흔들 추적자', pow: rng.int(10, 70), clue: rng.int(-5, 120), until: rng.int(0, 7000), target: '흔들 금고', place: rng.pick([life.place ?? 'ern', 'nowhere']), kind: 'vault' };
  if (rng.chance(0.15)) s.split = rng.chance(0.3) ? null : { value: rng.int(0, 300), crew: [], name: '흔들' };
  if (rng.chance(0.1)) s.grudge = { names: ['흔들 일행'], at: rng.int(0, 7000) };
  if (rng.chance(0.2)) s.plan = null;
  if (rng.chance(0.3)) { const k = rng.pick(['heist_target', 'heist_crew', 'heist_scout', 'heist_day', 'heist_twist', 'heist_split', 'heist_event']); queueScene(g, k, { ev: rng.pick(['caught', 'close', 'rat', 'blab', 'greed', 'informant', 'gone']), a: rng.int(0, 9), who: rng.pick(['흔들 일행', 3]), twist: rng.pick(['shift', 'lock', 'witness', 'rival', 'panic', 'guard', 'papers', 'gone']), app: rng.pick(['quiet', 'loud', 'gone']), base: rng.pick([40, 'x']) }); }
  if (rng.chance(0.1)) g.heist = JSON.parse(JSON.stringify(g.heist));
  runHooks('migrate', g);
}
// 용병단을 흔든다 (src/company/)
function companyShake(g, rng) {
  const s = COMPANY(g), life = L(g);
  if (rng.chance(0.4) && !s.c) s.c = { name: rng.chance(0.1) ? 3 : '흔들 용병단', sign: rng.pick(['wolf', 'crow', 'gone']), place: rng.chance(0.15) ? 'nowhere' : life.place ?? 'ern', men: rng.int(-5, 90), vets: [], drill: rng.int(-5, 120), morale: rng.int(-5, 120), chest: rng.int(-10, 200), fame: rng.int(-5, 120), split: rng.pick(['equal', 'gone']), loot: rng.pick(['free', 'gone']), contract: null, regent: rng.pick([null, null, '흔들 부관', 7]) };
  const c = s.c;
  if (c && typeof c === 'object') {
    if (rng.chance(0.5)) c.vets = [...(Array.isArray(c.vets) ? c.vets : []), rng.chance(0.2) ? { role: 'gone' } : { id: rng.int(1, 9), name: '흔들 부관', role: rng.pick(['lt', 'bearer', 'pike']), skill: rng.int(0, 90), loyal: rng.int(0, 100), since: 0 }];
    if (rng.chance(0.3)) c.contract = rng.chance(0.2) ? { where: 'nowhere' } : { kind: rng.pick(['war', 'guard', 'lord', 'beast']), by: '흔들 고용주', side: rng.pick(['leonia', 'valhart', null]), foe: rng.pick(['valhart', 'leonia', null]), where: rng.chance(0.7) ? life.place ?? 'ern' : rng.pick(ALL_PLACES), months: 4, left: rng.int(-1, 6), pay: rng.int(0, 60), bonus: 10, danger: rng.int(1, 3), temper: rng.pick(['fair', 'sly', 'stingy']), started: rng.chance(0.7), won: 0, lost: 0, unpaid: rng.int(0, 30), rival: rng.pick([null, 'iron', 'gone']) };
  }
  if (rng.chance(0.2)) s.families.push(rng.chance(0.2) ? { dead: 3 } : { id: rng.int(1, 50), dead: '흔들 창병', kin: '늙은 어머니', place: life.place ?? 'ern', since: 0, helped: rng.pick([null, 'paid']), pension: rng.chance(0.3) });
  if (rng.chance(0.15)) s.banner = rng.chance(0.2) ? { sign: 'gone' } : { sign: 'wolf', name: '잿빛 늑대', motto: '흔들', founder: '흔들', founded: 500, gens: 1, honors: [], stains: 0, raised: 1 };
  if (rng.chance(0.1)) s.hunted[rng.pick(['leonia', 'valhart'])] = rng.int(0, 7000);
  if (rng.chance(0.2)) s.c = null;
  if (rng.chance(0.3)) { const k = rng.pick(['company_found', 'company_board', 'company_fight', 'company_manage', 'company_rules', 'company_take', 'company_event']); queueScene(g, k, { ev: rng.pick(['maimed', 'sack', 'unpaid', 'turn', 'ransom', 'rival', 'mutiny', 'widow', 'desert', 'gone']), a: rng.int(0, 9), f: rng.int(0, 50), r: rng.pick(['iron', 'gone']), offer: rng.int(0, 90), by: '흔들 고용주', owed: rng.int(0, 90), mid: rng.chance(0.5) }); }
  if (rng.chance(0.1)) g.company = JSON.parse(JSON.stringify(g.company));
  runHooks('migrate', g);
}
// 내 가게를 흔든다 (src/inn/)
function innShake(g, rng) {
  const s = INN(g), life = L(g);
  if (rng.chance(0.4) && !s.inn) s.inn = { place: rng.chance(0.15) ? 'nowhere' : rng.chance(0.7) ? life.place ?? 'ern' : rng.pick(ALL_PLACES), kind: rng.pick(['tavern', 'inn', 'odd']), name: rng.chance(0.1) ? 7 : '흔들 가게', rooms: rng.int(-1, 5), fame: rng.int(-10, 120), workers: [], regulars: [], backroom: rng.chance(0.2) ? null : {} };
  const inn = s.inn;
  if (inn && typeof inn === 'object') {
    if (rng.chance(0.4)) inn.workers = [...(Array.isArray(inn.workers) ? inn.workers : []), rng.chance(0.2) ? { role: 'gone' } : { id: rng.int(1, 9), name: '흔들 일꾼', role: rng.pick(INN_ROLES), skill: rng.int(0, 90), loyal: rng.int(0, 100), since: 0, honest: rng.chance(0.5) }];
    if (rng.chance(0.4)) inn.regulars = [...(Array.isArray(inn.regulars) ? inn.regulars : []), { id: rng.pick([...INN_REGS, 'gone']), mood: rng.int(0, 100), tab: rng.int(0, 60) }];
    if (rng.chance(0.3)) Object.assign(inn, { price: rng.pick(['cheap', 'fair', 'dear', 'odd']), arrears: rng.int(0, 120), taxOwed: rng.int(0, 80), dodged: rng.int(0, 80), heat: rng.int(0, 100), clean: rng.int(0, 100) });
    if (rng.chance(0.2)) inn.rival = rng.chance(0.2) ? { name: 3 } : { name: '흔들 경쟁', power: rng.int(-5, 100) };
    if (rng.chance(0.2)) inn.gang = rng.chance(0.2) ? 'x' : { id: rng.pick(['rats', 'glove', 'gone']), state: rng.pick(['paid', 'refused', 'stood']) };
    if (rng.chance(0.2) && inn.backroom && typeof inn.backroom === 'object') Object.assign(inn.backroom, { gamble: rng.chance(0.5), smuggle: rng.chance(0.5) });
  }
  if (rng.chance(0.2)) s.inn = null;
  if (rng.chance(0.2)) s.lost.push(rng.chance(0.2) ? null : { place: rng.pick(ALL_PLACES), name: '흔들 옛 가게', kind: rng.pick(['tavern', 'inn']), year: 500, how: 'x', gens: 2 });
  if (rng.chance(0.3)) { const k = rng.pick(['inn_open', 'inn_work', 'inn_manage', 'inn_price', 'inn_hire', 'inn_fire', 'inn_event']); queueScene(g, k, { ev: rng.pick(['arrears', 'tax', 'brawl', 'rumor', 'guest', 'newreg', 'regular', 'worker', 'poach', 'guard', 'gang', 'gamble', 'smuggle', 'rival_open', 'rival', 'gone']), reg: rng.pick([...INN_REGS, 'gone']) }); }
  if (rng.chance(0.1)) g.inn = JSON.parse(JSON.stringify(g.inn));
  runHooks('migrate', g);
}
// 밑바닥 살이를 흔든다 (src/poor/)
function poorShake(g, rng) {
  const p = POOR(g), life = L(g);
  if (rng.chance(0.3)) life.home = rng.pick(['street', 'inn', 'rent', 'family', 'own']);
  if (rng.chance(0.3)) g.player.money = rng.int(0, 400);
  p.hunger = rng.int(0, 4); p.lowMonths = rng.int(0, 10);
  if (rng.chance(0.3)) p.boss[life.place ?? 'ern'] = rng.pick(['paid', 'refused', 'joined']);
  if (rng.chance(0.3)) p.friends[rng.pick(['king', 'hag', 'kid', 'knight', 'widow', 'gone'])] = rng.int(0, 100);
  if (rng.chance(0.2)) p.bond = rng.chance(0.2) ? { owed: 'x', place: 'nowhere' } : { owed: rng.int(-5, 200), place: rng.chance(0.7) ? life.place ?? 'ern' : rng.pick(ALL_PLACES), master: '흔들 감독', start: 0, kind: rng.pick(['salt', 'quarry', 'gone']) };
  if (rng.chance(0.2)) p.bondsmen.push(rng.chance(0.2) ? { bad: 1 } : { name: rng.pick(['흔들 일꾼', '흔들 둘']), place: rng.chance(0.7) ? life.place ?? 'ern' : rng.pick(ALL_PLACES), since: 0, owed: rng.int(-3, 60) });
  if (rng.chance(0.2)) p.built[rng.pick(ALL_PLACES)] = 500;
  if (rng.chance(0.2)) p.lowest = { y: 500, place: rng.pick([...ALL_PLACES, 'nowhere']) };
  if (rng.chance(0.2) && g.estate) g.estate.loans.push({ id: g.estate.seq++, lender: 'shark', principal: rng.int(10, 200), due: 0, missed: rng.int(0, 4), from: 'harfen' });
  if (rng.chance(0.3)) { const k = rng.pick(['poor_boss', 'poor_slum', 'poor_chance', 'poor_rise', 'poor_bond', 'poor_bond_work', 'poor_alms', 'poor_hire', 'poor_bondsman']); queueScene(g, k, { ev: rng.pick(['share', 'kid', 'winter', 'gang', 'sick', 'porter', 'scribe', 'old', 'flee', 'beg', 'gone']), loan: rng.int(0, 5), name: p.bondsmen[0]?.name ?? '없는 이' }); }
  if (rng.chance(0.1)) g.poor = JSON.parse(JSON.stringify(g.poor));
  runHooks('migrate', g);
}
// 지도에 없는 땅을 흔든다 (src/explore/)
function exploreShake(g, rng) {
  const e = EXPL(g);
  const life = L(g);
  const fids = [...Object.keys(EXPL_FINDS), 'gone'];
  if (rng.chance(0.5)) {
    const region = rng.pick([...EXPL_REGIONS, 'nowhere']);
    e.exp = { region, from: rng.chance(0.8) ? life.place : rng.pick(ALL_PLACES), phase: rng.pick(['out', 'back']), leg: rng.int(0, 6), legs: rng.int(1, 5), back: rng.int(0, 3), food: rng.int(-1, 8), porters: rng.int(0, 2), morale: rng.int(0, 100), lost: rng.int(0, 1), lostRun: rng.int(0, 3), hungry: rng.int(0, 3), mule: rng.chance(0.5), guide: false, months: rng.int(0, 9), finds: [{ id: rng.pick(fids), region, site: null, year: 500 }], sites: [], dead: rng.chance(0.3) ? ['흔들'] : [], comps: [], started: 0 };
    if (region === 'nowhere') runHooks('migrate', g);
  } else if (rng.chance(0.3)) e.exp = null;
  if (rng.chance(0.4)) e.pack.push({ id: rng.pick(fids), region: rng.pick(EXPL_REGIONS), site: null, year: 500 });
  if (rng.chance(0.3)) e.cache.push({ id: rng.pick(fids), region: rng.pick(EXPL_REGIONS), site: null, year: 500 });
  e.pack = e.pack.filter((f) => EXPL_FINDS[f.id]); e.cache = e.cache.filter((f) => EXPL_FINDS[f.id]);
  if (rng.chance(0.2)) e.rivals.forEach((r) => { r.prog = rng.int(0, 8); });
}
// 새 일 갈래를 흔든다 (src/vocation/)
function vocationShake(g, rng) {
  const v = VOC(g);
  const life = L(g);
  const id = rng.pick(VOC_JOB_IDS);
  if (rng.chance(0.6) && VWORK[id]) life.job = { id, place: rng.chance(0.7) ? life.place : rng.pick(ALL_PLACES), months: rng.int(0, 80), lastRank: 0 };
  for (const k of ['healing', 'music', 'alchemy', 'building', 'hunting', 'letters']) if (rng.chance(0.3)) g.player.skills[k] = rng.int(0, 100);
  v.project = rng.chance(0.4) ? { id: rng.pick(['ballad', 'book', 'elixir', 'stone', 'build', 'gone']), voc: rng.pick(['bard', 'teacher', 'alchemy', 'builder', 'healer']), name: '흔들 큰일', prog: rng.int(0, 30), need: rng.int(5, 25), started: 0 } : null;
  v.traps = rng.int(0, 6); v.trapAt = rng.pick(ALL_PLACES); v.pelts = rng.int(0, 30); v.potions = rng.int(0, 10);
  v.school = rng.chance(0.2) ? { place: rng.pick(ALL_PLACES), name: '흔들 학당', year: 500 } : v.school;
  if (rng.chance(0.2)) v.banned[life.place] = g.date.year * 12 + g.date.month + rng.int(-2, 12);
  if (rng.chance(0.2)) v.paths[rng.pick(['royal_physician', 'court_bard', 'school', 'philosopher', 'beast_slayer', 'nonsense'])] = 600;
}
// 깊은 구렁 상태를 흔든다 (src/deep/)
function deepShake(g, rng) {
  const d = DEEP(g);
  d.gate = rng.pick([0, 5, 10, 20, 25, 30]);
  d.relics = Array.from({ length: rng.int(0, 5) }, () => ({ id: rng.pick(RELIC_IDS), known: rng.chance(0.5) }));
  d.lord = rng.pick(['alive', 'alive', 'pact', 'slain', 'sealed']);
  d.ally = rng.chance(0.3) ? { name: '흔들린 탐사대', pow: 40 } : null;
  if (rng.chance(0.3) && playerAge(g) >= 15 && !isJailed(g)) { L(g).place = 'gorge'; L(g).travel = null; }
}
// 바다 상태를 흔든다 (src/sea/)
function seaShake(g, rng) {
  const sea = S(g);
  sea.ship = rng.chance(0.5) ? { name: '흔들배', kind: rng.pick(['sloop', 'raider', 'brig']), hull: rng.int(10, 100), speed: 8, unpaid: rng.int(0, 2) } : null;
  sea.pirate = rng.chance(0.4) ? { rank: rng.int(0, 3), raids: rng.int(0, 20), share: 0 } : null;
  sea.cargo = rng.chance(0.4) ? { good: rng.pick(['salt', 'grain', 'spice']), qty: rng.int(1, 30), cost: 50, from: 'klein', at: 'klein' } : null;
  sea.hunted = rng.int(0, 60);
}

function checkState(g, seed, m) {
  checks++;
  const p = g.player;
  for (const [k, v] of Object.entries({ money: p.money, fatigue: p.fatigue, stress: p.stress, renown: L(g).renown, notoriety: L(g).notoriety })) if (!Number.isFinite(v)) fail('NaN 값', k, seed, m);
  if (p.money < 0) fail('돈이 음수', p.money, seed, m);
  for (const [name, fn] of [['partyStatus', partyStatus], ['crisisStatus', crisisStatus], ['craftStatus', craftStatus], ['domainReport', (x) => (x.domain ? domainReport(x) : null)], ['seaStatus', seaStatus], ['deepStatus', deepStatus], ['estateStatus', estateStatus], ['vocationStatus', vocationStatus], ['armyStatus', armyStatus], ['exploreStatus', exploreStatus], ['beastsStatus', beastsStatus], ['tradeStatus', tradeStatus], ['contestStatus', contestStatus], ['mysteryStatus', mysteryStatus], ['houseStatus', houseStatus], ['poorStatus', poorStatus], ['poorLine', poorLine], ['innStatus', innStatus], ['innLine', innLine], ['troupeStatus', troupeStatus], ['troupeLine', troupeLine], ['companyStatus', companyStatus], ['companyLine', companyLine], ['heistStatus', heistStatus], ['heistLine', heistLine]]) {
    try { const r = deepBad(fn(g)); if (r) fail(`${name}에 나쁜 값`, r, seed, m); } catch (e) { fail(`${name} 예외`, e.stack, seed, m); }
  }
  if (partyOf(g).members.includes(g.player.id)) fail('내가 내 동료 명단에 있음', g.player.id, seed, m);
  if (playerAge(g) < 15 && members(g).some((x) => x.comp.hired)) fail('아이가 용병을 데리고 있음', playerAge(g), seed, m);
  const d = g.domain;
  if (d && (!Number.isFinite(d.pop) || !Number.isFinite(d.morale) || !Number.isFinite(d.treasury))) fail('영지 NaN', JSON.stringify({ pop: d.pop, morale: d.morale, treasury: d.treasury }), seed, m);
}

function play(seed) {
  const fams = FAMILIES.map((f) => f.id);
  let g = newGame({ name: '시험', sex: seed % 2 ? 'm' : 'f', familyId: fams[seed % fams.length], mode: 'free', seed });
  const rng = () => rngOf(g);
  let m = 0;
  const maxM = 12 * 95;
  while (m++ < maxM && !g.over) {
    // 대 잇기를 꼭 겪게: 서른다섯에 자식이 없으면 하나 들이고, 쉰이 넘으면 가끔 죽는다
    const meP = me(g);
    if (playerAge(g) >= 35 && !meP.childIds.some((id) => g.people.find((p) => p.id === id)?.alive)) {
      const c = makePerson(rng(), { ageMonths: 12 * rng().int(15, 20), lastName: meP.lastName, fatherId: meP.sex === 'm' ? meP.id : null, motherId: meP.sex === 'f' ? meP.id : null });
      c.known = true; c.affection = 60; g.people.push(c); meP.childIds.push(c.id); g.nextId = Math.max(g.nextId ?? 0, c.id + 1);
    }
    if (playerAge(g) >= 50 && rng().chance(0.03)) L(g).pendingDeath = '오래된 병';
    if (playerAge(g) >= 14 && rng().chance(0.025)) { if (chaos(g, rng()) === 'roundtrip') g = roundTrip(g, rng()); }
    const acts = availableActions(g);
    if (!acts.length) { fail('할 수 있는 행동이 없음', `${L(g).place} jailed=${isJailed(g)} travel=${!!L(g).travel}`, seed, m); break; }
    const n = slotsFor(g);
    const same = rng().chance(0.3) ? rng().pick(acts) : null;
    const choices = Array.from({ length: n }, () => ({ id: (same ?? rng().pick(acts)).id }));
    let res;
    try { res = endMonth(g, choices); } catch (e) { fail('endMonth 예외', e.stack, seed, m); return; }
    for (const r of res ?? []) if (bad(r.text)) fail('나쁜 행동 글', `${r.id ?? ''} ${r.text}`, seed, m);
    for (const x of g.news) if (bad(x.text)) fail('나쁜 소식', x.text, seed, m);
    let guard = 0;
    while (g.pendingEvent && guard++ < 4) {
      const pe = g.pendingEvent;
      const s = L(g).scene;
      if (bad(pe.title) || bad(pe.text) || pe.choices.some(bad)) fail('나쁜 장면', `${s?.kind ?? pe.id} | ${pe.title} | ${pe.text} | ${pe.choices.join(' / ')}`, seed, m);
      if (s && rng().chance(0.3)) {
        stale(g, rng());
        const def = SCENES[s.kind];
        if (!(def.need && !def.need(g, s))) try {
          const t = def.title(g, s); const x = def.text(g, s); const cs = def.choices(g, s) ?? [];
          if (bad(t) || bad(x) || cs.some((c) => bad(c.label))) fail('조건 바뀐 뒤 나쁜 장면 글', `${s.kind} | ${t} | ${x}`, seed, m);
        } catch (e) { fail(`조건 바뀐 뒤 장면 그리기 예외 (${s.kind})`, e.stack, seed, m); }
      }
      const idx = s?.kind === 'heir' ? 0 : rng().int(0, Math.max(0, pe.choices.length - 1));
      try {
        const out = resolveEvent(g, rng(), idx);
        if (bad(out)) fail('나쁜 장면 결과', `${s?.kind ?? pe.id} | ${out}`, seed, m);
      } catch (e) { fail(`장면 고르기 예외 (${s?.kind ?? pe.id})`, e.stack, seed, m); g.pendingEvent = null; L(g).scene = null; }
    }
    try { checkState(g, seed, m); } catch (e) { fail('점검 예외', e.stack, seed, m); }
  }
  return { seed, years: Math.floor(m / 12), gen: L(g).gen, over: g.over };
}

const runs = [];
for (let i = 0; i < N; i++) {
  const seed = 70000 + i * 7919;
  runs.push(play(seed));
  if (verbose) console.log(runs.at(-1));
}
console.log(`${N}판 · 점검 ${checks}번 · 대 잇기 최대 ${Math.max(...runs.map((r) => r?.gen ?? 1))}대`);
for (const [k, v] of errors) console.log(`✗ ${k}  (×${v.n}, seed ${v.seed}, ${v.m}달째)`);
console.log(errors.size ? `FAIL ${errors.size}` : 'OK');
if (errors.size) process.exit(1);
