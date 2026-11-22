import './lsshim.js';
import '../src/content.js';
// 고대 유적과 잃어버린 마법 점검 (1분 안): 소문·서고의 학자, 유적 세 칸(살피기·뜯기·읽기), 조각과 도굴, 고대어 읽기, 술식 되살리기(서클 문턱),
// 집안 마도서와 대 잇기, 도굴꾼·학자·마탑·교단, 뒤척임·깨어남·싸움·다시 묶기, 싸움 힘, 달마다 세상 흐름, 소문과 잇기, 저장 왕복, 짧은 플레이.
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
import { RUINS, RUIN_IDS, ARTS, ruinsInfo, ruinsLine, ruinsMonth, learn, restorable } from '../src/ruins/index.js';
import { RU } from '../src/ruins/state.js';
import { rumorState, addFact } from '../src/rumor/index.js';
import { take, diff } from '../src/rumor/facts.js';
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
const mage = (g, circle) => { const M = [0, 15, 40, 80, 140], S = [0, 15, 30, 45, 60]; g.player.manaAwakened = true; g.player.manaPotential = 0.9; g.player.mana = M[circle] + 1; g.player.skills.magic = S[circle] + 1; };
const months = (g, n) => { const rng = makeRng({ s: 77 }); for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; for (const p of g.people) if (p.alive) p.ageMonths += 1; runHooks('afterMonth', g, rng); } };

/* 1. 소문과 서고의 학자 */
{
  const g = adult(3101, 25, 'estella');
  check(!has(g, 'ruin_dig'), '소문 듣기 전엔 들어가지 않음');
  check(cond(g, 'ruin_rumor'), '유적 앞 고장에서 소문');
  stay(g, 'ern'); check(!cond(g, 'ruin_rumor'), '아무 데서나 소문 없음'); stay(g, 'estella');
  fire(g, 'ruin_rumor', 1);
  check(RU(g).sites.starroom.known === 1 && has(g, 'ruin_dig'), '소문을 들으면 들어갈 수 있음');
  check(!cond(g, 'ruin_rumor'), '한 번 들은 소문은 다시 안 뜸');
  stay(g, 'leocast');
  check(cond(g, 'ruin_hearsay'), '서고에서 학자');
  fire(g, 'ruin_hearsay', 1);
  check(RUIN_IDS.filter((id) => RU(g).sites[id].known >= 1).length === 2, '학자에게서 유적 하나 더');
  check(!has(g, 'ruin_dig'), '유적 없는 고장에선 들어가기 없음');
}

/* 2. 유적 세 칸, 조각, 고대어 */
{
  const g = adult(3111, 28, 'silverleaf');
  RU(g).sites.stonegate.known = 1;
  g.player.stats.sen = 95; g.player.stats.int = 95; g.player.stats.str = 95; g.player.stats.agi = 95;
  let rooms = 0;
  for (let i = 0; i < 12 && RU(g).sites.stonegate.depth < 3; i++) {
    act(g, 'ruin_dig'); check(queued(g, 'ruin_room'), '들어가면 장면');
    scene(g, 'ruin_room', i === 1 ? 'force' : 'careful', 40 + i); g.player.injuries = []; g.player.fatigue = 0; rooms++;
  }
  const x = RU(g).sites.stonegate;
  check(x.depth === 3 && x.known === 2, `세 칸 다 들어감 ${x.depth}`);
  check(!has(g, 'ruin_dig'), '끝까지 들어간 유적은 더 없음');
  check(RU(g).pieces.stonegate >= 2, `조각 ${RU(g).pieces.stonegate}`);
  check(x.looted >= 10, '뜯으면 털린 정도가 오름');
  // 읽기: 서고에서만 (돌의 목소리 없으면)
  check(!has(g, 'ruin_read'), '서고 없는 데선 못 읽음');
  stay(g, 'leocast');
  check(has(g, 'ruin_read'), '서고에선 읽음');
  const t0 = RU(g).tongue; act(g, 'ruin_read');
  check(RU(g).tongue > t0 && RU(g).read === 1, '읽으면 고대어가 늚');
  for (let i = 0; i < 8 && has(g, 'ruin_read'); i++) act(g, 'ruin_read', 10 + i);
  check(!has(g, 'ruin_read'), '다 읽은 조각은 다시 안 읽음');
  // 그 자리에서 읽기 (고대어 25 넘으면)
  const g2 = adult(3112, 28, 'estella'); RU(g2).sites.starroom.known = 1; RU(g2).tongue = 30;
  act(g2, 'ruin_dig'); const t1 = RU(g2).tongue; scene(g2, 'ruin_room', 'read');
  check(RU(g2).tongue > t1 && RU(g2).sites.starroom.depth === 0, '벽 앞에서 읽으면 고대어만 늚');
}

/* 3. 되살리기: 서클 문턱, 마도서 */
{
  const g = adult(3121, 30, 'leocast');
  RU(g).pieces = { stonegate: 3 }; RU(g).readBy = { stonegate: 3 }; RU(g).tongue = 32;
  check(restorable(g).length === 0 && !has(g, 'ruin_restore'), '서클이 없으면 되살리지 못함');
  check(ruinsInfo(g).blocked.length === 2, '읽었지만 막힌 술식 둘');
  mage(g, 1);
  check(restorable(g).includes('stone_voice') && has(g, 'ruin_restore'), '1서클이면 돌의 목소리');
  stay(g, 'ern'); check(!has(g, 'ruin_restore'), '서고 밖에선 되살리기 없음'); stay(g, 'leocast');
  g.player.stats.int = 99; g.player.skills.magic = 99; g.player.mana = 20; // 1서클 유지 (마력이 모자람)
  for (let i = 0; i < 20 && !RU(g).known.includes('stone_voice'); i++) { act(g, 'ruin_restore', 60 + i); g.player.injuries = []; }
  check(RU(g).known.includes('stone_voice'), '돌의 목소리 되살림');
  check(RU(g).book?.entries[0]?.name === '멈춤의 돌의 목소리', `마도서 장 이름 ${RU(g).book?.entries[0]?.name}`);
  check(!RU(g).known.includes('star_ward'), '술식은 서클을 올려 주지 않음');
  check(circleOf(g) === 1, '서클 그대로');
  // 돌의 목소리면 서고 없이도 읽음
  RU(g).pieces.starroom = 1; stay(g, 'ern'); check(has(g, 'ruin_read'), '돌의 목소리로 서고 없이 읽음');
  // 싸움 힘
  const p0 = playerPower(g); learn(g, 'tide_call'); mage(g, 3);
  check(playerPower(g) > p0, '서클이 닿는 술식은 싸움에 보탬');
  // 대 잇기: 술식·고대어는 사라지고 마도서·조각은 남음
  const kid = makePerson(makeRng({ s: 11 }), { ageMonths: 18 * 12, lastName: g.player.lastName });
  g.people.push(kid); me(g).childIds.push(kid.id); g.player.familyIds.push(kid.id); kid.known = true;
  (L(g).ancestors ??= []).push({ name: g.player.name, lastName: g.player.lastName, born: g.date.year - 40, died: g.date.year });
  const pieces = RU(g).pieces.stonegate;
  becomeHeir(g, makeRng({ s: 5 }), kid);
  check(me(g).id === kid.id, '대를 이음');
  check(RU(g).known.length === 0 && RU(g).book.entries.length >= 1 && RU(g).pieces.stonegate === pieces, '마도서와 조각은 남음');
  check(RU(g).tongue < 32, '고대어는 사람 몫');
  grown(g, 6); stay(g, 'ern'); g.player.injuries = []; L(g).queue = []; g.player.manaAwakened = false;
  check(!has(g, 'ruin_book'), '서클 없으면 마도서도 못 씀');
  mage(g, 1); for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 90;
  check(has(g, 'ruin_book'), '마도서를 펼칠 수 있음');
  const n0 = RU(g).book.entries.length;
  for (let i = 0; i < 10 && has(g, 'ruin_book'); i++) act(g, 'ruin_book', 80 + i);
  check(RU(g).known.includes('stone_voice'), '마도서에서 익힘');
  check(RU(g).book.entries.length === n0, '다시 익힌 건 마도서에 또 적지 않음');
}

/* 4. 도굴꾼·학자·마탑·교단 */
{
  const g = adult(3131, 30, 'estella');
  const x = RU(g).sites.starroom; x.known = 1; x.looted = 40; RU(g).pieces.starroom = 2;
  check(cond(g, 'ruin_robbers'), '털린 유적 앞 도굴꾼');
  const m0 = g.player.money; fire(g, 'ruin_robbers', 0);
  check(RU(g).pieces.starroom === 1 && g.player.money > m0, '조각을 팔면 돈');
  fire(g, 'ruin_robbers', 1, 4); check(x.looted >= 55, '같이 들어가면 더 털림');
  fire(g, 'ruin_robbers', 2); check(RU(g).me.reported === 1, '일러바침');
  fire(g, 'ruin_robbers', 3);
  stay(g, 'leocast'); RU(g).read = 2;
  check(cond(g, 'ruin_scholar'), '서고의 학자');
  const t0 = RU(g).tongue; fire(g, 'ruin_scholar', 0); check(RU(g).tongue >= t0 + 10, '같이 읽으면 고대어');
  fire(g, 'ruin_scholar', 1); fire(g, 'ruin_scholar', 2);
  learn(g, 'star_ward');
  check(cond(g, 'ruin_tower'), '마탑 사자');
  fire(g, 'ruin_tower', 1); check(RU(g).foe.tower === 1, '거절하면 마탑이 노림');
  fire(g, 'ruin_tower', 0); check(RU(g).sites.sunkstair.claim === 'tower' && RU(g).foe.tower === 0, '내주면 마탑이 계단을 거둠');
  fire(g, 'ruin_tower', 2, 3);
  check(!cond(g, 'ruin_church'), '이름 묶기를 모르면 교단이 안 옴');
  learn(g, 'name_bind');
  check(cond(g, 'ruin_church'), '이름 묶기를 알면 심문관');
  fire(g, 'ruin_church', 0, 7);
  fire(g, 'ruin_church', 1);
  check(!RU(g).known.includes('name_bind') && !RU(g).book.entries.some((e) => e.art === 'name_bind'), '불태우면 사라짐');
}

/* 5. 뒤척임·깨어남·싸움·다시 묶기 */
{
  const g = adult(3141, 30, 'saltrock');
  const x = RU(g).sites.tidepillars; x.known = 2; x.woke = 'stir'; x.wokeAt = g.date.year * 12 + g.date.month;
  check(cond(g, 'ruin_stir'), '뒤척이는 유적');
  check(typeof ruinsLine(g) === 'string' && /긁는/.test(ruinsLine(g)), `뒤척임 한 줄 ${ruinsLine(g)}`);
  RU(g).tongue = 90; g.player.stats.wil = 99;
  fire(g, 'ruin_stir', 1, 2);
  check(x.woke === null, '다시 잠재움');
  x.woke = 'awake';
  check(cond(g, 'ruin_wake') && !has(g, 'ruin_dig'), '깨어나면 사건, 들어가기 없음');
  check(/깨어난/.test(ruinsLine(g)), '깨어남 한 줄');
  fire(g, 'ruin_wake', 0);
  fire(g, 'ruin_wake', 2, 3); // 고대어 90 → 묶기
  check(x.woke === 'calmed', `다시 묶음 ${x.woke}`);
  x.woke = 'awake'; RU(g).tongue = 10; g.player.stats.str = 10;
  fire(g, 'ruin_wake', 1); check(x.woke === 'awake', '약하면 못 이김');
}

/* 6. 달마다 세상 흐름, 술식의 쓰임, 소문과 잇기 */
{
  const g = adult(3151, 30, 'ern');
  const x = RU(g).sites.sunkstair, l0 = x.looted;
  months(g, 60);
  check(RU(g).sites.sunkstair.looted > l0, '알려진 유적은 도굴꾼이 턺');
  check(RU(g).sites.silvergal.looted === 0 || RU(g).sites.silvergal.opened, '아무도 모르는 유적은 그대로');
  const y = RU(g).sites.ashaltar; y.woke = 'stir'; y.wokeAt = 0;
  let awoke = false; for (let i = 0; i < 120 && y.woke !== 'sealed'; i++) { const out = ruinsMonth(g); if (out.some((o) => o.id === 'ashaltar' && o.k === 'awake')) awoke = true; g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; }
  check(awoke && y.woke === 'sealed' && y.claim === 'tower', `뒤척임→깨어남→마탑 봉인 ${y.woke}`);
  // 소문 사실
  const a = take(g); const z = RU(g).sites.stonegate; z.woke = 'awake';
  const d = diff(g, a, take(g));
  check(d.some((f) => f.k === 'ruin_woke' && f.d.id === 'stonegate'), '깨어남은 소문 사실이 됨');
  const f = addFact(g, 'ruin_woke', { id: 'stonegate' });
  check(f.pl === 'silverleaf', '소문은 유적 고장에서 시작');
  const old = { ...a }; delete old.ruin; check(Array.isArray(diff(g, old, take(g))), '옛 저장 스냅숏도 견딤');
  // 고인 물 · 뿌리불
  mage(g, 2); learn(g, 'still_water'); learn(g, 'ember_root');
  g.player.stress = 50; g.date.month = 12; const m0 = g.player.money; ruinsMonth(g);
  check(g.player.stress === 47 && g.player.money === m0 + 2, '고인 물·뿌리불의 쓰임');
  // 화면
  const info = ruinsInfo(g);
  check(info.arts.length >= 2 && info.sites.every((s) => s.name && s.state) && typeof info.tongueWord === 'string', '정보 한 장');
  check(JSON.stringify(info).match(BAD0) === null, '정보에 빈 글 없음');
  // 저장 왕복
  const back = decodeSave(encodeSave(g)); runHooks('migrate', back, makeRng({ s: 1 }));
  check(RU(back).known.includes('still_water') && RU(back).sites.ashaltar.woke === 'sealed', '저장 왕복');
  delete back.ruins.foe; back.ruins.sites.gone = { known: 1 }; runHooks('migrate', back, makeRng({ s: 1 }));
  check(back.ruins.foe.tower === 0 && !back.ruins.sites.gone, '빈 칸 채우기');
  const fresh = newGame({ name: '새', sex: 'f', familyId: 'farmer', mode: 'free', seed: 3159 });
  delete fresh.ruins; runHooks('migrate', fresh, makeRng({ s: 1 })); check(fresh.ruins?.sites?.starroom, '옛 저장에 유적 채움');
  check(ruinsLine(fresh) === null, '아무것도 모르면 한 줄 없음');
}

/* 7. 짧은 플레이 */
{
  let shown = 0;
  for (const seed of [31801, 31802]) {
    const g = newGame({ name: '바람', sex: seed % 2 ? 'm' : 'f', familyId: seed % 2 ? 'merchant' : 'farmer', mode: 'free', seed });
    for (let m = 0; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g), acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let guard = 0;
      while (g.pendingEvent && guard++ < 6) {
        const pe = g.pendingEvent;
        if (/^ruin/.test(L(g).scene?.kind ?? pe.id ?? '')) { shown++; check(!BAD.test(pe.text ?? '') && !pe.choices.some((c) => BAD.test(c)), `글 ${pe.title}: ${pe.text}`); }
        check(!BAD0.test(pe.text ?? ''), `글 ${pe.title}: ${pe.text}`);
        resolveEvent(g, rng, rng.int(0, pe.choices.length - 1));
      }
      const ln = ruinsLine(g); check(ln === null || !BAD.test(ln), `한 줄 ${ln}`);
      if (L(g).heirPending) break;
    }
  }
  console.log(`짧은 플레이에서 뜬 유적 장면 ${shown}개`);
}

const sec = Math.round((Date.now() - T0) / 1000);
check(sec < 60, `1분 넘음 ${sec}초`);
console.log(fail ? `유적 점검 실패 ${fail}` : `OK (${sec}초)`);
process.exit(fail ? 1 : 0);
