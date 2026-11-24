import './lsshim.js';
import '../src/content.js';
// 42단계 도우미2 점검: 다른 종족으로 태어날 집안. 새 집안 열셋이 집안 목록에 있고 종족·시작 장소·국적·인맥·부모 종족이 맞는지,
// 어린 시절 장면·바람·짐이 나오는지, 장면마다 고를 것을 다 골라도 글이 깨지지 않는지, 반마족을 고를 수 있고 뿔이 들킬 뻔한 날이 오는지,
// 오래 사는 피의 '먼저 늙는 벗', 대 잇기와 옛 저장을 본다.
import { FAMILIES, JOBS } from '../src/data.js';
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { byId, makePerson } from '../src/npc.js';
import { realmState, realmOf } from '../src/realms/index.js';
import { playableRaces, raceOf } from '../src/races/index.js';
import { KINDRED } from '../src/kindred/data.js';
import { kindredLines, kindredLine, kindredInfo, kindredState } from '../src/kindred/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const childSeen = {}; const samples = {}; const kinds = {}; let lines = 0;

// 0. 집안 목록
ok(KINDRED.length === 13, `새 집안 ${KINDRED.length}`);
const count = (r) => KINDRED.filter((o) => o.race === r).length;
ok(count('elf') === 3 && count('dwarf') === 3 && count('beast') === 3 && count('half_elf') === 2 && count('half_demon') === 2, '종족마다 집안 수');
for (const o of KINDRED) {
  const f = FAMILIES.find((x) => x.id === o.id);
  ok(f && f.race === o.race && f.home === o.place && JOBS[f.fatherJob] && JOBS[f.motherJob], `집안 표 ${o.id}`);
  ok(o.scenes.length === 3 && o.lines.length >= 3 && o.ties.length === 2 && o.want && o.burden && o.burdenScene?.choices.length >= 2, `집안 내용 ${o.id}`);
}
ok(playableRaces().some((r) => r.id === 'half_demon' && r.family), '반마족을 고를 수 있음');
ok(playableRaces().some((r) => r.id === 'demon' && r.family), '43단계부터 마족도 고름');

function resolveAll(g, pick) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    const kind = s?.kind ?? pe.id;
    scenes[kind] = (scenes[kind] ?? 0) + 1;
    const mine = kind.startsWith('kd_');
    if (mine) ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    if (kind === 'kd_child') childSeen[s.sid] = (childSeen[s.sid] ?? 0) + 1;
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    const want = pick?.(kind, pe.choices, s);
    if (want != null && want >= 0) idx = want;
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); const key = kind === 'kd_child' ? s.sid : `${kind}:${kindredState(g).id}`; (samples[key] ??= []).length < 1 && samples[key].push(`${pe.text.slice(0, 80)} [${pe.choices[idx]}] → ${String(out).slice(0, 100)}`); }
    ok(g.player.money >= 0 && g.player.familyMoney >= 0, `money < 0 after ${kind}`);
  }
}
const REALM = { silverleaf: 'elf', leocast: 'leonia', portel: 'free', hammer: 'dwarf', eisen: 'valhart', gorge: 'dwarf', fur: 'beast', barka: 'free', klein: 'leonia', verden: 'leonia', harfen: 'leonia', graubel: 'march' };
function month(g, rng) {
  const acts = availableActions(g).filter((a) => !/travel|move|migrate|exile_flee/.test(a.id));
  const ch = [];
  for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
  endMonth(g, ch);
  resolveAll(g);
  const ls = kindredLines(g);
  ok(Array.isArray(ls) && ls.length <= 1, 'shape');
  for (const x of ls) { lines++; kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line: ${x.text}`); (samples[`line:${x.kind}`] ??= []).length < 3 && samples[`line:${x.kind}`].push(x.text); }
  const l1 = kindredLine(g); ok(l1 === null || typeof l1 === 'string', 'line');
}
function life(o, seed, years) {
  const g = newGame({ name: seed % 2 ? '요나스' : '클라라', sex: seed % 2 ? 'm' : 'f', familyId: o.id, mode: 'free', seed });
  const s = kindredState(g);
  ok(s.id === o.id && L(g).place === o.place, `시작 장소 ${o.id}: ${L(g).place}`);
  ok(realmState(g).citizen === REALM[o.place], `국적 ${o.id}: ${realmState(g).citizen}`);
  ok(raceOf(me(g)) === o.race && g.player.race === o.race, `종족 ${o.id}: ${raceOf(me(g))}`);
  const fa = byId(g, me(g).fatherId), mo = byId(g, me(g).motherId);
  ok(raceOf(fa) === (o.fatherRace ?? o.race) && raceOf(mo) === (o.motherRace ?? o.race), `부모 종족 ${o.id}: ${raceOf(fa)}/${raceOf(mo)}`);
  if (o.race === 'beast') ok(me(g).beast === { '회색 갈기': 'wolf', 줄무늬: 'tiger', '높은 깃': 'hawk' }[o.lastNames[0]], `수인 갈래 ${o.id}: ${me(g).beast}`);
  for (const t of o.ties) { const p = byId(g, s.ties[t.role]); ok(p && p.known && p.place === o.place && raceOf(p) === (t.race ?? 'human'), `인맥 ${o.id}.${t.role} ${raceOf(p)}`); }
  ok(g.player.familyMoney === o.money, `집안 돈 ${o.id}`);
  if (o.race === 'half_demon') ok(o.hidden ? !s.revealed : s.revealed, `뿔 감춤 ${o.id}`);
  const rng = rngOf(g);
  for (let m = 0; m < years * 12 && !g.over; m++) {
    month(g, rng);
    if (m % 36 === 0) { const info = kindredInfo(g); ok(info && !bad(info.name) && !bad(info.want.state) && info.ties.every((t) => !bad(t.word) && !bad(t.race)), `info ${o.id} ${JSON.stringify(info)}`); }
  }
  return g;
}

// 1. 집안마다 스물다섯 해
let wants = 0, burdens = 0;
for (const [i, o] of KINDRED.entries()) {
  const g = life(o, 4200 + i * 7, 25);
  const s = kindredState(g);
  if (!g.over && playerAge(g) >= 24 && s.owner === g.player.id && !(g.prison?.past?.length) && !g.bondage?.enslaved) { ok(!!s.want, `바라는 것 장면 없음 ${o.id}`); ok(!!s.burden && s.burden !== 'due', `짐 장면 없음 ${o.id} ${s.burden}`); }
  if (s.want) wants++; if (s.burden) burdens++;
}
ok(wants >= 10 && burdens >= 10, `바람 ${wants}, 짐 ${burdens}`);
ok(Object.keys(childSeen).length >= 34, `어린 시절 장면이 덜 나옴 ${Object.keys(childSeen).length}/39`);
ok((kinds.home ?? 0) >= 13, `집안 줄 ${kinds.home}`);

// 2. 장면마다 고를 것을 다 고른다 (어린 시절·짐: 시험 있는 고르기는 붙고 떨어지는 쪽 다)
for (const o of KINDRED) {
  const base = newGame({ name: '요나스', sex: 'm', familyId: o.id, mode: 'free', seed: 4300 });
  const snap = JSON.stringify(base);
  const fresh = () => { const g = JSON.parse(snap); g.pendingEvent = null; L(g).queue = []; L(g).scene = null; return g; };
  for (const sc of o.scenes) {
    for (let k = 0; k < sc.choices.length; k++) {
      const g = fresh(); me(g).ageMonths = sc.age[0] * 12;
      ok(showScene(g, { kind: 'kd_child', at: L(g).place, t: 0, sid: sc.id }, { force: true }), `show ${sc.id}`);
      resolveAll(g, (kind) => (kind === 'kd_child' ? k : null));
      ok(kindredState(g).log.some((x) => x.text.startsWith(sc.title)), `기록 ${sc.id}`);
    }
  }
  for (const c of o.burdenScene.choices) {
    for (const stat of [10, 99]) {
      const g = fresh(); me(g).ageMonths = 20 * 12;
      for (const k of Object.keys(g.player.stats)) g.player.stats[k] = stat;
      for (const k of Object.keys(g.player.skills)) g.player.skills[k] = stat === 99 ? 90 : 0;
      ok(showScene(g, { kind: 'kd_burden', at: L(g).place, t: 0 }, { force: true }), `show burden ${o.id}`);
      resolveAll(g, (kind, labels) => (kind === 'kd_burden' ? labels.indexOf(c.label) : null));
      const b = kindredState(g).burden;
      ok(b && b.startsWith(c.key), `짐 결과 ${o.id}.${c.key} ${b}`);
      if (c.test && stat === 99) ok(b === c.key, `잘하면 붙음 ${o.id}.${c.key} ${b}`);
      if (c.test && stat === 10) ok(b === `${c.key}_bad`, `못하면 떨어짐 ${o.id}.${c.key} ${b}`);
    }
  }
  for (const met of [true, false]) for (let k = 0; k < 2; k++) {
    const g = fresh(); me(g).ageMonths = 18 * 12;
    ok(showScene(g, { kind: 'kd_want', at: L(g).place, t: 0, met }, { force: true }), 'show want');
    resolveAll(g, (kind) => (kind === 'kd_want' ? k : null));
    ok(kindredState(g).want === (met ? 'met' : 'missed'), 'want state');
  }
}

// 3. 반마족: 감춘 뿔은 꺼리는 나라에서 들킬 뻔한다
{
  let near = 0, shows = 0;
  for (let k = 0; k < 4; k++) {
    const g = newGame({ name: '리제', sex: 'f', familyId: 'hd_hidden', mode: 'free', seed: 4400 + k });
    me(g).ageMonths = 18 * 12; kindredState(g).horn = 80;
    ok(realmOf(L(g).place) === 'leonia', '하르펜은 레오니아');
    const rng = rngOf(g);
    for (let m = 0; m < 12 * 12 && !g.over; m++) {
      month(g, rng);
      if (kindredState(g).revealed) { shows++; break; }
    }
    near += kindredState(g).horns;
  }
  ok(near >= 3, `들킬 뻔한 날이 드묾 ${near}`);
  // 고를 것 넷을 다 골라 본다
  for (const key of ['lie', 'pay', 'flee', 'show']) {
    for (const how of ['wind', 'heal', 'inn']) {
      const g = newGame({ name: '리제', sex: 'f', familyId: 'hd_hidden', mode: 'free', seed: 4410 });
      me(g).ageMonths = 20 * 12; g.player.money = 40; g.pendingEvent = null; L(g).queue = [];
      const at = L(g).place;
      ok(showScene(g, { kind: 'kd_horns', at, t: 0, how }, { force: true }), 'show horns');
      const keys = ['태연하게', '은화 15닢', '그 길로', '숨기지 않기로'];
      resolveAll(g, (kind, labels) => (kind === 'kd_horns' ? labels.findIndex((l) => l.startsWith(keys[['lie', 'pay', 'flee', 'show'].indexOf(key)])) : null));
      const s = kindredState(g);
      if (key === 'show') ok(s.revealed && (g.faith?.suspicion ?? 0) >= 20, '드러내면 의심');
      if (key === 'flee') ok(L(g).place !== at, '뜨면 고장이 바뀜');
      if (key === 'pay') ok(g.player.money === 25, '입막음 값');
    }
  }
  // 변경 집안은 처음부터 감추지 않는다: 들킬 뻔한 날이 없다
  const g = newGame({ name: '카엘', sex: 'm', familyId: 'hd_frontier', mode: 'free', seed: 4420 });
  me(g).ageMonths = 18 * 12;
  const rng = rngOf(g);
  for (let m = 0; m < 60 && !g.over; m++) month(g, rng);
  ok(kindredState(g).horns === 0, '변경 집안은 감추지 않음');
  ok(g.over || kindredState(g).past || raceOf(me(g)) !== 'half_demon' || (kindredInfo(g).horn && kindredInfo(g).horn.revealed), `info horn ${JSON.stringify(kindredInfo(g))} ${raceOf(me(g))}`);
}

// 4. 오래 사는 피: 사람 벗이 먼저 늙는다
{
  let slow = 0, slowLines = 0;
  for (const id of ['elf_elder', 'dwarf_trader', 'half_elf_border', 'elf_minstrel', 'dwarf_heir']) {
    const g = newGame({ name: '실렌', sex: 'f', familyId: id, mode: 'free', seed: 4500 });
    me(g).ageMonths = 50 * 12;
    const rng = rngOf(g);
    const f = makePerson(rng, { sex: 'm', ageMonths: 51 * 12, job: 'farmer' }); f.place = L(g).place; f.known = true; f.affection = 60; g.people.push(f);
    g.childhood ??= {}; g.childhood.friend = f.id;
    for (let m = 0; m < 12 * 12 && !g.over; m++) { month(g, rng); if (f.alive) f.ageMonths = Math.min(f.ageMonths, 56 * 12); if (kindredState(g).slow) break; }
    if (kindredState(g).slow) slow++;
  }
  slowLines = kinds.slow ?? 0;
  ok(slow >= 3, `먼저 늙는 벗 장면 ${slow}/5`); // 벗이 그사이 병으로 먼저 갈 수도 있다
  ok(slowLines >= 3, `먼저 늙는 벗 줄 ${slowLines}`);
  for (let k = 0; k < 3; k++) {
    const g = newGame({ name: '실렌', sex: 'f', familyId: 'elf_elder', mode: 'free', seed: 4510 });
    const f = makePerson(rngOf(g), { sex: 'm', ageMonths: 60 * 12, job: 'farmer' }); f.place = L(g).place; g.people.push(f);
    me(g).ageMonths = 60 * 12; g.pendingEvent = null; L(g).queue = [];
    ok(showScene(g, { kind: 'kd_slow', at: L(g).place, t: 0, f: f.name, id: f.id }, { force: true }), 'show slow');
    resolveAll(g, (kind) => (kind === 'kd_slow' ? k : null));
    ok(kindredState(g).slow === f.id, 'slow state');
  }
}

// 5. 옛 집안은 그대로, 대 잇기, 옛 저장
for (const id of ['farmer', 'elf_exile', 'count_bastard']) {
  const g = newGame({ name: '한스', sex: 'm', familyId: id, mode: 'free', seed: 4600 });
  ok(!kindredState(g).id && kindredInfo(g) === null, `옛 집안 ${id}`);
  for (let m = 0; m < 24; m++) { endMonth(g, [{ id: 'rest' }]); resolveAll(g); ok(kindredLines(g).length === 0, '옛 집안에 줄'); }
}
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'beast_wolf', mode: 'free', seed: 4601 });
  delete g.kindred; runHooks('migrate', g);
  ok(g.kindred && g.kindred.id === null, '옛 저장');
  const g2 = newGame({ name: '한스', sex: 'm', familyId: 'dwarf_heir', mode: 'free', seed: 4602 });
  runHooks('heir', g2, rngOf(g2), g2.player);
  ok(kindredState(g2).past && kindredInfo(g2).past, '대를 이으면 past');
  const g3 = JSON.parse(JSON.stringify(g2)); ok(JSON.stringify(kindredInfo(g3)) === JSON.stringify(kindredInfo(g2)), '저장 왕복');
}

console.log(`장면: ${JSON.stringify(Object.fromEntries(Object.entries(scenes).filter(([k]) => k.startsWith('kd_'))))}  줄 ${JSON.stringify(kinds)} ${lines}, 바람 ${wants}, 짐 ${burdens}, 어린 장면 ${Object.keys(childSeen).length}/39`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('kindredtest OK');
