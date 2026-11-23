// 삽화의 마지막 손질 (38단계): 빛의 방향, 묵직한 빛깔 다듬기, 어두운 곳의 먹선 빗금.
// 붓맛(scenePaint.paintFinish) 뒤에 한 번 얹는다. 모든 판에 똑같이 먹으므로 옛 판과 새 판의 결이 맞는다.
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// 밝기 곡선: 어두운 곳은 조금 더 깊게, 밝은 곳은 살짝 눌러 타지 않게 (한 번만 계산)
let CURVE = null;
function curveOf() {
  if (CURVE) return CURVE;
  CURVE = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) { const x = i / 255; const s = x * x * (3 - 2 * x); CURVE[i] = Math.round(255 * (x * 0.62 + s * 0.38) * (0.985 - 0.045 * x * x)); }
  return CURVE;
}

/**
 * ctx 전체에 마지막 손질을 한다. S: 하늘 상태({ tod, dir, lit }), o.inside: 방 안 그림.
 * o.ink: 빗금 세기(0이면 없음), o.grade: 빛깔 다듬기 세기
 */
export function inkFinish(ctx, w, h, S, o = {}) {
  if (!ctx || typeof ctx.getImageData !== 'function') return;
  const ink = o.ink ?? 1, grade = o.grade ?? 1, night = S?.tod === 'night';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 1. 빛의 방향: 해(달) 쪽은 따뜻하게 밝고 반대쪽은 차게 가라앉는다
  if (!o.inside) {
    const dir = S?.dir ?? 1, g = ctx.createLinearGradient(dir > 0 ? w : 0, 0, dir > 0 ? 0 : w, h * 0.5);
    g.addColorStop(0, night ? 'rgba(150,170,220,.16)' : 'rgba(255,214,160,.2)'); g.addColorStop(0.5, 'rgba(128,128,128,0)'); g.addColorStop(1, night ? 'rgba(8,10,26,.3)' : 'rgba(30,26,44,.26)');
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 발밑은 어둡게 눌러 그림이 떠 보이지 않게
    const b = ctx.createLinearGradient(0, h * 0.62, 0, h); b.addColorStop(0, 'rgba(0,0,0,0)'); b.addColorStop(1, 'rgba(14,10,8,.3)');
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = b; ctx.fillRect(0, h * 0.62, w, h * 0.38);
  }
  ctx.globalCompositeOperation = 'source-over';
  // 2. 빛깔 다듬기와 먹선 빗금 (점마다)
  let img;
  try { img = ctx.getImageData(0, 0, w, h); } catch { ctx.restore(); return; }
  const d = img.data, C = curveOf(), unit = Math.max(1, Math.round(w / 240)); // 960 폭에서 빗금 굵기 한 점, 간격 네 점
  const p1 = unit * 4, p2 = unit * 5, sat = 1 - 0.16 * grade, T1 = night ? 62 : 84, T2 = night ? 30 : 44;
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const l0 = (r * 77 + g * 151 + b * 28) >> 8;
      // 채도를 조금 덜고(풀빛이 장난감처럼 뜨지 않게), 밝기 곡선을 먹인다
      const k = l0 ? (l0 + (C[l0] - l0) * grade) / l0 : 1;
      r = (l0 + (r - l0) * sat) * k; g = (l0 + (g - l0) * sat) * k; b = (l0 + (b - l0) * sat) * k;
      // 어두운 곳은 먹빛(차게), 밝은 곳은 양피지빛(따뜻하게)
      const sh = l0 < 96 ? (96 - l0) / 96 : 0, hi = l0 > 150 ? (l0 - 150) / 105 : 0;
      r += -6 * sh * grade + 7 * hi * grade; g += -3 * sh * grade + 3 * hi * grade; b += 4 * sh * grade - 8 * hi * grade;
      // 빗금: 어두울수록 짙게. 더 어두우면 엇갈린 빗금을 한 겹 더
      if (ink && l0 < T1) {
        let m = 0;
        // 손으로 그은 것처럼 군데군데 끊는다
        const u = x + y, w2 = x - y + 4096;
        if (u % p1 < unit && ((((u / p1) | 0) * 13 + (w2 >> 5) * 7) & 7) > 1) m = (T1 - l0) / T1 * 0.2;
        if (l0 < T2 && w2 % p2 < unit && ((((w2 / p2) | 0) * 11 + (u >> 5) * 5) & 7) > 2) m += (T2 - l0) / T2 * 0.18;
        if (m) { const q = 1 - m * ink; r *= q; g *= q; b *= q * 1.02; }
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.restore();
}
