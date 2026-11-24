// 40단계 삽화: 서자(문간에 선 아이, 적자와의 대면, 문장 없는 방패, 인정받는 날),
// 피난(눈길 행렬, 난민촌 불빛, 닫힌 성문, 새 마을), 장의사(관 짜는 작업장, 장례 행렬, 밤의 묘지, 역병 수레).
// 장의사 판은 등급 선 안: 시신은 덮개나 관으로만 보인다.
import { hash, rgba, dark } from './sceneKit.js';
import { VW, VH, sky, far, townFar, ground, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, tree, banner, crows, sunSign, finish } from './vignetteKit.js';
import { horseSil } from './vignettePlates4.js';
import { spear, torch } from './vignettePlates5.js';
import { facade, table } from './vignettePlates18.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const poly = (ctx, pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
const stroke = (ctx, pts, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
const oval = (ctx, x, y, rx, ry, c, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); };
const WARM = 'rgba(255,190,110,.55)', COLD = 'rgba(190,210,240,.45)', FIRE = 'rgba(255,150,70,.6)';
const CL = ['#4a4038', '#3e4a40', '#54463a', '#3a3e4a', '#5a4a3a', '#4e3a34'], HR = ['#2a1e16', '#6a4a2a', '#1c1614', '#8a6a44', '#3a2a1e', '#5a4030'];
const mine = (v, o = {}) => ({ cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long, ...o });
const folk = (i, o = {}) => ({ cloth: CL[i % 6], hair: HR[i % 6], female: i % 3 === 1, long: i % 3 === 1, ...o });
const noble = (i, o = {}) => ({ cloth: ['#5a2630', '#2f3a5a', '#4a3a5a', '#3a4a3a'][i % 4], hair: HR[(i + 1) % 6], cloak: true, ...o });
const mourner = (i, o = {}) => ({ cloth: ['#1e1c22', '#24202a', '#1a1a1e'][i % 3], hair: HR[i % 6], female: i % 2 === 0, long: i % 2 === 0, cloak: true, hood: i % 3 !== 1, ...o });
const soldier = (o = {}) => ({ cloth: '#5a5e68', hair: '#1c1614', hat: true, ...o });

/** 방패. mark가 있으면 문장(둥근 표), 없으면 민무늬 */
function shieldAt(ctx, x, y, s, c, mark) {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 9 * s, y - 12 * s); ctx.lineTo(x + 9 * s, y - 12 * s); ctx.lineTo(x + 9 * s, y + 2 * s); ctx.quadraticCurveTo(x + 8 * s, y + 10 * s, x, y + 14 * s); ctx.quadraticCurveTo(x - 8 * s, y + 10 * s, x - 9 * s, y + 2 * s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2 * s; ctx.stroke();
  if (mark) { oval(ctx, x, y - 1 * s, 4 * s, 4 * s, mark); rect(ctx, x - 9 * s, y - 12 * s, 18 * s, 3 * s, mark); }
}
/** 관: 옆으로 누운 것 (덮개 천 선택) */
function coffin(v, x, y, len, o = {}) {
  const { ctx } = v; const tn = o.raw ? (c) => c : v.t, h = len * 0.15;
  poly(ctx, [x - len / 2, y, x - len / 2 + len * 0.08, y - h, x + len / 2 - len * 0.04, y - h, x + len / 2, y - h * 0.4, x + len / 2, y], tn(o.color ?? '#4a3626'));
  rect(ctx, x - len / 2, y - h - 2, len * 0.98, 3, tn(dark(o.color ?? '#4a3626', -0.2)));
  if (o.pall) { poly(ctx, [x - len * 0.4, y - h - 3, x + len * 0.4, y - h - 3, x + len * 0.44, y - h * 0.2, x + len * 0.3, y - h * 0.34, x, y - h * 0.16, x - len * 0.3, y - h * 0.34, x - len * 0.44, y - h * 0.2], tn(o.pall)); sunSign(v, x, y - h * 0.7, len * 0.035, tn('#c8a850')); }
}
/** 세워 둔 관 (작업장 벽) */
function coffinUp(ctx, x, y, h, c) { poly(ctx, [x - h * 0.13, y, x - h * 0.19, y - h * 0.72, x - h * 0.1, y - h, x + h * 0.1, y - h, x + h * 0.19, y - h * 0.72, x + h * 0.13, y], c); stroke(ctx, [x - h * 0.19, y - h * 0.72, x + h * 0.19, y - h * 0.72], 0.8, 'rgba(0,0,0,.3)'); stroke(ctx, [x, y - h * 0.96, x, y - 4], 0.6, 'rgba(0,0,0,.2)'); }
/** 짐수레: 바퀴 둘과 짐칸. 무엇을 실었는지는 부른 쪽이 그린다 */
function cart(v, x, y, w, d = 1) {
  const { ctx, t } = v;
  oval(ctx, x, y + 2, w * 0.6, 4, 'rgba(0,0,0,.22)'); rect(ctx, x - w / 2, y - 26, w, 7, t('#4a3a2a')); rect(ctx, x - w / 2, y - 44, 4, 20, t('#3a2c20')); rect(ctx, x + w / 2 - 4, y - 44, 4, 20, t('#3a2c20'));
  stroke(ctx, [x + d * w / 2, y - 22, x + d * (w / 2 + 34), y - 16], 2.6, t('#3a2c20'));
  for (const k of [-0.28, 0.28]) { const wx = x + w * k; ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx, y - 14, 14, 0, TAU); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; stroke(ctx, [wx - Math.cos(a) * 14, y - 14 - Math.sin(a) * 14, wx + Math.cos(a) * 14, y - 14 + Math.sin(a) * 14], 1, t('#2a2018')); } }
}
/** 천막 */
function tent(v, x, y, w, h, c = '#8a8272', lit = false) {
  const { ctx, t } = v; poly(ctx, [x - w / 2, y, x, y - h, x + w / 2, y], t(c)); poly(ctx, [x - w * 0.12, y, x, y - h * 0.62, x + w * 0.12, y], lit ? '#c88a40' : t('#1e1a18')); stroke(ctx, [x, y - h - 5, x, y - h], 1.2, t('#2a2018'));
  if (lit) glow(v, x, y - h * 0.3, w * 0.5, '#ffb060', 0.14);
}
/** 눈발 */
const snowfall = (ctx, n, seed) => { for (let i = 0; i < n; i++) oval(ctx, hash(i, seed) * VW, hash(i, seed + 1) * VH, 1 + hash(i, seed + 2), 1 + hash(i, seed + 2), 'rgba(236,240,248,.6)'); };
/** 묘비 */
function stone(v, x, y, s, cross = false) { const { ctx, t } = v, c = t('#7a7870'); if (cross) { rect(ctx, x - 2 * s, y - 26 * s, 4 * s, 26 * s, c); rect(ctx, x - 8 * s, y - 20 * s, 16 * s, 4 * s, c); } else { rect(ctx, x - 6 * s, y - 20 * s, 12 * s, 20 * s, c); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - 20 * s, 6 * s, Math.PI, 0); ctx.fill(); rect(ctx, x - 6 * s, y - 20 * s, 3 * s, 20 * s, 'rgba(0,0,0,.2)'); } }

/* ---------- 서자 ---------- */
/** 문간에 선 아이: 저택의 큰 문 앞, 어미 손을 잡은 아이와 문을 막아선 집사, 위층 창의 그림자 */
function bbDoor(v) {
  const { ctx, t } = v; sky(v); far(v, {});
  ground(v, () => 196, { color: '#6a6652', color2: '#46443a', tufts: 20 });
  // 저택 앞면: 돌벽, 큰 문, 위층 창과 문장
  rect(ctx, 200, 0, 440, 200, t('#6e685e')); for (let r = 0; r < 9; r++) for (let i = 0; i < 9; i++) rect(ctx, 206 + i * 50 + (r % 2) * 24, 14 + r * 21, 34, 1.4, 'rgba(0,0,0,.16)');
  rect(ctx, 200, 186, 440, 14, t('#57524a')); rect(ctx, 368, 196, 144, 6, t('#8a847a')); rect(ctx, 356, 202, 168, 6, t('#7a746a'));
  rect(ctx, 384, 78, 112, 122, t('#2a2018')); rect(ctx, 392, 86, 46, 114, t('#3e2e20')); rect(ctx, 442, 86, 46, 114, '#d89850'); rect(ctx, 442, 86, 46, 40, 'rgba(60,30,10,.4)'); poly(ctx, [488, 86, 508, 94, 508, 204, 488, 200], t('#33261a'));
  for (const y of [100, 140, 176]) rect(ctx, 394, y, 42, 3, t('#17130f'));
  shieldAt(ctx, 440, 50, 1.5, t('#5a2630'), t('#c8a850')); glow(v, 465, 150, 70, '#ffb060', 0.14);
  for (const x of [270, 580]) { rect(ctx, x - 22, 40, 44, 60, t('#2a2018')); rect(ctx, x - 18, 44, 36, 52, x === 270 ? '#c89048' : t('#1e1a1c')); rect(ctx, x - 1, 44, 2, 52, t('#2a2018')); }
  // 위층 창에 선 안주인의 그림자
  person(v, 270, 100, 44, { raw: true, f: 1, cloth: '#2a1e18', hair: '#1c1410', female: true, long: true, noShadow: true }); glow(v, 270, 70, 40, '#ffb060', 0.12);
  // 문을 막아선 집사
  person(v, 462, 204, 104, { raw: true, f: -1, cloth: '#2e2a30', hair: '#8a8478', old: true, arm: 'out', rim: WARM, rimDir: 1 });
  // 아이와 어미: 해진 망토, 작은 보따리
  person(v, 300, 232, 96, { f: 1, cloth: '#5a4a44', hair: '#3a2a1e', female: true, long: true, cloak: true, hood: true, arm: 'fwd', rim: WARM, rimDir: 1 });
  person(v, 338, 234, 62, { ...mine(v, { f: 1, child: true, rim: WARM, rimDir: 1 }), female: v.me.female }); oval(ctx, 276, 226, 10, 7, t('#6a5a44'));
  // 마당의 마부와 말
  horseSil(v, 110, 228, 70, 1, '#2a2018', {}); person(v, 150, 232, 92, folk(4, { f: 1, hat: true }));
  tree(v, 40, 206, 150, { dark: true });
  finish(v);
}
/** 적자와의 대면: 긴 홀, 집안 문장 아래 마주 선 두 젊은이. 한쪽은 비단과 시종, 한쪽은 무명옷 */
function bbFace(v) {
  const { ctx } = v; room(v, { wall: '#575048', floor: '#3a342e', fy: 172 });
  for (const x of [110, 530]) { windowAt(v, x, 24, 34, 90, { arch: true }); shaft(v, x, 114, 34, 120, x < 320 ? 80 : -80, '#e8dcc0', 0.1); }
  // 가운데 벽의 큰 문장 걸개와 긴 식탁
  poly(ctx, [276, 14, 364, 14, 364, 118, 320, 140, 276, 118], '#5a2630'); rect(ctx, 268, 10, 104, 6, '#8a7440'); shieldAt(ctx, 320, 66, 2.4, '#c8a850', '#5a2630');
  table(ctx, 230, 410, 176, '#4a3626', 8, 20); for (const x of [250, 388]) { rect(ctx, x - 1, 146, 2, 22, '#8a7440'); candle(v, x, 146, 8); glow(v, x, 136, 36, '#ffcf80', 0.16); }
  // 적자: 비단 옷과 뒤에 선 시종 둘, 늙은 가신
  person(v, 430, 232, 110, noble(0, { raw: true, f: -1, arm: 'chest', rim: WARM, rimDir: -1 })); stroke(ctx, [416, 176, 398, 222], 2.2, '#9a9ea6'); rect(ctx, 412, 172, 9, 3, '#8a7440');
  person(v, 500, 234, 104, folk(3, { raw: true, f: -1, cloth: '#3a3e4a' })); person(v, 548, 236, 106, folk(0, { raw: true, f: -1, cloth: '#3a3e4a', stick: 'staff' }));
  person(v, 600, 238, 100, noble(2, { raw: true, f: -1, old: true, hair: '#b8b4ac' }));
  // 서자(나): 무명옷, 맨손. 뒤에는 아무도 없다
  person(v, 214, 234, 108, mine(v, { raw: true, f: 1, rim: WARM, rimDir: 1 }));
  // 문가에서 지켜보는 하인들
  rect(ctx, 20, 60, 50, 116, '#17120e'); for (let i = 0; i < 2; i++) person(v, 36 + i * 22, 180 + i * 4, 70, folk(i + 1, { raw: true, f: 1, noShadow: true }));
  finish(v, { inside: true });
}
/** 문장 없는 방패: 시합장 가장자리. 문장 깃발이 늘어선 천막들 앞에서 민무늬 방패를 드는 사람 */
function bbShield(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {});
  ground(v, (x) => Math.max(fn(x), 150) + 24, { color: '#74724e', color2: '#4c4c38', tufts: 60 });
  // 시합장 울타리와 관람석, 문장 깃발
  rect(ctx, 250, 110, 280, 54, t('#5a4a3a')); poly(ctx, [240, 110, 540, 110, 520, 92, 260, 92], t('#6a2a36')); for (let i = 0; i < 12; i++) person(v, 266 + i * 23, 150, 34, folk(i, { f: 0, noShadow: true }));
  rect(ctx, 250, 150, 280, 14, t('#4a3a2a')); stroke(ctx, [140, 184, 640, 176], 2.4, t('#3a2c20')); for (let x = 150; x < 640; x += 40) rect(ctx, x, 176, 3, 22, t('#3a2c20'));
  const cols = ['#8a2f2a', '#2f4a73', '#6a5a2a', '#3a5a3a', '#5a2a5a'];
  for (let i = 0; i < 5; i++) { const x = 560 - i * 70; banner(v, x, 176, 86 - i * 4, cols[i], { mark: '#d8b04a' }); }
  // 말 탄 기사 (멀리): 문장 방패
  person(v, 196, 164, 56, { f: 1, cloth: '#8a8e96', hair: '#1c1614', hat: true, noShadow: true }); horseSil(v, 200, 186, 62, 1, '#3a2a1e', {}); shieldAt(ctx, 190, 150, 0.9, t('#8a2f2a'), t('#d8b04a')); spear(v, 214, 150, 80, 0.1);
  // 나: 무릎 꿇어 끈을 죄고 일어서는 참. 빈 잿빛 방패
  person(v, 330, 236, 112, mine(v, { f: 1, cloak: true, rim: WARM, rimDir: -1 })); shieldAt(ctx, 362, 180, 2.3, t('#8a8a84'), null); stroke(ctx, [296, 236, 300, 130], 2, t('#3a2c20')); poly(ctx, [300, 130, 297, 118, 303, 118], t('#b8bcc4'));
  // 종자 대신 선 늙은 하인과 여윈 말
  person(v, 262, 238, 100, folk(5, { f: 1, old: true, hair: '#b8b4ac', arm: 'fwd' })); horseSil(v, 120, 236, 84, 1, '#5a4a3a', {});
  // 수군대는 문장관과 귀족들
  person(v, 470, 238, 106, noble(1, { f: -1, hat: true, arm: 'chest' })); poly(ctx, [446, 176, 462, 178, 460, 198, 444, 196], '#d8ceb0');
  person(v, 524, 240, 108, noble(0, { f: -1 })); person(v, 572, 238, 100, noble(3, { f: -1, female: true, long: true, veil: true }));
  finish(v);
}
/** 인정받는 날: 단 위의 아버지가 무릎 꿇은 서자의 어깨에 집안의 망토를 걸친다. 늘어선 집안 사람들 */
function bbNamed(v) {
  const { ctx } = v; room(v, { wall: '#5a524a', floor: '#3a342e', fy: 170 });
  for (const x of [140, 500]) windowAt(v, x, 22, 34, 86, { arch: true });
  ctx.fillStyle = '#1a1512'; ctx.beginPath(); ctx.arc(320, 44, 30, 0, TAU); ctx.fill(); ctx.fillStyle = '#f0e0b0'; ctx.beginPath(); ctx.arc(320, 44, 25, 0, TAU); ctx.fill(); stroke(ctx, [295, 44, 345, 44], 2, '#1a1512'); stroke(ctx, [320, 19, 320, 69], 2, '#1a1512');
  glow(v, 320, 44, 70, '#ffe6a8', 0.24); shaft(v, 320, 72, 50, 150, 0, '#ffe6a8', 0.13);
  // 양쪽 벽의 문장 깃발
  for (const [x, c] of [[70, '#5a2630'], [230, '#2f3a5a'], [410, '#2f3a5a'], [570, '#5a2630']]) { rect(ctx, x - 16, 30, 32, 4, '#8a7440'); poly(ctx, [x - 14, 34, x + 14, 34, x + 14, 104, x, 116, x - 14, 104], c); oval(ctx, x, 66, 6, 6, '#c8a850'); }
  // 단과 가주의 의자
  rect(ctx, 240, 168, 160, 12, '#746a5e'); rect(ctx, 228, 180, 184, 10, '#5e564c'); rect(ctx, 296, 96, 48, 74, '#3a2a1e'); rect(ctx, 290, 90, 60, 8, '#4a3626');
  // 아버지: 망토를 두 손으로 펼쳐 든다
  person(v, 300, 172, 100, noble(0, { raw: true, f: 1, old: true, hair: '#b8b4ac', arm: 'fwd', rim: 'rgba(255,230,170,.5)', rimDir: 1 }));
  // 서자(나): 단 아래 무릎 꿇음. 어깨에 내려오는 붉은 망토
  person(v, 360, 206, 100, mine(v, { raw: true, f: -1, pose: 'kneel', rim: 'rgba(255,230,170,.5)', rimDir: -1 }));
  poly(ctx, [360, 152, 380, 148, 402, 204, 378, 206], '#6a2a36'); stroke(ctx, [360, 152, 380, 148], 1.8, '#c8a850'); pool(v, 340, 206, 70, 10, '#ffe6a8', 0.14);
  // 서기와 사제
  person(v, 220, 200, 92, { raw: true, f: 1, cloth: '#e0d8c4', hair: '#8a8478', robe: true, arm: 'chest' });
  // 늘어선 집안 사람들: 고개 숙인 이, 외면하는 적자
  for (let i = 0; i < 4; i++) person(v, 40 + i * 44, 232 + (i % 2) * 5, 104 - (i % 3) * 6, noble(i, { raw: true, f: 1, pose: i === 1 ? 'bow' : 'stand', female: i === 2, long: i === 2 }));
  for (let i = 0; i < 4; i++) person(v, 460 + i * 44, 232 + (i % 2) * 5, 106 - (i % 3) * 6, noble(i + 1, { raw: true, f: i === 0 ? 1 : -1, pose: i === 2 ? 'bow' : 'stand', arm: i === 0 ? 'chest' : undefined, female: i === 3, long: i === 3, veil: i === 3 }));
  finish(v, { inside: true });
}

/* ---------- 피난 ---------- */
/** 눈길 행렬: 산고개를 넘는 긴 줄. 끄는 수레, 업힌 아이, 길가에 버려진 세간 */
function mgSnow(v) {
  const { ctx, t } = v; sky(v); far(v, { peaks: true });
  poly(ctx, [0, 110, 120, 60, 220, 100, 330, 50, 440, 96, 560, 66, 640, 100, 640, 240, 0, 240], t('#8a9098'));
  poly(ctx, [120, 60, 150, 84, 104, 90], t('#e0e4ea')); poly(ctx, [330, 50, 366, 80, 306, 84], t('#e0e4ea')); poly(ctx, [560, 66, 590, 88, 540, 90], t('#e0e4ea'));
  ground(v, (x) => 150 + Math.sin(x / 120) * 8 + x * 0.03, { color: '#c8ccd2', color2: '#8a909a', tufts: 0, plain: true });
  // 길: 멀리 고개에서 앞까지 굽어 내려온다
  ctx.strokeStyle = rgba(t('#9a9ea8'), 0.9); ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(470, 112); ctx.quadraticCurveTo(380, 150, 460, 176); ctx.quadraticCurveTo(560, 204, 300, 220); ctx.quadraticCurveTo(140, 226, 0, 236); ctx.stroke();
  // 멀리서 내려오는 줄 (점점 커진다)
  for (let i = 0; i < 16; i++) { const u = i / 16, x = 468 - Math.sin(u * 3) * 40 + u * 20, y = 116 + u * 62, h = 12 + u * 28; person(v, x, y, h, folk(i, { f: -1, cloak: true, hood: i % 2 === 0, pose: i % 3 === 0 ? 'bow' : 'stand', noShadow: true })); }
  // 불타는 고향의 연기
  smoke(v, 560, 70, 90, 40, '#3a3632', 0.22); glow(v, 560, 84, 40, '#ff7a3a', 0.12);
  // 가까운 줄: 수레를 끄는 사내, 아이를 업은 여인, 지팡이 짚은 노인, 아이들
  cart(v, 430, 226, 76, -1); rect(ctx, 400, 172, 30, 28, t('#6a5038')); oval(ctx, 448, 188, 16, 12, t('#a89670')); rect(ctx, 436, 160, 20, 4, t('#5a4430'));
  person(v, 362, 228, 96, folk(0, { f: -1, pose: 'bow', cloak: true, arm: 'fwd' }));
  person(v, 300, 230, 96, folk(1, { f: -1, cloak: true, hood: true, arm: 'chest' })); oval(ctx, 310, 172, 7, 7, t('#c9a184')); oval(ctx, 312, 180, 9, 10, t('#6a6254'));
  person(v, 250, 232, 62, folk(2, { f: -1, child: true, cloak: true })); person(v, 200, 232, 94, mine(v, { f: -1, cloak: true, pose: 'bow', rim: COLD, rimDir: -1 })); oval(ctx, 212, 176, 12, 14, t('#5a4a36'));
  person(v, 140, 234, 96, folk(5, { f: -1, old: true, hair: '#c8c4bc', stick: 'staff', cloak: true })); person(v, 84, 236, 100, folk(3, { f: -1, cloak: true, hood: true })); person(v, 40, 238, 56, folk(4, { f: -1, child: true }));
  // 길가에 버린 것: 궤짝, 부서진 바퀴
  rect(ctx, 520, 214, 30, 18, t('#5a4636')); ctx.strokeStyle = t('#3a2c20'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(580, 222, 13, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke(); tree(v, 600, 212, 110, { bare: true, dark: true });
  snowfall(ctx, 70, 31);
  finish(v, { noLeaves: true });
}
/** 난민촌 불빛: 성벽 밖 어둔 들에 가득한 천막과 작은 불들. 죽 솥 앞의 줄 */
function mgCamp(v) {
  const { ctx, t } = v; sky(v); far(v, {});
  // 멀리 성벽과 불 켜진 탑
  rect(ctx, 360, 96, 280, 40, t('#4a4a52')); for (let i = 0; i < 12; i++) rect(ctx, 364 + i * 24, 88, 14, 10, t('#4a4a52')); rect(ctx, 440, 60, 36, 76, t('#54545c')); rect(ctx, 580, 70, 30, 66, t('#54545c')); for (const [x, y] of [[452, 80], [590, 90], [520, 110]]) { rect(ctx, x, y, 5, 8, '#e0a050'); glow(v, x + 2, y + 4, 12, '#ffb060', 0.2); }
  ground(v, () => 134, { color: '#4a4c42', color2: '#2e302c', tufts: 30 });
  // 들판 가득한 천막 (멀수록 작게)
  for (let r = 0; r < 4; r++) { const y = 150 + r * 20, s = 0.45 + r * 0.2; for (let i = 0; i < 10 - r; i++) { const x = (i + (r % 2) * 0.5) * (640 / (9.5 - r)) + hash(i, r) * 14 - 10, lit = hash(i, r + 5) < 0.4; tent(v, x, y, 46 * s, 30 * s, ['#7a7466', '#6a6458', '#827a68'][(i + r) % 3], lit); if (hash(i, r + 9) < 0.3) { flame(v, x + 26 * s, y, 4 * s); glow(v, x + 26 * s, y - 4, 16 * s, '#ff8a30', 0.14); } } }
  // 앞쪽: 큰 솥과 죽을 받는 줄
  rect(ctx, 296, 196, 5, 34, t('#2a2018')); rect(ctx, 352, 196, 5, 34, t('#2a2018')); stroke(ctx, [294, 198, 360, 198], 3, t('#2a2018')); oval(ctx, 326, 216, 20, 13, t('#1e1a18')); rect(ctx, 306, 204, 40, 5, t('#2a2622'));
  flame(v, 318, 234, 5); flame(v, 332, 234, 6); glow(v, 326, 222, 60, '#ff8a30', 0.12); pool(v, 326, 236, 110, 8, '#ff8a30', 0.14); smoke(v, 328, 196, 110, 26, '#3a3632', 0.2);
  person(v, 382, 236, 100, { f: -1, cloth: '#e0d8c4', hair: '#8a8478', robe: true, arm: 'fwd', rim: FIRE, rimDir: -1 }); stroke(ctx, [352, 190, 340, 206], 1.6, t('#6a5a44'));
  for (let i = 0; i < 6; i++) person(v, 262 - i * 40, 236 + (i % 2) * 3, i === 2 ? 58 : 94 + (i % 3) * 5, i === 1 ? mine(v, { f: 1, arm: 'fwd', cloak: true, rim: FIRE, rimDir: 1 }) : folk(i, { f: 1, child: i === 2, old: i === 4, cloak: i % 2 === 0, hood: i === 3, pose: i === 4 ? 'bow' : 'stand', arm: i === 0 ? 'fwd' : undefined, rim: FIRE, rimDir: 1 }));
  // 천막 앞에 웅크린 식구
  tent(v, 540, 232, 130, 84, '#6e685a', true); person(v, 478, 238, 60, folk(1, { f: 1, pose: 'huddle', cloak: true })); person(v, 600, 238, 52, folk(2, { f: -1, pose: 'huddle', child: true }));
  finish(v, { noLeaves: true });
}
/** 닫힌 성문: 굳게 닫힌 문 앞에 몰린 사람들, 성벽 위의 창과 손을 내젓는 관리 */
function mgGate(v) {
  const { ctx, t } = v; sky(v); far(v, {});
  ground(v, () => 190, { color: '#6a6650', color2: '#48463a', tufts: 20 });
  // 성벽과 문루
  rect(ctx, 0, 40, VW, 156, t('#6a665e')); for (let i = 0; i < 22; i++) rect(ctx, i * 30, 28, 18, 14, t('#6a665e')); for (let r = 0; r < 7; r++) for (let i = 0; i < 13; i++) rect(ctx, i * 52 + (r % 2) * 26, 56 + r * 20, 36, 1.4, 'rgba(0,0,0,.16)');
  rect(ctx, 236, 6, 168, 190, t('#767268')); for (let i = 0; i < 6; i++) rect(ctx, 236 + i * 30, -4, 18, 14, t('#767268'));
  // 닫힌 문: 쇠 띠와 빗장
  ctx.fillStyle = t('#2e2218'); ctx.beginPath(); ctx.moveTo(270, 196); ctx.lineTo(270, 110); ctx.arc(320, 110, 50, Math.PI, 0); ctx.lineTo(370, 196); ctx.fill(); stroke(ctx, [320, 62, 320, 196], 1.6, t('#17120e'));
  for (const y of [100, 136, 172]) rect(ctx, 272, y, 96, 4, t('#17130f')); for (let i = 0; i < 8; i++) for (const y of [102, 138, 174]) oval(ctx, 280 + i * 11.6, y, 1.4, 1.4, t('#6a6e76'));
  banner(v, 250, 6, 40, '#8a2f2a', { mark: '#d8b04a' });
  // 성벽 위: 창 든 병사들과 손을 내젓는 관리
  for (let i = 0; i < 7; i++) { const x = 40 + i * 88; if (x > 230 && x < 410) continue; person(v, x, 44, 40, soldier({ f: x < 320 ? 1 : -1, noShadow: true })); spear(v, x + 8, 44, 50, 0.04); }
  person(v, 196, 44, 44, { f: 1, cloth: '#6a2a36', hair: '#8a8478', hat: true, arm: 'out', noShadow: true }); person(v, 440, 44, 40, soldier({ f: -1, noShadow: true })); spear(v, 452, 44, 50, 0.03);
  // 문 앞에 몰린 사람들: 문을 두드리는 손, 아이를 들어 보이는 어미, 주저앉은 노인
  for (let i = 0; i < 9; i++) { const x = 200 + i * 28 + hash(i, 2) * 10; person(v, x, 204 + (i % 3) * 3, 70 + (i % 2) * 6, folk(i, { f: x < 320 ? 1 : -1, cloak: i % 2 === 0, hood: i % 4 === 0, arm: i === 4 ? 'fwd' : undefined, noShadow: true })); }
  cart(v, 520, 228, 80, -1); rect(ctx, 492, 176, 30, 26, t('#6a5038')); oval(ctx, 540, 190, 16, 11, t('#a89670'));
  person(v, 130, 236, 100, folk(1, { f: 1, cloak: true, arm: 'up' })); person(v, 84, 238, 96, folk(3, { f: 1, pose: 'kneel', arm: 'chest' })); person(v, 30, 238, 60, folk(5, { f: 1, pose: 'huddle', old: true, hair: '#c8c4bc' }));
  person(v, 410, 236, 106, mine(v, { f: -1, cloak: true, rim: COLD, rimDir: -1 })); person(v, 450, 238, 58, folk(2, { f: -1, child: true })); person(v, 600, 238, 98, folk(4, { f: -1, cloak: true, hood: true, arm: 'chest' }));
  crows(v, 520, 20, 4, 60);
  finish(v, { noLeaves: true });
}
/** 새 마을: 뼈대만 선 집들과 첫 밭고랑, 우물을 파는 사람들, 말뚝에 건 옛 고향의 깃발 */
function mgVillage(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {});
  ground(v, (x) => Math.max(fn(x), 148) + 16, { color: '#72784e', color2: '#4a5038', tufts: 70 });
  // 갓 간 밭고랑
  poly(ctx, [0, 176, 220, 168, 260, 200, 0, 214], t('#5a4a36')); for (let i = 0; i < 7; i++) stroke(ctx, [0, 180 + i * 5, 226 + i * 5, 171 + i * 4.4], 0.8, t('#3e3226'));
  // 다 지은 집 하나, 뼈대만 선 집 둘
  facade(v, 500, 130, 100, 190, { door: 548, win: 600, dw: 30, dh: 56 }); smoke(v, 600, 66, 80, 20, '#4a4642', 0.18);
  for (const [x, w, h] of [[300, 120, 80], [130, 90, 60]]) { const b = 190; for (let i = 0; i <= 3; i++) rect(ctx, x + (w - 4) * (i / 3), b - h, 4, h, t('#8a6a44')); rect(ctx, x, b - h, w, 4, t('#8a6a44')); rect(ctx, x, b - h * 0.5, w, 3, t('#8a6a44')); stroke(ctx, [x - 6, b - h, x + w / 2, b - h - 34, x + w + 6, b - h], 3.4, t('#8a6a44')); stroke(ctx, [x + w / 2, b - h - 34, x + w / 2, b - h], 2.4, t('#8a6a44')); }
  // 지붕 위의 목수와 들보를 나르는 두 사람
  person(v, 344, 96, 40, folk(0, { f: 1, pose: 'kneel', noShadow: true })); person(v, 250, 206, 70, folk(2, { f: 1 })); person(v, 290, 204, 70, folk(4, { f: 1 })); stroke(ctx, [236, 160, 304, 156], 4, t('#8a6a44'));
  // 우물 파기: 흙더미와 도르래
  oval(ctx, 430, 216, 26, 7, t('#2a2420')); oval(ctx, 470, 214, 22, 9, t('#5a4a36')); rect(ctx, 404, 172, 4, 44, t('#3a2c20')); rect(ctx, 452, 172, 4, 44, t('#3a2c20')); stroke(ctx, [402, 174, 458, 174], 3, t('#3a2c20')); stroke(ctx, [430, 174, 430, 208], 0.8, t('#d8ceb0'));
  person(v, 390, 226, 84, folk(1, { f: 1, arm: 'fwd', female: false, long: false }));
  // 말뚝에 건 옛 깃발과 그 아래 선 나, 뛰노는 아이들
  banner(v, 80, 232, 120, '#3a4a6a', { mark: '#d8ceb0' });
  person(v, 126, 236, 106, mine(v, { f: 1, rim: WARM, rimDir: -1 })); person(v, 176, 238, 96, folk(1, { f: 1, arm: 'chest' }));
  person(v, 560, 236, 54, folk(3, { f: -1, child: true })); person(v, 596, 234, 48, folk(0, { f: -1, child: true, arm: 'up' }));
  // 지켜보는 토박이 (언덕 위, 멀리)
  for (let i = 0; i < 3; i++) person(v, 440 + i * 14, fn(440) + 18, 22, folk(i + 3, { f: -1, noShadow: true }));
  finish(v);
}

/* ---------- 장의사 ---------- */
/** 관 짜는 작업장: 벽에 기대 선 관들, 받침대 위의 널과 대패, 문가에 선 상주 */
function utShop(v) {
  const { ctx } = v; room(v, { stone: false, wall: '#463a2e', floor: '#2e241a', fy: 176 }); rect(ctx, 0, 0, VW, 12, '#1e160f');
  windowAt(v, 300, 34, 56, 64, {}); shaft(v, 300, 98, 56, 130, 60, '#e0d8c4', 0.1);
  // 벽에 세워 둔 관들 (큰 것, 작은 것)
  for (const [x, h, c] of [[60, 150, '#5a4430'], [110, 140, '#4a3626'], [160, 150, '#6a5038'], [206, 86, '#5a4430']]) coffinUp(ctx, x, 180, h, c);
  // 연장 걸이
  rect(ctx, 400, 50, 150, 4, '#2a1e14'); for (let i = 0; i < 6; i++) { const x = 412 + i * 25; stroke(ctx, [x, 54, x, 80 + (i % 2) * 10], 1.6, '#5a4430'); if (i % 3 === 0) rect(ctx, x - 5, 80, 10, 8, '#8a8e96'); else if (i % 3 === 1) poly(ctx, [x - 2, 90, x + 8, 86, x + 8, 96], '#8a8e96'); else stroke(ctx, [x - 6, 78, x + 6, 78], 2, '#8a8e96'); }
  // 받침대 위의 짜는 중인 관과 대팻밥
  rect(ctx, 250, 196, 6, 36, '#33261a'); rect(ctx, 420, 196, 6, 36, '#33261a'); coffin(v, 338, 198, 200, { raw: true, color: '#7a5c3c' });
  for (let i = 0; i < 14; i++) { ctx.strokeStyle = '#c8a878'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(250 + hash(i, 4) * 190, 232 + hash(i, 5) * 6, 2.4, 0, 4); ctx.stroke(); }
  // 장의사(나): 대패를 민다
  person(v, 230, 236, 108, mine(v, { raw: true, f: 1, arm: 'fwd', rim: 'rgba(224,216,196,.45)', rimDir: 1 })); rect(ctx, 262, 158, 22, 8, '#3a2c20');
  // 견습 아이: 못 통을 든다
  person(v, 460, 234, 62, folk(2, { raw: true, f: -1, child: true, arm: 'fwd' })); rect(ctx, 436, 198, 14, 10, '#5a4430');
  // 등잔과 치수 재는 자
  stroke(ctx, [180, 232, 236, 228], 2, '#c8b890'); candle(v, 380, 130, 8); rect(ctx, 370, 136, 20, 3, '#2a1e14'); glow(v, 380, 120, 44, '#ffcf80', 0.16);
  // 문가의 상주: 검은 옷, 돈주머니
  rect(ctx, 560, 54, 60, 124, '#cfc8b8'); rect(ctx, 554, 48, 6, 130, '#2e241a'); rect(ctx, 560, 54, 60, 124, 'rgba(120,110,96,.5)');
  person(v, 580, 232, 102, mourner(0, { raw: true, f: -1, veil: true, hood: false, arm: 'chest', rim: COLD, rimDir: -1 })); person(v, 618, 234, 60, mourner(1, { raw: true, f: -1, child: true, hood: false, cloak: false }));
  finish(v, { inside: true });
}
/** 장례 행렬: 흐린 낮의 좁은 거리. 검은 천을 덮은 관 수레와 앞선 장의사, 뒤따르는 상복들 */
function utCortege(v) {
  const { ctx, t } = v; sky(v);
  // 거리 양쪽의 집들
  for (let i = 0; i < 8; i++) { const x = i * 84 - 20, h = 96 + hash(i, 14) * 40; rect(ctx, x, 182 - h, 80, h, t(i % 2 ? '#5e564c' : '#685e50')); poly(ctx, [x - 4, 182 - h, x + 40, 182 - h - 30, x + 84, 182 - h], t('#3a2e28')); rect(ctx, x + 12, 182 - h + 22, 14, 20, t('#2a2224')); rect(ctx, x + 50, 182 - h + 22, 14, 20, t('#2a2224')); rect(ctx, x + 30, 150, 18, 32, t('#2a2018')); }
  ground(v, () => 180, { color: '#74705f', color2: '#4e4a42', tufts: 0, plain: true });
  for (let i = 0; i < 30; i++) oval(ctx, hash(i, 21) * VW, 190 + hash(i, 22) * 46, 5, 1.6, 'rgba(0,0,0,.08)');
  // 문간에서 모자를 벗은 이웃들
  for (let i = 0; i < 4; i++) person(v, 60 + i * 168, 188, 60, folk(i + 1, { f: 1, pose: 'bow', noShadow: true, arm: i % 2 ? 'chest' : undefined }));
  // 관 수레와 검은 말
  cart(v, 330, 230, 120, 1); coffin(v, 330, 204, 110, { color: '#3a2a1e', pall: '#1e1c22' }); horseSil(v, 452, 232, 84, 1, '#17130f', {}); stroke(ctx, [392, 208, 430, 196], 1.4, t('#17130f'));
  // 앞선 장의사(나): 검은 긴 옷, 긴 지팡이
  person(v, 530, 236, 110, { ...mine(v, { f: 1, cloak: true, hat: true, stick: 'staff', rim: COLD, rimDir: -1 }), cloth: '#1e1c22' });
  // 종을 든 아이
  person(v, 586, 236, 62, mourner(1, { f: 1, child: true, hood: false, cloak: false, arm: 'fwd' })); oval(ctx, 604, 204, 4, 5, t('#9a8450'));
  // 뒤따르는 상복들
  for (let i = 0; i < 6; i++) person(v, 236 - i * 40, 234 + (i % 2) * 4, i === 3 ? 60 : 96 + (i % 3) * 5, mourner(i, { f: 1, pose: i % 3 === 0 ? 'bow' : 'stand', veil: i === 0, hood: i !== 0 && i % 2 === 0, child: i === 3, arm: i === 0 ? 'chest' : undefined }));
  finish(v, { noLeaves: true });
}
/** 밤의 묘지: 등불을 든 묘지기와 줄지은 묘비, 달빛, 담 너머 삽을 멘 그림자 */
function utNight(v) {
  const { ctx, t } = v; sky(v); const fn = far(v, {});
  const g = (x) => Math.max(fn(x), 140) + 30 + Math.sin(x / 80) * 5; ground(v, g, { color: '#3e4640', color2: '#262a2c', tufts: 50 });
  // 예배당과 묘지기 오두막
  rect(ctx, 30, 96, 70, 80, t('#4a4a50')); poly(ctx, [24, 96, 65, 56, 106, 96], t('#2e2a2e')); rect(ctx, 60, 40, 10, 30, t('#4a4a50')); sunSign(v, 65, 34, 5, t('#8a7440'));
  rect(ctx, 560, 130, 60, 50, t('#4a443c')); poly(ctx, [552, 130, 590, 104, 628, 130], t('#2e2620')); rect(ctx, 596, 146, 12, 14, '#c88a40'); glow(v, 602, 152, 20, '#ffb060', 0.16);
  // 낮은 돌담과 쇠문
  rect(ctx, 0, 168, VW, 10, t('#3a3a40')); for (let i = 0; i < 26; i++) rect(ctx, i * 26, 164, 16, 5, t('#44444a'));
  // 담 너머 도굴꾼의 그림자 (삽과 자루)
  person(v, 250, 170, 50, { f: 1, cloth: '#141216', hair: '#141216', hood: true, cloak: true, noShadow: true }); stroke(ctx, [262, 146, 270, 112], 1.6, t('#141216')); rect(ctx, 266, 106, 8, 9, t('#141216'));
  person(v, 286, 172, 46, { f: -1, cloth: '#141216', hair: '#141216', hood: true, pose: 'bow', noShadow: true });
  // 묘비들
  for (let i = 0; i < 12; i++) { const x = 40 + i * 52 + hash(i, 3) * 16, y = 190 + (i % 3) * 14; stone(v, x, y, 0.8 + (i % 3) * 0.3, i % 4 === 1); }
  tree(v, 420, 196, 150, { bare: true, dark: true }); crows(v, 420, 80, 3, 40);
  // 갓 덮은 무덤과 꽂아 둔 삽
  oval(ctx, 180, 226, 44, 9, t('#3a3026')); oval(ctx, 180, 222, 36, 7, t('#4a3e30')); stroke(ctx, [232, 228, 240, 186], 2, t('#2a2018')); rect(ctx, 236, 180, 8, 9, t('#6a6e76'));
  // 묘지기(나): 등불을 들어 담 쪽을 본다. 곁의 개
  person(v, 340, 236, 108, mine(v, { raw: true, f: -1, cloak: true, arm: 'fwd', rim: WARM, rimDir: -1 })); rect(ctx, 304, 180, 8, 11, '#e8b860'); stroke(ctx, [308, 176, 308, 180], 1, t('#2a2018')); glow(v, 308, 186, 50, '#ffb060', 0.2); pool(v, 316, 236, 70, 8, '#ffb060', 0.12);
  finish(v, { noLeaves: true });
}
/** 역병 수레: 저녁의 거리. 거적을 덮은 수레와 종을 든 수레꾼, 표시된 문들, 연기 나는 화톳불 */
function utPlague(v) {
  const { ctx, t } = v; sky(v);
  for (let i = 0; i < 8; i++) { const x = i * 84 - 30, h = 110 + hash(i, 44) * 44; rect(ctx, x, 184 - h, 80, h, t(i % 2 ? '#4e4a46' : '#58524a')); poly(ctx, [x - 4, 184 - h, x + 40, 184 - h - 28, x + 84, 184 - h], t('#2e2826')); rect(ctx, x + 12, 184 - h + 24, 14, 20, t('#1e1a1c')); rect(ctx, x + 52, 184 - h + 24, 14, 20, i === 5 ? '#b87a38' : t('#1e1a1c'));
    rect(ctx, x + 30, 148, 20, 36, t('#2a2018')); if (i % 2 === 0) { stroke(ctx, [x + 33, 154, x + 47, 172], 2, '#a03a2a'); stroke(ctx, [x + 47, 154, x + 33, 172], 2, '#a03a2a'); } if (i % 3 === 1) { rect(ctx, x + 28, 160, 24, 3, t('#6a5a44')); rect(ctx, x + 28, 172, 24, 3, t('#6a5a44')); } }
  ground(v, () => 182, { color: '#5e5a50', color2: '#3a3836', tufts: 0, plain: true });
  // 화톳불: 병을 쫓는 연기
  for (const x of [90, 560]) { rect(ctx, x - 10, 196, 20, 6, t('#2a2420')); flame(v, x - 3, 197, 7); flame(v, x + 4, 197, 5); glow(v, x, 188, 40, '#ff8a30', 0.14); smoke(v, x + 4, 180, 150, 30, '#3a3632', 0.26); }
  // 수레: 거적 덮은 짐 (윤곽만), 삐져나온 것은 없다
  cart(v, 330, 230, 130, 1);
  ctx.fillStyle = t('#8a8068'); ctx.beginPath(); ctx.moveTo(266, 204); ctx.quadraticCurveTo(280, 176, 310, 180); ctx.quadraticCurveTo(334, 166, 360, 178); ctx.quadraticCurveTo(388, 176, 396, 204); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 5; i++) stroke(ctx, [282 + i * 24, 184 - (i % 2) * 4, 286 + i * 24, 203], 0.8, 'rgba(0,0,0,.2)'); stroke(ctx, [268, 196, 394, 196], 1, t('#4a4234'));
  horseSil(v, 462, 232, 80, 1, '#3a342e', {});
  // 수레꾼(나): 얼굴을 천으로 가리고 종을 든다
  person(v, 540, 236, 108, { ...mine(v, { f: 1, cloak: true, hood: true, arm: 'fwd', rim: FIRE, rimDir: -1 }), cloth: '#2a2826' }); rect(ctx, 546, 146, 12, 7, t('#b8b0a0')); oval(ctx, 572, 186, 4, 5, t('#9a8450')); stroke(ctx, [572, 176, 572, 181], 1.2, t('#9a8450'));
  // 뒤에서 미는 조수와 횃불
  person(v, 232, 236, 104, { f: 1, cloth: '#2e2a28', hair: '#1c1614', hood: true, cloak: true, arm: 'fwd' }); torch(v, 196, 190, 30, 6); glow(v, 196, 158, 40, '#ff9a40', 0.18);
  // 문간에서 손짓해 부르는 사람, 창 안의 얼굴
  person(v, 128, 190, 62, folk(1, { f: 1, veil: true, arm: 'fwd', noShadow: true })); person(v, 420, 190, 58, folk(5, { f: -1, old: true, pose: 'bow', noShadow: true }));
  crows(v, 300, 30, 5, 120);
  rect(ctx, 0, 0, VW, VH, 'rgba(90,110,80,.06)');
  finish(v, { noLeaves: true });
}

export const PLATES19 = {
  /** 서자. variant: door(문간에 선 아이) face(적자와의 대면) shield(문장 없는 방패) named(인정받는 날) */
  baseborn(v) { const k = v.variant ?? 'face'; return ({ door: bbDoor, shield: bbShield, named: bbNamed }[k] ?? bbFace)(v); },
  /** 피난. variant: snow(눈길 행렬) camp(난민촌 불빛) gate(닫힌 성문) village(새 마을) */
  migrate(v) { const k = v.variant ?? 'snow'; return ({ camp: mgCamp, gate: mgGate, village: mgVillage }[k] ?? mgSnow)(v); },
  /** 장의사. variant: shop(관 짜는 작업장) cortege(장례 행렬) night(밤의 묘지) plague(역병 수레) */
  undertaker(v) { const k = v.variant ?? 'shop'; return ({ cortege: utCortege, night: utNight, plague: utPlague }[k] ?? utShop)(v); },
};
