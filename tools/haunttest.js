import './lsshim.js';
import '../src/content.js';
// 망자와 저주 점검: 처음 상태, 흉한 자리 찾아가기(지켜보기·캐묻기·넋 달래기·사제·신성력·무덤 털기), 영매, 굿, 저주받은 물건,
// 집안의 저주와 풀기, 사건들, 달 흐름(갱도 죽음·버려진 마을·파헤쳐진 무덤·망령), 대 잇기, 예전 저장, 40년 플레이.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { ACTIONS } from '../src/actions.js';
import { L, showScene, SCENE_STRICT } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';

import { hauntState as HS, hauntInfo, hauntLine, hauntMonth, makeSpot, laySpot } from '../src/haunt/index.js';
import { elderState } from '../src/elder/index.js';
import { feudState, addGrudge } from '../src/feud/index.js';
import { faithState } from '../src/faith/index.js';
import { towerState } from '../src/tower/index.js';
import { wildsState } from '../src/wilds/index.js';
import { mineState as MS, collapse } from '../src/mine/index.js';

SCENE_STRICT.on = true;
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const text = e.text(g, ctx);
  check(!BAD.test(text) && typeof e.title === 'string', `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: e.choices.map((c) => c.label), choiceIdx: e.choices.map((c, i) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && out.length > 5 && !BAD.test(out), `${id} 결과: ${out}`);
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; for (const k of Object.keys(g.player.stats)) g.player.stats[k] = Math.max(g.player.stats[k], 35); g.date.year += y; (g.flags ??= {}).adult = true; };
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
const fresh = (seed, name = '영매') => newGame({ name, sex: 'f', familyId: 'farmer', mode: 'free', seed });
const setStats = (g, v) => { for (const k of Object.keys(g.player.stats)) g.player.stats[k] = v; };
const adult = (seed, place = 'ern', v = 50) => { const g = fresh(seed); grown(g); stay(g, place); setStats(g, v); g.player.money = 500; g.player.familyMoney = 0; g.player.injuries = []; L(g).pendingDeath = null; return g; };
const ticks = (g, n, until = () => false) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year += 1; g.rngState.s = (g.rngState.s * 1103515245 + 12345) | 0; hauntMonth(g); if (until()) return i + 1; } return n; };
const okInfo = (g) => check(!BAD.test(JSON.stringify(hauntInfo(g)).replace(/null/g, '0')) && !BAD.test(String(hauntLine(g) ?? '')), `화면 정보: ${JSON.stringify(hauntInfo(g)).slice(0, 300)}`);
const spotAt = (g, pl, opts) => makeSpot(g, makeRng({ s: 77 }), pl, opts);
const sp = (g, id) => HS(g).spots[id];
const visit = (g, id) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; g.player.fatigue = 0; for (const k of Object.keys(HS(g).spots)) if (k !== id && HS(g).spots[k].place === L(g).place) HS(g).spots[k].state = 'gone'; act(g, 'haunt_visit'); check(queued(g, 'haunt_spot'), '흉한 자리 장면'); };
const reset = (g) => { L(g).queue = []; L(g).scene = null; g.pendingEvent = null; g.player.fatigue = 0; g.player.stress = 0; L(g).pendingDeath = null; };

// 1) 처음
{
  const g = fresh(4001);
  const H = HS(g);
  check(Object.keys(H.spots).length === 0 && !H.curse && !H.wraith && H.items.length === 0, '처음엔 아무것도 없다');
  okInfo(g);
  check(hauntLine(g) === null, '처음엔 머리글 없음');
  spotAt(g, 'ern', { kind: 'house', real: true, power: 50 });
  check(!has(g, 'haunt_visit'), '아이는 흉가에 가지 못한다');
  grown(g); stay(g, 'ern');
  check(has(g, 'haunt_visit'), '어른은 흉한 자리를 찾아간다');
  check(has(g, 'haunt_medium'), '에른에는 언덕 돌 제단지기 노파가 있다');
  check(!has(g, 'haunt_rite') && !has(g, 'haunt_item') && !has(g, 'haunt_lift'), '배우지 않았고 물건도 저주도 없다');
  stay(g, 'leocast');
  check(!has(g, 'haunt_visit') && !has(g, 'haunt_medium'), '왕도에는 흉한 자리도 영매도 없다');
  okInfo(g);
}
// 2) 헛소문: 지켜보면 밝혀진다
{
  let exposed = 0;
  for (let k = 0; k < 6; k++) {
    const g = adult(4010 + k, 'ern', 80);
    const id = spotAt(g, 'ern', { kind: 'house', real: false });
    visit(g, id);
    const out = scene(g, 'haunt_spot', 'watch', 20 + k);
    if (sp(g, id).state === 'gone') { exposed++; check(/알고 보니/.test(out), `헛소문 밝힘 글: ${out}`); check(HS(g).me.exposed === 1, '밝힌 수'); }
    else check(sp(g, id).known === 1, '못 밝혀도 겪어 봄');
  }
  check(exposed >= 3, `헛소문을 거의 못 밝힌다 (${exposed}/6)`);
}
// 3) 진짜 잔향: 지켜보고, 캐묻고, 넋을 달랜다
{
  let laid = 0;
  for (let k = 0; k < 6; k++) {
    const g = adult(4020 + k, 'ern', 85);
    const id = spotAt(g, 'ern', { kind: 'grave', real: true, power: 45 });
    sp(g, id).dead.grief = 'rite';
    visit(g, id);
    scene(g, 'haunt_spot', 'watch', 30 + k);
    check(sp(g, id).known === 1, '진짜 잔향은 겪어 본다');
    check(sp(g, id).state === 'restless' || sp(g, id).state === 'quiet', '진짜는 사라지지 않는다');
    visit(g, id);
    scene(g, 'haunt_spot', 'ask', 3);
    if (sp(g, id).known < 2) { visit(g, id); scene(g, 'haunt_spot', 'ask', 4); }
    if (sp(g, id).known < 2) continue;
    okInfo(g);
    check(hauntInfo(g).here[0]?.ask === '늦게라도 제대로 된 장례를 치러 준다', '사연을 알면 화면에 할 일이 나온다');
    const money = g.player.money;
    visit(g, id);
    scene(g, 'haunt_spot', 'lay', 40 + k);
    check(g.player.money === money - 15, '장례 값');
    if (sp(g, id).state === 'laid') { laid++; check(HS(g).me.laid === 1, '달랜 수'); }
    else check(sp(g, id).power < 45, '못 달래도 엷어진다');
  }
  check(laid >= 3, `넋을 거의 못 달랜다 (${laid})`);
}
// 4) 사제를 부르고, 신성력으로 정화하고, 죽은 자의 목소리를 듣는다
{
  const g = adult(4030, 'leocast', 60);
  const id = spotAt(g, 'leocast', { kind: 'well', real: true, power: 40 });
  visit(g, id);
  check(scene(g, 'haunt_spot', 'priest').length > 0 && sp(g, id).state === 'laid', '사제가 엷은 잔향을 푼다');
  const id2 = spotAt(g, 'leocast', { kind: 'house', real: true, power: 80 });
  visit(g, id2);
  scene(g, 'haunt_spot', 'priest');
  check(sp(g, id2).state !== 'laid' && sp(g, id2).power === 55, '짙은 잔향은 한 번에 안 풀린다');
  faithState(g).god = 'solar'; faithState(g).holy = 90;
  visit(g, id2);
  scene(g, 'haunt_spot', 'pray', 2);
  check(sp(g, id2).state === 'laid' || sp(g, id2).power < 55, '신성력 정화');
  const t = adult(4031, 'ern', 60);
  const id3 = spotAt(t, 'ern', { kind: 'house', real: true, power: 40 });
  visit(t, id3);
  check(!L(t).queue[0].choices?.some?.((c) => c.key === 'listen'), '금지된 술 없이는 목소리를 못 듣는다');
  towerState(t).forbidden.necro = 1;
  const taint = towerState(t).taint;
  reset(t); visit(t, id3);
  scene(t, 'haunt_spot', 'listen');
  check(sp(t, id3).known === 2 && towerState(t).taint > taint, '죽은 자의 목소리: 사연을 알고 물든다');
  const id4 = spotAt(t, 'ern', { kind: 'house', real: false });
  visit(t, id4);
  scene(t, 'haunt_spot', 'listen');
  check(sp(t, id4).state === 'gone', '헛소문엔 들리는 목소리가 없다');
}
// 5) 무덤 털기: 돈, 물건, 저주
{
  let items = 0, curses = 0;
  for (let k = 0; k < 14; k++) {
    const g = adult(4040 + k, 'ern', 50);
    const id = spotAt(g, 'ern', { kind: 'grave', real: true, power: 60 });
    const money = g.player.money;
    visit(g, id);
    scene(g, 'haunt_spot', 'rob', 50 + k);
    check(g.player.money > money && sp(g, id).power === 75 && sp(g, id).robbed === 1, '털면 돈이 생기고 잔향이 짙어진다');
    if (HS(g).items.length) { items++; check(HS(g).items[0].from === id, '물건의 본디 자리'); }
    if (HS(g).curse) { curses++; check(HS(g).curse.kind === 'grave', '무덤의 원념'); okInfo(g); check(/집안의 저주/.test(hauntLine(g)), '저주 머리글'); }
  }
  check(items >= 3, `털어도 물건이 안 나온다 (${items})`);
  check(curses >= 1, `털어도 저주가 붙지 않는다 (${curses})`);
}
// 6) 저주받은 물건: 성당, 돌려주기, 팔기, 태우기
{
  const mk = (seed, place) => { const g = adult(seed, place, 70); const id = spotAt(g, place, { kind: 'house', real: true, power: 40 }); HS(g).items.push({ id: 900, kind: 'ring', name: '검은 진주 가락지', from: id, power: 50, since: 0 }); return [g, id]; };
  let [g, id] = mk(4060, 'leocast');
  check(has(g, 'haunt_item'), '물건이 있으면 처리한다');
  act(g, 'haunt_item'); scene(g, 'haunt_item', 'church');
  check(HS(g).items.length === 0, '성당에 맡겼다');
  [g, id] = mk(4061, 'ern');
  act(g, 'haunt_item'); scene(g, 'haunt_item', 'return');
  check(HS(g).items.length === 0 && sp(g, id).state === 'laid', '돌려주면 그 자리가 잠잠해진다');
  [g, id] = mk(4062, 'harfen');
  const m0 = g.player.money;
  act(g, 'haunt_item'); scene(g, 'haunt_item', 'sell');
  check(HS(g).items.length === 0 && g.player.money === m0 + 36 && HS(g).me.passed === 1, '모르는 척 팔았다');
  let burned = 0;
  for (let k = 0; k < 6; k++) { [g, id] = mk(4063 + k, 'ern'); act(g, 'haunt_item'); scene(g, 'haunt_item', 'melt', 60 + k); if (!HS(g).items.length) burned++; }
  check(burned >= 2 && burned <= 6, `태우기 (${burned}/6)`);
  // 지니고 있으면 달마다 탈이 난다
  [g, id] = mk(4070, 'ern');
  const hist = g.life ? L(g) && g.player : null;
  const before = (g.people.find((p) => p.isPlayer)?.history ?? []).length;
  ticks(g, 60);
  const after = (g.people.find((p) => p.isPlayer)?.history ?? []).length;
  check(after > before, '물건을 지니면 탈이 난다');
}
// 7) 영매: 어른의 말, 저주 보기, 배우기, 속임수 캐기
{
  const g = adult(4080, 'ern', 70);
  const H = HS(g);
  H.mediums = { ern: { fake: false, gone: 0 } };
  elderState(g).graves.push({ id: 99, pid: 1, name: '오토', sex: 'm', place: 'ern', kind: 'plain', byPlayer: true, gen: 0, tended: 20, cause: '병', desecrated: false });
  act(g, 'haunt_medium');
  const o1 = scene(g, 'haunt_medium', 'ancestor');
  check(/버릇/.test(o1), `진짜 영매는 버릇을 안다: ${o1}`);
  H.curse = { kind: 'old', by: '모름', why: '어느 대에서 시작했는지 모른다', power: 50, gen: 1, since: 0, place: 'ern', known: false };
  reset(g); act(g, 'haunt_medium');
  scene(g, 'haunt_medium', 'curse');
  check(H.curse.known === true, '진짜 영매는 저주를 알아본다');
  okInfo(g);
  check(hauntInfo(g).curse.power === '아직 남아 있다', '저주의 무게가 보인다');
  for (let k = 0; k < 3; k++) { reset(g); act(g, 'haunt_medium'); scene(g, 'haunt_medium', 'learn', k); }
  check(H.me.medium === 18, `진짜 영매에게 배운다 (${H.me.medium})`);
  reset(g); act(g, 'haunt_medium'); scene(g, 'haunt_medium', 'expose');
  check(!H.mediums.ern.gone, '진짜 영매는 밝혀지지 않는다');
  // 가짜
  const f = adult(4081, 'gruental', 90);
  HS(f).mediums = { gruental: { fake: true, gone: 0 } };
  faithState(f).suspicion = 0;
  act(f, 'haunt_medium'); scene(f, 'haunt_medium', 'learn');
  check(HS(f).me.medium === 2 && faithState(f).suspicion > 0, '가짜에게는 장사하는 법만, 교단 땅에서는 수군거림');
  let gone = false;
  for (let k = 0; k < 6 && !gone; k++) { reset(f); act(f, 'haunt_medium'); scene(f, 'haunt_medium', 'expose', 70 + k); gone = !!HS(f).mediums.gruental.gone; }
  check(gone && !has(f, 'haunt_medium'), '가짜 영매를 들춰내면 떠난다');
}
// 8) 굿: 정성껏, 가짜 부적
{
  const g = adult(4090, 'barka', 70);
  HS(g).me.medium = 40;
  check(!has(g, 'haunt_rite'), '흉흉하지 않으면 굿을 청하지 않는다');
  const id = spotAt(g, 'barka', { kind: 'house', real: true, power: 30 });
  check(has(g, 'haunt_rite'), '흉한 자리가 있으면 굿을 청한다');
  let laid = false;
  for (let k = 0; k < 8 && !laid; k++) { reset(g); const m = g.player.money; act(g, 'haunt_rite'); scene(g, 'haunt_rite', 'honest', 80 + k); check(g.player.money > m, '굿 삯'); laid = sp(g, id).state === 'laid'; }
  check(laid, '정성껏 한 굿이 넋을 달랜다');
  spotAt(g, 'barka', { kind: 'house', real: false });
  let caught = false;
  for (let k = 0; k < 20 && !caught; k++) { reset(g); const m = g.player.money; act(g, 'haunt_rite'); const out = scene(g, 'haunt_rite', 'fake', 90 + k); caught = /들통/.test(out); if (!caught) check(g.player.money >= m + 12, '가짜 부적 값'); }
  check(caught, '가짜 굿은 언젠가 들통난다');
  check(HS(g).me.rites > 1, '굿 수');
}
// 9) 집안의 저주 풀기
{
  const curse = (g, power = 40) => { HS(g).curse = { kind: 'dying', by: '하겐', why: '하겐의 마지막 숨이 핏줄을 저주했다', power, gen: L(g).gen ?? 1, since: 0, place: 'harfen', known: true }; };
  let g = adult(4100, 'leocast', 60); curse(g);
  check(has(g, 'haunt_lift'), '성당이 있으면 저주를 풀러 간다');
  act(g, 'haunt_lift'); scene(g, 'haunt_lift', 'church');
  check(!HS(g).curse && HS(g).me.lifted === 1, '큰 정화 의식으로 풀었다');
  g = adult(4101, 'gruental', 60); curse(g, 20); HS(g).mediums = { gruental: { fake: false, gone: 0 } };
  act(g, 'haunt_lift'); scene(g, 'haunt_lift', 'medium');
  check(!HS(g).curse, '진짜 영매의 넋 풀이 굿');
  g = adult(4102, 'gruental', 60); curse(g, 20); HS(g).mediums = { gruental: { fake: true, gone: 0 } };
  act(g, 'haunt_lift'); scene(g, 'haunt_lift', 'medium');
  check(HS(g).curse?.power === 17, '가짜 영매의 굿은 돈만 든다');
  g = adult(4103, 'harfen', 90); curse(g, 30);
  act(g, 'haunt_lift'); scene(g, 'haunt_lift', 'amends', 4);
  check(!HS(g).curse || HS(g).curse.power === 15, '시작된 자리에서 빈다');
  g = adult(4104, 'ern', 90); curse(g, 30);
  check(!has(g, 'haunt_lift') || !!HS(g).mediums?.ern, '풀 방도가 없는 곳');
  towerState(g).forbidden.necro = 2;
  check(has(g, 'haunt_lift'), '죽은 자의 술이 있으면 어디서나');
  act(g, 'haunt_lift'); scene(g, 'haunt_lift', 'necro', 5);
  check(!HS(g).curse || HS(g).curse.kind === 'necro', '원념을 묶거나 놓친다');
  check(towerState(g).taint >= 10, '죽은 자의 술은 물든다');
  // 대를 넘으면 엷어지고, 세 대쯤이면 사라진다
  g = adult(4105, 'ern', 50); curse(g, 60);
  runHooks('heir', g, makeRng({ s: 1 })); check(HS(g).curse?.power === 33, `한 대 (${HS(g).curse?.power})`);
  runHooks('heir', g, makeRng({ s: 1 })); check(HS(g).curse?.power === 16, `두 대 (${HS(g).curse?.power})`);
  runHooks('heir', g, makeRng({ s: 1 })); check(!HS(g).curse, '세 대째 흩어진다');
}
// 10) 사건
{
  let g = adult(4110, 'ern', 70);
  HS(g).frauds.ern = 2; HS(g).dread.ern = 30;
  check(cond(g, 'haunt_fraud'), '떠돌이 무당 조건');
  fire(g, 'haunt_fraud', 1, 3);
  g = adult(4111, 'harfen', 70);
  check(cond(g, 'haunt_cursed_buy'), '싸게 나온 물건 조건');
  fire(g, 'haunt_cursed_buy', 0, 3);
  check(HS(g).items.length === 1, '싸게 산 물건');
  check(cond(g, 'haunt_night'), '물건이 있으면 한밤의 소리');
  fire(g, 'haunt_night', 0, 3);
  g = adult(4112, 'ern', 70);
  const foe = g.people.find((p) => !p.isPlayer && p.alive);
  foe.ageMonths = 70 * 12;
  addGrudge(g, foe, 90, '집을 빼앗겼다');
  check(cond(g, 'haunt_dying_curse'), '원수의 마지막 말 조건');
  fire(g, 'haunt_dying_curse', 2, 3);
  check(!foe.alive && HS(g).curse?.kind === 'dying' && HS(g).curse.power === 55, '헛소리로 넘기면 무거운 저주');
  check(!cond(g, 'haunt_dying_curse'), '저주가 있으면 다시 오지 않는다');
  check(cond(g, 'haunt_curse_strike'), '저주의 탈');
  fire(g, 'haunt_curse_strike', 1, 3);
  check(HS(g).curse.known, '알아보기로 한다');
  g = adult(4113, 'ern', 70);
  elderState(g).graves.push({ id: 98, pid: 1, name: '마르타', sex: 'f', place: 'ern', kind: 'plain', byPlayer: true, gen: 0, tended: 10, desecrated: false });
  check(cond(g, 'haunt_ancestor'), '꿈에 온 어른 조건');
  fire(g, 'haunt_ancestor', 0, 3);
  check(elderState(g).graves.find((x) => x.id === 98).tended === 75, '무덤을 손봤다');
  const id = spotAt(g, 'ern', { kind: 'house', real: true, power: 70 });
  sp(g, id).state = 'restless';
  check(cond(g, 'haunt_night'), '들끓는 자리가 있으면 한밤의 소리');
  fire(g, 'haunt_night', 0, 3);
  check(queued(g, 'haunt_spot'), '나가 본다');
}
// 11) 달 흐름: 갱도 죽음, 버려진 마을, 파헤쳐진 무덤
{
  const g = adult(4120, 'hammer', 50);
  hauntMonth(g);
  let made = false;
  for (let k = 0; k < 40 && !made; k++) { MS(g).sites.deepvein.dead += 5; ticks(g, 1); made = Object.values(HS(g).spots).some((s) => s.kind === 'mine'); }
  check(made, '갱도에서 사람이 죽으면 흉한 자리가 생긴다');
  check((HS(g).dread.hammer ?? 0) > 0, '흉흉함이 오른다');
  const W = wildsState(g);
  W.hamlets.oldmine.state = 'abandoned'; W.hamlets.oldmine.since = 0;
  const n = ticks(g, 200, () => Object.values(HS(g).spots).some((s) => s.kind === 'hamlet'));
  check(n < 200, '버려진 마을 터에 이야기가 붙는다');
  elderState(g).graves.push({ id: 97, pid: 1, name: '한스', sex: 'm', place: 'ern', kind: 'plain', byPlayer: true, gen: 0, tended: 50, desecrated: true });
  ticks(g, 1);
  const gs = Object.values(HS(g).spots).find((s) => s.dead.name === '한스');
  check(gs && gs.real && gs.kind === 'grave', '파헤쳐진 집안 무덤은 진짜 잔향이 된다');
  okInfo(g);
  // 60년: 값이 제자리
  ticks(g, 12 * 60);
  for (const s of Object.values(HS(g).spots)) if (!Number.isFinite(s.power) || s.power < 0 || s.power > 100) check(false, `세기 ${s.name} ${s.power}`);
  for (const [pl, v] of Object.entries(HS(g).dread)) if (!Number.isFinite(v) || v < 0 || v > 100) check(false, `흉흉함 ${pl} ${v}`);
  check(Object.keys(HS(g).spots).length <= 15, '자리가 끝없이 늘지 않는다');
  for (const l of HS(g).log) if (BAD.test(l.text)) { check(false, `기록 글 이상: ${l.text}`); break; }
  okInfo(g);
}
// 12) 망령: 봉인이 흔들릴 때만, 맞서거나 사제단이 흩는다
{
  const g = adult(4130, 'verden', 60);
  const id = spotAt(g, 'verden', { kind: 'house', real: true, power: 90 });
  ticks(g, 120, () => !!HS(g).wraith);
  check(!HS(g).wraith, '봉인이 고요하면 망령은 없다');
  g.realm.seal = 30;
  sp(g, id).power = 90; sp(g, id).state = 'restless'; HS(g).wraithAt = -999;
  ticks(g, 600, () => { sp(g, id).power = 90; return !!HS(g).wraith; });
  check(HS(g).wraith === id && sp(g, id).wraith, '봉인이 흔들리면 짙은 잔향이 망령이 된다');
  okInfo(g);
  check(/망령/.test(hauntLine(g)) && hauntInfo(g).wraith?.name === sp(g, id).name, '망령 머리글');
  check(cond(g, 'haunt_wraith_call'), '망령이 도는 고장');
  fire(g, 'haunt_wraith_call', 0, 3);
  check(queued(g, 'haunt_spot'), '나선다');
  let down = false, dead = 0;
  for (let k = 0; k < 12 && !down; k++) {
    reset(g); setStats(g, 95); g.player.skills.sword = 95; faithState(g).holy = 0;
    sp(g, id).state = 'restless'; sp(g, id).wraith = true; HS(g).wraith = id;
    visit(g, id);
    scene(g, 'haunt_spot', 'face', 100 + k);
    down = sp(g, id).state === 'laid';
    if (L(g).pendingDeath) dead++;
  }
  check(down && !HS(g).wraith && HS(g).me.wraiths === 1, '망령에 맞서 흩었다');
  // 내버려 두어도 사제단이 끝내 흩는다
  const t = adult(4131, 'ern', 50);
  t.realm.seal = 30;
  const id2 = spotAt(t, 'leocast', { kind: 'house', real: true, power: 90 });
  const { becomeWraith } = await import('../src/haunt/world.js');
  becomeWraith(t, id2, () => {});
  const n = ticks(t, 240, () => !HS(t).wraith);
  check(n < 240 && sp(t, id2).hurt >= 0, '사제단이 망령을 흩는다');
}
// 13) 예전 저장
{
  const h = fresh(4140); delete h.haunt;
  runHooks('migrate', h, makeRng({ s: 1 }));
  check(!!h.haunt && h.haunt.me.medium === 0 && !!h.haunt.seen.grave, '예전 저장을 채운다');
  const k = fresh(4141); delete k.haunt.me.fakes; delete k.haunt.seen;
  runHooks('migrate', k, makeRng({ s: 1 }));
  check(k.haunt.me.fakes === 0 && !!k.haunt.seen.mine, '빠진 것을 채운다');
}
// 14) 40년 플레이
{
  let years = 0, visits = 0;
  const seen = {};
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '평생', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'farmer'][run], mode: 'free', seed: 4197 + run });
    let m = 0;
    for (; m < 12 * 40 && !g.over; m++) {
      const rng = rngOf(g);
      if (m === 12 * 17) { L(g).place = ['ern', 'verden', 'barka', 'hammer'][run]; L(g).travel = null; spotAt(g, L(g).place, { kind: 'house', real: run % 2 === 0, power: 50 }); }
      if (m === 12 * 18) HS(g).me.medium = 30;
      const acts = availableActions(g);
      const pref = acts.filter((a) => a.id.startsWith('haunt_'));
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (pref.length && rng.chance(0.5) ? rng.pick(pref) : rng.pick(acts)).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) { const kind = L(g).scene?.kind ?? g.pendingEvent.id; seen[kind] = (seen[kind] ?? 0) + 1; check(!BAD.test(g.pendingEvent.text) && !BAD.test(g.pendingEvent.title) && g.pendingEvent.choices.every((c) => !BAD.test(c)), `장면 글 ${kind}: ${g.pendingEvent.text}`); resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1))); }
      for (const r of g.lastResults ?? []) if (BAD.test(r.text)) { check(false, `결과 글 ${r.name}: ${r.text}`); break; }
      if (!Number.isFinite(g.player.money) || g.player.money < 0) { check(false, `돈 ${g.player.money}`); break; }
    }
    years += m / 12; visits += HS(g).me.visits;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of HS(g).log) if (BAD.test(l.text)) { check(false, `망자 기록 이상: ${l.text}`); break; }
    for (const n of g.news ?? []) if (BAD.test(n.text)) { check(false, `소식 글 이상: ${n.text}`); break; }
    okInfo(g);
  }
  console.log(`망자와 저주 ${Math.round(years)}년 4판 플레이, 흉한 자리 찾기 ${visits}번, 장면 ${Object.keys(seen).filter((k) => k.startsWith('haunt_')).join(',')}`);
  check(visits > 0, '40년 동안 흉한 자리를 한 번도 안 찾았다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
