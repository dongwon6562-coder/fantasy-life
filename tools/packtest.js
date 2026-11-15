// 저장 압축(src/pack.js)이 글을 그대로 되돌리는지, 얼마나 줄이는지 본다
import '../src/content.js';
import { newGame, endMonth, availableActions, slotsFor, rngOf } from '../src/game.js';
import { resolveEvent } from '../src/events.js';
import { pack, unpack, encodeSave, decodeSave } from '../src/pack.js';

const tests = ['', 'a', 'aaaaaaaaaaaaaaaa', '한글 한글 한글', 'abcabcabcabc😀x', JSON.stringify({ x: [1, 2, 3], s: '에른 마을 "따옴표" \\ 역슬래시' })];
for (const t of tests) if (unpack(pack(t)) !== t) { console.log('FAIL small', JSON.stringify(t)); process.exit(1); }
let rnd = 1; const R = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let k = 0; k < 200; k++) { let s = ''; const n = Math.floor(R() * 3000); for (let i = 0; i < n; i++) s += String.fromCharCode(R() < 0.5 ? 97 + Math.floor(R() * 5) : 0xac00 + Math.floor(R() * 40)); if (unpack(pack(s)) !== s) { console.log('FAIL random', k); process.exit(1); } }
for (let run = 0; run < 3; run++) {
  const g = newGame({ name: '압축', sex: 'f', familyId: ['farmer', 'merchant', 'fallen_knight'][run], mode: 'free', seed: 600 + run });
  for (let m = 0; m < 12 * 40 && !g.over; m++) {
    const acts = availableActions(g); const rng = rngOf(g);
    endMonth(g, Array.from({ length: slotsFor(g) }, () => ({ id: rng.pick(acts).id })));
    let k = 0; while (g.pendingEvent && k++ < 6) resolveEvent(g, rngOf(g), 0);
  }
  const json = JSON.stringify(g);
  let t0 = Date.now(); const enc = encodeSave(g); const te = Date.now() - t0;
  t0 = Date.now(); const dec = decodeSave(enc); const td = Date.now() - t0;
  const same = JSON.stringify(dec) === json;
  console.log(`run${run} json ${(json.length * 2 / 1024).toFixed(0)}KB → ${(enc.length * 2 / 1024).toFixed(0)}KB (${(json.length / enc.length).toFixed(1)}배) 압축 ${te}ms 풀기 ${td}ms 같음 ${same}`);
  if (!same) process.exit(1);
}
console.log('packtest: 통과');
