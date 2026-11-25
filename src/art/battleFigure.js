// 전투 연출의 몸 그림: 사람·네발짐승·거미·망령. (46단계에 새로 그림)
// 막대 인형 대신 풍경 그림체처럼 면으로 그린다: 굵기가 변하는 팔다리, 옷자락과 망토, 투구·갑옷·방패, 빛 받는 쪽 가장자리.
// 자세 값(POSE)과 뼈대 셈은 예전과 같아서 battle.js의 움직임은 그대로 쓴다.
// a: { x, y, face(+1 오른쪽을 봄), look, st(자세 값), t, seed, scale, lit(빛 오는 쪽 ±1), light(빛 빛깔), blade(칼빛), vx(옆 속도) }
import { lerp, clamp, rad, mix, rgba, orb } from './battleKit.js';

const STEEL = '#c6ccd2', STEEL_D = '#6a7078', WOOD = '#4a3626', SKIN = '#c09a74';
const TAU = Math.PI * 2;

/* ---------- 면 그리기 ---------- */
// 굵기가 변하는 팔다리 한 토막 (두 끝은 둥글다)
function seg(c, ax, ay, bx, by, wa, wb, fill) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 0.01, nx = -dy / d, ny = dx / d;
  c.fillStyle = fill; c.beginPath();
  c.moveTo(ax + nx * wa, ay + ny * wa); c.lineTo(bx + nx * wb, by + ny * wb); c.lineTo(bx - nx * wb, by - ny * wb); c.lineTo(ax - nx * wa, ay - ny * wa); c.closePath(); c.fill();
  c.beginPath(); c.arc(ax, ay, wa, 0, TAU); c.fill(); c.beginPath(); c.arc(bx, by, wb, 0, TAU); c.fill();
}
// 빛 받는 쪽 가장자리 한 줄
function rim(c, a, ax, ay, bx, by, wa, wb, k = 1) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 0.01;
  let nx = -dy / d, ny = dx / d;
  if (nx * a.lit * 0.8 - ny * 0.6 < 0) { nx = -nx; ny = -ny; }
  c.strokeStyle = rgba(a.light ?? '#e8dcc4', 0.42 * k); c.lineWidth = Math.max(0.8, 1.1 * a.sc); c.lineCap = 'round';
  c.beginPath(); c.moveTo(ax + nx * wa * 0.82, ay + ny * wa * 0.82); c.lineTo(bx + nx * wb * 0.82, by + ny * wb * 0.82); c.stroke();
}
function limb2(c, a, p0, p1, p2, w0, w1, w2, fill, lit = 1) {
  seg(c, p0[0], p0[1], p1[0], p1[1], w0, w1, fill); seg(c, p1[0], p1[1], p2[0], p2[1], w1, w2, fill);
  if (lit) { rim(c, a, p0[0], p0[1], p1[0], p1[1], w0, w1, lit); rim(c, a, p1[0], p1[1], p2[0], p2[1], w1, w2, lit); }
}
function knee(hx, hy, fx, fy, l, bend) {
  const dx = fx - hx, dy = fy - hy, d = Math.min(Math.hypot(dx, dy), l * 2 - 0.01) || 0.01;
  const h = Math.sqrt(Math.max(0, l * l - (d / 2) ** 2));
  return [hx + dx / 2 + (-dy / d) * h * -bend, hy + dy / 2 + (dx / d) * h * -bend];
}
const poly = (c, pts, fill) => { c.fillStyle = fill; c.beginPath(); for (let i = 0; i < pts.length; i += 2) (i ? c.lineTo(pts[i], pts[i + 1]) : c.moveTo(pts[i], pts[i + 1])); c.closePath(); c.fill(); };

/* ---------- 무기 ---------- */
function weapon(c, a, kind, hx, hy, ang, f, s) {
  const ux = f * Math.sin(ang), uy = Math.cos(ang), nx = uy, ny = -ux; // u: 무기가 뻗는 쪽, n: 그 옆
  const at = (l, w = 0) => [hx + ux * l + nx * w, hy + uy * l + ny * w];
  const glow = a.blade;
  if (kind === 'none') return null;
  if (kind === 'sword' || kind === 'dagger') {
    const L = (kind === 'sword' ? 33 : 14) * s, w = (kind === 'sword' ? 1.7 : 1.4) * s;
    const tip = at(L), g0 = at(2.4 * s);
    // 자루와 자루 끝
    seg(c, ...at(-5 * s), ...g0, 1.2 * s, 1.2 * s, '#2a2018'); c.fillStyle = '#8a7a50'; c.beginPath(); c.arc(...at(-5.6 * s), 1.7 * s, 0, TAU); c.fill();
    // 날: 밝은 면과 어두운 면
    poly(c, [...at(2.4 * s, w), ...at(L * 0.86, w * 0.8), ...tip, ...at(2.4 * s, 0)], glow ? mix(STEEL, glow, 0.5) : STEEL);
    poly(c, [...at(2.4 * s, -w), ...at(L * 0.86, -w * 0.8), ...tip, ...at(2.4 * s, 0)], glow ? mix(STEEL_D, glow, 0.6) : '#8e959c');
    // 코등이
    seg(c, ...at(2.4 * s, -4.4 * s), ...at(2.4 * s, 4.4 * s), 1.1 * s, 1.1 * s, '#7a6a44');
    if (glow) { for (const q of [0.25, 0.55, 0.85]) orb(c, ...at(L * q), 9 * s, glow, 0.55); c.strokeStyle = '#ffffff'; c.globalAlpha *= 0.7; c.lineWidth = 0.9 * s; c.beginPath(); c.moveTo(...g0); c.lineTo(...tip); c.stroke(); c.globalAlpha /= 0.7; }
    a.wbase = g0; return tip;
  }
  const long = kind === 'spear' || kind === 'staff';
  const L = (kind === 'spear' ? 50 : kind === 'staff' ? 44 : 26) * s, back = (long ? 16 : 5) * s;
  const tip = at(L);
  seg(c, ...at(-back), ...tip, (kind === 'club' ? 1.6 : 1.2) * s, (kind === 'club' ? 2 : 1.1) * s, WOOD);
  if (kind === 'axe') {
    const h0 = at(L * 0.66), h1 = at(L * 0.98);
    c.fillStyle = glow ? mix(STEEL, glow, 0.5) : STEEL; c.beginPath(); c.moveTo(...h0); c.quadraticCurveTo(...at(L * 0.6, 11 * s), ...at(L * 0.74, 11.5 * s)); c.quadraticCurveTo(...at(L * 0.84, 8 * s), ...at(L * 1.02, 11 * s)); c.quadraticCurveTo(...at(L * 0.98, 4 * s), ...h1); c.closePath(); c.fill();
    c.strokeStyle = '#eef2f4'; c.lineWidth = 0.9 * s; c.beginPath(); c.moveTo(...at(L * 0.74, 11.5 * s)); c.quadraticCurveTo(...at(L * 0.86, 8.4 * s), ...at(L * 1.02, 11 * s)); c.stroke();
    if (glow) orb(c, ...at(L * 0.84, 6 * s), 12 * s, glow, 0.55);
  } else if (kind === 'club') {
    seg(c, ...at(L * 0.58), ...tip, 2.6 * s, 3.6 * s, '#3a2c20'); c.fillStyle = '#8a8478'; for (const [l, w] of [[0.7, 3], [0.86, -3.4], [0.94, 3.2]]) { c.beginPath(); c.arc(...at(L * l, w * s), 1.1 * s, 0, TAU); c.fill(); }
  } else if (kind === 'spear') {
    poly(c, [...at(L - 9 * s, 0), ...at(L - 6 * s, 2.3 * s), ...at(L + 2 * s), ...at(L - 6 * s, -2.3 * s)], STEEL);
    poly(c, [...at(L - 9 * s, 0), ...at(L - 6 * s, -2.3 * s), ...at(L + 2 * s)], '#8e959c');
  } else if (kind === 'staff') {
    c.strokeStyle = WOOD; c.lineWidth = 1.6 * s; c.lineCap = 'round'; c.beginPath(); c.arc(...at(L + 2.2 * s), 3 * s, ang + 0.6, ang + 4.6); c.stroke();
    if (a.look.glow) { const pulse = 1 + Math.sin(a.t * 5 + a.seed) * 0.16; c.fillStyle = mix(a.look.glow, '#ffffff', 0.5); c.beginPath(); c.arc(...at(L + 2.2 * s), 1.8 * s, 0, TAU); c.fill(); orb(c, ...at(L + 2.2 * s), (7 + (a.st.power ?? 0) * 8) * s * pulse, a.look.glow, 0.8); }
  }
  a.wbase = at(L * 0.5); return long ? at(L + 2.2 * s) : tip;
}

/* ---------- 사람 ---------- */
export function human(c, a) {
  const { look: k, st: p } = a, f = a.face, s = a.sc = k.s * (a.scale ?? 1), b = (k.bulk ?? 1) * (k.thin ? 0.74 : 1);
  const hunch = k.hunch ?? 0, breath = Math.sin(a.t * 2.2 + a.seed) * 0.6 * s;
  const leg = 23 * s, torso = 20 * s;
  const hy = a.y - leg * 2 * (1 - p.crouch * 0.42) * 0.96, hx = a.x + f * (p.lean * 0.12 + p.crouch * 2) * s;
  const f1 = [a.x + f * (4 + p.step * 15) * s, a.y - 1.6 * s], f2 = [a.x - f * (4 + p.spread * 11) * s, a.y - 1.6 * s];
  const la = rad(p.lean + hunch);
  const sx = hx + f * Math.sin(la) * torso, sy = hy - Math.cos(la) * torso + breath;
  const na = la + rad(hunch * 0.8 + (p.nod ?? 0));
  const hdx = sx + f * Math.sin(na) * 9.6 * s, hdy = sy - Math.cos(na) * 9.6 * s;
  const arm = (base, el, l1, l2, ox = 0) => {
    const a1 = rad(base) + la * 0.4, a2 = rad(base + el) + la * 0.4, x0 = sx + f * ox * s, y0 = sy + 1.5 * s;
    const ex = x0 + f * Math.sin(a1) * l1, ey = y0 + Math.cos(a1) * l1;
    return [[x0, y0], [ex, ey], [ex + f * Math.sin(a2) * l2, ey + Math.cos(a2) * l2], a2];
  };
  c.lineCap = 'round'; c.lineJoin = 'round';
  // 빛깔: 몸(옷), 그늘진 뒤쪽, 살, 장식
  const cloth = k.body, shade = mix(cloth, '#0c0b10', 0.48), deep = mix(cloth, '#0c0b10', 0.68);
  const skin = k.skin ?? SKIN, skinS = mix(skin, '#1a1418', 0.42), trim = k.accent ?? mix(cloth, '#d8c8a0', 0.25);
  const bare = !!k.bare, limbC = bare ? skin : cloth, limbS = bare ? skinS : shade, boot = bare ? mix(skin, '#14100e', 0.55) : '#2a2018';
  const robe = !!k.robe, armor = !!k.armor;

  // 망토 (몸 뒤): 달리거나 몸을 숙이면 뒤로 날린다
  if (k.cloak) {
    const drag = clamp((a.vx ?? 0) * f * 0.05, -9, 14) * s, sway = Math.sin(a.t * 2.6 + a.seed) * 2.2 * s + drag - p.lean * 0.16 * s;
    const hemY = a.y - leg * (0.42 + p.crouch * 0.2) - Math.abs(drag) * 0.4, bx = hx - f * (11 * s + sway);
    const cl = mix(trim, '#141018', 0.3);
    c.fillStyle = cl; c.beginPath(); c.moveTo(sx + f * 3 * s, sy - 2 * s);
    c.quadraticCurveTo(sx - f * 7 * s, sy - 3 * s, sx - f * 6.5 * s, sy + 3 * s);
    c.bezierCurveTo(hx - f * (12 * s + sway * 0.5), hy - 8 * s, bx - f * 3 * s, hy + 6 * s, bx - f * (2 * s + sway * 0.6), hemY);
    c.quadraticCurveTo(bx + f * 5 * s, hemY + 3.5 * s, bx + f * 10 * s, hemY - 1.5 * s);
    c.quadraticCurveTo(hx + f * 1 * s, hy + 6 * s, hx + f * 2 * s, hy - 4 * s); c.closePath(); c.fill();
    c.strokeStyle = mix(cl, '#0a0810', 0.45); c.lineWidth = 1.1 * s; c.beginPath(); c.moveTo(sx - f * 4 * s, sy + 6 * s); c.quadraticCurveTo(hx - f * (8 * s + sway * 0.5), hy, bx + f * 3 * s, hemY - 1 * s); c.stroke();
    c.strokeStyle = rgba(a.light ?? '#e8dcc4', a.lit * f < 0 ? 0.34 : 0.1); c.lineWidth = 1 * s; c.beginPath(); c.moveTo(sx - f * 6.5 * s, sy + 3 * s); c.bezierCurveTo(hx - f * (12 * s + sway * 0.5), hy - 8 * s, bx - f * 3 * s, hy + 6 * s, bx - f * (2 * s + sway * 0.6), hemY); c.stroke();
  }
  // 뒷팔과 방패
  const B = arm(p.armB, p.elbB, 10 * s, 9.5 * s, -1.6);
  limb2(c, a, B[0], B[1], B[2], 2.9 * s * b, 2.4 * s * b, 2 * s * b, limbS, 0);
  c.fillStyle = skinS; c.beginPath(); c.arc(B[2][0], B[2][1], 2.1 * s, 0, TAU); c.fill();
  if (k.shield) {
    const [shx, shy] = B[2]; c.save(); c.translate(shx + f * 1.5 * s, shy); c.rotate(f * rad(p.lean * 0.3 - 6));
    c.fillStyle = mix(trim, '#141018', 0.35); c.beginPath(); c.ellipse(0, 0, 5.4 * s, 9.5 * s, 0, 0, TAU); c.fill();
    c.strokeStyle = STEEL_D; c.lineWidth = 1.3 * s; c.beginPath(); c.ellipse(0, 0, 5.4 * s, 9.5 * s, 0, 0, TAU); c.stroke();
    c.fillStyle = '#9aa0a6'; c.beginPath(); c.arc(f * 1 * s, 0, 1.8 * s, 0, TAU); c.fill(); c.restore();
  }
  // 뒷다리
  const k2 = knee(hx, hy, f2[0], f2[1], leg, f), k1 = knee(hx, hy, f1[0], f1[1], leg, f);
  if (!robe) {
    limb2(c, a, [hx - f * 1 * s, hy], k2, f2, 3.9 * s * b, 3 * s * b, 2.3 * s * b, limbS, 0);
    seg(c, lerp(k2[0], f2[0], 0.45), lerp(k2[1], f2[1], 0.45), f2[0], f2[1], 2.9 * s * b, 2.5 * s * b, mix(boot, '#08070a', 0.4));
  }
  poly(c, [f2[0] - f * 2.6 * s, f2[1] + 1.6 * s, f2[0] - f * 2 * s, f2[1] - 2.2 * s, f2[0] + f * 3 * s, f2[1] - 1.6 * s, f2[0] + f * 7 * s, f2[1] + 1.6 * s], mix(boot, '#08070a', 0.4));
  // 앞다리
  if (!robe) {
    limb2(c, a, [hx + f * 1 * s, hy], k1, f1, 4.2 * s * b, 3.3 * s * b, 2.5 * s * b, limbC, 0.8);
    seg(c, lerp(k1[0], f1[0], 0.45), lerp(k1[1], f1[1], 0.45), f1[0], f1[1], 3.1 * s * b, 2.7 * s * b, boot);
    if (armor) seg(c, lerp(k1[0], f1[0], 0.12), lerp(k1[1], f1[1], 0.12), lerp(k1[0], f1[0], 0.5), lerp(k1[1], f1[1], 0.5), 3.3 * s * b, 3 * s * b, STEEL_D);
  }
  poly(c, [f1[0] - f * 2.6 * s, f1[1] + 1.6 * s, f1[0] - f * 2 * s, f1[1] - 2.4 * s, f1[0] + f * 3 * s, f1[1] - 1.8 * s, f1[0] + f * 7.4 * s, f1[1] + 1.6 * s], boot);
  // 몸통: 허리에서 어깨로 넓어지는 면
  const ux = (sx - hx) / torso, uy = (sy - hy) / torso, nx = -uy * f, ny = ux * f; // n: 앞쪽
  const T = (l, w) => [hx + ux * l * s + nx * w * s * b * f * f, hy + uy * l * s + ny * w * s * b];
  const body = () => {
    c.beginPath(); c.moveTo(...T(-2, -4.6)); c.quadraticCurveTo(...T(9, -6.4), ...T(19.5, -6));
    c.quadraticCurveTo(...T(23, -2), ...T(20.5, 5.4)); c.quadraticCurveTo(...T(12, 7.4), ...T(-2, 5)); c.closePath();
  };
  // 옷자락: 겉옷은 허벅지까지, 로브는 발목까지
  const hem = robe ? 0.9 : k.thin || bare ? 0.2 : 0.5;
  if (hem > 0.25) {
    const sw = Math.sin(a.t * 3 + a.seed) * 1.2 * s - clamp((a.vx ?? 0) * f * 0.03, -4, 6) * s;
    const hf = robe ? [lerp(hx, f1[0], 0.92) + f * 3 * s, lerp(hy, a.y, hem)] : [lerp(hx, k1[0], hem) + f * 4.4 * s * b, lerp(hy, k1[1], hem) + 3 * s];
    const hb = robe ? [lerp(hx, f2[0], 0.92) - f * 4 * s + f * -sw, lerp(hy, a.y, hem)] : [lerp(hx, k2[0], hem) - f * 4.8 * s * b - f * sw, lerp(hy, k2[1], hem) + 3 * s];
    c.fillStyle = robe ? cloth : mix(cloth, '#0c0b10', 0.16); c.beginPath(); c.moveTo(...T(1, -4.8)); c.quadraticCurveTo(hb[0] - f * 2 * s, lerp(hy, hb[1], 0.5), hb[0], hb[1]);
    c.quadraticCurveTo(lerp(hb[0], hf[0], 0.5), Math.max(hb[1], hf[1]) + 2.4 * s, hf[0], hf[1]); c.quadraticCurveTo(hf[0] + f * 1 * s, lerp(hy, hf[1], 0.5), ...T(1, 5.2)); c.closePath(); c.fill();
    c.strokeStyle = shade; c.lineWidth = 1 * s; for (const q of robe ? [0.3, 0.55, 0.8] : [0.5]) { c.beginPath(); c.moveTo(...T(0, lerp(-4, 5, q))); c.lineTo(lerp(hb[0], hf[0], q), lerp(hb[1], hf[1], q) + 1 * s); c.stroke(); }
    if (robe) { c.strokeStyle = trim; c.lineWidth = 1.5 * s; c.beginPath(); c.moveTo(hb[0], hb[1]); c.quadraticCurveTo(lerp(hb[0], hf[0], 0.5), Math.max(hb[1], hf[1]) + 2.4 * s, hf[0], hf[1]); c.stroke(); }
  }
  c.fillStyle = bare && !armor ? skin : cloth; body(); c.fill();
  // 등 쪽 그늘과 가슴 쪽 빛
  c.save(); body(); c.clip();
  c.fillStyle = rgba('#0a0810', 0.34); c.beginPath(); c.moveTo(...T(-3, -8)); c.lineTo(...T(-3, a.lit * f > 0 ? -1.5 : 8)); c.lineTo(...T(24, a.lit * f > 0 ? -3 : 8)); c.lineTo(...T(24, -8)); c.closePath();
  if (a.lit * f > 0) c.fill(); else { c.beginPath(); c.moveTo(...T(-3, 8)); c.lineTo(...T(-3, 1.5)); c.lineTo(...T(24, 3)); c.lineTo(...T(24, 8)); c.closePath(); c.fill(); }
  if (armor) { c.fillStyle = rgba(STEEL, 0.5); c.beginPath(); c.moveTo(...T(8, -7)); c.lineTo(...T(8, 8)); c.lineTo(...T(21, 8)); c.lineTo(...T(21, -7)); c.closePath(); c.fill(); c.fillStyle = rgba('#ffffff', 0.16); c.beginPath(); c.ellipse(...T(15, a.lit * f * 3), 2.2 * s, 5 * s, la * f, 0, TAU); c.fill(); }
  else if (!bare || k.hoodie) { c.strokeStyle = shade; c.lineWidth = 0.9 * s; c.beginPath(); c.moveTo(...T(19, 1)); c.quadraticCurveTo(...T(10, 3), ...T(1, 1.5)); c.stroke(); }
  c.restore();
  // 허리띠와 장식
  c.strokeStyle = bare ? mix(cloth, '#0c0b10', 0.2) : mix(trim, '#141018', 0.2); c.lineWidth = 2.6 * s; c.beginPath(); c.moveTo(...T(0.5, -4.7)); c.lineTo(...T(0.5, 5.1)); c.stroke();
  if (bare) { poly(c, [...T(0, -4.8), ...T(0, 5.2), lerp(hx, k1[0], 0.34) + f * 4 * s, lerp(hy, k1[1], 0.34) + 2 * s, lerp(hx, k2[0], 0.34) - f * 4 * s, lerp(hy, k2[1], 0.34) + 2 * s], cloth); }
  c.fillStyle = '#b8a060'; c.beginPath(); c.arc(...T(0.5, 4), 1.2 * s, 0, TAU); c.fill();
  { const l0 = T(-1, a.lit * f * 5.2), l1 = T(20, a.lit * f * 5.8); c.strokeStyle = rgba(a.light ?? '#e8dcc4', 0.4); c.lineWidth = 1.1 * s; c.beginPath(); c.moveTo(...l0); c.lineTo(...l1); c.stroke(); }
  // 목과 머리
  const hr = 5.7 * s, face = k.hood && !k.skin ? mix(skin, '#0c0a10', 0.5) : skin;
  seg(c, sx, sy - 1 * s, lerp(sx, hdx, 0.6), lerp(sy, hdy, 0.6), 2.3 * s * b, 2 * s, bare || !k.hood ? mix(face, '#1a1418', 0.3) : shade);
  c.save(); c.translate(hdx, hdy); c.rotate(f * (na * 0.5)); c.scale(f, 1);
  // (여기부터 오른쪽을 보는 머리)
  c.fillStyle = face; c.beginPath(); c.ellipse(0, 0, hr * 0.92, hr * 1.06, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(hr * 0.7, -hr * 0.2); c.lineTo(hr * 1.2, hr * 0.22); c.lineTo(hr * 0.74, hr * 0.44); c.lineTo(hr * 0.6, hr * 0.96); c.lineTo(0, hr * 0.9); c.closePath(); c.fill(); // 코와 턱
  c.fillStyle = rgba('#0a0810', 0.3); c.beginPath(); c.ellipse(-hr * 0.5, hr * 0.1, hr * 0.6, hr * 1.02, 0, 0, TAU); c.fill(); // 뒤통수 쪽 그늘
  if (k.ears) poly(c, [-hr * 0.2, -hr * 0.2, -hr * 1.9, -hr * 0.9, -hr * 0.3, hr * 0.4], face);
  if (k.tusk) { poly(c, [hr * 0.66, hr * 0.62, hr * 0.86, hr * 0.05, hr * 0.46, hr * 0.56], '#e8e0c8'); c.fillStyle = face; c.fillRect(hr * 0.2, hr * 0.5, hr * 0.7, hr * 0.5); }
  if (k.snout) poly(c, [hr * 0.5, -hr * 0.3, hr * 1.9, hr * 0.2, hr * 0.5, hr * 0.7], face);
  if (k.eye) { c.fillStyle = k.eye; c.beginPath(); c.arc(hr * 0.42, -hr * 0.12, 0.9 * Math.max(1, s * 0.7), 0, TAU); c.fill(); }
  if (k.hood) {
    c.fillStyle = k.accent ?? cloth; c.beginPath(); c.moveTo(hr * 0.5, hr * 1.2); c.quadraticCurveTo(hr * 0.2, hr * 0.2, hr * 0.62, -hr * 0.76);
    c.quadraticCurveTo(-hr * 0.4, -hr * 1.7, -hr * 1.36, -hr * 0.3); c.quadraticCurveTo(-hr * 1.5, hr * 0.9, -hr * 0.9, hr * 1.5); c.closePath(); c.fill();
    c.strokeStyle = rgba('#0a0810', 0.4); c.lineWidth = 0.9 * s; c.beginPath(); c.moveTo(hr * 0.4, hr * 1); c.quadraticCurveTo(hr * 0.1, hr * 0.2, hr * 0.5, -hr * 0.6); c.stroke();
  } else if (k.helm) {
    c.fillStyle = STEEL_D; c.beginPath(); c.arc(0, -hr * 0.12, hr * 1.1, Math.PI * 0.96, Math.PI * 2.04); c.lineTo(hr * 1.1, hr * 0.12); c.lineTo(hr * 0.5, hr * 0.02); c.lineTo(-hr * 0.5, hr * 0.02); c.lineTo(-hr * 1.2, hr * 0.86); c.lineTo(-hr * 1.1, -hr * 0.1); c.closePath(); c.fill();
    c.fillRect(hr * 0.6, -hr * 0.1, hr * 0.26, hr * 0.74); // 코가리개
    c.strokeStyle = rgba('#ffffff', 0.4); c.lineWidth = 0.9 * s; c.beginPath(); c.arc(0, -hr * 0.12, hr * 0.9, Math.PI * 1.25, Math.PI * 1.7); c.stroke();
    if (k.accent) { c.fillStyle = k.accent; c.beginPath(); c.moveTo(-hr * 0.2, -hr * 1.2); c.quadraticCurveTo(-hr * 1.6, -hr * 1.8, -hr * 1.9, -hr * 0.2 + Math.sin(a.t * 4 + a.seed) * hr * 0.2); c.quadraticCurveTo(-hr * 1.2, -hr * 0.9, -hr * 0.5, -hr * 1.05); c.closePath(); c.fill(); }
  } else if (!k.bald) {
    c.fillStyle = k.hair ?? '#2a2018'; c.beginPath(); c.moveTo(hr * 0.74, -hr * 0.44); c.quadraticCurveTo(hr * 0.5, -hr * 1.3, -hr * 0.3, -hr * 1.16);
    c.quadraticCurveTo(-hr * 1.3, -hr * 0.9, -hr * 1.12, hr * 0.3); c.quadraticCurveTo(-hr * 1.1, hr * (k.long ? 1.9 : 0.9), -hr * 0.5, hr * (k.long ? 1.7 : 0.7)); c.quadraticCurveTo(-hr * 0.2, -hr * 0.3, hr * 0.74, -hr * 0.44); c.closePath(); c.fill();
  }
  c.restore();
  { const an0 = a.lit > 0 ? -1.1 : Math.PI - 0.5, an1 = a.lit > 0 ? 0.5 : Math.PI + 1.1; c.strokeStyle = rgba(a.light ?? '#e8dcc4', 0.5); c.lineWidth = 1.1 * s; c.beginPath(); c.arc(hdx, hdy, hr * 1.02, an0, an1); c.stroke(); }
  // 무기와 앞팔
  const A = arm(p.armA, p.elbow, 10.5 * s, 10 * s, 1.6);
  const tip = weapon(c, a, k.weapon, A[2][0], A[2][1], A[3] + rad(p.wpn), f, s);
  limb2(c, a, A[0], A[1], A[2], 3.2 * s * b, 2.7 * s * b, 2.2 * s * b, limbC, 1);
  if (armor) { seg(c, lerp(A[1][0], A[2][0], 0.2), lerp(A[1][1], A[2][1], 0.2), lerp(A[1][0], A[2][0], 0.86), lerp(A[1][1], A[2][1], 0.86), 2.9 * s * b, 2.6 * s * b, STEEL_D); c.fillStyle = mix(STEEL, cloth, 0.3); c.beginPath(); c.ellipse(A[0][0], A[0][1] - 0.6 * s, 4.6 * s * b, 3.6 * s * b, f * la, 0, TAU); c.fill(); c.strokeStyle = rgba('#ffffff', 0.4); c.lineWidth = 0.9 * s; c.beginPath(); c.arc(A[0][0], A[0][1] - 0.6 * s, 3.6 * s * b, Math.PI * 1.1, Math.PI * 1.8); c.stroke(); }
  c.fillStyle = skin; c.beginPath(); c.arc(A[2][0], A[2][1], 2.3 * s, 0, TAU); c.fill();
  a.tip = tip ?? A[2]; a.wbase ??= A[2]; if (!tip) a.wbase = A[2];
  a.hand = B[2]; a.chest = [lerp(hx, sx, 0.62), lerp(hy, sy, 0.62)]; a.head = [hdx, hdy]; a.foot = f1;
}

/* ---------- 네발짐승: 늑대·곰·쥐·와이번·하수도 괴물 ---------- */
const KIND = {
  wolf: { len: 21, deep: 8.4, neck: 9, head: 7.4, snout: 9, ear: 6, tail: 'brush', legs: 17 },
  bear: { len: 20, deep: 11.5, neck: 6, head: 7.6, snout: 6.5, ear: 2.6, tail: 'stub', legs: 13, hump: 4 },
  rat: { len: 17, deep: 7.6, neck: 5, head: 6.4, snout: 8, ear: 3.6, tail: 'whip', legs: 8 },
  wyvern: { len: 20, deep: 8, neck: 17, head: 7, snout: 11, ear: 0, tail: 'long', legs: 15, horn: 5 },
  horror: { len: 22, deep: 11, neck: 5, head: 9, snout: 8, ear: 0, tail: 'long', legs: 11, hump: 5, spines: true },
};
export function beast(c, a) {
  const k = a.look, p = a.st, f = a.face, s = a.sc = k.s * (a.scale ?? 1), b = k.bulk ?? 1, K = KIND[k.kind] ?? KIND.wolf;
  const lunge = p.lunge ?? 0, rear = p.rear ?? 0, gaitA = p.gait ?? 0, bite = p.bite ?? 0;
  const stand = (K.legs - p.crouch * 5 + rear * 5) * s;
  const bx = a.x + f * lunge * 10 * s, by = a.y - stand - K.deep * 0.4 * s * b;
  const ph = a.t * 10 + a.seed, breath = Math.sin(a.t * 3 + a.seed) * 0.5 * s;
  const fur = k.body, dark = mix(fur, '#08070c', 0.55), belly = mix(fur, '#0a0810', 0.3), light = a.light ?? '#e8dcc4';
  c.lineCap = 'round'; c.lineJoin = 'round';
  // 몸을 기울인 자리에서의 점: 몸 앞쪽이 +
  const tilt = -f * rad(rear * 24 - lunge * 5), ct = Math.cos(tilt), sn = Math.sin(tilt);
  const P = (lx, ly) => { const x = f * lx * s, y = ly * s; return [bx + x * ct - y * sn, by + x * sn + y * ct]; };
  const legAt = (lx, sw, back, far) => {
    const top = P(lx, K.deep * 0.2 * b), reach = (sw * 8 + (back ? -lunge * 9 - rear * 2 : lunge * 10 + rear * 7)) * s;
    const fx = top[0] + f * reach, fy = a.y - (back ? 0 : rear * 12 * s) - Math.max(0, Math.sin(ph + lx) * gaitA) * 2.4 * s;
    const mid = [lerp(top[0], fx, 0.5) + f * (back ? -3.4 : 2) * s, lerp(top[1], fy, 0.56)];
    const col = far ? dark : fur;
    seg(c, top[0], top[1], mid[0], mid[1], (back ? 4.4 : 3.6) * s * b, 2.3 * s * b, col); seg(c, mid[0], mid[1], fx, fy - 1.2 * s, 2.3 * s * b, 1.7 * s * b, col);
    poly(c, [fx - f * 2 * s, fy, fx - f * 1.6 * s, fy - 2.4 * s, fx + f * 3.6 * s, fy - 1.4 * s, fx + f * 4.4 * s, fy], far ? dark : mix(fur, '#0a0810', 0.25));
    if (!far) rim(c, a, top[0], top[1], mid[0], mid[1], 4 * s * b, 2.3 * s * b, 0.7);
  };
  const g = Math.sin(ph) * gaitA;
  legAt(-K.len * 0.62, -g, true, true); legAt(K.len * 0.5, g, false, true);
  // 꼬리
  { const t0 = P(-K.len * 0.92, -K.deep * 0.3), wag = Math.sin(a.t * 5 + a.seed) * 2.4;
    if (K.tail === 'brush') { const t1 = P(-K.len * 1.5, -K.deep * 0.1 + wag - lunge * 6), t2 = P(-K.len * 1.74, K.deep * 0.5 + wag - lunge * 10); seg(c, t0[0], t0[1], t1[0], t1[1], 2.4 * s, 3.2 * s, fur); seg(c, t1[0], t1[1], t2[0], t2[1], 3.2 * s, 1.2 * s, fur); }
    else if (K.tail === 'stub') { c.fillStyle = fur; c.beginPath(); c.arc(t0[0], t0[1], 2.4 * s * b, 0, TAU); c.fill(); }
    else { c.strokeStyle = K.tail === 'whip' ? mix(fur, '#c09080', 0.4) : fur; c.lineWidth = (K.tail === 'whip' ? 1.3 : 4) * s; c.beginPath(); c.moveTo(t0[0], t0[1]); const t1 = P(-K.len * 1.6, K.deep * 0.2 + wag), t2 = P(-K.len * 2.2, -K.deep * 0.2 - wag * 1.4); c.quadraticCurveTo(t1[0], t1[1], t2[0], t2[1]); c.stroke(); if (K.tail === 'long') { c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(t2[0], t2[1]); c.lineTo(...P(-K.len * 2.5, -K.deep * 0.5 - wag * 2)); c.stroke(); } } }
  // 날개 (와이번)
  if (k.wings) {
    const flap = Math.sin(a.t * 4 + a.seed) * 7 + rear * 10 + lunge * -6, r0 = P(K.len * 0.2, -K.deep * 0.6);
    const w1 = P(-K.len * 0.5, -(30 + flap)), w2 = P(-K.len * 2.1, -(22 + flap * 1.3)), w3 = P(-K.len * 1.5, -6 - flap * 0.3), w4 = P(-K.len * 1.1, 2), m1 = P(-K.len * 1.3, -(14 + flap * 0.8));
    c.fillStyle = mix(fur, '#0a0810', 0.3); c.beginPath(); c.moveTo(...r0); c.lineTo(...w1); c.lineTo(...w2); c.quadraticCurveTo(...m1, ...w3); c.quadraticCurveTo(...P(-K.len * 1.1, -6), ...w4); c.quadraticCurveTo(...P(-K.len * 0.5, -2), ...P(-K.len * 0.3, -K.deep * 0.2)); c.closePath(); c.fill();
    c.strokeStyle = fur; c.lineWidth = 2 * s; c.beginPath(); c.moveTo(...r0); c.lineTo(...w1); c.lineTo(...w2); c.moveTo(...w1); c.lineTo(...w3); c.moveTo(...w1); c.lineTo(...w4); c.stroke();
    c.strokeStyle = rgba(light, 0.3); c.lineWidth = 1 * s; c.beginPath(); c.moveTo(...w1); c.lineTo(...w2); c.stroke();
  }
  // 몸: 가슴이 깊고 배가 들어간다
  const D = K.deep * b, hump = (K.hump ?? 0) * b;
  c.fillStyle = fur; c.beginPath(); c.moveTo(...P(-K.len, -D * 0.2));
  c.bezierCurveTo(...P(-K.len * 0.9, -D * 0.95), ...P(-K.len * 0.2, -D * 0.8 - breath / s), ...P(K.len * 0.3, -D * 0.9 - hump));
  c.bezierCurveTo(...P(K.len * 0.8, -D * 1.0 - hump * 0.5), ...P(K.len * 1.05, -D * 0.5), ...P(K.len * 1.0, D * 0.1));
  c.bezierCurveTo(...P(K.len * 0.9, D * 0.9), ...P(K.len * 0.3, D * 0.86), ...P(-K.len * 0.1, D * 0.5));
  c.bezierCurveTo(...P(-K.len * 0.5, D * 0.3), ...P(-K.len * 0.9, D * 0.7), ...P(-K.len, -D * 0.2)); c.closePath(); c.fill();
  c.save(); c.clip(); c.fillStyle = rgba('#08070c', 0.34); c.beginPath(); c.moveTo(...P(-K.len * 1.2, D * 0.1)); c.quadraticCurveTo(...P(0, D * 0.5), ...P(K.len * 1.2, D * 0.2)); c.lineTo(...P(K.len * 1.2, D * 1.4)); c.lineTo(...P(-K.len * 1.2, D * 1.4)); c.closePath(); c.fill();
  if (k.glow) { c.strokeStyle = rgba(k.glow, 0.6 + Math.sin(a.t * 3) * 0.2); c.lineWidth = 1.2 * s; for (const q of [-0.4, 0.1, 0.55]) { c.beginPath(); c.moveTo(...P(K.len * q, -D * 0.9)); c.lineTo(...P(K.len * (q + 0.1), -D * 0.1)); c.lineTo(...P(K.len * (q - 0.04), D * 0.4)); c.stroke(); } }
  c.restore();
  if (K.spines || k.mane) { c.fillStyle = K.spines ? dark : mix(fur, '#0a0810', 0.35); for (let i = 0; i < (K.spines ? 7 : 5); i++) { const q = K.spines ? lerp(-0.8, 0.8, i / 6) : lerp(0.2, 0.95, i / 4), h = (K.spines ? 5 + (i % 2) * 2 : 3.4) * s; const p0 = P(K.len * q - 2, -D * 0.84 - hump * (q > 0 ? 0.8 : 0)), p1 = P(K.len * q + 2, -D * 0.84 - hump * (q > 0 ? 0.8 : 0)), p2 = P(K.len * q - 2, -D * 0.84 - hump - h / s); poly(c, [...p0, ...p1, ...p2], c.fillStyle); } }
  // 등줄기 빛
  { c.strokeStyle = rgba(light, 0.4); c.lineWidth = 1.1 * s; c.beginPath(); c.moveTo(...P(-K.len * 0.86, -D * 0.74)); c.bezierCurveTo(...P(-K.len * 0.3, -D * 0.84), ...P(K.len * 0.2, -D * 0.9 - hump), ...P(K.len * 0.74, -D * 0.9 - hump * 0.6)); c.stroke(); }
  // 목과 머리
  const n0 = P(K.len * 0.82, -D * 0.5), up = (k.kind === 'wyvern' ? -1 : -0.5) + rear * -0.2 + lunge * 0.4 + p.crouch * 0.3;
  const hd = [n0[0] + f * (K.neck * Math.cos(up * 0.9) + lunge * 5) * s, n0[1] + K.neck * Math.sin(up * 0.9) * s];
  seg(c, n0[0], n0[1], hd[0], hd[1], (k.kind === 'wyvern' ? 4.6 : 6.6) * s * b, (k.kind === 'wyvern' ? 3.4 : 5) * s * b, fur);
  if (k.kind === 'wolf') { c.fillStyle = mix(fur, '#0a0810', 0.2); for (let i = 0; i < 4; i++) { const q = i / 3, px = lerp(n0[0], hd[0], q), py = lerp(n0[1], hd[1], q) + 4 * s; poly(c, [px - f * 2 * s, py - 2 * s, px + f * 2 * s, py - 2 * s, px - f * 1.6 * s, py + 4.4 * s], c.fillStyle); } }
  c.save(); c.translate(hd[0], hd[1]); c.rotate(f * (0.24 + lunge * 0.1 - rear * 0.3 + p.crouch * 0.2)); c.scale(f, 1);
  const H = K.head * s * Math.sqrt(b), SN = K.snout * s;
  c.fillStyle = fur; c.beginPath(); c.ellipse(0, 0, H * 0.84, H * 0.72, 0, 0, TAU); c.fill();
  // 윗주둥이와 아래턱 (물 때 벌어진다)
  c.beginPath(); c.moveTo(H * 0.3, -H * 0.56); c.lineTo(H * 0.5 + SN, -H * 0.12 - bite * 2 * s); c.lineTo(H * 0.5 + SN, H * 0.16 - bite * 2 * s); c.lineTo(H * 0.3, H * 0.3); c.closePath(); c.fill();
  c.fillStyle = mix(fur, '#0a0810', 0.3); c.beginPath(); c.moveTo(H * 0.1, H * 0.3); c.lineTo(H * 0.4 + SN * 0.86, H * (0.34 + bite * 0.7)); c.lineTo(H * 0.3 + SN * 0.5, H * (0.62 + bite * 0.7)); c.lineTo(-H * 0.1, H * 0.66); c.closePath(); c.fill();
  if (bite > 0.2) { c.fillStyle = '#e8e2d0'; for (const q of [0.5, 0.72, 0.92]) { poly(c, [H * 0.4 + SN * q - 1 * s, H * 0.16 - bite * 2 * s, H * 0.4 + SN * q + 1 * s, H * 0.16 - bite * 2 * s, H * 0.4 + SN * q, H * 0.16 - bite * 2 * s + 2.6 * s], '#e8e2d0'); } }
  c.fillStyle = '#0a0810'; c.beginPath(); c.arc(H * 0.5 + SN, -H * 0.02 - bite * 2 * s, 1.1 * s, 0, TAU); c.fill();
  if (K.ear) { poly(c, [-H * 0.5, -H * 0.4, -H * 0.5 - K.ear * 0.2 * s, -H * 0.5 - K.ear * s, H * 0.06, -H * 0.62], fur); poly(c, [-H * 0.3, -H * 0.5, -H * 0.4, -H * 0.5 - K.ear * 0.7 * s, -H * 0.02, -H * 0.62], dark); }
  if (K.horn) { c.strokeStyle = '#d8d0b8'; c.lineWidth = 1.6 * s; c.beginPath(); c.moveTo(-H * 0.3, -H * 0.5); c.quadraticCurveTo(-H * 1.1, -H * 0.9, -H * 1.5, -H * 0.3); c.stroke(); }
  if (k.eye) { c.fillStyle = k.eye; c.beginPath(); c.ellipse(H * 0.32, -H * 0.2, 1.3 * Math.max(1, s * 0.7), 0.9 * Math.max(1, s * 0.7), 0.3, 0, TAU); c.fill(); }
  c.strokeStyle = rgba(light, 0.36); c.lineWidth = 1 * s; c.beginPath(); c.moveTo(-H * 0.3, -H * 0.66); c.lineTo(H * 0.3, -H * 0.58); c.lineTo(H * 0.5 + SN * 0.9, -H * 0.16 - bite * 2 * s); c.stroke();
  c.restore();
  if (k.eye) orb(c, hd[0] + f * H * 0.3, hd[1] - H * 0.1, 5 * s, k.eye, 0.3);
  legAt(-K.len * 0.5, g, true, false); legAt(K.len * 0.66, -g, false, false);
  a.tip = [hd[0] + f * (H * 0.5 + SN), hd[1] + 1 * s]; a.chest = [bx + f * K.len * 0.3 * s, by]; a.head = hd; a.wbase = hd;
}

/* ---------- 거미 ---------- */
export function spider(c, a) {
  const k = a.look, p = a.st, f = a.face, s = a.sc = k.s * (a.scale ?? 1), light = a.light ?? '#e8dcc4';
  const bx = a.x + f * (p.lunge ?? 0) * 12 * s, by = a.y - (14 - p.crouch * 5 + (p.rear ?? 0) * 7) * s;
  const dark = mix(k.body, '#08070c', 0.5);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const legs = (far) => { for (let n = 0; n < 4; n++) {
    const side = far ? -1 : 1, w = Math.sin(a.t * 10 + n * 1.7 + (far ? 2 : 0) + a.seed) * (p.gait ?? 0) * 3 * s, spread = (n - 1.3) * 9 * s;
    const fx = bx + f * (spread * 1.5 + 6 * s) + w + side * 3 * s, fy = a.y, kx = bx + f * (spread * 0.9 + 3 * s) + side * 2 * s, ky = by - (15 + (n % 2) * 4 + (n === 3 ? (p.rear ?? 0) * 10 : 0)) * s;
    const col = far ? dark : mix(k.body, '#0a0810', 0.2);
    seg(c, bx + f * 3 * s, by, kx, ky, 2.2 * s, 1.5 * s, col); seg(c, kx, ky, n === 3 && (p.rear ?? 0) > 0.3 ? fx + f * 6 * s : fx, n === 3 ? fy - (p.rear ?? 0) * 16 * s : fy, 1.5 * s, 0.7 * s, col);
    if (!far) rim(c, a, kx, ky, fx, fy, 1.5 * s, 0.7 * s, 0.6);
  } };
  legs(true);
  c.fillStyle = k.body; c.beginPath(); c.ellipse(bx - f * 10 * s, by - 3 * s, 13 * s, 10 * s, f * -0.2, 0, TAU); c.fill();
  c.fillStyle = rgba('#08070c', 0.36); c.beginPath(); c.ellipse(bx - f * 10 * s, by + 1 * s, 12 * s, 6.5 * s, f * -0.2, 0, Math.PI); c.fill();
  if (k.mark) { c.fillStyle = k.mark; poly(c, [bx - f * 12 * s, by - 9 * s, bx - f * 8 * s, by - 5 * s, bx - f * 12 * s, by - 1 * s, bx - f * 16 * s, by - 5 * s], k.mark); }
  c.strokeStyle = rgba(light, 0.4); c.lineWidth = 1.1 * s; c.beginPath(); c.ellipse(bx - f * 10 * s, by - 3 * s, 12.4 * s, 9.4 * s, f * -0.2, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  c.fillStyle = mix(k.body, '#0a0810', 0.15); c.beginPath(); c.ellipse(bx + f * 6 * s, by, 7.4 * s, 6 * s, 0, 0, TAU); c.fill();
  c.strokeStyle = dark; c.lineWidth = 1.6 * s; for (const d of [-1, 1]) { c.beginPath(); c.moveTo(bx + f * 11 * s, by + 2 * s); c.quadraticCurveTo(bx + f * 15 * s, by + (2 + d * 2) * s, bx + f * 14 * s, by + (6 + (p.bite ?? 0) * 2) * s); c.stroke(); }
  c.fillStyle = k.eye ?? '#c05a4a'; for (const [ex, ey] of [[10, -2.4], [12, -0.4], [8.4, -0.6], [10.6, 0.8]]) { c.beginPath(); c.arc(bx + f * ex * s, by + ey * s, 0.8 * Math.max(1, s * 0.8), 0, TAU); c.fill(); }
  legs(false);
  a.tip = [bx + f * 16 * s, by + 3 * s]; a.chest = [bx, by - 2 * s]; a.head = [bx + f * 8 * s, by]; a.wbase = a.head;
}

/* ---------- 망령 ---------- */
export function wraith(c, a) {
  const k = a.look, p = a.st, f = a.face, s = a.sc = k.s * (a.scale ?? 1);
  const bob = Math.sin(a.t * 1.8 + a.seed) * 3 * s, x = a.x + f * (p.lunge ?? 0) * 16 * s, top = a.y - 66 * s + bob - (p.rear ?? 0) * 6;
  const base = a.y - 4 * s + bob;
  c.save(); c.globalAlpha *= 0.9;
  const g = c.createLinearGradient(0, top, 0, base); g.addColorStop(0, mix(k.body, '#0a0c14', 0.2)); g.addColorStop(0.6, k.body); g.addColorStop(1, rgba(k.body, 0));
  c.fillStyle = g; c.beginPath(); c.moveTo(x + f * 2 * s, top);
  c.bezierCurveTo(x + f * 12 * s, top + 2 * s, x + f * 10 * s, top + 20 * s, x + f * 13 * s, top + 34 * s);
  c.quadraticCurveTo(x + f * 16 * s, base - 12 * s, x + f * 12 * s, base);
  for (let i = 0; i <= 6; i++) { const xx = x + f * (12 - i * 5.4) * s, w = Math.sin(a.t * 4 + i * 1.3 + a.seed) * 3 * s; c.lineTo(xx, base - (i % 2 ? 0 : 9) * s + w); }
  c.bezierCurveTo(x - f * 22 * s, top + 34 * s, x - f * 12 * s, top + 4 * s, x + f * 2 * s, top); c.fill();
  // 두건 속 어둠
  c.fillStyle = '#07080c'; c.beginPath(); c.ellipse(x + f * 4.6 * s, top + 11 * s, 4.4 * s, 6.4 * s, f * 0.2, 0, TAU); c.fill();
  // 뻗은 팔과 손가락
  const l = p.lunge ?? 0, hx = x + f * (26 + l * 10) * s, hy = top + (31 - l * 8) * s;
  c.strokeStyle = k.body; c.lineCap = 'round'; c.lineWidth = 4.4 * s; c.beginPath(); c.moveTo(x + f * 7 * s, top + 22 * s); c.quadraticCurveTo(x + f * 20 * s, top + (20 - l * 6) * s, hx, hy); c.stroke();
  c.strokeStyle = mix(k.body, k.eye ?? '#ffffff', 0.4); c.lineWidth = 1 * s; for (const d of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + f * 6 * s * Math.cos(d), hy + 6 * s * Math.sin(d) + 2 * s); c.stroke(); }
  c.strokeStyle = rgba(a.light ?? '#e8dcc4', 0.3); c.lineWidth = 1 * s; c.beginPath(); c.moveTo(x + f * 2 * s, top); c.bezierCurveTo(x - f * 12 * s, top + 4 * s, x - f * 22 * s, top + 34 * s, x - f * 20 * s, base - 9 * s); if (a.lit * f < 0) c.stroke();
  c.restore();
  orb(c, x + f * 4.6 * s, top + 10 * s, 11 * s, k.eye, 0.5);
  c.fillStyle = mix(k.eye, '#ffffff', 0.5); c.beginPath(); c.arc(x + f * 3.4 * s, top + 10 * s, 1.1 * Math.max(1, s * 0.7), 0, TAU); c.arc(x + f * 6.8 * s, top + 10.4 * s, 1.1 * Math.max(1, s * 0.7), 0, TAU); c.fill();
  a.tip = [hx + f * 5 * s, hy]; a.chest = [x, top + 30 * s]; a.head = [x + f * 4 * s, top + 10 * s]; a.wbase = [hx, hy];
}

const FORMS = { human, beast, spider, wraith };
/** 한 명(한 마리)을 그린다. 쓰러짐·흩어짐과 발밑 그림자, 칼이 지나간 자국까지 */
export function drawActor(c, a) {
  if (a.st.alpha <= 0.01) return;
  c.save(); c.globalAlpha = clamp(a.st.alpha);
  const fl = a.st.fall, S0 = a.look.s * (a.scale ?? 1), wide = a.look.form === 'human' ? 15 : a.look.form === 'wraith' ? 11 : 26;
  // 발밑 그림자
  c.fillStyle = `rgba(6,5,8,${a.look.form === 'wraith' ? 0.2 : 0.42})`; c.beginPath(); c.ellipse(a.x - a.lit * 3 * S0, a.y + 1.5, wide * S0 * (1 + fl * 0.9), 3.4 * S0, 0, 0, TAU); c.fill();
  if (fl > 0.001) {
    c.translate(a.x, a.y);
    if (a.look.form === 'human') { c.rotate(-a.face * rad(fl * 84)); c.translate(0, fl * 5 * S0); } // 사람은 뒤로 넘어간다
    else if (a.look.form === 'wraith') { c.globalAlpha *= 1 - fl; c.scale(1 - fl * 0.3, 1 + fl * 0.4); } // 망령은 흩어진다
    else { c.rotate(a.face * rad(fl * 8)); c.scale(1, 1 - fl * 0.42); } // 짐승은 옆으로 눕는다
    c.translate(-a.x, -a.y);
  }
  a.wbase = null;
  (FORMS[a.look.form] ?? human)(c, a);
  c.restore();
}

/** 칼끝이 지나간 자리: 빠르게 휘두를 때만 남는 얇은 빛의 띠. 그리기 전에 자리를 적고, 몸 위에 그린다 */
export function trail(c, a, now) {
  const tr = (a.trail ??= []);
  if (a.tip && a.wbase && a.st.alpha > 0.5 && !a.out) {
    const last = tr[tr.length - 1];
    if (!last || now - last.t > 0.006) tr.push({ t: now, bx: lerp(a.wbase[0], a.tip[0], 0.35), by: lerp(a.wbase[1], a.tip[1], 0.35), tx: a.tip[0], ty: a.tip[1] });
  }
  while (tr.length && now - tr[0].t > 0.16) tr.shift();
  if (!a.swing || tr.length < 3) return;
  const col = a.blade ?? '#f4eedc';
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 1; i < tr.length; i++) {
    const p0 = tr[i - 1], p1 = tr[i], sp = Math.hypot(p1.tx - p0.tx, p1.ty - p0.ty);
    if (sp < 1.2) continue;
    const age = clamp(1 - (now - p1.t) / 0.16);
    c.globalAlpha = age * age * (a.blade ? 0.75 : 0.5); c.fillStyle = col;
    c.beginPath(); c.moveTo(p0.bx, p0.by); c.lineTo(p0.tx, p0.ty); c.lineTo(p1.tx, p1.ty); c.lineTo(p1.bx, p1.by); c.closePath(); c.fill();
  }
  c.restore();
}
