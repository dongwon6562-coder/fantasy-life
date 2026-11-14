// 악보 읽기와 연주. 곡은 tracks.js에 글자로 적혀 있고, 여기서 음으로 바꿔 시간 맞춰 낸다.
//
// 악보 적는 법 (한 마디는 | 로 나눈다. 마디 안의 글자 수만큼 마디를 똑같이 나눈다)
//   가락:  1~7 = 음계의 몇 번째 음.  ' 한 옥타브 위,  , 한 옥타브 아래.  - 앞 음을 이어 감.  . 쉼.  (5 6) 한 칸을 둘로 쪼갬
//   화음:  1~7 = 그 음 위에 쌓은 3화음.  o = 3음을 뺀 빈 5도,  M/m = 장/단 3도로 고정,  s = 4도 걸침,  7 = 7음 더함
//   타악:  X 세게,  x 보통,  o 여리게,  . 쉼

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
export const arp = (inst, pattern, o = {}) => ({ kind: 'arp', inst, pattern, ...o });
export const pad = (inst, o = {}) => ({ kind: 'pad', inst, ...o });
export const strum = (pattern, o = {}) => ({ kind: 'strum', inst: 'lute', pattern, ...o });
export const perc = (type, pattern, o = {}) => ({ kind: 'perc', type, pattern, ...o });
export const drone = (inst, degs, o = {}) => ({ kind: 'drone', inst, degs, ...o });
export const gen = (fn, o = {}) => ({ kind: 'gen', fn, ...o });
export const sec = (bars, chords, parts, o = {}) => ({ bars, chords, parts, ...o });

/* ---------- 곡을 마디별 음 목록으로 바꾸기 ---------- */

function compileSection(track, s) {
  const B = track.beats;
  // 화음 줄: [{ at(박), len(박), tones }]
  const chords = [];
  const cb = parseBars(s.chords);
  for (let b = 0; b < s.bars; b++) {
    for (const sl of cb[b % cb.length]) {
      if (sl.tok === '-' && chords.length) chords[chords.length - 1].len += sl.len * B;
      else if (sl.tok !== '.' && sl.tok !== '-') chords.push({ at: (b + sl.at) * B, len: sl.len * B, tones: chordTones(track, sl.tok) });
    }
  }
  const chordAt = (beat) => { let c = chords[0]; for (const x of chords) if (x.at <= beat + 1e-6) c = x; return c; };
  const bars = Array.from({ length: s.bars }, () => []);
  const gens = [];
  const push = (part, beat, ev) => {
    const b = Math.min(s.bars - 1, Math.floor(beat / B + 1e-6));
    ev.on = part.on; ev.beat = beat - b * B; // 같은 객체를 넣는다 ('-'로 길이를 늘릴 수 있게)
    bars[b].push(ev);
  };
  for (const p of s.parts) {
    const vel = p.vel ?? 0.7; const oct = 12 * (p.oct ?? 0);
    if (p.kind === 'gen') { gens.push(p); continue; }
    if (p.kind === 'drone') {
      for (const d of p.degs.split(/\s+/)) {
        push(p, 0, { inst: p.inst, midi: degree(track, d) + oct, dur: s.bars * B + 0.5, vel, o: p.o });
      }
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
    const pb = parseBars(p.kind === 'mel' ? p.score : p.pattern);
    if (p.kind === 'mel' && pb.length !== s.bars && s.bars % pb.length) throw new Error(`${track.id}: 가락 마디 수(${pb.length})가 구간(${s.bars})과 안 맞음`);
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
        } else if (p.kind === 'mel') {
          last = { inst: p.inst, midi: degree(track, sl.tok) + oct, dur: len, vel, o: p.o, legato: p.legato ?? 0.96 };
          push(p, beat, last);
        } else if (p.kind === 'arp') {
          const tones = chordAt(beat).tones;
          last = { inst: p.inst, midi: track.root + ladder(tones, +sl.tok) + oct, dur: len, vel: vel * (sl.at === 0 ? 1 : 0.84), o: p.o, legato: p.legato ?? 1 };
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

/* ---------- 연주기: 곡을 틀고, 다른 곡으로 서서히 넘긴다 ---------- */

const AHEAD = 1.3; // 이만큼 앞의 마디까지 미리 예약 (탭이 뒤에 있어도 끊기지 않게)

export class MusicPlayer {
  constructor(engine, tracks) {
    this.e = engine; this.tracks = tracks; this.cur = null; this.timer = null;
  }
  get playing() { return this.cur?.track.id ?? null; }
  play(id, { fade = 2.2 } = {}) {
    if (this.cur?.track.id === id) return;
    const track = this.tracks.find((t) => t.id === id);
    if (!track) return;
    const had = !!this.cur;
    this.stop(fade);
    const group = this.e.group('music', track.gain ?? 1);
    const start = this.e.ctx.currentTime + (had ? fade * 0.45 : 0.08);
    this.cur = { track, group, pos: { sec: 0, bar: 0, loop: 0 }, next: start };
    this.tick();
    if (!this.timer) this.timer = setInterval(() => this.tick(), 180);
  }
  stop(fade = 1.5) {
    if (this.cur) { this.cur.group.stop(fade); this.cur = null; }
  }
  tick() {
    const c = this.cur;
    if (!c) return;
    const now = this.e.ctx.currentTime;
    if (c.next < now - 0.3) c.next = now + 0.05; // 오래 멈췄다 돌아왔을 때
    while (c.next < now + AHEAD) {
      scheduleBar(c.track, c.group, c.pos, c.next);
      c.next += barSeconds(c.track);
      c.pos = nextPos(c.track, c.pos);
    }
  }
}
