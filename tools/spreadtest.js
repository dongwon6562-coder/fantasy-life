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
import { TECHS, TECH, techState } from '../src/techtree/index.js';
import { techGrow, costOf, openTechs } from '../src/techtree/grow.js';
import { spreadInfo, spreadLine, spreadState, reachedAt, spreadMonth, PLACE_IDS } from '../src/techspread/index.js';
import { addReach } from '../src/techspread/state.js';
import { RS } from '../src/research/state.js';
import { heirsOf } from '../src/heir.js';

// 35단계 기술이 퍼지는 길 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 51) => newGame({ name: '하랄트', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const upTo = (g, id) => { const want = new Set(); const add = (x) => { if (want.has(x)) return; want.add(x); TECH[x].needs.forEach(add); }; add(id); for (const t of TECHS) if (want.has(t.id) && !g.history.inventions.includes(t.id)) g.history.inventions.push(t.id); };
// 나무에서 기술 하나를 나오게 한다 (AFTER_TECH까지 거치게)
const born = (g, id) => { const T = techState(g); T.prog[id] = [costOf(TECH[id]) + 1, 1]; for (let i = 0; i < 3 && !g.history.inventions.includes(id); i++) techGrow(g, makeRng({ s: i + 1 }), () => {}, () => {}); return g.history.inventions.includes(id); };

// 1. 나온 기술은 처음엔 나온 고장에만, 다달이 이웃으로 번진다
let g = mk();
check(born(g, 'gear'), '톱니가 나온다');
check(reachedAt(g, 'gear', 'harfen') && !reachedAt(g, 'gear', 'ern') && !reachedAt(g, 'gear', 'saltrock'), '처음엔 하르펜에만');
check(!reachedAt(g, 'clock', 'harfen'), '안 나온 기술은 어디에도 없다');
{
  const news = []; let firstYear = null, n0 = spreadState(g).reach.gear.length;
  for (let m = 0; m < 12 * 40; m++) { g.date.month = (m % 12) + 1; if (g.date.month === 1) g.date.year++; spreadMonth(g, (t) => news.push(t)); if (firstYear == null && spreadState(g).reach.gear.length > n0) firstYear = m / 12; }
  const n = spreadState(g).reach.gear.length;
  check(firstYear != null && firstYear >= 0.3, `첫 번짐은 몇 달은 걸린다 (${firstYear})`);
  check(n >= 6, `40년이면 여러 고장 (${n})`);
  check(reachedAt(g, 'gear', 'ern') || reachedAt(g, 'gear', 'verden') || reachedAt(g, 'gear', 'leocast'), '이웃부터');
  check(news.every((t) => !BAD.test(t)), `번짐 소식 ${news.find((t) => BAD.test(t))}`);
}
// 2. 길이 막히면(교단) 그 고장엔 안 들어온다, 특허장이면 더디다
{
  const a = mk(52), b = mk(52);
  born(a, 'gear'); born(b, 'gear');
  spreadState(b).patent.gear = 99999 * 12;
  spreadState(a).block.ern = ['gear', 99999 * 12]; spreadState(b).block.ern = ['gear', 99999 * 12];
  for (let m = 0; m < 12 * 25; m++) { for (const x of [a, b]) { x.date.month = (m % 12) + 1; if (x.date.month === 1) x.date.year++; spreadMonth(x, () => {}); } }
  check(!reachedAt(a, 'gear', 'ern'), '막힌 고장엔 안 들어온다');
  check(spreadState(b).reach.gear.length <= spreadState(a).reach.gear.length, `특허장이면 더디다 ${spreadState(b).reach.gear.length} <= ${spreadState(a).reach.gear.length}`);
}
// 3. 연구 후원: 열린 끝을 조금 앞당긴다, 상한이 있다, 한 해 한 번
{
  const h = mk(); grown(h, 22); stay(h, 'harfen'); h.player.money = 2000; upTo(h, 'stonecut');
  check(has(h, 'spread_patron'), '후원 보임');
  const T = techState(h);
  act(h, 'spread_patron');
  check(!has(h, 'spread_patron'), '한 해에 한 번');
  const S = spreadState(h), id = Object.keys(S.backed)[0];
  check(!!id && TECH[id].needs.every((n) => h.history.inventions.includes(n)), `열린 끝을 후원 ${id}`);
  for (let i = 0; i < 12; i++) { S.me.patronAt = -99; if (has(h, 'spread_patron')) act(h, 'spread_patron', i); }
  for (const [k, v] of Object.entries(S.backed)) check(v <= costOf(TECH[k]) * 0.12 + 0.01, `후원 상한 ${k} ${v}`);
  const big = Object.entries(S.backed).reduce((m, [k, v]) => Math.max(m, v / costOf(TECH[k])), 0);
  check(big > 0 && big <= 0.121, `앞당긴 몫은 품의 12%까지 (${big.toFixed(3)})`);
  // 후원한 것이 나오면 이름
  const news = []; T.prog[id] = [costOf(TECH[id]) + 1, 1]; techGrow(h, makeRng({ s: 1 }), (t) => news.push(t), () => {});
  check(news.some((t) => t.includes('후원자')), `후원자 소식 ${news}`);
  check(h.player.money < 2000, '돈이 든다');
}
// 4. 사건들
{
  const h = mk(53); grown(h, 22); h.player.money = 500; h.player.stats.sen = 40; h.player.stats.agi = 40;
  born(h, 'gear'); born(h, 'brick');
  // 떠돌이 기술자: 이웃(하르펜)엔 있고 에른엔 없을 때
  stay(h, 'ern');
  check(cond(h, 'spread_wanderer'), '떠돌이 조건'); fire(h, 'spread_wanderer', 0); check(reachedAt(h, 'brick', 'ern') || reachedAt(h, 'gear', 'ern'), '들였다');
  for (const c of [1, 2]) { const x = structuredClone(h); delete x.spread.reach.brick; addReach(x, 'brick', 'harfen'); x.spread.reach.gear = [[PLACE_IDS.indexOf('harfen'), 500]]; stay(x, 'ern'); if (cond(x, 'spread_wanderer')) fire(x, 'spread_wanderer', c); }
  // 훔치기: 하르펜엔 있는데 이웃엔 없는 것
  const s = mk(54); grown(s, 22); s.player.money = 100; s.player.stats.sen = 40; s.player.stats.agi = 40; born(s, 'gear'); stay(s, 'harfen');
  check(cond(s, 'spread_steal'), '훔치기 조건');
  for (let c = 0; c < 3; c++) for (const seed of [2, 9]) fire(structuredClone(s), 'spread_steal', c, seed);
  { const x = structuredClone(s); for (let seed = 1; seed < 12; seed++) { const y = structuredClone(s); fire(y, 'spread_steal', 0, seed); if (spreadState(y).me.stole) { check(spreadState(y).reach.gear.length >= 2, '훔친 비법이 이웃으로'); break; } } void x; }
  // 내 비법 지키기와 특허장 (내 이름의 발명)
  const k = mk(55); grown(k, 25); k.player.money = 300; born(k, 'gear'); RS(k).invented.push('gear'); stay(k, 'harfen');
  check(cond(k, 'spread_keep'), '비법 지키기 조건');
  { const x = structuredClone(k); const r0 = RS(x).royalty; fire(x, 'spread_keep', 0); check(spreadState(x).guard.gear && RS(x).royalty > r0, '지킨다'); check(!cond(x, 'spread_keep'), '한 번만'); }
  { const x = structuredClone(k); const n0 = spreadState(x).reach.gear.length; fire(x, 'spread_keep', 1); check(spreadState(x).reach.gear.length > n0, '퍼지게 둔다'); }
  stay(k, 'leocast'); check(cond(k, 'spread_patent'), '특허장 조건');
  { const x = structuredClone(k); fire(x, 'spread_patent', 0); check(spreadState(x).patent.gear > 0 && !cond(x, 'spread_patent'), '특허장'); fire(structuredClone(k), 'spread_patent', 1); }
  // 다른 나라에 팔기
  stay(k, 'portel'); check(cond(k, 'spread_sell_abroad'), '팔기 조건');
  for (let c = 0; c < 3; c++) for (const seed of [1, 4]) fire(structuredClone(k), 'spread_sell_abroad', c, seed);
  // 교단과 막기: 교단이 꺼리는 기술이 이웃에 왔을 때
  const f = mk(56); grown(f, 25); upTo(f, 'healstone'); f.later.stance.faith = -30;
  spreadState(f).reach.healstone = [[PLACE_IDS.indexOf('harfen'), 600]]; stay(f, 'ern');
  check(cond(f, 'spread_faith_block'), '교단 막기 조건');
  { const x = structuredClone(f); fire(x, 'spread_faith_block', 0); check(spreadState(x).block.ern?.[0] === 'healstone' && !cond(x, 'spread_faith_block'), '막았다'); check(typeof spreadLine(x) === 'string', `막힌 줄 ${spreadLine(x)}`); }
  for (const c of [1, 2]) for (const seed of [1, 3]) fire(structuredClone(f), 'spread_faith_block', c, seed);
}
// 5. 한 줄과 한 장, 저장 왕복, 한 판 흐름 (백 년)
{
  let h = mk(77);
  for (let m = 0; m < 12 * 100; m++) {
    if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
    const acts = availableActions(h);
    endMonth(h, Array.from({ length: slotsFor(h) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let k = 0; while (h.pendingEvent && k++ < 6) resolveEvent(h, rngOf(h), h.pendingEvent.choices.length - 1);
    const line = spreadLine(h); if (line) check(!BAD.test(line), `spreadLine ${line}`);
  }
  const I = spreadInfo(h);
  check(I.techs.length === h.history.inventions.filter((id) => TECH[id]).length, `spreadInfo 기술 ${I.techs.length}`);
  check(I.techs.some((t) => t.places > 1) && I.techs.some((t) => t.places < I.total), '퍼진 것과 덜 퍼진 것');
  check(!BAD.test(JSON.stringify(I).replace(/"block":null/g, '')), 'spreadInfo 글');
  const back = decodeSave(encodeSave(h));
  check(JSON.stringify(back.spread) === JSON.stringify(h.spread), '저장 왕복');
  check(JSON.stringify(h.spread).length < 12000, `저장 크기 ${JSON.stringify(h.spread).length}`);
  // 예전 저장: spread가 없으면 나온 기술은 어디에나
  const old = structuredClone(h); delete old.spread; const any = h.history.inventions[0];
  check(reachedAt(old, any, 'saltrock'), '예전 저장은 어디에나');
  console.log(`  백 년: 기술 ${I.techs.length}, 고장 ${I.total}곳 가운데 평균 ${(I.techs.reduce((s, t) => s + t.places, 0) / Math.max(1, I.techs.length)).toFixed(1)}곳`);
}

console.log(`spreadtest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
