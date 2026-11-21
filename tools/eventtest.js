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
  // 3단계: 검과 마법
  (g) => {
    const P = g.player; P.manaAwakened = true; P.mana = 300; P.skills.magic = 62; P.skills.sword = 82; P.stats.wil = 60; P.money = 200;
    g.sword = { school: 'yusu', rank: 2, master: null, tests: 1 };
    g.magic = { known: ['mend', 'infuse', 'cure', 'sense'], certified: 4, exam: null, study: null, works: 3 };
    g.duelStats = { wins: 7, losses: 1 }; g.realm.era = 2; g.flags.rival = g.people.find((p) => p.alive && !p.isPlayer)?.id;
    if (g.people.find((p) => p.isPlayer).ageMonths < 18 * 12) g.people.find((p) => p.isPlayer).ageMonths = 18 * 12;
  },
  (g) => { g.life.place = 'leocast'; g.player.skills.sword = 60; g.sword = { school: 'ganggeom', rank: 1, master: null, tests: 0 }; g.magic.certified = 1; g.player.manaAwakened = true; g.player.mana = 50; g.player.skills.magic = 35; },
  (g) => { g.swordJoinQueued = true; g.player.manaAwakened = true; g.player.mana = 20; g.player.skills.magic = 20; g.magic.exam = { target: 1, stage: 0, score: 0, place: 'harfen' }; },
  (g) => { g.duelQueued = { kind: 'spar', title: '목검 대련', foe: { name: '시험 상대', skill: 30, style: 'swift' }, ctx: {} }; },
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
  // 6단계: 시대 (발명이 다 나온 세계, 도시)
  ...['harfen', 'leocast'].map((pl) => (g) => {
    g.history.inventions = ['firestone', 'streetlamp', 'warmstone', 'manamill', 'press', 'signal', 'erngrind', 'plow', 'forge', 'healstone', 'ironcart', 'railroad'];
    g.realm.era = 3; g.realm.tech = 5; g.life.place = pl; g.life.travel = null; g.realm.balhart.war = true;
    g.era = { goods: { lantern: 1, warmstone: 1, firestone: 1, healband: 2 } };
    const meP = g.people.find((p) => p.isPlayer); if (meP.ageMonths < 20 * 12) meP.ageMonths = 20 * 12;
    g.player.skills.letters = 30;
    const f = g.people.find((p) => p.alive && !p.isPlayer); if (f) { f.away = true; f.known = true; f.affection = 30; }
  }),
  // 5단계: 어린 시절 줄기 (나이를 맞추고 단계마다)
  ...[[6, 1], [9, 2], [10, 3], [13, 4], [15, 5], [25, 9]].map(([yrs, stage]) => (g) => {
    const meP = g.people.find((p) => p.isPlayer); meP.ageMonths = yrs * 12 + 1;
    g.life.place = 'ern'; g.life.travel = null;
    const f = g.people.find((p) => p.alive && !p.isPlayer && !p.away && (p.place ?? 'ern') === 'ern' && !g.player.familyIds.includes(p.id));
    const c = g.childhood;
    c.friend = f?.id ?? null;
    Object.assign(c.bestie, { stage, at: 0, den: 'willow', quarrel: stage === 3 ? 'fought' : 'mended', promise: stage >= 5 ? ['leave', 'stay', 'wedding'][yrs % 3] : null, parted: null });
    c.counts = { study: 20, play: 30 }; c.school.stage = yrs <= 9 ? 0 : yrs <= 12 ? 1 : 2;
    g.player.skills.letters = 35; c.pendingDeath = g.player.familyIds[1] ?? null;
    c.firstDeath = yrs >= 25 ? { id: g.player.familyIds[0], name: '아버지', grief: 'stone', y: g.date.year - 10 } : null;
    c.knownAs = yrs >= 25 ? 'blade' : null; if (yrs === 15) g.flags.adult = true;
    if (yrs >= 25) { g.flags.child_recommend = true; g.life.place = 'harfen'; g.date.month = 11; }
  }),
];

// 같은 사건의 같은 선택지는 열여섯 번까지만 해 본다 (25단계 헤드: 흔한 사건을 수백 번씩 복사본에서 돌려 이 점검 하나가 7분이었다).
// 조건이 드물게 맞는 사건은 그대로 다 해 보므로 해 보는 사건 목록은 줄지 않는다.
const CAP = 16;
const runs = new Map();
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
    let base = null; // 해 볼 사건이 있을 때 한 번만 글로 바꾼다
    for (const e of EVENTS) {
      if (e.choices.every((_, ci) => (runs.get(`${e.id}#${ci}`) ?? 0) >= CAP)) continue;
      let ok = false;
      try { ok = e.cond(g); } catch { ok = false; }
      if (!ok) continue;
      base ??= JSON.stringify(g);
      const prng = makeRng({ s: m * 31 + run });
      for (let ci = 0; ci < e.choices.length; ci++) {
        const rk = `${e.id}#${ci}`;
        if ((runs.get(rk) ?? 0) >= CAP) continue;
        runs.set(rk, (runs.get(rk) ?? 0) + 1);
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
