// 악보 읽기와 연주. 곡은 tracks.js에 글자로 적혀 있고, 여기서 음으로 바꿔 시간 맞춰 낸다.
//
// 악보 적는 법 (한 마디는 | 로 나눈다. 마디 안의 글자 수만큼 마디를 똑같이 나눈다)
//   가락:  1~7 = 음계의 몇 번째 음.  ' 한 옥타브 위,  , 한 옥타브 아래.  - 앞 음을 이어 감.  . 쉼.  (5 6) 한 칸을 둘로 쪼갬
//   화음:  1~7 = 그 음 위에 쌓은 3화음.  o = 3음을 뺀 빈 5도,  M/m = 장/단 3도로 고정,  s = 4도 걸침,  7 = 7음 더함
//   타악:  X 세게,  x 보통,  o 여리게,  . 쉼
//   베이스: r 밑음,  5 5음,  8 옥타브 위 밑음,  a 다음 화음으로 다가가는 음,  - 이어 감,  . 쉼

export const SCALES = {
  ionian: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
};

/* ---------- 글자 악보 읽기 ---------- */

function tokens(str) {
  const out = []; const stack = [out];
  for (const m of str.matchAll(/\(|\)|[^\s()]+/g)) {
    if (m[0] === '(') { const a = []; stack[stack.length - 1].push(a); stack.push(a); }
    else if (m[0] === ')') stack.pop();
    else stack[stack.length - 1].push(m[0]);
  }
  return out;
}
// 마디 → [{ at, len, tok }] (at, len은 마디를 1로 본 비율)
function slots(items, at = 0, len = 1, out = []) {
  const w = len / items.length;
  items.forEach((it, i) => {
    if (Array.isArray(it)) slots(it, at + i * w, w, out);
    else out.push({ at: at + i * w, len: w, tok: it });
  });
  return out;
}
export const parseBars = (str) => str.split('|').map((b) => b.trim()).filter(Boolean).map((b) => slots(tokens(b)));

const scaleAt = (sc, k) => sc[(((k - 1) % 7) + 7) % 7] + 12 * Math.floor((k - 1) / 7);

export function degree(track, tok) {
  const m = /^([b#]?)([1-7])([',]*)$/.exec(tok);
  if (!m) throw new Error(`${track.id}: 모르는 음 "${tok}"`);
  let v = SCALES[track.scale][+m[2] - 1] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0);
  for (const ch of m[3]) v += ch === "'" ? 12 : -12;
  return track.root + v;
}

export function chordTones(track, tok) {
  const m = /^([1-7])([oMms7]*)$/.exec(tok);
  if (!m) throw new Error(`${track.id}: 모르는 화음 "${tok}"`);
  const sc = SCALES[track.scale]; const d = +m[1]; const fl = m[2];
  const r = scaleAt(sc, d);
  let third = scaleAt(sc, d + 2);
  if (fl.includes('M')) third = r + 4;
  if (fl.includes('m')) third = r + 3;
  if (fl.includes('s')) third = scaleAt(sc, d + 3);
  const t = fl.includes('o') ? [r, scaleAt(sc, d + 4)] : [r, third, scaleAt(sc, d + 4)];
  if (fl.includes('7')) t.push(scaleAt(sc, d + 6));
  const fold = r >= 7 ? -12 : 0; // 5·6·7도 화음은 으뜸음 아래에 둔다
  return t.map((x) => x + fold);
}
const ladder = (tones, i) => tones[((i % tones.length) + tones.length) % tones.length] + 12 * Math.floor(i / tones.length);

/* ---------- 파트 만들기 (tracks.js에서 쓴다) ---------- */
export const mel = (inst, score, o = {}) => ({ kind: 'mel', inst, score, ...o });
/** 가락 아래에 화음 음으로 받쳐 주는 둘째 성부를 저절로 만든다 */
export const under = (inst, score, o = {}) => ({ kind: 'under', inst, score, ...o });
export const arp = (inst, pattern, o = {}) => ({ kind: 'arp', inst, pattern, ...o });
export const bass = (inst, pattern, o = {}) => ({ kind: 'bass', inst, pattern, ...o });
export const pad = (inst, o = {}) => ({ kind: 'pad', inst, ...o });
export const strum = (pattern, o = {}) => ({ kind: 'strum', inst: 'lute', pattern, ...o });
export const perc = (type, pattern, o = {}) => ({ kind: 'perc', type, pattern, ...o });
export const drone = (inst, degs, o = {}) => ({ kind: 'drone', inst, degs, ...o });
export const gen = (fn, o = {}) => ({ kind: 'gen', fn, ...o });
export const sec = (bars, chords, parts, o = {}) => ({ bars, chords, parts, ...o });

/* ---------- 곡을 마디별 음 목록으로 바꾸기 ---------- */

/** 구간의 화음 줄: [{ at(박), len(박), tones, tok }] */
export function chordLine(track, s) {
  const B = track.beats; const chords = []; const cb = parseBars(s.chords);
  for (let b = 0; b < s.bars; b++) {
    for (const sl of cb[b % cb.length]) {
      if (sl.tok === '-' && chords.length) chords[chords.length - 1].len += sl.len * B;
      else if (sl.tok !== '.' && sl.tok !== '-') chords.push({ at: (b + sl.at) * B, len: sl.len * B, tones: chordTones(track, sl.tok), tok: sl.tok });
    }
  }
  return chords;
}
/** 가락 악보 → [{ beat, dur, midi }] */
export function melodyNotes(track, s, score, oct = 0) {
  const B = track.beats; const pb = parseBars(score); const out = []; let last = null;
  if (pb.length !== s.bars && s.bars % pb.length) throw new Error(`${track.id}: 가락 마디 수(${pb.length})가 구간(${s.bars})과 안 맞음`);
  for (let b = 0; b < s.bars; b++) {
    for (const sl of pb[b % pb.length]) {
      if (sl.tok === '.') { last = null; continue; }
      if (sl.tok === '-') { if (last) last.dur += sl.len * B; continue; }
      last = { beat: (b + sl.at) * B, dur: sl.len * B, midi: degree(track, sl.tok) + 12 * oct };
      out.push(last);
    }
  }
  return out;
}

function compileSection(track, s) {
  const B = track.beats;
  const chords = chordLine(track, s);
  const chordAt = (beat) => { let c = chords[0]; for (const x of chords) if (x.at <= beat + 1e-6) c = x; return c; };
  const bars = Array.from({ length: s.bars }, () => []);
  const gens = [];
  const push = (part, beat, ev) => {
    const b = Math.min(s.bars - 1, Math.max(0, Math.floor(beat / B + 1e-6)));
    ev.on = part.on; ev.beat = beat - b * B; // 같은 객체를 넣는다 ('-'로 길이를 늘릴 수 있게)
    bars[b].push(ev);
  };
  const phraseBars = s.bars >= 8 ? 4 : s.bars;
  // 악구의 셈여림: 가운데로 갈수록 조금 커졌다가 끝에서 잦아든다
  const shape = (beat) => 0.86 + 0.2 * Math.sin(Math.PI * Math.min(1, ((beat / B) % phraseBars) / (phraseBars - 0.5)));
  for (const p of s.parts) {
    const vel = p.vel ?? 0.7; const oct = 12 * (p.oct ?? 0);
    if (p.kind === 'gen') { gens.push(p); continue; }
    if (p.kind === 'drone') {
      for (const d of p.degs.split(/\s+/)) push(p, 0, { inst: p.inst, midi: degree(track, d) + oct, dur: s.bars * B + 0.5, vel, o: p.o });
      continue;
    }
    if (p.kind === 'pad') {
      for (const c of chords) {
        let tones = p.open ? [c.tones[0], c.tones[c.tones.length > 2 ? 2 : 1], c.tones[0] + 12] : c.tones;
        if (p.top) tones = [...tones, tones[0] + 12];
        for (const x of tones) push(p, c.at, { inst: p.inst, midi: track.root + x + oct, dur: c.len * (p.len ?? 1), vel, o: p.o });
      }
      continue;
    }
    if (p.kind === 'mel') {
      let prev = null;
      for (const n of melodyNotes(track, s, p.score, p.oct ?? 0)) {
        const ev = { inst: p.inst, midi: n.midi, dur: n.dur, vel: vel * (p.flat ? 1 : shape(n.beat)), o: p.o, legato: p.legato ?? 0.96 };
        // 비올은 바로 앞 음과 이어질 때 미끄러지듯 넘어간다
        if (p.inst === 'viol' && prev && Math.abs(prev.beat + prev.dur - n.beat) < 0.01 && Math.abs(prev.midi - n.midi) <= 7) ev.o = { ...(p.o ?? {}), from: prev.midi };
        push(p, n.beat, ev); prev = n;
      }
      continue;
    }
    if (p.kind === 'under') {
      // 화음이 바뀌거나 every 박이 지날 때마다, 그때 울리는 가락 음 아래의 화음 음을 길게 깐다
      const notes = melodyNotes(track, s, p.score, p.oct ?? 0);
      const step = p.every ?? (B === 4 ? 2 : B); let last = null;
      for (let beat = 0; beat < s.bars * B - 1e-6; beat += step) {
        const m = notes.find((n) => n.beat <= beat + 1e-6 && n.beat + n.dur > beat + 1e-6);
        if (!m) { last = null; continue; }
        const pcs = chordAt(beat).tones.map((x) => (((track.root + x) % 12) + 12) % 12);
        let pick = null;
        for (let x = m.midi - 3; x >= m.midi - 10; x--) if (pcs.includes(x % 12)) { pick = x; break; }
        if (pick == null) { last = null; continue; }
        if (last && last.midi === pick && Math.abs(last._end - beat) < 1e-6) { last.dur += step; last._end += step; continue; }
        last = { inst: p.inst, midi: pick, dur: step, vel: vel * shape(beat), o: p.o, legato: 0.98, _end: beat + step };
        push(p, beat, last);
      }
      continue;
    }
    const pb = parseBars(p.pattern);
    let last = null;
    for (let b = 0; b < s.bars; b++) {
      for (const sl of pb[b % pb.length]) {
        const beat = (b + sl.at) * B; const len = sl.len * B;
        if (sl.tok === '.') { last = null; continue; }
        if (sl.tok === '-') { if (last) last.dur += len; continue; }
        if (p.kind === 'perc') {
          const v = { X: 1, x: 0.62, o: 0.3 }[sl.tok];
          if (v == null) throw new Error(`${track.id}: 모르는 타악 "${sl.tok}"`);
          push(p, beat, { perc: p.type, vel: vel * v });
        } else if (p.kind === 'arp') {
          const tones = chordAt(beat).tones;
          last = { inst: p.inst, midi: track.root + ladder(tones, +sl.tok) + oct, dur: len, vel: vel * (sl.at === 0 ? 1 : 0.84), o: p.o, legato: p.legato ?? 1 };
          push(p, beat, last);
        } else if (p.kind === 'bass') {
          const c = chordAt(beat); const r = c.tones[0];
          let x;
          if (sl.tok === 'r') x = r;
          else if (sl.tok === '5') x = c.tones[c.tones.length > 2 ? 2 : 1];
          else if (sl.tok === '8') x = r + 12;
          else if (sl.tok === 'a') { // 다음 화음의 밑음으로 한 음 아래(또는 위)에서 다가간다
            const i = chords.indexOf(c); const nr = chords[(i + 1) % chords.length].tones[0];
            const sc = SCALES[track.scale]; const all = [];
            for (let o8 = -24; o8 <= 12; o8 += 12) for (const d of sc) all.push(d + o8);
            const below = all.filter((v) => v < nr).pop(); const above = all.find((v) => v > nr);
            x = nr >= r ? below : above;
          } else throw new Error(`${track.id}: 모르는 베이스 "${sl.tok}"`);
          last = { inst: p.inst, midi: track.root + x + oct, dur: len, vel: vel * (sl.at === 0 ? 1 : 0.86), o: p.o, legato: p.legato ?? 1 };
          push(p, beat, last);
        } else if (p.kind === 'strum') {
          const tones = chordAt(beat).tones; const up = sl.tok === 'u';
          const n = up ? 3 : 4; const v = vel * (sl.tok === 'D' ? 1 : up ? 0.55 : 0.75);
          for (let i = 0; i < n; i++) {
            const k = up ? 3 - i : i;
            push(p, beat, { inst: 'lute', midi: track.root + ladder(tones, k) + oct, dur: len * 0.92, vel: v * (0.85 + 0.05 * k), lag: i * 0.016, o: { damp: true } });
          }
          last = null;
        }
      }
    }
  }
  return { bars, gens, once: s.once, n: s.bars };
}

const cache = new Map();
export function compileTrack(track) {
  let c = cache.get(track.id);
  if (!c) { c = track.sections.map((s) => compileSection(track, s)); cache.set(track.id, c); }
  return c;
}

/** 마디 하나를 group에 예약한다. time: 마디가 시작하는 시각 */
export function scheduleBar(track, group, pos, time, rnd = Math.random) {
  const s = compileTrack(track)[pos.sec];
  const spb = 60 / track.bpm;
  const play = (ev) => {
    if (ev.on && !ev.on(pos.loop)) return;
    const t = time + ev.beat * spb + (ev.lag ?? 0);
    if (ev.perc) { group.perc(ev.perc, t + (rnd() - 0.5) * 0.006, ev.vel * (0.9 + rnd() * 0.2)); return; }
    group.note(ev.inst, t + (rnd() - 0.5) * 0.012, ev.midi, ev.dur * spb * (ev.legato ?? 1), ev.vel * (0.9 + rnd() * 0.2), ev.o);
  };
  for (const ev of s.bars[pos.bar]) play(ev);
  for (const g of s.gens) {
    if (g.on && !g.on(pos.loop)) continue;
    for (const ev of g.fn({ bar: pos.bar, loop: pos.loop, rnd, track, deg: (tok) => degree(track, tok) }) ?? []) play(ev);
  }
}
/** 다음 마디 위치 */
export function nextPos(track, pos) {
  const secs = compileTrack(track);
  let { sec: si, bar, loop } = pos;
  if (++bar >= secs[si].n) {
    bar = 0;
    do { if (++si >= secs.length) { si = 0; loop++; } } while (secs[si].once && loop > 0);
  }
  return { sec: si, bar, loop };
}
export const barSeconds = (track) => (60 / track.bpm) * track.beats;
/** 곡을 맺는 마지막 화음: 으뜸음의 빈 5도를 하프로 훑고 현으로 받친다 */
export function scheduleCoda(track, group, time) {
  const r = track.root;
  [r - 12, r - 5, r, r + 7, r + 12].forEach((m, i) => group.note('harp', time + i * 0.11, m, 3, 0.5 - i * 0.03));
  for (const m of [r - 12, r - 5]) group.note('strings', time, m, barSeconds(track) * 1.2, 0.3, { attack: 0.3, release: 2.2 });
  return barSeconds(track) * 1.2 + 3;
}

/* ---------- 연주기 ----------
 * 곡에는 두 가지가 있다.
 *  - 배경 곡(mood): 한 번(track.plays번) 끝까지 연주하고 맺는다. 그 뒤 한동안은 환경음만 흐르고,
 *    같은 상황의 곡 묶음에서 다른 곡이 이어진다. 한 곡이 끝없이 되풀이되지 않게 하려는 것.
 *  - 상황 곡(cue): 전투·사건처럼 그 상황이 끝날 때까지 되풀이한다.
 */
const AHEAD = 1.3; // 이만큼 앞의 마디까지 미리 예약 (탭이 뒤에 있어도 끊기지 않게)

export class MusicPlayer {
  constructor(engine, tracks, { gap = [14, 34], rnd = Math.random } = {}) {
    this.e = engine; this.tracks = tracks; this.cur = null; this.timer = null;
    this.gap = gap; this.rnd = rnd; this.prog = null; this.resumeAt = 0; this.lastMood = null;
  }
  get playing() { return this.cur?.track.id ?? null; }
  /** 지금 상황의 곡 묶음을 알려 준다. pool: 곡 id들, cue: 상황 곡인가 */
  program(pool, { cue = false, fade = 2.2, soft = false } = {}) {
    pool = pool.filter((id) => this.tracks.some((t) => t.id === id));
    if (!pool.length) return;
    const key = (cue ? 'c:' : 'm:') + pool.join(',');
    const was = this.prog;
    this.prog = { pool, cue, key };
    if (!this.timer) this.timer = setInterval(() => this.tick(), 180);
    if (was?.key === key) return;
    if (cue) { this.start(pool[0], { fade, loop: true }); return; }
    // 배경 곡: 지금 곡이 새 묶음에도 들어 있으면 끝까지 듣는다
    if (this.cur && !this.cur.loop && (soft || pool.includes(this.cur.track.id))) return;
    if (this.cur) { this.stop(fade); this.resumeAt = this.e.ctx.currentTime + fade + 1.5; }
    else if (was?.cue) this.resumeAt = this.e.ctx.currentTime + 1;
    else if (!was) this.resumeAt = 0;
    this.tick();
  }
  /** 한 곡을 바로 튼다 (미리듣기용). loop면 끝없이 되풀이 */
  play(id, { fade = 2.2, loop = true } = {}) {
    this.prog = null;
    if (this.cur?.track.id === id) return;
    this.start(id, { fade, loop });
    if (!this.timer) this.timer = setInterval(() => this.tick(), 180);
  }
  start(id, { fade = 2.2, loop = false } = {}) {
    if (this.cur?.track.id === id && this.cur.loop === loop) return;
    const track = this.tracks.find((t) => t.id === id);
    if (!track) return;
    const had = !!this.cur;
    this.stop(fade);
    const group = this.e.group('music', track.gain ?? 1);
    const start = this.e.ctx.currentTime + (had ? fade * 0.45 : 0.08);
    this.cur = { track, group, pos: { sec: 0, bar: 0, loop: 0 }, next: start, loop };
    if (!loop) this.lastMood = id;
    this.tick();
  }
  stop(fade = 1.5) {
    if (this.cur) { this.cur.group.stop(fade); this.cur = null; }
  }
  /** 다 끄기 (소리 끄기 설정) */
  halt(fade = 0.6) { this.stop(fade); this.prog = null; }
  tick() {
    const now = this.e.ctx.currentTime;
    const c = this.cur;
    if (!c) {
      const p = this.prog;
      if (p && !p.cue && now >= this.resumeAt) {
        const cand = p.pool.length > 1 ? p.pool.filter((id) => id !== this.lastMood) : p.pool;
        // 그 상황에서 처음 트는 곡은 묶음의 첫 곡(가장 어울리는 곡), 그다음부터는 번갈아
        const first = !p.begun && p.pool[0] !== this.lastMood; p.begun = true;
        this.start(first ? p.pool[0] : cand[Math.floor(this.rnd() * cand.length)], { loop: false });
      }
      return;
    }
    if (c.next < now - 0.3) c.next = now + 0.05; // 오래 멈췄다 돌아왔을 때
    while (this.cur === c && c.next < now + AHEAD) {
      if (!c.loop && c.pos.loop >= (c.track.plays ?? 1)) {
        // 곡을 맺고, 한동안 환경음만 흐르게 둔다
        const tail = scheduleCoda(c.track, c.group, c.next);
        const g = c.group; const wait = Math.max(0, c.next - now) + tail;
        setTimeout(() => g.stop(2), wait * 1000);
        this.cur = null;
        this.resumeAt = c.next + tail + this.gap[0] + this.rnd() * (this.gap[1] - this.gap[0]);
        return;
      }
      scheduleBar(c.track, c.group, c.pos, c.next);
      c.next += barSeconds(c.track);
      c.pos = nextPos(c.track, c.pos);
    }
  }
}
