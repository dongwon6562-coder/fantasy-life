// 미리듣기 페이지 (tools/audio-preview.js가 dist/audio-preview.html로 묶는다).
// 게임과 똑같은 엔진·곡·효과음 코드를 쓴다.
import { Engine } from './engine.js';
import { MusicPlayer } from './music.js';
import { TRACKS } from './tracks.js';
import { SFX, playSfx } from './sfx.js';

const $ = (s, el = document) => el.querySelector(s);
const MODE = { dorian: '도리아', mixolydian: '믹솔리디아', lydian: '리디아', aeolian: '에올리아', phrygian: '프리지아', ionian: '이오니아' };
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const INST = { lute: '류트', harp: '하프', strings: '현악', viol: '비올', flute: '나무 피리', horn: '뿔나팔', choir: '합창', choirOo: '낮은 합창', bell: '종', glass: '유리 종', drone: '지속 저음', wind: '바람', frame: '틀북', war: '큰북', tom: '북', tick: '나무 타악', shaker: '셰이커', jingle: '방울', heart: '심장 소리' };
const GROUPS = [
  ['처음 화면', ['title']],
  ['에른 마을의 사계절', ['village_spring', 'village_summer', 'village_autumn', 'village_winter']],
  ['도시와 길', ['town', 'castle', 'capital', 'road']],
  ['미궁과 싸움', ['dungeon', 'battle', 'boss']],
  ['사건', ['tense', 'solemn', 'festive', 'mystic', 'hardship']],
];
const insts = (t) => [...new Set(t.sections.flatMap((s) => s.parts.map((p) => p.type ?? p.inst)).filter(Boolean))].map((i) => INST[i] ?? i);

let engine = null, player = null, fx = null, analyser = null;
const vol = { music: 0.7, sfx: 0.8 };
function boot() {
  if (engine) { if (engine.ctx.state !== 'running') engine.ctx.resume(); return; }
  const AC = window.AudioContext ?? window.webkitAudioContext;
  engine = new Engine(new AC());
  player = new MusicPlayer(engine, TRACKS);
  fx = engine.group('sfx');
  analyser = engine.ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.82;
  engine.comp.connect(analyser);
  for (const k of ['music', 'sfx']) engine.setVolume(k, vol[k] ** 1.6);
  draw();
}

let tourTimers = [];
const stopTour = () => { tourTimers.forEach(clearTimeout); tourTimers = []; $('#tour').setAttribute('aria-pressed', 'false'); $('#tour-note').textContent = ''; };

function playTrack(id) {
  boot();
  if (player.playing === id) player.stop(1.2); else player.play(id);
  refresh();
}
function refresh() {
  const id = player?.playing ?? null;
  document.querySelectorAll('[data-track]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.track === id)));
  const t = TRACKS.find((x) => x.id === id);
  $('#now-name').textContent = t ? t.name : '멈춤';
  $('#now-where').textContent = t ? t.where : '곡을 누르면 시작한다';
  $('#stop').disabled = !t;
}

// 게임에서처럼 상황이 바뀌며 곡이 넘어가는 것을 들려준다
function tour() {
  boot(); stopTour();
  $('#tour').setAttribute('aria-pressed', 'true');
  const steps = [
    [0, '에른 마을의 봄. 평범한 달이 흐른다.', () => player.play('village_spring')],
    [14, '한 달을 보낸다.', () => playSfx(fx, 'month')],
    [16, '사건: 숲가에 늑대가 나타났다.', () => { playSfx(fx, 'event'); player.play('tense'); }],
    [28, '맞서 싸우기로 한다.', () => { playSfx(fx, 'choose'); player.play('battle', { fade: 1.2 }); }],
    [30, '', () => playSfx(fx, 'clash')],
    [41, '', () => playSfx(fx, 'clash')],
    [44, '이겼다.', () => { playSfx(fx, 'victory'); player.play('village_spring', { fade: 3 }); }],
    [58, '', () => { player.stop(3); stopTour(); refresh(); }],
  ];
  for (const [at, note, fn] of steps) tourTimers.push(setTimeout(() => { if (note) $('#tour-note').textContent = note; fn(); refresh(); }, at * 1000));
}

function draw() {
  const cv = $('#scope'); const c = cv.getContext('2d');
  const data = new Uint8Array(analyser.frequencyBinCount);
  const css = getComputedStyle(document.documentElement);
  const brass = css.getPropertyValue('--brass').trim(), dim = css.getPropertyValue('--line').trim();
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = () => {
    const w = cv.clientWidth, h = cv.clientHeight, r = window.devicePixelRatio || 1;
    if (cv.width !== w * r) { cv.width = w * r; cv.height = h * r; }
    c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h);
    analyser.getByteFrequencyData(data);
    const n = Math.max(16, Math.floor(w / 7));
    for (let i = 0; i < n; i++) {
      // 낮은 음에 칸을 더 주는 로그 눈금 (40Hz ~ 9kHz)
      const f0 = 40 * (225 ** (i / n)), f1 = 40 * (225 ** ((i + 1) / n));
      const a = Math.floor(f0 / (engine.ctx.sampleRate / 2) * data.length), b = Math.max(a + 1, Math.floor(f1 / (engine.ctx.sampleRate / 2) * data.length));
      let v = 0; for (let k = a; k < b; k++) v = Math.max(v, data[k]);
      const bh = Math.max(1, (v / 255) ** 1.6 * (h - 2));
      c.fillStyle = v > 8 ? brass : dim;
      c.fillRect(i * (w / n) + 1, h - bh, w / n - 2, bh);
    }
    if (!still) requestAnimationFrame(frame); else setTimeout(frame, 400);
  };
  frame();
}

function build() {
  $('#tracks').innerHTML = GROUPS.map(([title, ids]) => `
    <section class="grp"><h3>${title}</h3><ul class="tracks">
      ${ids.map((id) => { const t = TRACKS.find((x) => x.id === id); return `
        <li><button class="track" data-track="${t.id}" aria-pressed="false">
          <span class="pp" aria-hidden="true"></span>
          <span class="tt"><strong>${t.name}</strong><span class="wh">${t.where}</span></span>
          <span class="meta"><span>${NOTE[t.root % 12]} ${MODE[t.scale]} · ${t.beats}/4 · ♩=${t.bpm}</span><span class="ins">${insts(t).join(', ')}</span></span>
        </button></li>`; }).join('')}
    </ul></section>`).join('');
  const kinds = [...new Set(Object.values(SFX).map((s) => s.kind))];
  $('#sfx').innerHTML = kinds.map((k) => `
    <section class="grp"><h3>${k}</h3><div class="pads">
      ${Object.entries(SFX).filter(([, s]) => s.kind === k).map(([id, s]) => `<button class="padb" data-sfx="${id}">${s.name}</button>`).join('')}
    </div></section>`).join('');
  $('#count').textContent = `곡 ${TRACKS.length}개 · 효과음 ${Object.keys(SFX).length}개 · 녹음 파일 0개`;

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-track]');
    if (t) { stopTour(); playTrack(t.dataset.track); return; }
    const s = e.target.closest('[data-sfx]');
    if (s) { boot(); playSfx(fx, s.dataset.sfx); }
  });
  $('#stop').onclick = () => { stopTour(); player?.stop(1.2); refresh(); };
  $('#tour').onclick = () => { if (tourTimers.length) { stopTour(); player?.stop(1.2); refresh(); } else tour(); };
  for (const k of ['music', 'sfx']) {
    const el = $(`#vol-${k}`);
    el.oninput = () => { vol[k] = el.value / 100; el.nextElementSibling.textContent = el.value; if (engine) engine.setVolume(k, vol[k] ** 1.6); };
    el.onchange = () => { if (k === 'sfx') { boot(); playSfx(fx, 'confirm'); } };
  }
  document.addEventListener('visibilitychange', () => { if (engine && document.hidden) { stopTour(); player.stop(0.5); refresh(); } });
  refresh();
}
build();
