// 46단계 둘째: 폰 크기에서도 한눈에 달라 보이게 빛과 덩어리를 깊게.
// - 바탕: 머리 뒤 왼쪽 위에서 번지는 따뜻한 빛과 머리 둘레의 은은한 뒷빛, 네 귀퉁이는 가라앉힌다.
// - 얼굴 덩어리: 광대 아래·관자놀이·코 옆면·턱 아래를 깊게, 이마·광대 위·콧등·턱 끝에 빛.
// - 종족: 엘프 귀는 빛이 비치는 살(붉은 속빛)과 날 선 테두리 빛, 짐승 귀는 털 다발, 뿔은 마디와 윤.
// 필터는 이미 있는 흐림(xs·xb·xy)만 다시 쓴다. 새 필터를 만들지 않아 폰에서 무게가 거의 그대로다.
import { f, mixHex, clamp, rngFrom, hashStr } from './portraitKit.js';

const B = (uid, k, on) => (on ? ` filter="url(#${uid}${k})"` : '');

// 바탕 위, 인물 아래 (틀 clip 안)
export function backGlow(o) {
  const { uid, cx, top, hh, H, bgHue, detail } = o;
  const warm = mixHex(bgHue, '#ffd9a0', 0.42), deep = mixHex(bgHue, '#07050a', 0.7);
  const gy = top + hh * 0.8;
  return `<defs><radialGradient id="${uid}xG" cx="${f(cx - 10)}" cy="${f(gy)}" r="${f(H * 0.46)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${warm}" stop-opacity="${detail ? 0.62 : 0.45}"/><stop offset="0.45" stop-color="${warm}" stop-opacity="${detail ? 0.22 : 0.16}"/><stop offset="1" stop-color="${warm}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${uid}xK" cx="45%" cy="38%" r="72%"><stop offset="0.5" stop-color="${deep}" stop-opacity="0"/><stop offset="1" stop-color="${deep}" stop-opacity="0.75"/></radialGradient></defs>`
    + `<rect x="0" y="0" width="100" height="${H}" fill="url(#${uid}xK)"/><rect x="0" y="0" width="100" height="${H}" fill="url(#${uid}xG)"/>`;
}

// 얼굴 clip 안, faceShadow 뒤: 얼굴의 면(面)을 깎는다
export function faceModel(o) {
  const { uid, cx, hw, hh, top, cy, chin, eyeY, eyeGap, ew, browY, noseBot, my, mw, nw, skin, detail, kid, race, stage } = o;
  if (stage === 'baby') return '';
  const n = parseInt(skin.slice(1), 16), lum = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  const dkC = mixHex(skin, race === 'demon' ? '#1a1222' : '#2e140c', 0.66);
  const liC = mixHex(skin, '#fff8ea', 0.7);
  const L = clamp(1.5 - lum, 0.55, 1.1); // 어두운 살갗일수록 빛을 더 또렷하게
  const a = 1 - kid * 0.55;
  const xb = B(uid, 'xb', detail), xs = B(uid, 'xs', detail);
  let s = '';
  // 광대 아래 꺼진 면: 빛 반대쪽(오른쪽)이 깊다
  for (const sd of [-1, 1]) {
    const x = cx + sd * hw * 0.6, y = eyeY + hh * 0.42;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(hw * 0.28)}" ry="${f(hh * 0.1)}" transform="rotate(${sd * -24} ${f(x)} ${f(y)})" fill="${dkC}" opacity="${f((sd > 0 ? 0.42 : 0.22) * a)}"${xb}/>`;
  }
  if (!detail) { // 작은 초상(목록용)은 가볍게: 코 옆면과 턱 아래, 이마 빛만
    s += `<ellipse cx="${f(cx + hw * 0.12)}" cy="${f(chin + 0.6)}" rx="${f(hw * 0.62)}" ry="${f(hh * 0.11)}" fill="${dkC}" opacity="${f(0.4 * a)}"/>`;
    s += `<ellipse cx="${f(cx - hw * 0.3)}" cy="${f(top + hh * 0.5)}" rx="${f(hw * 0.36)}" ry="${f(hh * 0.16)}" fill="${liC}" opacity="${f(0.25 * L)}"/>`;
    return s;
  }
  // 관자놀이와 오른쪽 이마 가장자리
  s += `<ellipse cx="${f(cx + hw * 0.88)}" cy="${f(browY - hh * 0.05)}" rx="${f(hw * 0.22)}" ry="${f(hh * 0.3)}" fill="${dkC}" opacity="${f(0.4 * a)}"${xb}/>`;
  // 코 오른쪽 옆면 (콧등에서 콧방울로 이어지는 그늘 판)
  s += `<path d="M${f(cx + 1)} ${f(eyeY + ew * 0.3)} Q${f(cx + nw * 0.9)} ${f((eyeY + noseBot) / 2)} ${f(cx + nw * 1.05)} ${f(noseBot - 1.4)} L${f(cx + nw * 0.3)} ${f(noseBot - 1)} Q${f(cx + 0.9)} ${f((eyeY + noseBot) / 2 + 1)} ${f(cx + 0.4)} ${f(eyeY + ew * 0.6)}Z" fill="${dkC}" opacity="${f(0.42 * a)}"${xs}/>`;
  // 턱 아래와 턱선: 아래로 갈수록 가라앉는다
  s += `<ellipse cx="${f(cx + hw * 0.12)}" cy="${f(chin + 0.6)}" rx="${f(hw * 0.62)}" ry="${f(hh * 0.11)}" fill="${dkC}" opacity="${f(0.5 * a)}"${xb}/>`;
  s += `<path d="M${f(cx + hw * 0.95)} ${f(cy + hh * 0.2)} Q${f(cx + hw * 0.8)} ${f(cy + hh * 0.75)} ${f(cx + hw * 0.2)} ${f(chin)}" fill="none" stroke="${dkC}" stroke-width="${f(hw * 0.22)}" opacity="${f(0.38 * a)}"${xb}/>`;
  // 빛 받는 면: 이마 왼쪽, 왼쪽 광대 위, 콧등, 턱 끝, 윗입술 위
  s += `<ellipse cx="${f(cx - hw * 0.3)}" cy="${f(top + hh * 0.5)}" rx="${f(hw * 0.36)}" ry="${f(hh * 0.16)}" fill="${liC}" opacity="${f(0.38 * L)}"${xb}/>`;
  s += `<ellipse cx="${f(cx - eyeGap - ew * 0.1)}" cy="${f(eyeY + hh * 0.2)}" rx="${f(hw * 0.2)}" ry="${f(hh * 0.065)}" transform="rotate(-14 ${f(cx - eyeGap)} ${f(eyeY + hh * 0.2)})" fill="${liC}" opacity="${f(0.5 * L)}"${xs}/>`;
  s += `<path d="M${f(cx - 0.5)} ${f(browY + 2)} L${f(cx - 0.6)} ${f(noseBot - 2.8)}" stroke="${liC}" stroke-width="0.9" stroke-linecap="round" opacity="${f(0.55 * L)}"${xs}/>`;
  s += `<ellipse cx="${f(cx - nw * 0.35)}" cy="${f(noseBot - 2.2)}" rx="${f(nw * 0.42)}" ry="${f(nw * 0.3)}" fill="#fffaf0" opacity="${f(0.45 * L)}"${xs}/>`;
  s += `<ellipse cx="${f(cx - hw * 0.08)}" cy="${f(chin - (chin - my) * 0.3)}" rx="${f(mw * 0.42)}" ry="${f((chin - my) * 0.14)}" fill="${liC}" opacity="${f(0.36 * L)}"${xs}/>`;
  // 오른쪽 턱 가장자리에 되비친 따뜻한 빛 (그늘 속이 죽지 않게)
  if (detail) s += `<path d="M${f(cx + hw * 0.9)} ${f(cy + hh * 0.3)} Q${f(cx + hw * 0.74)} ${f(cy + hh * 0.78)} ${f(cx + hw * 0.32)} ${f(chin - 0.6)}" fill="none" stroke="${mixHex(skin, '#e0805a', 0.35)}" stroke-width="0.9" opacity="${f(0.3 * a)}"${xs}/>`;
  return s;
}

// 눈 clip 안, 눈동자 위: 흰자가 공처럼 보이게 눈 구석을 가라앉히고 홍채에 결과 빛점
export function eyeBall(o) {
  const { uid, ex, eyeY, ew, icx, icy, ir, eyeCol, detail, shape } = o;
  let s = `<path d="${shape}" fill="url(#${uid}xE)"/>`;
  // 홍채 테(짙은 고리)와 동공 둘레의 밝은 띠
  s += `<circle cx="${f(icx)}" cy="${f(icy)}" r="${f(ir * 0.93)}" fill="none" stroke="${mixHex(eyeCol, '#050302', 0.7)}" stroke-width="${f(ir * 0.17)}" opacity="0.85"/>`;
  if (detail) s += `<circle cx="${f(icx)}" cy="${f(icy)}" r="${f(ir * 0.56)}" fill="none" stroke="${mixHex(eyeCol, '#fff0c8', 0.45)}" stroke-width="${f(ir * 0.12)}" opacity="0.55"/>`;
  if (!detail) return s;
  // 빛 반대쪽 아래 홍채가 빛을 받아 밝아진다
  s += `<ellipse cx="${f(icx + ir * 0.22)}" cy="${f(icy + ir * 0.45)}" rx="${f(ir * 0.48)}" ry="${f(ir * 0.28)}" fill="${mixHex(eyeCol, '#fff6dc', 0.4)}" opacity="0.5"${B(uid, 'xt', detail)}/>`;
  void ex; void eyeY; void ew;
  return s;
}
export const eyeBallDefs = (uid) => `<radialGradient id="${uid}xE" cx="50%" cy="38%" r="62%"><stop offset="0.45" stop-color="#3a2418" stop-opacity="0"/><stop offset="1" stop-color="#3a2418" stop-opacity="0.55"/></radialGradient>`;
// 눈동자 위 가장 밝은 빛점 (윗꺼풀 그늘 뒤에 얹는다)
export const eyeSpark = (icx, icy, ir, detail) => `<circle cx="${f(icx - ir * 0.38)}" cy="${f(icy - ir * 0.34)}" r="${f(ir * (detail ? 0.27 : 0.24))}" fill="#fffef8"/>${detail ? `<circle cx="${f(icx - ir * 0.05)}" cy="${f(icy - ir * 0.5)}" r="${f(ir * 0.09)}" fill="#fff" opacity="0.8"/>` : ''}`;

// 어깨와 옷깃의 빛: 몸통 mask 안에서 (clothFolds가 부름)
export function shoulderLight(o) {
  const { uid, cx, sw, sy, baseY, nw } = o;
  const L = `M${f(cx - nw - 1)} ${f(baseY + 2.5)} Q${f(cx - sw * 0.5)} ${f(sy - 1.2)} ${f(cx - sw * 0.92)} ${f(sy + 5)}`;
  const R = `M${f(cx + sw * 0.55)} ${f(sy)} Q${f(cx + sw * 0.9)} ${f(sy + 3)} ${f(cx + sw * 0.98)} ${f(sy + 14)}`;
  return `<path d="${L}" fill="none" stroke="#ffe7bc" stroke-width="2.6" stroke-linecap="round" opacity="0.3" filter="url(#${uid}xb)"/><path d="${L}" fill="none" stroke="#fff2d8" stroke-width="0.7" stroke-linecap="round" opacity="0.4" filter="url(#${uid}xt)"/>`
    + `<path d="${R}" fill="none" stroke="#bcd0f0" stroke-width="1.1" stroke-linecap="round" opacity="0.32" filter="url(#${uid}xs)"/>`;
}

// 앞머리 위: 종족 표식을 또렷하게 (귀·뿔)
export function raceEdge(o) {
  const { race, beast, uid, detail, earAt, cx, hw, hh, top, hair, hairDark, skin, key } = o;
  if (o.stage === 'baby') return '';
  let s = '';
  if ((race === 'elf' || race === 'half_elf') && earAt?.length) {
    // 귀 끝의 붉은 속빛(빛이 비치는 얇은 살)과 빛 쪽 날 선 테두리
    for (const { x, y, er, s: sd } of earAt) {
      const tipX = x + sd * er * 1.9, tipY = y - er * 2.1;
      s += `<ellipse cx="${f((x + tipX) / 2 + sd * 0.4)}" cy="${f((y + tipY) / 2)}" rx="${f(er * 0.55)}" ry="${f(er * 1.1)}" transform="rotate(${sd * 38} ${f((x + tipX) / 2)} ${f((y + tipY) / 2)})" fill="#e8806a" opacity="${f(sd < 0 ? 0.32 : 0.18)}"${B(uid, 'xs', detail)}/>`;
      if (sd < 0) s += `<path d="M${f(x - er * 0.6)} ${f(y - er * 1.2)} Q${f(x - er * 1.4)} ${f(y - er * 1.9)} ${f(tipX + 0.6)} ${f(tipY + 0.4)}" fill="none" stroke="#fff4dc" stroke-width="0.6" stroke-linecap="round" opacity="0.75"/>`;
      else s += `<path d="M${f(x + er * 1.3)} ${f(y - er * 0.4)} Q${f(x + er * 1.7)} ${f(y - er * 1.3)} ${f(tipX - 0.4)} ${f(tipY + 0.8)}" fill="none" stroke="#c6d6ee" stroke-width="0.5" stroke-linecap="round" opacity="0.5"/>`;
    }
  }
  if (race === 'beast' && beast && beast !== 'hawk') {
    // 귀 가장자리와 속의 털 다발
    const r = rngFrom(hashStr('ear' + key));
    const furL = mixHex(hair, '#fff4e0', 0.45);
    let dk = '', li = '';
    for (const sd of [-1, 1]) {
      const bx = cx + sd * hw * 0.62, by = top + hh * 0.2;
      for (let i = 0; i < (detail ? 7 : 3); i++) {
        const t = r(), x = bx + sd * (-1.5 + t * 5), y = by - 1 - r() * 6;
        const seg = `M${f(x)} ${f(y)} q${f(sd * (0.4 + r()))} ${f(-1.6 - r())} ${f(sd * (0.2 + r() * 0.6))} ${f(-2.6 - r())} `;
        if (i % 2) li += seg; else dk += seg;
      }
      li += `M${f(bx - sd * 1.6)} ${f(by + 0.4)} q${f(sd * 0.8)} -2 ${f(sd * 0.4)} -3.4 M${f(bx)} ${f(by + 0.6)} q${f(sd * 0.6)} -2 ${f(sd * 0.2)} -3.6 `;
    }
    s += `<path d="${dk}" fill="none" stroke="${hairDark}" stroke-width="0.45" stroke-linecap="round" opacity="0.7"/><path d="${li}" fill="none" stroke="${furL}" stroke-width="0.45" stroke-linecap="round" opacity="0.8"/>`;
  }
  if (race === 'demon' || race === 'half_demon') {
    // 뿔 밑동의 그늘 (머리에 박힌 자리), 뿔 결은 horns()가 그림
    for (const sd of [-1, 1]) s += `<ellipse cx="${f(cx + sd * hw * 0.6)}" cy="${f(top + hh * 0.26)}" rx="2.6" ry="1.2" fill="#0a0608" opacity="0.45"${B(uid, 'xs', detail)}/>`;
  }
  void skin;
  return s;
}
