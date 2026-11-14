// 소리 엔진. 녹음 파일 없이 Web Audio로 악기 소리를 직접 만든다.
// - Engine: 음량, 울림(리버브), 마지막 압축기
// - Group: 곡 하나(또는 효과음 묶음)가 쓰는 악기 통로. 통째로 서서히 끄고 켤 수 있다.
// 악기: lute(류트) harp(하프) strings(현악 합주) viol(독주 현) flute(나무 피리) horn(뿔나팔)
//       choir / choirOo(합창) bell(종) glass(유리 종) drone(지속 저음) wind(바람)
// 타악: frame(틀북) war(큰북) tom tick(나무) shaker jingle(방울) heart(심장)

export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

/* ---------- 미리 계산하는 소리 재료 ---------- */

function makeNoise(ctx) {
  const n = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// 돌로 지은 큰 방의 울림. 뒤로 갈수록 어두워지는 잡음으로 만든다.
function makeIR(ctx, secs) {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * secs);
  const buf = ctx.createBuffer(2, n, sr);
  const pre = Math.floor(sr * 0.018);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr;
      const a = 0.05 + 0.75 * Math.exp(-t * 2.2);
      lp += a * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.exp((-6.9 * t) / secs) * Math.min(1, t / 0.012);
    }
    // 이른 반사음 몇 개
    const taps = ch ? [0.011, 0.027, 0.041, 0.063] : [0.007, 0.019, 0.037, 0.055];
    taps.forEach((s, k) => { d[Math.floor(s * sr)] += (k % 2 ? -1 : 1) * 0.5 / (k + 1.5); });
    let e = 0;
    for (let i = 0; i < n; i++) e += d[i] * d[i];
    const g = 1 / Math.sqrt(e);
    for (let i = 0; i < n; i++) d[i] *= g;
  }
  return buf;
}

// 뜯는 현 (카플러스-스트롱). 음마다 한 번 계산해 두고 다시 쓴다.
const PLUCK = {
  lute: { dur: 2.4, t60: 2.3, s: 0.44, bright: 0.5, pick: 0.17 },
  harp: { dur: 3.4, t60: 3.6, s: 0.3, bright: 0.72, pick: 0.31 },
};
function makePluck(ctx, midi, kind) {
  const P = PLUCK[kind];
  const sr = ctx.sampleRate;
  const f = mtof(midi);
  const t60 = P.t60 * Math.min(1.25, (196 / f) ** 0.4);
  const rho = 10 ** (-3 / (f * t60));
  const s = P.s;
  const N = sr / f;
  let L = Math.floor(N - s);
  let frac = N - s - L;
  if (frac < 0.1) { L -= 1; frac += 1; }
  const C = (1 - frac) / (1 + frac);
  const line = new Float32Array(L);
  let lp = 0;
  for (let i = 0; i < L; i++) { lp += P.bright * ((Math.random() * 2 - 1) - lp); line[i] = lp; }
  const pk = Math.max(1, Math.round(L * P.pick));
  const tmp = line.slice();
  let mean = 0;
  for (let i = 0; i < L; i++) { line[i] = tmp[i] - 0.9 * tmp[(i - pk + L) % L]; mean += line[i]; }
  mean /= L;
  let peak = 1e-6;
  for (let i = 0; i < L; i++) { line[i] -= mean; peak = Math.max(peak, Math.abs(line[i])); }
  for (let i = 0; i < L; i++) line[i] /= peak;
  const n = Math.floor(sr * Math.min(P.dur, t60 * 1.3 + 0.3));
  const buf = ctx.createBuffer(1, n, sr);
  const out = buf.getChannelData(0);
  let idx = 0, x1 = 0, ax1 = 0, ay1 = 0;
  const fade = Math.floor(sr * 0.06);
  for (let i = 0; i < n; i++) {
    const y = line[idx];
    out[i] = y * (i > n - fade ? (n - i) / fade : 1);
    const l = rho * ((1 - s) * y + s * x1); x1 = y;
    const a = C * l + ax1 - C * ay1; ax1 = l; ay1 = a;
    line[idx] = a;
    if (++idx >= L) idx = 0;
  }
  return buf;
}

/* ---------- 엔진 ---------- */

export class Engine {
  constructor(ctx) {
    this.ctx = ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.knee.value = 14; this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.012; this.comp.release.value = 0.3;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeIR(ctx, 3.3);
    this.reverbOut = ctx.createGain(); this.reverbOut.gain.value = 1.6;
    this.reverb.connect(this.reverbOut); this.reverbOut.connect(this.master);
    // 음량 손잡이는 울림 앞에 둔다 (음악·효과음이 울림 하나를 같이 쓴다)
    this.vol = {};
    for (const k of ['music', 'sfx']) {
      const dry = ctx.createGain(), wet = ctx.createGain();
      dry.connect(this.master); wet.connect(this.reverb);
      this.vol[k] = { dry, wet, v: 1 };
    }
    this.noise = makeNoise(ctx);
    this.plucks = new Map();
  }
  setVolume(kind, v) {
    const o = this.vol[kind];
    o.v = v;
    const t = this.ctx.currentTime;
    o.dry.gain.setTargetAtTime(v, t, 0.05);
    o.wet.gain.setTargetAtTime(v, t, 0.05);
  }
  pluck(midi, kind) {
    const key = kind + midi;
    let b = this.plucks.get(key);
    if (!b) { b = makePluck(this.ctx, midi, kind); this.plucks.set(key, b); }
    return b;
  }
  group(kind = 'music', level = 1) { return new Group(this, kind, level); }
}

// 악기 통로 설정: 크기, 좌우 위치, 울림에 보내는 양
const BUS = {
  lute: { level: 0.62, pan: -0.22, send: 0.2 },
  harp: { level: 0.7, pan: 0.2, send: 0.34 },
  strings: { level: 0.2, pan: -0.05, send: 0.38 },
  viol: { level: 0.3, pan: 0.12, send: 0.3 },
  flute: { level: 0.3, pan: -0.12, send: 0.36 },
  horn: { level: 0.24, pan: 0.24, send: 0.4 },
  choir: { level: 0.9, pan: 0.05, send: 0.5 },
  choirOo: { level: 0.95, pan: -0.05, send: 0.5 },
  bell: { level: 0.27, pan: 0.1, send: 0.55 },
  glass: { level: 0.32, pan: -0.15, send: 0.55 },
  drone: { level: 0.3, pan: 0, send: 0.12 },
  wind: { level: 1.1, pan: 0, send: 0.08 },
  perc: { level: 0.85, pan: 0, send: 0.16 },
  fx: { level: 1.8, pan: 0, send: 0.14 },
};
const FORMANTS = {
  choir: [[620, 5, 1], [1080, 6, 0.55], [2500, 8, 0.2]],
  choirOo: [[330, 5, 1], [800, 6, 0.32], [2300, 8, 0.07]],
};

export class Group {
  constructor(engine, kind, level = 1) {
    this.e = engine; this.ctx = engine.ctx; this.dead = false; this.level = level;
    this.dry = this.ctx.createGain(); this.wet = this.ctx.createGain();
    this.dry.gain.value = level; this.wet.gain.value = level;
    this.dry.connect(engine.vol[kind].dry); this.wet.connect(engine.vol[kind].wet);
    this.buses = {}; this.lfos = [];
  }
  fadeIn(secs) {
    const t = this.ctx.currentTime;
    for (const g of [this.dry, this.wet]) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(this.level, t + secs); }
  }
  // 서서히 끄고, 다 꺼지면 연결을 끊는다
  stop(secs = 1.5) {
    if (this.dead) return;
    this.dead = true;
    const t = this.ctx.currentTime;
    for (const g of [this.dry, this.wet]) {
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + secs);
    }
    for (const l of this.lfos) { try { l.stop(t + secs + 0.1); } catch { /* 이미 멈춤 */ } }
    const off = () => { try { this.dry.disconnect(); this.wet.disconnect(); } catch { /* 없음 */ } };
    if (typeof setTimeout === 'function' && this.ctx.suspend) setTimeout(off, (secs + 4) * 1000);
  }
  lfo(freq, depth) {
    const o = this.ctx.createOscillator(); o.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = depth;
    o.connect(g); o.start(); this.lfos.push(o);
    return g;
  }
  bus(name) {
    let b = this.buses[name];
    if (b) return b;
    const c = this.ctx, cfg = BUS[name];
    const input = c.createGain();
    let tail = input;
    const chain = (node) => { tail.connect(node); tail = node; };
    const biq = (type, f, q = 0.7, gain = 0) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; n.gain.value = gain; return n; };
    if (name === 'lute') { chain(biq('peaking', 210, 1.2, 4)); chain(biq('peaking', 420, 1.5, 3)); chain(biq('lowpass', 5200, 0.5)); }
    if (name === 'harp') { chain(biq('peaking', 300, 1, 2)); chain(biq('lowpass', 7500, 0.5)); }
    if (name === 'strings') { chain(biq('lowpass', 2500, 0.4)); chain(biq('peaking', 320, 0.8, 2)); }
    if (name === 'viol') { chain(biq('peaking', 290, 1.4, 3.5)); chain(biq('peaking', 1150, 1.6, 2.5)); chain(biq('lowpass', 4200, 0.5)); }
    if (name === 'flute') chain(biq('lowpass', 6000, 0.5));
    if (name === 'horn') { chain(biq('peaking', 480, 1, 3)); chain(biq('lowpass', 2900, 0.5)); }
    if (FORMANTS[name]) {
      const sum = c.createGain();
      for (const [f, q, g] of FORMANTS[name]) {
        const bp = biq('bandpass', f, q); const gg = c.createGain(); gg.gain.value = g;
        tail.connect(bp); bp.connect(gg); gg.connect(sum);
      }
      tail = sum;
    }
    const level = c.createGain(); level.gain.value = cfg.level;
    chain(level);
    const pan = c.createStereoPanner(); pan.pan.value = cfg.pan;
    chain(pan);
    const send = c.createGain(); send.gain.value = cfg.send;
    tail.connect(this.dry); tail.connect(send); send.connect(this.wet);
    b = this.buses[name] = { in: input };
    if (name === 'strings') b.vib = this.lfo(4.7, 5);
    return b;
  }

  /** 음 하나. t: 시작 시각(초), dur: 길이(초), vel: 세기 0~1 */
  note(inst, t, midi, dur, vel = 0.7, o = {}) {
    if (this.dead) return;
    const c = this.ctx;
    t = Math.max(t, c.currentTime + 0.003);
    const f = mtof(midi);
    const out = this.bus(inst).in;
    const G = (v = 0) => { const g = c.createGain(); g.gain.value = v; return g; };
    const osc = (type, freq, det = 0) => { const x = c.createOscillator(); x.type = type; x.frequency.value = freq; x.detune.value = det; return x; };
    // 부드럽게 올라갔다 내려오는 음량 곡선. 끝나는 시각을 돌려준다.
    const env = (p, a, peak, r) => {
      const hold = Math.max(a, dur);
      p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
      p.setValueAtTime(peak, t + hold); p.setTargetAtTime(0, t + hold, r / 3.5);
      return t + hold + r * 1.6;
    };
    const run = (nodes, end) => { for (const n of nodes) { n.start(t); n.stop(end); } };
    const vibrato = (targets, rate, cents, delay) => {
      const l = osc('sine', rate * (0.95 + Math.random() * 0.1)); const lg = G(0);
      lg.gain.setValueAtTime(0, t + delay * 0.6); lg.gain.linearRampToValueAtTime(cents, t + delay + 0.35);
      l.connect(lg); for (const x of targets) lg.connect(x.detune);
      return l;
    };

    if (inst === 'lute' || inst === 'harp') {
      const src = c.createBufferSource(); src.buffer = this.e.pluck(midi, inst);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 + vel * vel * 6500; lp.Q.value = 0.3;
      const g = G(0.25 + vel * 0.85);
      if (o.damp) g.gain.setTargetAtTime(0, t + dur, 0.045);
      src.connect(lp); lp.connect(g); g.connect(out); src.start(t);
      if (o.damp) src.stop(t + dur + 0.3);
      return;
    }
    if (inst === 'strings') {
      const a = Math.min(o.attack ?? 0.45, Math.max(0.015, dur * 0.4));
      const g = G(); const end = env(g.gain, a, vel, o.release ?? 0.8);
      const os = [osc('sawtooth', f, -7 - Math.random() * 3), osc('sawtooth', f, 7 + Math.random() * 3)];
      const vib = this.bus('strings').vib;
      let last = g;
      if (o.trem) { // 떨리는 활 (트레몰로)
        const tg = G(0.62); const l = osc('sine', 9.5 + Math.random()); const lg = G(0.38);
        l.connect(lg); lg.connect(tg.gain); g.connect(tg); last = tg; run([l], end);
      }
      for (const x of os) { vib.connect(x.detune); x.connect(g); }
      last.connect(out); run(os, end);
      return;
    }
    if (inst === 'viol') {
      const a = Math.min(o.attack ?? 0.07, dur * 0.5);
      const g = G(); const end = env(g.gain, a, vel, o.release ?? 0.2);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.1;
      lp.frequency.value = Math.min(5200, f * (2.4 + vel * 1.6));
      const o1 = osc('sawtooth', f), o2 = osc('square', f, 3); const g2 = G(0.22);
      const v = vibrato([o1, o2], 5.2, dur > 0.5 ? 11 : 0, 0.22);
      o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(out);
      run([o1, o2, v], end);
      return;
    }
    if (inst === 'flute') {
      const g = G(); const end = env(g.gain, 0.055, vel, 0.14);
      const o1 = osc('triangle', f), o2 = osc('sine', f * 2); const g2 = G(0.13);
      const v = vibrato([o1, o2], 4.6, dur > 0.6 ? 7 : 0, 0.3);
      const n = c.createBufferSource(); n.buffer = this.e.noise; n.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.5; bp.Q.value = 1.1;
      const ng = G();
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.5 * vel, t + 0.02); ng.gain.setTargetAtTime(0.09 * vel, t + 0.03, 0.05);
      ng.gain.setTargetAtTime(0, t + Math.max(0.055, dur), 0.05);
      o1.connect(g); o2.connect(g2); g2.connect(g); n.connect(bp); bp.connect(ng); ng.connect(out); g.connect(out);
      n.start(t, Math.random()); n.stop(end); run([o1, o2, v], end);
      return;
    }
    if (inst === 'horn') {
      const g = G(); const end = env(g.gain, Math.min(0.09, dur * 0.5), vel, 0.25);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
      lp.frequency.setValueAtTime(f * 1.2, t);
      lp.frequency.linearRampToValueAtTime(f * (2 + vel * 2.6), t + 0.13);
      lp.frequency.setTargetAtTime(f * (1.6 + vel), t + 0.13, 0.35);
      const os = [osc('sawtooth', f, -4), osc('sawtooth', f, 4)];
      for (const x of os) x.connect(lp); lp.connect(g); g.connect(out); run(os, end);
      return;
    }
    if (inst === 'choir' || inst === 'choirOo') {
      const g = G(); const end = env(g.gain, Math.min(o.attack ?? 0.55, dur * 0.5), vel, o.release ?? 1.0);
      const os = [osc('sawtooth', f, -9), osc('sawtooth', f, 8)];
      const v = vibrato(os, 5, 9, 0.1);
      for (const x of os) x.connect(g); g.connect(out); run([...os, v], end);
      return;
    }
    if (inst === 'bell' || inst === 'glass') {
      const P = inst === 'bell'
        ? [[0.5, 0.22], [1, 1], [1.19, 0.55], [1.5, 0.22], [2, 0.42], [2.51, 0.18], [3.01, 0.13], [4.2, 0.08]]
        : [[1, 1], [2.0, 0.28], [3.01, 0.11], [4.23, 0.05]];
      const T = o.decay ?? (inst === 'bell' ? 4.2 : 1.7);
      for (const [r, amp] of P) {
        if (f * r > 12000) continue;
        const x = osc('sine', f * r, (Math.random() - 0.5) * 6); const g = G();
        const d = T / r ** 0.85;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * vel, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        x.connect(g); g.connect(out); x.start(t); x.stop(t + d + 0.05);
      }
      return;
    }
    if (inst === 'drone') {
      const g = G(); const end = env(g.gain, o.attack ?? 1.8, vel, o.release ?? 2.6);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 190 + vel * 260; lp.Q.value = 0.5;
      const os = [osc('sawtooth', f, -5), osc('sawtooth', f, 5)]; const sub = osc('sine', f / 2); const sg = G(0.9);
      for (const x of os) x.connect(lp); lp.connect(g); sub.connect(sg); sg.connect(g); g.connect(out);
      run([...os, sub], end);
      return;
    }
    if (inst === 'wind') {
      const g = G(); const end = env(g.gain, o.attack ?? 2.5, vel, o.release ?? 3);
      const n = c.createBufferSource(); n.buffer = this.e.noise; n.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.f ?? 520; bp.Q.value = o.q ?? 0.9;
      const l1 = osc('sine', 0.09 + Math.random() * 0.05), l1g = G((o.f ?? 520) * 0.45);
      const l2 = osc('sine', 0.23 + Math.random() * 0.06), l2g = G(0.4); const ag = G(0.6);
      l1.connect(l1g); l1g.connect(bp.frequency); l2.connect(l2g); l2g.connect(ag.gain);
      n.connect(bp); bp.connect(ag); ag.connect(g); g.connect(out);
      n.start(t, Math.random()); n.stop(end); run([l1, l2], end);
    }
  }

  /** 타악기 한 번 */
  perc(type, t, vel = 0.8) {
    if (this.dead) return;
    const c = this.ctx;
    t = Math.max(t, c.currentTime + 0.003);
    const out = this.bus('perc').in;
    const thump = (f0, f1, drop, decay, amp) => {
      const o = c.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + drop);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * vel, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + decay + 0.05);
    };
    const burst = (ftype, freq, q, decay, amp) => {
      const n = c.createBufferSource(); n.buffer = this.e.noise;
      const fl = c.createBiquadFilter(); fl.type = ftype; fl.frequency.value = freq; fl.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(amp * vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      n.connect(fl); fl.connect(g); g.connect(out); n.start(t, Math.random() * 1.5); n.stop(t + decay + 0.05);
    };
    if (type === 'frame') { thump(105, 60, 0.08, 0.3, 0.9); burst('lowpass', 900, 0.5, 0.05, 0.35); }
    else if (type === 'war') { thump(74, 38, 0.13, 0.75, 1.15); burst('lowpass', 480, 0.5, 0.13, 0.6); burst('bandpass', 1800, 1, 0.015, 0.2); }
    else if (type === 'tom') { thump(150, 92, 0.07, 0.24, 0.7); burst('lowpass', 1200, 0.5, 0.03, 0.2); }
    else if (type === 'tick') { burst('bandpass', 2300, 3, 0.04, 1.6); thump(1250, 900, 0.02, 0.03, 0.2); }
    else if (type === 'shaker') burst('highpass', 6200, 0.7, 0.05, 0.6);
    else if (type === 'jingle') { burst('bandpass', 8600, 2, 0.13, 1.0); thump(6200, 6100, 0.1, 0.12, 0.03); thump(7900, 7800, 0.1, 0.1, 0.025); }
    else if (type === 'heart') thump(62, 40, 0.1, 0.2, 0.9);
  }
}
