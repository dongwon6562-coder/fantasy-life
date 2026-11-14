// 인물 초상: 얼굴 부위를 조합해 SVG로 그린다.
// - 같은 사람은 늘 같은 얼굴 (이름·성·번호로 정한 씨앗).
// - 부모가 명단에 있으면 머리색·피부·눈색·얼굴형을 부모에게서 물려받는다.
// - 나이(아기·아이·청소년·어른·중년·노년), 성별, 직업에 따라 달라진다.
// 그림체: 잉크 선 + 칙칙한 물감. 큰 눈·둥근 볼 같은 만화풍은 피한다.

const INK = '#2a1d14';

// 레오니아 남부 인간: 밝은 쪽이 많지만 고르게 섞인다.
const SKIN = ['#f0d4bb', '#e7c3a2', '#dcb08c', '#cc9b74', '#b4825d', '#946546'];
const SKIN_W = [3, 4, 4, 3, 2, 1];
const HAIR = ['#1c1511', '#33241a', '#4d3322', '#6b4229', '#86391f', '#a2804c', '#c6a874', '#655d54'];
const HAIR_W = [2, 4, 4, 3, 1.4, 2, 1.2, 0.8];
const EYES = ['#3a2819', '#57401f', '#4b6448', '#4b6178', '#6c6a5c', '#7a5c2c'];
const EYES_W = [4, 3, 1.4, 1.6, 1, 1];

// 32비트 해시 (문자열 → 0~1 난수열)
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngFrom(seed) {
  let s = seed || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function weighted(r, weights) {
  const tot = weights.reduce((a, b) => a + b, 0);
  let x = r * tot;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
  return weights.length - 1;
}
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
const shade = (c, t) => mixHex(c, '#1a120c', t);
const tint = (c, t) => mixHex(c, '#f4ead8', t);
const f = (n) => Math.round(n * 10) / 10;

const keyOf = (p) => `${p.id}|${p.name}|${p.lastName}|${p.sex}`;

// 타고난 생김새. 부모가 있으면 물려받는다.
const geneCache = new Map();
function ownGenes(p) {
  const r = rngFrom(hashStr('g' + keyOf(p)));
  return {
    skin: weighted(r(), SKIN_W),
    hair: weighted(r(), HAIR_W),
    eyes: weighted(r(), EYES_W),
    jaw: r(), long: r(), nose: Math.floor(r() * 4), noseW: r(), brow: r(),
    eyeShape: r(), mouth: r(), ears: r(), freckles: r() < 0.16, lips: r(),
  };
}
function genesOf(game, p, depth = 0) {
  const k = keyOf(p);
  if (geneCache.has(k)) return geneCache.get(k);
  let g = ownGenes(p);
  const pick = (id) => (id != null && game && depth < 6 ? game.people.find((x) => x.id === id) : null);
  const fa = pick(p.fatherId), mo = pick(p.motherId);
  if (fa || mo) {
    const r = rngFrom(hashStr('i' + k));
    const gf = fa ? genesOf(game, fa, depth + 1) : g;
    const gm = mo ? genesOf(game, mo, depth + 1) : g;
    const inherit = {};
    for (const key of Object.keys(g)) {
      const roll = r();
      // 가끔(12%) 부모 누구도 닮지 않은 자기만의 특징
      inherit[key] = roll < 0.12 ? g[key] : roll < 0.56 ? gf[key] : gm[key];
    }
    // 얼굴 비율은 두 부모의 중간쯤에서 살짝 흔들린다
    for (const key of ['jaw', 'long', 'noseW', 'brow', 'eyeShape', 'mouth', 'ears', 'lips']) {
      inherit[key] = Math.min(1, Math.max(0, (gf[key] + gm[key]) / 2 + (r() - 0.5) * 0.35));
    }
    g = inherit;
  }
  geneCache.set(k, g);
  return g;
}

function stageOf(ageY) {
  if (ageY < 3) return 'baby';
  if (ageY < 13) return 'child';
  if (ageY < 18) return 'teen';
  if (ageY < 40) return 'adult';
  if (ageY < 60) return 'middle';
  return 'elder';
}

// 직업별 옷
function outfit(job, sex, stage, r) {
  if (stage === 'baby') return { kind: 'swaddle', main: '#cdbf9f', trim: '#a8987a' };
  if (stage === 'child' || job === 'child') {
    const opts = ['#6b5b3e', '#5a6248', '#73563f', '#4f5a62', '#7a6a4a'];
    return { kind: 'tunic', main: opts[Math.floor(r * opts.length)], trim: '#3a2e22' };
  }
  switch (job) {
    case 'farmer': return { kind: sex === 'f' ? 'dress' : 'tunic', main: ['#6e6040', '#5f6843', '#7b5e3c'][Math.floor(r * 3)], trim: '#43381f', scarf: sex === 'f' && r > 0.5 ? '#a58f62' : null };
    case 'laborer': return { kind: 'tunic', main: '#6a5640', trim: '#3d3022' };
    case 'old_knight': return { kind: 'mail', main: '#7d8186', trim: '#3c4a66', cloth: '#34405a' };
    case 'guard': return { kind: 'mail', main: '#80848a', trim: '#2f4a73', cloth: '#2f4a73' };
    case 'adventurer': return { kind: 'leather', main: '#5b4330', trim: '#2f241a' };
    case 'hunter': return { kind: 'leather', main: '#4f5236', trim: '#2c2a1c', hood: r > 0.6 };
    case 'merchant': case 'shopkeeper': return { kind: 'doublet', main: ['#6e2f2a', '#2f5248', '#5a4a26'][Math.floor(r * 3)], trim: '#c9a25a' };
    case 'priest': return { kind: 'robe', main: '#e3dccb', trim: '#c9a25a', stole: true };
    case 'hedge_mage': return { kind: 'cloak', main: '#2c3550', trim: '#7fb3d5', hood: true };
    case 'smith': return { kind: 'apron', main: '#5c4a3a', trim: '#2a201a', apron: '#4a3526' };
    case 'baker': case 'cook': case 'innkeeper': return { kind: 'apron', main: '#8a7a62', trim: '#3a2e22', apron: '#ddd3bf' };
    case 'herbalist': return { kind: 'dress', main: '#4f5e42', trim: '#2f3826', scarf: '#6f7a4c' };
    case 'weaver': return { kind: 'dress', main: '#6d4b52', trim: '#3a2830', scarf: '#9a8a6a' };
    case 'miller': return { kind: 'tunic', main: '#b8ab8e', trim: '#6a5c44' };
    case 'carpenter': return { kind: 'apron', main: '#6b5a3c', trim: '#3a2e1e', apron: '#7a5a38' };
    case 'elder': return { kind: 'robe', main: '#3e3428', trim: '#8a7a5a', fur: true };
    case 'apprentice': return { kind: 'tunic', main: '#655a48', trim: '#3a3226' };
    default: {
      const opts = ['#5c5140', '#4c5a52', '#6a4e3c', '#4e4a5e'];
      return { kind: sex === 'f' ? 'dress' : 'tunic', main: opts[Math.floor(r * opts.length)], trim: '#2f261c' };
    }
  }
}

const cache = new Map();

/**
 * 인물 초상 SVG 문자열.
 * @param {object} game  게임 상태 (부모를 찾을 때 씀, 없어도 됨)
 * @param {object} p     인물 (game.people의 한 명)
 * @param {object} opt   { size, scars: [], ring: 색, title }
 */
export function portrait(game, p, opt = {}) {
  const size = opt.size ?? 64;
  const ageY = Math.floor((p.ageMonths ?? 0) / 12);
  const stage = stageOf(ageY);
  const scars = opt.scars ?? [];
  const ck = `${keyOf(p)}|${stage}|${ageY >= 40 ? Math.floor(ageY / 5) : ''}|${p.job}|${p.alive}|${scars.length}|${opt.ring ?? ''}|${p.fatherId}|${p.motherId}`;
  let body = cache.get(ck);
  if (!body) {
    body = drawFace(game, p, ageY, stage, scars, opt.ring);
    if (cache.size > 600) cache.clear();
    cache.set(ck, body);
  }
  const label = opt.title ?? p.name;
  return `<svg class="portrait" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${String(label).replace(/"/g, '')} 초상">${body}</svg>`;
}

function drawFace(game, p, ageY, stage, scars, ring) {
  const g = genesOf(game, p);
  const r = rngFrom(hashStr('s' + keyOf(p)));
  const uid = 'p' + hashStr(keyOf(p) + stage).toString(36);
  const male = p.sex === 'm';
  const skin = SKIN[g.skin];
  const skinShadow = shade(skin, 0.28);
  const old = Math.max(0, Math.min(1, (ageY - 38) / 40)); // 0~1 늙음 정도
  let hair = HAIR[g.hair];
  if (stage === 'baby' || stage === 'child') hair = tint(hair, g.hair >= 5 ? 0.18 : 0.06); // 어릴 땐 조금 밝다
  const gray = Math.max(0, Math.min(1, (ageY - 40) / 32 + (r() - 0.5) * 0.3));
  if (gray > 0) hair = mixHex(hair, '#c9c4ba', gray * 0.9);
  const hairDark = shade(hair, 0.35);

  // 얼굴 크기와 위치
  const babyish = stage === 'baby' ? 1 : stage === 'child' ? 0.6 : stage === 'teen' ? 0.2 : 0;
  const cx = 50;
  const cy = 45 + babyish * 3;
  const hw = 15.5 + g.jaw * 2.2 + babyish * 2.2 - (male ? 0 : 0.8);       // 반폭
  const hh = 20 + g.long * 3 - babyish * 2.5 + (male ? 0.6 : 0);          // 반높이
  const jaw = 0.5 + g.jaw * 0.22 + (male ? 0.08 : -0.02) + babyish * 0.18; // 턱 너비 비율
  const top = cy - hh, chin = cy + hh;

  const head = `M${cx} ${f(top)} C${f(cx + hw * 0.98)} ${f(top)} ${f(cx + hw)} ${f(cy - hh * 0.45)} ${f(cx + hw)} ${f(cy)}
    C${f(cx + hw)} ${f(cy + hh * 0.45)} ${f(cx + hw * jaw + 1.5)} ${f(cy + hh * 0.86)} ${cx} ${f(chin)}
    C${f(cx - hw * jaw - 1.5)} ${f(cy + hh * 0.86)} ${f(cx - hw)} ${f(cy + hh * 0.45)} ${f(cx - hw)} ${f(cy)}
    C${f(cx - hw)} ${f(cy - hh * 0.45)} ${f(cx - hw * 0.98)} ${f(top)} ${cx} ${f(top)}Z`;

  const o = outfit(p.job, p.sex, stage, r());
  const parts = [];
  const bgHue = ['#3a3026', '#30352f', '#3a2e2e', '#2f3238', '#383226'][Math.floor(r() * 5)];
  parts.push(`<defs>
    <radialGradient id="${uid}b" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${tint(bgHue, 0.12)}"/><stop offset="1" stop-color="${shade(bgHue, 0.45)}"/></radialGradient>
    <linearGradient id="${uid}s" x1="0" x2="1"><stop offset="0.45" stop-color="${skinShadow}" stop-opacity="0"/><stop offset="1" stop-color="${skinShadow}" stop-opacity="0.75"/></linearGradient>
    <clipPath id="${uid}h"><path d="${head}"/></clipPath>
    <clipPath id="${uid}c"><circle cx="50" cy="50" r="48"/></clipPath>
  </defs>`);
  parts.push(`<circle cx="50" cy="50" r="48" fill="url(#${uid}b)"/>`);
  parts.push(`<g clip-path="url(#${uid}c)"><g transform="translate(50 58) scale(1.24) translate(-50 -50)">`);

  // 머리 모양 고르기
  const style = hairStyle(male, stage, r(), old, gray);

  // 뒷머리 (긴 머리는 어깨 뒤로)
  if (!o.hood) parts.push(backHair(style, cx, cy, hw, hh, top, hair, hairDark));

  // 어깨와 옷
  parts.push(clothes(o, cx, chin, hw, male, stage, uid));

  // 목
  const nw = hw * (male ? 0.46 : 0.38) + babyish;
  parts.push(`<path d="M${f(cx - nw)} ${f(chin - 6)} L${f(cx - nw - 0.6)} ${f(chin + 9)} Q${cx} ${f(chin + 12)} ${f(cx + nw + 0.6)} ${f(chin + 9)} L${f(cx + nw)} ${f(chin - 6)}Z" fill="${skin}" stroke="${INK}" stroke-width="0.8"/>`);
  parts.push(`<path d="M${f(cx - nw)} ${f(chin - 1)} Q${cx} ${f(chin + 6)} ${f(cx + nw)} ${f(chin - 1)} L${f(cx + nw)} ${f(chin + 4)} Q${cx} ${f(chin + 9)} ${f(cx - nw)} ${f(chin + 4)}Z" fill="${skinShadow}" opacity="0.55"/>`);
  // 옷깃 (목 위에 다시)
  parts.push(collar(o, cx, chin, nw, stage));

  // 귀
  const ey = cy + hh * 0.02;
  const er = 2.6 + g.ears * 1.4 + babyish * 0.4;
  for (const s of [-1, 1]) {
    const ex = cx + s * (hw - 0.4);
    parts.push(`<path d="M${f(ex)} ${f(ey - er * 1.2)} Q${f(ex + s * er * 1.3)} ${f(ey - er * 1.5)} ${f(ex + s * er * 1.1)} ${f(ey + er * 0.4)} Q${f(ex + s * er * 0.6)} ${f(ey + er * 1.7)} ${f(ex)} ${f(ey + er * 1.3)}" fill="${s > 0 ? skinShadow : skin}" stroke="${INK}" stroke-width="0.8"/>`);
  }

  // 얼굴
  parts.push(`<path d="${head}" fill="${skin}" stroke="${INK}" stroke-width="1"/>`);
  parts.push(`<g clip-path="url(#${uid}h)">`);
  parts.push(`<rect x="${cx - hw}" y="${top}" width="${hw * 2}" height="${hh * 2}" fill="url(#${uid}s)"/>`);
  // 볼과 턱 아래 그늘
  parts.push(`<ellipse cx="${cx}" cy="${f(chin + 3)}" rx="${f(hw * 0.7)}" ry="5" fill="${skinShadow}" opacity="0.35"/>`);
  if (stage === 'baby' || stage === 'child') parts.push(`<ellipse cx="${f(cx - hw * 0.5)}" cy="${f(cy + hh * 0.38)}" rx="3.6" ry="2.2" fill="#c97a62" opacity="0.18"/><ellipse cx="${f(cx + hw * 0.5)}" cy="${f(cy + hh * 0.38)}" rx="3.6" ry="2.2" fill="#c97a62" opacity="0.16"/>`);
  if (g.freckles && stage !== 'baby') {
    const fr = rngFrom(hashStr('f' + keyOf(p)));
    let dots = '';
    for (let i = 0; i < 14; i++) {
      const s = i % 2 ? 1 : -1;
      dots += `<circle cx="${f(cx + s * (hw * 0.25 + fr() * hw * 0.4))}" cy="${f(cy + hh * (0.18 + fr() * 0.22))}" r="0.45" fill="${shade(skin, 0.45)}" opacity="0.7"/>`;
    }
    parts.push(dots);
  }
  // 주름
  if (old > 0.05) {
    const a = Math.min(0.75, old * 1.1);
    parts.push(`<g fill="none" stroke="${shade(skin, 0.5)}" stroke-width="0.6" stroke-linecap="round" opacity="${f(a)}">
      <path d="M${f(cx - hw * 0.42)} ${f(top + hh * 0.42)} Q${cx} ${f(top + hh * 0.36)} ${f(cx + hw * 0.42)} ${f(top + hh * 0.42)}"/>
      ${old > 0.3 ? `<path d="M${f(cx - hw * 0.34)} ${f(top + hh * 0.52)} Q${cx} ${f(top + hh * 0.47)} ${f(cx + hw * 0.34)} ${f(top + hh * 0.52)}"/>` : ''}
      <path d="M${f(cx - hw * 0.3)} ${f(cy + hh * 0.3)} Q${f(cx - hw * 0.42)} ${f(cy + hh * 0.5)} ${f(cx - hw * 0.34)} ${f(cy + hh * 0.66)}"/>
      <path d="M${f(cx + hw * 0.3)} ${f(cy + hh * 0.3)} Q${f(cx + hw * 0.42)} ${f(cy + hh * 0.5)} ${f(cx + hw * 0.34)} ${f(cy + hh * 0.66)}"/>
      <path d="M${f(cx - hw * 0.78)} ${f(ey - 0.5)} l-2.2 -1.2 M${f(cx - hw * 0.78)} ${f(ey + 1)} l-2.4 0.6 M${f(cx + hw * 0.78)} ${f(ey - 0.5)} l2.2 -1.2 M${f(cx + hw * 0.78)} ${f(ey + 1)} l2.4 0.6"/>
    </g>`);
  }
  parts.push('</g>');

  // 눈썹·눈·코·입
  const eyeSpace = hw * 0.42;
  const ew = hw * (0.25 + babyish * 0.03) * (0.92 + g.eyeShape * 0.16);
  const eh = ew * (0.34 + g.eyeShape * 0.12 + babyish * 0.1);
  const eyeCol = EYES[g.eyes];
  for (const s of [-1, 1]) {
    const ex = cx + s * eyeSpace;
    const tilt = (g.eyeShape - 0.5) * 1.2 * s;
    // 눈두덩 그늘
    parts.push(`<path d="M${f(ex - ew * 1.1)} ${f(ey - eh * 0.3)} Q${ex} ${f(ey - eh * 2.4)} ${f(ex + ew * 1.1)} ${f(ey - eh * 0.3)}" fill="${skinShadow}" opacity="0.35"/>`);
    // 흰자
    parts.push(`<path d="M${f(ex - ew)} ${f(ey + tilt * 0.3)} Q${ex} ${f(ey - eh * 1.25)} ${f(ex + ew)} ${f(ey - tilt * 0.3)} Q${ex} ${f(ey + eh * 1.05)} ${f(ex - ew)} ${f(ey + tilt * 0.3)}Z" fill="#ece3d3"/>`);
    // 홍채 (윗눈꺼풀에 살짝 가려짐)
    const ir = eh * 0.95;
    parts.push(`<circle cx="${f(ex + s * 0.2)}" cy="${f(ey + eh * 0.05)}" r="${f(ir)}" fill="${eyeCol}"/><circle cx="${f(ex + s * 0.2)}" cy="${f(ey + eh * 0.05)}" r="${f(ir * 0.45)}" fill="#120c08"/>`);
    parts.push(`<circle cx="${f(ex + s * 0.2 - ir * 0.35)}" cy="${f(ey - ir * 0.3)}" r="${f(ir * 0.18)}" fill="#fff" opacity="0.35"/>`);
    // 윗눈꺼풀 선 (굵게)
    parts.push(`<path d="M${f(ex - ew * 1.05)} ${f(ey + tilt * 0.3 + 0.2)} Q${ex} ${f(ey - eh * 1.4)} ${f(ex + ew * 1.05)} ${f(ey - tilt * 0.3 + 0.2)}" fill="none" stroke="${INK}" stroke-width="1.15" stroke-linecap="round"/>`);
    parts.push(`<path d="M${f(ex - ew * 0.95)} ${f(ey - eh * 1.25)} Q${ex} ${f(ey - eh * 2)} ${f(ex + ew * 0.9)} ${f(ey - eh * 1.2)}" fill="none" stroke="${shade(skin, 0.45)}" stroke-width="0.5" opacity="0.7"/>`);
    // 아랫눈꺼풀
    parts.push(`<path d="M${f(ex - ew * 0.7)} ${f(ey + eh * 0.85)} Q${ex} ${f(ey + eh * 1.25)} ${f(ex + ew * 0.8)} ${f(ey + eh * 0.7)}" fill="none" stroke="${shade(skin, 0.4)}" stroke-width="0.5"/>`);
    // 눈썹
    const by = ey - eh - hh * 0.13;
    const bt = 0.9 + g.brow * (male ? 1.5 : 0.8) - babyish * 0.4;
    const browCol = gray > 0.5 ? mixHex(hairDark, '#d8d2c6', 0.5) : hairDark;
    if (stage !== 'baby') {
      parts.push(`<path d="M${f(ex - s * ew * 1.15)} ${f(by + 1.2)} Q${f(ex - s * ew * 0.2)} ${f(by - 1.4 - g.brow)} ${f(ex + s * ew * 1.25)} ${f(by + 0.6 + (male ? 0 : -0.3))}" fill="none" stroke="${browCol}" stroke-width="${f(bt)}" stroke-linecap="round"/>`);
    } else {
      parts.push(`<path d="M${f(ex - ew)} ${f(by + 1)} Q${ex} ${f(by - 0.6)} ${f(ex + ew)} ${f(by + 1)}" fill="none" stroke="${browCol}" stroke-width="0.5" opacity="0.5"/>`);
    }
  }
  // 코
  const nTop = ey + 1;
  const nBot = cy + hh * (0.4 - babyish * 0.04);
  const nwid = (2.4 + g.noseW * 1.6) * (1 - babyish * 0.35);
  const ns = shade(skin, 0.42);
  if (stage === 'baby') {
    parts.push(`<path d="M${f(cx - 1.6)} ${f(nBot)} Q${cx} ${f(nBot + 1.2)} ${f(cx + 1.6)} ${f(nBot)}" fill="none" stroke="${ns}" stroke-width="0.8"/>`);
  } else {
    const hook = g.nose === 2 ? 1.2 : g.nose === 3 ? -0.6 : 0;
    parts.push(`<path d="M${f(cx + 1.2)} ${f(nTop)} Q${f(cx + 2.4 + hook)} ${f((nTop + nBot) / 2)} ${f(cx + nwid * 0.7)} ${f(nBot - 0.8)}" fill="none" stroke="${ns}" stroke-width="0.8" stroke-linecap="round"/>`);
    parts.push(`<path d="M${f(cx + 0.2)} ${f(nTop + 2)} L${f(cx + nwid * 0.75)} ${f(nBot - 1)} Q${f(cx + 0.4)} ${f(nBot + 0.6)} ${f(cx - nwid * 0.4)} ${f(nBot - 0.5)}Z" fill="${skinShadow}" opacity="0.4"/>`);
    parts.push(`<path d="M${f(cx - nwid)} ${f(nBot - 1)} Q${f(cx - nwid * 0.7)} ${f(nBot + 0.6)} ${f(cx - nwid * 0.25)} ${f(nBot + 0.2)} Q${cx} ${f(nBot + 0.9)} ${f(cx + nwid * 0.25)} ${f(nBot + 0.2)} Q${f(cx + nwid * 0.7)} ${f(nBot + 0.6)} ${f(cx + nwid)} ${f(nBot - 1)}" fill="none" stroke="${INK}" stroke-width="0.8" stroke-linecap="round"/>`);
  }
  // 입
  const my = cy + hh * (0.64 - babyish * 0.04);
  const mw = hw * (0.3 + g.mouth * 0.12) * (1 - babyish * 0.25);
  const lipCol = mixHex(skin, '#8a3f34', 0.35 + (male ? 0 : 0.12));
  const set = (g.mouth - 0.5) * 0.8; // 입꼬리
  parts.push(`<path d="M${f(cx - mw)} ${f(my)} Q${cx} ${f(my - 1.4 - g.lips)} ${f(cx + mw)} ${f(my)} Q${cx} ${f(my + 1.6 + g.lips * 1.2)} ${f(cx - mw)} ${f(my)}Z" fill="${lipCol}" opacity="0.75"/>`);
  parts.push(`<path d="M${f(cx - mw)} ${f(my + set * 0.5)} Q${f(cx - mw * 0.3)} ${f(my + 0.5)} ${cx} ${f(my + 0.1)} Q${f(cx + mw * 0.3)} ${f(my + 0.5)} ${f(cx + mw)} ${f(my + set * 0.5)}" fill="none" stroke="${INK}" stroke-width="0.85" stroke-linecap="round"/>`);
  parts.push(`<path d="M${f(cx - mw * 0.5)} ${f(my + 2.6 + g.lips)} Q${cx} ${f(my + 3.4 + g.lips)} ${f(cx + mw * 0.5)} ${f(my + 2.6 + g.lips)}" fill="none" stroke="${shade(skin, 0.35)}" stroke-width="0.6" opacity="0.7"/>`);

  // 수염 (어른 남자 일부)
  const beardRoll = r();
  if (male && (stage === 'adult' || stage === 'middle' || stage === 'elder') && beardRoll < (stage === 'adult' ? 0.4 : 0.6)) {
    parts.push(beard(beardRoll, cx, cy, hw, hh, jaw, my, mw, hair, hairDark, uid));
  } else if (male && stage !== 'baby' && stage !== 'child' && stage !== 'teen') {
    // 면도 자국
    parts.push(`<path d="M${f(cx - hw * 0.85)} ${f(cy + hh * 0.3)} C${f(cx - hw * 0.8)} ${f(cy + hh * 0.85)} ${f(cx + hw * 0.8)} ${f(cy + hh * 0.85)} ${f(cx + hw * 0.85)} ${f(cy + hh * 0.3)} L${f(cx + hw * jaw)} ${f(cy + hh * 0.9)} Q${cx} ${f(chin + 1)} ${f(cx - hw * jaw)} ${f(cy + hh * 0.9)}Z" fill="${hairDark}" opacity="0.08" clip-path="url(#${uid}h)"/>`);
  }

  // 흉터 (플레이어 흉터 수만큼, 위치는 고정)
  if (scars.length) {
    const sr = rngFrom(hashStr('scar' + keyOf(p)));
    for (let i = 0; i < Math.min(3, scars.length); i++) {
      const sx = cx + (sr() - 0.5) * hw * 1.2, sy = cy + (sr() - 0.3) * hh * 0.8, len = 4 + sr() * 4, a = sr() * 1.2 - 0.6;
      parts.push(`<path d="M${f(sx)} ${f(sy)} l${f(Math.cos(a + 1.2) * len)} ${f(Math.sin(a + 1.2) * len)}" stroke="#a5604f" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/><path d="M${f(sx)} ${f(sy)} l${f(Math.cos(a + 1.2) * len)} ${f(Math.sin(a + 1.2) * len)}" stroke="#f0d0bc" stroke-width="0.35" opacity="0.7"/>`);
    }
  }

  // 앞머리 / 두건
  if (o.hood) parts.push(hood(o, cx, cy, hw, hh, top));
  else parts.push(frontHair(style, cx, cy, hw, hh, top, hair, hairDark, uid));
  if (o.scarf && stage !== 'child') parts.push(headscarf(o.scarf, cx, cy, hw, hh, top));

  parts.push('</g></g>');
  // 테두리
  parts.push(`<circle cx="50" cy="50" r="48" fill="none" stroke="${ring ?? '#8a6d38'}" stroke-width="${ring ? 2.6 : 1.6}"/>`);
  if (!p.alive) return `<g style="filter:grayscale(1) brightness(.8)">${parts.join('')}</g>`;
  return parts.join('');
}

function hairStyle(male, stage, r, old, gray) {
  if (stage === 'baby') return 'wisp';
  if (male) {
    if (stage === 'elder' && r < 0.45) return 'bald';
    if ((stage === 'middle' || stage === 'elder') && r < 0.7) return 'receding';
    if (stage === 'child') return r < 0.5 ? 'crop' : 'mop';
    return ['crop', 'parted', 'swept', 'mop', 'tied'][Math.floor(r * 5)];
  }
  if (stage === 'child') return r < 0.5 ? 'braids' : 'long';
  if (stage === 'elder') return r < 0.7 ? 'bun' : 'long';
  return ['long', 'braid', 'bun', 'tiedback', 'long'][Math.floor(r * 5)];
}

function backHair(style, cx, cy, hw, hh, top, hair, dark) {
  const w = hw + 3;
  if (style === 'long') return `<path d="M${f(cx - w)} ${f(cy - 4)} Q${f(cx - w - 3)} ${f(cy + hh + 14)} ${f(cx - w + 1)} ${f(cy + hh + 30)} L${f(cx + w - 1)} ${f(cy + hh + 30)} Q${f(cx + w + 3)} ${f(cy + hh + 14)} ${f(cx + w)} ${f(cy - 4)}Z" fill="${dark}" stroke="${INK}" stroke-width="0.9"/>`;
  if (style === 'braid') return `<path d="M${f(cx + hw - 2)} ${f(cy + hh * 0.4)} q6 10 2 22 q-3 8 0 16" fill="none" stroke="${INK}" stroke-width="7.6" stroke-linecap="round"/><path d="M${f(cx + hw - 2)} ${f(cy + hh * 0.4)} q6 10 2 22 q-3 8 0 16" fill="none" stroke="${hair}" stroke-width="6" stroke-linecap="round" stroke-dasharray="3 1.2"/>`;
  if (style === 'braids') return [-1, 1].map((s) => `<path d="M${f(cx + s * (hw - 1))} ${f(cy + hh * 0.3)} q${s * 3} 8 ${s * 1} 18" fill="none" stroke="${INK}" stroke-width="5.6" stroke-linecap="round"/><path d="M${f(cx + s * (hw - 1))} ${f(cy + hh * 0.3)} q${s * 3} 8 ${s * 1} 18" fill="none" stroke="${hair}" stroke-width="4.2" stroke-linecap="round" stroke-dasharray="2.4 1"/>`).join('');
  if (style === 'tied') return `<path d="M${f(cx - 3)} ${f(top + 4)} Q${f(cx + hw + 6)} ${f(cy + 4)} ${f(cx + hw + 2)} ${f(cy + hh + 6)}" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`;
  if (style === 'bun') return `<circle cx="${cx}" cy="${f(top - 1)}" r="${f(hw * 0.42)}" fill="${hair}" stroke="${INK}" stroke-width="0.9"/>`;
  return '';
}

function frontHair(style, cx, cy, hw, hh, top, hair, dark, uid) {
  const strands = (n, y0, y1, spread) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = cx - spread + (i + 0.5) * (spread * 2 / n);
      d += `M${f(x)} ${f(y0 + 3 + Math.abs(x - cx) * 0.25)} q${f((x - cx) * 0.12)} ${f((y1 - y0) * 0.5)} ${f((x - cx) * 0.18)} ${f(y1 - y0)} `;
    }
    return `<path d="${d}" fill="none" stroke="${dark}" stroke-width="0.6" opacity="0.6"/>`;
  };
  const cap = (hairline, sideDrop, extra = 0) => {
    // 정수리 덮개: 머리 윤곽보다 조금 크게, 이마선은 hairline
    const w = hw + 1.6 + extra;
    const peak = top - hh * 0.62 - extra;
    return `<path d="M${f(cx - w)} ${f(cy + sideDrop)} C${f(cx - w - 0.5)} ${f(peak)} ${f(cx + w + 0.5)} ${f(peak)} ${f(cx + w)} ${f(cy + sideDrop)}
      L${f(cx + hw - 1.2)} ${f(cy + sideDrop)} C${f(cx + hw - 1)} ${f(hairline + 2)} ${f(cx + hw * 0.5)} ${f(hairline)} ${cx} ${f(hairline)}
      C${f(cx - hw * 0.5)} ${f(hairline)} ${f(cx - hw + 1)} ${f(hairline + 2)} ${f(cx - hw + 1.2)} ${f(cy + sideDrop)}Z" fill="${hair}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`;
  };
  const hl = top + hh * 0.36;
  switch (style) {
    case 'wisp':
      return `<path d="M${f(cx - 6)} ${f(top + 2)} q3 -4 6 -1 q3 -4 6 0" fill="none" stroke="${hair}" stroke-width="1.6" stroke-linecap="round"/><path d="M${f(cx - hw * 0.8)} ${f(top + hh * 0.35)} Q${cx} ${f(top - 3)} ${f(cx + hw * 0.8)} ${f(top + hh * 0.35)}" fill="none" stroke="${hair}" stroke-width="2.4" opacity="0.5"/>`;
    case 'bald':
      return `<path d="M${f(cx - hw - 0.6)} ${f(cy - 2)} Q${f(cx - hw - 1)} ${f(cy + 6)} ${f(cx - hw + 2)} ${f(cy + 7)}" fill="none" stroke="${hair}" stroke-width="3.4" stroke-linecap="round"/><path d="M${f(cx + hw + 0.6)} ${f(cy - 2)} Q${f(cx + hw + 1)} ${f(cy + 6)} ${f(cx + hw - 2)} ${f(cy + 7)}" fill="none" stroke="${hair}" stroke-width="3.4" stroke-linecap="round"/><path d="M${f(cx - hw * 0.5)} ${f(top + 3)} Q${cx} ${f(top + 1)} ${f(cx + hw * 0.4)} ${f(top + 4)}" fill="none" stroke="#fff" stroke-width="1.4" opacity="0.18"/>`;
    case 'receding':
      return `<path d="M${f(cx - hw - 1.4)} ${f(cy + 2)} C${f(cx - hw - 1.6)} ${f(top - hh * 0.55)} ${f(cx + hw + 1.6)} ${f(top - hh * 0.55)} ${f(cx + hw + 1.4)} ${f(cy + 2)} L${f(cx + hw - 1)} ${f(cy + 2)} C${f(cx + hw - 1)} ${f(top + hh * 0.42)} ${f(cx + hw * 0.55)} ${f(top + hh * 0.18)} ${f(cx + hw * 0.3)} ${f(top + hh * 0.36)} Q${cx} ${f(top + hh * 0.2)} ${f(cx - hw * 0.3)} ${f(top + hh * 0.36)} C${f(cx - hw * 0.55)} ${f(top + hh * 0.18)} ${f(cx - hw + 1)} ${f(top + hh * 0.42)} ${f(cx - hw + 1)} ${f(cy + 2)}Z" fill="${hair}" stroke="${INK}" stroke-width="0.9"/>` + strands(6, top, top + hh * 0.3, hw * 0.7);
    case 'crop':
      return cap(hl - 1, -2, -0.6) + strands(8, top - 2, hl - 2, hw * 0.8);
    case 'parted':
      return cap(hl, 0) + `<path d="M${f(cx - hw * 0.35)} ${f(top - 3)} Q${f(cx + hw * 0.3)} ${f(hl - 4)} ${f(cx + hw + 1)} ${f(hl + 4)} L${f(cx + hw)} ${f(cy)} C${f(cx + hw - 1)} ${f(hl + 6)} ${f(cx + hw * 0.4)} ${f(hl + 1)} ${f(cx - hw * 0.35)} ${f(hl - 0.5)}Z" fill="${hair}" stroke="${INK}" stroke-width="0.8"/>` + strands(7, top - 1, hl - 1, hw * 0.8);
    case 'swept':
      return cap(hl - 2.5, 1, 0.6) + `<path d="M${f(cx - hw * 0.7)} ${f(hl - 2)} Q${f(cx - hw * 0.2)} ${f(top - 5)} ${f(cx + hw * 0.6)} ${f(top - 1)}" fill="none" stroke="${dark}" stroke-width="0.8"/>` + strands(9, top - 3, hl - 3, hw * 0.85);
    case 'mop':
      return cap(hl + 3, 3, 1.2) + `<path d="M${f(cx - hw - 1)} ${f(hl + 2)} q${f(hw * 0.3)} 5 ${f(hw * 0.55)} 1 q${f(hw * 0.3)} 5 ${f(hw * 0.5)} 0 q${f(hw * 0.3)} 5 ${f(hw * 0.5)} 0 q${f(hw * 0.3)} 5 ${f(hw * 0.5)} 0" fill="${hair}" stroke="${INK}" stroke-width="0.8"/>` + strands(9, top - 2, hl + 2, hw * 0.9);
    case 'tied':
      return cap(hl - 1.5, 0, 0) + strands(8, top - 2, hl - 1, hw * 0.8);
    case 'long':
      return cap(hl, hh * 0.6, 1.4) + `<path d="M${f(cx - 2)} ${f(top - 3)} Q${f(cx - hw * 0.6)} ${f(hl - 1)} ${f(cx - hw - 0.6)} ${f(cy + 4)}" fill="none" stroke="${dark}" stroke-width="0.8"/>` + strands(8, top - 2, hl, hw * 0.75);
    case 'braid': case 'braids': case 'tiedback':
      return cap(hl, 1, 0.6) + `<path d="M${cx} ${f(top - 3)} L${cx} ${f(hl - 1)}" stroke="${dark}" stroke-width="0.7"/>` + strands(8, top - 2, hl - 1, hw * 0.8);
    case 'bun':
      return cap(hl, -1, 0.4) + strands(8, top - 2, hl - 1, hw * 0.8);
    default:
      return cap(hl, 0);
  }
}

function beard(roll, cx, cy, hw, hh, jaw, my, mw, hair, dark, uid) {
  const chin = cy + hh;
  if (roll < 0.15) {
    // 콧수염만
    return `<path d="M${f(cx - mw - 1.6)} ${f(my + 0.8)} Q${f(cx - mw * 0.5)} ${f(my - 3.4)} ${cx} ${f(my - 2)} Q${f(cx + mw * 0.5)} ${f(my - 3.4)} ${f(cx + mw + 1.6)} ${f(my + 0.8)} Q${cx} ${f(my - 0.6)} ${f(cx - mw - 1.6)} ${f(my + 0.8)}Z" fill="${hair}" stroke="${INK}" stroke-width="0.7"/>`;
  }
  const full = roll < 0.42;
  const drop = full ? 8 : 3;
  return `<path d="M${f(cx - hw + 0.4)} ${f(cy + 1)} C${f(cx - hw)} ${f(cy + hh * 0.7)} ${f(cx - hw * jaw - 2)} ${f(chin + drop * 0.6)} ${cx} ${f(chin + drop)}
     C${f(cx + hw * jaw + 2)} ${f(chin + drop * 0.6)} ${f(cx + hw)} ${f(cy + hh * 0.7)} ${f(cx + hw - 0.4)} ${f(cy + 1)}
     L${f(cx + hw - 2.6)} ${f(cy + 2)} C${f(cx + hw * 0.6)} ${f(my - 1)} ${f(cx + mw + 2)} ${f(my + 3.4)} ${cx} ${f(my + 3.6)}
     C${f(cx - mw - 2)} ${f(my + 3.4)} ${f(cx - hw * 0.6)} ${f(my - 1)} ${f(cx - hw + 2.6)} ${f(cy + 2)}Z" fill="${hair}" stroke="${INK}" stroke-width="0.8"/>
    <path d="M${f(cx - mw - 1.8)} ${f(my + 1)} Q${f(cx - mw * 0.5)} ${f(my - 3.4)} ${cx} ${f(my - 2)} Q${f(cx + mw * 0.5)} ${f(my - 3.4)} ${f(cx + mw + 1.8)} ${f(my + 1)} Q${cx} ${f(my - 0.4)} ${f(cx - mw - 1.8)} ${f(my + 1)}Z" fill="${hair}" stroke="${INK}" stroke-width="0.7"/>
    <path d="M${f(cx - 4)} ${f(chin)} q4 ${f(drop * 0.5)} 8 0 M${f(cx - hw * 0.6)} ${f(cy + hh * 0.7)} q2 3 1 6 M${f(cx + hw * 0.6)} ${f(cy + hh * 0.7)} q-2 3 -1 6" fill="none" stroke="${dark}" stroke-width="0.6" opacity="0.7"/>`;
}

function clothes(o, cx, chin, hw, male, stage, uid) {
  const sw = stage === 'baby' ? 30 : stage === 'child' ? 32 : male ? 42 : 37;
  const y0 = chin + 6;
  const shoulder = `M${f(cx - sw)} 104 L${f(cx - sw + 2)} ${f(y0 + 12)} Q${f(cx - sw + 6)} ${f(y0 + 2)} ${f(cx - hw * 0.6)} ${f(y0)} L${f(cx + hw * 0.6)} ${f(y0)} Q${f(cx + sw - 6)} ${f(y0 + 2)} ${f(cx + sw - 2)} ${f(y0 + 12)} L${f(cx + sw)} 104Z`;
  let out = `<path d="${shoulder}" fill="${o.main}" stroke="${INK}" stroke-width="1"/>`;
  out += `<path d="M${f(cx + sw * 0.25)} ${f(y0 + 2)} Q${f(cx + sw - 4)} ${f(y0 + 4)} ${f(cx + sw)} 104 L${f(cx + sw * 0.4)} 104Z" fill="#000" opacity="0.18"/>`;
  if (o.kind === 'mail') {
    let rings = '';
    for (let y = y0 + 4; y < 100; y += 2.6) for (let x = cx - sw + 4; x < cx + sw - 3; x += 2.8) rings += `<circle cx="${f(x + ((y / 2.6) % 2) * 1.4)}" cy="${f(y)}" r="0.9"/>`;
    out += `<g fill="none" stroke="#4a4d52" stroke-width="0.4" opacity="0.8">${rings}</g>`;
    out += `<path d="M${f(cx - sw * 0.55)} 104 L${f(cx - sw * 0.45)} ${f(y0 + 16)} L${f(cx + sw * 0.45)} ${f(y0 + 16)} L${f(cx + sw * 0.55)} 104Z" fill="${o.cloth}" stroke="${INK}" stroke-width="0.9"/>`;
    out += `<path d="M${cx} ${f(y0 + 20)} l3 4 -3 4 -3 -4Z" fill="#c9a25a" opacity="0.85"/>`;
  } else if (o.kind === 'leather') {
    out += `<path d="M${f(cx - sw + 6)} ${f(y0 + 8)} L${f(cx + sw - 10)} 104" stroke="#2a1d14" stroke-width="3" opacity="0.8"/><path d="M${f(cx - sw + 6)} ${f(y0 + 8)} L${f(cx + sw - 10)} 104" stroke="#7a5a3a" stroke-width="1.6"/>`;
  } else if (o.kind === 'doublet') {
    for (let y = y0 + 9; y < 100; y += 5) out += `<circle cx="${cx}" cy="${f(y)}" r="0.9" fill="${o.trim}"/>`;
    out += `<path d="M${cx} ${f(y0 + 4)} L${cx} 104" stroke="${INK}" stroke-width="0.6" opacity="0.6"/>`;
  } else if (o.kind === 'robe') {
    if (o.stole) out += `<path d="M${f(cx - 9)} ${f(y0 + 1)} L${f(cx - 6)} 104 M${f(cx + 9)} ${f(y0 + 1)} L${f(cx + 6)} 104" stroke="${o.trim}" stroke-width="3.2"/><circle cx="${f(cx - 6.6)}" cy="92" r="1.8" fill="none" stroke="#7a5a1a" stroke-width="0.7"/>`;
    if (o.fur) out += `<path d="M${f(cx - sw + 3)} ${f(y0 + 10)} Q${f(cx - 10)} ${f(y0 - 1)} ${cx} ${f(y0 + 6)} Q${f(cx + 10)} ${f(y0 - 1)} ${f(cx + sw - 3)} ${f(y0 + 10)} Q${cx} ${f(y0 + 18)} ${f(cx - sw + 3)} ${f(y0 + 10)}Z" fill="#8a7a62" stroke="${INK}" stroke-width="0.8"/>`;
  } else if (o.kind === 'cloak') {
    out += `<path d="M${f(cx - sw + 2)} ${f(y0 + 12)} Q${f(cx - 6)} ${f(y0 + 8)} ${f(cx - 4)} 104 M${f(cx + sw - 2)} ${f(y0 + 12)} Q${f(cx + 6)} ${f(y0 + 8)} ${f(cx + 4)} 104" fill="none" stroke="${INK}" stroke-width="0.8"/><circle cx="${cx}" cy="${f(y0 + 6)}" r="1.8" fill="${o.trim}" stroke="${INK}" stroke-width="0.5"/>`;
  } else if (o.kind === 'apron') {
    out += `<path d="M${f(cx - 11)} ${f(y0 + 8)} L${f(cx - 13)} 104 L${f(cx + 13)} 104 L${f(cx + 11)} ${f(y0 + 8)}Z" fill="${o.apron}" stroke="${INK}" stroke-width="0.8"/><path d="M${f(cx - 11)} ${f(y0 + 8)} L${f(cx - 7)} ${f(y0)} M${f(cx + 11)} ${f(y0 + 8)} L${f(cx + 7)} ${f(y0)}" stroke="${o.apron}" stroke-width="1.6"/>`;
  } else if (o.kind === 'dress') {
    out += `<path d="M${f(cx - 10)} ${f(y0 + 2)} Q${cx} ${f(y0 + 14)} ${f(cx + 10)} ${f(y0 + 2)}" fill="none" stroke="${o.trim}" stroke-width="1.4"/>`;
    if (o.scarf) out += `<path d="M${f(cx - sw + 3)} ${f(y0 + 10)} Q${cx} ${f(y0 + 2)} ${f(cx + sw - 3)} ${f(y0 + 10)} L${f(cx + 6)} ${f(y0 + 24)} Q${cx} ${f(y0 + 26)} ${f(cx - 6)} ${f(y0 + 24)}Z" fill="${o.scarf}" stroke="${INK}" stroke-width="0.8" opacity="0.95"/>`;
  } else if (o.kind === 'swaddle') {
    out += `<path d="M${f(cx - sw + 4)} ${f(y0 + 14)} Q${cx} ${f(y0 + 4)} ${f(cx + sw - 4)} ${f(y0 + 18)}" fill="none" stroke="${o.trim}" stroke-width="1.2"/><path d="M${f(cx - sw + 2)} ${f(y0 + 22)} Q${cx} ${f(y0 + 12)} ${f(cx + sw - 2)} ${f(y0 + 26)}" fill="none" stroke="${o.trim}" stroke-width="1.2"/>`;
  }
  return out;
}

function collar(o, cx, chin, nw, stage) {
  const y0 = chin + 6;
  if (o.kind === 'mail') return `<path d="M${f(cx - nw - 5)} ${f(y0 + 3)} Q${cx} ${f(y0 + 11)} ${f(cx + nw + 5)} ${f(y0 + 3)} L${f(cx + nw + 2)} ${f(y0 - 2)} Q${cx} ${f(y0 + 5)} ${f(cx - nw - 2)} ${f(y0 - 2)}Z" fill="#6d7176" stroke="${INK}" stroke-width="0.8"/>`;
  if (o.kind === 'doublet') return `<path d="M${f(cx - nw - 4)} ${f(y0 - 4)} L${f(cx - 1)} ${f(y0 + 7)} L${f(cx - nw - 7)} ${f(y0 + 4)}Z M${f(cx + nw + 4)} ${f(y0 - 4)} L${f(cx + 1)} ${f(y0 + 7)} L${f(cx + nw + 7)} ${f(y0 + 4)}Z" fill="${tint(o.main, 0.15)}" stroke="${INK}" stroke-width="0.7"/>`;
  if (o.kind === 'robe' && !o.fur) return `<path d="M${f(cx - nw - 3)} ${f(y0 - 2)} Q${cx} ${f(y0 + 6)} ${f(cx + nw + 3)} ${f(y0 - 2)}" fill="none" stroke="${o.trim}" stroke-width="1.6"/>`;
  if (o.kind === 'swaddle') return '';
  return `<path d="M${f(cx - nw - 2)} ${f(y0 - 2)} Q${cx} ${f(y0 + 5)} ${f(cx + nw + 2)} ${f(y0 - 2)}" fill="none" stroke="${INK}" stroke-width="0.9"/>`;
}

function hood(o, cx, cy, hw, hh, top) {
  const w = hw + 5;
  return `<path d="M${f(cx - w - 2)} ${f(cy + hh + 8)} C${f(cx - w - 4)} ${f(top - 10)} ${f(cx + w + 4)} ${f(top - 10)} ${f(cx + w + 2)} ${f(cy + hh + 8)}
    L${f(cx + hw - 0.5)} ${f(cy + hh * 0.4)} C${f(cx + hw)} ${f(top + 2)} ${f(cx - hw)} ${f(top + 2)} ${f(cx - hw + 0.5)} ${f(cy + hh * 0.4)}Z" fill="${o.main}" stroke="${INK}" stroke-width="1"/>
    <path d="M${f(cx - hw + 0.5)} ${f(cy + hh * 0.4)} C${f(cx - hw)} ${f(top + 2)} ${f(cx + hw)} ${f(top + 2)} ${f(cx + hw - 0.5)} ${f(cy + hh * 0.4)}" fill="none" stroke="#000" stroke-width="3" opacity="0.25"/>`;
}

function headscarf(col, cx, cy, hw, hh, top) {
  const w = hw + 2.4;
  return `<path d="M${f(cx - w)} ${f(cy - 1)} C${f(cx - w - 1)} ${f(top - 5)} ${f(cx + w + 1)} ${f(top - 5)} ${f(cx + w)} ${f(cy - 1)} Q${cx} ${f(top + hh * 0.42)} ${f(cx - w)} ${f(cy - 1)}Z" fill="${col}" stroke="${INK}" stroke-width="0.9"/>
    <path d="M${f(cx - w + 3)} ${f(top + 3)} Q${cx} ${f(top - 2)} ${f(cx + w - 3)} ${f(top + 3)}" fill="none" stroke="${shade(col, 0.3)}" stroke-width="0.6"/>`;
}

/** 머리색 이름 (인물 수첩 설명용) */
export function looksOf(game, p) {
  const g = genesOf(game, p);
  const hairN = ['검은', '짙은 갈색', '갈색', '밤색', '붉은', '어두운 금', '밝은 금', '잿빛'][g.hair];
  const eyeN = ['짙은 갈색', '갈색', '초록', '파란', '회색', '호박색'][g.eyes];
  return `${hairN} 머리, ${eyeN} 눈`;
}
