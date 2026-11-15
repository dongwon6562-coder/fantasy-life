// 사건 삽화의 그림판들. 판마다 한 장면을 그린다. v는 그릴 때의 형편(때·날씨·계절·장소·사람)이다.
// 같은 판이라도 v.variant, 계절, 하루 중 때, 날씨, 장소(산·바다·숲·성벽), 나오는 사람의 차림에 따라 달라진다.
import { hash, fbm1, mixh, rgba, dark, light, puff, vgrad } from './sceneKit.js';
import { VW, VH, HZ, sky, far, townFar, ground, road, room, windowAt, shaft, glow, flame, candle, pool, smoke, person, crowd, lying, tree, banner, sunSign, crows, finish, curve, blaze, zoom } from './vignetteKit.js';

const TAU = Math.PI * 2;
const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const lit = (v) => v.S.tod === 'night' || v.S.tod === 'dusk';
const REALM = { leonia: '#8a2f2a', empire: '#2c2c34', holy: '#d8cfa8', serenia: '#3a5a8a', free: '#4a6a4a', march: '#6a5a8a', dwarf: '#8a5a2a', elf: '#4a7a5a', beast: '#8a6a3a', demon: '#5a1a22', sea: '#2a6a7a', dragon: '#8a6a2a' };
const flag = (v) => REALM[v.D.culture] ?? '#8a2f2a';

/* ---------- 함께 쓰는 큰 조각 ---------- */
/** 돌 예배당 앞면: 뾰족 지붕, 둥근 문, 문 위의 표식 */
function chapelFront(v, x, y, s) {
  const { ctx, t, S } = v, wall = t(v.D.white ? '#cfc8b8' : '#8c8274'), sh = t(v.D.white ? '#a8a294' : '#6a6258'), w = 130 * s, h = 96 * s;
  rect(ctx, x - w / 2, y - h, w, h, wall);
  rect(ctx, S.dir > 0 ? x - w / 2 : x + w / 2 - w * 0.3, y - h, w * 0.3, h, rgba(sh, 0.6));
  ctx.fillStyle = t('#4e3a30'); ctx.beginPath(); ctx.moveTo(x - w / 2 - 6 * s, y - h); ctx.lineTo(x, y - h - 58 * s); ctx.lineTo(x + w / 2 + 6 * s, y - h); ctx.fill();
  ctx.fillStyle = wall; ctx.beginPath(); ctx.moveTo(x - w / 2 + 8 * s, y - h); ctx.lineTo(x, y - h - 44 * s); ctx.lineTo(x + w / 2 - 8 * s, y - h); ctx.fill();
  // 종탑
  rect(ctx, x + w * 0.5, y - h * 1.6, 24 * s, h * 1.6, sh); ctx.fillStyle = t('#4e3a30'); ctx.beginPath(); ctx.moveTo(x + w * 0.5 - 3 * s, y - h * 1.6); ctx.lineTo(x + w * 0.5 + 12 * s, y - h * 1.6 - 34 * s); ctx.lineTo(x + w * 0.5 + 27 * s, y - h * 1.6); ctx.fill();
  rect(ctx, x + w * 0.5 + 7 * s, y - h * 1.5, 10 * s, 14 * s, '#1a1410');
  // 문
  const dw = 34 * s, dh = 58 * s;
  ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.moveTo(x - dw / 2, y); ctx.lineTo(x - dw / 2, y - dh + dw / 2); ctx.arc(x, y - dh + dw / 2, dw / 2, Math.PI, 0); ctx.lineTo(x + dw / 2, y); ctx.fill();
  ctx.fillStyle = vgrad(ctx, y - dh, y, [[0, '#7a4a24'], [1, '#e0a050']]); ctx.beginPath(); ctx.moveTo(x - dw / 2 + 4 * s, y); ctx.lineTo(x - dw / 2 + 4 * s, y - dh + dw / 2); ctx.arc(x, y - dh + dw / 2, dw / 2 - 4 * s, Math.PI, 0); ctx.lineTo(x + dw / 2 - 4 * s, y); ctx.fill();
  glow(v, x, y - dh * 0.5, 60 * s, '#ffb060', lit(v) ? 0.4 : 0.16);
  sunSign(v, x, y - h - 12 * s, 7 * s, t('#c9a25a'));
  // 계단
  for (let i = 0; i < 3; i++) rect(ctx, x - dw * (0.9 + i * 0.35), y + i * 4 * s, dw * (1.8 + i * 0.7), 4 * s, i % 2 ? sh : wall);
}
/** 광장을 둘러싼 집들의 앞면 */
function facades(v, y, o = {}) {
  const { ctx, t, R, S } = v, on = lit(v);
  let x = -20;
  while (x < VW + 10) {
    const w = 54 + R() * 40, h = (o.h ?? 78) + R() * 34, timber = R() < 0.6;
    const wall = t(timber ? mixh('#b8a888', '#8a7a64', R() * 0.6) : mixh('#8c8274', '#6e665c', R()));
    rect(ctx, x, y - h, w, h, wall);
    if (timber) { ctx.strokeStyle = rgba(t('#3a2c20'), 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - h * 0.5); ctx.lineTo(x + w, y - h * 0.5); ctx.moveTo(x + w * 0.5, y - h); ctx.lineTo(x + w * 0.5, y); ctx.moveTo(x, y - h); ctx.lineTo(x + w * 0.5, y - h * 0.5); ctx.stroke(); }
    ctx.fillStyle = t(mixh('#5a3e32', '#3e3430', R())); ctx.beginPath(); ctx.moveTo(x - 4, y - h); ctx.lineTo(x + w / 2, y - h - w * (0.34 + R() * 0.2)); ctx.lineTo(x + w + 4, y - h); ctx.fill();
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const wx = x + w * (0.22 + i * 0.44), wy = y - h * (0.8 - j * 0.42); const glowing = on && R() < 0.6; rect(ctx, wx - 5, wy, 10, 13, glowing ? '#e8b060' : '#1e1814'); if (glowing) glow(v, wx, wy + 6, 16, '#ffb060', 0.25); }
    rect(ctx, S.dir > 0 ? x : x + w * 0.7, y - h, w * 0.3, h, rgba('#000000', 0.12));
    x += w + (R() < 0.2 ? 10 : 0);
  }
  ctx.fillStyle = rgba(S.haze, 0.2); ctx.fillRect(0, y - 150, VW, 150);
}
/** 자갈 깔린 바닥 */
function cobbles(v, y) {
  const { ctx, t, R, P } = v;
  ctx.fillStyle = vgrad(ctx, y, VH, [[0, t(P.snow ? '#c4c8c8' : '#857a6c')], [1, t(P.snow ? '#8e969c' : '#4a4138')]]); ctx.fillRect(0, y, VW, VH - y + 40);
  ctx.strokeStyle = rgba('#000000', 0.14); ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) { const d = R(), yy = y + 3 + d * d * (VH - y), x = R() * VW, w = 6 + d * 14; ctx.beginPath(); ctx.ellipse(x, yy, w, w * 0.3, 0, Math.PI, TAU); ctx.stroke(); }
}
/** 배 한 척. s 크기, tilt 기울기, sail 돛 빛깔 */
function shipBig(v, x, y, s, o = {}) {
  const { ctx, t, S } = v, d = o.d ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt ?? 0); ctx.scale(d * s, s);
  const hull = t('#3a2a20'), sail = t(o.sail ?? '#d8cdb4');
  ctx.fillStyle = hull; ctx.beginPath(); ctx.moveTo(-46, -8); ctx.lineTo(50, -8); ctx.lineTo(60, -18); ctx.lineTo(44, 6); ctx.quadraticCurveTo(0, 12, -40, 6); ctx.lineTo(-52, -20); ctx.closePath(); ctx.fill();
  rect(ctx, -52, -20, 18, 12, hull); ctx.fillStyle = rgba(t('#8a6a44'), 0.6); ctx.fillRect(-44, -4, 86, 1.6);
  ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 2.2;
  for (const [mx, mh] of [[-20, 70], [14, 84], [38, 56]]) { ctx.beginPath(); ctx.moveTo(mx, -8); ctx.lineTo(mx, -8 - mh); ctx.stroke(); }
  if (!o.furled) {
    ctx.fillStyle = sail;
    for (const [mx, top, w, h] of [[-20, -72, 30, 26], [-20, -42, 34, 28], [14, -86, 34, 28], [14, -54, 40, 34], [38, -58, 24, 34]]) { ctx.beginPath(); ctx.moveTo(mx - w / 2, top); ctx.lineTo(mx + w / 2, top); ctx.quadraticCurveTo(mx + w / 2 + 7, top + h / 2, mx + w / 2, top + h); ctx.lineTo(mx - w / 2, top + h); ctx.quadraticCurveTo(mx - w / 2 + 7, top + h / 2, mx - w / 2, top); ctx.fill(); }
    ctx.fillStyle = rgba('#000000', 0.16); for (const [mx, top, w, h] of [[-20, -42, 34, 28], [14, -54, 40, 34]]) ctx.fillRect(mx - w / 2, top + h * 0.6, w, h * 0.4);
  } else { ctx.strokeStyle = sail; ctx.lineWidth = 3; for (const [mx, top, w] of [[-20, -70, 30], [14, -84, 34], [38, -56, 24]]) { ctx.beginPath(); ctx.moveTo(mx - w / 2, top); ctx.lineTo(mx + w / 2, top); ctx.stroke(); } }
  ctx.strokeStyle = rgba(t('#2a2018'), 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(60, -18); ctx.lineTo(14, -92); ctx.lineTo(-52, -20); ctx.moveTo(38, -64); ctx.lineTo(60, -18); ctx.stroke();
  ctx.fillStyle = o.flag ?? t('#8a2f2a'); ctx.beginPath(); ctx.moveTo(14, -92); ctx.lineTo(14 - S.dir * d * 14, -89); ctx.lineTo(14, -85); ctx.fill();
  if (o.lamp) glow(v, -44, -24, 14, '#ffb060', 0.6);
  ctx.restore();
}
/** 물결 줄 */
function waves(v, y0, rough = 1) {
  const { ctx, t, R, S } = v;
  for (let i = 0; i < 90; i++) { const d = R(), y = y0 + 4 + d * d * (VH - y0), x = R() * VW, w = (6 + d * 26) * rough; ctx.strokeStyle = rgba(t(R() < 0.5 ? light(S.low, 0.3) : '#eef2f0'), 0.12 + d * 0.3); ctx.lineWidth = 0.8 + d; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - (1.5 + d * 4) * rough, x + w, y); ctx.stroke(); }
}

/* ---------- 그림판 ---------- */
export const PLATES = {
  /** 혼례: 예배당 앞, 마주 선 두 사람과 사제, 하객. variant 'far'면 멀리서 지켜보는 사람 */
  wedding(v) {
    const { ctx, t, P, R } = v, away = v.variant === 'far';
    sky(v); far(v); const gy = 176;
    ground(v, (x) => gy - fbm1(x / 120 + v.q, 3) * 6);
    road(v, 330, 400, gy, { w: 150 });
    tree(v, 80, gy + 8, 150); tree(v, 610, gy + 2, 90);
    const cx = away ? 450 : 410, s = away ? 0.95 : 1.3;
    chapelFront(v, cx, gy, s);
    const a = v.me, b = v.other, bride = a.female ? a : b, groom = a.female ? b : a, fy = gy + 22 * s, h = 58 * s;
    person(v, cx, fy - 13 * s, h, { f: 0, cloth: '#e4dcc8', hair: '#8a8478', robe: true, arm: 'chest' });
    person(v, cx - 24 * s, fy, h, { f: 1, cloth: mixh(groom.cloth, '#2a2630', 0.5), hair: groom.hair, arm: 'fwd' });
    person(v, cx + 24 * s, fy, h * 0.95, { f: -1, cloth: P.snow ? '#d8d4cc' : '#e8e0d0', hair: bride.hair, female: true, veil: true, arm: 'fwd' });
    if (away) { person(v, 150, 236, 150, { f: 0, cloth: dark(a.cloth, 0.55), hair: dark(a.hair, 0.3), female: a.female, long: a.long }); }
    else { crowd(v, 130, 340, 240, 6, 92); crowd(v, 500, 640, 240, 4, 92); person(v, 330, 238, 46, { f: 0, cloth: dark('#6a5a3c', 0.3), hair: '#6e4a28', child: true }); }
    if (!P.snow) for (let i = 0; i < 46; i++) puff(ctx, cx - 90 + R() * 180, gy - 70 + R() * 84, 1.8, 1.4, t(P.autumn ? '#c49a3a' : '#f2e4e0'), 0.8);
    finish(v, { noLeaves: true });
  },

  /** 장례: 언덕 위 묘지. variant 'state' 국상의 운구, 'visit' 무덤 앞에 홀로, 그 밖은 매장 */
  funeral(v) {
    const { ctx, t, P, R } = v;
    sky(v); far(v);
    if (v.variant === 'state') {
      const gy = 150;
      // 성벽과 검은 깃발
      const wall = t(v.D.white ? '#8e887c' : '#7a7268');
      ctx.save(); zoom(v, 330, 240, 1.22);
      rect(ctx, 0, gy - 78, VW, 78, wall); rect(ctx, 0, gy - 30, VW, 30, 'rgba(0,0,0,.14)'); for (let x = 0; x < VW; x += 22) rect(ctx, x, gy - 88, 13, 10, wall);
      rect(ctx, 380, gy - 128, 96, 128, t(v.D.white ? '#7e786e' : '#6a6258')); for (let x = 380; x < 476; x += 20) rect(ctx, x, gy - 138, 12, 10, t(v.D.white ? '#7e786e' : '#6a6258'));
      ctx.fillStyle = '#17120f'; ctx.beginPath(); ctx.moveTo(404, gy); ctx.lineTo(404, gy - 50); ctx.arc(428, gy - 50, 24, Math.PI, 0); ctx.lineTo(452, gy); ctx.fill();
      for (const x of [60, 150, 240, 330, 520, 600]) rect(ctx, x, gy - 76, 16, 50, '#141216');
      ctx.fillStyle = rgba(v.S.haze, 0.16); ctx.fillRect(0, gy - 140, VW, 140);
      cobbles(v, gy);
      // 운구: 관을 멘 여섯 사람
      const by = 196;
      for (const x of [228, 262, 296, 330]) person(v, x, by, 52, { f: 1, cloth: '#201c20', hair: '#2a1e16', hood: R() < 0.5 });
      ctx.fillStyle = t('#2a2220'); ctx.fillRect(214, by - 62, 134, 12); ctx.fillStyle = t(flag(v)); ctx.fillRect(222, by - 64, 118, 9); ctx.fillStyle = t('#c9a25a'); ctx.fillRect(276, by - 64, 10, 9);
      person(v, 384, by, 54, { f: 1, cloth: '#e0d8c4', hair: '#8a8478', robe: true, stick: 'crook' });
      for (const x of [150, 184]) person(v, x, by, 52, { f: 1, cloth: '#3a3a44', hair: '#2a1e16', stick: 'spear' });
      ctx.restore();
      crowd(v, -10, 150, 244, 3, 96, { hoods: 0.5, dark: 0.6 }); crowd(v, 500, 650, 244, 3, 96, { hoods: 0.5, dark: 0.6 });
      finish(v); return;
    }
    ctx.save(); zoom(v, 330, 214, 1.42);
    const hill = (x) => 178 - Math.sin((x / VW) * Math.PI * 0.9 + 0.5) * 22 - fbm1(x / 100 + v.q, 3) * 6;
    townFar(v, 170, HZ + 30, { s: 0.5 });
    ground(v, hill);
    // 묘비들 (성광교 표식을 단 나무 말뚝과 돌)
    for (let i = 0; i < 9; i++) { const x = 40 + R() * 560, y = hill(x) + 6 + R() * 30, s = 0.6 + (y - 150) / 90; if (Math.abs(x - 330) < 70) continue; rect(ctx, x - 1.5 * s, y - 16 * s, 3 * s, 16 * s, t('#5a5048')); if (R() < 0.6) sunSign(v, x, y - 19 * s, 3 * s, t('#6a6054')); else { ctx.fillStyle = t('#8a8478'); ctx.beginPath(); ctx.arc(x, y - 10 * s, 6 * s, Math.PI, 0); ctx.lineTo(x + 6 * s, y); ctx.lineTo(x - 6 * s, y); ctx.fill(); } }
    tree(v, 560, hill(560) + 6, 130, { bare: v.month > 9 || v.month < 4 }); crows(v, 540, 60, 5, 50);
    const gx = 330, gy = hill(gx) + 20;
    if (v.variant === 'visit') {
      ctx.fillStyle = t('#8a8478'); ctx.beginPath(); ctx.arc(gx + 34, gy - 22, 13, Math.PI, 0); ctx.lineTo(gx + 47, gy); ctx.lineTo(gx + 21, gy); ctx.fill(); sunSign(v, gx + 34, gy - 22, 4, t('#5a5048'));
      ctx.fillStyle = t(P.snow ? '#c8ccd0' : mixh(P.grass, '#6b5038', 0.3)); ctx.beginPath(); ctx.ellipse(gx + 6, gy + 3, 30, 5, 0, 0, TAU); ctx.fill();
      if (!P.snow) for (let i = 0; i < 6; i++) puff(ctx, gx + 20 + R() * 12, gy - 1 - R() * 3, 2.2, 2.2, t(['#e8e0d0', '#c8a8c0', '#e0c870'][i % 3]), 0.9);
      person(v, gx - 34, gy + 6, 62, { f: 1, pose: 'kneel', cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, long: v.me.long });
    } else {
      // 갓 판 무덤과 흙더미
      ctx.fillStyle = '#17110d'; ctx.beginPath(); ctx.ellipse(gx, gy + 2, 34, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = t(mixh(P.soil, '#3a2a20', 0.4)); ctx.beginPath(); ctx.moveTo(gx + 30, gy + 4); ctx.quadraticCurveTo(gx + 58, gy - 20, gx + 86, gy + 6); ctx.fill();
      ctx.strokeStyle = t('#3a2e22'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx + 70, gy - 4); ctx.lineTo(gx + 82, gy - 40); ctx.stroke();
      person(v, gx - 4, gy - 8, 56, { f: 0, cloth: '#e0d8c4', hair: '#8a8478', robe: true, stick: 'crook' });
      const n = 5 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, x = gx + side * (48 + (i >> 1) * 22 + R() * 6); person(v, x, gy + 4 + R() * 8, 50 + R() * 8, { f: -side, pose: R() < 0.6 ? 'bow' : 'stand', cloth: dark(['#3a3438', '#44403c', '#3e3a44'][i % 3], 0.2), hair: '#2a1e16', hood: R() < 0.5, female: R() < 0.5 }); }
      person(v, gx - 76, gy + 14, 30, { f: 1, cloth: '#44403c', hair: '#6e4a28', child: true });
    }
    ctx.restore();
    finish(v);
  },

  /** 출산과 아기: 난롯불 켜진 방, 침상과 요람. variant 'fever' 밤새 앓는 아이, 'grand' 손주를 안은 늙은 나 */
  birth(v) {
    const { ctx, R } = v, fever = v.variant === 'fever';
    const fy = room(v, { stone: false, wall: '#4a382a', floor: '#3a2c20', fy: 172 });
    ctx.save(); zoom(v, 330, 244, 1.34);
    windowAt(v, 350, 78, 40, 44);
    // 난로
    rect(ctx, 68, 70, 96, 102, '#5a5048'); rect(ctx, 60, 62, 112, 10, '#6a6056'); ctx.fillStyle = '#120e0c'; ctx.beginPath(); ctx.moveTo(88, fy); ctx.lineTo(88, 122); ctx.arc(116, 122, 28, Math.PI, 0); ctx.lineTo(144, fy); ctx.fill();
    if (!fever) { blaze(v, 116, fy - 2, 34, 30); flame(v, 116, fy - 3, 8); pool(v, 150, fy + 20, 190, 40, '#ff9a48', 0.3); glow(v, 116, 130, 200, '#ff9040', 0.22); } else { glow(v, 116, fy - 6, 30, '#c0481c', 0.4); }
    // 침상
    rect(ctx, 400, 128, 190, 12, '#3a2a1e'); rect(ctx, 580, 96, 12, 80, '#3a2a1e'); rect(ctx, 400, 138, 190, 34, '#2e2218'); rect(ctx, 404, 122, 182, 14, '#a89d88');
    ctx.fillStyle = '#c0b6a0'; ctx.beginPath(); ctx.ellipse(564, 118, 18, 9, -0.2, 0, TAU); ctx.fill();
    const m = v.other, me = v.me;
    if (!fever) lying(v, 562, 122, 130, { d: -1, raw: true, cover: '#6a5848', hair: (me.female ? me : m).hair });
    // 요람
    const cx = 270, cy = fy + 26;
    ctx.fillStyle = '#4a3626'; ctx.beginPath(); ctx.moveTo(cx - 30, cy - 26); ctx.lineTo(cx + 30, cy - 26); ctx.lineTo(cx + 24, cy - 6); ctx.lineTo(cx - 24, cy - 6); ctx.fill();
    ctx.strokeStyle = '#4a3626'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy - 22, 30, 0.35, Math.PI - 0.35); ctx.stroke();
    ctx.fillStyle = '#d8ceb8'; ctx.beginPath(); ctx.ellipse(cx, cy - 27, 22, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#d0a890'; ctx.beginPath(); ctx.arc(cx - 12, cy - 30, 4.5, 0, TAU); ctx.fill();
    if (fever) {
      candle(v, 356, fy - 20, 9); rect(ctx, 340, fy - 20, 34, 4, '#3a2a1e'); rect(ctx, 344, fy - 16, 4, 30, '#3a2a1e'); rect(ctx, 366, fy - 16, 4, 30, '#3a2a1e'); pool(v, 300, cy - 20, 90, 60, '#ffb060', 0.3);
      person(v, cx + 46, cy + 4, 84, { f: -1, pose: 'kneel', raw: true, cloth: '#5a4a44', hair: m.hair, female: true, arm: 'fwd', rim: 'rgba(255,190,110,.5)', rimDir: 1 });
      person(v, 196, fy + 40, 100, { f: 1, raw: true, cloth: '#2a2420', hair: '#1c1612', arm: 'chest' });
    } else if (v.variant === 'grand') {
      person(v, cx - 62, cy + 6, 96, { f: 1, pose: 'sit', raw: true, cloth: me.cloth, hair: me.hair, female: me.female, old: true, arm: 'fwd', rim: 'rgba(255,170,90,.6)', rimDir: -1 });
      person(v, cx + 70, cy + 2, 100, { f: -1, raw: true, cloth: '#5a4a44', hair: '#6e4a28', female: true, rim: 'rgba(255,170,90,.3)', rimDir: -1 });
    } else {
      person(v, 440, fy + 22, 100, { f: 1, raw: true, cloth: '#6a5a4a', hair: '#8a8478', female: true, arm: 'fwd', rim: 'rgba(255,170,90,.4)', rimDir: -1 });
      person(v, cx - 58, cy + 8, 100, { f: 1, pose: 'kneel', raw: true, cloth: (me.female ? m : me).cloth, hair: (me.female ? m : me).hair, arm: 'fwd', rim: 'rgba(255,170,90,.6)', rimDir: -1 });
    }
    ctx.restore(); void R;
    finish(v, { inside: true });
  },

  /** 군대: 길을 따라 떠나는 창병들. variant 'refugee'면 짐을 지고 내려오는 피란민 */
  muster(v) {
    const { ctx, t, R, P } = v, refugee = v.variant === 'refugee';
    sky(v); far(v); townFar(v, refugee ? 500 : 130, HZ + 20, { s: 0.7 });
    if (refugee) { smoke(v, 520, HZ + 6, 100, 40, '#2a2420', 0.4); smoke(v, 470, HZ + 10, 70, 26, '#2a2420', 0.3); glow(v, 505, HZ + 12, 60, '#ff7a3a', 0.3); }
    const gy = (x) => 156 - fbm1(x / 140 + v.q, 3) * 8;
    ground(v, gy);
    road(v, refugee ? 250 : 380, refugee ? 500 : 560, HZ + 26, { w: 170 });
    tree(v, refugee ? 600 : 40, 196, 150, { dark: true });
    if (refugee) {
      // 수레와 사람들
      const pts = [[470, 150, 20], [440, 158, 26], [404, 168, 34], [352, 184, 46], [290, 204, 62], [214, 226, 78]];
      pts.forEach(([x, y, h], i) => { person(v, x, y, h, { f: -1, pose: i % 2 ? 'bow' : 'stand', old: i === 3, cloth: ['#5a4636', '#4a5240', '#5a3a34', '#44403c'][i % 4], hair: '#2a1e16', female: i % 3 === 1, hood: i % 3 === 0, stick: i === 3 ? 'staff' : null }); if (i % 2 === 0) puff(ctx, x + h * 0.12, y - h * 0.72, h * 0.16, h * 0.14, t('#6a5a44'), 1); });
      ctx.fillStyle = t('#4a3828'); ctx.fillRect(330, 176, 60, 16); ctx.strokeStyle = t('#2e2218'); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(344, 196, 10, 0, TAU); ctx.arc(378, 196, 10, 0, TAU); ctx.stroke(); puff(ctx, 360, 168, 26, 12, t('#7a6a54'), 1);
      person(v, 250, 222, 40, { f: -1, cloth: '#6a5a3c', hair: '#6e4a28', child: true });
    } else {
      // 줄지어 가는 창병: 멀수록 작게
      for (let r = 0; r < 9; r++) { const k = r / 8, y = 222 - k * 70, h = 76 - k * 52, cx = 392 + k * 150; for (let j = -1; j <= 1; j++) { const x = cx + j * h * 0.42 + R() * 2; person(v, x, y + R() * 2, h, { f: 0, cloth: mixh('#4a4a50', flag(v), 0.25), hair: '#5a5a60', hood: true, stick: 'spear', tilt: 0.03 * (R() - 0.3) }); } if (r === 2 || r === 6) banner(v, cx - h * 0.8, y, h * 1.9, flag(v), { mark: '#c9a25a' }); }
      // 남은 식구: 등을 보인 여인과 아이
      person(v, 150, 232, 120, { f: 0, cloth: dark(v.other.cloth, 0.35), hair: v.other.hair, female: true });
      person(v, 206, 234, 62, { f: 0, cloth: dark('#6a5a3c', 0.35), hair: '#6e4a28', child: true });
      if (!P.snow) for (let i = 0; i < 12; i++) puff(ctx, 420 + R() * 130, 150 + R() * 70, 18, 7, t('#b8a888'), 0.12);
    }
    finish(v);
  },

  /** 광장: 집들에 둘러싸인 광장과 군중. variant 'herald' 포고, 'notice' 방, 'flog' 태형, 'trial' 심문, 'guards' 순찰대 */
  square(v) {
    const { ctx, t, R } = v, kind = v.variant ?? 'herald', gy = 150;
    sky(v); ctx.save(); zoom(v, 330, 250, 1.24); facades(v, gy); cobbles(v, gy);
    const cx = 330;
    if (kind === 'notice') {
      rect(ctx, cx - 44, gy - 44, 6, 62, t('#3a2c20')); rect(ctx, cx + 38, gy - 44, 6, 62, t('#3a2c20')); rect(ctx, cx - 48, gy - 50, 96, 44, t('#5a4634'));
      ctx.fillStyle = t('#3e3024'); ctx.beginPath(); ctx.moveTo(cx - 56, gy - 50); ctx.lineTo(cx, gy - 66); ctx.lineTo(cx + 56, gy - 50); ctx.fill();
      for (const [x, y, w, h, a] of [[-38, -44, 22, 28, -0.04], [-10, -46, 26, 34, 0.03], [20, -42, 20, 24, -0.06]]) { ctx.save(); ctx.translate(cx + x, gy + y); ctx.rotate(a); rect(ctx, 0, 0, w, h, t('#d8ccb0')); ctx.fillStyle = rgba('#3a2e22', 0.5); for (let i = 0; i < 4; i++) ctx.fillRect(3, 5 + i * 5, w - 6, 1.2); ctx.restore(); }
      ctx.fillStyle = t('#8a2f2a'); ctx.beginPath(); ctx.arc(cx + 2, gy - 16, 3, 0, TAU); ctx.fill();
      person(v, cx - 70, gy + 30, 70, { f: 1, cloth: '#4a5240', hair: '#4a3220', hat: true }); person(v, cx + 76, gy + 34, 66, { f: -1, cloth: '#5a3a34', hair: '#2a1e16', female: true });
      person(v, cx + 8, 232, 96, { f: 0, cloth: dark(v.me.cloth, 0.4), hair: v.me.hair, female: v.me.female, long: v.me.long });
    } else {
      // 단
      if (kind !== 'guards') { rect(ctx, cx - 70, gy + 6, 140, 18, t('#4a3a2c')); rect(ctx, cx - 76, gy + 2, 152, 6, t('#5e4c3a')); for (let x = cx - 62; x < cx + 66; x += 30) rect(ctx, x, gy + 8, 4, 16, t('#33271d')); }
      const py = gy + 4;
      if (kind === 'herald') {
        person(v, cx, py, 62, { f: -1, cloth: flag(v), hair: '#4a3220', hat: true, arm: 'out' });
        rect(ctx, cx - 26, py - 50, 12, 20, t('#e0d4b8')); ctx.fillStyle = t('#8a2f2a'); ctx.beginPath(); ctx.arc(cx - 20, py - 28, 2.4, 0, TAU); ctx.fill();
        banner(v, cx + 50, py, 104, flag(v), { mark: '#c9a25a' });
        person(v, cx - 52, py, 60, { f: 0, cloth: '#4a4a52', hair: '#5a5a60', hood: true, stick: 'spear' }); person(v, cx + 30, py, 60, { f: 0, cloth: '#4a4a52', hair: '#5a5a60', hood: true, stick: 'spear' });
      } else if (kind === 'flog') {
        rect(ctx, cx - 3, py - 78, 6, 78, t('#33271d')); rect(ctx, cx - 16, py - 78, 32, 5, t('#33271d'));
        person(v, cx - 2, py, 50, { f: 1, pose: 'kneel', cloth: '#b8a888', hair: '#2a1e16', arm: 'up' });
        person(v, cx - 44, py, 64, { f: 1, cloth: '#2e2a2a', hair: '#1c1a1c', hood: true, arm: 'out' });
        ctx.strokeStyle = t('#1c1612'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx - 32, py - 40); ctx.quadraticCurveTo(cx - 14, py - 64, cx - 8, py - 36); ctx.stroke();
        person(v, cx + 52, py, 62, { f: -1, cloth: flag(v), hair: '#4a3220', hat: true });
      } else if (kind === 'trial') {
        person(v, cx + 26, py, 66, { f: -1, cloth: '#e4dcc8', hair: '#8a8478', robe: true, arm: 'out' });
        banner(v, cx + 56, py, 110, '#e4dcc8', { mark: '#c9a25a' });
        person(v, cx - 26, py, 52, { f: 1, pose: 'kneel', cloth: '#6a5a4a', hair: '#2a1e16', female: R() < 0.5 });
        for (const x of [cx - 58, cx + 84]) person(v, x, py, 60, { f: 0, cloth: '#d0c8b4', hair: '#5a5a60', hood: true, stick: 'spear' });
        ctx.fillStyle = t('#3a2c20'); for (let i = 0; i < 7; i++) ctx.fillRect(cx - 120 + i * 5, gy + 14 - i * 2, 22 - i * 2, 3); // 쌓아 둔 장작
      } else { // 순찰대: 등불을 든 병사들이 다가온다
        for (const [x, h, f] of [[cx - 60, 84, 1], [cx + 4, 90, 1], [cx + 64, 84, -1]]) person(v, x, gy + 40, h, { f, cloth: mixh('#4a4a52', flag(v), 0.3), hair: '#5a5a60', hood: true, stick: x === cx + 4 ? 'torch' : 'spear' });
        pool(v, cx + 10, gy + 44, 120, 26, '#ff9a48', 0.24);
        person(v, 150, 236, 110, { f: 1, cloth: dark(v.me.cloth, 0.5), hair: dark(v.me.hair, 0.3), female: v.me.female, long: v.me.long, hood: true });
      }
    }
    ctx.restore();
    if (kind !== 'notice' && kind !== 'guards') { crowd(v, -10, 250, 244, 6, 90, { dark: 0.55 }); crowd(v, 410, 650, 244, 6, 90, { dark: 0.55 }); }
    finish(v);
  },

  /** 역병: 인적 끊긴 거리, 주검을 실은 수레, 표시된 문 */
  plague(v) {
    const { ctx, t, R } = v, gy = 150;
    sky(v);
    // 양쪽으로 좁아지는 골목
    for (const d of [-1, 1]) for (let i = 4; i >= 0; i--) {
      const k = i / 5, x0 = VW / 2 + d * (70 + (1 - k) * 260), x1 = VW / 2 + d * (70 + (1 - k + 0.2) * 260 + 30), top = gy - 60 - (1 - k) * 110, bot = gy + (1 - k) * 86;
      ctx.fillStyle = t(mixh(i % 2 ? '#6a6156' : '#7a7062', v.S.haze, k * 0.6)); ctx.beginPath(); ctx.moveTo(x0, top + 20 * k); ctx.lineTo(x1, top - 26); ctx.lineTo(x1, bot + 30); ctx.lineTo(x0, bot); ctx.fill();
      ctx.fillStyle = t(mixh('#4a3830', v.S.haze, k * 0.6)); ctx.beginPath(); ctx.moveTo(x0 - d * 4, top + 20 * k); ctx.lineTo((x0 + x1) / 2, top - 30 - (1 - k) * 22); ctx.lineTo(x1, top - 26); ctx.fill();
      const dx = (x0 + x1) / 2, dh = 30 + (1 - k) * 50, dw = 10 + (1 - k) * 14;
      rect(ctx, dx - dw / 2, bot + 12 - dh, dw, dh, '#1a1512');
      if (i % 2 === 0) { ctx.strokeStyle = t('#a02a22'); ctx.lineWidth = 1.5 + (1 - k) * 2; ctx.beginPath(); ctx.moveTo(dx - dw * 0.3, bot + 12 - dh * 0.75); ctx.lineTo(dx + dw * 0.3, bot + 12 - dh * 0.35); ctx.moveTo(dx + dw * 0.3, bot + 12 - dh * 0.75); ctx.lineTo(dx - dw * 0.3, bot + 12 - dh * 0.35); ctx.stroke(); }
      for (const yy of [top + 34, top + 34 + dh * 0.55]) for (const off of [-1.5, 1.5]) rect(ctx, dx + off * dw - dw * 0.3, yy, dw * 0.6, dw * 0.8, '#1a1512');
      ctx.strokeStyle = rgba(t('#3a2c20'), 0.5); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0, (top + bot) / 2); ctx.lineTo(x1, (top + bot) / 2 - 4); ctx.stroke();
    }
    ctx.fillStyle = vgrad(ctx, gy - 10, VH, [[0, t(mixh('#857a6c', v.S.haze, 0.5))], [1, t('#40382f')]]); ctx.beginPath(); ctx.moveTo(VW / 2 - 70, gy); ctx.lineTo(VW / 2 + 70, gy); ctx.lineTo(VW + 60, VH); ctx.lineTo(-60, VH); ctx.fill();
    for (let i = 0; i < 6; i++) puff(ctx, R() * VW, gy - 20 + R() * 60, 140, 18, '#a8b09a', 0.14);
    // 수레
    const cx = 300, cy = 206;
    ctx.fillStyle = t('#3a2c20'); ctx.fillRect(cx - 50, cy - 30, 100, 10); ctx.fillRect(cx - 54, cy - 44, 5, 22); ctx.fillRect(cx + 49, cy - 44, 5, 22);
    for (const [dx, a] of [[-26, -0.1], [0, 0.06], [24, -0.04]]) { ctx.save(); ctx.translate(cx + dx, cy - 31); ctx.rotate(a); ctx.fillStyle = t(['#b8ae98', '#a89e8a', '#c0b6a0'][Math.abs(dx) % 3]); ctx.beginPath(); ctx.ellipse(0, -4, 30, 6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx - 26, cy - 10, 17, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(cx - 26 - Math.cos(a) * 17, cy - 10 - Math.sin(a) * 17); ctx.lineTo(cx - 26 + Math.cos(a) * 17, cy - 10 + Math.sin(a) * 17); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 50, cy - 24); ctx.lineTo(cx + 96, cy - 34); ctx.stroke();
    person(v, cx + 108, cy + 6, 86, { f: 1, pose: 'bow', cloth: '#2e2a26', hair: '#1c1a1c', hood: true, arm: 'fwd' });
    glow(v, cx + 126, cy - 38, 40, '#ffb060', 0.4); rect(ctx, cx + 123, cy - 44, 6, 9, '#ffd088');
    crows(v, 380, 40, 6, 80); ctx.fillStyle = '#14100e'; for (const [x, y] of [[180, 214], [196, 218], [470, 200]]) { ctx.beginPath(); ctx.ellipse(x, y, 5, 3, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x + 4, y - 3, 2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(86,100,70,.2)'; ctx.fillRect(0, 0, VW, VH);
    finish(v);
  },

  /** 마물: 숲 가장자리의 눈빛들과 횃불을 든 사람들. variant 'wolves'면 늑대 몇 마리, 그 밖은 떼 */
  monsters(v) {
    const { ctx, t, R } = v, wolves = v.variant === 'wolves';
    sky(v); far(v, { woods: true });
    // 검은 숲 덩어리
    const edge = (x) => 96 + fbm1(x / 60 + v.q, 7, 3) * 40;
    ctx.fillStyle = t('#12160f'); ctx.beginPath(); ctx.moveTo(0, 170); for (let x = 0; x <= VW; x += 6) { ctx.lineTo(x, edge(x) - (hash(x, 5) < 0.5 ? 16 : 0)); ctx.lineTo(x + 3, edge(x) - 22 * hash(x, 9)); } ctx.lineTo(VW, 170); ctx.fill();
    for (let i = 0; i < 26; i++) { const x = R() * VW; rect(ctx, x, edge(x) + 10, 3 + R() * 5, 80, 'rgba(8,10,8,.7)'); }
    ground(v, (x) => 158 - fbm1(x / 120 + v.q, 3) * 6, { haze: 0, tufts: 90 });
    for (let i = 0; i < 4; i++) puff(ctx, R() * VW, 150 + R() * 14, 160, 12, v.S.tod === 'night' ? '#2a3448' : '#b8bcb8', 0.2);
    // 눈빛
    const n = wolves ? 7 : 22, eye = wolves ? '#e8c860' : '#e0503a';
    for (let i = 0; i < n; i++) { const x = 40 + R() * 560, y = 118 + R() * 34, s = 1 + R() * 1.4, w = 4 + R() * 5; glow(v, x, y, 9 * s, eye, 0.5); ctx.fillStyle = light(eye, 0.4); ctx.fillRect(x - w / 2 - s, y - s / 2, s * 1.4, s); ctx.fillRect(x + w / 2, y - s / 2, s * 1.4, s); }
    // 숲에서 나오는 형체
    ctx.fillStyle = t('#0e100c');
    for (const [x, s] of wolves ? [[250, 1], [372, 0.9], [470, 1.1]] : [[190, 1], [262, 1.2], [345, 0.9], [420, 1.3], [500, 1]]) {
      const y = 160;
      if (wolves) { ctx.beginPath(); ctx.ellipse(x, y - 12 * s, 18 * s, 7 * s, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 12 * s, y - 14 * s); ctx.lineTo(x + 26 * s, y - 20 * s); ctx.lineTo(x + 30 * s, y - 12 * s); ctx.lineTo(x + 16 * s, y - 8 * s); ctx.fill(); ctx.fillRect(x - 14 * s, y - 10 * s, 3 * s, 11 * s); ctx.fillRect(x + 10 * s, y - 10 * s, 3 * s, 11 * s); ctx.beginPath(); ctx.moveTo(x + 22 * s, y - 19 * s); ctx.lineTo(x + 23 * s, y - 26 * s); ctx.lineTo(x + 26 * s, y - 20 * s); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(x - 9 * s, y); ctx.quadraticCurveTo(x - 14 * s, y - 20 * s, x - 4 * s, y - 27 * s); ctx.arc(x + 2 * s, y - 28 * s, 6 * s, Math.PI, 0); ctx.quadraticCurveTo(x + 12 * s, y - 14 * s, x + 9 * s, y); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 31 * s); ctx.lineTo(x - 9 * s, y - 37 * s); ctx.lineTo(x - 1 * s, y - 33 * s); ctx.moveTo(x + 8 * s, y - 31 * s); ctx.lineTo(x + 13 * s, y - 37 * s); ctx.lineTo(x + 5 * s, y - 33 * s); ctx.fill(); ctx.strokeStyle = t('#0e100c'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 10 * s, y - 16 * s); ctx.lineTo(x + 18 * s, y - 34 * s); ctx.stroke(); }
    }
    // 말뚝 울타리와 지키는 사람들
    ctx.fillStyle = vgrad(ctx, 200, VH, [[0, 'rgba(16,12,10,0)'], [0.3, 'rgba(16,12,10,.7)'], [1, 'rgba(10,8,7,.9)']]); ctx.fillRect(0, 200, VW, 40); // 흙 둑
    const men = [[70, 78, 'spear'], [150, 84, 'torch'], [236, 80, 'spear'], [420, 82, 'torch'], [500, 78, 'spear'], [584, 84, 'torch']];
    for (const [x, h, st] of men) { person(v, x, 236, h, { f: 0, raw: true, cloth: ['#2a2420', '#262a26', '#2e2622'][x % 3], hair: '#14100e', hood: R() < 0.4, cloak: true, stick: st, rim: 'rgba(255,160,80,.6)', rimDir: st === 'torch' ? 1 : -1, female: R() < 0.2 }); }
    person(v, 330, 240, 96, { f: 0, raw: true, cloth: dark(v.me.cloth, 0.5), hair: dark(v.me.hair, 0.4), female: v.me.female, long: v.me.long, stick: 'spear', rim: 'rgba(255,160,80,.65)', rimDir: -1 });
    pool(v, 320, 232, 340, 26, '#ff9a48', 0.18);
    finish(v);
  },

  /** 굶주림: 갈라진 밭, 죽은 나무, 빈 솥 앞의 식구 */
  famine(v) {
    const { ctx, t, R, P } = v;
    sky(v); far(v); townFar(v, 500, HZ + 20, { s: 0.6, n: 5 });
    const gy = (x) => 152 - fbm1(x / 150 + v.q, 3) * 6;
    ground(v, gy, { color: P.snow ? undefined : '#8a7650', color2: '#5e4c34', tufts: 40 });
    if (!P.snow) { ctx.strokeStyle = rgba(t('#3e3022'), 0.45); ctx.lineWidth = 1; for (let i = 0; i < 46; i++) { const d = R(), x = R() * VW, y = 158 + d * d * 80; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 30 * (0.4 + d), y + 3 + d * 6); ctx.lineTo(x + (R() - 0.5) * 40 * (0.4 + d), y + 5 + d * 12); ctx.stroke(); } ctx.strokeStyle = rgba(t('#a8925e'), 0.5); for (let i = 0; i < 60; i++) { const x = R() * VW, y = 160 + R() * 30; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 5); ctx.stroke(); } }
    ctx.save(); zoom(v, 330, 236, 1.36);
    tree(v, 150, 188, 150, { bare: true }); crows(v, 170, 70, 4, 40);
    // 허수아비
    const sx = 500, sy = 180; ctx.strokeStyle = t('#3a2c20'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 52); ctx.moveTo(sx - 20, sy - 40); ctx.lineTo(sx + 20, sy - 38); ctx.stroke(); ctx.fillStyle = t('#6a5a44'); ctx.beginPath(); ctx.moveTo(sx - 18, sy - 40); ctx.lineTo(sx + 18, sy - 38); ctx.lineTo(sx + 9, sy - 14); ctx.lineTo(sx - 8, sy - 12); ctx.fill(); ctx.beginPath(); ctx.arc(sx, sy - 48, 5, 0, TAU); ctx.fill();
    // 빈 솥과 식구
    const px = 330, py = 208; ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 18, py); ctx.lineTo(px, py - 42); ctx.lineTo(px + 18, py); ctx.moveTo(px, py - 42); ctx.lineTo(px, py - 20); ctx.stroke();
    ctx.fillStyle = t('#1c1816'); ctx.beginPath(); ctx.arc(px, py - 16, 10, 0, Math.PI); ctx.fill(); ctx.fillStyle = t('#3a3632'); ctx.beginPath(); ctx.ellipse(px, py - 1, 14, 3, 0, 0, TAU); ctx.fill();
    person(v, px - 58, py + 6, 78, { f: 1, pose: 'sit', cloth: v.other.cloth, hair: v.other.hair, female: true, arm: 'chest' });
    person(v, px - 34, py + 8, 38, { f: 1, pose: 'sit', cloth: '#6a5a3c', hair: '#6e4a28', child: true });
    person(v, px + 64, py + 4, 96, { f: -1, cloth: v.me.cloth, hair: v.me.hair, female: v.me.female, arm: 'chest' });
    puff(ctx, px + 80, py - 4, 12, 7, t('#7a6a54'), 1);
    ctx.restore();
    finish(v, { noLeaves: true });
  },

  /** 불: 타오르는 헛간과 달려드는 사람들. variant 'riot'이면 횃불을 든 무리 */
  fire(v) {
    const { ctx, t, R } = v, riot = v.variant === 'riot';
    sky(v); far(v); const gy = 162;
    ground(v, (x) => gy - fbm1(x / 130 + v.q, 3) * 6, { haze: 0 });
    ctx.fillStyle = 'rgba(10,8,14,.36)'; ctx.fillRect(0, 0, VW, VH);
    const bx = riot ? 400 : 380, by = gy + 8, bw = 170, bh = 78;
    // 건물
    rect(ctx, bx - bw / 2, by - bh, bw, bh, '#1c1512'); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1; for (let x = bx - bw / 2 + 8; x < bx + bw / 2; x += 11) { ctx.beginPath(); ctx.moveTo(x, by - bh); ctx.lineTo(x, by); ctx.stroke(); }
    if (riot) { ctx.fillStyle = '#140f0c'; ctx.beginPath(); ctx.moveTo(bx - bw / 2 - 10, by - bh); ctx.lineTo(bx, by - bh - 54); ctx.lineTo(bx + bw / 2 + 10, by - bh); ctx.fill(); }
    if (!riot) {
      // 불길이 지붕을 뚫고 오른다: 서까래만 남은 지붕
      smoke(v, bx + 10, by - bh - 30, 170, 100, '#1a1614', 0.55);
      glow(v, bx, by - bh - 10, 240, '#ff7a30', 0.4);
      blaze(v, bx, by - bh + 16, bw * 0.9, 120); blaze(v, bx - 30, by - bh + 10, 70, 84);
      rect(ctx, bx - bw / 2, by - bh, bw, bh, '#150f0c'); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; for (let x = bx - bw / 2 + 8; x < bx + bw / 2; x += 11) { ctx.beginPath(); ctx.moveTo(x, by - bh); ctx.lineTo(x, by); ctx.stroke(); }
      ctx.fillStyle = vgrad(ctx, by - bh - 54, by - bh, [[0, 'rgba(226,110,36,.9)'], [1, 'rgba(120,36,14,.95)']]); ctx.beginPath(); ctx.moveTo(bx - bw / 2 - 6, by - bh); ctx.lineTo(bx, by - bh - 51); ctx.lineTo(bx + bw / 2 + 6, by - bh); ctx.fill();
      ctx.strokeStyle = '#0e0a08'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(bx - bw / 2 - 10, by - bh); ctx.lineTo(bx, by - bh - 54); ctx.lineTo(bx + bw / 2 + 10, by - bh); ctx.stroke();
      ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { const k = i / 6, x = bx - bw / 2 + bw * k, top = by - bh - 54 * (1 - Math.abs(k - 0.5) * 2); if (R() < 0.8) { ctx.beginPath(); ctx.moveTo(x, by - bh); ctx.lineTo(x + (R() - 0.5) * 6, top + R() * 10); ctx.stroke(); } }
      for (const [x, y, w, h] of [[-62, -54, 14, 17], [50, -54, 14, 17], [-17, -46, 34, 46]]) { ctx.fillStyle = vgrad(ctx, by + y, by + y + h, [[0, '#f0a848'], [1, '#b8440f']]); ctx.fillRect(bx + x, by + y, w, h); glow(v, bx + x + w / 2, by + y + h / 2, w * 1.3, '#ff8a30', 0.3); }
      ctx.fillStyle = '#150f0c'; ctx.fillRect(bx - 1.5, by - 46, 3, 46);
      pool(v, bx, by + 26, 300, 30, '#ff8a3a', 0.3);
      // 물동이를 나르는 사람들
      for (const [x, h, f] of [[176, 104, 1], [240, 96, 1], [566, 98, -1]]) { person(v, x, 230, h, { f, raw: true, cloth: '#1e1814', hair: '#14100e', arm: 'fwd', female: x === 240, rim: 'rgba(255,150,70,.75)', rimDir: f }); rect(ctx, x + f * h * 0.27 - 4, 230 - h * 0.56, 9, 9, '#14100e'); }
      person(v, 84, 246, 150, { f: 1, raw: true, cloth: dark(v.me.cloth, 0.6), hair: dark(v.me.hair, 0.4), female: v.me.female, long: v.me.long, rim: 'rgba(255,150,70,.75)', rimDir: 1 });
    } else {
      rect(ctx, bx - 24, by - 54, 48, 54, '#2a2018'); ctx.strokeStyle = '#0c0908'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 24, by - 30); ctx.lineTo(bx + 24, by - 30); ctx.stroke();
      for (const x of [bx - 44, bx + 44]) person(v, x, by + 4, 70, { f: x < bx ? -1 : 1, raw: true, cloth: '#3a3a44', hair: '#5a5a60', hood: true, stick: 'spear' });
      const mob = [[90, 100], [150, 110], [214, 104], [270, 116], [330, 106], [500, 108], [560, 112], [610, 100]];
      mob.forEach(([x, h], i) => person(v, x, 240, h, { f: 0, raw: true, cloth: '#1a1512', hair: '#120e0c', arm: i % 3 === 0 ? 'up' : null, stick: i % 2 ? 'torch' : i % 4 === 0 ? 'staff' : null, hood: i % 3 === 1, female: i % 4 === 2, rim: 'rgba(255,150,70,.6)', rimDir: i % 2 ? -1 : 1 }));
      pool(v, 320, 226, 360, 30, '#ff8a3a', 0.26);
    }
    finish(v, { noLeaves: true });
  },

  /** 감옥: 높은 창살 창에서 떨어지는 빛, 벽에 기댄 사람, 앞을 가로막은 쇠창살 */
  prison(v) {
    const { ctx, R } = v, fy = room(v, { wall: '#34302c', floor: '#221f1c', fy: 178 });
    const day = v.S.tod !== 'night', col = day ? v.S.lit : '#8a9ac0';
    windowAt(v, 210, 26, 44, 38, { bars: 4 });
    shaft(v, 210, 64, 44, 150, 130, col, day ? 0.3 : 0.16); pool(v, 350, fy + 22, 90, 16, col, day ? 0.3 : 0.14);
    // 짚과 그릇, 쇠고리
    ctx.strokeStyle = 'rgba(170,140,80,.45)'; ctx.lineWidth = 1; for (let i = 0; i < 70; i++) { const x = 380 + R() * 150, y = fy + 6 + R() * 22; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 18, y - R() * 5); ctx.stroke(); }
    ctx.fillStyle = '#4a4038'; ctx.beginPath(); ctx.ellipse(330, fy + 30, 11, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5a544c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(520, 96, 6, 0, TAU); ctx.stroke(); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(520, 102); ctx.quadraticCurveTo(512, 150, 478, fy + 10); ctx.stroke(); ctx.setLineDash([]);
    const me = v.me;
    person(v, 440, fy + 30, 190, { f: -1, pose: 'huddle', raw: true, cloth: mixh(me.cloth, '#5a544c', 0.5), hair: me.hair, female: me.female, long: me.long, arm: 'chest', old: true, rim: `rgba(${day ? '240,230,200' : '150,170,210'},.5)`, rimDir: -1 });
    // 앞쪽 쇠창살
    ctx.fillStyle = '#0c0a09'; for (let x = 18; x < 190; x += 30) ctx.fillRect(x, 0, 7, VH); ctx.fillRect(0, 60, 196, 8); ctx.fillRect(0, 190, 196, 8); ctx.fillRect(184, 0, 12, VH);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let x = 18; x < 190; x += 30) ctx.fillRect(x + 5, 0, 1.5, VH);
    finish(v, { inside: true });
  },

  /** 항해: 바다 위의 배. variant 'storm' 폭풍, 'harbor' 부두, 'pirate' 검은 돛, 'serpent' 바다뱀, 'wreck' 난파 */
  voyage(v) {
    const { ctx, t, R, S } = v, kind = v.variant ?? 'calm', storm = kind === 'storm' || kind === 'wreck';
    sky(v);
    if (storm) { ctx.fillStyle = 'rgba(14,18,28,.62)'; ctx.fillRect(0, 0, VW, VH); for (let i = 0; i < 14; i++) puff(ctx, R() * VW, R() * 90, 150, 40, '#1a2030', 0.5); }
    far(v, { sea: true });
    if (kind === 'harbor') {
      townFar(v, 150, HZ + 4, { s: 0.9 }); waves(v, HZ + 4, 0.6);
      shipBig(v, 420, 176, 1.25, { furled: true, lamp: lit(v), flag: t(flag(v)) }); shipBig(v, 250, 142, 0.5, { d: -1 });
      // 부두
      rect(ctx, 0, 196, VW, 44, t('#3a2c20')); rect(ctx, 0, 192, VW, 6, t('#5a4632')); ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 10; x < VW; x += 34) ctx.fillRect(x, 196, 2, 44);
      for (const x of [70, 300, 560]) { rect(ctx, x, 176, 9, 18, t('#2a2018')); rect(ctx, x - 2, 174, 13, 4, t('#2a2018')); }
      for (const [x, w, h] of [[110, 30, 24], [138, 24, 18], [500, 34, 28]]) { rect(ctx, x, 194 - h, w, h, t('#6a5236')); ctx.strokeStyle = rgba('#000000', 0.3); ctx.strokeRect(x + 2, 196 - h, w - 4, h - 4); }
      ctx.fillStyle = t('#5a4a38'); ctx.beginPath(); ctx.ellipse(180, 184, 11, 12, 0, 0, TAU); ctx.fill();
      person(v, 226, 196, 62, { f: 1, cloth: '#3e4658', hair: '#2a1e16', hat: true }); person(v, 600, 198, 60, { f: -1, cloth: '#5a4636', hair: '#4a3220', arm: 'out' });
      person(v, 356, 226, 112, { f: 0, cloth: dark(v.me.cloth, 0.3), hair: v.me.hair, female: v.me.female, long: v.me.long });
      for (let i = 0; i < 5; i++) { const x = 300 + R() * 300, y = 30 + R() * 60; ctx.strokeStyle = rgba(t('#f0f0ea'), 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 5, y - 2); ctx.quadraticCurveTo(x - 2, y - 4, x, y); ctx.quadraticCurveTo(x + 2, y - 4, x + 5, y - 2); ctx.stroke(); }
      finish(v); return;
    }
    waves(v, HZ + 2, storm ? 2.2 : 1);
    if (storm) { // 큰 물마루
      for (const [x, y, w, h] of [[110, 200, 320, 40], [500, 212, 360, 50], [300, 236, 300, 34]]) { ctx.fillStyle = rgba(t(dark(v.P.water, 0.4)), 0.85); ctx.beginPath(); ctx.moveTo(x - w / 2, VH); ctx.bezierCurveTo(x - w * 0.3, y, x - w * 0.14, y - h, x + w * 0.04, y - h * 0.86); ctx.bezierCurveTo(x + w * 0.16, y - h * 0.5, x + w * 0.3, y, x + w / 2, VH); ctx.fill(); ctx.strokeStyle = rgba('#dfe6e8', 0.55); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - w * 0.22, y - h * 0.5); ctx.quadraticCurveTo(x - w * 0.1, y - h * 1.02, x + w * 0.04, y - h * 0.86); ctx.stroke(); for (let i = 0; i < 8; i++) puff(ctx, x - w * 0.06 + R() * w * 0.12, y - h * 0.9 + R() * 6, 9, 4, '#e8eef0', 0.4); }
      const lx = 140 + R() * 300; ctx.strokeStyle = '#eef2ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, 0); let px = lx, py = 0; while (py < HZ - 6) { px += (R() - 0.5) * 34; py += 12 + R() * 14; ctx.lineTo(px, py); } ctx.stroke(); glow(v, lx, 40, 220, '#aab8e0', 0.3);
    }
    if (kind === 'wreck') { // 기울어 가라앉는 배와 부서진 돛대
      shipBig(v, 330, 178, 1.2, { tilt: -0.5, furled: true }); ctx.fillStyle = t(dark(v.P.water, 0.25)); ctx.fillRect(0, 186, VW, 54); waves(v, 184, 2);
      for (const [x, y, a] of [[180, 204, 0.3], [480, 198, -0.2], [420, 222, 0.1]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); rect(ctx, -22, -2, 44, 4, t('#3a2a20')); ctx.restore(); }
    } else {
      shipBig(v, kind === 'serpent' ? 250 : 340, storm ? 172 : 168, storm ? 1.15 : 1.2, { tilt: storm ? -0.16 : -0.02, sail: kind === 'pirate' ? '#26232a' : undefined, flag: kind === 'pirate' ? '#0e0c0e' : t(flag(v)), furled: storm, lamp: lit(v) });
      // 뱃머리의 물보라와 물에 비친 그림자
      ctx.fillStyle = rgba(t('#1c2630'), 0.35); ctx.beginPath(); ctx.ellipse(kind === 'serpent' ? 250 : 340, 184, 80, 8, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 10; i++) puff(ctx, (kind === 'serpent' ? 250 : 340) + 62 + R() * 16, 174 + R() * 10, 8, 4, '#e8eef0', 0.5);
    }
    if (kind === 'pirate') { shipBig(v, 548, 138, 0.42, { d: -1, flag: t(flag(v)) }); }
    if (kind === 'serpent') { // 물 위로 솟은 바다뱀의 등과 목
      const c = t('#14262a'), hi = rgba(t('#4a7a74'), 0.5);
      // 물 밖으로 드러난 등줄기 (가시 돋친 낮은 등 둘)
      for (const [x, w, h] of [[474, 86, 22], [572, 60, 13]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - w / 2, 190); ctx.quadraticCurveTo(x - w * 0.1, 190 - h * 2, x + w / 2, 190); ctx.fill(); for (let i = 0; i < 6; i++) { const k = 0.18 + i * 0.13, px = x - w / 2 + w * k, py = 190 - Math.sin(k * Math.PI) * h * 0.98; ctx.beginPath(); ctx.moveTo(px - 4, py + 2); ctx.lineTo(px + 2, py - 8 - Math.sin(k * Math.PI) * 5); ctx.lineTo(px + 5, py + 2); ctx.fill(); } ctx.strokeStyle = hi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - w * 0.3, 190 - h * 0.8); ctx.quadraticCurveTo(x - w * 0.05, 190 - h * 1.06, x + w * 0.2, 190 - h * 0.84); ctx.stroke(); }
      // 배 위로 솟은 목과 벌린 턱
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(366, 194); ctx.quadraticCurveTo(372, 120, 352, 86); ctx.quadraticCurveTo(342, 68, 322, 60); ctx.lineTo(282, 62); ctx.lineTo(306, 72); ctx.lineTo(284, 84); ctx.lineTo(320, 84); ctx.quadraticCurveTo(334, 92, 338, 112); ctx.quadraticCurveTo(346, 150, 334, 194); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(328, 62); ctx.lineTo(346, 44); ctx.lineTo(342, 70); ctx.fill(); ctx.beginPath(); ctx.moveTo(346, 78); ctx.lineTo(366, 66); ctx.lineTo(356, 92); ctx.fill(); ctx.beginPath(); ctx.moveTo(358, 104); ctx.lineTo(376, 98); ctx.lineTo(364, 120); ctx.fill();
      ctx.fillStyle = '#e8c860'; ctx.fillRect(316, 65, 3.4, 2.2); glow(v, 317, 66, 8, '#ffcf60', 0.6);
      ctx.fillStyle = '#d8d4c4'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(290 + i * 6, 64 + i * 1.6); ctx.lineTo(292 + i * 6, 69 + i * 1.6); ctx.lineTo(294 + i * 6, 64.6 + i * 1.6); ctx.fill(); }
      ctx.strokeStyle = hi; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(344, 186); ctx.quadraticCurveTo(350, 130, 338, 96); ctx.stroke();
      for (let i = 0; i < 18; i++) puff(ctx, 336 + R() * 34, 186 + R() * 8, 12, 5, '#e8eef0', 0.55);
    }
    if (!storm) for (let i = 0; i < 4; i++) { const x = 60 + R() * 520, y = 24 + R() * 70; ctx.strokeStyle = rgba(t('#f0f0ea'), 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 5, y - 2); ctx.quadraticCurveTo(x - 2, y - 4, x, y); ctx.quadraticCurveTo(x + 2, y - 4, x + 5, y - 2); ctx.stroke(); }
    if (storm) { ctx.strokeStyle = 'rgba(210,220,230,.3)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 240; i++) { const x = R() * (VW + 60), y = R() * VH; ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 18); } ctx.stroke(); }
    finish(v, { noLeaves: true });
  },

  /** 궁정: 기둥이 늘어선 홀, 단 위의 주군과 그 앞에 무릎 꿇은 사람 */
  court(v) {
    const { ctx, R } = v, fy = room(v, { wall: '#4a443e', floor: '#3a342e', fy: 170 });
    const day = v.S.tod !== 'night', col = day ? v.S.lit : '#8a9ac0', c = flag(v);
    ctx.save(); zoom(v, 400, 250, 1.36);
    for (const x of [120, 250, 390, 520]) { windowAt(v, x, 18, 30, 92, { arch: true }); shaft(v, x, 110, 30, 110, 70, col, day ? 0.2 : 0.1); }
    // 기둥
    for (const x of [56, 186, 320, 454, 584]) { rect(ctx, x - 13, 0, 26, fy, '#5a544c'); rect(ctx, x - 13, 0, 7, fy, 'rgba(0,0,0,.25)'); rect(ctx, x - 17, fy - 10, 34, 10, '#6a645a'); rect(ctx, x - 17, 0, 34, 8, '#6a645a'); }
    for (const x of [186, 454]) { rect(ctx, x - 11, 16, 22, 78, c); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 11, 94); ctx.lineTo(x, 106); ctx.lineTo(x + 11, 94); ctx.fill(); ctx.fillStyle = '#c9a25a'; ctx.beginPath(); ctx.arc(x, 50, 5, 0, TAU); ctx.fill(); }
    // 단과 옥좌
    const tx = 470;
    rect(ctx, tx - 110, fy - 4, 220, 12, '#5e574e'); rect(ctx, tx - 90, fy - 14, 180, 12, '#6a6258'); rect(ctx, tx - 100, fy + 6, 200, 34, c); rect(ctx, tx - 100, fy + 6, 200, 34, 'rgba(0,0,0,.3)');
    rect(ctx, tx - 20, fy - 86, 40, 74, '#2e2620'); ctx.fillStyle = '#2e2620'; ctx.beginPath(); ctx.moveTo(tx - 24, fy - 86); ctx.lineTo(tx, fy - 108); ctx.lineTo(tx + 24, fy - 86); ctx.fill(); sunSign(v, tx, fy - 92, 4, '#c9a25a');
    person(v, tx, fy - 14, 66, { f: -1, pose: 'sit', raw: true, cloth: mixh(c, '#2a2028', 0.3), hair: '#8a8478', robe: true, arm: 'out' });
    ctx.fillStyle = '#c9a25a'; ctx.fillRect(tx - 6, fy - 62, 9, 3); for (let i = 0; i < 3; i++) ctx.fillRect(tx - 6 + i * 3.4, fy - 65, 2, 3);
    for (const x of [tx - 74, tx + 74]) person(v, x, fy - 2, 74, { f: x < tx ? -1 : 1, raw: true, cloth: '#3e3e48', hair: '#5a5a60', hood: true, stick: 'spear' });
    // 무릎 꿇은 사람과 늘어선 신하들
    const me = v.me;
    person(v, 300, fy + 30, 96, { f: 1, pose: 'kneel', raw: true, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long, rim: `rgba(${day ? '250,236,200' : '150,170,210'},.55)`, rimDir: -1 });
    ctx.restore();
    for (const [x, h] of [[50, 150], [116, 138], [606, 144]]) person(v, x, 246, h, { f: x < 300 ? 1 : -1, raw: true, cloth: dark(['#5a3a34', '#3e4658', '#584460'][x % 3], 0.35), hair: '#2a1e16', robe: true, hat: R() < 0.5, female: R() < 0.3 });
    finish(v, { inside: true });
  },

  /** 잔치: 마을 풀밭의 모닥불과 춤. variant 'dead' 망자의 밤(촛불), 'troupe' 유랑 극단의 수레 무대 */
  festival(v) {
    const { ctx, t, R, P } = v, dead = v.variant === 'dead';
    sky(v); far(v); townFar(v, 150, HZ + 22, { s: 1.1 }); townFar(v, 520, HZ + 20, { s: 0.9, noSpire: true });
    const gy = (x) => 160 - fbm1(x / 150 + v.q, 3) * 5;
    ground(v, gy, { tufts: 80 });
    const cx = 320, cy = 204;
    if (dead) {
      // 촛불을 든 긴 줄과 무덤가의 불빛
      for (let i = 0; i < 40; i++) { const x = R() * VW, y = 166 + R() * 60; candle(v, x, y, 4 + (y - 160) / 14); }
      for (const [x, h, f] of [[120, 86, 1], [200, 92, 1], [286, 98, 1], [380, 96, -1], [470, 90, -1], [556, 84, -1]]) { person(v, x, 226, h, { f, cloth: '#2e2a30', hair: '#1c1a1c', hood: true, robe: true, arm: 'fwd', rim: 'rgba(255,180,100,.5)', rimDir: f }); candle(v, x + f * h * 0.3, 226 - h * 0.5, 6); }
      finish(v, { noLeaves: true }); return;
    }
    // 등불 줄
    for (const [x0, x1] of [[60, 300], [340, 590]]) { ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, 96); ctx.quadraticCurveTo((x0 + x1) / 2, 128, x1, 96); ctx.stroke(); rect(ctx, x0 - 2, 96, 4, 76, t('#2a2018')); rect(ctx, x1 - 2, 96, 4, 76, t('#2a2018')); for (let i = 1; i < 7; i++) { const k = i / 7, x = x0 + (x1 - x0) * k, y = 96 + Math.sin(k * Math.PI) * 16 + 4; ctx.fillStyle = ['#e8a040', '#d86a3a', '#e8c860'][i % 3]; ctx.beginPath(); ctx.ellipse(x, y, 3, 4, 0, 0, TAU); ctx.fill(); if (lit(v)) glow(v, x, y, 16, '#ffb060', 0.4); } }
    if (v.variant === 'troupe') {
      // 수레 무대
      rect(ctx, cx - 90, cy - 62, 180, 46, t('#5a3a34')); rect(ctx, cx - 96, cy - 18, 192, 8, t('#3a2c20')); ctx.fillStyle = t('#8a2f2a'); ctx.beginPath(); ctx.moveTo(cx - 96, cy - 62); ctx.quadraticCurveTo(cx, cy - 96, cx + 96, cy - 62); ctx.fill();
      ctx.strokeStyle = t('#2a2018'); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx - 60, cy - 2, 12, 0, TAU); ctx.arc(cx + 60, cy - 2, 12, 0, TAU); ctx.stroke();
      person(v, cx - 26, cy - 18, 46, { f: 1, cloth: '#c9a25a', hair: '#7a3a22', arm: 'up' }); person(v, cx + 26, cy - 18, 44, { f: -1, cloth: '#3a5a8a', hair: '#2a1e16', female: true, arm: 'out' });
      if (lit(v)) { flame(v, cx - 104, cy - 20, 5); flame(v, cx + 104, cy - 20, 5); }
      crowd(v, 60, 590, 238, 12, 72);
    } else {
      // 모닥불과 둥글게 도는 춤
      ctx.save(); zoom(v, cx, 236, 1.3);
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI, x = cx + Math.cos(a) * 120, y = cy - 12 + Math.sin(a) * 14; person(v, x, y, 56, { f: i < 3 ? 1 : i === 3 ? 0 : -1, cloth: ['#7a3a34', '#4a5240', '#8a7444', '#3e4658', '#5a3a34'][i % 5], hair: ['#2a1e16', '#6e4a28', '#9a7a48'][i % 3], female: i % 2 === 0, arm: 'out', rim: 'rgba(255,170,90,.7)', rimDir: i < 3 ? 1 : -1 }); }
      ctx.fillStyle = '#1c1410'; for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.9 + i * 0.45); ctx.fillRect(-2, -22, 4, 24); ctx.restore(); }
      blaze(v, cx, cy - 2, 40, 70); flame(v, cx, cy, 11); pool(v, cx, cy + 8, 240, 30, '#ff9a48', lit(v) ? 0.4 : 0.2); if (lit(v)) glow(v, cx, cy - 30, 240, '#ff8a3a', 0.3);
      for (const [x, y, h, f, fem] of [[cx - 136, cy + 26, 70, 1, false], [cx - 84, cy + 34, 66, 1, true], [cx + 92, cy + 34, 68, -1, false], [cx + 140, cy + 26, 66, -1, true]]) person(v, x, y, h, { f: 0, raw: true, cloth: fem ? '#2a2024' : '#221c18', hair: '#16110e', female: fem, cloak: !fem, rim: 'rgba(255,160,80,.65)', rimDir: f });
      ctx.restore();
      // 술통과 긴 탁자
      rect(ctx, 500, 186, 90, 5, t('#4a3828')); rect(ctx, 506, 190, 4, 18, t('#3a2c20')); rect(ctx, 582, 190, 4, 18, t('#3a2c20')); ctx.fillStyle = t('#5a4630'); ctx.beginPath(); ctx.ellipse(68, 196, 14, 16, 0, 0, TAU); ctx.fill();
      if (P.sheaves || v.month === 9 || v.month === 10) for (const x of [36, 606]) { ctx.fillStyle = t('#c8a84e'); ctx.beginPath(); ctx.moveTo(x - 10, 214); ctx.lineTo(x, 176); ctx.lineTo(x + 10, 214); ctx.fill(); }
    }
    finish(v);
  },

  /** 예배당 안: 제단과 사제, 무릎 꿇은 사람. variant 'child'면 아이, 'inquisition'이면 흰 옷의 심문관들 */
  chapel(v) {
    const { ctx } = v, fy = room(v, { wall: '#4e4840', floor: '#39332c', fy: 174 });
    const day = v.S.tod !== 'night', col = day ? v.S.lit : '#8a9ac0', ax = 330;
    ctx.save(); zoom(v, 330, 250, 1.22);
    // 둥근 큰 창과 표식
    ctx.fillStyle = '#17120e'; ctx.beginPath(); ctx.arc(ax, 58, 40, 0, TAU); ctx.fill();
    ctx.fillStyle = vgrad(ctx, 20, 96, [[0, v.S.mid], [1, v.S.low]]); ctx.beginPath(); ctx.arc(ax, 58, 36, 0, TAU); ctx.fill();
    sunSign(v, ax, 58, 15, '#17120e'); ctx.lineWidth = 2; ctx.strokeStyle = '#17120e'; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * 27, 58 + Math.sin(a) * 27); ctx.lineTo(ax + Math.cos(a) * 36, 58 + Math.sin(a) * 36); ctx.stroke(); }
    glow(v, ax, 58, 90, col, day ? 0.4 : 0.16); shaft(v, ax, 96, 60, 130, 0, col, day ? 0.22 : 0.1);
    for (const x of [130, 530]) { windowAt(v, x, 40, 26, 80, { arch: true }); shaft(v, x, 120, 26, 90, x < ax ? 50 : -50, col, day ? 0.14 : 0.06); }
    for (const x of [40, 230, 430, 600]) { rect(ctx, x - 11, 0, 22, fy, '#5c554c'); rect(ctx, x - 11, 0, 6, fy, 'rgba(0,0,0,.25)'); }
    // 제단
    rect(ctx, ax - 56, fy - 30, 112, 30, '#6a6258'); rect(ctx, ax - 62, fy - 36, 124, 8, '#d8cfb8'); rect(ctx, ax - 70, fy, 140, 8, '#5a544a');
    candle(v, ax - 44, fy - 36, 12); candle(v, ax + 44, fy - 36, 12); candle(v, ax - 30, fy - 36, 8); candle(v, ax + 30, fy - 36, 8);
    const me = v.me, child = v.variant === 'child';
    if (v.variant === 'inquisition') {
      for (const [x, f] of [[ax - 70, 1], [ax, 1], [ax + 70, -1]]) person(v, x, fy + 16, 92, { f: x === ax ? 0 : f, raw: true, cloth: '#e0d8c4', hair: '#8a8478', robe: true, hood: x !== ax });
      sunSign(v, ax, fy + 16 - 60, 5, '#c9a25a');
      person(v, ax, 232, 96, { f: 0, pose: 'kneel', raw: true, cloth: dark(me.cloth, 0.4), hair: me.hair, female: me.female, long: me.long });
    } else {
      person(v, ax + 34, fy + 10, 88, { f: -1, raw: true, cloth: '#e0d8c4', hair: '#8a8478', robe: true, arm: 'out' });
      person(v, ax - 30, fy + 22, child ? 52 : 88, { f: 1, pose: child ? 'stand' : 'kneel', raw: true, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long, child, rim: `rgba(${day ? '250,236,200' : '150,170,210'},.5)`, rimDir: 1 });
    }
    ctx.restore();
    finish(v, { inside: true });
  },

  /** 용: 산등성이에 내려앉은 거대한 그림자와 바위 위의 작은 사람 */
  dragon(v) {
    const { ctx, t, R } = v;
    sky(v); far(v, { peaks: true });
    const ridge = (x) => 150 - Math.max(0, 1 - Math.abs(x - 400) / 260) * 60 - fbm1(x / 60 + v.q, 5, 3) * 20;
    curve(ctx, ridge, t(mixh('#4a4a52', v.S.haze, 0.3)));
    // 하늘을 덮고 내려오는 용
    const c = t('#17151b'), c2 = t('#26232c'), bx = 400, by = 78;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-0.08);
    for (const d of [1, -1]) { // 날개: 뼈대와 물결진 막
      ctx.fillStyle = d > 0 ? c2 : c; ctx.beginPath(); ctx.moveTo(d * 6, -2); ctx.quadraticCurveTo(d * 60, -70, d * 150, -58);
      ctx.quadraticCurveTo(d * 196, -50, d * 232, -8); ctx.quadraticCurveTo(d * 196, -14, d * 178, 12); ctx.quadraticCurveTo(d * 150, -6, d * 128, 22); ctx.quadraticCurveTo(d * 100, 0, d * 76, 28); ctx.quadraticCurveTo(d * 50, 6, d * 22, 22); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2; for (const [ex, ey] of [[178, 12], [128, 22], [76, 28]]) { ctx.beginPath(); ctx.moveTo(d * 150, -58); ctx.quadraticCurveTo(d * (ex + 150) / 2, ey - 34, d * ex, ey); ctx.stroke(); }
    }
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-26, -4); ctx.quadraticCurveTo(0, -18, 30, -6); ctx.quadraticCurveTo(70, 4, 118, 34); ctx.quadraticCurveTo(150, 52, 176, 50); ctx.lineTo(168, 58); ctx.lineTo(178, 62); ctx.quadraticCurveTo(140, 66, 104, 44); ctx.quadraticCurveTo(60, 22, 26, 20); ctx.quadraticCurveTo(-4, 24, -26, 16); ctx.closePath(); ctx.fill(); // 몸통과 꼬리
    ctx.beginPath(); ctx.moveTo(-18, -6); ctx.quadraticCurveTo(-56, -10, -78, 14); ctx.quadraticCurveTo(-90, 28, -104, 30); ctx.lineTo(-132, 46); ctx.lineTo(-112, 48); ctx.lineTo(-96, 42); ctx.quadraticCurveTo(-72, 38, -62, 24); ctx.quadraticCurveTo(-46, 10, -20, 16); ctx.closePath(); ctx.fill(); // 목과 머리
    ctx.beginPath(); ctx.moveTo(-100, 30); ctx.lineTo(-88, 16); ctx.lineTo(-94, 34); ctx.fill(); ctx.beginPath(); ctx.moveTo(-108, 34); ctx.lineTo(-100, 22); ctx.lineTo(-102, 38); ctx.fill();
    for (const [lx, ly] of [[4, 18], [34, 20]]) { ctx.beginPath(); ctx.moveTo(lx, ly - 4); ctx.lineTo(lx - 8, ly + 18); ctx.lineTo(lx - 14, ly + 22); ctx.lineTo(lx - 4, ly + 22); ctx.lineTo(lx + 8, ly); ctx.fill(); }
    ctx.restore();
    glow(v, bx - 112, by + 46, 9, '#ffb040', 0.7); ctx.fillStyle = '#ffcf70'; ctx.fillRect(bx - 114, by + 45, 3, 1.6);
    // 용 그림자가 덮은 산허리
    for (let i = 0; i < 5; i++) puff(ctx, bx - 160 + R() * 320, 140 + R() * 16, 100, 14, v.S.haze, 0.3);
    // 앞쪽 바위와 사람
    const fg = (x) => 204 - Math.max(0, 1 - Math.abs(x - 130) / 150) * 40 - fbm1(x / 50 + v.q, 9, 3) * 12;
    curve(ctx, fg, t('#1e1c1e'));
    person(v, 132, fg(132) + 2, 44, { f: 1, cloth: dark(v.me.cloth, 0.4), hair: dark(v.me.hair, 0.3), female: v.me.female, long: v.me.long, stick: 'staff' });
    crows(v, 520, 50, 4, 50);
    finish(v, { noLeaves: true });
  },

  /** 길: 짐을 지고 떠나는 사람과 문간에 남은 사람들. variant 'return'이면 돌아오는 길 */
  road(v) {
    const { ctx, t } = v, back = v.variant === 'return';
    sky(v); far(v); if (back) townFar(v, 430, HZ + 20, { s: 0.9 }); else townFar(v, 470, HZ + 14, { s: 0.36, n: 5 });
    const gy = (x) => 156 - fbm1(x / 140 + v.q, 3) * 8;
    ground(v, gy);
    road(v, 300, 440, HZ + 28, { w: 140 });
    tree(v, 566, 196, 140); tree(v, 24, 178, 90);
    // 울타리
    ctx.strokeStyle = t('#3a2c20'); ctx.lineWidth = 2; for (let x = 40; x < 250; x += 26) { ctx.beginPath(); ctx.moveTo(x, 206 - (x - 40) * 0.08); ctx.lineTo(x, 188 - (x - 40) * 0.08); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(40, 194); ctx.lineTo(246, 178); ctx.moveTo(40, 200); ctx.lineTo(246, 184); ctx.stroke();
    const me = v.me;
    if (back) {
      person(v, 330, 232, 110, { f: 0, cloth: dark(me.cloth, 0.2), hair: me.hair, female: me.female, long: me.long, stick: 'staff' });
      puff(ctx, 330, 232 - 76, 17, 20, t('#5a4a38'), 1);
    } else {
      person(v, 384, 196, 58, { f: 0, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long, stick: 'staff' });
      puff(ctx, 384, 196 - 40, 9, 11, t('#5a4a38'), 1);
      person(v, 150, 232, 104, { f: 1, cloth: dark(v.other.cloth, 0.3), hair: '#8a8478', female: true, arm: 'chest' });
      person(v, 206, 234, 110, { f: 1, cloth: dark('#4a5240', 0.3), hair: '#5a5248', arm: 'out', old: true });
    }
    finish(v);
  },

  /** 병상: 촛불 켠 방, 누운 사람과 곁을 지키는 식구. variant 'last'면 식구들이 둘러선 마지막 자리 */
  bedside(v) {
    const { ctx } = v, fy = room(v, { stone: false, wall: '#3e3026', floor: '#2e241c', fy: 170 }), last = v.variant === 'last';
    ctx.save(); zoom(v, 330, 250, 1.34);
    windowAt(v, 190, 76, 40, 44);
    if (v.S.tod !== 'night') shaft(v, 190, 120, 40, 90, 80, v.S.lit, 0.14);
    const bx = 330, by = fy + 16;
    rect(ctx, bx - 120, by - 40, 240, 12, '#3a2a1e'); rect(ctx, bx + 110, by - 78, 12, 100, '#3a2a1e'); rect(ctx, bx - 122, by - 52, 10, 74, '#3a2a1e'); rect(ctx, bx - 116, by - 30, 232, 44, '#2a2018');
    rect(ctx, bx - 114, by - 46, 226, 16, '#b8ad96'); ctx.fillStyle = '#d0c6ae'; ctx.beginPath(); ctx.ellipse(bx + 86, by - 50, 20, 10, -0.2, 0, TAU); ctx.fill();
    const me = v.me;
    lying(v, bx + 82, by - 46, 170, { d: -1, raw: true, cover: '#7a7060', hair: last ? me.hair : v.other.hair, skin: '#c8b0a0' });
    rect(ctx, bx + 136, by - 34, 34, 4, '#3a2a1e'); rect(ctx, bx + 150, by - 30, 5, 48, '#3a2a1e'); candle(v, bx + 152, by - 34, 12); pool(v, bx + 60, by - 40, 150, 70, '#ffb060', 0.22);
    ctx.fillStyle = '#5a5048'; ctx.beginPath(); ctx.ellipse(bx + 164, by - 36, 6, 2.4, 0, 0, TAU); ctx.fill();
    const rim = 'rgba(255,180,100,.5)';
    if (last) {
      person(v, bx + 20, by + 34, 88, { f: 1, pose: 'kneel', raw: true, cloth: v.other.cloth, hair: v.other.hair, female: !me.female, arm: 'fwd', rim, rimDir: 1 });
      for (const [x, h, f] of [[bx - 150, 112, 1], [bx - 96, 104, 1], [bx - 50, 60, 1]]) person(v, x, 236, h, { f, pose: 'bow', raw: true, cloth: dark(['#5a4636', '#3e4658', '#6a5a3c'][x % 3 + 1 > 2 ? 0 : (x % 3 + 3) % 3], 0.35), hair: ['#4a3220', '#2a1e16', '#6e4a28'][(x + 300) % 3], female: (x + 300) % 2 === 0, child: h < 70, rim, rimDir: 1 });
      person(v, bx + 220, by + 30, 104, { f: -1, raw: true, cloth: '#e0d8c4', hair: '#8a8478', robe: true, arm: 'chest', rim, rimDir: -1 });
    } else {
      rect(ctx, bx - 20, by + 2, 26, 4, '#3a2a1e'); rect(ctx, bx - 16, by + 6, 4, 22, '#3a2a1e'); rect(ctx, bx, by + 6, 4, 22, '#3a2a1e');
      person(v, bx - 6, by + 30, 104, { f: 1, pose: 'sit', raw: true, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long, arm: 'fwd', rim, rimDir: 1 });
    }
    ctx.restore();
    finish(v, { inside: true });
  },

  /** 큰 미궁: 땅속으로 내려가는 돌계단과 횃불 든 일행. variant 'throne'이면 깊은 곳의 왕좌 */
  depths(v) {
    const { ctx, R } = v, throne = v.variant === 'throne';
    ctx.fillStyle = vgrad(ctx, 0, VH, [[0, '#0c0b10'], [0.6, '#1a1820'], [1, '#0e0d12']]); ctx.fillRect(0, 0, VW, VH + 40);
    // 동굴 벽과 종유석
    for (const d of [-1, 1]) { ctx.fillStyle = '#16141a'; ctx.beginPath(); ctx.moveTo(d < 0 ? 0 : VW, 0); for (let y = 0; y <= VH; y += 12) ctx.lineTo((d < 0 ? 0 : VW) - d * (70 + fbm1(y / 40 + v.q, d + 3, 3) * 90 - y * 0.12), y); ctx.lineTo(d < 0 ? 0 : VW, VH); ctx.fill(); }
    ctx.fillStyle = '#121016'; for (let i = 0; i < 16; i++) { const x = R() * VW, h = 14 + R() * 46, w = 5 + R() * 9; ctx.beginPath(); ctx.moveTo(x - w, 0); ctx.lineTo(x, h); ctx.lineTo(x + w, 0); ctx.fill(); }
    const cx = 330;
    if (throne) {
      const col = '#6ad0c0';
      glow(v, cx, 96, 200, col, 0.22);
      for (let i = 0; i < 5; i++) rect(ctx, cx - 120 + i * 12, 176 + i * 9, 240 - i * 24, 9, i % 2 ? '#24212a' : '#2c2832');
      rect(ctx, cx - 30, 78, 60, 100, '#1c1a22'); ctx.fillStyle = '#1c1a22'; ctx.beginPath(); ctx.moveTo(cx - 36, 78); ctx.lineTo(cx - 20, 40); ctx.lineTo(cx - 8, 70); ctx.lineTo(cx, 30); ctx.lineTo(cx + 8, 70); ctx.lineTo(cx + 20, 40); ctx.lineTo(cx + 36, 78); ctx.fill();
      person(v, cx, 176, 92, { f: 0, pose: 'sit', raw: true, cloth: '#0e0d12', hair: '#0e0d12', robe: true, hood: true, rim: rgba(col, 0.6), rimDir: 1 });
      ctx.fillStyle = col; ctx.fillRect(cx - 5, 107, 3, 2); ctx.fillRect(cx + 2, 107, 3, 2); glow(v, cx, 108, 14, col, 0.6);
      ctx.fillStyle = '#b8a060'; for (let i = 0; i < 5; i++) ctx.fillRect(cx - 8 + i * 4, 92 - (i % 2) * 3, 2, 5);
      for (const x of [cx - 150, cx + 150]) { rect(ctx, x - 6, 120, 12, 70, '#24212a'); glow(v, x, 112, 40, col, 0.4); ctx.fillStyle = '#c8fff0'; ctx.beginPath(); ctx.ellipse(x, 113, 3, 6, 0, 0, TAU); ctx.fill(); }
      person(v, cx - 40, 240, 96, { f: 0, raw: true, cloth: dark(v.me.cloth, 0.5), hair: dark(v.me.hair, 0.4), female: v.me.female, long: v.me.long, stick: 'torch', rim: 'rgba(255,160,80,.6)', rimDir: 1 });
      person(v, cx + 50, 242, 90, { f: 0, raw: true, cloth: '#221e1c', hair: '#14100e', cloak: true, stick: 'spear', rim: 'rgba(255,160,80,.5)', rimDir: -1 });
    } else {
      // 돌문과 아래로 꺼지는 계단
      rect(ctx, cx - 84, 40, 30, 150, '#2a2730'); rect(ctx, cx + 54, 40, 30, 150, '#2a2730'); rect(ctx, cx - 96, 26, 192, 22, '#322e38');
      ctx.fillStyle = '#060508'; ctx.fillRect(cx - 54, 48, 108, 150);
      ctx.strokeStyle = '#4a4652'; ctx.lineWidth = 1.5; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(cx - 70 + i * 23, 37, 5, 0, TAU); ctx.stroke(); }
      for (let i = 0; i < 7; i++) { const k = i / 7, w = 108 - k * 50; rect(ctx, cx - w / 2, 196 - i * 13, w, 13, `rgb(${40 - i * 4},${37 - i * 4},${46 - i * 4})`); }
      glow(v, cx, 120, 70, '#6ad0c0', 0.16);
      for (let i = 0; i < 4; i++) puff(ctx, cx - 30 + R() * 60, 150 + R() * 40, 60, 12, '#3a5a58', 0.14);
      const pts = [[cx - 96, 236, 104, 'torch', 1], [cx - 30, 240, 110, 'staff', 0], [cx + 40, 238, 104, 'spear', 0], [cx + 104, 234, 98, 'torch', -1]];
      pts.forEach(([x, y, h, st], i) => person(v, x, y, h, { f: 0, raw: true, cloth: i === 1 ? dark(v.me.cloth, 0.45) : ['#241f1c', '#1e2220', '#26201e'][i % 3], hair: i === 1 ? dark(v.me.hair, 0.3) : '#14100e', female: i === 1 ? v.me.female : i === 3, long: i === 1 && v.me.long, cloak: i !== 1, hood: i === 2, stick: st, rim: 'rgba(255,160,80,.6)', rimDir: i < 2 ? -1 : 1 }));
      pool(v, cx, 232, 260, 24, '#ff9a48', 0.2);
    }
    finish(v, { inside: true });
  },

  /** 마법: 어두운 방 바닥의 빛나는 원과 그 안의 사람. variant 'orb' 수정구, 'wild' 폭주, 'dark' 금지된 술법 */
  ritual(v) {
    const { ctx, R } = v, kind = v.variant ?? 'circle', fy = room(v, { wall: '#2c2a34', floor: '#1e1c24', fy: 166 });
    const col = kind === 'wild' ? '#ff8a40' : kind === 'dark' ? '#8ad06a' : '#7ab8ff', cx = 320, cy = 204;
    // 책장
    for (const x of [30, 500]) { rect(ctx, x, 30, 110, 136, '#2a2018'); for (let r = 0; r < 4; r++) { rect(ctx, x + 4, 62 + r * 32, 102, 3, '#1a140f'); for (let i = 0; i < 12; i++) rect(ctx, x + 6 + i * 8.4, 40 + r * 32 + R() * 5, 6, 22 - R() * 5, ['#5a3a34', '#3e4658', '#4a5240', '#6a5a3c', '#44403c'][Math.floor(R() * 5)]); } }
    windowAt(v, cx, 30, 34, 70, { arch: true });
    if (kind === 'study') { // 연구: 촛불 켠 책상, 펼친 책과 도면
      const me = v.me, dx = cx + 30, dy = cy - 4;
      rect(ctx, dx - 70, dy - 44, 150, 7, '#3a2a1e'); rect(ctx, dx - 62, dy - 38, 6, 46, '#2e2218'); rect(ctx, dx + 66, dy - 38, 6, 46, '#2e2218');
      ctx.fillStyle = '#d8ccb0'; ctx.beginPath(); ctx.moveTo(dx - 20, dy - 45); ctx.lineTo(dx + 4, dy - 49); ctx.lineTo(dx + 28, dy - 45); ctx.lineTo(dx + 4, dy - 43); ctx.fill(); rect(ctx, dx + 36, dy - 47, 30, 3, '#c8bc9c');
      for (let i = 0; i < 3; i++) rect(ctx, dx - 62 + i * 3, dy - 50 - i * 4, 26, 4, ['#5a3a34', '#3e4658', '#4a5240'][i]);
      candle(v, dx - 28, dy - 44, 12); pool(v, dx, dy - 50, 130, 60, '#ffb060', 0.3);
      ctx.fillStyle = '#9ab0c8'; ctx.beginPath(); ctx.arc(dx + 52, dy - 54, 6, 0, TAU); ctx.fill(); rect(ctx, dx + 50, dy - 64, 4, 6, '#9ab0c8'); glow(v, dx + 52, dy - 54, 16, col, 0.4);
      person(v, dx - 2, dy + 8, 112, { f: 1, pose: 'sit', raw: true, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long, arm: 'fwd', rim: 'rgba(255,180,100,.6)', rimDir: 1 });
    } else if (kind === 'orb') {
      rect(ctx, cx - 14, cy - 60, 28, 60, '#3a3640'); rect(ctx, cx - 22, cy - 66, 44, 8, '#4a4650'); rect(ctx, cx - 22, cy - 4, 44, 6, '#4a4650');
      glow(v, cx, cy - 82, 110, col, 0.4); ctx.fillStyle = '#cfe4ff'; ctx.beginPath(); ctx.arc(cx, cy - 82, 15, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + 2, cy - 80, 12, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(cx - 5, cy - 88, 3.4, 0, TAU); ctx.fill();
      const me = v.me, kid = me.age < 15;
      person(v, cx - 62, cy + 14, kid ? 62 : 104, { f: 1, raw: true, cloth: me.cloth, hair: me.hair, female: me.female, long: me.long, child: kid, arm: 'out', rim: 'rgba(140,190,255,.7)', rimDir: 1 });
      person(v, cx + 78, cy + 10, 112, { f: -1, raw: true, cloth: '#3a3450', hair: '#8a8478', robe: true, stick: 'staff', rim: 'rgba(140,190,255,.5)', rimDir: -1 });
      pool(v, cx, cy + 6, 170, 26, col, 0.2);
    } else {
      // 바닥의 원
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.26); ctx.strokeStyle = col; ctx.globalCompositeOperation = 'lighter';
      for (const [r, w] of [[150, 2.4], [132, 1], [86, 1.6]]) { ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
      ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, b = ((i + 2) / 6) * TAU; ctx.moveTo(Math.cos(a) * 132, Math.sin(a) * 132); ctx.lineTo(Math.cos(b) * 132, Math.sin(b) * 132); } ctx.stroke();
      for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; ctx.fillStyle = col; ctx.fillRect(Math.cos(a) * 141 - 2, Math.sin(a) * 141 - 4, 4, 8); }
      ctx.restore();
      pool(v, cx, cy, 240, 50, col, 0.3); glow(v, cx, cy - 50, 220, col, kind === 'wild' ? 0.36 : 0.2);
      const me = v.me;
      person(v, cx, cy + 4, 108, { f: kind === 'dark' ? -1 : 1, raw: true, cloth: kind === 'dark' ? '#1c1a20' : mixh(me.cloth, '#2a2a3a', 0.5), hair: me.hair, female: kind === 'dark' ? true : me.female, long: true, robe: true, hood: kind === 'dark', arm: 'up', rim: rgba(light(col, 0.3), 0.7), rimDir: 1 });
      for (let i = 0; i < 40; i++) { const a = R() * TAU, d = 30 + R() * 130, x = cx + Math.cos(a) * d, y = cy - 10 - R() * 150; glow(v, x, y, 3 + R() * 4, col, 0.5); }
      if (kind === 'wild') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffd8a8'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = -Math.PI * (0.14 + i * 0.24); let x = cx + Math.cos(a) * 14, y = cy - 74 + Math.sin(a) * 14; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 3; j++) { x += Math.cos(a) * 24 + (R() - 0.5) * 20; y += Math.sin(a) * 20 + (R() - 0.5) * 16; ctx.lineTo(x, y); } ctx.stroke(); } ctx.restore(); glow(v, cx, cy - 74, 80, '#ffd0a0', 0.6); }
      if (kind === 'dark') { for (const sx of [cx - 110, cx - 70, cx + 84, cx + 122]) smoke(v, sx, cy + 2, 90 + R() * 40, 16, '#0c1410', 0.5); }
    }
    finish(v, { inside: true });
  },
};
