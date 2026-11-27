import './lsshim.js';
import '../src/content.js';
// 37단계 도우미2 점검: 재혼과 의붓가족. NPC 집안이 다시 혼인하고 섞이는지, 홀로된 부모가 재혼해 내가 의붓자식이 되는지,
// 아이 딸린 혼담 → 정혼 → 혼례 → 의붓부모가 되는지, 장면마다 고를 것, 족보에 올리기(kin), 대 잇기의 몫, 옛 저장, 글 깨짐을 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, playerAge } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { byId, makePerson, kill, ageYears } from '../src/npc.js';
import { stepLines, stepLine, stepInfo, stepState, stepKids } from '../src/stepfamily/index.js';
import { loveState } from '../src/love/index.js';
import { kinState } from '../src/kin/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const kinds = {}; const samples = {};
const keep = (k, t) => { (samples[k] ??= []).length < 2 && !samples[k].includes(t) && samples[k].push(t); };

function resolveAll(g, pick) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    const mine = kind.startsWith('sf_');
    if (mine) { scenes[kind] = (scenes[kind] ?? 0) + 1; ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`); }
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    if (typeof pick === 'function') idx = pick(kind, pe) ?? idx;
    else if (mine && pick != null) idx = Math.min(pick, pe.choices.length - 1);
    idx = Math.min(idx, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); keep(kind, `${pe.text.slice(0, 100)}… [${pe.choices[idx]}] → ${String(out).slice(0, 90)}`); }
    ok(g.player.money >= 0 && Number.isFinite(g.player.money), `money after ${kind}`);
  }
}
function checkMonth(g) {
  const ls = stepLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
  const l = stepLine(g); ok(l === null || typeof l === 'string', 'line');
}
function checkInfo(g) {
  const i = stepInfo(g);
  const js = JSON.stringify(i);
  ok(i && Array.isArray(i.people) && !/undefined|NaN/.test(js), `info ${js.slice(0, 200)}`);
  for (const p of i.people) ok(!bad(p.name) && !bad(p.kind) && !bad(p.word) && p.warm >= 0 && p.warm <= 100, `info person ${JSON.stringify(p)}`);
}
const rest = (g, pick) => { endMonth(g, [{ id: 'rest' }]); resolveAll(g, pick); checkMonth(g); };

// 1. 그냥 사는 삶: NPC 집안이 다시 혼인하고 섞인다
let blends = 0; let npcLines = 0;
for (let k = 0; k < 5; k++) {
  const g = newGame({ name: k % 2 ? '요나스' : '클라라', sex: k % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'sexton', 'capital_artisan', 'port_folk'][k], mode: 'free', seed: 3700 + k });
  const rng = rngOf(g);
  for (let m = 0; m < 40 * 12 && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !/travel|move/.test(a.id));
    const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    endMonth(g, ch); resolveAll(g); checkMonth(g);
    if (m % 60 === 0) checkInfo(g);
  }
  blends += stepState(g).made;
  checkInfo(g);
}
npcLines = kinds.npc ?? 0;
ok(blends >= 3, `섞인 NPC 집안이 너무 적음 ${blends}`);

// 2. 내가 의붓자식: 어머니를 일찍 잃으면 아버지가 다시 혼인한다
let stepKidLives = 0;
for (let k = 0; k < 8; k++) { // 48단계: 넷 중 둘은 흐름에 따라 흔들려서 여덟 판에 셋
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3720 + k });
  const m = me(g);
  for (let i = 0; i < 4 * 12; i++) rest(g);
  kill(g, byId(g, m.motherId), '열병');
  for (let i = 0; i < 12 * 12 && !g.over; i++) rest(g);
  const ties = Object.values(stepState(g).ties);
  if (ties.some((t) => t.kind === 'parent')) stepKidLives++;
  checkInfo(g);
}
ok(stepKidLives >= 3, `아버지 재혼이 너무 드묾 ${stepKidLives}/8`);
ok((scenes.sf_newparent ?? 0) >= 1, '새 부모 장면');

// 3. 내가 의붓부모: 홀로된 뒤 아이 딸린 혼담 → 정혼 → 혼례 → 새 식탁, 그리고 세월
{
  const g = newGame({ name: '마르타', sex: 'f', familyId: 'farmer', mode: 'free', seed: 3740 });
  me(g).ageMonths = 30 * 12 + 1;
  const now = g.date.year * 12 + g.date.month;
  loveState(g).widowed = { id: -1, name: '오토', at: now - 30, vow: false };
  const pick = (kind, pe) => (kind === 'sf_suitor' || kind === 'love_wedding' ? 0 : kind === 'sf_birth' ? 2 : null);
  for (let i = 0; i < 12 * 12 && !me(g).spouseId; i++) { g.player.money = Math.max(g.player.money, 200); rest(g, pick); }
  ok(me(g).spouseId && stepKids(g).length >= 1, `아이 딸린 사람과 혼인 못 함 ${JSON.stringify(scenes)}`);
  const before = { ...scenes };
  for (let i = 0; i < 16 * 12 && !g.over; i++) { g.player.money = Math.max(g.player.money, 200); rest(g, pick); if (i % 48 === 0) checkInfo(g); }
  const got = Object.fromEntries(Object.keys(scenes).map((k) => [k, scenes[k] - (before[k] ?? 0)]));
  ok((scenes.sf_table ?? 0) >= 1, '새 식탁');
  ok((got.sf_open ?? 0) + (got.sf_cold ?? 0) >= 1, `세월 장면 없음 ${JSON.stringify(got)}`);
  ok((got.sf_adopt ?? 0) + (got.sf_birth ?? 0) + (got.sf_favor ?? 0) >= 1, `의붓가족 장면 없음 ${JSON.stringify(got)}`);
  ok((kinds.kid ?? 0) >= 1, '의붓자식 글');
  checkInfo(g);
}

// 4. 장면마다 고를 것을 다 골라 본다
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3750 });
  me(g).ageMonths = 34 * 12; g.player.money = 900;
  const rng = rngOf(g);
  const pl = L(g).place;
  const mk = (age, sex, extra = {}) => { const p = makePerson(rng, { ageMonths: age * 12 + 1, sex, job: age >= 15 ? 'farmer' : 'child', ...extra }); p.place = pl; p.known = true; g.people.push(p); return p; };
  // 배우자와 데려온 아이, 내가 먼저 낳은 아이
  const w = mk(32, 'f'); me(g).spouseId = w.id; w.spouseId = me(g).id; g.player.familyIds.push(w.id);
  const ex = mk(35, 'm'); const sk = mk(9, 'm', { fatherId: ex.id, motherId: w.id }); w.childIds.push(sk.id); ex.childIds.push(sk.id);
  const sk2 = mk(25, 'f', { motherId: w.id }); w.childIds.push(sk2.id);
  const mine = mk(10, 'f', { fatherId: me(g).id }); me(g).childIds.push(mine.id);
  endMonth(g, [{ id: 'rest' }]); resolveAll(g, 0);
  const st = stepState(g);
  ok(st.ties[sk.id]?.kind === 'kid' && st.ties[mine.id]?.kind === 'mine', `의붓 관계 읽기 ${JSON.stringify(st.ties)}`);
  const DATA = {
    sf_suitor: [{ sex: 'f', name: '엘제', age: 33, last: '바흐', job: 'weaver', kids: [{ sex: 'm', name: '루카', age: 6 }, { sex: 'f', name: '힐데', age: 3 }], lost: 'dead', pl: '에른 마을' }, { sex: 'f', name: '엘제', age: 33, last: '바흐', job: 'weaver', kids: [{ sex: 'm', name: '루카', age: 6 }], lost: 'divorce', pl: '에른 마을' }],
    sf_table: [{ sp: w.name, kids: [sk.name] }, { sp: w.name, kids: [sk.name, '루카'] }],
    sf_cold: [{ id: sk.id, name: sk.name, sp: w.name, who: 'kid', dead: false }, { id: sk.id, name: sk.name, sp: w.name, who: 'kid', dead: true }, { id: mine.id, name: mine.name, sp: w.name, who: 'mine' }],
    sf_favor: [{ kid: sk.name, kid_id: sk.id, own: mine.name, mine: true }, { kid: sk.name, kid_id: sk.id, own: mine.name, mine: false }],
    sf_kids: [{ a: sk.name, b: mine.name, ids: [sk.id, mine.id], years: 2 }],
    sf_open: [{ id: sk.id, name: sk.name, who: 'kid', call: '아버지', years: 4 }, { id: w.id, name: w.name, who: 'parent', pw: '새어머니', years: 6 }],
    sf_birth: [{ id: sk.id, kid: sk.name, alive: true, who: ex.name, wsex: 'm', pl: 'harfen' }, { id: sk.id, kid: sk.name, alive: false, who: '할머니', side: '외가', wsex: 'f', pl: 'verden' }],
    sf_parent_wed: [{ pid: ex.id, par: '아버지', sid: null, name: '로자', kidsN: 1, kids: '하나', dead: '어머니' }, { pid: ex.id, par: '어머니', sid: null, name: '군터', kidsN: 0, kids: '', dead: '아버지' }],
    sf_newparent: [{ id: w.id, name: w.name, pw: '새어머니', par: '아버지', kids: '하나', dead: '어머니' }, { id: w.id, name: '군터', pw: '새아버지', par: '어머니', kids: '', dead: '아버지' }],
    sf_stepfavor: [{ id: w.id, name: w.name, pw: '새어머니', kid: sk.name, par: '아버지' }],
    sf_old: [{ id: sk2.id, name: sk2.name, age: 7 }],
    sf_share: [{ id: sk2.id, name: sk2.name, old: '오토' }],
    sf_widow: [{ id: w.id, name: w.name, pw: '새어머니', old: '오토', kids: 2 }, { id: w.id, name: '군터', pw: '새아버지', old: '안나', kids: 0 }],
  };
  for (const [kind, list] of Object.entries(DATA)) for (const d of list) for (let i = 0; i < 4; i++) {
    loveState(g).engaged = null; ex.spouseId = null; sk.place = pl;
    if (kind === 'sf_suitor') { me(g).spouseId = null; w.spouseId = null; }
    const shown = showScene(g, { kind, at: pl, t: 0, ...d }, { force: true });
    ok(shown && g.pendingEvent, `장면이 안 뜸 ${kind} ${i}`);
    resolveAll(g, i);
    me(g).spouseId = w.id; w.spouseId = me(g).id;
    g.player.money = Math.max(g.player.money, 900);
    const t = stepState(g).ties[sk.id]; if (t) { t.gone = false; t.asked = false; }
  }
  for (const k of Object.keys(DATA)) ok(scenes[k] > 0, `장면 ${k}`);
  // 족보에 올리기 → kin의 내 자식
  endMonth(g, [{ id: 'rest' }]); resolveAll(g, 0);
  ok(showScene(g, { kind: 'sf_adopt', at: pl, t: 0, id: sk.id, name: sk.name, years: 4, blood: mine.name }, { force: true }), '족보 장면');
  resolveAll(g, (kind) => (kind === 'sf_adopt' ? 0 : null));
  ok(me(g).childIds.includes(sk.id) && kinState(g).kids[sk.id]?.adopted && stepState(g).ties[sk.id]?.adopted, '족보에 올리면 내 자식');
  endMonth(g, [{ id: 'rest' }]); resolveAll(g, 0);
  ok(stepState(g).ties[sk.id]?.adopted, '족보에 올린 기록이 남음');
  ok(showScene(g, { kind: 'sf_adopt', at: pl, t: 0, id: sk2.id, name: sk2.name, years: 4, blood: '' }, { force: true }), '족보 장면 2');
  resolveAll(g, 1);
  ok(!me(g).childIds.includes(sk2.id), '족보 사양');
  checkInfo(g);
}

// 5. 대를 이을 때: 의붓자식의 몫, 남은 의붓부모의 몫
{
  const g = newGame({ name: '오토', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3760 });
  me(g).ageMonths = 50 * 12; g.player.money = 300;
  const rng = rngOf(g);
  const pl = L(g).place;
  const mk = (age, sex, extra = {}) => { const p = makePerson(rng, { ageMonths: age * 12 + 1, sex, job: 'farmer', ...extra }); p.place = pl; p.known = true; g.people.push(p); return p; };
  const first = mk(48, 'f'); const heir = mk(20, 'm', { fatherId: me(g).id, motherId: first.id }); me(g).childIds.push(heir.id); first.childIds.push(heir.id); first.alive = false;
  const w = mk(45, 'f'); me(g).spouseId = w.id; w.spouseId = me(g).id;
  const sk = mk(22, 'f', { motherId: w.id }); w.childIds.push(sk.id);
  endMonth(g, [{ id: 'rest' }]); resolveAll(g, 0);
  stepState(g).ties[sk.id].warm = 60;
  const old = g.player; const oldId = me(g).id;
  // 대 잇기 흉내: 주인이 바뀐다
  byId(g, oldId).isPlayer = false; byId(g, oldId).alive = false; heir.isPlayer = true;
  g.player = { ...old, id: heir.id, name: heir.name };
  L(g).queue.length = 0; g.pendingEvent = null;
  runHooks('heir', g, rng, old);
  const q = L(g).queue.map((x) => x.kind);
  ok(q.includes('sf_share') && q.includes('sf_widow'), `대 잇기 장면 ${q}`);
  ok(stepState(g).gen === 1, 'gen');
  resolveAll(g); for (let i = 0; i < 6; i++) rest(g);
  ok((scenes.sf_share ?? 0) > 0 && (scenes.sf_widow ?? 0) > 0, '대 잇기 장면이 뜸');
}

// 6. 옛 저장
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3770 });
  delete g.stepfamily; runHooks('migrate', g);
  ok(g.stepfamily && typeof g.stepfamily.ties === 'object' && Array.isArray(g.stepfamily.npc), '옛 저장');
  endMonth(g, [{ id: 'rest' }]); checkInfo(g);
}

ok((kinds.npc ?? 0) >= 1, 'NPC 집안 글'); // 다른 갈래가 늘면 첫 묶음의 세계가 바뀌니 점검 전체에서 센다
console.log(`장면 ${JSON.stringify(scenes)}`);
console.log(`줄 ${JSON.stringify(kinds)}  섞인 NPC 집안 ${blends}  의붓자식이 된 삶 ${stepKidLives}/4`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('steptest OK');
