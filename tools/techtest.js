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
import { becomeHeir } from '../src/heir.js';
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
import { TECHS, TECH, techInfo, techLine, techValue, openTechs, isOpen, costOf, techState, ERA_KEYS } from '../src/techtree/index.js';
import { techGrow, migrateTree } from '../src/techtree/grow.js';
import { laterInfo, laterLine, laterState, laterMonth } from '../src/later_era/index.js';
import { inventable, INV_NAME } from '../src/research/state.js';
import { INVENTIONS } from '../src/history/powers.js';
import { ERAS, ERA_AT } from '../src/world.js';
import { heirsOf } from '../src/heir.js';

// 34단계 기술 나무와 뒤 시대 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 41) => newGame({ name: '하랄트', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const done = (g, ...ids) => { for (const id of ids) if (!g.history.inventions.includes(id)) g.history.inventions.push(id); };
const upTo = (g, id) => { const want = new Set(); const add = (x) => { if (want.has(x)) return; want.add(x); TECH[x].needs.forEach(add); }; add(id); done(g, ...TECHS.filter((t) => want.has(t.id)).map((t) => t.id)); };

// 1. 나무 모양: 예순 가지 남짓, 선행 기술이 앞에 있고 눈금이 낮다, 예전 열두 id가 그대로
check(TECHS.length >= 50 && TECHS.length <= 70, `기술 수 ${TECHS.length}`);
check(INVENTIONS === TECHS, 'INVENTIONS는 나무 전체');
for (const id of ['firestone', 'streetlamp', 'warmstone', 'manamill', 'press', 'signal', 'erngrind', 'plow', 'forge', 'healstone', 'ironcart', 'railroad']) check(!!TECH[id], `옛 id ${id}`);
for (const id of ['newspaper', 'factory', 'steamship', 'crystal', 'medicine', 'waterworks', 'airship', 'gun']) check(!!TECH[id], `뒤 시대 id ${id}`);
{ const seen = new Set(); for (const t of TECHS) { for (const n of t.needs) { check(seen.has(n), `${t.id}의 선행 ${n}이 뒤에 있다`); check(TECH[n].at < t.at, `${t.id} 눈금이 선행 ${n}보다 낮다`); } seen.add(t.id); check(t.text && t.look && t.where && t.name, `${t.id} 글`); check(!BAD.test(t.text + t.look), `${t.id} 글: ${t.text}`); } }
check(ERAS.length === 7 && ERA_AT.length === 7 && ERA_AT.every((v, i) => i === 0 || v > ERA_AT[i - 1]), `시대 ${ERAS.length} ${ERA_AT}`);
check(ERA_KEYS.slice(1).every((id) => TECH[id].big), '시대 열쇠는 큰 발명');
check(TECHS.filter((t) => t.big).length <= 8, '큰 발명은 드물다');

// 2. 처음 판: 뿌리만 열려 있고 기술 값은 첫 시대 문턱 밑
let g = mk();
check(g.history.inventions.length === 0, `처음 발명 ${g.history.inventions}`);
check(openTechs(g).every((t) => !t.needs.length), '처음엔 뿌리만 열림');
check(g.realm.tech < ERA_AT[1], `처음 기술 ${g.realm.tech}`);
// 큰 발명이 안 나오면 다음 시대 문턱을 못 넘는다
upTo(g, 'manamill');
check(isDone(g, 'warmstone') || techValue(g) < ERA_AT[1], '온석 화로 없이 시대가 넘어가면 안 된다');
function isDone(g, id) { return g.history.inventions.includes(id); }
{ const h = mk(); upTo(h, 'shaft'); check(!isDone(h, 'warmstone') ? techValue(h) < ERA_AT[1] : true, `열쇠 없이 시대 문턱 ${techValue(h)}`); upTo(h, 'warmstone'); check(techValue(h) >= ERA_AT[1], `온석 뒤 ${techValue(h)}`); }

// 3. 플레이어 연구는 열린 끝만
{ const h = mk(); upTo(h, 'press'); h.realm.tech = techValue(h); const ids = inventable(h); check(ids.length > 0 && ids.every((id) => TECH[id].needs.every((n) => isDone(h, n)) && !isDone(h, id)), `연구 열린 끝 ${ids}`); check(!ids.includes('railroad') && !ids.includes('factory'), '먼 발명은 못 고른다'); check(ids.every((id) => INV_NAME[id]), '연구 이름'); }

// 4. 조건이 속도를 바꾼다: 흉년이면 농사 기술, 전쟁이면 총포, 마석 걱정이면 정련
{
  const h = mk(); upTo(h, 'betterplow');
  const run = (setup, id, months = 120) => { const x = structuredClone(h); setup(x); const T = techState(x); T.prog = {}; for (let i = 0; i < months; i++) { x.date.month = (i % 12) + 1; techGrow(x, makeRng({ s: i }), () => {}, () => {}); if (isDone(x, id)) return i; } return (T.prog[id]?.[0] ?? 0) > 0 ? 9999 - T.prog[id][0] : 99999; };
  const calm = run((x) => { x.world = { ...(x.world ?? {}), famine: false }; x.realm.bread = 1; }, 'rotation');
  const hungry = run((x) => { x.world = { ...(x.world ?? {}), famine: true }; x.realm.bread = 1.8; }, 'rotation');
  check(hungry < calm, `흉년이 돌려짓기를 앞당긴다 ${hungry} < ${calm}`);
}
// 5. 다른 나라에서 건너온다
{ const h = mk(); upTo(h, 'stonecut'); const T = techState(h); T.fprog.compass = costOf(TECH.compass) - 0.5; const said = []; for (let i = 0; i < 3; i++) techGrow(h, makeRng({ s: i }), (t) => said.push(t), () => {}); check(!!T.abroad.compass, '자유도시가 나침반을 먼저'); check(said.some((t) => t.includes('먼저 쓰기 시작했다')), `건너온 소식 ${said}`); check(techInfo(h).abroad.some((x) => x.name === '마석 나침반'), '화면에 남의 나라 기술'); }

// 6. 기술이 나오면 세력이 선다, 마석 고갈 걱정이 마석 값으로
{
  const h = mk(); upTo(h, 'boiler'); upTo(h, 'diagnose'); const T = techState(h); T.prog.medicine = undefined; delete T.prog.medicine;
  upTo(h, 'waterworks'); upTo(h, 'railroad'); upTo(h, 'warmstone');
  T.prog.medicine = [costOf(TECH.medicine) - 0.1, 1.4];
  const S = laterState(h), f0 = S.stance.faith, said = [];
  for (let i = 0; i < 4 && !isDone(h, 'medicine'); i++) techGrow(h, makeRng({ s: i }), (t) => said.push(t), () => {});
  check(isDone(h, 'medicine'), '마도 의술 나옴');
  check(S.stance.faith < f0, `교단이 마도 의술을 꺼린다 ${f0}→${S.stance.faith}`);
  check(S.log.some((x) => x.text.includes('성광교')), '세력 기록');
  // 고갈
  upTo(h, 'factory'); upTo(h, 'steamship'); upTo(h, 'gun');
  const before = h.trade?.mkt?.['harfen:manastone']?.drift ?? 0;
  const news = [];
  for (let i = 0; i < 240; i++) { h.date.month = (i % 12) + 1; if (h.mana) h.mana.tide = -40; laterMonth(h, (t) => news.push(t)); }
  check(S.deplete >= 25, `마석 걱정 ${S.deplete}`);
  check(news.some((t) => t.includes('바닥날')), `고갈 소식 ${news.slice(0, 2)}`);
  check(!h.trade?.mkt || (h.trade.mkt['harfen:manastone']?.drift ?? 0) > before, '마석 시세가 오른다');
  check((S.mul.refinery ?? 1) > 1, '걱정이 정련을 서두르게 한다');
  check(BAD0.test(laterInfo(h).depleteWord) === false && laterInfo(h).sides.length === 4, 'laterInfo');
  stay(h, 'harfen'); S.deplete = 50; check(typeof laterLine(h) === 'string', 'laterLine 마석');
  S.deplete = 0; stay(h, 'ern'); check(laterLine(h) === null, 'laterLine 없음');
}

// 7. 사건
{
  const h = mk(); grown(h, 20); stay(h, 'harfen'); h.player.money = 200;
  const S = laterState(h);
  S.deplete = 40; check(cond(h, 'later_stone_hoard'), '사재기 조건'); fire(h, 'later_stone_hoard', 0); check(S.me.hoard === 30, '사 둠');
  S.deplete = 60; check(cond(h, 'later_stone_hoard_end'), '사재기 끝 조건'); const m0 = h.player.money; fire(h, 'later_stone_hoard_end', 0); check(h.player.money > m0 + 30, '비싸게 판다');
  upTo(h, 'medicine'); S.stance.faith = -30; stay(h, 'leocast');
  if (cond(h, 'later_healer_ban')) { fire(h, 'later_healer_ban', 0); fire(h, 'later_healer_ban', 1); fire(h, 'later_healer_ban', 2); } else check(false, '진단판 조건');
  upTo(h, 'crystal'); S.stance.tower = 30; stay(h, 'portel'); check(cond(h, 'later_crystal_smuggle'), '수정구 조건'); for (let c = 0; c < 3; c++) fire(h, 'later_crystal_smuggle', c, 11 + c);
  upTo(h, 'gun'); h.player.skills.sword = 40; stay(h, 'graubel'); check(cond(h, 'later_gun_sword'), '총과 칼 조건'); fire(h, 'later_gun_sword', 0, 7); fire(h, 'later_gun_sword', 0, 4); fire(h, 'later_gun_sword', 1);
  stay(h, 'graubel'); check(typeof laterLine(h) === 'string', 'laterLine 총포');
  upTo(h, 'floatstone'); stay(h, 'serenia'); check(cond(h, 'later_airship_trial'), '시험 비행 조건'); fire(h, 'later_airship_trial', 0, 2); check(!cond(h, 'later_airship_trial'), '한 번만'); S.me.flew = 0; fire(h, 'later_airship_trial', 1);
  const I = techInfo(h); check(I.done.length === h.history.inventions.length && I.total === TECHS.length, 'techInfo');
  check(I.working.every((w) => !BAD0.test(JSON.stringify(w)) && typeof w.where === 'string' && typeof w.stage === 'string') && I.rumors.every((x) => typeof x === 'string'), 'techInfo 연구 중');
}

// 8. 예전 저장: 기술 눈금이 높던 판은 앞쪽 작은 기술을 이미 나온 것으로
{ const h = mk(); delete h.techtree; h.history.inventions = ['firestone', 'streetlamp', 'warmstone', 'manamill', 'press']; h.realm.tech = 2.0; migrateTree(h); check(h.history.inventions.includes('gear') && h.history.inventions.includes('windmill') && h.history.inventions.indexOf('press') > h.history.inventions.indexOf('gear'), `옛 저장 ${h.history.inventions.slice(0, 8)}`); check(techValue(h) >= 1.3, `옛 저장 기술 ${techValue(h)}`); }

// 9. 저장 왕복과 한 판 흐름: 육십 년이면 작은 기술 여럿, 큰 발명은 한두 가지, 철도는 아직
{
  let h = mk(77); const y0 = h.date.year;
  for (let m = 0; m < 12 * 60; m++) {
    if (h.over) { const hh = heirsOf(h)[0]; if (!hh) break; becomeHeir(h, rngOf(h), hh); if (h.over) break; }
    const acts = availableActions(h);
    endMonth(h, Array.from({ length: slotsFor(h) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
    let k = 0; while (h.pendingEvent && k++ < 6) resolveEvent(h, rngOf(h), h.pendingEvent.choices.length - 1);
    const line = techLine(h); if (line) check(!BAD.test(line), `techLine ${line}`);
    const ll = laterLine(h); if (ll) check(!BAD.test(ll), `laterLine ${ll}`);
  }
  const n = h.history.inventions.length, big = h.history.inventions.filter((id) => TECH[id].big).length;
  check(n >= 8 && n <= 34, `육십 년 발명 수 ${n}`);
  check(big >= 1 && big <= 3, `육십 년 큰 발명 ${big}`);
  check(!isDone(h, 'railroad') && h.realm.era <= 2, `육십 년에 철도는 아직 (${h.realm.era})`);
  check(Object.keys(techState(h).when).length === n, '나온 해 기록');
  const back = decodeSave(encodeSave(h));
  check(JSON.stringify(back.techtree) === JSON.stringify(h.techtree) && JSON.stringify(back.later) === JSON.stringify(h.later), '저장 왕복');
  console.log(`  육십 년: 발명 ${n} (큰 것 ${big}), 기술 ${h.realm.tech.toFixed(2)}, 시대 ${ERAS[h.realm.era].name}`);
}

console.log(`techtest ${fail ? 'FAIL ' + fail : 'ok'} (${((Date.now() - T0) / 1000).toFixed(1)}s)`);
process.exit(fail ? 1 : 0);
