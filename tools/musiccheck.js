// 곡 악보 점검 (귀 대신 규칙으로): 센박의 가락 음이 화음 음인지, 함께 울리는 음들이 반음으로 부딪히지 않는지,
// 악기가 낼 수 있는 음역인지 본다. 어긋난 곳을 알려 줄 뿐이고, 일부러 쓴 부딪힘은 그대로 둬도 된다.
//   node tools/musiccheck.js [곡 id...]
import { TRACKS } from '../src/audio/tracks.js';
import { compileTrack, chordLine, melodyNotes } from '../src/audio/music.js';
import { SAMPLES } from '../src/audio/samples.js';
import { PERC } from '../src/audio/engine.js';

const want = process.argv.slice(2);
const pc = (m) => ((m % 12) + 12) % 12;
const RANGE = Object.fromEntries(Object.entries(SAMPLES).map(([k, z]) => [k, [z[0][0] - 7, z[z.length - 1][0] + 5]]));
const SHORT = new Set(['harp', 'lute', 'pizz', 'spic', 'glock', 'bell', 'timp']);
let warns = 0;
const warn = (msg) => { warns++; console.log(msg); };
for (const tr of TRACKS) {
  if (want.length && !want.includes(tr.id)) continue;
  const B = tr.beats; const secs = compileTrack(tr);
  tr.sections.forEach((s, si) => {
    const chords = chordLine(tr, s);
    const chordAt = (beat) => { let c = chords[0]; for (const x of chords) if (x.at <= beat + 1e-6) c = x; return c; };
    // 1. 센박의 가락 음
    for (const p of s.parts) {
      if (p.kind !== 'mel' || p.flat) continue;
      for (const n of melodyNotes(tr, s, p.score, p.oct ?? 0)) {
        const inBar = n.beat % B; const strong = inBar < 1e-6 || (B === 4 && Math.abs(inBar - 2) < 1e-6) || (B === 2 && Math.abs(inBar - 1) < 1e-6);
        if (!strong || n.dur < (B === 2 ? 0.3 : 0.99)) continue;
        const c = chordAt(n.beat); const pcs = c.tones.map((x) => pc(tr.root + x));
        if (!pcs.includes(pc(n.midi))) warn(`${tr.id} 구간${si} ${p.inst} 마디${Math.floor(n.beat / B) + 1} 박${(inBar + 1).toFixed(1)}: 화음(${c.tok}) 밖의 음`);
      }
    }
    // 2. 함께 울리는 음들의 반음 부딪힘, 3. 음역
    const evs = [];
    secs[si].bars.forEach((bar, b) => { for (const ev of bar) if (ev.inst) evs.push({ ...ev, at: b * B + ev.beat }); });
    const ranged = new Set();
    for (const ev of evs) {
      const r = RANGE[ev.inst];
      if (ranged.has(ev.inst + ev.midi)) continue; ranged.add(ev.inst + ev.midi);
      if (!r) warn(`${tr.id} 구간${si}: 모르는 악기 ${ev.inst}`);
      else if (ev.midi < r[0] || ev.midi > r[1]) warn(`${tr.id} 구간${si} ${ev.inst} 마디${Math.floor(ev.at / B) + 1}: 음역 밖 (${ev.midi}, ${r[0]}~${r[1]})`);
    }
    const seen = new Set();
    for (let i = 0; i < evs.length; i++) for (let j = i + 1; j < evs.length; j++) {
      const a = evs[i], b = evs[j];
      const len = (e) => (SHORT.has(e.inst) ? Math.min(e.dur, 1) : e.dur);
      const ov = Math.min(a.at + len(a), b.at + len(b)) - Math.max(a.at, b.at);
      if (ov < 1.49 || a.pedal || b.pedal) continue; // 지나가는 음과 지속 저음(페달)은 넘어간다
      const d = Math.abs(a.midi - b.midi) % 12;
      if (d !== 1 && d !== 11) continue;
      const key = `${Math.floor(Math.max(a.at, b.at) / B)}|${[a.inst, b.inst].sort()}`;
      if (seen.has(key)) continue; seen.add(key);
      warn(`${tr.id} 구간${si} 마디${Math.floor(Math.max(a.at, b.at) / B) + 1}: ${a.inst}(${a.midi})와 ${b.inst}(${b.midi})가 반음으로 부딪힘 (${ov.toFixed(1)}박)`);
    }
    for (const p of s.parts) if (p.kind === 'perc' && !PERC[p.type]) warn(`${tr.id} 구간${si}: 모르는 타악 ${p.type}`);
  });
}
console.log(warns ? `살펴볼 곳 ${warns}` : 'OK');
