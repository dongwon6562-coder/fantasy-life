// 45단계 삽화: 함께 자란 세대(peers), 나라 사이 흐름(accord), 마도구 장인(artifice).
// 등급 선: 피와 주검 없음. 전장의 만남은 칼을 내린 두 사람으로, 폭발은 연기와 깨진 창으로만.
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, road, room, windowAt, shaft, glow, flame, candle, smoke, person, crowd, tree, banner, crows, finish } from './vignetteKit.js';
import { cottage, horseSil } from './vignettePlates4.js';
import { spear, torch, wagon, palisade } from './vignettePlates5.js';
import { table } from './vignettePlates18.js';
import { dwarf, shelf } from './vignettePlates21.js';
import { brazier, handOf, blade } from './vignettePlates22.js';
import { water, hull, rowHouse, lamp, steps } from './vignettePlates23.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const bend = (ctx, a, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let i = 2; i + 3 < a.length; i += 4) ctx.quadraticCurveTo(a[i], a[i + 1], a[i + 2], a[i + 3]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const ring = (ctx, x, y, rx, ry, w, c, rot = 0, a0 = 0, a1 = TAU) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, a0, a1); ctx.stroke(); };
const lit = (ctx, fn) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
const arch = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h + w / 2); ctx.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y); ctx.fill(); };
const WARM = 'rgba(255,190,110,.55)', COLD = 'rgba(190,210,240,.45)', FIRE = 'rgba(255,150,70,.6)', BLUE = 'rgba(150,200,255,.55)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
// 동세대 넷: 판마다 같은 머리빛으로 그려 같은 사람들로 읽히게 한다 (기사·장사꾼·도적·마법사)
const PEER = [{ hair: '#6a4a2a' }, { hair: '#1c1614', female: true, long: true }, { hair: '#8a3a24' }, { hair: '#c8b078', female: true, long: true }];
const peer = (i, o = {}) => ({ ...PEER[i % 4], cloth: ['#3a3e4a', '#5a2e3a', '#2e2a28', '#2e3e5e'][i % 4], ...o });
const mug = (ctx, x, y) => { rect(ctx, x - 3, y - 7, 6, 7, '#6a5236'); rect(ctx, x - 3, y - 7, 6, 1.6, '#e8e0c8'); ring(ctx, x + 4, y - 3.5, 2, 2.4, 1, '#6a5236'); };
const paper = (ctx, x, y, w = 14, h = 9, c = '#e8e0c8') => { rect(ctx, x, y, w, h, c); for (let j = 0; j < 3; j++) stroke(ctx, [x + 2, y + 2 + j * 2.4, x + w - 2, y + 2 + j * 2.4], 0.4, 'rgba(40,30,20,.5)'); };

// ───────── 함께 자란 세대 ─────────
/** 골목의 아이들: 담장 위에 나란히 앉은 같은 또래 다섯. 저녁 굴뚝 연기와 부르는 소리 */
function peYard(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 500, 150, {});
  ground(v, () => 196, { color: '#7a7450', color2: '#4e4a36', tufts: 30 });
  cottage(v, 90, 190, 110, 64, { roof: '#5a4634', wall: '#a89878' }); smoke(v, 120, 110, 60, 12, '#8a8478', 0.22); tree(v, 590, 196, 110, {});
  // 돌담
  for (let i = 0; i < 22; i++) for (let j = 0; j < 3; j++) { const x = 180 + i * 17 + (j % 2) * 8, y = 184 - j * 11; ctx.fillStyle = t(['#8a8474', '#7a7466', '#96907e'][(i + j) % 3]); ctx.beginPath(); ctx.ellipse(x, y, 9, 6, 0, 0, TAU); ctx.fill(); }
  rect(ctx, 172, 186, 390, 12, t('#6a6456'));
  for (let i = 0; i < 4; i++) person(v, 240 + i * 62 + (i > 1 ? 62 : 0), 180, 74, peer(i, { child: true, pose: 'sit', f: i % 2 ? -1 : 1, arm: i === 2 ? 'up' : null, cloth: CL[i], noShadow: true }));
  person(v, 364, 180, 76, mine(v, { child: true, pose: 'sit', f: 0, noShadow: true }));
  // 굴렁쇠와 나무칼
  ring(ctx, 210, 214, 12, 12, 1.4, t('#3a2c20')); stroke(ctx, [470, 222, 500, 214], 2, t('#6a5236')); stroke(ctx, [476, 216, 480, 224], 1.6, t('#6a5236'));
  person(v, 60, 232, 96, folk(1, { f: 1, arm: 'out', female: true, long: true }));
  finish(v, {});
}
/** 다시 모인 자리: 주점 긴 탁자에 어른이 된 얼굴들. 잔은 다섯인데 의자 하나가 비었다 */
function peReunion(v) {
  const { ctx } = v; room(v, { wall: '#5a4a3a', floor: '#30261e', fy: 178 });
  for (const x of [60, 560]) { rect(ctx, x - 20, 30, 40, 60, '#2a2018'); oval(ctx, x, 60, 15, 22, '#3a2c20'); ring(ctx, x, 60, 15, 22, 1, '#1c1410'); }
  windowAt(v, 290, 30, 60, 60, {}); for (const x of [180, 460]) { lamp(v, x, 70, 0.2); stroke(v.ctx, [x, 20, x, 62], 0.8, '#15110e'); }
  rect(ctx, 130, 110, 100, 6, '#3a2c20'); for (let i = 0; i < 5; i++) mug(ctx, 142 + i * 18, 110);
  // 뒤쪽 둘
  person(v, 250, 206, 100, peer(0, { raw: true, f: 1, pose: 'sit', arm: 'up', cloak: true })); person(v, 390, 206, 98, peer(3, { raw: true, f: -1, pose: 'sit', robe: true, arm: 'chest' }));
  table(ctx, 150, 500, 196, '#4a3626', 8, 36); for (const x of [230, 290, 350, 410, 470]) mug(ctx, x, 196); candle(v, 320, 196, 8); glow(v, 320, 184, 80, '#ffb060', 0.16);
  rect(ctx, 250, 190, 30, 6, '#8a6a40'); oval(ctx, 380, 192, 12, 3, '#6a5a44');
  // 빈 의자
  rect(ctx, 456, 150, 4, 60, '#3a2a1c'); rect(ctx, 484, 150, 4, 60, '#3a2a1c'); rect(ctx, 456, 150, 32, 5, '#4a3626'); rect(ctx, 456, 168, 32, 4, '#4a3626'); rect(ctx, 452, 196, 40, 5, '#4a3626');
  // 앞쪽 둘과 나
  person(v, 190, 238, 100, peer(1, { raw: true, f: 1, pose: 'sit', arm: 'fwd', hat: true })); person(v, 540, 238, 100, peer(2, { raw: true, f: -1, hood: true, cloak: true }));
  person(v, 320, 240, 100, mine(v, { raw: true, f: 0, pose: 'sit', noShadow: true, rim: WARM, rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 전장에서 마주침: 두 진영의 깃발 사이, 투구를 벗고 칼을 내린 두 사람. 서로를 알아본다 */
function peField(v) {
  const { ctx, t } = v; sky(v); far(v, {}); const g = (x) => 170 + Math.sin(x / 110) * 6; ground(v, g, { color: '#6a6444', color2: '#444030', tufts: 40 });
  smoke(v, 120, 150, 100, 40, '#4a4640', 0.24); smoke(v, 540, 150, 110, 44, '#4a4640', 0.22);
  // 양쪽 줄
  for (const k of [-1, 1]) { const c = k < 0 ? '#2e4a6e' : '#6e2a30'; for (let i = 0; i < 9; i++) { const x = 320 + k * (190 + i * 14), y = 176 + (i % 3) * 3; person(v, x, y, 34, { cloth: '#3a3a3e', hair: '#1c1614', hat: true, f: -k, noShadow: true }); if (i % 2 === 0) spear(v, x - k * 3, y, 46, k * 0.05); } banner(v, 320 + k * 230, 178, 76, c, { mark: '#d8d0b8', d: -k }); banner(v, 320 + k * 290, 180, 60, c, { d: -k }); }
  // 쓰러진 방패와 꺾인 창
  oval(ctx, 300, 226, 16, 5, t('#5a2e2e')); stroke(ctx, [350, 230, 392, 222], 1.6, t('#3a2c20')); stroke(ctx, [392, 222, 400, 228], 1.6, t('#3a2c20'));
  person(v, 260, 228, 102, mine(v, { f: 1, cloak: true })); { const [hx, hy] = handOf(260, 228, 102, 1); blade(v, hx - 14, hy + 22, 1, -1.2, 34, {}); } oval(ctx, 236, 198, 8, 7, t('#6a6a70'));
  person(v, 386, 228, 102, peer(0, { f: -1, cloak: true, cloth: '#6e2a30' })); { const [hx, hy] = handOf(386, 228, 102, -1); blade(v, hx + 14, hy + 22, -1, -1.2, 34, {}); } oval(ctx, 412, 200, 8, 7, t('#6a6a70'));
  crows(v, 320, 50, 6, 120);
  finish(v, { noLeaves: true });
}
/** 재판정에서: 피고석 난간 안에 선 옛 얼굴과 방청석의 나. 판관의 높은 단 */
function peDock(v) {
  const { ctx } = v; room(v, { wall: '#5e5448', floor: '#383028', fy: 180 });
  for (const x of [80, 200, 440, 560]) windowAt(v, x - 14, 20, 28, 70, { arch: true }); shaft(v, 220, 90, 40, 120, 40, '#e8e0c8', 0.1);
  rect(ctx, 250, 110, 140, 70, '#4a3626'); rect(ctx, 244, 104, 152, 8, '#5a4030'); person(v, 320, 150, 92, { raw: true, f: 0, pose: 'sit', cloth: '#1c1a1c', hair: '#d8d4cc', old: true, robe: true }); rect(ctx, 250, 134, 140, 46, '#4a3626'); rect(ctx, 300, 128, 40, 4, '#e8e0c8');
  // 피고석
  person(v, 470, 222, 100, peer(2, { raw: true, f: -1, arm: 'chest' })); stroke(ctx, [458, 162, 470, 166, 482, 162], 1.4, '#6a6a70');
  rect(ctx, 430, 180, 84, 4, '#3a2a1c'); for (let i = 0; i < 6; i++) rect(ctx, 432 + i * 16, 184, 3, 40, '#3a2a1c'); rect(ctx, 430, 222, 84, 4, '#3a2a1c');
  for (const x of [540, 580]) { person(v, x, 226, 96, { raw: true, f: -1, cloth: '#3a3e44', hair: '#1c1614', hat: true }); spear(v, x + 10, 226, 110, 0); }
  // 방청석
  rect(ctx, 40, 196, 200, 5, '#4a3626'); for (let i = 0; i < 4; i++) person(v, 62 + i * 46, 236, 92, folk(i + 1, { raw: true, f: 1, pose: 'sit' }));
  person(v, 270, 240, 104, mine(v, { raw: true, f: 1, rim: WARM, rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 궁정에서: 높은 계단 위 비단옷의 옛 동무와 그 아래의 나. 시종들이 길을 튼다 */
function peCourt(v) {
  const { ctx } = v; room(v, { wall: '#6a5e50', floor: '#3a3028', fy: 184 });
  for (const x of [60, 180, 460, 580]) { rect(ctx, x - 12, 0, 24, 186, '#7a6e5e'); rect(ctx, x - 16, 0, 32, 10, '#8a7e6c'); } for (const x of [120, 520]) banner(v, x, 150, 110, '#2e4a6e', { raw: true, mark: '#e8c860', d: x < 320 ? 1 : -1 });
  windowAt(v, 296, 14, 48, 80, { arch: true }); shaft(v, 320, 94, 70, 130, 0, '#fff0c8', 0.12);
  for (let i = 0; i < 6; i++) rect(ctx, 200 + i * 14, 184 - (6 - i) * 9, 240 - i * 28, 9, i % 2 ? '#8a7e6c' : '#7c7060'); poly(ctx, [296, 130, 344, 130, 372, 184, 268, 184], '#6e2a30');
  person(v, 320, 132, 92, peer(1, { raw: true, f: 0, cloth: '#7a2e3a', cloak: true, rim: WARM, rimDir: 1 }));
  for (const k of [-1, 1]) { person(v, 320 + k * 70, 150, 80, { raw: true, f: -k, cloth: '#3a3e4a', hair: '#3a2a1e', pose: 'bow' }); person(v, 320 + k * 150, 214, 92, folk(k + 2, { raw: true, f: -k, cloak: true, hat: k > 0 })); }
  person(v, 250, 238, 102, mine(v, { raw: true, f: 1, rim: WARM, rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 소식: 문간에 선 파발꾼이 건네는 편지. 창밖 먼 길로 누군가의 행렬이 지나간다 */
function peNews(v) {
  const { ctx } = v; room(v, { wall: '#5a4e40', floor: '#342a22', fy: 182 });
  // 열린 문과 바깥
  rect(ctx, 420, 40, 110, 142, '#b8c4c8'); rect(ctx, 420, 130, 110, 52, '#7a8458'); poly(ctx, [420, 150, 530, 138, 530, 146, 420, 160], '#a89a78');
  for (let i = 0; i < 5; i++) { person(v, 440 + i * 18, 150 - i * 2, 16, { raw: true, cloth: '#3a3e4a', hair: '#1c1614', f: 1, noShadow: true }); } rect(ctx, 520, 110, 1.2, 36, '#2a2018'); poly(ctx, [521, 110, 534, 114, 521, 119], '#2e4a6e');
  rect(ctx, 412, 34, 8, 150, '#3a2c20'); rect(ctx, 530, 34, 8, 150, '#3a2c20'); rect(ctx, 412, 32, 126, 8, '#3a2c20'); poly(ctx, [538, 40, 590, 52, 590, 190, 538, 182], '#4a3626'); shaft(v, 470, 182, 110, 60, -70, '#e8e8e0', 0.1);
  // 방 안
  rect(ctx, 60, 60, 60, 70, '#3a2c20'); shelf(ctx, 64, 64, 52, 3, 4); table(ctx, 150, 290, 196, '#4a3626', 7, 34); candle(v, 180, 196, 7); paper(ctx, 210, 190, 18, 6); rect(ctx, 250, 186, 10, 10, '#6a5236');
  person(v, 452, 230, 98, { raw: true, f: -1, cloth: '#5a4a3a', hair: '#3a2a1e', hat: true, cloak: true, arm: 'fwd' }); { const [hx, hy] = handOf(452, 230, 98, -1); paper(ctx, hx - 16, hy - 5, 16, 10); oval(ctx, hx - 8, hy + 2, 2, 2, '#8a2a2a'); } rect(ctx, 462, 176, 12, 16, '#6a5236');
  person(v, 360, 234, 102, mine(v, { raw: true, f: 1, arm: 'fwd', rim: COLD, rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 몰락한 얼굴: 비 오는 골목 담 밑에 웅크린 옛 동무. 지나가던 내가 멈춰 선다 */
function peFallen(v) {
  const { ctx, t } = v; sky(v); rowHouse(v, 0, 150, 10, 196, '#5e564c', { door: 0.3 }); rowHouse(v, 150, 120, 40, 196, '#544e48', { step: true }); rowHouse(v, 430, 210, 20, 196, '#5a5248', { door: 0.7 }); for (const [x, y] of [[40, 70], [110, 118], [500, 80], [590, 128]]) { rect(ctx, x, y, 8, 12, '#ffca80'); glow(v, x + 4, y + 6, 12, '#ffb060', 0.16); }
  rect(ctx, 270, 60, 160, 136, t('#3e3a3a')); arch(ctx, 320, 196, 60, 100, t('#24222a')); lamp(v, 300, 110, 0.18);
  rect(ctx, 0, 196, VW, 44, t('#4a4846')); for (let i = 0; i < 9; i++) oval(ctx, 40 + hash(i, 3) * 560, 206 + hash(i, 4) * 28, 22, 3, 'rgba(170,180,200,.16)');
  // 웅크린 사람과 빈 그릇
  person(v, 500, 230, 86, peer(2, { f: -1, pose: 'huddle', cloth: '#3a3632', cloak: true })); oval(ctx, 462, 230, 8, 2.6, t('#6a5a44')); rect(ctx, 520, 196, 30, 34, t('#3a302a'));
  person(v, 330, 236, 104, mine(v, { f: 1, cloak: true, hat: true }));
  person(v, 150, 222, 80, folk(4, { f: -1, cloak: true, hood: true })); 
  for (let i = 0; i < 120; i++) { const x = hash(i, 8) * VW, y = hash(i, 9) * VH; stroke(ctx, [x, y, x - 3, y + 10], 0.6, 'rgba(200,210,230,.3)'); }
  finish(v, { noLeaves: true });
}
/** 엇갈린 길: 갈림길 이정표 앞. 하나는 기사 행렬을 따라, 하나는 상단 수레를 따라 멀어진다 */
function peApart(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); const g = (x) => 176 + Math.sin(x / 140) * 5; ground(v, g, { color: '#7a7a50', color2: '#50503a', tufts: 50 });
  // 갈라지는 두 길
  poly(ctx, [270, 240, 370, 240, 180, 176, 60, 172, 50, 178, 150, 184], t('#9a8c6a')); poly(ctx, [270, 240, 370, 240, 500, 180, 610, 172, 600, 166, 470, 174], t('#9a8c6a'));
  // 왼쪽: 기사 행렬
  for (let i = 0; i < 3; i++) { horseSil(v, 110 - i * 30, 176 - i, 30, -1, ['#3a2a20', '#5a4a3a', '#2a2420'][i]); person(v, 110 - i * 30, 160 - i, 22, { cloth: '#3a3e4a', hair: '#1c1614', f: -1, noShadow: true }); spear(v, 114 - i * 30, 160 - i, 30, -0.05); } banner(v, 40, 174, 40, '#2e4a6e', { d: -1 });
  person(v, 170, 190, 46, peer(0, { f: -1, cloak: true }));
  // 오른쪽: 상단 수레
  wagon(v, 560, 176, 0.5, 1); wagon(v, 610, 172, 0.42, 1); person(v, 500, 190, 46, peer(1, { f: 1, hat: true }));
  // 이정표와 나
  stroke(ctx, [320, 214, 320, 140], 3, t('#3a2c20')); poly(ctx, [320, 146, 270, 146, 258, 153, 270, 160, 320, 160], t('#6a5236')); poly(ctx, [320, 164, 372, 164, 384, 171, 372, 178, 320, 178], t('#6a5236'));
  person(v, 320, 240, 102, mine(v, { f: 0, cloak: true })); tree(v, 420, 196, 80, { bare: false });
  finish(v, {});
}
export const PEERS24 = { yard: peYard, reunion: peReunion, field: peField, dock: peDock, court: peCourt, news: peNews, fallen: peFallen, apart: peApart };

// ───────── 나라 사이 흐름 ─────────
/** 조약: 두 나라 깃발 아래 긴 탁자. 깃펜과 인장, 마주 앉은 두 사절단 */
function acTreaty(v) {
  const { ctx } = v; room(v, { wall: '#62584a', floor: '#3a3028', fy: 180 });
  for (const x of [250, 320, 390]) windowAt(v, x - 14, 20, 28, 76, { arch: true }); shaft(v, 320, 96, 150, 110, 0, '#f0e8d0', 0.08);
  for (const k of [-1, 1]) { const c = k < 0 ? '#2e4a6e' : '#6e2a30'; for (const d of [150, 230]) banner(v, 320 + k * d, 160, 130, c, { raw: true, mark: k < 0 ? '#e8c860' : '#1c1614', d: -k });
    for (let i = 0; i < 3; i++) person(v, 320 + k * (60 + i * 62), 206, 96, { raw: true, f: -k, pose: 'sit', cloth: i === 0 ? c : ['#3a3e4a', '#4a4038', '#3a3028'][i], hair: HR[i + (k > 0 ? 3 : 0)], old: i === 0, cloak: i === 0, arm: i === 0 ? 'fwd' : 'chest' }); }
  table(ctx, 110, 530, 196, '#4a3626', 8, 36); rect(ctx, 110, 192, 420, 4, '#6e2a30');
  // 문서, 깃펜, 인장
  rect(ctx, 286, 186, 68, 8, '#efe6cc'); for (let j = 0; j < 2; j++) stroke(ctx, [292, 188.5 + j * 3, 348, 188.5 + j * 3], 0.5, 'rgba(40,30,20,.5)'); oval(ctx, 300, 192, 3, 2, '#8a2a2a'); oval(ctx, 340, 192, 3, 2, '#2e4a6e');
  stroke(ctx, [362, 190, 372, 170], 1, '#e8e0c8'); rect(ctx, 358, 188, 8, 6, '#1c1614'); for (const x of [180, 460]) { candle(v, x, 196, 9); glow(v, x, 184, 40, '#ffb060', 0.14); }
  // 서기와 나
  person(v, 80, 236, 96, { raw: true, f: 1, cloth: '#3a3028', hair: '#b8b4ac', old: true, arm: 'chest' }); rect(ctx, 86, 168, 14, 18, '#e8e0c8');
  person(v, 560, 238, 102, mine(v, { raw: true, f: -1, rim: WARM, rimDir: -1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 무역 봉쇄: 항구 어귀를 가로지른 쇠사슬. 묶인 배들과 쌓인 궤짝, 돌려보내지는 상인 */
function acBlockade(v) {
  const { ctx, t } = v; sky(v); far(v, {}); water(v, 124, '#56646e', 5);
  // 어귀의 두 탑과 사슬
  for (const x of [200, 470]) { rect(ctx, x - 14, 76, 28, 60, t('#5a5650')); for (let i = 0; i < 4; i++) rect(ctx, x - 16 + i * 9, 70, 6, 7, t('#5a5650')); rect(ctx, x - 2, 96, 4, 9, '#1c1a1c'); } banner(v, 200, 70, 30, '#6e2a30', { d: 1 });
  ctx.setLineDash([5, 3]); bend(ctx, [214, 124, 335, 142, 456, 124], 2.6, '#1c1a1c'); ctx.setLineDash([]);
  for (const [x, y, w, m] of [[90, 150, 80, 50], [330, 168, 110, 64], [570, 148, 70, 44]]) { hull(v, x, y, w, '#2e2824', m); stroke(ctx, [x - w / 2, y + 2, x + w / 2, y + 2], 2, 'rgba(20,24,30,.3)'); }
  for (let i = 0; i < 3; i++) hull(v, 280 + i * 40, 112, 22, '#3a3632', 14);
  // 부두와 쌓인 짐
  poly(ctx, [0, 240, 0, 190, 640, 198, 640, 240], t('#5e5a52')); for (let i = 0; i < 8; i++) rect(ctx, 30 + i * 80, 184 + i, 8, 12, t('#2e2a26'));
  for (const [x, y, w, h, c] of [[40, 196, 34, 26, '#6a5236'], [76, 204, 30, 18, '#5a4630'], [50, 174, 28, 22, '#7a6040'], [520, 206, 36, 24, '#6a5236'], [560, 212, 28, 18, '#5a4630'], [534, 186, 30, 20, '#7a6040']]) { rect(ctx, x, y, w, h, t(c)); stroke(ctx, [x, y, x + w, y + h], 0.6, 'rgba(20,16,12,.3)'); stroke(ctx, [x + w, y, x, y + h], 0.6, 'rgba(20,16,12,.3)'); }
  for (const x of [120, 140, 132]) { oval(ctx, x, 222 - (x === 132 ? 12 : 0), 9, 7, t('#4a3a2a')); ring(ctx, x, 222 - (x === 132 ? 12 : 0), 9, 7, 0.8, t('#2a2018')); }
  // 막아선 병사와 상인
  for (let i = 0; i < 2; i++) { person(v, 300 + i * 36, 224, 94, { cloth: '#3a3e44', hair: '#1c1614', hat: true, f: 1, arm: i ? 'out' : null }); spear(v, 290 + i * 36, 224, 110, 0); }
  person(v, 410, 228, 96, { cloth: '#5a2e3a', hair: '#3a2a1e', hat: true, f: -1, arm: 'out', cloak: true }); person(v, 460, 234, 102, mine(v, { f: -1 }));
  crows(v, 320, 40, 5, 100);
  finish(v, { noLeaves: true });
}
/** 국경 다툼: 시내를 사이에 둔 경계석과 가로막. 양쪽 순찰대가 마주 서 있고 한쪽이 말뚝을 옮겨 박는다 */
function acBorder(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true }); const g = (x) => 160 + Math.sin(x / 100) * 5; ground(v, g, { color: '#727a50', color2: '#4a5038', tufts: 60 });
  // 시내
  ctx.fillStyle = t('#6a8494'); ctx.beginPath(); ctx.moveTo(300, 160); ctx.quadraticCurveTo(350, 190, 300, 210); ctx.quadraticCurveTo(270, 228, 300, 240); ctx.lineTo(360, 240); ctx.quadraticCurveTo(330, 226, 350, 210); ctx.quadraticCurveTo(390, 186, 330, 160); ctx.fill();
  // 경계석과 말뚝 줄
  poly(ctx, [394, 206, 398, 150, 404, 142, 410, 150, 414, 206], t('#8a867a')); rect(ctx, 397.4, 160, 13.2, 5, t('#2e4a6e')); rect(ctx, 397, 168, 14, 5, t('#6e2a30')); rect(ctx, 390, 204, 28, 5, t('#6e6a60'));
  for (let i = 0; i < 6; i++) { const x = 250 - i * 8, y = 176 + i * 12; rect(ctx, x, y - 14, 3, 14, t('#3a2c20')); if (i) stroke(ctx, [x + 9, y - 22, x + 1, y - 10], 0.8, t('#6a5a40')); }
  for (const k of [-1, 1]) { const c = k < 0 ? '#2e4a6e' : '#6e2a30', bx = 320 + k * 150; banner(v, bx + k * 60, 190, 100, c, { mark: '#d8d0b8', d: -k });
    for (let i = 0; i < 3; i++) { const x = bx + k * i * 34, y = 206 + i * 8, h = 80 + i * 6; person(v, x, y, h, { cloth: i === 0 ? c : '#3a3e44', hair: HR[i], hat: i > 0, f: -k, cloak: i === 0, arm: i === 0 ? 'out' : null }); if (i) spear(v, x + k * 9, y, h * 1.16, k * 0.03); }
    palisade(v, k < 0 ? 0 : 560, k < 0 ? 80 : 640, 196, 26); }
  // 말뚝을 박는 사람
  person(v, 236, 222, 80, { cloth: '#4a4038', hair: '#2a1e16', f: 1, pose: 'bow', arm: 'fwd' }); rect(ctx, 256, 196, 8, 6, t('#4a4a50'));
  person(v, 500, 238, 102, mine(v, { f: -1, cloak: true }));
  finish(v, {});
}
/** 혼인 동맹: 두 나라 깃발을 건 성문으로 들어서는 신부의 마차와 호위. 길가의 사람들 */
function acWedding(v) {
  const { ctx, t } = v; sky(v); far(v, {}); ground(v, () => 186, { color: '#7a7a54', color2: '#52523c', plain: true });
  // 성벽과 문
  rect(ctx, 0, 70, VW, 116, t('#8a8272')); for (let i = 0; i < 27; i++) rect(ctx, i * 24, 60, 14, 10, t('#8a8272')); for (let i = 0; i < 14; i++) for (let j = 0; j < 5; j++) stroke(ctx, [i * 48 + (j % 2) * 24, 80 + j * 22, i * 48 + (j % 2) * 24 + 40, 80 + j * 22], 0.5, 'rgba(30,26,22,.2)');
  rect(ctx, 250, 40, 140, 146, t('#9a9282')); for (let i = 0; i < 6; i++) rect(ctx, 250 + i * 25, 30, 15, 10, t('#9a9282')); arch(ctx, 280, 186, 80, 110, t('#2a2622'));
  banner(v, 240, 150, 130, '#2e4a6e', { mark: '#e8c860', d: -1 }); banner(v, 400, 150, 130, '#6e2a30', { mark: '#e8e0c8', d: 1 });
  for (let i = 0; i < 9; i++) { const x = 286 + i * 8.4; bend(ctx, [x, 78, x + 4, 84, x + 8, 78], 1.4, t(i % 2 ? '#e8e0c8' : '#c8a850')); }
  poly(ctx, [280, 186, 360, 186, 470, 240, 170, 240], t('#a89a78'));
  // 마차
  const cx = 340, cy = 216; ctx.save(); ctx.translate(cx, cy); ctx.scale(1.5, 1.5); ctx.translate(-cx, -cy); rect(ctx, cx - 34, cy - 40, 68, 30, t('#e8e0d0')); poly(ctx, [cx - 38, cy - 40, cx + 38, cy - 40, cx + 30, cy - 52, cx - 30, cy - 52], t('#c8a850')); rect(ctx, cx - 10, cy - 34, 20, 16, t('#3a3640')); person(v, cx, cy - 14, 30, { cloth: '#f0ece0', hair: '#3a2a1e', female: true, veil: true, f: 1, noShadow: true }); rect(ctx, cx - 34, cy - 20, 68, 10, t('#e8e0d0'));
  for (const wx of [-22, 22]) { ring(ctx, cx + wx, cy - 4, 10, 10, 2, t('#2a2018')); for (let i = 0; i < 4; i++) stroke(ctx, [cx + wx - Math.cos(i * 0.785) * 10, cy - 4 - Math.sin(i * 0.785) * 10, cx + wx + Math.cos(i * 0.785) * 10, cy - 4 + Math.sin(i * 0.785) * 10], 0.6, t('#2a2018')); } ctx.restore();
  horseSil(v, cx - 96, cy, 62, -1, '#d8d4cc'); horseSil(v, cx - 136, cy + 2, 62, -1, '#c8c4bc');
  for (const k of [-1, 1]) { horseSil(v, cx + k * 170 + 20, 228, 58, -1, '#3a2a20'); person(v, cx + k * 170 + 20, 196, 62, { cloth: k < 0 ? '#2e4a6e' : '#6e2a30', hair: '#1c1614', hat: true, f: -1, noShadow: true }); spear(v, cx + k * 170 + 30, 196, 78, 0); }
  crowd(v, 0, 90, 232, 4, 78, {}); crowd(v, 560, 640, 232, 4, 78, {});
  person(v, 110, 238, 100, mine(v, { f: 1, arm: 'up' }));
  for (let i = 0; i < 30; i++) oval(ctx, 200 + hash(i, 3) * 260, 90 + hash(i, 4) * 120, 1.4, 1, i % 2 ? 'rgba(240,220,230,.8)' : 'rgba(240,230,170,.8)');
  finish(v, { noLeaves: true });
}
/** 깨진 약속: 밤의 회의실. 찢긴 조약문과 엎질러진 잉크, 자리를 박차고 나가는 사절단. 벽의 깃발 하나가 내려졌다 */
function acBetray(v) {
  const { ctx } = v; room(v, { wall: '#3e3a40', floor: '#242026', fy: 180, stone: true });
  for (const x of [200, 320, 440]) windowAt(v, x - 14, 20, 28, 76, { arch: true });
  banner(v, 110, 160, 130, '#2e4a6e', { raw: true, mark: '#e8c860', d: 1 }); stroke(ctx, [530, 160, 530, 30], 2.6, '#2e241a'); poly(ctx, [520, 160, 570, 164, 560, 176, 516, 172], '#6e2a30');
  table(ctx, 130, 470, 196, '#4a3626', 8, 36);
  // 찢긴 문서와 잉크
  poly(ctx, [270, 186, 300, 186, 296, 190, 302, 194, 270, 194], '#efe6cc'); poly(ctx, [310, 184, 344, 188, 342, 196, 306, 193, 312, 189], '#efe6cc'); oval(ctx, 372, 193, 14, 3, '#141018'); ctx.save(); ctx.translate(360, 192); ctx.rotate(1.3); rect(ctx, -4, -8, 8, 8, '#1c1614'); ctx.restore();
  candle(v, 200, 196, 9); glow(v, 200, 184, 70, '#ffb060', 0.16); stroke(ctx, [420, 196, 420, 188], 2, '#e8e0c8'); smoke(v, 420, 186, 30, 5, '#a8a4a0', 0.3);
  // 넘어진 의자
  ctx.save(); ctx.translate(450, 232); ctx.rotate(-1.2); rect(ctx, -10, -28, 20, 28, '#4a3626'); rect(ctx, -10, -50, 4, 50, '#3a2a1c'); rect(ctx, 6, -28, 4, 28, '#3a2a1c'); ctx.restore();
  // 나가는 사절단
  arch(ctx, 570, 180, 60, 120, '#0e0c10');
  for (let i = 0; i < 3; i++) person(v, 520 + i * 28, 214 - i * 8, 96 - i * 10, { raw: true, f: 1, cloth: i === 0 ? '#6e2a30' : '#3a3034', hair: HR[i + 2], cloak: true, rim: COLD, rimDir: -1 });
  // 남은 사람들
  person(v, 180, 206, 96, { raw: true, f: 1, pose: 'sit', cloth: '#2e4a6e', hair: '#b8b4ac', old: true, cloak: true, arm: 'chest', rim: WARM, rimDir: 1 });
  person(v, 300, 240, 104, mine(v, { raw: true, f: 1, arm: 'out', rim: WARM, rimDir: -1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 봉쇄가 내려온 시장: 빈 좌판과 분필로 고쳐 쓴 값. 줄 선 사람들과 텅 빈 수레 */
function acMarket(v) {
  const { ctx, t } = v; sky(v); rowHouse(v, 0, 120, 30, 190, '#7a6c58', { door: 0.4 }); rowHouse(v, 120, 100, 54, 190, '#6a6052', { step: true }); rowHouse(v, 440, 100, 46, 190, '#746654', {}); rowHouse(v, 540, 100, 26, 190, '#6a5e52', { step: true, door: 0.6 });
  rect(ctx, 220, 80, 220, 110, t('#58524a')); rect(ctx, 310, 50, 40, 140, t('#625c52')); poly(ctx, [304, 50, 330, 20, 356, 50], t('#4a3a30')); oval(ctx, 330, 76, 9, 9, '#e8e0c8');
  rect(ctx, 0, 190, VW, 50, t('#625c52')); for (let i = 0; i < 40; i++) oval(ctx, hash(i, 2) * VW, 196 + hash(i, 3) * 40, 9, 2.4, rgba('#000000', 0.08));
  const stall = (x, c, full) => { poly(ctx, [x - 46, 150, x + 46, 150, x + 38, 134, x - 38, 134], t(c)); rect(ctx, x - 40, 150, 3, 60, t('#3a2c20')); rect(ctx, x + 37, 150, 3, 60, t('#3a2c20')); rect(ctx, x - 44, 184, 88, 6, t('#4a3a2a')); if (full) for (let i = 0; i < 6; i++) oval(ctx, x - 30 + i * 12, 181, 5, 4, t(['#b8742e', '#8a3a2a', '#9a8a3a'][i % 3])); };
  stall(140, '#6e3a30', false); stall(280, '#3e4a5a', false); stall(430, '#5a5030', true);
  // 값 적은 판
  rect(ctx, 470, 120, 44, 56, t('#2a2622')); for (let i = 0; i < 4; i++) { stroke(ctx, [476, 130 + i * 11, 492, 130 + i * 11], 1, 'rgba(230,230,220,.7)'); stroke(ctx, [498, 127 + i * 11, 506, 133 + i * 11], 1, 'rgba(230,230,220,.5)'); stroke(ctx, [500, 126 + i * 11, 508, 126 + i * 11], 1.4, 'rgba(240,200,120,.9)'); } rect(ctx, 490, 176, 4, 34, t('#3a2c20'));
  for (let i = 0; i < 6; i++) person(v, 400 - i * 22 - (i > 2 ? 70 : 0), 216 + (i % 2) * 4, 80, folk(i, { f: 1, female: i % 2 === 0, long: i % 2 === 0, veil: i === 4, arm: i === 0 ? 'fwd' : 'chest' }));
  person(v, 440, 212, 82, folk(5, { f: -1, old: true, arm: 'out' })); wagon(v, 580, 232, 0.8, -1);
  person(v, 80, 238, 102, mine(v, { f: 1 }));
  finish(v, { noLeaves: true });
}
/** 대륙 정세: 큰 지도 탁자 위의 말과 깃발 핀. 둘러선 재상과 장군, 귀엣말하는 사람 */
function acMap(v) {
  const { ctx } = v; room(v, { wall: '#4a4440', floor: '#2a2624', fy: 172, stone: true });
  for (const x of [70, 570]) { shelf(ctx, x - 40, 30, 80, 4, x); } rect(ctx, 200, 24, 240, 100, '#3a2c20'); rect(ctx, 206, 30, 228, 88, '#8a7c5c'); bend(ctx, [220, 60, 270, 40, 320, 66, 370, 50, 420, 70], 1, '#6a5a40'); bend(ctx, [230, 100, 300, 84, 360, 104, 420, 92], 1, '#6a5a40'); for (const [x, y, c] of [[250, 56, '#2e4a6e'], [330, 76, '#6e2a30'], [390, 60, '#3e5a3a'], [290, 96, '#8a6a30']]) oval(ctx, x, y, 3, 3, c);
  // 지도 탁자
  poly(ctx, [130, 214, 510, 214, 470, 176, 170, 176], '#a89870'); poly(ctx, [130, 214, 510, 214, 510, 222, 130, 222], '#4a3626'); rect(ctx, 150, 222, 8, 18, '#3a2a1c'); rect(ctx, 482, 222, 8, 18, '#3a2a1c');
  bend(ctx, [180, 200, 250, 184, 320, 204, 400, 186, 470, 204], 1, '#7a6a4a'); bend(ctx, [220, 180, 280, 196, 330, 182], 0.8, '#5a7a8a');
  for (const [x, y, c] of [[220, 196, '#2e4a6e'], [250, 188, '#2e4a6e'], [340, 198, '#6e2a30'], [380, 190, '#6e2a30'], [420, 202, '#6e2a30'], [300, 186, '#3e5a3a'], [450, 188, '#8a6a30']]) { rect(ctx, x - 0.6, y - 12, 1.2, 12, '#2a2018'); poly(ctx, [x, y - 12, x + 8, y - 9, x, y - 6], c); }
  stroke(ctx, [270, 200, 330, 192], 1, '#8a2a2a'); stroke(ctx, [330, 192, 324, 190], 1, '#8a2a2a'); stroke(ctx, [330, 192, 326, 196], 1, '#8a2a2a');
  lamp(v, 320, 150, 0.2); stroke(ctx, [320, 0, 320, 143], 0.8, '#15110e'); glow(v, 320, 190, 160, '#ffb060', 0.06, 36);
  person(v, 200, 208, 100, { raw: true, f: 1, cloth: '#2e4a6e', hair: '#b8b4ac', old: true, cloak: true, arm: 'fwd', rim: WARM, rimDir: 1 }); person(v, 440, 208, 102, { raw: true, f: -1, cloth: '#3a3e44', hair: '#3a2a1e', cloak: true, rim: WARM, rimDir: -1 });
  person(v, 530, 232, 96, { raw: true, f: -1, cloth: '#2a2a30', hair: '#1c1614', hood: true, cloak: true }); person(v, 566, 236, 98, { raw: true, f: -1, cloth: '#5a2e3a', hair: '#6a4a2a', hat: true });
  person(v, 100, 238, 104, mine(v, { raw: true, f: 1, rim: WARM, rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 막힌 길: 국경 검문소의 가로대와 줄지어 선 수레들. 짐을 뒤지는 병사와 기다리는 상인들 */
function acToll(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true }); const g = (x) => 176 + Math.sin(x / 130) * 4; ground(v, g, { color: '#7a7650', color2: '#504c38', tufts: 40 });
  poly(ctx, [0, 214, 0, 190, 640, 186, 640, 222], t('#a09272'));
  // 초소와 가로대
  rect(ctx, 400, 120, 60, 70, t('#6a5c48')); poly(ctx, [392, 120, 430, 96, 468, 120], t('#4a3a30')); rect(ctx, 420, 150, 16, 40, t('#2a221c')); banner(v, 470, 190, 110, '#6e2a30', { mark: '#1c1614', d: 1 });
  rect(ctx, 372, 170, 6, 40, t('#3a2c20')); ctx.save(); ctx.translate(375, 176); ctx.rotate(-0.06); for (let i = 0; i < 8; i++) rect(ctx, -150 + i * 20, -3, 20, 6, i % 2 ? '#d8d0b8' : '#8a2a2a'); ctx.restore(); rect(ctx, 222, 178, 5, 30, t('#3a2c20'));
  // 줄 선 수레
  for (let i = 0; i < 4; i++) { wagon(v, 170 - i * 62, 208 - i * 3, 0.74 - i * 0.1, 1); } horseSil(v, 232, 212, 50, 1, '#5a3a24');
  person(v, 300, 222, 88, { cloth: '#3a3e44', hair: '#1c1614', hat: true, f: -1, arm: 'out' }); spear(v, 312, 222, 104, 0.02);
  person(v, 196, 226, 84, { cloth: '#3a3e44', hair: '#3a2a1e', hat: true, f: -1, pose: 'bow', arm: 'fwd' }); rect(ctx, 150, 214, 26, 14, t('#6a5236'));
  person(v, 258, 230, 92, { cloth: '#5a4a2a', hair: '#6a4a2a', hat: true, f: 1, arm: 'out' });
  person(v, 540, 238, 102, mine(v, { f: -1, cloak: true })); for (let i = 0; i < 3; i++) person(v, 30 + i * 22, 196, 40, folk(i, { f: 1, pose: i === 1 ? 'sit' : 'stand', noShadow: true }));
  finish(v, {});
}
export const ACCORD24 = { treaty: acTreaty, blockade: acBlockade, border: acBorder, wedding: acWedding, betray: acBetray, market: acMarket, map: acMap, toll: acToll };

// ───────── 마도구 장인 ─────────
/** 마석: 깎인 면이 빛나는 돌 */
const gem = (v, x, y, s, c = '#7ac8f0', a = 0.22) => { const { ctx } = v; poly(ctx, [x - s, y, x - s * 0.5, y - s * 0.9, x + s * 0.5, y - s * 0.9, x + s, y, x, y + s * 0.8], c); poly(ctx, [x - s * 0.5, y - s * 0.9, x, y, x + s * 0.5, y - s * 0.9], 'rgba(255,255,255,.45)'); glow(v, x, y, s * 5, c, a); };
/** 공방 뒷벽: 연장 걸이와 선반, 화덕 */
function shopWall(v, o = {}) {
  const { ctx } = v; room(v, { wall: o.wall ?? '#4e463e', floor: o.floor ?? '#2e2620', fy: 180, stone: true });
  rect(ctx, 30, 40, 130, 5, '#2a2018'); for (let i = 0; i < 7; i++) { const x = 40 + i * 17; stroke(ctx, [x, 45, x, 62 + (i % 3) * 8], 1.4, '#6a6a70'); if (i % 2) rect(ctx, x - 3, 62 + (i % 3) * 8, 6, 5, '#4a4a50'); else stroke(ctx, [x - 3, 66 + (i % 3) * 8, x + 3, 66 + (i % 3) * 8], 1.4, '#6a6a70'); }
  shelf(ctx, 470, 40, 130, 3, 9); for (let i = 0; i < 4; i++) gem(v, 486 + i * 30, 132, 4, ['#7ac8f0', '#f0a060', '#a0e0a0', '#c8a0f0'][i], 0.14); rect(ctx, 470, 138, 130, 4, '#2a2018');
  if (!o.noForge) { rect(ctx, 200, 110, 70, 70, '#342e2a'); arch(ctx, 214, 180, 42, 40, '#1c1614'); rect(ctx, 224, 60, 22, 50, '#342e2a'); flame(v, 235, 176, 8); glow(v, 235, 160, 70, '#ff8a3a', 0.16); }
}
/** 공방 작업대: 확대경과 마석, 설계 그림. 밤늦게 혼자 */
function afBench(v) {
  const { ctx } = v; shopWall(v, {}); windowAt(v, 330, 40, 60, 60, {});
  table(ctx, 250, 520, 190, '#4a3626', 9, 40); paper(ctx, 280, 182, 50, 8, '#d8ccaa'); ring(ctx, 300, 186, 6, 2.4, 0.6, '#6a3a2a'); stroke(ctx, [316, 184, 326, 188], 0.6, '#6a3a2a');
  // 확대경 받침
  stroke(ctx, [400, 190, 400, 150], 2, '#6a5a3a'); stroke(ctx, [400, 152, 420, 146], 2, '#6a5a3a'); ring(ctx, 432, 146, 13, 13, 2, '#8a7440'); oval(ctx, 432, 146, 12, 12, 'rgba(180,220,255,.22)');
  gem(v, 432, 176, 6, '#7ac8f0', 0.26); rect(ctx, 424, 182, 16, 8, '#2a2018'); for (let i = 0; i < 3; i++) gem(v, 470 + i * 13, 186, 3, ['#f0a060', '#a0e0a0', '#c8a0f0'][i], 0.14);
  lamp(v, 360, 176, 0.22); rect(ctx, 356, 182, 8, 8, '#2a2018');
  person(v, 386, 236, 104, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: BLUE, rimDir: 1 })); rect(ctx, 366, 200, 44, 6, '#3a2a1c'); rect(ctx, 370, 206, 5, 34, '#3a2a1c'); rect(ctx, 402, 206, 5, 34, '#3a2a1c');
  // 선반의 끝낸 물건들
  rect(ctx, 60, 150, 110, 5, '#2a2018'); ring(ctx, 80, 142, 6, 7, 1.6, '#c8a850'); stroke(ctx, [104, 150, 110, 120], 2, '#8a8e96'); rect(ctx, 128, 136, 14, 14, '#6a5236'); oval(ctx, 135, 134, 3, 3, '#7ac8f0'); oval(ctx, 158, 144, 6, 6, '#3a3e4a');
  finish(v, { inside: true, noLeaves: true });
}
/** 마석 다듬기: 발로 돌리는 숫돌에서 튀는 푸른 불티. 물통과 거친 원석 더미 */
function afCut(v) {
  const { ctx } = v; shopWall(v, {});
  // 숫돌 틀
  rect(ctx, 300, 176, 8, 50, '#3a2a1c'); rect(ctx, 372, 176, 8, 50, '#3a2a1c'); rect(ctx, 296, 172, 88, 6, '#4a3626'); oval(ctx, 340, 168, 30, 30, '#8a8a84'); ring(ctx, 340, 168, 30, 30, 2, '#6a6a64'); oval(ctx, 340, 168, 4, 4, '#2a2018'); for (let i = 0; i < 5; i++) ring(ctx, 340, 168, 8 + i * 5, 8 + i * 5, 0.4, 'rgba(40,40,40,.3)');
  stroke(ctx, [340, 168, 330, 220, 350, 232], 1.6, '#2a2018'); rect(ctx, 344, 230, 22, 4, '#4a3626');
  // 불티
  lit(ctx, () => { for (let i = 0; i < 26; i++) { const a = -0.3 - hash(i, 3) * 1.1, r = 30 + hash(i, 4) * 46, x = 340 + Math.cos(a) * r, y = 168 + Math.sin(a) * r; stroke(ctx, [x, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5], 0.9, i % 3 ? 'rgba(150,210,255,.8)' : 'rgba(230,245,255,.9)'); } }); glow(v, 366, 150, 50, '#70b8ff', 0.2);
  person(v, 290, 236, 104, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: BLUE, rimDir: 1 })); gem(v, 322, 158, 5, '#9ad8ff', 0.24);
  // 원석과 물통
  for (let i = 0; i < 7; i++) { const x = 440 + (i % 4) * 16 + (i > 3 ? 8 : 0), y = 232 - (i > 3 ? 10 : 0); poly(ctx, [x - 8, y, x - 5, y - 9, x + 4, y - 11, x + 9, y - 3, x + 6, y], ['#4a5460', '#3e4650', '#56606c'][i % 3]); } gem(v, 470, 216, 3, '#7ac8f0', 0.12);
  rect(ctx, 400, 206, 30, 26, '#4a3a2a'); oval(ctx, 415, 206, 15, 4, '#5a7a8a'); ring(ctx, 415, 220, 15, 3, 1, '#2a2018');
  dwarf(v, 150, 234, 96, { raw: true, f: 1, cloth: '#5a3a2a', hair: '#b8b4ac', arm: 'chest' });
  finish(v, { inside: true, noLeaves: true });
}
/** 주문 새기기: 받침에 누인 칼날을 따라 번지는 푸른 글자. 철필 끝에 숨을 멈춘다 */
function afEngrave(v) {
  const { ctx } = v; shopWall(v, { noForge: true }); for (const x of [230, 330]) windowAt(v, x, 40, 40, 60, {});
  table(ctx, 170, 500, 190, '#4a3626', 9, 40); rect(ctx, 220, 182, 12, 8, '#2a2018'); rect(ctx, 420, 182, 12, 8, '#2a2018');
  // 칼과 글자
  stroke(ctx, [226, 180, 430, 180], 4, '#b8bcc4'); stroke(ctx, [226, 179, 430, 179], 0.8, 'rgba(255,255,255,.7)'); poly(ctx, [430, 178, 446, 180, 430, 182], '#b8bcc4'); rect(ctx, 200, 177, 26, 6, '#3a2a1c'); rect(ctx, 224, 172, 4, 16, '#8a7440');
  lit(ctx, () => { for (let i = 0; i < 11; i++) { const x = 240 + i * 12; stroke(ctx, [x, 178, x + 3, 182, x + 6, 178], 0.9, 'rgba(140,210,255,.9)'); if (i % 2) stroke(ctx, [x + 3, 177, x + 3, 183], 0.7, 'rgba(140,210,255,.8)'); } }); glow(v, 300, 180, 90, '#70b8ff', 0.18, 14); glow(v, 372, 180, 14, '#c8e8ff', 0.24);
  // 주문 적은 종이와 촛불
  paper(ctx, 450, 182, 36, 8, '#d8ccaa'); candle(v, 190, 190, 9);
  person(v, 372, 240, 106, mine(v, { raw: true, f: -1, arm: 'fwd', rim: BLUE, rimDir: -1 })); { const [hx, hy] = handOf(372, 240, 106, -1); stroke(ctx, [hx, hy, hx - 6, 181], 1.2, '#8a7440'); }
  person(v, 540, 236, 98, { raw: true, f: -1, cloth: '#3a3e4a', hair: '#3a2a1e', cloak: true, arm: 'chest', rim: BLUE, rimDir: -1 });
  finish(v, { inside: true, noLeaves: true });
}
/** 폭발: 깨져 나간 창과 그을린 벽, 걷히는 푸른 연기. 뒤로 나자빠져 앉은 장인과 굴러다니는 연장 */
function afBlast(v) {
  const { ctx } = v; shopWall(v, { noForge: true, wall: '#463e38' });
  // 깨진 창
  rect(ctx, 260, 30, 80, 80, '#1c2030'); rect(ctx, 254, 24, 92, 6, '#2a2018'); rect(ctx, 254, 110, 92, 6, '#2a2018'); rect(ctx, 254, 24, 6, 92, '#2a2018'); rect(ctx, 340, 24, 6, 92, '#2a2018'); for (let i = 0; i < 6; i++) poly(ctx, [260 + i * 13, 110, 264 + i * 13, 94 - hash(i, 2) * 14, 270 + i * 13, 110], 'rgba(180,200,220,.5)'); poly(ctx, [260, 30, 280, 30, 266, 50], 'rgba(180,200,220,.5)');
  // 그을음과 연기
  lit(ctx, () => {}); const g = ctx.createRadialGradient(330, 176, 6, 330, 176, 150); g.addColorStop(0, 'rgba(10,8,8,.75)'); g.addColorStop(1, 'rgba(10,8,8,0)'); ctx.fillStyle = g; ctx.fillRect(170, 30, 320, 200);
  smoke(v, 330, 170, 150, 60, '#5a6a80', 0.34); smoke(v, 300, 120, 100, 40, '#6a7a94', 0.26); glow(v, 330, 176, 70, '#70b8ff', 0.2);
  // 부서진 작업대
  ctx.save(); ctx.translate(330, 200); ctx.rotate(0.12); rect(ctx, -80, -6, 70, 8, '#3a2a1c'); ctx.restore(); ctx.save(); ctx.translate(360, 204); ctx.rotate(-0.3); rect(ctx, 0, -6, 70, 8, '#3a2a1c'); ctx.restore(); rect(ctx, 262, 198, 7, 34, '#2e2018');
  for (let i = 0; i < 9; i++) { const x = 220 + hash(i, 5) * 240, y = 210 + hash(i, 6) * 26; poly(ctx, [x, y, x + 5, y - 3, x + 8, y + 2, x + 2, y + 4], i % 3 ? '#4a5460' : '#7ac8f0'); if (i % 3 === 0) glow(v, x + 4, y, 10, '#70b8ff', 0.2); } stroke(ctx, [420, 226, 446, 220], 1.6, '#6a6a70'); rect(ctx, 444, 216, 8, 6, '#4a4a50');
  // 나자빠진 장인과 달려온 제자
  person(v, 150, 236, 100, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'chest', rim: BLUE, rimDir: 1 })); for (let i = 0; i < 3; i++) stroke(ctx, [130 + i * 12, 150 - i * 2, 134 + i * 12, 144 - i * 2], 0.8, 'rgba(20,16,14,.5)');
  person(v, 560, 236, 86, { raw: true, f: -1, cloth: '#4a4038', hair: '#6a4a2a', arm: 'out' }); rect(ctx, 566, 190, 14, 16, '#4a3a2a'); 
  finish(v, { inside: true, noLeaves: true });
}
/** 의뢰: 벨벳 깐 진열대 너머의 손님. 갑옷 입은 기사가 칼을, 비단옷의 귀부인이 목걸이를 가리킨다 */
function afOrder(v) {
  const { ctx } = v; shopWall(v, { noForge: true, wall: '#5a5044' }); windowAt(v, 220, 36, 80, 70, {}); shaft(v, 260, 106, 80, 100, 40, '#e8e0c8', 0.1);
  // 진열대
  rect(ctx, 200, 176, 300, 54, '#4a3626'); rect(ctx, 194, 170, 312, 8, '#5a4030'); rect(ctx, 210, 166, 280, 5, '#4a1e2a');
  stroke(ctx, [230, 164, 300, 164], 2.4, '#b8bcc4'); rect(ctx, 220, 162, 12, 4, '#3a2a1c'); glow(v, 264, 164, 24, '#70b8ff', 0.16);
  bend(ctx, [340, 160, 352, 170, 364, 160], 1, '#c8a850'); gem(v, 352, 168, 3, '#f0a060', 0.16); ring(ctx, 400, 164, 5, 3, 1.4, '#c8a850'); gem(v, 400, 160, 2, '#a0e0a0', 0.14); rect(ctx, 440, 156, 20, 10, '#3a3e4a'); gem(v, 450, 158, 3, '#c8a0f0', 0.14);
  // 장인(나)과 손님들
  person(v, 318, 212, 104, mine(v, { raw: true, f: 1, arm: 'fwd', noShadow: true })); rect(ctx, 200, 176, 300, 54, '#4a3626'); rect(ctx, 194, 170, 312, 8, '#5a4030'); for (let i = 0; i < 4; i++) rect(ctx, 210 + i * 74, 184, 64, 38, '#42301f');
  person(v, 150, 238, 106, { raw: true, f: 1, cloth: '#4a4e58', hair: '#3a2a1e', cloak: true, arm: 'fwd', rim: WARM, rimDir: 1 }); rect(ctx, 140, 168, 20, 5, '#6a6a70');
  person(v, 546, 238, 100, { raw: true, f: -1, cloth: '#6a2e4a', hair: '#c8b078', female: true, long: true, arm: 'fwd', rim: WARM, rimDir: -1 }); person(v, 596, 236, 94, { raw: true, f: -1, cloth: '#3a3028', hair: '#1c1614', arm: 'chest' });
  // 간판
  stroke(ctx, [40, 30, 90, 30], 1.6, '#2a2018'); rect(ctx, 50, 32, 34, 24, '#3a2c20'); gem(v, 67, 44, 5, '#7ac8f0', 0.14);
  finish(v, { inside: true, noLeaves: true });
}
/** 제자: 작업대에 나란히 선 아이의 손을 잡아 철필 쥐는 법을 일러 준다 */
function afApprentice(v) {
  const { ctx } = v; shopWall(v, {}); windowAt(v, 340, 40, 60, 60, {}); shaft(v, 370, 100, 60, 100, 30, '#e8e0c8', 0.1);
  table(ctx, 300, 560, 190, '#4a3626', 9, 40); rect(ctx, 380, 184, 60, 6, '#8a8e96'); gem(v, 470, 184, 4, '#7ac8f0', 0.18); paper(ctx, 320, 182, 40, 8, '#d8ccaa'); for (let i = 0; i < 3; i++) stroke(ctx, [500 + i * 8, 190, 504 + i * 8, 176], 1, '#6a6a70');
  lit(ctx, () => { for (let i = 0; i < 3; i++) stroke(ctx, [390 + i * 10, 185, 393 + i * 10, 189, 396 + i * 10, 185], 0.8, 'rgba(140,210,255,.8)'); }); glow(v, 400, 186, 26, '#70b8ff', 0.16);
  person(v, 456, 238, 104, mine(v, { raw: true, f: -1, arm: 'fwd', rim: WARM, rimDir: -1 }));
  person(v, 410, 236, 70, { raw: true, f: -1, child: true, cloth: '#4a4038', hair: '#8a6a44', arm: 'fwd' }); rect(ctx, 396, 226, 30, 10, '#3a2a1c');
  // 뒤에서 풀무질하는 다른 제자
  person(v, 150, 206, 80, { raw: true, f: 1, cloth: '#54463a', hair: '#1c1614', arm: 'fwd' }); poly(ctx, [170, 160, 200, 152, 200, 172], '#5a4630');
  finish(v, { inside: true, noLeaves: true });
}
/** 도둑맞은 밤: 깨진 유리 덮개와 빈 받침, 열린 창에 걸린 밧줄. 등잔을 든 채 굳어 선다 */
function afStolen(v) {
  const { ctx } = v; shopWall(v, { noForge: true, wall: '#34323a', floor: '#1e1c22' });
  // 열린 창과 밧줄
  rect(ctx, 250, 30, 80, 84, '#141a2c'); for (let i = 0; i < 9; i++) oval(ctx, 256 + hash(i, 2) * 68, 36 + hash(i, 3) * 60, 0.8, 0.8, 'rgba(230,236,255,.8)'); rect(ctx, 244, 24, 92, 6, '#2a2018'); rect(ctx, 244, 114, 92, 6, '#2a2018'); rect(ctx, 244, 24, 6, 96, '#2a2018'); rect(ctx, 330, 24, 6, 96, '#2a2018'); poly(ctx, [336, 30, 366, 40, 366, 110, 336, 114], '#3a2c20');
  bend(ctx, [300, 116, 296, 150, 304, 182], 1.4, '#8a7450'); stroke(ctx, [292, 114, 300, 116, 308, 114], 2, '#6a6a70'); shaft(v, 290, 116, 80, 110, -40, '#b8c8f0', 0.1);
  // 빈 받침과 깨진 덮개
  rect(ctx, 400, 150, 50, 82, '#3a3640'); rect(ctx, 394, 144, 62, 8, '#4a4650'); rect(ctx, 408, 138, 34, 6, '#4a1e2a'); ring(ctx, 425, 139, 8, 2, 0.8, 'rgba(230,220,200,.4)');
  for (let i = 0; i < 4; i++) poly(ctx, [404 + i * 12, 138, 406 + i * 12, 124 - hash(i, 4) * 10, 412 + i * 12, 138], 'rgba(180,200,230,.4)'); for (let i = 0; i < 8; i++) { const x = 380 + hash(i, 5) * 90, y = 226 + hash(i, 6) * 10; poly(ctx, [x, y, x + 5, y - 2, x + 3, y + 3], 'rgba(190,210,240,.6)'); }
  // 발자국
  for (let i = 0; i < 5; i++) oval(ctx, 396 - i * 18, 228 - (i % 2) * 6 - i * 4, 4, 1.6, 'rgba(10,10,14,.5)', -0.3);
  person(v, 520, 238, 104, mine(v, { raw: true, f: -1, arm: 'fwd', rim: WARM, rimDir: -1 })); { const [hx, hy] = handOf(520, 238, 104, -1); lamp(v, hx, hy + 8, 0.24); }
  finish(v, { inside: true, noLeaves: true });
}
/** 대를 넘어 남은 것: 큰 방의 받침 위에 놓인 이름난 마도구. 새긴 이름을 읽는 사람들 */
function afHeirloom(v) {
  const { ctx } = v; room(v, { wall: '#5a5248', floor: '#342e28', fy: 182 });
  for (const x of [80, 200, 440, 560]) { rect(ctx, x - 11, 0, 22, 184, '#6a6256'); rect(ctx, x - 15, 0, 30, 10, '#7a7264'); } windowAt(v, 300, 16, 40, 76, { arch: true }); shaft(v, 320, 92, 50, 100, 0, '#fff0c8', 0.14);
  steps(ctx, 320, 182, 70, 2, '#6a6256'); rect(ctx, 296, 124, 48, 44, '#7a7264'); rect(ctx, 290, 118, 60, 8, '#8a8274'); rect(ctx, 302, 136, 36, 14, '#4a443c'); for (let j = 0; j < 3; j++) stroke(ctx, [306, 140 + j * 3.4, 334, 140 + j * 3.4], 0.5, 'rgba(230,220,190,.6)');
  // 지팡이처럼 세워진 물건
  stroke(ctx, [320, 118, 320, 60], 2.4, '#8a7440'); ring(ctx, 320, 52, 8, 9, 1.8, '#c8a850'); gem(v, 320, 52, 5, '#9ad8ff', 0.3); glow(v, 320, 56, 60, '#70b8ff', 0.18);
  for (const k of [-1, 1]) { stroke(ctx, [320 + k * 60, 182, 320 + k * 60, 156], 1.6, '#8a7440'); oval(ctx, 320 + k * 60, 154, 3, 3, '#c8a850'); } bend(ctx, [260, 158, 320, 172, 380, 158], 1.4, '#6e2a30');
  person(v, 220, 226, 96, { raw: true, f: 1, cloth: '#3a3e4a', hair: '#b8b4ac', old: true, stick: 'staff' }); person(v, 180, 232, 60, { raw: true, f: 1, child: true, cloth: '#4a4038', hair: '#6a4a2a', arm: 'out' });
  person(v, 430, 226, 96, { raw: true, f: -1, cloth: '#2e3e5e', hair: '#3a2a1e', robe: true, arm: 'chest' }); person(v, 480, 232, 98, { raw: true, f: -1, cloth: '#5a2e3a', hair: '#1c1614', female: true, long: true });
  person(v, 320, 240, 100, mine(v, { raw: true, f: 0, old: true, noShadow: true }));
  finish(v, { inside: true, noLeaves: true });
}
export const ARTIFICE24 = { bench: afBench, cut: afCut, engrave: afEngrave, blast: afBlast, order: afOrder, apprentice: afApprentice, stolen: afStolen, heirloom: afHeirloom };

export const PLATES24 = {
  /** 함께 자란 세대. variant: yard·reunion·field·dock·court·news·fallen·apart */
  peers(v) { return (PEERS24[v.variant] ?? peReunion)(v); },
  /** 나라 사이 흐름. variant: treaty·blockade·border·wedding·betray·market·map·toll */
  accord(v) { return (ACCORD24[v.variant] ?? acMap)(v); },
  /** 마도구 장인. variant: bench·cut·engrave·blast·order·apprentice·stolen·heirloom */
  artifice(v) { return (ARTIFICE24[v.variant] ?? afBench)(v); },
};
