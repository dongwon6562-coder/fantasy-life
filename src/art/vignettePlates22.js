// 43단계 삽화: 마족 집안의 어린 시절(전사 가문·교역 가문·이름 없는 집안·인간 땅에 숨은 집), 마대륙의 고장(뼈의 들·사슬 항구·돌의 도시·해협 초소),
// 마신(꿈의 목소리·파편·옛 사도·마신교 모임·봉인 전쟁 벽화·쐐기 앞의 선택), 검(유파별 장면·검기·승급·이름난 검객·마검사).
// 등급 선: 피와 주검은 그리지 않는다. 뼈는 아득히 오래된 큰 짐승의 것뿐.
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, crowd, lying, tree, banner, sunSign, crows, finish } from './vignetteKit.js';
import { horseSil } from './vignettePlates4.js';
import { spear, torch } from './vignettePlates5.js';
import { demonBanner, pall, spires } from './vignettePlates12.js';
import { facade, table } from './vignettePlates18.js';
import { headOf, elf, beastman, dwarf, shelf } from './vignettePlates21.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const bend = (ctx, a, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 2; i + 3 < a.length; i += 4) ctx.quadraticCurveTo(a[i], a[i + 1], a[i + 2], a[i + 3]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const ring = (ctx, x, y, rx, ry, w, c, rot = 0, a0 = 0, a1 = TAU) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, a0, a1); ctx.stroke(); };
const lit = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
const WARM = 'rgba(255,190,110,.55)', COLD = 'rgba(190,210,240,.45)', FIRE = 'rgba(255,150,70,.6)', VIOLET = 'rgba(200,160,255,.5)', RED = 'rgba(230,90,70,.5)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const DC = ['#241c2a', '#2e1c22', '#1e222c', '#2a2430', '#34202a'], DH = ['#16121a', '#d8d2cc', '#4a161a', '#2a2238', '#5a5460'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const kid = (v, o = {}) => mine(v, { child: true, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const hooded = (i, o = {}) => ({ cloth: ['#1c181e', '#221c1c', '#1a1c22'][i % 3], hair: '#141214', hood: true, robe: true, ...o });

/** 마족: 조금 가늘고, 잿빛 살갗, 뒤로 휜 뿔과 빛 도는 눈. 아이는 뿔이 짧다 */
export function fiend(v, x, y, h, o = {}) {
  const { ctx } = v, tone = (c) => (o.raw ? c : v.t(c));
  ctx.save(); ctx.translate(x, y); ctx.scale(o.thin ?? 0.9, 1); ctx.translate(-x, -y); person(v, x, y, h, { skin: '#8d8496', hair: '#16121a', cloth: '#241c2a', ...o }); ctx.restore();
  const { hy, r } = headOf(x, y, h, o), f = o.f ?? 0, c = tone(o.horn ?? '#2e2428'), big = o.child ? 0.6 : (o.hornSize ?? 1.15);
  if (!o.hideHorn) for (const k of [-1, 1]) { const bx = x + k * r * 0.5 + f * r * 0.15; bend(ctx, [bx, hy - r * 0.75, bx + k * r * 0.55 * big - f * r * 0.2, hy - r * (1.2 + 0.4 * big), bx + k * r * 0.15 * big - f * r * 0.9 * big, hy - r * (1.4 + 0.7 * big)], r * 0.44, c); }
  if (f && !o.noEye) oval(ctx, x + f * r * 0.45, hy - r * 0.05, r * 0.15, r * 0.12, o.eye ?? '#e8d49a');
}
const dfolk = (i, o = {}) => ({ cloth: DC[i % 5], hair: DH[i % 5], female: i % 3 === 1, long: i % 2 === 1, eye: ['#e8d49a', '#e07060', '#c8a0f0'][i % 3], ...o });
/** 손 자리(팔 모양에 따라) */
export const handOf = (x, y, h, f, arm = 'fwd', drop = 0) => (arm === 'up' ? [x + f * 0.12 * h, y - (1.0 - drop / 100) * h] : [x + f * 0.214 * h, y - (0.66 - drop / 100) * h]);
/** 칼: 손에서 ang(라디안, 위가 +) 쪽으로 뻗는다. 날 끝 좌표를 돌려준다 */
export function blade(v, hx, hy, f, ang, len, o = {}) {
  const { ctx } = v, c = o.raw === false ? v.t(o.color ?? '#c8ccd4') : (o.color ?? '#c8ccd4'), dx = Math.cos(ang) * f, dy = -Math.sin(ang), tx = hx + dx * len, ty = hy + dy * len;
  stroke(ctx, [hx - dx * len * 0.16, hy - dy * len * 0.16, hx, hy], 2.4, '#2a2018'); stroke(ctx, [hx - dy * 4, hy + dx * 4, hx + dy * 4, hy - dx * 4], 2, '#6a5a3a');
  stroke(ctx, [hx, hy, tx, ty], o.w ?? 1.8, c); stroke(ctx, [hx + dx * 3, hy + dy * 3 - 0.6, tx, ty - 0.4], 0.5, 'rgba(255,255,255,.6)');
  return [tx, ty];
}
/** 검이 지나간 호 */
export const slash = (ctx, cx, cy, r, a0, a1, c = 'rgba(230,238,255,.6)', w = 2.4) => lit(ctx, () => { ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { ctx.strokeStyle = i ? c : c.replace(/[\d.]+\)$/, '.18)'); ctx.lineWidth = i ? w * (i === 2 ? 0.35 : 1) : w * 3; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); } });
/** 화로 */
export const brazier = (v, x, y, s = 1, a = 0.2) => { const { ctx } = v; stroke(ctx, [x - 6 * s, y, x - 2 * s, y - 18 * s], 1.4, '#15110e'); stroke(ctx, [x + 6 * s, y, x + 2 * s, y - 18 * s], 1.4, '#15110e'); poly(ctx, [x - 8 * s, y - 24 * s, x + 8 * s, y - 24 * s, x + 5 * s, y - 17 * s, x - 5 * s, y - 17 * s], '#1c1614'); flame(v, x, y - 25 * s, 8 * s); glow(v, x, y - 30 * s, 60 * s, '#ff8a3a', a); };
/** 마대륙의 검은 땅 */
function blackGround(v, y0, seed = 1, c = '#1a151c') { const { ctx } = v; const gy = (x) => y0 - Math.sin(x / 90 + seed) * 4 - Math.sin(x / 37 + seed * 2) * 2; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, gy(x)); ctx.lineTo(VW, VH); ctx.fill(); for (let i = 0; i < 40; i++) { const x = hash(i, seed) * VW, y = y0 + 8 + hash(i, seed + 1) * (VH - y0 - 10); stroke(ctx, [x, y, x + 6 + hash(i, seed + 2) * 12, y - 1], 0.6, 'rgba(110,94,124,.3)'); } return gy; }
const redSun = (v, x, y, r = 22) => { const { ctx } = v; oval(ctx, x, y, r, r, '#c8463a'); glow(v, x, y, r * 4.4, '#c8463a', 0.24); rect(ctx, x - r - 2, y + r * 0.3, r * 2 + 4, 2.4, 'rgba(58,20,32,.6)'); rect(ctx, x - r + 3, y - r * 0.3, r * 2 - 6, 1.8, 'rgba(58,20,32,.5)'); };
/** 좁고 긴 보랏빛 창이 난 검은 탑 */
export function darkTower(v, x, y, w, h, seed = 1, c = '#201a26') { const { ctx } = v; poly(ctx, [x - w / 2, y, x - w / 2 + 2, y - h, x, y - h - w * 0.5, x + w / 2 - 2, y - h, x + w / 2, y], c); poly(ctx, [x + w * 0.1, y, x + w * 0.1, y - h - w * 0.3, x + w / 2 - 2, y - h, x + w / 2, y], dark(c, 0.3)); for (let j = 0; j < Math.floor(h / 15); j++) if (hash(j, seed) < 0.6) { rect(ctx, x - 1, y - h + 8 + j * 14, 2, 7, '#c890f0'); if (j % 2) glow(v, x, y - h + 11 + j * 14, 8, '#a060e0', 0.22); } }

// ───────── 마족 집안의 어린 시절 ─────────
/** 가르베스의 전사 가문: 붉은 깃발 건 검은 성의 뜰. 줄지어 선 전사들 앞에서 아버지가 날 없는 칼을 쥐여 준다 */
function dkWarrior(v) {
  const { ctx } = v; sky(v); pall(v, 0.4); redSun(v, 520, 70, 18); spires(v, 120, 16, '#1c1620', { h: 50 });
  rect(ctx, 0, 92, VW, 100, '#1c161e'); for (let i = 0; i < 17; i++) rect(ctx, i * 40, 84, 22, 9, '#1c161e'); rect(ctx, 250, 110, 80, 82, '#0e0a10'); poly(ctx, [250, 110, 290, 86, 330, 110], '#0e0a10');
  blackGround(v, 188, 3, '#221a22');
  for (const x of [120, 210, 370, 460]) banner(v, x, 196, 96, '#7a1c20', { raw: true, mark: '#1a1014', d: 1 });
  // 줄지어 선 전사들
  for (let i = 0; i < 7; i++) { const x = 400 + i * 34; fiend(v, x, 212 + (i % 2) * 3, 84, dfolk(i, { raw: true, f: -1, female: false, long: false, cloth: '#2a1a1e', noShadow: true, rim: RED, rimDir: -1 })); spear(v, x + 10, 214, 92, 0.04); }
  brazier(v, 60, 232, 1.2); brazier(v, 600, 236, 1.2, 0.14);
  // 베임 자국 난 수련 기둥
  rect(ctx, 150, 150, 12, 82, '#2e2226'); for (let i = 0; i < 5; i++) stroke(ctx, [148, 160 + i * 12, 164, 166 + i * 12], 1, '#0e0a0c');
  // 아버지와 나, 어머니
  fiend(v, 250, 236, 120, dfolk(0, { raw: true, f: 1, cloak: true, cloth: '#3a1c20', arm: 'fwd', rim: FIRE, rimDir: -1 })); { const [hx, hy] = handOf(250, 236, 120, 1); blade(v, hx, hy, 1, -0.5, 30, { color: '#8a8e96', w: 2.6 }); }
  fiend(v, 322, 238, 68, kid(v, { raw: true, f: -1, arm: 'fwd', rim: FIRE, rimDir: -1 }));
  fiend(v, 196, 236, 112, dfolk(1, { raw: true, f: 1, female: true, long: true, cloth: '#2e1c26', arm: 'chest', rim: FIRE, rimDir: -1 }));
  // 뿔 하나 잃은 늙은 전사
  fiend(v, 110, 238, 108, dfolk(4, { raw: true, f: 1, old: true, pose: 'sit', hair: '#b8b2ac', hideHorn: true, cloth: '#2a2228' })); { const { hy, r } = headOf(110, 238, 108, { pose: 'sit' }); bend(ctx, [106, hy - r * 0.75, 100, hy - r * 1.7, 108, hy - r * 2.3], r * 0.32, '#2e2428'); stroke(ctx, [114, hy - r * 0.8, 115, hy - r * 1.15], r * 0.34, '#3a3034'); }
  finish(v, { noLeaves: true });
}
/** 엘리노어의 교역·사절 가문: 사슬 항구의 창고 앞. 저울에 마석을 다는 어머니, 장부를 든 아이, 가면 쓴 바다 건너 상인 */
function dkTrade(v) {
  const { ctx } = v; sky(v); pall(v, 0.3); spires(v, 118, 10, '#1c1620', { h: 36, x0: 300, w: 340 });
  rect(ctx, 0, 122, VW, 60, '#2a2438'); for (let i = 0; i < 26; i++) stroke(ctx, [hash(i, 2) * VW, 126 + hash(i, 3) * 50, hash(i, 2) * VW + 16, 126 + hash(i, 3) * 50], 0.6, 'rgba(180,160,220,.25)');
  // 검은 배와 항구 어귀의 사슬
  for (const [x, s] of [[430, 1], [560, 0.7]]) { poly(ctx, [x - 50 * s, 150, x + 50 * s, 150, x + 40 * s, 164, x - 40 * s, 164], '#120e14'); rect(ctx, x - 1, 150 - 70 * s, 2, 70 * s, '#120e14'); poly(ctx, [x + 1, 150 - 66 * s, x + 36 * s, 150 - 30 * s, x + 1, 150 - 14 * s], '#2a1c2a'); oval(ctx, x - 30 * s, 146, 2, 2, '#c890f0'); glow(v, x - 30 * s, 146, 10, '#a060e0', 0.22); }
  darkTower(v, 330, 150, 20, 60, 4); ctx.setLineDash([4, 2.4]); bend(ctx, [336, 120, 480, 152, 640, 116], 2, '#0e0a10'); ctx.setLineDash([]);
  // 부두와 창고 벽
  rect(ctx, 0, 180, VW, 60, '#221c22'); for (let i = 0; i < 12; i++) rect(ctx, i * 56, 180, 2, 60, '#15101a'); rect(ctx, 0, 40, 210, 146, '#1c161e'); rect(ctx, 60, 96, 60, 90, '#0e0a10'); demonBanner(v, 180, 190, 110, { raw: true });
  for (const [x, y] of [[20, 222], [44, 226], [30, 206]]) { rect(ctx, x, y - 16, 22, 16, '#3a2c2a'); stroke(ctx, [x, y - 8, x + 22, y - 8], 0.8, '#1c1412'); }
  // 긴 탁자: 저울과 마석, 장부
  table(ctx, 250, 430, 196, '#2e2228', 5, 38); brazier(v, 470, 236, 0.9, 0.14);
  stroke(ctx, [340, 194, 340, 160], 1.6, '#9a8450'); stroke(ctx, [316, 164, 364, 164], 1.4, '#9a8450'); for (const [x, dy] of [[316, 4], [364, -2]]) { stroke(ctx, [x, 164, x - 6, 180 + dy], 0.5, '#9a8450'); stroke(ctx, [x, 164, x + 6, 180 + dy], 0.5, '#9a8450'); oval(ctx, x, 181 + dy, 8, 2, '#9a8450'); }
  for (const [x, y] of [[314, 182], [318, 183], [390, 192], [400, 191], [410, 193]]) { oval(ctx, x, y, 3, 2.4, '#7ab0e0'); glow(v, x, y, 9, '#8ac0ff', 0.22); } oval(ctx, 364, 176, 3.4, 2, '#d8b860');
  // 어머니(저울 뒤), 나(장부), 가면 쓴 손님과 짐꾼
  fiend(v, 300, 226, 116, dfolk(1, { raw: true, f: 1, female: true, long: true, robe: true, cloth: '#2a2438', arm: 'fwd', rim: VIOLET, rimDir: 1 }));
  fiend(v, 236, 238, 68, kid(v, { raw: true, f: 1, arm: 'fwd' })); poly(ctx, [244, 192, 262, 190, 263, 204, 245, 206], '#d8ceb0'); stroke(ctx, [248, 196, 258, 195], 0.5, '#4a4034'); stroke(ctx, [248, 200, 256, 199], 0.5, '#4a4034');
  person(v, 520, 236, 112, { raw: true, f: -1, cloth: '#4a3a2a', hair: '#2a1e16', cloak: true, hood: true, arm: 'fwd' }); { const { hy, r } = headOf(520, 236, 112, {}); oval(ctx, 517, hy, r * 0.7, r * 0.86, '#d8d0c0'); oval(ctx, 514, hy - 1, 1.2, 0.8, '#15110e'); }
  fiend(v, 580, 238, 108, dfolk(2, { raw: true, f: -1, cloth: '#2a2228' })); rect(ctx, 566, 150, 26, 18, '#3a2c2a');
  finish(v, { noLeaves: true });
}
/** 침묵의 왕 아래 이름 없는 집안: 안개 낀 관의 골짜기. 깃발도 불도 없이 무릎 꿇은 잿빛 사람들, 추 없는 종, 입에 손가락을 댄 어른 */
function dkSilent(v) {
  const { ctx } = v; sky(v); pall(v, 0.2); rect(ctx, 0, 0, VW, VH, 'rgba(120,124,136,.3)');
  // 양쪽 벼랑과 벽감의 선 관들
  for (const k of [0, 1]) { const x0 = k ? 420 : 0; poly(ctx, k ? [420, 240, 460, 60, 520, 0, 640, 0, 640, 240] : [0, 0, 130, 0, 190, 70, 220, 240, 0, 240], '#2a2a32'); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const x = x0 + (k ? 60 : 16) + i * 34 + j * (k ? -6 : 6), y = 70 + j * 42; if (x < (k ? 470 - j * 10 : 0) || x > (k ? 640 : 196 - (2 - j) * 8)) continue; rect(ctx, x, y, 16, 32, '#16161c'); poly(ctx, [x + 3, y + 30, x + 3, y + 8, x + 8, y + 3, x + 13, y + 8, x + 13, y + 30], '#3a3a44'); } }
  for (let i = 0; i < 4; i++) rect(ctx, 0, 120 + i * 26, VW, 14, 'rgba(170,174,186,.12)');
  blackGround(v, 194, 5, '#26262c');
  // 추 없는 종
  stroke(ctx, [300, 196, 300, 96, 344, 96, 344, 196], 3, '#15131a'); poly(ctx, [310, 132, 314, 108, 330, 108, 334, 132, 338, 138, 306, 138], '#3e3e48'); ring(ctx, 322, 138, 16, 3, 1, '#16161c');
  // 무릎 꿇은 줄
  for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const x = 60 + i * 44 + r * 22 + (i > 2 ? 150 : 0), y = 214 + r * 18; fiend(v, x, y, 80 + r * 12, { raw: true, f: i > 2 ? -1 : 1, pose: 'kneel', robe: true, hood: (i + r) % 2 === 0, cloth: ['#4a4a54', '#3e3e48', '#55555e'][(i + r) % 3], hair: '#8a8a92', eye: '#b8b8c4', hornSize: 0.8, noShadow: true }); }
  // 어른과 나
  fiend(v, 300, 238, 114, { raw: true, f: 1, robe: true, cloth: '#5a5a64', hair: '#c8c8d0', old: true, arm: 'chest', eye: '#d8d8e4' }); stroke(ctx, [309, 238 - 114 * 0.9, 309, 238 - 114 * 0.84], 1.4, '#8d8496');
  fiend(v, 352, 238, 66, kid(v, { raw: true, f: -1, pose: 'kneel', cloth: '#4a4a54' }));
  finish(v, { noLeaves: true });
}
/** 인간 땅에 숨어 사는 마족: 낮의 다락방. 넓은 모자와 목도리, 아이 얼굴에 분을 바르는 어머니, 둥근 창 밖 사람들의 지붕과 예배당 */
function dkHiding(v) {
  const { ctx } = v; room(v, { wall: '#5a4c3e', floor: '#3a2e24', fy: 186 });
  // 비스듬한 지붕과 들보
  poly(ctx, [0, 0, VW, 0, VW, 20, 520, 20, 400, 0], '#2e241c'); poly(ctx, [0, 0, 260, 0, 0, 120], '#3a2e24'); for (const x of [60, 140, 220]) stroke(ctx, [x, 0, x - 60, 60 + (220 - x) * 0.2], 5, '#2a2018'); rect(ctx, 0, 20, VW, 7, '#2a2018');
  // 둥근 창: 지붕들과 예배당
  oval(ctx, 470, 86, 40, 40, '#2a2018'); ctx.save(); ctx.beginPath(); ctx.arc(470, 86, 35, 0, TAU); ctx.clip(); rect(ctx, 430, 46, 80, 80, '#a8c0d8'); for (const [x, w, h] of [[430, 26, 24], [452, 30, 34], [486, 28, 20]]) { rect(ctx, x, 122 - h, w, h, '#8a7a64'); poly(ctx, [x - 2, 122 - h, x + w / 2, 110 - h, x + w + 2, 122 - h], '#6a3e30'); } rect(ctx, 474, 60, 8, 40, '#b8b0a0'); poly(ctx, [472, 60, 478, 48, 484, 60], '#5a5a64'); ctx.restore(); sunSign(v, 478, 44, 3, '#c8a850'); stroke(ctx, [435, 86, 505, 86], 1.6, '#2a2018'); stroke(ctx, [470, 51, 470, 121], 1.6, '#2a2018');
  shaft(v, 470, 126, 60, 110, -130, '#e8e0c0', 0.12);
  // 못에 건 모자와 목도리, 궤와 침상
  for (const [x, c] of [[300, '#3a2c20'], [340, '#4a3a2a']]) { oval(ctx, x, 84, 16, 4, c); oval(ctx, x, 80, 8, 6, c); } poly(ctx, [372, 76, 382, 76, 384, 120, 376, 114, 370, 122], '#6a2e28');
  rect(ctx, 560, 204, 60, 30, '#3a2c20'); rect(ctx, 560, 204, 60, 5, '#2a2018'); rect(ctx, 20, 200, 120, 10, '#4a3a2a'); rect(ctx, 20, 210, 120, 24, '#3a2c20'); oval(ctx, 44, 196, 18, 6, '#b8ae94');
  // 탁자의 거울과 분 그릇
  table(ctx, 236, 300, 200, '#4a3a2a', 5, 36); oval(ctx, 262, 184, 9, 12, '#9aa8b4'); ring(ctx, 262, 184, 9, 12, 1.6, '#6a5a3a'); oval(ctx, 286, 198, 7, 2.4, '#d8d0c0');
  // 어머니: 아이 얼굴에 분을 바른다
  fiend(v, 340, 238, 110, dfolk(1, { raw: true, f: 1, pose: 'kneel', female: true, veil: true, hideHorn: true, cloth: '#4a3e44', arm: 'fwd', rim: WARM, rimDir: 1 }));
  fiend(v, 392, 238, 66, kid(v, { raw: true, f: -1, rim: WARM, rimDir: 1 })); { const { hy, r } = headOf(392, 238, 66, { child: true }); oval(ctx, 388, hy + r * 0.2, r * 0.5, r * 0.4, 'rgba(216,196,170,.8)'); }
  // 아버지: 모자를 눌러쓰고 목도리를 감는다
  fiend(v, 180, 236, 116, dfolk(0, { raw: true, f: 1, hat: true, hideHorn: true, cloak: true, cloth: '#4a4038', arm: 'chest' })); poly(ctx, [172, 136, 190, 136, 192, 146, 170, 146], '#6a2e28');
  finish(v, { inside: true });
}

// ───────── 마대륙의 고장 ─────────
/** 뼈의 들: 지평선까지 솟은 아득히 오래된 큰 갈비뼈들 사이로 지나는 작은 행렬 */
function dlBones(v) {
  const { ctx } = v; sky(v); pall(v, 0.42); redSun(v, 150, 92, 24); spires(v, 136, 22, '#1c1620', { h: 30 });
  blackGround(v, 150, 2);
  // 먼 갈비뼈와 가까운 갈비뼈
  for (let i = 0; i < 7; i++) { const x = 250 + i * 54, h = 70 + Math.sin(i * 0.6) * 20, c = `rgba(${150 - i * 4},${140 - i * 4},${150 - i * 4},.8)`; bend(ctx, [x, 190, x + 10, 190 - h * 1.2, x + 70, 190 - h], 5 - i * 0.3, c); }
  for (let i = 0; i < 5; i++) { const x = 300 + i * 70; bend(ctx, [x + 14, 226, x + 40, 90 - i * 6, x + 130, 80 + i * 8], 9, '#b8ae9c'); bend(ctx, [x + 16, 226, x + 42, 94 - i * 6, x + 130, 83 + i * 8], 3, '#8a8072'); }
  // 행렬: 깃발과 짐 짐승
  demonBanner(v, 330, 222, 46, { raw: true }); for (let i = 0; i < 7; i++) fiend(v, 344 + i * 14, 222 + (i % 2) * 2, 30, dfolk(i, { raw: true, f: -1, noShadow: true, noEye: true, skin: '#5a5262' })); oval(ctx, 470, 214, 18, 9, '#120e14'); for (const k of [-10, -3, 6, 12]) rect(ctx, 470 + k, 218, 2.6, 8, '#120e14'); rect(ctx, 462, 198, 18, 10, '#2a2028');
  // 앞: 나와 길잡이
  fiend(v, 560, 238, 104, dfolk(3, { raw: true, f: -1, cloak: true, stick: 'staff' })); person(v, 606, 238, 100, mine(v, { raw: true, f: -1, cloak: true, rim: RED, rimDir: -1 }));
  finish(v, { noLeaves: true });
}
/** 사슬 항구: 두 탑 사이 물목을 가로지른 큰 사슬, 유빙 사이의 검은 배들, 부두의 보랏빛 등 */
function dlHarbor(v) {
  const { ctx } = v; sky(v); pall(v, 0.34); spires(v, 110, 14, '#1c1620', { h: 40 });
  rect(ctx, 0, 108, VW, 132, '#221e30'); for (let i = 0; i < 40; i++) stroke(ctx, [hash(i, 2) * VW, 112 + hash(i, 3) * 120, hash(i, 2) * VW + 20, 112 + hash(i, 3) * 120], 0.6, 'rgba(180,160,220,.2)');
  for (let i = 0; i < 9; i++) { const x = hash(i, 5) * VW, y = 124 + hash(i, 6) * 60; poly(ctx, [x, y, x + 22, y - 3, x + 34, y + 2, x + 12, y + 5], 'rgba(200,210,226,.7)'); }
  // 두 탑과 사슬
  darkTower(v, 110, 150, 46, 120, 3); darkTower(v, 540, 146, 40, 104, 7); for (const k of [0, 6]) { ctx.setLineDash([6, 3]); bend(ctx, [128, 96 + k, 320, 150 + k, 524, 100 + k], 3, '#0e0a10'); ctx.setLineDash([]); }
  // 배들
  for (const [x, y, s] of [[300, 176, 1.2], [420, 150, 0.8], [220, 140, 0.6]]) { poly(ctx, [x - 50 * s, y, x + 54 * s, y, x + 42 * s, y + 14 * s, x - 40 * s, y + 14 * s], '#120e14'); rect(ctx, x - 1, y - 70 * s, 2.4 * s, 70 * s, '#120e14'); poly(ctx, [x + 2, y - 66 * s, x + 38 * s, y - 28 * s, x + 2, y - 12 * s], '#2e1c2c'); poly(ctx, [x - 2, y - 56 * s, x - 26 * s, y - 24 * s, x - 2, y - 14 * s], '#241826'); oval(ctx, x + 40 * s, y - 3 * s, 2 * s, 2 * s, '#c890f0'); glow(v, x + 40 * s, y - 3 * s, 12 * s, '#a060e0', 0.22); }
  // 부두
  poly(ctx, [0, 206, 400, 206, 430, 240, 0, 240], '#1c161e'); for (let i = 0; i < 8; i++) rect(ctx, 20 + i * 52, 196, 6, 16, '#0e0a10'); for (const x of [70, 226, 382]) { rect(ctx, x, 150, 2, 56, '#0e0a10'); oval(ctx, x + 1, 148, 4, 5, '#d8a0f8'); glow(v, x + 1, 148, 30, '#a060e0', 0.22); }
  for (const [x, y] of [[250, 214], [276, 218], [262, 200]]) rect(ctx, x, y - 14, 20, 14, '#3a2c2a');
  for (let i = 0; i < 4; i++) fiend(v, 120 + i * 30, 228 + (i % 2) * 4, 70, dfolk(i, { raw: true, f: i % 2 ? -1 : 1, noShadow: true })); rect(ctx, 138, 178, 22, 14, '#3a2c2a');
  person(v, 340, 238, 106, mine(v, { raw: true, f: 1, cloak: true, hood: true, rim: VIOLET, rimDir: 1 }));
  finish(v, { noLeaves: true });
}
/** 돌의 도시: 절벽을 깎은 골목. 양쪽으로 솟은 벽의 좁은 창, 머리 위 구름다리, 화로 켠 장터의 마족들 */
function dlCity(v) {
  const { ctx } = v; sky(v); pall(v, 0.5);
  // 양쪽 벽과 멀리 겹친 탑
  for (const [x, w, h, s] of [[300, 30, 150, 2], [340, 24, 120, 5], [270, 22, 100, 8]]) darkTower(v, x, 190, w, h, s, '#241e2c'); glow(v, 320, 120, 120, '#7a3ac0', 0.14);
  poly(ctx, [0, 0, 220, 0, 250, 190, 0, 240], '#16121a'); poly(ctx, [640, 0, 400, 0, 380, 190, 640, 240], '#1a151e');
  for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) { if (hash(i * 7 + j, 3) < 0.5) continue; const xl = 30 + i * 40 + j * 3, y = 30 + j * 26; rect(ctx, xl, y, 2.4, 10, '#c890f0'); glow(v, xl + 1, y + 5, 9, '#a060e0', 0.2); const xr = 430 + i * 42 - j * 3; rect(ctx, xr, y + 6, 2.4, 10, hash(i + j, 9) < 0.3 ? '#f0b070' : '#c890f0'); }
  // 구름다리
  poly(ctx, [236, 70, 392, 60, 392, 72, 236, 82], '#0e0a10'); for (let i = 0; i < 4; i++) fiend(v, 270 + i * 30, 70 - i * 2, 22, { raw: true, f: i % 2 ? -1 : 1, noShadow: true, noEye: true, skin: '#3a3440' });
  // 골목 바닥과 장터
  poly(ctx, [0, 240, 250, 190, 380, 190, 640, 240], '#221c26'); for (let i = 0; i < 9; i++) stroke(ctx, [250 + i * 16 - (4 - i) * 30, 240, 266 + i * 12, 192], 0.6, 'rgba(110,94,124,.25)');
  brazier(v, 200, 232, 1.1); brazier(v, 470, 226, 1, 0.16); demonBanner(v, 262, 196, 70, { raw: true }); banner(v, 384, 196, 66, '#7a1c20', { raw: true, d: -1 });
  for (const [x, c] of [[80, '#3a2030'], [540, '#2a2a40']]) { poly(ctx, [x - 40, 170, x + 44, 166, x + 40, 180, x - 44, 184], c); rect(ctx, x - 38, 182, 2, 50, '#0e0a10'); rect(ctx, x + 38, 180, 2, 50, '#0e0a10'); rect(ctx, x - 36, 212, 74, 20, '#1c161e'); }
  for (const [x, y, h, i] of [[90, 214, 80, 0], [150, 236, 104, 1], [300, 212, 60, 2], [330, 216, 64, 3], [420, 232, 98, 4], [552, 216, 84, 1], [600, 238, 110, 0]]) fiend(v, x, y, h, dfolk(i, { raw: true, f: x < 320 ? 1 : -1, robe: i === 1, rim: FIRE, rimDir: x < 320 ? 1 : -1, noShadow: h < 70 }));
  person(v, 250, 238, 108, mine(v, { raw: true, f: 1, cloak: true, hood: true, rim: FIRE, rimDir: -1 }));
  finish(v, { noLeaves: true });
}
/** 해협 초소: 얼음 낀 바다 건너 사람 땅의 불빛. 바위 위 망루와 화로 곁의 파수꾼들, 눈 */
function dlOutpost(v) {
  const { ctx } = v; sky(v); pall(v, 0.22);
  rect(ctx, 0, 120, VW, 120, '#2a3040'); for (let i = 0; i < 16; i++) { const x = hash(i, 5) * VW, y = 128 + hash(i, 6) * 70; poly(ctx, [x, y, x + 30, y - 4, x + 50, y + 2, x + 18, y + 7], 'rgba(206,216,232,.75)'); }
  // 건너편: 사람 땅의 낮은 벼랑과 봉화
  poly(ctx, [360, 120, 420, 104, 520, 100, 640, 108, 640, 120], '#3a4050'); for (const x of [440, 520, 590]) { oval(ctx, x, 100, 1.6, 1.6, '#ffb060'); glow(v, x, 100, 12, '#ff9a48', 0.24); }
  // 이쪽 바위와 망루
  poly(ctx, [0, 240, 0, 150, 80, 130, 170, 150, 260, 176, 330, 240], '#1a161e'); poly(ctx, [0, 240, 0, 190, 120, 186, 300, 214, 330, 240], '#d8dce4');
  darkTower(v, 90, 150, 44, 100, 5); demonBanner(v, 120, 60, 40, { raw: true }); rect(ctx, 60, 132, 60, 5, '#0e0a10');
  brazier(v, 216, 214, 1.1); for (const [x, i] of [[180, 0], [250, 1]]) { fiend(v, x, 216 + i * 6, 96, dfolk(i + 2, { raw: true, f: i ? -1 : 1, cloak: true, female: false, long: false, rim: FIRE, rimDir: i ? -1 : 1 })); spear(v, x + (i ? 12 : -12), 218 + i * 6, 100, 0.03); }
  // 얼음 위를 건너오는 작은 그림자들과 나
  for (let i = 0; i < 3; i++) person(v, 420 + i * 16, 168 + i * 2, 20, { raw: true, f: -1, cloth: '#15131a', hair: '#15131a', skin: '#15131a', noShadow: true });
  person(v, 300, 236, 104, mine(v, { raw: true, f: 1, cloak: true, hood: true, rim: COLD, rimDir: 1 }));
  for (let i = 0; i < 110; i++) oval(ctx, hash(i, 8) * VW, hash(i, 9) * VH, 0.8 + hash(i, 10), 0.8 + hash(i, 10), 'rgba(236,240,246,.7)');
  finish(v, { noLeaves: true });
}

// ───────── 마신 ─────────
/** 꿈의 목소리: 잠든 방의 천장이 어둠으로 열리고, 아득히 큰 것의 가느다란 틈에서 실 같은 것이 내려온다 */
function dgDream(v) {
  const { ctx } = v; room(v, { wall: '#3a3440', floor: '#221e26', fy: 190 });
  // 천장의 어둠: 겹친 고리와 가는 붉은 틈
  const g = ctx.createRadialGradient(330, 30, 10, 330, 30, 300); g.addColorStop(0, 'rgba(4,2,6,.96)'); g.addColorStop(0.5, 'rgba(10,6,14,.7)'); g.addColorStop(1, 'rgba(10,6,14,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 190);
  for (let i = 0; i < 6; i++) ring(ctx, 330, 34, 40 + i * 34, 14 + i * 13, 1.2, `rgba(150,100,180,${0.5 - i * 0.06})`);
  lit(ctx, () => { bend(ctx, [250, 36, 330, 22, 410, 36], 5, 'rgba(160,30,40,.2)'); bend(ctx, [258, 36, 330, 27, 402, 36], 1.4, 'rgba(230,90,80,.8)'); bend(ctx, [258, 36, 330, 42, 402, 36], 0.8, 'rgba(230,90,80,.5)'); });
  for (let i = 0; i < 9; i++) { const x = 270 + i * 15; bend(ctx, [x, 40, x + Math.sin(i) * 14, 100, 300 + i * 6 + Math.sin(i * 2) * 6, 176], 0.7, `rgba(170,130,190,${0.22 + (i % 3) * 0.1})`); }
  // 창과 꺼져 가는 촛불
  windowAt(v, 540, 60, 46, 70, { arch: true }); rect(ctx, 80, 196, 30, 5, '#2a2018'); rect(ctx, 92, 201, 6, 34, '#2a2018'); candle(v, 96, 196, 6); glow(v, 96, 186, 36, '#ffcf80', 0.14); smoke(v, 96, 180, 40, 8, '#3a3632', 0.2);
  // 침상과 잠든 나
  rect(ctx, 226, 200, 230, 12, '#3a2c24'); rect(ctx, 220, 172, 10, 64, '#2a2018'); rect(ctx, 450, 190, 8, 46, '#2a2018'); oval(ctx, 256, 196, 22, 7, '#a8a090');
  lying(v, 246, 200, 190, { raw: true, cover: '#5a5464', hair: v.me.hair });
  glow(v, 262, 190, 30, '#a04050', 0.14);
  // 문가의 식구: 등불을 들고 들여다본다
  rect(ctx, 590, 70, 50, 170, '#141016'); person(v, 610, 238, 104, { raw: true, f: -1, cloth: v.other.cloth, hair: v.other.hair, female: !v.me.female, long: !v.me.female, arm: 'fwd', rim: WARM, rimDir: -1 }); oval(ctx, 586, 170, 4, 5, '#f0c878'); glow(v, 586, 170, 40, '#ffcf80', 0.2);
  finish(v, { inside: true });
}
/** 파편: 무너진 방의 받침 위에 뜬 검은 조각. 빛이 그쪽으로 휘고 먼지가 거꾸로 오른다. 손을 뻗는 나와 말리는 길동무 */
function dgShard(v) {
  const { ctx } = v; room(v, { wall: '#3e3a3c', floor: '#242022', fy: 186, stone: true });
  for (const x of [90, 550]) { rect(ctx, x, 20, 30, 170, '#4a4648'); rect(ctx, x - 5, 20, 40, 9, '#57524f'); rect(ctx, x + 20, 30, 10, 156, 'rgba(0,0,0,.25)'); } poly(ctx, [480, 186, 500, 150, 530, 160, 546, 186], '#3a3638'); poly(ctx, [140, 186, 160, 170, 190, 186], '#3a3638');
  shaft(v, 260, 0, 60, 190, 60, '#c8c8d8', 0.1);
  // 받침과 조각
  poly(ctx, [296, 236, 344, 236, 338, 190, 302, 190], '#4a4648'); rect(ctx, 294, 184, 52, 8, '#57524f');
  const g = ctx.createRadialGradient(320, 140, 4, 320, 140, 90); g.addColorStop(0, 'rgba(6,2,8,.9)'); g.addColorStop(0.4, 'rgba(20,8,26,.45)'); g.addColorStop(1, 'rgba(20,8,26,0)'); ctx.fillStyle = g; ctx.fillRect(220, 40, 200, 200);
  poly(ctx, [320, 112, 330, 132, 326, 150, 334, 164, 318, 172, 308, 154, 314, 138, 308, 124], '#08060a'); stroke(ctx, [320, 114, 329, 132, 325, 150, 333, 163], 0.8, 'rgba(200,120,220,.7)');
  lit(ctx, () => { for (let i = 0; i < 3; i++) ring(ctx, 320, 142, 30 + i * 16, 36 + i * 18, 0.7, `rgba(170,90,200,${0.4 - i * 0.1})`, 0, 0.4 + i, 4 + i); });
  for (let i = 0; i < 26; i++) { const x = 270 + hash(i, 2) * 100, y = 60 + hash(i, 3) * 130; stroke(ctx, [x, y, x + (320 - x) * 0.06, y - 5], 0.7, 'rgba(210,200,220,.5)'); }
  // 바닥의 금 간 원과 시든 풀
  ring(ctx, 320, 228, 90, 10, 1, 'rgba(200,190,210,.3)'); for (let i = 0; i < 8; i++) { const x = 250 + i * 20; stroke(ctx, [x, 236, x + (i % 2 ? 3 : -3), 226], 0.8, '#4a4434'); }
  // 나와 길동무
  person(v, 232, 238, 112, mine(v, { raw: true, f: 1, arm: 'fwd', rim: VIOLET, rimDir: 1 }));
  person(v, 186, 238, 108, { raw: true, f: 1, cloth: v.other.cloth, hair: v.other.hair, female: !v.me.female, long: !v.me.female, arm: 'fwd', cloak: true }); torch(v, 160, 200, 30, 6);
  person(v, 440, 238, 100, hooded(0, { raw: true, f: -1, pose: 'kneel', arm: 'chest', rim: VIOLET, rimDir: -1 }));
  finish(v, { inside: true });
}
/** 옛 사도: 검은 해 뜨는 새벽, 무너진 기둥 사이 바위에 선 긴 그림자. 손목에 끊어진 사슬, 무릎 꿇은 몇 사람 */
function dgApostle(v) {
  const { ctx } = v; sky(v); pall(v, 0.3); const fn = far(v, { peaks: true });
  // 검은 해
  glow(v, 330, 84, 130, '#e8a070', 0.22); oval(ctx, 330, 84, 30, 30, '#0a080c'); ring(ctx, 330, 84, 31, 31, 1.6, 'rgba(255,210,160,.8)'); for (let i = 0; i < 14; i++) { const a = i * TAU / 14; stroke(ctx, [330 + Math.cos(a) * 36, 84 + Math.sin(a) * 36, 330 + Math.cos(a) * (46 + (i % 2) * 14), 84 + Math.sin(a) * (46 + (i % 2) * 14)], 0.8, 'rgba(255,210,160,.4)'); }
  const g = (x) => Math.max(fn(x), 150) + 30; ground(v, g, { color: '#4a4640', color2: '#2a2826', plain: true });
  // 무너진 기둥들
  for (const [x, h, lean] of [[90, 120, 0], [170, 70, 0.08], [500, 100, -0.05], [580, 140, 0]]) { ctx.save(); ctx.translate(x, 214); ctx.rotate(lean); rect(ctx, -12, -h, 24, h, '#3a3638'); rect(ctx, 2, -h, 10, h, '#2a2628'); poly(ctx, [-12, -h, -4, -h - 10, 6, -h - 2, 12, -h], '#3a3638'); ctx.restore(); } poly(ctx, [220, 226, 262, 218, 270, 230, 226, 236], '#3a3638');
  // 바위와 사도
  poly(ctx, [270, 232, 290, 180, 330, 168, 372, 178, 396, 232], '#1c1a1e');
  person(v, 330, 172, 100, { raw: true, f: 0, cloth: '#141216', hair: '#141216', hood: true, robe: true, arm: 'up', noShadow: true, rim: 'rgba(255,200,150,.5)', rimDir: 1 });
  ctx.setLineDash([2.4, 2]); for (const k of [-1, 1]) stroke(ctx, [330 + k * 13, 74, 330 + k * 15, 100, 330 + k * 12, 112], 1.2, '#6a6e76'); ctx.setLineDash([]);
  // 무릎 꿇은 이들과 떨어져 선 나
  for (let i = 0; i < 6; i++) person(v, 190 + i * 54 + (i > 2 ? 30 : 0), 234 + (i % 2) * 4, 88, hooded(i, { raw: true, f: i > 2 ? -1 : 1, pose: 'kneel', arm: i % 2 ? 'chest' : 'up' }));
  person(v, 600, 238, 108, mine(v, { raw: true, f: -1, cloak: true, rim: 'rgba(255,200,150,.5)', rimDir: -1 })); crows(v, 470, 50, 4, 60);
  finish(v, { noLeaves: true });
}
/** 마신교 모임: 지하실 바닥의 일곱 점 고리 둘레에 무릎 꿇은 두건들. 가운데 선 사람, 문턱에 선 나 */
function dgCult(v) {
  const { ctx } = v; room(v, { wall: '#34302e', floor: '#1e1a1a', fy: 178, stone: true });
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(VW, 0); ctx.lineTo(VW, 26); ctx.quadraticCurveTo(320, 70, 0, 26); ctx.fill();
  for (const x of [150, 490]) { rect(ctx, x, 60, 24, 120, '#2a2624'); rect(ctx, x - 4, 60, 32, 8, '#3a3634'); } for (const [x, w] of [[30, 40], [560, 50]]) { rect(ctx, x, 140, w, 40, '#3a2c20'); ring(ctx, x + w / 2, 160, w / 2, 20, 1, '#1c1410'); }
  // 벽의 천: 일곱 줄
  poly(ctx, [280, 50, 360, 50, 360, 140, 320, 128, 280, 140], '#141014'); for (let i = 0; i < 7; i++) stroke(ctx, [290 + i * 10, 60, 290 + i * 10, 76 + Math.abs(3 - i) * 12], 1.4, i === 3 ? '#8a2e2a' : '#8a8088');
  // 바닥의 고리와 일곱 촛불
  ring(ctx, 320, 216, 150, 20, 1.4, 'rgba(210,200,190,.5)'); ring(ctx, 320, 216, 110, 14, 0.8, 'rgba(210,200,190,.35)');
  for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI, x = 320 + Math.cos(a) * 150, y = 216 + Math.sin(a) * 20; candle(v, x, y, 6); glow(v, x, y - 8, 30, '#ffb070', 0.16); }
  // 뒤쪽 반원의 두건들
  for (let i = 0; i < 7; i++) { const a = Math.PI + ((i + 0.5) / 7) * Math.PI, x = 320 + Math.cos(a) * 190, y = 212 + Math.sin(a) * 26; person(v, x, y, 84, hooded(i, { raw: true, f: x < 320 ? 1 : -1, pose: 'kneel', arm: 'chest', noShadow: true, rim: FIRE, rimDir: x < 320 ? 1 : -1 })); }
  // 가운데 선 사람: 덮은 것을 든다
  person(v, 320, 222, 104, { raw: true, f: 1, cloth: '#2a1418', hair: '#141214', hood: true, robe: true, arm: 'fwd', rim: FIRE, rimDir: 1 }); poly(ctx, [336, 150, 356, 150, 358, 164, 334, 164], '#141014'); glow(v, 346, 156, 16, '#a04050', 0.2);
  // 앞줄(등)과 문턱의 나
  for (let i = 0; i < 4; i++) person(v, 200 + i * 80, 262, 96, hooded(i, { raw: true, f: 0, noShadow: true }));
  rect(ctx, 590, 70, 50, 170, '#0e0c0e'); person(v, 600, 238, 108, mine(v, { raw: true, f: -1, cloak: true, hood: true, rim: FIRE, rimDir: -1 }));
  finish(v, { inside: true });
}
/** 봉인 전쟁의 벽화: 횃불에 드러난 옛 그림. 뿔 달린 큰 그림자 둘레에 박힌 일곱 쐐기, 창을 든 작은 사람들 */
function dgWar(v) {
  const { ctx } = v; room(v, { wall: '#5a5044', floor: '#2a241e', fy: 196, stone: true });
  rect(ctx, 60, 16, 520, 170, '#6e6250'); rect(ctx, 60, 16, 520, 4, '#3a3228'); rect(ctx, 60, 182, 520, 4, '#3a3228');
  const ink = '#2a1c18', red = '#7a2e22', och = '#c8a060';
  // 큰 그림자: 뿔과 어깨
  poly(ctx, [236, 182, 262, 120, 284, 104, 292, 66, 304, 84, 312, 40, 320, 78, 328, 34, 336, 84, 348, 62, 356, 104, 380, 122, 404, 182], ink);
  stroke(ctx, [320, 92, 320, 150], 2.4, red); for (const k of [-1, 1]) stroke(ctx, [320 + k * 30, 130, 320 + k * 62, 176], 5, ink);
  for (let i = 0; i < 6; i++) stroke(ctx, [262 + i * 22, 182, 270 + i * 20, 150 + (i % 2) * 10], 0.7, '#6e6250');
  // 일곱 쐐기와 묶은 줄
  for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI, x = 320 + Math.cos(a) * 150, y = 170 + Math.sin(a) * 120; poly(ctx, [x - 5, y - 16, x + 5, y - 16, x, y + 8], och); stroke(ctx, [x, y, 320 + Math.cos(a) * 60, 140 + Math.sin(a) * 40], 0.8, och); }
  // 작은 사람들: 왼쪽은 창 든 군세, 오른쪽은 뿔 달린 무리
  for (let i = 0; i < 9; i++) { const x = 80 + i * 13, y = 176 - (i % 3) * 2; stroke(ctx, [x, y, x, y - 12], 2.4, red); oval(ctx, x, y - 15, 2.4, 2.4, red); stroke(ctx, [x + 3, y - 2, x + 5, y - 24], 0.7, ink); }
  for (let i = 0; i < 8; i++) { const x = 470 + i * 13, y = 176 - (i % 3) * 2; stroke(ctx, [x, y, x, y - 12], 2.4, ink); oval(ctx, x, y - 15, 2.4, 2.4, ink); stroke(ctx, [x - 2, y - 17, x - 4, y - 21], 0.7, ink); stroke(ctx, [x + 2, y - 17, x + 4, y - 21], 0.7, ink); }
  // 해와 별, 벗겨진 자리
  ring(ctx, 120, 50, 12, 12, 2, och); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; stroke(ctx, [120 + Math.cos(a) * 16, 50 + Math.sin(a) * 16, 120 + Math.cos(a) * 22, 50 + Math.sin(a) * 22], 1.2, och); }
  for (let i = 0; i < 14; i++) oval(ctx, 80 + hash(i, 3) * 480, 30 + hash(i, 4) * 140, 6 + hash(i, 5) * 10, 3 + hash(i, 6) * 5, 'rgba(90,80,68,.5)', hash(i, 7) * 3);
  ctx.fillStyle = 'rgba(10,8,8,.5)'; ctx.fillRect(0, 0, 60, VH); ctx.fillRect(470, 0, 170, VH); const g = ctx.createRadialGradient(250, 120, 30, 250, 120, 260); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,6,6,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // 나와 횃불, 뒤의 늙은 길잡이
  person(v, 200, 240, 112, mine(v, { raw: true, f: 1, arm: 'up', cloak: true, rim: FIRE, rimDir: 1 })); torch(v, 214, 136, 28, 8); glow(v, 216, 108, 130, '#ff9a48', 0.16);
  person(v, 120, 240, 100, { raw: true, f: 1, old: true, cloth: '#4a4438', hair: '#a8a49c', stick: 'staff', hood: true });
  finish(v, { inside: true });
}
/** 쐐기 앞의 선택: 금 간 큰 쐐기돌의 붉은 숨. 왼쪽은 지키는 흰 망토들, 오른쪽은 검은 두건들, 가운데 등 돌린 나 */
function dgChoice(v) {
  const { ctx } = v; sky(v); pall(v, 0.26); const fn = far(v, { peaks: true }); const g = (x) => Math.max(fn(x), 150) + 30; ground(v, g, { color: '#4e4a44', color2: '#2e2c2a', plain: true });
  for (let i = 0; i < 3; i++) rect(ctx, 0, 150 + i * 22, VW, 12, 'rgba(180,170,180,.1)');
  // 쐐기돌: 땅에 박힌 큰 돌못, 금과 붉은 빛, 감은 사슬
  poly(ctx, [286, 40, 354, 40, 362, 60, 336, 222, 304, 222, 278, 60], '#3e3a3e'); poly(ctx, [322, 40, 354, 40, 362, 60, 336, 222, 322, 222], '#2a2629'); rect(ctx, 276, 34, 88, 10, '#4a4649');
  glow(v, 320, 150, 80, '#c8463a', 0.16); for (const p of [[310, 70, 318, 100, 308, 130, 320, 166, 314, 200], [330, 90, 324, 120, 334, 150], [300, 110, 308, 130]]) { stroke(ctx, p, 3.4, 'rgba(200,70,58,.25)'); stroke(ctx, p, 1.1, '#e8705a'); }
  ctx.setLineDash([4, 2.4]); for (const y of [84, 140]) bend(ctx, [282 + (y - 84) * 0.12, y, 320, y + 12, 358 - (y - 84) * 0.12, y], 2, '#15131a'); stroke(ctx, [290, 150, 230, 226], 1.6, '#15131a'); stroke(ctx, [350, 150, 410, 226], 1.6, '#15131a'); ctx.setLineDash([]);
  oval(ctx, 320, 226, 50, 6, '#1c1a1c');
  // 지키는 쪽
  for (let i = 0; i < 4; i++) person(v, 60 + i * 44, 232 + (i % 2) * 4, 104, { raw: true, f: 1, cloth: '#c8c4b8', hair: HR[i], cloak: true, hat: i === 1, stick: i % 2 ? 'spear' : undefined, arm: i === 3 ? 'fwd' : undefined }); banner(v, 40, 236, 130, '#d8d0b8', { raw: true, mark: '#c8a850', d: 1 }); sunSign(v, 56, 124, 0.1, '#c8a850');
  // 깨려는 쪽
  for (let i = 0; i < 4; i++) person(v, 448 + i * 44, 232 + (i % 2) * 4, 104, hooded(i, { raw: true, f: -1, arm: i === 0 ? 'fwd' : undefined, stick: i === 2 ? 'torch' : undefined, rim: RED, rimDir: -1 })); stroke(ctx, [440, 196, 470, 200], 2.4, '#3a2c20'); rect(ctx, 428, 190, 14, 10, '#5a5e66');
  // 나
  person(v, 320, 240, 112, mine(v, { raw: true, f: 0, cloak: true, rim: RED, rimDir: 1 }));
  finish(v, { noLeaves: true });
}

// ───────── 검 ─────────
const sheath = (v, x, y, h, f, c = '#2a2018') => stroke(v.ctx, [x + f * h * 0.06, y - h * 0.5, x - f * h * 0.2, y - h * 0.36], 2.2, c);
const axe = (v, hx, hy, f, ang, len) => { const { ctx } = v, dx = Math.cos(ang) * f, dy = -Math.sin(ang), tx = hx + dx * len, ty = hy + dy * len; stroke(ctx, [hx - dx * len * 0.3, hy - dy * len * 0.3, tx, ty], 2.6, '#3a2c20'); poly(ctx, [tx - dx * 8, ty - dy * 8, tx - dx * 10 - dy * 13 * f, ty - dy * 10 + dx * 13 * f, tx + dx * 4 - dy * 15 * f, ty + dy * 4 + dx * 15 * f, tx + dx * 2, ty + dy * 2], '#9aa0a8'); return [tx, ty]; };
/** 유수류: 성 뜰의 대련. 내리친 칼을 비스듬히 흘려보내는 순간, 물결 같은 호 */
function swFlow(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 540, 150, {}); const g = (x) => Math.max(fn(x), 150) + 30; ground(v, g, { color: '#7a745a', color2: '#4e4a3a', plain: true });
  rect(ctx, 0, 70, 250, 120, t('#8a8474')); for (let i = 0; i < 7; i++) rect(ctx, i * 38, 62, 22, 9, t('#8a8474')); rect(ctx, 90, 110, 50, 80, t('#3a3430')); poly(ctx, [90, 110, 115, 92, 140, 110], t('#3a3430')); banner(v, 200, 190, 130, '#2e4a6e', { mark: '#d8d0b8', d: 1 });
  for (let i = 0; i < 4; i++) { rect(ctx, 520 + i * 30, 176, 3, 40, t('#3a2c20')); stroke(ctx, [512 + i * 30, 186, 530 + i * 30, 186], 2, t('#3a2c20')); oval(ctx, 521.5 + i * 30, 172, 5, 6, t('#8a7a5a')); }
  person(v, 96, 236, 110, { f: 1, old: true, cloth: '#2e4a6e', hair: '#a8a49c', cloak: true, stick: 'staff' }); for (let i = 0; i < 3; i++) person(v, 560 + i * 30, 234 + (i % 2) * 4, 92, folk(i + 3, { f: -1, female: false, long: false }));
  // 상대: 내리친 칼이 미끄러진다
  person(v, 392, 236, 112, { f: -1, cloth: '#5a5e68', hair: '#2a1e16', arm: 'fwd', rim: WARM, rimDir: -1 }); { const [hx, hy] = handOf(392, 236, 112, -1); blade(v, hx, hy, -1, -0.5, 44); }
  // 나: 비스듬히 받아 흘린다
  person(v, 290, 236, 112, mine(v, { f: 1, arm: 'fwd', rim: WARM, rimDir: -1 })); { const [hx, hy] = handOf(290, 236, 112, 1); blade(v, hx, hy, 1, 0.5, 46); }
  lit(ctx, () => { for (let i = 0; i < 4; i++) bend(ctx, [300 + i * 8, 120 + i * 6, 380 + i * 6, 150 + i * 10, 350 - i * 4, 204 + i * 4, 320 - i * 10, 226 + i * 2, 250 + i * 6, 220], 1.2 - i * 0.2, `rgba(170,210,240,${0.5 - i * 0.1})`); });
  for (let i = 0; i < 7; i++) oval(ctx, 340 + hash(i, 2) * 30, 160 + hash(i, 3) * 20, 0.9, 0.9, 'rgba(255,240,200,.9)');
  finish(v, { noLeaves: true });
}
/** 강검류: 제국 연병장. 온몸을 실은 내려치기에 통나무가 갈라지고, 뒤에서는 줄 맞춘 병사들이 같은 자세로 칼을 든다 */
function swHeavy(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); const g = (x) => Math.max(fn(x), 150) + 28; ground(v, g, { color: '#6a6452', color2: '#444036', plain: true });
  rect(ctx, 0, 100, VW, 80, t('#4a4644')); for (let i = 0; i < 17; i++) rect(ctx, i * 40, 92, 24, 9, t('#4a4644')); for (const x of [60, 580]) banner(v, x, 186, 120, '#1c1a1e', { mark: '#8a2e2a', d: x < 320 ? 1 : -1 });
  for (let i = 0; i < 8; i++) { const x = 110 + i * 60; person(v, x, 210, 78, { f: 1, cloth: '#3a3e48', hair: '#1c1614', hat: true, arm: 'up', noShadow: true }); const [hx, hy] = handOf(x, 210, 78, 1, 'up'); blade(v, hx, hy, 1, 1.9, 26, { w: 1.2 }); }
  // 갈라지는 통나무와 튀는 나뭇조각
  poly(ctx, [352, 236, 366, 236, 362, 176, 350, 170], t('#6a5238')); poly(ctx, [372, 236, 388, 236, 392, 172, 378, 178], t('#5a4630')); stroke(ctx, [366, 236, 370, 180], 1.4, t('#d8c8a0'));
  for (let i = 0; i < 12; i++) { ctx.save(); ctx.translate(350 + hash(i, 2) * 60, 130 + hash(i, 3) * 60); ctx.rotate(hash(i, 4) * 3); rect(ctx, -3, -1, 6, 2, t('#c8b088')); ctx.restore(); }
  slash(ctx, 300, 172, 76, -1.2, 0.5, 'rgba(240,236,220,.6)', 3);
  // 나
  person(v, 300, 238, 114, mine(v, { f: 1, arm: 'fwd', rim: WARM, rimDir: -1 })); { const [hx, hy] = handOf(300, 238, 114, 1); blade(v, hx, hy, 1, -0.35, 52, { w: 2.6 }); }
  smoke(v, 366, 232, 20, 30, '#b0a488', 0.24);
  // 교관
  person(v, 500, 238, 112, { f: -1, cloth: '#2a2a30', hair: '#3a2a1e', cloak: true, hat: true, arm: 'chest' }); sheath(v, 500, 238, 112, -1);
  finish(v, { noLeaves: true });
}
/** 환영류: 해 질 녘 골목. 상대의 칼은 잔상을 베고, 나는 이미 낮게 파고들었다 */
function swFeint(v) {
  const { ctx, t } = v; sky(v); facade(v, 0, 220, 10, 196, { door: 60, lit: true }); facade(v, 430, 210, 20, 196, { wall: '#5e5648', door: 520 }); rect(ctx, 220, 60, 210, 136, t('#2e2a2e')); rect(ctx, 0, 196, VW, 44, t('#4a4644')); for (let i = 0; i < 40; i++) oval(ctx, hash(i, 2) * VW, 200 + hash(i, 3) * 38, 9, 2.4, rgba(t('#5e5a54'), 0.5));
  rect(ctx, 232, 110, 3, 20, t('#2a2018')); oval(ctx, 240, 132, 5, 6, '#f0c878'); glow(v, 240, 132, 60, '#ffcf80', 0.2); pool(v, 300, 226, 110, 10, '#ffcf80', 0.1);
  // 잔상 둘
  for (const [x, a] of [[352, 0.3], [322, 0.16]]) { ctx.save(); ctx.globalAlpha = a; person(v, x, 236, 112, mine(v, { f: 1, arm: 'fwd', noShadow: true })); ctx.restore(); }
  // 상대
  person(v, 420, 236, 114, { f: -1, cloth: '#3a342e', hair: '#1c1614', cloak: true, arm: 'fwd', rim: WARM, rimDir: -1 }); { const [hx, hy] = handOf(420, 236, 114, -1); blade(v, hx, hy, -1, 0.1, 48); } slash(ctx, 396, 160, 50, 1.9, 3.6, 'rgba(230,238,255,.5)', 2);
  // 나: 낮게
  person(v, 284, 240, 112, mine(v, { f: 1, pose: 'kneel', arm: 'fwd', rim: WARM, rimDir: -1 })); { const [hx, hy] = handOf(284, 240, 112, 1, 'fwd', 24); blade(v, hx, hy, 1, 0.12, 50); }
  lit(ctx, () => { bend(ctx, [250, 214, 300, 230, 350, 206], 1, 'rgba(230,238,255,.4)'); });
  person(v, 580, 236, 100, folk(1, { f: -1, arm: 'chest' })); person(v, 60, 236, 104, hooded(0, { f: 1 }));
  finish(v, { noLeaves: true });
}
/** 드워프 도끼술: 화로 빛의 돌방. 방패 건 기둥을 찍는 도끼와 불똥, 팔짱 낀 스승 */
function swAxe(v) {
  const { ctx } = v; room(v, { wall: '#3e3a36', floor: '#26221e', fy: 184, stone: true });
  rect(ctx, 0, 30, VW, 10, '#2e2a26'); for (let i = 0; i < 44; i++) { const x = 8 + i * 14.4; stroke(ctx, i % 2 ? [x, 32, x + 5, 38, x + 9, 32] : [x + 2, 32, x + 2, 38, x + 7, 35], 0.9, '#8a7450'); }
  ctx.fillStyle = '#15110e'; ctx.beginPath(); ctx.moveTo(40, 186); ctx.lineTo(40, 110); ctx.quadraticCurveTo(90, 66, 140, 110); ctx.lineTo(140, 186); ctx.fill(); for (const [x, s2] of [[74, 9], [92, 12], [110, 9]]) flame(v, x, 180, s2); glow(v, 92, 160, 130, '#ff8a3a', 0.2); pool(v, 220, 226, 170, 12, '#ff9a48', 0.12);
  for (let i = 0; i < 5; i++) axe(v, 520 + i * 22, 150, 1, 1.57, 50); rect(ctx, 506, 96, 110, 5, '#2a2018');
  // 방패 건 기둥
  rect(ctx, 404, 110, 14, 126, '#4a3a2a'); oval(ctx, 411, 160, 26, 30, '#5a4636'); ring(ctx, 411, 160, 26, 30, 2.4, '#6a6e76'); oval(ctx, 411, 160, 6, 7, '#8a8e96'); for (const p of [[396, 140, 410, 152], [420, 170, 430, 184]]) stroke(ctx, p, 1.4, '#1c1410');
  // 나
  if (v.me.race === 'dwarf') dwarf(v, 340, 238, 112, mine(v, { raw: true, f: 1, arm: 'fwd', rim: FIRE, rimDir: -1 })); else person(v, 340, 238, 108, mine(v, { raw: true, f: 1, arm: 'fwd', rim: FIRE, rimDir: -1 }));
  { const [hx, hy] = handOf(340, 238, 108, 1); const [tx, ty] = axe(v, hx, hy, 1, 0.2, 34); for (let i = 0; i < 12; i++) oval(ctx, tx + 4 + hash(i, 2) * 26, ty - 14 + hash(i, 3) * 30, 1, 1, `rgba(255,${190 + Math.floor(hash(i, 4) * 50)},110,.9)`); glow(v, tx + 6, ty, 16, '#ffd08a', 0.24); }
  slash(ctx, 344, 170, 56, -1.5, 0.1, 'rgba(255,210,160,.5)', 2.6);
  // 스승과 지켜보는 이들
  dwarf(v, 220, 238, 118, { raw: true, f: 1, old: true, cloth: '#5a2e22', hair: '#c8c4bc', beard: '#d0ccc4', arm: 'chest', rim: FIRE, rimDir: -1 });
  for (let i = 0; i < 3; i++) dwarf(v, 500 + i * 40, 236, 100, { raw: true, f: -1, cloth: CL[i], hair: HR[i + 1], hat: i === 1 });
  finish(v, { inside: true });
}
/** 엘프 쌍검: 숲 빈터. 두 칼이 그린 겹친 호 사이로 떨어지던 잎이 반으로 갈린다 */
function swTwin(v) {
  const { ctx, t } = v; sky(v); rect(ctx, 0, 0, VW, VH, t('#3a5040')); for (let i = 0; i < 14; i++) rect(ctx, i * 50 + hash(i, 2) * 20, 0, 12 + hash(i, 3) * 18, 200, rgba(t('#22302a'), 0.7)); glow(v, 320, 80, 240, '#d8e8b0', 0.14);
  for (let i = 0; i < 4; i++) shaft(v, 180 + i * 90, 0, 36, 210, 50, '#e8f0c0', 0.07);
  rect(ctx, 0, 196, VW, 44, t('#33442c')); for (let i = 0; i < 50; i++) oval(ctx, hash(i, 4) * VW, 200 + hash(i, 5) * 40, 8, 2, rgba(t('#4a5e34'), 0.6));
  for (const [x, w] of [[40, 60], [600, 70]]) { poly(ctx, [x - w / 2, 0, x + w / 2, 0, x + w * 0.7, 206, x - w * 0.7, 206], t('#2a221a')); }
  // 스승: 두 칼
  elf(v, 390, 236, 112, { f: -1, cloth: '#4a5a4a', hair: '#c8c0a0', arm: 'fwd', rim: COLD, rimDir: -1 }); { const [hx, hy] = handOf(390, 236, 112, -1); blade(v, hx, hy, -1, 0.9, 30); blade(v, hx + 8, hy + 12, -1, -0.3, 30); }
  slash(ctx, 372, 160, 44, 2.2, 4.3, 'rgba(220,240,220,.6)', 2); slash(ctx, 378, 172, 34, 1.2, 3.2, 'rgba(220,240,220,.5)', 1.6);
  // 반으로 갈린 잎들
  for (let i = 0; i < 12; i++) { const x = 300 + hash(i, 6) * 80, y = 90 + hash(i, 7) * 110, a = hash(i, 8) * 3; for (const k of [-1, 1]) { ctx.save(); ctx.translate(x + k * 2.4, y + k * 1.4); ctx.rotate(a); ctx.fillStyle = t(i % 2 ? '#7a9a3a' : '#a89a3a'); ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, k > 0 ? 0 : Math.PI, k > 0 ? Math.PI : TAU); ctx.fill(); ctx.restore(); } }
  // 나: 따라 한다
  if (v.me.race === 'elf') elf(v, 250, 236, 110, mine(v, { f: 1, arm: 'fwd' })); else person(v, 250, 236, 110, mine(v, { f: 1, arm: 'fwd' })); { const [hx, hy] = handOf(250, 236, 110, 1); blade(v, hx, hy, 1, 0.7, 28); blade(v, hx - 8, hy + 12, 1, -0.2, 28); }
  elf(v, 520, 236, 104, { f: -1, cloth: '#3e4a52', hair: '#3a2a1e', robe: true, arm: 'chest' }); elf(v, 130, 238, 64, { f: 1, child: true, thin: 1, cloth: '#5a6a52', hair: '#8a6a44' });
  finish(v);
}
/** 수인 맨손: 해 질 녘 돌 둘레 안. 손바닥과 주먹이 맞닿기 직전, 발밑의 먼지 */
function swFist(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => Math.max(fn(x), 150) + 28; ground(v, g, { color: '#8a7a44', color2: '#5a4e2e', tufts: 60 });
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, x = 320 + Math.cos(a) * 190, y = 222 + Math.sin(a) * 18; oval(ctx, x, y, 9, 5, t(i % 2 ? '#6a665e' : '#55514c')); }
  for (let i = 0; i < 6; i++) beastman(v, 70 + i * 28 + (i > 2 ? 400 : 0), 214 + (i % 2) * 4, 80, i % 2 ? 'tiger' : 'wolf', { f: i > 2 ? -1 : 1, cloth: CL[i], pose: i % 3 === 0 ? 'sit' : 'stand', noShadow: true });
  // 스승
  beastman(v, 378, 236, 116, 'tiger', { f: -1, cloth: '#4a3a2e', arm: 'fwd', rim: FIRE, rimDir: -1 });
  // 나
  if (v.me.race === 'beast') beastman(v, 268, 236, 110, 'wolf', mine(v, { f: 1, arm: 'fwd', hair: undefined })); else person(v, 268, 236, 110, mine(v, { f: 1, arm: 'fwd', rim: FIRE, rimDir: 1 }));
  lit(ctx, () => { for (let i = 0; i < 3; i++) ring(ctx, 322, 162, 8 + i * 8, 12 + i * 10, 1, `rgba(255,236,200,${0.5 - i * 0.14})`, 0, -1 + i * 0.2, 1 - i * 0.2); });
  for (const x of [258, 284, 366, 392]) smoke(v, x, 234, 16, 20, '#c8b890', 0.22);
  finish(v, { noLeaves: true });
}
/** 검기: 새벽 벼랑. 칼끝을 떠난 흰 호가 선돌을 비스듬히 가르고 지나간다 */
function swAura(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); const g = (x) => (x > 500 ? 186 + (x - 500) * 0.5 : 180 - Math.sin(x / 110) * 6); ground(v, g, { color: '#5e6650', color2: '#3a4034', tufts: 50 });
  glow(v, 560, 120, 140, '#ffd8a0', 0.18); tree(v, 60, 210, 130, { bare: true });
  // 갈린 선돌: 윗동이 미끄러져 내린다
  poly(ctx, [404, 232, 448, 232, 446, 150, 406, 174], t('#6e675c')); poly(ctx, [428, 232, 448, 232, 446, 150, 428, 161], t('#4e4840'));
  poly(ctx, [412, 162, 452, 138, 450, 74, 438, 60, 416, 72], t('#6e675c')); poly(ctx, [434, 149, 452, 138, 450, 74, 438, 60], t('#4e4840'));
  lit(ctx, () => { stroke(ctx, [402, 176, 450, 147], 2.4, 'rgba(240,244,255,.7)'); stroke(ctx, [396, 180, 456, 143], 7, 'rgba(200,220,255,.16)'); });
  // 날아간 호와 누운 풀
  slash(ctx, 300, 166, 150, -0.5, 0.42, 'rgba(236,242,255,.75)', 3.4); slash(ctx, 300, 166, 190, -0.4, 0.3, 'rgba(236,242,255,.4)', 2);
  for (let i = 0; i < 24; i++) { const x = 270 + i * 8; stroke(ctx, [x, 232 - (i % 3), x + 7, 228 - (i % 3)], 0.8, rgba(t('#8a9a6a'), 0.8)); }
  // 나
  person(v, 232, 238, 114, mine(v, { f: 1, arm: 'fwd', cloak: true, rim: 'rgba(230,238,255,.6)', rimDir: 1 })); { const [hx, hy] = handOf(232, 238, 114, 1); const [tx, ty] = blade(v, hx, hy, 1, 0.08, 54, { color: '#f0f4ff' }); lit(ctx, () => stroke(ctx, [hx, hy, tx, ty], 6, 'rgba(200,220,255,.22)')); glow(v, tx, ty, 16, '#e0e8ff', 0.24); }
  // 멀리서 본 사람
  person(v, 110, 236, 96, { f: 1, old: true, cloth: '#4a4a3e', hair: '#a8a49c', stick: 'staff', cloak: true });
  finish(v, { noLeaves: true });
}
/** 승급: 유파의 큰 방. 단 위에 앉은 세 어른, 무릎 꿇은 내게 칼집째 내미는 칼 */
function swRank(v) {
  const { ctx } = v; room(v, { wall: '#5e5446', floor: '#3a3026', fy: 184 });
  for (const x of [120, 300, 480]) { windowAt(v, x, 30, 40, 80, { arch: true }); shaft(v, x + 20, 110, 40, 110, -60, '#e8e0c0', 0.1); }
  for (const x of [60, 240, 420, 600]) banner(v, x, 170, 120, '#2e4a6e', { raw: true, mark: '#d8d0b8', d: 1 });
  // 단과 세 어른
  rect(ctx, 400, 196, 240, 12, '#4a3a2a'); rect(ctx, 400, 208, 240, 30, '#3a2c20');
  for (let i = 0; i < 3; i++) { person(v, 470 + i * 60, 214, 110, { raw: true, f: -1, pose: 'sit', old: i !== 2, cloth: ['#2e4a6e', '#5a2630', '#3a3e44'][i], hair: i === 2 ? '#2a1e16' : '#b8b4ac', robe: true, arm: 'chest' }); rect(ctx, 458 + i * 60, 180, 30, 5, '#2a2018'); }
  // 칼걸이의 칼들
  rect(ctx, 20, 120, 4, 70, '#2a2018'); rect(ctx, 96, 120, 4, 70, '#2a2018'); for (let i = 0; i < 4; i++) { stroke(ctx, [16, 130 + i * 16, 104, 130 + i * 16], 1.2, '#2a2018'); stroke(ctx, [26, 128 + i * 16, 92, 128 + i * 16], 2.2, ['#1c1614', '#5a2630', '#2e4a6e', '#3a2c20'][i]); }
  // 건네는 이와 나
  person(v, 372, 236, 112, { raw: true, f: -1, cloth: '#3a3e44', hair: '#3a2a1e', arm: 'fwd', rim: WARM, rimDir: -1 }); { const [hx, hy] = handOf(372, 236, 112, -1); stroke(ctx, [hx - 34, hy + 2, hx + 10, hy - 2], 3, '#1c1614'); stroke(ctx, [hx + 10, hy - 2, hx + 20, hy - 3], 2.4, '#6a5a3a'); stroke(ctx, [hx - 34, hy + 2, hx - 30, hy + 2], 3, '#9a8450'); }
  person(v, 292, 240, 112, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', rim: WARM, rimDir: 1 }));
  // 줄지어 앉은 문하
  for (let i = 0; i < 5; i++) person(v, 60 + i * 40, 240 + (i % 2) * 4, 96, folk(i, { raw: true, f: 1, pose: 'kneel', female: i === 2, long: i === 2 }));
  finish(v, { inside: true });
}
/** 이름난 검객과 겨루기: 안개 낀 새벽의 돌다리. 칼자루에 손을 얹고 마주 선 두 사람, 다리 양 끝에 모인 사람들 */
function swRival(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 110, 140, {}); glow(v, 500, 110, 130, '#ffd8a0', 0.16);
  rect(ctx, 0, 150, VW, 90, t('#5a6a74')); for (let i = 0; i < 30; i++) stroke(ctx, [hash(i, 2) * VW, 160 + hash(i, 3) * 76, hash(i, 2) * VW + 22, 160 + hash(i, 3) * 76], 0.6, 'rgba(220,230,236,.3)'); void fn;
  // 돌다리
  for (const x of [130, 470]) { rect(ctx, x, 150, 40, 90, t('#4a463e')); rect(ctx, x + 26, 150, 14, 90, t('#3a362e')); poly(ctx, [x - 8, 240, x + 20, 226, x + 48, 240], t('#3a362e')); }
  ctx.fillStyle = t('#5a564e'); ctx.beginPath(); ctx.moveTo(0, 150); ctx.quadraticCurveTo(320, 118, 640, 150); ctx.lineTo(640, 176); ctx.quadraticCurveTo(320, 144, 0, 176); ctx.fill();
  ctx.strokeStyle = t('#3a362e'); ctx.lineWidth = 5; for (const [x0, x1] of [[170, 470], [-130, 130], [510, 770]]) { ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, 232, (x1 - x0) / 2, 66, 0, Math.PI, TAU); ctx.stroke(); }
  ctx.strokeStyle = t('#3e3a34'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 144); ctx.quadraticCurveTo(320, 112, 640, 144); ctx.stroke(); for (let i = 0; i < 17; i++) { const x = i * 40, y = 144 - Math.sin((x / 640) * Math.PI) * 16; rect(ctx, x, y, 3, 8, t('#3e3a34')); }
  const by = (x) => 150 - Math.sin((x / 640) * Math.PI) * 16;
  // 양 끝의 구경꾼
  for (let i = 0; i < 5; i++) { person(v, 20 + i * 18, by(20 + i * 18) + 2, 44, folk(i, { f: 1, noShadow: true })); person(v, 540 + i * 18, by(540 + i * 18) + 2, 44, folk(i + 2, { f: -1, noShadow: true })); }
  // 마주 선 둘
  person(v, 268, by(268) + 2, 76, mine(v, { f: 1, cloak: true, arm: 'chest', noShadow: true, rim: WARM, rimDir: 1 })); sheath(v, 268, by(268) + 2, 76, 1);
  person(v, 372, by(372) + 2, 80, { f: -1, cloth: '#2a2a30', hair: '#b8b4ac', cloak: true, hat: true, arm: 'chest', noShadow: true, rim: WARM, rimDir: 1 }); sheath(v, 372, by(372) + 2, 80, -1, '#5a2630');
  // 안개
  for (let i = 0; i < 4; i++) rect(ctx, 0, 150 + i * 20, VW, 12, 'rgba(226,230,232,.14)'); for (const [x, y, rx] of [[120, 200, 120], [520, 214, 140], [320, 226, 100]]) oval(ctx, x, y, rx, 12, 'rgba(226,230,232,.22)');
  crows(v, 300, 60, 3, 60);
  finish(v, { noLeaves: true });
}
/** 마검사: 밤의 들. 칼날을 감은 술식의 고리와 날을 타고 오르는 불, 발밑의 원. 창 든 그림자들이 물러선다 */
function swSpell(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => Math.max(fn(x), 150) + 30; ground(v, g, { color: '#3e4a44', color2: '#26302c', tufts: 40 });
  for (const x of [30, 90, 600]) tree(v, x, 214, 130, { dark: true });
  // 그을린 풀과 발밑의 원
  for (let i = 0; i < 5; i++) oval(ctx, 330 + i * 40, 226 + (i % 2) * 5, 26, 4, 'rgba(10,8,8,.4)');
  lit(ctx, () => { ring(ctx, 286, 234, 60, 8, 1.2, 'rgba(170,210,255,.6)'); ring(ctx, 286, 234, 46, 6, 0.7, 'rgba(170,210,255,.4)'); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; stroke(ctx, [286 + Math.cos(a) * 50, 234 + Math.sin(a) * 6.6, 286 + Math.cos(a) * 58, 234 + Math.sin(a) * 7.6], 0.8, 'rgba(170,210,255,.6)'); } });
  // 물러서는 이들
  for (const [x, i] of [[470, 0], [520, 1], [574, 2]]) { person(v, x, 234 + i * 2, 100 + i * 3, { f: -1, cloth: '#1e1c22', hair: '#141214', hat: i !== 1, pose: i === 1 ? 'bow' : 'stand', rim: FIRE, rimDir: -1 }); spear(v, x + 16, 236, 96, 0.4 + i * 0.12); }
  // 나와 칼
  person(v, 290, 238, 114, mine(v, { f: 1, arm: 'fwd', cloak: true, rim: FIRE, rimDir: 1 }));
  { const [hx, hy] = handOf(290, 238, 114, 1); const [tx, ty] = blade(v, hx, hy, 1, 0.62, 62, { w: 2.2 });
    lit(ctx, () => { stroke(ctx, [hx, hy, tx, ty], 9, 'rgba(255,120,40,.2)'); stroke(ctx, [hx + 6, hy - 4, tx, ty], 3.4, 'rgba(255,180,90,.5)'); const mx = (hx + tx) / 2, my = (hy + ty) / 2; ring(ctx, mx, my, 18, 7, 1.2, 'rgba(170,210,255,.8)', -0.62 + 1.57); ring(ctx, mx + 12, my - 9, 12, 5, 0.8, 'rgba(170,210,255,.6)', -0.62 + 1.57); ring(ctx, mx - 12, my + 9, 12, 5, 0.8, 'rgba(170,210,255,.6)', -0.62 + 1.57); });
    for (const k of [0.3, 0.55, 0.8]) flame(v, hx + (tx - hx) * k, hy + (ty - hy) * k - 2, 5 + k * 3); glow(v, tx, ty, 50, '#ff9a48', 0.2); }
  for (let i = 0; i < 20; i++) oval(ctx, 320 + hash(i, 5) * 120, 80 + hash(i, 6) * 90, 1, 1, `rgba(255,${170 + Math.floor(hash(i, 7) * 60)},90,.8)`);
  pool(v, 340, 226, 120, 10, '#ff9a48', 0.12);
  finish(v, { noLeaves: true });
}


/** 성휘류: 성기사단 예배당의 수련. 칼끝을 바닥에 세우고 맹세를 외는 줄, 높은 창의 빛이 칼날을 타고 내린다 */
function swVow(v) {
  const { ctx } = v; room(v, { wall: '#6a6458', floor: '#3e382e', fy: 186, stone: true });
  for (const x of [150, 320, 490]) { windowAt(v, x - 22, 24, 44, 96, { arch: true }); shaft(v, x, 120, 44, 116, -40, '#f0e8c8', 0.12); }
  for (const x of [66, 236, 406, 576]) { rect(ctx, x - 12, 0, 24, 190, '#57524a'); rect(ctx, x - 16, 178, 32, 10, '#4a463e'); rect(ctx, x + 4, 0, 8, 180, 'rgba(0,0,0,.2)'); }
  ring(ctx, 320, 150, 14, 14, 2.4, '#c8a850'); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; stroke(ctx, [320 + Math.cos(a) * 19, 150 + Math.sin(a) * 19, 320 + Math.cos(a) * 26, 150 + Math.sin(a) * 26], 1.6, '#c8a850'); }
  for (const x of [236, 406]) banner(v, x, 150, 110, '#d8d0b8', { raw: true, mark: '#c8a850', d: 1 });
  // 뒷줄: 같은 자세의 기사들
  for (let i = 0; i < 6; i++) { const x = 90 + i * 92; person(v, x, 222, 84, { raw: true, f: 1, pose: 'kneel', cloth: '#c8c4b8', hair: HR[i % 6], cloak: true, arm: 'fwd', noShadow: true }); const [hx, hy] = handOf(x, 222, 84, 1, 'fwd', 24); blade(v, hx, hy - 6, 1, -1.5, 30, { w: 1.2 }); }
  // 교관
  person(v, 470, 238, 114, { raw: true, f: -1, old: true, cloth: '#d8d4c8', hair: '#b8b4ac', cloak: true, arm: 'chest', rim: WARM, rimDir: -1 }); sheath(v, 470, 238, 114, -1, '#8a7450');
  // 나: 칼끝을 세우고 숨을 고른다
  person(v, 300, 240, 114, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', rim: 'rgba(255,240,200,.7)', rimDir: 1 }));
  { const [hx, hy] = handOf(300, 240, 114, 1, 'fwd', 24); const [tx, ty] = blade(v, hx, hy - 10, 1, -1.5, 58, { w: 2.2, color: '#f0ecd8' }); lit(ctx, () => { stroke(ctx, [hx, hy - 16, tx, ty], 7, 'rgba(255,236,180,.2)'); stroke(ctx, [hx + 2, 60, hx + 1, hy - 20], 1, 'rgba(255,240,200,.4)'); }); glow(v, hx, hy - 30, 40, '#ffe8a8', 0.2); glow(v, tx, ty, 12, '#fff2cc', 0.22); }
  finish(v, { inside: true });
}
/** 물결칼: 너울에 기운 갑판. 뱃전을 차고 돈 곡도의 짧은 호, 발을 헛디딘 상대, 흔들리는 등과 물보라 */
function swDeck(v) {
  const { ctx, t } = v; sky(v);
  // 기운 수평선과 너울
  ctx.save(); ctx.translate(320, 130); ctx.rotate(0.07); rect(ctx, -400, 0, 800, 200, t('#3e566a')); for (let i = 0; i < 30; i++) stroke(ctx, [-380 + hash(i, 2) * 760, 6 + hash(i, 3) * 60, -360 + hash(i, 2) * 760, 6 + hash(i, 3) * 60], 0.7, 'rgba(220,232,240,.4)'); ctx.restore();
  ctx.save(); ctx.translate(320, 200); ctx.rotate(-0.08); ctx.translate(-320, -200);
  // 갑판과 뱃전, 돛대와 줄
  rect(ctx, -40, 196, 720, 80, t('#5a4632')); for (let i = 0; i < 9; i++) stroke(ctx, [-40, 204 + i * 7, 680, 204 + i * 7], 0.6, rgba(t('#2e2218'), 0.6));
  rect(ctx, -40, 164, 720, 8, t('#3a2c20')); for (let i = 0; i < 19; i++) rect(ctx, -30 + i * 38, 172, 4, 26, t('#3a2c20'));
  rect(ctx, 150, -40, 12, 240, t('#3a2c20')); poly(ctx, [162, -30, 330, 10, 320, 110, 162, 96], rgba(t('#c8bea4'), 0.92)); stroke(ctx, [162, 96, 320, 110], 2, t('#3a2c20'));
  for (const x of [60, 100, 250, 300]) stroke(ctx, [156, -20, x, 166], 0.8, t('#1c1410')); for (let i = 0; i < 5; i++) stroke(ctx, [70 + i * 4, 150 - i * 30, 142 - i * 3, 150 - i * 30], 0.6, t('#1c1410'));
  for (const [x, y] of [[520, 196], [556, 196], [538, 174]]) { oval(ctx, x, y - 12, 14, 13, t('#6a5238')); ring(ctx, x, y - 12, 14, 4, 1, t('#2e2218')); }
  stroke(ctx, [600, 110, 600, 140], 0.8, t('#1c1410')); oval(ctx, 604, 146, 5, 6, '#f0c878'); glow(v, 604, 146, 40, '#ffcf80', 0.2);
  // 상대: 발을 헛디뎠다
  person(v, 410, 236, 110, { f: -1, pose: 'bow', cloth: '#4a3a34', hair: '#1c1614', arm: 'fwd' }); { const [hx, hy] = handOf(410, 236, 110, -1); blade(v, hx - 4, hy + 8, -1, -0.7, 40); }
  // 나: 곡도
  person(v, 300, 236, 112, mine(v, { f: 1, arm: 'fwd', rim: COLD, rimDir: -1 })); { const [hx, hy] = handOf(300, 236, 112, 1); stroke(ctx, [hx - 6, hy + 2, hx, hy], 2.4, '#2a2018'); bend(ctx, [hx, hy, hx + 22, hy - 4, hx + 40, hy - 24], 2.2, '#d0d4dc'); bend(ctx, [hx + 4, hy - 1, hx + 22, hy - 6, hx + 39, hy - 23], 0.5, 'rgba(255,255,255,.7)'); }
  slash(ctx, 318, 170, 46, -1.3, 0.5, 'rgba(220,236,250,.6)', 2.2);
  // 지켜보는 뱃사람들
  for (let i = 0; i < 3; i++) person(v, 40 + i * 34, 234 + (i % 2) * 3, 96, folk(i + 1, { f: 1, female: false, long: false, hat: i === 1, arm: i === 2 ? 'chest' : undefined }));
  ctx.restore();
  // 뱃전을 넘는 물보라
  for (let i = 0; i < 40; i++) oval(ctx, 440 + hash(i, 5) * 200, 120 + hash(i, 6) * 70, 1 + hash(i, 7) * 1.4, 1 + hash(i, 7) * 1.4, 'rgba(230,240,246,.7)'); bend(ctx, [640, 190, 560, 120, 470, 170], 6, 'rgba(220,234,242,.25)');
  finish(v, { noLeaves: true });
}

/** 감시탑의 파수꾼: 바닷가 벼랑 위 돌탑 꼭대기에 꺼지지 않는 불. 잿빛 외투의 파수꾼이 등잔을 들고 밤을 새운다 */
function dgWatch(v) {
  const { ctx } = v; sky(v);
  rect(ctx, 0, 132, VW, 108, v.t('#26303e')); for (let i = 0; i < 22; i++) { const x = hash(i, 71) * VW, y = 138 + hash(i, 72) * 60; stroke(ctx, [x, y, x + 16 + hash(i, 73) * 22, y], 0.8, 'rgba(190,204,224,.28)'); }
  // 먼 곶들: 탑이 하나만이 아니다
  poly(ctx, [0, 132, 60, 118, 130, 122, 190, 132], v.t('#2e3644')); rect(ctx, 86, 100, 5, 20, v.t('#2e3644')); oval(ctx, 88.5, 98, 1.6, 1.6, '#ffc070'); glow(v, 88, 98, 14, '#ffa850', 0.22);
  // 벼랑과 탑
  poly(ctx, [640, 240, 640, 128, 560, 122, 470, 132, 400, 156, 330, 196, 250, 240], v.t('#3a3634')); poly(ctx, [640, 240, 640, 176, 520, 172, 400, 198, 320, 240], v.t('#4a4640')); stroke(ctx, [640, 128, 560, 122, 470, 132, 400, 156, 330, 196, 250, 240], 1, 'rgba(255,200,140,.22)');
  const tx = 520, ty = 150, c = v.t('#6a6660'), c2 = v.t('#4a4744');
  poly(ctx, [tx - 26, ty, tx - 19, ty - 112, tx + 19, ty - 112, tx + 26, ty], c); poly(ctx, [tx + 4, ty, tx + 6, ty - 112, tx + 19, ty - 112, tx + 26, ty], c2);
  for (let i = 1; i < 8; i++) stroke(ctx, [tx - 25 + i * 0.8, ty - i * 14, tx + 25 - i * 0.8, ty - i * 14], 0.6, 'rgba(20,18,22,.35)');
  rect(ctx, tx - 25, ty - 118, 50, 6, c2); for (const k of [-1, 1]) rect(ctx, tx + k * 16 - 1.5, ty - 140, 3, 22, c2); poly(ctx, [tx - 24, ty - 140, tx, ty - 156, tx + 24, ty - 140], c2);
  for (const y of [ty - 84, ty - 48]) rect(ctx, tx - 9, y, 4, 9, '#14121a'); poly(ctx, [tx - 7, ty, tx - 7, ty - 16, tx, ty - 21, tx + 7, ty - 16, tx + 7, ty], '#14121a');
  flame(v, tx, ty - 118, 11); glow(v, tx, ty - 128, 110, '#ffb060', 0.2); glow(v, tx, ty - 128, 22, '#ffd090', 0.2); glow(v, 470, 190, 150, '#ffb060', 0.1);
  // 파수꾼들과 나
  const lamp = (x, y) => { stroke(ctx, [x, y - 7, x, y - 4], 0.8, '#15110e'); rect(ctx, x - 2.4, y - 4, 4.8, 6.4, '#2a2018'); oval(ctx, x, y - 0.8, 1.6, 2, '#ffd890'); glow(v, x, y, 26, '#ffb060', 0.22); };
  person(v, 566, 196, 62, { cloth: '#5a5c60', hair: '#3a3632', f: -1, cloak: true, hood: true, stick: 'spear', rim: FIRE, rimDir: -1 });
  person(v, 430, 232, 100, { cloth: '#62646a', hair: '#8a8680', f: -1, cloak: true, old: true, arm: 'fwd', rim: WARM, rimDir: -1 }); { const [hx, hy] = handOf(430, 232, 100, -1); lamp(hx, hy + 7); }
  person(v, 330, 238, 104, mine(v, { f: 1, cloak: true, rim: WARM, rimDir: 1 }));
  for (let i = 0; i < 5; i++) { const x = 120 + hash(i, 75) * 240, y = 60 + hash(i, 76) * 50; bend(ctx, [x - 5, y, x - 2, y - 3, x, y, x + 2, y - 3, x + 5, y], 0.9, 'rgba(20,18,24,.6)'); }
  finish(v, { noLeaves: true });
}
export const PLATES22 = {
  /** 마족 집안의 어린 시절. variant: warrior·trade·silent·hiding */
  demonkind(v) { const k = v.variant ?? 'warrior'; return ({ trade: dkTrade, silent: dkSilent, hiding: dkHiding }[k] ?? dkWarrior)(v); },
  /** 마대륙의 고장. variant: bones·harbor·city·outpost */
  demonland(v) { const k = v.variant ?? 'city'; return ({ bones: dlBones, harbor: dlHarbor, outpost: dlOutpost }[k] ?? dlCity)(v); },
  /** 마신. variant: dream·shard·apostle·cult·war·choice·watch */
  demongod(v) { const k = v.variant ?? 'dream'; return ({ shard: dgShard, apostle: dgApostle, cult: dgCult, war: dgWar, choice: dgChoice, watch: dgWatch }[k] ?? dgDream)(v); },
  /** 검. variant: flow·heavy·feint·vow·axe·twin·fist·deck·aura·rank·rival·spellblade */
  sword(v) { const k = v.variant ?? 'flow'; return ({ heavy: swHeavy, feint: swFeint, vow: swVow, deck: swDeck, axe: swAxe, twin: swTwin, fist: swFist, aura: swAura, rank: swRank, rival: swRival, spellblade: swSpell }[k] ?? swFlow)(v); },
};
