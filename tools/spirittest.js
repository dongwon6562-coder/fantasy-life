import './lsshim.js';
import '../src/content.js';
// 정령과 계약 점검 (1분 안): 눈 뜨기(마력이 적을수록 맑음), 보는 법 배우기(엘프·드워프 고장에서만), 계약(정령의 자리 앞 고장에서만), 힘과 선물,
// 조건 어김(불·바람·땅·물), 변덕, 계약 깨기와 남는 것, 교단·마탑, 세상 쪽 정령의 기분과 깨어남, 대 잇기, 저장 왕복, 짧은 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT, queueScene } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { makePerson, byId, bodyAgeOf, ageYears } from '../src/npc.js';
import { becomeHeir } from '../src/heir.js';
import { playerPower } from '../src/adventure/combat.js';
import { spiritState as SP, spiritInfo, spiritLine, spiritMonth, breakPact, bornSight, SPIRIT_IDS } from '../src/spirit/index.js';
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

const trySeeds = (fn, ok, n = 8) => { for (let s = 1; s <= n; s++) { fn(s); if (ok()) return true; } return false; };
const pactWith = (g, id) => { SP(g).pact = { id, since: g.date.year * 12 + g.date.month, favor: 60, breaches: 0, lastPlace: L(g).place, placeSince: g.date.year * 12 + g.date.month, owed: 0 }; };

/* 1. 눈을 뜬다 */
{
  const g = adult(2801, 25, 'silverleaf');
  g.player.manaPotential = 0.1; g.player.race = 'human';
  check(bornSight(g) === 1, '마력이 적으면 맑은 눈');
  check(cond(g, 'spirit_glimpse'), '정령의 자리 앞 고장에서 엿봄');
  stay(g, 'ern');
  check(!cond(g, 'spirit_glimpse'), '아무 데서나 엿보지 않음');
  stay(g, 'silverleaf');
  fire(g, 'spirit_glimpse', 1);
  check(SP(g).sight === 1, `눈을 뜸 ${SP(g).sight}`);
  check(!cond(g, 'spirit_glimpse'), '한 번 뜨면 다시 안 옴');
  const h = adult(2802, 25, 'hammer');
  h.player.manaPotential = 0.9; h.player.race = 'human';
  check(bornSight(h) === 0, '마력이 많은 사람은 타고난 눈이 없음');
  h.player.stats.wil = 5; h.player.stats.sen = 5;
  let seen = 0;
  for (let s = 1; s <= 10; s++) { SP(h).sight = 0; fire(h, 'spirit_glimpse', 1, s); seen += SP(h).sight; }
  check(seen <= 3, `흐린 눈은 거의 못 봄 ${seen}/10`);
}

/* 2. 보는 법을 배운다 */
{
  const g = adult(2811, 25, 'ern');
  SP(g).sight = 1;
  check(!has(g, 'spirit_learn'), '엘프·드워프 고장이 아니면 없음');
  stay(g, 'silverleaf');
  check(has(g, 'spirit_learn'), '은잎 마을에서 청함');
  g.player.stats.wil = 100; g.player.stats.sen = 100;
  const ok = trySeeds((s) => { SP(g).sight = 1; L(g).queue = []; act(g, 'spirit_learn'); scene(g, 'spirit_learn', 'sing', s); }, () => SP(g).sight === 2);
  check(ok, '노래로 배움');
  check(!has(g, 'spirit_learn'), '배운 뒤에는 없음');
  const h = adult(2812, 25, 'hammer'); SP(h).sight = 1; h.player.stats.wil = 100; h.player.stats.sen = 100;
  act(h, 'spirit_learn'); scene(h, 'spirit_learn', 'sit');
  check(h.player.money <= 1960, '드워프는 은화 마흔 닢');
}

/* 3. 계약을 맺는다 */
{
  const g = adult(2821, 30, 'ern');
  SP(g).sight = 2;
  check(!has(g, 'spirit_seek'), '정령의 자리 앞이 아니면 없음');
  stay(g, 'hammer');
  check(has(g, 'spirit_seek'), '쇠망치 골에서 불의 정령에게');
  g.player.stats.wil = 100; g.player.manaPotential = 0.1;
  const p0 = playerPower(g);
  const ok = trySeeds((s) => { L(g).queue = []; act(g, 'spirit_seek'); scene(g, 'spirit_meet', 'pact', s); }, () => !!SP(g).pact);
  check(ok && SP(g).pact?.id === 'sp_fire', '불의 정령과 계약');
  check(playerPower(g) >= p0 + 14, `힘 ${p0} → ${playerPower(g)}`);
  check(!has(g, 'spirit_seek'), '계약 중에는 다른 계약 없음');
  check(/불의 정령/.test(spiritLine(g) ?? ''), `머리글 ${spiritLine(g)}`);
  const info = spiritInfo(g);
  check(info.pact?.kind === '불' && info.known.length === 4 && !BAD.test(JSON.stringify(info, (k, v) => (v === null ? 0 : v))), `화면 정보 ${JSON.stringify(info).slice(0, 200)}`);
  // 약한 사람은 거절당하고 다친다
  const h = adult(2822, 30, 'gorge'); SP(h).sight = 2; h.player.stats.wil = 5; h.player.manaPotential = 0.9;
  act(h, 'spirit_seek'); scene(h, 'spirit_meet', 'pact', 1);
  check(!SP(h).pact && h.player.injuries.length > 0, '거절당하고 다침');
}

/* 4. 조건과 선물, 깨짐 */
{
  // 불: 은화가 없으면 어김
  const g = adult(2831, 30, 'ern'); pactWith(g, 'sp_fire');
  g.player.money = 0; g.player.familyMoney = 0;
  months(g, 1);
  check(SP(g).pact?.breaches >= 1 || !SP(g).pact, '불에 먹일 은화가 없으면 어김');
  months(g, 4);
  check(!SP(g).pact && SP(g).curse?.id === 'sp_fire', '거듭 어기면 깨지고 남는 것');
  check(/남긴 것/.test(spiritLine(g) ?? ''), `깨진 뒤 머리글 ${spiritLine(g)}`);
  // 바람: 두 해 머물면 어김
  const w = adult(2832, 30, 'ern'); pactWith(w, 'sp_wind'); w.player.money = 2000;
  months(w, 25);
  check(SP(w).pact && SP(w).pact.breaches >= 1, '바람: 한 고장 두 해');
  // 땅: 바다에 나가면 어김
  const e = adult(2833, 30, 'saltmare'); pactWith(e, 'sp_earth'); e.player.money = 2000;
  months(e, 1);
  check(SP(e).pact?.breaches === 1, '땅: 바다');
  // 물: 상처가 아물고, 가을에 공물
  const m = adult(2834, 30, 'ern'); pactWith(m, 'sp_water'); m.player.money = 2000;
  m.date.month = 8; m.player.injuries = [{ name: '시험 상처', months: 30 }];
  months(m, 1);
  check(m.player.injuries.length === 0, '물: 상처가 아묾');
  months(m, 1);
  check(queued(m, 'spirit_tithe'), '물: 가을 공물 장면');
  const f0 = SP(m).pact.favor;
  scene(m, 'spirit_tithe', 'memory');
  check(SP(m).pact.favor > f0, '기억을 내주면 은혜');
  queueScene(m, 'spirit_tithe', {}); scene(m, 'spirit_tithe', 'skip');
  check(SP(m).pact.breaches === 1, '가지 않으면 어김');
  // 변덕
  queueScene(m, 'spirit_whim', { id: 'sp_water' }); scene(m, 'spirit_whim', 'refuse');
  queueScene(m, 'spirit_whim', { id: 'sp_water' }); scene(m, 'spirit_whim', 'obey');
  queueScene(m, 'spirit_whim', { id: 'sp_water' }); scene(m, 'spirit_whim', 'cut');
  check(!SP(m).pact && SP(m).curse?.id === 'sp_water', '스스로 끊으면 남는 것');
  check(!has(m, 'spirit_seek'), '깨진 정령에게 다시 못 감');
  // 남은 것은 끝이 있다
  SP(m).curse.until = m.date.year * 12 + m.date.month + 1; months(m, 2);
  check(!SP(m).curse, '남은 것이 떠남');
}

/* 5. 교단과 마탑 */
{
  const g = adult(2841, 30, 'solaris'); pactWith(g, 'sp_earth');
  check(cond(g, 'spirit_church'), '교단이 묻는다');
  fire(g, 'spirit_church', 1);
  check(!SP(g).pact && SP(g).curse, '교단 앞에서 끊음');
  const h = adult(2842, 30, 'serenia'); pactWith(h, 'sp_wind'); const m0 = h.player.money;
  check(cond(h, 'spirit_tower'), '마탑이 재고 싶어 함');
  fire(h, 'spirit_tower', 1);
  check(h.player.money === m0 + 100 && SP(h).pact.favor < 60, '재게 해 주면 은혜가 줆');
  stay(h, 'ern'); check(!cond(h, 'spirit_tower'), '세레니아가 아니면 없음');
}

/* 6. 세상 쪽: 기분과 깨어남 (플레이어 없이) */
{
  const g = adult(2851, 30, 'gorge');
  for (const id of SPIRIT_IDS) SP(g).spirits[id].mood = -90;
  let woke = 0;
  for (let i = 0; i < 120; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; woke += spiritMonth(g).length; for (const id of SPIRIT_IDS) if (SP(g).spirits[id].mood > -60) SP(g).spirits[id].mood = -90; }
  check(woke >= 2 && woke <= 8, `깨어남 ${woke}`);
  const q = adult(2852, 30, 'ern'); let w2 = 0;
  for (let i = 0; i < 12 * 60; i++) { q.date.month = (q.date.month % 12) + 1; if (q.date.month === 1) q.date.year += 1; q.rngState.s = (q.rngState.s * 1103515245 + 12345) | 0; w2 += spiritMonth(q).length; }
  console.log(`60년 무플레이 깨어남 ${w2}번, 세상 쪽 계약 ${SPIRIT_IDS.map((id) => SP(q).spirits[id].pacts).join('/')}`);
  check(w2 <= 10, `무플레이 깨어남이 잦음 ${w2}`);
}

/* 7. 대 잇기, 저장 왕복 */
{
  const g = adult(2861, 40, 'ern'); g.player.manaPotential = 0.9; g.player.race = 'human';
  SP(g).sight = 2; pactWith(g, 'sp_fire'); SP(g).me.pacts = 1;
  const back = decodeSave(encodeSave(g)); runHooks('migrate', back, makeRng({ s: 1 }));
  check(SP(back).pact?.id === 'sp_fire' && SP(back).sight === 2, '저장 왕복');
  breakPact(g, '시험');
  const kid = makePerson(makeRng({ s: 11 }), { ageMonths: 18 * 12, lastName: g.player.lastName });
  g.people.push(kid); me(g).childIds.push(kid.id); g.player.familyIds.push(kid.id); kid.known = true;
  (L(g).ancestors ??= []).push({ name: g.player.name, lastName: g.player.lastName, born: g.date.year - 40, died: g.date.year });
  becomeHeir(g, makeRng({ s: 5 }), kid);
  check(me(g).id === kid.id, '대를 이음');
  check(!SP(g).pact && SP(g).sight >= 1 && SP(g).curse && !SP(g).curse.heavy, `대 잇기: 눈은 핏줄에, 남은 것은 약하게 ${JSON.stringify(SP(g).curse)}`);
}

/* 8. 짧은 플레이 */
{
  let shown = 0;
  for (const seed of [28801, 28802]) {
    const g = newGame({ name: '바람', sex: seed % 2 ? 'm' : 'f', familyId: seed % 2 ? 'merchant' : 'farmer', mode: 'free', seed });
    for (let m = 0; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g), acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let guard = 0;
      while (g.pendingEvent && guard++ < 6) {
        const pe = g.pendingEvent;
        if (/^spirit/.test(L(g).scene?.kind ?? pe.id ?? '')) { shown++; check(!BAD.test(pe.text ?? '') && !pe.choices.some((c) => BAD.test(c)), `글 ${pe.title}: ${pe.text}`); }
        check(!BAD0.test(pe.text ?? ''), `글 ${pe.title}: ${pe.text}`);
        resolveEvent(g, rng, rng.int(0, pe.choices.length - 1));
      }
      if (L(g).heirPending) break;
    }
  }
  console.log(`짧은 플레이에서 뜬 정령 장면 ${shown}개`);
}

const sec = Math.round((Date.now() - T0) / 1000);
check(sec < 60, `1분 넘음 ${sec}초`);
console.log(fail ? `정령 점검 실패 ${fail}` : `OK (${sec}초)`);
process.exit(fail ? 1 : 0);
