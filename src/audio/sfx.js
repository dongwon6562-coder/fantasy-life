// 효과음. 29단계부터 전부 실제 녹음이다 (Freesound의 CC0 녹음, 출처는 docs/CREDITS.md).
// 녹음은 묶음 파일(sprite) 몇 개에 담겨 있고, SPRITE[이름] = [[파일, 시작(초), 길이(초)], ...] 이 그 안의 자리다. 같은 이름에 녹음이 여럿이면 날 때마다 고른다.
// 가락이 있는 짧은 소리(류트·하프 몇 음)는 음악 쪽 악기(group.note)를 빌린다.
// SFX[이름] = { name(한국어), kind(묶음), play(k, t), duck?(음악을 잠깐 줄일 만큼 중요한 소리), steady?(높이를 흔들지 않음) }
// 원칙:
//  - 자주 나는 화면 소리는 짧고 작게. 녹음은 미리 다듬어 두었다(앞 침묵을 자르고, 꼬리를 줄이고, 묶음마다 크기를 맞춤).
//  - 같은 소리도 날 때마다 녹음·높이·크기가 조금씩 다르다 (k.p, k.g). 되풀이가 귀에 거슬리지 않게.
//  - 소리 파일은 window.__flAssets가 있을 때만(아이폰 판) 늦게 불러온다. 없으면(play.html, node 점검) 조용히 아무 소리도 내지 않는다.

/* ---------- 녹음 묶음의 자리 (tools 없이 손으로 고치지 말 것: 다듬는 과정은 docs/CREDITS.md) ---------- */
export const SPRITE = {
  bell: [["sfx/life", 0.0, 5.008], ["sfx/life", 5.308, 5.008]],
  bells: [["sfx/life", 10.616, 5.0]],
  bird: [["amb/shots", 0.0, 2.508], ["amb/shots", 2.808, 0.198], ["amb/shots", 3.306, 2.26]],
  bird2: [["amb/shots", 5.866, 0.228], ["amb/shots", 6.3939, 1.218]],
  body: [["sfx/act", 0.0, 0.168], ["sfx/act", 0.468, 0.348], ["sfx/act", 1.116, 0.358]],
  bolt: [["sfx/fight", 0.0, 2.508]],
  book: [["sfx/act", 1.7739, 0.248], ["sfx/act", 2.3219, 0.908], ["sfx/act", 3.5299, 0.078]],
  cart: [["amb/shots", 7.9119, 4.0]],
  chain: [["amb/shots", 12.2119, 2.0], ["amb/shots", 14.5119, 2.0]],
  cheer: [["sfx/fight", 2.808, 2.5]],
  chime: [["sfx/fight", 5.608, 2.848], ["sfx/fight", 8.756, 3.008]],
  choose: [["sfx/ui", 0.0, 0.508], ["sfx/ui", 0.808, 0.508]],
  cicada: [["amb/shots", 16.8119, 5.0]],
  close: [["sfx/ui", 1.616, 0.138], ["sfx/ui", 2.0539, 0.508]],
  coin: [["sfx/act", 3.9079, 0.808], ["sfx/act", 5.0159, 0.298], ["sfx/act", 5.6139, 0.24]],
  cook: [["sfx/act", 6.1539, 1.2], ["sfx/act", 7.6539, 1.2]],
  crack: [["amb/shots", 22.1119, 6.008]],
  creak: [["amb/shots", 28.4199, 1.608], ["amb/shots", 30.3279, 0.768]],
  cricket: [["amb/shots", 31.3959, 4.0], ["amb/shots", 35.6959, 4.0]],
  crow: [["amb/shots", 39.9959, 0.318], ["amb/shots", 40.6139, 2.508]],
  deny: [["sfx/ui", 2.8619, 0.208], ["sfx/ui", 3.3699, 0.168]],
  door: [["sfx/act", 9.1539, 0.268], ["sfx/act", 9.7218, 0.678]],
  drink: [["sfx/act", 10.6998, 0.278], ["sfx/act", 11.2778, 0.908]],
  drip: [["amb/shots", 43.4218, 1.508], ["amb/shots", 45.2298, 1.508]],
  drop: [["amb/shots", 47.0378, 0.17], ["amb/shots", 47.5078, 0.558]],
  dungeon: [["sfx/act", 12.4858, 2.008]],
  farfall: [["amb/shots", 48.3658, 2.5]],
  farhorn: [["amb/shots", 51.1658, 2.398]],
  farm: [["sfx/act", 14.7938, 0.378], ["sfx/act", 15.4717, 0.26], ["sfx/act", 16.0317, 0.368]],
  fire: [["sfx/fight", 12.0639, 0.118], ["sfx/fight", 12.4819, 0.718]],
  flag: [["amb/shots", 53.8638, 3.0]],
  flee: [["sfx/fight", 13.4999, 1.2]],
  frog: [["amb/shots", 57.1638, 0.588], ["amb/shots", 58.0517, 3.008]],
  frost: [["sfx/fight", 14.9999, 0.088], ["sfx/fight", 15.3879, 0.358]],
  gale: [["sfx/fight", 16.0459, 1.5]],
  geese: [["amb/shots", 61.3597, 5.0]],
  growl: [["sfx/fight", 17.8459, 1.408], ["sfx/fight", 19.5539, 1.408]],
  guard: [["sfx/fight", 21.2618, 0.208], ["sfx/fight", 21.7698, 0.7]],
  gust: [["amb/shots", 66.6597, 4.788], ["amb/shots", 71.7477, 5.008]],
  hammer: [["amb/shots", 77.0557, 0.378]],
  herb: [["sfx/act", 16.6997, 1.0], ["sfx/act", 17.9997, 1.0]],
  hit: [["sfx/fight", 22.7698, 0.408]],
  home: [["sfx/act", 19.2997, 1.0], ["sfx/act", 20.5997, 1.0]],
  hooves: [["amb/shots", 77.7337, 3.5]],
  howl: [["amb/shots", 81.5337, 5.008]],
  hunt: [["sfx/act", 21.8997, 0.398], ["sfx/act", 22.5977, 0.088]],
  jail: [["sfx/act", 22.9857, 1.608]],
  labor: [["sfx/act", 24.8937, 0.388], ["sfx/act", 25.5817, 0.258], ["sfx/act", 26.1396, 0.708]],
  lark: [["amb/shots", 86.8417, 5.0]],
  leaves: [["amb/shots", 92.1417, 4.0], ["amb/shots", 96.4417, 4.0]],
  letter: [["sfx/ui", 3.8379, 0.948], ["sfx/ui", 5.0859, 0.938]],
  lock: [["sfx/act", 27.1476, 0.468]],
  magic: [["sfx/act", 27.9156, 2.008], ["sfx/act", 30.2236, 2.008]],
  march: [["sfx/fight", 23.4778, 2.4]],
  meditate: [["sfx/act", 32.5316, 4.008]],
  moan: [["amb/shots", 100.7417, 6.0]],
  owl: [["amb/shots", 107.0417, 3.008], ["amb/shots", 110.3496, 2.158]],
  parry: [["sfx/fight", 26.1778, 0.678]],
  play: [["sfx/act", 36.8395, 0.548], ["sfx/act", 37.6875, 0.148]],
  pop: [["amb/shots", 112.8076, 1.508], ["amb/shots", 114.6156, 1.508]],
  pray: [["sfx/act", 38.1355, 0.7], ["sfx/act", 39.1355, 0.998]],
  quake: [["sfx/fight", 27.1558, 2.0]],
  rest: [["sfx/act", 40.4335, 0.928]],
  save: [["sfx/ui", 6.3239, 0.16]],
  scroll: [["sfx/act", 41.6615, 0.808], ["sfx/act", 42.7695, 0.808]],
  shield: [["sfx/act", 43.8774, 0.76], ["sfx/act", 44.9374, 0.168]],
  ship: [["sfx/act", 45.4054, 2.0]],
  slash: [["sfx/fight", 29.4558, 0.178], ["sfx/fight", 29.9338, 0.428], ["sfx/fight", 30.6617, 0.258]],
  smith: [["sfx/act", 47.7054, 0.298], ["sfx/act", 48.3034, 0.338]],
  stab: [["sfx/fight", 31.2197, 0.358], ["sfx/fight", 31.8777, 0.358]],
  stamp: [["sfx/ui", 6.7839, 0.198], ["sfx/ui", 7.2818, 0.098]],
  steal: [["sfx/act", 48.9414, 0.8], ["sfx/act", 50.0414, 0.8]],
  steps: [["amb/shots", 116.4236, 0.578]],
  sword: [["sfx/act", 51.1414, 0.678], ["sfx/act", 52.1194, 0.308]],
  tab: [["sfx/ui", 7.6798, 0.508], ["sfx/ui", 8.4878, 0.508], ["sfx/ui", 9.2958, 0.5]],
  tap: [["sfx/ui", 10.0958, 0.098], ["sfx/ui", 10.4938, 0.158]],
  thunder: [["amb/shots", 117.3016, 7.0], ["amb/shots", 124.6016, 7.0]],
  travel: [["sfx/act", 52.7273, 1.6]],
  visit: [["sfx/act", 54.6273, 0.588]],
  wander: [["sfx/act", 55.5153, 1.4], ["sfx/act", 57.2153, 1.4]],
  ward: [["sfx/fight", 32.5357, 0.75]],
  warhorn: [["sfx/fight", 33.5857, 4.008]],
};
export const SOUND_FILES = [...new Set(Object.values(SPRITE).flat().map((x) => x[0]))];

/* ---------- 불러오기: 문맥(AudioContext)마다 파일 하나에 한 번 ---------- */
const store = new WeakMap(); // ctx → Map(파일 → AudioBuffer | 'loading' | false)
export const assetBase = () => (typeof window !== 'undefined' && typeof window.__flAssets === 'string' ? window.__flAssets : null);
/** 파일의 소리를 돌려준다. 아직이면 불러오기를 걸어 두고 null. 파일이 없거나 실패하면 계속 null */
export function loadSound(ctx, file) {
  const base = assetBase();
  if (!base || !ctx || typeof ctx.decodeAudioData !== 'function' || typeof fetch !== 'function') return null;
  let m = store.get(ctx);
  if (!m) { m = new Map(); store.set(ctx, m); }
  const have = m.get(file);
  if (have !== undefined) return have && have !== 'loading' ? have : null;
  m.set(file, 'loading');
  fetch(`${base}audio/${file}.m4a`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then((a) => new Promise((res, rej) => { const p = ctx.decodeAudioData(a, res, rej); if (p?.then) p.then(res, rej); }))
    .then((b) => m.set(file, b))
    .catch(() => m.set(file, false));
  return null;
}
export const soundReady = (ctx, file) => { const v = store.get(ctx)?.get(file); return !!v && v !== 'loading'; };
/** 효과음 묶음을 미리 불러 둔다 (처음 소리를 낼 때 저절로 부른다) */
export function preloadSfx(ctx) { for (const f of SOUND_FILES) if (f.startsWith('sfx/')) loadSound(ctx, f); }

/** 소리 도구 상자. bus: 소리를 보낼 통로('fx' 효과음, 'amb' 환경음) */
export function kit(group, bus = 'fx') {
  const c = group.ctx;
  const out = group.bus?.(bus)?.in ?? group.dry ?? c.destination;
  const k = {
    group, p: 1, g: 1, rl: 1,
    /** 녹음 하나. name: SPRITE 이름. gain 크기, rate 빠르기(높이), v 몇 번째 녹음, lp/hp 거르개(Hz), pan 좌우, dur 앞부분만 */
    rec(name, t, { gain = 1, rate = 1, v, lp, hp, pan = 0, dur, steady = false } = {}) {
      const list = SPRITE[name];
      if (!list?.length) return null;
      const [file, off, len] = list[v != null ? v % list.length : Math.floor(Math.random() * list.length)];
      const buf = loadSound(c, file);
      if (!buf) return null;
      const src = c.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = rate * (steady ? 1 : k.p);
      let node = src;
      const filt = (type, f) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = 0.7; node.connect(b); node = b; };
      if (lp) filt('lowpass', lp);
      if (hp) filt('highpass', hp);
      if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; node.connect(p); node = p; }
      const gn = c.createGain(); gn.gain.value = gain * k.g * k.rl;
      node.connect(gn); gn.connect(out);
      src.start(Math.max(t, c.currentTime), off, Math.min(len, dur ?? len));
      return src;
    },
    note: (inst, t, midi, dur, vel, o) => group.note?.(inst, t, midi, dur, vel * k.g, o),
    perc: (type, t, vel) => group.perc?.(type, t, vel * k.g),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  };
  return k;
}

const S = (name, kind, play, o = {}) => ({ name, kind, play, ...o });
const far = { lp: 2400, gain: 0.35 }; // 멀리서 울리는 종

export const SFX = {
  /* ----- 화면: 짧고 작게 ----- */
  tap: S('버튼 누르기', '화면', (k, t) => k.rec('tap', t, { gain: 0.7, lp: 5000 })),
  tab: S('화면 넘기기', '화면', (k, t) => k.rec('tab', t, { gain: 0.8 })),
  select: S('행동 고르기', '화면', (k, t) => { k.rec('tap', t, { gain: 0.5, lp: 4000 }); k.note('lute', t + 0.005, k.pick([57, 60, 62, 64]), 0.4, 0.38, { damp: true }); }, { steady: true }),
  target: S('사람 고르기', '화면', (k, t) => k.note('harp', t, k.pick([69, 72, 74]), 0.5, 0.34), { steady: true }),
  confirm: S('결정', '화면', (k, t) => { k.rec('tap', t, { gain: 0.4, lp: 4000, steady: true }); k.note('lute', t, 62, 0.6, 0.48); k.note('lute', t + 0.075, 69, 0.8, 0.52); }, { steady: true }),
  close: S('닫기', '화면', (k, t) => k.rec('close', t, { gain: 0.8 })),
  month: S('한 달을 보내다', '화면', (k, t) => { k.rec('tab', t, { gain: 0.8 }); k.rec('tab', t + 0.16, { gain: 0.5 }); k.rec('bell', t + 0.2, { ...far, gain: 0.18, steady: true }); k.note('harp', t + 0.2, k.pick([50, 50, 45, 52]), 1.5, 0.38); }, { steady: true }),
  event: S('사건이 생기다', '화면', (k, t) => { k.rec('choose', t, { gain: 0.6 }); k.note('strings', t + 0.05, 38, 0.9, 0.5, { attack: 0.03, release: 0.9 }); k.note('strings', t + 0.05, 45, 0.9, 0.4, { attack: 0.03, release: 0.9 }); k.perc('frame', t + 0.05, 0.5); }, { steady: true, duck: 0.6 }),
  choose: S('선택지 고르기', '화면', (k, t) => k.rec('choose', t, { gain: 0.8 })),
  save: S('저장', '화면', (k, t) => { k.rec('save', t, { gain: 0.7 }); k.rec('chime', t + 0.08, { gain: 0.12, dur: 1.2, steady: true }); }),
  deny: S('안 됨', '화면', (k, t) => k.rec('deny', t, { gain: 0.8, lp: 3500 })),
  begin: S('태어나다', '화면', (k, t) => { k.rec('bell', t, { ...far, gain: 0.3, v: 1, steady: true }); k.note('harp', t + 0.05, 50, 2, 0.5); k.note('harp', t + 0.3, 57, 2, 0.5); k.note('harp', t + 0.55, 62, 2.5, 0.55); }, { steady: true, duck: 0.5 }),
  letter: S('편지 · 문서', '화면', (k, t) => k.rec('letter', t, { gain: 0.8 })),
  stamp: S('도장 · 의뢰 수락', '화면', (k, t) => { k.rec('stamp', t, { gain: 0.9 }); k.note('lute', t + 0.12, 50, 0.6, 0.4); }),

  /* ----- 행동 ----- */
  sword: S('검술 수련', '행동', (k, t) => { k.rec('slash', t, { gain: 0.6 }); k.rec('sword', t + 0.14, { gain: 0.8 }); if (Math.random() < 0.5) { k.rec('slash', t + 0.45, { gain: 0.45 }); k.rec('sword', t + 0.58, { gain: 0.55 }); } }),
  shield: S('방패 · 경비', '행동', (k, t) => k.rec('shield', t, { gain: 0.9 })),
  book: S('공부', '행동', (k, t) => { k.rec('book', t); if (Math.random() < 0.6) k.rec('book', t + 0.3 + Math.random() * 0.1, { gain: 0.6 }); }),
  body: S('몸 단련', '행동', (k, t) => { const n = 2 + Math.floor(Math.random() * 2); for (let i = 0; i < n; i++) k.rec('body', t + i * (0.26 + Math.random() * 0.06), { gain: 0.8 - i * 0.1 }); }),
  magic: S('마법 수련', '행동', (k, t) => k.rec('magic', t, { gain: 0.8 })),
  meditate: S('명상', '행동', (k, t) => k.rec('meditate', t, { gain: 0.8, steady: true })),
  herb: S('약초 캐기', '행동', (k, t) => k.rec('herb', t)),
  cook: S('요리', '행동', (k, t) => k.rec('cook', t)),
  coin: S('돈 · 장사', '행동', (k, t) => { k.rec('coin', t); if (Math.random() < 0.4) k.rec('coin', t + 0.12, { gain: 0.5 }); }),
  labor: S('품일', '행동', (k, t) => { k.rec('labor', t); k.rec('labor', t + 0.42 + Math.random() * 0.08, { gain: 0.8 }); }),
  farm: S('밭일', '행동', (k, t) => { k.rec('farm', t); k.rec('farm', t + 0.45 + Math.random() * 0.1, { gain: 0.8 }); }),
  pray: S('기도', '행동', (k, t) => { k.rec('pray', t, { gain: 0.6, steady: true }); k.note('organ', t + 0.1, 52, 1.2, 0.1); }, { steady: true }),
  hunt: S('사냥', '행동', (k, t) => { k.rec('hunt', t, { v: 1 }); k.rec('hunt', t + 0.3, { v: 0, gain: 0.7 }); }),
  travel: S('길 떠나기', '행동', (k, t) => k.rec('travel', t)),
  wander: S('돌아다니기', '행동', (k, t) => k.rec('wander', t)),
  smith: S('대장간 · 장비', '행동', (k, t) => { k.rec('smith', t, { gain: 0.7 }); k.rec('smith', t + 0.32, { gain: 0.55 }); }),
  dungeon: S('미궁에 들어서다', '행동', (k, t) => k.rec('dungeon', t)),
  heart: S('마음을 전하다', '행동', (k, t) => { k.note('harp', t, 64, 1.2, 0.42); k.note('harp', t + 0.14, 67, 1.4, 0.42); }, { steady: true }),
  visit: S('찾아가기', '행동', (k, t) => k.rec('visit', t, { gain: 0.8 })),
  door: S('문', '행동', (k, t) => k.rec('door', t)),
  rest: S('쉬기', '행동', (k, t) => { k.rec('rest', t, { gain: 0.6 }); k.note('harp', t + 0.1, 45, 1.5, 0.3); }),
  play: S('놀기', '행동', (k, t) => k.rec('play', t, { gain: 0.8 })),
  home: S('집안일', '행동', (k, t) => k.rec('home', t)),
  crown: S('귀족 · 궁정', '행동', (k, t) => { k.note('horn', t, 55, 0.25, 0.5); k.note('horn', t + 0.26, 62, 0.6, 0.55); }, { steady: true }),
  ship: S('배 · 물가', '행동', (k, t) => k.rec('ship', t)),
  scroll: S('글 · 기록', '행동', (k, t) => k.rec('scroll', t)),
  drink: S('술집 · 마시다', '행동', (k, t) => { k.rec('drink', t, { v: 1, gain: 0.8 }); k.rec('drink', t + 0.8, { v: 0, gain: 0.7 }); }),
  steal: S('훔치다', '행동', (k, t) => { k.rec('steal', t, { gain: 0.7 }); k.rec('coin', t + 0.3, { gain: 0.25, lp: 3000 }); }),
  lock: S('자물쇠를 따다', '행동', (k, t) => k.rec('lock', t)),
  jail: S('쇠창살', '행동', (k, t) => k.rec('jail', t), { duck: 0.6 }),

  /* ----- 전투 ----- */
  slash: S('베기', '전투', (k, t) => k.rec('slash', t)),
  stab: S('찌르기', '전투', (k, t) => k.rec('stab', t)),
  feint: S('속임 동작', '전투', (k, t) => { k.rec('slash', t, { gain: 0.45 }); k.rec('slash', t + 0.26, { gain: 0.9 }); }),
  parry: S('칼이 부딪치다', '전투', (k, t) => k.rec('parry', t)),
  guard: S('막아 내다', '전투', (k, t) => k.rec('guard', t)),
  hit: S('맞다', '전투', (k, t) => k.rec('hit', t)),
  fire: S('화염 주문', '전투', (k, t) => k.rec('fire', t)),
  frost: S('얼음 주문', '전투', (k, t) => { k.rec('frost', t); k.rec('chime', t + 0.05, { gain: 0.25, rate: 1.25, dur: 1.5 }); }),
  bolt: S('번개 주문', '전투', (k, t) => k.rec('bolt', t), { duck: 0.5 }),
  gale: S('바람 주문', '전투', (k, t) => k.rec('gale', t)),
  quake: S('땅 주문', '전투', (k, t) => k.rec('quake', t)),
  heal: S('치유 주문', '전투', (k, t) => { [64, 71, 76, 83].forEach((m, i) => k.note('harp', t + i * 0.1, m, 1.6, 0.36)); k.rec('chime', t, { gain: 0.5, steady: true }); }, { steady: true }),
  ward: S('결계', '전투', (k, t) => { k.rec('ward', t); k.rec('chime', t + 0.3, { gain: 0.25, dur: 1.6 }); }),
  aura: S('검기', '전투', (k, t) => { k.rec('gale', t, { gain: 0.5, rate: 1.5, dur: 0.6 }); k.rec('slash', t + 0.45); k.rec('parry', t + 0.6, { gain: 0.6 }); }),
  growl: S('마물', '전투', (k, t) => k.rec('growl', t)),
  wound: S('다치다', '전투', (k, t) => { SFX.hit.play(k, t); k.note('strings', t + 0.03, 39, 0.5, 0.5, { attack: 0.02, release: 0.5 }); k.note('strings', t + 0.03, 40, 0.5, 0.45, { attack: 0.02, release: 0.5 }); }),
  // 맞붙는 소리는 날 때마다 순서가 달라진다
  clash: S('맞붙다 (연속)', '전투', (k, t) => { let x = t; const n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { SFX[k.pick(i === n - 1 ? ['hit', 'guard'] : ['slash', 'parry', 'slash', 'stab', 'guard'])].play(k, x); x += 0.17 + Math.random() * 0.16; } }),
  victory: S('이기다', '전투', (k, t) => { k.perc('war', t, 0.7); k.note('horn', t, 50, 0.22, 0.41); k.note('horn', t + 0.24, 57, 0.22, 0.45); k.note('horn', t + 0.48, 62, 1.1, 0.49); k.note('horn', t + 0.48, 57, 1.1, 0.3); k.note('strings', t + 0.48, 50, 1.2, 0.3, { attack: 0.05 }); k.note('strings', t + 0.48, 57, 1.2, 0.3, { attack: 0.05 }); }, { steady: true, duck: 0.4 }),
  defeat: S('지다', '전투', (k, t) => { k.perc('war', t, 0.8); k.note('viol', t, 53, 0.6, 0.28); k.note('viol', t + 0.6, 52, 0.6, 0.26, { from: 53 }); k.note('viol', t + 1.2, 50, 1.6, 0.28, { from: 52 }); k.note('drone', t, 38, 2.4, 0.28, { attack: 0.3, release: 1.2 }); }, { steady: true, duck: 0.4 }),
  flee: S('달아나다', '전투', (k, t) => k.rec('flee', t)),
  warhorn: S('전쟁 나팔', '전투', (k, t) => { k.rec('warhorn', t, { steady: true }); k.perc('war', t + 1.2, 0.6); }, { steady: true, duck: 0.5 }),
  march: S('행군', '전투', (k, t) => k.rec('march', t)),
  cheer: S('함성', '전투', (k, t) => k.rec('cheer', t)),

  /* ----- 삶의 고비 ----- */
  rise: S('승급 · 서클', '고비', (k, t) => { [50, 57, 62, 69, 74].forEach((m, i) => k.note('harp', t + i * 0.09, m, 2, 0.5)); k.rec('bell', t + 0.45, { ...far, gain: 0.25, v: 1 }); k.note('strings', t + 0.3, 50, 1.4, 0.3); k.note('strings', t + 0.3, 57, 1.4, 0.3); }, { steady: true, duck: 0.45 }),
  skill: S('기술이 늘다', '고비', (k, t) => { k.note('harp', t, 62, 1, 0.4); k.note('harp', t + 0.1, 69, 1.2, 0.42); }, { steady: true }),
  fail: S('실패', '고비', (k, t) => { k.note('viol', t, 55, 0.35, 0.4); k.note('viol', t + 0.35, 53, 0.8, 0.4, { from: 55 }); }, { steady: true }),
  birth: S('아이가 태어나다', '고비', (k, t) => { k.note('harp', t, 62, 2, 0.45); k.note('harp', t + 0.22, 69, 2, 0.45); k.rec('bell', t + 0.44, { ...far, gain: 0.22, v: 1 }); }, { steady: true, duck: 0.5 }),
  death: S('죽음', '고비', (k, t) => { k.rec('bell', t, { v: 0, gain: 0.8 }); k.note('choirOo', t + 0.1, 50, 2.2, 0.28); k.note('choirOo', t + 0.1, 57, 2.2, 0.24); }, { steady: true, duck: 0.3 }),
  wedding: S('혼례', '고비', (k, t) => k.rec('bells', t, { gain: 0.8 }), { steady: true, duck: 0.5 }),
  newyear: S('새해', '고비', (k, t) => { k.rec('bell', t, { ...far, gain: 0.4, v: 1 }); k.rec('bell', t + 1.4, { ...far, gain: 0.28, v: 1 }); }, { steady: true }),
};

// 녹음 부분의 크기 (브라우저에서 실제로 틀어 1초 창 RMS를 재서 맞춘 값: 화면 −31dB, 행동 −25dB, 전투·고비 −21dB 언저리, 꼭지 −3~−8dB 아래).
// 가락(group.note)은 건드리지 않는다. 표에 없으면 1.
const LEVEL = { tap: 0.8, tab: 0.56, close: 0.47, month: 0.31, choose: 0.53, save: 0.85, deny: 0.47, letter: 0.48, stamp: 0.59, sword: 0.67, shield: 0.65, book: 0.64, body: 0.68, magic: 0.59, meditate: 0.23, herb: 0.42, coin: 0.68, labor: 0.61, farm: 0.62, pray: 0.77, hunt: 0.61, travel: 0.62, wander: 0.38, smith: 0.86, dungeon: 0.29, visit: 0.62, door: 0.65, rest: 0.72, play: 0.74, home: 0.65, ship: 0.28, scroll: 0.48, drink: 0.62, steal: 0.6, lock: 0.65, jail: 0.29, slash: 0.8, stab: 0.75, feint: 0.89, parry: 0.8, guard: 0.79, hit: 0.76, fire: 0.49, frost: 0.78, bolt: 0.43, gale: 0.39, quake: 0.31, ward: 0.88, aura: 0.66, growl: 0.39, wound: 0.72, clash: 0.45, flee: 0.76, warhorn: 0.34, march: 0.43, cheer: 0.34, rise: 0.84, death: 0.5, wedding: 0.47, newyear: 0.69 };

/** 효과음 내기. group은 효과음용 Group (engine.group('sfx')). 음악을 줄일 만한 소리면 줄인다. */
const kits = new WeakMap();
export function playSfx(group, id, when = 0) {
  const s = SFX[id];
  if (!s) return false;
  let k = kits.get(group);
  if (!k) { k = kit(group); kits.set(group, k); preloadSfx(group.ctx); }
  // 날 때마다 조금씩 다르게 (가락이 있는 소리는 높이를 그대로 둔다)
  k.p = s.steady ? 1 : 2 ** ((Math.random() - 0.5) * 0.18);
  k.g = 0.88 + Math.random() * 0.2;
  k.rl = LEVEL[id] ?? 1;
  s.play(k, group.ctx.currentTime + 0.01 + when);
  if (s.duck) group.e?.duck?.(s.duck, 1.1, when);
  return true;
}
