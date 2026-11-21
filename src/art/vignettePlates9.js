// 28단계 삽화: 사절과 볼모, 정령과 계약, 술 빚기와 양조장.
import { fbm1, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, road, room, windowAt, glow, candle, pool, smoke, person, tree, banner, flame, finish, zoom } from './vignetteKit.js';
import { cottage, horseSil } from './vignettePlates4.js';
import { spear, wagon } from './vignettePlates5.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.5)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const dimOf = (v) => v.S.tod === 'night' || v.S.tod === 'dusk';
/** 술통 옆모습(누운 것) */
const cask = (ctx, x, y, r, c = '#5a4028') => { oval(ctx, x, y, r, r, c); oval(ctx, x, y, r * 0.78, r * 0.78, dark(c, 0.18)); ctx.strokeStyle = '#2a2420'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); stroke(ctx, [x - r * 0.7, y - r * 0.2, x + r * 0.7, y - r * 0.2], 0.7, 'rgba(0,0,0,.3)'); stroke(ctx, [x - r * 0.7, y + r * 0.25, x + r * 0.7, y + r * 0.25], 0.7, 'rgba(0,0,0,.3)'); oval(ctx, x, y + r * 0.5, r * 0.09, r * 0.09, '#1c1612'); };
/** 선 술통 */
const barrel = (ctx, x, y, w, h, c = '#5a4028') => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - w * 0.4, y); ctx.quadraticCurveTo(x - w * 0.6, y - h / 2, x - w * 0.4, y - h); ctx.lineTo(x + w * 0.4, y - h); ctx.quadraticCurveTo(x + w * 0.6, y - h / 2, x + w * 0.4, y); ctx.fill(); for (const k of [0.2, 0.8]) stroke(ctx, [x - w * 0.47, y - h * k, x + w * 0.47, y - h * k], 1.6, '#2a2420'); };

/* ---------- 사절과 볼모 ---------- */
/** 사절단 행렬: 낯선 성으로 드는 길, 두 나라 깃발 */
function envoyMarch(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { peaks: true });
  const gy = (x) => 158 - fbm1(x / 210 + v.q, 3) * 7; ground(v, gy, { tufts: 110 });
  // 멀리 남의 나라 성: 낯선 모양의 탑
  const cx = 500, cy = 150; rect(ctx, cx - 70, cy - 30, 140, 30, t('#6a6660')); for (let i = 0; i < 8; i++) rect(ctx, cx - 70 + i * 18, cy - 36, 10, 6, t('#6a6660'));
  for (const [x, h, w] of [[cx - 60, 62, 16], [cx, 84, 20], [cx + 56, 56, 16]]) { rect(ctx, x - w / 2, cy - h, w, h, t('#5e5a56')); ctx.fillStyle = t('#3e4a5a'); ctx.beginPath(); ctx.moveTo(x - w * 0.7, cy - h); ctx.quadraticCurveTo(x, cy - h - w * 1.6, x + w * 0.7, cy - h); ctx.fill(); stroke(ctx, [x, cy - h - w * 0.8, x, cy - h - w * 1.3], 1, t('#2a2420')); }
  poly(ctx, [cx - 10, cy, cx - 10, cy - 18, cx, cy - 24, cx + 10, cy - 18, cx + 10, cy], t('#1e1a18'));
  road(v, 160, cx, 152, { w: 110 });
  // 행렬: 앞선 기수, 사절, 수레, 호위
  horseSil(v, 392, 196, 40, 1, '#3a2c24', { tack: true }); person(v, 388, 176, 34, { f: 1, cloth: '#5a5e66', hair: '#2a1e16', hat: true, rim, rimDir: 1 }); banner(v, 400, 180, 58, '#6a2226', { mark: '#d8b040' });
  horseSil(v, 300, 214, 62, 1, '#6a4a30', { tack: true }); person(v, 294, 184, 52, mine(v, { f: 1, cloak: true, rim, rimDir: 1 }));
  horseSil(v, 222, 222, 62, 1, '#2e2622', { tack: true }); person(v, 216, 192, 52, { f: 1, cloth: '#4a2e4a', hair: '#8a8478', old: true, hat: true, cloak: true, rim, rimDir: 1 }); banner(v, 236, 198, 78, '#2a3a5a', { mark: '#c8c8d0' });
  wagon(v, 110, 236, 0.9, 1); person(v, 40, 238, 80, { f: 1, cloth: '#5a5e66', hair: '#2a1e16', hat: true, rim, rimDir: 1 }); spear(v, 28, 238, 100, -0.03);
  // 길가에서 지켜보는 그 나라 사람들
  for (const [x, i] of [[560, 0], [590, 1], [616, 4]]) person(v, x, 212 + (x % 7), 62, folk(i, { f: -1, hood: i === 4 }));
  finish(v, { noLeaves: true });
}
/** 협상 탁자: 두 깃발 아래 마주 앉은 두 나라. variant table / break(자리를 박차고 일어난다) */
function envoyTable(v) {
  const { ctx } = v, brk = v.variant === 'break'; room(v, { wall: '#34302c', floor: '#26221e', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.12);
  for (const x of [110, 550]) { rect(ctx, x - 10, 0, 20, 172, '#2a2622'); rect(ctx, x - 14, 160, 28, 12, '#221e1a'); }
  windowAt(v, 330, 26, 46, 86, { arch: true });
  // 양쪽 벽의 두 깃발
  poly(ctx, [176, 20, 236, 20, 236, 116, 206, 102, 176, 116], '#5a1e22'); oval(ctx, 206, 62, 10, 10, '#d8b040'); rect(ctx, 170, 16, 72, 5, '#8a7038');
  poly(ctx, [424, 20, 484, 20, 484, 116, 454, 102, 424, 116], '#22345a'); poly(ctx, [454, 48, 464, 68, 454, 78, 444, 68], '#c8c8d0'); rect(ctx, 418, 16, 72, 5, '#8a8a90');
  // 긴 탁자
  const tx = 330, ty = 210; poly(ctx, [tx - 150, ty - 40, tx + 150, ty - 40, tx + 170, ty - 22, tx - 170, ty - 22], '#4e3a2a'); rect(ctx, tx - 170, ty - 22, 340, 7, '#30241a'); for (const k of [-150, 142]) rect(ctx, tx + k, ty - 15, 8, 40, '#281e16');
  for (const k of [-90, 90]) { candle(v, tx + k, ty - 36, 9); pool(v, tx + k, ty - 40, 80, 30, '#ffb060', 0.18); }
  // 조약문과 인장, 잉크
  if (brk) { poly(ctx, [tx - 30, ty - 36, tx - 2, ty - 38, tx - 4, ty - 27, tx - 26, ty - 26], '#d8ccae'); poly(ctx, [tx + 6, ty - 34, tx + 34, ty - 37, tx + 30, ty - 26, tx + 10, ty - 28], '#d8ccae'); oval(ctx, tx + 60, ty - 30, 12, 4, '#1c1614'); rect(ctx, tx + 56, ty - 32, 9, 4, '#3a3a40'); }
  else { poly(ctx, [tx - 28, ty - 37, tx + 30, ty - 38, tx + 34, ty - 26, tx - 32, ty - 25], '#d8ccae'); for (let i = 0; i < 4; i++) stroke(ctx, [tx - 20, ty - 35 + i * 2.4, tx + 22, ty - 35.6 + i * 2.4], 0.6, '#5a4a3a'); oval(ctx, tx + 22, ty - 28, 3.4, 2.4, '#8a1e1a'); rect(ctx, tx + 52, ty - 44, 7, 8, '#3a3a40'); stroke(ctx, [tx + 56, ty - 44, tx + 64, ty - 58], 1.2, '#d8d0c0'); }
  // 왼쪽(우리): 나와 서기, 오른쪽(저쪽): 사절과 통역
  person(v, tx - 110, ty + 30, 104, mine(v, { raw: true, f: 1, pose: brk ? 'stand' : 'sit', arm: 'fwd', cloak: true, rim: WARM, rimDir: 1 }));
  person(v, tx - 176, ty + 28, 98, folk(4, { raw: true, f: 1, old: true, arm: 'chest' }));
  if (brk) { person(v, tx + 120, ty + 24, 106, { raw: true, f: -1, cloth: '#22345a', hair: '#1c1614', cloak: true, arm: 'up', rim: WARM, rimDir: -1 }); poly(ctx, [tx + 150, ty + 28, tx + 186, ty + 20, tx + 190, ty + 30, tx + 160, ty + 40], '#3a2a1e'); }
  else person(v, tx + 112, ty + 30, 104, { raw: true, f: -1, pose: 'sit', cloth: '#22345a', hair: '#1c1614', cloak: true, arm: 'chest', rim: WARM, rimDir: -1 });
  person(v, tx + 180, ty + 28, 96, { raw: true, f: -1, cloth: '#3a3e4a', hair: '#8a6a44', hat: true });
  ctx.restore(); finish(v, { inside: true });
}
/** 볼모의 궁정: 남의 나라 옥좌 앞에 혼자 선 아이. variant hostage / hostage-grown(자란 뒤) */
function envoyHostage(v) {
  const { ctx } = v, grown = v.variant === 'hostage-grown'; room(v, { wall: '#2e3036', floor: '#22242a', fy: 170 });
  ctx.save(); zoom(v, 330, 240, 1.06);
  // 높은 기둥과 길게 늘어진 남의 깃발
  for (const x of [60, 170, 490, 600]) { rect(ctx, x - 13, 0, 26, 170, '#26282e'); rect(ctx, x - 17, 158, 34, 12, '#1e2026'); poly(ctx, [x - 9, 10, x + 9, 10, x + 9, 110, x, 100, x - 9, 110], '#22345a'); poly(ctx, [x, 40, x + 5, 52, x, 58, x - 5, 52], '#c8c8d0'); }
  windowAt(v, 260, 20, 30, 80, { arch: true }); windowAt(v, 400, 20, 30, 80, { arch: true });
  // 층계와 옥좌
  const tx = 330; poly(ctx, [tx - 110, 170, tx + 110, 170, tx + 130, 184, tx - 130, 184], '#34363e'); poly(ctx, [tx - 80, 156, tx + 80, 156, tx + 96, 170, tx - 96, 170], '#3e4048');
  rect(ctx, tx - 26, 80, 52, 76, '#2a2428'); poly(ctx, [tx - 26, 80, tx, 56, tx + 26, 80], '#2a2428'); rect(ctx, tx - 20, 124, 40, 32, '#4a2a30');
  person(v, tx, 158, 78, { raw: true, f: -1, pose: 'sit', cloth: '#22345a', hair: '#8a8478', old: true, cloak: true }); poly(ctx, [tx - 9, 82, tx - 9, 75, tx - 4, 79, tx, 73, tx + 4, 79, tx + 9, 75, tx + 9, 82], '#d8b040');
  // 붉은 길
  poly(ctx, [tx - 30, 184, tx + 30, 184, tx + 70, 240, tx - 70, 240], '#4a2228');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const wx of [260, 400]) poly(ctx, [wx - 15, 100, wx + 15, 100, wx + 60, 240, wx - 30, 240], 'rgba(190,210,240,.05)'); ctx.restore();
  // 양옆에 늘어선 그 나라 신하들: 내려다본다
  for (const [x, f, i] of [[120, 1, 0], [158, 1, 3], [210, 1, 4], [450, -1, 2], [502, -1, 5], [544, -1, 1]]) person(v, x, 214 + (i % 2) * 4, 92, folk(i, { raw: true, f, cloak: i % 2 === 0, cloth: dark(CL[i], 0.15) }));
  for (const [x, f] of [[232, 1], [428, -1]]) { person(v, x, 196, 80, { raw: true, f, cloth: '#5a5e66', hair: '#2a1e16', hat: true }); spear(v, x - f * 12, 196, 100, 0); }
  // 한가운데 혼자 선 볼모
  if (grown) person(v, tx, 232, 98, mine(v, { raw: true, f: 1, cloak: true, arm: 'chest', rim: COLD, rimDir: 1 }));
  else { person(v, tx, 232, 58, mine(v, { raw: true, f: 1, child: true, rim: COLD, rimDir: 1 })); rect(ctx, tx + 14, 222, 12, 10, '#5a4632'); }
  ctx.restore(); finish(v, { inside: true });
}

/* ---------- 정령 ---------- */
/** 물의 정령: 달빛 호수 한가운데가 솟아 사람보다 훨씬 큰 것이 된다 */
function spiritWater(v) {
  const { ctx, t, R } = v; sky(v); far(v, { peaks: true });
  // 호수
  const ly = 150; const g = ctx.createLinearGradient(0, ly, 0, VH); g.addColorStop(0, t('#3a5a7a')); g.addColorStop(1, t('#14202e')); ctx.fillStyle = g; ctx.fillRect(0, ly, VW, VH - ly);
  for (let i = 0; i < 50; i++) { const y = ly + 4 + R() * 80; stroke(ctx, [R() * VW, y, R() * 40 + 20 + R() * VW, y], 0.7, rgba('#c8dcf0', 0.12)); }
  for (const [x, h] of [[30, 180], [612, 170]]) tree(v, x, 196, h, { dark: true });
  // 솟은 물: 어깨와 머리 비슷한 덩어리, 눈은 없다. 안이 비어 달빛이 지나간다
  const cx = 350;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, cx, 110, 170, '#8ab8e8', 0.2); ctx.restore();
  ctx.save(); ctx.translate(0, 26);
  const body = (off, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx - 110 + off, ly + 4); ctx.bezierCurveTo(cx - 90 + off, ly - 20, cx - 80, 90, cx - 50, 60); ctx.bezierCurveTo(cx - 40, 24, cx - 16, 8, cx + 4, 12); ctx.bezierCurveTo(cx + 34, 14, cx + 46, 40, cx + 50, 64); ctx.bezierCurveTo(cx + 84, 90, cx + 96 - off, ly - 20, cx + 120 - off, ly + 4); ctx.closePath(); ctx.fill(); };
  body(0, rgba(t('#5a8ab0'), 0.75)); body(18, rgba(t('#8ab8d8'), 0.4));
  // 흘러내리는 물줄기와 빈 속
  for (let i = 0; i < 26; i++) { const x = cx - 90 + R() * 190, y0 = 30 + R() * 70; stroke(ctx, [x, y0, x + (R() - 0.5) * 6, y0 + 30 + R() * 60], 0.8, rgba('#e0f0ff', 0.3)); }
  oval(ctx, cx, 62, 9, 26, rgba(t('#101824'), 0.6));
  ctx.restore();
  // 뻗어 오는 물의 팔
  ctx.strokeStyle = rgba(t('#8ab8d8'), 0.7); ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 70, 110); ctx.bezierCurveTo(cx - 150, 120, cx - 170, 170, cx - 196, 186); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = rgba('#e0f0ff', 0.4); ctx.stroke();
  for (let i = 0; i < 8; i++) { ctx.strokeStyle = rgba('#c8dcf0', 0.3 - i * 0.03); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, ly + 34, 130 + i * 22, 8 + i * 2.4, 0, 0, TAU); ctx.stroke(); }
  // 물가의 사람
  poly(ctx, [0, 214, 170, 206, 230, 222, 250, VH, 0, VH], t('#2a2e2a'));
  person(v, 130, 232, 78, mine(v, { f: 1, arm: 'fwd', rim: 'rgba(170,210,250,.6)', rimDir: 1 }));
  finish(v, { noLeaves: true });
}
/** 불의 정령: 화산 틈에서 일어선 불, 뿔처럼 갈라진 불길과 식은 돌의 몸 */
function spiritFire(v) {
  const { ctx, t, R } = v; sky(v); rect(ctx, 0, 0, VW, VH, 'rgba(60,14,8,.35)');
  // 화산 능선과 연기
  poly(ctx, [0, 150, 120, 110, 220, 60, 270, 50, 300, 62, 420, 120, 640, 140, 640, VH, 0, VH], t('#241a1a')); smoke(v, 280, 50, 110, 60, '#2a2220', 0.4);
  poly(ctx, [0, 190, VW, 180, VW, VH, 0, VH], t('#161012'));
  // 용암의 틈
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of [[380, VH, 400, 210, 430, 196, 470, 186], [470, 186, 520, 190, 560, VH], [430, 196, 410, 184, 380, 180]]) { stroke(ctx, p, 7, 'rgba(255,90,20,.3)'); stroke(ctx, p, 2.2, '#ffb040'); }
  glow(v, 440, 180, 220, '#ff5a14', 0.34); ctx.restore();
  // 정령: 검은 돌 껍질의 길쭉한 몸, 금 간 사이로 속불
  const cx = 440, by = 190;
  ctx.save(); ctx.translate(cx, by + 8); ctx.scale(0.8, 0.8); ctx.translate(-cx, -by);
  ctx.fillStyle = '#120c0c'; ctx.beginPath(); ctx.moveTo(cx - 34, by); ctx.bezierCurveTo(cx - 44, by - 60, cx - 30, by - 110, cx - 14, by - 140); ctx.lineTo(cx + 14, by - 140); ctx.bezierCurveTo(cx + 32, by - 108, cx + 46, by - 60, cx + 36, by); ctx.fill();
  poly(ctx, [cx - 14, by - 140, cx - 8, by - 166, cx + 8, by - 166, cx + 14, by - 140], '#120c0c');
  // 팔: 땅까지 늘어진다
  poly(ctx, [cx - 16, by - 132, cx - 52, by - 122, cx - 84, by - 70, cx - 62, by - 64, cx - 40, by - 96, cx - 24, by - 100], '#120c0c'); poly(ctx, [cx - 84, by - 70, cx - 62, by - 64, cx - 92, by + 4, cx - 104, by], '#120c0c');
  poly(ctx, [cx + 16, by - 132, cx + 56, by - 126, cx + 96, by - 84, cx + 78, by - 74, cx + 44, by - 100, cx + 24, by - 100], '#120c0c'); poly(ctx, [cx + 96, by - 84, cx + 78, by - 74, cx + 112, by - 8, cx + 124, by - 14], '#120c0c');
  poly(ctx, [cx - 34, by, cx - 60, by + 8, cx + 64, by + 8, cx + 36, by], '#120c0c');
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) { let px = cx - 22 + R() * 44, py = by - 10 - R() * 120; const pts = [px, py]; for (let k = 0; k < 3; k++) { px += (R() - 0.5) * 16; py -= 6 + R() * 10; pts.push(px, py); } stroke(ctx, pts, 1.3, rgba('#ffb040', 0.85)); }
  // 뿔처럼 갈라져 오르는 불길
  for (const [dx, h, lean] of [[-8, 70, -40], [8, 80, 44], [0, 50, 4]]) { for (let k = 0; k < 3; k++) { ctx.strokeStyle = rgba(k ? '#ff7a20' : '#ffe0a0', 0.5 - k * 0.14); ctx.lineWidth = 2 + k * 5; ctx.beginPath(); ctx.moveTo(cx + dx, by - 164); ctx.bezierCurveTo(cx + dx + lean * 0.2, by - 164 - h * 0.5, cx + dx + lean, by - 164 - h * 0.6, cx + dx + lean * 0.8, by - 164 - h); ctx.stroke(); } }
  oval(ctx, cx, by - 152, 7, 3, rgba('#fff0c0', 0.9)); glow(v, cx, by - 152, 40, '#ffb040', 0.5);
  for (let i = 0; i < 50; i++) { ctx.fillStyle = rgba('#ffb060', 0.3 + R() * 0.6); ctx.fillRect(cx - 120 + R() * 240, R() * 170, 1.4, 1.4); }
  ctx.restore();
  ctx.restore();
  // 사람: 얼굴을 가리고 선다
  person(v, 170, 232, 84, mine(v, { f: 1, arm: 'up', cloak: true, rim: 'rgba(255,140,70,.7)', rimDir: -1 }));
  finish(v, { noLeaves: true });
}
/** 바람의 정령: 벼랑 위 하늘에 감긴 구름의 고리, 그 가운데 빈 눈 */
function spiritWind(v) {
  const { ctx, t, R } = v; sky(v); far(v, { peaks: true });
  const cx = 380, cy = 82;
  // 감기는 구름 띠
  for (let k = 0; k < 5; k++) { for (let i = 0; i < 70; i++) { const a = (i / 70) * TAU + k * 0.5, rr = 44 + k * 26 + Math.sin(a * 3 + k) * 6, x = cx + Math.cos(a) * rr * 1.7, y = cy + Math.sin(a) * rr * 0.62; oval(ctx, x, y, 16 + k * 3, 5 + k, rgba(t(k % 2 ? '#c8d0dc' : '#8a94a8'), 0.1), a + Math.PI / 2); } }
  ctx.strokeStyle = rgba(t('#e8eef6'), 0.35); ctx.lineWidth = 1; for (let k = 0; k < 9; k++) { ctx.beginPath(); for (let i = 0; i <= 60; i++) { const a = (i / 60) * TAU * 1.3 + k, rr = 30 + i * 2.2 + k * 4, x = cx + Math.cos(a) * rr * 1.7, y = cy + Math.sin(a) * rr * 0.62; ctx[i ? 'lineTo' : 'moveTo'](x, y); } ctx.stroke(); }
  // 빈 눈
  oval(ctx, cx, cy, 44, 16, rgba(t('#1a2030'), 0.85)); oval(ctx, cx, cy, 20, 7, rgba(t('#0c1018'), 0.9)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, cx, cy, 30, '#c8dcff', 0.3); ctx.restore();
  // 말려 올라가는 새와 잎
  for (let i = 0; i < 16; i++) { const a = R() * TAU, rr = 70 + R() * 110, x = cx + Math.cos(a) * rr * 1.6, y = cy + Math.sin(a) * rr * 0.6; stroke(ctx, [x - 4, y, x, y - 2, x + 4, y], 1, '#14100e'); }
  // 벼랑
  poly(ctx, [0, 170, 150, 160, 250, 172, 280, 196, 268, VH, 0, VH], t('#3a3a3e')); poly(ctx, [150, 160, 250, 172, 280, 196, 240, 190], t('#4e4e54'));
  poly(ctx, [VW, 200, 520, 210, 470, VH, VW, VH], t('#2e2e32'));
  for (let i = 0; i < 40; i++) { const x = R() * 250, y = 168 + R() * 10 + x * 0.04; stroke(ctx, [x, y, x + 9, y - 4], 0.8, rgba(t('#8a9a6a'), 0.7)); }
  tree(v, 60, 172, 110, { bare: true });
  // 바람에 옷이 쓸리는 사람
  person(v, 210, 176, 80, mine(v, { f: 1, cloak: true, arm: 'fwd', lean: -0.12 }));
  finish(v, { noLeaves: true });
}
/** 땅의 정령: 산비탈이 등을 펴고 일어난다. 이끼 낀 어깨, 뿌리가 매달린 손 */
function spiritEarth(v) {
  const { ctx, t, R } = v; sky(v); far(v, { peaks: true });
  const gy = (x) => 170 - fbm1(x / 200 + v.q, 3) * 6; ground(v, gy, { tufts: 120 });
  for (const [x, h] of [[30, 160], [80, 200], [600, 180]]) tree(v, x, 196, h, { dark: true });
  // 일어서는 비탈
  const c = t('#4a463e'), c2 = t('#5e5a50');
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(250, 200); ctx.bezierCurveTo(260, 120, 300, 60, 380, 40); ctx.bezierCurveTo(430, 28, 470, 44, 490, 70); ctx.bezierCurveTo(560, 80, 610, 130, 640, 150); ctx.lineTo(640, 210); ctx.fill();
  ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(380, 40); ctx.bezierCurveTo(430, 28, 470, 44, 490, 70); ctx.bezierCurveTo(450, 66, 410, 60, 380, 40); ctx.fill();
  // 머리 자리: 얼굴 없이 갈라진 틈 하나
  poly(ctx, [330, 92, 360, 60, 400, 56, 420, 84, 400, 110, 350, 114], t('#3a362e')); stroke(ctx, [352, 88, 372, 82, 396, 86], 2.4, '#0e0c0a'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; stroke(ctx, [356, 88, 372, 83, 392, 86], 0.9, rgba('#b8e090', 0.7)); glow(v, 374, 86, 26, '#a0d070', 0.3); ctx.restore();
  // 등의 이끼와 나무
  for (let i = 0; i < 60; i++) { const x = 400 + R() * 230, y = 60 + (x - 400) * 0.36 + R() * 14; oval(ctx, x, y, 5 + R() * 6, 2.4, rgba(t('#4a6a3a'), 0.7)); }
  for (const [x, y, h] of [[470, 72, 34], [500, 82, 26], [530, 96, 40], [556, 108, 28], [580, 124, 36], [606, 136, 26]]) { const l = -0.22 * h; stroke(ctx, [x, y, x + l, y - h], 1.6, t('#2a2018')); for (let k = 0; k < 3; k++) poly(ctx, [x + l * (0.3 + k * 0.24) - h * (0.22 - k * 0.05), y - h * (0.3 + k * 0.24), x + l * (0.62 + k * 0.2), y - h * (0.7 + k * 0.2), x + l * (0.3 + k * 0.24) + h * (0.22 - k * 0.05), y - h * (0.3 + k * 0.24)], t('#26402a')); }
  // 들어 올린 손: 흙과 뿌리가 떨어진다
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(270, 204); ctx.bezierCurveTo(236, 180, 200, 160, 176, 136); ctx.lineTo(212, 108); ctx.bezierCurveTo(240, 136, 270, 150, 300, 160); ctx.fill();
  poly(ctx, [172, 140, 160, 112, 178, 92, 214, 100, 220, 116], c);
  for (const [x0, y0, x1, y1, x2, y2, w] of [[164, 112, 146, 84, 150, 62, 9], [176, 96, 170, 62, 180, 40, 10], [192, 94, 196, 58, 210, 38, 10], [208, 100, 220, 70, 236, 56, 9], [170, 132, 148, 126, 136, 110, 8]]) stroke(ctx, [x0, y0, x1, y1, x2, y2], w, c);
  for (const [x, y] of [[150, 62], [180, 40], [210, 38], [236, 56]]) oval(ctx, x, y, 3, 3, c2);
  for (let i = 0; i < 12; i++) { const x = 196 + R() * 70, y = 136 + R() * 30; stroke(ctx, [x, y, x + (R() - 0.5) * 6, y + 12 + R() * 22], 0.8, t('#3a2c20')); }
  for (let i = 0; i < 30; i++) { ctx.fillStyle = t('#3a3228'); ctx.fillRect(190 + R() * 90, 150 + R() * 56, 1.6, 1.6); }
  // 갈라진 땅
  for (let i = 0; i < 6; i++) stroke(ctx, [250 - i * 26, 204 + i * 3, 236 - i * 26, 212 + i * 4, 216 - i * 26, 210 + i * 5], 1.2, '#14100e');
  person(v, 120, 232, 74, mine(v, { f: 1, pose: 'kneel', arm: 'fwd' }));
  person(v, 70, 236, 70, folk(4, { f: 1, old: true, stick: 'staff', hood: true }));
  finish(v, { noLeaves: true });
}
/** 계약: 손바닥에 새겨지는 표, 등 뒤 벽에 드리운 사람 아닌 그림자 */
function spiritPact(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#2a2622', floor: '#1e1a16', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.16);
  windowAt(v, 130, 40, 34, 50);
  // 벽의 그림자: 뿔도 날개도 아닌 긴 것
  ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.moveTo(380, 172); ctx.bezierCurveTo(360, 110, 400, 60, 440, 20); ctx.lineTo(470, 20); ctx.bezierCurveTo(500, 60, 560, 100, 560, 172); ctx.fill();
  for (const [x0, x1, y1] of [[430, 360, 40], [470, 560, 34], [450, 452, 6]]) { ctx.strokeStyle = 'rgba(0,0,0,.36)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x0, 60); ctx.quadraticCurveTo((x0 + x1) / 2, 30, x1, y1); ctx.stroke(); }
  // 바닥에 놓은 것들: 물 그릇, 재, 깃, 돌
  oval(ctx, 300, 214, 16, 5, '#3a4a5a'); oval(ctx, 300, 213, 12, 3, '#5a7a9a'); oval(ctx, 350, 222, 12, 4, '#3a3632'); stroke(ctx, [392, 212, 412, 204], 1.4, '#c8c8c0'); poly(ctx, [424, 222, 432, 210, 444, 222], '#5a5a54');
  candle(v, 262, 216, 9); candle(v, 462, 216, 9);
  // 손바닥의 표
  person(v, 330, 208, 100, mine(v, { raw: true, f: 1, pose: 'kneel', arm: 'fwd', rim: 'rgba(170,220,255,.5)', rimDir: 1 }));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, 368, 150, 30, '#a0d0ff', 0.6); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; stroke(ctx, [368, 150, 368 + Math.cos(a) * 9, 150 + Math.sin(a) * 9], 1.2, '#e0f0ff'); } ctx.strokeStyle = '#e0f0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(368, 150, 6, 0, TAU); ctx.stroke(); ctx.restore();
  ctx.restore(); finish(v, { inside: true });
}

/* ---------- 술 빚기와 양조장 ---------- */
/** 양조장: 구리 솥과 발효통, 맥아 자루 */
function brewHouse(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#352b20', floor: '#261d15', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.12);
  windowAt(v, 110, 40, 36, 50); rect(ctx, 0, 22, VW, 6, '#1c140e'); for (const x of [200, 470]) rect(ctx, x - 4, 22, 8, 150, '#1c140e');
  // 화덕 위의 구리 솥
  const kx = 340, ky = 190; rect(ctx, kx - 60, ky - 20, 120, 34, '#3a3432'); poly(ctx, [kx - 20, ky + 14, kx - 20, ky - 4, kx, ky - 12, kx + 20, ky - 4, kx + 20, ky + 14], '#140e0c'); flame(v, kx - 4, ky + 10, 8); flame(v, kx + 8, ky + 10, 6);
  ctx.fillStyle = '#a8663a'; ctx.beginPath(); ctx.moveTo(kx - 52, ky - 20); ctx.bezierCurveTo(kx - 62, ky - 80, kx - 30, ky - 110, kx, ky - 112); ctx.bezierCurveTo(kx + 30, ky - 110, kx + 62, ky - 80, kx + 52, ky - 20); ctx.fill();
  ctx.fillStyle = '#c88a50'; ctx.beginPath(); ctx.ellipse(kx - 20, ky - 70, 10, 30, 0.2, 0, TAU); ctx.fill(); rect(ctx, kx - 8, ky - 126, 16, 16, '#8a5230'); stroke(ctx, [kx, ky - 126, kx + 60, ky - 140, kx + 110, ky - 96], 5, '#8a5230');
  for (const k of [-0.3, 0.3]) stroke(ctx, [kx - 54, ky - 50 + k * 60, kx + 54, ky - 50 + k * 60], 1.2, '#6a3e22');
  smoke(v, kx, ky - 130, 60, 26, '#d8d0c0', 0.18); glow(v, kx, ky, 120, '#ff9a48', 0.3);
  // 발효통과 받는 통
  barrel(ctx, 460, 204, 60, 76); barrel(ctx, 530, 208, 66, 86, '#4e3824'); oval(ctx, 460, 128, 24, 5, '#d8c890'); for (let i = 0; i < 8; i++) oval(ctx, 444 + i * 4.4, 127 + (i % 2), 2.4, 1.6, '#f0e8d0');
  // 맥아 자루와 삽
  for (const [x, y] of [[170, 206], [200, 208], [184, 186]]) { oval(ctx, x, y - 14, 15, 18, '#8a7a5c'); poly(ctx, [x - 5, y - 30, x + 5, y - 30, x + 3, y - 35, x - 3, y - 35], '#6a5c44'); }
  stroke(ctx, [236, 210, 250, 140], 2.4, '#5a4632'); poly(ctx, [228, 210, 244, 210, 242, 224, 230, 224], '#787c84');
  person(v, 262, 236, 104, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: 1 })); stroke(ctx, [286, 176, 316, 110], 2.2, '#5a4632');
  person(v, 426, 236, 92, folk(0, { raw: true, f: 1, arm: 'fwd' }));
  ctx.restore(); finish(v, { inside: true });
}
/** 포도 수확: 비탈의 포도밭과 등짐 광주리 */
function brewVintage(v) {
  const { ctx, t, R } = v; v.P = { ...v.P, snow: false }; sky(v); far(v); townFar(v, 110, 142, { s: 0.7, n: 5 });
  const gy = (x) => 150 - fbm1(x / 220 + v.q, 3) * 6; ground(v, gy, { tufts: 40 });
  // 비탈
  poly(ctx, [0, VH, 0, 196, 200, 170, 640, 120, 640, VH], t('#6a6a3a'));
  // 포도나무 줄
  for (let r = 0; r < 5; r++) { const y0 = 150 + r * 20, s = 0.6 + r * 0.24; for (let i = 0; i < 16; i++) { const x = 150 + i * 34 * s + r * 13, y = y0 - (x - 200) * 0.11 + r * 3; if (x > 650 || y < 110) continue; stroke(ctx, [x, y, x, y - 16 * s], 1.4 * s, t('#3a2c20')); oval(ctx, x, y - 18 * s, 11 * s, 7 * s, t(['#4a6a2e', '#5a7a34', '#6a7a30'][(i + r) % 3])); if ((i + r) % 2) for (let k = 0; k < 3; k++) oval(ctx, x - 3 * s + k * 3 * s, y - 10 * s + (k % 2) * 2 * s, 2 * s, 2.4 * s, t('#4a2a5a')); } }
  cottage(v, 560, 128, 70, 34);
  // 광주리와 통
  const basket = (x, y, s) => { poly(ctx, [x - s, y - s, x + s, y - s, x + s * 0.7, y, x - s * 0.7, y], t('#8a6a40')); for (let i = 0; i < 6; i++) oval(ctx, x - s * 0.7 + i * s * 0.28, y - s * 1.05 + (i % 2) * 2, s * 0.2, s * 0.2, t('#4a2a5a')); };
  basket(250, 236, 15); basket(400, 226, 12);
  barrel(ctx, 500, 228, 44, 40, t('#5a4028')); oval(ctx, 500, 188, 17, 4, t('#4a2a5a'));
  person(v, 300, 236, 100, mine(v, { f: 1, arm: 'fwd' })); poly(ctx, [270, 168, 290, 166, 288, 196, 274, 198], t('#8a6a40'));
  person(v, 364, 226, 82, folk(1, { f: -1, pose: 'bow', arm: 'fwd' })); person(v, 450, 222, 78, folk(0, { f: 1, hat: true, arm: 'fwd' })); person(v, 210, 234, 56, folk(3, { f: 1, child: true }));
  for (let i = 0; i < 5; i++) { const x = 60 + R() * 500, y = 40 + R() * 50; stroke(ctx, [x - 3, y, x, y - 2, x + 3, y], 1, '#14100e'); }
  finish(v, { noLeaves: true });
}
/** 술 창고: 둥근 천장 아래 누운 통들. variant cellar / still(숲속의 밀주 솥) */
function brewCellar(v) {
  const { ctx } = v; room(v, { wall: '#2a2622', floor: '#1c1814', fy: 176 });
  ctx.save(); zoom(v, 330, 240, 1.1);
  // 둥근 천장
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = '#1a1612'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(330, 176, 300 - i * 62, Math.PI, 0); ctx.stroke(); }
  rect(ctx, 290, 96, 80, 80, '#141210'); ctx.fillStyle = '#141210'; ctx.beginPath(); ctx.arc(330, 96, 40, Math.PI, 0); ctx.fill();
  // 양쪽에 두 층으로 누운 통
  for (const d of [-1, 1]) for (let i = 0; i < 4; i++) { const r = 30 - i * 5, x = 330 + d * (250 - i * 56), y = 200 - i * 9; cask(ctx, x, y, r, i % 2 ? '#5a4028' : '#4e3824'); cask(ctx, x + d * 4, y - r * 1.9, r * 0.9, '#54402a'); rect(ctx, x - r, y + r - 2, r * 2, 4, '#241c16'); }
  // 분필 표시
  for (const [x, y] of [[84, 196], [140, 188], [576, 196]]) { stroke(ctx, [x - 4, y - 6, x + 4, y - 6], 1, '#d8d0c0'); stroke(ctx, [x, y - 6, x, y - 14], 1, '#d8d0c0'); }
  // 촛대와 맛보는 사람들
  rect(ctx, 326, 206, 8, 4, '#3a2c20'); candle(v, 330, 206, 10); pool(v, 330, 214, 150, 20, '#ffb060', 0.24); glow(v, 330, 190, 130, '#ffb060', 0.2);
  person(v, 276, 236, 102, mine(v, { raw: true, f: 1, arm: 'fwd', rim: WARM, rimDir: 1 })); rect(ctx, 300, 176, 6, 8, '#b8a888'); oval(ctx, 303, 178, 2.4, 1.6, '#6a1e2a');
  person(v, 394, 236, 98, { raw: true, f: -1, cloth: '#4a2e4a', hair: '#8a8478', old: true, hat: true, arm: 'chest', rim: WARM, rimDir: -1 });
  ctx.restore(); finish(v, { inside: true });
}
/** 밀주: 숲속 움막의 작은 솥과 망보는 사람 */
function brewStill(v) {
  const { ctx, t } = v; sky(v); far(v);
  const gy = (x) => 168 - fbm1(x / 160 + v.q, 3) * 8; ground(v, gy, { tufts: 150 });
  for (const [x, h] of [[30, 210], [100, 180], [180, 230], [470, 220], [540, 190], [610, 230]]) tree(v, x, 196 + (h - 180) * 0.14, h, { dark: true });
  // 나뭇가지 움막
  poly(ctx, [240, 214, 330, 130, 420, 214], t('#2e2a22')); for (let i = 0; i < 9; i++) stroke(ctx, [250 + i * 20, 212, 330, 132], 1.2, t('#1e1a14')); poly(ctx, [296, 214, 330, 166, 364, 214], '#100c0a');
  // 솥과 구리 관, 받는 단지
  const kx = 330, ky = 214; pool(v, kx, ky + 6, 110, 16, '#ff9a48', 0.34); glow(v, kx, ky - 14, 90, '#ff9a48', 0.36);
  flame(v, kx - 4, ky, 7); oval(ctx, kx, ky - 16, 16, 12, '#8a5230'); rect(ctx, kx - 5, ky - 32, 10, 8, '#8a5230'); stroke(ctx, [kx, ky - 32, kx + 30, ky - 44, kx + 54, ky - 10], 2.6, '#a8663a'); oval(ctx, kx + 56, ky - 2, 8, 9, '#5a4a3a');
  for (const [x, y] of [[250, 226], [268, 230], [410, 230]]) { oval(ctx, x, y - 8, 7, 9, t('#5a4a3a')); rect(ctx, x - 2.4, y - 20, 4.8, 5, t('#5a4a3a')); }
  person(v, 286, 232, 80, mine(v, { f: 1, pose: 'kneel', arm: 'fwd', rim: WARM, rimDir: 1 }));
  // 망보는 사람과 멀리 등불
  person(v, 480, 232, 94, folk(2, { f: 1, hood: true, cloak: true, rim: WARM, rimDir: -1 }));
  for (const [x, y] of [[590, 176], [606, 178]]) { person(v, x, y + 10, 26, { f: -1, cloth: '#14121a', hair: '#14121a' }); glow(v, x - 5, y - 4, 10, '#ffd080', 0.8); }
  finish(v);
}

export const PLATES9 = {
  /** 사절과 볼모. variant: march table break hostage hostage-grown */
  envoy(v) { const k = v.variant ?? 'march'; return k === 'table' || k === 'break' ? envoyTable(v) : k === 'hostage' || k === 'hostage-grown' ? envoyHostage(v) : envoyMarch(v); },
  /** 정령과 계약. variant: water fire wind earth pact */
  spirit(v) { const k = v.variant ?? 'water'; return k === 'fire' ? spiritFire(v) : k === 'wind' ? spiritWind(v) : k === 'earth' ? spiritEarth(v) : k === 'pact' ? spiritPact(v) : spiritWater(v); },
  /** 술 빚기와 양조장. variant: house vintage cellar still */
  brew(v) { const k = v.variant ?? 'house'; return k === 'vintage' ? brewVintage(v) : k === 'cellar' ? brewCellar(v) : k === 'still' ? brewStill(v) : brewHouse(v); },
};
