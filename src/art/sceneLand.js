// 땅 그리기: 계절 빛깔, 먼 산, 언덕, 숲, 밭, 물, 나무, 앞쪽 풀밭.
import { W, H, HZ, hash, noise1, fbm1, mixh, rgba, dark, light, dull, clamp, trace, fillCurve, clipBelow, poly, puff, mist, vgrad } from './sceneKit.js';

/** 달과 땅 모양에 따른 빛깔 */
export function paletteOf(month, biome, famine) {
  let m = month;
  if (biome === 'island') m = 6 + (month % 3);                 // 남쪽 섬은 늘 여름
  const coldLand = biome === 'cold' || biome === 'mountain';
  const P = { soil: '#6b5038', rock: '#8a857c', trunk: '#3a2c20' };
  if (m === 12 || m <= 2 || (coldLand && (m === 11 || m === 3))) {
    Object.assign(P, { grass: '#dde1e2', grass2: '#bcc5ca', field: ['#e4e7e7', '#d5dadd', '#dcdfde', '#ccd3d6'], leaf: null, conifer: '#2c3a33', hill: '#cdd4d8', far: '#9da8b2', snow: true, water: '#9fb4c0', frozen: true });
  } else if (m <= 5) {
    const t = (m - 3) / 2;
    Object.assign(P, { grass: mixh('#8a9a58', '#7b9a4a', t), grass2: '#637c40', field: [mixh('#9aa766', '#8daa58', t), '#7a6448', mixh('#a7b872', '#9cb860', t), '#86935a'], leaf: mixh('#9cb062', '#84a44c', t), blossom: m === 4 ? 0.5 : m === 5 ? 0.25 : 0.1, conifer: '#31463a', hill: '#7b8e58', far: '#8794a2', water: '#5a8494', snowPatch: m === 3 });
  } else if (m <= 8) {
    const t = (m - 6) / 2;
    Object.assign(P, { grass: mixh('#6c8842', '#7c8844', t), grass2: '#536a36', field: [mixh('#8fa04e', '#cdae5c', t), mixh('#a9a457', '#d4b866', t), '#6e8a42', mixh('#9a9a50', '#bfa458', t)], leaf: '#4c6834', conifer: '#2d4233', hill: '#687f43', far: '#7f909e', water: '#507c8c' });
  } else {
    const t = (m - 9) / 2;
    Object.assign(P, { grass: mixh('#8b8a4c', '#7b7246', t), grass2: '#645f3c', field: [mixh('#bfa362', '#9a8556', t), '#6b5038', mixh('#c2a255', '#8a7448', t), '#7d7a48'], leaf: m === 11 ? '#8a5a30' : '#7c7a3c', autumn: m === 11 ? 0.45 : 1, conifer: '#2d4033', hill: mixh('#8a8048', '#786c46', t), far: '#878d98', water: '#56798a', sheaves: m === 9 });
  }
  P.snowLine = P.snow ? HZ + 20 : m === 3 || m === 11 ? HZ - 44 : m === 4 || m === 10 ? HZ - 66 : HZ - 96;
  const tone = (c, t) => { for (const k of ['grass', 'grass2', 'hill']) P[k] = mixh(P[k], c, t); P.field = P.field.map((f) => mixh(f, c, t)); };
  if (biome === 'cold' && !P.snow) { tone('#8c8a66', 0.55); P.leaf = P.leaf && mixh(P.leaf, '#7a7c50', 0.5); P.snowLine += 34; }
  if (biome === 'mountain' && !P.snow) { tone('#7e8068', 0.4); P.snowLine += 40; }
  if (biome === 'dry' && !P.snow) { // 메마른 땅 (38단계): 모래빛 들, 바랜 밭, 먼 모래 언덕
    tone('#c8a46c', 0.7); P.field = P.field.map((c, i) => mixh(c, ['#c8a060', '#a88250', '#d0b070', '#9a7a48'][i % 4], 0.6)); P.leaf = P.leaf && mixh(P.leaf, '#7a7a40', 0.55);
    P.far = mixh(P.far, '#c0a07a', 0.55); P.hill = mixh(P.hill, '#c09a62', 0.3); P.sand = '#d8b880'; P.dry = true; P.snowLine -= 60; P.blossom = 0;
  } else if (biome === 'dry') tone('#b49c68', 0.4);
  if (biome === 'swamp') { tone('#5c6444', 0.5); P.water = P.frozen ? P.water : '#56664e'; P.leaf = P.leaf && mixh(P.leaf, '#4c5a34', 0.4); }
  if (biome === 'forest') { tone('#4e6a3a', P.snow ? 0 : 0.3); P.far = mixh(P.far, '#5a7868', 0.3); }
  if (biome === 'island') { tone('#7a9a50', 0.3); P.water = '#4c8a94'; P.far = '#7a98a4'; }
  if (biome === 'blight') { Object.assign(P, { leaf: null, autumn: 0, blossom: 0, conifer: '#2a2226', far: mixh(P.far, '#583a44', 0.7), water: '#5e3c3c', soil: '#4a2e2a', rock: '#5a444a', trunk: '#241a1c', snowLine: HZ - 150, sheaves: false }); tone('#6c443c', P.snow ? 0.55 : 0.8); P.blight = true; }
  if (biome === 'ash') { Object.assign(P, { leaf: null, autumn: 0, blossom: 0, conifer: '#2c2a2c', far: mixh(P.far, '#55525a', 0.7), water: '#5a5e62', soil: '#4a4644', rock: '#66625e', trunk: '#221e1e', sheaves: false }); tone('#77726c', P.snow ? 0.4 : 0.85); P.blight = true; }
  if (famine && !P.snow) { tone('#8a7650', 0.5); P.field = P.field.map((c) => mixh(c, '#8a7450', 0.3)); P.leaf = P.leaf && mixh(P.leaf, '#8a7a50', 0.45); P.sheaves = false; }
  return P;
}

/** 먼 산 한 겹: 능선, 빛 받는 면과 그늘 면, 눈, 아래로 갈수록 안개에 묻힘 */
export function mountains(L, fn, o) {
  const { color, S, haze = 0.4, snowLine = 0, seed = 1, reach = 1, base = HZ + 30 } = o;
  const body = mixh(color, S.haze, haze);
  fillCurve(L, fn, vgrad(L, base - 150, base, [[0, body], [1, mixh(body, S.haze, 0.55)]]), base + 40);
  clipBelow(L, fn, base + 40);
  // 눈: 능선을 따라 덮이고 아래 끝은 들쭉날쭉하다
  if (snowLine) {
    const yb = (x) => { const y = fn(x), d = Math.max(0, snowLine - y); return y + d * (0.3 + noise1(x / 19, 60 + seed) * 0.7) + Math.abs(Math.sin(x / 5.3 + seed)) * Math.min(7, d * 0.35); };
    L.fillStyle = mixh('#f1f2f0', S.haze, haze * 0.5); L.beginPath(); L.moveTo(0, fn(0) - 1);
    for (let x = 0; x <= W; x += 3) L.lineTo(x, fn(x) - 1);
    for (let x = W; x >= 0; x -= 3) L.lineTo(x, yb(x));
    L.closePath(); L.fill();
  }
  // 봉우리마다 볕 든 비탈과 그늘진 비탈
  const N = Math.floor(W / 4) + 3, ys = [];
  for (let i = 0; i < N; i++) ys.push(fn(i * 4 - 4));
  const shade = mixh(dark(body, 0.62), '#39425e', 0.3), glow = light(body, 0.6);
  for (let i = 2; i < N - 2; i++) {
    if (!(ys[i] <= ys[i - 1] && ys[i] < ys[i + 1] && ys[i] <= ys[i - 2] && ys[i] <= ys[i + 2])) continue;
    const xp = i * 4 - 4, yp = ys[i];
    for (const sd of [-S.dir, S.dir]) {
      const dark_ = sd === -S.dir;
      let j = i;
      while (j + sd > 0 && j + sd < N - 1 && ys[j + sd] >= ys[j] - 1.2 && Math.abs(j - i) < 56) j += sd;
      const drop = ys[j] - yp; if (drop < 5) continue;
      const len = Math.min(base + 30 - yp, drop * 1.25 + 26 * Math.min(reach, 1.1));
      L.beginPath(); L.moveTo(xp, yp);
      for (let k = i; k !== j + sd; k += sd) L.lineTo(k * 4 - 4, ys[k] - 0.5);
      L.lineTo(j * 4 - 4 + sd * 8, yp + len);
      const lean = S.dir * len * 0.16;
      for (let t = 1; t > 0.02; t -= 0.17) L.lineTo(xp + lean * t + (hash(i * 7 + Math.round(t * 9), seed) - 0.5) * len * 0.2 * t, yp + len * t);
      L.closePath();
      const a0 = (dark_ ? 0.46 : 0.26) * (1 - haze * 0.55);
      L.fillStyle = vgrad(L, yp, yp + len, [[0, rgba(dark_ ? shade : glow, a0)], [0.6, rgba(dark_ ? shade : glow, a0 * 0.55)], [1, rgba(dark_ ? shade : glow, 0)]]);
      L.fill();
    }
  }
  // 골짜기 주름
  L.strokeStyle = rgba(dark(body, 0.6), 0.16 * (1 - haze * 0.5)); L.lineWidth = 1;
  for (let i = 0; i < 46; i++) {
    const x = hash(i, seed + 3) * W, y = fn(x) + 6 + hash(i, seed + 4) * 30 * reach, l = (18 + hash(i, seed + 5) * 44) * reach;
    L.beginPath(); L.moveTo(x, y); L.quadraticCurveTo(x - S.dir * l * 0.2, y + l * 0.5, x - S.dir * l * (0.3 + hash(i, seed + 6) * 0.3), y + l); L.stroke();
  }
  L.restore();
  mist(L, base + 6, 44 * reach, S.haze, 0.5 + haze * 0.3);
}

/** 언덕 한 겹: 위는 빛, 아래는 조금 어둡게, 얼룩으로 결을 준다 */
export function hillBand(L, fn, color, S, o = {}) {
  const { seed = 1, depth = 90, tex = 26, hazeT = 0 } = o;
  const c = hazeT ? mixh(color, S.haze, hazeT) : color;
  const top = Math.min(fn(0), fn(W / 3), fn(W / 2), fn(W * 0.75), fn(W)) - 6;
  fillCurve(L, fn, vgrad(L, top, top + depth + 40, [[0, light(c, 0.08)], [1, dark(c, 0.12)]]));
  clipBelow(L, fn);
  for (let i = 0; i < tex; i++) {
    const x = hash(i, seed) * W, y = fn(x) + 4 + hash(i, seed + 1) * depth;
    puff(L, x, y, 50 + hash(i, seed + 2) * 110, 7 + hash(i, seed + 3) * 12, i % 2 ? dark(c, 0.3) : light(c, 0.3), 0.2);
  }
  L.restore();
}

/** 능선을 따라 선 숲의 가장자리 (먼 숲) */
export function treeline(L, fn, P, S, o = {}) {
  const { seed = 41, thr = 0.5, size = 8, haze = 0.4, x0 = 0, x1 = W, step = 4, pine = 0.5 } = o;
  const leafC = P.leaf && !P.autumn ? P.leaf : P.autumn ? '#9a6a34' : P.snow ? '#6f7a78' : '#6a5a48';
  for (let x = x0; x < x1; x += step) {
    const n = fbm1(x / 90, seed);
    if (n < thr) continue;
    const y = fn(x) + 2 + hash(x, seed + 2) * 5, h = size * (0.7 + hash(x, seed + 3) * 0.7);
    if (hash(x, seed + 5) < pine || !leafC) {
      const c = mixh(P.conifer, S.haze, haze);
      poly(L, [[x, y - h * 1.5], [x + h * 0.42, y], [x - h * 0.42, y]], c);
      if (P.snow) poly(L, [[x, y - h * 1.5], [x + h * 0.2 * S.dir, y - h * 0.7], [x - h * 0.1 * S.dir, y - h * 0.8]], rgba('#eef0ee', 0.75));
    } else {
      const c = mixh(P.autumn ? ['#b8742e', '#9a4a2a', '#c49a3a'][Math.floor(hash(x, seed + 7) * 3)] : leafC, S.haze, haze);
      L.fillStyle = dark(c, 0.25); L.beginPath(); L.arc(x, y - h * 0.5, h * 0.62, 0, 6.3); L.fill();
      L.fillStyle = c; L.beginPath(); L.arc(x + S.dir * h * 0.14, y - h * 0.62, h * 0.46, 0, 6.3); L.fill();
    }
  }
}

/** 숲 덩어리: top 곡선부터 아래로 깊이만큼 나무머리가 겹겹이 */
export function forestMass(L, topFn, depth, P, S, R, o = {}) {
  const { x0 = 0, x1 = W, size = 9, haze = 0.2, pine = 0.3, gap = () => false } = o;
  const rows = Math.max(2, Math.round(depth / (size * 0.75)));
  for (let k = 0; k < rows; k++) {
    const t = k / rows, sz = size * (0.8 + t * 0.7), hz = haze * (1 - t * 0.6);
    for (let x = x0 - sz; x < x1 + sz; x += sz * 0.95) {
      const xx = x + (R() - 0.5) * sz * 1.4, yy = topFn(xx) + t * depth + (R() - 0.5) * sz * 0.9, v = R(), sz0 = sz;
      if (gap(xx, yy)) { R(); continue; }
      { const szv = sz0 * (0.72 + v * 0.7); var szT = szv; }
      if (R() < pine || (!P.leaf && !P.autumn)) {
        const sz = szT, h = sz * 2.2, c = mixh(dark(P.conifer, v * 0.2), S.haze, hz);
        poly(L, [[xx, yy - h], [xx + sz * 0.5, yy], [xx - sz * 0.5, yy]], c);
        poly(L, [[xx, yy - h], [xx + S.dir * sz * 0.5, yy], [xx + S.dir * sz * 0.1, yy]], rgba(light(c, 0.5), 0.2));
        if (P.snow) poly(L, [[xx, yy - h], [xx + S.dir * sz * 0.28, yy - h * 0.45], [xx - S.dir * sz * 0.12, yy - h * 0.55]], rgba('#eef0ee', 0.8));
      } else {
        const sz = szT, base = P.autumn ? ['#b8742e', '#9a4a2a', '#c49a3a', '#8a6a2a'][Math.floor(R() * 4)] : P.leaf, c = mixh(v < 0.5 ? dark(base, 0.3 - v * 0.6) : light(base, (v - 0.5) * 0.24), S.haze, hz);
        L.fillStyle = dark(c, 0.32); L.beginPath(); L.arc(xx, yy - sz * 0.6, sz * 0.72, 0, 6.3); L.fill();
        L.fillStyle = c; L.beginPath(); L.arc(xx + S.dir * sz * 0.12, yy - sz * 0.74, sz * 0.56, 0, 6.3); L.fill();
        L.fillStyle = light(c, 0.22); L.beginPath(); L.arc(xx + S.dir * sz * 0.24, yy - sz * 0.9, sz * 0.3, 0, 6.3); L.fill();
      }
    }
  }
}

/** 원근이 있는 밭: 멀수록 좁고 납작한 밭뙈기 */
export function fields(L, ground, P, S, R, o = {}) {
  const { depth = 126, vx = 620, skip = () => false, vines = false } = o;
  const rows = [0, 0.1, 0.22, 0.37, 0.56, 0.78, 1.04];
  const cols = []; let u = -900;
  while (u < 2100) { cols.push(u); u += 150 + R() * 150; }
  const X = (uu, t) => vx + (uu - vx) * (0.44 + 0.56 * t);
  const Y = (x, t) => ground(x) + 4 + Math.pow(t, 1.35) * depth;
  const hedgeC = P.snow ? '#7d8a86' : mixh(P.leaf ?? P.conifer, '#1c2416', 0.4);
  for (let k = 0; k < rows.length - 1; k++) {
    const t0 = rows[k], t1 = rows[k + 1];
    for (let j = 0; j < cols.length - 1; j++) {
      const kind = Math.floor(R() * P.field.length), fur = R(), hedge = R();
      const a0 = X(cols[j], t0), a1 = X(cols[j + 1], t0), b0 = X(cols[j], t1), b1 = X(cols[j + 1], t1);
      if (Math.max(a1, b1) < -10 || Math.min(a0, b0) > W + 10) continue;
      if (skip((a0 + a1 + b0 + b1) / 4, Y((a0 + a1) / 2, (t0 + t1) / 2))) continue;
      const col = P.field[kind];
      L.beginPath();
      for (let q = 0; q <= 6; q++) { const x = a0 + (a1 - a0) * q / 6; q ? L.lineTo(x, Y(x, t0)) : L.moveTo(x, Y(x, t0)); }
      for (let q = 6; q >= 0; q--) { const x = b0 + (b1 - b0) * q / 6; L.lineTo(x, Y(x, t1)); }
      L.closePath();
      L.fillStyle = vgrad(L, Y(a0, t0), Y(b0, t1), [[0, mixh(col, S.haze, 0.22 * (1 - t0))], [1, mixh(col, S.haze, 0.1 * (1 - t1))]]);
      L.fill();
      // 이랑: 가로줄 또는 소실점으로 모이는 세로줄
      L.strokeStyle = P.snow ? 'rgba(120,132,144,.2)' : 'rgba(44,32,20,.13)'; L.lineWidth = 0.8; L.beginPath();
      if (vines && kind % 2 === 0 && !P.snow) {
        L.strokeStyle = rgba(dark(P.leaf ?? '#5a5030', 0.3), 0.55); L.lineWidth = 1.5;
        for (let q = 1; q < 9; q++) { const f = q / 9; L.moveTo(a0 + (a1 - a0) * f, Y(a0 + (a1 - a0) * f, t0)); L.lineTo(b0 + (b1 - b0) * f, Y(b0 + (b1 - b0) * f, t1)); }
      } else if (fur < 0.5) {
        const n = 3 + Math.round((t1 - t0) * 26);
        for (let q = 1; q < n; q++) { const t = t0 + (t1 - t0) * q / n, xa = X(cols[j], t), xb = X(cols[j + 1], t); L.moveTo(xa, Y(xa, t)); L.lineTo((xa + xb) / 2, Y((xa + xb) / 2, t)); L.lineTo(xb, Y(xb, t)); }
      } else {
        for (let q = 1; q < 10; q++) { const f = q / 10; L.moveTo(a0 + (a1 - a0) * f, Y(a0 + (a1 - a0) * f, t0)); L.lineTo(b0 + (b1 - b0) * f, Y(b0 + (b1 - b0) * f, t1)); }
      }
      L.stroke();
      // 산울타리
      L.fillStyle = hedgeC;
      const hs = 1.2 + t1 * 2.4;
      L.strokeStyle = hedgeC; L.lineCap = 'round'; L.lineWidth = hs * 1.25;
      if (hedge < 0.6) {
        L.beginPath(); for (let q = 0; q <= 8; q++) { const x = a0 + (a1 - a0) * q / 8, y = Y(x, t0) + (hash(q, j * 13 + k) - 0.5) * hs * 0.5; q ? L.lineTo(x, y) : L.moveTo(x, y); } L.stroke();
        for (let q = 0; q < 3; q++) if (hash(q, j * 7 + k * 3) < 0.5) { const x = a0 + (a1 - a0) * hash(q, j + k * 17), y = Y(x, t0); L.beginPath(); L.ellipse(x, y - hs * 1.1, hs * 1.5, hs * 1.9, 0, 0, 6.3); L.fill(); }
      }
      if (hedge > 0.3) { L.beginPath(); for (let q = 0; q <= 8; q++) { const t = t0 + (t1 - t0) * q / 8, x = X(cols[j], t) + (hash(q, j + k * 31) - 0.5) * hs * 0.5; q ? L.lineTo(x, Y(x, t)) : L.moveTo(x, Y(x, t)); } L.stroke(); }
      L.lineCap = 'butt';
      if (P.sheaves && kind % 2 === 0) {
        for (let q = 0; q < 5; q++) { const f = R(), t = t0 + (t1 - t0) * R(), x = X(cols[j] + (cols[j + 1] - cols[j]) * f, t), y = Y(x, t), s = 2.5 + t * 4; poly(L, [[x, y - s * 1.6], [x + s * 0.7, y], [x - s * 0.7, y]], '#c9a65a', 'rgba(90,70,36,.6)', 0.6); }
      }
      if (P.snowPatch && R() < 0.5) puff(L, (a0 + a1) / 2, Y((a0 + a1) / 2, (t0 + t1) / 2), 26 + t1 * 30, 4 + t1 * 6, '#e8eae8', 0.7);
    }
  }
}

/** 수면: 멀리는 하늘빛, 가까이는 물빛. 해나 달의 빛기둥과 잔물결 */
// 물이 그려진 곳 (움직임: 물결 반짝임, sceneMotion.js). 그림 하나를 그릴 때마다 비운다.
let waterLog = [];
export function takeWater() { const w = waterLog; waterLog = []; return w; }
export function water(L, topFn, botFn, P, S, R, o = {}) {
  const { x0 = 0, x1 = W, y0 = HZ, y1 = H } = o;
  if (!P.frozen && waterLog.length < 6 && x1 - x0 > 60) waterLog.push([Math.round(x0), Math.round(x1), Math.round(Math.max(y0, topFn((x0 + x1) / 2)) + 2), Math.round(Math.min(y1, botFn((x0 + x1) / 2)))]);
  L.save();
  L.beginPath(); trace(L, topFn, x0, x1, 8); for (let x = x1; x >= x0; x -= 8) L.lineTo(x, botFn(x)); L.closePath(); L.clip();
  const far = mixh(P.water, S.low, 0.55), near = P.frozen ? '#c8d4da' : dark(P.water, 0.12);
  L.fillStyle = vgrad(L, y0, y1, [[0, far], [1, near]]); L.fillRect(x0, y0 - 10, x1 - x0, y1 - y0 + 20);
  if (!P.frozen) {
    for (let i = 0; i < 150; i++) {
      const t = R() ** 1.6, y = y0 + 2 + t * (y1 - y0), x = x0 + R() * (x1 - x0), w = 8 + t * 46;
      L.strokeStyle = rgba(i % 3 ? light(far, 0.5) : dark(near, 0.4), 0.14 + R() * 0.16); L.lineWidth = 0.8 + t * 1.2;
      L.beginPath(); L.moveTo(x, y); L.lineTo(x + w, y); L.stroke();
    }
    const src = S.sun || S.moon;
    if (src && !S.overcast && src[0] > x0 && src[0] < x1) {
      for (let i = 0; i < 70; i++) {
        const t = R(), y = y0 + 1 + t * (y1 - y0) * 0.9, w = (6 + t * 30) * (0.4 + R()), x = src[0] + (R() - 0.5) * (30 + t * 110);
        L.strokeStyle = rgba(S.sunC || '#dfe4f0', (S.sun ? 0.5 : 0.3) * (1 - t * 0.5)); L.lineWidth = 1 + t;
        L.beginPath(); L.moveTo(x - w / 2, y); L.lineTo(x + w / 2, y); L.stroke();
      }
    }
  } else {
    for (let i = 0; i < 30; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0); L.strokeStyle = 'rgba(255,255,255,.3)'; L.lineWidth = 1; L.beginPath(); L.moveTo(x, y); L.lineTo(x + 20 + R() * 50, y + (R() - 0.5) * 4); L.stroke(); }
  }
  L.restore();
}

/* ---------- 나무 ---------- */
function branch(L, x, y, a, len, w, depth, R, snow) {
  const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
  L.lineWidth = Math.max(0.5, w); L.beginPath(); L.moveTo(x, y); L.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (R() - 0.5) * len * 0.2, y + Math.sin(a) * len * 0.5, x2, y2); L.stroke();
  if (snow && depth < 2 && Math.abs(Math.cos(a)) > 0.5) { const s = L.strokeStyle; L.strokeStyle = 'rgba(240,242,242,.75)'; L.lineWidth = Math.max(0.6, w * 0.6); L.beginPath(); L.moveTo(x + (x2 - x) * 0.3, y + (y2 - y) * 0.3 - w * 0.5); L.lineTo(x2, y2 - w * 0.5); L.stroke(); L.strokeStyle = s; }
  if (depth <= 0 || len < 3) return;
  const n = 2 + (R() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) branch(L, x + (x2 - x) * (0.55 + R() * 0.45), y + (y2 - y) * (0.55 + R() * 0.45), a + (R() - 0.5) * 1.5, len * (0.55 + R() * 0.25), w * 0.6, depth - 1, R, snow);
}
/** 잎 넓은 나무. (x, y)는 밑동, r은 수관 반지름. o: { dead, big } */
export function tree(L, x, y, r, P, S, R, o = {}) {
  const th = r * (o.big ? 1.5 : 1.0), tw = Math.max(1.2, r * 0.17);
  const bare = o.dead || (!P.leaf && !P.autumn);
  const trunkC = o.dead ? P.trunk : '#3c2e22';
  poly(L, [[x - tw * 0.6, y], [x + tw * 0.6, y], [x + tw * 0.32, y - th], [x - tw * 0.3, y - th]], trunkC);
  poly(L, [[x + S.dir * tw * 0.6, y], [x + S.dir * tw * 0.2, y], [x + S.dir * tw * 0.1, y - th], [x + S.dir * tw * 0.32, y - th]], rgba(light(trunkC, 0.6), 0.25));
  if (bare) {
    L.strokeStyle = trunkC; L.lineCap = 'round';
    const n = o.big ? 5 : 3;
    for (let i = 0; i < n; i++) branch(L, x, y - th * (0.55 + (i / n) * 0.45), -Math.PI / 2 + ((i + 0.5) / n - 0.5) * 2.3 + (R() - 0.5) * 0.4, r * (0.6 + R() * 0.5), tw * 0.55, o.big ? 3 : 2, R, P.snow && !o.dead);
    L.lineCap = 'butt';
    return;
  }
  const cy = y - th - r * 0.45;
  const base = P.autumn ? ['#b8742e', '#9a4a2a', '#c49a3a', '#8a6a2a', '#a85c2a'][Math.floor(R() * 5)] : P.leaf;
  const thin = P.autumn && P.autumn < 1;
  const n = Math.round(clamp(r * 1.1, 7, 64));
  if (thin) { L.strokeStyle = trunkC; L.lineCap = 'round'; for (let i = 0; i < 3; i++) branch(L, x, y - th * (0.7 + i * 0.12), -Math.PI / 2 + (i - 1) * 0.8, r * 0.8, tw * 0.5, 1, R, false); L.lineCap = 'butt'; }
  const pass = (c, ox, oy, sx, sy, cnt, rr) => { L.fillStyle = c; for (let i = 0; i < cnt; i++) { if (thin && R() < 0.5) { R(); R(); R(); continue; } const a = R() * 6.283, d = Math.sqrt(R()); L.beginPath(); L.arc(x + ox + Math.cos(a) * d * r * sx, cy + oy + Math.sin(a) * d * r * sy, r * (rr + R() * rr * 0.9), 0, 6.3); L.fill(); } };
  pass(dark(base, 0.42), -S.dir * r * 0.1, r * 0.16, 0.95, 0.72, n, 0.2);
  pass(base, 0, 0, 0.9, 0.66, n, 0.19);
  pass(light(base, 0.2), S.dir * r * 0.2, -r * 0.2, 0.7, 0.5, Math.round(n * 0.7), 0.13);
  pass(light(base, 0.42), S.dir * r * 0.32, -r * 0.34, 0.5, 0.34, Math.round(n * 0.4), 0.08);
  if (P.blossom && R() < P.blossom * 2) { for (let i = 0; i < n * 1.6; i++) { L.fillStyle = R() < 0.5 ? '#f0dcd8' : '#e4bcc0'; const a = R() * 6.283, d = Math.sqrt(R()); L.beginPath(); L.arc(x + Math.cos(a) * d * r * 0.95, cy + Math.sin(a) * d * r * 0.7, Math.max(0.9, r * 0.05) + R(), 0, 6.3); L.fill(); } }
}
/** 바늘잎 나무 */
export function conifer(L, x, y, h, P, S, R) {
  const c = P.conifer;
  L.fillStyle = P.trunk; L.fillRect(x - h * 0.03, y - h * 0.16, h * 0.06, h * 0.16);
  const tiers = 5;
  for (let k = 0; k < tiers; k++) {
    const t = k / tiers, w = h * (0.3 - t * 0.2), yy = y - h * 0.1 - t * h * 0.72, top = yy - h * 0.3;
    poly(L, [[x - w, yy], [x - w * 0.5, yy - h * 0.03], [x, top], [x + w * 0.5, yy - h * 0.03], [x + w, yy], [x + w * 0.4, yy + h * 0.02], [x, yy - h * 0.02], [x - w * 0.4, yy + h * 0.02]], dark(c, k * 0.03));
    poly(L, [[x, top], [x + S.dir * w, yy], [x + S.dir * w * 0.2, yy - h * 0.02]], rgba(light(c, 0.5), 0.22));
    if (P.snow) poly(L, [[x, top], [x + S.dir * w * 0.75, yy - h * 0.03], [x + S.dir * w * 0.15, yy - h * 0.1], [x - S.dir * w * 0.3, yy - h * 0.08]], rgba('#eef0ee', 0.85));
  }
}
/** 야자나무 (남쪽 섬) */
export function palm(L, x, y, h, P, S, R) {
  const lean = (R() - 0.5) * h * 0.4;
  L.strokeStyle = '#4a3a28'; L.lineWidth = Math.max(1.4, h * 0.05); L.lineCap = 'round';
  L.beginPath(); L.moveTo(x, y); L.quadraticCurveTo(x + lean * 0.2, y - h * 0.6, x + lean, y - h); L.stroke();
  const leafC = P.leaf ?? '#4c6834';
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.48 + (R() - 0.5) * 0.2, l = h * (0.42 + R() * 0.14), ex = x + lean + Math.cos(a) * l, ey = y - h + Math.sin(a) * l * 0.6 + l * 0.34;
    L.strokeStyle = i % 2 ? leafC : dark(leafC, 0.3); L.lineWidth = Math.max(1.2, h * 0.045);
    L.beginPath(); L.moveTo(x + lean, y - h); L.quadraticCurveTo(x + lean + Math.cos(a) * l * 0.6, y - h + Math.sin(a) * l * 0.7, ex, ey); L.stroke();
  }
  L.lineCap = 'butt';
}
export function rock(L, x, y, w, h, P, S, R) {
  const c = P.snow ? mixh(P.rock, '#c8ccd0', 0.3) : P.rock;
  const pts = [[x - w, y], [x - w * 0.8, y - h * 0.6], [x - w * 0.25, y - h], [x + w * 0.4, y - h * 0.85], [x + w, y - h * 0.3], [x + w * 1.05, y]];
  poly(L, pts, c);
  poly(L, S.dir > 0 ? [[x - w, y], [x - w * 0.8, y - h * 0.6], [x - w * 0.25, y - h], [x, y - h * 0.4], [x - w * 0.1, y]] : [[x + w * 1.05, y], [x + w, y - h * 0.3], [x + w * 0.4, y - h * 0.85], [x + w * 0.1, y - h * 0.35], [x + w * 0.2, y]], rgba('#14121a', 0.32));
  if (P.snow) poly(L, [[x - w * 0.8, y - h * 0.6], [x - w * 0.25, y - h], [x + w * 0.4, y - h * 0.85], [x + w * 0.1, y - h * 0.7], [x - w * 0.4, y - h * 0.55]], rgba('#f0f2f2', 0.85));
}
export function reedClump(L, x, y, h, P, R) {
  L.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const dx = (R() - 0.5) * h * 0.6, l = h * (0.5 + R() * 0.5); L.strokeStyle = P.snow ? '#8a8468' : mixh(P.grass2, '#6a6238', R() * 0.6); L.lineWidth = 1.1; L.beginPath(); L.moveTo(x + dx, y); L.quadraticCurveTo(x + dx * 1.2, y - l * 0.6, x + dx * 1.6 + (R() - 0.5) * 4, y - l); L.stroke(); if (R() < 0.4) { L.strokeStyle = '#4a3a26'; L.lineWidth = 2.2; L.beginPath(); L.moveTo(x + dx * 1.5, y - l * 0.9); L.lineTo(x + dx * 1.6, y - l * 1.05); L.stroke(); } }
  L.lineCap = 'butt';
}

/** 앞쪽 풀밭: 가까운 땅, 풀잎, 들꽃 */
export function foreground(L, fn, P, S, R, o = {}) {
  const { month = 6, flowers = true, color = P.grass } = o;
  fillCurve(L, fn, vgrad(L, 370, H, [[0, color], [1, dark(color, 0.3)]]));
  clipBelow(L, fn);
  for (let i = 0; i < 40; i++) { const x = R() * W, y = fn(x) + R() * (H - fn(x)); puff(L, x, y, 60 + R() * 120, 8 + R() * 12, i % 2 ? dark(color, 0.35) : light(color, 0.25), 0.22); }
  L.restore();
  if (P.blight) {
    for (let i = 0; i < 60; i++) { const x = R() * W, y = fn(x) + 6 + R() * (H - fn(x)), l = 8 + R() * 26; L.strokeStyle = rgba('#1c1214', 0.35); L.lineWidth = 1; L.beginPath(); L.moveTo(x, y); L.lineTo(x + l * 0.5, y + (R() - 0.5) * 5); L.lineTo(x + l, y + (R() - 0.5) * 7); L.stroke(); }
    return;
  }
  for (let i = 0; i < 1000; i++) {
    const x = R() * W, t = R(), y = fn(x) + 3 + t * (H - fn(x)), l = 3 + t * 7 + R() * 4;
    L.strokeStyle = P.snow ? rgba('#8e9aa2', 0.2 + R() * 0.3) : mixh(P.grass2, R() < 0.3 ? light(P.grass, 0.3) : '#1b2412', R() * 0.45);
    L.lineWidth = 1; L.beginPath(); L.moveTo(x, y); L.lineTo(x + (R() - 0.5) * 4, y - l); L.stroke();
  }
  if (flowers && month >= 4 && month <= 8 && !P.snow) {
    const n = month <= 6 ? 150 : 70;
    for (let i = 0; i < n; i++) { const x = R() * W, y = fn(x) + 8 + R() * (H - fn(x) - 8); L.fillStyle = ['#efe2b4', '#dca4ac', '#cdb450', '#bcb4dc', '#f2f0e8'][Math.floor(R() * 5)]; L.beginPath(); L.arc(x, y, 1 + R() * 1.1, 0, 6.3); L.fill(); }
  }
}
export { dull };

/** 모래 언덕: 빛 받는 비탈과 그늘 비탈이 갈리는 매끈한 능선 (38단계, 메마른 땅) */
export function dunes(L, base, P, S, seed = 1, o = {}) {
  const amp = o.amp ?? 26, n = o.n ?? 3, sandC = mixh(P.sand ?? '#d8b880', S.haze, o.haze ?? 0.25);
  const lit = light(sandC, 0.18), shade = mixh(dark(sandC, 0.3), S.sh, 0.35), dir = S.dir ?? 1;
  for (let j = 0; j < n; j++) {
    const yb = base + j * (o.gap ?? 14), a = amp * (0.6 + j * 0.25), s0 = seed + j * 7;
    const fn = (x) => yb - Math.abs(Math.sin(x / (170 + j * 40) + s0)) * a - fbm1(x / 300 + s0, s0, 2) * a * 0.4;
    fillCurve(L, fn, j === n - 1 ? sandC : mixh(sandC, S.haze, 0.25 - j * 0.08));
    // 능선 따라 그늘 쪽을 어둡게: 꼭대기 가까이, 빛 반대편
    clipBelow(L, fn);
    for (let x = 0; x < W; x += 6) {
      const d = fn(x + dir * 6) - fn(x); // 빛 쪽으로 내려가면 그늘
      if (d > 0.4) { L.fillStyle = rgba(shade, Math.min(0.55, d * 0.12)); L.fillRect(x, fn(x), 6, 26 + j * 8); }
      else if (d < -0.4) { L.fillStyle = rgba(lit, Math.min(0.35, -d * 0.08)); L.fillRect(x, fn(x), 6, 16); }
    }
    L.restore();
  }
}
