// 효과음. 전부 잡음과 사인파를 깎아서 만든다 (녹음 파일 없음).
// SFX[이름] = { name(한국어), kind(묶음), play(k, t), duck?(음악을 잠깐 줄일 만큼 중요한 소리) }
// 원칙 (다른 게임들의 소리 설계를 참고):
//  - 자주 나는 화면 소리는 짧고(0.1초 안팎) 낮고 부드럽게. 날카로운 높은 소리는 아낀다.
//  - 같은 소리도 날 때마다 높이와 크기가 조금씩 다르다 (k.p, k.g). 되풀이가 귀에 거슬리지 않게.
//  - 큰 소리는 '치는 순간 + 몸통 + 여운' 세 겹으로 만든다.

/** 소리 도구 상자. bus: 소리를 보낼 통로('fx' 효과음, 'amb' 환경음) */
export function kit(group, bus = 'fx') {
  const c = group.ctx, e = group.e;
  const out = group.bus(bus).in;
  const k = {
    group, p: 1, g: 1,
    // 걸러 낸 잡음 한 줄기. f→f2로 음색이 움직인다.
    noise(t, dur, { type = 'bandpass', f = 1000, f2, q = 1, gain = 0.3, attack = 0.004, hold = 0 } = {}) {
      const n = c.createBufferSource(); n.buffer = e.noise; n.loop = true;
      const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
      fl.frequency.setValueAtTime(f * k.p, t);
      if (f2) fl.frequency.exponentialRampToValueAtTime(f2 * k.p, t + dur);
      const g = c.createGain(); const peak = gain * k.g;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack);
      if (hold) g.gain.setValueAtTime(peak, t + attack + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(fl); fl.connect(g); g.connect(out);
      n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
      return g;
    },
    // 음높이가 f→f2로 떨어지는(또는 오르는) 소리
    tone(t, dur, { type = 'sine', f = 200, f2, gain = 0.3, attack = 0.004, drop } = {}) {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f * k.p, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2 * k.p, t + (drop ?? dur));
      const g = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * k.g, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
      return o;
    },
    // 쇠붙이: 배음이 어긋난 사인파 묶음. 배음마다 살짝 어긋난 짝을 붙여 울림이 일렁인다.
    metal(t, f, { gain = 0.2, decay = 0.6, ratios = [1, 1.52, 2.31, 3.43, 4.71, 6.2] } = {}) {
      ratios.forEach((r, i) => {
        const fr = f * r * (1 + (Math.random() - 0.5) * 0.004);
        if (fr * k.p > 14000) return;
        const d = decay / (1 + i * 0.35), a = gain / (1 + i * 0.6);
        k.tone(t, d, { f: fr, gain: a, attack: 0.001 });
        if (i < 3) k.tone(t, d * 0.9, { f: fr * 1.007, gain: a * 0.5, attack: 0.001 });
      });
    },
    // 자잘하게 튀는 소리 (불, 양피지, 풀)
    crackle(t, dur, { f = 3000, gain = 0.2, rate = 40, type = 'highpass' } = {}) {
      for (let x = 0; x < dur; x += (0.3 + Math.random() * 1.4) / rate) {
        k.noise(t + x, 0.012 + Math.random() * 0.03, { type, f: f * (0.6 + Math.random() * 0.9), q: 1.5, gain: gain * (0.3 + Math.random() * 0.7), attack: 0.001 });
      }
    },
    knock(t, f = 200, gain = 0.4) { k.tone(t, 0.09, { f, f2: f * 0.7, gain, drop: 0.05 }); k.noise(t, 0.04, { f: f * 3.5, q: 1.2, gain: gain * 0.5 }); },
    thud(t, gain = 0.5, f = 110) { k.tone(t, 0.22, { f, f2: f * 0.45, gain, drop: 0.12 }); k.noise(t, 0.08, { type: 'lowpass', f: 900, q: 0.5, gain: gain * 0.5 }); },
    whoosh(t, dur = 0.2, gain = 0.25, f = 700, f2 = 3600) { k.noise(t, dur, { f, f2, q: 1.4, gain, attack: dur * 0.45 }); },
    step(t, gain = 0.16) { k.noise(t, 0.07, { f: 900 + Math.random() * 600, q: 0.8, gain, attack: 0.006 }); k.tone(t, 0.06, { f: 90, f2: 60, gain: gain * 0.6 }); },
    page(t, gain = 0.16) { k.noise(t, 0.11 + Math.random() * 0.04, { f: 2400 + Math.random() * 600, f2: 1000, q: 0.8, gain: gain * 1.6, attack: 0.03 }); },
    // 칼: 부딪는 순간의 잡음 + 일렁이는 쇳소리 + 여운
    clang(t, gain = 0.2, f = 1700) { k.noise(t, 0.03, { type: 'highpass', f: 3500, gain: gain * 1.1, attack: 0.001 }); k.noise(t, 0.012, { type: 'lowpass', f: 900, gain: gain * 1.4, attack: 0.001 }); k.metal(t, f * (0.92 + Math.random() * 0.16), { gain: gain * 0.6, decay: 0.6 + Math.random() * 0.25 }); },
    note: (inst, t, midi, dur, vel, o) => group.note(inst, t, midi, dur, vel * k.g, o),
    perc: (type, t, vel) => group.perc(type, t, vel * k.g),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  };
  return k;
}

const S = (name, kind, play, o = {}) => ({ name, kind, play, ...o });

export const SFX = {
  /* ----- 화면: 짧고 낮게 ----- */
  tap: S('버튼 누르기', '화면', (k, t) => { k.tone(t, 0.045, { f: 250, f2: 165, gain: 0.13 }); k.noise(t, 0.022, { type: 'lowpass', f: 1300, gain: 0.07 }); }),
  tab: S('화면 넘기기', '화면', (k, t) => k.noise(t, 0.1, { f: 1700, f2: 800, q: 0.7, gain: 0.16, attack: 0.03 })),
  select: S('행동 고르기', '화면', (k, t) => { k.knock(t, 250, 0.12); k.note('lute', t + 0.005, k.pick([57, 60, 62, 64]), 0.4, 0.38, { damp: true }); }, { steady: true }),
  target: S('사람 고르기', '화면', (k, t) => k.note('harp', t, k.pick([69, 72, 74]), 0.5, 0.34), { steady: true }),
  confirm: S('결정', '화면', (k, t) => { k.note('lute', t, 62, 0.6, 0.48); k.note('lute', t + 0.075, 69, 0.8, 0.52); }, { steady: true }),
  close: S('닫기', '화면', (k, t) => { k.knock(t, 165, 0.18); k.noise(t + 0.01, 0.08, { f: 1500, f2: 700, q: 0.7, gain: 0.07, attack: 0.02 }); }),
  month: S('한 달을 보내다', '화면', (k, t) => { k.page(t, 0.16); k.page(t + 0.16, 0.1); k.note('bell', t + 0.2, 55, 2, 0.14, { decay: 2.6 }); k.note('harp', t + 0.2, k.pick([50, 50, 45, 52]), 1.5, 0.38); }, { steady: true }),
  event: S('사건이 생기다', '화면', (k, t) => { k.crackle(t, 0.3, { f: 2400, gain: 0.09, rate: 60, type: 'bandpass' }); k.note('strings', t + 0.05, 38, 0.9, 0.5, { attack: 0.03, release: 0.9 }); k.note('strings', t + 0.05, 45, 0.9, 0.4, { attack: 0.03, release: 0.9 }); k.perc('frame', t + 0.05, 0.5); }, { steady: true, duck: 0.6 }),
  choose: S('선택지 고르기', '화면', (k, t) => { k.crackle(t, 0.15, { f: 3200, gain: 0.08, rate: 90, type: 'bandpass' }); k.noise(t, 0.17, { f: 3000, q: 0.8, gain: 0.05, attack: 0.02 }); k.knock(t + 0.16, 225, 0.15); }),
  save: S('저장', '화면', (k, t) => { k.thud(t, 0.25, 140); k.noise(t, 0.05, { type: 'lowpass', f: 600, gain: 0.12 }); k.note('glass', t + 0.06, 81, 0.6, 0.14); }),
  deny: S('안 됨', '화면', (k, t) => { k.knock(t, 130, 0.24); k.knock(t + 0.11, 112, 0.2); }),
  begin: S('태어나다', '화면', (k, t) => { k.note('bell', t, 50, 3, 0.3, { decay: 4.5 }); k.note('harp', t + 0.05, 50, 2, 0.5); k.note('harp', t + 0.3, 57, 2, 0.5); k.note('harp', t + 0.55, 62, 2.5, 0.55); }, { steady: true, duck: 0.5 }),
  letter: S('편지 · 문서', '화면', (k, t) => { k.page(t, 0.14); k.crackle(t + 0.08, 0.2, { f: 2600, gain: 0.07, rate: 70, type: 'bandpass' }); }),
  stamp: S('도장 · 의뢰 수락', '화면', (k, t) => { k.thud(t, 0.34, 150); k.noise(t, 0.04, { type: 'lowpass', f: 1400, gain: 0.2, attack: 0.001 }); k.note('lute', t + 0.12, 50, 0.6, 0.4); }),

  /* ----- 행동 ----- */
  sword: S('검술 수련', '행동', (k, t) => { k.whoosh(t, 0.16, 0.14); k.clang(t + 0.15, 0.17); if (Math.random() < 0.5) { k.whoosh(t + 0.42, 0.14, 0.1); k.clang(t + 0.55, 0.11, 2100); } }),
  shield: S('방패 · 경비', '행동', (k, t) => { k.thud(t, 0.3, 150); k.metal(t, 520, { gain: 0.04, decay: 0.25 }); }),
  book: S('공부', '행동', (k, t) => { k.page(t, 0.16); k.page(t + 0.2 + Math.random() * 0.08, 0.11); }),
  body: S('몸 단련', '행동', (k, t) => { k.step(t, 0.22); k.step(t + 0.17, 0.2); k.step(t + 0.34, 0.2); k.noise(t + 0.45, 0.3, { f: 1100, q: 0.5, gain: 0.07, attack: 0.1 }); }),
  magic: S('마법 수련', '행동', (k, t) => { k.noise(t, 0.7, { f: 900, f2: 5200, q: 3, gain: 0.07, attack: 0.4 }); const s = k.pick([[76, 81, 83, 88, 93], [74, 81, 86, 88, 93], [76, 79, 83, 88, 91]]); s.forEach((m, i) => k.note('glass', t + 0.08 + i * 0.075, m, 0.8, 0.2 + i * 0.03)); }, { steady: true }),
  meditate: S('명상', '행동', (k, t) => { k.tone(t, 2.6, { f: 220, gain: 0.16, attack: 0.02 }); k.tone(t, 2.6, { f: 221.3, gain: 0.12, attack: 0.02 }); k.tone(t, 1.8, { f: 603, gain: 0.07, attack: 0.01 }); k.tone(t, 1.1, { f: 1172, gain: 0.03, attack: 0.01 }); k.noise(t, 0.03, { type: 'lowpass', f: 700, gain: 0.1 }); }),
  herb: S('약초 캐기', '행동', (k, t) => { k.crackle(t, 0.32, { f: 4200, gain: 0.12, rate: 70 }); k.noise(t + 0.05, 0.22, { f: 3000, q: 0.6, gain: 0.05, attack: 0.08 }); k.thud(t + 0.3, 0.1, 120); }),
  cook: S('요리', '행동', (k, t) => { [0, 0.13, 0.26].forEach((d) => k.knock(t + d + Math.random() * 0.02, 420, 0.2)); k.noise(t + 0.3, 0.55, { type: 'highpass', f: 5200, gain: 0.05, attack: 0.05, hold: 0.2 }); k.crackle(t + 0.3, 0.5, { f: 6000, gain: 0.06, rate: 50 }); }),
  coin: S('돈 · 장사', '행동', (k, t) => { const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) k.metal(t + i * 0.055 + Math.random() * 0.02, 4200 + Math.random() * 1600, { gain: 0.06, decay: 0.3, ratios: [1, 1.41, 2.3] }); k.noise(t, 0.03, { type: 'lowpass', f: 800, gain: 0.08 }); }),
  labor: S('품일', '행동', (k, t) => { for (const d of [0, 0.34]) { k.noise(t + d, 0.07, { type: 'lowpass', f: 2000, gain: 0.13, attack: 0.001 }); k.tone(t + d, 0.14, { f: 190, f2: 85, gain: 0.14, drop: 0.07 }); k.crackle(t + d + 0.02, 0.06, { f: 2500, gain: 0.08, rate: 120 }); } }),
  farm: S('밭일', '행동', (k, t) => { for (const d of [0, 0.36]) { k.thud(t + d, 0.2, 95); k.crackle(t + d + 0.02, 0.12, { f: 2200, gain: 0.08, rate: 90, type: 'bandpass' }); } }),
  pray: S('기도', '행동', (k, t) => { k.note('bell', t, 76, 2, 0.18, { decay: 2.8 }); k.note('organ', t + 0.1, 52, 1.2, 0.14); k.note('organ', t + 0.1, 59, 1.2, 0.12); }, { steady: true }),
  hunt: S('사냥', '행동', (k, t) => { k.tone(t, 0.12, { type: 'triangle', f: 210, f2: 150, gain: 0.15, attack: 0.001 }); k.whoosh(t + 0.02, 0.2, 0.14, 1800, 5200); k.knock(t + 0.27, 180, 0.18); }),
  travel: S('길 떠나기', '행동', (k, t) => { [0, 0.24, 0.48, 0.72].forEach((d, i) => k.step(t + d, i % 2 ? 0.14 : 0.19)); }),
  wander: S('돌아다니기', '행동', (k, t) => { [0, 0.3, 0.6].forEach((d, i) => k.step(t + d, i % 2 ? 0.13 : 0.17)); k.noise(t, 0.9, { f: 600, f2: 900, q: 0.8, gain: 0.04, attack: 0.4 }); }),
  smith: S('대장간 · 장비', '행동', (k, t) => { for (const d of [0, 0.3]) { k.metal(t + d, 1130, { gain: 0.08, decay: 0.8, ratios: [1, 2.76, 5.4, 8.93] }); k.thud(t + d, 0.15, 160); } }),
  dungeon: S('미궁에 들어서다', '행동', (k, t) => { k.noise(t, 0.9, { type: 'lowpass', f: 180, q: 0.7, gain: 0.26, attack: 0.25 }); k.tone(t + 0.1, 0.6, { type: 'sawtooth', f: 78, f2: 62, gain: 0.05, attack: 0.1 }); k.thud(t + 0.75, 0.3, 70); }),
  heart: S('마음을 전하다', '행동', (k, t) => { k.note('harp', t, 64, 1.2, 0.42); k.note('harp', t + 0.14, 67, 1.4, 0.42); }, { steady: true }),
  visit: S('찾아가기', '행동', (k, t) => { const n = Math.random() < 0.5 ? 2 : 3; for (let i = 0; i < n; i++) k.knock(t + i * 0.15, 210, 0.18); }),
  door: S('문', '행동', (k, t) => { k.metal(t, 2400, { gain: 0.03, decay: 0.06 }); k.tone(t + 0.05, 0.3, { type: 'sawtooth', f: 150, f2: 190, gain: 0.012, attack: 0.1 }); k.noise(t + 0.05, 0.3, { f: 800, q: 5, gain: 0.05, attack: 0.1 }); k.thud(t + 0.42, 0.24, 120); }),
  rest: S('쉬기', '행동', (k, t) => { k.noise(t, 0.6, { type: 'lowpass', f: 650, q: 0.4, gain: 0.07, attack: 0.25 }); k.note('harp', t + 0.1, 45, 1.5, 0.3); }),
  play: S('놀기', '행동', (k, t) => { [0, 0.09, 0.2, 0.27].forEach((d) => k.knock(t + d, 440 + Math.random() * 280, 0.14)); }),
  home: S('집안일', '행동', (k, t) => { k.whoosh(t, 0.22, 0.09, 1500, 2600); k.whoosh(t + 0.28, 0.2, 0.08, 1700, 2500); }),
  crown: S('귀족 · 궁정', '행동', (k, t) => { k.note('horn', t, 55, 0.25, 0.5); k.note('horn', t + 0.26, 62, 0.6, 0.55); }, { steady: true }),
  ship: S('배 · 물가', '행동', (k, t) => { k.noise(t, 1.2, { type: 'lowpass', f: 500, f2: 1600, q: 0.5, gain: 0.14, attack: 0.6 }); }),
  scroll: S('글 · 기록', '행동', (k, t) => { k.crackle(t, 0.22, { f: 3200, gain: 0.09, rate: 90, type: 'bandpass' }); k.noise(t, 0.24, { f: 3000, q: 0.8, gain: 0.05, attack: 0.03 }); }),
  drink: S('술집 · 마시다', '행동', (k, t) => { k.knock(t, 330, 0.16); [0.18, 0.34, 0.5].forEach((d, i) => k.tone(t + d, 0.09, { f: 300 + i * 30, f2: 420 + i * 40, gain: 0.07, attack: 0.02 })); k.knock(t + 0.72, 280, 0.2); }),
  steal: S('훔치다', '행동', (k, t) => { k.noise(t, 0.22, { f: 1400, f2: 2200, q: 0.8, gain: 0.07, attack: 0.1 }); k.metal(t + 0.2, 3600, { gain: 0.018, decay: 0.12, ratios: [1, 1.41] }); k.noise(t + 0.2, 0.03, { type: 'lowpass', f: 700, gain: 0.07 }); }),
  lock: S('자물쇠를 따다', '행동', (k, t) => { [0, 0.11, 0.2, 0.34].forEach((d) => k.metal(t + d + Math.random() * 0.03, 3000 + Math.random() * 1800, { gain: 0.016, decay: 0.05, ratios: [1, 1.6] })); k.metal(t + 0.5, 1500, { gain: 0.05, decay: 0.12, ratios: [1, 2.2, 3.4] }); k.knock(t + 0.5, 300, 0.12); }),
  jail: S('쇠창살', '행동', (k, t) => { k.metal(t, 310, { gain: 0.16, decay: 1.1, ratios: [1, 1.48, 2.6, 3.9, 5.3] }); k.thud(t, 0.36, 90); k.crackle(t + 0.06, 0.25, { f: 2500, gain: 0.04, rate: 60 }); }, { duck: 0.6 }),

  /* ----- 전투 ----- */
  slash: S('베기', '전투', (k, t) => { k.whoosh(t, 0.17, 0.2, 900, 4200); k.noise(t + 0.13, 0.08, { type: 'highpass', f: 3000, gain: 0.12, attack: 0.002 }); }),
  stab: S('찌르기', '전투', (k, t) => { k.whoosh(t, 0.09, 0.2, 1600, 5200); k.thud(t + 0.08, 0.2, 140); }),
  feint: S('속임 동작', '전투', (k, t) => { k.whoosh(t, 0.12, 0.1, 1200, 2400); k.step(t + 0.16, 0.16); k.whoosh(t + 0.26, 0.15, 0.2, 900, 4200); }),
  parry: S('칼이 부딪치다', '전투', (k, t) => { k.clang(t, 0.22, 1850); k.clang(t + 0.012, 0.1, 2640); }),
  guard: S('막아 내다', '전투', (k, t) => { k.thud(t, 0.34, 150); k.clang(t + 0.01, 0.12, 1300); }),
  hit: S('맞다', '전투', (k, t) => { k.thud(t, 0.36, 115); k.noise(t, 0.05, { f: 1500, q: 0.6, gain: 0.25, attack: 0.001 }); }),
  fire: S('화염 주문', '전투', (k, t) => { k.noise(t, 0.75, { type: 'lowpass', f: 300, f2: 2400, q: 0.8, gain: 0.2, attack: 0.3 }); k.crackle(t + 0.2, 0.7, { f: 3200, gain: 0.14, rate: 60 }); k.thud(t + 0.45, 0.25, 80); }),
  frost: S('얼음 주문', '전투', (k, t) => { [96, 93, 88, 86, 81].forEach((m, i) => k.note('glass', t + i * 0.055, m, 0.5, 0.2)); k.noise(t, 0.5, { type: 'highpass', f: 7000, gain: 0.06, attack: 0.05 }); k.crackle(t + 0.25, 0.3, { f: 7000, gain: 0.08, rate: 80 }); }),
  bolt: S('번개 주문', '전투', (k, t) => { k.noise(t, 0.05, { type: 'highpass', f: 2500, gain: 0.5, attack: 0.001 }); k.crackle(t, 0.22, { f: 5000, gain: 0.25, rate: 140 }); k.noise(t + 0.06, 1.6, { type: 'lowpass', f: 260, f2: 70, q: 0.6, gain: 0.45, attack: 0.05 }); }, { duck: 0.5 }),
  gale: S('바람 주문', '전투', (k, t) => { k.whoosh(t, 0.5, 0.26, 500, 3800); k.whoosh(t + 0.12, 0.4, 0.14, 1500, 6000); }),
  quake: S('땅 주문', '전투', (k, t) => { k.noise(t, 1, { type: 'lowpass', f: 110, q: 0.8, gain: 0.5, attack: 0.15 }); k.crackle(t + 0.15, 0.7, { f: 900, gain: 0.16, rate: 40, type: 'bandpass' }); k.thud(t + 0.1, 0.4, 70); }),
  heal: S('치유 주문', '전투', (k, t) => { [64, 71, 76, 83].forEach((m, i) => k.note('harp', t + i * 0.1, m, 1.6, 0.36)); k.note('choir', t + 0.1, 64, 0.9, 0.12); k.noise(t, 0.9, { f: 2500, f2: 5000, q: 4, gain: 0.03, attack: 0.5 }); }, { steady: true }),
  ward: S('결계', '전투', (k, t) => { k.tone(t, 1.2, { f: 196, f2: 392, gain: 0.1, attack: 0.3, drop: 0.6 }); k.note('glass', t + 0.5, 79, 1.2, 0.2); k.note('glass', t + 0.5, 86, 1.2, 0.14); }),
  aura: S('검기', '전투', (k, t) => { k.noise(t, 0.5, { f: 1200, f2: 6000, q: 5, gain: 0.08, attack: 0.3 }); k.tone(t, 0.5, { f: 300, f2: 900, gain: 0.07, attack: 0.2 }); k.whoosh(t + 0.45, 0.2, 0.26, 900, 5000); k.clang(t + 0.6, 0.14, 2300); }),
  growl: S('마물', '전투', (k, t) => {
    const c = k.group.ctx; const p = k.p;
    const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.setValueAtTime(96 * p, t); s.frequency.exponentialRampToValueAtTime(60 * p, t + 0.7);
    const am = c.createOscillator(); am.frequency.value = 27; const amg = c.createGain(); amg.gain.value = 0.5;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(520, t); bp.frequency.exponentialRampToValueAtTime(300, t + 0.7); bp.Q.value = 2.2;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    const tr = c.createGain(); tr.gain.value = 0.5;
    am.connect(amg); amg.connect(tr.gain); s.connect(bp); bp.connect(tr); tr.connect(g); g.connect(k.group.bus('fx').in);
    s.start(t); am.start(t); s.stop(t + 0.8); am.stop(t + 0.8);
    k.noise(t, 0.7, { f: 700, q: 1, gain: 0.07, attack: 0.15 });
  }),
  wound: S('다치다', '전투', (k, t) => { SFX.hit.play(k, t); k.note('strings', t + 0.03, 39, 0.5, 0.5, { attack: 0.02, release: 0.5 }); k.note('strings', t + 0.03, 40, 0.5, 0.45, { attack: 0.02, release: 0.5 }); }),
  // 맞붙는 소리는 날 때마다 순서가 달라진다
  clash: S('맞붙다 (연속)', '전투', (k, t) => { let x = t; const n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { SFX[k.pick(i === n - 1 ? ['hit', 'guard'] : ['slash', 'parry', 'slash', 'stab', 'guard'])].play(k, x); x += 0.17 + Math.random() * 0.16; } }),
  victory: S('이기다', '전투', (k, t) => { k.perc('war', t, 0.7); k.note('horn', t, 50, 0.22, 0.41); k.note('horn', t + 0.24, 57, 0.22, 0.45); k.note('horn', t + 0.48, 62, 1.1, 0.49); k.note('horn', t + 0.48, 57, 1.1, 0.3); k.note('strings', t + 0.48, 50, 1.2, 0.3, { attack: 0.05 }); k.note('strings', t + 0.48, 57, 1.2, 0.3, { attack: 0.05 }); }, { steady: true, duck: 0.4 }),
  defeat: S('지다', '전투', (k, t) => { k.perc('war', t, 0.8); k.note('viol', t, 53, 0.6, 0.28); k.note('viol', t + 0.6, 52, 0.6, 0.26, { from: 53 }); k.note('viol', t + 1.2, 50, 1.6, 0.28, { from: 52 }); k.note('drone', t, 38, 2.4, 0.28, { attack: 0.3, release: 1.2 }); }, { steady: true, duck: 0.4 }),
  flee: S('달아나다', '전투', (k, t) => { for (let i = 0; i < 6; i++) k.step(t + i * 0.12, 0.2 - i * 0.025); }),
  warhorn: S('전쟁 나팔', '전투', (k, t) => { k.note('horn', t, 45, 1.1, 0.45); k.note('horn', t, 38, 1.1, 0.34); k.note('horn', t + 1.2, 50, 1.8, 0.49); k.note('horn', t + 1.2, 45, 1.8, 0.34); k.perc('war', t + 1.2, 0.6); }, { steady: true, duck: 0.5 }),
  march: S('행군', '전투', (k, t) => { for (let i = 0; i < 6; i++) { k.step(t + i * 0.3, 0.2); k.noise(t + i * 0.3, 0.06, { type: 'lowpass', f: 500, gain: 0.12 }); if (i % 2 === 0) k.metal(t + i * 0.3 + 0.03, 2600, { gain: 0.01, decay: 0.08 }); } }),
  cheer: S('함성', '전투', (k, t) => { for (const [f, q, g] of [[520, 2, 0.2], [900, 2.5, 0.16], [1500, 3, 0.08]]) k.noise(t, 1.6, { f, f2: f * 1.25, q, gain: g, attack: 0.5, hold: 0.4 }); }),

  /* ----- 삶의 고비 ----- */
  rise: S('승급 · 서클', '고비', (k, t) => { [50, 57, 62, 69, 74].forEach((m, i) => k.note('harp', t + i * 0.09, m, 2, 0.5)); k.note('bell', t + 0.45, 74, 2.5, 0.2, { decay: 3 }); k.note('strings', t + 0.3, 50, 1.4, 0.3); k.note('strings', t + 0.3, 57, 1.4, 0.3); }, { steady: true, duck: 0.45 }),
  skill: S('기술이 늘다', '고비', (k, t) => { k.note('harp', t, 62, 1, 0.4); k.note('harp', t + 0.1, 69, 1.2, 0.42); }, { steady: true }),
  fail: S('실패', '고비', (k, t) => { k.note('viol', t, 55, 0.35, 0.4); k.note('viol', t + 0.35, 53, 0.8, 0.4, { from: 55 }); }, { steady: true }),
  birth: S('아이가 태어나다', '고비', (k, t) => { k.note('harp', t, 62, 2, 0.45); k.note('harp', t + 0.22, 69, 2, 0.45); k.note('bell', t + 0.44, 74, 2.5, 0.16, { decay: 3 }); }, { steady: true, duck: 0.5 }),
  death: S('죽음', '고비', (k, t) => { k.note('bell', t, 38, 5, 0.4, { decay: 7 }); k.note('choirOo', t + 0.1, 50, 2.2, 0.28); k.note('choirOo', t + 0.1, 57, 2.2, 0.24); }, { steady: true, duck: 0.3 }),
  wedding: S('혼례', '고비', (k, t) => { [[0, 67], [0.5, 62], [1.0, 67], [1.5, 62]].forEach(([d, m]) => k.note('bell', t + d, m, 2, 0.24, { decay: 3 })); }, { steady: true, duck: 0.5 }),
  newyear: S('새해', '고비', (k, t) => { k.note('bell', t, 57, 3, 0.22, { decay: 4 }); k.note('bell', t + 0.9, 57, 3, 0.16, { decay: 4 }); }, { steady: true }),
};

/** 효과음 내기. group은 효과음용 Group (engine.group('sfx')). 음악을 줄일 만한 소리면 줄인다. */
const kits = new WeakMap();
export function playSfx(group, id, when = 0) {
  const s = SFX[id];
  if (!s) return false;
  let k = kits.get(group);
  if (!k) { k = kit(group); kits.set(group, k); }
  // 날 때마다 조금씩 다르게 (가락이 있는 소리는 높이를 그대로 둔다)
  k.p = s.steady ? 1 : 2 ** ((Math.random() - 0.5) * 0.28);
  k.g = 0.86 + Math.random() * 0.24;
  s.play(k, group.ctx.currentTime + 0.01 + when);
  if (s.duck) group.e.duck(s.duck, 1.1, when);
  return true;
}
