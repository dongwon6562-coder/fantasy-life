// 24단계 삽화: 봉기, 개척촌, 목축·유목, 망자와 저주, 광산, 노예 시장, 큰 한탕, 재판정, 요리사, 유배와 망명, 큰 공사.
import { fbm1, rgba, dark, light } from './sceneKit.js';
import { VW, VH, HZ, sky, far, townFar, ground, road, room, windowAt, glow, candle, pool, smoke, person, crowd, lying, tree, banner, crows, flame, blaze, finish, zoom } from './vignetteKit.js';
import { cottage, horseSil, dogSil } from './vignettePlates4.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.45)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const dimOf = (v) => v.S.tod === 'night' || v.S.tod === 'dusk';
/** 쇠스랑 */
const fork = (v, x, y, len, tilt = 0) => { const { ctx, t } = v, c = t('#3a2c20'), tx = x + Math.sin(tilt) * len, ty = y - Math.cos(tilt) * len; stroke(ctx, [x, y, tx, ty], 1.6, c); for (const k of [-1, 0, 1]) stroke(ctx, [tx + k * 3, ty + 1, tx + k * 3 + Math.sin(tilt) * 9, ty - Math.cos(tilt) * 9], 1, t('#70747a')); stroke(ctx, [tx - 3, ty + 1, tx + 3, ty + 1], 1, t('#70747a')); };
/** 창 */
const spear = (v, x, y, len, tilt = 0) => { const { ctx, t } = v, tx = x + Math.sin(tilt) * len, ty = y - Math.cos(tilt) * len; stroke(ctx, [x, y, tx, ty], 1.5, t('#3a2c20')); poly(ctx, [tx - 2, ty, tx + Math.sin(tilt) * 8, ty - Math.cos(tilt) * 8, tx + 2, ty], t('#a8aeb6')); };
/** 곡괭이 */
const pick = (v, x, y, len, tilt = 0) => { const { ctx, t } = v, tx = x + Math.sin(tilt) * len, ty = y - Math.cos(tilt) * len; stroke(ctx, [x, y, tx, ty], 1.8, t('#4a3a2a')); ctx.strokeStyle = t('#787c84'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 9, ty + 4); ctx.quadraticCurveTo(tx, ty - 4, tx + 9, ty + 4); ctx.stroke(); };
const torch = (v, x, y, h, s = 5) => { rect(v.ctx, x - 1.1, y - h, 2.2, h, v.t('#2a2018')); flame(v, x, y - h, s); };
/** 통나무 울: x0~x1에 뾰족한 말뚝 */
const palisade = (v, x0, x1, y, h, c = '#4a3a2a') => { const { ctx, t, R } = v; for (let x = x0; x < x1; x += 9) { const hh = h * (0.9 + R() * 0.16); poly(ctx, [x, y, x, y - hh, x + 4, y - hh - 6, x + 8, y - hh, x + 8, y], t(R() < 0.5 ? c : dark(c, 0.14))); } rect(ctx, x0, y - h * 0.55, x1 - x0, 2.4, t(dark(c, 0.35))); };
/** 포장 수레 */
function wagon(v, x, y, s, d) {
  const { ctx, t } = v; ctx.save(); ctx.translate(x, y); ctx.scale(d * s, s);
  oval(ctx, 0, 2, 44, 4, rgba('#000000', 0.2));
  rect(ctx, -34, -26, 68, 14, t('#5a4632')); stroke(ctx, [34, -18, 58, -16], 2, t('#3a2c20'));
  ctx.fillStyle = t('#cfc4a8'); ctx.beginPath(); ctx.moveTo(-34, -26); ctx.quadraticCurveTo(-34, -62, 0, -62); ctx.quadraticCurveTo(34, -62, 34, -26); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#000000', 0.2); ctx.lineWidth = 1; for (const k of [-17, 0, 17]) { ctx.beginPath(); ctx.moveTo(k, -26); ctx.quadraticCurveTo(k * 0.9, -60, k * 0.6, -62); ctx.stroke(); }
  for (const wx of [-22, 22]) { ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(wx, -10, 10, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; stroke(ctx, [wx - Math.cos(a) * 10, -10 - Math.sin(a) * 10, wx + Math.cos(a) * 10, -10 + Math.sin(a) * 10], 0.8, t('#2a2018')); } }
  ctx.restore();
}
/** 양 한 마리 */
const sheep = (v, x, y, s, d) => { const { ctx, t } = v; oval(ctx, x, y + s * 0.55, s * 1.1, s * 0.16, rgba('#000000', 0.16)); stroke(ctx, [x - s * 0.5, y, x - s * 0.5, y + s * 0.55], s * 0.16, t('#2a2420')); stroke(ctx, [x + s * 0.45, y, x + s * 0.45, y + s * 0.55], s * 0.16, t('#2a2420')); oval(ctx, x, y - s * 0.1, s, s * 0.6, t('#d8d2c2')); oval(ctx, x - s * 0.2, y - s * 0.3, s * 0.6, s * 0.4, t('#e6e0d0')); oval(ctx, x + d * s * 0.95, y - s * 0.3, s * 0.3, s * 0.26, t('#2a2420')); };
/** 소 옆모습 */
function cow(v, x, y, h, d, coat = '#4a3426') {
  const { ctx, t } = v, c = t(coat), dk = t(dark(coat, 0.4)); ctx.save(); ctx.translate(x, y); ctx.scale(d * h / 100, h / 100); ctx.lineCap = 'round';
  oval(ctx, 0, 3, 58, 5, rgba('#000000', 0.2));
  for (const [x0, x1, n] of [[-36, -44, 1], [34, 42, 1], [-24, -18, 0], [22, 14, 0]]) stroke(ctx, [x0, -44, x1, 0], n ? 7 : 6, n ? c : dk);
  oval(ctx, 0, -56, 50, 24, c); oval(ctx, 40, -66, 20, 20, c);
  poly(ctx, [48, -76, 76, -66, 80, -50, 66, -44, 50, -56], c); stroke(ctx, [56, -76, 62, -90, 70, -92], 2.6, t('#d8ccb0')); stroke(ctx, [-50, -62, -58, -30], 2.4, dk);
  ctx.restore();
}
/** 펠트 천막 */
function tent(v, x, y, w, lit) {
  const { ctx, t } = v, c = t('#b8ab90'), h = w * 0.34;
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h); ctx.quadraticCurveTo(x, y - h * 2.6, x + w / 2, y - h); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill();
  rect(ctx, x - w / 2, y - h - 2, w, 3, t('#7a2e24')); for (let i = 1; i < 6; i++) stroke(ctx, [x - w / 2 + (w * i) / 6, y - h, x - w / 2 + (w * i) / 6, y], 0.7, rgba('#000000', 0.15));
  rect(ctx, x - w * 0.09, y - h * 0.9, w * 0.18, h * 0.9, lit ? '#c88a48' : t('#2a1e16')); if (lit) glow(v, x, y - h * 0.5, w * 0.3, '#ffb060', 0.3);
  oval(ctx, x, y - h * 1.78, w * 0.06, 2, t('#3a2c20'));
}
/** 묶인 사람의 옷빛 */
const BOUND = '#8a7c66';

/* ---------- 봉기 ---------- */
/** 헛간의 밤 모임 */
function revoltSecret(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#2e2620', floor: '#221a14', fy: 170 });
  ctx.save(); zoom(v, 330, 240, 1.15);
  rect(ctx, 0, 30, VW, 7, '#1c1612'); for (const x of [120, 330, 540]) rect(ctx, x - 4, 30, 8, 142, '#1c1612');
  // 문틈으로 망보는 사람
  rect(ctx, 548, 70, 50, 102, '#0c0a0c'); rect(ctx, 548, 70, 14, 102, '#3a2c20'); person(v, 584, 204, 96, folk(3, { raw: true, f: 1, hood: true, rim: COLD, rimDir: 1 }));
  // 등불
  stroke(ctx, [330, 37, 330, 66], 1, '#1c1612'); rect(ctx, 325, 66, 10, 13, '#3a2c20'); rect(ctx, 327, 68, 6, 9, '#ffd890'); glow(v, 330, 72, 150, '#ffb060', 0.3); pool(v, 330, 204, 190, 26, '#ffb060', 0.2);
  // 짚더미와 기대 세운 연장
  poly(ctx, [40, 172, 60, 120, 150, 112, 180, 172], '#6a5a34'); for (let i = 0; i < 14; i++) stroke(ctx, [50 + i * 9, 170, 62 + i * 7, 122 + (i % 3) * 5], 0.7, 'rgba(0,0,0,.2)');
  const raw = { ...v, t: (c) => c }; fork(raw, 196, 172, 96, -0.12); fork(raw, 214, 172, 90, 0.06);
  ctx.strokeStyle = '#787c84'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(232, 86); ctx.quadraticCurveTo(262, 78, 268, 104); ctx.stroke(); stroke(ctx, [232, 172, 232, 84], 1.6, '#3a2c20');
  // 궤짝 위의 나, 둘러선 사람들
  rect(ctx, 304, 196, 52, 20, '#4a3a2a'); rect(ctx, 304, 196, 52, 3, '#5e4a36');
  [[176, 226, 0, 1], [224, 232, 1, 1], [262, 222, 2, 1], [404, 222, 4, -1], [446, 232, 5, -1], [492, 226, 0, -1]].forEach(([x, y, i, f]) => person(v, x, y, 90 + (i % 2) * 6, folk(i, { raw: true, f, hood: i === 2, arm: i === 4 ? 'chest' : undefined, rim: WARM, rimDir: f })));
  person(v, 330, 198, 98, mine(v, { raw: true, f: 0, arm: 'up', rim: WARM, rimDir: 1 }));
  ctx.restore(); finish(v, { inside: true });
}
/** 장원 문 앞으로 몰려간 사람들 */
function revoltMarch(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null;
  sky(v); far(v); const gy = () => 172; ground(v, gy);
  poly(ctx, [0, 186, VW, 186, VW, VH, 0, VH], t('#7c6c54'));
  // 장원 담과 문루
  rect(ctx, 400, 96, 240, 92, t('#8a8276')); for (let x = 400; x < 640; x += 22) rect(ctx, x, 88, 12, 9, t('#8a8276'));
  rect(ctx, 452, 60, 84, 128, t('#7c7468')); for (let x = 452; x < 536; x += 17) rect(ctx, x, 52, 10, 9, t('#7c7468'));
  ctx.fillStyle = t('#2a1e16'); ctx.beginPath(); ctx.moveTo(472, 188); ctx.lineTo(472, 134); ctx.arc(494, 134, 22, Math.PI, 0); ctx.lineTo(516, 188); ctx.fill(); for (let i = 0; i < 4; i++) stroke(ctx, [477 + i * 11, 118, 477 + i * 11, 188], 1.2, t('#4a4a50'));
  banner(v, 494, 54, 40, '#8a2f2a'); person(v, 470, 60, 30, { f: -1, cloth: '#5a5e66', hair: '#2a1e16' }); person(v, 520, 60, 30, { f: -1, cloth: '#5a5e66', hair: '#2a1e16' });
  for (const x of [560, 596, 628]) { person(v, x, 222, 92, { f: -1, cloth: '#5a5e66', hair: '#2a1e16', hat: true, rim, rimDir: -1 }); spear(v, x - 12, 222, 112, -0.08); }
  // 사람들
  crowd(v, 10, 250, 208, 10, 78, { rim, rimDir: 1 });
  for (const [x, tl] of [[40, -0.1], [92, 0.1], [150, -0.04], [206, 0.14]]) fork(v, x, 196, 92, tl);
  if (dim) for (const x of [70, 176]) torch(v, x, 190, 60, 6);
  banner(v, 124, 200, 108, '#6a5a3c', { d: 1, w: 36, len: 40 });
  [[250, 228, 0], [296, 234, 1], [222, 236, 4]].forEach(([x, y, i]) => person(v, x, y, 94, folk(i, { f: 1, arm: i === 1 ? 'up' : 'fwd', rim, rimDir: 1 })));
  fork(v, 262, 190, 70, 0.3);
  person(v, 346, 232, 100, mine(v, { f: 1, arm: 'up', rim, rimDir: 1 }));
  finish(v, { noLeaves: true });
}
/** 꺾인 뒤: 장터의 교수대 */
function revoltGallows(v) {
  const { ctx, t } = v;
  sky(v); far(v); townFar(v, 120, HZ + 20, { s: 0.6, n: 5 }); const gy = () => 172; ground(v, gy);
  poly(ctx, [0, 186, VW, 186, VW, VH, 0, VH], t('#746650'));
  const w = t('#3a2c20'), px = 330;
  rect(ctx, px - 110, 160, 220, 8, w); for (const x of [px - 104, px - 36, px + 30, px + 98]) rect(ctx, x, 168, 6, 40, t('#2a2018'));
  rect(ctx, px - 96, 44, 7, 118, w); rect(ctx, px + 89, 44, 7, 118, w); rect(ctx, px - 104, 40, 208, 7, w); stroke(ctx, [px - 92, 70, px - 66, 46], 4, w); stroke(ctx, [px + 92, 70, px + 66, 46], 4, w);
  for (const x of [px - 44, px, px + 44]) { stroke(ctx, [x, 47, x, 76], 1.2, t('#b8a880')); ctx.strokeStyle = t('#b8a880'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, 82, 4.4, 6, 0, 0, TAU); ctx.stroke(); }
  // 단 위에 묶여 선 사람들
  [[px - 44, 0], [px, 2], [px + 44, 5]].forEach(([x, i]) => person(v, x, 162, 74, { f: 0, cloth: BOUND, hair: HR[i], arm: 'chest' }));
  person(v, px - 82, 162, 78, { f: 1, cloth: '#1c1a1c', hair: '#1c1614', hood: true });
  for (const x of [150, 190, 470, 510]) { person(v, x, 216, 90, { f: x < px ? 1 : -1, cloth: '#5a5e66', hair: '#2a1e16', hat: true }); spear(v, x + (x < px ? 12 : -12), 216, 108, 0); }
  crowd(v, 20, 620, 238, 15, 72, { dark: 0.6, hoods: 0.3 });
  crows(v, 330, 30, 5, 110);
  if (v.variant === 'gallows-me') person(v, px + 132, 228, 92, mine(v, { f: -1, cloak: true }));
  finish(v, { noLeaves: true });
}

/* ---------- 개척 ---------- */
function frontierWagons(v) {
  const { ctx, t } = v; sky(v); far(v);
  const gy = (x) => 150 - fbm1(x / 190 + v.q, 3) * 10; ground(v, gy, { tufts: 220 });
  road(v, 250, 560, 150, { w: 130 });
  for (const [x, h] of [[30, 120], [600, 90], [70, 80]]) tree(v, x, gy(x) + 30, h);
  wagon(v, 520, 166, 0.4, -1); horseSil(v, 496, 167, 16, -1, '#4a3426');
  wagon(v, 436, 190, 0.7, -1); horseSil(v, 392, 192, 30, -1, '#5a3a24');
  wagon(v, 320, 226, 1.12, -1); cow(v, 246, 228, 44, -1, '#6a5038'); cow(v, 220, 232, 44, -1, '#4a3426');
  person(v, 384, 232, 78, folk(1, { f: -1 })); person(v, 408, 236, 54, folk(4, { f: -1, child: true }));
  person(v, 150, 236, 100, mine(v, { f: -1, stick: 'staff', cloak: true }));
  dogSil(v, 110, 238, 26, -1, '#6a5038');
  finish(v);
}
function frontierClearing(v) {
  const { ctx, t, R } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v);
  const gy = () => 160; ground(v, gy);
  for (let i = 0; i < 16; i++) tree(v, 10 + i * 42 + R() * 14, 168 + R() * 6, 120 + R() * 50, { dark: true });
  poly(ctx, [0, 178, VW, 178, VW, VH, 0, VH], t(v.P.snow ? '#c8ccd0' : '#7c6e52'));
  for (const [x, y] of [[70, 214], [150, 196], [560, 208], [490, 226], [610, 230]]) { rect(ctx, x - 7, y - 10, 14, 10, t('#5a4632')); oval(ctx, x, y - 10, 7, 2.6, t('#c8a878')); oval(ctx, x, y, 9, 2, rgba('#000000', 0.18)); }
  // 반쯤 올린 통나무집
  const hx = 300, hy = 204;
  for (let i = 0; i < 6; i++) { rect(ctx, hx, hy - 9 - i * 9, 150, 8, t(i % 2 ? '#6a5038' : '#5e4630')); oval(ctx, hx, hy - 5 - i * 9, 3, 4, t('#c8a878')); oval(ctx, hx + 150, hy - 5 - i * 9, 3, 4, t('#b89868')); }
  rect(ctx, hx + 58, hy - 40, 30, 40, t('#1e1612'));
  for (const k of [0, 50, 100, 150]) { stroke(ctx, [hx + k, hy - 54, hx + 75, hy - 104], 2.4, t('#4a3a2a')); } stroke(ctx, [hx - 6, hy - 54, hx + 156, hy - 54], 3, t('#4a3a2a'));
  palisade(v, 500, 640, 196, 44);
  // 모닥불, 사람들
  flame(v, 216, 222, 6); smoke(v, 216, 208, 90, 14, '#4a4640', 0.25);
  person(v, 262, 226, 92, folk(0, { f: 1, arm: 'up', rim, rimDir: -1 })); stroke(ctx, [272, 150, 292, 128], 2, t('#4a3a2a')); poly(ctx, [288, 122, 300, 126, 294, 136], t('#8a8e94'));
  person(v, 474, 228, 90, folk(4, { f: -1, rim, rimDir: -1 })); stroke(ctx, [440, 176, 500, 170], 6, t('#6a5038'));
  person(v, 180, 232, 86, folk(1, { f: 1, pose: 'sit', rim, rimDir: 1 }));
  person(v, 390, 236, 100, mine(v, { f: -1, arm: 'fwd', rim, rimDir: -1 }));
  finish(v, { noLeaves: true });
}
function frontierNatives(v) {
  const { ctx, t, R } = v; sky(v); far(v);
  const gy = (x) => 164 - fbm1(x / 170 + v.q, 3) * 6; ground(v, gy, { tufts: 200 });
  for (let i = 0; i < 9; i++) tree(v, 400 + i * 30 + R() * 12, 176 + R() * 30, 170 + R() * 60, { dark: true });
  ctx.fillStyle = rgba('#0c1410', 0.3); ctx.fillRect(400, 60, 240, 150);
  // 숲에서 나온 사람들
  [[430, 226, 0], [476, 220, 2], [520, 228, 4]].forEach(([x, y, i]) => { person(v, x, y, 96, { f: -1, cloth: ['#5a4a2e', '#3e4a34', '#4a3a2a'][i / 2], hair: '#1c1614', long: true, cloak: i !== 2, arm: i === 0 ? 'fwd' : undefined }); if (i) spear(v, x + 14, y, 116, 0.05); });
  // 사이에 놓인 것
  poly(ctx, [334, 226, 352, 214, 372, 216, 380, 228], t('#8a6a44')); stroke(ctx, [344, 218, 368, 224], 1, t('#3a2c20')); oval(ctx, 392, 228, 7, 4, t('#b8a070'));
  person(v, 280, 230, 100, mine(v, { f: 1, arm: 'fwd' }));
  person(v, 214, 234, 92, folk(0, { f: 1 })); person(v, 170, 228, 90, folk(1, { f: 1 }));
  wagon(v, 80, 222, 0.8, 1);
  finish(v);
}
function frontierRaid(v) {
  const { ctx, t, R } = v; sky(v); far(v);
  const gy = () => 166; ground(v, gy);
  for (let i = 0; i < 8; i++) tree(v, 10 + i * 30 + R() * 10, 176 + R() * 8, 140 + R() * 40, { dark: true });
  poly(ctx, [0, 184, VW, 184, VW, VH, 0, VH], t('#5a5040'));
  cottage(v, 500, 176, 80, 40, { roof: '#3a2e26' }); blaze(v, 500, 122, 70, 70); smoke(v, 500, 80, 80, 30, '#1c1a18', 0.4);
  cottage(v, 400, 174, 60, 32, { lit: true });
  palisade(v, 250, 640, 212, 60, '#3e3024'); rect(ctx, 250, 178, 390, 4, t('#2a2018'));
  pool(v, 480, 214, 200, 20, '#ff8a3a', 0.3);
  // 울 위의 사람들
  for (const [x, i] of [[330, 0], [410, 2], [560, 4]]) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, 156); ctx.clip(); person(v, x, 196, 80, folk(i, { f: -1, arm: i === 2 ? 'up' : 'fwd', rim: WARM, rimDir: 1 })); ctx.restore(); }
  // 불화살과 숲의 그림자들
  for (const [x0, y0, x1, y1] of [[120, 110, 268, 150], [90, 150, 300, 132], [150, 90, 420, 104]]) { stroke(ctx, [x0, y0, x1, y1], 1, rgba('#ffd090', 0.5)); glow(v, x1, y1, 9, '#ffb060', 0.8); }
  for (const [x, y] of [[60, 226], [118, 220], [170, 230]]) person(v, x, y, 88, { f: 1, cloth: '#141214', hair: '#0c0a0a', hood: true, arm: 'fwd', rim: 'rgba(255,150,80,.4)', rimDir: 1 });
  person(v, 236, 236, 100, mine(v, { f: -1, arm: 'up', rim: WARM, rimDir: 1 })); spear(v, 222, 180, 60, -0.5);
  finish(v, { noLeaves: true });
}

/* ---------- 목축·유목 ---------- */
function herdPasture(v) {
  const { ctx, R } = v; sky(v); far(v);
  const gy = (x) => 152 - fbm1(x / 210 + v.q, 3) * 12 - x * 0.02; ground(v, gy, { tufts: 240 });
  tree(v, 560, gy(560) + 26, 130);
  for (let i = 0; i < 20; i++) { const d = R(), x = 200 + R() * 400, y = gy(x) + 12 + d * 60; sheep(v, x, y, 5 + d * 8, R() < 0.5 ? 1 : -1); }
  if (v.variant === 'steed') { horseSil(v, 300, 232, 78, 1, '#6a3e22', { tack: true }); person(v, 220, 234, 100, mine(v, { f: 1, arm: 'fwd' })); }
  else { person(v, 140, 234, 100, mine(v, { f: 1, stick: 'staff', cloak: true })); dogSil(v, 196, 236, 30, 1, '#2e2a28', { ears: true }); }
  finish(v);
}
function herdCamp(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v);
  const gy = (x) => 158 - fbm1(x / 230 + v.q, 3) * 6; ground(v, gy, { tufts: 200 });
  tent(v, 480, 186, 150, dim); tent(v, 610, 176, 100, false); tent(v, 120, 180, 120, dim);
  for (const [x, c] of [[40, '#4a3020'], [250, '#6a3e22'], [286, '#2a2422']]) horseSil(v, x, 196, 40, x < 100 ? 1 : -1, c);
  stroke(ctx, [226, 170, 310, 170], 1.4, t('#3a2c20')); rect(ctx, 224, 166, 3, 30, t('#3a2c20')); rect(ctx, 308, 166, 3, 30, t('#3a2c20'));
  flame(v, 330, 226, 8); smoke(v, 330, 208, 100, 16, '#4a4640', 0.22); pool(v, 330, 230, 130, 14, '#ff9a48', 0.25);
  stroke(ctx, [312, 228, 348, 224], 3, t('#2a2018')); stroke(ctx, [316, 222, 346, 230], 3, t('#2a2018'));
  person(v, 270, 236, 88, folk(0, { f: 1, pose: 'sit', rim, rimDir: 1 })); person(v, 392, 236, 86, folk(1, { f: -1, pose: 'sit', rim, rimDir: -1 }));
  person(v, 430, 232, 94, folk(4, { f: -1, old: true, cloak: true, rim, rimDir: -1 }));
  person(v, 214, 236, 100, mine(v, { f: 1, arm: 'chest', rim, rimDir: 1 }));
  finish(v);
}
function herdRustle(v) {
  const { ctx, R } = v; sky(v); far(v);
  const gy = (x) => 160 - fbm1(x / 200 + v.q, 3) * 8; ground(v, gy, { tufts: 120 });
  for (let i = 0; i < 9; i++) { const x = 180 + i * 46 + R() * 18, y = 196 + (i % 3) * 14; cow(v, x, y, 38 + (i % 3) * 6, 1, ['#2a2422', '#3a2c24', '#4a3a30'][i % 3]); }
  for (let i = 0; i < 18; i++) glow(v, 160 + R() * 440, 214 + R() * 16, 16 + R() * 20, '#b8b0a0', 0.05);
  const rider = (x, y, h, me) => { horseSil(v, x, y, h, 1, '#1c1816'); ctx.save(); ctx.beginPath(); ctx.rect(x - h, y - h * 2.4, h * 2, h * 1.7); ctx.clip(); person(v, x - h * 0.04, y - h * 0.5, h * 1.1, me ? mine(v, { f: 1, cloak: true, arm: 'fwd', rim: COLD, rimDir: 1 }) : { f: 1, cloth: '#1c1a1c', hair: '#0c0a0a', hood: true, arm: 'up', rim: COLD, rimDir: 1 }); ctx.restore(); };
  rider(560, 198, 44, false); rider(110, 236, 70, true);
  finish(v, { noLeaves: true });
}

/* ---------- 망자와 저주 ---------- */
/** 옅은 사람 꼴 */
const wraith = (v, x, y, h, a = 0.5) => { const { ctx } = v; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) glow(v, x + Math.sin(i * 1.7) * h * 0.02, y - h * (0.08 + i * 0.11), h * (0.22 - i * 0.012), '#a8c4dc', a * 0.3, h * 0.16); glow(v, x, y - h * 0.86, h * 0.13, '#d0e0f0', a * 0.6, h * 0.15); ctx.fillStyle = rgba('#c8dcec', a * 0.16); ctx.beginPath(); ctx.moveTo(x - h * 0.16, y); ctx.quadraticCurveTo(x - h * 0.2, y - h * 0.5, x - h * 0.09, y - h * 0.78); ctx.lineTo(x + h * 0.09, y - h * 0.78); ctx.quadraticCurveTo(x + h * 0.2, y - h * 0.5, x + h * 0.1, y); ctx.fill(); ctx.restore(); oval(ctx, x, y - h * 0.85, h * 0.05, h * 0.07, 'rgba(8,12,22,.28)'); };
function hauntHouse(v) {
  const { ctx, t, R } = v; sky(v); far(v);
  const gy = (x) => 176 - Math.max(0, 1 - Math.abs((x - 400) / 260)) * 30; ground(v, gy, { tufts: 120 });
  // 기운 집
  ctx.save(); ctx.translate(400, 150); ctx.rotate(-0.03);
  rect(ctx, -70, -86, 140, 90, t('#4a443e')); for (let x = -64; x < 70; x += 13) stroke(ctx, [x, -86, x, 4], 0.7, rgba('#000000', 0.3));
  poly(ctx, [-82, -84, -30, -138, 44, -138, 84, -84], t('#2a2624')); poly(ctx, [0, -138, 14, -126, 30, -138], '#0a0a0c'); poly(ctx, [44, -138, 44, -164, 58, -164, 58, -122], t('#3a3632'));
  rect(ctx, -12, -44, 24, 48, '#0a0a0c'); stroke(ctx, [-12, -44, 6, 4], 2, t('#2a2018'));
  for (const [x, y, lit] of [[-52, -70, 0], [34, -70, 1], [-52, -30, 0], [34, -30, 0]]) { rect(ctx, x, y, 18, 24, lit ? '#9ab8c8' : '#0c0c10'); stroke(ctx, [x + 9, y, x + 9, y + 24], 1, '#1c1816'); if (!lit && x < 0 && y < -50) stroke(ctx, [x, y + 24, x + 18, y], 1.6, t('#2a2018')); }
  ctx.restore();
  glow(v, 441, 92, 26, '#a8c8e0', 0.5); wraith(v, 441, 104, 26, 0.7);
  tree(v, 520, 172, 170, { bare: true, dark: true }); tree(v, 250, 180, 110, { bare: true, dark: true }); crows(v, 520, 60, 3, 30);
  for (let x = 150; x < 640; x += 26) if ((x / 26 | 0) % 5 !== 2) { const lean = (R() - 0.5) * 0.3; stroke(ctx, [x, 214, x + lean * 26, 188], 2.4, t('#2a2420')); } stroke(ctx, [150, 198, 300, 200], 1.6, t('#2a2420')); stroke(ctx, [360, 199, 640, 197], 1.6, t('#2a2420'));
  for (let i = 0; i < 12; i++) glow(v, R() * VW, 206 + R() * 20, 40 + R() * 50, '#9aa8b8', 0.06);
  person(v, 176, 236, 98, mine(v, { f: 1, cloak: true, rim: WARM, rimDir: 1 })); rect(ctx, 196, 196, 6, 8, '#ffd890'); glow(v, 199, 200, 34, '#ffb060', 0.5);
  finish(v, { noLeaves: true });
}
function hauntGrave(v) {
  const { ctx, t, R } = v; sky(v); far(v);
  const gy = (x) => 164 - fbm1(x / 160 + v.q, 3) * 8; ground(v, gy, { tufts: 160 });
  tree(v, 86, 196, 190, { bare: true, dark: true });
  rect(ctx, 0, 150, VW, 3, t('#2a2624')); for (let x = 6; x < VW; x += 16) stroke(ctx, [x, 168, x, 140], 1.4, t('#2a2624'));
  const stone = (x, y, s, lean, kind) => { ctx.save(); ctx.translate(x, y); ctx.rotate(lean); ctx.fillStyle = t('#7a786e'); ctx.beginPath(); if (kind) { ctx.moveTo(-s * 0.4, 0); ctx.lineTo(-s * 0.4, -s * 0.8); ctx.arc(0, -s * 0.8, s * 0.4, Math.PI, 0); ctx.lineTo(s * 0.4, 0); } else ctx.rect(-s * 0.34, -s * 1.1, s * 0.68, s * 1.1); ctx.fill(); stroke(ctx, [-s * 0.2, -s * 0.7, s * 0.2, -s * 0.7], 0.8, rgba('#000000', 0.3)); stroke(ctx, [-s * 0.16, -s * 0.5, s * 0.16, -s * 0.5], 0.8, rgba('#000000', 0.3)); ctx.restore(); oval(ctx, x, y, s * 0.6, s * 0.1, rgba('#000000', 0.25)); };
  [[160, 184, 20, -0.1, 1], [236, 196, 26, 0.08, 0], [300, 180, 18, 0.14, 1], [460, 186, 22, -0.06, 0], [540, 200, 30, 0.1, 1], [600, 182, 18, -0.16, 1]].forEach((a) => stone(...a));
  // 파헤쳐진 자리와 일어서는 것
  oval(ctx, 392, 214, 44, 9, '#14100e'); ctx.fillStyle = t('#5a4a38'); ctx.beginPath(); ctx.ellipse(446, 216, 26, 9, 0, Math.PI, 0); ctx.fill(); stone(392, 200, 30, 0.2, 1);
  wraith(v, 392, 214, 116, 0.75);
  for (let i = 0; i < 10; i++) glow(v, R() * VW, 212 + R() * 18, 40 + R() * 50, '#9aa8b8', 0.06);
  person(v, 214, 236, 100, mine(v, { f: 1, cloak: true, arm: v.variant === 'grave-kneel' ? 'chest' : undefined, pose: v.variant === 'grave-kneel' ? 'kneel' : 'stand', rim: COLD, rimDir: 1 }));
  finish(v, { noLeaves: true });
}
function hauntSeance(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#2a2228', floor: '#1e181a', fy: 168 });
  ctx.save(); zoom(v, 330, 240, 1.2);
  windowAt(v, 150, 54, 34, 50); rect(ctx, 470, 40, 60, 90, '#1a1418'); for (let i = 0; i < 4; i++) rect(ctx, 474, 46 + i * 21, 52, 3, '#3a2c30');
  for (const [x, y, c] of [[484, 60, '#6a3a3a'], [500, 81, '#3a4a5a'], [512, 102, '#5a5a3a'], [490, 102, '#4a3a5a']]) rect(ctx, x, y - 12, 7, 12, c);
  const tx = 330, ty = 196;
  ctx.fillStyle = '#4a1e24'; ctx.beginPath(); ctx.ellipse(tx, ty - 22, 76, 15, 0, 0, TAU); ctx.fill(); poly(ctx, [tx - 76, ty - 22, tx + 76, ty - 22, tx + 60, ty + 22, tx - 60, ty + 22], '#3a161c'); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(tx, ty - 22, 60, 11, 0, 0, TAU); ctx.stroke();
  for (const x of [tx - 44, tx + 40, tx + 4]) candle(v, x, ty - 24 + (x === tx + 4 ? -6 : 0), 9);
  oval(ctx, tx - 6, ty - 20, 9, 3, '#d8d0b8'); oval(ctx, tx - 6, ty - 21, 5, 1.6, '#1a1418');
  wraith(v, tx, ty - 34, 92, v.variant === 'fraud' ? 0.22 : 0.6);
  if (v.variant === 'fraud') { stroke(ctx, [tx + 2, 0, tx + 6, ty - 110], 0.6, 'rgba(220,220,220,.5)'); }
  person(v, tx + 112, ty + 40, 104, { raw: true, f: -1, pose: 'sit', robe: true, veil: true, cloth: '#2a1e2e', hair: '#1c1614', female: true, arm: 'fwd', rim: WARM, rimDir: -1 });
  person(v, tx - 112, ty + 42, 104, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: WARM, rimDir: 1 }));
  ctx.restore(); finish(v, { inside: true });
}
function hauntItem(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#2c2622', floor: '#201a16', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.25);
  windowAt(v, 500, 56, 34, 48);
  const tx = 372, ty = 202, col = '#8ad0a0';
  // 벽의 그림자: 내 그림자가 아니다
  ctx.fillStyle = 'rgba(4,6,8,.5)'; ctx.beginPath(); ctx.ellipse(210, 62, 22, 27, 0, 0, TAU); ctx.fill(); poly(ctx, [160, 172, 172, 104, 190, 90, 232, 90, 250, 104, 262, 172], 'rgba(4,6,8,.5)'); stroke(ctx, [176, 110, 130, 70, 122, 44], 9, 'rgba(4,6,8,.5)'); stroke(ctx, [246, 110, 292, 76, 306, 52], 9, 'rgba(4,6,8,.5)');
  poly(ctx, [tx - 70, ty - 40, tx + 70, ty - 40, tx + 84, ty - 26, tx - 84, ty - 26], '#4e3a2a'); rect(ctx, tx - 84, ty - 26, 168, 6, '#30241a'); rect(ctx, tx - 76, ty - 20, 6, 42, '#281e16'); rect(ctx, tx + 70, ty - 20, 6, 42, '#281e16');
  // 천에 싸여 있던 손거울
  poly(ctx, [tx - 34, ty - 30, tx + 30, ty - 36, tx + 38, ty - 27, tx - 26, ty - 26], '#6a5e4c');
  ctx.save(); ctx.translate(tx, ty - 44); ctx.rotate(-0.25); oval(ctx, 0, -8, 11, 14, '#3a3226'); oval(ctx, 0, -8, 8.4, 11.4, '#1a2a24'); rect(ctx, -2, 5, 4, 16, '#3a3226'); ctx.restore();
  glow(v, tx - 2, ty - 52, 60, col, 0.4); oval(ctx, tx - 3, ty - 53, 3, 5, 'rgba(180,240,200,.7)');
  candle(v, tx + 56, ty - 40, 6);
  person(v, tx - 124, ty + 38, 110, mine(v, { raw: true, f: 1, arm: 'chest', rim: 'rgba(140,220,170,.45)', rimDir: 1 }));
  ctx.restore(); finish(v, { inside: true });
}

/* ---------- 광산 ---------- */
/** 산비탈과 갱 입구. 돌려주는 값: 입구 가운데 x, 바닥 y */
function adit(v, o = {}) {
  const { ctx, t, R } = v; sky(v); far(v);
  ctx.fillStyle = t('#6e6a64'); ctx.beginPath(); ctx.moveTo(180, 190); ctx.lineTo(250, 110); ctx.lineTo(330, 60); ctx.lineTo(420, 20); ctx.lineTo(520, 0); ctx.lineTo(VW, 0); ctx.lineTo(VW, 190); ctx.fill();
  for (let i = 0; i < 26; i++) { const x = 260 + R() * 380, y = 30 + R() * 150; if (y > 190 - (x - 180) * 0.9 + 20) stroke(ctx, [x, y, x + 14 + R() * 20, y + 6 + R() * 10], 1, rgba('#000000', 0.16)); }
  const gy = () => 184; ground(v, gy, { color: v.P.snow ? undefined : '#8a7c66', color2: '#5a5044', tufts: 40 });
  const ex = 440, ey = 190;
  poly(ctx, [ex - 30, ey, ex - 26, ey - 56, ex + 26, ey - 56, ex + 30, ey], '#0c0a0a');
  rect(ctx, ex - 36, ey - 60, 8, 62, t('#4a3a2a')); rect(ctx, ex + 28, ey - 60, 8, 62, t('#4a3a2a')); rect(ctx, ex - 42, ey - 68, 84, 9, t('#3e3024'));
  if (o.barred) { stroke(ctx, [ex - 30, ey - 44, ex + 30, ey - 12], 5, t('#5a4632')); stroke(ctx, [ex - 30, ey - 12, ex + 30, ey - 44], 5, t('#5a4632')); }
  // 선로와 광차, 버력 더미
  stroke(ctx, [ex - 12, ey, 250, 240], 1.6, t('#3a3632')); stroke(ctx, [ex + 12, ey, 330, 240], 1.6, t('#3a3632')); for (let i = 0; i < 6; i++) { const k = i / 6, y = ey + k * 50; stroke(ctx, [ex - 14 - k * 170, y, ex + 14 - k * 96, y], 2, t('#4a3a2a')); }
  ctx.fillStyle = t('#5e5a54'); ctx.beginPath(); ctx.ellipse(580, 200, 70, 30, 0, Math.PI, 0); ctx.fill(); for (let i = 0; i < 20; i++) oval(ctx, 520 + R() * 120, 180 + R() * 20, 3 + R() * 4, 2 + R() * 2, t(R() < 0.5 ? '#7a766e' : '#4a4640'));
  cottage(v, 120, 190, 80, 36, { roof: '#3a2e26', wall: '#7a6a54' });
  return [ex, ey];
}
const cart = (v, x, y, full) => { const { ctx, t } = v; poly(ctx, [x - 20, y - 26, x + 20, y - 26, x + 15, y - 8, x - 15, y - 8], t('#4a3a2a')); if (full) { ctx.fillStyle = t('#5e5a54'); ctx.beginPath(); ctx.ellipse(x, y - 26, 19, 8, 0, Math.PI, 0); ctx.fill(); oval(ctx, x - 5, y - 30, 2, 1.4, t('#c8a860')); } for (const k of [-10, 10]) { ctx.strokeStyle = t('#1c1816'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + k, y - 5, 5, 0, TAU); ctx.stroke(); } };
function mineAdit(v) {
  const { ctx } = v, [ex] = adit(v);
  cart(v, 372, 222, true);
  person(v, ex + 4, 196, 60, folk(0, { f: -1 })); pick(v, ex - 6, 172, 26, -0.6);
  person(v, 520, 232, 92, folk(4, { f: -1, pose: 'bow' })); person(v, 214, 232, 90, folk(2, { f: 1, hat: true }));
  person(v, 290, 236, 100, mine(v, { f: 1, arm: 'fwd' }));
  finish(v, { noLeaves: true });
}
function minePicket(v) {
  const { ctx } = v, dim = dimOf(v), rim = dim ? WARM : null; adit(v, { barred: true });
  [[330, 224, 0], [372, 230, 2], [414, 222, 3], [456, 230, 5], [498, 224, 0], [540, 232, 2]].forEach(([x, y, i], n) => { person(v, x, y, 92, folk(i, { f: -1, arm: 'chest', hat: n % 3 === 0, rim, rimDir: -1 })); if (n % 2) pick(v, x + 12, y, 58, 0.05); });
  if (dim) torch(v, 580, 210, 66, 6);
  person(v, 150, 228, 96, { f: 1, cloth: '#3a2a3e', hair: '#5a4030', hat: true, arm: 'fwd', rim, rimDir: 1 });
  for (const x of [96, 60]) { person(v, x, 232, 92, { f: 1, cloth: '#5a5e66', hair: '#2a1e16', hat: true, rim, rimDir: 1 }); spear(v, x + 12, 232, 110, 0.04); }
  person(v, 284, 236, 100, mine(v, { f: -1, arm: 'chest', rim, rimDir: -1 }));
  finish(v, { noLeaves: true });
}
function mineCollapse(v) {
  const { ctx, R, t } = v, [ex, ey] = adit(v);
  for (let i = 0; i < 26; i++) glow(v, ex - 40 + R() * 90, ey - 20 - R() * 110, 24 + R() * 34, '#b8a890', 0.09);
  for (let i = 0; i < 12; i++) { const x = ex - 26 + R() * 52, s = 4 + R() * 6; poly(ctx, [x - s, ey, x - s * 0.4, ey - s, x + s * 0.7, ey - s * 0.7, x + s, ey], t('#7a766e')); }
  cart(v, 350, 226, false);
  person(v, ex - 56, 206, 78, folk(0, { f: 1, pose: 'bow' })); person(v, ex + 60, 208, 78, folk(2, { f: -1, arm: 'fwd' })); stroke(ctx, [ex + 30, 176, ex + 70, 168], 5, t('#5a4632'));
  // 들것
  stroke(ctx, [170, 226, 270, 226], 2, t('#3a2c20')); lying(v, 180, 224, 78, { cover: '#8a8474' }); person(v, 160, 236, 86, folk(4, { f: 1, pose: 'kneel' }));
  person(v, 566, 232, 88, folk(1, { f: -1, arm: 'chest', veil: true })); person(v, 600, 236, 58, folk(3, { f: -1, child: true }));
  person(v, 300, 236, 100, mine(v, { f: 1, arm: 'fwd' }));
  finish(v, { noLeaves: true });
}
function mineDeep(v) {
  const { ctx, R } = v; rect(ctx, 0, 0, VW, VH, '#0e0c0c');
  // 굴: 안으로 좁아지는 버팀목
  ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, 30); ctx.quadraticCurveTo(200, -10, 420, 40); ctx.lineTo(VW, 20); ctx.lineTo(VW, VH); ctx.fill();
  ctx.fillStyle = '#1a1614'; ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, 196); ctx.quadraticCurveTo(300, 180, VW, 204); ctx.lineTo(VW, VH); ctx.fill();
  for (let i = 0; i < 60; i++) { const x = R() * VW, y = 30 + R() * 160; stroke(ctx, [x, y, x + R() * 10, y + R() * 7], 1, 'rgba(0,0,0,.25)'); }
  for (let i = 0; i < 4; i++) { const k = 1 - i * 0.22, x = 520 - i * 92, w = 70 * k, h = 150 * k, y = 200 - i * 3; rect(ctx, x - w, y - h, 7 * k, h, '#4a3a2a'); rect(ctx, x + w - 7 * k, y - h, 7 * k, h, '#3e3024'); rect(ctx, x - w - 6 * k, y - h - 7 * k, w * 2 + 12 * k, 8 * k, '#3e3024'); }
  ctx.fillStyle = '#050404'; ctx.beginPath(); ctx.moveTo(166, 198); ctx.lineTo(168, 136); ctx.quadraticCurveTo(196, 108, 224, 136); ctx.lineTo(226, 198); ctx.fill(); rect(ctx, 160, 128, 6, 70, '#3a2e22'); rect(ctx, 226, 128, 6, 70, '#32281e'); rect(ctx, 154, 122, 84, 7, '#32281e');
  // 광맥
  const vein = v.variant === 'knock' ? '#8ab0d0' : '#d8b860';
  for (let i = 0; i < 46; i++) { const k = R(), band = i % 2, x = 536 + k * 100 + (R() - 0.5) * 10, y = (band ? 70 : 110) + k * 60 + (R() - 0.5) * 12, l = 2 + R() * 6; stroke(ctx, [x, y, x + l, y + l * 0.6], 0.8 + R() * 1.2, rgba(vein, 0.35 + R() * 0.5)); } glow(v, 570, 110, 70, vein, 0.14);
  // 등불
  rect(ctx, 404, 150, 8, 11, '#3a2c20'); rect(ctx, 406, 152, 4, 7, '#ffd890'); stroke(ctx, [408, 150, 408, 132], 1, '#1c1612'); glow(v, 408, 156, 150, '#ffb060', 0.34); pool(v, 420, 214, 170, 18, '#ffb060', 0.2);
  if (v.variant === 'knock') { glow(v, 196, 150, 40, '#8ab0d0', 0.18); for (const [x, y] of [[188, 144], [204, 146]]) oval(ctx, x, y, 1.6, 1.2, 'rgba(180,220,255,.8)'); }
  const raw = { ...v, t: (c) => c };
  person(v, 498, 228, 96, folk(0, { raw: true, f: 1, arm: 'up', rim: WARM, rimDir: -1 })); pick(raw, 516, 150, 34, 0.9);
  cart(raw, 300, 236, true);
  person(v, 372, 236, 100, mine(v, { raw: true, f: v.variant === 'knock' ? -1 : 1, arm: 'chest', rim: WARM, rimDir: v.variant === 'knock' ? -1 : 1 }));
  finish(v, { inside: true });
}

/* ---------- 노예 ---------- */
function bondMarket(v) {
  const { ctx, t } = v; sky(v); far(v);
  rect(ctx, 0, 132, VW, 60, t('#4e6478')); for (const [x, h] of [[70, 130], [120, 100], [560, 120]]) { stroke(ctx, [x, 150, x, 150 - h], 2, t('#2a2018')); stroke(ctx, [x - 20, 150 - h * 0.7, x + 20, 150 - h * 0.72], 1.4, t('#2a2018')); poly(ctx, [x - 30, 150, x + 34, 150, x + 24, 162, x - 22, 162], t('#3a2c22')); }
  poly(ctx, [0, 164, VW, 164, VW, VH, 0, VH], t('#9a8c74')); for (let x = 0; x < VW; x += 40) stroke(ctx, [x, 164, x - 30, VH], 0.8, rgba('#000000', 0.1));
  rect(ctx, 430, 70, 210, 96, t('#a89878')); poly(ctx, [420, 72, 640, 50, 640, 72], t('#5a3a30')); for (const x of [470, 540, 610]) { ctx.fillStyle = t('#2a1e16'); ctx.beginPath(); ctx.moveTo(x - 12, 166); ctx.lineTo(x - 12, 120); ctx.arc(x, 120, 12, Math.PI, 0); ctx.lineTo(x + 12, 166); ctx.fill(); }
  // 단과 팔리는 사람들
  const bx = 330, by = 190; rect(ctx, bx - 100, by, 200, 22, t('#5a4632')); rect(ctx, bx - 104, by - 4, 208, 5, t('#6e5840')); for (let x = bx - 90; x < bx + 100; x += 22) stroke(ctx, [x, by + 2, x, by + 22], 0.8, rgba('#000000', 0.2));
  [[bx - 40, 2, false], [bx, 5, true], [bx + 40, 0, false]].forEach(([x, i, f]) => person(v, x, by - 2, 84, { f: 0, cloth: BOUND, hair: HR[i], female: f, long: f, arm: 'chest' }));
  stroke(ctx, [bx - 40, by - 34, bx - 20, by - 26, bx, by - 34, bx + 20, by - 26, bx + 40, by - 34], 1.2, t('#3a3a40'));
  rect(ctx, bx - 92, by - 62, 4, 60, t('#3a2c20')); for (let i = 0; i < 3; i++) oval(ctx, bx - 90, by - 44 + i * 12, 3, 4, t('#3a3a40'));
  person(v, bx + 82, by - 2, 88, { f: -1, cloth: '#6a2e2a', hair: '#1c1614', hat: true, arm: 'up' }); stroke(ctx, [bx + 70, by - 80, bx + 56, by - 100], 2, t('#3a2c20'));
  crowd(v, 150, 520, 238, 9, 76, { dark: 0.5 });
  person(v, 120, 236, 100, mine(v, { f: 1, cloak: true }));
  finish(v, { noLeaves: true });
}
function bondCoffle(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v); townFar(v, 560, HZ + 16, { s: 0.5, n: 4 });
  const gy = (x) => 162 - fbm1(x / 200 + v.q, 3) * 8; ground(v, gy, { tufts: 160 });
  poly(ctx, [0, 204, VW, 196, VW, VH, 0, VH], t(v.P.snow ? '#b9b3a8' : '#8a7858'));
  tree(v, 70, 198, 150, { bare: true });
  const xs = [180, 232, 284, 336, 388, 440];
  xs.forEach((x, i) => { if (i === 2) person(v, x, 232, 94, mine(v, { f: 1, arm: 'chest', cloth: BOUND, rim, rimDir: 1 })); else person(v, x, 232 - (i % 2) * 3, 88 + (i % 3) * 3, { f: 1, cloth: BOUND, hair: HR[i], female: i === 4, long: i === 4, child: false, arm: 'chest', old: i === 5, rim, rimDir: 1 }); });
  stroke(ctx, xs.flatMap((x, i) => [x + 4, 186 - (i % 2) * 3, x + 30, 194]).slice(0, -2), 1.3, t('#2e2e34'));
  horseSil(v, 540, 232, 60, 1, '#2a2422'); ctx.save(); ctx.beginPath(); ctx.rect(480, 60, 120, 138); ctx.clip(); person(v, 538, 202, 70, { f: -1, cloth: '#3a2a26', hair: '#1c1614', hat: true, arm: 'fwd', rim, rimDir: 1 }); ctx.restore();
  ctx.strokeStyle = t('#1c1612'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(520, 152); ctx.quadraticCurveTo(480, 120, 462, 160); ctx.stroke();
  person(v, 112, 236, 96, { f: 1, cloth: '#3a2a26', hair: '#3a2a1e', hat: true, rim, rimDir: 1 }); spear(v, 126, 236, 112, 0.05);
  finish(v, { noLeaves: true });
}
function bondYard(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v);
  const gy = () => 170; ground(v, gy); poly(ctx, [0, 186, VW, 186, VW, VH, 0, VH], t('#8e7e62'));
  // 주인집: 기둥 늘어선 현관과 계단
  rect(ctx, 330, 60, 310, 128, t('#b8ac94')); poly(ctx, [316, 62, 640, 30, 640, 62], t('#5a3a30'));
  for (let x = 356; x < 640; x += 62) { rect(ctx, x, 84, 12, 96, t('#d0c6ae')); rect(ctx, x - 3, 80, 18, 5, t('#a89c84')); }
  rect(ctx, 460, 112, 44, 68, t('#2a1e16')); if (dim) { rect(ctx, 466, 118, 32, 62, 'rgba(255,170,90,.3)'); glow(v, 482, 150, 50, '#ffb060', 0.3); }
  for (let i = 0; i < 4; i++) rect(ctx, 340 - i * 8, 180 + i * 6, 300 + i * 8, 6, t(i % 2 ? '#a89c84' : '#948a74'));
  tree(v, 70, 196, 170);
  person(v, 482, 184, 84, { f: -1, cloth: '#4a2e4a', hair: '#8a6a44', robe: true, arm: 'chest', rim, rimDir: -1 });
  person(v, 396, 214, 92, { f: -1, cloth: '#3a2a26', hair: '#1c1614', hat: true, arm: 'fwd', rim, rimDir: -1 }); stroke(ctx, [378, 168, 352, 160, 340, 176], 1.2, t('#1c1612'));
  // 짐을 진 사람들
  const k = v.variant === 'yard-master';
  if (k) { person(v, 300, 232, 100, mine(v, { f: 1, arm: 'chest', rim, rimDir: 1 })); person(v, 220, 234, 90, { f: 1, cloth: BOUND, hair: HR[2], pose: 'bow' }); oval(ctx, 232, 158, 20, 12, t('#8a7a5c'), -0.2); stroke(ctx, [246, 150, 252, 144], 2, t('#5a4a34')); }
  else { person(v, 290, 234, 98, mine(v, { f: 1, pose: 'bow', cloth: BOUND, rim, rimDir: 1 })); oval(ctx, 304, 154, 21, 13, t('#8a7a5c'), -0.2); stroke(ctx, [320, 146, 326, 140], 2, t('#5a4a34')); person(v, 200, 232, 90, { f: 1, cloth: BOUND, hair: HR[2], pose: 'bow' }); oval(ctx, 214, 158, 20, 12, t('#948464'), -0.2); stroke(ctx, [228, 150, 234, 144], 2, t('#5a4a34')); }
  person(v, 130, 236, 86, { f: 1, cloth: BOUND, hair: HR[5], female: true, long: true, pose: 'kneel' }); oval(ctx, 156, 232, 12, 5, t('#5a4632'));
  finish(v);
}
function bondFree(v) {
  const { ctx, t } = v; sky(v); far(v); townFar(v, 120, HZ + 18, { s: 0.5, n: 4 });
  glow(v, 470, HZ - 4, 190, '#ffe0a8', 0.35);
  const gy = (x) => 160 - fbm1(x / 210 + v.q, 3) * 8; ground(v, gy, { tufts: 220 });
  road(v, 240, 470, 152, { w: 120 });
  tree(v, 580, 196, 160);
  // 길에 버려진 쇠고랑
  ctx.strokeStyle = t('#3a3a40'); ctx.lineWidth = 2.4; for (const [x, y, r] of [[212, 226, 0.3], [250, 232, -0.2]]) { ctx.beginPath(); ctx.ellipse(x, y, 9, 4, r, 0.5, TAU); ctx.stroke(); } stroke(ctx, [220, 227, 228, 231, 234, 228, 242, 232], 1.6, t('#3a3a40'));
  person(v, 352, 222, 96, mine(v, { f: 1, cloak: v.variant !== 'free-kin', rim: 'rgba(255,220,160,.5)', rimDir: 1 }));
  if (v.variant === 'free-kin') { person(v, 420, 214, 84, { f: -1, cloth: v.other.cloth, hair: v.other.hair, female: v.other.female, long: v.other.long, arm: 'fwd', rim: 'rgba(255,220,160,.5)', rimDir: 1 }); person(v, 446, 216, 52, folk(3, { f: -1, child: true })); }
  finish(v);
}

/* ---------- 큰 한탕 ---------- */
function heistPlan(v) {
  const { ctx } = v, split = v.variant === 'split'; room(v, { wall: '#2e2a28', floor: '#221e1c', fy: 170 });
  ctx.save(); zoom(v, 330, 240, 1.18);
  for (const x of [70, 118, 560]) { oval(ctx, x, 150, 22, 30, '#4a3a2a'); for (const k of [-16, 0, 16]) stroke(ctx, [x - 21, 150 + k, x + 21, 150 + k], 1.6, '#2a2a2e'); }
  ctx.fillStyle = '#0c0a0a'; ctx.beginPath(); ctx.moveTo(470, 172); ctx.lineTo(470, 96); ctx.arc(494, 96, 24, Math.PI, 0); ctx.lineTo(518, 172); ctx.fill(); for (let i = 0; i < 5; i++) rect(ctx, 474, 160 - i * 12, 40 - i * 6, 12, i % 2 ? '#2a2624' : '#34302c');
  const tx = 320, ty = 200;
  poly(ctx, [tx - 80, ty - 40, tx + 80, ty - 40, tx + 96, ty - 24, tx - 96, ty - 24], '#4e3a2a'); rect(ctx, tx - 96, ty - 24, 192, 6, '#30241a'); rect(ctx, tx - 86, ty - 18, 7, 42, '#281e16'); rect(ctx, tx + 80, ty - 18, 7, 42, '#281e16');
  candle(v, tx + 58, ty - 34, 10); pool(v, tx + 20, ty - 40, 150, 56, '#ffb060', 0.24);
  if (split) { for (const [x, n] of [[tx - 50, 5], [tx - 14, 7], [tx + 22, 4]]) for (let i = 0; i < n; i++) { oval(ctx, x + (i % 2) * 3, ty - 30 - i * 2.2, 7, 2.2, i % 2 ? '#d8b040' : '#c09a30'); } glow(v, tx - 14, ty - 38, 40, '#ffd070', 0.25); poly(ctx, [tx + 34, ty - 30, tx + 50, ty - 44, tx + 62, ty - 30], '#5a4632'); }
  else { poly(ctx, [tx - 56, ty - 37, tx + 30, ty - 39, tx + 38, ty - 27, tx - 60, ty - 26], '#cfc2a2'); ctx.strokeStyle = '#3a2e26'; ctx.lineWidth = 0.8; ctx.strokeRect(tx - 40, ty - 36, 30, 7); ctx.strokeRect(tx - 6, ty - 36, 22, 5); stroke(ctx, [tx - 48, ty - 29, tx - 20, ty - 31, tx - 4, ty - 28, tx + 22, ty - 31], 0.8, '#7a2018'); oval(ctx, tx + 24, ty - 31, 2, 1.2, '#7a2018'); }
  [[tx - 132, ty + 36, 3, 1], [tx + 128, ty + 36, 0, -1], [tx + 74, ty + 4, 4, -1]].forEach(([x, y, i, f]) => person(v, x, y, 100, folk(i, { raw: true, f, hood: i !== 0, arm: i === 0 ? 'chest' : undefined, rim: WARM, rimDir: f })));
  person(v, tx - 70, ty + 6, 100, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: 1 }));
  ctx.restore(); finish(v, { inside: true });
}
function heistRoof(v) {
  const { ctx, t, R } = v; sky(v);
  // 먼 지붕들
  for (let i = 0; i < 14; i++) { const x = i * 50 + R() * 20, h = 40 + R() * 50; poly(ctx, [x - 26, VH, x - 26, 190 - h, x, 170 - h, x + 26, 190 - h, x + 26, VH], t(R() < 0.5 ? '#2a2a34' : '#22222c')); if (R() < 0.4) rect(ctx, x - 6, 200 - h, 6, 8, '#d8a050'); }
  poly(ctx, [520, VH, 520, 60, 548, 30, 576, 60, 576, VH], t('#1e1e28')); rect(ctx, 542, 76, 12, 18, '#d8a050');
  // 앞 지붕과 큰 집 벽
  poly(ctx, [0, VH, 0, 170, 150, 120, 330, 176, 330, VH], t('#3a3438')); for (let i = 0; i < 9; i++) stroke(ctx, [0 + i * 10, 172 + i * 8, 150, 124 + i * 8, 330 - i * 12, 180 + i * 8], 0.8, rgba('#000000', 0.3));
  rect(ctx, 96, 96, 22, 40, t('#2e2a2c'));
  rect(ctx, 330, 80, 150, VH - 80, t('#4a4448')); rect(ctx, 322, 74, 166, 8, t('#34303a'));
  for (const [x, y, lit] of [[362, 110, 0], [424, 110, 1], [362, 176, 0], [424, 176, 0]]) { rect(ctx, x, y, 30, 40, lit ? '#e0a850' : '#14121a'); stroke(ctx, [x + 15, y, x + 15, y + 40], 1.4, '#1a1618'); if (lit) glow(v, x + 15, y + 20, 40, '#ffb060', 0.35); }
  // 밧줄
  stroke(ctx, [300, 170, 334, 76, 346, 78, 348, 170], 1.2, t('#b8a880'));
  ctx.save(); ctx.beginPath(); ctx.rect(330, 120, 40, 80); ctx.clip(); person(v, 350, 204, 70, { f: -1, cloth: '#141218', hair: '#0c0a0a', hood: true, arm: 'up', rim: COLD, rimDir: -1 }); ctx.restore();
  person(v, 262, 166, 76, { f: 1, cloth: '#16141a', hair: '#0c0a0a', hood: true, pose: 'kneel', rim: COLD, rimDir: -1 });
  person(v, 200, 152, 84, mine(v, { f: 1, pose: 'kneel', hood: true, arm: 'fwd', cloth: '#1c1a22', rim: COLD, rimDir: -1 }));
  // 아래의 순찰
  person(v, 560, 240, 50, { f: -1, cloth: '#5a5e66', hair: '#2a1e16', hat: true }); glow(v, 548, 214, 26, '#ffb060', 0.5); rect(ctx, 546, 212, 4, 5, '#ffd890');
  finish(v, { noLeaves: true });
}
function heistVault(v) {
  const { ctx, R } = v; room(v, { wall: '#34322e', floor: '#24221e', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.15);
  // 쇠문
  rect(ctx, 250, 40, 150, 134, '#0a0a0c'); poly(ctx, [400, 40, 470, 54, 470, 186, 400, 174], '#4a4a52'); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) oval(ctx, 420 + j * 34, 70 + i * 30, 2.6, 2.6, '#2a2a30'); rect(ctx, 400, 100, 70, 5, '#34343c'); ctx.strokeStyle = '#8a8e94'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(436, 124, 12, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) stroke(ctx, [436, 124, 436 + Math.cos(i * 1.57 + 0.5) * 16, 124 + Math.sin(i * 1.57 + 0.5) * 16], 2, '#8a8e94');
  rect(ctx, 240, 34, 170, 7, '#4a463e'); rect(ctx, 240, 34, 10, 140, '#4a463e');
  // 안쪽의 궤와 자루
  for (const [x, y, w, open] of [[286, 172, 44, 1], [344, 170, 36, 0], [312, 150, 30, 0]]) { rect(ctx, x - w / 2, y - 22, w, 22, '#5a4028'); rect(ctx, x - w / 2, y - 14, w, 3, '#8a7038'); if (open) { poly(ctx, [x - w / 2, y - 22, x - w / 2 + 4, y - 40, x + w / 2 + 4, y - 40, x + w / 2, y - 22], '#4a3420'); ctx.fillStyle = '#d8b040'; ctx.beginPath(); ctx.ellipse(x, y - 22, w / 2 - 3, 5, 0, Math.PI, 0); ctx.fill(); glow(v, x, y - 24, 30, '#ffd070', 0.4); for (let i = 0; i < 6; i++) oval(ctx, x - 14 + R() * 28, y - 24 - R() * 3, 2, 1, '#f0d070'); } else oval(ctx, x, y - 12, 2.4, 3, '#2a2018'); }
  rect(ctx, 150, 196, 8, 11, '#3a2c20'); rect(ctx, 152, 198, 4, 7, '#ffd890'); glow(v, 154, 200, 130, '#ffb060', 0.32); pool(v, 170, 214, 150, 16, '#ffb060', 0.22);
  if (v.variant === 'vault-twist') { person(v, 540, 236, 100, { raw: true, f: -1, cloth: '#5a5e66', hair: '#2a1e16', hat: true, arm: 'fwd', rim: WARM, rimDir: -1 }); glow(v, 520, 180, 40, '#ffb060', 0.35); }
  person(v, 196, 220, 92, folk(3, { raw: true, f: 1, hood: true, rim: WARM, rimDir: -1 }));
  person(v, 262, 206, 96, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', hood: true, rim: WARM, rimDir: -1 }));
  ctx.restore(); finish(v, { inside: true });
}

/* ---------- 재판정 ---------- */
/** variant: dock 내가 피고석, plead 내가 말하는 쪽, bench 내가 판관 */
function trial(v) {
  const { ctx } = v, k = v.variant ?? 'dock'; room(v, { wall: '#5a5046', floor: '#3a3028', fy: 176 });
  windowAt(v, 110, 26, 40, 84, { arch: true }); windowAt(v, 530, 26, 40, 84, { arch: true });
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; poly(ctx, [90, 110, 130, 110, 250, 240, 150, 240], 'rgba(255,236,190,.07)'); poly(ctx, [510, 110, 550, 110, 500, 240, 400, 240], 'rgba(255,236,190,.05)'); ctx.restore();
  // 걸개와 높은 판관석
  poly(ctx, [296, 6, 364, 6, 364, 76, 330, 90, 296, 76], '#6a2420'); ctx.strokeStyle = '#c9a25a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(316, 36); ctx.lineTo(344, 36); ctx.moveTo(330, 26); ctx.lineTo(330, 60); ctx.stroke(); for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(330 + d * 14, 44, 6, 0, Math.PI); ctx.stroke(); stroke(ctx, [330 + d * 14, 36, 330 + d * 14, 44], 1, '#c9a25a'); }
  const bench = (x, w, h) => { rect(ctx, x - w / 2, 176 - h, w, h, '#3e2e22'); rect(ctx, x - w / 2 - 4, 176 - h - 5, w + 8, 6, '#54402e'); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + 8, 176 - h + 8, w - 16, h - 14); };
  const seat = (x, o) => { ctx.save(); ctx.beginPath(); ctx.rect(x - 40, 0, 80, 176 - 62); ctx.clip(); person(v, x, 172, 104, { raw: true, f: 0, robe: true, ...o }); ctx.restore(); };
  seat(250, { cloth: '#2a2a34', hair: '#8a8478', old: true }); seat(410, { cloth: '#2a2a34', hair: '#3a2a1e' });
  if (k === 'bench') seat(330, mine(v, { cloth: '#4a1c1c', arm: 'chest' })); else seat(330, { cloth: '#4a1c1c', hair: '#c8c4bc', old: true, arm: 'chest' });
  bench(330, 260, 62); rect(ctx, 316, 108, 28, 4, '#cfc2a2'); stroke(ctx, [370, 110, 384, 104], 3, '#2a1c14'); rect(ctx, 380, 99, 9, 7, '#2a1c14');
  // 창 든 사람들
  const raw = { ...v, t: (c) => c };
  for (const x of [170, 490]) { person(v, x, 206, 96, { raw: true, f: x < 330 ? 1 : -1, cloth: '#5a5e66', hair: '#2a1e16', hat: true }); spear(raw, x + (x < 330 ? -12 : 12), 206, 118, 0); }
  // 피고석 난간
  const dx = 250, dy = 218;
  const dock = () => { rect(ctx, dx - 30, dy - 34, 60, 4, '#54402e'); for (let i = 0; i < 5; i++) rect(ctx, dx - 27 + i * 13, dy - 30, 3, 30, '#3e2e22'); rect(ctx, dx - 32, dy, 64, 5, '#3e2e22'); };
  const ot = { cloth: v.other.cloth, hair: v.other.hair, female: v.other.female, long: v.other.long };
  if (k === 'dock') { person(v, dx, dy + 2, 100, mine(v, { raw: true, f: 1, arm: 'chest' })); dock(); person(v, 410, dy + 6, 100, { raw: true, f: -1, ...ot, arm: 'up' }); }
  else if (k === 'plead') { person(v, dx, dy + 2, 96, { raw: true, f: 1, ...ot, arm: 'chest' }); dock(); person(v, 410, dy + 6, 102, mine(v, { raw: true, f: -1, arm: 'up' })); }
  else { person(v, dx, dy + 2, 96, { raw: true, f: 1, cloth: BOUND, hair: HR[2], arm: 'chest' }); dock(); person(v, 410, dy + 6, 100, { raw: true, f: -1, ...ot, arm: 'up' }); }
  // 서기와 방청석
  rect(ctx, 530, 196, 60, 5, '#54402e'); rect(ctx, 536, 201, 5, 30, '#3e2e22'); rect(ctx, 580, 201, 5, 30, '#3e2e22'); rect(ctx, 546, 192, 16, 4, '#cfc2a2'); person(v, 560, 244, 92, { raw: true, f: -1, pose: 'sit', cloth: '#3a3a44', hair: '#5a4030', arm: 'fwd' });
  ctx.save(); ctx.translate(0, 44); crowd(v, 20, 620, 236, 12, 70, { dark: 0.62, hoods: 0.1 }); ctx.restore();
  finish(v, { inside: true });
}

/* ---------- 요리사 ---------- */
/** 큰 부엌. variant kitchen: 화덕과 도마, create: 빈 솥 앞에 혼자 */
function cuisineKitchen(v) {
  const { ctx } = v, alone = v.variant === 'create'; room(v, { wall: '#4a4038', floor: '#2e2620', fy: 174 });
  ctx.save(); zoom(v, 330, 240, 1.12);
  windowAt(v, 560, 40, 36, 54);
  // 화덕: 돌 아치와 불, 걸어 둔 솥
  rect(ctx, 60, 40, 190, 136, '#5a5248'); rect(ctx, 50, 34, 210, 10, '#6a6258'); poly(ctx, [80, 34, 100, 0, 210, 0, 230, 34], '#4e463e');
  ctx.fillStyle = '#0e0a08'; ctx.beginPath(); ctx.moveTo(86, 176); ctx.lineTo(86, 110); ctx.quadraticCurveTo(155, 62, 224, 110); ctx.lineTo(224, 176); ctx.fill();
  if (!alone) { blaze(v, 155, 174, 70, 44); } else { for (let i = 0; i < 5; i++) glow(v, 130 + i * 12, 170, 10, '#ff7030', 0.35); }
  glow(v, 155, 150, alone ? 90 : 170, '#ff9a48', alone ? 0.16 : 0.3);
  stroke(ctx, [96, 100, 214, 100], 2, '#1c1816'); stroke(ctx, [155, 100, 155, 122], 1.6, '#1c1816'); ctx.fillStyle = '#1c1a1c'; ctx.beginPath(); ctx.ellipse(155, 124, 30, 26, 0, 0, Math.PI); ctx.fill(); rect(ctx, 123, 120, 64, 5, '#2a282a');
  if (!alone) for (let i = 0; i < 6; i++) glow(v, 140 + i * 6, 112 - i * 9, 9 + i * 2, '#d8d0c0', 0.08);
  // 걸어 둔 것들
  rect(ctx, 290, 34, 230, 4, '#2a2018');
  for (const [x, k] of [[304, 0], [330, 1], [356, 2], [392, 0], [424, 3], [456, 1], [492, 2]]) { stroke(ctx, [x, 38, x, 48], 0.8, '#1c1612'); if (k === 0) { oval(ctx, x, 60, 9, 9, '#3a3632'); stroke(ctx, [x, 48, x, 52], 2, '#3a3632'); } else if (k === 1) { poly(ctx, [x - 5, 48, x + 5, 48, x + 2, 76, x - 2, 76], '#6a7a44'); } else if (k === 2) { for (let i = 0; i < 4; i++) oval(ctx, x + (i % 2 ? 3 : -3), 52 + i * 6, 4, 4.6, '#d8cfb0'); } else { poly(ctx, [x - 7, 48, x + 7, 48, x + 5, 78, x, 84, x - 5, 78], '#8a3a30'); stroke(ctx, [x - 4, 56, x + 4, 56], 0.8, '#d8c0a8'); } }
  // 긴 도마 상
  const tx = 410, ty = 204;
  poly(ctx, [tx - 110, ty - 40, tx + 110, ty - 40, tx + 124, ty - 26, tx - 124, ty - 26], '#6a5238'); rect(ctx, tx - 124, ty - 26, 248, 6, '#3e2e20'); rect(ctx, tx - 114, ty - 20, 7, 44, '#32261a'); rect(ctx, tx + 108, ty - 20, 7, 44, '#32261a');
  if (!alone) { oval(ctx, tx - 70, ty - 34, 16, 5, '#d8d0b8'); oval(ctx, tx - 70, ty - 36, 10, 4, '#8a5a30'); for (let i = 0; i < 5; i++) oval(ctx, tx - 24 + i * 9, ty - 34 - (i % 2), 4, 3, i % 2 ? '#c85a30' : '#6a8a3a'); stroke(ctx, [tx + 30, ty - 30, tx + 58, ty - 36], 2, '#c4ccd4'); stroke(ctx, [tx + 20, ty - 29, tx + 30, ty - 30], 3, '#2a1c14'); oval(ctx, tx + 84, ty - 34, 12, 6, '#3a3632'); }
  else { ctx.fillStyle = '#1c1a1c'; ctx.beginPath(); ctx.ellipse(tx - 20, ty - 34, 24, 18, 0, 0, Math.PI); ctx.fill(); rect(ctx, tx - 46, ty - 37, 52, 4, '#2a282a'); candle(v, tx + 60, ty - 34, 10); poly(ctx, [tx + 14, ty - 37, tx + 44, ty - 38, tx + 46, ty - 29, tx + 12, ty - 28], '#cfc2a2'); }
  if (!alone) {
    person(v, 262, 232, 92, folk(4, { raw: true, f: -1, pose: 'bow', rim: WARM, rimDir: -1 }));
    person(v, tx + 96, ty + 30, 84, { raw: true, f: -1, cloth: '#c8c0ac', hair: HR[1], child: false, arm: 'fwd', rim: WARM, rimDir: -1 });
    person(v, 556, 236, 70, folk(3, { raw: true, f: -1, child: true }));
  }
  person(v, tx - 40, ty + 34, 104, mine(v, { raw: true, f: alone ? 1 : -1, arm: alone ? 'chest' : 'fwd', rim: WARM, rimDir: -1 }));
  ctx.restore(); finish(v, { inside: true });
}
/** 연회. variant feast: 상을 올리는 나, taster: 시식관이 잔을 든 자리 */
function cuisineFeast(v) {
  const { ctx } = v, taster = v.variant === 'taster'; room(v, { wall: '#4e4238', floor: '#32281e', fy: 172 });
  for (const x of [90, 230, 430, 570]) windowAt(v, x, 22, 34, 80, { arch: true });
  for (const [x, c] of [[160, '#6a2420'], [330, '#2e3a5a'], [500, '#6a2420']]) { poly(ctx, [x - 20, 10, x + 20, 10, x + 20, 84, x, 96, x - 20, 84], c); stroke(ctx, [x - 10, 30, x + 10, 30], 1.4, '#c9a25a'); stroke(ctx, [x, 22, x, 60], 1.4, '#c9a25a'); }
  // 높은 상
  const ty = 150;
  const seat = (x, o) => { ctx.save(); ctx.beginPath(); ctx.rect(x - 40, 0, 80, ty - 2); ctx.clip(); person(v, x, ty + 34, 100, { raw: true, f: 0, ...o }); ctx.restore(); };
  rect(ctx, 316, 66, 28, 70, '#3a2a1c'); poly(ctx, [312, 66, 330, 50, 348, 66], '#3a2a1c');
  seat(330, { cloth: '#5a1e24', hair: '#8a8478', robe: true, old: true }); seat(250, { cloth: '#2e4a44', hair: '#6a4a2a', female: true, long: true }); seat(410, { cloth: '#3a3e5a', hair: '#2a1e16' }); seat(170, { cloth: '#54463a', hair: '#1c1614' }); seat(490, { cloth: '#4a3a4e', hair: '#8a6a44', female: true, long: true });
  rect(ctx, 110, ty, 440, 26, '#e0d8c4'); rect(ctx, 110, ty + 22, 440, 8, '#b8ae98'); for (let x = 130; x < 550; x += 30) stroke(ctx, [x, ty + 4, x, ty + 26], 0.6, 'rgba(0,0,0,.08)');
  for (const x of [150, 210, 290, 370, 450, 510]) { oval(ctx, x, ty - 1, 11, 3, '#c8b070'); rect(ctx, x + 14, ty - 9, 4, 9, '#b8a060'); }
  for (const x of [250, 410]) { rect(ctx, x - 1.5, ty - 20, 3, 20, '#b8a060'); for (const k of [-7, 0, 7]) candle(v, x + k, ty - 20 - (k ? 0 : 4), 6); }
  oval(ctx, 330, ty - 3, 22, 5, '#b8a060'); oval(ctx, 330, ty - 8, 15, 7, '#8a4a28');
  pool(v, 330, 200, 260, 26, '#ffb060', 0.14);
  if (taster) {
    person(v, 300, 226, 100, { raw: true, f: 1, cloth: '#3a3a44', hair: '#5a4030', arm: 'up', rim: WARM, rimDir: 1 }); rect(ctx, 312, 132, 6, 8, '#c8b070'); glow(v, 315, 136, 14, '#ffd890', 0.3);
    person(v, 470, 234, 100, mine(v, { raw: true, f: -1, arm: 'chest', rim: WARM, rimDir: -1 }));
    for (const x of [70, 590]) { person(v, x, 220, 94, { raw: true, f: x < 330 ? 1 : -1, cloth: '#5a5e66', hair: '#2a1e16', hat: true }); spear({ ...v, t: (c) => c }, x + (x < 330 ? -12 : 12), 220, 114, 0); }
  } else {
    person(v, 220, 234, 100, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: 1 })); oval(ctx, 252, 178, 20, 5, '#b8a060'); ctx.fillStyle = '#c8b070'; ctx.beginPath(); ctx.ellipse(252, 176, 15, 13, 0, Math.PI, 0); ctx.fill(); oval(ctx, 252, 162, 2.4, 2.4, '#8a7038');
    person(v, 470, 232, 88, { raw: true, f: -1, cloth: '#c8c0ac', hair: HR[3], arm: 'fwd', rim: WARM, rimDir: -1 }); rect(ctx, 440, 172, 8, 14, '#8a7a5c');
    person(v, 560, 236, 84, { raw: true, f: -1, cloth: '#c8c0ac', hair: HR[0], female: true, long: true });
  }
  finish(v, { inside: true });
}
/** 요리 겨루기: 장터에 놓인 두 화로 */
function cuisineContest(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v); townFar(v, 320, HZ + 20, { s: 0.8, n: 7 });
  const gy = () => 172; ground(v, gy); poly(ctx, [0, 184, VW, 184, VW, VH, 0, VH], t('#8e8066'));
  for (let i = 0; i < 9; i++) { const x = 60 + i * 66; stroke(ctx, [x, 84, x + 66, 84], 0.8, t('#3a2c20')); poly(ctx, [x + 22, 84, x + 34, 84, x + 28, 98], t(['#8a2f2a', '#c9a25a', '#3a5a8a'][i % 3])); }
  // 심사석
  rect(ctx, 250, 140, 160, 30, t('#5a4632')); rect(ctx, 246, 136, 168, 5, t('#6e5840'));
  for (const [x, i] of [[280, 0], [330, 3], [380, 1]]) { ctx.save(); ctx.beginPath(); ctx.rect(x - 30, 0, 60, 138); ctx.clip(); person(v, x, 172, 90, folk(i, { f: 0, robe: i === 3, old: i === 3, rim, rimDir: 1 })); ctx.restore(); }
  const station = (x, d) => { rect(ctx, x - 44, 196, 88, 6, t('#6a5238')); rect(ctx, x - 40, 202, 6, 28, t('#3e2e20')); rect(ctx, x + 34, 202, 6, 28, t('#3e2e20')); rect(ctx, x + d * 60 - 12, 204, 24, 24, t('#5a5248')); flame(v, x + d * 60, 204, 5); ctx.fillStyle = t('#1c1a1c'); ctx.beginPath(); ctx.ellipse(x + d * 60, 196, 13, 9, 0, 0, Math.PI); ctx.fill(); oval(ctx, x - 16, 194, 10, 3, t('#d8d0b8')); for (let i = 0; i < 3; i++) oval(ctx, x + 8 + i * 8, 193, 3.4, 2.6, t(i % 2 ? '#c85a30' : '#6a8a3a')); };
  station(170, -1); station(490, 1);
  person(v, 176, 236, 100, mine(v, { f: 1, arm: 'fwd', rim, rimDir: 1 }));
  person(v, 484, 236, 100, { f: -1, cloth: v.other.cloth, hair: v.other.hair, female: v.other.female, long: v.other.long, arm: 'fwd', rim, rimDir: -1 });
  ctx.save(); ctx.translate(0, 40); crowd(v, 220, 440, 236, 6, 68, { dark: 0.55 }); ctx.restore();
  finish(v, { noLeaves: true });
}
/** 고장의 맛: 장터의 먹거리 좌판 */
function cuisineStall(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v); townFar(v, 140, HZ + 20, { s: 0.7, n: 6 });
  const gy = () => 172; ground(v, gy); poly(ctx, [0, 184, VW, 184, VW, VH, 0, VH], t('#8e8066'));
  const sx = 400;
  rect(ctx, sx - 110, 96, 5, 110, t('#3e2e20')); rect(ctx, sx + 105, 96, 5, 110, t('#3e2e20'));
  poly(ctx, [sx - 126, 100, sx - 100, 70, sx + 100, 70, sx + 126, 100], t('#8a3a30')); for (let i = 0; i < 6; i++) poly(ctx, [sx - 126 + i * 42, 100, sx - 84 + i * 42, 100, sx - 105 + i * 42, 110], t(i % 2 ? '#d8cfb0' : '#8a3a30'));
  rect(ctx, sx - 116, 170, 232, 36, t('#5a4632')); rect(ctx, sx - 120, 164, 240, 7, t('#6e5840'));
  for (const [x, c] of [[-90, '#c85a30'], [-56, '#6a8a3a'], [-20, '#d8b040'], [20, '#8a5a30'], [58, '#b8a070'], [92, '#6a3a4a']]) { poly(ctx, [sx + x - 14, 164, sx + x + 14, 164, sx + x + 10, 154, sx + x - 10, 154], t('#7a6a4c')); ctx.fillStyle = t(c); ctx.beginPath(); ctx.ellipse(sx + x, 154, 11, 7, 0, Math.PI, 0); ctx.fill(); }
  for (const [x, k] of [[-80, 0], [-50, 1], [-16, 0], [30, 1], [70, 0]]) { stroke(ctx, [sx + x, 100, sx + x, 112], 0.8, t('#1c1612')); if (k) poly(ctx, [sx + x - 5, 112, sx + x + 5, 112, sx + x + 2, 138, sx + x - 2, 138], t('#6a7a44')); else for (let i = 0; i < 3; i++) oval(ctx, sx + x + (i % 2 ? 3 : -3), 116 + i * 6, 4, 4.6, t('#b85a40')); }
  smoke(v, sx + 150, 190, 80, 12, '#cfc8bc', 0.2); rect(ctx, sx + 138, 190, 26, 18, t('#5a5248')); oval(ctx, sx + 151, 190, 14, 4, t('#1c1a1c'));
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 60, 0, 120, 166); ctx.clip(); person(v, sx + 10, 204, 96, folk(1, { f: -1, arm: 'fwd', rim, rimDir: -1 })); ctx.restore();
  person(v, sx - 150, 236, 100, mine(v, { f: 1, arm: 'fwd', rim, rimDir: 1 })); oval(ctx, sx - 122, 176, 7, 4, t('#d8d0b8'));
  person(v, 150, 232, 90, folk(4, { f: 1 })); person(v, 110, 236, 60, folk(2, { f: 1, child: true }));
  finish(v, { noLeaves: true });
}

/* ---------- 유배와 망명 ---------- */
/** 돛배 한 척 (멀리 또는 가까이) */
function sailboat(v, x, y, s, d, o = {}) {
  const { ctx, t } = v; ctx.save(); ctx.translate(x, y); ctx.scale(d * s, s);
  poly(ctx, [-50, -8, 54, -10, 40, 10, -36, 10], t('#3a2c22')); stroke(ctx, [-50, -8, 54, -10], 2, t('#5a4632'));
  stroke(ctx, [0, -8, 2, -92], 3, t('#2a2018')); if (!o.furled) { poly(ctx, [4, -88, 44, -30, 6, -24], t('#c0b8a4')); poly(ctx, [-2, -80, -34, -26, -2, -22], t('#a8a090')); } else stroke(ctx, [-20, -70, 24, -72], 5, t('#b8b0a0'));
  if (o.flag) poly(ctx, [2, -92, 20, -88, 2, -82], t(o.flag));
  ctx.restore();
}
const sea = (v, y0, c = '#4e6478') => { const { ctx, t, R } = v; rect(ctx, 0, y0, VW, VH - y0, t(c)); for (let i = 0; i < 80; i++) { const y = y0 + 2 + R() * (VH - y0), x = R() * VW, l = 8 + R() * 30; stroke(ctx, [x, y, x + l, y + (R() - 0.5) * 2], 0.9, rgba('#dfe8f0', 0.1 + R() * 0.14)); } };
/** 유배지: 바위섬의 돌집 */
function exileIsland(v) {
  const { ctx, t, R } = v; sky(v); sea(v, 128, '#52626e');
  // 멀리 지나가는 배
  sailboat(v, 520, 138, 0.22, -1);
  // 바위 땅
  ctx.fillStyle = t('#6a6860'); ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, 150); ctx.quadraticCurveTo(120, 132, 240, 150); ctx.quadraticCurveTo(360, 176, 470, 190); ctx.quadraticCurveTo(560, 204, 640, 232); ctx.lineTo(VW, VH); ctx.fill();
  for (let i = 0; i < 30; i++) { const x = R() * 520, y = 160 + R() * 70; stroke(ctx, [x, y, x + 10 + R() * 24, y + 3 + R() * 6], 1, rgba('#000000', 0.16)); }
  for (let i = 0; i < 40; i++) { const x = R() * 300, y = 158 + R() * 60; stroke(ctx, [x, y, x + 2, y - 4 - R() * 5], 0.9, rgba(t('#8a8a5a'), 0.7)); }
  for (const [x, y, s] of [[500, 206, 16], [560, 222, 22], [440, 200, 10]]) poly(ctx, [x - s, y + s * 0.5, x - s * 0.6, y - s * 0.5, x + s * 0.5, y - s * 0.7, x + s, y + s * 0.5], t('#56544e'));
  for (let i = 0; i < 12; i++) stroke(ctx, [420 + R() * 200, 206 + R() * 30, 440 + R() * 200, 206 + R() * 30].map((n, k, a) => (k === 2 ? a[0] + 14 : k === 3 ? a[1] - 1 : n)), 1.2, rgba('#eef2f4', 0.4));
  // 돌집
  const hx = 150, hy = 176;
  rect(ctx, hx - 44, hy - 36, 88, 36, t('#7a766c')); for (let i = 0; i < 12; i++) stroke(ctx, [hx - 40 + R() * 76, hy - 30 + R() * 26, hx - 30 + R() * 70, hy - 30 + R() * 26].map((n, k, a) => (k === 2 ? a[0] + 10 : k === 3 ? a[1] : n)), 0.8, rgba('#000000', 0.2));
  poly(ctx, [hx - 52, hy - 34, hx - 10, hy - 62, hx + 30, hy - 60, hx + 52, hy - 34], t('#4a4038')); rect(ctx, hx - 10, hy - 26, 18, 26, t('#1e1814')); rect(ctx, hx + 20, hy - 26, 12, 10, t('#1e1814'));
  smoke(v, hx + 28, hy - 62, 50, 9, '#b8b4ac', 0.2);
  tree(v, 60, 172, 70, { bare: true });
  stroke(ctx, [226, 170, 226, 146], 1.4, t('#3a2c20')); stroke(ctx, [270, 176, 270, 150], 1.4, t('#3a2c20')); stroke(ctx, [226, 150, 270, 154], 0.8, t('#3a2c20')); for (let i = 0; i < 4; i++) poly(ctx, [232 + i * 9, 151 + i, 238 + i * 9, 152 + i, 236 + i * 9, 164 + i], t('#9a9484'));
  crows(v, 380, 70, 3, 50);
  person(v, 356, 220, 100, mine(v, { f: 1, cloak: true }));
  finish(v, { noLeaves: true });
}
/** 떠나는 배 / 몰래 건너는 배. variant boat: 낮, 호송. boat-night: 밤, 등불을 가린 배 */
function exileBoat(v) {
  const { ctx, t } = v, night = v.variant === 'boat-night', rim = night ? 'rgba(200,220,250,.85)' : null; sky(v);
  townFar(v, night ? 500 : 140, 122, { s: 0.9, n: 8 }); rect(ctx, 0, 120, VW, 10, t('#4a4a44'));
  sea(v, 128, night ? '#2a3644' : '#4e6478');
  if (night) for (const x of [440, 470, 520, 560]) { glow(v, x, 116, 8, '#ffb060', 0.5); stroke(ctx, [x, 130, x, 150], 1, 'rgba(255,180,100,.2)'); }
  // 나룻배
  const bx = 320, by = 204;
  if (night) { glow(v, bx, by - 20, 200, '#8aa4c8', 0.22, 60); for (let i = 0; i < 16; i++) stroke(ctx, [bx - 160 + i * 20, by + 20 + (i % 3) * 5, bx - 146 + i * 20, by + 20 + (i % 3) * 5], 1, 'rgba(200,220,250,.25)'); }
  ctx.fillStyle = rgba('#0a1018', 0.3); ctx.beginPath(); ctx.ellipse(bx, by + 14, 120, 8, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, by + 2); ctx.clip();
  person(v, bx - 60, by + 30, 96, { f: 1, cloth: '#3a3a44', hair: '#2a1e16', hat: !night, hood: night, pose: 'sit', arm: 'fwd', rim, rimDir: 1 });
  person(v, bx + 10, by + 28, 100, mine(v, { f: night ? 1 : -1, pose: 'sit', cloak: true, hood: night, arm: 'chest', rim, rimDir: 1 }));
  if (!night) { person(v, bx + 70, by + 14, 96, { f: -1, cloth: '#5a5e66', hair: '#2a1e16', hat: true }); spear(v, bx + 84, by, 100, 0.04); }
  else person(v, bx + 66, by + 30, 90, { f: -1, cloth: '#2a2630', hair: '#1c1614', hood: true, pose: 'sit', rim, rimDir: 1 });
  ctx.restore();
  poly(ctx, [bx - 118, by - 14, bx + 122, by - 16, bx + 100, by + 12, bx - 92, by + 12], t('#3e3026')); stroke(ctx, [bx - 118, by - 14, bx + 122, by - 16], 2.4, t('#5e4a36')); stroke(ctx, [bx - 100, by - 2, bx + 106, by - 3], 0.8, rgba('#000000', 0.3));
  stroke(ctx, [bx - 44, by - 30, bx - 110, by + 26], 2.4, t('#5a4632')); poly(ctx, [bx - 106, by + 20, bx - 122, by + 34, bx - 112, by + 36], t('#5a4632'));
  if (night) { rect(ctx, bx + 112, by - 30, 7, 10, t('#2a2018')); glow(v, bx + 115, by - 25, 16, '#ffb060', 0.35); }
  else sailboat(v, 540, 150, 0.5, -1, { flag: '#8a2f2a' });
  for (let i = 0; i < 5; i++) stroke(ctx, [bx - 150 - i * 20, by + 10 + i * 5, bx - 126 - i * 14, by + 8 + i * 5], 1, rgba('#dfe8f0', 0.3));
  finish(v, { noLeaves: true });
}
/** 망명 궁정: 빌려 쓰는 낡은 방 */
function exileHall(v) {
  const { ctx } = v; room(v, { wall: '#40382e', floor: '#2a221a', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.12);
  windowAt(v, 130, 40, 34, 60); windowAt(v, 540, 40, 34, 60);
  // 빛바랜 깃발, 낡은 의자
  poly(ctx, [290, 12, 370, 12, 370, 92, 330, 104, 290, 92], '#5a3a36'); poly(ctx, [352, 70, 370, 60, 370, 92, 356, 96], '#40382e'); ctx.strokeStyle = 'rgba(200,170,100,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(330, 50, 14, 0, TAU); ctx.stroke(); stroke(ctx, [330, 30, 330, 70], 1.2, 'rgba(200,170,100,.5)');
  rect(ctx, 306, 96, 48, 76, '#3a2a1c'); rect(ctx, 300, 150, 60, 8, '#4a3626');
  person(v, 330, 196, 100, { raw: true, f: 0, pose: 'sit', cloth: '#4a2a3a', hair: v.other.hair, female: v.other.female, long: v.other.long, cloak: true, arm: 'chest', rim: WARM, rimDir: -1 });
  ctx.strokeStyle = '#b89a50'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(330, 104, 7, Math.PI, 0); ctx.stroke();
  // 금 간 벽, 양동이
  stroke(ctx, [450, 20, 462, 60, 454, 90, 470, 130], 1, 'rgba(0,0,0,.4)'); poly(ctx, [470, 160, 490, 160, 487, 174, 473, 174], '#4a4640');
  candle(v, 250, 150, 8); rect(ctx, 244, 150, 12, 22, '#3a2a1c'); pool(v, 290, 204, 150, 22, '#ffb060', 0.16);
  [[196, 224, 0, 1], [150, 232, 5, 1], [470, 226, 3, -1], [520, 232, 1, -1]].forEach(([x, y, i, f]) => person(v, x, y, 94, folk(i, { raw: true, f, cloak: i !== 1, old: i === 5, rim: WARM, rimDir: f })));
  person(v, 410, 228, 100, mine(v, { raw: true, f: -1, pose: v.variant === 'hall-plot' ? 'stand' : 'bow', arm: 'chest', rim: WARM, rimDir: -1 }));
  if (v.variant === 'hall-plot') { rect(ctx, 250, 196, 70, 5, '#54402e'); rect(ctx, 256, 201, 5, 24, '#3e2e22'); rect(ctx, 310, 201, 5, 24, '#3e2e22'); poly(ctx, [262, 193, 306, 192, 308, 197, 260, 198], '#cfc2a2'); }
  ctx.restore(); finish(v, { inside: true });
}
/** 귀환의 배: 새벽의 부두, 배 세 척 */
function exileFleet(v) {
  const { ctx, t } = v; sky(v); glow(v, 480, 120, 200, '#ffe0a8', 0.3); sea(v, 130);
  sailboat(v, 250, 160, 0.7, 1, { flag: '#8a2f2a' }); sailboat(v, 400, 150, 0.5, 1, { flag: '#8a2f2a' }); sailboat(v, 510, 144, 0.36, 1, { flag: '#8a2f2a' });
  poly(ctx, [0, 190, 420, 196, 440, 208, 440, VH, 0, VH], t('#5a4a3a')); for (let i = 0; i < 14; i++) stroke(ctx, [i * 32, 191, i * 32 - 8, VH], 1, rgba('#000000', 0.25)); for (const x of [120, 280, 430]) { rect(ctx, x - 5, 172, 10, 60, t('#32281e')); oval(ctx, x, 172, 5, 2, t('#5a4a3a')); }
  stroke(ctx, [280, 176, 262, 158], 1.4, t('#b8a880'));
  crowd(v, 20, 250, 222, 9, 80, { rim: 'rgba(255,220,160,.4)', rimDir: 1 });
  for (const x of [50, 130, 210]) spear(v, x, 196, 96, 0.03);
  banner(v, 170, 204, 110, '#8a2f2a', { d: 1, w: 34, len: 40 });
  person(v, 330, 232, 100, mine(v, { f: 1, cloak: true, rim: 'rgba(255,220,160,.5)', rimDir: 1 }));
  person(v, 380, 226, 96, { f: 1, cloth: '#4a2a3a', hair: v.other.hair, female: v.other.female, long: v.other.long, cloak: true, arm: 'fwd', rim: 'rgba(255,220,160,.5)', rimDir: 1 });
  finish(v, { noLeaves: true });
}

/* ---------- 큰 공사 ---------- */
/** 비계: x0~x1, 바닥 y, 층 n */
const scaffold = (v, x0, x1, y, n, lh = 30) => { const { ctx, t } = v, c = t('#5a4632'); for (let x = x0; x <= x1 + 1; x += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 44))) stroke(ctx, [x, y, x, y - n * lh - 8], 2, c); for (let i = 1; i <= n; i++) { rect(ctx, x0 - 4, y - i * lh, x1 - x0 + 8, 3, t('#6e5840')); if (i % 2) stroke(ctx, [x0, y - i * lh, x0 + 44, y - (i - 1) * lh], 1.2, c); else stroke(ctx, [x1, y - i * lh, x1 - 44, y - (i - 1) * lh], 1.2, c); } };
/** 디딤바퀴 기중기 */
function crane(v, x, y, s) {
  const { ctx, t } = v, c = t('#4a3a2a'); ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  stroke(ctx, [-16, 0, 0, -90, 16, 0], 3, c); stroke(ctx, [0, -90, 70, -120], 3, c); stroke(ctx, [0, -60, 40, -106], 1.6, c);
  ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -22, 20, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) stroke(ctx, [-Math.cos(i * 0.785) * 20, -22 - Math.sin(i * 0.785) * 20, Math.cos(i * 0.785) * 20, -22 + Math.sin(i * 0.785) * 20], 1, c);
  stroke(ctx, [70, -120, 70, -50], 1, t('#b8a880')); rect(ctx, 58, -50, 24, 16, t('#a49c8e')); stroke(ctx, [58, -50, 70, -58, 82, -50], 0.8, t('#b8a880'));
  ctx.restore();
}
const block = (v, x, y, w = 22, h = 13) => { const { ctx, t } = v; rect(ctx, x - w / 2, y - h, w, h, t('#a49c8e')); rect(ctx, x - w / 2, y - h, w, 2.4, t('#bcb4a4')); oval(ctx, x, y, w * 0.6, 2, rgba('#000000', 0.18)); };
/** 짓는 터. variant site: 올라가는 성벽·성당, fall: 무너진 비계 */
function worksSite(v) {
  const { ctx, t, R } = v, fall = v.variant === 'fall', dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v); townFar(v, 90, HZ + 20, { s: 0.6, n: 5 });
  const gy = () => 174; ground(v, gy); poly(ctx, [0, 186, VW, 186, VW, VH, 0, VH], t('#8a7c64'));
  // 반쯤 올라간 돌벽: 뾰족 아치 창 자리
  const wx = 300, st = t('#9a9284'), st2 = t('#857e72');
  ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(wx, 190); ctx.lineTo(wx, 70); ctx.lineTo(wx + 60, 70); ctx.lineTo(wx + 60, 44); ctx.lineTo(wx + 130, 44); ctx.lineTo(wx + 130, 84); ctx.lineTo(wx + 210, 84); ctx.lineTo(wx + 210, 110); ctx.lineTo(wx + 300, 110); ctx.lineTo(wx + 300, 140); ctx.lineTo(VW, 140); ctx.lineTo(VW, 190); ctx.fill();
  for (let y = 56; y < 190; y += 12) for (let x = wx + ((y / 12) % 2) * 12; x < VW; x += 24) if (y > (x < wx + 60 ? 70 : x < wx + 130 ? 44 : x < wx + 210 ? 84 : x < wx + 300 ? 110 : 140)) stroke(ctx, [x, y, x, y + 12], 0.6, rgba('#000000', 0.14));
  for (const x of [wx + 36, wx + 96, wx + 170]) { ctx.fillStyle = t('#3a3632'); ctx.beginPath(); ctx.moveTo(x - 12, 190); ctx.lineTo(x - 12, 130); ctx.quadraticCurveTo(x - 12, 108, x, 98); ctx.quadraticCurveTo(x + 12, 108, x + 12, 130); ctx.lineTo(x + 12, 190); ctx.fill(); }
  rect(ctx, wx - 6, 186, VW, 6, st2);
  if (!fall) { scaffold(v, wx + 10, wx + 200, 190, 4); crane(v, wx - 44, 190, 1.05); }
  else {
    scaffold(v, wx + 130, wx + 200, 190, 3);
    for (let i = 0; i < 14; i++) { const x = wx - 30 + R() * 170, y = 150 + R() * 60, a = (R() - 0.5) * 2.4, l = 30 + R() * 50; stroke(ctx, [x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.6], 2 + R() * 2, t(R() < 0.5 ? '#5a4632' : '#6e5840')); }
    for (let i = 0; i < 10; i++) block(v, wx - 20 + R() * 150, 204 + R() * 26, 14 + R() * 12, 9 + R() * 6);
    for (let i = 0; i < 20; i++) glow(v, wx - 30 + R() * 180, 110 + R() * 90, 26 + R() * 34, '#c8b89a', 0.07);
  }
  // 돌 더미와 수레, 일꾼
  for (const [x, y] of [[90, 214], [114, 214], [102, 201], [150, 226]]) block(v, x, y);
  if (!fall) {
    person(v, 212, 230, 92, folk(0, { f: 1, pose: 'bow', rim, rimDir: 1 })); block(v, 240, 214); stroke(ctx, [226, 200, 252, 200], 1, t('#b8a880'));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, 99); ctx.clip(); person(v, wx + 160, 122, 60, folk(2, { f: -1, arm: 'up', rim, rimDir: -1 })); ctx.restore();
    person(v, 560, 232, 90, folk(4, { f: -1, arm: 'fwd', rim, rimDir: -1 })); stroke(ctx, [540, 176, 530, 150], 2, t('#4a3a2a')); rect(ctx, 524, 144, 12, 8, t('#787c84'));
    person(v, 470, 236, 100, mine(v, { f: -1, arm: 'fwd', rim, rimDir: -1 })); poly(ctx, [436, 178, 458, 174, 460, 186, 438, 190], t('#cfc2a2'));
  } else {
    lying(v, wx + 30, 232, 70, { cover: '#8a8474' }); person(v, wx + 14, 238, 88, folk(1, { f: 1, pose: 'kneel', rim, rimDir: 1 }));
    person(v, 212, 230, 92, folk(0, { f: 1, arm: 'fwd', rim, rimDir: 1 })); person(v, 560, 232, 90, folk(4, { f: -1, arm: 'chest', rim, rimDir: -1 }));
    person(v, 470, 236, 100, mine(v, { f: -1, arm: 'fwd', rim, rimDir: -1 }));
  }
  finish(v, { noLeaves: true });
}
/** 땅을 파는 공사: 운하·수로·큰길 */
function worksDig(v) {
  const { ctx, t, R } = v; sky(v); far(v); townFar(v, 560, HZ + 16, { s: 0.6, n: 5 });
  const gy = (x) => 160 - fbm1(x / 220 + v.q, 3) * 6; ground(v, gy, { tufts: 160 });
  // 멀어지는 도랑과 양쪽 흙 둑
  ctx.fillStyle = t('#4a3c2c'); ctx.beginPath(); ctx.moveTo(120, VH); ctx.quadraticCurveTo(300, 190, 470, 156); ctx.lineTo(486, 156); ctx.quadraticCurveTo(420, 200, 430, VH); ctx.fill();
  ctx.fillStyle = t('#8a7452'); ctx.beginPath(); ctx.moveTo(40, VH); ctx.quadraticCurveTo(250, 180, 462, 154); ctx.lineTo(470, 156); ctx.quadraticCurveTo(300, 190, 120, VH); ctx.fill();
  ctx.beginPath(); ctx.moveTo(430, VH); ctx.quadraticCurveTo(420, 200, 486, 156); ctx.lineTo(494, 155); ctx.quadraticCurveTo(470, 200, 520, VH); ctx.fill();
  ctx.fillStyle = rgba(t('#4e6478'), 0.8); ctx.beginPath(); ctx.moveTo(400, 176); ctx.quadraticCurveTo(440, 164, 472, 157); ctx.lineTo(484, 157); ctx.quadraticCurveTo(450, 172, 436, 184); ctx.fill();
  for (let i = 0; i < 30; i++) oval(ctx, 60 + R() * 420, 196 + R() * 40, 3 + R() * 5, 1.6, rgba('#000000', 0.12));
  for (let i = 0; i < 8; i++) { const k = i / 8, x = 150 + k * 300; stroke(ctx, [x - 30 + k * 26, 236 - k * 76, x - 30 + k * 26, 220 - k * 70], 2 - k, t('#4a3a2a')); }
  // 파는 사람들
  [[236, 236, 0, 1], [300, 222, 2, -1], [352, 206, 4, 1]].forEach(([x, y, i, f], n) => { person(v, x, y, 88 - n * 12, folk(i, { f, pose: 'bow' })); stroke(ctx, [x + f * 10, y - (56 - n * 8), x + f * 26, y - 6], 1.6, t('#4a3a2a')); poly(ctx, [x + f * 22, y - 8, x + f * 32, y - 8, x + f * 28, y + 2], t('#787c84')); });
  // 흙 수레와 감독
  rect(ctx, 520, 204, 50, 16, t('#5a4632')); ctx.fillStyle = t('#6a5640'); ctx.beginPath(); ctx.ellipse(545, 204, 24, 9, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(545, 222, 9, 0, TAU); ctx.stroke(); cow(v, 604, 232, 44, 1, '#5a4030');
  stroke(ctx, [70, 236, 70, 150], 1.6, t('#3a2c20')); poly(ctx, [70, 150, 92, 156, 70, 164], t('#8a2f2a'));
  person(v, 130, 236, 100, mine(v, { f: 1, arm: 'fwd' })); poly(ctx, [150, 176, 172, 172, 174, 184, 152, 188], t('#cfc2a2'));
  finish(v);
}
/** 완공: 큰 돌다리 위의 사람들 */
function worksOpen(v) {
  const { ctx, t } = v; sky(v); far(v); townFar(v, 540, HZ + 14, { s: 0.7, n: 6 });
  const gy = (x) => 150 - fbm1(x / 200 + v.q, 3) * 6; ground(v, gy);
  rect(ctx, 0, 176, VW, VH - 176, t('#4e6478')); for (let i = 0; i < 30; i++) { const x = (i * 97) % VW, y = 184 + ((i * 37) % 50); stroke(ctx, [x, y, x + 24, y + 1], 0.9, rgba('#dfe8f0', 0.2)); }
  // 다리
  const by = (x) => 150 - 16 * (1 - ((x - 320) / 320) ** 2), st = t('#a09888');
  ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(0, 214); for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, by(x)); ctx.lineTo(VW, 214); ctx.fill();
  for (const cx of [110, 320, 530]) { ctx.fillStyle = t('#3a4654'); ctx.beginPath(); ctx.ellipse(cx, 216, 82, 46, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = t('#7c7468'); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, 216, 84, 48, 0, Math.PI, 0); ctx.stroke(); }
  for (const px of [4, 215, 425, 636]) { rect(ctx, px - 14, 150, 28, 80, st); poly(ctx, [px - 14, 230, px, 244, px + 14, 230], t('#857e72')); }
  ctx.fillStyle = st; ctx.beginPath(); for (let x = 0; x <= VW; x += 16) ctx[x ? 'lineTo' : 'moveTo'](x, by(x) - 9); for (let x = VW; x >= 0; x -= 16) ctx.lineTo(x, by(x)); ctx.fill(); for (let x = 8; x < VW; x += 20) stroke(ctx, [x, by(x) - 9, x, by(x)], 0.8, rgba('#000000', 0.2));
  // 다리 위의 사람들과 깃발
  for (let i = 0; i < 13; i++) { const x = 60 + i * 42 + (i % 3) * 6; ctx.save(); ctx.beginPath(); ctx.rect(x - 20, 0, 40, by(x) - 8); ctx.clip(); person(v, x, by(x) + 6, 42 + (i % 3) * 3, folk(i, { f: i < 7 ? 1 : -1, arm: i % 4 === 0 ? 'up' : undefined })); ctx.restore(); }
  for (const [x, c] of [[215, '#8a2f2a'], [425, '#c9a25a'], [320, '#8a2f2a']]) banner(v, x, by(x) - 8, 46, c);
  // 앞 둑의 나
  poly(ctx, [0, 226, 190, 220, 230, 240, 0, 240], t('#6a7a4a'));
  person(v, 120, 238, 100, mine(v, { f: 1, arm: 'chest' })); person(v, 70, 236, 60, folk(3, { f: 1, child: true, arm: 'up' }));
  finish(v);
}

export const PLATES5 = {
  /** 봉기. variant: secret(헛간 모임) march(문 앞) gallows(꺾인 뒤) */
  revolt(v) { const k = v.variant ?? 'secret'; return k === 'march' ? revoltMarch(v) : k.startsWith('gallows') ? revoltGallows(v) : revoltSecret(v); },
  /** 개척. variant: wagons clearing natives raid */
  frontier(v) { return ({ wagons: frontierWagons, clearing: frontierClearing, natives: frontierNatives, raid: frontierRaid }[v.variant] ?? frontierWagons)(v); },
  /** 목축·유목. variant: pasture steed camp rustle */
  herd(v) { const k = v.variant ?? 'pasture'; return k === 'camp' ? herdCamp(v) : k === 'rustle' ? herdRustle(v) : herdPasture(v); },
  /** 망자와 저주. variant: house grave grave-kneel seance fraud item */
  haunt(v) { const k = v.variant ?? 'house'; return k.startsWith('grave') ? hauntGrave(v) : k === 'seance' || k === 'fraud' ? hauntSeance(v) : k === 'item' ? hauntItem(v) : hauntHouse(v); },
  /** 광산. variant: adit picket collapse deep knock */
  mine(v) { const k = v.variant ?? 'adit'; return k === 'picket' ? minePicket(v) : k === 'collapse' ? mineCollapse(v) : k === 'deep' || k === 'knock' ? mineDeep(v) : mineAdit(v); },
  /** 노예. variant: market coffle yard yard-master free free-kin */
  bondage(v) { const k = v.variant ?? 'market'; return k === 'coffle' ? bondCoffle(v) : k.startsWith('yard') ? bondYard(v) : k.startsWith('free') ? bondFree(v) : bondMarket(v); },
  /** 큰 한탕. variant: plan split roof vault vault-twist */
  heist(v) { const k = v.variant ?? 'plan'; return k === 'roof' ? heistRoof(v) : k.startsWith('vault') ? heistVault(v) : heistPlan(v); },
  /** 재판정. variant: dock plead bench */
  trial,
  /** 유배와 망명. variant: island boat boat-night hall hall-plot fleet */
  exile(v) { const k = v.variant ?? 'island'; return k.startsWith('boat') ? exileBoat(v) : k.startsWith('hall') ? exileHall(v) : k === 'fleet' ? exileFleet(v) : exileIsland(v); },
  /** 큰 공사. variant: site fall dig open */
  works(v) { const k = v.variant ?? 'site'; return k === 'dig' ? worksDig(v) : k === 'open' ? worksOpen(v) : worksSite(v); },
  /** 요리사. variant: kitchen create feast taster contest stall */
  cuisine(v) { const k = v.variant ?? 'kitchen'; return k === 'feast' || k === 'taster' ? cuisineFeast(v) : k === 'contest' ? cuisineContest(v) : k === 'stall' ? cuisineStall(v) : cuisineKitchen(v); },
};
