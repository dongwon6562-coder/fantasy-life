// 51단계 도우미4: 풍경의 가까운 층. 폰은 그림 가운데(가로 약 225~975)만 보여 주므로, 그 안쪽 가장자리에
// 큰 나무 한 그루와 발치의 둔덕(풀·꽃·돌·눈)을 세워 그림에 앞·가운데·먼 곳의 깊이를 준다.
// 고장마다 나무 쪽(왼쪽·오른쪽)과 나무 종류가 다르고, 철마다(새잎·꽃·짙은 잎·단풍·빈 가지와 눈) 바뀐다.
import { W, H, HZ, fbm1, mixh, rgba, dark, light, puff, clamp } from './sceneKit.js';

const VIS0 = 225, VIS1 = 975; // 폰에서 보이는 가로 범위 (1200×480을 390×250에 채울 때)

/** 가까운 층을 그린다. layout은 풍경 틀(open·coast·lake·mountain·forest·island) */
export function nearStage(ctx, S, P, D, layout, R, wr = R) {
  const q = D.seed % 97, night = S.tod === 'night';
  const side = -1; // 마을과 성은 가운데에서 오른쪽에 서므로 나무는 늘 왼쪽 (고장마다 자리·종류·크기가 다르다)
  const tx = side < 0 ? VIS0 + 26 + (q % 5) * 7 : VIS1 - 26 - (q % 5) * 7;
  const kind = P.blight ? 'dead' : D.biome === 'island' ? 'palm' : D.biome === 'cold' || D.biome === 'mountain' ? 'pine'
    : D.biome === 'forest' ? (q % 2 ? 'pine' : 'broad') : D.biome === 'dry' ? (q % 3 ? 'olive' : 'none') : q % 5 === 0 ? 'pine' : q % 7 === 3 ? 'none' : 'broad';
  const lightK = night ? 0.25 : S.heavy ? 0.55 : 1;
  // 가까운 것은 짙고, 하늘빛이 그늘에 스민다
  const shade = (c, k = 0.42) => mixh(dark(c, night ? 0.75 : Math.min(0.8, k + 0.12)), S.sh ?? '#556', night ? 0.3 : 0.16);
  const lit = (c, k = 0.3) => mixh(c, S.lit ?? '#fff', k * lightK);
  const sunX = S.sun ? S.sun[0] : S.moon ? S.moon[0] : W / 2;
  const toSun = sunX > tx ? 1 : -1;
  const backlit = !!S.sun && !S.overcast && (S.tod === 'dawn' || S.tod === 'dusk');
  const ground = bankColor(P, D);
  const baseY = H - 64;
  if (kind !== 'none') TREES[kind](ctx, { x: tx, y: baseY + 8, side, S, P, R, shade, lit, toSun, backlit, night });
  bank(ctx, { S, P, D, R, side, tx, shade, lit, toSun, backlit, night, ground, tree: kind !== 'none' });
  nearWeather(ctx, S, wr);
}

/** 가까운 층 위에 내리는 비와 눈: 먼 곳보다 굵고 성글다 */
function nearWeather(ctx, S, R) {
  const night = S.tod === 'night';
  if (S.weather === 'rain' || S.storm) {
    ctx.strokeStyle = night ? 'rgba(150,162,190,.22)' : 'rgba(214,220,228,.3)'; ctx.lineWidth = 1.3; ctx.beginPath();
    const n = S.storm ? 160 : 90, sl = S.storm ? 0.62 : 0.28;
    for (let i = 0; i < n; i++) { const x = VIS0 - 60 + R() * (VIS1 - VIS0 + 160), y = R() * H, l = 26 + R() * 22; ctx.moveTo(x, y); ctx.lineTo(x - l * sl, y + l); }
    ctx.stroke();
  }
  if (S.weather === 'snow' || S.blizzard) for (let i = 0; i < 90; i++) { const x = VIS0 + R() * (VIS1 - VIS0), y = R() * H, r = 1.6 + R() * 2.4; puff(ctx, x, y, r * 1.5, r * 1.5, '#f6f7f4', night ? 0.35 : 0.7); }
}

function bankColor(P, D) {
  if (P.snow) return '#eef2f6';
  if (P.blight) return mixh(P.grass, '#3a2426', 0.4);
  if (P.dry || D.biome === 'dry') return mixh(P.grass, '#a88a5a', 0.4);
  return P.grass;
}

/* ---------- 발치의 둔덕 ---------- */
function bank(ctx, o) {
  const { S, P, R, side, tx, shade, lit, toSun, backlit, night, ground } = o;
  const top = (x) => {
    const d = (x - tx) * side; // 나무 쪽이 높다
    const rise = clamp(1 - Math.abs(x - tx) / 380) ** 1.6 * 34;
    return H - 44 - fbm1(x / 90 + 3, 51, 3) * 26 - rise - (d < 0 ? 6 : 0);
  };
  const body = P.snow ? mixh(ground, S.sh ?? '#8899aa', night ? 0.7 : 0.18) : shade(ground, 0.34);
  const g = ctx.createLinearGradient(0, H - 90, 0, H);
  g.addColorStop(0, body); g.addColorStop(1, dark(body, 0.35));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, H);
  for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, top(x));
  ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fill();
  // 등성이에 닿는 빛 (해를 마주 보는 쪽)
  ctx.save(); ctx.beginPath(); ctx.moveTo(-10, H);
  for (let x = -10; x <= W + 10; x += 8) ctx.lineTo(x, top(x)); ctx.lineTo(W + 10, H); ctx.closePath(); ctx.clip();
  for (let i = 0; i < 26; i++) { const x = VIS0 + R() * (VIS1 - VIS0), y = top(x) + 6 + R() * 26; puff(ctx, x, y, 50 + R() * 90, 6 + R() * 8, i % 3 ? lit(body, 0.18) : dark(body, 0.2), 0.32); }
  if (P.snow) { // 눈 둔덕: 푸른 그늘과 빛 받는 결
    for (let i = 0; i < 18; i++) { const x = VIS0 + R() * (VIS1 - VIS0), y = top(x) + 10 + R() * 30; puff(ctx, x, y, 70 + R() * 80, 5 + R() * 6, night ? '#2a3448' : '#9fb0c8', 0.35); }
    for (let i = 0; i < 12; i++) { const x = VIS0 + R() * (VIS1 - VIS0), y = top(x) + 3 + R() * 8; puff(ctx, x, y, 40 + R() * 60, 3 + R() * 3, night ? '#8090b0' : '#ffffff', night ? 0.25 : 0.6); }
  }
  ctx.restore();
  // 등성이 테두리 빛
  ctx.strokeStyle = rgba(backlit ? S.glow : S.lit, night ? 0.12 : backlit ? 0.5 : 0.22); ctx.lineWidth = 1.4; ctx.beginPath();
  for (let x = -10; x <= W + 10; x += 8) x === -10 ? ctx.moveTo(x, top(x) + 0.5) : ctx.lineTo(x, top(x) + 0.5);
  ctx.stroke();
  // 돌 둘
  for (let i = 0; i < 2; i++) {
    const x = side < 0 ? VIS1 - 90 - R() * 200 - i * 150 : VIS0 + 90 + R() * 200 + i * 150, y = top(x) + 16 + R() * 10, rx = 22 + R() * 20, ry = 12 + R() * 8;
    if (P.snow) { puff(ctx, x, y - 4, rx * 1.3, ry, night ? '#4a5670' : '#f4f6f8', 0.9); puff(ctx, x - toSun * rx * 0.4, y, rx, ry * 0.6, night ? '#2a3448' : '#a8b8cc', 0.5); continue; }
    const rc = shade(P.rock, 0.45);
    ctx.fillStyle = rc; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, (R() - 0.5) * 0.3, Math.PI, 0); ctx.lineTo(x + rx, y + 6); ctx.lineTo(x - rx, y + 6); ctx.fill();
    ctx.fillStyle = rgba(lit(rc, 0.35), 0.6); ctx.beginPath(); ctx.ellipse(x + toSun * rx * 0.3, y - ry * 0.55, rx * 0.5, ry * 0.32, 0, Math.PI, 0); ctx.fill();
    if (P.snow) { ctx.fillStyle = night ? '#7c88a0' : '#eef2f6'; ctx.beginPath(); ctx.ellipse(x, y - ry * 0.8, rx * 0.8, ry * 0.35, 0, Math.PI, 0); ctx.fill(); }
  }
  if (P.snow) {
    const sg = ctx.createLinearGradient(0, H - 70, 0, H); sg.addColorStop(0, 'rgba(120,140,170,0)'); sg.addColorStop(1, night ? 'rgba(10,14,28,.6)' : 'rgba(110,130,165,.45)');
    ctx.fillStyle = sg; ctx.fillRect(-10, H - 70, W + 20, 70);
    ctx.strokeStyle = night ? '#2a2a30' : '#6a5a44'; ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) { const x = VIS0 + R() * (VIS1 - VIS0), y = top(x) + 8 + R() * 16, len = 10 + R() * 22; ctx.lineWidth = 0.8 + R(); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2, y - len * 0.6, x + (R() - 0.5) * 10, y - len); ctx.stroke(); }
    return;
  }
  // 풀잎 다발: 둔덕 등성이를 따라
  const dry = !!P.dry || !!P.blight, autumn = P.autumn ?? 0;
  const tuft = dry ? mixh(body, '#8a7a50', 0.4) : autumn ? mixh(body, '#6a6030', 0.3) : body;
  ctx.lineCap = 'round';
  for (let i = 0; i < (dry ? 100 : 240); i++) {
    const x = R() * W, y = top(x) + 2 + R() * 14, len = (dry ? 10 : 14) + R() * (dry ? 16 : 30), lean = (R() - 0.4) * 0.8 + (S.windy ? 0.6 : 0);
    ctx.strokeStyle = R() < 0.35 ? lit(tuft, 0.25) : dark(tuft, R() * 0.3); ctx.lineWidth = 1 + R() * 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * len * 0.3, y - len * 0.6, x + lean * len, y - len); ctx.stroke();
    if (backlit && R() < 0.3) { ctx.strokeStyle = rgba(S.glow, 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + lean * len * 0.6, y - len * 0.7); ctx.lineTo(x + lean * len, y - len); ctx.stroke(); }
  }
  // 들꽃: 봄·여름
  const m = o.S.month ?? 0;
  if (!dry && !night && P.leaf && !autumn) {
    const cols = P.blossom ? ['#f4e6e8', '#e8b4c0', '#f2e2a0', '#d0c8ec'] : ['#f0dc8a', '#e8a4ac', '#f4f0e4', '#b8a8de', '#e07a5a'];
    for (let c = 0; c < 7; c++) {
      const cx = VIS0 + 40 + R() * (VIS1 - VIS0 - 80), col = cols[Math.floor(R() * cols.length)];
      for (let i = 0; i < 9; i++) {
        const x = cx + (R() - 0.5) * 70, y = top(x) + 6 + R() * 22, r = 1.4 + R() * 1.6;
        ctx.strokeStyle = dark(body, 0.2); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = col; ctx.globalAlpha = S.heavy ? 0.55 : 0.9; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
  }
  if (autumn) for (let i = 0; i < 60; i++) { // 떨어진 잎
    const x = VIS0 + R() * (VIS1 - VIS0), y = top(x) + 6 + R() * 40;
    ctx.fillStyle = ['#b8742e', '#9a4a2a', '#c49a3a', '#7a3a22'][Math.floor(R() * 4)]; ctx.globalAlpha = night ? 0.35 : 0.85;
    ctx.beginPath(); ctx.ellipse(x, y, 2.6, 1.3, R() * 3, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
  }
  void m;
}

/* ---------- 나무 ---------- */
function limb(ctx, x0, y0, x1, y1, w0, w1, bend, col) {
  const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2;
  const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x0 + ca * w0, y0 + sa * w0); ctx.quadraticCurveTo(mx + ca * (w0 + w1) / 2, my + sa * (w0 + w1) / 2, x1 + ca * w1, y1 + sa * w1);
  ctx.lineTo(x1 - ca * w1, y1 - sa * w1); ctx.quadraticCurveTo(mx - ca * (w0 + w1) / 2, my - sa * (w0 + w1) / 2, x0 - ca * w0, y0 - sa * w0);
  ctx.closePath(); ctx.fill();
}
/** 가지를 갈래쳐 뻗는다. tips에 끝자리를 모은다 */
function branches(ctx, x, y, ang, len, w, depth, R, col, tips, snow) {
  const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
  limb(ctx, x, y, x1, y1, w, w * 0.62, (R() - 0.5) * len * 0.25, col);
  if (snow && w > 1.2 && Math.sin(ang) < -0.2) { ctx.strokeStyle = snow; ctx.lineWidth = Math.max(1, w * 0.5); ctx.beginPath(); ctx.moveTo(x, y - w * 0.6); ctx.lineTo(x1, y1 - w * 0.5); ctx.stroke(); }
  if (depth <= 0 || len < 10) { tips.push([x1, y1]); return; }
  const n = depth > 3 ? 2 : 2 + (R() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) branches(ctx, x1, y1, ang + (i - (n - 1) / 2) * (0.5 + R() * 0.3) + (R() - 0.5) * 0.3, len * (0.68 + R() * 0.12), w * 0.62, depth - 1, R, col, tips, snow);
}

const TREES = {
  broad(ctx, o) {
    const { x, y, side, S, P, R, shade, lit, toSun, night } = o;
    const bark = shade(P.trunk, 0.2);
    const inward = -side; // 화면 가운데 쪽
    const tips = [];
    // 줄기는 조금 기울어 화면 가운데로, 굵은 가지 셋이 위와 안쪽으로
    const topX = x + inward * 30, topY = 150;
    limb(ctx, x, y + 20, topX, topY, 19, 11, inward * 18, bark);
    // 뿌리
    for (const d of [-1, 1]) limb(ctx, x, y + 14, x + d * 34, y + 30, 9, 2, 0, bark);
    const bare = !P.leaf || P.snow;
    const snow = P.snow ? (night ? '#7c88a0' : '#f2f4f6') : null;
    branches(ctx, topX, topY, -Math.PI / 2 + inward * 0.55, 72, 10, bare ? 5 : 3, R, bark, tips, snow);
    branches(ctx, topX, topY + 10, -Math.PI / 2 - inward * 0.25, 70, 9, bare ? 5 : 3, R, bark, tips, snow);
    if (bare) branches(ctx, (x + topX) / 2, (y + topY) / 2, -Math.PI / 2 + inward * 1.05, 80, 8, 4, R, bark, tips, snow);
    else branches(ctx, topX, topY + 30, -Math.PI / 2 + inward * 0.95, 60, 7, 2, R, bark, tips, snow);
    // 줄기 빛
    ctx.strokeStyle = rgba(lit(P.trunk, 0.5), night ? 0.15 : 0.45); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + toSun * 12, y + 16); ctx.quadraticCurveTo(x + inward * 12 + toSun * 10, (y + topY) / 2, topX + toSun * 8, topY + 6); ctx.stroke();
    if (bare) { // 빈 가지 끝의 잔가지
      ctx.strokeStyle = bark; ctx.lineWidth = 1;
      for (const [tx, ty] of tips) for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 1.8; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a) * (8 + R() * 10), ty + Math.sin(a) * (8 + R() * 10)); ctx.stroke(); }
      return;
    }
    // 잎 덩이: 가지 끝마다 덩이, 그늘색 바탕 → 해 쪽 밝은 덩이 → 가장자리 잎 붓질
    const autumn = P.autumn ?? 0;
    const leafBase = autumn ? mixh(P.leaf, '#b0622a', autumn * 0.6) : P.leaf;
    const base = shade(leafBase, 0.36), mid = mixh(base, leafBase, night ? 0.12 : 0.45), hi = lit(leafBase, 0.32);
    const clusters = tips.map(([tx, ty]) => [tx, ty, 30 + R() * 22]);
    for (const [cx, cy, r] of clusters) puff(ctx, cx, cy, r * 1.5, r * 1.25, base, 0.95);
    for (const [cx, cy, r] of clusters) for (let i = 0; i < 9; i++) {
      const a = R() * 6.3, d = R() * r, bx = cx + Math.cos(a) * d, by = cy + Math.sin(a) * d * 0.8;
      ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(bx, by, 10 + R() * 12, 8 + R() * 9, R() * 3, 0, 6.3); ctx.fill();
    }
    for (const [cx, cy, r] of clusters) for (let i = 0; i < 7; i++) {
      const bx = cx + toSun * R() * r * 0.8 + (R() - 0.5) * r * 0.5, by = cy - R() * r * 0.7;
      ctx.fillStyle = rgba(mid, 0.9); ctx.beginPath(); ctx.ellipse(bx, by, 8 + R() * 9, 6 + R() * 6, R() * 3, 0, 6.3); ctx.fill();
      if (R() < 0.6) { ctx.fillStyle = rgba(hi, night ? 0.25 : 0.7); ctx.beginPath(); ctx.ellipse(bx + toSun * 3, by - 3, 4 + R() * 6, 3 + R() * 4, R() * 3, 0, 6.3); ctx.fill(); }
    }
    // 가장자리 낱잎
    for (const [cx, cy, r] of clusters) for (let i = 0; i < 26; i++) {
      const a = R() * 6.3, d = r * (1.1 + R() * 0.4), lx = cx + Math.cos(a) * d * 1.2, ly = cy + Math.sin(a) * d;
      const c = autumn && R() < 0.5 ? ['#c07030', '#a8482a', '#d0a040'][Math.floor(R() * 3)] : R() < 0.3 ? mid : base;
      ctx.fillStyle = night ? dark(c, 0.6) : c; ctx.beginPath(); ctx.ellipse(lx, ly, 3.4, 1.8, a, 0, 6.3); ctx.fill();
    }
    if (P.blossom > 0.2 && !night) for (const [cx, cy, r] of clusters) for (let i = 0; i < 30 * P.blossom; i++) {
      const a = R() * 6.3, d = R() * r * 1.2; ctx.fillStyle = R() < 0.5 ? '#f6e8ec' : '#ecc0cc';
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d, 1.6 + R() * 1.8, 0, 6.3); ctx.fill();
    }
    if (o.backlit) { // 해를 등진 잎 덩이 가장자리 빛
      ctx.strokeStyle = rgba(S.glow, 0.45); ctx.lineWidth = 1.6;
      for (const [cx, cy, r] of clusters) { ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.45, r * 1.2, 0, toSun > 0 ? -1.2 : Math.PI + 0.2, toSun > 0 ? 0.2 : Math.PI + 1.6); ctx.stroke(); }
    }
  },
  olive(ctx, o) { // 메마른 땅의 작은 나무: 비틀린 줄기, 성긴 잿빛 잎
    const { P } = o;
    const Q = { ...P, leaf: P.leaf ? mixh(P.leaf, '#8a9070', 0.5) : '#7a8060', blossom: 0 };
    TREES.broad(ctx, { ...o, P: Q });
  },
  dead(ctx, o) {
    const { P } = o;
    TREES.broad(ctx, { ...o, P: { ...P, leaf: null, snow: P.snow } });
  },
  pine(ctx, o) {
    const { x, y, S, P, R, shade, lit, toSun, night } = o;
    const needle = shade(P.conifer, 0.45), deep = dark(needle, 0.35), hi = lit(mixh(P.conifer, '#6a8a5a', 0.3), 0.3), bark = shade(P.trunk, 0.35);
    limb(ctx, x, y + 20, x, -30, 13, 4, 0, bark);
    const snow = P.snow ? (night ? '#7c88a0' : '#eef2f6') : null;
    // 가지 한 자락: 줄기에서 밖으로 뻗어 끝이 처지고, 아래로 바늘잎이 늘어진다
    const bough = (sx, sy, dir, len, sag) => {
      const ex = sx + dir * len, ey = sy + sag, cx = sx + dir * len * 0.55, cy = sy - sag * 0.15;
      const th = 7 + len * 0.09;
      ctx.fillStyle = needle; ctx.beginPath(); ctx.moveTo(sx, sy - th * 0.6);
      ctx.quadraticCurveTo(cx, cy - th, ex, ey);
      for (let k = 10; k >= 0; k--) { const t = k / 10, bx = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex, by = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey; ctx.lineTo(bx + (R() - 0.5) * 4, by + th * (0.9 + R() * 0.8)); }
      ctx.closePath(); ctx.fill();
      // 늘어진 바늘잎
      ctx.strokeStyle = deep; ctx.lineWidth = 1.3;
      for (let k = 0; k < len / 4; k++) { const t = R(), bx = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex, by = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey + th; ctx.beginPath(); ctx.moveTo(bx, by - 3); ctx.lineTo(bx + dir * 2 + (R() - 0.5) * 3, by + 5 + R() * 7); ctx.stroke(); }
      // 위쪽 빛 받는 결
      if (dir === toSun || !night) {
        ctx.strokeStyle = rgba(hi, night ? 0.15 : dir === toSun ? 0.75 : 0.3); ctx.lineWidth = 1.1;
        for (let k = 0; k < len / 6; k++) { const t = 0.2 + R() * 0.8, bx = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex, by = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey - th * 0.3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dir * 6, by + 3); ctx.stroke(); }
      }
      if (snow) { ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(sx + dir * 6, sy - th * 0.65); ctx.quadraticCurveTo(cx, cy - th * 1.02, ex - dir * len * 0.12, ey - th * 0.2); ctx.quadraticCurveTo(cx, cy - th * 0.62, sx + dir * 6, sy - th * 0.4); ctx.fill(); }
    };
    const tiers = 16;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1), ty = -40 + t * (y - 30) + (R() - 0.5) * 14, len = 16 + t * 115 * (0.65 + R() * 0.5);
      for (const dir of R() < 0.5 ? [-1, 1] : [1, -1]) {
        if (t > 0.3 && R() < 0.12) continue;
        bough(x, ty + (dir > 0 ? R() * 10 : 0), dir, len * (0.7 + R() * 0.5), 14 + t * 30 + R() * 10);
        if (t > 0.25 && R() < 0.7) bough(x + dir * 4, ty + 10, dir, len * 0.6, 10 + t * 16);
      }
    }
  },
  palm(ctx, o) {
    const { x, y, side, S, P, R, shade, lit, toSun, night } = o;
    const bark = shade('#6a5640', 0.15), frond = shade(P.leaf ?? '#5a7a3a', 0.3), hi = lit(P.leaf ?? '#5a7a3a', 0.3);
    const inward = -side, topX = x + inward * 90, topY = 70;
    // 휜 줄기와 마디
    const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([x + inward * 90 * t * t, y + 20 - (y + 20 - topY) * t]); }
    for (let i = 0; i < 20; i++) limb(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 12 - i * 0.3, 12 - (i + 1) * 0.3, 0, bark);
    ctx.strokeStyle = rgba(dark(bark, 0.3), 0.8); ctx.lineWidth = 1.2;
    for (let i = 1; i < 20; i += 1) { const [px, py] = pts[i]; ctx.beginPath(); ctx.moveTo(px - 10, py); ctx.lineTo(px + 10, py + 2); ctx.stroke(); }
    // 잎: 늘어진 활꼴과 작은 잎
    for (let f = 0; f < 9; f++) {
      const a = -Math.PI + (f / 8) * Math.PI + (R() - 0.5) * 0.2, len = 110 + R() * 40;
      const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.5 + 60;
      const cx = topX + Math.cos(a) * len * 0.5, cy = topY - 30 + Math.sin(a) * 20;
      ctx.strokeStyle = frond; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      for (let s = 1; s < 16; s++) {
        const t = s / 16, px = (1 - t) ** 2 * topX + 2 * (1 - t) * t * cx + t * t * ex, py = (1 - t) ** 2 * topY + 2 * (1 - t) * t * cy + t * t * ey;
        ctx.strokeStyle = s % 3 === 0 && !night ? hi : frond; ctx.lineWidth = 2;
        for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + d * 6 + Math.cos(a) * 8, py + 18 * (1 - t * 0.5)); ctx.stroke(); }
      }
    }
    void S; void toSun;
  },
};
