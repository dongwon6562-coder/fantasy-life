import './lsshim.js';
import '../src/content.js';
// 44단계 도우미2 점검: 나라마다 다른 왕가와 궁정. 일곱 나라의 틀·갈래·후보·벼슬이 있는지,
// 플레이어 없이도 통치자가 바뀔 때 궁정 후보가 잇고(politics SUCCESSION) 정변이 일어나는지,
// 궁정에 나가 벼슬을 오르고 녹봉을 받는지, 장면마다 고를 것을 다 골라도 글이 깨지지 않는지,
// 편든 후보가 지면 쫓겨나는 길, 자리 비움·대 잇기·옛 저장을 본다.
import { newGame, endMonth, availableActions, rngOf, me } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { L, SCENE_STRICT, showScene } from '../src/adventure/core.js';
import { realmState } from '../src/realms/index.js';
import { REALMS } from '../src/realms/data.js';
import { setRace } from '../src/races/index.js';
import { rulerLine } from '../src/politics/state.js';
import { succeed } from '../src/politics/world.js';
import { CROWNS, CROWN_IDS } from '../src/crowns/data.js';
import { crownsState, crownsInfo, crownInfo, crownsLines, crownsLine, officeNeed } from '../src/crowns/index.js';

SCENE_STRICT.on = true;
const t0 = Date.now();
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null|\$\{|이\(가\)|을\(를\)|은\(는\)|과\(와\)|\(으\)|  /.test(t);
const verbose = process.argv.includes('-v');
const scenes = {}; const samples = {}; const kinds = {};

function resolveAll(g, pick) {
  for (let k = 0; k < 8 && g.pendingEvent; k++) {
    const pe = g.pendingEvent;
    const s = L(g).scene;
    const kind = s?.kind ?? pe.id;
    scenes[kind] = (scenes[kind] ?? 0) + 1;
    const mine = kind.startsWith('cr_');
    if (mine) ok(!bad(pe.title) && !bad(pe.text) && pe.choices.length && pe.choices.every((c) => !bad(c)), `bad scene ${kind}: ${pe.title} | ${pe.text} | ${pe.choices}`);
    let idx = kind === 'heir' ? 0 : rngOf(g).int(0, pe.choices.length - 1);
    const want = pick?.(kind, pe.choices, s);
    if (want != null && want >= 0) idx = want;
    const out = resolveEvent(g, rngOf(g), idx);
    if (mine) { ok(!bad(String(out)), `bad out ${kind}: ${out}`); const key = `${kind}:${s.realm}`; (samples[key] ??= []).length < 1 && samples[key].push(`${pe.text.slice(0, 90)} [${pe.choices[idx]}] → ${String(out).slice(0, 110)}`); }
  }
}
const quiet = (g, ch = [{ id: 'rest' }], pick) => {
  endMonth(g, ch); resolveAll(g, pick);
  for (const x of crownsLines(g)) { kinds[x.kind] = (kinds[x.kind] ?? 0) + 1; ok(!bad(x.text), `bad line ${x.text}`); (samples[`line:${x.kind}`] ??= []).length < 3 && samples[`line:${x.kind}`].push(x.text); }
  const l = crownsLine(g); ok(l === null || typeof l === 'string', 'line');
};
const fresh = (snap) => { const g = JSON.parse(snap); g.pendingEvent = null; L(g).queue = []; L(g).scene = null; return g; };

// 0. 데이터
ok(CROWN_IDS.length === 7 && CROWN_IDS.every((id) => REALMS[id]), `나라 ${CROWN_IDS}`);
for (const id of CROWN_IDS) {
  const c = CROWNS[id];
  ok(c.offices.length === 3 && c.sides.length === 2 && c.sideText.length === 2 && c.roles.length >= 3 && c.lines.length >= 3 && c.duty.choices.length === 3 && c.races.length, `틀 ${id}`);
}

// 1. 플레이어 없이 육십 년: 후보가 잇고, 소식이 나고, 정변도
{
  let crowned = 0, picked = 0;
  for (const seed of [5100, 5101]) {
    const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed });
    const s = crownsState(g);
    for (const id of CROWN_IDS) ok(s.realms[id].cands.length >= 3 && s.realms[id].lastRuler === rulerLine(g, id), `처음 후보 ${id}`);
    for (let m = 0; m < 60 * 12 && !g.over; m++) {
      quiet(g);
      if (m % 60 === 0) for (const r of crownsInfo(g).realms) ok(r.cands.length >= 2 && !bad(r.ruler) && !bad(r.stabWord) && r.cands.every((c) => !bad(c.name) && !bad(c.word) && c.age > 0), `info ${JSON.stringify(r)}`);
    }
    crowned += s.tally.crowned; picked += s.tally.picked;
    ok(s.news.length >= 10 && s.news.every((n) => !bad(n.text)), `궁정 소식 ${s.news.length}`);
    for (const id of CROWN_IDS) { const names = s.realms[id].cands.map((x) => x.name); ok(new Set(names).size === names.length, `후보 이름 겹침 ${id} ${names}`); }
  }
  ok(crowned >= 10 && picked >= crowned * 0.8, `통치자 바뀜 ${crowned}, 후보가 이음 ${picked}`);
  // 정변: 흔들리는 나라에 힘센 후보
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 5102 });
  const s = crownsState(g);
  let coup = 0;
  for (let m = 0; m < 600 && !coup; m++) {
    for (const id of ['valhart', 'free', 'beast']) { g.politics.stab[id] = 15; s.realms[id].cands[0].sup = 92; }
    quiet(g); coup = s.tally.coups;
  }
  ok(coup >= 1 && s.news.some((n) => /깃발|불신임|도전|겨뤘/.test(n.text)), `정변 ${coup}`);
}

// 2. 벼슬 오르기: 발하르트 황궁 (사람, 글 잘함, 제국 신민)
{
  const g = newGame({ name: '클라우스', sex: 'm', familyId: 'merchant', mode: 'free', seed: 5200 });
  me(g).ageMonths = 25 * 12; L(g).place = 'eisen'; const R = realmState(g); R.citizen = 'valhart'; R.cur = 'valhart';
  g.player.skills.letters = 60; L(g).renown = 40; g.player.money = 200;
  ok(availableActions(g).some((a) => a.id === 'crowns_court'), '황궁에 나가기 보임');
  const m = crownsState(g).me;
  for (let k = 0; k < 120 && m.office < 3; k++) { quiet(g, [{ id: 'crowns_court' }], (kind) => (kind === 'cr_offer' ? 0 : null)); L(g).place = 'eisen'; m.favor = Math.max(m.favor, 70); }
  ok(m.realm === 'valhart' && m.office === 3, `벼슬 셋째 칸 ${m.office}`);
  { // 벼슬 없는 같은 판과 한 달을 견준다
    const a = fresh(JSON.stringify(g)), b = fresh(JSON.stringify(g)); crownsState(b).me.realm = null; crownsState(b).me.office = 0;
    const ma = a.player.money, mb = b.player.money; quiet(a); quiet(b);
    ok((a.player.money - ma) - (b.player.money - mb) >= 20, `녹봉 ${(a.player.money - ma) - (b.player.money - mb)}`);
  }
  ok(crownInfo(g, 'valhart').office === '제국 대신' && crownsInfo(g).me.pay === 22, '화면 벼슬');
  // 자리를 오래 비우면 잃는다
  L(g).place = 'leocast'; R.cur = 'leonia';
  for (let k = 0; k < 10; k++) { quiet(g); L(g).place = 'leocast'; }
  ok(!m.realm && m.office === 0, '자리 비움');
  ok(!availableActions(g).some((a) => a.id === 'crowns_court'), '왕도에선 안 보임 (레오니아는 court)');
}

// 2b. 그 나라에 살면 궁정 소식이 들리고, 벼슬이 있으면 궁정 줄도
{
  const g = newGame({ name: '루카', sex: 'm', familyId: 'merchant', mode: 'free', seed: 5250 });
  me(g).ageMonths = 25 * 12; L(g).place = 'barka'; realmState(g).cur = 'free';
  const m = crownsState(g).me; m.realm = 'free'; m.office = 1; m.favor = 50;
  for (let k = 0; k < 15 * 12 && !g.over; k++) { quiet(g); if (!L(g).travel) L(g).place = 'barka'; if (!m.realm) { m.realm = 'free'; m.office = 1; } }
  ok((kinds.court ?? 0) >= 2 && (kinds.office ?? 0) >= 2, `궁정 줄 ${JSON.stringify(kinds)}`);
}

// 3. 모자란 것
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 5300 });
  me(g).ageMonths = 30 * 12;
  ok(/주지 않는/.test(officeNeed(g, 'dwarf', 1)), `드워프 회의는 드워프만 ${officeNeed(g, 'dwarf', 1)}`);
  g.player.skills.letters = 60;
  ok(/믿음/.test(officeNeed(g, 'holy', 1) ?? ''), `성광국은 믿음 ${officeNeed(g, 'holy', 1)}`);
  ok(/서클|마법/.test(officeNeed(g, 'serenia', 1) ?? ''), `세레니아는 마법 ${officeNeed(g, 'serenia', 1)}`);
  setRace(me(g), 'dwarf', rngOf(g), {}); g.player.race = 'dwarf'; g.player.skills.smithing = 20;
  ok(officeNeed(g, 'dwarf', 1) === null, `드워프 씨족 서기 ${officeNeed(g, 'dwarf', 1)}`);
  for (const id of CROWN_IDS) for (const lv of [1, 2, 3]) { const n = officeNeed(g, id, lv); ok(n === null || !bad(n), `need ${id}.${lv} ${n}`); }
}

// 4. 장면마다 고를 것 다
{
  const base = newGame({ name: '클라우스', sex: 'm', familyId: 'merchant', mode: 'free', seed: 5400 });
  me(base).ageMonths = 30 * 12; base.player.money = 100;
  const snap = JSON.stringify(base);
  for (const id of CROWN_IDS) {
    const seat = REALMS[id].capital;
    const setup = () => { const g = fresh(snap); L(g).place = seat; realmState(g).cur = id; const m = crownsState(g).me; m.realm = id; m.office = 2; m.favor = 40; return g; };
    for (const lv of [1, 2, 3]) for (const k of [0, 1]) {
      const g = setup(); crownsState(g).me.office = lv - 1 || 0; if (lv === 1) crownsState(g).me.realm = null;
      ok(showScene(g, { kind: 'cr_offer', at: seat, t: 0, realm: id, level: lv }, { force: true }), 'show offer');
      resolveAll(g, (kind) => (kind === 'cr_offer' ? k : null));
      if (k === 0) ok(crownsState(g).me.office === lv && crownsState(g).me.realm === id, `벼슬 받음 ${id}.${lv}`);
    }
    for (let k = 0; k < 3; k++) {
      const g = setup();
      ok(showScene(g, { kind: 'cr_duty', at: seat, t: 0, realm: id }, { force: true }), 'show duty');
      resolveAll(g, (kind) => (kind === 'cr_duty' ? k : null));
      ok(crownsState(g).me.log.some((x) => x.text.startsWith(CROWNS[id].duty.title)), `궁정 일 기록 ${id}.${k}`);
    }
    for (let k = 0; k < 3; k++) {
      const g = setup(); const c = crownsState(g).realms[id].cands;
      ok(showScene(g, { kind: 'cr_side', at: seat, t: 0, realm: id, a: c[0].id, b: c[1].id }, { force: true }), 'show side');
      resolveAll(g, (kind) => (kind === 'cr_side' ? k : null));
      ok((crownsState(g).me.backed[id] != null) === (k < 2), `편들기 ${id}.${k}`);
    }
    for (let k = 0; k < 2; k++) {
      const g = setup();
      ok(showScene(g, { kind: 'cr_rise', at: seat, t: 0, realm: id, who: '누군가' }, { force: true }), 'show rise');
      resolveAll(g, (kind) => (kind === 'cr_rise' ? k : null));
      ok(crownsState(g).me.favor >= 56, `이긴 쪽 ${id}`);
    }
    for (let k = 0; k < 3; k++) for (const stat of [5, 99]) {
      const g = setup();
      for (const x of Object.keys(g.player.stats)) g.player.stats[x] = stat;
      crownsState(g).me.favor = stat === 99 ? 90 : 0;
      ok(showScene(g, { kind: 'cr_fall', at: seat, t: 0, realm: id, who: '새 주인' }, { force: true }), 'show fall');
      resolveAll(g, (kind) => (kind === 'cr_fall' ? k : null));
      const m = crownsState(g).me;
      if (k === 0 && stat === 99) ok(m.realm === id && m.office === 1, `무릎 꿇어 한 칸 내려감 ${id}`);
      if (k === 0 && stat === 5) ok(!m.realm && realmState(g).banned[id] > 0 && L(g).place !== seat, `쫓겨남 ${id} ${L(g).place}`);
      if (k === 1) ok(!m.realm && m.banished[id] > 0, `물러남 ${id}`);
      if (k === 2) ok(!m.realm && L(g).place !== seat, `떠남 ${id} ${L(g).place}`);
    }
    for (let k = 0; k < 3; k++) {
      const g = setup(); const c = crownsState(g).realms[id].cands[0];
      ok(showScene(g, { kind: 'cr_coup', at: seat, t: 0, realm: id, who: c.name, cid: c.id }, { force: true }), 'show coup');
      resolveAll(g, (kind) => (kind === 'cr_coup' ? k : null));
      if (k === 0) ok(crownsState(g).me.backed[id] === c.id, '정변 명단');
    }
  }
}

// 5. 편든 후보가 지면 cr_fall, 이기면 cr_rise (politics가 통치자를 바꿀 때)
{
  const base = newGame({ name: '클라우스', sex: 'm', familyId: 'merchant', mode: 'free', seed: 5500 });
  me(base).ageMonths = 30 * 12; L(base).place = 'barka'; realmState(base).cur = 'free';
  const snap = JSON.stringify(base);
  for (const win of [true, false]) {
    const g = fresh(snap);
    const s = crownsState(g); const R = s.realms.free; const m = s.me;
    m.realm = 'free'; m.office = 2; m.favor = 40;
    const [a, b] = [...R.cands].sort((x, y) => y.sup - x.sup);
    m.backed.free = (win ? a : b).id;
    R.cands.push({ ...a, sex: a.sex === 'm' ? 'f' : 'm' }); // politics가 굴린 성별이 어느 쪽이든 a가 고르게
    succeed(g, rngOf(g), () => {}, () => {}, 'free', '세상을 떠났다');
    ok(rulerLine(g, 'free').includes(a.name), `후보가 의장이 됨 ${rulerLine(g, 'free')} / ${a.name}`);
    quiet(g, [{ id: 'rest' }], (kind) => (kind === 'cr_fall' ? 1 : null));
    ok(scenes[win ? 'cr_rise' : 'cr_fall'] > 0 && !R.cands.some((x) => x.id === a.id), `편든 결말 ${win}`);
  }
}

// 6. 대 잇기·옛 저장
{
  const g = newGame({ name: '한스', sex: 'm', familyId: 'farmer', mode: 'free', seed: 5600 });
  const m = crownsState(g).me; m.realm = 'valhart'; m.office = 2; m.served.valhart = 2;
  runHooks('heir', g, rngOf(g), g.player);
  ok(!crownsState(g).me.realm && crownsState(g).me.pastServed?.served.valhart === 2, '대를 이으면 벼슬은 끝');
  delete g.crowns; runHooks('migrate', g);
  ok(g.crowns && CROWN_IDS.every((id) => g.crowns.realms[id].cands.length >= 3), '옛 저장');
  const g2 = JSON.parse(JSON.stringify(g)); ok(JSON.stringify(crownsInfo(g2)) === JSON.stringify(crownsInfo(g)), '저장 왕복');
}

console.log(`장면: ${JSON.stringify(Object.fromEntries(Object.entries(scenes).filter(([k]) => k.startsWith('cr_'))))}  줄 ${JSON.stringify(kinds)}`);
if (verbose) for (const [k, v] of Object.entries(samples)) console.log(`- ${k}: ${v.join(' / ')}`);
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
if (fail) { console.log(`FAIL ${fail}`); process.exit(1); }
console.log('crownstest OK');
