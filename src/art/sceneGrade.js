// 46단계: 풍경의 마지막 색 손질. scene.js draw에서 paintFinish 바로 앞에 부른다.
// - 땅을 뿌옇지 않게: 땅 띠만 자기 자신을 overlay로 한 번 더 얹어 대비와 채도를 살린다 (공기 원근이 있는 먼 지평선 띠는 약하게).
// - 계절 색: 봄은 새잎 초록과 꽃빛, 여름은 짙고 따뜻하게, 가을은 금빛과 주홍, 겨울은 푸른 그늘.
// - 하늘 빛: 새벽·해 질 녘은 해 쪽 지평선이 타오르고 꼭대기는 깊게, 맑은 낮은 하늘 꼭대기를 짙푸르게.
// - 밤 불빛: 켜진 창 둘레에 넓고 따뜻한 번짐, 마을 위 낮은 하늘이 불빛을 받아 은은히 밝다.
// 캔버스 한 장 그리기(drawImage 한 번)와 그러데이션 몇 장이라 무게가 거의 없다.
import { W, H, HZ } from './sceneKit.js';

const SEASON = {
  spring: { c: '#a6d873', a: 0.12, b: '#f2b7c6', ba: 0.05 },
  summer: { c: '#e6b84a', a: 0.08, b: '#3f8a3a', ba: 0.06 },
  autumn: { c: '#ff8f2e', a: 0.14, b: '#c9a23a', ba: 0.08 },
  winter: { c: '#7ea4d8', a: 0.12, b: '#dfe8f4', ba: 0.05 },
};
const seasonOf = (m) => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');

function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

export function gradeScene(ctx, S, { month, lit = [], blight = false, dry = false } = {}) {
  const tod = S.tod, night = tod === 'night';
  // 1) 땅 대비: 지평선 아래 띠부터. 흐리거나 비 오면 덜
  const k = night ? 0.12 : S.heavy ? 0.16 : S.overcast ? 0.22 : 0.3;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = k;
  const y0 = HZ - 30, hh = H - y0;
  ctx.drawImage(ctx.canvas, 0, y0, W, hh, 0, y0, W, hh); // 땅 띠만 (clip 없이 원본 사각형만 옮겨 그려 가볍게)
  // 지평선 바로 아래 띠(먼 들·마을)가 가장 젖빛으로 뜬다: 그 띠만 한 번 더
  if (!S.heavy && S.weather !== 'fog') { ctx.globalAlpha = k * 0.8; ctx.drawImage(ctx.canvas, 0, HZ - 10, W, 110, 0, HZ - 10, W, 110); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // 2) 계절 색 (밤·병든 땅은 약하게)
  if (!blight) {
    const T = SEASON[seasonOf(month)];
    const m = (night ? 0.4 : dry && T === SEASON.spring ? 0.6 : 1) * (S.heavy ? 0.5 : 1);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createLinearGradient(0, HZ - 10, 0, H);
    g.addColorStop(0, rgba(T.c, T.a * m * 0.6)); g.addColorStop(0.5, rgba(T.c, T.a * m)); g.addColorStop(1, rgba(T.b, T.ba * m * 2));
    ctx.fillStyle = g; ctx.fillRect(0, HZ - 10, W, H - HZ + 10);
    ctx.restore();
  }
  // 3) 하늘 빛
  ctx.save();
  if ((tod === 'dusk' || tod === 'dawn') && !S.heavy) {
    const sx = tod === 'dawn' ? W * 0.3 : W * 0.66;
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(sx, HZ, 10, sx, HZ, W * 0.5);
    const c = tod === 'dawn' ? '#ffb070' : '#ff8a4a';
    g.addColorStop(0, rgba(c, S.overcast ? 0.18 : 0.34)); g.addColorStop(0.45, rgba(c, 0.1)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HZ + 60);
    ctx.globalCompositeOperation = 'multiply';
    const t = ctx.createLinearGradient(0, 0, 0, HZ);
    t.addColorStop(0, rgba(tod === 'dawn' ? '#5a6aa8' : '#4a3c7a', 0.3)); t.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = t; ctx.fillRect(0, 0, W, HZ);
  } else if (tod === 'day' && !S.overcast) {
    ctx.globalCompositeOperation = 'multiply';
    const t = ctx.createLinearGradient(0, 0, 0, HZ * 0.8);
    t.addColorStop(0, rgba('#6f9ad8', 0.32)); t.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = t; ctx.fillRect(0, 0, W, HZ);
  }
  ctx.restore();
  // 4) 밤 불빛: 창 둘레의 넓은 번짐과 마을 위 하늘
  if ((night || tod === 'dusk') && lit.length) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let sx = 0, sy = 0;
    const thin = Math.sqrt(Math.min(1, 14 / lit.length)); // 창이 몰린 곳이 하얗게 타지 않게
    for (const [x, y, r, c] of lit) {
      const R = Math.max(14, r * 2.4);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, rgba(c || '#ffc878', (night ? 0.08 : 0.04) * thin)); g.addColorStop(1, rgba(c || '#ffc878', 0));
      ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      sx += x; sy += y;
    }
    if (night && lit.length >= 4) {
      const cx = sx / lit.length, cy = sy / lit.length;
      const g = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy - 30, 320);
      g.addColorStop(0, rgba('#ff9a48', 0.12)); g.addColorStop(1, rgba('#ff9a48', 0));
      ctx.fillStyle = g; ctx.fillRect(cx - 320, cy - 350, 640, 640);
    }
    ctx.restore();
  }
}
