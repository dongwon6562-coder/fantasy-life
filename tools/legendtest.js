import './lsshim.js';
import '../src/content.js';
// 큰 인물 점검: 처음 십강, 세월이 흐르며 늙고 죽고 자리가 바뀌는지, 만남·제자·적·은인, 대 잇기와 예전 저장.
import { newGame, endMonth, availableActions, slotsFor, rngOf, me } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { ENDS } from '../src/duel/registry.js';
import { makeRng } from '../src/rng.js';
import { LG, legend, tenGreats, playerScore, ranking } from '../src/legends/index.js';

let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };
const BAD = /undefined|NaN|\[object|null(?![가-힣])/;
const ev = (id) => EVENTS.find((e) => e.id === id);
const cond = (g, id) => { try { return !!ev(id).cond(g); } catch (e) { console.log(e); return false; } };
const fire = (g, id, choice = 0) => {
  const e = ev(id), rng = makeRng({ s: 99 });
  const ctx = e.prepare ? e.prepare(g, rng) ?? {} : {};
  const shown = e.choices.map((c, i) => ({ c, i })).filter(({ c }) => !c.show || c.show(g, ctx));
  const text = e.text(g, ctx);
  check(!BAD.test(text), `${id} 본문: ${text}`);
  g.pendingEvent = { id, title: e.title, text, choices: shown.map(({ c }) => (typeof c.label === 'function' ? c.label(g, ctx) : c.label)), choiceIdx: shown.map(({ i }) => i), ctx };
  const out = resolveEvent(g, rng, choice);
  check(typeof out === 'string' && !BAD.test(out), `${id} 결과: ${out}`);
  return out;
};
const grown = (g, years = 22) => { for (const p of g.people) p.ageMonths += years * 12; g.date.year += years; (g.flags ??= {}).adult = true; };

// 1) 처음: 설정 문서의 십강
{
  const g = newGame({ name: '처음', sex: 'm', familyId: 'farmer', mode: 'free', seed: 71 });
  const t = tenGreats(g);
  check(t.length === 10 && t[0].name === '노아 엘베르트' && t[3].name === '레온 발하르트', `처음 십강이 설정과 다르다 ${t.map((x) => x.name)}`);
  check(LG(g).list.every((x) => !x.met && !x.role), '처음부터 얽힌 인물이 있다');
  check(playerScore(g) < 30, `아기의 이름값이 너무 높다 ${playerScore(g)}`);
}
// 2) 만남: 검왕이 왕도에 왔을 때, 검이 손에 익은 젊은이
{
  const g = newGame({ name: '제자', sex: 'f', familyId: 'fallen_knight', mode: 'free', seed: 72 });
  grown(g);
  L(g).place = 'leocast'; legend(g, 'leon').at = 'leocast';
  g.player.skills.sword = 70;
  check(cond(g, 'legend_sighting'), '검왕을 먼발치에서 보는 사건이 안 뜬다');
  fire(g, 'legend_sighting', 0);
  check(legend(g, 'leon').seen, '먼발치에서 본 것이 남지 않는다');
  check(cond(g, 'legend_leon_eye'), '검왕의 시험이 안 뜬다');
  fire(g, 'legend_leon_eye', 0);
  check(g.pendingEvent?.id === 'duel_round', '검왕의 시험 결투가 시작되지 않았다');
  g.pendingEvent = null; g.duel = null;
  const out = ENDS.legend_leon(g, makeRng({ s: 1 }), true, { round: 7, hp: 50, hp0: 100 });
  check(legend(g, 'leon').role === 'master' && !BAD.test(out), '시험을 통과해도 제자가 되지 않는다');
  check(availableActions(g).some((a) => a.id === 'legend_lesson'), '스승이 곁에 있는데 배우기가 없다');
  const sw = g.player.skills.sword;
  endMonth(g, [{ id: 'legend_lesson' }]);
  check(g.player.skills.sword > sw, '스승에게 배워도 검술이 늘지 않는다');
  // 대 잇기: 스승의 인연은 끊기고, 원수는 남는다
  legend(g, 'garum').role = 'foe'; legend(g, 'garum').bond = -50;
  runHooks('heir', g, makeRng({ s: 3 }));
  check(legend(g, 'leon').role === null && legend(g, 'garum').role === 'foe', '대 잇기 뒤 스승·원수가 맞지 않다');
}
// 3) 마그누스, 세실리아, 가룸, 용왕, 마왕들, 노아: 조건이 맞으면 뜨고, 고르면 얽힌다
{
  const g = newGame({ name: '얽힘', sex: 'm', familyId: 'merchant', mode: 'free', seed: 73 });
  grown(g, 26);
  const p = g.player;
  p.manaAwakened = true; p.mana = 999; p.skills.magic = 95; g.magic.certified = 4;
  L(g).place = 'serenia'; legend(g, 'magnus').at = 'serenia';
  check(cond(g, 'legend_magnus_audience'), '협회장 접견이 안 뜬다');
  fire(g, 'legend_magnus_audience', 0);
  check(legend(g, 'magnus').role === 'patron', '협회장의 후원이 남지 않는다');
  // 세실리아: 공인 없는 고서클은 쫓긴다
  const g2 = newGame({ name: '쫓김', sex: 'f', familyId: 'farmer', mode: 'free', seed: 74 });
  grown(g2, 24);
  g2.player.manaAwakened = true; g2.player.mana = 999; g2.player.skills.magic = 70;
  L(g2).place = 'harfen'; legend(g2, 'cecilia').at = 'harfen';
  check(cond(g2, 'legend_cecilia_hunt'), '세실리아의 심문이 안 뜬다');
  fire(g2, 'legend_cecilia_hunt', 0);
  // 가룸
  L(g2).place = 'fur'; legend(g2, 'garum').at = 'fur'; g2.player.stats.str = 40;
  check(cond(g2, 'legend_garum_raid'), '가룸의 부탁이 안 뜬다');
  fire(g2, 'legend_garum_raid', 2);
  check(legend(g2, 'garum').role === 'foe', '노예 수레를 밀고해도 가룸의 적이 되지 않는다');
  check(cond(g2, 'legend_foe_reprisal'), '원수의 보복이 안 뜬다');
  fire(g2, 'legend_foe_reprisal', 0);
  // 용왕 세 걸음
  L(g2).place = 'barka';
  check(cond(g2, 'legend_dragon_scholar'), '청동빛 눈의 학자가 안 뜬다');
  fire(g2, 'legend_dragon_scholar', 0);
  g2.date.year += 1;
  check(cond(g2, 'legend_dragon_clue'), '용왕의 둘째 걸음이 안 뜬다');
  fire(g2, 'legend_dragon_clue', 0);
  g2.date.year += 1;
  check(cond(g2, 'legend_dragon_reveal'), '용왕의 셋째 걸음이 안 뜬다');
  fire(g2, 'legend_dragon_reveal', 0);
  check(legend(g2, 'bronze').role === 'patron', '용왕이 은인이 되지 않는다');
  g2.player.money = 0;
  check(cond(g2, 'legend_patron_aid'), '은인의 도움이 안 뜬다');
  fire(g2, 'legend_patron_aid', 0);
  // 노아는 5서클에게만
  check(!cond(g2, 'legend_noah_voice'), '5서클도 아닌데 노아의 목소리가 들린다');
  check(cond(g, 'legend_noah_voice'), '5서클인데 노아의 목소리가 안 들린다');
  fire(g, 'legend_noah_voice', 0);
  // 마왕들
  L(g).place = 'graubel';
  check(cond(g, 'legend_eleanor_letter'), '황혼의 편지가 안 뜬다');
  fire(g, 'legend_eleanor_letter', 1);
  check(legend(g, 'eleanor').role === 'foe', '고발해도 여마왕의 적이 되지 않는다');
}
// 4) 강해지면 십강에 오르고, 사건이 뜬다
{
  const g = newGame({ name: '십강', sex: 'm', familyId: 'fallen_knight', mode: 'free', seed: 75 });
  grown(g, 30);
  g.player.skills.sword = 100; g.sword = { school: 'yusu', rank: 4, master: null, tests: 3 }; L(g).renown = 300;
  for (const k of Object.keys(g.player.stats)) g.player.stats[k] = 70;
  check(ranking(g).includes('player'), `검왕급인데 십강에 못 든다 (${playerScore(g)})`);
  g.date.month = 12;
  let saw = false;
  for (let m = 0; m < 12 && !saw; m++) { // 한 달에 사건은 하나라, 밀린 사건이 먼저 나올 수 있다
    endMonth(g, [{ id: 'rest' }]);
    for (let i = 0; i < 6 && g.pendingEvent; i++) { if (g.pendingEvent.id === "legend_rank_entry") saw = true; resolveEvent(g, rngOf(g), 0); }
  }
  check(LG(g).playerRank != null, '한 해가 끝나도 십강 순위가 매겨지지 않는다');
  check(saw, '십강에 올랐다는 사건이 안 뜬다');
}
// 5) 예전 저장: g.legends가 없던 때
{
  const g = newGame({ name: '옛', sex: 'f', familyId: 'farmer', mode: 'free', seed: 76 });
  const c = JSON.parse(JSON.stringify(g)); delete c.legends; setNextId(c.nextId);
  runHooks('migrate', c);
  check(c.legends?.list?.length === 10, '예전 저장에 큰 인물이 채워지지 않는다');
}
// 6) 60년이 흐르면: 늙은 사람은 죽고, 빈자리를 누군가 잇고, 글이 깨지지 않는다
{
  let deaths = 0, newcomers = 0, magnusGone = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '세월', sex: run % 2 ? 'm' : 'f', familyId: ['farmer', 'merchant', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 500 + run });
    for (let m = 0; m < 12 * 60 && !g.over; m++) {
      const rng = rngOf(g);
      const acts = availableActions(g);
      endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    const lg = LG(g);
    deaths += lg.list.filter((x) => !x.alive).length;
    newcomers += lg.list.filter((x) => /^[nr]\d/.test(x.id)).length;
    if (!legend(g, 'magnus')?.alive) magnusGone++;
    check(tenGreats(g).length >= 8, `60년 뒤 십강이 비었다 ${tenGreats(g).length}`);
    check(legend(g, 'noah')?.alive, '노아가 죽었다');
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
    for (const c of g.realm.log) if (BAD.test(c.text)) { check(false, `연대기 글 이상: ${c.text}`); break; }
    if (run === 0) console.log('60년 뒤 십강:', tenGreats(g).map((x) => `${x.rank}.${x.title} ${x.name}`).join(' / '));
  }
  console.log(`60년 4판: 죽은 큰 인물 평균 ${deaths / 4}, 새로 오른 사람 평균 ${newcomers / 4}, 마그누스 사망 ${magnusGone}/4`);
  check(magnusGone >= 3, '여든여덟 살 협회장이 60년 뒤에도 살아 있다');
  check(newcomers / 4 >= 1, '빈자리를 잇는 사람이 없다');
}
void me;
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
