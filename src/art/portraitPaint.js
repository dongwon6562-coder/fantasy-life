// 29단계: 초상의 그림 마감. 얼굴·머리·옷을 다 그린 뒤 그 위에 한 번 더 붓을 댄다.
// - 빛은 왼쪽 위 한 곳에서 온다. 얼굴 오른쪽에 명암 경계(터미네이터)를 두고 그늘을 부드럽게 번지게 한다.
// - 결: 머리에는 머리결 방향의 가는 줄무늬, 옷에는 천의 짜임과 주름이 도드라지는 빛, 살갗에는 고운 얼룩.
// - 큰 덩어리: 빛 쪽은 따뜻하게, 그늘 쪽과 아래쪽은 차고 깊게 가라앉혀 얼굴로 눈이 가게.
// 작은 초상(목록용, detail=false)에는 필터를 쓰지 않는다(휴대폰에서 무겁다). 대신 같은 방향의 그러데이션 명암만 얹는다.
import { f, mixHex } from './portraitKit.js';

const WARM = '#fff0d4', COOL = '#141020', RIM = '#c6d6ee';

export function paintDefs(uid, detail = true, H = 100) {
  const grads = `<linearGradient id="${uid}xk" x1="0.12" y1="0.08" x2="0.88" y2="0.92"><stop offset="0" stop-color="${WARM}" stop-opacity="0.2"/><stop offset="0.38" stop-color="${WARM}" stop-opacity="0"/><stop offset="0.58" stop-color="${COOL}" stop-opacity="0"/><stop offset="1" stop-color="${COOL}" stop-opacity="0.42"/></linearGradient>
  <linearGradient id="${uid}xd" x1="0" y1="0" x2="0" y2="1"><stop offset="0.68" stop-color="#0b0806" stop-opacity="0"/><stop offset="1" stop-color="#0b0806" stop-opacity="0.5"/></linearGradient>
  <radialGradient id="${uid}xv" cx="42%" cy="38%" r="64%"><stop offset="0.6" stop-color="#0b0806" stop-opacity="0"/><stop offset="1" stop-color="#0b0806" stop-opacity="0.55"/></radialGradient>`;
  const filters = `
  <filter id="${uid}xg" x="0" y="0" width="100" height="${H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="dome"/>
    <feDiffuseLighting in="dome" surfaceScale="4" diffuseConstant="1.1" lighting-color="#ffffff" result="d1"><feDistantLight azimuth="235" elevation="42"/></feDiffuseLighting>
    <feComposite in="SourceGraphic" in2="d1" operator="arithmetic" k1="0.62" k2="0.48" k3="0" k4="0" result="sh"/>
    <feSpecularLighting in="dome" surfaceScale="4" specularConstant="1" specularExponent="9" lighting-color="${RIM}" result="rim"><feDistantLight azimuth="15" elevation="6"/></feSpecularLighting>
    <feComposite in="rim" in2="SourceAlpha" operator="in" result="rimIn"/>
    <feComposite in="sh" in2="rimIn" operator="arithmetic" k1="0" k2="1" k3="0.2" k4="0" result="lit"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.9" numOctaves="2" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="1.3 0 0 0 -0.15  1.3 0 0 0 -0.15  1.3 0 0 0 -0.15  0 0 0 0 1" result="g"/>
    <feComposite in="lit" in2="g" operator="arithmetic" k1="0.07" k2="0.965" k3="0" k4="0" result="o"/>
    <feComposite in="o" in2="SourceAlpha" operator="in"/>
  </filter>
  <filter id="${uid}xh" x="0" y="0" width="100" height="${H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.9 0.045" numOctaves="3" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="2.2 0 0 0 -0.55  2.2 0 0 0 -0.55  2.2 0 0 0 -0.55  0 0 0 0 1" result="streak"/>
    <feComposite in="SourceGraphic" in2="streak" operator="arithmetic" k1="0.34" k2="0.8" k3="0" k4="0" result="s1"/>
    <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lum"/>
    <feGaussianBlur in="lum" stdDeviation="0.45" result="h"/>
    <feSpecularLighting in="h" surfaceScale="2.2" specularConstant="0.6" specularExponent="22" lighting-color="${WARM}" result="spec"><feDistantLight azimuth="235" elevation="48"/></feSpecularLighting>
    <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
    <feComposite in="s1" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="0.16" k4="0" result="s2"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="dome"/>
    <feSpecularLighting in="dome" surfaceScale="7" specularConstant="0.8" specularExponent="14" lighting-color="${WARM}" result="sheen"><feDistantLight azimuth="235" elevation="50"/></feSpecularLighting>
    <feComposite in="sheen" in2="streak" operator="arithmetic" k1="1" k2="0.35" k3="0" k4="0" result="sheenS"/>
    <feComposite in="sheenS" in2="SourceAlpha" operator="in" result="sheenIn"/>
    <feComposite in="s2" in2="sheenIn" operator="arithmetic" k1="0" k2="1" k3="0.26" k4="0" result="o"/>
    <feComposite in="o" in2="SourceAlpha" operator="in"/>
  </filter>
  <filter id="${uid}xc" x="0" y="0" width="100" height="${H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lum"/>
    <feGaussianBlur in="lum" stdDeviation="0.8" result="h"/>
    <feDiffuseLighting in="h" surfaceScale="3.6" diffuseConstant="1.3" lighting-color="${WARM}" result="lit"><feDistantLight azimuth="235" elevation="55"/></feDiffuseLighting>
    <feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1="0.82" k2="0.22" k3="0" k4="0" result="sh"/>
    <feTurbulence type="turbulence" baseFrequency="2.6 2.2" numOctaves="1" seed="5" result="w"/>
    <feColorMatrix in="w" type="matrix" values="-1.2 0 0 0 1  -1.2 0 0 0 1  -1.2 0 0 0 1  0 0 0 0 1" result="weave"/>
    <feComposite in="sh" in2="weave" operator="arithmetic" k1="0.22" k2="0.84" k3="0" k4="0" result="wv"/>
    <feSpecularLighting in="h" surfaceScale="3.6" specularConstant="1.1" specularExponent="38" lighting-color="${WARM}" result="gl"><feDistantLight azimuth="235" elevation="52"/></feSpecularLighting>
    <feComponentTransfer in="lum" result="bright"><feFuncA type="linear" slope="2.4" intercept="-1.15"/></feComponentTransfer>
    <feComposite in="gl" in2="bright" operator="in" result="glB"/>
    <feComposite in="wv" in2="glB" operator="arithmetic" k1="0" k2="1" k3="0.7" k4="0" result="o"/>
    <feComposite in="o" in2="SourceAlpha" operator="in"/>
  </filter>
  <filter id="${uid}xb" x="-10" y="-10" width="120" height="120" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="1.8"/></filter>
  <filter id="${uid}xw" x="-20" y="-20" width="140" height="140" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="${uid}xm" x="0" y="0" width="100" height="${H}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.035 0.06" numOctaves="3" seed="21" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.62" result="a"/>
    <feComposite in="SourceGraphic" in2="a" operator="in"/>
  </filter>
  <filter id="${uid}xs" x="-10" y="-10" width="120" height="120" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0.7"/></filter>
  <filter id="${uid}xt" x="-10" y="-10" width="120" height="120" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0.26"/></filter>
`;
  return detail ? filters + grads : grads.replace('stop-opacity="0.5"/></linearGradient>', 'stop-opacity="0.3"/></linearGradient>').replace('stop-opacity="0.55"/></radialGradient>', 'stop-opacity="0.32"/></radialGradient>');
}

// 머리·옷을 결 필터로 감싼다
export const hairWrap = (uid, s) => (s ? `<g filter="url(#${uid}xh)">${s}</g>` : '');
export const clothWrap = (uid, s) => (s ? `<g filter="url(#${uid}xc)">${s}</g>` : '');

// 얼굴의 명암 경계: 빛 반대쪽(오른쪽)을 부드럽게 가라앉힌다. head clip 안에서 부른다.
export function faceShadow(uid, m, skin, dark, strength = 1, detail = true) {
  const { cx, top, hw, hh, cy, eyeY, eyeGap, ew, browY, noseBot, my, chin } = m;
  const sh = mixHex(skin, dark, 0.72);
  if (!detail) { // 작은 초상: 필터 없이 그러데이션 한 장
    return `<defs><linearGradient id="${uid}xf" x1="0" x2="1" y1="0" y2="0.12"><stop offset="0.52" stop-color="${sh}" stop-opacity="0"/><stop offset="0.8" stop-color="${sh}" stop-opacity="${f(0.5 * strength)}"/><stop offset="1" stop-color="${sh}" stop-opacity="${f(0.6 * strength)}"/></linearGradient></defs><rect x="${f(cx - hw - 1)}" y="${f(top - 1)}" width="${f(hw * 2 + 2)}" height="${f(chin - top + 2)}" fill="url(#${uid}xf)"/>`;
  }
  const d = `M${f(cx + hw * 0.1)} ${f(top - 2)} C${f(cx + hw * 0.28)} ${f(top + hh * 0.35)} ${f(cx + hw * 0.36)} ${f(browY - 2)} ${f(cx + eyeGap - ew * 0.2)} ${f(browY + 0.6)}`
    + ` C${f(cx + eyeGap + ew * 0.5)} ${f(eyeY + 0.5)} ${f(cx + hw * 0.4)} ${f(eyeY + hh * 0.2)} ${f(cx + hw * 0.3)} ${f(eyeY + hh * 0.34)}`
    + ` C${f(cx + hw * 0.22)} ${f(noseBot + 1)} ${f(cx + hw * 0.26)} ${f(my)} ${f(cx + hw * 0.16)} ${f(my + (chin - my) * 0.55)}`
    + ` C${f(cx + hw * 0.08)} ${f(chin - 1)} ${f(cx + hw * 0.02)} ${f(chin + 1)} ${f(cx)} ${f(chin + 3)} L${f(cx + hw + 4)} ${f(chin + 3)} L${f(cx + hw + 4)} ${f(top - 2)}Z`;
  // 눈구멍 안쪽 그늘이 콧대 쪽으로 이어지는 자리
  const bridge = `M${f(cx + 0.6)} ${f(browY + 1)} Q${f(cx + 2.6)} ${f(eyeY)} ${f(cx + eyeGap - ew * 0.6)} ${f(eyeY + ew * 0.5)} Q${f(cx + 2.4)} ${f(eyeY + ew * 1.6)} ${f(cx + 1.2)} ${f(noseBot - 3)}Z`;
  const rim = `M${f(cx + hw * 0.98)} ${f(cy - hh * 0.1)} Q${f(cx + hw * 0.92)} ${f(cy + hh * 0.5)} ${f(cx + hw * 0.45)} ${f(chin - 1)}`;
  const lit = mixHex(skin, '#fff6e4', 0.5);
  const n = parseInt(skin.slice(1), 16), lum = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  const gs = strength * Math.max(0.15, 1.35 - lum * 1.3); // 밝은 살갗은 이미 밝다
  const glow = `<ellipse cx="${f(cx - hw * 0.42)}" cy="${f(top + hh * 0.5)}" rx="${f(hw * 0.42)}" ry="${f(hh * 0.3)}" fill="${lit}" opacity="${f(0.3 * gs)}" filter="url(#${uid}xb)"/><ellipse cx="${f(cx - hw * 0.55)}" cy="${f(eyeY + hh * 0.28)}" rx="${f(hw * 0.26)}" ry="${f(hh * 0.14)}" fill="${lit}" opacity="${f(0.32 * gs)}" filter="url(#${uid}xb)"/><path d="M${f(cx - 0.6)} ${f(eyeY + 1)} L${f(cx - 0.9)} ${f(noseBot - 2.6)}" stroke="${lit}" stroke-width="1.1" stroke-linecap="round" opacity="${f(0.35 * gs)}" filter="url(#${uid}xs)"/>`;
  const { nw = 3, mw = 5 } = m;
  const cast = [
    // 눈썹 아래로 떨어지는 그늘 (눈두덩 윗부분)
    ...[-1, 1].map((sd) => `<path d="M${f(cx + sd * (eyeGap - ew * 1.2))} ${f(browY + 1.1)} Q${f(cx + sd * eyeGap)} ${f(browY + 0.2)} ${f(cx + sd * (eyeGap + ew * 1.3))} ${f(browY + 1.4)} Q${f(cx + sd * eyeGap)} ${f(eyeY - ew * 0.35)} ${f(cx + sd * (eyeGap - ew * 1.2))} ${f(browY + 1.1)}Z" fill="${sh}" opacity="${f((sd > 0 ? 0.55 : 0.32) * strength)}" filter="url(#${uid}xs)"/>`),
    // 코가 오른쪽 아래로 드리우는 그림자
    `<ellipse cx="${f(cx + nw * 1.05)}" cy="${f(noseBot + 0.4)}" rx="${f(nw * 1.05)}" ry="${f(1.5)}" transform="rotate(28 ${f(cx + nw * 1.05)} ${f(noseBot + 0.4)})" fill="${sh}" opacity="${f(0.5 * strength)}" filter="url(#${uid}xs)"/>`,
    `<path d="M${f(cx + 0.8)} ${f(eyeY + ew * 0.4)} Q${f(cx + 2.2)} ${f((eyeY + noseBot) / 2)} ${f(cx + nw * 0.8)} ${f(noseBot - 2)}" fill="none" stroke="${sh}" stroke-width="1.2" opacity="${f(0.4 * strength)}" filter="url(#${uid}xs)"/>`,
    // 아랫입술 밑과 턱 끝 아래
    `<ellipse cx="${f(cx + 0.6)}" cy="${f(my + (chin - my) * 0.38)}" rx="${f(mw * 0.62)}" ry="${f(1.1)}" fill="${sh}" opacity="${f(0.45 * strength)}" filter="url(#${uid}xs)"/>`,
  ].join('');
  // 반대쪽 테두리 빛 (얼굴 오른쪽 가장자리, 차가운 빛)
  const rimC = `<path d="M${f(cx + hw * 0.9)} ${f(top + hh * 0.35)} Q${f(cx + hw * 1.02)} ${f(cy + hh * 0.2)} ${f(cx + hw * 0.62)} ${f(cy + hh * 0.82)}" fill="none" stroke="#cfdcf0" stroke-width="0.9" opacity="${f(0.32 * strength)}" filter="url(#${uid}xs)"/>`;
  return glow + cast + rimC + `<g><path d="${d}" fill="${sh}" opacity="${f(0.82 * strength)}" filter="url(#${uid}xb)"/><path d="${bridge}" fill="${sh}" opacity="${f(0.35 * strength)}" filter="url(#${uid}xs)"/></g>`
    + `<path d="${d}" fill="none" stroke="${mixHex(skin, '#b04a30', 0.35)}" stroke-width="1.6" opacity="${f(0.18 * strength)}" filter="url(#${uid}xb)"/>`
    + `<path d="${rim}" fill="none" stroke="${mixHex(skin, '#c08a6a', 0.3)}" stroke-width="1.4" opacity="${f(0.22 * strength)}" filter="url(#${uid}xs)"/>`;
}

// 그림 위에 얹는 빛 덩어리와 가장자리·아래쪽 그늘
export const paintOver = (uid, H = 100) => `<rect x="0" y="0" width="100" height="${H}" fill="url(#${uid}xk)"/><rect x="0" y="0" width="100" height="${H}" fill="url(#${uid}xd)"/><rect x="0" y="0" width="100" height="${H}" fill="url(#${uid}xv)"/>`;
