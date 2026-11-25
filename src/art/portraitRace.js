// 46단계: 종족이 한눈에 갈리게, 나이가 해마다 조금씩 보이게, 빛이 한 방향에서 오게.
// portrait.js drawFace가 얼굴 clip 안(raceMarks·ageMarks), 눈 뒤(eyeGlow), 앞머리 뒤(grayTemples), 맨 끝(keyLight)에 부른다.
import { f, mixHex, clamp, rngFrom, hashStr } from './portraitKit.js';

const blur = (uid, k = 'xb') => ` filter="url(#${uid}${k})"`;

// 얼굴 clip 안: 종족의 뼈대와 살갗
export function raceMarks(o) {
  const { race, beast, cx, hw, hh, top, chin, eyeY, eyeGap, ew, browY, noseBot, my, mw, nw, skin, hairDark, uid, detail, kid, key } = o;
  if (o.stage === 'baby') return '';
  const B = (k) => (detail ? blur(uid, k) : '');
  const lit = mixHex(skin, '#fffaf0', 0.55), dk = mixHex(skin, race === 'demon' ? '#1c1424' : '#3a1a12', 0.6);
  const adult = 1 - kid;
  let s = '';
  if (race === 'elf' || race === 'half_elf') {
    const k = (race === 'elf' ? 1 : 0.6) * adult;
    // 높은 광대: 빛 쪽은 날 선 빛, 그 아래는 쑥 들어간 그늘
    for (const sd of [-1, 1]) {
      const x = cx + sd * hw * 0.56, y = eyeY + hh * 0.2;
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(hw * 0.26)}" ry="${f(hh * 0.05)}" transform="rotate(${sd * -16} ${f(x)} ${f(y)})" fill="${lit}" opacity="${f((sd < 0 ? 0.5 : 0.2) * k)}"${B('xs')}/>`;
      s += `<ellipse cx="${f(x + sd * hw * 0.04)}" cy="${f(y + hh * 0.14)}" rx="${f(hw * 0.22)}" ry="${f(hh * 0.07)}" transform="rotate(${sd * -22} ${f(x)} ${f(y + hh * 0.14)})" fill="${dk}" opacity="${f((sd > 0 ? 0.42 : 0.26) * k)}"${B('xb')}/>`;
    }
    // 빛을 머금은 살갗 (엘프만)
    if (race === 'elf') s += `<ellipse cx="${f(cx - hw * 0.15)}" cy="${f(eyeY)}" rx="${f(hw * 0.9)}" ry="${f(hh * 0.8)}" fill="#fffbea" opacity="${f(0.1 * k)}"${B('xb')}/>`;
  }
  if (race === 'dwarf') {
    // 볕과 술과 불에 그은 뭉툭한 코와 붉은 뺨, 거친 살결
    s += `<ellipse cx="${cx}" cy="${f(noseBot - 1.6)}" rx="${f(nw * 1.25)}" ry="${f(nw * 0.95)}" fill="#b84a36" opacity="${f(0.32 * adult)}"${B('xb')}/>`;
    s += `<ellipse cx="${f(cx - nw * 0.4)}" cy="${f(noseBot - 2.4)}" rx="${f(nw * 0.45)}" ry="${f(nw * 0.32)}" fill="${lit}" opacity="${f(0.55 * adult)}"${B('xs')}/>`;
    for (const sd of [-1, 1]) s += `<ellipse cx="${f(cx + sd * hw * 0.55)}" cy="${f(eyeY + hh * 0.36)}" rx="${f(hw * 0.28)}" ry="${f(hh * 0.13)}" fill="#b5503a" opacity="${f(0.22 * adult)}"${B('xb')}/>`;
    if (detail && adult > 0.5) {
      const r = rngFrom(hashStr('pore' + key)); let d = '';
      for (let i = 0; i < 26; i++) { const sd = i % 2 ? 1 : -1; d += `<circle cx="${f(cx + sd * (nw + r() * hw * 0.55))}" cy="${f(eyeY + hh * (0.25 + r() * 0.3))}" r="${f(0.18 + r() * 0.16)}"/>`; }
      s += `<g fill="${dk}" opacity="0.28">${d}</g>`;
    }
  }
  if (race === 'beast' && beast !== 'hawk') {
    // 얼굴 가장자리와 이마에 짧은 털결
    const r = rngFrom(hashStr('fur' + key)); let d = '';
    for (let i = 0; i < (detail ? 34 : 16); i++) {
      const sd = i % 2 ? 1 : -1, t = r();
      const x = cx + sd * hw * (0.78 + r() * 0.2), y = top + hh * (0.4 + t * 1.3);
      d += `M${f(x)} ${f(y)} l${f(sd * (0.9 + r()))} ${f(1.2 + r() * 0.8)} `;
    }
    for (let i = 0; i < (detail ? 10 : 4); i++) { const x = cx + (r() - 0.5) * hw * 0.9, y = top + hh * (0.15 + r() * 0.3); d += `M${f(x)} ${f(y)} l${f((r() - 0.5) * 0.8)} ${f(1.2 + r())} `; }
    s += `<path d="${d}" fill="none" stroke="${hairDark}" stroke-width="0.35" stroke-linecap="round" opacity="${f(0.45 * adult + 0.15)}"/>`;
  }
  if (race === 'demon' || race === 'half_demon') {
    const k = race === 'demon' ? 1 : 0.5;
    // 날 선 광대 아래 그늘과 눈가의 검보랏빛
    for (const sd of [-1, 1]) {
      s += `<path d="M${f(cx + sd * hw * 0.86)} ${f(eyeY + hh * 0.16)} Q${f(cx + sd * hw * 0.5)} ${f(eyeY + hh * 0.34)} ${f(cx + sd * (mw + 1.5))} ${f(my - 1)}" fill="none" stroke="${dk}" stroke-width="${f(hh * 0.07)}" stroke-linecap="round" opacity="${f((sd > 0 ? 0.5 : 0.34) * k * adult)}"${B('xb')}/>`;
      s += `<ellipse cx="${f(cx + sd * eyeGap)}" cy="${f(eyeY + ew * 0.1)}" rx="${f(ew * 1.55)}" ry="${f(ew * 1.05)}" fill="#3a1840" opacity="${f(0.3 * k)}"${B('xs')}/>`;
    }
  }
  return s;
}

// 눈 뒤: 마족과 반마족의 빛나는 눈, 엘프의 맑은 눈빛
export function eyeGlow(o) {
  const { race, cx, eyeY, eyeGap, ew, eyeCol, uid, detail, stage } = o;
  if (stage === 'baby') return '';
  const k = race === 'demon' ? 1 : race === 'half_demon' ? 0.55 : race === 'elf' ? 0.25 : race === 'beast' && /cat|tiger|lion|wolf/.test(o.beast ?? '') ? 0.3 : 0;
  if (!k) return '';
  const core = mixHex(eyeCol, '#fff2c8', 0.45);
  let s = '';
  for (const sd of [-1, 1]) {
    s += `<ellipse cx="${f(cx + sd * eyeGap)}" cy="${f(eyeY)}" rx="${f(ew * 1.35)}" ry="${f(ew * 0.75)}" fill="${eyeCol}" opacity="${f(0.42 * k)}"${detail ? blur(uid, 'xb') : ''}/>`;
    if (race === 'demon' || race === 'half_demon') s += `<circle cx="${f(cx + sd * eyeGap)}" cy="${f(eyeY - ew * 0.05)}" r="${f(ew * 0.3)}" fill="${core}" opacity="${f(0.5 * k)}"${detail ? blur(uid, 'xs') : ''}/>`;
  }
  return s;
}

// 얼굴 clip 안: 스물부터 해마다 조금씩. 기존 주름(서른넷 넘어)보다 앞서 오는 결
export function ageMarks(o) {
  const { cx, hw, hh, top, eyeY, eyeGap, ew, browY, noseBot, my, mw, nw, skin, uid, detail, age, kid } = o;
  if (kid > 0 || age < 22) return '';
  const sh = mixHex(skin, '#3a1a10', 0.55), lit = mixHex(skin, '#fff4e0', 0.5);
  const a = (from, span, max = 1) => clamp((age - from) / span) * max;
  let s = '';
  const under = a(26, 30, 0.55), fore = a(30, 26, 0.45), crow = a(33, 26, 0.5), jowl = a(44, 30, 0.6), lip = a(50, 30, 0.4);
  const st = (d, op, w = 0.45) => (op > 0.02 ? `<path d="${d}" fill="none" stroke="${sh}" stroke-width="${w}" stroke-linecap="round" opacity="${f(op)}"${detail ? blur(uid, 'xt') : ''}/>` : '');
  // 눈 밑 골
  let d = '';
  for (const sd of [-1, 1]) d += `M${f(cx + sd * (eyeGap - ew * 0.7))} ${f(eyeY + ew * 0.95)} Q${f(cx + sd * eyeGap)} ${f(eyeY + ew * 1.4)} ${f(cx + sd * (eyeGap + ew * 0.85))} ${f(eyeY + ew * 0.85)} `;
  s += st(d, under);
  // 이마: 한 줄에서 세 줄로
  d = `M${f(cx - hw * 0.4)} ${f(browY - hh * 0.2)} Q${cx} ${f(browY - hh * 0.25)} ${f(cx + hw * 0.42)} ${f(browY - hh * 0.2)} `;
  if (age > 40) d += `M${f(cx - hw * 0.34)} ${f(browY - hh * 0.32)} Q${cx} ${f(browY - hh * 0.37)} ${f(cx + hw * 0.34)} ${f(browY - hh * 0.32)} `;
  s += st(d, fore, 0.4);
  if (detail && fore > 0.05) s += `<path d="M${f(cx - hw * 0.4)} ${f(browY - hh * 0.2 + 0.5)} Q${cx} ${f(browY - hh * 0.25 + 0.5)} ${f(cx + hw * 0.42)} ${f(browY - hh * 0.2 + 0.5)}" fill="none" stroke="${lit}" stroke-width="0.35" opacity="${f(fore * 0.5)}"/>`;
  // 눈가 잔주름
  d = '';
  for (const sd of [-1, 1]) for (let i = -1; i <= 1; i++) d += `M${f(cx + sd * (eyeGap + ew * 1.15))} ${f(eyeY + i * 0.7)} l${f(sd * (1.6 + Math.abs(i) * 0.3))} ${f(i * 0.7)} `;
  s += st(d, crow, 0.35);
  // 턱선 아래로 처지는 살
  if (jowl > 0.02) for (const sd of [-1, 1]) s += `<ellipse cx="${f(cx + sd * (mw + 2.4))}" cy="${f(my + (o.chin - my) * 0.55)}" rx="${f(hw * 0.16)}" ry="${f(hh * 0.12)}" fill="${sh}" opacity="${f(jowl * 0.5)}"${detail ? blur(uid, 'xb') : ''}/>`;
  // 윗입술 위 세로 주름
  if (lip > 0.02) { d = ''; for (const dx of [-0.5, -0.2, 0.2, 0.5]) d += `M${f(cx + dx * mw)} ${f(my - 2.6)} l0 1.4 `; s += st(d, lip, 0.3); }
  // 콧방울 옆 골 (서른 앞뒤로 천천히)
  d = ''; for (const sd of [-1, 1]) d += `M${f(cx + sd * (nw + 0.5))} ${f(noseBot - 2.2)} Q${f(cx + sd * (nw + 1.6))} ${f(noseBot - 0.6)} ${f(cx + sd * (nw + 1.1))} ${f(noseBot + 0.6)} `;
  s += st(d, a(24, 30, 0.4), 0.4);
  return s;
}

// 앞머리 뒤: 관자놀이부터 세는 머리 (온통 희어지기 전)
export function grayTemples(o) {
  const { race, cx, hw, hh, top, eyeY, age, gray, uid, detail, covered } = o;
  if (race === 'elf' || covered || age < 34 || gray > 0.75) return '';
  const k = clamp((age - 34) / 18) * (1 - gray) * 0.8;
  if (k < 0.04) return '';
  const r = rngFrom(hashStr('gt' + o.key));
  let d = '';
  for (const sd of [-1, 1]) for (let i = 0; i < (detail ? 7 : 3); i++) {
    const x = cx + sd * hw * (0.86 + r() * 0.16), y = top + hh * (0.45 + r() * 0.35);
    d += `M${f(x)} ${f(y)} q${f(sd * 0.6)} ${f(2 + r() * 2)} ${f(sd * 0.2)} ${f(4 + r() * 3)} `;
  }
  return `<path d="${d}" fill="none" stroke="#ddd8cf" stroke-width="0.4" stroke-linecap="round" opacity="${f(k)}"/>`;
}

// 맨 끝: 왼쪽 위에서 들어오는 따뜻한 빛과 오른쪽 아래의 차가운 그늘 (큰 초상만, 섞기 모드로 색을 살린다)
export function keyLight(uid, H) {
  // 섞기 모드(mix-blend-mode)는 폰에서 합성 층을 따로 만들어 무거워서, 보통 투명도 그러데이션 두 장으로 같은 느낌을 낸다
  return `<defs><radialGradient id="${uid}xL" cx="26%" cy="20%" r="55%"><stop offset="0" stop-color="#ffd59a" stop-opacity="0.2"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${uid}xN" cx="30%" cy="28%" r="85%"><stop offset="0.55" stop-color="#141a2c" stop-opacity="0"/><stop offset="1" stop-color="#141a2c" stop-opacity="0.42"/></radialGradient></defs>`
    + `<rect x="0" y="0" width="100" height="${H}" fill="url(#${uid}xL)"/><rect x="0" y="0" width="100" height="${H}" fill="url(#${uid}xN)"/>`;
}

// 얼굴 clip 안: 얼굴이 둥근 덩어리로 보이게 가장자리를 가라앉힌다 (빛 쪽 왼쪽 위가 가운데)
export function faceForm(uid, m, dark, detail) {
  const { cx, top, hw, hh } = m;
  return `<defs><radialGradient id="${uid}xF" cx="44%" cy="44%" r="62%"><stop offset="0.55" stop-color="${dark}" stop-opacity="0"/><stop offset="0.85" stop-color="${dark}" stop-opacity="${detail ? 0.28 : 0.2}"/><stop offset="1" stop-color="${dark}" stop-opacity="${detail ? 0.55 : 0.4}"/></radialGradient></defs>`
    + `<rect x="${f(cx - hw - 1)}" y="${f(top - 1)}" width="${f(hw * 2 + 2)}" height="${f(hh * 2 + 2)}" fill="url(#${uid}xF)"/>`;
}

// 옷 위: 몸통 모양 그대로(clip에 몸통을 다시 씀) 주름 골과 빛, 빛 반대쪽 그늘 (큰 초상만)
export function clothFolds(uid, m) {
  const { cx, sw, sy, baseY, H, male, key } = m;
  const r = rngFrom(hashStr('fold' + key));
  const bot = H;
  let dark = '', light = '';
  // 어깨에서 가슴 가운데로 처지는 주름, 겨드랑이에서 아래로 떨어지는 주름
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const x0 = cx + sd * sw * (0.4 + i * 0.2 + r() * 0.05), y0 = sy + 3 + i * 4;
      const x1 = cx + sd * sw * (0.26 + i * 0.12 + r() * 0.08), y1 = baseY + 22 + i * 8 + r() * 6;
      const c = `M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2 + sd * 1.5)} ${f((y0 + y1) / 2 + 2)} ${f(x1)} ${f(y1)}`;
      dark += c + ' '; if (i === 0) light += c + ' ';
    }
    const ax = cx + sd * sw * 0.78;
    dark += `M${f(ax)} ${f(sy + 8)} Q${f(ax - sd * 2)} ${f(sy + 22)} ${f(ax - sd * 1)} ${f(bot)} `;
  }
  // clipPath의 use는 도형 하나만 가리킬 수 있어 묶음(g)을 못 쓴다: 몸통 알파를 흰색으로 바꾼 mask를 쓴다
  return `<defs><filter id="${uid}xW" x="0" y="0" width="100" height="${H}" filterUnits="userSpaceOnUse"><feFlood flood-color="#fff"/><feComposite in2="SourceAlpha" operator="in"/></filter><mask id="${uid}xU" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="${H}"><use href="#${uid}xT" filter="url(#${uid}xW)"/></mask>`
    + `<linearGradient id="${uid}xV" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#ffe9c4" stop-opacity="0.16"/><stop offset="0.45" stop-color="#ffe9c4" stop-opacity="0"/><stop offset="0.62" stop-color="#0a0706" stop-opacity="0"/><stop offset="1" stop-color="#0a0706" stop-opacity="0.45"/></linearGradient></defs>`
    + `<g mask="url(#${uid}xU)">`
    + `<rect x="0" y="${f(sy - 8)}" width="100" height="${f(bot - sy + 8)}" fill="url(#${uid}xV)"/>`
    + `<path d="${dark}" fill="none" stroke="#0a0706" stroke-width="${male ? 2.4 : 2}" stroke-linecap="round" opacity="0.32" filter="url(#${uid}xb)"/>`
    + `<path d="${light}" fill="none" stroke="#fff0d4" stroke-width="0.9" stroke-linecap="round" opacity="0.1" transform="translate(-1.1 -0.8)" filter="url(#${uid}xs)"/>`
    + `<rect x="0" y="${f(bot - 22)}" width="100" height="22" fill="#0a0706" opacity="0.18" filter="url(#${uid}xb)"/>`
    + `</g>`;
}
