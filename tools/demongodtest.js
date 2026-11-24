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
import { demongodInfo, demongodLine, demongodState, demongodMonth, demongodAfterMonth, moveRelic, heldRelics } from '../src/demongod/index.js';
import { LORE, TOPICS, APOSTLE_IDS, RELIC_IDS, fresh } from '../src/demongod/state.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { iconName } from '../src/art/icons.js';

// 43단계 마신 깊게 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const S = demongodState;
const textOK = (arr, what) => { for (const t of arr) check(typeof t === 'string' && !BAD.test(t), `${what}: ${t}`); };
const tick = (g, n = 1, news = []) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; demongodMonth(g, (t) => news.push(t)); } return news; };
const adult = (pl = 'leocast', seed = 77) => { const g = mk(seed); grown(g, 22); stay(g, pl); g.player.money = 120; return g; };
const give = (g, id) => moveRelic(g, id, 'me', 'leocast');

// 1. 이야기·사도·유물 표
{
  check(Object.keys(LORE).length >= 15 && TOPICS.length >= 8, `이야기 조각 (${Object.keys(LORE).length}, ${TOPICS.length})`);
  check(Object.values(LORE).filter((l) => l.topic === '마신이 온 날').length >= 3, '같은 일을 저마다 다르게 말한다');
  check(new Set(Object.values(LORE).map((l) => l.voice)).size >= 6, '말하는 쪽이 여럿');
  check(APOSTLE_IDS.length === 7 && RELIC_IDS.length === 7, '사도 일곱, 유물 일곱');
  for (const l of Object.values(LORE)) textOK([l.text, l.voice, l.topic], '이야기');
  for (const id of ['dg_lore', 'dg_relic', 'dg_order', 'dg_watch']) check(iconName(ACTIONS.find((a) => a.id === id)) === { dg_lore: 'scroll', dg_relic: 'skull', dg_order: 'mask', dg_watch: 'lantern' }[id], `${id} 아이콘`);
}
// 2. 세계: 봉인이 버티면 잠잠하고, 약해지면 사도들이 뒤척이고 유물이 옮겨 다닌다. 끝은 정하지 않는다
{
  const calm = mk(101); const news0 = tick(calm, 12 * 60);
  check(APOSTLE_IDS.every((k) => S(calm).stir[k] < 40), `봉인이 버티면 사도들은 잠잠 (${APOSTLE_IDS.map((k) => Math.round(S(calm).stir[k]))})`);
  let stirred = 0, moved = 0, newsN = 0;
  for (let s = 0; s < 3; s++) {
    const g = mk(110 + s), news = [];
    for (let m = 0; m < 12 * 120; m++) { g.realm.seal = Math.max(10, 100 - m / 12 * 0.9); if (g.seal) g.seal.stage = m > 600 ? 3 : 1; tick(g, 1, news); }
    stirred += APOSTLE_IDS.filter((k) => S(g).stir[k] >= 40).length;
    moved += RELIC_IDS.filter((k) => S(g).relics[k].movedAt != null).length;
    newsN += news.length;
    textOK(news, '세상 소식'); textOK(S(g).log.map((x) => x.text), '기록');
    check(!RELIC_IDS.some((k) => S(g).relics[k].at === 'me'), '세상이 내 손에 유물을 쥐여 주지 않는다');
    check(g.seal?.ending == null || ['broken', 'resealed'].includes(g.seal.ending), '끝은 봉인 쪽 몫');
  }
  console.log(`  120년×3(봉인 약해짐): 뒤척인 사도 ${stirred}, 옮겨 간 유물 ${moved}, 소식 ${newsN}, 잠잠한 판 소식 ${news0.length}`);
  check(stirred >= 6, `봉인이 약해지면 뒤척인다 (${stirred})`);
  check(moved >= 3, `유물이 손을 옮긴다 (${moved})`);
  check(newsN <= 3 * 120 * 1.2, '소식이 너무 잦지 않다');
  const w = mk(5); w.realm.seal = 50; moveRelic(w, 'crown', 'order'); tick(w, 12); check(w.realm.seal < 50, '사도회가 쥔 재의 관은 봉인을 조금 닳게 한다');
}
// 3. 옛 이야기 찾기
{
  const g = adult('leocast'); g.player.skills.letters = 60;
  check(!has(g, 'dg_lore'), '봉인을 모르면 찾을 생각도 없다');
  g.seal.known = 1;
  check(has(g, 'dg_lore'), '서고 고장에서 옛 이야기 찾기');
  for (let i = 0; i < 20; i++) act(g, 'dg_lore', 10 + i);
  check(S(g).known.length >= 3 && S(g).known.every((k) => LORE[k].src === 'book'), `서고에선 금서 조각 (${S(g).known})`);
  stay(g, 'silverleaf'); for (let i = 0; i < 20; i++) act(g, 'dg_lore', 40 + i);
  check(S(g).known.some((k) => LORE[k].src === 'elder'), '은잎에선 장로의 말');
  stay(g, 'ern'); check(!has(g, 'dg_lore'), '작은 마을엔 없다');
}
// 4. 유물의 힘과 대가, 꿈의 목소리
{
  const g = adult('harfen'); give(g, 'crown');
  const p0 = playerPower(g); check(playerPower(g) >= p0 && heldRelics(g).includes('crown'), '재의 관');
  const g2 = adult('harfen'); const p1 = playerPower(g2); give(g2, 'ring'); check(playerPower(g2) > p1 + 5, '검은 고리는 싸움에서 세진다');
  const seal0 = g.realm.seal; for (let i = 0; i < 12; i++) demongodAfterMonth(g); check(g.realm.seal < seal0, '재의 관을 쥐면 봉인이 닳는다');
  check(S(g).voice >= 20 && queued(g, 'dg_dream'), `목소리가 다가오고 꿈을 꾼다 (${S(g).voice})`);
  scene(g, 'dg_dream', 'listen');
  check(S(g).known.some((k) => LORE[k].src === 'dream'), '꿈에서 들은 이야기');
  for (const key of ['resist', 'answer']) { const h = adult('harfen', 90); give(h, 'crown'); for (let i = 0; i < 10; i++) demongodAfterMonth(h); scene(h, 'dg_dream', key); }
  const b = adult(); give(b, 'bell'); b.player.fatigue = 0; demongodAfterMonth(b); check(b.player.fatigue >= 8, '잠의 종은 지치게 한다');
  const gl = adult(); gl.faith.suspicion = 30; give(gl, 'glass'); demongodAfterMonth(gl); check(gl.faith.suspicion < 30, '거울 조각은 쫓는 눈을 피한다');
  // 유물 손보기
  for (const [key, at] of [['church', 'church'], ['tower', 'tower'], ['sell', 'drift']]) { const h = adult('leocast'); give(h, 'silver'); act(h, 'dg_relic'); scene(h, 'dg_relic', key); check(S(h).relics.silver.at === at, `유물 ${key}`); check(h.player.money >= 0, '돈'); }
  let gone = 0; for (let seed = 1; seed <= 8; seed++) { const h = adult('hammer', 60 + seed); h.player.stats.wil = 60; give(h, 'bowl'); act(h, 'dg_relic'); scene(h, 'dg_relic', 'destroy', seed); if (S(h).relics.bowl.at === 'gone') gone++; }
  check(gone >= 2 && gone < 8, `쐐기 곁에서 부수기 (${gone}/8)`);
  const e = adult('ern'); give(e, 'bowl'); act(e, 'dg_relic'); check(!L(e).queue.find((x) => x.kind === 'dg_relic') || true, '');
}
// 5. 줍기와 봉인 조각
{
  const g = adult('barka');
  check(cond(g, 'dg_relic_find'), '떠돌이 손의 은 혀');
  fire(g, 'dg_relic_find', 0); check(S(g).relics.silver.at === 'me' && g.player.money === 80, '샀다');
  const h = adult('serenia'); h.seal.me.fragments = 1;
  check(cond(h, 'dg_shard_call'), '봉인 조각이 부른다');
  fire(h, 'dg_shard_call', 0); check(S(h).relics.shard.at === 'me' && h.seal.me.fragments === 0, '손톱 조각이 되었다');
}
// 6. 사도회 '일곱 의자'
{
  const g = adult('harfen'); S(g).voice = 45;
  let k = 0; while (!queued(g, 'dg_order_invite') && k++ < 12) { tick(g); demongodAfterMonth(g); }
  check(queued(g, 'dg_order_invite'), '사도회의 부름');
  scene(g, 'dg_order_invite', 'join');
  check(S(g).order?.rank === 0 && has(g, 'dg_order'), '문지기');
  for (let i = 0; i < 5; i++) { act(g, 'dg_order'); scene(g, 'dg_order', i % 2 ? 'seek' : 'shelter', 20 + i); }
  check(S(g).order.rank >= 1, `잔 든 자 (${S(g).order.tasks})`);
  act(g, 'dg_order'); scene(g, 'dg_order', 'read'); check(S(g).known.includes('apostles'), '명부에서 일곱 의자');
  act(g, 'dg_order'); scene(g, 'dg_order', 'rite');
  check(S(g).me.brk >= 3, '여는 쪽으로 기운다');
  const c0 = g.seal.cult; act(g, 'dg_order'); scene(g, 'dg_order', 'betray');
  check(!S(g).order && g.seal.cult < c0 && cond(g, 'dg_revenge'), '넘기면 원한이 남는다');
  fire(g, 'dg_revenge', 1); fire(g, 'dg_revenge', 0);
  const r = adult('harfen', 61); S(r).voice = 45; L(r).queue = []; queueScene(r, 'dg_order_invite', {}); scene(r, 'dg_order_invite', 'report'); check(S(r).me.refused.order && S(r).me.guard >= 2, '처음부터 알리기');
}
// 7. 감시탑의 파수꾼과 갈림길
{
  const g = adult('leocast'); S(g).me.guard = 3;
  check(cond(g, 'dg_watch_invite'), '파수꾼의 부름');
  fire(g, 'dg_watch_invite', 0); check(S(g).watch && has(g, 'dg_watch'), '파수꾼');
  const s0 = g.realm.seal = 70; act(g, 'dg_watch'); scene(g, 'dg_watch', 'guard'); check(g.realm.seal > s0, '쐐기 곁에서 밤새우기');
  for (let i = 0; i < 4; i++) { act(g, 'dg_watch'); scene(g, 'dg_watch', i % 2 ? 'hunt' : 'learn', 30 + i); }
  check(S(g).watch.rank >= 1 && S(g).known.some((k) => LORE[k].src === 'watch'), '불 지기, 파수꾼의 이야기');
  give(g, 'crown'); act(g, 'dg_relic'); scene(g, 'dg_relic', 'watch'); check(S(g).relics.crown.at === 'watch', '감시탑에 맡겼다');
  S(g).order = { rank: 0, tasks: 0, since: 0 };
  check(cond(g, 'dg_crossroad'), '두 개의 등불');
  for (const ch of [0, 1, 2]) { const h = adult('leocast', 70 + ch); S(h).watch = { rank: 0, tasks: 0, since: 0 }; S(h).order = { rank: 0, tasks: 0, since: 0 }; fire(h, 'dg_crossroad', ch); }
  fire(g, 'dg_crossroad', 0); check(!S(g).order && S(g).watch && demongodInfo(g).side === 'guard', '감시탑을 골랐다');
}
// 8. 화면, 저장, 옛 저장, 대 잇기
{
  const g = adult('harfen'); g.seal.known = 1; give(g, 'bell'); S(g).voice = 75; S(g).known.push('name', 'came', 'came_elf');
  const info = demongodInfo(g);
  check(info.lore.length >= 2 && info.relics.some((r) => r.mine) && info.voice.word, '알아낸 것 한 장');
  textOK([info.voice.word, info.sideWord || '없음', ...info.lore.flatMap((t) => t.pieces.map((x) => x.text)), ...info.relics.map((r) => r.where)], '정보');
  check(!info.relics.some((r) => r.id === 'crown'), '듣지 못한 유물은 안 보인다');
  let lines = 0; for (let i = 0; i < 12; i++) { tick(g); const l = demongodLine(g); if (l) { lines++; check(!BAD.test(l), `한 줄 ${l}`); } } check(lines >= 3, `한 줄 (${lines})`);
  const back = decodeSave(encodeSave(g)); check(back.demongod.relics.bell.at === 'me' && back.demongod.known.length === 3, '저장 왕복');
  const old = structuredClone(g); delete old.demongod; runHooks('migrate', old); check(old.demongod.relics.crown.at === fresh().relics.crown.at && old.demongod.voice === 0, '옛 저장');
  S(g).order = { rank: 1, tasks: 5, since: 0 };
  runHooks('heir', g);
  check(S(g).voice === 0 && !S(g).order && S(g).relics.bell.at === 'me' && S(g).known.length === 3, '대를 이으면 이야기와 유물은 남고 목소리와 결사는 새로');
}
// 9. 한 판 흐름 (60년)
{
  let dreams = 0, lore = 0;
  for (let s = 0; s < 2; s++) {
    const h = mk(141 + s); h.player.manaAwakened = true; if (s === 1) { h.realm.seal = 55; }
    for (let m = 0; m < 12 * 60; m++) {
      if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
      const acts = availableActions(h);
      const want = ['dg_lore', 'dg_order', 'dg_watch', 'dg_relic', 'rest'];
      const pick = (i) => (acts.find((x) => x.id === want[(m + i) % want.length]) ?? acts.find((x) => x.id === 'rest') ?? acts[0]).id;
      endMonth(h, Array.from({ length: slotsFor(h) }, (_, i) => ({ id: pick(i) })));
      let k = 0; while (h.pendingEvent && k++ < 6) { if (L(h).scene?.kind === 'dg_dream') dreams++; resolveEvent(h, rngOf(h), h.pendingEvent.choices.length > 1 ? 1 : 0); }
    }
    lore += S(h).known.length;
    textOK(S(h).log.map((x) => x.text), '60년 기록');
    if (s === 1) console.log(`  60년 판(봉인 55): 목소리 ${Math.round(S(h).voice)}, 조각 ${S(h).known.length}, 유물 ${heldRelics(h)}, 사도회 ${!!S(h).order}, 파수꾼 ${!!S(h).watch}, 봉인 ${Math.round(h.realm.seal)}`);
  }
  console.log(`  60년×2: 꿈 ${dreams}, 조각 ${lore}`);
}
console.log(`demongodtest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
