// 38단계: 초상의 장신구와 시대 차림. 신분·직업·살림·시대(발명)에 따라 얹는다.
// - 안경: 렌즈가 발명된 뒤, 글 읽는 일을 하는 사람이나 눈이 침침해진 늙은이
// - 회중시계 줄: 기계식 시계가 나온 뒤, 넉넉한 집 남자의 조끼·웃옷
// - 목에 맨 흰 천(높은 깃): 마력 공장이 선 뒤 시대의 넉넉한 남자
// - 목걸이: 가난한 집은 끈에 꿴 나무·뼈 부적, 넉넉한 집 여인은 진주
// - 귀걸이: 살림이 웬만한 여인
// 고르는 것(gearOf)과 그리는 것(drawGear)을 나눈다. 같은 사람은 늘 같은 것을 한다(씨앗 고정).
import { f, shade } from './portraitKit.js';

const BOOKISH = new Set(['scholar', 'tutor', 'guild_clerk', 'official', 'physician', 'alchemist', 'artificer', 'court_mage', 'minister', 'apothecary', 'scribe', 'courtier', 'trade_master', 'guildmaster', 'merchant']);
const FINE = new Set(['doublet', 'coat', 'noble']);
const ARMOR = new Set(['mail', 'plate', 'swaddle']);

/** 무엇을 걸치는가. era: eraBits (1 렌즈, 2 시계, 4 공장) */
export function gearOf({ o, job, tier, stage, male, age, era = 0, patch = 0, r }) {
  const rolls = [r(), r(), r(), r(), r(), r()]; // 늘 같은 순서로 뽑아 둔다
  const g = {};
  const grown = stage === 'adult' || stage === 'middle' || stage === 'elder';
  const youth = grown || stage === 'teen';
  if (!o || !youth) return g;
  if ((era & 1) && grown && !patch && (BOOKISH.has(job) ? rolls[0] < (job === 'scholar' || job === 'tutor' ? 0.6 : 0.3) : age >= 52 && tier >= 2 && rolls[0] < 0.2)) {
    g.glasses = { round: rolls[1] < 0.55, col: rolls[1] < 0.3 ? '#3a2b1f' : '#a8915a' };
  }
  if ((era & 2) && male && grown && tier >= 3 && FINE.has(o.kind) && rolls[2] < 0.6) g.watch = true;
  if ((era & 4) && male && grown && tier >= 3 && FINE.has(o.kind) && !o.ruff && !o.fur && rolls[3] < 0.7) g.cravat = true;
  if (!ARMOR.has(o.kind) && !o.chain && !o.emblem) {
    if (tier <= 2 && rolls[4] < 0.26) g.charm = rolls[5] < 0.5 ? 'wood' : 'bone';
    else if (!male && grown && tier >= 3 && rolls[4] < 0.5) g.pearls = true;
  }
  if (!male && tier >= 2 && !o.earring && rolls[5] < 0.45) g.earring = rolls[3] < 0.5 ? 'pearl' : 'gold';
  return g;
}

/**
 * m: { cx, eyeY, eyeGap, ew, hw, browY, noseBot, baseY, nw, sw, skin, uid }
 * ears: [{ x, y, er, s }] 보이는 귀 자리 (가려졌으면 빈 배열)
 * 돌려주는 것: { face: 얼굴 위(앞머리 아래), chest: 옷 위, ear: 귀 위 }
 */
export function drawGear(g, m, detail, ears = []) {
  const out = { face: '', chest: '', ear: '' };
  const { cx } = m;
  if (g.glasses) {
    const { col, round } = g.glasses;
    const rx = m.ew * 1.28, ry = m.ew * (round ? 1.18 : 0.9);
    const y = m.eyeY + m.ew * 0.12;
    let s = '';
    for (const sd of [-1, 1]) {
      const x = cx + sd * m.eyeGap;
      // 테가 뺨에 드리우는 그림자(빛 반대쪽 아래), 유리의 옅은 빛, 테
      if (detail) s += `<ellipse cx="${f(x + 0.5)}" cy="${f(y + 0.9)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="#1a0c06" stroke-width="0.6" opacity="0.18" filter="url(#${m.uid}xt)"/>`;
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#dfe8ec" fill-opacity="0.07" stroke="${col}" stroke-width="${detail ? 0.55 : 0.7}"/>`;
      if (detail) s += `<path d="M${f(x - rx * 0.62)} ${f(y - ry * 0.35)} Q${f(x - rx * 0.4)} ${f(y - ry * 0.78)} ${f(x + rx * 0.05)} ${f(y - ry * 0.8)}" fill="none" stroke="#fffaf0" stroke-width="0.45" opacity="0.5" stroke-linecap="round"/>`;
      // 다리: 테 바깥에서 귀 쪽으로
      s += `<path d="M${f(x + sd * rx)} ${f(y - ry * 0.3)} L${f(cx + sd * m.hw * 0.99)} ${f(y - ry * 0.55)}" stroke="${col}" stroke-width="${detail ? 0.5 : 0.6}" stroke-linecap="round"/>`;
    }
    const ix = cx - m.eyeGap + rx, jx = cx + m.eyeGap - rx;
    s += `<path d="M${f(ix)} ${f(y - ry * 0.25)} Q${cx} ${f(y - ry * 0.75)} ${f(jx)} ${f(y - ry * 0.25)}" fill="none" stroke="${col}" stroke-width="${detail ? 0.55 : 0.65}"/>`;
    out.face += s;
  }
  const { baseY, nw, sw } = m;
  if (g.cravat) {
    out.chest += `<path d="M${f(cx - nw - 0.6)} ${f(baseY - 2.2)} Q${cx} ${f(baseY + 1.6)} ${f(cx + nw + 0.6)} ${f(baseY - 2.2)} L${f(cx + 2.6)} ${f(baseY + 3)} L${f(cx + 1.8)} ${f(baseY + 10)} L${cx} ${f(baseY + 11.5)} L${f(cx - 1.8)} ${f(baseY + 10)} L${f(cx - 2.6)} ${f(baseY + 3)}Z" fill="#e6dfd0" stroke="#21160f" stroke-width="0.4" stroke-opacity="0.6" stroke-linejoin="round"/>`
      + (detail ? `<path d="M${f(cx - 1.6)} ${f(baseY + 3.4)} q1.4 3 0.6 6 M${f(cx + 1.2)} ${f(baseY + 3.2)} q-0.6 3.6 0.4 6.4" fill="none" stroke="#a89c84" stroke-width="0.4" opacity="0.8"/><path d="M${f(cx + 0.6)} ${f(baseY + 2)} L${f(cx + 2.6)} ${f(baseY + 3)} L${f(cx + 1.8)} ${f(baseY + 10)} L${cx} ${f(baseY + 11.5)}Z" fill="#0b0705" opacity="0.14"/>` : '');
  }
  if (g.watch) {
    const x0 = cx + 1.4, y0 = baseY + 15, x1 = cx + sw * 0.46, y1 = baseY + 18.5;
    out.chest += `<path d="M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2)} ${f(y1 + 5)} ${f(x1)} ${f(y1)}" fill="none" stroke="#6a5226" stroke-width="0.95"/><path d="M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2)} ${f(y1 + 5)} ${f(x1)} ${f(y1)}" fill="none" stroke="#d9b866" stroke-width="0.55" stroke-dasharray="0.7 0.45"/>`
      + `<circle cx="${f(x0)}" cy="${f(y0)}" r="0.75" fill="#d9b866"/>${detail ? `<path d="M${f(x1 - 1.2)} ${f(y1 - 0.4)} l0.9 -1.4 l0.9 1.4" fill="none" stroke="#d9b866" stroke-width="0.4"/>` : ''}`;
  }
  if (g.charm) {
    const c = g.charm === 'wood' ? '#7a5a36' : '#d8ccb0';
    out.chest += `<path d="M${f(cx - nw - 1)} ${f(baseY - 0.8)} Q${cx} ${f(baseY + 13)} ${f(cx + nw + 1)} ${f(baseY - 0.8)}" fill="none" stroke="#3a2a1c" stroke-width="0.5"/>`
      + (g.charm === 'wood'
        ? `<rect x="${f(cx - 1.2)}" y="${f(baseY + 5.4)}" width="2.4" height="3.2" rx="0.5" fill="${c}" stroke="#21160f" stroke-width="0.35"/>${detail ? `<path d="M${f(cx - 0.6)} ${f(baseY + 6.4)} h1.2 M${cx} ${f(baseY + 6)} v2" stroke="${shade(c, 0.5)}" stroke-width="0.3"/>` : ''}`
        : `<path d="M${f(cx - 0.9)} ${f(baseY + 5.4)} Q${f(cx - 0.6)} ${f(baseY + 8.8)} ${f(cx + 0.4)} ${f(baseY + 9.6)} Q${f(cx + 0.9)} ${f(baseY + 7)} ${f(cx + 0.9)} ${f(baseY + 5.4)}Z" fill="${c}" stroke="#21160f" stroke-width="0.35"/>`);
  }
  if (g.pearls) {
    let p = '';
    const n = 13;
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1), a = [cx - nw - 1.6, baseY - 0.8], c = [cx, baseY + 8.5], b = [cx + nw + 1.6, baseY - 0.8];
      const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
      p += `<circle cx="${f(x)}" cy="${f(y)}" r="0.62" fill="#e9e3d6" stroke="#6a6252" stroke-width="0.15"/>${detail ? `<circle cx="${f(x - 0.2)}" cy="${f(y - 0.22)}" r="0.2" fill="#fff" opacity="0.8"/>` : ''}`;
    }
    out.chest += p;
  }
  if (g.earring) {
    for (const e of ears) {
      const x = e.x + e.s * e.er * 0.48, y = e.y + e.er * 1.72;
      out.ear += g.earring === 'pearl'
        ? `<path d="M${f(x)} ${f(y)} v1" stroke="#b8a06a" stroke-width="0.3"/><circle cx="${f(x)}" cy="${f(y + 1.7)}" r="0.85" fill="#ebe6da" stroke="#6a6252" stroke-width="0.15"/>${detail ? `<circle cx="${f(x - 0.25)}" cy="${f(y + 1.45)}" r="0.25" fill="#fff" opacity="0.85"/>` : ''}`
        : `<circle cx="${f(x)}" cy="${f(y + 0.4)}" r="0.55" fill="#d9b866"/><path d="M${f(x)} ${f(y + 0.9)} l-0.7 1.6 l0.7 1 l0.7 -1Z" fill="#c9a25a" stroke="#6a5226" stroke-width="0.2"/>`;
    }
  }
  return out;
}
