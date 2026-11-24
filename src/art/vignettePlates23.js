// 44단계 삽화: 새 고장 사람 살이(lands), 나라마다 다른 궁정(crowns), 미궁 깊게(delve).
// 등급 선: 피와 주검 없음. 미궁의 주인은 얼굴 없이 큰 그림자와 빛으로만.
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, room, windowAt, shaft, glow, flame, candle, smoke, person, crowd, tree, banner, sunSign, crows, finish } from './vignetteKit.js';
import { cottage } from './vignettePlates4.js';
import { spear, torch } from './vignettePlates5.js';
import { table } from './vignettePlates18.js';
import { elf, beastman, dwarf, shelf } from './vignettePlates21.js';
import { brazier, handOf, blade } from './vignettePlates22.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const bend = (ctx, a, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 2; i + 3 < a.length; i += 4) ctx.quadraticCurveTo(a[i], a[i + 1], a[i + 2], a[i + 3]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const ring = (ctx, x, y, rx, ry, w, c, rot = 0, a0 = 0, a1 = TAU) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, a0, a1); ctx.stroke(); };
const lit = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
const arch = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h + w / 2); ctx.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y); ctx.fill(); };
const WARM = 'rgba(255,190,110,.55)', COLD = 'rgba(190,210,240,.45)', FIRE = 'rgba(255,150,70,.6)', BLUE = 'rgba(150,200,255,.5)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const robed = (i, c, o = {}) => ({ cloth: c, hair: ['#b8b4ac', '#3a2a1e', '#8a8680', '#1c1614'][i % 4], robe: true, old: i % 2 === 0, ...o });
const lamp = (v, x, y, a = 0.22) => { const { ctx } = v; stroke(ctx, [x, y - 7, x, y - 4], 0.8, '#15110e'); rect(ctx, x - 2.4, y - 4, 4.8, 6.4, '#2a2018'); oval(ctx, x, y - 0.8, 1.6, 2, '#ffd890'); glow(v, x, y, 26, '#ffb060', a); };
/** 물: 잔물결 줄 */
const water = (v, y0, c, seed = 1, y1 = VH) => { const { ctx } = v; rect(ctx, 0, y0, VW, y1 - y0, v.t(c)); for (let i = 0; i < 26; i++) { const x = hash(i, seed) * VW, y = y0 + 4 + hash(i, seed + 1) * (y1 - y0 - 8); stroke(ctx, [x, y, x + 12 + hash(i, seed + 2) * 24, y], 0.8, 'rgba(220,230,240,.26)'); } };
/** 돛 내린 배 */
const hull = (v, x, y, w, c = '#2a2420', mast = 0) => { const { ctx } = v, k = v.t(c); poly(ctx, [x - w / 2, y - w * 0.12, x + w / 2, y - w * 0.12, x + w * 0.4, y, x - w * 0.4, y], k); if (mast) { rect(ctx, x - 1, y - w * 0.12 - mast, 2, mast, k); stroke(ctx, [x - w * 0.24, y - w * 0.12 - mast * 0.7, x + w * 0.24, y - w * 0.12 - mast * 0.7], 1.2, k); stroke(ctx, [x, y - w * 0.12 - mast, x - w * 0.42, y - w * 0.14], 0.5, k); stroke(ctx, [x, y - w * 0.12 - mast, x + w * 0.42, y - w * 0.14], 0.5, k); } };
/** 줄지은 높은 집(운하·학원 거리) */
function rowHouse(v, x, w, top, base, c, o = {}) {
  const { ctx } = v, wall = v.t(c), roof = v.t(o.roof ?? '#4a3630');
  rect(ctx, x, top, w, base - top, wall); poly(ctx, o.step ? [x - 2, top, x + w * 0.2, top, x + w * 0.2, top - 8, x + w * 0.35, top - 8, x + w * 0.35, top - 16, x + w * 0.65, top - 16, x + w * 0.65, top - 8, x + w * 0.8, top - 8, x + w * 0.8, top, x + w + 2, top] : [x - 3, top, x + w / 2, top - w * 0.42, x + w + 3, top], o.step ? wall : roof);
  const cols = Math.max(2, Math.floor(w / 18)), rows = Math.floor((base - top - 26) / 24);
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) { const wx = x + (w / cols) * (i + 0.5) - 4, wy = top + 10 + r * 24, on = o.lit && hash(i + r * 7, x) < 0.5; rect(ctx, wx, wy, 8, 12, on ? '#ffca80' : v.t('#2a2a30')); if (on) glow(v, wx + 4, wy + 6, 10, '#ffb060', 0.16); }
  arch(ctx, x + w * (o.door ?? 0.5) - 6, base, 12, 22, v.t('#241c18'));
}
/** 가죽 덮은 낮고 긴 집(수인) */
const hideHall = (v, x, y, w, h, c = '#6e5a44') => { const { ctx } = v, k = v.t(c); ctx.fillStyle = k; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * 0.42, y - h * 1.15, x, y - h); ctx.quadraticCurveTo(x + w * 0.42, y - h * 1.15, x + w / 2, y); ctx.fill(); for (let i = 1; i < 5; i++) stroke(ctx, [x - w / 2 + (w * i) / 5, y - h * 0.92, x - w / 2 + (w * i) / 5 + 2, y], 0.7, 'rgba(30,22,16,.4)'); stroke(ctx, [x - w * 0.46, y - h * 1.02, x + w * 0.46, y - h * 1.02], 1.6, v.t('#2e241a')); arch(ctx, x - 6, y, 12, h * 0.6, v.t('#1c1612')); };
const clanStone = (v, x, y, h) => { const { ctx } = v; poly(ctx, [x - h * 0.14, y, x - h * 0.1, y - h * 0.9, x + h * 0.02, y - h, x + h * 0.12, y - h * 0.86, x + h * 0.15, y], v.t('#5a5650')); for (let i = 0; i < 3; i++) stroke(ctx, [x - h * 0.06, y - h * (0.3 + i * 0.2), x + h * 0.06, y - h * (0.34 + i * 0.2)], 1, 'rgba(20,18,16,.5)'); };

// ───────── 새 고장의 살이 ─────────
/** 성국 순례 도시: 언덕 위 흰 성당으로 오르는 긴 돌계단과 순례 행렬, 초 파는 좌판 */
function ldPilgrim(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => 190 - Math.max(0, x - 200) * 0.2; ground(v, g, { color: '#8a8460', color2: '#5a563e', plain: true });
  // 언덕과 성당
  poly(ctx, [300, 170, 420, 122, 640, 108, 640, 190, 300, 190], t('#7a7658'));
  const bx = 530, by = 112; rect(ctx, bx - 60, by - 40, 120, 44, t('#e4dcc8')); poly(ctx, [bx - 66, by - 40, bx, by - 66, bx + 66, by - 40], t('#b8a888')); rect(ctx, bx - 10, by - 84, 20, 48, t('#e4dcc8')); poly(ctx, [bx - 13, by - 84, bx, by - 100, bx + 13, by - 84], t('#b8a888')); sunSign(v, bx, by - 106, 4, '#e8c860'); arch(ctx, bx - 8, by + 4, 16, 26, t('#3a3026')); for (const k of [-1, 1]) for (let i = 0; i < 2; i++) arch(ctx, bx + k * (24 + i * 18) - 4, by - 6, 8, 20, t('#5a6a80'));
  // 계단
  for (let i = 0; i < 16; i++) { const k = i / 15, x0 = 250 + k * 240, y = 204 - k * 88, w = 110 - k * 60; rect(ctx, x0, y, w, 9, t(i % 2 ? '#c8c0aa' : '#b4ac96')); }
  for (let i = 0; i < 9; i++) { const k = (i + 0.5) / 9, x = 300 + k * 230, y = 212 - k * 88, h = 62 - k * 36; person(v, x, y, h, folk(i, { f: 1, cloak: i % 2 === 0, hood: i % 3 === 0, stick: i % 2 ? 'staff' : null, cloth: ['#8a8474', '#6a665a', '#a49c88'][i % 3], noShadow: true })); }
  // 좌판과 초
  rect(ctx, 40, 186, 120, 6, t('#4a3a2a')); rect(ctx, 48, 192, 5, 30, t('#3a2c20')); rect(ctx, 148, 192, 5, 30, t('#3a2c20')); poly(ctx, [30, 150, 170, 150, 160, 136, 40, 136], t('#8a4a3a')); rect(ctx, 44, 150, 3, 38, t('#3a2c20')); rect(ctx, 154, 150, 3, 38, t('#3a2c20'));
  for (let i = 0; i < 8; i++) candle(v, 56 + i * 13, 186, 5 + (i % 3) * 2); person(v, 100, 226, 90, folk(4, { f: 1, female: true, long: true, veil: true, arm: 'fwd' }));
  person(v, 218, 236, 106, mine(v, { f: 1, cloak: true, stick: 'staff' })); crows(v, 380, 40, 4, 80);
  finish(v, { noLeaves: true });
}
/** 세레니아 학원 거리: 책방과 필경소가 늘어선 길, 끝에 푸른 불 켜진 탑. 책 든 학생들 */
function ldAcademy(v) {
  const { ctx, t } = v; sky(v);
  rect(ctx, 296, 20, 48, 176, t('#4a4a5a')); poly(ctx, [290, 20, 320, -20, 350, 20], t('#34344a')); for (let i = 0; i < 5; i++) { rect(ctx, 316, 36 + i * 28, 8, 14, '#9ad0ff'); glow(v, 320, 43 + i * 28, 14, '#70b0ff', 0.2); }
  rowHouse(v, 0, 90, 40, 196, '#7a6c58', { lit: true, door: 0.6 }); rowHouse(v, 90, 80, 62, 196, '#6a6458', { step: true, lit: true }); rowHouse(v, 170, 90, 50, 196, '#80705a', { lit: true });
  rowHouse(v, 380, 86, 54, 196, '#746654', { lit: true }); rowHouse(v, 466, 84, 66, 196, '#685e52', { step: true, lit: true }); rowHouse(v, 550, 90, 36, 196, '#7c6e5a', { lit: true, door: 0.4 });
  rect(ctx, 0, 196, VW, 44, t('#5a564e')); for (let i = 0; i < 40; i++) oval(ctx, hash(i, 2) * VW, 200 + hash(i, 3) * 38, 9, 2.4, rgba('#000000', 0.08));
  // 간판: 책과 깃펜
  for (const [x, k] of [[150, 0], [440, 1]]) { stroke(ctx, [x, 120, x + 26, 120], 1.6, '#2a2018'); rect(ctx, x + 6, 122, 18, 14, t('#3a2c20')); if (k) stroke(ctx, [x + 10, 133, x + 20, 125], 1.2, '#e8e0c8'); else { rect(ctx, x + 9, 125, 5, 8, '#e8e0c8'); rect(ctx, x + 16, 125, 5, 8, '#e8e0c8'); } }
  // 바깥 책 수레
  rect(ctx, 50, 204, 70, 5, t('#4a3a2a')); shelf(ctx, 54, 180, 62, 2, 5); rect(ctx, 56, 209, 4, 18, t('#3a2c20')); rect(ctx, 110, 209, 4, 18, t('#3a2c20'));
  for (let i = 0; i < 5; i++) { const x = [250, 284, 370, 420, 520][i], y = [212, 206, 210, 218, 224][i], h = [64, 54, 60, 78, 92][i]; person(v, x, y, h, { cloth: ['#2e3e5e', '#3a3050', '#2e3e5e', '#44405a', '#2e3e5e'][i], hair: HR[i], robe: true, female: i % 2 === 1, long: i % 2 === 1, f: i % 2 ? -1 : 1, arm: i === 4 ? 'chest' : null }); if (i === 4) rect(ctx, x - 12, y - h * 0.66, 9, 12, '#6a3a2a'); }
  person(v, 186, 236, 104, mine(v, { f: 1, arm: 'chest' })); rect(ctx, 192, 164, 10, 13, '#7a4a30');
  finish(v, { noLeaves: true });
}
/** 호숫가 마을: 새벽 안개 낀 호수, 물 위 말뚝 집과 긴 잔교, 그물 손질 */
function ldLake(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true }); water(v, 128, '#6a7e8c', 3);
  lit(ctx, () => rect(ctx, 0, 128, VW, 20, 'rgba(230,236,240,.14)'));
  // 말뚝 집
  for (const [x, w, h] of [[430, 70, 44], [520, 60, 38], [590, 64, 48]]) { for (let i = 0; i < 3; i++) rect(ctx, x - w / 2 + 6 + i * (w - 14) / 2, 150, 2.4, 26, t('#2e261e')); rect(ctx, x - w / 2 - 4, 148, w + 8, 4, t('#3a2e22')); cottage(v, x, 148, w, h, { roof: '#5a5040', wall: '#8a7c62' }); stroke(ctx, [x - w / 2, 178, x + w / 2, 178], 2, 'rgba(30,36,44,.3)'); }
  smoke(v, 446, 100, 50, 14, '#8a8680', 0.2);
  // 잔교와 배
  poly(ctx, [0, 240, 0, 196, 250, 176, 400, 172, 400, 180, 260, 190, 150, 240], t('#5a4a38')); for (let i = 0; i < 7; i++) rect(ctx, 130 + i * 44, 180 - i * 1.2, 3, 30, t('#2e261e'));
  for (let i = 0; i < 12; i++) stroke(ctx, [20 + i * 32, 200 - i * 2.4, 34 + i * 32, 236 - i * 5], 0.6, 'rgba(20,16,12,.3)');
  hull(v, 250, 222, 110, '#3a3026'); hull(v, 340, 150, 40, '#2e2a26'); person(v, 340, 146, 24, { cloth: '#2e2a26', hair: '#1c1614', f: -1, stick: 'staff', noShadow: true });
  // 그물 걸이
  stroke(ctx, [40, 196, 40, 130], 2, t('#2e261e')); stroke(ctx, [130, 190, 130, 126], 2, t('#2e261e')); bend(ctx, [40, 132, 86, 150, 130, 128], 1, t('#2e261e')); for (let i = 0; i < 10; i++) { stroke(ctx, [44 + i * 9, 134 + Math.sin(i / 9 * Math.PI) * 9, 44 + i * 9, 180], 0.5, 'rgba(40,36,30,.6)'); } for (let j = 0; j < 4; j++) bend(ctx, [40, 146 + j * 10, 86, 160 + j * 10, 130, 142 + j * 10], 0.5, 'rgba(40,36,30,.6)');
  person(v, 176, 222, 80, folk(3, { f: -1, old: true, pose: 'sit', arm: 'fwd' })); person(v, 96, 234, 100, mine(v, { f: 1, arm: 'fwd' }));
  for (let i = 0; i < 3; i++) bend(ctx, [300 + i * 60, 70 + i * 8, 304 + i * 60, 66 + i * 8, 308 + i * 60, 70 + i * 8, 312 + i * 60, 66 + i * 8, 316 + i * 60, 70 + i * 8], 0.9, 'rgba(30,30,36,.6)');
  finish(v, { noLeaves: true });
}
/** 엘프 숲의 나무 위 마을: 큰 줄기 사이 단과 줄다리, 등불. 다리 위의 엘프들 */
function ldCanopy(v) {
  const { ctx, t } = v; sky(v); rect(ctx, 0, 0, VW, VH, rgba(t('#24382c'), 0.72));
  for (let i = 0; i < 9; i++) { const x = 30 + i * 74 + hash(i, 4) * 20; rect(ctx, x, 0, 10 + hash(i, 5) * 10, VH, rgba(t('#1a2a22'), 0.6)); }
  lit(ctx, () => { for (const x of [200, 360, 470]) poly(ctx, [x, 0, x + 40, 0, x - 60, 240, x - 130, 240], 'rgba(220,230,170,.05)'); });
  const trunk = (x, w) => { poly(ctx, [x - w / 2, VH, x - w * 0.4, 0, x + w * 0.4, 0, x + w / 2, VH], t('#3a2e24')); poly(ctx, [x + w * 0.1, VH, x + w * 0.12, 0, x + w * 0.4, 0, x + w / 2, VH], t('#2a2019')); for (let i = 0; i < 6; i++) bend(ctx, [x - w * 0.3 + i * w * 0.1, 0, x - w * 0.34 + i * w * 0.11, 120, x - w * 0.36 + i * w * 0.12, VH], 0.6, 'rgba(16,12,10,.35)'); };
  trunk(110, 90); trunk(540, 110); trunk(330, 50);
  // 단과 집
  const deck = (x, y, w) => { poly(ctx, [x - w / 2, y, x + w / 2, y, x + w / 2 - 8, y + 8, x - w / 2 + 8, y + 8], t('#5a4a34')); stroke(ctx, [x - w / 2, y - 14, x + w / 2, y - 14], 1, t('#3a2e22')); for (let i = 0; i <= 6; i++) stroke(ctx, [x - w / 2 + (w * i) / 6, y, x - w / 2 + (w * i) / 6, y - 14], 0.8, t('#3a2e22')); };
  const pod = (x, y, w, h) => { ctx.fillStyle = t('#6a5c40'); ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h * 1.2); ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y); ctx.fill(); arch(ctx, x - 5, y, 10, h * 0.6, '#ffca80'); glow(v, x, y - h * 0.3, 22, '#ffb060', 0.2); };
  deck(110, 110, 170); pod(80, 110, 44, 40); deck(540, 150, 190); pod(590, 150, 50, 44); pod(500, 150, 36, 34); deck(330, 70, 100); pod(330, 70, 34, 30);
  // 줄다리
  for (const [x0, y0, x1, y1] of [[195, 112, 445, 152], [160, 108, 285, 72], [375, 72, 470, 148]]) { const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + 16; bend(ctx, [x0, y0, mx, my, x1, y1], 2, t('#4a3a28')); bend(ctx, [x0, y0 - 14, mx, my - 14, x1, y1 - 14], 0.8, t('#3a2e22')); for (let i = 1; i < 10; i++) { const k = i / 10, bx = (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * mx + k * k * x1, by = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * my + k * k * y1; stroke(ctx, [bx, by, bx, by - 14], 0.5, t('#3a2e22')); } }
  for (const [x, y] of [[150, 96], [250, 128], [400, 140], [480, 100], [300, 56]]) lamp(v, x, y, 0.2);
  elf(v, 300, 141, 40, { cloth: '#4a5a44', hair: '#c8c0a0', f: 1, long: true, noShadow: true }); elf(v, 350, 146, 38, { cloth: '#5a5a48', hair: '#8a7a50', f: -1, female: true, long: true, noShadow: true });
  // 앞쪽 단의 나
  poly(ctx, [0, 240, 0, 214, 250, 206, 290, 214, 300, 240], t('#4e4030')); stroke(ctx, [0, 190, 250, 182], 1.2, t('#2e241a')); for (let i = 0; i < 6; i++) stroke(ctx, [10 + i * 48, 190 - i * 1.6, 10 + i * 48, 214 - i * 1.6], 1, t('#2e241a'));
  elf(v, 80, 236, 96, { cloth: '#4a5a44', hair: '#d8d0b0', f: 1, old: true, long: true, arm: 'fwd', rim: WARM, rimDir: 1 }); person(v, 180, 238, 100, mine(v, { f: -1, rim: WARM, rimDir: -1 }));
  finish(v, {});
}
/** 드워프 산 아래 도시: 큰 굴 안에 층층이 깎은 집과 기둥, 구렁 위 돌다리, 화덕 불빛 */
function ldUnder(v) {
  const { ctx } = v; rect(ctx, 0, 0, VW, VH, '#1c1a1c');
  ctx.fillStyle = '#131114'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(VW, 0); ctx.lineTo(VW, 30); ctx.quadraticCurveTo(480, 4, 320, 26); ctx.quadraticCurveTo(160, 50, 0, 20); ctx.fill();
  // 뒤쪽 층층의 벽면
  for (let r = 0; r < 4; r++) { const y = 50 + r * 34, x0 = 120 - r * 24, x1 = 520 + r * 24; rect(ctx, x0, y, x1 - x0, 34, ['#3a3634', '#34302e', '#2e2a2a', '#282426'][r]); rect(ctx, x0 - 4, y + 30, x1 - x0 + 8, 4, '#4a4440'); for (let i = 0; i < 12 + r * 2; i++) { const x = x0 + 12 + i * ((x1 - x0 - 24) / (11 + r * 2)), on = hash(i, r + 3) < 0.6; arch(ctx, x - 3, y + 28, 6, 14, on ? '#ffb868' : '#161416'); if (on) glow(v, x, y + 20, 10, '#ff9a48', 0.2); } }
  for (const x of [70, 230, 410, 570]) { rect(ctx, x - 14, 0, 28, 190, '#2a2628'); rect(ctx, x + 2, 0, 12, 190, '#201c1e'); rect(ctx, x - 18, 176, 36, 14, '#343032'); for (let i = 0; i < 4; i++) stroke(ctx, [x - 10, 40 + i * 36, x - 4, 34 + i * 36, x + 2, 40 + i * 36, x + 8, 34 + i * 36], 1, 'rgba(120,108,90,.4)'); }
  // 구렁과 다리
  rect(ctx, 0, 186, VW, 54, '#0e0c0e'); glow(v, 320, 240, 220, '#ff6a2a', 0.16, 40); poly(ctx, [0, 196, 640, 196, 640, 212, 0, 212], '#3e3a38'); for (let i = 0; i < 5; i++) { ctx.fillStyle = '#0e0c0e'; ctx.beginPath(); ctx.arc(64 + i * 128, 226, 44, Math.PI, 0); ctx.fill(); } rect(ctx, 0, 190, VW, 6, '#4a4542'); for (let i = 0; i < 17; i++) rect(ctx, i * 40, 180, 4, 10, '#4a4542');
  // 큰 화덕
  rect(ctx, 290, 150, 60, 36, '#221e1e'); arch(ctx, 302, 186, 36, 30, '#ff9a48'); glow(v, 320, 170, 80, '#ff8a3a', 0.22); smoke(v, 320, 140, 60, 16, '#3a3634', 0.2);
  for (let i = 0; i < 4; i++) dwarf(v, [150, 250, 440, 520][i], 196, 64, { raw: true, cloth: ['#5a3a2a', '#3a3e4a', '#4a4038', '#5a4a3a'][i], hair: ['#8a4a2a', '#b8b4ac', '#3a2a1e', '#6a4a2a'][i], f: i < 2 ? 1 : -1, rim: FIRE, rimDir: i < 2 ? 1 : -1, noShadow: true });
  person(v, 356, 198, 86, mine(v, { raw: true, f: -1, cloak: true, rim: FIRE, rimDir: -1, noShadow: true }));
  finish(v, { inside: true, noLeaves: true });
}
/** 수인 초원의 계절 야영지: 너른 풀밭에 가죽 덮은 낮은 집들, 씨족 돌, 말리는 고기와 가축 */
function ldCamp(v) {
  const { ctx, t } = v; sky(v); far(v, {}); const g = (x) => 150 + Math.sin(x / 120) * 5; ground(v, g, { color: '#8a8a56', color2: '#5e5e3c', tufts: 70 });
  for (const [x, y, w, h] of [[120, 164, 110, 30], [300, 158, 90, 24], [470, 166, 130, 34], [590, 160, 70, 20]]) hideHall(v, x, y, w, h, ['#7a6448', '#6e5a44', '#806a4c', '#6a5640'][Math.floor(x / 160) % 4]);
  clanStone(v, 380, 184, 50); smoke(v, 300, 132, 60, 12, '#8a8478', 0.22); smoke(v, 470, 130, 70, 14, '#8a8478', 0.2);
  // 말리는 틀
  stroke(ctx, [200, 196, 200, 160], 1.6, t('#3a2c20')); stroke(ctx, [270, 198, 270, 162], 1.6, t('#3a2c20')); stroke(ctx, [196, 164, 274, 166], 1.2, t('#3a2c20')); for (let i = 0; i < 6; i++) rect(ctx, 206 + i * 11, 166, 4, 10 + (i % 3) * 3, t('#7a3e30'));
  for (let i = 0; i < 7; i++) { const x = 420 + hash(i, 6) * 200, y = 150 + hash(i, 7) * 8; oval(ctx, x, y - 4, 6, 3.4, t('#4a3a2c')); rect(ctx, x - 4, y - 3, 1.2, 5, t('#3a2c22')); rect(ctx, x + 3, y - 3, 1.2, 5, t('#3a2c22')); }
  beastman(v, 240, 214, 84, 'wolf', { cloth: '#5a4a3a', hair: '#6a6660', f: 1, arm: 'fwd' }); beastman(v, 520, 220, 88, 'tiger', { cloth: '#6a4a30', hair: '#b8742e', f: -1 }); beastman(v, 430, 206, 50, 'hawk', { cloth: '#5a5040', hair: '#3a2e24', f: -1, child: true });
  person(v, 320, 236, 104, mine(v, { f: -1 }));
  finish(v, { noLeaves: true });
}
/** 발하르트 군항: 잿빛 바다에 줄지은 군선과 깃발, 부두를 걷는 창병 줄, 성벽 포대 */
function ldWarport(v) {
  const { ctx, t } = v; sky(v); far(v, {}); water(v, 126, '#4e5a66', 7);
  // 방파제와 탑
  poly(ctx, [0, 126, 200, 118, 210, 126], t('#4a4a50')); rect(ctx, 150, 86, 26, 36, t('#4a4a50')); for (let i = 0; i < 4; i++) rect(ctx, 148 + i * 8, 80, 5, 7, t('#4a4a50')); banner(v, 163, 80, 30, '#6e1c22', { mark: '#1c1614', d: 1 });
  for (let i = 0; i < 4; i++) { const x = 250 + i * 104, y = 148 + i * 5, w = 80 + i * 8; hull(v, x, y, w, '#26221e', 54 + i * 5); rect(ctx, x - w * 0.36, y - w * 0.16, w * 0.72, 3, t('#6e1c22')); poly(ctx, [x + 1, y - w * 0.12 - 54 - i * 5, x + 16, y - w * 0.12 - 50 - i * 5, x + 1, y - w * 0.12 - 46 - i * 5], t('#6e1c22')); stroke(ctx, [x - w / 2, y + 2, x + w / 2, y + 2], 2, 'rgba(20,24,30,.3)'); }
  // 부두
  poly(ctx, [0, 240, 0, 184, 640, 196, 640, 240], t('#56524e')); for (let i = 0; i < 9; i++) { rect(ctx, 20 + i * 76, 178 + i * 1.4, 8, 12, t('#2e2a26')); } for (let i = 0; i < 30; i++) stroke(ctx, [hash(i, 8) * VW, 196 + hash(i, 9) * 40, hash(i, 8) * VW + 20, 196 + hash(i, 9) * 40], 0.6, 'rgba(20,18,16,.25)');
  // 기중기
  stroke(ctx, [70, 190, 70, 96], 3, t('#2e261e')); stroke(ctx, [70, 100, 130, 80], 2.4, t('#2e261e')); stroke(ctx, [70, 130, 108, 88], 1.4, t('#2e261e')); stroke(ctx, [128, 80, 128, 150], 0.7, t('#1c1814')); rect(ctx, 118, 150, 20, 14, t('#5a4630'));
  for (let i = 0; i < 6; i++) { const x = 300 + i * 30, y = 212 + i * 2; person(v, x, y, 70, { cloth: '#3a3e44', hair: '#1c1614', hat: true, f: -1, noShadow: i > 0 }); spear(v, x + 8, y, 84, 0.04); }
  person(v, 246, 222, 82, { cloth: '#6e1c22', hair: '#3a2a1e', cloak: true, f: 1, arm: 'out' }); for (const x of [30, 52, 44]) { oval(ctx, x, 222 - (x === 44 ? 12 : 0), 9, 7, t('#4a3a2a')); ring(ctx, x, 222 - (x === 44 ? 12 : 0), 9, 7, 0.8, t('#2a2018')); }
  person(v, 150, 236, 102, mine(v, { f: 1 }));
  finish(v, { noLeaves: true });
}
/** 광산 도시: 산비탈에 층층이 붙은 집과 굴대 바퀴 탑, 버럭 더미, 연기. 일 끝낸 광부들 */
function ldMinetown(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true });
  poly(ctx, [0, 240, 0, 110, 120, 80, 260, 60, 400, 96, 520, 130, 640, 150, 640, 240], t('#5a5248')); poly(ctx, [0, 240, 0, 170, 200, 150, 420, 170, 640, 190, 640, 240], t('#4a443c'));
  // 층층의 집
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5 - r; i++) { const x = 40 + i * 62 + r * 30, y = 150 - r * 28; cottage(v, x, y, 44, 24, { roof: '#3a3430', wall: '#7a7060' }); if ((i + r) % 2) { rect(ctx, x - 4, y - 14, 6, 8, '#ffc070'); glow(v, x - 1, y - 10, 10, '#ffa850', 0.2); } }
  // 굴대 탑과 바퀴
  const hx = 450, hy = 170; stroke(ctx, [hx - 30, hy, hx - 8, hy - 86], 3, t('#2a2420')); stroke(ctx, [hx + 30, hy, hx + 8, hy - 86], 3, t('#2a2420')); stroke(ctx, [hx - 24, hy - 30, hx + 24, hy - 30], 2, t('#2a2420')); stroke(ctx, [hx - 16, hy - 60, hx + 16, hy - 60], 2, t('#2a2420')); stroke(ctx, [hx - 22, hy - 30, hx + 14, hy - 60], 1.2, t('#2a2420')); ring(ctx, hx, hy - 92, 14, 14, 2, t('#2a2420')); for (let i = 0; i < 6; i++) stroke(ctx, [hx, hy - 92, hx + Math.cos(i * 1.05) * 14, hy - 92 + Math.sin(i * 1.05) * 14], 0.8, t('#2a2420')); stroke(ctx, [hx + 14, hy - 92, hx + 70, hy - 20], 0.8, t('#1c1814')); rect(ctx, hx + 56, hy - 24, 40, 24, t('#3a342e')); arch(ctx, hx - 12, hy, 24, 26, '#0e0c0c');
  // 버럭 더미와 굴뚝
  poly(ctx, [520, 190, 570, 140, 600, 150, 640, 180, 640, 200], t('#3a3632')); rect(ctx, 330, 96, 10, 60, t('#4a3e36')); smoke(v, 335, 96, 80, 22, '#4a4642', 0.34); rect(ctx, 300, 140, 60, 26, t('#5a4c40'));
  // 수레 길
  bend(ctx, [450, 172, 380, 196, 200, 240], 9, t('#6a6052')); for (let i = 0; i < 8; i++) stroke(ctx, [440 - i * 30, 176 + i * 7, 452 - i * 30, 180 + i * 8], 1, 'rgba(30,26,22,.4)');
  for (let i = 0; i < 4; i++) { const x = 400 - i * 46, y = 200 + i * 9, h = 60 + i * 9; person(v, x, y, h, { cloth: ['#4a4440', '#3e3a36', '#544a40', '#44403a'][i], hair: HR[i], hat: i % 2 === 0, f: -1, skin: '#a08a78' }); stroke(ctx, [x + 6, y - h * 0.5, x + 10, y - h * 1.02], 1.4, '#2a2018'); bend(ctx, [x + 2, y - h * 0.98, x + 10, y - h * 1.08, x + 18, y - h * 0.98], 1.6, '#3a3a40'); }
  lamp(v, 400 - 12, 200 - 30, 0.2); person(v, 520, 236, 102, mine(v, { f: -1 }));
  finish(v, { noLeaves: true });
}
/** 자유도시 운하 도시: 좁고 높은 집 사이 물길, 둥근 돌다리, 짐배와 흥정하는 상인들 */
function ldCanal(v) {
  const { ctx, t } = v; sky(v);
  rowHouse(v, 250, 50, 70, 150, '#6a6258', {}); rowHouse(v, 300, 46, 60, 150, '#7a6a58', { step: true }); rowHouse(v, 346, 48, 76, 150, '#62605a', {});
  rowHouse(v, 0, 70, 30, 176, '#8a6a54', { step: true, lit: true }); rowHouse(v, 70, 62, 48, 172, '#6e6a5c', { lit: true }); rowHouse(v, 132, 66, 38, 168, '#806e54', { step: true }); rowHouse(v, 198, 54, 56, 164, '#6a5e52', {});
  rowHouse(v, 388, 56, 54, 164, '#7a6650', {}); rowHouse(v, 444, 64, 40, 168, '#686458', { step: true, lit: true }); rowHouse(v, 508, 62, 50, 172, '#84705a', {}); rowHouse(v, 570, 70, 28, 176, '#6c6458', { step: true, lit: true });
  // 물길
  poly(ctx, [250, 150, 390, 150, 560, 240, 80, 240], t('#4e6068')); for (let i = 0; i < 20; i++) { const y = 156 + hash(i, 4) * 80, k = (y - 150) / 90, x = 250 - k * 170 + hash(i, 5) * (140 + k * 340); stroke(ctx, [x, y, x + 10 + k * 20, y], 0.8, 'rgba(220,230,236,.26)'); }
  poly(ctx, [0, 240, 0, 176, 250, 150, 80, 240], t('#6a665e')); poly(ctx, [640, 240, 640, 176, 390, 150, 560, 240], t('#625e58'));
  // 돌다리
  ctx.fillStyle = t('#7a746a'); ctx.beginPath(); ctx.moveTo(236, 152); ctx.quadraticCurveTo(320, 118, 404, 152); ctx.lineTo(404, 160); ctx.quadraticCurveTo(320, 134, 236, 160); ctx.fill(); bend(ctx, [236, 148, 320, 114, 404, 148], 1.6, t('#4a463e'));
  for (let i = 0; i < 3; i++) person(v, 296 + i * 22, 136 - (i === 1 ? 4 : 0), 22, folk(i, { f: i ? -1 : 1, noShadow: true }));
  // 짐배
  hull(v, 330, 214, 130, '#3a2e22'); for (let i = 0; i < 4; i++) { rect(ctx, 286 + i * 22, 188 - (i % 2) * 4, 18, 12 + (i % 2) * 4, t(['#8a6a40', '#6a5a44', '#9a7a4a', '#5a4a3a'][i])); } person(v, 392, 200, 56, folk(2, { f: -1, stick: 'staff', hat: true, noShadow: true }));
  // 물가의 흥정
  person(v, 96, 228, 96, { cloth: '#5a2e3a', hair: '#3a2a1e', hat: true, f: 1, arm: 'out', cloak: true }); person(v, 170, 236, 102, mine(v, { f: -1, arm: 'chest' })); rect(ctx, 20, 206, 36, 22, t('#5a4630')); rect(ctx, 28, 190, 30, 16, t('#6a5236'));
  for (const x of [470, 600]) { stroke(ctx, [x, 210, x, 160], 1.6, '#2a2018'); lamp(v, x, 160, 0.14); }
  finish(v, { noLeaves: true });
}

export const LANDS23 = { pilgrim: ldPilgrim, academy: ldAcademy, lake: ldLake, canopy: ldCanopy, under: ldUnder, camp: ldCamp, warport: ldWarport, minetown: ldMinetown, canal: ldCanal };

// ───────── 나라마다 다른 궁정 ─────────
const steps = (ctx, cx, y, w, n, c) => { for (let i = 0; i < n; i++) rect(ctx, cx - w / 2 - (n - i) * 12, y - (i + 1) * 7, w + (n - i) * 24, 7, dark(c, i % 2 ? 0.08 : 0)); };
/** 발하르트 황가: 검은 쇠 옥좌와 붉은 깃발, 양쪽에 늘어선 장군들. 긴 융단 끝에 무릎 꿇은 나 */
function crEmperor(v) {
  const { ctx } = v; room(v, { wall: '#3a3638', floor: '#242022', fy: 180, stone: true });
  for (const x of [60, 170, 470, 580]) { rect(ctx, x - 12, 0, 24, 182, '#2a2628'); banner(v, x + 30, 150, 130, '#6e1c22', { raw: true, mark: '#1c1614', d: x < 320 ? 1 : -1 }); }
  windowAt(v, 300, 14, 40, 70, { arch: true }); shaft(v, 320, 84, 50, 110, 0, '#c8c0c8', 0.1);
  steps(ctx, 320, 180, 110, 4, '#3e3a3c');
  // 옥좌: 높은 등받이에 창날 살
  rect(ctx, 292, 76, 56, 78, '#1a1819'); for (let i = 0; i < 5; i++) poly(ctx, [294 + i * 11, 78, 299.5 + i * 11, 58 - (2 - Math.abs(2 - i)) * 9, 305 + i * 11, 78], '#1a1819'); rect(ctx, 284, 124, 72, 30, '#221f20');
  person(v, 320, 156, 96, { raw: true, f: 0, pose: 'sit', cloth: '#1c1a1c', hair: '#b8b4ac', old: true, cloak: true, rim: COLD, rimDir: 1 });
  // 융단
  poly(ctx, [296, 180, 344, 180, 400, 240, 240, 240], '#5a1a20'); stroke(ctx, [300, 182, 250, 240], 1, '#8a6a30'); stroke(ctx, [340, 182, 390, 240], 1, '#8a6a30');
  for (let i = 0; i < 4; i++) for (const k of [-1, 1]) { const x = 320 + k * (86 + i * 48), y = 198 + i * 11, h = 84 + i * 8; person(v, x, y, h, { raw: true, f: -k, cloth: ['#2e2a2c', '#3a3034', '#2a2e34', '#342a2a'][i], hair: HR[(i + (k > 0 ? 2 : 0)) % 6], cloak: true, old: i === 0, rim: COLD, rimDir: -k }); if (i % 2) blade(v, x - k * 6, y - h * 0.3, -k, -1.4, h * 0.3, { color: '#8a8e96' }); }
  brazier(v, 232, 184, 0.9, 0.14); brazier(v, 408, 184, 0.9, 0.14);
  person(v, 320, 234, 100, mine(v, { raw: true, f: 0, pose: 'kneel', noShadow: true }));
  finish(v, { inside: true, noLeaves: true });
}
/** 성국 교황청: 큰 해 무늬 창 아래 흰 옷의 높은 자리, 붉은 띠 두른 사제들의 반원, 향 연기 */
function crCuria(v) {
  const { ctx } = v; room(v, { wall: '#8a8272', floor: '#5a5448', fy: 178 });
  ring(ctx, 320, 62, 44, 44, 5, '#4a4438'); oval(ctx, 320, 62, 42, 42, '#e8d48a'); for (let i = 0; i < 12; i++) stroke(ctx, [320, 62, 320 + Math.cos(i * TAU / 12) * 42, 62 + Math.sin(i * TAU / 12) * 42], 1.4, '#4a4438'); oval(ctx, 320, 62, 12, 12, '#fff0b8'); glow(v, 320, 62, 110, '#ffe090', 0.2); shaft(v, 320, 100, 80, 130, 0, '#fff0c0', 0.14);
  for (const x of [90, 190, 450, 550]) { rect(ctx, x - 11, 0, 22, 180, '#a09884'); rect(ctx, x - 15, 0, 30, 10, '#b8b09a'); rect(ctx, x - 15, 168, 30, 12, '#b8b09a'); }
  steps(ctx, 320, 178, 100, 3, '#a8a08c'); rect(ctx, 292, 100, 56, 58, '#8a7448'); poly(ctx, [292, 100, 320, 78, 348, 100], '#8a7448'); rect(ctx, 298, 106, 44, 52, '#6e2a30');
  person(v, 320, 160, 92, { raw: true, f: 0, pose: 'sit', cloth: '#ece6d6', hair: '#d8d4cc', old: true, robe: true, hat: true }); stroke(ctx, [350, 160, 350, 78], 1.6, '#c8a850'); sunSign(v, 350, 74, 5, '#e8c860');
  for (let i = 0; i < 8; i++) { const k = i < 4 ? -1 : 1, j = i % 4, x = 320 + k * (80 + j * 54), y = 196 + j * 10, h = 80 + j * 8; person(v, x, y, h, robed(i, '#e0d8c6', { raw: true, f: -k, arm: 'chest', hood: j === 3 })); rect(ctx, x - h * 0.13, y - h * 0.52, h * 0.26, h * 0.05, '#8a2a2e'); }
  // 향로
  for (const x of [262, 378]) { stroke(ctx, [x, 196, x, 176], 1.4, '#6a5a3a'); oval(ctx, x, 174, 5, 3.4, '#8a7440'); smoke(v, x, 170, 70, 10, '#e8e0d0', 0.2); }
  person(v, 320, 236, 100, mine(v, { raw: true, f: 0, pose: 'kneel', noShadow: true }));
  finish(v, { inside: true, noLeaves: true });
}
/** 세레니아 마탑 의회: 둥근 방의 고리 탁자, 한가운데 뜬 푸른 구슬, 별자리 바닥과 책 벽 */
function crTower(v) {
  const { ctx } = v; room(v, { wall: '#2e3040', floor: '#1e2030', fy: 150, stone: true });
  for (const x of [20, 150, 420, 550]) shelf(ctx, x, 30, 70, 5, x); for (const x of [250, 330]) windowAt(v, x, 26, 30, 80, { arch: true });
  // 바닥의 별자리 고리
  ring(ctx, 320, 200, 250, 44, 1, 'rgba(150,190,255,.3)'); for (let i = 0; i < 12; i++) { const a = i * TAU / 12, x = 320 + Math.cos(a) * 250, y = 200 + Math.sin(a) * 44; oval(ctx, x, y, 1.8, 1.2, 'rgba(190,220,255,.7)'); if (i % 3 === 0) stroke(ctx, [x, y, 320 + Math.cos(a + 1.6) * 250, 200 + Math.sin(a + 1.6) * 44], 0.5, 'rgba(150,190,255,.22)'); }
  // 뒤쪽 의원들
  for (let i = 0; i < 6; i++) { const a = Math.PI + ((i + 0.5) / 6) * Math.PI, x = 320 + Math.cos(a) * 200, y = 196 + Math.sin(a) * 30; person(v, x, y, 80, robed(i, ['#2e3e6e', '#44305a', '#2e4a5a', '#3a3a5e', '#5a3044', '#2e3e6e'][i], { raw: true, f: x < 320 ? 1 : -1, pose: 'sit', arm: i % 2 ? 'fwd' : 'chest', hat: i % 3 === 0, rim: BLUE, rimDir: x < 320 ? 1 : -1, noShadow: true })); }
  // 고리 탁자
  ring(ctx, 320, 196, 170, 26, 12, '#3e3040'); ring(ctx, 320, 192, 170, 26, 3, '#5e4a5a'); rect(ctx, 148, 200, 8, 26, '#2a2030'); rect(ctx, 484, 200, 8, 26, '#2a2030');
  // 구슬
  oval(ctx, 320, 120, 16, 16, '#9ad0ff'); oval(ctx, 315, 115, 5, 5, '#e8f4ff'); glow(v, 320, 120, 100, '#70b0ff', 0.24); glow(v, 320, 196, 150, '#70b0ff', 0.1, 30); ring(ctx, 320, 120, 26, 7, 0.8, 'rgba(190,220,255,.6)', 0.4); ring(ctx, 320, 120, 30, 9, 0.6, 'rgba(190,220,255,.4)', -0.5);
  // 앞쪽 등 돌린 의원과 나
  for (const [x, i] of [[200, 1], [440, 2]]) person(v, x, 240, 96, robed(i, '#262a44', { raw: true, f: x < 320 ? 1 : -1, pose: 'sit', rim: BLUE, rimDir: x < 320 ? 1 : -1, noShadow: true }));
  person(v, 320, 240, 104, mine(v, { raw: true, f: 0, arm: 'chest', rim: BLUE, rimDir: 1, noShadow: true }));
  finish(v, { inside: true, noLeaves: true });
}
/** 자유도시 상인 평의회: 돛대 보이는 큰 창 아래 긴 탁자, 저울과 장부와 궤. 손 들어 표를 던지는 사람들 */
function crMerchant(v) {
  const { ctx } = v; room(v, { wall: '#6a5a46', floor: '#3e3226', fy: 176 });
  rect(ctx, 200, 20, 240, 100, '#9ab4c8'); for (let i = 0; i < 5; i++) { const x = 220 + i * 46; rect(ctx, x, 40 + (i % 2) * 14, 1.6, 80, '#2e2a26'); stroke(ctx, [x - 12, 58 + (i % 2) * 14, x + 12, 58 + (i % 2) * 14], 1, '#2e2a26'); } rect(ctx, 200, 104, 240, 16, '#5a7080'); for (let i = 0; i <= 4; i++) rect(ctx, 198 + i * 60, 20, 4, 100, '#3a2c20'); rect(ctx, 196, 16, 248, 6, '#3a2c20'); rect(ctx, 196, 118, 248, 6, '#3a2c20'); shaft(v, 320, 122, 220, 100, 0, '#e8f0f8', 0.08);
  for (const [x, c] of [[80, '#2e4a6e'], [140, '#8a6a30'], [500, '#3e5a3a'], [560, '#6e2a30']]) banner(v, x, 150, 100, c, { raw: true, mark: '#d8d0b8', d: x < 320 ? 1 : -1 });
  for (let i = 0; i < 6; i++) { const x = 130 + i * 76, up = i === 2; person(v, x, 204, 96, { raw: true, f: x < 320 ? 1 : -1, pose: 'sit', cloth: ['#5a2e3a', '#2e4a5a', '#5a4a2a', '#3a3a4a', '#4a2e2a', '#2e4a3a'][i], hair: HR[i], hat: i % 2 === 0, old: i % 3 === 0, arm: up ? 'up' : i === 1 || i === 4 ? 'fwd' : 'chest' }); }
  table(ctx, 90, 550, 196, '#4a3626', 8, 34);
  // 저울, 장부, 돈궤
  stroke(ctx, [320, 196, 320, 170], 1.6, '#c8a850'); stroke(ctx, [300, 174, 340, 170], 1.4, '#c8a850'); for (const [x, y] of [[300, 174], [340, 170]]) { stroke(ctx, [x, y, x - 6, y + 12], 0.5, '#c8a850'); stroke(ctx, [x, y, x + 6, y + 12], 0.5, '#c8a850'); bend(ctx, [x - 7, y + 12, x, y + 17, x + 7, y + 12], 1.4, '#c8a850'); }
  for (const x of [180, 250, 400, 470]) { rect(ctx, x, 190, 22, 5, '#e8e0c8'); rect(ctx, x + 10, 190, 1, 5, '#8a7a60'); } rect(ctx, 510, 182, 28, 14, '#5a4028'); rect(ctx, 510, 182, 28, 3, '#8a7440'); for (let i = 0; i < 5; i++) oval(ctx, 120 + i * 5, 194 - (i % 2), 3, 1.2, '#e8c860');
  person(v, 60, 238, 100, { raw: true, f: 1, cloth: '#3a3028', hair: '#2a1e16', arm: 'chest' }); rect(ctx, 64, 170, 12, 15, '#e8e0c8');
  person(v, 580, 238, 104, mine(v, { raw: true, f: -1, rim: COLD, rimDir: -1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 엘프 장로회: 새벽 숲의 빈터, 큰 나무 뿌리 사이 돌 자리에 둘러앉은 장로들. 한가운데 맑은 샘 */
function crElders(v) {
  const { ctx, t } = v; sky(v); rect(ctx, 0, 0, VW, 164, rgba(t('#2e4434'), 0.6));
  for (let i = 0; i < 11; i++) { const x = i * 62 + hash(i, 3) * 20; rect(ctx, x, 0, 8 + hash(i, 4) * 12, 170, rgba(t('#1e2e24'), 0.55)); }
  lit(ctx, () => { for (const x of [240, 330, 420]) poly(ctx, [x, 0, x + 50, 0, x + 10, 220, x - 90, 220], 'rgba(230,236,180,.07)'); });
  ground(v, () => 160, { color: '#4a5e3e', color2: '#2e3c2a', tufts: 40 });
  // 큰 나무
  poly(ctx, [276, 180, 292, 0, 348, 0, 364, 180], t('#3a2e24')); poly(ctx, [326, 180, 330, 0, 348, 0, 364, 180], t('#2a2019')); for (const [k, c] of [[-1, '#3a2e24'], [1, '#2a2019']]) { bend(ctx, [320 + k * 34, 150, 320 + k * 50, 178, 320 + k * 96, 186], 12, t(c)); bend(ctx, [320 + k * 20, 160, 320 + k * 30, 186, 320 + k * 56, 194], 9, t(c)); }
  // 샘
  oval(ctx, 320, 214, 60, 10, t('#8ab4c0')); oval(ctx, 320, 213, 44, 6, 'rgba(230,240,240,.4)'); glow(v, 320, 210, 70, '#c8e8e0', 0.14, 20);
  for (let i = 0; i < 6; i++) { const k = i < 3 ? -1 : 1, j = i % 3, x = 320 + k * (110 + j * 66), y = 200 + j * 12; oval(ctx, x, y + 2, 20, 6, t('#6a6a60')); rect(ctx, x - 16, y - 12, 32, 14, t('#7a7a6e')); elf(v, x, y - 6, 84 + j * 6, { cloth: ['#c8c8b0', '#8a9a80', '#a8a890'][j], hair: ['#e0dcc8', '#c8c0a0', '#d8d8d0'][j], f: -k, pose: 'sit', old: true, long: true, robe: true, female: i % 2 === 1, stick: j === 0 ? 'staff' : null, noShadow: true }); }
  elf(v, 250, 238, 96, { cloth: '#4a5a44', hair: '#c8c0a0', f: 1, long: true, arm: 'out' }); person(v, 390, 238, 100, mine(v, { f: -1 }));
  finish(v, {});
}
/** 드워프 씨족 회의: 돌 방 한가운데 큰 화덕, 씨족 방패가 걸린 돌 의자들. 망치를 짚고 선 말하는 이 */
function crClans(v) {
  const { ctx } = v; room(v, { wall: '#3e3a36', floor: '#262220', fy: 176, stone: true });
  for (const x of [50, 590]) { rect(ctx, x - 16, 0, 32, 180, '#2e2a28'); for (let i = 0; i < 5; i++) stroke(ctx, [x - 10, 30 + i * 30, x - 3, 22 + i * 30, x + 3, 30 + i * 30, x + 10, 22 + i * 30], 1.2, 'rgba(150,130,100,.45)'); }
  // 벽의 방패 일곱
  for (let i = 0; i < 7; i++) { const x = 110 + i * 70, c = ['#6e2a22', '#2e4a5a', '#8a6a30', '#3e5a3a', '#5a3a5a', '#7a4a22', '#3a3e44'][i]; oval(ctx, x, 60, 16, 18, '#1c1816'); oval(ctx, x, 60, 13, 15, c); oval(ctx, x, 60, 4, 4, '#b8a070'); stroke(ctx, [x - 13, 60, x + 13, 60], 1, 'rgba(20,16,12,.5)'); }
  // 화덕
  poly(ctx, [270, 214, 370, 214, 358, 192, 282, 192], '#34302e'); rect(ctx, 282, 186, 76, 6, '#4a4440'); flame(v, 308, 188, 8); flame(v, 332, 188, 9); glow(v, 320, 170, 200, '#ff8a3a', 0.12);
  for (let i = 0; i < 6; i++) { const k = i < 3 ? -1 : 1, j = i % 3, x = 320 + k * (96 + j * 62), y = 200 + j * 12; rect(ctx, x - 16, y - 50, 32, 52, '#4a4440'); rect(ctx, x - 20, y - 54, 40, 6, '#5a544e'); dwarf(v, x, y, 74 + j * 6, { raw: true, f: -k, pose: 'sit', cloth: ['#5a3a2a', '#3a3e4a', '#4a4038'][j], hair: ['#b8b4ac', '#8a4a2a', '#3a2a1e', '#d8d4cc', '#6a4a2a', '#8a8680'][i], rim: FIRE, rimDir: -k, noShadow: true }); }
  dwarf(v, 250, 238, 92, { raw: true, f: 1, cloth: '#6e2a22', hair: '#b8742e', arm: 'fwd', rim: FIRE, rimDir: 1 }); { const [hx, hy] = handOf(250, 238, 92 * 0.74, 1); stroke(ctx, [hx + 4, hy + 2, hx + 4, 236], 2.4, '#3a2c20'); rect(ctx, hx - 5, hy - 8, 18, 10, '#6a6a70'); }
  person(v, 420, 240, 104, mine(v, { raw: true, f: -1, rim: FIRE, rimDir: -1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 수인 부족 연합: 밤 초원의 큰 불, 세 부족이 저마다 씨족 돌을 등지고 둘러섰다. 가운데 말하는 이 */
function crTribes(v) {
  const { ctx, t } = v; sky(v); far(v, {}); ground(v, () => 150, { color: '#4a4c38', color2: '#2a2c22', tufts: 40 });
  for (const [x, h] of [[90, 60], [320, 46], [550, 60]]) clanStone(v, x, x === 320 ? 164 : 190, h);
  // 큰 불
  for (let i = 0; i < 5; i++) stroke(ctx, [296 + i * 12, 214, 320 + (i - 2) * 4, 190], 3, '#2a1c14'); flame(v, 312, 196, 9); flame(v, 328, 194, 10); glow(v, 320, 180, 220, '#ff8a3a', 0.14); smoke(v, 320, 170, 120, 26, '#3a3430', 0.24);
  for (let i = 0; i < 4; i++) beastman(v, 60 + i * 38, 200 + (i % 2) * 14, 78 + (i % 2) * 10, 'wolf', { cloth: ['#4a4038', '#3a3e44', '#54463a', '#3e3a36'][i], hair: ['#6a6660', '#3a3632', '#8a8680', '#4a4640'][i], f: 1, cloak: i % 2 === 0, rim: FIRE, rimDir: 1, stick: i === 0 ? 'spear' : null });
  for (let i = 0; i < 4; i++) beastman(v, 470 + i * 38, 200 + ((i + 1) % 2) * 14, 82 + ((i + 1) % 2) * 10, 'tiger', { cloth: ['#6a4a30', '#5a3a2a', '#4a4038', '#6e4a2a'][i], hair: ['#b8742e', '#c88a3a', '#a8642a', '#b8742e'][i], f: -1, rim: FIRE, rimDir: -1, stick: i === 3 ? 'spear' : null });
  for (let i = 0; i < 4; i++) beastman(v, [236, 270, 372, 404][i], 178, 52, 'hawk', { cloth: '#5a5040', hair: '#3a2e24', f: i < 2 ? 1 : -1, cloak: true, noShadow: true, rim: FIRE, rimDir: 0 });
  beastman(v, 238, 232, 100, 'wolf', { cloth: '#3a3e44', hair: '#b8b4ac', f: 1, old: true, arm: 'up', cloak: true, rim: FIRE, rimDir: 1 });
  person(v, 410, 238, 102, mine(v, { f: -1, rim: FIRE, rimDir: -1 }));
  finish(v, { noLeaves: true });
}
/** 정변의 밤: 넘어진 의자와 끌어내려지는 깃발, 횃불 든 병사들이 문으로 밀려든다. 기둥 뒤의 나 */
function crCoup(v) {
  const { ctx } = v; room(v, { wall: '#34303a', floor: '#201c22', fy: 180, stone: true });
  for (const x of [120, 300, 520]) { rect(ctx, x - 12, 0, 24, 182, '#2a2630'); rect(ctx, x - 16, 170, 32, 12, '#34303a'); }
  windowAt(v, 200, 20, 30, 80, { arch: true }); windowAt(v, 410, 20, 30, 80, { arch: true });
  // 열린 큰 문과 밀려드는 불빛
  arch(ctx, 540, 180, 90, 150, '#0e0c10'); glow(v, 585, 130, 150, '#ff8a3a', 0.2); lit(ctx, () => poly(ctx, [540, 180, 630, 180, 520, 240, 300, 240], 'rgba(255,150,70,.1)'));
  for (let i = 0; i < 5; i++) { const x = 560 - i * 34 + (i % 2) * 8, y = 196 + i * 9, h = 78 + i * 6; person(v, x, y, h, { raw: true, f: -1, cloth: '#2a2a30', hair: '#141214', hat: true, arm: i % 2 ? 'up' : 'fwd', rim: FIRE, rimDir: 1 }); if (i % 2) { const [hx, hy] = handOf(x, y, h, -1, 'up'); torch(v, hx, hy + 4, 12, 6); glow(v, hx, hy - 12, 50, '#ff8a3a', 0.16); } else spear(v, x - 10, y, h * 1.14, -0.1); }
  // 끌어내려지는 깃발
  stroke(ctx, [210, 110, 210, 180], 2, '#2a2018'); poly(ctx, [212, 124, 262, 150, 250, 196, 214, 176], '#2e4a6e'); stroke(ctx, [228, 146, 244, 172], 2, '#d8d0b8'); person(v, 276, 214, 86, { raw: true, f: -1, cloth: '#2a2a30', hair: '#141214', hat: true, arm: 'fwd', rim: FIRE, rimDir: 1 });
  // 넘어진 의자와 흩어진 종이
  ctx.save(); ctx.translate(390, 214); ctx.rotate(1.3); rect(ctx, -10, -30, 20, 30, '#4a3626'); rect(ctx, -10, -52, 4, 52, '#3a2a1c'); rect(ctx, 6, -30, 4, 30, '#3a2a1c'); ctx.restore(); for (let i = 0; i < 7; i++) { const x = 330 + hash(i, 5) * 140, y = 200 + hash(i, 6) * 32; poly(ctx, [x, y, x + 10, y - 2, x + 12, y + 4, x + 2, y + 6], '#d8d0b8'); }
  ring(ctx, 420, 226, 9, 3, 1.6, '#c8a850');
  person(v, 80, 238, 104, mine(v, { raw: true, f: 1, cloak: true, hood: true, rim: FIRE, rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 후계 다툼: 빈 옥좌를 사이에 두고 마주 선 두 후계자와 그 뒤의 사람들 */
function crHeir(v) {
  const { ctx } = v; room(v, { wall: '#5a5048', floor: '#342c28', fy: 178 });
  for (const x of [100, 220, 420, 540]) windowAt(v, x - 14, 24, 28, 76, { arch: true }); shaft(v, 320, 90, 60, 120, 0, '#e8e0c8', 0.1);
  steps(ctx, 320, 178, 90, 3, '#5e564c'); rect(ctx, 296, 90, 48, 68, '#4a3426'); poly(ctx, [296, 90, 320, 70, 344, 90], '#4a3426'); rect(ctx, 290, 132, 60, 26, '#5a4030'); rect(ctx, 302, 100, 36, 34, '#6e2a30');
  // 방석 위의 관
  rect(ctx, 306, 126, 28, 6, '#8a2a30'); ring(ctx, 320, 122, 9, 3, 1.8, '#e8c860'); for (let i = 0; i < 4; i++) stroke(ctx, [313 + i * 4.6, 120, 313 + i * 4.6, 115], 1.2, '#e8c860'); glow(v, 320, 120, 30, '#ffe090', 0.2);
  for (const k of [-1, 1]) { const c = k < 0 ? '#2e4a6e' : '#6e2a30'; banner(v, 320 + k * 250, 160, 120, c, { raw: true, mark: '#d8d0b8', d: -k });
    for (let i = 0; i < 4; i++) person(v, 320 + k * (170 + i * 36), 204 + (i % 2) * 12, 84 + (i % 2) * 8, { raw: true, f: -k, cloth: i % 2 ? c : CL[i + (k > 0 ? 2 : 0)], hair: HR[i + (k > 0 ? 3 : 0)], cloak: i % 2 === 0, old: i === 3, female: i === 2, long: i === 2 });
    person(v, 320 + k * 96, 226, 102, { raw: true, f: -k, cloth: c, hair: k < 0 ? '#6a4a2a' : '#1c1614', cloak: true, arm: k < 0 ? 'fwd' : 'chest', female: k > 0, long: k > 0, rim: WARM, rimDir: -k }); }
  person(v, 320, 240, 98, mine(v, { raw: true, f: 0, noShadow: true }));
  finish(v, { inside: true, noLeaves: true });
}
export const CROWNS23 = { emperor: crEmperor, curia: crCuria, tower: crTower, merchant: crMerchant, elders: crElders, clans: crClans, tribes: crTribes, coup: crCoup, heir: crHeir };

// ───────── 미궁 깊게 ─────────
/** 벼랑에 난 미궁의 큰 문 */
function gateMouth(v, cx, base, w, h, o = {}) {
  const { ctx } = v, c = v.t(o.c ?? '#5a564e');
  rect(ctx, cx - w * 0.75, base - h * 1.25, w * 1.5, h * 1.25, c); rect(ctx, cx - w * 0.82, base - h * 1.3, w * 1.64, h * 0.1, v.t('#6a665c'));
  for (const k of [-1, 1]) { rect(ctx, cx + k * w * 0.62 - w * 0.08, base - h * 1.2, w * 0.16, h * 1.2, v.t('#4a463e')); for (let i = 0; i < 4; i++) stroke(ctx, [cx + k * w * 0.62 - w * 0.05, base - h * (0.3 + i * 0.24), cx + k * w * 0.62 + w * 0.05, base - h * (0.36 + i * 0.24)], 1, 'rgba(20,18,16,.4)'); }
  arch(ctx, cx - w / 2, base, w, h, '#0c0a0c'); if (o.glow) glow(v, cx, base - h * 0.4, w * 0.8, o.glow, 0.16);
  for (let i = 0; i < 5; i++) rect(ctx, cx - w * (0.6 + i * 0.09), base + i * 5, w * (1.2 + i * 0.18), 5, v.t(i % 2 ? '#7a766a' : '#6a665c'));
}
const pack = (ctx, x, y, s, c = '#5a4630') => { rect(ctx, x - 4 * s, y - 8 * s, 8 * s, 10 * s, c); rect(ctx, x - 4 * s, y - 10 * s, 8 * s, 3 * s, dark(c, 0.2)); };
/** 미궁 입구: 벼랑의 큰 돌문과 계단, 문지기와 줄 선 공략대들, 이름 적는 탁자 */
function dvGate(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true });
  poly(ctx, [0, 240, 0, 60, 80, 30, 200, 20, 330, 0, 640, 0, 640, 240], t('#4e4a44')); for (let i = 0; i < 14; i++) stroke(ctx, [hash(i, 2) * 640, hash(i, 3) * 150, hash(i, 2) * 640 + 30, hash(i, 3) * 150 + 20 + hash(i, 4) * 30], 1, 'rgba(20,18,16,.25)');
  gateMouth(v, 420, 170, 110, 120, {}); poly(ctx, [0, 240, 0, 196, 640, 196, 640, 240], t('#6a665c'));
  torch(v, 340, 170, 44, 6); torch(v, 500, 170, 44, 6); glow(v, 340, 120, 40, '#ff8a3a', 0.16); glow(v, 500, 120, 40, '#ff8a3a', 0.16);
  for (const x of [366, 474]) { person(v, x, 196, 70, { cloth: '#3a3e44', hair: '#1c1614', hat: true, f: x < 420 ? 1 : -1 }); spear(v, x + (x < 420 ? -8 : 8), 196, 86, 0); }
  // 들어가는 공략대
  for (let i = 0; i < 3; i++) { person(v, 404 + i * 16, 178 - i * 2, 46 - i * 6, folk(i, { f: 1, cloak: true, noShadow: true })); }
  // 탁자와 기록하는 사람
  table(ctx, 140, 230, 196, t('#4a3626'), 6, 26); rect(ctx, 160, 191, 24, 5, '#e8e0c8'); person(v, 186, 196, 78, { cloth: '#3a3028', hair: '#b8b4ac', old: true, f: 1, pose: 'sit', arm: 'fwd' });
  banner(v, 120, 196, 110, '#3e5a3a', { mark: '#d8d0b8', d: 1 });
  // 줄 선 사람들
  dwarf(v, 268, 214, 82, { cloth: '#5a3a2a', hair: '#8a4a2a', f: -1 }); person(v, 300, 222, 92, { cloth: '#3a3e4a', hair: '#2a1e16', f: -1, cloak: true }); spear(v, 312, 222, 108, 0.03); elf(v, 60, 232, 98, { cloth: '#4a5a44', hair: '#c8c0a0', f: 1, long: true }); pack(ctx, 50, 174, 1.6);
  person(v, 560, 238, 104, mine(v, { f: -1, cloak: true })); pack(ctx, 574, 176, 1.7);
  finish(v, { noLeaves: true });
}
/** 미궁 도시: 문 앞에 붙어 자란 마을. 밧줄·등잔·약병 좌판, 간판, 붕대 감은 사람과 값을 깎는 사람 */
function dvTown(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true });
  poly(ctx, [0, 196, 0, 70, 150, 40, 320, 30, 500, 50, 640, 80, 640, 196], t('#48443e')); gateMouth(v, 320, 150, 60, 70, {});
  for (const [x, w, h, c] of [[40, 80, 50, '#7a6c58'], [150, 70, 40, '#6a6052'], [450, 70, 44, '#746654'], [560, 90, 54, '#6a5e52']]) { cottage(v, x + w / 2, 196, w, h, { roof: '#4a3a30', wall: c }); rect(ctx, x + w / 2 - 6, 196 - h * 0.7, 10, 10, '#ffc070'); glow(v, x + w / 2, 196 - h * 0.6, 16, '#ffa850', 0.2); }
  rect(ctx, 0, 196, VW, 44, t('#5e584e')); for (let i = 0; i < 30; i++) oval(ctx, hash(i, 2) * VW, 200 + hash(i, 3) * 36, 8, 2, rgba('#000000', 0.08));
  smoke(v, 80, 140, 60, 12, '#6a665e', 0.24); smoke(v, 600, 136, 60, 12, '#6a665e', 0.24);
  // 좌판 둘
  const stall = (x, c) => { poly(ctx, [x - 46, 150, x + 46, 150, x + 38, 134, x - 38, 134], t(c)); rect(ctx, x - 40, 150, 3, 60, t('#3a2c20')); rect(ctx, x + 37, 150, 3, 60, t('#3a2c20')); rect(ctx, x - 44, 184, 88, 6, t('#4a3a2a')); };
  stall(200, '#6e3a30'); for (let i = 0; i < 4; i++) ring(ctx, 172 + i * 18, 166, 6, 8, 2, t('#8a7450')); for (let i = 0; i < 3; i++) lamp(v, 176 + i * 22, 182, 0.14);
  stall(440, '#3e4a5a'); for (let i = 0; i < 7; i++) { const x = 410 + i * 10; rect(ctx, x, 176, 5, 8, ['#8a3a3a', '#3a6a8a', '#4a8a4a', '#8a7a3a'][i % 4]); rect(ctx, x + 1.5, 173, 2, 3, '#d8d0b8'); } stroke(ctx, [400, 156, 480, 156], 0.8, '#2a2018'); for (let i = 0; i < 5; i++) rect(ctx, 406 + i * 16, 156, 6, 10, t('#6a5a40'));
  person(v, 200, 212, 80, folk(1, { f: 1, female: true, long: true, arm: 'fwd' })); person(v, 440, 212, 80, folk(5, { f: -1, old: true, arm: 'chest' }));
  person(v, 262, 226, 94, { cloth: '#3a3e4a', hair: '#3a2a1e', f: -1, cloak: true, arm: 'out' }); person(v, 380, 228, 96, { cloth: '#4a4038', hair: '#1c1614', f: 1 }); rect(ctx, 368, 150, 18, 5, '#d8d0b8'); stroke(ctx, [384, 176, 392, 196], 3, '#d8d0b8');
  person(v, 540, 238, 104, mine(v, { f: -1 })); stroke(ctx, [100, 210, 100, 150], 1.6, '#2a2018'); rect(ctx, 100, 152, 26, 16, t('#3a2c20')); stroke(ctx, [106, 164, 120, 156], 1.4, '#c8ccd4');
  finish(v, { noLeaves: true });
}
/** 공략대 꾸리기: 조합 큰방의 게시판과 지도 편 탁자. 방패 든 이, 지팡이 든 이, 드워프, 엘프 */
function dvParty(v) {
  const { ctx } = v; room(v, { wall: '#5a4e40', floor: '#342a22', fy: 180 });
  rect(ctx, 40, 40, 150, 100, '#3a2c20'); rect(ctx, 46, 46, 138, 88, '#6a5840'); for (let i = 0; i < 9; i++) { const x = 54 + (i % 3) * 44 + hash(i, 2) * 6, y = 52 + Math.floor(i / 3) * 27; rect(ctx, x, y, 30, 20, i === 4 ? '#e8d8a8' : '#d8d0b8'); for (let j = 0; j < 3; j++) stroke(ctx, [x + 4, y + 5 + j * 5, x + 24, y + 5 + j * 5], 0.6, 'rgba(40,30,20,.5)'); oval(ctx, x + 15, y + 2, 1.4, 1.4, '#8a2a2a'); }
  windowAt(v, 480, 40, 60, 70, {}); shaft(v, 510, 110, 60, 100, -50, '#e8dcc0', 0.1); for (const x of [260, 330, 400]) { rect(ctx, x, 60, 40, 5, '#3a2c20'); oval(ctx, x + 10, 54, 7, 6, '#6a6a70'); rect(ctx, x + 24, 44, 4, 16, '#8a6a40'); }
  table(ctx, 230, 450, 200, '#4a3626', 8, 32); poly(ctx, [270, 198, 410, 198, 400, 190, 280, 190], '#d8ccaa'); bend(ctx, [290, 195, 330, 191, 350, 196, 390, 192], 0.8, '#6a3a2a'); candle(v, 420, 200, 8); glow(v, 420, 188, 40, '#ffb060', 0.16);
  // 뒤쪽: 방패, 지팡이
  person(v, 280, 206, 100, { raw: true, f: 1, cloth: '#3a3e4a', hair: '#3a2a1e', arm: 'chest' }); oval(ctx, 262, 160, 13, 17, '#5a2e2e'); oval(ctx, 262, 160, 4, 4, '#b8a070');
  person(v, 400, 206, 98, { raw: true, f: -1, cloth: '#2e3e5e', hair: '#8a8680', robe: true, old: true, stick: 'staff', arm: 'fwd' }); glow(v, 412, 108, 14, '#70b0ff', 0.2);
  dwarf(v, 218, 232, 96, { raw: true, f: 1, cloth: '#5a3a2a', hair: '#b8742e', arm: 'fwd' }); elf(v, 478, 234, 100, { raw: true, cloth: '#4a5a44', hair: '#c8c0a0', f: -1, long: true, female: true }); bend(ctx, [494, 150, 510, 180, 494, 214], 1.6, '#3a2c20'); stroke(ctx, [494, 150, 494, 214], 0.5, '#d8d0b8');
  person(v, 340, 240, 104, mine(v, { raw: true, f: 0, arm: 'fwd', noShadow: true, rim: WARM, rimDir: 1 }));
  person(v, 110, 236, 96, { raw: true, f: -1, cloth: '#4a4038', hair: '#1c1614', cloak: true });
  finish(v, { inside: true, noLeaves: true });
}
/** 얕은 층: 횃불 걸린 돌 복도를 줄지어 걷는 공략대. 닳은 계단과 먼저 간 이들의 분필 표시 */
function dvShallow(v) {
  const { ctx } = v; room(v, { wall: '#3a3a3c', floor: '#242426', fy: 180, stone: true });
  for (let i = 0; i < 4; i++) { const x = 70 + i * 170; rect(ctx, x - 14, 0, 28, 184, '#2e2e30'); rect(ctx, x - 18, 0, 36, 12, '#38383a'); ctx.fillStyle = '#161618'; ctx.beginPath(); ctx.moveTo(x + 14, 0); ctx.quadraticCurveTo(x + 85, 40, x + 156, 0); ctx.fill(); }
  arch(ctx, 560, 180, 60, 110, '#0c0c0e'); for (let i = 0; i < 4; i++) rect(ctx, 548 - i * 10, 180 + i * 6, 84 + i * 20, 6, i % 2 ? '#3a3a3c' : '#323234');
  for (const x of [156, 326, 496]) { stroke(ctx, [x, 110, x + 6, 96], 2, '#2a2018'); flame(v, x + 7, 94, 6); glow(v, x + 7, 90, 70, '#ff8a3a', 0.16); }
  // 분필 표시와 거미줄
  stroke(ctx, [220, 130, 240, 130, 234, 124], 1, 'rgba(230,230,220,.6)'); stroke(ctx, [240, 130, 234, 136], 1, 'rgba(230,230,220,.6)'); for (let i = 0; i < 3; i++) stroke(ctx, [250 + i * 6, 124, 250 + i * 6, 136], 1, 'rgba(230,230,220,.5)');
  for (let i = 0; i < 5; i++) stroke(ctx, [84, 12, 84 + Math.cos(0.2 + i * 0.3) * 50, 12 + Math.sin(0.2 + i * 0.3) * 50], 0.4, 'rgba(220,220,220,.3)'); for (let j = 1; j < 4; j++) bend(ctx, [84 + j * 14, 14, 84 + j * 12, 12 + j * 10, 84 + j * 4, 12 + j * 14], 0.4, 'rgba(220,220,220,.3)');
  // 줄지은 공략대
  person(v, 470, 214, 92, { raw: true, f: 1, cloth: '#3a3e4a', hair: '#3a2a1e', arm: 'fwd', rim: FIRE, rimDir: 1 }); oval(ctx, 494, 160, 11, 15, '#5a2e2e'); { const [hx, hy] = handOf(470, 214, 92, 1); blade(v, hx - 30, hy + 10, 1, -0.5, 30, {}); }
  person(v, 400, 220, 96, mine(v, { raw: true, f: 1, arm: 'up', rim: FIRE, rimDir: 1 })); { const [hx, hy] = handOf(400, 220, 96, 1, 'up'); torch(v, hx, hy + 6, 14, 6); glow(v, hx, hy - 12, 80, '#ff8a3a', 0.18); }
  dwarf(v, 330, 226, 92, { raw: true, f: 1, cloth: '#5a3a2a', hair: '#b8742e', rim: FIRE, rimDir: 1 }); pack(ctx, 318, 186, 1.6);
  person(v, 262, 230, 96, { raw: true, f: 1, cloth: '#2e3e5e', hair: '#8a8680', robe: true, stick: 'staff', rim: FIRE, rimDir: 1 }); elf(v, 190, 234, 98, { raw: true, cloth: '#4a5a44', hair: '#c8c0a0', f: -1, long: true, rim: FIRE, rimDir: 1 });
  finish(v, { inside: true, noLeaves: true });
}
/** 깊은 층: 빛나는 버섯과 수정이 돋은 큰 굴, 검은 물. 바위 턱에 선 작은 사람들 */
function dvDeep(v) {
  const { ctx } = v; rect(ctx, 0, 0, VW, VH, '#12141c');
  for (let i = 0; i < 9; i++) { const x = hash(i, 3) * VW, h = 30 + hash(i, 4) * 80; poly(ctx, [x - 10 - hash(i, 5) * 14, 0, x, h, x + 10 + hash(i, 6) * 14, 0], '#1c1e28'); }
  poly(ctx, [0, 240, 0, 120, 60, 100, 130, 130, 180, 180, 240, 200, 240, 240], '#1a1c26'); poly(ctx, [640, 240, 640, 90, 580, 80, 520, 120, 470, 170, 420, 196, 400, 240], '#1a1c26');
  // 물
  rect(ctx, 0, 204, VW, 36, '#0c1018'); for (let i = 0; i < 14; i++) stroke(ctx, [200 + hash(i, 7) * 240, 208 + hash(i, 8) * 28, 220 + hash(i, 7) * 240, 208 + hash(i, 8) * 28], 0.7, 'rgba(120,220,210,.25)');
  // 수정
  const crystal = (x, y, h, a, c) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); poly(ctx, [-h * 0.14, 0, -h * 0.1, -h * 0.8, 0, -h, h * 0.1, -h * 0.8, h * 0.14, 0], c); poly(ctx, [0, 0, 0, -h, h * 0.1, -h * 0.8, h * 0.14, 0], 'rgba(10,20,40,.3)'); ctx.restore(); };
  for (const [x, y, h, a] of [[560, 120, 50, -0.3], [580, 124, 36, 0.2], [540, 126, 30, -0.7], [70, 110, 40, 0.3], [50, 114, 28, -0.2], [320, 30, 40, 3.1], [300, 26, 26, 2.8]]) { crystal(x, y, h, a, '#7ac8e8'); glow(v, x, y - Math.cos(a) * h * 0.5, h * 1.6, '#50a8e0', 0.18); }
  // 버섯
  for (let i = 0; i < 16; i++) { const left = i % 2, x = left ? 20 + hash(i, 9) * 200 : 430 + hash(i, 9) * 200, y = left ? 150 + (x / 240) * 50 + hash(i, 10) * 20 : 190 - ((x - 430) / 210) * 80 + hash(i, 10) * 26, s = 3 + hash(i, 11) * 5; rect(ctx, x - 0.8, y - s * 1.6, 1.6, s * 1.6, '#3a6a64'); ctx.fillStyle = '#6ae0c8'; ctx.beginPath(); ctx.ellipse(x, y - s * 1.6, s, s * 0.6, 0, Math.PI, 0); ctx.fill(); glow(v, x, y - s * 1.6, s * 5, '#40d0b0', 0.16); }
  glow(v, 320, 220, 260, '#40a0c0', 0.08, 40);
  // 바위 턱의 공략대
  const dk = { raw: true, cloth: '#222a3a', hair: '#161a24', skin: '#3a4656', noShadow: true };
  for (let i = 0; i < 4; i++) person(v, 150 + i * 22, 178 + i * 6, 40 + i * 2, { ...dk, f: 1, cloak: i % 2 === 0, stick: i === 2 ? 'staff' : null, rim: 'rgba(110,220,200,.6)', rimDir: 1 });
  person(v, 240, 204, 50, mine(v, { raw: true, f: 1, arm: 'up', noShadow: true, rim: FIRE, rimDir: 1 })); { const [hx, hy] = handOf(240, 204, 50, 1, 'up'); torch(v, hx, hy + 4, 8, 4); glow(v, hx, hy - 8, 46, '#ff8a3a', 0.2); }
  finish(v, { inside: true, noLeaves: true });
}
/** 다른 공략대와 다툼: 갈림길의 궤 하나를 사이에 두고 마주 선 두 무리. 손은 칼자루에 */
function dvRival(v) {
  const { ctx } = v; room(v, { wall: '#34343a', floor: '#202024', fy: 178, stone: true });
  arch(ctx, 60, 178, 80, 120, '#0c0c0e'); arch(ctx, 500, 178, 80, 120, '#0c0c0e'); arch(ctx, 290, 178, 60, 100, '#101014');
  for (const x of [200, 440]) { stroke(ctx, [x, 100, x, 84], 2, '#2a2018'); flame(v, x, 82, 6); glow(v, x, 80, 80, '#ff8a3a', 0.16); }
  // 궤
  rect(ctx, 298, 198, 44, 22, '#5a4028'); ctx.fillStyle = '#6a4a2e'; ctx.beginPath(); ctx.ellipse(320, 198, 22, 9, 0, Math.PI, 0); ctx.fill(); rect(ctx, 298, 204, 44, 3, '#8a7440'); rect(ctx, 317, 198, 6, 9, '#c8a850'); glow(v, 320, 200, 40, '#ffe090', 0.12);
  const side = (k, cs) => { for (let i = 0; i < 3; i++) { const x = 320 + k * (130 + i * 50), y = 214 + i * 10, h = 90 + i * 6; if (i === 1 && k < 0) dwarf(v, x, y, h, { raw: true, f: -k, cloth: cs[i], hair: '#8a4a2a', rim: FIRE, rimDir: -k }); else person(v, x, y, h, { raw: true, f: -k, cloth: cs[i], hair: HR[i + (k > 0 ? 3 : 0)], cloak: i === 2, hood: i === 2 && k > 0, arm: i === 0 ? 'fwd' : null, rim: FIRE, rimDir: -k }); if (i === 0) { const [hx, hy] = handOf(x, y, h, -k); blade(v, hx, hy, -k, 0.25, 34, {}); } } };
  side(1, ['#5a2e2e', '#4a3a3a', '#2a2a30']); side(-1, ['#3a3e4a', '#5a3a2a', '#2e3e5e']);
  person(v, 248, 238, 104, mine(v, { raw: true, f: 1, arm: 'out', rim: FIRE, rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 미궁의 주인: 가장 깊은 방의 큰 문이 반쯤 열리고, 그 너머 높은 자리에 앉은 큰 그림자. 얼굴은 없고 가슴의 빛뿐 */
function dvLord(v) {
  const { ctx } = v; rect(ctx, 0, 0, VW, VH, '#100e14');
  for (const x of [60, 160, 480, 580]) { rect(ctx, x - 16, 0, 32, 200, '#1a1820'); rect(ctx, x + 4, 0, 12, 200, '#141218'); }
  // 문틀과 너머의 방
  rect(ctx, 220, 10, 200, 190, '#08060a'); lit(ctx, () => { const g = ctx.createRadialGradient(320, 110, 4, 320, 110, 120); g.addColorStop(0, 'rgba(120,60,160,.5)'); g.addColorStop(1, 'rgba(120,60,160,0)'); ctx.fillStyle = g; ctx.fillRect(220, 10, 200, 190); });
  // 높은 자리와 그림자
  poly(ctx, [280, 200, 290, 150, 350, 150, 360, 200], '#0a080c'); rect(ctx, 292, 60, 56, 92, '#0a080c'); poly(ctx, [292, 60, 300, 30, 310, 60, 320, 22, 330, 60, 340, 30, 348, 60], '#0a080c');
  poly(ctx, [296, 150, 300, 96, 310, 84, 330, 84, 340, 96, 344, 150], '#050406'); oval(ctx, 320, 76, 9, 11, '#050406'); poly(ctx, [296, 110, 282, 150, 290, 152, 302, 120], '#050406'); poly(ctx, [344, 110, 358, 150, 350, 152, 338, 120], '#050406');
  oval(ctx, 320, 108, 3, 3, '#e0b0ff'); glow(v, 320, 108, 26, '#b070f0', 0.24);
  // 반쯤 열린 문짝
  poly(ctx, [220, 10, 268, 26, 268, 196, 220, 200], '#2a2630'); poly(ctx, [420, 10, 372, 26, 372, 196, 420, 200], '#221e28'); for (const k of [-1, 1]) for (let i = 0; i < 4; i++) { const x = 320 + k * 76; oval(ctx, x, 46 + i * 40, 3, 3, '#4a4450'); } rect(ctx, 210, 0, 220, 12, '#2e2a34'); for (let i = 0; i < 9; i++) stroke(ctx, [226 + i * 24, 3, 232 + i * 24, 9, 238 + i * 24, 3], 1, 'rgba(160,130,190,.4)');
  rect(ctx, 0, 200, VW, 40, '#16141a'); lit(ctx, () => poly(ctx, [268, 200, 372, 200, 470, 240, 170, 240], 'rgba(150,90,200,.12)'));
  // 공략대
  const o = { raw: true, noShadow: true, rim: 'rgba(190,140,240,.6)' };
  person(v, 180, 232, 92, { ...o, f: 1, cloth: '#2a2a34', hair: '#1c1614', arm: 'fwd', rimDir: 1 }); { const [hx, hy] = handOf(180, 232, 92, 1); blade(v, hx, hy, 1, 0.5, 34, {}); }
  dwarf(v, 120, 236, 92, { ...o, f: 1, cloth: '#3a2a26', hair: '#8a4a2a', rimDir: 1 }); person(v, 470, 232, 94, { ...o, f: -1, cloth: '#262e44', hair: '#8a8680', robe: true, stick: 'staff', rimDir: -1 }); glow(v, 482, 138, 12, '#70b0ff', 0.2);
  person(v, 250, 240, 102, mine(v, { ...o, f: 1, rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 공략 기록: 문 곁 큰 돌판에 층과 이름을 새긴다. 정을 든 석수와 지켜보는 공략대 */
function dvRecord(v) {
  const { ctx, t } = v; sky(v); rect(ctx, 0, 0, VW, VH, t('#4e4a44')); for (let i = 0; i < 12; i++) stroke(ctx, [420 + hash(i, 2) * 220, hash(i, 3) * 70, 440 + hash(i, 2) * 220, 20 + hash(i, 3) * 70], 1, 'rgba(20,18,16,.25)');
  rect(ctx, 0, 196, VW, 44, t('#66625a'));
  // 돌판
  rect(ctx, 110, 30, 300, 166, t('#7a766c')); rect(ctx, 102, 24, 316, 10, t('#8a867a')); rect(ctx, 102, 190, 316, 8, t('#5e5a52'));
  for (let c = 0; c < 4; c++) { rect(ctx, 124 + c * 72, 44, 56, 3, 'rgba(30,28,24,.6)'); for (let r = 0; r < 10; r++) { if (c === 3 && r > 3) break; const w = 24 + hash(r, c + 2) * 30; stroke(ctx, [126 + c * 72, 58 + r * 13, 126 + c * 72 + w, 58 + r * 13], 1.2, 'rgba(30,28,24,.5)'); } }
  stroke(ctx, [342, 110, 382, 110], 1.6, 'rgba(250,240,210,.8)'); glow(v, 362, 110, 20, '#ffe8b0', 0.12);
  // 발판과 석수
  rect(ctx, 330, 150, 70, 5, t('#4a3a2a')); rect(ctx, 334, 155, 4, 41, t('#3a2c20')); rect(ctx, 392, 155, 4, 41, t('#3a2c20'));
  person(v, 372, 150, 60, { cloth: '#5a5040', hair: '#8a8680', old: true, f: -1, arm: 'fwd', noShadow: true }); { const [hx, hy] = handOf(372, 150, 60, -1); stroke(ctx, [hx, hy, hx - 9, hy - 1], 1.6, '#6a6a70'); rect(ctx, hx + 2, hy - 8, 8, 5, '#4a4a50'); }
  for (let i = 0; i < 4; i++) oval(ctx, 340 + i * 12, 196 + (i % 2) * 2, 2, 1.2, t('#8a867a'));
  gateMouth(v, 570, 180, 70, 100, {});
  // 지켜보는 공략대
  dwarf(v, 200, 228, 90, { cloth: '#5a3a2a', hair: '#b8742e', f: 1 }); person(v, 150, 232, 96, { cloth: '#2e3e5e', hair: '#8a8680', robe: true, f: 1, stick: 'staff' }); elf(v, 90, 236, 98, { cloth: '#4a5a44', hair: '#c8c0a0', f: 1, long: true });
  person(v, 268, 238, 104, mine(v, { f: 1, arm: 'out' }));
  finish(v, { noLeaves: true });
}
/** 돌아옴: 문에서 햇빛으로 나오는 공략대. 다친 이를 어깨에 부축하고, 문 앞에서 기다리던 사람들 */
function dvReturn(v) {
  const { ctx, t } = v; sky(v); far(v, {});
  poly(ctx, [0, 240, 0, 0, 300, 0, 280, 60, 250, 196, 0, 196], t('#4e4a44')); gateMouth(v, 120, 176, 110, 130, {});
  ground(v, () => 190, { color: '#7a7a56', color2: '#52523c', tufts: 30 }); poly(ctx, [40, 200, 200, 200, 330, 240, 0, 240], t('#7a7468'));
  lit(ctx, () => poly(ctx, [300, 0, 640, 0, 640, 240, 200, 240], 'rgba(255,236,190,.07)'));
  // 부축해 나오는 둘과 뒤따르는 이
  person(v, 232, 226, 100, mine(v, { f: 1, arm: 'out' })); person(v, 206, 226, 94, { cloth: '#3a3e4a', hair: '#3a2a1e', f: 1, pose: 'bow' }); rect(ctx, 198, 170, 14, 5, '#d8d0b8'); stroke(ctx, [200, 196, 214, 200], 3, '#d8d0b8');
  dwarf(v, 150, 216, 84, { cloth: '#5a3a2a', hair: '#b8742e', f: 1 }); pack(ctx, 138, 178, 1.8, '#6a5236'); person(v, 110, 196, 60, { cloth: '#2e3e5e', hair: '#8a8680', robe: true, f: 1, stick: 'staff', noShadow: true });
  // 기다리던 사람들
  cottage(v, 540, 186, 70, 40, { roof: '#4a3a30', wall: '#8a7c62' }); tree(v, 626, 188, 70, {});
  person(v, 400, 224, 92, folk(1, { f: -1, female: true, long: true, arm: 'out' })); person(v, 444, 214, 56, folk(2, { f: -1, child: true })); person(v, 500, 220, 88, folk(3, { f: -1, old: true, stick: 'staff' })); person(v, 590, 230, 92, { cloth: '#d8d0c0', hair: '#3a2a1e', f: -1, female: true, veil: true, arm: 'chest' });
  finish(v, {});
}
export const DELVE23 = { gate: dvGate, town: dvTown, party: dvParty, shallow: dvShallow, deep: dvDeep, rival: dvRival, lord: dvLord, record: dvRecord, return: dvReturn };

export const PLATES23 = {
  /** 새 고장의 살이. variant: pilgrim·academy·lake·canopy·under·camp·warport·minetown·canal */
  lands(v) { return (LANDS23[v.variant] ?? ldCanal)(v); },
  /** 나라마다 다른 궁정. variant: emperor·curia·tower·merchant·elders·clans·tribes·coup·heir */
  crowns(v) { return (CROWNS23[v.variant] ?? crHeir)(v); },
  /** 미궁. variant: gate·town·party·shallow·deep·rival·lord·record·return */
  delve(v) { return (DELVE23[v.variant] ?? dvGate)(v); },
};
