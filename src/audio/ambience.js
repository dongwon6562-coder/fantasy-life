// 환경음: 음악 아래에 늘 깔리는 그곳의 소리. 곡과 곡 사이의 쉬는 구간을 이것이 채운다.
// 전부 그 자리에서 무작위로 만들어서, 같은 소리가 되풀이되지 않는다.
// 장면(scene) = 깔리는 소리(beds) + 가끔 나는 소리(shots: [이름, 평균 간격(초)]).
// 바깥 장면은 '곳|계절|날씨|때' (예: field|autumn|rain|night) 로 그때그때 짜 맞춘다 (compose).
// 같은 마을도 봄비 오는 밤과 눈보라 치는 겨울 낮이 다르게 들린다.
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
  deep: { gain: 0.65, name: '깊은 구렁', beds: [['wind', 0.3, 140, 2.2], ['rumble', 0.62]], shots: [['drip', 5.5], ['moan', 24], ['farfall', 21], ['chain', 75]] },
  hall: { gain: 0.7, name: '궁정 복도', beds: [['wind', 0.14, 300], ['crowd', 0.16]], shots: [['steps', 13], ['door', 48], ['farbell', 70], ['flag', 30]] },
};

/* ---------- 계절·날씨·때에 맞춰 장면 짜기 ---------- */
const PLACE_NAME = { field: '들판', town: '도시', capital: '왕도', castle: '성채', road: '길 위', bleak: '황량한 들', hearth: '난롯가' };
const SEASON_NAME = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
const WX_NAME = { clear: '맑음', cloudy: '흐림', wind: '바람', fog: '안개', rain: '비', storm: '뇌우', snow: '눈', blizzard: '눈보라' };
const TOD_NAME = { day: '낮', dawn: '새벽', dusk: '해 질 녘', night: '밤' };
const PLACE_GAIN = { field: 1, town: 1, capital: 0.75, castle: 0.8, road: 0.8, bleak: 0.7, hearth: 1 };
const WX_GAIN = { clear: 1, cloudy: 1, wind: 0.6, fog: 1, rain: 0.45, storm: 0.38, snow: 0.9, blizzard: 0.55 };

function compose(place, season, wx, tod) {
  const night = tod === 'night', dawn = tod === 'dawn', dusk = tod === 'dusk', day = tod === 'day';
  const wet = wx === 'rain' || wx === 'storm', white = wx === 'snow' || wx === 'blizzard';
  const beds = [], shots = [];
  const add = (name, every) => { const had = shots.find((x) => x[0] === name); const v = Math.round(every * 10) / 10; if (had) had[1] = Math.min(had[1], v); else shots.push([name, v]); };
  const name = `${SEASON_NAME[season]} ${PLACE_NAME[place]} · ${WX_NAME[wx]} · ${TOD_NAME[tod]}`;
  let gain = PLACE_GAIN[place] * WX_GAIN[wx] * (night ? 0.9 : 1);

  if (place === 'hearth') { // 집 안: 난롯불, 그리고 지붕과 창 너머의 날씨
    beds.push(['fire', 0.5], ['wind', wx === 'blizzard' ? 0.34 : wx === 'storm' || wx === 'wind' ? 0.24 : 0.12, 380]);
    add('pop', 2.2); add('creak', wx === 'wind' || wx === 'storm' || wx === 'blizzard' ? 11 : 26);
    if (wet) { beds.push(['roof', wx === 'storm' ? 0.3 : 0.22]); add('thunder', wx === 'storm' ? 20 : 110); }
    if (wx === 'blizzard') add('gust', 9);
    return { name, gain: 1, beds, shots };
  }

  // 1. 바람
  let wind = { spring: 0.16, summer: 0.1, autumn: 0.28, winter: 0.4 }[season];
  let wf = { spring: 700, summer: 800, autumn: 520, winter: 620 }[season];
  if (place === 'castle' || place === 'road' || place === 'bleak') wind += 0.14;
  if (place === 'town' || place === 'capital') wind *= 0.5;
  if (wx === 'wind') wind = wind * 1.5 + 0.24;
  else if (wx === 'storm') wind += 0.26;
  else if (wx === 'blizzard') { wind = 0.78; wf = 700; }
  else if (wx === 'snow') { wind = 0.2; wf = 320; }
  else if (wx === 'fog') { wind *= 0.6; wf = 300; }
  else if (wx === 'cloudy') wind *= 1.2;
  if (night) wf *= 0.7;
  if (season === 'winter' && place === 'field' && !white) gain *= 0.6;
  beds.push(['wind', Math.min(0.9, wind), wf]);
  if (wx === 'blizzard') beds.push(['wind', 0.3, 1250, 5]); // 문틈을 파고드는 높은 바람 소리

  // 2. 물
  if (wx === 'rain') beds.push(['rain', { spring: 0.4, summer: 0.6, autumn: 0.48, winter: 0.4 }[season]]);
  if (wx === 'storm') beds.push(['rain', 0.75]);
  if (wet) add('drop', wx === 'storm' ? 0.5 : 0.9);
  if (place === 'field' && season === 'spring' && !wet && !night) beds.push(['brook', 0.2]); // 눈 녹은 개울

  // 3. 사람
  const people = { town: 0.4, capital: 0.55 }[place];
  if (people) {
    const f = (night ? 0.14 : dawn ? 0.5 : 1) * ({ rain: 0.5, storm: 0.3, snow: 0.6, blizzard: 0.2, fog: 0.7 }[wx] ?? 1);
    if (people * f > 0.03) beds.push(['crowd', people * f]);
  }

  // 4. 짐승과 벌레. 날이 궂을수록 뜸해진다.
  const q = { cloudy: 1.5, fog: 2.2, wind: 1.6, snow: 2.6 }[wx] ?? 1;
  const life = !wet && wx !== 'blizzard';
  const wild = place === 'field' || place === 'road';
  if (wild && life && !night) {
    if (season === 'spring') { add('bird', (dawn ? 1.8 : 3.5) * q); add('bird2', 9 * q); if (day && wx === 'clear') add('lark', 34); }
    if (season === 'summer') { add('bird', (dawn ? 3 : 7) * q); if (day && wx !== 'fog') add('cicada', 9 * q); if (dusk) add('cricket', 5); }
    if (season === 'autumn') { add('crow', 26 * q); add('bird2', 20 * q); if (!dusk) add('geese', 50); }
    if (season === 'winter') add('crow', 45 * q);
    if (dusk && season !== 'winter') add('crow', 34);
  }
  if (wild && life && night) {
    if (season === 'spring') { add('frog', 5); add('cricket', 6 * q); add('owl', 28); }
    if (season === 'summer') { add('cricket', 2.2 * q); add('frog', 10); add('owl', 24); }
    if (season === 'autumn') { add('cricket', 5 * q); add('owl', 22); }
    if (season === 'winter') { add('owl', 40); add('howl', 65); }
  }
  if (wild && wx === 'rain' && (season === 'spring' || season === 'summer') && (night || dusk)) add('frog', 4);
  if (people) {
    if (!night) { add('hammer', (place === 'town' ? 18 : 40) * (wet || white ? 2 : 1)); add('cart', (place === 'town' ? 28 : 22) * (wet ? 1.6 : 1)); add('hooves', place === 'town' ? 40 : 26); add('farbell', place === 'town' ? 55 : 32); }
    else { add('farbell', 75); add('creak', 30); add('steps', 40); if (life && season === 'summer') add('cricket', 4.5); }
    if (life && !night && season !== 'winter' && place === 'town') add('bird2', 30 * q);
  }
  if (place === 'castle') {
    add('flag', wx === 'wind' || wx === 'storm' || wx === 'blizzard' ? 2.4 : wx === 'fog' ? 14 : 5);
    if (!night) add('hammer', 32);
    if (life) add(night ? 'owl' : 'crow', 40 * q);
    add('farhorn', night ? 150 : 90);
  }
  if (place === 'bleak') { if (life) add('crow', 18 * q); add('gust', 14); }
  if (place === 'road' && !night && !wet) add('hooves', 45);

  // 5. 날씨가 내는 소리
  if (wild && season !== 'winter' && !white) add('leaves', { spring: 22, summer: 16, autumn: 6 }[season] / (wx === 'wind' || wx === 'storm' ? 2.5 : 1));
  if (wx === 'wind') add('gust', 7);
  else if (wx === 'storm') add('gust', 6);
  else if (wx === 'blizzard') add('gust', 4);
  else if (season === 'winter' && place !== 'bleak') add('gust', white ? 26 : 11);
  if (wx === 'storm') { add('thunder', 15); add('crack', 44); }
  if (wx === 'rain') add('thunder', season === 'summer' ? 55 : 120);
  if (wx === 'fog') { add('drip', 8); if (place === 'field') add('farbell', 60); }
  if (wx === 'snow' && place === 'field') add('farbell', 80);
  return { name, gain, beds, shots };
}

const made = new Map();
/** 장면 id → { name, gain, beds, shots }. 없는 id면 null */
export function ambienceScene(id) {
  if (SCENES[id]) return SCENES[id];
  if (made.has(id)) return made.get(id);
  const [place, season, wx, tod] = String(id).split('|');
  if (!PLACE_NAME[place] || !SEASON_NAME[season] || !WX_NAME[wx] || !TOD_NAME[tod]) return null;
  const sc = compose(place, season, wx, tod);
  made.set(id, sc);
  return sc;
}
// 미리 듣기에 내놓는 본보기들
export const AMBIENCES = [
  'field|spring|clear|dawn', 'field|spring|rain|day', 'field|spring|clear|night', 'field|summer|clear|day', 'field|summer|storm|dusk', 'field|summer|clear|night',
  'field|autumn|wind|day', 'field|autumn|fog|dawn', 'field|autumn|rain|night', 'field|winter|clear|day', 'field|winter|snow|day', 'field|winter|blizzard|night',
  'town|spring|clear|day', 'town|autumn|rain|day', 'town|winter|snow|night', 'capital|summer|clear|day', 'castle|autumn|wind|day', 'road|summer|clear|day', 'road|winter|blizzard|day',
  'bleak|autumn|cloudy|day', 'hearth|winter|blizzard|night', 'hearth|summer|storm|night', 'hearth', 'hall', 'dungeon', 'deep',
].map((id) => ({ id, name: ambienceScene(id).name }));

const CHUNK = 18; // 깔리는 소리는 이 길이(초)로 잘라 겹쳐 가며 잇는다

export class Ambience {
  constructor(engine, { rnd = Math.random } = {}) {
    this.e = engine; this.rnd = rnd; this.id = 'none'; this.sc = SCENES.none; this.group = null; this.k = null;
    this.bedNext = 0; this.shotAt = {}; this.timer = null; this.level = 1;
  }
  get playing() { return this.id; }
  set(id, fade = 2.5) {
    let sc = ambienceScene(id);
    if (!sc) { id = 'none'; sc = SCENES.none; }
    if (id === this.id) return;
    this.group?.stop(fade);
    this.id = id; this.sc = sc; this.group = null;
    if (id === 'none') return;
    this.group = this.e.group('amb', this.level * (sc.gain ?? 1));
    this.group.fadeIn(fade);
    this.k = kit(this.group, 'amb');
    const now = this.e.ctx.currentTime;
    this.bedNext = now;
    this.shotAt = {};
    for (const [name, every] of sc.shots) this.shotAt[name] = now + 0.5 + this.rnd() * every * 1.2;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 400);
    this.tick();
  }
  stop(fade = 1) { this.set('none', fade); }
  tick() {
    const g = this.group; if (!g || g.dead) return;
    const now = this.e.ctx.currentTime; const sc = this.sc;
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
    else if (kind === 'roof') { band('lowpass', 520, 0.6, 0.5, 0.3, 0.3); band('bandpass', 1500, 0.8, 0.05, 0.5, 0.4); } // 지붕을 두드리는 비 (집 안에서)
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
  // 개구리: 낮고 짧은 울음 몇 번
  frog(k, t, r) {
    const f = 300 + r() * 120; const n = 2 + Math.floor(r() * 5); let x = t;
    for (let i = 0; i < n; i++) { for (let j = 0; j < 4; j++) k.noise(x + j * 0.028, 0.024, { f: f * 3, q: 7, gain: 0.14 * far, attack: 0.003 }); k.tone(x, 0.13, { f, f2: f * 1.25, gain: 0.03, attack: 0.02 }); x += 0.26 + r() * 0.3; }
  },
  // 높이 지나가는 기러기 떼: 멀리서 다가왔다 멀어진다
  geese(k, t, r) {
    const n = 7 + Math.floor(r() * 8); let x = t;
    for (let i = 0; i < n; i++) {
      const a = Math.sin((Math.PI * (i + 0.5)) / n); const f = 560 + r() * 160;
      k.tone(x, 0.17, { type: 'sawtooth', f, f2: f * 1.22, gain: 0.009 * a, attack: 0.03 });
      k.noise(x, 0.17, { f: f * 2.4, q: 5, gain: 0.09 * far * a, attack: 0.03 });
      x += 0.2 + r() * 0.45;
    }
  },
  // 종다리: 높이 떠서 길게 지저귄다
  lark(k, t, r) {
    const n = 12 + Math.floor(r() * 12); let x = t;
    for (let i = 0; i < n; i++) { const f = 3300 + r() * 1700; const d = 0.04 + r() * 0.05; k.tone(x, d, { f, f2: f * (r() < 0.5 ? 1.15 : 0.88), gain: 0.02 + r() * 0.015, attack: 0.008 }); x += d + 0.02 + r() * 0.05; }
  },
  // 먼 산의 늑대 울음
  howl(k, t, r) {
    const f = 380 + r() * 70;
    k.tone(t, 0.9, { f: f * 0.78, f2: f, gain: 0.03, attack: 0.4 });
    k.tone(t + 0.7, 2.6 + r(), { f, f2: f * 0.86, gain: 0.045, attack: 0.5 });
  },
  // 가까이 떨어진 벼락
  crack(k, t, r) {
    k.noise(t, 0.12, { type: 'highpass', f: 1800, gain: 0.22, attack: 0.002 });
    k.noise(t + 0.03, 0.5, { type: 'lowpass', f: 900, f2: 200, gain: 0.9, attack: 0.01 });
    k.noise(t + 0.15, 5 + r() * 2, { type: 'lowpass', f: 220, f2: 50, q: 0.6, gain: 1.5, attack: 0.2 });
  },
  // 깊은 곳에서 올라오는 낮은 울림
  moan(k, t, r) {
    const f = 62 + r() * 26; const d = 4 + r() * 3;
    k.tone(t, d, { f, f2: f * 0.9, gain: 0.11, attack: 1.6 });
    k.noise(t, d, { f: f * 3.5, f2: f * 2.8, q: 9, gain: 0.12, attack: 1.8 });
  },
  // 돌바닥을 지나가는 발소리
  steps(k, t, r) { const n = 4 + Math.floor(r() * 5); const gap = 0.5 + r() * 0.12; for (let i = 0; i < n; i++) k.step(t + i * gap, 0.09 * Math.sin((Math.PI * (i + 0.5)) / n) + 0.012); },
  // 멀리서 닫히는 무거운 문
  door(k, t) { k.thud(t, 0.14, 85); k.noise(t + 0.02, 0.6, { type: 'lowpass', f: 300, f2: 120, gain: 0.08, attack: 0.01 }); },
  pop(k, t, r) { k.crackle(t, 0.25 + r() * 0.3, { f: 2200, gain: 0.07, rate: 22 }); if (r() < 0.3) k.knock(t + 0.1, 500 + r() * 300, 0.04); },
  creak(k, t, r) { const f = 180 + r() * 60; k.tone(t, 0.5, { type: 'sawtooth', f, f2: f * 1.15, gain: 0.008, attack: 0.15 }); k.noise(t, 0.5, { f: 900, q: 6, gain: 0.03, attack: 0.15 }); },
};

export const AMB_BEDS = ['wind', 'rain', 'roof', 'brook', 'fire', 'crowd', 'rumble'];
export const AMB_SHOTS = Object.keys(SHOTS);

const SEASON_OF = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
const wxOf = (text) => (/뇌우/.test(text) ? 'storm' : /눈보라/.test(text) ? 'blizzard' : /비/.test(text) ? 'rain' : /눈/.test(text) ? 'snow' : /안개/.test(text) ? 'fog' : /바람/.test(text) ? 'wind' : /흐림/.test(text) ? 'cloudy' : 'clear');
const todOf = (text) => (/밤/.test(text) ? 'night' : /새벽/.test(text) ? 'dawn' : /해 질/.test(text) ? 'dusk' : 'day');

/**
 * 지금 상황에 맞는 환경음 장면 id.
 * where: 곡 고르기와 같은 낱말(village_spring, town, road …), weather: '한낮 · 비' 같은 글, month: 달(1~12, 없으면 where에서 짐작)
 */
export function pickAmbience(where, weather = '', month = 0) {
  if (!where || where === 'none') return 'none';
  if (where === 'dungeon' || where === 'deep' || where === 'hall') return where;
  if (where === 'title') return 'hearth';
  const vs = /^village_(\w+)$/.exec(where)?.[1];
  const season = month >= 1 && month <= 12 ? SEASON_OF[month - 1] : SEASON_NAME[vs] ? vs : 'spring';
  const place = where === 'cradle' ? 'hearth' : where === 'hardship' ? 'bleak' : PLACE_NAME[where] ? where : 'field';
  return `${place}|${season}|${wxOf(weather)}|${todOf(weather)}`;
}
