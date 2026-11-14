// 환경음: 음악 아래에 늘 깔리는 그곳의 소리. 곡과 곡 사이의 쉬는 구간을 이것이 채운다.
// 전부 그 자리에서 무작위로 만들어서, 같은 소리가 되풀이되지 않는다.
// 장면(scene) = 깔리는 소리(beds) + 가끔 나는 소리(shots: [이름, 평균 간격(초)]).
import { kit } from './sfx.js';

const SCENES = {
  none: { name: '없음', beds: [], shots: [] },
  hearth: { name: '난롯가', beds: [['fire', 0.5], ['wind', 0.12, 380]], shots: [['pop', 2.2], ['creak', 26]] },
  spring: { name: '봄 들판', beds: [['wind', 0.16, 700], ['brook', 0.2]], shots: [['bird', 3.5], ['bird2', 9], ['leaves', 22]] },
  summer: { name: '여름 한낮', beds: [['wind', 0.1, 800]], shots: [['bird', 7], ['cicada', 9], ['leaves', 16]] },
  autumn: { name: '가을 들판', beds: [['wind', 0.3, 520]], shots: [['leaves', 6], ['crow', 26], ['bird2', 20]] },
  winter: { gain: 0.5, name: '겨울 들판', beds: [['wind', 0.5, 620]], shots: [['gust', 11], ['crow', 45], ['farbell', 80]] },
  night: { name: '밤', beds: [['wind', 0.14, 420]], shots: [['cricket', 2.4], ['owl', 24], ['leaves', 30]] },
  rain: { gain: 0.4, name: '비', beds: [['rain', 0.5], ['wind', 0.18, 500]], shots: [['drop', 0.9], ['thunder', 70]] },
  town: { name: '도시 거리', beds: [['crowd', 0.4], ['wind', 0.08, 600]], shots: [['hammer', 18], ['cart', 28], ['bird2', 30], ['farbell', 55], ['hooves', 40]] },
  castle: { gain: 0.8, name: '성채', beds: [['wind', 0.36, 450]], shots: [['flag', 5], ['hammer', 32], ['crow', 40], ['farhorn', 90]] },
  capital: { gain: 0.75, name: '왕도 거리', beds: [['crowd', 0.55], ['wind', 0.06, 600]], shots: [['farbell', 32], ['cart', 22], ['hooves', 26], ['hammer', 40]] },
  road: { gain: 0.8, name: '길 위', beds: [['wind', 0.36, 480]], shots: [['bird', 10], ['leaves', 11], ['hooves', 45], ['crow', 50]] },
  dungeon: { gain: 0.75, name: '미궁', beds: [['wind', 0.42, 210, 1.6], ['rumble', 0.4]], shots: [['drip', 2.6], ['chain', 38], ['farfall', 30]] },
  bleak: { gain: 0.7, name: '황량한 들', beds: [['wind', 0.44, 400]], shots: [['crow', 18], ['gust', 14]] },
};
export const AMBIENCES = Object.entries(SCENES).filter(([id]) => id !== 'none').map(([id, s]) => ({ id, name: s.name }));

const CHUNK = 18; // 깔리는 소리는 이 길이(초)로 잘라 겹쳐 가며 잇는다

export class Ambience {
  constructor(engine, { rnd = Math.random } = {}) {
    this.e = engine; this.rnd = rnd; this.id = 'none'; this.group = null; this.k = null;
    this.bedNext = 0; this.shotAt = {}; this.timer = null; this.level = 1;
  }
  get playing() { return this.id; }
  set(id, fade = 2.5) {
    if (!SCENES[id]) id = 'none';
    if (id === this.id) return;
    this.group?.stop(fade);
    this.id = id; this.group = null;
    if (id === 'none') return;
    this.group = this.e.group('amb', this.level * (SCENES[id].gain ?? 1));
    this.group.fadeIn(fade);
    this.k = kit(this.group, 'amb');
    const now = this.e.ctx.currentTime;
    this.bedNext = now;
    this.shotAt = {};
    for (const [name, every] of SCENES[id].shots) this.shotAt[name] = now + 0.5 + this.rnd() * every * 1.2;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 400);
    this.tick();
  }
  stop(fade = 1) { this.set('none', fade); }
  tick() {
    const g = this.group; if (!g || g.dead) return;
    const now = this.e.ctx.currentTime; const sc = SCENES[this.id];
    if (now > this.bedNext - 1.5) {
      const t = Math.max(now, this.bedNext);
      for (const b of sc.beds) this.bed(b, t);
      this.bedNext = t + CHUNK - 4;
    }
    for (const [name, every] of sc.shots) {
      if (now + 1 < this.shotAt[name]) continue;
      const t = Math.max(now + 0.05, this.shotAt[name]);
      SHOTS[name](this.k, t, this.rnd);
      this.shotAt[name] = t + every * (0.45 + this.rnd() * 1.2);
    }
  }
  bed([kind, vel, f, q], t) {
    const g = this.group, c = g.ctx, e = this.e, out = g.bus('amb').in, r = this.rnd;
    if (kind === 'wind') { g.note('wind', t, 60, CHUNK - 4, vel, { f, q, attack: 3.5, release: 4 }); return; }
    // 아래는 잡음을 걸러 만드는 깔개. 4초에 걸쳐 들어오고 나가서 이음매가 들리지 않는다.
    const envl = c.createGain();
    envl.gain.setValueAtTime(0, t); envl.gain.linearRampToValueAtTime(vel, t + 4);
    envl.gain.setValueAtTime(vel, t + CHUNK - 4); envl.gain.linearRampToValueAtTime(0, t + CHUNK);
    envl.connect(out);
    const band = (type, freq, qq, gain, lfoHz, depth) => {
      const n = c.createBufferSource(); n.buffer = e.noise; n.loop = true;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = freq; fl.Q.value = qq;
      const ag = c.createGain(); ag.gain.value = gain;
      n.connect(fl); fl.connect(ag); ag.connect(envl);
      n.start(t, r() * 1.5); n.stop(t + CHUNK + 0.1);
      if (lfoHz) { const l = c.createOscillator(); l.frequency.value = lfoHz * (0.8 + r() * 0.4); const lg = c.createGain(); lg.gain.value = gain * depth; l.connect(lg); lg.connect(ag.gain); l.start(t); l.stop(t + CHUNK + 0.1); }
    };
    if (kind === 'crowd') { // 멀리서 웅성거리는 사람들: 말소리 대역 몇 개가 제각기 출렁인다
      band('bandpass', 380, 2.2, 0.5, 2.3, 0.6); band('bandpass', 640, 2.5, 0.4, 3.1, 0.7); band('bandpass', 1100, 2.5, 0.22, 4.3, 0.7);
      band('bandpass', 1700, 3, 0.1, 5.2, 0.8); band('lowpass', 160, 0.5, 0.25, 0.3, 0.5);
    } else if (kind === 'rain') { band('highpass', 2600, 0.5, 0.2, 0.4, 0.25); band('bandpass', 900, 0.6, 0.12, 0.23, 0.3); }
    else if (kind === 'brook') { band('bandpass', 1500, 1.2, 0.1, 6.5, 0.6); band('bandpass', 2600, 1.6, 0.06, 9.3, 0.7); band('bandpass', 700, 1, 0.07, 3.7, 0.5); }
    else if (kind === 'fire') { band('lowpass', 260, 0.6, 0.5, 1.7, 0.4); band('bandpass', 1200, 0.7, 0.03, 7, 0.8); }
    else if (kind === 'rumble') band('lowpass', 70, 0.7, 1.2, 0.17, 0.6);
  }
}

/* ---------- 가끔 나는 소리 ---------- */
const far = 0.6; // 멀리서 나는 소리의 크기
const SHOTS = {
  // 작은 새: 빠르게 오르내리는 짧은 울음 몇 번
  bird(k, t, r) {
    const base = 2600 + r() * 2200; const n = 2 + Math.floor(r() * 5); const up = r() < 0.5; let x = t;
    for (let i = 0; i < n; i++) {
      const d = 0.05 + r() * 0.07; const f = base * (0.9 + r() * 0.25);
      k.tone(x, d, { f: up ? f * 0.8 : f * 1.2, f2: up ? f * 1.2 : f * 0.8, gain: 0.035 + r() * 0.03, attack: 0.01 });
      x += d + 0.03 + r() * 0.09;
    }
  },
  // 두 음으로 우는 새
  bird2(k, t, r) {
    const f = 1700 + r() * 700; const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const x = t + i * 0.62; k.tone(x, 0.16, { f, f2: f * 0.98, gain: 0.04, attack: 0.02 }); k.tone(x + 0.22, 0.2, { f: f * 0.8, f2: f * 0.78, gain: 0.035, attack: 0.02 }); }
  },
  crow(k, t, r) {
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const x = t + i * (0.42 + r() * 0.1); const f = 520 + r() * 80;
      k.tone(x, 0.24, { type: 'sawtooth', f, f2: f * 0.82, gain: 0.012, attack: 0.03 });
      k.noise(x, 0.24, { f: 1500, f2: 1200, q: 3, gain: 0.06 * far, attack: 0.03 });
    }
  },
  owl(k, t, r) { const f = 340 + r() * 40; [0, 0.42, 0.62, 1.05].forEach((d, i) => k.tone(t + d, i === 3 ? 0.5 : 0.2, { f, f2: f * 0.96, gain: 0.04, attack: 0.05 })); },
  cricket(k, t, r) { const f = 4100 + r() * 500; const n = 2 + Math.floor(r() * 3); for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) k.tone(t + i * 0.3 + j * 0.03, 0.022, { f, gain: 0.014, attack: 0.004 }); },
  cicada(k, t, r) { const f = 5200 + r() * 800; const g = k.noise(t, 2.5 + r() * 2, { f, q: 9, gain: 0.02, attack: 1 }); void g; },
  leaves(k, t, r) { k.noise(t, 1.6 + r() * 1.6, { f: 3200 + r() * 1500, f2: 2400, q: 0.7, gain: 0.05, attack: 0.8 }); k.crackle(t + 0.4, 1, { f: 5000, gain: 0.02, rate: 30 }); },
  gust(k, t, r) { k.noise(t, 3 + r() * 2, { f: 500, f2: 900 + r() * 500, q: 1.2, gain: 0.22, attack: 1.6 }); },
  drop(k, t, r) { for (let i = 0; i < 3; i++) k.noise(t + r() * 0.8, 0.02, { type: 'highpass', f: 3000 + r() * 3000, gain: 0.05 + r() * 0.05, attack: 0.001 }); },
  thunder(k, t, r) { k.noise(t, 3.5 + r() * 2, { type: 'lowpass', f: 160, f2: 60, q: 0.6, gain: 0.7, attack: 0.3 }); k.noise(t + 0.2, 1.2, { type: 'lowpass', f: 400, f2: 120, gain: 0.25, attack: 0.05 }); },
  drip(k, t, r) { const f = 1100 + r() * 1500; k.tone(t, 0.09, { f, f2: f * 1.5, gain: 0.07 + r() * 0.07, attack: 0.002 }); if (r() < 0.4) k.tone(t + 0.13 + r() * 0.1, 0.07, { f: f * 1.2, f2: f * 1.7, gain: 0.04, attack: 0.002 }); },
  chain(k, t, r) { for (let i = 0; i < 5; i++) k.metal(t + i * (0.07 + r() * 0.08), 2100 + r() * 1500, { gain: 0.02 * far, decay: 0.18 }); },
  farfall(k, t, r) { k.thud(t, 0.16 + r() * 0.12, 60); k.crackle(t + 0.1, 0.5, { f: 900, gain: 0.03, rate: 25, type: 'bandpass' }); },
  hammer(k, t, r) { const n = 2 + Math.floor(r() * 4); for (let i = 0; i < n; i++) k.metal(t + i * 0.52, 1250, { gain: 0.022 * far, decay: 0.3, ratios: [1, 2.76, 5.4] }); },
  cart(k, t, r) { k.noise(t, 2.6 + r(), { type: 'lowpass', f: 140, q: 0.8, gain: 0.3, attack: 1 }); for (let i = 0; i < 5; i++) k.knock(t + 0.3 + i * (0.4 + r() * 0.1), 130 + r() * 40, 0.04); },
  hooves(k, t, r) { const n = 4 + Math.floor(r() * 5); for (let i = 0; i < n; i++) { const x = t + i * 0.36; const g = 0.05 * Math.sin((Math.PI * (i + 0.5)) / n); k.knock(x, 320, g); k.knock(x + 0.11, 270, g * 0.8); } },
  flag(k, t, r) { const n = 1 + Math.floor(r() * 3); for (let i = 0; i < n; i++) k.noise(t + i * (0.16 + r() * 0.1), 0.12, { type: 'lowpass', f: 700 + r() * 500, gain: 0.1, attack: 0.02 }); },
  farbell(k, t, r) { const m = [50, 52, 55][Math.floor(r() * 3)]; const n = 1 + Math.floor(r() * 3); for (let i = 0; i < n; i++) k.note('bell', t + i * 1.6, m, 3, 0.07, { decay: 4 }); },
  farhorn(k, t) { k.note('horn', t, 50, 1.2, 0.12); k.note('horn', t + 1.3, 57, 1.8, 0.12); },
  pop(k, t, r) { k.crackle(t, 0.25 + r() * 0.3, { f: 2200, gain: 0.07, rate: 22 }); if (r() < 0.3) k.knock(t + 0.1, 500 + r() * 300, 0.04); },
  creak(k, t, r) { const f = 180 + r() * 60; k.tone(t, 0.5, { type: 'sawtooth', f, f2: f * 1.15, gain: 0.008, attack: 0.15 }); k.noise(t, 0.5, { f: 900, q: 6, gain: 0.03, attack: 0.15 }); },
};

/**
 * 지금 상황에 맞는 환경음 장면. where: 곡 고르기와 같은 낱말(village_spring, town, road …), weather: '한낮 · 비' 같은 글
 */
export function pickAmbience(where, weather = '') {
  if (!where || where === 'none') return 'none';
  if (where === 'title' || where === 'cradle') return 'hearth';
  if (where === 'dungeon') return 'dungeon';
  if (where === 'town') return /밤/.test(weather) ? 'night' : 'town';
  if (where === 'capital') return /밤/.test(weather) ? 'night' : 'capital';
  if (where === 'castle') return 'castle';
  if (/비/.test(weather)) return 'rain';
  if (where === 'road') return /밤/.test(weather) ? 'night' : 'road';
  if (where === 'hardship') return 'bleak';
  if (/눈/.test(weather) || where === 'village_winter') return 'winter';
  if (/밤/.test(weather)) return 'night';
  return { village_spring: 'spring', village_summer: 'summer', village_autumn: 'autumn' }[where] ?? 'spring';
}
