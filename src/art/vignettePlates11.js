// 32단계 삽화: 건국(선포, 대관, 무너진 왕좌), 하늘 기수(둥지와 알, 날개 펼친 마수, 하늘에서 본 땅, 길들이는 마당),
// 포구(새벽 고깃배, 폭풍, 생선 말리는 장대, 돌아오지 않는 배).
import { fbm1, hash, rgba, dark, light, mixh } from './sceneKit.js';
import { VW, VH, HZ, sky, far, ground, room, windowAt, shaft, glow, flame, blaze, candle, pool, smoke, person, crowd, tree, banner, crows, finish, zoom } from './vignetteKit.js';
import { cottage } from './vignettePlates4.js';
import { spear, torch } from './vignettePlates5.js';
import { column, rubble } from './vignettePlates10.js';

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
// 새 나라의 깃발: 짙은 청록 바탕에 금빛 띠 (어느 나라 깃발과도 닮지 않게)
const FLAG = '#2c4852', GOLD = '#b8963c';

/** 새 나라의 깃발 천 (벽에 드리운 것). 아래가 제비꼬리로 갈라진다 */
function hanging(v, x, y, w, h, o = {}) {
  const { ctx } = v, c = o.raw ? FLAG : v.t(FLAG), g = o.raw ? GOLD : v.t(GOLD);
  poly(ctx, [x - w / 2, y, x + w / 2, y, x + w / 2, y + h, x, y + h * 0.86, x - w / 2, y + h], c);
  rect(ctx, x - w / 2, y + h * 0.3, w, h * 0.09, g); rect(ctx, x - w / 2, y + h * 0.45, w, h * 0.035, g);
  rect(ctx, x - w / 2 - 3, y - 3, w + 6, 3.5, o.raw ? '#6a5630' : v.t('#6a5630'));
}
/** 왕관: 테와 뾰족한 가지 다섯 */
function crown(ctx, x, y, s, c, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(-7 * s, 0); ctx.lineTo(-7.6 * s, -7 * s); ctx.lineTo(-4.4 * s, -3.4 * s); ctx.lineTo(-2.6 * s, -8.4 * s); ctx.lineTo(0, -3.6 * s); ctx.lineTo(2.6 * s, -8.4 * s); ctx.lineTo(4.4 * s, -3.4 * s); ctx.lineTo(7.6 * s, -7 * s); ctx.lineTo(7 * s, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark(c, 0.3); ctx.fillRect(-7 * s, -1.6 * s, 14 * s, 1.6 * s);
  ctx.restore();
}
/** 거친 나무 옥좌 (높은 등받이). rot으로 쓰러뜨린다 */
function throne(ctx, x, y, s, c, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rect(ctx, -20, -84, 40, 84, c); poly(ctx, [-20, -84, -24, -98, -14, -90, 0, -104, 14, -90, 24, -98, 20, -84], c);
  rect(ctx, -26, -40, 52, 9, light(c, 0.1)); rect(ctx, -26, -52, 7, 52, dark(c, 0.15)); rect(ctx, 19, -52, 7, 52, dark(c, 0.15));
  rect(ctx, -14, -76, 28, 30, dark(c, 0.3));
  ctx.restore();
}
/** 바다: y0부터 아래. rough가 클수록 물결이 거칠다 */
export function seaAt(v, y0, o = {}) {
  const { ctx, t, R, P, S } = v, c = o.color ?? P.water ?? '#4e6478', rough = o.rough ?? 1;
  const g = ctx.createLinearGradient(0, y0, 0, VH); g.addColorStop(0, t(mixh(c, S.low, 0.55))); g.addColorStop(0.4, t(c)); g.addColorStop(1, t(dark(c, 0.42)));
  ctx.fillStyle = g; ctx.fillRect(0, y0, VW, VH - y0 + 30);
  const n = o.n ?? 130, hi = light(t(c), 0.34), lo = dark(t(c), 0.3);
  for (let i = 0; i < n; i++) {
    const d = R(), y = y0 + 2 + d * d * (VH - y0), w = 5 + d * 26, x = R() * VW;
    ctx.strokeStyle = rgba(R() < 0.5 ? hi : lo, 0.26 + d * 0.22); ctx.lineWidth = 0.6 + d; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y - (1 + d * 2.4) * rough, x + w, y); ctx.stroke();
  }
}
/** 작은 고깃배 옆모습. y는 물금, s 1이면 길이 66쯤. o.sail 'set'|'furled'|'torn'|null, o.lamp 뱃머리 등불, o.crew [[dx, h, 옷]] */
export function skiff(v, x, y, s, d, o = {}) {
  const { ctx, t } = v, hull = t(o.hull ?? '#30261e'), cloth = t(o.cloth ?? '#a89878');
  for (const [dx, h, po] of o.crew ?? []) person(v, x + d * dx * s, y - 1 * s, h, { f: d, ...po });
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.roll ?? 0); ctx.scale(d * s, s); ctx.lineCap = 'round';
  if (o.sail) {
    rect(ctx, 1, -58, 1.8, 54, t('#2a2018'));
    if (o.sail === 'set') { poly(ctx, [-14, -50, 22, -56, 26, -16, -16, -14], cloth); for (const k of [-4, 8]) stroke(ctx, [k, -52 - k * 0.16, k - 0.6, -15], 0.5, rgba('#000000', 0.2)); stroke(ctx, [-16, -50, 24, -56.5], 1.6, t('#2a2018')); }
    else if (o.sail === 'furled') { stroke(ctx, [-16, -46, 22, -52], 4.2, cloth); stroke(ctx, [-16, -46, 22, -52], 1.2, t('#2a2018')); }
    else { poly(ctx, [-14, -50, 20, -56, 12, -40, 18, -30, 2, -34, -4, -20, -10, -36, -18, -30], cloth); stroke(ctx, [-16, -50, 24, -56.5], 1.6, t('#2a2018')); stroke(ctx, [24, -56, 34, -40, 30, -30], 0.8, t('#c8b890')); }
    stroke(ctx, [2, -58, 34, -12], 0.5, rgba(t('#c8b890'), 0.7)); stroke(ctx, [2, -58, -28, -8], 0.5, rgba(t('#c8b890'), 0.7));
  }
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-32, -9); ctx.quadraticCurveTo(-28, 4, -16, 5); ctx.lineTo(18, 5); ctx.quadraticCurveTo(31, 2, 38, -15); ctx.lineTo(31, -9); ctx.closePath(); ctx.fill();
  stroke(ctx, [-30, -8, 32, -9.5], 1.3, light(hull, 0.16)); stroke(ctx, [-27, -3.5, 30, -4.5], 0.6, light(hull, 0.1)); stroke(ctx, [-22, 1, 26, 0.4], 0.6, light(hull, 0.08));
  if (o.net) { ctx.fillStyle = rgba(t('#6a5c44'), 0.9); ctx.beginPath(); ctx.moveTo(-26, -9); ctx.quadraticCurveTo(-18, -17, -8, -9); ctx.fill(); }
  if (o.lamp) rect(ctx, 33, -21, 3, 4.4, '#ffd070');
  ctx.restore();
  if (o.lamp) glow(v, x + d * s * 34.5, y - s * 19, 16 * s, '#ffb050', 0.5);
}
/** 물 위의 흰 거품 줄 */
const foam = (v, x, y, w, a = 0.5) => { const { ctx, R } = v; ctx.strokeStyle = rgba(v.t('#e8eef0'), a); ctx.lineWidth = 1.2; ctx.lineCap = 'round'; for (let i = 0; i < 5; i++) { const px = x + (R() - 0.5) * w, pw = 4 + R() * 9; ctx.beginPath(); ctx.moveTo(px, y + R() * 3); ctx.lineTo(px + pw, y + R() * 3); ctx.stroke(); } };
/** 갈매기 몇 마리 (까마귀보다 옅고 날개가 길다) */
export function gulls(v, x, y, n, spread = 60) {
  const { ctx, R } = v; ctx.strokeStyle = rgba(v.t('#e8e6e0'), 0.9); ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { const px = x + (R() - 0.5) * spread * 2, py = y + (R() - 0.5) * spread * 0.6, s = 3 + R() * 3.4; ctx.beginPath(); ctx.moveTo(px - s * 1.3, py - s * 0.2); ctx.quadraticCurveTo(px - s * 0.5, py - s * 0.8, px, py); ctx.quadraticCurveTo(px + s * 0.5, py - s * 0.8, px + s * 1.3, py - s * 0.2); ctx.stroke(); }
}
/** 한쪽 날개 (어깨가 원점, 위로 들어 올린 모양). 깃이 층층이 내려온다 */
function wingUp(ctx, c, c2, k = 1) {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -30 * k); ctx.lineTo(-4, -62 * k); ctx.lineTo(-40, -80 * k); ctx.lineTo(-92, -86 * k);
  for (const [px, py] of [[-98, -64], [-84, -62], [-90, -42], [-72, -42], [-76, -24], [-56, -26], [-58, -10], [-38, -13], [-36, 2], [-16, -3]]) ctx.lineTo(px, py * k);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c2; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of [[-30, -74, -90, -52], [-22, -66, -80, -34], [-14, -54, -64, -18], [-10, -40, -46, -6], [-8, -24, -26, -2]]) { ctx.beginPath(); ctx.moveTo(x0, y0 * k); ctx.lineTo(x1, y1 * k); ctx.stroke(); }
  ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -30 * k); ctx.lineTo(-4, -62 * k); ctx.lineTo(-40, -80 * k); ctx.lineTo(-88, -85 * k); ctx.stroke();
}
/**
 * 하늘의 짐승(그리폰) 옆모습. y는 발, s 1이면 어깨 높이 50쯤. d는 보는 쪽.
 * o: coat, wing 빛깔, fold(날개 접음), hood(눈가리개 두건), saddle, raw, eye
 */
function skybeast(v, x, y, s, d, o = {}) {
  const { ctx } = v, tone = (c) => (o.raw ? c : v.t(c));
  const coat = o.coat ?? '#57463a', body = tone(coat), dk = tone(dark(coat, 0.38)), wc = o.wing ?? '#3c332c', wing = tone(wc), wl = tone(light(wc, 0.2)), wd = tone(dark(wc, 0.3));
  ctx.save(); ctx.translate(x, y); ctx.scale(d * s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  oval(ctx, -2, 2, 52, 4.5, rgba('#000000', 0.22));
  // 먼 쪽 날개
  if (!o.fold) { ctx.save(); ctx.translate(18, -50); ctx.rotate(0.3); wingUp(ctx, wd, tone(dark(wc, 0.1)), 0.92); ctx.restore(); }
  // 꼬리
  ctx.strokeStyle = dk; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-34, -34); ctx.quadraticCurveTo(-66, -44, -80, -20); ctx.stroke(); poly(ctx, [-84, -24, -74, -18, -82, -6, -90, -14], dk);
  // 먼 쪽 다리
  stroke(ctx, [-18, -22, -24, -8, -17, 0], 5.5, dk); stroke(ctx, [32, -30, 37, -12, 42, 0], 5, dk);
  // 몸통: 뒷몸은 짐승, 앞가슴은 새
  oval(ctx, -22, -32, 17, 15, body); oval(ctx, 2, -37, 32, 14.5, body, -0.14); oval(ctx, 24, -43, 15, 18, body, -0.2);
  // 뒷다리와 앞발(갈고리 발톱)
  stroke(ctx, [-28, -22, -36, -8, -29, 0], 6.5, body); for (const k of [0, 4, 8]) stroke(ctx, [-29 + k * 0.3, -1, -24 + k, 1], 1.5, tone('#1c1814'));
  stroke(ctx, [22, -30, 25, -12, 30, -1], 6, tone(mixh(coat, '#8a7440', 0.35))); for (const k of [0, 4.4, 8.8]) stroke(ctx, [30, -2, 34 + k * 0.9, 1 - k * 0.12], 1.6, tone('#1c1814'));
  // 목과 깃 갈기
  poly(ctx, [16, -56, 38, -48, 52, -76, 40, -86], body);
  for (let i = 0; i < 5; i++) poly(ctx, [36 - i * 3.6, -82 + i * 7, 26 - i * 3.4, -76 + i * 8, 36 - i * 3, -72 + i * 7.4], dk);
  // 머리, 부리, 눈
  oval(ctx, 49, -85, 10.5, 7.4, body, 0.2); poly(ctx, [41, -90, 28, -99, 40, -83], dk);
  poly(ctx, [56, -91, 66, -89, 73, -82, 70, -75, 66, -80, 57, -79], tone('#8a7440')); stroke(ctx, [58, -84.5, 68, -82.5], 0.8, tone('#2a2018'));
  if (o.hood) { poly(ctx, [40, -92, 56, -93, 58, -79, 42, -77], tone('#4a2e20')); stroke(ctx, [48, -93, 46, -103], 1.6, tone('#4a2e20')); oval(ctx, 46, -104, 2, 2, tone('#8a2a22')); }
  else { oval(ctx, 53, -87, 2, 1.7, o.eye ?? '#e8b040'); oval(ctx, 53.4, -87, 0.8, 1.5, '#0c0808'); stroke(ctx, [48, -90.5, 57, -90], 1.3, dk); }
  // 안장과 뱃대끈
  if (o.saddle) { poly(ctx, [-8, -53, 14, -57, 16, -49, -8, -46], tone('#3a2418')); stroke(ctx, [4, -50, 6, -24], 1.8, tone('#2a1a10')); stroke(ctx, [44, -80, 14, -55], 0.9, tone('#2a1a10')); }
  // 가까운 쪽 날개
  if (o.fold) {
    poly(ctx, [16, -52, -12, -60, -48, -46, -66, -26, -44, -30, -30, -22, -8, -30, 12, -38], wing);
    for (const [x0, y0, x1, y1] of [[6, -50, -40, -40], [2, -44, -46, -31], [-2, -38, -26, -25]]) stroke(ctx, [x0, y0, x1, y1], 0.8, wl);
    if (o.bound) for (const k of [-2, -22]) stroke(ctx, [k, -56 + k * 0.1, k + 3, -22], 1.6, tone('#b8a070'));
  } else { ctx.save(); ctx.translate(8, -50); ctx.rotate(-0.06); wingUp(ctx, wing, wl); ctx.restore(); }
  ctx.restore();
}
/** 멀리 나는 짐승의 실루엣. s 1이면 날개폭 60쯤 */
function flyer(v, x, y, s, d, c, o = {}) {
  const { ctx } = v, k = o.flap ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(d * s, s);
  poly(ctx, [4, 0, 12, -24 * k, -6, -34 * k, -14, -30 * k, -4, -10 * k], dark(c, 0.25));
  oval(ctx, 0, 0, 15, 3.6, c); oval(ctx, 15, -2, 3.6, 2.6, c); poly(ctx, [17, -3.4, 23, -1.4, 17.5, -0.2], c);
  ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-24, -2, -29, 4); ctx.stroke();
  poly(ctx, [7, 0, 0, -22 * k, -30, -30 * k, -26, -19 * k, -18, -18 * k, -16, -9 * k, -9, -8 * k, -8, 0], c);
  if (o.rider) { oval(ctx, 2, -6, 2, 3, dark(c, 0.4)); oval(ctx, 2.6, -10, 1.6, 1.6, dark(c, 0.4)); }
  ctx.restore();
}

/* ---------- 건국 ---------- */
/** 선포: 언덕 위에 새 깃발을 세운다. 칼을 든 나, 아래에 모인 무리 */
function foundingProclaim(v) {
  const { ctx, t } = v, rim = 'rgba(255,214,150,.6)'; sky(v); far(v, {});
  const gy = (x) => 172 - fbm1(x / 220 + v.q, 3) * 6; ground(v, gy, { tufts: 120 });
  // 멀리 진영: 천막 줄과 아침 연기
  for (let i = 0; i < 8; i++) { const x = 40 + i * 24 + hash(i, 3) * 8, y = 160 + hash(i, 4) * 6; poly(ctx, [x - 8, y, x, y - 9, x + 8, y], t(i % 3 ? '#a89c84' : '#8a7c66')); }
  smoke(v, 96, 150, 40, 8, '#8a8478', 0.2); smoke(v, 182, 152, 34, 7, '#8a8478', 0.18);
  for (let i = 0; i < 5; i++) { const x = 512 + i * 22, y = 162 + hash(i, 6) * 5; poly(ctx, [x - 7, y, x, y - 8, x + 7, y], t('#9a8e78')); }
  // 언덕
  const hill = (x) => 176 - 72 * Math.exp(-(((x - 336) / 120) ** 2)) - fbm1(x / 60 + v.q, 5) * 4;
  ctx.fillStyle = t(mixh(v.P.snow ? '#c8ced0' : v.P.grass, '#5a5644', 0.35)); ctx.beginPath(); ctx.moveTo(110, 190); for (let x = 110; x <= 570; x += 6) ctx.lineTo(x, hill(x)); ctx.lineTo(570, 190); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.16); ctx.beginPath(); ctx.moveTo(336, hill(336)); for (let x = 336; x <= 570; x += 6) ctx.lineTo(x, hill(x)); ctx.lineTo(570, 190); ctx.lineTo(380, 190); ctx.closePath(); ctx.fill();
  // 꼭대기의 옛 경계석
  poly(ctx, [286, 100, 290, 62, 300, 54, 310, 64, 312, 100], t('#6e6a62')); stroke(ctx, [296, 70, 304, 76, 296, 84], 1, rgba('#000000', 0.3));
  // 깃발: 장대를 붙든 두 사람
  const ty = hill(372);
  banner(v, 372, ty + 2, 84, FLAG, { d: 1, w: 62, len: 44 }); poly(ctx, [372, ty - 70, 434, ty - 68, 434, ty - 64, 372, ty - 65], t(GOLD));
  person(v, 386, ty + 3, 50, folk(0, { f: -1, arm: 'fwd', rim, rimDir: -1 })); person(v, 402, ty + 9, 50, folk(4, { f: -1, arm: 'fwd' }));
  // 나: 칼을 들어 올렸다
  const my = hill(334) + 1; person(v, 334, my, 62, mine(v, { f: -1, cloak: true, arm: 'out', rim, rimDir: -1 }));
  stroke(ctx, [314, my - 44.5, 300, my - 78], 1.8, t('#d8dce0')); stroke(ctx, [310, my - 46.5, 318, my - 43], 2, t(GOLD));
  // 먼저 무릎 꿇은 사람, 비탈에 선 무리
  person(v, 292, hill(292) + 6, 50, { f: 1, pose: 'kneel', cloth: '#5c6068', hair: '#3a2a1e', arm: 'fwd', rim, rimDir: 1 });
  for (let i = 0; i < 16; i++) { const x = 150 + i * 25 + hash(i, 7) * 10; if (x > 270 && x < 420) continue; const y = Math.max(hill(x), 150) + 14 + hash(i, 8) * 8; person(v, x, y, 36 + hash(i, 9) * 6, folk(i, { f: x < 336 ? 1 : -1, hat: i % 3 === 0, arm: i % 4 === 0 ? 'up' : null })); if (i % 3 === 0) spear(v, x + 6, y, 54, 0.03); }
  // 앞줄: 등을 보인 병사와 농부들, 창과 쇠스랑
  crowd(v, 20, 250, 244, 7, 86, { dark: 0.5, rim, rimDir: 1 }); crowd(v, 410, 630, 244, 7, 86, { dark: 0.5, rim, rimDir: -1 });
  for (const [x, len, a] of [[58, 124, 0.03], [132, 116, -0.04], [214, 120, 0.02], [452, 122, -0.03], [528, 114, 0.05], [600, 124, -0.02]]) spear(v, x, 240, len, a);
  person(v, 300, 250, 84, { f: 0, cloth: '#2e2a26', hair: '#1c1614', hood: true }); person(v, 362, 252, 80, { f: 0, cloth: '#3a2e2a', hair: '#5a4030', female: true, long: true });
  finish(v, { noLeaves: true });
}
/** 대관: 화톳불 밝힌 새 궁의 단. 무릎 꿇은 나, 왕관을 든 사제, 지켜보는 신하와 이웃 나라 사절 */
function foundingCrown(v) {
  const { ctx } = v; room(v, { wall: '#3a3229', floor: '#2a231c', fy: 176, stone: false });
  ctx.save(); zoom(v, 330, 240, 1.08);
  // 굵은 나무 기둥과 들보: 갓 지은 궁
  rect(ctx, 0, 12, VW, 10, '#2a2119'); for (const x of [96, 226, 434, 564]) { rect(ctx, x - 9, 0, 18, 176, '#33281e'); poly(ctx, [x - 9, 22, x - 30, 22, x - 9, 46], '#2a2119'); poly(ctx, [x + 9, 22, x + 30, 22, x + 9, 46], '#2a2119'); }
  // 옥좌 뒤의 깃발 셋
  hanging(v, 330, 26, 54, 104, { raw: true }); hanging(v, 160, 34, 34, 78, { raw: true }); hanging(v, 500, 34, 34, 78, { raw: true });
  // 단과 계단, 옥좌
  const ax = 330; poly(ctx, [ax - 120, 176, ax + 120, 176, ax + 132, 190, ax - 132, 190], '#4a3e30'); poly(ctx, [ax - 132, 190, ax + 132, 190, ax + 146, 206, ax - 146, 206], '#3e3428'); rect(ctx, ax - 120, 164, 240, 12, '#54463a');
  throne(ctx, ax, 166, 0.86, '#4a3626');
  // 화톳불 둘
  for (const x of [ax - 104, ax + 104]) { rect(ctx, x - 2, 128, 4, 38, '#1c1612'); poly(ctx, [x - 12, 120, x + 12, 120, x + 7, 130, x - 7, 130], '#2a2019'); flame(v, x - 3, 120, 13); flame(v, x + 4, 121, 9); glow(v, x, 110, 74, '#ff9a48', 0.26); }
  pool(v, ax, 196, 190, 30, '#ff9a48', 0.2);
  // 양옆 신하와 병사
  for (const [x, h, i] of [[62, 96, 0], [112, 92, 3], [172, 98, 5]]) { person(v, x, 228 + (i % 3), h, folk(i, { raw: true, f: 1, cloak: i === 5, robe: i === 3, rim: WARM, rimDir: 1 })); }
  person(v, 28, 232, 98, { raw: true, f: 1, cloth: '#5c6068', hair: '#3a3a40', hat: true, stick: 'spear' });
  for (const [x, h, i] of [[488, 96, 2], [548, 94, 1]]) person(v, x, 228 + (i % 3), h, folk(i, { raw: true, f: -1, robe: i === 1, rim: WARM, rimDir: -1 }));
  // 이웃 나라의 사절: 팔짱을 끼고 떨어져 섰다
  person(v, 606, 232, 100, { raw: true, f: -1, cloth: '#6a2a2a', hair: '#8a8478', cloak: true, arm: 'chest', rim: WARM, rimDir: -1 });
  // 가운데: 계단에 무릎 꿇은 나, 왕관을 높이 든 사제
  person(v, ax - 34, 214, 100, mine(v, { raw: true, f: 1, pose: 'kneel', cloak: true, rim: 'rgba(255,214,150,.7)', rimDir: -1 }));
  person(v, ax + 30, 208, 108, { raw: true, f: -1, cloth: '#d8d0bc', hair: '#b8b4ac', old: true, robe: true, arm: 'up', rim: 'rgba(255,214,150,.6)', rimDir: 1 });
  crown(ctx, ax + 21, 90, 1.5, '#e0b850'); glow(v, ax + 21, 84, 26, '#ffd880', 0.36);
  // 방석 위의 칼과 인장을 든 시동
  person(v, ax + 84, 212, 66, folk(4, { raw: true, f: -1, child: true, arm: 'fwd' })); poly(ctx, [ax + 54, 172, ax + 76, 170, ax + 77, 176, ax + 55, 178], '#7a2a26'); stroke(ctx, [ax + 52, 171, ax + 78, 168], 1.4, '#d8dce0');
  ctx.restore(); finish(v, { inside: true });
}
/** 무너진 왕좌: 지붕이 내려앉은 궁. 쓰러진 옥좌, 계단에 구르는 왕관, 찢긴 깃발 */
function foundingFallen(v) {
  const { ctx, t, R } = v; sky(v);
  const wl = t('#4a443c'), wd = t('#38332d');
  // 깨진 벽: 들쭉날쭉한 윗선과 빈 창
  ctx.fillStyle = wd; ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, 40); ctx.lineTo(40, 30); ctx.lineTo(70, 58); ctx.lineTo(120, 50); ctx.lineTo(150, 92); ctx.lineTo(210, 86); ctx.lineTo(240, 118); ctx.lineTo(400, 122); ctx.lineTo(430, 84); ctx.lineTo(470, 90); ctx.lineTo(500, 40); ctx.lineTo(560, 52); ctx.lineTo(590, 16); ctx.lineTo(640, 24); ctx.lineTo(640, VH); ctx.closePath(); ctx.fill();
  for (const [x, y, w, h] of [[44, 74, 26, 60], [546, 78, 28, 62]]) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.fill(); ctx.restore(); }
  // 창 뒤가 뚫려 버리니 하늘빛으로 메운다
  ctx.save(); ctx.globalCompositeOperation = 'destination-over'; rect(ctx, 0, 0, VW, VH, v.S.low ?? '#8a8a90'); ctx.restore();
  for (let y = 60; y < 176; y += 16) for (let x = (y / 16 % 2) * 18; x < VW; x += 36) stroke(ctx, [x, y, x + 30, y], 0.6, rgba('#000000', 0.14));
  // 그을린 기둥과 내려앉은 들보
  for (const x of [130, 230, 430, 530]) column(v, x, 182, 22, x === 230 ? 70 : x === 430 ? 104 : 128, wl, { broken: x === 230 || x === 430 });
  poly(ctx, [120, 60, 300, 150, 294, 160, 114, 70], t('#1e1814')); poly(ctx, [540, 66, 470, 176, 460, 172, 530, 60], t('#1e1814')); poly(ctx, [360, 130, 520, 196, 516, 204, 356, 138], t('#241c16'));
  // 바닥
  ctx.fillStyle = t('#3a352e'); ctx.fillRect(0, 176, VW, VH - 176); for (let i = -6; i <= 6; i++) stroke(ctx, [VW / 2 + i * 44, 176, VW / 2 + i * 120, VH], 0.6, rgba('#000000', 0.2));
  // 단과 계단
  const ax = 320; rect(ctx, ax - 110, 164, 220, 12, t('#4e483e')); poly(ctx, [ax - 110, 176, ax + 110, 176, ax + 122, 190, ax - 122, 190], t('#443e36')); poly(ctx, [ax - 122, 190, ax + 122, 190, ax + 136, 206, ax - 136, 206], t('#3a352e'));
  // 찢기고 그을린 깃발 한 폭
  ctx.save(); const fc = t(dark(FLAG, 0.15)); poly(ctx, [300, 52, 348, 56, 346, 96, 334, 88, 330, 120, 318, 100, 308, 126, 302, 96], fc); rect(ctx, 300, 82, 46, 6, t(dark(GOLD, 0.3))); poly(ctx, [330, 104, 346, 96, 344, 120], t('#16120e')); rect(ctx, 294, 49, 60, 3.5, t('#3a2e22')); ctx.restore();
  // 쓰러진 옥좌, 구르는 왕관
  throne(ctx, ax - 6, 170, 0.82, t('#3e2e22'), 1.2);
  crown(ctx, ax + 62, 201, 1.3, t('#b89a48'), 0.5); glow(v, ax + 62, 196, 14, '#e8c870', 0.2);
  // 돌무더기, 타다 남은 불, 흩어진 창
  rubble(v, 160, 222, 110, 14, t('#4a443c')); rubble(v, 500, 216, 100, 12, t('#403a34')); rubble(v, 330, 176, 60, 6, t('#4a443c'));
  blaze(v, 560, 206, 16, 16); glow(v, 560, 196, 50, '#ff8a3a', 0.2); smoke(v, 560, 180, 110, 16, '#1c1a1a', 0.3); smoke(v, 180, 110, 80, 14, '#242020', 0.22);
  stroke(ctx, [214, 232, 286, 214], 1.6, t('#2a2018')); stroke(ctx, [420, 226, 474, 236], 1.6, t('#2a2018')); poly(ctx, [234, 228, 246, 214, 262, 220, 258, 234, 244, 238], t('#5c6068'));
  // 재: 뚫린 지붕으로 내려온다
  for (let i = 0; i < 70; i++) { ctx.fillStyle = rgba('#c8c4bc', 0.14 + R() * 0.26); ctx.fillRect(R() * VW, R() * VH, 1.3, 1.3); }
  // 혼자 선 사람(나)과 문가의 아이
  person(v, 210, 240, 100, mine(v, { f: 1, cloak: true, rim: COLD, rimDir: -1 }));
  person(v, 600, 236, 58, folk(1, { f: -1, child: true }));
  crows(v, 400, 50, 5, 90); for (const [x, y] of [[132, 52], [536, 62]]) { oval(ctx, x, y, 4.4, 2.6, '#14100e'); poly(ctx, [x + 3, y - 1, x + 8, y, x + 3, y + 1], '#14100e'); }
  finish(v, { noLeaves: true });
}

/* ---------- 하늘 기수 ---------- */
/** 벼랑 위의 둥지와 알: 뼈가 흩어진 둥지, 줄에 매달려 올라온 나, 멀리 돌아오는 어미 */
function mountNest(v) {
  const { ctx, t, R } = v, rim = 'rgba(255,200,140,.55)'; sky(v); far(v, { peaks: true });
  // 발아래 구름 바다
  const g = ctx.createLinearGradient(0, HZ + 6, 0, VH); g.addColorStop(0, rgba(v.S.haze, 0.5)); g.addColorStop(1, rgba(t('#5a6470'), 0.95)); ctx.fillStyle = g; ctx.fillRect(0, HZ + 6, VW, VH);
  for (let i = 0; i < 26; i++) { const x = R() * 330, y = 150 + R() * 80; oval(ctx, x, y, 30 + R() * 46, 5 + R() * 7, rgba(t('#d8dce0'), 0.1 + R() * 0.14)); }
  // 멀리 솟은 바위 봉우리 둘
  poly(ctx, [60, 240, 84, 150, 98, 128, 110, 156, 134, 240], t(mixh('#5a5650', v.S.haze, 0.5))); poly(ctx, [176, 240, 192, 176, 204, 164, 214, 186, 230, 240], t(mixh('#5a5650', v.S.haze, 0.62)));
  // 벼랑: 턱과 뒤로 솟은 바위
  const rk = t('#4e4a44'), rd = t('#35322e');
  poly(ctx, [470, 170, 500, 60, 540, 20, 580, -10, 640, -10, 640, 170], rd);
  poly(ctx, [262, 172, 300, 164, 640, 162, 640, 240, 300, 240, 284, 210, 290, 190], rk);
  poly(ctx, [262, 172, 300, 164, 640, 162, 640, 170, 300, 174], t(light('#4e4a44', 0.12)));
  for (let i = 0; i < 16; i++) { const x = 300 + R() * 330, y = 180 + R() * 56; stroke(ctx, [x, y, x + 6 + R() * 10, y + 10 + R() * 14], 0.8, rgba('#000000', 0.22)); }
  for (let i = 0; i < 9; i++) { const x = 500 + R() * 130, y = 30 + R() * 120; stroke(ctx, [x, y, x - 6 - R() * 8, y + 16 + R() * 16], 0.8, rgba('#000000', 0.2)); }
  // 둥지: 굵은 가지를 얽은 테
  const nx = 440, ny = 160;
  oval(ctx, nx, ny + 2, 96, 20, t('#2a221a'));
  for (let i = 0; i < 120; i++) { const a = R() * TAU, r = 0.62 + R() * 0.42, x = nx + Math.cos(a) * 96 * r, y = ny + 2 + Math.sin(a) * 19 * r - (Math.sin(a) < 0 ? 4 : 0), l = 9 + R() * 16, b = a + Math.PI / 2 + (R() - 0.5) * 1.1; stroke(ctx, [x - Math.cos(b) * l, y - Math.sin(b) * l * 0.4, x + Math.cos(b) * l, y + Math.sin(b) * l * 0.4], 1 + R() * 1.6, t(R() < 0.5 ? '#5a4632' : '#3a2c20')); }
  oval(ctx, nx, ny - 2, 64, 10, t('#1e1812'));
  // 알 둘과 깨진 껍데기
  for (const [x, y, rot] of [[nx - 16, ny - 12, -0.2], [nx + 14, ny - 10, 0.28]]) { oval(ctx, x, y, 10.5, 14, t('#b8b8a4'), rot); oval(ctx, x - 3, y - 4, 4, 6, rgba(t('#e8e6d8'), 0.5), rot); for (let i = 0; i < 12; i++) oval(ctx, x - 7 + hash(i, x) * 14, y - 10 + hash(i, x + 1) * 20, 0.9, 0.7, rgba(t('#4a4438'), 0.7)); }
  poly(ctx, [nx + 40, ny - 4, nx + 44, ny - 14, nx + 50, ny - 8, nx + 55, ny - 15, nx + 58, ny - 4], t('#9a9a88'));
  // 앞쪽 가지: 알이 둥지 안에 든 것처럼 보인다
  for (let i = 0; i < 40; i++) { const x = nx - 80 + R() * 160, y = ny + 8 + R() * 12, l = 8 + R() * 14, b = (R() - 0.5) * 0.9; stroke(ctx, [x - Math.cos(b) * l, y - Math.sin(b) * l, x + Math.cos(b) * l, y + Math.sin(b) * l], 1 + R() * 1.8, t(R() < 0.5 ? '#6a543c' : '#3a2c20')); }
  // 먹고 남은 뼈: 갈비, 뿔 달린 머리뼈, 큰 깃 하나
  for (let i = 0; i < 5; i++) { ctx.strokeStyle = t('#c8c0a8'); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(566 + i * 6, 176, 9, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke(); } stroke(ctx, [556, 168, 598, 167], 1.6, t('#c8c0a8'));
  oval(ctx, 346, 180, 6, 4.4, t('#c8c0a8')); stroke(ctx, [342, 177, 336, 171, 338, 166], 1.3, t('#a8a088')); stroke(ctx, [350, 177, 356, 172, 355, 167], 1.3, t('#a8a088')); oval(ctx, 345, 180, 1.2, 1.2, '#1c1814');
  poly(ctx, [372, 196, 404, 186, 408, 189, 376, 199], t('#2e2824')); stroke(ctx, [372, 197, 408, 187.5], 0.6, t('#8a8070'));
  // 줄과 쇠못, 벼랑을 넘어오는 나
  stroke(ctx, [330, 170, 266, 176, 256, 240], 1.2, t('#c8b890')); rect(ctx, 329, 163, 3, 8, t('#1c1814'));
  person(v, 304, 178, 74, mine(v, { f: 1, arm: 'fwd', rim, rimDir: -1 })); oval(ctx, 295, 132, 6.5, 8.5, t('#4a3a2a'));
  // 멀리, 돌아오는 어미
  flyer(v, 126, 70, 0.9, 1, t('#1e1a18'), { rot: 0.08 }); flyer(v, 60, 96, 0.4, 1, t(mixh('#1e1a18', v.S.haze, 0.4)), { flap: 0.6 });
  finish(v, { noLeaves: true });
}
/** 날개 펼친 마수: 바위 위에서 날개를 다 편 짐승, 그 앞에 손을 내민 나 */
function mountWings(v) {
  const { ctx, t, R } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { peaks: true });
  const gy = (x) => 172 - fbm1(x / 200 + v.q, 3) * 8; ground(v, gy, { tufts: 90, color: '#6a6a58', color2: '#44443a' });
  // 멀리 돌탑(짐승 우리)과 도는 짐승들
  rect(ctx, 86, 96, 26, 70, t('#5e5a54')); rect(ctx, 80, 90, 38, 8, t('#4a4640')); for (const k of [0, 22]) rect(ctx, 84 + k, 82, 8, 8, t('#4a4640')); rect(ctx, 96, 112, 6, 12, t('#1c1814')); poly(ctx, [112, 122, 140, 126, 140, 130, 112, 128], t('#3a3028'));
  flyer(v, 150, 62, 0.34, -1, t('#2a2622'), { flap: 0.7 }); flyer(v, 210, 44, 0.26, 1, t('#3a3632'));
  // 바위 턱
  poly(ctx, [270, 240, 290, 206, 330, 194, 470, 192, 520, 204, 548, 240], t('#55514a')); poly(ctx, [330, 194, 470, 192, 520, 204, 500, 210, 320, 208], t(light('#55514a', 0.1)));
  for (let i = 0; i < 9; i++) stroke(ctx, [300 + i * 26, 212 + hash(i, 2) * 8, 308 + i * 26, 232 + hash(i, 3) * 6], 0.8, rgba('#000000', 0.22));
  // 쇠말뚝과 발목 사슬
  rect(ctx, 506, 190, 5, 22, t('#1c1814')); ctx.strokeStyle = t('#1c1a18'); ctx.lineWidth = 1.6; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(508, 194); ctx.quadraticCurveTo(470, 212, 432, 196); ctx.stroke(); ctx.setLineDash([]);
  // 짐승
  skybeast(v, 396, 198, 1.36, -1, { saddle: true });
  // 날개가 일으킨 먼지와 빠진 깃
  for (let i = 0; i < 9; i++) glow(v, 250 + i * 34, 222 + hash(i, 4) * 12, 24, '#c8b89a', 0.06);
  for (let i = 0; i < 7; i++) { const x = 180 + R() * 320, y = 120 + R() * 90, a = R() * 3; stroke(ctx, [x, y, x + Math.cos(a) * 7, y + Math.sin(a) * 4], 1.4, rgba(t('#2e2824'), 0.7)); }
  // 나: 한 손을 내밀고 선다. 뒤에 물러선 마부, 고기 통
  person(v, 196, 236, 96, mine(v, { f: 1, arm: 'out', cloak: true, rim, rimDir: 1 }));
  person(v, 92, 238, 84, folk(2, { f: 1, hood: true, stick: 'staff' }));
  rect(ctx, 130, 222, 18, 16, t('#3a2c20')); rect(ctx, 129, 226, 20, 2, t('#1c1814')); oval(ctx, 139, 221, 8, 3, t('#6a2a26'));
  person(v, 586, 238, 88, folk(5, { f: -1, arm: 'fwd' })); stroke(ctx, [562, 190, 508, 196], 1.2, t('#c8b890'));
  finish(v, { noLeaves: true });
}
/** 하늘에서 본 땅: 짐승의 목 너머로 조각보 같은 밭, 강, 작은 성읍, 구름 그림자 */
function mountAbove(v) {
  const { ctx, t, R, S, P } = v; sky(v);
  const hz = 70;
  ctx.save(); ctx.translate(0, hz - HZ - 2); far(v, { peaks: true }); ctx.restore();
  // 땅: 멀수록 안개에 잠긴다
  const base = P.snow ? '#cfd5d6' : P.grass;
  const g = ctx.createLinearGradient(0, hz, 0, VH); g.addColorStop(0, t(mixh(base, S.haze, 0.82))); g.addColorStop(0.3, t(mixh(base, S.haze, 0.45))); g.addColorStop(1, t(mixh(base, '#2e3a2a', 0.3))); ctx.fillStyle = g; ctx.fillRect(0, hz + 6, VW, VH);
  // 조각보 밭
  const cols = P.snow ? ['#d4dadc', '#c2cace', '#dfe3e4', '#b8c0c4'] : ['#7c8650', '#8f8c56', '#687a48', '#a09460', '#5e7044', '#8a7a4c'];
  for (let r = 0; r < 9; r++) {
    const k0 = (r / 9) ** 1.7, k1 = ((r + 1) / 9) ** 1.7, y0 = hz + 12 + k0 * 170, y1 = hz + 12 + k1 * 170, step = 22 + r * 20, sh = (hash(r, 3) - 0.5) * step;
    for (let x = -step + sh; x < VW + step; x += step * (0.7 + hash(x | 0, r) * 0.7)) {
      if (hash(x | 0, r + 20) < 0.22) continue;
      const w = step * (0.6 + hash(x | 0, r + 5) * 0.5), sk = (x - 320) * 0.05;
      poly(ctx, [x, y0, x + w, y0, x + w + sk, y1 - 0.6, x + sk, y1 - 0.6], rgba(t(mixh(cols[Math.floor(hash(x | 0, r + 9) * cols.length)], S.haze, 0.6 * (1 - k0))), 0.78));
    }
  }
  // 숲 덩어리
  for (let i = 0; i < 22; i++) { const d = R(), y = hz + 16 + d ** 1.5 * 160, x = R() * VW, s = 6 + d * 30; if (Math.abs(x - 330) < 70 && y > 170) continue; for (let j = 0; j < 7; j++) oval(ctx, x + (R() - 0.5) * s * 2, y + (R() - 0.5) * s * 0.5, s * 0.6, s * 0.22, rgba(t(mixh(P.conifer ?? '#3e5238', S.haze, 0.5 * (1 - d))), 0.85)); }
  // 강: 지평선에서 굽이쳐 내려온다
  const rv = (k) => [436 - 250 * k + Math.sin(k * 8.4) * 46 * (0.2 + k), hz + 8 + 172 * k ** 1.5, 0.8 + 15 * k * k];
  ctx.fillStyle = t(mixh(P.water ?? '#5c7890', S.low, 0.55)); ctx.beginPath(); for (let i = 0; i <= 50; i++) { const [x, y, w] = rv(i / 50); if (i) ctx.lineTo(x - w, y); else ctx.moveTo(x - w, y); } for (let i = 50; i >= 0; i--) { const [x, y, w] = rv(i / 50); ctx.lineTo(x + w, y); } ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(light(t(S.low ?? '#c8d0d8'), 0.4), 0.5); ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 8; i <= 50; i++) { const [x, y, w] = rv(i / 50); if (i === 8) ctx.moveTo(x - w * 0.3, y); else ctx.lineTo(x - w * 0.3, y); } ctx.stroke();
  // 길과 강가의 성읍
  ctx.strokeStyle = rgba(t('#c8b890'), 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(640, 150); ctx.quadraticCurveTo(540, 132, 468, 128); ctx.quadraticCurveTo(380, 112, 300, 90); ctx.stroke();
  const tx = 474, tyy = 128; ctx.strokeStyle = t('#8a8474'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(tx, tyy, 26, 9, 0, 0, TAU); ctx.stroke();
  for (let i = 0; i < 22; i++) { const x = tx + (hash(i, 2) - 0.5) * 40, y = tyy + (hash(i, 3) - 0.5) * 11; rect(ctx, x - 2, y - 1.6, 4, 2.6, t('#9a8a74')); poly(ctx, [x - 2.6, y - 1.6, x, y - 4, x + 2.6, y - 1.6], t('#6a4a3a')); }
  rect(ctx, tx - 3, tyy - 12, 3, 9, t('#a89c88')); poly(ctx, [tx - 4, tyy - 12, tx - 1.5, tyy - 18, tx + 1, tyy - 12], t('#5a4436'));
  for (let i = 0; i < 5; i++) { const x = 180 + hash(i, 6) * 60, y = 150 + hash(i, 7) * 12; rect(ctx, x, y, 4, 2.4, t('#8a7c68')); }
  // 구름 그림자와 발아래 구름
  for (const [x, y, rx, ry] of [[150, 136, 70, 12], [540, 180, 90, 16], [330, 104, 50, 6]]) oval(ctx, x, y, rx, ry, rgba('#101820', 0.16));
  for (const [x, y, s] of [[120, 112, 1], [560, 150, 1.4], [40, 170, 1.2], [300, 86, 0.6]]) for (let j = 0; j < 9; j++) oval(ctx, x + (hash(j, x) - 0.5) * 90 * s, y + (hash(j, x + 1) - 0.5) * 9 * s, 26 * s * (0.5 + hash(j, x + 2)), 6 * s, rgba(t('#f0f0ec'), 0.2));
  // 아래쪽을 나는 다른 기수와 그 그림자
  oval(ctx, 236, 176, 9, 2.2, rgba('#101820', 0.3)); flyer(v, 214, 140, 0.44, 1, t('#2a2420'), { rider: true, rot: -0.08 });
  // 내가 탄 짐승: 양옆으로 뻗은 날개, 앞으로 뻗은 목과 머리
  const wc = t('#2e2620'), wl = t('#4a3e34');
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(330, 0); ctx.scale(s, 1);
    poly(ctx, [10, 240, 26, 204, 110, 176, 220, 158, 318, 166, 300, 180, 314, 190, 270, 194, 280, 208, 226, 208, 232, 224, 170, 222, 172, 240], wc);
    stroke(ctx, [24, 208, 110, 179, 220, 161, 312, 167], 3, wl);
    for (const [x0, y0, x1, y1] of [[200, 164, 296, 182], [160, 172, 266, 196], [120, 180, 222, 210], [90, 188, 168, 224], [60, 198, 110, 236]]) stroke(ctx, [x0, y0, x1, y1], 0.8, rgba(wl, 0.7));
    ctx.restore();
  }
  poly(ctx, [312, 226, 322, 170, 328, 150, 338, 150, 344, 170, 352, 226], t('#4a3c32')); for (let i = 0; i < 5; i++) poly(ctx, [322 + i * 1.2, 176 + i * 9, 333, 168 + i * 9, 343 - i * 1.2, 176 + i * 9, 333, 182 + i * 9], t('#3a2e26'));
  oval(ctx, 333, 146, 7.4, 8.6, t('#4a3c32')); poly(ctx, [329, 140, 333, 128, 337, 140], t('#8a7440')); poly(ctx, [326, 150, 320, 158, 329, 153], t('#3a2e26')); poly(ctx, [340, 150, 346, 158, 337, 153], t('#3a2e26'));
  stroke(ctx, [324, 232, 328, 160], 0.8, t('#1c1410')); stroke(ctx, [342, 232, 338, 160], 0.8, t('#1c1410'));
  person(v, 333, 266, 104, mine(v, { f: 0, cloak: true, rim: rgba(S.lit ?? '#ffe0b0', 0.5) }));
  finish(v, { noLeaves: true });
}
/** 길들이는 마당: 눈가리개를 쓰고 날개가 묶인 어린 짐승, 고기를 내미는 나, 다친 사람 */
function mountTame(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { peaks: true });
  const gy = (x) => 158 - fbm1(x / 220 + v.q, 3) * 6; ground(v, gy, { tufts: 60, color: '#74705c', color2: '#4a463a' });
  // 돌담과 굵은 말뚝 울: 발톱 자국
  rect(ctx, 0, 132, VW, 34, t('#5a564e')); for (let x = 0; x < VW; x += 26) stroke(ctx, [x + (x % 52 ? 0 : 13), 132, x + (x % 52 ? 0 : 13), 166], 0.6, rgba('#000000', 0.2)); rect(ctx, 0, 128, VW, 5, t('#48443e'));
  for (const x of [70, 250, 430, 610]) { rect(ctx, x - 7, 70, 14, 100, t('#3a2c20')); rect(ctx, x - 9, 66, 18, 6, t('#2a2018')); }
  for (const y of [86, 112]) rect(ctx, 0, y, VW, 5, t('#33271c'));
  for (const k of [0, 5, 10]) stroke(ctx, [420 + k, 92, 428 + k, 126], 1.1, t('#8a7a5e'));
  // 횃대와 쇠고리 말뚝
  rect(ctx, 356, 150, 8, 70, t('#2a2018')); ctx.strokeStyle = t('#8a8e96'); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(360, 158, 5, 0, TAU); ctx.stroke();
  ctx.strokeStyle = t('#1c1a18'); ctx.lineWidth = 1.8; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(360, 162); ctx.quadraticCurveTo(390, 214, 408, 190); ctx.stroke(); ctx.setLineDash([]);
  // 어린 짐승: 눈을 가리고 날개를 묶었다
  skybeast(v, 438, 226, 1.05, -1, { fold: true, bound: true, hood: true, coat: '#6a5644', wing: '#4a3e34' });
  // 바닥: 짚, 핏자국 묻은 뼈, 물통
  for (let i = 0; i < 46; i++) { const x = 300 + hash(i, 1) * 260, y = 216 + hash(i, 2) * 22; stroke(ctx, [x, y, x + 6 + hash(i, 3) * 6, y - 1 + hash(i, 4) * 3], 0.9, rgba(t('#b8a070'), 0.6)); }
  stroke(ctx, [520, 230, 548, 226], 2.2, t('#c8c0a8')); oval(ctx, 520, 230, 2.6, 2.6, t('#c8c0a8')); oval(ctx, 549, 226, 2.6, 2.6, t('#c8c0a8')); oval(ctx, 536, 231, 9, 2.4, rgba(t('#5a1c18'), 0.6));
  // 나: 두꺼운 가죽 토시를 낀 팔로 고기를 내민다
  person(v, 252, 236, 98, mine(v, { f: 1, arm: 'out', rim, rimDir: 1 })); stroke(ctx, [268, 166, 284, 165.5], 6.5, t('#4a2e20')); oval(ctx, 288, 166, 4.6, 3.4, t('#7a2a26'));
  // 긴 장대를 든 조련사
  person(v, 580, 238, 92, folk(0, { f: -1, hat: true, arm: 'fwd' })); stroke(ctx, [600, 236, 520, 150], 1.8, t('#33281e'));
  // 담 밑에 앉은 다친 사람: 팔을 싸맸다
  rect(ctx, 96, 208, 70, 5, t('#3a2c20')); rect(ctx, 100, 213, 4, 14, t('#2a2018')); rect(ctx, 158, 213, 4, 14, t('#2a2018'));
  person(v, 126, 226, 90, folk(4, { f: 1, pose: 'sit', arm: 'chest' })); stroke(ctx, [128, 189, 139, 185], 6, t('#d8d0bc')); stroke(ctx, [126, 166, 134, 186], 1, t('#d8d0bc')); oval(ctx, 134, 187, 3, 2, rgba(t('#7a1a16'), 0.8));
  person(v, 170, 232, 60, folk(1, { f: 1, child: true }));
  finish(v, { noLeaves: true });
}

/* ---------- 포구 ---------- */
/** 포구의 집들: 돌담 위 낮은 지붕, 그물 장대 */
export function quay(v, x0, x1, y, lit) {
  const { ctx, t } = v;
  for (let x = x0, i = 0; x < x1; x += 34, i++) { const w = 30 + hash(i, 3) * 10, h = 14 + hash(i, 4) * 8; cottage(v, x + w / 2, y - hash(i, 5) * 3, w, h, { lit: lit && hash(i, 6) < 0.6, snow: !!v.P.snow }); }
  rect(ctx, x0 - 10, y - 2, x1 - x0 + 20, 7, t('#4a4640'));
}
/** 새벽 고깃배: 등불을 달고 나가는 배들, 자갈밭에서 배를 미는 사람들 */
function harborDawn(v) {
  const { ctx, t } = v, rim = 'rgba(255,190,130,.6)'; sky(v); far(v, { sea: true });
  seaAt(v, HZ, { n: 150 });
  // 해 뜨는 쪽 물빛
  glow(v, 430, HZ + 2, 150, '#ffb878', 0.26, 26); for (let i = 0; i < 16; i++) { const y = HZ + 4 + i * 5; stroke(ctx, [430 - 6 - i * 2.4 + hash(i, 1) * 10, y, 430 + 6 + i * 2.4 - hash(i, 2) * 10, y], 1, rgba('#ffd8a0', 0.3)); }
  // 왼쪽 곶과 포구 집들, 돌 방파제
  poly(ctx, [0, 96, 60, 92, 130, 108, 196, 128, 0, 130], t(mixh('#4a4a44', v.S.haze, 0.3)));
  quay(v, 14, 190, 132, true);
  poly(ctx, [150, 138, 300, 140, 312, 146, 150, 150], t('#4a4640')); rect(ctx, 300, 126, 4, 16, t('#2a2018')); rect(ctx, 299, 122, 6, 5, '#ffcf70'); glow(v, 302, 124, 18, '#ffb050', 0.45);
  // 먼바다로 나가는 배들
  skiff(v, 500, 132, 0.34, 1, { sail: 'set', lamp: true }); skiff(v, 560, 138, 0.44, 1, { sail: 'set', lamp: true }); skiff(v, 408, 142, 0.5, 1, { sail: 'set', lamp: true, crew: [[-10, 13, folk(2)]] });
  skiff(v, 470, 162, 0.9, 1, { sail: 'set', lamp: true, net: true, crew: [[-14, 30, folk(0, { hat: true, rim, rimDir: 1 })], [8, 28, folk(3, { arm: 'fwd' })]] }); foam(v, 440, 166, 30, 0.4);
  // 자갈밭
  const sh = (x) => 196 - (x / VW) * 16 + fbm1(x / 90 + v.q, 4) * 5;
  ctx.fillStyle = t('#5e5a50'); ctx.beginPath(); ctx.moveTo(0, VH); ctx.lineTo(0, sh(0) - 14); for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, sh(x) + (x > 330 ? (x - 330) * 0.2 : 0)); ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 120; i++) { const x = hash(i, 1) * VW, y = 200 + hash(i, 2) * 40; oval(ctx, x, y, 1.6 + hash(i, 3) * 2.2, 1 + hash(i, 4), rgba(t(i % 2 ? '#7a766a' : '#3e3a34'), 0.7)); }
  foam(v, 200, 184, 180, 0.5); foam(v, 480, 216, 200, 0.5);
  // 물가에서 미는 배: 셋이 붙어 민다
  person(v, 352, 222, 82, folk(4, { f: 1, arm: 'fwd', rim, rimDir: 1 })); person(v, 322, 226, 86, mine(v, { f: 1, arm: 'fwd', rim, rimDir: 1 }));
  skiff(v, 428, 210, 1.5, 1, { sail: 'furled', lamp: true, net: true, roll: -0.05, crew: [[14, 46, folk(2, { hat: true, arm: 'fwd' })]] });
  for (const k of [0, 22, 44]) stroke(ctx, [368 + k, 222, 392 + k, 219], 3, t('#3a2c20')); // 굴림목
  // 장대에 건 그물과 통발, 배웅하는 아낙과 아이
  for (const x of [70, 150]) rect(ctx, x, 150, 3, 76, t('#2a2018')); ctx.strokeStyle = rgba(t('#8a7c60'), 0.8); ctx.lineWidth = 0.7; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(72, 154 + i * 5); ctx.quadraticCurveTo(110, 170 + i * 5, 152, 154 + i * 5); ctx.stroke(); } for (let i = 0; i < 10; i++) stroke(ctx, [74 + i * 8.4, 154, 74 + i * 8.4, 196 + Math.sin(i / 9 * Math.PI) * 16], 0.5, rgba(t('#8a7c60'), 0.7));
  for (const [x, y] of [[196, 232], [222, 236]]) { oval(ctx, x, y - 8, 10, 8, t('#4a3c2a')); for (let i = -2; i <= 2; i++) stroke(ctx, [x + i * 4, y - 15, x + i * 4.4, y - 1], 0.6, t('#2a2018')); }
  person(v, 238, 232, 84, folk(1, { f: 1, female: true, long: true, cloak: true, arm: 'chest' })); person(v, 262, 234, 52, folk(3, { f: 1, child: true }));
  gulls(v, 300, 70, 6, 150);
  finish(v, { noLeaves: true });
}
/** 폭풍: 산 같은 물결 사이의 고깃배. 찢긴 돛, 키를 붙든 사람, 먼 곶의 불 */
function harborStorm(v) {
  const { ctx, t, R } = v; sky(v);
  const c = '#56707e'; rect(ctx, 0, 96, VW, VH, t(dark(c, 0.2)));
  // 먼 곶과 등대 불
  poly(ctx, [520, 110, 570, 84, 640, 76, 640, 120, 520, 120], t('#1c2026')); rect(ctx, 588, 62, 7, 22, t('#1c2026')); glow(v, 591, 60, 30, '#ffb050', 0.55); rect(ctx, 589, 57, 5, 5, '#ffd880');
  // 물결: 뒤에서 앞으로 세 겹
  const wave = (y0, amp, len, ph, col, foamA) => {
    const f = (x) => y0 - Math.sin(x / len + ph) * amp - Math.sin(x / (len * 0.37) + ph * 2.3) * amp * 0.3 - fbm1(x / 50 + ph, 4) * amp * 0.3;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH + 30); for (let x = 0; x <= VW; x += 5) ctx.lineTo(x, f(x)); ctx.lineTo(VW, VH + 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(t('#dfe8ea'), foamA); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let x = 0; x < VW; x += 6) { const y = f(x), up = f(x + 6) < y; if (y < y0 - amp * 0.3 && hash(x, ph * 10) < 0.7) { ctx.beginPath(); ctx.moveTo(x, y + 0.6); ctx.lineTo(x + 6, f(x + 6) + 0.6); ctx.stroke(); if (up && hash(x, 3) < 0.3) stroke(ctx, [x + 2, y + 5, x + 12, y + 8], 0.8, rgba(t('#dfe8ea'), foamA * 0.6)); } }
    return f;
  };
  wave(124, 12, 70, 0.6, t(mixh(c, '#59676e', 0.4)), 0.3);
  wave(150, 20, 96, 2.4, t(c), 0.42);
  // 멀리 엎어진 배 한 척
  ctx.save(); ctx.translate(152, 142); ctx.rotate(-0.3); poly(ctx, [-20, 0, -14, -9, 14, -10, 22, 0], t('#1e1814')); ctx.restore(); stroke(ctx, [146, 136, 132, 118], 1.2, t('#1e1814'));
  const f3 = wave(176, 30, 124, 4.3, t(dark(c, 0.16)), 0.55);
  // 배: 물마루에 걸려 기울었다
  const bx = 330, by = f3(bx) + 30;
  skiff(v, bx, by, 2.1, 1, { sail: 'torn', roll: -0.24, hull: '#3a2c22', cloth: '#c8bca0', crew: [[-20, 54, mine(v, { raw: true, arm: 'fwd', rim: COLD, rimDir: -1 })], [2, 52, folk(0, { raw: true, hood: true, arm: 'up', rim: COLD, rimDir: -1 })], [20, 50, folk(4, { raw: true, arm: 'fwd', rim: COLD, rimDir: -1 })]] });
  // 뱃전을 넘는 물보라
  for (let i = 0; i < 46; i++) { const a = -Math.PI * (0.15 + R() * 0.7), r = 10 + R() * 44; oval(ctx, bx + 84 + Math.cos(a) * r * 0.9, by - 10 + Math.sin(a) * r, 0.8 + R() * 1.8, 0.8 + R() * 1.8, rgba(t('#e8eef0'), 0.3 + R() * 0.4)); }
  wave(222, 22, 150, 1.2, t(dark(c, 0.36)), 0.5);
  // 떠다니는 통과 부러진 노
  oval(ctx, 110, 214, 8, 5.4, t('#3a2c20')); stroke(ctx, [500, 214, 540, 206], 2, t('#3a2c20'));
  glow(v, 330, 120, 170, '#c8d4f0', 0.14, 90);
  finish(v, { noLeaves: true });
}
/** 생선 말리는 장대: 자갈밭에 줄지은 덕장, 배를 가르는 아낙들, 소금 통 */
function harborRacks(v) {
  const { ctx, t } = v, dim = dimOf(v), rim = dim ? WARM : null; sky(v); far(v, { sea: true });
  seaAt(v, HZ, { n: 90 });
  poly(ctx, [640, 92, 560, 96, 490, 112, 440, 128, 640, 130], t(mixh('#4a4a44', v.S.haze, 0.3))); quay(v, 470, 630, 134, dim);
  skiff(v, 140, 136, 0.4, -1, { sail: 'set' }); skiff(v, 250, 142, 0.5, 1, { sail: 'set' });
  // 자갈밭
  const sh = (x) => 150 + fbm1(x / 110 + v.q, 4) * 5; ctx.fillStyle = t('#77725f'); ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, sh(x)); ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 150; i++) { const x = hash(i, 1) * VW, d = hash(i, 2), y = 156 + d * d * 84; oval(ctx, x, y, 1.2 + d * 2.6, 0.8 + d * 1.2, rgba(t(i % 2 ? '#8f8a78' : '#4e4a40'), 0.7)); }
  foam(v, 120, 150, 200, 0.5); foam(v, 360, 151, 160, 0.4);
  // 덕장: 멀리부터 세 줄. 가로대마다 갈라 벌린 생선이 줄줄이
  const rack = (x0, x1, y, h, n) => {
    const post = t('#3a2c20');
    for (let x = x0; x <= x1 + 1; x += (x1 - x0) / 3) { stroke(ctx, [x, y, x, y - h], Math.max(1.4, h * 0.05), post); stroke(ctx, [x - h * 0.16, y, x, y - h * 0.5], Math.max(1, h * 0.03), post); }
    for (const k of [1, 0.62]) {
      const yy = y - h * k; stroke(ctx, [x0 - 4, yy, x1 + 4, yy], Math.max(1.2, h * 0.035), post);
      for (let i = 0; i < n; i++) { const x = x0 + ((i + 0.5) / n) * (x1 - x0), l = h * 0.26 * (0.85 + hash(i, y) * 0.3), w = h * 0.045; poly(ctx, [x - w, yy + 1, x + w, yy + 1, x + w * 0.5, yy + l, x + w * 1.4, yy + l * 1.16, x, yy + l * 1.06, x - w * 1.4, yy + l * 1.16, x - w * 0.5, yy + l], t(i % 3 ? '#b8ac90' : '#a89878')); stroke(ctx, [x, yy + 2, x, yy + l], 0.5, rgba(t('#6a5c44'), 0.6)); }
    }
  };
  rack(60, 200, 172, 36, 16); rack(250, 420, 176, 42, 18); rack(30, 250, 226, 86, 13);
  // 엎어 둔 배와 장대에 건 그물
  ctx.save(); ctx.translate(556, 196); poly(ctx, [-50, 0, -40, -16, 30, -19, 52, 0], t('#30261e')); stroke(ctx, [-46, -3, 48, -4], 0.8, t('#4a3c2e')); stroke(ctx, [-40, -10, 40, -12], 0.8, t('#4a3c2e')); ctx.restore();
  // 손질하는 자리: 널판, 소금 통, 내장 통, 칼
  const bx = 410, by = 228; rect(ctx, bx - 50, by - 34, 100, 5, t('#5a4630')); rect(ctx, bx - 46, by - 29, 4, 29, t('#3a2c20')); rect(ctx, bx + 42, by - 29, 4, 29, t('#3a2c20'));
  for (const k of [-34, -14, 10]) { oval(ctx, bx + k, by - 37, 9, 2.6, t('#aab0b0')); poly(ctx, [bx + k + 8, by - 37, bx + k + 14, by - 40, bx + k + 14, by - 34], t('#8a9090')); }
  for (const [x, c2] of [[bx + 76, '#e8e6e0'], [bx + 104, '#6a2a26']]) { rect(ctx, x - 11, by - 24, 22, 24, t('#4a3a2a')); rect(ctx, x - 12, by - 18, 24, 2, t('#1c1814')); rect(ctx, x - 12, by - 8, 24, 2, t('#1c1814')); oval(ctx, x, by - 24, 11, 3.4, t(c2)); }
  person(v, bx - 12, by + 10, 96, mine(v, { f: 1, arm: 'fwd', rim, rimDir: 1 })); stroke(ctx, [bx + 16, by - 45, bx + 24, by - 40], 1.4, t('#d8dce0'));
  person(v, bx + 44, by + 8, 90, folk(1, { f: -1, female: true, long: false, hood: true, arm: 'fwd' }));
  // 생선을 거는 아낙과 광주리 든 아이, 생선을 노리는 갈매기와 개
  person(v, 270, 238, 92, folk(4, { f: -1, female: true, long: true, arm: 'up' })); person(v, 316, 238, 56, folk(3, { f: -1, child: true, arm: 'chest' })); oval(ctx, 306, 208, 9, 5, t('#6a5438'));
  person(v, 356, 178, 40, folk(2, { f: -1, old: true, hat: true, stick: 'staff' }));
  gulls(v, 200, 60, 5, 120); for (const [x, y] of [[36, 138], [252, 132]]) { oval(ctx, x, y, 4, 2.4, t('#e8e6e0')); oval(ctx, x + 3.4, y - 2.4, 1.8, 1.8, t('#e8e6e0')); }
  finish(v, { noLeaves: true });
}
/** 돌아오지 않는 배: 해 진 선창에서 빈 바다를 보는 사람들, 등불 하나, 비어 있는 매는 말뚝 */
function harborWait(v) {
  const { ctx, t } = v; sky(v); far(v, { sea: true });
  seaAt(v, HZ, { n: 120, rough: 1.5 });
  glow(v, 250, HZ + 2, 190, v.S.low ?? '#c88a60', 0.2, 20);
  // 먼 곶과 불 꺼진 집들
  poly(ctx, [640, 100, 580, 102, 520, 118, 490, 130, 640, 132], t(mixh('#3a3a38', v.S.haze, 0.25))); quay(v, 520, 640, 136, true);
  // 선창: 물 위로 뻗은 널다리
  poly(ctx, [640, 196, 150, 184, 138, 190, 640, 214], t('#4a3c2e')); poly(ctx, [138, 190, 640, 214, 640, 222, 138, 195], t('#2e241c'));
  for (let x = 160; x < 640; x += 60) { rect(ctx, x, 192 + (x - 150) * 0.03, 5, 60, t('#241c16')); stroke(ctx, [x + 2, 232, x + 12, 232], 1, rgba(t('#dfe8ea'), 0.4)); }
  for (let x = 170; x < 640; x += 22) stroke(ctx, [x, 185 + (x - 150) * 0.025, x - 3, 191 + (x - 150) * 0.045], 0.6, rgba('#000000', 0.3));
  // 비어 있는 말뚝과 감긴 밧줄, 돌아온 배 한 척
  rect(ctx, 196, 166, 6, 22, t('#241c16')); for (let i = 0; i < 3; i++) stroke(ctx, [195, 178 + i * 3, 203, 178 + i * 3], 1.4, t('#b8a070')); stroke(ctx, [203, 184, 222, 190, 214, 194], 1.2, t('#b8a070'));
  skiff(v, 80, 214, 1.1, 1, { sail: 'furled', hull: '#241c16', roll: 0.04 });
  // 기둥에 건 등불
  rect(ctx, 300, 120, 4, 68, t('#241c16')); stroke(ctx, [302, 122, 316, 122], 1.6, t('#241c16')); rect(ctx, 312, 124, 7, 10, '#ffcf70'); glow(v, 315, 130, 54, '#ffb050', 0.42); pool(v, 320, 192, 70, 8, '#ffb050', 0.22);
  // 기다리는 사람들: 등을 보이고 바다를 본다
  person(v, 356, 192, 86, folk(1, { f: 0, female: true, long: true, cloak: true, rim: WARM, rimDir: -1 }));
  person(v, 392, 194, 90, mine(v, { f: 0, cloak: true, rim: WARM, rimDir: -1 }));
  person(v, 424, 196, 50, folk(3, { f: 0, child: true }));
  person(v, 474, 198, 84, folk(4, { f: -1, female: true, long: true, hood: true, old: true, arm: 'chest' }));
  person(v, 540, 204, 88, folk(2, { f: -1, old: true, hat: true, stick: 'staff' }));
  person(v, 254, 188, 78, folk(5, { f: 0, female: true, hood: true, rim: WARM, rimDir: 1 }));
  // 물에 밀려온 것: 깨진 널, 노 하나
  stroke(ctx, [400, 232, 452, 228], 2, t('#3a2c20')); poly(ctx, [300, 226, 326, 222, 330, 227, 304, 231], t('#30261e'));
  gulls(v, 140, 80, 3, 80);
  finish(v, { noLeaves: true });
}

export const PLATES11 = {
  /** 건국. variant: proclaim(선포) crown(대관) fallen(무너진 왕좌) */
  founding(v) { const k = v.variant ?? 'proclaim'; return k === 'crown' ? foundingCrown(v) : k === 'fallen' ? foundingFallen(v) : foundingProclaim(v); },
  /** 하늘 기수. variant: nest(둥지와 알) wings(날개 펼친 마수) above(하늘에서 본 땅) tame(길들이는 마당) */
  mount(v) { const k = v.variant ?? 'wings'; return k === 'nest' ? mountNest(v) : k === 'above' ? mountAbove(v) : k === 'tame' ? mountTame(v) : mountWings(v); },
  /** 포구. variant: dawn(새벽 고깃배) storm(폭풍) racks(생선 말리는 장대) wait(돌아오지 않는 배) */
  harbor(v) { const k = v.variant ?? 'dawn'; return k === 'storm' ? harborStorm(v) : k === 'racks' ? harborRacks(v) : k === 'wait' ? harborWait(v) : harborDawn(v); },
};
