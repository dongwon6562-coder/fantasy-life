// 35단계 삽화: 평생의 벗(술잔, 다시 만남, 벗의 장례, 멀어짐),
// 기술이 퍼지는 길(도제의 손, 비법서, 떠도는 기술자, 특허장), 목수와 석공(비계, 돌 깎기, 성당 지붕, 무너진 다리).
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, ground, road, room, windowAt, shaft, glow, flame, candle, pool, person, crowd, tree, sunSign, finish } from './vignetteKit.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.45)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
// 벗: 그 사람이 정해져 있으면 그 모습, 아니면 늘 같은 한 사람
const pal = (v, o = {}) => (v.other ? { cloth: v.other.cloth, hair: v.other.hair, female: v.other.female, long: v.other.long, ...o } : { cloth: '#5a3a30', hair: '#6a4a2a', ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });

/** 술잔 (나무 잔) */
function mug(ctx, x, y, s = 1) { rect(ctx, x - 4 * s, y - 9 * s, 8 * s, 9 * s, '#6a4c30'); rect(ctx, x - 4 * s, y - 7 * s, 8 * s, 1.2 * s, '#3a2a1c'); rect(ctx, x - 4 * s, y - 3 * s, 8 * s, 1.2 * s, '#3a2a1c'); ctx.strokeStyle = '#6a4c30'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(x + 5 * s, y - 4.5 * s, 3 * s, -1.3, 1.3); ctx.stroke(); }
/** 돌덩이: 다듬은 면은 밝게 */
function block(ctx, x, y, w, h, c) { rect(ctx, x, y - h, w, h, c); rect(ctx, x, y - h, w, h * 0.16, 'rgba(255,250,235,.16)'); rect(ctx, x + w * 0.8, y - h, w * 0.2, h, 'rgba(0,0,0,.16)'); }
/** 비계: 세로 장대와 가로 널, 엇건 줄 */
function scaffold(ctx, x, y, w, h, c, lv = 3) {
  const n = Math.max(2, Math.round(w / 46));
  for (let i = 0; i <= n; i++) stroke(ctx, [x + (i * w) / n, y, x + (i * w) / n + (i % 2 ? 1.5 : -1.5), y - h - 8], 2, c);
  for (let l = 1; l <= lv; l++) { const yy = y - (l * h) / lv; rect(ctx, x - 6, yy, w + 12, 3, c); if (l % 2) stroke(ctx, [x, yy + (h / lv), x + w / n, yy + 3], 1, c); else stroke(ctx, [x + w, yy + (h / lv), x + w - w / n, yy + 3], 1, c); }
}

/* ---------- 평생의 벗 ---------- */
/** 술잔: 주점 구석 자리, 마주 앉은 두 사람과 잔 둘 */
function friendCup(v) {
  const { ctx } = v; room(v, { wall: '#3a2e26', floor: '#281f19', fy: 178, stone: false });
  windowAt(v, 60, 40, 56, 60, {});
  // 뒤편: 술통과 선반, 다른 손님들의 등
  rect(ctx, 400, 60, 220, 5, '#1c1410'); for (let i = 0; i < 7; i++) { rect(ctx, 412 + i * 30, 42, 10, 18, i % 2 ? '#6a4c30' : '#4a5a52'); }
  for (const x of [470, 560]) { oval(ctx, x, 140, 34, 38, '#4a3424'); ctx.strokeStyle = '#241a12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, 140, 24, 0, TAU); ctx.stroke(); rect(ctx, x - 3, 150, 6, 10, '#241a12'); }
  person(v, 170, 190, 66, folk(2, { raw: true, f: 0, pose: 'sit' })); person(v, 214, 192, 70, folk(4, { raw: true, f: 0, pose: 'sit', hat: true }));
  rect(ctx, 150, 168, 96, 6, '#3a2a1e');
  // 벽의 촛대
  rect(ctx, 316, 70, 10, 3, '#1c1410'); candle(v, 321, 70, 9); glow(v, 321, 60, 70, '#ffb060', 0.3);
  // 탁자와 잔, 초
  rect(ctx, 236, 176, 170, 9, '#4a3626'); rect(ctx, 250, 185, 9, 46, '#33251a'); rect(ctx, 384, 185, 9, 46, '#33251a');
  mug(ctx, 290, 176, 1.2); mug(ctx, 352, 176, 1.2); candle(v, 322, 176, 10); glow(v, 322, 160, 90, '#ffb060', 0.34); pool(v, 322, 180, 120, 12, '#ffb060', 0.18);
  oval(ctx, 322, 174, 14, 3, '#7a6a4a');
  // 나와 벗: 몸을 기울여 마주 앉았다
  for (const x of [256, 388]) { rect(ctx, x - 14, 206, 28, 5, '#33251a'); rect(ctx, x - 10, 211, 4, 22, '#33251a'); rect(ctx, x + 6, 211, 4, 22, '#33251a'); }
  person(v, 258, 234, 108, mine(v, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: WARM, rimDir: 1 }));
  person(v, 386, 234, 108, pal(v, { raw: true, f: -1, pose: 'sit', arm: 'fwd', rim: WARM, rimDir: -1 }));
  finish(v, { inside: true });
}
/** 다시 만남: 저녁 길목, 짐을 내려놓고 마주 선 두 사람 */
function friendReunion(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); ground(v, (x) => Math.max(fn(x), 150) + 8, {}); road(v, 330, 400, 158, { w: 150 });
  // 길가 주막과 울타리, 나무
  rect(ctx, 470, 110, 110, 56, t('#8a7a64')); poly(ctx, [462, 110, 525, 78, 588, 110], t('#5a4436')); rect(ctx, 490, 132, 14, 34, t('#2a1e16')); rect(ctx, 530, 126, 14, 14, '#d09a4a'); glow(v, 537, 133, 26, '#ffa850', 0.3);
  for (let i = 0; i < 7; i++) { stroke(ctx, [40 + i * 30, 186, 41 + i * 30, 168], 2, t('#3e2e20')); } stroke(ctx, [34, 174, 226, 172], 1.4, t('#3e2e20'));
  tree(v, 96, 176, 110, {}); tree(v, 610, 190, 80, {});
  // 내려놓은 봇짐과 지팡이
  oval(ctx, 392, 226, 16, 11, t('#5a4a3a')); stroke(ctx, [384, 218, 400, 214], 1.4, t('#2a1e16')); stroke(ctx, [410, 230, 440, 150], 2, t('#3a2c20'));
  // 두 사람: 팔을 내민 벗과 멈춰 선 나
  person(v, 280, 228, 104, mine(v, { f: 1, arm: 'fwd', rim: WARM, rimDir: v.S.dir }));
  person(v, 346, 228, 102, pal(v, { f: -1, arm: 'out', cloak: true, rim: WARM, rimDir: v.S.dir }));
  finish(v);
}
/** 벗의 장례: 흐린 날의 무덤가, 새 흙과 조문객 몇 */
function friendFuneral(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); const g = (x) => Math.max(fn(x), 146) + 10 - Math.sin(x / 120) * 5; ground(v, g, {});
  // 낮은 담과 다른 무덤들, 헐벗은 나무
  rect(ctx, 0, 150, VW, 8, t('#6a665e')); for (let i = 0; i < 16; i++) rect(ctx, i * 42, 146, 30, 5, t('#5a564e'));
  tree(v, 540, 170, 130, { bare: true });
  for (const [x, y, s] of [[70, 178, 0.7], [140, 172, 0.6], [470, 176, 0.7], [590, 186, 0.9]]) { rect(ctx, x - 6 * s, y - 26 * s, 12 * s, 26 * s, t('#7a766c')); oval(ctx, x, y - 26 * s, 6 * s, 6 * s, t('#7a766c')); }
  // 새 무덤: 흙더미와 해 무늬 표석, 꽂아 둔 삽
  oval(ctx, 320, 214, 70, 12, t('#4a3a2c')); oval(ctx, 320, 208, 56, 10, t('#5a4634'));
  rect(ctx, 312, 150, 16, 46, t('#8a867c')); sunSign(v, 320, 150, 9, t('#8a867c')); stroke(ctx, [270, 214, 262, 160], 2.2, t('#3a2c20')); poly(ctx, [264, 214, 276, 214, 272, 228, 266, 228], t('#5a5e66'));
  for (let i = 0; i < 5; i++) oval(ctx, 290 + i * 14, 204 - (i % 2) * 3, 3, 2.4, ['#b8a8c0', '#d8d0b8', '#a88a9a'][i % 3]);
  // 사제와 조문객, 그리고 나
  person(v, 214, 214, 90, { f: 1, cloth: '#d8d2c4', hair: '#8a8478', robe: true, old: true, arm: 'chest' });
  person(v, 150, 222, 86, folk(1, { f: 1, hood: true, cloth: '#2a2628' })); person(v, 112, 226, 50, folk(2, { f: 1, child: true, cloth: '#2e2a2a' }));
  person(v, 470, 222, 88, folk(5, { f: -1, old: true, stick: 'staff', cloth: '#2c2a2e' })); person(v, 520, 226, 84, folk(3, { f: -1, cloak: true, cloth: '#26242a' }));
  person(v, 404, 234, 108, mine(v, { f: -1, pose: 'bow', cloak: true }));
  finish(v);
}
/** 멀어짐: 갈림길에서 등을 돌리고 서로 다른 길로 가는 두 사람 */
function friendApart(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); ground(v, (x) => Math.max(fn(x), 150) + 6, {});
  // 갈림길: 앞에서 하나였다가 둘로 갈린다
  const c = rgba(t('#a8926a'), 0.85);
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(250, VH); ctx.quadraticCurveTo(290, 206, 150, 170); ctx.lineTo(120, 162); ctx.lineTo(128, 158); ctx.quadraticCurveTo(300, 180, 320, 200); ctx.quadraticCurveTo(350, 176, 520, 156); ctx.lineTo(528, 160); ctx.lineTo(500, 168); ctx.quadraticCurveTo(360, 204, 400, VH); ctx.closePath(); ctx.fill();
  // 이정표
  stroke(ctx, [322, 204, 322, 150], 2.4, t('#3a2c20')); poly(ctx, [322, 154, 286, 156, 278, 161, 286, 166, 322, 166], t('#5a4634')); poly(ctx, [322, 168, 356, 170, 364, 175, 356, 180, 322, 178], t('#5a4634'));
  tree(v, 60, 190, 90, {}); tree(v, 590, 180, 100, {});
  // 왼쪽 길의 벗은 벌써 멀다. 오른쪽 길의 나는 한 번 돌아본다
  person(v, 170, 178, 44, pal(v, { f: 0, cloak: true }));
  person(v, 440, 196, 80, mine(v, { f: -1, cloak: true, rim: COLD, rimDir: -1 }));
  finish(v);
}

/* ---------- 기술이 퍼지는 길 ---------- */
/** 도제의 손: 장인이 뒤에서 도제의 손을 잡아 끌질을 가르친다 */
function spreadHands(v) {
  const { ctx, R } = v; room(v, { wall: '#3c3229', floor: '#2a221b', fy: 180, stone: false });
  windowAt(v, 440, 30, 90, 90, {}); shaft(v, 440, 120, 90, 120, -110, '#ffe8c0', 0.15);
  // 벽의 연장
  rect(ctx, 60, 44, 250, 4, '#1c1410'); for (let i = 0; i < 10; i++) { const x = 74 + i * 24; i % 3 === 0 ? (stroke(ctx, [x, 48, x, 84], 2, '#5a4030'), rect(ctx, x - 5, 82, 10, 6, '#6a6e76')) : i % 3 === 1 ? (stroke(ctx, [x, 48, x, 76], 1.6, '#5a4030'), stroke(ctx, [x, 76, x, 92], 2.4, '#8a8e96')) : (ctx.strokeStyle = '#6a6e76', ctx.lineWidth = 1.6, ctx.beginPath(), ctx.arc(x, 62, 9, 0.3, Math.PI - 0.3), ctx.stroke()); }
  // 작업대와 깎던 나무, 대팻밥
  rect(ctx, 170, 156, 320, 12, '#5a422c'); rect(ctx, 184, 168, 12, 60, '#3a2a1c'); rect(ctx, 464, 168, 12, 60, '#3a2a1c');
  rect(ctx, 250, 142, 150, 14, '#b89a6a'); for (let i = 0; i < 6; i++) stroke(ctx, [262 + i * 22, 144, 270 + i * 22, 154], 0.7, 'rgba(90,60,30,.5)');
  for (let i = 0; i < 16; i++) { const x = 200 + R() * 260; ctx.strokeStyle = 'rgba(216,190,140,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, 152 + R() * 4 + (R() < 0.3 ? 76 : 0), 2 + R() * 2.4, 0, 4.6); ctx.stroke(); }
  // 도제(앞)와 그 뒤에 선 장인: 두 사람의 팔이 한 연장으로 모인다
  person(v, 284, 236, 116, folk(4, { raw: true, f: 1, old: true, arm: 'fwd', cloth: '#5a4a3a', female: false, long: false, rim: 'rgba(255,232,192,.5)', rimDir: 1 }));
  person(v, 330, 236, 88, mine(v, { raw: true, f: 1, arm: 'fwd', rim: 'rgba(255,232,192,.5)', rimDir: 1 }));
  stroke(ctx, [352, 174, 368, 148], 2.4, '#5a4030'); stroke(ctx, [368, 148, 372, 142], 2.6, '#9a9ea6');
  // 구석에서 지켜보는 다른 도제
  person(v, 110, 230, 78, folk(2, { raw: true, f: 1, arm: 'chest' }));
  finish(v, { inside: true });
}
/** 비법서: 밤, 쇠띠 두른 궤에서 꺼낸 책을 촛불 아래 펼쳤다 */
function spreadBook(v) {
  const { ctx } = v; room(v, { wall: '#2c2622', floor: '#1e1916', fy: 180, stone: true });
  rect(ctx, 520, 30, 44, 70, '#0e1220'); stroke(ctx, [542, 30, 542, 100], 1.4, '#1c1814'); stroke(ctx, [520, 64, 564, 64], 1.4, '#1c1814');
  // 열린 궤: 쇠띠와 자물쇠
  rect(ctx, 60, 150, 130, 62, '#3a2a1e'); for (const x of [78, 124, 170]) rect(ctx, x, 150, 6, 62, '#4a4e56'); poly(ctx, [56, 150, 194, 150, 206, 96, 68, 96], '#33241a'); for (const x of [80, 126, 172]) poly(ctx, [x - 2, 150, x + 4, 150, x + 15, 96, x + 9, 96], '#4a4e56');
  ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(127, 186, 6, Math.PI, 0); ctx.stroke(); rect(ctx, 119, 186, 16, 12, '#6a6e76');
  // 책상과 펼친 책, 초
  rect(ctx, 250, 160, 250, 10, '#4a3626'); rect(ctx, 264, 170, 10, 58, '#33251a'); rect(ctx, 476, 170, 10, 58, '#33251a');
  poly(ctx, [322, 158, 376, 152, 430, 158, 430, 162, 376, 157, 322, 162], '#5a2e26'); poly(ctx, [326, 157, 376, 151, 376, 155, 326, 160], '#a89e84'); poly(ctx, [376, 151, 426, 157, 426, 160, 376, 155], '#9a9078');
  for (let i = 0; i < 4; i++) { stroke(ctx, [334 + i * 10, 157 - i * 1.1, 338 + i * 10, 157 - i * 1.1], 2.6, 'rgba(50,36,26,.6)'); } ctx.strokeStyle = 'rgba(120,40,30,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(402, 156, 5, 0, TAU); ctx.stroke(); stroke(ctx, [397, 156, 407, 156], 0.8, 'rgba(120,40,30,.8)');
  candle(v, 456, 160, 12); glow(v, 456, 142, 100, '#ffb060', 0.32); pool(v, 400, 164, 130, 12, '#ffb060', 0.16);
  rect(ctx, 278, 152, 26, 8, '#b8ae94'); stroke(ctx, [300, 150, 314, 132], 1.2, '#d8d0c0'); // 베끼는 종이와 깃펜
  // 책을 들여다보는 나, 문간에 선 그림자
  person(v, 330, 236, 110, mine(v, { raw: true, f: 1, pose: 'bow', arm: 'fwd', rim: WARM, rimDir: 1 }));
  rect(ctx, 596, 60, 44, 150, '#0c0a0a'); person(v, 612, 212, 104, { raw: true, f: -1, cloth: '#141214', hair: '#0e0c0c', hood: true, cloak: true });
  finish(v, { inside: true });
}
/** 떠도는 기술자: 연장 수레를 끌고 고갯길을 넘어 마을로 내려온다 */
function spreadWander(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); ground(v, (x) => Math.max(fn(x), 150) + 6 - (x > 380 ? (x - 380) * 0.06 : 0), {}); road(v, 250, 520, 150, { w: 130 });
  // 길 끝의 마을: 지붕 몇과 연기
  for (const [x, w, h] of [[500, 30, 16], [528, 24, 20], [552, 34, 14], [470, 26, 12]]) { rect(ctx, x, 150 - h, w, h, t('#9a8c76')); poly(ctx, [x - 2, 150 - h, x + w / 2, 150 - h - 9, x + w + 2, 150 - h], t('#6a4a3a')); }
  rect(ctx, 538, 114, 4, 20, t('#7a705e')); poly(ctx, [536, 114, 540, 104, 544, 114], t('#4a4a52'));
  tree(v, 80, 180, 120, {}); tree(v, 600, 170, 60, {});
  // 손수레: 숫돌 바퀴, 매단 냄비와 연장, 덮개
  const cx = 300, cy = 220;
  poly(ctx, [cx - 50, cy - 40, cx + 40, cy - 40, cx + 46, cy - 12, cx - 50, cy - 12], t('#5a4634')); poly(ctx, [cx - 50, cy - 40, cx + 40, cy - 40, cx + 26, cy - 62, cx - 40, cy - 62], t('#8a7e68'));
  ctx.strokeStyle = t('#2a1e16'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx - 16, cy - 8, 17, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * 0.785 + 0.3; stroke(ctx, [cx - 16 - Math.cos(a) * 17, cy - 8 - Math.sin(a) * 17, cx - 16 + Math.cos(a) * 17, cy - 8 + Math.sin(a) * 17], 1.2, t('#2a1e16')); }
  stroke(ctx, [cx + 46, cy - 16, cx + 96, cy - 34], 2.6, t('#3a2c20')); stroke(ctx, [cx - 50, cy - 14, cx - 62, cy + 8], 2.4, t('#3a2c20'));
  oval(ctx, cx - 30, cy - 70, 11, 11, t('#7a7e86')); oval(ctx, cx - 30, cy - 70, 3, 3, t('#2a1e16')); // 숫돌
  for (const [dx, k] of [[-44, 0], [-6, 1], [16, 2]]) { stroke(ctx, [cx + dx, cy - 40, cx + dx, cy - 30], 0.8, t('#2a1e16')); k === 0 ? oval(ctx, cx + dx, cy - 26, 6, 5, t('#4a4e56')) : k === 1 ? rect(ctx, cx + dx - 2, cy - 30, 4, 14, t('#8a8e96')) : oval(ctx, cx + dx, cy - 27, 5, 4, t('#9a7a3a')); }
  // 수레를 끄는 기술자와 따라 걷는 아이. 길가에서 바라보는 나
  person(v, 404, 222, 100, folk(3, { f: 1, hat: true, cloak: true, arm: 'fwd', old: true }));
  person(v, 222, 224, 60, folk(2, { f: 1, child: true }));
  person(v, 520, 236, 104, mine(v, { f: -1 }));
  finish(v);
}
/** 특허장: 관청의 긴 탁자, 붉은 인장이 달린 문서를 내미는 관리 */
function spreadPatent(v) {
  const { ctx } = v; room(v, { wall: '#4a443c', floor: '#332c26', fy: 176, stone: true });
  for (const x of [90, 500]) { windowAt(v, x, 20, 54, 100, { arch: true }); shaft(v, x, 120, 54, 110, x < 300 ? 80 : -80, '#f0e6cc', 0.12); }
  // 벽걸이 깃발과 높은 의자
  poly(ctx, [290, 10, 350, 10, 350, 110, 320, 96, 290, 110], '#5a2a2a'); sunSign(v, 320, 52, 14, '#c8a850'); rect(ctx, 284, 6, 72, 5, '#2a1e16');
  rect(ctx, 296, 104, 48, 72, '#3a2a1e'); poly(ctx, [292, 104, 320, 90, 348, 104], '#3a2a1e');
  // 관리(앉음)와 서기, 문서를 받는 나, 뒤에서 지켜보는 경쟁자
  person(v, 320, 190, 96, { raw: true, f: -1, cloth: '#2e2a3e', hair: '#8a8478', old: true, robe: true, arm: 'fwd' });
  person(v, 420, 196, 92, folk(3, { raw: true, f: -1, arm: 'chest', cloth: '#3a3a46' }));
  // 긴 탁자: 문서 더미, 잉크병, 밀랍과 인장
  rect(ctx, 150, 168, 340, 12, '#5a422c'); rect(ctx, 150, 180, 340, 30, '#3e2c1e');
  for (let i = 0; i < 4; i++) rect(ctx, 176, 164 - i * 4, 46, 3.4, i % 2 ? '#cfc4a8' : '#d8ceb4'); rect(ctx, 430, 158, 8, 10, '#1c1814'); stroke(ctx, [436, 158, 448, 138], 1.2, '#d8d0c0'); rect(ctx, 396, 162, 14, 6, '#8a2a22'); candle(v, 462, 168, 9);
  poly(ctx, [262, 138, 300, 134, 302, 158, 264, 162], '#d8ceb4'); for (let i = 0; i < 4; i++) stroke(ctx, [268, 142 + i * 4.6, 296, 139 + i * 4.6], 0.7, 'rgba(40,30,22,.6)'); stroke(ctx, [284, 158, 284, 172], 1.2, '#8a2a22'); oval(ctx, 284, 175, 5, 5, '#a8322a');
  person(v, 224, 236, 108, mine(v, { raw: true, f: 1, arm: 'fwd', rim: 'rgba(240,230,204,.45)', rimDir: -1 }));
  person(v, 560, 234, 100, folk(5, { raw: true, f: -1, cloak: true, arm: 'chest', cloth: '#2a2622' }));
  finish(v, { inside: true });
}

/* ---------- 목수와 석공 ---------- */
/** 비계: 반쯤 올라간 벽을 둘러싼 비계, 널 위의 일꾼들과 도르래로 올리는 돌 */
function buildScaffold(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); ground(v, (x) => Math.max(fn(x), 160) + 30, { color: '#8a7a5e', color2: '#6a5a44', tufts: 30 });
  // 짓는 벽: 층층이 쌓은 돌, 창 자리와 들쭉날쭉한 윗선
  const wall = t('#a09684');
  poly(ctx, [200, 204, 520, 204, 520, 96, 470, 96, 470, 80, 400, 80, 400, 64, 300, 64, 300, 88, 240, 88, 240, 108, 200, 108], wall);
  for (let y = 76; y < 204; y += 12) stroke(ctx, [200, y, 520, y], 0.6, 'rgba(0,0,0,.2)'); for (let i = 0; i < 40; i++) { const x = 206 + hash(i, 1) * 308, y = 76 + Math.floor(hash(i, 2) * 10) * 12; stroke(ctx, [x, y, x, y + 12], 0.6, 'rgba(0,0,0,.2)'); }
  for (const x of [270, 360, 450]) { ctx.fillStyle = v.S.low ?? '#c8c0a8'; ctx.beginPath(); ctx.moveTo(x - 12, 170); ctx.lineTo(x - 12, 130); ctx.arc(x, 130, 12, Math.PI, 0); ctx.lineTo(x + 12, 170); ctx.fill(); }
  scaffold(ctx, 190, 206, 340, 132, t('#4a3828'), 3);
  // 도르래 팔과 매달린 돌
  stroke(ctx, [520, 74, 566, 50], 3, t('#3a2c20')); stroke(ctx, [566, 50, 566, 150], 0.9, t('#2a1e16')); block(ctx, 554, 166, 24, 16, t('#b0a694')); stroke(ctx, [566, 50, 596, 204], 0.9, t('#2a1e16'));
  // 널 위의 일꾼들
  person(v, 280, 118, 40, folk(0, { f: 1, pose: 'bow', arm: 'fwd' })); person(v, 420, 118, 42, folk(3, { f: -1, arm: 'up' })); person(v, 316, 162, 44, folk(4, { f: 1, arm: 'fwd' })); person(v, 500, 74, 40, folk(5, { f: 1, arm: 'out' }));
  // 아래: 줄을 당기는 사람, 돌더미와 회 반죽 통, 도면을 든 나
  person(v, 600, 226, 88, folk(1, { f: -1, arm: 'up', female: false, long: false }));
  for (const [x, y, w, h] of [[60, 226, 40, 20], [96, 226, 34, 16], [76, 206, 36, 18]]) block(ctx, x, y, w, h, t('#a89e8c'));
  rect(ctx, 150, 212, 34, 18, t('#5a4634')); oval(ctx, 167, 212, 17, 4, t('#d8d4c8'));
  person(v, 130, 238, 104, mine(v, { f: 1, arm: 'fwd' })); poly(ctx, [146, 176, 176, 172, 178, 190, 148, 194], t('#d8ceb4'));
  finish(v);
}
/** 돌 깎기: 석공 마당, 정과 망치로 다듬는 돌과 튀는 조각 */
function buildStone(v) {
  const { ctx, t, R } = v; sky(v); const fn = far(v, {}); ground(v, (x) => Math.max(fn(x), 150) + 20, { color: '#9a8e78', color2: '#74684e', tufts: 20 });
  // 헛간 지붕 아래의 그늘과 다듬은 돌들
  rect(ctx, 0, 60, 230, 150, t('#4a3e32')); poly(ctx, [0, 60, 250, 60, 230, 34, 0, 26], t('#3a2e24')); stroke(ctx, [226, 60, 226, 212], 5, t('#3a2c20'));
  for (const [x, y, w, h] of [[20, 208, 60, 30], [86, 208, 50, 26], [40, 178, 54, 28], [150, 210, 56, 34]]) block(ctx, x, y, w, h, t('#b4aa98'));
  // 기둥머리 하나: 반쯤 새겨졌다
  block(ctx, 470, 214, 70, 30, t('#bcb2a0')); poly(ctx, [462, 184, 548, 184, 540, 170, 470, 170], t('#c4baa8')); for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(60,50,40,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(482 + i * 16, 178, 5, Math.PI, 0); ctx.stroke(); }
  // 가운데 큰 돌과 석공: 왼손의 정, 오른손의 망치
  block(ctx, 280, 220, 110, 56, t('#c0b6a4')); stroke(ctx, [300, 176, 372, 176], 0.8, 'rgba(60,50,40,.5)'); stroke(ctx, [300, 196, 350, 196], 0.8, 'rgba(60,50,40,.5)');
  person(v, 418, 236, 108, mine(v, { f: -1, arm: 'fwd', rim: WARM, rimDir: v.S.dir })); stroke(ctx, [396, 172, 380, 166], 2.4, t('#8a8e96')); stroke(ctx, [404, 150, 398, 132], 2.4, t('#5a4030')); rect(ctx, 390, 124, 16, 10, t('#5a5e66'));
  for (let i = 0; i < 14; i++) { const a = Math.PI * (0.9 + R() * 0.5), r = 6 + R() * 26; rect(ctx, 378 + Math.cos(a) * r, 164 + Math.sin(a) * r * 0.7, 1.6, 1.6, t('#e0d8c8')); } for (let i = 0; i < 20; i++) rect(ctx, 270 + R() * 140, 220 + R() * 12, 2 + R() * 3, 1.6, t('#cfc6b4'));
  // 표식을 새기는 도제, 돌을 살피는 조합 장인
  person(v, 196, 234, 84, folk(2, { f: 1, pose: 'kneel', arm: 'fwd' })); person(v, 560, 232, 100, folk(5, { f: -1, old: true, cloak: true, arm: 'chest', hat: true }));
  finish(v);
}
/** 성당 지붕: 높은 들보 위, 하늘을 등진 목수들과 발아래 작은 마을 */
function buildRoof(v) {
  const { ctx, t } = v; sky(v);
  // 발아래 먼 마을과 들
  rect(ctx, 0, 176, VW, 64, t('#7a8a5e')); for (let i = 0; i < 40; i++) { const x = hash(i, 1) * VW, y = 186 + hash(i, 2) * 44, w = 8 + hash(i, 3) * 10; rect(ctx, x, y, w, 5, t('#9a8c76')); poly(ctx, [x - 1, y, x + w / 2, y - 4, x + w + 1, y], t('#6a4a3a')); }
  stroke(ctx, [0, 214, 200, 204, 420, 220, 640, 206], 3, t('#a8a08a'));
  // 돌벽 윗단
  rect(ctx, 0, 196, 120, 44, t('#a09684')); rect(ctx, 520, 196, 120, 44, t('#a09684')); for (let i = 0; i < 3; i++) { stroke(ctx, [0, 206 + i * 12, 120, 206 + i * 12], 0.6, 'rgba(0,0,0,.2)'); stroke(ctx, [520, 206 + i * 12, 640, 206 + i * 12], 0.6, 'rgba(0,0,0,.2)'); }
  // 지붕틀: 가로 들보 위에 맞세운 서까래들
  const wd = t('#5a4026'), wl = t('#7a5a36');
  rect(ctx, 60, 190, 520, 9, wd); rect(ctx, 60, 190, 520, 2.4, wl);
  for (let i = 0; i < 5; i++) { const x = 110 + i * 105; stroke(ctx, [x - 46, 190, x, 60], 5, wd); stroke(ctx, [x + 46, 190, x, 60], 5, wd); stroke(ctx, [x - 28, 140, x + 28, 140], 3.4, wd); stroke(ctx, [x, 60, x, 190], 2.6, wd); stroke(ctx, [x - 45, 188, x - 1, 62], 1, wl); }
  stroke(ctx, [110, 60, 530, 60], 4.4, wd);
  // 올리는 중인 마지막 틀과 줄
  stroke(ctx, [588, 190, 606, 96], 4, wd); stroke(ctx, [606, 96, 540, 62], 0.9, t('#2a1e16'));
  // 목수들: 마룻대에 걸터앉은 이, 망치를 든 이, 들보 위를 걷는 나
  person(v, 215, 60, 46, folk(0, { f: 1, pose: 'sit', arm: 'fwd' })); person(v, 428, 142, 50, folk(3, { f: -1, arm: 'up' })); stroke(ctx, [420, 100, 412, 88], 1.8, t('#5a4030')); rect(ctx, 406, 84, 10, 6, t('#5a5e66'));
  person(v, 318, 190, 70, mine(v, { f: 1, arm: 'out', rim: WARM, rimDir: v.S.dir })); person(v, 520, 190, 62, folk(4, { f: -1, arm: 'up' }));
  finish(v);
}
/** 무너진 다리: 끊긴 돌다리와 물에 잠긴 돌, 둑에 모인 사람들과 고개 숙인 석공 */
function buildFallen(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {});
  ground(v, (x) => Math.max(fn(x), 140) + 4, {});
  // 강
  ctx.fillStyle = t('#5a7286'); ctx.beginPath(); ctx.moveTo(0, 170); ctx.quadraticCurveTo(320, 150, 640, 172); ctx.lineTo(640, 222); ctx.quadraticCurveTo(320, 200, 0, 226); ctx.fill();
  for (let i = 0; i < 26; i++) stroke(ctx, [hash(i, 1) * VW, 172 + hash(i, 2) * 40, hash(i, 1) * VW + 16, 172 + hash(i, 2) * 40], 0.8, 'rgba(230,236,240,.28)');
  // 다리: 왼쪽 무지개 하나는 남았고, 가운데가 끊겼다
  const st = t('#a09684'), sd = t('#7a705e');
  ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(40, 150); ctx.lineTo(250, 138); ctx.lineTo(264, 150); ctx.lineTo(246, 160); ctx.lineTo(238, 196); ctx.lineTo(210, 196); ctx.quadraticCurveTo(150, 136, 96, 200); ctx.lineTo(40, 200); ctx.fill();
  ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(600, 152); ctx.lineTo(452, 140); ctx.lineTo(436, 152); ctx.lineTo(456, 166); ctx.lineTo(462, 200); ctx.lineTo(600, 200); ctx.fill(); rect(ctx, 446, 158, 26, 44, sd);
  stroke(ctx, [40, 150, 250, 138], 3, sd); stroke(ctx, [600, 152, 452, 140], 3, sd);
  // 물에 떨어진 돌들과 걸린 수레
  for (const [x, y, w, h, a] of [[300, 196, 30, 16, 0.3], [340, 204, 24, 14, -0.4], [376, 192, 34, 18, 0.15], [410, 206, 20, 12, 0.6], [320, 180, 18, 10, -0.2]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); rect(ctx, -w / 2, -h / 2, w, h, st); rect(ctx, -w / 2, -h / 2, w, h * 0.2, 'rgba(255,250,235,.16)'); ctx.restore(); oval(ctx, x, y + 8, w * 0.7, 2.4, 'rgba(230,236,240,.3)'); }
  ctx.strokeStyle = t('#2a1e16'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(356, 180, 12, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke(); stroke(ctx, [344, 180, 320, 168], 2.4, t('#3a2c20'));
  // 끊긴 끝에 선 사람들, 둑의 무리
  person(v, 232, 140, 30, folk(1, { f: 1 })); person(v, 214, 141, 30, folk(3, { f: 1, arm: 'fwd' })); person(v, 470, 142, 30, folk(4, { f: -1 }));
  rect(ctx, 0, 222, VW, 18, t('#6a6048'));
  person(v, 430, 236, 104, mine(v, { f: 0, pose: 'bow' }));
  person(v, 350, 236, 96, folk(5, { f: 1, arm: 'out', cloak: true })); // 손가락질하는 이
  crowd(v, 40, 300, 246, 4, 92, {}); crowd(v, 500, 640, 246, 3, 92, {});
  finish(v);
}

export const PLATES14 = {
  /** 평생의 벗. variant: cup(술잔) reunion(다시 만남) funeral(벗의 장례) apart(멀어짐) */
  friend(v) { const k = v.variant ?? 'cup'; return ({ reunion: friendReunion, funeral: friendFuneral, apart: friendApart }[k] ?? friendCup)(v); },
  /** 기술이 퍼지는 길. variant: hands(도제의 손) book(비법서) wander(떠도는 기술자) patent(특허장) */
  spread(v) { const k = v.variant ?? 'hands'; return ({ book: spreadBook, wander: spreadWander, patent: spreadPatent }[k] ?? spreadHands)(v); },
  /** 목수와 석공. variant: scaffold(비계) stone(돌 깎기) roof(성당 지붕) fallen(무너진 다리) */
  build(v) { const k = v.variant ?? 'scaffold'; return ({ stone: buildStone, roof: buildRoof, fallen: buildFallen }[k] ?? buildScaffold)(v); },
};
