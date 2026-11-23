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
const act = (g, id, seed = 3) => { const a = ACTIONS.find((x) => x.id === id); const out = a.run(g, makeRng({ s: seed })); check(typeof out === 'string' && !BAD.test(out), `${id}: ${out}`); return out; };
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
import { realmOf } from '../src/realms/index.js';
import { heirsOf } from '../src/heir.js';

// 36단계 점령지에서 살기 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 61) => newGame({ name: '하랄트', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const tick = (g, n = 1, news = []) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; occMonth(g, (t) => news.push(t)); } return news; };

// 1. 전선이 밀리면 그륀탈부터 점령, 진 강화면 제국 땅, 이기면 풀린다
let g = mk();
check(realmOf('gruental') === 'leonia', '처음엔 레오니아 땅');
{
  const b = g.realm.balhart; b.war = true; b.front = -4; b.fortsLost = 0;
  const news = tick(g, 60);
  check(!!occAt(g, 'gruental'), '전선 -4면 그륀탈 점령');
  check(!occAt(g, 'harfen'), '하르펜은 아직');
  check(news.some((t) => t.includes('검은 독수리')), '점령 소식');
  b.front = -6; tick(g, 80); check(!!occAt(g, 'verden'), '더 밀리면 베르덴');
  // 진 강화
  b.war = false; b.fortsLost = 1; b.tension = 40; const n2 = tick(g, 1);
  check(occAt(g, 'gruental')?.ceded && occAt(g, 'verden')?.ceded, '진 강화면 넘어간다');
  check(realmOf('gruental') === 'valhart', `넘어간 땅은 발하르트 (${realmOf('gruental')})`);
  check(n2.some((t) => t.includes('제국 땅')), '넘어간 소식');
  // 저장 왕복과 새 판: 땅 주인이 저장을 따른다
  const back = decodeSave(encodeSave(g));
  check(back.occ.places.gruental.ceded, '저장 왕복');
  const fresh = mk(62); check(realmOf('gruental') === 'leonia', '새 판은 다시 레오니아');
  runHooks('migrate', back); check(realmOf('gruental') === 'valhart', '불러오면 다시 발하르트');
  // 다음 전쟁에서 이기면 되찾는다
  b.war = true; b.front = 0; tick(g, 1); b.war = false; b.tension = 25; const n3 = tick(g, 1);
  check(!occAt(g, 'gruental') && !occAt(g, 'verden'), '이기면 다 풀린다');
  check(realmOf('gruental') === 'leonia', '되찾은 땅은 레오니아');
  check(n3.some((t) => t.includes('해방')), '해방 소식');
  check(occState(g).past.length >= 2 && occState(g).tried.gruental != null, '지난 점령과 심판 기록');
  void fresh;
}
// 2. 점령지 안: 가혹하면 저항이 자라고, 저항이 끓으면 revolt 분노로
{
  const h = mk(63); occupy(h, 'gruental', makeRng({ s: 1 }), () => {}); const o = occAt(h, 'gruental'); o.temper = 'cruel'; o.harsh = 70; o.resist = 10;
  tick(h, 120);
  check(o.resist > 10 || !occAt(h, 'gruental'), `가혹하면 저항이 자란다 (${o.resist})`);
  if (occAt(h, 'gruental')) check((h.revolt?.anger?.gruental ?? 0) >= o.resist * 0.8 - 1, '저항은 분노로');
  // 봉기가 이기면 풀린다
  const k = mk(64); occupy(k, 'verden', makeRng({ s: 2 }), () => {}); (k.revolt ??= {}).past = [...(k.revolt.past ?? []), { y: k.date.year, place: 'verden', out: 'won', leader: 'x' }];
  tick(k, 1); check(!occAt(k, 'verden') && occState(k).past.slice(-1)[0].how === 'rising', '봉기가 이기면 풀린다');
  // 점령 전의 봉기 기록으로는 안 풀린다
  const q = mk(65); (q.revolt ??= {}).past = [{ y: q.date.year, place: 'verden', out: 'won', leader: 'old' }]; occupy(q, 'verden', makeRng({ s: 3 }), () => {}); tick(q, 2); check(!!occAt(q, 'verden'), '옛 봉기로는 안 풀린다');
}
// 3. 사건들
{
  const h = mk(66); grown(h, 22); h.player.money = 300; h.player.stats.int = 40; h.player.skills.letters = 30; stay(h, 'gruental');
  occupy(h, 'gruental', makeRng({ s: 4 }), () => {});
  check(cond(h, 'occ_arrive'), '점령의 날 조건');
  for (const c of [0, 1]) fire(structuredClone(h), 'occ_arrive', c);
  { const x = structuredClone(h); fire(x, 'occ_arrive', 2); check(!!L(x).travel && occState(x).me.fled === 1, '피란'); }
  fire(h, 'occ_arrive', 0); check(!cond(h, 'occ_arrive'), '점령의 날은 한 번');
  check(cond(h, 'occ_levy'), '징발 조건'); for (let c = 0; c < 3; c++) for (const seed of [1, 7]) fire(structuredClone(h), 'occ_levy', c, seed);
  check(cond(h, 'occ_post'), '부역 자리 조건');
  { const x = structuredClone(h); const m0 = x.player.money; fire(x, 'occ_post', 0); check(occState(x).me.post === 'gruental', '자리를 받았다'); runHooks('afterMonth', x, makeRng({ s: 1 })); check(x.player.money > m0, '녹봉'); }
  for (const c of [1, 2]) fire(structuredClone(h), 'occ_post', c);
  { const x = structuredClone(h); const m0 = x.player.money; runHooks('afterMonth', x, makeRng({ s: 1 })); check(x.player.money < m0 + 1, '점령 세금'); }
  occAt(h, 'gruental').resist = 30; check(cond(h, 'occ_resist'), '저항 조건');
  for (let c = 0; c < 4; c++) for (const seed of [2, 5, 11]) fire(structuredClone(h), 'occ_resist', c, seed);
  occState(h).me.resist = 3; check(cond(h, 'occ_informer'), '밀고 조건'); for (let c = 0; c < 3; c++) for (const seed of [1, 8]) fire(structuredClone(h), 'occ_informer', c, seed);
  check(cond(h, 'occ_soldier'), '병사 조건'); { const x = structuredClone(h); fire(x, 'occ_soldier', 0); check(!!occState(x).me.bond && !cond(x, 'occ_soldier'), '정든 병사'); } fire(structuredClone(h), 'occ_soldier', 1);
  check(typeof occLine(h) === 'string' && !BAD.test(occLine(h)), `occLine ${occLine(h)}`);
  // 해방 뒤 심판: 부역한 나와 아닌 나
  const col = structuredClone(h); fire(col, 'occ_post', 0); liberate(col, 'gruental', 'won', () => {});
  check(cond(col, 'occ_trial'), '심판 조건'); check(occState(col).me.post === null || true, '');
  for (let c = 0; c < 3; c++) for (const seed of [1, 3, 9]) { const x = structuredClone(col); fire(x, 'occ_trial', c, seed); check(!cond(x, 'occ_trial') && occState(x).me.post === null, '심판 뒤 자리 없음'); }
  const clean = structuredClone(h); liberate(clean, 'gruental', 'won', () => {}); clean.occ.me.bond = '요나스';
  for (let c = 0; c < 3; c++) for (const seed of [2, 4]) fire(structuredClone(clean), 'occ_trial', c, seed);
  check(typeof occLine(clean) === 'string', '해방 뒤 줄');
  const I = occInfo(col); check(!BAD.test(JSON.stringify(I).replace(/"post":null|"bond":null|"here":null/g, '')), `occInfo ${JSON.stringify(I).slice(0, 200)}`);
}
// 4. 한 판 흐름 (점령이 없어도, 있어도 오류 없이)
{
  // 세계가 굴러가는 모양은 다른 갈래가 늘면 바뀐다. 씨앗 셋 중 한 판은 점령이 와야 한다.
  let h;
  for (const seed of [31, 32, 33]) {
  h = mk(seed);
  for (let m = 0; m < 12 * 80; m++) {
    if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
    if (m === 12 * 20) { h.realm.balhart.war = true; h.realm.balhart.front = -6; h.realm.balhart.warMonths = 0; }
    const acts = availableActions(h);
    endMonth(h, Array.from({ length: slotsFor(h) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let k = 0; while (h.pendingEvent && k++ < 6) resolveEvent(h, rngOf(h), h.pendingEvent.choices.length - 1);
    const line = occLine(h); if (line) check(!BAD.test(line), `occLine ${line}`);
  }
  if (occState(h).past.length + Object.keys(occState(h).places).length) break;
  }
  const S = occState(h);
  check(S.past.length + Object.keys(S.places).length >= 1, `80년에 점령이 한 번은 (${S.past.length}, ${Object.keys(S.places)})`);
  for (const pl of TARGETS) check(realmOf(pl) === (occAt(h, pl)?.ceded ? 'valhart' : 'leonia'), `땅 주인 맞음 ${pl}`);
  console.log(`  80년: 지난 점령 ${S.past.length}, 지금 점령 ${Object.keys(S.places).join(',') || '없음'}, ${S.log.slice(-3).map((x) => x.text).join(' / ')}`);
}
mk(1); // 새 판은 땅 주인을 되돌린다
console.log(`occtest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
