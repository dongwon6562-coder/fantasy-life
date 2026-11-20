import '../src/content.js';
// 삶의 고른 밀도 (23단계 헤드): 여러 삶을 살며 나이대별로 한 해에 사건이 몇 번 뜨는지,
// 사건 없는 해가 얼마나 되는지, 한 달에 몇 개씩 몰리는지 잰다.
// npm test에는 넣지 않는다. 직접 실행: node tools/densitywatch.js [판 수]
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';

const N = +(process.argv[2] ?? 16);
const fams = ['farmer', 'fallen_knight', 'merchant', 'fisher'];
const B = (a) => (a < 3 ? '0-2' : a < 6 ? '3-5' : a < 10 ? '6-9' : a < 15 ? '10-14' : a < 20 ? '15-19' : a < 30 ? '20s' : a < 40 ? '30s' : a < 50 ? '40s' : a < 60 ? '50s' : '60+');
const IDC = {}, PILE = {};
// QUIET=1이면 장면을 여는 행동 없이 일·쉬기·수련만 한다: 플레이어가 부르지 않았는데 뜨는 것만 잰다
const QUIET = !!process.env.QUIET;
const QUIET_IDS = new Set(['help_home', 'train_body', 'herbs', 'day_labor', 'rest', 'pray', 'sword_guard', 'village_help', 'nature_sow']);
const ORDER = ['0-2', '3-5', '6-9', '10-14', '15-19', '20s', '30s', '40s', '50s', '60+'];
const st = Object.fromEntries(ORDER.map((k) => [k, { years: 0, ev: 0, empty: 0, busy: 0, pile: 0, months: 0 }]));
for (let run = 0; run < N; run++) {
  const fam = fams[run % fams.length];
  let g;
  try { g = newGame({ name: '점검', sex: run % 2 ? 'm' : 'f', familyId: fam, mode: 'once', seed: 73000 + run * 13 }); } catch { g = newGame({ name: '점검', sex: 'f', familyId: 'farmer', mode: 'once', seed: 73000 + run * 13 }); }
  let yearEv = 0, yearAge = playerAge(g), yearMonths = 0;
  const flush = () => {
    if (yearMonths < 12) return;
    const s = st[B(yearAge)];
    s.years++; s.ev += yearEv; if (yearEv === 0) s.empty++; if (yearEv >= 10) s.busy++;
  };
  for (let m = 0; m < 12 * 90 && !g.over; m++) {
    const rng = rngOf(g);
    const acts = availableActions(g);
    const choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const pool = QUIET ? acts.filter((x) => QUIET_IDS.has(x.id) || /^(work|job_|play|learn|study|chores|tag_along|beg_story|mud_play)/.test(x.id)) : acts.filter((x) => x.id !== 'travel' && !/move/.test(x.id));
      let a = rng.pick(pool.length ? pool : acts);
      if (!a || g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? acts[0];
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id;
      choices.push(c);
    }
    const before = g.player?.id;
    endMonth(g, choices);
    if (g.player?.id !== before) { yearEv = 0; yearMonths = 0; yearAge = playerAge(g); }
    let k = 0, guard = 0; const ids = [];
    while (g.pendingEvent && guard++ < 8) { const id = g.pendingEvent.id === 'life_scene' ? 'S:' + (L(g).scene?.kind ?? '?') : g.pendingEvent.id; if (process.env.IDS && playerAge(g) >= 20) IDC[id] = (IDC[id] ?? 0) + 1; if (/^duel_/.test(id) && guard > 1) { resolveEvent(g, rngOf(g), rngOf(g).int(0, g.pendingEvent.choices.length - 1)); continue; } ids.push(id); k++; resolveEvent(g, rngOf(g), rngOf(g).int(0, g.pendingEvent.choices.length - 1)); }
    const s = st[B(playerAge(g))];
    s.months++; if (k >= 3) { s.pile++; if (process.env.PILE && playerAge(g) >= 20) { const acts = choices.map((c) => c.id).join(','); for (const x of ids) PILE[x] = (PILE[x] ?? 0) + 1; PILE['#acts:' + acts.split(',').length] = 1; } }
    yearEv += k; yearMonths++;
    if (yearMonths === 12) { flush(); yearEv = 0; yearMonths = 0; yearAge = playerAge(g); }
  }
}
console.log(`${N}판`);
console.log('나이    해수  한해평균  빈해%  10개넘는해%  한달3개넘는달%');
for (const k of ORDER) {
  const s = st[k]; if (!s.years) continue;
  console.log(`${k.padEnd(6)} ${String(s.years).padStart(5)}  ${(s.ev / s.years).toFixed(1).padStart(7)}  ${(100 * s.empty / s.years).toFixed(0).padStart(5)}  ${(100 * s.busy / s.years).toFixed(0).padStart(10)}  ${(100 * s.pile / Math.max(1, s.months)).toFixed(1).padStart(10)}`);
}
if (process.env.IDS) for (const [k, v] of Object.entries(IDC).sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(String(v).padStart(5), k);
if (process.env.PILE) for (const [k, v] of Object.entries(PILE).sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(String(v).padStart(5), k);
