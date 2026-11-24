import './lsshim.js';
import '../src/content.js';

// 달마다 기세와 바깥 마을, 대 잇기, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks, HOOKS } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId, bodyAgeOf, ageYears } from '../src/npc.js';
import { playerPower } from '../src/adventure/combat.js';
import { encodeSave, decodeSave } from '../src/save.js';

const T0 = Date.now();
SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])|\(으\)|을\(를\)|이\(가\)/;
const BAD0 = /undefined|NaN|\[object/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = typeof e.text === 'function' ? e.text(g, ctx) : e.text;
  check(!BAD.test(text), `${id} 본문: ${text}`);
  const shown = e.choices.map((c, i) => [c, i]).filter(([c]) => !c.show || c.show(g, ctx));
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(([c]) => c.label), choiceIdx: shown.map(([, i]) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  if (process.env.SHOW) console.log(`[${id}] ${text}\n  > ${out}`);
  return out;
};
const grown = (g, y) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const stay = (g, place) => { L(g).place = place; L(g).travel = null; crimeState(g).jailed = null; g.player.fatigue = 0; g.pendingEvent = null; L(g).scene = null; };
const has = (g, id) => availableActions(g).some((a) => a.id === id);
const queued = (g, kind) => L(g).queue.some((s) => s.kind === kind) || L(g).scene?.kind === kind;
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); if (process.env.SHOW) console.log(`[${id}] > ${out}`); return out; };
const scene = (g, kind, key, seed = 5) => {
  let s;
  if (L(g).scene?.kind === kind && g.pendingEvent?.id === 'life_scene') s = L(g).scene;
  else {
    const q = L(g).queue, i = q.findIndex((x) => x.kind === kind);
    if (i < 0) { check(false, `장면 ${kind}이 대기열에 없다`); return ''; }
    [s] = q.splice(i, 1);
    g.pendingEvent = null; L(g).scene = null;
    if (!showScene(g, s, { force: true })) { check(false, `장면 ${kind}을 띄우지 못했다`); return ''; }
  }
  check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title), `${kind} 글: ${g.pendingEvent.title} / ${g.pendingEvent.text}`);
  const idx = key == null ? 0 : s.choices.findIndex((c) => c.key === key);
  check(idx >= 0, `${kind}에 선택지 ${key}가 없다 (${s.choices.map((c) => c.key)})`);
  const out = resolveEvent(g, makeRng({ s: seed }), Math.max(0, idx));
  if (process.env.SHOW) console.log(`[${kind}/${key}] ${g.pendingEvent?.text ?? ""}\n  > ${out}`);
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
import { migrateInfo, migrateLine, migrateState, migrateMonth, pushAt, gateOpen, popOf, campAt, quartersAt } from '../src/migrate/index.js';
import { baseOf, MG_PLACES } from '../src/migrate/state.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { MAP_INFO, MAP_MARKS } from '../src/art/map.js';
import { iconName } from '../src/art/icons.js';

// 40단계 피난과 이주 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const R = (s) => makeRng({ s });
const S = migrateState;
const textOK = (arr, what) => { for (const t of arr) check(!BAD.test(t), `${what}: ${t}`); };
const tick = (g, n = 1, news = []) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; migrateMonth(g, (t) => news.push(t)); } return news; };
const mi = (g) => g.date.year * 12 + g.date.month;
const occupy = (g, pl) => { (g.occ ??= {}).places ??= {}; g.occ.places[pl] = { since: mi(g) }; };

// 1. 사람 수: 꼴마다 다르고, 다른 갈래는 popOf로 읽는다
{
  const g = mk(1);
  check(popOf(g, 'leocast') > popOf(g, 'harfen') && popOf(g, 'harfen') > popOf(g, 'ern'), '왕도 > 소도시 > 마을');
  check(MG_PLACES.every((p) => popOf(g, p) >= 200), '모든 고장에 사람');
  check(pushAt(g, 'ern').v === 0, '잠잠하면 밀어내는 힘이 없다');
}
// 2. 점령되면 사람들이 떠나고, 받아 주는 고장에 거리를 이루거나 성 밖에 천막을 친다
{
  let flows = 0, settled = 0, camps = 0;
  for (let s = 0; s < 4; s++) {
    const g = mk(400 + s), news = [];
    tick(g, 3, news);
    const v0 = popOf(g, 'verden');
    occupy(g, 'verden'); g.realm.balhart.war = true;
    tick(g, 12, news);
    check(popOf(g, 'verden') < v0, `점령되면 베르덴 사람이 준다 (${v0} → ${popOf(g, 'verden')})`);
    flows += S(g).flows.length + Object.keys(S(g).quarters).length + Object.keys(S(g).camps).length;
    settled += Object.keys(S(g).quarters).length; camps += Object.keys(S(g).camps).length + S(g).past.filter((x) => x.kind === 'camp').length;
    delete g.occ.places.verden; g.realm.balhart.war = false;
    tick(g, 12 * 120, news);
    textOK(news, '세상 소식'); textOK(S(g).log.map((x) => x.text), '기록');
    if (s === 0) console.log(`  판 1: 소식 ${news.length}, 지난 일 ${S(g).past.map((x) => `${x.kind}:${x.place}<${x.from}${x.end ? ':' + x.end : ''}`).join(', ')}`);
    check(S(g).past.some((x) => x.kind === 'quarter' && x.end === 'mixed') || Object.keys(S(g).quarters).length === 0, '백이십 년 지나면 거리가 섞인다');
    check(Math.abs(popOf(g, 'verden') - baseOf('verden')) / baseOf('verden') < 0.1, '사람 수는 평소로 돌아온다');
  }
  check(flows >= 4, `피난 행렬 (${flows})`);
  check(settled >= 1, `이주민 거리 (${settled})`);
}
// 3. 성문: 넘치거나 전선이면 닫힌다. 열자고 말하면 연다
{
  const g = mk(2);
  check(gateOpen(g, 'leocast'), '평소엔 열려 있다');
  g.realm.balhart.war = true; check(!gateOpen(g, 'harfen'), '전쟁 때 전선 가까운 성은 닫는다');
  g.realm.balhart.war = false; S(g).pop.harfen = baseOf('harfen') * 1.3; check(!gateOpen(g, 'harfen'), '넘치면 닫는다');
  S(g).open.harfen = mi(g) + 5; check(gateOpen(g, 'harfen'), '열자고 하면 연다');
}
// 4. 내 삶: 떠나는 행렬을 따라가고, 길 위, 닫힌 성문 앞 난민촌, 뇌물, 돌아가기
const adult = (pl = 'verden') => { const g = mk(77); grown(g, 22); stay(g, pl); g.player.money = 60; return g; };
{
  const g = adult('verden'); occupy(g, 'verden'); g.realm.balhart.war = true;
  for (let i = 0; i < 6 && !S(g).flows.some((f) => f.from === 'verden'); i++) tick(g);
  check(S(g).flows.some((f) => f.from === 'verden'), '베르덴에서 행렬이 떠난다');
  S(g).lastFlow.verden = mi(g);
  check(cond(g, 'mg_flee'), '떠나는 행렬 사건');
  const stayer = structuredClone(g); fire(stayer, 'mg_flee', 1); check(!S(stayer).me.refugee, '남는다');
  fire(g, 'mg_flee', 0);
  const r = S(g).me.refugee; check(!!r && !!L(g).travel, '따라 떠난다');
  check(cond(g, 'mg_column'), '길 위의 행렬'); fire(structuredClone(g), 'mg_column', 0); fire(structuredClone(g), 'mg_column', 1); fire(g, 'mg_column', 2);
  // 닿는다: 성문이 닫혀 있으면 난민촌
  stay(g, r.to); S(g).pop[r.to] = baseOf(r.to) * 1.4; g.realm.balhart.war = false;
  runHooks('afterMonth', g, R(1));
  check(S(g).me.refugee?.camp && !!campAt(g, r.to), '닫힌 성문 앞 난민촌');
  check(has(g, 'mg_camp'), '난민촌 살이가 보인다');
  check(iconName(ACTIONS.find((a) => a.id === 'mg_camp')) === 'tent', '난민촌 아이콘');
  for (const k of ['work', 'organize']) { const x = structuredClone(g); act(x, 'mg_camp'); scene(x, 'mg_camp', k); }
  const b = structuredClone(g); act(b, 'mg_camp'); scene(b, 'mg_camp', 'bribe'); check(!S(b).me.refugee && S(b).me.settledFrom === 'verden', '뇌물로 성 안에 든다');
  const h = structuredClone(g); delete h.occ.places.verden; S(h).push.verden = 0; act(h, 'mg_camp'); scene(h, 'mg_camp', 'home'); check(!S(h).me.refugee && L(h).travel?.to === 'verden', '고향으로 돌아간다');
  // 열린 성문이면 거리에 자리를 얻는다
  const o = adult('verden'); S(o).me.refugee = { from: 'verden', why: 'war', since: mi(o), to: 'leocast', camp: false }; stay(o, 'leocast');
  runHooks('afterMonth', o, R(2)); check(!S(o).me.refugee && S(o).me.settledFrom === 'verden', '열린 성문이면 자리를 얻는다');
  // 고향 생각과 대 잇기
  S(o).me.settledAt -= 40; S(o).push.verden = 0; check(cond(o, 'mg_homesick'), '고향 소식 사건');
  fire(structuredClone(o), 'mg_homesick', 0); fire(o, 'mg_homesick', 1);
}
// 5. 성 안 사람으로서 난민촌 돕기와 텃세
{
  const g = adult('harfen'); S(g).camps.harfen = { from: 'verden', why: 'occupied', size: 240, since: mi(g) };
  check(has(g, 'mg_help'), '난민촌 돕기가 보인다');
  const a = structuredClone(g); act(a, 'mg_help'); scene(a, 'mg_help', 'give'); check(S(a).me.gave === 1, '나눈다');
  const b = structuredClone(g); act(b, 'mg_help'); scene(b, 'mg_help', 'hire');
  L(g).renown = 30;
  const c = structuredClone(g); act(c, 'mg_help'); scene(c, 'mg_help', 'open'); check(gateOpen(c, 'harfen'), '성문을 열자고 말한다');
  const d = structuredClone(g); act(d, 'mg_help'); scene(d, 'mg_help', 'close'); check(!gateOpen(d, 'harfen'), '성문을 닫자고 말한다');
  const q = adult('harfen'); S(q).quarters.harfen = [{ from: 'verden', size: 200, since: mi(q), mix: 10, tension: 50 }];
  check(cond(q, 'mg_quarrel'), '텃세 사건'); fire(structuredClone(q), 'mg_quarrel', 0); fire(structuredClone(q), 'mg_quarrel', 1);
  S(q).me.settledFrom = 'verden'; S(q).me.settledAt = mi(q) - 30; fire(structuredClone(q), 'mg_quarrel', 0); fire(q, 'mg_quarrel', 1);
  const line = migrateLine(g); check(!!line && !BAD.test(line), `난민촌 한 줄: ${line}`);
}
// 6. 화면·지도·저장
{
  const g = adult('harfen'); S(g).camps.harfen = { from: 'verden', why: 'war', size: 120, since: mi(g) }; S(g).quarters.harfen = [{ from: 'gruental', size: 90, since: mi(g) - 50, mix: 30, tension: 10 }];
  const info = migrateInfo(g); check(info.camps.length === 1 && info.quarters.length === 1 && !BAD0.test(JSON.stringify(info)), '화면 한 장');
  const html = MAP_INFO.map((fn) => fn(g, { id: 'harfen' }) || '').join(''); check(html.includes('난민촌') && !BAD.test(html), '지도 설명');
  S(g).flows.push({ id: 99, from: 'verden', to: 'harfen', why: 'war', size: 100, left: 1, at: mi(g) });
  check(MAP_MARKS.some((fn) => (fn(g) ?? []).some((m) => m.place === 'verden')), '지도 표');
  const back = decodeSave(encodeSave(g)); check(back.migrate.camps.harfen?.size === 120 && back.migrate.pop.harfen > 0, '저장 왕복');
  const old = structuredClone(g); delete old.migrate; runHooks('migrate', old); check(old.migrate.pop.leocast === baseOf('leocast'), '옛 저장');
  check(quartersAt(g, 'ern').length === 0, '없는 거리');
}
// 7. 한 판 흐름 (플레이어 없이 60년)
{
  const h = mk(41); let lines = 0, moved = 0;
  for (let m = 0; m < 12 * 60; m++) {
    if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
    const acts = availableActions(h);
    endMonth(h, Array.from({ length: slotsFor(h) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let k = 0; while (h.pendingEvent && k++ < 6) resolveEvent(h, rngOf(h), h.pendingEvent.choices.length - 1);
    moved += S(h).flows.filter((f) => f.at === mi(h)).length;
    if (m % 6 === 0) { const line = migrateLine(h); if (line) { lines++; check(!BAD.test(line), `migrateLine ${line}`); } }
  }
  textOK(S(h).log.map((x) => x.text), '60년 기록');
  console.log(`  60년 판: 떠난 행렬 ${moved}, 난민촌 ${Object.keys(S(h).camps).length}, 거리 ${Object.values(S(h).quarters).flat().length}, 지난 일 ${S(h).past.length}, 한 줄 ${lines}`);
}
console.log(`migratetest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
