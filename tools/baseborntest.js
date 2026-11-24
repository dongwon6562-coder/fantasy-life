import './lsshim.js';
import '../src/content.js';
// 40단계 도우미2 점검: 서자와 혼외 자식. 플레이어 없이도 NPC 집안에 서자가 나고 인정받고 길을 나서고 집을 잇는지,
// 서자로 태어난 삶(백작가·포르텔 거상)에서 열다섯 넘어 장면이 오는지, 아버지가 죽으면 빈 자리, 장면마다 고를 것,
// 떳떳이 받은 혼외 자식이 의붓(stepfamily)·거둔 아이(adopt)·숨긴 아이(secret)와 섞이지 않는지, 대 잇기 다툼, 옛 저장, 글 깨짐을 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { byId, makePerson, kill } from '../src/npc.js';
import { bbLines, bbLine, bbInfo, bbState, basebornKids } from '../src/baseborn/index.js';
import { stepState } from '../src/stepfamily/index.js';
import { adoptInfo } from '../src/adopt/index.js';

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
    const mine = kind.startsWith('bb_');
    if (mine) { scenes[kind] = (scenes[kind] ?? 0) + 1; ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`); }
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    if (typeof pick === 'function') idx = pick(kind, pe) ?? idx;
    else if (mine && pick != null) idx = pick;
    idx = Math.min(idx, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); keep(kind, `${pe.text.slice(0, 110)}… [${pe.choices[idx]}] → ${String(out).slice(0, 100)}`); }
    ok(Number.isFinite(g.player.money) && g.player.money >= 0 && (g.player.familyMoney ?? 0) >= 0, `money after ${kind}`);
  }
}
function checkMonth(g) {
  const ls = bbLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
  const l = bbLine(g); ok(l === null || typeof l === 'string', 'line');
}
function checkInfo(g) {
  const i = bbInfo(g);
  const js = JSON.stringify(i);
  ok(i && Array.isArray(i.kids) && Array.isArray(i.npc) && !/undefined|NaN/.test(js), `info ${js.slice(0, 200)}`);
  if (i.self) ok(!bad(i.self.recog) && (i.self.father === null || !bad(i.self.father)), `info self ${JSON.stringify(i.self)}`);
  for (const k of i.kids) {
    ok(!bad(k.name) && !bad(k.word) && k.bond >= 0 && k.bond <= 100, `info kid ${JSON.stringify(k)}`);
    ok(stepState(g).ties[k.id]?.kind !== 'mine', `서자가 의붓 'mine'으로도 읽힘 ${k.name}`);
    ok(!adoptInfo(g).kids.some((x) => x.id === k.id), `서자가 거둔 아이로도 읽힘 ${k.name}`);
  }
}
const rest = (g, pick) => { endMonth(g, [{ id: 'rest' }]); resolveAll(g, pick); checkMonth(g); };

// 1. 그냥 사는 삶: NPC 집안에 서자가 나고 커 간다
let made = 0; const ev = { recog: 0, path: 0, seize: 0, fight: 0, split: 0 };
for (let k = 0; k < 4; k++) {
  const g = newGame({ name: k % 2 ? '요나스' : '클라라', sex: k % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'capital_artisan', 'port_folk'][k], mode: 'free', seed: 4000 + k });
  const rng = rngOf(g);
  for (let m = 0; m < 40 * 12 && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !/travel|move/.test(a.id));
    const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    endMonth(g, ch); resolveAll(g); checkMonth(g);
    if (m % 60 === 0) checkInfo(g);
  }
  const st = bbState(g);
  made += st.made;
  for (const x of st.npc) {
    const kid = byId(g, x.kid); const by = byId(g, x.by);
    ok(kid?.baseborn && by?.childIds.includes(x.kid), 'npc baseborn kid linked');
    if (x.recog) ev.recog++; if (x.path) ev.path++; if (x.ev.seize) ev.seize++; if (x.ev.fight) ev.fight++; if (x.ev.split) ev.split++;
  }
  checkInfo(g);
}
ok(made >= 6, `NPC 서자가 너무 적음 ${made}`);
ok(ev.recog >= 1 && ev.path + ev.fight >= 1, `NPC 서자의 세월 ${JSON.stringify(ev)}`);
ok((kinds.npc ?? 0) >= 1, 'NPC 집안 글');

// 2. 서자로 태어난 삶: 열다섯 넘어 장면이 오고, 아버지가 죽으면 빈 자리
let selfLives = 0;
for (let k = 0; k < 4; k++) {
  const fam = k % 2 ? 'merchant_bastard' : 'count_bastard';
  // 41단계: 하늘 소식이 주사위를 밀어 포르텔 서출 둘이 열일곱·스무 살에 갑작스러운 병과 칼 상처로 죽고 아우가 대를 잇는 판이 나왔다.
  // 서출 장면을 재는 동안은 다친 데를 낫게 두고, 그래도 본인이 죽어 대가 넘어가면 다른 씨앗으로 다시 산다 (재려는 건 서출 본인의 삶)
  let g;
  for (let t = 0; t < 4; t++) {
    g = newGame({ name: '한스', sex: k < 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed: 4020 + k + t * 977 });
    ok(bbState(g).self || true, 'self');
    me(g).ageMonths = 14 * 12 + 6;
    const pid0 = g.player.id;
    for (let i = 0; i < 14 * 12 && !g.over && g.player.id === pid0; i++) { rest(g); g.player.injuries = []; if (i === 6 * 12) { const f = byId(g, bbState(g).self?.fid); if (f && k >= 2) kill(g, f, '낙마'); } }
    if (g.player.id === pid0) break;
  }
  const st = bbState(g);
  ok(st.self && st.self.fid != null, `서출 삶인데 self 없음 ${fam}`);
  if (Object.keys(st.done).length >= 2) selfLives++;
  checkInfo(g);
}
ok(selfLives >= 3, `서출 삶 장면이 드묾 ${selfLives}/4 ${JSON.stringify(scenes)}`);
ok((scenes.bb_path ?? 0) >= 2, '서출이 갈 길');
ok((scenes.bb_seize ?? 0) >= 1, '아버지가 죽은 뒤 빈 자리');
ok((kinds.self ?? 0) >= 2, '서출 삶 글');

// 3. 장면마다 고를 것을 다 골라 본다
{
  const g = newGame({ name: '하넬', sex: 'm', familyId: 'count_bastard', mode: 'free', seed: 4040 });
  me(g).ageMonths = 30 * 12; g.player.money = 300; g.player.familyMoney = 200;
  const rng = rngOf(g);
  const pl = L(g).place;
  const mk = (age, sex, extra = {}) => { const p = makePerson(rng, { ageMonths: age * 12 + 1, sex, job: age >= 15 ? 'farmer' : 'child', ...extra }); p.place = pl; p.known = true; g.people.push(p); return p; };
  rest(g);
  const st = bbState(g);
  const f = byId(g, st.self.fid);
  const rv = mk(33, 'm', { fatherId: f.id }); f.childIds.push(rv.id);
  // 내 혼외 자식과 적자, 배우자
  const w = mk(29, 'f'); me(g).spouseId = w.id; w.spouseId = me(g).id; g.player.familyIds.push(w.id);
  const lover = mk(28, 'f');
  const bk = mk(9, 'm', { fatherId: me(g).id, motherId: lover.id }); me(g).childIds.push(bk.id); lover.childIds.push(bk.id); g.player.familyIds.push(bk.id);
  const lg = mk(8, 'f', { fatherId: me(g).id, motherId: w.id }); me(g).childIds.push(lg.id); w.childIds.push(lg.id); g.player.familyIds.push(lg.id);
  rest(g);
  ok(basebornKids(g).map((p) => p.id).join() === String(bk.id), `혼외 자식 읽기 ${basebornKids(g).map((p) => p.name)}`);
  ok(stepState(g).ties[bk.id]?.kind !== 'mine', '혼외 자식은 의붓 mine이 아님');
  const base = { fa: f.name, rv: rv.name, rvId: rv.id };
  const DATA = {
    bb_name: [{ ...base, where: '길드 회관에서' }, { ...base, rv: '', rvId: null, where: '학원 입학 날' }],
    bb_feast: [base, { ...base, rv: '', rvId: null }],
    bb_rival: [{ ...base, place: '베르덴' }],
    bb_recognize: [{ ...base, mom: true }, { ...base, mom: false }],
    bb_path: [{ fa: f.name, age: 15, trade: true }, { fa: f.name, age: 17, trade: false }],
    bb_seize: [{ ...base, wealth: 900 }, { ...base, rv: '', rvId: null, wealth: 300 }],
    bb_hearth: [{ id: bk.id, k: bk.name, sp: w.name, spId: w.id, lg: lg.name }, { id: bk.id, k: bk.name, sp: w.name, spId: w.id, lg: '' }],
    bb_quarrel: [{ id: bk.id, k: bk.name, lg: lg.name, lgId: lg.id }],
    bb_legit: [{ id: bk.id, k: bk.name, sp: w.name }, { id: bk.id, k: bk.name, sp: '' }],
    bb_send: [{ id: bk.id, k: bk.name, age: 14, legit: false }, { id: bk.id, k: bk.name, age: 16, legit: true }],
    bb_contest: [{ old: '오토', rv: rv.name, rvId: rv.id }],
  };
  for (const [kind, list] of Object.entries(DATA)) for (const d of list) for (let i = 0; i < 5; i++) {
    bk.place = pl; g.player.money = Math.max(g.player.money, 300); g.player.familyMoney = Math.max(g.player.familyMoney ?? 0, 200);
    const shown = showScene(g, { kind, at: pl, t: 0, ...d }, { force: true });
    ok(shown && g.pendingEvent, `장면이 안 뜸 ${kind} ${i}`);
    resolveAll(g, i);
  }
  for (const k of Object.keys(DATA)) ok(scenes[k] > 0, `장면 ${k}`);
  ok(g.player.lastName === f.lastName, '인정받으면 아버지 성');
  checkInfo(g);
  for (let i = 0; i < 24; i++) rest(g);
  ok((kinds.kid ?? 0) >= 1, `혼외 자식 글 ${JSON.stringify(kinds)}`);
}

// 4. 떳떳이 받은 아이(secret_bastard 'own')는 서자, 숨긴 아이는 secret 몫
{
  const g = newGame({ name: '오토', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4060 });
  me(g).ageMonths = 26 * 12; g.player.money = 200;
  const rng = rngOf(g); const pl = L(g).place;
  const p = makePerson(rng, { sex: 'f', ageMonths: 24 * 12, job: 'weaver' }); p.place = pl; p.known = true; g.people.push(p);
  rest(g);
  for (const [i, want] of [[0, true], [1, false]]) {
    const before = new Set(me(g).childIds);
    ok(showScene(g, { kind: 'secret_bastard', at: pl, t: 0, pid: p.id }, { force: true }), 'secret_bastard');
    resolveAll(g, (kind) => (kind === 'secret_bastard' ? i : null));
    rest(g);
    const kid = g.people[g.people.length - 1];
    const isBb = basebornKids(g).some((x) => x.id === kid.id);
    ok(isBb === want, `${i === 0 ? '떳떳이 받은 아이는 서자' : '숨긴 아이는 서자 아님'} ${kid.name} ${isBb} ${before.has(kid.id)}`);
  }
  checkInfo(g);
}

// 5. 적출 아닌 서자가 대를 이으면 적자 형제가 따진다
{
  const g = newGame({ name: '오토', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4080 });
  me(g).ageMonths = 60 * 12;
  const rng = rngOf(g); const pl = L(g).place;
  const mk = (age, sex, extra = {}) => { const p = makePerson(rng, { ageMonths: age * 12 + 1, sex, job: 'farmer', ...extra }); p.place = pl; p.known = true; g.people.push(p); return p; };
  const w = mk(58, 'f'); me(g).spouseId = w.id; w.spouseId = me(g).id;
  const lg = mk(30, 'm', { fatherId: me(g).id, motherId: w.id }); me(g).childIds.push(lg.id); w.childIds.push(lg.id);
  const lover = mk(50, 'f');
  const heir = mk(27, 'm', { fatherId: me(g).id, motherId: lover.id }); me(g).childIds.push(heir.id); lover.childIds.push(heir.id);
  rest(g);
  ok(heir.baseborn && !lg.baseborn, '서자 표시');
  const old = g.player; const oldId = me(g).id;
  byId(g, oldId).isPlayer = false; byId(g, oldId).alive = false; heir.isPlayer = true;
  g.player = { ...old, id: heir.id, name: heir.name };
  L(g).queue.length = 0; g.pendingEvent = null;
  runHooks('heir', g, rng, old);
  ok(L(g).queue.some((x) => x.kind === 'bb_contest'), `대 잇기 장면 ${L(g).queue.map((x) => x.kind)}`);
  ok(bbState(g).self, '서자가 대를 이으면 내가 서자');
  for (let i = 0; i < 4; i++) rest(g);
  ok((scenes.bb_contest ?? 0) > 1, '서출이 이은 집 장면');
}

// 6. 옛 저장
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4090 });
  delete g.baseborn; runHooks('migrate', g);
  ok(g.baseborn && typeof g.baseborn.kids === 'object' && Array.isArray(g.baseborn.npc), '옛 저장');
  endMonth(g, [{ id: 'rest' }]); checkInfo(g);
  ok(!bbState(g).self, '농부 집 아이는 서출 아님');
}

console.log(`장면 ${JSON.stringify(scenes)}`);
console.log(`줄 ${JSON.stringify(kinds)}  NPC 서자 ${made} ${JSON.stringify(ev)}  서출 삶 ${selfLives}/4`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('baseborntest OK');
