// 51단계 도우미4: 실내의 가까운 층. 폰은 그림 가운데(가로 약 225~975)만 보이므로, 그 아래쪽에
// 내 앞 탁자 모서리(그 위의 그릇·잔·주사위·연장)나 신전 의자 등받이를 크게 세워, 방을 '들여다보는' 그림이 아니라
// '그 방 안에 앉아 있는' 그림이 되게 한다. 위에는 가까운 들보나 기둥, 걸린 것이 걸린다.
import { W, H, mixh, rgba, dark, light, puff } from './sceneKit.js';

const X0 = 200, X1 = 1000;

/** kind: hearth tavern hall temple workshop. e: 방 그리기에 쓴 것 (lk 빛깔, lights 불빛, S 하늘, R 난수) */
export function interiorNear(ctx, kind, e) {
  const { lk, R, S } = e;
  const key = e.lights?.[0] ?? [W / 2, H / 2, 300, 1];
  const kx = key[0], ky = key[1];
  const warm = S.tod === 'night' ? '#ffb060' : '#ffc888';
  const night = S.tod === 'night';
  if (kind === 'temple') { pews(ctx, lk, R, kx, warm); votives(ctx, R, night); topBeam(ctx, lk, 'arch'); return; }
  topBeam(ctx, lk, kind === 'hall' ? 'banner' : 'beam', R);
  const topY = H - 122, side = kx < W / 2 ? -1 : 1;
  // 탁자: 앞으로 넓어지는 윗면과 앞면, 결과 불빛
  const wood = kind === 'hall' ? mixh(lk.wood, '#3a2418', 0.2) : lk.wood;
  const g = ctx.createLinearGradient(kx, topY, kx - side * 600, topY);
  g.addColorStop(0, mixh(wood, warm, 0.28)); g.addColorStop(1, dark(wood, 0.35));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X0 - 80, topY + 14); ctx.lineTo(X1 + 80, topY + 4); ctx.lineTo(X1 + 80, topY + 84); ctx.lineTo(X0 - 80, topY + 96); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(dark(wood, 0.5), 0.5); ctx.lineWidth = 1;
  for (let i = 0; i < 11; i++) { const y = topY + 12 + i * 7.5; ctx.beginPath(); ctx.moveTo(X0 - 80, y + 2 + R() * 2); ctx.bezierCurveTo(500, y - 2 + R() * 4, 800, y + R() * 4, X1 + 80, y - 8 + R() * 2); ctx.stroke(); }
  ctx.strokeStyle = rgba(light(warm, 0.3), 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0 - 80, topY + 14); ctx.lineTo(X1 + 80, topY + 4); ctx.stroke();
  ctx.fillStyle = dark(wood, 0.62); ctx.beginPath(); ctx.moveTo(X0 - 80, topY + 96); ctx.lineTo(X1 + 80, topY + 84); ctx.lineTo(X1 + 80, H); ctx.lineTo(X0 - 80, H); ctx.closePath(); ctx.fill();
  if (kind === 'hall') { // 상보
    ctx.fillStyle = mixh(lk.cloth, '#1a0e0a', 0.25); ctx.beginPath(); ctx.moveTo(X0 - 80, topY + 50); ctx.lineTo(X1 + 80, topY + 40); ctx.lineTo(X1 + 80, H); ctx.lineTo(X0 - 80, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(lk.metal, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0 - 80, topY + 62); ctx.lineTo(X1 + 80, topY + 52); ctx.stroke();
  }
  const y = (x) => topY + 14 - (x - (X0 - 80)) * (10 / (X1 - X0 + 160)) + 46;
  const rim = (x) => (x < kx ? 1 : -1); // 불 쪽 가장자리
  ITEMS[kind]?.(ctx, { y, R, lk, warm, rim, kx, ky, night });
}

function topBeam(ctx, lk, how, R) {
  if (how === 'arch') { // 신전: 가까운 기둥 하나가 왼쪽을 가린다
    const g = ctx.createLinearGradient(X0, 0, X0 + 90, 0); g.addColorStop(0, '#0a0806'); g.addColorStop(0.75, dark(lk.stone ?? '#6a6050', 0.72)); g.addColorStop(1, dark(lk.stone ?? '#6a6050', 0.82));
    ctx.fillStyle = g; ctx.fillRect(X0 - 40, 0, 125, H);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5; for (let y = 30; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(X0 - 40, y); ctx.lineTo(X0 + 85, y); ctx.stroke(); }
    ctx.strokeStyle = rgba('#ffd8a0', 0.25); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0 + 85, 0); ctx.lineTo(X0 + 85, H); ctx.stroke();
    return;
  }
  if (how === 'banner') { // 홀: 가까이 늘어진 깃발 자락
    ctx.fillStyle = dark(lk.cloth, 0.35); ctx.beginPath(); ctx.moveTo(X1 - 120, 0); ctx.lineTo(X1 - 30, 0); ctx.lineTo(X1 - 34, 170); ctx.lineTo(X1 - 75, 140); ctx.lineTo(X1 - 116, 172); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(lk.metal, 0.7); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X1 - 116, 150); ctx.lineTo(X1 - 75, 120); ctx.lineTo(X1 - 34, 150); ctx.stroke();
    ctx.fillStyle = rgba(lk.metal, 0.65); ctx.beginPath(); ctx.arc(X1 - 75, 70, 18, 0, 6.3); ctx.fill();
    return;
  }
  // 들보와 걸린 마늘·약초 다발
  ctx.fillStyle = dark(lk.wood, 0.7); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 22); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#ffc888', 0.25); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(W, 22); ctx.stroke();
  for (const hx of [X0 + 70, X0 + 120, X1 - 140]) {
    const hy = 28 - (hx / W) * 8;
    ctx.strokeStyle = '#1a120c'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + 24); ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = -0.7 + i * 0.23, l = 30 + R() * 22; ctx.strokeStyle = mixh('#3a4a24', '#1a140c', R() * 0.6); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hx, hy + 22); ctx.quadraticCurveTo(hx + Math.sin(a) * l * 0.4, hy + 22 + l * 0.6, hx + Math.sin(a) * l * 0.6, hy + 22 + l); ctx.stroke(); }
  }
}

/* ---------- 탁자 위 ---------- */
function shadowAt(ctx, x, y, w) { ctx.fillStyle = 'rgba(10,6,4,.45)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 2, w, w * 0.22, 0, 0, 6.3); ctx.fill(); }
function candleNear(ctx, x, y, s, night) {
  ctx.globalCompositeOperation = 'lighter'; puff(ctx, x, y - 58 * s, 120 * s, 110 * s, '#ff9a40', night ? 0.28 : 0.18); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.ellipse(x, y, 22 * s, 6 * s, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 7 * s, y - 40 * s, 14 * s, 40 * s);
  ctx.fillStyle = 'rgba(120,90,60,.4)'; ctx.fillRect(x + 2 * s, y - 40 * s, 5 * s, 40 * s);
  ctx.fillStyle = '#f2e6cc'; ctx.beginPath(); ctx.moveTo(x - 7 * s, y - 40 * s); ctx.lineTo(x - 9 * s, y - 28 * s); ctx.lineTo(x - 6 * s, y - 34 * s); ctx.fill();
  for (const [c, k] of [['#ff8a30', 1], ['#ffc060', 0.7], ['#fff4c8', 0.4]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y - 52 * s + (1 - k) * 4 * s, 5 * s * k, 12 * s * k, 0, 0, 6.3); ctx.fill(); }
}
function tankard(ctx, x, y, s, body, warm, side, foam) {
  shadowAt(ctx, x, y, 30 * s);
  ctx.fillStyle = dark(body, 0.25); ctx.beginPath(); ctx.moveTo(x - 20 * s, y); ctx.lineTo(x - 17 * s, y - 54 * s); ctx.lineTo(x + 17 * s, y - 54 * s); ctx.lineTo(x + 20 * s, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark(body, 0.25); ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.arc(x - side * 22 * s, y - 28 * s, 12 * s, side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, side > 0 ? Math.PI * 1.5 : Math.PI * 0.5); ctx.stroke();
  ctx.fillStyle = rgba(mixh(body, warm, 0.5), 0.8); ctx.fillRect(x + side * 9 * s - 3 * s, y - 52 * s, 6 * s, 50 * s);
  ctx.strokeStyle = dark(body, 0.5); ctx.lineWidth = 2.4 * s; for (const k of [0.2, 0.75]) { ctx.beginPath(); ctx.moveTo(x - 19 * s, y - 54 * s * k); ctx.lineTo(x + 19 * s, y - 54 * s * k); ctx.stroke(); }
  if (foam) { ctx.fillStyle = '#efe4c8'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x - 14 * s + i * 5.6 * s, y - 56 * s - (i % 2) * 3 * s, 6 * s, 0, 6.3); ctx.fill(); } }
}
function bowl(ctx, x, y, s, c, warm, steam) {
  shadowAt(ctx, x, y, 46 * s);
  ctx.fillStyle = dark(c, 0.3); ctx.beginPath(); ctx.ellipse(x, y - 16 * s, 44 * s, 12 * s, 0, 0, Math.PI); ctx.quadraticCurveTo(x - 30 * s, y + 4 * s, x, y + 2 * s); ctx.quadraticCurveTo(x + 30 * s, y + 4 * s, x + 44 * s, y - 16 * s); ctx.fill();
  ctx.fillStyle = mixh(c, warm, 0.3); ctx.beginPath(); ctx.ellipse(x, y - 16 * s, 44 * s, 11 * s, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#8a4a24'; ctx.beginPath(); ctx.ellipse(x, y - 15 * s, 37 * s, 8 * s, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(220,150,80,.6)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x - 24 * s + i * 9 * s, y - 16 * s + (i % 2) * 3 * s, 4 * s, 2 * s, 0, 0, 6.3); ctx.fill(); }
  if (steam) { ctx.strokeStyle = 'rgba(240,230,210,.22)'; ctx.lineWidth = 4 * s; for (let i = 0; i < 3; i++) { const sx = x - 14 * s + i * 14 * s; ctx.beginPath(); ctx.moveTo(sx, y - 26 * s); ctx.bezierCurveTo(sx - 10 * s, y - 50 * s, sx + 10 * s, y - 70 * s, sx - 4 * s, y - 96 * s); ctx.stroke(); } }
}
function loaf(ctx, x, y, s) {
  shadowAt(ctx, x, y, 40 * s);
  ctx.fillStyle = '#8a5424'; ctx.beginPath(); ctx.ellipse(x, y - 12 * s, 40 * s, 18 * s, 0, Math.PI, 0); ctx.lineTo(x + 40 * s, y - 4 * s); ctx.lineTo(x - 40 * s, y - 4 * s); ctx.fill();
  ctx.fillStyle = '#c8904a'; ctx.beginPath(); ctx.ellipse(x - 6 * s, y - 20 * s, 26 * s, 8 * s, -0.1, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 2 * s; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 14 * s - 6 * s, y - 26 * s); ctx.lineTo(x + i * 14 * s + 6 * s, y - 16 * s); ctx.stroke(); }
  ctx.fillStyle = '#e8d2a0'; ctx.beginPath(); ctx.ellipse(x + 40 * s, y - 12 * s, 6 * s, 14 * s, 0, 0, 6.3); ctx.fill();
}
function dice(ctx, x, y, s, R) {
  for (let i = 0; i < 2; i++) {
    const dx = x + i * 26 * s, dy = y - (i % 2) * 4 * s, a = (R() - 0.5) * 0.4;
    ctx.save(); ctx.translate(dx, dy); ctx.rotate(a);
    ctx.fillStyle = '#d8ccb0'; ctx.fillRect(-9 * s, -18 * s, 18 * s, 18 * s); ctx.fillStyle = '#a89878'; ctx.beginPath(); ctx.moveTo(-9 * s, -18 * s); ctx.lineTo(-4 * s, -23 * s); ctx.lineTo(13 * s, -23 * s); ctx.lineTo(9 * s, -18 * s); ctx.fill();
    ctx.fillStyle = '#2a1a12'; const n = 1 + Math.floor(R() * 6); for (let p = 0; p < n; p++) { ctx.beginPath(); ctx.arc(-4 * s + (p % 3) * 4 * s, -13 * s + Math.floor(p / 3) * 6 * s, 1.6 * s, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
}
function coins(ctx, x, y, s, R, metal) { for (let i = 0; i < 6; i++) { const cx = x + (R() - 0.5) * 50 * s, cy = y - R() * 8 * s; ctx.fillStyle = dark(metal, 0.2); ctx.beginPath(); ctx.ellipse(cx, cy, 8 * s, 3 * s, 0, 0, 6.3); ctx.fill(); ctx.fillStyle = light(metal, 0.3); ctx.beginPath(); ctx.ellipse(cx - 1, cy - 1, 5 * s, 1.6 * s, 0, 0, 6.3); ctx.fill(); } }
function goblet(ctx, x, y, s, metal, warm) {
  shadowAt(ctx, x, y, 20 * s);
  ctx.fillStyle = dark(metal, 0.3); ctx.beginPath(); ctx.ellipse(x, y - 2 * s, 16 * s, 4 * s, 0, 0, 6.3); ctx.fill(); ctx.fillRect(x - 3 * s, y - 34 * s, 6 * s, 32 * s);
  ctx.beginPath(); ctx.moveTo(x - 18 * s, y - 66 * s); ctx.quadraticCurveTo(x - 16 * s, y - 34 * s, x, y - 32 * s); ctx.quadraticCurveTo(x + 16 * s, y - 34 * s, x + 18 * s, y - 66 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(mixh(metal, warm, 0.6), 0.85); ctx.fillRect(x - 13 * s, y - 62 * s, 4 * s, 24 * s);
  ctx.fillStyle = '#5a1420'; ctx.beginPath(); ctx.ellipse(x, y - 66 * s, 17 * s, 4 * s, 0, 0, 6.3); ctx.fill();
}
function platter(ctx, x, y, s, metal, R) {
  shadowAt(ctx, x, y, 70 * s);
  ctx.fillStyle = dark(metal, 0.25); ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 70 * s, 14 * s, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = light(metal, 0.1); ctx.beginPath(); ctx.ellipse(x, y - 6 * s, 60 * s, 10 * s, 0, 0, 6.3); ctx.fill();
  for (let i = 0; i < 9; i++) { ctx.fillStyle = ['#8a2a1e', '#c87a2a', '#5a7a2a', '#a8402a', '#d8b84a'][i % 5]; ctx.beginPath(); ctx.arc(x - 40 * s + R() * 80 * s, y - 14 * s - R() * 14 * s, 9 * s + R() * 5 * s, 0, 6.3); ctx.fill(); }
}
function tools(ctx, x, y, s, metal, wood) {
  shadowAt(ctx, x - 30 * s, y, 40 * s);
  // 망치: 나무 자루와 쇠머리
  ctx.save(); ctx.translate(x - 40 * s, y - 8 * s); ctx.rotate(-0.06);
  ctx.fillStyle = mixh(wood, '#c8a070', 0.35); ctx.fillRect(-70 * s, -4 * s, 90 * s, 8 * s); ctx.fillStyle = 'rgba(255,220,170,.35)'; ctx.fillRect(-70 * s, -4 * s, 90 * s, 2 * s);
  ctx.fillStyle = dark(metal, 0.55); ctx.fillRect(16 * s, -13 * s, 34 * s, 22 * s); ctx.fillStyle = dark(metal, 0.3); ctx.fillRect(16 * s, -13 * s, 34 * s, 5 * s); ctx.fillRect(46 * s, -13 * s, 4 * s, 22 * s);
  ctx.restore();
  // 집게
  ctx.strokeStyle = dark(metal, 0.5); ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 50 * s, y - 2 * s); ctx.lineTo(x + 120 * s, y - 10 * s); ctx.lineTo(x + 150 * s, y - 22 * s); ctx.moveTo(x + 50 * s, y - 10 * s); ctx.lineTo(x + 120 * s, y - 12 * s); ctx.lineTo(x + 152 * s, y - 8 * s); ctx.stroke();
  // 말굽
  ctx.strokeStyle = '#3a3634'; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.arc(x - 150 * s, y - 12 * s, 16 * s, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,150,.35)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x - 150 * s, y - 12 * s, 19 * s, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
}
function shavings(ctx, x, y, s, R) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const cx = x + (R() - 0.5) * 140 * s, cy = y - R() * 8 * s, r = 4 * s + R() * 4 * s, a0 = R() * 6;
    ctx.strokeStyle = R() < 0.5 ? '#c8a070' : '#a88050'; ctx.lineWidth = 2.2 * s;
    ctx.beginPath(); for (let t = 0; t < 9; t++) { const a = a0 + t * 0.7, rr = r * (1 - t * 0.07); const px = cx + Math.cos(a) * rr + t * 1.2 * s, py = cy - 4 * s + Math.sin(a) * rr * 0.6; t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
  }
}
function book(ctx, x, y, s, warm) {
  shadowAt(ctx, x, y, 50 * s);
  ctx.fillStyle = '#3a1e14'; ctx.beginPath(); ctx.moveTo(x - 56 * s, y); ctx.lineTo(x + 56 * s, y - 4 * s); ctx.lineTo(x + 50 * s, y - 14 * s); ctx.lineTo(x - 52 * s, y - 10 * s); ctx.fill();
  ctx.fillStyle = mixh('#e8dcc0', warm, 0.2); ctx.beginPath(); ctx.moveTo(x - 50 * s, y - 10 * s); ctx.quadraticCurveTo(x - 24 * s, y - 22 * s, x, y - 14 * s); ctx.quadraticCurveTo(x + 24 * s, y - 24 * s, x + 50 * s, y - 14 * s); ctx.lineTo(x, y - 8 * s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,30,.4)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 42 * s, y - 13 * s - i * 1.5 * s); ctx.lineTo(x - 8 * s, y - 13 * s - i * 1.8 * s); ctx.moveTo(x + 8 * s, y - 14 * s - i * 1.8 * s); ctx.lineTo(x + 42 * s, y - 15 * s - i * 1.5 * s); ctx.stroke(); }
}

const ITEMS = {
  hearth(ctx, o) { const { y, warm, night } = o; candleNear(ctx, 330, y(330), 1.6, night); bowl(ctx, 540, y(540), 1.7, '#8a6a4a', warm, true); loaf(ctx, 790, y(790) + 6, 1.6); book(ctx, 950, y(950) + 14, 1.3, warm); },
  tavern(ctx, o) { const { y, R, lk, warm, night } = o; tankard(ctx, 380, y(380), 1.8, lk.metal, warm, 1, true); tankard(ctx, 500, y(500) + 14, 1.55, lk.wood, warm, -1, true); dice(ctx, 640, y(640) + 10, 1.9, R); coins(ctx, 790, y(790) + 12, 1.8, R, lk.metal); candleNear(ctx, 930, y(930), 1.3, night); },
  hall(ctx, o) { const { y, R, lk, warm, night } = o; goblet(ctx, 340, y(340), 1.7, lk.metal, warm); platter(ctx, 580, y(580) + 8, 1.7, lk.metal, R); goblet(ctx, 800, y(800) + 10, 1.4, lk.metal, warm); candleNear(ctx, 940, y(940), 1.4, night); },
  workshop(ctx, o) { const { y, R, lk, night } = o; candleNear(ctx, 300, y(300), 1.3, night); tools(ctx, 600, y(600) + 10, 1.6, lk.metal ?? '#8a8a8a', lk.wood); shavings(ctx, 880, y(880) + 12, 1.2, R); },
};

/* ---------- 신전 ---------- */
function pews(ctx, lk, R, kx, warm) {
  const wood = dark(lk.wood, 0.62);
  for (const [x0, x1, yt] of [[X0 - 80, 545, H - 112], [675, X1 + 80, H - 106]]) {
    ctx.fillStyle = wood; ctx.beginPath(); ctx.moveTo(x0, H); ctx.lineTo(x0, yt + 10); ctx.quadraticCurveTo(x0 + 10, yt, x0 + 30, yt); ctx.lineTo(x1 - 30, yt); ctx.quadraticCurveTo(x1 - 10, yt, x1, yt + 10); ctx.lineTo(x1, H); ctx.closePath(); ctx.fill();
    { const g = ctx.createLinearGradient(0, yt, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(6,4,2,.55)'); ctx.fillStyle = g; ctx.fillRect(x0, yt, x1 - x0, H - yt); }
    ctx.strokeStyle = rgba(mixh(lk.wood, warm, 0.5), 0.55); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x0 + 30, yt + 1); ctx.lineTo(x1 - 30, yt + 1); ctx.stroke();
    ctx.strokeStyle = rgba(dark(lk.wood, 0.7), 0.6); ctx.lineWidth = 1.2; for (let x = x0 + 40; x < x1 - 20; x += 46) { ctx.beginPath(); ctx.moveTo(x, yt + 16); ctx.lineTo(x, H); ctx.stroke(); }
    // 등받이에 놓인 기도서
    const bx = x0 + 80 + R() * (x1 - x0 - 200);
    ctx.fillStyle = '#3a1a14'; ctx.fillRect(bx, yt - 8, 44, 9); ctx.fillStyle = '#d8c8a0'; ctx.fillRect(bx + 2, yt - 10, 40, 3);
  }
  void kx;
}
function votives(ctx, R, night) {
  const x0 = X1 - 190, y0 = H - 210;
  ctx.fillStyle = '#1a120c'; ctx.fillRect(x0 - 10, y0, 170, 10); ctx.fillRect(x0 - 10, y0 + 34, 170, 10);
  ctx.globalCompositeOperation = 'lighter'; puff(ctx, x0 + 75, y0 - 10, 160, 90, '#ff9a40', night ? 0.3 : 0.2); ctx.globalCompositeOperation = 'source-over';
  for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) {
    if (R() < 0.25) continue;
    const x = x0 + i * 22 + row * 11, y = y0 + row * 34;
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - 3, y - 14, 6, 14);
    ctx.fillStyle = '#ffc060'; ctx.beginPath(); ctx.ellipse(x, y - 19, 2.6, 5.5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.ellipse(x, y - 18, 1.2, 2.6, 0, 0, 6.3); ctx.fill();
  }
}
