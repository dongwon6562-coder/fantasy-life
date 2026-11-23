// 38단계: 풍경의 빛을 더 극적으로.
//   rimLight  해·달을 등진 능선·지붕·나무 윤곽에 얇은 빛 테 (역광)
//   sunRays   새벽·해 질 녘, 구름 사이로 내리꽂히는 빛줄기와 지평선 눈부심
//   wetGround 비 오는 날 젖은 땅: 웅덩이에 비친 하늘과 집, 길게 늘어지는 창 불빛
//   fogBanks  안개: 지평선부터 겹겹이 깔리는 안개 둑. 먼 곳은 묻히고 앞은 걷힌다. 해 쪽은 빛을 머금는다
//   nearFrame 앞쪽 틀: 그림 아래 양쪽에 짙은 풀숲·바위·가지 (깊이 층)
// 모두 큰 캔버스 한두 번 덧그리기라 폰에서도 몇 ms 안에 끝난다.
import { W, H, HZ, hash, rgba, mixh, puff, mist, fbm1, clamp } from './sceneKit.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const low = (S) => S.tod === 'dawn' || S.tod === 'dusk';

/** 역광 테: 땅 그림(land)의 하늘 쪽 윤곽에 빛을 얹는다. 해가 낮을수록, 해에 가까울수록 밝다. */
export function rimLight(ctx, land, S) {
  if (S.heavy || S.weather === 'fog') return;
  const night = S.tod === 'night', src = night ? S.moon : S.sun;
  if (!src) return;
  const k = night ? (S.overcast ? 0 : 0.35) : low(S) ? (S.overcast ? 0.45 : 1) : S.overcast ? 0 : 0.4;
  if (k <= 0) return;
  // 반 크기로 계산한다(빠르고, 테가 조금 번져 더 자연스럽다)
  const w = W / 2, h = H / 2, [sx, sy] = src, c = mk(w, h), x = c.getContext('2d');
  const color = night ? '#b8c8f0' : S.tod === 'dusk' ? '#ffb070' : S.tod === 'dawn' ? '#ffd2a0' : '#fff4d8';
  x.drawImage(land, 0, 0, w, h);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, w, h);
  // 빛을 등진 쪽으로 밀어 낸 그림을 지우면, 빛을 향한 가장자리만 남는다
  const dx = clamp((W / 2 - sx) / 300, -1, 1) * 1.1, dy = 1.4;
  x.globalCompositeOperation = 'destination-out'; x.drawImage(land, dx, dy, w, h);
  // 해에 가까울수록 밝게, 앞쪽 땅(지평선 아래 깊은 곳)은 덜
  x.globalCompositeOperation = 'destination-in';
  const cy = Math.max(sy, HZ - 40) / 2, g = x.createRadialGradient(sx / 2, cy, 20, sx / 2, cy, w * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.3, 'rgba(0,0,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,.04)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 * k;
  ctx.drawImage(c, 0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  c.width = c.height = 0;
}

/** 새벽·해 질 녘의 빛줄기. 맑거나 구름이 조금 낀 날, 해에서 부채꼴로 퍼진다. */
export function sunRays(ctx, S, R, k = 0) {
  if (!S.sun || S.heavy || S.weather === 'fog' || S.tod === 'night') return;
  const lowSun = low(S);
  if (!lowSun && !(S.weather === 'cloudy' && hash(k, 71) < 0.5)) return;
  const [sx, sy] = S.sun, strength = lowSun ? (S.overcast ? 0.75 : 1) : 0.45;
  const c = mk(W / 2, H / 2), x = c.getContext('2d'); x.scale(0.5, 0.5); // 반 크기 (부드러운 빛이라 티가 나지 않는다)
  const n = 9 + Math.floor(R() * 5);
  for (let i = 0; i < n; i++) {
    const a = (lowSun ? -Math.PI * 0.5 : Math.PI * 0.5) + (R() - 0.5) * (lowSun ? 2.9 : 1.2), spread = 0.015 + R() * 0.045, len = (lowSun ? 420 : 520) + R() * 500;
    const g = x.createRadialGradient(sx, sy, 10, sx, sy, len);
    const col = S.tod === 'dusk' ? '255,176,110' : S.tod === 'dawn' ? '255,214,170' : '255,246,220';
    g.addColorStop(0, `rgba(${col},${0.2 * strength})`); g.addColorStop(0.45, `rgba(${col},${0.07 * strength})`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.beginPath(); x.moveTo(sx, sy);
    x.lineTo(sx + Math.cos(a - spread) * len, sy + Math.sin(a - spread) * len);
    x.lineTo(sx + Math.cos(a + spread) * len, sy + Math.sin(a + spread) * len); x.closePath(); x.fill();
  }
  ctx.globalCompositeOperation = 'screen'; ctx.drawImage(c, 0, 0, W, H);
  // 지평선에 깔리는 눈부심
  if (lowSun) { ctx.globalCompositeOperation = 'lighter'; puff(ctx, sx, HZ - 4, 520, 34, S.glow, 0.22 * strength); }
  ctx.globalCompositeOperation = 'source-over';
  c.width = c.height = 0;
}

/** 젖은 땅: 웅덩이에 위쪽 그림이 거꾸로 비치고, 불 켜진 창은 아래로 길게 번진다. */
export function wetGround(ctx, S, lit, k) {
  const wet = S.weather === 'rain' || S.storm;
  if (!wet) return;
  const night = S.tod === 'night';
  // 젖어서 땅이 짙어진다
  ctx.globalCompositeOperation = 'multiply';
  const v = ctx.createLinearGradient(0, HZ + 40, 0, H);
  v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(1, night ? 'rgba(150,156,180,1)' : 'rgba(176,180,190,1)');
  ctx.fillStyle = v; ctx.fillRect(0, HZ + 40, W, H - HZ - 40);
  ctx.globalCompositeOperation = 'source-over';
  // 웅덩이: 앞쪽일수록 크고 납작하다. 웅덩이 윗선을 거울로 삼아 위를 뒤집어 그린다
  const snap = mk(W, H), s = snap.getContext('2d'); s.drawImage(ctx.canvas, 0, 0);
  for (let i = 0; i < 16; i++) {
    const d = hash(i + k * 3, 61), px = 120 + hash(i + k * 5, 62) * (W - 240), py = HZ + 90 + d * d * (H - HZ - 120);
    const rx = 30 + d * 150, ry = 4 + d * 13;
    ctx.save(); ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.8; ctx.translate(0, py * 2); ctx.scale(1, -1);
    ctx.drawImage(snap, px - rx, py - ry * 6 - 40, rx * 2, ry * 6 + 40, px - rx, py - ry * 6 - 40, rx * 2, ry * 6 + 40);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = night ? 'rgba(170,184,220,.22)' : 'rgba(236,240,244,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  snap.width = snap.height = 0;
  // 창 불빛이 젖은 땅에 길게 늘어진다
  if (lit?.length) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, c] of lit) {
      const len = 30 + r * 3, g = ctx.createLinearGradient(0, y + 4, 0, y + len);
      g.addColorStop(0, rgba(c, night ? 0.32 : 0.18)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.fillRect(x - Math.max(1.5, r * 0.18), y + 4, Math.max(3, r * 0.36), len);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

/** 안개 둑: 지평선에서 짙고, 앞으로 올수록 옅어진다. 위 가장자리는 구불구불하고, 해 쪽은 빛을 머금는다. */
export function fogBanks(ctx, S, R) {
  if (S.weather !== 'fog') return;
  const base = S.tod === 'dawn' ? '#f0d8c4' : S.tod === 'dusk' ? '#d8b0a0' : '#e2e4e0';
  const bands = [[HZ - 6, 0.62, 64], [HZ + 30, 0.34, 46], [HZ + 92, 0.2, 40], [HZ + 156, 0.1, 36], [HZ + 216, 0.05, 30]];
  bands.forEach(([y, a, h], bi) => {
    const c = mk(W, h * 3), x = c.getContext('2d'), s = 7 + bi * 13;
    const g = x.createLinearGradient(0, 0, 0, h * 3);
    g.addColorStop(0, rgba(base, 0)); g.addColorStop(0.34, rgba(base, a)); g.addColorStop(0.62, rgba(base, a * 0.85)); g.addColorStop(1, rgba(base, 0));
    x.fillStyle = g; x.beginPath(); x.moveTo(0, h * 3);
    for (let px = 0; px <= W; px += 10) x.lineTo(px, h * (0.95 - fbm1(px / 140 + s, s, 3) * 0.9));
    x.lineTo(W, h * 3); x.closePath(); x.fill();
    ctx.drawImage(c, 0, y - h * 1.1);
    c.width = c.height = 0;
  });
  for (let i = 0; i < 16; i++) puff(ctx, R() * W, HZ + 30 + R() * 200, 140 + R() * 220, 8 + R() * 14, base, 0.09);
  if (S.sun && S.tod !== 'night') { ctx.globalCompositeOperation = 'screen'; puff(ctx, S.sun[0], HZ + 10, 520, 150, S.glow, low(S) ? 0.42 : 0.24); ctx.globalCompositeOperation = 'source-over'; }
}

/** 앞쪽 틀: 그림 아래 양쪽 끝의 짙은 풀숲과 바위, 위에서 늘어진 가지. 빛을 등져 거의 실루엣이다. */
export function nearFrame(ctx, S, P, biome, R) {
  if (biome === 'island') return;
  const night = S.tod === 'night', backlit = low(S) && !S.heavy;
  const base = night ? '#0a0c14' : mixh(P.snow ? '#3a4048' : P.blight ? '#1e1418' : biome === 'dry' ? '#3a2e1e' : '#1c2418', S.sh ?? '#333', 0.2);
  const ink = backlit ? mixh(base, '#0e0a0c', 0.4) : base;
  const snowy = !!P.snow;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 0 : W, reach = 200 + R() * 70;
    // 둔덕
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(x0, H);
    for (let t = 0; t <= 1.0001; t += 0.04) {
      const x = x0 - side * reach * t, y = H - 70 * Math.pow(1 - t, 0.8) - fbm1(t * 6 + side * 3, 41 + side, 3) * 30 * (1 - t) - 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x0 - side * reach, H); ctx.closePath(); ctx.fill();
    if (snowy) { ctx.fillStyle = rgba('#e6eaee', night ? 0.25 : 0.55); ctx.beginPath(); ctx.moveTo(x0, H - 72); for (let t = 0; t <= 1; t += 0.05) ctx.lineTo(x0 - side * reach * t, H - 70 * Math.pow(1 - t, 0.8) - 4); ctx.lineTo(x0 - side * reach, H - 2); ctx.lineTo(x0, H - 62); ctx.closePath(); ctx.fill(); }
    // 풀잎·마른 덤불
    ctx.strokeStyle = ink; ctx.lineCap = 'round';
    const blades = biome === 'dry' ? 26 : P.blight ? 18 : 60;
    for (let i = 0; i < blades; i++) {
      const t = R() * 0.85, bx = x0 - side * reach * t, by = H - 60 * Math.pow(1 - t, 0.8) + 4, len = (biome === 'dry' ? 18 : 26) + R() * 44 * (1 - t);
      const lean = side * (0.15 + R() * 0.5) * (S.windy ? 2 : 1);
      ctx.lineWidth = 1 + R() * 2.2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + lean * len * 0.3, by - len * 0.6, bx + lean * len, by - len); ctx.stroke();
    }
    // 바위 하나
    const rx = x0 - side * (40 + R() * 60), ry = H - 34;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(rx, ry, 46 + R() * 24, 26 + R() * 12, side * 0.1, Math.PI, 0); ctx.fill();
    if (backlit || night) { ctx.strokeStyle = rgba(night ? '#9aa8d0' : S.glow, night ? 0.18 : 0.4); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(rx, ry, 46, 26, side * 0.1, Math.PI * 1.15, Math.PI * 1.6); ctx.stroke(); }
  }
}
