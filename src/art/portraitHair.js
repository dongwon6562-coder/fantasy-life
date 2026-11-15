// 초상의 머리카락과 수염.
// 머리 모양 하나는 세 겹으로 그린다: back(몸 뒤) · mid(옷 위, 얼굴 옆) · front(얼굴 위).
import { f, spline, arch, lerp, clamp } from './portraitKit.js';

/** 그 사람의 머리 모양 고르기. roll은 타고난 값(0~1)이라 나이가 들어도 같은 계열을 유지한다. */
export function hairStyleOf({ male, stage, roll, old, race, beast }) {
  if (stage === 'baby') return 'wisp';
  if (race === 'beast' && beast === 'hawk') return 'feathers';
  if (race === 'beast' && beast === 'lion' && male && stage !== 'child') return 'mane';
  if (male) {
    if (stage === 'child') return roll < 0.45 ? 'short' : roll < 0.8 ? 'shag' : 'crop';
    if (race === 'elf' || race === 'half_elf') return roll < 0.5 ? 'longm' : roll < 0.8 ? 'tail' : 'side';
    if (old > 0.5 && roll < 0.42) return 'bald';
    if (old > 0.12 && roll < 0.62) return 'recede';
    return ['crop', 'short', 'side', 'back', 'shag', 'tail', 'longm', 'short', 'side'][Math.floor(roll * 9)];
  }
  if (stage === 'child') return roll < 0.4 ? 'braids' : roll < 0.75 ? 'long' : 'bob';
  if (race === 'elf') return roll < 0.6 ? 'long' : roll < 0.8 ? 'braid' : 'updo';
  if (race === 'dwarf') return roll < 0.5 ? 'braids' : roll < 0.8 ? 'braid' : 'bun'; // 드워프 여인은 굵게 땋는다
  if (old > 0.55) return roll < 0.6 ? 'bun' : roll < 0.85 ? 'updo' : 'long';
  return ['long', 'braid', 'bun', 'tailf', 'long', 'updo', 'bob', 'braid', 'long'][Math.floor(roll * 9)];
}

/**
 * h: { cx, cy, hw, hh, top, chin, eyeY, browY, uid, detail, hair, dark, light, wave, part(-1|1), peak, r, covered }
 * covered: 쓰개가 가리는 범위 ('top' = 정수리와 옆머리 모두, 'crown' = 정수리만, false)
 */
export function drawHair(style, h) {
  const { cx, cy, hw, hh, top, chin, browY, uid, detail, hair, dark, light, part } = h;
  const out = { back: '', mid: '', front: '', defs: '' };
  const fillG = `url(#${uid}hg)`;
  const line = `stroke="${dark}" stroke-width="0.5" stroke-linejoin="round" stroke-linecap="round"`;
  out.defs += `<linearGradient id="${uid}hg" x1="0.15" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="0.45" stop-color="${hair}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
  const hlBase = top + hh * (0.33 + h.peak * 0.05);

  // 정수리 덮개
  const cap = ({ v = 2, drop = 0, hl = hlBase, peak = 0, recede = 0, sideIn = 0.955, flare = 0, lock = 0 }) => {
    const sideY = cy + drop;
    const outer = [[cx, top - v * 1.2], [cx + hw * 0.52, top - v * 1.02 + hh * 0.03], [cx + hw * 0.93 + v * 0.62, top + hh * 0.3], [cx + hw + v * 0.72, cy - hh * 0.12], [cx + hw * 0.99 + v * 0.55 + flare, sideY]];
    if (drop > hh * 0.3) outer.splice(4, 0, [cx + hw * 0.99 + v * 0.66 + flare * 0.5, cy + drop * 0.5]);
    const jit = () => (h.r() - 0.5) * hh * 0.035;
    const inner = [[cx, hl + peak], [cx + hw * 0.22, hl - recede * hh * 0.02 + jit()], [cx + hw * (0.52 - recede * 0.04), hl + hh * 0.03 - recede * hh * 0.1], [cx + hw * (0.82 - recede * 0.1), hl + hh * 0.2 - recede * hh * 0.04], [cx + hw * 0.915, cy - hh * 0.2]];
    if (drop > hh * 0.3) inner.push([cx + hw * 0.93, cy + drop * 0.45]);
    if (lock) {
      // 얼굴 옆으로 흘러내려 끝이 모이는 머리채
      const wv = h.wave * 1.2;
      outer.push([cx + hw + v * 0.8 + flare + wv, lerp(sideY, chin, 0.55)], [cx + hw + v * 0.5 + flare * 0.8 - wv * 0.5, chin + lock * 0.35], [cx + hw * 0.86, chin + lock]);
      inner.push([cx + hw * 0.9, lerp(sideY, chin, 0.6)], [cx + hw * 0.8 + wv * 0.4, chin + lock * 0.5], [cx + hw * 0.82, chin + lock - 0.6]);
    } else inner.push([cx + hw * sideIn, sideY]);
    const o = arch(cx, outer), i = arch(cx, inner).reverse();
    const d = `${spline(o)} L${f(i[0][0])} ${f(i[0][1])} ${spline(i, false, false)}Z`;
    return { d, sideY: lock ? chin : sideY, v, hl };
  };
  const strands = (c, { n = 11, ox = part * hw * 0.22, oy = top - c.v * 0.5, back = false } = {}) => {
    if (!detail) return '';
    let d1 = '', d2 = '';
    for (let k = 0; k < n; k++) {
      const u = -1 + (2 * (k + 0.5)) / n + (h.r() - 0.5) * 0.08;
      const a = Math.abs(u);
      const tx = cx + u * (hw + c.v * 0.35), ty = lerp(c.hl + 1.5, c.sideY, a ** 1.7);
      const sx = cx + ox + u * 1.5, sy = oy;
      const qx = (sx + tx) / 2 + u * hw * 0.24, qy = Math.min(sy, ty) - (1 - a) * 1.2 + a * hh * 0.02 - (back ? 2 : 0);
      const seg = `M${f(sx)} ${f(sy)} Q${f(qx)} ${f(qy)} ${f(tx)} ${f(ty)} `;
      if (k % 3 === 1) d2 += seg; else d1 += seg;
    }
    return `<g clip-path="url(#${uid}k)" fill="none" stroke-linecap="round"><path d="${d1}" stroke="${dark}" stroke-width="0.45" opacity="0.55"/><path d="${d2}" stroke="${light}" stroke-width="0.5" opacity="0.4"/><path d="M${f(cx - hw * 0.82)} ${f(top + hh * 0.3)} Q${f(cx - hw * 0.5)} ${f(top - c.v * 0.3)} ${f(cx - hw * 0.02)} ${f(top - c.v * 0.62)}" stroke="${light}" stroke-width="2.2" opacity="0.28"/></g>`;
  };
  const capDraw = (c, extra = '') => {
    out.defs += `<clipPath id="${uid}k"><path d="${c.d}"/></clipPath>`;
    return `<path d="${c.d}" fill="${fillG}" ${line}/>${extra}`;
  };
  // 이마 그늘 (머리카락이 이마에 드리우는)
  const castShadow = (c) => `<path d="M${f(cx - hw * 0.9)} ${f(c.hl + hh * 0.22)} Q${cx} ${f(c.hl - 1)} ${f(cx + hw * 0.9)} ${f(c.hl + hh * 0.22)} L${f(cx + hw * 0.9)} ${f(c.hl + hh * 0.34)} Q${cx} ${f(c.hl + 2.2)} ${f(cx - hw * 0.9)} ${f(c.hl + hh * 0.34)}Z" fill="#2a120a" opacity="0.14" clip-path="url(#${uid}h)"/>`;

  // 앞머리
  const fringe = (kind, c) => {
    const hl = c.hl;
    if (kind === 'sweep') {
      const s = -part; // 넘기는 방향
      const d = `M${f(cx + part * hw * 0.5)} ${f(hl - hh * 0.1)} C${f(cx + part * hw * 0.1)} ${f(hl + hh * 0.1)} ${f(cx + s * hw * 0.5)} ${f(hl + hh * 0.2)} ${f(cx + s * hw * 0.97)} ${f(browY - hh * 0.02)} L${f(cx + s * (hw + c.v * 0.4))} ${f(hl + hh * 0.1)} C${f(cx + s * hw * 0.7)} ${f(hl - hh * 0.16)} ${f(cx + part * hw * 0.1)} ${f(hl - hh * 0.3)} ${f(cx + part * hw * 0.5)} ${f(hl - hh * 0.1)}Z`;
      return `<path d="${d}" fill="${fillG}" ${line}/>${detail ? `<path d="M${f(cx + part * hw * 0.3)} ${f(hl - hh * 0.12)} Q${f(cx + s * hw * 0.3)} ${f(hl + hh * 0.06)} ${f(cx + s * hw * 0.9)} ${f(browY - hh * 0.1)} M${f(cx + part * hw * 0.1)} ${f(hl - hh * 0.18)} Q${f(cx + s * hw * 0.5)} ${f(hl - hh * 0.04)} ${f(cx + s * hw * 0.96)} ${f(hl + hh * 0.16)}" fill="none" stroke="${dark}" stroke-width="0.4" opacity="0.6"/>` : ''}`;
    }
    if (kind === 'bangs') {
      const y = browY - hh * 0.06;
      const n = 6; let edge = '';
      for (let k = n - 1; k >= 0; k--) { const u0 = -1 + (2 * (k + 1)) / n, u1 = -1 + (2 * k) / n; const yy = (u) => y + Math.abs(u) * 1.6 - (1 - Math.abs(u)) * 0.6; edge += `Q${f(cx + ((u0 + u1) / 2) * hw * 0.93)} ${f(yy((u0 + u1) / 2) + 1.3)} ${f(cx + u1 * hw * 0.93)} ${f(yy(u1))} `; }
      const d = `M${f(cx - hw * 0.93)} ${f(y + 1.6)} L${f(cx - hw * 0.95)} ${f(hl + hh * 0.12)} Q${cx} ${f(hl - hh * 0.2)} ${f(cx + hw * 0.95)} ${f(hl + hh * 0.12)} L${f(cx + hw * 0.93)} ${f(y + 1.6)} ${edge}Z`;
      let st = '';
      if (detail) for (let k = 0; k < 9; k++) { const u = -0.9 + k * 0.225; st += `M${f(cx + u * hw * 0.7)} ${f(hl - hh * 0.08)} Q${f(cx + u * hw * 0.86)} ${f((hl + y) / 2)} ${f(cx + u * hw * 0.92)} ${f(y + 0.6)} `; }
      return `<path d="${d}" fill="${fillG}" ${line}/><path d="${st}" fill="none" stroke="${dark}" stroke-width="0.4" opacity="0.45"/>`;
    }
    if (kind === 'curtain') {
      let s2 = '';
      for (const s of [-1, 1]) {
        const px = cx + part * hw * 0.1;
        const d = `M${f(px)} ${f(hl - hh * 0.12)} C${f(cx + s * hw * 0.3)} ${f(hl - hh * 0.1)} ${f(cx + s * hw * 0.76)} ${f(hl - hh * 0.02)} ${f(cx + s * hw * 0.955)} ${f(browY - hh * 0.03)} L${f(cx + s * (hw + c.v * 0.5))} ${f(hl + hh * 0.2)} C${f(cx + s * hw * 0.86)} ${f(hl - hh * 0.2)} ${f(cx + s * hw * 0.36)} ${f(hl - hh * 0.3)} ${f(px)} ${f(hl - hh * 0.12)}Z`;
        s2 += `<path d="${d}" fill="${fillG}" ${line}/>`;
      }
      return s2;
    }
    if (kind === 'tuft') {
      // 이마로 내려온 짧은 머리 몇 가닥 (끝이 둥글다)
      let d = '';
      const n = 4;
      for (let k = 0; k < n; k++) {
        const u = -0.72 + k * (1.44 / (n - 1)) + (h.r() - 0.5) * 0.12; const x = cx + u * hw * 0.8; const len = hh * (0.07 + h.r() * 0.06); const w = hw * 0.26;
        d += `M${f(x - w)} ${f(hl - 1.2)} C${f(x - w * 0.8)} ${f(hl + len * 0.8)} ${f(x - w * 0.1 + part)} ${f(hl + len * 1.1)} ${f(x + w * 0.3 + part)} ${f(hl + len)} C${f(x + w * 0.8)} ${f(hl + len * 0.6)} ${f(x + w)} ${f(hl)} ${f(x + w)} ${f(hl - 1.2)}Z `;
      }
      return `<path d="${d}" fill="${hair}" stroke="${dark}" stroke-width="0.35" stroke-linejoin="round"/>`;
    }
    return '';
  };

  // 땋은 머리: 길을 따라 엇갈린 마디
  const braid = (pts, w0 = 2.6, w1 = 1.6) => {
    let s = '';
    const n = pts.length;
    for (let k = 0; k < n; k++) {
      const [x, y] = pts[k]; const w = lerp(w0, w1, k / (n - 1));
      s += `<ellipse cx="${f(x + (k % 2 ? 0.5 : -0.5))}" cy="${f(y)}" rx="${f(w)}" ry="${f(w * 0.74)}" transform="rotate(${k % 2 ? 24 : -24} ${f(x)} ${f(y)})" fill="${k % 2 ? hair : fillG}" ${line}/>`;
    }
    const [ex, ey] = pts[n - 1];
    s += `<path d="M${f(ex - 1)} ${f(ey + 1)} q-0.6 3 -1.4 4.6 M${f(ex)} ${f(ey + 1.2)} v5 M${f(ex + 1)} ${f(ey + 1)} q0.6 3 1.4 4.6" fill="none" stroke="${hair}" stroke-width="0.8" stroke-linecap="round"/>`;
    return s;
  };
  const along = (x0, y0, x1, y1, n, bow = 0) => { const p = []; for (let k = 0; k < n; k++) { const t = k / (n - 1); p.push([lerp(x0, x1, t) + Math.sin(t * Math.PI) * bow, lerp(y0, y1, t)]); } return p; };

  // 뒤로 늘어뜨린 머리
  const backMass = (toY, spread = 3, v = 3) => {
    const wv = h.wave;
    const R = [];
    const y0 = cy - hh * 0.5;
    const n = 6;
    for (let k = 0; k <= n; k++) { const t = k / n; const y = lerp(y0, toY, t); R.push([cx + hw + v + spread * t + Math.sin(t * 9 + 1) * wv * 1.5, y]); }
    const L = R.map(([x, y]) => [2 * cx - x + Math.sin(y * 0.3) * wv * 0.6, y]).reverse();
    const d = `M${f(cx - hw - v)} ${f(y0)} Q${cx} ${f(top - v * 2.4)} ${f(cx + hw + v)} ${f(y0)} ${spline(R, false, false)} L${f(L[0][0])} ${f(L[0][1])} ${spline(L, false, false)}Z`;
    let st = '';
    if (detail) for (let k = 0; k < 7; k++) { const u = -0.92 + k * 0.307; const x = cx + u * (hw + v + spread * 0.6); if (Math.abs(u) < 0.5) continue; st += `M${f(x)} ${f(cy)} q${f(wv * 2 * (k % 2 ? 1 : -1))} ${f((toY - cy) * 0.5)} ${f(u * spread * 0.5)} ${f(toY - cy - 1)} `; }
    return `<path d="${d}" fill="${dark}" stroke="${dark}" stroke-width="0.5"/><path d="${d}" fill="${fillG}" opacity="0.55"/><path d="${st}" fill="none" stroke="${light}" stroke-width="0.5" opacity="0.3"/>`;
  };

  const cov = h.covered;
  const need = (layer) => !(cov === 'top' && layer !== 'back');

  switch (style) {
    case 'wisp': {
      out.front = `<path d="M${f(cx - hw * 0.7)} ${f(top + hh * 0.3)} Q${cx} ${f(top - 3.4)} ${f(cx + hw * 0.7)} ${f(top + hh * 0.3)} Q${cx} ${f(top + 0.6)} ${f(cx - hw * 0.7)} ${f(top + hh * 0.3)}Z" fill="${hair}" opacity="0.55"/><path d="M${f(cx - 4)} ${f(top + 2.4)} q2.4 -4.4 5 -1 q2 -3 4.4 0.4" fill="none" stroke="${hair}" stroke-width="1.1" stroke-linecap="round"/>`;
      break;
    }
    case 'bald': {
      out.front = [-1, 1].map((s) => `<path d="M${f(cx + s * (hw * 0.97))} ${f(cy - hh * 0.3)} Q${f(cx + s * (hw + 2.4))} ${f(cy - hh * 0.2)} ${f(cx + s * (hw + 1.4))} ${f(cy + hh * 0.16)} L${f(cx + s * hw * 0.95)} ${f(cy + hh * 0.14)} Q${f(cx + s * hw * 0.9)} ${f(cy - hh * 0.1)} ${f(cx + s * (hw * 0.97))} ${f(cy - hh * 0.3)}Z" fill="${hair}" ${line}/>`).join('')
        + `<path d="M${f(cx - hw * 0.5)} ${f(top + hh * 0.14)} Q${f(cx - hw * 0.2)} ${f(top + hh * 0.04)} ${f(cx + hw * 0.1)} ${f(top + hh * 0.07)}" fill="none" stroke="#fff6e6" stroke-width="2" stroke-linecap="round" opacity="0.2"/>`;
      break;
    }
    case 'recede': {
      const c = cap({ v: 1.5, drop: -hh * 0.02, recede: 1, hl: hlBase - hh * 0.06, peak: hh * 0.04 });
      out.front = capDraw(c, strands(c, { n: 9 }));
      break;
    }
    case 'crop': {
      const c = cap({ v: 1.3, drop: -hh * 0.12, hl: hlBase - hh * 0.02, peak: h.peak * 1.6 });
      out.front = capDraw(c, strands(c, { n: 13 })) + castShadow(c);
      break;
    }
    case 'short': {
      const c = cap({ v: 2.4, drop: -hh * 0.04, peak: 0.5 });
      out.front = capDraw(c, strands(c, { n: 14 })) + (h.peak > 0.6 ? fringe('tuft', c) : '') + castShadow(c);
      break;
    }
    case 'side': {
      const c = cap({ v: 2.5, drop: -hh * 0.02 });
      out.front = capDraw(c, strands(c, { ox: part * hw * 0.45 })) + fringe('sweep', c) + castShadow(c);
      break;
    }
    case 'back': {
      const c = cap({ v: 2.8, drop: 0, hl: hlBase - hh * 0.05, peak: hh * 0.05 + h.peak * 1.2, recede: 0.35 });
      out.front = capDraw(c, strands(c, { n: 13, ox: 0, back: true }));
      break;
    }
    case 'shag': {
      const c = cap({ v: 3, drop: hh * 0.34, flare: 1 });
      out.front = capDraw(c, strands(c)) + fringe('curtain', c) + castShadow(c);
      break;
    }
    case 'tail': {
      const c = cap({ v: 2, drop: -hh * 0.02, hl: hlBase - hh * 0.03, peak: h.peak * 1.4, recede: 0.2 });
      out.front = capDraw(c, strands(c, { ox: 0, back: true }));
      out.back = `<path d="M${f(cx + part * (hw * 0.5))} ${f(cy + hh * 0.5)} q${f(part * 9)} 8 ${f(part * 6)} 22 q${f(-part * 2)} 6 ${f(part * 1)} 12 l${f(-part * 5.4)} 0 q${f(-part * 1)} -8 ${f(part * 0.4)} -13 q${f(part * 1.4)} -10 ${f(-part * 3)} -19Z" fill="${dark}" ${line}/>`;
      break;
    }
    case 'longm': {
      const c = cap({ v: 2.6, drop: hh * 0.3, flare: 1, lock: 5 });
      out.back = backMass(chin + 9, 2.4, 2.6);
      out.front = capDraw(c, strands(c)) + fringe('curtain', c);
      break;
    }
    case 'mane': {
      const c = cap({ v: 6, drop: hh * 0.3, flare: 4, lock: 8 });
      out.back = backMass(chin + 16, 9, 7);
      out.front = capDraw(c, strands(c, { n: 15 })) + fringe('tuft', c);
      break;
    }
    case 'feathers': {
      // 매 부족: 머리카락 대신 뒤로 누운 깃
      let fe = '';
      const n = 9;
      for (let k = 0; k < n; k++) {
        const u = -1 + (2 * k) / (n - 1); const bx = cx + u * hw * 0.86, by = top + hh * (0.3 + Math.abs(u) * 0.34); const len = 11 - Math.abs(u) * 3;
        const tx = bx + u * 5.5, ty = by - len;
        fe += `<path d="M${f(bx - 2.4)} ${f(by)} Q${f(bx - 2.6 + u * 2)} ${f(by - len * 0.6)} ${f(tx)} ${f(ty)} Q${f(bx + 2.6 + u * 2)} ${f(by - len * 0.6)} ${f(bx + 2.4)} ${f(by)}Z" fill="${k % 2 ? hair : fillG}" ${line}/><path d="M${f(bx)} ${f(by)} L${f(tx)} ${f(ty + 1)}" stroke="${dark}" stroke-width="0.35" opacity="0.7"/>`;
      }
      const c = cap({ v: 1.4, drop: hh * 0.1, hl: hlBase + hh * 0.02, peak: hh * 0.08 });
      out.front = capDraw(c) + fe;
      out.back = backMass(chin + 4, 1, 2);
      break;
    }
    case 'long': {
      const c = cap({ v: 2.8, drop: hh * 0.3, flare: 1.2, lock: 15 });
      out.back = backMass(104, 5, 3);
      out.front = capDraw(c, strands(c, { ox: part * hw * 0.2 })) + (h.peak > 0.62 ? fringe('bangs', c) : fringe('curtain', c));
      break;
    }
    case 'bob': {
      const c = cap({ v: 3, drop: hh * 0.3, flare: 1.6, lock: 1.5 });
      out.back = backMass(chin + 2, 2, 3);
      out.front = capDraw(c, strands(c)) + fringe(h.peak > 0.4 ? 'bangs' : 'sweep', c) + castShadow(c);
      break;
    }
    case 'braid': {
      const c = cap({ v: 2.5, drop: hh * 0.2 });
      out.front = capDraw(c, strands(c, { ox: part * hw * 0.3 })) + fringe('sweep', c);
      out.mid = braid(along(cx + part * (hw * 0.78), cy + hh * 0.66, cx + part * (hw * 0.5), chin + 27, 9, part * 4.4), 3.3, 2.3);
      break;
    }
    case 'braids': {
      const c = cap({ v: 2.5, drop: hh * 0.2 });
      out.front = capDraw(c, strands(c, { ox: 0 })) + fringe(h.peak > 0.5 ? 'bangs' : 'curtain', c);
      out.mid = [-1, 1].map((s) => braid(along(cx + s * (hw * 0.9), cy + hh * 0.5, cx + s * (hw * 0.8), chin + 18, 7, s * 3), 2.7, 1.9)).join('');
      break;
    }
    case 'bun': {
      const c = cap({ v: 2, drop: -hh * 0.02, hl: hlBase - hh * 0.02 });
      out.back = `<ellipse cx="${cx}" cy="${f(top - 2.2)}" rx="${f(hw * 0.5)}" ry="${f(hw * 0.4)}" fill="${fillG}" ${line}/>${detail ? `<path d="M${f(cx - hw * 0.38)} ${f(top - 2)} q${f(hw * 0.4)} -5 ${f(hw * 0.76)} 0 M${f(cx - hw * 0.25)} ${f(top - 0.5)} q${f(hw * 0.26)} -3.4 ${f(hw * 0.5)} 0" fill="none" stroke="${dark}" stroke-width="0.4" opacity="0.7"/>` : ''}`;
      out.front = capDraw(c, strands(c, { ox: 0, back: true })) + (h.peak > 0.55 ? fringe('sweep', c) : '');
      break;
    }
    case 'updo': {
      const c = cap({ v: 3.4, drop: hh * 0.02, hl: hlBase - hh * 0.02 });
      const band = along(cx - hw * 0.84, top + hh * 0.22, cx + hw * 0.84, top + hh * 0.22, 9, 0).map(([x, y]) => [x, y - (1 - ((x - cx) / (hw * 0.84)) ** 2) * (hh * 0.26)]);
      out.front = capDraw(c, strands(c, { ox: 0, back: true })) + (detail ? braid(band, 1.9, 1.9).replace(/<path[^>]*stroke-width="0.8"[^>]*\/>$/, '') : '') + (h.peak > 0.6 ? fringe('sweep', c) : '');
      break;
    }
    case 'tailf': {
      const c = cap({ v: 2.3, drop: hh * 0.02 });
      out.front = capDraw(c, strands(c, { ox: 0, back: true })) + (h.peak > 0.45 ? fringe('sweep', c) : fringe('curtain', c));
      {
        const x0 = cx + part * hw * 0.62, y0 = cy + hh * 0.86;
        const R1 = [[x0 + part * 2.2, y0], [x0 + part * 5.4, y0 + 7], [x0 + part * 4.6, y0 + 16], [x0 + part * 1.4, y0 + 26]];
        const R2 = [[x0 - part * 1.6, y0 + 25], [x0 + part * 0.6, y0 + 15], [x0 + part * 1.2, y0 + 7], [x0 - part * 0.6, y0 + 1]];
        out.mid = `<path d="${spline(R1)} L${f(R2[0][0])} ${f(R2[0][1])} ${spline(R2, false, false)}Z" fill="${fillG}" ${line}/>${detail ? `<path d="M${f(x0 + part * 2.4)} ${f(y0 + 4)} q${f(part * 2)} 9 ${f(-part * 1.6)} 20" fill="none" stroke="${dark}" stroke-width="0.4" opacity="0.6"/>` : ''}<path d="M${f(x0 - part * 0.4)} ${f(y0 + 2)} l${f(part * 3)} 0.8" stroke="#8a6d38" stroke-width="1.2" stroke-linecap="round"/>`;
      }
      break;
    }
    default: {
      const c = cap({});
      out.front = capDraw(c, strands(c));
    }
  }
  if (!need('front')) { out.front = ''; out.mid = cov === 'top' && (style === 'braid' || style === 'braids' || style === 'tailf') ? out.mid : ''; }
  if (cov === 'top') out.back = style === 'long' || style === 'longm' ? out.back : '';
  if (cov === 'crown' && out.back && (style === 'bun')) out.back = '';
  return out;
}

/** 수염 종류 고르기 */
export function beardOf({ male, stage, roll, old, race, job, rough }) {
  if (!male || stage === 'baby' || stage === 'child' || stage === 'teen') return null;
  if (race === 'elf') return null;
  if (race === 'dwarf') return roll < 0.55 ? 'braided' : 'long';
  if (race === 'half_elf') return roll < 0.2 ? 'stubble' : null;
  if (rough) return roll < 0.55 ? 'stubble' : roll < 0.85 ? 'full' : 'short'; // 면도할 형편이 못 되는 사람
  const wise = job === 'elder' || job === 'court_mage' || job === 'hedge_mage' || job === 'bishop' || job === 'scholar';
  if (old > 0.45 && wise && roll < 0.7) return 'long';
  const table = stage === 'adult'
    ? [['none', 0.34], ['stubble', 0.22], ['mustache', 0.07], ['goatee', 0.08], ['short', 0.17], ['full', 0.12]]
    : [['none', 0.2], ['stubble', 0.14], ['mustache', 0.12], ['goatee', 0.1], ['short', 0.2], ['full', 0.18], ['long', 0.06]];
  let x = roll;
  for (const [k, w] of table) { x -= w; if (x < 0) return k === 'none' ? null : k; }
  return null;
}

/**
 * 수염. m: { my(입 높이), mw(입 반폭), jawW, chinW, noseBot }
 * 돌려주는 것: { under(입 아래에 깔리는 것), over(콧수염, 입 위) }
 */
export function drawBeard(kind, h, m) {
  const { cx, cy, hw, hh, chin, uid, detail, hair, dark, light } = h;
  const fillG = `url(#${uid}hg)`;
  const line = `stroke="${dark}" stroke-width="0.5" stroke-linejoin="round"`;
  const res = { under: '', over: '' };
  if (!kind) return res;
  const stache = (droop = 0, thick = 1) => `<path d="M${cx} ${f(m.my - 2.5 * thick)} C${f(cx + m.mw * 0.5)} ${f(m.my - 3.6 * thick)} ${f(cx + m.mw * 1.0)} ${f(m.my - 1.4)} ${f(cx + m.mw + 2)} ${f(m.my + 0.8 + droop)} C${f(cx + m.mw * 0.7)} ${f(m.my - 0.2)} ${f(cx + m.mw * 0.3)} ${f(m.my - 0.9)} ${cx} ${f(m.my - 0.6)} C${f(cx - m.mw * 0.3)} ${f(m.my - 0.9)} ${f(cx - m.mw * 0.7)} ${f(m.my - 0.2)} ${f(cx - m.mw - 2)} ${f(m.my + 0.8 + droop)} C${f(cx - m.mw * 1.0)} ${f(m.my - 1.4)} ${f(cx - m.mw * 0.5)} ${f(m.my - 3.6 * thick)} ${cx} ${f(m.my - 2.5 * thick)}Z" fill="${fillG}" ${line}/>${detail ? `<path d="M${f(cx - m.mw * 0.6)} ${f(m.my - 2.4)} l-1.6 1.8 M${f(cx + m.mw * 0.6)} ${f(m.my - 2.4)} l1.6 1.8 M${f(cx - 1)} ${f(m.my - 2.4)} v1.4 M${f(cx + 1)} ${f(m.my - 2.4)} v1.4" stroke="${dark}" stroke-width="0.35" opacity="0.6"/>` : ''}`;
  const stubble = (op) => `<path d="M${f(cx - hw * 0.93)} ${f(cy + hh * 0.2)} C${f(cx - hw * 0.8)} ${f(cy + hh * 0.5)} ${f(cx - m.mw - 3)} ${f(m.my - 3.4)} ${cx} ${f(m.my - 3.2)} C${f(cx + m.mw + 3)} ${f(m.my - 3.4)} ${f(cx + hw * 0.8)} ${f(cy + hh * 0.5)} ${f(cx + hw * 0.93)} ${f(cy + hh * 0.2)} L${f(cx + hw)} ${f(chin + 2)} L${f(cx - hw)} ${f(chin + 2)}Z" fill="${hair}" opacity="${op}" clip-path="url(#${uid}h)"/>`;
  if (kind === 'stubble') { res.under = stubble(0.2); return res; }
  if (kind === 'mustache') { res.under = stubble(0.07); res.over = stache(1.2, 1.15); return res; }
  if (kind === 'goatee') {
    res.under = stubble(0.06) + `<path d="M${f(cx - m.mw - 0.6)} ${f(m.my + 0.6)} C${f(cx - m.mw - 1.6)} ${f(m.my + 5)} ${f(cx - hw * m.chinW - 1)} ${f(chin + 1)} ${cx} ${f(chin + 3.4)} C${f(cx + hw * m.chinW + 1)} ${f(chin + 1)} ${f(cx + m.mw + 1.6)} ${f(m.my + 5)} ${f(cx + m.mw + 0.6)} ${f(m.my + 0.6)} C${f(cx + m.mw * 0.6)} ${f(m.my + 4.4)} ${f(cx - m.mw * 0.6)} ${f(m.my + 4.4)} ${f(cx - m.mw - 0.6)} ${f(m.my + 0.6)}Z" fill="${fillG}" ${line}/>`;
    res.over = stache(1, 1);
    return res;
  }
  const len = { short: 1.6, full: 6.5, long: 17, braided: 15 }[kind] ?? 3;
  const wide = kind === 'braided' ? 3 : kind === 'long' ? 0.6 : kind === 'full' ? 1.2 : 0.3;
  // 얼굴 윤곽(m.headR: 광대 3 → 턱 5 → 턱끝 8)을 따라간다
  const H = m.headR;
  const taper = kind === 'braided' ? 0.85 : len > 10 ? 0.55 : 1;
  const outerR = [[H[3][0] - 0.1, H[3][1] - hh * 0.1], [H[4][0] + 0.3 + wide * 0.4, H[4][1]], [H[5][0] + 0.6 + wide, H[5][1] + len * 0.08], [H[6][0] * taper + cx * (1 - taper) + 0.9 + wide, H[6][1] + len * 0.34], [(H[7][0] - cx) * taper * 0.9 + cx + 0.6, H[7][1] + len * 0.78], [cx, chin + len]];
  const innerR = [[cx, m.my - 2.7], [cx + m.mw * 0.85, m.my - 2.4], [cx + m.mw + 2.8, m.my - 0.5], [H[4][0] - hw * 0.13, H[4][1] - hh * 0.05], [H[3][0] - hw * 0.1, H[3][1] - hh * 0.08]];
  const o = arch(cx, outerR.slice().reverse()), i = arch(cx, innerR).reverse();
  // o: 왼쪽 위 → 아래 가운데 → 오른쪽 위, i: 오른쪽 위 → 가운데 → 왼쪽 위
  const d = `${spline(o)} L${f(i[0][0])} ${f(i[0][1])} ${spline(i, false, false)}Z`;
  let st = '';
  if (detail) {
    const n = len > 10 ? 11 : 8;
    for (let k = 0; k < n; k++) { const u = -0.9 + (1.8 * k) / (n - 1); const x = cx + u * hw * 0.7; const y0 = m.my + 3 + Math.abs(u) * 2; const y1 = chin + len * (1 - Math.abs(u) * 0.75) - 0.6; st += `M${f(x)} ${f(y0)} Q${f(x + u * 1.6)} ${f((y0 + y1) / 2)} ${f(x * 0.6 + cx * 0.4)} ${f(y1)} `; }
  }
  res.under = `<path d="${d}" fill="${fillG}" ${line}/><path d="${st}" fill="none" stroke="${dark}" stroke-width="0.4" opacity="0.5"/>${detail ? `<path d="M${f(cx - hw * 0.5)} ${f(cy + hh * 0.62)} q2 ${f(len * 0.4 + 3)} ${f(hw * 0.3)} ${f(len * 0.7 + 4)}" fill="none" stroke="${light}" stroke-width="0.9" opacity="0.3"/>` : ''}`;
  // 입 둘레는 비워 둔다 (입술이 보이게)
  if (kind === 'braided') {
    for (const s of [-1, 1]) {
      let b = '';
      for (let k = 0; k < 4; k++) { const y = chin + len * 0.55 + k * 3; const x = cx + s * (4.6 - k * 0.5); b += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="2" ry="1.6" transform="rotate(${k % 2 ? 22 : -22} ${f(x)} ${f(y)})" fill="${k % 2 ? hair : fillG}" ${line}/>`; }
      res.under += b + `<rect x="${f(cx + s * 3.2 - 1.6)}" y="${f(chin + len * 0.55 + 11.4)}" width="3.2" height="1.8" rx="0.5" fill="#a8935e" stroke="#4a3a1c" stroke-width="0.35"/>`;
    }
  }
  res.over = stache(kind === 'short' ? 0.6 : 1.6, kind === 'short' ? 0.9 : 1.2);
  void clamp;
  return res;
}
