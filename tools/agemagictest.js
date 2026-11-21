import './lsshim.js';
import '../src/content.js';
// 마법 쪽 불로 네 길 점검 (1분 안): 일곱째 서클(조건·조각·노아의 시험 통과와 실패·한 삶에 한 번), 봉인의 숨(실마리·마시기·해마다 깎이는 봉인·쫓김·새로 묶이면 끊김),
// 그릇 옮기기(뜻 있는 형편·옮겨 감·몸 주인의 행방·식구·기억·삭는 그릇), 마지막 새김(새기기·대 잇기에 내가 이어짐·다른 아이가 이으면 흐려짐·식구가 알아챔), 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId, bodyAgeOf, ageYears } from '../src/npc.js';
import { becomeHeir } from '../src/heir.js';
import { AG, isAgeless, agelessInfo, pathState } from '../src/ageless/core.js';
import { seventhReady, seventhInfo, birthYear } from '../src/ageless/seventh.js';
import { sealbreathInfo } from '../src/ageless/sealbreath.js';
import { vesselInfo } from '../src/ageless/vessel.js';
import { imprintInfo, IM } from '../src/ageless/imprint.js';
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
  check(typeof out === 'string' && !BAD.test(out), `${kind}/${key} 결과: ${out}`);
  return out;
};
const adult = (seed, age = 30, place = 'serenia') => {
  const g = newGame({ name: '멈춤', sex: 'm', familyId: 'farmer', mode: 'free', seed });
  grown(g, age); stay(g, place);
  for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 50;
  g.player.money = 2000; g.player.injuries = []; L(g).pendingDeath = null; L(g).queue = [];
  return g;
};
const mage = (g, mana = 400, skill = 85) => { g.player.manaAwakened = true; g.player.manaPotential = 0.9; g.player.mana = mana; g.player.skills.magic = skill; };
const months = (g, n) => { const rng = makeRng({ s: 77 }); for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; for (const p of g.people) if (p.alive) p.ageMonths += 1; runHooks('afterMonth', g, rng); } };

/* 1. 일곱째 서클 */
{
  const g = adult(2711);
  mage(g);
  check(circleOf(g) === 6, `6서클 ${circleOf(g)}`);
  g.mana.years[birthYear(g)] = 0;
  check(!seventhReady(g) && !cond(g, 'seventh_call'), '옅은 해에 태어나면 시험이 오지 않음');
  g.mana.years[birthYear(g)] = 40;
  check(seventhReady(g) && cond(g, 'seventh_call'), '짙은 해 + 6서클이면 시험이 옴');
  g.player.skills.magic = 70;
  check(!seventhReady(g), '5서클이면 오지 않음');
  g.player.skills.magic = 85;
  // 조각
  check(cond(g, 'seventh_clue'), '마탑 서고 조각');
  fire(g, 'seventh_clue', 1);
  check(seventhInfo(g).clues.length === 1, '조각 하나');
  // 약한 사람: 첫 고비에서 떨어짐
  g.player.stats.wil = 30;
  fire(g, 'seventh_call', 1);
  check(queued(g, 'seventh_trial'), '시험 장면');
  scene(g, 'seventh_trial', 'hold');
  check(pathState(g, 'seventh').failed && !isAgeless(me(g)) && !seventhReady(g), '실패하면 그 삶에서 끝');
  check(g.player.mana < 400, '실패하면 마력을 잃음');
  // 강한 사람: 세 고비를 넘는다
  const h = adult(2712);
  mage(h, 1000, 100);
  for (const k of ['wil', 'int']) h.player.stats[k] = 100;
  h.mana.years[birthYear(h)] = 60;
  fire(h, 'seventh_call', 1);
  scene(h, 'seventh_trial', 'hold');
  check(queued(h, 'seventh_trial') && pathState(h, 'seventh').stage === 2, `둘째 고비 ${pathState(h, 'seventh').stage}`);
  scene(h, 'seventh_trial', 'draw');
  check(pathState(h, 'seventh').stage === 3, '셋째 고비');
  scene(h, 'seventh_trial', 'let');
  check(isAgeless(me(h)) && AG(h).path === 'seventh' && circleOf(h) >= 7, `일곱째 서클 ${circleOf(h)}`);
  const at = me(h).agelessAt; months(h, 24);
  check(bodyAgeOf(me(h)) === at, '몸이 멈춤');
  check(agelessInfo(h)?.pathName === '일곱째 서클', '화면 정보');
  // 셋째 고비에서 놓지 못하면
  const k = adult(2713); mage(k, 1000, 100); k.player.stats.wil = 100; k.player.stats.int = 100; k.mana.years[birthYear(k)] = 60;
  fire(k, 'seventh_call', 1); scene(k, 'seventh_trial', 'hold'); scene(k, 'seventh_trial', 'draw'); scene(k, 'seventh_trial', 'keep');
  check(!isAgeless(me(k)) && !seventhReady(k), '놓지 못하면 끝');
}

/* 2. 봉인의 숨 */
{
  const g = adult(2721, 30, 'leocast');
  g.realm.seal = 95;
  check(!cond(g, 'sealbreath_rumor'), '봉인이 고요하면 실마리 없음');
  g.realm.seal = 70;
  check(cond(g, 'sealbreath_rumor'), '봉인이 흔들리면 쐐기 고장에서 실마리');
  check(!has(g, 'sealbreath_seek'), '소문 전에는 행동 없음');
  fire(g, 'sealbreath_rumor', 1);
  check(sealbreathInfo(g).heard && has(g, 'sealbreath_seek'), '소문 뒤 행동');
  stay(g, 'solaris');
  check(!has(g, 'sealbreath_seek'), '다른 쐐기 고장에서는 없음');
  stay(g, 'leocast');
  g.player.stats.agi = 100; g.player.stats.sen = 100;
  act(g, 'sealbreath_seek');
  const s0 = g.realm.seal;
  scene(g, 'sealbreath_draw', 'draw');
  check(isAgeless(me(g)) && AG(g).path === 'sealbreath' && g.realm.seal < s0, '숨을 마심');
  const s1 = g.realm.seal; months(g, 12);
  check(g.realm.seal < s1 - 0.5, `한 해에 봉인이 깎임 ${s1} → ${g.realm.seal}`);
  AG(g).since -= 48;
  queueScene(g, 'sealbreath_hunt', {});
  scene(g, 'sealbreath_hunt', 'deny', 1);
  if (isAgeless(me(g))) { queueScene(g, 'sealbreath_hunt', {}); scene(g, 'sealbreath_hunt', 'yield'); }
  check(!isAgeless(me(g)) && agelessInfo(g).lost.length === 1, '내려놓음');
  // 봉인이 새로 묶이면 끊긴다
  const h = adult(2722, 30, 'leocast'); h.realm.seal = 60; h.player.stats.agi = 100; h.player.stats.sen = 100;
  pathState(h, 'sealbreath').heard = true; pathState(h, 'sealbreath').wedge = 'leocast';
  act(h, 'sealbreath_seek'); scene(h, 'sealbreath_draw', 'draw');
  check(isAgeless(me(h)), '두 번째 사람도 마심');
  h.seal.ending = 'resealed'; months(h, 1);
  check(!isAgeless(me(h)), '봉인이 새로 묶이면 끊김');
}

/* 3. 그릇 옮기기 */
{
  const g = adult(2731, 46, 'ern');
  mage(g, 200, 60);
  const dad = makePerson(makeRng({ s: 3 }), { ageMonths: 50 * 12, sex: 'm' });
  const body = makePerson(makeRng({ s: 4 }), { ageMonths: 22 * 12, fatherId: dad.id });
  g.people.push(dad, body); dad.childIds.push(body.id);
  check(!has(g, 'vessel_rite'), '죽은 자의 술이 얕으면 없음');
  g.tower.forbidden.necro = 2;
  check(has(g, 'vessel_rite'), '죽은 자의 술 2 + 마흔 넘음');
  g.player.skills.magic = 100;
  act(g, 'vessel_rite');
  L(g).queue.find((x) => x.kind === 'vessel_rite').ids = [body.id];
  scene(g, 'vessel_rite', `take:${body.id}`);
  check(isAgeless(me(g)) && AG(g).path === 'vessel' && bodyAgeOf(me(g)) === 22, `옮겨 감 ${bodyAgeOf(me(g))}`);
  check(!body.alive && body.deathCause === '행방불명', '몸의 주인은 사라짐');
  check(!has(g, 'vessel_rite'), '그릇이 새것이면 다시 옮기지 않음');
  check(cond(g, 'vessel_kin'), '그 몸의 식구가 알아봄');
  fire(g, 'vessel_kin', 1);
  check(!cond(g, 'vessel_kin'), '한 번 만난 식구는 다시 안 옴');
  fire(g, 'vessel_memory', 1);
  months(g, 12);
  check(vesselInfo(g).rot > 0, '그릇이 삭음');
  pathState(g, 'vessel').rot = 1; months(g, 1);
  check(queued(g, 'vessel_rot'), '다 삭으면 장면');
  scene(g, 'vessel_rot', 'let');
  check(!isAgeless(me(g)) && bodyAgeOf(me(g)) >= 46, `내려놓으면 세월이 옴 ${bodyAgeOf(me(g))}`);
}

/* 4. 마지막 새김 */
{
  const g = adult(2741, 44, 'ern');
  mage(g, 300, 90);
  for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 80;
  const kid = makePerson(makeRng({ s: 11 }), { ageMonths: 12 * 12, lastName: g.player.lastName, fatherId: me(g).id });
  const kid2 = makePerson(makeRng({ s: 12 }), { ageMonths: 10 * 12, lastName: g.player.lastName, fatherId: me(g).id });
  g.people.push(kid, kid2); me(g).childIds.push(kid.id, kid2.id); g.player.familyIds.push(kid.id, kid2.id); kid.known = kid2.known = true;
  check(!has(g, 'imprint_rite'), '정신의 술이 얕으면 없음');
  g.tower.forbidden.mind = 2;
  check(has(g, 'imprint_rite'), '정신의 술 2 + 자식');
  g.player.skills.magic = 100;
  act(g, 'imprint_rite');
  scene(g, 'imprint_rite', `kid:${kid.id}`);
  check(IM(g).target === kid.id && kid.imprinted, '새김');
  months(g, 1);
  const old = { str: g.player.stats.str, magic: g.player.skills.magic };
  (L(g).ancestors ??= []).push({ name: g.player.name, lastName: g.player.lastName, born: g.date.year - 44, died: g.date.year });
  becomeHeir(g, makeRng({ s: 5 }), kid);
  check(me(g).id === kid.id, '새긴 아이가 이음');
  check(g.player.stats.str >= old.str * 0.89 && g.player.skills.magic >= old.magic * 0.9, `내가 이어짐 ${g.player.stats.str} ${g.player.skills.magic}`);
  check(g.tower.forbidden.mind === 2, `정신의 술이 남음 ${g.tower.forbidden.mind}`);
  check(imprintInfo(g).chain.length === 1 && !IM(g).target, '이어진 기록');
  check(queued(g, 'imprint_wake'), '눈을 뜨는 장면');
  scene(g, 'imprint_wake', 'mask');
  const mom = makePerson(makeRng({ s: 13 }), { ageMonths: 40 * 12, sex: 'f' }); g.people.push(mom); g.player.familyIds.push(mom.id);
  stay(g, 'ern'); grown(g, 0);
  check(cond(g, 'imprint_kin'), '식구가 알아챔');
  fire(g, 'imprint_kin', 1);
  // 다른 아이가 이으면 흐려짐
  const h = adult(2742, 44, 'ern'); mage(h, 300, 100); h.tower.forbidden.mind = 3;
  const a = makePerson(makeRng({ s: 21 }), { ageMonths: 16 * 12, lastName: h.player.lastName }), b = makePerson(makeRng({ s: 22 }), { ageMonths: 18 * 12, lastName: h.player.lastName });
  h.people.push(a, b); me(h).childIds.push(a.id, b.id); h.player.familyIds.push(a.id, b.id);
  for (const k of Object.keys(h.player.stats)) h.player.stats[k] = 80;
  act(h, 'imprint_rite'); scene(h, 'imprint_rite', `kid:${a.id}`);
  (L(h).ancestors ??= []).push({ name: h.player.name, lastName: h.player.lastName, born: h.date.year - 44, died: h.date.year });
  becomeHeir(h, makeRng({ s: 6 }), b);
  check(!IM(h).target && IM(h).chain.length === 0 && !a.imprinted, '다른 아이가 이으면 흐려짐');
}

/* 5. 저장 왕복 */
{
  const g = adult(2751, 46, 'ern'); mage(g, 200, 100); g.tower.forbidden.necro = 2;
  const body = makePerson(makeRng({ s: 4 }), { ageMonths: 20 * 12 }); g.people.push(body);
  act(g, 'vessel_rite'); L(g).queue.find((x) => x.kind === 'vessel_rite').ids = [body.id]; scene(g, 'vessel_rite', `take:${body.id}`);
  const back = decodeSave(encodeSave(g)); runHooks('migrate', back, makeRng({ s: 1 }));
  check(isAgeless(me(back)) && AG(back).path === 'vessel' && vesselInfo(back).bodies.length === 1, '저장 왕복');
}

/* 6. 짧은 플레이: 글이 새지 않는다 */
{
  let shown = 0;
  for (const seed of [27801, 27802]) {
    const g = newGame({ name: '흐름', sex: seed % 2 ? 'm' : 'f', familyId: seed % 2 ? 'merchant' : 'fallen_knight', mode: 'free', seed });
    for (let m = 0; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g), acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let guard = 0;
      while (g.pendingEvent && guard++ < 6) {
        const pe = g.pendingEvent;
        if (/^(seventh|sealbreath|vessel|imprint)/.test(L(g).scene?.kind ?? pe.id ?? '')) shown++;
        check(!BAD0.test(pe.text ?? '') && !pe.choices.some((c) => BAD0.test(c)), `글 ${pe.title}: ${pe.text}`);
        resolveEvent(g, rng, rng.int(0, pe.choices.length - 1));
      }
      if (L(g).heirPending) break;
    }
  }
  console.log(`짧은 플레이에서 뜬 불로 장면 ${shown}개`);
}

const sec = Math.round((Date.now() - T0) / 1000);
check(sec < 60, `1분 넘음 ${sec}초`);
console.log(fail ? `마법 불로 점검 실패 ${fail}` : `OK (${sec}초)`);
process.exit(fail ? 1 : 0);
