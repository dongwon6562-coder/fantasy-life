// 곡의 악기 균형을 어림해 본다 (귀 대신 셈으로): 구간마다 가락 악기와 받치는 악기들의 크기를 견준다.
// 악기별 기준 크기(K)는 브라우저에서 음 하나씩 그려 잰 값이다. 가락이 반주보다 작게 묻히는 구간을 찾아 준다.
//   node tools/musicmix.js [곡 id...]
import { TRACKS } from '../src/audio/tracks.js';
import { compileTrack } from '../src/audio/music.js';
import { INST, PERC } from '../src/audio/engine.js';

// 세기 0.8, 길이 1초짜리 음 하나의 크기(dB, 악기 gain 1로 고친 값)
const K = { harp: -15.1, lute: -15.8, pizz: -18.8, spic: -16.8, strings: -19.2, trem: -18.7, cello: -18.3, bass: -16.8, flute: -17.2, recorder: -15.7, oboe: -17.3, clarinet: -17.5, bassoon: -16.2, horn: -17.2, trumpet: -15.4, trombone: -16.1, choir: -15.7, organ: -15.7, bell: -18.2, glock: -22.8, timp: -14.8, taiko: -14.3, tom: -21.5, wood: -30.7 };
const SHORT = new Set(['harp', 'lute', 'pizz', 'spic', 'bell', 'glock', 'timp', 'taiko', 'tom', 'wood']);
const velc = (v) => 0.16 + 0.84 * Math.min(1.2, v) ** 1.35;
const db = (e) => (10 * Math.log10(Math.max(e, 1e-12))).toFixed(1);
const want = process.argv.slice(2); let flagged = 0;
for (const tr of TRACKS) {
  if (want.length && !want.includes(tr.id)) continue;
  const spb = 60 / tr.bpm; const secs = compileTrack(tr);
  tr.sections.forEach((s, si) => {
    const T = s.bars * tr.beats * spb; const byPart = new Map();
    secs[si].bars.forEach((bar) => { for (const ev of bar) {
      if (ev.on && !ev.on(0)) continue;
      const inst = ev.perc ? PERC[ev.perc]?.[0] : ev.inst; if (!inst || !INST[inst]) continue;
      const amp = 10 ** (K[inst] / 20) * INST[inst].gain * velc(ev.vel) / velc(0.8);
      const secsOn = SHORT.has(inst) ? 1.3 : ev.dur * spb + 0.3;
      const part = s.parts[ev.pk]; const key = ev.pk;
      const o = byPart.get(key) ?? { part, inst, e: 0 }; o.e += amp * amp * secsOn / T; byPart.set(key, o);
    } });
    let lead = 0, rest = 0, top = 0; const rows = [];
    for (const o of byPart.values()) {
      const isLead = o.part.kind === 'mel' && !o.part.flat && leadish(o.part);
      if (isLead) lead += o.e; else { rest += o.e; top = Math.max(top, o.e); }
      rows.push(`${isLead ? '*' : ' '}${o.part.kind}:${o.inst} ${db(o.e)}`);
    }
    const diff = lead && rest ? 10 * Math.log10(lead / rest) : null;
    const over = lead && top ? 10 * Math.log10(lead / top) : null; // 가장 큰 받침 악기보다 얼마나 큰가
    const flag = diff != null && (diff < -3 || over < 1.5 || diff > 10);
    if (flag) flagged++;
    if (flag || want.length) console.log(`${tr.id.padEnd(15)} 구간${si} 가락-반주 ${diff == null ? '  - ' : diff.toFixed(1).padStart(5)}dB 가락-큰받침 ${over == null ? ' - ' : over.toFixed(1).padStart(5)}dB ${flag ? '!!' : '  '} ${rows.join('  ')}`);
  });
}
// 긴 음만 까는 받침 성부(마디마다 한 음)는 가락으로 치지 않는다
function leadish(p) { const bars = p.score.split('|'); const moving = bars.filter((b) => b.trim().split(/\s+/).filter((t) => t !== '-' && t !== '.').length >= 2).length; return moving >= bars.length / 2; }
console.log(flagged ? `가락이 묻히거나 튀는 구간 ${flagged}` : 'OK');
