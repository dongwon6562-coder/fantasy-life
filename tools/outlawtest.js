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
import { occInfo, occLine, occState, occAt, occMonth, occupy, liberate, TARGETS } from '../src/occupied/index.js';
import { outlawsInfo, outlawsLine, outlawsState, outlawAt, outlawsOnRoad, outMonth, purge, lawless, bounty } from '../src/outlaws/index.js';
import { newBand } from '../src/outlaws/state.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { MAP_INFO } from '../src/art/map.js';

// 37단계 무법 지대와 산적 무리 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const tick = (g, n = 1, news = []) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; outMonth(g, (t) => news.push(t)); } return news; };
const R = (s) => makeRng({ s });
const S = outlawsState;
const textOK = (arr, what) => { for (const t of arr) check(!BAD.test(t), `${what}: ${t}`); };

// 1. 무법하면 무리가 선다, 잠잠하면 드물다
{
  let calm = 0, wild = 0;
  for (let s = 0; s < 4; s++) {
    const a = mk(100 + s); textOK(tick(a, 240), '잠잠한 소식'); calm += S(a).bands.length + S(a).past.length;
    const b = mk(200 + s); b.world.famine = true; b.realm.balhart.war = true; for (const k of Object.keys(b.revolt?.anger ?? {})) b.revolt.anger[k] = 70;
    const news = tick(b, 240); textOK(news, '흉년 소식'); wild += S(b).bands.length + S(b).past.length;
  }
  check(wild > calm, `흉년·전쟁이면 무리가 더 선다 (${calm} → ${wild})`);
  check(wild >= 4, `무법하면 무리가 선다 (${wild})`);
  check(lawless(mk(1), 'ern') < 30, '평소엔 무법도 낮다');
}
// 2. 커지면 통행세, 토벌, 꺾인 봉기 잔당, 전쟁 뒤 사면
{
  const g = mk(301); const b = newBand(g, 'gruental', R(1), { men: 20 });
  g.world.famine = true; tick(g, 60); check(b.toll || b.gone, '스무 명이 넘으면 통행세');
  const g2 = mk(302); const c = newBand(g2, 'verden', R(2), { men: 6 }); c.heat = 90;
  check(purge(g2, c, R(3), () => {}, { troops: 200 }) === 'crushed' && c.gone, '센 토벌대면 토벌');
  check(S(g2).past.slice(-1)[0].end === 'crushed', '지난 무리 기록');
  const d = newBand(g2, 'harfen', R(4), { men: 40 });
  check(purge(g2, d, R(5), () => {}, { troops: 1 }) === 'held' && d.fame > 5, '약한 토벌대는 쫓겨 간다');
  // 저절로 토벌: 눈이 뜨거우면 언젠가
  const g3 = mk(303); const e = newBand(g3, 'leocast', R(6), { men: 12 }); e.heat = 95; const n3 = tick(g3, 60);
  check(e.gone || e.heat < 95, '눈이 뜨거우면 토벌대가 온다'); textOK(n3, '토벌 소식');
  // 꺾인 봉기 잔당
  let rem = 0;
  for (let s = 0; s < 6; s++) { const h = mk(400 + s); (h.revolt ??= {}).past = [{ y: h.date.year, place: 'gruental', out: 'crushed', leader: 'x' }]; tick(h, 1); if (outlawAt(h, 'gruental')) rem++; }
  check(rem >= 1, `꺾인 봉기 잔당이 숲으로 (${rem}/6)`);
  // 전쟁이 끝나면 '전쟁 뒤', 무법도가 오른다
  const w = mk(305); const l0 = lawless(w, 'ern'); w.realm.balhart.war = true; tick(w, 1); w.realm.balhart.war = false; tick(w, 1);
  check(S(w).war === 'after' && lawless(w, 'ern') > l0, '전쟁 뒤 탈영병');
  // 길
  check(outlawsOnRoad(g, 'gruental', 'verden')?.id === b.id || b.gone, '그 길을 노리는 무리');
  check(!outlawsOnRoad(g, 'serenia', 'barka'), '먼 길은 아니다');
}
// 3. 길 위의 사건
{
  const g = mk(501); grown(g, 22); g.player.money = 200; g.player.skills.sword = 20; stay(g, 'gruental');
  const b = newBand(g, 'gruental', R(7), { men: 18 }); b.toll = true;
  L(g).travel = { to: 'verden', left: 2, from: 'gruental' };
  check(cond(g, 'out_toll'), '통행세 조건');
  for (let c = 0; c < 3; c++) for (const seed of [1, 4]) fire(structuredClone(g), 'out_toll', c, seed);
  b.noble = true; { const x = structuredClone(g); x.player.money = 5; fire(x, 'out_toll', 2); }
  check(cond(g, 'out_ambush'), '털림 조건');
  for (let c = 0; c < 3; c++) for (const seed of [1, 4, 9]) fire(structuredClone(g), 'out_ambush', c, seed);
  let cap = null;
  for (let seed = 1; seed < 40 && !cap; seed++) { const x = structuredClone(x0(g)); fire(x, 'out_ambush', 1, seed); if (S(x).me.captive) cap = x; }
  check(!!cap, '잡혀가기');
  if (cap) {
    check(cond(cap, 'out_captive'), '볼모 조건');
    for (let c = 0; c < 3; c++) for (const seed of [1, 3, 8]) { const x = structuredClone(cap); x.player.familyMoney = 100; fire(x, 'out_captive', c, seed); check(!S(x).me.captive, '볼모는 끝난다'); }
    let joined = false; for (let seed = 1; seed < 30 && !joined; seed++) { const x = structuredClone(cap); x.player.stats.cha = 70; fire(x, 'out_captive', 2, seed); joined = S(x).me.band === b.id && !L(x).travel; }
    check(joined, '볼모가 무리에 든다');
  }
  const t = structuredClone(g); t.life.travel = { to: 'barka', left: 2, from: 'serenia' }; check(!cond(t, 'out_toll') && !cond(t, 'out_ambush'), '먼 길엔 없다');
}
function x0(g) { const x = structuredClone(g); x.player.skills.sword = 0; x.player.stats.str = 5; x.player.stats.agi = 5; x.player.money = 300; return x; }
// 4. 마을의 사건
{
  const g = mk(601); grown(g, 25); stay(g, 'ern'); g.player.money = 120; g.player.familyMoney = 80;
  const b = newBand(g, 'ern', R(8), { men: 14 });
  const kin = [...g.player.familyIds.map((id) => g.people.find((p) => p.id === id))].filter((p) => p?.alive); for (const p of kin) p.place = 'ern';
  check(cond(g, 'out_kin_taken'), '식구가 잡혀가는 조건');
  for (let c = 0; c < 3; c++) for (const seed of [1, 5, 9]) fire(structuredClone(g), 'out_kin_taken', c, seed);
  check(cond(g, 'out_village_deal'), '마을 거래 조건');
  for (let c = 0; c < 3; c++) for (const seed of [1, 6]) fire(structuredClone(g), 'out_village_deal', c, seed);
  { const x = structuredClone(g); fire(x, 'out_village_deal', 0); check(outlawAt(x, 'ern').deal && !cond(x, 'out_village_deal'), '거래를 텄다'); }
  check(!cond(g, 'out_robin_gift'), '의적이 아니면 곡식 없음');
  b.noble = true; g.world.famine = true; check(cond(g, 'out_robin_gift'), '의적의 곡식 조건');
  for (let c = 0; c < 3; c++) fire(structuredClone(g), 'out_robin_gift', c);
  check(!cond(g, 'out_join'), '형편이 괜찮으면 무리에 안 든다');
  g.player.money = 3; check(cond(g, 'out_join'), '굶으면 무리에 드는 조건');
  for (let c = 1; c < 3; c++) for (const seed of [1, 7]) fire(structuredClone(g), 'out_join', c, seed);
  check(!has(g, 'out_ride'), '무리가 아니면 털이 없음');
  // 현상금
  b.heat = 50; g.player.skills.sword = 80; g.player.stats.str = 50; g.player.stats.agi = 50;
  check(has(g, 'out_hunt'), `현상금 행동 (${playerPower(g)})`);
  let got = 0; for (const seed of [1, 2, 3, 4, 5, 6]) { const x = structuredClone(g); const m0 = x.player.money; act(x, 'out_hunt', seed); if (x.player.money > m0) got++; check(!has(x, 'out_hunt'), '현상금은 반 해에 한 번'); }
  check(got >= 1, `현상금 받기 (${got}/6)`);
  check(bounty(b) > 10, '현상금 값');
  check(typeof outlawsLine(g) === 'string' && !BAD.test(outlawsLine(g)), `줄 ${outlawsLine(g)}`);
  // 무리에 든다
  const m = structuredClone(g); m.player.money = 3; fire(m, 'out_join', 0);
  check(S(m).me.band === b.id && S(m).me.role === 'man', '무리에 들었다');
  check(has(m, 'out_ride') && !has(m, 'out_give'), '졸개는 털이만');
  for (const seed of [1, 2, 3]) act(structuredClone(m), 'out_ride', seed);
  { const x = structuredClone(m); outlawAt(x, 'ern').loot = 50; const m0 = x.player.money; runHooks('afterMonth', x, R(1)); check(x.player.money > m0, '산채 몫'); }
  check(typeof outlawsLine(m) === 'string' && !BAD.test(outlawsLine(m)), `산채 줄 ${outlawsLine(m)}`);
  // 두목 되기
  S(m).me.rides = 5; outlawAt(m, 'ern').chiefSince -= 12; check(cond(m, 'out_chief'), '두목 되기 조건');
  fire(structuredClone(m), 'out_chief', 1);
  let chief = null; for (let seed = 1; seed < 30 && !chief; seed++) { const x = structuredClone(m); fire(x, 'out_chief', 0, seed); if (S(x).me.role === 'chief') chief = x; }
  check(!!chief, '두목이 되었다');
  if (chief) {
    const cb = outlawAt(chief, 'ern'); check(cb.chief === chief.player.name, '두목 이름'); cb.loot = 60; cb.heat = 45;
    check(has(chief, 'out_give') && has(chief, 'out_lie_low'), '두목 행동');
    act(structuredClone(chief), 'out_lie_low'); { const x = structuredClone(chief); act(x, 'out_give'); act(x, 'out_give'); check(outlawAt(x, 'ern').loot < 60, '나눠 주면 곳간이 준다'); }
    // 토벌대
    cb.heat = 99; for (let i = 0; i < 60 && outlawAt(chief, 'ern') && outlawAt(chief, 'ern').purgeAt == null; i++) tick(chief, 1); const cb2 = outlawAt(chief, 'ern');
    check(!cb2 || cb2.purgeAt != null || cb2.heat < 99, '내 무리에도 토벌대');
    if (cb2?.purgeAt != null) {
      check(cond(chief, 'out_purge'), '토벌대 조건');
      for (let c = 0; c < 3; c++) for (const seed of [1, 4, 8]) { const x = structuredClone(chief); fire(x, 'out_purge', c, seed); check(outlawAt(x, 'ern')?.purgeAt == null, '토벌 뒤'); }
      { const x = structuredClone(chief); fire(x, 'out_purge', 2); check(!outlawAt(x, 'ern') && S(x).me.band === null, '팔아넘기면 무리가 끝난다'); }
    }
    // 사면 방
    const am = structuredClone(chief); am.realm.balhart.war = true; outlawAt(am, 'ern') && (outlawAt(am, 'ern').purgeAt = null);
    if (outlawAt(am, 'ern')) { check(cond(am, 'out_amnesty'), '사면 조건'); fire(structuredClone(am), 'out_amnesty', 1); const x = structuredClone(am); fire(x, 'out_amnesty', 0); check(S(x).me.band === null && outlawAt(x, 'ern')?.chief !== x.player.name, '사면 받고 내려옴'); }
    // 오래 떠나면 잊는다
    const aw = structuredClone(chief); if (outlawAt(aw, 'ern')) { stay(aw, 'harfen'); S(aw).me.awayAt -= 13; runHooks('afterMonth', aw, R(1)); check(S(aw).me.band === null, '오래 떠나면 잊힌다'); }
  }
  const I = outlawsInfo(m); check(!BAD.test(JSON.stringify(I).replace(/"here":null|"band":null|"role":null/g, '')), `outlawsInfo ${JSON.stringify(I).slice(0, 200)}`);
  const html = MAP_INFO.map((f) => f(g, { id: 'ern' })).join(''); check(html.includes('산채') || html.includes('검은솔'), '지도 한 줄');
  // 저장 왕복
  const back = decodeSave(encodeSave(m)); check(back.outlaws.me.band === b.id && back.outlaws.bands.length >= 1, '저장 왕복');
  const old = structuredClone(g); delete old.outlaws; runHooks('migrate', old); check(Array.isArray(old.outlaws.bands), '옛 저장');
}
// 5. 한 판 흐름 (플레이어 없이 80년)
{
  let made = 0, ended = 0;
  for (let s = 0; s < 2; s++) {
    const h = mk(31 + s); const seen = new Set();
    for (let m = 0; m < 12 * 80; m++) {
      if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
      const acts = availableActions(h);
      endMonth(h, Array.from({ length: slotsFor(h) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
      let k = 0; while (h.pendingEvent && k++ < 6) resolveEvent(h, rngOf(h), h.pendingEvent.choices.length - 1);
      for (const x of S(h).bands) seen.add(x.id);
      if (m % 12 === 0) { const line = outlawsLine(h); if (line) check(!BAD.test(line), `outlawsLine ${line}`); }
    }
    made += seen.size; ended += S(h).past.length;
    console.log(`  80년 판 ${s + 1}: 선 무리 ${seen.size}, 끝난 무리 ${S(h).past.length} (${S(h).past.map((x) => x.end).join(',')}), ${S(h).log.slice(-2).map((x) => x.text).join(' / ')}`);
  }
  check(made >= 1, `플레이어 없이 무리가 선다 (${made})`);
}
console.log(`outlawtest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
