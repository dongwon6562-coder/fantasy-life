import './lsshim.js';
import '../src/content.js';
// 39단계 도우미2 점검: 입양과 거둔 아이. 플레이어 없이도 NPC 집안이 고아를 거두고 양자로 대를 잇는지,
// 내가 고아가 되면 누가 거둬 키우고 열여섯에 나서는지, 문간의 바구니 → 출생을 말할까 → 숨긴 걸 앎 → 낳아 준 사람,
// 자식 없는 늙은 내가 양자를 들이는지, 양자가 대를 이을 때 친척이 따지는지, 의붓(stepfamily)과 겹치지 않는지, 글 깨짐을 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { byId, makePerson, kill } from '../src/npc.js';
import { adoptLines, adoptLine, adoptInfo, adoptState, takenKids } from '../src/adopt/index.js';
import { kinState } from '../src/kin/index.js';
import { stepState } from '../src/stepfamily/index.js';

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
    const mine = kind.startsWith('ad_');
    if (mine) { scenes[kind] = (scenes[kind] ?? 0) + 1; ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`); }
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    if (typeof pick === 'function') idx = pick(kind, pe) ?? idx;
    else if (mine && pick != null) idx = pick;
    idx = Math.min(idx, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); keep(kind, `${pe.text.slice(0, 110)}… [${pe.choices[idx]}] → ${String(out).slice(0, 100)}`); }
    ok(Number.isFinite(g.player.money) && g.player.money >= 0, `money after ${kind}`);
  }
}
function checkMonth(g) {
  const ls = adoptLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
  const l = adoptLine(g); ok(l === null || typeof l === 'string', 'line');
}
function checkInfo(g) {
  const i = adoptInfo(g);
  const js = JSON.stringify(i);
  ok(i && Array.isArray(i.kids) && Array.isArray(i.npc) && !/undefined|NaN/.test(js), `info ${js.slice(0, 200)}`);
  for (const k of i.kids) ok(!bad(k.name) && !bad(k.how) && !bad(k.told) && !bad(k.word) && k.bond >= 0 && k.bond <= 100, `info kid ${JSON.stringify(k)}`);
  if (i.guardian) ok(!bad(i.guardian.name) && !bad(i.guardian.word), `info guardian ${JSON.stringify(i.guardian)}`);
  // 의붓자식과 겹치지 않는다
  for (const k of i.kids) ok(!stepState(g).ties[k.id], `stepfamily overlap ${k.name}`);
}
const rest = (g, pick) => { endMonth(g, [{ id: 'rest' }]); resolveAll(g, pick); checkMonth(g); };

// 1. 그냥 사는 삶: NPC 집안이 고아를 거두고, 자식 없는 집이 양자를 들인다
let made = 0; const npcKinds = {}; const forced = [];
// 여섯 판 (48단계: 넷으로는 씨앗 운에 따라 부모 잃은 아이를 거두는 갈래가 0번인 때가 있었다)
for (let k = 0; k < 6; k++) {
  const g = newGame({ name: k % 2 ? '요나스' : '클라라', sex: k % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'sexton', 'port_folk'][k % 4], mode: 'free', seed: 3900 + k });
  const rng = rngOf(g);
  for (let m = 0; m < 40 * 12 && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !/travel|move/.test(a.id));
    const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    if (k % 4 < 2 && m === 60) { // 돌림병에 부모를 다 잃은 NPC 아이
      const kid = g.people.find((p) => p.alive && !p.isPlayer && p.ageMonths < 10 * 12 && byId(g, p.fatherId)?.alive && byId(g, p.motherId)?.alive && !g.player.familyIds.includes(p.id) && p.fatherId !== me(g).id);
      if (kid) { kill(g, byId(g, kid.fatherId), '돌림병'); kill(g, byId(g, kid.motherId), '돌림병'); forced.push([g, kid]); }
    }
    if (k === 3 && m === 120) { g.world ??= {}; g.world.famine = true; }
    if (k === 3 && m === 140) g.world.famine = false;
    endMonth(g, ch); resolveAll(g); checkMonth(g);
    if (m % 60 === 0) checkInfo(g);
  }
  const st = adoptState(g);
  made += st.made;
  for (const x of st.npc) {
    npcKinds[x.kind] = (npcKinds[x.kind] ?? 0) + 1;
    const kid = byId(g, x.kid);
    if (x.by != null) ok(kid?.adopted && byId(g, x.by)?.childIds.includes(x.kid), 'npc parent has kid');
  }
  checkInfo(g);
}
ok(made >= 6, `NPC가 거둔 아이가 너무 적음 ${made}`);
ok((npcKinds.orphan ?? 0) >= 1 && (npcKinds.heir ?? 0) >= 1, `NPC 거둠 갈래 ${JSON.stringify(npcKinds)}`);
ok((kinds.npc ?? 0) >= 1, 'NPC 집안 글');
ok(forced.length >= 1 && forced.some(([g, kid]) => kid.adopted || !kid.alive), `부모 잃은 NPC 아이를 아무도 안 거둠 ${forced.length}`);

// 2. 내가 고아: 다섯 살에 부모를 다 잃는다 → 누가 거두나 → 열여섯에 나선다
let raised = 0;
for (let k = 0; k < 4; k++) {
  const g = newGame({ name: '한스', sex: 'm', familyId: ['farmer', 'merchant', 'farmer', 'sexton'][k], mode: 'free', seed: 3920 + k });
  const m = me(g);
  for (let i = 0; i < 5 * 12; i++) rest(g);
  kill(g, byId(g, m.fatherId), '열병'); kill(g, byId(g, m.motherId), '열병');
  for (let i = 0; i < 12 * 12 && !g.over; i++) rest(g, (kind) => (kind === 'ad_taken' ? k : null));
  const gd = adoptState(g).guardian;
  ok(gd && gd.kind !== 'pending', `거둔 사람이 정해지지 않음 ${JSON.stringify(gd)}`);
  if (gd?.grown) raised++;
  checkInfo(g);
}
ok((scenes.ad_taken ?? 0) >= 4, `거두는 장면 ${scenes.ad_taken}`);
ok(raised >= 3, `열여섯에 나서는 장면 ${raised}/4`);
ok((kinds.raised ?? 0) >= 2, '남의 집에서 자라는 글');

// 3. 장면마다 고를 것을 다 골라 본다
{
  const g = newGame({ name: '마르타', sex: 'f', familyId: 'farmer', mode: 'free', seed: 3940 });
  me(g).ageMonths = 34 * 12; g.player.money = 300;
  const rng = rngOf(g);
  const pl = L(g).place;
  const mk = (age, sex, extra = {}) => { const p = makePerson(rng, { ageMonths: age * 12 + 1, sex, job: age >= 15 ? 'farmer' : 'child', ...extra }); p.place = pl; p.known = true; g.people.push(p); return p; };
  const h = mk(36, 'm'); me(g).spouseId = h.id; h.spouseId = me(g).id; g.player.familyIds.push(h.id);
  rest(g);
  // 문간의 바구니: 거둔다
  ok(showScene(g, { kind: 'ad_basket', at: pl, t: 0, sex: 'f', token: '작은 나무 새', hard: '올해는 흉년이다.' }, { force: true }), '바구니 장면');
  resolveAll(g, 0);
  const kid = takenKids(g)[0];
  ok(kid && kinState(g).kids[kid.id]?.adopted && h.childIds.includes(kid.id), `바구니 아이를 거둠 ${kid?.name}`);
  const t = adoptState(g).ties[kid?.id];
  ok(t && t.how === 'basket' && t.birth != null && byId(g, t.birth), '낳아 준 사람이 어딘가 산다');
  rest(g);
  ok(!stepState(g).ties[kid.id], '거둔 아이는 의붓자식이 아님');
  // 나머지 바구니 갈래
  for (const i of [1, 2]) { showScene(g, { kind: 'ad_basket', at: pl, t: 0, sex: 'm', token: '반쪽으로 쪼갠 구리 메달', hard: '' }, { force: true }); resolveAll(g, i); }
  ok(takenKids(g).length === 1, '고아원·이웃으로 보내면 내 자식 아님');
  kid.ageMonths = 11 * 12;
  const DATA = {
    ad_tell: [0, 1, 2, 3].map(() => ({ id: kid.id, name: kid.name, age: 11, how: 'basket', token: '작은 나무 새' })).concat([{ id: kid.id, name: kid.name, age: 10, how: 'war', token: '포대기' }]),
    ad_learn: [{ id: kid.id, name: kid.name, from: '옆집 아이' }],
    ad_birth: [{ id: kid.id, kid: kid.name, age: 13, token: '작은 나무 새', years: 13, knows: true }, { id: kid.id, kid: kid.name, age: 8, token: '작은 나무 새', years: 8, knows: false }],
    ad_heir: [{ age: 50, who: h.name, cands: [{ id: null, name: '토비아', age: 9, sex: 'm', what: '고아원의 야무진 아이', kin: false }, { id: mk(14, 'f').id, name: '이다', age: 14, sex: 'f', what: '나를 따르는 젊은이', kin: false }] }],
    ad_blood: [{ old: '오토', rel: '군터', relId: mk(50, 'm').id, relWord: '고인의 형제' }],
    ad_taken: [{ lost: '아버지와 어머니의', cands: [{ id: h.id, kind: 'kin', label: '친척을 따라간다', say: '친척이 왔다.' }, { id: null, kind: 'chapel', label: '예배당 고아원에 들어간다', say: '사제가 왔다.' }] }],
    ad_grown: [{ gk: 'chapel', gd: '고아원 사제', warm: 30 }, { gk: 'kin', gd: h.name, warm: 60 }, { gk: 'neighbor', gd: h.name, warm: 20 }],
  };
  for (const [kind, list] of Object.entries(DATA)) for (const d of list) for (let i = 0; i < 4; i++) {
    const tt = adoptState(g).ties[kid.id]; if (tt) { tt.gone = false; tt.met = false; }
    kid.place = pl;
    const shown = showScene(g, { kind, at: pl, t: 0, ...d }, { force: true });
    ok(shown && g.pendingEvent, `장면이 안 뜸 ${kind} ${i}`);
    resolveAll(g, i);
    g.player.money = Math.max(g.player.money, 300);
  }
  for (const k of Object.keys(DATA)) ok(scenes[k] > 0, `장면 ${k}`);
  ok(takenKids(g).some((p) => p.name === '토비아' && p.lastName === g.player.lastName), '양자는 성을 바꿈');
  checkInfo(g);
  for (let i = 0; i < 24; i++) rest(g);
  ok((kinds.kid ?? 0) + (kinds.knows ?? 0) >= 1, `거둔 아이 글 ${JSON.stringify(kinds)}`);
}

// 4. 자식 없는 늙은 나: 저절로 양자 이야기가 나온다
{
  let heirAsked = 0;
  for (let k = 0; k < 3; k++) {
    const g = newGame({ name: '오토', sex: 'm', familyId: 'merchant', mode: 'free', seed: 3960 + k });
    me(g).ageMonths = 46 * 12;
    for (let i = 0; i < 8 * 12 && !g.over; i++) rest(g, (kind) => (kind === 'ad_heir' ? 0 : null));
    if (adoptState(g).done.heir) heirAsked++;
  }
  ok(heirAsked >= 2, `양자 이야기 ${heirAsked}/3`);
}

// 5. 양자가 대를 이을 때: 고인의 형제가 따지러 온다
{
  const g = newGame({ name: '오토', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3980 });
  me(g).ageMonths = 60 * 12;
  const rng = rngOf(g);
  const pl = L(g).place;
  const mk = (age, sex, extra = {}) => { const p = makePerson(rng, { ageMonths: age * 12 + 1, sex, job: 'farmer', ...extra }); p.place = pl; p.known = true; g.people.push(p); return p; };
  const gp = mk(85, 'm'); gp.childIds.push(me(g).id); me(g).fatherId = gp.id;
  const bro = mk(55, 'm', { fatherId: gp.id }); gp.childIds.push(bro.id);
  const heir = mk(25, 'm'); heir.adopted = true; heir.lastName = g.player.lastName; me(g).childIds.push(heir.id);
  rest(g);
  ok(adoptState(g).ties[heir.id], '양자 기록');
  const old = g.player; const oldId = me(g).id;
  byId(g, oldId).isPlayer = false; byId(g, oldId).alive = false; heir.isPlayer = true;
  g.player = { ...old, id: heir.id, name: heir.name };
  L(g).queue.length = 0; g.pendingEvent = null;
  runHooks('heir', g, rng, old);
  ok(L(g).queue.some((x) => x.kind === 'ad_blood'), `대 잇기 장면 ${L(g).queue.map((x) => x.kind)}`);
  for (let i = 0; i < 4; i++) rest(g);
  ok((scenes.ad_blood ?? 0) > 0, '피가 아닌 자식 장면');
}

// 6. 옛 저장
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3990 });
  delete g.adopt; runHooks('migrate', g);
  ok(g.adopt && typeof g.adopt.ties === 'object' && Array.isArray(g.adopt.npc), '옛 저장');
  endMonth(g, [{ id: 'rest' }]); checkInfo(g);
}

console.log(`장면 ${JSON.stringify(scenes)}`);
console.log(`줄 ${JSON.stringify(kinds)}  NPC가 거둔 아이 ${made} ${JSON.stringify(npcKinds)}  다 자라 나선 고아 ${raised}/4`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('adopttest OK');
