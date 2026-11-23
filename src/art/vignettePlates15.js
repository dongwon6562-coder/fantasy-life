// 36단계 삽화: 점령지(점령군 깃발, 징발, 밤의 저항, 해방의 날),
// 길 위의 일(역참 마당, 짐수레, 눈길, 도적), 사교계(연회장, 살롱, 무도, 망신).
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, ground, road, room, windowAt, glow, flame, candle, pool, person, crowd, tree, finish } from './vignetteKit.js';
import { horseSil } from './vignettePlates4.js';
import { spear, torch, wagon } from './vignettePlates5.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.45)', GOLD = 'rgba(255,220,150,.5)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
// 사교계의 옷: 짙은 포도주빛, 밤빛 푸름, 이끼빛, 상아빛, 검정, 자줏빛
const SILK = ['#6a2a36', '#2a3a5e', '#3e5a48', '#cfc4a8', '#22202a', '#5a3a66'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const gentry = (i, o = {}) => ({ cloth: SILK[i % 6], hair: HR[(i + 2) % 6], female: i % 2 === 0, long: i % 2 === 0, robe: i % 2 === 0, cloak: i % 2 === 1 && i % 3 === 0, ...o });
// 점령군: 잿빛 군복과 투구. 깃발은 검회색 바탕에 창백한 꺾쇠 하나
const OCC = '#3a3e48', OCCF = '#2a2c34';
const trooper = (o = {}) => ({ cloth: OCC, hair: '#1c1614', hat: true, ...o });

/** 점령군 깃발: 건물에 내려뜨린 긴 천 */
function occFlag(ctx, x, y, w, h, c = OCCF) {
  poly(ctx, [x, y, x + w, y, x + w, y + h, x + w / 2, y + h - w * 0.4, x, y + h], c);
  stroke(ctx, [x + w * 0.22, y + h * 0.34, x + w / 2, y + h * 0.2, x + w * 0.78, y + h * 0.34], Math.max(1.4, w * 0.09), '#b8b4a8');
}
/** 줄지은 집들 (광장·거리의 배경). 돌려주는 값 없음 */
function houses(v, list, base) {
  const { ctx, t } = v;
  for (const [x, w, h, c, lit] of list) {
    rect(ctx, x, base - h, w, h, t(c)); poly(ctx, [x - 4, base - h, x + w / 2, base - h - 24, x + w + 4, base - h], t(dark(c, 0.32)));
    for (let r = 0; r < Math.floor(h / 40); r++) for (let i = 0; i < Math.floor(w / 30); i++) rect(ctx, x + 12 + i * 30, base - h + 16 + r * 36, 10, 14, lit && hash(x + i, r) < lit ? '#d09a4a' : t('#1a1512'));
  }
}
/** 샹들리에: 쇠 고리와 촛불들 */
function chandelier(v, x, y, r) {
  const { ctx } = v; stroke(ctx, [x, 0, x, y - r * 0.5], 1.2, '#2a2218');
  ctx.strokeStyle = '#8a7440'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.26, 0, 0, TAU); ctx.stroke(); stroke(ctx, [x - r, y, x, y - r * 0.5, x + r, y], 0.9, '#8a7440');
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.26; rect(ctx, px - 0.8, py - 5, 1.6, 5, '#e8dcc0'); oval(ctx, px, py - 7, 1.4, 2.4, '#ffd890'); }
  glow(v, x, y - 4, r * 2.6, '#ffcf80', 0.34);
}
/** 술잔 (굽 달린 잔) */
const goblet = (ctx, x, y, c = '#b8a060') => { poly(ctx, [x - 3, y - 9, x + 3, y - 9, x + 1.6, y - 4, x - 1.6, y - 4], c); rect(ctx, x - 0.6, y - 4, 1.2, 3, c); rect(ctx, x - 2.4, y - 1, 4.8, 1, c); };

/* ---------- 점령지 ---------- */
/** 점령군 깃발: 광장의 관청에 내걸린 남의 깃발, 늘어선 병사와 고개 숙인 사람들 */
function occBanner(v) {
  const { ctx, t } = v; sky(v);
  houses(v, [[0, 120, 110, '#5a4e42'], [112, 90, 90, '#64564a'], [470, 100, 100, '#5e5246'], [566, 90, 124, '#52463c']], 176);
  // 관청: 기둥 현관과 발코니, 양쪽에 내린 깃발, 꺾인 옛 깃대
  rect(ctx, 210, 46, 250, 130, t('#7a7062')); poly(ctx, [200, 46, 335, 8, 470, 46], t('#544a40')); rect(ctx, 204, 44, 262, 6, t('#4a4036'));
  for (let i = 0; i < 5; i++) rect(ctx, 232 + i * 50, 98, 9, 78, t('#9a9082')); rect(ctx, 222, 92, 228, 7, t('#544a40')); rect(ctx, 318, 120, 34, 56, t('#1e1814'));
  for (let i = 0; i < 4; i++) rect(ctx, 246 + i * 54, 60, 14, 22, t('#1a1512'));
  occFlag(ctx, 250, 50, 30, 96); occFlag(ctx, 390, 50, 30, 96);
  stroke(ctx, [335, 8, 335, -6], 2, t('#2a2018')); stroke(ctx, [335, 8, 352, 16], 2, t('#2a2018')); // 꺾인 깃대
  rect(ctx, 0, 176, VW, 64, t('#6a6258')); for (let i = 0; i < 9; i++) stroke(ctx, [0, 182 + i * i * 0.9, VW, 182 + i * i * 0.9], 0.6, 'rgba(0,0,0,.2)');
  // 계단 위의 장교와 포고문, 줄지은 병사
  rect(ctx, 290, 176, 90, 6, t('#8a8072')); person(v, 335, 180, 60, trooper({ f: 0, cloak: true, arm: 'out', cloth: '#2a2c34' })); rect(ctx, 344, 132, 12, 16, t('#d8ceb4'));
  for (let i = 0; i < 7; i++) { const x = 190 + i * 48; if (Math.abs(x - 335) < 40) continue; person(v, x, 192, 62, trooper({ f: 0 })); spear(v, x + 9, 192, 78, 0); }
  // 광장의 사람들: 등을 보이고, 고개를 숙였다. 맨 앞의 나
  crowd(v, 20, 250, 240, 4, 90, {}); crowd(v, 420, 630, 240, 4, 90, {});
  person(v, 300, 238, 100, mine(v, { f: 0, pose: 'bow' })); person(v, 366, 236, 64, folk(2, { f: 0, child: true }));
  finish(v);
}
/** 징발: 농가 마당, 자루와 소를 끌어내는 병사들과 문간의 식구 */
function occLevy(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); ground(v, (x) => Math.max(fn(x), 150) + 12, { color: '#8a7e5e', color2: '#6a5e44', tufts: 60 });
  // 농가와 헛간
  rect(ctx, 20, 84, 190, 110, t('#a09078')); poly(ctx, [6, 84, 115, 30, 224, 84], t('#6a5438')); rect(ctx, 90, 124, 40, 70, t('#1a1410')); rect(ctx, 40, 110, 26, 24, t('#2a2018')); rect(ctx, 160, 110, 26, 24, t('#2a2018'));
  rect(ctx, 250, 110, 110, 80, t('#6a563e')); poly(ctx, [242, 110, 305, 76, 368, 110], t('#4a3a28')); rect(ctx, 280, 132, 50, 58, t('#17120e'));
  // 문간의 식구: 붙잡는 아내와 아이, 팔을 벌린 노인
  person(v, 108, 196, 70, folk(1, { f: 1, female: true, long: true, arm: 'chest' })); person(v, 130, 198, 42, folk(2, { f: 1, child: true })); person(v, 176, 206, 78, folk(5, { f: 1, old: true, arm: 'out' }));
  // 수레와 쌓인 자루, 끌려 나오는 소
  wagon(v, 500, 214, 1.15, -1);
  for (const [x, y] of [[430, 214], [448, 216], [438, 204]]) { oval(ctx, x, y, 12, 8, t('#b8a680')); stroke(ctx, [x - 4, y - 7, x + 4, y - 7], 1.2, t('#6a5a3c')); }
  const ox = 330, oy = 214; oval(ctx, ox, oy - 22, 30, 15, t('#6a4a34')); rect(ctx, ox - 24, oy - 16, 6, 16, t('#5a3e2c')); rect(ctx, ox + 16, oy - 16, 6, 16, t('#5a3e2c')); oval(ctx, ox + 32, oy - 30, 10, 8, t('#6a4a34')); stroke(ctx, [ox + 36, oy - 38, ox + 42, oy - 44], 1.6, t('#d8d0b8')); stroke(ctx, [ox + 40, oy - 28, ox + 74, oy - 40], 1, t('#2a1e16'));
  person(v, 408, 216, 86, trooper({ f: -1, arm: 'fwd' })); // 고삐를 쥔 병사
  person(v, 236, 214, 84, trooper({ f: 1, arm: 'chest' })); oval(ctx, 246, 168, 13, 9, t('#b8a680')); // 자루를 멘 병사
  person(v, 590, 232, 100, trooper({ f: -1, cloak: true, cloth: '#2a2c34' })); rect(ctx, 566, 176, 14, 18, t('#d8ceb4')); // 장부를 든 장교
  // 울타리 밖에서 지켜보는 나
  for (let i = 0; i < 5; i++) stroke(ctx, [10 + i * 22, 240, 11 + i * 22, 214], 2.4, t('#3e2e20')); stroke(ctx, [4, 224, 104, 222], 1.6, t('#3e2e20'));
  person(v, 60, 242, 96, mine(v, { f: 1 }));
  finish(v);
}
/** 밤의 저항: 통금의 골목, 깃발 줄을 끊는 손과 망보는 사람, 멀리 순찰의 횃불 */
function occNight(v) {
  const { ctx, t } = v; sky(v);
  // 골목 끝의 큰길과 순찰
  rect(ctx, 250, 90, 140, 110, rgba('#2a3450', 0.9)); rect(ctx, 250, 164, 140, 40, t('#4a4640')); rect(ctx, 270, 110, 44, 54, t('#3a3632')); rect(ctx, 330, 100, 60, 64, t('#34302c'));
  person(v, 296, 182, 38, trooper({ raw: true, f: 1 })); person(v, 318, 184, 40, trooper({ raw: true, f: 1 })); torch(v, 306, 164, 22, 4); glow(v, 306, 142, 44, '#ff9a40', 0.4);
  // 양옆 집들
  poly(ctx, [0, 0, 240, 0, 252, 60, 262, 204, 220, 240, 0, 240], t('#2c2824')); poly(ctx, [640, 0, 410, 0, 396, 54, 380, 204, 430, 240, 640, 240], t('#242120'));
  for (const [x, y, w, h] of [[50, 50, 30, 36], [140, 60, 26, 30], [480, 44, 28, 34], [570, 50, 30, 36]]) { rect(ctx, x, y, w, h, '#100e0d'); stroke(ctx, [x - 2, y + h / 2, x + w + 2, y + h / 2], 2.4, t('#3a3028')); }
  rect(ctx, 160, 130, 46, 90, '#0e0c0b');
  // 골목에 걸린 점령군 깃발: 한쪽 줄이 끊겨 기울었다
  stroke(ctx, [256, 40, 330, 52], 0.9, t('#8a8070')); ctx.save(); ctx.translate(330, 52); ctx.rotate(0.5); occFlag(ctx, -14, 0, 28, 70, '#22242c'); ctx.restore(); stroke(ctx, [352, 46, 398, 40], 0.9, t('#8a8070'));
  // 벽에 붙인 벽보와 풀통
  rect(ctx, 470, 120, 34, 44, '#b8ae94'); for (let i = 0; i < 5; i++) stroke(ctx, [475, 128 + i * 7, 498 - hash(i, 1) * 8, 128 + i * 7], 0.8, 'rgba(30,22,16,.7)'); rect(ctx, 510, 216, 16, 14, t('#4a3a2c'));
  // 사다리 위에서 줄을 끊는 사람, 벽보를 붙이는 나, 골목 어귀에서 망보는 사람
  stroke(ctx, [384, 226, 366, 96], 2, '#2a2018'); stroke(ctx, [400, 226, 380, 96], 2, '#2a2018'); for (let i = 0; i < 8; i++) stroke(ctx, [383 - i * 2.2, 214 - i * 15, 398 - i * 2.4, 214 - i * 15], 1.4, '#2a2018');
  person(v, 376, 150, 70, folk(3, { raw: true, f: -1, arm: 'up', hood: true, rim: COLD, rimDir: -1 }));
  person(v, 520, 236, 104, mine(v, { raw: true, f: -1, arm: 'fwd', hood: true, rim: COLD, rimDir: -1 }));
  person(v, 240, 226, 84, folk(5, { raw: true, f: -1, hood: true, cloak: true }));
  finish(v);
}
/** 해방의 날: 끌어내린 깃발이 광장 바닥에 깔리고, 옛 깃발이 다시 오른다 */
function occFree(v) {
  const { ctx, t } = v; sky(v);
  houses(v, [[0, 120, 110, '#6a5c4c'], [112, 90, 90, '#74644f'], [470, 100, 100, '#6c5e4c'], [566, 90, 124, '#625444']], 176);
  rect(ctx, 210, 46, 250, 130, t('#8a8070')); poly(ctx, [200, 46, 335, 8, 470, 46], t('#5e5246')); for (let i = 0; i < 5; i++) rect(ctx, 232 + i * 50, 98, 9, 78, t('#a89e8e')); rect(ctx, 222, 92, 228, 7, t('#5e5246')); rect(ctx, 318, 120, 34, 56, t('#1e1814'));
  // 다시 오른 고장의 깃발 (붉은 바탕에 금빛 띠), 반쯤 뜯긴 점령군 깃발
  rect(ctx, 314, 48, 42, 5, t('#2a2018')); poly(ctx, [318, 52, 352, 52, 352, 104, 335, 96, 318, 104], '#8a2f2a'); ctx.strokeStyle = '#c8a850'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(335, 72, 8, 0, TAU); ctx.stroke();
  ctx.save(); ctx.translate(262, 50); ctx.rotate(0.24); occFlag(ctx, 0, 0, 30, 70); ctx.restore();
  rect(ctx, 0, 176, VW, 64, t('#7a7062')); for (let i = 0; i < 9; i++) stroke(ctx, [0, 182 + i * i * 0.9, VW, 182 + i * i * 0.9], 0.6, 'rgba(0,0,0,.18)');
  // 바닥에 깔린 깃발을 밟고 선 사람들
  poly(ctx, [270, 214, 400, 208, 410, 228, 276, 236], OCCF); stroke(ctx, [300, 226, 336, 216, 372, 224], 3, '#8a867c');
  for (let i = 0; i < 8; i++) { const x = 70 + i * 70 + hash(i, 3) * 12; person(v, x, 206 + hash(i, 4) * 8, 66 + hash(i, 5) * 8, folk(i, { f: i % 2 ? 1 : -1, arm: i % 3 === 0 ? 'up' : i % 3 === 1 ? 'out' : undefined, child: i === 5 })); }
  // 한쪽: 머리를 깎인 채 끌려가는 부역자와 그를 붙든 사람들
  person(v, 560, 226, 88, folk(4, { f: -1, pose: 'bow', hair: '#b8a890', cloth: '#5a5650' })); person(v, 600, 230, 94, folk(0, { f: -1, arm: 'fwd' })); person(v, 524, 230, 92, folk(3, { f: 1, arm: 'fwd' }));
  person(v, 330, 238, 104, mine(v, { f: 0, arm: 'up', rim: WARM, rimDir: v.S.dir }));
  crowd(v, 20, 250, 250, 3, 92, {});
  finish(v);
}

/* ---------- 길 위의 일 ---------- */
/** 역참 마당: 말을 갈아 매는 새벽, 마구간과 우물, 떠날 채비의 수레 */
function carYard(v) {
  const { ctx, t } = v; sky(v);
  // 역참 본채와 마구간
  rect(ctx, 0, 60, 230, 130, t('#8a7a64')); poly(ctx, [0, 60, 244, 60, 220, 22, 0, 16], t('#5a4436'));
  for (const [x, lit] of [[30, 1], [90, 0], [150, 1]]) { rect(ctx, x, 86, 28, 32, lit ? '#d09a4a' : t('#1a1512')); if (lit) glow(v, x + 14, 102, 34, '#ffa850', 0.3); } rect(ctx, 100, 136, 34, 54, t('#2a1e16'));
  stroke(ctx, [232, 78, 262, 78], 2, t('#2a2018')); poly(ctx, [240, 80, 258, 80, 258, 100, 249, 106, 240, 100], t('#5a4030')); // 간판
  rect(ctx, 400, 84, 240, 106, t('#6a563e')); poly(ctx, [390, 84, 640, 84, 640, 50, 420, 56], t('#4a3a28'));
  for (let i = 0; i < 3; i++) { const x = 420 + i * 72; rect(ctx, x, 110, 54, 80, '#17120e'); rect(ctx, x, 150, 54, 5, t('#4a3828')); }
  horseSil(v, 448, 190, 44, -1, '#3a2a1e', {});
  rect(ctx, 0, 188, VW, 52, t('#7a6e58')); for (let i = 0; i < 30; i++) stroke(ctx, [hash(i, 1) * VW, 196 + hash(i, 2) * 40, hash(i, 1) * VW + 8, 194 + hash(i, 2) * 40], 0.8, 'rgba(200,180,120,.3)');
  // 우물과 여물통
  rect(ctx, 286, 170, 44, 24, t('#8a8274')); stroke(ctx, [290, 170, 290, 132], 2.4, t('#3a2c20')); stroke(ctx, [326, 170, 326, 132], 2.4, t('#3a2c20')); poly(ctx, [282, 134, 308, 118, 334, 134], t('#4a3a28')); stroke(ctx, [308, 134, 308, 156], 0.8, t('#2a1e16'));
  rect(ctx, 520, 204, 70, 12, t('#4a3828'));
  // 수레와 갈아 매는 말 둘, 마부들
  wagon(v, 200, 222, 1.2, 1); horseSil(v, 300, 224, 56, 1, '#5a3a24', {}); horseSil(v, 392, 228, 58, -1, '#7a6a58', {});
  person(v, 346, 228, 88, mine(v, { f: 1, arm: 'fwd', rim: WARM, rimDir: v.S.dir })); person(v, 452, 232, 84, folk(4, { f: -1, arm: 'fwd', hat: true }));
  person(v, 120, 226, 64, folk(2, { f: 1, child: true, arm: 'chest' })); rect(ctx, 122, 196, 14, 12, t('#5a4030')); // 물통을 든 아이
  person(v, 580, 232, 90, folk(5, { f: -1, old: true, cloak: true, arm: 'chest' }));
  finish(v);
}
/** 짐수레: 고갯길을 넘는 짐 실은 수레와 마부, 멀리 굽은 길 */
function carCart(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true }); const g = (x) => Math.max(fn(x), 146) + 10 + Math.sin(x / 150) * 6; ground(v, g, {});
  // 굽이진 길
  ctx.fillStyle = rgba(t('#a8926a'), 0.85); ctx.beginPath(); ctx.moveTo(110, VH); ctx.quadraticCurveTo(210, 200, 420, 194); ctx.quadraticCurveTo(560, 190, 540, 170); ctx.quadraticCurveTo(520, 160, 470, 158); ctx.lineTo(474, 154); ctx.quadraticCurveTo(580, 160, 590, 178); ctx.quadraticCurveTo(596, 210, 430, 216); ctx.quadraticCurveTo(310, 220, 290, VH); ctx.closePath(); ctx.fill();
  tree(v, 60, 190, 110, {}); tree(v, 610, 200, 80, {}); for (const x of [470, 492]) rect(ctx, x, 146, 3, 9, t('#6a665e')); // 이정석
  // 수레: 밧줄로 묶은 궤짝과 통, 말 두 필
  const cx = 300, cy = 214;
  rect(ctx, cx - 70, cy - 30, 120, 8, t('#4a3626')); for (const k of [-44, 26]) { ctx.strokeStyle = t('#2a1e16'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + k, cy - 12, 15, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * 0.785 + 0.2; stroke(ctx, [cx + k - Math.cos(a) * 15, cy - 12 - Math.sin(a) * 15, cx + k + Math.cos(a) * 15, cy - 12 + Math.sin(a) * 15], 1, t('#2a1e16')); } }
  rect(ctx, cx - 64, cy - 56, 36, 26, t('#6a5038')); rect(ctx, cx - 24, cy - 62, 40, 32, t('#5a4430')); oval(ctx, cx + 32, cy - 44, 12, 15, t('#6a4c30')); rect(ctx, cx - 50, cy - 76, 40, 20, t('#74583c'));
  stroke(ctx, [cx - 66, cy - 30, cx - 46, cy - 78, cx - 8, cy - 78, cx + 46, cy - 30], 1, t('#c8b890')); stroke(ctx, [cx - 6, cy - 62, cx - 6, cy - 30], 1, t('#c8b890'));
  stroke(ctx, [cx + 50, cy - 26, cx + 120, cy - 30], 2.4, t('#3a2c20'));
  horseSil(v, cx + 118, cy, 54, 1, '#5a3a24', {}); horseSil(v, cx + 160, cy + 2, 56, 1, '#3a2a1e', {});
  // 마부(나)는 걸으며 고삐를 쥐었다. 수레 뒤를 미는 짐꾼
  person(v, cx + 84, cy + 8, 96, mine(v, { f: 1, arm: 'fwd', hat: true, rim: WARM, rimDir: v.S.dir }));
  person(v, cx - 92, cy + 6, 86, folk(3, { f: 1, pose: 'bow', arm: 'fwd' }));
  finish(v);
}
/** 눈길: 바퀴가 빠진 수레, 어깨로 미는 마부와 김을 뿜는 말 */
function carSnow(v) {
  const { ctx, t, R } = v; sky(v); const fn = far(v, { peaks: true }); const g = (x) => Math.max(fn(x), 150) + 8 + Math.sin(x / 130) * 5;
  rect(ctx, 0, 112, VW, 70, 'rgba(222,228,232,.6)');
  ground(v, g, { color: '#d9dee0', color2: '#aab4bc', tufts: 30 });
  // 눈 덮인 길의 바퀴 자국과 가문비
  stroke(ctx, [0, 226, 200, 214, 420, 212, 640, 200], 2, 'rgba(110,120,136,.4)'); stroke(ctx, [0, 236, 200, 224, 420, 222, 640, 210], 2, 'rgba(110,120,136,.4)');
  for (const [x, h] of [[70, 110], [130, 80], [560, 120], [610, 90]]) { stroke(ctx, [x, 196, x, 196 - h], 3, t('#2a2018')); for (let i = 0; i < 5; i++) { const y = 196 - h * 0.2 - i * h * 0.16, w = (5 - i) * h * 0.07; poly(ctx, [x - w, y, x, y - h * 0.22, x + w, y], t('#2e4038')); poly(ctx, [x - w * 0.8, y - 2, x, y - h * 0.22, x + w * 0.5, y - h * 0.1], t('#dfe4e6')); } }
  // 기운 수레와 눈에 묻힌 바퀴
  ctx.save(); ctx.translate(330, 214); ctx.rotate(-0.09); rect(ctx, -70, -34, 130, 9, t('#4a3626')); rect(ctx, -62, -62, 44, 28, t('#6a5038')); rect(ctx, -12, -70, 46, 36, t('#5a4430')); poly(ctx, [-66, -62, 38, -70, 44, -76, -70, -68], t('#e4e8ea')); ctx.restore();
  ctx.strokeStyle = t('#2a1e16'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(288, 208, 16, Math.PI, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(366, 198, 16, 0, TAU); ctx.stroke(); oval(ctx, 288, 212, 30, 8, t('#e4e8ea'));
  stroke(ctx, [390, 184, 452, 186], 2.4, t('#3a2c20'));
  horseSil(v, 462, 214, 56, 1, '#5a3a24', {}); for (let i = 0; i < 4; i++) oval(ctx, 506 + i * 7, 166 - i * 4, 4 + i * 2, 3 + i, 'rgba(236,240,244,.4)');
  // 어깨로 미는 나, 말머리를 끄는 동료
  person(v, 246, 222, 96, mine(v, { f: 1, pose: 'bow', arm: 'fwd', cloak: true, hood: true })); person(v, 520, 220, 90, folk(4, { f: -1, arm: 'fwd', cloak: true, hat: true }));
  for (let i = 0; i < 70; i++) oval(ctx, R() * VW, R() * VH, 1 + R(), 1 + R(), 'rgba(244,246,248,.6)');
  finish(v);
}
/** 도적: 쓰러진 나무가 막은 숲길, 멈춘 수레와 나무 사이에서 나오는 사람들 */
function carBandit(v) {
  const { ctx, t } = v; sky(v);
  // 깊은 숲: 줄기들과 어둑한 바닥
  rect(ctx, 0, 0, VW, VH, rgba(t('#1e2a22'), 0.72)); rect(ctx, 0, 176, VW, 64, t('#3a3426'));
  for (let i = 0; i < 16; i++) { const x = hash(i, 1) * VW, w = 8 + hash(i, 2) * 16, d = hash(i, 3); rect(ctx, x, 0, w, 176 + d * 30, t(d > 0.5 ? '#231c16' : '#2e261e')); }
  glow(v, 330, 90, 150, '#c8d0a0', 0.14);
  ctx.fillStyle = rgba(t('#8a7a58'), 0.8); ctx.beginPath(); ctx.moveTo(210, VH); ctx.quadraticCurveTo(300, 200, 322, 176); ctx.lineTo(346, 176); ctx.quadraticCurveTo(390, 200, 460, VH); ctx.fill();
  // 길을 막은 통나무
  ctx.save(); ctx.translate(330, 198); ctx.rotate(-0.06); rect(ctx, -150, -9, 300, 18, t('#3e3024')); rect(ctx, -150, -9, 300, 4, t('#5a4a38')); oval(ctx, 150, 0, 6, 9, t('#8a7454')); for (const x of [-90, -20, 60]) stroke(ctx, [x, -8, x + 10, -30], 2.4, t('#3e3024')); ctx.restore();
  // 멈춘 수레와 뒷걸음치는 말
  wagon(v, 330, 240, 1.25, 1); horseSil(v, 430, 232, 54, 1, '#5a3a24', {});
  person(v, 286, 236, 100, mine(v, { f: 1, arm: 'out', rim: 'rgba(200,208,160,.4)', rimDir: 1 }));
  // 도적들: 나무 뒤에서, 통나무 너머에서
  person(v, 150, 214, 92, { f: 1, cloth: '#2e2a24', hair: '#1c1614', hood: true, cloak: true, arm: 'fwd' }); stroke(ctx, [166, 164, 196, 150], 2.2, t('#8a8e96'));
  person(v, 540, 216, 94, { f: -1, cloth: '#34302a', hair: '#3a2a1e', hood: true, arm: 'up' }); stroke(ctx, [530, 128, 520, 96], 2.4, t('#5a4030')); poly(ctx, [512, 96, 528, 92, 530, 104, 516, 106], t('#6a6e76'));
  person(v, 480, 190, 60, { f: -1, cloth: '#2a2622', hair: '#1c1614', hood: true }); stroke(ctx, [470, 154, 442, 150], 1.4, t('#3a2c20')); stroke(ctx, [442, 136, 442, 164], 1, t('#c8b890')); // 활
  person(v, 600, 190, 56, { f: -1, cloth: '#26221e', hair: '#1c1614', hood: true, cloak: true });
  finish(v, { noLeaves: true });
}

/* ---------- 사교계 ---------- */
/** 연회장: 긴 식탁과 샹들리에, 은식기와 잔, 시중드는 하인들 */
function socFeast(v) {
  const { ctx } = v; room(v, { wall: '#4a3a34', floor: '#2e2420', fy: 170, stone: false });
  for (const x of [70, 250, 430]) { rect(ctx, x, 20, 60, 110, '#141a2e'); rect(ctx, x - 4, 16, 68, 5, '#8a7440'); poly(ctx, [x - 8, 20, x + 12, 20, x + 4, 130, x - 8, 130], '#5a2a36'); poly(ctx, [x + 68, 20, x + 48, 20, x + 56, 130, x + 68, 130], '#5a2a36'); }
  rect(ctx, 560, 30, 60, 80, '#3a2a22'); rect(ctx, 556, 26, 68, 4, '#8a7440'); oval(ctx, 590, 68, 16, 22, '#6a5a4a'); // 초상화
  chandelier(v, 200, 44, 36); chandelier(v, 440, 44, 36);
  // 식탁 뒤에 앉은 손님들
  for (let i = 0; i < 7; i++) person(v, 120 + i * 68, 188, 78, gentry(i, { raw: true, f: i % 2 ? -1 : 1, arm: i % 3 === 0 ? 'fwd' : undefined, cloak: false, rim: GOLD, rimDir: i < 4 ? 1 : -1 }));
  // 긴 식탁: 흰 보, 촛대, 접시와 잔, 구운 고기
  rect(ctx, 70, 164, 500, 12, '#a89e8c'); poly(ctx, [70, 176, 570, 176, 580, 214, 60, 214], '#8e8474'); for (let i = 0; i < 12; i++) stroke(ctx, [90 + i * 42, 178, 86 + i * 43, 212], 0.6, 'rgba(0,0,0,.08)');
  for (let i = 0; i < 8; i++) { const x = 104 + i * 62; oval(ctx, x, 166, 10, 2.6, '#b8b4a8'); goblet(ctx, x + 16, 166); }
  for (const x of [200, 320, 440]) { rect(ctx, x - 1, 146, 2, 18, '#8a7440'); stroke(ctx, [x - 8, 150, x + 8, 150], 1.4, '#8a7440'); for (const k of [-8, 0, 8]) candle(v, x + k, 150 - (k ? 0 : 4), 6); } oval(ctx, 260, 162, 18, 6, '#7a4a2a'); oval(ctx, 380, 162, 14, 5, '#8a6a3a');
  pool(v, 320, 170, 260, 14, '#ffcf80', 0.08);
  // 앞쪽: 등을 보인 손님들과 빈 의자 하나, 술병을 든 하인
  for (let i = 0; i < 5; i++) { const x = 150 + i * 84; if (i === 2) { rect(ctx, x - 16, 172, 32, 60, '#3a2620'); poly(ctx, [x - 18, 172, x, 160, x + 18, 172], '#3a2620'); continue; } person(v, x, 240, 96, gentry(i + 3, { raw: true, f: 0, pose: 'sit', cloak: false })); }
  person(v, 600, 236, 96, { raw: true, f: -1, cloth: '#1e1c22', hair: '#2a1e16', arm: 'fwd' }); rect(ctx, 574, 172, 6, 18, '#3a4a3e');
  person(v, 44, 236, 100, mine(v, { raw: true, f: 1, rim: GOLD, rimDir: 1 })); // 문가에 선 나
  finish(v, { inside: true });
}
/** 살롱: 작은 응접실, 둘러앉은 사람들 앞에서 시를 읽는 사람 */
function socSalon(v) {
  const { ctx } = v; room(v, { wall: '#4e4238', floor: '#33281f', fy: 176, stone: false });
  windowAt(v, 60, 26, 70, 110, { arch: true }); poly(ctx, [50, 22, 76, 22, 66, 150, 50, 150], '#3e5a48'); poly(ctx, [140, 22, 114, 22, 124, 150, 140, 150], '#3e5a48');
  for (const [x, y, w, h] of [[200, 36, 54, 40], [270, 30, 40, 52], [326, 40, 60, 36]]) { rect(ctx, x - 3, y - 3, w + 6, h + 6, '#8a7440'); rect(ctx, x, y, w, h, '#2e3a34'); oval(ctx, x + w / 2, y + h * 0.55, w * 0.28, h * 0.22, '#6a6a4a'); }
  // 벽난로와 시계
  rect(ctx, 440, 70, 130, 106, '#6a5e52'); rect(ctx, 432, 64, 146, 8, '#8a7e70'); ctx.fillStyle = '#140e0c'; ctx.beginPath(); ctx.moveTo(466, 176); ctx.lineTo(466, 120); ctx.quadraticCurveTo(505, 100, 544, 120); ctx.lineTo(544, 176); ctx.fill(); flame(v, 498, 172, 9); flame(v, 514, 173, 7); glow(v, 505, 150, 110, '#ff8a30', 0.3); pool(v, 505, 200, 150, 24, '#ff8a30', 0.2);
  oval(ctx, 505, 52, 9, 11, '#8a7440'); oval(ctx, 505, 52, 6, 8, '#e6dcc0');
  // 깔개와 낮은 탁자, 찻잔
  oval(ctx, 320, 214, 190, 20, '#5a2a36'); oval(ctx, 320, 214, 150, 14, '#6a3a40'); rect(ctx, 290, 196, 60, 6, '#4a3626'); rect(ctx, 316, 202, 8, 16, '#33251a'); for (const x of [302, 336]) { oval(ctx, x, 194, 5, 2, '#d8d0bc'); }
  // 긴 의자와 안락의자에 앉은 사람들
  rect(ctx, 150, 170, 110, 40, '#3e5a48'); rect(ctx, 146, 150, 118, 24, '#34503e');
  person(v, 180, 214, 86, gentry(0, { raw: true, f: 1, pose: 'sit', rim: WARM, rimDir: -1 })); person(v, 232, 214, 86, gentry(3, { raw: true, f: 1, pose: 'sit', arm: 'chest', rim: WARM, rimDir: -1 }));
  rect(ctx, 400, 180, 44, 34, '#5a3a66'); rect(ctx, 432, 156, 14, 58, '#4e3258'); person(v, 414, 218, 86, gentry(1, { raw: true, f: -1, pose: 'sit', old: true, cloak: false }));
  person(v, 560, 232, 98, gentry(4, { raw: true, f: -1, arm: 'chest', rim: WARM, rimDir: 1 }));
  // 가운데 서서 종이를 든 나
  person(v, 372, 204, 96, mine(v, { raw: true, f: -1, arm: 'fwd', rim: WARM, rimDir: -1 })); rect(ctx, 344, 136, 14, 18, '#b8ae94');
  // 하프
  ctx.strokeStyle = '#8a7440'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(96, 220); ctx.lineTo(96, 150); ctx.quadraticCurveTo(120, 140, 136, 164); ctx.lineTo(100, 220); ctx.stroke(); for (let i = 0; i < 6; i++) stroke(ctx, [100 + i * 6, 152 + i * 2.4, 98 + i * 1, 216 - i * 9], 0.5, 'rgba(230,220,180,.6)');
  finish(v, { inside: true });
}
/** 무도: 샹들리에 아래 도는 짝들, 한쪽의 악사들, 벽에 선 사람들 */
function socBall(v) {
  const { ctx } = v; room(v, { wall: '#52463e', floor: '#3a2e26', fy: 166, stone: false });
  for (let i = 0; i < 5; i++) { const x = 40 + i * 130; rect(ctx, x, 10, 40, 120, '#18203a'); ctx.fillStyle = '#18203a'; ctx.beginPath(); ctx.arc(x + 20, 10, 20, Math.PI, 0); ctx.fill(); rect(ctx, x + 19, 0, 2, 130, '#8a7440'); rect(ctx, x + 56, 0, 14, 166, '#6a5e52'); }
  chandelier(v, 320, 50, 50); chandelier(v, 110, 40, 30); chandelier(v, 530, 40, 30);
  // 번들거리는 바닥
  for (let i = 0; i < 8; i++) stroke(ctx, [0, 172 + i * i * 1.1, VW, 172 + i * i * 1.1], 0.6, 'rgba(255,220,160,.08)'); pool(v, 320, 204, 240, 30, '#ffcf80', 0.16);
  // 악사들 (왼쪽 단 위)
  rect(ctx, 0, 160, 110, 10, '#4a3626'); person(v, 30, 162, 60, { raw: true, f: 1, cloth: '#22202a', hair: '#2a1e16', pose: 'sit', arm: 'fwd' }); person(v, 70, 162, 62, { raw: true, f: 1, cloth: '#22202a', hair: '#6a4a2a', arm: 'fwd' }); stroke(ctx, [80, 122, 96, 112], 3, '#7a4a2a'); stroke(ctx, [76, 128, 100, 116], 0.8, '#d8d0c0');
  // 벽에 선 사람들
  for (let i = 0; i < 6; i++) person(v, 150 + i * 80 + hash(i, 1) * 20, 172, 62, gentry(i + 1, { raw: true, f: i % 2 ? -1 : 1, cloak: false }));
  // 도는 짝들: 가까운 쪽이 크다
  const pair = (x, y, h, i, me) => { person(v, x - h * 0.13, y, h, me ? mine(v, { raw: true, f: 1, arm: 'fwd', rim: GOLD, rimDir: 1 }) : gentry(i * 2 + 1, { raw: true, f: 1, arm: 'fwd', cloak: false, female: false, long: false, robe: false, rim: GOLD, rimDir: 1 })); person(v, x + h * 0.13, y, h * 0.96, gentry(i * 2, { raw: true, f: -1, arm: 'fwd', female: true, long: true, robe: true, rim: GOLD, rimDir: -1 })); };
  pair(210, 198, 70, 1); pair(440, 196, 68, 2); pair(540, 216, 84, 0); pair(130, 222, 88, 3); pair(330, 236, 104, 4, true);
  finish(v, { inside: true });
}
/** 망신: 쏟아진 잔과 돌아선 등들, 부채 뒤의 귓속말. 한가운데 홀로 선 사람 */
function socShame(v) {
  const { ctx } = v; room(v, { wall: '#463a34', floor: '#2e2420', fy: 170, stone: false });
  for (const x of [90, 500]) { rect(ctx, x, 16, 50, 116, '#141a2e'); poly(ctx, [x - 8, 12, x + 10, 12, x + 2, 140, x - 8, 140], '#5a2a36'); poly(ctx, [x + 58, 12, x + 40, 12, x + 48, 140, x + 58, 140], '#5a2a36'); }
  rect(ctx, 270, 20, 100, 150, '#2a201c'); rect(ctx, 264, 14, 112, 6, '#8a7440'); rect(ctx, 318, 20, 2, 150, '#1a1410'); // 닫힌 큰 문
  chandelier(v, 320, 40, 44);
  pool(v, 320, 214, 110, 18, '#ffcf80', 0.2);
  // 양옆으로 물러선 사람들: 등을 돌리거나 부채로 입을 가렸다
  const fan = (x, y) => { ctx.fillStyle = '#cfc4a8'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 12, -2.3, -0.8); ctx.closePath(); ctx.fill(); };
  for (let i = 0; i < 4; i++) { const x = 50 + i * 52, h = 84 + (i % 2) * 8; person(v, x, 206 + i * 6, h, gentry(i, { raw: true, f: i === 1 ? 0 : 1, cloak: false, arm: i % 2 === 0 ? 'chest' : undefined })); if (i % 2 === 0) fan(x + 9, 206 + i * 6 - h * 0.78); }
  for (let i = 0; i < 4; i++) { const x = 590 - i * 52, h = 84 + (i % 2) * 8; person(v, x, 206 + i * 6, h, gentry(i + 2, { raw: true, f: i === 2 ? 0 : -1, cloak: false, arm: i % 2 ? 'chest' : undefined })); if (i % 2) fan(x - 9, 206 + i * 6 - h * 0.78); }
  // 서로 귀에 대고 말하는 둘
  person(v, 232, 190, 66, gentry(5, { raw: true, f: 1, cloak: false })); person(v, 252, 190, 64, gentry(0, { raw: true, f: -1, cloak: false }));
  // 바닥의 깨진 잔과 쏟아진 포도주
  oval(ctx, 356, 226, 26, 6, '#5a1a26'); goblet(ctx, 372, 228); stroke(ctx, [344, 224, 350, 220], 1.4, '#b8a060');
  // 홀로 선 나, 등을 돌리고 문으로 가는 주인
  person(v, 320, 232, 104, mine(v, { raw: true, f: 1, pose: 'bow', rim: GOLD, rimDir: -1 }));
  person(v, 400, 196, 76, { raw: true, f: 0, cloth: '#22202a', hair: '#8a8478', old: true, cloak: true });
  finish(v, { inside: true });
}

export const PLATES15 = {
  /** 점령지. variant: banner(점령군 깃발) levy(징발) night(밤의 저항) free(해방의 날) */
  occupied(v) { const k = v.variant ?? 'banner'; return ({ levy: occLevy, night: occNight, free: occFree }[k] ?? occBanner)(v); },
  /** 길 위의 일. variant: yard(역참 마당) cart(짐수레) snow(눈길) bandit(도적) */
  carrier(v) { const k = v.variant ?? 'cart'; return ({ yard: carYard, snow: carSnow, bandit: carBandit }[k] ?? carCart)(v); },
  /** 사교계. variant: feast(연회장) salon(살롱) ball(무도) shame(망신) */
  society(v) { const k = v.variant ?? 'feast'; return ({ salon: socSalon, ball: socBall, shame: socShame }[k] ?? socFeast)(v); },
};
