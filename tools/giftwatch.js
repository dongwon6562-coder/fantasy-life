import '../src/content.js';
// 큰 재능 끝까지 가 보기 (28단계 헤드): 시작 때 고른 큰 재능마다 그 길을 좇는 사람으로 마흔다섯까지 살아 보고,
// 그 길의 문턱(서클, 유파 단계, 학원, 장사 솜씨, 장인, 교단 자리)에 몇 살에 닿는지 잰다. '평범하게'와 견준다.
// npm test에는 넣지 않는다. 직접 실행: node tools/giftwatch.js [판 수] [재능 id들(쉼표)]
import { me, newGame, endMonth, availableActions, slotsFor, playerAge, rngOf, circleOf } from '../src/game.js';
// 사람처럼 고른다: 항복·물러서기·목숨을 거는 선택은 웬만하면 안 고른다
const AVOID = /항복|물러난다|물러선다|목숨을.*묶|삶을 마친|내려놓고|돌아선다|남는다/;
const pickChoice = (g) => { const c = g.pendingEvent.choices.map((t, i) => [String(t), i]); const ok = c.filter(([t]) => !AVOID.test(t)); const r = rngOf(g); return (ok.length ? r.pick(ok) : r.pick(c))[1]; };
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { crimeState } from '../src/crime.js';
import { schoolInfo } from '../src/school/index.js';

const N = +(process.argv[2] ?? 6);
const ONLY = process.argv[3]?.split(',');
const WANT = {
  magic: /^(magic_|spell_|circle_exam|tower_|study|leocast_tower)/,
  sword: /^(sword_|train_body|legend_lesson)/,
  letters: /^(study|school_|eisen_academy|law_study|arts_read|letters_write)/,
  trade: /^(trade_|open_shop|shop_manage|harfen_market|silverleaf_trade|era_shop|work)/,
  craft: /^(work|seek_job|cuisine_cook|herbs|open_shop|shop_manage)/,
  faith: /^(pray|worship|pilgrimage|work|study|holy_heal)$/,
};
const MARK = {
  magic: [['1서클', (g) => circleOf(g) >= 1], ['3서클', (g) => circleOf(g) >= 3], ['5서클', (g) => circleOf(g) >= 5]],
  sword: [['유파', (g) => (g.sword?.rank ?? -1) >= 0], ['유파 2단', (g) => (g.sword?.rank ?? -1) >= 2], ['유파 4단', (g) => (g.sword?.rank ?? -1) >= 4]],
  letters: [['글 40', (g) => g.player.skills.letters >= 40], ['학원 입학', (g) => !!schoolInfo(g).academy], ['급제·졸업', (g) => schoolInfo(g).titles.length > 0 || schoolInfo(g).academy?.state === '졸업']],
  trade: [['상단', (g) => !!g.life?.fac?.merchants?.member], ['장사 40', (g) => g.player.skills.trade >= 40], ['장사 70', (g) => g.player.skills.trade >= 70]],
  craft: [['솜씨 40', (g) => Math.max(g.player.skills.smithing, g.player.skills.cooking, g.player.skills.herbs) >= 40], ['장인 60', (g) => Math.max(g.player.skills.smithing, g.player.skills.cooking, g.player.skills.herbs) >= 60], ['명장 85', (g) => Math.max(g.player.skills.smithing, g.player.skills.cooking, g.player.skills.herbs) >= 85]],
  faith: [['신심 60', (g) => (g.faith?.devotion ?? 0) >= 60], ['성광교', (g) => !!g.life?.fac?.church?.member], ['사제', (g) => (g.life?.fac?.church?.rank ?? 0) >= 2]],
};
const SK = { magic: 'magic', sword: 'sword', letters: 'letters', trade: 'trade', craft: 'smithing', faith: 'letters' };
const fams = ['farmer', 'merchant', 'fallen_knight'];
const ids = Object.keys(WANT).filter((k) => !ONLY || ONLY.includes(k));
const T0 = Date.now();
for (const k of ids) {
  for (const gift of [k, null]) {
    const hits = MARK[k].map(() => []);
    let died = 0; const causes = []; const fin = []; let wedgeAsk = 0;
    for (let run = 0; run < N; run++) {
      const g = newGame({ name: '재능', sex: run % 2 ? 'm' : 'f', familyId: fams[run % 3], mode: 'free', seed: 28000 + run * 13, birth: gift ? { gift } : undefined });
      const got = MARK[k].map(() => null);
      while (!g.over && playerAge(g) < 45) {
        const rng = rngOf(g), acts = availableActions(g);
        const pref = acts.filter((a) => WANT[k].test(a.id));
        const plain = acts.filter((a) => a.id !== 'travel' && !a.crime && !/^(heist|spy|revolt|herd_rustle|secret_night|bloodyears|vessel|imprint)/.test(a.id));
        const choices = [];
        for (let i = 0; i < slotsFor(g); i++) {
          let a = pref.length && rng.chance(0.7) ? rng.pick(pref) : rng.pick(plain);
          if (!a || g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? acts[0];
          const c = { id: a.id };
          if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id;
          choices.push(c);
        }
        const gen = L(g).gen;
        endMonth(g, choices);
        if (g.pendingEvent?.title === '흔들리는 쐐기') wedgeAsk++;
        let n = 0; while (g.pendingEvent && n++ < 8) resolveEvent(g, rngOf(g), pickChoice(g));
        if (L(g).gen !== gen) { died++; causes.push(`${L(g).ancestors?.at(-1)?.died - L(g).ancestors?.at(-1)?.born}살 ${L(g).ancestors?.at(-1)?.cause ?? me(g)?.deathCause ?? ''}`); break; }
        crimeState(g).jailed = null;
        MARK[k].forEach(([, f], i) => { if (got[i] == null) { try { if (f(g)) got[i] = playerAge(g); } catch {} } });
      }
      got.forEach((a, i) => { if (a != null) hits[i].push(a); });
      fin.push(Math.round(g.player.skills[SK[k]] ?? 0));
      if (process.env.DBG) console.log('  ', k, gift, 'age', playerAge(g), 'job', g.life?.job?.id, 'fac', JSON.stringify(g.life?.fac), 'letters', Math.round(g.player.skills.letters));
    }
    const med = (a) => (a.length ? a.sort((x, y) => x - y)[a.length >> 1] : '-');
    console.log(`${(gift ? k : '평범 ' + k).padEnd(10)} ` + MARK[k].map(([name], i) => `${name} ${hits[i].length}/${N}(${med(hits[i])}살)`).join('  ') + `  솜씨 ${med(fin)}` + (wedgeAsk ? `  쐐기 물음 ${wedgeAsk}` : '') + (died ? `  죽음 ${died} [${causes.join(', ')}]` : ''));
  }
}
console.log(`${Math.round((Date.now() - T0) / 1000)}초`);
