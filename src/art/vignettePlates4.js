// 13단계 삽화: 하늘과 땅의 재앙(nature), 짐승과 사는 삶(beastlife).
import { fbm1, rgba, dark, light } from './sceneKit.js';
import { VW, VH, HZ, sky, far, townFar, ground, glow, candle, pool, smoke, person, crowd, tree, crows, flame, finish, zoom } from './vignetteKit.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)';
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'][i % 6], hair: ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'][i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const rain = (v, n, a = 0.26, slant = -5) => { const { ctx, R } = v; ctx.strokeStyle = rgba('#dfe8f0', a); ctx.lineWidth = 0.8; for (let i = 0; i < n; i++) { const x = R() * (VW + 40), y = R() * VH, l = 8 + R() * 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + slant * l / 12, y + l); ctx.stroke(); } };

/** 작은 집: 흙벽과 낮은 지붕. o: lit 창에 불, snow 지붕에 눈, lean 기울기 */
export function cottage(v, x, y, w, h, o = {}) {
  const { ctx, t } = v, roof = t(o.roof ?? '#4a3a30'), wall = t(o.wall ?? '#a89878');
  ctx.save(); ctx.translate(x, y); if (o.lean) ctx.rotate(o.lean);
  rect(ctx, -w / 2, -h, w, h, wall); rect(ctx, -w / 2, -h * 0.16, w, h * 0.16, t('#6e685e'));
  poly(ctx, [-w / 2 - 8, -h, 0, -h * 1.75, w / 2 + 8, -h], roof);
  if (o.snow) { poly(ctx, [-w / 2 - 8, -h, 0, -h * 1.75, w / 2 + 8, -h, w / 2 + 2, -h - 3, 0, -h * 1.62, -w / 2 - 2, -h - 3], t('#e6eaec')); }
  rect(ctx, w * 0.2, -h * 1.72, w * 0.1, h * 0.36, t('#5a524a'));
  rect(ctx, -w * 0.3, -h * 0.62, w * 0.2, h * 0.62, t('#2a1e16'));
  rect(ctx, w * 0.12, -h * 0.66, w * 0.2, h * 0.26, o.lit ? '#ffc070' : t('#1e1a1c'));
  ctx.restore();
  if (o.lit) glow(v, x + w * 0.22, y - h * 0.53, w * 0.5, '#ffb060', 0.4);
}

/** 서 있는 말 옆모습. h는 어깨 높이, d는 보는 쪽 */
export function horseSil(v, x, y, h, d, coat = '#5a3a24', o = {}) {
  const { ctx, t } = v, c = t(coat), dk = t(dark(coat, 0.4));
  ctx.save(); ctx.translate(x, y); ctx.scale(d * h / 100, h / 100); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  oval(ctx, 0, 4, 60, 5, rgba('#000000', 0.2));
  stroke(ctx, [-42, -70, -56, -52, -54, -18], 6, dk);
  for (const [x0, x1, x2, far2] of [[-40, -44, -41, 1], [38, 41, 38, 1], [-24, -27, -29, 0], [22, 24, 21, 0]]) stroke(ctx, [x0, -56, x1, -26, x2, 0], far2 ? 5.5 : 6.5, far2 ? dk : c);
  oval(ctx, 0, -64, 44, 21, c); oval(ctx, -28, -66, 20, 22, c); oval(ctx, 30, -68, 18, 22, c);
  poly(ctx, [22, -84, 50, -122, 66, -114, 46, -56], c);
  poly(ctx, [48, -124, 62, -128, 86, -98, 84, -90, 76, -88, 56, -104], c);
  poly(ctx, [52, -126, 54, -138, 60, -127], dk);
  stroke(ctx, [26, -88, 50, -124], 6, dk);
  oval(ctx, 66, -112, 1.8, 1.8, '#0c0808');
  if (o.tack) { stroke(ctx, [60, -118, 78, -96], 1.6, t('#2a1a10')); stroke(ctx, [74, -98, 56, -108], 1.4, t('#2a1a10')); }
  if (o.blanket) poly(ctx, [-22, -86, 18, -86, 22, -56, -26, -56], t(o.blanket));
  ctx.restore();
}
/** 앉은 개(또는 여우·고양이 같은 작은 짐승). o.ears 뾰족 귀, o.eye 빛나는 눈 */
export function dogSil(v, x, y, h, d, coat = '#6a5038', o = {}) {
  const { ctx, t } = v, c = o.raw ? coat : t(coat), dk = o.raw ? dark(coat, 0.4) : t(dark(coat, 0.4));
  ctx.save(); ctx.translate(x, y); ctx.scale(d * h / 100, h / 100); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  oval(ctx, 4, 2, 40, 4, rgba('#000000', 0.2));
  stroke(ctx, [-26, -8, -46, -4, -52, -20], o.brush ? 12 : 5, dk);
  oval(ctx, -8, -24, 26, 24, c);
  oval(ctx, 8, -48, 18, 30, c, 0.3);
  stroke(ctx, [16, -40, 20, 0], 8, c); stroke(ctx, [8, -36, 10, 0], 7, dk);
  oval(ctx, 22, -84, 14, 13, c); poly(ctx, [28, -90, 48, -82, 46, -74, 26, -72], c);
  oval(ctx, 47, -79, 2.4, 2.2, '#0c0808');
  if (o.ears) { poly(ctx, [10, -92, 12, -112, 22, -96], dk); poly(ctx, [20, -96, 26, -114, 32, -92], c); } else poly(ctx, [10, -94, 4, -72, 18, -80], dk);
  if (o.eye) { oval(ctx, 30, -86, 2.6, 2.2, o.eye); } else oval(ctx, 30, -86, 1.6, 1.6, '#0c0808');
  ctx.restore();
  if (o.eye) glow(v, x + d * h * 0.3, y - h * 0.86, h * 0.22, o.eye, 0.5);
}

/* ---------- 재앙 ---------- */
/** 마른 우물가의 다툼 */
function drought(v) {
  const { ctx, t, R } = v; v.P = { ...v.P, snow: false };
  sky(v); far(v); glow(v, 470, 40, 150, '#fff0c0', 0.3);
  const gy = (x) => 150 - fbm1(x / 170 + v.q, 3) * 5;
  ground(v, gy, { color: '#b8a070', color2: '#7a6444', tufts: 0, plain: true });
  { const g = ctx.createLinearGradient(0, 144, 0, VH); g.addColorStop(0, t('#c4ac78')); g.addColorStop(1, t('#8e7650')); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, gy(x)); ctx.lineTo(VW, VH); ctx.fill(); }
  ctx.strokeStyle = rgba(t('#4a3a26'), 0.5); ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) { const d = R(), x = R() * VW, y = 158 + d * d * 80, s = 0.4 + d; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 34 * s, y + 2 + d * 5); ctx.lineTo(x + (R() - 0.5) * 44 * s, y + 4 + d * 11); ctx.stroke(); }
  tree(v, 96, 196, 150, { bare: true }); tree(v, 588, 178, 96, { bare: true });
  cottage(v, 520, 162, 60, 30); cottage(v, 452, 158, 44, 24);
  // 우물: 돌 둘레, 기둥, 도르래, 빈 두레박
  const wx = 322, wy = 212, st = t('#8a8478');
  oval(ctx, wx, wy + 2, 46, 8, rgba('#000000', 0.2));
  rect(ctx, wx - 32, wy - 24, 64, 24, st); oval(ctx, wx, wy, 32, 6, t('#6a645a')); oval(ctx, wx, wy - 24, 32, 6, t('#a49c8e')); oval(ctx, wx, wy - 24, 25, 4.4, '#0e0c0a');
  for (let i = 0; i < 6; i++) stroke(ctx, [wx - 30 + i * 12, wy - 16, wx - 30 + i * 12, wy - 4], 0.8, rgba('#000000', 0.2));
  rect(ctx, wx - 34, wy - 78, 5, 58, t('#4a3a2a')); rect(ctx, wx + 29, wy - 78, 5, 58, t('#4a3a2a')); rect(ctx, wx - 38, wy - 82, 76, 5, t('#3e3024'));
  stroke(ctx, [wx, wy - 78, wx, wy - 46], 1.2, t('#8a7a5c')); poly(ctx, [wx - 7, wy - 46, wx + 7, wy - 46, wx + 5, wy - 34, wx - 5, wy - 34], t('#5a4632'));
  // 두 패로 갈라선 사람들
  person(v, 226, 226, 92, folk(0, { f: 1, arm: 'fwd' })); person(v, 190, 230, 88, folk(1, { f: 1 })); person(v, 152, 224, 90, folk(2, { f: 1, arm: 'up' }));
  person(v, 420, 226, 92, folk(3, { f: -1, arm: 'fwd' })); person(v, 458, 230, 86, folk(4, { f: -1 })); person(v, 494, 224, 90, folk(5, { f: -1, arm: 'up' }));
  person(v, 276, 234, 96, mine(v, { f: 1, arm: 'chest' }));
  for (const [x, y] of [[250, 232], [398, 234]]) { poly(ctx, [x - 6, y - 12, x + 6, y - 12, x + 4.6, y, x - 4.6, y], t('#5a4632')); stroke(ctx, [x - 6, y - 12, x, y - 20, x + 6, y - 12], 1.2, t('#3a2c20')); }
  finish(v, { noLeaves: true });
}
/** 한밤의 둑: 흙 자루를 쌓는 사람들 */
function flood(v) {
  const { ctx, t, R } = v; v.P = { ...v.P, snow: false };
  sky(v); far(v);
  // 불어난 강
  const wy = 146;
  rect(ctx, 0, wy, VW, VH - wy, t('#4a5e72'));
  for (let i = 0; i < 70; i++) { const y = wy + 2 + R() * 60, x = R() * VW, l = 10 + R() * 40; stroke(ctx, [x, y, x + l, y + (R() - 0.5) * 2], 0.9, rgba('#c8d4e0', 0.2 + R() * 0.22)); }
  poly(ctx, [600, wy + 6, 624, wy - 18, 640, wy - 12, 640, wy + 10], t('#3a3028')); stroke(ctx, [520, wy + 14, 548, wy + 8, 560, wy + 12], 3, t('#2a221c'));
  // 둑: 왼쪽 아래에서 오른쪽 위로 뻗은 흙 둔덕
  const top = (x) => 190 - x * 0.03 - fbm1(x / 90 + v.q, 2) * 4;
  ctx.fillStyle = t('#5a4c38'); ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, top(0)); for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, top(x)); ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.22); ctx.beginPath(); ctx.moveTo(0, top(0)); for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, top(x)); for (let x = VW; x >= 0; x -= 16) ctx.lineTo(x, top(x) + 7); ctx.fill();
  // 새는 곳과 흙 자루
  const bx = 396, bag = (x, y, k) => { oval(ctx, x, y, 13, 6, t(k ? '#9a8a68' : '#84765a')); stroke(ctx, [x - 9, y - 1, x + 9, y - 1], 0.7, rgba('#000000', 0.25)); };
  for (let i = 0; i < 9; i++) stroke(ctx, [bx + 40 + i * 5, top(bx + 40) + 4, bx + 46 + i * 7, top(bx + 40) + 26 + R() * 14], 1.4, rgba('#c8d4e0', 0.4));
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) bag(bx - 50 + i * 23 + r * 11, top(bx) + 2 - r * 9, (i + r) % 2);
  // 횃불
  const tx = 300, ty = top(300) + 6; rect(ctx, tx - 1.5, ty - 58, 3, 58, t('#3a2c20')); flame(v, tx, ty - 58, 7); pool(v, tx, ty + 6, 190, 26, '#ff9a48', 0.34); glow(v, tx, ty - 40, 130, '#ff9a48', 0.16);
  person(v, 352, top(352) + 34, 96, mine(v, { f: 1, arm: 'fwd', rim: WARM, rimDir: -1 })); bag(378, top(378) - 20, 1);
  person(v, 236, top(236) + 40, 92, folk(2, { f: 1, pose: 'bow', rim: WARM, rimDir: 1 })); bag(256, top(256) + 10, 0);
  person(v, 478, top(478) + 36, 90, folk(4, { f: -1, arm: 'fwd', rim: WARM, rimDir: -1 }));
  person(v, 150, top(150) + 44, 88, folk(1, { f: 1, hood: true })); bag(150, top(150) - 6, 1);
  // 멀리 종루
  rect(ctx, 70, 96, 14, 60, t('#2e2a2c')); poly(ctx, [64, 96, 77, 76, 90, 96], t('#262224')); glow(v, 77, 104, 18, '#ffb060', 0.35);
  finish(v, { noLeaves: true });
}
/** 혹한: 연기 없는 굴뚝의 집으로 장작을 지고 간다 */
function winter(v) {
  const { ctx, t, R } = v; v.P = { ...v.P, snow: true, autumn: 0 };
  sky(v); far(v);
  const gy = (x) => 160 - fbm1(x / 180 + v.q, 3) * 6;
  ground(v, gy, { tufts: 30 });
  for (let i = 0; i < 26; i++) oval(ctx, R() * VW, 176 + R() * 60, 20 + R() * 40, 2 + R() * 3, rgba('#8a98a8', 0.14));
  tree(v, 64, 200, 150, { bare: true });
  // 내 집: 불빛과 연기
  cottage(v, 150, 196, 92, 46, { lit: true, snow: true }); smoke(v, 172, 118, 70, 16, '#cfd4d8', 0.3);
  // 옆집: 어둡고 조용하다
  cottage(v, 480, 200, 104, 50, { snow: true, wall: '#8c8478' });
  for (let i = 0; i < 7; i++) stroke(ctx, [436 + i * 14, 150, 436 + i * 14, 156 + R() * 8], 1.2, rgba('#e8f0f4', 0.8));
  oval(ctx, 452, 204, 30, 5, t('#e6eaec')); oval(ctx, 520, 204, 26, 4, t('#e6eaec'));
  // 눈길의 발자국
  for (let i = 0; i < 12; i++) oval(ctx, 214 + i * 13, 228 - Math.sin(i / 3) * 3 + (i % 2) * 3, 3, 1.4, rgba('#5a6a7a', 0.4));
  // 장작을 진 나
  const px = 372, py = 232;
  rect(ctx, px - 20, py - 78, 14, 34, t('#5a4632')); for (let i = 0; i < 5; i++) { stroke(ctx, [px - 26, py - 76 + i * 7, px - 2, py - 78 + i * 7], 4, t(i % 2 ? '#7a5c3c' : '#6a4e32')); oval(ctx, px - 2, py - 78 + i * 7, 2, 2, t('#c8a878')); }
  person(v, px, py, 96, mine(v, { f: 1, cloak: true, hood: true, old: false, rim: 'rgba(210,225,240,.4)', rimDir: -1 }));
  finish(v, { noLeaves: true });
}
/** 땅울림 뒤: 무너진 집에서 돌을 들어낸다 */
function quake(v) {
  const { ctx, t, R } = v;
  sky(v); far(v);
  const gy = () => 164;
  ground(v, gy, { color: v.P.snow ? undefined : '#8a7c62', color2: '#5a4c3a', tufts: 30 });
  cottage(v, 110, 196, 96, 50, { lean: -0.05 }); cottage(v, 560, 190, 80, 44, { lean: 0.09, wall: '#9a8c74' });
  stroke(ctx, [84, 156, 96, 172, 90, 186], 1.4, rgba('#000000', 0.5)); stroke(ctx, [548, 158, 556, 176], 1.4, rgba('#000000', 0.5));
  // 땅의 금
  stroke(ctx, [0, 214, 70, 218, 130, 212, 210, 222, 262, 218], 2.2, rgba('#1a1410', 0.7)); stroke(ctx, [130, 212, 150, 228, 190, 236], 1.4, rgba('#1a1410', 0.6));
  // 무너진 집: 남은 벽 한 귀, 쏟아진 돌과 들보
  const cx = 350, cy = 214;
  poly(ctx, [cx + 60, cy, cx + 60, cy - 70, cx + 78, cy - 78, cx + 96, cy - 52, cx + 104, cy - 20, cx + 110, cy], t('#9a8c74'));
  rect(ctx, cx + 70, cy - 52, 14, 18, t('#1e1a1c'));
  poly(ctx, [cx - 110, cy + 4, cx - 70, cy - 22, cx - 20, cy - 34, cx + 30, cy - 28, cx + 70, cy - 12, cx + 110, cy + 4], t('#6e665a'));
  for (let i = 0; i < 44; i++) { const k = R(), x = cx - 100 + R() * 200, y = cy + 2 - (1 - Math.abs((x - cx) / 105) ** 1.6) * 32 * k, s = 4 + R() * 7; poly(ctx, [x - s, y, x - s * 0.4, y - s * 0.8, x + s * 0.7, y - s * 0.6, x + s, y], t(R() < 0.5 ? '#8a8276' : '#a49a88')); }
  stroke(ctx, [cx - 84, cy - 4, cx + 6, cy - 58], 6, t('#4a3a2a')); stroke(ctx, [cx - 30, cy - 10, cx + 74, cy - 44], 5, t('#3e3024')); stroke(ctx, [cx + 10, cy - 30, cx + 30, cy - 76], 4, t('#4a3a2a'));
  poly(ctx, [cx - 60, cy - 26, cx - 8, cy - 62, cx + 4, cy - 52, cx - 44, cy - 18], t('#4a3a30'));
  // 먼지
  for (let i = 0; i < 14; i++) glow(v, cx - 90 + R() * 180, cy - 30 - R() * 70, 26 + R() * 30, '#c8b89a', 0.07);
  person(v, cx - 122, cy + 20, 96, mine(v, { f: 1, pose: 'bow', arm: 'fwd' })); poly(ctx, [cx - 100, cy + 6, cx - 92, cy - 6, cx - 78, cy - 4, cx - 74, cy + 8], t('#a49a88'));
  person(v, cx + 138, cy + 18, 90, folk(2, { f: -1, pose: 'bow' }));
  person(v, cx + 186, cy + 24, 88, folk(1, { f: -1, arm: 'chest' })); person(v, cx + 214, cy + 20, 60, folk(4, { f: -1, child: true }));
  finish(v, { noLeaves: true });
}
/** 메뚜기 떼: 들판을 덮는 검은 구름 */
function locust(v) {
  const { ctx, t, R } = v; v.P = { ...v.P, snow: false };
  sky(v); far(v); townFar(v, 110, HZ + 16, { s: 0.5, n: 4 });
  const gy = (x) => 148 - fbm1(x / 200 + v.q, 3) * 5;
  ground(v, gy, { color: '#c0a050', color2: '#7a6430', tufts: 0, plain: true });
  // 이삭
  for (let i = 0; i < 520; i++) { const d = R(), x = R() * VW, y = 152 + d * d * 90, h = 5 + d * 13, eaten = x > 380 + R() * 120; ctx.strokeStyle = rgba(t(eaten ? '#6e5e3a' : R() < 0.5 ? '#d8b860' : '#a88a3e'), 0.8); ctx.lineWidth = 0.8 + d * 0.7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1.5, y - h * (eaten ? 0.5 : 1)); ctx.stroke(); }
  // 떼: 오른쪽 위 하늘에서 들로 쏟아진다
  for (let i = 0; i < 22; i++) { const k = R(); ctx.save(); ctx.globalAlpha = 1; oval(ctx, 640 - k * 380 + (R() - 0.5) * 80, 10 + k * 110 + (R() - 0.5) * 50, 50 + R() * 60, 22 + R() * 26, rgba('#1c1810', 0.13)); ctx.restore(); }
  for (let i = 0; i < 4200; i++) { const k = Math.sqrt(R()), a = R(), x = 660 - k * 470 + (R() - 0.5) * 150 * (0.4 + k), y = -6 + k * 150 + (a - 0.5) * 120 * (0.5 + k * 0.6); if (y > 228) continue; const s = 0.5 + R() * 0.7 + (y > 130 ? 0.4 : 0); ctx.fillStyle = rgba('#14100a', 0.4 + R() * 0.45); ctx.fillRect(x, y, s * 1.6, s * 0.9); }
  // 들 가의 연기
  smoke(v, 86, 196, 110, 26, '#3a342c', 0.34); flame(v, 86, 198, 6);
  // 솥을 두드리는 사람들
  const pot = (x, y) => { oval(ctx, x, y, 7, 5, t('#2a2622')); stroke(ctx, [x + 4, y - 8, x + 12, y - 16], 1.6, t('#5a4632')); };
  person(v, 236, 230, 96, mine(v, { f: 1, arm: 'up' })); pot(256, 150);
  person(v, 310, 222, 86, folk(1, { f: 1, arm: 'up' })); pot(328, 152);
  person(v, 176, 224, 88, folk(3, { f: 1, arm: 'fwd', hat: true }));
  person(v, 388, 216, 70, folk(5, { f: 1, arm: 'up' }));
  finish(v, { noLeaves: true });
}
/** 폭풍의 부두: 밀려 나가는 배에 밧줄을 던진다 */
function storm(v) {
  const { ctx, t, R } = v; v.P = { ...v.P, snow: false };
  sky(v);
  rect(ctx, 0, 0, VW, VH, rgba('#0a0e16', 0.15)); glow(v, 520, 30, 190, '#c8d8f0', 0.16);
  // 바다와 물마루
  rect(ctx, 0, 132, VW, VH - 132, t('#26323e'));
  for (let r = 0; r < 7; r++) { const y0 = 138 + r * 15; ctx.fillStyle = t(r % 2 ? '#2e3c4a' : '#22303c'); ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, y0 + Math.sin(x / (22 + r * 5) + r * 2 + v.q) * (4 + r * 1.3) + fbm1(x / 60 + r, 2) * 5); ctx.lineTo(VW, VH); ctx.fill();
    for (let i = 0; i < 9; i++) { const x = R() * VW, y = y0 + Math.sin(x / (22 + r * 5) + r * 2 + v.q) * (4 + r * 1.3); stroke(ctx, [x - 8, y + 1, x, y - 1.6, x + 9, y + 1], 1.1, rgba('#dfe8f0', 0.3)); } }
  // 밀려 나가는 고깃배
  ctx.save(); ctx.translate(486, 168); ctx.rotate(-0.2);
  poly(ctx, [-44, -6, 46, -8, 34, 10, -30, 10], t('#3a2c22')); stroke(ctx, [-44, -6, 46, -8], 2, t('#5a4632'));
  stroke(ctx, [0, -6, 4, -64], 3, t('#2a2018')); poly(ctx, [4, -62, 34, -30, 5, -22], rgba(t('#b8b0a0'), 0.85)); stroke(ctx, [4, -62, -30, -8], 0.8, t('#1c1612'));
  ctx.restore();
  person(v, 474, 170, 34, folk(2, { f: -1, arm: 'up' }));
  // 부두: 왼쪽 아래의 널
  const dy = 196; poly(ctx, [0, dy, 300, dy + 4, 318, dy + 14, 318, VH, 0, VH], t('#4a3c2e'));
  for (let i = 0; i < 11; i++) stroke(ctx, [i * 30, dy + 1, i * 30 - 6, VH], 1, rgba('#000000', 0.3));
  for (const x of [60, 180, 300]) { rect(ctx, x - 5, dy - 20, 10, 60, t('#2e241c')); oval(ctx, x, dy - 20, 5, 2, t('#5a4a3a')); }
  rect(ctx, 0, dy + 4, 318, 3, rgba('#dfe8f0', 0.12));
  // 등불과 나, 날아가는 밧줄
  rect(ctx, 118, dy - 70, 3, 70, t('#2a2018')); glow(v, 120, dy - 74, 46, '#ffb060', 0.5); oval(ctx, 120, dy - 74, 3.4, 4.4, '#ffd890');
  person(v, 268, dy + 26, 98, mine(v, { f: 1, arm: 'up', rim: WARM, rimDir: -1 }));
  ctx.strokeStyle = t('#b8a880'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(288, dy - 52); ctx.quadraticCurveTo(370, dy - 120, 446, 164); ctx.stroke();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(262 + i * 2, dy + 22 - i * 1.4, 12, 3.4, 0, 0, TAU); ctx.stroke(); }
  person(v, 206, dy + 30, 90, folk(4, { f: 1, pose: 'bow', rim: WARM, rimDir: -1 }));
  rain(v, 120, 0.25, -9);
  finish(v, { noLeaves: true });
}
/** 흉년의 잠긴 곳간 앞 */
function granary(v) {
  const { ctx, t, R } = v;
  sky(v); far(v);
  const gy = () => 176;
  ground(v, gy, { color: v.P.snow ? undefined : '#7a6c54', color2: '#4a4034', tufts: 20 });
  // 곳간: 돌 밑단, 판자벽, 큰 지붕, 빗장 지른 두 짝 문
  const hx = 190, hw = 300, top = 78;
  rect(ctx, hx, top, hw, 122, t('#6a5440')); for (let x = hx + 12; x < hx + hw; x += 18) stroke(ctx, [x, top, x, 186], 0.8, rgba('#000000', 0.22));
  rect(ctx, hx, 184, hw, 18, t('#6e685e'));
  poly(ctx, [hx - 24, top + 4, hx + hw / 2, 14, hx + hw + 24, top + 4], t('#3e3028')); poly(ctx, [hx - 24, top + 4, hx + hw + 24, top + 4, hx + hw + 18, top + 11, hx - 18, top + 11], t('#2a2018'));
  const dx = hx + hw / 2;
  rect(ctx, dx - 46, 112, 92, 90, t('#3a2a1c')); stroke(ctx, [dx, 112, dx, 202], 1.4, '#140e0a');
  for (const y of [132, 176]) rect(ctx, dx - 46, y, 92, 5, t('#2a2a2e'));
  rect(ctx, dx - 54, 150, 108, 8, t('#5a4632')); oval(ctx, dx, 154, 6, 7, t('#8a8e94')); oval(ctx, dx, 155, 2, 2.6, '#0c0a0a');
  // 2층 창의 곡물상
  rect(ctx, dx - 16, 48, 32, 24, '#ffc070'); glow(v, dx, 60, 40, '#ffb060', 0.35); poly(ctx, [dx - 7, 72, dx - 6, 58, dx, 52, dx + 6, 58, dx + 7, 72], '#1a1210'); rect(ctx, dx - 18, 46, 36, 3, t('#2a2018'));
  if (v.P.snow) { poly(ctx, [hx - 24, top + 4, hx + hw / 2, 14, hx + hw + 24, top + 4, hx + hw + 10, top, hx + hw / 2, 22, hx - 10, top], t('#e6eaec')); }
  // 몰려든 사람들과 횃불
  crowd(v, 60, 300, 222, 9, 86, { rim: WARM, rimDir: 1 }); crowd(v, 380, 600, 224, 8, 84, { rim: WARM, rimDir: -1 });
  for (const [x, y] of [[150, 148], [420, 150], [540, 152]]) { rect(ctx, x - 1.2, y, 2.4, 40, t('#2a2018')); flame(v, x, y, 6); }
  pool(v, 330, 214, 240, 22, '#ff9a48', 0.2);
  person(v, dx - 8, 232, 100, mine(v, { f: 0, arm: 'up', rim: WARM, rimDir: -1 }));
  for (let i = 0; i < 30; i++) oval(ctx, R() * VW, 206 + R() * 30, 6 + R() * 16, 1.2, rgba('#000000', 0.08));
  finish(v, { noLeaves: true });
}

/* ---------- 짐승과 사는 삶 ---------- */
/** 마구간 마당. variant 'market' 사고팔기, 'care' 돌보기 */
function beastYard(v) {
  const { ctx, t, R } = v, k = v.variant ?? 'market', dim = v.S.tod === 'night' || v.S.tod === 'dusk', rim = dim ? WARM : null;
  sky(v); far(v);
  const gy = () => 170;
  ground(v, gy);
  poly(ctx, [0, 184, VW, 184, VW, VH, 0, VH], t(v.P.snow ? '#c8ccd0' : '#8a7658')); for (let i = 0; i < 30; i++) oval(ctx, R() * VW, 190 + R() * 46, 8 + R() * 20, 1.2, rgba('#000000', 0.06));
  // 마구간: 판자벽, 낮은 지붕, 반문 둘
  const hx = 300, hw = 320, top = 92;
  rect(ctx, hx, top, hw, 94, t('#6a5440')); for (let x = hx + 10; x < hx + hw; x += 16) stroke(ctx, [x, top, x, 186], 0.8, rgba('#000000', 0.2));
  poly(ctx, [hx - 20, top + 4, hx + 24, 58, hx + hw, 58, hx + hw, top + 4], t('#3e3028')); rect(ctx, hx - 20, top + 4, hw + 20, 6, t('#2a2018'));
  for (const sx of [hx + 50, hx + 190]) { rect(ctx, sx, 112, 70, 74, '#16100c'); rect(ctx, sx, 150, 70, 36, t('#5a4632')); stroke(ctx, [sx, 150, sx + 70, 186], 1.4, t('#3a2c20')); stroke(ctx, [sx + 70, 150, sx, 186], 1.4, t('#3a2c20')); rect(ctx, sx - 3, 108, 76, 4, t('#3a2c20')); }
  // 안에서 내다보는 말
  ctx.save(); ctx.beginPath(); ctx.rect(hx + 190, 112, 70, 40); ctx.clip(); horseSil(v, hx + 196, 226, 62, 1, '#3a2a20'); ctx.restore();
  if (dim) { glow(v, hx + 140, 120, 40, '#ffb060', 0.4); oval(ctx, hx + 140, 120, 3, 4, '#ffd890'); }
  // 울타리와 여물통
  for (let x = 20; x < 280; x += 44) rect(ctx, x, 150, 4, 44, t('#4a3a2a')); rect(ctx, 16, 158, 270, 3.4, t('#4a3a2a')); rect(ctx, 16, 174, 270, 3.4, t('#4a3a2a'));
  poly(ctx, [548, 214, 612, 214, 606, 230, 554, 230], t('#4a3a2a')); oval(ctx, 580, 214, 30, 3, t('#c0a860'));
  tree(v, 60, 190, 150);
  horseSil(v, 300, 230, 66, -1, v.seedCoat ?? '#6a3e22', { tack: k !== 'market' });
  dogSil(v, 452, 234, 34, -1, '#7a5a3a');
  if (k === 'market') {
    person(v, 378, 232, 100, mine(v, { f: -1, arm: 'fwd', rim, rimDir: -1 }));
    person(v, 196, 232, 98, { f: 1, cloth: '#4e3a2c', hair: '#3a2a1e', hat: true, arm: 'fwd', rim, rimDir: 1 });
    stroke(ctx, [214, 176, 250, 172], 1.4, t('#2a1a10'));
  } else {
    person(v, 356, 232, 100, mine(v, { f: -1, arm: 'fwd', rim, rimDir: -1 }));
    poly(ctx, [404, 218, 424, 218, 421, 232, 407, 232], t('#5a4632')); stroke(ctx, [404, 218, 414, 208, 424, 218], 1.2, t('#3a2c20'));
  }
  finish(v, { noLeaves: true });
}
/** 사역마 맺기: 밤의 빈터, 분필로 그은 둥근 진 */
function beastBond(v) {
  const { ctx, t, R } = v;
  sky(v); far(v);
  const gy = (x) => 160 - fbm1(x / 150 + v.q, 3) * 6;
  ground(v, gy, { tufts: 80 });
  for (const [x, h] of [[40, 200], [120, 170], [540, 180], [610, 210], [470, 150]]) tree(v, x, 190 + (h - 150) * 0.2, h, { dark: true });
  ctx.save(); zoom(v, 330, 236, 1.3);
  // 선돌 셋
  for (const [x, h] of [[226, 44], [330, 56], [430, 40]]) { poly(ctx, [x - 9, 180, x - 6, 180 - h, x + 5, 182 - h, x + 10, 180], t('#5a5850')); stroke(ctx, [x - 2, 176 - h * 0.7, x + 2, 176 - h * 0.4], 1, rgba('#9ab8ff', 0.5)); }
  // 진
  const cx = 330, cy = 214, col = '#9ab8ff';
  glow(v, cx, cy, 130, col, 0.2, 26);
  ctx.strokeStyle = rgba(col, 0.85); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(cx, cy, 104, 17, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, 82, 13, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; stroke(ctx, [cx + Math.cos(a) * 84, cy + Math.sin(a) * 13.4, cx + Math.cos(a) * 102, cy + Math.sin(a) * 16.6], 1, rgba(col, 0.7)); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.5; candle(v, cx + Math.cos(a) * 112, cy + Math.sin(a) * 18 + 2, 7); }
  // 진 안의 짐승과 무릎 꿇은 나
  dogSil(v, cx + 40, cy + 4, 36, -1, '#16141c', { raw: true, ears: true, brush: true, eye: '#bcd4ff' });
  person(v, cx - 56, cy + 12, 96, mine(v, { f: 1, pose: 'kneel', arm: 'fwd', rim: 'rgba(160,190,255,.55)', rimDir: 1 }));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { const a = R() * TAU, d = R() * 100; ctx.fillStyle = rgba(col, 0.3 + R() * 0.5); ctx.fillRect(cx + Math.cos(a) * d, cy - 6 - R() * 90, 1.3, 1.3); } ctx.restore();
  ctx.restore();
  finish(v, { noLeaves: true });
}
/** 짐승을 묻은 자리 */
function beastGrave(v) {
  const { ctx, t } = v;
  sky(v); far(v); townFar(v, 520, HZ + 18, { s: 0.55, n: 4 });
  const gy = (x) => 166 - fbm1(x / 170 + v.q, 3) * 8;
  ground(v, gy);
  ctx.save(); zoom(v, 330, 236, 1.45);
  tree(v, 250, 206, 190);
  // 흙무덤, 돌 하나, 말뚝에 건 목줄
  const mx = 356, my = 216;
  oval(ctx, mx, my + 2, 54, 6, rgba('#000000', 0.2));
  ctx.fillStyle = t(v.P.snow ? '#b8bcc0' : '#6a5640'); ctx.beginPath(); ctx.ellipse(mx, my, 46, 14, 0, Math.PI, 0); ctx.fill();
  poly(ctx, [mx + 30, my, mx + 32, my - 20, mx + 40, my - 24, mx + 47, my - 18, mx + 48, my], t('#8a8478'));
  rect(ctx, mx - 34, my - 44, 3, 46, t('#4a3a2a')); ctx.strokeStyle = t('#6a3e22'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(mx - 32, my - 34, 7, 9, 0.2, 0, TAU); ctx.stroke(); oval(ctx, mx - 30, my - 25, 1.8, 1.8, t('#c9a25a'));
  for (const [x, c] of [[mx - 8, '#e8e0c8'], [mx + 4, '#d8c070'], [mx + 14, '#e8e0c8']]) { stroke(ctx, [x, my - 4, x + 1, my - 12], 0.9, t('#4a5a3a')); oval(ctx, x + 1, my - 13, 2, 2, t(c)); }
  person(v, mx - 96, my + 16, 96, mine(v, { f: 1, pose: 'kneel', arm: 'chest', rim: WARM, rimDir: 1 }));
  ctx.restore();
  crows(v, 470, 70, 3, 40);
  finish(v);
}

export const PLATES4 = {
  /** 재앙. variant: drought flood winter quake locust storm granary */
  nature(v) { return ({ drought, flood, winter, quake, locust, storm, granary }[v.variant] ?? drought)(v); },
  /** 짐승과 사는 삶. variant: market care bond grave */
  beastlife(v) { const k = v.variant ?? 'market'; return k === 'bond' ? beastBond(v) : k === 'grave' ? beastGrave(v) : beastYard(v); },
};
