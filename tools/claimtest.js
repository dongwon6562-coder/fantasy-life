import './lsshim.js';
import '../src/content.js';
// 숨은 왕가의 피 점검: 드러남(간직·더 알아봄·태움), 행동이 뜻 있는 형편에서만 보이는지, 증거 찾기·흔적 지우기,
// 꼬이는 사람들(귀족 동맹·팔기·밀정·교단·망명 궁정), 자객, 또 하나의 왕손, 왕위 주장과 사람 모으기,
// 왕관의 날(진군·대공·기다림), 가짜 왕손, 대 잇기, 옛 저장, 여러 삶.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { run as runHooks } from '../src/hooks.js';
import { claimState, claimInfo } from '../src/claim/index.js';
import { makePerson } from '../src/npc.js';
import { crimeState } from '../src/crime.js';
import { politicsState } from '../src/politics/index.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t === 'string' && /undefined|NaN|\[object|null|\$\{/.test(t);
const seen = { acts: {}, scenes: {} };
const samples = [];
const ACTS = ['claim_search', 'claim_hide', 'claim_declare', 'claim_rally', 'claim_forge', 'work', 'rest'];
const homePlace = new WeakMap();

function adult(seed, { age = 30, place = 'ern', sex } = {}) {
  const g = newGame({ name: '바우', sex: sex ?? (seed % 2 ? 'm' : 'f'), familyId: 'farmer', mode: 'free', seed });
  me(g).ageMonths = age * 12;
  L(g).place = place; L(g).home = 'family';
  const R = realmState(g); R.cur = PLACES[place]?.realm ?? 'leonia'; R.last = place;
  g.player.money = 300; g.player.familyMoney = 300;
  homePlace.set(g, place);
  return g;
}
function person(g, opts = {}) {
  const p = makePerson(rngOf(g), { ageMonths: (opts.age ?? 28) * 12, job: opts.job ?? 'farmer', sex: opts.sex });
  p.known = true; p.place = opts.place ?? homePlace.get(g) ?? 'ern'; p.affection = opts.aff ?? 20; p.childIds ??= []; g.people.push(p);
  return p;
}
const idxOf = (re) => (pe) => Math.max(0, pe.choices.findIndex((c) => re.test(c)));
function resolveAll(g, pick = {}) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    seen.scenes[kind] = (seen.scenes[kind] ?? 0) + 1;
    ok(!bad(pe.title) && !bad(pe.text) && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    let idx = rngOf(g).int(0, pe.choices.length - 1);
    if (typeof pick[kind] === 'function') idx = pick[kind](pe);
    else if (pick[kind] != null) idx = Math.min(pick[kind], pe.choices.length - 1);
    if (kind === 'heir') idx = 0;
    const out = resolveEvent(g, rngOf(g), idx);
    ok(!bad(typeof out === 'string' ? out : ''), `bad outcome ${kind}: ${out}`);
    ok(g.player.money >= 0, `money ${g.player.money} after ${kind}`);
    if (/^claim_/.test(kind) && samples.length < 34 && !samples.some((x) => x.startsWith(`${kind}:${out?.slice?.(0, 6)}`))) samples.push(`${kind}:${String(out).slice(0, 6)} ${pe.text.slice(0, 80)} → ${String(out).slice(0, 120)}`);
  }
}
function settle(g) {
  const pl = homePlace.get(g);
    if (pl && !crimeState(g).jailed) { L(g).place = pl; L(g).travel = null; }
}
function play(g, months, prefer = ACTS, pick = {}, rate = 0.5) {
  for (let m = 0; m < months && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    if (slotsFor(g) && !acts.length) { ok(false, `no actions age ${playerAge(g)}`); break; }
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const w = acts.filter((a) => prefer.includes(a.id) && !a.needsTarget);
      let a = w.length && rng.chance(rate) ? rng.pick(w) : rng.pick(acts.filter((x) => !x.needsTarget && x.id !== 'travel'));
      if (g.player.fatigue > 85) a = acts.find((x) => x.id === 'rest') ?? a;
      seen.acts[a.id] = (seen.acts[a.id] ?? 0) + 1;
      choices.push({ id: a.id });
    }
    endMonth(g, choices);
    for (const r of g.lastResults) {
      ok(!bad(r.text), `bad result ${r.name}: ${r.text}`);
      if (/왕가|왕위|증거|흔적|후손/.test(r.name ?? '') && samples.length < 34 && !samples.some((x) => x.startsWith(`${r.name}:${r.text.slice(0, 6)}`))) samples.push(`${r.name}:${r.text.slice(0, 120)}`);
    }
    for (const n of g.news ?? []) ok(!bad(n.text), `bad news ${n.text}`);
    resolveAll(g, pick);
  }
}
function scene(g, kind, data, pick) {
  for (let t = 0; t < 3; t++) {
    resolveAll(g);
    settle(g);
    const n0 = seen.scenes[kind] ?? 0;
    L(g).queue = L(g).queue.filter((x) => x.kind === kind);
    queueScene(g, kind, data, { first: true });
    play(g, 1, ['rest'], { [kind]: pick }, 1);
    if ((seen.scenes[kind] ?? 0) > n0) return true;
  }
  return false;
}
function act(g, id, pick = {}) {
  for (let t = 0; t < 3; t++) {
    resolveAll(g); settle(g);
    if (!availableActions(g).some((a) => a.id === id)) continue;
    const n0 = seen.acts[id] ?? 0;
    play(g, 1, [id], pick, 1);
    if ((seen.acts[id] ?? 0) > n0) return true;
  }
  return false;
}
const V = claimState;
const checkInfo = (g) => {
  const info = claimInfo(g);
  const walk = (o, path) => { for (const [k, v] of Object.entries(o ?? {})) { if (v && typeof v === 'object') walk(v, `${path}.${k}`); else ok(!bad(String(v)) || v === null, `claimInfo ${path}.${k}=${v}`); } };
  walk(info, 'info');
  return info;
};
// 피가 흐르는 사람을 바로 만든다
function blooded(seed, { known = true, proof = 30, exposure = 0, status = 'secret', realm = 'valhart', house = '로텐하임', place = 'ern', fake = false } = {}) {
  const g = adult(seed, { place });
  for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 30);
  V(g).blood = { realm, house, y: g.date.year - 140, gen: 5, known, origin: known ? 'chest' : null, proof, exposure, status, fake, backing: 0, buyer: null };
  return g;
}
const has = (g, id) => { resolveAll(g); settle(g); return availableActions(g).some((a) => a.id === id); };

// 1) 행동은 뜻 있는 형편에서만
{
  const g = adult(1);
  for (const id of ['claim_search', 'claim_hide', 'claim_declare', 'claim_rally', 'claim_forge']) ok(!has(g, id), `plain life shows ${id}`);
  const u = blooded(2, { known: false });
  ok(!has(u, 'claim_search'), 'unknown blood no search');
  const k = blooded(3);
  ok(has(k, 'claim_search') && !has(k, 'claim_declare') && !has(k, 'claim_hide'), 'known blood: search only');
  V(k).blood.exposure = 40; ok(has(k, 'claim_hide'), 'hide when exposed');
  V(k).blood.proof = 60; ok(has(k, 'claim_declare'), 'declare when proven');
  V(k).blood.status = 'claimed'; ok(has(k, 'claim_rally') && !has(k, 'claim_declare'), 'rally after claim');
  V(k).blood.status = 'hidden'; ok(!has(k, 'claim_search') && !has(k, 'claim_rally'), 'hidden: nothing');
}

// 2) 드러남
{
  const outs = { keep: 0, probe: 0, burn: 0 };
  const picks = [/간직/, /더 알아/, /태워/];
  for (let t = 0; t < 6; t++) {
    const g = blooded(10 + t, { known: false });
    const p0 = V(g).blood.proof;
    scene(g, 'claim_reveal', { how: ['chest', 'deathbed', 'scholar', 'retainer', 'spouse', 'chest'][t] }, idxOf(picks[t % 3]));
    const b = V(g).blood;
    ok(b.known, 'revealed');
    if (t % 3 === 1) ok(b.proof > p0, 'probe adds proof');
    if (t % 3 === 2) ok(b.status === 'hidden', 'burned');
    ok(checkInfo(g).blood?.house, 'info blood');
  }
  const u = blooded(20, { known: false }); ok(checkInfo(u).blood === null, 'unknown blood hidden from screen');
}

// 3) 증거 찾기, 흔적 지우기
{
  const g = blooded(30, { proof: 20 });
  act(g, 'claim_search');
  ok(V(g).blood.proof > 20 && V(g).blood.exposure > 0, 'search');
  const h = blooded(31, { exposure: 60 });
  act(h, 'claim_hide');
  ok(V(h).blood.exposure < 60, 'hide');
}

// 4) 꼬이는 사람들
{
  const s = blooded(40, { proof: 50, exposure: 40 }); const m0 = s.player.money;
  scene(s, 'claim_suitor', { who: 'noble', lord: '베르덴 백작가', price: 90 }, idxOf(/판다/));
  ok(V(s).blood.status === 'sold' && s.player.money >= m0 + 80, 'sold');
  ok(checkInfo(s).blood?.buyer, 'buyer in info');
  const a = blooded(41, { exposure: 40 }); scene(a, 'claim_suitor', { who: 'noble', lord: '그라이펜 후작가', price: 70 }, idxOf(/손을/));
  ok(V(a).blood.status === 'secret' && V(a).blood.exposure > 40, 'noble ally');
  const y = blooded(42, { exposure: 40 }); scene(y, 'claim_suitor', { who: 'spy', lord: 'x', price: 50 }, idxOf(/연금/));
  ok(V(y).blood.status === 'hidden', 'yield to spy');
  const c = blooded(43, { exposure: 40, proof: 40 }); scene(c, 'claim_suitor', { who: 'church', lord: 'x', price: 50 }, idxOf(/받아들/));
  ok(V(c).blood.proof > 40, 'church proof');
  const e = blooded(44, { exposure: 40, status: 'claimed' }); scene(e, 'claim_suitor', { who: 'exile', lord: 'x', price: 50 }, idxOf(/받아들/));
  ok(V(e).blood.backing > 0, 'exile backing');
}

// 5) 자객
{
  const picks = [/칼을/, /달아난/, /빈다/];
  let dead = 0, begged = 0;
  for (let t = 0; t < 9; t++) {
    const g = blooded(50 + t, { exposure: 80, proof: 70 });
    g.player.skills.sword = 30;
    scene(g, 'claim_threat', {}, idxOf(picks[t % 3]));
    if (L(g).pendingDeath || g.over) dead++;
    if (t % 3 === 2 && V(g).blood.status === 'hidden') begged++;
  }
  ok(begged >= 2, `begged ${begged}`);
  ok(dead <= 3, `threat deaths ${dead}`);
}

// 6) 또 하나의 왕손
{
  let exposed = 0;
  for (let t = 0; t < 6; t++) {
    const g = blooded(70 + t, { proof: 80, exposure: 40 });
    V(g).pretender = { name: '레오폴트라는 수도사', y: g.date.year, strength: 30 };
    scene(g, 'claim_pretender', { name: '레오폴트라는 수도사' }, idxOf(/가짜임/));
    if (!V(g).pretender) exposed++;
    checkInfo(g);
  }
  ok(exposed >= 2, `pretender exposed ${exposed}`);
  const b = blooded(80, { exposure: 40 }); V(b).pretender = { name: '엘리자라는 여인', y: b.date.year, strength: 40 };
  scene(b, 'claim_pretender', { name: '엘리자라는 여인' }, idxOf(/편에/));
  ok(V(b).blood.status === 'hidden' && !V(b).pretender, 'backed pretender');
}

// 7) 왕위 주장
{
  const g = blooded(90, { proof: 70, place: 'leocast' });
  act(g, 'claim_declare');
  ok(V(g).blood.status === 'claimed' && V(g).blood.backing > 0, 'declared');
  ok(Object.keys(crimeState(g).bounty ?? {}).length > 0, 'declare is a crime');
  const b0 = V(g).blood.backing; g.player.money = 300;
  act(g, 'claim_rally');
  ok(V(g).blood.backing > b0, 'rally');
  // 왕관의 날
  let crowned = 0, pacts = 0, lost = 0;
  for (let t = 0; t < 14; t++) {
    const realm = t % 2 ? 'valhart' : 'leonia';
    const k = blooded(100 + t, { proof: 90, status: 'claimed', realm, house: realm === 'leonia' ? '아르덴' : '로텐하임' });
    V(k).blood.backing = 95; politicsState(k).stab.valhart = 20;
    const pick = t % 7 === 6 ? /대공 칭호/ : t % 7 === 5 ? /기다린/ : /진군/;
    scene(k, 'claim_crown', {}, idxOf(pick));
    const st = V(k).blood.status;
    if (st === 'crowned') { crowned++; ok(politicsState(k).rulers.valhart.name === k.player.name, 'crowned ruler'); }
    if (st === 'pact') pacts++;
    if (st === 'hidden') lost++;
    checkInfo(k);
  }
  ok(crowned >= 1 && pacts >= 2 && lost >= 1, `crown ${crowned} pact ${pacts} lost ${lost}`);
}

// 8) 가짜 왕손
{
  const g = adult(120, { place: 'leocast' });
  g.player.skills.letters = 40; g.player.stats.cha = 40;
  ok(!has(g, 'claim_forge'), 'no forge without fallen dynasty');
  politicsState(g).fallen.push({ realm: 'valhart', house: '발하르트', y: g.date.year - 5 });
  ok(has(g, 'claim_forge'), 'forge available');
  act(g, 'claim_forge');
  ok(V(g).blood?.fake && V(g).blood.known, 'forged');
  ok(!has(g, 'claim_forge'), 'forge once');
  V(g).blood.proof = 74; act(g, 'claim_search');
  ok(V(g).blood.proof <= 75, 'fake proof capped');
}

// 9) 대 잇기, 옛 저장
{
  const g = blooded(130, { status: 'claimed', exposure: 80 }); V(g).blood.backing = 50;
  runHooks('heir', g, undefined, { ...g.player });
  ok(V(g).blood.status === 'claimed' && V(g).blood.gen === 6 && V(g).blood.exposure === 40 && V(g).blood.backing === 30, 'claim passes down');
  const s = blooded(131, { status: 'sold' }); runHooks('heir', s, undefined, { ...s.player });
  ok(V(s).blood.status === 'secret', 'sold resets for heir');
  const o = adult(132); delete o.claim; runHooks('migrate', o);
  ok(o.claim && o.claim.tally && o.claim.blood === null, 'old save claim');
  let born = 0;
  for (let t = 0; t < 200; t++) { const n = newGame({ name: '가', sex: 'm', familyId: 'farmer', mode: 'free', seed: 7000 + t }); if (V(n).blood) { born++; ok(!V(n).blood.known, 'born unknown'); } }
  ok(born >= 3 && born <= 25, `born with blood ${born}/200`);
}

// 10) 여러 삶 (짧게)
let lives = 0, revealed = 0;
for (let run = 0; run < 6; run++) {
  const g = blooded(1000 + run, { known: run % 2 === 0, proof: 20 + run * 10, place: ['ern', 'leocast', 'harfen'][run % 3] });
  me(g).ageMonths = (18 + run * 4) * 12;
  const start = L(g).gen ?? 1;
  play(g, 12 * 20, ACTS, {}, 0.4);
  if ((L(g).gen ?? 1) > start) lives++;
  if (V(g).blood?.known) revealed++;
  checkInfo(g);
}
for (let run = 0; run < 3; run++) {
  const g = newGame({ name: '평민', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'elf_exile'][run % 3], mode: 'free', seed: 6200 + run });
  play(g, 12 * 30, ['work', 'rest', 'claim_search', 'claim_forge'], {}, 0.4);
  checkInfo(g);
}
ok(revealed >= 3, `revealed in lives ${revealed}`);

for (const k of ['claim_search', 'claim_hide', 'claim_declare', 'claim_rally', 'claim_forge']) ok(seen.acts[k] > 0, `action never used: ${k}`);
for (const k of ['claim_reveal', 'claim_suitor', 'claim_threat', 'claim_pretender', 'claim_crown']) ok(seen.scenes[k] > 0, `scene never seen: ${k}`);
console.log('행동:', JSON.stringify(Object.fromEntries(Object.entries(seen.acts).filter(([k]) => k.startsWith('claim_')))));
console.log('장면:', JSON.stringify(Object.fromEntries(Object.entries(seen.scenes).filter(([k]) => k.startsWith('claim_')))));
console.log(`피를 아는 삶 ${revealed}/6, 대를 이은 삶 ${lives}/6`);
for (const s of samples) console.log(' -', s);
console.log(fail ? `claimtest: ${fail} 실패` : 'claimtest: 통과');
process.exit(fail ? 1 : 0);
