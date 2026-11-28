// 49단계 삽화: 경비대와 치안(watch), 해적과 바다의 무법자(pirates), 새 교단과 종교 개혁(sect). 25판과 같은 도구·같은 결로 그린다.
// 등급 선: 피와 주검 없음. 배끼리 붙는 싸움은 갈고리 줄·연기·칼을 든 실루엣까지, 이단 심문은 높은 책상과 무릎 꿇은 사람까지.
import { hash } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, room, windowAt, glow, flame, candle, smoke, person, crowd, banner, finish } from './vignetteKit.js';
import { torch, spear, wagon } from './vignettePlates5.js';
import { seaAt } from './vignettePlates11.js';
import { rowHouse, lamp, steps } from './vignettePlates23.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const arch = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h + w / 2); ctx.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y); ctx.fill(); };
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const WATCH_CLOTH = '#3a4a5e', WATCH_TABARD = '#8a2e26';
// 경비대원: 짙은 푸른 옷에 붉은 겉옷 띠, 미늘창
const watchman = (v, x, y, h, o = {}) => { person(v, x, y, h, { cloth: WATCH_CLOTH, hair: HR[(o.i ?? 0) % 6], hat: true, ...o }); const s = h / 100, d = o.f || 1; rect(v.ctx, x - 5 * s, y - 62 * s, 10 * s, 26 * s, v.t(WATCH_TABARD)); if (!o.noSpear) spear(v, x + d * 14 * s, y, h * 1.15, d * 0.05); };
const paper = (ctx, x, y, w = 14, h = 18, c = '#e0d6bc') => { rect(ctx, x, y, w, h, c); oval(ctx, x + w / 2, y + h * 0.36, w * 0.22, h * 0.16, 'rgba(40,30,20,.55)'); for (let j = 0; j < 3; j++) stroke(ctx, [x + 2, y + h * 0.62 + j * 2.4, x + w - 2, y + h * 0.62 + j * 2.4], 0.4, 'rgba(40,30,20,.5)'); };

// ───────── 경비대와 치안 ─────────
/** 밤 순찰: 젖은 돌길, 처마마다 꺼진 창, 등불을 든 나와 미늘창을 멘 동료 */
function wtPatrol(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 320, 136, {});
  ground(v, () => 184, { color: '#4a463e', color2: '#2a2824', tufts: 0 });
  for (let i = 0; i < 18; i++) stroke(ctx, [hash(i, 7) * VW, 196 + hash(i, 8) * 40, hash(i, 7) * VW + 18, 196 + hash(i, 8) * 40], 0.6, 'rgba(200,190,170,.18)');
  rowHouse(v, 0, 150, 60, 184, '#4a4036', { roof: '#2e2620' }); rowHouse(v, 470, 170, 70, 184, '#463e34', { roof: '#2e2620' });
  rowHouse(v, 160, 110, 96, 184, '#3e3830', { roof: '#2a221c' });
  for (const [x, y, l] of [[40, 100, false], [100, 120, true], [500, 110, false], [560, 92, false], [190, 128, false]]) windowAt(v, x, y, 14, 16, { lit: l });
  lamp(v, 300, 140, 0.32); stroke(ctx, [300, 140, 300, 186], 2, '#1c1814'); lamp(v, 440, 132, 0.26); stroke(ctx, [440, 132, 440, 186], 2, '#1c1814');
  oval(ctx, 300, 200, 40, 6, 'rgba(255,190,110,.12)');
  watchman(v, 400, 226, 90, { f: -1, i: 2 });
  person(v, 330, 240, 104, mine(v, { f: -1, arm: 'fwd', cloth: WATCH_CLOTH, rim: 'rgba(255,180,100,.5)', rimDir: -1 }));
  rect(ctx, 326 - 30, 240 - 74, 8, 10, '#2a2018'); oval(ctx, 300, 168, 3, 3.6, '#ffd890'); glow(v, 300, 170, 60, '#ffb060', 0.35);
  person(v, 120, 214, 62, folk(3, { f: 1, hood: true })); // 골목 끝 그림자
  finish(v, {});
}
/** 성문 지키기: 쇠살문이 걸린 돌 성문 아래 짐마차, 짐을 들추는 동료와 통행증을 받는 나 */
function wtGate(v) {
  const { ctx } = v; sky(v); far(v, {});
  ground(v, () => 182, { color: '#6a5e48', color2: '#40382c', tufts: 3 });
  rect(ctx, 120, 30, 400, 156, '#7a7062'); for (let r = 0; r < 7; r++) for (let c = 0; c < 10; c++) stroke(ctx, [120 + c * 40 + (r % 2) * 20, 30 + r * 22, 120 + c * 40 + (r % 2) * 20, 52 + r * 22], 0.6, 'rgba(40,34,28,.35)');
  for (let r = 0; r < 7; r++) stroke(ctx, [120, 52 + r * 22, 520, 52 + r * 22], 0.6, 'rgba(40,34,28,.35)');
  for (let i = 0; i < 9; i++) rect(ctx, 120 + i * 46, 16, 26, 16, '#7a7062');
  arch(ctx, 250, 186, 140, 120, '#1e1a16');
  for (let i = 0; i < 7; i++) stroke(ctx, [262 + i * 20, 72, 262 + i * 20, 96], 2, '#3a3430'); stroke(ctx, [256, 94, 384, 94], 2, '#3a3430');
  banner(v, 160, 100, 52, WATCH_TABARD, {}); banner(v, 480, 100, 52, WATCH_TABARD, {});
  torch(v, 244, 150, 26, 5); torch(v, 396, 150, 26, 5);
  wagon(v, 330, 200, 1.1, -1);
  watchman(v, 400, 214, 84, { f: -1, arm: 'fwd', i: 1, noSpear: true });
  person(v, 268, 212, 80, folk(4, { f: 1, arm: 'out' })); // 마부
  person(v, 200, 238, 104, mine(v, { f: 1, arm: 'fwd', cloth: WATCH_CLOTH }));
  rect(ctx, 214, 166, 12, 9, '#e8e0c8');
  finish(v, {});
}
/** 사건 캐기: 경비대 초소 안, 수배서가 붙은 벽과 서류 더미, 촛불 아래 앉은 용의자와 묻는 나 */
function wtCase(v) {
  const { ctx } = v; room(v, { wall: '#4a4036', floor: '#2a221c', fy: 178 });
  rect(ctx, 0, 0, VW, 10, '#3a2e24'); for (const x of [0, 300, 620]) rect(ctx, x, 0, 16, 178, '#3a2e24');
  rect(ctx, 360, 40, 200, 90, '#5a4a38'); for (let i = 0; i < 8; i++) paper(ctx, 372 + (i % 4) * 46, 48 + Math.floor(i / 4) * 40, 30, 34);
  stroke(ctx, [384, 66, 432, 102, 476, 64, 524, 104], 0.8, '#8a2e26');
  windowAt(v, 70, 50, 50, 64, {}); for (let i = 0; i < 4; i++) stroke(ctx, [72 + i * 16, 52, 72 + i * 16, 112], 2, '#2a221c');
  rect(ctx, 30, 60, 6, 110, '#3a2e24'); for (let i = 0; i < 3; i++) spear(v, 40 + i * 10, 172, 120, 0.04);
  // 탁자
  rect(ctx, 200, 176, 240, 8, '#5a4026'); rect(ctx, 210, 184, 8, 40, '#3a2a1a'); rect(ctx, 422, 184, 8, 40, '#3a2a1a');
  for (let i = 0; i < 5; i++) rect(ctx, 240 + i * 4, 168 - i * 3, 34, 3, ['#d8ceb0', '#c8bea0'][i % 2]); paper(ctx, 330, 160, 20, 14);
  candle(v, 300, 172, 10); glow(v, 300, 160, 110, '#ffc078', 0.3);
  person(v, 400, 228, 86, folk(5, { raw: true, pose: 'sit', f: -1, arm: 'chest', noShadow: true, rim: 'rgba(255,190,110,.5)', rimDir: -1 }));
  person(v, 170, 240, 106, mine(v, { raw: true, f: 1, arm: 'fwd', cloth: WATCH_CLOTH, rim: 'rgba(255,190,110,.45)', rimDir: 1 }));
  watchman(v, 520, 220, 80, { raw: true, f: -1, i: 3 });
  finish(v, { inside: true, noLeaves: true });
}
export const WATCH26 = { patrol: wtPatrol, gate: wtGate, case: wtCase };

// ───────── 해적과 바다의 무법자 ─────────
/** 돛배 옆모습. x 가운데, y 물금, s 1이면 길이 200쯤. o.flag 깃발 빛, o.sails 돛 빛, o.masts 돛대 수, o.ports 포문 */
function galleon(v, x, y, s, d, o = {}) {
  const { ctx, t } = v, hull = t(o.hull ?? '#3a2a1e'), sail = t(o.sails ?? '#d8ccb0'), n = o.masts ?? 3;
  ctx.save(); ctx.translate(x, y); ctx.scale(d * s, s); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const mx = -60 + i * (120 / Math.max(1, n - 1)), mh = i === Math.floor(n / 2) ? 150 : 124;
    rect(ctx, mx - 1.6, -mh, 3.2, mh, t('#2a2018'));
    for (let k = 0; k < 2; k++) {
      const top = -mh + 10 + k * (mh * 0.42), h = mh * 0.36, w = 36 - k * 2;
      ctx.fillStyle = sail; ctx.beginPath(); ctx.moveTo(mx - w, top); ctx.lineTo(mx + w, top); ctx.quadraticCurveTo(mx + w + 8, top + h * 0.5, mx + w - 2, top + h); ctx.lineTo(mx - w + 2, top + h); ctx.quadraticCurveTo(mx - w + 8, top + h * 0.5, mx - w, top); ctx.fill();
      stroke(ctx, [mx - w - 2, top, mx + w + 2, top], 1.6, t('#2a2018'));
      if (o.torn && k === 1 && i === 0) poly(ctx, [mx - 8, top + h * 0.3, mx + 6, top + h * 0.5, mx - 4, top + h * 0.8], hull);
    }
    stroke(ctx, [mx, -mh, -98, -24], 0.5, 'rgba(30,22,16,.7)'); stroke(ctx, [mx, -mh, 98, -26], 0.5, 'rgba(30,22,16,.7)');
  }
  if (o.flag) { const mh = 150, mx = -60 + Math.floor(n / 2) * (120 / Math.max(1, n - 1)); poly(ctx, [mx + 1, -mh, mx + 26, -mh + 4, mx + 22, -mh + 9, mx + 26, -mh + 14, mx + 1, -mh + 16], t(o.flag)); if (o.skull) { oval(ctx, mx + 12, -mh + 7, 3.4, 3, '#e8e0c8'); stroke(ctx, [mx + 7, -mh + 12, mx + 17, -mh + 4], 0.8, '#e8e0c8'); } }
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-104, -30); ctx.lineTo(-90, -34); ctx.lineTo(80, -30); ctx.lineTo(118, -44); ctx.quadraticCurveTo(108, -10, 84, 4); ctx.lineTo(-82, 4); ctx.quadraticCurveTo(-100, -6, -104, -30); ctx.fill();
  rect(ctx, -104, -48, 34, 18, hull); // 고물 누각
  stroke(ctx, [-100, -28, 96, -26], 1.4, t('#6a5038')); stroke(ctx, [-90, -14, 90, -12], 0.8, t('#5a4230'));
  if (o.ports) for (let i = 0; i < 7; i++) rect(ctx, -70 + i * 22, -22, 6, 5, t('#14100c'));
  stroke(ctx, [112, -42, 150, -58], 2, t('#2a2018'));
  ctx.restore();
}
/** 먼바다: 검은 깃발 배가 바람을 받아 다가오고, 먼 곳에 상선 한 척. 뱃전에 선 나 */
function piSea(v) {
  const { ctx } = v; sky(v); seaAt(v, 128, { rough: 1.4 });
  galleon(v, 160, 150, 0.36, 1, { masts: 2, sails: '#c8bca0' });
  galleon(v, 420, 196, 0.8, -1, { flag: '#141010', skull: true, hull: '#2a201a', sails: '#b8ac90', ports: true });
  for (let i = 0; i < 4; i++) person(v, 360 + i * 30, 166, 26, folk(i, { f: -1, noShadow: true }));
  // 이쪽 배의 뱃전
  poly(ctx, [0, 210, 240, 216, 260, 240, 0, 240], v.t('#3a2a1e')); stroke(ctx, [0, 210, 240, 216], 3, v.t('#5a4230'));
  person(v, 110, 222, 100, mine(v, { f: 1, arm: 'fwd' }));
  finish(v, {});
}
/** 배끼리 붙음: 두 배 사이로 갈고리 줄이 걸리고 연기가 피어오른다. 칼을 든 실루엣들이 넘어온다 */
function piRaid(v) {
  const { ctx } = v; sky(v); seaAt(v, 150, { rough: 1.6 });
  galleon(v, 190, 200, 0.82, 1, { masts: 2, sails: '#d8ccb0', hull: '#4a3a28' });
  galleon(v, 460, 196, 0.86, -1, { flag: '#141010', skull: true, hull: '#2a201a', sails: '#a89c80', torn: true, ports: true });
  for (let i = 0; i < 5; i++) stroke(ctx, [380 - i * 8, 150 + i * 4, 290 + i * 6, 162 + i * 2], 0.8, '#2a2018');
  smoke(v, 330, 120, 120, 40, '#4a4440', 0.3); smoke(v, 450, 90, 100, 30, '#3a3632', 0.24);
  for (let i = 0; i < 4; i++) person(v, 400 + i * 26, 170, 40, folk(i + 2, { f: -1, arm: 'up', noShadow: true }));
  for (let i = 0; i < 4; i++) person(v, 170 + i * 24, 172, 40, folk(i, { f: 1, arm: i % 2 ? 'up' : 'fwd', noShadow: true }));
  poly(ctx, [0, 214, 200, 220, 214, 240, 0, 240], v.t('#3a2a1e')); stroke(ctx, [0, 214, 200, 220], 3, v.t('#5a4230'));
  person(v, 120, 228, 100, mine(v, { f: 1, arm: 'up' }));
  finish(v, {});
}
/** 해적 사냥: 깃발을 단 군선이 바위섬 쪽으로 달아나는 검은 배를 쫓는다. 군선 뱃머리에 선 나 */
function piHunt(v) {
  const { ctx } = v; sky(v); seaAt(v, 132, { rough: 1.2 });
  // 바위섬과 숨은 만
  poly(ctx, [420, 134, 460, 92, 500, 100, 540, 70, 600, 96, 640, 90, 640, 140], v.t('#4a4a44'));
  poly(ctx, [470, 134, 500, 110, 530, 118, 560, 104, 600, 134], v.t('#3a3a34'));
  galleon(v, 520, 150, 0.34, 1, { flag: '#141010', skull: true, masts: 2, sails: '#a89c80' });
  galleon(v, 220, 210, 0.9, 1, { flag: '#2a4a8a', hull: '#3a3026', ports: true });
  person(v, 300, 186, 50, mine(v, { f: 1, arm: 'fwd', noShadow: true }));
  finish(v, {});
}
export const PIRATES26 = { sea: piSea, raid: piRaid, hunt: piHunt };

// ───────── 새 교단과 종교 개혁 ─────────
// 새 교단의 표식: 손바닥 위 작은 불꽃 (기성 교단의 해 무늬와 다르게)
const sign = (v, x, y, r, c = '#d8b048') => { const { ctx } = v; oval(ctx, x, y + r * 0.3, r * 0.8, r * 0.36, c); poly(ctx, [x - r * 0.3, y, x, y - r * 0.9, x + r * 0.3, y], c); };
/** 거리 설교: 장터 수레 위에 올라선 설교자, 팔을 든 그에게 몰려든 사람들. 뒤에서 지켜보는 나 */
function sxPreach(v) {
  const { ctx } = v; sky(v); far(v, {}); townFar(v, 320, 136, {});
  ground(v, () => 186, { color: '#6a5e48', color2: '#40382c', tufts: 2 });
  rowHouse(v, 0, 130, 80, 186, '#5a4e40', { roof: '#3a2e24' }); rowHouse(v, 500, 140, 70, 186, '#54483c', { roof: '#3a2e24' });
  wagon(v, 330, 196, 1.1, 1);
  person(v, 330, 168, 80, { cloth: '#6a5a44', hair: '#3a2a1e', robe: true, arm: 'up', f: -1, rim: 'rgba(255,220,150,.6)', rimDir: -1 });
  glow(v, 330, 110, 90, '#ffe0a0', 0.22); sign(v, 360, 100, 8);
  crowd(v, 200, 470, 214, 8, 62, {});
  for (let i = 0; i < 2; i++) person(v, 250 + i * 160, 236, 74, folk(i + 1, { f: i ? -1 : 1, arm: i ? 'chest' : 'up' }));
  person(v, 70, 238, 102, mine(v, { f: 1, arm: 'chest' }));
  watchman(v, 560, 228, 84, { f: -1, i: 4 });
  finish(v, {});
}
/** 모임: 헛간을 고친 집회소, 벽에 그린 새 표식 아래 촛불을 든 신도들. 앞줄에 앉은 나 */
function sxWorship(v) {
  const { ctx } = v; room(v, { wall: '#4e4032', floor: '#2e261e', fy: 176 });
  for (let i = 0; i < 7; i++) stroke(ctx, [0, 20 + i * 24, VW, 20 + i * 24], 1, 'rgba(30,22,14,.3)');
  for (const x of [80, 560]) rect(ctx, x, 0, 14, 176, '#3a2e22');
  poly(ctx, [0, 0, 320, -40, 640, 0, 640, 14, 0, 14], '#3a2e22');
  sign(v, 320, 56, 22, '#c8a040'); glow(v, 320, 56, 70, '#ffd890', 0.2);
  rect(ctx, 270, 130, 100, 46, '#4a3626'); for (const x of [290, 320, 350]) candle(v, x, 130, 9); glow(v, 320, 120, 90, '#ffc070', 0.3);
  person(v, 380, 176, 70, { raw: true, cloth: '#7a6a50', hair: '#8a7a6a', robe: true, arm: 'up', f: -1, old: true, noShadow: true });
  for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) person(v, 150 + i * 86 + r * 30, 212 + r * 22, 70 + r * 8, folk(i + r * 5, { raw: true, pose: 'kneel', f: i < 2 ? 1 : -1, noShadow: true, rim: 'rgba(255,190,110,.4)', rimDir: i < 2 ? 1 : -1 }));
  person(v, 120, 240, 96, mine(v, { raw: true, pose: 'kneel', f: 1, rim: 'rgba(255,190,110,.45)', rimDir: 1 }));
  finish(v, { inside: true, noLeaves: true });
}
/** 이단 심문: 대성당 회랑, 높은 책상의 심문관들과 쌓인 책, 무릎 꿇은 사람 곁에 선 나 */
function sxTrial(v) {
  const { ctx } = v; room(v, { wall: '#5e5648', floor: '#34302a', fy: 172 });
  for (let i = 0; i < 4; i++) { arch(ctx, 40 + i * 160, 172, 90, 150, '#3e3830'); windowAt(v, 66 + i * 160, 50, 38, 70, { lit: false }); }
  for (let i = 0; i < 4; i++) rect(ctx, 20 + i * 160, 0, 18, 172, '#4e463a');
  // 높은 책상
  for (let i = 0; i < 3; i++) person(v, 410 + i * 76, 150, 74, { raw: true, cloth: i === 1 ? '#7a2a24' : '#2a2a30', hair: '#1c1614', robe: true, hood: i !== 1, f: -1, noShadow: true });
  rect(ctx, 360, 100, 250, 76, '#4a3220'); rect(ctx, 354, 96, 262, 8, '#6a4a2e'); steps(ctx, 485, 176, 260, 2, '#4a4236');
  for (let i = 0; i < 4; i++) rect(ctx, 560 - i * 2, 86 - i * 5, 30, 5, ['#5a2e28', '#2e3e52', '#4a4a30', '#3e2e4a'][i]);
  candle(v, 380, 96, 9); candle(v, 590, 96, 9); glow(v, 480, 80, 140, '#ffd090', 0.2);
  person(v, 300, 222, 80, folk(1, { raw: true, pose: 'kneel', f: 1, arm: 'chest' }));
  watchman(v, 240, 214, 84, { raw: true, f: 1, i: 5 });
  person(v, 150, 240, 104, mine(v, { raw: true, f: 1, arm: 'chest' }));
  finish(v, { inside: true, noLeaves: true });
}
export const SECT26 = { preach: sxPreach, worship: sxWorship, trial: sxTrial };

export const PLATES26 = {
  /** 경비대와 치안. variant: patrol·gate·case */
  watch(v) { return (WATCH26[v.variant] ?? wtPatrol)(v); },
  /** 해적과 바다의 무법자. variant: sea·raid·hunt */
  pirates(v) { return (PIRATES26[v.variant] ?? piSea)(v); },
  /** 새 교단과 종교 개혁. variant: preach·worship·trial */
  sect(v) { return (SECT26[v.variant] ?? sxPreach)(v); },
};

// 장면 → 판. 해적(pi_·pirates_)과 교단(sx_·sect_) 장면 id는 도우미3·2 PR이 들어오면 표에 채운다. 그 전에는 낱말로 고른다.
const WT_ART = { watch_thief: 'watch:patrol', watch_brawl: 'tavern:hall', watch_smuggle: 'watch:gate', watch_stray: 'watch:patrol', watch_noble: 'watch:patrol', watch_preacher: 'sect:preach', watch_case_new: 'watch:case', watch_accuse: 'watch:case', watch_promote: 'watch:case', watch_policy: 'watch:case', watch_boss: 'watch:case', watch_mate: 'tavern:hall', watch_grudge: 'watch:patrol', watch_riot: 'fire:riot', watch_inquiry: 'watch:case' };
export const PI_ART = {
  pi_taken: 'pirates:raid', pi_raid: 'pirates:raid', pi_hunt: 'pirates:hunt', pi_privateer: 'pirates:hunt', pi_past: 'pirates:sea', pi_fallen: 'pirates:hunt',
  pi_share: 'heist:split', pi_trial: 'heist:plan', pi_vote: 'heist:plan', pi_oldsalt: 'tavern:hall',
  pi_letter: 'envoy:table', pi_letter_end: 'envoy:table', pi_mapseller: 'survey:shop', pi_dig: 'ruins:dig',
};
export const SX_ART = {
  sx_preach: 'sect:preach', sx_sermon: 'sect:preach', sx_invite: 'spy:recruit',
  sx_gather: 'sect:worship', sx_miracle: 'sect:worship', sx_name: 'sect:worship', sx_found: 'sect:worship', sx_disciple: 'sect:worship', sx_legacy: 'sect:worship',
  sx_trial: 'sect:trial', sx_raid: 'sect:trial', sx_warn: 'chapel:inquisition',
  sx_doubt: 'credit:ledger', sx_kin: 'stepfamily:table', sx_split: 'newage:meeting', sx_patron: 'society:salon', sx_crown: 'envoy:table', sx_reform: 'square:notice',
};
const PI_WORDS = [[/사냥|함대|군선|쫓|토벌|hunt|navy/, 'pirates:hunt'], [/털|습격|갈고리|넘어|약탈|붙었|raid|board/, 'pirates:raid']];
const SX_WORDS = [[/심문|이단|재판|화형|파문|trial|heresy|inquisit/, 'sect:trial'], [/모임|예배|기도|집회|신도|worship|gather/, 'sect:worship'], [/설교|예언|외쳤|광장|preach|prophet/, 'sect:preach']];
const byWords = (table, ...texts) => { for (const t of texts) for (const [re, art] of table) if (re.test(t)) return art; return null; };
export function plate49(key, words = '') {
  const k = String(key ?? '');
  if (/^(wt|watch)_/.test(k)) return WT_ART[k] ?? 'watch:patrol';
  if (/^(pi|pirates?)_/.test(k)) return PI_ART[k] ?? byWords(PI_WORDS, k, words) ?? 'pirates:sea';
  if (/^(sx|sect)_/.test(k)) return SX_ART[k] ?? byWords(SX_WORDS, k, words) ?? 'sect:worship';
  return null;
}
export { galleon, watchman };
