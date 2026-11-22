import './lsshim.js';
import '../src/content.js';
// 32단계 도우미2 점검: 내 나라 세우기. 영지·개척촌·봉기 고장 세 갈래에서 나라를 선포하고, 이름·왕가·신하·법·세금·수도·대관·사절·전쟁이 다 나오는지,
// 무너짐(안정과 정통성이 바닥일 때, 전쟁에 밀릴 때), 대 잇기와 형제의 도전, 플레이어 없이 서는 나라, 글이 깨지지 않는지, 옛 저장을 본다.
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT } from '../src/adventure/core.js';
import { makePerson, byId } from '../src/npc.js';
import { grantFief } from '../src/domain/state.js';
import { becomeHeir } from '../src/heir.js';
import { revoltState } from '../src/revolt/index.js';
import { FS } from '../src/frontier/state.js';
import { foundingState, foundingLines, foundingLine, foundingInfo, foundingReady } from '../src/founding/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const scenes = {}; const kinds = {}; const samples = {};
const verbose = process.argv.includes('-v');

function resolveAll(g, pick) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    const kind = s?.kind ?? pe.id;
    scenes[kind] = (scenes[kind] ?? 0) + 1;
    const mine = kind.startsWith('found_') || (kind === 'battle' && s?.context === 'founding');
    if (mine) ok(!bad(pe.title) && !bad(pe.text) && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    const want = pick?.(kind, pe.choices, s);
    if (want != null && want >= 0) idx = want;
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); (samples[kind] ??= []).length < 2 && samples[kind].push(`${pe.text.slice(0, 80)} [${pe.choices[idx]}] → ${String(out).slice(0, 100)}`); }
    ok(g.player.money >= 0, `money < 0 after ${kind}`);
  }
}
function checkMonth(g) {
  const ls = foundingLines(g);
  ok(Array.isArray(ls) && ls.length <= 2, 'shape');
  for (const x of ls) { ok(!bad(x.text), `bad line [${x.kind}]: ${x.text}`); kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; (samples[`line:${x.kind}`] ??= []).length < 2 && samples[`line:${x.kind}`].push(x.text); }
  const l1 = foundingLine(g); ok(l1 === null || typeof l1 === 'string', 'line');
}
function checkInfo(g) {
  const info = foundingInfo(g);
  const s = JSON.stringify(info);
  ok(!/undefined|NaN|null,"word"/.test(s), `info: ${s.slice(0, 300)}`);
  if (info.realm) { ok(!bad(info.realm.name) && !bad(info.realm.legitWord) && !bad(info.realm.stabWord), 'realm words'); for (const c of info.realm.council) ok(!bad(c.name) && !bad(c.word), 'council'); }
  return info;
}
function grown(seed, age = 32) {
  const g = newGame({ name: seed % 2 ? '라이너' : '이졸데', sex: seed % 2 ? 'm' : 'f', familyId: 'fallen_knight', mode: 'free', seed });
  me(g).ageMonths = age * 12; L(g).home = 'rent'; L(g).renown = 90; g.player.money = 400;
  return g;
}
// 나라를 선포할 때까지(이번 달에 할 일에 '나라를 세운다'를 넣는다)
function declare(g, king = true) {
  for (let m = 0; m < 4 && !foundingState(g).realm; m++) {
    const acts = availableActions(g);
    const a = acts.find((x) => x.id === 'found_declare');
    if (!a) { endMonth(g, [{ id: 'rest' }]); resolveAll(g); continue; }
    endMonth(g, [{ id: 'found_declare' }]);
    resolveAll(g, (k, ch) => (k === 'found_declare' ? ch.findIndex((c) => (king ? /왕국/ : /공국/).test(c)) : -1));
  }
  return foundingState(g).realm;
}
function rule(g, months, pick) {
  const rng = rngOf(g);
  for (let m = 0; m < months && !g.over; m++) {
    const acts = availableActions(g).filter((a) => !/^(found_|travel|move|pioneer)/.test(a.id));
    const ch = [];
    for (let i = 0; i < slotsFor(g) && acts.length; i++) ch.push({ id: rng.pick(acts).id });
    // 수도에 머문다
    const r = foundingState(g).realm;
    if (r && L(g).place !== r.capital && !L(g).travel) { L(g).place = r.capital; }
    endMonth(g, ch);
    resolveAll(g, pick);
    checkMonth(g);
    if (m % 12 === 0) checkInfo(g);
  }
}

/* 1) 영지에서: 레오니아 왕실 아래 영지가 반역한다 */
let realms = 0; let wars = 0; let recog = 0;
for (let s = 0; s < 4; s++) {
  const g = grown(4100 + s);
  const d = grantFief(g, { name: '그륀탈', place: 'gruental', liege: 'crown', pop: 950 }, '시험');
  Object.assign(d, { garrison: 90, treasury: 900, quality: 45, favor: 20 });
  L(g).place = 'gruental';
  const rd = foundingReady(g);
  ok(rd?.ok, `영지 조건 ${JSON.stringify(rd?.have)} ${rd?.missing}`);
  ok(availableActions(g).some((a) => a.id === 'found_declare'), '나라를 세운다 행동이 없음');
  const r = declare(g, s % 2 === 0);
  ok(!!r, '영지에서 선포 실패');
  if (!r) continue;
  realms++;
  ok(r.master === 'leonia' && r.recog.leonia === 'no', '옛 주인 레오니아');
  ok(g.domain.nation && !g.domain.liege, '영지가 나라가 됨');
  rule(g, 120);
  const f = foundingState(g);
  const rr = f.realm ?? null;
  if (rr) { ok(!!rr.name && !!rr.dyn, '이름·왕가'); wars += rr.wars; recog += Object.values(rr.recog).filter((x) => x === 'yes').length; }
  else ok(f.past.length > 0, '나라가 사라졌는데 기록이 없음');
}
ok(realms === 4, `영지 선포 ${realms}/4`);

/* 2) 개척촌에서 */
{
  const g = grown(4201);
  const F = FS(g);
  Object.assign(F.sites.fr_moor, { stage: 3, pop: 420, food: 8, safety: 60, morale: 60, name: '잿빛 둔덕', chief: true, mine: true, by: 'me', byName: g.player.name, since: g.date.year - 8 });
  L(g).place = 'fr_moor'; g.player.money = 800;
  const rd = foundingReady(g);
  ok(rd?.land.base === 'frontier' && rd.ok, `개척촌 조건 ${JSON.stringify(rd?.have)} ${rd?.missing}`);
  const r = declare(g, false);
  ok(!!r && g.domain?.place === 'fr_moor' && g.domain.nation, '개척촌에서 선포');
  if (r) rule(g, 60);
}

/* 3) 봉기로 얻은 고장에서 */
{
  const g = grown(4301);
  const v = revoltState(g);
  v.orders.push({ place: 'harfen', by: g.player.name, pid: null, mine: true, y: g.date.year - 1, rot: 0, ended: false });
  v.tally.led = 3;
  g.player.money = 800;
  L(g).place = 'harfen';
  const rd = foundingReady(g);
  ok(rd?.land.base === 'revolt' && rd.ok, `봉기 조건 ${JSON.stringify(rd?.have)} ${rd?.missing}`);
  const r = declare(g, true);
  ok(!!r && v.orders[v.orders.length - 1].ended, '봉기 질서가 닫힘');
  if (r) rule(g, 48);
}

/* 4) 무너짐: 안정과 정통성이 바닥 */
let falls = 0;
for (let s = 0; s < 3; s++) {
  const g = grown(4400 + s);
  const d = grantFief(g, { name: '그륀탈', place: 'gruental', liege: 'verden', pop: 700 }, '시험');
  Object.assign(d, { garrison: 70, treasury: 700, favor: 20 });
  L(g).place = 'gruental';
  const r = declare(g, false);
  if (!r) { ok(false, '무너짐 시험 선포 실패'); continue; }
  rule(g, 8);
  const rr = foundingState(g).realm;
  if (!rr) { falls++; continue; }
  rr.warAt = null; rr.war = null;
  let seen = false;
  for (let m = 0; m < 14 && foundingState(g).realm; m++) {
    rr.stab = 5; rr.legit = 5; d.morale = 5; d.order = 5;
    endMonth(g, [{ id: 'rest' }]);
    resolveAll(g, (k, ch) => { if (k === 'found_fall') { seen = true; return ch.findIndex((c) => (s === 0 ? /내려놓/ : s === 1 ? /누른다/ : /광장/).test(c)); } return -1; });
  }
  ok(seen, '안정이 바닥인데 무너지는 장면이 없음');
  if (seen) falls++;
}
ok(falls === 3, `무너짐 ${falls}/3`);

/* 5) 전쟁에 밀려 무너짐: 달아나기 */
{
  const g = grown(4501);
  const d = grantFief(g, { name: '그륀탈', place: 'gruental', liege: 'crown', pop: 900 }, '시험');
  Object.assign(d, { garrison: 60, treasury: 900, favor: 20 });
  L(g).place = 'gruental';
  const r = declare(g, false);
  if (r) {
    let fell = false;
    for (let m = 0; m < 30 && foundingState(g).realm; m++) {
      const rr = foundingState(g).realm;
      d.garrison = 3;
      if (rr.war) rr.war.score = Math.min(rr.war.score, -1);
      endMonth(g, [{ id: 'rest' }]);
      resolveAll(g, (k, ch) => { if (k === 'found_fall') { fell = true; return ch.findIndex((c) => /달아난다/.test(c)); } if (k === 'battle') return ch.findIndex((c) => /정면/.test(c)); return -1; });
    }
    ok(fell, '전쟁에 밀렸는데 무너지는 장면이 없음');
    ok(!foundingState(g).realm && foundingState(g).past.some((x) => x.how === 'fled') && !g.domain, '달아난 뒤 나라·영지 정리');
  } else ok(false, '전쟁 시험 선포 실패');
}

/* 6) 대 잇기: 왕위가 이어지고 형제가 넘본다 */
{
  let succ = 0;
  for (let s = 0; s < 4; s++) {
    const g = grown(4600 + s, 50);
    const d = grantFief(g, { name: '그륀탈', place: 'gruental', liege: null, nation: true, pop: 900 }, '시험');
    Object.assign(d, { garrison: 80, treasury: 900 });
    L(g).place = 'gruental';
    const r = declare(g, true);
    if (!r) { ok(false, '대 잇기 시험 선포 실패'); continue; }
    ok(r.master === null && !r.warAt, '주인 없는 땅이면 옛 주인이 없다');
    rule(g, 10);
    const m = me(g);
    const kids = [];
    for (const age of [24, 21]) {
      const c = makePerson(rngOf(g), { ageMonths: age * 12, sex: 'm', lastName: m.lastName, fatherId: m.sex === 'm' ? m.id : null, motherId: m.sex === 'f' ? m.id : null });
      c.known = true; g.people.push(c); m.childIds.push(c.id); g.player.familyIds?.push(c.id); kids.push(c);
    }
    kids[1].rivalry = 80;
    const gen0 = foundingState(g).realm?.gen ?? 0;
    (L(g).ancestors ??= []).push({ name: g.player.name, lastName: g.player.lastName, born: g.date.year - 50, died: g.date.year });
    becomeHeir(g, rngOf(g), kids[0]);
    const rr = foundingState(g).realm;
    ok(rr && rr.gen === gen0 + 1, `왕위가 이어지지 않음 ${rr?.gen}`);
    for (let k = 0; k < 6; k++) { endMonth(g, [{ id: 'rest' }]); resolveAll(g); }
    succ += scenes.found_succession ?? 0;
  }
  ok(succ > 0, '형제가 왕좌를 넘보는 장면이 없음');
}

/* 7) 플레이어 없이 서는 나라 */
let rises = 0; let fallsW = 0;
for (let s = 0; s < 4; s++) {
  const g = newGame({ name: '토비', sex: 'm', familyId: 'farmer', mode: 'free', seed: 4700 + s });
  for (let m = 0; m < 70 * 12 && !g.over; m++) {
    endMonth(g, [{ id: 'rest' }]); resolveAll(g, (k) => (k === 'heir' ? 0 : -1)); checkMonth(g);
  }
  const f = foundingState(g);
  rises += f.world.length; fallsW += f.world.filter((w) => w.fall).length;
}
ok(rises >= 1 && rises <= 16, `플레이어 없이 선 나라 ${rises} (4판 70년)`);

/* 8) 옛 저장 */
{
  const g = grown(4801);
  delete g.founding;
  runHooks('migrate', g);
  ok(g.founding && Array.isArray(g.founding.world) && g.founding.realm === null, '옛 저장');
  endMonth(g, [{ id: 'rest' }]); resolveAll(g); checkMonth(g); checkInfo(g);
  const g2 = grown(4802);
  g2.founding = { realm: { name: '아우렌', kind: 2, capital: 'gruental', y: 500 } };
  runHooks('migrate', g2);
  ok(Number.isFinite(g2.founding.realm.legit) && g2.founding.realm.council, '반쯤 빈 옛 나라 상태');
}

const need = ['found_declare', 'found_name', 'found_dynasty', 'found_council', 'found_law', 'found_tax', 'found_capital', 'found_crown', 'found_envoy', 'found_fall'];
for (const k of need) ok((scenes[k] ?? 0) > 0, `장면이 안 나옴: ${k}`);
ok((scenes.battle ?? 0) > 0, '전투가 없음');
for (const k of ['court', 'folk', 'world']) ok((kinds[k] ?? 0) > 0, `줄이 안 나옴: ${k}`);
console.log(`장면: ${JSON.stringify(Object.fromEntries(Object.entries(scenes).filter(([k]) => k.startsWith('found_') || k === 'battle')))}`);
console.log(`줄: ${JSON.stringify(kinds)}  전쟁 ${wars}, 인정 ${recog}, 플레이어 없이 선 나라 ${rises}(무너짐 ${fallsW})`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('foundingtest OK');
