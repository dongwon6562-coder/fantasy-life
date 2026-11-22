// 34단계 삽화: 천천히 바뀌는 시대.
// 새 기술(공방의 시제품, 첫 가로등, 인쇄소, 쇠수레 길 놓기), 도시의 삶(공장 안, 셋방 골목, 닫힌 공장 문, 일을 잃은 마부),
// 새 시대의 다툼(기계를 부수는 밤, 벽보 앞의 사람들, 지하실 모임, 떠나는 자식).
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, ground, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, crowd, finish, zoom } from './vignetteKit.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const ring = (ctx, x, y, r, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(170,210,255,.5)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });

/** 톱니바퀴 */
function gear(ctx, x, y, r, c, n = 10) {
  ctx.fillStyle = c; ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, rr = i % 2 ? r : r * 0.8; ctx.lineTo(x + Math.cos(a - 0.08) * rr, y + Math.sin(a - 0.08) * rr); ctx.lineTo(x + Math.cos(a + 0.08) * rr, y + Math.sin(a + 0.08) * rr); }
  ctx.closePath(); ctx.fill(); oval(ctx, x, y, r * 0.3, r * 0.3, dark(c, 0.5));
}
/** 벽돌 벽: 줄눈을 옅게 */
function bricks(ctx, x, y, w, h, c, step = 7) {
  rect(ctx, x, y, w, h, c); ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let r = 0, yy = y + step; yy < y + h; yy += step, r++) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); for (let xx = x + (r % 2 ? step : step * 2); xx < x + w; xx += step * 2) { ctx.moveTo(xx, yy - step); ctx.lineTo(xx, yy); } }
  ctx.stroke();
}
/** 굴뚝과 연기. smokeOn이 거짓이면 식은 굴뚝 */
function chimney(v, x, y, h, w, c, smokeOn = true) {
  const { ctx } = v; poly(ctx, [x - w / 2, y, x + w / 2, y, x + w * 0.34, y - h, x - w * 0.34, y - h], c); rect(ctx, x - w * 0.42, y - h - 2, w * 0.84, 3, dark(c, 0.4));
  if (smokeOn) smoke(v, x, y - h - 2, h * 0.9, w * 1.6, '#3a3634', 0.34);
}
/** 등석 가로등. on이면 푸르스름하게 켜진다 */
function lampPost(v, x, y, h, on) {
  const { ctx } = v; stroke(ctx, [x, y, x, y - h], Math.max(1.2, h * 0.03), '#1e1c1c'); rect(ctx, x - h * 0.07, y - h - h * 0.1, h * 0.14, h * 0.1, on ? '#e8f4ff' : '#59626c'); poly(ctx, [x - h * 0.1, y - h - h * 0.1, x + h * 0.1, y - h - h * 0.1, x, y - h - h * 0.17], '#1e1c1c');
  if (on) { glow(v, x, y - h - h * 0.05, h * 0.6, '#bfe0ff', 0.5); pool(v, x, y + 2, h * 0.7, h * 0.14, '#bfe0ff', 0.2); }
}
/** 틀 기계 한 대 (공장의 베틀·방적기를 뭉뚱그린 모습). s 1이면 폭 70쯤 */
function machine(ctx, x, y, s, c = '#3a3632', broken = false) {
  rect(ctx, x - 34 * s, y - 40 * s, 4 * s, 40 * s, c); rect(ctx, x + 30 * s, y - 40 * s, 4 * s, 40 * s, c); rect(ctx, x - 34 * s, y - 42 * s, 68 * s, 4 * s, c); rect(ctx, x - 34 * s, y - 14 * s, 68 * s, 3 * s, c);
  if (broken) { stroke(ctx, [x - 30 * s, y - 38 * s, x + 6 * s, y - 6 * s], 2.4 * s, c); stroke(ctx, [x + 10 * s, y - 40 * s, x + 26 * s, y - 20 * s], 2 * s, c); gear(ctx, x + 22 * s, y - 4 * s, 8 * s, '#5a544c', 9); return; }
  for (let i = 0; i < 9; i++) stroke(ctx, [x - 28 * s + i * 7 * s, y - 38 * s, x - 28 * s + i * 7 * s, y - 15 * s], 0.5 * s, 'rgba(210,200,180,.5)');
  rect(ctx, x - 30 * s, y - 28 * s, 60 * s, 3 * s, '#6a5a44'); gear(ctx, x + 38 * s, y - 30 * s, 8 * s, '#5a544c', 9); gear(ctx, x + 38 * s, y - 16 * s, 5 * s, '#4a4640', 7);
}

/* ---------- 새 기술 ---------- */
/** 공방의 시제품: 밤늦은 작업대, 놋쇠 틀 안의 마석이 처음으로 빛난다 */
function techBench(v) {
  const { ctx, R } = v; room(v, { wall: '#352c26', floor: '#261f1a', fy: 180, stone: false });
  windowAt(v, 500, 34, 60, 76, {});
  // 벽에 붙인 도면, 선반의 유리병과 연장
  for (const [x, y, w, h] of [[70, 40, 60, 44], [140, 52, 44, 56], [72, 92, 50, 36]]) { rect(ctx, x, y, w, h, '#b8a888'); for (let i = 0; i < 4; i++) stroke(ctx, [x + 6, y + 8 + i * 8, x + w - 6 - hash(x, i) * 14, y + 8 + i * 8], 0.6, 'rgba(60,44,30,.5)'); ring(ctx, x + w * 0.6, y + h * 0.6, 7, 0.7, 'rgba(60,44,30,.6)'); }
  rect(ctx, 226, 62, 190, 4, '#1c1612'); for (let i = 0; i < 8; i++) { const x = 238 + i * 22; i % 3 ? (rect(ctx, x - 4, 48, 8, 14, rgba('#8ab0a8', 0.6)), rect(ctx, x - 2, 42, 4, 6, rgba('#8ab0a8', 0.6))) : gear(ctx, x, 54, 8, '#6a5c3c', 8); }
  // 작업대와 시제품
  rect(ctx, 150, 150, 330, 10, '#4a3626'); rect(ctx, 162, 160, 10, 60, '#33251a'); rect(ctx, 458, 160, 10, 60, '#33251a');
  const dx = 330, dy = 150;
  rect(ctx, dx - 26, dy - 6, 52, 6, '#7a6436'); stroke(ctx, [dx - 22, dy - 6, dx - 14, dy - 44, dx + 14, dy - 44, dx + 22, dy - 6], 2.4, '#9a8046'); ring(ctx, dx, dy - 26, 13, 2, '#9a8046');
  gear(ctx, dx - 30, dy - 16, 9, '#8a7440', 9); gear(ctx, dx + 31, dy - 13, 7, '#6a5c3c', 8);
  oval(ctx, dx, dy - 26, 6, 7, '#d8f0ff'); glow(v, dx, dy - 26, 70, '#8fd0ff', 0.55); pool(v, dx, 164, 150, 14, '#8fd0ff', 0.2);
  for (let i = 0; i < 9; i++) { const x = 170 + R() * 280; if (Math.abs(x - dx) < 44) continue; R() < 0.5 ? stroke(ctx, [x, 149, x + 10 + R() * 8, 146], 1.6, '#6a6e76') : gear(ctx, x, 146, 3 + R() * 3, '#6a5c3c', 7); }
  // 장인(나)과 등불을 든 조수
  person(v, 262, 236, 112, mine(v, { raw: true, f: 1, arm: 'fwd', rim: COLD, rimDir: 1 }));
  person(v, 410, 236, 96, folk(1, { raw: true, f: -1, arm: 'chest', female: false, long: false, rim: COLD, rimDir: -1 }));
  candle(v, 450, 150, 9);
  finish(v, { inside: true });
}
/** 첫 가로등: 해 진 광장, 사다리 위의 점등꾼과 올려다보는 사람들 */
function techLamp(v) {
  const { ctx, t } = v; sky(v);
  // 광장 둘레의 집들
  for (const [x, w, h, c] of [[0, 110, 120, '#4a4038'], [104, 90, 96, '#54483c'], [190, 80, 132, '#463c34'], [420, 100, 110, '#4e4238'], [514, 130, 140, '#40362e']]) {
    rect(ctx, x, 176 - h, w, h, t(c)); poly(ctx, [x - 4, 176 - h, x + w / 2, 176 - h - 26, x + w + 4, 176 - h], t(dark(c, 0.3)));
    for (let r = 0; r < 2; r++) for (let i = 0; i < Math.floor(w / 30); i++) { const lit = hash(x + i, r) < 0.34; rect(ctx, x + 12 + i * 30, 176 - h + 16 + r * 36, 10, 14, lit ? '#d09a4a' : t('#1a1512')); }
  }
  rect(ctx, 270, 60, 150, 116, t('#3a322c')); poly(ctx, [330, 60, 345, 14, 360, 60], t('#2a2420')); rect(ctx, 336, 120, 20, 56, t('#14100e')); for (const x of [286, 306, 376, 396]) rect(ctx, x, 84, 9, 22, x === 376 ? '#d09a4a' : t('#1a1512'));
  rect(ctx, 0, 176, VW, 64, t('#5a544c')); for (let i = 0; i < 9; i++) stroke(ctx, [0, 182 + i * i * 0.9, VW, 182 + i * i * 0.9], 0.6, 'rgba(0,0,0,.22)');
  // 아직 켜지 않은 등 둘, 지금 켜지는 등 하나
  lampPost(v, 150, 200, 74, false); lampPost(v, 520, 198, 70, false); lampPost(v, 330, 214, 120, true);
  // 사다리와 점등꾼
  stroke(ctx, [352, 216, 338, 110], 2, '#3a2c20'); stroke(ctx, [366, 216, 350, 110], 2, '#3a2c20'); for (let i = 0; i < 7; i++) stroke(ctx, [351 - i * 2, 204 - i * 14, 365 - i * 2.2, 204 - i * 14], 1.4, '#3a2c20');
  person(v, 352, 160, 62, folk(4, { raw: true, f: -1, arm: 'up', hat: true, rim: COLD, rimDir: -1 }));
  // 올려다보는 사람들
  person(v, 262, 222, 74, folk(1, { f: 1, rim: COLD, rimDir: 1 })); person(v, 236, 224, 46, folk(2, { f: 1, child: true, arm: 'up', rim: COLD, rimDir: 1 }));
  person(v, 430, 222, 78, folk(3, { f: -1, cloak: true, rim: COLD, rimDir: -1 })); person(v, 468, 224, 74, folk(5, { f: -1, old: true, stick: 'staff', rim: COLD, rimDir: -1 }));
  crowd(v, 40, 250, 246, 4, 92, { rim: COLD, rimDir: 1 }); crowd(v, 420, 620, 246, 4, 92, { rim: COLD, rimDir: -1 });
  finish(v);
}
/** 인쇄소: 나사 틀 인쇄기, 줄에 널어 말리는 종이 */
function techPress(v) {
  const { ctx } = v; room(v, { wall: '#3c342c', floor: '#2a231d', fy: 178, stone: false });
  windowAt(v, 60, 30, 70, 90, {}); shaft(v, 64, 120, 70, 130, 90, '#ffe8c0', 0.14);
  // 널어 말리는 종이
  for (const [y, x0, x1, n] of [[36, 150, 640, 9], [58, 200, 640, 7]]) { stroke(ctx, [x0, y, (x0 + x1) / 2, y + 7, x1, y], 0.7, '#1c1612'); for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, x = x0 + (x1 - x0) * k, yy = y + Math.sin(k * Math.PI) * 7; rect(ctx, x - 13, yy, 26, 34, '#d8ceb4'); for (let j = 0; j < 5; j++) stroke(ctx, [x - 9, yy + 6 + j * 5, x + 9 - hash(i, j) * 6, yy + 6 + j * 5], 0.7, 'rgba(40,30,22,.55)'); } }
  // 인쇄기
  const px = 340, py = 216;
  rect(ctx, px - 60, py - 150, 12, 150, '#33251a'); rect(ctx, px + 48, py - 150, 12, 150, '#33251a'); rect(ctx, px - 66, py - 156, 132, 12, '#2a1e16'); rect(ctx, px - 60, py - 96, 120, 8, '#3a2a1e');
  rect(ctx, px - 5, py - 144, 10, 50, '#6a6e76'); for (let i = 0; i < 8; i++) stroke(ctx, [px - 5, py - 140 + i * 6, px + 5, py - 137 + i * 6], 0.8, '#3a3e46');
  rect(ctx, px - 34, py - 88, 68, 10, '#4a4e56'); rect(ctx, px - 46, py - 70, 92, 8, '#4a3626'); rect(ctx, px - 40, py - 76, 80, 6, '#d8ceb4'); rect(ctx, px - 52, py - 62, 104, 62, '#3a2a1e');
  stroke(ctx, [px, py - 120, px - 74, py - 108], 3.4, '#5a4030');
  // 인쇄공이 손잡이를 당긴다. 아이가 종이 묶음을 나른다
  person(v, px - 96, 236, 110, folk(0, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: -1 })); poly(ctx, [px - 104, 176, px - 88, 176, px - 86, 214, px - 106, 214], '#2a221c');
  person(v, 500, 236, 70, folk(2, { raw: true, f: 1, child: true, arm: 'chest' })); rect(ctx, 494, 190, 26, 12, '#d8ceb4'); stroke(ctx, [494, 196, 520, 196], 0.8, '#5a4030');
  rect(ctx, 548, 178, 70, 44, '#4a3626'); for (let i = 0; i < 5; i++) rect(ctx, 554, 170 - i * 5, 56, 4, i % 2 ? '#cfc4a8' : '#d8ceb4');
  // 활자 상자
  rect(ctx, 150, 140, 76, 42, '#4a3626'); for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) rect(ctx, 154 + c * 12, 144 + r * 12, 10, 10, hash(r, c) < 0.5 ? '#6a6e76' : '#2a1e16');
  finish(v, { inside: true });
}
/** 쇠수레 길 놓기: 둑 위에 침목을 까는 인부들, 멀리 김을 뿜는 쇠수레 */
function techRail(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); ground(v, (x) => Math.max(fn(x), 150) + 6, {});
  // 멀어지는 둑과 쇠 줄
  poly(ctx, [640, 240, 250, 240, 120, 158, 150, 156], t('#6a6258')); poly(ctx, [640, 196, 640, 240, 250, 240, 120, 158], t('#575048'));
  for (let i = 0; i < 16; i++) { const k = i / 16, x = 150 + k * k * 470, y = 157 + k * k * 76, w = 8 + k * 60; stroke(ctx, [x - w * 0.5, y + w * 0.14, x + w * 0.42, y - w * 0.04], 1.2 + k * 5, t('#3a2c20')); }
  stroke(ctx, [142, 157, 300, 176], 1.4, t('#2a2a30')); stroke(ctx, [152, 156, 330, 172], 1.4, t('#2a2a30'));
  // 멀리 선 쇠수레
  rect(ctx, 96, 146, 30, 9, t('#2c2e36')); rect(ctx, 118, 140, 10, 15, t('#3a3c46')); rect(ctx, 100, 138, 4, 9, t('#1e2026')); smoke(v, 102, 138, 44, 16, '#d8dad8', 0.4); glow(v, 124, 146, 9, '#9ad8ff', 0.6);
  // 쌓아 둔 침목과 쇠
  for (let i = 0; i < 5; i++) rect(ctx, 470 - i * 3, 222 - i * 7, 110, 6, t(i % 2 ? '#4a3828' : '#3e2e20')); stroke(ctx, [440, 232, 620, 214], 2.4, t('#3a3a42'));
  // 인부들: 망치를 든 둘, 침목을 멘 둘, 장대를 든 측량꾼
  person(v, 360, 214, 84, folk(0, { f: -1, arm: 'up', rim: WARM, rimDir: v.S.dir })); stroke(ctx, [352, 146, 340, 128], 2.2, t('#5a4030')); rect(ctx, 332, 122, 14, 8, t('#4a4e56'));
  person(v, 300, 204, 70, folk(3, { f: 1, pose: 'bow', arm: 'fwd' }));
  person(v, 428, 226, 96, folk(4, { f: -1, arm: 'chest' })); person(v, 500, 230, 98, folk(5, { f: -1, arm: 'chest' })); stroke(ctx, [416, 158, 514, 160], 6, t('#4a3828'));
  person(v, 226, 190, 56, folk(2, { f: 1, hat: true, cloak: true, stick: 'staff' }));
  person(v, 580, 238, 110, mine(v, { f: -1 }));
  finish(v);
}

/* ---------- 도시의 삶 ---------- */
/** 공장 안: 줄지은 틀 기계와 허리 굽힌 직공들, 높은 창의 빛줄기 */
function cityMill(v) {
  const { ctx } = v; room(v, { wall: '#3a3430', floor: '#27221e', fy: 172, stone: true });
  for (let i = 0; i < 5; i++) { const x = 40 + i * 124; windowAt(v, x, 14, 50, 84, { arch: true }); shaft(v, x + 4, 98, 50, 130, 60, '#e8e0c8', 0.1); }
  // 천장의 굴대와 내려오는 가죽 띠
  rect(ctx, 0, 6, VW, 5, '#1c1814'); for (let i = 0; i < 6; i++) { const x = 70 + i * 104; ring(ctx, x, 9, 7, 2.4, '#2a2420'); stroke(ctx, [x - 6, 12, x - 14, 126], 1, 'rgba(90,70,50,.7)'); stroke(ctx, [x + 6, 12, x + 2, 126], 1, 'rgba(90,70,50,.7)'); }
  // 뒤줄 기계와 직공
  for (let i = 0; i < 6; i++) { const x = 56 + i * 104; machine(ctx, x, 172, 0.8, '#2e2a27'); person(v, x - 34, 176, 58, folk(i, { raw: true, f: 1, pose: i % 2 ? 'stand' : 'bow', arm: 'fwd', female: i % 2 === 0, long: false, hood: i % 2 === 0 })); }
  // 앞줄
  for (let i = 0; i < 3; i++) { const x = 130 + i * 200; machine(ctx, x, 230, 1.5, '#262220'); }
  person(v, 232, 238, 104, mine(v, { raw: true, f: -1, arm: 'fwd', rim: 'rgba(230,220,200,.4)', rimDir: 1 }));
  person(v, 432, 238, 70, folk(2, { raw: true, f: -1, child: true, arm: 'fwd' }));
  // 감독
  person(v, 596, 232, 104, { raw: true, f: -1, cloth: '#1e1c22', hair: '#3a2a1e', hat: true, cloak: true, arm: 'chest' });
  for (let i = 0; i < 60; i++) oval(ctx, v.R() * VW, 20 + v.R() * 150, 0.7, 0.7, 'rgba(230,220,200,.25)');
  finish(v, { inside: true });
}
/** 셋방 골목: 높은 벽돌집 사이, 굴뚝 연기 아래로 일을 마치고 돌아오는 사람들 */
function cityTenement(v) {
  const { ctx, t } = v; sky(v);
  for (const [x, h] of [[250, 150], [310, 174], [372, 140]]) chimney(v, x, 150, h * 0.6, 12, t('#3a302c'));
  rect(ctx, 220, 100, 200, 90, t('#4a4440')); for (let i = 0; i < 12; i++) rect(ctx, 228 + (i % 6) * 32, 112 + Math.floor(i / 6) * 30, 10, 14, hash(i, 3) < 0.4 ? '#c89040' : t('#1c1816'));
  bricks(ctx, 0, 0, 236, 240, t('#4e3a32'), 9); bricks(ctx, 410, 0, 230, 240, t('#44322c'), 9);
  poly(ctx, [236, 0, 262, 0, 252, 200, 236, 240], t('#33261f')); poly(ctx, [410, 0, 386, 0, 396, 200, 410, 240], t('#2c211c'));
  for (const [x, y, lit] of [[30, 30, 1], [100, 30, 0], [170, 30, 0], [30, 96, 0], [100, 96, 1], [170, 96, 0], [444, 28, 0], [514, 28, 1], [584, 28, 0], [444, 94, 1], [514, 94, 0], [584, 94, 0]]) { rect(ctx, x, y, 30, 40, lit ? '#c89040' : '#151210'); stroke(ctx, [x + 15, y, x + 15, y + 40], 1, t('#33261f')); rect(ctx, x - 3, y + 40, 36, 3, t('#6a5a50')); if (lit) glow(v, x + 15, y + 20, 34, '#ffa850', 0.28); }
  rect(ctx, 90, 160, 40, 80, '#120f0d'); rect(ctx, 500, 164, 40, 76, '#120f0d'); for (let i = 0; i < 3; i++) rect(ctx, 84 - i * 5, 222 + i * 6, 52 + i * 10, 6, t('#5a524a'));
  rect(ctx, 236, 190, 174, 50, t('#3e3a36')); poly(ctx, [236, 240, 252, 200, 396, 200, 410, 240], t('#4a4540')); for (let i = 0; i < 6; i++) stroke(ctx, [250 - i * 2, 204 + i * 7, 398 + i * 2, 204 + i * 7], 0.6, 'rgba(0,0,0,.25)');
  lampPost(v, 268, 214, 64, true);
  // 돌아오는 사람들: 굽은 어깨, 도시락 보따리
  person(v, 330, 208, 50, folk(0, { f: 0, hat: true })); person(v, 362, 212, 54, folk(1, { f: 0, hood: true })); person(v, 300, 226, 72, folk(3, { f: 0, pose: 'bow', hat: true }));
  person(v, 180, 238, 96, mine(v, { f: 1, rim: COLD, rimDir: 1 }));
  // 문간에 앉은 아이와 노파
  person(v, 112, 232, 44, folk(2, { f: 1, child: true, pose: 'sit' })); person(v, 520, 236, 70, folk(4, { f: -1, old: true, female: true, long: false, hood: true, pose: 'sit' }));
  finish(v);
}
/** 닫힌 공장 문: 쇠문 앞에 선 직공들, 식은 굴뚝, 문 안의 경비 */
function cityStrike(v) {
  const { ctx, t } = v; sky(v);
  chimney(v, 120, 110, 96, 20, t('#4a3a34'), false); chimney(v, 540, 104, 84, 18, t('#44342e'), false);
  bricks(ctx, 0, 70, 250, 120, t('#56423a'), 8); bricks(ctx, 390, 70, 250, 120, t('#4e3c34'), 8);
  for (let i = 0; i < 4; i++) { poly(ctx, [i * 62, 70, i * 62 + 62, 70, i * 62 + 62, 44], t('#2e2a28')); poly(ctx, [392 + i * 62, 70, 454 + i * 62, 70, 454 + i * 62, 44], t('#2e2a28')); }
  for (let i = 0; i < 6; i++) { rect(ctx, 16 + i * 38, 96, 18, 30, t('#16120f')); rect(ctx, 404 + i * 38, 96, 18, 30, t('#16120f')); }
  rect(ctx, 250, 96, 140, 94, t('#6a6258'));
  rect(ctx, 0, 188, VW, 52, t('#5a544c'));
  // 쇠문과 기둥
  rect(ctx, 238, 80, 16, 112, t('#3a302c')); rect(ctx, 386, 80, 16, 112, t('#3a302c')); stroke(ctx, [246, 82, 320, 66, 394, 82], 3, '#1e1c1c');
  for (let i = 0; i <= 14; i++) stroke(ctx, [256 + i * 9.2, 92, 256 + i * 9.2, 190], 1.6, '#1e1c1c'); stroke(ctx, [254, 110, 386, 110], 2, '#1e1c1c'); stroke(ctx, [254, 170, 386, 170], 2, '#1e1c1c');
  rect(ctx, 312, 134, 16, 12, '#2a2622'); ring(ctx, 320, 148, 4, 1.6, '#8a8e96');
  // 문 안의 경비 둘
  person(v, 290, 188, 56, { f: 1, cloth: '#2a2c36', hair: '#1c1614', hat: true, stick: 'staff' }); person(v, 352, 188, 56, { f: -1, cloth: '#2a2c36', hair: '#3a2a1e', hat: true, arm: 'chest' });
  // 문 앞에 나선 사람과 말없이 선 무리
  person(v, 322, 222, 78, folk(4, { f: 0, arm: 'up' }));
  for (let i = 0; i < 7; i++) person(v, 120 + i * 66 + hash(i, 2) * 14, 228 + hash(i, 4) * 6, 74 + hash(i, 5) * 10, folk(i, { f: 0, hat: i % 3 === 0, hood: i % 3 === 1, arm: i % 4 === 0 ? 'chest' : undefined, child: false }));
  crowd(v, 0, 640, 250, 9, 96, {});
  finish(v);
}
/** 일을 잃은 마부: 빈 마구간 앞, 손에 든 마구. 큰길로 말 없는 쇠수레가 지나간다 */
function cityIdle(v) {
  const { ctx, t } = v; sky(v);
  // 큰길 건너 집들과 지나가는 쇠수레
  for (const [x, w, h, c] of [[300, 90, 70, '#8a7e6c'], [384, 70, 88, '#7a705e'], [450, 100, 64, '#948874'], [544, 100, 82, '#80745f']]) { rect(ctx, x, 150 - h, w, h, t(c)); poly(ctx, [x - 3, 150 - h, x + w / 2, 150 - h - 20, x + w + 3, 150 - h], t('#5a4436')); for (let i = 0; i < 2; i++) rect(ctx, x + 12 + i * 30, 150 - h + 16, 9, 12, t('#2a221c')); }
  rect(ctx, 290, 150, 350, 70, t('#9a927f')); for (let i = 0; i < 5; i++) stroke(ctx, [290, 156 + i * 8, 640, 156 + i * 8], 0.5, 'rgba(0,0,0,.14)');
  const cx = 470, cy = 174; rect(ctx, cx - 30, cy - 22, 60, 16, t('#3a3c46')); rect(ctx, cx - 20, cy - 38, 34, 16, t('#5a3a30')); rect(ctx, cx - 16, cy - 34, 10, 9, t('#b8c8d0')); rect(ctx, cx - 30, cy - 22, 60, 2, t('#b89a48'));
  for (const k of [-18, 18]) { oval(ctx, cx + k, cy - 4, 8, 8, '#1c1c20'); oval(ctx, cx + k, cy - 4, 3, 3, t('#5a5e66')); } glow(v, cx + 32, cy - 14, 12, '#9ad8ff', 0.7); smoke(v, cx - 30, cy - 24, 30, 14, '#e2e4e2', 0.3);
  person(v, cx - 2, cy - 22, 30, { f: 1, cloth: '#2a2c36', hair: '#1c1614', hat: true });
  person(v, 580, 186, 50, folk(1, { f: -1 })); person(v, 356, 184, 46, folk(3, { f: 1, hat: true }));
  // 마구간: 열린 문, 빈 칸, 벽에 건 멍에
  rect(ctx, 0, 30, 290, 190, t('#5a4a3a')); for (let i = 0; i < 9; i++) stroke(ctx, [i * 34, 30, i * 34, 220], 0.7, 'rgba(0,0,0,.22)'); poly(ctx, [0, 30, 300, 30, 290, 8, 0, 0], t('#3a2e26'));
  rect(ctx, 40, 76, 110, 144, '#14100d'); rect(ctx, 34, 70, 122, 7, t('#3a2c20')); rect(ctx, 40, 150, 110, 5, t('#4a3828')); stroke(ctx, [60, 220, 130, 196], 1, 'rgba(200,180,120,.5)'); for (let i = 0; i < 12; i++) stroke(ctx, [50 + hash(i, 1) * 90, 218, 56 + hash(i, 2) * 90, 210], 0.8, 'rgba(200,180,120,.5)');
  ctx.strokeStyle = t('#3a2c20'); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(210, 100, 16, 22, 0, 0, TAU); ctx.stroke(); stroke(ctx, [240, 80, 262, 80, 262, 120], 1.6, t('#2a1e16'));
  rect(ctx, 0, 218, VW, 22, t('#6a6052'));
  // 긴 걸상의 마부와 채찍, 곁에 선 나
  rect(ctx, 166, 206, 110, 6, t('#3a2c20')); rect(ctx, 172, 212, 6, 20, t('#3a2c20')); rect(ctx, 264, 212, 6, 20, t('#3a2c20'));
  person(v, 216, 232, 100, folk(5, { f: 1, pose: 'sit', old: true, hat: true, arm: 'fwd' })); stroke(ctx, [236, 196, 252, 204, 258, 226], 1.8, t('#2a1e16')); stroke(ctx, [280, 232, 286, 150], 1.4, t('#2a1e16')); stroke(ctx, [286, 150, 300, 172], 0.7, t('#2a1e16'));
  person(v, 120, 238, 104, mine(v, { f: 1 }));
  finish(v);
}

/* ---------- 새 시대의 다툼 ---------- */
/** 기계를 부수는 밤: 횃불과 쇠망치, 쓰러진 틀 */
function newBreakers(v) {
  const { ctx, R } = v; room(v, { wall: '#221e1c', floor: '#191614', fy: 172, stone: true });
  for (let i = 0; i < 4; i++) { const x = 70 + i * 150; rect(ctx, x, 16, 46, 80, '#0e1220'); stroke(ctx, [x + 23, 16, x + 23, 96], 1.4, '#1c1814'); stroke(ctx, [x, 56, x + 46, 56], 1.4, '#1c1814'); }
  poly(ctx, [220, 16, 266, 16, 250, 50, 236, 60], '#16223a'); // 깨진 창
  machine(ctx, 120, 176, 1, '#24201e'); machine(ctx, 540, 176, 1, '#24201e');
  // 부서진 기계
  machine(ctx, 330, 226, 1.7, '#2e2926', true); for (let i = 0; i < 16; i++) stroke(ctx, [250 + R() * 170, 224 + R() * 10, 258 + R() * 170, 220 + R() * 12], 1.2, '#3a3430');
  // 사람들
  person(v, 250, 234, 108, folk(0, { raw: true, f: 1, arm: 'up', hood: true, rim: WARM, rimDir: 1 })); stroke(ctx, [262, 142, 284, 112], 2.6, '#5a4030'); rect(ctx, 278, 102, 18, 11, '#5a5e66');
  person(v, 430, 236, 104, folk(3, { raw: true, f: -1, arm: 'up', stick: 'torch', rim: WARM, rimDir: -1 }));
  person(v, 510, 230, 92, folk(4, { raw: true, f: -1, arm: 'fwd', hood: true, rim: WARM, rimDir: -1 })); stroke(ctx, [486, 184, 452, 198], 2.4, '#5a4030');
  person(v, 150, 232, 96, mine(v, { raw: true, f: 1, rim: WARM, rimDir: 1 }));
  person(v, 60, 226, 84, folk(5, { raw: true, f: -1, hood: true })); // 문 쪽을 살피는 사람
  glow(v, 420, 130, 150, '#ff8a30', 0.3); pool(v, 340, 226, 220, 30, '#ff8a30', 0.22);
  for (let i = 0; i < 14; i++) { const a = -Math.PI * R(), r = 10 + R() * 40; oval(ctx, 300 + Math.cos(a) * r, 190 + Math.sin(a) * r, 1, 1, rgba('#ffd080', 0.4 + R() * 0.6)); }
  finish(v, { inside: true });
}
/** 벽보 앞의 사람들: 찍어 낸 글이 덕지덕지 붙은 벽, 궤짝에 올라 읽어 주는 사람 */
function newPaper(v) {
  const { ctx, t } = v; sky(v);
  bricks(ctx, 0, 20, VW, 176, t('#6a5a4e'), 9); rect(ctx, 0, 12, VW, 10, t('#4a3e36')); rect(ctx, 0, 194, VW, 46, t('#6e665a'));
  for (let i = 0; i < 9; i++) stroke(ctx, [0, 200 + i * i * 0.7, VW, 200 + i * i * 0.7], 0.5, 'rgba(0,0,0,.16)');
  rect(ctx, 520, 60, 80, 136, t('#2a221c')); rect(ctx, 514, 54, 92, 7, t('#3a2c20')); lampPost(v, 490, 198, 96, false);
  // 벽보: 겹겹이, 몇 장은 찢기고 덧붙었다
  for (let i = 0; i < 15; i++) { const x = 40 + (i % 8) * 56 + hash(i, 1) * 14, y = 44 + Math.floor(i / 8) * 62 + hash(i, 2) * 16, w = 34 + hash(i, 3) * 14, h = 46 + hash(i, 4) * 12, c = t(['#d8ceb4', '#cfc4a8', '#e0d8c0'][i % 3]);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((hash(i, 5) - 0.5) * 0.14); rect(ctx, -w / 2, -h / 2, w, h, c); rect(ctx, -w / 2 + 4, -h / 2 + 5, w - 8, 5, 'rgba(30,22,16,.75)'); for (let j = 0; j < 6; j++) stroke(ctx, [-w / 2 + 4, -h / 2 + 16 + j * 5, w / 2 - 4 - hash(i, j) * 8, -h / 2 + 16 + j * 5], 0.7, 'rgba(40,30,22,.5)'); if (i % 5 === 2) poly(ctx, [w / 2, h / 2, w / 2 - 14, h / 2, w / 2, h / 2 - 16], t('#6a5a4e')); ctx.restore(); }
  // 궤짝 위에서 읽어 주는 사람
  rect(ctx, 284, 198, 46, 24, t('#5a4030')); stroke(ctx, [284, 210, 330, 210], 1, t('#3a2c20'));
  person(v, 306, 198, 88, folk(3, { f: 1, arm: 'up', cloak: true })); rect(ctx, 318, 100, 20, 26, t('#e0d8c0'));
  // 듣는 사람들: 옷차림이 섞였다
  person(v, 392, 226, 86, folk(0, { f: -1, hat: true })); person(v, 440, 228, 82, folk(1, { f: -1 })); person(v, 236, 226, 84, folk(4, { f: 1, arm: 'chest' })); person(v, 196, 228, 60, folk(2, { f: 1, child: true }));
  rect(ctx, 188, 196, 22, 14, t('#d8ceb4')); // 신문 든 아이
  person(v, 110, 232, 96, { f: 1, cloth: '#2a2c36', hair: '#1c1614', hat: true, stick: 'staff' }); // 지켜보는 순찰
  person(v, 560, 238, 106, mine(v, { f: -1 }));
  crowd(v, 250, 480, 252, 4, 90, {});
  finish(v);
}
/** 지하실 모임: 촛불 하나, 둘러앉은 얼굴들, 계단에서 망보는 사람 */
function newMeeting(v) {
  const { ctx } = v; room(v, { wall: '#26211e', floor: '#1a1614', fy: 170, stone: true });
  // 둥근 천장과 통, 계단
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(320, 190, 250, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  for (const [x, r] of [[60, 30], [124, 26], [90, 0]]) { oval(ctx, x, r ? 150 : 100, r || 26, (r || 26) * 1.05, '#33271e'); ring(ctx, x, r ? 150 : 100, (r || 26) * 0.7, 1.4, '#1c1612'); }
  for (let i = 0; i < 6; i++) rect(ctx, 520 + i * 18, 150 - i * 22, 140, 22, i % 2 ? '#2e2824' : '#342d28'); rect(ctx, 560, 0, 80, 44, '#0e1018');
  person(v, 560, 106, 70, folk(5, { raw: true, f: 1, hood: true, cloak: true }));
  // 탁자 뒤에 선 사람들
  person(v, 262, 190, 84, folk(1, { raw: true, f: 1, arm: 'chest', rim: WARM, rimDir: 1 }));
  person(v, 322, 184, 86, folk(3, { raw: true, f: 0, cloak: true }));
  person(v, 388, 190, 84, folk(4, { raw: true, f: -1, old: true, arm: 'fwd', rim: WARM, rimDir: -1 }));
  // 탁자와 종이, 촛불
  rect(ctx, 210, 168, 220, 9, '#3a2a1e'); rect(ctx, 222, 177, 9, 50, '#2a1e16'); rect(ctx, 408, 177, 9, 50, '#2a1e16');
  for (const [x, a] of [[270, -0.1], [350, 0.12], [306, 0.02]]) { ctx.save(); ctx.translate(x, 166); ctx.rotate(a); rect(ctx, -16, -3, 32, 5, '#8a7e68'); ctx.restore(); }
  candle(v, 322, 166, 12); glow(v, 322, 152, 96, '#ffb060', 0.3); pool(v, 322, 172, 130, 14, '#ffb060', 0.16);
  // 앞에 앉은 사람들
  person(v, 196, 222, 96, folk(0, { raw: true, f: 1, pose: 'sit', hood: true, rim: WARM, rimDir: 1 }));
  person(v, 452, 222, 96, mine(v, { raw: true, f: -1, pose: 'sit', rim: WARM, rimDir: -1 }));
  finish(v, { inside: true });
}
/** 떠나는 자식: 저녁 식탁의 늙은 부모, 보따리를 들고 문간에 선 자식. 문밖은 가로등 켜진 거리 */
function newQuarrel(v) {
  const { ctx } = v; room(v, { wall: '#3a3028', floor: '#2a221c', fy: 178, stone: false });
  // 열린 문과 바깥: 푸른 저녁, 가로등, 먼 굴뚝
  rect(ctx, 470, 36, 96, 142, '#2a3654'); rect(ctx, 470, 130, 96, 48, '#3a3e48'); rect(ctx, 484, 96, 26, 34, '#232a40'); rect(ctx, 520, 84, 40, 46, '#1e2438');
  rect(ctx, 540, 50, 7, 36, '#1a1e2e'); smoke(v, 543, 50, 26, 10, '#4a5068', 0.5); lampPost(v, 506, 172, 58, true);
  rect(ctx, 462, 28, 9, 150, '#2a1e16'); rect(ctx, 566, 28, 9, 150, '#2a1e16'); rect(ctx, 462, 28, 113, 9, '#2a1e16'); poly(ctx, [575, 34, 622, 22, 622, 196, 575, 178], '#4a3626');
  // 화덕과 선반
  rect(ctx, 40, 60, 100, 118, '#4a3e36'); ctx.fillStyle = '#140e0c'; ctx.beginPath(); ctx.moveTo(58, 178); ctx.lineTo(58, 126); ctx.quadraticCurveTo(90, 106, 122, 126); ctx.lineTo(122, 178); ctx.fill(); flame(v, 90, 172, 9); glow(v, 90, 150, 100, '#ff8a30', 0.3); pool(v, 110, 200, 130, 22, '#ff8a30', 0.2);
  rect(ctx, 170, 70, 120, 4, '#2a1e16'); for (let i = 0; i < 5; i++) oval(ctx, 184 + i * 24, 64, 7, 6, ['#8a6a4a', '#6a6e76', '#9a8a6a'][i % 3]);
  // 식탁: 세 사람 몫의 그릇, 하나는 손대지 않았다
  rect(ctx, 190, 172, 210, 9, '#4a3626'); rect(ctx, 202, 181, 9, 50, '#33251a'); rect(ctx, 380, 181, 9, 50, '#33251a');
  for (const x of [236, 300, 362]) { oval(ctx, x, 170, 12, 3.4, '#8a7a5a'); } candle(v, 330, 170, 9); glow(v, 330, 158, 60, '#ffb060', 0.34);
  // 앉은 아버지(등 돌린 채), 선 어머니, 문간의 자식
  person(v, 250, 230, 100, folk(5, { raw: true, f: -1, pose: 'sit', old: true, arm: 'fwd', female: false, long: false, rim: WARM, rimDir: 1 }));
  person(v, 160, 234, 100, folk(1, { raw: true, f: 1, old: true, female: true, long: false, hood: true, arm: 'chest', rim: WARM, rimDir: -1 }));
  person(v, 500, 234, 106, mine(v, { raw: true, f: -1, cloak: true, rim: COLD, rimDir: 1 })); oval(ctx, 524, 204, 12, 14, '#5a4a3a'); stroke(ctx, [520, 176, 524, 192], 1.4, '#3a2c20');
  finish(v, { inside: true });
}

export const PLATES13 = {
  /** 새 기술. variant: bench(공방의 시제품) lamp(첫 가로등) press(인쇄소) rail(쇠수레 길 놓기) */
  tech(v) { const k = v.variant ?? 'bench'; return ({ lamp: techLamp, press: techPress, rail: techRail }[k] ?? techBench)(v); },
  /** 도시의 삶. variant: mill(공장 안) tenement(셋방 골목) strike(닫힌 공장 문) idle(일을 잃은 마부) */
  city(v) { const k = v.variant ?? 'mill'; return ({ tenement: cityTenement, strike: cityStrike, idle: cityIdle }[k] ?? cityMill)(v); },
  /** 새 시대의 다툼. variant: breakers(기계를 부수는 밤) paper(벽보 앞의 사람들) meeting(지하실 모임) quarrel(떠나는 자식) */
  newage(v) { const k = v.variant ?? 'paper'; return ({ breakers: newBreakers, meeting: newMeeting, quarrel: newQuarrel }[k] ?? newPaper)(v); },
};
