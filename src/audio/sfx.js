// 효과음. 전부 잡음과 사인파를 깎아서 만든다 (녹음 파일 없음).
// SFX[이름] = { name(한국어), kind(묶음), play(k, t) }.  k는 아래 도구 상자, t는 시작 시각.

function kit(group) {
  const c = group.ctx, e = group.e;
  const out = group.bus('fx').in;
  const k = {
    group,
    // 걸러 낸 잡음 한 줄기. f→f2로 음색이 움직인다.
    noise(t, dur, { type = 'bandpass', f = 1000, f2, q = 1, gain = 0.3, attack = 0.004, hold = 0 } = {}) {
      const n = c.createBufferSource(); n.buffer = e.noise; n.loop = true;
      const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
      fl.frequency.setValueAtTime(f, t);
      if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
      if (hold) g.gain.setValueAtTime(gain, t + attack + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(fl); fl.connect(g); g.connect(out);
      n.start(t, Math.random() * 1.5); n.stop(t + dur + 0.05);
      return g;
    },
    // 음높이가 f→f2로 떨어지는(또는 오르는) 소리
    tone(t, dur, { type = 'sine', f = 200, f2, gain = 0.3, attack = 0.004, drop } = {}) {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + (drop ?? dur));
      const g = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
      return o;
    },
    // 쇠붙이: 배음이 어긋난 사인파 묶음
    metal(t, f, { gain = 0.2, decay = 0.6, ratios = [1, 1.52, 2.31, 3.43, 4.71, 6.2] } = {}) {
      ratios.forEach((r, i) => {
        if (f * r < 14000) k.tone(t, decay / (1 + i * 0.35), { f: f * r * (1 + (Math.random() - 0.5) * 0.004), gain: gain / (1 + i * 0.6), attack: 0.001 });
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
    page(t, gain = 0.16) { k.noise(t, 0.13, { f: 3200, f2: 1100, q: 0.9, gain: gain * 1.7, attack: 0.03 }); },
    clang(t, gain = 0.2, f = 1700) { k.noise(t, 0.03, { type: 'highpass', f: 3500, gain: gain * 1.2, attack: 0.001 }); k.metal(t, f * (0.94 + Math.random() * 0.12), { gain: gain * 0.6, decay: 0.55 }); },
    note: (inst, t, midi, dur, vel, o) => group.note(inst, t, midi, dur, vel, o),
    perc: (type, t, vel) => group.perc(type, t, vel),
  };
  return k;
}

export const SFX = {
  /* ----- 화면 ----- */
  tap: { name: '버튼 누르기', kind: '화면', play: (k, t) => { k.noise(t, 0.03, { f: 2300, q: 1.2, gain: 0.14 }); k.tone(t, 0.04, { f: 330, f2: 190, gain: 0.14 }); } },
  tab: { name: '화면 넘기기', kind: '화면', play: (k, t) => k.page(t, 0.13) },
  select: { name: '행동 고르기', kind: '화면', play: (k, t) => { k.knock(t, 260, 0.14); k.note('lute', t + 0.005, 57, 0.4, 0.4, { damp: true }); } },
  target: { name: '사람 고르기', kind: '화면', play: (k, t) => k.note('harp', t, 69, 0.5, 0.38) },
  confirm: { name: '결정', kind: '화면', play: (k, t) => { k.note('lute', t, 62, 0.6, 0.5); k.note('lute', t + 0.075, 69, 0.8, 0.55); } },
  close: { name: '닫기', kind: '화면', play: (k, t) => { k.knock(t, 170, 0.2); k.page(t + 0.01, 0.07); } },
  month: { name: '한 달을 보내다', kind: '화면', play: (k, t) => { k.page(t, 0.18); k.page(t + 0.16, 0.12); k.note('bell', t + 0.2, 55, 2, 0.16, { decay: 2.6 }); k.note('harp', t + 0.2, 50, 1.5, 0.4); } },
  event: { name: '사건이 생기다', kind: '화면', play: (k, t) => { k.crackle(t, 0.3, { f: 2800, gain: 0.1, rate: 60, type: 'bandpass' }); k.note('strings', t + 0.05, 38, 0.9, 0.5, { attack: 0.03, release: 0.9 }); k.note('strings', t + 0.05, 45, 0.9, 0.4, { attack: 0.03, release: 0.9 }); k.perc('frame', t + 0.05, 0.5); } },
  choose: { name: '선택지 고르기', kind: '화면', play: (k, t) => { k.crackle(t, 0.16, { f: 4500, gain: 0.09, rate: 90 }); k.noise(t, 0.18, { type: 'highpass', f: 4200, gain: 0.05, attack: 0.02 }); k.knock(t + 0.17, 230, 0.16); } },
  save: { name: '저장', kind: '화면', play: (k, t) => { k.thud(t, 0.25, 140); k.note('glass', t + 0.06, 81, 0.6, 0.18); } },
  deny: { name: '안 됨', kind: '화면', play: (k, t) => { k.knock(t, 130, 0.26); k.knock(t + 0.11, 115, 0.22); } },
  begin: { name: '태어나다', kind: '화면', play: (k, t) => { k.note('bell', t, 50, 3, 0.3, { decay: 4.5 }); k.note('harp', t + 0.05, 50, 2, 0.5); k.note('harp', t + 0.3, 57, 2, 0.5); k.note('harp', t + 0.55, 62, 2.5, 0.55); } },

  /* ----- 행동 ----- */
  sword: { name: '검술 수련', kind: '행동', play: (k, t) => { k.whoosh(t, 0.16, 0.14); k.clang(t + 0.15, 0.17); } },
  shield: { name: '방패 · 경비', kind: '행동', play: (k, t) => { k.thud(t, 0.3, 150); k.metal(t, 520, { gain: 0.04, decay: 0.25 }); } },
  book: { name: '공부', kind: '행동', play: (k, t) => { k.page(t, 0.16); k.page(t + 0.22, 0.11); } },
  body: { name: '몸 단련', kind: '행동', play: (k, t) => { k.step(t, 0.22); k.step(t + 0.17, 0.2); k.noise(t + 0.3, 0.3, { f: 1100, q: 0.5, gain: 0.07, attack: 0.1 }); } },
  magic: { name: '마법 수련', kind: '행동', play: (k, t) => { k.noise(t, 0.7, { f: 900, f2: 5200, q: 3, gain: 0.07, attack: 0.4 }); [76, 81, 83, 88, 93].forEach((m, i) => k.note('glass', t + 0.08 + i * 0.075, m, 0.8, 0.2 + i * 0.03)); } },
  meditate: { name: '명상', kind: '행동', play: (k, t) => { k.tone(t, 2.6, { f: 220, gain: 0.16, attack: 0.02 }); k.tone(t, 2.6, { f: 221.3, gain: 0.12, attack: 0.02 }); k.tone(t, 1.8, { f: 603, gain: 0.07, attack: 0.01 }); k.tone(t, 1.1, { f: 1172, gain: 0.03, attack: 0.01 }); } },
  herb: { name: '약초 캐기', kind: '행동', play: (k, t) => { k.crackle(t, 0.32, { f: 5200, gain: 0.12, rate: 70 }); k.noise(t + 0.05, 0.22, { type: 'highpass', f: 3800, gain: 0.05, attack: 0.08 }); } },
  cook: { name: '요리', kind: '행동', play: (k, t) => { [0, 0.13, 0.26].forEach((d) => k.knock(t + d, 420, 0.2)); k.noise(t + 0.3, 0.55, { type: 'highpass', f: 5200, gain: 0.05, attack: 0.05, hold: 0.2 }); k.crackle(t + 0.3, 0.5, { f: 6000, gain: 0.06, rate: 50 }); } },
  coin: { name: '돈 · 장사', kind: '행동', play: (k, t) => { [[0, 4300], [0.07, 5600], [0.12, 4900]].forEach(([d, f]) => k.metal(t + d, f, { gain: 0.07, decay: 0.3, ratios: [1, 1.41, 2.3] })); } },
  labor: { name: '품일', kind: '행동', play: (k, t) => { for (const d of [0, 0.34]) { k.noise(t + d, 0.07, { type: 'lowpass', f: 2000, gain: 0.18, attack: 0.001 }); k.tone(t + d, 0.14, { f: 190, f2: 85, gain: 0.18, drop: 0.07 }); k.crackle(t + d + 0.02, 0.06, { f: 2500, gain: 0.08, rate: 120 }); } } },
  farm: { name: '밭일', kind: '행동', play: (k, t) => { for (const d of [0, 0.36]) { k.thud(t + d, 0.2, 95); k.crackle(t + d + 0.02, 0.12, { f: 2200, gain: 0.08, rate: 90, type: 'bandpass' }); } } },
  pray: { name: '기도', kind: '행동', play: (k, t) => k.note('bell', t, 76, 2, 0.2, { decay: 2.8 }) },
  hunt: { name: '사냥', kind: '행동', play: (k, t) => { k.tone(t, 0.12, { type: 'triangle', f: 210, f2: 150, gain: 0.15, attack: 0.001 }); k.whoosh(t + 0.02, 0.2, 0.14, 1800, 5200); k.knock(t + 0.27, 180, 0.18); } },
  travel: { name: '길 떠나기', kind: '행동', play: (k, t) => { [0, 0.24, 0.48, 0.72].forEach((d, i) => k.step(t + d, i % 2 ? 0.14 : 0.19)); } },
  wander: { name: '돌아다니기', kind: '행동', play: (k, t) => { [0, 0.3, 0.6].forEach((d, i) => k.step(t + d, i % 2 ? 0.13 : 0.17)); k.noise(t, 0.9, { f: 600, f2: 900, q: 0.8, gain: 0.04, attack: 0.4 }); } },
  smith: { name: '대장간', kind: '행동', play: (k, t) => { for (const d of [0, 0.3]) { k.metal(t + d, 1130, { gain: 0.08, decay: 0.8, ratios: [1, 2.76, 5.4, 8.93] }); k.thud(t + d, 0.15, 160); } } },
  dungeon: { name: '미궁에 들어서다', kind: '행동', play: (k, t) => { k.noise(t, 0.9, { type: 'lowpass', f: 180, q: 0.7, gain: 0.26, attack: 0.25 }); k.tone(t + 0.1, 0.6, { type: 'sawtooth', f: 78, f2: 62, gain: 0.05, attack: 0.1 }); k.thud(t + 0.75, 0.3, 70); } },
  heart: { name: '마음을 전하다', kind: '행동', play: (k, t) => { k.note('harp', t, 64, 1.2, 0.42); k.note('harp', t + 0.14, 67, 1.4, 0.42); } },
  visit: { name: '찾아가기', kind: '행동', play: (k, t) => { [0, 0.15, 0.3].forEach((d) => k.knock(t + d, 210, 0.18)); } },
  rest: { name: '쉬기', kind: '행동', play: (k, t) => { k.noise(t, 0.6, { type: 'lowpass', f: 650, q: 0.4, gain: 0.07, attack: 0.25 }); k.note('harp', t + 0.1, 45, 1.5, 0.3); } },
  play: { name: '놀기', kind: '행동', play: (k, t) => { [0, 0.09, 0.2, 0.27].forEach((d, i) => k.knock(t + d, [520, 640, 480, 700][i], 0.14)); } },
  home: { name: '집안일', kind: '행동', play: (k, t) => { k.whoosh(t, 0.22, 0.09, 1800, 3200); k.whoosh(t + 0.28, 0.2, 0.08, 2000, 3000); } },
  crown: { name: '귀족 · 궁정', kind: '행동', play: (k, t) => { k.note('horn', t, 55, 0.25, 0.5); k.note('horn', t + 0.26, 62, 0.6, 0.55); } },
  ship: { name: '배 · 물가', kind: '행동', play: (k, t) => { k.noise(t, 1.2, { type: 'lowpass', f: 500, f2: 1600, q: 0.5, gain: 0.14, attack: 0.6 }); } },
  scroll: { name: '글 · 기록', kind: '행동', play: (k, t) => { k.crackle(t, 0.22, { f: 4500, gain: 0.09, rate: 90 }); k.noise(t, 0.24, { type: 'highpass', f: 4200, gain: 0.05, attack: 0.03 }); } },

  /* ----- 전투 ----- */
  slash: { name: '베기', kind: '전투', play: (k, t) => { k.whoosh(t, 0.17, 0.2, 900, 4200); k.noise(t + 0.13, 0.08, { type: 'highpass', f: 3000, gain: 0.12, attack: 0.002 }); } },
  parry: { name: '칼이 부딪치다', kind: '전투', play: (k, t) => { k.clang(t, 0.22, 1850); k.clang(t + 0.012, 0.1, 2640); } },
  hit: { name: '맞다', kind: '전투', play: (k, t) => { k.thud(t, 0.36, 115); k.noise(t, 0.05, { f: 1500, q: 0.6, gain: 0.25, attack: 0.001 }); } },
  arrow: { name: '화살', kind: '전투', play: (k, t) => SFX.hunt.play(k, t) },
  fire: { name: '화염 주문', kind: '전투', play: (k, t) => { k.noise(t, 0.75, { type: 'lowpass', f: 300, f2: 2400, q: 0.8, gain: 0.2, attack: 0.3 }); k.crackle(t + 0.2, 0.7, { f: 3200, gain: 0.14, rate: 60 }); k.thud(t + 0.45, 0.25, 80); } },
  frost: { name: '냉기 주문', kind: '전투', play: (k, t) => { [96, 93, 88, 86, 81].forEach((m, i) => k.note('glass', t + i * 0.055, m, 0.5, 0.2)); k.noise(t, 0.5, { type: 'highpass', f: 7000, gain: 0.06, attack: 0.05 }); k.crackle(t + 0.25, 0.3, { f: 7000, gain: 0.08, rate: 80 }); } },
  growl: {
    name: '마물', kind: '전투', play: (k, t) => {
      const c = k.group.ctx;
      const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.setValueAtTime(96, t); s.frequency.exponentialRampToValueAtTime(60, t + 0.7);
      const am = c.createOscillator(); am.frequency.value = 27; const amg = c.createGain(); amg.gain.value = 0.5;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(520, t); bp.frequency.exponentialRampToValueAtTime(300, t + 0.7); bp.Q.value = 2.2;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
      const tr = c.createGain(); tr.gain.value = 0.5;
      am.connect(amg); amg.connect(tr.gain); s.connect(bp); bp.connect(tr); tr.connect(g); g.connect(k.group.bus('fx').in);
      s.start(t); am.start(t); s.stop(t + 0.8); am.stop(t + 0.8);
      k.noise(t, 0.7, { f: 700, q: 1, gain: 0.07, attack: 0.15 });
    },
  },
  wound: { name: '다치다', kind: '전투', play: (k, t) => { SFX.hit.play(k, t); k.note('strings', t + 0.03, 39, 0.5, 0.5, { attack: 0.02, release: 0.5 }); k.note('strings', t + 0.03, 40, 0.5, 0.45, { attack: 0.02, release: 0.5 }); } },
  clash: { name: '맞붙다 (연속)', kind: '전투', play: (k, t) => { SFX.slash.play(k, t); SFX.parry.play(k, t + 0.22); SFX.slash.play(k, t + 0.5); SFX.hit.play(k, t + 0.68); } },
  victory: { name: '이기다', kind: '전투', play: (k, t) => { k.perc('war', t, 0.7); k.note('horn', t, 50, 0.22, 0.55); k.note('horn', t + 0.24, 57, 0.22, 0.6); k.note('horn', t + 0.48, 62, 1.1, 0.65); k.note('strings', t + 0.48, 50, 1.2, 0.4, { attack: 0.05 }); k.note('strings', t + 0.48, 57, 1.2, 0.4, { attack: 0.05 }); } },
  defeat: { name: '지다', kind: '전투', play: (k, t) => { k.perc('war', t, 0.8); k.note('viol', t, 53, 0.6, 0.5); k.note('viol', t + 0.6, 52, 0.6, 0.48); k.note('viol', t + 1.2, 50, 1.6, 0.5); k.note('drone', t, 38, 2.4, 0.5, { attack: 0.3, release: 1.2 }); } },
  flee: { name: '달아나다', kind: '전투', play: (k, t) => { for (let i = 0; i < 6; i++) k.step(t + i * 0.12, 0.2 - i * 0.025); } },

  /* ----- 삶의 고비 ----- */
  rise: { name: '승급 · 서클', kind: '고비', play: (k, t) => { [50, 57, 62, 69, 74].forEach((m, i) => k.note('harp', t + i * 0.09, m, 2, 0.5)); k.note('bell', t + 0.45, 74, 2.5, 0.2, { decay: 3 }); k.note('strings', t + 0.3, 50, 1.4, 0.3); k.note('strings', t + 0.3, 57, 1.4, 0.3); } },
  birth: { name: '아이가 태어나다', kind: '고비', play: (k, t) => { k.note('harp', t, 62, 2, 0.45); k.note('harp', t + 0.22, 69, 2, 0.45); k.note('bell', t + 0.44, 74, 2.5, 0.16, { decay: 3 }); } },
  death: { name: '죽음', kind: '고비', play: (k, t) => { k.note('bell', t, 38, 5, 0.5, { decay: 7 }); k.note('choirOo', t + 0.1, 50, 2.2, 0.35); k.note('choirOo', t + 0.1, 57, 2.2, 0.3); } },
  wedding: { name: '혼례', kind: '고비', play: (k, t) => { [[0, 67], [0.5, 62], [1.0, 67], [1.5, 62]].forEach(([d, m]) => k.note('bell', t + d, m, 2, 0.24, { decay: 3 })); } },
  newyear: { name: '새해', kind: '고비', play: (k, t) => { k.note('bell', t, 57, 3, 0.28, { decay: 4 }); k.note('bell', t + 0.9, 57, 3, 0.2, { decay: 4 }); } },
};

/** 효과음 내기. group은 효과음용 Group (engine.group('sfx')) */
const kits = new WeakMap();
export function playSfx(group, id, when = 0) {
  const s = SFX[id];
  if (!s) return false;
  let k = kits.get(group);
  if (!k) { k = kit(group); kits.set(group, k); }
  s.play(k, group.ctx.currentTime + 0.01 + when);
  return true;
}
