import '../src/content.js';
// 싸움 힘 지켜보기: 무작위 삶 여럿을 살며 나이별 playerPower와 어디서 오는지(검·서클·주문·장비·덧붙는 힘)를 모은다.
// 갈래가 늘며 힘이 한쪽에서 부풀지 않는지 보는 용도. npm test에는 넣지 않음. 쓰는 법: node tools/powerwatch.js [삶 수=24] [해=60]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, me, circleOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { playerPower, spellPower, POWER_BONUS } from '../src/adventure/combat.js';
import { L } from '../src/adventure/core.js';

// FOCUS=sword|magic 이면 그 쪽 행동을 열에 여섯 번 고른다(한 길만 판 삶의 꼭대기 보기)
const FOCUS = { sword: /sword|duel|train|fencing|knight/, magic: /magic|spell|^sp_|circle|study|tower/ }[process.env.FOCUS] ?? null;
const N = +(process.argv[2] ?? 24), YEARS = +(process.argv[3] ?? 60);
const fams = ['farmer', 'fallen_knight', 'merchant', 'march_guard', 'tower_blood', 'dwarf_heir', 'beast_wolf', 'elf_elder', 'hd_frontier', 'count_bastard'];
const AGES = [20, 30, 40, 50, 60];
const rows = {}; for (const a of AGES) rows[a] = [];
const t0 = Date.now();
for (let run = 0; run < N; run++) {
  let g;
  try { g = newGame({ name: '점검', sex: run % 2 ? 'm' : 'f', familyId: fams[run % fams.length], mode: 'once', seed: 70000 + run * 13 }); }
  catch { g = newGame({ name: '점검', sex: 'm', familyId: 'farmer', mode: 'once', seed: 70000 + run * 13 }); }
  for (let m = 0; m < 12 * YEARS && !g.over; m++) {
    const rng = rngOf(g), acts = availableActions(g), choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      let a = rng.pick(acts);
      if (FOCUS && rng.next() < 0.6) { const fa = acts.filter((x) => FOCUS.test(x.id)); if (fa.length) a = rng.pick(fa); }
      if (g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? a;
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id;
      choices.push(c);
    }
    endMonth(g, choices);
    let guard = 0;
    while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), Math.floor(rngOf(g).next() * g.pendingEvent.choices.length));
    const age = playerAge(g);
    if (AGES.includes(age) && me(g).ageMonths % 12 === 0 && !g.over) {
      const k = g.player.skills, c = circleOf(g), gear = L(g).gear;
      const bonus = POWER_BONUS.map((f) => Number(f(g)) || 0);
      rows[age].push({ pow: playerPower(g), sword: k.sword * 0.55, circle: c * c * 3 + c * 7, spells: spellPower(g), gear: (gear.weapon ?? 0) + (gear.armor ?? 0) * 0.6, bonus });
    }
  }
}
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const f1 = (x) => Math.round(x);
for (const a of AGES) {
  const r = rows[a]; if (!r.length) continue;
  const col = (k) => r.map((x) => x[k]);
  console.log(`${a}살 (${r.length}명) 힘 중간 ${f1(q(col('pow'), 0.5))} 상위10% ${f1(q(col('pow'), 0.9))} 최고 ${f1(Math.max(...col('pow')))} | 검 ${f1(q(col('sword'), 0.5))}/${f1(q(col('sword'), 0.9))} 서클 ${f1(q(col('circle'), 0.5))}/${f1(q(col('circle'), 0.9))} 주문 ${f1(q(col('spells'), 0.5))}/${f1(q(col('spells'), 0.9))} 장비 ${f1(q(col('gear'), 0.5))}/${f1(q(col('gear'), 0.9))}`);
  const b = POWER_BONUS.map((_, i) => Math.max(...r.map((x) => x.bonus[i] ?? 0)));
  console.log(`   덧붙는 힘 최고(등록 순): ${b.map(f1).join(' ')}`);
}
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
