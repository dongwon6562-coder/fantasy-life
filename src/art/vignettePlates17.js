// 38단계 삽화: 삶의 큰 사건 다섯을 새로 그렸다.
// 출생(birth), 혼례(wedding), 죽음(funeral), 전쟁(muster), 대 잇기(bedside:last).
// 판 이름은 그대로 두고 기본 그림만 바꾼다. 다른 variant(far, fever, visit, refugee…)는 옛 판이 그대로 그린다.
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, crowd, lying, tree, banner, crows, sunSign, finish } from './vignetteKit.js';
import { PLATES as PLATES1 } from './vignettePlates.js';
import { horseSil } from './vignettePlates4.js';
import { spear, torch } from './vignettePlates5.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,190,110,.6)', COLD = 'rgba(190,210,240,.45)', GOLD = 'rgba(255,224,160,.55)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const mourner = (i, o = {}) => ({ cloth: ['#1e1c22', '#24202a', '#1a1a1e'][i % 3], hair: HR[i % 6], female: i % 2 === 0, long: i % 2 === 0, cloak: true, hood: i % 3 !== 1, ...o });

/** 출생: 새벽의 산실. 아기를 받아 든 어미, 곁에 무릎 꿇은 아비, 물을 치우는 산파 */
function birth(v) {
  const { ctx } = v; const me = v.me, ot = v.other, mom = me.female ? me : ot, dad = me.female ? ot : me;
  room(v, { stone: false, wall: '#4a3a2c', floor: '#33271d', fy: 174 });
  rect(ctx, 0, 0, VW, 12, '#241a12'); for (const x of [150, 330, 510]) rect(ctx, x, 0, 12, 20, '#1e160f');
  // 창: 새벽빛이 침상으로 떨어진다
  windowAt(v, 130, 36, 56, 66, {}); shaft(v, 130, 102, 56, 130, 150, '#cfd8e6', 0.12);
  // 벽난로와 걸어 둔 솥
  rect(ctx, 500, 60, 120, 114, '#5a5046'); rect(ctx, 492, 52, 136, 10, '#746a5e');
  ctx.fillStyle = '#120e0c'; ctx.beginPath(); ctx.moveTo(526, 174); ctx.lineTo(526, 118); ctx.quadraticCurveTo(560, 92, 594, 118); ctx.lineTo(594, 174); ctx.fill();
  stroke(ctx, [560, 100, 560, 130], 1.4, '#17120e'); oval(ctx, 560, 138, 14, 10, '#1e1814');
  flame(v, 550, 172, 11); flame(v, 566, 173, 8); glow(v, 558, 150, 96, '#ff8a30', 0.26); pool(v, 556, 196, 150, 22, '#ff8a30', 0.16);
  // 선반의 약초 다발과 벽의 해 표
  rect(ctx, 250, 44, 120, 4, '#2a2018'); for (let i = 0; i < 5; i++) { stroke(ctx, [264 + i * 22, 48, 264 + i * 22, 58], 0.8, '#2a2018'); oval(ctx, 264 + i * 22, 64, 4, 8, ['#5a6a44', '#6a5a3c', '#4e5e40', '#7a6a44', '#5a6a44'][i]); }
  sunSign(v, 420, 46, 9, '#8a7440');
  // 침상: 머리판과 휘장, 베개에 기대앉은 어미
  rect(ctx, 150, 96, 12, 108, '#2e2218'); rect(ctx, 150, 96, 250, 8, '#2e2218'); poly(ctx, [162, 104, 210, 104, 176, 170, 162, 172], '#5a3038'); poly(ctx, [400, 104, 360, 104, 392, 150, 400, 150], '#4a2830');
  rect(ctx, 160, 168, 250, 14, '#3a2a1e'); rect(ctx, 400, 150, 12, 54, '#2e2218'); rect(ctx, 166, 182, 240, 22, '#241a12');
  poly(ctx, [170, 122, 202, 114, 214, 166, 178, 172], '#cfc6b0'); poly(ctx, [170, 122, 180, 120, 190, 170, 178, 172], '#b4aa94');
  // 이불
  ctx.fillStyle = '#8e846e'; ctx.beginPath(); ctx.moveTo(214, 168); ctx.quadraticCurveTo(270, 140, 330, 150); ctx.quadraticCurveTo(390, 152, 408, 168); ctx.lineTo(408, 186); ctx.lineTo(214, 186); ctx.fill();
  for (let i = 0; i < 5; i++) stroke(ctx, [240 + i * 34, 156 - (i % 2) * 3, 248 + i * 34, 184], 0.8, 'rgba(0,0,0,.14)');
  // 어미: 윗몸을 세우고 아기를 안았다
  person(v, 218, 198, 116, { raw: true, f: 1, cloth: '#d8ceb8', hair: mom.hair, female: true, long: true, pose: 'sit', arm: 'chest', rim: COLD, rimDir: -1, noShadow: true });
  oval(ctx, 240, 154, 14, 9, '#e8dfca', -0.3); oval(ctx, 250, 148, 5.4, 5.4, '#d8a88c'); glow(v, 242, 150, 38, '#fff0d0', 0.2);
  ctx.fillStyle = '#8e846e'; ctx.beginPath(); ctx.moveTo(214, 186); ctx.lineTo(214, 170); ctx.quadraticCurveTo(250, 162, 300, 162); ctx.lineTo(408, 168); ctx.lineTo(408, 186); ctx.fill(); rect(ctx, 166, 184, 240, 20, '#241a12');
  // 아비: 침상 곁에 무릎을 꿇고 손을 얹었다
  person(v, 330, 232, 104, { raw: true, f: -1, cloth: dad.cloth, hair: dad.hair, pose: 'kneel', arm: 'fwd', rim: WARM, rimDir: 1 });
  // 산파: 대야와 수건
  person(v, 452, 226, 96, { raw: true, f: 1, cloth: '#5a5248', hair: '#b8b4ac', female: true, old: true, arm: 'fwd', rim: WARM, rimDir: 1 });
  oval(ctx, 486, 176, 16, 5, '#6a6258'); rect(ctx, 472, 170, 28, 6, '#6a6258'); poly(ctx, [470, 168, 488, 166, 492, 186, 476, 190], '#d8d0bc');
  // 문틈으로 들여다보는 큰아이, 빈 요람
  rect(ctx, 40, 70, 46, 110, '#1a130e'); rect(ctx, 34, 64, 6, 116, '#2e2218'); person(v, 70, 184, 58, folk(2, { raw: true, f: 1, child: true }));
  poly(ctx, [84, 212, 136, 212, 130, 232, 90, 232], '#4a3626'); stroke(ctx, [82, 236, 110, 240, 138, 236], 3, '#3a2a1e'); poly(ctx, [84, 212, 96, 192, 110, 212], '#4a3626');
  candle(v, 426, 150, 9); glow(v, 426, 136, 44, '#ffcf80', 0.2);
  finish(v, { inside: true });
}

/** 혼례: 예배당 안. 해 창 아래 제단 앞에 마주 선 두 사람, 양쪽 긴 걸상의 하객 */
function wedding(v) {
  const { ctx, R } = v; const a = v.me, b = v.other, bride = a.female ? a : b, groom = a.female ? b : a;
  room(v, { wall: '#575048', floor: '#3a342e', fy: 168 });
  // 기둥과 둥근 천장 그늘
  for (const x of [96, 544]) { rect(ctx, x - 14, 0, 28, 168, '#6a6258'); rect(ctx, x - 18, 150, 36, 18, '#5a5248'); rect(ctx, x - 14, 0, 7, 168, 'rgba(0,0,0,.2)'); }
  for (const x of [200, 440]) windowAt(v, x, 26, 34, 92, { arch: true });
  // 해 창과 빛줄기
  ctx.fillStyle = '#1a1512'; ctx.beginPath(); ctx.arc(320, 46, 36, 0, TAU); ctx.fill(); ctx.fillStyle = '#f2e2b4'; ctx.beginPath(); ctx.arc(320, 46, 31, 0, TAU); ctx.fill();
  for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; stroke(ctx, [320 + Math.cos(an) * 10, 46 + Math.sin(an) * 10, 320 + Math.cos(an) * 31, 46 + Math.sin(an) * 31], 2, '#1a1512'); } ctx.strokeStyle = '#1a1512'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(320, 46, 10, 0, TAU); ctx.stroke(); oval(ctx, 320, 46, 6, 6, '#e8b860');
  glow(v, 320, 46, 80, '#ffe6a8', 0.3); shaft(v, 320, 80, 60, 150, 0, '#ffe6a8', 0.14);
  // 제단과 촛대, 사제
  rect(ctx, 262, 132, 116, 36, '#8a8072'); rect(ctx, 256, 126, 128, 8, '#a89e8c'); rect(ctx, 290, 134, 60, 34, '#6a2a36'); sunSign(v, 320, 151, 8, '#c8a850');
  for (const x of [268, 372]) { rect(ctx, x - 1, 104, 2, 22, '#8a7440'); candle(v, x, 104, 8); glow(v, x, 92, 30, '#ffcf80', 0.24); }
  person(v, 320, 170, 62, { raw: true, f: 0, cloth: '#e4dcc8', hair: '#8a8478', robe: true, arm: 'up', noShadow: true });
  // 꽃줄
  for (const [x0, x1] of [[110, 256], [384, 530]]) { ctx.strokeStyle = '#4e6a44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, 96); ctx.quadraticCurveTo((x0 + x1) / 2, 126, x1, 100); ctx.stroke(); for (let i = 1; i < 7; i++) { const u = i / 7, x = x0 + (x1 - x0) * u, y = 96 + (100 - 96) * u + Math.sin(u * Math.PI) * 14; oval(ctx, x, y, 3.4, 3, i % 2 ? '#e8dcd0' : '#c88a8a'); } }
  // 가운데 길의 깔개와 흩뿌린 꽃잎
  poly(ctx, [296, 168, 344, 168, 400, 240, 240, 240], '#5a2630'); poly(ctx, [300, 168, 306, 168, 262, 240, 250, 240], '#8a7440'); poly(ctx, [334, 168, 340, 168, 390, 240, 378, 240], '#8a7440');
  for (let i = 0; i < 40; i++) oval(ctx, 262 + R() * 116, 176 + R() * 60, 1.6, 1, R() < 0.5 ? '#f0e4dc' : '#d89a9a');
  // 신랑과 신부: 손을 맞잡았다
  person(v, 292, 204, 84, { raw: true, f: 1, cloth: dark(groom.cloth, 0.3), hair: groom.hair, arm: 'fwd', cloak: true, rim: GOLD, rimDir: 1 });
  person(v, 348, 204, 80, { raw: true, f: -1, cloth: '#e8e0d0', hair: bride.hair, female: true, long: true, veil: true, arm: 'fwd', rim: GOLD, rimDir: -1 });
  oval(ctx, 320, 156, 4, 3, '#d8a88c'); pool(v, 320, 208, 80, 12, '#ffe6a8', 0.16);
  // 양쪽 걸상의 하객 (등을 보인다): 뒤로 올수록 크다
  for (let r = 0; r < 3; r++) {
    const y = 196 + r * 22, h = 62 + r * 18, n = 3;
    for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
      const x = 320 + side * (96 + r * 22 + i * (40 + r * 8)); const k = r * 7 + i * 2 + (side > 0 ? 1 : 0);
      person(v, x, y, h, { raw: true, f: 0, cloth: dark(CL[k % 6], 0.2), hair: HR[k % 6], female: k % 2 === 0, long: k % 2 === 0, hat: k % 5 === 0, child: r === 0 && i === 2, noShadow: true, rim: GOLD, rimDir: -side });
    }
    for (const side of [-1, 1]) rect(ctx, side < 0 ? 320 - (96 + r * 22) - (n - 1) * (40 + r * 8) - 24 : 320 + 96 + r * 22 - 24, y - h * 0.42, (n - 1) * (40 + r * 8) + 48, 7 + r * 2, '#2e2218');
  }
  finish(v, { inside: true });
}

/** 죽음: 잿빛 저녁의 언덕 묘지. 관을 멘 사람들과 횃불, 열린 무덤과 앙상한 나무 */
function funeral(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {}); townFar(v, 110, 140, {});
  // 언덕: 왼쪽 아래에서 오른쪽 위로 오르는 길
  const g = (x) => Math.max(fn(x), 132) + 44 - x * 0.07 + Math.sin(x / 90) * 4; ground(v, g, { color: '#6a6e52', color2: '#44483a', tufts: 90 });
  ctx.fillStyle = rgba(t('#8a7e62'), 0.7); ctx.beginPath(); ctx.moveTo(0, 226); ctx.quadraticCurveTo(220, 214, 420, 176); ctx.lineTo(430, 184); ctx.quadraticCurveTo(240, 228, 0, 240); ctx.fill();
  // 언덕 위의 고목과 까마귀, 묘비들
  tree(v, 520, g(520) + 4, 150, { bare: true, dark: true }); crows(v, 500, 40, 5, 70);
  for (const [x, s] of [[388, 1], [452, 0.8], [586, 1.1], [614, 0.7], [350, 0.6]]) { const y = g(x) + 4; rect(ctx, x - 6 * s, y - 20 * s, 12 * s, 20 * s, t('#7a7870')); ctx.fillStyle = t('#7a7870'); ctx.beginPath(); ctx.arc(x, y - 20 * s, 6 * s, Math.PI, 0); ctx.fill(); rect(ctx, x - 6 * s, y - 20 * s, 3 * s, 20 * s, 'rgba(0,0,0,.2)'); }
  // 열린 무덤과 흙더미, 꽂힌 삽
  const gx = 470, gy = g(470) + 20; oval(ctx, gx, gy, 46, 9, '#0e0b0a'); oval(ctx, gx + 62, gy - 2, 30, 10, t('#4a3e30')); oval(ctx, gx + 58, gy - 8, 20, 8, t('#54463a')); stroke(ctx, [gx + 86, gy - 2, gx + 92, gy - 40], 2, t('#2a2018')); rect(ctx, gx + 88, gy - 46, 8, 8, t('#6a6e76'));
  // 무덤가의 사제와 유족
  person(v, gx - 8, gy - 8, 70, { f: -1, cloth: '#d8d0c0', hair: '#8a8478', robe: true, arm: 'out', stick: 'crook' });
  person(v, gx + 30, gy - 10, 64, mourner(0, { f: -1, veil: true, hood: false, arm: 'chest' })); person(v, gx + 50, gy - 8, 40, mourner(1, { f: -1, child: true, hood: false, cloak: false }));
  // 운구: 넷이 멘 관과 덮은 천
  const cx = 250, cy = 214;
  for (const [dx, i] of [[-46, 0], [-16, 1], [22, 2], [52, 3]]) person(v, cx + dx, cy + (i % 2) * 4, 86, mourner(i + 1, { f: 1, hood: i % 2 === 0, arm: 'up', female: false, long: false }));
  poly(ctx, [cx - 62, cy - 92, cx + 66, cy - 104, cx + 70, cy - 90, cx - 58, cy - 78], t('#2a2018')); poly(ctx, [cx - 50, cy - 94, cx + 56, cy - 104, cx + 60, cy - 84, cx - 46, cy - 74], t('#5a2630')); stroke(ctx, [cx - 20, cy - 90, cx + 26, cy - 94], 1.6, t('#c8a850')); stroke(ctx, [cx + 3, cy - 98, cx + 3, cy - 84], 1.6, t('#c8a850'));
  // 앞선 횃불잡이와 뒤따르는 사람들
  person(v, 358, 200, 76, mourner(2, { f: 1, hood: true })); torch(v, 372, 162, 30, 6); glow(v, 372, 128, 46, '#ff9a40', 0.3);
  for (let i = 0; i < 5; i++) person(v, 150 - i * 30, 224 + (i % 2) * 6, 90 + i * 3, mourner(i, { f: 1, pose: i % 2 ? 'bow' : 'stand', child: i === 3 }));
  // 맨 앞: 지켜보는 나
  person(v, 600, 240, 108, { f: -1, cloth: dark(v.me.cloth, 0.4), hair: v.me.hair, female: v.me.female, long: v.me.long, cloak: true, pose: 'bow', arm: 'chest', rim: 'rgba(255,170,110,.3)' });
  finish(v, { noLeaves: true });
}

/** 전쟁: 출정하는 새벽. 창 숲과 깃발, 말 탄 기사들, 성문 앞에서 갈라서는 식구 */
function muster(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, { peaks: true });
  const g = (x) => Math.max(fn(x), 140) + 16 + Math.sin(x / 110) * 4; ground(v, g, { color: '#6e7052', color2: '#484a38', tufts: 80 });
  // 성벽과 성문 (왼쪽)
  rect(ctx, 0, 60, 170, 130, t('#6e685e')); for (let i = 0; i < 6; i++) rect(ctx, i * 30, 48, 18, 14, t('#6e685e')); rect(ctx, 150, 30, 60, 160, t('#7a7468')); for (let i = 0; i < 3; i++) rect(ctx, 150 + i * 22, 18, 14, 14, t('#7a7468'));
  ctx.fillStyle = t('#1a1512'); ctx.beginPath(); ctx.moveTo(160, 190); ctx.lineTo(160, 120); ctx.arc(180, 120, 20, Math.PI, 0); ctx.lineTo(200, 190); ctx.fill(); for (let i = 0; i < 5; i++) stroke(ctx, [10 + i * 30, 76 + (i % 2) * 20, 22 + i * 30, 76 + (i % 2) * 20], 1, 'rgba(0,0,0,.2)');
  banner(v, 180, 18, 44, '#8a2f2a', { mark: '#d8b04a' });
  // 길: 성문에서 골짜기로
  ctx.fillStyle = rgba(t('#9a8a66'), 0.8); ctx.beginPath(); ctx.moveTo(150, 240); ctx.quadraticCurveTo(190, 200, 200, 190); ctx.lineTo(214, 188); ctx.quadraticCurveTo(360, 180, 640, 168); ctx.lineTo(640, 190); ctx.quadraticCurveTo(400, 200, 300, 240); ctx.fill();
  // 멀어지는 대열: 창과 깃발의 숲
  for (let r = 0; r < 34; r++) { const u = r / 34, x = 620 - u * 380 + hash(r, 1) * 8, y = 176 + u * 20 + hash(r, 2) * 6, h = 30 + u * 34; person(v, x, y, h, { f: 1, cloth: ['#5a5e68', '#4e525c', '#64605a'][r % 3], hair: '#1c1614', hat: true, noShadow: u < 0.5 }); stroke(ctx, [x + h * 0.12, y - h * 0.5, x + h * 0.16, y - h * 1.5], Math.max(0.8, h * 0.02), t('#2a2018')); }
  for (const [x, h, c] of [[590, 70, '#8a2f2a'], [500, 84, '#2f4a73'], [400, 100, '#8a2f2a'], [316, 112, '#6a5a2a']]) banner(v, x, 176 + (640 - x) * 0.05, h, c, { mark: '#d8b04a' });
  // 말 탄 기사 둘 (가까이)
  for (const [x, y, hh, coat] of [[330, 224, 86, '#2a2018'], [420, 214, 72, '#5a3a24']]) { person(v, x - hh * 0.1, y - hh * 0.42, hh * 0.84, { f: 1, cloth: '#8a8e96', hair: '#1c1614', hat: true, cloak: true, noShadow: true, rim: 'rgba(255,220,170,.5)' }); horseSil(v, x, y, hh, 1, coat, {}); stroke(ctx, [x - hh * 0.1, y - hh * 0.74, x - hh * 0.05, y - hh * 0.5, x - hh * 0.07, y - hh * 0.36], hh * 0.07, t('#5a5e68')); stroke(ctx, [x - hh * 0.07, y - hh * 0.36, x - hh * 0.01, y - hh * 0.35], hh * 0.06, t('#2a2018')); spear(v, x + hh * 0.12, y - hh * 0.7, hh * 1.1, 0.1); }
  // 앞쪽: 떠나는 병사를 붙든 아내와 다리에 매달린 아이, 뒤돌아보는 늙은 아비
  const m = v.me;
  person(v, 96, 236, 104, { f: 1, cloth: '#5a5e68', hair: m.female ? '#3a2a1e' : m.hair, arm: 'fwd', cloak: true, rim: 'rgba(255,220,170,.5)' }); spear(v, 116, 236, 130, 0.04);
  person(v, 60, 238, 98, { f: 1, cloth: m.female ? m.cloth : '#6a3a3a', hair: m.female ? m.hair : '#6a4a2a', female: true, long: true, arm: 'fwd' });
  person(v, 122, 238, 54, folk(2, { f: -1, child: true, arm: 'fwd' }));
  person(v, 22, 236, 92, folk(5, { f: 1, old: true, hair: '#b8b4ac', stick: 'staff' }));
  // 성벽 위에서 지켜보는 사람들
  for (let i = 0; i < 4; i++) person(v, 20 + i * 34, 62, 26, folk(i, { f: 1, noShadow: true }));
  finish(v);
}

/** 대 잇기: 촛불의 임종. 반지 낀 손을 쥔 후계자, 둘러선 식구와 사제, 벽에 걸린 집안의 검 */
function lastBed(v) {
  const { ctx } = v; const m = v.me, o = v.other;
  room(v, { stone: false, wall: '#3e3026', floor: '#2a2018', fy: 172 });
  rect(ctx, 0, 0, VW, 12, '#1e160f');
  windowAt(v, 560, 40, 46, 70, {}); if (v.S.tod !== 'night') shaft(v, 560, 110, 46, 110, -110, v.S.lit, 0.1);
  // 벽의 검과 문장 방패
  stroke(ctx, [52, 104, 126, 40], 3, '#9a9ea6'); stroke(ctx, [56, 90, 70, 104], 4, '#8a7440'); oval(ctx, 49, 107, 3.4, 3.4, '#8a7440');
  poly(ctx, [70, 44, 110, 44, 110, 72, 90, 90, 70, 72], '#4a2a30'); ctx.strokeStyle = '#8a7440'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(70, 44); ctx.lineTo(110, 44); ctx.lineTo(110, 72); ctx.lineTo(90, 90); ctx.lineTo(70, 72); ctx.closePath(); ctx.stroke(); sunSign(v, 90, 64, 7, '#c8a850');
  // 침상: 높은 머리판과 걷어 묶은 휘장
  rect(ctx, 150, 70, 14, 140, '#241a12'); rect(ctx, 150, 62, 300, 10, '#241a12'); rect(ctx, 438, 62, 12, 148, '#241a12');
  poly(ctx, [164, 72, 214, 72, 184, 150, 164, 160], '#4a2830'); poly(ctx, [438, 72, 396, 72, 424, 140, 438, 150], '#4a2830'); for (let i = 0; i < 14; i++) rect(ctx, 166 + i * 20, 72, 12, 6, i % 2 ? '#5a3038' : '#4a2830');
  rect(ctx, 160, 166, 284, 14, '#33251a'); rect(ctx, 166, 180, 272, 30, '#1e160f');
  poly(ctx, [184, 142, 236, 132, 244, 160, 190, 168], '#cfc6b0'); poly(ctx, [184, 142, 190, 168, 200, 166, 194, 141], '#b4aa94');
  ctx.fillStyle = '#8a8070'; ctx.beginPath(); ctx.moveTo(232, 166); ctx.quadraticCurveTo(300, 142, 380, 150); ctx.quadraticCurveTo(430, 154, 440, 166); ctx.lineTo(440, 184); ctx.lineTo(232, 184); ctx.fill();
  for (let i = 0; i < 6; i++) stroke(ctx, [256 + i * 30, 156 - (i % 2) * 3, 262 + i * 30, 182], 0.8, 'rgba(0,0,0,.16)');
  // 누운 어른: 흰 머리, 이불 위로 내민 손
  oval(ctx, 214, 144, 9, 9, '#c0a088'); ctx.fillStyle = '#b8b4ac'; ctx.beginPath(); ctx.arc(210, 142, 9.4, Math.PI * 0.6, Math.PI * 1.9); ctx.fill();
  stroke(ctx, [250, 160, 286, 168], 5, '#b8ad96'); oval(ctx, 290, 169, 3.6, 3, '#c0a088'); oval(ctx, 291, 168, 1.6, 1.6, '#e8c860');
  // 머리맡 촛대
  rect(ctx, 176, 108, 2, 40, '#8a7440'); candle(v, 177, 108, 10); glow(v, 177, 92, 70, '#ffcf80', 0.26); pool(v, 250, 160, 90, 22, '#ffcf80', 0.12);
  // 후계자(나): 침상 곁에 무릎 꿇고 그 손을 두 손으로 쥐었다
  person(v, 318, 234, 108, { raw: true, f: -1, cloth: m.cloth, hair: m.hair, female: m.female, long: m.long, pose: 'kneel', arm: 'fwd', rim: WARM, rimDir: -1 });
  // 발치의 식구들: 배우자, 아이, 늙은 종
  person(v, 470, 226, 96, { raw: true, f: -1, cloth: dark(o.cloth, 0.2), hair: o.hair, female: !m.female, long: !m.female, arm: 'chest', rim: WARM, rimDir: -1 });
  person(v, 512, 230, 60, folk(2, { raw: true, f: -1, child: true })); person(v, 560, 232, 90, folk(5, { raw: true, f: -1, old: true, hair: '#b8b4ac', pose: 'bow' }));
  // 사제: 침상 머리 쪽에서 손을 들었다
  person(v, 110, 228, 100, { raw: true, f: 1, cloth: '#d8d0c0', hair: '#8a8478', robe: true, arm: 'out', rim: WARM, rimDir: 1 });
  // 문가의 그림자들
  rect(ctx, 14, 60, 44, 114, '#120d0a'); rect(ctx, 8, 54, 6, 120, '#241a12'); person(v, 38, 178, 70, { raw: true, f: 1, cloth: '#1c1712', hair: '#3a2a1e', female: true, long: true, arm: 'chest', noShadow: true });
  finish(v, { inside: true });
}

export const PLATES17 = {
  birth(v) { return v.variant ? PLATES1.birth(v) : birth(v); },
  wedding(v) { return v.variant ? PLATES1.wedding(v) : wedding(v); },
  funeral(v) { return v.variant ? PLATES1.funeral(v) : funeral(v); },
  muster(v) { return v.variant ? PLATES1.muster(v) : muster(v); },
  bedside(v) { return v.variant === 'last' ? lastBed(v) : PLATES1.bedside(v); },
};
