// 환경음: 음악 아래에 늘 깔리는 그곳의 소리. 곡과 곡 사이의 쉬는 구간을 이것이 채운다.
// 29단계부터 전부 실제 녹음(CC0, docs/CREDITS.md). 깔개는 24초 고리 녹음을 아무 자리에서 꺼내 겹쳐 잇고,
// 가끔 나는 소리는 녹음 여러 개 가운데 골라 높이·크기·좌우를 흔들어서, 같은 소리가 되풀이되게 들리지 않는다.
// 장면(scene) = 깔리는 소리(beds) + 가끔 나는 소리(shots: [이름, 평균 간격(초)]).
// 바깥 장면은 '곳|계절|날씨|때' (예: field|autumn|rain|night) 로 그때그때 짜 맞춘다 (compose).
// 같은 마을도 봄비 오는 밤과 눈보라 치는 겨울 낮이 다르게 들린다.
import { kit, loadSound } from './sfx.js';

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

const CHUNK = 18; // 깔리는 소리는 이 길이(초)씩 고리 녹음의 아무 자리에서 꺼내, 4초씩 겹쳐 가며 잇는다
const FADE = 4;
// 깔개 녹음(24초 고리)의 크기를 서로 맞추는 값. 개울·난롯불은 튀는 소리가 많아 평균이 낮게 재진다(RMS −31·−35dB, 나머지 −24dB).
const BED_NORM = { wind: 1, rain: 1.6, roof: 1.1, brook: 1.7, fire: 1.3, crowd: 1, rumble: 0.8 };
const BED_LEVEL = 0.9; // 합성 시절의 깔개와 귀로 들리는 크기를 맞춘 값
const bedFile = (kind) => `amb/${kind}`;
// 같은 크기를 유지하는 겹침 곡선 (sin/cos)
const curve = (up) => { const a = new Float32Array(64); for (let i = 0; i < 64; i++) { const x = (i / 63) * Math.PI / 2; a[i] = up ? Math.sin(x) : Math.cos(x); } return a; };
const UP = curve(true), DOWN = curve(false);

export class Ambience {
  constructor(engine, { rnd = Math.random } = {}) {
    this.e = engine; this.rnd = rnd; this.id = 'none'; this.sc = SCENES.none; this.group = null; this.k = null;
    this.bedNext = []; this.shotAt = {}; this.timer = null; this.level = 1;
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
    const c = this.group.ctx;
    // 이 장면에 필요한 녹음을 미리 불러 둔다 (파일이 없으면 조용히 넘어간다)
    for (const [kind] of sc.beds) loadSound(c, bedFile(kind));
    if (sc.shots.length) { loadSound(c, 'amb/shots'); loadSound(c, 'sfx/life'); loadSound(c, 'sfx/act'); }
    const now = this.e.ctx.currentTime;
    this.bedNext = sc.beds.map(() => now);
    this.shotAt = {};
    for (const [name, every] of sc.shots) this.shotAt[name] = now + 0.5 + this.rnd() * every * 1.2;
    if (!this.timer) this.timer = setInterval(() => this.tick(), 400);
    this.tick();
  }
  stop(fade = 1) { this.set('none', fade); }
  tick() {
    const g = this.group; if (!g || g.dead) return;
    const now = this.e.ctx.currentTime; const sc = this.sc;
    sc.beds.forEach((b, i) => {
      if (now <= this.bedNext[i] - 1.5) return;
      const t = Math.max(now, this.bedNext[i]);
      // 녹음이 아직 안 왔으면 다음 번에 다시 (처음 한 번은 천천히 들어온다)
      if (this.bed(b, t, this.bedNext[i] < now - 1)) this.bedNext[i] = t + CHUNK - FADE;
    });
    for (const [name, every] of sc.shots) {
      if (now + 1 < this.shotAt[name]) continue;
      const t = Math.max(now + 0.05, this.shotAt[name]);
      SHOTS[name]?.(this.k, t, this.rnd);
      this.shotAt[name] = t + every * (0.45 + this.rnd() * 1.2);
    }
  }
  /** 깔개 한 토막. 녹음이 준비돼 있지 않으면 false */
  bed([kind, vel, f, q], t, cold = false) {
    const g = this.group, c = g.ctx, r = this.rnd;
    const buf = loadSound(c, bedFile(kind));
    if (!buf) return false;
    const out = g.bus?.('amb')?.in ?? g.dry ?? c.destination;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    src.playbackRate.value = 0.96 + r() * 0.08; // 토막마다 아주 조금 다르게
    let node = src, gain = vel * (BED_NORM[kind] ?? 1) * BED_LEVEL;
    if (kind === 'wind' && f) {
      const fl = c.createBiquadFilter();
      if (q && f >= 1000) { fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = Math.min(q, 4); gain *= 2.5; } // 문틈 바람의 높은 소리
      else { fl.type = 'lowpass'; fl.frequency.value = Math.max(260, f * 3); fl.Q.value = q ? Math.min(q, 2) * 0.7 : 0.5; } // 낮게 웅웅대는 굴 속 바람
      node.connect(fl); node = fl;
    }
    const env = c.createGain();
    const fadeIn = cold ? 2.5 : FADE;
    env.gain.setValueCurveAtTime(UP.map((x) => x * gain), t, fadeIn);
    env.gain.setValueCurveAtTime(DOWN.map((x) => x * gain), t + CHUNK - FADE, FADE);
    node.connect(env); env.connect(out);
    src.start(t, r() * buf.duration);
    src.stop(t + CHUNK + 0.1);
    return true;
  }
}

/* ---------- 가끔 나는 소리: 전부 녹음. 날 때마다 녹음·높이·크기·좌우가 조금씩 다르다 ---------- */
const far = 0.6; // 멀리서 나는 소리의 크기
// 녹음 하나 내기. o.rate 높이, o.sway 높이를 흔드는 폭(배수), o.spread 좌우로 퍼지는 정도
const shot = (name, o = {}) => (k, t, r) => {
  const sw = o.sway ?? 0.08, spread = o.spread ?? 0.6;
  k.rec(name, t, {
    v: Math.floor(r() * 97), gain: (o.gain ?? 1) * (0.8 + r() * 0.35), rate: (o.rate ?? 1) * (1 - sw / 2 + r() * sw),
    lp: o.lp, hp: o.hp, pan: (r() * 2 - 1) * spread, dur: o.dur, steady: true,
  });
};
// 몇 번 이어지는 소리 (새 울음, 발소리처럼)
const shots = (name, n0, n1, gap, o = {}) => (k, t, r) => { const n = n0 + Math.floor(r() * (n1 - n0 + 1)); let x = t; for (let i = 0; i < n; i++) { shot(name, o)(k, x, r); x += gap * (0.8 + r() * 0.5); } };
const SHOTS = {
  bird: shot('bird', { gain: 0.2, sway: 0.14, spread: 0.8 }),
  bird2: shot('bird2', { gain: 0.366, sway: 0.1, spread: 0.8 }),
  crow: shot('crow', { gain: 0.292, lp: 5000, spread: 0.7 }),
  owl: shot('owl', { gain: 0.285, sway: 0.06, spread: 0.7 }),
  cricket: shot('cricket', { gain: 0.1, sway: 0.1, spread: 0.9 }),
  cicada: shot('cicada', { gain: 0.25, sway: 0.08, spread: 0.6 }),
  leaves: shot('leaves', { gain: 0.271, spread: 0.7 }),
  gust: shot('gust', { gain: 0.171, sway: 0.16, spread: 0.4 }),
  drop: shot('drop', { gain: 0.435, sway: 0.2, spread: 0.9 }),
  thunder: shot('thunder', { gain: 0.338, lp: 2500, sway: 0.12, spread: 0.3 }),
  drip: shot('drip', { gain: 0.357, sway: 0.2, spread: 0.9 }),
  chain: shot('chain', { gain: 0.629 * far, lp: 4000, spread: 0.6 }),
  farfall: shot('farfall', { gain: 0.322, lp: 2500, spread: 0.7 }),
  hammer: shots('hammer', 2, 5, 0.55, { gain: 0.42 * far, lp: 4500, sway: 0.03, spread: 0.2 }),
  cart: shot('cart', { gain: 0.239, sway: 0.06, spread: 0.6 }),
  hooves: shot('hooves', { gain: 0.345, sway: 0.06, spread: 0.6 }),
  flag: shot('flag', { gain: 0.345, sway: 0.12, spread: 0.5 }),
  farbell: (k, t, r) => { const rate = [0.84, 0.94, 1][Math.floor(r() * 3)]; const n = 1 + Math.floor(r() * 3); const pan = (r() * 2 - 1) * 0.5; for (let i = 0; i < n; i++) k.rec('bell', t + i * 1.7, { v: 1, gain: 0.096, rate, lp: 1800, pan, steady: true }); },
  farhorn: shot('farhorn', { gain: 0.397, lp: 2200, sway: 0.03, spread: 0.5 }),
  frog: shot('frog', { gain: 0.343, sway: 0.1, spread: 0.8 }),
  geese: shot('geese', { gain: 0.204, sway: 0.06, spread: 0.5 }),
  lark: shot('lark', { gain: 0.199, sway: 0.06, spread: 0.5 }),
  howl: shot('howl', { gain: 0.245, lp: 3500, sway: 0.08, spread: 0.6 }),
  crack: shot('crack', { gain: 0.7, sway: 0.08, spread: 0.3 }),
  moan: shot('moan', { gain: 0.517, lp: 1200, sway: 0.14, spread: 0.4 }),
  steps: shot('steps', { gain: 0.341, sway: 0.06, spread: 0.5 }),
  door: shot('door', { gain: 0.239, lp: 900, sway: 0.1, spread: 0.6 }),
  pop: shot('pop', { gain: 0.353, sway: 0.15, spread: 0.3 }),
  creak: shot('creak', { gain: 0.323, sway: 0.12, spread: 0.6 }),
};

export const AMB_BEDS = ['wind', 'rain', 'roof', 'brook', 'fire', 'crowd', 'rumble'];
export const AMB_SHOTS = Object.keys(SHOTS);

// 다른 고장(pick.js의 groundOf)은 가장 가까운 곳의 소리를 빌린다
const GROUND_AMB = { isles: 'road', elfwood: 'field', dwarfhall: 'castle', magetower: 'castle', garrison: 'castle', labyrinth: 'town', empire: 'capital', holy: 'capital', north: 'bleak', demonland: 'bleak', lakecity: 'town' };
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
  const place = where === 'cradle' ? 'hearth' : where === 'hardship' ? 'bleak' : PLACE_NAME[where] ? where : GROUND_AMB[where] ?? 'field';
  return `${place}|${season}|${wxOf(weather)}|${todOf(weather)}`;
}
