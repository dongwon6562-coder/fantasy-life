// 철과 재앙이 풍경에 남기는 것: 장마, 가뭄, 큰물, 혹한, 메뚜기 떼, 땅울림.
// scene.js가 부른다. 장소의 배치는 건드리지 않고, 빛깔(tweak) · 날씨(weatherFor) · 땅 위의 흔적(land) · 공기(air)만 바꾼다.
//   sceneImage({ ..., calamity: 'drought' | 'flood' | 'frost' | 'locust' | 'quake' })
// 장마('monsoon')는 재앙이 아니라 철이다. 7월에 비가 오면 scene.js가 스스로 고른다.
import { W, H, HZ, hash, fbm1, mixh, rgba, puff, mist } from './sceneKit.js';

export const CALAMITIES = { drought: '가뭄', flood: '큰물', frost: '혹한', locust: '메뚜기 떼', quake: '땅울림', monsoon: '장마' };

/** 재앙이 그날의 때와 날씨를 누른다 */
export function weatherFor(kind, tod, weather) {
  if (kind === 'drought') return { tod: tod === 'dawn' ? 'dawn' : 'day', weather: 'clear' };
  if (kind === 'flood') return { tod, weather: weather === 'storm' ? 'storm' : 'rain' };
  if (kind === 'frost') return { tod, weather: weather === 'blizzard' ? 'blizzard' : weather === 'clear' ? 'clear' : 'snow' };
  if (kind === 'locust') return { tod: tod === 'night' ? 'dusk' : tod, weather: weather === 'rain' || weather === 'storm' || weather === 'snow' ? 'cloudy' : weather };
  return { tod, weather };
}

/** 빛깔을 바꾼다 (paletteOf가 돌려준 P를 고친다) */
export function tweak(P, kind) {
  const tone = (c, t) => { for (const k of ['grass', 'grass2', 'hill']) P[k] = mixh(P[k], c, t); P.field = P.field.map((f) => mixh(f, c, t)); };
  if (kind === 'drought' && !P.snow) {
    tone('#b89a5c', 0.62); P.field = P.field.map((c, i) => mixh(c, i % 2 ? '#8a6e48' : '#b09458', 0.5));
    P.leaf = P.leaf && mixh(P.leaf, '#8a7440', 0.6); P.conifer = P.conifer && mixh(P.conifer, '#5a5234', 0.35);
    P.water = mixh(P.water, '#8a7a58', 0.55); P.soil = '#8a6e4a'; P.sheaves = false; P.blossom = 0;
  }
  if (kind === 'flood') { P.water = mixh(P.water, '#7a6a4c', 0.7); if (!P.snow) tone('#5a6444', 0.3); P.sheaves = false; }
  if (kind === 'monsoon') { P.water = mixh(P.water, '#6e6a54', 0.45); tone('#4e6a40', 0.25); }
  if (kind === 'frost' && !P.snow) { tone('#d8dee2', 0.5); P.leaf = P.leaf && mixh(P.leaf, '#b8c0c0', 0.5); P.water = mixh(P.water, '#b4c4d0', 0.6); P.blossom = 0; P.sheaves = false; }
  if (kind === 'locust' && !P.snow) { tone('#8a744c', 0.5); P.field = P.field.map((c) => mixh(c, '#7a6040', 0.6)); P.leaf = P.leaf && mixh(P.leaf, '#6a5a3c', 0.7); P.sheaves = false; P.blossom = 0; }
  return P;
}

/** 땅 위의 흔적. 땅 그림(L)에, 빛을 얹기 전에 그린다. 앞쪽 빈 땅에만 손댄다. */
export function land(L, kind, e) {
  const k = e.k, r = (i, s) => hash(i * 7 + s, k % 97 + 300);
  L.save(); L.globalCompositeOperation = 'source-atop';
  const y0 = H * 0.72;
  if (kind === 'drought' || kind === 'quake') {
    const big = kind === 'quake';
    if (!big) for (let i = 0; i < 16; i++) { L.fillStyle = 'rgba(222,198,146,.2)'; L.beginPath(); L.ellipse(r(i, 1) * W, y0 + r(i, 2) * (H - y0), 60 + r(i, 3) * 120, 8 + r(i, 4) * 14, 0, 0, 7); L.fill(); }
    // 갈라진 땅: 가지를 치며 뻗는 금
    const n = big ? 4 : 60;
    for (let i = 0; i < n; i++) {
      let x = big ? 40 + i * 280 + r(i, 5) * 120 : r(i, 5) * W, y = big ? H * 0.7 + r(i, 6) * 90 : y0 + r(i, 6) * (H - y0 - 10), a = big ? (r(i, 7) - 0.5) * 0.8 : r(i, 7) * 6.3;
      const segs = big ? 22 : 5 + Math.floor(r(i, 8) * 5), depth = (y - y0) / (H - y0);
      L.strokeStyle = big ? 'rgba(24,16,12,.8)' : `rgba(52,32,18,${0.5 + depth * 0.35})`; L.lineWidth = big ? 2.2 + depth * 2.4 : 1 + depth * 1.6; L.lineJoin = 'round'; L.beginPath(); L.moveTo(x, y);
      const pts = [[x, y]];
      for (let j = 0; j < segs; j++) { a += (r(i * 31 + j, 9) - 0.5) * (big ? 1.5 : 1.6); if (big) a *= 0.8; const len = big ? 10 + r(i * 31 + j, 10) * 14 : 8 + r(i * 31 + j, 10) * 16 * (0.5 + depth); x += Math.cos(a) * len; y += Math.sin(a) * len * (big ? 0.5 : 0.4); L.lineTo(x, y); pts.push([x, y]); }
      L.stroke();
      if (big) { L.strokeStyle = 'rgba(190,170,130,.35)'; L.lineWidth = 1.2; L.beginPath(); pts.forEach(([px, py], j) => L[j ? 'lineTo' : 'moveTo'](px, py - 2.4)); L.stroke(); for (let j = 3; j < pts.length; j += 5) { const [bx, by] = pts[j]; L.strokeStyle = 'rgba(24,16,12,.7)'; L.lineWidth = 1.4; L.beginPath(); L.moveTo(bx, by); L.lineTo(bx + (r(i + j, 12) - 0.5) * 50, by + (r(i + j, 13) - 0.3) * 18); L.stroke(); } }
      else if (r(i, 11) < 0.6) { const [bx, by] = pts[Math.floor(pts.length / 2)]; L.beginPath(); L.moveTo(bx, by); L.lineTo(bx + (r(i, 12) - 0.5) * 30, by + 4 + r(i, 13) * 6); L.stroke(); }
    }
  }
  if (kind === 'flood') {
    // 흙탕물이 앞쪽 낮은 땅을 덮는다
    const top = (x) => H * 0.66 + fbm1(x / 180 + k, 3) * 16;
    const g = L.createLinearGradient(0, H * 0.64, 0, H); g.addColorStop(0, 'rgba(122,108,80,.9)'); g.addColorStop(1, 'rgba(84,76,60,.96)');
    L.fillStyle = g; L.beginPath(); L.moveTo(0, H); for (let x = 0; x <= W; x += 12) L.lineTo(x, top(x)); L.lineTo(W, H); L.fill();
    L.strokeStyle = 'rgba(214,206,186,.5)'; L.lineWidth = 1.4; L.beginPath(); for (let x = 0; x <= W; x += 12) L[x ? 'lineTo' : 'moveTo'](x, top(x)); L.stroke();
    for (let i = 0; i < 70; i++) { const x = r(i, 1) * W, y = H * 0.7 + r(i, 2) * (H * 0.3), w = 20 + r(i, 3) * 70; L.strokeStyle = `rgba(206,198,178,${0.1 + r(i, 4) * 0.2})`; L.lineWidth = 1; L.beginPath(); L.moveTo(x, y); L.quadraticCurveTo(x + w / 2, y - 2, x + w, y); L.stroke(); }
    // 반쯤 잠긴 울타리 말뚝, 떠내려가는 것들
    for (let i = 0; i < 9; i++) { const x = 140 + i * 34 + r(i, 5) * 8, y = H * 0.8 + i * 1.5; L.fillStyle = '#2e241a'; L.fillRect(x, y - 12 - r(i, 6) * 6, 3, 13); L.fillStyle = 'rgba(214,206,186,.35)'; L.fillRect(x - 3, y, 9, 1); }
    for (let i = 0; i < 6; i++) { const x = 300 + r(i, 7) * 800, y = H * 0.74 + r(i, 8) * 100; L.save(); L.translate(x, y); L.rotate((r(i, 9) - 0.5) * 0.5); L.fillStyle = ['#4a3826', '#3a2c20', '#5a4630'][i % 3]; L.fillRect(-14, -2, 28 + r(i, 10) * 14, 4); L.restore(); }
  }
  if (kind === 'monsoon') {
    // 고인 물과 불어난 도랑
    for (let i = 0; i < 40; i++) { const d = r(i, 1), x = r(i, 2) * W, y = HZ + 90 + d * (H - HZ - 96), w = 24 + d * 90; L.fillStyle = 'rgba(196,206,214,.26)'; L.beginPath(); L.ellipse(x, y, w, 1.6 + d * 4, 0, 0, 7); L.fill(); L.fillStyle = 'rgba(60,70,80,.16)'; L.beginPath(); L.ellipse(x, y + 1.2, w * 0.9, 1 + d * 3, 0, 0, 7); L.fill(); }
    L.fillStyle = 'rgba(30,40,46,.16)'; L.fillRect(0, 0, W, H);
  }
  if (kind === 'frost') {
    // 눈더미: 앞쪽을 덮은 높은 눈
    const top = (x) => H * 0.8 - fbm1(x / 140 + k, 3) * 26 - Math.max(0, 1 - Math.abs(x - 200) / 260) * 20;
    L.fillStyle = '#eef1f4'; L.beginPath(); L.moveTo(0, H); for (let x = 0; x <= W; x += 10) L.lineTo(x, top(x)); L.lineTo(W, H); L.fill();
    L.fillStyle = 'rgba(150,176,206,.3)'; L.beginPath(); L.moveTo(0, H); for (let x = 0; x <= W; x += 10) L.lineTo(x, top(x) + 16 + fbm1(x / 60, 2) * 10); L.lineTo(W, H); L.fill();
    L.fillStyle = 'rgba(190,210,235,.16)'; L.fillRect(0, 0, W, H);
  }
  L.restore();
}

/** 공기: 날씨까지 다 그린 뒤 맨 위에 얹는다 */
export function air(ctx, kind, e) {
  const k = e.k, S = e.S, night = S.tod === 'night', r = (i, s) => hash(i * 13 + s, k % 89 + 500);
  if (kind === 'drought') {
    ctx.fillStyle = 'rgba(232,190,110,.13)'; ctx.fillRect(0, 0, W, H);
    mist(ctx, HZ + 4, 60, '#f0d8a0', 0.34); mist(ctx, HZ + 60, 80, '#e8cc98', 0.14);
    if (!night && S.sun) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; puff(ctx, S.sun[0], S.sun[1], 240, 180, '#fff0c0', 0.2); ctx.restore(); }
    for (let i = 0; i < 9; i++) puff(ctx, r(i, 1) * W, HZ + 110 + r(i, 2) * 120, 90 + r(i, 3) * 100, 10 + r(i, 4) * 10, '#d8c090', 0.2);
  }
  if (kind === 'flood' || kind === 'monsoon') {
    // 굵고 빽빽한 빗줄기
    mist(ctx, HZ, 100, night ? '#39424e' : '#8a949c', 0.4);
    for (const [n, len, a, lw] of [[500, 22, 0.2, 1], [200, 40, 0.3, 1.6]]) { ctx.strokeStyle = night ? `rgba(150,162,184,${a})` : `rgba(220,226,232,${a})`; ctx.lineWidth = lw; ctx.beginPath(); for (let i = 0; i < n; i++) { const x = r(i, n) * (W + 200), y = r(i, n + 1) * H, l = len * (0.7 + r(i, n + 2) * 0.6); ctx.moveTo(x, y); ctx.lineTo(x - l * 0.4, y + l); } ctx.stroke(); }
    ctx.fillStyle = 'rgba(40,48,58,.14)'; ctx.fillRect(0, 0, W, H);
  }
  if (kind === 'frost') {
    mist(ctx, HZ + 30, 120, night ? '#56647c' : '#e8eef4', 0.3);
    // 가장자리에 낀 서리
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300); g.addColorStop(0, 'rgba(236,244,252,.5)'); g.addColorStop(1, 'rgba(236,244,252,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
  }
  if (kind === 'locust') {
    // 하늘을 가린 떼: 띠처럼 몰려 흐른다
    ctx.fillStyle = 'rgba(70,58,36,.16)'; ctx.fillRect(0, 0, W, H);
    for (let b = 0; b < 3; b++) { const yb = 70 + b * 110, amp = 50 + b * 16;
      for (let i = 0; i < 10; i++) puff(ctx, i * 130 + r(i + b * 20, 1) * 60, yb + Math.sin(i * 0.9 + b + k) * amp, 150, 40 + r(i, 2) * 20, '#3a301c', 0.13);
      ctx.fillStyle = 'rgba(34,28,16,.7)';
      for (let i = 0; i < 900; i++) { const x = r(i + b * 1000, 3) * W, y = yb + Math.sin(x / 130 * 0.9 + b + k) * amp + (r(i + b * 1000, 4) - 0.5) * 110, near = b === 2, s = near ? 1.6 + r(i, 5) * 1.8 : 0.8 + r(i, 5); ctx.fillRect(x, y, s * 1.6, s * 0.7); }
    }
  }
  if (kind === 'quake') {
    for (let i = 0; i < 10; i++) puff(ctx, r(i, 1) * W, HZ + 60 + r(i, 2) * 150, 120 + r(i, 3) * 140, 18 + r(i, 4) * 16, '#b8a888', 0.26);
    for (let i = 0; i < 3; i++) { const x = 260 + i * 300 + r(i, 5) * 120; for (let j = 0; j < 9; j++) puff(ctx, x + j * 9 * (S.dir ?? 1), HZ + 60 - j * 24, 20 + j * 7, 16 + j * 4, '#6a625c', 0.3 - j * 0.028); }
    ctx.fillStyle = 'rgba(150,130,100,.12)'; ctx.fillRect(0, 0, W, H);
  }
}
