// 인물 초상: 얼굴 뼈대·명암·이목구비·머리·옷을 겹겹이 쌓아 SVG로 그린다.
// - 같은 사람은 늘 같은 얼굴 (이름·성·번호로 정한 씨앗).
// - 부모가 명단에 있으면 머리색·피부·눈색·얼굴 생김을 물려받는다.
// - 나이(아기 → 노년), 성별, 직업, 종족, 표정, 흉터에 따라 달라진다.
// 그림체: 어두운 바탕의 세밀화. 빛은 왼쪽 위에서 온다. 큰 눈·둥근 볼 같은 만화풍은 피한다.
// 바깥에서 쓰는 것: portrait(game, p, opt), moodOf(game, p), looksOf(game, p), setAgeLens(fn)
import { INK, hashStr, rngFrom, weighted, mixHex, shade, tint, f, clamp, lerp, spline, mirrored } from './portraitKit.js';
import { outfitOf, drawGarb, drawHeadwear } from './portraitGarb.js';
import { hairStyleOf, drawHair, beardOf, drawBeard } from './portraitHair.js';

/* ---------- 종족별 빛깔 ---------- */
const HUMAN = {
  skin: ['#f0d6c0', '#e8c6a8', '#dcb18f', '#cc9b76', '#b4825e', '#946648', '#7a5038'], skinW: [3, 4, 4, 3, 2, 1, 0.5],
  hair: ['#1a1410', '#33241a', '#4d3322', '#6b4229', '#86391f', '#a2804c', '#c6a874', '#655d54'], hairW: [2, 4, 4, 3, 1.4, 2, 1.2, 0.8],
  hairN: ['검은', '짙은 갈색', '갈색', '밤색', '붉은', '어두운 금', '밝은 금', '잿빛'],
  eyes: ['#3a2819', '#57401f', '#4b6448', '#4b6178', '#6c6a5c', '#7a5c2c'], eyesW: [4, 3, 1.4, 1.6, 1, 1],
  eyesN: ['짙은 갈색', '갈색', '초록', '파란', '회색', '호박색'],
};
const RACES = {
  human: HUMAN,
  half_elf: { ...HUMAN, skinW: [4, 4, 3, 2, 1, 0.5, 0.2] },
  elf: {
    skin: ['#f4e6d6', '#eddac6', '#e4cbb2', '#d6bca4', '#b99a80'], skinW: [3, 4, 3, 1.5, 0.6],
    hair: ['#d6d1c4', '#dcc98f', '#b99655', '#1b1716', '#7a3b22', '#8f8674'], hairW: [3, 3, 2.4, 1.6, 1, 1.4],
    hairN: ['은빛', '옅은 금', '금빛', '검은', '적갈색', '잿빛 갈색'],
    eyes: ['#4f7a52', '#4f6f96', '#6a6088', '#8d98a0', '#a07a2c', '#3e5a4a'], eyesW: [3, 3, 1.5, 1.5, 1.2, 1],
    eyesN: ['초록', '파란', '보랏빛', '은회색', '호박색', '짙은 초록'],
  },
  dwarf: {
    skin: ['#e6bb9c', '#d8a482', '#c68e6a', '#ad7652', '#8f5e42'], skinW: [2, 4, 4, 2, 1],
    hair: ['#8a3a1c', '#4d3322', '#1c1511', '#a2522a', '#9a7a4c', '#5a4a40'], hairW: [3, 3, 2, 2.4, 1.2, 1],
    hairN: ['붉은', '갈색', '검은', '구릿빛', '모랫빛', '잿빛 갈색'],
    eyes: ['#3a2819', '#57401f', '#4b6178', '#6c6a5c', '#4b6448'], eyesW: [3, 3, 1.6, 1.4, 1],
    eyesN: ['짙은 갈색', '갈색', '파란', '회색', '초록'],
  },
  beast: {
    ...HUMAN,
    hair: ['#2a2420', '#5a4634', '#8a6a44', '#b08a52', '#c9c2b4', '#7a4a2a', '#4a4a4e'], hairW: [2, 3, 3, 2, 1.4, 2, 1.4],
    hairN: ['검은', '갈색', '황갈색', '모랫빛', '흰', '적갈색', '잿빛'],
    eyes: ['#b08a2c', '#7a5c2c', '#4b6448', '#57401f', '#6f8aa0'], eyesW: [3, 2, 1.5, 2, 1],
    eyesN: ['금빛', '호박색', '초록', '갈색', '옅은 파란'],
  },
  demon: {
    skin: ['#c9c2c2', '#b3aab2', '#9c93a2', '#857c8e', '#b9a79c'], skinW: [2, 3, 3, 1.6, 1.4],
    hair: ['#141216', '#e2ddd6', '#5a1a1e', '#2a2238', '#6a6470'], hairW: [4, 2, 2, 1.6, 1],
    hairN: ['검은', '흰', '검붉은', '검보라', '잿빛'],
    eyes: ['#b0392c', '#c9a23a', '#7a4a9a', '#3a8a8a', '#8a8a92'], eyesW: [3, 3, 2, 1, 1],
    eyesN: ['붉은', '금빛', '보랏빛', '청록', '은회색'],
  },
};
RACES.half_demon = { ...HUMAN, hair: RACES.demon.hair, hairW: [3, 1, 2, 2, 2], hairN: RACES.demon.hairN, eyes: RACES.demon.eyes, eyesW: RACES.demon.eyesW, eyesN: RACES.demon.eyesN };

const raceOf = (p) => (RACES[p?.race] ? p.race : 'human');
const keyOf = (p) => `${p.id}|${p.name}|${p.lastName}|${p.sex}`;

/* ---------- 나이를 보는 눈 ----------
 * 오래 사는 종족은 실제 나이가 아니라 "사람으로 치면 몇 살의 몸인가"로 그려야 한다.
 * 종족 모듈이 setAgeLens(bodyAge)로 알려 주면 그 값을 쓰고, 없으면 여기 어림값을 쓴다. */
let ageLens = null;
export function setAgeLens(fn) { ageLens = typeof fn === 'function' ? fn : null; cache.clear(); }
function lookAge(p) {
  const y = (p.ageMonths ?? 0) / 12;
  if (ageLens) { const v = ageLens(p); if (Number.isFinite(v)) return v; }
  if (Number.isFinite(p.bodyAge)) return p.bodyAge;
  const slow = { elf: 9, half_elf: 2.2, dwarf: 2.4, demon: 3.5, half_demon: 1.6 }[raceOf(p)];
  if (!slow || y <= 20) return y;
  return 20 + (y - 20) / slow;
}

/* ---------- 타고난 생김새 (부모가 있으면 물려받는다) ---------- */
const geneCache = new Map();
const SHAPE_KEYS = ['wide', 'long', 'jaw', 'chin', 'cheek', 'noseW', 'noseLen', 'brow', 'browArch', 'eyeSize', 'eyeTilt', 'eyeGap', 'lid', 'mouth', 'lips', 'ears', 'gaunt'];
function ownGenes(p) {
  const r = rngFrom(hashStr('g' + keyOf(p)));
  const R = RACES[raceOf(p)];
  const g = { skin: weighted(r(), R.skinW), hair: weighted(r(), R.hairW), eyes: weighted(r(), R.eyesW), nose: Math.floor(r() * 5), freckles: r() < 0.14, mole: r() < 0.12, cleft: r() < 0.14 };
  for (const k of SHAPE_KEYS) g[k] = r();
  return g;
}
function genesOf(game, p, depth = 0) {
  const k = keyOf(p) + '|' + raceOf(p);
  if (geneCache.has(k)) return geneCache.get(k);
  let g = ownGenes(p);
  const find = (id) => (id != null && game?.people && depth < 6 ? game.people.find((x) => x.id === id) : null);
  const fa = find(p.fatherId), mo = find(p.motherId);
  if (fa || mo) {
    const r = rngFrom(hashStr('i' + k));
    const gf = fa ? genesOf(game, fa, depth + 1) : g;
    const gm = mo ? genesOf(game, mo, depth + 1) : g;
    const R = RACES[raceOf(p)];
    const inh = {};
    for (const key of Object.keys(g)) {
      const roll = r();
      // 가끔(12%) 부모 누구도 닮지 않은 자기만의 특징
      inh[key] = roll < 0.12 ? g[key] : roll < 0.56 ? gf[key] : gm[key];
    }
    // 얼굴 비율은 두 부모의 중간쯤에서 살짝 흔들린다
    for (const key of SHAPE_KEYS) inh[key] = clamp((gf[key] + gm[key]) / 2 + (r() - 0.5) * 0.35);
    // 빛깔 번호가 이 종족의 팔레트를 벗어나지 않게 (혼혈)
    inh.skin = Math.min(inh.skin, R.skin.length - 1); inh.hair = Math.min(inh.hair, R.hair.length - 1); inh.eyes = Math.min(inh.eyes, R.eyes.length - 1);
    g = inh;
  }
  if (geneCache.size > 4000) geneCache.clear();
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

const cache = new Map();

/**
 * 인물 초상 SVG 문자열.
 * @param {object} game  게임 상태 (부모를 찾을 때 씀, 없어도 됨)
 * @param {object} p     인물 (game.people의 한 명). p.race, p.beast가 있으면 종족 모습으로 그린다.
 * @param {object} opt   { size, scars: [흉터 이름들], ring: 테두리 색, title, mood }
 */
export function portrait(game, p, opt = {}) {
  const size = opt.size ?? 64;
  const age = lookAge(p);
  const stage = stageOf(age);
  const scars = opt.scars ?? p.scars ?? [];
  const mood = opt.mood ?? moodOf(game, p, stage);
  const detail = size >= 72;
  const ageKey = age < 20 ? Math.floor(age) : Math.floor(age / 3);
  const ck = `${detail ? 'D' : 'S'}|${mood}|${keyOf(p)}|${raceOf(p)}|${p.beast ?? ''}|${ageKey}|${p.job}|${p.alive}|${scars.join(',')}|${opt.ring ?? ''}|${p.fatherId}|${p.motherId}`;
  let body = cache.get(ck);
  if (!body) {
    body = drawFace(game, p, age, stage, scars, opt.ring, mood, detail);
    // 작은 초상은 소수 한 자리면 충분하다 (목록에 수십 개가 한꺼번에 뜬다)
    if (!detail) body = body.replace(/(\d\.\d)\d+/g, '$1').replace(/\s*\n\s*/g, ' ');
    if (cache.size > 600) cache.clear();
    cache.set(ck, body);
  }
  const label = opt.title ?? p.name;
  return `<svg class="portrait" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${String(label).replace(/[<>&"]/g, '')} 초상">${body}</svg>`;
}

/**
 * 표정: 따로 정하지 않으면 상태에서 저절로 나온다.
 * 나 = 피로·스트레스·다친 곳, 다른 사람 = 나를 향한 호감.
 * warm(웃음) · cold(찡그림) · tired(지침) · stressed(근심) · sick(아픔) · '' (보통)
 */
export function moodOf(game, p, stage = stageOf(lookAge(p ?? {}))) {
  if (!p || p.alive === false) return '';
  if (p.isPlayer && game?.player) {
    const pl = game.player;
    const inj = pl.injuries ?? [];
    const hurt = inj.reduce((a, i) => a + (i.months ?? 1), 0);
    if (inj.some((i) => i.mortal) || inj.length >= 2 || hurt >= 4) return 'sick';
    if (stage === 'baby') return '';
    if ((pl.fatigue ?? 0) >= 70) return 'tired';
    if ((pl.stress ?? 0) >= 55) return 'stressed';
    if ((pl.fatigue ?? 0) < 25 && (pl.stress ?? 0) < 15) return 'warm';
    return '';
  }
  if (stage === 'baby') return '';
  const a = p.affection ?? 0;
  if (a >= 45) return 'warm';
  if (a <= -20) return 'cold';
  return '';
}

const MOODS = {
  '': {},
  warm: { smile: 1, lid: 0.1, browIn: -0.3, cheek: 1 },
  cold: { smile: -0.8, lid: 0.16, browIn: 1.5, furrow: 1 },
  tired: { smile: -0.35, lid: 0.5, bags: 0.8, browIn: -0.4 },
  stressed: { smile: -0.5, browIn: -1.2, furrow: 0.8, bags: 0.35 },
  sick: { smile: -0.55, lid: 0.38, bags: 1, browIn: -0.7, pale: 1 },
};

function drawFace(game, p, age, stage, scars, ring, mood, detail) {
  const race = raceOf(p);
  const R = RACES[race];
  const g = genesOf(game, p);
  const key = keyOf(p);
  const r = rngFrom(hashStr('s' + key));
  const uid = 'p' + hashStr(key + race + Math.floor(age) + mood + (detail ? 'D' : 'S') + scars.length).toString(36);
  const male = p.sex === 'm';
  const M = MOODS[mood] ?? {};
  const kid = stage === 'baby' ? 1 : stage === 'child' ? lerp(0.8, 0.42, clamp((age - 3) / 10)) : stage === 'teen' ? lerp(0.32, 0.06, clamp((age - 13) / 5)) : 0;
  const old = clamp((age - 38) / 42);
  const dwarf = race === 'dwarf', elf = race === 'elf', beast = race === 'beast';

  /* ----- 빛깔 ----- */
  let skin = R.skin[Math.min(g.skin, R.skin.length - 1)];
  if (race === 'half_demon') skin = mixHex(skin, '#a79fa8', 0.32);
  if (M.pale) skin = mixHex(skin, '#bdb9a6', 0.3);
  if (old > 0.3) skin = mixHex(skin, '#b9a892', (old - 0.3) * 0.22);
  const warmDark = race === 'demon' ? '#2c2030' : '#4a2218';
  const sh1 = mixHex(skin, warmDark, 0.34);   // 그늘
  const sh2 = mixHex(skin, warmDark, 0.58);   // 짙은 그늘
  const hi = mixHex(skin, '#fff4e0', 0.42);   // 밝은 곳
  const lineC = mixHex(skin, '#1e0f08', 0.74); // 얼굴 선
  const blush = race === 'demon' ? '#8a5a7a' : '#c0604c';
  let hair = R.hair[Math.min(g.hair, R.hair.length - 1)];
  if (kid > 0.4) hair = tint(hair, 0.08);
  const gray = clamp((age - 42) / 30 + (r() - 0.5) * 0.3);
  if (gray > 0 && race !== 'elf') hair = mixHex(hair, '#cfc9be', gray * 0.92);
  const hairDark = shade(hair, 0.5), hairLight = tint(hair, 0.3);
  const eyeCol = R.eyes[Math.min(g.eyes, R.eyes.length - 1)];

  /* ----- 얼굴 치수 ----- */
  const cx = 50;
  let hw = 15.7 + g.wide * 1.9 + (male ? 0.5 : -0.5) + kid * 1.1;
  let hh = 23.4 + g.long * 2.4 * (1 - kid * 0.5) + (male ? 0.6 : 0) - kid * 4.2;
  if (dwarf) { hw += 2.4; hh -= 1.4; }
  if (elf) { hw -= 1; hh += 0.7; }
  const chin = 66 + kid * 1.5 + (dwarf ? 1.5 : 0);
  const top = chin - hh * 2;
  const cy = chin - hh;
  let jawW = 0.61 + g.jaw * 0.17 + (male ? 0.07 : -0.02) * (1 - kid) + kid * 0.2 + (dwarf ? 0.08 : 0) - (elf ? 0.07 : 0) + old * 0.04;
  let chinW = 0.2 + g.chin * 0.13 + (male ? 0.06 : 0) * (1 - kid) + kid * 0.12 + (dwarf ? 0.06 : 0) - (elf ? 0.04 : 0);
  const cheekW = 0.985 + g.cheek * 0.045;
  const gaunt = clamp(g.gaunt * 0.7 + old * 0.5 + (M.pale ? 0.3 : 0) - kid - (male ? 0 : 0.15));
  jawW = clamp(jawW, 0.55, 0.96); chinW = clamp(chinW, 0.17, 0.5);
  const headR = [
    [cx, top], [cx + hw * 0.58, top + hh * 0.06], [cx + hw * 0.95, top + hh * 0.4], [cx + hw * cheekW, cy + hh * 0.06],
    [cx + hw * (lerp(cheekW, jawW, 0.45) - gaunt * 0.02), cy + hh * 0.36], [cx + hw * jawW, cy + hh * (0.62 + old * 0.04)],
    [cx + hw * lerp(jawW, chinW, 0.56), cy + hh * 0.87], [cx + hw * chinW * 0.92, chin - hh * (0.035 - kid * 0.015)], [cx, chin],
  ];
  const head = mirrored(cx, headR);

  const eyeY = cy + hh * (0.03 + kid * 0.15);
  const ew = hw * (0.205 + g.eyeSize * 0.025 + kid * 0.035 + (elf ? 0.012 : 0)); // 눈 반폭
  const eyeGap = hw * (0.415 + g.eyeGap * 0.04);
  const browY = eyeY - hh * (0.175 + g.browArch * 0.02) - kid * 0.4;
  const noseBot = cy + hh * (0.42 + g.noseLen * 0.07 * (1 - kid) + kid * 0.04 + (dwarf ? 0.03 : 0));
  const nw = (2.5 + g.noseW * 1.5 + (dwarf ? 1.3 : 0) - (elf ? 0.4 : 0)) * (1 - kid * 0.42) * (kid > 0.3 ? 1 : male ? 1.06 : 0.94); // 콧방울 반폭
  const my = noseBot + (chin - noseBot) * (0.4 + kid * 0.02);
  const mw = hw * (0.34 + g.mouth * 0.1) * (1 - kid * 0.3);

  /* ----- 몸 ----- */
  const neckW = hw * (male ? 0.52 : 0.41) * (1 - kid * 0.12) + (dwarf ? 1.5 : 0);
  const baseY = chin + (stage === 'baby' ? 3.5 : dwarf ? 5.5 : 8.5 - kid * 2);
  const sw = stage === 'baby' ? 25 : stage === 'child' ? 27 + (age - 3) * 0.5 : (male ? 39 : 33.5) + (dwarf ? 4 : 0) - (elf ? 1.5 : 0) - (stage === 'teen' ? 3 : 0);
  const sy = baseY + (male ? 4.2 : 5) + kid * 1.5;
  const o = outfitOf(p.job, p.sex, stage, r(), r(), r());
  const gctx = { cx, chin, hw, male, kid, stage, uid, detail, nw: neckW, baseY, sw, sy };
  const garb = drawGarb(o, gctx);
  const hdim = { cx, cy, hw, hh, top, eyeY, browY };
  const hat = o.head ? drawHeadwear(o, hdim, detail) : { back: '', front: '', hidesHair: false, coversEars: false };

  /* ----- 머리카락 ----- */
  const hr = rngFrom(hashStr('h' + key));
  const hairRoll = hr(), beardRoll = hr(), wave = hr(), part = hr() < 0.5 ? -1 : 1, peak = hr();
  const style = hairStyleOf({ male, stage, roll: hairRoll, old, race, beast: p.beast });
  const hctx = { cx, cy, hw, hh, top, chin, eyeY, browY, uid, detail, hair, dark: hairDark, light: hairLight, wave, part, peak, r: rngFrom(hashStr('hs' + key)), covered: hat.hidesHair };
  const hairS = drawHair(style, hctx);
  const beardKind = beardOf({ male, stage, roll: beardRoll, old, race, job: p.job });
  const beard = drawBeard(beardKind, hctx, { my, mw, jawW, chinW, noseBot, headR });

  /* ----- 바탕 ----- */
  const bgHue = ['#3a3026', '#2e342f', '#3a2c2c', '#2c3038', '#383024', '#33293a'][Math.floor(r() * 6)];
  const P = [];
  P.push(`<defs>
    <radialGradient id="${uid}b" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="${tint(bgHue, 0.2)}"/><stop offset="0.55" stop-color="${bgHue}"/><stop offset="1" stop-color="${shade(bgHue, 0.6)}"/></radialGradient>
    <linearGradient id="${uid}s" x1="0" x2="1" y1="0.1" y2="0.3"><stop offset="0" stop-color="${hi}" stop-opacity="0.5"/><stop offset="0.3" stop-color="${hi}" stop-opacity="0"/><stop offset="0.56" stop-color="${sh1}" stop-opacity="0"/><stop offset="1" stop-color="${sh2}" stop-opacity="0.78"/></linearGradient>
    <linearGradient id="${uid}j" x1="0" x2="0" y1="0" y2="1"><stop offset="0.62" stop-color="${sh1}" stop-opacity="0"/><stop offset="1" stop-color="${sh2}" stop-opacity="0.5"/></linearGradient>
    <radialGradient id="${uid}d"><stop offset="0" stop-color="${sh2}" stop-opacity="0.62"/><stop offset="1" stop-color="${sh2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${uid}l"><stop offset="0" stop-color="${hi}" stop-opacity="0.75"/><stop offset="1" stop-color="${hi}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${uid}r"><stop offset="0" stop-color="${blush}" stop-opacity="0.34"/><stop offset="1" stop-color="${blush}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${uid}i" cx="50%" cy="62%" r="60%"><stop offset="0" stop-color="${tint(eyeCol, 0.3)}"/><stop offset="0.7" stop-color="${eyeCol}"/><stop offset="1" stop-color="${shade(eyeCol, 0.6)}"/></radialGradient>
    <clipPath id="${uid}h"><path d="${head}"/></clipPath>
    <clipPath id="${uid}c"><circle cx="50" cy="50" r="48"/></clipPath>
    ${hairS.defs}${garb.defs ?? ''}
  </defs>`);
  P.push(`<circle cx="50" cy="50" r="48" fill="url(#${uid}b)"/>`);
  P.push(`<g clip-path="url(#${uid}c)">`);
  if (detail) P.push(`<path d="M6 30 Q30 8 60 6 M4 52 Q10 30 30 16 M70 96 Q92 80 96 54" fill="none" stroke="${tint(bgHue, 0.3)}" stroke-width="5" opacity="0.07" stroke-linecap="round"/>`);
  // 조금 올려 앉혀 어깨가 보이게
  P.push(`<g transform="translate(0 ${f(2.5 - kid * 1.5)})">`);

  /* ----- 뒤쪽 겹 ----- */
  P.push(garb.behind, hat.back, hairS.back);
  if (beast && p.beast !== 'hawk') P.push(beastEars(p.beast, { cx, cy, hw, hh, top }, hair, hairDark, skin, uid, 'back'));
  if (race === 'demon' || race === 'half_demon') P.push(horns(race, { cx, cy, hw, hh, top }, hashStr('horn' + key) / 4294967296, 'back'));
  P.push(garb.torso);

  /* ----- 목 ----- */
  const nT = chin - hh * 0.3;
  P.push(`<path d="M${f(cx - neckW)} ${f(nT)} L${f(cx - neckW - 0.9)} ${f(baseY + 3)} Q${cx} ${f(baseY + 8)} ${f(cx + neckW + 0.9)} ${f(baseY + 3)} L${f(cx + neckW)} ${f(nT)}Z" fill="${skin}" stroke="${lineC}" stroke-width="0.5"/>`);
  P.push(`<path d="M${f(cx - neckW)} ${f(chin - hh * 0.16)} Q${cx} ${f(chin + 6.5)} ${f(cx + neckW)} ${f(chin - hh * 0.16)} L${f(cx + neckW + 0.6)} ${f(chin + 4.4)} Q${cx} ${f(chin + 11)} ${f(cx - neckW)} ${f(chin + 3.4)}Z" fill="${sh2}" opacity="0.5"/>`);
  P.push(`<path d="M${f(cx + neckW * 0.2)} ${f(chin)} L${f(cx + neckW + 0.8)} ${f(chin - 4)} L${f(cx + neckW + 0.9)} ${f(baseY + 3)} Q${f(cx + neckW * 0.6)} ${f(baseY + 6)} ${f(cx + neckW * 0.3)} ${f(baseY + 6.6)}Z" fill="${sh1}" opacity="0.45"/>`);
  if (detail && !kid) P.push(`<path d="M${f(cx - neckW * 0.62)} ${f(chin + 2.4)} Q${f(cx - neckW * 0.3)} ${f(baseY)} ${f(cx - 1.4)} ${f(baseY + 4.6)} M${f(cx + neckW * 0.62)} ${f(chin + 2.4)} Q${f(cx + neckW * 0.3)} ${f(baseY)} ${f(cx + 1.4)} ${f(baseY + 4.6)}" fill="none" stroke="${sh2}" stroke-width="0.4" opacity="${f(0.3 + old * 0.5)}"/>`);
  if (old > 0.5 && detail) P.push(`<path d="M${f(cx - neckW * 0.5)} ${f(chin + 4.4)} q${f(neckW * 0.5)} 1.8 ${f(neckW)} 0 M${f(cx - neckW * 0.4)} ${f(chin + 6.6)} q${f(neckW * 0.4)} 1.4 ${f(neckW * 0.8)} 0" fill="none" stroke="${sh2}" stroke-width="0.4" opacity="0.5"/>`);
  P.push(garb.collar);
  P.push(hairS.mid);

  /* ----- 귀 ----- */
  if (!hat.coversEars && !(beast && p.beast !== 'hawk')) {
    const er = (hh * 0.135 + g.ears * 1.1) * (1 + kid * 0.12);
    const eyC = (browY + noseBot) / 2 + 0.6;
    for (const s of [-1, 1]) {
      const ex = cx + s * (hw * cheekW - 0.5);
      let d;
      if (elf || race === 'half_elf') {
        const L = elf ? 7.5 + g.ears * 2.5 : 3;
        d = `M${f(ex)} ${f(eyC - er * 0.9)} Q${f(ex + s * er * 1.2)} ${f(eyC - er * 1.6)} ${f(ex + s * (er * 1.2 + L * 0.6))} ${f(eyC - er * 1.1 - L * 0.8)} Q${f(ex + s * (er * 1.5))} ${f(eyC + er * 0.1)} ${f(ex + s * er * 0.95)} ${f(eyC + er * 0.9)} Q${f(ex + s * er * 0.5)} ${f(eyC + er * 1.7)} ${f(ex - s * 0.4)} ${f(eyC + er * 1.25)}Z`;
      } else if (race === 'demon') {
        d = `M${f(ex)} ${f(eyC - er * 0.9)} Q${f(ex + s * er * 1.3)} ${f(eyC - er * 1.9)} ${f(ex + s * er * 2)} ${f(eyC - er * 2.3)} Q${f(ex + s * er * 1.5)} ${f(eyC)} ${f(ex + s * er * 0.9)} ${f(eyC + er * 0.9)} Q${f(ex + s * er * 0.5)} ${f(eyC + er * 1.6)} ${f(ex - s * 0.4)} ${f(eyC + er * 1.2)}Z`;
      } else {
        d = `M${f(ex)} ${f(eyC - er * 0.95)} C${f(ex + s * er * 1.1)} ${f(eyC - er * 1.9)} ${f(ex + s * er * 1.75)} ${f(eyC - er * 0.6)} ${f(ex + s * er * 1.15)} ${f(eyC + er * 0.5)} C${f(ex + s * er * 0.95)} ${f(eyC + er * 1.5)} ${f(ex + s * er * 0.3)} ${f(eyC + er * 1.75)} ${f(ex - s * 0.4)} ${f(eyC + er * 1.2)}Z`;
      }
      P.push(`<path d="${d}" fill="${s > 0 ? mixHex(skin, sh1, 0.75) : mixHex(skin, blush, 0.12)}" stroke="${lineC}" stroke-width="0.5" stroke-linejoin="round"/>`);
      if (detail) P.push(`<path d="M${f(ex + s * er * 0.35)} ${f(eyC - er * 0.75)} q${f(s * er * 0.8)} ${f(er * 0.3)} ${f(s * er * 0.35)} ${f(er * 1.3)}" fill="none" stroke="${sh2}" stroke-width="0.45" opacity="0.7"/>`);
      if (o.earring && s < 0) P.push(`<circle cx="${f(ex + s * er * 0.5)}" cy="${f(eyC + er * 1.9)}" r="1.1" fill="none" stroke="#c9a25a" stroke-width="0.55"/>`);
    }
  }

  /* ----- 얼굴 바탕과 명암 ----- */
  P.push(`<path d="${head}" fill="${skin}" stroke="${lineC}" stroke-width="0.6"/>`);
  P.push(`<g clip-path="url(#${uid}h)">`);
  const box = `x="${f(cx - hw - 1)}" y="${f(top - 1)}" width="${f(hw * 2 + 2)}" height="${f(hh * 2 + 2)}"`;
  P.push(`<rect ${box} fill="url(#${uid}s)"/><rect ${box} fill="url(#${uid}j)"/>`);
  const dab = (x, y, rx, ry, id, op = 1, rot = 0) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${uid}${id})"${op < 1 ? ` opacity="${f(op)}"` : ''}${rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}/>`;
  // 이마의 빛, 관자놀이 그늘
  P.push(dab(cx - hw * 0.22, top + hh * 0.52, hw * 0.62, hh * 0.3, 'l', 0.55 - kid * 0.1));
  P.push(dab(cx + hw * 0.92, cy - hh * 0.25, hw * 0.34, hh * 0.5, 'd', 0.6));
  P.push(dab(cx - hw * 0.98, cy - hh * 0.2, hw * 0.2, hh * 0.42, 'd', 0.3));
  // 눈구멍
  const socket = 0.5 + old * 0.35 + (M.bags ?? 0) * 0.22 + (male ? 0.1 : 0) * (1 - kid) - kid * 0.5 + (dwarf ? 0.15 : 0);
  for (const s of [-1, 1]) P.push(dab(cx + s * eyeGap * 0.98, eyeY - ew * 0.12, ew * 1.5, ew * 0.98, 'd', clamp(socket + (s > 0 ? 0.12 : 0), 0.15, 1)));
  // 광대의 빛과 볼의 그늘
  P.push(dab(cx - hw * 0.56, eyeY + hh * 0.24, hw * 0.3, hh * 0.13, 'l', 0.5 - kid * 0.2));
  P.push(dab(cx + hw * 0.5, eyeY + hh * 0.25, hw * 0.24, hh * 0.1, 'l', 0.22));
  if (gaunt > 0.05) for (const s of [-1, 1]) P.push(dab(cx + s * hw * 0.66, cy + hh * 0.44, hw * 0.2, hh * 0.24, 'd', gaunt * (s > 0 ? 0.85 : 0.6), s * 18));
  // 혈색
  const rosy = (kid * 0.9 + (male ? 0.25 : 0.5) + (M.cheek ? 0.35 : 0) + (dwarf ? 0.22 : 0)) * (M.pale ? 0.2 : 1) * (1 - old * 0.4);
  for (const s of [-1, 1]) P.push(dab(cx + s * hw * 0.52, eyeY + hh * 0.34, hw * 0.34, hh * 0.17, 'r', clamp(rosy, 0, 1)));
  P.push(dab(cx, noseBot - 1.5, nw * 1.5, nw * 1.2, 'r', clamp(0.3 + (dwarf ? 0.3 : 0) + old * 0.2, 0, 1) * (M.pale ? 0.3 : 1)));
  // 턱의 빛, 아랫입술 밑 그늘
  P.push(dab(cx - hw * 0.05, chin - hh * 0.13, hw * 0.2, hh * 0.07, 'l', 0.5));
  P.push(dab(cx, my + hh * 0.105, mw * 0.72, hh * 0.04, 'd', 0.75));
  if (g.cleft && male && !kid) P.push(`<path d="M${cx} ${f(chin - hh * 0.13)} v${f(hh * 0.08)}" stroke="${sh2}" stroke-width="0.5" opacity="0.6" stroke-linecap="round"/>`);
  // 주근깨·점
  if (g.freckles && stage !== 'baby' && detail) {
    const fr = rngFrom(hashStr('f' + key));
    let dots = '';
    for (let i = 0; i < 22; i++) { const s = i % 2 ? 1 : -1; dots += `<circle cx="${f(cx + s * (hw * 0.1 + fr() * hw * 0.58))}" cy="${f(eyeY + hh * (0.2 + fr() * 0.22))}" r="${f(0.22 + fr() * 0.2)}"/>`; }
    P.push(`<g fill="${sh2}" opacity="0.5">${dots}</g>`);
  }
  if (g.mole && !kid) { const mr = rngFrom(hashStr('m' + key)); P.push(`<circle cx="${f(cx + (mr() < 0.5 ? -1 : 1) * hw * (0.36 + mr() * 0.3))}" cy="${f(cy + hh * (0.26 + mr() * 0.4))}" r="0.5" fill="${mixHex(skin, '#2a140c', 0.7)}"/>`); }

  /* ----- 나이 ----- */
  if (old > 0.04) {
    const a = clamp(old * 1.25, 0, 0.85);
    const wr = [];
    // 팔자 주름
    for (const s of [-1, 1]) wr.push(`M${f(cx + s * (nw + 0.7))} ${f(noseBot - 2)} Q${f(cx + s * (mw + 2.6))} ${f(my - 2.4)} ${f(cx + s * (mw + 2.2 + old))} ${f(my + 1.6 + old * 2.4)}`);
    if (old > 0.12) wr.push(`M${f(cx - hw * 0.46)} ${f(top + hh * 0.5)} Q${cx} ${f(top + hh * 0.44)} ${f(cx + hw * 0.46)} ${f(top + hh * 0.5)}`);
    if (old > 0.3 && detail) wr.push(`M${f(cx - hw * 0.38)} ${f(top + hh * 0.6)} Q${cx} ${f(top + hh * 0.55)} ${f(cx + hw * 0.4)} ${f(top + hh * 0.6)}`, `M${f(cx - hw * 0.3)} ${f(top + hh * 0.4)} Q${cx} ${f(top + hh * 0.35)} ${f(cx + hw * 0.3)} ${f(top + hh * 0.4)}`);
    if (old > 0.2 && detail) for (const s of [-1, 1]) wr.push(`M${f(cx + s * (eyeGap + ew * 1.12))} ${f(eyeY - 0.6)} l${f(s * 2.3)} -1.3`, `M${f(cx + s * (eyeGap + ew * 1.14))} ${f(eyeY + 0.5)} l${f(s * 2.6)} 0.3`, `M${f(cx + s * (eyeGap + ew * 1.08))} ${f(eyeY + 1.6)} l${f(s * 2)} 1.5`);
    if (old > 0.5) for (const s of [-1, 1]) wr.push(`M${f(cx + s * (mw + 1.2))} ${f(my + 2)} q${f(s * 1.2)} 3 ${f(-s * 0.4)} 5.4`);
    P.push(`<path d="${wr.join(' ')}" fill="none" stroke="${sh2}" stroke-width="0.5" stroke-linecap="round" opacity="${f(a)}"/>`);
    // 처진 볼살
    if (old > 0.4) for (const s of [-1, 1]) P.push(dab(cx + s * hw * (jawW - 0.12), cy + hh * 0.72, hw * 0.2, hh * 0.12, 'd', (old - 0.4) * 1.2));
    if (old > 0.42 && detail) {
      const sr = rngFrom(hashStr('a' + key));
      let spots = '';
      const n = Math.round((old - 0.4) * 14);
      for (let i = 0; i < n; i++) { const s = sr() < 0.5 ? -1 : 1; spots += `<ellipse cx="${f(cx + s * hw * (0.4 + sr() * 0.5))}" cy="${f(top + hh * (0.24 + sr() * 0.95))}" rx="${f(0.5 + sr() * 0.6)}" ry="${f(0.4 + sr() * 0.4)}"/>`; }
      P.push(`<g fill="${sh2}" opacity="0.32">${spots}</g>`);
    }
  }
  if (M.furrow && stage !== 'baby') P.push(`<path d="M${f(cx - 1.3)} ${f(browY - 0.6)} q0.5 1.6 0.2 3.2 M${f(cx + 1.3)} ${f(browY - 0.6)} q-0.5 1.6 -0.2 3.2" fill="none" stroke="${sh2}" stroke-width="0.5" stroke-linecap="round" opacity="${f(0.75 * M.furrow)}"/>`);
  if (M.pale) P.push(`<rect ${box} fill="#6f7a5e" opacity="0.07"/>`);
  if (beast && p.beast === 'tiger') {
    let st = '';
    for (const s of [-1, 1]) st += `M${f(cx + s * hw)} ${f(eyeY + hh * 0.12)} l${f(-s * hw * 0.3)} ${f(hh * 0.05)} l${f(s * hw * 0.3)} ${f(hh * 0.05)}Z M${f(cx + s * hw)} ${f(eyeY + hh * 0.3)} l${f(-s * hw * 0.24)} ${f(hh * 0.06)} l${f(s * hw * 0.24)} ${f(hh * 0.04)}Z `;
    st += `M${f(cx - 1.8)} ${f(top + hh * 0.36)} l1.8 ${f(hh * 0.16)} l1.8 ${f(-hh * 0.16)}Z`;
    P.push(`<path d="${st}" fill="${hairDark}" opacity="0.55"/>`);
  }
  P.push('</g>');
  P.push(beard.under);

  /* ----- 눈 ----- */
  const lidDrop = clamp((M.lid ?? 0) + (old > 0.45 ? (old - 0.45) * 0.5 : 0) + g.lid * 0.12);
  const openU = ew * (0.46 + g.eyeSize * 0.08 + kid * 0.1) * (1 - lidDrop * 0.55) * (M.smile > 0 ? 0.9 : 1);
  const openL = ew * (0.27 + kid * 0.04) * (M.smile > 0 ? 0.78 : 1);
  const tilt = (g.eyeTilt - 0.42) * ew * 0.42 + (elf ? ew * 0.14 : 0) + (beast && (p.beast === 'cat' || p.beast === 'tiger') ? ew * 0.12 : 0);
  const slit = (beast && ['cat', 'tiger', 'lion'].includes(p.beast)) || race === 'demon';
  const sclera = race === 'demon' ? '#cfc7bc' : '#e2d8c9';
  for (const s of [-1, 1]) {
    const ex = cx + s * eyeGap;
    const ix = ex - s * ew, ox = ex + s * ew;
    const iy = eyeY + tilt * 0.45, oy = eyeY - tilt * 0.55;
    const up = `C${f(ix + s * ew * 0.42)} ${f(iy - openU * 1.5)} ${f(ox - s * ew * 0.62)} ${f(oy - openU * 1.42)} ${f(ox)} ${f(oy)}`;
    const lo = `C${f(ox - s * ew * 0.5)} ${f(oy + openL * 1.5)} ${f(ix + s * ew * 0.55)} ${f(iy + openL * 1.35)} ${f(ix)} ${f(iy)}`;
    const shape = `M${f(ix)} ${f(iy)} ${up} ${lo}Z`;
    P.push(`<clipPath id="${uid}e${s > 0 ? 'r' : 'l'}"><path d="${shape}"/></clipPath>`);
    P.push(`<path d="${shape}" fill="${sclera}"/>`);
    const ir = ew * (0.5 + kid * 0.03);
    const icx = ex + s * ew * 0.02, icy = eyeY - tilt * 0.05 - openU * 0.12 + openL * 0.1;
    P.push(`<g clip-path="url(#${uid}e${s > 0 ? 'r' : 'l'})">
      <circle cx="${f(icx)}" cy="${f(icy)}" r="${f(ir)}" fill="url(#${uid}i)"/>
      <circle cx="${f(icx)}" cy="${f(icy)}" r="${f(ir)}" fill="none" stroke="${shade(eyeCol, 0.7)}" stroke-width="0.4"/>
      ${slit ? `<ellipse cx="${f(icx)}" cy="${f(icy)}" rx="${f(ir * 0.2)}" ry="${f(ir * 0.72)}" fill="#0c0806"/>` : `<circle cx="${f(icx)}" cy="${f(icy)}" r="${f(ir * 0.43)}" fill="#0c0806"/>`}
      <path d="M${f(ix)} ${f(iy)} ${up} L${f(ox)} ${f(oy + openU * 0.5)} Q${f(ex)} ${f(eyeY - openU * 0.5)} ${f(ix)} ${f(iy + openU * 0.4)}Z" fill="#1a0f0a" opacity="0.32"/>
      <circle cx="${f(icx - ir * 0.36)}" cy="${f(icy - ir * 0.34)}" r="${f(ir * 0.2)}" fill="#fff" opacity="0.8"/>
      ${detail ? `<circle cx="${f(icx + ir * 0.34)}" cy="${f(icy + ir * 0.4)}" r="${f(ir * 0.12)}" fill="#fff" opacity="0.28"/>` : ''}
    </g>`);
    // 눈꺼풀 주름과 눈두덩
    if (stage !== 'baby') P.push(`<path d="M${f(ix + s * ew * 0.12)} ${f(iy - openU * 0.72)} C${f(ix + s * ew * 0.55)} ${f(iy - openU * 1.5 - ew * (0.3 - g.lid * 0.16))} ${f(ox - s * ew * 0.6)} ${f(oy - openU * 1.42 - ew * (0.3 - g.lid * 0.16))} ${f(ox + s * ew * 0.08)} ${f(oy - openU * 0.5)}" fill="none" stroke="${sh2}" stroke-width="0.45" opacity="${f(0.65 + lidDrop * 0.3)}" stroke-linecap="round"/>`);
    // 윗눈꺼풀 선 (속눈썹), 바깥쪽이 굵다
    const lash = male ? 0.75 : 1.0;
    P.push(`<path d="M${f(ix)} ${f(iy)} ${up}" fill="none" stroke="${mixHex(lineC, '#0a0504', 0.6)}" stroke-width="${f(lash * (kid ? 0.8 : 1))}" stroke-linecap="round"/>`);
    if (!male && !kid) P.push(`<path d="M${f(ox - s * ew * 0.5)} ${f(oy - openU * 0.98)} Q${f(ox - s * ew * 0.1)} ${f(oy - openU * 0.5)} ${f(ox + s * ew * 0.2)} ${f(oy - ew * 0.14)}" fill="none" stroke="#120a07" stroke-width="0.85" stroke-linecap="round"/>`);
    // 아랫눈꺼풀
    P.push(`<path d="M${f(ox)} ${f(oy)} C${f(ox - s * ew * 0.5)} ${f(oy + openL * 1.5)} ${f(ix + s * ew * 0.55)} ${f(iy + openL * 1.35)} ${f(ix + s * ew * 0.16)} ${f(iy + openL * 0.5)}" fill="none" stroke="${lineC}" stroke-width="0.4" opacity="0.7"/>`);
    // 눈 밑
    const bag = clamp((M.bags ?? 0) * 0.8 + (old > 0.25 ? old * 0.7 : 0));
    if (bag > 0.05) P.push(`<path d="M${f(ix + s * ew * 0.2)} ${f(iy + openL * 1.7)} Q${f(ex)} ${f(eyeY + openL * 3.1)} ${f(ox - s * ew * 0.05)} ${f(oy + openL * 1.5)}" fill="none" stroke="${sh2}" stroke-width="0.55" stroke-linecap="round" opacity="${f(bag * 0.8)}"/>${dab(ex, eyeY + openL * 2.1, ew * 0.9, openL * 1.1, 'd', bag * 0.6)}`);
    if (M.smile > 0 && !kid) P.push(`<path d="M${f(ix + s * ew * 0.3)} ${f(iy + openL * 1.65)} Q${f(ex)} ${f(eyeY + openL * 2.3)} ${f(ox - s * ew * 0.1)} ${f(oy + openL * 1.3)}" fill="none" stroke="${sh2}" stroke-width="0.4" opacity="0.45"/>`);

    /* 눈썹 */
    if (stage !== 'baby') {
      const th = (0.85 + g.brow * (male ? 1.25 : 0.6) + (dwarf ? 0.7 : 0)) * (1 - kid * 0.35) * (old > 0.6 && male ? 1.15 : 1);
      const inDy = (M.browIn ?? 0) * 0.95, arc = 0.9 + g.browArch * 1.5 + (male ? 0 : 0.5);
      const bi = [ex - s * ew * 1.22, browY + 0.9 + inDy], bm = [ex + s * ew * 0.3, browY - arc + (M.browIn > 0 ? 0.6 : 0)], bo = [ex + s * ew * 1.36, browY + 0.4 + (M.smile < 0 && !M.furrow ? 0.4 : 0)];
      const browCol = gray > 0.55 ? mixHex(hairDark, '#d8d2c6', 0.55) : mixHex(hairDark, hair, 0.25);
      P.push(`<path d="M${f(bi[0])} ${f(bi[1] - th * 0.45)} Q${f(bm[0])} ${f(bm[1] - th * 0.62)} ${f(bo[0])} ${f(bo[1])} Q${f(bm[0])} ${f(bm[1] + th * 0.5)} ${f(bi[0] + s * 0.2)} ${f(bi[1] + th * 0.6)}Z" fill="${browCol}" opacity="${f(0.92 - kid * 0.25)}"/>`);
    } else {
      P.push(`<path d="M${f(ex - ew)} ${f(browY + 1)} Q${f(ex)} ${f(browY - 0.4)} ${f(ex + ew)} ${f(browY + 1)}" fill="none" stroke="${hair}" stroke-width="0.5" opacity="0.4"/>`);
    }
  }

  /* ----- 코 ----- */
  const nTop = eyeY + ew * 0.1;
  if (stage === 'baby') {
    P.push(`<path d="M${f(cx - 1.7)} ${f(noseBot - 0.4)} q0.5 1 1.3 0.5 M${f(cx + 1.7)} ${f(noseBot - 0.4)} q-0.5 1 -1.3 0.5" fill="none" stroke="${lineC}" stroke-width="0.5" stroke-linecap="round"/>${dab(cx - 0.4, noseBot - 2, 1.6, 1.3, 'l', 0.6)}`);
  } else {
    const hook = [0, 0.5, 1.5, -0.7, 0.9][g.nose] * (1 - kid * 0.7);  // 콧대의 굽음
    const tipW = nw * (0.52 + (g.nose === 4 ? 0.14 : 0));
    // 콧대 옆 그늘 (빛 반대쪽)
    P.push(`<path d="M${f(cx + 0.9)} ${f(nTop)} Q${f(cx + 1.8 + hook)} ${f(lerp(nTop, noseBot, 0.5))} ${f(cx + nw * 0.92)} ${f(noseBot - 2.6)} Q${f(cx + nw * 0.7)} ${f(noseBot + 0.2)} ${f(cx + 0.3)} ${f(noseBot + 0.3)} Q${f(cx + 0.9)} ${f(lerp(nTop, noseBot, 0.5))} ${f(cx + 0.1)} ${f(nTop + 2.4)}Z" fill="${sh2}" opacity="${f(0.3 + (male ? 0.08 : 0) * (1 - kid) - kid * 0.2)}"/>`);
    // 콧대의 빛
    P.push(`<path d="M${f(cx - 0.7)} ${f(nTop + 1.4)} Q${f(cx - 0.5 + hook * 0.4)} ${f(lerp(nTop, noseBot, 0.5))} ${f(cx - 0.5)} ${f(noseBot - 3.6)}" fill="none" stroke="${hi}" stroke-width="1.25" stroke-linecap="round" opacity="0.55"/>${dab(cx - 0.5, noseBot - 2.5, tipW * 0.75, tipW * 0.62, 'l', 0.8)}`);
    if ((Math.abs(hook) > 0.4 || male) && kid < 0.3) P.push(`<path d="M${f(cx + 1.1)} ${f(nTop + 0.6)} Q${f(cx + 1.7 + hook)} ${f(lerp(nTop, noseBot, 0.52))} ${f(cx + tipW * 0.9)} ${f(noseBot - 3)}" fill="none" stroke="${lineC}" stroke-width="0.4" opacity="${f(0.4 + Math.abs(hook) * 0.2)}" stroke-linecap="round"/>`);
    // 콧방울과 콧구멍
    P.push(`<path d="M${f(cx - nw)} ${f(noseBot - 2.5)} Q${f(cx - nw - 0.5)} ${f(noseBot - 0.2)} ${f(cx - nw * 0.56)} ${f(noseBot + 0.15)} M${f(cx + nw)} ${f(noseBot - 2.5)} Q${f(cx + nw + 0.5)} ${f(noseBot - 0.2)} ${f(cx + nw * 0.56)} ${f(noseBot + 0.15)}" fill="none" stroke="${lineC}" stroke-width="0.5" stroke-linecap="round" opacity="0.85"/>`);
    P.push(`<path d="M${f(cx - nw * 0.62)} ${f(noseBot - 0.1)} Q${f(cx - nw * 0.4)} ${f(noseBot - 1.15)} ${f(cx - nw * 0.12)} ${f(noseBot + 0.25)} Q${f(cx - nw * 0.4)} ${f(noseBot + 0.55)} ${f(cx - nw * 0.62)} ${f(noseBot - 0.1)}Z M${f(cx + nw * 0.62)} ${f(noseBot - 0.1)} Q${f(cx + nw * 0.4)} ${f(noseBot - 1.15)} ${f(cx + nw * 0.12)} ${f(noseBot + 0.25)} Q${f(cx + nw * 0.4)} ${f(noseBot + 0.55)} ${f(cx + nw * 0.62)} ${f(noseBot - 0.1)}Z" fill="${mixHex(sh2, '#1a0c08', 0.55)}" opacity="0.85"/>`);
    P.push(`<path d="M${f(cx - nw * 0.14)} ${f(noseBot + 0.3)} Q${cx} ${f(noseBot + 0.9)} ${f(cx + nw * 0.14)} ${f(noseBot + 0.3)}" fill="none" stroke="${lineC}" stroke-width="0.45" opacity="0.8"/>`);
    // 코밑 그늘, 인중
    P.push(dab(cx + 0.4, noseBot + 1.5, nw * 0.95, 1.3, 'd', 0.6));
    if (detail && !kid) P.push(`<path d="M${f(cx - 0.9)} ${f(noseBot + 1.4)} L${f(cx - 1.1)} ${f(my - 1.9)} M${f(cx + 0.9)} ${f(noseBot + 1.4)} L${f(cx + 1.1)} ${f(my - 1.9)}" stroke="${sh1}" stroke-width="0.4" opacity="0.5" stroke-linecap="round"/>`);
  }

  /* ----- 입 ----- */
  const smile = (M.smile ?? 0) + (0.5 - g.mouth) * 0.3 - old * 0.25;
  const cornerDy = -smile * 1.15;
  const lipCol = mixHex(skin, race === 'demon' ? '#5a3050' : '#8f3a33', (male ? 0.3 : 0.48) * (1 - old * 0.35) + kid * 0.08);
  const thin = (1 - old * 0.5) * (male ? 0.82 : 1.05) * (M.smile < 0 ? 0.88 : 1);
  const upH = (1.05 + g.lips * 0.9) * thin, loH = (1.5 + g.lips * 1.3) * thin;
  const mwS = mw * (1 + (M.smile > 0 ? 0.1 : 0));
  const cL = [cx - mwS, my + cornerDy], cR = [cx + mwS, my + cornerDy];
  const midY = my + 0.25 + (smile > 0 ? smile * 0.35 : 0);
  const mouthLine = `M${f(cL[0])} ${f(cL[1])} Q${f(cx - mwS * 0.45)} ${f(midY + 0.25)} ${cx} ${f(midY - 0.15)} Q${f(cx + mwS * 0.45)} ${f(midY + 0.25)} ${f(cR[0])} ${f(cR[1])}`;
  P.push(`<path d="M${f(cL[0])} ${f(cL[1])} C${f(cx - mwS * 0.55)} ${f(my - upH * 0.9)} ${f(cx - mwS * 0.3)} ${f(my - upH * 1.25)} ${f(cx - mwS * 0.16)} ${f(my - upH * 1.12)} Q${cx} ${f(my - upH * 0.62)} ${f(cx + mwS * 0.16)} ${f(my - upH * 1.12)} C${f(cx + mwS * 0.3)} ${f(my - upH * 1.25)} ${f(cx + mwS * 0.55)} ${f(my - upH * 0.9)} ${f(cR[0])} ${f(cR[1])} Q${f(cx + mwS * 0.45)} ${f(midY + 0.25)} ${cx} ${f(midY - 0.15)} Q${f(cx - mwS * 0.45)} ${f(midY + 0.25)} ${f(cL[0])} ${f(cL[1])}Z" fill="${shade(lipCol, 0.16)}"/>`);
  P.push(`<path d="M${f(cL[0])} ${f(cL[1])} Q${f(cx - mwS * 0.45)} ${f(midY + 0.25)} ${cx} ${f(midY - 0.15)} Q${f(cx + mwS * 0.45)} ${f(midY + 0.25)} ${f(cR[0])} ${f(cR[1])} C${f(cx + mwS * 0.62)} ${f(my + loH * 1.02)} ${f(cx + mwS * 0.3)} ${f(my + loH * 1.32)} ${cx} ${f(my + loH * 1.32)} C${f(cx - mwS * 0.3)} ${f(my + loH * 1.32)} ${f(cx - mwS * 0.62)} ${f(my + loH * 1.02)} ${f(cL[0])} ${f(cL[1])}Z" fill="${lipCol}"/>`);
  P.push(`<ellipse cx="${f(cx - mwS * 0.14)}" cy="${f(my + loH * 0.66)}" rx="${f(mwS * 0.3)}" ry="${f(loH * 0.26)}" fill="${tint(lipCol, 0.4)}" opacity="${f(male ? 0.3 : 0.5)}"/>`);
  P.push(`<path d="${mouthLine}" fill="none" stroke="${mixHex(lineC, '#0a0504', 0.5)}" stroke-width="0.6" stroke-linecap="round"/>`);
  P.push(`<circle cx="${f(cL[0] - 0.2)}" cy="${f(cL[1])}" r="0.38" fill="${sh2}"/><circle cx="${f(cR[0] + 0.2)}" cy="${f(cR[1])}" r="0.38" fill="${sh2}"/>`);
  if (M.smile > 0 && stage !== 'baby') P.push(`<path d="M${f(cL[0] - 1)} ${f(cL[1] - 1.5)} q-1.1 1.4 -0.2 2.9 M${f(cR[0] + 1)} ${f(cR[1] - 1.5)} q1.1 1.4 0.2 2.9" fill="none" stroke="${sh2}" stroke-width="0.45" stroke-linecap="round" opacity="0.6"/>`);
  if (beast && ['wolf', 'bear', 'tiger', 'lion'].includes(p.beast) && detail && !kid) P.push(`<path d="M${f(cx - mwS * 0.55)} ${f(midY + 0.2)} l0.5 1.3 l0.6 -1.2 M${f(cx + mwS * 0.55)} ${f(midY + 0.2)} l-0.5 1.3 l-0.6 -1.2" fill="#efe8da" stroke="${lineC}" stroke-width="0.25"/>`);
  P.push(beard.over);

  /* ----- 흉터 ----- */
  if (scars.length) P.push(drawScars(scars, key, { cx, cy, hw, hh, top, chin, eyeY, eyeGap, ew, browY, noseBot, my, mw, nw }, skin, uid));

  /* ----- 앞머리·쓰개·뿔·짐승 귀 ----- */
  P.push(hairS.front, hat.front);
  if (beast && p.beast !== 'hawk') P.push(beastEars(p.beast, { cx, cy, hw, hh, top }, hair, hairDark, skin, uid, 'front'));
  if (race === 'demon' || race === 'half_demon') P.push(horns(race, { cx, cy, hw, hh, top }, hashStr('horn' + key) / 4294967296, 'front'));
  P.push('</g></g>');
  // 테두리
  P.push(`<circle cx="50" cy="50" r="48" fill="none" stroke="#0e0a07" stroke-width="2.4" opacity="0.55"/><circle cx="50" cy="50" r="48" fill="none" stroke="${ring ?? '#8a6d38'}" stroke-width="${ring ? 2.4 : 1.5}"/>${detail ? `<circle cx="50" cy="50" r="46.2" fill="none" stroke="${ring ?? '#8a6d38'}" stroke-width="0.35" opacity="0.6"/>` : ''}`);
  const body = P.join('');
  if (p.alive === false) return `<g style="filter:grayscale(1) brightness(.78)">${body}</g>`;
  return body;
}

/* ---------- 흉터: 이름에 자리가 적혀 있으면 그 자리에, 아니면 그 사람에게 고정된 자리에 ---------- */
function drawScars(scars, key, m, skin, uid) {
  const sr = rngFrom(hashStr('scar' + key));
  const pale = mixHex(skin, '#f6e4d8', 0.55), red = mixHex(skin, '#8a3a34', 0.55);
  const cut = (x0, y0, x1, y1, bend = 0.8, stitches = 0) => {
    const mx = (x0 + x1) / 2 + (y1 - y0) * 0.1 * bend, myy = (y0 + y1) / 2 - (x1 - x0) * 0.1 * bend;
    let s = `<path d="M${f(x0)} ${f(y0)} Q${f(mx)} ${f(myy)} ${f(x1)} ${f(y1)}" fill="none" stroke="${red}" stroke-width="1.15" stroke-linecap="round" opacity="0.85"/><path d="M${f(x0)} ${f(y0)} Q${f(mx)} ${f(myy)} ${f(x1)} ${f(y1)}" fill="none" stroke="${pale}" stroke-width="0.45" stroke-linecap="round" opacity="0.9"/>`;
    for (let i = 1; i <= stitches; i++) { const t = i / (stitches + 1); const x = lerp(x0, x1, t), y = lerp(y0, y1, t); const nx = -(y1 - y0), ny = x1 - x0; const L = Math.hypot(nx, ny) || 1; s += `<path d="M${f(x - (nx / L) * 0.9)} ${f(y - (ny / L) * 0.9)} l${f((nx / L) * 1.8)} ${f((ny / L) * 1.8)}" stroke="${red}" stroke-width="0.35" opacity="0.7"/>`; }
    return s;
  };
  const side = () => (sr() < 0.5 ? -1 : 1);
  const used = new Set();
  let out = '';
  scars.slice(0, 4).forEach((name, i) => {
    const t = String(name ?? '');
    let kind = /눈/.test(t) ? 'eye' : /뺨|볼|광대/.test(t) ? 'cheek' : /이마|머리/.test(t) ? 'brow' : /입|입술/.test(t) ? 'lip' : /코/.test(t) ? 'nose' : /턱/.test(t) ? 'jaw' : /화상|불|덴/.test(t) ? 'burn' : /목/.test(t) ? 'neck' : null;
    if (!kind || used.has(kind)) kind = ['cheek', 'brow', 'jaw', 'eye', 'nose', 'lip'].find((k) => !used.has(k)) ?? 'cheek';
    used.add(kind);
    const s = /왼/.test(t) ? 1 : /오른/.test(t) ? -1 : side(); // 그림에서 인물의 왼쪽은 화면 오른쪽
    const j = () => (sr() - 0.5);
    if (kind === 'eye') out += cut(m.cx + s * (m.eyeGap + j()), m.browY - m.hh * 0.14, m.cx + s * (m.eyeGap + 0.6 + j()), m.eyeY + m.hh * 0.22, s);
    else if (kind === 'cheek') out += cut(m.cx + s * m.hw * 0.78, m.eyeY + m.hh * (0.2 + j() * 0.06), m.cx + s * m.hw * 0.36, m.cy + m.hh * (0.52 + j() * 0.08), s, 3);
    else if (kind === 'brow') out += cut(m.cx + s * m.hw * (0.2 + j() * 0.2), m.top + m.hh * 0.36, m.cx + s * m.hw * 0.62, m.browY - 1, -s, 2);
    else if (kind === 'lip') out += cut(m.cx + s * m.mw * 0.5, m.my - m.hh * 0.11, m.cx + s * m.mw * 0.62, m.my + m.hh * 0.13, s * 0.5);
    else if (kind === 'nose') out += cut(m.cx - 3.4, m.eyeY + m.hh * 0.14, m.cx + 3.6, m.eyeY + m.hh * 0.2 + j(), 0.6);
    else if (kind === 'jaw') out += cut(m.cx + s * m.hw * 0.66, m.cy + m.hh * 0.6, m.cx + s * m.hw * 0.3, m.chin - m.hh * 0.08, -s, 2);
    else if (kind === 'neck') out += cut(m.cx + s * 2, m.chin + 3, m.cx - s * 4, m.chin + 5.5, 0.6, 2);
    else if (kind === 'burn') {
      const bx = m.cx + s * m.hw * 0.56, by = m.cy + m.hh * 0.3;
      out += `<g clip-path="url(#${uid}h)"><path d="M${f(bx - 5)} ${f(by - 6)} q5 -3 8 1 q4 3 2 8 q1 5 -4 7 q-5 2 -7 -3 q-4 -4 -1 -8 q-1 -3 2 -5Z" fill="${mixHex(skin, '#9a4a40', 0.42)}" opacity="0.6"/><path d="M${f(bx - 3)} ${f(by - 3)} q3 2 2 6 M${f(bx + 2)} ${f(by - 2)} q-1 4 2 7 M${f(bx - 2)} ${f(by + 5)} q3 -1 5 1" fill="none" stroke="${pale}" stroke-width="0.5" opacity="0.7"/></g>`;
    }
    void i;
  });
  return out;
}

/* ---------- 수인의 귀 (정수리 양옆) ---------- */
function beastEars(kind, h, fur, furDark, skin, uid, layer) {
  const { cx, hw, hh, top } = h;
  let out = '';
  for (const s of [-1, 1]) {
    const bx = cx + s * hw * 0.62, by = top + hh * 0.2;
    let d, inner;
    if (kind === 'bear') {
      d = `M${f(bx - s * 4.6)} ${f(by + 1)} C${f(bx - s * 5.4)} ${f(by - 8.5)} ${f(bx + s * 6.5)} ${f(by - 9)} ${f(bx + s * 5.4)} ${f(by + 2.4)}Z`;
      inner = `M${f(bx - s * 2.2)} ${f(by - 0.6)} C${f(bx - s * 2.6)} ${f(by - 5.4)} ${f(bx + s * 3.6)} ${f(by - 5.6)} ${f(bx + s * 3)} ${f(by + 0.6)}Z`;
    } else if (kind === 'lion') {
      d = `M${f(bx - s * 4)} ${f(by + 1)} C${f(bx - s * 4)} ${f(by - 7.5)} ${f(bx + s * 6.4)} ${f(by - 8.4)} ${f(bx + s * 5.6)} ${f(by + 2.4)}Z`;
      inner = `M${f(bx - s * 1.8)} ${f(by - 0.4)} C${f(bx - s * 1.8)} ${f(by - 4.8)} ${f(bx + s * 3.8)} ${f(by - 5.2)} ${f(bx + s * 3.4)} ${f(by + 0.8)}Z`;
    } else {
      const tall = kind === 'wolf' ? 13.5 : kind === 'tiger' ? 9 : 11.5; const lean = kind === 'wolf' ? 3.4 : 4.6;
      d = `M${f(bx - s * 5)} ${f(by + 1.4)} Q${f(bx - s * 2.4)} ${f(by - tall * 0.7)} ${f(bx + s * lean)} ${f(by - tall)} Q${f(bx + s * 6.4)} ${f(by - tall * 0.35)} ${f(bx + s * 6)} ${f(by + 3)}Z`;
      inner = `M${f(bx - s * 2.4)} ${f(by + 0.4)} Q${f(bx - s * 0.6)} ${f(by - tall * 0.56)} ${f(bx + s * (lean - 0.4))} ${f(by - tall * 0.8)} Q${f(bx + s * 4.4)} ${f(by - tall * 0.3)} ${f(bx + s * 4)} ${f(by + 1.4)}Z`;
    }
    if (layer === 'back') out += `<path d="${d}" fill="${furDark}" stroke="${furDark}" stroke-width="0.6" stroke-linejoin="round"/>`;
    else out += `<path d="${d}" fill="${fur}" stroke="${furDark}" stroke-width="0.55" stroke-linejoin="round"/><path d="${inner}" fill="${mixHex(skin, '#b0685a', 0.4)}" opacity="0.85"/>${kind === 'tiger' ? `<path d="M${f(bx - s * 1)} ${f(by - 7.4)} l${f(s * 3)} 1.2" stroke="${furDark}" stroke-width="1" stroke-linecap="round"/>` : ''}`;
  }
  void uid;
  return out;
}

/* ---------- 마족의 뿔 ---------- */
function horns(race, h, roll, layer) {
  const { cx, hw, hh, top } = h;
  const small = race === 'half_demon';
  let out = '';
  const col = '#3a3136', hi = '#8a7f84';
  for (const s of [-1, 1]) {
    const bx = cx + s * hw * 0.6, by = top + hh * 0.24;
    let d, ridge;
    if (small) {
      d = `M${f(bx - s * 2)} ${f(by)} Q${f(bx + s * 0.4)} ${f(by - 5.6)} ${f(bx + s * 3.4)} ${f(by - 7)} Q${f(bx + s * 3)} ${f(by - 2.4)} ${f(bx + s * 2.2)} ${f(by + 0.8)}Z`;
      ridge = '';
    } else if (roll < 0.5) { // 뒤로 휘어 오르는 뿔
      d = `M${f(bx - s * 3)} ${f(by + 0.6)} C${f(bx - s * 1)} ${f(by - 9)} ${f(bx + s * 7)} ${f(by - 15)} ${f(bx + s * 13.4)} ${f(by - 16.5)} C${f(bx + s * 9)} ${f(by - 11.4)} ${f(bx + s * 5)} ${f(by - 6)} ${f(bx + s * 3.4)} ${f(by + 1.4)}Z`;
      ridge = `M${f(bx - s * 0.6)} ${f(by - 4)} l${f(s * 3.4)} 1.6 M${f(bx + s * 2.2)} ${f(by - 8.4)} l${f(s * 2.8)} 2 M${f(bx + s * 5.6)} ${f(by - 12)} l${f(s * 2.2)} 2.2`;
    } else { // 양처럼 말린 뿔
      d = `M${f(bx - s * 3)} ${f(by + 0.6)} C${f(bx - s * 2)} ${f(by - 8)} ${f(bx + s * 9)} ${f(by - 10)} ${f(bx + s * 12)} ${f(by - 1)} C${f(bx + s * 13.4)} ${f(by + 5)} ${f(bx + s * 9)} ${f(by + 8.4)} ${f(bx + s * 6.4)} ${f(by + 5.4)} C${f(bx + s * 9)} ${f(by + 4.6)} ${f(bx + s * 9)} ${f(by - 0.4)} ${f(bx + s * 6)} ${f(by - 2.4)} C${f(bx + s * 4.6)} ${f(by - 3)} ${f(bx + s * 3.6)} ${f(by - 1.4)} ${f(bx + s * 3.4)} ${f(by + 1.4)}Z`;
      ridge = `M${f(bx - s * 0.4)} ${f(by - 4)} l${f(s * 3)} 2 M${f(bx + s * 4)} ${f(by - 6.6)} l${f(s * 1.2)} 3.6 M${f(bx + s * 8.6)} ${f(by - 4.6)} l${f(-s * 1.4)} 3.4`;
    }
    if (layer === 'back') out += `<path d="${d}" fill="#1c1619" stroke="#120d10" stroke-width="0.6"/>`;
    else out += `<path d="${d}" fill="${col}" stroke="#120d10" stroke-width="0.55" stroke-linejoin="round"/>${ridge ? `<path d="${ridge}" stroke="${hi}" stroke-width="0.45" opacity="0.6" fill="none"/>` : ''}<path d="M${f(bx - s * 1.6)} ${f(by - 1)} Q${f(bx)} ${f(by - 5)} ${f(bx + s * 2.6)} ${f(by - 6.4)}" fill="none" stroke="${hi}" stroke-width="0.6" opacity="0.5"/>`;
  }
  return out;
}

/** 생김새를 글로 (인물 수첩 설명용) */
export function looksOf(game, p) {
  const g = genesOf(game, p);
  const R = RACES[raceOf(p)];
  const hairN = R.hairN[Math.min(g.hair, R.hairN.length - 1)];
  const eyeN = R.eyesN[Math.min(g.eyes, R.eyesN.length - 1)];
  return `${hairN} 머리, ${eyeN} 눈`;
}
void INK;
