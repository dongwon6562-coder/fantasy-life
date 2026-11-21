// 27단계 삽화: 불로(늙지 않는 몸)의 길들과 시작 화면의 '타고남'.
import { fbm1, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, road, room, windowAt, glow, candle, pool, person, lying, tree, flame, finish, zoom } from './vignetteKit.js';
import { cottage } from './vignettePlates4.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const ring = (ctx, x, y, rx, ry, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke(); };
const WARM = 'rgba(255,180,100,.55)', COLD = 'rgba(190,210,240,.5)', MANA = '#8ab8ff', BREATH = '#b070d0';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const SHADE = { cloth: '#0e0c12', hair: '#0e0c12', skin: '#0e0c12' };

/** 노아: 탑 꼭대기 창가에 등을 보이고 선 그림자. 얼굴은 끝내 보이지 않는다 */
function noa(v) {
  const { ctx, R } = v; room(v, { wall: '#26262c', floor: '#1a1a20', fy: 176 });
  ctx.save(); zoom(v, 330, 240, 1.1);
  // 큰 아치 창과 밤하늘
  const wx = 380, wy = 176;
  ctx.fillStyle = '#1c2844'; ctx.beginPath(); ctx.moveTo(wx - 80, wy); ctx.lineTo(wx - 80, 80); ctx.quadraticCurveTo(wx, -10, wx + 80, 80); ctx.lineTo(wx + 80, wy); ctx.fill();
  ctx.save(); ctx.clip(); const g = ctx.createLinearGradient(0, 20, 0, wy); g.addColorStop(0, '#141c38'); g.addColorStop(1, '#4a5a80'); ctx.fillStyle = g; ctx.fillRect(wx - 80, 0, 160, wy);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba('#e8f0ff', 0.3 + R() * 0.6); ctx.fillRect(wx - 78 + R() * 156, 20 + R() * 110, 1.2, 1.2); }
  poly(ctx, [wx - 80, wy, wx - 80, 150, wx - 40, 138, wx, 152, wx + 40, 134, wx + 80, 148, wx + 80, wy], '#161c2c'); ctx.restore();
  rect(ctx, wx - 2, 30, 4, wy - 30, '#141418'); rect(ctx, wx - 84, wy - 6, 168, 8, '#34343c');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; poly(ctx, [wx - 80, wy, wx + 80, wy, wx + 200, 240, wx - 240, 240], 'rgba(150,180,240,.1)'); ctx.restore();
  // 벽을 채운 책과 다섯 세기의 먼지
  for (const bx of [40, 520]) { rect(ctx, bx, 16, 90, 160, '#18161a'); for (let r = 0; r < 5; r++) { rect(ctx, bx + 3, 44 + r * 30, 84, 3, '#2a2428'); for (let i = 0; i < 9; i++) rect(ctx, bx + 6 + i * 9, 22 + r * 30 + (i % 3) * 2, 7, 22 - (i % 3) * 2, ['#3a2a2e', '#2a3040', '#34342a', '#30283a'][(i + r) % 4]); } }
  // 책상: 꺼진 초, 멈춘 모래시계, 반지 하나
  const tx = 190, ty = 214; poly(ctx, [tx - 60, ty - 40, tx + 60, ty - 40, tx + 74, ty - 24, tx - 74, ty - 24], '#3a2e26'); rect(ctx, tx - 74, ty - 24, 148, 6, '#241c18'); rect(ctx, tx - 64, ty - 18, 7, 42, '#1c1614'); rect(ctx, tx + 58, ty - 18, 7, 42, '#1c1614');
  rect(ctx, tx - 40, ty - 50, 4, 12, '#c8c0a8'); poly(ctx, [tx - 4, ty - 58, tx + 12, ty - 58, tx + 6, ty - 48, tx + 12, ty - 38, tx - 4, ty - 38, tx + 2, ty - 48], '#6a7080'); rect(ctx, tx - 6, ty - 60, 20, 2.4, '#8a7038'); rect(ctx, tx - 6, ty - 38, 20, 2.4, '#8a7038');
  ring(ctx, tx + 40, ty - 34, 4.4, 2.2, 1.4, '#b89840'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, tx + 40, ty - 36, 22, MANA, 0.4); ctx.restore();
  // 그림자: 등을 보이고 선 사람, 긴 옷
  person(v, wx - 6, 212, 112, { raw: true, f: 1, ...SHADE, robe: true, hood: true, cloak: true, stick: 'staff' });
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.9 + (i / 6) * Math.PI * 0.8; ctx.fillStyle = rgba('#c8dcff', 0.8); ctx.fillRect(wx - 6 + Math.cos(a) * 44, 128 + Math.sin(a) * 30, 1.8, 1.8); } ctx.restore();
  poly(ctx, [wx - 24, 212, wx + 12, 212, wx - 60, 240, wx - 150, 240], 'rgba(0,0,0,.4)');
  // 문간의 나
  person(v, 84, 238, 100, mine(v, { raw: true, f: 1, arm: 'chest', rim: COLD, rimDir: 1 }));
  ctx.restore(); finish(v, { inside: true });
}
/** 일곱째 서클: 일곱 겹의 고리가 한 사람을 두르고, 풀잎이 멈춘다 */
function seventh(v) {
  const { ctx, R } = v; sky(v); far(v, { peaks: true });
  const gy = (x) => 168 - fbm1(x / 200 + v.q, 3) * 6; ground(v, gy, { tufts: 160 });
  for (const [x, h] of [[50, 170], [600, 190]]) tree(v, x, 190, h, { dark: true });
  const cx = 330, cy = 214;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(v, cx, cy - 60, 190, MANA, 0.3, 150);
  for (let i = 0; i < 7; i++) { const rx = 34 + i * 30, ry = 5 + i * 4.4, a = 0.85 - i * 0.09; ring(ctx, cx, cy - i * 1.5, rx, ry, i === 6 ? 2 : 1.2, rgba(i === 6 ? '#fff0c0' : '#b8d4ff', a)); for (let k = 0; k < 6 + i * 2; k++) { const t = (k / (6 + i * 2)) * TAU + i; ctx.fillStyle = rgba('#e8f0ff', a); ctx.fillRect(cx + Math.cos(t) * rx - 1, cy - i * 1.5 + Math.sin(t) * ry - 1, 2, 2); } }
  // 위로 뜨다 멈춘 빛 알갱이
  for (let i = 0; i < 90; i++) { const a = R() * TAU, d = 20 + R() * 200; ctx.fillStyle = rgba('#d8e8ff', 0.25 + R() * 0.6); ctx.fillRect(cx + Math.cos(a) * d, cy - 10 - R() * 170, 1.3, 1.3); }
  const g = ctx.createLinearGradient(0, 0, 0, cy); g.addColorStop(0, rgba('#d8e8ff', 0)); g.addColorStop(1, rgba('#d8e8ff', 0.22)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 26, cy); ctx.lineTo(cx - 8, 0); ctx.lineTo(cx + 8, 0); ctx.lineTo(cx + 26, cy); ctx.fill();
  ctx.restore();
  person(v, cx, cy + 8, 104, mine(v, { f: 1, robe: true, arm: 'up', rim: 'rgba(200,225,255,.8)', rimDir: 1 }));
  // 멀리서 지켜보는 그림자 하나
  person(v, 560, 204, 60, { f: -1, ...SHADE, robe: true, hood: true, stick: 'staff' });
  finish(v, { noLeaves: true });
}
/** 잠든 용 앞에서 참이름을 부른다: 굴을 채운 머리와 반쯤 뜬 눈 */
function truename(v) {
  const { ctx, R } = v; room(v, { wall: '#1e1c1e', floor: '#161416', fy: 190, stone: false });
  ctx.save(); zoom(v, 330, 240, 1.06);
  // 굴의 벽과 종유석
  for (let i = 0; i < 14; i++) { const x = i * 50 + R() * 20, h = 20 + R() * 46; poly(ctx, [x - 12, 0, x + 12, 0, x + 2, h], '#121012'); }
  rect(ctx, 0, 190, VW, 50, '#141214'); for (let i = 0; i < 30; i++) oval(ctx, R() * VW, 196 + R() * 40, 4 + R() * 9, 1.5 + R() * 2, '#1e1a1c');
  // 용의 몸: 굴 안쪽을 메운 등줄기
  const c = '#2a2630', c2 = '#383242';
  ctx.fillStyle = '#1c1a22'; ctx.beginPath(); ctx.moveTo(VW, 60); ctx.quadraticCurveTo(520, 20, 400, 70); ctx.quadraticCurveTo(340, 100, 330, 190); ctx.lineTo(VW, 190); ctx.fill();
  for (let i = 0; i < 9; i++) poly(ctx, [600 - i * 30, 52 + i * i * 0.6, 612 - i * 30, 30 + i * i * 0.6, 624 - i * 30, 50 + i * i * 0.5], '#1c1a22');
  // 머리: 바닥에 턱을 괴고 잠든 옆모습
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(250, 190); ctx.quadraticCurveTo(244, 164, 280, 150); ctx.quadraticCurveTo(330, 124, 400, 112); ctx.quadraticCurveTo(470, 96, 540, 120); ctx.lineTo(VW, 110); ctx.lineTo(VW, 190); ctx.fill();
  ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(400, 112); ctx.quadraticCurveTo(450, 100, 520, 116); ctx.quadraticCurveTo(470, 124, 410, 132); ctx.fill();
  // 뿔과 비늘 결, 콧김
  poly(ctx, [520, 118, 600, 70, 560, 126], c2); poly(ctx, [556, 124, 630, 92, 590, 134], c);
  for (let i = 0; i < 26; i++) { const x = 300 + R() * 300, y = 136 + R() * 46; stroke(ctx, [x, y, x + 7, y - 3, x + 14, y], 0.8, 'rgba(0,0,0,.3)'); }
  stroke(ctx, [262, 180, 330, 176, 400, 178], 1.2, '#0e0c10'); oval(ctx, 268, 164, 4, 2.4, '#0e0c10');
  for (let i = 0; i < 5; i++) oval(ctx, 236 - i * 14, 160 - i * 8, 10 + i * 4, 5 + i * 2, rgba('#8a8690', 0.1));
  // 반쯤 뜬 눈
  const ex = 440, ey = 138; oval(ctx, ex, ey, 17, 6, '#0e0c10'); ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey + 1.5, 15, 3.4, 0, 0, TAU); ctx.clip(); rect(ctx, ex - 16, ey - 4, 32, 9, '#d89a30'); rect(ctx, ex - 1.6, ey - 5, 3.2, 12, '#14100c'); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, ex, ey, 46, '#ffb040', 0.34);
  // 입에서 흩어지는 옛 글자
  const gl = [[0, 0, 6, -8, 12, 0], [0, -8, 0, 0, 8, 0], [0, 0, 8, -8, 8, 0], [0, -8, 8, -8, 4, 0], [0, -4, 8, -4, 4, -9], [0, 0, 4, -8, 8, 0, 2, -4]];
  for (let i = 0; i < 9; i++) { const x = 150 + i * 13 + R() * 6, y = 150 - i * 7 + Math.sin(i) * 8, s = 0.8 + i * 0.07, p = gl[i % gl.length].map((n, k) => (k % 2 ? y + n * s : x + n * s)); stroke(ctx, p, 1.3, rgba('#ffe0a0', 0.9 - i * 0.07)); }
  glow(v, 180, 140, 60, '#ffd080', 0.18); ctx.restore();
  person(v, 120, 232, 88, mine(v, { raw: true, f: 1, arm: 'up', rim: 'rgba(255,200,120,.55)', rimDir: -1 }));
  // 발치에 펼친 고대어 조각들
  for (const [x, y] of [[150, 228], [168, 234], [92, 234]]) poly(ctx, [x, y, x + 14, y - 2, x + 16, y + 4, x + 2, y + 6], '#b8a888');
  ctx.restore(); finish(v, { inside: true });
}
/** 쐐기에서 새는 숨: 금 간 돌에 입을 대는 사람과 시드는 풀 */
function breath(v) {
  const { ctx, t, R } = v; sky(v); far(v, { peaks: true });
  const gy = (x) => 166 - fbm1(x / 170 + v.q, 3) * 8; ground(v, gy, { color: '#5a5e52', color2: '#3a3c38', tufts: 50 });
  for (const [x, h] of [[70, 170], [560, 150], [616, 190]]) tree(v, x, 190, h, { bare: true });
  // 쐐기 돌
  const x = 350, y = 216, h = 150, w = 40;
  poly(ctx, [x - w, y, x - w * 0.62, y - h * 0.9, x - w * 0.1, y - h, x + w * 0.5, y - h * 0.86, x + w, y], t('#4c4c56')); poly(ctx, [x + w * 0.1, y, x - w * 0.1, y - h, x + w * 0.5, y - h * 0.86, x + w, y], t('#34343e'));
  for (let i = 0; i < 6; i++) stroke(ctx, [x - w * 0.7 + i * 4, y - 20 - i * 18, x - w * 0.4 + i * 4, y - 24 - i * 18], 1, rgba('#9ab0d0', 0.35));
  // 죽은 풀의 둥근 자리
  oval(ctx, x, y + 4, 150, 16, rgba(t('#2a2826'), 0.6));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let px = x - 6, py = y - h * 0.86; const crack = [px, py]; for (let i = 0; i < 7; i++) { px += (R() - 0.5) * 20; py += h * 0.11; crack.push(px, py); }
  stroke(ctx, crack, 4, rgba(BREATH, 0.3)); stroke(ctx, crack, 1.2, '#e8c8ff'); glow(v, x, y - 70, 130, BREATH, 0.26);
  // 새어 나와 사람 쪽으로 흐르는 숨
  for (let k = 0; k < 5; k++) { ctx.strokeStyle = rgba(BREATH, 0.2 - k * 0.025); ctx.lineWidth = 3 + k * 4; ctx.beginPath(); ctx.moveTo(x - 10, y - 74); ctx.bezierCurveTo(x - 50, y - 100 - k * 5, x - 70, y - 50 + k * 4, x - 100, y - 62); ctx.stroke(); }
  for (let i = 0; i < 40; i++) { ctx.fillStyle = rgba('#e0c0ff', 0.2 + R() * 0.5); ctx.fillRect(x - 120 + R() * 200, y - 20 - R() * 150, 1.3, 1.3); }
  ctx.restore();
  person(v, x - 112, 236, 100, mine(v, { f: 1, pose: 'kneel', arm: 'fwd', cloak: true, rim: 'rgba(200,150,240,.7)', rimDir: 1 }));
  // 멀리 능선의 횃불: 지키는 이들
  for (const [fx, fy] of [[520, 160], [540, 158], [566, 162]]) { person(v, fx, fy + 10, 24, { f: -1, cloth: '#14121a', hair: '#14121a' }); flame(v, fx + 5, fy - 12, 3); }
  finish(v, { noLeaves: true });
}
/** 그릇 옮기기: 두 돌판에 누운 두 몸과 그 사이를 건너는 빛 */
function vessel(v) {
  const { ctx, R } = v; room(v, { wall: '#201c22', floor: '#161218', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.12);
  for (const x of [80, 580]) { rect(ctx, x - 11, 0, 22, 172, '#1a161c'); rect(ctx, x - 15, 160, 30, 12, '#141016'); }
  // 바닥의 원과 새긴 글자
  const cx = 330, cy = 214; ring(ctx, cx, cy, 210, 24, 1.4, 'rgba(140,220,170,.4)'); ring(ctx, cx, cy, 186, 20, 0.8, 'rgba(140,220,170,.3)');
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; stroke(ctx, [cx + Math.cos(a) * 190, cy + Math.sin(a) * 20.6, cx + Math.cos(a) * 206, cy + Math.sin(a) * 23.4], 1, 'rgba(140,220,170,.4)'); }
  for (const [x, y] of [[cx - 216, cy], [cx + 216, cy], [cx - 110, cy - 22], [cx + 110, cy - 22], [cx - 110, cy + 22], [cx + 110, cy + 22]]) candle(v, x, y, 8);
  // 두 돌판
  const slab = (x) => { poly(ctx, [x - 78, 186, x + 78, 186, x + 86, 196, x - 86, 196], '#3e3a40'); rect(ctx, x - 86, 196, 172, 12, '#2a262c'); rect(ctx, x - 70, 208, 16, 12, '#1e1a20'); rect(ctx, x + 54, 208, 16, 12, '#1e1a20'); };
  slab(190); slab(470);
  // 왼쪽: 늙은 몸(나), 오른쪽: 젊은 몸
  lying(v, 124, 186, 130, { raw: true, cover: '#5a5660', skin: '#b8a090', hair: '#c8c4bc' });
  lying(v, 404, 186, 130, { raw: true, cover: '#6a665c', hair: v.me.hair });
  // 건너가는 것
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) { ctx.strokeStyle = rgba('#a0f0c0', 0.3 - k * 0.06); ctx.lineWidth = 1.6 + k * 4; ctx.beginPath(); ctx.moveTo(150, 168); ctx.bezierCurveTo(220, 60, 380, 60, 430, 168); ctx.stroke(); }
  glow(v, 150, 166, 40, '#a0f0c0', 0.3); glow(v, 430, 166, 54, '#a0f0c0', 0.46);
  for (let i = 0; i < 30; i++) { const tt = R(), x = 150 + tt * 280, y = 168 - Math.sin(tt * Math.PI) * 84 + (R() - 0.5) * 16; ctx.fillStyle = rgba('#d0ffe0', 0.3 + R() * 0.6); ctx.fillRect(x, y, 1.4, 1.4); }
  ctx.restore();
  // 의식을 맡은 두건
  person(v, cx, 176, 84, { raw: true, f: 1, cloth: '#14101a', hair: '#0c0a0e', robe: true, hood: true, arm: 'up', rim: 'rgba(160,240,190,.5)', rimDir: 1 });
  ctx.restore(); finish(v, { inside: true });
}
/** 이름을 바꾸고 떠나는 새벽: 닫힌 집을 뒤로하고 길에 선 사람 */
function depart(v) {
  const { ctx, t } = v; sky(v); far(v); townFar(v, 150, 146, { s: 1, n: 7 });
  const gy = (x) => 160 - fbm1(x / 200 + v.q, 3) * 7; ground(v, gy, { tufts: 120 });
  road(v, 430, 610, 152);
  cottage(v, 130, 196, 120, 56); rect(ctx, 96, 168, 18, 28, t('#1e1814')); stroke(ctx, [96, 170, 114, 194], 1.6, t('#5a4632')); stroke(ctx, [114, 170, 96, 194], 1.6, t('#5a4632'));
  tree(v, 236, 200, 150);
  // 문 앞에 두고 가는 것: 꽃 한 다발과 열쇠
  for (let i = -1; i <= 1; i++) stroke(ctx, [130, 214, 126 + i * 4, 204], 1, t('#4a6a3a')); oval(ctx, 126, 203, 2, 2, t('#d8d0c0')); oval(ctx, 131, 202, 2, 2, t('#d8d0c0'));
  // 길 위의 나: 돌아보지 않는다
  person(v, 420, 232, 104, mine(v, { f: 1, cloak: true, hood: true, stick: 'staff', rim: 'rgba(255,220,170,.55)', rimDir: 1 }));
  poly(ctx, [398, 176, 414, 172, 418, 196, 400, 200], t('#4a3a2a'));
  // 창가에서 내다보는 이웃 아이: 자라서 늙을 얼굴
  person(v, 566, 214, 52, folk(3, { f: -1, child: true }));
  finish(v);
}
/** 뒤를 막고 선 사람: 좁은 다리 어귀에 혼자, 등 뒤로 달아나는 사람들 */
function holdRear(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true });
  // 골짜기와 돌다리
  poly(ctx, [0, 150, 200, 166, 260, VH, 0, VH], t('#3e3c40')); poly(ctx, [VW, 140, 430, 164, 380, VH, VW, VH], t('#343238'));
  poly(ctx, [200, 166, 430, 164, 380, VH, 260, VH], t('#1a1a22'));
  ctx.fillStyle = t('#55535a'); ctx.beginPath(); ctx.moveTo(150, 196); ctx.lineTo(490, 196); ctx.lineTo(490, 210); ctx.quadraticCurveTo(320, 150, 150, 210); ctx.fill(); rect(ctx, 150, 190, 340, 8, t('#66646c'));
  for (let i = 0; i < 12; i++) rect(ctx, 156 + i * 29, 182, 5, 9, t('#4a4850'));
  // 다리 건너에서 몰려오는 횃불들
  pool(v, 80, 190, 120, 20, '#ff9a48', 0.3);
  for (const [x, y, h] of [[30, 196, 62], [58, 200, 66], [88, 196, 62], [116, 200, 64], [10, 202, 60]]) { person(v, x, y, h, { f: 1, cloth: '#16141a', hair: '#0e0c10', hat: x % 3 === 0 }); stroke(ctx, [x + 8, y - h * 0.6, x + 12, y - h * 1.1], 1.4, t('#2a2018')); flame(v, x + 12, y - h * 1.1 - 2, 5); }
  // 다리 어귀의 한 사람
  person(v, 230, 198, 92, mine(v, { f: -1, cloak: true, arm: 'fwd', rim: WARM, rimDir: -1 }));
  stroke(ctx, [214, 148, 176, 124], 2.4, t('#c8ccd4')); stroke(ctx, [216, 152, 212, 144], 3, t('#6a5030'));
  poly(ctx, [220, 198, 250, 198, 330, 204, 300, 208], rgba('#000000', 0.3));
  // 등 뒤로 달아나는 사람들
  for (const [x, y, h, i] of [[520, 206, 60, 1], [548, 210, 40, 3], [576, 204, 56, 4], [606, 208, 58, 0]]) person(v, x, y, h, folk(i, { f: 1, child: i === 3, pose: i === 4 ? 'bow' : undefined }));
  finish(v, { noLeaves: true });
}
/** 타고남: 갓난아이의 요람 위로 한 줄기 빛. 무엇을 쥐고 태어났는지는 아직 아무도 모른다 */
function gift(v) {
  const { ctx, R } = v; room(v, { stone: false, wall: '#2a241f', floor: '#1e1814', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.14);
  windowAt(v, 330, 30, 44, 60);
  rect(ctx, 0, 22, VW, 6, '#18120e'); for (const x of [150, 510]) rect(ctx, x - 4, 22, 8, 150, '#18120e');
  // 창에서 요람으로 내리는 빛
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, 60, 0, 210); g.addColorStop(0, 'rgba(200,220,255,.26)'); g.addColorStop(1, 'rgba(200,220,255,.04)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(314, 62); ctx.lineTo(346, 62); ctx.lineTo(392, 214); ctx.lineTo(268, 214); ctx.fill();
  for (let i = 0; i < 26; i++) { ctx.fillStyle = rgba('#e8f0ff', 0.3 + R() * 0.5); ctx.fillRect(290 + R() * 80, 70 + R() * 130, 1.2, 1.2); }
  ctx.restore();
  // 요람
  const cx = 330, cy = 206;
  ctx.fillStyle = '#4a3626'; ctx.beginPath(); ctx.moveTo(cx - 44, cy - 22); ctx.lineTo(cx + 44, cy - 22); ctx.lineTo(cx + 36, cy); ctx.lineTo(cx - 36, cy); ctx.fill(); rect(ctx, cx - 46, cy - 26, 92, 5, '#5a4632');
  ctx.strokeStyle = '#30241a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy - 26, 50, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  poly(ctx, [cx - 40, cy - 26, cx - 44, cy - 50, cx - 20, cy - 26], '#3e2e20');
  oval(ctx, cx - 4, cy - 28, 26, 7, '#b8b0a0'); oval(ctx, cx - 24, cy - 31, 6, 5.4, '#d0aa90');
  // 아이가 허공으로 뻗은 작은 손과 그 끝의 빛 하나
  stroke(ctx, [cx - 12, cy - 32, cx - 6, cy - 44], 2.2, '#d0aa90'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(v, cx - 5, cy - 50, 16, '#fff0c8', 0.7); ctx.fillStyle = '#fff8e0'; ctx.fillRect(cx - 6, cy - 51, 2, 2); ctx.restore();
  // 화덕 불과 식구: 어머니는 침상에, 아버지는 서서, 산파는 손을 씻는다
  rect(ctx, 520, 120, 60, 52, '#2e2826'); poly(ctx, [532, 172, 532, 146, 550, 136, 568, 146, 568, 172], '#100c0a'); flame(v, 548, 168, 8); glow(v, 550, 160, 110, '#ff9a48', 0.3);
  rect(ctx, 70, 176, 150, 8, '#3e2e20'); rect(ctx, 66, 150, 8, 56, '#30241a'); lying(v, 84, 176, 130, { raw: true, cover: '#6a6258', hair: v.other.hair });
  person(v, 246, 234, 104, { raw: true, f: 1, cloth: v.me.cloth, hair: v.me.hair, arm: 'chest', rim: COLD, rimDir: 1 });
  person(v, 450, 232, 92, folk(4, { raw: true, f: -1, female: true, long: false, old: true, hood: true, arm: 'fwd', rim: WARM, rimDir: -1 }));
  ctx.restore(); finish(v, { inside: true });
}

/** 마지막 새김: 마주 앉은 늙은이와 아이. 이마를 잇는 빛, 벽의 그림자는 둘 다 늙은이의 것 */
function imprint(v) {
  const { ctx, R } = v; room(v, { stone: false, wall: '#26222a', floor: '#1a161c', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.16);
  windowAt(v, 330, 30, 36, 54);
  // 벽의 두 그림자: 같은 모양
  for (const [x, d] of [[196, 1], [464, -1]]) { ctx.fillStyle = 'rgba(0,0,0,.36)'; ctx.beginPath(); ctx.ellipse(x, 74, 15, 17, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 24, 172); ctx.quadraticCurveTo(x - 30, 96, x - d * 4, 90); ctx.quadraticCurveTo(x + 30, 100, x + 26, 172); ctx.fill(); stroke(ctx, [x + d * 22, 172, x + d * 26, 70], 3, 'rgba(0,0,0,.36)'); }
  // 가운데 낮은 상: 거울과 초 하나
  rect(ctx, 300, 196, 60, 6, '#3a2e26'); rect(ctx, 306, 202, 6, 20, '#221a16'); rect(ctx, 348, 202, 6, 20, '#221a16'); candle(v, 316, 196, 9); oval(ctx, 342, 188, 9, 11, '#8a7038'); oval(ctx, 342, 188, 7, 9, '#8aa0b8');
  // 늙은 나와 후계자
  person(v, 240, 234, 100, { raw: true, f: 1, pose: 'sit', cloth: v.me.cloth, hair: '#c8c4bc', female: v.me.female, long: v.me.long, old: true, arm: 'fwd', rim: 'rgba(200,170,255,.55)', rimDir: 1 });
  person(v, 420, 234, 84, { raw: true, f: -1, pose: 'sit', cloth: '#3e4a40', hair: v.me.hair, arm: 'chest', rim: 'rgba(200,170,255,.55)', rimDir: -1 });
  // 이마에서 이마로
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) { ctx.strokeStyle = rgba('#c8a8ff', 0.36 - k * 0.07); ctx.lineWidth = 1.2 + k * 3; ctx.beginPath(); ctx.moveTo(258, 150); ctx.bezierCurveTo(300, 120, 370, 130, 408, 162); ctx.stroke(); }
  for (let i = 0; i < 9; i++) { const tt = i / 8, x = 258 + tt * 150, y = 150 - Math.sin(tt * Math.PI) * 22 + tt * 12; stroke(ctx, [x - 3, y, x, y - 4, x + 3, y, x, y + 4, x - 3, y], 0.8, rgba('#e8d8ff', 0.8 - tt * 0.4)); }
  glow(v, 258, 150, 30, '#c8a8ff', 0.4); glow(v, 408, 162, 36, '#c8a8ff', 0.5);
  for (let i = 0; i < 24; i++) { ctx.fillStyle = rgba('#e8d8ff', 0.3 + R() * 0.5); ctx.fillRect(250 + R() * 170, 100 + R() * 80, 1.2, 1.2); }
  ctx.restore();
  // 아이의 손에서 떨어진 것
  oval(ctx, 452, 228, 6, 3, '#8a6a40'); stroke(ctx, [448, 226, 456, 224], 1, '#5a4030');
  ctx.restore(); finish(v, { inside: true });
}

export const PLATES8 = {
  /** 불로. variant: noa seventh truename breath vessel depart rear imprint */
  ageless(v) { const k = v.variant ?? 'noa'; return k === 'seventh' ? seventh(v) : k === 'truename' ? truename(v) : k === 'breath' ? breath(v) : k === 'vessel' ? vessel(v) : k === 'depart' ? depart(v) : k === 'rear' ? holdRear(v) : k === 'imprint' ? imprint(v) : noa(v); },
  /** 타고남: 시작 화면 */
  gift(v) { return gift(v); },
};
