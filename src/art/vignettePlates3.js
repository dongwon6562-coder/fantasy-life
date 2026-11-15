// 12단계 삽화: 원수와 복수. (종족 땅·탐험 그림도 여기에 잇는다)
import { fbm1, mixh, rgba, dark, light, puff } from './sceneKit.js';
import { VW, VH, HZ, sky, far, townFar, ground, room, windowAt, glow, candle, pool, person, tree, crows, flame, finish, zoom } from './vignetteKit.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,180,100,.55)';
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const theirs = (v, o = {}) => ({ cloth: v.other.cloth, hair: v.other.hair, female: v.other.female, long: v.other.long, ...o });

/* ---------- 원수 ---------- */
/** 돌다리 위의 두 사람. variant 'turned' 서로 등지고 갈라섬, 'offer' 한쪽이 손을 내밂, 'peace' 맞잡은 손 */
function feudBridge(v) {
  const { ctx, t } = v, k = v.variant, dim = v.S.tod === 'night' || v.S.tod === 'dusk';
  sky(v); far(v); townFar(v, 520, HZ + 18, { s: 0.6 });
  const gy = (x) => 168 - fbm1(x / 160 + v.q, 3) * 7;
  ground(v, gy);
  // 개울
  const water = t(mixh('#4e6478', v.S.lit ?? '#8aa0b8', 0.25));
  if (k === 'turned') { tree(v, 108, 214, 170, { bare: true }); crows(v, 150, 60, 4); } else tree(v, 560, 216, 180);
  // 다리 몸통
  const by = (x) => 214 - 21 * (1 - ((x - 330) / 220) ** 2);
  const stone = t('#8a8276'), sh = t('#5c564e');
  ctx.fillStyle = stone; ctx.beginPath(); ctx.moveTo(110, 222); ctx.lineTo(110, by(110)); for (let x = 110; x <= 550; x += 10) ctx.lineTo(x, by(x)); ctx.lineTo(550, 222); ctx.lineTo(600, 262); ctx.lineTo(60, 262); ctx.closePath(); ctx.fill();
  // 아치 밑 어둠과 물
  ctx.fillStyle = dark(sh, 0.5); ctx.beginPath(); ctx.ellipse(330, 262, 96, 50, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = dark(water, 0.3); ctx.beginPath(); ctx.ellipse(330, 264, 96, 16, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = sh; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(330, 262, 99, 53, 0, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = 1; for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let x = 110; x <= 550; x += 20) ctx[x === 110 ? 'moveTo' : 'lineTo'](x, by(x) + 9 + i * 11); ctx.stroke(); }
  // 사람
  const rim = dim ? WARM : null;
  if (k === 'turned') {
    person(v, 232, by(232) + 2, 84, mine(v, { f: -1, cloak: true, rim, rimDir: -1 }));
    person(v, 432, by(432) + 2, 82, theirs(v, { f: 1, cloak: true, rim, rimDir: 1 }));
  } else if (k === 'peace') {
    person(v, 304, by(304) + 2, 84, mine(v, { f: 1, arm: 'fwd' }));
    person(v, 356, by(356) + 2, 82, theirs(v, { f: -1, arm: 'fwd' }));
  } else {
    person(v, 276, by(276) + 2, 84, mine(v, { f: 1, arm: 'chest' }));
    person(v, 372, by(372) + 2, 82, theirs(v, { f: -1, arm: 'fwd', old: v.other.age > 58 }));
  }
  // 난간 (정강이를 가린다)
  ctx.strokeStyle = light(stone, 0.08); ctx.lineWidth = 7; ctx.lineCap = 'butt'; ctx.beginPath(); for (let x = 104; x <= 556; x += 10) ctx[x === 104 ? 'moveTo' : 'lineTo'](x, by(x) - 4); ctx.stroke();
  ctx.strokeStyle = light(stone, 0.2); ctx.lineWidth = 1.6; ctx.beginPath(); for (let x = 104; x <= 556; x += 10) ctx[x === 104 ? 'moveTo' : 'lineTo'](x, by(x) - 8); ctx.stroke();
  for (const x of [104, 556]) { rect(ctx, x - 6, by(x) - 16, 12, 22, sh); rect(ctx, x - 7, by(x) - 18, 14, 3, light(stone, 0.12)); }
  if (k === 'turned') { // 다리 한가운데 버려진 것: 부러진 목검
    stroke(ctx, [322, by(322) - 10, 334, by(334) - 12], 1.6, t('#6a5038')); stroke(ctx, [338, by(338) - 10, 346, by(346) - 13], 1.6, t('#6a5038'));
  }
  finish(v);
}
/** 복수를 꾸미는 밤: 촛불 하나, 탁자에 꽂힌 칼, 이름 적힌 종이, 벽에 드리운 큰 그림자 */
function feudPlot(v) {
  const { ctx } = v, fy = room(v, { stone: false, wall: '#2e2824', floor: '#221c18', fy: 172 });
  ctx.save(); zoom(v, 330, 240, 1.25);
  windowAt(v, 200, 60, 34, 44);
  const tx = 340, ty = 202;
  // 벽의 큰 그림자
  ctx.fillStyle = 'rgba(4,4,8,.42)'; ctx.beginPath(); ctx.ellipse(tx - 96, 74, 30, 34, 0, 0, TAU); ctx.fill();
  poly(ctx, [tx - 150, 172, tx - 140, 110, tx - 118, 98, tx - 74, 98, tx - 52, 112, tx - 40, 172], 'rgba(4,4,8,.42)');
  poly(ctx, [tx - 60, ty - 40, tx + 66, ty - 40, tx + 80, ty - 26, tx - 74, ty - 26], '#4e3a2a'); rect(ctx, tx - 74, ty - 26, 154, 6, '#30241a'); rect(ctx, tx - 66, ty - 20, 6, 42, '#281e16'); rect(ctx, tx + 66, ty - 20, 6, 42, '#281e16');
  candle(v, tx + 34, ty - 34, 10); pool(v, tx + 20, ty - 40, 120, 50, '#ffb060', 0.22);
  // 종이와 그어 놓은 줄
  poly(ctx, [tx - 30, ty - 37, tx + 4, ty - 38, tx + 8, ty - 29, tx - 32, ty - 28], '#cfc2a2');
  for (let i = 0; i < 3; i++) stroke(ctx, [tx - 26, ty - 35 + i * 2.4, tx - 2 - i * 4, ty - 35.4 + i * 2.4], 0.7, '#3a2e26');
  stroke(ctx, [tx - 27, ty - 31, tx - 6, ty - 35], 1, '#7a2018');
  // 꽂힌 칼
  stroke(ctx, [tx + 2, ty - 33, tx + 10, ty - 54], 2, '#c4ccd4'); stroke(ctx, [tx + 6, ty - 52, tx + 15, ty - 55], 2.4, '#3a2a1c'); stroke(ctx, [tx + 10.5, ty - 55, tx + 14, ty - 64], 2.6, '#2a1c14');
  glow(v, tx + 7, ty - 46, 6, '#ffd8a0', 0.5);
  // 마시다 만 잔
  rect(ctx, tx + 52, ty - 42, 7, 9, '#6a5a48'); oval(ctx, tx + 55.5, ty - 42, 3.5, 1.2, '#2a1614');
  person(v, tx - 104, ty + 38, 110, mine(v, { raw: true, f: 1, arm: 'chest', rim: WARM, rimDir: 1 }));
  ctx.restore();
  finish(v, { inside: true });
}
/** 원수의 손: 밤길, 등불을 들고 걷는 나와 등 뒤 어둠 속의 칼 든 사람 */
function feudStrike(v) {
  const { ctx, t, R } = v;
  sky(v);
  rect(ctx, 250, 96, 160, 70, t('#34302e')); for (let x = 256; x < 400; x += 22) poly(ctx, [x, 100, x + 11, 84 + R() * 8, x + 22, 100], t('#28221f'));
  const wl = t('#544a44'), wr = t('#463e3a');
  poly(ctx, [-10, -20, 268, 52, 268, 164, -10, 262], wl); poly(ctx, [VW + 10, -20, 392, 52, 392, 164, VW + 10, 262], wr);
  poly(ctx, [268, 164, 392, 164, VW + 10, 262, -10, 262], t('#443e3a'));
  ctx.strokeStyle = rgba('#000000', 0.2); ctx.lineWidth = 1;
  for (let i = 1; i < 7; i++) { const k = i / 7; ctx.beginPath(); ctx.moveTo(-10, -20 + k * 282); ctx.lineTo(268, 52 + k * 112); ctx.moveTo(VW + 10, -20 + k * 282); ctx.lineTo(392, 52 + k * 112); ctx.stroke(); }
  for (let i = 0; i < 8; i++) { const k = i / 8, y0 = 164 + k * k * 98; ctx.beginPath(); ctx.moveTo(268 - k * k * 278, y0); ctx.lineTo(392 + k * k * 258, y0); ctx.stroke(); }
  // 닫힌 덧문과 먼 창 하나
  poly(ctx, [470, 92, 520, 82, 520, 128, 470, 130], t('#2a2018'));
  poly(ctx, [150, 96, 186, 102, 186, 130, 150, 128], '#c88a40'); glow(v, 168, 114, 30, '#ffb060', 0.22);
  // 등불 든 나 (앞서 걷는다)
  const mx = 352, my = 206;
  pool(v, mx + 8, my + 4, 90, 20, '#ffb060', 0.22);
  person(v, mx, my, 86, mine(v, { raw: true, f: 0, cloak: true, rim: WARM, rimDir: 1 }));
  stroke(ctx, [mx + 13, my - 46, mx + 17, my - 36], 1, '#1c1410'); rect(ctx, mx + 14, my - 36, 6, 8, '#f0c468'); glow(v, mx + 17, my - 32, 46, '#ffb060', 0.45);
  // 뒤에 길게 누운 내 그림자
  poly(ctx, [mx - 9, my, mx + 9, my, mx - 44, my + 56, mx - 86, my + 56], 'rgba(4,4,8,.4)');
  // 어둠 속의 원수: 화면 앞 왼쪽, 벽에 붙어 선 큰 뒷모습
  poly(ctx, [-10, -20, 96, -4, 96, 262, -10, 262], dark(wl, 0.5));
  const fx = 196, fy = 300;
  person(v, fx, fy, 196, { raw: true, f: 1, cloth: '#15131a', hair: '#0c0a0e', skin: '#2a2224', hood: true, cloak: true, rim: 'rgba(255,170,90,.35)', rimDir: 1 });
  // 낮게 쥔 칼날
  stroke(ctx, [fx + 30, 214, fx + 58, 246], 2.6, '#aab4c0'); stroke(ctx, [fx + 30, 214, fx + 44, 230], 1, '#f4f8ff'); stroke(ctx, [fx + 22, 206, fx + 30, 214], 4, '#1a1418');
  glow(v, fx + 44, 230, 9, '#ffd8a0', 0.45);
  finish(v, { noLeaves: true });
}

/* ---------- 탐험: 지도에 없는 땅 ---------- */
/** 원정대 한 줄: 앞장선 나와 짐을 진 사람들. (x, y)가 앞사람 발끝, dir 가는 쪽, gy(x) 땅 높이 */
function party(v, x, gy, dir, n, h, o = {}) {
  const { ctx, t, R } = v;
  for (let i = n - 1; i >= 0; i--) {
    const px = x - dir * i * h * (0.5 + (i ? 0.08 : 0)), py = gy(px), hh = h * (i ? 0.9 + R() * 0.08 : 1), s = hh / 100;
    if (i) { // 등짐
      rect(ctx, px - dir * 15 * s - 6 * s, py - 84 * s, 13 * s, 26 * s, t(['#6a5238', '#5a4a3a', '#74603e'][i % 3])); rect(ctx, px - dir * 15 * s - 7 * s, py - 90 * s, 15 * s, 7 * s, t('#8a7a5c'));
      person(v, px, py, hh, { f: dir, cloth: ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a'][i % 4], hair: '#2a1e16', hood: !!o.hood || i % 2 === 0, cloak: !!o.cloak, old: true, stick: i % 2 ? 'staff' : null, rim: o.rim, rimDir: dir });
    } else person(v, px, py, hh, { f: dir, cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, cloak: true, hood: !!o.hood, stick: o.torch ? 'torch' : 'staff', arm: o.torch ? 'up' : null, rim: o.rim, rimDir: dir });
  }
}
/** 가는 길. region: frost deepwood cloud mist ash */
function exploreMarch(v, region) {
  const { ctx, t, R } = v, night = v.S.tod === 'night';
  sky(v);
  if (region === 'frost') {
    // 흰 벌판, 먼 빙벽, 얼음에 갇힌 돛대들
    const ice = t('#c4d4e0'), far2 = t('#9fb4c8');
    ctx.fillStyle = far2; ctx.beginPath(); ctx.moveTo(0, HZ + 8); for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, HZ - 14 - fbm1(x / 60 + v.q, 3) * 26 - (x % 48 ? 0 : 8)); ctx.lineTo(VW, HZ + 8); ctx.fill();
    const gy = (x) => 186 - fbm1(x / 180 + v.q, 2) * 8;
    ctx.fillStyle = t('#e6edf2'); ctx.fillRect(0, HZ + 6, VW, VH); ctx.fillStyle = ice; ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 20) ctx.lineTo(x, gy(x) + 26 + fbm1(x / 40, 2) * 6); ctx.lineTo(VW, VH); ctx.fill();
    for (let i = 0; i < 9; i++) { const mx = 420 + i * 22 + R() * 8, my = HZ + 16 + R() * 6, mh = 22 + R() * 16; stroke(ctx, [mx, my, mx + 2, my - mh], 1.2, t('#5a6470')); stroke(ctx, [mx - 5, my - mh * 0.7, mx + 8, my - mh * 0.74], 0.8, t('#5a6470')); }
    for (let i = 0; i < 26; i++) { const x = R() * VW, y = HZ + 20 + R() * 90; stroke(ctx, [x, y, x + 18 + R() * 30, y - 1], 0.7, rgba('#ffffff', 0.5)); }
    for (let i = 0; i < 5; i++) { const px = 300 - i * 34; oval(ctx, px - 20, gy(px) + 2, 26, 2.4, rgba('#6a7c90', 0.3)); }
    if (night) for (let i = 0; i < 5; i++) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; puff(ctx, 120 + i * 100, 40 + Math.sin(i * 1.7) * 14, 90, 16, '#58e0a0', 0.16); ctx.restore(); }
    party(v, 330, gy, 1, 5, 62, { hood: true, cloak: true });
    for (let i = 0; i < 50; i++) { const x = R() * VW, y = R() * VH; stroke(ctx, [x, y, x + 10 + R() * 8, y + 2], 0.6, rgba('#ffffff', 0.4)); }
  } else if (region === 'deepwood') {
    // 한낮에도 어두운 숲: 집채만 한 나무 밑동 사이의 작은 사람들
    ctx.fillStyle = t('#16241c'); ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const x = 90 + i * 100 + R() * 30; const g = ctx.createLinearGradient(x, 0, x + 60, 200); g.addColorStop(0, 'rgba(170,220,150,.22)'); g.addColorStop(1, 'rgba(170,220,150,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 22, 0); ctx.lineTo(x + 96, 210); ctx.lineTo(x + 40, 210); ctx.fill(); ctx.restore(); }
    for (let i = 0; i < 9; i++) { const x = 20 + i * 76 + R() * 30, w = 16 + R() * 18; rect(ctx, x, 0, w, 190, t(dark('#2a3a2c', 0.1 + R() * 0.2))); }
    const gy = (x) => 204 - fbm1(x / 120 + v.q, 3) * 10;
    ctx.fillStyle = t('#24382a'); ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, gy(x) - 6); ctx.lineTo(VW, VH); ctx.fill();
    // 이끼 낀 깎은 돌 (누군가 길을 냈다)
    for (const [x, w] of [[392, 30], [430, 22], [470, 34]]) { rect(ctx, x, gy(x) - 16, w, 14, t('#5c6658')); rect(ctx, x, gy(x) - 18, w, 4, t('#4a7040')); }
    party(v, 340, gy, 1, 5, 44, { rim: 'rgba(190,230,160,.4)' });
    // 앞쪽의 거대한 밑동과 뿌리
    for (const [x, w] of [[-40, 130], [540, 150]]) { poly(ctx, [x, 0, x + w, 0, x + w * 1.08, 170, x + w * 1.3, VH, x - w * 0.3, VH, x - w * 0.08, 170], '#0e1612'); stroke(ctx, [x + w * 0.3, 0, x + w * 0.36, VH], 3, 'rgba(255,255,255,.03)'); }
    stroke(ctx, [70, 232, 130, 222, 190, 238], 10, '#0e1612'); stroke(ctx, [470, 238, 540, 224, 600, 236], 10, '#0e1612');
    for (let i = 0; i < 26; i++) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; puff(ctx, R() * VW, 40 + R() * 180, 1.6, 1.6, '#c8f0a0', 0.5); ctx.restore(); }
  } else if (region === 'cloud') {
    // 구름 위의 능선: 발밑에 구름 바다, 멀리 솟은 봉우리
    for (let i = 0; i < 5; i++) { const x = 60 + i * 140 + R() * 40, h = 40 + R() * 50; poly(ctx, [x - 46, HZ + 30, x - 8, HZ + 30 - h, x + 6, HZ + 36 - h, x + 50, HZ + 30], t('#7c8698')); poly(ctx, [x - 16, HZ + 38 - h, x - 8, HZ + 30 - h, x + 6, HZ + 36 - h, x + 12, HZ + 44 - h, x - 2, HZ + 40 - h], t('#eef2f6')); }
    for (let j = 0; j < 3; j++) for (let i = 0; i < 16; i++) puff(ctx, i * 46 + R() * 30 - 20, HZ + 28 + j * 16 + R() * 8, 46 + R() * 30, 12 + R() * 6, t(['#c8d2e0', '#dde4ee', '#eef2f8'][j]), 0.9);
    const gy = (x) => 214 - Math.max(0, 1 - Math.abs(x - 330) / 330) * 34 - fbm1(x / 70 + v.q, 3) * 8;
    ctx.fillStyle = t('#4e4a50'); ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 10) ctx.lineTo(x, gy(x)); ctx.lineTo(VW, VH); ctx.fill();
    ctx.fillStyle = rgba('#000000', 0.22); ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 10) ctx.lineTo(x, gy(x) + 14 + fbm1(x / 30, 2) * 10); ctx.lineTo(VW, VH); ctx.fill();
    for (let i = 0; i < 7; i++) { const x = 40 + i * 92 + R() * 30; oval(ctx, x, gy(x) + 1, 9 + R() * 8, 3, t('#e4e8ee')); }
    // 바위의 거대한 발톱 자국
    for (let i = 0; i < 3; i++) stroke(ctx, [476 + i * 12, gy(480) + 10, 500 + i * 12, gy(480) + 44], 3, rgba('#000000', 0.4));
    party(v, 350, gy, 1, 5, 58, { cloak: true, hood: true });
  } else if (region === 'mist') {
    // 안개 바다: 작은 배와 물 위로 솟은 탑 꼭대기들
    const sea = t('#5c7480'); ctx.fillStyle = sea; ctx.fillRect(0, HZ + 4, VW, VH);
    for (const [x, h, w] of [[420, 64, 16], [470, 96, 22], [530, 50, 14], [150, 40, 12]]) { const c = t('#6e7e84'); rect(ctx, x, HZ + 16 - h, w, h + 10, c); poly(ctx, [x - 4, HZ + 16 - h, x + w / 2, HZ - 4 - h - w, x + w + 4, HZ + 16 - h], dark(c, 0.14)); rect(ctx, x + w / 2 - 2, HZ + 30 - h, 4, 8, dark(c, 0.5)); oval(ctx, x + w / 2, HZ + 27, w, 2.4, rgba('#ffffff', 0.25)); }
    for (let i = 0; i < 30; i++) { const y = HZ + 12 + R() * 110, x = R() * VW; stroke(ctx, [x, y, x + 14 + R() * 26, y], 0.8, rgba('#ffffff', 0.16)); }
    // 배
    const bx = 280, by = 196;
    poly(ctx, [bx - 86, by - 16, bx + 96, by - 16, bx + 70, by + 8, bx - 66, by + 8], t('#3a2c22')); rect(ctx, bx - 86, by - 19, 182, 4, t('#5a4632'));
    rect(ctx, bx - 2, by - 120, 4, 104, t('#3a2c22')); poly(ctx, [bx + 4, by - 116, bx + 62, by - 60, bx + 4, by - 36], t('#b8ac94')); poly(ctx, [bx + 4, by - 116, bx + 62, by - 60, bx + 30, by - 70], rgba('#000000', 0.12));
    const deck = () => by - 14;
    person(v, bx + 72, deck(), 56, { f: 1, cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, cloak: true, arm: 'fwd' });
    for (const [dx, f] of [[-60, 1], [-30, 1], [28, -1]]) person(v, bx + dx, deck(), 48, { f, cloth: '#4a4038', hair: '#2a1e16', pose: 'sit' });
    poly(ctx, [bx - 86, by - 16, bx + 96, by - 16, bx + 92, by - 10, bx - 82, by - 10], t('#4a3a2a'));
    oval(ctx, bx, by + 10, 110, 4, rgba('#ffffff', 0.2));
    for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) puff(ctx, i * 84 + R() * 40 - 30, HZ - 6 + j * 34 + R() * 14, 80 + R() * 40, 12 + R() * 8, t('#c8d0d4'), 0.26);
  } else {
    // 재의 사막: 잿빛 모래 언덕, 유리가 된 검은 첨탑, 흐린 붉은 해
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; puff(ctx, 470, HZ - 34, 60, 60, '#c8402a', 0.3); ctx.restore(); oval(ctx, 470, HZ - 34, 15, 15, t('#d86a48'));
    for (let j = 0; j < 3; j++) { const c = t(['#6a6468', '#585358', '#48444a'][j]); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 12) ctx.lineTo(x, HZ + 10 + j * 30 - fbm1(x / (130 - j * 20) + v.q + j * 7, 2) * (22 + j * 6)); ctx.lineTo(VW, VH); ctx.fill(); if (j === 0) for (const [x, h] of [[90, 60], [124, 36], [540, 78], [572, 44], [240, 28]]) { poly(ctx, [x - 7, HZ + 12, x - 2, HZ + 12 - h, x + 3, HZ + 4 - h * 0.8, x + 8, HZ + 12], '#1a181e'); stroke(ctx, [x - 1, HZ + 8, x - 1, HZ + 16 - h], 0.8, rgba('#c8e0f0', 0.5)); } }
    const gy = (x) => 208 - fbm1(x / 90 + v.q + 14, 2) * 28;
    // 모래에 반쯤 묻힌 칼과 투구
    for (const x of [440, 462, 500]) stroke(ctx, [x, gy(x) + 12, x + 4, gy(x) - 8], 1.6, t('#8a8e94')); oval(ctx, 482, gy(482) + 10, 7, 5, t('#6a6e74'));
    party(v, 330, (x) => gy(x) + 14, 1, 5, 60, { cloak: true, hood: true, rim: 'rgba(255,140,100,.35)' });
    for (let i = 0; i < 60; i++) { const x = R() * VW, y = R() * VH; oval(ctx, x, y, 0.9, 0.9, rgba('#d8d0c8', 0.4)); }
  }
  finish(v, { noLeaves: true });
}
/** 가장 깊은 곳: 벼랑을 통째로 깎은 문 앞, 횃불을 든 작은 사람들. region마다 돌빛과 문 안의 빛이 다르다 */
function exploreHeart(v, region) {
  const { ctx, R } = v;
  const pal = { frost: ['#8ea4b8', '#a8e0ff', '#dfeaf2'], deepwood: ['#4a5a48', '#b8f0a0', '#2c3a2c'], cloud: ['#7a7c8c', '#fff0c0', '#c8cedc'], mist: ['#566a70', '#8ae0d8', '#3c5058'], ash: ['#3c383e', '#ff7a40', '#57505a'] }[region] ?? ['#6a665e', '#ffe0a0', '#4a463e'];
  const [stone, lightC, groundC] = pal;
  ctx.fillStyle = dark(stone, 0.72); ctx.fillRect(0, 0, VW, VH);
  // 벼랑 면
  for (let i = 0; i < 16; i++) { const x = i * 42 - 10 + R() * 10; rect(ctx, x, 0, 44, 190, dark(stone, 0.3 + R() * 0.22)); }
  // 문: 높이가 사람 스무 길
  const gx = 330, gw = 74, gt = 14, gb = 188;
  rect(ctx, gx - gw - 26, gt - 8, (gw + 26) * 2, gb - gt + 8, dark(stone, 0.12)); rect(ctx, gx - gw - 34, gt - 14, (gw + 34) * 2, 10, light(stone, 0.06));
  for (const d of [-1, 1]) { rect(ctx, gx + d * (gw + 13) - 11, gt, 22, gb - gt, stone); rect(ctx, gx + d * (gw + 13) - 11 + (d > 0 ? 11 : 0), gt, 11, gb - gt, rgba('#000000', 0.25)); for (let k = 0; k < 9; k++) rect(ctx, gx + d * (gw + 13) - 7, gt + 10 + k * 19, 14, 9, dark(stone, 0.3)); }
  ctx.fillStyle = '#060608'; ctx.beginPath(); ctx.moveTo(gx - gw, gb); ctx.lineTo(gx - gw, gt + 50); ctx.quadraticCurveTo(gx, gt - 10, gx + gw, gt + 50); ctx.lineTo(gx + gw, gb); ctx.fill();
  // 문 안의 빛 (조금 열린 틈)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(gx, gt + 30, gx, gb); g.addColorStop(0, rgba(lightC, 0)); g.addColorStop(1, rgba(lightC, 0.5)); ctx.fillStyle = g; ctx.fillRect(gx - 5, gt + 36, 10, gb - gt - 36); puff(ctx, gx, gb - 30, 60, 90, lightC, 0.2); puff(ctx, gx, gb, 110, 22, lightC, 0.22); ctx.restore();
  // 문 위의 눈 모양 새김
  ctx.strokeStyle = dark(stone, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(gx, gt + 2, 22, 7, 0, 0, TAU); ctx.stroke(); oval(ctx, gx, gt + 2, 4, 4, dark(stone, 0.5));
  // 바닥과 계단
  ctx.fillStyle = dark(groundC, 0.35); ctx.fillRect(0, gb, VW, VH - gb);
  for (let k = 0; k < 5; k++) { rect(ctx, gx - gw - 30 - k * 16, gb + k * 7, (gw + 30 + k * 16) * 2, 7, dark(groundC, 0.2 + k * 0.05)); rect(ctx, gx - gw - 30 - k * 16, gb + k * 7, (gw + 30 + k * 16) * 2, 1.2, rgba('#ffffff', 0.1)); }
  if (region === 'frost') for (let i = 0; i < 14; i++) { const x = 20 + R() * 600; poly(ctx, [x - 4, 0, x + 4, 0, x, 14 + R() * 30], rgba('#dff0ff', 0.6)); }
  if (region === 'deepwood') for (let i = 0; i < 7; i++) { const x = 40 + i * 92 + R() * 20; ctx.strokeStyle = '#1c2a1c'; ctx.lineWidth = 6 + R() * 6; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 30, 60, x - 40, 120, x + (x < gx ? 30 : -30), 200); ctx.stroke(); }
  if (region === 'mist') { rect(ctx, 0, gb + 22, VW, VH, rgba('#3a6068', 0.55)); for (let i = 0; i < 16; i++) { const x = R() * VW, y = gb + 26 + R() * 24; stroke(ctx, [x, y, x + 16 + R() * 24, y], 0.8, rgba('#c8f0f0', 0.3)); } }
  if (region === 'ash') for (let i = 0; i < 40; i++) oval(ctx, R() * VW, R() * VH, 1, 1, rgba('#d8c8c0', 0.4));
  if (region === 'cloud') for (let i = 0; i < 30; i++) oval(ctx, gx - 60 + R() * 120, gt + 40 + R() * 130, 0.9, 0.9, rgba('#fff4d0', 0.7));
  // 사람들: 횃불 든 나와 일행
  const py = gb + 34;
  person(v, 250, py, 34, { raw: true, f: 1, cloth: '#3e4a40', hair: '#2a1e16', hood: true, rim: WARM, rimDir: 1 });
  person(v, 276, py + 2, 36, { raw: true, f: 1, cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, cloak: true, stick: 'torch', rim: WARM, rimDir: 1 });
  flame(v, 276 + 6.5, py + 2 - 37, 0.5); glow(v, 282, py - 34, 44, '#ffb060', 0.4); pool(v, 280, py + 2, 60, 9, '#ffb060', 0.2);
  person(v, 226, py + 4, 34, { raw: true, f: 1, cloth: '#54463a', hair: '#2a1e16', old: true, stick: 'staff' });
  finish(v, { inside: true });
}

/* ---------- 다른 종족의 땅 ---------- */
/** 엘프의 숲: 세계수 뿌리 아래 빈터, 등불과 긴 옷의 엘프들. fall이면 낙엽 지는 밤의 노래, 아니면 봄의 이슬 받기 */
function peoplesElf(v, fall) {
  const { ctx, t, R } = v;
  sky(v);
  // 먼 숲 벽과 은빛 줄기
  rect(ctx, 0, 40, VW, 150, t(fall ? '#2a2c26' : '#3c5240'));
  for (let i = 0; i < 14; i++) { const x = i * 48 + R() * 20, w = 8 + R() * 10; rect(ctx, x, 0, w, 176, t(mixh('#8a9088', '#3a4a3c', R() * 0.5))); }
  for (let i = 0; i < 22; i++) puff(ctx, R() * VW, R() * 60, 50 + R() * 40, 22 + R() * 14, t(fall ? ['#a8642c', '#8a4a24', '#b88434'][i % 3] : ['#4a7a4a', '#5a8a52', '#3c6a44'][i % 3]), 0.85);
  const gy = (x) => 190 - fbm1(x / 140 + v.q, 2) * 6;
  ctx.fillStyle = t(fall ? '#4a4030' : '#44603e'); ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 16) ctx.lineTo(x, gy(x) - 14); ctx.lineTo(VW, VH); ctx.fill();
  // 세계수의 뿌리 (오른쪽을 가득 채운다)
  const bark = t('#6e6a5c');
  ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(470, 0); ctx.bezierCurveTo(460, 90, 420, 150, 372, 196); ctx.lineTo(VW, 214); ctx.lineTo(VW, 0); ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.moveTo(540, 0); ctx.bezierCurveTo(530, 100, 520, 160, 500, 206); ctx.lineTo(VW, 214); ctx.lineTo(VW, 0); ctx.fill();
  for (const [x0, y0, x1, y1, w] of [[440, 120, 330, 200, 16], [470, 150, 420, 214, 12], [560, 150, 600, 220, 18]]) { ctx.strokeStyle = dark(bark, 0.1); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 10, x1, y1); ctx.stroke(); }
  // 줄에 건 등불
  const lamp = fall ? '#ffb060' : '#d8f0c0';
  ctx.strokeStyle = rgba('#000000', 0.4); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(40, 70); ctx.quadraticCurveTo(250, 120, 452, 84); ctx.stroke();
  for (let i = 0; i < 8; i++) { const k = (i + 0.5) / 8, x = 40 + k * 412, y = 70 + 14 * k + Math.sin(k * Math.PI) * 30; oval(ctx, x, y + 5, 2.6, 3.6, lamp); glow(v, x, y + 5, fall ? 26 : 16, lamp, fall ? 0.4 : 0.25); }
  // 사람들
  const robe = ['#c8d0c0', '#b8c4c8', '#d0c8b0', '#a8b8a8', '#c0c8d0'], hair = ['#e0d8b8', '#d8dce0', '#c8b890', '#e8e4d0'];
  const rim = fall ? WARM : 'rgba(220,250,200,.4)';
  [[176, 206, 1], [214, 200, 1], [372, 208, -1], [410, 204, -1]].forEach(([x, y, f], i) => person(v, x, y, 84 + (i % 2) * 6, { f, cloth: robe[i], hair: hair[i], female: i % 2 === 0, long: true, robe: true, arm: fall ? 'up' : 'chest', rim, rimDir: f }));
  if (fall) {
    person(v, 256, 212, 86, mine(v, { f: 1, arm: 'chest', rim, rimDir: 1 }));
    person(v, 316, 208, 92, { f: -1, cloth: robe[4], hair: hair[1], long: true, robe: true, arm: 'up', old: true, rim, rimDir: -1 });
    for (let i = 0; i < 46; i++) { const x = R() * VW, y = R() * VH; ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 3); oval(ctx, 0, 0, 2.6, 1.2, ['#c8742c', '#a8521e', '#d8a03c'][i % 3]); ctx.restore(); }
  } else {
    // 잎에서 떨어지는 이슬과 그릇, 아기를 안은 어머니
    person(v, 262, 210, 86, mine(v, { f: 1, arm: 'fwd' }));
    person(v, 322, 208, 88, { f: -1, cloth: robe[2], hair: hair[0], female: true, long: true, robe: true, arm: 'chest' });
    oval(ctx, 309, 208 - 54, 6.5, 5, t('#e8e4d8')); oval(ctx, 306, 208 - 57, 2.6, 2.6, t('#d8b8a0'));
    stroke(ctx, [300, 60, 292, 100], 1.2, t('#4a7a4a')); poly(ctx, [292, 100, 284, 112, 296, 118, 302, 106], t('#6aa05a'));
    oval(ctx, 290, 126, 1.6, 2.4, '#e8fff0'); glow(v, 290, 126, 14, '#c8ffe0', 0.6); glow(v, 290, 150, 26, '#c8ffe0', 0.2);
  }
  for (let i = 0; i < 18; i++) glow(v, R() * VW, 60 + R() * 150, 1.4, fall ? '#ffd080' : '#d8ffb0', 0.5);
  finish(v, { noLeaves: true });
}
/** 드워프의 산: 바위를 깎은 큰 방과 화로. hammer면 모루 앞에서 망치를 든 젊은이, 아니면 화로를 지키며 밤을 새우는 사람들 */
function peoplesDwarf(v, hammer) {
  const { ctx, R } = v, fy = room(v, { wall: '#3a3432', floor: '#2a2624', fy: 176 });
  // 굵은 기둥과 새긴 무늬
  for (const x of [70, 200, 440, 570]) { rect(ctx, x - 18, 0, 36, fy, '#4a4440'); rect(ctx, x - 18, 0, 10, fy, 'rgba(0,0,0,.25)'); rect(ctx, x - 22, fy - 12, 44, 12, '#544e48'); rect(ctx, x - 22, 20, 44, 8, '#544e48'); for (let k = 0; k < 5; k++) { ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1.2; ctx.strokeRect(x - 7, 40 + k * 24, 14, 14); } }
  // 화로: 벽을 판 아치, 위에 조상의 이름
  const hx = 320;
  rect(ctx, hx - 70, 40, 140, fy - 40, '#2e2a28'); ctx.fillStyle = '#0c0908'; ctx.beginPath(); ctx.moveTo(hx - 50, fy); ctx.lineTo(hx - 50, 108); ctx.quadraticCurveTo(hx, 64, hx + 50, 108); ctx.lineTo(hx + 50, fy); ctx.fill();
  rect(ctx, hx - 78, 34, 156, 10, '#5a524a');
  for (let i = 0; i < 9; i++) { const x = hx - 56 + i * 14; stroke(ctx, [x, 50, x, 58, x + 5, 54], 1.1, '#8a7a5c'); }
  flame(v, hx, fy - 4, 13); flame(v, hx - 22, fy - 2, 8); flame(v, hx + 24, fy - 2, 9);
  glow(v, hx, fy - 30, 150, '#ff8a3a', 0.35); pool(v, hx, fy + 20, 220, 40, '#ff8a3a', 0.25);
  const rim = 'rgba(255,150,70,.6)', C = ['#5a3a2a', '#44403c', '#4a3428', '#3a3e44', '#5a4a30'], H = ['#8a4a24', '#2a1e16', '#b8b4ac', '#6a3a1c'];
  if (hammer) {
    // 모루와 달군 쇠
    const ax = 300, ay = fy + 46;
    poly(ctx, [ax - 22, ay - 26, ax + 26, ay - 26, ax + 18, ay - 18, ax + 8, ay - 16, ax + 10, ay, ax - 12, ay, ax - 10, ay - 16, ax - 16, ay - 18], '#2a2a30'); rect(ctx, ax - 22, ay - 28, 48, 3, '#4a4a54');
    rect(ctx, ax - 10, ay - 31, 30, 3, '#ffb060'); glow(v, ax + 5, ay - 30, 22, '#ffb060', 0.6);
    person(v, ax - 44, ay + 4, 70, mine(v, { raw: true, f: 1, arm: 'up', rim, rimDir: 1 }));
    stroke(ctx, [ax - 30, ay - 74, ax - 20, ay - 92], 2.4, '#3a2a1c'); rect(ctx, ax - 28, ay - 100, 16, 9, '#5a5a64');
    for (let i = 0; i < 16; i++) { const an = -Math.PI * R(), d = 8 + R() * 30; glow(v, ax + 5 + Math.cos(an) * d, ay - 30 + Math.sin(an) * d, 1.4, '#ffd080', 0.9); }
    person(v, ax + 70, ay + 2, 66, { raw: true, f: -1, cloth: C[0], hair: H[2], hood: false, old: true, arm: 'chest', rim, rimDir: -1 });
    [[150, fy + 30, 1], [196, fy + 22, 1], [452, fy + 24, -1], [496, fy + 32, -1]].forEach(([x, y, f], i) => person(v, x, y, 60 + (i % 2) * 5, { raw: true, f, cloth: C[i + 1], hair: H[i], rim, rimDir: f }));
  } else {
    [[206, fy + 34, 1], [250, fy + 22, 1], [392, fy + 22, -1], [438, fy + 34, -1]].forEach(([x, y, f], i) => { person(v, x, y, 62 + (i % 2) * 4, { raw: true, pose: 'sit', f, cloth: C[i], hair: H[i], rim, rimDir: f }); rect(ctx, x + f * 14, y - 30, 6, 8, '#6a5a48'); });
    person(v, 300, fy + 52, 70, mine(v, { raw: true, pose: 'sit', f: 0, rim, rimDir: 1 }));
    person(v, 348, fy + 50, 64, { raw: true, pose: 'sit', f: 0, cloth: C[4], hair: H[0], rim, rimDir: -1 });
    // 장작 더미
    for (let i = 0; i < 5; i++) rect(ctx, 500 + (i % 3) * 14, fy + 8 - Math.floor(i / 3) * 8, 13, 7, i % 2 ? '#5a4230' : '#4a3626');
  }
  finish(v, { inside: true });
}
/** 수인의 초원. hunt면 큰 뿔 들소를 쫓는 사냥, 아니면 토템 기둥 아래 모닥불의 밤 */
function peoplesBeast(v, hunt) {
  const { ctx, t, R } = v;
  sky(v); far(v);
  const gy = (x) => 172 - fbm1(x / 200 + v.q, 2) * 8;
  ground(v, gy);
  for (let i = 0; i < 90; i++) { const x = R() * VW, y = 170 + R() * 70; stroke(ctx, [x, y, x + 2, y - 5 - R() * 5], 0.8, t('#a89858')); }
  if (hunt) {
    // 달아나는 들소 떼와 흙먼지
    for (let i = 0; i < 10; i++) puff(ctx, 380 + i * 26 + R() * 10, 196 + R() * 10, 26 + R() * 14, 9 + R() * 4, t('#b8a070'), 0.35);
    for (const [x, y, s] of [[560, 182, 0.6], [520, 188, 0.7], [470, 196, 0.9], [414, 204, 1.15]]) { const c = t('#2e2420'); oval(ctx, x, y - 16 * s, 24 * s, 13 * s, c); oval(ctx, x + 14 * s, y - 24 * s, 13 * s, 12 * s, c); oval(ctx, x + 26 * s, y - 16 * s, 8 * s, 8 * s, c); stroke(ctx, [x + 24 * s, y - 22 * s, x + 31 * s, y - 28 * s, x + 28 * s, y - 32 * s], 1.8 * s, t('#d8d0b8')); for (const [dx, a] of [[-16, -6], [-8, 4], [10, -5], [18, 6]]) stroke(ctx, [x + dx * s, y - 8 * s, x + (dx + a) * s, y + 2 * s], 3 * s, c); }
    [[130, 214, 70], [186, 208, 76], [78, 220, 66]].forEach(([x, y, h], i) => person(v, x, y, h, { f: 1, cloth: ['#6a4a30', '#5a3e2a', '#74583a'][i], hair: ['#8a6a44', '#3a2a1e', '#b89a6a'][i], stick: 'spear', tilt: 0.35, arm: 'fwd' }));
    person(v, 256, 212, 80, mine(v, { f: 1, stick: 'spear', tilt: 0.4, arm: 'fwd' }));
  } else {
    // 천막, 토템 기둥, 모닥불
    for (const [x, w] of [[90, 30], [150, 22], [560, 28]]) { const y = gy(x) + 6, c = t('#a88a62'); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w, y - w * 0.4); ctx.quadraticCurveTo(x, y - w * 1.1, x + w, y - w * 0.4); ctx.lineTo(x + w, y); ctx.fill(); rect(ctx, x - 3, y - w * 0.36, 6, w * 0.36, t('#2a1c14')); }
    for (const [x, h] of [[408, 132], [448, 156], [490, 124]]) { const y = gy(x) + 26, c = t('#5a4230'); rect(ctx, x - 7, y - h, 14, h, c); rect(ctx, x - 7, y - h, 5, h, rgba('#000000', 0.25)); for (let k = 0; k < Math.floor(h / 30); k++) { const yy = y - h + 10 + k * 30; rect(ctx, x - 9, yy, 18, 3, dark(c, 0.3)); oval(ctx, x - 3, yy + 10, 1.6, 1.6, '#e8c890'); oval(ctx, x + 3, yy + 10, 1.6, 1.6, '#e8c890'); stroke(ctx, [x - 3, yy + 17, x + 3, yy + 17], 1.2, dark(c, 0.5)); } stroke(ctx, [x - 7, y - h, x - 18, y - h - 12], 2.4, c); stroke(ctx, [x + 7, y - h, x + 18, y - h - 12], 2.4, c); }
    const fx = 300, fyy = 214;
    stroke(ctx, [fx - 14, fyy, fx + 10, fyy - 6], 3, '#2a1c14'); stroke(ctx, [fx + 14, fyy, fx - 10, fyy - 6], 3, '#2a1c14');
    flame(v, fx, fyy - 4, 11); glow(v, fx, fyy - 24, 130, '#ff8a3a', 0.32); pool(v, fx, fyy + 6, 170, 22, '#ff8a3a', 0.28);
    const rim = 'rgba(255,150,70,.6)';
    [[196, 220, 1], [236, 212, 1], [366, 212, -1], [404, 222, -1]].forEach(([x, y, f], i) => person(v, x, y, 74 + (i % 2) * 6, { raw: true, f, cloth: ['#6a4a30', '#5a3e2a', '#74583a', '#4a3a2c'][i], hair: ['#8a6a44', '#3a2a1e', '#b89a6a', '#d8d0c0'][i], cloak: i === 3, old: i === 3, stick: i === 3 ? 'staff' : null, rim, rimDir: f }));
    person(v, 270, 228, 82, mine(v, { raw: true, f: 1, arm: 'chest', rim, rimDir: 1 }));
  }
  finish(v, { noLeaves: true });
}

/* ---------- 제자와 문하 ---------- */
/** 문하의 마당: 뒤로 낮은 집과 문, 연습 말뚝과 무기 걸이. variant 'lesson' 가르침, 'bow' 절하는 제자, 'found' 새 현판을 건 날 */
function mentorYard(v) {
  const { ctx, t, R } = v, k = v.variant ?? 'lesson', dim = v.S.tod === 'night' || v.S.tod === 'dusk', rim = dim ? WARM : null;
  sky(v); far(v);
  const gy = () => 172;
  ground(v, gy);
  // 마당 흙바닥
  poly(ctx, [0, 180, VW, 180, VW, VH, 0, VH], t('#8a7658')); for (let i = 0; i < 30; i++) oval(ctx, R() * VW, 186 + R() * 50, 8 + R() * 20, 1.2, rgba('#000000', 0.06));
  // 집: 돌 밑단, 흙벽, 낮은 지붕, 가운데 문
  const hx = 250, hw = 330, wallTop = 96, roof = t('#4a3a30');
  rect(ctx, hx, wallTop, hw, 86, t('#b8a888')); rect(ctx, hx, 164, hw, 18, t('#7c766c'));
  for (let x = hx + 20; x < hx + hw; x += 46) rect(ctx, x, wallTop, 5, 68, t('#5a4632'));
  poly(ctx, [hx - 22, wallTop + 4, hx + 30, 62, hx + hw - 30, 62, hx + hw + 22, wallTop + 4], roof); poly(ctx, [hx - 22, wallTop + 4, hx + hw + 22, wallTop + 4, hx + hw + 18, wallTop + 10, hx - 18, wallTop + 10], dark(roof, 0.3));
  const dx = hx + hw / 2;
  rect(ctx, dx - 26, 112, 52, 70, t('#2a1e16')); rect(ctx, dx - 30, 108, 60, 5, t('#5a4632')); if (dim) { glow(v, dx, 150, 46, '#ffb060', 0.3); rect(ctx, dx - 20, 118, 40, 64, 'rgba(255,170,90,.25)'); }
  // 현판
  const sign = k === 'found';
  rect(ctx, dx - 44, 82, 88, 22, t(sign ? '#3a2416' : '#4a3a2a')); ctx.strokeStyle = t(sign ? '#c9a25a' : '#6a5a40'); ctx.lineWidth = 1.4; ctx.strokeRect(dx - 44, 82, 88, 22);
  for (let i = 0; i < 4; i++) { const x = dx - 30 + i * 20; stroke(ctx, [x, 87, x + 8, 87, x + 4, 87, x + 4, 99, x, 95, x + 9, 96], 1.5, t(sign ? '#e8c880' : '#8a7a5c')); }
  if (sign) { for (const d of [-1, 1]) { stroke(ctx, [dx + d * 48, 80, dx + d * 62, 70, dx + d * 60, 100], 2, '#8c2a1a'); poly(ctx, [dx + d * 60, 100, dx + d * 56, 112, dx + d * 64, 112], '#8c2a1a'); } }
  // 연습 말뚝과 무기 걸이
  for (const x of [96, 150]) { rect(ctx, x - 4, 142, 8, 62, t('#5a4632')); rect(ctx, x - 14, 154, 28, 5, t('#5a4632')); stroke(ctx, [x - 4, 148, x + 4, 150, x - 4, 153], 1.4, t('#b8a888')); oval(ctx, x, 205, 12, 2.4, rgba('#000000', 0.18)); }
  rect(ctx, 600, 150, 4, 50, t('#4a3a2a')); rect(ctx, 560, 150, 4, 50, t('#4a3a2a')); rect(ctx, 556, 158, 52, 3, t('#4a3a2a')); for (let i = 0; i < 4; i++) stroke(ctx, [566 + i * 11, 196, 569 + i * 11, 134], 1.6, t(i % 2 ? '#6a5038' : '#8a8e94'));
  const ot = v.other, pup = (x, y, h, o2 = {}) => person(v, x, y, h, { cloth: ot.cloth, hair: ot.hair, female: ot.female, long: ot.long, rim, rimDir: 1, ...o2 });
  if (k === 'bow') {
    person(v, 372, 226, 104, mine(v, { f: -1, old: v.me.age > 55, arm: 'chest', rim, rimDir: -1 }));
    pup(292, 228, 96, { f: 1, pose: 'bow' });
    stroke(ctx, [300, 229, 334, 226], 2.4, t('#6a5038'));
  } else if (k === 'found') {
    person(v, dx - 70, 214, 100, mine(v, { f: 1, arm: 'up', rim, rimDir: 1 }));
    [[150, 232, 0], [196, 226, 1], [240, 232, 2], [470, 228, 3], [520, 234, 4]].forEach(([x, y, i]) => person(v, x, y, 84 + (i % 2) * 6, { f: x < dx ? 1 : -1, cloth: ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a'][i], hair: ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e'][i], female: i === 1 || i === 4, long: i === 1, rim, rimDir: x < dx ? 1 : -1 }));
  } else {
    pup(190, 224, 92, { f: -1, stick: 'staff', tilt: -0.5, arm: 'fwd' });
    person(v, 300, 226, 104, mine(v, { f: -1, old: v.me.age > 55, arm: 'chest', rim, rimDir: -1 }));
    person(v, 440, 216, 78, { f: -1, cloth: '#54463a', hair: '#2a1e16', child: true, rim, rimDir: -1 });
  }
  finish(v, { noLeaves: true });
}

export const PLATES3 = {
  /** 원수. variant: turned offer peace plot strike */
  feud(v) { const k = v.variant ?? 'turned'; return k === 'plot' ? feudPlot(v) : k === 'strike' ? feudStrike(v) : feudBridge(v); },
  /** 제자와 문하. variant: lesson bow found */
  mentor: mentorYard,
  /** 다른 종족의 땅. variant는 의식 id: elf_dew elf_fall dwarf_fire dwarf_hammer beast_hunt beast_totem */
  peoples(v) { const k = v.variant ?? 'elf_dew'; return k.startsWith('dwarf') ? peoplesDwarf(v, k === 'dwarf_hammer') : k.startsWith('beast') ? peoplesBeast(v, k === 'beast_hunt') : peoplesElf(v, k === 'elf_fall'); },
  /** 탐험. variant: frost deepwood cloud mist ash (가는 길), heart-<땅> (가장 깊은 곳) */
  explore(v) { const k = v.variant ?? 'frost'; return k.startsWith('heart-') ? exploreHeart(v, k.slice(6)) : exploreMarch(v, k); },
};
