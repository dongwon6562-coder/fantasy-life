import '../src/content.js';
// 오래 해도 가벼운지 본다 (31단계 헤드): 무작위로 고르는 플레이어로 YEARS년(대 잇기 포함) 돌리며
// 10년마다 저장 크기(압축 전·후), 달 넘김 평균 시간, 저장 속 가장 큰 덩이들을 찍는다.
// npm test에는 넣지 않는다. 직접 실행: node tools/weightwatch.js [햇수] [씨앗]  (SAVE_OUT=파일 이면 끝난 판 저장을 써 둔다)
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { heirsOf, becomeHeir } from '../src/heir.js';
import { encodeSave, decodeSave } from '../src/pack.js';
import { writeFileSync } from 'node:fs';

const YEARS = +(process.argv[2] ?? 120), SEED = +(process.argv[3] ?? 4242);
const g = newGame({ name: '재기', sex: 'm', familyId: 'merchant', mode: 'free', seed: SEED });
let r = SEED >>> 0; const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const size = (o) => { try { return JSON.stringify(o)?.length ?? 0; } catch { return 0; } };
const kb = (n) => (n / 1024).toFixed(0) + 'K';
let t0 = Date.now(), months = 0, heirs = 0;
for (let m = 0; m < 12 * YEARS; m++) {
  if (g.over) { const h = heirsOf(g)[0]; if (!h) { console.log('대가 끊김', m); break; } becomeHeir(g, rngOf(g), h); heirs++; if (g.over) break; }
  const acts = availableActions(g).filter((a) => !/assassin|suicide|farewell/.test(a.id));
  const choices = [];
  for (let i = 0; i < slotsFor(g); i++) choices.push({ id: (rnd() < 0.5 ? acts.find((x) => x.id === 'work') : null)?.id ?? acts[Math.floor(rnd() * acts.length)].id });
  endMonth(g, choices);
  let guard = 0;
  while (g.pendingEvent && guard++ < 6) resolveEvent(g, rngOf(g), Math.floor(rnd() * g.pendingEvent.choices.length));
  months++;
  if (m % 120 === 119) {
    const ms = (Date.now() - t0) / months; t0 = Date.now(); months = 0;
    const raw = JSON.stringify(g); const t1 = Date.now(); const enc = encodeSave(g); const tEnc = Date.now() - t1;
    const t2 = Date.now(); decodeSave(enc); const tDec = Date.now() - t2;
    const top = Object.entries(g).map(([k, v]) => [k, size(v)]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log(`${(m + 1) / 12}년 사람${g.people.length}(산 ${g.people.filter((p) => p.alive).length}) 달 ${ms.toFixed(0)}ms 저장 ${kb(raw.length)}→${kb(enc.length)} 쓰기${tEnc}ms 읽기${tDec}ms`);
    console.log('   ' + top.map(([k, n]) => `${k} ${kb(n)}`).join(' · '));
  }
}
if (process.env.SAVE_OUT) { writeFileSync(process.env.SAVE_OUT, encodeSave(g)); console.log('저장 써 둠', process.env.SAVE_OUT, '(perfplay.cjs에 LONG=로 넘겨 폰 흉내로 잰다)'); }
