// 사람 사는 곳 그리기: 문화권마다 다른 집, 성벽, 탑, 눈에 띄는 건물.
// 모든 건물은 빛 받는 면과 그늘 면을 따로 칠한다. 그늘은 빛 반대쪽(sd)에 진다.
import { W, H, hash, mixh, rgba, dark, light, clamp, poly, puff, vgrad } from './sceneKit.js';

const GOLD = '#c9a25a';
export const STYLE = {
  leonia: { walls: ['#d8c8a6', '#cbb894', '#c2b08c', '#d4c4a2'], roofs: ['#9a7a46', '#96763f', '#5a5650', '#8a5a40'], timber: '#4a3624', stone: '#a79c88', cap: '#5a4a3e', tall: 1, glow: '#ffc878' },
  serenia: { walls: ['#d9d6cc', '#cfd0cc', '#c8c4b8'], roofs: ['#4a5a78', '#56607a', '#3e4c66'], stone: '#c2c2bc', cap: '#3e4c6e', tall: 1.3, glow: '#bcd8ff' },
  empire: { walls: ['#b4aa9a', '#a89e90', '#bcb2a2'], roofs: ['#8a4434', '#7c3c30', '#944a38'], stone: '#978e82', cap: '#6e3228', tall: 1.25, glow: '#ffc070' },
  holy: { walls: ['#e2dccc', '#d8d2c2', '#e8e2d4'], roofs: ['#6a7480', '#737c88', '#7c6a4a'], stone: '#d8d2c2', cap: '#5c6672', tall: 1.1, glow: '#ffd890' },
  free: { walls: ['#d8b890', '#c89a78', '#dcc8a0', '#c8a888', '#b88868'], roofs: ['#a85a3c', '#b4683e', '#9a5038'], stone: '#b8a88c', cap: '#8a4a34', tall: 1.35, glow: '#ffc474' },
  march: { walls: ['#9a8c7a', '#8c7e6c', '#a09484'], roofs: ['#4a4038', '#54483e', '#3e3632'], timber: '#32261c', stone: '#807870', cap: '#3a3230', tall: 1.1, steep: 1.35, glow: '#ffb060' },
  dwarf: { walls: ['#8e8880', '#827c76', '#989288'], roofs: ['#5a544e', '#4e4a46'], stone: '#847e78', cap: '#4a4440', tall: 0.8, flat: true, glow: '#ff9a48' },
  lost: { walls: ['#9a968e', '#8c8880', '#a4a098'], roofs: ['#5a5650'], stone: '#8e8a84', cap: '#4a4844', tall: 1.1, ruin: true, glow: '#b8e8c8' },
  dragon: { walls: ['#8a7c6a', '#7c6e5e'], roofs: ['#3e3632', '#4a3e36'], timber: '#2a2018', stone: '#746c64', cap: '#3a3230', tall: 1, steep: 1.3, glow: '#ffb060' },
};

const sdOf = (S) => -S.dir;
function win(L, wins, x, y, w, h, key, glow) { L.fillStyle = '#231a14'; L.fillRect(x, y, w, h); wins.push([x, y, w, h, key, glow]); }

/** 집 한 채. b: { x, y(밑), w, h, d(옆 깊이), rh(지붕 높이), type: gable|eave|flat, wall, roof, timber, seed } */
export function house(L, b, st, S, P, wins, smoke) {
  const { x, y, w, h, d, rh } = b, sd = sdOf(S), X0 = x - w / 2, X1 = x + w / 2, e = sd > 0 ? X1 : X0, dy = d * 0.3;
  const wallSh = dark(b.wall, 0.36), roof = P.snow ? '#e4e7e8' : b.roof, roofSh = P.snow ? '#b0bcc8' : dark(b.roof, 0.38);
  if (b.type === 'flat') {
    poly(L, [[e, y], [e + sd * d, y - dy], [e + sd * d, y - h - dy], [e, y - h]], wallSh);
    poly(L, [[X0, y], [X1, y], [X1, y - h], [X0, y - h]], b.wall);
    poly(L, [[X0, y - h], [X1, y - h], [X1 + sd * d, y - h - dy], [X0 + sd * d, y - h - dy]], P.snow ? '#e4e7e8' : light(b.wall, 0.12));
  } else if (b.type === 'gable') {
    poly(L, [[e, y], [e + sd * d, y - dy], [e + sd * d, y - h - dy], [e, y - h]], wallSh);
    poly(L, [[x, y - h - rh], [x + sd * d, y - h - rh - dy], [e + sd * (d + 2), y - h - dy + 1], [e + sd * 2, y - h + 1]], roofSh);
    poly(L, [[X0, y], [X1, y], [X1, y - h], [x, y - h - rh], [X0, y - h]], b.wall);
    L.strokeStyle = roof; L.lineWidth = Math.max(1.5, w * 0.1); L.lineJoin = 'miter';
    L.beginPath(); L.moveTo(X0 - w * 0.07, y - h + 1.5); L.lineTo(x, y - h - rh); L.lineTo(X1 + w * 0.07, y - h + 1.5); L.stroke();
  } else {
    poly(L, [[e, y], [e + sd * d, y - dy], [e + sd * d, y - h - dy], [e + sd * d * 0.5, y - h - rh - dy * 0.5], [e, y - h]], wallSh);
    poly(L, [[X0, y], [X1, y], [X1, y - h], [X0, y - h]], b.wall);
    const o = w * 0.06 + 1, shx = sd * d * 0.5, ty = y - h - rh - dy * 0.5;
    L.beginPath(); L.moveTo(X0 - o, y - h + 1.5); L.lineTo(X1 + o, y - h + 1.5); L.lineTo(X1 + o * 0.3 + shx, ty); L.lineTo(X0 - o * 0.3 + shx, ty); L.closePath();
    L.fillStyle = vgrad(L, ty, y - h, [[0, light(roof, 0.1)], [1, dark(roof, 0.14)]]); L.fill();
    if (!P.snow && rh > 5) { L.strokeStyle = rgba('#20140a', 0.2); L.lineWidth = 0.7; L.beginPath(); for (let k = 1; k < 4; k++) { const t = k / 4; L.moveTo(X0 - o + (o * 0.7 + shx) * t, y - h + (ty - (y - h)) * t); L.lineTo(X1 + o + (-o * 0.7 + shx) * t, y - h + (ty - (y - h)) * t); } L.stroke(); }
  }
  // 벽의 나무 틀 (회벽집)
  if (b.timber && w > 9) {
    L.strokeStyle = b.timber; L.lineWidth = Math.max(0.7, w * 0.035); L.beginPath();
    L.rect(X0 + 0.4, y - h, w - 0.8, h); L.moveTo(X0, y - h * 0.52); L.lineTo(X1, y - h * 0.52);
    L.moveTo(x - w * 0.17, y - h); L.lineTo(x - w * 0.17, y); L.moveTo(x + w * 0.17, y - h); L.lineTo(x + w * 0.17, y);
    L.stroke();
  }
  // 빛 받는 벽의 위쪽은 처마 그늘
  L.fillStyle = rgba('#1a120c', 0.2); L.fillRect(X0, y - h, w, Math.max(1, h * 0.12));
  // 문과 창
  const ww = Math.max(1.6, w * 0.13), wh = Math.max(1.8, h * 0.26), k = b.seed * 7;
  if (h > 5) { L.fillStyle = '#33221a'; L.fillRect(x + w * 0.12 * (b.seed % 2 ? 1 : -1) - w * 0.07, y - h * 0.5, w * 0.14, h * 0.5); }
  win(L, wins, X0 + w * 0.12, y - h * 0.82, ww, wh, k + 1, st.glow);
  win(L, wins, X1 - w * 0.12 - ww, y - h * 0.82, ww, wh, k + 2, st.glow);
  if (b.h2) for (let q = 0; q < 3; q++) win(L, wins, X0 + w * (0.14 + q * 0.3), y - h * 0.42, ww, wh * 0.8, k + 3 + q, st.glow);
  if (b.type === 'gable' && rh > 7) win(L, wins, x - ww / 2, y - h - rh * 0.5, ww, wh * 0.8, k + 6, st.glow);
  // 굴뚝
  if (b.chimney && b.type !== 'flat') {
    const cx = x + (b.seed % 2 ? 1 : -1) * w * 0.22, cy = y - h - rh * 0.55;
    L.fillStyle = '#5a4a3e'; L.fillRect(cx - w * 0.05, cy - rh * 0.5, w * 0.1, rh * 0.6);
    smoke.push([cx, cy - rh * 0.5, b.seed, w / 26]);
  }
}

/** 탑. o: { stone, top: cren|cone|dome|spire|broken, cap(지붕색), flag, slits } */
export function tower(L, x, y, w, h, o, S, P, wins) {
  const sd = sdOf(S), stone = o.stone;
  if (o.top === 'broken') { // 무너진 꼭대기: 들쭉날쭉한 윤곽 안에만 칠한다
    L.save(); L.beginPath(); L.moveTo(x - w / 2 - 1, y + 1); L.lineTo(x - w / 2 - 1, y - h); L.lineTo(x - w * 0.2, y - h); L.lineTo(x - w * 0.05, y - h + w * 0.5); L.lineTo(x + w * 0.2, y - h + w * 0.2); L.lineTo(x + w / 2 + 1, y - h + w * 0.9); L.lineTo(x + w / 2 + 1, y + 1); L.closePath(); L.clip();
  }
  L.fillStyle = stone; L.fillRect(x - w / 2, y - h, w, h);
  L.fillStyle = rgba('#14101a', 0.3); L.fillRect(sd > 0 ? x + w * 0.1 : x - w / 2, y - h, w * 0.4, h);
  L.fillStyle = rgba('#fff4dc', 0.12); L.fillRect(sd > 0 ? x - w / 2 : x + w * 0.22, y - h, w * 0.28, h);
  const cap = P.snow && o.top !== 'dome' ? '#e4e7e8' : o.cap, capSh = P.snow && o.top !== 'dome' ? '#b0bcc8' : dark(o.cap, 0.4);
  if (o.top === 'cren') {
    L.fillStyle = stone; L.fillRect(x - w * 0.62, y - h - w * 0.2, w * 1.24, w * 0.24);
    L.fillStyle = rgba('#14101a', 0.3); L.fillRect(sd > 0 ? x + w * 0.1 : x - w * 0.62, y - h - w * 0.2, w * 0.52, w * 0.24);
    L.fillStyle = stone; const n = Math.max(3, Math.round(w / 4)), mw = (w * 1.24) / (n * 2 - 1);
    for (let i = 0; i < n; i++) L.fillRect(x - w * 0.62 + i * mw * 2, y - h - w * 0.2 - mw * 1.1, mw, mw * 1.2);
    L.fillStyle = rgba('#14101a', 0.28); L.fillRect(x - w * 0.62, y - h + w * 0.03, w * 1.24, 1.4);
  } else if (o.top === 'cone' || o.top === 'spire') {
    const ch = o.top === 'spire' ? w * 3 : w * 1.25, ov = w * 0.62;
    poly(L, [[x - ov, y - h], [x, y - h - ch], [x + ov, y - h]], cap);
    poly(L, [[x + sd * ov, y - h], [x, y - h - ch], [x + sd * ov * 0.15, y - h]], capSh);
    if (o.finial) { L.fillStyle = o.finial; L.beginPath(); L.arc(x, y - h - ch - 1.5, Math.max(1.2, w * 0.1), 0, 6.3); L.fill(); }
  } else if (o.top === 'dome') {
    L.fillStyle = o.cap; L.beginPath(); L.ellipse(x, y - h, w * 0.58, w * 0.66, 0, Math.PI, 0); L.fill();
    L.fillStyle = rgba('#14101a', 0.3); L.beginPath(); L.ellipse(x + sd * w * 0.16, y - h, w * 0.42, w * 0.62, 0, Math.PI, 0); L.fill();
    L.fillStyle = rgba('#fff8e0', 0.35); L.beginPath(); L.ellipse(x - sd * w * 0.2, y - h - w * 0.22, w * 0.12, w * 0.24, 0, 0, 6.3); L.fill();
    L.strokeStyle = o.cap; L.lineWidth = Math.max(1, w * 0.07); L.beginPath(); L.moveTo(x, y - h - w * 0.62); L.lineTo(x, y - h - w * 0.98); L.stroke();
  }
  if (o.slits !== false) for (let yy = y - h + w * 0.6, i = 0; yy < y - w * 0.8; yy += Math.max(9, w * 1.1), i++) win(L, wins, x - Math.max(0.8, w * 0.07), yy, Math.max(1.6, w * 0.14), Math.max(3, w * 0.34), Math.round(x) * 3 + i, o.glow);
  if (o.top === 'broken') L.restore();
  if (o.flag) { const fy = y - h - (o.top === 'cren' ? w * 0.4 : o.top === 'spire' ? w * 3 : w * 1.25); L.strokeStyle = '#2a1d12'; L.lineWidth = 1; L.beginPath(); L.moveTo(x, fy); L.lineTo(x, fy - w * 0.9); L.stroke(); poly(L, [[x, fy - w * 0.9], [x + S.dir * -w * 0.7, fy - w * 0.72], [x, fy - w * 0.5]], o.flag); }
}

/** 성벽: 총안, 돌 이음매, 중간 탑과 성문 */
export function wallRun(L, x0, x1, yAt, o, S, P, wins) {
  const { stone, h = 15, towers = [], gate = null, cap, glow } = o, sd = sdOf(S);
  for (let x = x0; x < x1; x += 5) {
    const y = yAt(x) + 2;
    L.fillStyle = (Math.floor(x / 5) % 7 === 3) ? dark(stone, 0.06) : stone; L.fillRect(x, y - h, 5.2, h);
    if (Math.floor(x / 5) % 2 === 0) L.fillRect(x, y - h - 3.4, 5.2, 3.6);
    if (P.snow) { L.fillStyle = '#e8eaea'; L.fillRect(x, y - h - (Math.floor(x / 5) % 2 === 0 ? 4.4 : 1), 5.2, 1.4); }
  }
  L.fillStyle = vgrad(L, yAt(x0) - h, yAt(x0) + 4, [[0, 'rgba(20,14,10,.22)'], [0.3, 'rgba(20,14,10,0)'], [0.75, 'rgba(20,14,10,0)'], [1, 'rgba(20,14,10,.3)']]);
  for (let x = x0; x < x1; x += 5) L.fillRect(x, yAt(x) + 2 - h, 5.2, h);
  L.strokeStyle = rgba('#20160e', 0.2); L.lineWidth = 0.7; L.beginPath();
  for (let x = x0, i = 0; x < x1; x += 7, i++) { const y = yAt(x) - 2 - hash(i, 71) * (h - 5); L.moveTo(x, y); L.lineTo(x + 4 + hash(i, 72) * 6, y); }
  L.stroke();
  for (const tx of towers) tower(L, tx, yAt(tx) + 3, h * 0.95, h * 1.75, { stone, top: 'cren', cap, glow }, S, P, wins);
  if (gate != null) {
    const y = yAt(gate) + 3, gw = h * 1.5;
    L.fillStyle = stone; L.fillRect(gate - gw / 2, y - h * 1.5, gw, h * 1.5);
    L.fillStyle = '#1e1612'; L.beginPath(); L.moveTo(gate - gw * 0.24, y); L.lineTo(gate - gw * 0.24, y - h * 0.62); L.arc(gate, y - h * 0.62, gw * 0.24, Math.PI, 0); L.lineTo(gate + gw * 0.24, y); L.closePath(); L.fill();
    tower(L, gate - gw * 0.62, y, h * 0.9, h * 2, { stone, top: 'cone', cap, glow }, S, P, wins);
    tower(L, gate + gw * 0.62, y, h * 0.9, h * 2, { stone, top: 'cone', cap, glow }, S, P, wins);
  }
}

/* ---------- 눈에 띄는 건물 ---------- */
export function windmill(L, x, y, s, month, S, P) {
  const sd = sdOf(S);
  poly(L, [[x - 11 * s, y], [x - 7 * s, y - 40 * s], [x + 7 * s, y - 40 * s], [x + 11 * s, y]], '#cdbf9f');
  poly(L, sd > 0 ? [[x + 1 * s, y], [x + 1 * s, y - 40 * s], [x + 7 * s, y - 40 * s], [x + 11 * s, y]] : [[x - 1 * s, y], [x - 1 * s, y - 40 * s], [x - 7 * s, y - 40 * s], [x - 11 * s, y]], rgba('#201610', 0.32));
  poly(L, [[x - 9 * s, y - 40 * s], [x, y - 53 * s], [x + 9 * s, y - 40 * s]], P.snow ? '#e6e8e8' : '#6a5240');
  L.fillStyle = '#33221a'; L.fillRect(x - 2.5 * s, y - 9 * s, 5 * s, 9 * s); L.fillRect(x - 1.5 * s, y - 26 * s, 3 * s, 4 * s);
  const hx = x, hy = y - 41 * s, ang = month * 0.37;
  for (let k = 0; k < 4; k++) {
    const a = ang + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), len = 35 * s;
    L.strokeStyle = '#3a2a1c'; L.lineWidth = 1.2 * s; L.beginPath(); L.moveTo(hx, hy); L.lineTo(hx + ca * len, hy + sa * len); L.stroke();
    poly(L, [[hx + ca * 8 * s, hy + sa * 8 * s], [hx + ca * len, hy + sa * len], [hx + ca * len - sa * 6.5 * s, hy + sa * len + ca * 6.5 * s], [hx + ca * 8 * s - sa * 6.5 * s, hy + sa * 8 * s + ca * 6.5 * s]], 'rgba(224,214,190,.9)', 'rgba(58,42,28,.7)', 0.7);
  }
  L.fillStyle = '#3a2a1c'; L.beginPath(); L.arc(hx, hy, 2 * s, 0, 6.3); L.fill();
}
function sunSign(L, x, y, r) {
  L.strokeStyle = GOLD; L.lineWidth = Math.max(1, r * 0.4); L.beginPath(); L.arc(x, y, r, 0, 6.3); L.stroke();
  L.beginPath(); for (let a = 0; a < 8; a++) { L.moveTo(x + Math.cos(a * Math.PI / 4) * r * 1.4, y + Math.sin(a * Math.PI / 4) * r * 1.4); L.lineTo(x + Math.cos(a * Math.PI / 4) * r * 2.1, y + Math.sin(a * Math.PI / 4) * r * 2.1); } L.stroke();
}
export function church(L, x, y, s, st, S, P, wins, smoke) {
  const wall = st.walls[0];
  house(L, { x: x + 14 * s, y, w: 30 * s, h: 17 * s, d: 9 * s, rh: 11 * s, type: 'eave', wall, roof: st.roofs[st.roofs.length - 1] === '#7c6a4a' ? st.roofs[0] : '#5a564e', seed: 500 }, st, S, P, wins, smoke);
  tower(L, x, y, 11 * s, 34 * s, { stone: wall, top: 'spire', cap: '#4a4a52', glow: st.glow }, S, P, wins);
  sunSign(L, x, y - 34 * s - 36 * s, 2.2 * s);
}
export function cathedral(L, x, y, s, st, S, P, wins, smoke) {
  const wall = '#e6e0d0', sd = sdOf(S);
  // 긴 몸채와 버팀벽
  house(L, { x, y, w: 92 * s, h: 30 * s, d: 16 * s, rh: 16 * s, type: 'eave', wall, roof: '#6a7480', seed: 700, h2: true }, st, S, P, wins, smoke);
  for (let k = -3; k <= 3; k++) { L.fillStyle = dark(wall, 0.14); L.fillRect(x + k * 13 * s - 1.6 * s, y - 30 * s, 3.2 * s, 30 * s); }
  for (let k = -3; k < 3; k++) { const wx = x + k * 13 * s + 4.5 * s; L.fillStyle = '#2a2230'; L.beginPath(); L.moveTo(wx, y - 6 * s); L.lineTo(wx, y - 20 * s); L.arc(wx + 2 * s, y - 20 * s, 2 * s, Math.PI, 0); L.lineTo(wx + 4 * s, y - 6 * s); L.closePath(); L.fill(); wins.push([wx, y - 21 * s, 4 * s, 15 * s, 720 + k, '#ffe0a0']); }
  // 큰 돔
  tower(L, x, y - 30 * s, 34 * s, 22 * s, { stone: wall, top: 'dome', cap: GOLD, glow: '#ffe0a0' }, S, P, wins);
  sunSign(L, x, y - 30 * s - 22 * s - 38 * s, 3 * s);
  // 정면 쌍탑
  for (const dx of [-52, 52]) tower(L, x + dx * s, y + 2 * s, 14 * s, 62 * s, { stone: wall, top: 'spire', cap: '#5c6672', finial: GOLD, glow: '#ffe0a0' }, S, P, wins);
  L.fillStyle = rgba('#14101a', 0.2); L.fillRect(sd > 0 ? x : x - 46 * s, y - 30 * s, 46 * s, 30 * s);
}
export function keep(L, x, y, s, st, S, P, wins, o = {}) {
  const stone = o.white ? '#e2ddd0' : st.stone, cap = o.white ? '#3e5a8a' : st.cap, flag = o.white ? '#3e5a8a' : '#8a2a1e';
  // 둔덕
  puff(L, x, y + 6 * s, 90 * s, 16 * s, dark(P.hill, 0.2), 0.7);
  wallRun(L, x - 62 * s, x + 62 * s, () => y, { stone, h: 16 * s, cap, glow: st.glow }, S, P, wins);
  for (const dx of [-62, 62]) tower(L, x + dx * s, y + 2, 15 * s, 40 * s, { stone, top: 'cone', cap, glow: st.glow }, S, P, wins);
  L.fillStyle = stone; L.fillRect(x - 30 * s, y - 44 * s, 60 * s, 44 * s);
  L.fillStyle = rgba('#14101a', 0.26); L.fillRect(sdOf(S) > 0 ? x + 6 * s : x - 30 * s, y - 44 * s, 24 * s, 44 * s);
  for (let q = -2; q <= 2; q++) win(L, wins, x + q * 10 * s - 1.2 * s, y - 34 * s, 2.4 * s, 5 * s, 800 + q, st.glow);
  tower(L, x, y - 20 * s, 24 * s, 52 * s, { stone, top: 'cren', cap, flag, glow: st.glow }, S, P, wins);
  for (const dx of [-30, 30]) tower(L, x + dx * s, y, 11 * s, 58 * s, { stone, top: 'cone', cap, glow: st.glow }, S, P, wins);
}
export function castle(L, x, y, s, st, S, P, wins) {
  // 영웅왕의 백색 성: 겹겹의 탑과 푸른 지붕
  const stone = '#e6e1d4', cap = '#3a5688';
  puff(L, x, y + 8 * s, 150 * s, 22 * s, dark(P.hill, 0.2), 0.7);
  wallRun(L, x - 118 * s, x + 118 * s, () => y, { stone, h: 20 * s, cap, glow: st.glow, towers: [x - 80 * s, x - 40 * s, x + 40 * s, x + 80 * s] }, S, P, wins);
  for (const [dx, w, h] of [[-118, 17, 50], [118, 17, 50], [-66, 14, 78], [66, 14, 78]]) tower(L, x + dx * s, y + 2, w * s, h * s, { stone, top: 'cone', cap, glow: st.glow }, S, P, wins);
  L.fillStyle = stone; L.fillRect(x - 52 * s, y - 62 * s, 104 * s, 62 * s);
  L.fillStyle = rgba('#14101a', 0.24); L.fillRect(sdOf(S) > 0 ? x + 12 * s : x - 52 * s, y - 62 * s, 40 * s, 62 * s);
  for (let r = 0; r < 2; r++) for (let q = -4; q <= 4; q++) win(L, wins, x + q * 10.5 * s - 1.3 * s, y - (50 - r * 18) * s, 2.6 * s, 6.5 * s, 900 + r * 10 + q, st.glow);
  poly(L, [[x - 56 * s, y - 62 * s], [x - 44 * s, y - 80 * s], [x + 44 * s, y - 80 * s], [x + 56 * s, y - 62 * s]], P.snow ? '#e4e7e8' : cap);
  for (const [dx, w, h] of [[-36, 13, 104], [36, 13, 104], [0, 20, 132]]) tower(L, x + dx * s, y - 30 * s, w * s, (h - 30) * s, { stone, top: 'spire', cap, finial: GOLD, flag: dx === 0 ? '#3e5a8a' : null, glow: st.glow }, S, P, wins);
}
export function citadel(L, x, y, s, st, S, P, wins) {
  // 제국의 계획 도시: 반듯하고 무거운 성채, 붉은 깃발
  const stone = '#9a9186', cap = '#6e3228';
  wallRun(L, x - 110 * s, x + 110 * s, () => y, { stone, h: 24 * s, cap, glow: st.glow, towers: [x - 110 * s, x - 55 * s, x + 55 * s, x + 110 * s] }, S, P, wins);
  L.fillStyle = stone; L.fillRect(x - 70 * s, y - 70 * s, 140 * s, 70 * s);
  L.fillStyle = rgba('#14101a', 0.26); L.fillRect(sdOf(S) > 0 ? x + 20 * s : x - 70 * s, y - 70 * s, 50 * s, 70 * s);
  for (let r = 0; r < 3; r++) for (let q = -6; q <= 6; q++) win(L, wins, x + q * 10 * s - 1.2 * s, y - (60 - r * 16) * s, 2.4 * s, 6 * s, 1000 + r * 20 + q, st.glow);
  L.fillStyle = dark(stone, 0.2); L.fillRect(x - 74 * s, y - 74 * s, 148 * s, 5 * s);
  for (const dx of [-70, 70]) tower(L, x + dx * s, y, 18 * s, 92 * s, { stone, top: 'cren', cap, flag: '#8a1e1a', glow: st.glow }, S, P, wins);
  tower(L, x, y - 70 * s, 40 * s, 20 * s, { stone, top: 'dome', cap: '#5a6a72', glow: st.glow }, S, P, wins);
  for (const dx of [-36, -12, 12, 36]) poly(L, [[x + dx * s - 3 * s, y - 24 * s], [x + dx * s + 3 * s, y - 24 * s], [x + dx * s + 3 * s, y - 52 * s], [x + dx * s, y - 48 * s], [x + dx * s - 3 * s, y - 52 * s]], '#8a1e1a');
}
export function mageTowers(L, x, y, s, st, S, P, wins) {
  // 호수를 둘러싼 일곱 탑
  const hs = [[-176, 13, 76], [-112, 16, 112], [-56, 14, 88], [0, 22, 160], [60, 15, 98], [118, 17, 126], [176, 13, 80]];
  for (const [dx, w, h] of hs) {
    const tx = x + dx * s, ty = y + Math.abs(dx) * 0.03 * s;
    tower(L, tx, ty, w * s, h * s, { stone: '#d0d0ca', top: 'spire', cap: '#3e4c6e', finial: '#bcd8ff', glow: '#bcd8ff' }, S, P, wins);
    L.fillStyle = dark('#d0d0ca', 0.12); L.fillRect(tx - w * s * 0.66, ty - h * s * 0.72, w * s * 1.32, 2.4 * s);
    wins.push([tx - 1.5 * s, ty - h * s - w * s * 3 - 4 * s, 3 * s, 3 * s, 1100 + dx, '#bcd8ff', true]);
  }
}
/** 홀로 선 마법사의 탑: 바위 위의 높은 몸통, 허리의 테라스, 곁탑, 꼭대기의 빛. o: stone, cap, glow, dead(불 꺼진 탑), broken(무너진 꼭대기) */
export function wizardTower(L, x, y, s, S, P, wins, o = {}) {
  const stone = o.stone ?? '#b9b6c0', cap = o.cap ?? '#3a3f66', glow = o.dead ? null : o.glow ?? '#bcd8ff', sd = sdOf(S);
  // 바위 턱
  poly(L, [[x - 62 * s, y + 6 * s], [x - 40 * s, y - 16 * s], [x - 8 * s, y - 26 * s], [x + 30 * s, y - 20 * s], [x + 58 * s, y + 6 * s]], mixh('#6e6a6a', S.haze, 0.2));
  poly(L, [[x + sd * 58 * s, y + 6 * s], [x + sd * 30 * s, y - 20 * s], [x + sd * 4 * s, y - 24 * s], [x + sd * 10 * s, y + 6 * s]], rgba('#14101a', 0.3));
  const by = y - 20 * s;
  // 곁탑과 본채
  tower(L, x + 24 * s, by + 4 * s, 13 * s, 62 * s, { stone: dark(stone, 0.08), top: 'cone', cap, glow: glow ?? '#2a2630' }, S, P, wins);
  tower(L, x - 24 * s, by + 6 * s, 10 * s, 40 * s, { stone: dark(stone, 0.08), top: 'cone', cap, glow: glow ?? '#2a2630' }, S, P, wins);
  tower(L, x, by, 24 * s, 128 * s, { stone, top: o.broken ? 'broken' : 'cren', cap, glow: glow ?? '#2a2630' }, S, P, wins);
  // 허리의 테라스와 다리
  for (const k of [0.42, 0.74]) { L.fillStyle = dark(stone, 0.2); L.fillRect(x - 17 * s, by - 128 * s * k, 34 * s, 3 * s); L.fillStyle = rgba('#14101a', 0.3); L.fillRect(x - 17 * s, by - 128 * s * k + 3 * s, 34 * s, 1.6 * s); }
  L.strokeStyle = dark(stone, 0.25); L.lineWidth = 2 * s; L.beginPath(); L.moveTo(x + 10 * s, by - 52 * s); L.quadraticCurveTo(x + 18 * s, by - 58 * s, x + 24 * s, by - 50 * s); L.stroke();
  if (!o.broken) { // 꼭대기: 가는 윗탑과 별 보는 둥근 지붕
    tower(L, x, by - 128 * s - 4 * s, 14 * s, 26 * s, { stone, top: 'dome', cap, glow: glow ?? '#2a2630', slits: false }, S, P, wins);
    L.strokeStyle = GOLD; L.lineWidth = 1; L.beginPath(); L.ellipse(x, by - 176 * s, 9 * s, 3 * s, -0.4, 0, 6.3); L.stroke();
  }
  if (glow) { const gy = o.broken ? by - 120 * s : by - 146 * s; wins.push([x - 3 * s, gy, 6 * s, 7 * s, 2200 + Math.round(x), glow, true]); puff(L, x, gy + 3 * s, 26 * s, 26 * s, glow, 0.16); }
}
export function endlessTower(L, x, y, s, S, P) {
  // 꼭대기가 보이지 않는 탑: 그림 위쪽 밖으로 이어진다
  const c = mixh('#8a8690', S.haze, 0.45), sd = sdOf(S), w0 = 34 * s, w1 = 22 * s;
  L.beginPath(); L.moveTo(x - w0, y); L.lineTo(x - w1, -10); L.lineTo(x + w1, -10); L.lineTo(x + w0, y); L.closePath();
  L.fillStyle = vgrad(L, 0, y, [[0, mixh(c, S.top, 0.6)], [0.5, mixh(c, S.mid, 0.3)], [1, c]]); L.fill();
  L.save(); L.clip();
  L.fillStyle = rgba('#14101a', 0.26); L.fillRect(sd > 0 ? x + w1 * 0.2 : x - w0, -10, w0, y + 10);
  L.fillStyle = rgba('#fff4dc', 0.1); L.fillRect(sd > 0 ? x - w0 : x + w1 * 0.4, -10, w0 * 0.5, y + 10);
  for (let yy = y - 22 * s, i = 0; yy > -10; yy -= 26 * s, i++) { L.fillStyle = rgba('#14101a', 0.26); L.fillRect(x - w0, yy, w0 * 2, 2.2 * s); for (let q = -2; q <= 2; q++) { L.fillStyle = rgba('#1a1420', 0.5); L.fillRect(x + q * 9 * s - 1.2 * s, yy - 12 * s, 2.4 * s, 6 * s); } }
  L.restore();
  for (let i = 0; i < 5; i++) puff(L, x + (hash(i, 31) - 0.5) * 160, 30 + i * 22, 110, 16, S.lit, 0.3);
}
export function bastion(L, x, y, s, st, S, P, wins) {
  // 세 겹 성벽의 최전선 도시
  const stone = '#857d74', cap = '#3a3230';
  for (let k = 2; k >= 0; k--) {
    const half = (90 + k * 44) * s, yy = y - k * 22 * s + 22 * s;
    wallRun(L, x - half, x + half, (xx) => yy + Math.abs(xx - x) * 0.04, { stone: dark(stone, k * 0.05), h: (19 - k * 2) * s, cap, glow: st.glow, towers: [x - half, x - half * 0.5, x + half * 0.5, x + half], gate: k === 2 ? null : null }, S, P, wins);
  }
  L.fillStyle = stone; L.fillRect(x - 34 * s, y - 62 * s, 68 * s, 62 * s);
  L.fillStyle = rgba('#14101a', 0.28); L.fillRect(sdOf(S) > 0 ? x + 6 * s : x - 34 * s, y - 62 * s, 28 * s, 62 * s);
  for (const dx of [-34, 34]) tower(L, x + dx * s, y, 16 * s, 78 * s, { stone, top: 'cren', cap, glow: st.glow }, S, P, wins);
  tower(L, x, y - 30 * s, 26 * s, 66 * s, { stone, top: 'cren', cap, flag: '#5a6068', glow: st.glow }, S, P, wins);
  // 봉화
  for (const dx of [-34, 34]) wins.push([x + dx * s - 2 * s, y - 78 * s - 12 * s, 4 * s, 5 * s, 1200 + dx, '#ff8a3a', true]);
}
export function manor(L, x, y, s, st, S, P, wins, smoke) {
  // 언덕 위 낡은 영주관
  house(L, { x: x - 24 * s, y, w: 22 * s, h: 18 * s, d: 8 * s, rh: 13 * s, type: 'gable', wall: '#c4b494', roof: '#5a5650', timber: st.timber, seed: 601 }, st, S, P, wins, smoke);
  house(L, { x: x + 4 * s, y, w: 40 * s, h: 20 * s, d: 10 * s, rh: 13 * s, type: 'eave', wall: '#cbbc9c', roof: '#5a5650', seed: 602, h2: true, chimney: true }, st, S, P, wins, smoke);
  tower(L, x + 30 * s, y, 11 * s, 34 * s, { stone: '#b4a88e', top: 'cone', cap: '#5a5650', glow: st.glow }, S, P, wins);
}
export function fortress(L, x, y, s, st, S, P, wins) {
  wallRun(L, x - 70 * s, x + 70 * s, () => y, { stone: st.stone, h: 22 * s, cap: st.cap, glow: st.glow, towers: [x - 70 * s, x + 70 * s], gate: x }, S, P, wins);
  tower(L, x - 26 * s, y - 14 * s, 22 * s, 48 * s, { stone: st.stone, top: 'cren', cap: st.cap, flag: '#8a2a1e', glow: st.glow }, S, P, wins);
  tower(L, x + 30 * s, y - 14 * s, 15 * s, 36 * s, { stone: st.stone, top: 'cone', cap: st.cap, glow: st.glow }, S, P, wins);
}
export function ruins(L, x, y, s, S, P, wins, R, o = {}) {
  const stone = P.blight ? '#5e545a' : '#9a968e';
  for (let i = 0; i < (o.n ?? 9); i++) {
    const dx = (R() - 0.5) * (o.span ?? 220) * s, yy = y + R() * 26 * s, k = R();
    if (k < 0.4) tower(L, x + dx, yy, (9 + R() * 8) * s, (20 + R() * 46) * s, { stone: dark(stone, R() * 0.15), top: 'broken', cap: stone, glow: o.glow, slits: R() < 0.5 }, S, P, wins);
    else if (k < 0.7) { const w = (20 + R() * 34) * s, h = (8 + R() * 16) * s; poly(L, [[x + dx - w / 2, yy], [x + dx - w / 2, yy - h], [x + dx - w * 0.2, yy - h * (0.5 + R() * 0.5)], [x + dx + w * 0.1, yy - h * 0.8], [x + dx + w / 2, yy - h * (0.2 + R() * 0.5)], [x + dx + w / 2, yy]], dark(stone, 0.08)); poly(L, [[x + dx - w / 2, yy], [x + dx - w / 2, yy - h], [x + dx - w * 0.36, yy - h * 0.8], [x + dx - w * 0.36, yy]], rgba('#14101a', 0.26)); }
    else for (let q = 0; q < 3; q++) { const cx = x + dx + q * 7 * s, ch = (10 + R() * 18) * s; L.fillStyle = light(stone, 0.1); L.fillRect(cx - 1.4 * s, yy - ch, 2.8 * s, ch); L.fillStyle = rgba('#14101a', 0.3); L.fillRect(cx + (sdOf(S) > 0 ? 0.2 : -1.4) * s, yy - ch, 1.2 * s, ch); L.fillStyle = light(stone, 0.1); L.fillRect(cx - 2.2 * s, yy - ch, 4.4 * s, 1.6 * s); }
  }
}
export function ruinPalace(L, x, y, s, S, P, wins, R) {
  const stone = '#9c9a94';
  wallRun(L, x - 130 * s, x - 30 * s, () => y, { stone, h: 16 * s, cap: stone, glow: '#b8e8c8' }, S, P, wins);
  wallRun(L, x + 50 * s, x + 140 * s, () => y + 3, { stone: dark(stone, 0.06), h: 12 * s, cap: stone, glow: '#b8e8c8' }, S, P, wins);
  L.save(); L.beginPath(); L.moveTo(x - 47 * s, y + 1); L.lineTo(x - 47 * s, y - 34 * s); L.lineTo(x - 20 * s, y - 44 * s); L.lineTo(x - 6 * s, y - 30 * s); L.lineTo(x + 14 * s, y - 40 * s); L.lineTo(x + 30 * s, y - 22 * s); L.lineTo(x + 47 * s, y - 30 * s); L.lineTo(x + 47 * s, y + 1); L.closePath(); L.clip();
  L.fillStyle = stone; L.fillRect(x - 46 * s, y - 50 * s, 92 * s, 50 * s);
  L.fillStyle = rgba('#14101a', 0.26); L.fillRect(sdOf(S) > 0 ? x + 6 * s : x - 46 * s, y - 50 * s, 40 * s, 50 * s);
  L.restore();
  for (let q = -3; q <= 3; q++) { L.fillStyle = '#1c1a22'; L.beginPath(); const wx = x + q * 12 * s; L.moveTo(wx - 2 * s, y - 6 * s); L.lineTo(wx - 2 * s, y - 16 * s); L.arc(wx, y - 16 * s, 2 * s, Math.PI, 0); L.lineTo(wx + 2 * s, y - 6 * s); L.closePath(); L.fill(); wins.push([wx - 2 * s, y - 18 * s, 4 * s, 12 * s, 1300 + q, '#b8e8c8']); }
  tower(L, x - 62 * s, y, 18 * s, 86 * s, { stone, top: 'broken', cap: stone, glow: '#b8e8c8' }, S, P, wins);
  tower(L, x + 58 * s, y, 15 * s, 58 * s, { stone: dark(stone, 0.06), top: 'broken', cap: stone, glow: '#b8e8c8' }, S, P, wins);
  tower(L, x + 4 * s, y - 20 * s, 22 * s, 70 * s, { stone, top: 'broken', cap: stone, glow: '#b8e8c8' }, S, P, wins);
}
export function lighthouse(L, x, y, s, S, P, wins) {
  tower(L, x, y, 10 * s, 52 * s, { stone: '#d8d4c8', top: 'cone', cap: '#8a3a2a', glow: '#ffe8a0', slits: false }, S, P, wins);
  L.fillStyle = '#8a3a2a'; L.fillRect(x - 5 * s, y - 30 * s, 10 * s, 7 * s);
  wins.push([x - 3 * s, y - 52 * s - 2 * s, 6 * s, 4 * s, 1400, '#ffe8a0', true]);
}
export function ship(L, x, y, s, S, flip) {
  const f = flip ? -1 : 1;
  poly(L, [[x - 16 * s * f, y - 5 * s], [x + 18 * s * f, y - 6 * s], [x + 13 * s * f, y + 1 * s], [x - 12 * s * f, y + 1 * s]], '#4a3828');
  L.strokeStyle = '#3a2a1c'; L.lineWidth = 1.2 * s; L.beginPath(); L.moveTo(x, y - 5 * s); L.lineTo(x, y - 34 * s); L.moveTo(x + 9 * s * f, y - 5 * s); L.lineTo(x + 9 * s * f, y - 24 * s); L.stroke();
  poly(L, [[x + 1 * s * f, y - 32 * s], [x + 1 * s * f, y - 10 * s], [x - 11 * s * f, y - 12 * s]], '#d8cfb8'); poly(L, [[x + 10 * s * f, y - 23 * s], [x + 10 * s * f, y - 9 * s], [x + 18 * s * f, y - 10 * s]], '#cfc6ae');
}
export function docks(L, x0, x1, y, s, S, P) {
  L.fillStyle = '#5a4634'; L.fillRect(x0, y - 2 * s, x1 - x0, 3 * s);
  for (let x = x0; x < x1; x += 14 * s) { L.fillStyle = '#3a2c20'; L.fillRect(x, y - 2 * s, 2 * s, 9 * s); }
  for (let x = x0 + 30 * s; x < x1; x += 70 * s) { L.fillStyle = '#5a4634'; L.fillRect(x, y, 5 * s, 18 * s); L.fillStyle = '#3a2c20'; L.fillRect(x, y + 14 * s, 1.6 * s, 8 * s); L.fillRect(x + 3.4 * s, y + 14 * s, 1.6 * s, 8 * s); }
}

/* ---------- 다른 종족의 집 ---------- */
export function elfSpire(L, x, y, s, S, P, wins, R) {
  const w = (9 + R() * 6) * s, h = (34 + R() * 52) * s;
  tower(L, x, y, w, h, { stone: '#dde2d0', top: 'spire', cap: P.snow ? '#e4e7e8' : '#3e7264', finial: '#d8f0d8', glow: '#bfecd0' }, S, P, wins);
  L.fillStyle = dark('#dde2d0', 0.16); L.fillRect(x - w * 0.8, y - h * 0.62, w * 1.6, 1.6 * s);
  L.strokeStyle = rgba('#3e7264', 0.7); L.lineWidth = 1; L.beginPath(); L.moveTo(x - w * 0.8, y - h * 0.62); L.quadraticCurveTo(x - w * 2, y - h * 0.5, x - w * 2.4, y - h * 0.3); L.stroke();
}
export function tent(L, x, y, s, S, P, wins, R, cols = ['#a8845c', '#9a7650', '#b4946a', '#8c6c4c']) {
  const w = (14 + R() * 8) * s, h = w * (0.8 + R() * 0.3), c = cols[Math.floor(R() * cols.length)], sd = sdOf(S);
  poly(L, [[x - w, y], [x, y - h], [x + w, y]], P.snow ? mixh(c, '#e4e7e8', 0.5) : c);
  poly(L, [[x + sd * w, y], [x, y - h], [x + sd * w * 0.1, y]], rgba('#14101a', 0.32));
  L.strokeStyle = '#3a2a1c'; L.lineWidth = 1; L.beginPath(); L.moveTo(x - w * 0.12, y - h * 1.18); L.lineTo(x + w * 0.1, y - h * 0.9); L.moveTo(x + w * 0.12, y - h * 1.18); L.lineTo(x - w * 0.1, y - h * 0.9); L.stroke();
  poly(L, [[x - w * 0.16, y], [x, y - h * 0.42], [x + w * 0.16, y]], '#2a1c14'); wins.push([x - w * 0.1, y - h * 0.3, w * 0.2, h * 0.3, Math.round(x) * 5, '#ff9a48']);
}
export function totem(L, x, y, s, S) {
  L.fillStyle = '#4a3626'; L.fillRect(x - 2 * s, y - 34 * s, 4 * s, 34 * s);
  for (let k = 0; k < 3; k++) { L.fillStyle = ['#8a3a2a', '#c9a25a', '#3a4a3a'][k]; L.fillRect(x - 3.4 * s, y - (30 - k * 9) * s, 6.8 * s, 5 * s); }
  poly(L, [[x - 12 * s, y - 36 * s], [x, y - 31 * s], [x + 12 * s, y - 36 * s], [x, y - 39 * s]], '#4a3626');
}
export function blackSpire(L, x, y, s, S, P, wins, R, big) {
  const w = (big ? 20 : 7 + R() * 7) * s, h = (big ? 120 : 30 + R() * 60) * s, c = '#2c2428', sd = sdOf(S);
  poly(L, [[x - w, y], [x - w * 0.5, y - h * 0.6], [x - w * 0.62, y - h * 0.66], [x, y - h], [x + w * 0.5, y - h * 0.7], [x + w * 0.42, y - h * 0.55], [x + w, y]], c);
  poly(L, sd > 0 ? [[x, y], [x, y - h], [x + w * 0.5, y - h * 0.7], [x + w * 0.42, y - h * 0.55], [x + w, y]] : [[x, y], [x, y - h], [x - w * 0.62, y - h * 0.66], [x - w * 0.5, y - h * 0.6], [x - w, y]], rgba('#08060a', 0.45));
  for (let yy = y - h * 0.2, i = 0; yy > y - h * 0.8; yy -= Math.max(8, h * 0.14), i++) wins.push([x - 1.2 * s, yy, 2.4 * s, 4.5 * s, Math.round(x) * 3 + i, '#ff5a40']);
}
export function stiltHut(L, x, y, s, st, S, P, wins, R, smoke) {
  const w = (14 + R() * 8) * s, h = 8 * s, leg = (6 + R() * 5) * s;
  L.strokeStyle = '#3a2c20'; L.lineWidth = 1.2; L.beginPath(); for (const dx of [-0.4, 0, 0.4]) { L.moveTo(x + dx * w, y); L.lineTo(x + dx * w, y - leg); } L.stroke();
  house(L, { x, y: y - leg, w, h, d: 5 * s, rh: 8 * s, type: 'gable', wall: '#8a6a48', roof: '#b09a5c', seed: Math.round(x) }, { glow: '#ffc070' }, S, P, wins, smoke);
}
export function dwarfGate(L, x, y, s, S, P, wins) {
  // 산을 파고 들어간 문: 기둥과 화로
  const stone = '#7e7872';
  L.fillStyle = stone; L.fillRect(x - 46 * s, y - 70 * s, 92 * s, 70 * s);
  poly(L, [[x - 52 * s, y - 70 * s], [x, y - 92 * s], [x + 52 * s, y - 70 * s]], dark(stone, 0.1));
  L.fillStyle = '#15100e'; L.beginPath(); L.moveTo(x - 20 * s, y); L.lineTo(x - 20 * s, y - 40 * s); L.arc(x, y - 40 * s, 20 * s, Math.PI, 0); L.lineTo(x + 20 * s, y); L.closePath(); L.fill();
  wins.push([x - 16 * s, y - 34 * s, 32 * s, 32 * s, 1500, '#ff8a3a', true]);
  for (const dx of [-34, 34]) { L.fillStyle = light(stone, 0.12); L.fillRect(x + dx * s - 5 * s, y - 66 * s, 10 * s, 66 * s); L.fillStyle = rgba('#14101a', 0.3); L.fillRect(x + dx * s + (sdOf(S) > 0 ? 0 : -5) * s, y - 66 * s, 5 * s, 66 * s); wins.push([x + dx * 1.7 * s - 3 * s, y - 14 * s, 6 * s, 6 * s, 1510 + dx, '#ff8a3a', true]); }
  L.strokeStyle = GOLD; L.lineWidth = 1.4 * s; L.beginPath(); L.moveTo(x - 30 * s, y - 72 * s); L.lineTo(x, y - 86 * s); L.lineTo(x + 30 * s, y - 72 * s); L.stroke();
}
/** 세계수: 화면 위로 솟은 거대한 나무 */
export function worldTree(L, x, y, s, S, P, R) {
  const c = mixh('#4a4034', S.haze, 0.35);
  L.beginPath(); L.moveTo(x - 70 * s, y); L.quadraticCurveTo(x - 30 * s, y - 60 * s, x - 34 * s, y - 190 * s); L.lineTo(x - 90 * s, y - 280 * s); L.lineTo(x + 100 * s, y - 280 * s); L.lineTo(x + 36 * s, y - 190 * s); L.quadraticCurveTo(x + 30 * s, y - 60 * s, x + 76 * s, y); L.closePath(); L.fillStyle = c; L.fill();
  poly(L, sdOf(S) > 0 ? [[x + 4 * s, y], [x + 2 * s, y - 280 * s], [x + 100 * s, y - 280 * s], [x + 36 * s, y - 190 * s], [x + 76 * s, y]] : [[x - 4 * s, y], [x - 2 * s, y - 280 * s], [x - 90 * s, y - 280 * s], [x - 34 * s, y - 190 * s], [x - 70 * s, y]], rgba('#0c0a10', 0.3));
  const leaf = mixh(P.leaf ?? (P.snow ? '#7e8a86' : '#8a6a34'), S.haze, 0.3);
  for (const [c, n, ox, oy, rr] of [[dark(leaf, 0.45), 130, -S.dir * 10, 14, 26], [dark(leaf, 0.2), 150, 0, 0, 20], [leaf, 150, S.dir * 14, -10, 14], [light(leaf, 0.25), 110, S.dir * 26, -22, 8]]) {
    L.fillStyle = c;
    for (let i = 0; i < n; i++) { const a = R() * Math.PI, d = 0.2 + R() * 0.8, px = x + ox + Math.cos(a) * d * 340 * s, py = y + oy - 200 * s - Math.sin(a) * d * 100 * s - R() * 50; L.beginPath(); L.arc(px, py, (rr * 0.5 + R() * rr) * s, 0, 6.3); L.fill(); }
  }
}
