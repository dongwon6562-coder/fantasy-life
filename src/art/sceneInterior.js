// 38단계: 실내 풍경. 집 안 난롯가, 주점, 성의 홀, 신전, 공방.
//   interiorImage({ kind, year, month, place })  1200×480 그림 주소 (바깥 풍경 sceneImage와 같은 크기·같은 마무리)
//   sceneFor(game)  이번 달 고른 일이 집 안·주점·궁정·신전·공방 쪽이면 { kind }, 아니면 null (화면 맨 위 큰 그림에 쓴다)
// 한 점 투시로 방을 세우고, 불빛(난로·촛불·등잔·화덕)과 창으로 드는 빛(낮의 빛줄기·밤의 달빛)을 얹는다.
// 창밖은 그 달의 때·날씨·계절을 따른다. 고장의 사는 이들(문화)에 따라 돌 빛깔과 천 빛깔이 바뀐다.
import { W, H, rng, mixh, rgba, dark, light, puff, canvasUrl, dropUrl, grain, strSeed, clamp } from './sceneKit.js';
import { paintFinish } from './scenePaint.js';
import { noteMotion } from './sceneMotion.js';
import { skyOf } from './sceneSky.js';
import { paletteOf } from './sceneLand.js';
import { describe } from './scenePlaces.js';
import { conditions } from './scene.js';

export const INTERIOR_KINDS = ['hearth', 'tavern', 'hall', 'temple', 'workshop'];

/* ---------- 고장마다 다른 돌과 천 ---------- */
const LOOK = {
  leonia: { stone: '#8a7c6a', wood: '#5a3e28', cloth: '#7a2a22', metal: '#b08a48' },
  empire: { stone: '#6e6c6e', wood: '#3e3028', cloth: '#2c2c3a', metal: '#9a9aa0' },
  holy: { stone: '#c8bea8', wood: '#6a4c30', cloth: '#d8c89a', metal: '#d0b060' },
  serenia: { stone: '#9a9cb0', wood: '#4a3a3a', cloth: '#3a4a7a', metal: '#a8b0c8' },
  elf: { stone: '#7a8a6a', wood: '#6a5a38', cloth: '#3a6a4a', metal: '#c8c090' },
  dwarf: { stone: '#6a5e54', wood: '#4a3424', cloth: '#7a4a1e', metal: '#c88a3a' },
  beast: { stone: '#7a6a50', wood: '#5a4028', cloth: '#8a5a2a', metal: '#9a7a4a' },
  demon: { stone: '#3e3034', wood: '#2e2224', cloth: '#5a1a22', metal: '#8a6a6a' },
  sea: { stone: '#9a8a70', wood: '#6a5038', cloth: '#2a5a6a', metal: '#a89a70' },
};
const lookOf = (culture) => LOOK[culture] ?? (culture === 'march' || culture === 'free' ? LOOK.leonia : culture === 'dragon' ? LOOK.dwarf : LOOK.leonia);

/* ---------- 방 세우기 (한 점 투시) ---------- */
// 뒷벽 [bx0, by0, bx1, by1], 소실점은 뒷벽 가운데 아래쪽
function room(ctx, B, o) {
  const [bx0, by0, bx1, by1] = B;
  // 천장
  poly(ctx, [[0, 0], [W, 0], [bx1, by0], [bx0, by0]], o.ceil);
  // 바닥
  poly(ctx, [[0, H], [W, H], [bx1, by1], [bx0, by1]], o.floor);
  // 옆벽
  poly(ctx, [[0, 0], [bx0, by0], [bx0, by1], [0, H]], o.side);
  poly(ctx, [[W, 0], [bx1, by0], [bx1, by1], [W, H]], dark(o.side, 0.12));
  // 뒷벽
  ctx.fillStyle = o.back; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
}
function poly(ctx, pts, fill) { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
// 뒷벽 점 → 앞쪽 틀(화면 가장자리) 점으로 가는 선 위의 t 자리
const toward = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
// 원근 깊이 t(0 뒷벽 ~ 1 화면 앞) → 바닥 높이 y
const floorY = (B, t) => B[3] + (H - B[3]) * t;
const scaleAt = (B, t) => 1 + t * ((W / (B[2] - B[0])) - 1);

/** 돌벽 결: 줄마다 어긋나는 돌, 돌마다 조금씩 다른 빛 */
function stones(ctx, x0, y0, x1, y1, base, R, sz = 26) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  for (let y = y0, row = 0; y < y1; y += sz * 0.62, row++) {
    for (let x = x0 - (row % 2) * sz * 0.5; x < x1; x += sz * (0.8 + R() * 0.5)) {
      const w = sz * (0.75 + R() * 0.45), h = sz * 0.58;
      ctx.fillStyle = mixh(base, R() < 0.5 ? '#000000' : '#fff4dc', R() * 0.14); ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    }
  }
  ctx.strokeStyle = rgba(dark(base, 0.6), 0.55); ctx.lineWidth = 1.2;
  for (let y = y0; y < y1; y += sz * 0.62) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  ctx.restore();
}
/** 나무 판자 (세로) */
function planks(ctx, x0, y0, x1, y1, base, R, w = 22) {
  for (let x = x0; x < x1; x += w) { ctx.fillStyle = mixh(base, R() < 0.5 ? '#000000' : '#fff0d0', R() * 0.12); ctx.fillRect(x, y0, Math.min(w, x1 - x) - 1.5, y1 - y0); }
  ctx.fillStyle = rgba(dark(base, 0.7), 0.5);
  for (let i = 0; i < (x1 - x0) / 9; i++) ctx.fillRect(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), 1, 3 + R() * 12);
}
/** 바닥 판자: 소실점으로 모이는 줄과 앞으로 올수록 벌어지는 가로줄 */
function floorBoards(ctx, B, base, R, stone = false) {
  const [bx0, , bx1, by1] = B, vx = (bx0 + bx1) / 2;
  ctx.strokeStyle = rgba(dark(base, 0.55), 0.6); ctx.lineWidth = 1.1;
  const n = stone ? 10 : 18;
  for (let i = 0; i <= n; i++) { const t = i / n, xb = bx0 + (bx1 - bx0) * t, xf = -W * 0.5 + W * 2 * t; ctx.beginPath(); ctx.moveTo(xb, by1); ctx.lineTo(xf, H); ctx.stroke(); }
  for (let i = 1; i < (stone ? 9 : 6); i++) {
    const t = Math.pow(i / (stone ? 9 : 6), 1.8), y = by1 + (H - by1) * t;
    ctx.globalAlpha = stone ? 0.6 : 0.3; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.globalAlpha = 1;
  }
  void vx; void R;
}
/** 들보: 천장을 가로지르는 굵은 나무 */
function beams(ctx, B, wood, n = 4) {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, y0 = B[1] * (1 - t), th = 8 + t * 26;
    const xl = B[0] * (1 - t), xr = B[2] + (W - B[2]) * t;
    ctx.fillStyle = dark(wood, 0.25 + (1 - t) * 0.2); ctx.fillRect(xl - 4, y0 - th * 0.5, xr - xl + 8, th);
    ctx.fillStyle = rgba(light(wood, 0.3), 0.25); ctx.fillRect(xl - 4, y0 + th * 0.5 - 2, xr - xl + 8, 2);
  }
}

/** 창: 창밖은 그 달의 하늘·날씨. 돌려주는 값: 빛이 드는 자리 */
function windowOut(ctx, x, y, w, h, S, P, R, o = {}) {
  ctx.save(); ctx.beginPath();
  if (o.arch) { ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); } else ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, S.top); g.addColorStop(0.6, S.mid); g.addColorStop(1, S.low); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (S.tod === 'night' && !S.overcast) for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(240,236,210,.8)'; ctx.fillRect(x + R() * w, y + R() * h * 0.6, 1.2, 1.2); }
  // 먼 언덕과 지붕
  ctx.fillStyle = mixh(P.snow ? '#c8d0d6' : P.hill ?? '#6a7a50', S.tod === 'night' ? '#101626' : S.haze ?? S.low, 0.45);
  ctx.beginPath(); ctx.moveTo(x, y + h); for (let i = 0; i <= 8; i++) ctx.lineTo(x + (w * i) / 8, y + h * (0.68 + Math.sin(i * 1.7 + w) * 0.06)); ctx.lineTo(x + w, y + h); ctx.fill();
  if (S.weather === 'rain' || S.storm) { ctx.strokeStyle = 'rgba(210,220,230,.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < w * h / 160; i++) { const px = x + R() * w, py = y + R() * h; ctx.moveTo(px, py); ctx.lineTo(px - 2, py + 9); } ctx.stroke(); }
  if (S.weather === 'snow' || S.blizzard) for (let i = 0; i < w * h / 90; i++) { ctx.fillStyle = 'rgba(248,248,246,.85)'; ctx.beginPath(); ctx.arc(x + R() * w, y + R() * h, 0.8 + R() * 1.4, 0, 6.3); ctx.fill(); }
  if (S.weather === 'fog') { ctx.fillStyle = 'rgba(226,228,224,.5)'; ctx.fillRect(x, y, w, h); }
  ctx.restore();
  // 창살과 창틀
  const fr = o.frame ?? '#2a1d14';
  ctx.strokeStyle = fr; ctx.lineWidth = o.thin ? 2 : 4;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + (o.arch ? 0 : 0)); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.55); ctx.stroke();
  ctx.lineWidth = 7; if (o.arch) { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.stroke(); } else ctx.strokeRect(x, y, w, h);
  if (P.snow && !o.arch) { ctx.fillStyle = 'rgba(236,240,242,.85)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 1, w / 2, 4, 0, Math.PI, 0); ctx.fill(); }
}
/** 창으로 드는 빛줄기 (낮은 따뜻하게, 밤은 달빛으로 옅게) */
function shaft(ctx, x, y, w, h, S, dx, dy, a = 1, R = Math.random) {
  if (S.heavy && S.tod !== 'day') return;
  const night = S.tod === 'night', col = night ? '150,170,220' : S.tod === 'dusk' ? '255,170,110' : S.tod === 'dawn' ? '255,210,170' : '255,240,210';
  const k = (night ? (S.overcast ? 0 : 0.12) : S.overcast ? 0.12 : 0.3) * a;
  if (k <= 0) return;
  const g = ctx.createLinearGradient(x, y, x + dx, y + dy);
  g.addColorStop(0, `rgba(${col},${k})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + dx, y + h + dy); ctx.lineTo(x + dx, y + h + dy); ctx.closePath(); ctx.fill();
  // 떠도는 먼지
  for (let i = 0; i < 30; i++) { const t = R(); ctx.fillStyle = `rgba(${col},${k * 1.6})`; ctx.fillRect(x + w * R() + dx * t, y + h * R() + dy * t, 1.2, 1.2); }
  ctx.globalCompositeOperation = 'source-over';
}
/** 불빛 한 점: 둘레가 따뜻하게 밝아진다 (lighter) */
function glow(ctx, x, y, r, color, a) { ctx.globalCompositeOperation = 'lighter'; puff(ctx, x, y, r, r * 0.9, color, a); ctx.globalCompositeOperation = 'source-over'; }
/** 불꽃 */
function flame(ctx, x, y, s, R) {
  for (const [c, k] of [['#ff7a2a', 1], ['#ffb84a', 0.72], ['#fff0b0', 0.42]]) {
    ctx.fillStyle = c; ctx.beginPath();
    const w = 10 * s * k, h = 26 * s * k;
    ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.5, x + (R() - 0.5) * w * 0.5, y - h); ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.45, x + w, y); ctx.closePath(); ctx.fill();
  }
}
function candle(ctx, x, y, s, wins) {
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 2.5 * s, y - 14 * s, 5 * s, 14 * s);
  ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.ellipse(x, y - 17 * s, 2 * s, 4.5 * s, 0, 0, 6.3); ctx.fill();
  wins.push([x, y - 17 * s, 14 * s, '#ffc870']);
}
/** 앉거나 선 사람 실루엣 (어깨와 머리만) */
function figure(ctx, x, y, s, col, o = {}) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y - 30 * s, 8.5 * s, 9.5 * s, 0, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 20 * s, y); ctx.quadraticCurveTo(x - 19 * s, y - 20 * s, x - 6 * s, y - 22 * s); ctx.lineTo(x + 6 * s, y - 22 * s); ctx.quadraticCurveTo(x + 19 * s, y - 20 * s, x + 20 * s, y); ctx.closePath(); ctx.fill();
  if (o.hood) { ctx.beginPath(); ctx.moveTo(x - 10 * s, y - 26 * s); ctx.quadraticCurveTo(x, y - 46 * s, x + 10 * s, y - 26 * s); ctx.fill(); }
  if (o.rim) { ctx.strokeStyle = rgba(o.rim, 0.55); ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.arc(x, y - 30 * s, 9 * s, o.side > 0 ? -1.2 : 1.9, o.side > 0 ? 0.9 : 4.3); ctx.stroke(); }
}
function table(ctx, x, y, w, s, wood) {
  ctx.fillStyle = dark(wood, 0.15); ctx.fillRect(x - w / 2, y - 26 * s, w, 7 * s);
  ctx.fillStyle = dark(wood, 0.45); ctx.fillRect(x - w / 2 + 6 * s, y - 19 * s, 6 * s, 19 * s); ctx.fillRect(x + w / 2 - 12 * s, y - 19 * s, 6 * s, 19 * s);
  ctx.fillStyle = rgba(light(wood, 0.4), 0.35); ctx.fillRect(x - w / 2, y - 26 * s, w, 1.6 * s);
}
function mug(ctx, x, y, s, metal) { ctx.fillStyle = dark(metal, 0.3); ctx.fillRect(x - 4 * s, y - 10 * s, 8 * s, 10 * s); ctx.strokeStyle = dark(metal, 0.3); ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(x + 5 * s, y - 5 * s, 3 * s, -1.4, 1.4); ctx.stroke(); }
function barrel(ctx, x, y, s, wood, metal) {
  ctx.fillStyle = dark(wood, 0.1); ctx.beginPath(); ctx.ellipse(x, y - 22 * s, 17 * s, 22 * s, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = rgba(light(wood, 0.3), 0.3); ctx.beginPath(); ctx.ellipse(x - 5 * s, y - 24 * s, 5 * s, 18 * s, 0, 0, 6.3); ctx.fill();
  ctx.strokeStyle = dark(metal, 0.35); ctx.lineWidth = 2.2 * s; for (const k of [0.25, 0.75]) { ctx.beginPath(); ctx.ellipse(x, y - 44 * s * k, 16.5 * s, 4 * s, 0, 0, Math.PI); ctx.stroke(); }
}
/** 아래쪽 앞 틀: 탁자 모서리·들보 같은 가까운 실루엣 */
function nearEdge(ctx, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 46); ctx.quadraticCurveTo(120, H - 52, 220, H - 30); ctx.lineTo(260, H); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W, H - 40); ctx.quadraticCurveTo(W - 110, H - 46, W - 210, H - 26); ctx.lineTo(W - 240, H); ctx.closePath(); ctx.fill();
}
/** 어둠: 불에서 멀수록 어둡다. lights: [[x,y,r]] */
function darkness(ctx, lights, amb, tint) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = tint; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'destination-out';
  for (const [lx, ly, r, k = 1] of lights) { const g = x.createRadialGradient(lx, ly, 0, lx, ly, r); g.addColorStop(0, `rgba(0,0,0,${k})`); g.addColorStop(0.5, `rgba(0,0,0,${k * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(lx - r, ly - r, r * 2, r * 2); }
  ctx.globalAlpha = amb; ctx.drawImage(c, 0, 0); ctx.globalAlpha = 1;
  c.width = c.height = 0;
}

/* ---------- 방마다 ---------- */
const ROOMS = {
  // 집 안 난롯가: 돌 화덕, 걸린 솥, 들보에 매단 마른 풀, 탁자와 빵, 작은 창
  hearth(ctx, e) {
    const { R, S, P, lk, wins } = e, B = [250, 70, 950, 330];
    room(ctx, B, { ceil: dark(lk.wood, 0.55), floor: dark(lk.wood, 0.2), side: mixh(lk.stone, '#c8b89a', 0.3), back: mixh(lk.stone, '#d8c8a8', 0.35) });
    planks(ctx, B[0], B[1], B[2], B[1] + 70, dark(lk.wood, 0.1), R, 26);
    stones(ctx, B[0], B[1] + 70, B[2], B[3], mixh(lk.stone, '#d8c8a8', 0.25), R, 30);
    floorBoards(ctx, B, dark(lk.wood, 0.2), R);
    beams(ctx, B, lk.wood, 3);
    // 화덕
    const fx = 470, fy = B[3];
    stones(ctx, fx - 130, B[1] + 20, fx + 130, fy, dark(lk.stone, 0.12), R, 24);
    ctx.fillStyle = dark(lk.stone, 0.35); ctx.fillRect(fx - 150, B[1] + 84, 300, 18);
    ctx.fillStyle = '#120c0a'; ctx.beginPath(); ctx.moveTo(fx - 88, fy); ctx.lineTo(fx - 88, B[1] + 150); ctx.quadraticCurveTo(fx, B[1] + 118, fx + 88, B[1] + 150); ctx.lineTo(fx + 88, fy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1a12'; for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(fx - 30 + i * 20, fy - 10); ctx.rotate(-0.3 + i * 0.2); ctx.fillRect(-30, -5, 60, 10); ctx.restore(); }
    flame(ctx, fx - 22, fy - 12, 2.0, R); flame(ctx, fx + 14, fy - 10, 2.4, R); flame(ctx, fx + 40, fy - 8, 1.4, R);
    // 솥
    ctx.strokeStyle = '#1a1412'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, B[1] + 136); ctx.lineTo(fx, fy - 74); ctx.stroke();
    ctx.fillStyle = '#1c1816'; ctx.beginPath(); ctx.ellipse(fx, fy - 52, 30, 24, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,110,.35)'; ctx.beginPath(); ctx.ellipse(fx - 8, fy - 38, 18, 8, 0, 0, Math.PI); ctx.fill();
    puff(ctx, fx, fy - 84, 22, 26, '#d8d0c4', 0.25); puff(ctx, fx - 6, fy - 112, 30, 30, '#d8d0c4', 0.14);
    // 마른 풀 다발
    for (let i = 0; i < 6; i++) { const x = 640 + i * 46, y = 78; ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = ['#6a7a3a', '#8a7a3a', '#7a5a3a'][i % 3]; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.lineTo(x + 3, y + 40 + R() * 16); ctx.lineTo(x - 3, y + 40 + R() * 16); ctx.closePath(); ctx.fill(); }
    // 창
    windowOut(ctx, 790, B[1] + 60, 86, 100, S, P, R, { frame: dark(lk.wood, 0.4) });
    shaft(ctx, 790, B[1] + 60, 86, 100, S, -260, 230, 0.8, R);
    // 탁자, 빵, 단지, 등받이 없는 의자
    table(ctx, 760, 420, 300, 1.8, lk.wood);
    ctx.fillStyle = '#b07a3a'; ctx.beginPath(); ctx.ellipse(700, 368, 30, 14, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#6a4a3a'; ctx.beginPath(); ctx.ellipse(800, 360, 16, 22, 0, 0, 6.3); ctx.fill(); ctx.fillRect(793, 330, 14, 10);
    candle(ctx, 860, 373, 1.6, wins);
    ctx.fillStyle = dark(lk.wood, 0.5); ctx.fillRect(560, 400, 70, 12); ctx.fillRect(566, 412, 8, 40); ctx.fillRect(616, 412, 8, 40);
    // 털가죽 깔개
    ctx.fillStyle = 'rgba(120,96,70,.6)'; ctx.beginPath(); ctx.ellipse(470, 400, 140, 26, 0, 0, 6.3); ctx.fill();
    wins.push([fx, fy - 20, 60, '#ff9a40'], [fx + 30, fy - 16, 40, '#ffb050']);
    e.lights = [[fx, fy - 30, 520, 1], [860, 355, 200, 0.6], [833, B[1] + 110, S.tod === 'night' ? 120 : 360, S.tod === 'night' ? 0.25 : 0.8]];
    e.glows = [[fx, fy - 30, 300, '#ff9a48', 0.55], [fx, fy - 20, 120, '#ffd080', 0.5], [860, 356, 70, '#ffc870', 0.4]];
    e.near = dark(lk.wood, 0.75);
  },
  // 주점: 긴 탁자, 술통 쌓인 계산대, 매달린 등, 손님들
  tavern(ctx, e) {
    const { R, S, P, lk, wins } = e, B = [300, 80, 900, 320];
    room(ctx, B, { ceil: dark(lk.wood, 0.6), floor: dark(lk.wood, 0.25), side: dark(lk.wood, 0.1), back: mixh(lk.wood, '#8a6a48', 0.4) });
    planks(ctx, B[0], B[1], B[2], B[3], mixh(lk.wood, '#8a6a48', 0.35), R, 30);
    floorBoards(ctx, B, dark(lk.wood, 0.25), R);
    beams(ctx, B, lk.wood, 4);
    // 뒷벽 선반과 술병
    for (const y of [B[1] + 60, B[1] + 110]) { ctx.fillStyle = dark(lk.wood, 0.5); ctx.fillRect(640, y, 240, 6); for (let i = 0; i < 10; i++) { const x = 650 + i * 23; ctx.fillStyle = ['#3a5a3a', '#5a3a2a', '#6a6a3a', '#2a3a5a'][i % 4]; ctx.fillRect(x, y - 22, 10, 22); ctx.fillRect(x + 3, y - 30, 4, 8); } }
    // 벽난로 (왼쪽 뒤)
    const fx = 400, fy = B[3];
    stones(ctx, fx - 80, B[1] + 40, fx + 80, fy, lk.stone, R, 22);
    ctx.fillStyle = '#120c0a'; ctx.fillRect(fx - 50, fy - 90, 100, 90);
    flame(ctx, fx - 10, fy - 8, 1.6, R); flame(ctx, fx + 16, fy - 6, 1.2, R);
    // 계산대와 술통
    ctx.fillStyle = dark(lk.wood, 0.3); ctx.beginPath(); ctx.moveTo(1200, 300); ctx.lineTo(880, 330); ctx.lineTo(880, 390); ctx.lineTo(1200, 440); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(light(lk.wood, 0.3), 0.4); ctx.beginPath(); ctx.moveTo(1200, 300); ctx.lineTo(880, 330); ctx.lineTo(880, 334); ctx.lineTo(1200, 306); ctx.closePath(); ctx.fill();
    for (const [x, y, s] of [[960, 300, 1.2], [1000, 300, 1.2], [1040, 300, 1.2], [980, 256, 1.15], [1020, 256, 1.15]]) barrel(ctx, x, y, s, lk.wood, lk.metal);
    figure(ctx, 930, 330, 1.5, '#1e1612', { rim: '#ffb060', side: -1 }); // 주인
    // 등잔
    for (const [x, y] of [[520, 140], [720, 120], [880, 170]]) { ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - 14); ctx.stroke(); ctx.fillStyle = '#2a1e14'; ctx.fillRect(x - 9, y - 14, 18, 22); ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 5, y - 9, 10, 12); wins.push([x, y - 3, 26, '#ffc060']); }
    // 탁자와 손님들
    const people = [[480, 400, 1.6], [560, 400, 1.6], [640, 396, 1.5], [760, 404, 1.7], [350, 452, 2.2], [840, 450, 2.2]];
    table(ctx, 560, 420, 260, 1.7, lk.wood);
    for (const [x, y, s] of people.slice(0, 3)) figure(ctx, x, y - 30, s * 0.9, '#20160f', { rim: '#ffb060', side: x < 600 ? 1 : -1, hood: R() < 0.2 });
    table(ctx, 780, 440, 160, 1.9, lk.wood);
    figure(ctx, 760, 404, 1.6, '#1a120c', { rim: '#ffb060', side: -1 });
    for (const [x, y] of [[520, 372], [585, 372], [770, 393], [800, 393]]) mug(ctx, x, y, 1.6, lk.metal);
    candle(ctx, 640, 375, 1.4, wins);
    figure(ctx, 330, 480, 2.6, '#0e0a08'); figure(ctx, 880, 482, 2.4, '#0e0a08', { hood: true });
    wins.push([fx, fy - 20, 40, '#ff9a40']);
    e.lights = [[fx, fy - 30, 300, 0.9], [1000, 260, 220, 0.5], [520, 140, 260, 0.7], [720, 120, 280, 0.75], [880, 170, 260, 0.7], [640, 360, 220, 0.7]];
    e.glows = [[fx, fy - 30, 160, '#ff9a48', 0.45], [720, 120, 160, '#ffc060', 0.35], [520, 140, 130, '#ffc060', 0.3], [880, 170, 130, '#ffc060', 0.3], [640, 358, 90, '#ffc870', 0.4]];
    e.near = dark(lk.wood, 0.8);
    void P;
  },
  // 성의 홀: 줄지은 기둥, 붉은 깔개, 단 위의 높은 자리, 늘어진 깃발, 높은 창의 빛줄기, 화로
  hall(ctx, e) {
    const { R, S, P, lk, wins } = e, B = [440, 60, 760, 290];
    const stone = mixh(lk.stone, '#9a8e7e', 0.3);
    room(ctx, B, { ceil: dark(stone, 0.6), floor: dark(stone, 0.25), side: dark(stone, 0.15), back: stone });
    stones(ctx, B[0], B[1], B[2], B[3], stone, R, 18);
    floorBoards(ctx, B, dark(stone, 0.3), R, true);
    // 깔개
    poly(ctx, [[B[0] + 120, B[3]], [B[2] - 120, B[3]], [700, H], [500, H]], lk.cloth);
    poly(ctx, [[B[0] + 124, B[3]], [B[2] - 124, B[3]], [690, H], [510, H]], mixh(lk.cloth, '#000000', 0.1));
    ctx.strokeStyle = rgba(lk.metal, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(B[0] + 124, B[3]); ctx.lineTo(510, H); ctx.moveTo(B[2] - 124, B[3]); ctx.lineTo(690, H); ctx.stroke();
    // 단과 높은 자리
    ctx.fillStyle = dark(stone, 0.2); ctx.fillRect(B[0] + 60, B[3] - 24, 200, 24); ctx.fillStyle = dark(stone, 0.35); ctx.fillRect(B[0] + 80, B[3] - 36, 160, 12);
    const tx = 600, ty = B[3] - 36;
    ctx.fillStyle = dark(lk.wood, 0.3); ctx.beginPath(); ctx.moveTo(tx - 26, ty); ctx.lineTo(tx - 26, ty - 70); ctx.quadraticCurveTo(tx, ty - 96, tx + 26, ty - 70); ctx.lineTo(tx + 26, ty); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lk.cloth; ctx.fillRect(tx - 18, ty - 60, 36, 40);
    ctx.fillStyle = lk.metal; ctx.beginPath(); ctx.arc(tx, ty - 80, 5, 0, 6.3); ctx.fill();
    // 뒷벽 높은 창 셋
    for (const x of [490, 580, 670]) windowOut(ctx, x, B[1] + 18, 40, 110, S, P, R, { arch: true, thin: true, frame: dark(stone, 0.5) });
    // 깃발
    for (const x of [470, 730]) { ctx.fillStyle = lk.cloth; ctx.beginPath(); ctx.moveTo(x - 16, B[1] + 20); ctx.lineTo(x + 16, B[1] + 20); ctx.lineTo(x + 16, B[1] + 140); ctx.lineTo(x, B[1] + 126); ctx.lineTo(x - 16, B[1] + 140); ctx.closePath(); ctx.fill(); ctx.fillStyle = lk.metal; ctx.beginPath(); ctx.arc(x, B[1] + 70, 8, 0, 6.3); ctx.fill(); }
    // 기둥: 앞으로 올수록 크고 바깥으로
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const t = 0.12 + i * 0.27, s = scaleAt(B, t), y = floorY(B, t), cx = 600 + side * (190 * s * 0.72 + 10);
      const w = 22 * s, top = Math.max(0, B[1] * (1 - t) - 4);
      ctx.fillStyle = mixh(stone, '#000000', 0.18 + (1 - t) * 0.1); ctx.fillRect(cx - w / 2, top, w, y - top);
      ctx.fillStyle = rgba(light(stone, 0.4), 0.3); ctx.fillRect(cx - side * w / 2 - (side > 0 ? 0 : w * 0.18), top, w * 0.18, y - top);
      ctx.fillStyle = dark(stone, 0.35); ctx.fillRect(cx - w * 0.7, y - 10 * s, w * 1.4, 10 * s); ctx.fillRect(cx - w * 0.7, top + 30 * s * 0.4, w * 1.4, 8 * s);
      // 화로 (가운데 두 쌍)
      if (i === 1) { const bx = cx - side * 36 * s, by = y; ctx.fillStyle = '#1a1412'; ctx.fillRect(bx - 3 * s, by - 34 * s, 6 * s, 34 * s); ctx.beginPath(); ctx.ellipse(bx, by - 34 * s, 14 * s, 5 * s, 0, 0, 6.3); ctx.fill(); flame(ctx, bx, by - 36 * s, s * 0.9, R); wins.push([bx, by - 44 * s, 30 * s, '#ff9a40']); e.lightsExtra.push([bx, by - 44 * s, 240 * s, 0.9], [bx, by - 44 * s, 120 * s, '#ff9a48', 0.45]); }
    }
    for (const x of [490, 580, 670]) shaft(ctx, x, B[1] + 18, 40, 110, S, (S.dir ?? 1) * -40, 190, 1.2, R);
    // 앞에 선 신하들
    figure(ctx, 470, 440, 1.8, '#140f0c', { rim: '#ffb060', side: 1 }); figure(ctx, 740, 446, 1.9, '#140f0c', { rim: '#ffb060', side: -1, hood: true });
    e.lights = [[600, B[1] + 80, 320, 0.7], [600, 300, 260, 0.6], ...e.lightsExtra.filter((l) => l.length === 4)];
    e.glows = [[600, B[1] + 70, 200, S.tod === 'night' ? '#8aa0d8' : '#fff0d0', S.tod === 'night' ? 0.12 : 0.22], ...e.lightsExtra.filter((l) => l.length === 5).map(([x, y, r, c, a]) => [x, y, r, c, a])];
    e.near = dark(stone, 0.8);
  },
  // 신전: 회랑 기둥, 앞쪽 신자석, 제단의 촛불, 뒤쪽 높은 빛창(색유리)
  temple(ctx, e) {
    const { R, S, P, lk, wins } = e, B = [470, 40, 730, 300];
    const stone = mixh(lk.stone, '#c8bea8', 0.35);
    room(ctx, B, { ceil: dark(stone, 0.55), floor: dark(stone, 0.2), side: dark(stone, 0.1), back: mixh(stone, '#000', 0.05) });
    stones(ctx, B[0], B[1], B[2], B[3], stone, R, 16);
    floorBoards(ctx, B, dark(stone, 0.25), R, true);
    // 둥근 빛창: 색유리
    const rx = 600, ry = 120, rr = 58;
    ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(rx, ry, rr + 8, 0, 6.3); ctx.fill();
    const cols = ['#c8463a', '#3a6ac8', '#e8b84a', '#4aa86a', '#9a4ac8', '#e8e0c0'];
    const lightK = S.tod === 'night' ? 0.35 : S.overcast ? 0.7 : 1;
    for (let i = 0; i < 12; i++) { ctx.fillStyle = mixh(cols[i % cols.length], '#000000', 1 - lightK * 0.85); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.arc(rx, ry, rr, (i / 12) * 6.283, ((i + 1) / 12) * 6.283); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 3; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos((i / 12) * 6.283) * rr, ry + Math.sin((i / 12) * 6.283) * rr); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(rx, ry, rr * 0.4, 0, 6.3); ctx.fillStyle = mixh('#f0e0a0', '#000', 1 - lightK * 0.9); ctx.fill(); ctx.stroke();
    // 양옆 긴 창 (창밖)
    for (const x of [500, 670]) windowOut(ctx, x, 150, 30, 100, S, P, R, { arch: true, thin: true, frame: '#1a1410' });
    // 제단과 촛불
    ctx.fillStyle = dark(stone, 0.1); ctx.fillRect(540, B[3] - 46, 120, 46); ctx.fillStyle = mixh(lk.cloth, '#f0e8d0', 0.4); ctx.fillRect(546, B[3] - 46, 108, 20);
    for (let i = 0; i < 7; i++) candle(ctx, 548 + i * 17, B[3] - 46, 1.1 + (i % 2) * 0.3, wins);
    ctx.fillStyle = lk.metal; ctx.fillRect(597, B[3] - 92, 6, 40); ctx.fillRect(584, B[3] - 80, 32, 5);
    // 기둥과 아치
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const t = 0.1 + i * 0.28, s = scaleAt(B, t), y = floorY(B, t), cx = 600 + side * (150 * s * 0.85 + 8);
      const w = 18 * s, top = Math.max(0, B[1] * (1 - t) - 4);
      ctx.fillStyle = mixh(stone, '#000000', 0.16 + (1 - t) * 0.12); ctx.fillRect(cx - w / 2, top, w, y - top);
      ctx.fillStyle = rgba(light(stone, 0.5), 0.22); ctx.fillRect(cx - side * w * 0.3, top, w * 0.2, y - top);
    }
    // 신자석과 무릎 꿇은 사람들
    for (let r = 0; r < 4; r++) { const t = 0.25 + r * 0.17, s = scaleAt(B, t), y = floorY(B, t); for (const side of [-1, 1]) { const x0 = 600 + side * 30 * s, x1 = 600 + side * 120 * s; const px = Math.min(x0, x1), pw = Math.abs(x1 - x0); ctx.fillStyle = dark(lk.wood, 0.45); ctx.fillRect(px, y - 26 * s, pw, 14 * s); ctx.fillStyle = dark(lk.wood, 0.3); ctx.fillRect(px, y - 12 * s, pw, 4 * s); ctx.fillStyle = rgba(light(lk.wood, 0.35), 0.35); ctx.fillRect(px, y - 26 * s, pw, 1.5 * s); ctx.fillStyle = dark(lk.wood, 0.55); ctx.fillRect(px + 2 * s, y - 8 * s, 4 * s, 8 * s); ctx.fillRect(px + pw - 6 * s, y - 8 * s, 4 * s, 8 * s); if (R() < 0.45) figure(ctx, (x0 + x1) / 2 + (R() - 0.5) * 30 * s, y - 10 * s, s * 0.8, '#140f0c', { hood: R() < 0.5, rim: '#ffd8a0', side: -side }); } }
    shaft(ctx, rx - rr, ry - rr, rr * 2, rr * 2, S, 0, 230, 1.4, R);
    e.lights = [[600, B[3] - 60, 260, 0.9], [rx, ry, 300, S.tod === 'night' ? 0.4 : 0.85]];
    e.glows = [[600, B[3] - 62, 130, '#ffc870', 0.45], [rx, ry, 150, S.tod === 'night' ? '#8a8ad8' : '#f0d8a0', S.tod === 'night' ? 0.1 : 0.25]];
    e.near = dark(stone, 0.82);
  },
  // 공방: 화덕과 모루, 벽에 걸린 연장, 작업대와 대팻밥, 창
  workshop(ctx, e) {
    const { R, S, P, lk, wins } = e, B = [260, 70, 940, 330];
    room(ctx, B, { ceil: dark(lk.wood, 0.55), floor: '#3a3028', side: dark(lk.stone, 0.2), back: lk.stone });
    stones(ctx, B[0], B[1], B[2], B[3], dark(lk.stone, 0.05), R, 28);
    floorBoards(ctx, B, '#3a3028', R, true);
    beams(ctx, B, lk.wood, 3);
    // 화덕 (왼쪽)
    const fx = 400, fy = B[3];
    ctx.fillStyle = dark(lk.stone, 0.3); ctx.fillRect(fx - 90, fy - 110, 180, 110);
    ctx.fillStyle = dark(lk.stone, 0.4); ctx.beginPath(); ctx.moveTo(fx - 70, fy - 110); ctx.lineTo(fx - 30, B[1]); ctx.lineTo(fx + 30, B[1]); ctx.lineTo(fx + 70, fy - 110); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#120a06'; ctx.fillRect(fx - 50, fy - 90, 100, 46);
    const coal = ctx.createRadialGradient(fx, fy - 56, 2, fx, fy - 56, 50); coal.addColorStop(0, '#fff0a0'); coal.addColorStop(0.3, '#ff9a2a'); coal.addColorStop(1, '#5a1a0a');
    ctx.fillStyle = coal; ctx.fillRect(fx - 46, fy - 72, 92, 26);
    flame(ctx, fx, fy - 70, 1.3, R);
    // 모루
    const ax = 560, ay = 400;
    ctx.fillStyle = '#2a2624'; ctx.fillRect(ax - 22, ay - 30, 44, 30); ctx.beginPath(); ctx.moveTo(ax - 50, ay - 30); ctx.lineTo(ax + 40, ay - 30); ctx.quadraticCurveTo(ax + 80, ay - 34, ax + 90, ay - 44); ctx.lineTo(ax - 50, ay - 48); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,90,.35)'; ctx.fillRect(ax - 50, ay - 48, 120, 3);
    ctx.fillStyle = '#ff8a3a'; ctx.fillRect(ax - 10, ay - 54, 46, 6); // 달군 쇠
    // 불티
    for (let i = 0; i < 40; i++) { const a = -Math.PI / 2 + (R() - 0.5) * 2.2, d = 10 + R() * 70; ctx.fillStyle = R() < 0.5 ? '#ffd070' : '#ff8a3a'; ctx.fillRect(ax + 12 + Math.cos(a) * d, ay - 54 + Math.sin(a) * d, 2, 2); }
    figure(ctx, ax + 110, 452, 2.0, '#120c08', { rim: '#ff9a48', side: -1 });
    // 벽 연장
    ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const x = 640 + i * 30, y = B[1] + 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 50 + (i % 3) * 14); ctx.stroke(); ctx.fillStyle = '#3a3634'; if (i % 3 === 0) ctx.fillRect(x - 8, y + 50, 16, 10); else if (i % 3 === 1) { ctx.beginPath(); ctx.arc(x, y + 66, 7, 0, 6.3); ctx.fill(); } else ctx.fillRect(x - 3, y + 78, 6, 16); }
    // 작업대와 판자
    ctx.fillStyle = dark(lk.wood, 0.2); ctx.beginPath(); ctx.moveTo(760, 330); ctx.lineTo(1200, 360); ctx.lineTo(1200, 390); ctx.lineTo(760, 350); ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark(lk.wood, 0.5); ctx.fillRect(780, 348, 10, 70); ctx.fillRect(1080, 380, 14, 100);
    ctx.fillStyle = '#c8a070'; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.ellipse(820 + R() * 300, 440 + R() * 30, 6 + R() * 6, 2, R() * 3, 0, 6.3); ctx.fill(); }
    windowOut(ctx, 820, B[1] + 40, 90, 110, S, P, R, { frame: dark(lk.wood, 0.4) });
    shaft(ctx, 820, B[1] + 40, 90, 110, S, -240, 240, 0.9, R);
    wins.push([fx, fy - 60, 50, '#ff8a3a'], [ax + 12, ay - 52, 24, '#ff9a40']);
    e.lights = [[fx, fy - 60, 380, 1], [ax, ay - 50, 220, 0.8], [865, B[1] + 95, S.tod === 'night' ? 100 : 340, S.tod === 'night' ? 0.2 : 0.8]];
    e.glows = [[fx, fy - 60, 220, '#ff8a3a', 0.5], [ax + 12, ay - 52, 90, '#ffa050', 0.35]];
    e.near = '#140e0a';
    void P;
  },
};

const cache = new Map();
/** 실내 그림 (그림 주소). kind: hearth tavern hall temple workshop */
export function interiorImage({ kind = 'hearth', year = 500, month = 1, place = 'ern' } = {}) {
  if (!ROOMS[kind]) kind = 'hearth';
  const key = `${kind}-${year}-${month}-${place}`;
  if (cache.has(key)) return cache.get(key);
  if (typeof document === 'undefined') return '';
  let url = '';
  try { url = draw(kind, year, month, place); } catch (err) { if (globalThis.FL_SCENE_DEBUG) console.error(err); }
  if (!url) return '';
  while (cache.size >= 6) { const [k, old] = cache.entries().next().value; cache.delete(k); dropUrl(old); }
  cache.set(key, url);
  return url;
}
function draw(kind, year, month, place) {
  let D; try { D = describe(place); } catch { D = { culture: 'leonia', biome: 'plain', seed: 1 }; }
  const c0 = conditions(year, month), k = year * 12 + month;
  const S = skyOf(c0.tod, c0.weather, D.biome, k), P = paletteOf(month, D.biome, false);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const R = rng(strSeed(kind + place) % 100000 + 7);
  const e = { R, S, P, lk: lookOf(D.culture), wins: [], lights: [], glows: [], lightsExtra: [], near: '#0e0a08' };
  ROOMS[kind](ctx, e);
  // 어둠과 불빛: 낮이면 창빛 덕에 덜 어둡다
  // 따뜻한 빛깔로 고르고(곱하기), 불에서 먼 곳은 어둠에 잠긴다
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = S.tod === 'night' ? '#b8a8a0' : '#e0c8a8'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  const amb = clamp((S.tod === 'night' ? 0.93 : S.tod === 'day' ? (S.overcast ? 0.84 : 0.76) : 0.86) + (kind === 'tavern' ? 0.03 : 0), 0, 0.96);
  darkness(ctx, e.lights, amb, S.tod === 'night' ? '#05050b' : '#0c0704');
  darkness(ctx, e.lights.map(([x, y, r, k]) => [x, y, r * 0.55, k]), 0.35, S.tod === 'night' ? '#05050b' : '#0c0704');
  for (const [x, y, r, c, a] of e.glows) glow(ctx, x, y, r, c, a);
  nearEdge(ctx, '#0b0705');
  paintFinish(ctx, W, H, { ...S, tod: S.tod === 'day' ? 'dusk' : S.tod }, { hz: 0.62, land: false, strength: 0.9, edgeK: 1.4 });
  grain(ctx);
  const url = canvasUrl(cv, 'image/jpeg', 0.88);
  noteMotion(url, { kind: 'scene', w: W, h: H, weather: 'clear', tod: S.tod, wins: e.wins.slice(0, 24) });
  return url;
}

/* ---------- 어느 달에 실내를 쓰나 ---------- */
const KIND_OF = [
  ['tavern', /^(inn_|deep_tavern|serenia_teahouse|gather_party|party_manage|repute_boast|contest_gamble|voc_busk|troupe_show|aftermath_sober|gang_seek|gang_job|cuisine_serve)/],
  ['hall', /^(court_|realm_office|domain_rule|envoy_|exile_court|estate_manage|buy_title|repute_feast|keep_feast|order_duty|order_lead|so_|society_)/],
  ['temple', /^(pray|worship|solaris_mass|faith_seek|holy_heal|dawn_rite|elder_funeral|peoples_rite|lineage_rite|haunt_rite|omen_preach|relic_offer|forbidden_rite|vessel_rite|imprint_rite|bloodyears_rite)/],
  ['workshop', /^(graubel_forge|open_shop|shop_manage|era_shop|tower_craft|cloth_(spin|loom|weave|dye)|brew_|apo_brew|voc_potions|lineage_forge|builder_shop|cuisine_(cook|kitchen|create)|research|shipyard|inn_kitchen)/],
  ['hearth', /^(rest|help_home|kin_time|love_spouse|health_rest|health_tend|elder_care|elder_memoir|letters_write|letters_forge|household_manage|house_room|na_write|arts_work|arts_read|spell_study|magic_selfstudy|school_study|law_study|seal_study|ruin_read|study|meditate)$/],
];
const CRAFT_JOB = /smith|carpent|mason|tailor|weav|bak|brew|pott|cook|chef|alchem|apothec|jewel|tann|cobbl|cooper|chandler|glass|print|clock|loom|forge/;
/** 화면 맨 위 큰 그림: 이번 달 고른 일이 실내 쪽이 많으면 { kind }, 아니면 null. 길 위·재앙 든 달은 바깥. */
export function sceneFor(g, calamity = null) {
  if (!g?.player || g.over || calamity) return null;
  const life = g.life ?? {}, job = life.job?.id ?? '';
  if (life.travel) return null;
  const ids = (g.lastResults ?? []).map((r) => r.id).filter(Boolean);
  if (!ids.length) return null;
  const count = {};
  for (const id of ids) {
    let kind = KIND_OF.find(([, re]) => re.test(id))?.[0] ?? null;
    if (!kind && id === 'work' && CRAFT_JOB.test(job)) kind = 'workshop';
    if (!kind && id === 'work' && /inn|tavern|barmaid|server/.test(job)) kind = 'tavern';
    if (kind === 'hearth' && ['street', 'slum', 'none'].includes(life.home)) kind = null;
    if (kind) count[kind] = (count[kind] ?? 0) + 1;
  }
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < Math.max(1, Math.ceil(ids.length / 2))) return null;
  return { kind: best[0] };
}
