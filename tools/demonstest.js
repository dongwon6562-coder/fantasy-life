import './lsshim.js';
import '../src/content.js';
// 마족 점검 (1분 안): 국경 습격, 회색 망토(만남·거래·휴전·배신·상자), 반마족 이웃, 집안 핏줄(드러남·눈길·쫓김), 해협 너머 다섯 곳,
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
import { demonsState as DM, demonsInfo, demonsLine, demonsMonth } from '../src/demons/index.js';
import { SS } from '../src/seal/state.js';
import { OS } from '../src/order/core.js';

const adult = (seed, age = 30, place = 'graubel') => {
  const g = newGame({ name: '멈춤', sex: 'm', familyId: 'farmer', mode: 'free', seed });
  grown(g, age); stay(g, place);
  for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 50;
  g.player.money = 3000; g.player.injuries = []; L(g).pendingDeath = null; L(g).queue = [];
  return g;
};
const tick = (g) => { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; };
const contact = (g, trust = 50) => { DM(g).contact = { name: '사로스', trust, met: 0, deals: 0, gone: false }; };

/* 1. 국경 습격 */
{
  const g = adult(3301, 30, 'graubel');
  DM(g).raid = 10; check(!cond(g, 'demon_raid'), '조용하면 습격 없음');
  DM(g).raid = 70; check(cond(g, 'demon_raid'), '기세가 높으면 습격');
  stay(g, 'ern'); check(!cond(g, 'demon_raid'), '남쪽에선 습격 없음'); stay(g, 'graubel');
  g.player.stats.str = 99; g.player.skills.sword = 95;
  fire(g, 'demon_raid', 0, 3); fire(g, 'demon_raid', 1); fire(g, 'demon_raid', 2);
  check(DM(g).me.raids === 1, '습격에 맞섬');
  DM(g).truce = { until: 99999, by: 'me' }; check(!cond(g, 'demon_raid'), '휴전 중엔 습격 없음');
}

/* 2. 회색 망토: 만남, 거래, 휴전, 배신, 상자 */
{
  const g = adult(3311, 30, 'portel');
  check(cond(g, 'demon_contact'), '항구에서 회색 망토');
  stay(g, 'ern'); check(!cond(g, 'demon_contact'), '마을에선 안 뜸'); stay(g, 'portel');
  fire(g, 'demon_contact', 0);
  check(DM(g).contact?.name && !DM(g).contact.gone, '말이 통하는 마족');
  check(has(g, 'demon_trade'), '거래');
  act(g, 'demon_trade'); check(DM(g).me.trades === 1 && !has(g, 'demon_trade'), '석 달에 한 번');
  stay(g, 'ern'); DM(g).tradeAt = -99; check(!has(g, 'demon_trade'), '항구 밖에선 거래 없음');
  const g2 = adult(3312, 30, 'portel'); fire(g2, 'demon_contact', 1); check(!DM(g2).contact && DM(g2).me.reported === 1, '알리면 사라짐');
  const g3 = adult(3313, 30, 'portel'); fire(g3, 'demon_contact', 2, 4);
  // 휴전
  stay(g, 'graubel'); DM(g).contact.trust = 60; DM(g).raid = 50; g.realm.north.garbes = 50;
  check(cond(g, 'demon_truce'), '휴전 제안');
  let made = false;
  for (let s = 1; s <= 10 && !made; s++) { g.player.stats.cha = 99; L(g).renown = 90; DM(g).truce = null; fire(g, 'demon_truce', 0, s); made = !!DM(g).truce; }
  check(made && DM(g).raid < 50 && g.realm.north.garbes < 50, '휴전이 이어지면 기세가 꺾임');
  fire(g, 'demon_truce', 1);
  // 배신
  DM(g).truce = { until: g.date.year * 12 + g.date.month + 10, by: 'me', betray: true };
  check(cond(g, 'demon_betrayal'), '휴전 깃발 아래 배신');
  fire(g, 'demon_betrayal', 0, 2);
  check(!DM(g).truce && DM(g).me.betrayed === 1, '휴전이 깨짐');
  DM(g).truce = { until: g.date.year * 12 + g.date.month + 10, by: 'me', betray: true }; fire(g, 'demon_betrayal', 1, 3);
  // 상자
  contact(g, 70); stay(g, 'portel'); SS(g).cult = 40; SS(g).spies = 3;
  check(cond(g, 'demon_box'), '봉한 상자');
  fire(g, 'demon_box', 0, 5); check(SS(g).cult < 40, '상자를 두면 마신교가 흩어짐');
  contact(g, 70); fire(g, 'demon_box', 2);
  contact(g, 70); fire(g, 'demon_box', 1); check(DM(g).contact.gone, '심문소에 넘기면 회색 망토가 떠남');
}

/* 3. 반마족 이웃, 집안 핏줄 */
{
  const g = adult(3321, 30, 'harfen');
  check(cond(g, 'demon_halfblood'), '반마족 이웃');
  fire(g, 'demon_halfblood', 0); fire(g, 'demon_halfblood', 1); fire(g, 'demon_halfblood', 2);
  check(DM(g).me.sheltered === 1 && DM(g).me.reported === 1 && DM(g).me.extorted === 1, '세 갈래');
  stay(g, 'graubel'); check(!cond(g, 'demon_halfblood'), '북부에선 안 뜸(거기선 숨지 않는다)');
  // 핏줄
  const k = adult(3322, 15, 'harfen');
  check(!cond(k, 'demon_blood_shows'), '핏줄이 없으면 안 드러남');
  DM(k).blood.line = 1;
  check(cond(k, 'demon_blood_shows'), '핏줄이 있으면 드러남');
  check(demonsInfo(k).blood === null, '드러나기 전엔 정보에도 없음');
  fire(k, 'demon_blood_shows', 1);
  check(DM(k).blood.shown && demonsInfo(k).blood, '드러남');
  check(!cond(k, 'demon_blood_shows'), '한 번만');
  const p0 = playerPower(k); DM(k).blood.shown = false; const p1 = playerPower(k); DM(k).blood.shown = true;
  check(playerPower(k) > p1 && p0 > p1, '드러난 피는 싸움에 보탬');
  grown(k, 5);
  check(cond(k, 'demon_blood_seen'), '눈길');
  fire(k, 'demon_blood_seen', 1); fire(k, 'demon_blood_seen', 1);
  check(DM(k).blood.known >= 2 && cond(k, 'demon_hunted'), '알려지면 심문관');
  check(/등 뒤|모자/.test(demonsLine(k) ?? ''), `핏줄 한 줄 ${demonsLine(k)}`);
  fire(k, 'demon_hunted', 0);
  check(L(k).place === 'graubel' && DM(k).blood.hunted > 0, '북쪽으로 달아남');
  check(!cond(k, 'demon_hunted'), '북부에선 쫓기지 않음');
  DM(k).blood.known = 2; stay(k, 'harfen'); fire(k, 'demon_hunted', 1, 6);
  // 대 잇기
  const kid = makePerson(makeRng({ s: 11 }), { ageMonths: 18 * 12, lastName: k.player.lastName });
  k.people.push(kid); me(k).childIds.push(kid.id); k.player.familyIds.push(kid.id); kid.known = true;
  (L(k).ancestors ??= []).push({ name: k.player.name, lastName: k.player.lastName, born: k.date.year - 40, died: k.date.year });
  contact(k, 80);
  becomeHeir(k, makeRng({ s: 5 }), kid);
  check(me(k).id === kid.id && !DM(k).blood.shown && DM(k).contact.trust < 80, '대 잇기: 드러남은 새 몸에서 다시, 믿음은 줄어듦');
  check([0, 1].includes(DM(k).blood.line), '핏줄은 반쯤 이어짐');
}

/* 4. 해협 너머 */
{
  const base = (seed) => { const g = adult(seed, 30, 'graubel'); contact(g, 50); SS(g).known = 1; return g; };
  const g0 = adult(3330, 30, 'graubel'); L(g0).renown = 0;
  check(!has(g0, 'demon_voyage'), '아무 연도 없으면 해협을 못 건넘');
  OS(g0).me = { id: 'march', joined: 0, brothers: [] }; check(has(g0, 'demon_voyage'), '잿빛 성벽 기사는 건넘');
  for (const [i, key] of ['post', 'bone', 'chain', 'coffin', 'stone'].entries()) {
    const g = base(3331 + i);
    check(has(g, 'demon_voyage'), `${key}: 건넘`);
    act(g, 'demon_voyage');
    const m0 = g.player.money;
    scene(g, 'demon_crossing', key, 20 + i);
    check(L(g).travel?.demon === key && L(g).travel.sea, `${key}: 몇 달 돌아오지 못함`);
    check(/붉은|해협/.test(demonsLine(g) ?? ''), `${key}: 떠난 동안 한 줄`);
    check(demonsInfo(g).away, `${key}: 정보에 다녀오는 곳`);
    if (key === 'post') check(g.player.money > m0, '교역소에서 벌이');
    if (key === 'coffin') check(SS(g).known >= 2, '마신의 관을 보면 봉인을 더 앎');
  }
  const gn = base(3339); act(gn, 'demon_voyage'); scene(gn, 'demon_crossing', 'no'); check(!L(gn).travel, '돌아섬');
}

/* 5. 달마다, 저장 왕복, 정보 */
{
  const g = adult(3341, 30, 'graubel');
  g.realm.north.garbes = 90; g.realm.seal = 50;
  for (let i = 0; i < 60; i++) { tick(g); demonsMonth(g); }
  check(DM(g).raid >= 50, `가르베스가 굶주리면 기세가 오름 ${Math.round(DM(g).raid)}`);
  check(DM(g).raids >= 1, '플레이어 없이도 바깥 마을이 불탐');
  g.realm.north.garbes = 10; g.realm.seal = 100;
  for (let i = 0; i < 60; i++) { tick(g); demonsMonth(g); }
  check(DM(g).raid < 40, `잠잠해짐 ${Math.round(DM(g).raid)}`);
  DM(g).truce = { until: g.date.year * 12 + g.date.month + 1, by: 'me' }; tick(g); tick(g); demonsMonth(g); check(!DM(g).truce, '휴전은 끝남');
  check(/해협/.test(demonsLine(g) ?? ''), '북부 한 줄');
  stay(g, 'ern'); check(demonsLine(g) === null, '남쪽 마을엔 한 줄 없음');
  check(JSON.stringify(demonsInfo(g)).match(BAD0) === null, '정보에 빈 글 없음');
  contact(g, 30);
  const back = decodeSave(encodeSave(g)); runHooks('migrate', back, makeRng({ s: 1 }));
  check(DM(back).contact?.name === '사로스', '저장 왕복');
  delete back.demons; runHooks('migrate', back, makeRng({ s: 1 })); check(back.demons?.blood && back.demons.raid === 25, '옛 저장 채움');
}

/* 6. 짧은 플레이 */
{
  let shown = 0;
  for (const seed of [33801, 33802]) {
    const g = newGame({ name: '바람', sex: seed % 2 ? 'm' : 'f', familyId: seed % 2 ? 'merchant' : 'farmer', mode: 'free', seed });
    DM(g).blood.line = 1;
    for (let m = 0; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g), acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let guard = 0;
      while (g.pendingEvent && guard++ < 6) {
        const pe = g.pendingEvent;
        if (/^demon/.test(L(g).scene?.kind ?? pe.id ?? '')) { shown++; check(!BAD.test(pe.text ?? '') && !pe.choices.some((c) => BAD.test(c)), `글 ${pe.title}: ${pe.text}`); }
        check(!BAD0.test(pe.text ?? ''), `글 ${pe.title}: ${pe.text}`);
        resolveEvent(g, rng, rng.int(0, pe.choices.length - 1));
      }
      const ln = demonsLine(g); check(ln === null || !BAD.test(ln), `한 줄 ${ln}`);
      if (L(g).heirPending) break;
    }
  }
  console.log(`짧은 플레이에서 뜬 마족 장면 ${shown}개`);
}

const sec = Math.round((Date.now() - T0) / 1000);
check(sec < (process.env.FL_PARALLEL ? 120 : 60), `1분 넘음 ${sec}초`);
console.log(fail ? `마족 점검 실패 ${fail}` : `OK (${sec}초)`);
process.exit(fail ? 1 : 0);
