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
import { L, SCENES, SCENE_STRICT } from '../src/adventure/core.js';
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
  const r = rng.int(0, 16);
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
  else if (r === 8) { const sea = S(g); sea.ship = null; sea.pirate = null; sea.cargo = null; sea.lair = true; const d = DEEP(g); d.relics = []; d.lord = 'slain'; d.gate = 0; }
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
  for (const [name, fn] of [['partyStatus', partyStatus], ['crisisStatus', crisisStatus], ['craftStatus', craftStatus], ['domainReport', (x) => (x.domain ? domainReport(x) : null)], ['seaStatus', seaStatus], ['deepStatus', deepStatus]]) {
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
