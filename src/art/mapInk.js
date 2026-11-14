// 지도 위에 펜으로 그리는 기호들: 산, 언덕, 나무, 밭, 늪, 배. 모두 캔버스에 세계 단위로 그린다.
// r(0~1)은 기호마다 다른 씨앗이라, 같은 자리의 기호는 늘 같은 모양이 된다.

export const INK = '#38291c';
const fr = (r, i) => { const v = Math.sin((r + 0.137) * (i * 127.1 + 311.7)) * 43758.5453; return v - Math.floor(v); };
const qb = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];

export const PAL = {
  land: { paper: '#efe4c8', shade: 'rgba(86,62,40,0.27)', leaf: '#c4c69a', leafShade: '#989e70', fir: '#b3ba8e', firShade: '#8b966b' },
  elf: { paper: '#ece6c8', shade: 'rgba(70,66,40,0.27)', leaf: '#bdc79c', leafShade: '#8d9c72', fir: '#aebd92', firShade: '#869a6e' },
  cold: { paper: '#f2eee2', shade: 'rgba(70,70,76,0.25)', leaf: '#c4c8a6', leafShade: '#a0a684', fir: '#b4bca0', firShade: '#8c967c' },
  blight: { paper: '#ecd6c4', shade: 'rgba(104,44,36,0.28)', leaf: '#cdb49c', leafShade: '#a98c78', fir: '#c0a690', firShade: '#9a7e6c' },
};

export function inkSetup(ctx) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; }

/** 산봉우리. (x, y)는 밑변 가운데, s는 반너비. o: { pal, snow } */
export function mountain(ctx, x, y, s, r, o = {}) {
  const pal = o.pal || PAL.land;
  const h = s * (1.2 + fr(r, 1) * 0.55);
  const P = [x + s * (fr(r, 2) - 0.5) * 0.45, y - h];
  const A = [x - s * (0.95 + fr(r, 3) * 0.25), y], B = [x + s * (0.9 + fr(r, 4) * 0.3), y];
  const kl = [A[0] + (P[0] - A[0]) * 0.52 - s * 0.1 * fr(r, 7), y - h * (0.4 + fr(r, 8) * 0.12)];
  const kr = [P[0] + (B[0] - P[0]) * 0.42 + s * 0.12 * fr(r, 9), P[1] + h * (0.5 + fr(r, 10) * 0.1)];
  const F = [x + s * (0.05 + fr(r, 5) * 0.25), y];
  const rm = [P[0] + (F[0] - P[0]) * 0.5 + s * (fr(r, 6) - 0.35) * 0.3, P[1] + h * 0.5];
  // 몸 (뒤 봉우리를 가린다)
  ctx.fillStyle = pal.paper;
  ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(kl[0], kl[1], P[0], P[1]); ctx.quadraticCurveTo(kr[0], kr[1], B[0], B[1]); ctx.closePath(); ctx.fill();
  // 오른쪽 그늘
  ctx.fillStyle = pal.shade;
  ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.quadraticCurveTo(kr[0], kr[1], B[0], B[1]); ctx.lineTo(F[0], F[1]); ctx.quadraticCurveTo(rm[0], rm[1], P[0], P[1]); ctx.fill();
  // 눈 덮인 꼭대기
  if (o.snow) {
    const t = 0.3 + fr(r, 11) * 0.12;
    const a = qb(P, kl, A, t), b = qb(P, kr, B, t * 0.9), m = qb(P, rm, F, t * 1.15);
    ctx.fillStyle = '#fbf8ee';
    ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo((a[0] + m[0]) / 2, (a[1] + m[1]) / 2 - s * 0.1); ctx.lineTo(m[0], m[1]); ctx.lineTo((m[0] + b[0]) / 2, (m[1] + b[1]) / 2 - s * 0.08); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill();
  }
  // 그늘 빗금
  const n = s > 9 ? 6 : s > 6 ? 4 : 3;
  ctx.lineWidth = 0.32; ctx.beginPath();
  for (let q = 1; q <= n; q++) {
    const t = (q - 0.3) / (n + 0.6), a = qb(P, rm, F, t);
    const len = Math.min(s * 0.5, (y - a[1]) * 0.95);
    if (len < 0.6) continue;
    ctx.moveTo(a[0] + s * 0.03, a[1] + s * 0.03); ctx.lineTo(a[0] + len * 0.5, a[1] + len * 0.86);
  }
  ctx.stroke();
  // 윤곽과 능선
  ctx.lineWidth = s > 9 ? 0.75 : 0.6;
  ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(kl[0], kl[1], P[0], P[1]); ctx.quadraticCurveTo(kr[0], kr[1], B[0], B[1]); ctx.stroke();
  ctx.lineWidth = 0.4;
  const e = qb(P, rm, F, 0.82);
  ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.quadraticCurveTo(rm[0], rm[1], e[0], e[1]); ctx.stroke();
  // 왼 비탈의 잔주름
  if (s > 7) {
    const a = qb(A, kl, P, 0.45), b = qb(A, kl, P, 0.7);
    ctx.lineWidth = 0.28; ctx.beginPath();
    ctx.moveTo(a[0] + s * 0.12, a[1] + s * 0.02); ctx.lineTo(a[0] + s * 0.2, a[1] + s * 0.3);
    ctx.moveTo(b[0] + s * 0.1, b[1] + s * 0.04); ctx.lineTo(b[0] + s * 0.2, b[1] + s * 0.36);
    ctx.stroke();
  }
}

export function hill(ctx, x, y, s, r, o = {}) {
  const pal = o.pal || PAL.land;
  const top = y - s * (0.55 + fr(r, 1) * 0.2);
  ctx.fillStyle = pal.paper;
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.6, top, x, top); ctx.quadraticCurveTo(x + s * 0.7, top + s * 0.05, x + s * 1.1, y); ctx.closePath(); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.6, top, x, top); ctx.quadraticCurveTo(x + s * 0.7, top + s * 0.05, x + s * 1.1, y); ctx.stroke();
  ctx.lineWidth = 0.28; ctx.beginPath();
  for (let q = 0; q < 3; q++) { const px = x + s * (0.25 + q * 0.24), py = top + s * (0.16 + q * 0.17); ctx.moveTo(px, py); ctx.lineTo(px + s * 0.14, py + s * 0.3); }
  ctx.stroke();
}

/** 잎 넓은 나무: 뭉게뭉게 세 덩이로 된 수관. (x, y)는 밑동 */
export function tree(ctx, x, y, s, r, o = {}) {
  const pal = o.pal || PAL.land;
  const R = s * 0.9, cx = x + (fr(r, 1) - 0.5) * s * 0.2, cy = y - s * 1.05;
  const k = 0.5 + fr(r, 2) * 0.14;
  const lobes = [[cx - R * 0.5, cy + R * 0.32, R * k], [cx + R * 0.52, cy + R * 0.36, R * (1.08 - k)], [cx, cy - R * 0.12, R * 0.78]];
  ctx.lineWidth = 0.42;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, cy + R * 0.5); ctx.stroke();
  ctx.fillStyle = pal.leafShade; ctx.beginPath();
  for (const [lx, ly, lr] of lobes) { ctx.moveTo(lx + lr, ly); ctx.arc(lx, ly, lr, 0, 6.2832); }
  ctx.fill();
  ctx.fillStyle = pal.leaf; ctx.beginPath();
  for (const [lx, ly, lr] of lobes) { ctx.moveTo(lx + lr * 0.56, ly - lr * 0.2); ctx.arc(lx - lr * 0.2, ly - lr * 0.2, lr * 0.76, 0, 6.2832); }
  ctx.fill();
  ctx.lineWidth = 0.32; ctx.beginPath();
  let l = lobes[0]; ctx.moveTo(l[0] + Math.cos(1.9) * l[2], l[1] + Math.sin(1.9) * l[2]); ctx.arc(l[0], l[1], l[2], 1.9, 4.5);
  l = lobes[2]; ctx.moveTo(l[0] + Math.cos(3.3) * l[2], l[1] + Math.sin(3.3) * l[2]); ctx.arc(l[0], l[1], l[2], 3.3, 6.1);
  l = lobes[1]; ctx.moveTo(l[0] + Math.cos(-1.3) * l[2], l[1] + Math.sin(-1.3) * l[2]); ctx.arc(l[0], l[1], l[2], -1.3, 1.3);
  ctx.stroke();
}

/** 바늘잎 나무 */
export function fir(ctx, x, y, s, r, o = {}) {
  const pal = o.pal || PAL.land;
  const h = s * (2.3 + fr(r, 1) * 0.5), w = s * 0.8;
  ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.5); ctx.stroke();
  const tier = (by, ty, hw) => {
    ctx.fillStyle = pal.fir; ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + hw, by); ctx.lineTo(x - hw, by); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.firShade; ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + hw, by); ctx.lineTo(x + hw * 0.1, by); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 0.34; ctx.beginPath(); ctx.moveTo(x - hw, by); ctx.lineTo(x, ty); ctx.lineTo(x + hw, by); ctx.stroke();
  };
  tier(y - s * 0.4, y - h * 0.72, w);
  tier(y - h * 0.42, y - h, w * 0.72);
}

export function deadTree(ctx, x, y, s, r) {
  const lean = (fr(r, 1) - 0.5) * s * 0.5;
  ctx.lineWidth = 0.5; ctx.beginPath();
  ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.3, y - s, x + lean, y - s * 2);
  ctx.stroke();
  ctx.lineWidth = 0.34; ctx.beginPath();
  ctx.moveTo(x + lean * 0.3, y - s * 0.9); ctx.lineTo(x - s * 0.7, y - s * 1.6);
  ctx.moveTo(x + lean * 0.5, y - s * 1.2); ctx.lineTo(x + s * 0.8 + lean, y - s * 1.7);
  ctx.moveTo(x - s * 0.4, y - s * 1.3); ctx.lineTo(x - s * 0.5, y - s * 1.9);
  if (fr(r, 2) > 0.5) { ctx.moveTo(x + lean * 0.8, y - s * 1.6); ctx.lineTo(x + lean - s * 0.4, y - s * 2.1); }
  ctx.stroke();
}

export function reeds(ctx, x, y, s, r) {
  ctx.lineWidth = 0.34; ctx.beginPath();
  for (let q = -1; q <= 1; q++) { ctx.moveTo(x + q * s * 0.35, y); ctx.lineTo(x + q * s * 0.55, y - s * (0.9 - Math.abs(q) * 0.25)); }
  ctx.moveTo(x - s * 1.4, y + s * 0.15); ctx.lineTo(x - s * 0.5, y + s * 0.15);
  ctx.moveTo(x + s * 0.5, y + s * 0.15); ctx.lineTo(x + s * (1.2 + fr(r, 1)), y + s * 0.15);
  ctx.moveTo(x - s * 0.6, y + s * 0.6); ctx.lineTo(x + s * 0.7, y + s * 0.6);
  ctx.stroke();
}

export function tuft(ctx, x, y, s) {
  ctx.lineWidth = 0.3; ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x, y - s); ctx.moveTo(x - s * 0.3, y); ctx.lineTo(x - s * 0.65, y - s * 0.7); ctx.moveTo(x + s * 0.3, y); ctx.lineTo(x + s * 0.65, y - s * 0.7);
  ctx.stroke();
}

export function dune(ctx, x, y, s, r) {
  ctx.lineWidth = 0.34; ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.2, y - s * (0.5 + fr(r, 1) * 0.3), x + s, y);
  ctx.stroke();
  ctx.fillStyle = INK;
  for (let q = 0; q < 3; q++) ctx.fillRect(x - s * 0.6 + q * s * 0.6 + fr(r, q + 2) * 0.6, y + 0.8 + fr(r, q + 5) * 1.2, 0.34, 0.34);
}

export function crack(ctx, x, y, s, r) {
  ctx.lineWidth = 0.36; ctx.beginPath();
  ctx.moveTo(x - s, y - s * 0.3); ctx.lineTo(x - s * 0.2, y + s * 0.1); ctx.lineTo(x + s * 0.2, y - s * 0.4); ctx.lineTo(x + s, y + s * 0.2);
  ctx.moveTo(x - s * 0.2, y + s * 0.1); ctx.lineTo(x - s * 0.1 + fr(r, 1) * s * 0.4, y + s * 0.8);
  ctx.stroke();
}

/** 갈아 놓은 밭 한 뙈기 */
export function field(ctx, x, y, w, h, ang, r) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.transform(1, 0, -0.25, 1, 0, 0);
  ctx.fillStyle = fr(r, 1) > 0.5 ? 'rgba(214,196,128,0.5)' : 'rgba(190,196,138,0.5)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.globalAlpha = 0.6; ctx.lineWidth = 0.26; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.beginPath();
  const n = Math.max(2, Math.round(h / 1.1));
  for (let q = 1; q < n; q++) { const yy = -h / 2 + (h * q) / n; ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); }
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.restore();
}

/** 바다의 잔물결 */
export function wave(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - s * 1.5, y); ctx.quadraticCurveTo(x - s * 0.75, y - s * 0.7, x, y); ctx.quadraticCurveTo(x + s * 0.75, y - s * 0.7, x + s * 1.5, y);
  ctx.stroke();
}

export function ship(ctx, x, y, s, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
  ctx.lineWidth = 0.16; ctx.fillStyle = '#e9dcba';
  ctx.beginPath(); ctx.moveTo(0, 0.2); ctx.lineTo(0, -3.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.15, -3.5); ctx.quadraticCurveTo(2.4, -2.3, 0.15, -0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.2, -3.1); ctx.quadraticCurveTo(-1.9, -1.9, -0.2, -0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a4330';
  ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.quadraticCurveTo(-1.6, 1.3, 0, 1.3); ctx.quadraticCurveTo(1.8, 1.3, 2.9, -0.35); ctx.lineTo(1.9, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -3.6); ctx.lineTo(0.9, -3.85); ctx.lineTo(0, -4.1); ctx.stroke();
  ctx.globalAlpha = 0.55; ctx.lineWidth = 0.13;
  ctx.beginPath(); ctx.moveTo(-3.6, 1.7); ctx.quadraticCurveTo(-2.9, 1.2, -2.2, 1.7); ctx.moveTo(2, 1.7); ctx.quadraticCurveTo(2.8, 1.2, 3.6, 1.7); ctx.moveTo(-1, 2.3); ctx.quadraticCurveTo(-0.2, 1.8, 0.6, 2.3); ctx.stroke();
  ctx.restore();
}

/** 물 위로 등을 내민 바다뱀 */
export function serpent(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const hump = (cx, w, h) => {
    ctx.fillStyle = '#b9bfa8';
    ctx.beginPath(); ctx.moveTo(cx - w, 0); ctx.quadraticCurveTo(cx, -h * 2, cx + w, 0); ctx.quadraticCurveTo(cx, -h * 0.9, cx - w, 0); ctx.fill();
    ctx.lineWidth = 0.2; ctx.stroke();
    ctx.lineWidth = 0.12; ctx.beginPath();
    for (let q = -2; q <= 2; q++) { const px = cx + q * w * 0.28, py = -h * (1 - (q * q) / 6.5); ctx.moveTo(px, py); ctx.lineTo(px + 0.1, py + h * 0.42); }
    ctx.stroke();
  };
  hump(4.2, 1.6, 1.3); hump(0.6, 2, 1.9);
  // 머리와 목
  ctx.fillStyle = '#b9bfa8'; ctx.lineWidth = 0.2;
  ctx.beginPath(); ctx.moveTo(-2.2, 0); ctx.quadraticCurveTo(-3.4, -3.4, -4.6, -4.2); ctx.quadraticCurveTo(-6.2, -4.6, -6.9, -3.4); ctx.lineTo(-5.4, -3.3); ctx.quadraticCurveTo(-4.4, -2.6, -4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(-5.6, -4.05, 0.3, 0.3);
  ctx.lineWidth = 0.13; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(-5, 0.5); ctx.quadraticCurveTo(-3.2, -0.1, -1.6, 0.5); ctx.moveTo(-1.8, 0.6); ctx.quadraticCurveTo(0.6, 0, 3, 0.6); ctx.moveTo(2.4, 0.5); ctx.quadraticCurveTo(4.2, 0, 6.2, 0.5); ctx.stroke();
  ctx.restore();
}

/** 높이가 같은 곳을 잇는 선을 한 번에 긋는다 (바닷가 윤곽, 물결선). F는 W×H 값 */
export function contour(ctx, F, W, H, level, ox = 0, oy = 0) {
  ctx.beginPath();
  for (let y = 0; y < H - 1; y++) {
    let i = y * W;
    for (let x = 0; x < W - 1; x++, i++) {
      const a = F[i] - level, b = F[i + 1] - level, c = F[i + W + 1] - level, d = F[i + W] - level;
      const m = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
      if (m === 0 || m === 15) continue;
      const tx = x + a / (a - b) + ox, ty = y + oy, rx = x + 1 + ox, ry = y + b / (b - c) + oy;
      const bx = x + d / (d - c) + ox, by = y + 1 + oy, lx = x + ox, ly = y + a / (a - d) + oy;
      switch (m) {
        case 1: case 14: ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); break;
        case 2: case 13: ctx.moveTo(tx, ty); ctx.lineTo(rx, ry); break;
        case 3: case 12: ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); break;
        case 4: case 11: ctx.moveTo(rx, ry); ctx.lineTo(bx, by); break;
        case 6: case 9: ctx.moveTo(tx, ty); ctx.lineTo(bx, by); break;
        case 7: case 8: ctx.moveTo(lx, ly); ctx.lineTo(bx, by); break;
        case 5: ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.moveTo(rx, ry); ctx.lineTo(bx, by); break;
        default: ctx.moveTo(tx, ty); ctx.lineTo(rx, ry); ctx.moveTo(lx, ly); ctx.lineTo(bx, by);
      }
    }
  }
  ctx.stroke();
}
