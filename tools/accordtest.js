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
import { accordInfo, accordLine, accordTies } from '../src/accord/index.js';
import { AS, fresh, STANCES, STANCE_IDS, EXPORTS, CAPITAL, leanOf, embargoOf, disputeOf, grudge } from '../src/accord/state.js';
import { accordMonth } from '../src/accord/world.js';
import { PS, nations, relOf, shiftRel, pactOf, addPact, dropPact, warOf } from '../src/politics/state.js';
import { GOODS, T } from '../src/trade/core.js';
import { PLACES } from '../src/places.js';
import { A } from '../src/army/core.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { iconName } from '../src/art/icons.js';
import { KINDS } from '../src/rumor/facts.js';

// 45단계 나라 사이 흐름 점검 (도우미스레드3). 1분 안에.
const mk = (seed = 71) => newGame({ name: '루돌프', sex: 'm', familyId: 'farmer', mode: 'free', seed });
const textOK = (arr, what) => { for (const t of arr) check(typeof t === 'string' && !BAD.test(t), `${what}: ${t}`); };
const tick = (g, n = 1, news = []) => { for (let i = 0; i < n; i++) { g.date.month = (g.date.month % 12) + 1; if (g.date.month === 1) g.date.year++; accordMonth(g, (t) => news.push(t)); } return news; };
const adult = (pl = 'leocast', seed = 77) => { const g = mk(seed); grown(g, 22); stay(g, pl); g.player.money = 120; return g; };
const setRel = (g, a, b, v) => shiftRel(g, a, b, v - relOf(g, a, b));
const clearPacts = (g, a, b) => { for (const k of ['alliance', 'trade', 'truce', 'marriage', 'vassal']) dropPact(g, a, b, k); };
const calm = (g) => { const S = AS(g); S.embargo = []; S.disputes = []; S.secrets = []; S.grudges = []; };

// 1. 표
{
  check(STANCE_IDS.length === 5, '성향 다섯');
  for (const id of nations()) {
    check(leanOf(id).every((s) => STANCES[s]), `${id} 성향 표`);
    check((EXPORTS[id] ?? []).length && EXPORTS[id].every((k) => GOODS[k]), `${id} 내다 파는 물건`);
    check(PLACES[CAPITAL[id]], `${id} 소식이 나는 고장 ${CAPITAL[id]}`);
  }
  for (const k of ['ac_stance', 'ac_embargo', 'ac_dispute', 'ac_betray']) check(KINDS[k]?.truth && KINDS[k].wrong?.length, `소문 갈래 ${k}`);
  for (const id of ['ac_smuggle', 'ac_mediate', 'ac_spy']) check(iconName({ id }) !== 'scroll', `${id} 아이콘 ${iconName({ id })}`);
  const g = mk();
  check(g.accord && Object.keys(g.accord.stance).length === nations().length, '새 게임에 나라마다 성향');
}

// 2. 통치자가 바뀌면 성향이 다시 정해진다
{
  const g = mk(3), S = AS(g);
  tick(g, 1);
  const n0 = S.tally.stance ?? 0;
  S.ruler.valhart = 'old:1'; S.ruler.leonia = 'nobody';
  const news = tick(g, 1);
  check((S.tally.stance ?? 0) === n0 + 2, `통치자 바뀐 두 나라 성향 (${S.tally.stance})`);
  check(news.length >= 1, '새 통치자 소식');
  textOK(news, '성향 소식');
}

// 3. 봉쇄: 물건 값이 뛰고, 걸리고, 풀린다
{
  const g = mk(5), S = AS(g); calm(g);
  S.embargo.push({ by: 'valhart', on: 'free', since: 0, why: '시험' });
  setRel(g, 'valhart', 'free', -80);
  const before = T(g).mkt['eisen:silk']?.drift ?? 0;
  for (let i = 0; i < 3; i++) { g.date.month = (g.date.month % 12) + 1; accordMonth(g); }
  check((T(g).mkt['eisen:silk']?.drift ?? 0) > before, `봉쇄하면 발하르트 장터 비단 값이 뛴다 (${before} → ${T(g).mkt['eisen:silk']?.drift})`);
  // 풀리기: 사이가 좋아지면 언젠가 풀린다
  setRel(g, 'valhart', 'free', 60); S.stance.valhart = 'merchant';
  let lifted = false; for (let i = 0; i < 400 && !lifted; i++) { tick(g, 1); lifted = !embargoOf(g, 'valhart', 'free'); }
  check(lifted, '봉쇄가 풀린다');
  // 걸리기: 사이가 아주 나쁜 나라들이 있으면 언젠가 봉쇄
  const h = mk(6); calm(h);
  for (const a of nations()) for (const b of nations()) if (a < b) { setRel(h, a, b, -80); clearPacts(h, a, b); }
  for (const id of nations()) AS(h).stance[id] = 'zealot';
  const n0 = AS(h).tally.embargo ?? 0; tick(h, 240);
  check((AS(h).tally.embargo ?? 0) > n0, `원수지간이면 봉쇄를 건다 (${AS(h).tally.embargo})`);
}

// 4. 국경 다툼: 끝까지 가면 칼, 중재, 식기
{
  const g = mk(8), S = AS(g); calm(g); PS(g).wars = [];
  clearPacts(g, 'free', 'valhart'); setRel(g, 'free', 'valhart', -70);
  S.stance.free = 'hawk'; S.stance.valhart = 'hawk';
  for (const x of ['serenia', 'holy']) setRel(g, x, 'valhart', -50); // 중재할 나라가 없게
  S.disputes.push({ a: 'valhart', b: 'free', land: 'libera', heat: 99, peak: 99, since: 0 });
  const news = tick(g, 12);
  check((S.tally.war ?? 0) + (S.tally.clash ?? 0) > 0, `끝까지 달아오른 다툼은 전쟁이나 칼부림 (${JSON.stringify(S.tally)})`);
  textOK(news, '다툼 소식');
  const h = mk(9), Sh = AS(h); calm(h);
  clearPacts(h, 'free', 'valhart'); setRel(h, 'free', 'valhart', 0); for (const x of ['serenia', 'holy']) { setRel(h, x, 'free', 20); setRel(h, x, 'valhart', 20); }
  Sh.stance.free = 'dove'; Sh.stance.valhart = 'dove';
  Sh.disputes.push({ a: 'valhart', b: 'free', land: 'libera', heat: 50, peak: 50, since: 0 });
  tick(h, 300);
  check(!disputeOf(h, 'free', 'valhart') && ((Sh.tally.arbitrated ?? 0) + (Sh.tally.cooled ?? 0)) > 0, `화친하는 두 나라 다툼은 중재되거나 식는다 (${JSON.stringify(Sh.tally)})`);
  // 레오니아는 다툼으로 전쟁을 열지 않는다 (발하르트 전쟁은 world.js가 맡는다)
  const k = mk(10), Sk = AS(k); calm(k); PS(k).wars = [];
  clearPacts(k, 'leonia', 'valhart'); setRel(k, 'leonia', 'valhart', -80);
  Sk.disputes.push({ a: 'valhart', b: 'leonia', land: 'libera', heat: 99, peak: 99, since: 0 });
  const t0 = k.realm.balhart.tension; tick(k, 1);
  check(!PS(k).wars.some((w) => [w.a, w.b].includes('leonia')), '레오니아는 다툼으로 politics 전쟁에 끌려가지 않는다');
  check(k.realm.balhart.tension >= t0, '대신 발하르트와 긴장이 오른다');
}

// 5. 밀약이 드러나면 배신, 원한
{
  const g = mk(11), S = AS(g); calm(g);
  addPact(g, 'elf', 'dwarf', 'alliance');
  S.secrets.push({ a: 'elf', b: 'beast', against: 'dwarf', since: 0, known: false, push: 1 });
  const news = tick(g, 1);
  check(!pactOf(g, 'elf', 'dwarf', 'alliance'), '배신하면 동맹이 깨진다');
  check(grudge(g, 'dwarf', 'elf') >= 1 && (S.tally.betray ?? 0) >= 1, '배신당한 쪽에 원한');
  check(news.some((t) => t.includes('밀약')), '배신 소식은 크게 돈다');
  check(!S.log.some((x) => x.text.startsWith('(밀약)')), '드러나지 않은 밀약은 기록에 안 보인다');
}

// 6. 플레이어: 관문 검사, 밀수, 담판, 공작, 순찰, 징집
{
  const g = adult('leocast', 21), S = AS(g); calm(g);
  S.embargo.push({ by: 'valhart', on: 'free', since: 0, why: '시험' });
  T(g).cargo = { silk: { qty: 4, cost: 100 } };
  S.searched = { realm: 'leonia', at: 0 };
  stay(g, 'eisen'); L(g).queue = [];
  for (const f of HOOKS.afterMonth) f(g, makeRng({ s: 2 }));
  check(queued(g, 'ac_search'), '봉쇄한 나라 관문에서 짐 검사');
  if (queued(g, 'ac_search')) { scene(g, 'ac_search', 'give'); check(!T(g).cargo.silk, '짐을 내주면 비단이 없어진다'); }
  // 밀수
  g.player.skills.trade = 25; stay(g, 'eisen');
  check(has(g, 'ac_smuggle'), '봉쇄한 나라 장터에서 밀수');
  act(g, 'ac_smuggle');
  check(!has(g, 'ac_smuggle'), '밀수는 한 달에 한 번');
  stay(g, 'leocast'); S.smugAt = null;
  check(!has(g, 'ac_smuggle'), '봉쇄 없는 곳에선 밀수가 안 보인다');
  // 담판
  check(!has(g, 'ac_mediate'), '사절이 아니면 담판 없음');
  g.player.skills.letters = 40; // 담판 솜씨는 시험용으로 넉넉히
  g.envoy ??= {}; g.envoy.post = { realm: 'valhart', role: 'envoy', since: 0, missions: 0, wins: 0, fails: 0, lastAt: -99 };
  S.disputes.push({ a: 'valhart', b: 'free', land: 'libera', heat: 60, peak: 60, since: 0 });
  check(has(g, 'ac_mediate'), '사절은 제 나라 다툼을 담판');
  for (let s = 1; s <= 6; s++) { S.medAt = -99; act(g, 'ac_mediate', s * 7919 + 13); }
  check(S.me.mediated >= 1, `담판이 한 번은 통한다 (${S.me.mediated})`);
  // 공작
  g.spy ??= {}; g.spy.org = { key: 'crown', name: '레오니아 왕실 밀정청', realm: 'leonia', rank: 1, trust: 30, trained: 20, known: 8, missions: 0 }; g.spy.heat = 0;
  addPact(g, 'elf', 'dwarf', 'alliance');
  S.secrets.push({ a: 'elf', b: 'beast', against: 'dwarf', since: 0, known: false });
  check(has(g, 'ac_spy'), '밀정은 나라 사이 공작');
  act(g, 'ac_spy');
  check(queued(g, 'ac_spywork'), '공작 장면');
  scene(g, 'ac_spywork', 'expose', 1);
  check(!has(g, 'ac_spy'), '공작은 넉 달에 한 번');
  // 순찰
  A(g).service = { unit: '붉은 창 백인대', rank: 2, merit: 0, since: 0, until: 999999 };
  g.realm.balhart.war = false; g.realm.balhart.tension = 60;
  check(cond(g, 'ac_patrol'), '십인장은 국경 순찰을 겪는다');
  const t0 = g.realm.balhart.tension; fire(g, 'ac_patrol', 0);
  check(g.realm.balhart.tension < t0, '활을 내리면 긴장이 내린다');
  fire(g, 'ac_patrol', 1);
  A(g).service = null;
  // 징집
  stay(g, 'eisen'); S.disputes = [{ a: 'valhart', b: 'free', land: 'libera', heat: 90, peak: 90, since: 0 }];
  check(cond(g, 'ac_levy'), '다툼이 칼끝까지 간 나라에 살면 징집');
  for (const c of [0, 1, 2]) fire(g, 'ac_levy', c, 3 + c);
  stay(g, 'leocast'); check(!cond(g, 'ac_levy'), '레오니아에선 이 징집이 없다 (군대 쪽이 맡는다)');
}

// 7. 화면 정보, 저장, 예전 저장, 대 잇기
{
  const g = adult('eisen', 31), S = AS(g);
  S.embargo.push({ by: 'valhart', on: 'free', since: g.date.year * 12, why: '시험' });
  S.disputes.push({ a: 'valhart', b: 'free', land: 'libera', heat: 40, peak: 40, since: g.date.year * 12 });
  S.me.smuggled = 2;
  const i = accordInfo(g);
  check(i && i.year === g.date.year && typeof i.line === 'string', '정보 모양');
  const KIND = ['ally', 'marriage', 'pact', 'trade', 'embargo', 'border', 'cold', 'war'];
  check(i.ties.length > 0 && i.ties.every((t) => KIND.includes(t.kind) && t.aName && t.bName && Number.isFinite(t.since) && t.since > 300 && t.since <= g.date.year), `ties 모양 ${JSON.stringify(i.ties.find((t) => !KIND.includes(t.kind) || !(t.since > 300)))}`);
  check(i.ties.some((t) => t.kind === 'embargo') && i.ties.some((t) => t.kind === 'border'), '봉쇄와 다툼이 ties에');
  check(i.here.length >= 2, '지금 있는 나라 이야기');
  check(i.me && i.me.text.includes('밀수'), '내가 한 일');
  textOK([i.line, ...i.here, ...i.ties.map((t) => t.text ?? ''), i.me.text, ...i.news.map((x) => x.text)], '정보 글');
  const back = decodeSave(encodeSave(g));
  check(back.accord?.embargo?.length === S.embargo.length && back.accord.me.smuggled === 2, '저장 왕복');
  delete back.accord.me.levied; delete back.accord.grudges;
  for (const f of HOOKS.migrate) f(back);
  check(back.accord.me.levied === 0 && Array.isArray(back.accord.grudges), '예전 저장에 새 칸');
  const old = mk(32); delete old.accord; for (const f of HOOKS.migrate) f(old);
  check(old.accord && old.accord.stance.valhart, '아주 예전 저장에도 나라 사이 흐름');
  for (const f of HOOKS.heir) f(g, makeRng({ s: 1 }), g.player);
  check(S.me.smuggled === 0 && S.embargo.length === 1, '대를 이으면 내 기록만 새로');
}

// 8. 무플레이 100년: 판도가 굴러가되 늘 전쟁도, 멈춤도 아니다
{
  const YEARS = 100, sum = { stance: 0, dispute: 0, embargo: 0 };
  for (const seed of [5, 41]) {
    const g = newGame({ name: '구경', sex: 'm', familyId: 'farmer', mode: 'free', seed });
    let warM = 0, embM = 0, dispM = 0;
    for (let m = 0; m < 12 * YEARS; m++) {
      if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; }
      const acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: (acts.find((x) => x.id === 'rest') ?? acts[0]).id })));
      let k = 0; while (g.pendingEvent && k++ < 6) resolveEvent(g, rngOf(g), g.pendingEvent.choices.length - 1);
      if (PS(g).wars.length) warM++; if (g.accord.embargo.length) embM++; if (g.accord.disputes.length) dispM++;
      check(g.accord.disputes.length <= 4 && g.accord.embargo.length <= 12, `${seed} 판이 터지지 않는다`);
    }
    const t = g.accord.tally;
    for (const k of Object.keys(sum)) sum[k] += t[k] ?? 0;
    check(warM < 12 * YEARS * 0.85, `${seed} 늘 전쟁은 아니다 (${warM}달)`);
    check(embM > 0 && dispM > 0 && embM < 12 * YEARS && dispM < 12 * YEARS, `${seed} 봉쇄·다툼이 있다가 없다가 (${embM}, ${dispM})`);
    textOK(g.accord.log.map((x) => x.text), `${seed} 대륙 기록`);
    if (process.env.SHOW) console.log(seed, JSON.stringify(t), warM, embM, dispM);
    check(accordLine(g).length > 4, '한 줄 요약');
  }
  check(sum.stance >= 10 && sum.dispute >= 10 && sum.embargo >= 4, `두 판 합쳐 성향·다툼·봉쇄가 굴러간다 ${JSON.stringify(sum)}`);
}

console.log(fail ? `실패 ${fail}` : '나라 사이 흐름 점검 모두 통과', `${((Date.now() - T0) / 1000).toFixed(1)}초`);
process.exit(fail ? 1 : 0);
