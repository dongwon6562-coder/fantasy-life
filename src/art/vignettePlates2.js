// 사건 삽화의 그림판 (둘째 묶음): 봉인의 흔들림(seal), 일터(trade), 큰 짐승 사냥(beast).
// 그리는 법은 vignettePlates.js와 같다. v는 그릴 때의 형편(때·날씨·계절·장소·사람)이다.
import { fbm1, mixh, rgba, dark, light, puff, vgrad } from './sceneKit.js';
import { VW, VH, HZ, sky, far, townFar, ground, road, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, tree, crows, finish, zoom } from './vignetteKit.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const COLD = '#8fc0ff', DEEP = '#c8402a', WARM = 'rgba(255,180,100,.55)';
const mine = (v, o = {}) => ({ raw: true, cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });

/* ---------- 봉인 ---------- */
/** 어둠 속으로 멀어지는 쇠사슬 한 줄. 멀수록 고리가 작아지고 아래의 붉은 빛에 물든다 */
function chain(v, x0, y0, x1, y1, s0) {
  const { ctx } = v, L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
  let k = 0, i = 0;
  while (k < 1 && i < 400) {
    const s = s0 * (1 - k * 0.84) + 0.5, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * s0 * 1.6;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = rgba(mixh('#62626e', '#7a2018', k * 0.8), 1 - k * 0.45); ctx.lineWidth = Math.max(0.6, s * 0.44);
    ctx.beginPath(); if (i % 2 === 0) ctx.ellipse(0, 0, s * 1.5, s * 0.86, 0, 0, TAU); else { ctx.moveTo(-s * 1.25, 0); ctx.lineTo(s * 1.25, 0); } ctx.stroke();
    if (i % 2 === 0 && s > 3) { ctx.strokeStyle = rgba('#b0b0bc', 0.35); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.5, s * 0.86, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke(); }
    ctx.restore();
    k += (s * 2.15) / L; i++;
  }
}
/** 쇠사슬 꿈: 끝없는 사슬이 어둠 밑으로 이어지고, 그 밑에서 무언가 숨을 쉰다 */
function sealDream(v) {
  const { ctx, R } = v, cx = 350, cy = 226;
  ctx.fillStyle = vgrad(ctx, 0, VH, [[0, '#15131e'], [0.5, '#0b0a11'], [1, '#030304']]); ctx.fillRect(0, 0, VW, VH + 40);
  glow(v, cx, cy + 20, 280, '#6a1616', 0.3, 80); glow(v, cx, cy + 4, 100, DEEP, 0.2, 26);
  for (let i = 0; i < 12; i++) puff(ctx, R() * VW, 130 + R() * 100, 80 + R() * 60, 12 + R() * 8, '#2a2634', 0.16);
  for (const [x, y, s] of [[40, -14, 6], [205, -16, 9.5], [352, -18, 7], [505, -16, 10.5], [652, 24, 6.5], [-12, 70, 5.5], [650, 120, 5]]) chain(v, x, y, cx + (x - cx) * 0.04, cy, s);
  // 숨결처럼 올라오는 김
  for (let i = 0; i < 7; i++) puff(ctx, cx - 60 + R() * 120, cy - 10 - R() * 50, 40, 9, '#5a2420', 0.14);
  // 벼랑 끝에서 내려다보는 사람
  ctx.fillStyle = '#0d0b10'; ctx.beginPath(); ctx.moveTo(60, VH + 4); ctx.lineTo(96, 196); ctx.quadraticCurveTo(180, 180, 250, 188); ctx.lineTo(286, 204); ctx.lineTo(268, VH + 4); ctx.fill();
  stroke(ctx, [250, 188, 286, 204, 268, VH + 4], 1.2, rgba(DEEP, 0.5)); stroke(ctx, [96, 196, 180, 183, 250, 188], 0.8, 'rgba(120,120,140,.3)');
  person(v, 226, 192, 70, mine(v, { f: 1, cloth: dark(v.me.cloth, 0.6), hair: dark(v.me.hair, 0.5), rim: rgba(DEEP, 0.6), rimDir: 1 }));
  finish(v, { inside: true });
}
/** 쐐기 돌: 땅에 박힌 긴 돌기둥과 금 사이로 새는 찬 빛 */
function wedge(v, x, y, h) {
  const { ctx, t, R } = v, w = h * 0.26;
  poly(ctx, [x - w, y, x - w * 0.62, y - h * 0.9, x - w * 0.1, y - h, x + w * 0.5, y - h * 0.86, x + w, y], t('#4c4c56'));
  poly(ctx, [x + w * 0.1, y, x - w * 0.1, y - h, x + w * 0.5, y - h * 0.86, x + w, y], t('#34343e'));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let px = x - w * 0.2, py = y - h * 0.9;
  const crack = [px, py]; for (let i = 0; i < 7; i++) { px += (R() - 0.45) * w * 0.7; py += h * 0.12; crack.push(px, py); }
  stroke(ctx, crack, 3.2, rgba(COLD, 0.25)); stroke(ctx, crack, 1.1, '#d8ecff');
  for (let i = 0; i < 4; i++) { const k = 2 + i * 3; stroke(ctx, [crack[k], crack[k + 1], crack[k] + (i % 2 ? 1 : -1) * w * 0.5, crack[k + 1] + h * 0.07], 0.9, rgba('#d8ecff', 0.8)); }
  ctx.restore();
  glow(v, x, y - h * 0.5, h * 1.1, COLD, 0.26); pool(v, x, y + 2, h * 1.2, h * 0.14, COLD, 0.22);
}
/** 쐐기를 노리는 밤: 검은 두건들이 돌로 숨어들고, 지키는 이는 불가에서 곯아떨어졌다 */
function sealStone(v) {
  const { ctx, t } = v;
  sky(v); far(v, { woods: true });
  const gy = (x) => 172 - Math.exp(-(((x - 350) / 150) ** 2)) * 30 - fbm1(x / 120 + v.q, 3) * 6;
  ground(v, gy, { tufts: 90 });
  for (const [x, h] of [[262, 14], [300, 10], [404, 11], [442, 15]]) poly(ctx, [x - 5, gy(x) + 6, x - 3, gy(x) + 6 - h, x + 4, gy(x) + 5 - h, x + 6, gy(x) + 6], t('#44444c'));
  wedge(v, 350, gy(350) + 8, 112);
  tree(v, 596, 200, 150, { dark: true, bare: true }); tree(v, 30, 190, 120, { dark: true, bare: true, lean: 0.1 });
  // 지키는 이와 꺼져 가는 화톳불
  flame(v, 478, 205, 3.2); stroke(ctx, [468, 206, 488, 206], 3, '#1c1410');
  person(v, 512, 208, 84, { pose: 'huddle', f: -1, raw: true, cloth: '#4a2a26', hair: '#2a1e16', rim: WARM });
  stroke(ctx, [532, 206, 566, 150], 1.8, t('#33281e')); oval(ctx, 494, 206, 4, 5, '#5a4a38');
  // 숨어드는 두건들
  const rim = rgba(COLD, 0.5);
  person(v, 96, 238, 112, { f: 1, raw: true, cloth: '#141218', hair: '#0a0a0c', hood: true, cloak: true, rim, rimDir: 1 });
  person(v, 168, 226, 96, { f: 1, raw: true, cloth: '#18161c', hair: '#0a0a0c', hood: true, cloak: true, old: true, rim, rimDir: 1, stick: 'staff', tilt: 0.12 });
  person(v, 232, 214, 82, { f: 1, raw: true, cloth: '#121116', hair: '#0a0a0c', hood: true, cloak: true, old: true, arm: 'fwd', rim, rimDir: 1 });
  finish(v);
}
/** 여관 탁자: variant 'map' 잿빛 로브의 학자가 지도를 펼친다, 'shard' 검은 돌 조각을 사겠다는 사람 */
function sealTable(v, kind) {
  const { ctx, R } = v, fy = room(v, { stone: false, wall: '#3a2c22', floor: '#2a2018', fy: 170 });
  ctx.save(); zoom(v, 330, 244, 1.3);
  windowAt(v, 470, 70, 34, 40);
  // 벽난로
  rect(ctx, 150, 84, 76, 86, '#2a2420'); rect(ctx, 144, 78, 88, 8, '#3a322c'); rect(ctx, 164, 110, 48, 60, '#0c0908'); flame(v, 188, 168, 6);
  const tx = 330, ty = 196;
  poly(ctx, [tx - 86, ty - 44, tx + 86, ty - 44, tx + 104, ty - 26, tx - 104, ty - 26], '#5a4230'); rect(ctx, tx - 104, ty - 26, 208, 6, '#3a2a1e');
  rect(ctx, tx - 94, ty - 20, 7, 44, '#2e2218'); rect(ctx, tx + 87, ty - 20, 7, 44, '#2e2218');
  if (kind === 'shard') {
    poly(ctx, [tx - 26, ty - 40, tx + 22, ty - 41, tx + 30, ty - 30, tx - 32, ty - 29], '#6a6258');
    poly(ctx, [tx - 9, ty - 34, tx - 5, ty - 52, tx + 2, ty - 58, tx + 9, ty - 46, tx + 7, ty - 34], '#09080c'); stroke(ctx, [tx - 5, ty - 52, tx + 2, ty - 58, tx + 9, ty - 46], 0.9, rgba('#b8a8ff', 0.8));
    glow(v, tx, ty - 46, 34, '#7a5cff', 0.34); glow(v, tx, ty - 46, 12, '#c8b8ff', 0.3);
    oval(ctx, tx + 58, ty - 35, 9, 6, '#4a3a2a'); ctx.fillStyle = '#d8b050'; for (let i = 0; i < 6; i++) ctx.fillRect(tx + 44 + R() * 22, ty - 33 + R() * 4, 3, 1.6);
    person(v, tx + 122, ty + 36, 110, { f: -1, raw: true, cloth: '#2a2630', hair: '#14100e', hood: true, cloak: true, arm: 'fwd', rim: WARM, rimDir: -1 });
    person(v, tx - 124, ty + 36, 106, mine(v, { f: 1, arm: 'chest', rim: WARM, rimDir: -1 }));
  } else {
    poly(ctx, [tx - 60, ty - 42, tx + 52, ty - 43, tx + 66, ty - 29, tx - 72, ty - 28], '#d6c69c');
    ctx.strokeStyle = 'rgba(70,50,30,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(tx - 54, ty - 33); for (let i = 0; i < 10; i++) ctx.lineTo(tx - 44 + i * 10, ty - 35 + Math.sin(i * 1.7) * 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 20, ty - 40); ctx.lineTo(tx - 6, ty - 37); ctx.lineTo(tx + 8, ty - 40); ctx.lineTo(tx + 22, ty - 38); ctx.stroke();
    ctx.strokeStyle = '#a82a20'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(tx + 4, ty - 40, 3, 0, TAU); ctx.stroke();
    candle(v, tx - 78, ty - 38, 10); rect(ctx, tx + 70, ty - 40, 6, 7, '#6a5a48');
    person(v, tx + 122, ty + 36, 112, { f: -1, raw: true, cloth: '#74747a', hair: '#b8b4ac', robe: true, arm: 'fwd', rim: WARM, rimDir: -1 });
    person(v, tx - 118, ty + 40, 104, mine(v, { f: 1, pose: 'sit', arm: 'fwd', rim: WARM, rimDir: -1 }));
  }
  pool(v, tx, ty - 40, 150, 50, '#ffb060', 0.22);
  ctx.restore();
  finish(v, { inside: true });
}
/** 사람 꼴 그림자 (바닥에 누운 꼴) */
function shadowMan(ctx, x, y, len, dx, a = 0.55) {
  ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, dx, -0.34, 0, 0); ctx.fillStyle = `rgba(4,4,8,${a})`;
  const s = len / 100; ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(13, -78); ctx.lineTo(-13, -78); ctx.fill(); ctx.beginPath(); ctx.arc(0, -92, 9, 0, TAU); ctx.fill();
  ctx.restore();
}
/** 해 질 녘 골목: 앞서 걷는 사람의 그림자가 발에서 떨어져 한 박자 늦게 따라온다 */
function sealAlley(v) {
  const { ctx, t, R } = v;
  sky(v);
  rect(ctx, 250, 96, 160, 70, t('#3a3430')); for (let x = 256; x < 400; x += 22) poly(ctx, [x, 100, x + 11, 84 + R() * 8, x + 22, 100], t('#2e2622'));
  glow(v, 330, 130, 60, '#ffb060', 0.25);
  const wl = t('#5a5048'), wr = t('#4a423c');
  poly(ctx, [-10, -20, 268, 52, 268, 164, -10, 262], wl); poly(ctx, [VW + 10, -20, 392, 52, 392, 164, VW + 10, 262], wr);
  poly(ctx, [268, 164, 392, 164, VW + 10, 262, -10, 262], t('#4a443e'));
  // 벽의 줄눈과 문, 불 켜진 창
  ctx.strokeStyle = rgba('#000000', 0.2); ctx.lineWidth = 1;
  for (let i = 1; i < 7; i++) { const k = i / 7; ctx.beginPath(); ctx.moveTo(-10, -20 + k * 282); ctx.lineTo(268, 52 + k * 112); ctx.moveTo(VW + 10, -20 + k * 282); ctx.lineTo(392, 52 + k * 112); ctx.stroke(); }
  for (let i = 0; i < 8; i++) { const k = i / 8, y0 = 164 + k * k * 98; ctx.beginPath(); ctx.moveTo(268 - k * k * 278, y0); ctx.lineTo(392 + k * k * 258, y0); ctx.stroke(); }
  poly(ctx, [120, 84, 170, 92, 170, 128, 120, 126], '#e0a050'); glow(v, 145, 106, 44, '#ffb060', 0.3); stroke(ctx, [145, 88, 145, 127], 1.5, '#2a2018');
  poly(ctx, [500, 110, 560, 96, 560, 232, 500, 206], t('#2a2018'));
  // 등불
  stroke(ctx, [434, 92, 452, 92], 2, '#1c1410'); rect(ctx, 446, 92, 8, 11, '#e8b860'); glow(v, 450, 98, 70, '#ffb060', 0.4); pool(v, 380, 214, 150, 30, '#ffb060', 0.16);
  // 통과 제 그림자 (제대로 붙은 그림자)
  rect(ctx, 228, 172, 22, 26, t('#3a2c20')); poly(ctx, [228, 198, 250, 198, 214, 208, 186, 208], 'rgba(4,4,8,.45)');
  // 앞서 걷는 사람과 뒤처진 그림자
  shadowMan(ctx, 318, 204, 100, 1.1, 0.7);
  person(v, 362, 198, 82, { f: 0, raw: true, cloth: '#2c2a30', hair: '#1a1614', cloak: true, rim: WARM, rimDir: 1 });
  // 모퉁이에서 지켜보는 나
  poly(ctx, [-10, -20, 70, -6, 70, 262, -10, 262], dark(wl, 0.45));
  person(v, 96, 256, 124, mine(v, { f: 1, cloth: dark(v.me.cloth, 0.45), hair: dark(v.me.hair, 0.3), rim: WARM, rimDir: 1 }));
  finish(v);
}
/** 창가의 손님: 한밤, 열린 창틀에 걸터앉은 것의 세로로 찢어진 눈 */
function sealVisitor(v) {
  const { ctx, R } = v, fy = room(v, { wall: '#24242e', floor: '#18181f', fy: 176 });
  ctx.save(); zoom(v, 330, 240, 1.22);
  const wx = 372, wy = 34, ww = 116, wh = 118;
  rect(ctx, wx - ww / 2 - 6, wy - 6, ww + 12, wh + 12, '#0e0c0e');
  ctx.fillStyle = vgrad(ctx, wy, wy + wh, [[0, '#101830'], [1, '#2c3a5c']]); ctx.fillRect(wx - ww / 2, wy, ww, wh);
  ctx.fillStyle = '#dcd8c4'; for (let i = 0; i < 16; i++) ctx.fillRect(wx - ww / 2 + R() * ww, wy + R() * wh * 0.7, 1, 1);
  glow(v, wx + 30, wy + 28, 30, '#c8d0e8', 0.4); oval(ctx, wx + 30, wy + 28, 8, 8, '#e8e4d2');
  poly(ctx, [wx - ww / 2, wy + wh, wx - ww / 2, wy + wh - 16, wx - 20, wy + wh - 24, wx + 12, wy + wh - 14, wx + ww / 2, wy + wh - 22, wx + ww / 2, wy + wh], '#0c1020');
  for (const d of [-1, 1]) poly(ctx, [wx + d * (ww / 2 + 2), wy - 4, wx + d * (ww / 2 + 30), wy + 4, wx + d * (ww / 2 + 30), wy + wh + 2, wx + d * (ww / 2 + 2), wy + wh + 6], '#2a2018');
  rect(ctx, wx - ww / 2 - 12, wy + wh + 4, ww + 24, 7, '#3a322c');
  // 달빛과 바닥에 떨어진 그림자
  shaft(v, wx, wy + wh, ww, 100, -90, '#8aa0d8', 0.2);
  pool(v, wx - 80, 214, 110, 20, '#8aa0d8', 0.16);
  // 창틀에 걸터앉은 것
  const sx = wx - 12, sy = wy + wh + 4, K = '#050507';
  ctx.fillStyle = K; ctx.beginPath(); ctx.moveTo(sx - 20, sy); ctx.quadraticCurveTo(sx - 26, sy - 40, sx - 8, sy - 58); ctx.quadraticCurveTo(sx + 12, sy - 54, sx + 12, sy - 34); ctx.lineTo(sx + 30, sy - 46); ctx.lineTo(sx + 40, sy - 40); ctx.lineTo(sx + 44, sy); ctx.closePath(); ctx.fill();
  stroke(ctx, [sx + 4, sy - 48, sx + 28, sy - 36, sx + 34, sy - 22], 6, K); stroke(ctx, [sx - 14, sy - 6, sx - 24, sy + 26], 6.5, K);
  oval(ctx, sx - 2, sy - 68, 8.4, 10.4, K); stroke(ctx, [sx - 10, sy - 70, sx - 14, sy - 52, sx - 10, sy - 44], 5, K);
  stroke(ctx, [sx - 26, sy - 40, sx - 8, sy - 58], 1, 'rgba(150,170,230,.5)'); stroke(ctx, [sx + 30, sy - 46, sx + 40, sy - 40, sx + 44, sy - 4], 1, 'rgba(150,170,230,.45)');
  glow(v, sx - 2, sy - 69, 9, '#ffb040', 0.4); ctx.fillStyle = '#ffd070'; ctx.beginPath(); ctx.ellipse(sx - 6.4, sy - 69, 0.8, 2.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(sx - 1.4, sy - 69, 0.8, 2.6, 0, 0, TAU); ctx.fill();
  // 침상에서 몸을 일으킨 나
  const bx = 190, by = fy + 26;
  rect(ctx, bx - 86, by - 46, 10, 68, '#2a2018'); rect(ctx, bx - 80, by - 14, 150, 30, '#1e1812'); oval(ctx, bx - 56, by - 20, 18, 8, '#8a8474');
  person(v, bx - 40, by + 20, 100, mine(v, { f: 1, pose: 'sit', cloth: '#9a9486', rim: 'rgba(150,170,230,.6)', rimDir: 1 }));
  poly(ctx, [bx - 36, by - 18, bx + 66, by - 22, bx + 72, by + 14, bx - 44, by + 14], '#5a5a66'); stroke(ctx, [bx - 36, by - 18, bx + 66, by - 22], 1, 'rgba(150,170,230,.45)');
  ctx.restore();
  finish(v, { inside: true });
}
/** 북쪽으로 가는 마법사들: 지팡이 끝에 불을 단 긴 줄이 어두운 북쪽 하늘 밑으로 걸어간다 */
function sealRite(v) {
  const { ctx, R } = v;
  sky(v);
  for (let i = 0; i < 18; i++) puff(ctx, 300 + R() * 300, 6 + R() * 66, 70 + R() * 50, 20 + R() * 14, '#12101a', 0.34);
  glow(v, 452, 50, 12, COLD, 0.55, 90); glow(v, 452, 96, 60, COLD, 0.2, 30);
  far(v, { peaks: true });
  const gy = (x) => 160 - fbm1(x / 150 + v.q, 3) * 8;
  ground(v, gy, { tufts: 110 });
  road(v, 250, 452, HZ + 20, { w: 130 });
  tree(v, 70, 200, 130, { bare: true }); tree(v, 590, 190, 100, { bare: true, lean: -0.08 });
  const C = ['#3a3450', '#4a2a2e', '#5a5a62', '#2e4038', '#3a3450', '#44403c'];
  const line = [[440, 160, 20], [424, 166, 28], [404, 175, 38], [378, 187, 52], [344, 203, 70], [298, 224, 94]];
  line.forEach(([x, y, h], i) => {
    person(v, x, y, h, { f: 0, cloth: C[i], hair: i % 2 ? '#8a8478' : '#2a1e16', robe: true, hood: i % 3 !== 1, cloak: true, stick: 'staff' });
    glow(v, x + h * 0.18, y - h * 1.07, h * 0.16 + 3, COLD, 0.6); glow(v, x + h * 0.18, y - h * 1.07, 1.6 + h * 0.03, '#ffffff', 0.7);
  });
  person(v, 226, 240, 112, { ...mine(v, { raw: false }), f: 0, cloak: true, stick: 'staff' });
  glow(v, 226 + 20, 240 - 119, 20, COLD, 0.6); glow(v, 226 + 20, 240 - 119, 5, '#ffffff', 0.7);
  finish(v);
}
/** 깨진 밤 다음 날: 대낮에도 어두운 북쪽 하늘의 금, 종이 울리고 사람들은 올려다본다 */
function sealBroken(v) {
  const { ctx, t, R } = v;
  sky(v);
  ctx.fillStyle = vgrad(ctx, 0, HZ + 20, [[0, 'rgba(8,6,16,.9)'], [0.6, 'rgba(22,14,30,.62)'], [1, 'rgba(30,18,30,.2)']]); ctx.fillRect(0, 0, VW, HZ + 20);
  for (let i = 0; i < 16; i++) puff(ctx, R() * VW, R() * 70, 90, 22, '#0c0a14', 0.3);
  // 하늘의 금
  let x = 372, y = -4; const crack = [x, y]; while (y < HZ) { x += (R() - 0.5) * 22; y += 8 + R() * 10; crack.push(x, y); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  stroke(ctx, crack, 14, rgba('#8a2a4a', 0.16)); stroke(ctx, crack, 6, rgba('#d0506a', 0.4));
  for (let i = 4; i < crack.length - 2; i += 6) stroke(ctx, [crack[i], crack[i + 1], crack[i] + (i % 4 ? 26 : -24), crack[i + 1] + 12, crack[i] + (i % 4 ? 34 : -40), crack[i + 1] + 26], 1, rgba('#e890a8', 0.45));
  ctx.restore();
  stroke(ctx, crack, 2.6, '#050308');
  glow(v, 372, 70, 160, '#7a2040', 0.22, 110);
  far(v);
  townFar(v, 300, HZ + 30, { s: 1.15 });
  const gy = (x2) => 168 - fbm1(x2 / 140 + v.q, 3) * 6;
  ground(v, gy, { tufts: 70, haze: 0.2 });
  // 종탑: 흔들리는 종
  const tw = t('#6a6258'), bx = 540;
  rect(ctx, bx - 26, 20, 52, 230, tw); rect(ctx, bx - 26, 20, 16, 230, rgba('#000000', 0.25)); poly(ctx, [bx - 32, 22, bx, -30, bx + 32, 22], t('#3e2e26'));
  ctx.fillStyle = '#0e0c0c'; ctx.beginPath(); ctx.moveTo(bx - 14, 84); ctx.lineTo(bx - 14, 48); ctx.arc(bx, 48, 14, Math.PI, 0); ctx.lineTo(bx + 14, 84); ctx.fill();
  ctx.save(); ctx.translate(bx, 44); ctx.rotate(0.42); poly(ctx, [-4, 4, 4, 4, 9, 24, -9, 24], t('#b8943c')); oval(ctx, 0, 27, 2.6, 2.6, t('#7a6228')); ctx.restore();
  crows(v, 470, 40, 9, 70);
  // 올려다보는 사람들
  person(v, 150, 236, 106, { f: 1, cloth: '#5a4636', hair: '#4a3220', female: true, arm: 'chest' });
  person(v, 196, 240, 64, { f: 1, cloth: '#4a5240', hair: '#6e4a28', child: true });
  person(v, 262, 238, 112, { ...mine(v, { raw: false }), f: 1, arm: 'out' });
  person(v, 96, 234, 100, { f: 1, pose: 'kneel', cloth: '#44403c', hair: '#8a8478', old: true, arm: 'chest' });
  ctx.fillStyle = 'rgba(14,8,22,.22)'; ctx.fillRect(0, 0, VW, VH + 40);
  finish(v, { noLeaves: true });
}

/* ---------- 일터 ---------- */
/** 선반과 그 위의 단지·병 */
function shelf(v, x, y, w, rows, glass = false) {
  const { ctx, R } = v;
  rect(ctx, x, y, w, rows * 26 + 4, '#241b14');
  for (let r = 0; r < rows; r++) {
    rect(ctx, x, y + 24 + r * 26, w, 3, '#3a2a1e');
    for (let px = x + 5; px < x + w - 8; px += 9 + R() * 5) {
      const h = 8 + R() * 10, c = glass ? ['#6a9a6a', '#b8863a', '#6a86b0', '#9a5a4a', '#c8c0a0'][Math.floor(R() * 5)] : ['#7a6a54', '#5a4a3a', '#8a7a5c', '#6a5a48'][Math.floor(R() * 4)];
      rect(ctx, px, y + 24 + r * 26 - h, 6, h, c); if (glass) rect(ctx, px + 1.5, y + 21 + r * 26 - h, 3, 3, '#c8c0a0');
    }
  }
}
/** 의원: 약초가 매달린 방, 누운 환자 곁에서 살피는 의원 */
function tradeHealer(v) {
  const { ctx, R } = v, fy = room(v, { stone: false, wall: '#3e3228', floor: '#2c231b', fy: 170 }), me = v.me;
  ctx.save(); zoom(v, 330, 246, 1.3);
  windowAt(v, 228, 72, 36, 42); if (v.S.tod !== 'night') shaft(v, 228, 114, 36, 90, 70, v.S.lit, 0.14);
  shelf(v, 432, 62, 84, 3, true);
  rect(ctx, 150, 54, 380, 5, '#2a2018');
  for (let x = 268; x < 420; x += 22) { stroke(ctx, [x, 58, x, 70], 0.8, '#1c1410'); for (let i = 0; i < 5; i++) puff(ctx, x + (R() - 0.5) * 6, 72 + i * 4, 4, 5, ['#5a6a3c', '#7a6a3a', '#4a5a34'][(x / 22 | 0) % 3], 0.9); }
  // 침상과 환자
  const bx = 330, by = fy + 22;
  rect(ctx, bx - 96, by - 30, 190, 8, '#3a2a1e'); rect(ctx, bx - 96, by - 22, 6, 30, '#2e2218'); rect(ctx, bx + 88, by - 22, 6, 30, '#2e2218'); rect(ctx, bx - 92, by - 36, 182, 8, '#b0a690');
  ctx.save(); ctx.translate(bx - 70, by - 36); ctx.fillStyle = '#7a7060'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.quadraticCurveTo(64, -17, 138, -8); ctx.quadraticCurveTo(152, -15, 158, 0); ctx.fill(); oval(ctx, 2, -8, 8, 7, '#c8b0a0'); oval(ctx, -1, -10, 8, 7, v.other.hair); ctx.restore();
  // 화로와 약탕기
  rect(ctx, 196, by - 6, 22, 14, '#2a2420'); glow(v, 207, by - 8, 26, '#ff8a40', 0.4); oval(ctx, 207, by - 12, 9, 6, '#3a3632'); smoke(v, 207, by - 18, 60, 10, '#b8b0a0', 0.18);
  // 의원과 지켜보는 식구
  person(v, bx - 22, by + 26, 104, { f: 1, pose: 'kneel', raw: true, cloth: mixh(me.cloth, '#5a6050', 0.5), hair: me.hair, female: me.female, long: me.long, arm: 'fwd', rim: WARM, rimDir: -1 });
  oval(ctx, bx + 8, by - 43, 5, 3, '#8a7a5c');
  person(v, bx + 124, by + 20, 102, { f: -1, raw: true, cloth: v.other.cloth, hair: '#4a3220', female: !me.female, arm: 'chest', rim: WARM, rimDir: -1 });
  candle(v, 470, 86, 8); pool(v, bx, by - 40, 150, 60, '#ffb060', 0.18);
  ctx.restore();
  finish(v, { inside: true });
}
/** 류트를 안은 사람이 든 악기 */
function lute(ctx, x, y, s, d = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * d, s); ctx.rotate(-0.5);
  oval(ctx, 0, 0, 10, 7.4, '#a87838'); oval(ctx, 1, 0, 2.6, 2.6, '#3a2814'); stroke(ctx, [8, 0, 30, 0], 2.6, '#5a3c1e'); stroke(ctx, [30, 0, 35, 4], 2.6, '#3a2814'); stroke(ctx, [-6, -1, 30, -1], 0.4, 'rgba(240,230,200,.7)');
  ctx.restore();
}
/** 음유시인: 주막의 불가, 걸상에 앉아 노래하는 사람과 듣는 손님들 */
function tradeBard(v) {
  const { ctx, R } = v, fy = room(v, { stone: false, wall: '#3c2c20', floor: '#2a2018', fy: 168 }), me = v.me;
  ctx.save(); zoom(v, 330, 246, 1.22);
  // 벽난로
  rect(ctx, 96, 70, 96, 98, '#2c2622'); rect(ctx, 88, 62, 112, 10, '#3e3630'); rect(ctx, 116, 100, 56, 68, '#0c0908'); flame(v, 144, 166, 9); pool(v, 170, 200, 170, 34, '#ff9a48', 0.26);
  // 통과 들보, 걸린 등
  rect(ctx, 0, 30, VW, 7, '#241a12'); stroke(ctx, [392, 37, 392, 56], 1, '#14100c'); rect(ctx, 388, 56, 8, 10, '#e8b860'); glow(v, 392, 61, 56, '#ffb060', 0.34);
  for (const x of [520, 562]) { oval(ctx, x, 150, 18, 22, '#4a3626'); rect(ctx, x - 18, 140, 36, 3, '#2a1e14'); rect(ctx, x - 18, 158, 36, 3, '#2a1e14'); }
  // 노래하는 사람
  const sx = 322, sy = fy + 24;
  rect(ctx, sx - 12, sy - 30, 26, 4, '#3a2a1e'); rect(ctx, sx - 9, sy - 26, 4, 26, '#2e2218'); rect(ctx, sx + 7, sy - 26, 4, 26, '#2e2218');
  person(v, sx - 6, sy, 108, mine(v, { f: 1, pose: 'sit', arm: 'chest', rim: WARM, rimDir: -1, hat: !me.female }));
  lute(ctx, sx + 2, sy - 50, 1.25);
  // 듣는 손님들 (앞쪽, 등을 보임)
  for (const [tx, ty] of [[170, 236], [486, 238]]) { poly(ctx, [tx - 50, ty - 30, tx + 50, ty - 30, tx + 60, ty - 20, tx - 60, ty - 20], '#4a3626'); rect(ctx, tx - 60, ty - 20, 120, 5, '#2e2218'); for (let i = 0; i < 3; i++) rect(ctx, tx - 30 + i * 26 + R() * 6, ty - 39, 6, 9, '#7a6a54'); }
  const seat = [[104, 262, 0], [168, 268, 1], [236, 262, 2], [430, 264, 3], [500, 270, 4], [566, 262, 5]];
  for (const [x, y, i] of seat) person(v, x, y, 104, { f: 0, raw: true, cloth: dark(['#5a4636', '#4a5240', '#5a3a34', '#3e4658', '#6a5a3c', '#44403c'][i], 0.45), hair: ['#1c1614', '#3a2818', '#14100e'][i % 3], female: i === 2 || i === 4, hood: i === 5, hat: i === 0, rim: WARM, rimDir: i < 3 ? -1 : 1 });
  ctx.restore();
  finish(v, { inside: true });
}
/** 선생: 창가의 서당, 책을 펴 든 선생과 걸상에 앉은 아이들 */
function tradeTeacher(v) {
  const { ctx } = v, fy = room(v, { wall: '#4a4036', floor: '#30271f', fy: 168 });
  ctx.save(); zoom(v, 330, 246, 1.26);
  windowAt(v, 330, 52, 44, 70, { arch: true }); if (v.S.tod !== 'night') shaft(v, 330, 122, 44, 110, 90, v.S.lit, 0.16);
  shelf(v, 470, 60, 76, 3);
  // 석판
  rect(ctx, 150, 62, 92, 60, '#3a2a1e'); rect(ctx, 155, 67, 82, 50, '#1e2422'); ctx.strokeStyle = 'rgba(230,230,220,.6)'; ctx.lineWidth = 1;
  for (let r = 0; r < 4; r++) { ctx.beginPath(); for (let i = 0; i < 9 - r; i++) { const x = 162 + i * 8, y = 76 + r * 10; ctx.moveTo(x, y + (i % 2) * 3); ctx.lineTo(x + 5, y + ((i + 1) % 3)); } ctx.stroke(); }
  // 독서대와 선생
  const lx = 256, ly = fy + 22;
  rect(ctx, lx - 3, ly - 44, 6, 44, '#3a2a1e'); poly(ctx, [lx - 16, ly - 44, lx + 16, ly - 52, lx + 16, ly - 48, lx - 16, ly - 40], '#4a3626'); poly(ctx, [lx - 12, ly - 46, lx + 12, ly - 52, lx + 12, ly - 55, lx - 12, ly - 49], '#d8ccb0');
  person(v, lx - 34, ly + 6, 112, mine(v, { f: 1, robe: !v.me.female, arm: 'out', rim: WARM, rimDir: 1 }));
  // 아이들
  rect(ctx, 344, ly - 12, 150, 5, '#3a2a1e'); rect(ctx, 350, ly - 7, 5, 16, '#2e2218'); rect(ctx, 484, ly - 7, 5, 16, '#2e2218');
  const kids = [[372, '#5a4636', '#4a3220', false], [416, '#4a5240', '#6e4a28', true], [460, '#5a3a34', '#2a1e16', false]];
  for (const [x, c, h, fm] of kids) person(v, x, ly + 8, 64, { f: -1, pose: 'sit', raw: true, cloth: c, hair: h, female: fm, child: true, rim: WARM, rimDir: -1 });
  rect(ctx, 356, ly - 24, 130, 4, '#4a3626'); for (const x of [366, 410, 454]) rect(ctx, x, ly - 27, 14, 3, '#d8ccb0');
  ctx.restore();
  finish(v, { inside: true });
}
/** 둥근 플라스크 */
function flask(v, x, y, r, col) {
  const { ctx } = v;
  rect(ctx, x - r * 0.28, y - r * 2.3, r * 0.56, r * 1.5, 'rgba(190,210,220,.35)');
  oval(ctx, x, y - r, r, r, 'rgba(190,210,220,.3)'); ctx.save(); ctx.beginPath(); ctx.rect(x - r, y - r * 1.1, r * 2, r * 1.2); ctx.clip(); oval(ctx, x, y - r, r * 0.86, r * 0.86, col); ctx.restore();
  glow(v, x, y - r, r * 2.6, col, 0.4); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - r * 0.5, y - r * 1.5, 1.2, r * 0.6);
}
/** 연금술사: 돌방의 화로와 끓는 플라스크들 */
function tradeAlchemy(v) {
  const { ctx, R } = v, fy = room(v, { wall: '#30303a', floor: '#201e24', fy: 168 }), me = v.me;
  ctx.save(); zoom(v, 330, 246, 1.26);
  shelf(v, 452, 56, 92, 3, true);
  // 화로 (아타노르)
  poly(ctx, [140, fy + 6, 148, 96, 164, 70, 196, 70, 212, 96, 220, fy + 6], '#3a3632'); rect(ctx, 170, 40, 20, 32, '#2e2a28');
  ctx.fillStyle = '#0c0908'; ctx.beginPath(); ctx.moveTo(164, fy + 2); ctx.lineTo(164, 134); ctx.arc(180, 134, 16, Math.PI, 0); ctx.lineTo(196, fy + 2); ctx.fill();
  flame(v, 180, fy, 7); pool(v, 200, fy + 20, 130, 26, '#ff9a48', 0.26); smoke(v, 180, 40, 40, 10, '#3a3a40', 0.3);
  // 작업대
  const tx = 348, ty = fy + 16;
  poly(ctx, [tx - 80, ty - 44, tx + 88, ty - 44, tx + 100, ty - 32, tx - 92, ty - 32], '#4a3a2c'); rect(ctx, tx - 92, ty - 32, 192, 6, '#30241a'); rect(ctx, tx - 84, ty - 26, 7, 40, '#2a2018'); rect(ctx, tx + 86, ty - 26, 7, 40, '#2a2018');
  flask(v, tx - 50, ty - 40, 9, '#6ad08a'); flask(v, tx - 14, ty - 39, 12, '#e0a040'); flask(v, tx + 62, ty - 40, 8, '#7ab0ff');
  // 증류관
  stroke(ctx, [tx - 14, ty - 66, tx + 6, ty - 76, tx + 34, ty - 52], 1.6, 'rgba(190,210,220,.6)'); rect(ctx, tx + 28, ty - 52, 12, 10, 'rgba(190,210,220,.4)'); rect(ctx, tx + 30, ty - 47, 8, 5, '#b060d0');
  rect(ctx, tx - 20, ty - 37, 12, 3, '#2a2420'); glow(v, tx - 14, ty - 34, 10, '#ff8a40', 0.5);
  for (let i = 0; i < 12; i++) glow(v, tx - 14 + (R() - 0.5) * 30, ty - 70 - R() * 60, 2 + R() * 2, '#ffd080', 0.35);
  oval(ctx, tx + 78, ty - 40, 7, 4, '#6a6258'); stroke(ctx, [tx + 78, ty - 42, tx + 86, ty - 54], 2, '#8a8070');
  person(v, tx - 118, ty + 22, 110, { f: 1, raw: true, cloth: mixh(me.cloth, '#3a3440', 0.5), hair: me.hair, female: me.female, long: me.long, robe: !me.female, arm: 'fwd', rim: 'rgba(255,200,120,.6)', rimDir: 1 });
  ctx.restore();
  finish(v, { inside: true });
}
/** 목수·석공: 비계를 두른 짓다 만 돌벽과 일꾼들 */
function tradeBuilder(v) {
  const { ctx, t, R } = v;
  sky(v); far(v); townFar(v, 120, HZ + 16, { s: 0.5, n: 6 });
  const gy = (x) => 166 - fbm1(x / 150 + v.q, 3) * 6;
  ground(v, gy, { tufts: 80, color2: '#6a5a44' });
  const stone = t('#9a9084'), sh = t('#6e665c'), wood = t('#5a4028'), wx = 300, wy = 196;
  // 돌벽: 계단꼴로 올라가다 만 윗줄, 둥근 문
  const tops = [70, 70, 58, 46, 46, 62, 84, 100];
  tops.forEach((h, i) => { rect(ctx, wx + i * 30, wy - 150 + h, 30, 150 - h, stone); });
  ctx.strokeStyle = rgba('#000000', 0.22); ctx.lineWidth = 1;
  for (let y = wy - 12; y > wy - 110; y -= 12) for (let i = 0; i < 8; i++) { if (y < wy - 150 + tops[i]) continue; const x0 = wx + i * 30; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 30, y); ctx.moveTo(x0 + (((y / 12) | 0) % 2 ? 10 : 22), y); ctx.lineTo(x0 + (((y / 12) | 0) % 2 ? 10 : 22), y + 12); ctx.stroke(); }
  rect(ctx, wx, wy - 100, 34, 100, rgba(sh, 0.5));
  ctx.fillStyle = t('#2a2622'); ctx.beginPath(); ctx.moveTo(wx + 96, wy); ctx.lineTo(wx + 96, wy - 44); ctx.arc(wx + 118, wy - 44, 22, Math.PI, 0); ctx.lineTo(wx + 140, wy); ctx.fill();
  ctx.fillStyle = vgrad(ctx, wy - 66, wy, [[0, v.S.mid], [1, v.S.low]]); ctx.beginPath(); ctx.moveTo(wx + 101, wy); ctx.lineTo(wx + 101, wy - 44); ctx.arc(wx + 118, wy - 44, 17, Math.PI, 0); ctx.lineTo(wx + 135, wy); ctx.fill();
  // 비계
  for (const x of [wx - 16, wx + 62, wx + 150, wx + 250]) stroke(ctx, [x, wy + 4, x, wy - 128], 3, wood);
  for (const y of [wy - 46, wy - 92]) { rect(ctx, wx - 22, y, 280, 4, wood); }
  stroke(ctx, [wx - 16, wy - 46, wx + 62, wy - 92], 1.6, wood); stroke(ctx, [wx + 150, wy - 46, wx + 250, wy - 92], 1.6, wood);
  stroke(ctx, [wx + 30, wy + 4, wx + 52, wy - 46], 2, wood); stroke(ctx, [wx + 42, wy + 4, wx + 64, wy - 46], 2, wood); for (let i = 1; i < 5; i++) stroke(ctx, [wx + 30 + i * 4.4, wy + 4 - i * 10, wx + 42 + i * 4.4, wy + 4 - i * 10], 1.4, wood);
  // 도르래와 매달린 돌
  stroke(ctx, [wx + 250, wy - 128, wx + 286, wy - 138], 3, wood); stroke(ctx, [wx + 284, wy - 137, wx + 284, wy - 62], 0.9, t('#2a2018')); rect(ctx, wx + 274, wy - 62, 20, 14, stone); rect(ctx, wx + 274, wy - 62, 20, 4, rgba('#ffffff', 0.12));
  // 비계 위의 석공들
  person(v, wx + 100, wy - 92, 56, { f: 1, cloth: '#6a5a3c', hair: '#2a1e16', arm: 'fwd' });
  person(v, wx + 196, wy - 46, 58, { f: -1, pose: 'kneel', cloth: '#5a4636', hair: '#4a3220', arm: 'fwd' });
  // 돌무더기, 톱질 받침, 수레
  for (let i = 0; i < 7; i++) { const x = 120 + (i % 4) * 24 + (i > 3 ? 12 : 0), y = 214 - (i > 3 ? 13 : 0); rect(ctx, x, y - 13, 22, 13, i % 2 ? stone : sh); rect(ctx, x, y - 13, 22, 3, rgba('#ffffff', 0.1)); }
  stroke(ctx, [470, 232, 482, 208, 494, 232], 2.4, wood); stroke(ctx, [560, 232, 572, 208, 584, 232], 2.4, wood); stroke(ctx, [466, 208, 596, 206], 7, t('#8a6a44'));
  for (let i = 0; i < 20; i++) rect(ctx, 480 + R() * 100, 232 + R() * 6, 3, 1, t('#c8a878'));
  // 도면을 든 나와 일꾼
  const me = v.me;
  person(v, 226, 238, 112, { f: 1, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long, arm: 'out' });
  poly(ctx, [254, 150, 276, 147, 278, 162, 256, 165], t('#d8ccb0'));
  person(v, 528, 236, 104, { f: -1, cloth: '#4a5240', hair: '#6e4a28', arm: 'fwd', hat: true });
  finish(v);
}

/* ---------- 큰 짐승 ---------- */
/** 뒷발로 일어선 곰. 발끝이 (x, y), 키가 h. d는 보는 쪽 */
function bear(v, x, y, h, col, d = -1, o = {}) {
  const { ctx } = v, s = h / 118;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * d, s);
  const fur = col, sh = dark(col, 0.35);
  stroke(ctx, [-12, -40, -14, -6], 17, sh); stroke(ctx, [10, -40, 13, -6], 17, fur); oval(ctx, -13, -3, 12, 5, sh); oval(ctx, 15, -3, 12, 5, fur);
  oval(ctx, -1, -60, 26, 36, fur, 0.1); oval(ctx, 5, -90, 22, 17, fur); oval(ctx, -8, -70, 16, 30, sh, 0.1);
  stroke(ctx, [-6, -88, 18, -66, 30, -60], 12, sh); stroke(ctx, [14, -92, 32, -78, 42, -84], 12.5, fur);
  for (const [px, py] of [[30, -60], [42, -84]]) for (let i = -1; i <= 1; i++) stroke(ctx, [px + 3, py + i * 3, px + 9, py + i * 3 + 2], 1.2, '#d8d0c0');
  oval(ctx, 16, -106, 12, 10, fur); oval(ctx, 27, -103, 7.5, 5, mixh(fur, '#8a7a68', 0.12)); oval(ctx, 33, -104, 2, 1.8, '#0c0a08');
  oval(ctx, 9, -115, 3.6, 3.6, fur); oval(ctx, 17, -116.5, 3.4, 3.4, sh);
  poly(ctx, [22, -101, 34, -101, 30, -93, 24, -94], '#1a0c0a'); ctx.fillStyle = '#d8d0c0'; ctx.fillRect(30, -101, 1.4, 3); ctx.fillRect(25, -101, 1.2, 2.4);
  // 등줄기의 거친 털
  ctx.strokeStyle = rgba(light(col, 0.3), 0.5); ctx.lineWidth = 1; for (let i = 0; i < 16; i++) { const a = Math.PI * (0.62 + i * 0.045), px = -1 + Math.cos(a) * 26, py = -64 + Math.sin(a) * -38; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 4, py - 3); ctx.stroke(); }
  if (o.arrows) for (const [ax, ay] of [[-20, -84], [-24, -66]]) { stroke(ctx, [ax, ay, ax - 14, ay - 10], 1.1, '#3a2c20'); stroke(ctx, [ax - 14, ay - 10, ax - 17, ay - 8], 2, '#8a8478'); }
  if (o.eye) { ctx.fillStyle = o.eye; ctx.fillRect(21, -109, 2.4, 1.8); } else { ctx.fillStyle = '#0c0a08'; ctx.fillRect(21, -109, 2, 1.6); }
  ctx.restore();
  if (o.eye) glow(v, x + d * s * 22, y - s * 108, 5 * s + 2, o.eye, 0.5);
}
/** 큰 멧돼지 */
function boar(v, x, y, len, col, d = -1) {
  const { ctx } = v, s = len / 100;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * d, s);
  const sh = dark(col, 0.35);
  for (const [lx, c] of [[-24, sh], [-14, col], [16, sh], [25, col]]) stroke(ctx, [lx, -14, lx + 1, -1], 5.5, c);
  oval(ctx, -2, -26, 36, 18, col); oval(ctx, 8, -36, 24, 13, col, 0.2); oval(ctx, -8, -20, 26, 10, sh);
  poly(ctx, [24, -42, 54, -24, 60, -15, 52, -11, 26, -10], col); oval(ctx, 57, -14, 4, 4.4, mixh(col, '#8a6a60', 0.5));
  poly(ctx, [24, -42, 21, -52, 31, -43], sh);
  ctx.strokeStyle = '#e8e0cc'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(47, -12); ctx.quadraticCurveTo(53, -18, 49, -25); ctx.stroke();
  ctx.fillStyle = '#e0a040'; ctx.fillRect(37, -28, 2, 1.6);
  ctx.strokeStyle = rgba(dark(col, 0.5), 0.9); ctx.lineWidth = 1.2; for (let i = 0; i < 18; i++) { const px = -30 + i * 3.4, py = -40 - Math.sin((i / 18) * Math.PI) * 9; ctx.beginPath(); ctx.moveTo(px, py + 3); ctx.lineTo(px - 2, py - 3); ctx.stroke(); }
  stroke(ctx, [-37, -28, -43, -22], 1.4, sh);
  ctx.restore();
}
/** 사슴. white면 흰 수사슴 */
function stag(v, x, y, h, col, d = -1) {
  const { ctx } = v, s = h / 100;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * d, s);
  const sh = dark(col, 0.25);
  for (const [lx, c, k] of [[-17, sh, 2], [-12, col, -1], [12, sh, 1], [17, col, -2]]) stroke(ctx, [lx, -42, lx + k, -20, lx + k * 0.4, 0], 3, c);
  oval(ctx, 0, -48, 23, 10.5, col); oval(ctx, -4, -44, 16, 6, sh);
  stroke(ctx, [17, -50, 27, -72], 8, col); oval(ctx, 31, -76, 7.4, 4.6, col, 0.25); oval(ctx, 37, -74, 2, 1.6, '#1c1410'); poly(ctx, [24, -79, 19, -86, 27, -81], sh);
  ctx.strokeStyle = mixh(col, '#8a7a5c', 0.5); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(27, -80); ctx.quadraticCurveTo(22 + k * 5, -96, 30 + k * 9, -108); ctx.moveTo(24 + k * 4, -92); ctx.lineTo(18 + k * 6, -100); ctx.moveTo(26 + k * 7, -100); ctx.lineTo(34 + k * 9, -100); ctx.stroke(); }
  stroke(ctx, [-23, -50, -26, -44], 2, col);
  ctx.restore();
}
/** 숲 바탕: 어두운 줄기들 사이의 빈터. 돌려주는 값: 땅 높이 함수 */
function woods(v) {
  const { ctx, t, R, P } = v;
  sky(v); far(v, { woods: true });
  const trunk = t(dark(P.trunk ?? '#3a2c20', 0.2));
  // 뒤쪽 줄기들
  for (let i = 0; i < 22; i++) { const x = R() * VW, w = 3 + R() * 6; rect(ctx, x, 30 + R() * 30, w, 140, rgba(t(mixh(P.trunk ?? '#3a2c20', v.S.haze, 0.5)), 0.7)); }
  for (let i = 0; i < 30; i++) puff(ctx, R() * VW, 20 + R() * 60, 50, 22, t(mixh(P.snow ? '#8a9490' : (P.autumn ? '#8a5a2a' : P.conifer ?? '#2e4630'), v.S.haze, 0.3)), 0.5);
  const gy = (x) => 162 - fbm1(x / 110 + v.q, 5, 3) * 10;
  ground(v, gy, { tufts: 120, haze: 0.2 });
  for (let i = 0; i < 6; i++) puff(ctx, R() * VW, 150 + R() * 30, 110, 12, v.S.haze, 0.2);
  return { gy, trunk };
}
function bigTrunks(v, trunk) {
  const { ctx, R } = v;
  for (const [x, w] of [[-6, 54], [582, 70], [70, 22]]) { ctx.fillStyle = dark(trunk, 0.35); ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + w, -10); for (let y = 0; y <= VH; y += 20) ctx.lineTo(x + w + fbm1(y / 30 + x, 3) * 6 + (y > 200 ? (y - 200) * 0.4 : 0), y); ctx.lineTo(x - (x > 0 ? 6 : 0), VH); ctx.fill(); }
  for (let i = 0; i < 14; i++) puff(ctx, 520 + R() * 130, R() * 40, 40, 18, dark(trunk, 0.2), 0.7);
}
/** 큰 짐승: variant 'boar' 큰 멧돼지, 'bear' 동굴곰, 'ash' 잿빛 큰곰, 'stag' 흰 수사슴, 'deer' 영주의 사슴, 'tracks' 흔적을 살피는 사냥꾼 */
function beastPlate(v) {
  const { ctx, t, R } = v, kind = v.variant ?? 'boar', me = v.me;
  const { gy, trunk } = woods(v);
  const hunter = (x, y, h, o = {}) => person(v, x, y, h, { f: 1, cloth: mixh(me.cloth, '#3e4a34', 0.5), hair: me.hair, female: me.female, long: me.long, cloak: true, stick: 'spear', ...o });
  if (kind === 'stag' || kind === 'deer') {
    const white = kind === 'stag';
    if (white) { shaft(v, 430, 0, 60, 190, -30, '#fff4d8', 0.22); glow(v, 420, 150, 80, '#fff4d8', 0.25); }
    stag(v, 420, gy(420) + 22, 70, white ? '#ece8dc' : t('#8a6a48'), -1);
    if (white) glow(v, 420, gy(420) - 14, 40, '#ffffff', 0.2);
    bigTrunks(v, trunk);
    hunter(170, 244, 104, { pose: 'kneel', stick: null, arm: 'fwd' });
  } else if (kind === 'tracks') {
    for (let i = 0; i < 7; i++) { const x = 250 + i * 34, y = 206 - i * 5 + (i % 2) * 5, s = 1.3 - i * 0.1; oval(ctx, x, y, 6 * s, 3 * s, 'rgba(20,14,10,.55)'); for (const k of [-1, 0, 1]) oval(ctx, x + 6 * s, y + k * 2.4 * s, 1.4 * s, 1 * s, 'rgba(20,14,10,.55)'); }
    stroke(ctx, [470, gy(470) + 30, 478, gy(470) - 10, 500, gy(470) - 4], 2.2, t('#4a3a2a')); stroke(ctx, [478, gy(470) - 10, 474, gy(470) - 12], 3.4, t('#d8ccb0'));
    bigTrunks(v, trunk);
    hunter(196, 240, 106, { pose: 'kneel', stick: null, arm: 'fwd' });
    stroke(ctx, [158, 240, 176, 136], 1.8, t('#33281e'));
  } else {
    const ash = kind === 'ash';
    if (kind === 'boar') {
      for (let i = 0; i < 6; i++) puff(ctx, 380 + R() * 110, 150 + R() * 30, 30, 20, t(dark('#3a4a30', 0.2)), 0.8);
      boar(v, 420, gy(420) + 40, 150, t('#3e3028'), -1);
      for (let i = 0; i < 10; i++) rect(ctx, 330 + R() * 60, gy(360) + 34 + R() * 8, 3, 1.5, t('#4a3a2a'));
    } else {
      // 바위 굴
      ctx.fillStyle = t('#4a4640'); ctx.beginPath(); ctx.moveTo(390, 200); ctx.quadraticCurveTo(400, 70, 500, 60); ctx.quadraticCurveTo(610, 64, 640, 150); ctx.lineTo(640, 200); ctx.fill();
      ctx.fillStyle = '#0a0808'; ctx.beginPath(); ctx.moveTo(440, 200); ctx.quadraticCurveTo(446, 110, 500, 104); ctx.quadraticCurveTo(552, 110, 560, 200); ctx.fill();
      if (ash) { for (let i = 0; i < 26; i++) glow(v, 330 + R() * 200, 40 + R() * 150, 1.5 + R() * 2, '#ff9a60', 0.4); glow(v, 424, 130, 110, '#8a8a96', 0.16); }
      bear(v, 424, gy(424) + 44, ash ? 176 : 150, ash ? t('#4e4e58') : t('#3a2a1e'), -1, ash ? { arrows: true, eye: '#ff7a30' } : {});
      for (let i = 0; i < 5; i++) stroke(ctx, [356 + i * 9, 214 + (i % 2) * 3, 366 + i * 9, 211], 1.6, t('#d8d0c0'));
    }
    bigTrunks(v, trunk);
    hunter(188, 244, kind === 'boar' ? 108 : 100, { tilt: 0.18 });
  }
  finish(v);
}

/* ---------- 군대 ---------- */
const ARMY = ['#5a3a34', '#4a4a52', '#5a4636', '#44403c'];
/** 군막 한 채 */
function armyTent(v, x, y, w) {
  const { ctx, t } = v, c = t(v.P.snow ? '#d8d6cc' : '#b8ae96');
  poly(ctx, [x - w, y, x, y - w * 0.9, x + w, y], c); poly(ctx, [x + v.S.dir * -w, y, x, y - w * 0.9, x + v.S.dir * -w * 0.1, y], rgba('#14101a', 0.3));
  poly(ctx, [x - w * 0.16, y, x, y - w * 0.4, x + w * 0.16, y], t('#2a1c14'));
}
/** 깃대와 깃발 */
function standard(v, x, y, h, col) {
  const { ctx, t } = v, d = -v.S.dir || 1;
  stroke(ctx, [x, y, x, y - h], Math.max(1, h * 0.025), t('#2e241a'));
  poly(ctx, [x, y - h, x + d * h * 0.3, y - h + h * 0.05, x + d * h * 0.26, y - h * 0.72, x, y - h * 0.7], t(col));
}
/** 행군: 창을 멘 긴 줄이 길을 따라 멀어지고, 짐수레가 뒤따른다 */
function armyMarch(v) {
  const { ctx, t, R } = v;
  sky(v); far(v); townFar(v, 500, HZ + 14, { s: 0.4, n: 5 });
  const gy = (x) => 160 - fbm1(x / 150 + v.q, 3) * 8;
  ground(v, gy, { tufts: 110 });
  road(v, 250, 470, HZ + 22, { w: 150 });
  tree(v, 70, 196, 120); tree(v, 598, 186, 96);
  const line = [[452, 160, 20], [438, 166, 27], [420, 174, 36], [398, 185, 48], [368, 199, 64], [328, 218, 84]];
  standard(v, 446, 158, 34, '#8a2a1e');
  line.forEach(([x, y, h], i) => {
    person(v, x - h * 0.2, y, h, { f: 0, cloth: ARMY[i % 4], hair: '#3a3632', hat: true, stick: 'spear', tilt: 0.1 });
    person(v, x + h * 0.26, y + 1, h * 0.98, { f: 0, cloth: ARMY[(i + 2) % 4], hair: '#3a3632', hat: i % 2 === 0, stick: 'spear', tilt: 0.1 });
  });
  for (let i = 0; i < 8; i++) puff(ctx, 330 + R() * 130, 180 + R() * 40, 30, 8, t('#b8a888'), 0.14);
  // 짐수레
  const wx = 150, wy = 226;
  rect(ctx, wx - 44, wy - 34, 88, 20, t('#5a4028')); poly(ctx, [wx - 40, wy - 34, wx - 30, wy - 58, wx + 30, wy - 58, wx + 40, wy - 34], t('#b8ae96'));
  for (const k of [-26, 26]) { ctx.strokeStyle = t('#2e241a'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx + k, wy - 12, 12, 0, TAU); ctx.stroke(); stroke(ctx, [wx + k - 12, wy - 12, wx + k + 12, wy - 12], 1.4, t('#2e241a')); stroke(ctx, [wx + k, wy - 24, wx + k, wy], 1.4, t('#2e241a')); }
  person(v, 262, 242, 114, { ...mine(v, { raw: false }), f: 0, cloak: true, stick: 'spear', tilt: 0.1 });
  finish(v);
}
/** 병영: 군막 줄, 화톳불, 창을 세우고 선 신병들과 부사관 */
function armyCamp(v) {
  const { ctx, t } = v, promote = v.variant === 'promote';
  sky(v); far(v);
  const gy = (x) => 158 - fbm1(x / 160 + v.q, 3) * 6;
  ground(v, gy, { tufts: 60, color2: '#6a5a44' });
  // 목책
  for (let x = 0; x < VW; x += 9) poly(ctx, [x, gy(x) + 6, x, gy(x) - 16 - (x % 27 ? 0 : 3), x + 3.5, gy(x) - 21, x + 7, gy(x) - 16, x + 7, gy(x) + 6], t(x % 18 ? '#5a4630' : '#4e3c28'));
  for (const [x, w] of [[90, 30], [160, 26], [476, 28], [548, 32], [610, 26]]) armyTent(v, x, gy(x) + 22, w);
  standard(v, 330, gy(330) + 10, 96, '#8a2a1e');
  flame(v, 520, 214, 5); stroke(ctx, [508, 215, 532, 215], 3, '#1c1410');
  if (promote) { // 진급: 대열 앞에서 지휘관에게 받는다
    for (let i = 0; i < 7; i++) person(v, 96 + i * 30, 214 + (i % 2) * 3, 86, { f: 1, cloth: ARMY[i % 4], hair: '#3a3632', hat: true, stick: 'spear' });
    person(v, 430, 236, 116, { f: -1, cloth: '#5a2a26', hair: '#8a8478', cloak: true, arm: 'fwd' });
    person(v, 372, 238, 108, { ...mine(v, { raw: false }), f: 1, pose: 'kneel' });
  } else {
    for (let i = 0; i < 6; i++) person(v, 190 + i * 34, 220 + (i % 2) * 3, 92, { f: 1, cloth: i === 2 ? v.me.cloth : ARMY[i % 4], hair: i === 2 ? v.me.hair : '#3a3632', female: i === 2 && v.me.female, hat: i !== 2, stick: 'spear' });
    person(v, 452, 232, 110, { f: -1, cloth: '#5a2a26', hair: '#4a3220', hat: true, arm: 'out', stick: 'staff' });
  }
  finish(v);
}
/** 전열: 창을 세운 아군의 등 너머로, 언덕 위에 선 적의 줄과 깃발 */
function armyClash(v) {
  const { ctx, t, R } = v;
  sky(v); far(v);
  const ridge = (x) => 132 - Math.sin(x / 110 + v.q) * 8 - fbm1(x / 90 + v.q, 7, 3) * 8;
  ground(v, ridge, { tufts: 60, haze: 0.3 });
  // 언덕 위의 적
  for (let x = 70; x < 590; x += 11) { const y = ridge(x) + 6, h = 20 + R() * 4; rect(ctx, x, y - h, 6, h, t('#2a2630')); stroke(ctx, [x + 7, y - 4, x + 9, y - h - 14], 0.9, t('#2a2630')); }
  for (const x of [150, 330, 500]) standard(v, x, ridge(x) + 4, 46, '#2c2c34');
  smoke(v, 560, 120, 90, 26, '#3a3632', 0.3); smoke(v, 90, 124, 70, 20, '#3a3632', 0.24);
  // 날아오는 화살
  ctx.strokeStyle = rgba(t('#1c1814'), 0.7); ctx.lineWidth = 0.9; for (let i = 0; i < 22; i++) { const x = 160 + R() * 340, y = 30 + R() * 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y - 5 + (x - 330) * 0.01); ctx.stroke(); }
  const gy = (x) => 190 - fbm1(x / 150 + v.q, 3) * 5;
  ground(v, gy, { tufts: 80 });
  for (let i = 0; i < 12; i++) puff(ctx, R() * VW, 170 + R() * 24, 80, 10, v.S.haze, 0.2);
  // 51단계: 가운데 들판에서 이미 맞붙은 앞줄. 창이 엇갈리고 흙먼지가 오른다
  const foe = t('#2a2630');
  for (let p = 0; p < 6; p++) { // 둘씩 마주 붙은 짝
    const xa = 214 + p * 44 + R() * 8, y = 206 + (p % 2) * 6 + R() * 4, h = 54 + R() * 8;
    if (R() < 0.18) { ctx.fillStyle = foe; ctx.beginPath(); ctx.ellipse(xa, y - 3, h * 0.3, 4, 0.1, 0, TAU); ctx.fill(); }
    for (const f of [1, -1]) {
      const x = xa - f * 10;
      ctx.save(); ctx.translate(x, y); ctx.rotate(f * (0.16 + R() * 0.1)); // 앞으로 몸을 던진다
      person(v, 0, 0, h, { f, cloth: f > 0 ? dark(ARMY[p % 4], 0.25) : '#2e2a32', hair: '#2a2420', hat: true, noShadow: true });
      const ty = -h * (0.5 + R() * 0.2); stroke(ctx, [-f * 8, -h * 0.5, f * 34, ty], 2, t('#3a2e22'));
      ctx.fillStyle = t('#c8ccd0'); ctx.beginPath(); ctx.moveTo(f * 34, ty - 2); ctx.lineTo(f * 42, ty - 1); ctx.lineTo(f * 34, ty + 2); ctx.fill();
      ctx.restore();
    }
  }
  for (let p = 0; p < 5; p++) glow(v, 236 + p * 44 + R() * 8, 176 + R() * 10, 7, '#fff4d0', 0.7); // 쇠끼리 부딪는 불꽃
  for (let i = 0; i < 10; i++) puff(ctx, 230 + R() * 240, 196 - R() * 26, 40 + R() * 40, 12 + R() * 10, mixh(v.S.haze, '#8a7a60', 0.4), 0.26);
  // 아군의 줄: 가운데를 비워 싸움터가 보이게, 양옆에서 나아간다
  standard(v, 70, 236, 150, '#8a2a1e');
  const xs = [36, 100, 160, 486, 548, 610], me = 278;
  xs.forEach((x0, i) => {
    const x = x0 + R() * 8, h = 116 + R() * 8;
    person(v, x, 262, h, { f: 0, cloth: dark(ARMY[i % 4], 0.3), hair: '#2a2420', hat: true, stick: 'spear', tilt: (x < VW / 2 ? 1 : -1) * 0.06 });
    ctx.fillStyle = t(i % 2 ? '#5a2a26' : '#4a4038'); ctx.beginPath(); ctx.ellipse(x - h * 0.16, 262 - h * 0.6, h * 0.1, h * 0.15, 0, 0, TAU); ctx.fill();
  });
  person(v, me, 262, 112, { f: 0, cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, stick: 'spear', tilt: 0.05 });
  finish(v, { noLeaves: true });
}

/* ---------- 사랑 ---------- */
/** 만남: 마을 어귀 큰 나무 아래 낮은 돌담, 조금 떨어져 마주 선 두 사람 */
function loveMeet(v) {
  const { ctx, t } = v, me = v.me, ot = v.other, walk = v.variant === 'walk';
  sky(v); far(v); townFar(v, 150, HZ + 20, { s: 0.7 });
  const gy = (x) => 164 - fbm1(x / 150 + v.q, 3) * 8;
  ground(v, gy);
  if (walk) road(v, 330, 150, HZ + 26, { w: 110 });
  tree(v, 452, 212, 210);
  // 돌담
  for (let x = 250; x < 640; x += 15) rect(ctx, x, 202 - (x % 30 ? 0 : 2), 14, 16 + (x % 30 ? 0 : 2), t(x % 45 ? '#8c8274' : '#7a7266'));
  rect(ctx, 250, 216, 390, 3, rgba('#000000', 0.2));
  if (lit(v)) glow(v, 150, HZ + 10, 60, '#ffb060', 0.2);
  if (walk) {
    person(v, 300, 236, 106, { f: 0, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long });
    person(v, 340, 236, 102, { f: 0, cloth: ot.cloth, hair: ot.hair, female: ot.female, long: ot.long });
  } else {
    person(v, 316, 236, 108, { f: 1, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long, arm: 'chest' });
    person(v, 398, 234, 104, { f: -1, cloth: ot.cloth, hair: ot.hair, female: ot.female, long: ot.long });
  }
  finish(v);
}
const lit = (v) => v.S.tod === 'night' || v.S.tod === 'dusk';
/** 다툼: 식탁을 사이에 둔 두 사람. 한 사람은 등을 돌렸다. variant 'caught'면 식탁 위에 손수건 */
function loveQuarrel(v) {
  const { ctx } = v, fy = room(v, { stone: false, wall: '#3a2e26', floor: '#2a211a', fy: 170 }), me = v.me, ot = v.other;
  ctx.save(); zoom(v, 330, 244, 1.28);
  windowAt(v, 330, 66, 38, 44);
  rect(ctx, 468, 86, 70, 84, '#2a2420'); rect(ctx, 462, 80, 82, 8, '#3a322c'); rect(ctx, 482, 112, 42, 58, '#0c0908'); glow(v, 503, 160, 30, '#ff7a30', 0.3); rect(ctx, 492, 164, 22, 4, '#5a2a18');
  const tx = 330, ty = 198;
  poly(ctx, [tx - 60, ty - 42, tx + 60, ty - 42, tx + 74, ty - 28, tx - 74, ty - 28], '#5a4230'); rect(ctx, tx - 74, ty - 28, 148, 6, '#3a2a1e'); rect(ctx, tx - 66, ty - 22, 6, 44, '#2e2218'); rect(ctx, tx + 60, ty - 22, 6, 44, '#2e2218');
  candle(v, tx + 30, ty - 36, 9); pool(v, tx + 20, ty - 40, 110, 46, '#ffb060', 0.2);
  if (v.variant === 'caught') { poly(ctx, [tx - 22, ty - 38, tx - 4, ty - 39, tx - 2, ty - 32, tx - 24, ty - 31], '#d8ccd0'); stroke(ctx, [tx - 20, ty - 36, tx - 6, ty - 34], 0.8, '#8a3a4a'); }
  else { oval(ctx, tx - 20, ty - 34, 6, 2.6, '#8a7a5c'); ctx.save(); ctx.translate(tx - 2, ty - 33); ctx.rotate(1.3); rect(ctx, -3, -4, 6, 8, '#7a6a54'); ctx.restore(); oval(ctx, tx + 4, ty - 31, 8, 2.2, 'rgba(60,30,24,.6)'); }
  person(v, tx - 112, ty + 36, 108, { f: -1, raw: true, cloth: ot.cloth, hair: ot.hair, female: ot.female, long: ot.long, arm: 'chest', rim: 'rgba(255,180,100,.45)', rimDir: 1 });
  person(v, tx + 104, ty + 38, 110, mine(v, { f: v.variant === 'caught' ? -1 : 1, old: v.variant === 'caught', rim: WARM, rimDir: -1 }));
  ctx.restore();
  finish(v, { inside: true });
}

/* ---------- 마탑 ---------- */
/** 탑 안: 돌벽을 따라 도는 계단, 높은 창, 책장, 떠 있는 등불 아래의 스승과 견습. variant 'vote'면 둘러선 마도사들 */
function towerHall(v) {
  const { ctx, R } = v, fy = room(v, { wall: '#34323e', floor: '#24222a', fy: 172 }), me = v.me, vote = v.variant === 'vote';
  for (const x of [250, 330, 410]) { windowAt(v, x, 18, 26, 96, { arch: true }); if (v.S.tod !== 'night') shaft(v, x, 114, 26, 120, 50, v.S.lit, 0.1); }
  // 벽을 따라 오르는 계단
  for (let i = 0; i < 12; i++) { const x = 20 + i * 15, y = fy - i * 11; rect(ctx, x, y - 11, 60, 11, i % 2 ? '#3c3a46' : '#44424e'); rect(ctx, x, y - 11, 60, 2, 'rgba(255,255,255,.06)'); }
  poly(ctx, [20, fy, 200, fy, 200, fy - 132, 185, fy - 132], '#2a2832');
  stroke(ctx, [24, fy - 30, 190, fy - 152], 2, '#5a4a38'); for (let i = 0; i < 12; i += 2) stroke(ctx, [28 + i * 15, fy - 12 - i * 11, 28 + i * 15, fy - 32 - i * 11], 1.4, '#5a4a38');
  shelf(v, 470, 44, 150, 4);
  // 떠 있는 등불
  for (const [x, y, r] of [[230, 70, 5], [330, 140, 4], [440, 84, 6], [380, 44, 3.5]]) { glow(v, x, y, r * 7, COLD, 0.34); oval(ctx, x, y, r, r, '#e8f2ff'); }
  for (let i = 0; i < 16; i++) glow(v, 220 + R() * 240, 30 + R() * 130, 1.5 + R() * 1.5, COLD, 0.4);
  const rim = 'rgba(160,200,255,.55)';
  if (vote) { // 원탁 회의
    oval(ctx, 340, 214, 120, 22, '#3a3040'); oval(ctx, 340, 210, 120, 22, '#4a3e4e');
    const C = ['#3a3450', '#4a2a2e', '#5a5a62', '#2e4038', '#44403c', '#3a3450', '#4e3a2a'];
    [[226, 204, 0], [262, 196, 1], [306, 192, 2], [372, 192, 3], [416, 196, 4], [454, 204, 5]].forEach(([x, y, i]) => person(v, x, y, 84, { f: x < 340 ? 1 : -1, raw: true, cloth: C[i], hair: i % 2 ? '#8a8478' : '#2a1e16', robe: true, hood: i % 3 === 0, arm: i === 2 || i === 4 ? 'up' : null, rim, rimDir: x < 340 ? 1 : -1 }));
    person(v, 300, 256, 112, mine(v, { f: 0, cloth: mixh(me.cloth, '#3a3450', 0.5), robe: !me.female, rim, rimDir: 1 }));
    person(v, 390, 258, 108, { f: 0, raw: true, cloth: '#2e2a3a', hair: '#8a8478', robe: true, rim, rimDir: -1 });
  } else {
    const tx = 360, ty = 210;
    poly(ctx, [tx - 60, ty - 38, tx + 70, ty - 38, tx + 82, ty - 26, tx - 72, ty - 26], '#4a3a2c'); rect(ctx, tx - 72, ty - 26, 154, 6, '#30241a'); rect(ctx, tx - 64, ty - 20, 6, 40, '#2a2018'); rect(ctx, tx + 70, ty - 20, 6, 40, '#2a2018');
    for (let i = 0; i < 3; i++) rect(ctx, tx - 50 + i * 3, ty - 44 - i * 4, 26, 4, ['#5a3a34', '#3e4658', '#4a5240'][i]);
    poly(ctx, [tx - 8, ty - 39, tx + 12, ty - 43, tx + 34, ty - 39, tx + 12, ty - 37], '#d8ccb0');
    oval(ctx, tx + 56, ty - 46, 7, 7, '#9ab0c8'); glow(v, tx + 56, ty - 46, 22, COLD, 0.4);
    person(v, tx + 122, ty + 28, 116, { f: -1, raw: true, cloth: '#3a3450', hair: '#b8b4ac', robe: true, stick: 'staff', rim, rimDir: -1 });
    glow(v, tx + 122 - 21, ty + 28 - 124, 12, COLD, 0.6);
    person(v, tx - 110, ty + 30, me.age < 16 ? 86 : 106, mine(v, { f: 1, cloth: mixh(me.cloth, '#3a3450', 0.45), robe: !me.female, arm: 'chest', rim, rimDir: 1 }));
  }
  finish(v, { inside: true });
}

export const PLATES2 = {
  /** 군대. variant: march camp promote clash */
  army(v) { const k = v.variant ?? 'camp'; return k === 'march' ? armyMarch(v) : k === 'clash' ? armyClash(v) : armyCamp(v); },
  /** 사랑. variant: meet walk quarrel caught */
  love(v) { const k = v.variant ?? 'meet'; return k === 'quarrel' || k === 'caught' ? loveQuarrel(v) : loveMeet(v); },
  /** 마탑 안. variant: hall vote */
  tower: towerHall,
  /** 봉인의 흔들림. variant: dream stone map shard alley visitor rite broken */
  seal(v) {
    const k = v.variant ?? 'stone';
    return k === 'dream' ? sealDream(v) : k === 'map' || k === 'shard' ? sealTable(v, k) : k === 'alley' ? sealAlley(v) : k === 'visitor' ? sealVisitor(v) : k === 'rite' ? sealRite(v) : k === 'broken' ? sealBroken(v) : sealStone(v);
  },
  /** 일터. variant: healer bard teacher alchemy builder */
  trade(v) {
    const k = v.variant ?? 'healer';
    return k === 'bard' ? tradeBard(v) : k === 'teacher' ? tradeTeacher(v) : k === 'alchemy' ? tradeAlchemy(v) : k === 'builder' ? tradeBuilder(v) : tradeHealer(v);
  },
  /** 큰 짐승 사냥. variant: boar bear ash stag deer tracks */
  beast: beastPlate,
};
