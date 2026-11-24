// 41단계 삽화: 옥살이(지하 감옥, 면회 창살, 탈옥 밧줄, 출소 길), 별(천문대 지붕, 혜성 아래 군중, 일식, 별점 노점),
// 측량(측량대와 막대, 지도 공방, 경계석, 펼친 지도 앞 장군).
// 옛 판 prison(재판 뒤 한 장)과 겹치지 않게 옥살이 판 이름은 jail이다.
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, tree, banner, sunSign, finish } from './vignetteKit.js';
import { horseSil } from './vignettePlates4.js';
import { spear, torch } from './vignettePlates5.js';
import { table } from './vignettePlates18.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const ring = (ctx, x, y, rx, ry, w, c, rot = 0) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.stroke(); };
const WARM = 'rgba(255,190,110,.55)', COLD = 'rgba(190,210,240,.45)', FIRE = 'rgba(255,150,70,.6)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const inmate = (i, o = {}) => ({ cloth: ['#5a5448', '#504a40', '#625a4c'][i % 3], hair: HR[(i + 1) % 6], ...o });
const soldier = (o = {}) => ({ cloth: '#5a5e68', hair: '#1c1614', hat: true, ...o });
const scholar = (i, o = {}) => ({ cloth: ['#2f3a5a', '#3a3050', '#34404a'][i % 3], hair: HR[i % 6], robe: true, ...o });

/** 쇠창살 */
const bars = (ctx, x, y, w, h, gap = 12, c = '#15120f') => { for (let bx = x; bx <= x + w; bx += gap) rect(ctx, bx - 1.4, y, 2.8, h, c); rect(ctx, x - 2, y, w + 4, 3.4, c); rect(ctx, x - 2, y + h - 3.4, w + 4, 3.4, c); if (h > 60) rect(ctx, x - 2, y + h * 0.5, w + 4, 3, c); };
/** 짚 더미 */
const straw = (ctx, x, y, w, n, seed) => { for (let i = 0; i < n; i++) { const a = x + hash(i, seed) * w, b = y - hash(i, seed + 1) * 6; stroke(ctx, [a, b, a + (hash(i, seed + 2) - 0.5) * 16, b + 3], 0.8, i % 2 ? '#8a7a4a' : '#6a5c38'); } };
/** 밤하늘의 별: 밝기가 다른 점과 몇 줄의 별자리 */
function starfield(v, n, seed, lines = true) {
  const { ctx } = v;
  for (let i = 0; i < n; i++) { const x = hash(i, seed) * VW, y = hash(i, seed + 1) * 150, s = 0.5 + hash(i, seed + 2) * 1.3; oval(ctx, x, y, s, s, `rgba(236,240,255,${0.35 + hash(i, seed + 3) * 0.55})`); }
  if (lines) for (const c of [[80, 40, 112, 28, 150, 44, 170, 76, 132, 84], [470, 30, 504, 52, 540, 40, 566, 66], [300, 20, 322, 46, 290, 60]]) { stroke(ctx, c, 0.5, 'rgba(200,214,255,.28)'); for (let i = 0; i < c.length; i += 2) { oval(ctx, c[i], c[i + 1], 1.9, 1.9, 'rgba(244,246,255,.95)'); glow(v, c[i], c[i + 1], 6, '#c8d4ff', 0.2); } }
}
/** 혼천의: 겹친 고리와 받침 */
function armillary(v, x, y, r) {
  const { ctx } = v, c = '#9a8450';
  rect(ctx, x - 2, y, 4, r * 0.9, '#5a4a30'); poly(ctx, [x - r * 0.5, y + r * 0.9, x + r * 0.5, y + r * 0.9, x + r * 0.3, y + r * 0.7, x - r * 0.3, y + r * 0.7], '#5a4a30');
  ring(ctx, x, y - r * 0.2, r, r, 2, c); ring(ctx, x, y - r * 0.2, r, r * 0.34, 1.6, c, 0.4); ring(ctx, x, y - r * 0.2, r * 0.34, r, 1.6, c, 0.2); ring(ctx, x, y - r * 0.2, r * 0.8, r * 0.5, 1.2, dark(c, 0.2), -0.6);
  oval(ctx, x, y - r * 0.2, r * 0.14, r * 0.14, '#c8a850'); stroke(ctx, [x - r * 1.1, y - r * 0.2 + r * 0.5, x + r * 1.1, y - r * 0.2 - r * 0.5], 1.2, c);
}
/** 세 발 받침 위의 측량 기구 */
function tripod(v, x, y, h) {
  const { ctx, t } = v, c = t('#3a2c20');
  stroke(ctx, [x, y - h, x - h * 0.3, y], 2, c); stroke(ctx, [x, y - h, x + h * 0.3, y], 2, c); stroke(ctx, [x, y - h, x + h * 0.04, y + 2], 2, c);
  rect(ctx, x - h * 0.2, y - h - 4, h * 0.4, 4, t('#9a8450')); ring(ctx, x, y - h - 12, h * 0.1, h * 0.1, 1.6, t('#9a8450')); rect(ctx, x - h * 0.22, y - h - 13, h * 0.44, 2, t('#6a5a34')); stroke(ctx, [x, y - h - 2, x, y - h * 0.5], 0.6, t('#c8b890')); poly(ctx, [x - 2, y - h * 0.5, x + 2, y - h * 0.5, x, y - h * 0.42], t('#8a8e96'));
}
/** 줄무늬 측량 막대 */
const rod = (v, x, y, h) => { const { ctx, t } = v; for (let i = 0; i < 6; i++) rect(ctx, x - 1.4, y - h + (h / 6) * i, 2.8, h / 6, t(i % 2 ? '#d8d0bc' : '#a03a2a')); poly(ctx, [x + 1.4, y - h, x + 14, y - h + 4, x + 1.4, y - h + 9], t('#a03a2a')); };
/** 벽에 건 지도 한 장 */
function wallMap(ctx, x, y, w, h, seed) {
  rect(ctx, x, y, w, h, '#cfc2a0'); rect(ctx, x - 2, y - 2, w + 4, 3, '#4a3626'); rect(ctx, x - 2, y + h - 1, w + 4, 3, '#4a3626');
  ctx.strokeStyle = '#6a5a40'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + 4, y + h * (0.3 + hash(seed, 1) * 0.3)); for (let i = 1; i <= 6; i++) ctx.lineTo(x + 4 + (w - 8) * (i / 6), y + h * (0.2 + hash(seed + i, 2) * 0.6)); ctx.stroke();
  ctx.strokeStyle = '#4a6a8a'; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + 3); ctx.quadraticCurveTo(x + w * (0.3 + hash(seed, 3) * 0.4), y + h * 0.5, x + w * 0.7, y + h - 3); ctx.stroke();
  for (let i = 0; i < 4; i++) poly(ctx, [x + 8 + hash(seed + i, 4) * (w - 20), y + 8 + hash(seed + i, 5) * (h - 16), x + 12 + hash(seed + i, 4) * (w - 20), y + 2 + hash(seed + i, 5) * (h - 16), x + 16 + hash(seed + i, 4) * (w - 20), y + 8 + hash(seed + i, 5) * (h - 16)], '#7a6a4a');
  ring(ctx, x + w - 10, y + h - 10, 5, 5, 0.8, '#8a2f2a');
}
/** 탁자에 펼친 큰 지도 (옆에서 본 얇은 판)와 그 위의 표식 */
function mapOnTable(ctx, x0, x1, y) { poly(ctx, [x0, y, x1, y, x1 + 8, y - 6, x0 + 8, y - 6], '#d8cba8'); stroke(ctx, [x0 + 14, y - 3, x0 + (x1 - x0) * 0.4, y - 4, x1 - 20, y - 2], 0.7, '#6a5a40'); stroke(ctx, [x0 + 30, y - 5, x0 + (x1 - x0) * 0.6, y - 1], 0.7, '#4a6a8a'); }

/* ---------- 옥살이 ---------- */
/** 지하 감옥: 높은 쇠살 창에서 떨어지는 한 줄기 빛, 벽에 매인 사람들과 짚, 살문 밖 옥졸의 횃불 */
function jailCell(v) {
  const { ctx } = v; room(v, { wall: '#3e3c3a', floor: '#262422', fy: 178 });
  // 둥근 천장의 그늘과 벽의 물 자국
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(VW, 0); ctx.lineTo(VW, 30); ctx.quadraticCurveTo(320, 70, 0, 30); ctx.fill();
  for (let i = 0; i < 6; i++) stroke(ctx, [90 + i * 96, 40 + hash(i, 2) * 20, 92 + i * 96, 120 + hash(i, 3) * 40], 3, 'rgba(20,30,28,.25)');
  // 높은 창과 빛줄기
  rect(ctx, 384, 26, 44, 34, '#b8c0c8'); bars(ctx, 386, 26, 40, 34, 10); shaft(v, 406, 60, 44, 150, -90, '#c8d0dc', 0.14); pool(v, 320, 214, 70, 12, '#c8d0dc', 0.1);
  // 벽에 긁은 날짜 금
  for (let i = 0; i < 17; i++) { stroke(ctx, [470 + i * 5 + Math.floor(i / 5) * 6, 110, 470 + i * 5 + Math.floor(i / 5) * 6, 122], 0.8, 'rgba(200,200,190,.4)'); if (i % 5 === 4) stroke(ctx, [448 + i * 5 + Math.floor(i / 5) * 6, 120, 472 + i * 5 + Math.floor(i / 5) * 6, 112], 0.8, 'rgba(200,200,190,.4)'); }
  // 살문과 문밖 옥졸: 횃불과 열쇠 꾸러미
  rect(ctx, 20, 50, 110, 132, '#0e0c0b'); glow(v, 60, 110, 80, '#ff9a48', 0.18);
  person(v, 76, 182, 104, { raw: true, f: 1, cloth: '#3a342e', hair: '#1c1614', hat: true, noShadow: true, rim: FIRE, rimDir: -1 }); flame(v, 44, 96, 7); stroke(ctx, [44, 100, 46, 130], 2, '#2a2018'); ring(ctx, 92, 136, 4, 4, 1, '#9a8450'); stroke(ctx, [92, 140, 90, 148], 1, '#9a8450'); stroke(ctx, [94, 140, 96, 147], 1, '#9a8450');
  bars(ctx, 20, 50, 110, 132, 13); rect(ctx, 12, 44, 8, 142, '#2a2826'); rect(ctx, 130, 44, 8, 142, '#2a2826'); poly(ctx, [130, 182, 138, 182, 240, 240, 180, 240], 'rgba(255,150,70,.07)');
  // 벽의 고리와 사슬에 매인 사람들
  for (const [x, h, i] of [[210, 76, 0], [520, 80, 1], [590, 74, 2]]) { ring(ctx, x, 120, 4, 4, 1.4, '#5a5e66'); ctx.setLineDash([2, 2]); stroke(ctx, [x, 124, x + (i ? -8 : 8), 196], 1.2, '#5a5e66'); ctx.setLineDash([]); person(v, x + (i ? -12 : 12), 220 + i * 4, h, inmate(i, { raw: true, f: i ? -1 : 1, pose: 'huddle', old: i === 2, hair: i === 2 ? '#a8a49c' : undefined })); }
  straw(ctx, 180, 228, 110, 26, 5); straw(ctx, 470, 232, 160, 34, 9);
  // 빛 속에 앉은 나, 물그릇과 빵 조각
  person(v, 330, 232, 96, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'chest', cloth: '#5e584c', rim: COLD, rimDir: 1 })); oval(ctx, 392, 226, 9, 3, '#4a443c'); oval(ctx, 392, 225, 7, 1.6, '#6a7078'); oval(ctx, 414, 228, 6, 3, '#8a7a5a');
  // 쥐
  oval(ctx, 262, 236, 5, 2.6, '#2a2624'); stroke(ctx, [257, 236, 248, 238], 0.7, '#2a2624');
  finish(v, { inside: true });
}
/** 면회: 두꺼운 벽 가운데 창살을 사이에 둔 두 사람. 이쪽은 등불과 바구니, 저쪽은 그늘 */
function jailVisit(v) {
  const { ctx } = v; room(v, { wall: '#4a4744', floor: '#2e2b28', fy: 180 });
  // 저쪽(오른쪽)은 어둡다
  rect(ctx, 330, 0, 310, VH, 'rgba(8,8,12,.5)'); rect(ctx, 560, 30, 36, 28, '#8a929c'); bars(ctx, 562, 30, 32, 28, 9); shaft(v, 578, 58, 36, 120, -70, '#b8c4d4', 0.1);
  // 갇힌 나: 창살을 쥐었다
  person(v, 372, 234, 112, mine(v, { raw: true, f: -1, arm: 'fwd', cloth: '#5a5448', rim: WARM, rimDir: -1 }));
  for (let i = 0; i < 3; i++) person(v, 500 + i * 46, 232 + (i % 2) * 4, 90 + i * 4, inmate(i, { raw: true, f: -1, pose: i === 1 ? 'huddle' : 'stand', noShadow: true }));
  // 가운데 벽과 창살 뚫린 창
  rect(ctx, 296, 0, 40, 76, '#3a3835'); rect(ctx, 296, 172, 40, 68, '#3a3835'); rect(ctx, 290, 168, 52, 6, '#55524e'); rect(ctx, 290, 72, 52, 6, '#55524e'); bars(ctx, 300, 78, 32, 90, 8);
  rect(ctx, 296, 0, 6, 76, 'rgba(255,200,130,.12)'); rect(ctx, 296, 172, 6, 68, 'rgba(255,200,130,.12)');
  // 이쪽: 찾아온 식구와 아이, 바구니, 벽의 등불
  rect(ctx, 150, 84, 4, 12, '#2a2018'); candle(v, 152, 84, 9); glow(v, 152, 74, 70, '#ffcf80', 0.2); pool(v, 220, 230, 110, 10, '#ffcf80', 0.1);
  person(v, 262, 234, 106, { raw: true, f: 1, cloth: v.other.cloth, hair: v.other.hair, female: !v.me.female, long: !v.me.female, arm: 'fwd', veil: !v.me.female, rim: WARM, rimDir: 1 });
  person(v, 214, 236, 58, folk(2, { raw: true, f: 1, child: true, arm: 'fwd' })); poly(ctx, [176, 226, 204, 226, 200, 240, 180, 240], '#7a5c38'); oval(ctx, 190, 224, 12, 4, '#d8ceb8');
  // 지켜보는 옥졸: 모래시계
  person(v, 84, 236, 110, { raw: true, f: 1, cloth: '#3a342e', hair: '#1c1614', hat: true, stick: 'staff' }); table(ctx, 20, 60, 200, '#3a2c20', 5, 38); poly(ctx, [34, 180, 46, 180, 40, 188, 46, 195, 34, 195, 40, 188], '#c8b890');
  finish(v, { inside: true });
}
/** 탈옥: 달밤의 탑 벽을 타고 내려오는 밧줄과 사람, 아래에서 말을 잡고 기다리는 그림자, 흉벽의 횃불 */
function jailRope(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 120, 160, {});
  ground(v, (x) => Math.max(fn(x), 160) + 26, { color: '#3e463e', color2: '#24282a', tufts: 30 });
  // 해자와 탑
  poly(ctx, [300, 212, 640, 204, 640, 240, 260, 240], t('#1e2630')); for (let i = 0; i < 6; i++) stroke(ctx, [330 + i * 50, 218 + (i % 2) * 8, 356 + i * 50, 218 + (i % 2) * 8], 0.8, 'rgba(200,214,240,.2)');
  rect(ctx, 380, 0, 190, 212, t('#5a5a60')); for (let r = 0; r < 10; r++) for (let i = 0; i < 5; i++) rect(ctx, 386 + i * 38 + (r % 2) * 18, 14 + r * 20, 26, 1.4, 'rgba(0,0,0,.2)'); rect(ctx, 380, 0, 22, 212, 'rgba(200,214,240,.08)');
  rect(ctx, 570, 40, 70, 172, t('#4e4e54')); for (let i = 0; i < 3; i++) rect(ctx, 574 + i * 24, 30, 14, 12, t('#4e4e54'));
  // 살을 뜯어낸 창과 매듭 지은 밧줄
  rect(ctx, 432, 34, 28, 34, '#0e0c0b'); for (const x of [436, 456]) rect(ctx, x, 34, 2.4, 34, '#15120f'); stroke(ctx, [446, 34, 450, 50], 2.4, '#15120f');
  ctx.strokeStyle = '#b8ae94'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(444, 66); ctx.quadraticCurveTo(438, 120, 442, 196); ctx.stroke(); for (let i = 0; i < 7; i++) oval(ctx, 441 + Math.sin(i) * 2, 82 + i * 17, 2.6, 2, '#d8ceb8');
  // 내려오는 나: 벽에 발을 디뎠다
  person(v, 452, 150, 62, mine(v, { raw: true, f: -1, arm: 'up', cloth: '#6a6456', noShadow: true, rim: COLD, rimDir: -1 }));
  // 흉벽 위: 등을 돌린 보초와 횃불
  person(v, 606, 42, 44, soldier({ f: 1, noShadow: true })); torch(v, 626, 30, 22, 5); glow(v, 626, 8, 40, '#ff9a40', 0.18);
  // 아래: 말을 잡고 기다리는 사람, 해자의 작은 배
  horseSil(v, 170, 234, 80, 1, '#1e1814', {}); person(v, 232, 236, 100, { f: 1, cloth: '#24222a', hair: '#1c1614', cloak: true, hood: true, rim: COLD, rimDir: 1 });
  poly(ctx, [330, 222, 400, 222, 392, 232, 338, 232], t('#2a2018')); person(v, 364, 226, 44, { f: 1, cloth: '#24222a', hair: '#1c1614', hood: true, pose: 'sit', noShadow: true });
  tree(v, 60, 226, 150, { dark: true });
  finish(v, { noLeaves: true });
}
/** 출소: 새벽에 열린 쇠문 밖으로 나서는 사람. 눈부신 빛, 멀리 길가에서 기다리는 한 사람 */
function jailRelease(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 470, 158, {});
  ground(v, (x) => Math.max(fn(x), 150) + 24, { color: '#6e6e54', color2: '#48483a', tufts: 50 });
  // 감옥 담과 문
  rect(ctx, 0, 30, 250, 180, t('#5e5c58')); for (let r = 0; r < 8; r++) for (let i = 0; i < 6; i++) rect(ctx, 6 + i * 42 + (r % 2) * 20, 46 + r * 20, 30, 1.4, 'rgba(0,0,0,.2)'); for (let i = 0; i < 9; i++) rect(ctx, i * 28, 20, 16, 12, t('#5e5c58'));
  for (let i = 0; i < 12; i++) poly(ctx, [6 + i * 21, 20, 10 + i * 21, 8, 14 + i * 21, 20], t('#2a2a30'));
  ctx.fillStyle = t('#141210'); ctx.beginPath(); ctx.moveTo(120, 210); ctx.lineTo(120, 120); ctx.arc(160, 120, 40, Math.PI, 0); ctx.lineTo(200, 210); ctx.fill(); poly(ctx, [200, 96, 232, 108, 232, 216, 200, 210], t('#33261a')); for (const y of [126, 166, 200]) rect(ctx, 202, y, 28, 3, t('#17130f'));
  rect(ctx, 56, 96, 26, 22, t('#141210')); bars(ctx, 58, 96, 22, 22, 6, t('#15120f'));
  // 문을 닫으려는 옥졸
  person(v, 176, 212, 96, { f: 1, cloth: '#3a342e', hair: '#1c1614', hat: true, noShadow: true });
  // 길
  ctx.fillStyle = rgba(t('#9a8a66'), 0.8); ctx.beginPath(); ctx.moveTo(120, 240); ctx.quadraticCurveTo(170, 216, 200, 210); ctx.quadraticCurveTo(400, 196, 640, 178); ctx.lineTo(640, 196); ctx.quadraticCurveTo(400, 214, 280, 240); ctx.fill();
  // 나서는 나: 작은 보따리, 손으로 빛을 가린다
  person(v, 300, 236, 110, mine(v, { f: 1, arm: 'out', cloth: '#5a5448', rim: WARM, rimDir: -1 })); oval(ctx, 286, 196, 10, 8, t('#6a5a44'));
  // 멀리 나무 아래에서 기다리는 사람
  tree(v, 560, 196, 110, {}); person(v, 532, 198, 50, { f: -1, cloth: '#2e2a30', hair: '#2a1e16', cloak: true, hood: true });
  // 길가의 이정표
  rect(ctx, 430, 180, 3, 30, t('#3a2c20')); poly(ctx, [433, 182, 462, 184, 468, 189, 462, 194, 433, 192], t('#5a4a36'));
  finish(v);
}

/* ---------- 별 ---------- */
/** 천문대 지붕: 별 가득한 밤, 혼천의와 사분의, 하늘을 가리키는 학자와 받아 적는 제자 */
function starsRoof(v) {
  const { ctx, t } = v; sky(v); starfield(v, 140, 51); far(v, {}); townFar(v, 150, 176, {});
  for (let i = 0; i < 14; i++) { const x = 20 + hash(i, 61) * 600, y = 176 + hash(i, 62) * 14; rect(ctx, x, y, 2, 2, '#e0a050'); }
  // 지붕 바닥과 낮은 흉벽
  rect(ctx, 0, 196, VW, 44, t('#3e3e46')); for (let i = 0; i < 12; i++) stroke(ctx, [i * 60 - 10, 240, i * 60 + 14, 196], 0.7, 'rgba(0,0,0,.25)');
  rect(ctx, 0, 176, VW, 22, t('#4a4a52')); for (let i = 0; i < 11; i++) rect(ctx, i * 62, 164, 34, 14, t('#4a4a52'));
  // 둥근 지붕의 작은 탑 (왼쪽)
  rect(ctx, 30, 96, 90, 100, t('#54545c')); ctx.fillStyle = t('#3a4450'); ctx.beginPath(); ctx.arc(75, 96, 48, Math.PI, 0); ctx.fill(); poly(ctx, [70, 50, 82, 50, 86, 96, 66, 96], '#0e0e14'); rect(ctx, 60, 140, 26, 56, '#c88a40'); rect(ctx, 60, 140, 26, 20, 'rgba(60,30,10,.4)'); glow(v, 73, 168, 30, '#ffb060', 0.14);
  // 혼천의와 사분의
  armillary(v, 330, 170, 34);
  ctx.fillStyle = t('#5a4a30'); ctx.beginPath(); ctx.moveTo(520, 198); ctx.lineTo(520, 130); ctx.arc(520, 198, 68, -Math.PI / 2, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#9a8450'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(520, 198, 66, -Math.PI / 2, 0); ctx.stroke(); for (let i = 0; i <= 9; i++) { const a = -Math.PI / 2 + (i / 9) * (Math.PI / 2); stroke(ctx, [520 + Math.cos(a) * 58, 198 + Math.sin(a) * 58, 520 + Math.cos(a) * 66, 198 + Math.sin(a) * 66], 0.8, '#c8b890'); } stroke(ctx, [520, 198, 566, 150], 1.4, '#c8b890');
  // 학자: 하늘을 가리킨다
  person(v, 420, 236, 108, scholar(0, { f: -1, arm: 'out', old: true, hair: '#b8b4ac', hat: true, rim: COLD, rimDir: -1 })); stroke(ctx, [392, 168, 360, 120], 1.2, t('#c8b890'));
  // 제자(나): 가린 등불 곁에서 받아 적는다
  person(v, 232, 238, 100, mine(v, { f: 1, pose: 'sit', arm: 'fwd', rim: WARM, rimDir: 1 })); poly(ctx, [250, 200, 276, 196, 278, 206, 252, 210], '#d8ceb0'); rect(ctx, 196, 222, 9, 12, '#c88a40'); rect(ctx, 194, 220, 13, 3, t('#2a2018')); glow(v, 200, 228, 30, '#ffb060', 0.16);
  // 긴 대롱(보는 관)을 든 다른 제자
  person(v, 590, 238, 96, scholar(1, { f: -1, arm: 'fwd' })); stroke(ctx, [574, 186, 540, 150], 3, t('#6a5a34'));
  finish(v, { noLeaves: true });
}
/** 혜성 아래 군중: 밤하늘을 가로지르는 긴 꼬리, 광장에 몰려 올려다보는 사람들과 계단 위의 사제 */
function starsComet(v) {
  const { ctx, t } = v; sky(v); starfield(v, 90, 71, false);
  // 혜성: 머리와 갈라진 꼬리
  const cx = 470, cy = 40; const g = ctx.createLinearGradient(cx, cy, cx - 300, cy - 34); g.addColorStop(0, 'rgba(236,244,255,.75)'); g.addColorStop(0.3, 'rgba(200,220,255,.3)'); g.addColorStop(1, 'rgba(200,220,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.quadraticCurveTo(cx - 150, cy - 26, cx - 320, cy - 40); ctx.lineTo(cx - 314, cy - 22); ctx.quadraticCurveTo(cx - 150, cy - 6, cx, cy + 4); ctx.fill();
  const g2 = ctx.createLinearGradient(cx, cy, cx - 220, cy + 30); g2.addColorStop(0, 'rgba(255,236,200,.45)'); g2.addColorStop(1, 'rgba(255,236,200,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(cx, cy - 2); ctx.quadraticCurveTo(cx - 120, cy + 2, cx - 240, cy + 14); ctx.lineTo(cx - 236, cy + 4); ctx.quadraticCurveTo(cx - 110, cy - 4, cx, cy + 3); ctx.fill();
  oval(ctx, cx, cy, 5, 5, '#f4f8ff'); glow(v, cx, cy, 34, '#dce8ff', 0.3);
  // 광장의 집들과 예배당
  for (let i = 0; i < 8; i++) { const x = i * 84 - 20, h = 60 + hash(i, 74) * 36; rect(ctx, x, 176 - h, 80, h, t(i % 2 ? '#3e3e48' : '#46444c')); poly(ctx, [x - 4, 176 - h, x + 40, 176 - h - 26, x + 84, 176 - h], t('#26242c')); if (hash(i, 75) < 0.6) rect(ctx, x + 16 + (i % 2) * 34, 176 - h + 20, 10, 14, '#c88a40'); }
  rect(ctx, 500, 60, 90, 120, t('#4e4c56')); poly(ctx, [494, 60, 545, 10, 596, 60], t('#2a2830')); sunSign(v, 545, 86, 9, t('#9a8450')); rect(ctx, 528, 126, 34, 54, '#c88a40'); rect(ctx, 528, 126, 34, 20, 'rgba(60,30,10,.4)');
  ground(v, () => 176, { color: '#3e3e44', color2: '#26262c', tufts: 0, plain: true });
  rect(ctx, 480, 176, 130, 8, t('#5a5860')); rect(ctx, 468, 184, 154, 8, t('#4e4c54'));
  // 계단 위의 사제: 두 팔을 들었다
  person(v, 545, 180, 78, { f: -1, cloth: '#d8d0c0', hair: '#8a8478', robe: true, arm: 'up', rim: COLD, rimDir: -1 });
  // 군중 (등과 옆): 가리키는 손, 무릎 꿇은 사람, 아이를 안은 사람
  for (let i = 0; i < 12; i++) { const x = 24 + i * 38 + hash(i, 77) * 12; person(v, x, 212 + (i % 3) * 4, 64 + (i % 2) * 6, folk(i, { f: 1, arm: i % 5 === 1 ? 'out' : undefined, hood: i % 4 === 0, cloak: i % 3 === 0, noShadow: true, rim: COLD, rimDir: 1 })); }
  person(v, 150, 240, 100, folk(1, { f: 1, pose: 'kneel', arm: 'chest', veil: true, rim: COLD, rimDir: 1 })); person(v, 232, 240, 112, mine(v, { f: 1, cloak: true, rim: COLD, rimDir: 1 })); person(v, 284, 240, 62, folk(2, { f: 1, child: true, arm: 'out' }));
  person(v, 380, 240, 108, folk(5, { f: 1, old: true, hair: '#b8b4ac', stick: 'staff' })); person(v, 60, 240, 106, scholar(2, { f: 1, arm: 'fwd' })); poly(ctx, [82, 180, 100, 178, 102, 196, 84, 198], '#d8ceb0');
  finish(v, { noLeaves: true });
}
/** 일식: 한낮에 어두워진 들. 검은 해와 빛의 테, 일손을 멈춘 사람들과 불안한 짐승 */
function starsEclipse(v) {
  const { ctx, t } = v; sky(v); rect(ctx, 0, 0, VW, VH, 'rgba(14,16,40,.5)');
  // 검은 해와 테
  const sx = 330, sy = 58; glow(v, sx, sy, 90, '#ffe8c0', 0.22); glow(v, sx, sy, 44, '#fff4dc', 0.3); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; stroke(ctx, [sx + Math.cos(a) * 24, sy + Math.sin(a) * 24, sx + Math.cos(a) * (36 + hash(i, 81) * 18), sy + Math.sin(a) * (36 + hash(i, 81) * 18)], 1, 'rgba(255,240,210,.35)'); }
  oval(ctx, sx, sy, 22, 22, '#0a0a14'); ring(ctx, sx, sy, 22.6, 22.6, 1.6, 'rgba(255,244,220,.9)'); oval(ctx, sx + 17, sy - 14, 2.4, 2.4, '#fffaf0');
  for (let i = 0; i < 26; i++) oval(ctx, hash(i, 82) * VW, hash(i, 83) * 120, 0.9, 0.9, 'rgba(236,240,255,.6)');
  const fn = far(v, {}); townFar(v, 520, 158, {});
  ground(v, (x) => Math.max(fn(x), 150) + 20, { color: '#5a5a3a', color2: '#34361e', tufts: 40 });
  // 밀밭과 세워 둔 낟가리
  poly(ctx, [0, 180, 640, 172, 640, 206, 0, 216], t('#7a6a34')); for (let i = 0; i < 60; i++) stroke(ctx, [hash(i, 84) * VW, 208, hash(i, 84) * VW + 2, 196 - hash(i, 85) * 8], 0.8, t('#9a8a44'));
  for (const x of [90, 470, 590]) { poly(ctx, [x - 16, 204, x, 168, x + 16, 204], t('#8a7a3a')); stroke(ctx, [x - 8, 186, x + 8, 186], 1, t('#5a4a24')); }
  rect(ctx, 0, 110, VW, VH - 110, 'rgba(14,16,40,.45)');
  // 일손을 멈춘 사람들: 낫을 든 채 올려다본다, 무릎 꿇은 이, 얼굴을 가린 아이
  person(v, 180, 236, 104, folk(0, { f: 1, hat: true, arm: 'out', rim: 'rgba(255,240,210,.4)', rimDir: 1 })); ctx.strokeStyle = t('#8a8e96'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(154, 190, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  person(v, 244, 238, 100, folk(1, { f: 1, pose: 'kneel', arm: 'chest', veil: true })); person(v, 296, 238, 58, folk(2, { f: -1, child: true, pose: 'huddle' }));
  // 그을린 유리로 보는 학자(나)
  person(v, 400, 238, 110, mine(v, { f: -1, arm: 'out', cloak: true, rim: 'rgba(255,240,210,.45)', rimDir: -1 })); rect(ctx, 370, 150, 12, 9, 'rgba(30,24,20,.85)'); ring(ctx, 376, 154.5, 6, 4.5, 0.8, t('#6a5a34'));
  // 날뛰는 말과 날아오르는 새 떼
  horseSil(v, 540, 232, 76, -1, '#2a2018', {}); person(v, 500, 236, 96, folk(4, { f: 1, arm: 'fwd' }));
  ctx.strokeStyle = '#0c0c12'; ctx.lineWidth = 1.1; for (let i = 0; i < 16; i++) { const x = 60 + hash(i, 86) * 200, y = 90 + hash(i, 87) * 50, s = 3 + hash(i, 88) * 3; ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.4); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y - s * 0.4); ctx.stroke(); }
  finish(v, { noLeaves: true });
}
/** 별점 노점: 저녁 장터의 별 그린 차양 아래, 둥근 별판을 놓고 손님의 손을 보는 점성술사와 기다리는 줄 */
function starsStall(v) {
  const { ctx, t } = v; sky(v);
  for (let i = 0; i < 8; i++) { const x = i * 84 - 20, h = 80 + hash(i, 91) * 40; rect(ctx, x, 176 - h, 80, h, t(i % 2 ? '#5e564c' : '#685e50')); poly(ctx, [x - 4, 176 - h, x + 40, 176 - h - 26, x + 84, 176 - h], t('#3a2e28')); rect(ctx, x + 16, 176 - h + 22, 12, 16, hash(i, 92) < 0.5 ? '#c88a40' : t('#2a2224')); }
  ground(v, () => 176, { color: '#6e6658', color2: '#48443c', tufts: 0, plain: true });
  // 다른 좌판들 (뒤)
  for (const [x, c] of [[80, '#6a3a3a'], [560, '#3a5a4a']]) { rect(ctx, x - 40, 150, 4, 46, t('#3a2c20')); rect(ctx, x + 36, 150, 4, 46, t('#3a2c20')); poly(ctx, [x - 48, 150, x + 48, 150, x + 40, 132, x - 40, 132], t(c)); rect(ctx, x - 40, 180, 80, 16, t('#4a3a2a')); for (let i = 0; i < 4; i++) oval(ctx, x - 26 + i * 17, 178, 6, 4, t(['#a86a3a', '#8a7a3a', '#6a8a4a', '#a84a3a'][i])); }
  for (let i = 0; i < 5; i++) person(v, 30 + i * 30 + (i > 2 ? 440 : 0), 200, 56, folk(i + 2, { f: i % 2 ? 1 : -1, noShadow: true }));
  // 별 그린 차양과 매단 별 장식
  rect(ctx, 232, 86, 5, 148, t('#2a2018')); rect(ctx, 444, 86, 5, 148, t('#2a2018'));
  poly(ctx, [214, 90, 468, 90, 452, 56, 230, 56], '#232a52'); poly(ctx, [214, 90, 468, 90, 468, 102, 448, 96, 426, 104, 404, 96, 382, 104, 360, 96, 338, 104, 316, 96, 294, 104, 272, 96, 250, 104, 232, 96, 214, 102], '#1c2244');
  for (let i = 0; i < 16; i++) oval(ctx, 240 + hash(i, 93) * 210, 60 + hash(i, 94) * 26, 1.3, 1.3, '#e8d890'); ctx.strokeStyle = '#e8d890'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(340, 74, 9, Math.PI * 0.4, Math.PI * 1.6); ctx.stroke();
  for (const [x, l] of [[262, 26], [300, 16], [384, 22], [420, 14]]) { stroke(ctx, [x, 100, x, 100 + l], 0.6, '#8a7440'); poly(ctx, [x, 100 + l, x + 4, 106 + l, x, 112 + l, x - 4, 106 + l], '#d8b04a'); }
  rect(ctx, 400, 132, 3, 20, '#8a7440'); candle(v, 401, 132, 9); glow(v, 401, 120, 60, '#ffcf80', 0.2);
  // 점성술사: 탁자 뒤에 앉아 손님의 손을 본다
  person(v, 386, 216, 108, { raw: true, f: -1, cloth: '#3a3050', hair: '#1c1614', female: true, long: true, veil: true, pose: 'sit', arm: 'fwd', noShadow: true, rim: WARM, rimDir: 1 });
  rect(ctx, 270, 178, 150, 50, '#33264a'); rect(ctx, 264, 172, 162, 8, '#4a3626'); for (let i = 0; i < 7; i++) oval(ctx, 282 + i * 22, 200 + (i % 2) * 10, 1.4, 1.4, '#c8a850');
  ring(ctx, 346, 170, 22, 5, 1.4, '#c8a850'); oval(ctx, 346, 170, 20, 4, '#1c2244'); for (let i = 0; i < 6; i++) oval(ctx, 332 + i * 6, 169 + (i % 2) * 2, 0.8, 0.8, '#f0e8c0'); rect(ctx, 290, 164, 16, 3, '#d8ceb0'); oval(ctx, 314, 168, 3, 2, '#c8a850');
  // 손님(나): 손을 내밀었다
  person(v, 262, 236, 108, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: -1 }));
  // 기다리는 줄: 수군대는 두 사람과 돈주머니를 쥔 노인
  person(v, 190, 238, 102, folk(1, { f: 1, veil: true, arm: 'chest' })); person(v, 146, 238, 100, folk(4, { f: 1 })); person(v, 500, 238, 104, folk(5, { f: -1, old: true, hair: '#b8b4ac', stick: 'staff' }));
  // 좌판 곁의 간판: 해와 달
  rect(ctx, 480, 150, 3, 60, t('#3a2c20')); rect(ctx, 468, 130, 28, 24, '#232a52'); oval(ctx, 476, 142, 4, 4, '#e8d890'); ctx.strokeStyle = '#d8d8e8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(488, 142, 4, Math.PI * 0.4, Math.PI * 1.6); ctx.stroke();
  finish(v, { noLeaves: true });
}

/* ---------- 측량 ---------- */
/** 측량: 언덕 위의 세 발 기구와 들여다보는 측량사, 멀리 줄무늬 막대를 든 조수, 풀밭에 끄는 쇠사슬 */
function svField(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); townFar(v, 500, 150, {});
  // 굽이치는 강과 들
  const g = (x) => Math.max(fn(x), 140) + 34 - Math.sin(x / 100) * 10; ground(v, g, { color: '#72784e', color2: '#4a5038', tufts: 70 });
  ctx.strokeStyle = rgba(t('#8aa0b8'), 0.8); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(640, 166); ctx.quadraticCurveTo(520, 172, 470, 186); ctx.quadraticCurveTo(400, 204, 440, 240); ctx.stroke();
  // 멀리 막대를 든 조수 둘과 깃발 말뚝
  rod(v, 420, g(420) + 8, 40); person(v, 408, g(420) + 10, 34, folk(2, { f: -1, noShadow: true })); rod(v, 560, g(560) + 4, 26); person(v, 552, g(560) + 5, 22, folk(3, { f: -1, noShadow: true }));
  for (const x of [330, 370, 480]) { rect(ctx, x, g(x) - 6, 1.6, 16, t('#3a2c20')); poly(ctx, [x + 1.6, g(x) - 6, x + 9, g(x) - 3, x + 1.6, g(x)], t('#d8d0bc')); }
  // 풀밭에 끄는 사슬과 그 끝을 쥔 조수
  ctx.setLineDash([3, 2]); stroke(ctx, [130, 232, 220, 226, 300, 214, 404, g(404) + 10], 1.4, t('#6a6e76')); ctx.setLineDash([]);
  person(v, 110, 236, 92, folk(4, { f: 1, pose: 'kneel', arm: 'fwd' }));
  // 세 발 기구와 들여다보는 측량사(나)
  tripod(v, 250, 226, 62); person(v, 214, 236, 108, mine(v, { f: 1, pose: 'bow', arm: 'fwd', hat: true, rim: WARM, rimDir: -1 }));
  // 받아 적는 도제와 펼친 판
  person(v, 316, 238, 96, folk(1, { f: -1, arm: 'fwd', female: false, long: false })); poly(ctx, [282, 182, 306, 180, 308, 196, 284, 198], '#d8ceb0'); stroke(ctx, [286, 186, 302, 185], 0.6, '#4a4034'); stroke(ctx, [286, 190, 300, 189], 0.6, '#4a4034');
  // 짐 실은 나귀와 지켜보는 땅 주인
  horseSil(v, 560, 234, 60, -1, '#6a5a48', {}); rect(ctx, 546, 190, 26, 14, t('#5a4636')); stroke(ctx, [552, 190, 548, 172], 1.4, t('#3a2c20')); stroke(ctx, [562, 190, 566, 170], 1.4, t('#3a2c20'));
  person(v, 494, 236, 102, { f: -1, cloth: '#5a2630', hair: '#3a2a1e', cloak: true, hat: true, arm: 'chest' });
  tree(v, 40, 214, 140, {});
  finish(v);
}
/** 지도 공방: 벽 가득한 지도와 두루마리, 큰 탁자에서 먹선을 긋는 장인, 물감을 가는 도제 */
function svShop(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#4a3e30', floor: '#30261c', fy: 178 }); rect(ctx, 0, 0, VW, 12, '#1e160f');
  windowAt(v, 70, 34, 60, 70, {}); shaft(v, 70, 104, 60, 130, 110, '#f0e4c0', 0.12);
  wallMap(ctx, 170, 30, 110, 76, 3); wallMap(ctx, 300, 40, 70, 54, 8); wallMap(ctx, 390, 26, 96, 84, 13);
  // 두루마리 시렁과 둥근 지구의
  for (let r = 0; r < 3; r++) { rect(ctx, 510, 40 + r * 34, 116, 4, '#2a1e14'); for (let i = 0; i < 8; i++) { oval(ctx, 520 + i * 14, 34 + r * 34, 5, 5, i % 3 ? '#d8cba8' : '#c8b890'); oval(ctx, 520 + i * 14, 34 + r * 34, 2, 2, '#8a7a5a'); } }
  rect(ctx, 574, 150, 4, 28, '#4a3626'); oval(ctx, 576, 142, 17, 17, '#5a7a8a'); poly(ctx, [566, 134, 580, 130, 586, 142, 574, 150, 564, 144], '#8a8a5a'); ring(ctx, 576, 142, 20, 20, 1.4, '#9a8450'); rect(ctx, 560, 176, 32, 5, '#4a3626');
  // 큰 탁자와 펼친 지도, 컴퍼스와 자, 잉크
  table(ctx, 190, 480, 184, '#4e3a28', 9, 50); mapOnTable(ctx, 220, 450, 175);
  stroke(ctx, [300, 170, 306, 152, 314, 170], 1.2, '#8a8e96'); rect(ctx, 356, 166, 46, 3, '#9a8450'); rect(ctx, 416, 160, 7, 9, '#1e1814'); oval(ctx, 436, 168, 5, 2, '#8a2f2a'); oval(ctx, 448, 167, 5, 2, '#3e4a80');
  candle(v, 466, 166, 9); glow(v, 466, 154, 50, '#ffcf80', 0.16);
  // 장인(나): 몸을 숙여 선을 긋는다
  person(v, 262, 236, 110, mine(v, { raw: true, f: 1, pose: 'bow', arm: 'fwd', rim: 'rgba(240,228,192,.5)', rimDir: -1 })); stroke(ctx, [298, 170, 310, 148], 1, '#e8e0cc');
  // 맞은편의 손님: 뱃사람이 거친 그림을 내민다
  person(v, 500, 236, 108, { raw: true, f: -1, cloth: '#3a4a5a', hair: '#6a4a2a', hat: true, arm: 'fwd', cloak: true }); poly(ctx, [458, 164, 478, 160, 482, 170, 462, 174], '#c8b890');
  // 물감을 가는 도제
  person(v, 130, 238, 80, folk(2, { raw: true, f: 1, pose: 'sit', arm: 'fwd', female: false, long: false })); oval(ctx, 158, 214, 12, 5, '#6a6258'); oval(ctx, 158, 212, 8, 3, '#3e4a80'); rect(ctx, 150, 218, 16, 20, '#4a3626');
  finish(v, { inside: true });
}
/** 경계석: 흐린 들판 한가운데의 돌. 양쪽에서 노려보는 두 무리, 사슬과 문서를 든 측량사 */
function svStone(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {});
  ground(v, (x) => Math.max(fn(x), 150) + 26, { color: '#6c6e4c', color2: '#46483a', tufts: 60 });
  // 왼쪽은 갈아엎은 밭, 오른쪽은 풀밭. 가운데로 줄지은 말뚝
  poly(ctx, [0, 184, 316, 180, 300, 240, 0, 240], rgba(t('#5a4a36'), 0.9)); for (let i = 0; i < 7; i++) stroke(ctx, [0, 190 + i * 8, 312 - i * 2, 185 + i * 8], 0.8, t('#3e3226'));
  for (let i = 0; i < 5; i++) { const y = 178 - i * 5, x = 322 + i * 3; rect(ctx, x, y - 10 + i * 1.4, 2, 12 - i * 1.4, t('#3a2c20')); }
  // 경계석: 새긴 표식과 이끼
  poly(ctx, [296, 232, 300, 180, 312, 168, 336, 170, 346, 184, 348, 232], t('#8a887e')); poly(ctx, [300, 180, 312, 168, 336, 170, 330, 182, 306, 186], t('#a09e92')); stroke(ctx, [316, 192, 316, 214], 1.6, t('#4a4840')); stroke(ctx, [308, 200, 326, 200], 1.6, t('#4a4840')); ring(ctx, 332, 208, 5, 5, 1.2, t('#4a4840')); oval(ctx, 306, 226, 8, 4, t('#5a6a44'));
  // 측량사(나): 돌 곁에서 문서를 펴 든다
  person(v, 376, 238, 110, mine(v, { f: -1, arm: 'fwd', hat: true, rim: WARM, rimDir: -1 })); poly(ctx, [344, 176, 366, 174, 368, 196, 346, 198], '#d8ceb0'); oval(ctx, 357, 194, 3, 3, '#8a2f2a'); ctx.setLineDash([3, 2]); stroke(ctx, [396, 236, 470, 232, 560, 222], 1.4, t('#6a6e76')); ctx.setLineDash([]);
  // 왼쪽 무리: 쇠스랑과 괭이를 든 농부들
  for (let i = 0; i < 4; i++) { const x = 60 + i * 50; person(v, x, 236 + (i % 2) * 4, 100 + (i % 3) * 5, folk(i, { f: 1, hat: i === 1, arm: i === 3 ? 'out' : undefined })); if (i % 2 === 0) { stroke(ctx, [x + 16, 238, x + 22, 150], 1.8, t('#3a2c20')); for (const k of [-4, 0, 4]) stroke(ctx, [x + 22 + k, 150, x + 22 + k, 138], 1, t('#6a6e76')); } }
  // 오른쪽 무리: 영주의 집사와 창 든 사람들
  person(v, 470, 238, 108, { f: -1, cloth: '#5a2630', hair: '#3a2a1e', cloak: true, hat: true, arm: 'out' });
  for (let i = 0; i < 3; i++) { person(v, 524 + i * 44, 236 + (i % 2) * 4, 104, soldier({ f: -1 })); spear(v, 512 + i * 44, 236, 120, -0.03); }
  finish(v, { noLeaves: true });
}
/** 군막의 지도: 등불 아래 큰 지도를 둘러선 장수들. 고갯길을 짚는 측량사와 나무 말 표식 */
function svWar(v) {
  const { ctx } = v; rect(ctx, 0, 0, VW, VH, '#2a241c');
  // 천막 벽과 기둥
  for (let i = 0; i < 9; i++) poly(ctx, [i * 80 - 20, 0, i * 80 + 60, 0, i * 80 + 70, 180, i * 80 - 10, 180], i % 2 ? '#4a4030' : '#54483a'); for (let i = 0; i < 9; i++) stroke(ctx, [i * 80 - 20, 0, i * 80 - 10, 180], 1, 'rgba(0,0,0,.3)');
  rect(ctx, 0, 176, VW, 64, '#2e261c'); for (let i = 0; i < 10; i++) stroke(ctx, [i * 70, 240, i * 70 + 20, 176], 0.7, 'rgba(0,0,0,.25)');
  rect(ctx, 316, 0, 8, 180, '#2e2218'); poly(ctx, [0, 0, 320, 0, 0, 40], 'rgba(0,0,0,.3)'); poly(ctx, [640, 0, 320, 0, 640, 40], 'rgba(0,0,0,.3)');
  // 열린 천막 자락 밖의 밤과 보초
  poly(ctx, [560, 60, 640, 40, 640, 180, 580, 180], '#141a2c'); for (let i = 0; i < 8; i++) oval(ctx, 590 + hash(i, 4) * 44, 70 + hash(i, 5) * 60, 0.9, 0.9, 'rgba(236,240,255,.7)'); person(v, 614, 184, 70, soldier({ raw: true, f: 1, noShadow: true, cloth: '#2e3038' })); stroke(ctx, [628, 184, 630, 100], 1.4, '#17130f');
  // 깃발과 갑옷 걸이
  banner(v, 60, 180, 150, '#8a2f2a', { mark: '#d8b04a', raw: true, d: 1 }); rect(ctx, 130, 96, 4, 84, '#2e2218'); rect(ctx, 112, 110, 40, 4, '#2e2218'); poly(ctx, [116, 114, 148, 114, 144, 156, 120, 156], '#6a6e76'); oval(ctx, 132, 100, 10, 9, '#7a7e86');
  // 매단 등불 둘
  for (const x of [250, 400]) { stroke(ctx, [x, 0, x, 70], 0.8, '#17130f'); rect(ctx, x - 6, 70, 12, 14, '#e8b860'); rect(ctx, x - 8, 68, 16, 3, '#2a2018'); glow(v, x, 78, 90, '#ffb860', 0.2); }
  // 장군: 두 손으로 탁자를 짚었다
  person(v, 330, 216, 116, { raw: true, f: 0, cloth: '#6a2a2a', hair: '#8a8478', cloak: true, old: true, noShadow: true });
  // 지도 탁자: 표식 말과 깃 핀
  rect(ctx, 182, 188, 286, 34, '#33261a'); table(ctx, 170, 480, 188, '#4a3626', 10, 48); mapOnTable(ctx, 190, 458, 178); pool(v, 326, 176, 150, 10, '#ffb860', 0.12);
  for (const [x, c] of [[250, '#8a2f2a'], [270, '#8a2f2a'], [380, '#2f4a73'], [404, '#2f4a73'], [420, '#2f4a73']]) { rect(ctx, x - 3, 164, 6, 9, c); oval(ctx, x, 163, 3.4, 3.4, c); } for (const x of [316, 340]) { stroke(ctx, [x, 174, x, 160], 0.8, '#17130f'); poly(ctx, [x, 160, x + 8, 163, x, 166], '#d8b04a'); }
  // 측량사(나): 고갯길을 짚는다
  person(v, 196, 238, 110, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: -1 })); stroke(ctx, [232, 172, 286, 172], 1.2, '#c8b890');
  // 둘러선 장수들
  person(v, 470, 238, 112, soldier({ raw: true, f: -1, cloak: true, arm: 'chest', rim: WARM, rimDir: 1 })); person(v, 524, 240, 108, { raw: true, f: -1, cloth: '#3e4a40', hair: '#5a4030', cloak: true, rim: WARM, rimDir: 1 });
  person(v, 120, 240, 104, soldier({ raw: true, f: 1, hat: false, hair: '#2a1e16', arm: 'chest' }));
  finish(v, { inside: true });
}

export const PLATES20 = {
  /** 옥살이. variant: cell(지하 감옥) visit(면회 창살) rope(탈옥 밧줄) release(출소 길) */
  jail(v) { const k = v.variant ?? 'cell'; return ({ visit: jailVisit, rope: jailRope, release: jailRelease }[k] ?? jailCell)(v); },
  /** 별. variant: roof(천문대 지붕) comet(혜성 아래 군중) eclipse(일식) stall(별점 노점) */
  stars(v) { const k = v.variant ?? 'roof'; return ({ comet: starsComet, eclipse: starsEclipse, stall: starsStall }[k] ?? starsRoof)(v); },
  /** 측량. variant: field(측량대와 막대) shop(지도 공방) stone(경계석) war(펼친 지도 앞 장군) */
  survey(v) { const k = v.variant ?? 'field'; return ({ shop: svShop, stone: svStone, war: svWar }[k] ?? svField)(v); },
};
