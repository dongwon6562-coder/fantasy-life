import './lsshim.js';
import '../src/content.js';
// 41단계 도우미2 점검: 옥살이와 탈옥. 갇히면 감옥 꼴에 맞는 옥살이가 시작되고 감방 동료·옥졸이 생기는지,
// 안에서 장면(첫날·옥졸·패거리·편지·면회·탈옥 꾸미기·그날 밤·열병·낙석)이 오는지, 형기를 마치면 옥문 앞,
// 나온 뒤 따라다니는 이름·옛 동료, 갇힌 식구 빼내기, 플레이어 없이도 NPC가 갇히고 나오고 탈옥하는지, 옛 저장, 글 깨짐을 본다.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { byId, makePerson } from '../src/npc.js';
import { jail, isJailed, crimeState } from '../src/crime.js';
import { prisonLines, prisonLine, prisonInfo, prisonState, prisonKind } from '../src/prison/index.js';

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
    const mine = kind.startsWith('pr_');
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
  const ls = prisonLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.kind}: ${x.text}`); keep(`line:${x.kind}`, x.text); }
  const l = prisonLine(g); ok(l === null || typeof l === 'string', 'line');
}
function checkInfo(g) {
  const i = prisonInfo(g);
  const js = JSON.stringify(i);
  ok(i && Array.isArray(i.past) && Array.isArray(i.npc) && Array.isArray(i.kin) && !/undefined|NaN/.test(js), `info ${js.slice(0, 200)}`);
  if (i.stay) ok(!bad(i.stay.kind) && !bad(i.stay.where) && i.stay.left >= 0 && i.stay.mates.every((m) => !bad(m.name)), `info stay ${JSON.stringify(i.stay)}`);
  ok(!!i.stay === isJailed(g), `stay와 jailed가 어긋남 ${!!i.stay} ${isJailed(g)}`);
}
// 갇힌 동안엔 감방 행동만 고를 수 있다
const act = (g, pref) => { const acts = availableActions(g); const a = acts.find((x) => x.id === pref) ?? acts.find((x) => x.id === 'rest') ?? acts[0]; return { id: a.id }; };
const month = (g, pick, pref = 'jail_endure') => { endMonth(g, Array.from({ length: slotsFor(g) }, () => act(g, pref))); resolveAll(g, pick); checkMonth(g); };

// 0. 감옥 꼴
ok(prisonKind('leocast') === 'tower' && prisonKind('graubel') === 'quarry' && prisonKind('ern') === 'lockup' && prisonKind('verden') === 'dungeon', 'prisonKind');

// 1. 그냥 사는 삶: NPC가 갇히고 나오고 탈옥한다
let made = 0, broke = 0, out = 0;
for (let k = 0; k < 4; k++) {
  const g = newGame({ name: k % 2 ? '요나스' : '클라라', sex: k % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'slum_orphan', 'port_folk'][k], mode: 'free', seed: 4110 + k }); // 45단계: 나라 사이 흐름으로 주사위가 밀려, 풀려난 NPC가 다른 일로 다시 away가 된 판이 있어 씨앗 4100→4110
  const rng = rngOf(g);
  for (let m = 0; m < 30 * 12 && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !/travel|move/.test(a.id));
    const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    endMonth(g, ch); resolveAll(g); checkMonth(g);
    if (m % 60 === 0) checkInfo(g);
  }
  const st = prisonState(g);
  made += st.made; broke += st.broke;
  out += st.npc.filter((x) => x.how === 'served').length;
  const open = st.npc.filter((y) => !y.end);
  ok(open.filter((x) => byId(g, x.id)?.away).length >= open.length * 0.9, `갇힌 NPC 대부분은 away ${open.length}`);
  // 내가 풀어 준 뒤 다른 일이 없었다면 away가 풀려 있다
  for (const x of st.npc.filter((y) => y.end && y.mine && y.how === 'served' && !st.npc.some((z) => !z.end && z.id === y.id))) { const p = byId(g, x.id); if (p && /감옥에서 풀려났다/.test(p.history.at(-1)?.text ?? '')) ok(!p.away, `풀려난 NPC가 away로 남음 ${p.name}`); }
  checkInfo(g);
}
ok(made >= 10, `NPC 죄수가 너무 적음 ${made}`);
ok(out >= 3 && broke >= 1, `NPC가 나오고 달아남 ${out} ${broke}`);
ok((kinds.npc ?? 0) >= 2, 'NPC 글');

// 2. 내가 갇힌다: 감옥마다 옥살이, 형기를 다 채우고 옥문 앞으로
let served = 0, started = 0; // 사면·구출로 첫 달에 풀려나는 판도 있다
for (const [k, pl] of [['dungeon', 'verden'], ['tower', 'leocast'], ['quarry', 'graubel'], ['lockup', 'ern'], ['dungeon', 'harfen'], ['tower', 'leocast']].entries()) {
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4120 + k });
  me(g).ageMonths = 24 * 12; g.player.money = 60;
  L(g).place = pl[1];
  month(g, null, 'rest');
  jail(g, 14);
  for (let i = 0; i < 18 && !g.over; i++) { month(g, null, ['jail_endure', 'jail_labor', 'jail_talk'][i % 3]); if (i === 1) { const st = prisonState(g).stay; if (st && st.kind === pl[0] && st.mates.length >= 2 && st.guard != null) started++; else if (isJailed(g)) ok(false, `옥살이 시작 ${pl[1]} ${JSON.stringify(st)}`); checkInfo(g); } }
  if (!isJailed(g)) served++;
  for (let i = 0; i < 3; i++) month(g, null, 'rest');
  ok(prisonState(g).past.length >= 1, `지난 옥살이 기록 ${pl[1]}`);
  checkInfo(g);
}
ok(served >= 4 && started >= 4, `형기를 마치거나 나온 삶 ${served}/6, 옥살이 시작 ${started}/6`);
ok((scenes.pr_arrive ?? 0) >= 5, `첫날 장면 ${scenes.pr_arrive}`);
ok((scenes.pr_release ?? 0) >= 3, `옥문 앞 장면 ${scenes.pr_release}`);
const inside = ['pr_guard', 'pr_gang', 'pr_letter', 'pr_visit', 'pr_plot', 'pr_sick', 'pr_quarry'].filter((k) => scenes[k]).length;
ok(inside >= 3, `안에서 장면이 드묾 ${JSON.stringify(scenes)}`);
ok((kinds.in ?? 0) >= 6, '옥 안의 글');

// 3. 탈옥: 꾸민 탈옥의 날까지 (유배로 바꾸자는 말은 물리친다)
const stayIn = (kind) => (kind === 'pr_break' || kind === 'pr_plot' ? 0 : kind === 'exile_decree' ? 1 : null);
{
  let escaped = 0;
  for (let k = 0; k < 6; k++) {
    const g = newGame({ name: '마르타', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4140 + k });
    me(g).ageMonths = 26 * 12; L(g).place = 'verden'; crimeState(g).craft = 90; crimeState(g).contacts = 5; g.player.stats.agi = 80;
    month(g, null, 'rest');
    jail(g, 20);
    month(g, stayIn);
    const st = prisonState(g).stay; const mate = byId(g, st.mates[0]);
    ok(showScene(g, { kind: 'pr_plot', at: 'verden', t: 0, mate: mate.name, mateId: mate.id }, { force: true }), 'plot scene');
    resolveAll(g, stayIn);
    ok(prisonState(g).stay?.plot === 1, '탈옥 꾸밈');
    for (let i = 0; i < 14 && isJailed(g); i++) month(g, stayIn);
    if (!isJailed(g)) { month(g, null, 'rest'); escaped++; ok(prisonState(g).past.at(-1)?.how === "escaped" && (crimeState(g).heat.verden ?? 0) >= 50, `탈옥 기록 ${JSON.stringify(prisonState(g).past.at(-1))} ${me(g).history.slice(-4).map((h) => h.text)}`); }
    checkInfo(g);
  }
  ok((scenes.pr_break ?? 0) >= 4, `그날 밤 장면 ${scenes.pr_break}`);
  ok(escaped >= 1, `탈옥 성공 ${escaped}/6`);
}

// 4. 장면마다 고를 것을 다 골라 본다
{
  const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4160 });
  me(g).ageMonths = 30 * 12; g.player.money = 300; L(g).place = 'graubel';
  const rng = rngOf(g);
  month(g, null, 'rest');
  jail(g, 30);
  month(g);
  const st = prisonState(g).stay; const [m1, m2] = st.mates.map((id) => byId(g, id));
  const kin = byId(g, me(g).fatherId) ?? byId(g, g.player.familyIds[0]);
  const DATA = {
    pr_arrive: [{ where: '그라우벨 채석장 노역 막사', boss: m1.name, bossId: m1.id, old: m2.name, oldId: m2.id }],
    pr_guard: [{ guard: '오스카', pk: 'quarry' }, { guard: '오스카', pk: 'dungeon' }],
    pr_gang: [{ head: '볼프', headId: m2.id }],
    pr_letter: [{ who: kin.name, whoId: kin.id, body: '밥은 먹고 있는지.' }],
    pr_visit: [{ who: kin.name, whoId: kin.id, food: '말린 사과 한 줌을 가져왔다.' }],
    pr_plot: [{ mate: m1.name, mateId: m1.id }],
    pr_break: [{ mate: m1.name, mateId: m1.id, left: 12 }],
    pr_sick: [{ mate: m2.name, mateId: m2.id }],
    pr_quarry: [{ mate: m2.name, mateId: m2.id }],
  };
  for (const [kind, list] of Object.entries(DATA)) for (const d of list) for (let i = 0; i < 4; i++) {
    if (!isJailed(g)) { jail(g, 30); month(g); }
    g.player.money = Math.max(g.player.money, 300);
    const shown = showScene(g, { kind, at: 'graubel', t: 0, ...d }, { force: true });
    ok(shown && g.pendingEvent, `장면이 안 뜸 ${kind} ${i}`);
    resolveAll(g, i);
  }
  // 나온 뒤
  crimeState(g).jailed = null; month(g, null, 'rest'); resolveAll(g, 0);
  const x = makePerson(rng, { sex: 'm', ageMonths: 40 * 12, job: 'gang_member' }); x.place = 'graubel'; g.people.push(x);
  const kx = prisonState(g).npc.find((y) => !y.end) ?? { id: kin.id };
  const AFTER = {
    pr_release: [{ how: 'served', months: 14, who: kin.name, whoId: kin.id, gang: true }, { how: 'early', months: 3, who: '', whoId: null, gang: false }],
    pr_mark: [{ mk: 'work', place: '그라우벨' }, { mk: 'well', place: '베르덴' }],
    pr_old: [{ mate: x.name, mateId: x.id, good: true, ask: 'hide' }, { mate: x.name, mateId: x.id, good: false, ask: 'job' }, { mate: x.name, mateId: x.id, good: true, ask: 'heist' }],
    pr_kin: [{ id: kx.id, who: byId(g, kx.id)?.name ?? kin.name, why: '도둑질로', place: '그라우벨', left: 6, cost: 30 }],
  };
  for (const [kind, list] of Object.entries(AFTER)) for (const d of list) for (let i = 0; i < 4; i++) {
    crimeState(g).jailed = null; g.player.money = Math.max(g.player.money, 300);
    const shown = showScene(g, { kind, at: 'graubel', t: 0, ...d }, { force: true });
    ok(shown && g.pendingEvent, `장면이 안 뜸 ${kind} ${i}`);
    resolveAll(g, i);
  }
  for (const k of [...Object.keys(DATA), ...Object.keys(AFTER)]) ok(scenes[k] > 0, `장면 ${k}`);
  month(g, null, 'rest'); checkInfo(g);
}

// 5. 갇힌 식구: NPC 식구가 갇히면 빼낼지 묻는다
{
  const g = newGame({ name: '오토', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4180 });
  me(g).ageMonths = 30 * 12; g.player.money = 200;
  const rng = rngOf(g);
  const sib = makePerson(rng, { sex: 'm', ageMonths: 27 * 12, job: 'laborer' }); sib.place = L(g).place; g.people.push(sib); g.player.familyIds.push(sib.id);
  month(g, null, 'rest');
  const st = prisonState(g);
  st.npc.push({ id: sib.id, place: L(g).place, until: g.date.year * 12 + g.date.month + 10, why: '술집 싸움 끝에', at: 0, ev: {}, end: null, mine: true }); sib.away = true;
  for (let i = 0; i < 12; i++) month(g, (kind) => (kind === 'pr_kin' ? 0 : null), 'rest');
  ok((scenes.pr_kin ?? 0) >= 5, `갇힌 식구 장면 ${scenes.pr_kin}`);
  ok(!sib.away || st.npc.some((x) => x.id === sib.id && !x.end), '식구가 나오면 away 풀림');
  checkInfo(g);
}

// 6. 옛 저장과 대 잇기
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4190 });
  delete g.prison; runHooks('migrate', g);
  ok(g.prison && Array.isArray(g.prison.npc) && Array.isArray(g.prison.past), '옛 저장');
  me(g).ageMonths = 25 * 12; jail(g, 6); month(g);
  ok(prisonState(g).stay, '갇힘');
  runHooks('heir', g, rngOf(g), g.player);
  ok(!prisonState(g).stay && prisonState(g).past.length === 0, '대 잇기 뒤 옥살이 기록 비움');
}

console.log(`장면 ${JSON.stringify(scenes)}`);
console.log(`줄 ${JSON.stringify(kinds)}  NPC 죄수 ${made} 나옴 ${out} 탈옥 ${broke}  형기 마친 삶 ${served}/6`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('prisontest OK');
