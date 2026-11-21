// 소리 엔진.
// - Engine: 음량, 울림(리버브), 마지막 압축기, 악기 샘플 받아 오기, 곳의 울림(setSpace)과 음악의 밝기(setTone)
// - Group: 곡 하나(또는 효과음 묶음)가 쓰는 악기 통로. 통째로 서서히 끄고 켤 수 있다.
//
// 음악(group 종류 'music')은 실제 악기를 녹음한 샘플로만 소리를 낸다 (목록은 samples.js, 파일은 assets/audio/music/).
//   뜯는 현: harp(하프) lute(류트·나일론 기타) pizz(현 뜯기)
//   활: strings(현악 합주) spic(짧게 끊는 활) trem(떨리는 활) cello(독주 첼로) bass(콘트라베이스)
//   나무 관: flute(플루트) recorder(리코더) oboe(오보에) clarinet(클라리넷) bassoon(바순)
//   쇠 관: horn(호른) trumpet(트럼펫) trombone(트롬본)
//   그 밖: choir(합창) organ(오르간) bell(관종) glock(글로켄슈필) timp(팀파니)
//   타악(perc): taiko taiko2 taiko3(큰북 낮은 것부터) tom tom2 tom3(북) wood wood2(나무) timp timp2 timp3
// 샘플 파일은 window.__flAssets 가 있을 때만(아이폰 판) 그 곡이 처음 흐를 때 받아 온다. 없으면 음악은 조용히 쉰다.
//
// 효과음·환경음(group 종류 'sfx', 'amb')의 가락도 녹음 악기로 낸다 (30단계, SFX_INST·SFX_PERC 표. engine.pin으로 받아 둔 뒤부터).
// 녹음을 받기 전이나 표에 없는 이름은 아래의 옛 합성 악기로 난다 (sfx.js·ambience.js가 부르는 이름):
//   lute harp strings viol flute horn choir choirOo bell glass drone wind pipe organ
//   타악: frame war tom tick shaker jingle heart snare anvil
import { SAMPLES } from './samples.js';

export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

/* ---------- 미리 계산하는 소리 재료 ---------- */

function makeNoise(ctx) {
  const n = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// 돌로 지은 방의 울림. 낮은 소리는 오래, 높은 소리는 금방 사라지게 세 대역을 따로 줄인다.
function makeIR(ctx, secs, { pre = 0.018, hi = 0.36, lo = 1.15 } = {}) {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * secs * 1.2);
  const buf = ctx.createBuffer(2, n, sr);
  const p0 = Math.floor(sr * pre);
  const aL = 1 - Math.exp((-2 * Math.PI * 280) / sr), aH = 1 - Math.exp((-2 * Math.PI * 2600) / sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let l1 = 0, l2 = 0;
    for (let i = p0; i < n; i++) {
      const t = (i - p0) / sr;
      const w = Math.random() * 2 - 1;
      l1 += aL * (w - l1); l2 += aH * (w - l2);
      const low = l1, mid = l2 - l1, high = w - l2;
      const v = low * 2.2 * Math.exp((-6.9 * t) / (secs * lo)) + mid * Math.exp((-6.9 * t) / secs) + high * 0.55 * Math.exp((-6.9 * t) / (secs * hi));
      d[i] = v * Math.min(1, t / 0.03) ** 0.7; // 울림이 서서히 차오른다
    }
    // 이른 반사음: 벽에서 한두 번 튕겨 온 소리
    const taps = ch ? [0.011, 0.023, 0.037, 0.053, 0.071] : [0.007, 0.017, 0.031, 0.047, 0.067];
    taps.forEach((s, k) => { const i = p0 + Math.floor(s * sr * (secs > 1.5 ? 1 : 0.5)); if (i < n) d[i] += (k % 2 ? -1 : 1) * 0.7 / (k + 1.6); });
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

/* ---------- 녹음 샘플 악기 ---------- */

// gain 크기, a 소리가 올라오는 시간, rel 놓은 뒤 사라지는 시간, ring 놓아도 더 울리는 시간(뜯는 악기·종),
// loop 긴 음을 이어 붙일 수 있는가(지속 악기), solo 독주 악기(이어 붙일 때 위상을 맞춤), skip 샘플 앞머리 건너뛰기, lead 그만큼 일찍 켜기(늦게 차오르는 악기),
// tail 샘플 끝에서 버리는 길이, swell 긴 음이 부풀었다 잦아듦, lp [여릴 때, 셀 때] 밝기, hp 낮은 웅웅거림 걷기,
// pan 자리, spread 음높이에 따라 좌우로 벌어지는 정도(높은 음이 왼쪽), send 울림에 보내는 양
export const INST = {
  harp: { gain: 0.32, a: 0.002, rel: 0.5, ring: 4, lp: [1500, 11000], pan: 0.2, spread: 0.25, send: 0.3 },
  lute: { gain: 0.36, a: 0.002, rel: 0.35, ring: 1.4, lp: [1300, 9000], pan: -0.22, spread: 0.1, send: 0.2, tail: 0.3 },
  pizz: { gain: 0.42, a: 0.002, rel: 0.3, ring: 1.5, lp: [1600, 9000], pan: -0.05, spread: 0.45, send: 0.3 },
  strings: { gain: 0.56, a: 0.07, rel: 0.5, loop: true, skip: 0.05, lead: 0.07, tail: 0.3, swell: true, lp: [2600, 9000], pan: 0, spread: 0.55, send: 0.36 },
  spic: { gain: 0.36, a: 0.003, rel: 0.2, ring: 1, lp: [2200, 10000], pan: 0, spread: 0.5, send: 0.3 },
  trem: { gain: 0.42, a: 0.09, rel: 0.5, loop: true, skip: 0.03, lead: 0.04, tail: 0.3, swell: true, lp: [2400, 8000], pan: 0, spread: 0.5, send: 0.36 },
  cello: { gain: 0.9, a: 0.03, rel: 0.22, loop: true, solo: true, tail: 0.3, re: 0.5, swell: true, lp: [2400, 8000], pan: 0.18, send: 0.3 },
  bass: { gain: 0.5, a: 0.04, rel: 0.25, loop: true, solo: true, tail: 0.3, re: 0.5, lp: [900, 4000], pan: 0.3, send: 0.2 },
  flute: { gain: 0.8, a: 0.02, rel: 0.14, loop: true, solo: true, tail: 0.3, re: 0.6, swell: true, hp: 200, pan: -0.14, send: 0.36 },
  recorder: { gain: 0.8, a: 0.012, rel: 0.1, loop: true, solo: true, tail: 0.3, re: 0.5, hp: 220, pan: -0.1, send: 0.34 },
  oboe: { gain: 0.85, a: 0.02, rel: 0.12, loop: true, solo: true, tail: 0.3, re: 0.6, swell: true, hp: 200, pan: 0.1, send: 0.34 },
  clarinet: { gain: 0.78, a: 0.025, rel: 0.14, loop: true, solo: true, tail: 0.3, re: 0.6, swell: true, hp: 120, pan: 0.14, send: 0.34 },
  bassoon: { gain: 0.75, a: 0.025, rel: 0.14, loop: true, solo: true, tail: 0.3, re: 0.6, pan: 0.2, send: 0.3 },
  horn: { gain: 0.9, a: 0.03, rel: 0.25, loop: true, solo: true, tail: 0.3, re: 0.5, swell: true, lp: [1500, 6000], pan: -0.3, send: 0.44 },
  trumpet: { gain: 0.7, a: 0.015, rel: 0.18, loop: true, solo: true, tail: 0.3, re: 0.6, lp: [2500, 9000], pan: 0.25, send: 0.4 },
  trombone: { gain: 0.76, a: 0.02, rel: 0.2, loop: true, solo: true, tail: 0.3, re: 0.6, lp: [1600, 7000], pan: 0.3, send: 0.4 },
  choir: { gain: 0.38, a: 0.12, rel: 0.6, loop: true, tail: 0.3, re: 0.6, lead: 0.03, det: 6, lp: [2200, 7000], pan: 0, spread: 0.4, send: 0.5 },
  organ: { gain: 0.32, a: 0.04, rel: 0.35, loop: true, solo: true, tail: 0.3, re: 0.6, pan: 0.05, send: 0.5 },
  bell: { gain: 0.42, a: 0.002, rel: 1.5, ring: 6, pan: 0.1, send: 0.5 },
  glock: { gain: 1.0, a: 0.001, rel: 0.8, ring: 2.5, lp: [3000, 14000], pan: -0.2, send: 0.5 },
  timp: { gain: 0.75, a: 0.002, rel: 0.5, ring: 3.5, layers: true, det: 0, pan: 0.12, send: 0.34 },
  taiko: { gain: 0.55, a: 0.001, rel: 0.4, ring: 2, det: 4, lp: [700, 9000], pan: 0, send: 0.3 },
  tom: { gain: 0.95, a: 0.001, rel: 0.3, ring: 1, det: 6, lp: [1200, 10000], pan: -0.1, send: 0.26 },
  wood: { gain: 1.2, a: 0.001, rel: 0.2, ring: 0.4, det: 8, pan: 0.15, send: 0.3 },
};
// 타악 이름 → [악기, 음]
export const PERC = {
  taiko: ['taiko', 36], taiko2: ['taiko', 43], taiko3: ['taiko', 50],
  tom: ['tom', 45], tom2: ['tom', 52], tom3: ['tom', 60],
  wood: ['wood', 60], wood2: ['wood', 72],
  timp: ['timp', 42], timp2: ['timp', 49], timp3: ['timp', 54],
};
const XF = 0.32; // 긴 음을 이어 붙일 때 겹치는 시간
// 겹치는 동안 크기가 꺼지지 않게 둥근 곡선으로 넘긴다
const XF_IN = Float32Array.from({ length: 33 }, (_, i) => Math.sin((i / 32) * Math.PI / 2));
const XF_OUT = Float32Array.from({ length: 33 }, (_, i) => Math.cos((i / 32) * Math.PI / 2));

// 풀어 둔 샘플. AudioContext를 새로 만들어도(뒤에 갔다 돌아왔을 때) 다시 받지 않는다.
const DECODED = new Map(); // 파일 → { buf, secs, at } | Promise
const KEEP_SECS = 220;     // 이보다 많이 풀려 있으면 지금 곡이 안 쓰는 녹음부터 내려놓는다 (메모리)
// 그 악기로 midis 음들을 내는 데 필요한 녹음들 (음마다 가장 가까운 것). midis가 없으면 전부.
function rowsFor(inst, midis) {
  const rows = SAMPLES[inst] ?? [];
  if (!midis) return rows;
  const out = new Set();
  const tags = [...new Set(rows.map((r) => r[4]))];
  for (const m of midis) for (const tag of tags) {
    let best = null;
    for (const r of rows) if (r[4] === tag && (!best || Math.abs(r[0] - m) < Math.abs(best[0] - m))) best = r;
    if (best) out.add(best);
  }
  return [...out];
}
const assetBase = () => (typeof window !== 'undefined' && window.__flAssets ? `${window.__flAssets}audio/music/` : null);
const decode = (ctx, ab) => new Promise((ok, no) => { const p = ctx.decodeAudioData(ab, ok, no); if (p?.catch) p.catch(no); });

// 곳마다 울림을 섞는 양. 음악은 늘 홀에서 울리고(이야기 바깥의 소리), 굴에서만 조금 더 젖는다.
export const SPACES = {
  open: { music: { hall: 1 }, amb: { hall: 0.7 }, sfx: { room: 0.45, hall: 0.3 } },
  street: { music: { hall: 1 }, amb: { hall: 1 }, sfx: { room: 1 } },
  indoor: { music: { hall: 0.9 }, amb: { hall: 0.35, room: 0.5 }, sfx: { room: 1.7 } },
  hall: { music: { hall: 1.1 }, amb: { hall: 0.5, stone: 0.7 }, sfx: { room: 0.5, stone: 0.8 } },
  cave: { music: { hall: 1.25 }, amb: { hall: 0.6, stone: 1.2 }, sfx: { room: 0.3, stone: 1.2 } },
};
// 효과음·환경음의 가락을 낼 때, 옛 합성 악기 이름 → [녹음 악기, 크기, 옮김]. 녹음이 받아져 있으면 이쪽으로 낸다.
export const SFX_INST = {
  // 크기는 옛 합성음과 같은 크기로 들리게 재서 맞춘 값 (1.3초 창 RMS)
  harp: ['harp', 2.0], lute: ['lute', 1.7], strings: ['strings', 1.3], viol: ['cello', 1.45], flute: ['flute', 1], horn: ['horn', 1.35],
  choir: ['choir', 2.2], choirOo: ['choir', 1], organ: ['organ', 2.6], bell: ['bell', 1], glass: ['glock', 1, 12], drone: ['bass', 1.5], pipe: ['recorder', 1],
};
export const SFX_PERC = { war: ['taiko', 36, 1.3], frame: ['tom', 45, 0.9], tom: ['tom', 52, 0.85], heart: ['taiko', 36, 0.55] };

/* ---------- 엔진 ---------- */

export class Engine {
  constructor(ctx) {
    this.ctx = ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -15; this.comp.knee.value = 12; this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.012; this.comp.release.value = 0.28;
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28; hp.Q.value = 0.5;
    // 맨 끝의 안전판: 0.7까지는 그대로, 그 위는 부드럽게 눌러 어떤 순간에도 찢어지는 소리가 나지 않게 한다
    this.clip = ctx.createWaveShaper();
    const curve = new Float32Array(2049);
    for (let i = 0; i < 2049; i++) { const x = (i - 1024) / 512; const a = Math.abs(x); curve[i] = Math.sign(x) * (a < 0.7 ? a : 0.7 + 0.28 * Math.tanh((a - 0.7) / 0.28)); }
    this.clip.curve = curve;
    const pre = ctx.createGain(); pre.gain.value = 0.5; const post = ctx.createGain(); post.gain.value = 1;
    this.master.connect(hp); hp.connect(this.comp); this.comp.connect(pre); pre.connect(this.clip); this.clip.connect(post); post.connect(ctx.destination);
    this.out = post;
    // 울림 둘: 음악·환경음은 넓은 홀, 효과음은 가까운 작은 방
    const verb = (secs, opt, gain) => {
      const c = ctx.createConvolver(); c.buffer = makeIR(ctx, secs, opt);
      const g = ctx.createGain(); g.gain.value = gain; c.connect(g);
      return { in: c, out: g };
    };
    this.hall = verb(3.1, {}, 1.6);
    this.room = verb(0.7, { pre: 0.004, hi: 0.5, lo: 1 }, 1.1);
    // 돌로 지은 큰 방과 굴: 효과음과 환경음이 그 안에 있는 것처럼 길게 울린다 (30단계, setSpace)
    this.stone = verb(2.4, { pre: 0.032, hi: 0.42, lo: 1.35 }, 1.25);
    // 음악은 중요한 효과음이 날 때 잠깐 물러난다 (duck)
    this.duckGain = ctx.createGain();
    this.duckGain.connect(this.master);
    this.hall.out.connect(this.duckGain); this.room.out.connect(this.master); this.stone.out.connect(this.master);
    // 음악의 밝기: 밤·안개·눈 오는 날에는 높은 소리를 조금 걷어 낸다 (setTone)
    const tone = () => { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 18000; f.Q.value = 0.5; return f; };
    this.tone = [tone(), tone()];
    this.tone[0].connect(this.duckGain);
    // 음량 손잡이는 울림 앞에 둔다. music 음악, amb 환경음, sfx 효과음
    // 울림으로 가는 길은 셋(room 가까운 방, hall 넓은 홀, stone 돌방·굴)이고, 지금 있는 곳에 따라 섞는 양이 바뀐다.
    this.vol = {};
    for (const [k, dest] of [['music', this.tone[0]], ['amb', this.master], ['sfx', this.master]]) {
      const dry = ctx.createGain(), wet = ctx.createGain();
      dry.connect(dest);
      const sends = {};
      for (const name of ['room', 'hall', 'stone']) {
        const g = ctx.createGain(); g.gain.value = SPACES.street[k]?.[name] ?? 0;
        if (k === 'music') { if (name === 'hall') { wet.connect(this.tone[1]); this.tone[1].connect(g); } else continue; } else wet.connect(g);
        g.connect(this[name].in); sends[name] = g;
      }
      this.vol[k] = { dry, wet, v: 1, sends };
    }
    this.space = 'street'; this.pinned = new Set();
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
  /** 음악을 잠깐 줄인다. depth: 줄인 크기(0~1), hold: 버티는 시간(초) */
  duck(depth = 0.45, hold = 1.2, when = 0) {
    const t = this.ctx.currentTime + when; const g = this.duckGain.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(depth, t, 0.05); g.setTargetAtTime(1, t + hold, 0.5);
  }
  /** 지금 있는 곳의 울림. name: open(들·길) street(거리) indoor(집 안) hall(돌로 지은 큰 방) cave(굴·미궁) */
  setSpace(name, secs = 1.2) {
    const sp = SPACES[name]; if (!sp || name === this.space) return;
    this.space = name;
    const t = this.ctx.currentTime;
    for (const k of ['music', 'amb', 'sfx']) for (const [n, g] of Object.entries(this.vol[k].sends)) g.gain.setTargetAtTime(sp[k]?.[n] ?? 0, t, secs / 3);
  }
  /** 음악의 밝기(Hz)와 울림의 양(1이 보통). 때와 날씨에 맞춰 천천히 바뀐다 */
  setTone(hz = 18000, wet = 1, secs = 3) {
    const t = this.ctx.currentTime;
    for (const f of this.tone) f.frequency.setTargetAtTime(Math.max(1500, Math.min(18000, hz)), t, secs / 3);
    this.musicWet = wet;
    this.vol.music.sends.hall.gain.setTargetAtTime((SPACES[this.space].music?.hall ?? 1) * wet, t, secs / 3);
  }
  /** 늘 쓰는 녹음(효과음의 가락, 소리 큐)을 받아 두고 내려놓지 않는다 */
  async pin(needs, keep = true) {
    const files = new Set();
    for (const [inst, midis] of Object.entries(needs)) for (const r of rowsFor(inst, midis)) files.add(r[1]);
    if (keep) for (const f of files) this.pinned.add(f);
    return (await Promise.all([...files].map((f) => this.loadFile(f)))).every(Boolean);
  }
  /** 그 음들을 낼 녹음이 다 풀려 있는가 */
  has(needs) {
    for (const [inst, midis] of Object.entries(needs)) for (const r of rowsFor(inst, midis)) if (!DECODED.get(r[1])?.buf) return false;
    return true;
  }
  pluck(midi, kind) {
    const key = kind + midi;
    let b = this.plucks.get(key);
    if (!b) { b = makePluck(this.ctx, midi, kind); this.plucks.set(key, b); }
    return b;
  }
  group(kind = 'music', level = 1) { return new Group(this, kind, level); }

  /* 샘플 받아 오기. base: 샘플 폴더 주소. 없으면(웹 판, node 점검) 아무것도 받지 않고 음악은 쉰다. */
  get sampleBase() { return this._base === undefined ? assetBase() : this._base; }
  set sampleBase(v) { this._base = v; }
  /** 그 악기의 녹음 가운데 지금 풀려 있는 것들 */
  zones(inst) {
    const out = [];
    for (const [m, file, c, d, tag] of SAMPLES[inst] ?? []) { const x = DECODED.get(file); if (x && x.buf) out.push({ m, c, d, tag, buf: x.buf }); }
    return out;
  }
  loadFile(file) {
    const have = DECODED.get(file);
    if (have) { if (have.buf) have.at = Date.now(); return have.buf ? Promise.resolve(true) : have; }
    const base = this.sampleBase;
    if (!base || typeof fetch !== 'function') return Promise.resolve(false);
    const p = fetch(base + file)
      .then((r) => { if (!r.ok) throw new Error(`${file} ${r.status}`); return r.arrayBuffer(); })
      .then((ab) => decode(this.ctx, ab))
      .then((buf) => { DECODED.set(file, { buf, secs: buf.duration, at: Date.now() }); return true; })
      .catch(() => { DECODED.delete(file); return false; }); // 못 받았으면 다음에 다시 해 본다
    DECODED.set(file, p);
    return p;
  }
  /**
   * 곡에 필요한 녹음을 받아 온다. needs: { 악기: [음들] 또는 null(전부) }. 다 되면 true.
   * 그 곡이 실제로 내는 음에 가까운 녹음만 받으므로 빨리 끝나고 메모리도 덜 쓴다.
   */
  async load(needs) {
    const files = new Set();
    for (const [inst, midis] of Object.entries(needs)) for (const r of rowsFor(inst, midis)) files.add(r[1]);
    const ok = (await Promise.all([...files].map((f) => this.loadFile(f)))).every(Boolean);
    let total = 0; const idle = [];
    for (const [k, d] of DECODED) if (d.buf) { total += d.secs; if (!files.has(k) && !this.pinned.has(k)) idle.push([k, d]); }
    idle.sort((a, b) => a[1].at - b[1].at);
    for (const [k, d] of idle) { if (total <= KEEP_SECS) break; DECODED.delete(k); total -= d.secs; }
    return ok;
  }
}

// 악기 통로 설정: 크기, 좌우 위치, 울림에 보내는 양
const BUS = {
  lute: { level: 0.62, pan: -0.22, send: 0.2 },
  harp: { level: 0.7, pan: 0.2, send: 0.34 },
  strings: { level: 0.17, pan: -0.05, send: 0.38 },
  viol: { level: 0.3, pan: 0.12, send: 0.3 },
  flute: { level: 0.3, pan: -0.12, send: 0.36 },
  horn: { level: 0.24, pan: 0.24, send: 0.4 },
  pipe: { level: 0.13, pan: -0.18, send: 0.3 },
  organ: { level: 0.16, pan: 0.08, send: 0.5 },
  choir: { level: 0.9, pan: 0.05, send: 0.5 },
  choirOo: { level: 0.95, pan: -0.05, send: 0.5 },
  bell: { level: 0.27, pan: 0.1, send: 0.55 },
  glass: { level: 0.32, pan: -0.15, send: 0.55 },
  drone: { level: 0.3, pan: 0, send: 0.12 },
  wind: { level: 1.1, pan: 0, send: 0.08 },
  perc: { level: 0.85, pan: 0, send: 0.16 },
  fx: { level: 1.8, pan: 0, send: 0.14 },
  amb: { level: 1, pan: 0, send: 0.22 },
};
const FORMANTS = {
  choir: [[620, 5, 1], [1080, 6, 0.55], [2500, 8, 0.2]],
  choirOo: [[330, 5, 1], [800, 6, 0.32], [2300, 8, 0.07]],
};

export class Group {
  constructor(engine, kind, level = 1) {
    this.e = engine; this.ctx = engine.ctx; this.dead = false; this.level = level; this.kind = kind;
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
  // 샘플 악기의 통로: 낮은 웅웅거림 걷기 → 자리 → 울림
  sbus(name) {
    let b = this.buses[name];
    if (b) return b;
    const c = this.ctx, cfg = INST[name];
    const input = c.createGain(); let tail = input;
    if (cfg.hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = cfg.hp; f.Q.value = 0.6; tail.connect(f); tail = f; }
    const pan = c.createStereoPanner(); pan.pan.value = cfg.spread ? 0 : cfg.pan; tail.connect(pan);
    const send = c.createGain(); send.gain.value = cfg.send;
    pan.connect(this.dry); pan.connect(send); send.connect(this.wet);
    return (this.buses[name] = { in: input });
  }
  /** 샘플 악기의 음 하나 */
  sample(inst, t, midi, dur, vel, o = {}) {
    const cfg = INST[inst]; const all = cfg ? this.e.zones(inst) : [];
    if (!all.length) return;
    const c = this.ctx;
    let zs = all;
    if (cfg.layers) { const tag = vel > 0.72 ? 'ff' : 'mf'; zs = all.filter((z) => z.tag === tag); if (!zs.length) zs = all; }
    // 가장 가까운 녹음을 고르되, 비슷하게 가까운 것이 있으면 가끔 그쪽을 쓴다 (같은 음이 되풀이될 때 똑같이 들리지 않게)
    let z = zs[0], z2 = null;
    for (const x of zs) { if (Math.abs(x.m - midi) < Math.abs(z.m - midi)) { z2 = z; z = x; } else if (x !== z && (!z2 || Math.abs(x.m - midi) < Math.abs(z2.m - midi))) z2 = x; }
    if (z2 && Math.abs(z2.m - midi) - Math.abs(z.m - midi) <= 2 && Math.abs(z2.m - midi) <= 4 && Math.random() < 0.3) z = z2;
    const det = cfg.det ?? 3;
    const rate = 2 ** ((midi - z.m) / 12 - z.c / 1200 + ((Math.random() * 2 - 1) * det) / 1200);
    const t0 = Math.max(t - (cfg.lead ?? 0), c.currentTime + 0.003);
    const peak = cfg.gain * (0.16 + 0.84 * Math.min(1.2, vel) ** 1.35) * (o.gain ?? 1);
    const slur = !!o.slur && !!cfg.loop; // 이음줄: 녹음의 첫머리(혀·활이 닿는 소리)를 건너뛰고 부드럽게 들어간다
    const a = o.attack ?? (slur ? Math.max(cfg.a, 0.045) : cfg.a); const rel = o.damp ? 0.06 : o.release ?? cfg.rel;
    const hold = Math.max(a + 0.01, o.damp ? dur : dur + (cfg.ring ?? 0));
    const end = t0 + hold + rel * 1.7;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    if (cfg.swell && dur > 0.9) { // 활과 숨: 긴 음은 조금 부풀었다 잦아든다
      g.gain.linearRampToValueAtTime(peak * 0.8, t0 + a);
      g.gain.linearRampToValueAtTime(peak, t0 + Math.max(a + 0.05, hold * 0.45));
      g.gain.linearRampToValueAtTime(peak * 0.82, t0 + hold);
    } else { g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, t0 + hold); }
    g.gain.setTargetAtTime(0, t0 + hold, rel / 3);
    let head = g;
    if (cfg.lp) { // 여리게 내면 어둡게
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.4;
      f.frequency.value = cfg.lp[0] + (cfg.lp[1] - cfg.lp[0]) * Math.min(1, vel) ** 2 * (o.dark ? 0.4 : 1);
      f.connect(g); head = f;
    }
    if (cfg.spread) {
      const p = c.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, cfg.pan + (cfg.spread * (60 - midi)) / 30));
      g.connect(p); p.connect(this.sbus(inst).in);
    } else g.connect(this.sbus(inst).in);
    const tailCut = cfg.tail ?? 0.2;
    let at = t0, off = (cfg.skip ?? 0) + (slur ? 0.09 : 0);
    for (let k = 0; k < 40; k++) {
      const src = c.createBufferSource(); src.buffer = z.buf; src.playbackRate.value = rate;
      const avail = (Math.min(z.d, z.buf.duration) - tailCut - off) / rate;
      const last = !cfg.loop || at + avail >= end || avail < XF * 2.5;
      if (k === 0 && last) src.connect(head);
      else {
        const sg = c.createGain(); src.connect(sg); sg.connect(head);
        // 독주 악기는 물결의 위상을 맞춰 곧게 넘기고, 여럿이 내는 소리(합주·합창)는 둥근 곡선으로 넘긴다
        if (k === 0) sg.gain.setValueAtTime(1, at);
        else if (cfg.solo) { sg.gain.setValueAtTime(0, at); sg.gain.linearRampToValueAtTime(1, at + XF); }
        else { sg.gain.setValueAtTime(0, at); sg.gain.setValueCurveAtTime(XF_IN, at, XF); }
        if (!last) {
          if (cfg.solo) { sg.gain.setValueAtTime(1, at + avail - XF); sg.gain.linearRampToValueAtTime(0, at + avail); }
          else sg.gain.setValueCurveAtTime(XF_OUT, at + avail - XF, XF);
        }
      }
      src.start(at, off);
      src.stop(last ? end + 0.05 : at + avail + 0.02);
      if (last) break;
      const posOld = off + (avail - XF) * rate; // 겹치기 시작할 때 앞 조각이 읽고 있는 자리
      at += avail - XF; off = (cfg.skip ?? 0) + (cfg.re ?? 0.6) + Math.random() * 0.15;
      if (cfg.solo) { const T0 = 1 / (440 * 2 ** ((z.m - 69) / 12 + z.c / 1200)); off += (((posOld - off) % T0) + T0) % T0; }
    }
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
    if (name === 'strings') { chain(biq('lowpass', 3600, 0.4)); chain(biq('peaking', 320, 0.8, 2)); }
    if (name === 'pipe') { chain(biq('highpass', 380, 0.7)); chain(biq('peaking', 1500, 1.4, 5)); chain(biq('lowpass', 4600, 0.5)); }
    if (name === 'organ') chain(biq('lowpass', 5200, 0.5));
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
    if (this.kind === 'music') { this.sample(inst, t, midi, dur, vel, o ?? {}); return; }
    o = o ?? {};
    // 효과음의 가락도 녹음된 악기로 (받아져 있을 때). 아직이면 옛 합성음으로 낸다.
    const sm = SFX_INST[inst];
    if (sm && this.e.zones(sm[0]).length) { this.sample(sm[0], t, midi + (sm[2] ?? 0), dur, vel, { gain: sm[1], damp: o.damp, attack: o.attack, release: o.release }); return; }
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
      src.playbackRate.value = 2 ** (((Math.random() - 0.5) * 7) / 1200);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 + vel * vel * 6500; lp.Q.value = 0.3;
      const g = G(0.25 + vel * 0.85);
      if (o.damp) g.gain.setTargetAtTime(0, t + dur, 0.045);
      src.connect(lp); lp.connect(g); g.connect(out); src.start(t);
      if (o.damp) src.stop(t + dur + 0.3);
      return;
    }
    if (inst === 'strings') {
      const a = Math.min(o.attack ?? 0.45, Math.max(0.015, dur * 0.4));
      const g = G(); const end = env(g.gain, a, vel * 0.8, o.release ?? 0.8);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
      const top = Math.min(6500, f * (2.2 + vel * 3.2) + 500);
      lp.frequency.setValueAtTime(Math.min(top, f * 1.4 + 200), t); lp.frequency.linearRampToValueAtTime(top, t + a * 1.3 + 0.02);
      const os = [osc('sawtooth', f, -9 - Math.random() * 3), osc('sawtooth', f, (Math.random() - 0.5) * 3), osc('sawtooth', f, 8 + Math.random() * 3)];
      const vib = this.bus('strings').vib;
      let last = g;
      if (o.trem) { // 떨리는 활 (트레몰로)
        const tg = G(0.62); const l = osc('sine', 9.5 + Math.random()); const lg = G(0.38);
        l.connect(lg); lg.connect(tg.gain); g.connect(tg); last = tg; run([l], end);
      }
      for (const x of os) { vib.connect(x.detune); x.connect(lp); }
      lp.connect(g); last.connect(out); run(os, end);
      return;
    }
    if (inst === 'viol') {
      const a = Math.min(o.attack ?? 0.07, dur * 0.5);
      const g = G(); const hold = Math.max(a, dur); const r = o.release ?? 0.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.86, t + a);
      if (dur > 0.7) { g.gain.linearRampToValueAtTime(vel, t + hold * 0.55); g.gain.linearRampToValueAtTime(vel * 0.8, t + hold); } // 활을 밀며 부풀었다 잦아든다
      else g.gain.setValueAtTime(vel * 0.86, t + hold);
      g.gain.setTargetAtTime(0, t + hold, r / 3.5);
      const end = t + hold + r * 1.6;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.1;
      lp.frequency.value = Math.min(5200, f * (2.4 + vel * 1.6));
      const o1 = osc('sawtooth', f), o2 = osc('square', f, 3); const g2 = G(0.22);
      if (o.from && o.from !== midi) { // 앞 음에서 미끄러져 온다
        const f0 = mtof(o.from + (midi - o.from) * 0.55);
        for (const x of [o1, o2]) { x.frequency.setValueAtTime(f0, t); x.frequency.exponentialRampToValueAtTime(f, t + 0.06); }
      }
      const v = vibrato([o1, o2], 5.2, dur > 0.5 ? 11 : 0, 0.22);
      // 활이 현에 닿는 순간의 거친 소리
      const n = c.createBufferSource(); n.buffer = this.e.noise; const nb = c.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = Math.min(4000, f * 3); nb.Q.value = 0.8;
      const ng = G(); ng.gain.setValueAtTime(0.12 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      n.connect(nb); nb.connect(ng); ng.connect(g); n.start(t, Math.random()); n.stop(t + 0.12);
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
    if (inst === 'pipe') {
      const g = G(); const end = env(g.gain, Math.min(0.03, dur * 0.4), vel, 0.09);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(3200, f * 3); bp.Q.value = 1.6;
      const o1 = osc('sawtooth', f), o2 = osc('square', f, -4); const g2 = G(0.5); const dryg = G(0.35);
      const v = vibrato([o1, o2], 5.6, dur > 0.7 ? 6 : 0, 0.35);
      o1.connect(bp); o2.connect(g2); g2.connect(bp); bp.connect(g); o1.connect(dryg); dryg.connect(g); g.connect(out);
      run([o1, o2, v], end);
      return;
    }
    if (inst === 'organ') {
      const g = G(); const end = env(g.gain, Math.min(0.05, dur * 0.4), vel, o.release ?? 0.3);
      const stops = [[1, 1], [2, 0.5], [3, 0.26], [4, 0.2], [6, 0.07]];
      const os = stops.filter(([m]) => f * m < 9000).map(([m, amp]) => { const x = osc('sine', f * m, (Math.random() - 0.5) * 4); const xg = G(amp); x.connect(xg); xg.connect(g); return x; });
      const n = c.createBufferSource(); n.buffer = this.e.noise; const nb = c.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = f * 2; nb.Q.value = 2;
      const ng = G(); ng.gain.setValueAtTime(0.25 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); // 바람이 관에 들어가는 소리
      n.connect(nb); nb.connect(ng); ng.connect(out); n.start(t, Math.random()); n.stop(t + 0.1);
      g.connect(out); run(os, end);
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
    if (this.kind === 'music') { const p = PERC[type]; if (p) this.sample(p[0], t, p[1], 0.1, vel); return; }
    const sp = SFX_PERC[type];
    if (sp && this.e.zones(sp[0]).length) { this.sample(sp[0], t, sp[1], 0.1, vel, { gain: sp[2] }); return; }
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
    else if (type === 'snare') { burst('bandpass', 1900, 0.7, 0.11, 0.9); burst('highpass', 4500, 0.7, 0.07, 0.3); thump(190, 150, 0.03, 0.08, 0.3); }
    else if (type === 'anvil') { for (const [fr, am] of [[1130, 0.2], [3120, 0.1], [6100, 0.05]]) thump(fr, fr * 0.995, 0.3, 0.35, am); burst('highpass', 3000, 0.7, 0.02, 0.3); }
  }
}
