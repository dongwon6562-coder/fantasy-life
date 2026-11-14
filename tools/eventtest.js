import '../src/content.js';
// 사건 점검: 여러 판을 돌리며, 조건이 맞는 모든 사건의 모든 선택지를 복사본 게임에서 실행해 본다.
// (드물게 나오는 갈래에서 오류가 숨어 있지 않은지, 세계 흐름이 굴러가는지 확인)
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { EVENTS, resolveEvent } from '../src/events.js';
import { makeRng } from '../src/rng.js';
import { worldSummary } from '../src/world.js';

// 일부러 만드는 상황들
const peer = (g) => g.people.find((p) => p.alive && !p.isPlayer && !g.player.familyIds.includes(p.id));
const back = (g) => { g.date.year -= 1; }; // 사건 줄기의 '때'가 이미 지난 것으로
const SCENARIOS = [
  (g) => { g.realm.succession = 'civilwar'; g.realm.balhart.war = true; g.realm.north.war = true; g.flags.seen_harfen = true; },
  (g) => { g.realm.tech = 5; g.realm.era = 3; g.realm.bread = 1.9; g.world.famine = true; g.world.plague = true; },
  (g) => { g.player.manaAwakened = true; g.player.mana = 300; g.player.skills.magic = 60; g.player.skills.sword = 50; g.player.skills.letters = 30; },
  (g) => { g.people.find((p) => p.isPlayer).ageMonths = 52 * 12; },
  ...[1, 2].flatMap((step) => [
    (g) => { g.chains = { illness: { step, at: 0, data: { id: g.player.familyIds[1], care: 1 } } }; },
    (g) => { g.chains = { fatherwar: { step, at: 0, data: {} } }; },
    (g) => { g.chains = { darkmage: { step, at: 0, data: {} } }; },
    (g) => { g.chains = { missing: { step, at: 0, data: { id: peer(g)?.id, joined: true, plan: 'sneak' } } }; },
    (g) => { g.chains = { missing: { step, at: 0, data: { id: peer(g)?.id, joined: false, plan: 'adults' } } }; },
    (g) => { g.chains = { stone: { step, at: 0, data: {} } }; },
    (g) => { g.chains = { loan: { step, at: 0, data: { owe: 40 } } }; g.player.money = step === 1 ? 50 : 0; },
    (g) => { g.chains = { friend: { step, at: 0, data: { id: peer(g)?.id } } }; },
    (g) => { g.chains = { swordsman: { step, at: 0, data: {} } }; },
  ]),
];

let fail = 0;
const tried = new Set();
const errs = new Map();
const fams = ['farmer', 'fallen_knight', 'merchant'];
for (let run = 0; run < 9; run++) {
  const g = newGame({ name: '점검', sex: run % 2 ? 'm' : 'f', familyId: fams[run % 3], mode: 'free', seed: 9000 + run });
  if (run % 4 === 0) { g.player.manaPotential = 0.9; }
  for (let m = 0; m < 12 * 40 && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const a = rng.pick(acts);
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive)?.id;
      choices.push(c);
    }
    endMonth(g, choices);
    if (g.pendingEvent) resolveEvent(g, rngOf(g), m % g.pendingEvent.choices.length);
    if (m % 13 !== 0) continue;
    // 지금 조건이 맞는 사건을 전부 복사본에서 실행. 가끔은 일부러 상황을 만들어서(전쟁, 사건 줄기 중간 등).
    const states = [g];
    if (m % 117 === 0) for (const sc of SCENARIOS) { const c = JSON.parse(JSON.stringify(g)); sc(c); states.push(c); }
    for (const st of states) tryAll(st, m, run);
  }
  if (run === 0) console.log(worldSummary(g).join(' / '));
}

function tryAll(g, m, run) {
    for (const e of EVENTS) {
      let ok = false;
      try { ok = e.cond(g); } catch { ok = false; }
      if (!ok) continue;
      const base = JSON.stringify(g);
      const prng = makeRng({ s: m * 31 + run });
      for (let ci = 0; ci < e.choices.length; ci++) {
        const copy = JSON.parse(base);
        try {
          const ctx = e.prepare ? e.prepare(copy, prng) ?? {} : {};
          const text = e.text(copy, ctx);
          if (typeof text !== 'string' || !text || /undefined|NaN|\[object/.test(text)) throw new Error('bad text: ' + text);
          if (e.choices[ci].show && !e.choices[ci].show(copy, ctx)) continue;
          const out = e.choices[ci].run(copy, prng, ctx);
          if (typeof out !== 'string' || /undefined|NaN|\[object/.test(out)) throw new Error('bad result: ' + out);
          for (const v of Object.values(copy.player.stats)) if (!Number.isFinite(v)) throw new Error('stat NaN');
          if (!Number.isFinite(copy.player.money) || !Number.isFinite(copy.player.familyMoney)) throw new Error('money NaN');
          tried.add(e.id);
        } catch (err) {
          const k = `${e.id}#${ci}`;
          if (!errs.has(k)) errs.set(k, err.message);
        }
      }
    }
}
for (const [k, v] of errs) { fail++; console.log('FAIL', k, v); }
const mine = EVENTS.filter((e) => !/^(talk_|rel_)/.test(e.id));
const never = mine.filter((e) => !tried.has(e.id)).map((e) => e.id);
console.log(`사건 ${EVENTS.length}개 (사건 묶음 ${mine.length}개), 실행해 본 사건 ${tried.size}개`);
if (never.length) console.log('조건이 한 번도 맞지 않은 사건:', never.join(', '));
console.log(fail ? `FAIL ${fail}` : 'OK');
process.exitCode = fail ? 1 : 0;
