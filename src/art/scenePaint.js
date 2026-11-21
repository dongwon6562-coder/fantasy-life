// 그림 마무리 (29단계): 다 그린 풍경·삽화 위에 한 번 얹는 붓맛.
//   paintFinish(ctx, w, h, S, { hz, land }) — ctx는 변환 없이(픽셀 좌표) 넘긴다.
//   ① 공기 원근: 지평선 가까운 것일수록 하늘빛에 묻히고 빛깔이 바랜다.
//   ② 빛 번짐: 밝은 곳(창 불빛, 해, 문간의 등)이 둘레로 번진다. 밤일수록 세다.
//   ③ 물감 얼룩: 큰 붓으로 문지른 듯 따뜻한 빛과 찬 빛이 넓게 얼룩진다.
//   ④ 붓 자국: 짧은 붓질 결이 화면 전체에 옅게 남는다.
//   ⑤ 가장자리가 조금 어두워진다(옛 그림 액자처럼).
// 작은 캔버스로 줄였다 늘려 번지게 하므로 폰에서도 몇 ms면 끝난다. 결 무늬는 한 번 만들어 두고 다시 쓴다.
import { rng, rgba, clamp } from './sceneKit.js';

const hasDom = typeof document !== 'undefined';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

/* ---------- 붓 자국 무늬 (한 번만) ---------- */
let strokeTile = null;
function strokes() {
  if (strokeTile) return strokeTile;
  const T = 220, c = mk(T, T), x = c.getContext('2d'), r = rng(2929);
  x.lineCap = 'round';
  // 결은 대체로 비스듬히 누운 짧은 붓질. 밝은 것과 어두운 것을 섞는다.
  for (let i = 0; i < 1500; i++) {
    const px = r() * T, py = r() * T, len = 5 + r() * 15, ang = -0.28 + (r() - 0.5) * 0.7, lw = 1 + r() * 2.6;
    const lightOne = r() < 0.5;
    x.strokeStyle = lightOne ? `rgba(255,248,232,${0.04 + r() * 0.05})` : `rgba(20,14,10,${0.04 + r() * 0.05})`;
    x.lineWidth = lw;
    for (const dx of [0, -T, T]) for (const dy of [0, -T, T]) {
      x.beginPath(); x.moveTo(px + dx, py + dy);
      x.quadraticCurveTo(px + dx + Math.cos(ang) * len * 0.5, py + dy + Math.sin(ang) * len * 0.5 + (r() - 0.5) * 1.5, px + dx + Math.cos(ang) * len, py + dy + Math.sin(ang) * len);
      x.stroke();
    }
  }
  strokeTile = c;
  return c;
}

/* ---------- 물감 얼룩 (크기마다 한 번) ---------- */
const mottles = new Map();
function mottle(w, h) {
  const key = `${w}x${h}`;
  if (mottles.has(key)) return mottles.get(key);
  // 작게 그려서 늘린다: 저절로 부드러워진다
  const sw = 96, sh = Math.max(8, Math.round(96 * h / w)), c = mk(sw, sh), x = c.getContext('2d'), r = rng(5151);
  x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, sw, sh);
  for (let i = 0; i < 70; i++) {
    const px = r() * sw, py = r() * sh, rad = 4 + r() * 14, warm = r() < 0.55;
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    const col = warm ? [196, 150, 96] : [84, 100, 140];
    const a = 0.25 + r() * 0.35;
    g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`); g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  const big = mk(w, h), bx = big.getContext('2d');
  bx.imageSmoothingEnabled = true; bx.imageSmoothingQuality = 'high';
  bx.drawImage(c, 0, 0, w, h);
  if (mottles.size > 4) mottles.clear();
  mottles.set(key, big);
  return big;
}

/* ---------- 빛 번짐 ---------- */
function bloom(ctx, w, h, S) {
  const night = S.tod === 'night', dusk = S.tod === 'dusk' || S.tod === 'dawn';
  let thr = night ? 125 : dusk ? 180 : 222;
  const sw = Math.max(16, Math.round(w / 8)), sh = Math.max(8, Math.round(h / 8));
  const small = mk(sw, sh), sx = small.getContext('2d', { willReadFrequently: true });
  sx.imageSmoothingQuality = 'high';
  sx.drawImage(ctx.canvas, 0, 0, sw, sh);
  let img;
  try { img = sx.getImageData(0, 0, sw, sh); } catch { return; }
  const d = img.data;
  // 눈밭·안개처럼 온통 밝은 그림은 문턱을 올린다 (하얗게 뜨지 않게)
  let sum = 0; for (let i = 0; i < d.length; i += 4) sum += Math.max(d[i], d[i + 1], d[i + 2]);
  const mean = sum / (d.length / 4);
  thr = Math.min(246, Math.max(thr, mean + (night ? 60 : 48)));
  for (let i = 0; i < d.length; i += 4) {
    const m = Math.max(d[i], d[i + 1], d[i + 2]);
    const k = m <= thr ? 0 : Math.pow((m - thr) / (255 - thr), 1.4);
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  }
  sx.putImageData(img, 0, 0);
  // 두 번 늘려 번지게: 가까운 번짐과 먼 번짐
  const mid = mk(sw * 2, sh * 2), mx = mid.getContext('2d');
  mx.imageSmoothingQuality = 'high';
  mx.drawImage(small, 0, 0, sw * 2, sh * 2);
  const tiny = mk(Math.max(4, sw / 4), Math.max(2, sh / 4)), tx = tiny.getContext('2d');
  tx.imageSmoothingQuality = 'high';
  tx.drawImage(small, 0, 0, tiny.width, tiny.height);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = night ? 0.7 : dusk ? 0.45 : 0.2;
  ctx.drawImage(mid, 0, 0, w, h);
  ctx.globalAlpha = night ? 0.5 : dusk ? 0.32 : 0.14;
  ctx.drawImage(tiny, 0, 0, w, h);
  ctx.restore();
  small.width = mid.width = tiny.width = 0;
}

/* ---------- 공기 원근 ---------- */
function aerial(ctx, w, h, S, hz) {
  const y = hz * h;
  // 지평선 둘레를 하늘빛 안개로
  const g = ctx.createLinearGradient(0, y - h * 0.16, 0, y + h * 0.26);
  const haze = S.haze ?? '#b8bcc4';
  const a = S.tod === 'night' ? 0.08 : S.heavy ? 0.08 : 0.12;
  g.addColorStop(0, rgba(haze, 0)); g.addColorStop(0.42, rgba(haze, a)); g.addColorStop(1, rgba(haze, 0));
  ctx.fillStyle = g; ctx.fillRect(0, y - h * 0.16, w, h * 0.42);
  // 먼 곳은 빛깔이 바랜다
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  const s = ctx.createLinearGradient(0, y - h * 0.2, 0, y + h * 0.3);
  s.addColorStop(0, 'rgba(128,128,128,0)'); s.addColorStop(0.45, 'rgba(128,128,128,0.3)'); s.addColorStop(1, 'rgba(128,128,128,0)');
  ctx.fillStyle = s; ctx.fillRect(0, y - h * 0.2, w, h * 0.5);
  ctx.restore();
}

/* ---------- 붓 터치: 그림 제 빛깔로 짧은 붓질을 수천 번 얹는다 ---------- */
function dabs(ctx, w, h, hz, strength) {
  const sw = Math.max(32, Math.round(w / 4)), sh = Math.max(16, Math.round(h / 4));
  const small = mk(sw, sh), sx = small.getContext('2d', { willReadFrequently: true });
  sx.drawImage(ctx.canvas, 0, 0, sw, sh);
  let d;
  try { d = sx.getImageData(0, 0, sw, sh).data; } catch { return; }
  small.width = 0;
  const r = rng(7373 + w), unit = w / 1200, n = Math.round(4200 * (w * h) / (1200 * 480));
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h;
    const ix = Math.min(sw - 1, (x / w * sw) | 0), iy = Math.min(sh - 1, (y / h * sh) | 0), o = (iy * sw + ix) * 4;
    const sky = y < hz * h - h * 0.04;
    // 하늘은 길고 누운 붓질, 땅은 짧고 비스듬한 붓질. 가까울수록 굵다.
    const near = clamp((y / h - hz) / (1 - hz), 0, 1);
    const len = (sky ? 10 + r() * 16 : 3 + r() * 6 + near * 6) * unit, ang = sky ? (r() - 0.5) * 0.25 : -0.35 + (r() - 0.5) * 0.9;
    const jit = (r() - 0.5) * 14;
    ctx.strokeStyle = `rgba(${clamp(d[o] + jit, 0, 255) | 0},${clamp(d[o + 1] + jit, 0, 255) | 0},${clamp(d[o + 2] + jit * 0.8, 0, 255) | 0},${(sky ? 0.24 : 0.34) * strength})`;
    ctx.lineWidth = (sky ? 2.4 + r() * 2.4 : 1.4 + r() * 1.8 + near * 1.6) * unit;
    ctx.beginPath(); ctx.moveTo(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2); ctx.lineTo(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2); ctx.stroke();
  }
}

/** 다 그린 그림에 붓맛을 한 번 얹는다 */
export function paintFinish(ctx, w, h, S, { hz = 0.5, land = true, strength = 1, edgeK = 1 } = {}) {
  if (!hasDom || !ctx) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (land) aerial(ctx, w, h, S, hz);
  dabs(ctx, w, h, hz, strength);
  bloom(ctx, w, h, S);
  // 물감 얼룩: 부드러운 빛(soft-light)으로 넓게
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.42 * strength;
  ctx.drawImage(mottle(w, h), 0, 0);
  // 붓 자국: 겹침(overlay)으로 옅게
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.32 * strength;
  const scale = clamp(w / 1200, 0.6, 2);
  const pat = ctx.createPattern(strokes(), 'repeat');
  if (pat) {
    if (pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().scale(scale));
    ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
  }
  // 가장자리 어둡게
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(w * 0.52, h * 0.5, Math.min(w, h) * 0.35, w * 0.52, h * 0.5, Math.hypot(w, h) * 0.62);
  const edge = S.tod === 'night' ? `rgba(40,40,60,${0.24 * edgeK})` : `rgba(90,70,50,${0.2 * edgeK})`;
  v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, edge);
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
