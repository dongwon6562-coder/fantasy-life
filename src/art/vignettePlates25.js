// 47단계 삽화: 축제와 인생 의례(rites), 학자의 길(scholar). 페이블 판(24)과 같은 도구·같은 결로 그린다.
// 등급 선: 피와 주검 없음. 불 사고는 쓰러진 등불과 연기로, 금서 검열은 타는 책 더미로만.
import { hash, rgba } from './sceneKit.js';
import { VW, sky, far, townFar, ground, room, windowAt, shaft, glow, flame, candle, smoke, person, crowd, tree, banner, finish } from './vignetteKit.js';
import { cottage } from './vignettePlates4.js';
import { torch } from './vignettePlates5.js';
import { table } from './vignettePlates18.js';
import { shelf } from './vignettePlates21.js';
import { brazier } from './vignettePlates22.js';
import { rowHouse, lamp, steps } from './vignettePlates23.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const bend = (ctx, a, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 2; i + 3 < a.length; i += 4) ctx.quadraticCurveTo(a[i], a[i + 1], a[i + 2], a[i + 3]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const ring = (ctx, x, y, rx, ry, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke(); };
const arch = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h + w / 2); ctx.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y); ctx.fill(); };
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const FEST = ['#a8382a', '#c8962e', '#3a6a8a', '#6a8a3a', '#8a3a6a', '#d8c8a0'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const paper = (ctx, x, y, w = 14, h = 9, c = '#e8e0c8') => { rect(ctx, x, y, w, h, c); for (let j = 0; j < 3; j++) stroke(ctx, [x + 2, y + 2 + j * 2.4, x + w - 2, y + 2 + j * 2.4], 0.4, 'rgba(40,30,20,.5)'); };
const openBook = (ctx, x, y, w) => { poly(ctx, [x - w, y, x, y + 2, x + w, y, x + w - 2, y - w * 0.36, x, y - w * 0.3, x - w + 2, y - w * 0.36], '#d8ceb0'); stroke(ctx, [x, y + 2, x, y - w * 0.3], 0.8, '#6a5a40'); for (let i = 0; i < 3; i++) { stroke(ctx, [x - w + 5, y - 3 - i * 3, x - 4, y - 2 - i * 3], 0.5, '#5a4e3e'); stroke(ctx, [x + 4, y - 2 - i * 3, x + w - 5, y - 3 - i * 3], 0.5, '#5a4e3e'); } };
const pile = (ctx, x, y, n, seed) => { for (let i = 0; i < n; i++) { const w = 22 + hash(i, seed) * 10; rect(ctx, x - w / 2 + (hash(i, seed + 1) - 0.5) * 4, y - (i + 1) * 5, w, 4.6, ['#5a2e28', '#2e3e52', '#4a4a30', '#3e2e4a', '#6a5a3a'][Math.floor(hash(i, seed + 2) * 5)]); } };
// 줄에 매단 등불: 두 기둥 사이로 처진 줄과 오색 등
function lanterns(v, x0, y0, x1, y1, n, sag = 18, lit = true) {
  const { ctx } = v;
  bend(ctx, [x0, y0, (x0 + x1) / 2, Math.max(y0, y1) + sag * 2, x1, y1], 0.8, '#2a2018');
  for (let i = 1; i < n; i++) {
    const u = i / n, x = x0 + (x1 - x0) * u, y = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * (Math.max(y0, y1) + sag * 2) + u * u * y1;
    const c = FEST[i % FEST.length];
    stroke(ctx, [x, y, x, y + 4], 0.6, '#2a2018'); oval(ctx, x, y + 8, 3.6, 4.6, c); rect(ctx, x - 2.4, y + 3, 4.8, 1.4, '#2a2018');
    if (lit) glow(v, x, y + 8, 16, c === '#3a6a8a' ? '#90c0ff' : '#ffb868', 0.28);
  }
}
const pennants = (v, x0, y0, x1, y1, n) => { const { ctx } = v; stroke(ctx, [x0, y0, x1, y1], 0.7, '#2a2018'); for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 6; poly(ctx, [x - 4, y, x + 4, y, x, y + 9], FEST[i % FEST.length]); } };
const pole = (ctx, x, y, h) => { rect(ctx, x - 2, y - h, 4, h, '#4a3626'); oval(ctx, x, y - h, 3, 3, '#6a5236'); };
const stall = (v, x, y, w, c) => { const { ctx } = v; rect(ctx, x, y - 26, w, 26, '#4a3626'); rect(ctx, x - 4, y - 30, w + 8, 4, '#3a2a1c'); for (let i = 0; i < w / 10; i++) poly(ctx, [x - 4 + i * 10, y - 48, x + 6 + i * 10, y - 48, x + 6 + i * 10, y - 40, x - 4 + i * 10, y - 38], i % 2 ? c : '#e8e0c8'); rect(ctx, x - 2, y - 48, 2, 22, '#2a2018'); rect(ctx, x + w, y - 48, 2, 22, '#2a2018'); for (let i = 0; i < w / 9; i++) oval(ctx, x + 5 + i * 9, y - 28, 3, 2.4, ['#c86a3a', '#d8b84a', '#8a3a2a', '#6a8a3a'][i % 4]); };

// ───────── 축제와 인생 의례 ─────────
/** 축제의 밤: 광장 위로 등불 줄, 한가운데 모닥불, 둘레를 돌며 춤추는 사람들. 좌판의 불빛 */
function rtFeast(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 320, 140, {});
  ground(v, () => 180, { color: '#6a5e48', color2: '#3e362a', tufts: 6 });
  rowHouse(v, 0, 150, 70, 180, '#5a4a3a', { roof: '#3a2c22' }); rowHouse(v, 490, 150, 76, 180, '#54463a', { roof: '#3a2c22' });
  for (const x of [40, 90, 520, 590]) windowAt(v, x, 110, 16, 18, { lit: true });
  pole(ctx, 150, 186, 110); pole(ctx, 490, 186, 110); lanterns(v, 150, 78, 490, 78, 12, 10); lanterns(v, 150, 96, 490, 96, 9, 14);
  stall(v, 60, 200, 70, '#a8382a'); stall(v, 520, 202, 64, '#3a6a8a');
  // 모닥불과 둘레의 춤
  for (let i = 0; i < 6; i++) stroke(ctx, [300 + i * 8, 206, 318 + i * 2, 186], 3, '#3a2a1c');
  flame(v, 320, 196, 9); flame(v, 306, 200, 5); flame(v, 336, 200, 6); glow(v, 320, 180, 130, '#ff9a48', 0.32); smoke(v, 320, 160, 120, 22, '#5a5048', 0.22);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + 0.4, x = 320 + Math.cos(a) * 92, y = 212 + Math.sin(a) * 16; person(v, x, y, 72 + Math.sin(a) * 10, folk(i, { f: Math.cos(a) > 0 ? -1 : 1, arm: i % 2 ? 'up' : 'out', rim: 'rgba(255,170,90,.5)', rimDir: Math.cos(a) > 0 ? -1 : 1 })); }
  person(v, 196, 236, 96, mine(v, { f: 1, arm: 'up', rim: 'rgba(255,170,90,.55)', rimDir: 1 }));
  crowd(v, 20, 160, 236, 6, 80, {}); crowd(v, 470, 630, 236, 6, 80, {});
  finish(v, {});
}
/** 내가 연 잔치: 마당에 긴 탁자, 일어서 잔을 드는 나와 손님들. 큰 솥과 구운 고기 */
function rtHost(v) {
  const { ctx } = v; sky(v); far(v, {});
  ground(v, () => 172, { color: '#6e6a4a', color2: '#4a4632', tufts: 20 });
  cottage(v, 70, 168, 130, 70, { roof: '#5a4634', wall: '#b0a080' }); tree(v, 580, 172, 120, {});
  pennants(v, 180, 64, 600, 80, 14);
  // 큰 솥
  rect(ctx, 520, 196, 4, 26, '#2a2018'); rect(ctx, 580, 196, 4, 26, '#2a2018'); stroke(ctx, [516, 168, 588, 168], 2, '#2a2018');
  oval(ctx, 552, 190, 22, 14, '#2a2420'); oval(ctx, 552, 180, 22, 5, '#4a3e34'); flame(v, 552, 210, 4); smoke(v, 552, 150, 40, 10, '#c8c0b0', 0.22);
  for (let i = 0; i < 4; i++) person(v, 170 + i * 80, 214, 80, folk(i, { pose: 'sit', f: 1, noShadow: true, arm: i === 2 ? 'up' : null }));
  table(ctx, 140, 480, 204, '#5a4430', 8, 30);
  for (let i = 0; i < 9; i++) { const x = 160 + i * 36; oval(ctx, x, 196, 7, 2.4, '#e0d8c4'); if (i % 3 === 0) oval(ctx, x + 14, 194, 9, 4, '#8a5a30'); }
  for (let i = 0; i < 3; i++) person(v, 200 + i * 96, 236, 88, folk(i + 3, { pose: 'sit', f: -1, noShadow: true }));
  person(v, 500, 214, 104, mine(v, { f: -1, arm: 'up' })); glow(v, 500, 120, 40, '#fff0c8', 0.12);
  person(v, 600, 236, 70, folk(2, { child: true, f: -1, arm: 'out' }));
  finish(v, {});
}
/** 의례: 촛불 켠 제단 앞, 아이가 무릎을 꿇고 사제가 손을 얹는다. 둘러선 집안 사람들 */
function rtRite(v) {
  const { ctx } = v; room(v, { wall: '#5a5246', floor: '#342c24', fy: 180 });
  for (const x of [110, 530]) { rect(ctx, x - 12, 0, 24, 182, '#6a6254'); rect(ctx, x - 16, 0, 32, 10, '#7a7264'); }
  windowAt(v, 296, 14, 48, 84, { arch: true }); shaft(v, 320, 98, 60, 110, 10, '#fff0c8', 0.16);
  steps(ctx, 320, 180, 120, 2, '#6a6256'); rect(ctx, 270, 128, 100, 40, '#7a6e5e'); rect(ctx, 262, 122, 116, 8, '#8a7e6c'); rect(ctx, 270, 128, 100, 6, '#6e2a30');
  for (const x of [282, 300, 340, 358]) candle(v, x, 122, 9); glow(v, 320, 112, 70, '#ffb060', 0.2);
  stroke(ctx, [320, 122, 320, 98], 1.6, '#c8a850'); stroke(ctx, [310, 106, 330, 106], 1.6, '#c8a850');
  person(v, 360, 210, 104, { raw: true, f: -1, cloth: '#e0d8c4', hair: '#b8b4ac', robe: true, old: true, arm: 'fwd' });
  person(v, 300, 214, 66, folk(1, { raw: true, child: true, pose: 'kneel', f: 1, cloth: '#e8e0d0' }));
  person(v, 180, 230, 96, mine(v, { raw: true, f: 1, arm: 'chest' })); person(v, 140, 234, 92, folk(1, { raw: true, f: 1, female: true, long: true }));
  person(v, 480, 230, 94, folk(3, { raw: true, f: -1 })); person(v, 524, 236, 88, folk(5, { raw: true, f: -1, old: true, stick: 'staff' }));
  finish(v, { inside: true, noLeaves: true });
}
/** 축제 달력: 고장 회관 벽에 걸린 큰 달력판. 달마다 그려진 그림, 다음 축제 칸에 붉은 끈. 장대를 꾸미는 사람들 */
function rtCalendar(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 300, 140, {});
  ground(v, () => 178, { color: '#6a6248', color2: '#46402e', tufts: 10 });
  rect(ctx, 150, 40, 340, 146, '#7a6a52'); poly(ctx, [140, 44, 320, 8, 500, 44], '#4a3a2c'); rect(ctx, 150, 40, 340, 6, '#5a4a3a');
  // 달력판: 열두 칸
  rect(ctx, 206, 58, 228, 106, '#3a2c20'); rect(ctx, 212, 64, 216, 94, '#d8ccb0');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = 214 + c * 54, y = 66 + r * 31, m = r * 4 + c;
    ctx.strokeStyle = '#6a5a40'; ctx.lineWidth = 0.6; ctx.strokeRect(x, y, 50, 28);
    const ic = [['#6a8a3a', 'sprout'], ['#c8962e', 'sun'], ['#a8582a', 'leaf'], ['#8aa0c0', 'snow']][Math.floor(((m + 10) % 12) / 3)];
    if (ic[1] === 'sun') { oval(ctx, x + 25, y + 13, 5, 5, ic[0]); } else if (ic[1] === 'snow') { for (let k = 0; k < 3; k++) stroke(ctx, [x + 25 - 5, y + 13 + (k - 1) * 4, x + 25 + 5, y + 13 - (k - 1) * 4], 0.8, ic[0]); } else { poly(ctx, [x + 25, y + 6, x + 31, y + 14, x + 25, y + 21, x + 19, y + 14], ic[0]); }
    if (m === (v.month % 12)) { ctx.strokeStyle = '#a8282a'; ctx.lineWidth = 1.6; ctx.strokeRect(x + 1, y + 1, 48, 26); }
  }
  // 꽃 장대 준비
  pole(ctx, 560, 214, 150); for (let i = 0; i < 6; i++) bend(ctx, [560, 70, 560 + (i - 2.5) * 16, 120, 560 + (i - 2.5) * 30, 200], 1.2, FEST[i]); oval(ctx, 560, 68, 10, 6, '#6a8a3a');
  person(v, 520, 236, 92, folk(0, { f: 1, arm: 'up' })); person(v, 610, 236, 86, folk(4, { f: -1, arm: 'up', female: true, long: true }));
  person(v, 120, 236, 100, mine(v, { f: 1, arm: 'fwd' })); person(v, 80, 240, 66, folk(2, { child: true, f: 1 }));
  finish(v, {});
}
/** 축제 겨루기: 줄을 친 풀밭 씨름판, 맞잡은 두 사람과 둘러앉은 구경꾼. 상으로 걸린 양 한 마리 */
function rtContest(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 520, 146, {});
  ground(v, () => 170, { color: '#6e7a48', color2: '#4a5232', tufts: 26 });
  pennants(v, 40, 90, 300, 104, 10); pennants(v, 340, 104, 610, 88, 10); pole(ctx, 40, 176, 90); pole(ctx, 610, 176, 92); pole(ctx, 320, 176, 76);
  // 줄다리기: 가운데 깃발 묶은 줄, 양쪽 셋씩 버틴다
  crowd(v, 90, 200, 204, 5, 64, {}); crowd(v, 450, 540, 204, 4, 64, {}); rect(ctx, 318, 200, 4, 24, '#e0d8c4');
  for (let i = 0; i < 3; i++) { person(v, 232 + i * 28, 216 + i, 96, folk(i, { f: 1, arm: 'fwd' })); person(v, 408 - i * 28, 216 + i, 96, folk(i + 3, { f: -1, arm: 'fwd' })); }
  stroke(ctx, [214, 166, 426, 166], 2.2, '#b8a478'); poly(ctx, [320, 166, 328, 174, 320, 184, 312, 174], '#a8382a');
  // 상으로 걸린 양
  oval(ctx, 566, 206, 18, 11, '#e0d8c8'); oval(ctx, 584, 200, 6, 5, '#3a3430'); for (const x of [554, 576]) rect(ctx, x, 214, 2.4, 10, '#3a3430'); stroke(ctx, [610, 176, 588, 198], 0.6, '#2a2018');
  person(v, 110, 238, 100, mine(v, { f: 1, arm: 'up' }));
  finish(v, {});
}
/** 축제 사고: 쓰러진 등불 장대에서 번진 불, 물동이를 나르는 사람들. 연기 너머 흩어진 좌판 */
function rtMishap(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 320, 140, {});
  ground(v, () => 180, { color: '#5e5440', color2: '#3a3226', tufts: 4 });
  rowHouse(v, 0, 170, 70, 180, '#54463a', { roof: '#3a2c22' });
  stall(v, 360, 202, 80, '#a8382a'); stroke(ctx, [300, 206, 380, 120], 4, '#4a3626');
  flame(v, 400, 174, 9); flame(v, 376, 188, 6); flame(v, 424, 190, 5); glow(v, 390, 160, 120, '#ff8a3a', 0.34); smoke(v, 400, 80, 110, 26, '#3a342e', 0.4);
  lanterns(v, 120, 70, 300, 120, 7, 6, false);
  for (let i = 0; i < 3; i++) { const x = 470 + i * 48; person(v, x, 226 - i * 4, 92, folk(i, { f: -1, arm: 'fwd' })); oval(ctx, x - 14, 186 - i * 4, 7, 5, '#6a5236'); }
  person(v, 240, 232, 100, mine(v, { f: 1, arm: 'out' })); person(v, 190, 236, 62, folk(1, { child: true, f: 1 }));
  for (let i = 0; i < 6; i++) oval(ctx, 160 + hash(i, 3) * 160, 228 + hash(i, 4) * 8, 4, 2, ['#c86a3a', '#d8b84a', '#e8e0c8'][i % 3]);
  finish(v, {});
}
export const RITES25 = { feast: rtFeast, host: rtHost, rite: rtRite, calendar: rtCalendar, contest: rtContest, mishap: rtMishap };

// ───────── 학자의 길 ─────────
const study = (v, o = {}) => { const { ctx } = v; room(v, { wall: o.wall ?? '#4a3e34', floor: o.floor ?? '#2a221c', fy: o.fy ?? 182 }); return ctx; };
/** 쓰기: 밤의 책상, 촛불 아래 펼친 양피지와 쌓인 책. 창밖은 어둡고, 바닥엔 구겨 버린 종이 */
function scWrite(v) {
  const ctx = study(v, {}); windowAt(v, 470, 40, 56, 70, {}); shelf(ctx, 40, 30, 150, 5, 21);
  table(ctx, 230, 470, 186, '#4a3626', 8, 30); pile(ctx, 270, 178, 6, 3); pile(ctx, 440, 178, 4, 7);
  paper(ctx, 320, 168, 40, 12, '#e8dcc0'); stroke(ctx, [372, 172, 386, 150], 1, '#e0d8c4'); oval(ctx, 368, 176, 4, 3, '#1c1410');
  candle(v, 410, 178, 10); glow(v, 400, 166, 110, '#ffb060', 0.26);
  person(v, 356, 214, 104, mine(v, { raw: true, pose: 'sit', f: 1, arm: 'fwd', rim: 'rgba(255,180,100,.5)', rimDir: 1 }));
  for (let i = 0; i < 3; i++) { const x = 210 + hash(i, 9) * 240, y = 228 + hash(i, 8) * 8; poly(ctx, [x - 5, y, x - 2, y - 5, x + 4, y - 4, x + 6, y, x + 1, y + 2], 'rgba(216,204,176,.55)'); }
  finish(v, { inside: true, noLeaves: true });
}
/** 논쟁: 학원 강당, 단상 둘에 선 두 학자가 서로를 가리킨다. 계단 자리를 메운 학생들 */
function scDebate(v) {
  const ctx = study(v, { wall: '#5a5044', floor: '#3a3028', fy: 150 });
  for (const x of [60, 200, 440, 580]) { rect(ctx, x - 10, 0, 20, 150, '#6a6052'); } windowAt(v, 296, 10, 48, 70, { arch: true }); shaft(v, 320, 80, 70, 120, 0, '#fff0c8', 0.12);
  for (let r = 0; r < 3; r++) { rect(ctx, 0, 158 + r * 22, VW, 4, '#4a3e32'); crowd(v, 20, 620, 180 + r * 22, 12 - r * 2, 54 + r * 10, { rim: 'rgba(255,236,200,.1)' }); }
  for (const [x, f] of [[200, 1], [440, -1]]) { rect(ctx, x - 26, 128, 52, 30, '#5a4630'); rect(ctx, x - 30, 124, 60, 6, '#6a5640'); person(v, x, 128, 92, { raw: true, f, robe: true, cloth: f > 0 ? '#3a3e4a' : '#5a2e3a', hair: f > 0 ? '#b8b4ac' : '#2a1e16', old: f > 0, arm: 'out' }); }
  paper(ctx, 160, 116, 16, 10); paper(ctx, 470, 116, 16, 10);
  person(v, 320, 238, 100, mine(v, { raw: true, f: 0, noShadow: true, robe: true }));
  finish(v, { inside: true, noLeaves: true });
}
/** 서가 사이: 천장까지 닿은 서가, 사다리 위에서 책을 꺼내는 사람. 먼지가 빛줄기에 떠 있다 */
function scShelf(v) {
  const ctx = study(v, { wall: '#3e342c', floor: '#2a221c', fy: 196 });
  for (const [x, w, s] of [[10, 170, 3], [200, 120, 9], [460, 170, 13]]) shelf(ctx, x, 6, w, 7, s);
  windowAt(v, 350, 20, 70, 110, { arch: true }); shaft(v, 385, 130, 80, 110, -30, '#fff0c8', 0.2);
  for (let i = 0; i < 22; i++) oval(ctx, 340 + hash(i, 1) * 90, 120 + hash(i, 2) * 90, 0.7, 0.7, 'rgba(255,240,200,.7)');
  stroke(ctx, [250, 200, 290, 30], 2.4, '#5a4630'); stroke(ctx, [272, 200, 312, 30], 2.4, '#5a4630'); for (let i = 1; i < 9; i++) { const y = 200 - i * 19; stroke(ctx, [250 + (200 - y) / 170 * 40, y, 272 + (200 - y) / 170 * 40, y], 1.6, '#5a4630'); }
  person(v, 282, 110, 82, mine(v, { raw: true, f: 1, arm: 'up' }));
  pile(ctx, 400, 214, 5, 4); person(v, 450, 238, 94, { raw: true, f: -1, old: true, robe: true, cloth: '#3a3428', hair: '#c8c4bc', stick: 'staff' });
  finish(v, { inside: true, noLeaves: true });
}
/** 큰 도서관: 둥근 천장 아래 층층이 이어진 서가와 긴 열람 탁자. 등불마다 고개 숙인 사람들 */
function scLibrary(v) {
  const ctx = study(v, { wall: '#4a4036', floor: '#2e2620', fy: 190 });
  ctx.fillStyle = '#3a3028'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(VW, 0); ctx.lineTo(VW, 30); ctx.quadraticCurveTo(320, -20, 0, 30); ctx.fill();
  for (let r = 0; r < 2; r++) { shelf(ctx, 10, 30 + r * 70, 250, 2, 30 + r); shelf(ctx, 380, 30 + r * 70, 250, 2, 40 + r); rect(ctx, 0, 84 + r * 70, VW, 4, '#5a4a3a'); for (let i = 0; i < 16; i++) rect(ctx, 6 + i * 40, 76 + r * 70, 2, 8, '#5a4a3a'); }
  arch(ctx, 280, 150, 80, 140, '#1e1a16'); windowAt(v, 296, 20, 48, 90, { arch: true }); shaft(v, 320, 110, 60, 90, 0, '#fff0c8', 0.14);
  for (let i = 0; i < 4; i++) person(v, 130 + i * 120, 222, 76, folk(i, { raw: true, pose: 'sit', f: i % 2 ? -1 : 1, noShadow: true, robe: i % 2 === 0, arm: 'fwd' }));
  table(ctx, 60, 580, 214, '#4a3626', 8, 26); for (let i = 0; i < 5; i++) { const x = 100 + i * 110; candle(v, x, 206, 8); glow(v, x, 196, 40, '#ffb060', 0.16); openBook(ctx, x + 22, 205, 11); }
  person(v, 560, 240, 100, mine(v, { raw: true, f: -1, arm: 'chest' }));
  finish(v, { inside: true, noLeaves: true });
}
/** 필사실: 줄지은 경사 책상, 원본과 사본을 나란히 펴고 베끼는 손들. 창가의 잉크병 */
function scCopy(v) {
  const ctx = study(v, { wall: '#5a5246', floor: '#3a3228', fy: 168 });
  for (const x of [110, 330, 550]) { windowAt(v, x - 26, 18, 52, 76, { arch: true }); shaft(v, x, 94, 50, 110, 16, '#fff0c8', 0.13); }
  // 경사 책상: 사람은 왼쪽에 앉아 오른쪽 책상에 손을 뻗는다
  const desk = (x, y, s) => {
    poly(ctx, [x + 2 * s, y - 27 * s, x + 60 * s, y - 39 * s, x + 60 * s, y, x + 2 * s, y], '#3e2e20'); rect(ctx, x + 2 * s, y - 14 * s, 58 * s, 1.4 * s, '#2a1e14');
    poly(ctx, [x, y - 30 * s, x + 62 * s, y - 42 * s, x + 62 * s, y - 37 * s, x, y - 25 * s], '#5a4430');
    poly(ctx, [x + 4 * s, y - 33 * s, x + 30 * s, y - 38 * s, x + 30 * s, y - 31 * s, x + 4 * s, y - 26 * s], '#c8bc9a');
    poly(ctx, [x + 32 * s, y - 38 * s, x + 58 * s, y - 43 * s, x + 58 * s, y - 36 * s, x + 32 * s, y - 31 * s], '#e8e0c8');
    oval(ctx, x + 60 * s, y - 44 * s, 2.4 * s, 2 * s, '#1c1410');
  };
  for (const [x, y, s, i] of [[90, 206, 1, 0], [300, 206, 1, 1], [510, 206, 1, 2], [40, 252, 1.3, 3], [430, 252, 1.3, 4]]) {
    person(v, x, y, 84 * s, folk(i, { raw: true, pose: 'sit', f: 1, robe: true, arm: 'fwd', noShadow: true })); desk(x + 6 * s, y, s);
  }
  person(v, 250, 252, 110, mine(v, { raw: true, pose: 'sit', f: 1, arm: 'fwd', noShadow: true })); desk(258, 252, 1.3);
  finish(v, { inside: true, noLeaves: true });
}
/** 검열: 광장 한가운데 쌓인 책 더미가 타고, 관리가 목록을 읽는다. 멀리서 지켜보는 학자들 */
function scCensor(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 320, 140, {});
  ground(v, () => 178, { color: '#5e5646', color2: '#3a3428', tufts: 2 });
  rowHouse(v, 0, 160, 66, 178, '#5a4e40', { roof: '#3a2e24' }); rowHouse(v, 480, 160, 70, 178, '#54483c', { roof: '#3a2e24' });
  for (let i = 0; i < 14; i++) { const x = 290 + hash(i, 1) * 60, y = 206 - hash(i, 2) * 24; rect(ctx, x - 8, y - 4, 16, 5, ['#5a2e28', '#2e3e52', '#4a4a30', '#3e2e4a'][i % 4]); }
  flame(v, 320, 196, 10); flame(v, 302, 202, 6); flame(v, 340, 200, 7); glow(v, 320, 180, 120, '#ff8a3a', 0.32); smoke(v, 320, 170, 150, 26, '#3a3430', 0.34);
  for (let i = 0; i < 8; i++) { const x = 260 + hash(i, 5) * 120, y = 80 + hash(i, 6) * 80; poly(ctx, [x, y, x + 5, y + 2, x + 3, y + 6], 'rgba(230,220,190,.6)'); }
  person(v, 410, 216, 100, { f: -1, cloth: '#2a2a34', hair: '#1c1614', hat: true, arm: 'fwd' }); paper(v.ctx, 380, 150, 14, 18, '#e8dcc0');
  for (const x of [452, 480]) person(v, x, 220, 92, { f: -1, cloth: '#5a5a62', hair: '#2a1e16', hat: true });
  person(v, 150, 236, 100, mine(v, { f: 1, robe: true })); person(v, 104, 238, 94, folk(3, { f: 1, robe: true, old: true }));
  finish(v, {});
}
/** 강의: 작은 방, 칠판 같은 석판 앞에서 가르치는 나와 탁자에 둘러앉은 제자 넷 */
function scLecture(v) {
  const ctx = study(v, { wall: '#56483a', floor: '#30281e', fy: 184 });
  rect(ctx, 80, 40, 220, 100, '#2a2e2a'); rect(ctx, 76, 36, 228, 6, '#5a4630'); for (let i = 0; i < 5; i++) stroke(ctx, [96, 60 + i * 16, 180 + hash(i, 3) * 100, 60 + i * 16], 1, 'rgba(230,230,220,.7)'); ring(ctx, 250, 88, 24, 24, 1, 'rgba(230,230,220,.7)');
  windowAt(v, 470, 30, 64, 80, {}); shaft(v, 500, 110, 60, 90, -20, '#fff0c8', 0.12); shelf(ctx, 560, 120, 70, 2, 51);
  for (let i = 0; i < 2; i++) person(v, 340 + i * 120, 216, 80, folk(i, { raw: true, pose: 'sit', f: -1, noShadow: true, child: i === 1 }));
  table(ctx, 300, 560, 206, '#4a3626', 7, 26); for (let i = 0; i < 4; i++) { openBook(ctx, 330 + i * 60, 198, 9); }
  for (let i = 0; i < 2; i++) person(v, 380 + i * 120, 240, 86, folk(i + 2, { raw: true, pose: 'sit', f: -1, noShadow: true, arm: i ? 'up' : null }));
  person(v, 230, 230, 106, mine(v, { raw: true, f: 1, arm: 'out', robe: true }));
  finish(v, { inside: true, noLeaves: true });
}
export const SCHOLAR25 = { write: scWrite, debate: scDebate, shelf: scShelf, library: scLibrary, copy: scCopy, censor: scCensor, lecture: scLecture };

export const PLATES25 = {
  /** 축제와 인생 의례. variant: feast·host·rite·calendar·contest·mishap */
  rites(v) { return (RITES25[v.variant] ?? rtFeast)(v); },
  /** 학자의 길. variant: write·debate·shelf·library·copy·censor·lecture */
  scholar(v) { return (SCHOLAR25[v.variant] ?? scLibrary)(v); },
};
