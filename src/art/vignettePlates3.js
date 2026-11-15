// 12단계 삽화: 원수와 복수. (종족 땅·탐험 그림도 여기에 잇는다)
import { fbm1, mixh, rgba, dark, light } from './sceneKit.js';
import { VW, HZ, sky, far, townFar, ground, room, windowAt, glow, candle, pool, person, tree, crows, finish, zoom } from './vignetteKit.js';

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

export const PLATES3 = {
  /** 원수. variant: turned offer peace plot strike */
  feud(v) { const k = v.variant ?? 'turned'; return k === 'plot' ? feudPlot(v) : k === 'strike' ? feudStrike(v) : feudBridge(v); },
};
