// 전투 연출의 배경: 그 고장 풍경(scene) 그림을 흐리게 깔고, 거기서 하늘빛·땅빛을 읽어 싸움터 땅과 빛을 맞춘다. (46단계)
//  makeBack({ url, seed, ground, night }) → { tone, draw(c, t) }
//  tone: { sky, ground, light(가장자리 빛 빛깔), dark(0 낮 ~ 1 밤) }  풍경 그림을 읽기 전에는 무난한 저녁빛
import { SW, SH, GY, lerp, clamp, mix, rgba } from './battleKit.js';

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mkRnd = (seed) => { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// 구경꾼 한 줄: 어깨와 머리만 보이는 작은 실루엣 (가운데는 비워 둔다)
function crowd(c, T, y, rnd, { n = 46, h = 13, gap = 0, tone = 0.5 } = {}) {
  const cols = ['#4a3c34', '#3c4450', '#54463a', '#40483a', '#5a3a36', '#44404c'];
  for (let i = 0; i < n; i++) {
    const x = (i + rnd() * 0.7) / n * SW; if (gap && Math.abs(x - 320) < gap) continue;
    const hh = h * (0.85 + rnd() * 0.3), col = mix(cols[(rnd() * cols.length) | 0], '#0c0a10', tone);
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y, hh * 0.42, hh * 0.7, 0, Math.PI, 0); c.lineTo(x + hh * 0.42, y + 3); c.lineTo(x - hh * 0.42, y + 3); c.closePath(); c.fill();
    c.fillStyle = mix('#b8936e', '#0c0a10', tone + 0.1); c.beginPath(); c.arc(x, y - hh * 0.86, hh * 0.24, 0, 6.3); c.fill();
    if (rnd() < 0.4) { c.fillStyle = mix(col, '#0c0a10', 0.3); c.beginPath(); c.arc(x, y - hh * 0.92, hh * 0.26, Math.PI, 0); c.fill(); }
    c.strokeStyle = rgba(T.light, 0.22); c.lineWidth = 0.7; c.beginPath(); c.arc(x, y - hh * 0.86, hh * 0.24, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  }
}
// 결투 장소: 도장(마루와 벽)·광장·궁정 마당(구경꾼)·전장(양쪽 진)·투기장(관중석)
function venueBack(c, B, hz, rnd) {
  const T = B.tone, v = B.venue;
  if (v === 'dojo') { // 풍경 대신 도장 안
    let g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#2a2220'); g.addColorStop(1, '#5a4a3a'); c.fillStyle = g; c.fillRect(0, 0, SW, hz + 6);
    for (const x of [150, 320, 490]) { g = c.createLinearGradient(0, 40, 0, hz - 40); g.addColorStop(0, rgba(T.light, 0.75)); g.addColorStop(1, rgba(T.light, 0.4)); c.fillStyle = g; c.fillRect(x - 46, 40, 92, hz - 96); c.strokeStyle = '#3a2c22'; c.lineWidth = 2; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x - 46 + i * 23, 40); c.lineTo(x - 46 + i * 23, hz - 56); c.stroke(); } for (let j = 1; j < 4; j++) { const y = 40 + j * (hz - 96) / 4; c.beginPath(); c.moveTo(x - 46, y); c.lineTo(x + 46, y); c.stroke(); } c.lineWidth = 4; c.strokeRect(x - 46, 40, 92, hz - 96); }
    c.fillStyle = '#2e2420'; for (const x of [58, 236, 404, 582]) c.fillRect(x - 5, 0, 10, hz + 4); c.fillRect(0, 22, SW, 9); c.fillRect(0, hz - 50, SW, 6);
    c.strokeStyle = '#6a5038'; c.lineWidth = 2.4; c.lineCap = 'round'; for (const x0 of [86, 520]) for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x0 + i * 9, hz - 46); c.lineTo(x0 + i * 9 + 3, hz - 96); c.stroke(); }
    crowd(c, T, hz + 1, rnd, { n: 30, h: 12, gap: 150, tone: 0.45 }); // 벽 쪽에 앉은 문하생들
    return;
  }
  if (v === 'arena') { // 둥근 벽과 층층 관중석
    const top = hz - 96; c.fillStyle = mix('#6a5c4a', T.sky, 0.2); c.beginPath(); c.moveTo(0, top + 14); c.quadraticCurveTo(320, top - 16, SW, top + 14); c.lineTo(SW, hz + 4); c.lineTo(0, hz + 4); c.closePath(); c.fill();
    for (let r = 0; r < 4; r++) { const y = top + 26 + r * 17; crowd(c, T, y + 10, rnd, { n: 64 - r * 4, h: 9 + r, tone: 0.4 - r * 0.05 }); c.fillStyle = mix('#5a4e40', '#0c0a10', 0.2 + r * 0.06); c.fillRect(0, y + 10, SW, 6); }
    c.fillStyle = mix('#4a4036', '#0c0a10', 0.3); c.fillRect(0, hz - 20, SW, 26); c.fillStyle = rgba(T.light, 0.16); c.fillRect(0, hz - 20, SW, 1.4);
    return;
  }
  if (v === 'field') { // 양쪽 진: 멀리 선 창과 깃발
    for (const side of [-1, 1]) { const x0 = side < 0 ? 0 : 400; c.fillStyle = mix(side < 0 ? '#2c3448' : '#4a2826', '#0c0a10', 0.3); c.fillRect(x0, hz - 12, 240, 14); c.strokeStyle = 'rgba(20,16,14,.7)'; c.lineWidth = 0.9; for (let i = 0; i < 40; i++) { const x = x0 + rnd() * 240; c.beginPath(); c.moveTo(x, hz - 10); c.lineTo(x + 1, hz - 24 - rnd() * 8); c.stroke(); } crowd(c, T, hz + 1, mkRnd(B.seed + side + 9), { n: 60, h: 8, gap: 0, tone: 0.5 }); for (const bx of [60, 170]) { const x = x0 + bx; c.strokeStyle = '#2a2018'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, hz - 8); c.lineTo(x, hz - 52); c.stroke(); c.fillStyle = side < 0 ? '#3c4a6a' : '#7a2e2a'; c.beginPath(); c.moveTo(x, hz - 52); c.lineTo(x + 18, hz - 48); c.lineTo(x + 14, hz - 43); c.lineTo(x + 18, hz - 38); c.lineTo(x, hz - 38); c.closePath(); c.fill(); } }
    c.fillStyle = rgba(T.sky, 0.5); c.fillRect(240, hz - 14, 160, 18); // 가운데는 비어 있다
    return;
  }
  if (v === 'square' || v === 'court') {
    crowd(c, T, hz - 5, rnd, { n: v === 'court' ? 34 : 52, h: 13, gap: v === 'court' ? 40 : 0, tone: 0.5 }); crowd(c, T, hz + 2, rnd, { n: v === 'court' ? 30 : 46, h: 15, gap: v === 'court' ? 60 : 0, tone: 0.38 });
    if (v === 'court') { c.strokeStyle = '#8a7a50'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, hz + 2); for (let x = 0; x <= SW; x += 64) { c.quadraticCurveTo(x + 32, hz + 8, x + 64, hz + 2); } c.stroke(); c.fillStyle = '#4a3a2a'; for (let x = 0; x <= SW; x += 64) c.fillRect(x - 1.5, hz - 8, 3, 14); }
  }
}
// 교전 지형: 숲(나무 줄기)·다리(난간과 물)·골목(양쪽 벽)·눈밭·굴(바위벽)
function terrainBack(c, B, hz, rnd) {
  const T = B.tone, v = B.terrain;
  if (v === 'forest') {
    c.fillStyle = rgba('#141c14', 0.5); c.fillRect(0, 0, SW, hz + 4);
    for (let i = 0; i < 16; i++) { const x = rnd() * SW, w = 5 + rnd() * 12, far = rnd(); c.fillStyle = mix('#2a2a22', T.sky, 0.3 * far); c.fillRect(x, 0, w, hz + 3); c.fillStyle = rgba(T.light, 0.14); c.fillRect(x, 0, 1.4, hz + 3); }
    for (let i = 0; i < 26; i++) { c.fillStyle = rgba(['#1c2a18', '#24341c', '#16200f'][i % 3], 0.75); c.beginPath(); c.ellipse(rnd() * SW, rnd() * 60, 50 + rnd() * 50, 22 + rnd() * 20, 0, 0, 6.3); c.fill(); }
    for (let i = 0; i < 9; i++) { c.fillStyle = rgba(T.light, 0.06); const x = rnd() * SW; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 30, 0); c.lineTo(x - 50, hz); c.lineTo(x - 70, hz); c.closePath(); c.fill(); }
  } else if (v === 'bridge') {
    const g = c.createLinearGradient(0, hz - 30, 0, hz + 6); g.addColorStop(0, mix('#4a6a7a', T.sky, 0.4)); g.addColorStop(1, '#2a3a44'); c.fillStyle = g; c.fillRect(0, hz - 30, SW, 36);
    c.fillStyle = rgba('#ffffff', 0.14); for (let i = 0; i < 14; i++) c.fillRect(rnd() * SW, hz - 26 + rnd() * 26, 20 + rnd() * 40, 1);
    c.fillStyle = '#3a2c20'; c.fillRect(0, hz - 26, SW, 4); c.fillRect(0, hz - 8, SW, 3); for (let x = 20; x < SW; x += 52) c.fillRect(x, hz - 34, 5, 40);
    c.fillStyle = rgba(T.light, 0.2); c.fillRect(0, hz - 26, SW, 1);
  } else if (v === 'alley') {
    for (const side of [0, 1]) { const x0 = side ? 400 : 0, w = 240; const g = c.createLinearGradient(x0, 0, x0 + w, 0); g.addColorStop(side ? 0 : 1, '#4a4038'); g.addColorStop(side ? 1 : 0, '#241e1c'); c.fillStyle = g; c.fillRect(x0, 0, w, hz + 4);
      c.fillStyle = '#1a1614'; for (let i = 0; i < 3; i++) c.fillRect(x0 + 30 + i * 70, 40 + (i % 2) * 20, 22, 30); c.fillStyle = rgba('#ffc878', 0.5); c.fillRect(x0 + 100, 60, 22, 30);
      c.strokeStyle = 'rgba(12,10,14,.3)'; c.lineWidth = 0.7; for (let y = 10; y < hz; y += 12) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke(); } }
    c.strokeStyle = '#2a2018'; c.lineWidth = 1; c.beginPath(); c.moveTo(200, 50); c.quadraticCurveTo(320, 72, 440, 46); c.stroke(); for (let i = 0; i < 5; i++) { c.fillStyle = ['#8a8478', '#6a5a4a', '#7a3a34', '#a8a090', '#4a5a6a'][i]; c.fillRect(236 + i * 36, 58 + Math.sin(i * 1.2) * 4, 18, 22); }
    for (const x of [70, 96, 560]) { c.fillStyle = '#3a2c20'; c.beginPath(); c.ellipse(x, hz - 12, 12, 16, 0, 0, 6.3); c.fill(); c.strokeStyle = '#6a6a6e'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 11, hz - 18); c.lineTo(x + 11, hz - 18); c.moveTo(x - 11, hz - 6); c.lineTo(x + 11, hz - 6); c.stroke(); }
  } else if (v === 'snow') {
    c.fillStyle = rgba('#dfe6ee', 0.22); c.fillRect(0, 0, SW, hz + 4);
    for (let i = 0; i < 90; i++) { c.fillStyle = rgba('#ffffff', 0.3 + rnd() * 0.4); c.beginPath(); c.arc(rnd() * SW, rnd() * SH, 0.6 + rnd() * 1.3, 0, 6.3); c.fill(); }
  } else if (v === 'cave') {
    const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#0c0a0e'); g.addColorStop(1, '#2e2826'); c.fillStyle = g; c.fillRect(0, 0, SW, hz + 6);
    for (let i = 0; i < 14; i++) { const x = rnd() * SW, w = 14 + rnd() * 30, h = 30 + rnd() * 80; c.fillStyle = mix('#1a1618', '#3a3230', rnd() * 0.5); c.beginPath(); c.moveTo(x - w, 0); c.lineTo(x, h); c.lineTo(x + w, 0); c.closePath(); c.fill(); }
    for (let i = 0; i < 8; i++) { const x = rnd() * SW, w = 20 + rnd() * 40, h = 20 + rnd() * 50; c.fillStyle = mix('#1a1618', '#3a3230', rnd() * 0.6); c.beginPath(); c.moveTo(x - w, hz + 4); c.quadraticCurveTo(x, hz - h, x + w, hz + 4); c.closePath(); c.fill(); }
  }
}
// 땅 종류: 풀밭(기본)·돌바닥(광장·도장·궁정)·눈·모래·흙
const GROUND = {
  grass: { tuft: 1, stone: 0.3 }, stone: { slab: 1, tint: '#8a857a' }, snow: { tint: '#dfe6ee', drift: 1 }, sand: { tint: '#b89a6a', stone: 0.2 }, dirt: { tint: '#5a4838', stone: 0.6 }, wood: { plank: 1, tint: '#5a4430' },
};

export function makeBack({ url = '', seed = 1, ground = 'grass', night = 0, venue = null, terrain = null } = {}) {
  const B = { tone: { sky: '#8a8a94', ground: '#5a5444', light: '#e8dcc4', dark: night ? 0.8 : 0.25 }, img: null, layer: null, ready: false, ground, seed, night, venue, terrain };
  const paint = () => { B.layer = null; };
  if (url && typeof Image !== 'undefined') {
    const im = new Image();
    im.onload = () => {
      B.img = im;
      try { // 풍경에서 빛깔 읽기: 위쪽 하늘, 아래쪽 땅
        const cv = document.createElement('canvas'); cv.width = 24; cv.height = 12; const x = cv.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0, 24, 12); const d = x.getImageData(0, 0, 24, 12).data;
        const avg = (y0, y1) => { let r = 0, g = 0, b = 0, n = 0; for (let y = y0; y < y1; y++) for (let i = 0; i < 24; i++) { const o = (y * 24 + i) * 4; r += d[o]; g += d[o + 1]; b += d[o + 2]; n++; } return [r / n, g / n, b / n]; };
        const sky = avg(0, 4), land = avg(9, 12), lum = (sky[0] * 0.3 + sky[1] * 0.6 + sky[2] * 0.1) / 255;
        let top = sky, best = 0; for (let i = 0; i < 24 * 5; i++) { const o = i * 4, l = d[o] * 0.3 + d[o + 1] * 0.6 + d[o + 2] * 0.1; if (l > best) { best = l; top = [d[o], d[o + 1], d[o + 2]]; } }
        B.tone = { sky: hex(...sky), ground: hex(...land), light: mix(hex(...top), '#fff4e0', 0.35), dark: clamp(night ? 0.85 : 1 - lum * 1.5, 0, 0.9) };
      } catch { /* 못 읽으면 기본 빛깔 */ }
      B.ready = true; paint(); B.onready?.();
    };
    im.src = url;
  }
  const build = (w, h) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'), k = w / SW, T = B.tone, G = GROUND[B.ground] ?? GROUND.grass, rnd = mkRnd(B.seed);
    c.scale(k, k);
    const hz = GY - 30; // 싸움터 땅이 시작되는 높이
    // 하늘과 먼 풍경
    let g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, mix(T.sky, '#0c0e18', 0.3 + T.dark * 0.3)); g.addColorStop(1, mix(T.sky, '#f0e4d0', 0.16 * (1 - T.dark)));
    c.fillStyle = g; c.fillRect(0, 0, SW, SH);
    if (B.img) {
      // 작게 줄였다 늘려 흐리게: 뒤 풍경은 초점 밖에 둔다
      const sm = document.createElement('canvas'), sw = 200, sh = Math.round(sw * B.img.height / B.img.width); sm.width = sw; sm.height = sh;
      sm.getContext('2d').drawImage(B.img, 0, 0, sw, sh);
      const dw = SW * 1.12, dh = dw * B.img.height / B.img.width, dy = hz + 10 - dh * 0.8;
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(sm, (SW - dw) / 2, dy, dw, dh);
      if (dy > 0) { g = c.createLinearGradient(0, 0, 0, dy + 14); g.addColorStop(0, mix(T.sky, '#0c0e18', 0.3 + T.dark * 0.3)); g.addColorStop(0.7, mix(T.sky, '#0c0e18', 0.2)); g.addColorStop(1, rgba(T.sky, 0)); c.fillStyle = g; c.fillRect(0, 0, SW, dy + 14); }
    }
    if (B.venue) venueBack(c, B, hz, rnd);
    if (B.terrain) terrainBack(c, B, hz, rnd);
    // 뒤 풍경을 살짝 눌러 인물이 서게
    c.fillStyle = rgba('#12101a', 0.2 + T.dark * 0.14); c.fillRect(0, 0, SW, hz + 4);
    g = c.createLinearGradient(0, hz - 46, 0, hz + 6); g.addColorStop(0, rgba(T.light, 0)); g.addColorStop(1, rgba(mix(T.light, T.sky, 0.5), 0.3 * (1 - T.dark * 0.6))); c.fillStyle = g; c.fillRect(0, hz - 46, SW, 52);
    // 땅: 먼 데는 풍경의 땅빛, 가까울수록 어둡게
    const base = G.tint ? mix(G.tint, T.ground, 0.35) : T.ground, lit = mix(base, T.light, 0.22 * (1 - T.dark)), near = mix(base, '#0c0a10', 0.5 + T.dark * 0.2);
    g = c.createLinearGradient(0, hz, 0, SH); g.addColorStop(0, mix(lit, T.sky, 0.3)); g.addColorStop(0.2, lit); g.addColorStop(0.62, mix(base, '#0c0a10', 0.22 + T.dark * 0.2)); g.addColorStop(1, near);
    c.fillStyle = g; c.beginPath(); c.moveTo(0, hz + 2); for (let x = 0; x <= SW; x += 32) c.lineTo(x, hz + Math.sin(x * 0.013 + B.seed) * 2.4); c.lineTo(SW, SH); c.lineTo(0, SH); c.closePath(); c.fill();
    // 땅결: 멀수록 촘촘하고 옅게
    const depth = (y) => clamp((y - hz) / (SH - hz));
    if (G.slab) { c.strokeStyle = rgba('#0c0a10', 0.3); for (let i = 0; i < 9; i++) { const q = (i / 8) ** 1.7, y = hz + 4 + q * (SH - hz - 4); c.lineWidth = 0.6 + q * 1.2; c.beginPath(); c.moveTo(0, y); c.lineTo(SW, y); c.stroke(); const n = 9 - i * 0.5; for (let j = 0; j <= n; j++) { const x0 = 320 + (j - n / 2 + (i % 2) * 0.5) * (40 + q * 120); const q2 = ((i + 1) / 8) ** 1.7, y2 = hz + 4 + q2 * (SH - hz - 4); c.beginPath(); c.moveTo(x0, y); c.lineTo(320 + (x0 - 320) * (40 + q2 * 120) / (40 + q * 120), y2); c.stroke(); } } c.fillStyle = rgba(T.light, 0.05); for (let i = 0; i < 18; i++) { const y = hz + 6 + rnd() * (SH - hz - 8), d = depth(y); c.fillRect(rnd() * SW, y, 20 + d * 50, 1 + d * 2); } }
    else if (G.plank) { c.strokeStyle = rgba('#0c0a10', 0.34); for (let i = 0; i < 8; i++) { const q = (i / 7) ** 1.6, y = hz + 4 + q * (SH - hz - 4); c.lineWidth = 0.6 + q * 1.4; c.beginPath(); c.moveTo(0, y); c.lineTo(SW, y); c.stroke(); for (let j = 0; j < 5; j++) { const x = rnd() * SW; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 4 + q * 16); c.stroke(); } } }
    else {
      for (let i = 0; i < 46; i++) { const y = hz + 5 + rnd() ** 1.5 * (SH - hz - 6), d = depth(y), x = rnd() * SW; c.fillStyle = rgba(rnd() < 0.5 ? '#0c0a10' : T.light, 0.05 + rnd() * 0.07); c.beginPath(); c.ellipse(x, y, 14 + d * 46 + rnd() * 20, 1 + d * 3.4, 0, 0, 6.3); c.fill(); }
      if (G.stone) for (let i = 0; i < 12 * G.stone; i++) { const y = hz + 8 + rnd() * (SH - hz - 12), d = depth(y), x = rnd() * SW, r = 1.4 + d * 4; c.fillStyle = mix(base, '#0c0a10', 0.4); c.beginPath(); c.ellipse(x, y, r * 1.5, r * 0.8, 0, 0, 6.3); c.fill(); c.fillStyle = rgba(T.light, 0.22); c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.3, r * 0.9, r * 0.3, 0, 0, 6.3); c.fill(); }
      if (G.tuft) { c.lineCap = 'round'; for (let i = 0; i < 70; i++) { const y = hz + 5 + rnd() ** 1.3 * (SH - hz - 4), d = depth(y), x = rnd() * SW, h = 2 + d * 9; c.strokeStyle = rgba(rnd() < 0.3 ? mix(base, T.light, 0.4) : mix(base, '#0c0a10', 0.45), 0.7); c.lineWidth = 0.7 + d * 1.1; for (const dx of [-1, 0, 1]) { c.beginPath(); c.moveTo(x + dx * (1 + d * 2), y); c.quadraticCurveTo(x + dx * (1.6 + d * 3), y - h * 0.6, x + dx * (2.4 + d * 5) + 1, y - h * (0.8 + rnd() * 0.3)); c.stroke(); } } }
      if (G.drift) { for (let i = 0; i < 14; i++) { const y = hz + 6 + rnd() * (SH - hz - 8), d = depth(y); c.fillStyle = rgba('#ffffff', 0.1 + rnd() * 0.1); c.beginPath(); c.ellipse(rnd() * SW, y, 30 + d * 70, 2 + d * 4, 0, 0, 6.3); c.fill(); } }
    }
    // 싸우는 자리에 고이는 빛
    g = c.createRadialGradient(320, GY - 4, 10, 320, GY - 4, 300); g.addColorStop(0, rgba(T.light, 0.16 * (1 - T.dark * 0.5))); g.addColorStop(1, rgba(T.light, 0)); c.fillStyle = g; c.save(); c.translate(0, GY - 4); c.scale(1, 0.16); c.translate(0, -(GY - 4)); c.fillRect(0, GY - 400, SW, 800); c.restore();
    if (T.dark > 0.5) { c.fillStyle = rgba('#080c20', (T.dark - 0.5) * 0.5); c.fillRect(0, 0, SW, SH); }
    return cv;
  };
  /** 배경을 그린다 (한 번 그려 두고 다시 쓴다) */
  B.draw = (c, w, h) => {
    if (!B.layer || B.layer.width !== w) B.layer = build(w, h);
    c.drawImage(B.layer, 0, 0, SW, SH);
  };
  /** 앞을 덮는 것: 양 끝과 위아래를 어둡게 */
  B.front = (c) => {
    let g = c.createLinearGradient(0, 0, SW, 0);
    g.addColorStop(0, 'rgba(10,8,12,.62)'); g.addColorStop(0.17, 'rgba(10,8,12,0)'); g.addColorStop(0.83, 'rgba(10,8,12,0)'); g.addColorStop(1, 'rgba(10,8,12,.62)');
    c.fillStyle = g; c.fillRect(-20, -20, SW + 40, SH + 40);
    g = c.createLinearGradient(0, 0, 0, SH); g.addColorStop(0, 'rgba(10,8,12,.4)'); g.addColorStop(0.24, 'rgba(10,8,12,0)'); g.addColorStop(0.9, 'rgba(10,8,12,0)'); g.addColorStop(1, 'rgba(10,8,12,.5)');
    c.fillStyle = g; c.fillRect(-20, -20, SW + 40, SH + 40);
  };
  return B;
}
