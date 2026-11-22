import '../src/content.js';
// 목수와 석공(src/builder/) 점검. 브라우저 없이 1분 안에: 어른 하나를 길러 복제해 쓴다.
//   node tools/buildertest.js [-v]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, SCENES } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { realmState } from '../src/realms/index.js';
import { ACTIONS } from '../src/actions.js';
import { takeJob, WORK } from '../src/jobs.js';
import { makeRng } from '../src/rng.js';
import { V } from '../src/vocation/core.js';
import { FS } from '../src/frontier/state.js';
import { found } from '../src/frontier/world.js';
import { WS, WORKS } from '../src/works/state.js';
import { H } from '../src/house/core.js';
import { builderInfo, builderLine, builderState as B, kindsHere, offersFor, examReady, fallOf, addBuilt, worldBuild, fallChance } from '../src/builder/index.js';
import { rankOf, monthsOf, kindName, KINDS } from '../src/builder/core.js';

SCENE_STRICT.on = true;
const verbose = process.argv.includes('-v');
const t0 = Date.now();
let problems = 0;
const fail = (...a) => { problems++; console.log('FAIL', ...a); };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null/.test(t);
const josa = (t) => /\(으\)|을\(를\)|이\(가\)|은\(는\)|과\(와\)/.test(t);
const samples = [];

function month(g, want = []) {
  const acts = availableActions(g);
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) {
    let a = want.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (!a || g.player.fatigue > 75) a = acts.find((x) => x.id === 'rest') ?? acts[0];
    choices.push({ id: a.id });
  }
  const res = endMonth(g, choices);
  for (const r of res) { if (bad(r.text)) fail('bad result', r); if (josa(r.text)) fail('josa result', r); }
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) {
    const pe = g.pendingEvent;
    const out = resolveEvent(g, rngOf(g), rngOf(g).int(0, pe.choices.length - 1));
    if (bad(out)) fail('bad scene text', L(g).scene?.kind, pe.title, out);
  }
}
let BASE = null;
function adult(seed) {
  if (!BASE) {
    for (let k = 0; ; k++) {
      const g = newGame({ name: '하넬', sex: 'm', familyId: 'farmer', mode: 'free', seed: 3501 + k * 977 });
      while (playerAge(g) < 18 && !g.over) month(g, ['rest']);
      if (!g.over) { BASE = JSON.stringify(g); break; }
    }
  }
  const g = JSON.parse(BASE);
  g.rngState.s = seed | 0;
  return g;
}
function placeAt(g, place) { const l = L(g); l.place = place; l.travel = null; l.home = 'inn'; l.queue = []; l.scene = null; g.pendingEvent = null; const R = realmState(g); R.cur = PLACES[place]?.realm ?? 'leonia'; R.last = place; if (g.army) Object.assign(g.army, { service: null, campaign: null, captive: null }); if (g.crime) g.crime.jailed = null; if (g.explore) g.explore.exp = null; }
function fresh(seed, pl, job = null, sk = 0) {
  const g = adult(seed); placeAt(g, pl);
  g.player.injuries = []; g.player.fatigue = 0; g.player.stress = 10; g.player.money = 200;
  for (const k of ['wil', 'sen', 'agi', 'cha', 'str', 'int']) g.player.stats[k] = 40;
  L(g).job = null;
  g.player.skills.building = sk;
  if (job) takeJob(g, job);
  return g;
}
const R = (g) => rngOf(g);
const act = (id) => ACTIONS.find((a) => a.id === id);
const can = (g, id) => !!act(id).available(g);
function direct(g, kind, data, key) {
  const def = SCENES[kind];
  const s = { kind, at: L(g).place, t: 0, ...data };
  if (def.need && !def.need(g, s)) return { skipped: true };
  const t = def.text(g, s), ch = def.choices(g, s), ti = def.title(g, s);
  if (bad(t) || bad(ti) || josa(t) || josa(ti) || ch.some((c) => bad(c.label) || josa(c.label))) fail('scene text', kind, ti, t, ch.map((c) => c.label));
  if (ch.length > 8) fail('too many choices', kind);
  if (!ch.some((c) => c.key === key)) return { missing: true, keys: ch.map((c) => c.key) };
  const out = def.resolve(g, R(g), s, key);
  if (bad(out) || josa(out)) fail('scene out', kind, key, out);
  if (g.player.money < 0) fail('negative money', kind, key);
  if (samples.length < 90) samples.push(`[${ti}] ${key} → ${out}`);
  return { out, s };
}
const clone = (g) => JSON.parse(JSON.stringify(g));
const checkInfo = (g, where) => {
  const s = JSON.stringify(builderInfo(g));
  if (/NaN|undefined/.test(s)) fail('info', where, s.slice(0, 200));
  const l = builderLine(g);
  if (l !== null && (bad(l) || josa(l))) fail('line', where, l);
  if (l === undefined) fail('line undefined', where);
};
const runAct = (g, id) => { const out = act(id).run(g, R(g)); if (bad(out) || josa(out)) fail('act out', id, out); if (g.player.money < 0) fail('negative money', id); if (samples.length < 100) samples.push(`(${id}) ${out}`); return out; };
const invent = (g, ...ids) => { g.history.inventions ??= []; for (const id of ids) if (!g.history.inventions.includes(id)) g.history.inventions.push(id); return g; };
const adv = (g, n = 1) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; runHooks('afterMonth', g, makeRng({ s: g.date.year * 13 + g.date.month })); } };
// 의뢰 하나를 맡겨 두고 끝까지 짓는다
function take(g, kind, mat = 'good') {
  const offers = [{ kind, client: '이웃 농부', pay: 40 }];
  const r = direct(g, 'builder_offer', { offers }, 'o0'); if (r.missing || r.skipped) { fail('offer', kind, JSON.stringify(r)); return null; }
  const m = direct(g, 'builder_mat', {}, mat); if (m.missing || m.skipped) { fail('mat', kind, mat, JSON.stringify(m)); return null; }
  return B(g).job;
}
function build(g, kind, mat = 'good') {
  if (!take(g, kind, mat)) return null;
  const pl = L(g).place;
  for (let i = 0; i < 12 && B(g).job; i++) { placeAt(g, pl); adv(g, 1); }
  if (B(g).job) fail('job never finished', kind);
  return B(g).built[B(g).built.length - 1];
}

// 1. 처음 판: 세상엔 오래된 건물이 몇 있고, 솜씨 없는 사람에게 일감은 보이지 않는다
{
  const g = fresh(1, 'ern');
  if (B(g).world.length < 2) fail('world buildings at start', B(g).world.length);
  if (can(g, 'builder_seek')) fail('seek without skill');
  if (can(g, 'builder_shop') || can(g, 'builder_exam')) fail('shop/exam for nobody');
  checkInfo(g, 'start');
}

// 2. 목수 도제의 첫 일감: 재료 고르기, 다 짓고 품삯
{
  const g = fresh(2, 'ern', 'carpenter', 12);
  if (!can(g, 'builder_seek')) fail('carpenter cannot seek');
  runAct(g, 'builder_seek');
  if (!L(g).queue.some((q) => q.kind === 'builder_offer')) fail('offer not queued');
  const offers = offersFor(g, R(g));
  if (!offers.length || offers.length > 3) fail('offers', offers.length);
  if (offers.some((o) => KINDS[o.kind].min > 0 || KINDS[o.kind].by === 'm')) fail('apprentice got big or mason work', JSON.stringify(offers));
  for (const key of ['good', 'cheap', 'cut', 'fine']) {
    const c = clone(g); placeAt(c, 'ern');
    const m0 = c.player.money;
    const rec = build(c, 'shed', key);
    if (!rec) continue;
    if (c.player.money <= m0 - (key === 'fine' ? 20 : 0)) fail('no pay', key, m0, c.player.money);
    if ((key === 'cut') !== !!rec.cut) fail('cut flag', key);
    if (B(c).done !== 1 || !B(c).places.includes('ern')) fail('done count', key);
    checkInfo(c, `built ${key}`);
  }
  // 재료가 집의 튼튼함을 가른다 (같은 판에서 견준다)
  const qs = {}; for (const key of ['fine', 'good', 'cheap', 'cut']) { const c = clone(g); c.rngState.s = 77; qs[key] = build(c, 'shed', key)?.q; }
  if (!(qs.fine > qs.good && qs.good > qs.cheap && qs.cheap > qs.cut)) fail('material quality order', JSON.stringify(qs));
  // 자리를 석 달 비우면 일감을 놓친다
  const away = clone(g); placeAt(away, 'ern'); take(away, 'shed'); placeAt(away, 'harfen'); adv(away, 3);
  if (B(away).job) fail('job kept while away');
  // 지붕 갈기는 건물로 남지 않는다
  const rf = clone(g); placeAt(rf, 'ern'); build(rf, 'roof'); if (B(rf).built.length) fail('roof left a building');
  checkInfo(g, 'carpenter');
}

// 3. 조합과 장인의 표식: 큰 일은 표식이 있어야, 변경엔 조합이 없다
{
  const g = fresh(3, 'leocast', 'mason', 62);
  if (kindsHere(g).some((k) => KINDS[k].min >= 2)) fail('big work without mark', kindsHere(g));
  if (rankOf(g) !== 1) fail('rank without mark', rankOf(g));
  if (examReady(g)) fail('exam ready without journeys');
  B(g).done = 5; B(g).places = ['harfen', 'verden'];
  if (!examReady(g) || !can(g, 'builder_exam')) fail('exam not ready');
  runAct(g, 'builder_exam');
  for (const k of ['make', 'buy', 'later']) for (let i = 0; i < 3; i++) { const c = clone(g); c.rngState.s = 11 + i * 37; const r = direct(c, 'builder_exam', {}, k); if (r.missing || r.skipped) fail('exam', k, JSON.stringify(r)); }
  // 솜씨 좋은 석공은 대개 붙는다
  let passed = 0;
  for (let i = 0; i < 10; i++) { const c = clone(g); c.player.skills.building = 90; c.rngState.s = 300 + i * 13; L(c).queue = []; direct(c, 'builder_exam', {}, 'make'); if (L(c).queue.some((q) => q.kind === 'builder_mark')) passed++; }
  if (passed < 6) fail('good mason rarely passes', passed);
  const m = clone(g); direct(m, 'builder_mark', {}, 'star');
  if (B(m).mark !== 'star' || rankOf(m) !== 2) fail('mark/rank', B(m).mark, rankOf(m));
  if (!kindsHere(m).includes('chapel') || !kindsHere(m).includes('tower')) fail('big work after mark', kindsHere(m));
  if (can(m, 'builder_exam')) fail('exam again after mark');
  globalThis.MASTER = m;
  // 변경 개척촌: 조합 없이도 솜씨대로 맡는다
  const f = fresh(4, 'fr_wood', 'carpenter', 62); FS(f).sites.fr_wood.stage = 0;
  if (kindsHere(f).length) fail('work at empty frontier', kindsHere(f));
  found(f, 'fr_wood', 'crown', { pop: 40, food: 6 }); placeAt(f, 'fr_wood');
  if (!kindsHere(f).includes('palisade') || !kindsHere(f).includes('camphall')) fail('frontier work', kindsHere(f));
  const s0 = FS(f).sites.fr_wood.safety; build(f, 'palisade');
  if (FS(f).sites.fr_wood.safety < s0 + 10) fail('palisade safety', s0, FS(f).sites.fr_wood.safety);
  // 회비가 세 해 밀리면 명부에서 지운다
  const d = clone(m); d.player.money = 0; d.date.month = 12;
  for (let y = 0; y < 3; y++) { d.player.money = 0; adv(d, 12); }
  if (B(d).guild.banned <= d.date.year * 12 + d.date.month) fail('dues ban');
  if (kindsHere(d).some((k) => KINDS[k].min > 0)) fail('banned still gets work');
}

// 4. 이름이 남는 건물: 큰 일을 다 지으면 이름을 붙인다
{
  const g = clone(globalThis.MASTER); placeAt(g, 'leocast');
  const rec = build(g, 'chapel');
  if (!rec?.big) fail('chapel not big');
  if (!L(g).queue.some((q) => q.kind === 'builder_name')) fail('name scene not queued');
  for (const k of ['mine', 'place', 'client']) {
    const c = clone(g); const r = direct(c, 'builder_name', { id: rec.id }, k);
    if (r.missing || r.skipped) { fail('name', k); continue; }
    const b = B(c).built.find((x) => x.id === rec.id);
    if (!b.named || bad(b.name)) fail('named', k, b.name);
    if (!V(c).works.some((w) => w.name === b.name)) fail('vocation work', k);
    if (k === 'mine' && !b.name.includes('하넬')) fail('mine name', b.name);
    if (b.mark !== 'star') fail('mark on building');
  }
  checkInfo(g, 'named');
}

// 5. 기술이 일을 바꾼다
{
  const c = fresh(5, 'verden', 'carpenter', 40); c.history.inventions = [];
  if (kindsHere(c).includes('windmill')) fail('windmill before invention');
  invent(c, 'gear', 'windmill'); if (!kindsHere(c).includes('windmill')) fail('windmill after invention');
  const m = clone(globalThis.MASTER); placeAt(m, 'harfen'); m.history.inventions = [];
  if (kindsHere(m).some((k) => ['brickhouse', 'factoryhall', 'station', 'ironbridge'].includes(k))) fail('late kinds early', kindsHere(m));
  if (kindName(m, 'tower') !== '종탑') fail('tower name');
  const t0m = monthsOf(m, 'tower');
  invent(m, 'brick', 'clock', 'crane', 'factory', 'railroad', 'bridge', 'paving', 'survey');
  for (const k of ['brickhouse', 'factoryhall', 'station', 'ironbridge', 'street']) if (!kindsHere(m).includes(k)) fail('late kind missing', k);
  if (kindName(m, 'tower') !== '시계탑') fail('clock tower');
  if (!(monthsOf(m, 'tower') < t0m)) fail('crane faster');
  const bm = clone(m); take(bm, 'brickhouse', 'brick'); if (B(bm).job?.mat !== 'brick') fail('brick material');
  // 일하러 가기에도 새 기술 이야기가 섞인다
  takeJob(m, 'mason'); let saw = 0;
  for (let i = 0; i < 25; i++) { const out = runAct(m, 'work'); if (/기중기|벽돌|측량|쇠 들보|큰길에 돌/.test(out)) saw++; m.player.fatigue = 0; L(m).queue = []; m.pendingEvent = null; }
  if (!saw) fail('no tech lines in work');
}

// 6. 무너진 일과 책임
{
  const g = clone(globalThis.MASTER); placeAt(g, 'harfen');
  const cutP = fallChance(g, { q: 20, cut: true, y: g.date.year, place: 'leocast' }).p, goodP = fallChance(g, { q: 85, cut: false, y: g.date.year, place: 'leocast' }).p;
  if (!(cutP > goodP * 20)) fail('fall odds', cutP, goodP);
  // 속여 지은 건물 마흔 채와 제대로 지은 건물 마흔 채를 스무 해 놓아 둔다
  const sim = clone(g); B(sim).built = []; L(sim).queue = [];
  for (let i = 0; i < 40; i++) { addBuilt(sim, { kind: 'shed', place: 'ern', q: 25, cut: true, name: `헛간 ${i}` }); addBuilt(sim, { kind: 'shed', place: 'ern', q: 88, cut: false, name: `곳간 ${i}` }); }
  B(sim).built.forEach((b) => { b.by = '다른 사람'; });
  adv(sim, 12 * 20);
  const fellCut = B(sim).built.filter((b) => b.cut && b.gone).length, fellGood = B(sim).built.filter((b) => !b.cut && b.gone).length;
  if (fellCut < 10 || fellGood > 6) fail('falls over 20y', fellCut, fellGood);
  // 내가 지은 것이 무너지면 장면이 뜬다
  const f = clone(g); B(f).built = []; L(f).queue = [];
  const r = addBuilt(f, { kind: 'house', place: 'harfen', q: 30, cut: true, name: '하르펜 상인의 집', client: '포목 상인' });
  fallOf(f, R(f), r, null);
  if (!L(f).queue.some((q) => q.kind === 'builder_fall')) fail('fall scene not queued');
  const data = L(f).queue.find((q) => q.kind === 'builder_fall');
  for (const k of ['own', 'rebuild', 'blame', 'silent']) for (let i = 0; i < 4; i++) {
    const c = clone(f); c.rngState.s = 5 + i * 71; if (i === 3) c.player.money = 0;
    const res = direct(c, 'builder_fall', { id: data.id, hurt: i % 2 ? 2 : 0, why: i === 2 ? '지진' : null }, k);
    if (res.missing && !(k === 'rebuild' && i === 3)) fail('fall', k, JSON.stringify(res));
    if (k === 'rebuild' && !res.missing && B(c).built[0].gone) fail('rebuild did not restore');
  }
  // 속이고 남 탓을 하면 들킬 때가 있다
  let caught = 0;
  for (let i = 0; i < 12; i++) { const c = clone(f); c.rngState.s = 900 + i * 31; direct(c, 'builder_fall', { id: data.id, hurt: 1 }, 'blame'); if (B(c).guild.banned > 0) caught++; }
  if (!caught || caught === 12) fail('blame outcomes', caught);
  // 선대가 지은 것이 무너지면 소식만 듣는다
  const a = clone(g); L(a).queue = []; const ar = addBuilt(a, { kind: 'bridge', place: 'verden', q: 30, big: true, name: '옛 다리' }); ar.by = '선대'; fallOf(a, R(a), ar, '홍수');
  if (L(a).queue.some((q) => q.kind === 'builder_fall')) fail('ancestor fall scene');
  checkInfo(f, 'fall');
}

// 7. 내 작업장과 도제
{
  const lc = fresh(7, 'leocast', 'carpenter', 40);
  if (can(lc, 'builder_shop')) fail('shop in guild town without mark');
  const g = fresh(8, 'ern', 'carpenter', 40);
  if (!can(g, 'builder_shop')) fail('shop hidden in village');
  runAct(g, 'builder_shop');
  if (!B(g).shop || can(g, 'builder_shop')) fail('shop open');
  if (!can(g, 'builder_apprentice')) fail('apprentice hidden');
  runAct(g, 'builder_apprentice');
  const app = B(g).shop.app[0];
  if (!app || !g.people.some((p) => p.id === app.id)) fail('apprentice person');
  if (can(g, 'builder_apprentice')) fail('apprentice again at once');
  // 도제가 있으면 일이 빨라진다
  const fast = clone(g), slow = clone(g); B(slow).shop.app = [];
  take(fast, 'house'); take(slow, 'house'); placeAt(fast, 'ern'); placeAt(slow, 'ern'); adv(fast, 2); adv(slow, 2);
  if (B(fast).job && !(B(fast).job.left < B(slow).job.left)) fail('apprentice speed', B(fast).job?.left, B(slow).job?.left);
  // 쉬는 달엔 자잘한 수리가 들어온다
  const idle = clone(g); const m0 = idle.player.money; for (let i = 0; i < 6; i++) { placeAt(idle, 'ern'); adv(idle, 1); }
  if (idle.player.money <= m0) fail('shop idle income', m0, idle.player.money);
  // 네 해가 지나면 직인이 되어 떠난다
  const j = clone(g); B(j).shop.app[0].since -= 48; placeAt(j, 'ern'); adv(j, 1);
  if (!L(j).queue.some((q) => q.kind === 'builder_journey')) fail('journey not queued');
  for (const k of ['tools', 'send', 'keep']) { const c = clone(j); const r = direct(c, 'builder_journey', { id: app.id }, k); if (r.missing || r.skipped) fail('journey', k); if (k !== 'keep' && B(c).shop.app.length) fail('apprentice stayed', k); if (k === 'tools' && c.people.find((p) => p.id === app.id)?.job !== 'carpenter') fail('journeyman job'); }
  checkInfo(g, 'shop');
  globalThis.SHOP = g;
}

// 8. 내 집은 내 손으로, 큰 공사의 한 몫
{
  const g = fresh(9, 'ern', 'carpenter', 40);
  H(g).build = { place: 'ern', kind: 'house', left: 6, cost: 100, cond: 85, events: 0, started: 0, name: '느릅나무 집' };
  const c = clone(g); B(c).ownBuild = null; c.player.skills.building = 0;
  adv(g, 1); adv(c, 1);
  if (!(H(g).build && H(c).build && H(g).build.left < H(c).build.left)) fail('own hands faster', H(g).build?.left, H(c).build?.left);
  const m = clone(globalThis.MASTER); placeAt(m, 'leocast');
  const wid = Object.keys(WORKS).find((id) => WORKS[id].place === 'leocast');
  Object.assign(WS(m).w[wid], { stage: 'building', progress: 10, funds: 9999 });
  if (!kindsHere(m).includes('works')) fail('works part not offered');
  const p0 = WS(m).w[wid].progress; build(m, 'works');
  if (WS(m).w[wid].progress < p0 + 15 || !B(m).worksPart.includes(wid)) fail('works part progress', p0, WS(m).w[wid].progress);
  WS(m).w[wid].stage = 'done'; adv(m, 1);
  if (!B(m).built.some((b) => b.part && b.name === WORKS[wid].name)) fail('works not recorded');
}

// 9. 세상의 장인들: 플레이어 없이도 짓고 무너진다
{
  const g = fresh(10, 'harfen');
  const n0 = B(g).world.length;
  adv(g, 12 * 40);
  const w = B(g).world;
  if (w.length > 16) fail('world list too long', w.length);
  if (w.filter((b) => b.y > g.date.year - 40).length < 2) fail('few new world buildings', w.length, n0);
  const r = makeRng({ s: 3 }); for (let i = 0; i < 30; i++) worldBuild(g, r);
  if (B(g).world.length > 16) fail('world cap');
  for (const pl of ['harfen', 'leocast', 'verden', 'ern', 'eisen']) for (let mo = 1; mo <= 12; mo++) { const c = clone(g); placeAt(c, pl); c.date.month = mo; checkInfo(c, `${pl} ${mo}`); }
  if (verbose) console.log('world', w.map((b) => `${b.name}(${b.y}${b.gone ? ` ${b.gone.how}` : ''})`).join(', '));
}

// 10. 옛 저장, 대 잇기, 몇 해 살아 보기
{
  const old = clone(globalThis.SHOP); delete old.builder.worksPart; delete old.builder.famMark;
  runHooks('migrate', old); if (!Array.isArray(old.builder.worksPart) || old.builder.famMark !== null) fail('migrate');
  const none = clone(globalThis.SHOP); delete none.builder; runHooks('migrate', none); if (!none.builder) fail('migrate none');
  const h = clone(globalThis.MASTER); placeAt(h, 'ern'); build(h, 'shed'); B(h).shop = { place: 'ern', name: '별 작업장', since: 500, rep: 40, app: [], appAt: 0 };
  runHooks('heir', h, makeRng({ s: 1 }), h.player);
  if (B(h).mark || B(h).famMark !== 'star' || !B(h).shop || !B(h).built.length) fail('heir', B(h).mark, B(h).famMark);
  B(h).done = 5; B(h).places = ['ern', 'harfen']; placeAt(h, 'leocast'); h.player.skills.building = 70; takeJob(h, 'mason');
  if (!examReady(h)) fail('heir exam');
  const fm = direct(h, 'builder_mark', {}, 'fam'); if (fm.missing || B(h).mark !== 'star') fail('family mark', JSON.stringify(fm));
  // 목수로 몇 해: 무작위로 골라도 글이 깨지지 않는다
  const g = fresh(40, 'ern', 'carpenter', 35); g.player.money = 120;
  for (let i = 0; i < 48 && !g.over; i++) {
    if (L(g).place !== 'ern' && !L(g).travel) placeAt(g, 'ern');
    month(g, ['builder_seek', 'builder_shop', 'builder_apprentice', 'work']);
    if (g.player.money < 0) fail('negative money in play', g.player.money);
    checkInfo(g, `play ${i}`);
  }
  if (B(g).done < 3) fail('few jobs done in play', B(g).done);
  if (verbose) console.log('play', { money: g.player.money, done: B(g).done, earned: B(g).earned, log: B(g).log.map((x) => x.text).join(' / ') });
}

if (verbose) for (const s of samples) console.log(s);
console.log(`buildertest: ${problems ? `${problems} problems` : 'ok'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
if (problems) process.exit(1);
