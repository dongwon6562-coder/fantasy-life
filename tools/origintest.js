import './lsshim.js';
import '../src/content.js';
// 33단계 도우미2 점검: 태어날 집안 늘리기. 새 집안 일곱이 집안 목록에 있고, 저마다 시작 장소·국적·인맥·부모 일이 맞는지,
// 어린 시절 장면·재능 장면·바라는 것·짐이 나오는지, 글이 깨지지 않는지, 마탑 핏줄의 마력, 고아의 부모, 옛 집안은 그대로인지, 옛 저장을 본다.
import { FAMILIES, JOBS } from '../src/data.js';
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT } from '../src/adventure/core.js';
import { byId } from '../src/npc.js';
import { realmState } from '../src/realms/index.js';
import { ORIGINS } from '../src/origins/data.js';
import { originLines, originLine, originInfo, originsState } from '../src/origins/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const childSeen = {}; const samples = {}; let lines = 0;

ok(ORIGINS.length >= 6, '새 집안이 여섯보다 적음');
const human = FAMILIES.filter((f) => (f.race ?? 'human') === 'human');
ok(human.length >= 9, `사람 집안 ${human.length}`);
for (const o of ORIGINS) {
  const f = FAMILIES.find((x) => x.id === o.id);
  ok(f && !f.race && JOBS[f.fatherJob] && JOBS[f.motherJob], `집안 표 ${o.id}`);
  ok(o.scenes.length >= 3 && o.lines.length >= 3 && o.ties.length >= 2 && o.want && o.burden, `집안 내용 ${o.id}`);
}

function resolveAll(g, pick) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    const kind = s?.kind ?? pe.id;
    scenes[kind] = (scenes[kind] ?? 0) + 1;
    const mine = kind.startsWith('origin_');
    if (mine) ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    if (kind === 'origin_child') childSeen[s.sid] = (childSeen[s.sid] ?? 0) + 1;
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    const want = pick?.(kind, pe.choices, s);
    if (want != null && want >= 0) idx = want;
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); const key = kind === 'origin_child' ? s.sid : `${kind}:${originsState(g).id}`; (samples[key] ??= []).length < 1 && samples[key].push(`${pe.text.slice(0, 90)} [${pe.choices[idx]}] → ${String(out).slice(0, 110)}`); }
    ok(g.player.money >= 0 && g.player.familyMoney >= 0, `money < 0 after ${kind}`);
  }
}
function life(o, seed, years, birth) {
  const g = newGame({ name: seed % 2 ? '요나스' : '클라라', sex: seed % 2 ? 'm' : 'f', familyId: o.id, mode: 'free', seed, birth });
  const s = originsState(g);
  ok(s.id === o.id && L(g).place === o.place, `시작 장소 ${o.id}: ${L(g).place}`);
  ok(realmState(g).citizen === (o.place === 'serenia' ? 'serenia' : o.place === 'portel' ? 'free' : o.place === 'graubel' ? 'march' : 'leonia'), `국적 ${o.id}: ${realmState(g).citizen}`);
  for (const t of o.ties) { const p = byId(g, s.ties[t.role]); ok(p && p.known && p.place === o.place, `인맥 ${o.id}.${t.role}`); }
  ok(g.player.familyMoney === o.money, `집안 돈 ${o.id}`);
  if (o.mana) ok(g.player.manaPotential >= o.mana[0], `마탑 핏줄 마력 ${g.player.manaPotential}`);
  if (o.orphan) ok(!byId(g, me(g).fatherId).alive && !byId(g, me(g).motherId).alive, '고아의 부모');
  if (o.devotion) ok((g.faith?.devotion ?? 0) >= o.devotion, '성당지기 믿음');
  const rng = rngOf(g);
  for (let m = 0; m < years * 12 && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !/travel|move/.test(a.id));
    const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    endMonth(g, ch);
    resolveAll(g);
    const ls = originLines(g);
    ok(Array.isArray(ls) && ls.length <= 1, 'shape');
    for (const x of ls) { lines++; ok(!bad(x.text), `bad line ${o.id}: ${x.text}`); (samples[`line:${o.id}`] ??= []).length < 2 && samples[`line:${o.id}`].push(x.text); }
    const l1 = originLine(g); ok(l1 === null || typeof l1 === 'string', 'line');
    if (m % 36 === 0) { const info = originInfo(g); ok(info && !bad(info.name) && !bad(info.want.state) && info.ties.every((t) => !bad(t.word)), `info ${o.id}`); }
  }
  return g;
}

let wants = 0; let burdens = 0;
for (const [i, o] of ORIGINS.entries()) {
  for (let k = 0; k < 2; k++) {
    const g = life(o, 6100 + i * 10 + k, 25, k === 1 ? { gift: o.fit } : null);
    const s = originsState(g);
    if (!g.over && playerAge(g) >= 24) { ok(!!s.want, `바라는 것 장면 없음 ${o.id}`); ok(!!s.burden && s.burden !== 'due', `짐 장면 없음 ${o.id} ${s.burden}`); }
    if (s.want) wants++; if (s.burden) burdens++;
    if (k === 1 && !g.over) ok(s.gift === 'fit', `재능 장면(맞음) ${o.id} ${s.gift}`);
  }
  for (const sc of o.scenes) ok(childSeen[sc.id] > 0, `어린 시절 장면 안 나옴 ${sc.id}`);
}
// 재능이 집안 바람과 어긋날 때
{
  const o = ORIGINS.find((x) => x.id === 'tower_blood');
  const g = life(o, 6301, 12, { gift: 'sword' });
  ok(originsState(g).gift === 'clash', `재능 장면(어긋남) ${originsState(g).gift}`);
}
// 옛 집안은 그대로
for (const id of ['farmer', 'merchant', 'fallen_knight']) {
  const g = newGame({ name: '한스', sex: 'm', familyId: id, mode: 'free', seed: 6400 });
  ok(!originsState(g).id && L(g).place === 'ern' && originInfo(g) === null, `옛 집안 ${id}`);
  for (let m = 0; m < 24; m++) { endMonth(g, [{ id: 'rest' }]); resolveAll(g); ok(originLines(g).length === 0, '옛 집안에 줄'); }
}
// 대를 이으면 집안 이야기는 끝난다, 옛 저장
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'port_folk', mode: 'free', seed: 6501 });
  delete g.origins; runHooks('migrate', g);
  ok(g.origins && g.origins.id === null, '옛 저장');
  const g2 = newGame({ name: '한스', sex: 'm', familyId: 'march_guard', mode: 'free', seed: 6502 });
  runHooks('heir', g2, rngOf(g2), g2.player);
  ok(originsState(g2).past, '대를 이으면 past');
}

console.log(`장면: ${JSON.stringify(Object.fromEntries(Object.entries(scenes).filter(([k]) => k.startsWith('origin_'))))}  줄 ${lines}, 바람 ${wants}, 짐 ${burdens}`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('origintest OK');
