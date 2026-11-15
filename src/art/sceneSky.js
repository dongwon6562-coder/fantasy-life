// 하늘과 빛: 때(새벽·낮·해 질 녘·밤)와 날씨에 따른 하늘, 구름, 해와 달, 그리고 땅에 얹는 빛과 날씨.
import { W, H, HZ, hash, mixh, rgba, dull, puff, mist, vgrad } from './sceneKit.js';

const SKIES = {
  day: { top: '#56799c', mid: '#9fb9c6', low: '#e0dcc6', sun: [830, 62], sunC: '#fff7e0', glow: '#fff0cc', lit: '#fbf7ec', sh: '#9aa8b6', dir: 1 },
  dawn: { top: '#3a4a74', mid: '#a08a9c', low: '#f2c898', sun: [965, HZ - 26], sunC: '#ffe0aa', glow: '#ffcf96', lit: '#f8d2b6', sh: '#756f8e', dir: 1 },
  dusk: { top: '#232646', mid: '#86506a', low: '#ea9858', sun: [228, HZ - 22], sunC: '#ffcb8c', glow: '#fba864', lit: '#f4a472', sh: '#544566', dir: -1 },
  night: { top: '#060a18', mid: '#111a34', low: '#27344e', sun: null, lit: '#4c5876', sh: '#161c30', dir: -1 },
};

/** 그 달의 하늘 빛깔과 빛의 방향을 정한다 */
export function skyOf(tod, weather, biome, k) {
  const S = { ...SKIES[tod] };
  const storm = weather === 'storm', blizzard = weather === 'blizzard';
  const overcast = weather !== 'clear' && weather !== 'wind';
  const heavy = weather === 'rain' || weather === 'snow' || storm || blizzard;
  if (overcast) {
    const grey = tod === 'night' ? '#1b2029' : heavy ? '#7f868c' : '#989c9e', t = tod === 'night' ? 0.45 : heavy ? 0.72 : 0.55;
    for (const key of ['top', 'mid', 'low']) S[key] = mixh(S[key], grey, t);
    S.lit = mixh(S.lit, tod === 'night' ? '#39414f' : '#c4c6c4', 0.6); S.sh = mixh(S.sh, tod === 'night' ? '#11151d' : '#6a7078', 0.6);
  }
  if (biome === 'blight' || biome === 'ash') { for (const key of ['top', 'mid', 'low']) S[key] = mixh(S[key], tod === 'night' ? '#2a1418' : '#8a5a48', biome === 'ash' ? 0.2 : 0.32); S.sh = mixh(S.sh, '#4a2c30', 0.4); }
  if (biome === 'cold') for (const key of ['top', 'mid', 'low']) S[key] = mixh(S[key], tod === 'night' ? '#0c1626' : '#c4d0d8', 0.16);
  if (storm) { for (const key of ['top', 'mid', 'low']) S[key] = mixh(S[key], tod === 'night' ? '#0c0e14' : '#3c424c', key === 'low' ? 0.3 : 0.55); S.sh = mixh(S.sh, '#22262e', 0.5); S.lit = mixh(S.lit, '#8a9098', 0.4); S.bolt = 180 + hash(k, 31) * 840; }
  if (blizzard) for (const key of ['top', 'mid', 'low']) S[key] = mixh(S[key], tod === 'night' ? '#2a303c' : '#c8ccd0', 0.5);
  S.overcast = overcast; S.heavy = heavy; S.tod = tod; S.weather = weather; S.storm = storm; S.blizzard = blizzard; S.windy = weather === 'wind' || storm || blizzard;
  S.aurora = biome === 'cold' && tod === 'night' && !overcast && hash(k, 37) < 0.7;
  S.haze = mixh(S.low, S.mid, 0.3);
  if (tod === 'night') { S.moon = [150 + hash(k, 3) * 900, 46 + hash(k, 4) * 62]; S.dir = S.moon[0] > W / 2 ? 1 : -1; S.phase = hash(k, 5); }
  return S;
}

function cumulus(ctx, cx, cy, w, S, R, a) {
  const n = 9 + Math.floor(w / 16);
  for (let i = 0; i < n; i++) {
    const t = R() - 0.5, r = w * (0.11 + R() * 0.13) * (1 - Math.abs(t) * 0.7);
    puff(ctx, cx + t * w, cy + r * 0.3 + R() * 4, r * 1.7, r * 0.66, S.sh, a * 0.6);
  }
  for (let i = 0; i < n; i++) {
    const t = R() - 0.5, r = w * (0.08 + R() * 0.13) * (1 - Math.abs(t) * 0.8);
    puff(ctx, cx + t * w * 0.86 + S.dir * r * 0.25, cy - r * 0.55 - R() * w * 0.05, r * 1.35, r * 0.82, S.lit, a * 0.72);
  }
  puff(ctx, cx, cy + w * 0.055, w * 0.62, w * 0.035, S.sh, a * 0.4);
}

export function paintSky(ctx, S, R, k) {
  ctx.fillStyle = vgrad(ctx, 0, HZ + 30, [[0, S.top], [0.55, S.mid], [1, S.low]]);
  ctx.fillRect(0, 0, W, H);
  if (S.tod === 'night') {
    if (!S.overcast) {
      for (let i = 0; i < 260; i++) {
        const x = R() * W, y = R() * HZ * 0.92, a = (0.25 + R() * 0.75) * (1 - y / HZ) ** 0.7, big = R() < 0.06;
        ctx.fillStyle = rgba(R() < 0.2 ? '#cfd8f0' : '#efe8d0', a); ctx.fillRect(x, y, big ? 1.9 : 1.1, big ? 1.9 : 1.1);
      }
      // 은하수: 비스듬한 옅은 띠
      for (let i = 0; i < 46; i++) { const t = R(), x = 180 + t * 900 + (R() - 0.5) * 80, y = 150 - t * 130 + (R() - 0.5) * 50; puff(ctx, x, y, 50 + R() * 60, 16 + R() * 20, '#8e9cc0', 0.045); }
    }
    const [mx, my] = S.moon, a = S.overcast ? 0.4 : 1;
    puff(ctx, mx, my, 120, 120, '#c8cce0', 0.2 * a);
    const m = document.createElement('canvas'); m.width = m.height = 40;
    const c = m.getContext('2d');
    c.fillStyle = '#ece6cc'; c.beginPath(); c.arc(20, 20, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(150,150,140,.35)'; c.beginPath(); c.arc(15, 16, 3.4, 0, 6.3); c.arc(24, 24, 2.6, 0, 6.3); c.arc(22, 13, 1.8, 0, 6.3); c.fill();
    if (S.phase < 0.75) { c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(20 + 6 + S.phase * 22, 18, 14.5, 0, Math.PI * 2); c.fill(); }
    ctx.globalAlpha = a; ctx.drawImage(m, mx - 20, my - 20); ctx.globalAlpha = 1;
  } else if (!S.heavy) {
    const [sx, sy] = S.sun, low = S.tod !== 'day', a = S.overcast ? 0.35 : 1;
    if (low) puff(ctx, sx, HZ - 6, 760, 120, S.glow, 0.55 * a);
    puff(ctx, sx, sy, low ? 300 : 210, low ? 220 : 210, S.glow, 0.6 * a);
    puff(ctx, sx, sy, 60, 60, S.sunC, 0.9 * a);
    if (!S.overcast) { ctx.fillStyle = S.sunC; ctx.beginPath(); ctx.arc(sx, sy, low ? 19 : 14, 0, Math.PI * 2); ctx.fill(); }
  }
  if (S.aurora) { // 북쪽 땅의 맑은 밤: 하늘에 드리운 빛의 장막
    ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < 3; b++) { const x0 = 120 + R() * 500, amp = 30 + R() * 30, base = 70 + b * 26 + R() * 20, len = 420 + R() * 300; for (let i = 0; i < 60; i++) { const t = i / 60, x = x0 + t * len, y = base + Math.sin(t * 5 + b * 2) * amp * 0.5 - t * 20; const f = Math.pow(Math.sin(t * Math.PI), 0.7); puff(ctx, x, y - 34, 14, (60 + Math.sin(t * 9 + b) * 22) * (0.4 + 0.6 * f), b === 1 ? '#7ad0b0' : '#5ac890', 0.085 * f); puff(ctx, x, y - 84, 12, 34, '#9a7ad0', 0.03 * f); } }
    ctx.globalCompositeOperation = 'source-over';
  }
  // 바람 센 날: 길게 찢긴 구름 줄
  if (S.weather === 'wind') for (let i = 0; i < 22; i++) { const x = R() * (W + 300) - 150, y = 14 + R() * 150, w = 260 + R() * 420; puff(ctx, x, y + (x - W / 2) * -0.02, w, 4 + R() * 7, i % 3 ? S.lit : S.sh, S.tod === 'night' ? 0.14 : 0.34); }
  // 높은 새털구름
  if (!S.overcast) for (let i = 0; i < 7; i++) { const x = R() * W, y = 18 + R() * 70, w = 120 + R() * 220; puff(ctx, x, y, w, 5 + R() * 6, S.lit, S.tod === 'night' ? 0.1 : 0.26); }
  // 뭉게구름 / 층구름
  if (S.overcast) {
    for (let i = 0; i < 26; i++) { const x = R() * (W + 300) - 150, y = 10 + R() * (HZ - 60), w = 240 + R() * 320; puff(ctx, x, y, w, 26 + R() * 34, i % 3 ? S.sh : S.lit, S.heavy ? 0.5 : 0.36); }
    for (let i = 0; i < 6; i++) cumulus(ctx, R() * W, 50 + R() * 110, 150 + R() * 200, S, R, 0.55);
    if (S.storm) {
      // 뇌우: 낮게 깔린 먹구름과 번개 한 줄기
      for (let i = 0; i < 30; i++) { const x = R() * (W + 300) - 150, y = R() * 120, w = 260 + R() * 340; puff(ctx, x, y, w, 40 + R() * 44, S.tod === 'night' ? '#06080c' : '#262b34', 0.5); }
      const bx = S.bolt; ctx.globalCompositeOperation = 'lighter'; puff(ctx, bx, 70, 420, 170, '#b8c4e8', 0.34); puff(ctx, bx, 110, 150, 150, '#dfe6ff', 0.3); ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#f2f5ff'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.beginPath(); let x = bx, y = 24; ctx.moveTo(x, y); const fork = [];
      while (y < HZ + 10) { x += (R() - 0.5) * 46; y += 12 + R() * 20; ctx.lineTo(x, y); if (R() < 0.22) fork.push([x, y]); } ctx.stroke();
      ctx.lineWidth = 1.1; for (const [fx, fy] of fork) { ctx.beginPath(); ctx.moveTo(fx, fy); let px = fx, py = fy; const d = R() < 0.5 ? -1 : 1; for (let j = 0; j < 4; j++) { px += d * (8 + R() * 18); py += 8 + R() * 14; ctx.lineTo(px, py); } ctx.stroke(); }
    }
  } else {
    const n = 3 + Math.floor(hash(k, 9) * 4);
    for (let i = 0; i < n; i++) cumulus(ctx, R() * (W + 100) - 50, 48 + R() * 105, 110 + R() * 200, S, R, 0.9);
    // 지평선 가까이 납작한 먼 구름
    for (let i = 0; i < 5; i++) cumulus(ctx, R() * W, HZ - 62 + R() * 30, 70 + R() * 90, S, R, 0.5);
  }
}

/** 땅 그림(L) 위에 때에 따른 빛을 얹는다. 땅이 그려진 곳에만 묻는다. */
export function gradeLand(L, S, plague) {
  L.globalCompositeOperation = 'source-atop';
  if (S.tod === 'night') {
    L.fillStyle = 'rgba(12,18,42,.7)'; L.fillRect(0, 0, W, H);
    const [mx] = S.moon, g = L.createLinearGradient(mx - 500, 0, mx + 500, 0);
    g.addColorStop(0, 'rgba(120,140,190,0)'); g.addColorStop(0.5, `rgba(120,140,190,${S.overcast ? 0.04 : 0.1})`); g.addColorStop(1, 'rgba(120,140,190,0)');
    L.fillStyle = g; L.fillRect(0, 0, W, H);
  } else if (S.tod === 'dusk' || S.tod === 'dawn') {
    const warm = S.tod === 'dusk' ? '236,124,60' : '244,176,122', cool = S.tod === 'dusk' ? '52,40,92' : '70,82,124';
    const sx = S.sun[0], g = L.createLinearGradient(sx, 0, sx > W / 2 ? 0 : W, 0), k = S.overcast ? 0.5 : 1;
    g.addColorStop(0, `rgba(${warm},${0.3 * k})`); g.addColorStop(1, `rgba(${cool},${0.36})`);
    L.fillStyle = g; L.fillRect(0, 0, W, H);
    L.fillStyle = vgrad(L, HZ - 40, H, [[0, 'rgba(20,16,40,0)'], [1, 'rgba(20,16,40,.3)']]); L.fillRect(0, 0, W, H);
  } else if (S.overcast) {
    L.fillStyle = S.storm ? 'rgba(38,44,56,.5)' : S.blizzard ? 'rgba(206,212,218,.34)' : S.heavy ? 'rgba(96,104,112,.3)' : 'rgba(120,124,128,.2)'; L.fillRect(0, 0, W, H);
  } else {
    // 맑은 낮: 해 쪽은 따뜻하게, 반대쪽은 조금 서늘하게
    const g = L.createLinearGradient(S.sun[0], 0, S.sun[0] > W / 2 ? 0 : W, 0);
    g.addColorStop(0, 'rgba(255,236,190,.1)'); g.addColorStop(1, 'rgba(70,90,130,.1)');
    L.fillStyle = g; L.fillRect(0, 0, W, H);
  }
  if (S.weather === 'rain' || S.storm) { // 젖은 땅: 낮은 곳에 고인 물빛
    L.fillStyle = S.tod === 'night' ? 'rgba(150,165,200,.16)' : 'rgba(222,228,234,.2)';
    for (let i = 0; i < 46; i++) { const d = hash(i, 51), x = hash(i, 52) * W, y = HZ + 70 + d * d * (H - HZ - 80), w = 14 + d * 60; L.beginPath(); L.ellipse(x, y, w, 1 + d * 2.6, 0, 0, Math.PI * 2); L.fill(); }
  }
  if (plague) { L.fillStyle = 'rgba(78,92,66,.24)'; L.fillRect(0, 0, W, H); }
  L.globalCompositeOperation = 'source-over';
}

/** 철마다 눈에 띄는 작은 것들: 봄의 꽃잎, 여름 밤의 반딧불과 한낮의 아지랑이, 가을과 이른 봄의 철새 */
function seasonal(ctx, S, R, o) {
  const m = o.month, night = S.tod === 'night', calm = !S.heavy && S.weather !== 'fog';
  if ((m === 4 || m === 5) && calm && !night && !o.snowy && S.weather !== 'wind') for (let i = 0; i < 44; i++) { const x = R() * W, y = HZ - 40 + R() * (H - HZ + 40); ctx.fillStyle = ['#f6e6e6', '#f2d6dc', '#fbf4ee'][i % 3]; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(x, y, 2.2, 1.3, R() * 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  if (m >= 6 && m <= 8 && calm && (night || S.tod === 'dusk')) { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 46; i++) { const x = R() * W, y = HZ + 90 + R() * (H - HZ - 100); puff(ctx, x, y, 7, 7, '#c8e86a', 0.3); puff(ctx, x, y, 2, 2, '#f2ffb0', 0.9); } ctx.globalCompositeOperation = 'source-over'; }
  if (m >= 6 && m <= 8 && S.tod === 'day' && S.weather === 'clear') { mist(ctx, HZ + 14, 34, '#fff2d0', 0.2); mist(ctx, HZ + 70, 50, '#fff6dc', 0.08); }
  if ((m === 10 || m === 11 || m === 3) && !night && !S.heavy && S.weather !== 'fog') { // 줄지어 나는 철새
    const n = 1 + Math.floor(R() * 2);
    for (let f = 0; f < n; f++) { const x0 = 200 + R() * 800, y0 = 40 + R() * 90, dir = m === 3 ? 1 : -1, sc = 0.7 + R() * 0.6; ctx.strokeStyle = 'rgba(30,28,34,.75)'; ctx.lineWidth = 1.2 * sc; ctx.beginPath(); for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, r = Math.ceil(i / 2), x = x0 - dir * r * 13 * sc, y = y0 + side * r * 6 * sc + r * 2; ctx.moveTo(x - 4 * sc, y - 1.6 * sc); ctx.quadraticCurveTo(x - 1.5 * sc, y - 3 * sc, x, y); ctx.quadraticCurveTo(x + 1.5 * sc, y - 3 * sc, x + 4 * sc, y - 1.6 * sc); } ctx.stroke(); }
  }
}

/** 다 그린 그림 위에 날씨를 얹는다 */
export function paintWeather(ctx, S, R, o = {}) {
  const night = S.tod === 'night';
  if (S.weather === 'fog') {
    const c = S.tod === 'dawn' ? '#ecd4c0' : S.tod === 'dusk' ? '#c8a8a0' : '#dcdedb';
    for (let i = 0; i < 4; i++) mist(ctx, HZ - 16 + i * 26, 40, c, 0.26 - i * 0.05);
    for (let i = 0; i < 26; i++) puff(ctx, R() * W, HZ - 10 + R() * 190, 120 + R() * 200, 10 + R() * 16, c, 0.13);
  }
  if (S.storm) {
    mist(ctx, HZ + 6, 90, mixh(S.low, '#5a626c', 0.6), 0.55);
    for (const [n, len, a, lw] of [[700, 12, 0.18, 0.8], [520, 22, 0.28, 1.1], [200, 38, 0.34, 1.5]]) {
      ctx.strokeStyle = night ? `rgba(150,162,190,${a})` : `rgba(206,214,224,${a})`; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = R() * (W + 300), y = R() * H, l = len * (0.7 + R() * 0.6); ctx.moveTo(x, y); ctx.lineTo(x - l * 0.62, y + l); }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter'; puff(ctx, S.bolt, HZ, 520, 200, '#aab8e0', 0.14); ctx.globalCompositeOperation = 'source-over';
  }
  if (S.blizzard) {
    const c = night ? '#4a5468' : '#e6e9ec';
    for (let i = 0; i < 5; i++) mist(ctx, HZ - 40 + i * 50, 70, c, 0.3);
    ctx.strokeStyle = night ? 'rgba(200,208,224,.3)' : 'rgba(250,251,252,.5)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < 900; i++) { const x = R() * (W + 200), y = R() * H, l = 6 + R() * 16; ctx.moveTo(x, y); ctx.lineTo(x - l, y + l * 0.34); }
    ctx.stroke();
    for (let i = 0; i < 260; i++) { const x = R() * W, y = R() * H, r = 1.6 + R() * 2.6; puff(ctx, x, y, r * 2.4, r * 1.3, '#f6f7f6', 0.5); }
    for (let i = 0; i < 14; i++) puff(ctx, R() * W, HZ + R() * 220, 260 + R() * 200, 26 + R() * 30, c, 0.22);
  }
  if (S.weather === 'wind') {
    // 바람에 쓸려 가는 것들: 가을엔 잎, 봄엔 꽃잎, 겨울엔 눈가루, 여름엔 흙먼지
    const m = o.month ?? 6, kind = o.snowy ? 'snow' : o.barren ? 'dust' : m >= 9 && m <= 11 ? 'leaf' : m >= 3 && m <= 5 ? 'petal' : 'dust';
    ctx.strokeStyle = night ? 'rgba(170,180,200,.1)' : 'rgba(236,236,228,.16)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 150; i++) { const x = R() * (W + 100), y = HZ - 60 + R() * (H - HZ + 60), l = 30 + R() * 90; ctx.moveTo(x, y); ctx.quadraticCurveTo(x - l * 0.5, y + 3 - R() * 8, x - l, y + 5); }
    ctx.stroke();
    const n = kind === 'dust' ? 0 : kind === 'snow' ? 200 : 150;
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = 60 + R() * (H - 60), c = kind === 'leaf' ? ['#b8742e', '#9a4a2a', '#c49a3a'][i % 3] : kind === 'petal' ? ['#f2dcdc', '#f6eee6', '#e8c4cc'][i % 3] : '#f2f4f4';
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25 + R() * 0.5); ctx.globalAlpha = night ? 0.5 : 0.9; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, kind === 'snow' ? 2.6 + R() * 3 : 3 + R() * 2.4, kind === 'snow' ? 0.8 : 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (kind === 'snow' || kind === 'dust') for (let i = 0; i < 12; i++) puff(ctx, R() * W, HZ + 60 + R() * 180, 200 + R() * 160, 8 + R() * 10, kind === 'snow' ? '#f0f2f2' : '#cbb894', 0.16);
  }
  if (S.weather === 'rain') {
    mist(ctx, HZ + 6, 70, mixh(S.low, '#8a9098', 0.5), 0.4);
    for (const [n, len, a, lw] of [[520, 9, 0.16, 0.8], [360, 15, 0.26, 1], [120, 26, 0.3, 1.3]]) {
      ctx.strokeStyle = night ? `rgba(150,162,184,${a})` : `rgba(214,220,226,${a})`; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = R() * (W + 120), y = R() * H, l = len * (0.7 + R() * 0.6); ctx.moveTo(x, y); ctx.lineTo(x - l * 0.28, y + l); }
      ctx.stroke();
    }
  }
  if (S.weather === 'snow') {
    mist(ctx, HZ + 4, 80, night ? '#3a4458' : '#dfe3e6', 0.36);
    for (let i = 0; i < 620; i++) {
      const x = R() * W, y = R() * H, near = R() < 0.12, r = near ? 2 + R() * 2.2 : 0.6 + R() * 1.4;
      if (near) puff(ctx, x, y, r * 1.6, r * 1.6, '#f4f5f2', 0.55); else { ctx.fillStyle = `rgba(244,245,240,${0.35 + R() * 0.5})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  if (o.leaves && S.weather !== 'rain') {
    for (let i = 0; i < 46; i++) {
      const x = R() * W, y = R() * H;
      ctx.fillStyle = ['#b8742e', '#9a4a2a', '#c49a3a'][Math.floor(R() * 3)];
      ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  if (o.embers) for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * H; puff(ctx, x, y, 2.4, 2.4, R() < 0.5 ? '#ff9a50' : '#d0584a', 0.35 + R() * 0.4); }
  if (o.month && !o.barren) seasonal(ctx, S, R, o);
  // 해 쪽에서 번지는 빛
  if (S.sun && !S.overcast) { ctx.globalCompositeOperation = 'lighter'; puff(ctx, S.sun[0], S.sun[1], S.tod === 'day' ? 420 : 560, S.tod === 'day' ? 300 : 260, S.glow, S.tod === 'day' ? 0.1 : 0.2); ctx.globalCompositeOperation = 'source-over'; }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.32, W / 2, H * 0.55, W * 0.66);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(14,10,8,.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
export { dull };
