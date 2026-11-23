// 37단계 삽화: 산적(산채, 길목, 토벌, 몸값), 사냥꾼(덫, 숲길, 모피 장, 큰 짐승),
// 의붓가족(새 식탁, 문간의 아이, 다툼, 화해).
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, ground, room, windowAt, glow, flame, blaze, candle, pool, smoke, person, tree, finish } from './vignetteKit.js';
import { horseSil, dogSil } from './vignettePlates4.js';
import { spear, torch, wagon, palisade } from './vignettePlates5.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.45)', FIRE = 'rgba(255,150,70,.6)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
// 산적: 해진 가죽과 두건. 병사: 영주의 쇠빛 군복
const ROGUE = ['#3a3028', '#2e2a24', '#44382a', '#34302a'];
const rogue = (i, o = {}) => ({ cloth: ROGUE[i % 4], hair: HR[(i + 2) % 6], hood: i % 2 === 0, cloak: i % 3 === 0, ...o });
const soldier = (o = {}) => ({ cloth: '#5a5e68', hair: '#1c1614', hat: true, ...o });

/** 바위 덩이 */
function rock(v, x, y, w, h, c = '#5a564e') {
  const { ctx, t } = v;
  poly(ctx, [x - w / 2, y, x - w * 0.42, y - h * 0.6, x - w * 0.12, y - h, x + w * 0.28, y - h * 0.84, x + w / 2, y - h * 0.3, x + w * 0.46, y], t(c));
  poly(ctx, [x - w * 0.12, y - h, x + w * 0.28, y - h * 0.84, x + w * 0.1, y - h * 0.5, x - w * 0.2, y - h * 0.56], t(dark(c, -0.16)));
}
/** 천막 같은 움막: 기운 장대에 가죽을 덮었다 */
function leanTo(v, x, y, w, h, c = '#5a4a36') {
  const { ctx, t } = v;
  poly(ctx, [x - w / 2, y, x, y - h, x + w / 2, y], t(c)); poly(ctx, [x - w * 0.14, y, x, y - h * 0.62, x + w * 0.14, y], t('#17120e'));
  stroke(ctx, [x - 3, y - h - 8, x + w * 0.2, y - h * 0.6], 1.6, t('#2a2018')); stroke(ctx, [x + 3, y - h - 8, x - w * 0.2, y - h * 0.6], 1.6, t('#2a2018'));
}
/** 묶은 궤짝과 자루 더미 */
function loot(v, x, y, s = 1) {
  const { ctx, t } = v;
  rect(ctx, x - 22 * s, y - 16 * s, 24 * s, 16 * s, t('#6a5038')); rect(ctx, x - 22 * s, y - 10 * s, 24 * s, 2 * s, t('#3a2c20')); rect(ctx, x + 4 * s, y - 12 * s, 18 * s, 12 * s, t('#5a4430'));
  oval(ctx, x - 6 * s, y - 22 * s, 10 * s, 7 * s, t('#b8a680')); oval(ctx, x + 14 * s, y - 16 * s, 8 * s, 6 * s, t('#a89670'));
}
/** 활 (세워 든 것). d: 시위가 향하는 쪽 */
const bow = (ctx, x, y, h, d, c = '#3a2c20') => { ctx.strokeStyle = c; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - d * h * 0.3, y - h / 2, x, y - h); ctx.stroke(); stroke(ctx, [x, y, x, y - h], 0.6, 'rgba(220,210,180,.7)'); };
/** 사슴: 멀리 선 수사슴 */
function stag(v, x, y, h, d, c = '#7a5a3c') {
  const { ctx, t } = v; const col = t(c), s = h / 40;
  oval(ctx, x, y - 22 * s, 15 * s, 7.5 * s, col);
  for (const k of [-11, -7, 8, 12]) rect(ctx, x + k * s - 1 * s, y - 18 * s, 2 * s, 18 * s, col);
  poly(ctx, [x + d * 10 * s, y - 26 * s, x + d * 18 * s, y - 40 * s, x + d * 22 * s, y - 38 * s, x + d * 15 * s, y - 20 * s], col);
  oval(ctx, x + d * 22 * s, y - 40 * s, 5 * s, 3 * s, col, d * 0.3);
  for (const k of [0, 1]) { const ax = x + d * (19 + k * 2) * s, ay = y - 43 * s; stroke(ctx, [ax, ay, ax - d * 2 * s + k * 3 * s, ay - 9 * s, ax - d * 5 * s + k * 6 * s, ay - 15 * s], 1.1 * s, col); stroke(ctx, [ax - d * 2 * s + k * 3 * s, ay - 9 * s, ax + d * 3 * s + k * 2 * s, ay - 13 * s], 0.9 * s, col); }
  oval(ctx, x - d * 15 * s, y - 24 * s, 2.4 * s, 2 * s, t('#d8ceb4'));
}
/** 멧돼지: 머리를 낮추고 달려드는 큰 짐승 */
function boar(v, x, y, len, d, c = '#2e2620') {
  const { ctx, t } = v; const col = t(c), s = len / 60;
  oval(ctx, x, y + 2 * s, 34 * s, 4 * s, 'rgba(0,0,0,.25)');
  oval(ctx, x, y - 18 * s, 28 * s, 15 * s, col); oval(ctx, x + d * 14 * s, y - 22 * s, 16 * s, 14 * s, col);
  poly(ctx, [x + d * 20 * s, y - 30 * s, x + d * 44 * s, y - 14 * s, x + d * 42 * s, y - 8 * s, x + d * 22 * s, y - 8 * s], col);
  for (const k of [-18, -10, 12, 20]) poly(ctx, [x + k * s - 3 * s, y - 10 * s, x + k * s + 3 * s, y - 10 * s, x + k * s + d * 3 * s, y, x + k * s + d * 0.5 * s, y], col);
  for (let i = 0; i < 9; i++) stroke(ctx, [x - d * 16 * s + d * i * 5 * s, y - 31 * s, x - d * 18 * s + d * i * 5 * s, y - 37 * s - (i % 2) * 2 * s], 1.2 * s, t(dark(c, 0.3)));
  stroke(ctx, [x + d * 38 * s, y - 11 * s, x + d * 42 * s, y - 19 * s], 1.6 * s, '#d8d0b8'); oval(ctx, x + d * 28 * s, y - 22 * s, 1.4 * s, 1.2 * s, '#c0402a');
  poly(ctx, [x + d * 16 * s, y - 34 * s, x + d * 20 * s, y - 40 * s, x + d * 23 * s, y - 32 * s], col);
}
/** 널어 건 모피 한 장 */
function pelt(ctx, x, y, w, h, c, tail = false) {
  poly(ctx, [x - w * 0.3, y, x + w * 0.3, y, x + w / 2, y + h * 0.16, x + w * 0.32, y + h * 0.3, x + w * 0.36, y + h * 0.74, x + w / 2, y + h * 0.9, x + w * 0.2, y + h * 0.84, x, y + h, x - w * 0.2, y + h * 0.84, x - w / 2, y + h * 0.9, x - w * 0.36, y + h * 0.74, x - w * 0.32, y + h * 0.3, x - w / 2, y + h * 0.16], c);
  stroke(ctx, [x, y + h * 0.1, x, y + h * 0.8], 0.8, dark(c, 0.25));
  if (tail) stroke(ctx, [x, y + h, x + 2, y + h * 1.28], w * 0.16, c);
}
/** 숲의 줄기들과 어둑한 바닥 (깊은 숲) */
function deepWood(v, n, fy, seed, shade = '#1e2a22') {
  const { ctx, t } = v;
  rect(ctx, 0, 0, VW, VH, rgba(t(shade), 0.7)); rect(ctx, 0, fy, VW, VH - fy, t('#3a3626'));
  for (let i = 0; i < n; i++) { const x = hash(i, seed) * VW, w = 7 + hash(i, seed + 1) * 15, d = hash(i, seed + 2); rect(ctx, x, 0, w, fy + d * 26, t(d > 0.5 ? '#231c16' : '#2e261e')); rect(ctx, x, 0, w * 0.26, fy + d * 26, t('#3a3026')); }
}

/* ---------- 산적 ---------- */
/** 산채: 바위 골짜기의 울짱과 움막, 모닥불과 망보는 사람 */
function outDen(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true });
  // 양옆의 벼랑과 골짜기 바닥
  poly(ctx, [0, 0, 150, 0, 196, 70, 170, 150, 210, 188, 0, 200], t('#4a463e')); poly(ctx, [640, 0, 520, 0, 470, 60, 500, 140, 450, 186, 640, 200], t('#444038'));
  poly(ctx, [150, 0, 196, 70, 170, 150, 150, 120, 166, 60], t('#5a564c')); poly(ctx, [520, 0, 470, 60, 500, 140, 516, 90], t('#38342e'));
  ground(v, (x) => Math.max(fn(x), 160) + 22, { color: '#5e5644', color2: '#463e30', tufts: 26 });
  palisade(v, 190, 300, 190, 46); palisade(v, 360, 470, 190, 46); rect(ctx, 296, 150, 6, 40, t('#3a2c20')); rect(ctx, 358, 150, 6, 40, t('#3a2c20')); stroke(ctx, [296, 152, 364, 152], 3, t('#3a2c20'));
  // 벼랑 위의 망꾼
  person(v, 176, 70, 44, rogue(0, { f: 1, cloak: true, hood: true })); bow(ctx, 188, 66, 34, 1, t('#2a2018'));
  // 움막 셋과 훔친 짐, 매어 둔 말
  leanTo(v, 110, 214, 110, 62); leanTo(v, 520, 210, 120, 66, '#4e4032'); leanTo(v, 420, 200, 70, 44, '#5a4c38');
  loot(v, 228, 220, 1.1); horseSil(v, 590, 224, 46, -1, '#3a2a1e', {});
  // 모닥불과 둘러앉은 무리
  smoke(v, 322, 196, 150, 30, '#2a2622', 0.26);
  person(v, 262, 222, 76, rogue(1, { f: 1, pose: 'sit', rim: FIRE, rimDir: 1 })); person(v, 386, 222, 78, rogue(2, { f: -1, pose: 'sit', rim: FIRE, rimDir: -1, arm: 'fwd' }));
  for (const [a, b] of [[306, 338], [300, 330]]) stroke(ctx, [a, 224, b, 216], 3, t('#2a1e16')); flame(v, 320, 218, 12); flame(v, 328, 220, 8); glow(v, 322, 208, 70, '#ff8a30', 0.2); pool(v, 322, 228, 120, 12, '#ff8a30', 0.16);
  // 두목(망토)과 그 앞에 선 나
  person(v, 448, 236, 104, rogue(3, { f: -1, cloak: true, hood: false, hair: '#8a8478', rim: FIRE, rimDir: -1 }));
  person(v, 196, 240, 100, mine(v, { f: 1, rim: FIRE, rimDir: 1 }));
  finish(v);
}
/** 길목: 벼랑 위에 엎드린 무리와 저 아래 고갯길을 오르는 수레 */
function outPass(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true });
  ground(v, (x) => Math.max(fn(x), 140) + 4, { color: '#7a7458', color2: '#5a5642', tufts: 30 });
  // 저 아래의 길과 작은 수레
  ctx.fillStyle = rgba(t('#b09a70'), 0.85); ctx.beginPath(); ctx.moveTo(640, 150); ctx.quadraticCurveTo(470, 160, 380, 176); ctx.quadraticCurveTo(300, 190, 250, 240); ctx.lineTo(320, 240); ctx.quadraticCurveTo(350, 200, 410, 186); ctx.quadraticCurveTo(500, 170, 640, 164); ctx.closePath(); ctx.fill();
  wagon(v, 470, 174, 0.5, -1); horseSil(v, 438, 176, 22, -1, '#3a2a1e', {}); person(v, 500, 176, 26, folk(2, { f: -1 })); person(v, 420, 180, 26, folk(4, { f: -1, hat: true }));
  for (const [x, y, h] of [[560, 150, 40], [600, 152, 30], [330, 172, 34]]) tree(v, x, y, h, {});
  // 앞쪽: 벼랑 끝의 바위와 그 뒤에 숨은 무리
  poly(ctx, [0, 240, 0, 120, 60, 104, 150, 130, 228, 170, 262, 240], t('#3e3a32')); poly(ctx, [0, 120, 60, 104, 150, 130, 120, 140, 40, 126], t('#56524a'));
  poly(ctx, [640, 240, 640, 196, 590, 190, 540, 212, 520, 240], t('#38342e'));
  rock(v, 204, 176, 70, 40, '#4a463e'); rock(v, 96, 134, 60, 34, '#524e46');
  person(v, 150, 168, 70, rogue(0, { f: 1, pose: 'kneel', hood: true, cloak: true })); bow(ctx, 176, 160, 44, 1, t('#2a2018'));
  person(v, 60, 150, 62, rogue(1, { f: 1, pose: 'kneel', arm: 'fwd' })); stroke(ctx, [74, 118, 100, 108], 2, t('#8a8e96'));
  // 손을 들어 기다리게 하는 두목, 그 곁의 나
  person(v, 232, 236, 96, rogue(3, { f: 1, cloak: true, hood: false, hair: '#8a8478' }));
  person(v, 120, 240, 104, mine(v, { f: 1, pose: 'kneel', hood: true, rim: WARM, rimDir: v.S.dir }));
  // 굴릴 통나무와 밧줄
  ctx.save(); ctx.translate(40, 222); ctx.rotate(-0.1); rect(ctx, -50, -9, 110, 18, t('#3e3024')); oval(ctx, 60, 0, 6, 9, t('#8a7454')); ctx.restore();
  finish(v);
}
/** 토벌: 새벽에 울짱을 넘은 영주의 병사들, 불붙은 움막과 달아나는 무리 */
function outRaid(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true });
  poly(ctx, [640, 0, 540, 0, 500, 70, 530, 150, 480, 186, 640, 200], t('#444038'));
  ground(v, (x) => Math.max(fn(x), 160) + 22, { color: '#5e5644', color2: '#463e30', tufts: 22 });
  // 부서진 울짱과 넘어진 문
  palisade(v, 0, 150, 190, 46); palisade(v, 250, 330, 190, 46); for (let i = 0; i < 5; i++) stroke(ctx, [156 + i * 18, 196, 176 + i * 20, 186 - (i % 2) * 6], 4, t('#3a2c20'));
  // 불붙은 움막
  leanTo(v, 470, 210, 120, 66, '#3a2e24'); blaze(v, 470, 176, 60, 40); glow(v, 470, 160, 110, '#ff7a28', 0.18); smoke(v, 480, 140, 150, 60, '#1e1a18', 0.4);
  leanTo(v, 590, 216, 90, 52, '#4e4032');
  pool(v, 430, 226, 180, 16, '#ff7a28', 0.14);
  // 밀려드는 병사들: 창과 횃불
  for (let i = 0; i < 5; i++) { const x = 40 + i * 44; person(v, x, 206 + (i % 2) * 8, 76, soldier({ f: 1, arm: i % 2 ? 'fwd' : undefined, rim: FIRE, rimDir: 1 })); if (i % 2) spear(v, x + 14, 190, 70, 0.5); else torch(v, x + 10, 170, 26, 5); }
  horseSil(v, 96, 238, 78, 1, '#2a2018', {}); person(v, 92, 178, 62, soldier({ f: 1, cloak: true, arm: 'out', cloth: '#6a2a2a', rim: FIRE, rimDir: 1 })); // 말 위의 토벌대장
  // 무릎 꿇은 산적, 쓰러진 사람, 벼랑 쪽으로 달아나는 둘
  person(v, 330, 230, 84, rogue(1, { f: -1, pose: 'kneel', arm: 'up', hood: false, rim: FIRE, rimDir: 1 }));
  person(v, 268, 232, 92, soldier({ f: 1, arm: 'fwd', rim: FIRE, rimDir: 1 })); spear(v, 284, 214, 76, 1.1);
  oval(ctx, 394, 232, 30, 6, t('#2e2a24')); oval(ctx, 420, 230, 6, 5, t('#8a6a54'));
  person(v, 566, 196, 50, rogue(2, { f: 1, arm: 'fwd' })); person(v, 600, 186, 44, rogue(0, { f: 1, cloak: true }));
  // 손이 묶인 채 지켜보는 나
  person(v, 386, 240, 100, mine(v, { f: -1, pose: 'bow', arm: 'chest', rim: FIRE, rimDir: 1 })); stroke(ctx, [368, 186, 380, 190], 1.6, t('#c8b890'));
  finish(v);
}
/** 몸값: 해 질 녘 갈림길의 고목 아래, 돈주머니와 묶인 사람을 맞바꾸는 자리 */
function outRansom(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => Math.max(fn(x), 152) + 14 + Math.sin(x / 120) * 5; ground(v, g, { color: '#77704f', color2: '#575238', tufts: 50 });
  ctx.fillStyle = rgba(t('#a8926a'), 0.8); ctx.beginPath(); ctx.moveTo(250, VH); ctx.quadraticCurveTo(300, 200, 318, 170); ctx.lineTo(330, 170); ctx.quadraticCurveTo(350, 200, 410, VH); ctx.fill();
  tree(v, 236, 184, 176, { bare: true, dark: true }); rect(ctx, 344, 150, 3, 40, t('#3a2c20')); poly(ctx, [330, 150, 362, 154, 362, 162, 330, 158], t('#5a4a38')); // 이정표
  // 왼쪽: 산적 둘과 그 사이의 묶인 사람(자루를 씌웠다 벗긴 채)
  person(v, 150, 226, 96, rogue(0, { f: 1, cloak: true, hood: true })); stroke(ctx, [168, 172, 196, 162], 2.2, t('#8a8e96'));
  person(v, 204, 228, 90, folk(1, { f: 1, pose: 'bow', arm: 'chest', cloth: '#6a6258', female: false, long: false })); stroke(ctx, [194, 184, 214, 186], 1.8, t('#c8b890'));
  person(v, 96, 224, 92, rogue(1, { f: 1, arm: 'fwd' }));
  // 가운데: 돈주머니를 내미는 손과 받으러 나온 두목
  person(v, 280, 236, 100, rogue(3, { f: 1, cloak: true, hood: false, arm: 'fwd', hair: '#8a8478' }));
  person(v, 388, 236, 98, mine(v, { f: -1, arm: 'fwd', rim: WARM, rimDir: v.S.dir })); oval(ctx, 348, 180, 7, 8, t('#8a6a3a')); stroke(ctx, [345, 173, 351, 173], 1.4, t('#3a2c20'));
  // 오른쪽: 뒤에서 기다리는 식구와 노새
  person(v, 480, 226, 84, folk(1, { f: -1, female: true, long: true, arm: 'chest', veil: true })); person(v, 512, 228, 52, folk(2, { f: -1, child: true }));
  horseSil(v, 580, 228, 50, -1, '#5a4a3a', {});
  // 멀리 언덕 위의 망꾼들
  for (const x of [40, 58, 600]) person(v, x, g(x) - 12, 20, { f: x < 300 ? 1 : -1, cloth: '#1e1a18', hair: '#1e1a18', hood: true });
  finish(v);
}

/* ---------- 사냥꾼 ---------- */
/** 덫: 새벽 안개 낀 숲 바닥, 짐승 길목에 올무를 놓는 손 */
function huntTrap(v) {
  const { ctx, t } = v; sky(v); deepWood(v, 14, 170, 11);
  glow(v, 420, 70, 170, '#c8d4b0', 0.16); pool(v, 320, 176, 360, 26, '#d2dcd6', 0.14);
  // 쓰러진 나무와 고사리, 짐승이 다닌 좁은 길
  ctx.fillStyle = rgba(t('#6a5e44'), 0.7); ctx.beginPath(); ctx.moveTo(560, 172); ctx.quadraticCurveTo(440, 196, 330, 206); ctx.quadraticCurveTo(240, 214, 180, 240); ctx.lineTo(250, 240); ctx.quadraticCurveTo(300, 220, 350, 214); ctx.quadraticCurveTo(460, 204, 580, 178); ctx.fill();
  ctx.save(); ctx.translate(500, 206); ctx.rotate(0.05); rect(ctx, -90, -10, 190, 20, t('#3a2e22')); rect(ctx, -90, -10, 190, 5, t('#4e5a3a')); oval(ctx, -90, 0, 6, 10, t('#8a7454')); ctx.restore();
  for (let i = 0; i < 26; i++) { const x = hash(i, 5) * VW, y = 186 + hash(i, 6) * 50; stroke(ctx, [x, y, x - 6, y - 10, x - 12, y - 8], 1.2, t('#3e5a36')); stroke(ctx, [x, y, x + 6, y - 11, x + 13, y - 8], 1.2, t('#46643c')); }
  // 휜 어린 나무에 건 올무
  stroke(ctx, [270, 214, 268, 170, 288, 138, 322, 128], 2.2, t('#4a3a28')); stroke(ctx, [322, 128, 326, 196], 0.7, 'rgba(220,210,180,.8)');
  ctx.strokeStyle = 'rgba(220,210,180,.85)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(328, 204, 12, 5, 0, 0, TAU); ctx.stroke(); stroke(ctx, [316, 210, 316, 200], 1.6, t('#3a2c20')); stroke(ctx, [340, 210, 340, 200], 1.6, t('#3a2c20'));
  // 발자국
  for (let i = 0; i < 6; i++) oval(ctx, 380 + i * 30, 200 - i * 4 + (i % 2) * 3, 2.4, 1.6, 'rgba(20,16,12,.5)');
  // 무릎 꿇고 올무를 손보는 나, 허리의 토끼와 등에 멘 활
  person(v, 262, 232, 104, mine(v, { f: 1, pose: 'kneel', arm: 'fwd', hood: true, rim: COLD, rimDir: 1 }));
  oval(ctx, 246, 202, 5, 11, t('#a89a84')); oval(ctx, 246, 190, 3, 4, t('#a89a84')); stroke(ctx, [245, 186, 243, 178], 1.6, t('#a89a84'));
  // 덫을 든 도제 아이가 뒤에서 본다
  person(v, 160, 232, 72, folk(3, { f: 1, child: true, arm: 'chest' })); ctx.strokeStyle = t('#6a6e76'); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(170, 196, 8, Math.PI, TAU); ctx.stroke();
  finish(v, { noLeaves: true });
}
/** 숲길: 자국을 좇는 사냥꾼과 개, 멀리 빛 속에 선 사슴 */
function huntTrail(v) {
  const { ctx, t } = v; sky(v); deepWood(v, 12, 176, 23, '#22301f');
  // 숲이 트인 곳의 빛과 사슴
  glow(v, 450, 110, 140, '#e0dca0', 0.3); pool(v, 450, 180, 120, 14, '#b8c078', 0.3);
  stag(v, 452, 186, 64, -1, '#6a4a30');
  for (const [x, w] of [[380, 12], [520, 16], [556, 9]]) rect(ctx, x, 0, w, 196, t('#1e1812'));
  // 앞쪽의 큰 줄기와 덤불
  rect(ctx, 0, 0, 60, VH, t('#18130f')); rect(ctx, 44, 0, 12, VH, t('#2a2218')); rect(ctx, 590, 0, 50, VH, t('#18130f'));
  for (let i = 0; i < 20; i++) { const x = hash(i, 7) * VW, y = 196 + hash(i, 8) * 44; stroke(ctx, [x, y, x - 6, y - 10, x - 12, y - 8], 1.2, t('#3a5432')); stroke(ctx, [x, y, x + 7, y - 11, x + 13, y - 7], 1.2, t('#425e38')); }
  // 진 땅의 발굽 자국
  for (let i = 0; i < 7; i++) { const x = 210 + i * 30, y = 226 - i * 6; oval(ctx, x, y, 2.6, 1.6, 'rgba(14,10,8,.6)'); oval(ctx, x + 4, y - 1, 2.6, 1.6, 'rgba(14,10,8,.6)'); }
  // 몸을 낮추고 활을 든 나, 코를 땅에 댄 개
  person(v, 150, 238, 106, mine(v, { f: 1, pose: 'bow', arm: 'fwd', hood: true, cloak: true, rim: 'rgba(224,220,160,.45)', rimDir: 1 })); bow(ctx, 186, 196, 60, 1, t('#2a2018'));
  dogSil(v, 250, 236, 34, 1, '#5a4430', {});
  // 뒤따르는 동료가 손짓한다
  person(v, 84, 234, 90, folk(4, { f: 1, arm: 'out', hood: true }));
  finish(v, { noLeaves: true });
}
/** 모피 장: 장대에 널어 건 모피들, 저울을 든 모피 상인과 값을 다투는 사냥꾼 */
function huntFurs(v) {
  const { ctx, t } = v; sky(v);
  // 장터의 집들과 차양
  rect(ctx, 0, 60, 200, 120, t('#8a7a64')); poly(ctx, [-6, 60, 100, 18, 206, 60], t('#5a4436')); rect(ctx, 30, 96, 26, 30, t('#1a1512')); rect(ctx, 130, 96, 26, 30, t('#1a1512'));
  rect(ctx, 470, 70, 170, 110, t('#7a6c58')); poly(ctx, [462, 70, 555, 30, 648, 70], t('#4e3e30')); rect(ctx, 520, 100, 26, 30, t('#1a1512'));
  rect(ctx, 0, 178, VW, 62, t('#8a7e68')); for (let i = 0; i < 26; i++) stroke(ctx, [hash(i, 1) * VW, 188 + hash(i, 2) * 46, hash(i, 1) * VW + 8, 187 + hash(i, 2) * 46], 0.8, 'rgba(60,48,34,.25)');
  // 모피 걸이: 장대 둘에 가로대, 여우·늑대·담비·사슴 가죽
  rect(ctx, 200, 56, 266, 124, t('#6a5a48')); poly(ctx, [190, 56, 476, 56, 490, 40, 176, 40], t('#7a3a2e'));
  rect(ctx, 214, 62, 5, 130, t('#3a2c20')); rect(ctx, 446, 62, 5, 130, t('#3a2c20')); rect(ctx, 208, 66, 250, 4, t('#3a2c20')); rect(ctx, 208, 120, 250, 3, t('#3a2c20'));
  pelt(ctx, 250, 70, 34, 46, t('#a8582c'), true); pelt(ctx, 296, 70, 44, 50, t('#6a6660')); pelt(ctx, 344, 70, 30, 40, t('#3a2a20'), true); pelt(ctx, 390, 70, 46, 48, t('#9a7a50')); pelt(ctx, 432, 70, 22, 36, t('#d8d0c0'), true);
  for (let i = 0; i < 6; i++) pelt(ctx, 240 + i * 36, 123, 24, 30, t(['#5a4634', '#7a5a3c', '#c8c0b0', '#4a3a2c', '#8a6a44', '#3a2e26'][i]), i % 2 === 0);
  // 좌판과 저울, 장부
  rect(ctx, 250, 176, 180, 10, t('#5a4430')); rect(ctx, 258, 186, 8, 30, t('#3a2c20')); rect(ctx, 414, 186, 8, 30, t('#3a2c20'));
  oval(ctx, 300, 174, 26, 6, t('#8a6a44')); oval(ctx, 300, 170, 22, 5, t('#a8582c'));
  stroke(ctx, [384, 176, 384, 150], 1.4, t('#8a7440')); stroke(ctx, [370, 152, 398, 152], 1.2, t('#8a7440')); for (const k of [-14, 14]) { stroke(ctx, [384 + k, 152, 384 + k, 162], 0.6, t('#8a7440')); oval(ctx, 384 + k, 164, 6, 2, t('#8a7440')); }
  // 모피 상인(털 깃 두른 옷), 가죽을 내려놓는 나
  person(v, 404, 218, 96, { f: -1, cloth: '#5a2f2a', hair: '#8a8478', old: true, cloak: true, arm: 'fwd' }); oval(ctx, 400, 140, 12, 5, t('#6a5a4a'));
  person(v, 252, 222, 100, mine(v, { f: 1, arm: 'fwd', cloak: true, rim: WARM, rimDir: v.S.dir })); bow(ctx, 232, 180, 60, -1, t('#2a2018'));
  dogSil(v, 196, 224, 30, 1, '#6a5038', {});
  // 구경꾼과 다른 사냥꾼: 어깨에 가죽 묶음
  person(v, 520, 222, 92, folk(0, { f: -1, cloak: true })); oval(ctx, 524, 146, 14, 8, t('#7a5a3c'));
  person(v, 90, 220, 88, folk(1, { f: 1, female: true, long: true, arm: 'chest' })); person(v, 584, 226, 60, folk(2, { f: -1, child: true }));
  finish(v);
}
/** 큰 짐승: 덤불을 헤치고 달려드는 멧돼지, 창을 땅에 받치고 선 사냥꾼 */
function huntBeast(v) {
  const { ctx, t } = v; sky(v); deepWood(v, 11, 174, 41, '#263020');
  glow(v, 300, 80, 190, '#d0d4a0', 0.18);
  for (let i = 0; i < 24; i++) { const x = hash(i, 9) * VW, y = 190 + hash(i, 10) * 50; stroke(ctx, [x, y, x - 7, y - 11, x - 13, y - 8], 1.3, t('#3a5432')); stroke(ctx, [x, y, x + 7, y - 12, x + 14, y - 8], 1.3, t('#425e38')); }
  // 헤쳐진 덤불과 튀는 흙
  for (let i = 0; i < 9; i++) oval(ctx, 480 + hash(i, 3) * 130, 184 + hash(i, 4) * 26, 20 + hash(i, 5) * 14, 9 + hash(i, 6) * 6, t(i % 2 ? '#1e2a1c' : '#243220'));
  boar(v, 410, 226, 104, -1);
  for (let i = 0; i < 8; i++) oval(ctx, 448 + hash(i, 13) * 60, 222 - hash(i, 14) * 22, 2 + hash(i, 15) * 2, 1.6, t('#4a3e2c'));
  // 창을 받친 나: 한쪽 무릎을 낮추고 창끝을 짐승 쪽으로
  person(v, 244, 236, 104, mine(v, { f: 1, pose: 'kneel', arm: 'fwd', rim: 'rgba(208,212,160,.45)', rimDir: 1 }));
  stroke(ctx, [226, 236, 330, 200], 3, t('#4a3a28')); poly(ctx, [328, 196, 346, 194, 332, 205], t('#a8acb4'));
  // 짖으며 옆으로 도는 개, 나무 뒤에서 활을 겨눈 동료, 엎어진 사람
  dogSil(v, 186, 238, 34, 1, '#6a5038', {});
  person(v, 120, 226, 92, folk(0, { f: 1, arm: 'fwd', hood: true })); bow(ctx, 152, 196, 52, 1, t('#2a2018')); stroke(ctx, [130, 172, 166, 170], 1, t('#c8b890'));
  oval(ctx, 560, 234, 30, 6, t('#3e4a40')); oval(ctx, 588, 232, 6, 5, t('#8a6a54')); stroke(ctx, [520, 236, 556, 226], 2, t('#4a3a28'));
  finish(v, { noLeaves: true });
}

/* ---------- 의붓가족 ---------- */
/** 살림집 방: 들보와 벽난로 */
function homeRoom(v, o = {}) {
  const { ctx } = v; room(v, { wall: o.wall ?? '#4e4236', floor: o.floor ?? '#33281f', fy: o.fy ?? 172, stone: false });
  rect(ctx, 0, 0, VW, 12, '#2a2018'); for (const x of [120, 320, 520]) rect(ctx, x, 0, 10, 18, '#221a12');
}
function hearth(v, x, fy, s = 1) {
  const { ctx } = v;
  rect(ctx, x - 50 * s, fy - 96 * s, 100 * s, 96 * s, '#5a5046'); rect(ctx, x - 56 * s, fy - 102 * s, 112 * s, 8 * s, '#746a5e');
  ctx.fillStyle = '#140e0c'; ctx.beginPath(); ctx.moveTo(x - 30 * s, fy); ctx.lineTo(x - 30 * s, fy - 50 * s); ctx.quadraticCurveTo(x, fy - 70 * s, x + 30 * s, fy - 50 * s); ctx.lineTo(x + 30 * s, fy); ctx.fill();
  flame(v, x - 6 * s, fy - 4, 9 * s); flame(v, x + 8 * s, fy - 3, 7 * s); glow(v, x, fy - 24 * s, 100 * s, '#ff8a30', 0.3); pool(v, x, fy + 22, 130 * s, 22, '#ff8a30', 0.18);
}
/** 새 식탁: 한 상에 처음 둘러앉은 두 집 식구. 아이 하나는 그릇만 본다 */
function stepTable(v) {
  const { ctx } = v; homeRoom(v);
  windowAt(v, 70, 40, 60, 70, {}); hearth(v, 540, 172);
  // 선반과 걸린 냄비
  rect(ctx, 220, 60, 150, 5, '#3a2c20'); for (let i = 0; i < 5; i++) oval(ctx, 236 + i * 28, 54, 8, 6, ['#7a6a54', '#5a6a5a', '#8a5a3a', '#6a6258', '#7a6a54'][i]);
  // 식탁 뒤: 새 배우자(가운데, 국자를 든 손), 그 아이, 고개 숙인 내 아이
  person(v, 320, 190, 86, folk(1, { raw: true, f: -1, female: !v.me.female, long: !v.me.female, arm: 'fwd', rim: WARM, rimDir: 1 }));
  person(v, 410, 190, 60, folk(3, { raw: true, f: -1, child: true, rim: WARM, rimDir: 1 }));
  person(v, 214, 190, 64, folk(2, { raw: true, f: 1, child: true, pose: 'bow' }));
  // 식탁: 거친 널, 빵과 냄비, 그릇 다섯, 초 하나
  rect(ctx, 150, 168, 330, 10, '#6a5038'); poly(ctx, [150, 178, 480, 178, 474, 190, 156, 190], '#4a3626'); rect(ctx, 164, 190, 9, 40, '#33251a'); rect(ctx, 458, 190, 9, 40, '#33251a');
  oval(ctx, 320, 164, 20, 7, '#2a2420'); rect(ctx, 302, 150, 36, 14, '#2a2420'); oval(ctx, 262, 166, 16, 5, '#a8824a');
  for (const x of [196, 240, 380, 420, 452]) oval(ctx, x, 168, 9, 2.6, '#8a7e68'); candle(v, 356, 166, 9); glow(v, 356, 150, 60, '#ffcf80', 0.2);
  // 앞쪽: 등을 보이고 앉은 나, 그리고 조금 떨어져 앉은 큰아이
  person(v, 280, 240, 100, mine(v, { raw: true, f: 0, pose: 'sit' }));
  person(v, 430, 240, 80, folk(5, { raw: true, f: 0, pose: 'sit', child: false, cloth: '#3e4a40' }));
  // 문가의 보따리: 아직 풀지 않은 짐
  oval(ctx, 60, 220, 22, 14, '#6a5a44'); stroke(ctx, [50, 208, 70, 208], 1.4, '#3a2c20'); rect(ctx, 86, 204, 30, 22, '#5a4430');
  finish(v, { inside: true });
}
/** 문간의 아이: 열린 문 앞에 보따리를 안고 선 아이, 안에서 몸을 낮춘 어른 */
function stepDoor(v) {
  const { ctx } = v; homeRoom(v, { wall: '#463a30', floor: '#2e241c', fy: 176 });
  // 열린 문: 바깥의 차가운 저녁 빛
  rect(ctx, 250, 30, 110, 150, '#8a98a8'); rect(ctx, 250, 130, 110, 50, '#6a7068'); rect(ctx, 250, 110, 110, 22, '#7a8690');
  for (const [x, h] of [[270, 40], [340, 30]]) { rect(ctx, x, 132 - h, 3, h, '#3a3a36'); stroke(ctx, [x + 1, 132 - h, x - 8, 122 - h], 1, '#3a3a36'); stroke(ctx, [x + 1, 136 - h * 0.8, x + 9, 126 - h * 0.8], 1, '#3a3a36'); }
  rect(ctx, 242, 24, 8, 158, '#2a2018'); rect(ctx, 360, 24, 8, 158, '#2a2018'); rect(ctx, 242, 22, 126, 8, '#2a2018'); poly(ctx, [368, 30, 430, 44, 430, 196, 368, 180], '#3a2c20'); stroke(ctx, [420, 110, 420, 122], 2, '#8a7440');
  // 문턱에 떨어지는 빛
  poly(ctx, [250, 180, 360, 180, 420, 240, 190, 240], 'rgba(150,170,190,.16)');
  // 문간의 아이: 보따리를 안았다
  person(v, 300, 188, 64, folk(3, { raw: true, f: -1, child: true, arm: 'chest', rim: COLD, rimDir: 1 })); oval(ctx, 295, 156, 9, 7, '#6a5a44');
  // 데려온 사람: 문밖에 반쯤 보이는 어른의 손
  person(v, 344, 184, 92, folk(4, { raw: true, f: -1, cloak: true, hood: true }));
  // 안쪽: 한쪽 무릎을 꿇고 손을 내민 나, 계단참에서 내려다보는 집 아이
  person(v, 180, 236, 104, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', rim: WARM, rimDir: -1 }));
  hearth(v, 70, 176, 0.9);
  rect(ctx, 500, 150, 110, 8, '#4a3626'); rect(ctx, 508, 158, 8, 40, '#33251a'); rect(ctx, 594, 158, 8, 40, '#33251a'); candle(v, 556, 150, 8); glow(v, 556, 136, 50, '#ffcf80', 0.2);
  person(v, 560, 232, 74, folk(5, { raw: true, f: -1, child: true, arm: 'chest', rim: WARM, rimDir: 1 }));
  finish(v, { inside: true });
}
/** 다툼: 엎어진 걸상과 서로 밀치는 두 아이, 사이에 든 어른 */
function stepQuarrel(v) {
  const { ctx } = v; homeRoom(v, { wall: '#4a3e34' });
  windowAt(v, 500, 40, 60, 70, {}); hearth(v, 90, 172, 0.9);
  rect(ctx, 250, 50, 110, 5, '#3a2c20'); rect(ctx, 270, 30, 14, 20, '#6a5a4a'); rect(ctx, 300, 34, 20, 16, '#5a4a3a');
  // 엎어진 걸상, 깨진 그릇, 찢긴 옷가지
  ctx.save(); ctx.translate(200, 226); ctx.rotate(1.2); rect(ctx, -16, -4, 32, 8, '#5a4430'); rect(ctx, -14, 4, 4, 22, '#3a2c20'); rect(ctx, 10, 4, 4, 22, '#3a2c20'); ctx.restore();
  for (const [x, y, r] of [[470, 232, 0.4], [486, 235, 1.9], [460, 236, 3]]) { ctx.fillStyle = '#b8ae94'; ctx.beginPath(); ctx.arc(x, y, 6, r, r + 2); ctx.closePath(); ctx.fill(); }
  // 밀치는 두 아이 (의붓형제): 멱살을 잡았다
  person(v, 262, 228, 84, folk(2, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: -1, cloth: '#54463a' }));
  person(v, 398, 228, 88, folk(3, { raw: true, f: -1, arm: 'fwd', cloth: '#3a3e4a' }));
  // 사이에 팔을 벌리고 든 나
  person(v, 330, 238, 104, mine(v, { raw: true, f: 0, arm: 'out', rim: WARM, rimDir: -1 }));
  // 문가에서 입을 가린 배우자, 구석에 웅크린 막내
  person(v, 560, 228, 96, folk(1, { raw: true, f: -1, female: !v.me.female, long: !v.me.female, arm: 'chest' }));
  person(v, 150, 214, 48, folk(4, { raw: true, f: 1, child: true, pose: 'huddle', rim: WARM, rimDir: -1 }));
  finish(v, { inside: true });
}
/** 화해: 저녁의 집 앞 문턱에 나란히 앉은 어른과 아이, 어깨에 덮어 주는 겉옷 */
function stepPeace(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); ground(v, (x) => Math.max(fn(x), 156) + 12, { color: '#7c7a52', color2: '#5a5a3c', tufts: 50 });
  // 집: 불 켜진 창과 열린 문, 굴뚝 연기
  rect(ctx, 90, 70, 300, 130, t('#9a8a72')); poly(ctx, [70, 70, 240, 14, 410, 70], t('#5e4a38')); rect(ctx, 320, 26, 20, 34, t('#6a5e52')); smoke(v, 330, 26, 60, 16, '#3a3632', 0.2);
  rect(ctx, 120, 104, 40, 40, '#d09a4a'); glow(v, 140, 124, 50, '#ffa850', 0.3); stroke(ctx, [140, 104, 140, 144], 1.4, t('#3a2c20')); stroke(ctx, [120, 124, 160, 124], 1.4, t('#3a2c20'));
  rect(ctx, 226, 110, 54, 90, '#a8703a'); glow(v, 253, 150, 60, '#ffa850', 0.16); rect(ctx, 220, 104, 6, 96, t('#3a2c20')); rect(ctx, 280, 104, 6, 96, t('#3a2c20')); poly(ctx, [286, 110, 322, 118, 322, 204, 286, 200], t('#4a3828'));
  rect(ctx, 206, 200, 100, 8, t('#7a6e60')); pool(v, 256, 216, 90, 12, '#ffa850', 0.12);
  // 마당: 울타리와 나무, 널린 빨래, 장작더미
  tree(v, 520, 200, 130, {}); for (let i = 0; i < 9; i++) stroke(ctx, [420 + i * 26, 214, 421 + i * 26, 190], 2.2, t('#3e2e20')); stroke(ctx, [414, 198, 640, 196], 1.6, t('#3e2e20'));
  stroke(ctx, [20, 130, 92, 124], 0.8, t('#c8b890')); rect(ctx, 20, 110, 3, 100, t('#3a2c20')); for (const [x, c] of [[34, '#b8ae94'], [56, '#6a5a6a'], [72, '#b8ae94']]) rect(ctx, x, 128, 12, 22, t(c));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4 - i; j++) oval(ctx, 470 + j * 12 + i * 6, 214 - i * 8, 6, 4, t('#6a5038'));
  // 문턱에 나란히 앉은 둘: 아이 어깨에 겉옷을 덮어 주는 나
  person(v, 253, 200, 60, folk(1, { raw: true, f: 1, female: !v.me.female, long: !v.me.female, arm: 'chest' })); // 문 안쪽에서 지켜보는 배우자
  ctx.save(); ctx.translate(350, 226); rect(ctx, -70, -8, 150, 14, t('#3e3024')); oval(ctx, 80, -1, 5, 7, t('#8a7454')); ctx.restore(); // 마당의 통나무
  person(v, 320, 236, 100, mine(v, { f: 1, pose: 'sit', arm: 'fwd', rim: WARM, rimDir: -1 }));
  person(v, 372, 236, 70, folk(2, { f: -1, child: true, pose: 'sit', cloak: true, rim: WARM, rimDir: -1 }));
  oval(ctx, 404, 208, 7, 3, t('#a8824a')); rect(ctx, 408, 200, 3, 6, t('#a8824a')); // 아이가 깎던 나무 말
  dogSil(v, 180, 234, 28, 1, '#6a5038', {});
  finish(v);
}

export const PLATES16 = {
  /** 산적. variant: den(산채) pass(길목) raid(토벌) ransom(몸값) */
  outlaw(v) { const k = v.variant ?? 'den'; return ({ pass: outPass, raid: outRaid, ransom: outRansom }[k] ?? outDen)(v); },
  /** 사냥꾼. variant: trap(덫) trail(숲길) furs(모피 장) beast(큰 짐승) */
  hunter(v) { const k = v.variant ?? 'trail'; return ({ trap: huntTrap, furs: huntFurs, beast: huntBeast }[k] ?? huntTrail)(v); },
  /** 의붓가족. variant: table(새 식탁) door(문간의 아이) quarrel(다툼) peace(화해) */
  stepfamily(v) { const k = v.variant ?? 'table'; return ({ door: stepDoor, quarrel: stepQuarrel, peace: stepPeace }[k] ?? stepTable)(v); },
};
