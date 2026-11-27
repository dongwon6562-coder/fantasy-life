import '../src/content.js';
// 결투 점검: 낌새를 읽는 쪽이 무작위보다 잘 이기는지, 한 수만 반복하면 읽히는지, 실력 차가 의미 있는지.
// 그리고 결투가 언제나 끝나는지, 글에 빈칸이 없는지.
import { newGame, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { startDuel } from '../src/duel/duel.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
const TELL = { heavy: ['높이 끌어올', '어깨에 힘', '크게 내디'], quick: ['가볍게 떨', '몸을 낮추', '손목이 풀려'], guard: ['반걸음 물러', '칼끝만 좇', '발을 넓게'], feint: ['서로 다른 곳', '빈틈을 보이', '옅은 웃음'] };
const COUNTER = { heavy: 'quick', quick: 'guard', guard: 'feint', feint: 'heavy' };
const LABEL_KEY = { heavy: '강공', quick: '속공', guard: '막기', feint: '허초', wait: '간을' };

function play(strategy, skill, foeSkill, seed, style = 'steady') {
  const g = newGame({ name: '검사', sex: 'm', familyId: 'fallen_knight', mode: 'free', seed });
  g.people.find((p) => p.isPlayer).ageMonths = 25 * 12; // 어른의 대련 (15살 아래는 다섯 합에서 끝난다)
  g.player.skills.sword = skill; g.player.stats.agi = 30; g.player.stats.str = 30; g.player.stats.sen = 30;
  const rng = rngOf(g);
  startDuel(g, rng, { kind: 'spar', title: '시험', foe: { name: '상대', skill: foeSkill, style } });
  let rounds = 0, last = '';
  while (g.pendingEvent?.id === 'duel_round' && rounds < 40) {
    const pe = g.pendingEvent;
    if (/undefined|NaN/.test(pe.text + pe.title + pe.choices.join())) { fail++; console.log('FAIL bad text', pe.text); }
    let want;
    if (strategy === 'random') want = rng.pick(['heavy', 'quick', 'guard', 'feint']);
    else if (strategy === 'spam') want = 'heavy';
    else {
      const t = Object.entries(TELL).find(([, ks]) => ks.some((k) => pe.text.includes(k)));
      want = t ? COUNTER[t[0]] : (strategy === 'reader' ? 'wait' : rng.pick(['heavy', 'quick', 'guard', 'feint']));
    }
    let idx = pe.choices.findIndex((c) => c.includes(LABEL_KEY[want]));
    if (idx < 0) idx = 0;
    last = resolveEvent(g, rngOf(g), idx);
    rounds++;
  }
  ok(rounds < 40, 'duel did not end');
  ok(typeof last === 'string' && !/undefined|NaN/.test(last), 'bad end text ' + last);
  return (g.duelStats?.wins ?? 0) > 0;
}
const rate = (strategy, skill, foe, style) => { let w = 0; for (let i = 0; i < 300; i++) w += play(strategy, skill, foe, 100 + i, style) ? 1 : 0; return w / 300; };
const even = { random: rate('random', 40, 40), reader: rate('reader', 40, 40), spam: rate('spam', 40, 40) };
console.log('같은 실력:', JSON.stringify(even));
ok(even.reader > even.random + 0.1, '낌새를 읽는 쪽이 더 잘 이겨야 한다');
ok(even.spam < even.random, '한 수만 반복하면 읽혀야 한다');
const weak = rate('random', 20, 50), strong = rate('random', 70, 40);
console.log('약할 때(20 대 50):', weak, '강할 때(70 대 40):', strong);
ok(weak < 0.2 && strong > 0.8, '실력 차가 결과를 크게 좌우해야 한다');
const tricky = rate('reader', 40, 40, 'tricky');
console.log('교활한 상대에게 읽기:', tricky);
ok(tricky < even.reader, '교활한 상대는 낌새로 속인다');

// ---------- 흐름 점검: 유파 입문 → 수련 → 승급 대련, 주문 연구 → 마법 일, 승급 시험 ----------
import { endMonth, availableActions, playerAge } from '../src/game.js';
import { ACTIONS } from '../src/actions.js';
const act = (g, id) => { const a = availableActions(g).find((x) => x.id === id); return a; };
const month = (g, ids) => { endMonth(g, ids.map((id) => ({ id }))); };
const drive = (g, pickFn) => { let n = 0; while (g.pendingEvent && n++ < 60) { const pe = g.pendingEvent; resolveEvent(g, rngOf(g), pickFn(pe)); } ok(n < 60, 'event loop'); };
{
  const g = newGame({ name: '검사', sex: 'm', familyId: 'fallen_knight', mode: 'free', seed: 4242 });
  // 아버지(퇴역 기사)가 살아 있으면 유수류에 들 수 있다
  while (playerAge(g) < 10) { month(g, []); drive(g, () => 0); }
  g.flags.school = null; g.sword = { school: null, rank: -1, master: null, tests: 0 };
  const f = g.people.find((p) => p.id === g.player.familyIds[0]); f.alive = true; f.away = false; f.drafted = null; Object.assign(g.realm.balhart, { war: false, tension: 20 }); // 45단계 나라 사이 흐름으로 주사위가 밀려 발하르트 전쟁에 아버지가 징집되던 것: 시험 준비만 고정
  ok(!!act(g, 'sword_school_join'), '유파 입문 행동이 보여야 한다');
  month(g, ['sword_school_join']);
  ok(g.pendingEvent?.id === 'sword_join', '입문 사건이 떠야 한다 ' + g.pendingEvent?.id);
  resolveEvent(g, rngOf(g), 0);
  ok(g.sword.school === 'yusu' && g.sword.rank === 0, '유수류 입문');
  g.player.skills.sword = 31;
  ok(!!act(g, 'sword_rank_test'), '승급 대련 행동');
  month(g, ['sword_rank_test']);
  ok(g.pendingEvent?.id === 'duel_start', '결투 시작 사건 ' + g.pendingEvent?.id);
  drive(g, (pe) => (pe.id === 'duel_round' ? pe.choices.findIndex((c) => c.includes('막기')) : 0));
  ok(!g.duel && !g.duelQueued, '결투가 끝나야 한다');
  console.log('승급 대련 뒤 등급:', g.sword.rank, '전적', JSON.stringify(g.duelStats));
}
{
  const g = newGame({ name: '마법사', sex: 'f', familyId: 'merchant', mode: 'free', seed: 777 });
  while (playerAge(g) < 13) { month(g, []); drive(g, () => 0); }
  const P = g.player; P.manaAwakened = true; P.mana = 60; P.skills.magic = 35; P.skills.letters = 30; P.stats.int = 40; P.money = 500;
  let learned = 0;
  for (let i = 0; i < 40 && act(g, 'spell_study'); i++) { month(g, ['spell_study']); drive(g, () => 0); learned = g.magic.known.length; }
  console.log('익힌 주문:', g.magic.known.join(','));
  ok(learned >= 5, '2서클까지의 주문을 익혀야 한다');
  ok(!g.magic.known.some((id) => ['firering', 'lightning', 'firestorm'].includes(id)), '서클보다 높은 주문은 못 익힌다');
  const m0 = P.money; month(g, ['spell_work']); drive(g, (pe) => pe.choices.length - 1); // 48단계 도우미3: 같은 달 뜬 다른 사건(저주받은 물건 사기 등)에서 돈을 쓰지 않게 맨 끝(무난한) 선택
  ok(P.money > m0 - 1, '마법 일로 돈을 번다');
  g.life.place = 'harfen';
  ok(!!act(g, 'circle_exam'), '하르펜에서 승급 시험');
  month(g, ['circle_exam']);
  ok(g.pendingEvent?.id === 'circle_exam_run', '시험 사건 ' + g.pendingEvent?.id);
  drive(g, (pe) => (pe.id === 'duel_round' ? pe.choices.findIndex((c) => c.includes('간을')) >= 0 && rngOf(g).chance(0.3) ? pe.choices.findIndex((c) => c.includes('간을')) : 0 : 0));
  ok(!g.magic.exam, '시험이 끝나야 한다');
  console.log('공인 서클:', g.magic.certified);
}
console.log(fail ? `FAIL ${fail}` : 'OK');
process.exitCode = fail ? 1 : 0;
