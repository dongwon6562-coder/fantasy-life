import './lsshim.js';
import '../src/content.js';
// 31단계 도우미2 점검: 형제자매. 형제가 있는 여러 삶을 돌려 함께 자라는 줄, 갈라지는 길, 어린 시절·어른 장면,
// 부모가 남긴 것·가업·곤경·배신·조카·삼촌이 다 나오는지, 글이 깨지지 않는지, 돈이 음수가 되지 않는지, 옛 저장을 본다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L, SCENE_STRICT } from '../src/adventure/core.js';
import { makePerson, byId, kill } from '../src/npc.js';
import { siblingsState, siblingLines, siblingLine, siblingsInfo, siblingsOf, sibWord } from '../src/siblings/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 25) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|  /.test(t);
const kinds = {}; const scenes = {}; const samples = {};
const farSeen = {};
let months = 0; let lines = 0; let uncleSeen = 0;

function addSib(g, ageY, sex) {
  const m = me(g); const f = byId(g, m.fatherId); const mo = byId(g, m.motherId);
  const s = makePerson(rngOf(g), { ageMonths: ageY * 12, sex, lastName: m.lastName, fatherId: f.id, motherId: mo.id, job: ageY >= 15 ? 'farmer' : 'child' });
  s.known = true; s.affection = 40; g.people.push(s);
  f.childIds.push(s.id); mo.childIds.push(s.id); g.player.familyIds.push(s.id);
  return s;
}
function resolveAll(g) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const kind = L(g).scene?.kind ?? pe.id;
    scenes[kind] = (scenes[kind] ?? 0) + 1;
    if (kind.startsWith('sib_')) ok(!bad(pe.title) && !bad(pe.text) && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    const idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    const out = resolveEvent(g, rngOf(g), idx);
    if (kind.startsWith('sib_')) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); (samples[kind] ??= []).length < 2 && samples[kind].push(`${pe.text.slice(0, 70)} [${pe.choices[idx]}] → ${String(out).slice(0, 90)}`); }
    ok(g.player.money >= 0 && g.player.familyMoney >= 0, `money < 0 after ${kind}`);
  }
}
function play(seed, years, setup, stay = false) {
  const g = newGame({ name: seed % 2 ? '바우' : '엘린', sex: seed % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][seed % 3], mode: 'free', seed });
  addSib(g, 4, 'm'); addSib(g, 7, 'f');
  setup?.(g);
  const rng = rngOf(g);
  for (let m = 0; m < years * 12 && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !stay || !/travel|move/.test(a.id)); const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    endMonth(g, ch);
    resolveAll(g);
    if (g.over) break;
    months++;
    const ls = siblingLines(g);
    ok(Array.isArray(ls) && ls.length <= 2, 'shape');
    for (const x of ls) if (x.kind === 'far') { const key = `${seed}:${x.id}`; const head = x.form; const prev = (farSeen[key] ??= []); ok(!prev.includes(head), `같은 형제에게 같은 소식 앞 문장 [${prev}/${head}] ${key}: ${x.text}`); prev.push(head); if (prev.length > 5) prev.shift(); ok(head != null, 'far form'); }
    for (const x of ls) { lines++; ok(!bad(x.text), `bad line [${x.kind}]: ${x.text}`); kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; (samples[x.kind] ??= []).length < 3 && samples[x.kind].push(`${playerAge(g)}살: ${x.text}`); }
    const l1 = siblingLine(g); ok(l1 === null || typeof l1 === 'string', 'line');
    if (m % 24 === 0) { const info = siblingsInfo(g); ok(Array.isArray(info.siblings) && info.siblings.every((s) => !bad(s.word) && !bad(s.bond)), 'info'); uncleSeen += info.uncles.length; }
  }
  return g;
}
for (let s = 1; s <= 6; s++) play(700 + s, 45);
// 늙은 부모와 가업, 부모의 죽음과 나눔
play(801, 40, (g) => { const f = byId(g, me(g).fatherId); f.job = 'smith'; f.ageMonths = 40 * 12; f.wealth = 150; const mo = byId(g, me(g).motherId); mo.ageMonths = 44 * 12; });
play(802, 40, (g) => { const f = byId(g, me(g).fatherId); f.job = 'baker'; f.ageMonths = 42 * 12; f.wealth = 120; });
// 가업 장면은 부모 곁에 있어야 뜬다: 떠돌지 않는 삶 하나 (34단계에 무작위 흐름이 바뀌어 덧붙임)
play(803, 6, (g) => {
  const m = me(g); m.ageMonths = 20 * 12; const f = byId(g, m.fatherId); f.job = 'smith'; f.ageMonths = 60 * 12; f.wealth = 130;
  for (const [i, id] of g.player.familyIds.slice(-2).entries()) { const p = byId(g, id); p.ageMonths = (17 + i * 5) * 12; p.job = 'farmer'; }
}, true);
// 대 잇기 뒤 삼촌·고모: 오래 산다
for (let s = 0; s < 3; s++) play(900 + s, 90);

// 어른이 된 뒤: 틀어진 형제의 배신, 부모 잃은 조카
{
  const g = newGame({ name: '바우', sex: 'm', familyId: 'farmer', mode: 'free', seed: 333 });
  me(g).ageMonths = 30 * 12; L(g).home = 'rent'; g.player.money = 200;
  const a = addSib(g, 34, 'm'); a.traits = ['greedy', 'cruel']; a.affection = -20; a.rivalry = 70;
  const b = addSib(g, 27, 'f'); b.job = 'weaver';
  const sp = makePerson(rngOf(g), { ageMonths: 28 * 12, sex: 'm', job: 'farmer' }); g.people.push(sp); b.spouseId = sp.id; sp.spouseId = b.id;
  const kid = makePerson(rngOf(g), { ageMonths: 6 * 12, fatherId: sp.id, motherId: b.id }); g.people.push(kid); b.childIds.push(kid.id); sp.childIds.push(kid.id);
  endMonth(g, []); resolveAll(g);
  kill(g, sp, '병'); kill(g, b, '열병');
  const rng = rngOf(g);
  for (let m = 0; m < 60 && !g.over; m++) { endMonth(g, [{ id: 'rest' }]); resolveAll(g); }
  ok((scenes.sib_orphan ?? 0) > 0, '조카 거두기 장면 없음');
  ok((scenes.sib_betray ?? 0) > 0, '배신 장면 없음');
}
// 옛 저장(siblings 없음)도 깨지지 않아야 한다
{
  const g = newGame({ name: '바우', sex: 'm', familyId: 'farmer', mode: 'free', seed: 77 });
  delete g.siblings;
  ok(siblingLines(g).length === 0, 'old save lines');
  endMonth(g, []);
  ok(Array.isArray(siblingsState(g).month), 'old save month');
}
console.log('줄', lines, '달', months, '갈래', JSON.stringify(kinds));
console.log('장면', JSON.stringify(Object.fromEntries(Object.entries(scenes).filter(([k]) => k.startsWith('sib_')))), '삼촌 본 횟수', uncleSeen);
for (const [k, v] of Object.entries(samples)) for (const t of v) console.log(`  [${k}] ${t}`);
for (const k of ['grow', 'job', 'wed', 'baby']) ok((kinds[k] ?? 0) > 0, `${k} 줄 없음`);
for (const k of ['sib_blame', 'sib_share', 'sib_rival', 'sib_trade', 'sib_estate']) ok((scenes[k] ?? 0) > 0, `${k} 장면 없음`);
const sec = (Date.now() - t0) / 1000;
console.log(`${sec.toFixed(1)}초`);
ok(sec < (process.env.FL_PARALLEL ? 120 : 60), '1분 넘음');
if (fail) { console.log(`siblingtest: ${fail} FAIL`); process.exit(1); }
console.log('siblingtest OK');
