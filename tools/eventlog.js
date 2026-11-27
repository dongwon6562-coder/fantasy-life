import './lsshim.js';
import '../src/content.js';
// 48단계 도우미3: 사람처럼 여러 삶을 살며 뜨는 사건·장면·소식을 나이·고장·달과 함께 글로 남긴다.
// 화면 없이 빠르게(한 삶 수십 초). 직접 실행: node tools/eventlog.js <출력 파일> [판 수] [해 수]
//   FAM=farmer,merchant  집안을 정한다   FOCUS=정규식  그 id의 사건만 적는다
import fs from 'node:fs';
import { newGame, endMonth, availableActions, slotsFor, playerAge, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { L } from '../src/adventure/core.js';
import { PLACES } from '../src/places.js';
import { heirsOf, becomeHeir } from '../src/heir.js';

const out = process.argv[2] ?? '/tmp/eventlog.md', N = +(process.argv[3] ?? 4), YEARS = +(process.argv[4] ?? 60);
const fams = (process.env.FAM ?? 'farmer,merchant,fallen_knight,fisher,slum_orphan,tower_blood').split(',');
const FOCUS = process.env.FOCUS ? new RegExp(process.env.FOCUS) : null;
const lines = [];
for (let run = 0; run < N; run++) {
  const fam = fams[run % fams.length];
  let g;
  try { g = newGame({ name: '점검', sex: run % 2 ? 'm' : 'f', familyId: fam, mode: 'free', seed: 48000 + run * 31 }); } catch { g = newGame({ name: '점검', sex: 'f', familyId: 'farmer', mode: 'free', seed: 48000 + run * 31 }); }
  lines.push(`\n# 판 ${run} (${fam})`);
  for (let m = 0; m < 12 * YEARS; m++) {
    if (g.over) { const h = heirsOf(g)[0]; if (!h) break; becomeHeir(g, rngOf(g), h); if (g.over) break; lines.push(`\n## 대 잇기: ${g.player.name}`); }
    const rng = rngOf(g), acts = availableActions(g), choices = [];
    for (let i = 0; i < slotsFor(g); i++) {
      const pool = acts.filter((x) => x.id !== 'travel' && !/move|emigr|leave_home/.test(x.id));
      let a = rng.pick(pool.length ? pool : acts);
      if (!a || g.player.fatigue > 70) a = acts.find((x) => x.id === 'rest') ?? acts[0];
      const c = { id: a.id };
      if (a.needsTarget) c.target = g.people.find((p) => p.known && !p.isPlayer && p.alive && !p.away)?.id;
      choices.push(c);
    }
    // 가끔은 다른 고장으로 떠나 본다
    if (playerAge(g) >= 18 && rng.chance(0.01)) { const t = acts.find((x) => x.id === 'travel'); if (t) choices[0] = { id: 'travel', target: rng.pick(Object.keys(PLACES[L(g).place]?.links ?? { harfen: 1 })) }; }
    endMonth(g, choices);
    const head = `[${g.date.year}.${g.date.month} ${playerAge(g)}살 ${PLACES[L(g).place]?.name ?? L(g).place}${L(g).travel ? ' 길 위' : ''}]`;
    if (!FOCUS) for (const n of (g.news ?? []).slice(0, 3)) lines.push(`${head} 소식: ${n.text}`);
    let guard = 0;
    while (g.pendingEvent && guard++ < 8) {
      const e = g.pendingEvent, id = e.id === 'life_scene' ? 'S:' + (L(g).scene?.kind ?? '?') : e.id;
      const pick = rngOf(g).int(0, e.choices.length - 1);
      const res = resolveEvent(g, rngOf(g), pick);
      if (!FOCUS || FOCUS.test(id)) lines.push(`${head} <${id}> ${e.title}: ${e.text}\n    고름 [${e.choices.join(' / ')}] → ${e.choices[pick]}\n    결과: ${res}`);
    }
  }
}
fs.writeFileSync(out, lines.join('\n'));
console.log(out, lines.length);
