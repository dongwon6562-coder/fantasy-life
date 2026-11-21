// 25단계 삽화: 첩보와 밀정, 마나의 흐름, 내 농장.
import { fbm1, rgba, dark, light } from './sceneKit.js';
import { VW, VH, HZ, sky, far, townFar, ground, room, windowAt, glow, candle, pool, smoke, person, crowd, lying, tree, crows, flame, finish, zoom } from './vignetteKit.js';
import { cottage } from './vignettePlates4.js';
import { cow, spear, fork } from './vignettePlates5.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.5)', MANA = '#8ab8ff';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const dimOf = (v) => v.S.tod === 'night' || v.S.tod === 'dusk';
const table = (ctx, tx, ty, w) => { poly(ctx, [tx - w, ty - 40, tx + w, ty - 40, tx + w + 16, ty - 24, tx - w - 16, ty - 24], '#4e3a2a'); rect(ctx, tx - w - 16, ty - 24, w * 2 + 32, 6, '#30241a'); rect(ctx, tx - w - 6, ty - 18, 7, 42, '#281e16'); rect(ctx, tx + w, ty - 18, 7, 42, '#281e16'); };

/* ---------- 첩보 ---------- */
/** 선술집 뒷방: 봉한 편지를 밀어 주는 사람 */
function spyRecruit(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#322a24', floor: '#241c16', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.2);
  // 반쯤 걷힌 휘장 너머 술집의 불빛
  rect(ctx, 60, 30, 110, 142, '#6a4a2a'); glow(v, 115, 100, 90, '#ffb060', 0.3); for (const [x, h] of [[90, 60], [124, 66], [146, 58]]) { oval(ctx, x, 172 - h - 7, 6, 7, '#2a1c12'); rect(ctx, x - 8, 172 - h, 16, h, '#2a1c12'); }
  poly(ctx, [52, 24, 110, 24, 96, 172, 52, 172], '#4a1e22'); poly(ctx, [150, 24, 180, 24, 180, 172, 164, 172], '#4a1e22'); rect(ctx, 48, 20, 136, 6, '#1c1612');
  windowAt(v, 540, 50, 30, 44, { bars: 3 });
  const tx = 350, ty = 204; table(ctx, tx, ty, 74);
  candle(v, tx - 50, ty - 34, 9); pool(v, tx - 20, ty - 40, 130, 50, '#ffb060', 0.22);
  // 편지와 봉랍, 돈주머니
  poly(ctx, [tx - 10, ty - 36, tx + 22, ty - 37, tx + 25, ty - 28, tx - 12, ty - 27], '#d8ccae'); oval(ctx, tx + 7, ty - 32, 3.4, 2.4, '#8a1e1a');
  oval(ctx, tx + 50, ty - 32, 9, 6, '#5a4632'); stroke(ctx, [tx + 46, ty - 37, tx + 54, ty - 38], 1.2, '#2a2018'); oval(ctx, tx + 62, ty - 28, 3, 1.2, '#d8b040');
  rect(ctx, tx - 34, ty - 44, 7, 9, '#6a5a48');
  person(v, tx + 118, ty + 38, 106, { raw: true, f: -1, pose: 'sit', cloth: '#26222a', hair: '#1c1614', hood: true, cloak: true, arm: 'fwd', rim: WARM, rimDir: -1 });
  person(v, tx - 118, ty + 40, 106, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'chest', rim: WARM, rimDir: 1 }));
  ctx.restore(); finish(v, { inside: true });
}
/** 남의 서재, 한밤: 서랍의 편지를 꺼낸다. variant steal / caught(문이 열린다) */
function spyStudy(v) {
  const { ctx } = v, caught = v.variant === 'caught'; room(v, { wall: '#2e2a30', floor: '#201c20', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.15);
  windowAt(v, 120, 36, 40, 70, { arch: true }); ctx.save(); ctx.globalCompositeOperation = 'lighter'; poly(ctx, [100, 106, 140, 106, 250, 240, 150, 240], 'rgba(170,190,230,.08)'); ctx.restore();
  // 책장
  rect(ctx, 220, 20, 150, 152, '#241c18'); for (let r = 0; r < 4; r++) { rect(ctx, 224, 54 + r * 36, 142, 3, '#3a2c22'); for (let i = 0; i < 15; i++) rect(ctx, 228 + i * 9, 30 + r * 36 + (i % 3), 7, 24 - (i % 3), ['#5a3030', '#30405a', '#4a4a30', '#40304a', '#2a3a34'][(i + r) % 5]); }
  // 큰 책상, 열린 서랍, 가린 등불
  const tx = 430, ty = 206;
  rect(ctx, tx - 80, ty - 44, 160, 8, '#4e3a2a'); rect(ctx, tx - 76, ty - 36, 152, 46, '#3a2a1e'); rect(ctx, tx - 20, ty - 26, 60, 16, '#2a1e16'); poly(ctx, [tx - 22, ty - 24, tx + 42, ty - 24, tx + 50, ty - 12, tx - 30, ty - 12], '#4a3626'); for (let i = 0; i < 4; i++) poly(ctx, [tx - 14 + i * 13, ty - 22, tx - 4 + i * 13, ty - 23, tx - 2 + i * 13, ty - 15, tx - 13 + i * 13, ty - 14], '#d8ccae');
  rect(ctx, tx + 50, ty - 58, 9, 13, '#2a2018'); rect(ctx, tx + 52, ty - 56, 3, 9, '#ffd890'); glow(v, tx + 50, ty - 50, 60, '#ffb060', 0.3);
  poly(ctx, [tx - 60, ty - 48, tx - 30, ty - 49, tx - 28, ty - 44, tx - 62, ty - 44], '#d8ccae'); stroke(ctx, [tx - 22, ty - 46, tx - 12, ty - 60], 1.2, '#d8d0c0');
  // 문
  const dx = 590;
  if (caught) { rect(ctx, dx - 30, 50, 60, 122, '#ffc070'); glow(v, dx, 120, 110, '#ffb060', 0.4); poly(ctx, [dx - 30, 172, dx + 30, 172, dx - 40, 240, dx - 150, 240], 'rgba(255,180,100,.12)'); poly(ctx, [dx + 30, 50, dx + 52, 60, dx + 52, 180, dx + 30, 172], '#3a2a1e'); person(v, dx, 196, 104, { raw: true, f: -1, cloth: '#1a1414', hair: '#140e0c', arm: 'fwd' }); rect(ctx, dx - 26, 124, 6, 8, '#ffe0a0'); }
  else { rect(ctx, dx - 30, 50, 60, 122, '#1a1414'); rect(ctx, dx - 34, 46, 68, 5, '#3a2a1e'); rect(ctx, dx - 30, 168, 60, 3, 'rgba(255,180,100,.5)'); oval(ctx, dx + 20, 116, 2.4, 2.4, '#8a7038'); }
  person(v, tx - 30, ty + 30, 104, mine(v, { raw: true, f: caught ? 1 : 1, pose: caught ? 'stand' : 'bow', hood: true, cloak: true, arm: 'fwd', cloth: '#22202a', rim: caught ? WARM : COLD, rimDir: caught ? -1 : 1 }));
  ctx.restore(); finish(v, { inside: true });
}
/** 골목의 전갈: 담 틈에 쪽지를 넣는다. variant drop / tail(뒤를 밟는 그림자) */
function spyAlley(v) {
  const { ctx, t } = v, tail = v.variant === 'tail', dim = dimOf(v), rim = dim ? WARM : null; sky(v);
  // 골목 양쪽 집과 멀리 광장
  townFar(v, 330, 150, { s: 1.1, n: 6 });
  poly(ctx, [0, 0, 210, 0, 250, 176, 0, VH], t('#6a5e52')); poly(ctx, [VW, 0, 440, 0, 400, 176, VW, VH], t('#5a5048'));
  for (let i = 0; i < 9; i++) { stroke(ctx, [0, 30 + i * 24, 214 + i * 4, 30 + i * 17], 0.7, rgba('#000000', 0.16)); stroke(ctx, [VW, 30 + i * 24, 436 - i * 4, 30 + i * 17], 0.7, rgba('#000000', 0.16)); }
  rect(ctx, 60, 60, 44, 56, t('#2a2420')); rect(ctx, 520, 50, 40, 50, dim ? '#d8a050' : t('#2a2420')); if (dim) glow(v, 540, 75, 50, '#ffb060', 0.3);
  poly(ctx, [0, VH, 250, 176, 400, 176, VW, VH], t('#7c7264')); for (let i = 0; i < 7; i++) stroke(ctx, [250 - i * 40, 176 + i * 11, 400 + i * 40, 176 + i * 11], 0.7, rgba('#000000', 0.14));
  stroke(ctx, [214, 44, 436, 40], 0.8, t('#2a2018')); for (let i = 0; i < 5; i++) poly(ctx, [250 + i * 38, 43, 268 + i * 38, 43, 264 + i * 38, 62, 252 + i * 38, 60], t(['#b8b0a0', '#8a5a4a', '#a8a090', '#5a6a7a', '#b8b0a0'][i]));
  oval(ctx, 140, 214, 20, 26, t('#4a3a2a')); for (const k of [-12, 12]) stroke(ctx, [121, 214 + k, 159, 214 + k], 1.4, t('#2a2a2e'));
  person(v, 330, 190, 40, folk(1, { f: -1 })); person(v, 356, 186, 36, folk(4, { f: 1 }));
  if (tail) {
    person(v, 300, 232, 100, mine(v, { f: 1, cloak: true, rim, rimDir: 1 }));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 196, VH); ctx.clip(); person(v, 190, 226, 98, { f: 1, cloth: '#1c1a1e', hair: '#0c0a0a', hood: true, cloak: true }); ctx.restore();
    poly(ctx, [196, 228, 250, 232, 252, 238, 196, 236], rgba('#000000', 0.25));
  } else {
    // 담의 빠진 돌과 쪽지
    rect(ctx, 468, 150, 16, 10, '#14100e'); poly(ctx, [470, 152, 478, 151, 479, 157, 471, 158], '#d8ccae');
    person(v, 440, 230, 100, mine(v, { f: 1, cloak: true, hood: true, arm: 'fwd', rim, rimDir: -1 }));
    person(v, 236, 222, 80, folk(0, { f: -1, hat: true }));
  }
  finish(v, { noLeaves: true });
}
/** 정체가 드러난 밤: 횃불 든 순찰대에 둘러싸인다 */
function spyExposed(v) {
  const { ctx, t } = v; sky(v); townFar(v, 320, 140, { s: 1.2, n: 8 });
  rect(ctx, 0, 60, 150, 130, t('#4a443e')); rect(ctx, 500, 40, 140, 150, t('#40382e')); rect(ctx, 40, 100, 30, 44, '#d8a050'); glow(v, 55, 122, 40, '#ffb060', 0.3);
  poly(ctx, [0, 186, VW, 186, VW, VH, 0, VH], t('#6a6258')); for (let i = 0; i < 24; i++) oval(ctx, (i * 71) % VW, 196 + (i * 13) % 40, 14, 2, rgba('#000000', 0.1));
  pool(v, 330, 220, 260, 24, '#ff9a48', 0.28);
  for (const [x, y, f] of [[150, 228, 1], [206, 236, 1], [470, 230, -1], [530, 236, -1], [590, 228, -1]]) { person(v, x, y, 96, { f, cloth: '#5a5e66', hair: '#2a1e16', hat: true, arm: 'fwd', rim: WARM, rimDir: f }); spear(v, x + f * 20, y - 40, 70, f * 1.1); }
  for (const x of [100, 430]) { rect(ctx, x - 1.2, 130, 2.4, 66, t('#2a2018')); flame(v, x, 130, 7); }
  person(v, 96, 232, 96, { f: 1, cloth: '#3a2a3e', hair: '#5a4030', hat: true, cloak: true, arm: 'up', rim: WARM, rimDir: 1 });
  person(v, 330, 234, 102, mine(v, { f: -1, cloak: true, arm: 'chest', rim: WARM, rimDir: 1 }));
  poly(ctx, [352, 232, 372, 231, 374, 236, 354, 238], '#d8ccae'); poly(ctx, [366, 226, 384, 228, 382, 233], '#d8ccae');
  finish(v, { noLeaves: true });
}

/* ---------- 마나의 흐름 ---------- */
/** 마나 샘. variant spring(샘지기들) / claim(샘을 두고 맞선 두 패) / dry(마른 샘) */
function manaSpring(v) {
  const { ctx, t, R } = v, k = v.variant ?? 'spring', dry = k === 'dry'; sky(v); far(v);
  const gy = (x) => 162 - fbm1(x / 170 + v.q, 3) * 7;
  ground(v, gy, dry ? { color: '#8a8478', color2: '#5a564e', tufts: 20 } : { tufts: 200 });
  if (dry) { ctx.strokeStyle = rgba(t('#3a3632'), 0.5); ctx.lineWidth = 1; for (let i = 0; i < 50; i++) { const d = R(), x = R() * VW, y = 170 + d * d * 68; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 34, y + 3 + d * 6); ctx.lineTo(x + (R() - 0.5) * 44, y + 5 + d * 12); ctx.stroke(); } }
  for (const [x, h] of [[40, 190], [110, 150], [560, 170], [620, 200]]) tree(v, x, 184 + (h - 150) * 0.2, h, { dark: !dry, bare: dry });
  // 선돌 고리
  const cx = 330, cy = 206;
  for (const [x, y, h, w] of [[cx - 130, cy - 20, 60, 14], [cx - 70, cy - 34, 76, 16], [cx + 4, cy - 40, 84, 16], [cx + 78, cy - 32, 70, 15], [cx + 136, cy - 18, 56, 13]]) { poly(ctx, [x - w / 2, y, x - w * 0.4, y - h, x + w * 0.3, y - h - 5, x + w / 2, y], t(dry ? '#6a665e' : '#5e5c56')); if (!dry) for (let i = 0; i < 3; i++) stroke(ctx, [x - 2, y - h * (0.3 + i * 0.2), x + 2, y - h * (0.36 + i * 0.2)], 1, rgba(MANA, 0.7)); }
  // 샘
  ctx.fillStyle = t('#6a665e'); ctx.beginPath(); ctx.ellipse(cx, cy, 96, 17, 0, 0, TAU); ctx.fill();
  if (dry) { oval(ctx, cx, cy, 82, 12, t('#3a3632')); for (let i = 0; i < 7; i++) stroke(ctx, [cx - 60 + i * 20, cy - 4 + (i % 2) * 5, cx - 48 + i * 20, cy + 4 - (i % 3) * 3], 0.9, rgba('#000000', 0.4)); crows(v, 380, 60, 4, 60); }
  else {
    oval(ctx, cx, cy, 82, 12, '#2a4a7a'); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(v, cx, cy, 160, MANA, 0.34, 40); oval(ctx, cx, cy - 1, 60, 7, rgba('#c8e0ff', 0.5));
    const g = ctx.createLinearGradient(0, 0, 0, cy); g.addColorStop(0, rgba(MANA, 0)); g.addColorStop(1, rgba(MANA, 0.3)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 40, cy); ctx.lineTo(cx - 14, 0); ctx.lineTo(cx + 14, 0); ctx.lineTo(cx + 40, cy); ctx.fill();
    for (let i = 0; i < 60; i++) { ctx.fillStyle = rgba('#c8e0ff', 0.3 + R() * 0.6); ctx.fillRect(cx + (R() - 0.5) * 150 * (0.3 + R()), cy - R() * 170, 1.3, 1.3); }
    ctx.restore();
  }
  const rim = dry ? null : 'rgba(150,190,255,.6)';
  if (k === 'claim') {
    [[150, 232, 0], [196, 238, 2], [110, 236, 4]].forEach(([x, y, i]) => { person(v, x, y, 94, folk(i, { f: 1, arm: i === 0 ? 'fwd' : undefined, rim, rimDir: 1 })); spear(v, x - 14, y, 112, -0.05); });
    [[520, 232, 3], [566, 238, 5]].forEach(([x, y, i]) => { person(v, x, y, 94, { f: -1, cloth: ['#3a2a4e', '#2e2a4a'][i === 3 ? 0 : 1], hair: HR[i], robe: true, arm: i === 3 ? 'up' : undefined, rim, rimDir: -1 }); });
    glow(v, 508, 150, 16, '#c8a0ff', 0.6);
    person(v, 246, 236, 100, mine(v, { f: 1, arm: 'chest', rim, rimDir: 1 }));
  } else if (dry) {
    person(v, 220, 234, 100, mine(v, { f: 1, pose: 'kneel', arm: 'fwd' })); person(v, 470, 230, 92, folk(5, { f: -1, old: true, cloak: true, stick: 'staff' }));
  } else {
    person(v, 470, 230, 94, { f: -1, cloth: '#3a4a5a', hair: '#c8c4bc', robe: true, old: true, stick: 'staff', rim, rimDir: -1 }); person(v, 520, 236, 90, { f: -1, cloth: '#3a4a5a', hair: HR[1], robe: true, hood: true, rim, rimDir: -1 });
    person(v, 210, 234, 100, mine(v, { f: 1, arm: 'fwd', rim, rimDir: 1 }));
  }
  finish(v, { noLeaves: true });
}
/** 마나 폭풍: 하늘을 가르는 빛의 띠, 들에서 달아나는 사람들 */
function manaStorm(v) {
  const { ctx, t, R } = v; sky(v);
  rect(ctx, 0, 0, VW, VH, rgba('#1a1030', 0.3));
  // 빛의 띠
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [y0, c, a] of [[20, '#8a70ff', 0.2], [44, MANA, 0.18], [70, '#c890ff', 0.14]]) { for (let k = 0; k < 3; k++) { ctx.strokeStyle = rgba(c, a - k * 0.04); ctx.lineWidth = 16 + k * 18; ctx.beginPath(); for (let x = -20; x <= VW + 20; x += 20) { const y = y0 + Math.sin(x / 90 + y0 + v.q) * 18 + Math.sin(x / 37 + y0) * 6; ctx[x === -20 ? 'moveTo' : 'lineTo'](x, y); } ctx.stroke(); } }
  for (let i = 0; i < 90; i++) { ctx.fillStyle = rgba('#d8c8ff', 0.3 + R() * 0.6); ctx.fillRect(R() * VW, R() * 150, 1.3, 1.3 + R() * 5); }
  // 보랏빛 번개: 땅에서 솟는다
  for (const [x, y] of [[450, 150], [200, 146]]) { let px = x, py = y; ctx.strokeStyle = rgba('#e8d8ff', 0.85); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, py); for (let i = 0; i < 7; i++) { px += (R() - 0.5) * 30; py -= 14 + R() * 10; ctx.lineTo(px, py); } ctx.stroke(); glow(v, x, y, 40, '#b890ff', 0.5); }
  ctx.restore();
  far(v);
  const gy = (x) => 152 - fbm1(x / 190 + v.q, 3) * 7; ground(v, gy, { tufts: 160 });
  cottage(v, 110, 176, 80, 38, { lit: true }); tree(v, 30, 186, 140, { bare: true });
  // 땅에서 돋은 결정
  for (const [x, y, s] of [[450, 168, 22], [470, 176, 14], [432, 176, 12], [200, 160, 12], [560, 196, 18], [580, 204, 11]]) { poly(ctx, [x - s * 0.3, y, x - s * 0.12, y - s, x + s * 0.2, y - s * 0.8, x + s * 0.34, y], '#6a58c0'); poly(ctx, [x - s * 0.12, y - s, x + s * 0.2, y - s * 0.8, x + s * 0.04, y], '#a898f0'); glow(v, x, y - s * 0.5, s * 1.2, '#a080ff', 0.35); }
  // 쓰러진 짐승, 달아나는 사람들
  const rim = 'rgba(190,160,255,.6)';
  person(v, 300, 232, 96, mine(v, { f: -1, cloak: true, arm: 'up', rim, rimDir: 1 }));
  person(v, 240, 226, 88, folk(1, { f: -1, pose: 'bow', rim, rimDir: 1 })); person(v, 206, 230, 56, folk(3, { f: -1, child: true, rim, rimDir: 1 }));
  person(v, 520, 234, 92, { f: -1, cloth: '#2e2a4a', hair: '#c8c4bc', robe: true, old: true, arm: 'up', stick: 'staff', rim, rimDir: -1 });
  finish(v, { noLeaves: true });
}
/** 마나 중독: 살갗 아래로 빛이 도는 사람 */
function manaSick(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#2c2830', floor: '#201c20', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.18);
  windowAt(v, 130, 44, 34, 50);
  rect(ctx, 480, 40, 70, 100, '#1e181c'); for (let r = 0; r < 3; r++) { rect(ctx, 484, 70 + r * 26, 62, 3, '#3a2c30'); for (let i = 0; i < 5; i++) { rect(ctx, 490 + i * 11, 56 + r * 26, 6, 14, ['#3a5a7a', '#5a3a6a', '#3a6a5a', '#6a5a3a', '#4a4a6a'][(i + r) % 5]); } }
  // 침상
  const bx = 250, by = 200;
  rect(ctx, bx, by - 20, 200, 8, '#4a3626'); rect(ctx, bx + 4, by - 12, 7, 34, '#2e2218'); rect(ctx, bx + 188, by - 12, 7, 34, '#2e2218'); rect(ctx, bx - 4, by - 50, 8, 60, '#3a2a1c');
  lying(v, bx + 16, by - 20, 170, { raw: true, cover: '#7a7468' }); oval(ctx, bx + 22, by - 30, 10, 11, '#c9a184'); oval(ctx, bx + 16, by - 32, 9, 9, v.other.hair);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(v, bx + 60, by - 30, 70, MANA, 0.26); for (const [x0, y0, x1, y1, x2, y2] of [[bx + 30, by - 24, bx + 60, by - 30, bx + 96, by - 26], [bx + 60, by - 30, bx + 76, by - 20, bx + 110, by - 20], [bx + 28, by - 32, bx + 22, by - 38, bx + 26, by - 26]]) stroke(ctx, [x0, y0, x1, y1, x2, y2], 1, rgba('#b8d8ff', 0.8));
  for (let i = 0; i < 14; i++) { ctx.fillStyle = rgba('#c8e0ff', 0.6); ctx.fillRect(bx + 20 + (i * 37) % 110, by - 40 - (i * 23) % 60, 1.2, 1.2); }
  ctx.restore();
  rect(ctx, 470, by - 10, 30, 32, '#3a2a1c'); candle(v, 485, by - 10, 8); oval(ctx, 476, by - 12, 5, 2, '#d8d0b8');
  person(v, bx + 236, by + 36, 100, { raw: true, f: -1, cloth: '#3a4a5a', hair: '#8a8478', robe: true, old: true, arm: 'fwd', rim: COLD, rimDir: -1 });
  person(v, bx - 44, by + 40, 104, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', rim: COLD, rimDir: 1 }));
  ctx.restore(); finish(v, { inside: true });
}

/* ---------- 내 농장 ---------- */
/** 밭: 이랑이 멀어지는 들. 돌려주는 값은 땅 높이 */
function field(v, color, o = {}) {
  const { ctx, t } = v; sky(v); far(v); townFar(v, o.town ?? 540, HZ + 18, { s: 0.6, n: 5 });
  const gy = (x) => 150 - fbm1(x / 230 + v.q, 3) * 6; ground(v, gy, { tufts: 60 });
  if (color) {
    ctx.fillStyle = t(color); ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, 170); ctx.lineTo(VW, 162); ctx.lineTo(VW, VH); ctx.fill();
    if (o.rows !== false) for (let i = -8; i <= 20; i++) stroke(ctx, [300 + (i - 6) * 14, 164, 300 + (i - 6) * 70, VH], 1.2, rgba('#000000', 0.16));
  }
  return gy;
}
/** 쟁기질(variant plow)과 씨 뿌리기(sow) */
function farmPlow(v) {
  const { ctx, t, R } = v, sow = v.variant === 'sow'; v.P = { ...v.P, snow: false };
  field(v, '#6a5038'); tree(v, 600, 176, 130); cottage(v, 90, 170, 76, 36);
  for (let i = 0; i < 6; i++) { const x = 40 + R() * 560, y = 180 + R() * 50; stroke(ctx, [x - 3, y, x, y - 2, x + 3, y], 1, '#14100e'); }
  if (sow) {
    person(v, 300, 234, 100, mine(v, { f: 1, arm: 'fwd' })); poly(ctx, [282, 176, 304, 172, 308, 196, 286, 200], t('#b8a880'));
    for (let i = 0; i < 16; i++) oval(ctx, 330 + i * 5 + R() * 6, 176 + i * 2.6 + R() * 8, 1.1, 1.1, t('#d8c890'));
    person(v, 470, 222, 80, folk(1, { f: 1, arm: 'fwd' })); person(v, 180, 228, 60, folk(3, { f: 1, child: true }));
  } else {
    cow(v, 420, 228, 56, 1, '#5a4030'); cow(v, 440, 222, 54, 1, '#3a2c24');
    // 멍에와 쟁기
    stroke(ctx, [396, 196, 320, 204], 2.4, t('#4a3a2a')); stroke(ctx, [320, 204, 288, 228], 3, t('#4a3a2a')); poly(ctx, [288, 222, 304, 232, 284, 236], t('#787c84')); stroke(ctx, [320, 204, 284, 180], 2.4, t('#4a3a2a'));
    for (let i = 0; i < 9; i++) oval(ctx, 270 - i * 22, 234 + (i % 2) * 2, 9, 3, t('#4a3626'));
    person(v, 262, 236, 100, mine(v, { f: 1, arm: 'fwd' }));
    person(v, 520, 224, 70, folk(3, { f: -1, child: true }));
  }
  finish(v, { noLeaves: true });
}
/** 추수 */
function farmHarvest(v) {
  const { ctx, t, R } = v; v.P = { ...v.P, snow: false };
  field(v, '#c8a850', { rows: false });
  for (let i = 0; i < 520; i++) { const d = R(), x = 250 + R() * 390, y = 166 + d * d * 76, h = 5 + d * 14; ctx.strokeStyle = rgba(t(R() < 0.5 ? '#e0c068' : '#a88a3e'), 0.85); ctx.lineWidth = 0.8 + d * 0.7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1.5, y - h); ctx.stroke(); }
  ctx.fillStyle = t('#a89058'); ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, 170); ctx.lineTo(250, 166); ctx.lineTo(300, VH); ctx.fill(); for (let i = 0; i < 80; i++) { const x = R() * 270, y = 176 + R() * 60; stroke(ctx, [x, y, x + 1, y - 3], 0.8, rgba(t('#7a6430'), 0.7)); }
  // 볏단
  const sheaf = (x, y, s) => { poly(ctx, [x - s * 0.5, y, x - s * 0.16, y - s * 0.6, x - s * 0.5, y - s * 1.3, x + s * 0.5, y - s * 1.3, x + s * 0.16, y - s * 0.6, x + s * 0.5, y], t('#d8b860')); stroke(ctx, [x - s * 0.2, y - s * 0.6, x + s * 0.2, y - s * 0.6], 1.4, t('#7a5a30')); oval(ctx, x, y, s * 0.7, s * 0.12, rgba('#000000', 0.16)); };
  [[60, 200, 20], [84, 204, 20], [72, 196, 20], [160, 216, 26], [190, 220, 26], [176, 210, 26]].forEach((a) => sheaf(...a));
  // 수레
  rect(ctx, 450, 190, 70, 18, t('#5a4632')); ctx.fillStyle = t('#d8b860'); ctx.beginPath(); ctx.ellipse(485, 190, 34, 16, 0, Math.PI, 0); ctx.fill(); for (const x of [464, 506]) { ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, 210, 10, 0, TAU); ctx.stroke(); } cow(v, 566, 222, 50, 1, '#5a4030');
  // 낫질
  const scythe = (x, y, d) => { stroke(ctx, [x, y - 60, x + d * 30, y - 6], 1.8, t('#4a3a2a')); ctx.strokeStyle = t('#a8aeb6'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + d * 30, y - 6); ctx.quadraticCurveTo(x + d * 52, y - 14, x + d * 60, y - 2); ctx.stroke(); };
  person(v, 300, 234, 100, mine(v, { f: 1, pose: 'bow', arm: 'fwd' })); scythe(318, 232, 1);
  person(v, 380, 222, 86, folk(0, { f: 1, pose: 'bow', hat: true })); scythe(394, 220, 1);
  person(v, 232, 232, 88, folk(1, { f: -1, pose: 'bow' })); sheaf(212, 232, 22);
  finish(v, { noLeaves: true });
}
/** 물길 다툼: 수문 앞에서 맞선 이웃 */
function farmWater(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; v.P = { ...v.P, snow: false };
  field(v, null, { town: 110 }); tree(v, 590, 180, 150);
  // 왼쪽은 푸른 밭, 오른쪽은 마른 밭
  poly(ctx, [0, 172, 300, 168, 250, VH, 0, VH], t('#5a7a3a')); poly(ctx, [360, 168, VW, 166, VW, VH, 420, VH], t('#a89468'));
  for (let i = 0; i < 9; i++) { stroke(ctx, [10 + i * 30, 174, -40 + i * 30, VH], 1, rgba('#000000', 0.14)); stroke(ctx, [400 + i * 30, 170, 450 + i * 40, VH], 1, rgba('#000000', 0.12)); }
  // 도랑과 수문
  poly(ctx, [300, 168, 360, 168, 420, VH, 250, VH], t('#5a4a38')); poly(ctx, [312, 168, 348, 168, 360, 204, 302, 204], t('#4e6478')); poly(ctx, [300, 212, 362, 212, 400, VH, 268, VH], t('#3e3428'));
  rect(ctx, 292, 176, 8, 40, t('#4a3a2a')); rect(ctx, 362, 176, 8, 40, t('#4a3a2a')); rect(ctx, 288, 172, 86, 6, t('#3e3024')); rect(ctx, 300, 196, 62, 18, t('#5a4632')); for (let i = 0; i < 4; i++) stroke(ctx, [306 + i * 16, 196, 306 + i * 16, 214], 0.8, rgba('#000000', 0.25)); stroke(ctx, [331, 172, 331, 196], 2, t('#2a2018'));
  for (let i = 0; i < 4; i++) stroke(ctx, [316 + i * 9, 178 + (i % 2) * 6, 326 + i * 9, 178 + (i % 2) * 6], 1, rgba('#dfe8f0', 0.4));
  // 맞선 두 집
  person(v, 232, 232, 100, mine(v, { f: 1, arm: 'fwd', rim, rimDir: 1 })); stroke(ctx, [214, 232, 204, 150], 1.8, t('#4a3a2a')); poly(ctx, [198, 150, 210, 150, 208, 136, 200, 136], t('#787c84'));
  person(v, 180, 236, 88, folk(1, { f: 1, rim, rimDir: 1 }));
  person(v, 440, 232, 98, { f: -1, cloth: v.other.cloth, hair: v.other.hair, female: v.other.female, long: v.other.long, arm: 'up', rim, rimDir: -1 }); fork(v, 462, 232, 96, 0.08);
  person(v, 496, 236, 92, folk(4, { f: -1, arm: 'chest', rim, rimDir: -1 })); person(v, 540, 232, 88, folk(2, { f: -1, hat: true, rim, rimDir: -1 }));
  finish(v, { noLeaves: true });
}
/** 곳간: 쟁여 둔 자루를 센다. variant barn / sell(장에 내다 팖) */
function farmBarn(v) {
  const { ctx } = v, sell = v.variant === 'sell'; room(v, { stone: false, wall: '#3a2e24', floor: '#2a2018', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.12);
  // 열린 큰 문 너머의 바깥
  rect(ctx, 250, 40, 150, 132, v.S.tod === 'night' ? '#1a2030' : '#b8c0b0'); if (v.S.tod !== 'night') { rect(ctx, 250, 130, 150, 42, '#7a8a5a'); glow(v, 325, 100, 120, '#fff0d0', 0.2); ctx.save(); ctx.globalCompositeOperation = 'lighter'; poly(ctx, [250, 172, 400, 172, 470, 240, 180, 240], 'rgba(255,240,200,.08)'); ctx.restore(); }
  rect(ctx, 240, 34, 170, 7, '#241a12'); rect(ctx, 240, 40, 10, 132, '#241a12'); rect(ctx, 400, 40, 10, 132, '#241a12');
  rect(ctx, 0, 26, VW, 6, '#1c140e'); for (const x of [120, 520]) rect(ctx, x - 4, 26, 8, 146, '#1c140e');
  // 자루 더미
  const sack = (x, y, s, c = '#8a7a5c') => { oval(ctx, x, y - s * 0.7, s * 0.6, s * 0.8, c); poly(ctx, [x - s * 0.2, y - s * 1.4, x + s * 0.2, y - s * 1.4, x + s * 0.12, y - s * 1.6, x - s * 0.12, y - s * 1.6], dark(c, 0.2)); stroke(ctx, [x - s * 0.18, y - s * 1.38, x + s * 0.18, y - s * 1.38], 1, '#3a2c20'); };
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) sack(50 + i * 30 + r * 15, 200 - r * 22, 22, (i + r) % 2 ? '#8a7a5c' : '#7c6e52');
  for (let r = 0; r < 2; r++) for (let i = 0; i < 3 - r; i++) sack(500 + i * 32 + r * 16, 204 - r * 22, 22, (i + r) % 2 ? '#94846a' : '#8a7a5c');
  poly(ctx, [430, 172, 470, 110, 560, 104, 620, 172], '#a89050'); for (let i = 0; i < 12; i++) stroke(ctx, [440 + i * 14, 170, 470 + i * 9, 112 + (i % 3) * 4], 0.7, 'rgba(0,0,0,.18)');
  if (sell) {
    // 저울과 상인
    stroke(ctx, [330, 210, 330, 150], 2.4, '#3a2c20'); stroke(ctx, [300, 154, 360, 150], 2, '#3a2c20'); for (const [x, y] of [[300, 154], [360, 150]]) { stroke(ctx, [x, y, x - 10, y + 22, x + 10, y + 22, x, y], 0.8, '#8a7038'); oval(ctx, x, y + 23, 12, 3, '#8a7038'); } sack(360, 172, 12);
    person(v, 410, 236, 100, { raw: true, f: -1, cloth: '#4a2e4a', hair: '#5a4030', hat: true, arm: 'fwd', rim: WARM, rimDir: -1 }); oval(ctx, 384, 180, 5, 3, '#d8b040');
    person(v, 262, 236, 102, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: 1 }));
  } else {
    rect(ctx, 316, 196, 9, 12, '#3a2c20'); rect(ctx, 318, 198, 5, 8, '#ffd890'); glow(v, 320, 200, 110, '#ffb060', 0.28);
    person(v, 250, 236, 102, mine(v, { raw: true, f: -1, arm: 'fwd', rim: WARM, rimDir: 1 })); poly(ctx, [216, 178, 236, 176, 238, 190, 218, 192], '#cfc2a2');
    person(v, 420, 234, 60, folk(3, { raw: true, f: -1, child: true }));
  }
  ctx.restore(); finish(v, { inside: true });
}

export const PLATES6 = {
  /** 첩보. variant: recruit steal caught drop tail exposed */
  spy(v) { const k = v.variant ?? 'recruit'; return k === 'steal' || k === 'caught' ? spyStudy(v) : k === 'drop' || k === 'tail' ? spyAlley(v) : k === 'exposed' ? spyExposed(v) : spyRecruit(v); },
  /** 마나의 흐름. variant: spring claim dry storm sick */
  mana(v) { const k = v.variant ?? 'spring'; return k === 'storm' ? manaStorm(v) : k === 'sick' ? manaSick(v) : manaSpring(v); },
  /** 내 농장. variant: plow sow harvest water barn sell */
  farm(v) { const k = v.variant ?? 'plow'; return k === 'harvest' ? farmHarvest(v) : k === 'water' ? farmWater(v) : k === 'barn' || k === 'sell' ? farmBarn(v) : farmPlow(v); },
};
