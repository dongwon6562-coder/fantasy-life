// 26단계 삽화: 숨은 왕가의 피, 용사 시대의 성유물, 약초꾼과 약방.
import { fbm1, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, room, windowAt, glow, candle, pool, smoke, person, crowd, tree, banner, shaft, flame, finish, zoom } from './vignetteKit.js';
import { spear } from './vignettePlates5.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.5)', HOLY = '#ffe8a8';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const dimOf = (v) => v.S.tod === 'night' || v.S.tod === 'dusk';
const table = (ctx, tx, ty, w) => { poly(ctx, [tx - w, ty - 40, tx + w, ty - 40, tx + w + 16, ty - 24, tx - w - 16, ty - 24], '#4e3a2a'); rect(ctx, tx - w - 16, ty - 24, w * 2 + 32, 6, '#30241a'); rect(ctx, tx - w - 6, ty - 18, 7, 42, '#281e16'); rect(ctx, tx + w, ty - 18, 7, 42, '#281e16'); };
/** 작은 왕관 */
const crown = (ctx, x, y, s, c = '#d8b040') => { poly(ctx, [x - s, y, x - s, y - s * 0.9, x - s * 0.5, y - s * 0.45, x, y - s * 1.1, x + s * 0.5, y - s * 0.45, x + s, y - s * 0.9, x + s, y], c); rect(ctx, x - s, y - s * 0.22, s * 2, s * 0.22, dark(c, 0.25)); };

/* ---------- 숨은 왕가의 피 ---------- */
/** 다락의 궤: 오래된 족보와 인장 반지. variant scroll / burn(증거를 태운다) */
function claimScroll(v) {
  const { ctx } = v, burn = v.variant === 'burn'; room(v, { stone: false, wall: '#30281f', floor: '#221a14', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.18);
  // 비스듬한 지붕 들보와 작은 창
  poly(ctx, [0, 0, 250, 0, 0, 120], '#1a140f'); poly(ctx, [VW, 0, 420, 0, VW, 110], '#1a140f'); for (const x of [150, 500]) rect(ctx, x - 4, 0, 8, 172, '#1c150f');
  windowAt(v, 316, 34, 30, 40);
  // 뚜껑 열린 궤
  rect(ctx, 96, 150, 96, 46, '#3e2c1e'); rect(ctx, 96, 150, 96, 5, '#5a4030'); poly(ctx, [96, 150, 192, 150, 200, 112, 104, 112], '#33241a'); for (const x of [112, 176]) rect(ctx, x, 150, 4, 46, '#6a5a44'); oval(ctx, 144, 172, 5, 6, '#8a7038');
  poly(ctx, [118, 150, 146, 138, 170, 150], '#6a2a2e');
  if (burn) {
    // 화로에 던진 두루마리
    const fx = 440, fy = 196; poly(ctx, [fx - 34, fy, fx + 34, fy, fx + 26, fy + 22, fx - 26, fy + 22], '#2a2420'); rect(ctx, fx - 38, fy - 4, 76, 6, '#3a322c'); for (const k of [-22, 22]) rect(ctx, fx + k - 2, fy + 22, 4, 12, '#1c1814');
    glow(v, fx, fy - 12, 130, '#ff9a48', 0.4); flame(v, fx - 8, fy - 2, 12); flame(v, fx + 10, fy - 2, 9); poly(ctx, [fx - 20, fy - 6, fx + 16, fy - 12, fx + 18, fy - 5, fx - 18, fy + 1], '#5a4a34'); smoke(v, fx, fy - 24, 90, 24, '#2a2622', 0.22);
    person(v, fx - 96, fy + 40, 104, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: 1 }));
    person(v, fx + 110, fy + 36, 96, folk(4, { raw: true, f: -1, old: true, arm: 'chest', rim: WARM, rimDir: -1 }));
  } else {
    const tx = 380, ty = 206; table(ctx, tx, ty, 80); candle(v, tx + 58, ty - 34, 10); pool(v, tx + 10, ty - 40, 140, 54, '#ffb060', 0.24);
    // 길게 펼친 족보: 이름 줄과 가지
    poly(ctx, [tx - 66, ty - 38, tx + 36, ty - 39, tx + 42, ty - 27, tx - 74, ty - 26], '#d8ccae'); oval(ctx, tx - 70, ty - 32, 4, 7, '#b8a888'); oval(ctx, tx + 40, ty - 33, 4, 7, '#b8a888');
    stroke(ctx, [tx - 14, ty - 37, tx - 14, ty - 28], 0.7, '#5a3a2a'); for (let i = 0; i < 5; i++) { stroke(ctx, [tx - 54 + i * 20, ty - 34, tx - 44 + i * 20, ty - 34], 0.8, '#4a3626'); stroke(ctx, [tx - 52 + i * 20, ty - 30, tx - 46 + i * 20, ty - 30], 0.8, '#4a3626'); }
    oval(ctx, tx + 24, ty - 31, 3.4, 2.6, '#8a1e1a'); crown(ctx, tx - 14, ty - 36, 3.2);
    // 인장 반지
    ctx.strokeStyle = '#d8b040'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(tx - 92, ty - 29, 5, 2.6, 0, 0, TAU); ctx.stroke(); oval(ctx, tx - 92, ty - 32, 2.4, 1.8, '#8a1e1a');
    person(v, tx - 126, ty + 38, 104, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: WARM, rimDir: 1 }));
    person(v, tx + 128, ty + 34, 96, folk(4, { raw: true, f: -1, old: true, stick: 'staff', rim: WARM, rimDir: -1 }));
  }
  ctx.restore(); finish(v, { inside: true });
}
/** 옹립: 옛 깃발 아래 무릎 꿇는 사람들. variant acclaim / offer(밤의 손님이 무릎을 꿇는다) */
function claimAcclaim(v) {
  const { ctx } = v, offer = v.variant === 'offer'; room(v, { wall: '#34302e', floor: '#262220', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.12);
  for (const x of [90, 250, 410, 570]) { rect(ctx, x - 9, 0, 18, 172, '#2a2624'); rect(ctx, x - 12, 160, 24, 12, '#221e1c'); }
  windowAt(v, 150, 30, 40, 80, { arch: true }); windowAt(v, 470, 30, 40, 80, { arch: true });
  // 벽에 건 낡은 왕가의 깃발
  poly(ctx, [296, 18, 364, 18, 364, 120, 330, 104, 296, 120], '#5a1e22'); rect(ctx, 290, 14, 80, 5, '#8a7038'); crown(ctx, 330, 66, 12); for (let i = 0; i < 5; i++) stroke(ctx, [300 + i * 14, 110 - (i % 2) * 6, 302 + i * 14, 118 - (i % 2) * 6], 1, 'rgba(0,0,0,.35)');
  for (const x of [230, 430]) { rect(ctx, x - 1.5, 96, 3, 76, '#3a2c20'); flame(v, x, 94, 7); glow(v, x, 96, 70, '#ffb060', 0.26); }
  pool(v, 330, 214, 240, 24, '#ffb060', 0.2);
  if (offer) {
    person(v, 300, 234, 104, mine(v, { raw: true, f: 1, arm: 'chest', rim: WARM, rimDir: 1 }));
    person(v, 404, 236, 100, { raw: true, f: -1, pose: 'kneel', cloth: '#3a2a3e', hair: '#5a4030', cloak: true, arm: 'fwd', rim: WARM, rimDir: -1 });
    // 내미는 왕관 없는 관: 천에 싼 것
    poly(ctx, [366, 196, 388, 194, 390, 204, 368, 206], '#6a2a2e'); crown(ctx, 378, 196, 7);
    person(v, 500, 232, 96, { raw: true, f: -1, cloth: '#26222a', hair: '#1c1614', hood: true, cloak: true });
  } else {
    // 단 위의 나
    poly(ctx, [250, 196, 410, 196, 430, 212, 230, 212], '#3e3834'); rect(ctx, 230, 212, 200, 8, '#2a2622');
    person(v, 330, 202, 104, mine(v, { raw: true, f: 1, cloak: true, arm: 'chest', rim: WARM, rimDir: 1 }));
    for (const [x, f, i] of [[150, 1, 0], [196, 1, 3], [470, -1, 4], [516, -1, 2]]) person(v, x, 238, 96, folk(i, { raw: true, f, pose: 'kneel', cloak: true, rim: WARM, rimDir: f }));
    person(v, 100, 234, 96, { raw: true, f: 1, cloth: '#5a5e66', hair: '#2a1e16', hat: true }); spear(v, 86, 234, 116, -0.03);
    person(v, 566, 234, 96, { raw: true, f: -1, cloth: '#5a5e66', hair: '#2a1e16', hat: true }); spear(v, 580, 234, 116, 0.03);
  }
  ctx.restore(); finish(v, { inside: true });
}
/** 가짜 왕손: 장터 단 위에 세운 젊은이와 웅성대는 사람들 */
function claimPretender(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); townFar(v, 320, 142, { s: 1.25, n: 9 });
  rect(ctx, 0, 70, 120, 120, t('#5a5048')); rect(ctx, 530, 56, 110, 134, t('#4e463e')); poly(ctx, [0, 70, 60, 40, 120, 70], t('#4a3028')); poly(ctx, [530, 56, 585, 26, 640, 56], t('#4a3028'));
  poly(ctx, [0, 186, VW, 186, VW, VH, 0, VH], t('#7a7062')); for (let i = 0; i < 26; i++) oval(ctx, (i * 67) % VW, 194 + (i * 17) % 42, 13, 2, rgba('#000000', 0.09));
  // 단과 깃대
  rect(ctx, 250, 176, 170, 30, t('#4a3a2a')); rect(ctx, 244, 172, 182, 6, t('#5a4632')); for (let i = 0; i < 6; i++) stroke(ctx, [262 + i * 30, 178, 262 + i * 30, 206], 0.8, rgba('#000000', 0.22));
  banner(v, 262, 172, 96, '#6a2226'); banner(v, 408, 172, 96, '#6a2226');
  person(v, 330, 174, 84, { f: 1, cloth: '#6a2a2e', hair: '#8a6a44', cloak: true, arm: 'chest', rim, rimDir: 1 }); crown(ctx, 331, 92, 6, t('#d8b040'));
  person(v, 378, 174, 88, { f: -1, cloth: '#3a2a3e', hair: '#5a4030', hat: true, arm: 'up', rim, rimDir: -1 });
  person(v, 284, 174, 86, { f: 1, cloth: '#5a5e66', hair: '#2a1e16', hat: true, rim, rimDir: 1 }); spear(v, 272, 174, 104, -0.03);
  crowd(v, 20, 240, 236, 9, 78); crowd(v, 430, 630, 236, 8, 78);
  person(v, 180, 238, 98, mine(v, { f: 1, cloak: true, rim, rimDir: 1 }));
  person(v, 470, 238, 92, folk(1, { f: -1, arm: 'chest', rim, rimDir: -1 }));
  finish(v, { noLeaves: true });
}

/* ---------- 용사 시대의 성유물 ---------- */
/** 유물이 놓인 무너진 성소. variant find / chosen(빛이 답한다) / rejected(유물이 밀어낸다) */
function relicShrine(v) {
  const { ctx, R } = v, k = v.variant ?? 'find', chosen = k === 'chosen', rej = k === 'rejected';
  room(v, { wall: '#2a2a2e', floor: '#1e1e22', fy: 176 });
  ctx.save(); zoom(v, 330, 240, 1.1);
  // 무너진 천장 틈과 빛줄기
  poly(ctx, [270, 0, 400, 0, 372, 22, 300, 16], rej ? '#3a2a30' : '#8a94a8');
  shaft(v, 336, 6, 60, 190, 0, rej ? '#ff7060' : chosen ? HOLY : '#c8d4f0', rej ? 0.12 : chosen ? 0.3 : 0.18);
  // 기둥: 하나는 부러져 누웠다
  for (const x of [90, 190, 470, 570]) { rect(ctx, x - 12, 0, 24, 176, '#34343a'); rect(ctx, x - 16, 164, 32, 12, '#2a2a30'); for (let i = 0; i < 4; i++) stroke(ctx, [x - 8 + i * 5, 8, x - 8 + i * 5, 160], 0.7, 'rgba(0,0,0,.22)'); }
  poly(ctx, [40, 214, 150, 204, 154, 222, 44, 232], '#303036'); for (let i = 0; i < 8; i++) oval(ctx, 60 + R() * 520, 196 + R() * 40, 3 + R() * 6, 1.5 + R() * 2.5, '#2a2a30');
  // 벽의 낡은 돋을새김: 일곱 사람
  for (let i = 0; i < 7; i++) { const x = 250 + i * 27; oval(ctx, x, 62, 5, 6, '#3a3a42'); poly(ctx, [x - 7, 70, x + 7, 70, x + 9, 104, x - 9, 104], '#3a3a42'); }
  // 제단과 꽂힌 검
  const ax = 336, ay = 200;
  poly(ctx, [ax - 60, ay, ax + 60, ay, ax + 74, ay + 14, ax - 74, ay + 14], '#4a4a52'); rect(ctx, ax - 74, ay + 14, 148, 8, '#34343a'); poly(ctx, [ax - 36, ay - 20, ax + 36, ay - 20, ax + 44, ay, ax - 44, ay], '#55555e'); rect(ctx, ax - 44, ay, 88, 4, '#3a3a42');
  const gc = rej ? '#ff6a50' : HOLY;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, ax, ay - 50, chosen ? 150 : 90, gc, chosen ? 0.5 : rej ? 0.4 : 0.26); ctx.restore();
  rect(ctx, ax - 2.2, ay - 78, 4.4, 60, '#c8ccd4'); rect(ctx, ax - 0.6, ay - 76, 1.2, 56, '#f0f2f6'); rect(ctx, ax - 13, ay - 82, 26, 4, '#b89840'); rect(ctx, ax - 2.4, ay - 98, 4.8, 16, '#4a3626'); oval(ctx, ax, ay - 100, 4, 4, '#b89840');
  if (chosen) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.2; stroke(ctx, [ax + Math.cos(a) * 16, ay - 56 + Math.sin(a) * 16, ax + Math.cos(a) * (60 + (i % 3) * 22), ay - 56 + Math.sin(a) * (44 + (i % 3) * 14)], 1.2, rgba(HOLY, 0.4)); } for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba('#fff4d0', 0.4 + R() * 0.5); ctx.fillRect(ax + (R() - 0.5) * 220, ay - 20 - R() * 150, 1.3, 1.3); } ctx.restore(); }
  if (rej) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const d of [-1, 1]) { let px = ax, py = ay - 56; ctx.strokeStyle = rgba('#ffb0a0', 0.8); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(px, py); for (let i = 0; i < 5; i++) { px += d * (12 + R() * 12); py += (R() - 0.4) * 16; ctx.lineTo(px, py); } ctx.stroke(); } ctx.restore(); }
  const rim = rej ? 'rgba(255,130,110,.6)' : 'rgba(255,232,170,.6)';
  if (chosen) {
    person(v, ax - 30, ay + 22, 104, mine(v, { raw: true, f: 1, arm: 'up', rim, rimDir: 1 }));
    person(v, 500, 236, 96, folk(3, { raw: true, f: -1, pose: 'kneel', rim, rimDir: -1 })); person(v, 548, 234, 96, { raw: true, f: -1, cloth: '#c8c0a8', hair: '#8a8478', robe: true, old: true, arm: 'chest', rim, rimDir: -1 });
  } else if (rej) {
    person(v, ax - 110, 238, 100, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'chest', lean: -0.2, rim, rimDir: 1 }));
    person(v, 520, 234, 96, { raw: true, f: -1, cloth: '#c8c0a8', hair: '#8a8478', robe: true, old: true, arm: 'up', rim, rimDir: -1 });
  } else {
    person(v, 170, 236, 102, mine(v, { raw: true, f: 1, arm: 'fwd', rim: COLD, rimDir: 1 })); rect(ctx, 196, 150, 2, 22, '#3a2c20'); flame(v, 197, 148, 6); glow(v, 197, 150, 70, '#ffb060', 0.28);
    person(v, 118, 238, 94, folk(2, { raw: true, f: 1, hood: true, cloak: true }));
  }
  ctx.restore(); finish(v, { inside: true });
}
/** 유물 쟁탈: 폐허 앞에서 궤 하나를 두고 맞선 교단과 탑과 도굴꾼 */
function relicContest(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v);
  const gy = (x) => 160 - fbm1(x / 180 + v.q, 3) * 7; ground(v, gy, { color: '#7c7868', color2: '#55524a', tufts: 70 });
  // 폐허의 아치와 부러진 기둥
  ctx.fillStyle = t('#5e5c58'); ctx.beginPath(); ctx.moveTo(250, 176); ctx.lineTo(250, 90); ctx.quadraticCurveTo(330, 30, 410, 90); ctx.lineTo(410, 176); ctx.lineTo(388, 176); ctx.lineTo(388, 98); ctx.quadraticCurveTo(330, 56, 272, 98); ctx.lineTo(272, 176); ctx.fill();
  for (const [x, h] of [[150, 70], [200, 40], [470, 86], [530, 50]]) { rect(ctx, x - 9, 176 - h, 18, h, t('#66645e')); poly(ctx, [x - 9, 176 - h, x - 2, 176 - h - 8, x + 9, 176 - h], t('#66645e')); }
  tree(v, 44, 186, 150, { bare: true }); tree(v, 610, 188, 130, { bare: true });
  // 가운데의 궤
  const cx = 330, cy = 214; rect(ctx, cx - 24, cy - 20, 48, 20, t('#4a3a2a')); poly(ctx, [cx - 24, cy - 20, cx + 24, cy - 20, cx + 20, cy - 30, cx - 20, cy - 30], t('#5a4632')); for (const k of [-16, 14]) rect(ctx, cx + k, cy - 30, 3, 30, t('#8a7038'));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, cx, cy - 26, 60, HOLY, dim ? 0.4 : 0.22); stroke(ctx, [cx - 20, cy - 21, cx + 20, cy - 21], 1.4, rgba(HOLY, 0.8)); ctx.restore();
  // 왼쪽 교단, 오른쪽 탑, 뒤의 도굴꾼
  person(v, 196, 234, 100, { f: 1, cloth: '#c8c0a8', hair: '#8a8478', robe: true, old: true, arm: 'fwd', stick: 'staff', rim, rimDir: 1 });
  for (const [x, y] of [[140, 238], [96, 232]]) { person(v, x, y, 96, { f: 1, cloth: '#8a8e96', hair: '#2a1e16', hat: true, rim, rimDir: 1 }); spear(v, x - 14, y, 112, -0.04); }
  person(v, 466, 234, 100, { f: -1, cloth: '#3a2a4e', hair: '#c8c4bc', robe: true, arm: 'up', rim, rimDir: -1 }); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, 452, 150, 16, '#b8a0ff', 0.6); ctx.restore();
  person(v, 516, 238, 94, { f: -1, cloth: '#2e2a4a', hair: HR[1], robe: true, hood: true, rim, rimDir: -1 });
  person(v, 300, 178, 60, folk(2, { f: 1, hood: true, cloak: true })); person(v, 366, 180, 58, folk(4, { f: -1, hood: true }));
  person(v, 286, 238, 102, mine(v, { f: 1, cloak: true, arm: 'chest', rim, rimDir: -1 }));
  finish(v, { noLeaves: true });
}
/** 가짜 유물: 장터 좌판에 늘어놓은 '성스러운' 물건들 */
function relicFake(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); townFar(v, 330, 144, { s: 1.2, n: 8 });
  rect(ctx, 0, 60, 130, 130, t('#5a5048')); rect(ctx, 520, 70, 120, 120, t('#4e463e'));
  poly(ctx, [0, 186, VW, 186, VW, VH, 0, VH], t('#7a7062')); for (let i = 0; i < 22; i++) oval(ctx, (i * 73) % VW, 194 + (i * 19) % 40, 13, 2, rgba('#000000', 0.09));
  // 차양 친 좌판
  const sx = 350, sy = 206; for (const k of [-90, 90]) rect(ctx, sx + k - 2, sy - 96, 4, 96, t('#3a2c20'));
  for (let i = 0; i < 6; i++) poly(ctx, [sx - 96 + i * 32, sy - 100, sx - 64 + i * 32, sy - 100, sx - 68 + i * 32, sy - 76, sx - 92 + i * 32, sy - 76], t(i % 2 ? '#c8c0a8' : '#7a2a2e'));
  rect(ctx, sx - 88, sy - 34, 176, 8, t('#5a4632')); rect(ctx, sx - 84, sy - 26, 168, 26, t('#3e3024')); poly(ctx, [sx - 88, sy - 34, sx + 88, sy - 34, sx + 80, sy - 44, sx - 80, sy - 44], t('#6a2a4a'));
  // 뼛조각 함, 녹슨 칼, 반지, 낡은 책, 잔
  rect(ctx, sx - 66, sy - 54, 20, 12, t('#8a7038')); oval(ctx, sx - 56, sy - 48, 4, 3, t('#e8e0c8'));
  stroke(ctx, [sx - 32, sy - 42, sx + 6, sy - 48], 2.4, t('#8a8078')); stroke(ctx, [sx - 36, sy - 46, sx - 30, sy - 38], 2, t('#6a5030'));
  poly(ctx, [sx + 20, sy - 50, sx + 42, sy - 51, sx + 44, sy - 40, sx + 22, sy - 39], t('#4a2e2a')); stroke(ctx, [sx + 24, sy - 46, sx + 40, sy - 47], 0.8, t('#b89840'));
  poly(ctx, [sx + 56, sy - 42, sx + 60, sy - 56, sx + 72, sy - 56, sx + 68, sy - 42], t('#b89840')); rect(ctx, sx + 61, sy - 42, 3, 4, t('#b89840'));
  if (dim) { rect(ctx, sx - 2, sy - 76, 4, 10, '#3a2c20'); glow(v, sx, sy - 66, 80, '#ffb060', 0.32); }
  person(v, sx + 20, sy - 2, 92, { f: -1, cloth: '#4a2e4a', hair: '#5a4030', hat: true, arm: 'up', rim, rimDir: -1 });
  rect(ctx, sx - 88, sy - 34, 176, 34, rgba(t('#3e3024'), 1)); rect(ctx, sx - 88, sy - 34, 176, 6, t('#5a4632'));
  person(v, sx - 130, 236, 100, mine(v, { f: 1, arm: 'chest', rim, rimDir: 1 }));
  person(v, sx - 186, 238, 90, folk(1, { f: 1, pose: 'kneel', arm: 'fwd' })); person(v, sx + 150, 236, 92, folk(4, { f: -1, old: true, stick: 'staff' })); person(v, sx + 196, 238, 86, folk(5, { f: -1 }));
  finish(v, { noLeaves: true });
}

/* ---------- 약초꾼과 약방 ---------- */
/** 약초 캐기: 숲 가의 비탈에서 풀을 살핀다 */
function herbGather(v) {
  const { ctx, t, R } = v; sky(v); far(v);
  const gy = (x) => 176 - x * 0.07 - fbm1(x / 150 + v.q, 3) * 8; ground(v, gy, { tufts: 240 });
  for (const [x, h] of [[420, 190], [480, 220], [550, 200], [610, 230], [360, 150]]) tree(v, x, gy(x) + 26 + (h - 150) * 0.16, h, { dark: true });
  // 바위와 그 틈의 풀
  poly(ctx, [40, 216, 70, 176, 130, 170, 160, 214], t('#6a6860')); poly(ctx, [70, 176, 130, 170, 110, 192, 84, 196], t('#7c7a70'));
  const herb = (x, y, s, c, fl) => { for (let i = -2; i <= 2; i++) stroke(ctx, [x, y, x + i * s * 0.34, y - s * (1 - Math.abs(i) * 0.16)], 1.3, t(c)); if (fl) for (let i = -1; i <= 1; i++) oval(ctx, x + i * s * 0.36, y - s * 0.94, 1.8, 1.8, t(fl)); };
  for (let i = 0; i < 16; i++) herb(180 + R() * 200, 204 + R() * 30, 8 + R() * 6, ['#4a7a3a', '#5a8a4a', '#3a6a4a'][i % 3], [null, '#d8c8f0', '#f0e0a0', null][i % 4]);
  herb(150, 212, 12, '#3a6a4a', '#c8a0e0'); herb(128, 172, 9, '#5a8a4a', '#f0e0a0');
  // 바구니와 호미
  const bx = 300, by = 236; poly(ctx, [bx - 16, by - 16, bx + 16, by - 16, bx + 12, by, bx - 12, by], t('#8a6a40')); for (let i = 0; i < 4; i++) stroke(ctx, [bx - 14 + i * 9, by - 14, bx - 11 + i * 7, by - 1], 0.8, rgba('#000000', 0.25)); ctx.strokeStyle = t('#6a5030'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(bx, by - 16, 14, 12, 0, Math.PI, 0); ctx.stroke(); for (let i = -1; i <= 1; i++) herb(bx + i * 7, by - 14, 9, '#4a7a3a', i ? null : '#d8c8f0');
  person(v, 228, 238, 102, mine(v, { f: -1, pose: 'kneel', arm: 'fwd' })); stroke(ctx, [196, 214, 184, 226], 2, t('#5a4632')); poly(ctx, [184, 226, 178, 222, 180, 232], t('#787c84'));
  person(v, 396, 226, 76, folk(4, { f: -1, old: true, stick: 'staff', hat: true }));
  finish(v);
}
/** 약 달이기. variant brew / poison(밤에 몰래 타는 것) */
function herbBrew(v) {
  const { ctx } = v, poison = v.variant === 'poison'; room(v, { stone: false, wall: poison ? '#262228' : '#33291f', floor: poison ? '#1c181c' : '#241c15', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.16);
  windowAt(v, 120, 40, 34, 50);
  // 들보에 매단 풀 다발
  rect(ctx, 0, 24, VW, 6, '#1c140e'); for (let i = 0; i < 11; i++) { const x = 190 + i * 30, h = 20 + (i % 3) * 8; stroke(ctx, [x, 30, x, 38], 0.8, '#6a5a44'); poly(ctx, [x - 2, 38, x + 2, 38, x + 7, 38 + h, x - 7, 38 + h], ['#5a6a3a', '#7a6a3a', '#4a5a40', '#6a4a5a'][i % 4]); }
  // 화덕과 약탕기
  const fx = 420, fy = 204;
  rect(ctx, fx - 50, fy - 30, 100, 44, '#3a3432'); rect(ctx, fx - 54, fy - 34, 108, 6, '#4a4440'); poly(ctx, [fx - 22, fy + 14, fx - 22, fy - 8, fx, fy - 18, fx + 22, fy - 8, fx + 22, fy + 14], '#140e0c');
  flame(v, fx - 6, fy + 10, 9); flame(v, fx + 8, fy + 10, 7); glow(v, fx, fy, 120, poison ? '#a0ff90' : '#ff9a48', poison ? 0.16 : 0.34);
  oval(ctx, fx, fy - 46, 22, 14, '#2a2622'); rect(ctx, fx - 14, fy - 62, 28, 6, '#3a3632'); oval(ctx, fx, fy - 64, 4, 3, '#3a3632'); stroke(ctx, [fx + 20, fy - 50, fx + 34, fy - 60], 3, '#2a2622'); stroke(ctx, [fx - 20, fy - 48, fx - 36, fy - 44], 3, '#3a2c20');
  smoke(v, fx + 4, fy - 66, 80, 20, poison ? '#7a9a70' : '#c8c0b0', 0.2);
  // 작업대: 막자사발, 병, 저울
  const tx = 240, ty = 208; table(ctx, tx, ty, 70);
  oval(ctx, tx - 40, ty - 38, 12, 5, '#8a8478'); poly(ctx, [tx - 52, ty - 38, tx - 28, ty - 38, tx - 32, ty - 30, tx - 48, ty - 30], '#6a665e'); stroke(ctx, [tx - 38, ty - 40, tx - 28, ty - 54], 2.6, '#a8a498');
  for (let i = 0; i < 4; i++) { const x = tx + 6 + i * 15, c = poison ? ['#3a5a3a', '#4a3a5a', '#2a2a2a', '#5a3a3a'][i] : ['#7a5a3a', '#5a7a4a', '#8a6a3a', '#4a6a7a'][i]; rect(ctx, x, ty - 52 + (i % 2) * 4, 9, 14 - (i % 2) * 4, c); rect(ctx, x + 2.5, ty - 56 + (i % 2) * 4, 4, 4, '#b8a888'); }
  candle(v, tx + 76, ty - 34, 8); if (!poison) pool(v, tx, ty - 40, 110, 44, '#ffb060', 0.2);
  if (poison) {
    person(v, tx + 110, ty + 34, 104, mine(v, { raw: true, f: -1, hood: true, arm: 'fwd', rim: 'rgba(170,255,150,.4)', rimDir: -1 }));
    oval(ctx, tx + 70, ty - 60, 2, 3, '#b0ffa0'); rect(ctx, 566, 56, 44, 116, '#141012'); rect(ctx, 566, 168, 44, 3, 'rgba(255,180,100,.45)');
  } else {
    person(v, tx + 104, ty + 34, 104, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: -1 }));
    person(v, tx - 110, ty + 36, 62, folk(3, { raw: true, f: 1, child: true, arm: 'fwd' }));
  }
  ctx.restore(); finish(v, { inside: true });
}
/** 약방: 서랍 많은 약장과 손님. variant shop / queue(돌림병 때 문밖까지 선 줄) */
function herbShop(v) {
  const { ctx } = v, queue = v.variant === 'queue'; room(v, { stone: false, wall: '#352b20', floor: '#261d15', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.12);
  // 약장
  rect(ctx, 60, 24, 250, 148, '#3e2e20'); for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { const x = 66 + c * 27, y = 30 + r * 24; rect(ctx, x, y, 24, 20, (r + c) % 2 ? '#4e3a28' : '#48351f'); oval(ctx, x + 12, y + 11, 1.8, 1.8, '#b89840'); rect(ctx, x + 6, y + 3, 12, 4, '#cfc2a2'); }
  // 문
  const dx = 516; rect(ctx, dx - 34, 44, 68, 128, queue ? '#8a8e94' : '#c8c8b8'); if (!queue) rect(ctx, dx - 34, 130, 68, 42, '#7a8a5a'); rect(ctx, dx - 40, 38, 80, 7, '#241a12'); rect(ctx, dx - 40, 44, 7, 128, '#241a12'); rect(ctx, dx + 33, 44, 7, 128, '#241a12');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; poly(ctx, [dx - 34, 172, dx + 34, 172, dx + 10, 240, dx - 150, 240], 'rgba(255,240,200,.07)'); ctx.restore();
  rect(ctx, 0, 20, VW, 5, '#1c140e'); for (let i = 0; i < 6; i++) { const x = 340 + i * 26, h = 18 + (i % 3) * 7; poly(ctx, [x - 2, 25, x + 2, 25, x + 6, 25 + h, x - 6, 25 + h], ['#5a6a3a', '#7a6a3a', '#4a5a40'][i % 3]); }
  // 계산대: 약봉지, 저울, 병
  const tx = 300, ty = 210; rect(ctx, tx - 110, ty - 40, 220, 8, '#5a4632'); rect(ctx, tx - 104, ty - 32, 208, 62, '#3a2a1e'); for (let i = 0; i < 5; i++) stroke(ctx, [tx - 84 + i * 42, ty - 30, tx - 84 + i * 42, ty + 30], 0.8, 'rgba(0,0,0,.25)');
  stroke(ctx, [tx - 60, ty - 40, tx - 60, ty - 72], 2, '#8a7038'); stroke(ctx, [tx - 82, ty - 70, tx - 38, ty - 70], 1.6, '#8a7038'); for (const k of [-22, 22]) { stroke(ctx, [tx - 60 + k, ty - 70, tx - 68 + k, ty - 52, tx - 52 + k, ty - 52, tx - 60 + k, ty - 70], 0.7, '#8a7038'); oval(ctx, tx - 60 + k, ty - 51, 9, 2.4, '#8a7038'); }
  for (let i = 0; i < 3; i++) poly(ctx, [tx + 4 + i * 20, ty - 42, tx + 20 + i * 20, ty - 43, tx + 18 + i * 20, ty - 52, tx + 6 + i * 20, ty - 51], '#d8ccae');
  for (let i = 0; i < 3; i++) { rect(ctx, tx + 70 + i * 12, ty - 56, 8, 16, ['#7a5a3a', '#5a7a4a', '#4a6a7a'][i]); rect(ctx, tx + 72 + i * 12, ty - 60, 4, 4, '#b8a888'); }
  glow(v, tx, ty - 60, 150, '#ffb060', 0.16);
  person(v, tx - 10, ty + 2, 100, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: 1 }));
  rect(ctx, tx - 104, ty - 34, 208, 64, '#3a2a1e'); rect(ctx, tx - 110, ty - 40, 220, 8, '#5a4632'); for (let i = 0; i < 5; i++) stroke(ctx, [tx - 84 + i * 42, ty - 30, tx - 84 + i * 42, ty + 30], 0.8, 'rgba(0,0,0,.25)');
  if (queue) {
    for (const [x, i, o] of [[424, 1, { arm: 'chest' }], [462, 4, { old: true, stick: 'staff' }], [496, 0, { hood: true }], [526, 2, {}], [552, 5, { hood: true }]]) person(v, x, 238 - (x - 424) * 0.3, 98 - (x - 424) * 0.16, folk(i, { raw: true, f: -1, ...o }));
    person(v, 444, 240, 54, folk(3, { raw: true, f: -1, child: true }));
  } else {
    person(v, 432, 236, 98, folk(1, { raw: true, f: -1, arm: 'fwd', rim: COLD, rimDir: -1 }));
    person(v, 470, 238, 54, folk(3, { raw: true, f: -1, child: true }));
  }
  ctx.restore(); finish(v, { inside: true });
}

export const PLATES7 = {
  /** 숨은 왕가의 피. variant: scroll burn acclaim offer pretender */
  claim(v) { const k = v.variant ?? 'scroll'; return k === 'acclaim' || k === 'offer' ? claimAcclaim(v) : k === 'pretender' ? claimPretender(v) : claimScroll(v); },
  /** 용사 시대의 성유물. variant: find chosen rejected contest fake */
  relic(v) { const k = v.variant ?? 'find'; return k === 'contest' ? relicContest(v) : k === 'fake' ? relicFake(v) : relicShrine(v); },
  /** 약초꾼과 약방. variant: gather brew poison shop queue */
  apothecary(v) { const k = v.variant ?? 'gather'; return k === 'brew' || k === 'poison' ? herbBrew(v) : k === 'shop' || k === 'queue' ? herbShop(v) : herbGather(v); },
};
