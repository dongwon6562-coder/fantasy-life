// 33단계 삽화: 새 집안들의 어린 시절(귀족 저택, 마탑, 성당, 장인 공방, 빈민가 골목, 항구 도시),
// 마족(경계의 요새, 마족 사절, 마족의 땅), 옷감(베틀, 염색 통, 재봉 가게).
import { fbm1, hash, rgba, dark, light, mixh } from './sceneKit.js';
import { VW, VH, HZ, sky, far, ground, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, tree, banner, sunSign, crows, finish, zoom } from './vignetteKit.js';
import { spear, torch } from './vignettePlates5.js';
import { column, rubble } from './vignettePlates10.js';
import { seaAt, skiff, gulls } from './vignettePlates11.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.5)', PALE = 'rgba(200,170,230,.5)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const kid = (v, o = {}) => mine(v, { child: true, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const dimOf = (v) => v.S.tod === 'night' || v.S.tod === 'dusk';
// 옷감 빛깔: 꼭두서니 붉은빛, 쪽빛, 물푸레 노랑, 조개 자주, 호두 갈색, 바래지 않은 베
const DYE = ['#8a2e2a', '#2e4a6e', '#b89a3c', '#5e2a52', '#5a4030', '#cfc6ae', '#3e5a44'];

/** 마족 한 사람: 사람보다 길고 가늘다. 잿빛 살갗, 뒤로 휜 뿔 */
function demon(v, x, y, h, o = {}) {
  const { ctx } = v, s = h / 100, tone = (c) => (o.raw ? c : v.t(c));
  ctx.save(); ctx.translate(x, y); ctx.scale(o.thin ?? 0.86, 1); ctx.translate(-x, -y);
  person(v, x, y, h, { skin: '#8d8496', hair: '#16121a', cloth: '#221c28', robe: true, long: true, ...o });
  ctx.restore();
  const drop = o.pose === 'kneel' ? 24 : o.pose === 'sit' ? 20 : 0, hy = y - (93.2 - drop) * s, f = o.f ?? 0, c = tone(o.horn ?? '#34282e');
  for (const k of [-1, 1]) { const bx = x + k * 4 * s - f * 1.2 * s; stroke(ctx, [bx, hy - 5 * s, bx + k * 3 * s - f * 2 * s, hy - 9.5 * s, bx + k * 2.2 * s - f * 5 * s, hy - 13.5 * s], 1.7 * s, c); stroke(ctx, [bx + k * 2.2 * s - f * 5 * s, hy - 13.5 * s, bx + k * 0.8 * s - f * 7 * s, hy - 16 * s], 0.9 * s, c); }
  if (f) oval(ctx, x + f * 3.2 * s, hy - 0.6 * s, 1 * s, 0.8 * s, o.eye ?? '#e8d49a');
}
/** 마족의 깃발: 검은 천에 길이가 다른 창백한 세로 줄 셋 */
function demonBanner(v, x, y, h, o = {}) {
  const { ctx, t } = v, w = h * 0.2;
  stroke(ctx, [x, y, x, y - h], Math.max(1.2, h * 0.018), t('#1a1418')); stroke(ctx, [x - w * 0.7, y - h + 2, x + w * 0.7, y - h + 2], 1.6, t('#1a1418'));
  poly(ctx, [x - w * 0.6, y - h + 2, x + w * 0.6, y - h + 2, x + w * 0.6, y - h * 0.5, x + w * 0.2, y - h * 0.42, x, y - h * 0.5, x - w * 0.2, y - h * 0.4, x - w * 0.6, y - h * 0.48], o.raw ? '#1c161e' : t('#1c161e'));
  for (const [k, l] of [[-0.3, 0.2], [0, 0.34], [0.3, 0.14]]) stroke(ctx, [x + w * k, y - h + 8, x + w * k, y - h + 8 + h * l], 1.3, o.raw ? '#b8a8c0' : t('#b8a8c0'));
}
/** 큰 돛배 옆모습 (부두에 댄 배). y는 물금, s 1이면 길이 150쯤 */
function tallship(v, x, y, s, d, o = {}) {
  const { ctx, t } = v, hull = t(o.hull ?? '#33271e'), sp = t('#241a14'), sail = t(o.sail ?? '#c8bca0');
  ctx.save(); ctx.translate(x, y); ctx.scale(d * s, s); ctx.lineCap = 'round';
  for (const [mx, mh] of [[-36, 104], [4, 122], [42, 96]]) {
    rect(ctx, mx - 1.4, -mh - 12, 2.8, mh, sp);
    for (const k of [0.34, 0.62, 0.86]) { const yy = -12 - mh * k, w = 26 - k * 12; stroke(ctx, [mx - w, yy, mx + w, yy], 1.6, sp); stroke(ctx, [mx - w + 2, yy + 2.4, mx + w - 2, yy + 2.4], 3.6, sail); for (let i = -2; i <= 2; i++) stroke(ctx, [mx + i * w * 0.4, yy + 0.6, mx + i * w * 0.4, yy + 4.4], 0.5, sp); }
    stroke(ctx, [mx, -mh - 12, mx - 22, -12], 0.5, rgba(sp, 0.8)); stroke(ctx, [mx, -mh - 12, mx + 22, -12], 0.5, rgba(sp, 0.8)); stroke(ctx, [mx, -mh * 0.62 - 12, mx - 15, -12], 0.4, rgba(sp, 0.7)); stroke(ctx, [mx, -mh * 0.62 - 12, mx + 15, -12], 0.4, rgba(sp, 0.7));
  }
  stroke(ctx, [66, -18, 104, -34], 2, sp); stroke(ctx, [42, -108, 102, -33], 0.5, rgba(sp, 0.8)); stroke(ctx, [4, -134, 42, -108], 0.5, rgba(sp, 0.8)); stroke(ctx, [-36, -116, -76, -26], 0.5, rgba(sp, 0.8));
  poly(ctx, [4, -134, 4, -126, -12, -129], t(o.flag ?? '#7a2a26'));
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-78, -28); ctx.lineTo(-52, -26); ctx.lineTo(-50, -14); ctx.lineTo(58, -14); ctx.quadraticCurveTo(72, -16, 84, -26); ctx.quadraticCurveTo(74, 0, 58, 6); ctx.lineTo(-62, 6); ctx.quadraticCurveTo(-74, 2, -78, -28); ctx.fill();
  rect(ctx, -76, -30, 26, 3, light(hull, 0.14)); stroke(ctx, [-50, -14, 60, -14], 1.4, light(hull, 0.16)); stroke(ctx, [-72, -6, 68, -6], 0.7, light(hull, 0.1)); stroke(ctx, [-68, 1, 62, 1], 0.7, light(hull, 0.08));
  for (let i = 0; i < 6; i++) rect(ctx, -40 + i * 16, -11, 4, 3.4, o.lit ? '#f2c070' : dark(hull, 0.4));
  for (let i = 0; i < 3; i++) rect(ctx, -72 + i * 7, -24, 3.4, 4, o.lit ? '#f2c070' : dark(hull, 0.4));
  ctx.restore();
}
/** 벽 선반에 꽂힌 책 */
function books(v, x, y, w, rows, o = {}) {
  const { ctx, R } = v, cs = o.cols ?? ['#5a2a26', '#2e3a52', '#3e4a34', '#6a5430', '#3a2a3e', '#4a3a2c'];
  for (let r = 0; r < rows; r++) { rect(ctx, x, y + r * 19 + 16, w, 3, '#2a1e16'); for (let bx = x + 2; bx < x + w - 4;) { const bw = 3 + R() * 3.4, bh = 10 + R() * 5; if (R() < 0.1) { bx += 6; continue; } rect(ctx, bx, y + r * 19 + 16 - bh, bw, bh, cs[Math.floor(R() * cs.length)]); bx += bw + 0.6; } }
  rect(ctx, x - 3, y, 3, rows * 19 + 2, '#2a1e16'); rect(ctx, x + w, y, 3, rows * 19 + 2, '#2a1e16');
}
/** 둘둘 만 옷감 한 필 (누운 것) */
const bolt = (ctx, x, y, w, r, c) => { rect(ctx, x, y - r, w, r * 2, c); ctx.fillStyle = rgba('#000000', 0.2); ctx.fillRect(x, y + r * 0.2, w, r * 0.8); oval(ctx, x + w, y, r * 0.5, r, light(c, 0.16)); oval(ctx, x + w, y, r * 0.2, r * 0.42, dark(c, 0.3)); };
/** 줄에 넌 천 한 폭: 바람에 아래가 날린다 */
function sheet(v, x, y, w, h, c, sway = 0) {
  const { ctx } = v; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + 1); ctx.quadraticCurveTo(x + w + sway * 0.6, y + h * 0.5, x + w + sway, y + h); ctx.quadraticCurveTo(x + w * 0.5 + sway, y + h + 4, x + sway, y + h - 1); ctx.quadraticCurveTo(x + sway * 0.6, y + h * 0.5, x, y); ctx.fill();
  for (const k of [0.3, 0.66]) stroke(ctx, [x + w * k, y + 2, x + w * k + sway * 0.9, y + h - 2], 0.7, rgba('#000000', 0.16)); stroke(ctx, [x + 1.4, y + 2, x + 1.4 + sway * 0.9, y + h - 3], 1, rgba('#ffffff', 0.14));
}

/* ---------- 새 집안들의 어린 시절 ---------- */
/** 귀족 저택: 조상들의 초상이 걸린 회랑. 아버지와 맏이는 저쪽에, 나는 가정교사 곁에 */
function originManor(v) {
  const { ctx } = v; room(v, { wall: '#3e3430', floor: '#2c2622', fy: 174 });
  ctx.save(); zoom(v, 330, 240, 1.08);
  // 징두리 판벽과 바둑판 바닥
  rect(ctx, 0, 132, VW, 42, '#33261e'); rect(ctx, 0, 130, VW, 3, '#4a3828'); for (let x = 20; x < VW; x += 46) { rect(ctx, x, 140, 34, 26, '#2c2019'); }
  for (let r = 0; r < 4; r++) { const y0 = 174 + r * r * 4.4 + r * 4, y1 = 174 + (r + 1) * (r + 1) * 4.4 + (r + 1) * 4; for (let i = -8; i < 8; i++) if ((i + r) % 2 === 0) { const k0 = 44 + (y0 - 174) * 1.15, k1 = 44 + (y1 - 174) * 1.15; poly(ctx, [320 + i * k0, y0, 320 + (i + 1) * k0, y0, 320 + (i + 1) * k1, y1, 320 + i * k1, y1], 'rgba(200,190,170,.09)'); } }
  // 높은 창 둘과 휘장
  for (const x of [84, 556]) { windowAt(v, x, 16, 44, 110, { arch: true, bars: 2 }); poly(ctx, [x - 30, 8, x - 20, 8, x - 22, 130, x - 34, 130], '#5a2a2a'); poly(ctx, [x + 20, 8, x + 30, 8, x + 34, 130, x + 22, 130], '#5a2a2a'); rect(ctx, x - 36, 6, 72, 4, '#8a7038'); }
  shaft(v, 84, 120, 40, 120, 60, '#f0e0c0', 0.16);
  // 조상 초상 다섯 폭: 금테, 어두운 얼굴들. 하나는 천으로 가렸다
  for (let i = 0; i < 5; i++) {
    const x = 170 + i * 80, w = i === 2 ? 46 : 36, h = i === 2 ? 62 : 50, y = i === 2 ? 30 : 42;
    rect(ctx, x - w / 2 - 3, y - 3, w + 6, h + 6, '#8a7038'); rect(ctx, x - w / 2, y, w, h, '#1e1a1c');
    if (i === 4) { poly(ctx, [x - w / 2 - 4, y - 4, x + w / 2 + 4, y - 4, x + w / 2 + 2, y + h * 0.7, x, y + h * 0.82, x - w / 2 - 2, y + h * 0.6], '#2a2428'); continue; }
    oval(ctx, x, y + h * 0.36, w * 0.16, w * 0.19, '#8a7460'); poly(ctx, [x - w * 0.36, y + h, x - w * 0.24, y + h * 0.56, x + w * 0.24, y + h * 0.56, x + w * 0.36, y + h], ['#4a2a2a', '#2e3a4a', '#3a2a40', '#2e3e34'][i]); oval(ctx, x, y + h * 0.28, w * 0.18, w * 0.12, ['#3a2a1e', '#8a8478', '#1c1614', '#6a4a2a'][i]);
  }
  // 촛대와 긴 탁자 끝
  for (const x of [250, 410]) { rect(ctx, x - 1, 104, 2, 26, '#8a7038'); candle(v, x, 104, 9); } pool(v, 330, 196, 190, 28, '#ffb060', 0.14);
  // 오른쪽: 아버지가 맏이의 어깨에 손을 얹고 칼을 채워 준다. 뒤에 집사
  person(v, 500, 230, 110, { raw: true, f: -1, cloth: '#4a2630', hair: '#5a544c', cloak: true, arm: 'fwd', rim: WARM, rimDir: -1 });
  person(v, 452, 232, 88, { raw: true, f: 1, cloth: '#2e3a52', hair: '#6a4a2a', rim: WARM, rimDir: 1 }); stroke(ctx, [462, 184, 474, 222], 1.6, '#d8dce0'); stroke(ctx, [459, 186, 466, 183], 2, '#8a7038');
  person(v, 574, 234, 100, { raw: true, f: -1, cloth: '#1e1c20', hair: '#8a8478', old: true, arm: 'chest' });
  // 왼쪽: 책을 든 나, 내려다보는 가정교사. 멀찍이 떨어져 있다
  person(v, 182, 234, 66, kid(v, { raw: true, f: 1, arm: 'chest', rim: COLD, rimDir: -1 })); poly(ctx, [184, 194, 196, 192, 197, 202, 185, 204], '#d8ccae');
  person(v, 132, 236, 104, { raw: true, f: 1, cloth: '#3a342e', hair: '#3a2a1e', robe: true, old: true, stick: 'staff', rim: COLD, rimDir: -1 });
  ctx.restore(); finish(v, { inside: true });
}
/** 마탑: 둥근 서재. 바닥에 술식을 그리는 어머니, 높은 걸상에서 큰 책을 읽는 나 */
function originTower(v) {
  const { ctx, R } = v; room(v, { wall: '#2a2c36', floor: '#1e2028', fy: 176 });
  ctx.save(); zoom(v, 330, 240, 1.08);
  // 휘어 도는 책장과 사다리, 좁은 창
  books(v, 30, 14, 150, 8, {}); books(v, 460, 14, 150, 8, {});
  stroke(ctx, [150, 174, 168, 20], 2.2, '#3a2c20'); stroke(ctx, [170, 174, 188, 20], 2.2, '#3a2c20'); for (let i = 0; i < 8; i++) stroke(ctx, [152 + i * 2.2, 158 - i * 18, 172 + i * 2.2, 158 - i * 18], 1.6, '#3a2c20');
  windowAt(v, 330, 18, 30, 96, { arch: true, bars: 2 }); rect(ctx, 308, 114, 44, 5, '#1c1c24');
  // 혼천의 같은 기구와 떠 있는 빛 셋
  const ox = 256, oy = 132; rect(ctx, ox - 2, oy, 4, 42, '#6a5630'); rect(ctx, ox - 14, 170, 28, 5, '#6a5630');
  ctx.strokeStyle = '#b89a48'; ctx.lineWidth = 1.2; for (const [rx, ry, rot] of [[20, 20, 0], [20, 7, 0.5], [20, 9, -0.7]]) { ctx.beginPath(); ctx.ellipse(ox, oy - 18, rx, ry, rot, 0, TAU); ctx.stroke(); } oval(ctx, ox, oy - 18, 4, 4, '#9fd8f0'); glow(v, ox, oy - 18, 22, '#7fc8f0', 0.4);
  for (const [x, y] of [[214, 60], [404, 46], [440, 92]]) { oval(ctx, x, y, 2, 2, '#e8f4ff'); glow(v, x, y, 26, '#8fc0f0', 0.42); }
  // 책상: 쌓인 책, 유리병, 깃펜
  rect(ctx, 384, 140, 86, 6, '#3a2c20'); rect(ctx, 388, 146, 5, 30, '#2a1e16'); rect(ctx, 462, 146, 5, 30, '#2a1e16');
  for (const [x, w, c] of [[392, 22, '#5a2a26'], [394, 18, '#2e3a52'], [396, 20, '#3e4a34']]) rect(ctx, x, 140 - (c === '#5a2a26' ? 5 : c === '#2e3a52' ? 10 : 15), w, 5, c);
  for (const [x, c] of [[430, '#6fd0a0'], [444, '#c080e0']]) { rect(ctx, x - 1.4, 126, 2.8, 5, '#a8b8c0'); oval(ctx, x, 135, 5, 5.4, rgba('#a8b8c0', 0.5)); oval(ctx, x, 136.4, 4, 3.6, c); glow(v, x, 135, 9, c, 0.3); }
  // 바닥의 술식: 겹친 원과 글줄, 푸르게 빛난다
  const cx = 330, cy = 208; ctx.strokeStyle = 'rgba(140,210,255,.8)'; ctx.lineWidth = 1.3;
  for (const [rx, ry] of [[92, 20], [70, 15], [36, 8]]) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke(); }
  for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU, r0 = 0.8, r1 = 0.94; if (i % 3 === 1) continue; stroke(ctx, [cx + Math.cos(a) * 92 * r0, cy + Math.sin(a) * 20 * r0, cx + Math.cos(a + 0.08) * 92 * r1, cy + Math.sin(a + 0.08) * 20 * r1], 1, 'rgba(140,210,255,.75)'); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3, b = ((i + 2) / 5) * TAU + 0.3; stroke(ctx, [cx + Math.cos(a) * 70, cy + Math.sin(a) * 15, cx + Math.cos(b) * 70, cy + Math.sin(b) * 15], 0.8, 'rgba(140,210,255,.5)'); }
  pool(v, cx, cy, 130, 30, '#5fb0f0', 0.26); glow(v, cx, cy - 30, 130, '#4f90e0', 0.12, 70);
  // 분필을 쥐고 무릎 꿇은 어머니, 그 뒤 걸상의 나
  person(v, 262, 226, 104, { raw: true, f: 1, pose: 'kneel', cloth: '#3a3458', hair: '#2a1e16', female: true, long: true, robe: true, arm: 'fwd', rim: 'rgba(150,210,255,.7)', rimDir: 1 });
  rect(ctx, 476, 196, 22, 4, '#3a2c20'); rect(ctx, 478, 200, 3, 34, '#2a1e16'); rect(ctx, 493, 200, 3, 34, '#2a1e16'); stroke(ctx, [479, 220, 495, 220], 1.6, '#2a1e16');
  person(v, 486, 216, 70, kid(v, { raw: true, f: -1, pose: 'sit', arm: 'chest', rim: 'rgba(150,210,255,.6)', rimDir: -1 })); poly(ctx, [458, 180, 480, 176, 482, 190, 460, 194], '#d8ccae'); stroke(ctx, [469, 178, 471, 192], 0.6, '#5a4a3a');
  // 문가에 선 늙은 탑주
  person(v, 584, 236, 106, { raw: true, f: -1, cloth: '#2a2c44', hair: '#b8b4ac', old: true, robe: true, hood: true, stick: 'staff' });
  for (let i = 0; i < 30; i++) { ctx.fillStyle = rgba('#b8dcff', 0.12 + R() * 0.2); ctx.fillRect(250 + R() * 160, 120 + R() * 80, 1.2, 1.2); }
  ctx.restore(); finish(v, { inside: true });
}
/** 성당: 높은 기둥과 빛깔 유리창. 초에 불을 붙이는 성당지기 아버지, 바닥을 닦는 나 */
function originChurch(v) {
  const { ctx } = v; room(v, { wall: '#34322e', floor: '#262420', fy: 178 });
  ctx.save(); zoom(v, 330, 240, 1.06);
  // 안쪽 제단 벽의 큰 빛깔 창: 납 틀 사이의 유리 조각들
  const wx = 330, wy = 12, ww = 70, wh = 120; ctx.save(); ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh); ctx.lineTo(wx - ww / 2, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww / 2, wy + wh); ctx.closePath(); ctx.fillStyle = '#14100e'; ctx.fill(); ctx.clip();
  const gc = ['#b84a3a', '#3a6aa8', '#c8a040', '#4a8a5a', '#8a4a8a', '#d8c890'];
  for (let r = 0; r < 12; r++) for (let c = 0; c < 7; c++) { const k = hash(r * 7 + c, 3); rect(ctx, wx - ww / 2 + c * 10 + 1, wy + r * 10 + 1, 8.6, 8.6, rgba(gc[Math.floor(k * gc.length)], 0.86)); }
  sunSign(v, wx, wy + 40, 12, '#f8e8b0'); ctx.restore();
  for (const [x, c] of [[wx - 20, '#c88a50'], [wx, '#d8c890'], [wx + 22, '#5a8ac8']]) shaft(v, x, 132, 18, 100, x - wx - 30, c, 0.16);
  // 양옆으로 멀어지는 기둥과 아치
  for (const [k, w] of [[0.3, 12], [0.55, 18], [1, 28]]) for (const s of [-1, 1]) { const x = 330 + s * (80 + 210 * k); column(v, x, 178 + k * 30, w, 150 + k * 60, dark('#5a564e', 0.3 - k * 0.2), {}); }
  ctx.strokeStyle = '#201e1c'; ctx.lineWidth = 5; for (const r of [150, 220]) { ctx.beginPath(); ctx.arc(330, 60 + r * 0.1, r, Math.PI * 1.14, Math.PI * 1.86); ctx.stroke(); }
  // 제단과 촛대 줄
  rect(ctx, 286, 150, 88, 28, '#4a463e'); rect(ctx, 280, 146, 100, 5, '#5a564c'); poly(ctx, [296, 151, 364, 151, 364, 160, 330, 166, 296, 160], '#cfc8b8');
  for (let i = 0; i < 7; i++) { const x = 216 + i * 10, lit = i < 4; rect(ctx, x - 0.8, 158 - (i % 2) * 4, 1.6, 20 + (i % 2) * 4, '#d8d0bc'); if (lit) { flame(v, x, 157 - (i % 2) * 4, 3); glow(v, x, 152, 10, '#ffc070', 0.3); } }
  rect(ctx, 208, 176, 76, 3, '#6a5630'); pool(v, 240, 190, 60, 12, '#ffb060', 0.2);
  // 긴 장의자들 (등받이만 보인다)
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const y = 196 + i * 14, x0 = 330 + s * (46 + i * 10), x1 = 330 + s * (190 + i * 50); rect(ctx, Math.min(x0, x1), y - 12 - i * 2, Math.abs(x1 - x0), 12 + i * 2, dark('#4a382a', 0.1 * (2 - i))); rect(ctx, Math.min(x0, x1), y - 13 - i * 2, Math.abs(x1 - x0), 2, '#5a4634'); }
  // 긴 점화 장대를 든 아버지
  person(v, 196, 214, 92, { raw: true, f: 1, cloth: '#3a3632', hair: '#5a4030', robe: true, arm: 'fwd', rim: WARM, rimDir: 1 }); stroke(ctx, [188, 200, 244, 154], 1.4, '#3a2c20'); glow(v, 245, 153, 6, '#ffd080', 0.6);
  // 가운데 통로에서 바닥을 닦는 나, 물통
  person(v, 318, 238, 70, kid(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', rim: 'rgba(255,230,180,.6)', rimDir: 1 })); poly(ctx, [338, 232, 352, 230, 354, 236, 340, 238], '#8a8474');
  rect(ctx, 280, 222, 16, 14, '#4a3a2a'); rect(ctx, 279, 226, 18, 2, '#1c1814'); ctx.strokeStyle = '#1c1814'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(288, 222, 8, Math.PI, 0); ctx.stroke(); oval(ctx, 330, 239, 30, 3, 'rgba(180,200,220,.12)');
  // 기도하는 노파, 지나가는 사제
  person(v, 470, 226, 84, { raw: true, f: -1, pose: 'kneel', cloth: '#2a2826', hair: '#b8b4ac', female: true, hood: true, old: true, arm: 'chest' });
  person(v, 420, 196, 60, { raw: true, f: -1, cloth: '#cfc8b8', hair: '#3a2a1e', robe: true, arm: 'chest' });
  ctx.restore(); finish(v, { inside: true });
}
/** 장인 공방: 왕도 거리로 열린 대장간. 모루 앞의 아버지, 풀무를 밟는 나 */
function originWorkshop(v) {
  const { ctx, R } = v; room(v, { wall: '#3a3028', floor: '#2a221c', fy: 176, stone: false });
  ctx.save(); zoom(v, 330, 240, 1.08);
  // 거리로 열린 가게 앞: 밝은 바깥, 건너편 집과 지나는 사람
  rect(ctx, 404, 30, 200, 146, v.S.low ?? '#c8c0a8'); rect(ctx, 404, 110, 200, 66, '#8a8272');
  for (const [x, w, h, c] of [[410, 62, 72, '#a89c84'], [476, 58, 84, '#9a8e7a'], [538, 66, 66, '#b0a48c']]) { rect(ctx, x, 124 - h, w, h, c); poly(ctx, [x - 3, 124 - h, x + w / 2, 124 - h - 20, x + w + 3, 124 - h], '#6a4a3a'); for (let i = 0; i < 2; i++) rect(ctx, x + 10 + i * 26, 124 - h + 16, 9, 12, '#3a3028'); stroke(ctx, [x, 124 - h * 0.45, x + w, 124 - h * 0.45], 1.2, '#5a4634'); }
  person(v, 470, 168, 46, folk(1, { raw: true, f: -1, female: true, long: true })); person(v, 552, 170, 50, folk(3, { raw: true, f: -1, hat: true, cloak: true })); person(v, 520, 166, 30, folk(2, { raw: true, f: 1, child: true }));
  rect(ctx, 396, 0, 10, 176, '#2a1e16'); rect(ctx, 602, 0, 12, 176, '#2a1e16'); rect(ctx, 396, 22, 218, 10, '#2a1e16');
  // 문 위에 건 간판(망치와 모루 모양 쇠)과 내놓은 물건
  stroke(ctx, [500, 32, 500, 44], 1, '#1c1814'); poly(ctx, [488, 44, 512, 44, 508, 50, 504, 50, 506, 56, 494, 56, 496, 50, 492, 50], '#1c1814');
  rect(ctx, 410, 150, 60, 5, '#4a3626'); for (const [x, c] of [[420, '#8a8e96'], [436, '#6a6e76'], [452, '#8a7038']]) { oval(ctx, x, 146, 6, 5, c); rect(ctx, x - 6, 146, 12, 4, c); }
  // 화덕: 벽돌 굴뚝과 벌건 숯
  rect(ctx, 54, 20, 96, 156, '#4a3e36'); poly(ctx, [44, 96, 160, 96, 150, 70, 54, 70], '#3e332c'); for (let y = 28; y < 170; y += 12) stroke(ctx, [54, y, 150, y], 0.6, 'rgba(0,0,0,.25)');
  ctx.fillStyle = '#140e0c'; ctx.beginPath(); ctx.moveTo(70, 150); ctx.lineTo(70, 116); ctx.quadraticCurveTo(102, 98, 134, 116); ctx.lineTo(134, 150); ctx.fill();
  for (let i = 0; i < 14; i++) oval(ctx, 76 + R() * 52, 142 + R() * 6, 4 + R() * 3, 2.6, R() < 0.5 ? '#ff8a30' : '#c84a20'); flame(v, 96, 140, 10); flame(v, 112, 141, 7); glow(v, 102, 132, 110, '#ff8030', 0.3); pool(v, 150, 206, 170, 40, '#ff8030', 0.3);
  // 풀무와 손잡이
  poly(ctx, [150, 150, 196, 140, 196, 168, 150, 158], '#5a4030'); for (let i = 0; i < 4; i++) stroke(ctx, [160 + i * 10, 148 - i * 2, 160 + i * 10, 160 + i * 2], 0.8, '#2a1e16'); stroke(ctx, [196, 142, 216, 122], 2.2, '#3a2c20');
  // 벽의 연장: 집게, 망치, 줄. 걸어 둔 말굽쇠
  for (let i = 0; i < 9; i++) { const x = 216 + i * 18, y = 46; rect(ctx, x - 1, y - 6, 2, 4, '#1c1814'); if (i % 3 === 0) { stroke(ctx, [x - 2, y, x - 4, y + 34], 1.4, '#6a6e76'); stroke(ctx, [x + 2, y, x + 4, y + 34], 1.4, '#6a6e76'); } else if (i % 3 === 1) { stroke(ctx, [x, y, x, y + 28], 1.8, '#5a4030'); rect(ctx, x - 5, y + 26, 10, 6, '#6a6e76'); } else { ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + 8, 6, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke(); } }
  rect(ctx, 206, 38, 170, 3, '#2a1e16');
  // 모루와 달군 쇠, 물통
  const ax = 290, ay = 212; rect(ctx, ax - 12, ay - 16, 24, 22, '#3a2c20'); poly(ctx, [ax - 22, ay - 30, ax + 16, ay - 30, ax + 30, ay - 25, ax + 16, ay - 20, ax - 14, ay - 16, ax - 22, ay - 22], '#4a4e56'); rect(ctx, ax - 22, ay - 31, 38, 2.4, '#8a8e96');
  stroke(ctx, [ax - 10, ay - 33, ax + 22, ay - 33], 3, '#ffb050'); glow(v, ax + 8, ay - 33, 20, '#ff9a40', 0.5);
  for (let i = 0; i < 12; i++) { const a = -Math.PI * R(), r = 6 + R() * 22; oval(ctx, ax + 8 + Math.cos(a) * r, ay - 34 + Math.sin(a) * r, 0.9, 0.9, rgba('#ffd080', 0.5 + R() * 0.5)); }
  rect(ctx, 350, 206, 26, 22, '#3a2c20'); rect(ctx, 349, 212, 28, 2, '#1c1814'); oval(ctx, 363, 206, 13, 3.4, '#2a3a44');
  // 아버지: 망치를 들어 올렸다. 가죽 앞치마
  person(v, 246, 236, 108, { raw: true, f: 1, cloth: '#4a3a2c', hair: '#2a1e16', arm: 'up', rim: WARM, rimDir: -1 }); poly(ctx, [238, 178, 254, 178, 256, 212, 236, 212], '#3a2418'); stroke(ctx, [268, 126, 276, 108], 2.2, '#5a4030'); rect(ctx, 270, 100, 14, 9, '#6a6e76');
  // 풀무 손잡이를 잡은 나
  person(v, 204, 232, 70, kid(v, { raw: true, f: -1, arm: 'fwd', rim: WARM, rimDir: -1 }));
  // 가게 앞에서 기다리는 손님
  person(v, 430, 236, 102, { raw: true, f: -1, cloth: '#2e3a52', hair: '#6a4a2a', cloak: true, arm: 'chest' });
  ctx.restore(); finish(v, { inside: true });
}
/** 빈민가 골목: 기운 집들 사이의 좁은 하늘, 빨랫줄, 깡통 불가에 모인 아이들 */
function originSlum(v) {
  const { ctx, t, R } = v; sky(v);
  // 골목 끝의 밝은 큰길과 순찰
  rect(ctx, 270, 96, 110, 100, rgba(v.S.low ?? '#c8a070', 0.9)); rect(ctx, 270, 160, 110, 40, t('#6a6258'));
  rect(ctx, 286, 104, 40, 56, t('#8a7e6c')); poly(ctx, [282, 104, 306, 88, 330, 104], t('#5a4436')); rect(ctx, 334, 112, 46, 48, t('#7a705e'));
  person(v, 318, 178, 40, { f: 1, cloth: '#3a3e4a', hair: '#1c1614', hat: true }); spear(v, 324, 178, 50, 0.02);
  // 양옆으로 기운 집들: 위로 갈수록 서로 가까워진다
  const wl = t('#2e2823'), wd = t('#231e1a');
  poly(ctx, [0, 0, 250, 0, 262, 60, 272, 200, 230, 240, 0, 240], wl); poly(ctx, [640, 0, 420, 0, 400, 50, 378, 200, 430, 240, 640, 240], wd);
  poly(ctx, [250, 0, 300, 0, 292, 40, 262, 60], t('#1c1815')); poly(ctx, [420, 0, 366, 0, 372, 44, 400, 50], t('#191513'));
  for (let i = 0; i < 9; i++) { stroke(ctx, [0, 30 + i * 24, 262 - i * 0.5, 34 + i * 20], 0.6, rgba('#000000', 0.25)); stroke(ctx, [640, 30 + i * 24, 392 + i, 34 + i * 20], 0.6, rgba('#000000', 0.25)); }
  // 창과 문: 불 켜진 곳은 드물다. 널로 막은 창
  for (const [x, y, w, h, lit] of [[60, 40, 30, 36, 0], [150, 50, 26, 32, 1], [40, 126, 30, 40, 0], [470, 44, 28, 34, 0], [560, 36, 32, 38, 1], [520, 120, 30, 40, 0]]) { rect(ctx, x, y, w, h, lit ? '#c89040' : '#141110'); if (lit) glow(v, x + w / 2, y + h / 2, 30, '#ffa850', 0.3); else if (x % 4 === 0) { stroke(ctx, [x - 2, y + 6, x + w + 2, y + 14], 3, t('#4a3a2c')); stroke(ctx, [x - 2, y + 26, x + w + 2, y + 20], 3, t('#4a3a2c')); } rect(ctx, x - 2, y + h, w + 4, 3, t('#3a3028')); }
  rect(ctx, 160, 130, 44, 86, '#120f0d'); rect(ctx, 156, 126, 52, 5, t('#3a3028')); poly(ctx, [470, 140, 500, 138, 506, 222, 472, 216], '#120f0d');
  // 빨랫줄 셋: 기운 누더기
  for (const [y0, y1, n] of [[52, 62, 3], [104, 96, 2]]) { const xa = 256 + y0 * 0.1, xb = 404 - y0 * 0.14; stroke(ctx, [xa, y0, (xa + xb) / 2, (y0 + y1) / 2 + 6, xb, y1], 0.7, t('#8a8070')); for (let i = 0; i < n; i++) { const k = (i + 0.6) / (n + 0.4), x = xa + (xb - xa) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * 5, w = 16 + hash(i, y0) * 12, h = 20 + hash(i, y0 + 1) * 16, c = t(['#6a6458', '#5a5048', '#6e6460'][(i + y0) % 3]); if (i % 2) poly(ctx, [x, y, x + w, y + 1, x + w + 1, y + h, x + w * 0.6, y + h + 2, x + w * 0.3, y + h - 4, x - 1, y + h], c); else { poly(ctx, [x + 2, y, x + w - 2, y, x + w + 7, y + 8, x + w + 3, y + 12, x + w - 1, y + 8, x + w - 2, y + h, x + 2, y + h, x + 1, y + 8, x - 3, y + 12, x - 7, y + 8], c); rect(ctx, x + w * 0.3, y + h * 0.5, 5, 5, t('#4a4038')); } } }
  // 바닥: 젖은 돌, 웅덩이, 도랑
  ctx.fillStyle = t('#2a2622'); ctx.beginPath(); ctx.moveTo(272, 196); ctx.lineTo(378, 196); ctx.lineTo(640, 240); ctx.lineTo(0, 240); ctx.fill();
  for (let i = 0; i < 40; i++) { const y = 198 + R() * 40, x = 325 + (R() - 0.5) * (y - 190) * 12; stroke(ctx, [x, y, x + 8 + R() * 8, y], 0.6, rgba('#000000', 0.3)); }
  oval(ctx, 400, 226, 40, 5, rgba(v.S.low ?? '#c8a070', 0.3)); oval(ctx, 250, 214, 24, 3, rgba(v.S.low ?? '#c8a070', 0.22)); stroke(ctx, [330, 198, 320, 240], 2.4, rgba('#0e0c0a', 0.7));
  // 쇠통 불과 둘러앉은 아이들: 나, 더 어린 아이, 큰 아이
  const fx = 222, fy = 222; rect(ctx, fx - 9, fy - 20, 18, 20, '#1e1a18'); rect(ctx, fx - 10, fy - 14, 20, 2, '#3a3430'); flame(v, fx - 2, fy - 20, 8); flame(v, fx + 4, fy - 20, 5); glow(v, fx, fy - 24, 70, '#ff9040', 0.34); pool(v, fx, fy + 4, 80, 12, '#ff9040', 0.2);
  person(v, 172, 232, 84, kid(v, { f: 1, pose: 'huddle', rim: WARM, rimDir: 1 }));
  person(v, 268, 234, 70, folk(3, { f: -1, pose: 'huddle', child: true, rim: WARM, rimDir: -1 }));
  person(v, 304, 232, 76, folk(0, { f: -1, arm: 'fwd', rim: WARM, rimDir: -1 }));
  // 문간의 어른 그림자, 벽에 기대 잠든 사람, 쥐
  person(v, 182, 214, 90, { f: 1, cloth: '#14110f', hair: '#0e0c0a', hood: true, skin: '#3a302a' });
  person(v, 548, 238, 90, folk(4, { f: -1, pose: 'huddle', hood: true, old: true })); oval(ctx, 584, 234, 6, 5, t('#5a4a3a'));
  oval(ctx, 452, 232, 4.4, 2.2, '#161210'); stroke(ctx, [456, 232, 464, 230], 0.7, '#161210');
  finish(v, { noLeaves: true });
}
/** 항구 도시: 부두에 댄 큰 배들, 기중기와 짐, 말뚝에 앉아 배를 보는 나 */
function originPort(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { sea: true });
  seaAt(v, HZ, { n: 100 });
  // 먼 곶의 등대와 바다의 돛들
  poly(ctx, [0, 116, 60, 104, 120, 112, 170, 126, 0, 128], t(mixh('#4a4a44', v.S.haze, 0.4))); rect(ctx, 52, 78, 7, 28, t('#b8b0a0')); poly(ctx, [50, 78, 55.5, 70, 61, 78], t('#6a3a30')); if (dim) glow(v, 55, 76, 20, '#ffc060', 0.5);
  skiff(v, 150, 134, 0.36, 1, { sail: 'set' }); skiff(v, 226, 140, 0.46, -1, { sail: 'set' });
  // 도시: 층층이 올라가는 집과 창고, 종탑
  const wl = t(mixh('#b0a48c', v.S.haze, 0.2)), rf = t('#6a4636');
  for (const [x, w, h] of [[430, 40, 50], [462, 50, 66], [506, 36, 84], [540, 54, 60], [590, 60, 76]]) { rect(ctx, x, 150 - h, w, h, wl); poly(ctx, [x - 2, 150 - h, x + w / 2, 150 - h - w * 0.36, x + w + 2, 150 - h], rf); for (let i = 0; i < Math.floor(w / 14); i++) for (let j = 0; j < Math.floor(h / 22); j++) rect(ctx, x + 6 + i * 13, 150 - h + 10 + j * 20, 4, 7, dim ? '#f2c070' : t('#3a3028')); }
  rect(ctx, 520, 40, 10, 30, wl); poly(ctx, [517, 40, 525, 22, 533, 40], rf);
  // 부두와 큰 배 둘
  tallship(v, 300, 164, 0.86, 1, { lit: dim }); tallship(v, 470, 158, 0.5, -1, { hull: '#2a2420', flag: '#2e4a6e', lit: dim });
  ctx.fillStyle = t('#5a5448'); ctx.beginPath(); ctx.moveTo(0, 190); ctx.lineTo(VW, 172); ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.fill(); ctx.fillStyle = t('#3e3a32'); ctx.beginPath(); ctx.moveTo(0, 186); ctx.lineTo(VW, 168); ctx.lineTo(VW, 173); ctx.lineTo(0, 191); ctx.fill();
  for (let i = 0; i < 26; i++) stroke(ctx, [i * 26, 192 - i * 0.7, i * 26 - 14, 240], 0.6, rgba('#000000', 0.18));
  // 기중기: 나무 팔과 매달린 짐
  rect(ctx, 520, 100, 7, 84, t('#3a2c20')); stroke(ctx, [523, 104, 462, 76], 4, t('#3a2c20')); stroke(ctx, [523, 130, 492, 90], 2, t('#3a2c20')); stroke(ctx, [464, 77, 464, 126], 0.9, t('#c8b890')); rect(ctx, 454, 126, 20, 16, t('#6a5438')); stroke(ctx, [454, 134, 474, 134], 0.8, t('#2a1e16'));
  // 쌓인 궤짝, 통, 자루
  for (const [x, y, w, h] of [[556, 210, 34, 26], [586, 204, 30, 30], [566, 186, 28, 24]]) { rect(ctx, x, y - h, w, h, t('#6a5438')); stroke(ctx, [x, y - h, x + w, y], 0.8, t('#3a2c20')); stroke(ctx, [x, y - h * 0.5, x + w, y - h * 0.5], 0.8, t('#3a2c20')); }
  for (const x of [80, 108]) { rect(ctx, x - 10, 206, 20, 24, t('#4a3a2a')); rect(ctx, x - 11, 212, 22, 2, t('#1c1814')); rect(ctx, x - 11, 222, 22, 2, t('#1c1814')); oval(ctx, x, 206, 10, 3, t('#5a4a38')); }
  for (const [x, y] of [[140, 232], [162, 236], [150, 222]]) oval(ctx, x, y, 13, 7, t('#a89878'));
  // 짐꾼들과 낯선 옷차림의 상인
  person(v, 430, 214, 70, folk(0, { f: -1, arm: 'up', rim, rimDir: 1 })); rect(ctx, 420, 138, 22, 12, t('#6a5438'));
  person(v, 386, 208, 62, folk(4, { f: -1, old: true, arm: 'fwd' }));
  person(v, 504, 222, 84, { f: -1, cloth: '#7a3a2a', hair: '#1c1614', robe: true, hat: true, arm: 'chest', rim, rimDir: 1 });
  // 매는 말뚝에 걸터앉은 나, 곁에 선 뱃사람 아버지
  rect(ctx, 250, 214, 12, 20, t('#2a1e16')); oval(ctx, 256, 214, 8, 3, t('#3a2c20')); stroke(ctx, [262, 224, 300, 196], 1.4, t('#b8a070'));
  person(v, 256, 232, 70, kid(v, { f: 1, pose: 'sit', rim, rimDir: 1 }));
  person(v, 214, 238, 104, { f: 1, cloth: '#3a4652', hair: '#3a2a1e', hat: true, arm: 'out', rim, rimDir: 1 });
  gulls(v, 240, 60, 6, 160);
  finish(v, { noLeaves: true });
}

/* ---------- 마족 ---------- */
/** 마족 땅의 하늘빛을 덧씌운다 */
const pall = (v, a = 0.3) => { const { ctx } = v, g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, rgba('#1a0e24', a)); g.addColorStop(0.5, rgba('#5a1e38', a * 0.9)); g.addColorStop(1, rgba('#1a1018', a * 0.6)); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); };
/** 멀리 솟은 검은 바위 첨탑들 */
function spires(v, y, n, c, o = {}) {
  const { ctx } = v; for (let i = 0; i < n; i++) { const x = (o.x0 ?? 0) + ((i + hash(i, 4) * 0.8) / n) * (o.w ?? VW), h = (o.h ?? 50) * (0.4 + hash(i, 5)), w = 5 + hash(i, 6) * 10; poly(ctx, [x - w, y, x - w * 0.4, y - h * 0.6, x - 1, y - h, x + w * 0.3, y - h * 0.7, x + w, y], c); }
}
/** 경계의 요새: 성벽 위의 파수꾼과 쇠뇌, 골짜기 너머 검은 땅과 보랏빛 불들 */
function demonFort(v) {
  const { ctx, t, R } = v; sky(v); pall(v, 0.34);
  // 저편: 지평선의 붉은 기운, 첨탑, 점점이 깔린 진영의 불
  glow(v, 250, 122, 240, '#a02a3a', 0.3, 40);
  spires(v, 128, 22, t('#1a141c'), { h: 46 }); rect(ctx, 0, 126, VW, 60, t('#16121a'));
  for (let i = 0; i < 70; i++) { const d = R(), x = R() * 470, y = 130 + d * 34; oval(ctx, x, y, 0.8 + d, 0.6 + d * 0.5, '#c080e8'); if (i % 5 === 0) glow(v, x, y, 7 + d * 6, '#a060e0', 0.34); }
  // 경계: 골짜기와 옅게 빛나는 옛 봉인 기둥들
  ctx.fillStyle = '#0a080c'; ctx.beginPath(); ctx.moveTo(0, 176); ctx.quadraticCurveTo(200, 162, 420, 178); ctx.lineTo(420, 196); ctx.quadraticCurveTo(200, 186, 0, 200); ctx.fill();
  for (const [x, y, h] of [[60, 170, 24], [170, 165, 20], [290, 167, 22]]) { poly(ctx, [x - 3, y, x - 2, y - h, x + 2, y - h - 3, x + 3, y], t('#4a4650')); stroke(ctx, [x, y - 4, x, y - h + 3], 0.9, '#9fe0d0'); glow(v, x, y - h / 2, 12, '#7fe0d0', 0.3); }
  for (let i = 0; i < 20; i++) glow(v, 20 + i * 22, 170 + Math.sin(i) * 3, 14, '#7fe0d0', 0.035);
  ctx.fillStyle = t('#2a2622'); ctx.beginPath(); ctx.moveTo(0, 196); ctx.quadraticCurveTo(200, 184, 440, 196); ctx.lineTo(440, VH); ctx.lineTo(0, VH); ctx.fill();
  // 이쪽: 성벽과 망루 (오른쪽 앞에서 왼쪽 멀리로)
  const st = t('#625e56'), sd = t('#45413c');
  poly(ctx, [640, 120, 330, 150, 180, 160, 180, 178, 330, 176, 640, 190], sd); for (let i = 0; i < 16; i++) { const k = i / 16, x = 190 + k * 440, y = 159 - k * 38, w = 6 + k * 12; rect(ctx, x, y - 4 - k * 8, w, 5 + k * 8, sd); }
  rect(ctx, 150, 112, 34, 72, st); for (let i = 0; i < 4; i++) rect(ctx, 148 + i * 10, 106, 6, 7, st); rect(ctx, 163, 130, 5, 10, '#ffb060'); glow(v, 165, 134, 16, '#ffa850', 0.4); banner(v, 167, 106, 30, '#cfc8b8', { d: -1 });
  // 성벽 위 통로 (앞쪽)
  poly(ctx, [640, 190, 330, 176, 300, 190, 640, 240], st); poly(ctx, [300, 190, 640, 240, 640, 260, 280, 240, 290, 200], t('#3a3632'));
  for (let i = 0; i < 9; i++) { const x = 318 + i * 38, y = 178 + i * 3; rect(ctx, x, y - 22 - i * 2.4, 20 + i * 2, 22 + i * 2.4, st); rect(ctx, x, y - 22 - i * 2.4, 20 + i * 2, 3, t('#5a564e')); }
  // 쇠뇌
  const bx = 470, by = 204; stroke(ctx, [bx - 30, by + 6, bx + 26, by - 14], 4, t('#3a2c20')); stroke(ctx, [bx + 8, by - 30, bx + 30, by + 4], 2.4, t('#2a1e16')); stroke(ctx, [bx + 8, by - 30, bx - 22, by + 3, bx + 30, by + 4], 0.7, t('#c8b890')); stroke(ctx, [bx - 22, by + 3, bx + 34, by - 18], 1.4, t('#8a8e96')); rect(ctx, bx - 8, by + 2, 6, 22, t('#2a1e16')); rect(ctx, bx + 8, by - 4, 6, 26, t('#2a1e16'));
  // 화톳불과 파수꾼들
  rect(ctx, 566, 196, 3, 30, '#1c1612'); poly(ctx, [556, 190, 580, 190, 575, 199, 561, 199], '#2a2019'); flame(v, 566, 190, 11); glow(v, 568, 184, 70, '#ff9a48', 0.3);
  person(v, 524, 230, 96, { f: -1, cloth: '#5c6068', hair: '#3a3a40', hat: true, cloak: true, rim: WARM, rimDir: 1 }); spear(v, 510, 230, 124, -0.02);
  person(v, 604, 234, 100, mine(v, { f: -1, cloak: true, arm: 'chest', rim: WARM, rimDir: -1 }));
  person(v, 400, 214, 70, { f: -1, cloth: '#5c6068', hair: '#3a3a40', hat: true, arm: 'out', rim: PALE, rimDir: -1 });
  // 아래: 경계를 넘다 버려진 것들 (부러진 창, 뒤집힌 수레)
  stroke(ctx, [90, 222, 126, 204], 1.6, t('#2a2018')); poly(ctx, [200, 226, 240, 212, 262, 220, 226, 234], t('#2a2018')); ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(250, 212, 9, 0, TAU); ctx.stroke();
  crows(v, 300, 70, 4, 80);
  finish(v, { noLeaves: true });
}
/** 마족 사절: 경계석을 사이에 두고 마주 선 두 무리. 키 큰 사절과 창을 든 호위, 검은 깃발 */
function demonEnvoy(v) {
  const { ctx, t, R } = v; sky(v); pall(v, 0.2); far(v, { peaks: true });
  const gy = (x) => 160 - fbm1(x / 210 + v.q, 3) * 7; ground(v, gy, { tufts: 70, color: '#5a5650', color2: '#33302e' });
  // 저편(오른쪽)은 죽은 땅: 잿빛 흙과 뼈 같은 나무
  const g = ctx.createLinearGradient(300, 0, 460, 0); g.addColorStop(0, rgba('#241c26', 0)); g.addColorStop(1, rgba('#241c26', 0.6)); ctx.fillStyle = g; ctx.fillRect(300, 150, 340, 90);
  for (const [x, y, h] of [[500, 176, 60], [590, 190, 90], [430, 168, 36]]) { ctx.strokeStyle = t('#b8b0a8'); ctx.lineCap = 'round'; const br = (bx, by, a, l, w, d) => { const x2 = bx + Math.cos(a) * l, y2 = by + Math.sin(a) * l; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x2, y2); ctx.stroke(); if (d) { br(x2, y2, a - 0.5 - hash(d, x) * 0.3, l * 0.66, w * 0.6, d - 1); br(x2, y2, a + 0.4 + hash(d, x + 1) * 0.3, l * 0.6, w * 0.6, d - 1); } }; br(x, y, -Math.PI / 2 + 0.1, h * 0.4, h * 0.06, 3); }
  spires(v, 150, 9, t('#1e1820'), { x0: 400, w: 240, h: 40 });
  // 가운데 경계석: 옛 글줄이 옅게 빛난다. 그 위에 놓인 봉한 함
  const bx = 330; poly(ctx, [bx - 30, 214, bx - 26, 178, bx + 26, 176, bx + 32, 214], t('#4e4a50')); poly(ctx, [bx - 26, 178, bx + 26, 176, bx + 22, 172, bx - 22, 174], t('#646068'));
  for (let i = 0; i < 6; i++) stroke(ctx, [bx - 18 + i * 7, 186, bx - 18 + i * 7 + (i % 2 ? 2 : -2), 204], 0.9, 'rgba(150,224,208,.7)'); glow(v, bx, 196, 34, '#7fe0d0', 0.14);
  rect(ctx, bx - 10, 164, 20, 10, t('#1c161e')); rect(ctx, bx - 11, 163, 22, 3, t('#8a7038')); oval(ctx, bx, 170, 2.2, 2.2, t('#7a1a26'));
  // 안개
  for (let i = 0; i < 12; i++) oval(ctx, 60 + i * 50 + R() * 20, 206 + R() * 20, 60, 6, rgba(t('#b8b0c0'), 0.07));
  // 사람 쪽(왼쪽): 나, 기사, 사제, 뒤의 창병과 흰 깃발
  banner(v, 96, 232, 120, '#cfc8b8', { d: 1, w: 34, len: 44 });
  person(v, 70, 236, 92, { f: 1, cloth: '#5c6068', hair: '#3a3a40', hat: true }); spear(v, 58, 236, 120, 0.02);
  person(v, 146, 238, 98, { f: 1, cloth: '#cfc8b8', hair: '#8a8478', old: true, robe: true, arm: 'chest', rim: COLD, rimDir: -1 });
  person(v, 196, 238, 102, { f: 1, cloth: '#5c6068', hair: '#3a2a1e', cloak: true, rim: COLD, rimDir: -1 }); stroke(ctx, [208, 190, 214, 232], 1.6, t('#d8dce0'));
  person(v, 252, 238, 100, mine(v, { f: 1, cloak: true, arm: 'fwd', rim: COLD, rimDir: -1 }));
  // 마족 쪽(오른쪽): 사절, 긴 날창을 든 호위 둘, 깃발
  demonBanner(v, 560, 236, 150);
  demon(v, 412, 240, 128, { f: -1, cloth: '#3e3048', arm: 'fwd', cloak: true, rim: PALE, rimDir: 1 });
  poly(ctx, [396, 150, 428, 150, 426, 156, 398, 156], t('#6a5630')); stroke(ctx, [412, 156, 412, 214], 1, t('#6a5630')); // 목에 건 긴 띠
  for (const [x, h] of [[486, 120], [528, 124]]) { demon(v, x, 240 + (x % 3), h, { f: -1, cloth: '#2a2430', robe: false, long: false, horn: '#4a3a3e', rim: PALE, rimDir: 1 }); const lx = x - 14, ly = 240; stroke(ctx, [lx, ly, lx - 4, ly - h * 1.26], 1.6, t('#1a1418')); poly(ctx, [lx - 4, ly - h * 1.26, lx - 9, ly - h * 1.26 - 8, lx - 5, ly - h * 1.26 - 28, lx + 1, ly - h * 1.26 - 6], t('#8a8490')); }
  // 사절 뒤에 무릎 꿇린 포로 하나 (돌려보내려는 사람)
  person(v, 600, 238, 84, { f: -1, pose: 'kneel', cloth: '#5a4a3a', hair: '#6a4a2a', arm: 'chest' });
  finish(v, { noLeaves: true });
}
/** 마족의 땅: 검은 주상절리 사이의 도시, 낮게 걸린 붉은 해, 길을 가는 행렬. 바위 뒤에 숨은 나 */
function demonLand(v) {
  const { ctx, t, R } = v; sky(v); pall(v, 0.46);
  // 낮게 걸린 붉은 해: 재 낀 하늘에 번진다
  oval(ctx, 420, 96, 26, 26, '#c8463a'); glow(v, 420, 96, 120, '#c8463a', 0.34); rect(ctx, 392, 103, 56, 3, rgba('#3a1420', 0.6)); rect(ctx, 398, 89, 44, 2, rgba('#3a1420', 0.5));
  spires(v, 132, 30, '#1c1620', { h: 60 });
  // 절벽을 깎아 만든 도시: 층층의 단, 좁고 긴 창의 보랏빛 불
  const cx = 220; poly(ctx, [80, 180, 100, 90, 140, 60, 180, 30, 226, 12, 262, 34, 300, 66, 340, 100, 360, 180], '#16121a');
  for (const [x, y, w, h] of [[150, 80, 24, 100], [190, 46, 30, 134], [236, 30, 22, 150], [270, 70, 30, 110], [310, 104, 26, 76], [110, 110, 28, 70]]) { poly(ctx, [x, y + h, x + 2, y, x + w / 2, y - 12, x + w - 2, y, x + w, y + h], '#201a26'); for (let j = 0; j < Math.floor(h / 14); j++) if (hash(x, j) < 0.6) { rect(ctx, x + w / 2 - 1, y + 6 + j * 13, 2, 7, '#c890f0'); if (j % 2) glow(v, x + w / 2, y + 9 + j * 13, 7, '#a060e0', 0.4); } }
  stroke(ctx, [160, 120, 200, 104, 240, 110, 290, 96], 1, '#2e2634'); stroke(ctx, [120, 150, 190, 140, 280, 144, 340, 136], 1, '#2e2634');
  glow(v, cx, 100, 150, '#7a3ac0', 0.12, 90);
  // 땅: 검은 유리 같은 들판, 갈라진 틈의 불빛
  const gy = (x) => 172 - fbm1(x / 180 + v.q, 3) * 8; ctx.fillStyle = '#1a151c'; ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, gy(x)); ctx.lineTo(VW, VH); ctx.fill();
  for (const pts of [[380, 186, 420, 196, 410, 212, 470, 230], [520, 180, 500, 198, 540, 214]]) { stroke(ctx, pts, 2.2, '#c8463a'); stroke(ctx, pts, 5, 'rgba(200,70,58,.2)'); }
  for (let i = 0; i < 50; i++) { const x = R() * VW, y = 180 + R() * 56; stroke(ctx, [x, y, x + 6 + R() * 12, y - 1], 0.6, rgba('#6a5a78', 0.3)); }
  // 주상절리 기둥 무리 (오른쪽)
  for (let i = 0; i < 12; i++) { const x = 500 + i * 12, h = 40 + hash(i, 2) * 80; rect(ctx, x, 196 - h, 11, h + 30, i % 2 ? '#221c26' : '#1a151e'); rect(ctx, x, 196 - h, 11, 2, '#3a3040'); }
  // 길과 행렬: 깃발을 앞세운 긴 줄, 짐을 끄는 큰 짐승
  ctx.strokeStyle = '#2e2634'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(250, 178); ctx.quadraticCurveTo(360, 196, 300, 214); ctx.quadraticCurveTo(240, 228, 330, 244); ctx.stroke();
  demonBanner(v, 298, 196, 44, { raw: true });
  for (let i = 0; i < 9; i++) { const x = 306 + i * 9 - (i > 5 ? (i - 5) * 6 : 0), y = 196 + (i > 5 ? (i - 5) * 3 : 0); demon(v, x, y, 26, { raw: true, f: -1, thin: 0.8, cloth: '#241c2a', skin: '#5a5262', rim: 'rgba(0,0,0,0)' }); if (i % 3 === 1) { oval(ctx, x - 3, y - 30, 1.2, 1.2, '#d8a0f8'); glow(v, x - 3, y - 30, 8, '#a060e0', 0.5); } }
  oval(ctx, 404, 190, 16, 8, '#120e14'); for (const k of [-10, -4, 6, 12]) rect(ctx, 404 + k, 192, 2.6, 9, '#120e14'); poly(ctx, [388, 186, 378, 180, 380, 190], '#120e14'); stroke(ctx, [380, 180, 374, 172], 1.4, '#120e14'); rect(ctx, 420, 180, 22, 14, '#1e1822');
  // 길가의 꿰어 세운 장대들 (경고)
  for (const x of [204, 226]) { stroke(ctx, [x, 190, x + 1, 150], 1.2, '#120e14'); oval(ctx, x + 1, 150, 2.6, 3, '#8a8088'); }
  // 앞: 바위 뒤에 엎드린 나와 길잡이
  
  person(v, 150, 236, 84, mine(v, { raw: true, f: 1, pose: 'kneel', cloak: true, hood: true, rim: 'rgba(200,80,70,.6)', rimDir: 1 }));
  person(v, 96, 238, 80, { raw: true, f: 1, pose: 'huddle', cloth: '#2a2622', hair: '#1c1614', hood: true });
  poly(ctx, [130, 240, 150, 206, 196, 196, 240, 208, 262, 240], '#0e0b10'); poly(ctx, [150, 206, 196, 196, 240, 208, 232, 212, 196, 202, 156, 210], '#2a2230');
  // 재
  for (let i = 0; i < 80; i++) { ctx.fillStyle = rgba('#c8b0b8', 0.1 + R() * 0.24); ctx.fillRect(R() * VW, R() * VH, 1.2, 1.2); }
  finish(v, { noLeaves: true });
}

/* ---------- 옷감 ---------- */
/** 베틀: 날실이 팽팽한 큰 베틀과 짜는 사람, 물레 돌리는 노인, 들보에 건 실타래 */
function clothLoom(v) {
  const { ctx } = v; room(v, { wall: '#3e342a', floor: '#2c241c', fy: 176, stone: false });
  ctx.save(); zoom(v, 330, 240, 1.08);
  windowAt(v, 120, 40, 60, 60); rect(ctx, 86, 100, 68, 4, '#2a2019'); shaft(v, 120, 100, 50, 130, 110, '#f8e8c0', 0.2);
  // 들보와 걸린 실타래
  rect(ctx, 0, 14, VW, 9, '#2a2019');
  for (let i = 0; i < 13; i++) { const x = 220 + i * 30, c = DYE[i % DYE.length]; stroke(ctx, [x, 23, x, 30], 0.8, '#1c1612'); const cc = mixh(c, '#4a4038', 0.25); oval(ctx, x, 37, 3.6, 8, cc); oval(ctx, x, 52, 4.4, 9, cc, 0.2); oval(ctx, x - 1.4, 51, 1.4, 6, light(cc, 0.16), 0.2); stroke(ctx, [x - 4, 44, x + 4, 44.6], 1.4, dark(cc, 0.4)); for (const q of [-2, 0, 2]) stroke(ctx, [x + q, 60, x + q * 1.6, 66], 0.6, cc); }
  // 베틀: 네 기둥 틀, 날실, 잉아, 감긴 천
  const lx = 300, ly = 216, wood = '#5a4430', wd = '#3e2e20';
  rect(ctx, lx, ly - 120, 8, 120, wood); rect(ctx, lx + 180, ly - 120, 8, 120, wd); rect(ctx, lx - 4, ly - 124, 196, 7, wood); rect(ctx, lx, ly - 30, 188, 6, wd);
  ctx.strokeStyle = 'rgba(216,206,180,.42)'; ctx.lineWidth = 0.4; for (let i = 0; i < 34; i++) { const k = i / 33; ctx.beginPath(); ctx.moveTo(lx + 56, ly - 66 - k * 3); ctx.lineTo(lx + 98, ly - 68 + (i % 2 ? 6 : -6) - k * 3); ctx.lineTo(lx + 178, ly - 70 - k * 4); ctx.stroke(); }
  rect(ctx, lx + 90, ly - 118, 4, 70, wd); rect(ctx, lx + 102, ly - 118, 4, 70, wd); rect(ctx, lx + 84, ly - 90, 28, 3, wood); rect(ctx, lx + 84, ly - 64, 28, 3, wood);
  oval(ctx, lx + 180, ly - 72, 9, 9, '#c8bea4'); oval(ctx, lx + 180, ly - 72, 3, 3, wd);
  // 짠 천: 무늬 줄이 든 붉은 베
  poly(ctx, [lx + 12, ly - 62, lx + 58, ly - 70, lx + 58, ly - 65, lx + 12, ly - 56], '#8a2e2a'); for (let i = 0; i < 5; i++) stroke(ctx, [lx + 18 + i * 9, ly - 62 - i * 1.6, lx + 18 + i * 9, ly - 57 - i * 1.6], 1, '#b89a3c');
  oval(ctx, lx + 10, ly - 56, 8, 8, '#7a2a26'); oval(ctx, lx + 10, ly - 56, 2.6, 2.6, wd);
  stroke(ctx, [lx + 40, ly - 30, lx + 80, ly - 8], 3, wd); stroke(ctx, [lx + 60, ly - 30, lx + 110, ly - 8], 3, wd); // 발판
  // 북
  poly(ctx, [lx + 60, ly - 76, lx + 76, ly - 78, lx + 80, ly - 75, lx + 64, ly - 73], '#8a6a44');
  // 걸상에 앉아 짜는 나
  rect(ctx, lx - 36, ly - 22, 36, 5, wd); rect(ctx, lx - 32, ly - 17, 4, 18, wd); rect(ctx, lx - 8, ly - 17, 4, 18, wd);
  person(v, lx - 20, ly - 2, 100, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: 'rgba(255,236,200,.6)', rimDir: -1 }));
  // 물레를 돌리는 노인과 양털 광주리
  const sx = 170, sy = 214; ctx.strokeStyle = wood; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(sx, sy - 34, 24, 0, TAU); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; stroke(ctx, [sx, sy - 34, sx + Math.cos(a) * 24, sy - 34 + Math.sin(a) * 24], 0.9, wd); }
  rect(ctx, sx - 3, sy - 34, 6, 36, wd); rect(ctx, sx - 30, sy - 4, 90, 5, wd); rect(ctx, sx + 50, sy - 30, 4, 28, wd); stroke(ctx, [sx + 24, sy - 34, sx + 52, sy - 30], 0.5, '#d8cea8'); stroke(ctx, [sx + 52, sy - 30, sx + 84, sy - 52], 0.6, '#d8cea8');
  person(v, sx + 96, sy + 16, 92, { raw: true, f: -1, pose: 'sit', cloth: '#4a4038', hair: '#b8b4ac', female: true, old: true, hood: true, arm: 'fwd' });
  oval(ctx, 80, 222, 22, 9, '#5a4630'); for (let i = 0; i < 8; i++) oval(ctx, 66 + i * 4, 214 - (i % 3) * 2, 6, 5, '#d8d0bc');
  // 쌓아 둔 옷감과 실감개 든 아이
  for (const [i, c] of [[0, DYE[1]], [1, DYE[5]], [2, DYE[2]]]) bolt(ctx, 536, 226 - i * 12, 60, 6, c);
  person(v, 520, 234, 60, folk(3, { raw: true, f: -1, child: true, arm: 'chest' })); oval(ctx, 512, 200, 5, 6, DYE[3]);
  ctx.restore(); finish(v, { inside: true });
}
/** 염색 통: 냇가의 큰 통들과 김, 장대로 젓는 일꾼들, 줄에 넌 긴 천, 물든 냇물 */
function clothDye(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { woods: true });
  const gy = (x) => 150 - fbm1(x / 220 + v.q, 3) * 6; ground(v, gy, { tufts: 110 });
  // 냇물: 왼쪽 위에서 오른쪽 아래로. 통 아래쪽은 빛깔이 섞여 흐른다
  const wc = t(mixh(v.P.water ?? '#5c7890', v.S.low, 0.4));
  ctx.fillStyle = wc; ctx.beginPath(); ctx.moveTo(0, 156); ctx.quadraticCurveTo(200, 160, 330, 196); ctx.quadraticCurveTo(440, 226, 640, 226); ctx.lineTo(640, 250); ctx.lineTo(300, 250); ctx.quadraticCurveTo(200, 196, 0, 176); ctx.fill();
  for (const [c, off] of [[DYE[0], 0], [DYE[1], 7], [DYE[2], 13]]) { ctx.strokeStyle = rgba(t(c), 0.6); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(330, 200 + off); ctx.quadraticCurveTo(440, 228 + off * 0.8, 640, 230 + off * 0.8); ctx.stroke(); }
  // 빨래판 같은 헹굼 자리와 헹구는 사람
  rect(ctx, 250, 186, 40, 4, t('#4a3a2a')); person(v, 262, 190, 60, folk(1, { f: 1, pose: 'kneel', female: true, long: false, arm: 'fwd' })); stroke(ctx, [278, 176, 300, 190], 4, t(DYE[1]));
  // 뒤쪽 작업장 지붕과 굴뚝
  rect(ctx, 40, 96, 120, 54, t('#5a4a3a')); poly(ctx, [30, 96, 100, 66, 170, 96], t('#4a3428')); rect(ctx, 130, 60, 10, 24, t('#3e332c')); smoke(v, 135, 58, 50, 9, '#8a8478', 0.24); rect(ctx, 84, 116, 22, 34, t('#1c1612'));
  // 넌 천: 장대 사이 줄 두 가닥, 길게 드리운 물든 천
  for (const [x0, x1, y, h, cs] of [[196, 420, 78, 62, [0, 1, 5, 2, 3, 1]], [440, 620, 92, 70, [2, 0, 6, 3]]]) {
    rect(ctx, x0 - 2, y - 6, 4, gy(x0) - y + 20, t('#3a2c20')); rect(ctx, x1 - 2, y - 6, 4, gy(x1) - y + 26, t('#3a2c20')); stroke(ctx, [x0, y, (x0 + x1) / 2, y + 5, x1, y], 0.8, t('#8a8070'));
    cs.forEach((ci, i) => { const w = (x1 - x0 - 16) / cs.length - 5, x = x0 + 8 + i * (w + 5), yy = y + 1 + Math.sin(((i + 0.5) / cs.length) * Math.PI) * 4; sheet(v, x, yy, w, h * (0.84 + hash(i, x0) * 0.3), t(DYE[ci]), (v.S.dir ?? 1) * (3 + hash(i, 7) * 5)); });
  }
  // 통 셋: 붉은 물, 쪽물, 노란 물. 아궁이 불과 김
  for (const [x, y, r, c] of [[150, 212, 38, DYE[0]], [330, 172, 26, DYE[1]], [460, 214, 36, DYE[2]]]) {
    rect(ctx, x - r, y - r * 0.9, r * 2, r * 0.9, t('#4a3a2a')); for (let i = -2; i <= 2; i++) stroke(ctx, [x + i * r * 0.4, y - r * 0.9, x + i * r * 0.4, y], 0.7, rgba('#000000', 0.25)); rect(ctx, x - r - 1, y - r * 0.66, r * 2 + 2, 2.4, t('#1c1814')); rect(ctx, x - r - 1, y - r * 0.24, r * 2 + 2, 2.4, t('#1c1814'));
    oval(ctx, x, y - r * 0.9, r, r * 0.26, t('#3a2c20')); oval(ctx, x, y - r * 0.9, r * 0.9, r * 0.2, t(c)); oval(ctx, x - r * 0.3, y - r * 0.93, r * 0.3, r * 0.05, rgba(t(light(c, 0.3)), 0.6));
    rect(ctx, x - r * 0.5, y, r, 5, '#1c1410'); flame(v, x - 4, y + 4, r * 0.16); glow(v, x, y + 2, r * 0.9, '#ff8a3a', 0.24);
    smoke(v, x, y - r, 44, r * 0.34, '#d8d4cc', 0.16);
  }
  // 젓는 일꾼(팔뚝까지 물들었다), 천을 건져 올리는 나, 통을 나르는 아이
  person(v, 204, 236, 96, folk(0, { f: -1, arm: 'fwd', rim, rimDir: 1 })); stroke(ctx, [182, 150, 152, 186], 2.2, t('#3a2c20')); stroke(ctx, [176, 178, 184, 184], 5, t(DYE[0]));
  person(v, 514, 238, 98, mine(v, { f: -1, arm: 'up', rim, rimDir: 1 })); ctx.fillStyle = t(DYE[2]); ctx.beginPath(); ctx.moveTo(492, 142); ctx.lineTo(498, 142); ctx.quadraticCurveTo(486, 170, 474, 184); ctx.lineTo(456, 184); ctx.quadraticCurveTo(480, 168, 492, 142); ctx.fill(); stroke(ctx, [488, 140, 538, 140], 2, t('#3a2c20'));
  person(v, 372, 198, 62, folk(4, { f: -1, arm: 'fwd' })); stroke(ctx, [362, 150, 338, 152], 1.8, t('#3a2c20'));
  person(v, 586, 236, 56, folk(3, { f: -1, child: true, arm: 'chest' })); rect(ctx, 572, 204, 12, 12, t('#4a3a2a'));
  // 물감 재료: 뿌리 다발, 조개 무더기, 빻은 돌
  for (let i = 0; i < 6; i++) stroke(ctx, [40 + i * 4, 232, 60 + i * 3, 216], 1.6, t('#7a3a2a')); for (let i = 0; i < 12; i++) oval(ctx, 86 + hash(i, 1) * 26, 232 - hash(i, 2) * 6, 3, 2, t(i % 2 ? '#c8c0b0' : '#8a6a8a'));
  finish(v, { noLeaves: false });
}
/** 재봉 가게: 옷감이 쌓인 선반, 반쯤 지은 옷을 입힌 옷걸이, 손님의 단을 잡는 재봉사 */
function clothShop(v) {
  const { ctx } = v; room(v, { wall: '#3e3228', floor: '#2c231b', fy: 176, stone: false });
  ctx.save(); zoom(v, 330, 240, 1.08);
  // 거리 쪽 창: 작은 유리 칸
  windowAt(v, 96, 34, 84, 84, { bars: 4 }); stroke(ctx, [54, 62, 138, 62], 2, '#17120e'); stroke(ctx, [54, 90, 138, 90], 2, '#17120e'); rect(ctx, 50, 118, 92, 5, '#2a2019'); shaft(v, 96, 118, 70, 110, 90, '#f8e8c0', 0.16);
  // 벽 선반 가득한 옷감 필
  for (let r = 0; r < 5; r++) { rect(ctx, 400, 28 + r * 28 + 22, 214, 3, '#2a1e16'); for (let i = 0; i < 7; i++) { const c = DYE[(r * 3 + i * 2) % DYE.length]; if ((r + i) % 6 === 5) continue; rect(ctx, 404 + i * 30, 28 + r * 28 + 6, 26, 16, c); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(404 + i * 30, 28 + r * 28 + 15, 26, 7); oval(ctx, 404 + i * 30, 28 + r * 28 + 14, 3, 8, light(c, 0.14)); } }
  rect(ctx, 396, 24, 4, 150, '#2a1e16'); rect(ctx, 612, 24, 4, 150, '#2a1e16');
  // 벽에 건 본(종이 옷본)과 가위, 줄자
  for (const [x, y] of [[196, 40], [236, 46]]) poly(ctx, [x, y, x + 26, y + 2, x + 30, y + 40, x + 14, y + 46, x - 4, y + 38], '#cfc4a8');
  stroke(ctx, [290, 40, 300, 70], 1.6, '#8a8e96'); stroke(ctx, [302, 40, 292, 70], 1.6, '#8a8e96'); ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(289, 37, 3.4, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(303, 37, 3.4, 0, TAU); ctx.stroke();
  // 큰 거울
  rect(ctx, 326, 40, 46, 112, '#6a5630'); rect(ctx, 330, 44, 38, 104, '#5a6a72'); poly(ctx, [330, 44, 348, 44, 334, 148, 330, 148], 'rgba(220,230,236,.16)');
  // 옷걸이(목 없는 몸통)에 입힌 반쯤 지은 예복: 한쪽 소매가 없고 시침실이 보인다
  const dx = 250, dy = 226; rect(ctx, dx - 1.5, dy - 60, 3, 60, '#3a2c20'); stroke(ctx, [dx - 14, dy, dx + 14, dy], 3, '#3a2c20');
  poly(ctx, [dx - 15, dy - 112, dx + 15, dy - 112, dx + 11, dy - 82, dx + 24, dy - 26, dx - 24, dy - 26, dx - 11, dy - 82], '#5e2a52'); oval(ctx, dx, dy - 114, 6, 3.4, '#cfc4a8');
  poly(ctx, [dx - 15, dy - 112, dx - 26, dy - 78, dx - 18, dy - 76, dx - 11, dy - 100], '#4e2244'); stroke(ctx, [dx, dy - 110, dx, dy - 30], 0.7, '#b89a3c'); ctx.setLineDash([2, 2]); stroke(ctx, [dx + 11, dy - 82, dx + 22, dy - 30], 0.7, '#e8e0c8'); stroke(ctx, [dx - 22, dy - 30, dx + 22, dy - 30], 0.7, '#e8e0c8'); ctx.setLineDash([]);
  // 재단대: 펼친 옷감, 분필선, 큰 가위, 바늘겨레
  rect(ctx, 100, 180, 120, 6, '#4a3626'); rect(ctx, 106, 186, 5, 44, '#2e2218'); rect(ctx, 208, 186, 5, 44, '#2e2218');
  poly(ctx, [104, 178, 196, 176, 214, 181, 214, 196, 204, 210, 196, 186, 104, 186], '#2e4a6e'); ctx.setLineDash([3, 2]); stroke(ctx, [116, 180, 160, 179, 184, 183], 0.8, '#e8e0c8'); ctx.setLineDash([]); oval(ctx, 124, 175, 5, 3.4, '#8a2e2a');
  // 창가에서 바느질하는 견습
  person(v, 150, 178, 82, folk(1, { raw: true, f: 1, female: true, long: false, arm: 'fwd', rim: 'rgba(255,236,200,.6)', rimDir: -1 }));
  // 발판에 선 손님(귀족)과 무릎 꿇고 단을 잡는 나
  rect(ctx, 438, 224, 50, 8, '#4a3626'); rect(ctx, 442, 232, 4, 6, '#2e2218'); rect(ctx, 480, 232, 4, 6, '#2e2218');
  person(v, 462, 224, 108, { raw: true, f: -1, cloth: '#8a2e2a', hair: '#6a4a2a', female: true, long: true, arm: 'out', rim: WARM, rimDir: -1 }); stroke(ctx, [444, 172, 446, 222], 0.8, '#b89a3c'); stroke(ctx, [480, 172, 478, 222], 0.8, '#b89a3c');
  person(v, 406, 238, 100, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', rim: WARM, rimDir: 1 })); for (let i = 0; i < 4; i++) oval(ctx, 444 + i * 8, 222, 0.9, 0.9, '#e8e8f0');
  // 손님을 따라온 시녀: 접은 옷감을 안고 있다
  person(v, 560, 236, 96, folk(4, { raw: true, f: -1, female: true, long: false, arm: 'chest' })); rect(ctx, 544, 180, 22, 9, '#cfc6ae');
  candle(v, 376, 150, 9); pool(v, 420, 210, 130, 26, '#ffb060', 0.16);
  ctx.restore(); finish(v, { inside: true });
}

export const PLATES12 = {
  /** 새 집안들의 어린 시절. variant: manor(귀족 저택) tower(마탑) church(성당) workshop(장인 공방) slum(빈민가 골목) port(항구 도시) */
  origin(v) { const k = v.variant ?? 'manor'; return ({ tower: originTower, church: originChurch, workshop: originWorkshop, slum: originSlum, port: originPort }[k] ?? originManor)(v); },
  /** 마족. variant: fort(경계의 요새) envoy(마족 사절) land(마족의 땅) */
  demon(v) { const k = v.variant ?? 'fort'; return k === 'envoy' ? demonEnvoy(v) : k === 'land' ? demonLand(v) : demonFort(v); },
  /** 옷감. variant: loom(베틀) dye(염색 통) shop(재봉 가게) */
  cloth(v) { const k = v.variant ?? 'loom'; return k === 'dye' ? clothDye(v) : k === 'shop' ? clothShop(v) : clothLoom(v); },
};
