import './lsshim.js';
import '../src/content.js';
// 봉인의 흔들림 점검: 처음 상태, 단계와 세력 대응, 쐐기 도난·되찾기, 사건들(꿈·조사단·첩자·거래·쐐기·조각·회의·의식·깨진 뒤),
// 조사하기, 마지막 의식, 깨짐과 다시 묶임, 화면용, 예전 저장, 80년 흐름.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { crimeState } from '../src/crime.js';
import { sealState as SS, sealInfo, sealLine } from '../src/seal/index.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0, seed = 9) => {
  const e = ev(id), rng = makeRng({ s: seed });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const shown = e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.show || c.show(g, ctx));
  const text = e.text(g, ctx);
  check(!BAD.test(text), `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(({ c }) => c.label), choiceIdx: shown.map(({ i }) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && !BAD.test(out), `${id} 결과: ${out}`);
  crimeState(g).jailed = null;
  return out;
};
const grown = (g, y = 24) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
const rest = (g, n = 1) => { for (let i = 0; i < n; i++) { endMonth(g, [{ id: 'rest' }]); for (let k = 0; k < 8 && g.pendingEvent; k++) resolveEvent(g, rngOf(g), 0); } };

// 1) 처음: 봉인은 고요하고, 플레이어는 아무것도 모른다
{
  const g = newGame({ name: '처음', sex: 'm', familyId: 'farmer', mode: 'free', seed: 101 });
  const S = SS(g);
  check(S.stage === 0 && S.known === 0 && !S.ending && Object.values(S.wedges).every((w) => w === 'whole'), '처음 봉인 상태가 이상하다');
  const info = sealInfo(g);
  check(info.power == null && info.wedges.length === 0 && sealLine(g) == null, '모르는데 봉인 정보가 다 보인다');
  check(!availableActions(g).some((a) => a.id === 'seal_study'), '아기가 봉인을 조사한다');
}
// 2) 단계가 내려가면 세력이 움직인다
{
  const g = newGame({ name: '흔들림', sex: 'f', familyId: 'merchant', mode: 'free', seed: 102 });
  grown(g);
  const S = SS(g);
  g.realm.seal = 50; S.study = 20;
  rest(g, 3);
  check(S.stage >= 3, `봉인이 50인데 단계가 낮다 (${S.stage})`);
  check(S.stance.church === 'purge' && S.stance.crown === 'arm' && S.stance.tower === 'reinforce', `세력 대응이 안 바뀐다 ${JSON.stringify(S.stance)}`);
  check(S.known >= 1, '마물이 넘치는데 플레이어가 아무것도 모른다');
  // 3) 조사하기
  L(g).place = 'serenia'; g.player.stats.int = 60; g.player.skills.letters = 40;
  check(availableActions(g).some((a) => a.id === 'seal_study'), '세레니아에서 봉인 조사가 안 보인다');
  const st0 = S.study;
  for (let i = 0; i < 8; i++) { endMonth(g, [{ id: 'seal_study' }, { id: 'seal_study' }]); g.player.fatigue = 0; for (let k = 0; k < 8 && g.pendingEvent; k++) resolveEvent(g, rngOf(g), 0); L(g).place = 'serenia'; L(g).travel = null; }
  check(S.study > st0 && S.me.studied >= 2 && S.known >= 2, `조사해도 늘지 않는다 (${S.study} ${S.me.studied} ${S.known})`);
  check(sealInfo(g).wedges.length === 6 && sealInfo(g).stances.length === 4 && !BAD.test(sealLine(g)), '알게 된 뒤 화면 정보가 모자라다');
  // 4) 사건들
  if (g.crime) g.crime.jailed = null; // 조사하는 동안 다른 갈래(수배 등) 탓에 갇히는 판이 있다: 사건 조건만 본다
  check(cond(g, 'seal_scholar'), '조사단 사건이 안 뜬다');
  fire(g, 'seal_scholar', 0);
  S.spies = 4;
  L(g).place = 'harfen';
  check(cond(g, 'seal_spy_found'), '마족 첩자 사건이 안 뜬다');
  for (const c of [0, 1, 2, 3]) fire(g, 'seal_spy_found', c, 10 + c);
  g.player.manaAwakened = true; g.player.mana = 30; g.player.skills.magic = 30; S.spies = 4;
  check(cond(g, 'seal_demon_offer'), '마족의 거래가 안 뜬다');
  fire(g, 'seal_demon_offer', 0);
  check(S.me.pact && S.me.exploit >= 2, '마족과 거래했는데 남지 않는다');
  check(!cond(g, 'seal_demon_offer'), '이미 거래했는데 또 뜬다');
  // 쐐기를 노리는 밤: 막기 / 돕기
  L(g).place = 'leocast';
  check(cond(g, 'seal_wedge_raid'), '쐐기를 노리는 밤이 안 뜬다');
  g.player.skills.sword = 100; g.player.stats.str = 90; g.player.injuries = [];
  fire(g, 'seal_wedge_raid', 0, 1);
  L(g).place = 'hammer';
  fire(g, 'seal_wedge_raid', 1);
  check(S.wedges.hammer === 'stolen' && S.me.fragments >= 1, '도둑을 도왔는데 쐐기가 그대로다');
  check(sealInfo(g).wedges.find((w) => w.id === 'hammer').state === 'stolen', '도둑맞은 쐐기가 화면에 안 보인다');
  // 조각
  L(g).place = 'eisen';
  check(cond(g, 'seal_fragment_buyer'), '조각 사는 사람이 안 뜬다');
  const f0 = S.me.fragments; fire(g, 'seal_fragment_buyer', 1);
  check(S.me.fragments === f0 - 1, '조각을 넘겼는데 줄지 않는다');
  // 대륙 회의
  g.realm.seal = 40; rest(g, 1); L(g).place = 'solaris'; L(g).renown = 90; g.player.stats.cha = 90; S.council = null;
  check(cond(g, 'seal_council_voice'), '대륙 회의 사건이 안 뜬다');
  fire(g, 'seal_council_voice', 2, 4);
  check(['unite', 'split'].includes(S.council), '회의에서 말했는데 정해진 것이 없다');
  // 마지막 의식에 몸을 보탠다
  g.realm.seal = 18; S.rite = false; L(g).place = 'serenia'; g.player.mana = 400; g.player.skills.magic = 80;
  check(cond(g, 'seal_rite_call'), '마지막 의식 소집이 안 뜬다');
  fire(g, 'seal_rite_call', 0);
  check((S.riteHelp ?? 0) >= 2, '의식에 갔는데 남지 않는다');
  g.realm.seal = 12;
  rest(g, 1);
  check(S.ending === 'resealed' || g.realm.seal > 12 || S.log.some((l) => l.text.includes('실패')), `봉인이 바닥인데 마지막 의식이 없다 (${g.realm.seal})`);
  // 깨짐: 봉인이 0이면 깨지고, 세상은 계속된다
  S.ending = null; g.realm.seal = 0.01; S.rite = true; S.council = null; S.study = 0;
  Object.assign(S.stance, { church: 'deny', tower: 'observe', crown: 'deny', empire: 'exploit' });
  for (let i = 0; i < 3 && S.ending !== 'broken'; i++) { g.realm.seal = 0; rest(g, 1); }
  check(S.ending === 'broken' && sealLine(g) === '봉인: 깨졌다', '봉인이 0인데 깨지지 않는다');
  check(g.realm.monsters >= 50, '봉인이 깨졌는데 마물이 그대로다');
  if (!g.over) { check(cond(g, 'seal_after_break') || S.log.length > 0, '깨진 뒤 사건 조건이 이상하다'); if (cond(g, 'seal_after_break')) fire(g, 'seal_after_break', 2); }
  // 다시 묶일 수 있다
  S.stance.tower = 'reinforce'; S.council = 'unite'; S.study = 100;
  for (let i = 0; i < 1500 && S.ending === 'broken'; i++) { g.realm.seal = 0; rest(g, 1); if (g.over) break; }
  check(S.ending === 'resealed' || g.over, '교단과 마탑이 손잡아도 다시 묶이지 않는다');
  check(!BAD.test(JSON.stringify(sealInfo(g)).replace(/null/g, '0')), '화면 정보에 깨진 값');
  for (const l of S.log) check(!BAD.test(l.text), `봉인 기록 글 이상: ${l.text}`);
  // 5) 예전 저장
  const c = JSON.parse(JSON.stringify(g)); delete c.seal; setNextId(c.nextId);
  runHooks('migrate', c);
  check(c.seal?.wedges?.leocast === 'whole' && c.seal.me, '예전 저장에 봉인 상태가 채워지지 않는다');
}
// 6) 80년: 플레이어 없이도 봉인이 흔들리고, 끝은 판마다 다르다
{
  const ends = {}; let lowest = 100, highest = 0, years = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '세월', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 960 + run });
    let m = 0;
    for (; m < 12 * 80 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    years += m / 12;
    const S = SS(g);
    ends[S.ending ?? `단계${S.stage}`] = (ends[S.ending ?? `단계${S.stage}`] ?? 0) + 1;
    lowest = Math.min(lowest, g.realm.seal); highest = Math.max(highest, g.realm.seal);
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const l of S.log) if (BAD.test(l.text)) { check(false, `봉인 기록 이상: ${l.text}`); break; }
    check(Number.isFinite(g.realm.seal) && S.spies >= 0 && S.spies <= 12, '봉인 숫자가 깨졌다');
  }
  console.log(`봉인 ${Math.round(years)}년 4판: 끝 ${JSON.stringify(ends)}, 봉인 ${Math.round(lowest)}~${Math.round(highest)}`);
  check(highest < 95, '수십 년이 지나도 봉인이 전혀 흔들리지 않는다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
