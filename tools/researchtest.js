import './lsshim.js';
import '../src/content.js';
// 연구 점검: 연구실이 있는 곳에서만, 고르고, 한 달씩 품을 들여, 발명은 세상에 나오고(시대가 당겨짐) 새 물건은 손에 남는다.
// 도용·노트 사기·늙은 손, 대 잇기와 예전 저장, 30년 흐름.
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent, EVENTS } from '../src/events.js';
import { run as runHooks } from '../src/hooks.js';
import { setNextId } from '../src/npc.js';
import { L } from '../src/adventure/core.js';
import { makeRng } from '../src/rng.js';
import { researchState as RS, madeThings, researchLine } from '../src/research/index.js';
import { WORK } from '../src/jobs.js';

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
  return out;
};
const grown = (g, y = 20) => { for (const p of g.people) p.ageMonths += y * 12; g.date.year += y; (g.flags ??= {}).adult = true; };
// 장면은 다른 사건이 먼저 떠 있으면 다음 달로 밀린다: 몇 달을 쉬며 기다린다
const pickScene = (g, word) => {
  for (let m = 0; m < 4; m++) {
    for (let k = 0; k < 6 && g.pendingEvent; k++) {
      const pe = g.pendingEvent;
      const i = pe.id === 'life_scene' ? pe.choices.findIndex((c) => c.includes(word)) : -1;
      resolveEvent(g, rngOf(g), i >= 0 ? i : 0);
      if (i >= 0) return true;
    }
    endMonth(g, [{ id: 'rest' }]);
  }
  return false;
};

// 1) 어디서 연구할 수 있나
{
  const g = newGame({ name: '연구', sex: 'm', familyId: 'merchant', mode: 'free', seed: 81 });
  grown(g);
  g.player.stats.int = 40; g.player.money = 500;
  check(!availableActions(g).some((a) => a.id === 'research'), '에른에서도 연구할 수 있다');
  L(g).place = 'harfen';
  check(availableActions(g).some((a) => a.id === 'research'), '하르펜 공방에서 연구가 안 보인다');
  // 2) 발명을 골라 끝까지
  endMonth(g, [{ id: 'research' }]);
  check(pickScene(g, '화석'), '연구 고르기에 화석이 없다');
  check(RS(g).project?.id === 'firestone', '고른 연구가 남지 않았다');
  g.player.stats.int = 90; g.player.skills.magic = 60;
  // 세상이 먼저 내놓지 못하게 시대를 조금 뒤로 (그 경주는 아래 경쟁·도용 점검이 맡는다)
  g.realm.tech = Math.min(g.realm.tech, 0.0);
  let months = 0;
  while (RS(g).project && months++ < 40) { endMonth(g, [{ id: 'research' }, { id: 'research' }]); g.player.fatigue = 0; g.player.injuries = []; for (let k = 0; k < 6 && g.pendingEvent && g.pendingEvent.id !== 'research_claim'; k++) resolveEvent(g, rngOf(g), 0); if (g.pendingEvent?.id === 'research_claim' || RS(g).claim) break; }
  check(!RS(g).project, `40달이 지나도 화석 연구가 끝나지 않는다 (${researchLine(g)})`);
  let guard = 0;
  while (!g.pendingEvent && RS(g).claim && guard++ < 6) endMonth(g, [{ id: 'rest' }]);
  check(g.pendingEvent?.id === 'research_claim', `발명에 이름 거는 사건이 안 뜬다 (${g.pendingEvent?.id})`);
  const tech0 = g.realm.tech;
  resolveEvent(g, rngOf(g), 0);
  check(g.history.inventions.includes('firestone') && RS(g).invented.includes('firestone'), '내 이름으로 낸 발명이 역사에 없다');
  check(g.realm.tech >= 0.35 && g.realm.tech >= tech0, '발명을 냈는데 시대가 당겨지지 않았다');
  check(RS(g).royalty > 0, '사용료가 생기지 않았다');
  check(g.realm.log.some((x) => x.text.includes('연구')), '연대기에 내 발명이 없다');
  // 3) 새 물건
  g.history.inventions.push('streetlamp', 'warmstone');
  RS(g).project = { kind: 'design', id: 'kiln', prog: 0.97, months: 3, fails: 0 };
  const m0 = g.player.money;
  for (let k = 0; k < 6 && RS(g).project?.id === 'kiln'; k++) { endMonth(g, [{ id: 'research' }]); g.player.injuries = []; } // 막다른 길이 나와도 몇 달이면 된다
  check(madeThings(g).some((x) => x.id === 'kiln'), `온석 가마가 만들어지지 않았다 ${JSON.stringify(RS(g).project)}`);
  void m0;
  // 4) 경쟁과 도용
  let stolen = false;
  for (let s = 1; s < 40 && !stolen; s++) {
    RS(g).project = { kind: 'invent', id: 'manamill', prog: 0.6, months: 5, fails: 0 }; RS(g).rivalSeen = [];
    g.history.inventions = g.history.inventions.filter((x) => x !== 'manamill');
    check(cond(g, 'research_rival'), '경쟁자 사건이 안 뜬다');
    fire(g, 'research_rival', 2, s);
    stolen = !RS(g).project;
  }
  check(stolen && g.history.inventions.includes('manamill') && RS(g).stolen.includes('manamill'), '도둑맞은 발명이 남의 이름으로 나오지 않았다');
  syncCheck: {
    endMonth(g, [{ id: 'rest' }]);
    check(WORK.millhand.places.includes('harfen'), '도둑맞았어도 세상에 나온 마석 방아의 일자리가 안 열린다');
  }
  check(cond(g, 'research_sue'), '도둑맞은 뒤 따지는 사건이 안 뜬다');
  fire(g, 'research_sue', 0);
  // 5) 노트 사기, 늙은 손, 사러 온 사람
  RS(g).project = { kind: 'invent', id: 'press', prog: 0.2, months: 4, fails: 2 };
  g.realm.tech = Math.max(g.realm.tech, 1.0);
  check(cond(g, 'research_spy_offer'), '노트를 파는 사건이 안 뜬다');
  fire(g, 'research_spy_offer', 0);
  check(RS(g).project.prog >= 0.45, '산 노트가 연구를 당기지 않았다');
  check(cond(g, 'research_mentor'), '늙은 손 사건이 안 뜬다');
  fire(g, 'research_mentor', 0);
  check(cond(g, 'research_buyer'), '물건을 사러 온 사람이 안 뜬다');
  fire(g, 'research_buyer', 0);
  // 6) 대 잇기: 하던 연구는 노트만 남는다
  const before = RS(g).project.prog;
  runHooks('heir', g, makeRng({ s: 2 }));
  check(RS(g).project.prog < before && madeThings(g).length >= 1, '대 잇기 뒤 연구·물건이 맞지 않다');
  // 마탑은 공인 없이는 닫혀 있다
  L(g).place = 'serenia'; g.player.skills.magic = 5; g.magic.certified = 0;
  endMonth(g, [{ id: 'research' }]);
  check(g.lastResults.some((r) => /문지기/.test(r.text)), '공인 없이 마탑에 들어갔다');
}
// 7) 예전 저장
{
  const g = newGame({ name: '옛', sex: 'f', familyId: 'farmer', mode: 'free', seed: 82 });
  const c = JSON.parse(JSON.stringify(g)); delete c.research; setNextId(c.nextId);
  runHooks('migrate', c);
  check(Array.isArray(c.research?.made), '예전 저장에 연구 상태가 채워지지 않는다');
}
// 8) 30년: 연구를 자주 고르는 사람
{
  let inv = 0, made = 0, tried = 0;
  for (let run = 0; run < 4; run++) {
    const g = newGame({ name: '흐름', sex: run % 2 ? 'm' : 'f', familyId: ['merchant', 'farmer', 'fallen_knight', 'dwarf_smith'][run], mode: 'free', seed: 600 + run });
    for (let m = 0; m < 12 * 35 && !g.over; m++) {
      const rng = rngOf(g);
      if (m === 12 * 15) { L(g).place = ['harfen', 'leocast', 'harfen', 'hammer'][run]; g.player.stats.int = Math.max(g.player.stats.int, 35); }
      const acts = availableActions(g);
      const choices = [];
      for (let i = 0; i < slotsFor(g); i++) {
        const r = acts.find((a) => a.id === 'research');
        choices.push({ id: r && rng.chance(0.5) ? 'research' : rng.pick(acts.filter((a) => a.id !== 'travel' && a.id !== 'move')).id ?? 'rest' });
        if (choices[i].id === 'research') tried++;
      }
      endMonth(g, choices);
      g.player.money = Math.max(g.player.money, 20);
      let k = 0;
      while (g.pendingEvent && k++ < 40) resolveEvent(g, rngOf(g), rngOf(g).int(0, Math.max(0, g.pendingEvent.choices.length - 1)));
    }
    inv += RS(g).invented.length + RS(g).sold.length; made += RS(g).made.length;
    for (const c of g.chronicle) if (BAD.test(c.text)) { check(false, `기록 글 이상: ${c.text}`); break; }
  }
  console.log(`35년 4판: 연구 칸 ${tried}, 앞당긴 발명 평균 ${inv / 4}, 만든 새 물건 평균 ${made / 4}`);
  check(inv + made >= 2, '연구를 자주 골라도 아무것도 만들어지지 않는다');
}
console.log(fail ? `FAIL ${fail}` : 'OK');
if (fail) process.exit(1);
