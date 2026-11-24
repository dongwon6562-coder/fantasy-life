// 39단계 삽화: 입양(문간의 바구니, 고아원 긴 탁자, 양자 의식, 친부모),
// 빚(전당포 창구, 은행가의 장부, 빚 독촉, 탕감), 수도원(필사실, 회랑, 은둔처, 떠나는 날).
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, tree, sunSign, finish } from './vignetteKit.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,190,110,.55)', COLD = 'rgba(190,210,240,.45)', FIRE = 'rgba(255,150,70,.6)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const mate = (v, o = {}) => ({ cloth: v.other.cloth, hair: v.other.hair, female: !v.me.female, long: !v.me.female, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const waif = (i, o = {}) => ({ cloth: ['#6a6254', '#5e5a50', '#70685a'][i % 3], hair: HR[i % 6], female: i % 2 === 1, long: i % 2 === 1, child: true, ...o });
const monk = (i, o = {}) => ({ cloth: ['#4a4034', '#443a30', '#50463a'][i % 3], hair: HR[(i + 2) % 6], robe: true, ...o });

/** 집 앞면: 들보 벽과 문. 문이 열려 있으면 안의 빛이 샌다. 문 가운데 x, 바닥 y를 돌려준다 */
export function facade(v, x, w, top, base, o = {}) {
  const { ctx, t } = v; const wall = t(o.wall ?? '#6a5c48'), beam = t('#2e241a'), dx = o.door ?? x + w * 0.4, dw = o.dw ?? 46, dh = o.dh ?? 96;
  rect(ctx, x, top, w, base - top, wall); rect(ctx, x, base - 14, w, 14, t('#57524a'));
  for (let i = 0; i <= 4; i++) rect(ctx, x + (w - 6) * (i / 4), top, 6, base - top - 14, beam); rect(ctx, x, top, w, 7, beam); rect(ctx, x, top + (base - top) * 0.45, w, 5, beam);
  poly(ctx, [x - 14, top + 4, x + w + 14, top + 4, x + w + 4, top - 22, x - 4, top - 22], t(o.roof ?? '#3a2e26'));
  rect(ctx, dx - dw / 2 - 5, base - dh - 5, dw + 10, dh + 5, beam);
  if (o.open) { rect(ctx, dx - dw / 2, base - dh, dw, dh, '#e0a050'); rect(ctx, dx - dw / 2, base - dh, dw, dh * 0.3, 'rgba(60,30,10,.35)'); poly(ctx, [dx + dw / 2, base - dh, dx + dw / 2 + 16, base - dh + 6, dx + dw / 2 + 16, base + 4, dx + dw / 2, base], t('#3a2c1e')); }
  else rect(ctx, dx - dw / 2, base - dh, dw, dh, t('#33261a'));
  if (o.win != null) { rect(ctx, o.win - 18, top + 30, 36, 34, beam); rect(ctx, o.win - 14, top + 34, 28, 26, o.lit ? '#d89850' : t('#1e1a1c')); rect(ctx, o.win - 1, top + 34, 2, 26, beam); if (o.lit) glow(v, o.win, top + 47, 36, '#ffb060', 0.16); }
  rect(ctx, dx - dw / 2 - 12, base, dw + 24, 6, t('#7a7468'));
  return { dx, base };
}
/** 아기를 눕힌 바구니 */
function basket(v, x, y, s = 1) {
  const { ctx, t } = v;
  ctx.fillStyle = t('#7a5c38'); ctx.beginPath(); ctx.moveTo(x - 17 * s, y - 13 * s); ctx.quadraticCurveTo(x - 15 * s, y, x - 10 * s, y); ctx.lineTo(x + 10 * s, y); ctx.quadraticCurveTo(x + 15 * s, y, x + 17 * s, y - 13 * s); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 3; i++) stroke(ctx, [x - 15 * s, y - 10 * s + i * 4 * s, x + 15 * s, y - 10 * s + i * 4 * s], 0.7 * s, t('#4e3a22'));
  oval(ctx, x - 1 * s, y - 14 * s, 14 * s, 5 * s, t('#d8ceb8')); oval(ctx, x + 8 * s, y - 17 * s, 4 * s, 4 * s, t('#d8a88c'));
  ctx.strokeStyle = t('#5a4226'); ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.moveTo(x - 16 * s, y - 12 * s); ctx.quadraticCurveTo(x, y - 40 * s, x + 16 * s, y - 12 * s); ctx.stroke();
}
/** 긴 탁자: 윗판과 다리 */
export function table(ctx, x0, x1, y, c = '#4a3626', th = 7, leg = 30) { rect(ctx, x0 + 8, y, 6, leg, dark(c, 0.3)); rect(ctx, x1 - 14, y, 6, leg, dark(c, 0.3)); rect(ctx, x0, y - th, x1 - x0, th, c); rect(ctx, x0, y - th, x1 - x0, 2, dark(c, -0.2)); }
/** 동전 무더기 */
function coins(ctx, x, y, n, c = '#d8b04a') { for (let i = 0; i < n; i++) { rect(ctx, x + i * 7, y - 2 - (hash(i, x) * 4 | 0) * 2 - 4, 6, 4 + (hash(i, x) * 4 | 0) * 2, dark(c, 0.15)); rect(ctx, x + i * 7, y - 6 - (hash(i, x) * 4 | 0) * 2, 6, 1.4, c); } }
/** 책등이 꽂힌 선반 */
function shelf(v, x, y, w, rows, seed, cols = ['#5a3a30', '#3e4a40', '#4a4460', '#6a5a3a', '#4e3a34']) {
  const { ctx } = v; rect(ctx, x - 4, y - 4, w + 8, rows * 26 + 6, '#241a12');
  for (let r = 0; r < rows; r++) { let bx = x; let i = 0; while (bx < x + w - 5) { const bw = 4 + hash(i, seed + r) * 5, bh = 15 + hash(i, seed + r + 9) * 7; rect(ctx, bx, y + r * 26 + 22 - bh, bw, bh, cols[(i + r) % cols.length]); bx += bw + 1; i++; } rect(ctx, x - 4, y + r * 26 + 22, w + 8, 3, '#33261a'); }
}
/** 둥근 아치가 선 돌벽 한 칸 (회랑) */
function arch(ctx, x, w, top, spring, base, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, top); ctx.lineTo(x + w, top); ctx.lineTo(x + w, base); ctx.lineTo(x + w - 9, base); ctx.lineTo(x + w - 9, spring); ctx.arc(x + w / 2, spring, w / 2 - 9, 0, Math.PI, true); ctx.lineTo(x + 9, base); ctx.closePath(); ctx.fill(); }

/* ---------- 입양 ---------- */
/** 문간의 바구니: 눈 내린 새벽, 문을 연 사람과 발치의 바구니, 멀어지는 두건 쓴 사람 */
function adoptBasket(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {});
  ground(v, (x) => Math.max(fn(x), 150) + 30, { color: '#8a8e92', color2: '#5a5e66', tufts: 0, plain: true });
  tree(v, 70, 206, 130, { bare: true, dark: true });
  // 멀어지는 사람: 한 번 돌아본다. 눈 위의 발자국
  for (let i = 0; i < 9; i++) oval(ctx, 330 - i * 22, 222 - i * 2.4 + (i % 2) * 3, 3.4, 1.4, 'rgba(20,24,34,.35)');
  person(v, 150, 204, 62, { f: -1, cloth: '#2a2630', hair: '#2a1e16', female: true, cloak: true, hood: true, arm: 'chest', rim: COLD, rimDir: 1 });
  const { dx, base } = facade(v, 360, 300, 40, 204, { open: true, door: 452, win: 574, lit: true });
  glow(v, dx, base - 50, 80, '#ffb060', 0.2); poly(ctx, [dx - 23, base + 6, dx + 23, base + 6, dx + 70, 240, dx - 90, 240], 'rgba(255,190,110,.2)');
  // 문간에 선 나: 등불을 들고 내려다본다
  person(v, dx + 4, base + 2, 92, mine(v, { raw: true, f: -1, arm: 'fwd', rim: WARM, rimDir: 1 }));
  basket(v, dx - 46, base + 22, 1.25); glow(v, dx - 46, base + 6, 30, '#ffe0b0', 0.16);
  for (let i = 0; i < 46; i++) oval(ctx, hash(i, 3) * VW, hash(i, 4) * VH, 1 + hash(i, 5), 1 + hash(i, 5), 'rgba(236,240,248,.6)');
  finish(v, { noLeaves: true });
}
/** 고아원: 긴 탁자에 둘러앉은 아이들, 죽을 푸는 수녀, 문가에 서서 아이를 보는 두 사람 */
function adoptHall(v) {
  const { ctx } = v; room(v, { wall: '#56504a', floor: '#38322c', fy: 176 });
  for (const x of [150, 300, 450]) { windowAt(v, x, 26, 30, 60, { arch: true }); shaft(v, x, 86, 30, 120, 60, '#d8dce8', 0.09); }
  sunSign(v, 76, 56, 9, '#8a7440'); rect(ctx, 0, 0, VW, 10, '#241c16');
  // 탁자 뒤쪽에 앉은 아이들
  for (let i = 0; i < 7; i++) person(v, 136 + i * 54, 206, 62 + (i % 3) * 5, waif(i, { raw: true, f: i < 4 ? 1 : -1, noShadow: true, arm: i % 2 ? 'fwd' : undefined }));
  rect(ctx, 104, 184, 392, 34, '#241c16'); table(ctx, 100, 500, 184, '#4e3a28', 8, 40); for (let i = 0; i < 7; i++) { oval(ctx, 142 + i * 54, 174, 8, 3, '#8a7e6a'); oval(ctx, 142 + i * 54, 173, 6, 1.6, '#c8b890'); }
  // 앞쪽 걸상에 앉은 아이들 (등)
  for (let i = 0; i < 5; i++) person(v, 170 + i * 62, 264, 80 + (i % 2) * 6, waif(i + 3, { raw: true, f: 0, noShadow: true })); rect(ctx, 130, 231, 330, 9, '#33261a');
  // 솥을 든 수녀
  person(v, 70, 228, 100, { raw: true, f: 1, cloth: '#2e2c34', hair: '#2e2c34', female: true, veil: true, robe: true, arm: 'fwd', rim: COLD, rimDir: 1 }); oval(ctx, 104, 180, 13, 9, '#2a2420'); rect(ctx, 91, 170, 26, 4, '#3a322c'); stroke(ctx, [108, 166, 116, 150], 1.6, '#6a5a44');
  // 문가의 두 사람, 돌아보는 한 아이
  rect(ctx, 566, 60, 60, 120, '#17120e'); rect(ctx, 560, 54, 6, 126, '#2e241a');
  person(v, 560, 232, 106, mine(v, { raw: true, f: -1, rim: WARM, rimDir: -1 })); person(v, 606, 234, 100, mate(v, { raw: true, f: -1, arm: 'chest' }));
  person(v, 504, 226, 58, waif(2, { raw: true, f: 1, rim: WARM, rimDir: 1 }));
  finish(v, { inside: true });
}
/** 양자 의식: 집안의 문장 아래, 무릎 꿇은 아이의 머리에 손을 얹는 어른과 문서를 쓰는 서기 */
function adoptRite(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#4a3c2e', floor: '#30251b', fy: 174 }); rect(ctx, 0, 0, VW, 12, '#22180f');
  windowAt(v, 96, 40, 44, 70, {}); shaft(v, 96, 110, 44, 110, 90, '#e8d8b0', 0.1);
  // 벽의 문장 걸개와 촛대
  poly(ctx, [286, 26, 354, 26, 354, 104, 320, 122, 286, 104], '#4a2a30'); rect(ctx, 280, 22, 80, 6, '#8a7440'); sunSign(v, 320, 68, 13, '#c8a850');
  for (const x of [250, 390]) { rect(ctx, x - 1, 84, 2, 30, '#8a7440'); candle(v, x, 84, 9); glow(v, x, 72, 40, '#ffcf80', 0.2); }
  // 서기의 탁자: 문서, 인장, 잉크
  person(v, 150, 222, 96, folk(3, { raw: true, f: 1, pose: 'sit', arm: 'fwd', old: true, hair: '#9a948a', noShadow: true })); table(ctx, 130, 236, 190, '#4e3a28', 7, 44);
  poly(ctx, [170, 180, 214, 180, 218, 184, 166, 184], '#d8ceb0'); oval(ctx, 224, 180, 4, 3, '#8a2f2a'); rect(ctx, 150, 174, 6, 8, '#1e1814'); stroke(ctx, [190, 180, 200, 160], 1, '#d8d0bc');
  // 어른(나)과 무릎 꿇은 아이
  person(v, 300, 230, 108, mine(v, { raw: true, f: 1, arm: 'fwd', cloak: true, rim: WARM, rimDir: -1 }));
  person(v, 352, 232, 78, waif(1, { raw: true, f: -1, pose: 'kneel', cloth: '#6a5a44', rim: WARM, rimDir: 1 })); pool(v, 330, 234, 80, 10, '#ffcf80', 0.12);
  // 지켜보는 식구들
  person(v, 446, 230, 100, mate(v, { raw: true, f: -1, arm: 'chest', rim: WARM, rimDir: -1 }));
  for (let i = 0; i < 4; i++) person(v, 498 + i * 36, 230 + (i % 2) * 4, 96 - (i % 3) * 8, folk(i + 1, { raw: true, f: -1, old: i === 3, child: i === 1 }));
  finish(v, { inside: true });
}
/** 친부모: 저녁의 사립문. 문밖에 선 지친 두 사람, 그 사이에 선 아이, 어깨에 손을 얹은 기른 어버이 */
function adoptKin(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 140, 150, {});
  ground(v, (x) => Math.max(fn(x), 150) + 26, { color: '#6e6a50', color2: '#48463a', tufts: 50 });
  facade(v, 430, 240, 50, 200, { door: 520, win: 610, lit: true, open: true }); glow(v, 520, 150, 70, '#ffb060', 0.14);
  // 울타리와 열린 사립문
  for (let x = 0; x < 400; x += 22) if (x < 190 || x > 260) { rect(ctx, x, 190, 4, 30, t('#3a2c20')); } stroke(ctx, [0, 198, 186, 198], 2.4, t('#3a2c20')); stroke(ctx, [0, 210, 186, 210], 2.4, t('#3a2c20')); stroke(ctx, [264, 198, 400, 198], 2.4, t('#3a2c20')); stroke(ctx, [264, 210, 400, 210], 2.4, t('#3a2c20'));
  poly(ctx, [262, 190, 300, 200, 300, 228, 262, 220], rgba(t('#3a2c20'), 0.9));
  ctx.fillStyle = rgba(t('#8a7e62'), 0.7); ctx.beginPath(); ctx.moveTo(196, 240); ctx.quadraticCurveTo(230, 214, 470, 206); ctx.lineTo(560, 206); ctx.quadraticCurveTo(360, 226, 300, 240); ctx.fill();
  // 문밖의 친부모: 먼 길의 먼지, 보따리
  person(v, 120, 234, 100, { f: 1, cloth: '#4a443c', hair: '#3a2a1e', female: true, long: true, cloak: true, hood: true, arm: 'fwd', rim: FIRE, rimDir: 1 });
  person(v, 78, 236, 106, { f: 1, cloth: '#3e3a34', hair: '#5a4030', cloak: true, pose: 'bow', stick: 'staff' }); oval(ctx, 44, 230, 12, 8, t('#6a5a44'));
  // 아이: 둘 사이에서 문밖을 본다. 기른 어버이의 손
  person(v, 330, 232, 70, waif(4, { f: -1, cloth: '#5a6a54', rim: FIRE, rimDir: -1 }));
  person(v, 372, 236, 108, mine(v, { f: -1, arm: 'fwd', rim: FIRE, rimDir: -1 }));
  person(v, 500, 208, 88, mate(v, { raw: true, f: -1, arm: 'chest', noShadow: true }));
  finish(v);
}

/* ---------- 빚 ---------- */
/** 전당포: 쇠창살 창구 너머의 주인과 저울, 맡긴 물건이 가득한 선반, 줄 선 사람들 */
function creditPawn(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#44382c', floor: '#2c2219', fy: 180 }); rect(ctx, 0, 0, VW, 12, '#1e160f');
  // 뒤 선반: 맡긴 물건들
  for (let r = 0; r < 3; r++) { rect(ctx, 320, 44 + r * 40, 300, 4, '#2a1e14');
    for (let i = 0; i < 8; i++) { const x = 336 + i * 36, y = 44 + r * 40, k = (i + r * 3) % 6;
      if (k === 0) { rect(ctx, x - 2, y - 20, 4, 20, '#9a8450'); rect(ctx, x - 7, y - 3, 14, 3, '#9a8450'); }
      else if (k === 1) { oval(ctx, x, y - 8, 9, 8, '#6a4a30'); rect(ctx, x - 1.5, y - 30, 3, 16, '#4a3420'); }
      else if (k === 2) { rect(ctx, x - 9, y - 14, 18, 14, '#5a4636'); rect(ctx, x - 9, y - 9, 18, 2, '#33261a'); }
      else if (k === 3) { poly(ctx, [x - 8, y, x - 6, y - 18, x + 2, y - 18, x + 2, y - 6, x + 10, y - 4, x + 10, y], '#3a2e26'); }
      else if (k === 4) { oval(ctx, x, y - 9, 8, 9, '#8a8e96'); oval(ctx, x, y - 9, 5, 6, '#44382c'); }
      else { rect(ctx, x - 10, y - 8, 20, 8, '#6a3a3a'); rect(ctx, x - 8, y - 14, 16, 6, '#3e4a60'); } } }
  stroke(ctx, [600, 40, 560, 150], 2.4, '#9a9ea6'); stroke(ctx, [592, 60, 606, 66], 3, '#8a7440');
  // 주인: 창살 뒤에서 저울을 본다
  person(v, 436, 204, 112, { raw: true, f: -1, cloth: '#6a5a48', hair: '#8a8478', old: true, arm: 'fwd', noShadow: true, rim: WARM, rimDir: -1 });
  // 창구: 높은 계산대와 쇠창살
  rect(ctx, 300, 164, 340, 76, '#3a2a1c'); rect(ctx, 294, 158, 346, 8, '#5a4430'); rect(ctx, 300, 176, 340, 2, '#241a12');
  for (let x = 306; x < 640; x += 15) rect(ctx, x, 30, 2.4, 128, '#17130f'); rect(ctx, 300, 26, 340, 5, '#17130f'); rect(ctx, 300, 100, 340, 3, '#17130f'); rect(ctx, 296, 12, 6, 228, '#241a12');
  rect(ctx, 356, 120, 44, 38, '#44382c'); rect(ctx, 356, 118, 44, 3, '#17130f');
  // 저울과 등잔, 동전
  stroke(ctx, [470, 158, 470, 126], 1.6, '#9a8450'); stroke(ctx, [452, 130, 488, 126], 1.4, '#9a8450'); for (const [x, y] of [[452, 130], [488, 126]]) { stroke(ctx, [x, y, x - 6, y + 14], 0.6, '#9a8450'); stroke(ctx, [x, y, x + 6, y + 14], 0.6, '#9a8450'); oval(ctx, x, y + 15, 8, 2.4, '#9a8450'); }
  coins(ctx, 500, 158, 5); candle(v, 540, 158, 10); glow(v, 540, 144, 60, '#ffcf80', 0.2);
  // 맡기러 온 나: 창구 구멍으로 반지를 내민다
  person(v, 334, 236, 108, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: 1 })); oval(ctx, 372, 150, 2.6, 2.6, '#e8c860');
  // 줄 선 사람들: 보따리를 안은 여인, 외투를 벗어 든 노인, 아이
  person(v, 240, 234, 100, folk(1, { raw: true, f: 1, arm: 'chest', veil: true })); oval(ctx, 252, 180, 12, 9, '#7a6a54');
  person(v, 176, 236, 98, folk(5, { raw: true, f: 1, old: true, hair: '#b8b4ac', arm: 'fwd' })); poly(ctx, [190, 176, 214, 174, 218, 210, 196, 214], '#4a4460');
  person(v, 118, 236, 56, waif(2, { raw: true, f: 1 })); person(v, 82, 236, 102, folk(3, { raw: true, f: 1, pose: 'bow', cloak: true }));
  windowAt(v, 150, 36, 50, 60, {}); shaft(v, 150, 96, 50, 120, 70, '#d8d0c0', 0.08);
  finish(v, { inside: true });
}
/** 은행가의 장부: 촛불 아래 펼친 큰 장부와 쌓인 동전, 쇠 띠 두른 궤, 모자를 벗고 선 빚진 사람 */
function creditLedger(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#3e3228', floor: '#281e16', fy: 178 }); rect(ctx, 0, 0, VW, 12, '#1e160f');
  shelf(v, 380, 30, 150, 4, 7, ['#5a3a30', '#4a3a2a', '#3e4a40', '#6a5a3a', '#4e3a34']); shelf(v, 40, 30, 90, 3, 11);
  windowAt(v, 580, 40, 38, 80, { arch: true });
  // 은행가: 책상 뒤에 앉아 깃펜을 든다
  person(v, 322, 204, 118, { raw: true, f: -1, cloth: '#5a2a3a', hair: '#2a1e16', pose: 'sit', arm: 'fwd', cloak: true, hat: true, noShadow: true, rim: WARM, rimDir: -1 });
  // 큰 책상
  rect(ctx, 190, 172, 260, 62, '#3a2a1c'); rect(ctx, 182, 164, 276, 9, '#5a4430'); rect(ctx, 200, 184, 240, 2, '#241a12'); rect(ctx, 200, 206, 240, 2, '#241a12');
  poly(ctx, [240, 164, 288, 160, 290, 164], '#b8ae94'); poly(ctx, [236, 164, 292, 164, 296, 156, 264, 153, 232, 156], '#d8ceb0'); stroke(ctx, [264, 153, 264, 164], 0.8, '#8a8068'); for (let i = 0; i < 4; i++) { stroke(ctx, [240, 157 + i * 1.8, 260, 156 + i * 1.8], 0.5, '#5a5040'); stroke(ctx, [268, 156 + i * 1.8, 290, 157 + i * 1.8], 0.5, '#5a5040'); }
  stroke(ctx, [290, 152, 304, 132], 1, '#e8e0cc'); coins(ctx, 330, 164, 9); coins(ctx, 400, 164, 4, '#b8bcc4'); rect(ctx, 206, 156, 8, 8, '#1e1814');
  rect(ctx, 428, 136, 2, 28, '#8a7440'); candle(v, 429, 136, 10); glow(v, 429, 122, 80, '#ffcf80', 0.22); pool(v, 320, 166, 110, 10, '#ffcf80', 0.12);
  // 쇠 띠 두른 궤와 지키는 사람
  rect(ctx, 500, 188, 86, 46, '#4a3626'); rect(ctx, 496, 182, 94, 9, '#5a4430'); for (const x of [512, 540, 568]) rect(ctx, x, 182, 5, 52, '#2a2a30'); oval(ctx, 543, 206, 4, 5, '#9a8450');
  person(v, 614, 236, 110, { raw: true, f: -1, cloth: '#33302e', hair: '#1c1614', cloak: true, stick: 'staff' });
  // 빚진 나: 모자를 벗어 쥐고 섰다
  person(v, 130, 236, 110, mine(v, { raw: true, f: 1, arm: 'chest', pose: 'bow', rim: WARM, rimDir: 1 })); oval(ctx, 144, 178, 10, 5, '#2a221c');
  finish(v, { inside: true });
}
/** 빚 독촉: 흐린 낮의 집 앞. 문서를 든 사람과 세간을 끌어내는 손, 문간의 식구, 짐 실린 수레 */
function creditDun(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {});
  ground(v, (x) => Math.max(fn(x), 150) + 30, { color: '#6a6850', color2: '#46463a', tufts: 40 });
  const { dx } = facade(v, 340, 300, 44, 204, { open: false, door: 440, win: 566 }); rect(ctx, dx - 23, 108, 46, 96, '#17120e');
  // 수레: 벌써 실린 세간 (궤, 걸상, 솥)
  rect(ctx, 30, 190, 150, 8, t('#4a3a2a')); rect(ctx, 30, 166, 5, 26, t('#3a2c20')); rect(ctx, 175, 166, 5, 26, t('#3a2c20')); stroke(ctx, [180, 194, 236, 204], 3, t('#3a2c20'));
  for (const x of [66, 146]) { ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, 210, 18, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) stroke(ctx, [x - Math.cos(i * 0.785) * 18, 210 - Math.sin(i * 0.785) * 18, x + Math.cos(i * 0.785) * 18, 210 + Math.sin(i * 0.785) * 18], 1.2, t('#2a2018')); }
  rect(ctx, 44, 160, 46, 30, t('#6a5038')); rect(ctx, 44, 170, 46, 3, t('#3a2c20')); rect(ctx, 98, 150, 30, 4, t('#5a4430')); rect(ctx, 100, 154, 4, 36, t('#5a4430')); rect(ctx, 122, 154, 4, 36, t('#5a4430')); oval(ctx, 152, 180, 14, 10, t('#2a2420'));
  // 세간을 나르는 일꾼
  person(v, 262, 232, 102, { f: -1, cloth: '#3a3630', hair: '#1c1614', arm: 'fwd' }); rect(ctx, 214, 170, 34, 26, t('#5a4430')); rect(ctx, 214, 180, 34, 3, t('#33261a'));
  // 문서를 든 독촉꾼과 몽둥이 든 사내
  person(v, 356, 236, 110, { f: 1, cloth: '#2e2a30', hair: '#2a1e16', cloak: true, hat: true, arm: 'fwd', rim: COLD, rimDir: -1 }); poly(ctx, [384, 150, 404, 152, 402, 180, 382, 178], '#d8ceb0'); oval(ctx, 393, 176, 3, 3, '#8a2f2a');
  person(v, 308, 238, 112, { f: 1, cloth: '#3e342c', hair: '#1c1614', stick: 'staff' });
  // 문간의 식구: 무릎 꿇은 가장(나), 아이를 안은 배우자, 치마를 붙든 아이
  person(v, 428, 236, 100, mine(v, { f: -1, pose: 'kneel', arm: 'fwd' }));
  person(v, 474, 212, 92, mate(v, { f: -1, arm: 'chest', noShadow: true })); person(v, 500, 214, 50, waif(1, { f: -1, noShadow: true }));
  // 길 건너에서 보는 이웃
  for (let i = 0; i < 3; i++) person(v, 572 + i * 26, 232 + (i % 2) * 4, 84 + i * 5, folk(i + 2, { f: -1, pose: i === 1 ? 'bow' : 'stand' }));
  finish(v, { noLeaves: true });
}
/** 탕감: 광장의 화로에 던져지는 빚 문서, 단 위에서 포고를 읽는 관리, 올려다보는 사람들 */
function creditPardon(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {});
  // 광장을 두른 집들
  for (let i = 0; i < 9; i++) { const x = i * 76 - 10, w = 70, h = 70 + hash(i, 8) * 40; rect(ctx, x, 170 - h, w, h, t(i % 2 ? '#5e564c' : '#685e50')); poly(ctx, [x - 4, 170 - h, x + w / 2, 170 - h - 26, x + w + 4, 170 - h], t('#3a2e28')); for (let k = 0; k < 2; k++) rect(ctx, x + 14 + k * 28, 170 - h + 20, 12, 16, t('#2a2224')); }
  ground(v, () => 168, { color: '#7a7262', color2: '#544e44', tufts: 0, plain: true });
  // 단과 관리, 깃발
  rect(ctx, 420, 176, 130, 30, t('#5a5248')); rect(ctx, 414, 170, 142, 8, t('#746a5e')); rect(ctx, 400, 190, 20, 16, t('#5a5248'));
  person(v, 470, 172, 96, { f: -1, cloth: '#6a2a36', hair: '#8a8478', robe: true, arm: 'fwd', hat: true, rim: FIRE, rimDir: -1 }); poly(ctx, [424, 96, 446, 98, 444, 136, 422, 134], '#d8ceb0'); oval(ctx, 434, 136, 3, 3, '#8a2f2a');
  person(v, 524, 172, 92, { f: -1, cloth: '#5a5e68', hair: '#1c1614', hat: true, stick: 'spear' });
  rect(ctx, 548, 60, 3, 112, t('#2a2018')); poly(ctx, [551, 62, 596, 66, 590, 96, 551, 100], t('#8a2f2a')); sunSign(v, 572, 82, 8, t('#d8b04a'));
  // 화로: 타오르는 문서 더미, 날리는 재와 종이
  rect(ctx, 296, 206, 5, 22, t('#2a2a30')); rect(ctx, 340, 206, 5, 22, t('#2a2a30')); poly(ctx, [284, 190, 356, 190, 346, 210, 294, 210], t('#33333a'));
  for (let i = 0; i < 6; i++) poly(ctx, [296 + i * 9, 190, 306 + i * 9, 184 - (i % 2) * 4, 312 + i * 9, 190], '#d8ceb0');
  flame(v, 312, 190, 10); flame(v, 326, 190, 13); flame(v, 338, 191, 8); glow(v, 322, 172, 70, '#ff8a30', 0.1); pool(v, 322, 226, 130, 12, '#ff8a30', 0.1); smoke(v, 324, 160, 150, 40, '#2a2622', 0.24);
  for (let i = 0; i < 12; i++) { const x = 300 + hash(i, 5) * 80 - i * 2, y = 150 - hash(i, 6) * 110; ctx.save(); ctx.translate(x, y); ctx.rotate(hash(i, 7) * 3); rect(ctx, -4, -3, 8, 6, i % 3 ? 'rgba(216,206,176,.8)' : 'rgba(40,30,24,.8)'); ctx.restore(); }
  // 문서를 던지는 서기
  person(v, 262, 232, 100, { f: 1, cloth: '#3a3a44', hair: '#2a1e16', arm: 'fwd', rim: FIRE, rimDir: 1 }); poly(ctx, [282, 172, 298, 176, 294, 188, 280, 186], '#d8ceb0');
  // 둘러선 사람들 (등과 옆): 우는 사람, 무릎 꿇은 사람
  for (let i = 0; i < 6; i++) person(v, 26 + i * 36, 232 + (i % 2) * 6, 92 + (i % 3) * 8, folk(i, { f: 1, arm: i === 2 ? 'up' : i === 4 ? 'chest' : undefined, old: i === 5, rim: FIRE, rimDir: 1 }));
  person(v, 388, 238, 84, folk(4, { f: -1, pose: 'kneel', arm: 'chest', rim: FIRE, rimDir: -1 }));
  person(v, 600, 240, 112, mine(v, { f: -1, cloak: true, rim: FIRE, rimDir: -1 })); person(v, 562, 238, 60, waif(0, { f: -1 }));
  finish(v, { noLeaves: true });
}

/* ---------- 수도원 ---------- */
/** 필사실: 높은 창 아래 줄지어 놓인 기운 책상, 깃펜을 든 수도사들, 앞쪽의 큰 책 */
function cloisterScript(v) {
  const { ctx } = v; room(v, { wall: '#5a544c', floor: '#3a342e', fy: 176 });
  for (let i = 0; i < 4; i++) { const x = 110 + i * 120; windowAt(v, x, 20, 34, 84, { arch: true }); shaft(v, x, 104, 34, 130, 70, '#f0e4c0', 0.11); }
  shelf(v, 560, 60, 70, 4, 21, ['#5a3a30', '#4a4460', '#3e4a40', '#6a5a3a']);
  // 뒷줄의 책상과 수도사
  for (let i = 0; i < 2; i++) { const x = 130 + i * 120; person(v, x - 14, 214, 84, monk(i, { raw: true, f: 1, pose: 'sit', arm: 'fwd', hood: i === 2, noShadow: true, rim: 'rgba(240,228,192,.4)', rimDir: -1 }));
    poly(ctx, [x - 2, 176, x + 42, 164, x + 42, 170, x - 2, 182], '#4e3a28'); rect(ctx, x + 34, 170, 5, 44, '#33261a'); rect(ctx, x + 2, 180, 5, 34, '#33261a'); poly(ctx, [x + 6, 172, x + 34, 164, x + 35, 167, x + 7, 175], '#d8ceb0'); stroke(ctx, [x + 14, 168, x + 20, 152], 0.8, '#e8e0cc'); rect(ctx, x + 38, 158, 4, 6, '#1e1814'); }
  // 걸어 다니며 살피는 늙은 수도사
  person(v, 590, 228, 98, monk(1, { raw: true, f: -1, old: true, hair: '#b8b4ac', stick: 'staff' }));
  ctx.save(); ctx.translate(84, 0);
  // 앞쪽: 나의 책상. 펼친 큰 책, 붉은 머리글자, 촛불과 물감 접시
  person(v, 250, 250, 132, { ...monk(0, { raw: true, f: 1, pose: 'sit', arm: 'fwd', rim: 'rgba(240,228,192,.5)', rimDir: -1, noShadow: true }), hair: v.me.hair });
  poly(ctx, [270, 196, 400, 172, 400, 182, 270, 206], '#4a3626'); rect(ctx, 384, 182, 8, 58, '#2e2218'); rect(ctx, 276, 204, 8, 36, '#2e2218');
  poly(ctx, [290, 190, 340, 181, 342, 186, 292, 196], '#e0d6b8'); poly(ctx, [342, 181, 388, 172, 390, 177, 344, 186], '#d8ceb0'); rect(ctx, 296, 186, 6, 5, '#8a2f2a'); for (let i = 0; i < 3; i++) { stroke(ctx, [306, 187 - i * 0.2 + i * 2, 336, 182 + i * 2], 0.5, '#4a4034'); stroke(ctx, [348, 180 + i * 2, 384, 174 + i * 2], 0.5, '#4a4034'); }
  stroke(ctx, [330, 180, 344, 156], 1, '#e8e0cc'); oval(ctx, 404, 172, 5, 2, '#3e4a80'); oval(ctx, 416, 170, 5, 2, '#8a2f2a'); rect(ctx, 430, 150, 2, 20, '#8a7440'); candle(v, 431, 150, 9); glow(v, 431, 138, 46, '#ffcf80', 0.18);
  ctx.restore();
  finish(v, { inside: true });
}
/** 회랑: 아치 너머의 안뜰과 우물, 약초밭, 종탑. 둘씩 걷는 두건 쓴 수도사들 */
function cloisterWalk(v) {
  const { ctx, t } = v; sky(v); far(v, {});
  // 건너편 회랑과 예배당, 종탑
  rect(ctx, 0, 96, VW, 60, t('#7a7468')); for (let i = 0; i < 16; i++) { ctx.fillStyle = t('#2e2a2a'); ctx.beginPath(); ctx.moveTo(14 + i * 40, 156); ctx.lineTo(14 + i * 40, 126); ctx.arc(26 + i * 40, 126, 12, Math.PI, 0); ctx.lineTo(38 + i * 40, 156); ctx.fill(); }
  poly(ctx, [0, 96, VW, 96, VW, 80, 0, 80], t('#4a3a32')); rect(ctx, 420, 20, 54, 76, t('#827c70')); poly(ctx, [414, 20, 447, -14, 480, 20], t('#4a3a32')); ctx.fillStyle = t('#1e1a1c'); ctx.beginPath(); ctx.moveTo(438, 60); ctx.lineTo(438, 42); ctx.arc(447, 42, 9, Math.PI, 0); ctx.lineTo(456, 60); ctx.fill(); oval(ctx, 447, 50, 5, 6, t('#9a8450'));
  // 안뜰: 풀밭과 우물, 약초 두둑
  ground(v, () => 154, { color: '#66704c', color2: '#48503a', tufts: 40 });
  rect(ctx, 300, 176, 44, 18, t('#6e685e')); oval(ctx, 322, 176, 22, 5, t('#2a2a2e')); rect(ctx, 302, 146, 4, 32, t('#3a2c20')); rect(ctx, 338, 146, 4, 32, t('#3a2c20')); poly(ctx, [296, 148, 322, 134, 348, 148], t('#4a3a32'));
  for (let i = 0; i < 4; i++) { rect(ctx, 120 + i * 34, 180, 26, 8, t('#4a3e30')); for (let k = 0; k < 4; k++) oval(ctx, 124 + i * 34 + k * 6, 178, 3, 4, t(['#5a7a44', '#6a7a3c', '#4e6a50', '#7a8a4c'][(i + k) % 4])); }
  person(v, 232, 192, 50, monk(2, { f: -1, pose: 'kneel', noShadow: true }));
  tree(v, 520, 186, 80, {});
  // 앞쪽 회랑: 그늘진 아치와 낮은 담, 돌바닥
  rect(ctx, 0, 206, VW, 34, '#3a342e'); for (let i = 0; i < 9; i++) stroke(ctx, [i * 80 - 20, 240, i * 80 + 20 + (i - 4) * -8, 206], 0.8, 'rgba(0,0,0,.25)');
  for (let i = 0; i < 4; i++) arch(ctx, i * 180 - 40, 180, 0, 84, 206, '#2e2924');
  rect(ctx, 0, 190, VW, 16, '#2a2520'); rect(ctx, 0, 188, VW, 3, '#4a443c');
  for (let i = 0; i < 4; i++) { const x = i * 180 - 40; rect(ctx, x - 9, 84, 18, 106, '#342e28'); rect(ctx, x - 12, 78, 24, 8, '#443e36'); rect(ctx, x - 9, 84, 5, 106, 'rgba(255,230,180,.07)'); }
  for (let i = 0; i < 4; i++) poly(ctx, [i * 180 + 2, 206, i * 180 + 110, 206, i * 180 + 150, 240, i * 180 + 30, 240], 'rgba(255,230,170,.07)');
  // 걷는 수도사들
  person(v, 196, 238, 108, monk(0, { raw: true, f: 1, hood: true, arm: 'chest', rim: WARM, rimDir: -1 })); person(v, 238, 240, 112, { ...monk(1, { raw: true, f: 1, arm: 'chest', rim: WARM, rimDir: -1 }), hair: v.me.hair });
  person(v, 470, 236, 100, monk(2, { raw: true, f: -1, hood: true, old: true, stick: 'staff' })); person(v, 560, 238, 70, monk(1, { raw: true, f: -1, child: true, arm: 'chest' }));
  finish(v, { noLeaves: true });
}
/** 은둔처: 안개 낀 산허리의 돌 움막과 연기, 문 앞에 앉은 늙은 은자, 비탈길을 올라오는 사람 */
function cloisterHermit(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true });
  // 건너편 봉우리와 골짜기 안개
  poly(ctx, [0, 150, 90, 90, 170, 120, 250, 70, 330, 130, 400, 150, 400, 240, 0, 240], t('#5a6066')); rect(ctx, 0, 130, VW, 60, rgba(t('#c8ccd4'), 0.3));
  // 바위 턱과 벼랑
  poly(ctx, [640, 30, 560, 40, 520, 90, 470, 110, 300, 150, 150, 200, 60, 240, 640, 240], t('#56524a')); poly(ctx, [640, 30, 560, 40, 520, 90, 560, 110, 600, 70], t('#666258'));
  poly(ctx, [300, 150, 470, 110, 520, 150, 560, 170, 400, 196, 320, 176], t('#6a6658'));
  // 비탈길
  ctx.strokeStyle = rgba(t('#9a8e74'), 0.8); ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(40, 244); ctx.quadraticCurveTo(160, 214, 250, 214); ctx.quadraticCurveTo(360, 212, 400, 186); ctx.stroke();
  // 돌 움막: 벼랑에 기대 쌓았다
  rect(ctx, 440, 120, 100, 62, t('#7a7468')); for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) rect(ctx, 442 + i * 20 + (r % 2) * 8, 124 + r * 15, 16, 1.4, 'rgba(0,0,0,.22)');
  poly(ctx, [430, 122, 550, 108, 552, 118, 432, 132], t('#4a4238')); rect(ctx, 474, 140, 26, 42, t('#17120e')); rect(ctx, 514, 136, 14, 14, t('#1e1a1c')); glow(v, 487, 164, 26, '#ff9a48', 0.14);
  smoke(v, 530, 104, 100, 22, '#3a3632', 0.22); sunSign(v, 487, 132, 5, t('#8a7440'));
  for (const [x, y, h] of [[590, 168, 70], [404, 150, 50], [620, 110, 44]]) tree(v, x, y, h, { dark: true });
  // 걸어 둔 약초와 물동이, 작은 밭
  stroke(ctx, [544, 150, 570, 150], 1, t('#3a2c20')); for (let i = 0; i < 3; i++) oval(ctx, 550 + i * 8, 156, 2.4, 5, t('#5a6a44')); oval(ctx, 430, 180, 7, 8, t('#6a5040'));
  // 은자: 문 앞 바위에 앉아 올라오는 사람을 본다
  person(v, 456, 188, 70, { f: -1, cloth: '#5a5448', hair: '#c8c4bc', robe: true, old: true, pose: 'sit', stick: 'staff', rim: COLD, rimDir: -1 });
  // 올라오는 나: 지팡이와 등짐
  person(v, 262, 222, 92, mine(v, { f: 1, cloak: true, stick: 'staff', pose: 'bow', rim: COLD, rimDir: -1 })); oval(ctx, 250, 164, 10, 12, t('#5a4a36'));
  // 앞쪽 바위와 굽은 소나무
  poly(ctx, [0, 240, 0, 190, 40, 176, 86, 200, 110, 240], t('#3a3632')); tree(v, 30, 190, 110, { dark: true, lean: 0.2 });
  finish(v, { noLeaves: true });
}
/** 떠나는 날: 새벽의 수도원 문. 문간에서 손을 든 원장, 개어 놓은 수도복, 길로 나서며 돌아보는 사람 */
function cloisterLeave(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 150, 156, {});
  ground(v, (x) => Math.max(fn(x), 150) + 22 + (x - 320) * 0.02, { color: '#6e7054', color2: '#484a3a', tufts: 60 });
  // 수도원 담과 문, 종탑
  rect(ctx, 400, 70, 240, 130, t('#7a7468')); rect(ctx, 400, 62, 240, 10, t('#4a3a32')); for (let r = 0; r < 6; r++) for (let i = 0; i < 6; i++) rect(ctx, 406 + i * 40 + (r % 2) * 18, 82 + r * 20, 26, 1.4, 'rgba(0,0,0,.18)');
  rect(ctx, 560, 0, 60, 70, t('#827c70')); poly(ctx, [552, 4, 590, -30, 628, 4], t('#4a3a32')); ctx.fillStyle = t('#1e1a1c'); ctx.beginPath(); ctx.moveTo(580, 50); ctx.lineTo(580, 30); ctx.arc(590, 30, 10, Math.PI, 0); ctx.lineTo(600, 50); ctx.fill(); oval(ctx, 590, 40, 5, 6, t('#9a8450'));
  ctx.fillStyle = t('#1a1512'); ctx.beginPath(); ctx.moveTo(440, 200); ctx.lineTo(440, 130); ctx.arc(476, 130, 36, Math.PI, 0); ctx.lineTo(512, 200); ctx.fill(); poly(ctx, [512, 110, 536, 120, 536, 204, 512, 200], t('#3a2c20')); sunSign(v, 476, 82, 7, t('#8a7440'));
  // 길: 문에서 골짜기 마을로
  ctx.fillStyle = rgba(t('#9a8a66'), 0.8); ctx.beginPath(); ctx.moveTo(440, 200); ctx.lineTo(512, 200); ctx.quadraticCurveTo(380, 216, 150, 240); ctx.lineTo(0, 240); ctx.quadraticCurveTo(260, 206, 440, 200); ctx.fill();
  // 문간의 원장과 뒤에 선 수도사들, 개어 놓은 수도복
  person(v, 470, 206, 92, monk(1, { f: -1, old: true, hair: '#c8c4bc', arm: 'out', stick: 'crook', rim: WARM, rimDir: -1 }));
  person(v, 498, 202, 80, monk(0, { f: -1, hood: true, noShadow: true })); person(v, 452, 200, 76, monk(2, { f: -1, hood: true, arm: 'chest', noShadow: true }));
  rect(ctx, 404, 198, 30, 8, t('#746a5e')); rect(ctx, 408, 190, 22, 8, t('#4a4034')); rect(ctx, 408, 188, 22, 2, t('#5a5044')); stroke(ctx, [412, 190, 426, 190], 1, t('#c8b890'));
  // 떠나는 나: 속세의 옷, 지팡이 끝의 보따리, 한 번 돌아본다
  person(v, 236, 236, 108, mine(v, { f: 1, cloak: true, stick: 'staff', rim: WARM, rimDir: -1 })); oval(ctx, 262, 132, 10, 9, t('#6a5a44'));
  tree(v, 90, 214, 120, { bare: v.q === 3 });
  finish(v);
}

export const PLATES18 = {
  /** 입양. variant: basket(문간의 바구니) hall(고아원) rite(양자 의식) kin(친부모) */
  adopt(v) { const k = v.variant ?? 'hall'; return ({ basket: adoptBasket, rite: adoptRite, kin: adoptKin }[k] ?? adoptHall)(v); },
  /** 빚. variant: pawn(전당포) ledger(은행가의 장부) dun(빚 독촉) pardon(탕감) */
  credit(v) { const k = v.variant ?? 'ledger'; return ({ pawn: creditPawn, dun: creditDun, pardon: creditPardon }[k] ?? creditLedger)(v); },
  /** 수도원. variant: script(필사실) walk(회랑) hermit(은둔처) leave(떠나는 날) */
  cloister(v) { const k = v.variant ?? 'walk'; return ({ script: cloisterScript, hermit: cloisterHermit, leave: cloisterLeave }[k] ?? cloisterWalk)(v); },
};
